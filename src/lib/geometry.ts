import type { TreeEdge, TreeNode, TreeState } from '../types'

export const NODE_PAD_X = 10
export const NODE_PAD_Y = 6
export const MIN_NODE_W = 28
export const NODE_H = 28

export function measureLabel(
  label: string,
  fontSize: number,
  fontStack: string,
): { width: number; height: number } {
  const canvas = measureLabel._canvas ?? document.createElement('canvas')
  measureLabel._canvas = canvas
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return {
      width: Math.max(MIN_NODE_W, label.length * fontSize * 0.55 + NODE_PAD_X * 2),
      height: fontSize + NODE_PAD_Y * 2,
    }
  }
  ctx.font = `600 ${fontSize}px ${fontStack}`
  const metrics = ctx.measureText(label.trim() ? label : '?')
  return {
    width: Math.max(MIN_NODE_W, Math.ceil(metrics.width) + NODE_PAD_X * 2),
    height: Math.max(NODE_H, fontSize + NODE_PAD_Y * 2),
  }
}
measureLabel._canvas = null as HTMLCanvasElement | null

export function nodeBounds(
  node: TreeNode,
  fontSize: number,
  fontStack: string,
): { x: number; y: number; w: number; h: number; cx: number; cy: number; bottom: number; top: number } {
  const { width: w, height: h } = measureLabel(node.label || '?', fontSize, fontStack)
  return {
    x: node.x - w / 2,
    y: node.y - h / 2,
    w,
    h,
    cx: node.x,
    cy: node.y,
    top: node.y - h / 2,
    bottom: node.y + h / 2,
  }
}

export function childrenOf(state: TreeState, parentId: string): string[] {
  return state.edges.filter((e) => e.parentId === parentId).map((e) => e.childId)
}

export function parentOf(state: TreeState, childId: string): string | null {
  return state.edges.find((e) => e.childId === childId)?.parentId ?? null
}

export function roots(state: TreeState): string[] {
  const childIds = new Set(state.edges.map((e) => e.childId))
  return Object.keys(state.nodes).filter((id) => !childIds.has(id))
}

export function isTerminal(state: TreeState, id: string): boolean {
  return !state.edges.some((e) => e.parentId === id)
}

export function descendants(state: TreeState, id: string): Set<string> {
  const out = new Set<string>()
  const stack = [...childrenOf(state, id)]
  while (stack.length) {
    const cur = stack.pop()!
    if (out.has(cur)) continue
    out.add(cur)
    stack.push(...childrenOf(state, cur))
  }
  return out
}

export function wouldCreateCycle(
  state: TreeState,
  parentId: string,
  childId: string,
): boolean {
  if (parentId === childId) return true
  return descendants(state, childId).has(parentId)
}

/** Leaves under a node, left-to-right by x */
export function leafYield(state: TreeState, id: string): TreeNode[] {
  const leaves: TreeNode[] = []
  const walk = (nid: string) => {
    const kids = childrenOf(state, nid)
    if (kids.length === 0) {
      const n = state.nodes[nid]
      if (n) leaves.push(n)
      return
    }
    kids
      .slice()
      .sort((a, b) => state.nodes[a].x - state.nodes[b].x)
      .forEach(walk)
  }
  walk(id)
  return leaves
}

/**
 * Triangle for a collapsed constituent: apex at the parent, base at the
 * same y where normal branches would meet the leaf tops.
 */
export function trianglePoints(
  state: TreeState,
  id: string,
  fontSize: number,
  fontStack: string,
): { apexX: number; apexY: number; left: number; right: number; baseY: number } | null {
  const node = state.nodes[id]
  if (!node) return null
  const leaves = leafYield(state, id).filter((l) => l.id !== id)
  if (leaves.length === 0) return null

  const pb = nodeBounds(node, fontSize, fontStack)
  const bounds = leaves.map((l) => nodeBounds(l, fontSize, fontStack))
  // Branches attach at child.top — base sits on that line, not through label centers
  const baseY = Math.max(...bounds.map((b) => b.top))
  const left = Math.min(...bounds.map((b) => b.x)) - 6
  const right = Math.max(...bounds.map((b) => b.x + b.w)) + 6

  return {
    apexX: pb.cx,
    apexY: pb.bottom,
    left,
    right,
    baseY,
  }
}

export function pointInRect(
  px: number,
  py: number,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  return px >= x && px <= x + w && py >= y && py <= y + h
}

export function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { dist: number; t: number; cx: number; cy: number } {
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy
  if (len2 === 0) {
    const dist = Math.hypot(px - x1, py - y1)
    return { dist, t: 0, cx: x1, cy: y1 }
  }
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2))
  const cx = x1 + t * dx
  const cy = y1 + t * dy
  return { dist: Math.hypot(px - cx, py - cy), t, cx, cy }
}

export function edgePath(
  parent: TreeNode,
  child: TreeNode,
  fontSize: number,
  fontStack: string,
  style: 'straight' | 'elbow',
): { x1: number; y1: number; x2: number; y2: number; midX: number; midY: number; d: string } {
  const pb = nodeBounds(parent, fontSize, fontStack)
  const cb = nodeBounds(child, fontSize, fontStack)
  const x1 = pb.cx
  const y1 = pb.bottom
  const x2 = cb.cx
  const y2 = cb.top
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2
  if (style === 'elbow') {
    const my = y1 + (y2 - y1) * 0.45
    const d = `M ${x1} ${y1} L ${x1} ${my} L ${x2} ${my} L ${x2} ${y2}`
    return { x1, y1, x2, y2, midX: (x1 + x2) / 2, midY: my, d }
  }
  const d = `M ${x1} ${y1} L ${x2} ${y2}`
  return { x1, y1, x2, y2, midX, midY, d }
}

export function autoLayout(
  state: TreeState,
  fontSize: number,
  fontStack: string,
  gapX = 28,
  gapY = 64,
): TreeState {
  const nodeList = Object.values(state.nodes)
  if (nodeList.length === 0) return state

  const rootIds = roots(state)
  // Forest: layout each component
  const positions = new Map<string, { x: number; y: number }>()
  let forestOffset = 0

  const layoutTree = (rootId: string, originX: number): number => {
    const widths = new Map<string, number>()

    const subtreeWidth = (id: string): number => {
      if (widths.has(id)) return widths.get(id)!
      const kids = childrenOf(state, id)
        .slice()
        .sort((a, b) => (state.nodes[a]?.x ?? 0) - (state.nodes[b]?.x ?? 0))
      const selfW = nodeBounds(state.nodes[id], fontSize, fontStack).w
      if (kids.length === 0) {
        widths.set(id, selfW)
        return selfW
      }
      const kidsW =
        kids.reduce((sum, k) => sum + subtreeWidth(k), 0) + gapX * (kids.length - 1)
      const w = Math.max(selfW, kidsW)
      widths.set(id, w)
      return w
    }

    const place = (id: string, left: number, depth: number) => {
      const w = subtreeWidth(id)
      const kids = childrenOf(state, id)
        .slice()
        .sort((a, b) => (state.nodes[a]?.x ?? 0) - (state.nodes[b]?.x ?? 0))
      const cx = left + w / 2
      positions.set(id, { x: cx, y: depth * gapY })
      let cursor = left + (w - (kids.reduce((s, k) => s + subtreeWidth(k), 0) + gapX * Math.max(0, kids.length - 1))) / 2
      for (const k of kids) {
        const kw = subtreeWidth(k)
        place(k, cursor, depth + 1)
        cursor += kw + gapX
      }
    }

    const totalW = subtreeWidth(rootId)
    place(rootId, originX, 0)
    return totalW
  }

  // Unconnected nodes that aren't in any edge as child stay as roots;
  // also place orphan clusters
  const placed = new Set<string>()
  for (const rid of rootIds) {
    const w = layoutTree(rid, forestOffset)
    forestOffset += w + gapX * 2
    placed.add(rid)
    descendants(state, rid).forEach((d) => placed.add(d))
  }

  // Any leftover (shouldn't happen) keep position
  const nodes: Record<string, TreeNode> = {}
  for (const [id, node] of Object.entries(state.nodes)) {
    const p = positions.get(id)
    nodes[id] = p ? { ...node, x: p.x + 80, y: p.y + 80 } : node
  }

  return { nodes, edges: state.edges }
}

/**
 * Find a branch near the cursor for the insert-+ affordance.
 * Only matches when the cursor projects onto the *middle* of the branch
 * (so endpoints / parent outlets never compete with connect handles).
 */
export function findEdgeNear(
  state: TreeState,
  px: number,
  py: number,
  fontSize: number,
  fontStack: string,
  branchStyle: 'straight' | 'elbow',
  threshold = 10,
): { edge: TreeEdge; midX: number; midY: number; dist: number } | null {
  let best: {
    edge: TreeEdge
    midX: number
    midY: number
    dist: number
  } | null = null

  for (const edge of state.edges) {
    const parent = state.nodes[edge.parentId]
    const child = state.nodes[edge.childId]
    if (!parent || !child || parent.triangle) continue
    const path = edgePath(parent, child, fontSize, fontStack, branchStyle)
    const branchLen = Math.hypot(path.x2 - path.x1, path.y2 - path.y1)
    // Too short: midpoint would sit on the parent outlet
    if (branchLen < 80) continue

    let dist = Infinity
    let along = 0.5 // fraction along the branch (0=parent, 1=child)

    if (branchStyle === 'elbow') {
      const my = path.midY
      const segs: [number, number, number, number][] = [
        [path.x1, path.y1, path.x1, my],
        [path.x1, my, path.x2, my],
        [path.x2, my, path.x2, path.y2],
      ]
      const lengths = segs.map(([x1, y1, x2, y2]) => Math.hypot(x2 - x1, y2 - y1))
      const total = lengths.reduce((a, b) => a + b, 0) || 1
      let bestSeg = -1
      let bestSegDist = Infinity
      let bestSegT = 0
      segs.forEach(([x1, y1, x2, y2], i) => {
        const hit = distToSegment(px, py, x1, y1, x2, y2)
        if (hit.dist < bestSegDist) {
          bestSegDist = hit.dist
          bestSeg = i
          bestSegT = hit.t
        }
      })
      dist = bestSegDist
      let traveled = 0
      for (let i = 0; i < bestSeg; i++) traveled += lengths[i]
      traveled += lengths[bestSeg] * bestSegT
      along = traveled / total
    } else {
      const hit = distToSegment(px, py, path.x1, path.y1, path.x2, path.y2)
      dist = hit.dist
      along = hit.t
    }

    // Only the middle of the branch — never near parent/child sockets
    if (along < 0.35 || along > 0.72) continue
    if (dist > threshold) continue
    if (!best || dist < best.dist) {
      best = { edge, midX: path.midX, midY: path.midY, dist }
    }
  }
  return best
}
