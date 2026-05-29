const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const participantRoutes = require('./routes/participant');
const organizerRoutes = require('./routes/organizer');
const adminRoutes = require('./routes/admin');
const eventRoutes = require('./routes/event');
const teamRoutes = require('./routes/team');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/participant', participantRoutes);
app.use('/api/organizer', organizerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/teams', teamRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Felicity Backend is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully!');
    
    // Create admin user if not exists
    const createAdminUser = require('./utils/createAdmin');
    await createAdminUser();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5000;

// Socket.io for Team Chat
const Message = require('./models/Message');
const Team = require('./models/Team');

// Track online users: teamId -> Set<userId>  and  socketId -> { userId, teamIds[] }
const onlineUsers = new Map();
const socketUserMap = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join team chat room
  socket.on('join-team', async (teamId) => {
    try {
      socket.join(teamId);
      console.log(`Socket ${socket.id} joined team ${teamId}`);
      
      // Load chat history
      const messages = await Message.find({ team: teamId })
        .populate('sender', 'firstName lastName')
        .sort({ createdAt: 1 })
        .limit(100);
      
      socket.emit('chat-history', messages);
    } catch (error) {
      console.error('Join team error:', error);
      socket.emit('error', { message: 'Failed to join team chat' });
    }
  });

  // Send message
  socket.on('send-message', async (data) => {
    try {
      const { teamId, senderId, content, messageType, fileUrl, fileName } = data;

      // Verify sender is team member
      const team = await Team.findById(teamId);
      if (!team) {
        socket.emit('error', { message: 'Team not found' });
        return;
      }

      const isMember = team.teamLeader.toString() === senderId || 
        team.members.some(m => m.participant.toString() === senderId && m.status === 'ACCEPTED');

      if (!isMember) {
        socket.emit('error', { message: 'You are not a member of this team' });
        return;
      }

      // Save message
      const message = await Message.create({
        team: teamId,
        sender: senderId,
        content,
        messageType: messageType || 'TEXT',
        fileUrl,
        fileName
      });

      await message.populate('sender', 'firstName lastName');

      // Broadcast to team room (exclude sender — they get optimistic update on frontend)
      socket.to(teamId).emit('new-message', message);
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Typing indicator
  socket.on('typing', (data) => {
    socket.to(data.teamId).emit('user-typing', {
      userId: data.userId,
      userName: data.userName
    });
  });

  socket.on('stop-typing', (data) => {
    socket.to(data.teamId).emit('user-stop-typing', {
      userId: data.userId
    });
  });

  // Mark message as read
  socket.on('mark-read', async (data) => {
    try {
      const { messageId, userId } = data;
      const message = await Message.findById(messageId);
      
      if (message && !message.readBy.some(r => r.participant.toString() === userId)) {
        message.readBy.push({ participant: userId, readAt: Date.now() });
        await message.save();
      }
    } catch (error) {
      console.error('Mark read error:', error);
    }
  });

  // Track user as online in a team room
  socket.on('user-online', ({ teamId, userId }) => {
    if (!socketUserMap.has(socket.id)) {
      socketUserMap.set(socket.id, { userId, teamIds: [] });
    }
    const socketData = socketUserMap.get(socket.id);
    socketData.userId = userId;
    if (!socketData.teamIds.includes(teamId)) socketData.teamIds.push(teamId);

    if (!onlineUsers.has(teamId)) onlineUsers.set(teamId, new Set());
    onlineUsers.get(teamId).add(userId);

    io.to(teamId).emit('online-users', [...onlineUsers.get(teamId)]);
  });

  socket.on('disconnect', () => {
    const socketData = socketUserMap.get(socket.id);
    if (socketData) {
      socketData.teamIds.forEach(teamId => {
        const teamOnline = onlineUsers.get(teamId);
        if (teamOnline) {
          teamOnline.delete(socketData.userId);
          io.to(teamId).emit('online-users', [...teamOnline]);
        }
      });
      socketUserMap.delete(socket.id);
    }
    console.log('User disconnected:', socket.id);
  });
});

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

module.exports = app;
