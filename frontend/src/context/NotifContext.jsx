import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const NotifContext = createContext(null);

export function NotifProvider({ children }) {
  const { user } = useAuth();
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    api.get('/notifications').then(({ data }) => {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    });
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = ({ notification }) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    socket.on('notification', handleNotification);
    return () => socket.off('notification', handleNotification);
  }, [socket]);

  const value = { notifications, unreadCount, setNotifications, setUnreadCount };

  return <NotifContext.Provider value={value}>{children}</NotifContext.Provider>;
}

export function useNotif() {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error('useNotif must be used within NotifProvider');
  return ctx;
}
