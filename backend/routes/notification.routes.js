import { Router } from 'express';
import verifyToken from '../middleware/verifyToken.js';
import { getNotifications, markOneRead, markAllRead, clearAll } from '../controllers/notification.controller.js';

const router = Router();

router.get('/', verifyToken, getNotifications);
router.put('/read-all', verifyToken, markAllRead);
router.put('/:id/read', verifyToken, markOneRead);
router.delete('/', verifyToken, clearAll);

export default router;
