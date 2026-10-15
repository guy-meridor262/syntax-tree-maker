import './Welcome.css'

interface Props {
  onRoot: () => void
  onLeaves: () => void
  onDemo: () => void
  onBlank: () => void
}

export function Welcome({ onRoot, onLeaves, onDemo, onBlank }: Props) {
  return (
    <div className="welcome">
      <div className="welcome-card">
        <p className="welcome-brand">Syntax Tree Maker</p>
        <h1 className="welcome-title">Build trees by feel</h1>
        <p className="welcome-sub">
          Double-click to add a node. Drag from a node to connect. Select a few
          and make a parent. Click a branch to split it.
        </p>
        <div className="welcome-actions">
          <button type="button" className="btn primary" onClick={onRoot}>
            Start with a root
          </button>
          <button type="button" className="btn" onClick={onLeaves}>
            Scatter leaves
          </button>
          <button type="button" className="btn" onClick={onDemo}>
            Open demo tree
          </button>
          <button type="button" className="btn ghost" onClick={onBlank}>
            Blank canvas
          </button>
        </div>
      </div>
    </div>
  )
}
