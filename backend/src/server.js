require("dotenv").config();
const express = require("express");
const cors = require("cors");

const sequelize = require("./config/db");
require("./models/User"); // ensures the model is registered before sync()
require("./models/Session"); // register idle-session table before sync()
require("./models/Event"); // Event Management model
const Event = require("./models/Event");
const Registration = require("./models/Registration");
const Payment = require("./models/Payment");
const Refund = require("./models/Refund");
require("./models/Notification");
require("./models/Feedback");
Event.hasMany(Registration, { foreignKey: "eventId", as: "registrations" });
Registration.belongsTo(Event, { foreignKey: "eventId", as: "event" });
Registration.hasMany(Payment, { foreignKey: "registrationId", as: "payments" });
Payment.belongsTo(Registration, { foreignKey: "registrationId", as: "registration" });
Payment.hasOne(Refund, { foreignKey: "paymentId", as: "refund" });
Refund.belongsTo(Payment, { foreignKey: "paymentId", as: "payment" });
const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const exampleProtectedRoutes = require("./routes/exampleProtectedRoutes");
const registrationRoutes = require("./routes/registrationRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const { processExpiredPayments } = require("./services/registrationPaymentService");
const migrateIssue26 = require("./migrations/issue26");
const paymentRoutes = require("./routes/paymentRoutes");
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
app.use("/api/payments", paymentRoutes);
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
    await migrateIssue26(sequelize);
    const runPaymentExpirySweep = async () => {
      try { await processExpiredPayments(); }
      catch (error) { console.error("Payment expiry scan failed:", error.message); }
    };
    await runPaymentExpirySweep();
    const configuredScanInterval = Number(process.env.PAYMENT_EXPIRY_SCAN_INTERVAL_MS || 30000);
    const scanInterval = Number.isInteger(configuredScanInterval) && configuredScanInterval >= 1000 ? configuredScanInterval : 30000;
    const paymentExpiryTimer = setInterval(runPaymentExpirySweep, scanInterval);
    paymentExpiryTimer.unref();
    app.listen(PORT, () => {
      console.log(`EMS backend listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to the database:", err);
    process.exit(1);
  });
