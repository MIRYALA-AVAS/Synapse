import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { applyVoteResult } from '../utils/vote';
import Avatar from '../components/common/Avatar';
import SkeletonCard from '../components/common/SkeletonCard';
import EmptyState from '../components/common/EmptyState';
import PostCard from '../components/forum/PostCard';

const PERIODS = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

const tabClass = (active) =>
  `-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
    active ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'
  }`;

export default function TrendingPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('week');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    setLoading(true);
    api
      .get('/trending', { params: { period } })
      .then(({ data }) => setPosts(data.posts))
      .catch(() => toast.error('Could not load trending posts'))
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => {
    api
      .get('/trending/leaderboard')
      .then(({ data }) => setLeaderboard(data.leaderboard))
      .catch(() => toast.error('Could not load leaderboard'));
  }, []);

  const handleVoteChange = (postId, result) => {
    setPosts((prev) => prev.map((p) => (p._id === postId ? applyVoteResult(p, user._id, result) : p)));
  };

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Trending</h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="max-w-3xl flex-1">
          <div className="mb-4 flex gap-1 border-b border-gray-200">
            {PERIODS.map((p) => (
              <button key={p.value} type="button" onClick={() => setPeriod(p.value)} className={tabClass(period === p.value)}>
                {p.label}
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
            <EmptyState icon={TrendingUp} title="Nothing trending yet" description="Check back soon." />
          ) : (
            <div className="space-y-3">
              {posts.map((post, i) => (
                <div key={post._id} className="relative">
                  <PostCard post={post} rank={i + 1} onVoteChange={handleVoteChange} />
                  <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-600">
                    <Flame size={12} />
                    {post.trendScore.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-full shrink-0 lg:w-72">
          <div className="rounded-lg border border-gray-200 p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Top Contributors This Week</h2>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-gray-400">No data yet.</p>
            ) : (
              <ul className="space-y-3">
                {leaderboard.map((entry, i) => (
                  <li key={entry._id} className="flex items-center gap-3">
                    <span className="w-5 text-sm font-semibold text-gray-400">{i + 1}</span>
                    <Link to={`/profile/${entry._id}`} className="flex min-w-0 flex-1 items-center gap-2 hover:opacity-80">
                      <Avatar name={entry.name} src={entry.avatarUrl} size={28} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800 hover:text-violet-600 hover:underline">{entry.name}</span>
                    </Link>
                    <span className="text-xs text-gray-500">{entry.totalUpvotesReceived} ▲</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
