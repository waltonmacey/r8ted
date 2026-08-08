import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { EditModeProvider } from './lib/EditMode'
import Nav from './components/Nav'
import Home from './pages/Home'
import Domain from './pages/Domain'
import Subcategory from './pages/Subcategory'
import ListDetail from './pages/ListDetail'
import NewList from './pages/NewList'
import DuelSession from './pages/DuelSession'

// HashRouter keeps GitHub Pages routing dead simple (no 404 fallback tricks),
// and matches the POC's hash URL scheme: #/, #/domain/{id}, #/sub/{d}/{s}, #/list/{id}, #/session/{id}.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <EditModeProvider>
      <HashRouter>
        <Nav />
        <main className="mx-auto max-w-6xl px-5 pb-24">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/domain/:domainId" element={<Domain />} />
            <Route path="/sub/:domainId/:subId" element={<Subcategory />} />
            <Route path="/list/:listId" element={<ListDetail />} />
            <Route path="/new/:domainId/:subId" element={<NewList />} />
            <Route path="/session/:listId" element={<DuelSession />} />
          </Routes>
        </main>
      </HashRouter>
    </EditModeProvider>
  </React.StrictMode>
)
