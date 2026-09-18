import { Home, Settings } from 'lucide-react'

export function Header({ onHome, onSettings }) {
  return <header className="topbar">
    <button className="brand" onClick={onHome}>
      <span className="brand-mark"><Home size={20}/></span><span>Мои финансы</span>
    </button>
    <div className="status"><span className="status-dot"/> Данные на устройстве</div>
    <button className="icon-btn desktop-settings" onClick={onSettings} aria-label="Настройки"><Settings size={20}/></button>
  </header>
}
