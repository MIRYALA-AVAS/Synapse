import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { timeAgo } from '../../utils/format';
import Avatar from '../common/Avatar';
import SkeletonCard from '../common/SkeletonCard';
import EmptyState from '../common/EmptyState';

export default function ConversationList() {
  const [convos, setConvos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { userId: activeUserId } = useParams();

  useEffect(() => {
    api
      .get('/dm/conversations')
      .then(({ data }) => setConvos(data.conversations))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2 p-3">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (convos.length === 0) {
    return (
      <div className="p-4">
        <EmptyState title="No messages" description="Start a conversation from someone's profile." />
      </div>
    );
  }

  return (
    <ul>
      {convos.map((c) => {
        const other = c.otherUser;
        const otherId = (other.id ?? other._id).toString();
        const isActive = activeUserId === otherId;
        return (
          <li key={c.roomId}>
            <button
              onClick={() => navigate(`/dm/${otherId}`)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-100 ${
                isActive ? 'bg-violet-50' : ''
              }`}
            >
              <Avatar name={other.name} src={other.avatarUrl} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-medium text-gray-900">{other.name}</span>
                  {c.lastMessage?.createdAt && (
                    <span className="ml-2 flex-shrink-0 text-[10px] text-gray-400">
                      {timeAgo(c.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                {c.lastMessage?.body && (
                  <p className="truncate text-xs text-gray-500">{c.lastMessage.body}</p>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
