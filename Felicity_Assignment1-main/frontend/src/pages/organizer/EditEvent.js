import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const TAG_OPTIONS = [
  'Technical', 'Cultural', 'Sports', 'Music', 'Dance',
  'Drama', 'Gaming', 'Hackathon', 'Workshop', 'Social', 'Business', 'Art'
];

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'file', label: 'File Upload' },
];

const emptyField = () => ({
  fieldName: '',
  label: '',
  fieldType: 'text',
  placeholder: '',
  required: false,
  options: [],
});

const EditEvent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable draft fields
  const [description, setDescription] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [registrationLimit, setRegistrationLimit] = useState('');
  const [eventTags, setEventTags] = useState([]);

  // Form builder state
  const [formFields, setFormFields] = useState([]);
  const [addingField, setAddingField] = useState(false);
  const [newField, setNewField] = useState(emptyField());
  const [optionInput, setOptionInput] = useState('');
  const [editingIdx, setEditingIdx] = useState(null);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const response = await api.get(`/organizer/events/${id}`);
      if (response.data.success) {
        const ev = response.data.data.event;
        const an = response.data.data.analytics;
        setEvent(ev);
        setAnalytics(an);
        setDescription(ev.description || '');
        setRegistrationDeadline(ev.registrationDeadline ? ev.registrationDeadline.slice(0, 16) : '');
        setRegistrationLimit(ev.registrationLimit != null ? ev.registrationLimit : '');
        setEventTags(ev.eventTags || []);
        setFormFields(ev.customRegistrationForm || []);
      }
    } catch (error) {
      toast.error('Failed to load event');
      navigate('/organizer/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formLocked = analytics && analytics.totalRegistrations > 0;

  // ── Field helpers ────────────────────────────────────────────────────────────
  const moveField = (idx, dir) => {
    const updated = [...formFields];
    const target = idx + dir;
    if (target < 0 || target >= updated.length) return;
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    setFormFields(updated);
  };

  const removeField = (idx) => {
    setFormFields(formFields.filter((_, i) => i !== idx));
  };

  const openAddField = () => {
    setNewField(emptyField());
    setOptionInput('');
    setEditingIdx(null);
    setAddingField(true);
  };

  const openEditField = (idx) => {
    setNewField({ ...formFields[idx], options: [...(formFields[idx].options || [])] });
    setOptionInput('');
    setEditingIdx(idx);
    setAddingField(true);
  };

  const addOption = () => {
    const trimmed = optionInput.trim();
    if (!trimmed) return;
    setNewField({ ...newField, options: [...newField.options, trimmed] });
    setOptionInput('');
  };

  const removeOption = (oi) => {
    setNewField({ ...newField, options: newField.options.filter((_, i) => i !== oi) });
  };

  const saveField = () => {
    if (!newField.fieldName.trim() || !newField.label.trim()) {
      toast.error('Field name and label are required');
      return;
    }
    if (['dropdown', 'checkbox'].includes(newField.fieldType) && newField.options.length === 0) {
      toast.error('Add at least one option for dropdown/checkbox fields');
      return;
    }
    const field = { ...newField };
    if (!['dropdown', 'checkbox'].includes(field.fieldType)) {
      field.options = [];
    }
    if (editingIdx !== null) {
      const updated = [...formFields];
      updated[editingIdx] = field;
      setFormFields(updated);
    } else {
      setFormFields([...formFields, field]);
    }
    setAddingField(false);
  };

  // ── Save form to backend ─────────────────────────────────────────────────────
  const saveForm = async () => {
    if (formLocked) {
      toast.error('Form is locked — registrations already received');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/organizer/events/${id}`, { customRegistrationForm: formFields });
      toast.success('Registration form saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  // ── Save editable event fields (published) ───────────────────────────────────
  const saveEventFields = async () => {
    setSaving(true);
    try {
      const payload = { description, eventTags };
      if (event.status === 'DRAFT' || event.status === 'PUBLISHED') {
        if (registrationDeadline) payload.registrationDeadline = registrationDeadline;
        if (registrationLimit !== '') payload.registrationLimit = parseInt(registrationLimit) || null;
      }
      await api.put(`/organizer/events/${id}`, payload);
      toast.success('Event updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      await api.put(`/organizer/events/${id}/publish`);
      toast.success('Event published successfully!');
      navigate('/organizer/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to publish event');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.put(`/organizer/events/${id}`, { status: newStatus });
      toast.success(`Event marked as ${newStatus}`);
      navigate('/organizer/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleCloseRegistrations = async () => {
    try {
      await api.put(`/organizer/events/${id}`, { registrationDeadline: new Date().toISOString() });
      toast.success('Registrations closed');
      fetchEvent();
    } catch (err) {
      toast.error('Failed to close registrations');
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex justify-center items-center h-screen text-gray-300">Loading...</div>
      </>
    );
  }

  const isDraft = event.status === 'DRAFT';
  const isPublished = event.status === 'PUBLISHED';
  const isOngoing = event.status === 'ONGOING';
  const isCompleted = event.status === 'COMPLETED';
  const canEditBasic = isDraft || isPublished;
  const canEditForm = isDraft;

  return (
    <>
      <Navbar />
      <div className="ml-64 pt-16 min-h-screen bg-gradient-to-br from-black via-dark-500 to-black">
        <div className="max-w-4xl mx-auto p-8 space-y-8">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary-500">{event.eventName}</h1>
              <span className={`mt-1 inline-block px-3 py-1 rounded-full text-xs font-semibold ${isDraft ? 'bg-yellow-900 text-yellow-300' :
                  isPublished ? 'bg-green-900 text-green-300' :
                    isOngoing ? 'bg-blue-900 text-blue-300' :
                      'bg-gray-700 text-gray-300'
                }`}>{event.status}</span>
            </div>
            <button onClick={() => navigate('/organizer/dashboard')}
              className="text-gray-400 hover:text-gray-200 text-sm">
              ← Back to Dashboard
            </button>
          </div>

          {/* ── Editable Event Fields ── */}
          {canEditBasic && (
            <div className="dark-card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-primary-400">
                {isDraft ? 'Event Details' : 'Editable Fields'}
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  rows="4"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500"
                />
              </div>

              {/* Tags */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">Event Tags</label>
                  <span className="text-xs text-gray-500">{eventTags.length} selected</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map(tag => {
                    const active = eventTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setEventTags(prev =>
                          active ? prev.filter(t => t !== tag) : [...prev, tag]
                        )}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Registration Deadline
                    {isPublished && <span className="text-xs text-gray-500 ml-1">(can only extend)</span>}
                  </label>
                  <input
                    type="datetime-local"
                    value={registrationDeadline}
                    onChange={(e) => setRegistrationDeadline(e.target.value)}
                    min={isPublished ? (event.registrationDeadline?.slice(0, 16) || '') : undefined}
                    className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Registration Limit
                    {isPublished && <span className="text-xs text-gray-500 ml-1">(can only increase)</span>}
                  </label>
                  <input
                    type="number"
                    min={isPublished ? (event.registrationLimit || 1) : 1}
                    value={registrationLimit}
                    onChange={(e) => setRegistrationLimit(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {isPublished && (
                  <button
                    onClick={handleCloseRegistrations}
                    className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-md text-sm"
                  >
                    Close Registrations
                  </button>
                )}
                <button
                  onClick={saveEventFields}
                  disabled={saving}
                  className="px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-md text-sm disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* ── Form Builder ── */}
          {canEditForm && (
            <div className="dark-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-primary-400">Custom Registration Form</h2>
                  {formLocked ? (
                    <p className="text-xs text-red-400 mt-1">
                      Form is locked — {analytics.totalRegistrations} registration(s) already received.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      Form will be locked once the first registration is received.
                    </p>
                  )}
                </div>
                {!formLocked && (
                  <button
                    onClick={openAddField}
                    className="px-3 py-1.5 bg-primary-700 hover:bg-primary-800 text-white text-sm rounded-md"
                  >
                    + Add Field
                  </button>
                )}
              </div>

              {/* Field list */}
              {formFields.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No custom fields. Add fields to collect extra info during registration.</p>
              ) : (
                <div className="space-y-2">
                  {formFields.map((field, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-dark-200 border border-primary-900 rounded-lg px-4 py-3">
                      <div className="flex flex-col gap-1 mr-1">
                        <button
                          disabled={formLocked || idx === 0}
                          onClick={() => moveField(idx, -1)}
                          className="text-gray-400 hover:text-primary-400 disabled:opacity-30 text-xs leading-none"
                          title="Move up"
                        >▲</button>
                        <button
                          disabled={formLocked || idx === formFields.length - 1}
                          onClick={() => moveField(idx, 1)}
                          className="text-gray-400 hover:text-primary-400 disabled:opacity-30 text-xs leading-none"
                          title="Move down"
                        >▼</button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-200 font-medium text-sm truncate">{field.label}</span>
                          {field.required && (
                            <span className="text-xs bg-red-900 text-red-300 px-1.5 py-0.5 rounded">Required</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          <span className="capitalize">{FIELD_TYPES.find(t => t.value === field.fieldType)?.label || field.fieldType}</span>
                          {field.placeholder && <span className="ml-2 italic">· "{field.placeholder}"</span>}
                          {field.options?.length > 0 && (
                            <span className="ml-2">· Options: {field.options.join(', ')}</span>
                          )}
                        </div>
                      </div>
                      {!formLocked && (
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => openEditField(idx)}
                            className="text-xs text-primary-400 hover:text-primary-300"
                          >Edit</button>
                          <button
                            onClick={() => removeField(idx)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >Remove</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add/Edit field panel */}
              {addingField && !formLocked && (
                <div className="bg-dark-300 border border-primary-700 rounded-lg p-5 space-y-4 mt-2">
                  <h3 className="text-sm font-semibold text-primary-300">
                    {editingIdx !== null ? 'Edit Field' : 'New Field'}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Field Name (key) *</label>
                      <input
                        type="text"
                        value={newField.fieldName}
                        onChange={(e) => setNewField({ ...newField, fieldName: e.target.value.replace(/\s/g, '_') })}
                        placeholder="e.g. tshirt_size"
                        className="w-full px-3 py-1.5 bg-dark-50 border border-primary-900 text-gray-200 text-sm rounded-md focus:outline-none focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Label (shown to user) *</label>
                      <input
                        type="text"
                        value={newField.label}
                        onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                        placeholder="e.g. T-Shirt Size"
                        className="w-full px-3 py-1.5 bg-dark-50 border border-primary-900 text-gray-200 text-sm rounded-md focus:outline-none focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Field Type *</label>
                      <select
                        value={newField.fieldType}
                        onChange={(e) => setNewField({ ...newField, fieldType: e.target.value, options: [] })}
                        className="w-full px-3 py-1.5 bg-dark-50 border border-primary-900 text-gray-200 text-sm rounded-md focus:outline-none focus:ring-primary-500"
                      >
                        {FIELD_TYPES.map(t => (
                          <option key={t.value} value={t.value} className="bg-dark-100">{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Placeholder</label>
                      <input
                        type="text"
                        value={newField.placeholder}
                        onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                        className="w-full px-3 py-1.5 bg-dark-50 border border-primary-900 text-gray-200 text-sm rounded-md focus:outline-none focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  {/* Options (dropdown / checkbox) */}
                  {['dropdown', 'checkbox'].includes(newField.fieldType) && (
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Options *</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={optionInput}
                          onChange={(e) => setOptionInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                          placeholder="Type option and press Enter"
                          className="flex-1 px-3 py-1.5 bg-dark-50 border border-primary-900 text-gray-200 text-sm rounded-md focus:outline-none focus:ring-primary-500"
                        />
                        <button
                          type="button"
                          onClick={addOption}
                          className="px-3 py-1.5 bg-primary-700 text-white text-sm rounded-md hover:bg-primary-800"
                        >Add</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {newField.options.map((opt, oi) => (
                          <span key={oi} className="flex items-center gap-1 bg-dark-100 border border-primary-800 text-gray-300 text-xs px-2 py-0.5 rounded-full">
                            {opt}
                            <button onClick={() => removeOption(oi)} className="text-red-400 hover:text-red-300 ml-1">×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Required toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newField.required}
                      onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                      className="w-4 h-4 rounded border-primary-900 bg-dark-50 text-primary-600 focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-300">Mark as required</span>
                  </label>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setAddingField(false)}
                      className="px-3 py-1.5 border border-primary-700 text-gray-300 text-sm rounded-md hover:bg-dark-200"
                    >Cancel</button>
                    <button
                      onClick={saveField}
                      className="px-3 py-1.5 bg-primary-700 text-white text-sm rounded-md hover:bg-primary-800"
                    >{editingIdx !== null ? 'Update Field' : 'Add Field'}</button>
                  </div>
                </div>
              )}

              {/* Save form button */}
              {!formLocked && (
                <div className="flex justify-end pt-2 border-t border-primary-900">
                  <button
                    onClick={saveForm}
                    disabled={saving}
                    className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-800 text-white text-sm rounded-md hover:from-primary-700 hover:to-primary-900 disabled:opacity-50 shadow-lg"
                  >
                    {saving ? 'Saving…' : 'Save Form'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Readonly form preview (published+) ── */}
          {!canEditForm && event.customRegistrationForm?.length > 0 && (
            <div className="dark-card p-6">
              <h2 className="text-lg font-semibold text-primary-400 mb-3">Registration Form (locked)</h2>
              <div className="space-y-2">
                {event.customRegistrationForm.map((field, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-dark-200 border border-primary-900 rounded-lg px-4 py-2">
                    <span className="text-gray-200 text-sm flex-1">{field.label}</span>
                    <span className="text-xs text-gray-500 capitalize">{FIELD_TYPES.find(t => t.value === field.fieldType)?.label || field.fieldType}</span>
                    {field.required && <span className="text-xs bg-red-900 text-red-300 px-1.5 py-0.5 rounded">Required</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Status Actions ── */}
          <div className="dark-card p-6 space-y-3">
            <h2 className="text-lg font-semibold text-primary-400">Actions</h2>
            <div className="flex flex-wrap gap-3">
              {isDraft && (
                <button
                  onClick={handlePublish}
                  className="px-5 py-2 bg-green-700 hover:bg-green-800 text-white font-semibold rounded-lg"
                >
                  Publish Event
                </button>
              )}
              {(isOngoing || isPublished) && (
                <button
                  onClick={() => handleStatusChange('COMPLETED')}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg"
                >
                  Mark as Completed
                </button>
              )}
              {(isOngoing || isPublished || isCompleted) && (
                <button
                  onClick={() => handleStatusChange('CLOSED')}
                  className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg"
                >
                  Close Event
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default EditEvent;
