const express = require('express');
const router = express.Router();
const axios = require('axios');
const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');
const Admin = require('../models/Admin');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const { generateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET || '0x0000000000000000000000000000000000000000';

const verifyCaptcha = async (token) => {
  if (!token) {
    console.log('[hCaptcha] No token provided');
    return false;
  }
  try {
    const params = new URLSearchParams();
    params.append('secret', HCAPTCHA_SECRET);
    params.append('response', token);
    const res = await axios.post('https://hcaptcha.com/siteverify', params);
    console.log('[hCaptcha] Response:', JSON.stringify(res.data));
    return res.data.success === true;
  } catch (err) {
    console.log('[hCaptcha] Error:', err.message);
    return false;
  }
};

// @route   POST /api/auth/register/participant
// @desc    Register a new participant
// @access  Public
router.post('/register/participant', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('participantType').isIn(['IIIT_STUDENT', 'NON_IIIT']).withMessage('Invalid participant type'),
  body('contactNumber').notEmpty().withMessage('Contact number is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { captchaToken } = req.body;
    const captchaOk = await verifyCaptcha(captchaToken);
    if (!captchaOk) {
      return res.status(400).json({ success: false, message: 'CAPTCHA verification failed. Please try again.' });
    }

    const { firstName, lastName, email, password, participantType, college, organizationName, contactNumber, areasOfInterest, clubsToFollow } = req.body;

    // Check if participant already exists
    const existingParticipant = await Participant.findOne({ email });
    if (existingParticipant) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Validate IIIT email for IIIT students
    if (participantType === 'IIIT_STUDENT' && !email.endsWith('@iiit.ac.in')) {
      return res.status(400).json({ success: false, message: 'IIIT students must use IIIT-issued email ID' });
    }

    // Create participant
    const participant = new Participant({
      firstName,
      lastName,
      email,
      password,
      participantType,
      college,
      organizationName,
      contactNumber,
      areasOfInterest: areasOfInterest || [],
      followedClubs: clubsToFollow || []
    });

    await participant.save();

    // Generate token
    const token = generateToken(participant._id, 'participant');

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: participant._id,
        firstName: participant.firstName,
        lastName: participant.lastName,
        email: participant.email,
        role: 'participant',
        participantType: participant.participantType
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login user (participant/organizer/admin)
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password, captchaToken } = req.body;

    const captchaOk = await verifyCaptcha(captchaToken);
    if (!captchaOk) {
      return res.status(400).json({ success: false, message: 'CAPTCHA verification failed. Please try again.' });
    }

    // Try to find user in all three collections
    let user = null;
    let role = null;

    // Check participant
    user = await Participant.findOne({ email }).select('+password');
    if (user) {
      role = 'participant';
    }

    // Check organizer if not found
    if (!user) {
      user = await Organizer.findOne({ email }).select('+password');
      if (user) {
        role = 'organizer';
      }
    }

    // Check admin if not found
    if (!user) {
      user = await Admin.findOne({ email }).select('+password');
      if (user) {
        role = 'admin';
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id, role);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        role,
        ...(role === 'participant' && {
          firstName: user.firstName,
          lastName: user.lastName,
          participantType: user.participantType
        }),
        ...(role === 'organizer' && {
          organizerName: user.organizerName,
          category: user.category
        })
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/auth/password-reset-request
// @desc    Request password reset
// @access  Public
router.post('/password-reset-request', [
  body('email').isEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email } = req.body;

    // Find user
    let user = await Participant.findOne({ email });
    let userModel = 'Participant';

    if (!user) {
      user = await Organizer.findOne({ email });
      userModel = 'Organizer';
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Create password reset request
    const resetRequest = new PasswordResetRequest({
      user: user._id,
      userModel,
      email
    });

    await resetRequest.save();

    res.json({
      success: true,
      message: 'Password reset request submitted. Admin will process it shortly.'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/auth/organizers
// @desc    Get all approved organizers (public — used on registration page)
// @access  Public
router.get('/organizers', async (req, res) => {
  try {
    const organizers = await Organizer.find({ isApproved: true })
      .select('organizerName category description');
    res.json({ success: true, data: organizers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
