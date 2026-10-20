import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { StyleSettings, TreeState } from '../types'
import { FONTS, THEMES } from '../types'
import {
  edgePath,
  findEdgeNear,
  isTerminal,
  nodeBounds,
  trianglePoints,
} from '../lib/geometry'
import { parseLabel, subDy, subFontSize } from '../lib/label'
import './TreeCanvas.css'

type Mode =
  | { type: 'idle' }
  | { type: 'pan'; ox: number; oy: number; vx: number; vy: number }
  | {
      type: 'drag'
      ids: string[]
      lastX: number
      lastY: number
      moved: boolean
    }
  | {
      type: 'wire'
      fromId: string
      startX: number
      startY: number
      x: number
      y: number
      targetId: string | null
      moved: boolean
    }
  | {
      type: 'marquee'
      x0: number
      y0: number
      x1: number
      y1: number
      shift: boolean
    }

interface Props {
  tree: TreeState
  style: StyleSettings
  selectedIds: string[]
  editingId: string | null
  onSelect: (ids: string[]) => void
  onMove: (ids: string[], dx: number, dy: number) => void
  onMoveStart: () => void
  onMoveEnd: () => void
  onConnect: (parentId: string, childId: string) => void
  onSpawnChild: (parentId: string, x: number, y: number) => void
  onCreateNode: (x: number, y: number) => void
  onInsertEdge: (edgeId: string, x: number, y: number) => void
  onStartEdit: (id: string) => void
  onEditLabel: (id: string, label: string) => void
  onEndEdit: () => void
  svgRef: React.RefObject<SVGSVGElement | null>
}

const WIRE_DRAG_THRESHOLD = 6

export function TreeCanvas({
  tree,
  style,
  selectedIds,
  editingId,
  onSelect,
  onMove,
  onMoveStart,
  onMoveEnd,
  onConnect,
  onSpawnChild,
  onCreateNode,
  onInsertEdge,
  onStartEdit,
  onEditLabel,
  onEndEdit,
  svgRef,
}: Props) {
  const theme = THEMES[style.theme]
  const font = FONTS[style.font]
  const wrapRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  const viewRef = useRef(view)
  viewRef.current = view

  const [mode, setModeState] = useState<Mode>({ type: 'idle' })
  const modeRef = useRef<Mode>({ type: 'idle' })
  const setMode = useCallback((next: Mode) => {
    modeRef.current = next
    setModeState(next)
  }, [])

  const [hoverEdge, setHoverEdge] = useState<{
    edgeId: string
    cx: number
    cy: number
  } | null>(null)
  const hoverEdgeRef = useRef(hoverEdge)
  hoverEdgeRef.current = hoverEdge

  const [spaceDown, setSpaceDown] = useState(false)
  const spaceRef = useRef(false)
  const gestureCleanup = useRef<(() => void) | null>(null)

  const treeRef = useRef(tree)
  treeRef.current = tree
  const selectedRef = useRef(selectedIds)
  selectedRef.current = selectedIds
  const editingRef = useRef(editingId)
  editingRef.current = editingId
  const styleRef = useRef(style)
  styleRef.current = style
  const fontStackRef = useRef(font.stack)
  fontStackRef.current = font.stack

  const cb = useRef({
    onSelect,
    onMove,
    onMoveStart,
    onMoveEnd,
    onConnect,
    onSpawnChild,
    onCreateNode,
    onInsertEdge,
    onStartEdit,
    onEditLabel,
    onEndEdit,
  })
  cb.current = {
    onSelect,
    onMove,
    onMoveStart,
    onMoveEnd,
    onConnect,
    onSpawnChild,
    onCreateNode,
    onInsertEdge,
    onStartEdit,
    onEditLabel,
    onEndEdit,
  }

  const clientToWorld = useCallback((clientX: number, clientY: number) => {
    const rect = wrapRef.current!.getBoundingClientRect()
    const v = viewRef.current
    return {
      x: (clientX - rect.left - v.x) / v.k,
      y: (clientY - rect.top - v.y) / v.k,
    }
  }, [])

  /** Hit a node label/body only — never the area below where the wire handle lives. */
  const hitNode = useCallback((wx: number, wy: number): string | null => {
    const nodes = treeRef.current.nodes
    const fontSize = styleRef.current.fontSize
    const stack = fontStackRef.current
    const ids = Object.keys(nodes)
    for (let i = ids.length - 1; i >= 0; i--) {
      const id = ids[i]
      const b = nodeBounds(nodes[id], fontSize, stack)
      if (wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h) {
        return id
      }
    }
    return null
  }, [])

  const startWire = useCallback(
    (fromId: string, clientX: number, clientY: number, pointerId: number) => {
      const { x: wx, y: wy } = clientToWorld(clientX, clientY)
      setHoverEdge(null)
      setMode({
        type: 'wire',
        fromId,
        startX: wx,
        startY: wy,
        x: wx,
        y: wy,
        targetId: null,
        moved: false,
      })
      bindGestureRef.current?.(pointerId)
    },
    [clientToWorld],
  )

  const bindGestureRef = useRef<(pointerId: number) => void>(() => {})

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (
        t.tagName === 'INPUT' ||
        t.tagName === 'TEXTAREA' ||
        t.isContentEditable
      ) {
        if (e.code === 'Space') {
          spaceRef.current = false
          setSpaceDown(false)
        }
        return
      }
      if (e.code === 'Space') {
        if (e.type === 'keydown') {
          e.preventDefault()
          spaceRef.current = true
          setSpaceDown(true)
        } else {
          spaceRef.current = false
          setSpaceDown(false)
        }
      }
    }
    window.addEventListener('keydown', onKey, { capture: true })
    window.addEventListener('keyup', onKey, { capture: true })
    return () => {
      window.removeEventListener('keydown', onKey, { capture: true })
      window.removeEventListener('keyup', onKey, { capture: true })
    }
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const factor = e.deltaY > 0 ? 0.92 : 1.08
      setView((v) => {
        const k = Math.min(2.5, Math.max(0.35, v.k * factor))
        const wx = (mx - v.x) / v.k
        const wy = (my - v.y) / v.k
        return { k, x: mx - wx * k, y: my - wy * k }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    return () => {
      gestureCleanup.current?.()
      gestureCleanup.current = null
    }
  }, [])

  const updateHoverEdge = useCallback(
    (wx: number, wy: number) => {
      if (editingRef.current || modeRef.current.type !== 'idle') {
        if (hoverEdgeRef.current) setHoverEdge(null)
        return
      }
      if (hitNode(wx, wy)) {
        if (hoverEdgeRef.current) setHoverEdge(null)
        return
      }
      const near = findEdgeNear(
        treeRef.current,
        wx,
        wy,
        styleRef.current.fontSize,
        fontStackRef.current,
        styleRef.current.branchStyle,
        12 / viewRef.current.k,
      )
      if (!near) {
        if (hoverEdgeRef.current) setHoverEdge(null)
        return
      }
      // Always park the + on the geometric midpoint — never follows the cursor
      const next = { edgeId: near.edge.id, cx: near.midX, cy: near.midY }
      const prev = hoverEdgeRef.current
      if (
        prev &&
        prev.edgeId === next.edgeId &&
        prev.cx === next.cx &&
        prev.cy === next.cy
      ) {
        return
      }
      setHoverEdge(next)
    },
    [hitNode],
  )

  /** Bind window-level move/up so gestures keep working even if the cursor leaves the canvas. */
  const bindGesture = useCallback(
    (pointerId: number) => {
      gestureCleanup.current?.()

      const onMove = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return
        const { x: wx, y: wy } = clientToWorld(e.clientX, e.clientY)
        const m = modeRef.current

        if (m.type === 'pan') {
          setView({
            k: viewRef.current.k,
            x: m.vx + (e.clientX - m.ox),
            y: m.vy + (e.clientY - m.oy),
          })
          return
        }

        if (m.type === 'drag') {
          const dx = wx - m.lastX
          const dy = wy - m.lastY
          if (!m.moved && Math.hypot(dx, dy) < 2 / viewRef.current.k) return
          if (!m.moved) cb.current.onMoveStart()
          cb.current.onMove(m.ids, dx, dy)
          modeRef.current = {
            type: 'drag',
            ids: m.ids,
            lastX: wx,
            lastY: wy,
            moved: true,
          }
          // Avoid re-render storm while dragging; positions come from React state updates via onMove
          return
        }

        if (m.type === 'wire') {
          const moved =
            m.moved ||
            Math.hypot(wx - m.startX, wy - m.startY) > WIRE_DRAG_THRESHOLD
          let target = hitNode(wx, wy)
          if (target === m.fromId) target = null
          const next: Mode = {
            type: 'wire',
            fromId: m.fromId,
            startX: m.startX,
            startY: m.startY,
            x: wx,
            y: wy,
            targetId: target,
            moved,
          }
          modeRef.current = next
          setModeState(next)
          return
        }

        if (m.type === 'marquee') {
          const next: Mode = { ...m, x1: wx, y1: wy }
          modeRef.current = next
          setModeState(next)
        }
      }

      const onUp = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return
        const m = modeRef.current

        if (m.type === 'drag') {
          if (m.moved) cb.current.onMoveEnd()
        } else if (m.type === 'wire') {
          if (m.targetId) {
            cb.current.onConnect(m.fromId, m.targetId)
          } else if (m.moved) {
            // Only spawn a child if the user actually dragged the wire
            cb.current.onSpawnChild(m.fromId, m.x, m.y)
          }
        } else if (m.type === 'marquee') {
          const x = Math.min(m.x0, m.x1)
          const y = Math.min(m.y0, m.y1)
          const w = Math.abs(m.x1 - m.x0)
          const h = Math.abs(m.y1 - m.y0)
          if (w > 4 || h > 4) {
            const fontSize = styleRef.current.fontSize
            const stack = fontStackRef.current
            const ids = Object.values(treeRef.current.nodes)
              .filter((n) => {
                const b = nodeBounds(n, fontSize, stack)
                return (
                  b.cx >= x && b.cx <= x + w && b.cy >= y && b.cy <= y + h
                )
              })
              .map((n) => n.id)
            cb.current.onSelect(
              m.shift ? [...new Set([...selectedRef.current, ...ids])] : ids,
            )
          }
        }

        modeRef.current = { type: 'idle' }
        setModeState({ type: 'idle' })
        gestureCleanup.current?.()
        gestureCleanup.current = null
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
      gestureCleanup.current = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
      }
    },
    [clientToWorld, hitNode],
  )
  bindGestureRef.current = bindGesture

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return
    const target = e.target as Element
    if (target.closest('.node-editor')) return

    // Dedicated controls handle themselves (must not fall through to drag/insert)
    if (target.closest('[data-wire-handle]')) return
    if (target.closest('[data-edge-insert]')) return

    const { x: wx, y: wy } = clientToWorld(e.clientX, e.clientY)

    if (e.button === 1 || spaceRef.current || e.altKey) {
      e.preventDefault()
      setMode({
        type: 'pan',
        ox: e.clientX,
        oy: e.clientY,
        vx: viewRef.current.x,
        vy: viewRef.current.y,
      })
      bindGesture(e.pointerId)
      return
    }

    // Second click of a double-click: don't start drag/marquee.
    // Rename is handled in onDoubleClick (deferred) so mouseup won't blur the editor.
    if (e.detail > 1) return

    const hit = hitNode(wx, wy)
    if (hit) {
      const selected = new Set(selectedRef.current)
      const ids = e.shiftKey
        ? selected.has(hit)
          ? selectedRef.current.filter((id) => id !== hit)
          : [...selectedRef.current, hit]
        : selected.has(hit)
          ? selectedRef.current
          : [hit]
      cb.current.onSelect(ids)
      setHoverEdge(null)
      setMode({ type: 'drag', ids, lastX: wx, lastY: wy, moved: false })
      bindGesture(e.pointerId)
      return
    }

    if (!e.shiftKey) cb.current.onSelect([])
    setHoverEdge(null)
    setMode({
      type: 'marquee',
      x0: wx,
      y0: wy,
      x1: wx,
      y1: wy,
      shift: e.shiftKey,
    })
    bindGesture(e.pointerId)
  }

  const onWireHandlePointerDown = (
    e: ReactPointerEvent<SVGGElement>,
    nodeId: string,
  ) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    startWire(nodeId, e.clientX, e.clientY, e.pointerId)
  }

  const onEdgeInsertPointerDown = (e: ReactPointerEvent<SVGGElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const edge = hoverEdgeRef.current
    if (!edge) return
    cb.current.onInsertEdge(edge.edgeId, edge.cx, edge.cy)
    setHoverEdge(null)
  }

  const onPointerMoveIdle = (e: ReactPointerEvent) => {
    if (modeRef.current.type !== 'idle') return
    // Don't update edge hover while over dedicated controls
    const t = e.target as Element
    if (t.closest('[data-wire-handle]')) {
      if (hoverEdgeRef.current) setHoverEdge(null)
      return
    }
    const { x: wx, y: wy } = clientToWorld(e.clientX, e.clientY)
    updateHoverEdge(wx, wy)
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    const t = e.target as Element
    if (t.closest('.node-editor')) return
    if (t.closest('[data-wire-handle]') || t.closest('[data-edge-insert]')) return
    e.preventDefault()
    const { x, y } = clientToWorld(e.clientX, e.clientY)

    // Rename: defer until after the dblclick mouseup so the editor isn't instantly blurred
    const hit = hitNode(x, y)
    if (hit) {
      window.setTimeout(() => {
        cb.current.onStartEdit(hit)
      }, 0)
      return
    }

    cb.current.onCreateNode(x, y)
  }

  const selected = new Set(selectedIds)
  const nodeIds = Object.keys(tree.nodes)

  return (
    <div
      ref={wrapRef}
      className={`tree-canvas ${spaceDown ? 'panning' : ''} ${mode.type === 'wire' ? 'wiring' : ''} ${hoverEdge ? 'edge-hot' : ''}`}
      style={
        {
          '--ink': theme.ink,
          '--ink-muted': theme.inkMuted,
          '--select': theme.select,
          '--select-soft': theme.selectSoft,
          '--grid': theme.grid,
          '--tree-font': font.stack,
          '--font-size': `${style.fontSize}px`,
          '--line-w': `${style.lineWidth}px`,
          cursor:
            mode.type === 'pan' || spaceDown
              ? 'grab'
              : mode.type === 'wire'
                ? 'crosshair'
                : hoverEdge
                  ? 'copy'
                  : 'default',
        } as CSSProperties
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMoveIdle}
      onDoubleClick={onDoubleClick}
    >
      {style.showGrid && (
        <div
          className="grid-bg"
          style={{
            backgroundSize: `${24 * view.k}px ${24 * view.k}px`,
            backgroundPosition: `${view.x}px ${view.y}px`,
          }}
        />
      )}

      <svg
        ref={svgRef}
        className="tree-svg"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {nodeIds.map((id) => {
            const node = tree.nodes[id]
            if (!node.triangle) return null
            const tri = trianglePoints(tree, id, style.fontSize, font.stack)
            if (!tri) return null
            return (
              <polygon
                key={`tri-${id}`}
                className="branch-tri"
                points={`${tri.apexX},${tri.apexY} ${tri.left},${tri.baseY} ${tri.right},${tri.baseY}`}
                fill="none"
                stroke={theme.ink}
                strokeWidth={style.lineWidth}
              />
            )
          })}

          {tree.edges.map((edge) => {
            const parent = tree.nodes[edge.parentId]
            const child = tree.nodes[edge.childId]
            if (!parent || !child) return null
            if (parent.triangle) return null
            const path = edgePath(
              parent,
              child,
              style.fontSize,
              font.stack,
              style.branchStyle,
            )
            const hot = hoverEdge?.edgeId === edge.id
            return (
              <path
                key={edge.id}
                className={`branch ${hot ? 'hot' : ''}`}
                d={path.d}
                fill="none"
                stroke={hot ? theme.select : theme.ink}
                strokeWidth={hot ? style.lineWidth + 0.75 : style.lineWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )
          })}

          {mode.type === 'wire' &&
            (() => {
              const from = tree.nodes[mode.fromId]
              if (!from) return null
              const b = nodeBounds(from, style.fontSize, font.stack)
              const x1 = b.cx
              const y1 = b.bottom + 14
              return (
                <g className="wire-preview">
                  <line
                    x1={x1}
                    y1={y1}
                    x2={mode.x}
                    y2={mode.y}
                    stroke={theme.select}
                    strokeWidth={style.lineWidth + 0.5}
                    strokeDasharray="6 5"
                    strokeLinecap="round"
                  />
                  <circle
                    cx={mode.x}
                    cy={mode.y}
                    r={5}
                    fill={mode.targetId ? theme.select : theme.inkMuted}
                  />
                </g>
              )
            })()}

          {mode.type === 'marquee' && (
            <rect
              x={Math.min(mode.x0, mode.x1)}
              y={Math.min(mode.y0, mode.y1)}
              width={Math.abs(mode.x1 - mode.x0)}
              height={Math.abs(mode.y1 - mode.y0)}
              fill={theme.selectSoft}
              stroke={theme.select}
              strokeWidth={1 / view.k}
            />
          )}

          {hoverEdge && mode.type === 'idle' && (
            <g
              key={hoverEdge.edgeId}
              data-edge-insert={hoverEdge.edgeId}
              className="edge-insert"
              transform={`translate(${hoverEdge.cx} ${hoverEdge.cy})`}
              onPointerDown={onEdgeInsertPointerDown}
            >
              <circle r={14} fill="rgba(0,0,0,0.001)" />
              <circle r={9} fill={theme.select} />
              <path
                d="M -3.5 0 H 3.5 M 0 -3.5 V 3.5"
                stroke="#fff"
                strokeWidth={1.75}
                strokeLinecap="round"
                pointerEvents="none"
              />
            </g>
          )}

          {nodeIds.map((id) => {
            const node = tree.nodes[id]
            const b = nodeBounds(node, style.fontSize, font.stack)
            const isSel = selected.has(id)
            const isWireTarget = mode.type === 'wire' && mode.targetId === id
            const terminal = isTerminal(tree, id)
            const italic = style.italicTerminals && terminal
            const editing = editingId === id
            const empty = !node.label

            return (
              <g
                key={id}
                data-node-id={id}
                className={`tree-node ${isSel ? 'selected' : ''} ${isWireTarget ? 'wire-target' : ''}`}
                transform={`translate(${b.x} ${b.y})`}
              >
                {(isSel || isWireTarget) && (
                  <rect
                    x={-4}
                    y={-4}
                    width={b.w + 8}
                    height={b.h + 8}
                    rx={6}
                    fill={theme.selectSoft}
                    stroke={theme.select}
                    strokeWidth={1.25}
                    pointerEvents="none"
                  />
                )}
                <rect
                  x={0}
                  y={0}
                  width={b.w}
                  height={b.h}
                  rx={4}
                  fill={empty && !editing ? theme.ghost : 'rgba(0,0,0,0.001)'}
                />
                {!editing && (
                  <NodeLabel
                    label={empty ? '?' : node.label}
                    x={b.w / 2}
                    y={b.h / 2}
                    fontSize={style.fontSize}
                    fontStack={font.stack}
                    fill={empty ? theme.inkMuted : theme.ink}
                    italic={italic && !empty}
                    weight={terminal || empty ? 400 : 600}
                  />
                )}
              </g>
            )
          })}

          {/* Connect handle under the node (DOM-owned, drawn last) */}
          {mode.type === 'idle' &&
            selectedIds.map((id) => {
              if (editingId === id) return null
              const node = tree.nodes[id]
              if (!node) return null
              const b = nodeBounds(node, style.fontSize, font.stack)
              return (
                <g
                  key={`wire-${id}`}
                  data-wire-handle={id}
                  className="wire-handle"
                  transform={`translate(${b.cx} ${b.bottom + 14})`}
                  onPointerDown={(e) => onWireHandlePointerDown(e, id)}
                >
                  <rect
                    x={-22}
                    y={-8}
                    width={44}
                    height={34}
                    rx={10}
                    fill="rgba(0,0,0,0.001)"
                  />
                  <circle
                    r={8}
                    fill={theme.select}
                    stroke="#fff"
                    strokeWidth={1.75}
                  />
                  <path
                    d="M 0 -2.5 V 3.5 M -2.5 1.2 L 0 4 L 2.5 1.2"
                    stroke="#fff"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    pointerEvents="none"
                  />
                </g>
              )
            })}
        </g>
      </svg>

      {editingId && tree.nodes[editingId] && (
        <NodeEditor
          node={tree.nodes[editingId]}
          view={view}
          fontSize={style.fontSize}
          fontStack={font.stack}
          color={theme.ink}
          onChange={(label) => onEditLabel(editingId, label)}
          onDone={onEndEdit}
        />
      )}

      {nodeIds.length === 0 && (
        <div className="empty-hint">
          Double-click anywhere to place a node
        </div>
      )}

      {mode.type === 'wire' && (
        <div className="wire-hint">
          {mode.targetId
            ? 'Release to connect'
            : mode.moved
              ? 'Release to create a child'
              : 'Drag to a node or empty space'}
        </div>
      )}
    </div>
  )
}

function NodeLabel({
  label,
  x,
  y,
  fontSize,
  fontStack,
  fill,
  italic,
  weight,
}: {
  label: string
  x: number
  y: number
  fontSize: number
  fontStack: string
  fill: string
  italic: boolean
  weight: number
}) {
  const { base, sub } = parseLabel(label)
  const baseText = base || (sub ? '' : label || '?')

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fill={fill}
      fontFamily={fontStack}
      fontSize={fontSize}
      fontStyle={italic ? 'italic' : 'normal'}
      fontWeight={weight}
      style={{ userSelect: 'none' }}
      pointerEvents="none"
    >
      {/* Keep plain text when there's no subscript — a lone <tspan> can
          change baseline handling and leave a gap above the branch. */}
      {sub ? (
        <>
          <tspan>{baseText}</tspan>
          <tspan fontSize={subFontSize(fontSize)} dy={subDy(fontSize)}>
            {sub}
          </tspan>
        </>
      ) : (
        baseText
      )}
    </text>
  )
}

function NodeEditor({
  node,
  view,
  fontSize,
  fontStack,
  color,
  onChange,
  onDone,
}: {
  node: { x: number; y: number; label: string }
  view: { x: number; y: number; k: number }
  fontSize: number
  fontStack: string
  color: string
  onChange: (v: string) => void
  onDone: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const doneRef = useRef(false)
  const b = nodeBounds(
    { id: '', label: node.label || '?', x: node.x, y: node.y },
    fontSize,
    fontStack,
  )

  useEffect(() => {
    doneRef.current = false
    const input = ref.current
    if (!input) return
    input.focus()
    input.select()
  }, [])

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }

  const left = view.x + b.x * view.k
  const top = view.y + b.y * view.k

  return (
    <input
      ref={ref}
      className="node-editor"
      value={node.label}
      placeholder="?"
      style={{
        left,
        top,
        width: Math.max(48, b.w) * view.k,
        height: b.h * view.k,
        fontSize: fontSize * view.k,
        fontFamily: fontStack,
        color,
      }}
      onChange={(e) => onChange(e.target.value)}
      onBlur={finish}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          finish()
          return
        }
        e.stopPropagation()
      }}
      onPointerDown={(e) => e.stopPropagation()}
    />
  )
}
