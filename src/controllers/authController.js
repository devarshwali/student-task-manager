const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.register = async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(200).json({ message: 'Registered', user });
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.password !== password) return res.status(401).json({ message: 'Wrong password' });
    const token = jwt.sign({ id: user.id, role: user.role }, 'secret123');
    res.status(200).json({ token, user });
  } catch (err) {
    res.status(500).json(err);
  }
};
