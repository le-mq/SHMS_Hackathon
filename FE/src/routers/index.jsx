import { createBrowserRouter, Navigate, RouterProvider, Outlet, useLocation, useNavigate } from "react-router-dom";
import PublicHome from "../components/PublicHome.jsx";
import Login from "../components/Login.jsx";
import Register from "../components/Register.jsx";
import VerifyEmail from "../components/VerifyEmail.jsx";
import Leaderboard from "../components/LeaderboardDashboard.jsx";
import AdminProfile from "../components/AdminProfile.jsx";
import HackathonConfig from "../components/HackathonConfig.jsx";
import RankingsConsole from "../components/RankingsConsole.jsx";
import RubricConfig from "../components/RubricConfig.jsx";
import PartnerVerification from "../components/PartnerVerification.jsx";
import ExpertProvision from "../components/ExpertProvision.jsx";
import PanelAllocation from "../components/PanelAllocation.jsx";
import TeamRegistrationApproval from "../components/TeamRegistrationApproval.jsx";
import PublicationDataExport from "../components/PublicationDataExport.jsx";
import EvaluatorDashboard from "../components/EvaluatorDashboard.jsx";
import EvaluationWorkspace from "../components/EvaluationWorkspace.jsx";
import HistoricalLog from "../components/HistoricalLog.jsx";
import ExpertProfile from "../components/ExpertProfile.jsx";
import MentorCategory from "../components/MentorCategory.jsx";
import TeamStatus from "../components/TeamStatus.jsx";
import StandingsFeedback from "../components/StandingsFeedback.jsx";
import StudentDashboard from "../components/StudentDashboard.jsx";
import StudentProfile from "../components/StudentProfile.jsx";
import ProjectSubmission from "../components/ProjectSubmission.jsx";
import EnforcementAuditLogs from "../components/EnforcementAuditLogs.jsx";
import NotFound from "../components/NotFound.jsx";
import PrivateRoute from "./PrivateRoute.jsx";
import CompetitionRegistration from "../components/CompetitionRegistration.jsx";
import JudgeResultReview from "../components/JudgeResultReview.jsx";
import MentorResultReview from "../components/MentorResultReview.jsx";

function DemoExitWidget() {
    const location = useLocation();
    const navigate = useNavigate();
    const mockUsers = ['student', 'judge', 'mentor', 'admin'];
    const currentUser = localStorage.getItem('shms_user');

    if (!mockUsers.includes(currentUser) || location.pathname === '/' || location.pathname === '/login') {
        return null;
    }

    const handleExit = () => {
        localStorage.clear();
        navigate('/');
    };

    return (
        <button
            onClick={handleExit}
            style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 9999,
                background: 'var(--shms-navy, #1e293b)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
        >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Exit Demo
        </button>
    );
}

function GlobalLayout() {
    return (
        <>
            <Outlet />
            <DemoExitWidget />
        </>
    );
}

function AppRouters() {
    const routers = createBrowserRouter([
        {
            path: "/",
            element: <GlobalLayout />,
            children: [
                { index: true, Component: PublicHome },
                { path: "login", Component: Login },
                { path: "register", Component: Register },
                { path: "verify-email", Component: VerifyEmail },
                { path: "leaderboard", Component: Leaderboard },

                { path: "admin/profile", element: <PrivateRoute Component={AdminProfile} /> },
                { path: "admin/config", element: <PrivateRoute Component={HackathonConfig} /> },
                { path: "admin/rankings", element: <PrivateRoute Component={RankingsConsole} /> },
                { path: "admin/rubrics", element: <PrivateRoute Component={RubricConfig} /> },
                { path: "admin/partners", element: <PrivateRoute Component={PartnerVerification} /> },
                { path: "admin/experts/provision", element: <PrivateRoute Component={ExpertProvision} /> },
                { path: "admin/experts/allocation", element: <PrivateRoute Component={PanelAllocation} /> },
                { path: "admin/team/approval", element: <PrivateRoute Component={TeamRegistrationApproval} /> },
                { path: "admin/publication", element: <PrivateRoute Component={PublicationDataExport} /> },
                { path: "admin/audit-logs", element: <PrivateRoute Component={EnforcementAuditLogs} /> },

                { path: "judge/workspace", element: <PrivateRoute Component={EvaluatorDashboard} /> },
                { path: "judge/evaluate/:teamId", element: <PrivateRoute Component={EvaluationWorkspace} /> },
                { path: "judge/history", element: <PrivateRoute Component={HistoricalLog} /> },
                { path: "judge/result-review", element: <PrivateRoute Component={JudgeResultReview} /> },

                { path: "expert/profile", element: <PrivateRoute Component={ExpertProfile} /> },

                { path: "mentor/workspace", element: <PrivateRoute Component={MentorCategory} /> },
                { path: "mentor/result-review", element: <PrivateRoute Component={MentorResultReview} /> },

                { path: "student/team/status", element: <PrivateRoute Component={TeamStatus} /> },
                { path: "student/results", element: <PrivateRoute Component={StandingsFeedback} /> },
                { path: "student/dashboard", element: <PrivateRoute Component={StudentDashboard} /> },
                { path: "student/profile", element: <PrivateRoute Component={StudentProfile} /> },
                { path: "student/submission", element: <PrivateRoute Component={ProjectSubmission} /> },
                { path: "student/competitions", element: <PrivateRoute Component={CompetitionRegistration} /> }
            ]
        },
        { path: "404", Component: NotFound },
        { path: "*", element: <Navigate to="/404" /> }
    ]);

    return <RouterProvider router={routers} />;
}

export default AppRouters;