import { Outlet } from 'react-router-dom'
import logo from './assets/logo.svg'
import BottomNav from './components/BottomNav.jsx'
import UserMenu from './components/UserMenu.jsx'
import UserSwitcher from './components/UserSwitcher.jsx'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>
          <img src={logo} alt="" width="28" height="28" />
          foodie
        </h1>
        <UserSwitcher />
        <UserMenu />
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

export default App
