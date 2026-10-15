import type { FontId, StyleSettings, ThemeId } from '../types'
import { FONTS, THEMES } from '../types'
import './StylePanel.css'

interface Props {
  style: StyleSettings
  onChange: (patch: Partial<StyleSettings>) => void
  open: boolean
}

export function StylePanel({ style, onChange, open }: Props) {
  if (!open) return null

  return (
    <aside className="style-panel" aria-label="Look and fonts">
      <h2>Look</h2>

      <label className="field">
        <span>Theme</span>
        <div className="theme-row">
          {(Object.keys(THEMES) as ThemeId[]).map((id) => (
            <button
              key={id}
              type="button"
              className={`theme-swatch ${style.theme === id ? 'active' : ''}`}
              style={{ background: THEMES[id].canvas, color: THEMES[id].ink }}
              onClick={() => onChange({ theme: id })}
              title={THEMES[id].label}
            >
              <span className="swatch-ink" style={{ background: THEMES[id].ink }} />
              {THEMES[id].label}
            </button>
          ))}
        </div>
      </label>

      <label className="field">
        <span>Font</span>
        <div className="font-row">
          {(Object.keys(FONTS) as FontId[]).map((id) => (
            <button
              key={id}
              type="button"
              className={`font-chip ${style.font === id ? 'active' : ''}`}
              style={{ fontFamily: FONTS[id].stack }}
              onClick={() => onChange({ font: id })}
            >
              {FONTS[id].label}
            </button>
          ))}
        </div>
      </label>

      <label className="field">
        <span>Size · {style.fontSize}px</span>
        <input
          type="range"
          min={12}
          max={32}
          value={style.fontSize}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
        />
      </label>

      <label className="field">
        <span>Line weight · {style.lineWidth.toFixed(1)}</span>
        <input
          type="range"
          min={1}
          max={4}
          step={0.25}
          value={style.lineWidth}
          onChange={(e) => onChange({ lineWidth: Number(e.target.value) })}
        />
      </label>

      <label className="field">
        <span>Branches</span>
        <div className="seg">
          <button
            type="button"
            className={style.branchStyle === 'straight' ? 'active' : ''}
            onClick={() => onChange({ branchStyle: 'straight' })}
          >
            Straight
          </button>
          <button
            type="button"
            className={style.branchStyle === 'elbow' ? 'active' : ''}
            onClick={() => onChange({ branchStyle: 'elbow' })}
          >
            Elbow
          </button>
        </div>
      </label>

      <label className="check">
        <input
          type="checkbox"
          checked={style.showGrid}
          onChange={(e) => onChange({ showGrid: e.target.checked })}
        />
        Show grid
      </label>

      <label className="check">
        <input
          type="checkbox"
          checked={style.italicTerminals}
          onChange={(e) => onChange({ italicTerminals: e.target.checked })}
        />
        Italic terminals
      </label>
    </aside>
  )
}
