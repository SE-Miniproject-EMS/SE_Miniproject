import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createEvent } from "../api/event";

function validateEventForm(form) {
  if (!form.title.trim() || !form.category.trim() || !form.venue.trim()) {
    return "Title, category, and venue are required.";
  }

  const start = new Date(form.startDateTime);
  const end = new Date(form.endDateTime);
  if (!form.startDateTime || !form.endDateTime || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Please enter valid event dates and times.";
  }
  if (end <= start) {
    return "End date and time must be later than start date and time.";
  }

  const capacity = Number(form.capacity);
  if (!Number.isInteger(capacity) || capacity < 1) {
    return "Capacity must be a whole number greater than zero.";
  }

  const ticketPrice = Number(form.ticketPrice);
  if (!Number.isFinite(ticketPrice) || ticketPrice < 0) {
    return "Ticket price must be zero or greater.";
  }

  if (form.refundWindowHours !== "") {
    const refundWindowHours = Number(form.refundWindowHours);
    if (!Number.isInteger(refundWindowHours) || refundWindowHours < 0) {
      return "Refund window must be a whole number of zero or more hours.";
    }
  }

  return "";
}

export default function CreateEvent() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    startDateTime: "",
    endDateTime: "",
    venue: "",
    capacity: "",
    ticketPrice: "0",
    refundWindowHours: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const validationError = validateEventForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const eventData = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        startDateTime: form.startDateTime,
        endDateTime: form.endDateTime,
        venue: form.venue.trim(),
        capacity: Number(form.capacity),
        ticketPrice: Number(form.ticketPrice || 0),
        refundWindowHours:
          form.refundWindowHours === ""
            ? null
            : Number(form.refundWindowHours),
        status: "DRAFT",
      };

      await createEvent(eventData);

      navigate("/manage-events");
    } catch (err) {
      setError(err.message || "Unable to create event.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Organizer</p>
          <h1>Create Event</h1>
          <p>Create a new event. It will initially be saved as a draft.</p>
        </div>
      </section>

      <form className="event-form" onSubmit={handleSubmit}>
        {error && <p className="error-message" role="alert">{error}</p>}

        <label>
          Event Title
          <input
            name="title"
            type="text"
            value={form.title}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Description
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows="4"
          />
        </label>

        <label>
          Category
          <input
            name="category"
            type="text"
            value={form.category}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Start Date & Time
          <input
            name="startDateTime"
            type="datetime-local"
            value={form.startDateTime}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          End Date & Time
          <input
            name="endDateTime"
            type="datetime-local"
            value={form.endDateTime}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Venue
          <input
            name="venue"
            type="text"
            value={form.venue}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Capacity
          <input
            name="capacity"
            type="number"
            min="1"
            step="1"
            value={form.capacity}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Ticket Price (₹)
          <input
            name="ticketPrice"
            type="number"
            min="0"
            step="0.01"
            value={form.ticketPrice}
            onChange={handleChange}
          />
        </label>

        <label>
          Refund Window (hours)
          <input
            name="refundWindowHours"
            type="number"
            min="0"
            step="1"
            value={form.refundWindowHours}
            onChange={handleChange}
          />
        </label>

        <div className="form-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create Draft"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}