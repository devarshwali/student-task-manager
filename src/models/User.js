const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Note: there is no "role" column and no plain "password" column.
// Only a bcrypt hash is stored.
const User = sequelize.define('User', {
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(254),
    allowNull: false,
    unique: true,
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

// Safe version of a user to send in API responses.
User.prototype.toPublic = function toPublic() {
  return { id: this.id, name: this.name, email: this.email };
};

module.exports = User;
