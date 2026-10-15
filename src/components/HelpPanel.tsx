import './HelpPanel.css'

interface Props {
  open: boolean
}

export function HelpPanel({ open }: Props) {
  if (!open) return null

  return (
    <aside className="help-panel" aria-label="Shortcuts">
      <div className="help-header">
        <h2>How to build</h2>
        <span className="help-version">v0.2.2</span>
      </div>
      <ul>
        <li>
          <kbd>Double-click</kbd> canvas → new node
        </li>
        <li>
          <kbd>Drag</kbd> the ↓ handle under a node → connect or spawn a child
        </li>
        <li>
          <kbd>Hover</kbd> the middle of a branch, click <kbd>+</kbd> → insert
        </li>
        <li>
          <kbd>Shift-click</kbd> or marquee → multi-select
        </li>
        <li>
          <kbd>P</kbd> or Make parent → wrap selection in a parent
        </li>
        <li>
          <kbd>Enter</kbd> → add child · <kbd>Tab</kbd> → sibling
        </li>
        <li>
          <kbd>N</kbd> → node at center · <kbd>⌫</kbd> → delete
        </li>
        <li>
          <kbd>⌘Z</kbd> / <kbd>⌘⇧Z</kbd> → undo / redo
        </li>
        <li>Double-click a label (or press <kbd>E</kbd>) to rename</li>
      </ul>
    </aside>
  )
}
