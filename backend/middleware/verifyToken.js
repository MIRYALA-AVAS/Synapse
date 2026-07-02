import jwt from 'jsonwebtoken';

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized', code: 'UNAUTHORIZED' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ status: 'error', message: 'Unauthorized', code: 'UNAUTHORIZED' });
  }
};

export default verifyToken;
