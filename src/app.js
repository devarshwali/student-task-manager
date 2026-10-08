const express = require('express');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.use(express.json({ limit: '10kb' }));
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// These two must stay last.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
