
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getEventById } from "../api/event";

export default function EventDetails() {
  const { id } = useParams();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadEvent() {
      try {
        setLoading(true);
        setError("");

        const data = await getEventById(id);

        if (active) {
          setEvent(data.event);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load event.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadEvent();

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return <main className="page"><p className="loading-state" role="status">Loading event details…</p></main>;
  }

  if (error || !event) {
    return (
      <main className="page">
        <p className="eyebrow">Event details</p>
        <h1>Event unavailable</h1>
        <p className="error-message" role="alert">{error || "This event could not be found."}</p>
        <Link className="back-link" to="/events">← Back to events</Link>
      </main>
    );
  }

  const formatDate = (value) =>
    new Date(value).toLocaleString("en-IN", {
      dateStyle: "full",
      timeStyle: "short",
    });

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">{event.category}</p>
          <h1>{event.title}</h1>
          <p>{event.description || "No description provided."}</p>
        </div>
        <span className={"event-status status-" + (event.status?.toLowerCase() || "draft")}>{event.status}</span>
      </section>

      <section className="details-panel">
        <article className="details-main">
          <p className="eyebrow">The gathering</p>
          <h2>Everything you need to know.</h2>
          <p>{event.description || "The host has not added a description yet."}</p>
          <Link className="back-link" to="/events">← Back to upcoming events</Link>
        </article>
        <aside className="details-aside" aria-label="Event information">
          <p className="eyebrow">Event information</p>

        <div className="event-info">
          <p><strong>Starts:</strong> {formatDate(event.startDateTime)}</p>
          <p><strong>Ends:</strong> {formatDate(event.endDateTime)}</p>
          <p><strong>Venue:</strong> {event.venue}</p>
          <p><strong>Capacity:</strong> {event.capacity}</p>
          <p>
            <strong>Ticket Price:</strong>{" "}
            {Number(event.ticketPrice) === 0
              ? "Free"
              : "₹" + Number(event.ticketPrice).toFixed(2)}
          </p>
          <p>
            <strong>Organizer:</strong>{" "}
            {event.organizer?.name || "Not available"}
          </p>
          <p><strong>Status:</strong> {event.status}</p>
        </div>
        </aside>
      </section>
    </main>
  );
}
