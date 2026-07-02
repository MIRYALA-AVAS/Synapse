import { validationResult } from 'express-validator';
import User from '../models/User.js';
import ForumPost from '../models/ForumPost.js';

const firstValidationError = (req) => {
  const errors = validationResult(req);
  return errors.isEmpty() ? null : errors.array()[0].msg;
};

export const getProfile = async (req, res) => {
  const user = await User.findById(req.params.id).select('name bio avatarUrl createdAt spacesJoined');
  if (!user) {
    return res.status(404).json({ status: 'error', message: 'User not found', code: 'NOT_FOUND' });
  }

  const [stats] = await ForumPost.aggregate([
    { $match: { author: user._id } },
    {
      $group: {
        _id: null,
        postCount: { $sum: 1 },
        totalUpvotes: { $sum: { $size: '$upvotes' } },
      },
    },
  ]);

  res.status(200).json({
    user: {
      id: user._id,
      name: user.name,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
    stats: {
      postCount: stats?.postCount || 0,
      totalUpvotes: stats?.totalUpvotes || 0,
      spacesCount: user.spacesJoined.length,
    },
  });
};

export const updateProfile = async (req, res) => {
  const validationError = firstValidationError(req);
  if (validationError) {
    return res.status(400).json({ status: 'error', message: validationError, code: 'VALIDATION_ERROR' });
  }

  const { name, bio } = req.body;
  const update = {};
  if (name !== undefined) update.name = name;
  if (bio !== undefined) update.bio = bio;

  const user = await User.findByIdAndUpdate(req.user.id, update, { new: true, runValidators: true }).select(
    '-passwordHash'
  );

  res.status(200).json({ user });
};

export const uploadAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'No file uploaded', code: 'VALIDATION_ERROR' });
  }

  await User.findByIdAndUpdate(req.user.id, { avatarUrl: req.file.path });

  res.status(200).json({ avatarUrl: req.file.path });
};

export const getMySpaces = async (req, res) => {
  const user = await User.findById(req.user.id).populate('spacesJoined', 'name slug coverColor members');

  const spaces = user.spacesJoined.map((space) => ({
    id: space._id,
    name: space.name,
    slug: space.slug,
    coverColor: space.coverColor,
    memberCount: space.members.length,
  }));

  res.status(200).json({ spaces });
};
