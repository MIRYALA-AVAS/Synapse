import { useNavigate, Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { getUserVote } from '../../utils/vote';
import { timeAgo, truncate } from '../../utils/format';
import Avatar from '../common/Avatar';
import Tag from '../common/Tag';
import VoteButtons from '../common/VoteButtons';

export default function PostCard({ post, rank, onVoteChange }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userVote = getUserVote(post, user?._id);

  const handleVote = async (type) => {
    try {
      const { data } = await api.put(`/forum/${post._id}/vote`, { type });
      onVoteChange?.(post._id, data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not vote');
    }
  };

  return (
    <div
      onClick={() => navigate(`/forum/${post._id}`)}
      className="flex cursor-pointer gap-4 rounded-lg border border-gray-200 p-4 transition hover:border-gray-300 hover:shadow-sm"
    >
      {rank && <div className="w-6 shrink-0 text-center text-lg font-bold text-gray-300">{rank}</div>}

      <VoteButtons score={post.voteScore} userVote={userVote} onVote={handleVote} size="sm" />

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <Avatar name={post.author?.name} src={post.author?.avatarUrl} size={20} />
          <Link
            to={`/profile/${post.author?._id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm text-gray-600 hover:text-violet-600 hover:underline"
          >
            {post.author?.name}
          </Link>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-400">{timeAgo(post.createdAt)}</span>
        </div>

        <h3 className="font-semibold text-gray-900">{post.title}</h3>
        <p className="mt-1 text-sm text-gray-500">{truncate(post.body, 120)}</p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {post.tags?.map((tag) => <Tag key={tag} tag={tag} />)}
          <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
            <MessageSquare size={14} />
            {post.commentCount}
          </span>
        </div>
      </div>
    </div>
  );
}
