const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');
const { protect, authorize } = require('../middleware/auth');
const { generateTicketId, generateQRCode } = require('../utils/qrGenerator');
const { sendRegistrationEmail } = require('../utils/emailService');

// @route   GET /api/participant/profile
// @desc    Get participant profile
// @access  Private (Participant)
router.get('/profile', protect, authorize('participant'), async (req, res) => {
  try {
    const participant = await Participant.findById(req.userId)
      .populate('followedClubs', 'organizerName category description')
      .select('-password');

    res.json({ success: true, data: participant });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/participant/profile
// @desc    Update participant profile
// @access  Private (Participant)
router.put('/profile', protect, authorize('participant'), async (req, res) => {
  try {
    const { firstName, lastName, contactNumber, college, organizationName, areasOfInterest, followedClubs } = req.body;

    const participant = await Participant.findById(req.userId);

    if (firstName) participant.firstName = firstName;
    if (lastName) participant.lastName = lastName;
    if (contactNumber) participant.contactNumber = contactNumber;
    if (college) participant.college = college;
    if (organizationName) participant.organizationName = organizationName;
    if (areasOfInterest !== undefined) participant.areasOfInterest = areasOfInterest;
    // Replace the whole followedClubs array if provided
    if (followedClubs !== undefined) {
      // Sync organizer.followers array
      const oldIds = participant.followedClubs.map(id => id.toString());
      const newIds = followedClubs.map(id => id.toString());
      const toAdd = newIds.filter(id => !oldIds.includes(id));
      const toRemove = oldIds.filter(id => !newIds.includes(id));
      if (toAdd.length > 0) {
        await Organizer.updateMany({ _id: { $in: toAdd } }, { $addToSet: { followers: participant._id } });
      }
      if (toRemove.length > 0) {
        await Organizer.updateMany({ _id: { $in: toRemove } }, { $pull: { followers: participant._id } });
      }
      participant.followedClubs = newIds;
    }

    await participant.save();
    const updated = await Participant.findById(req.userId)
      .populate('followedClubs', 'organizerName category')
      .select('-password');

    res.json({ success: true, message: 'Profile updated successfully', data: updated });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/participant/change-password
// @desc    Change password
// @access  Private (Participant)
router.put('/change-password', protect, authorize('participant'), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new password' });
    }

    const participant = await Participant.findById(req.userId).select('+password');

    const isMatch = await participant.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    participant.password = newPassword;
    await participant.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/participant/dashboard
// @desc    Get participant dashboard data
// @access  Private (Participant)
router.get('/dashboard', protect, authorize('participant'), async (req, res) => {
  try {
    const participant = await Participant.findById(req.userId)
      .populate({
        path: 'registeredEvents.event',
        select: 'eventName eventType eventStartDate eventEndDate organizer status',
        populate: {
          path: 'organizer',
          select: 'organizerName'
        }
      });

    const now = new Date();

    // Filter out stale registrations where the event was deleted
    const validRegs = participant.registeredEvents.filter(reg => reg.event != null);

    // Upcoming Events: registered + not yet ended (includes currently ongoing events)
    const upcomingEvents = validRegs.filter(reg =>
      reg.status === 'REGISTERED' && new Date(reg.event.eventEndDate) > now
    );

    // Participation History tabs — only fully ended events
    const normalEvents = validRegs.filter(reg =>
      reg.event.eventType === 'NORMAL' &&
      reg.status === 'REGISTERED' &&
      new Date(reg.event.eventEndDate) <= now
    );

    const merchandiseEvents = validRegs.filter(reg =>
      reg.event.eventType === 'MERCHANDISE' &&
      reg.status === 'REGISTERED' &&
      new Date(reg.event.eventEndDate) <= now
    );

    const completedEvents = validRegs.filter(reg =>
      reg.status === 'COMPLETED'
    );

    const cancelledEvents = validRegs.filter(reg =>
      reg.status === 'CANCELLED' || reg.status === 'REJECTED'
    );

    res.json({
      success: true,
      data: {
        upcomingEvents,
        normalEvents,
        merchandiseEvents,
        completedEvents,
        cancelledEvents,
        totalRegistrations: validRegs.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/participant/events
// @desc    Browse all published events with filters
// @access  Private (Participant)
router.get('/events', protect, authorize('participant'), async (req, res) => {
  try {
    const { search, eventType, eligibility, dateFrom, dateTo, organizer, tags, sort, followedClubsOnly } = req.query;

    let query = { status: 'PUBLISHED' };

    if (search) {
      query.$or = [
        { eventName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (eventType) query.eventType = eventType;
    if (eligibility) query.eligibility = { $in: [eligibility, 'ALL'] };
    if (organizer) query.organizer = organizer;
    if (tags) query.eventTags = { $in: tags.split(',') };
    if (dateFrom || dateTo) {
      query.eventStartDate = {};
      if (dateFrom) query.eventStartDate.$gte = new Date(dateFrom);
      if (dateTo) query.eventStartDate.$lte = new Date(dateTo);
    }

    // Fetch participant preferences
    const participant = await Participant.findById(req.userId).select('areasOfInterest followedClubs');
    const followedClubIds = (participant.followedClubs || []).map(id => id.toString());
    const interests = (participant.areasOfInterest || []).map(i => i.toLowerCase());

    // Filter to followed clubs only if requested
    if (followedClubsOnly === 'true' && followedClubIds.length > 0) {
      query.organizer = { $in: followedClubIds };
    }

    let events = await Event.find(query)
      .populate('organizer', 'organizerName category description')
      .sort(sort === 'trending' ? { trendingScore: -1 } : { eventStartDate: 1 });

    // Preference scoring — only applies when no explicit sort requested
    if (sort !== 'trending' && (followedClubIds.length > 0 || interests.length > 0)) {
      const score = (event) => {
        let s = 0;
        if (followedClubIds.includes(event.organizer?._id?.toString())) s += 2;
        const tags = (event.eventTags || []).map(t => t.toLowerCase());
        if (interests.some(i => tags.includes(i))) s += 1;
        return s;
      };
      events = events.slice().sort((a, b) => score(b) - score(a) || new Date(a.eventStartDate) - new Date(b.eventStartDate));
    }

    // Annotate each event with its preference match info
    const annotated = events.map(e => {
      const obj = e.toObject();
      obj.isFromFollowedClub = followedClubIds.includes(e.organizer?._id?.toString());
      const tags = (e.eventTags || []).map(t => t.toLowerCase());
      obj.matchesInterest = interests.some(i => tags.includes(i));
      return obj;
    });

    res.json({ success: true, data: annotated, hasPreferences: followedClubIds.length > 0 || interests.length > 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/participant/events/trending
// @desc    Get trending events (Top 5 in last 24h)
// @access  Private (Participant)
router.get('/events/trending', protect, authorize('participant'), async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const events = await Event.find({
      status: 'PUBLISHED',
      createdAt: { $gte: twentyFourHoursAgo }
    })
      .populate('organizer', 'organizerName category')
      .sort({ registrationCount: -1 })
      .limit(5);

    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/participant/events/:id
// @desc    Get event details
// @access  Private (Participant)
router.get('/events/:id', protect, authorize('participant'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'organizerName category description contactEmail');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check if registration is still open
    const now = new Date();
    const isDeadlinePassed = new Date(event.registrationDeadline) < now;
    const isLimitReached = event.registrationLimit && event.registrationCount >= event.registrationLimit;

    // Check if participant already registered
    const participant = await Participant.findById(req.userId);
    const isRegistered = participant.registeredEvents.some(reg =>
      reg.event.toString() === event._id.toString() && reg.status === 'REGISTERED'
    );

    // Check eligibility
    const isEligible =
      event.eligibility === 'ALL' ||
      (event.eligibility === 'IIIT_ONLY' && participant.participantType === 'IIIT_STUDENT') ||
      (event.eligibility === 'NON_IIIT_ONLY' && participant.participantType === 'NON_IIIT');

    // For team events, also check if user already has a team (DRAFT or COMPLETE)
    let isTeamRegistered = false;
    if (event.isTeamEvent) {
      const Team = require('../models/Team');
      const existingTeam = await Team.findOne({
        event: event._id,
        $or: [
          { teamLeader: req.userId },
          { 'members': { $elemMatch: { participant: req.userId, status: { $in: ['PENDING', 'ACCEPTED'] } } } }
        ]
      });
      isTeamRegistered = !!existingTeam;
    }

    res.json({
      success: true,
      data: event,
      meta: {
        isDeadlinePassed,
        isLimitReached,
        isEligible,
        isRegistered: isRegistered || isTeamRegistered,
        canRegister: !isDeadlinePassed && !isLimitReached && !isRegistered && !isTeamRegistered && isEligible
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/participant/events/:id/register
// @desc    Register for an event (or purchase merchandise)
// @access  Private (Participant)
router.post('/events/:id/register', protect, authorize('participant'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Validate registration deadline
    if (new Date(event.registrationDeadline) < new Date()) {
      return res.status(400).json({ success: false, message: 'Registration deadline has passed' });
    }

    // Validate registration limit (for non-merchandise)
    if (event.eventType !== 'MERCHANDISE' && event.registrationLimit && event.registrationCount >= event.registrationLimit) {
      return res.status(400).json({ success: false, message: 'Registration limit reached' });
    }

    const participant = await Participant.findById(req.userId);

    // Check eligibility
    if (event.eligibility === 'IIIT_ONLY' && participant.participantType !== 'IIIT_STUDENT') {
      return res.status(403).json({ success: false, message: 'This event is open to IIIT students only' });
    }
    if (event.eligibility === 'NON_IIIT_ONLY' && participant.participantType !== 'NON_IIIT') {
      return res.status(403).json({ success: false, message: 'This event is open to non-IIIT participants only' });
    }

    // Check if already registered
    const alreadyRegistered = participant.registeredEvents.some(reg =>
      reg.event.toString() === event._id.toString() && reg.status === 'REGISTERED'
    );
    if (alreadyRegistered) {
      return res.status(400).json({ success: false, message: 'Already registered for this event' });
    }

    // ── Merchandise-specific handling ────────────────────────────────────────
    let orderTotal = event.registrationFee;
    let selectedItems = [];

    if (event.eventType === 'MERCHANDISE') {
      const items = req.body.selectedItems || [];
      if (!items.length) {
        return res.status(400).json({ success: false, message: 'Please select at least one item to purchase' });
      }

      // Validate stock for each selected item
      for (const { itemIndex, quantity } of items) {
        const item = event.merchandiseItems[itemIndex];
        if (!item) {
          return res.status(400).json({ success: false, message: `Invalid item at index ${itemIndex}` });
        }
        if (item.stockQuantity < quantity) {
          return res.status(400).json({
            success: false,
            message: `"${item.itemName}" only has ${item.stockQuantity} left in stock`
          });
        }
      }

      // Decrement stock and calculate total
      for (const { itemIndex, quantity } of items) {
        event.merchandiseItems[itemIndex].stockQuantity -= quantity;
        orderTotal += event.merchandiseItems[itemIndex].price * quantity;
        selectedItems.push({
          itemName: event.merchandiseItems[itemIndex].itemName,
          quantity,
          price: event.merchandiseItems[itemIndex].price
        });
      }

      event.markModified('merchandiseItems');
    }

    // Generate ticket
    const ticketId = generateTicketId();
    const qrCode = await generateQRCode({
      ticketId,
      eventId: event._id,
      participantId: participant._id,
      eventName: event.eventName,
      participantName: `${participant.firstName} ${participant.lastName}`
    });

    // Add registration
    const registration = {
      event: event._id,
      status: 'REGISTERED',
      registrationDate: new Date(),
      ticketId,
      qrCode,
      customFormData: req.body.customFormData || {},
      teamName: req.body.teamName,
      paymentStatus: orderTotal > 0
        ? (req.body.paymentProof ? 'COMPLETED' : 'PENDING')
        : 'COMPLETED',
      paymentProof: req.body.paymentProof || null,
      ...(selectedItems.length > 0 && { merchandiseItems: selectedItems })
    };

    participant.registeredEvents.push(registration);
    await participant.save();

    // Update event stats
    event.registrationCount += 1;
    event.totalRevenue += orderTotal;
    await event.save();

    // Send confirmation email
    await sendRegistrationEmail(participant, event, { ticketId, qrCode });

    res.status(201).json({
      success: true,
      message: event.eventType === 'MERCHANDISE' ? 'Purchase successful!' : 'Registration successful',
      data: { ticketId, qrCode }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/participant/organizers
// @desc    Get all approved organizers
// @access  Private (Participant)
router.get('/organizers', protect, authorize('participant'), async (req, res) => {
  try {
    const organizers = await Organizer.find({ isApproved: true })
      .select('organizerName category description contactEmail followers');

    const participant = await Participant.findById(req.userId);

    const organizersWithFollowStatus = organizers.map(org => ({
      ...org.toObject(),
      isFollowing: participant.followedClubs.some(club => club.toString() === org._id.toString()),
      followersCount: org.followers.length
    }));

    res.json({ success: true, data: organizersWithFollowStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/participant/organizers/:id/follow
// @desc    Follow an organizer
// @access  Private (Participant)
router.post('/organizers/:id/follow', protect, authorize('participant'), async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);
    if (!organizer) {
      return res.status(404).json({ success: false, message: 'Organizer not found' });
    }

    const participant = await Participant.findById(req.userId);

    // Check if already following
    if (participant.followedClubs.includes(organizer._id)) {
      return res.status(400).json({ success: false, message: 'Already following this organizer' });
    }

    participant.followedClubs.push(organizer._id);
    await participant.save();

    organizer.followers.push(participant._id);
    await organizer.save();

    res.json({ success: true, message: 'Successfully followed organizer' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/participant/organizers/:id/unfollow
// @desc    Unfollow an organizer
// @access  Private (Participant)
router.delete('/organizers/:id/unfollow', protect, authorize('participant'), async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);
    if (!organizer) {
      return res.status(404).json({ success: false, message: 'Organizer not found' });
    }

    const participant = await Participant.findById(req.userId);

    participant.followedClubs = participant.followedClubs.filter(
      club => club.toString() !== organizer._id.toString()
    );
    await participant.save();

    organizer.followers = organizer.followers.filter(
      follower => follower.toString() !== participant._id.toString()
    );
    await organizer.save();

    res.json({ success: true, message: 'Successfully unfollowed organizer' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/participant/organizers/:id
// @desc    Get organizer details
// @access  Private (Participant)
router.get('/organizers/:id', protect, authorize('participant'), async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id)
      .select('organizerName category description contactEmail');

    if (!organizer) {
      return res.status(404).json({ success: false, message: 'Organizer not found' });
    }

    // Get organizer's events
    const upcomingEvents = await Event.find({
      organizer: organizer._id,
      status: 'PUBLISHED',
      eventStartDate: { $gte: new Date() }
    }).select('eventName eventType eventStartDate registrationDeadline registrationFee');

    const pastEvents = await Event.find({
      organizer: organizer._id,
      status: { $in: ['COMPLETED', 'CLOSED'] }
    }).select('eventName eventType eventStartDate eventEndDate');

    res.json({
      success: true,
      data: {
        organizer,
        upcomingEvents,
        pastEvents
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/participant/search
// @desc    Search for participant by email (for attendance tracking)
// @access  Private (Organizer)
router.get('/search', protect, authorize('organizer'), async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const participant = await Participant.findOne({ email })
      .select('firstName lastName email participantType');

    if (!participant) {
      return res.json({ success: true, participant: null });
    }

    res.json({ success: true, participant });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
