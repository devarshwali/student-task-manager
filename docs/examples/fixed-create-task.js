// The corrected version of the teammate's snippet.
// Same route, same wrapper, with the four problems fixed (see the comments).
const { validateCreateTask } = require('../../src/utils/taskValidators');

module.exports = function mountFixed(app, Task) {
  app.post('/tasks', async (req, res) => {
    // Fix 3: validate and whitelist the input instead of passing req.body straight to the model.
    const { errors, value } = validateCreateTask(req.body);
    if (errors.length) {
      // Fix 4a: a client mistake is a 400, not a 500.
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    try {
      const task = await Task.create(value);
      // Fix 1: send the variable that exists (task, not tasks).
      // Fix 2: 201 Created is the correct status for a new resource.
      return res.status(201).json({ message: 'Task created', data: task });
    } catch (error) {
      // Fix 4b: log details on the server, send a safe message to the client.
      console.error('create task failed:', error.message);
      return res.status(500).json({ message: 'Something went wrong' });
    }
  });
};
