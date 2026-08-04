import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4', '1.0.0.1']);
dns.setDefaultResultOrder('ipv4first');

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const port = parseInt(process.env.PORT || '4000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_SOCIAL_APP_KEY_2026';
const MONGODB_URI = process.env.DB_CLOUD_URL || process.env.MONGO_URI || process.env.MONGODB_URI;

console.log('🚀 Initializing Backend API & Socket.io Server...');

const expressApp = express();
const server = createServer(expressApp);

// Global Middlewares
expressApp.set('trust proxy', 1);
expressApp.use(cors({ origin: '*', credentials: true }));
expressApp.use(express.json());
expressApp.use(express.urlencoded({ extended: true }));

// Uploads Directory Setup
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
expressApp.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'))
});
const upload = multer({ storage });

// MongoDB Schemas & Models
const UserSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  avatarUrl: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const MessageSchema = new mongoose.Schema({
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  mediaUrl: { type: String, default: '' },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

const GroupPostSchema = new mongoose.Schema({
  groupId: { type: String, required: true, index: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  mediaUrl: { type: String, default: '' }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
const GroupPost = mongoose.models.GroupPost || mongoose.model('GroupPost', GroupPostSchema);

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) return res.status(403).json({ error: 'Token invalid or expired' });
    req.user = decodedUser;
    next();
  });
};

// Real-Time Socket.io Engine
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: 10000,
  pingTimeout: 5000,
});

io.use((socket, nextSocket) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
  if (!token) return nextSocket(new Error('Authentication error: Token missing'));

  jwt.verify(token.replace('Bearer ', ''), JWT_SECRET, (err, decoded) => {
    if (err) return nextSocket(new Error('Authentication error: Invalid session'));
    socket.data.user = decoded;
    nextSocket();
  });
});

io.on('connection', (socket) => {
  const userId = socket.data.user.id;
  socket.join(`user:${userId}`);

  socket.on('dm:send', async (payload) => {
    try {
      const { toUserId, content, mediaUrl } = payload;
      const newMessage = await Message.create({
        fromUserId: userId,
        toUserId,
        content,
        mediaUrl: mediaUrl || ''
      });

      const formattedPayload = {
        messageId: newMessage.id,
        fromUserId: userId,
        content: newMessage.content,
        mediaUrl: newMessage.mediaUrl,
        timestamp: newMessage.createdAt
      };

      socket.to(`user:${toUserId}`).emit('dm:receive', formattedPayload);
      socket.emit('dm:ack', { messageId: newMessage.id, status: 'delivered' });
    } catch (err) {
      console.error('Socket DM Error:', err);
    }
  });

  socket.on('dm:typing', (payload) => {
    socket.to(`user:${payload.toUserId}`).emit('dm:typing_status', {
      fromUserId: userId,
      isTyping: payload.isTyping
    });
  });

  socket.on('group:join', (groupId) => socket.join(`group:${groupId}`));
  socket.on('group:leave', (groupId) => socket.leave(`group:${groupId}`));

  socket.on('group:post', async (payload) => {
    try {
      const { groupId, content, mediaUrl } = payload;
      const newPost = await GroupPost.create({
        groupId,
        authorId: userId,
        content,
        mediaUrl: mediaUrl || ''
      });

      io.to(`group:${groupId}`).emit('group:new_post', {
        postId: newPost.id,
        authorId: userId,
        groupId: newPost.groupId,
        content: newPost.content,
        mediaUrl: newPost.mediaUrl,
        timestamp: newPost.createdAt
      });
    } catch (err) {
      console.error('Socket Group Post Error:', err);
    }
  });
});

// REST Endpoints
expressApp.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

expressApp.post('/api/user/signup', async (req, res) => {
  try {
    const { phoneNumber, password, fullName } = req.body;
    if (!phoneNumber || !password || !fullName) return res.status(400).json({ error: 'Missing required fields' });

    const existing = await User.findOne({ phoneNumber });
    if (existing) return res.status(409).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await User.create({ phoneNumber, password: hashedPassword, fullName });
    const token = jwt.sign({ id: newUser.id, phoneNumber: newUser.phoneNumber }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: newUser.id, fullName: newUser.fullName, phoneNumber: newUser.phoneNumber } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

expressApp.post('/api/user/login', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;
    const user = await User.findOne({ phoneNumber });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, phoneNumber: user.phoneNumber }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, fullName: user.fullName, phoneNumber: user.phoneNumber } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

expressApp.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

expressApp.get('/api/messages/:targetUserId', authenticateToken, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { fromUserId: req.user.id, toUserId: req.params.targetUserId },
        { fromUserId: req.params.targetUserId, toUserId: req.user.id }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

expressApp.get('/api/group/:groupId/posts', authenticateToken, async (req, res) => {
  try {
    const posts = await GroupPost.find({ groupId: req.params.groupId })
      .populate('authorId', 'fullName avatarUrl')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Database Connection & Server Launch
mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000, tls: true }).then(() => {
  console.log('🍃 Connected to MongoDB Atlas');
  server.listen(port, () => {
    console.log(`📡 Backend API & Socket.io server running on port ${port}`);
  });
}).catch(err => {
  console.error('❌ MongoDB Connection Error:', err);
  process.exit(1);
});
