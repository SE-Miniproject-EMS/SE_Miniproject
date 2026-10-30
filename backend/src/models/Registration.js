const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Registration = sequelize.define("Registration", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  eventId: { type: DataTypes.INTEGER, allowNull: false },
  attendeeId: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM("CONFIRMED", "WAITLISTED", "CANCELLED"), allowNull: false },
  ticketTokenHash: { type: DataTypes.STRING(64), allowNull: true, unique: true },
  checkedInAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: "registrations", timestamps: true,
  indexes: [{ unique: true, fields: ["eventId", "attendeeId"] }],
});
module.exports = Registration;
