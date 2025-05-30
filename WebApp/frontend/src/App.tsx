import './App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DeviceList from "./pages/DeviceList"; // ✅ nou import
import Register from './pages/Register';
import Gallery from './pages/Gallery';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/devices" element={<DeviceList />} /> {/* ✅ nouă rută */}
        <Route path="/register" element={<Register />} />
        <Route path="/gallery" element={<Gallery />} />
      </Routes>
    </Router>
  );
}

export default App;
