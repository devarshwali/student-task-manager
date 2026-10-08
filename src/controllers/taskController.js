const Task = require('../models/Task');
const { validateCreateTask, validateUpdateTask } = require('../utils/taskValidators');

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

// Task ids must be whole numbers. Returns null for anything else.
function parseId(raw) {
  return /^\d+$/.test(raw) ? Number(raw) : null;
}

// Finds a task only if it belongs to the logged-in student.
function findOwnTask(id, userId) {
  return Task.findOne({ where: { id, userId } });
}

// PATCH /api/tasks/:id
exports.updateTask = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Task id must be a whole number' });

  const { errors, value } = validateUpdateTask(req.body);
  if (errors.length) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  try {
    const task = await findOwnTask(id, req.user.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    await task.update(value);
    return res.status(200).json({ message: 'Task updated', data: task });
  } catch (err) {
    console.error('updateTask failed:', err.message);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

// PATCH /api/tasks/:id/complete
exports.completeTask = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Task id must be a whole number' });

  try {
    const task = await findOwnTask(id, req.user.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    await task.update({ status: 'completed' });
    return res.status(200).json({ message: 'Task completed', data: task });
  } catch (err) {
    console.error('completeTask failed:', err.message);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

// DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Task id must be a whole number' });

  try {
    const task = await findOwnTask(id, req.user.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    await task.destroy();
    return res.status(200).json({ message: 'Task deleted' });
  } catch (err) {
    console.error('deleteTask failed:', err.message);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};
