const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtConfig } = require('../config/jwt');

// Protects a route. Expects the header:  Authorization: Bearer <token>
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    // Only accept HS256, so a token with "alg: none" or another algorithm is rejected.
    const payload = jwt.verify(token, getJwtConfig().secret, { algorithms: ['HS256'] });

    // Make sure the user still exists (the token may outlive a deleted account).
    const user = await User.findByPk(Number(payload.sub));
    if (!user) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    req.user = { id: user.id };
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth };
