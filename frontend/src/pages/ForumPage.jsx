import { useEffect, useState } from 'react';
import { Plus, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { applyVoteResult } from '../utils/vote';
import { TAGS } from '../components/common/Tag';
import SkeletonCard from '../components/common/SkeletonCard';
import EmptyState from '../components/common/EmptyState';
import PostCard from '../components/forum/PostCard';
import NewPostModal from '../components/forum/NewPostModal';

const SORTS = [
  { value: 'latest', label: 'Latest' },
  { value: 'top', label: 'Top' },
  { value: 'trending', label: 'Trending' },
];

const pillClass = (active) =>
  `shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
    active ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
  }`;

const tabClass = (active) =>
  `-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
    active ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'
  }`;

export default function ForumPage() {
  const { user } = useAuth();
  const socket = useSocket();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tag, setTag] = useState(null);
  const [sort, setSort] = useState('latest');
  const [showModal, setShowModal] = useState(false);

  // Live updates from other users
  useEffect(() => {
    if (!socket) return;

    const onVote = ({ postId, voteScore }) => {
      setPosts((prev) =>
        prev.map((p) => (p._id.toString() === postId.toString() ? { ...p, voteScore } : p))
      );
    };

    const onComment = ({ postId, commentCount }) => {
      setPosts((prev) =>
        prev.map((p) => (p._id.toString() === postId.toString() ? { ...p, commentCount } : p))
      );
    };

    socket.on('post_vote_updated', onVote);
    socket.on('new_comment', onComment);

    return () => {
      socket.off('post_vote_updated', onVote);
      socket.off('new_comment', onComment);
    };
  }, [socket]);

  useEffect(() => {
    setLoading(true);
    api
      .get('/forum', { params: { tag: tag || undefined, sort, page } })
      .then(({ data }) => {
        setPosts(data.posts);
        setTotalPages(data.totalPages);
      })
      .catch(() => toast.error('Could not load posts'))
      .finally(() => setLoading(false));
  }, [tag, sort, page]);

  const handleTagClick = (nextTag) => {
    setTag(nextTag);
    setPage(1);
  };

  const handleSortClick = (nextSort) => {
    setSort(nextSort);
    setPage(1);
  };

  const handleVoteChange = (postId, result) => {
    setPosts((prev) => prev.map((p) => (p._id === postId ? applyVoteResult(p, user._id, result) : p)));
  };

  const handlePostCreated = (post) => {
    setPosts((prev) => [post, ...prev]);
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Forum</h1>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          <Plus size={16} />
          New Post
        </button>
      </div>

      <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-2">
        <button type="button" onClick={() => handleTagClick(null)} className={pillClass(!tag)}>
          All
        </button>
        {TAGS.map((t) => (
          <button key={t} type="button" onClick={() => handleTagClick(t)} className={pillClass(tag === t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {SORTS.map((s) => (
          <button key={s.value} type="button" onClick={() => handleSortClick(s.value)} className={tabClass(sort === s.value)}>
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No posts yet" description="Be the first to start a discussion." />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} onVoteChange={handleVoteChange} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {showModal && <NewPostModal onClose={() => setShowModal(false)} onCreated={handlePostCreated} />}
    </div>
  );
}
