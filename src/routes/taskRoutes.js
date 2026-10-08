const express = require('express');
const { createTask } = require('../controllers/taskController');

const router = express.Router();

router.post('/', createTask);

module.exports = router;
