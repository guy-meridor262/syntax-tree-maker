import './SelectionBar.css'

interface Props {
  count: number
  onMakeParent: () => void
  onAddChild: () => void
  onDelete: () => void
}

export function SelectionBar({ count, onMakeParent, onAddChild, onDelete }: Props) {
  if (count === 0) return null

  return (
    <div className="selection-bar" role="toolbar" aria-label="Selection actions">
      <span className="selection-count">
        {count} selected
      </span>
      <button type="button" className="sel-btn primary" onClick={onMakeParent}>
        Make parent
      </button>
      {count === 1 && (
        <button type="button" className="sel-btn" onClick={onAddChild}>
          Add child
        </button>
      )}
      <button type="button" className="sel-btn danger" onClick={onDelete}>
        Delete
      </button>
    </div>
  )
}
