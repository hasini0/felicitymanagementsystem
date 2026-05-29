import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const PasswordResets = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminComments, setAdminComments] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING');

  const fetchRequests = async () => {
    try {
      const response = await api.get('/admin/password-reset-requests', {
        params: { status: statusFilter }
      });
      if (response.data.success) {
        setRequests(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to load password reset requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleApprove = async (request) => {
    setSelectedRequest(request);
    setShowApproveModal(true);
  };

  const confirmApprove = async () => {
    try {
      const response = await api.put(`/admin/password-reset-requests/${selectedRequest._id}/approve`, {
        comments: adminComments
      });
      if (response.data.success) {
        setNewPassword(response.data.newPassword);
        setResetEmail(selectedRequest.email);
        setShowApproveModal(false);
        setShowPasswordModal(true);
        setAdminComments('');
        fetchRequests();
        toast.success('Request approved successfully');
      }
    } catch (error) {
      toast.error('Failed to approve request');
    }
  };

  const handleReject = async (request) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    try {
      await api.put(`/admin/password-reset-requests/${selectedRequest._id}/reject`, {
        comments: adminComments
      });
      toast.success('Request rejected');
      setShowRejectModal(false);
      setAdminComments('');
      fetchRequests();
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(newPassword);
    toast.success('Password copied to clipboard!');
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
            <h1 className="text-4xl font-bold text-primary-500">Password Reset Requests</h1>
          </div>

          {/* Filter Tabs */}
          <div className="mb-6 flex space-x-4">
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${statusFilter === 'PENDING'
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-200 text-gray-400 hover:bg-dark-100'
                }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${statusFilter === 'APPROVED'
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-200 text-gray-400 hover:bg-dark-100'
                }`}
            >
              Approved
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${statusFilter === 'REJECTED'
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-200 text-gray-400 hover:bg-dark-100'
                }`}
            >
              Rejected
            </button>
            <button
              onClick={() => setStatusFilter('')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${statusFilter === ''
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-200 text-gray-400 hover:bg-dark-100'
                }`}
            >
              All
            </button>
          </div>

          {requests.length === 0 ? (
            <div className="bg-gradient-to-br from-dark-100 to-black border border-primary-900 rounded-lg shadow-xl p-8 text-center text-gray-400">
              No {statusFilter.toLowerCase()} password reset requests
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request._id} className="bg-gradient-to-br from-dark-100 to-black border border-primary-900 rounded-lg shadow-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-primary-500">
                        {request.user?.firstName
                          ? `${request.user.firstName} ${request.user.lastName}`
                          : request.user?.organizerName || 'N/A'}
                      </h3>
                      <p className="text-gray-400">{request.email}</p>
                      {request.clubName && (
                        <p className="text-sm text-gray-500">Club: {request.clubName}</p>
                      )}
                      <p className="text-sm text-gray-500">Type: {request.userModel}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${request.status === 'PENDING' ? 'bg-yellow-900 text-yellow-300' :
                          request.status === 'APPROVED' ? 'bg-green-900 text-green-300' :
                            'bg-red-900 text-red-300'
                        }`}>
                        {request.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-2">
                        {format(new Date(request.createdAt), 'PPpp')}
                      </p>
                    </div>
                  </div>

                  {request.reason && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-primary-400 mb-1">Reason:</h4>
                      <p className="text-gray-300 bg-dark-200 p-3 rounded">{request.reason}</p>
                    </div>
                  )}

                  {request.adminComments && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-primary-400 mb-1">Admin Response:</h4>
                      <p className="text-gray-300 bg-dark-200 p-3 rounded border-l-4 border-primary-600">
                        {request.adminComments}
                      </p>
                    </div>
                  )}

                  {request.processedAt && (
                    <div className="text-sm text-gray-500 mb-4">
                      Processed: {format(new Date(request.processedAt), 'PPpp')}
                      {request.processedBy && ` by ${request.processedBy.username}`}
                    </div>
                  )}

                  {request.status === 'PENDING' && (
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleApprove(request)}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-lg hover:from-primary-700 hover:to-primary-900 transition-all"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(request)}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg hover:from-red-700 hover:to-red-900 transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-dark-100 to-black border-2 border-primary-600 rounded-lg shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-primary-500 mb-4">Approve Password Reset</h2>
            <p className="text-gray-300 mb-4">
              Approve request from <span className="text-primary-400 font-semibold">{selectedRequest?.email}</span>?
            </p>
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">Comments (Optional)</label>
              <textarea
                value={adminComments}
                onChange={(e) => setAdminComments(e.target.value)}
                className="w-full px-3 py-2 bg-dark-200 border border-primary-900 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows="3"
                placeholder="Add approval comments..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={confirmApprove}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-lg hover:from-primary-700 hover:to-primary-900 transition-all"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setAdminComments('');
                }}
                className="flex-1 px-4 py-2 bg-dark-200 text-gray-300 rounded-lg hover:bg-dark-100 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-dark-100 to-black border-2 border-red-600 rounded-lg shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Reject Password Reset</h2>
            <p className="text-gray-300 mb-4">
              Reject request from <span className="text-red-400 font-semibold">{selectedRequest?.email}</span>?
            </p>
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">Reason for Rejection</label>
              <textarea
                value={adminComments}
                onChange={(e) => setAdminComments(e.target.value)}
                className="w-full px-3 py-2 bg-dark-200 border border-red-900 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                rows="3"
                placeholder="Provide reason for rejection..."
                required
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={confirmReject}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg hover:from-red-700 hover:to-red-900 transition-all"
              >
                Confirm Rejection
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setAdminComments('');
                }}
                className="flex-1 px-4 py-2 bg-dark-200 text-gray-300 rounded-lg hover:bg-dark-100 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-dark-100 to-black border-2 border-primary-600 rounded-lg shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-primary-500 mb-4" style={{ textShadow: '0 0 5px #dc2626' }}>Password Reset Approved</h2>
            <div className="mb-6">
              <p className="text-sm text-gray-300 mb-4">
                The password for <span className="font-semibold text-primary-400">{resetEmail}</span> has been reset.
              </p>
              <div className="bg-gradient-to-br from-primary-900 to-black border-2 border-primary-500 rounded-lg p-4 mb-4">
                <p className="text-xs text-primary-300 font-semibold mb-2">TEMPORARY PASSWORD:</p>
                <div className="flex items-center justify-between bg-dark-50 p-3 rounded border border-primary-700">
                  <code className="text-lg font-mono font-bold text-primary-400">{newPassword}</code>
                  <button
                    onClick={copyToClipboard}
                    className="ml-3 px-3 py-1 bg-gradient-to-r from-primary-600 to-primary-800 text-white text-xs rounded hover:from-primary-700 hover:to-primary-900 transition-all"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="bg-dark-200 border border-primary-800 rounded-lg p-3">
                <p className="text-xs text-gray-300">
                  <strong className="text-primary-500">Important:</strong> Make sure to save this password. It won't be shown again!
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowPasswordModal(false);
                setNewPassword('');
                setResetEmail('');
              }}
              className="w-full px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-lg hover:from-primary-700 hover:to-primary-900 font-medium shadow-lg hover:shadow-primary-900/50 transition-all"
            >
              I've Saved the Password
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PasswordResets;
