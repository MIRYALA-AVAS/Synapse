import ForumPost from '../models/ForumPost.js';

const PERIOD_MS = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

export const getTrending = async (req, res) => {
  const period = PERIOD_MS[req.query.period] ? req.query.period : 'week';
  const cutoff = new Date(Date.now() - PERIOD_MS[period]);

  const posts = await ForumPost.find({ createdAt: { $gte: cutoff } })
    .populate('author', 'name avatarUrl')
    .sort({ trendScore: -1 })
    .limit(30);

  res.status(200).json({ posts, period });
};

export const getLeaderboard = async (req, res) => {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const leaderboard = await ForumPost.aggregate([
    { $match: { createdAt: { $gte: oneWeekAgo } } },
    {
      $group: {
        _id: '$author',
        totalUpvotesReceived: { $sum: { $size: '$upvotes' } },
        postCount: { $sum: 1 },
      },
    },
    { $sort: { totalUpvotesReceived: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        name: '$user.name',
        avatarUrl: '$user.avatarUrl',
        totalUpvotesReceived: 1,
        postCount: 1,
      },
    },
  ]);

  res.status(200).json({ leaderboard });
};
