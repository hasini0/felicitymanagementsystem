import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';

const OngoingEvents = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOngoingEvents();
  }, []);

  const fetchOngoingEvents = async () => {
    try {
      const response = await api.get('/organizer/events-ongoing');
      if (response.data.success) {
        setEvents(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to load ongoing events');
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => navigate('/organizer/dashboard')}
              className="flex items-center gap-1 text-primary-400 hover:text-primary-300 transition-colors text-sm"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-white">Ongoing Events</h1>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No ongoing events</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(event => (
                <Link
                  key={event._id}
                  to={`/organizer/events/${event._id}`}
                  className="dark-card p-6 hover:shadow-lg hover:shadow-primary-900/50 hover:border-primary-700 transition-all"
                >
                  <h3 className="text-lg font-semibold text-white mb-2">{event.eventName}</h3>
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">{event.description}</p>
                  <div className="space-y-1 text-sm text-gray-400">
                    <p><span className="font-medium">Type:</span> {event.eventType}</p>
                    <p><span className="font-medium">Registrations:</span> {event.registrationCount}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default OngoingEvents;
