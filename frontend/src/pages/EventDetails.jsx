import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getEventById } from "../api/event";
import {
  cancelRegistration,
  getMyRegistrations,
  registerForEvent,
} from "../api/registration";
import { useAuth } from "../context/AuthContext";

export default function EventDetails() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registration, setRegistration] = useState(null);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [pending, setPending] = useState(false);

  const loadEvent = useCallback(async () => {
    const data = await getEventById(id);
    setEvent(data.event);
  }, [id]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await getEventById(id);
        if (active) setEvent(data.event);
      } catch (err) {
        if (active) setError(err.message || "Unable to load event.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [id]);

  const refreshRegistration = useCallback(async () => {
    if (authLoading) return;
    if (!user || user.role !== "ATTENDEE") {
      setRegistration(null);
      setRegistrationError("");
      setRegistrationLoading(false);
      return;
    }

    setRegistrationLoading(true);
    setRegistrationError("");
    try {
      const data = await getMyRegistrations();
      const current = data.registrations.find((item) => Number(item.eventId) === Number(id));
      setRegistration(current || null);
    } catch (err) {
      setRegistrationError(err.message || "Unable to load your registration status.");
    } finally {
      setRegistrationLoading(false);
    }
  }, [authLoading, id, user]);

  useEffect(() => { refreshRegistration(); }, [refreshRegistration]);

  async function refreshAfterAction() {
    try {
      await loadEvent();
      await refreshRegistration();
    } catch {
      setRegistrationError("Your action was saved, but the latest event status could not be refreshed.");
    }
  }

  async function handleRegister() {
    setPending(true);
    setActionMessage("");
    setActionError("");
    try {
      const result = await registerForEvent(id);
      setRegistration(result.registration);
      setActionMessage(result.message || (result.registration.status === "WAITLISTED"
        ? "You have been added to the waitlist."
        : "Your registration is confirmed."));
      await refreshAfterAction();
    } catch (err) {
      setActionError(err.message || "Unable to register for this event.");
    } finally {
      setPending(false);
    }
  }

  async function handleCancel() {
    if (!registration) return;
    setPending(true);
    setActionMessage("");
    setActionError("");
    try {
      const result = await cancelRegistration(registration.id);
      setRegistration(result.registration);
      setActionMessage(result.message || "Your registration was cancelled.");
      await refreshAfterAction();
    } catch (err) {
      setActionError(err.message || "Unable to cancel this registration.");
    } finally {
      setPending(false);
    }
  }

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

  const formatDate = (value) => new Date(value).toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
  });
  const capacity = Number(event.capacity);
  const seatsTaken = Number(event.seatsTaken || 0);
  const availableSeats = Math.max(0, capacity - seatsTaken);
  const now = Date.now();
  const eventEnded = new Date(event.endDateTime).getTime() <= now;
  const canRegister = event.status === "PUBLISHED" && !eventEnded && Number(event.ticketPrice) === 0;
  const cancellationCutoffPassed = event.refundWindowHours !== null && event.refundWindowHours !== undefined &&
    new Date(event.startDateTime).getTime() - now < Number(event.refundWindowHours) * 3600000;
  const canCancelConfirmed = event.status === "PUBLISHED" && !cancellationCutoffPassed;

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
            <p><strong>Capacity:</strong> {capacity}</p>
            <p><strong>Registered attendees:</strong> {seatsTaken}</p>
            <p><strong>Available seats:</strong> {availableSeats}</p>
            <p>
              <strong>Ticket Price:</strong>{" "}
              {Number(event.ticketPrice) === 0 ? "Free" : "₹" + Number(event.ticketPrice).toFixed(2)}
            </p>
            <p><strong>Organizer:</strong> {event.organizer?.name || "Not available"}</p>
            <p><strong>Status:</strong> {event.status}</p>
          </div>

          <section className="registration-panel" aria-labelledby="registration-title" aria-busy={pending || registrationLoading}>
            <p className="eyebrow">Your place</p>
            <h2 id="registration-title">Registration</h2>
            {actionMessage && <p className="success-message" role="status">{actionMessage}</p>}
            {actionError && <p className="error-message" role="alert">{actionError}</p>}
            {registrationError && <p className="error-message" role="alert">{registrationError}</p>}

            {registrationLoading || authLoading ? (
              <p role="status">Checking your registration…</p>
            ) : registrationError ? (
              <button className="registration-button secondary" type="button" onClick={refreshRegistration}>Retry status check</button>
            ) : registration?.status === "CONFIRMED" ? (
              <>
                <p className="registration-state" role="status">You are registered for this event.</p>
                <button className="registration-button secondary" type="button" onClick={handleCancel} disabled={pending || !canCancelConfirmed}>
                  {pending ? "Cancelling…" : "Cancel registration"}
                </button>
                {cancellationCutoffPassed && <p className="registration-note">The cancellation cutoff has passed.</p>}
              </>
            ) : registration?.status === "WAITLISTED" ? (
              <>
                <p className="registration-state" role="status">You are on the waitlist.</p>
                <button className="registration-button secondary" type="button" onClick={handleCancel} disabled={pending}>
                  {pending ? "Leaving waitlist…" : "Leave waitlist"}
                </button>
              </>
            ) : registration?.status === "CANCELLED" ? (
              <p className="registration-note" role="status">Your registration was cancelled. You cannot register for this event again.</p>
            ) : !user ? (
              <p className="registration-note">Log in with an attendee account to register. <Link to="/login">Log in</Link></p>
            ) : user.role !== "ATTENDEE" ? (
              <p className="registration-note">Registration is available to attendee accounts.</p>
            ) : Number(event.ticketPrice) > 0 ? (
              <p className="registration-note">Paid registration is unavailable until payment support is added.</p>
            ) : !canRegister ? (
              <p className="registration-note">Registration is closed for this event.</p>
            ) : (
              <>
                <p className="registration-note">
                  {availableSeats > 0 ? `${availableSeats} seat${availableSeats === 1 ? "" : "s"} available.` : "This event is full. You can join its waitlist."}
                </p>
                <button className="registration-button" type="button" onClick={handleRegister} disabled={pending}>
                  {pending ? "Submitting…" : availableSeats > 0 ? "Register" : "Join waitlist"}
                </button>
              </>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}
