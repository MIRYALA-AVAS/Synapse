import { formatDistanceToNow } from 'date-fns';

export const timeAgo = (date) => formatDistanceToNow(new Date(date), { addSuffix: true });

export const truncate = (text = '', max = 120) =>
  text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
