const { Sequelize } = require("sequelize");

const options = { logging: false };
if (process.env.DATABASE_SSL === "true") {
  options.dialectOptions = { ssl: { require: true, rejectUnauthorized: true } };
}

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, { ...options, dialect: "postgres" })
  : new Sequelize({ ...options, dialect: "sqlite", storage: process.env.DATABASE_FILE || "./dev.db" });

module.exports = sequelize;
