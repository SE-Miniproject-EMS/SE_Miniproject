
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getMyEvents, updateEvent } from "../api/event";

const emptyForm = {
  title: "",
  description: "",
  category: "",
  startDate: "",
  startHour: "10",
  startMinute: "00",
  startPeriod: "AM",
  endDate: "",
  endHour: "04",
  endMinute: "30",
  endPeriod: "PM",
  venue: "",
  capacity: "",
  ticketPrice: "0",
  refundWindowHours: "",
};

const hours = Array.from({ length: 12 }, (_, index) =>
  String(index + 1).padStart(2, "0")
);

const minutes = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0")
);

function splitDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const hour24 = date.getHours();
  const hour12 = hour24 % 12 || 12;

  return {
    date: `${year}-${month}-${day}`,
    hour: String(hour12).padStart(2, "0"),
    minute: String(date.getMinutes()).padStart(2, "0"),
    period: hour24 >= 12 ? "PM" : "AM",
  };
}

function combineDateTime(date, hour, minute, period) {
  if (!date) {
    return null;
  }

  const hour12 = Number(hour);
  const minuteNumber = Number(minute);

  if (
    !Number.isInteger(hour12) ||
    hour12 < 1 ||
    hour12 > 12 ||
    !Number.isInteger(minuteNumber) ||
    minuteNumber < 0 ||
    minuteNumber > 59
  ) {
    return null;
  }

  const hour24 =
    (hour12 % 12) + (period === "PM" ? 12 : 0);

  const [year, month, day] = date.split("-").map(Number);

  const result = new Date(
    year,
    month - 1,
    day,
    hour24,
    minuteNumber,
    0,
    0
  );

  if (
    Number.isNaN(result.getTime()) ||
    result.getFullYear() !== year ||
    result.getMonth() !== month - 1 ||
    result.getDate() !== day
  ) {
    return null;
  }

  return result;
}

function DateTimeFields({ label, prefix, form, onChange }) {
  return (
    <fieldset
      style={{
        border: "1px solid #d9e0ea",
        borderRadius: "10px",
        padding: "18px",
        marginBottom: "20px",
      }}
    >
      <legend
        style={{
          fontWeight: 700,
          color: "#1f3864",
          padding: "0 8px",
        }}
      >
        {label}
      </legend>

      <label>
        Date
        <input
          type="date"
          name={`${prefix}Date`}
          value={form[`${prefix}Date`]}
          onChange={onChange}
          required
        />
      </label>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "12px",
        }}
      >
        <label>
          Hour
          <select
            name={`${prefix}Hour`}
            value={form[`${prefix}Hour`]}
            onChange={onChange}
            required
          >
            {hours.map((hour) => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>
        </label>

        <label>
          Minute
          <select
            name={`${prefix}Minute`}
            value={form[`${prefix}Minute`]}
            onChange={onChange}
            required
          >
            {minutes.map((minute) => (
              <option key={minute} value={minute}>
                {minute}
              </option>
            ))}
          </select>
        </label>

        <label>
          AM / PM
          <select
            name={`${prefix}Period`}
            value={form[`${prefix}Period`]}
            onChange={onChange}
            required
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </label>
      </div>
    </fieldset>
  );
}

export default function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadEvent() {
      try {
        setLoading(true);
        setError("");

        const data = await getMyEvents();

        const event = (data.events || []).find(
          (item) => String(item.id) === String(id)
        );

        if (!event) {
          throw new Error("Event not found or access denied.");
        }

        if (event.status === "CANCELLED") {
          throw new Error("Cancelled events cannot be edited.");
        }

        const start = splitDateTime(event.startDateTime);
        const end = splitDateTime(event.endDateTime);

        if (!start || !end) {
          throw new Error("Event has invalid date or time data.");
        }

        if (!active) return;

        setForm({
          title: event.title || "",
          description: event.description || "",
          category: event.category || "",
          startDate: start.date,
          startHour: start.hour,
          startMinute: start.minute,
          startPeriod: start.period,
          endDate: end.date,
          endHour: end.hour,
          endMinute: end.minute,
          endPeriod: end.period,
          venue: event.venue || "",
          capacity: String(event.capacity ?? ""),
          ticketPrice: String(event.ticketPrice ?? 0),
          refundWindowHours:
            event.refundWindowHours == null
              ? ""
              : String(event.refundWindowHours),
        });
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load event.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadEvent();

    return () => {
      active = false;
    };
  }, [id]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const start = combineDateTime(
      form.startDate,
      form.startHour,
      form.startMinute,
      form.startPeriod
    );

    const end = combineDateTime(
      form.endDate,
      form.endHour,
      form.endMinute,
      form.endPeriod
    );

    if (!start || !end) {
      setError("Please enter valid event dates and times.");
      return;
    }

    if (end <= start) {
      setError(
        "End date and time must be later than start date and time."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        startDateTime: start.toISOString(),
        endDateTime: end.toISOString(),
        venue: form.venue.trim(),
        capacity: Number(form.capacity),
        ticketPrice: Number(form.ticketPrice || 0),
        refundWindowHours:
          form.refundWindowHours === ""
            ? null
            : Number(form.refundWindowHours),
      };

      await updateEvent(id, payload);

      navigate("/manage-events");
    } catch (err) {
      setError(err.message || "Unable to update event.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="page">
        <p>Loading event...</p>
      </main>
    );
  }

  if (error && !form.title) {
    return (
      <main className="page">
        <h1>Unable to edit event</h1>
        <p className="error-message">{error}</p>
        <Link to="/manage-events">
          Back to Manage Events
        </Link>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="page-header">
        <p className="eyebrow">Organizer</p>
        <h1>Edit Event</h1>
        <p>
          Update your event information and save the changes.
        </p>
      </section>

      <form className="event-form" onSubmit={handleSubmit}>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}

        <label>
          Event Title
          <input
            name="title"
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
            rows={4}
          />
        </label>

        <label>
          Category
          <input
            name="category"
            value={form.category}
            onChange={handleChange}
            required
          />
        </label>

        <DateTimeFields
          label="Start Date & Time"
          prefix="start"
          form={form}
          onChange={handleChange}
        />

        <DateTimeFields
          label="End Date & Time"
          prefix="end"
          form={form}
          onChange={handleChange}
        />

        <label>
          Venue
          <input
            name="venue"
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
          Ticket Price (INR)
          <input
            name="ticketPrice"
            type="number"
            min="0"
            step="0.01"
            value={form.ticketPrice}
            onChange={handleChange}
            required
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
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/manage-events")}
          >
            Back
          </button>
        </div>
      </form>
    </main>
  );
}
