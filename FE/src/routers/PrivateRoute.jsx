import React from 'react';
import { Navigate, useLocation } from "react-router-dom";
import NavbarAdmin from '../components/NavbarAdmin';
import NavbarJudge from '../components/NavbarJudge';
import NavbarMentor from '../components/NavbarMentor';
import NavbarStudent from '../components/NavbarStudent';

export default function PrivateRoute({ Component }) {
    const token = localStorage.getItem("shms_token");
    const activeRole = localStorage.getItem("shms_role");
    const location = useLocation();
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    const path = location.pathname;
    let NavbarToRender = null;
    if (path.startsWith('/admin')) {
        if (activeRole !== 'ADMIN') return <Navigate to="/404" replace />;
        NavbarToRender = NavbarAdmin;
    } else if (path.startsWith('/judge')) {
        if (activeRole !== 'JUDGE') return <Navigate to="/404" replace />;
        NavbarToRender = NavbarJudge;
    } else if (path.startsWith('/mentor')) {
        if (activeRole !== 'MENTOR') return <Navigate to="/404" replace />;
        NavbarToRender = NavbarMentor;
    } else if (path.startsWith('/student')) {
        if (activeRole !== 'STUDENT' && activeRole !== 'LEADER') return <Navigate to="/404" replace />;
        NavbarToRender = NavbarStudent;
    }

    return (
        <>{NavbarToRender && <NavbarToRender />}
            <Component />
        </>
    );
}
