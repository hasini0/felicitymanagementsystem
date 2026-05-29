const express = require('express');
const router = express.Router();
const Organizer = require('../models/Organizer');
const Admin = require('../models/Admin');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const Participant = require('../models/Participant');
const { protect, authorize, generateToken } = require('../middleware/auth');
const { sendPasswordResetEmail, sendEmail } = require('../utils/emailService');
const crypto = require('crypto');

// @route   POST /api/admin/organizers
// @desc    Create new organizer account
// @access  Private (Admin)
router.post('/organizers', protect, authorize('admin'), async (req, res) => {
  try {
    const { organizerName, email, category, description, contactEmail } = req.body;

    // Check if organizer already exists
    const existingOrganizer = await Organizer.findOne({ $or: [{ email }, { organizerName }] });
    if (existingOrganizer) {
      return res.status(400).json({ success: false, message: 'Organizer with this email or name already exists' });
    }

    // Generate random password
    const password = crypto.randomBytes(8).toString('hex');

    const organizer = new Organizer({
      organizerName,
      email,
      password,
      category,
      description,
      contactEmail,
      createdBy: req.userId,
      isApproved: true
    });

    await organizer.save();

    // In production, send email with credentials
    console.log(`Organizer created: ${email} / ${password}`);

    res.status(201).json({
      success: true,
      message: 'Organizer account created successfully',
      data: {
        organizerName: organizer.organizerName,
        email: organizer.email,
        temporaryPassword: password, // Send via secure channel in production
        category: organizer.category
      }
    });
  } catch (error) {
    console.error('Create organizer error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/admin/organizers
// @desc    Get all organizers
// @access  Private (Admin)
router.get('/organizers', protect, authorize('admin'), async (req, res) => {
  try {
    const organizers = await Organizer.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: organizers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/admin/organizers/:id
// @desc    Remove/disable organizer account
// @access  Private (Admin)
router.delete('/organizers/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);

    if (!organizer) {
      return res.status(404).json({ success: false, message: 'Organizer not found' });
    }

    // Option 1: Soft delete - disable account
    organizer.isApproved = false;
    await organizer.save();

    // Option 2: Hard delete (commented out - can uncomment if needed)
    // await Organizer.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Organizer account disabled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/organizers/:id/restore
// @desc    Restore/enable organizer account
// @access  Private (Admin)
router.put('/organizers/:id/restore', protect, authorize('admin'), async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);

    if (!organizer) {
      return res.status(404).json({ success: false, message: 'Organizer not found' });
    }

    organizer.isApproved = true;
    await organizer.save();

    res.json({ success: true, message: 'Organizer account restored successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/password-reset-requests
// @desc    Get all password reset requests (with filters)
// @access  Private (Admin)
router.get('/password-reset-requests', protect, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status: status.toUpperCase() } : {};

    const requests = await PasswordResetRequest.find(query)
      .populate('user', 'firstName lastName email organizerName')
      .populate('processedBy', 'username')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/password-reset-requests/:id/approve
// @desc    Approve password reset request
// @access  Private (Admin)
router.put('/password-reset-requests/:id/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const { comments } = req.body;
    const request = await PasswordResetRequest.findById(req.params.id)
      .populate('user', 'firstName lastName email organizerName');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    // Generate new password
    const newPassword = crypto.randomBytes(8).toString('hex');

    // Update user password
    let user;
    if (request.userModel === 'Participant') {
      user = await Participant.findById(request.user);
    } else {
      user = await Organizer.findById(request.user);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    // Update request
    request.status = 'APPROVED';
    request.newPassword = newPassword;
    request.adminComments = comments || 'Password reset approved';
    request.processedBy = req.userId;
    request.processedAt = new Date();
    await request.save();

    // Send email with new password
    const userName = request.userModel === 'Organizer' ? user.organizerName : `${user.firstName} ${user.lastName}`;
    await sendPasswordResetEmail(request.email, newPassword, userName);

    res.json({ 
      success: true, 
      message: 'Password reset approved and email sent',
      newPassword // Send via secure channel in production
    });
  } catch (error) {
    console.error('Approve reset error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/password-reset-requests/:id/reject
// @desc    Reject password reset request
// @access  Private (Admin)
router.put('/password-reset-requests/:id/reject', protect, authorize('admin'), async (req, res) => {
  try {
    const { comments } = req.body;
    const request = await PasswordResetRequest.findById(req.params.id)
      .populate('user', 'firstName lastName email organizerName');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    request.status = 'REJECTED';
    request.adminComments = comments || 'Request denied';
    request.processedBy = req.userId;
    request.processedAt = new Date();
    await request.save();

    // Send rejection email
    const userName = request.userModel === 'Organizer' 
      ? request.user.organizerName 
      : `${request.user.firstName} ${request.user.lastName}`;
    
    await sendEmail(
      request.email,
      'Password Reset Request Rejected',
      `Dear ${userName},\n\nYour password reset request has been rejected.\n\nReason: ${comments || 'No reason provided'}\n\nPlease contact support for assistance.`
    );

    res.json({ success: true, message: 'Password reset request rejected' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin)
router.get('/dashboard', protect, authorize('admin'), async (req, res) => {
  try {
    const Event = require('../models/Event');

    const totalParticipants = await Participant.countDocuments();
    const totalOrganizers = await Organizer.countDocuments();
    const totalEvents = await Event.countDocuments();
    const pendingResetRequests = await PasswordResetRequest.countDocuments({ status: 'PENDING' });

    res.json({
      success: true,
      data: {
        totalParticipants,
        totalOrganizers,
        totalEvents,
        pendingResetRequests
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
