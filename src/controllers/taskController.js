const { Op, Sequelize } = require('sequelize');
const Task = require('../models/Task');
const { validateCreateTask, validateUpdateTask } = require('../utils/taskValidators');
const { parseTaskQuery } = require('../utils/taskFilters');

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

// GET /api/tasks?q=&status=&priority=&dueAfter=&dueBefore=&sort=&order=&page=&limit=
// Returns only the logged-in student's tasks.
exports.listTasks = async (req, res) => {
  const { errors, value } = parseTaskQuery(req.query);
  if (errors.length) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  try {
    // Always scoped to the owner, so one student can never see another student's tasks.
    const conditions = [{ userId: req.user.id }];
    if (value.status) conditions.push({ status: value.status });
    if (value.priority) conditions.push({ priority: value.priority });
    if (value.dueAfter) conditions.push({ dueDate: { [Op.gte]: value.dueAfter } });
    if (value.dueBefore) conditions.push({ dueDate: { [Op.lte]: value.dueBefore } });

    if (value.search) {
      // instr() does a plain, case-insensitive "contains" check. Unlike LIKE, characters
      // such as % and _ have no special meaning, and the text is passed as a parameter.
      const needle = value.search.toLowerCase();
      conditions.push({
        [Op.or]: [
          Sequelize.where(Sequelize.fn('instr', Sequelize.fn('lower', Sequelize.col('title')), needle), { [Op.gt]: 0 }),
          Sequelize.where(Sequelize.fn('instr', Sequelize.fn('lower', Sequelize.col('description')), needle), { [Op.gt]: 0 }),
        ],
      });
    }

    const direction = value.order.toUpperCase();
    // Priority is text, so sort by its meaning (high > medium > low), not alphabetically.
    const primarySort =
      value.sort === 'priority'
        ? [Sequelize.literal("CASE priority WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END"), direction]
        : [value.sort, direction];

    const { rows, count } = await Task.findAndCountAll({
      where: { [Op.and]: conditions },
      order: [primarySort, ['id', 'ASC']],
      limit: value.limit,
      offset: (value.page - 1) * value.limit,
    });

    return res.status(200).json({
      data: rows,
      pagination: {
        page: value.page,
        limit: value.limit,
        total: count,
        totalPages: Math.ceil(count / value.limit),
      },
    });
  } catch (err) {
    console.error('listTasks failed:', err.message);
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
