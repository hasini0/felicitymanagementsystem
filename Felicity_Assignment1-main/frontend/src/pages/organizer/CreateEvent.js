import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const TAG_OPTIONS = [
  'Technical', 'Cultural', 'Sports', 'Music', 'Dance',
  'Drama', 'Gaming', 'Hackathon', 'Workshop', 'Social', 'Business', 'Art'
];

const CreateEvent = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Draft, 2: Define Fields, 3: Publish
  const [eventData, setEventData] = useState({
    eventName: '',
    description: '',
    eventType: 'NORMAL',
    eligibility: 'ALL',
    registrationDeadline: '',
    eventStartDate: '',
    eventEndDate: '',
    registrationLimit: '',
    registrationFee: '0',
    eventTags: [],
    isTeamEvent: false,
    teamSize: { min: 2, max: 5 },
    customRegistrationForm: [],
    merchandiseItems: []
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEventData({ ...eventData, [name]: value });
  };

  const handleCreateDraft = async () => {
    setLoading(true);
    try {
      const dataToSend = {
        ...eventData,
        eventTags: eventData.eventTags,
        registrationLimit: eventData.registrationLimit ? parseInt(eventData.registrationLimit) : null,
        registrationFee: parseFloat(eventData.registrationFee) || 0,
        isTeamEvent: eventData.isTeamEvent,
        teamSize: eventData.isTeamEvent ? {
          min: parseInt(eventData.teamSize.min) || 2,
          max: parseInt(eventData.teamSize.max) || 5
        } : undefined
      };

      const response = await api.post('/organizer/events', dataToSend);
      if (response.data.success) {
        toast.success('Event created as draft!');
        const eventId = response.data.data._id;

        if (eventData.eventType === 'NORMAL' && step === 1) {
          // Move to form builder
          setStep(2);
          navigate(`/organizer/events/${eventId}/edit`);
        } else {
          navigate('/organizer/dashboard');
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="ml-64 pt-16 min-h-screen bg-gradient-to-br from-black via-dark-500 to-black">
        <div className="max-w-4xl mx-auto p-8">
          <div className="flex items-center gap-3 mb-8">
            <button
              type="button"
              onClick={() => navigate('/organizer/dashboard')}
              className="flex items-center gap-1 text-primary-400 hover:text-primary-300 transition-colors text-sm"
            >
              ← Back
            </button>
            <h1 className="text-4xl font-bold text-primary-500">Create New Event</h1>
          </div>

          <div className="dark-card p-8">
            <form className="space-y-6">
              {/* Basic Information */}
              <div>
                <h2 className="text-xl font-semibold text-primary-400 mb-4">Basic Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Event Name *
                    </label>
                    <input
                      type="text"
                      name="eventName"
                      required
                      value={eventData.eventName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Description *
                    </label>
                    <textarea
                      name="description"
                      required
                      rows="4"
                      value={eventData.description}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Event Type *
                      </label>
                      <select
                        name="eventType"
                        value={eventData.eventType}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="NORMAL" className="bg-dark-100">Normal Event</option>
                        <option value="MERCHANDISE" className="bg-dark-100">Merchandise</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Eligibility *
                      </label>
                      <select
                        name="eligibility"
                        value={eventData.eligibility}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="ALL" className="bg-dark-100">Open to All</option>
                        <option value="IIIT_ONLY" className="bg-dark-100">IIIT Only</option>
                        <option value="NON_IIIT_ONLY" className="bg-dark-100">Non-IIIT Only</option>
                      </select>
                    </div>
                  </div>

                  {/* Team/Individual Registration */}
                  <div>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={eventData.isTeamEvent}
                        onChange={(e) => setEventData({ ...eventData, isTeamEvent: e.target.checked })}
                        className="w-5 h-5 rounded border-primary-900 bg-dark-50 text-primary-600 focus:ring-2 focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-gray-300">
                        Enable Team Registration (Hackathon/Team Event)
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-8">Allow participants to form teams before registering</p>
                  </div>

                  {/* Team Size (only show if team event) */}
                  {eventData.isTeamEvent && (
                    <div className="border-l-4 border-primary-600 pl-4 bg-dark-200 p-4 rounded">
                      <h3 className="text-sm font-semibold text-primary-400 mb-3">Team Size Configuration</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Minimum Team Size *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={eventData.teamSize.min}
                            onChange={(e) => setEventData({
                              ...eventData,
                              teamSize: { ...eventData.teamSize, min: parseInt(e.target.value) || 1 }
                            })}
                            className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Maximum Team Size *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={eventData.teamSize.max}
                            onChange={(e) => setEventData({
                              ...eventData,
                              teamSize: { ...eventData.teamSize, max: parseInt(e.target.value) || 5 }
                            })}
                            className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div>
                <h2 className="text-xl font-semibold text-primary-400 mb-4">Dates, Times &amp; Deadlines</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Registration Deadline *
                    </label>
                    <input
                      type="datetime-local"
                      name="registrationDeadline"
                      required
                      value={eventData.registrationDeadline}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Event Start Date &amp; Time *
                    </label>
                    <input
                      type="datetime-local"
                      name="eventStartDate"
                      required
                      value={eventData.eventStartDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Event End Date &amp; Time *
                    </label>
                    <input
                      type="datetime-local"
                      name="eventEndDate"
                      required
                      value={eventData.eventEndDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </div>
              </div>

              {/* Pricing & Limits — hidden entirely for MERCHANDISE (stock per item controls limits) */}
              {eventData.eventType !== 'MERCHANDISE' && (
                <div>
                  <h2 className="text-xl font-semibold text-primary-400 mb-4">Pricing &amp; Limits</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Registration Fee (₹)
                      </label>
                      <input
                        type="number"
                        name="registrationFee"
                        min="0"
                        value={eventData.registrationFee}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Registration Limit (leave empty for unlimited)
                      </label>
                      <input
                        type="number"
                        name="registrationLimit"
                        min="1"
                        value={eventData.registrationLimit}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Merchandise Items — only for MERCHANDISE events */}
              {eventData.eventType === 'MERCHANDISE' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-semibold text-primary-400">Merchandise Items</h2>
                    <button
                      type="button"
                      onClick={() => setEventData(prev => ({
                        ...prev,
                        merchandiseItems: [
                          ...prev.merchandiseItems,
                          { itemName: '', size: '', color: '', stockQuantity: 1, price: 0 }
                        ]
                      }))}
                      className="px-4 py-1.5 bg-primary-800 hover:bg-primary-700 text-white text-sm rounded-md transition-all"
                    >
                      + Add Item
                    </button>
                  </div>
                  {eventData.merchandiseItems.length === 0 && (
                    <p className="text-gray-500 text-sm py-4 text-center border border-dashed border-primary-900 rounded-lg">
                      No items yet — click "Add Item" to add merchandise
                    </p>
                  )}
                  <div className="space-y-3">
                    {eventData.merchandiseItems.map((item, idx) => (
                      <div key={idx} className="border border-primary-900 bg-dark-50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-medium text-primary-400">Item {idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => setEventData(prev => ({
                              ...prev,
                              merchandiseItems: prev.merchandiseItems.filter((_, i) => i !== idx)
                            }))}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {/* Row 1: Name + Color */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-400 mb-1">Item Name *</label>
                              <input
                                type="text"
                                placeholder="e.g., Event T-Shirt"
                                value={item.itemName}
                                onChange={e => setEventData(prev => {
                                  const items = [...prev.merchandiseItems];
                                  items[idx] = { ...items[idx], itemName: e.target.value };
                                  return { ...prev, merchandiseItems: items };
                                })}
                                className="w-full px-3 py-2 border border-primary-900 bg-dark-100 text-gray-200 rounded-md text-sm focus:outline-none focus:ring-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-400 mb-1">Color</label>
                              <input
                                type="text"
                                placeholder="e.g., Black"
                                value={item.color}
                                onChange={e => setEventData(prev => {
                                  const items = [...prev.merchandiseItems];
                                  items[idx] = { ...items[idx], color: e.target.value };
                                  return { ...prev, merchandiseItems: items };
                                })}
                                className="w-full px-3 py-2 border border-primary-900 bg-dark-100 text-gray-200 rounded-md text-sm focus:outline-none focus:ring-primary-500"
                              />
                            </div>
                          </div>

                          {/* Sizes multi-select */}
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2">
                              Available Sizes <span className="text-gray-600">(pick all that apply)</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'].map(sz => {
                                const selected = (item.variants || []).includes(sz);
                                return (
                                  <button
                                    key={sz}
                                    type="button"
                                    onClick={() => setEventData(prev => {
                                      const items = [...prev.merchandiseItems];
                                      const current = items[idx].variants || [];
                                      items[idx] = {
                                        ...items[idx],
                                        variants: selected ? current.filter(s => s !== sz) : [...current, sz]
                                      };
                                      return { ...prev, merchandiseItems: items };
                                    })}
                                    className={`px-3 py-1 text-xs rounded-full border font-medium transition-all ${selected
                                      ? 'bg-primary-700 border-primary-500 text-white'
                                      : 'bg-dark-200 border-primary-900 text-gray-400 hover:border-primary-600'
                                      }`}
                                  >
                                    {sz}
                                  </button>
                                );
                              })}
                            </div>
                            {/* Custom size input */}
                            <div className="flex gap-2 mt-2">
                              <input
                                type="text"
                                placeholder="Custom size (e.g., 32, One Size)…"
                                className="flex-1 px-3 py-1.5 border border-primary-900 bg-dark-100 text-gray-200 rounded-md text-xs focus:outline-none focus:ring-primary-500"
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && e.target.value.trim()) {
                                    e.preventDefault();
                                    const custom = e.target.value.trim();
                                    setEventData(prev => {
                                      const items = [...prev.merchandiseItems];
                                      const current = items[idx].variants || [];
                                      if (!current.includes(custom)) {
                                        items[idx] = { ...items[idx], variants: [...current, custom] };
                                      }
                                      return { ...prev, merchandiseItems: items };
                                    });
                                    e.target.value = '';
                                  }
                                }}
                              />
                              <span className="text-xs text-gray-600 self-center">↵ Enter to add</span>
                            </div>
                            {(item.variants || []).filter(v => !['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'].includes(v)).map(custom => (
                              <span key={custom} className="inline-flex items-center gap-1 mt-1 mr-1 px-2 py-0.5 bg-dark-200 border border-primary-900 rounded-full text-xs text-gray-300">
                                {custom}
                                <button type="button" onClick={() => setEventData(prev => {
                                  const items = [...prev.merchandiseItems];
                                  items[idx] = { ...items[idx], variants: items[idx].variants.filter(v => v !== custom) };
                                  return { ...prev, merchandiseItems: items };
                                })} className="text-gray-500 hover:text-red-400">×</button>
                              </span>
                            ))}
                          </div>

                          {/* Stock + Price */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-400 mb-1">Stock Quantity *</label>
                              <input
                                type="number" min="1" value={item.stockQuantity}
                                onChange={e => setEventData(prev => {
                                  const items = [...prev.merchandiseItems];
                                  items[idx] = { ...items[idx], stockQuantity: parseInt(e.target.value) || 1 };
                                  return { ...prev, merchandiseItems: items };
                                })}
                                className="w-full px-3 py-2 border border-primary-900 bg-dark-100 text-gray-200 rounded-md text-sm focus:outline-none focus:ring-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-400 mb-1">Price (₹) *</label>
                              <input
                                type="number" min="0" value={item.price}
                                onChange={e => setEventData(prev => {
                                  const items = [...prev.merchandiseItems];
                                  items[idx] = { ...items[idx], price: parseFloat(e.target.value) || 0 };
                                  return { ...prev, merchandiseItems: items };
                                })}
                                className="w-full px-3 py-2 border border-primary-900 bg-dark-100 text-gray-200 rounded-md text-sm focus:outline-none focus:ring-primary-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Event Tags
                  </label>
                  <span className="text-xs text-gray-500">{eventData.eventTags.length} selected</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map(tag => {
                    const active = eventData.eventTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setEventData(prev => ({
                          ...prev,
                          eventTags: active
                            ? prev.eventTags.filter(t => t !== tag)
                            : [...prev.eventTags, tag]
                        }))}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${active
                          ? 'bg-primary-700 border-primary-500 text-white shadow-md'
                          : 'bg-dark-200 border-primary-900 text-gray-400 hover:border-primary-600 hover:text-gray-200'
                          }`}
                      >
                        {active && <span className="mr-1 text-xs">✓</span>}{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-primary-900">
                <button
                  type="button"
                  onClick={() => navigate('/organizer/dashboard')}
                  className="px-6 py-2 border border-primary-700 text-gray-300 rounded-md hover:bg-dark-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateDraft}
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-md hover:from-primary-700 hover:to-primary-900 disabled:opacity-50 shadow-lg hover:shadow-primary-900/50 transition-all"
                >
                  {loading ? 'Creating...' : 'Create as Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateEvent;
