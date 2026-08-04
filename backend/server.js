// ==========================================
// 0. DNS IP ADDRESS OVERRIDE (Fixes MongoDB Atlas SRV Lookup Errors)
// ==========================================
import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4', '1.0.0.1']);
dns.setDefaultResultOrder('ipv4first');

import express from 'express';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
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

// ==========================================
// 1. SYSTEM INITIALIZATION & ENVIRONMENT
// ==========================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_SOCIAL_APP_KEY_2026';
const MONGODB_URI = process.env.DB_CLOUD_URL || process.env.MONGO_URI || process.env.MONGODB_URI;

console.log('🚀 Initializing Real-Time Social Chat Application Backend...');

// Initialize Next.js app instance
const nextApp = next({ dev, hostname, port });
const nextHandler = nextApp.getRequestHandler();

// Initialize Express & HTTP Server instances
const expressApp = express();
const server = createServer(expressApp);

// ==========================================
// 2. OFFLINE MULTIMEDIA UPLOAD CONFIGURATION (MULTER)
// ==========================================
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('DEBUG: Created missing upload directory at', uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'))
});
const upload = multer({ storage });

// ==========================================
// 3. MONGODB SCHEMAS & MODELS
// ==========================================
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

// ==========================================
// 4. AUTHENTICATION MIDDLEWARE
// ==========================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalid or expired' });
    }
    req.user = decodedUser;
    next();
  });
};

// ==========================================
// 5. NEXT.JS PREPARATION & APP INITIALIZATION
// ==========================================
nextApp.prepare().then(async () => {
  console.log('📦 Next.js frontend rendering engine compiled.');

  // MONGODB CONNECTION WITH DNS RESOLUTION & TLS
  if (!MONGODB_URI) {
    console.error('❌ FATAL: DB_CLOUD_URL is not defined in environment variables.');
    process.exit(1);
  }

  console.log('⏳ Attempting to connect to MongoDB Atlas cluster...');
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      tls: true,
    });
    console.log(`🍃 MongoDB Connected Successfully to Cluster!`);
  } catch (connErr) {
    console.error('❌ MongoDB Connection Detailed Error:', connErr);
    process.exit(1);
  }

  // Global Middlewares
  
  // NEW: Trust proxy configuration for accurate IP and protocol headers behind reverse proxies/tunnels
  expressApp.set('trust proxy', 1); 
  
  expressApp.use(cors({ origin: '*', credentials: true }));
  expressApp.use(express.json());
  expressApp.use(express.urlencoded({ extended: true }));
  expressApp.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

  // ==========================================
  // 6. REAL-TIME SOCKET.IO ENGINE
  // ==========================================
  const io = new SocketIOServer(server, { 
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Socket Authentication Middleware
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
    console.log(`⚡ User connected: ${userId} (Socket ID: ${socket.id})`);

    // Personal 1-on-1 Message Channel
    socket.join(`user:${userId}`);

    // DIRECT MESSAGING
    socket.on('dm:send', async (payload) => {
      try {
        const { toUserId, content, mediaUrl } = payload;
        
        // Persist message to MongoDB
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

        // Emit to recipient's socket room
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

    // GROUP WALLS & FEEDS
    socket.on('group:join', (groupId) => {
      socket.join(`group:${groupId}`);
      console.log(`User ${userId} joined group wall ${groupId}`);
    });

    socket.on('group:leave', (groupId) => {
      socket.leave(`group:${groupId}`);
    });

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

    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${userId}. Reason: ${reason}`);
    });
  });

  // ==========================================
  // 7. REST API ENDPOINTS
  // ==========================================
  
  // NEW: Health Check Endpoint for reliable uptime monitoring
  expressApp.get('/api/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : 'disconnected';
    res.status(200).json({ 
      status: 'OK', 
      database: dbStatus,
      timestamp: new Date().toISOString() 
    });
  });

  // Mobile + Password Authentication
  expressApp.post('/api/user/signup', async (req, res) => {
    try {
      const { phoneNumber, password, fullName } = req.body;
      if (!phoneNumber || !password || !fullName) {
        return res.status(400).json({ error: 'Phone number, password, and full name required' });
      }

      const existingUser = await User.findOne({ phoneNumber });
      if (existingUser) {
        return res.status(409).json({ error: 'User already exists with this phone number' });
      }

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
      if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials or account disabled' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ id: user.id, phoneNumber: user.phoneNumber }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, fullName: user.fullName, phoneNumber: user.phoneNumber } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // File Upload API (Images, Audio, Video, Documents)
  expressApp.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Fetch Message History
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

  // Fetch Group Wall Posts
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

  // ==========================================
  // 8. INTERCEPT NEXT.JS ROUTING & FALLBACK
  // ==========================================
  expressApp.all(/.*/, (req, res) => {
    const parsedUrl = parse(req.url, true);
    nextHandler(req, res, parsedUrl);
  });

  // Start HTTP Server
  server.listen(port, () => {
    console.log(`\n=============================================================`);
    console.log(`💬 Real-Time Social Chat Engine Is Live`);
    console.log(`📡 Serving API Requests & WebSockets at http://${hostname}:${port}`);
    console.log(`=============================================================\n`);
  });

  // NEW: Graceful Shutdown Handling
  const gracefulShutdown = () => {
    console.log('\n🛑 Initiating graceful shutdown...');
    io.close(() => {
      console.log('🔌 Socket.io connections closed.');
      server.close(async () => {
        console.log('🛑 HTTP server closed.');
        await mongoose.connection.close();
        console.log('🍃 MongoDB connection safely closed.');
        process.exit(0);
      });
    });
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);

}).catch((fatalInitErr) => {
  console.error('❌ Root System Initialization Failure:', fatalInitErr);
  process.exit(1);
});
