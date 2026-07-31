import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { verifySessionToken } from './lib/auth/session'; // Assumed utility for JWT/Session verification

// Environment configuration
const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js application
const app = next({ dev, hostname, port });
const handleNextRequests = app.getRequestHandler();

app.prepare().then(() => {
  // 1. Create standard Node.js HTTP Server
  const httpServer = createServer((req, res) => {
    try {
      if (!req.url) throw new Error('No URL in request');
      const parsedUrl = parse(req.url, true);
      
      // Let Next.js handle standard HTTP routing, API routes, and Server Actions
      handleNextRequests(req, res, parsedUrl);
    } catch (err) {
      console.error('Error processing HTTP request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // 2. Initialize Real-Time Communication Layer (WebSocket)
  const io = new SocketIOServer(httpServer, {
    cors: {
      // When exposing this local environment via ngrok for testing webhooks or mobile clients, 
      // ensure the secure forwarding URL is appended to ALLOWED_ORIGINS in your .env
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Configure aggressive ping intervals to manage connection ticks efficiently, 
    // ensuring real-time chat states and typing indicators remain perfectly synced
    pingInterval: 10000,
    pingTimeout: 5000,
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true,
    }
  });

  // 3. (Optional but Recommended) Redis Adapter for Horizontal Scalability
  // If running multiple instances of this Node server, Redis ensures events are broadcast across all nodes.
  if (process.env.REDIS_URL) {
    const pubClient = new Redis(process.env.REDIS_URL);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Redis adapter connected for WebSocket scaling.');
  }

  // 4. WebSocket Authentication Middleware
  io.use(async (socket: Socket, nextAuth) => {
    try {
      // Extract auth token securely from handshake headers or auth payload
      const token = socket.handshake.auth.token || socket.handshake.headers.cookie;
      if (!token) {
        return nextAuth(new Error('Authentication error: Token missing'));
      }

      // Validate session based on mobile number/password login flow
      const user = await verifySessionToken(token);
      if (!user) {
        return nextAuth(new Error('Authentication error: Invalid session'));
      }

      // Attach user identity to the socket connection
      socket.data.user = { id: user.id, mobileNumber: user.mobileNumber };
      nextAuth();
    } catch (error) {
      nextAuth(new Error('Authentication error: Server fault'));
    }
  });

  // 5. WebSocket Event Handlers & Room Management
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.user.id;
    console.log(`User connected: ${userId} (Socket: ${socket.id})`);

    // Automatically join a personal room for 1-on-1 direct messaging routing
    socket.join(`user:${userId}`);

    // --- DIRECT MESSAGING ---
    socket.on('dm:send', async (payload: { toUserId: string; messageId: string; content: string; mediaUrl?: string }) => {
      // Emit to the recipient's personal room
      socket.to(`user:${payload.toUserId}`).emit('dm:receive', {
        fromUserId: userId,
        messageId: payload.messageId,
        content: payload.content,
        mediaUrl: payload.mediaUrl, // Decoupled media URL from S3/Cloudinary
        timestamp: new Date().toISOString(),
      });
      // Optionally emit an acknowledgment back to the sender
      socket.emit('dm:ack', { messageId: payload.messageId, status: 'delivered' });
    });

    socket.on('dm:typing', (payload: { toUserId: string; isTyping: boolean }) => {
      socket.to(`user:${payload.toUserId}`).emit('dm:typing_status', {
        fromUserId: userId,
        isTyping: payload.isTyping
      });
    });

    // --- GROUP WALLS & FEEDS ---
    socket.on('group:join', (groupId: string) => {
      // Logic to verify if user is a member of this group in PostgreSQL goes here
      socket.join(`group:${groupId}`);
      console.log(`User ${userId} joined group wall ${groupId}`);
    });

    socket.on('group:leave', (groupId: string) => {
      socket.leave(`group:${groupId}`);
    });

    socket.on('group:post', (payload: { groupId: string; postId: string; content: string }) => {
      // Broadcast new wall post to all connected group members instantly
      io.to(`group:${payload.groupId}`).emit('group:new_post', {
        authorId: userId,
        postId: payload.postId,
        content: payload.content,
        timestamp: new Date().toISOString(),
      });
    });

    // --- DISCONNECTION & CLEANUP ---
    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${userId}. Reason: ${reason}`);
      // Broadcast offline status to friends/active rooms if necessary
    });
  });

  // 6. Graceful Shutdown Management
  const gracefulShutdown = () => {
    console.log('Shutting down gracefully...');
    io.close(() => {
      console.log('WebSocket server closed.');
      httpServer.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  // 7. Start the Server
  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server running and attached to HTTP server.`);
  });
}).catch((err) => {
  console.error('Error starting Next.js custom server:', err);
  process.exit(1);
});