const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Payment = sequelize.define("Payment", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  registrationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "registrations", key: "id" },
  },
  paymentPurpose: {
    type: DataTypes.ENUM("INITIAL_CHECKOUT", "WAITLIST_OFFER"),
    allowNull: false,
  },
  amountPaise: { type: DataTypes.BIGINT, allowNull: false, validate: { min: 1 } },
  status: {
    type: DataTypes.ENUM("PENDING", "SUCCEEDED", "FAILED", "EXPIRED", "LATE_SUCCEEDED"),
    allowNull: false,
    defaultValue: "PENDING",
  },
  idempotencyKey: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  adapter: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "MOCK" },
  adapterReference: { type: DataTypes.STRING(120), allowNull: true },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  capturedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: "payments",
  timestamps: true,
  indexes: [{ fields: ["registrationId", "createdAt"] }, { fields: ["status", "expiresAt"] }],
});

module.exports = Payment;
