const rateLimit = require("express-rate-limit");

const strictWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 30,                  // 30 requests / 10 min por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit exceeded" }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts" }
});

const federationLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1 min
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many federation requests" }
});

module.exports = {
  strictWriteLimiter,
  authLimiter,
  federationLimiter
};
