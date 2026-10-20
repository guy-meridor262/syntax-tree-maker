/** Parse `Base_i` / `Base_{multi}` markup into base + subscript. */
export interface LabelParts {
  base: string
  sub: string | null
}

const SUB_SCALE = 0.62
const SUB_DY_RATIO = 0.28

export function parseLabel(label: string): LabelParts {
  const raw = label
  const idx = raw.indexOf('_')
  if (idx < 0) return { base: raw, sub: null }

  const base = raw.slice(0, idx)
  const rest = raw.slice(idx + 1)
  if (!rest) return { base, sub: null }

  if (rest.startsWith('{')) {
    const end = rest.indexOf('}')
    if (end > 0) {
      const sub = rest.slice(1, end)
      return { base, sub: sub || null }
    }
  }

  return { base, sub: rest }
}

export function subFontSize(fontSize: number): number {
  return Math.max(8, fontSize * SUB_SCALE)
}

export function subDy(fontSize: number): number {
  return fontSize * SUB_DY_RATIO
}

/** Extra width added so the subscript doesn't feel cramped against the base. */
export function subGap(fontSize: number): number {
  return Math.max(0.5, fontSize * 0.04)
}
