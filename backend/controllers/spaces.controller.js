import { validationResult } from 'express-validator';
import Space from '../models/Space.js';
import SpaceMessage from '../models/SpaceMessage.js';
import User from '../models/User.js';

const firstValidationError = (req) => {
  const errors = validationResult(req);
  return errors.isEmpty() ? null : errors.array()[0].msg;
};

export const createSpace = async (req, res) => {
  const validationError = firstValidationError(req);
  if (validationError) {
    return res.status(400).json({ status: 'error', message: validationError, code: 'VALIDATION_ERROR' });
  }

  const { name, description, isPrivate, coverColor } = req.body;

  const space = await Space.create({
    name,
    description,
    isPrivate,
    coverColor,
    admin: req.user.id,
    members: [req.user.id],
  });

  await User.updateOne({ _id: req.user.id }, { $addToSet: { spacesJoined: space._id } });

  res.status(201).json({ space });
};

export const getSpaces = async (req, res) => {
  const spaces = await Space.find({ isPrivate: false }).populate('admin', 'name avatarUrl').lean();

  const result = spaces.map(({ members, ...rest }) => ({
    ...rest,
    memberCount: members.length,
  }));

  res.status(200).json({ spaces: result });
};

export const getSpace = async (req, res) => {
  const space = await Space.findOne({ slug: req.params.slug });
  if (!space) {
    return res.status(404).json({ status: 'error', message: 'Space not found', code: 'NOT_FOUND' });
  }

  const isMember = !!req.user && space.members.some((id) => id.toString() === req.user.id);
  if (space.isPrivate && !isMember) {
    return res.status(403).json({ status: 'error', message: 'This space is private', code: 'FORBIDDEN' });
  }

  await space.populate('admin', 'name avatarUrl');
  await space.populate({ path: 'members', select: 'name avatarUrl', perDocumentLimit: 20 });

  res.status(200).json({ space });
};

export const joinSpace = async (req, res) => {
  const space = await Space.findOne({ slug: req.params.slug });
  if (!space) {
    return res.status(404).json({ status: 'error', message: 'Space not found', code: 'NOT_FOUND' });
  }

  const alreadyMember = space.members.some((id) => id.toString() === req.user.id);
  if (alreadyMember) {
    return res.status(409).json({ status: 'error', message: 'Already a member', code: 'ALREADY_MEMBER' });
  }

  await Space.updateOne({ _id: space._id }, { $addToSet: { members: req.user.id } });
  await User.updateOne({ _id: req.user.id }, { $addToSet: { spacesJoined: space._id } });

  const updatedSpace = await Space.findById(space._id).populate('admin', 'name avatarUrl');

  res.status(200).json({ message: 'Joined', space: updatedSpace });
};

export const leaveSpace = async (req, res) => {
  const space = await Space.findOne({ slug: req.params.slug });
  if (!space) {
    return res.status(404).json({ status: 'error', message: 'Space not found', code: 'NOT_FOUND' });
  }

  if (space.admin.toString() === req.user.id) {
    return res.status(403).json({
      status: 'error',
      message: 'Admin cannot leave — transfer admin or delete the space first',
      code: 'FORBIDDEN',
    });
  }

  await Space.updateOne({ _id: space._id }, { $pull: { members: req.user.id } });
  await User.updateOne({ _id: req.user.id }, { $pull: { spacesJoined: space._id } });

  res.status(200).json({ message: 'Left space' });
};

export const updateSpace = async (req, res) => {
  const { description, isPrivate, coverColor } = req.body;
  const space = req.space;

  if (description !== undefined) space.description = description;
  if (isPrivate !== undefined) space.isPrivate = isPrivate;
  if (coverColor !== undefined) space.coverColor = coverColor;

  await space.save();
  res.status(200).json({ space });
};

export const deleteSpace = async (req, res) => {
  const space = req.space;

  await SpaceMessage.deleteMany({ space: space._id });
  await Space.deleteOne({ _id: space._id });

  res.status(200).json({ message: 'Space deleted' });
};

export const kickMember = async (req, res) => {
  const { userId } = req.params;

  if (userId === req.user.id) {
    return res.status(403).json({ status: 'error', message: "Admin can't kick themselves", code: 'FORBIDDEN' });
  }

  await Space.updateOne({ _id: req.space._id }, { $pull: { members: userId } });

  res.status(200).json({ message: 'Member removed' });
};

export const transferAdmin = async (req, res) => {
  const { newAdminId } = req.body;
  const space = req.space;

  const isMember = space.members.some((id) => id.toString() === newAdminId);
  if (!isMember) {
    return res
      .status(400)
      .json({ status: 'error', message: 'New admin must be a member of the space', code: 'VALIDATION_ERROR' });
  }

  space.admin = newAdminId;
  await space.save();

  res.status(200).json({ space });
};
