import { useCallback, useEffect, useState } from "react";
import {
  getMyRegistrations,
  retryPayment,
  simulatePaymentOutcome,
  simulateRefundOutcome,
} from "../api/registration";

function newestPayment(registration) {
  return (registration.payments || []).reduce(
    (latest, current) => !latest || new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest,
    null
  );
}

export default function MyRegistrations() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [ticketTokens, setTicketTokens] = useState({});

  const refresh = useCallback(async () => {
    try {
      setError("");
      const result = await getMyRegistrations();
      setRegistrations(result.registrations || []);
    } catch (err) {
      setError(err.message || "Unable to load your registrations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function runAction(key, action) {
    setBusyId(key);
    setError("");
    setMessage("");
    try {
      const result = await action();
      if (result.ticketToken) setTicketTokens((current) => ({ ...current, [key]: result.ticketToken }));
      setMessage(result.message || "Mock outcome saved; no real payment or refund occurred.");
      await refresh();
    } catch (err) {
      setError(err.message || "Unable to update this mock payment.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <section className="registration-history"><h2>Your registrations</h2><p role="status">Loading registrations…</p></section>;

  return (
    <section className="registration-history" aria-labelledby="registration-history-title">
      <p className="eyebrow">Your event activity</p>
      <h2 id="registration-history-title">Your registrations</h2>
      {message && <p className="success-message" role="status">{message}</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {registrations.length === 0 ? (
        <p>You have not registered for any events yet.</p>
      ) : (
        <div className="registration-history-list">
          {registrations.map((registration) => {
            const payment = newestPayment(registration);
            const refund = payment?.refund;
            const refundUnresolved = refund && ["PENDING", "FAILED"].includes(refund.status);
            const key = "registration-" + registration.id;
            const eventName = registration.event?.title || "Event";
            return (
              <article className="registration-history-card" key={registration.id}>
                <div>
                  <h3>{eventName}</h3>
                  <p><strong>Registration:</strong> {registration.status.replaceAll("_", " ").toLowerCase()}</p>
                  {registration.event?.status === "CANCELLED" && <p className="registration-note">The organizer cancelled this event.</p>}
                  {payment && <p><strong>Mock payment:</strong> {payment.status} · ₹{(Number(payment.amountPaise) / 100).toFixed(2)}. No real payment was processed.</p>}
                  {refund && <p><strong>Refund:</strong> {refund.status === "SIMULATED" ? "SIMULATED (no real refund occurred)" : refund.status}</p>}
                  {ticketTokens[key] && <p role="status"><strong>One-time ticket token for check-in:</strong> <code>{ticketTokens[key]}</code></p>}
                </div>
                {payment?.status === "PENDING" && registration.status === "PENDING_PAYMENT" && (
                  <div className="payment-demo-actions">
                    <button className="registration-button" type="button" disabled={busyId === key} onClick={() => runAction(key, () => simulatePaymentOutcome(payment.id, "SUCCESS"))}>Simulate payment success</button>
                    <button className="registration-button secondary" type="button" disabled={busyId === key} onClick={() => runAction(key, () => simulatePaymentOutcome(payment.id, "FAILURE"))}>Simulate payment failure</button>
                  </div>
                )}
                {registration.status === "PAYMENT_REQUIRED" && !refundUnresolved && (
                  <button className="registration-button" type="button" disabled={busyId === key} onClick={() => runAction(key, () => retryPayment(registration.id))}>Retry mock checkout</button>
                )}
                {refundUnresolved && (
                  <div className="payment-demo-actions">
                    <button className="registration-button" type="button" disabled={busyId === key} onClick={() => runAction(key, () => simulateRefundOutcome(payment.id, "SUCCESS"))}>Simulate refund success</button>
                    <button className="registration-button secondary" type="button" disabled={busyId === key} onClick={() => runAction(key, () => simulateRefundOutcome(payment.id, "FAILURE"))}>Simulate refund failure</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
