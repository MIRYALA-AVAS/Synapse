import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function SpaceCard({ space, onJoined }) {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const isMember = user?.spacesJoined?.some((id) => id.toString() === space._id?.toString());

  const handleJoin = async (e) => {
    e.stopPropagation();
    try {
      await api.post(`/spaces/${space.slug}/join`);
      await refreshUser();
      onJoined?.();
      toast.success(`Joined ${space.name}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not join space');
    }
  };

  return (
    <div
      onClick={() => navigate(`/spaces/${space.slug}`)}
      className="flex cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="w-2 flex-shrink-0" style={{ backgroundColor: space.coverColor || '#6D28D9' }} />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-gray-900">{space.name}</h3>
            {space.isPrivate && (
              <span className="text-xs font-medium text-gray-400">Private</span>
            )}
          </div>
          {isMember ? (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/spaces/${space.slug}`); }}
              className="flex-shrink-0 rounded-lg bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 hover:bg-violet-200"
            >
              Open
            </button>
          ) : (
            <button
              onClick={handleJoin}
              className="flex-shrink-0 rounded-lg bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-700"
            >
              Join
            </button>
          )}
        </div>
        {space.description && (
          <p className="mt-1 line-clamp-2 text-sm text-gray-500">{space.description}</p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
          <span>{space.members?.length ?? space.memberCount ?? 0} members</span>
          {space.admin?.name && <span>· {space.admin.name}</span>}
        </div>
      </div>
    </div>
  );
}
