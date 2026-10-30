const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Notification = sequelize.define("Notification", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  recipientId: { type: DataTypes.INTEGER, allowNull: false },
  eventId: { type: DataTypes.INTEGER, allowNull: false },
  registrationId: { type: DataTypes.INTEGER, allowNull: true },
  type: { type: DataTypes.ENUM("REGISTRATION_CONFIRMED", "EVENT_REMINDER", "EVENT_RESCHEDULED", "EVENT_CANCELLED", "WAITLIST_PROMOTED"), allowNull: false },
  dedupeKey: { type: DataTypes.STRING(190), allowNull: false, unique: true },
  payload: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM("PENDING", "SENT", "FAILED"), allowNull: false, defaultValue: "PENDING" },
  attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  lastError: { type: DataTypes.STRING(500), allowNull: true },
  sentAt: { type: DataTypes.DATE, allowNull: true },
}, { tableName: "notifications", timestamps: true });
module.exports = Notification;
