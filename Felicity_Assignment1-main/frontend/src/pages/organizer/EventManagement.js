import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const statusColors = {
  DRAFT: 'bg-dark-200 text-gray-400 border-primary-900',
  PUBLISHED: 'bg-primary-900 text-primary-300 border-primary-700',
  ONGOING: 'bg-green-900/30 text-green-300 border-green-700',
  COMPLETED: 'bg-blue-900/30 text-blue-300 border-blue-700',
  CLOSED: 'bg-red-900/20 text-red-400 border-red-800',
};

const EventManagement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { fetchEventDetails(); }, [id]);

  const fetchEventDetails = async () => {
    try {
      const response = await api.get(`/organizer/events/${id}`);
      if (response.data.success) setData(response.data.data);
    } catch {
      toast.error('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get(`/organizer/events/${id}/participants/export`);
      if (response.data.success) {
        const csvData = response.data.data;
        const headers = Object.keys(csvData[0] || {});
        const csvContent = [headers.join(','), ...csvData.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${data.event.eventName}-participants.csv`; a.click();
        toast.success('CSV exported!');
      }
    } catch { toast.error('Failed to export CSV'); }
  };

  if (loading) return (
    <><Navbar /><div className="ml-64 pt-16 flex justify-center items-center h-screen bg-black"><div className="text-xl text-primary-500 animate-pulse">Loading...</div></div></>
  );
  if (!data) return (
    <><Navbar /><div className="ml-64 pt-16 flex justify-center items-center h-screen bg-black"><div className="text-xl text-red-400">Failed to load event details.</div></div></>
  );

  const { event, participants, analytics } = data;
  const now = new Date();
  const isOngoing = now >= new Date(event.eventStartDate) && now <= new Date(event.eventEndDate);

  const filtered = participants.filter(p =>
    !searchQuery ||
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.ticketId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Navbar />
      <div className="ml-64 pt-16 min-h-screen bg-gradient-to-br from-black via-dark-500 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Back + Title */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate('/organizer/dashboard')} className="flex items-center gap-1 text-primary-400 hover:text-primary-300 text-sm transition-colors">
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-white">{event.eventName}</h1>
            <span className={`px-2 py-1 text-xs rounded-full border font-medium ${statusColors[event.status] || statusColors.DRAFT}`}>{event.status}</span>
          </div>

          {/* ── Overview Section ── */}
          <div className="dark-card p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-primary-400">Overview</h2>
              {(event.status === 'DRAFT' || event.status === 'PUBLISHED') && (
                <Link to={`/organizer/events/${id}/edit`}
                  className="px-4 py-1.5 text-xs bg-primary-800 hover:bg-primary-700 text-primary-200 rounded-md border border-primary-700 transition-all">
                  {event.status === 'DRAFT' ? 'Edit / Publish' : 'Edit Event'}
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Type</p>
                <p className="text-gray-200">{event.eventType}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Eligibility</p>
                <p className="text-gray-200">{event.eligibility?.replace('_', ' ') || 'All'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Team Event</p>
                <p className="text-gray-200">{event.isTeamEvent ? `Yes (${event.minTeamSize}–${event.maxTeamSize} members)` : 'No'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Start Date</p>
                <p className="text-gray-200">{format(new Date(event.eventStartDate), 'PPP p')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">End Date</p>
                <p className="text-gray-200">{format(new Date(event.eventEndDate), 'PPP p')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Registration Deadline</p>
                <p className="text-gray-200">{format(new Date(event.registrationDeadline), 'PPP')}</p>
              </div>
              {event.eventType !== 'MERCHANDISE' && (
                <>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Registration Fee</p>
                    <p className="text-gray-200">₹{event.registrationFee || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Registration Limit</p>
                    <p className="text-gray-200">{event.registrationLimit || '∞ Unlimited'}</p>
                  </div>
                </>
              )}
              {event.eventTags?.length > 0 && (
                <div className="col-span-2 md:col-span-3">
                  <p className="text-xs text-gray-500 mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {event.eventTags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 text-xs bg-primary-900/40 text-primary-300 border border-primary-800 rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              {event.description && (
                <div className="col-span-2 md:grid-cols-3">
                  <p className="text-xs text-gray-500 mb-0.5">Description</p>
                  <p className="text-gray-300 text-sm">{event.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Analytics ── */}
          <div className={`grid grid-cols-2 gap-4 mb-6 ${event.isTeamEvent ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
            {event.isTeamEvent && (
              <div className="dark-card p-5 text-center">
                <p className="text-xs text-gray-400 mb-1">Teams</p>
                <p className="text-2xl font-bold text-primary-500">{analytics.teamRegistrations}</p>
              </div>
            )}
            <div className="dark-card p-5 text-center">
              <p className="text-xs text-gray-400 mb-1">Registrations</p>
              <p className="text-2xl font-bold text-primary-400">{analytics.totalRegistrations}</p>
            </div>
            <div className="dark-card p-5 text-center">
              <p className="text-xs text-gray-400 mb-1">Attendance</p>
              <p className="text-2xl font-bold text-green-400">{analytics.attendanceCount}</p>
            </div>
            <div className="dark-card p-5 text-center">
              <p className="text-xs text-gray-400 mb-1">Attend. Rate</p>
              <p className="text-2xl font-bold text-blue-400">
                {analytics.totalRegistrations > 0 ? Math.round((analytics.attendanceCount / analytics.totalRegistrations) * 100) : 0}%
              </p>
            </div>
            <div className="dark-card p-5 text-center">
              <p className="text-xs text-gray-400 mb-1">Revenue (₹)</p>
              <p className="text-2xl font-bold text-yellow-400">₹{analytics.totalRevenue}</p>
            </div>
          </div>

          {/* ── Participants ── */}
          <div className="dark-card p-6">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
              <h2 className="text-xl font-semibold text-white">Participants</h2>
              <div className="flex gap-3 items-center flex-wrap">
                <input
                  type="text"
                  placeholder="Search name, email, ticket…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="px-3 py-2 text-sm border border-primary-900 bg-dark-100 text-gray-200 rounded-md focus:outline-none w-52"
                />
                <div className="relative group">
                  <button
                    onClick={() => isOngoing && navigate(`/organizer/events/${id}/scanner`)}
                    className={`px-4 py-2 rounded-md text-white text-sm font-medium flex items-center gap-2 transition-all ${isOngoing
                      ? 'bg-gradient-to-r from-green-600 to-green-800 hover:from-green-700 hover:to-green-900 cursor-pointer'
                      : 'bg-gray-700 cursor-not-allowed opacity-50'
                      }`}
                  >
                    📷 QR Scanner
                  </button>
                  {!isOngoing && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-gray-200 text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-gray-600">
                      {now < new Date(event.eventStartDate) ? 'Event has not started yet' : 'Event has already ended'}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-800 text-white text-sm rounded-md hover:from-primary-700 hover:to-primary-900 transition-all"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="text-center text-gray-400 py-10">
                {searchQuery ? 'No participants match your search' : 'No participants yet'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-primary-900 text-sm">
                  <thead className="bg-dark-200">
                    <tr>
                      {event.isTeamEvent && <th className="px-4 py-3 text-left text-xs font-medium text-primary-400 uppercase">Team</th>}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Reg Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Payment</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Attendance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Ticket ID</th>
                    </tr>
                  </thead>
                  <tbody className="bg-dark-50 divide-y divide-primary-900">
                    {filtered.map((p, idx) => {
                      const showTeamLabel = event.isTeamEvent && (idx === 0 || filtered[idx - 1].teamName !== p.teamName);
                      const attended = p.attended || p.status === 'COMPLETED';
                      return (
                        <tr key={idx} className={showTeamLabel && idx !== 0 ? 'border-t-2 border-primary-700' : ''}>
                          {event.isTeamEvent && (
                            <td className="px-4 py-3 whitespace-nowrap">
                              {showTeamLabel ? (
                                <span className="px-2 py-1 bg-primary-900 text-primary-300 border border-primary-700 rounded-full text-xs font-semibold">
                                  {p.teamName}
                                </span>
                              ) : null}
                            </td>
                          )}
                          <td className="px-4 py-3 whitespace-nowrap text-gray-200">{p.name}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-400">{p.email}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-400">
                            {format(new Date(p.registrationDate), 'PP')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.paymentStatus === 'COMPLETED' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
                              }`}>{p.paymentStatus}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'COMPLETED' ? 'bg-blue-900 text-blue-300' :
                              p.status === 'REGISTERED' ? 'bg-primary-900 text-primary-300' :
                                'bg-red-900 text-red-300'
                              }`}>{p.status}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${attended ? 'bg-green-900 text-green-300' : 'bg-dark-200 text-gray-500'
                              }`}>{attended ? '✓ Present' : 'Absent'}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-400 font-mono text-xs">{p.ticketId}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
};

export default EventManagement;
