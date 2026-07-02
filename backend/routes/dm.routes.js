import { Router } from 'express';
import verifyToken from '../middleware/verifyToken.js';
import { getConversations, getHistory, getUserSearch } from '../controllers/dm.controller.js';

const router = Router();

router.get('/conversations', verifyToken, getConversations);
router.get('/users/search', verifyToken, getUserSearch);
router.get('/:userId', verifyToken, getHistory);

export default router;
