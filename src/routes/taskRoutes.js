const express = require('express');
const { createTask } = require('../controllers/taskController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Every task route needs a logged-in student.
router.use(requireAuth);

router.post('/', createTask);

module.exports = router;
