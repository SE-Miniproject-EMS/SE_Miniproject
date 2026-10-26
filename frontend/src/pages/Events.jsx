import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPublicEvents } from "../api/event";

const PAGE_SIZE = 9;

export default function Events() {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadEvents(filters = {}, requestedPage = 1) {
    try {
      setLoading(true);
      setError("");
      const data = await getPublicEvents({
        ...filters,
        page: requestedPage,
        limit: PAGE_SIZE,
      });
      setEvents(data.events || []);
      setPagination(data.pagination || { page: requestedPage, pages: 0, total: (data.events || []).length });
      setPage(requestedPage);
    } catch (err) {
      setError(err.message || "Unable to load events.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  function currentFilters() {
    const filters = {};
    if (search.trim()) filters.search = search.trim();
    if (category.trim()) filters.category = category.trim();
    if (location.trim()) filters.location = location.trim();
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    return filters;
  }

  function handleSearch(event) {
    event.preventDefault();
    loadEvents(currentFilters(), 1);
  }

  function clearFilters() {
    setSearch("");
    setCategory("");
    setLocation("");
    setStartDate("");
    setEndDate("");
    loadEvents({}, 1);
  }

  function formatDate(date) {
    return new Date(date).toLocaleString();
  }

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Discover</p>
          <h1>Upcoming Events</h1>
          <p>Explore published events and find something worth attending.</p>
        </div>
      </section>

      <form className="event-filters" onSubmit={handleSearch}>
        <input
          type="search"
          aria-label="Search events"
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          type="text"
          aria-label="Category"
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <input
          type="search"
          aria-label="Venue or location"
          placeholder="Venue or location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <label>
          From
          <input
            type="date"
            aria-label="Start date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label>
          To
          <input
            type="date"
            aria-label="End date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
        <button type="submit">Search</button>
        <button type="button" onClick={clearFilters}>Clear</button>
      </form>

      {!loading && !error && pagination.total > 0 && (
        <p aria-live="polite">{pagination.total} upcoming event{pagination.total === 1 ? "" : "s"} found.</p>
      )}
      {loading && <p>Loading events...</p>}
      {error && <p className="error-message">{error}</p>}

      {!loading && !error && events.length === 0 && (
        <div className="empty-state">
          <h2>No events found</h2>
          <p>There are currently no published upcoming events matching your search.</p>
        </div>
      )}

      <div className="event-grid">
        {events.map((event) => (
          <article className="event-card" key={event.id}>
            <div className="event-card-top">
              <span className="event-category">{event.category}</span>
              <span className="event-status">{event.status}</span>
            </div>
            <h2>{event.title}</h2>
            <p>{event.description || "No description provided."}</p>
            <div className="event-info">
              <p><strong>Starts:</strong> {formatDate(event.startDateTime)}</p>
              <p><strong>Venue:</strong> {event.venue}</p>
              <p><strong>Capacity:</strong> {event.capacity}</p>
              <p>
                <strong>Price:</strong>{" "}
                {Number(event.ticketPrice) === 0 ? "Free" : `₹${event.ticketPrice}`}
              </p>
              {event.organizer?.name && (
                <p><strong>Organizer:</strong> {event.organizer.name}</p>
              )}
            </div>
            <Link className="event-details-link" to={`/events/${event.id}`}>
              View Details
            </Link>
          </article>
        ))}
      </div>

      {!loading && !error && pagination.pages > 1 && (
        <nav className="event-pagination" aria-label="Event pages">
          <button
            type="button"
            onClick={() => loadEvents(currentFilters(), page - 1)}
            disabled={page <= 1}
          >
            Previous
          </button>
          <span>Page {page} of {pagination.pages}</span>
          <button
            type="button"
            onClick={() => loadEvents(currentFilters(), page + 1)}
            disabled={page >= pagination.pages}
          >
            Next
          </button>
        </nav>
      )}
    </main>
  );
}
