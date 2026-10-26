import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createEvent } from "../api/event";

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
        {error && <p className="error-message">{error}</p>}

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