import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const INTEREST_OPTIONS = [
  'Technical', 'Cultural', 'Sports', 'Music', 'Dance',
  'Drama', 'Gaming', 'Hackathon', 'Workshop', 'Social', 'Business', 'Art'
];

const ChipGrid = ({ options, selected, onToggle, keyProp = null, readOnly = false }) => (
  <div className="flex flex-wrap gap-2 mt-2">
    {options.map(opt => {
      const key = keyProp ? opt[keyProp] : opt;
      const label = keyProp ? (opt.organizerName || opt.label) : opt;
      const sub = keyProp ? opt.category : null;
      const active = selected.includes(key);
      if (readOnly && !active) return null;
      return (
        <button
          key={key}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onToggle(key)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all flex items-center gap-1 ${active
            ? 'bg-primary-700 border-primary-500 text-white'
            : 'bg-dark-200 border-primary-900 text-gray-400 hover:border-primary-600 hover:text-gray-200'
            } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
        >
          {active && !readOnly && <span className="text-xs">✓</span>}
          {label}
          {sub && <span className="text-xs opacity-70 ml-1">· {sub.replace('_', ' ')}</span>}
        </button>
      );
    })}
  </div>
);

const ParticipantProfile = () => {
  const [profile, setProfile] = useState(null);
  const [allClubs, setAllClubs] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [formData, setFormData] = useState({});
  const [draftInterests, setDraftInterests] = useState([]);
  const [draftClubs, setDraftClubs] = useState([]);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    fetchProfile();
    api.get('/auth/organizers').then(res => {
      if (res.data.success) setAllClubs(res.data.data);
    }).catch(() => { });
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/participant/profile');
      if (response.data.success) {
        const data = response.data.data;
        setProfile(data);
        setFormData({
          firstName: data.firstName,
          lastName: data.lastName,
          contactNumber: data.contactNumber,
          college: data.college || '',
          organizationName: data.organizationName || '',
        });
        setDraftInterests(data.areasOfInterest || []);
        setDraftClubs((data.followedClubs || []).map(c => c._id || c));
      }
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put('/participant/profile', formData);
      if (response.data.success) {
        toast.success('Profile updated');
        setProfile(response.data.data);
        setEditing(false);
      }
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    try {
      const response = await api.put('/participant/profile', {
        areasOfInterest: draftInterests,
        followedClubs: draftClubs,
      });
      if (response.data.success) {
        toast.success('Preferences saved');
        setProfile(response.data.data);
        setEditingPrefs(false);
      }
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await api.put('/participant/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success('Password changed successfully');
      setChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    }
  };

  const toggleInterest = (val) =>
    setDraftInterests(prev => prev.includes(val) ? prev.filter(i => i !== val) : [...prev, val]);

  const toggleClub = (id) =>
    setDraftClubs(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  const inputCls = "w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500";

  if (loading) return (
    <>
      <Navbar />
      <div className="ml-64 pt-16 flex justify-center items-center h-screen bg-black">
        <div className="text-xl text-primary-500 animate-pulse">Loading...</div>
      </div>
    </>
  );

  const followedClubIds = (profile.followedClubs || []).map(c => c._id || c);

  return (
    <>
      <Navbar />
      <div className="ml-64 pt-16 min-h-screen bg-gradient-to-br from-black via-dark-500 to-black">
        <div className="max-w-5xl mx-auto p-8 space-y-6">
          <h1 className="text-4xl font-bold text-primary-500">My Profile</h1>

          {/* ── Profile Info ── */}
          <div className="dark-card p-8 border border-primary-900/30">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-primary-400">Profile Information</h2>
              {!editing && (
                <button onClick={() => setEditing(true)} className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-md hover:from-primary-700 hover:to-primary-900 transition-all shadow-lg">
                  Edit Profile
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Non-editable fields */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Email Address <span className="text-xs text-gray-600">(non-editable)</span></label>
                    <div className="w-full px-3 py-2 border border-dark-200 bg-dark-200/50 text-gray-500 rounded-md text-sm">{profile.email}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Participant Type <span className="text-xs text-gray-600">(non-editable)</span></label>
                    <div className="w-full px-3 py-2 border border-dark-200 bg-dark-200/50 text-gray-500 rounded-md text-sm">{profile.participantType?.replace('_', ' ')}</div>
                  </div>
                  {/* Editable fields */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">First Name</label>
                    <input type="text" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Last Name</label>
                    <input type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Contact Number</label>
                    <input type="tel" value={formData.contactNumber} onChange={e => setFormData({ ...formData, contactNumber: e.target.value })} className={inputCls} />
                  </div>
                  {profile.participantType === 'NON_IIIT' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">College/Organization</label>
                      <input type="text" value={formData.college} onChange={e => setFormData({ ...formData, college: e.target.value })} className={inputCls} />
                    </div>
                  )}
                </div>
                <div className="flex space-x-3 pt-4">
                  <button type="submit" className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-md hover:from-primary-700 hover:to-primary-900 transition-all shadow-lg">Save Changes</button>
                  <button type="button" onClick={() => setEditing(false)} className="px-6 py-2 border border-primary-700 text-gray-300 rounded-md hover:bg-dark-200 transition-all">Cancel</button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><p className="text-sm font-medium text-gray-400 mb-1">Name</p><p className="text-gray-200 text-lg">{profile.firstName} {profile.lastName}</p></div>
                <div><p className="text-sm font-medium text-gray-400 mb-1">Email</p><p className="text-gray-200 text-lg">{profile.email}</p></div>
                <div><p className="text-sm font-medium text-gray-400 mb-1">Participant Type</p><p className="text-gray-200 text-lg">{profile.participantType.replace('_', ' ')}</p></div>
                <div><p className="text-sm font-medium text-gray-400 mb-1">Contact Number</p><p className="text-gray-200 text-lg">{profile.contactNumber}</p></div>
                {profile.college && <div><p className="text-sm font-medium text-gray-400 mb-1">College</p><p className="text-gray-200 text-lg">{profile.college}</p></div>}
              </div>
            )}
          </div>

          {/* ── Preferences ── */}
          <div className="dark-card p-8 border border-primary-900/30">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-primary-400">Preferences</h2>
                <p className="text-xs text-gray-500 mt-1">These influence event ordering in Browse Events</p>
              </div>
              {!editingPrefs && (
                <button
                  onClick={() => {
                    setDraftInterests(profile.areasOfInterest || []);
                    setDraftClubs(followedClubIds);
                    setEditingPrefs(true);
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-md hover:from-primary-700 hover:to-primary-900 transition-all shadow-lg"
                >
                  Edit Preferences
                </button>
              )}
            </div>

            {/* Areas of Interest */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-300">Areas of Interest</h3>
                {editingPrefs && <span className="text-xs text-gray-500">{draftInterests.length} selected</span>}
              </div>
              {editingPrefs ? (
                <ChipGrid options={INTEREST_OPTIONS} selected={draftInterests} onToggle={toggleInterest} />
              ) : (
                (profile.areasOfInterest || []).length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.areasOfInterest.map(i => (
                      <span key={i} className="px-3 py-1.5 rounded-full text-sm font-medium bg-primary-700 border border-primary-500 text-white">{i}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm mt-2">No interests selected — <button onClick={() => setEditingPrefs(true)} className="text-primary-400 hover:text-primary-300 underline">add some</button></p>
                )
              )}
            </div>

            {/* Clubs to Follow */}
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-300">Clubs / Organizers Following</h3>
                {editingPrefs && <span className="text-xs text-gray-500">{draftClubs.length} selected</span>}
              </div>
              {editingPrefs ? (
                <ChipGrid
                  options={allClubs.map(c => ({ ...c, _id: c._id }))}
                  selected={draftClubs}
                  onToggle={toggleClub}
                  keyProp="_id"
                />
              ) : (
                (profile.followedClubs || []).length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.followedClubs.map(c => (
                      <span key={c._id || c} className="px-3 py-1.5 rounded-full text-sm font-medium bg-primary-700 border border-primary-500 text-white">
                        {c.organizerName || c}
                        {c.category && <span className="text-xs opacity-70 ml-1">· {c.category.replace('_', ' ')}</span>}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm mt-2">Not following any clubs — <button onClick={() => setEditingPrefs(true)} className="text-primary-400 hover:text-primary-300 underline">follow some</button></p>
                )
              )}
            </div>

            {editingPrefs && (
              <div className="flex space-x-3 mt-6 pt-4 border-t border-primary-900">
                <button onClick={handleSavePrefs} disabled={savingPrefs} className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-md hover:from-primary-700 hover:to-primary-900 transition-all shadow-lg disabled:opacity-50">
                  {savingPrefs ? 'Saving...' : 'Save Preferences'}
                </button>
                <button onClick={() => setEditingPrefs(false)} className="px-6 py-2 border border-primary-700 text-gray-300 rounded-md hover:bg-dark-200 transition-all">Cancel</button>
              </div>
            )}
          </div>

          {/* ── Change Password ── */}
          <div className="dark-card p-8 border border-primary-900/30">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-primary-400">Security Settings</h2>
              {!changingPassword && (
                <button onClick={() => setChangingPassword(true)} className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-md hover:from-primary-700 hover:to-primary-900 transition-all shadow-lg">
                  Change Password
                </button>
              )}
            </div>
            {changingPassword ? (
              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                {[['Current Password', 'currentPassword'], ['New Password', 'newPassword'], ['Confirm New Password', 'confirmPassword']].map(([label, key]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
                    <input type="password" value={passwordData[key]} onChange={e => setPasswordData({ ...passwordData, [key]: e.target.value })} className={inputCls} required minLength="6" />
                  </div>
                ))}
                <div className="flex space-x-3 pt-4">
                  <button type="submit" className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-md hover:from-primary-700 hover:to-primary-900 transition-all shadow-lg">Update Password</button>
                  <button type="button" onClick={() => setChangingPassword(false)} className="px-6 py-2 border border-primary-700 text-gray-300 rounded-md hover:bg-dark-200 transition-all">Cancel</button>
                </div>
              </form>
            ) : (
              <p className="text-gray-400">Click "Change Password" to update your security credentials.</p>
            )}
          </div>

        </div>
      </div>
    </>
  );
};

export default ParticipantProfile;
