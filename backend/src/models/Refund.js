const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Refund = sequelize.define("Refund", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  paymentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: { model: "payments", key: "id" },
  },
  amountPaise: { type: DataTypes.BIGINT, allowNull: false, validate: { min: 1 } },
  status: {
    type: DataTypes.ENUM("PENDING", "FAILED", "COMPLETED", "SIMULATED"),
    allowNull: false,
    defaultValue: "PENDING",
  },
  idempotencyKey: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  adapterReference: { type: DataTypes.STRING(120), allowNull: true },
}, { tableName: "refunds", timestamps: true });

module.exports = Refund;
