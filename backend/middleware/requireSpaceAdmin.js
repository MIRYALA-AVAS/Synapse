import Space from '../models/Space.js';

const requireSpaceAdmin = async (req, res, next) => {
  const space = await Space.findOne({ slug: req.params.slug });

  if (!space) {
    return res.status(404).json({ status: 'error', message: 'Space not found', code: 'NOT_FOUND' });
  }

  if (space.admin.toString() !== req.user.id) {
    return res.status(403).json({ status: 'error', message: 'Admin only', code: 'FORBIDDEN' });
  }

  req.space = space;
  next();
};

export default requireSpaceAdmin;
