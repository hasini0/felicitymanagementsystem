import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiLogOut, FiUser, FiCalendar, FiUsers, FiHome, FiSettings } from 'react-icons/fi';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const getNavLinks = () => {
    if (user.role === 'participant') {
      return [
        { path: '/participant/dashboard', label: 'Dashboard', icon: FiHome },
        { path: '/participant/events', label: 'Browse Events', icon: FiCalendar },
        { path: '/participant/teams', label: 'My Teams', icon: FiUsers },
        { path: '/participant/clubs', label: 'Clubs/Organizers', icon: FiUsers },
        { path: '/participant/profile', label: 'Profile', icon: FiUser }
      ];
    } else if (user.role === 'organizer') {
      return [
        { path: '/organizer/dashboard', label: 'Dashboard', icon: FiHome },
        { path: '/organizer/create-event', label: 'Create Event', icon: FiCalendar },
        { path: '/organizer/ongoing-events', label: 'Ongoing Events', icon: FiCalendar },
        { path: '/organizer/profile', label: 'Profile', icon: FiUser }
      ];
    } else if (user.role === 'admin') {
      return [
        { path: '/admin/dashboard', label: 'Dashboard', icon: FiHome },
        { path: '/admin/organizers', label: 'Manage Clubs/Organizers', icon: FiUsers },
        { path: '/admin/password-resets', label: 'Password Reset Requests', icon: FiSettings }
      ];
    }
    return [];
  };

  const getProfilePath = () => {
    if (user.role === 'participant') return '/participant/profile';
    if (user.role === 'organizer') return '/organizer/profile';
    return '/admin/dashboard'; // Admin doesn't have profile page
  };

  const navLinks = getNavLinks();

  return (
    <>
      {/* Logo Box on Top Left */}
      <div className="fixed top-0 left-0 w-64 h-16 bg-gradient-to-b from-black via-dark-500 to-black flex items-center justify-center z-50">
        <h1 className="text-3xl font-black tracking-wider text-primary-500" style={{ 
          textShadow: '0 0 10px #dc2626, 0 0 20px #dc2626, 0 0 30px #dc2626',
          letterSpacing: '0.1em'
        }}>
          FELICITY
        </h1>
      </div>

      {/* Horizontal Line across entire top */}
      <div className="fixed top-16 left-0 right-0 h-0.5 bg-primary-600 z-45"></div>

      {/* Vertical Sidebar - Permanent */}
      <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-gradient-to-b from-black via-dark-500 to-black shadow-2xl z-40 flex flex-col">
        {/* Vertical border on the right */}
        <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-primary-600"></div>
        
        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive(link.path)
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-900/50'
                    : 'text-gray-400 hover:bg-dark-200 hover:text-primary-500 hover:border-l-4 hover:border-primary-600'
                }`}
              >
                <Icon className={`mr-3 text-xl ${
                  isActive(link.path) ? 'text-white' : 'text-primary-600'
                }`} />
                <span className="font-medium text-sm">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Button at bottom */}
        <div className="p-4 border-t border-primary-900">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-lg hover:from-primary-700 hover:to-primary-900 transition-all duration-200 shadow-lg hover:shadow-primary-900/50"
          >
            <FiLogOut className="mr-2" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Top Bar for Profile */}
      <div className="fixed top-0 left-64 right-0 h-16 bg-gradient-to-r from-black via-dark-500 to-black shadow-xl z-30">
        <div className="h-full flex items-center justify-end px-6">
          <Link
            to={getProfilePath()}
            className="flex items-center space-x-3 bg-dark-100 px-4 py-2 rounded-lg border border-primary-900 hover:bg-dark-200 hover:border-primary-700 transition-all cursor-pointer"
          >
            <FiUser className="text-primary-500" />
            <span className="text-sm font-medium text-gray-300">
              {user.firstName || user.organizerName || 'Admin'}
            </span>
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
          </Link>
        </div>
      </div>
    </>
  );
};

export default Navbar;
