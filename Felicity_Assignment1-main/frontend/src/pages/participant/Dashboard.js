import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { FaTicketAlt, FaUsers, FaTimes } from 'react-icons/fa';

const ParticipantDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyTab, setHistoryTab] = useState('normal');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/participant/dashboard');
      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to load dashboard data');
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

  const d = dashboardData || {};
  const historyTabs = [
    { key: 'normal', label: 'Normal', data: d.normalEvents || [], color: 'blue' },
    { key: 'merchandise', label: 'Merchandise', data: d.merchandiseEvents || [], color: 'purple' },
    { key: 'completed', label: 'Completed', data: d.completedEvents || [], color: 'green' },
    { key: 'cancelled', label: 'Cancelled / Rejected', data: d.cancelledEvents || [], color: 'red' },
  ];
  const activeHistory = historyTabs.find(t => t.key === historyTab);

  return (
    <>
      <Navbar />
      <div className="ml-64 pt-16 min-h-screen bg-gradient-to-br from-black via-dark-500 to-black">
        <div className="max-w-7xl mx-auto p-8 space-y-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-primary-700">
            My Events Dashboard
          </h1>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Registrations', value: d.totalRegistrations || 0 },
              { label: 'Upcoming', value: (d.upcomingEvents || []).length },
              { label: 'Completed', value: (d.completedEvents || []).length },
              { label: 'Cancelled', value: (d.cancelledEvents || []).length },
            ].map(stat => (
              <div key={stat.label} className="bg-gradient-to-br from-dark-100 to-black border border-primary-900 rounded-lg p-5 shadow-xl hover:shadow-primary-900/40 transition-all">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-bold text-primary-500 mt-1">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* ── Upcoming Events ── */}
          <section>
            <h2 className="text-2xl font-bold text-primary-400 mb-4">Upcoming Events</h2>
            {(d.upcomingEvents || []).length === 0 ? (
              <div className="dark-card p-8 text-center text-gray-500">
                No upcoming events. <Link to="/participant/events" className="text-primary-400 hover:text-primary-300 underline">Browse events →</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(d.upcomingEvents || []).map(reg => (
                  <EventCard key={reg._id} reg={reg} />
                ))}
              </div>
            )}
          </section>

          {/* ── Participation History ── */}
          <section>
            <h2 className="text-2xl font-bold text-primary-400 mb-4">Participation History</h2>
            <div className="bg-gradient-to-br from-dark-100 to-black border border-primary-900 rounded-lg shadow-xl">

              {/* Tab bar */}
              <div className="border-b border-primary-900 flex flex-wrap">
                {historyTabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setHistoryTab(tab.key)}
                    className={`py-4 px-5 text-sm font-medium transition-all whitespace-nowrap ${historyTab === tab.key
                      ? 'border-b-2 border-primary-500 text-primary-400'
                      : 'text-gray-500 hover:text-primary-400'
                      }`}
                  >
                    {tab.label}
                    <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-dark-200 text-gray-400">
                      {tab.data.length}
                    </span>
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-6">
                {activeHistory.data.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No {activeHistory.label.toLowerCase()} events</p>
                ) : (
                  <div className="space-y-4">
                    {activeHistory.data.map(reg => (
                      <EventCard key={reg._id} reg={reg} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>
      </div>
    </>
  );
};

// ── QR Modal ────────────────────────────────────────────────────────────────
const QRModal = ({ reg, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    onClick={onClose}
  >
    <div
      className="bg-gradient-to-br from-dark-100 to-black border border-primary-800 rounded-xl p-8 max-w-sm w-full mx-4 shadow-2xl shadow-primary-900/50 text-center"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-primary-400">Your Ticket</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <FaTimes />
        </button>
      </div>
      <p className="text-gray-200 font-semibold mb-1">{reg.event?.eventName}</p>
      <p className="text-sm text-gray-400 mb-4">{reg.event?.organizer?.organizerName}</p>
      {reg.qrCode ? (
        <img src={reg.qrCode} alt="QR Code" className="w-48 h-48 mx-auto border-2 border-primary-600 rounded-lg mb-4" />
      ) : (
        <div className="w-48 h-48 mx-auto border-2 border-primary-900 rounded-lg mb-4 flex items-center justify-center text-gray-500 text-sm">
          No QR available
        </div>
      )}
      <div className="flex items-center justify-center gap-2 bg-dark-200 border border-primary-900 rounded-lg px-4 py-2">
        <FaTicketAlt className="text-primary-500" />
        <span className="font-mono text-sm text-gray-200">{reg.ticketId}</span>
      </div>
      {reg.event?.eventStartDate && (
        <p className="text-xs text-gray-500 mt-3">
          📅 {format(new Date(reg.event.eventStartDate), 'PPP p')}
        </p>
      )}
    </div>
  </div>
);

// ── Shared event record card ────────────────────────────────────────────────
const EventCard = ({ reg }) => {
  const [showQR, setShowQR] = useState(false);
  const ev = reg.event;
  if (!ev) return null;

  const statusColors = {
    REGISTERED: 'bg-blue-900 text-blue-300',
    COMPLETED: 'bg-green-900 text-green-300',
    CANCELLED: 'bg-red-900 text-red-300',
    REJECTED: 'bg-red-900 text-red-300',
  };
  const typeColors = {
    NORMAL: 'bg-indigo-900 text-indigo-300',
    MERCHANDISE: 'bg-purple-900 text-purple-300',
  };

  return (
    <>
      {showQR && <QRModal reg={reg} onClose={() => setShowQR(false)} />}
      <div className="border border-primary-900 bg-dark-50 rounded-lg p-5 hover:shadow-lg hover:shadow-primary-900/30 hover:border-primary-700 transition-all">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            {/* Event name linking to event details */}
            <Link
              to={`/participant/events/${ev._id}`}
              className="text-lg font-semibold text-primary-400 hover:text-primary-300 hover:underline line-clamp-1"
            >
              {ev.eventName}
            </Link>

            <p className="text-sm text-gray-400 mt-0.5">
              {ev.organizer?.organizerName || 'N/A'}
            </p>

            {/* Chips: type + status */}
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${typeColors[ev.eventType] || 'bg-gray-700 text-gray-300'}`}>
                {ev.eventType}
              </span>
              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusColors[reg.status] || 'bg-gray-700 text-gray-300'}`}>
                {reg.status}
              </span>
            </div>

            {/* Schedule */}
            {ev.eventStartDate && (
              <p className="text-xs text-gray-400 mt-2">
                📅 {format(new Date(ev.eventStartDate), 'PPP p')}
              </p>
            )}

            {/* Team name (if applicable) */}
            {reg.teamName && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <FaUsers className="text-primary-500" />
                Team: <span className="text-gray-300">{reg.teamName}</span>
              </p>
            )}

            {/* Clickable Ticket ID → opens QR modal */}
            {reg.ticketId && (
              <button
                onClick={() => setShowQR(true)}
                className="inline-flex items-center gap-1.5 mt-2 text-xs text-primary-400 hover:text-primary-300 hover:underline font-mono cursor-pointer"
                title="Click to view QR code"
              >
                <FaTicketAlt className="text-primary-500" />
                {reg.ticketId}
              </button>
            )}
          </div>

          {/* QR code thumbnail — also clickable */}
          {reg.qrCode && (
            <div className="flex-shrink-0 cursor-pointer" onClick={() => setShowQR(true)} title="Click to enlarge">
              <img
                src={reg.qrCode}
                alt="QR"
                className="w-20 h-20 border border-primary-800 rounded hover:border-primary-500 transition-colors"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ParticipantDashboard;
