import { produce } from 'immer'
import type { StyleSettings, TreeEdge, TreeNode, TreeState } from '../types'
import { DEFAULT_STYLE } from '../types'
import {
  autoLayout,
  childrenOf,
  descendants,
  parentOf,
  wouldCreateCycle,
} from './geometry'
import { uid } from './id'

const STORAGE_KEY = 'syntax-tree-maker:v1'

export interface AppSnapshot {
  tree: TreeState
  style: StyleSettings
  selectedIds: string[]
}

export function emptyTree(): TreeState {
  return { nodes: {}, edges: [] }
}

export function starterRoot(): TreeState {
  const id = uid('n')
  return {
    nodes: {
      [id]: { id, label: 'S', x: 420, y: 100 },
    },
    edges: [],
  }
}

export function starterLeaves(): TreeState {
  const words = ['the', 'cat', 'sat']
  const nodes: Record<string, TreeNode> = {}
  words.forEach((w, i) => {
    const id = uid('n')
    nodes[id] = { id, label: w, x: 280 + i * 140, y: 280 }
  })
  return { nodes, edges: [] }
}

export function demoTree(): TreeState {
  const ids = {
    s: uid('n'),
    np: uid('n'),
    vp: uid('n'),
    d: uid('n'),
    n: uid('n'),
    v: uid('n'),
    the: uid('n'),
    cat: uid('n'),
    sat: uid('n'),
  }
  const nodes: Record<string, TreeNode> = {
    [ids.s]: { id: ids.s, label: 'S', x: 400, y: 70 },
    [ids.np]: { id: ids.np, label: 'NP', x: 260, y: 150 },
    [ids.vp]: { id: ids.vp, label: 'VP', x: 520, y: 150 },
    [ids.d]: { id: ids.d, label: 'D', x: 200, y: 230 },
    [ids.n]: { id: ids.n, label: 'N', x: 320, y: 230 },
    [ids.v]: { id: ids.v, label: 'V', x: 520, y: 230 },
    [ids.the]: { id: ids.the, label: 'the', x: 200, y: 310 },
    [ids.cat]: { id: ids.cat, label: 'cat', x: 320, y: 310 },
    [ids.sat]: { id: ids.sat, label: 'sat', x: 520, y: 310 },
  }
  const edges: TreeEdge[] = [
    { id: uid('e'), parentId: ids.s, childId: ids.np },
    { id: uid('e'), parentId: ids.s, childId: ids.vp },
    { id: uid('e'), parentId: ids.np, childId: ids.d },
    { id: uid('e'), parentId: ids.np, childId: ids.n },
    { id: uid('e'), parentId: ids.vp, childId: ids.v },
    { id: uid('e'), parentId: ids.d, childId: ids.the },
    { id: uid('e'), parentId: ids.n, childId: ids.cat },
    { id: uid('e'), parentId: ids.v, childId: ids.sat },
  ]
  return { nodes, edges }
}

export function addNode(
  state: TreeState,
  x: number,
  y: number,
  label = '',
): { state: TreeState; id: string } {
  const id = uid('n')
  const next = produce(state, (draft) => {
    draft.nodes[id] = { id, label, x, y }
  })
  return { state: next, id }
}

export function updateLabel(state: TreeState, id: string, label: string): TreeState {
  return produce(state, (draft) => {
    if (draft.nodes[id]) draft.nodes[id].label = label
  })
}

export function moveNodes(
  state: TreeState,
  ids: string[],
  dx: number,
  dy: number,
): TreeState {
  return produce(state, (draft) => {
    for (const id of ids) {
      const n = draft.nodes[id]
      if (n) {
        n.x += dx
        n.y += dy
      }
    }
  })
}

export function setNodePos(state: TreeState, id: string, x: number, y: number): TreeState {
  return produce(state, (draft) => {
    if (draft.nodes[id]) {
      draft.nodes[id].x = x
      draft.nodes[id].y = y
    }
  })
}

export function connect(
  state: TreeState,
  parentId: string,
  childId: string,
): TreeState {
  if (!state.nodes[parentId] || !state.nodes[childId]) return state
  if (wouldCreateCycle(state, parentId, childId)) return state
  // A node may have only one parent in a tree
  const withoutOld = produce(state, (draft) => {
    draft.edges = draft.edges.filter((e) => e.childId !== childId)
  })
  if (withoutOld.edges.some((e) => e.parentId === parentId && e.childId === childId)) {
    return withoutOld
  }
  return produce(withoutOld, (draft) => {
    draft.edges.push({ id: uid('e'), parentId, childId })
  })
}

export function disconnect(state: TreeState, parentId: string, childId: string): TreeState {
  return produce(state, (draft) => {
    draft.edges = draft.edges.filter(
      (e) => !(e.parentId === parentId && e.childId === childId),
    )
  })
}

export function deleteNodes(state: TreeState, ids: string[]): TreeState {
  const remove = new Set(ids)
  return produce(state, (draft) => {
    for (const id of remove) delete draft.nodes[id]
    draft.edges = draft.edges.filter(
      (e) => !remove.has(e.parentId) && !remove.has(e.childId),
    )
  })
}

/** Create a parent above multiple selected nodes */
export function createParent(
  state: TreeState,
  childIds: string[],
  label = 'XP',
): { state: TreeState; id: string } | null {
  const kids = childIds.filter((id) => state.nodes[id])
  if (kids.length === 0) return null

  const xs = kids.map((id) => state.nodes[id].x)
  const ys = kids.map((id) => state.nodes[id].y)
  const x = (Math.min(...xs) + Math.max(...xs)) / 2
  const y = Math.min(...ys) - 70

  const id = uid('n')
  let next = produce(state, (draft) => {
    draft.nodes[id] = { id, label, x, y }
  })

  // If all kids share the same parent, rewire: grandparent → new → kids
  const parents = new Set(
    kids.map((cid) => parentOf(state, cid)).filter(Boolean) as string[],
  )
  if (parents.size === 1) {
    const gp = [...parents][0]
    next = produce(next, (draft) => {
      draft.edges = draft.edges.filter((e) => !kids.includes(e.childId))
      draft.edges.push({ id: uid('e'), parentId: gp, childId: id })
    })
  } else {
    // Detach kids from old parents so new node is their only parent
    next = produce(next, (draft) => {
      draft.edges = draft.edges.filter((e) => !kids.includes(e.childId))
    })
  }

  for (const cid of kids) {
    next = connect(next, id, cid)
  }

  return { state: next, id }
}

/** Insert a node on an edge between parent and child */
export function insertOnEdge(
  state: TreeState,
  edgeId: string,
  label = '',
  x?: number,
  y?: number,
): { state: TreeState; id: string } | null {
  const edge = state.edges.find((e) => e.id === edgeId)
  if (!edge) return null
  const parent = state.nodes[edge.parentId]
  const child = state.nodes[edge.childId]
  if (!parent || !child) return null

  const id = uid('n')
  const nx = x ?? (parent.x + child.x) / 2
  const ny = y ?? (parent.y + child.y) / 2

  const next = produce(state, (draft) => {
    draft.nodes[id] = { id, label, x: nx, y: ny }
    draft.edges = draft.edges.filter((e) => e.id !== edgeId)
    draft.edges.push({ id: uid('e'), parentId: edge.parentId, childId: id })
    draft.edges.push({ id: uid('e'), parentId: id, childId: edge.childId })
  })
  return { state: next, id }
}

export function addChild(
  state: TreeState,
  parentId: string,
  label = '',
): { state: TreeState; id: string } | null {
  const parent = state.nodes[parentId]
  if (!parent) return null
  const existing = childrenOf(state, parentId)
    .slice()
    .sort((a, b) => state.nodes[a].x - state.nodes[b].x)
  let x = parent.x
  let y = parent.y + 80
  if (existing.length > 0) {
    const right = state.nodes[existing[existing.length - 1]]
    x = right.x + 100
    y = right.y
  }
  const { state: withNode, id } = addNode(state, x, y, label)
  return { state: connect(withNode, parentId, id), id }
}

export function addSibling(
  state: TreeState,
  nodeId: string,
  label = '',
): { state: TreeState; id: string } | null {
  const node = state.nodes[nodeId]
  if (!node) return null
  const p = parentOf(state, nodeId)
  const { state: withNode, id } = addNode(state, node.x + 100, node.y, label)
  if (p) return { state: connect(withNode, p, id), id }
  return { state: withNode, id }
}

export function toggleTriangle(state: TreeState, id: string): TreeState {
  return produce(state, (draft) => {
    if (draft.nodes[id]) {
      draft.nodes[id].triangle = !draft.nodes[id].triangle
    }
  })
}

export function layoutTree(
  state: TreeState,
  fontSize: number,
  fontStack: string,
): TreeState {
  return autoLayout(state, fontSize, fontStack)
}

export function loadPersisted(): AppSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AppSnapshot
  } catch {
    return null
  }
}

export function persist(snapshot: AppSnapshot) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    /* ignore quota */
  }
}

export { DEFAULT_STYLE, descendants }
