import React from 'react';
// Main App Component
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import POS from './pages/POS';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import RideManagement from './pages/RideManagement';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailure from './pages/PaymentFailure';

// Setup Global Axios Interceptors IMMEDIATELY before component mounts
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      config.headers['x-auth-token'] = token;
    }
    // Bypass ngrok browser warning using Query Parameter globally
    config.params = {
      ...config.params,
      'ngrok-skip-browser-warning': '1'
    };
    return config;
  },
  (error) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (!window.location.hash.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.hash = '/login';
      }
    }
    return Promise.reject(error);
  }
);

function PrivateRoute({ children, role }: { children: React.ReactNode, role?: string }) {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/pos" replace />;
  }

  // Special Case: Block Admin and Verify from POS
  if (!role && window.location.hash.includes('/pos')) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/pos"
          element={
            <PrivateRoute>
              <POS />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <PrivateRoute role="admin">
              <AdminDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/rides"
          element={
            <PrivateRoute role="admin">
              <RideManagement />
            </PrivateRoute>
          }
        />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failure" element={<PaymentFailure />} />
        <Route path="/" element={
          localStorage.getItem('token')
            ? (() => {
              const user = JSON.parse(localStorage.getItem('user') || '{}');
              if (user.role === 'admin') return <Navigate to="/admin" replace />;
              if (user.role === 'admin') return <Navigate to="/admin" replace />;
              return <Navigate to="/pos" replace />;
            })()
            : <Navigate to="/login" replace />
        } />
      </Routes>
    </Router>
  );
}

export default App;
