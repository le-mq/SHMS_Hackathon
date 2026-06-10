import { Routes, Route, Navigate } from "react-router-dom";
import VerifyEmail from "./components/VerifyEmail";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to="/verify-email"
            replace
            state={{
              username: "testuser",
              canResendImmediately: true,
            }}
          />
        }
      />

      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/register" element={<h1>Register Page</h1>} />
      <Route path="/login" element={<h1>Login Page</h1>} />
    </Routes>
  );
}

export default App;