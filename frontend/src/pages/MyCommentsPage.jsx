import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { timeAgo, truncate } from '../utils/format';
import SkeletonCard from '../components/common/SkeletonCard';
import EmptyState from '../components/common/EmptyState';

export default function MyCommentsPage() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    api
      .get('/forum/my-comments', { params: { page } })
      .then(({ data }) => {
        setComments(data.comments);
        setTotalPages(data.totalPages);
      })
      .catch(() => toast.error('Could not load your comments'))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">My Comments</h1>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <EmptyState icon={BookOpen} title="You haven't commented yet. Join a discussion!" />
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c._id} className="rounded-lg border border-gray-200 p-4">
              {c.post ? (
                <Link to={`/forum/${c.post._id}`} className="text-sm font-medium text-violet-600 hover:underline">
                  {c.post.title}
                </Link>
              ) : (
                <span className="text-sm italic text-gray-400">Original post was deleted</span>
              )}
              <p className="mt-1 text-sm text-gray-600">{truncate(c.body, 160)}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                <span>{timeAgo(c.createdAt)}</span>
                <span>{c.upvotes.length - c.downvotes.length} votes</span>
              </div>
            </div>
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
    </div>
  );
}
