import jwt from 'jsonwebtoken';

const optionalAuth = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return next();

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    // invalid/expired token — proceed as anonymous instead of rejecting
  }
  next();
};

export default optionalAuth;
