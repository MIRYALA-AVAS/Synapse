import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { timeAgo } from '../utils/format';
import Avatar from '../components/common/Avatar';
import ConversationList from '../components/dm/ConversationList';
import SkeletonCard from '../components/common/SkeletonCard';
import EmptyState from '../components/common/EmptyState';

function getFromId(msg) {
  if (!msg.from) return null;
  if (typeof msg.from === 'string') return msg.from;
  return msg.from._id?.toString() ?? msg.from.toString();
}

function getFromName(msg) {
  if (msg.from && typeof msg.from === 'object') return msg.from.name;
  return null;
}

function getFromAvatar(msg) {
  if (msg.from && typeof msg.from === 'object') return msg.from.avatarUrl;
  return null;
}

export default function DMConversationPage() {
  const { userId: targetUserId } = useParams();
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  const [targetUser, setTargetUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const bottomRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const typingTimer = useRef(null);
  const isTypingEmitRef = useRef(false);
  const inputRef = useRef(null);

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
    Promise.all([
      api.get(`/users/${targetUserId}`),
      api.get(`/dm/${targetUserId}`),
    ])
      .then(([{ data: ud }, { data: md }]) => {
        setTargetUser(ud.user);
        setMessages(md.messages);
      })
      .catch((err) => {
        if (err.response?.status === 404) toast.error('User not found');
        else toast.error('Could not load conversation');
      })
      .finally(() => setLoading(false));
  }, [targetUserId]);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom(true);
  }, [loading]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('join_dm', { targetUserId });

    socket.on('new_dm', ({ message }) => {
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    });

    socket.on('dm_user_typing', ({ userId }) => {
      if (userId === targetUserId) setIsTyping(true);
    });

    socket.on('dm_user_stopped_typing', ({ userId }) => {
      if (userId === targetUserId) setIsTyping(false);
    });

    return () => {
      socket.off('new_dm');
      socket.off('dm_user_typing');
      socket.off('dm_user_stopped_typing');
    };
  }, [socket, targetUserId]);

  const sendTyping = () => {
    if (!isTypingEmitRef.current) {
      isTypingEmitRef.current = true;
      socket?.emit('dm_typing_start', { targetUserId });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTypingEmitRef.current = false;
      socket?.emit('dm_typing_stop', { targetUserId });
    }, 2000);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    socket?.emit('send_dm', { targetUserId, body: body.trim() });
    setBody('');
    isTypingEmitRef.current = false;
    clearTimeout(typingTimer.current);
    socket?.emit('dm_typing_stop', { targetUserId });
    inputRef.current?.focus();
  };

  const chat = (
    <div className="flex h-full flex-col">
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <button
          onClick={() => navigate('/dm')}
          className="mr-1 rounded-lg p-1 text-gray-400 hover:bg-gray-100 md:hidden"
        >
          <ArrowLeft size={16} />
        </button>
        {targetUser && (
          <>
            <Avatar name={targetUser.name} src={targetUser.avatarUrl} size={32} />
            <span className="font-semibold text-gray-900">{targetUser.name}</span>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4" onScroll={handleScroll}>
        {loading ? (
          <div className="space-y-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState title="No messages yet" description={`Say hi to ${targetUser?.name ?? 'them'}!`} />
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const fromId = getFromId(msg);
              const isOwn = fromId === user?._id?.toString();
              return (
                <div key={msg._id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isOwn && (
                    <Avatar name={getFromName(msg) ?? targetUser?.name} src={getFromAvatar(msg)} size={28} />
                  )}
                  <div className={`max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm ${
                        isOwn ? 'rounded-tr-sm bg-violet-600 text-white' : 'rounded-tl-sm bg-gray-100 text-gray-800'
                      }`}
                    >
                      {msg.body}
                    </div>
                    <span className="mt-0.5 text-[10px] text-gray-400">{timeAgo(msg.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {isTyping && (
          <p className="mt-2 text-xs text-gray-400">{targetUser?.name} is typing…</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-3">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            ref={inputRef}
            value={body}
            onChange={(e) => { setBody(e.target.value); sendTyping(); }}
            placeholder={`Message ${targetUser?.name ?? ''}…`}
            maxLength={1000}
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
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen">
      {/* Left panel: conversation list (desktop only) */}
      <div className="hidden w-72 flex-shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="border-b border-gray-200 px-4 py-4">
          <h1 className="font-semibold text-gray-900">Messages</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ConversationList />
        </div>
      </div>

      {/* Right panel: chat */}
      <div className="flex flex-1 flex-col overflow-hidden">{chat}</div>
    </div>
  );
}
