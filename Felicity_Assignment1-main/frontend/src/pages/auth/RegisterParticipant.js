import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import HCaptcha from '@hcaptcha/react-hcaptcha';

const HCAPTCHA_SITE_KEY = process.env.REACT_APP_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001';

const INTEREST_OPTIONS = [
  'Technical', 'Cultural', 'Sports', 'Music', 'Dance',
  'Drama', 'Gaming', 'Hackathon', 'Workshop', 'Social', 'Business', 'Art'
];

const ChipGrid = ({ options, selected, onToggle, keyProp = null }) => (
  <div className="flex flex-wrap gap-2 mt-2">
    {options.map(opt => {
      const key = keyProp ? opt[keyProp] : opt;
      const label = keyProp ? opt.organizerName || opt.label : opt;
      const sub = keyProp ? opt.category : null;
      const active = selected.includes(key);
      return (
        <button
          key={key}
          type="button"
          onClick={() => onToggle(key)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all flex items-center gap-1 ${active
            ? 'bg-primary-700 border-primary-500 text-white shadow-md shadow-primary-900/40'
            : 'bg-dark-200 border-primary-900 text-gray-400 hover:border-primary-600 hover:text-gray-200'
            }`}
        >
          {active && <span className="text-xs">✓</span>}
          {label}
          {sub && <span className="text-xs opacity-70 ml-1">· {sub.replace('_', ' ')}</span>}
        </button>
      );
    })}
  </div>
);

const RegisterParticipant = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    participantType: 'IIIT_STUDENT',
    college: '',
    organizationName: '',
    contactNumber: '',
  });
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [selectedClubs, setSelectedClubs] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/auth/organizers').then(res => {
      if (res.data.success) setClubs(res.data.data);
    }).catch(() => { });
  }, []);

  const toggleInterest = (val) =>
    setSelectedInterests(prev => prev.includes(val) ? prev.filter(i => i !== val) : [...prev, val]);

  const toggleClub = (id) =>
    setSelectedClubs(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (formData.participantType === 'IIIT_STUDENT' && !formData.email.endsWith('@iiit.ac.in')) {
      toast.error('IIIT students must use IIIT-issued email ID');
      return;
    }
    setLoading(true);
    try {
      const dataToSend = { ...formData, areasOfInterest: selectedInterests, clubsToFollow: selectedClubs };
      delete dataToSend.confirmPassword;
      const response = await api.post('/auth/register/participant', { ...dataToSend, captchaToken });
      if (response.data.success) {
        login(response.data.user, response.data.token);
        toast.success('Registration successful!');
        navigate('/participant/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    }
  };

  const inputCls = "mt-1 block w-full px-3 py-2 border border-primary-900 bg-dark-50 text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm";

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-dark-500 to-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-gradient-to-br from-dark-100 to-black p-8 rounded-lg shadow-2xl border-2 border-primary-900">
        <div>
          <h2 className="text-center text-4xl font-extrabold text-primary-500">Participant Registration</h2>
          <p className="mt-2 text-center text-sm text-gray-400 tracking-wide">Create your account for FELICITY</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

            {/* Basic fields */}
            <div>
              <label className="block text-sm font-medium text-gray-300">First Name *</label>
              <input type="text" name="firstName" required className={inputCls} value={formData.firstName} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Last Name *</label>
              <input type="text" name="lastName" required className={inputCls} value={formData.lastName} onChange={handleChange} />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-300">Participant Type *</label>
              <select name="participantType" required className={inputCls} value={formData.participantType} onChange={handleChange}>
                <option value="IIIT_STUDENT" className="bg-dark-100">IIIT Student</option>
                <option value="NON_IIIT" className="bg-dark-100">Non-IIIT Participant</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-300">
                Email *
                {formData.participantType === 'IIIT_STUDENT' && <span className="text-xs text-gray-500"> (Must be @iiit.ac.in)</span>}
              </label>
              <input type="email" name="email" required className={inputCls} value={formData.email} onChange={handleChange} />
            </div>

            {formData.participantType === 'NON_IIIT' && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300">College/Organization *</label>
                <input type="text" name="college" required className={inputCls} value={formData.college} onChange={handleChange} />
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-300">Contact Number *</label>
              <input type="tel" name="contactNumber" required className={inputCls} value={formData.contactNumber} onChange={handleChange} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">Password * (min 6 characters)</label>
              <input type="password" name="password" required minLength="6" className={inputCls} value={formData.password} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Confirm Password *</label>
              <input type="password" name="confirmPassword" required minLength="6" className={inputCls} value={formData.confirmPassword} onChange={handleChange} />
            </div>

            {/* ── Areas of Interest ── */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-300">Areas of Interest</label>
                <span className="text-xs text-gray-500">Optional · {selectedInterests.length} selected</span>
              </div>
              <ChipGrid options={INTEREST_OPTIONS} selected={selectedInterests} onToggle={toggleInterest} />
            </div>

            {/* ── Clubs to Follow ── */}
            {clubs.length > 0 && (
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-300">Clubs / Organizers to Follow</label>
                  <span className="text-xs text-gray-500">Optional · {selectedClubs.length} selected</span>
                </div>
                <ChipGrid
                  options={clubs.map(c => ({ ...c, _id: c._id }))}
                  selected={selectedClubs}
                  onToggle={toggleClub}
                  keyProp="_id"
                />
              </div>
            )}

          </div>

          <div className="flex justify-center">
            <HCaptcha sitekey={HCAPTCHA_SITE_KEY} onVerify={t => setCaptchaToken(t)} onExpire={() => setCaptchaToken(null)} ref={captchaRef} theme="dark" />
          </div>

          <button
            type="submit"
            disabled={loading || !captchaToken}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-800 hover:from-primary-700 hover:to-primary-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary-500 hover:text-primary-400">Sign in</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterParticipant;
