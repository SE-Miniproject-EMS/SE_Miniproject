const { Op } = require("sequelize");
const Event = require("../models/Event");
const User = require("../models/User");
const { ApiError } = require("../middleware/errorHandler");

function validateEventData(data, { publishing = false } = {}) {
  const {
    title,
    description,
    category,
    startDateTime,
    endDateTime,
    venue,
    capacity,
    ticketPrice,
    refundWindowHours,
  } = data;

  if (title !== undefined && (typeof title !== "string" || !title.trim())) {
    throw new ApiError(400, "INVALID_TITLE", "Event title is required");
  }
  if (title !== undefined && title.length > 100) {
    throw new ApiError(400, "INVALID_TITLE", "Event title must be 100 characters or fewer");
  }

  if (category !== undefined && (typeof category !== "string" || !category.trim())) {
    throw new ApiError(400, "INVALID_CATEGORY", "Event category is required");
  }
  if (category !== undefined && category.length > 30) {
    throw new ApiError(400, "INVALID_CATEGORY", "Event category must be 30 characters or fewer");
  }

  if (description !== undefined && description !== null && typeof description !== "string") {
    throw new ApiError(400, "INVALID_DESCRIPTION", "Event description must be a string");
  }

  if (venue !== undefined && (typeof venue !== "string" || !venue.trim())) {
    throw new ApiError(400, "INVALID_VENUE", "Event venue is required");
  }
  if (venue !== undefined && venue.length > 150) {
    throw new ApiError(400, "INVALID_VENUE", "Event venue must be 150 characters or fewer");
  }

  if (
    capacity !== undefined &&
    (!["number", "string"].includes(typeof capacity) ||
      (typeof capacity === "string" && !capacity.trim()) ||
      !Number.isInteger(Number(capacity)) ||
      Number(capacity) <= 0)
  ) {
    throw new ApiError(
      400,
      "INVALID_CAPACITY",
      "Capacity must be a positive whole number"
    );
  }

  if (
    ticketPrice !== undefined &&
    (!["number", "string"].includes(typeof ticketPrice) ||
      (typeof ticketPrice === "string" && !ticketPrice.trim()) ||
      !Number.isFinite(Number(ticketPrice)) ||
      Number(ticketPrice) < 0)
  ) {
    throw new ApiError(
      400,
      "INVALID_TICKET_PRICE",
      "Ticket price cannot be negative"
    );
  }

  if (
    refundWindowHours !== undefined &&
    refundWindowHours !== null &&
    (!["number", "string"].includes(typeof refundWindowHours) ||
      (typeof refundWindowHours === "string" && !refundWindowHours.trim()) ||
      !Number.isInteger(Number(refundWindowHours)) ||
      Number(refundWindowHours) < 0)
  ) {
    throw new ApiError(
      400,
      "INVALID_REFUND_WINDOW",
      "Refund window must be zero or a positive whole number of hours"
    );
  }

  if (
    startDateTime !== undefined &&
    (!(typeof startDateTime === "string" || startDateTime instanceof Date) ||
      !String(startDateTime).trim() ||
      Number.isNaN(Date.parse(startDateTime)))
  ) {
    throw new ApiError(
      400,
      "INVALID_START_DATE",
      "A valid start date-time is required"
    );
  }

  if (
    endDateTime !== undefined &&
    (!(typeof endDateTime === "string" || endDateTime instanceof Date) ||
      !String(endDateTime).trim() ||
      Number.isNaN(Date.parse(endDateTime)))
  ) {
    throw new ApiError(
      400,
      "INVALID_END_DATE",
      "A valid end date-time is required"
    );
  }

  if (startDateTime !== undefined && endDateTime !== undefined) {
    if (new Date(endDateTime) <= new Date(startDateTime)) {
      throw new ApiError(
        400,
        "INVALID_DATE_RANGE",
        "End date-time must be later than start date-time"
      );
    }
  }

  if (publishing) {
    if (!title || !String(title).trim()) {
      throw new ApiError(
        400,
        "MISSING_TITLE",
        "Title is required before publishing"
      );
    }

    if (!startDateTime) {
      throw new ApiError(
        400,
        "MISSING_START_DATE",
        "Start date-time is required before publishing"
      );
    }

    if (!endDateTime) {
      throw new ApiError(
        400,
        "MISSING_END_DATE",
        "End date-time is required before publishing"
      );
    }

    if (!venue || !String(venue).trim()) {
      throw new ApiError(
        400,
        "MISSING_VENUE",
        "Venue or virtual link is required before publishing"
      );
    }

    if (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0) {
      throw new ApiError(
        400,
        "MISSING_CAPACITY",
        "A positive capacity is required before publishing"
      );
    }
  }
}

function ensureCanModify(event, user) {
  const userId = Number(user.id);

  if (user.role === "ADMIN") return;

  if (user.role !== "ORGANIZER" || Number(event.organizerId) !== userId) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "You may only modify events that you own"
    );
  }
}

async function createEvent(req, res, next) {
  try {
    const {
      title,
      description,
      category,
      startDateTime,
      endDateTime,
      venue,
      capacity,
      ticketPrice = 0,
      refundWindowHours = null,
      status = "DRAFT",
    } = req.body;

    const normalizedStatus = String(status).toUpperCase();

    if (!["DRAFT", "PUBLISHED"].includes(normalizedStatus)) {
      throw new ApiError(
        400,
        "INVALID_STATUS",
        "New events must be DRAFT or PUBLISHED"
      );
    }

    const eventData = {
      title,
      description,
      category,
      startDateTime,
      endDateTime,
      venue,
      capacity,
      ticketPrice,
      refundWindowHours,
    };

    validateEventData(eventData, {
      publishing: normalizedStatus === "PUBLISHED",
    });

    for (const field of [
      "title",
      "category",
      "startDateTime",
      "endDateTime",
      "venue",
      "capacity",
    ]) {
      if (
        eventData[field] === undefined ||
        eventData[field] === null ||
        !String(eventData[field]).trim()
      ) {
        throw new ApiError(
          400,
          "MISSING_REQUIRED_FIELD",
          `${field} is required when creating an event`
        );
      }
    }

    const event = await Event.create({
      ...eventData,
      title: String(title).trim(),
      category: String(category).trim(),
      venue: String(venue).trim(),
      capacity: Number(capacity),
      ticketPrice: Number(ticketPrice),
      refundWindowHours:
        refundWindowHours === null || refundWindowHours === undefined
          ? null
          : Number(refundWindowHours),
      status: normalizedStatus,
      organizerId: req.user.id,
    });

    res.status(201).json({ event });
  } catch (err) {
    next(err);
  }
}

async function listPublicEvents(req, res, next) {
  try {
    const { search, category, location, startDate, endDate } = req.query;
    const pageValue = req.query.page === undefined ? 1 : Number(req.query.page);
    const limitValue = req.query.limit === undefined ? 9 : Number(req.query.limit);

    if (!Number.isSafeInteger(pageValue) || pageValue < 1) {
      throw new ApiError(400, "INVALID_PAGE", "Page must be a positive whole number");
    }
    if (!Number.isSafeInteger(limitValue) || limitValue < 1 || limitValue > 50) {
      throw new ApiError(400, "INVALID_LIMIT", "Limit must be a whole number from 1 to 50");
    }
    if (!Number.isSafeInteger((pageValue - 1) * limitValue)) {
      throw new ApiError(400, "INVALID_PAGE", "Page is too large");
    }

    const where = {
      status: "PUBLISHED",
      startDateTime: { [Op.gte]: new Date() },
    };

    if (category) where.category = category;
    if (location) where.venue = { [Op.like]: `%${location}%` };

    if (startDate || endDate) {
      const dateRange = {};
      if (startDate) {
        const parsedStart = new Date(startDate);
        if (Number.isNaN(parsedStart.getTime())) {
          throw new ApiError(400, "INVALID_START_DATE", "Invalid start-date filter");
        }
        dateRange[Op.gte] = new Date(Math.max(parsedStart.getTime(), Date.now()));
      } else {
        dateRange[Op.gte] = new Date();
      }

      if (endDate) {
        const parsedEnd = new Date(endDate);
        if (Number.isNaN(parsedEnd.getTime())) {
          throw new ApiError(400, "INVALID_END_DATE", "Invalid end-date filter");
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
          parsedEnd.setUTCHours(23, 59, 59, 999);
        }
        if (dateRange[Op.gte] && parsedEnd < dateRange[Op.gte]) {
          throw new ApiError(400, "INVALID_DATE_RANGE", "End date must be on or after start date");
        }
        dateRange[Op.lte] = parsedEnd;
      }
      where.startDateTime = dateRange;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows: events } = await Event.findAndCountAll({
      where,
      order: [["startDateTime", "ASC"], ["id", "ASC"]],
      limit: limitValue,
      offset: (pageValue - 1) * limitValue,
      include: [{
        model: User,
        as: "organizer",
        attributes: ["id", "name"],
      }],
    });

    res.json({
      events,
      pagination: {
        page: pageValue,
        limit: limitValue,
        total: count,
        pages: Math.ceil(count / limitValue),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getPublicEvent(req, res, next) {
  try {
    const event = await Event.findOne({
      where: {
        id: req.params.id,
        status: "PUBLISHED",
      },
      include: [
        {
          model: User,
          as: "organizer",
          attributes: ["id", "name"],
        },
      ],
    });

    if (!event) {
      throw new ApiError(404, "NOT_FOUND", "Published event not found");
    }

    res.json({ event });
  } catch (err) {
    next(err);
  }
}

async function listMyEvents(req, res, next) {
  try {
    const where =
      req.user.role === "ADMIN"
        ? {}
        : { organizerId: req.user.id };

    const events = await Event.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    res.json({ events });
  } catch (err) {
    next(err);
  }
}

async function updateEvent(req, res, next) {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      throw new ApiError(404, "NOT_FOUND", "Event not found");
    }

    ensureCanModify(event, req.user);

    if (event.status === "CANCELLED") {
      throw new ApiError(
        409,
        "EVENT_CANCELLED",
        "A cancelled event cannot be edited"
      );
    }

    const allowedFields = [
      "title",
      "description",
      "category",
      "startDateTime",
      "endDateTime",
      "venue",
      "capacity",
      "ticketPrice",
      "refundWindowHours",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    const merged = {
      title:
        updates.title !== undefined ? updates.title : event.title,
      description:
        updates.description !== undefined
          ? updates.description
          : event.description,
      category:
        updates.category !== undefined
          ? updates.category
          : event.category,
      startDateTime:
        updates.startDateTime !== undefined
          ? updates.startDateTime
          : event.startDateTime,
      endDateTime:
        updates.endDateTime !== undefined
          ? updates.endDateTime
          : event.endDateTime,
      venue:
        updates.venue !== undefined ? updates.venue : event.venue,
      capacity:
        updates.capacity !== undefined
          ? updates.capacity
          : event.capacity,
      ticketPrice:
        updates.ticketPrice !== undefined
          ? updates.ticketPrice
          : event.ticketPrice,
      refundWindowHours:
        updates.refundWindowHours !== undefined
          ? updates.refundWindowHours
          : event.refundWindowHours,
    };

    validateEventData(merged, {
      publishing: event.status === "PUBLISHED",
    });

    if (updates.title !== undefined) {
      updates.title = String(updates.title).trim();
    }

    if (updates.category !== undefined) {
      updates.category = String(updates.category).trim();
    }

    if (updates.venue !== undefined) {
      updates.venue = String(updates.venue).trim();
    }

    if (updates.capacity !== undefined) {
      updates.capacity = Number(updates.capacity);
    }

    if (updates.ticketPrice !== undefined) {
      updates.ticketPrice = Number(updates.ticketPrice);
    }

    if (
      updates.refundWindowHours !== undefined &&
      updates.refundWindowHours !== null
    ) {
      updates.refundWindowHours = Number(updates.refundWindowHours);
    }

    await event.update(updates);

    res.json({ event });
  } catch (err) {
    next(err);
  }
}

async function publishEvent(req, res, next) {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      throw new ApiError(404, "NOT_FOUND", "Event not found");
    }

    ensureCanModify(event, req.user);

    if (event.status === "CANCELLED") {
      throw new ApiError(
        409,
        "EVENT_CANCELLED",
        "A cancelled event cannot be published"
      );
    }

    validateEventData(event.toJSON(), { publishing: true });

    event.status = "PUBLISHED";
    await event.save();

    res.json({
      message: "Event published successfully",
      event,
    });
  } catch (err) {
    next(err);
  }
}

async function cancelEvent(req, res, next) {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      throw new ApiError(404, "NOT_FOUND", "Event not found");
    }

    ensureCanModify(event, req.user);

    if (event.status === "CANCELLED") {
      throw new ApiError(
        409,
        "ALREADY_CANCELLED",
        "Event is already cancelled"
      );
    }

    event.status = "CANCELLED";
    await event.save();

    res.json({
      message:
        "Event cancelled successfully. Refund and notification processing will be handled by their respective modules.",
      event,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createEvent,
  listPublicEvents,
  getPublicEvent,
  listMyEvents,
  updateEvent,
  publishEvent,
  cancelEvent,
};
