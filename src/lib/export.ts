import type { StyleSettings, TreeState } from '../types'
import { FONTS, THEMES } from '../types'
import { edgePath, isTerminal, leafYield, nodeBounds, trianglePoints } from './geometry'

export function buildExportSvg(
  tree: TreeState,
  style: StyleSettings,
  padding = 40,
): { svg: string; width: number; height: number } {
  const theme = THEMES[style.theme]
  const font = FONTS[style.font]
  const nodes = Object.values(tree.nodes)
  if (nodes.length === 0) {
    return {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"></svg>`,
      width: 400,
      height: 300,
    }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const n of nodes) {
    const b = nodeBounds(n, style.fontSize, font.stack)
    minX = Math.min(minX, b.x)
    minY = Math.min(minY, b.y)
    maxX = Math.max(maxX, b.x + b.w)
    maxY = Math.max(maxY, b.y + b.h)
    if (n.triangle) {
      const leaves = leafYield(tree, n.id)
      for (const l of leaves) {
        minX = Math.min(minX, l.x - 20)
        maxX = Math.max(maxX, l.x + 20)
        maxY = Math.max(maxY, l.y + 20)
      }
    }
  }

  const width = Math.ceil(maxX - minX + padding * 2)
  const height = Math.ceil(maxY - minY + padding * 2)
  const ox = -minX + padding
  const oy = -minY + padding

  const parts: string[] = []
  parts.push(
    `<rect width="${width}" height="${height}" fill="${theme.canvas}"/>`,
  )

  for (const n of nodes) {
    if (!n.triangle) continue
    const tri = trianglePoints(tree, n.id, style.fontSize, font.stack)
    if (!tri) continue
    parts.push(
      `<polygon points="${tri.apexX + ox},${tri.apexY + oy} ${tri.left + ox},${tri.baseY + oy} ${tri.right + ox},${tri.baseY + oy}" fill="none" stroke="${theme.ink}" stroke-width="${style.lineWidth}"/>`,
    )
  }

  for (const edge of tree.edges) {
    const parent = tree.nodes[edge.parentId]
    const child = tree.nodes[edge.childId]
    if (!parent || !child || parent.triangle) continue
    const path = edgePath(parent, child, style.fontSize, font.stack, style.branchStyle)
    // offset path roughly by rewriting M/L coords — simpler: translate group
    parts.push(
      `<path d="${path.d}" fill="none" stroke="${theme.ink}" stroke-width="${style.lineWidth}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${ox} ${oy})"/>`,
    )
  }

  for (const n of nodes) {
    const b = nodeBounds(n, style.fontSize, font.stack)
    const terminal = isTerminal(tree, n.id)
    const italic = style.italicTerminals && terminal ? 'italic' : 'normal'
    const weight = terminal ? 400 : 600
    const label = escapeXml(n.label)
    parts.push(
      `<text x="${b.cx + ox}" y="${b.cy + oy}" text-anchor="middle" dominant-baseline="central" fill="${theme.ink}" font-family="${escapeXml(font.family)}" font-size="${style.fontSize}" font-style="${italic}" font-weight="${weight}">${label}</text>`,
    )
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${parts.join('\n')}
</svg>`

  return { svg, width, height }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadPng(
  tree: TreeState,
  style: StyleSettings,
  filename = 'syntax-tree.png',
) {
  const { svg, width, height } = buildExportSvg(tree, style)
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.decoding = 'async'
  const loaded = new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to rasterize'))
  })
  img.src = url
  await loaded
  const canvas = document.createElement('canvas')
  const scale = 2
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.fillStyle = THEMES[style.theme].canvas
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0)
  URL.revokeObjectURL(url)
  canvas.toBlob((png) => {
    if (!png) return
    const u = URL.createObjectURL(png)
    const a = document.createElement('a')
    a.href = u
    a.download = filename
    a.click()
    URL.revokeObjectURL(u)
  }, 'image/png')
}
