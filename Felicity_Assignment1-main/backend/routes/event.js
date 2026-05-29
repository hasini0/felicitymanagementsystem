const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Participant = require('../models/Participant');
const Team = require('../models/Team');
const { protect, authorize } = require('../middleware/auth');
const { sendEmail } = require('../utils/emailService');

// @route   GET /api/events
// @desc    Get all published events (public browsing)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const events = await Event.find({ status: 'PUBLISHED' })
      .populate('organizer', 'organizerName category')
      .sort({ eventStartDate: 1 });

    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/events/:id
// @desc    Get single event by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'organizerName category description contactEmail');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/events/:id/scan-qr
// @desc    Scan QR code for attendance tracking
// @access  Organizer only
router.post('/:id/scan-qr', protect, authorize('organizer'), async (req, res) => {
  try {
    const { qrData } = req.body;
    const eventId = req.params.id;

    // Parse QR data
    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (error) {
      return res.status(400).json({ success: false, message: 'Invalid QR code format' });
    }

    const { ticketId, eventId: qrEventId, participantId, teamId } = parsedData;

    // Validate event ID matches
    if (qrEventId !== eventId) {
      return res.status(400).json({ success: false, message: 'QR code is for a different event' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check if organizer owns this event
    if (event.organizer.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to scan for this event' });
    }

    // Check if event is currently ongoing
    const now = new Date();
    if (now < new Date(event.eventStartDate) || now > new Date(event.eventEndDate)) {
      return res.status(400).json({ success: false, message: 'Attendance can only be tracked during the event window' });
    }

    // Check if already scanned
    const alreadyScanned = event.attendanceRecords.some(
      record => record.participant.toString() === participantId
    );

    if (alreadyScanned) {
      return res.status(400).json({
        success: false,
        message: 'Participant already marked as attended',
        duplicate: true
      });
    }

    // Verify participant
    const participant = await Participant.findById(participantId);
    if (!participant) {
      return res.status(404).json({ success: false, message: 'Participant not found' });
    }

    // Add attendance record
    event.attendanceRecords.push({
      participant: participantId,
      scannedAt: Date.now(),
      scannedBy: req.userId,
      scanMethod: 'QR_SCAN'
    });
    event.attendanceCount = event.attendanceRecords.length;

    // Mark registration as COMPLETED and confirm payment
    const reg = participant.registeredEvents.find(
      r => r.event.toString() === eventId
    );
    if (reg && reg.status === 'REGISTERED') {
      reg.status = 'COMPLETED';
      reg.paymentStatus = 'COMPLETED';

      // Calculate this participant's revenue contribution
      let revenueContribution = event.registrationFee || 0;
      if (event.eventType === 'MERCHANDISE' && reg.merchandiseItems?.length > 0) {
        revenueContribution = reg.merchandiseItems.reduce(
          (sum, item) => sum + (item.price * item.quantity), 0
        );
      }
      event.totalRevenue = (event.totalRevenue || 0) + revenueContribution;
    }

    await Promise.all([event.save(), participant.save()]);

    res.json({
      success: true,
      message: `${participant.firstName} ${participant.lastName} marked as attended`,
      participant: {
        id: participant._id,
        name: `${participant.firstName} ${participant.lastName}`,
        email: participant.email
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('QR scan error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/events/:id/manual-attendance
// @desc    Manually mark attendance (with audit logging)
// @access  Organizer only
router.post('/:id/manual-attendance', protect, authorize('organizer'), async (req, res) => {
  try {
    const { participantId, notes } = req.body;
    const eventId = req.params.id;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check if organizer owns this event
    if (event.organizer.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this event' });
    }

    // Check if event is currently ongoing
    const now = new Date();
    if (now < new Date(event.eventStartDate) || now > new Date(event.eventEndDate)) {
      return res.status(400).json({ success: false, message: 'Attendance can only be tracked during the event window' });
    }

    // Check if already marked
    const alreadyMarked = event.attendanceRecords.some(
      record => record.participant.toString() === participantId
    );

    if (alreadyMarked) {
      return res.status(400).json({ success: false, message: 'Participant already marked as attended' });
    }

    // Verify participant
    const participant = await Participant.findById(participantId);
    if (!participant) {
      return res.status(404).json({ success: false, message: 'Participant not found' });
    }

    // Add attendance record with manual flag
    event.attendanceRecords.push({
      participant: participantId,
      scannedAt: Date.now(),
      scannedBy: req.userId,
      scanMethod: 'MANUAL',
      notes: notes || 'Manually added by organizer'
    });

    event.attendanceCount = event.attendanceRecords.length;
    await event.save();

    res.json({
      success: true,
      message: `${participant.firstName} ${participant.lastName} manually marked as attended`,
      participant: {
        id: participant._id,
        name: `${participant.firstName} ${participant.lastName}`,
        email: participant.email
      }
    });
  } catch (error) {
    console.error('Manual attendance error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/events/:id/attendance
// @desc    Get attendance report for an event
// @access  Organizer only
router.get('/:id/attendance', protect, authorize('organizer'), async (req, res) => {
  try {
    const eventId = req.params.id;

    const event = await Event.findById(eventId)
      .populate('attendanceRecords.participant', 'firstName lastName email participantType')
      .populate('attendanceRecords.scannedBy', 'organizerName');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check if organizer owns this event
    if (event.organizer.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this event' });
    }

    // Dynamic registration count
    let dynamicRegCount = 0;
    if (event.isTeamEvent) {
      const completeTeams = await Team.find({ event: event._id, status: 'COMPLETE' });
      dynamicRegCount = completeTeams.reduce((sum, t) => sum + t.members.filter(m => m.status === 'ACCEPTED').length, 0);
    } else {
      dynamicRegCount = await Participant.countDocuments({
        'registeredEvents': { $elemMatch: { event: event._id, status: 'REGISTERED' } }
      });
    }

    res.json({
      success: true,
      eventName: event.eventName,
      totalRegistrations: dynamicRegCount,
      totalAttendance: event.attendanceCount,
      attendanceRate: dynamicRegCount > 0
        ? ((event.attendanceCount / dynamicRegCount) * 100).toFixed(2) + '%'
        : '0%',
      attendanceRecords: event.attendanceRecords.map(record => ({
        participant: {
          id: record.participant._id,
          name: `${record.participant.firstName} ${record.participant.lastName}`,
          email: record.participant.email,
          type: record.participant.participantType
        },
        scannedAt: record.scannedAt,
        scannedBy: record.scannedBy ? record.scannedBy.organizerName : 'Unknown',
        scanMethod: record.scanMethod,
        notes: record.notes
      }))
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/events/:id/attendance/export
// @desc    Export attendance as CSV
// @access  Organizer only
router.get('/:id/attendance/export', protect, authorize('organizer'), async (req, res) => {
  try {
    const eventId = req.params.id;

    const event = await Event.findById(eventId)
      .populate('attendanceRecords.participant', 'firstName lastName email participantType contactNumber');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check if organizer owns this event
    if (event.organizer.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to export this data' });
    }

    // Generate CSV
    let csv = 'Name,Email,Type,Contact Number,Scanned At,Scan Method,Notes\n';

    event.attendanceRecords.forEach(record => {
      const p = record.participant;
      csv += `"${p.firstName} ${p.lastName}","${p.email}","${p.participantType}","${p.contactNumber}","${record.scannedAt}","${record.scanMethod}","${record.notes || ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-${event.eventName}-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export attendance error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;

