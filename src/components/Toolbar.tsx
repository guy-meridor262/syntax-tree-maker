import './Toolbar.css'

interface Props {
  canUndo: boolean
  canRedo: boolean
  selectedCount: number
  onUndo: () => void
  onRedo: () => void
  onAddNode: () => void
  onMakeParent: () => void
  onAddChild: () => void
  onDelete: () => void
  onLayout: () => void
  onToggleTriangle: () => void
  onExportSvg: () => void
  onExportPng: () => void
  onClear: () => void
  showHelp: boolean
  onToggleHelp: () => void
  showStyle: boolean
  onToggleStyle: () => void
}

export function Toolbar(props: Props) {
  const hasSel = props.selectedCount >= 1
  const one = props.selectedCount === 1

  return (
    <header className="toolbar">
      <div className="toolbar-brand">
        <span className="brand-mark" aria-hidden />
        <span className="brand-name">Syntax Tree Maker</span>
      </div>

      <div className="toolbar-group">
        <button type="button" className="icon-btn" onClick={props.onUndo} disabled={!props.canUndo} title="Undo ⌘Z">
          Undo
        </button>
        <button type="button" className="icon-btn" onClick={props.onRedo} disabled={!props.canRedo} title="Redo ⌘⇧Z">
          Redo
        </button>
      </div>

      <div className="toolbar-group">
        <button type="button" className="icon-btn" onClick={props.onAddNode} title="Add node (N)">
          + Node
        </button>
        <button
          type="button"
          className="icon-btn accent"
          onClick={props.onMakeParent}
          disabled={!hasSel}
          title="Wrap selection in a parent (P)"
        >
          Make parent
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={props.onAddChild}
          disabled={!one}
          title="Add child (Enter)"
        >
          + Child
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={props.onToggleTriangle}
          disabled={!one}
          title="Triangle yield"
        >
          Triangle
        </button>
        <button
          type="button"
          className="icon-btn danger"
          onClick={props.onDelete}
          disabled={props.selectedCount === 0}
          title="Delete (⌫)"
        >
          Delete
        </button>
      </div>

      <div className="toolbar-group">
        <button type="button" className="icon-btn" onClick={props.onLayout} title="Auto-layout">
          Layout
        </button>
        <button
          type="button"
          className={`icon-btn ${props.showStyle ? 'active' : ''}`}
          onClick={props.onToggleStyle}
          title="Look & fonts"
        >
          Look
        </button>
        <button type="button" className="icon-btn" onClick={props.onExportSvg} title="Export SVG">
          SVG
        </button>
        <button type="button" className="icon-btn" onClick={props.onExportPng} title="Export PNG">
          PNG
        </button>
        <button type="button" className="icon-btn" onClick={props.onClear} title="Clear canvas">
          Clear
        </button>
        <button
          type="button"
          className={`icon-btn ${props.showHelp ? 'active' : ''}`}
          onClick={props.onToggleHelp}
          title="Shortcuts (?)"
        >
          ?
        </button>
      </div>
    </header>
  )
}
