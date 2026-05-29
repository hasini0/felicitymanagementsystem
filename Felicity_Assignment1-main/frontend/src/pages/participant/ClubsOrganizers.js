import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FiUsers } from 'react-icons/fi';

const ClubsOrganizers = () => {
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const fetchOrganizers = async () => {
    try {
      const response = await api.get('/participant/organizers');
      if (response.data.success) {
        setOrganizers(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to load organizers');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (organizerId, isFollowing) => {
    try {
      if (isFollowing) {
        await api.delete(`/participant/organizers/${organizerId}/unfollow`);
        toast.success('Unfollowed successfully');
      } else {
        await api.post(`/participant/organizers/${organizerId}/follow`);
        toast.success('Followed successfully');
      }
      fetchOrganizers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
    }
  };

  const filteredOrganizers = filter === 'ALL' 
    ? organizers 
    : organizers.filter(org => org.category === filter);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="ml-64 pt-16 min-h-screen bg-gradient-to-br from-dark-500 to-black flex justify-center items-center">
          <div className="text-xl text-gray-400">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="ml-64 pt-16 min-h-screen bg-gradient-to-br from-dark-500 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-primary-400 mb-8">Clubs & Organizers</h1>

          {/* Filter Tabs */}
          <div className="mb-6 flex space-x-4 border-b border-primary-900">
            {['ALL', 'CLUB', 'COUNCIL', 'FEST_TEAM'].map((category) => (
              <button
                key={category}
                onClick={() => setFilter(category)}
                className={`px-4 py-2 font-medium ${
                  filter === category
                    ? 'border-b-2 border-primary-500 text-primary-500'
                    : 'text-gray-400 hover:text-primary-400'
                }`}
              >
                {category.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Organizers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrganizers.map((organizer) => (
              <div key={organizer._id} className="dark-card shadow-lg hover:shadow-primary-900/50 transition-all p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-200">
                      {organizer.organizerName}
                    </h3>
                    <span className="inline-block mt-1 px-2 py-1 bg-primary-900 text-primary-300 text-xs rounded-full">
                      {organizer.category.replace('_', ' ')}
                    </span>
                  </div>
                  <FiUsers className="text-primary-500 text-xl" />
                </div>

                <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                  {organizer.description}
                </p>

                <div className="text-sm text-gray-400 mb-4">
                  <p><span className="font-medium text-gray-300">Contact:</span> {organizer.contactEmail}</p>
                  <p><span className="font-medium text-gray-300">Followers:</span> {organizer.followersCount || 0}</p>
                </div>

                <div className="flex space-x-3">
                  <Link
                    to={`/participant/organizers/${organizer._id}`}
                    className="flex-1 text-center px-4 py-2 border border-primary-600 text-primary-500 rounded-md hover:bg-primary-900/30"
                  >
                    View Details
                  </Link>
                  <button
                    onClick={() => handleFollow(organizer._id, organizer.isFollowing)}
                    className={`flex-1 px-4 py-2 rounded-md ${
                      organizer.isFollowing
                        ? 'bg-dark-200 text-gray-300 hover:bg-dark-300'
                        : 'bg-gradient-to-r from-primary-600 to-primary-800 text-white hover:from-primary-700 hover:to-primary-900'
                    }`}
                  >
                    {organizer.isFollowing ? 'Unfollow' : 'Follow'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredOrganizers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No organizers found in this category
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ClubsOrganizers;
