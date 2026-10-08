const Task = require('../models/Task');
const { validateCreateTask } = require('../utils/taskValidators');

// POST /api/tasks
exports.createTask = async (req, res) => {
  const { errors, value } = validateCreateTask(req.body);
  if (errors.length) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  try {
    // The owner always comes from the verified token, never from the request body.
    const task = await Task.create({ ...value, userId: req.user.id });
    return res.status(201).json({ message: 'Task created', data: task });
  } catch (err) {
    console.error('createTask failed:', err.message);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};
