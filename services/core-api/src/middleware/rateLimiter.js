const rateLimit = require('express-rate-limit');

const skip = () => process.env.NODE_ENV === 'test';

exports.generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
});
