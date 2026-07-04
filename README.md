# Synapse

A full-stack campus social platform — forum, group spaces, direct messaging, and real-time notifications — built for college students.

## Live Demo

| | URL |
|---|---|
| Frontend | https://synapse-lovat.vercel.app |
| Backend API | https://synapse-trhz.onrender.com |

> **Note:** The backend is hosted on Render's free tier and may take 30–60 seconds to wake up after a period of inactivity.

### Demo Credentials

| Name | Email | Password |
|---|---|---|
| Ashok | ashok@student.nitw.ac.in | Demo1234 |
| Ravi | ravi@student.nitw.ac.in | Demo1234 |
| Suresh | suresh@student.nitw.ac.in | Demo1234 |
| Ramesh | ramesh@student.nitw.ac.in | Demo1234 |
| Priya | priya@student.nitw.ac.in | Demo1234 |

## Deployment

| Service | Platform | Config |
|---|---|---|
| Frontend | Vercel | Root dir: `frontend`, env: `VITE_API_URL` |
| Backend | Render | Root dir: `backend`, start: `node server.js` |
| Database | MongoDB Atlas | Free tier M0 cluster |
| Media | Cloudinary | Free tier |

## Features

- **Forum** — create posts with tags, vote (up/down), comment, reply one level deep, sort by Latest / Top / Trending
- **Trending** — posts ranked by a time-decayed score; top-contributors leaderboard with Today / This Week / This Month filters
- **Spaces** — persistent group chat rooms with reply-to, typing indicators, admin controls (edit, kick, transfer, delete)
- **Direct Messages** — private one-to-one chat with real-time delivery and read receipts
- **Notifications** — real-time in-app notifications for new posts, comments, and DMs; mark-all-read and clear-all
- **Profiles** — avatar upload (Cloudinary), bio, post history, stats; email domain restricted to your college

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS v3, react-router-dom v6 |
| Backend | Node.js (ESM), Express 4, express-validator, helmet, express-rate-limit |
| Database | MongoDB Atlas, Mongoose 9 |
| Real-time | Socket.io 4 (authenticated via httpOnly JWT cookie) |
| Media | Cloudinary, multer-storage-cloudinary |
| Deployment | Vercel (client), Render (server) |

## Architecture

```
Browser
  │
  ├── REST (fetch / axios, withCredentials)
  │       └── Express API  ──── Mongoose ──── MongoDB Atlas
  │                   │
  │                   └── Cloudinary (avatar uploads)
  │
  └── WebSocket (socket.io-client, cookie auth)
          └── Socket.io Server
                  ├── Space rooms  (space:<id>)
                  ├── DM rooms     (dm:<roomId>)
                  └── User rooms   (<userId>)  ← notification delivery
```

Auth flow: login sets an httpOnly `token` cookie → all subsequent requests (REST + WS handshake) carry it automatically → `verifyToken` middleware / socket middleware validates the JWT on every request.

## Local Setup

### Prerequisites

- Node.js ≥ 20
- A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- A free [Cloudinary](https://cloudinary.com) account

### 1 — Clone and install

```bash
git clone https://github.com/MIRYALA-AVAS/Synapse.git
cd Synapse
npm install          # installs concurrently at root
npm install --prefix backend
npm install --prefix frontend
```

### 2 — Configure environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and fill in every variable (see comments inside)
```

```bash
# frontend/.env
echo "VITE_API_URL=http://localhost:5001" > frontend/.env
```

### 3 — Start dev servers

```bash
npm run dev
# Starts Express on :5001 and Vite on :5173 concurrently
```

Open [http://localhost:5173](http://localhost:5173) and register an account to get started.

## API Overview

| Group | Base path | Auth required |
|---|---|---|
| Auth | `/api/auth` | Partial (login/register: none; /me: yes) |
| Forum | `/api/forum` | GET public; mutations need auth |
| Trending | `/api/trending` | No |
| Spaces | `/api/spaces` | GET public; mutations need auth |
| Space messages | `/api/spaces/:slug/messages` | Yes |
| Direct messages | `/api/dm` | Yes |
| Users | `/api/users` | GET public; mutations need auth |
| Notifications | `/api/notifications` | Yes |

All mutation routes pass through `express-validator`; validation errors return `{ status: 'error', message, code: 'VALIDATION_ERROR' }`.

## WebSocket Events

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `join_space` | `{ spaceId }` | Subscribe to a space room (membership verified server-side) |
| `leave_space` | `{ spaceId }` | Unsubscribe from a space room |
| `space_message` | `{ spaceId, body, replyTo? }` | Send a message to a space |
| `delete_space_message` | `{ spaceId, messageId }` | Delete a message (own or admin) |
| `typing_start` | `{ spaceId }` | Broadcast typing indicator to space |
| `typing_stop` | `{ spaceId }` | Clear typing indicator |
| `join_dm` | `{ targetUserId }` | Subscribe to a DM room |
| `send_dm` | `{ targetUserId, body }` | Send a direct message |
| `dm_typing_start` | `{ targetUserId }` | Broadcast DM typing indicator |
| `dm_typing_stop` | `{ targetUserId }` | Clear DM typing indicator |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `new_space_message` | `{ message }` | New message in a space |
| `space_message_deleted` | `{ messageId }` | Message deleted from a space |
| `user_typing` | `{ userId, name, spaceId }` | Someone started typing in a space |
| `user_stopped_typing` | `{ userId, spaceId }` | Typing cleared |
| `new_dm` | `{ message }` | New direct message |
| `dm_user_typing` | `{ userId }` | Other user typing in DM |
| `dm_user_stopped_typing` | `{ userId }` | DM typing cleared |
| `notification` | `{ notification }` | Real-time notification (new post, comment, DM) |
| `user_online` | `{ userId }` | User connected |
| `user_offline` | `{ userId }` | User disconnected |

## Future improvements to be made

- **Redis Pub/Sub adapter** — the current `socket.io` setup is single-process; `@socket.io/redis-adapter` would let us scale horizontally without breaking room membership across pods
- **Email verification via Nodemailer** — confirm the `.ac.in` address before allowing login; currently only the domain suffix is checked
- **Infinite-scroll pagination** on the forum feed and DM history (cursor-based `before` param already wired in the DM history endpoint)
- **Reaction emojis** on space messages — a simple `{ emoji: String, users: [ObjectId] }[]` array on `SpaceMessage` with a socket event
