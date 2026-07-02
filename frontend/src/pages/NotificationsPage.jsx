import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useNotif } from '../context/NotifContext';
import { timeAgo } from '../utils/format';
import Avatar from '../components/common/Avatar';
import EmptyState from '../components/common/EmptyState';

export default function NotificationsPage() {
  const { notifications, setNotifications, setUnreadCount } = useNotif();
  const navigate = useNavigate();

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      toast.error('Could not mark notifications as read');
    }
  };

  const clearAll = async () => {
    try {
      await api.delete('/notifications');
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      toast.error('Could not clear notifications');
    }
  };

  const handleClick = (notif) => {
    if (!notif.read) {
      api.put(`/notifications/${notif._id}/read`).catch(() => {});
      setNotifications((prev) => prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    }
    if (notif.link) navigate(notif.link);
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
        {notifications.length > 0 && (
          <div className="flex gap-3">
            <button type="button" onClick={markAllRead} className="text-sm font-medium text-violet-600 hover:underline">
              Mark all read
            </button>
            <button type="button" onClick={clearAll} className="text-sm font-medium text-gray-400 hover:text-red-500">
              Clear all
            </button>
          </div>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up!" />
      ) : (
        <div className="space-y-1">
          {notifications.map((n) => (
            <button
              key={n._id}
              type="button"
              onClick={() => handleClick(n)}
              className={`flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-gray-50 ${
                !n.read ? 'border-l-4 border-violet-500 bg-violet-50/40' : ''
              }`}
            >
              <Avatar name={n.actor?.name} src={n.actor?.avatarUrl} size={32} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-800">{n.message}</p>
                <p className="mt-0.5 text-xs text-gray-400">{timeAgo(n.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
