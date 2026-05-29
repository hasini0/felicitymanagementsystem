import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/dashboard');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="ml-64 pt-16 flex justify-center items-center h-screen bg-black">
          <div className="text-xl text-primary-500 animate-pulse">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="ml-64 pt-16 min-h-screen bg-gradient-to-br from-black via-dark-500 to-black">
        <div className="max-w-7xl mx-auto p-8">
          <h1 className="text-4xl font-bold text-primary-500 mb-8">Admin Dashboard</h1>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-dark-100 to-black border border-primary-900 rounded-lg shadow-xl p-6 hover:shadow-primary-900/50 transition-all">
              <h3 className="text-sm font-medium text-gray-400">Total Participants</h3>
              <p className="text-3xl font-bold text-primary-500">{stats.totalParticipants}</p>
            </div>
            <div className="bg-gradient-to-br from-dark-100 to-black border border-primary-900 rounded-lg shadow-xl p-6 hover:shadow-primary-900/50 transition-all">
              <h3 className="text-sm font-medium text-gray-400">Total Organizers</h3>
              <p className="text-3xl font-bold text-primary-400">{stats.totalOrganizers}</p>
            </div>
            <div className="bg-gradient-to-br from-dark-100 to-black border border-primary-900 rounded-lg shadow-xl p-6 hover:shadow-primary-900/50 transition-all">
              <h3 className="text-sm font-medium text-gray-400">Total Events</h3>
              <p className="text-3xl font-bold text-primary-600">{stats.totalEvents}</p>
            </div>
            <div className="bg-gradient-to-br from-dark-100 to-black border border-primary-900 rounded-lg shadow-xl p-6 hover:shadow-primary-900/50 transition-all">
              <h3 className="text-sm font-medium text-gray-400">Pending Password Resets</h3>
              <p className="text-3xl font-bold text-primary-700">{stats.pendingResetRequests}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
