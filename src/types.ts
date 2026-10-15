export type ThemeId = 'classic' | 'ink' | 'slate' | 'parchment' | 'chalkboard'

export type FontId = 'literata' | 'source-serif' | 'fraunces' | 'plex-mono' | 'dm-sans'

export interface TreeNode {
  id: string
  label: string
  x: number
  y: number
  /** Draw a triangle spanning leaf yield instead of branching lines */
  triangle?: boolean
}

export interface TreeEdge {
  id: string
  parentId: string
  childId: string
}

export interface TreeState {
  nodes: Record<string, TreeNode>
  edges: TreeEdge[]
}

export interface StyleSettings {
  theme: ThemeId
  font: FontId
  fontSize: number
  lineWidth: number
  branchStyle: 'straight' | 'elbow'
  showGrid: boolean
  italicTerminals: boolean
}

export interface ThemeTokens {
  id: ThemeId
  label: string
  canvas: string
  canvasTexture: string
  ink: string
  inkMuted: string
  select: string
  selectSoft: string
  panel: string
  panelBorder: string
  uiText: string
  uiMuted: string
  accent: string
  accentText: string
  ghost: string
  grid: string
}

export const THEMES: Record<ThemeId, ThemeTokens> = {
  classic: {
    id: 'classic',
    label: 'Classic',
    canvas: '#F7F5F1',
    canvasTexture:
      'radial-gradient(ellipse at 20% 0%, rgba(31,77,70,0.04), transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(180,120,60,0.05), transparent 45%)',
    ink: '#1A1A1A',
    inkMuted: '#5C5C5C',
    select: '#C45C26',
    selectSoft: 'rgba(196,92,38,0.14)',
    panel: 'rgba(255,255,255,0.86)',
    panelBorder: 'rgba(26,26,26,0.1)',
    uiText: '#1A1A1A',
    uiMuted: '#6B6560',
    accent: '#1F4D46',
    accentText: '#F4F8F7',
    ghost: 'rgba(26,26,26,0.08)',
    grid: 'rgba(26,26,26,0.06)',
  },
  ink: {
    id: 'ink',
    label: 'Teal Ink',
    canvas: '#E7EFEC',
    canvasTexture:
      'radial-gradient(ellipse at 10% 20%, rgba(31,77,70,0.08), transparent 40%), radial-gradient(ellipse at 90% 80%, rgba(20,40,50,0.06), transparent 45%)',
    ink: '#14352F',
    inkMuted: '#3D5E57',
    select: '#B45309',
    selectSoft: 'rgba(180,83,9,0.16)',
    panel: 'rgba(250,252,251,0.9)',
    panelBorder: 'rgba(20,53,47,0.12)',
    uiText: '#14352F',
    uiMuted: '#4A6A63',
    accent: '#0F3D36',
    accentText: '#EAF3F0',
    ghost: 'rgba(20,53,47,0.1)',
    grid: 'rgba(20,53,47,0.07)',
  },
  slate: {
    id: 'slate',
    label: 'Slate',
    canvas: '#E8EDF2',
    canvasTexture:
      'linear-gradient(160deg, rgba(45,74,98,0.06), transparent 40%), radial-gradient(ellipse at 70% 10%, rgba(90,110,130,0.08), transparent 50%)',
    ink: '#1E2A36',
    inkMuted: '#4A5A6A',
    select: '#0E7490',
    selectSoft: 'rgba(14,116,144,0.14)',
    panel: 'rgba(255,255,255,0.88)',
    panelBorder: 'rgba(30,42,54,0.1)',
    uiText: '#1E2A36',
    uiMuted: '#5A6A7A',
    accent: '#234E70',
    accentText: '#F0F5F9',
    ghost: 'rgba(30,42,54,0.08)',
    grid: 'rgba(30,42,54,0.06)',
  },
  parchment: {
    id: 'parchment',
    label: 'Parchment',
    canvas: '#EDE4D4',
    canvasTexture:
      'radial-gradient(ellipse at 30% 20%, rgba(120,80,40,0.08), transparent 50%), radial-gradient(ellipse at 80% 90%, rgba(80,50,20,0.07), transparent 45%)',
    ink: '#3B2A1A',
    inkMuted: '#6B5340',
    select: '#9A3412',
    selectSoft: 'rgba(154,52,18,0.14)',
    panel: 'rgba(255,248,236,0.9)',
    panelBorder: 'rgba(59,42,26,0.12)',
    uiText: '#3B2A1A',
    uiMuted: '#7A624E',
    accent: '#5C3D2E',
    accentText: '#F8F0E4',
    ghost: 'rgba(59,42,26,0.1)',
    grid: 'rgba(59,42,26,0.07)',
  },
  chalkboard: {
    id: 'chalkboard',
    label: 'Chalkboard',
    canvas: '#1C2B26',
    canvasTexture:
      'radial-gradient(ellipse at 40% 0%, rgba(255,255,255,0.04), transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(0,0,0,0.25), transparent 50%)',
    ink: '#E8F0EE',
    inkMuted: '#A8BDB6',
    select: '#F0B429',
    selectSoft: 'rgba(240,180,41,0.18)',
    panel: 'rgba(28,43,38,0.92)',
    panelBorder: 'rgba(232,240,238,0.12)',
    uiText: '#E8F0EE',
    uiMuted: '#9BB0A9',
    accent: '#3D6B5E',
    accentText: '#E8F0EE',
    ghost: 'rgba(232,240,238,0.08)',
    grid: 'rgba(232,240,238,0.06)',
  },
}

export const FONTS: Record<
  FontId,
  { id: FontId; label: string; family: string; stack: string }
> = {
  literata: {
    id: 'literata',
    label: 'Literata',
    family: 'Literata',
    stack: '"Literata", "Source Serif 4", Georgia, serif',
  },
  'source-serif': {
    id: 'source-serif',
    label: 'Source Serif',
    family: 'Source Serif 4',
    stack: '"Source Serif 4", Georgia, serif',
  },
  fraunces: {
    id: 'fraunces',
    label: 'Fraunces',
    family: 'Fraunces',
    stack: '"Fraunces", Georgia, serif',
  },
  'plex-mono': {
    id: 'plex-mono',
    label: 'Plex Mono',
    family: 'IBM Plex Mono',
    stack: '"IBM Plex Mono", ui-monospace, monospace',
  },
  'dm-sans': {
    id: 'dm-sans',
    label: 'DM Sans',
    family: 'DM Sans',
    stack: '"DM Sans", system-ui, sans-serif',
  },
}

export const DEFAULT_STYLE: StyleSettings = {
  theme: 'ink',
  font: 'literata',
  fontSize: 18,
  lineWidth: 1.75,
  branchStyle: 'straight',
  showGrid: true,
  italicTerminals: true,
}
