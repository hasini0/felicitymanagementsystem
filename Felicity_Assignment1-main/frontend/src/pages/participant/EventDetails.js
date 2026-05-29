import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import TeamFormationModal from '../../components/TeamFormationModal';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [formData, setFormData] = useState({});
  const [showTeamModal, setShowTeamModal] = useState(false);
  // Merchandise: { itemIndex -> quantity }
  const [itemQuantities, setItemQuantities] = useState({});
  // Merchandise: { itemIndex -> selected size variant }
  const [itemVariants, setItemVariants] = useState({});
  // Payment proof file (base64)
  const [paymentProof, setPaymentProof] = useState(null);
  const [paymentFileName, setPaymentFileName] = useState('');

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      const response = await api.get(`/participant/events/${id}`);
      if (response.data.success) {
        setEvent(response.data.data);
        setMeta(response.data.meta);
      }
    } catch (error) {
      toast.error('Failed to load event details');
      navigate('/participant/events');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPaymentFileName(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    const reader = new FileReader();
    reader.onload = () => setPaymentProof(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRegister = async () => {
    // If team event, show modal
    if (event.isTeamEvent) {
      setShowTeamModal(true);
      return;
    }

    // For merchandise events, validate at least one item selected
    if (event.eventType === 'MERCHANDISE') {
      const hasItems = Object.values(itemQuantities).some(q => q > 0);
      if (!hasItems) {
        toast.error('Please select at least one item to purchase');
        return;
      }
    }

    // Individual registration
    setRegistering(true);
    try {
      const selectedItems = event.eventType === 'MERCHANDISE'
        ? Object.entries(itemQuantities)
          .filter(([, qty]) => qty > 0)
          .map(([idx, qty]) => ({
            itemIndex: parseInt(idx),
            quantity: qty,
            variant: itemVariants[parseInt(idx)] || null
          }))
        : undefined;

      const response = await api.post(`/participant/events/${id}/register`, {
        customFormData: formData,
        selectedItems,
        paymentProof: paymentProof || undefined
      });
      if (response.data.success) {
        toast.success(event.eventType === 'MERCHANDISE'
          ? 'Purchase successful! Check your email for your ticket.'
          : 'Registration successful! Check your email for confirmation.');
        fetchEventDetails();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const handleTeamCreation = async (teamName, memberEmails) => {
    try {
      const response = await api.post('/teams/create', {
        teamName,
        eventId: id,
        memberEmails
      });

      if (response.data.success) {
        toast.success('Team created! Invitations sent to members. Check My Teams to manage your team.');
        setShowTeamModal(false);
        navigate('/participant/teams');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create team');
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

  const isDeadlinePassed = meta?.isDeadlinePassed;
  const isLimitReached = meta?.isLimitReached;
  const isRegistered = meta?.isRegistered;
  const isEligible = meta?.isEligible ?? true;
  const canRegister = meta?.canRegister;

  return (
    <>
      <Navbar />
      <div className="ml-64 pt-16 min-h-screen bg-gradient-to-br from-black via-dark-500 to-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-primary-400 hover:text-primary-300 transition-colors text-sm mb-4"
          >
            ← Back
          </button>
          <div className="dark-card p-8">
            {/* Event Header */}
            <div className="border-b border-primary-900 pb-6 mb-6">
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-3xl font-bold text-white">{event.eventName}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${event.eventType === 'NORMAL'
                  ? 'bg-primary-900 text-primary-300'
                  : 'bg-purple-900 text-purple-300'
                  }`}>
                  {event.eventType}
                </span>
              </div>
              <p className="text-gray-400 text-lg">{event.description}</p>
            </div>

            {/* Event Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Organizer</h3>
                <p className="text-lg text-gray-200">{event.organizer?.organizerName}</p>
                <p className="text-sm text-gray-400">{event.organizer?.category}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Contact</h3>
                <p className="text-gray-200">{event.organizer?.contactEmail}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Event Date</h3>
                <p className="text-gray-200">
                  {format(new Date(event.eventStartDate), 'PPP p')}
                  {event.eventEndDate && ` – ${format(new Date(event.eventEndDate), 'PPP p')}`}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Registration Deadline</h3>
                <p className={`text-gray-200 ${isDeadlinePassed ? 'text-red-500 font-semibold' : ''}`}>
                  {format(new Date(event.registrationDeadline), 'PPP p')}
                  {isDeadlinePassed && ' (Passed)'}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Registration Fee</h3>
                <p className="text-lg font-semibold text-gray-200">₹{event.registrationFee}</p>
              </div>

              {event.registrationLimit && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Available Seats</h3>
                  <p className={`text-lg font-semibold ${isLimitReached ? 'text-red-500' : 'text-gray-200'}`}>
                    {event.registrationLimit - event.registrationCount} / {event.registrationLimit}
                    {isLimitReached && ' (Full)'}
                  </p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Eligibility</h3>
                <p className="text-gray-200">{event.eligibility.replace('_', ' ')}</p>
              </div>

              {event.eventTags && event.eventTags.length > 0 && (
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {event.eventTags.map((tag, idx) => (
                      <span key={idx} className="px-3 py-1 bg-dark-200 text-gray-300 border border-primary-900 rounded-full text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Merchandise Items */}
            {event.eventType === 'MERCHANDISE' && event.merchandiseItems && event.merchandiseItems.length > 0 && canRegister && (
              <div className="mb-8 border-t border-primary-900 pt-6">
                <h3 className="text-lg font-semibold text-white mb-1">Select Items to Purchase</h3>
                <p className="text-sm text-gray-500 mb-4">Choose quantities for the items you want. Out-of-stock items cannot be selected.</p>
                <div className="space-y-3">
                  {event.merchandiseItems.map((item, idx) => {
                    const qty = itemQuantities[idx] || 0;
                    const selectedVariant = itemVariants[idx] || null;
                    const outOfStock = item.stockQuantity <= 0;
                    const hasVariants = item.variants && item.variants.length > 0;
                    const variantRequired = hasVariants && !selectedVariant;
                    return (
                      <div key={idx} className={`p-4 rounded-lg border ${outOfStock ? 'border-dark-200 bg-dark-200/30 opacity-50' : 'border-primary-900 bg-dark-50'
                        }`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-gray-200 font-medium">{item.itemName}</p>
                            {item.color && <p className="text-xs text-gray-500">Color: {item.color}</p>}
                            <p className="text-sm text-primary-400 font-semibold mt-1">₹{item.price}</p>
                            <p className={`text-xs mt-0.5 ${item.stockQuantity <= 5 ? 'text-yellow-400' : 'text-gray-500'}`}>
                              {outOfStock ? 'Out of stock' : `${item.stockQuantity} in stock`}
                            </p>
                          </div>
                          {/* Qty stepper — only show after size selected (or if no variants) */}
                          {!outOfStock && !variantRequired && (
                            <div className="flex items-center gap-3">
                              <button type="button"
                                onClick={() => setItemQuantities(prev => ({ ...prev, [idx]: Math.max(0, (prev[idx] || 0) - 1) }))}
                                className="w-8 h-8 rounded-full border border-primary-700 text-primary-400 hover:bg-primary-900 flex items-center justify-center font-bold"
                              >−</button>
                              <span className="w-6 text-center text-gray-200 font-semibold">{qty}</span>
                              <button type="button"
                                onClick={() => setItemQuantities(prev => ({ ...prev, [idx]: Math.min(item.stockQuantity, (prev[idx] || 0) + 1) }))}
                                className="w-8 h-8 rounded-full border border-primary-700 text-primary-400 hover:bg-primary-900 flex items-center justify-center font-bold"
                              >+</button>
                            </div>
                          )}
                        </div>

                        {/* Size variant chips */}
                        {!outOfStock && hasVariants && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 mb-1.5">Select size:</p>
                            <div className="flex flex-wrap gap-2">
                              {item.variants.map(sz => (
                                <button
                                  key={sz}
                                  type="button"
                                  onClick={() => {
                                    setItemVariants(prev => ({ ...prev, [idx]: sz }));
                                    // reset qty when changing size
                                    if (itemVariants[idx] !== sz) setItemQuantities(prev => ({ ...prev, [idx]: 0 }));
                                  }}
                                  className={`px-3 py-1 text-xs rounded-full border font-medium transition-all ${selectedVariant === sz
                                    ? 'bg-primary-700 border-primary-500 text-white'
                                    : 'bg-dark-200 border-primary-900 text-gray-400 hover:border-primary-600'
                                    }`}
                                >{sz}</button>
                              ))}
                            </div>
                            {variantRequired && <p className="text-xs text-yellow-500 mt-1">↑ Pick a size to set quantity</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Order total */}
                {Object.values(itemQuantities).some(q => q > 0) && (
                  <div className="mt-4 p-3 bg-dark-200 rounded-lg border border-primary-900 flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Order Total</span>
                    <span className="text-primary-400 font-bold text-lg">
                      ₹{event.merchandiseItems.reduce((sum, item, idx) => sum + item.price * (itemQuantities[idx] || 0), 0)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Custom Registration Form */}
            {event.customRegistrationForm && event.customRegistrationForm.length > 0 && canRegister && (
              <div className="mb-8 border-t border-primary-900 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Registration Form</h3>
                <div className="space-y-4">
                  {event.customRegistrationForm.map((field, idx) => (
                    <div key={idx}>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      {field.fieldType === 'textarea' ? (
                        <textarea
                          className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          placeholder={field.placeholder}
                          required={field.required}
                          onChange={(e) => setFormData({ ...formData, [field.fieldName]: e.target.value })}
                        />
                      ) : field.fieldType === 'dropdown' ? (
                        <select
                          className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          required={field.required}
                          onChange={(e) => setFormData({ ...formData, [field.fieldName]: e.target.value })}
                        >
                          <option value="" className="bg-dark-50">Select...</option>
                          {field.options?.map((opt, i) => (
                            <option key={i} value={opt} className="bg-dark-50">{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.fieldType}
                          className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          placeholder={field.placeholder}
                          required={field.required}
                          onChange={(e) => setFormData({ ...formData, [field.fieldName]: e.target.value })}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Proof Upload — shown when fee > 0 or merchandise */}
            {canRegister && (event.registrationFee > 0 || event.eventType === 'MERCHANDISE') && (
              <div className="mb-8 border-t border-primary-900 pt-6">
                <h3 className="text-lg font-semibold text-white mb-1">Payment Proof</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {event.eventType === 'MERCHANDISE'
                    ? 'Upload proof of payment for your merchandise order (any document — screenshot, PDF, etc.)'
                    : `Upload proof of payment for the ₹${event.registrationFee} registration fee`}
                </p>
                <label className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-all ${paymentProof
                    ? 'border-green-600 bg-green-900/20'
                    : 'border-primary-900 hover:border-primary-600 bg-dark-50'
                  }`}>
                  <span className="text-2xl">{paymentProof ? '✅' : '📎'}</span>
                  <div>
                    {paymentProof
                      ? <p className="text-green-400 text-sm font-medium">{paymentFileName}</p>
                      : <p className="text-gray-400 text-sm">Click to upload payment proof</p>}
                    <p className="text-gray-600 text-xs mt-0.5">PDF, image, screenshot — any format accepted</p>
                  </div>
                  <input
                    type="file"
                    accept="*/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
                {paymentProof && (
                  <button
                    type="button"
                    onClick={() => { setPaymentProof(null); setPaymentFileName(''); }}
                    className="mt-2 text-xs text-red-400 hover:text-red-300"
                  >
                    Remove file
                  </button>
                )}
              </div>
            )}

            {/* Registration Status/Button */}
            <div className="border-t border-primary-900 pt-6">
              {event.isTeamEvent && (
                <div className="mb-4 p-4 bg-dark-50 border border-primary-900 rounded-lg">
                  <p className="text-primary-400 font-medium text-sm">
                    Team Event — {event.teamSize?.min || 2} to {event.teamSize?.max || 5} members required
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    You will be the team leader. Invited members must accept to complete registration.
                  </p>
                </div>
              )}
              {isRegistered ? (
                <div className="bg-green-900 bg-opacity-30 border border-green-700 rounded-lg p-4">
                  <p className="text-green-400 font-medium">
                    {event.isTeamEvent ? '✓ You already have a team for this event' : '✓ You are registered for this event'}
                  </p>
                  <p className="text-green-300 text-sm mt-1">
                    {event.isTeamEvent ? 'Go to My Teams to manage your team and finalize registration' : 'Check your dashboard for your ticket and QR code'}
                  </p>
                </div>
              ) : isDeadlinePassed ? (
                <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-4">
                  <p className="text-red-400 font-medium">Registration deadline has passed</p>
                </div>
              ) : isLimitReached ? (
                <div className="bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded-lg p-4">
                  <p className="text-yellow-400 font-medium">Registration limit reached</p>
                </div>
              ) : !isEligible ? (
                <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-4">
                  <p className="text-red-400 font-medium">You are not eligible for this event</p>
                  <p className="text-red-300 text-sm mt-1">
                    This event is restricted to {event.eligibility === 'IIIT_ONLY' ? 'IIIT students' : 'non-IIIT participants'} only
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleRegister}
                  disabled={registering}
                  className="w-full py-3 px-6 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registering
                    ? (event.eventType === 'MERCHANDISE' ? 'Processing...' : 'Registering...')
                    : event.isTeamEvent
                      ? 'Form a Team'
                      : event.eventType === 'MERCHANDISE'
                        ? `Purchase${Object.values(itemQuantities).some(q => q > 0) ? ` (₹${event.merchandiseItems?.reduce((s, item, i) => s + item.price * (itemQuantities[i] || 0), 0)})` : ''}`
                        : 'Register Now'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Team Formation Modal */}
      <TeamFormationModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        event={event}
        onSubmit={handleTeamCreation}
      />
    </>
  );
};

export default EventDetails;
