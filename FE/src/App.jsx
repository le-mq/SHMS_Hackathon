import { useState } from 'react'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import Footer from './components/Footer'
import PublicHome from './components/PublicHome'
import Register from './components/Register'
import VerifyEmail from './components/VerifyEmail'
import Login from './components/Login'

function App() {
  return (
      <Router>
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Routes>
        <Footer />
      </Router>
  )
}

export default App;