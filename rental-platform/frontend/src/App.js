import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import TenantDashboard from './pages/TenantDashboard';
import LandlordDashboard from './pages/LandlordDashboard';
import PropertyDetails from './pages/PropertyDetails';
import AddProperty from './pages/AddProperty';
import EditProperty from './pages/EditProperty';
import MyProperties from './pages/MyProperties';
import SavedProperties from './pages/SavedProperties';
import Inquiries from './pages/Inquiries';
import InquiryDetails from './pages/InquiryDetails';
import Profile from './pages/Profile';

// Components
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <Navbar />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected routes */}
        <Route path="/dashboard" element={
          <PrivateRoute>
            {user?.role === 'tenant' ? <TenantDashboard /> : <LandlordDashboard />}
          </PrivateRoute>
        } />
        
        <Route path="/properties/:id" element={<PrivateRoute><PropertyDetails /></PrivateRoute>} />
        
        {/* Tenant routes */}
        <Route path="/saved-properties" element={
          <PrivateRoute allowedRoles={['tenant']}>
            <SavedProperties />
          </PrivateRoute>
        } />
        
        {/* Landlord routes */}
        <Route path="/my-properties" element={
          <PrivateRoute allowedRoles={['landlord']}>
            <MyProperties />
          </PrivateRoute>
        } />
        <Route path="/add-property" element={
          <PrivateRoute allowedRoles={['landlord']}>
            <AddProperty />
          </PrivateRoute>
        } />
        <Route path="/edit-property/:id" element={
          <PrivateRoute allowedRoles={['landlord']}>
            <EditProperty />
          </PrivateRoute>
        } />
        
        {/* Common routes */}
        <Route path="/inquiries" element={<PrivateRoute><Inquiries /></PrivateRoute>} />
        <Route path="/inquiries/:id" element={<PrivateRoute><InquiryDetails /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default App;