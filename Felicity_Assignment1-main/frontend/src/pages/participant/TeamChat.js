import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import { FaPaperPlane, FaLink, FaUser, FaTimes, FaMinus, FaUsers, FaPaperclip, FaFileAlt, FaDownload } from 'react-icons/fa';
import api from '../../utils/api';

const TeamChat = ({ teamId, onClose }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [team, setTeam] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [uploading, setUploading] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const minimizedRef = useRef(false);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom whenever messages change (only when not minimized)
  useEffect(() => {
    if (!minimizedRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    fetchTeam();


    const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/api$/, '');
    const newSocket = io(baseUrl);
    socketRef.current = newSocket;

    newSocket.emit('join-team', teamId);
    newSocket.emit('user-online', { teamId, userId: user.id });

    newSocket.on('online-users', (ids) => {
      setOnlineUserIds(new Set(ids));
    });

    newSocket.on('chat-history', (history) => {
      setMessages(history);
    });

    newSocket.on('new-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('user-typing', ({ userId, userName }) => {
      if (userId !== user.id) {
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.userId !== userId);
          return [...filtered, { userId, userName }];
        });
      }
    });

    newSocket.on('user-stop-typing', ({ userId }) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== userId));
    });

    newSocket.on('error', (err) => {
      console.error('Socket error:', err);
    });

    return () => newSocket.close();
  }, [teamId]);

  const fetchTeam = async () => {
    try {
      const response = await api.get(`/teams/${teamId}`);
      setTeam(response.data.team);
    } catch (error) {
      console.error('Failed to fetch team');
    }
  };

  const handleTyping = () => {
    if (!isTyping && socketRef.current) {
      setIsTyping(true);
      socketRef.current.emit('typing', { teamId, userId: user.id, userName: `${user.firstName} ${user.lastName}` });
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current?.emit('stop-typing', { teamId, userId: user.id });
    }, 1000);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socketRef.current) return;
    const optimistic = {
      _id: `temp-${Date.now()}`,
      sender: { _id: user.id, firstName: user.firstName, lastName: user.lastName },
      content: newMessage,
      messageType: 'TEXT',
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimistic]);
    socketRef.current.emit('send-message', { teamId, senderId: user.id, content: newMessage, messageType: 'TEXT' });
    setNewMessage('');
    setIsTyping(false);
    socketRef.current.emit('stop-typing', { teamId, userId: user.id });
  };

  const handleSendLink = (e) => {
    e.preventDefault();
    if (!linkValue.trim() || !socketRef.current) return;
    const optimistic = {
      _id: `temp-${Date.now()}`,
      sender: { _id: user.id, firstName: user.firstName, lastName: user.lastName },
      content: linkValue,
      messageType: 'LINK',
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimistic]);
    socketRef.current.emit('send-message', { teamId, senderId: user.id, content: linkValue, messageType: 'LINK' });
    setLinkValue('');
    setShowLinkInput(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post(`/teams/${teamId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success && socketRef.current) {
        socketRef.current.emit('send-message', {
          teamId,
          senderId: user.id,
          content: response.data.fileName,
          messageType: 'FILE',
          fileUrl: response.data.fileUrl,
          fileName: response.data.fileName
        });
      }
    } catch (err) {
      console.error('File upload failed', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const formatTime = (date) => new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
    <div className="fixed bottom-6 right-6 z-50 flex flex-col" style={{ width: '360px' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-primary-800 border border-primary-600 rounded-t-xl cursor-pointer select-none"
        onClick={() => { const next = !minimized; setMinimized(next); minimizedRef.current = next; }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FaUsers className="text-primary-300 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{team?.teamName || 'Team Chat'}</p>
            {team && <p className="text-primary-300 text-xs truncate">{team.event?.eventName}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMembers(!showMembers); }}
            className="text-primary-300 hover:text-white transition-colors text-xs px-2 py-0.5 border border-primary-600 rounded"
          >
            Members
          </button>
          <FaMinus className="text-primary-300 hover:text-white transition-colors" />
          <FaTimes
            className="text-primary-300 hover:text-red-400 transition-colors"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          />
        </div>
      </div>

      {!minimized && (
        <div className="flex flex-col bg-dark-500 border-x border-b border-primary-900 rounded-b-xl overflow-hidden" style={{ height: '420px' }}>

          {/* Members panel */}
          {showMembers && team && (
            <div className="bg-dark-200 border-b border-primary-900 px-4 py-3">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Members</p>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {team.members.filter(m => m.status === 'ACCEPTED').map((m, i) => {
                  const isOnline = onlineUserIds.has(m.participant?._id);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className="relative flex-shrink-0">
                        <FaUser className="text-primary-500 text-xs" />
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-dark-200 ${isOnline ? 'bg-green-400' : 'bg-gray-600'}`} />
                      </div>
                      <span className="text-gray-300 text-xs">
                        {m.participant?.firstName} {m.participant?.lastName}
                        {m.participant?._id === team.teamLeader?._id &&
                          <span className="ml-1 text-primary-400">(Leader)</span>}
                      </span>
                      {isOnline && <span className="text-green-400 text-xs ml-auto">online</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 ? (
              <p className="text-center text-gray-500 text-sm mt-8">No messages yet. Say hi! 👋</p>
            ) : (
              messages.map((message, index) => {
                const isOwn = message.sender?._id === user.id || message.sender === user.id;
                return (
                  <div key={message._id || index} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    {!isOwn && (
                      <span className="text-xs text-primary-400 mb-0.5 ml-1">
                        {message.sender?.firstName} {message.sender?.lastName}
                      </span>
                    )}
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm break-words ${
                      isOwn
                        ? 'bg-primary-700 text-white rounded-br-sm'
                        : 'bg-dark-100 border border-primary-900 text-gray-200 rounded-bl-sm'
                    }`}>
                      {message.messageType === 'LINK' ? (
                        <a href={message.content} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 underline text-primary-300">
                          <FaLink className="text-xs" />{message.content}
                        </a>
                      ) : message.messageType === 'FILE' ? (
                        <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" download={message.fileName}
                          className="flex items-center gap-2 text-primary-300 hover:text-primary-200">
                          <FaFileAlt className="flex-shrink-0" />
                          <span className="underline truncate max-w-[160px]">{message.fileName || message.content}</span>
                          <FaDownload className="flex-shrink-0 text-xs" />
                        </a>
                      ) : message.content}
                    </div>
                    <span className="text-xs text-gray-600 mt-0.5 mx-1">{formatTime(message.createdAt)}</span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="px-4 py-1 bg-dark-500 border-t border-primary-900">
              <p className="text-xs text-primary-400 italic">
                {typingUsers.map(u => u.userName || 'Someone').join(', ')}
                {typingUsers.length === 1 ? ' is' : ' are'} typing...
              </p>
            </div>
          )}

          {/* Link input row */}
          {showLinkInput && (
            <form onSubmit={handleSendLink} className="flex items-center gap-2 px-3 py-1.5 border-t border-primary-900 bg-dark-200">
              <input
                autoFocus
                type="url"
                value={linkValue}
                onChange={e => setLinkValue(e.target.value)}
                placeholder="Paste a link..."
                className="flex-1 px-3 py-1 bg-dark-50 border border-primary-900 text-gray-200 rounded-full text-xs focus:outline-none focus:border-primary-600 placeholder-gray-600"
              />
              <button type="submit" className="text-primary-400 hover:text-primary-200 text-xs px-2">Send</button>
              <button type="button" onClick={() => { setShowLinkInput(false); setLinkValue(''); }} className="text-gray-500 hover:text-red-400 text-xs">✕</button>
            </form>
          )}

          {/* Input */}
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 px-3 py-2 border-t border-primary-900 bg-dark-200">
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="text-primary-400 hover:text-primary-200 transition-colors flex-shrink-0 disabled:opacity-50" title="Share file">
              {uploading ? <span className="text-xs">...</span> : <FaPaperclip />}
            </button>
            <button type="button" onClick={() => setShowLinkInput(v => !v)}
              className={`transition-colors flex-shrink-0 ${showLinkInput ? 'text-primary-200' : 'text-primary-400 hover:text-primary-200'}`} title="Share link">
              <FaLink />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
              placeholder="Type a message..."
              className="flex-1 px-3 py-1.5 bg-dark-50 border border-primary-900 text-gray-200 rounded-full text-sm focus:outline-none focus:border-primary-600 placeholder-gray-600"
            />
            <button type="submit"
              className="bg-primary-700 hover:bg-primary-600 text-white p-2 rounded-full transition-colors flex-shrink-0">
              <FaPaperPlane className="text-xs" />
            </button>
          </form>
        </div>
      )}
    </div>
    </>
  );
};

export default TeamChat;
