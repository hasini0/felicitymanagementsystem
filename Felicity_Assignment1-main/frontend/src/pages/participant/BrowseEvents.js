import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { FiSearch, FiFilter, FiStar } from 'react-icons/fi';

const BrowseEvents = () => {
  const [events, setEvents] = useState([]);
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [hasPreferences, setHasPreferences] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    eventType: '',
    eligibility: '',
    dateFrom: '',
    dateTo: '',
    tags: ''
  });
  const [followedClubsOnly, setFollowedClubsOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchTrendingEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      if (followedClubsOnly) params.append('followedClubsOnly', 'true');
      const response = await api.get(`/participant/events?${params.toString()}`);
      if (response.data.success) {
        setEvents(response.data.data);
        setHasPreferences(!!response.data.hasPreferences);
      }
    } catch (error) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendingEvents = async () => {
    try {
      const response = await api.get('/participant/events/trending');
      if (response.data.success) {
        setTrendingEvents(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load trending events');
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    fetchEvents();
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      eventType: '',
      eligibility: '',
      dateFrom: '',
      dateTo: '',
      tags: ''
    });
    setFollowedClubsOnly(false);
    setLoading(true);
    fetchEvents();
  };

  return (
    <>
      <Navbar />
      <div className="ml-64 pt-16 min-h-screen bg-gradient-to-br from-dark-500 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-primary-400 mb-8">Browse Events</h1>

          {/* Preference banner */}
          {hasPreferences && (
            <div className="mb-4 flex items-center justify-between px-4 py-2.5 bg-dark-200 border border-primary-900 rounded-lg text-sm">
              <span className="text-gray-400">✨ Events are ordered by your preferences</span>
              <Link to="/participant/profile" className="text-primary-400 hover:text-primary-300 underline text-xs">Edit preferences</Link>
            </div>
          )}

          {trendingEvents.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-primary-400 mb-4">🔥 Trending (Top 5 in 24h)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {trendingEvents.map(event => (
                  <Link
                    key={event._id}
                    to={`/participant/events/${event._id}`}
                    className="dark-card p-4 hover:shadow-lg hover:shadow-primary-900/50 transition-all border border-primary-800"
                  >
                    <h3 className="font-semibold text-gray-200 text-sm">{event.eventName}</h3>
                    <p className="text-xs text-gray-400 mt-1">{event.organizer?.organizerName}</p>
                    <p className="text-xs text-primary-500 mt-2">{event.registrationCount} registered</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="dark-card shadow-lg shadow-primary-900/20 p-6 mb-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-3 text-primary-500" />
                    <input
                      type="text"
                      name="search"
                      placeholder="Search events by name or description..."
                      className="w-full pl-10 pr-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      value={filters.search}
                      onChange={handleFilterChange}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-2 border border-primary-800 bg-dark-100 text-gray-300 rounded-md hover:bg-dark-200 flex items-center gap-2"
                >
                  <FiFilter />
                  Filters
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-md hover:from-primary-700 hover:to-primary-900"
                >
                  Search
                </button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-primary-900">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Event Type</label>
                    <select
                      name="eventType"
                      className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      value={filters.eventType}
                      onChange={handleFilterChange}
                    >
                      <option value="" className="bg-dark-100">All Types</option>
                      <option value="NORMAL" className="bg-dark-100">Normal Events</option>
                      <option value="MERCHANDISE" className="bg-dark-100">Merchandise</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Eligibility</label>
                    <select
                      name="eligibility"
                      className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      value={filters.eligibility}
                      onChange={handleFilterChange}
                    >
                      <option value="" className="bg-dark-100">All</option>
                      <option value="IIIT_ONLY" className="bg-dark-100">IIIT Only</option>
                      <option value="NON_IIIT_ONLY" className="bg-dark-100">Non-IIIT Only</option>
                      <option value="ALL" className="bg-dark-100">Open to All</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Tags</label>
                    <input
                      type="text"
                      name="tags"
                      placeholder="e.g., sports, cultural"
                      className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      value={filters.tags}
                      onChange={handleFilterChange}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Date From</label>
                    <input
                      type="date"
                      name="dateFrom"
                      className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      value={filters.dateFrom}
                      onChange={handleFilterChange}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Date To</label>
                    <input
                      type="date"
                      name="dateTo"
                      className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      value={filters.dateTo}
                      onChange={handleFilterChange}
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={() => setFollowedClubsOnly(v => !v)}
                      className={`flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-all ${followedClubsOnly
                          ? 'bg-primary-700 border-primary-500 text-white'
                          : 'bg-dark-100 border-primary-900 text-gray-400 hover:border-primary-600 hover:text-gray-200'
                        }`}
                    >
                      {followedClubsOnly ? '✓ ' : ''}Followed Clubs Only
                    </button>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="w-full px-4 py-2 border border-primary-800 bg-dark-100 text-gray-300 rounded-md hover:bg-dark-200"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Events List */}
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No events found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(event => (
                <Link
                  key={event._id}
                  to={`/participant/events/${event._id}`}
                  className="dark-card shadow-lg hover:shadow-primary-900/50 transition-all overflow-hidden"
                >
                  <div className="p-6">
                    {/* Preference badges */}
                    {(event.isFromFollowedClub || event.matchesInterest) && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {event.isFromFollowedClub && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-primary-900 border border-primary-600 text-primary-300 flex items-center gap-1">
                            ✨ Followed Club
                          </span>
                        )}
                        {event.matchesInterest && !event.isFromFollowedClub && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-900/60 border border-purple-700 text-purple-300 flex items-center gap-1">
                            🎯 Matches Interest
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-gray-200 line-clamp-2">
                        {event.eventName}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${event.eventType === 'NORMAL'
                        ? 'bg-blue-900 text-blue-300'
                        : 'bg-purple-900 text-purple-300'
                        }`}>
                        {event.eventType}
                      </span>
                    </div>

                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                      {event.description}
                    </p>

                    <div className="space-y-2 text-sm text-gray-400">
                      <p><span className="font-medium text-gray-300">Organizer:</span> {event.organizer?.organizerName}</p>
                      <p><span className="font-medium text-gray-300">Date:</span> {format(new Date(event.eventStartDate), 'PPP p')}</p>
                      <p><span className="font-medium text-gray-300">Fee:</span> ₹{event.registrationFee}</p>
                      {event.registrationLimit && (
                        <p><span className="font-medium text-gray-300">Seats:</span> {event.registrationCount}/{event.registrationLimit}</p>
                      )}
                    </div>

                    {event.eventTags && event.eventTags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {event.eventTags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-dark-100 text-primary-400 text-xs rounded border border-primary-900">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
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

export default BrowseEvents;
