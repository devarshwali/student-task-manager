const express = require('express');
const {
  createTask,
  listTasks,
  updateTask,
  completeTask,
  deleteTask,
} = require('../controllers/taskController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Every task route needs a logged-in student.
router.use(requireAuth);

router.post('/', createTask);
router.get('/', listTasks);
router.patch('/:id/complete', completeTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
