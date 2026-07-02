import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import verifyToken from '../middleware/verifyToken.js';
import { upload } from '../config/cloudinary.js';
import { getProfile, updateProfile, uploadAvatar, getMySpaces } from '../controllers/user.controller.js';

const router = Router();

const uploadAvatarMiddleware = (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ status: 'error', message: err.message, code: err.code });
    }
    if (err) return next(err);
    next();
  });
};

router.get('/me/spaces', verifyToken, getMySpaces);
router.get('/:id', getProfile);

router.put(
  '/profile',
  verifyToken,
  [
    body('name').optional().trim().isLength({ max: 60 }).withMessage('Name must be at most 60 characters'),
    body('bio').optional().trim().isLength({ max: 300 }).withMessage('Bio must be at most 300 characters'),
  ],
  updateProfile
);

router.put('/avatar', verifyToken, uploadAvatarMiddleware, uploadAvatar);

export default router;
