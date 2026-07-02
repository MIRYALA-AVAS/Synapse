import mongoose from 'mongoose';
import DirectMessage from '../models/DirectMessage.js';
import User from '../models/User.js';

export const getConversations = async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);

  const conversations = await DirectMessage.aggregate([
    { $match: { $or: [{ from: userId }, { to: userId }] } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$roomId',
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [{ $and: [{ $eq: ['$to', userId] }, { $eq: ['$read', false] }] }, 1, 0],
          },
        },
      },
    },
    {
      $addFields: {
        otherUserId: {
          $cond: [{ $eq: ['$lastMessage.from', userId] }, '$lastMessage.to', '$lastMessage.from'],
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'otherUserId',
        foreignField: '_id',
        as: 'otherUser',
      },
    },
    { $unwind: '$otherUser' },
    { $sort: { 'lastMessage.createdAt': -1 } },
    {
      $project: {
        _id: 0,
        roomId: '$_id',
        otherUser: {
          id: '$otherUser._id',
          name: '$otherUser.name',
          avatarUrl: '$otherUser.avatarUrl',
        },
        lastMessage: {
          body: '$lastMessage.body',
          createdAt: '$lastMessage.createdAt',
        },
        unreadCount: 1,
      },
    },
  ]);

  res.status(200).json({ conversations });
};

export const getHistory = async (req, res) => {
  const { userId } = req.params;
  const roomId = DirectMessage.buildRoomId(req.user.id, userId);

  const limit = Math.max(parseInt(req.query.limit, 10) || 50, 1);

  let before;
  if (req.query.before) {
    before = new Date(req.query.before);
    if (Number.isNaN(before.getTime())) {
      return res.status(400).json({ status: 'error', message: 'Invalid before timestamp', code: 'VALIDATION_ERROR' });
    }
  }

  const filter = {
    roomId,
    ...(before && { createdAt: { $lt: before } }),
  };

  const rows = await DirectMessage.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);

  const incomingIds = new Set(
    page.filter((m) => m.to.toString() === req.user.id).map((m) => m._id.toString())
  );
  if (incomingIds.size > 0) {
    await DirectMessage.updateMany({ _id: { $in: [...incomingIds] } }, { $set: { read: true } });
  }

  const messages = page
    .map((m) => (incomingIds.has(m._id.toString()) ? { ...m, read: true } : m))
    .reverse();

  res.status(200).json({ messages, hasMore });
};

export const getUserSearch = async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) {
    return res.status(200).json({ users: [] });
  }

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const users = await User.find({
    _id: { $ne: req.user.id },
    name: { $regex: escaped, $options: 'i' },
  })
    .select('name avatarUrl')
    .limit(10)
    .lean();

  res.status(200).json({
    users: users.map((u) => ({ id: u._id, name: u.name, avatarUrl: u.avatarUrl })),
  });
};
