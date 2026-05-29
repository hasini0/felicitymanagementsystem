import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import Navbar from '../../components/Navbar';
import { FaKey, FaHistory, FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const PasswordResetRequest = () => {
  const navigate = useNavigate();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reason, setReason] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await axios.get('/api/organizer/password-reset-requests', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRequests(response.data.data || []);
    } catch (error) {
      console.error('Fetch requests error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/organizer/request-password-reset', { reason }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Password reset request submitted successfully!');
      setShowRequestForm(false);
      setReason('');
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit request');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING': return <FaClock className="text-yellow-400" />;
      case 'APPROVED': return <FaCheckCircle className="text-green-400" />;
      case 'REJECTED': return <FaTimesCircle className="text-red-400" />;
      default: return null;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-900 text-yellow-300';
      case 'APPROVED': return 'bg-green-900 text-green-300';
      case 'REJECTED': return 'bg-red-900 text-red-300';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="ml-64 pt-16 flex justify-center items-center h-screen bg-black">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="ml-64 pt-16 min-h-screen bg-gradient-to-br from-black via-dark-500 to-black">
        <div className="max-w-4xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/organizer/dashboard')}
                className="flex items-center gap-1 text-primary-400 hover:text-primary-300 transition-colors text-sm"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-3xl font-bold text-primary-500 flex items-center gap-3">
                  <FaKey /> Password Reset Requests
                </h1>
                <p className="text-gray-400 text-sm mt-1">Request a password reset — requires admin approval</p>
              </div>
            </div>
            {!showRequestForm && (
              <button
                onClick={() => setShowRequestForm(true)}
                className="px-5 py-2 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-lg hover:from-primary-700 hover:to-primary-900 transition-all shadow-lg"
              >
                New Request
              </button>
            )}
          </div>

          {/* Request Form */}
          {showRequestForm && (
            <div className="dark-card p-6 mb-6 border border-primary-800">
              <h2 className="text-xl font-bold text-primary-400 mb-4">Submit Password Reset Request</h2>
              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">
                    Reason for Password Reset <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    maxLength={500}
                    rows={4}
                    className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Please provide a detailed reason for requesting a password reset..."
                  />
                  <p className="text-xs text-gray-500 mt-1">{reason.length}/500 characters</p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-lg hover:from-primary-700 hover:to-primary-900 transition-all"
                  >
                    Submit Request
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowRequestForm(false); setReason(''); }}
                    className="px-5 py-2 bg-dark-200 border border-primary-900 text-gray-300 rounded-lg hover:bg-dark-100 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Request History */}
          <div className="dark-card p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FaHistory className="text-primary-400" />
              Request History
            </h2>
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <FaKey className="mx-auto text-gray-600 text-5xl mb-4" />
                <p className="text-gray-400">No password reset requests yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div key={request.id} className="bg-dark-200 border border-primary-900 rounded-lg p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(request.status)}
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Submitted: {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-gray-400 mb-1">Your Reason:</h3>
                      <p className="text-gray-200 text-sm bg-dark-50 border border-primary-900 p-3 rounded">{request.reason}</p>
                    </div>

                    {request.adminComments && (
                      <div className="mb-3">
                        <h3 className="text-sm font-semibold text-gray-400 mb-1">Admin Response:</h3>
                        <p className="text-gray-200 text-sm bg-dark-50 p-3 rounded border-l-4 border-primary-600">
                          {request.adminComments}
                        </p>
                      </div>
                    )}

                    {request.processedAt && (
                      <div className="text-xs text-gray-500">
                        <p>Processed: {new Date(request.processedAt).toLocaleString()}</p>
                        {request.processedBy && <p>By: {request.processedBy}</p>}
                      </div>
                    )}

                    {request.status === 'APPROVED' && (
                      <div className="mt-3 p-3 bg-green-900/20 border border-green-700 rounded-lg">
                        <p className="text-sm text-green-300">
                          ✅ Your password has been reset. Check your email for the new password.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
};

export default PasswordResetRequest;
