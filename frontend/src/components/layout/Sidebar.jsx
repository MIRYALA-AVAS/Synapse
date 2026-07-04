import { NavLink, useNavigate } from 'react-router-dom';
import { MessageSquare, TrendingUp, Hash, Mail, BookOpen, Bell, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotif } from '../../context/NotifContext';
import Avatar from '../common/Avatar';

export const NAV_LINKS = [
  { to: '/forum', label: 'Forum', icon: MessageSquare, mobile: true },
  { to: '/trending', label: 'Trending', icon: TrendingUp, mobile: true },
  { to: '/spaces', label: 'Spaces', icon: Hash, mobile: true },
  { to: '/dm', label: 'Messages', icon: Mail, mobile: true },
  { to: '/my-comments', label: 'My Comments', icon: BookOpen, mobile: false },
  { to: '/notifications', label: 'Notifications', icon: Bell, badge: true, mobile: true },
];

const navItemClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
  }`;

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotif();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:w-60 md:flex-col bg-sidebar text-white">
      <div className="flex items-center gap-2 px-4 h-16 shrink-0">
        <img src="/src/assets/logo.png" alt="Synapse" className="h-8 w-8 rounded-lg object-cover" />
        <span className="text-base font-semibold">Synapse</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
        {NAV_LINKS.map(({ to, label, icon: Icon, badge }) => (
          <NavLink key={to} to={to} className={navItemClass}>
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            {badge && unreadCount > 0 && (
              <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-xs font-semibold leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3 space-y-1">
        <NavLink
          to={`/profile/${user?._id}`}
          className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/5"
        >
          <Avatar name={user?.name} src={user?.avatarUrl} size={32} />
          <span className="flex-1 truncate text-sm font-medium">{user?.name}</span>
        </NavLink>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
