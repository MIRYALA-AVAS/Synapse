import Notification from '../models/Notification.js';

export const getNotifications = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit, 10) || 20, 1);

  const filter = { recipient: req.user.id };
  if (req.query.unread === 'true') {
    filter.read = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate('actor', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user.id, read: false }),
  ]);

  res.status(200).json({
    notifications,
    unreadCount,
    totalPages: Math.ceil(total / limit),
  });
};

export const markOneRead = async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) {
    return res.status(404).json({ status: 'error', message: 'Notification not found', code: 'NOT_FOUND' });
  }

  if (notification.recipient.toString() !== req.user.id) {
    return res.status(403).json({ status: 'error', message: 'Not authorized', code: 'FORBIDDEN' });
  }

  notification.read = true;
  await notification.save();

  res.status(200).json({ notification });
};

export const markAllRead = async (req, res) => {
  await Notification.updateMany({ recipient: req.user.id, read: false }, { $set: { read: true } });
  res.status(200).json({ message: 'All marked as read' });
};

export const clearAll = async (req, res) => {
  await Notification.deleteMany({ recipient: req.user.id });
  res.status(200).json({ message: 'Cleared' });
};
