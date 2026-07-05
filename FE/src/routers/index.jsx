import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
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

function AppRouters() {
    const routers = createBrowserRouter([
        {
            path: "/",
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

                { path: "expert/profile", element: <PrivateRoute Component={ExpertProfile} /> },

                { path: "mentor/workspace", element: <PrivateRoute Component={MentorCategory} /> },

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