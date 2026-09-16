import { NavLink, Outlet } from 'react-router-dom'
import UserSwitcher from './components/UserSwitcher.jsx'
import './App.css'

function App() {
  return (
    <>
      <header className="app-header">
        <h1>foodie</h1>
        <nav>
          <NavLink to="/" end>
            Recipes
          </NavLink>
          <NavLink to="/batches/new">Log batch</NavLink>
          <NavLink to="/serve">Serve</NavLink>
          <NavLink to="/freezer">Freezer</NavLink>
          <NavLink to="/history">History</NavLink>
        </nav>
        <UserSwitcher />
      </header>
      <main>
        <Outlet />
      </main>
    </>
  )
}

export default App
