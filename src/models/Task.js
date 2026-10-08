const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Task = sequelize.define('Task', {
  title: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { notEmpty: true },
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    allowNull: false,
    defaultValue: 'medium',
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed'),
    allowNull: false,
    defaultValue: 'pending',
  },
  // The owner of the task. The controller always sets it from the logged-in user.
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

module.exports = Task;
