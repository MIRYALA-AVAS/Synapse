import { validationResult } from 'express-validator';
import ForumPost from '../models/ForumPost.js';
import Comment from '../models/Comment.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { calculateTrendScore } from '../services/trendScore.service.js';
import { emitNotification } from '../sockets/index.js';

const SORT_OPTIONS = {
  latest: { createdAt: -1 },
  top: { voteScore: -1 },
  trending: { trendScore: -1 },
};

const firstValidationError = (req) => {
  const errors = validationResult(req);
  return errors.isEmpty() ? null : errors.array()[0].msg;
};

const applyVote = (doc, userId, type) => {
  if (type === 'up') {
    doc.upvotes.addToSet(userId);
    doc.downvotes.pull(userId);
  } else if (type === 'down') {
    doc.downvotes.addToSet(userId);
    doc.upvotes.pull(userId);
  } else {
    doc.upvotes.pull(userId);
    doc.downvotes.pull(userId);
  }
};

const getUserVote = (doc, userId) => {
  if (doc.upvotes.some((id) => id.toString() === userId)) return 'up';
  if (doc.downvotes.some((id) => id.toString() === userId)) return 'down';
  return null;
};

export const getPosts = async (req, res) => {
  const { tag, author } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit, 10) || 20, 1);
  const sortBy = SORT_OPTIONS[req.query.sort] || SORT_OPTIONS.latest;

  const filter = {};
  if (tag) filter.tags = tag;
  if (author) filter.author = author;

  const [posts, total] = await Promise.all([
    ForumPost.find(filter)
      .populate('author', 'name avatarUrl')
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(limit),
    ForumPost.countDocuments(filter),
  ]);

  res.status(200).json({
    posts,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  });
};

export const createPost = async (req, res) => {
  const validationError = firstValidationError(req);
  if (validationError) {
    return res.status(400).json({ status: 'error', message: validationError, code: 'VALIDATION_ERROR' });
  }

  const { title, body, tags = [] } = req.body;

  const post = await ForumPost.create({ author: req.user.id, title, body, tags });
  await post.populate('author', 'name avatarUrl');

  const message = `${post.author.name} posted: ${title}`;
  const link = `/forum/${post._id}`;

  const recipients = await User.find({ _id: { $ne: req.user.id } }).select('_id');
  if (recipients.length > 0) {
    const notifications = await Notification.insertMany(
      recipients.map((recipient) => ({
        recipient: recipient._id,
        type: 'new_forum_post',
        message,
        link,
        actor: req.user.id,
      }))
    );

    const io = req.app.get('io');
    notifications.forEach((notification) => emitNotification(io, notification.recipient, { notification }));
  }

  res.status(201).json({ post });
};

export const getPost = async (req, res) => {
  const post = await ForumPost.findById(req.params.id).populate('author', 'name avatarUrl');
  if (!post) {
    return res.status(404).json({ status: 'error', message: 'Post not found', code: 'NOT_FOUND' });
  }

  const topLevelComments = await Comment.find({ post: post._id, parent: null })
    .populate('author', 'name avatarUrl')
    .lean();

  topLevelComments.sort((a, b) => b.upvotes.length - a.upvotes.length);

  const replies = await Comment.find({
    post: post._id,
    parent: { $in: topLevelComments.map((c) => c._id) },
    depth: 1,
  })
    .populate('author', 'name avatarUrl')
    .sort({ createdAt: 1 })
    .lean();

  const repliesByParent = replies.reduce((acc, reply) => {
    const key = reply.parent.toString();
    (acc[key] ||= []).push(reply);
    return acc;
  }, {});

  const comments = topLevelComments.map((comment) => ({
    ...comment,
    replies: repliesByParent[comment._id.toString()] || [],
  }));

  res.status(200).json({ post, comments });
};

export const votePost = async (req, res) => {
  const { type } = req.body;
  if (!['up', 'down', 'remove'].includes(type)) {
    return res.status(400).json({ status: 'error', message: 'Invalid vote type', code: 'VALIDATION_ERROR' });
  }

  const post = await ForumPost.findById(req.params.id);
  if (!post) {
    return res.status(404).json({ status: 'error', message: 'Post not found', code: 'NOT_FOUND' });
  }

  if (post.author.toString() === req.user.id) {
    return res.status(403).json({ status: 'error', message: "You can't vote on your own post", code: 'FORBIDDEN' });
  }

  applyVote(post, req.user.id, type);
  post.trendScore = calculateTrendScore(post);
  await post.save();

  const io = req.app.get('io');
  io.emit('post_vote_updated', { postId: post._id, voteScore: post.voteScore });

  res.status(200).json({ voteScore: post.voteScore, userVote: getUserVote(post, req.user.id) });
};

export const createComment = async (req, res) => {
  const { body, parentId } = req.body;
  if (!body || !body.trim()) {
    return res.status(400).json({ status: 'error', message: 'Comment body is required', code: 'VALIDATION_ERROR' });
  }

  const post = await ForumPost.findById(req.params.id);
  if (!post) {
    return res.status(404).json({ status: 'error', message: 'Post not found', code: 'NOT_FOUND' });
  }

  let parent = null;
  if (parentId) {
    parent = await Comment.findById(parentId);
    if (!parent) {
      return res.status(404).json({ status: 'error', message: 'Parent comment not found', code: 'NOT_FOUND' });
    }
    if (parent.depth >= 1) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Comments can only be nested one level deep', code: 'MAX_DEPTH_EXCEEDED' });
    }
  }

  const comment = await Comment.create({
    post: post._id,
    author: req.user.id,
    body,
    parent: parent ? parent._id : null,
    depth: parent ? 1 : 0,
  });
  await comment.populate('author', 'name avatarUrl');

  post.commentCount += 1;
  post.trendScore = calculateTrendScore(post);
  await post.save();

  const io = req.app.get('io');

  io.emit('new_comment', {
    postId: post._id,
    comment: comment.toObject(),
    parentId: parent ? parent._id : null,
    commentCount: post.commentCount,
  });

  if (post.author.toString() !== req.user.id) {
    const notification = await Notification.create({
      recipient: post.author,
      type: 'comment_on_post',
      message: `${comment.author.name} commented on your post: ${post.title}`,
      link: `/forum/${post._id}`,
      actor: req.user.id,
    });

    emitNotification(io, post.author, { notification });
  }

  res.status(201).json({ comment });
};

export const voteComment = async (req, res) => {
  const { type } = req.body;
  if (!['up', 'down', 'remove'].includes(type)) {
    return res.status(400).json({ status: 'error', message: 'Invalid vote type', code: 'VALIDATION_ERROR' });
  }

  const comment = await Comment.findById(req.params.commentId);
  if (!comment) {
    return res.status(404).json({ status: 'error', message: 'Comment not found', code: 'NOT_FOUND' });
  }

  if (comment.author.toString() === req.user.id) {
    return res.status(403).json({ status: 'error', message: "You can't vote on your own comment", code: 'FORBIDDEN' });
  }

  applyVote(comment, req.user.id, type);
  await comment.save();

  res.status(200).json({
    voteScore: comment.upvotes.length - comment.downvotes.length,
    userVote: getUserVote(comment, req.user.id),
  });
};

export const getUserComments = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit, 10) || 20, 1);
  const filter = { author: req.user.id };

  const [comments, total] = await Promise.all([
    Comment.find(filter)
      .populate('post', 'title')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Comment.countDocuments(filter),
  ]);

  res.status(200).json({
    comments,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  });
};
