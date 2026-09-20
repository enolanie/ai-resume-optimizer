import { Navigate, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import AnalyzePage from './pages/AnalyzePage'
import HomePage from './pages/HomePage'
import SetupPage from './pages/SetupPage'

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/analyze" element={<AnalyzePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
