import { Outlet, NavLink } from 'react-router-dom';
import { useNotif } from '../../context/NotifContext';
import Sidebar, { NAV_LINKS } from './Sidebar';

const mobileItemClass = ({ isActive }) =>
  `flex flex-1 flex-col items-center justify-center gap-0.5 text-xs ${
    isActive ? 'text-violet-600' : 'text-gray-400'
  }`;

function MobileTabBar() {
  const { unreadCount } = useNotif();
  const mobileLinks = NAV_LINKS.filter((link) => link.mobile);

  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-10 flex h-16 border-t border-gray-200 bg-white">
      {mobileLinks.map(({ to, label, icon: Icon, badge }) => (
        <NavLink key={to} to={to} className={mobileItemClass}>
          <span className="relative">
            <Icon size={20} />
            {badge && unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 rounded-full bg-violet-600 px-1 text-[10px] font-semibold leading-tight text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </span>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <main className="min-h-screen pb-16 md:ml-60 md:pb-0">
        <Outlet />
      </main>
      <MobileTabBar />
    </div>
  );
}
