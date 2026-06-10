import { Routes, Route } from 'react-router-dom';
import VerifyEmail from './components/VerifyEmail'

function App() {
  return (
      <Routes>
      <Route path="/verify-email" element={<VerifyEmail />} />
      </Routes>
  );
}

export default App;