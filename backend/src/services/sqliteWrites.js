const { Transaction } = require("sequelize");
const sequelize = require("../config/db");

// Queue local SQLite writes before taking a connection. Transactions still
// provide cross-process integrity through the database's write lock.
let previous = Promise.resolve();

function sqliteWrite(work) {
  const current = previous.then(work);
  previous = current.catch(() => {});
  return current;
}

function sqliteTransaction(work) {
  return sqliteWrite(() =>
    sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, work)
  );
}

module.exports = { sqliteTransaction, sqliteWrite };
