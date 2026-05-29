import React, { useState } from 'react';
import { FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const TeamFormationModal = ({ isOpen, onClose, event, onSubmit }) => {
  const { user } = useAuth();
  const [teamName, setTeamName] = useState('');
  const [memberEmails, setMemberEmails] = useState(['']);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const minSize = event?.teamSize?.min || 2;
  const maxSize = event?.teamSize?.max || 5;
  const totalMembers = memberEmails.filter(email => email.trim()).length + 1; // +1 for leader

  const addEmailField = () => {
    if (memberEmails.length < maxSize - 1) {
      setMemberEmails([...memberEmails, '']);
    }
  };

  const removeEmailField = (index) => {
    const newEmails = memberEmails.filter((_, i) => i !== index);
    setMemberEmails(newEmails.length > 0 ? newEmails : ['']);
  };

  const updateEmail = (index, value) => {
    const newEmails = [...memberEmails];
    newEmails[index] = value;
    setMemberEmails(newEmails);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validEmails = memberEmails.filter(email => email.trim());

    // Check for self-invite
    if (user?.email && validEmails.some(e => e.toLowerCase() === user.email.toLowerCase())) {
      alert('You cannot invite yourself to your own team');
      return;
    }

    // Check for duplicates
    const uniqueEmails = [...new Set(validEmails.map(e => e.toLowerCase()))];
    if (uniqueEmails.length !== validEmails.length) {
      alert('Duplicate email addresses in invite list');
      return;
    }

    const total = validEmails.length + 1;

    if (total < minSize) {
      alert(`Team must have at least ${minSize} members (including you)`);
      return;
    }

    if (total > maxSize) {
      alert(`Team cannot exceed ${maxSize} members (including you)`);
      return;
    }

    setLoading(true);
    await onSubmit(teamName, validEmails);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-200 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-dark-200 border-b border-primary-900 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Create Team</h2>
            <p className="text-gray-400 text-sm mt-1">{event?.eventName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Team Name */}
          <div className="mb-6">
            <label className="block text-gray-300 font-medium mb-2">
              Team Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-4 py-2 bg-dark-50 border border-primary-900 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter team name"
              required
            />
          </div>

          {/* Team Size Info */}
          <div className="mb-6 p-4 bg-dark-50 border border-primary-900 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Team Size Required:</span>
              <span className="text-white font-medium">{minSize} - {maxSize} members</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-400">Current Team Size:</span>
              <span className={`font-medium ${
                totalMembers < minSize ? 'text-red-400' : 
                totalMembers > maxSize ? 'text-red-400' : 
                'text-green-400'
              }`}>
                {totalMembers} member{totalMembers !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Member Emails */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-gray-300 font-medium">
                Team Members <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addEmailField}
                disabled={memberEmails.length >= maxSize - 1}
                className="flex items-center gap-2 px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiPlus size={16} />
                Add Member
              </button>
            </div>

            <div className="space-y-3">
              {memberEmails.map((email, index) => (
                <div key={index} className="flex flex-col gap-1">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => updateEmail(index, e.target.value)}
                      className={`flex-1 px-4 py-2 bg-dark-50 border rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        user?.email && email.toLowerCase() === user.email.toLowerCase()
                          ? 'border-red-500'
                          : 'border-primary-900'
                      }`}
                      placeholder={`Member ${index + 1} email address`}
                      required={index === 0 || email.trim() !== ''}
                    />
                    {memberEmails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEmailField(index)}
                        className="px-3 py-2 bg-red-900 text-red-300 rounded-lg hover:bg-red-800 transition-colors"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    )}
                  </div>
                  {user?.email && email.toLowerCase() === user.email.toLowerCase() && (
                    <p className="text-red-400 text-xs ml-1">You cannot invite yourself</p>
                  )}
                </div>
              ))}
            </div>

            <p className="text-gray-400 text-sm mt-2">
              All members must have registered accounts with these email addresses.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-primary-900">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || totalMembers < minSize || totalMembers > maxSize}
              className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating Team...' : 'Create Team & Send Invites'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamFormationModal;
