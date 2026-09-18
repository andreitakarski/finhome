import { HandCoins, Landmark, Plus, Settings, WalletCards } from 'lucide-react'

function NavButton({ active, icon: Icon, label, onClick }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}><Icon size={21}/><span>{label}</span></button>
}

export function BottomNavigation({ page, onNavigate, onQuickAdd }) {
  return <nav className="bottom-nav">
    <NavButton active={page === 'savings'} icon={WalletCards} label="Копилка" onClick={() => onNavigate('savings')}/>
    {(page === 'savings' || page === 'debts') && <button className="quick-add" onClick={onQuickAdd} aria-label={page === 'debts' ? 'Добавить долг' : 'Пополнить копилку'}><Plus size={28}/></button>}
    <NavButton active={page === 'mortgage'} icon={Landmark} label="Ипотека" onClick={() => onNavigate('mortgage')}/>
    <NavButton active={page === 'debts'} icon={HandCoins} label="Долги" onClick={() => onNavigate('debts')}/>
    <NavButton active={page === 'settings'} icon={Settings} label="Настройки" onClick={() => onNavigate('settings')}/>
  </nav>
}
