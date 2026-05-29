import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const ManageOrganizers = () => {
  const navigate = useNavigate();
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    organizerName: '',
    email: '',
    category: 'CLUB',
    description: '',
    contactEmail: ''
  });

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const fetchOrganizers = async () => {
    try {
      const response = await api.get('/admin/organizers');
      if (response.data.success) {
        setOrganizers(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to load organizers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/admin/organizers', formData);
      if (response.data.success) {
        toast.success(`Organizer created! Login: ${response.data.data.email} / ${response.data.data.temporaryPassword}`);
        setShowCreateForm(false);
        setFormData({
          organizerName: '',
          email: '',
          category: 'CLUB',
          description: '',
          contactEmail: ''
        });
        fetchOrganizers();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create organizer');
    }
  };

  const handleDisable = async (id) => {
    if (!window.confirm('Are you sure you want to disable this organizer?')) return;

    try {
      await api.delete(`/admin/organizers/${id}`);
      toast.success('Organizer disabled successfully');
      fetchOrganizers();
    } catch (error) {
      toast.error('Failed to disable organizer');
    }
  };

  const handleRestore = async (id) => {
    try {
      await api.put(`/admin/organizers/${id}/restore`);
      toast.success('Organizer restored successfully');
      fetchOrganizers();
    } catch (error) {
      toast.error('Failed to restore organizer');
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
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="flex items-center gap-1 text-primary-400 hover:text-primary-300 transition-colors text-sm"
            >
              ← Back
            </button>
            <h1 className="text-4xl font-bold text-primary-500">Manage Clubs/Organizers</h1>
          </div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-md hover:from-primary-700 hover:to-primary-900 transition-all shadow-lg hover:shadow-primary-900/50"
            >
              {showCreateForm ? 'Cancel' : 'Add New Organizer'}
            </button>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <div className="dark-card p-8 mb-8 border border-primary-900/30">
              <h2 className="text-2xl font-semibold text-primary-400 mb-6">Create New Organizer</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Organizer Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.organizerName}
                      onChange={(e) => setFormData({ ...formData, organizerName: e.target.value })}
                      className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Email (Login) *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Category *</label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="CLUB" className="bg-dark-100">Club</option>
                      <option value="COUNCIL" className="bg-dark-100">Council</option>
                      <option value="FEST_TEAM" className="bg-dark-100">Fest Team</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Contact Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Description *</label>
                    <textarea
                      required
                      rows="3"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-md hover:from-primary-700 hover:to-primary-900 transition-all shadow-lg hover:shadow-primary-900/50"
                >
                  Create Organizer
                </button>
              </form>
            </div>
          )}

          {/* Organizers List */}
          <div className="dark-card shadow-lg shadow-primary-900/20 overflow-hidden">
            <table className="min-w-full divide-y divide-primary-900">
              <thead className="bg-dark-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gradient-to-br from-dark-100 to-black divide-y divide-primary-900">
                {organizers.map((org) => (
                  <tr key={org._id} className="hover:bg-dark-200 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-400">
                      {org.organizerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{org.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {org.category.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{org.contactEmail}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${org.isApproved
                          ? 'bg-primary-900 text-primary-300 border border-primary-700'
                          : 'bg-dark-200 text-gray-400 border border-primary-900'
                        }`}>
                        {org.isApproved ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {org.isApproved ? (
                        <button
                          onClick={() => handleDisable(org._id)}
                          className="text-primary-500 hover:text-primary-400 font-medium transition-colors"
                        >
                          Disable
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestore(org._id)}
                          className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
                        >
                          Restore
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default ManageOrganizers;
