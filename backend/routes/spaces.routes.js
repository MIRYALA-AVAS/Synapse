import { Router } from 'express';
import { body } from 'express-validator';
import verifyToken from '../middleware/verifyToken.js';
import optionalAuth from '../middleware/optionalAuth.js';
import requireSpaceAdmin from '../middleware/requireSpaceAdmin.js';
import {
  createSpace,
  getSpaces,
  getSpace,
  joinSpace,
  leaveSpace,
  updateSpace,
  deleteSpace,
  kickMember,
  transferAdmin,
} from '../controllers/spaces.controller.js';
import { getMessages, deleteMessage } from '../controllers/spaceMessages.controller.js';

const router = Router();

router.get('/', getSpaces);
router.get('/:slug', optionalAuth, getSpace);

router.post(
  '/',
  verifyToken,
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 60 })
      .withMessage('Name must be at most 60 characters'),
  ],
  createSpace
);

router.post('/:slug/join', verifyToken, joinSpace);
router.post('/:slug/leave', verifyToken, leaveSpace);

router.put('/:slug', verifyToken, requireSpaceAdmin, updateSpace);
router.delete('/:slug', verifyToken, requireSpaceAdmin, deleteSpace);
router.delete('/:slug/members/:userId', verifyToken, requireSpaceAdmin, kickMember);
router.put('/:slug/admin', verifyToken, requireSpaceAdmin, transferAdmin);

router.get('/:slug/messages', verifyToken, getMessages);
router.delete('/:slug/messages/:messageId', verifyToken, deleteMessage);

export default router;
