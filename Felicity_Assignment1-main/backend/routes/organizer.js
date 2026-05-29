const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Organizer = require('../models/Organizer');
const Participant = require('../models/Participant');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const { protect, authorize } = require('../middleware/auth');
const { postToDiscord } = require('../utils/discordWebhook');
const { sendEmail } = require('../utils/emailService');

// @route   GET /api/organizer/profile
// @desc    Get organizer profile
// @access  Private (Organizer)
router.get('/profile', protect, authorize('organizer'), async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.userId).select('-password');
    res.json({ success: true, data: organizer });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/organizer/profile
// @desc    Update organizer profile
// @access  Private (Organizer)
router.put('/profile', protect, authorize('organizer'), async (req, res) => {
  try {
    const { organizerName, description, contactEmail, discordWebhook, category } = req.body;

    const organizer = await Organizer.findById(req.userId);

    if (organizerName) organizer.organizerName = organizerName;
    if (description) organizer.description = description;
    if (contactEmail) organizer.contactEmail = contactEmail;
    if (category) organizer.category = category;
    if (discordWebhook !== undefined) organizer.discordWebhook = discordWebhook;

    await organizer.save();

    res.json({ success: true, message: 'Profile updated successfully', data: organizer });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/organizer/dashboard
// @desc    Get organizer dashboard data
// @access  Private (Organizer)
router.get('/dashboard', protect, authorize('organizer'), async (req, res) => {
  try {
    const Team = require('../models/Team');
    const events = await Event.find({ organizer: req.userId }).sort({ createdAt: -1 });

    // Dynamically calculate registration counts for each event
    const eventsWithCounts = await Promise.all(events.map(async (e) => {
      let registrationCount = 0;

      if (e.isTeamEvent) {
        const completeTeams = await Team.find({ event: e._id, status: 'COMPLETE' });
        registrationCount = completeTeams.reduce((sum, team) =>
          sum + team.members.filter(m => m.status === 'ACCEPTED').length, 0);
      } else {
        const Participant = require('../models/Participant');
        registrationCount = await Participant.countDocuments({
          'registeredEvents': { $elemMatch: { event: e._id, status: { $in: ['REGISTERED', 'COMPLETED'] } } }
        });
      }

      return {
        _id: e._id,
        eventName: e.eventName,
        eventType: e.eventType,
        isTeamEvent: e.isTeamEvent,
        status: e.status,
        eventStartDate: e.eventStartDate,
        eventEndDate: e.eventEndDate,
        registrationCount,
        registrationLimit: e.registrationLimit,
        // Use stored totalRevenue (accurately updated by QR scan)
        totalRevenue: e.totalRevenue || 0,
        attendanceCount: e.attendanceCount || 0
      };
    }));

    // Analytics across ALL events (not just completed)
    const totalRegistrations = eventsWithCounts.reduce((sum, e) => sum + e.registrationCount, 0);
    const totalRevenue = eventsWithCounts.reduce((sum, e) => sum + (e.totalRevenue || 0), 0);
    const totalAttendance = eventsWithCounts.reduce((sum, e) => sum + (e.attendanceCount || 0), 0);
    const completedEvents = eventsWithCounts.filter(e => e.status === 'COMPLETED');

    res.json({
      success: true,
      data: {
        events: eventsWithCounts,
        analytics: {
          totalEvents: events.length,
          completedEvents: completedEvents.length,
          totalRegistrations,
          totalRevenue,
          totalAttendance
        }
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/organizer/events
// @desc    Create new event (draft)
// @access  Private (Organizer)
router.post('/events', protect, authorize('organizer'), async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.userId);

    const event = new Event({
      ...req.body,
      organizer: req.userId,
      organizerId: organizer.organizerName,
      status: 'DRAFT'
    });

    await event.save();

    res.status(201).json({
      success: true,
      message: 'Event created as draft',
      data: event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/organizer/events/:id
// @desc    Update event
// @access  Private (Organizer)
router.put('/events/:id', protect, authorize('organizer'), async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, organizer: req.userId });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found or unauthorized' });
    }

    // Don't allow field edits on completed/closed events (only status changes permitted)
    const onlyStatusChange = Object.keys(req.body).every(k => k === 'status');
    if (['COMPLETED', 'CLOSED'].includes(event.status) && !onlyStatusChange) {
      return res.status(400).json({ success: false, message: 'Cannot edit completed/closed events' });
    }

    // Validate status transitions
    if (req.body.status && req.body.status !== event.status) {
      const validTransitions = {
        DRAFT: ['PUBLISHED'],
        PUBLISHED: ['COMPLETED', 'CLOSED'],
        ONGOING: ['COMPLETED', 'CLOSED'],
        COMPLETED: ['CLOSED'],
        CLOSED: []
      };
      if (!(validTransitions[event.status] || []).includes(req.body.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot transition event from ${event.status} to ${req.body.status}`
        });
      }
    }

    // Lock customRegistrationForm once any registration has been received
    if (req.body.customRegistrationForm !== undefined) {
      const registrationCount = await Participant.countDocuments({ 'registeredEvents.event': event._id });
      if (registrationCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Registration form is locked — participants have already registered for this event'
        });
      }
    }

    // Update allowed fields
    const allowedUpdates = [
      'eventName', 'description', 'eventType', 'eligibility',
      'registrationDeadline', 'eventStartDate', 'eventEndDate',
      'registrationLimit', 'registrationFee', 'eventTags',
      'customRegistrationForm', 'merchandiseItems', 'purchaseLimitPerParticipant',
      'imageUrl', 'status'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        event[field] = req.body[field];
      }
    });

    await event.save();

    res.json({ success: true, message: 'Event updated successfully', data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/organizer/events/:id/publish
// @desc    Publish event
// @access  Private (Organizer)
router.put('/events/:id/publish', protect, authorize('organizer'), async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, organizer: req.userId });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found or unauthorized' });
    }

    if (event.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Only draft events can be published' });
    }

    event.status = 'PUBLISHED';
    await event.save();

    // Post to Discord if webhook is configured
    const organizer = await Organizer.findById(req.userId);
    if (organizer.discordWebhook) {
      await postToDiscord(organizer.discordWebhook, event);
    }

    res.json({ success: true, message: 'Event published successfully', data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/organizer/events/:id
// @desc    Get event details with participants
// @access  Private (Organizer)
router.get('/events/:id', protect, authorize('organizer'), async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, organizer: req.userId });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found or unauthorized' });
    }

    // Build a Set of attended participantIds for quick lookup
    const attendedIds = new Set(event.attendanceRecords.map(r => r.participant.toString()));

    // Get participants
    let eventParticipants = [];
    let participants = [];

    if (event.isTeamEvent) {
      // For team events: build participant list from Team model, grouped by team
      const Team = require('../models/Team');
      const completeTeams = await Team.find({ event: event._id, status: 'COMPLETE' })
        .populate('members.participant', 'firstName lastName email contactNumber registeredEvents')
        .sort('teamName');

      for (const team of completeTeams) {
        for (const member of team.members.filter(m => m.status === 'ACCEPTED')) {
          const p = member.participant;
          if (!p) continue;
          const registration = p.registeredEvents?.find(
            reg => reg.event.toString() === event._id.toString()
          );
          eventParticipants.push({
            name: `${p.firstName} ${p.lastName}`,
            email: p.email,
            contactNumber: p.contactNumber,
            registrationDate: registration?.registrationDate || team.createdAt,
            status: registration?.status || 'REGISTERED',
            teamName: team.teamName,
            paymentStatus: registration?.paymentStatus || 'PAID',
            ticketId: registration?.ticketId || ''
          });
        }
      }
    } else {
      participants = await Participant.find({
        'registeredEvents.event': event._id
      }).select('firstName lastName email contactNumber registeredEvents');

      eventParticipants = participants.map(p => {
        const registration = p.registeredEvents.find(
          reg => reg.event.toString() === event._id.toString()
        );
        return {
          name: `${p.firstName} ${p.lastName}`,
          email: p.email,
          contactNumber: p.contactNumber,
          registrationDate: registration.registrationDate,
          status: registration.status,
          teamName: null,
          paymentStatus: registration.paymentStatus,
          paymentProof: registration.paymentProof || null,
          ticketId: registration.ticketId,
          merchandiseItems: registration.merchandiseItems || [],
          attended: attendedIds.has(p._id.toString())
        };
      });
    }

    // Dynamic registration count and revenue
    let dynamicRegistrationCount = 0;
    let dynamicTeamRegistrations = null; // only set for team events
    let dynamicRevenue = 0;
    if (event.isTeamEvent) {
      const Team = require('../models/Team');
      const completeTeams = await Team.find({ event: event._id, status: 'COMPLETE' });
      dynamicTeamRegistrations = completeTeams.length; // number of teams
      const totalMembers = completeTeams.reduce((sum, team) => {
        return sum + team.members.filter(m => m.status === 'ACCEPTED').length;
      }, 0);
      dynamicRegistrationCount = totalMembers;
      dynamicRevenue = event.totalRevenue || 0; // use stored revenue
    } else {
      dynamicRegistrationCount = participants.filter(p =>
        p.registeredEvents.some(reg =>
          reg.event.toString() === event._id.toString() &&
          ['REGISTERED', 'COMPLETED'].includes(reg.status)
        )
      ).length;
      // Use stored totalRevenue (updated accurately by QR scan on attendance)
      dynamicRevenue = event.totalRevenue || 0;
    }

    res.json({
      success: true,
      data: {
        event,
        participants: eventParticipants,
        analytics: {
          totalRegistrations: dynamicRegistrationCount,
          teamRegistrations: dynamicTeamRegistrations,
          totalRevenue: dynamicRevenue,
          attendanceCount: event.attendanceCount
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/organizer/events/:id/participants/export
// @desc    Export participants as CSV data
// @access  Private (Organizer)
router.get('/events/:id/participants/export', protect, authorize('organizer'), async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, organizer: req.userId });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found or unauthorized' });
    }

    const participants = await Participant.find({
      'registeredEvents.event': event._id
    }).select('firstName lastName email contactNumber registeredEvents');

    const csvData = participants.map(p => {
      const registration = p.registeredEvents.find(
        reg => reg.event.toString() === event._id.toString()
      );
      return {
        Name: `${p.firstName} ${p.lastName}`,
        Email: p.email,
        'Contact Number': p.contactNumber,
        'Registration Date': new Date(registration.registrationDate).toLocaleDateString(),
        Status: registration.status,
        'Team Name': registration.teamName || 'N/A',
        'Payment Status': registration.paymentStatus,
        'Ticket ID': registration.ticketId
      };
    });

    res.json({ success: true, data: csvData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/organizer/events/ongoing
// @desc    Get ongoing events
// @access  Private (Organizer)
router.get('/events-ongoing', protect, authorize('organizer'), async (req, res) => {
  try {
    const now = new Date();
    const events = await Event.find({
      organizer: req.userId,
      status: 'PUBLISHED',
      eventStartDate: { $lte: now },
      eventEndDate: { $gte: now }
    });

    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/organizer/request-password-reset
// @desc    Request password reset (requires admin approval)
// @access  Private (Organizer)
router.post('/request-password-reset', protect, authorize('organizer'), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Reason for password reset is required' });
    }

    const organizer = await Organizer.findById(req.userId);
    if (!organizer) {
      return res.status(404).json({ success: false, message: 'Organizer not found' });
    }

    // Check if there's already a pending request
    const existingRequest = await PasswordResetRequest.findOne({
      user: req.userId,
      userModel: 'Organizer',
      status: 'PENDING'
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending password reset request'
      });
    }

    // Create password reset request
    const resetRequest = await PasswordResetRequest.create({
      user: req.userId,
      userModel: 'Organizer',
      email: organizer.email,
      clubName: organizer.organizerName,
      reason,
      status: 'PENDING'
    });

    // Notify admin (you can implement email notification here)
    await sendEmail(
      process.env.ADMIN_EMAIL || 'admin@felicity.com',
      'New Password Reset Request',
      `Organizer ${organizer.organizerName} has requested a password reset.\n\nReason: ${reason}`
    );

    res.status(201).json({
      success: true,
      message: 'Password reset request submitted. An admin will review it shortly.',
      request: {
        id: resetRequest._id,
        status: resetRequest.status,
        createdAt: resetRequest.createdAt
      }
    });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/organizer/password-reset-requests
// @desc    Get my password reset requests
// @access  Private (Organizer)
router.get('/password-reset-requests', protect, authorize('organizer'), async (req, res) => {
  try {
    const requests = await PasswordResetRequest.find({
      user: req.userId,
      userModel: 'Organizer'
    })
      .populate('processedBy', 'username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: requests.map(req => ({
        id: req._id,
        reason: req.reason,
        status: req.status,
        adminComments: req.adminComments,
        processedBy: req.processedBy ? req.processedBy.username : null,
        processedAt: req.processedAt,
        createdAt: req.createdAt
      }))
    });
  } catch (error) {
    console.error('Get password reset requests error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
