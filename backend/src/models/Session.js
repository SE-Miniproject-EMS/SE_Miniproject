const { DataTypes, Op, literal } = require("sequelize");
const sequelize = require("../config/db");
const { databaseWrite } = require("../services/databaseWrites");

// SQLite evaluates this clock when the statement runs, including after lock waits.
const postgres = sequelize.getDialect() === "postgres";
const now = postgres
  ? "CAST(EXTRACT(EPOCH FROM clock_timestamp()) * 1000 AS BIGINT)"
  : "CAST(unixepoch('subsec') * 1000 AS INTEGER)";
const minimum = postgres ? "LEAST" : "MIN";
const maximum = postgres ? "GREATEST" : "MAX";
const idleSeconds = Number(process.env.SESSION_IDLE_TIMEOUT_SECONDS ?? 1800);
if (!Number.isSafeInteger(idleSeconds) || idleSeconds < 1 || idleSeconds > Math.floor(Number.MAX_SAFE_INTEGER / 1000)) {
  throw new Error("SESSION_IDLE_TIMEOUT_SECONDS must be a positive integer in seconds");
}
const idleMs = idleSeconds * 1000;

const Session = sequelize.define("Session", {
  id: { type: DataTypes.UUID, primaryKey: true },
  idleExpiresAt: { type: DataTypes.BIGINT, allowNull: false },
}, {
  tableName: "sessions",
  timestamps: false,
  indexes: [{ fields: ["idleExpiresAt"] }],
});

async function startSession({ jti, exp }) {
  await Session.destroy({ where: { idleExpiresAt: { [Op.lte]: literal(now) } } });
  await Session.create({
    id: jti,
    idleExpiresAt: literal(`${minimum}(${exp * 1000}, ${now} + ${idleMs})`),
  });
}

async function touchSession({ jti, exp }) {
  if (typeof jti !== "string" || !Number.isSafeInteger(exp)) return false;
  const absoluteDeadline = exp * 1000;
  const [updated] = await databaseWrite(() => Session.update({
    idleExpiresAt: literal(`${minimum}(${absoluteDeadline}, ${maximum}("idleExpiresAt", ${now} + ${idleMs}))`),
  }, {
    where: {
      id: jti,
      idleExpiresAt: { [Op.gt]: literal(now) },
      [Op.and]: sequelize.where(literal(now), Op.lt, absoluteDeadline),
    },
  }));
  return updated === 1;
}

module.exports = { startSession, touchSession };
