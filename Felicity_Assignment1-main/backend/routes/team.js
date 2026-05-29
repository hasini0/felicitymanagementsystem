const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const Event = require('../models/Event');
const Participant = require('../models/Participant');
const { protect, authorize } = require('../middleware/auth');
const QRCode = require('qrcode');
const { sendEmail } = require('../utils/emailService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer config for chat file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Upload file for team chat
router.post('/:teamId/upload', protect, authorize('participant'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ success: true, fileUrl, fileName: req.file.originalname });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create a new team with email invitations
router.post('/create', protect, authorize('participant'), async (req, res) => {
  try {
    const { teamName, eventId, memberEmails } = req.body;

    // Validate input
    if (!teamName || !eventId || !memberEmails || !Array.isArray(memberEmails)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Team name, event ID, and member emails are required' 
      });
    }

    // Check if event exists and is a team event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (!event.isTeamEvent) {
      return res.status(400).json({ success: false, message: 'This event does not support team registration' });
    }

    // Get team leader info
    const leader = await Participant.findById(req.userId);
    if (!leader) {
      return res.status(404).json({ success: false, message: 'Participant not found' });
    }

    // Check eligibility
    if (event.eligibility === 'IIIT_ONLY' && leader.participantType !== 'IIIT_STUDENT') {
      return res.status(403).json({ success: false, message: 'This event is open to IIIT students only' });
    }
    if (event.eligibility === 'NON_IIIT_ONLY' && leader.participantType !== 'NON_IIIT') {
      return res.status(403).json({ success: false, message: 'This event is open to non-IIIT participants only' });
    }

    // Validate team size against event requirements
    const totalMembers = memberEmails.length + 1; // +1 for leader
    const minSize = event.teamSize?.min || 2;
    const maxSize = event.teamSize?.max || 5;

    if (totalMembers < minSize) {
      return res.status(400).json({ 
        success: false, 
        message: `Team must have at least ${minSize} members (including leader)` 
      });
    }

    if (totalMembers > maxSize) {
      return res.status(400).json({ 
        success: false, 
        message: `Team cannot exceed ${maxSize} members (including leader)` 
      });
    }

    // Check if participant is already in a team for this event
    const existingTeam = await Team.findOne({
      event: eventId,
      $or: [
        { teamLeader: req.userId },
        { 'members.participant': req.userId, 'members.status': { $in: ['PENDING', 'ACCEPTED'] } }
      ]
    });

    if (existingTeam) {
      return res.status(400).json({ success: false, message: 'You are already in a team for this event' });
    }

    // Check for duplicate emails in invite list
    const uniqueEmails = [...new Set(memberEmails.map(e => e.toLowerCase()))];
    if (uniqueEmails.length !== memberEmails.length) {
      return res.status(400).json({ success: false, message: 'Duplicate email addresses in invite list' });
    }

    // Find participants by email
    const members = [];
    members.push({
      participant: req.userId,
      email: leader.email,
      status: 'ACCEPTED',
      invitedAt: Date.now(),
      respondedAt: Date.now()
    });

    for (const email of memberEmails) {
      // Skip if the email belongs to the leader themselves
      if (email.toLowerCase() === leader.email.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'You cannot invite yourself to your own team'
        });
      }

      const participant = await Participant.findOne({ email: email.toLowerCase() });
      
      if (!participant) {
        return res.status(404).json({ 
          success: false, 
          message: `Participant with email ${email} not found. All members must be registered participants.` 
        });
      }

      // Check if this participant is already in another team for this event
      const memberExistingTeam = await Team.findOne({
        event: eventId,
        'members.participant': participant._id,
        'members.status': { $in: ['PENDING', 'ACCEPTED'] }
      });

      if (memberExistingTeam) {
        return res.status(400).json({ 
          success: false, 
          message: `${email} is already in a team for this event` 
        });
      }

      members.push({
        participant: participant._id,
        email: participant.email,
        status: 'PENDING',
        invitedAt: Date.now()
      });
    }

    // Generate unique team code (for reference)
    let teamCode;
    let codeExists = true;
    while (codeExists) {
      teamCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existingCode = await Team.findOne({ teamCode });
      codeExists = !!existingCode;
    }

    const team = await Team.create({
      teamName,
      teamCode,
      event: eventId,
      teamLeader: req.userId,
      minMembers: minSize,
      maxMembers: maxSize,
      members,
      status: 'DRAFT'
    });

    await team.populate('teamLeader', 'firstName lastName email');
    await team.populate('event', 'eventName eventStartDate eventEndDate');
    await team.populate('members.participant', 'firstName lastName email');

    // Send email invitations (don't fail if email fails)
    for (const member of members) {
      if (member.status === 'PENDING') {
        try {
          const participant = await Participant.findById(member.participant);
          await sendEmail(
            participant.email,
            `Team Invitation: ${event.eventName}`,
            `You have been invited by ${leader.firstName} ${leader.lastName} to join the team "${teamName}" for ${event.eventName}. Please log in to accept or decline this invitation.`
          );
        } catch (emailError) {
          console.error(`Failed to send invitation email to ${member.email}:`, emailError);
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Team created successfully. Invitations sent to members.',
      team
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get pending team invitations for current user
router.get('/invitations', protect, authorize('participant'), async (req, res) => {
  try {
    const teams = await Team.find({
      'members': {
        $elemMatch: {
          participant: req.userId,
          status: 'PENDING'
        }
      }
    })
      .populate('event', 'eventName eventStartDate eventEndDate')
      .populate('teamLeader', 'firstName lastName email')
      .populate('members.participant', 'firstName lastName email')
      .sort('-createdAt');

    res.json({
      success: true,
      invitations: teams
    });
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Respond to team invitation (accept/decline)
router.put('/invitation/:teamId/respond', protect, authorize('participant'), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { action } = req.body; // 'accept' or 'decline'

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be "accept" or "decline"' });
    }

    const team = await Team.findById(teamId)
      .populate('event', 'eventName')
      .populate('teamLeader', 'firstName lastName email')
      .populate('members.participant', 'firstName lastName email');

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const member = team.members.find(
      m => m.participant._id.toString() === req.userId.toString()
    );

    if (!member) {
      return res.status(404).json({ success: false, message: 'You are not invited to this team' });
    }

    if (member.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'You have already responded to this invitation' });
    }

    if (action === 'accept') {
      // Check if team is full
      if (team.isFull()) {
        return res.status(400).json({ success: false, message: 'Team is already full' });
      }

      member.status = 'ACCEPTED';
      member.respondedAt = Date.now();

      // Notify team leader (don't fail if email fails)
      try {
        await sendEmail(
          team.teamLeader.email,
          'Team Invitation Accepted',
          `${member.participant.firstName} ${member.participant.lastName} has accepted the invitation to join "${team.teamName}" for ${team.event.eventName}.`
        );
      } catch (emailError) {
        console.error('Failed to send acceptance notification email:', emailError);
      }
    } else {
      member.status = 'DECLINED';
      member.respondedAt = Date.now();

      // Notify team leader (don't fail if email fails)
      try {
        await sendEmail(
          team.teamLeader.email,
          'Team Invitation Declined',
          `${member.participant.firstName} ${member.participant.lastName} has declined the invitation to join "${team.teamName}".`
        );
      } catch (emailError) {
        console.error('Failed to send decline notification email:', emailError);
      }
    }

    await team.save();

    res.json({
      success: true,
      message: `Invitation ${action}ed successfully`,
      team
    });
  } catch (error) {
    console.error('Respond to invitation error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Finalize team and generate tickets (team leader only)
router.post('/:teamId/finalize', protect, authorize('participant'), async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId)
      .populate('members.participant', 'firstName lastName email')
      .populate('event', 'eventName eventStartDate eventEndDate');

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Check if requester is team leader
    if (team.teamLeader.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Only team leader can finalize the team' });
    }

    // Check if team is in DRAFT status
    if (team.status !== 'DRAFT') {
      return res.status(400).json({ 
        success: false, 
        message: 'Team has already been finalized' 
      });
    }

    // Check if team meets minimum requirements
    if (!team.canFinalize()) {
      const acceptedCount = team.members.filter(m => m.status === 'ACCEPTED').length;
      return res.status(400).json({ 
        success: false, 
        message: `Team needs between ${team.minMembers} and ${team.maxMembers} accepted members. Currently: ${acceptedCount}` 
      });
    }

    const acceptedMembers = team.members.filter(m => m.status === 'ACCEPTED');

    // Update team status
    team.status = 'REGISTERED';

    // Generate tickets and register all accepted members for the event
    for (const member of acceptedMembers) {
      const ticketId = `TICKET-${team.event._id}-${member.participant._id}-${Date.now()}`;
      const qrData = JSON.stringify({
        ticketId,
        eventId: team.event._id,
        participantId: member.participant._id,
        teamId: team._id,
        teamName: team.teamName
      });
      
      const qrCode = await QRCode.toDataURL(qrData);

      team.tickets.push({
        participant: member.participant._id,
        ticketId,
        qrCode,
        generatedAt: Date.now()
      });

      // Add event to participant's registeredEvents so it shows in upcoming events
      await Participant.findByIdAndUpdate(member.participant._id, {
        $push: {
          registeredEvents: {
            event: team.event._id,
            status: 'REGISTERED',
            registrationDate: Date.now(),
            teamName: team.teamName,
            ticketId,
            qrCode
          }
        }
      });

      // Send ticket via email (don't fail if email fails)
      try {
        await sendEmail(
          member.participant.email,
          `Ticket for ${team.event.eventName}`,
          `Your team "${team.teamName}" registration is complete! Here is your ticket. Ticket ID: ${ticketId}. Please keep this for event check-in.`
        );
      } catch (emailError) {
        console.error(`Failed to send ticket email to ${member.participant.email}:`, emailError);
      }
    }

    team.ticketGenerated = true;
    team.status = 'COMPLETE';
    await team.save();

    res.json({
      success: true,
      message: 'Team registration finalized and tickets generated for all members',
      team
    });
  } catch (error) {
    console.error('Complete team error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get my teams (leader sees all their teams; members only see teams they've accepted)
router.get('/my-teams', protect, authorize('participant'), async (req, res) => {
  try {
    const teams = await Team.find({
      $or: [
        { teamLeader: req.userId },
        { 'members': { $elemMatch: { participant: req.userId, status: 'ACCEPTED' } } }
      ]
    })
      .populate('event', 'eventName eventStartDate eventEndDate')
      .populate('teamLeader', 'firstName lastName email')
      .populate('members.participant', 'firstName lastName email')
      .sort('-createdAt');

    res.json({
      success: true,
      teams
    });
  } catch (error) {
    console.error('Get my teams error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get team details
router.get('/:teamId', protect, authorize('participant'), async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId)
      .populate('event', 'eventName eventStartDate eventEndDate')
      .populate('teamLeader', 'firstName lastName email')
      .populate('members.participant', 'firstName lastName email');

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    res.json({
      success: true,
      team
    });
  } catch (error) {
    console.error('Get team details error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Leave team (not team leader)
router.post('/:teamId/leave', protect, authorize('participant'), async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Team leader cannot leave
    if (team.teamLeader.toString() === req.user.id) {
      return res.status(400).json({ success: false, message: 'Team leader cannot leave. Disband the team instead.' });
    }

    // Remove member
    team.members = team.members.filter(
      m => m.participant.toString() !== req.user.id
    );

    await team.save();

    res.json({
      success: true,
      message: 'You have left the team'
    });
  } catch (error) {
    console.error('Leave team error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Disband team (team leader only)
router.delete('/:teamId', protect, authorize('participant'), async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId)
      .populate('members.participant', 'email');

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Check if requester is team leader
    if (team.teamLeader.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only team leader can disband the team' });
    }

    // Notify all members
    for (const member of team.members) {
      if (member.participant._id.toString() !== req.user.id) {
        await sendEmail(
          member.participant.email,
          'Team Disbanded',
          `Team "${team.teamName}" has been disbanded by the team leader.`
        );
      }
    }

    team.status = 'DISBANDED';
    await team.save();

    res.json({
      success: true,
      message: 'Team disbanded successfully'
    });
  } catch (error) {
    console.error('Disband team error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
