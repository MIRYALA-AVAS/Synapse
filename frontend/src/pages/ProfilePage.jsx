import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Edit2, Mail, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { timeAgo } from '../utils/format';
import Avatar from '../components/common/Avatar';
import Tag from '../components/common/Tag';
import SkeletonCard from '../components/common/SkeletonCard';
import EmptyState from '../components/common/EmptyState';

export default function ProfilePage() {
  const { userId } = useParams();
  const { user: me, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const isOwn = me?._id?.toString() === userId;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/users/${userId}`),
      api.get('/forum', { params: { author: userId, limit: 10 } }),
    ])
      .then(([{ data: ud }, { data: fd }]) => {
        setProfile(ud.user);
        setStats(ud.stats);
        setPosts(fd.posts);
      })
      .catch((err) => {
        if (err.response?.status === 404) toast.error('User not found');
        else toast.error('Could not load profile');
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <EmptyState title="User not found" description="This profile may not exist." />
      </div>
    );
  }

  const profileId = (profile.id ?? profile._id)?.toString();

  return (
    <div className="mx-auto max-w-2xl p-6">
      {/* Profile header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={profile.name} src={profile.avatarUrl} size={64} />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{profile.name}</h1>
            {profile.role && profile.role !== 'user' && (
              <span className="mt-1 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                {profile.role}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!isOwn && (
            <button
              onClick={() => navigate(`/dm/${profileId}`)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Mail size={14} />
              Message
            </button>
          )}
          {isOwn && (
            <div className="flex gap-2">
              <Link
                to="/profile/edit"
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Edit2 size={14} />
                Edit
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 md:hidden"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {profile.bio && (
        <p className="mt-4 text-sm text-gray-700">{profile.bio}</p>
      )}

      {/* Stats */}
      <div className="mt-5 flex gap-6 border-y border-gray-100 py-4 text-center">
        <div>
          <p className="text-lg font-semibold text-gray-900">{stats?.postCount ?? 0}</p>
          <p className="text-xs text-gray-500">Posts</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">{stats?.totalUpvotes ?? 0}</p>
          <p className="text-xs text-gray-500">Upvotes</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">{stats?.spacesCount ?? 0}</p>
          <p className="text-xs text-gray-500">Spaces</p>
        </div>
      </div>

      {/* Recent posts */}
      <h2 className="mb-3 mt-5 text-sm font-semibold text-gray-900">Recent Posts</h2>
      {posts.length === 0 ? (
        <EmptyState
          title="No posts yet"
          description={isOwn ? 'Start a discussion in the Forum.' : ''}
        />
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post._id}>
              <Link
                to={`/forum/${post._id}`}
                className="block rounded-xl border border-gray-200 p-4 hover:border-violet-300 hover:bg-violet-50"
              >
                <h3 className="font-medium text-gray-900">{post.title}</h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                  <span>{post.voteScore ?? 0} pts</span>
                  <span>·</span>
                  <span>{post.commentCount ?? 0} comments</span>
                  <span>·</span>
                  <span>{timeAgo(post.createdAt)}</span>
                </div>
                {post.tags?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {post.tags.map((tag) => <Tag key={tag} tag={tag} />)}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
