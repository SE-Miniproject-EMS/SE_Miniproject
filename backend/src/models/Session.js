const { DataTypes, Op, literal } = require("sequelize");
const sequelize = require("../config/db");

// SQLite evaluates this clock when the statement runs, including after lock waits.
const now = "CAST(unixepoch('subsec') * 1000 AS INTEGER)";
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
    idleExpiresAt: literal(`MIN(${exp * 1000}, ${now} + ${idleMs})`),
  });
}

async function touchSession({ jti, exp }) {
  if (typeof jti !== "string" || !Number.isSafeInteger(exp)) return false;
  const absoluteDeadline = exp * 1000;
  const [updated] = await Session.update({
    idleExpiresAt: literal(`MIN(${absoluteDeadline}, MAX("idleExpiresAt", ${now} + ${idleMs}))`),
  }, {
    where: {
      id: jti,
      idleExpiresAt: { [Op.gt]: literal(now) },
      [Op.and]: sequelize.where(literal(now), Op.lt, absoluteDeadline),
    },
  });
  return updated === 1;
}

module.exports = { startSession, touchSession };
