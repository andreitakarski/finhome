import { X } from 'lucide-react'

export function Modal({ title, eyebrow = 'НОВАЯ ОПЕРАЦИЯ', onClose, children }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="modal">
      <div className="modal-head"><div><p className="eyebrow dark">{eyebrow}</p><h2>{title}</h2></div><button className="icon-btn" onClick={onClose}><X/></button></div>
      {children}
    </div>
  </div>
}
