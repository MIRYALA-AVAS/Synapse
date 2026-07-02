import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User from '../models/User.js';
import { getAllowedDomains } from '../config/allowedDomains.js';

const SALT_ROUNDS = 12;
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

// Constant-time stand-in for bcrypt.compare when no user is found, so login
// takes the same time whether or not the email exists (avoids enumeration).
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing-safety', SALT_ROUNDS);

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl,
  role: user.role,
});

const signToken = (user) =>
  jwt.sign(
    { id: user._id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

const setAuthCookie = (res, token, maxAge = COOKIE_MAX_AGE) => {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge,
  });
};

const firstValidationError = (req) => {
  const errors = validationResult(req);
  return errors.isEmpty() ? null : errors.array()[0].msg;
};

export const register = async (req, res) => {
  const validationError = firstValidationError(req);
  if (validationError) {
    return res.status(400).json({ status: 'error', message: validationError, code: 'VALIDATION_ERROR' });
  }

  const { name, password } = req.body;
  const email = req.body.email.trim().toLowerCase();
  const domain = email.split('@')[1];

  const allowedDomains = getAllowedDomains();
  if (allowedDomains.length > 0 && !allowedDomains.includes(domain)) {
    return res.status(400).json({ status: 'error', message: 'Email domain not permitted', code: 'DOMAIN_NOT_ALLOWED' });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ status: 'error', message: 'Email already registered', code: 'EMAIL_TAKEN' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, passwordHash });

  setAuthCookie(res, signToken(user));
  res.status(201).json({ user: sanitizeUser(user) });
};

export const login = async (req, res) => {
  const validationError = firstValidationError(req);
  if (validationError) {
    return res.status(400).json({ status: 'error', message: validationError, code: 'VALIDATION_ERROR' });
  }

  const email = req.body.email.trim().toLowerCase();
  const { password } = req.body;

  const user = await User.findOne({ email });
  const isMatch = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

  if (!user || !isMatch) {
    return res.status(401).json({ status: 'error', message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
  }

  setAuthCookie(res, signToken(user));
  res.status(200).json({ user: sanitizeUser(user) });
};

export const logout = (req, res) => {
  setAuthCookie(res, '', 0);
  res.status(200).json({ message: 'Logged out' });
};

export const getMe = async (req, res) => {
  const user = await User.findById(req.user.id).select('-passwordHash');

  if (!user) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized', code: 'UNAUTHORIZED' });
  }

  res.status(200).json({ user });
};
