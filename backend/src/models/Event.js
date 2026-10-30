const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./User");

const Event = sequelize.define(
  "Event",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    category: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },

    startDateTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    endDateTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    venue: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    seatsTaken: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    ticketPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },

    refundWindowHours: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM("DRAFT", "PUBLISHED", "CANCELLED"),
      allowNull: false,
      defaultValue: "DRAFT",
    },

    organizerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
  },
  {
    tableName: "events",
    timestamps: true,
  }
);

User.hasMany(Event, {
  foreignKey: "organizerId",
  as: "events",
});

Event.belongsTo(User, {
  foreignKey: "organizerId",
  as: "organizer",
});

module.exports = Event;
