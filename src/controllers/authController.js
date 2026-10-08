const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtConfig } = require('../config/jwt');
const { validateRegister, validateLogin } = require('../utils/validators');

// Cost factor 12 is slow enough to resist guessing. Tests use a low value to stay fast.
const BCRYPT_ROUNDS = process.env.NODE_ENV === 'test' ? 4 : 12;

// A real bcrypt hash of a throwaway string. When the email does not exist we still run
// bcrypt.compare against it, so response time does not reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-1', BCRYPT_ROUNDS);

exports.register = async (req, res) => {
  const { errors, value } = validateRegister(req.body);
  if (errors.length) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  try {
    const existing = await User.findOne({ where: { email: value.email } });
    if (existing) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(value.password, BCRYPT_ROUNDS);
    const user = await User.create({
      name: value.name,
      email: value.email,
      passwordHash,
    });

    return res.status(201).json({ message: 'Registered', user: user.toPublic() });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Email is already registered' });
    }
    console.error('register failed:', err.message);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

exports.login = async (req, res) => {
  const { errors, value } = validateLogin(req.body);
  if (errors.length) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  try {
    const user = await User.findOne({ where: { email: value.email } });
    const hashToCheck = user ? user.passwordHash : DUMMY_HASH;
    const passwordOk = await bcrypt.compare(value.password, hashToCheck);

    // Same message and status for "no such user" and "wrong password".
    if (!user || !passwordOk) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const { secret, expiresIn } = getJwtConfig();
    const token = jwt.sign({ sub: String(user.id) }, secret, {
      algorithm: 'HS256',
      expiresIn,
    });

    return res.status(200).json({ token, user: user.toPublic() });
  } catch (err) {
    console.error('login failed:', err.message);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

exports.me = async (req, res) => {
  const user = await User.findByPk(req.user.id);
  return res.status(200).json({ user: user.toPublic() });
};
