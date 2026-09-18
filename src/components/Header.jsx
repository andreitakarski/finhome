import { Home, Settings } from 'lucide-react'

const STATUS_LABELS = { local: 'Данные на устройстве', idle: 'Google подключён', syncing: 'Синхронизация…', synced: 'Синхронизировано', offline: 'Нет интернета', error: 'Ошибка синхронизации' }

export function Header({ onHome, onSettings, syncStatus }) {
  return <header className="topbar">
    <button className="brand" onClick={onHome}>
      <span className="brand-mark"><Home size={20}/></span><span>Мои финансы</span>
    </button>
    <div className={`status ${syncStatus}`}><span className="status-dot"/> {STATUS_LABELS[syncStatus] || STATUS_LABELS.idle}</div>
    <button className="icon-btn desktop-settings" onClick={onSettings} aria-label="Настройки"><Settings size={20}/></button>
  </header>
}
