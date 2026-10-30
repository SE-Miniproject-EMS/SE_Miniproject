const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Feedback = sequelize.define("Feedback", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  eventId: { type: DataTypes.INTEGER, allowNull: false },
  attendeeId: { type: DataTypes.INTEGER, allowNull: false },
  rating: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
  comment: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: "feedback", timestamps: true, indexes: [{ unique: true, fields: ["eventId", "attendeeId"] }] });
module.exports = Feedback;
