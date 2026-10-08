const rateLimit = require('express-rate-limit');

// Slows down password guessing: 10 attempts per IP every 15 minutes on login/register.
// Skipped during tests unless TEST_RATE_LIMIT=1 (used by the rate limit test).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Try again later.' },
  skip: () => process.env.NODE_ENV === 'test' && process.env.TEST_RATE_LIMIT !== '1',
});

module.exports = { authLimiter };
