import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { HelpPanel } from './components/HelpPanel'
import { SelectionBar } from './components/SelectionBar'
import { StylePanel } from './components/StylePanel'
import { Toolbar } from './components/Toolbar'
import { TreeCanvas } from './components/TreeCanvas'
import { Welcome } from './components/Welcome'
import { useHistory } from './hooks/useHistory'
import { FONTS, THEMES, type StyleSettings, type TreeState } from './types'
import {
  addChild,
  addNode,
  addSibling,
  connect,
  createParent,
  DEFAULT_STYLE,
  deleteNodes,
  demoTree,
  emptyTree,
  insertOnEdge,
  layoutTree,
  loadPersisted,
  moveNodes,
  persist,
  starterLeaves,
  starterRoot,
  toggleTriangle,
  updateLabel,
} from './lib/treeStore'
import { buildExportSvg, downloadPng, downloadText } from './lib/export'
import './App.css'

type Doc = { tree: TreeState; style: StyleSettings }

export default function App() {
  const persisted = useMemo(() => loadPersisted(), [])
  const hasSaved =
    !!persisted && Object.keys(persisted.tree.nodes).length > 0

  const {
    present,
    set,
    checkpoint,
    replace,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<Doc>({
    tree: persisted?.tree ?? emptyTree(),
    style: persisted?.style ?? DEFAULT_STYLE,
  })

  const [selectedIds, setSelectedIds] = useState<string[]>(
    persisted?.selectedIds ?? [],
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(!hasSaved)
  const [showStyle, setShowStyle] = useState(false)
  const [showHelp, setShowHelp] = useState(true)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragCheckpointed = useRef(false)
  const editCheckpointed = useRef(false)

  const { tree, style } = present
  const theme = THEMES[style.theme]

  const treeRef = useRef(tree)
  treeRef.current = tree
  const selectedRef = useRef(selectedIds)
  selectedRef.current = selectedIds
  const styleRef = useRef(style)
  styleRef.current = style

  const commitTree = useCallback(
    (next: TreeState | ((t: TreeState) => TreeState), record = true) => {
      set((d) => {
        const treeNext = typeof next === 'function' ? next(d.tree) : next
        return { ...d, tree: treeNext }
      }, record)
    },
    [set],
  )

  useEffect(() => {
    persist({ tree, style, selectedIds })
  }, [tree, style, selectedIds])

  const begin = (t: TreeState) => {
    replace({ tree: t, style: styleRef.current })
    setSelectedIds(Object.keys(t.nodes).slice(0, 1))
    setEditingId(null)
    setShowWelcome(false)
    setShowHelp(true)
  }

  const onSelect = (ids: string[]) => {
    setSelectedIds(ids)
    setEditingId((cur) => (cur && !ids.includes(cur) ? null : cur))
  }

  const handleAddNode = useCallback(
    (x?: number, y?: number) => {
      const nx = x ?? 360 + Math.random() * 80
      const ny = y ?? 200 + Math.random() * 60
      const { state, id } = addNode(treeRef.current, nx, ny, '')
      commitTree(state)
      setSelectedIds([id])
      setEditingId(id)
      editCheckpointed.current = false
    },
    [commitTree],
  )

  const handleMakeParent = useCallback(() => {
    const ids = selectedRef.current
    if (ids.length < 1) return
    const result = createParent(treeRef.current, ids, '')
    if (!result) return
    commitTree(result.state)
    setSelectedIds([result.id])
    setEditingId(result.id)
    editCheckpointed.current = false
  }, [commitTree])

  const handleAddChild = useCallback(() => {
    const ids = selectedRef.current
    if (ids.length !== 1) return
    const result = addChild(treeRef.current, ids[0], '')
    if (!result) return
    commitTree(result.state)
    setSelectedIds([result.id])
    setEditingId(result.id)
    editCheckpointed.current = false
  }, [commitTree])

  const handleDelete = useCallback(() => {
    const ids = selectedRef.current
    if (!ids.length) return
    commitTree(deleteNodes(treeRef.current, ids))
    setSelectedIds([])
    setEditingId(null)
  }, [commitTree])

  const handleLayout = useCallback(() => {
    const s = styleRef.current
    commitTree(
      layoutTree(treeRef.current, s.fontSize, FONTS[s.font].stack),
    )
  }, [commitTree])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      if (mod && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
        return
      }
      if (mod && e.key === 'a') {
        e.preventDefault()
        setSelectedIds(Object.keys(treeRef.current.nodes))
        return
      }

      if (e.key === 'Escape') {
        setEditingId(null)
        setSelectedIds([])
        setShowHelp(false)
        return
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        setShowHelp((v) => !v)
        return
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        handleDelete()
        return
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        handleAddNode()
        return
      }

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        handleMakeParent()
        return
      }

      if (e.key === 'e' || e.key === 'E') {
        if (selectedRef.current.length === 1) {
          e.preventDefault()
          setEditingId(selectedRef.current[0])
        }
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddChild()
        return
      }

      if (e.key === 'Tab') {
        e.preventDefault()
        if (selectedRef.current.length === 1) {
          const result = addSibling(
            treeRef.current,
            selectedRef.current[0],
            '',
          )
          if (result) {
            commitTree(result.state)
            setSelectedIds([result.id])
            setEditingId(result.id)
            editCheckpointed.current = false
          }
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    undo,
    redo,
    commitTree,
    handleDelete,
    handleAddNode,
    handleMakeParent,
    handleAddChild,
  ])

  return (
    <div
      className="app"
      style={
        {
          '--canvas': theme.canvas,
          '--canvas-texture': theme.canvasTexture,
          '--ink': theme.ink,
          '--ink-muted': theme.inkMuted,
          '--select': theme.select,
          '--select-soft': theme.selectSoft,
          '--panel': theme.panel,
          '--panel-border': theme.panelBorder,
          '--ui-text': theme.uiText,
          '--ui-muted': theme.uiMuted,
          '--accent': theme.accent,
          '--accent-text': theme.accentText,
          '--ghost': theme.ghost,
          '--grid': theme.grid,
        } as CSSProperties
      }
    >
      <div className="canvas-shell">
        {!showWelcome && (
          <>
            <Toolbar
              canUndo={canUndo}
              canRedo={canRedo}
              selectedCount={selectedIds.length}
              onUndo={undo}
              onRedo={redo}
              onAddNode={() => handleAddNode()}
              onMakeParent={handleMakeParent}
              onAddChild={handleAddChild}
              onDelete={handleDelete}
              onLayout={handleLayout}
              onToggleTriangle={() => {
                if (selectedIds.length === 1) {
                  commitTree(toggleTriangle(tree, selectedIds[0]))
                }
              }}
              onExportSvg={() => {
                const { svg } = buildExportSvg(tree, style)
                downloadText('syntax-tree.svg', svg, 'image/svg+xml')
              }}
              onExportPng={() => {
                void downloadPng(tree, style)
              }}
              onClear={() => {
                if (confirm('Clear the canvas?')) {
                  commitTree(emptyTree())
                  setSelectedIds([])
                  setEditingId(null)
                }
              }}
              showHelp={showHelp}
              onToggleHelp={() => setShowHelp((v) => !v)}
              showStyle={showStyle}
              onToggleStyle={() => setShowStyle((v) => !v)}
            />
            <StylePanel
              open={showStyle}
              style={style}
              onChange={(patch) =>
                set(
                  (d) => ({ ...d, style: { ...d.style, ...patch } }),
                  false,
                )
              }
            />
            <HelpPanel open={showHelp} />
            <SelectionBar
              count={selectedIds.length}
              onMakeParent={handleMakeParent}
              onAddChild={handleAddChild}
              onDelete={handleDelete}
            />
            <TreeCanvas
              tree={tree}
              style={style}
              selectedIds={selectedIds}
              editingId={editingId}
              svgRef={svgRef}
              onSelect={onSelect}
              onMoveStart={() => {
                if (!dragCheckpointed.current) {
                  checkpoint()
                  dragCheckpointed.current = true
                }
              }}
              onMove={(ids, dx, dy) => {
                commitTree((t) => moveNodes(t, ids, dx, dy), false)
              }}
              onMoveEnd={() => {
                dragCheckpointed.current = false
              }}
              onConnect={(parentId, childId) => {
                commitTree((t) => connect(t, parentId, childId))
              }}
              onSpawnChild={(parentId, x, y) => {
                const { state, id } = addNode(treeRef.current, x, y, '')
                commitTree(connect(state, parentId, id))
                setSelectedIds([id])
                setEditingId(id)
                editCheckpointed.current = false
              }}
              onCreateNode={(x, y) => handleAddNode(x, y)}
              onInsertEdge={(edgeId, x, y) => {
                const result = insertOnEdge(
                  treeRef.current,
                  edgeId,
                  '',
                  x,
                  y,
                )
                if (!result) return
                commitTree(result.state)
                setSelectedIds([result.id])
                setEditingId(result.id)
                editCheckpointed.current = false
              }}
              onStartEdit={(id) => {
                setSelectedIds([id])
                setEditingId(id)
                if (!editCheckpointed.current) {
                  checkpoint()
                  editCheckpointed.current = true
                }
              }}
              onEditLabel={(id, label) => {
                if (!editCheckpointed.current) {
                  checkpoint()
                  editCheckpointed.current = true
                }
                commitTree((t) => updateLabel(t, id, label), false)
              }}
              onEndEdit={() => {
                setEditingId(null)
                editCheckpointed.current = false
              }}
            />
          </>
        )}

        {showWelcome && (
          <Welcome
            onRoot={() => begin(starterRoot())}
            onLeaves={() => begin(starterLeaves())}
            onDemo={() => begin(demoTree())}
            onBlank={() => begin(emptyTree())}
          />
        )}
      </div>
    </div>
  )
}
