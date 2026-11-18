import { useEffect, useState } from "react";
import apiClient from "../api/client";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const money = (paise) => currency.format(paise / 100);
const utilization = ({ seatsTaken, capacity }) => capacity ? (100 * seatsTaken / capacity).toFixed(1) + "%" : "0%";
const emptyFilters = { eventId: "", from: "", to: "" };

export default function EventReports() {
  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    apiClient.get("/reports", { params: filters, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setReport(data); })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [filters]);

  async function download(kind) {
    setExportError("");
    setDownloading(true);
    try {
      const { data } = await apiClient.get("/reports/" + kind + ".csv", { params: filters, responseType: "blob" });
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = kind + ".csv";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setExportError(err.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="card event-reports" aria-labelledby="reports-heading">
      <h2 id="reports-heading">Event reports</h2>
      <form onSubmit={(e) => {
        e.preventDefault();
        setError("");
        setExportError("");
        setReport(null);
        setFilters(Object.fromEntries(Object.entries(draft).filter(([, value]) => value)));
      }}>
        <label>Event ID <input type="number" min="1" value={draft.eventId} onChange={(e) => setDraft({ ...draft, eventId: e.target.value })} /></label>
        <label>Event starts from (UTC) <input type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} /></label>
        <label>Event starts through (UTC) <input type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} /></label>
        <button type="submit">Apply filters</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {!report && !error && <p role="status">Loading reports…</p>}
      {report && (
        <>
          <p>{report.totals.events} events · {report.totals.confirmed} confirmed · {report.totals.waitlisted} waitlisted · {report.totals.checkedIn} checked in</p>
          <p>{utilization(report.totals)} capacity used, including pending reservations{report.totals.users !== undefined && " · " + report.totals.users + " platform users"}</p>
          <p>Net revenue: {money(report.totals.revenuePaise)} · Simulated net revenue: {money(report.totals.simulatedRevenuePaise)}</p>
          {report.events.length ? (
            <div className="report-table" tabIndex={0} role="region" aria-label="Event metrics">
              <table>
                <thead><tr>{["Event", "Status", "Confirmed", "Waitlisted", "Checked in", "Capacity used", "Net revenue", "Simulated net revenue"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
                <tbody>{report.events.map((event) => <tr key={event.id}>
                  <th scope="row">{event.title} (#{event.id})</th><td>{event.status}</td><td>{event.confirmed}</td>
                  <td>{event.waitlisted}</td><td>{event.checkedIn}</td><td>{event.seatsTaken}/{event.capacity} ({utilization(event)})</td>
                  <td>{money(event.revenuePaise)}</td><td>{money(event.simulatedRevenuePaise)}</td>
                </tr>)}</tbody>
              </table>
            </div>
          ) : <p>No events match these filters.</p>}
          <div className="report-downloads">
            <button type="button" disabled={downloading} onClick={() => download("registrations")}>Download registrations CSV</button>
            <button type="button" disabled={downloading} onClick={() => download("attendance")}>Download attendance CSV</button>
          </div>
          {exportError && <p role="alert">{exportError}</p>}
        </>
      )}
    </section>
  );
}
