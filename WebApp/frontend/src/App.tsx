import './App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DeviceList from "./pages/DeviceList"; // ✅ nou import

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/devices" element={<DeviceList />} /> {/* ✅ nouă rută */}
      </Routes>
    </Router>
  );
}

export default App;
