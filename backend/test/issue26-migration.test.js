const assert = require("node:assert/strict");
const { test } = require("node:test");
const { Sequelize, DataTypes } = require("sequelize");
const migrateIssue26 = require("../src/migrations/issue26");
const Registration = require("../src/models/Registration");

test("Issue 26 migration preserves registrations and idempotently backfills FIFO position", async () => {
  const sequelize = new Sequelize({ dialect: "sqlite", storage: ":memory:", logging: false });
  try {
    const queryInterface = sequelize.getQueryInterface();
    await queryInterface.createTable("registrations", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      eventId: { type: DataTypes.INTEGER, allowNull: false },
      attendeeId: { type: DataTypes.INTEGER, allowNull: false },
      status: { type: DataTypes.TEXT, allowNull: false },
      ticketTokenHash: { type: DataTypes.STRING(64), allowNull: true },
      checkedInAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await sequelize.query(
      'INSERT INTO "registrations" ("eventId","attendeeId","status","createdAt","updatedAt") VALUES (1,1,?, ?, ?), (1,2,?, ?, ?)',
      { replacements: ["WAITLISTED", "2026-10-01 10:00:00.000 +00:00", "2026-10-01 10:00:00.000 +00:00", "CONFIRMED", "2026-10-01 10:01:00.000 +00:00", "2026-10-01 10:01:00.000 +00:00"] }
    );

    await migrateIssue26(sequelize);
    const rows = await sequelize.query('SELECT "id","status","createdAt","waitlistPositionAt" FROM "registrations" ORDER BY "id"', { type: Sequelize.QueryTypes.SELECT });
    assert.equal(rows.length, 2);
    assert.equal(rows[0].status, "WAITLISTED");
    assert.equal(rows[0].waitlistPositionAt, rows[0].createdAt);
    assert.equal(rows[1].status, "CONFIRMED");
    assert.equal(rows[1].waitlistPositionAt, null);

    await sequelize.query('UPDATE "registrations" SET "waitlistPositionAt" = ? WHERE "id" = 1', { replacements: ["2026-10-03 10:00:00.000 +00:00"] });
    await migrateIssue26(sequelize);
    const [row] = await sequelize.query('SELECT "waitlistPositionAt" FROM "registrations" WHERE "id" = 1', { type: Sequelize.QueryTypes.SELECT });
    assert.equal(row.waitlistPositionAt, "2026-10-03 10:00:00.000 +00:00");
    assert.equal((await queryInterface.showIndex("registrations")).some((item) => item.name === "registrations_waitlist_fifo_idx"), true);
  } finally {
    await sequelize.close();
  }
});
