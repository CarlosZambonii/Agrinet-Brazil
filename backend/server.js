require('dotenv').config();
const express = require("express");
const http = require('http');
const rateLimit = require("express-rate-limit");
const errorHandler = require("./middleware/errorHandler");
const pool = require("./lib/db");
const { register } = require("./lib/metrics");

let cors;
try {
  cors = require("cors");
} catch {
  cors = () => (_req, _res, next) => next();
}
let dotenv;
try {
  dotenv = require("dotenv");
} catch {
  dotenv = { config: () => {} };
}
const path = require("path");
const authMiddleware = require("./middleware/authMiddleware");

// Load environment variables
dotenv.config();

const minimal = process.env.MINIMAL_SERVER === 'true';

const app = express();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});

// --- PRODUCTION-READY CORS RESTRICTION ---
const allowedOrigins = ['https://www.ntari.org'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed for this origin'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// -----------------------------------------

app.use(limiter);
app.use(express.json());

const tryMount = (route, modPath) => {
  try {
    const mod = require(modPath);
    app.use(route, mod);
  } catch (err) {
    console.warn(`Skipping ${modPath}: ${err.message}`);
  }
};

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get("/healthz", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ ok: true });
  } catch (_error) {
    res.status(500).json({ ok: false });
  }
});

// Server & SSE event stream
const server = http.createServer(app);

// Simple Server-Sent Events implementation
const sseClients = new Set();
// Map of conversationId -> Set of response objects
const conversationStreams = new Map();

app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

// Unified conversation-scoped Server-Sent Events endpoint
app.get('/stream/:conversationId', (req, res) => {
  const { conversationId } = req.params;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });

  if (!conversationStreams.has(conversationId)) {
    conversationStreams.set(conversationId, new Set());
  }

  const clients = conversationStreams.get(conversationId);
  clients.add(res);

  req.on('close', () => {
    clients.delete(res);
    if (clients.size === 0) {
      conversationStreams.delete(conversationId);
    }
  });
});

function sendConversationEvent(conversationId, event, data) {
  const clients = conversationStreams.get(conversationId);
  if (!clients) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => res.write(payload));
}

function broadcast(event, data, conversationId) {
  if (conversationId) {
    sendConversationEvent(conversationId, event, data);
    return;
  }
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(res => res.write(payload));
}
global.broadcast = broadcast;

// Helpers to emit token and message events
function emitToken(conversationId, id, token) {
  sendConversationEvent(conversationId, 'token', { id, token });
}

function emitMessage(conversationId, message) {
  sendConversationEvent(conversationId, 'message', { message });
}

global.emitToken = emitToken;
global.emitMessage = emitMessage;

// metrics FIRST
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.use("/auth", require("./routes/authRoutes"));

// Middleware
app.use(authMiddleware);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
if (!minimal) {
  [
    ['/users', './routes/userRoutes'],
    ['/api/marketplace', './marketplace/marketplace_routes'],
    ['/federation', './federation/federationRoutes'],
  ].forEach(([route, mod]) => tryMount(route, mod));

}

app.use((req, res, next) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler (MUST be last middleware)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = { app, server };
