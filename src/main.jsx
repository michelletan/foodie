import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import BatchDetail from './routes/BatchDetail.jsx'
import BatchForm from './routes/BatchForm.jsx'
import FreezerView from './routes/FreezerView.jsx'
import HistoryView from './routes/HistoryView.jsx'
import RecipeDetail from './routes/RecipeDetail.jsx'
import RecipeForm from './routes/RecipeForm.jsx'
import RecipeList from './routes/RecipeList.jsx'
import ServeForm from './routes/ServeForm.jsx'

// HashRouter avoids needing a GitHub Pages SPA-fallback trick for a static
// site with no server-side rewrites.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<RecipeList />} />
          <Route path="recipes/new" element={<RecipeForm />} />
          <Route path="recipes/:id" element={<RecipeDetail />} />
          <Route path="recipes/:id/edit" element={<RecipeForm />} />
          <Route path="batches/new" element={<BatchForm />} />
          <Route path="batches/:id" element={<BatchDetail />} />
          <Route path="serve" element={<ServeForm />} />
          <Route path="freezer" element={<FreezerView />} />
          <Route path="history" element={<HistoryView />} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
)

if (import.meta.env.DEV) {
  import('./lib/data/importPdfRecipes.js').then(({ importPdfRecipes }) => {
    window.importPdfRecipes = importPdfRecipes
  })
}
