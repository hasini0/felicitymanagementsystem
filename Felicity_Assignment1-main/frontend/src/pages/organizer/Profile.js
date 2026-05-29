import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FaKey, FaHistory, FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const OrganizerProfile = () => {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);

  // Password reset state
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [resetRequests, setResetRequests] = useState([]);
  const [resetsLoading, setResetsLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
    fetchResetRequests();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/organizer/profile');
      if (response.data.success) {
        setProfile(response.data.data);
        setFormData({
          organizerName: response.data.data.organizerName,
          description: response.data.data.description,
          contactEmail: response.data.data.contactEmail,
          category: response.data.data.category || 'OTHER',
          discordWebhook: response.data.data.discordWebhook || ''
        });
      }
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchResetRequests = async () => {
    try {
      const response = await api.get('/organizer/password-reset-requests');
      setResetRequests(response.data.data || []);
    } catch (error) {
      console.error('Failed to load reset requests');
    } finally {
      setResetsLoading(false);
    }
  };

  const handleSubmitReset = async (e) => {
    e.preventDefault();
    try {
      await api.post('/organizer/request-password-reset', { reason: resetReason });
      toast.success('Password reset request submitted!');
      setShowResetForm(false);
      setResetReason('');
      fetchResetRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit request');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING': return <span className="flex items-center gap-1 px-2 py-1 bg-yellow-900 text-yellow-300 border border-yellow-700 rounded-full text-xs"><FaClock className="text-xs" />PENDING</span>;
      case 'APPROVED': return <span className="flex items-center gap-1 px-2 py-1 bg-green-900 text-green-300 border border-green-700 rounded-full text-xs"><FaCheckCircle className="text-xs" />APPROVED</span>;
      case 'REJECTED': return <span className="flex items-center gap-1 px-2 py-1 bg-red-900 text-red-300 border border-red-700 rounded-full text-xs"><FaTimesCircle className="text-xs" />REJECTED</span>;
      default: return null;
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put('/organizer/profile', formData);
      if (response.data.success) {
        toast.success('Profile updated successfully');
        setProfile(response.data.data);
        setEditing(false);
      }
    } catch (error) {
      toast.error('Failed to update profile');
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
        <div className="max-w-5xl mx-auto p-8">
          <h1 className="text-4xl font-bold text-primary-500 mb-8">Organizer Profile</h1>

          <div className="dark-card p-8 border border-primary-900/30">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-primary-400">Profile Information</h2>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-md hover:from-primary-700 hover:to-primary-900 transition-all shadow-lg hover:shadow-primary-900/50"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Organizer Name</label>
                  <input
                    type="text"
                    value={formData.organizerName}
                    onChange={(e) => setFormData({ ...formData, organizerName: e.target.value })}
                    className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <textarea
                    rows="4"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                  <select
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="TECHNICAL" className="bg-dark-100">Technical</option>
                    <option value="CULTURAL" className="bg-dark-100">Cultural</option>
                    <option value="SPORTS" className="bg-dark-100">Sports</option>
                    <option value="ACADEMIC" className="bg-dark-100">Academic</option>
                    <option value="SOCIAL" className="bg-dark-100">Social</option>
                    <option value="OTHER" className="bg-dark-100">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Discord Webhook (Auto-post new events)</label>
                  <input
                    type="url"
                    value={formData.discordWebhook}
                    onChange={(e) => setFormData({ ...formData, discordWebhook: e.target.value })}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-md hover:from-primary-700 hover:to-primary-900 transition-all shadow-lg hover:shadow-primary-900/50"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-6 py-2 border border-primary-700 text-gray-300 rounded-md hover:bg-dark-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-gray-400 mb-1">Organizer Name</p>
                    <p className="text-gray-200 text-lg">{profile.organizerName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400 mb-1">Email</p>
                    <p className="text-gray-200 text-lg">{profile.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400 mb-1">Category</p>
                    <p className="text-gray-200 text-lg">{profile.category.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400 mb-1">Contact Email</p>
                    <p className="text-gray-200 text-lg">{profile.contactEmail}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400 mb-1">Description</p>
                  <p className="text-gray-200">{profile.description}</p>
                </div>
                {profile.discordWebhook && (
                  <div>
                    <p className="text-sm font-medium text-gray-400 mb-1">Discord Webhook</p>
                    <p className="text-gray-200 text-sm truncate">{profile.discordWebhook}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Password Reset Section */}
          <div className="dark-card p-8 border border-primary-900/30 mt-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-primary-400 flex items-center gap-2">
                <FaKey className="text-primary-500" /> Password Reset
              </h2>
              {!showResetForm && (
                <button
                  onClick={() => setShowResetForm(true)}
                  className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-md hover:from-primary-700 hover:to-primary-900 transition-all text-sm"
                >
                  Request Reset
                </button>
              )}
            </div>

            {showResetForm && (
              <form onSubmit={handleSubmitReset} className="mb-6 p-4 bg-dark-100 border border-primary-900 rounded-lg">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reason for password reset <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  required
                  maxLength={500}
                  rows={3}
                  className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 mb-1"
                  placeholder="Describe why you need a password reset..."
                />
                <p className="text-xs text-gray-500 mb-3">{resetReason.length}/500</p>
                <div className="flex gap-3">
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-md hover:from-primary-700 hover:to-primary-900 transition-all text-sm">
                    Submit
                  </button>
                  <button type="button" onClick={() => { setShowResetForm(false); setResetReason(''); }} className="px-4 py-2 border border-primary-700 text-gray-300 rounded-md hover:bg-dark-200 transition-all text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Request History */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                <FaHistory /> Request History
              </h3>
              {resetsLoading ? (
                <p className="text-gray-500 text-sm">Loading...</p>
              ) : resetRequests.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">No password reset requests yet</p>
              ) : (
                <div className="space-y-3">
                  {resetRequests.map((req) => (
                    <div key={req.id} className="p-4 bg-dark-100 border border-primary-900 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        {getStatusBadge(req.status)}
                        <span className="text-xs text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-gray-300 mb-2"><span className="text-gray-500">Reason: </span>{req.reason}</p>
                      {req.adminComments && (
                        <p className="text-sm text-primary-300 bg-primary-900/20 border-l-2 border-primary-600 pl-3 py-1 rounded"><span className="text-gray-500">Admin: </span>{req.adminComments}</p>
                      )}
                      {req.status === 'APPROVED' && (
                        <p className="text-xs text-green-400 mt-2">✅ Password reset — check your email for the new password.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default OrganizerProfile;
