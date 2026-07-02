import 'dotenv/config';
import 'express-async-errors';

import http from 'http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';

import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js';
import initSockets from './sockets/index.js';
import authRoutes from './routes/auth.routes.js';
import forumRoutes from './routes/forum.routes.js';
import trendingRoutes from './routes/trending.routes.js';
import spacesRoutes from './routes/spaces.routes.js';
import dmRoutes from './routes/dm.routes.js';
import userRoutes from './routes/user.routes.js';
import notificationRoutes from './routes/notification.routes.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));

const isDev = process.env.NODE_ENV !== 'production';

// Global rate limiting
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 1000 : 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message: 'Too many requests, please try again later.', code: 'RATE_LIMIT' },
  })
);

// Stricter rate limit on auth endpoints — 10 req/15 min in production
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many auth attempts, please try again later.', code: 'RATE_LIMIT' },
});

app.set('io', io);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/trending', trendingRoutes);
app.use('/api/spaces', spacesRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

initSockets(io);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});
