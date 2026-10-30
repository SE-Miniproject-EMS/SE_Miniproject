require("dotenv").config();
const express = require("express");
const cors = require("cors");

const sequelize = require("./config/db");
require("./models/User"); // ensures the model is registered before sync()
require("./models/Event"); // Event Management model
const Event = require("./models/Event");
const Registration = require("./models/Registration");
require("./models/Notification");
require("./models/Feedback");
Event.hasMany(Registration, { foreignKey: "eventId", as: "registrations" });
Registration.belongsTo(Event, { foreignKey: "eventId", as: "event" });
const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const exampleProtectedRoutes = require("./routes/exampleProtectedRoutes");
const registrationRoutes = require("./routes/registrationRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/example", exampleProtectedRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// `sync()` auto-creates tables from the models above. This is fine for local
// dev; once you add more models, consider Sequelize migrations instead of sync().
sequelize
  .sync()
  .then(async () => {
    // Backwards-compatible additive migration for databases created before seatsTaken.
    const columns = await sequelize.getQueryInterface().describeTable("events");
    if (!columns.seatsTaken) {
      await sequelize.getQueryInterface().addColumn("events", "seatsTaken", {
        type: require("sequelize").DataTypes.INTEGER, allowNull: false, defaultValue: 0,
      });
    }
    app.listen(PORT, () => {
      console.log(`EMS backend listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to the database:", err);
    process.exit(1);
  });
