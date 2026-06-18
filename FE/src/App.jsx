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
import Leaderboard from './components/LeaderboardDashboard.jsx'
import EvaluationWorkspace from './components/EvaluationWorkspace.jsx'
import EvaluatorDashboard from './components/EvaluatorDashboard.jsx'
import PartnerConfig from './components/PartnerVerification.jsx'
import ExpertProvision from './components/ExpertProvision.jsx'
import HackathonConfig from './components/HackathonConfig'
import RubricConfig from './components/RubricConfig.jsx'
import TeamStatus from './components/TeamStatus'
import MentorCategory from './components/MentorCategory'
import TeamRegistrationApproval from './components/TeamRegistrationApproval.jsx'
import LeaderWorkspace from './components/LeaderWorkspace'
import PanelAllocation from './components/PanelAllocation.jsx'
import ProjectSubmission from './components/ProjectSubmission'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PublicHome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/admin/profile" element={<AdminProfile />} />
        <Route path="/admin/config" element={<HackathonConfig />} />
        <Route path="/admin/rankings" element={<RankingsConsole />} />
        <Route path="/admin/rubrics" element={<RubricConfig />} />
        <Route path="/admin/partners" element={<PartnerConfig />} />
        <Route path="/admin/experts/provision" element={<ExpertProvision />} />
        <Route path="/admin/experts/allocation" element={<PanelAllocation />} />
        <Route path="/admin/team/approval" element={<TeamRegistrationApproval />} />
        <Route path="/judge/workspace" element={<EvaluatorDashboard />} />
        <Route path="/judge/evaluate/:teamId" element={<EvaluationWorkspace />} />
        <Route path="/mentor/workspace" element={<MentorCategory />} />
        <Route path="/student/team/status" element={<TeamStatus />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/profile" element={<StudentProfile />} />
        <Route path="/student/workspace" element={<LeaderWorkspace />} />
        <Route path="/student/submission" element={<ProjectSubmission />} />
      </Routes>
      <Footer />
    </Router>
  )
}

export default App;