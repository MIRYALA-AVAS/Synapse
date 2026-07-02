import Space from '../models/Space.js';
import SpaceMessage from '../models/SpaceMessage.js';

export const getMessages = async (req, res) => {
  const space = await Space.findOne({ slug: req.params.slug });
  if (!space) {
    return res.status(404).json({ status: 'error', message: 'Space not found', code: 'NOT_FOUND' });
  }

  const isMember = space.members.some((id) => id.toString() === req.user.id);
  if (!isMember) {
    return res
      .status(403)
      .json({ status: 'error', message: 'You must be a member of this space', code: 'FORBIDDEN' });
  }

  const limit = Math.max(parseInt(req.query.limit, 10) || 50, 1);

  let before;
  if (req.query.before) {
    before = new Date(req.query.before);
    if (Number.isNaN(before.getTime())) {
      return res.status(400).json({ status: 'error', message: 'Invalid before timestamp', code: 'VALIDATION_ERROR' });
    }
  }

  const filter = {
    space: space._id,
    ...(before && { createdAt: { $lt: before } }),
  };

  const rows = await SpaceMessage.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .populate('author', 'name avatarUrl')
    .populate({
      path: 'replyTo',
      select: 'body author',
      populate: { path: 'author', select: 'name' },
    })
    .lean();

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);

  const messages = page.map((msg) => ({
    ...msg,
    replyTo: msg.replyTo
      ? {
          _id: msg.replyTo._id,
          author: { name: msg.replyTo.author?.name },
          bodyPreview: msg.replyTo.body.slice(0, 60),
        }
      : null,
  }));

  messages.reverse();

  res.status(200).json({ messages, hasMore });
};

export const deleteMessage = async (req, res) => {
  const space = await Space.findOne({ slug: req.params.slug });
  if (!space) {
    return res.status(404).json({ status: 'error', message: 'Space not found', code: 'NOT_FOUND' });
  }

  const message = await SpaceMessage.findOne({ _id: req.params.messageId, space: space._id });
  if (!message) {
    return res.status(404).json({ status: 'error', message: 'Message not found', code: 'NOT_FOUND' });
  }

  const isAuthor = message.author.toString() === req.user.id;
  const isAdmin = space.admin.toString() === req.user.id;
  if (!isAuthor && !isAdmin) {
    return res
      .status(403)
      .json({ status: 'error', message: 'Not authorized to delete this message', code: 'FORBIDDEN' });
  }

  await SpaceMessage.deleteOne({ _id: message._id });

  res.status(200).json({ messageId: message._id });
};
