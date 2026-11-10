module.exports = async function migrateIssue26(sequelize) {
  const queryInterface = sequelize.getQueryInterface();
  const registrationColumns = await queryInterface.describeTable("registrations");
  if (!registrationColumns.waitlistPositionAt) {
    await queryInterface.addColumn("registrations", "waitlistPositionAt", {
      type: require("sequelize").DataTypes.DATE,
      allowNull: true,
    });
  }

  await sequelize.query(
    "UPDATE registrations SET waitlistPositionAt = createdAt WHERE status = ? AND waitlistPositionAt IS NULL",
    { replacements: ["WAITLISTED"] }
  );

  const indexes = await queryInterface.showIndex("registrations");
  if (!indexes.some((index) => index.name === "registrations_waitlist_fifo_idx")) {
    await queryInterface.addIndex(
      "registrations",
      ["eventId", "status", "waitlistPositionAt", "id"],
      { name: "registrations_waitlist_fifo_idx" }
    );
  }
};
