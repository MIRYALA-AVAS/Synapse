import { Router } from 'express';
import { body } from 'express-validator';
import verifyToken from '../middleware/verifyToken.js';
import { TAGS } from '../models/ForumPost.js';
import {
  getPosts,
  createPost,
  getPost,
  votePost,
  createComment,
  voteComment,
  getUserComments,
} from '../controllers/forum.controller.js';

const router = Router();

router.get('/', getPosts);
router.get('/my-comments', verifyToken, getUserComments);
router.get('/:id', getPost);

router.post(
  '/',
  verifyToken,
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 200 })
      .withMessage('Title must be at most 200 characters'),
    body('body').trim().notEmpty().withMessage('Body is required'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('tags.*').optional().isIn(TAGS).withMessage('Invalid tag'),
  ],
  createPost
);

router.put('/:id/vote', verifyToken, votePost);
router.post('/:id/comments', verifyToken, createComment);
router.put('/comments/:commentId/vote', verifyToken, voteComment);

export default router;
