const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

const storage = process.env.DB_STORAGE || './data/tasks.sqlite';

// Create the folder for a file-based database (skip for in-memory).
if (storage !== ':memory:') {
  fs.mkdirSync(path.dirname(path.resolve(storage)), { recursive: true });
}

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage,
  logging: false,
});

module.exports = sequelize;
