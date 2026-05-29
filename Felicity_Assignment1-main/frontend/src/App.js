import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

// Auth Pages
import Login from './pages/auth/Login';
import RegisterParticipant from './pages/auth/RegisterParticipant';

// Participant Pages
import ParticipantDashboard from './pages/participant/Dashboard';
import BrowseEvents from './pages/participant/BrowseEvents';
import EventDetails from './pages/participant/EventDetails';
import ClubsOrganizers from './pages/participant/ClubsOrganizers';
import OrganizerDetails from './pages/participant/OrganizerDetails';
import ParticipantProfile from './pages/participant/Profile';
import TeamManagement from './pages/participant/TeamManagement';
import TeamChat from './pages/participant/TeamChat';

// Organizer Pages
import OrganizerDashboard from './pages/organizer/Dashboard';
import CreateEvent from './pages/organizer/CreateEvent';
import EditEvent from './pages/organizer/EditEvent';
import EventManagement from './pages/organizer/EventManagement';
import OrganizerProfile from './pages/organizer/Profile';
import OngoingEvents from './pages/organizer/OngoingEvents';
import QRScanner from './pages/organizer/QRScanner';
import PasswordResetRequest from './pages/organizer/PasswordResetRequest';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import ManageOrganizers from './pages/admin/ManageOrganizers';
import PasswordResets from './pages/admin/PasswordResets';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterParticipant />} />

          {/* Participant Routes */}
          <Route
            path="/participant/dashboard"
            element={
              <PrivateRoute role="participant">
                <ParticipantDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/participant/events"
            element={
              <PrivateRoute role="participant">
                <BrowseEvents />
              </PrivateRoute>
            }
          />
          <Route
            path="/participant/events/:id"
            element={
              <PrivateRoute role="participant">
                <EventDetails />
              </PrivateRoute>
            }
          />
          <Route
            path="/participant/clubs"
            element={
              <PrivateRoute role="participant">
                <ClubsOrganizers />
              </PrivateRoute>
            }
          />
          <Route
            path="/participant/organizers/:id"
            element={
              <PrivateRoute role="participant">
                <OrganizerDetails />
              </PrivateRoute>
            }
          />
          <Route
            path="/participant/profile"
            element={
              <PrivateRoute role="participant">
                <ParticipantProfile />
              </PrivateRoute>
            }
          />
          <Route
            path="/participant/teams"
            element={
              <PrivateRoute role="participant">
                <TeamManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/participant/teams/:teamId/chat"
            element={
              <PrivateRoute role="participant">
                <TeamChat />
              </PrivateRoute>
            }
          />

          {/* Organizer Routes */}
          <Route
            path="/organizer/dashboard"
            element={
              <PrivateRoute role="organizer">
                <OrganizerDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/organizer/create-event"
            element={
              <PrivateRoute role="organizer">
                <CreateEvent />
              </PrivateRoute>
            }
          />
          <Route
            path="/organizer/events/:id/edit"
            element={
              <PrivateRoute role="organizer">
                <EditEvent />
              </PrivateRoute>
            }
          />
          <Route
            path="/organizer/events/:id"
            element={
              <PrivateRoute role="organizer">
                <EventManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/organizer/events/:eventId/scanner"
            element={
              <PrivateRoute role="organizer">
                <QRScanner />
              </PrivateRoute>
            }
          />
          <Route
            path="/organizer/password-reset"
            element={
              <PrivateRoute role="organizer">
                <PasswordResetRequest />
              </PrivateRoute>
            }
          />
          <Route
            path="/organizer/ongoing-events"
            element={
              <PrivateRoute role="organizer">
                <OngoingEvents />
              </PrivateRoute>
            }
          />
          <Route
            path="/organizer/profile"
            element={
              <PrivateRoute role="organizer">
                <OrganizerProfile />
              </PrivateRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <PrivateRoute role="admin">
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/organizers"
            element={
              <PrivateRoute role="admin">
                <ManageOrganizers />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/password-resets"
            element={
              <PrivateRoute role="admin">
                <PasswordResets />
              </PrivateRoute>
            }
          />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
