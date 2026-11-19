const { Transaction } = require("sequelize");
const sequelize = require("../config/db");

// SQLite has a single writer. PostgreSQL uses a database transaction lock so
// concurrent API processes share the same serialization of capacity/refund work.
let previous = Promise.resolve();

function databaseWrite(work) {
  if (sequelize.getDialect() !== "sqlite") return work();
  const current = previous.then(work);
  previous = current.catch(() => {});
  return current;
}

function writeTransaction(work) {
  const sqlite = sequelize.getDialect() === "sqlite";
  return databaseWrite(() => sequelize.transaction(
    sqlite ? { type: Transaction.TYPES.IMMEDIATE } : {},
    async (transaction) => {
      if (!sqlite) {
        await sequelize.query("SELECT pg_advisory_xact_lock(170034)", { transaction });
      }
      return work(transaction);
    }
  ));
}

module.exports = { writeTransaction, databaseWrite };
