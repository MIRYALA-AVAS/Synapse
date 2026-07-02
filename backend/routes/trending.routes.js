import { Router } from 'express';
import { getTrending, getLeaderboard } from '../controllers/trending.controller.js';

const router = Router();

router.get('/leaderboard', getLeaderboard);
router.get('/', getTrending);

export default router;
