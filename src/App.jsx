import { useEffect, useState } from 'react'
import { BottomNavigation } from './components/BottomNavigation'
import { Header } from './components/Header'
import { useFinanceData } from './hooks/useFinanceData'
import { MoneyModal } from './modals/MoneyModal'
import { PaymentModal } from './modals/PaymentModal'
import { DebtModal } from './modals/DebtModal'
import { RepaymentModal } from './modals/RepaymentModal'
import { DebtsPage } from './pages/DebtsPage'
import { MortgagePage } from './pages/MortgagePage'
import { SavingsPage } from './pages/SavingsPage'
import { SettingsPage } from './pages/SettingsPage'
import { restoreGoogleAuth } from './components/SyncCard'
import { AuthGate } from './components/AuthGate'
import { GOOGLE_TOKEN_KEY } from './constants/sync'
import { useCloudSync } from './hooks/useCloudSync'

export default function App() {
  const [googleAuth, setGoogleAuth] = useState(restoreGoogleAuth)
  const { data, setData, totals, isLoaded, syncRevision, applyRemoteData, addTransaction, addMortgagePayment, addDebt, repayDebt } = useFinanceData()
  const { status: syncStatus } = useCloudSync({ auth: googleAuth, data, isLoaded, changeSignal: syncRevision, onRemoteData: applyRemoteData })
  const [page, setPage] = useState('savings')
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!googleAuth?.expiresAt) return undefined
    const timeout = window.setTimeout(() => {
      sessionStorage.removeItem(GOOGLE_TOKEN_KEY)
      setGoogleAuth(null)
    }, Math.max(0, googleAuth.expiresAt - Date.now()))
    return () => window.clearTimeout(timeout)
  }, [googleAuth?.expiresAt])
  function notify(message) { setToast(message); window.setTimeout(() => setToast(''), 2200) }
  function openMoneyModal(direction, source) { setModal({ type: 'money', direction, source }) }
  function saveTransaction(transaction) { addTransaction(transaction); setModal(null); notify(transaction.direction === 'in' ? 'Средства добавлены' : 'Списание сохранено') }
  function savePayment(payment) { addMortgagePayment(payment); setModal(null); notify('Платёж учтён') }
  function saveDebt(debt) { addDebt(debt); setModal(null); notify('Долг добавлен') }
  function saveRepayment(amount) { repayDebt(modal.debt.id, amount); setModal(null); notify('Погашение учтено') }

  if (!googleAuth) return <AuthGate onAuthChange={setGoogleAuth}/>

  return <div className="app-shell">
    <Header onHome={() => setPage('savings')} onSettings={() => setPage('settings')} syncStatus={syncStatus}/>
    <main>
      {page === 'savings' && <SavingsPage data={data} totals={totals} onMoneyAction={openMoneyModal}/>} 
      {page === 'mortgage' && <MortgagePage mortgage={data.mortgage} usdRate={data.rates.USD} onAddPayment={() => setModal({ type: 'payment' })}/>}
      {page === 'debts' && <DebtsPage debts={data.debts} rates={data.rates} savingsTotals={totals} onRepay={(debt) => setModal({ type: 'repayment', debt })}/>} 
      {page === 'settings' && <SettingsPage data={data} setData={setData} notify={notify} googleAuth={googleAuth} onGoogleAuthChange={setGoogleAuth}/>}
    </main>
    <BottomNavigation page={page} onNavigate={setPage} onQuickAdd={() => page === 'debts' ? setModal({ type: 'debt' }) : openMoneyModal('in', 'cash')}/>
    {modal?.type === 'money' && <MoneyModal data={data} initial={modal} onClose={() => setModal(null)} onSave={saveTransaction}/>} 
    {modal?.type === 'payment' && <PaymentModal mortgage={data.mortgage} onClose={() => setModal(null)} onSave={savePayment}/>}
    {modal?.type === 'debt' && <DebtModal onClose={() => setModal(null)} onSave={saveDebt}/>} 
    {modal?.type === 'repayment' && <RepaymentModal debt={modal.debt} onClose={() => setModal(null)} onSave={saveRepayment}/>} 
    {toast && <div className="toast">{toast}</div>}
  </div>
}
