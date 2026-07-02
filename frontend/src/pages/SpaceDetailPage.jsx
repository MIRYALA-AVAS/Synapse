import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Settings, CornerUpLeft, X, Trash2, MessageSquare, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { timeAgo } from '../utils/format';
import Avatar from '../components/common/Avatar';
import SkeletonCard from '../components/common/SkeletonCard';
import EmptyState from '../components/common/EmptyState';
import SpaceAdminPanel from '../components/spaces/SpaceAdminPanel';

function MessageBubble({ msg, isOwn, onReply, onDelete, canDelete }) {
  return (
    <div className={`group flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isOwn && <Avatar name={msg.author?.name} src={msg.author?.avatarUrl} size={28} />}
      <div className={`max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && (
          <span className="mb-0.5 text-xs font-medium text-gray-500">{msg.author?.name}</span>
        )}
        {msg.replyTo && (
          <div className="mb-1 rounded-lg border-l-2 border-violet-400 bg-violet-50 px-2 py-1 text-xs text-gray-500">
            <span className="font-medium">{msg.replyTo.author?.name}</span>
            {' · '}
            {msg.replyTo.bodyPreview}
          </div>
        )}
        <div
          className={`rounded-2xl px-3 py-2 text-sm ${
            isOwn ? 'rounded-tr-sm bg-violet-600 text-white' : 'rounded-tl-sm bg-gray-100 text-gray-800'
          }`}
        >
          {msg.body}
        </div>
        <span className="mt-0.5 text-[10px] text-gray-400">{timeAgo(msg.createdAt)}</span>
      </div>
      <div className="flex flex-col items-center gap-1 self-center opacity-0 transition group-hover:opacity-100">
        <button
          onClick={() => onReply(msg)}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-violet-600"
          title="Reply"
        >
          <CornerUpLeft size={12} />
        </button>
        {canDelete && (
          <button
            onClick={() => onDelete(msg._id)}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

function MembersTab({ space, isAdmin, adminId }) {
  const members = space?.members ?? [];

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {members.length} {members.length === 1 ? 'member' : 'members'}
      </p>
      {members.length === 0 ? (
        <EmptyState title="No members" description="No one has joined yet." />
      ) : (
        <ul className="space-y-2">
          {members.map((m) => {
            const id = m._id?.toString() ?? m.toString();
            const isSpaceAdmin = id === adminId;
            return (
              <li key={id}>
                <Link
                  to={`/profile/${id}`}
                  className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-gray-50"
                >
                  <Avatar name={m.name} src={m.avatarUrl} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{m.name}</p>
                    {isSpaceAdmin && (
                      <p className="text-xs text-violet-600">Admin</p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function SpaceDetailPage() {
  const { slug } = useParams();
  const { user, refreshUser } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  const [space, setSpace] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notMember, setNotMember] = useState(false);
  const [tab, setTab] = useState('chat');
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [typers, setTypers] = useState([]);
  const [showAdmin, setShowAdmin] = useState(false);

  const bottomRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const typingTimer = useRef(null);
  const isTypingRef = useRef(false);
  const inputRef = useRef(null);

  const spaceDbId = space?._id?.toString();

  const scrollToBottom = (force = false) => {
    if (force || isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 120;
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get(`/spaces/${slug}`), api.get(`/spaces/${slug}/messages`)])
      .then(([{ data: sd }, { data: md }]) => {
        setSpace(sd.space);
        setMessages(md.messages);
        setNotMember(false);
      })
      .catch((err) => {
        if (err.response?.status === 403 || err.response?.status === 404) setNotMember(true);
        else toast.error('Could not load space');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom(true);
  }, [loading]);

  useEffect(() => {
    if (!socket || notMember || !spaceDbId) return;
    socket.emit('join_space', { spaceId: spaceDbId });

    const onNewMsg = ({ message }) => {
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    };
    const onDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    };
    const onTyping = ({ userId, name, spaceId: sid }) => {
      if (sid !== spaceDbId) return;
      setTypers((prev) => (prev.includes(name) ? prev : [...prev, name]));
    };
    const onStopTyping = ({ userId, spaceId: sid }) => {
      if (sid !== spaceDbId) return;
      setTypers((prev) => prev.filter((n) => n !== userId));
    };

    socket.on('new_space_message', onNewMsg);
    socket.on('space_message_deleted', onDeleted);
    socket.on('user_typing', onTyping);
    socket.on('user_stopped_typing', onStopTyping);

    return () => {
      socket.emit('leave_space', { spaceId: spaceDbId });
      socket.off('new_space_message', onNewMsg);
      socket.off('space_message_deleted', onDeleted);
      socket.off('user_typing', onTyping);
      socket.off('user_stopped_typing', onStopTyping);
    };
  }, [socket, spaceDbId, notMember]);

  const sendTyping = () => {
    if (!isTypingRef.current && spaceDbId) {
      isTypingRef.current = true;
      socket?.emit('typing_start', { spaceId: spaceDbId });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      if (spaceDbId) socket?.emit('typing_stop', { spaceId: spaceDbId });
    }, 2000);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!body.trim() || !spaceDbId) return;
    socket?.emit('space_message', { spaceId: spaceDbId, body: body.trim(), replyTo: replyTo?._id });
    setBody('');
    setReplyTo(null);
    isTypingRef.current = false;
    clearTimeout(typingTimer.current);
    socket?.emit('typing_stop', { spaceId: spaceDbId });
    inputRef.current?.focus();
  };

  const handleDelete = (messageId) => {
    if (spaceDbId) socket?.emit('delete_space_message', { spaceId: spaceDbId, messageId });
  };

  const handleJoin = async () => {
    try {
      await api.post(`/spaces/${slug}/join`);
      await refreshUser();
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not join space');
    }
  };

  const adminId = space?.admin?._id?.toString() ?? space?.admin?.toString();
  const isAdmin = adminId === user?._id?.toString();

  const tabClass = (active) =>
    `flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
      active
        ? 'border-violet-600 text-violet-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;

  if (loading) {
    return (
      <div className="space-y-3 p-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (notMember) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 md:h-screen">
        <EmptyState title="Members only" description="Join this space to read and send messages." />
        <button
          onClick={handleJoin}
          className="rounded-lg bg-violet-600 px-6 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          Join Space
        </button>
        <button onClick={() => navigate('/spaces')} className="text-sm text-gray-400 hover:text-gray-600">
          Back to Spaces
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col md:h-screen">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 pt-3">
        <div className="flex items-center gap-2">
          {space?.coverColor && (
            <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: space.coverColor }} />
          )}
          <div>
            <h1 className="font-semibold text-gray-900 leading-tight">{space?.name}</h1>
            {space?.description && (
              <p className="text-xs text-gray-400 leading-tight">{space.description}</p>
            )}
          </div>
          {space?.isPrivate && <span className="text-xs text-gray-400">· Private</span>}
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAdmin(true)}
            className="mb-2 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <Settings size={16} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-2">
        <button className={tabClass(tab === 'chat')} onClick={() => setTab('chat')}>
          <MessageSquare size={14} />
          Chat
        </button>
        <button className={tabClass(tab === 'members')} onClick={() => setTab('members')}>
          <Users size={14} />
          Members
          <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
            {space?.members?.length ?? 0}
          </span>
        </button>
      </div>

      {/* Tab content */}
      {tab === 'members' ? (
        <MembersTab space={space} isAdmin={isAdmin} adminId={adminId} />
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4" onScroll={handleScroll}>
            {messages.length === 0 ? (
              <EmptyState title="No messages yet" description="Send the first message!" />
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg._id}
                    msg={msg}
                    isOwn={msg.author?._id?.toString() === user?._id?.toString()}
                    onReply={(m) => {
                      setReplyTo(m);
                      inputRef.current?.focus();
                    }}
                    onDelete={handleDelete}
                    canDelete={msg.author?._id?.toString() === user?._id?.toString() || isAdmin}
                  />
                ))}
              </div>
            )}
            {typers.length > 0 && (
              <p className="mt-2 text-xs text-gray-400">
                {typers.join(', ')} {typers.length === 1 ? 'is' : 'are'} typing…
              </p>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 bg-white p-3">
            {replyTo && (
              <div className="mb-2 flex items-center justify-between rounded-lg bg-violet-50 px-3 py-1.5 text-xs text-gray-600">
                <span>
                  Replying to <span className="font-medium">{replyTo.author?.name}</span>: {replyTo.body.slice(0, 60)}
                </span>
                <button onClick={() => setReplyTo(null)} className="ml-2 text-gray-400 hover:text-gray-600">
                  <X size={12} />
                </button>
              </div>
            )}
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                ref={inputRef}
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  sendTyping();
                }}
                placeholder={`Message ${space?.name ?? ''}…`}
                maxLength={2000}
                className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <button
                type="submit"
                disabled={!body.trim()}
                className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40"
              >
                Send
              </button>
            </form>
          </div>
        </>
      )}

      {showAdmin && space && (
        <SpaceAdminPanel
          space={space}
          onClose={() => setShowAdmin(false)}
          onUpdated={(updated) => setSpace(updated)}
          onDeleted={() => navigate('/spaces')}
        />
      )}
    </div>
  );
}
