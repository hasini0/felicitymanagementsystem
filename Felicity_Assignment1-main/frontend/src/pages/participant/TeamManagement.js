import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { FiUsers, FiCheck, FiX, FiClock, FiAward, FiMessageSquare } from 'react-icons/fi';
import { format } from 'date-fns';
import TeamChat from './TeamChat';

const TeamManagement = () => {
  const { user } = useAuth();
  const [myTeams, setMyTeams] = useState([]);
  const [openChatTeamId, setOpenChatTeamId] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-teams');
  const [respondingId, setRespondingId] = useState(null);
  const [finalizingId, setFinalizingId] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const notifSocketRef = useRef(null);
  const openChatTeamIdRef = useRef(null);

  useEffect(() => {
    fetchData();
    return () => { notifSocketRef.current?.disconnect(); };
  }, []);

  // Persistent notification socket — joins all team rooms, tracks unread when chat is closed
  useEffect(() => {
    if (!myTeams.length || !user) return;
    if (notifSocketRef.current) notifSocketRef.current.disconnect();
    const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/api$/, '');
    const sock = io(baseUrl);
    notifSocketRef.current = sock;
    myTeams.forEach(t => sock.emit('join-team', t._id));
    sock.on('new-message', (message) => {
      const tid = typeof message.team === 'object' ? message.team?._id : message.team;
      const senderId = typeof message.sender === 'object' ? message.sender?._id : message.sender;
      if (senderId === user.id) return;          // own message
      if (openChatTeamIdRef.current === tid) return; // chat is open for this team
      setUnreadCounts(prev => ({ ...prev, [tid]: (prev[tid] || 0) + 1 }));
    });
  }, [myTeams]);

  const fetchData = async () => {
    try {
      const [teamsRes, invitesRes] = await Promise.all([
        api.get('/teams/my-teams'),
        api.get('/teams/invitations')
      ]);
      if (teamsRes.data.success) setMyTeams(teamsRes.data.teams);
      if (invitesRes.data.success) setInvitations(invitesRes.data.invitations);
    } catch (error) {
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationResponse = async (teamId, action) => {
    setRespondingId(teamId + action);
    try {
      const response = await api.put(`/teams/invitation/${teamId}/respond`, { action });
      if (response.data.success) {
        toast.success(`Invitation ${action}ed successfully`);
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${action} invitation`);
    } finally {
      setRespondingId(null);
    }
  };

  const handleFinalize = async (teamId) => {
    setFinalizingId(teamId);
    try {
      const response = await api.post(`/teams/${teamId}/finalize`);
      if (response.data.success) {
        toast.success('Team registration complete! Tickets generated for all members.');
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to finalize team');
    } finally {
      setFinalizingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      DRAFT: 'bg-yellow-900 text-yellow-300',
      REGISTERED: 'bg-blue-900 text-blue-300',
      COMPLETE: 'bg-green-900 text-green-300',
      DISBANDED: 'bg-red-900 text-red-300'
    };
    return styles[status] || 'bg-gray-700 text-gray-300';
  };

  const getMemberStatusBadge = (status) => {
    const styles = {
      PENDING: { style: 'bg-yellow-900 text-yellow-300', icon: <FiClock size={12} /> },
      ACCEPTED: { style: 'bg-green-900 text-green-300', icon: <FiCheck size={12} /> },
      DECLINED: { style: 'bg-red-900 text-red-300', icon: <FiX size={12} /> }
    };
    return styles[status] || { style: 'bg-gray-700 text-gray-300', icon: null };
  };

  const pendingCount = invitations.length;

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen bg-black">
          <div className="text-xl text-primary-500 animate-pulse">Loading teams...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Teams</h1>
        <p className="text-gray-400 mb-8">Manage your team registrations and invitations</p>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-primary-900">
          <button
            onClick={() => setActiveTab('my-teams')}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'my-teams'
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FiUsers className="inline mr-2" />
            My Teams ({myTeams.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'invitations'
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Invitations
            {pendingCount > 0 && (
              <span className="ml-2 bg-primary-600 text-white text-xs rounded-full px-2 py-0.5">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* My Teams Tab */}
        {activeTab === 'my-teams' && (
          <div>
            {myTeams.length === 0 ? (
              <div className="dark-card p-12 text-center">
                <FiUsers size={48} className="text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No teams yet</p>
                <p className="text-gray-500 text-sm mt-2">
                  Go to Browse Events and register for a team event to create a team
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {myTeams.map(team => {
                  const acceptedCount = team.members.filter(m => m.status === 'ACCEPTED').length;
                  const pendingMembers = team.members.filter(m => m.status === 'PENDING').length;
                  const canFinalize = team.status === 'DRAFT' && acceptedCount >= team.minMembers && pendingMembers === 0;

                  return (
                    <div key={team._id} className="dark-card p-6">
                      {/* Team Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h2 className="text-xl font-bold text-white">{team.teamName}</h2>
                          <p className="text-gray-400 text-sm mt-1">{team.event?.eventName}</p>
                          {team.event?.eventStartDate && (
                            <p className="text-gray-500 text-xs mt-0.5">
                              {format(new Date(team.event.eventStartDate), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(team.status)}`}>
                          {team.status}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>{acceptedCount} accepted</span>
                          <span>{team.minMembers}–{team.maxMembers} required</span>
                        </div>
                        <div className="w-full bg-dark-50 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              acceptedCount >= team.minMembers ? 'bg-green-500' : 'bg-primary-500'
                            }`}
                            style={{ width: `${Math.min((acceptedCount / team.maxMembers) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Members List */}
                      <div className="space-y-2 mb-4">
                        {team.members.map((member, idx) => {
                          const { style, icon } = getMemberStatusBadge(member.status);
                          const isLeaderMember = member.participant?._id?.toString() === team.teamLeader?._id?.toString();
                          return (
                            <div key={idx} className="flex justify-between items-center py-2 border-b border-dark-50 last:border-0">
                              <div>
                                <span className="text-gray-200 text-sm">
                                  {member.participant?.firstName} {member.participant?.lastName}
                                  {isLeaderMember && (
                                    <span className="ml-2 text-xs text-primary-400">(Leader)</span>
                                  )}
                                </span>
                                <p className="text-gray-500 text-xs">{member.email}</p>
                              </div>
                              <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${style}`}>
                                {icon}
                                {member.status}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pending notice */}
                      {team.status === 'DRAFT' && pendingMembers > 0 && (
                        <div className="p-3 bg-yellow-900 bg-opacity-20 border border-yellow-800 rounded-lg mb-4">
                          <p className="text-yellow-400 text-sm">
                            Waiting for {pendingMembers} member{pendingMembers > 1 ? 's' : ''} to respond to invitation.
                          </p>
                        </div>
                      )}

                      {/* Tickets */}
                      {team.status === 'COMPLETE' && team.tickets?.length > 0 && (
                        <div className="p-3 bg-green-900 bg-opacity-20 border border-green-800 rounded-lg mb-4">
                          <p className="text-green-400 text-sm font-medium flex items-center gap-2">
                            <FiAward /> Registration Complete — Tickets Generated
                          </p>
                          {team.tickets.map((ticket, idx) => (
                            <div key={idx} className="mt-2 text-xs text-green-300">
                              Ticket ID: {ticket.ticketId}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Finalize Button — leader only */}
                      {team.status === 'DRAFT' && team.teamLeader?.email === user?.email && (
                        <button
                          onClick={() => handleFinalize(team._id)}
                          disabled={!canFinalize || finalizingId === team._id}
                          title={
                            pendingMembers > 0
                              ? 'Waiting for all members to respond'
                              : acceptedCount < team.minMembers
                              ? `Need at least ${team.minMembers} accepted members`
                              : 'Finalize team registration'
                          }
                          className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                            canFinalize
                              ? 'bg-green-700 text-white hover:bg-green-600'
                              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {finalizingId === team._id
                            ? 'Finalizing...'
                            : pendingMembers > 0
                            ? `Waiting for ${pendingMembers} response${pendingMembers > 1 ? 's' : ''}...`
                            : acceptedCount < team.minMembers
                            ? `Need ${team.minMembers - acceptedCount} more accepted member${team.minMembers - acceptedCount > 1 ? 's' : ''}`
                            : 'Finalize Registration & Generate Tickets'}
                        </button>
                      )}

                      {/* Status for non-leader members */}
                      {team.status === 'DRAFT' && team.teamLeader?.email !== user?.email && (
                        <div className="p-3 bg-dark-50 border border-primary-900 rounded-lg">
                          <p className="text-gray-400 text-sm text-center">
                            Waiting for team leader to finalize registration
                          </p>
                        </div>
                      )}

                      {/* Team Chat Button */}
                      <button
                        onClick={() => {
                          setOpenChatTeamId(team._id);
                          openChatTeamIdRef.current = team._id;
                          setUnreadCounts(prev => ({ ...prev, [team._id]: 0 }));
                        }}
                        className="mt-3 w-full relative flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-primary-800 text-primary-400 hover:bg-primary-900/30 transition-colors text-sm"
                      >
                        <FiMessageSquare /> Team Chat
                        {unreadCounts[team._id] > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                            {unreadCounts[team._id] > 99 ? '99+' : unreadCounts[team._id]}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Invitations Tab */}
        {activeTab === 'invitations' && (
          <div>
            {invitations.length === 0 ? (
              <div className="dark-card p-12 text-center">
                <FiUsers size={48} className="text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No pending invitations</p>
                <p className="text-gray-500 text-sm mt-2">
                  Team invitations from other participants will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {invitations.map(team => (
                  <div key={team._id} className="dark-card p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h2 className="text-lg font-bold text-white">{team.teamName}</h2>
                        <p className="text-gray-400 text-sm">{team.event?.eventName}</p>
                        {team.event?.eventStartDate && (
                          <p className="text-gray-500 text-xs mt-0.5">
                            {format(new Date(team.event.eventStartDate), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-300 text-sm mb-4">
                      Invited by{' '}
                      <span className="text-primary-400 font-medium">
                        {team.teamLeader?.firstName} {team.teamLeader?.lastName}
                      </span>
                    </p>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleInvitationResponse(team._id, 'accept')}
                        disabled={respondingId === team._id + 'accept'}
                        className="flex-1 py-2 px-4 bg-green-700 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors text-sm font-medium"
                      >
                        {respondingId === team._id + 'accept' ? 'Accepting...' : 'Accept'}
                      </button>
                      <button
                        onClick={() => handleInvitationResponse(team._id, 'decline')}
                        disabled={respondingId === team._id + 'decline'}
                        className="flex-1 py-2 px-4 bg-red-900 text-red-300 rounded-lg hover:bg-red-800 disabled:opacity-50 transition-colors text-sm font-medium"
                      >
                        {respondingId === team._id + 'decline' ? 'Declining...' : 'Decline'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Team Chat Popup */}
      {openChatTeamId && (
        <TeamChat teamId={openChatTeamId} onClose={() => { setOpenChatTeamId(null); openChatTeamIdRef.current = null; }} />
      )}
    </Layout>
  );
};

export default TeamManagement;
