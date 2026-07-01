import React from 'react';
import { Navigate } from "react-router-dom";

export default function PrivateRoute({ Component }) {
    const token = localStorage.getItem("token");
    const isLogin = !!token;
    if (!isLogin) {
        return <Navigate to="/login" replace />;
    }
    return <Component />;
}
