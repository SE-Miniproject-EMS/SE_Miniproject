import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();

  const isOrganizer = user?.role === "ORGANIZER" || user?.role === "ADMIN";
  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Your Gather space</p>
          <h1>Welcome, {user.name.split(" ")[0]}.</h1>
          <p>Your account is ready. Pick up where you left off.</p>
        </div>
        <span className="badge">{user.role}</span>
      </section>
      {!user.isVerified && <p className="alert-success">Your account is not yet verified.</p>}
      <div className="dashboard-card card">
        <h2>{isOrganizer ? "Make something happen" : "See what’s happening"}</h2>
        <p>{isOrganizer ? "Create an event when you’re ready, then keep drafts and published events organized here." : "Browse public events and open any listing to see its date, venue, and host."}</p>
        <div className="dashboard-actions">
          <Link className="dashboard-action" to="/events"><strong>Explore events ↗</strong><span>Discover published events and use search and date filters.</span></Link>
          {isOrganizer ? (
            <>
              <Link className="dashboard-action" to="/events/create"><strong>Create an event ↗</strong><span>Start a draft with the existing event form.</span></Link>
              <Link className="dashboard-action" to="/manage-events"><strong>Manage your events ↗</strong><span>Edit, publish, or cancel your event drafts.</span></Link>
            </>
          ) : (
            <Link className="dashboard-action" to="/events"><strong>Browse the calendar ↗</strong><span>Use category, location, and date filters to narrow your search.</span></Link>
          )}
        </div>
      </div>
    </main>
  );
}
