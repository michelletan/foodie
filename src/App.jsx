import { Outlet } from 'react-router-dom'
import logo from './assets/logo.svg'
import BottomNav from './components/BottomNav.jsx'
import SignOutButton from './components/SignOutButton.jsx'
import UserSwitcher from './components/UserSwitcher.jsx'
import './App.css'

function App() {
  return (
    <>
      <header className="app-header">
        <h1>
          <img src={logo} alt="" width="28" height="28" />
          foodie
        </h1>
        <UserSwitcher />
        <SignOutButton />
      </header>
      <main>
        <Outlet />
      </main>
      <BottomNav />
    </>
  )
}

export default App
