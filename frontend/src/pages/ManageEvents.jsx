import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMyEvents,
  publishEvent,
  cancelEvent,
} from "../api/event";

export default function ManageEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadEvents() {
    try {
      setLoading(true);
      setError("");

      const data = await getMyEvents();
      setEvents(data.events || []);
    } catch (err) {
      setError(err.message || "Unable to load your events.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  async function handlePublish(id) {
    try {
      setError("");
      setMessage("");

      await publishEvent(id);

      setMessage("Event published successfully.");
      await loadEvents();
    } catch (err) {
      setError(err.message || "Unable to publish event.");
    }
  }

  async function handleCancel(id) {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this event?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setMessage("");

      await cancelEvent(id);

      setMessage("Event cancelled successfully.");
      await loadEvents();
    } catch (err) {
      setError(err.message || "Unable to cancel event.");
    }
  }

  function formatDate(date) {
    return new Date(date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  }

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Organizer space</p>
          <h1>Your events, in hand.</h1>
          <p>Shape a draft, publish when it’s ready, and keep the details up to date.</p>
        </div>

        <Link className="primary-link" to="/events/create">
          ＋ Create event
        </Link>
      </section>

      {message && (
        <p className="success-message" role="status">
          {message}
        </p>
      )}

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}

      {loading && <p className="loading-state" role="status">Loading your events…</p>}

      {!loading && !error && events.length === 0 && (
        <div className="empty-state">
          <h2>Your first event starts here</h2>
          <p>Create a draft and fill in the details when you’re ready.</p>
          <Link className="button-primary" to="/events/create">Create an event ↗</Link>
        </div>
      )}

      <div className="event-grid">
        {events.map((event) => (
          <article className="event-card" key={event.id}>
            <div className="event-card-art" aria-hidden="true"><span>Organizer / {event.category}</span></div>
            <div className="event-card-top">
              <span className="event-category">
                {event.category}
              </span>

              <span className={"event-status status-" + (event.status?.toLowerCase() || "draft")}>
                {event.status}
              </span>
            </div>

            <h2>{event.title}</h2>

            <p>
              {event.description || "No description provided."}
            </p>

            <div className="event-info">
              <p>
                <strong>Starts:</strong>{" "}
                {formatDate(event.startDateTime)}
              </p>

              <p>
                <strong>Venue:</strong>{" "}
                {event.venue}
              </p>

              <p>
                <strong>Capacity:</strong>{" "}
                {event.capacity}
              </p>

              <p>
                <strong>Price:</strong>{" "}
                {Number(event.ticketPrice) === 0
                  ? "Free"
                  : `?${event.ticketPrice}`}
              </p>
            </div>

            <div className="event-actions">
              {event.status !== "CANCELLED" && (
                <Link className="event-details-link" to={`/events/${event.id}/edit`}>
                  Edit details
                </Link>
              )}

              {event.status === "DRAFT" && (
                <button
                  type="button"
                  onClick={() => handlePublish(event.id)}
                >
                  Publish
                </button>
              )}

              {event.status !== "CANCELLED" && (
                <button
                  type="button"
                  onClick={() => handleCancel(event.id)}
                >
                  Cancel Event
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
