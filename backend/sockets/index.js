import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import Space from '../models/Space.js';
import SpaceMessage from '../models/SpaceMessage.js';
import DirectMessage from '../models/DirectMessage.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

const onlineUsers = new Map();

export const emitNotification = (io, recipientId, notifData) => {
  io.to(recipientId.toString()).emit('notification', notifData);
};

const isSpaceMember = (space, userId) => !!space && space.members.some((id) => id.toString() === userId);

const shapeReplyTo = (replyTo) =>
  replyTo && {
    _id: replyTo._id,
    author: { name: replyTo.author?.name },
    bodyPreview: replyTo.body.slice(0, 60),
  };

const initSockets = (io) => {
  io.use((socket, next) => {
    const cookies = parseCookie(socket.handshake.headers.cookie || '');
    const token = cookies.token;

    if (!token) {
      return next(new Error('UNAUTHORIZED'));
    }

    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(socket.user.id);
    onlineUsers.set(socket.user.id, socket.id);
    io.emit('user_online', { userId: socket.user.id });

    // Wraps every handler so a bad payload or DB error can't crash the
    // process or leave the client hanging — emits a generic 'error' instead.
    const safe = (handler) => async (payload) => {
      try {
        await handler(payload || {});
      } catch (err) {
        console.error('[socket]', socket.user.id, err);
        socket.emit('error', { message: 'Something went wrong' });
      }
    };

    socket.on(
      'join_space',
      safe(async ({ spaceId }) => {
        const space = await Space.findById(spaceId).select('members');
        if (!isSpaceMember(space, socket.user.id)) {
          return socket.emit('error', { message: 'Not a member' });
        }
        socket.join('space:' + spaceId);
        socket.emit('space_joined', { spaceId });
      })
    );

    socket.on(
      'leave_space',
      safe(({ spaceId }) => {
        socket.leave('space:' + spaceId);
      })
    );

    socket.on(
      'space_message',
      safe(async ({ spaceId, body, replyTo }) => {
        if (!body || !body.trim() || body.length > 2000) {
          return socket.emit('error', { message: 'Invalid message body' });
        }

        const space = await Space.findById(spaceId).select('members');
        if (!isSpaceMember(space, socket.user.id)) {
          return socket.emit('error', { message: 'Not a member' });
        }

        const message = await SpaceMessage.create({
          space: spaceId,
          author: socket.user.id,
          body,
          replyTo: replyTo || null,
        });

        await message.populate('author', 'name avatarUrl');
        await message.populate({
          path: 'replyTo',
          select: 'body author',
          populate: { path: 'author', select: 'name' },
        });

        const shaped = message.toObject();
        shaped.replyTo = shapeReplyTo(shaped.replyTo);

        io.to('space:' + spaceId).emit('new_space_message', { message: shaped });
      })
    );

    socket.on(
      'delete_space_message',
      safe(async ({ spaceId, messageId }) => {
        const [space, message] = await Promise.all([
          Space.findById(spaceId).select('admin'),
          SpaceMessage.findOne({ _id: messageId, space: spaceId }).select('author'),
        ]);

        if (!space || !message) {
          return socket.emit('error', { message: 'Not found' });
        }

        const isAuthor = message.author.toString() === socket.user.id;
        const isAdmin = space.admin.toString() === socket.user.id;
        if (!isAuthor && !isAdmin) {
          return socket.emit('error', { message: 'Not authorized' });
        }

        await SpaceMessage.deleteOne({ _id: messageId });
        io.to('space:' + spaceId).emit('space_message_deleted', { messageId });
      })
    );

    socket.on(
      'typing_start',
      safe(({ spaceId }) => {
        socket.to('space:' + spaceId).emit('user_typing', { userId: socket.user.id, name: socket.user.name, spaceId });
      })
    );

    socket.on(
      'typing_stop',
      safe(({ spaceId }) => {
        socket.to('space:' + spaceId).emit('user_stopped_typing', { userId: socket.user.id, spaceId });
      })
    );

    socket.on(
      'join_dm',
      safe(async ({ targetUserId }) => {
        const targetExists = await User.exists({ _id: targetUserId });
        if (!targetExists) {
          return socket.emit('error', { message: 'User not found' });
        }
        const roomId = DirectMessage.buildRoomId(socket.user.id, targetUserId);
        socket.join('dm:' + roomId);
      })
    );

    socket.on(
      'send_dm',
      safe(async ({ targetUserId, body }) => {
        if (!body || !body.trim() || body.length > 1000) {
          return socket.emit('error', { message: 'Invalid message body' });
        }

        const roomId = DirectMessage.buildRoomId(socket.user.id, targetUserId);

        const message = await DirectMessage.create({
          roomId,
          from: socket.user.id,
          to: targetUserId,
          body,
        });

        await message.populate('from', 'name avatarUrl');

        io.to('dm:' + roomId).emit('new_dm', { message });

        const notification = await Notification.create({
          recipient: targetUserId,
          type: 'new_dm',
          message: `New message from ${socket.user.name}`,
          link: '/dm/' + socket.user.id,
          actor: socket.user.id,
        });

        emitNotification(io, targetUserId, { notification });
      })
    );

    socket.on(
      'dm_typing_start',
      safe(({ targetUserId }) => {
        const roomId = DirectMessage.buildRoomId(socket.user.id, targetUserId);
        socket.to('dm:' + roomId).emit('dm_user_typing', { userId: socket.user.id });
      })
    );

    socket.on(
      'dm_typing_stop',
      safe(({ targetUserId }) => {
        const roomId = DirectMessage.buildRoomId(socket.user.id, targetUserId);
        socket.to('dm:' + roomId).emit('dm_user_stopped_typing', { userId: socket.user.id });
      })
    );

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.user.id);
      io.emit('user_offline', { userId: socket.user.id });
    });
  });
};

export default initSockets;
