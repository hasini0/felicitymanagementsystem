import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { FiCalendar, FiUsers, FiDollarSign, FiActivity } from 'react-icons/fi';

const STATUS_STYLES = {
  DRAFT: 'bg-dark-200 text-gray-400 border border-primary-900',
  PUBLISHED: 'bg-primary-900 text-primary-300 border border-primary-700',
  ONGOING: 'bg-green-900/40 text-green-300 border border-green-700',
  COMPLETED: 'bg-blue-900/40 text-blue-300 border border-blue-700',
  CLOSED: 'bg-red-900/30 text-red-400 border border-red-800',
};

const EventCard = ({ event }) => (
  <div className="border border-primary-900 bg-dark-50 rounded-xl p-5
    hover:border-primary-600 hover:shadow-lg hover:shadow-primary-900/30 transition-all group">
    {/* Header */}
    <div className="flex items-start justify-between mb-3 gap-2">
      <h3 className="text-base font-semibold text-gray-100 leading-tight flex-1 truncate">{event.eventName}</h3>
      <span className={`px-2 py-0.5 text-[10px] rounded-full whitespace-nowrap font-medium ${STATUS_STYLES[event.status] || STATUS_STYLES.DRAFT}`}>
        {event.status}
      </span>
    </div>

    {/* Type badge */}
    <span className={`inline-block px-2 py-0.5 text-[10px] rounded-full mb-3 font-medium border ${event.eventType === 'MERCHANDISE'
      ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800'
      : 'bg-dark-200 text-gray-400 border-primary-900'
      }`}>{event.eventType}</span>

    {/* Stats */}
    <div className="space-y-1.5 mb-4 text-xs text-gray-400">
      <div className="flex items-center gap-2">
        <FiCalendar className="text-primary-600 shrink-0" />
        <span>{format(new Date(event.eventStartDate), 'dd MMM yyyy')}</span>
      </div>
      <div className="flex items-center gap-2">
        <FiUsers className="text-primary-600 shrink-0" />
        <span>
          {event.registrationCount}{event.registrationLimit ? ` / ${event.registrationLimit}` : ''} registered
        </span>
      </div>
      <div className="flex items-center gap-2">
        <FiActivity className="text-primary-600 shrink-0" />
        <span>{event.attendanceCount} attended</span>
      </div>
      <div className="flex items-center gap-2">
        <FiDollarSign className="text-primary-600 shrink-0" />
        <span>₹{event.totalRevenue} revenue</span>
      </div>
    </div>

    {/* Actions */}
    <div className="flex gap-2">
      <Link
        to={`/organizer/events/${event._id}`}
        className="flex-1 text-center px-3 py-1.5 text-xs bg-dark-200 hover:bg-dark-300 text-gray-300
          rounded-md border border-primary-900 transition-all"
      >
        View Details
      </Link>
      {(event.status === 'DRAFT' || event.status === 'PUBLISHED') && (
        <Link
          to={`/organizer/events/${event._id}/edit`}
          className="flex-1 text-center px-3 py-1.5 text-xs bg-primary-800 hover:bg-primary-700
            text-primary-200 rounded-md border border-primary-700 transition-all"
        >
          {event.status === 'DRAFT' ? 'Edit / Publish' : 'Edit'}
        </Link>
      )}
    </div>
  </div>
);

const OrganizerDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/organizer/dashboard');
      if (response.data.success) setDashboardData(response.data.data);
    } catch {
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

  const { events, analytics } = dashboardData;

  return (
    <>
      <Navbar />
      <div className="ml-64 pt-16 min-h-screen bg-gradient-to-br from-black via-dark-500 to-black">
        <div className="max-w-7xl mx-auto p-8">
          <h1 className="text-4xl font-bold text-primary-500 mb-8">Organizer Dashboard</h1>

          {/* Analytics stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { label: 'Total Events', value: analytics.totalEvents, icon: FiCalendar },
              { label: 'Total Registrations', value: analytics.totalRegistrations, icon: FiUsers },
              { label: 'Total Revenue (₹)', value: `₹${analytics.totalRevenue}`, icon: FiDollarSign },
              { label: 'Total Attendance', value: analytics.totalAttendance, icon: FiActivity },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="dark-card p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary-900/50 flex items-center justify-center">
                  <Icon className="text-primary-400 text-lg" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-2xl font-bold text-primary-400">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="dark-card p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-semibold text-primary-400">All Events</h2>
              <Link
                to="/organizer/create-event"
                className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-800 text-white text-sm
                  rounded-md hover:from-primary-700 hover:to-primary-900 transition-all shadow-lg"
              >
                + Create Event
              </Link>
            </div>

            {events.length === 0 ? (
              <p className="text-center text-gray-400 py-12">
                No events yet —{' '}
                <Link to="/organizer/create-event" className="text-primary-400 hover:underline">
                  create your first event
                </Link>
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map(event => (
                  <EventCard key={event._id} event={event} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default OrganizerDashboard;
