import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import SpaceCard from '../components/spaces/SpaceCard';
import CreateSpaceModal from '../components/spaces/CreateSpaceModal';
import SkeletonCard from '../components/common/SkeletonCard';
import EmptyState from '../components/common/EmptyState';

export default function SpacesListPage() {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchSpaces = () => {
    setLoading(true);
    api
      .get('/spaces')
      .then(({ data }) => setSpaces(data.spaces))
      .catch(() => toast.error('Could not load spaces'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  const handleCreated = (newSpace) => {
    setSpaces((prev) => [newSpace, ...prev]);
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Spaces</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          <Plus size={16} />
          New Space
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : spaces.length === 0 ? (
        <EmptyState title="No spaces yet" description="Create a space to start a group conversation." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {spaces.map((space) => (
            <SpaceCard key={space._id} space={space} onJoined={fetchSpaces} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateSpaceModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
