import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getEventById } from "../api/event";
import {
  cancelRegistration,
  getMyRegistrations,
  registerForEvent,
  retryPayment,
  simulatePaymentOutcome,
  simulateRefundOutcome,
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
  const [ticketToken, setTicketToken] = useState("");

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
      setTicketToken(result.ticketToken || "");
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
      setTicketToken("");
      setRegistration(result.registration);
      setActionMessage(result.message || "Your registration was cancelled.");
      await refreshAfterAction();
    } catch (err) {
      setActionError(err.message || "Unable to cancel this registration.");
    } finally {
      setPending(false);
    }
  }

  async function handleMockPaymentOutcome(outcome) {
    if (!latestPayment) return;
    setPending(true);
    setActionMessage("");
    setActionError("");
    try {
      const result = await simulatePaymentOutcome(latestPayment.id, outcome);
      if (result.ticketToken) setTicketToken(result.ticketToken);
      setActionMessage(result.message || "Mock payment outcome recorded; no real payment was processed.");
      await refreshAfterAction();
    } catch (err) { setActionError(err.message || "Unable to simulate this mock payment outcome."); }
    finally { setPending(false); }
  }

  async function handleRetryPayment() {
    if (!registration) return;
    setPending(true);
    setActionMessage("");
    setActionError("");
    try {
      const result = await retryPayment(registration.id);
      setActionMessage(result.message);
      await refreshAfterAction();
    } catch (err) { setActionError(err.message || "Unable to retry the mock checkout."); }
    finally { setPending(false); }
  }

  async function handleMockRefundOutcome(outcome) {
    if (!latestPayment) return;
    setPending(true);
    setActionMessage("");
    setActionError("");
    try {
      const result = await simulateRefundOutcome(latestPayment.id, outcome);
      setActionMessage(result.message || "Mock refund outcome recorded; no real refund occurred.");
      await refreshAfterAction();
    } catch (err) { setActionError(err.message || "Unable to simulate this mock refund outcome."); }
    finally { setPending(false); }
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
  const canRegister = event.status === "PUBLISHED" && !eventEnded;
  const refundWindowHours = Number(event.ticketPrice) > 0 ? (event.refundWindowHours ?? 24) : event.refundWindowHours;
  const cancellationCutoffPassed = refundWindowHours !== null && refundWindowHours !== undefined &&
    new Date(event.startDateTime).getTime() - now < Number(refundWindowHours) * 3600000;
  const latestPayment = (registration?.payments || []).reduce((latest, item) => !latest || new Date(item.createdAt) > new Date(latest.createdAt) ? item : latest, null);
  const latestRefund = latestPayment?.refund || null;
  const refundBlocksRetry = latestRefund && ["PENDING", "FAILED"].includes(latestRefund.status);
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
            <p><strong>Seats reserved:</strong> {seatsTaken}</p>
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
            {ticketToken && <p className="registration-note" role="status">One-time ticket token for check-in: <code>{ticketToken}</code></p>}
            {registrationError && <p className="error-message" role="alert">{registrationError}</p>}

            {registrationLoading || authLoading ? (
              <p role="status">Checking your registration…</p>
            ) : registrationError ? (
              <button className="registration-button secondary" type="button" onClick={refreshRegistration}>Retry status check</button>
            ) : registration?.status === "PENDING_PAYMENT" ? (
              <>
                <p className="registration-state" role="status">
                  {latestPayment?.paymentPurpose === "WAITLIST_OFFER" ? "A mock paid seat is reserved for you until " + (latestPayment.expiresAt ? formatDate(latestPayment.expiresAt) : "checkout expiry") + "." : "Your mock checkout is pending."}
                  {" "}No real payment was processed.
                </p>
                <div className="payment-demo-actions">
                  <button className="registration-button" type="button" onClick={() => handleMockPaymentOutcome("SUCCESS")} disabled={pending}>Simulate payment success</button>
                  <button className="registration-button secondary" type="button" onClick={() => handleMockPaymentOutcome("FAILURE")} disabled={pending}>Simulate payment failure</button>
                </div>
              </>
            ) : registration?.status === "PAYMENT_REQUIRED" ? (
              <>
                <p className="registration-state" role="status">The previous checkout failed or expired; its seat was released.</p>
                {refundBlocksRetry ? (
                  <>
                    <p className="registration-note">A mock refund is {latestRefund.status.toLowerCase()}. Payment retry is paused until it resolves.</p>
                    <div className="payment-demo-actions">
                      <button className="registration-button" type="button" onClick={() => handleMockRefundOutcome("SUCCESS")} disabled={pending}>Simulate refund success</button>
                      <button className="registration-button secondary" type="button" onClick={() => handleMockRefundOutcome("FAILURE")} disabled={pending}>Simulate refund failure</button>
                    </div>
                  </>
                ) : (
                  <button className="registration-button" type="button" onClick={handleRetryPayment} disabled={pending}>
                    {pending ? "Starting checkout…" : "Retry mock checkout"}
                  </button>
                )}
              </>
            ) : registration?.status === "CONFIRMED" ? (
              <>
                <p className="registration-state" role="status">You are registered for this event.</p>
                {latestPayment?.status === "SUCCEEDED" && <p className="registration-note">Payment was simulated with the mock adapter; no real payment was processed.</p>}
                <button className="registration-button secondary" type="button" onClick={handleCancel} disabled={pending || !canCancelConfirmed}>
                  {pending ? "Cancelling…" : "Cancel registration"}
                </button>
                {cancellationCutoffPassed && <p className="registration-note">The cancellation cutoff has passed.</p>}
              </>
            ) : registration?.status === "WAITLISTED" ? (
              <>
                <p className="registration-state" role="status">You are on the waitlist.</p>
                {refundBlocksRetry && <p className="registration-note">A late mock payment refund is unresolved; another seat offer is paused.</p>}
                {refundBlocksRetry && (
                  <div className="payment-demo-actions">
                    <button className="registration-button" type="button" onClick={() => handleMockRefundOutcome("SUCCESS")} disabled={pending}>Simulate refund success</button>
                    <button className="registration-button secondary" type="button" onClick={() => handleMockRefundOutcome("FAILURE")} disabled={pending}>Simulate refund failure</button>
                  </div>
                )}
                <button className="registration-button secondary" type="button" onClick={handleCancel} disabled={pending}>
                  {pending ? "Leaving waitlist…" : "Leave waitlist"}
                </button>
              </>
            ) : registration?.status === "CANCELLED" ? (
              <>
                <p className="registration-note" role="status">Your registration was cancelled.</p>
                {latestRefund && (
                  <>
                    <p className="registration-note">Refund status: {latestRefund.status === "SIMULATED" ? "SIMULATED (no real refund occurred)" : latestRefund.status}.</p>
                    {["PENDING", "FAILED"].includes(latestRefund.status) && (
                      <div className="payment-demo-actions">
                        <button className="registration-button" type="button" onClick={() => handleMockRefundOutcome("SUCCESS")} disabled={pending}>Simulate refund success</button>
                        <button className="registration-button secondary" type="button" onClick={() => handleMockRefundOutcome("FAILURE")} disabled={pending}>Simulate refund failure</button>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : !user ? (
              <p className="registration-note">Log in with an attendee account to register. <Link to="/login">Log in</Link></p>
            ) : user.role !== "ATTENDEE" ? (
              <p className="registration-note">Registration is available to attendee accounts.</p>
            ) : !canRegister ? (
              <p className="registration-note">Registration is closed for this event.</p>
            ) : (
              <>
                {Number(event.ticketPrice) > 0 && <p className="registration-note">Development mock checkout only; no real payment provider or money transfer is used.</p>}
                <p className="registration-note">
                  {availableSeats > 0 ? availableSeats + " seat" + (availableSeats === 1 ? "" : "s") + " available." : Number(event.ticketPrice) > 0 ? "This event is full. You can join the paid waitlist." : "This event is full. You can join its waitlist."}
                </p>
                <button className="registration-button" type="button" onClick={handleRegister} disabled={pending}>
                  {pending ? "Submitting…" : Number(event.ticketPrice) > 0 ? (availableSeats > 0 ? "Start mock checkout" : "Join paid waitlist") : (availableSeats > 0 ? "Register" : "Join waitlist")}
                </button>
              </>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}
