import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Footer from './components/Footer'
import PublicHome from './components/PublicHome'
import Register from './components/Register'
import VerifyEmail from './components/VerifyEmail'
import Login from './components/Login'
import StudentDashboard from './components/StudentDashboard'
import StudentProfile from './components/StudentProfile'
import AdminProfile from './components/AdminProfile'
import RankingsConsole from './components/RankingsConsole'
import Leaderboard from './components/LeaderboardDashboard'
// import EvaluationWorkspace from './components/EvaluationWorkspace'
import EvaluatorDashboard from './components/EvaluatorDashboard'
import HackathonConfig from './components/HackathonConfig'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PublicHome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/profile" element={<StudentProfile />} />
        <Route path="/admin/profile" element={<AdminProfile />} />
        <Route path="/admin/config" element={<HackathonConfig />} />
        <Route path="/admin/rankings" element={<RankingsConsole />} />
        <Route path="/judge/workspace" element={<EvaluatorDashboard />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
      <Footer />
    </Router>
  )
}

export default App;