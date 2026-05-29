import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const OrganizerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganizerDetails();
  }, [id]);

  const fetchOrganizerDetails = async () => {
    try {
      const response = await api.get(`/participant/organizers/${id}`);
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to load organizer details');
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

  const { organizer, upcomingEvents, pastEvents } = data;

  return (
    <>
      <Navbar />
      <div className="ml-64 pt-16 min-h-screen bg-gradient-to-br from-black via-dark-500 to-black">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate('/participant/clubs')}
            className="flex items-center gap-1 text-primary-400 hover:text-primary-300 transition-colors text-sm mb-4"
          >
            ← Back to Clubs
          </button>
          {/* Organizer Info */}
          <div className="dark-card p-8 mb-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {organizer.organizerName}
                </h1>
                <span className="inline-block px-3 py-1 bg-primary-900 text-primary-300 text-sm rounded-full">
                  {organizer.category.replace('_', ' ')}
                </span>
              </div>
            </div>

            <p className="text-gray-300 mb-4">{organizer.description}</p>

            <div className="text-sm text-gray-400">
              <p><span className="font-medium text-gray-300">Contact Email:</span> {organizer.contactEmail}</p>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Upcoming Events</h2>
            {upcomingEvents.length === 0 ? (
              <p className="text-gray-500">No upcoming events</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingEvents.map(event => (
                  <Link
                    key={event._id}
                    to={`/participant/events/${event._id}`}
                    className="dark-card p-6 hover:border-primary-500 border border-primary-900 transition-colors"
                  >
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {event.eventName}
                    </h3>
                    <div className="space-y-1 text-sm text-gray-400">
                      <p><span className="font-medium text-gray-300">Type:</span> {event.eventType}</p>
                      <p><span className="font-medium text-gray-300">Date:</span> {format(new Date(event.eventStartDate), 'PPP')}</p>
                      <p><span className="font-medium text-gray-300">Fee:</span> ₹{event.registrationFee}</p>
                      <p><span className="font-medium text-gray-300">Deadline:</span> {format(new Date(event.registrationDeadline), 'PP')}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Past Events */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Past Events</h2>
            {pastEvents.length === 0 ? (
              <p className="text-gray-500">No past events</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastEvents.map(event => (
                  <div key={event._id} className="bg-dark-100 border border-primary-900 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-200 mb-1">
                      {event.eventName}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {format(new Date(event.eventStartDate), 'PP')} - {format(new Date(event.eventEndDate), 'PP')}
                    </p>
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

export default OrganizerDetails;
