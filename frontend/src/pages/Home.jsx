import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user } = useAuth();
  const isOrganizer = user?.role === "ORGANIZER" || user?.role === "ADMIN";

  return (
    <main className="page home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="hero-copy">
          <p className="eyebrow">Bring people together</p>
          <h1 id="home-title">Make room for <em>something</em> memorable.</h1>
          <p>Find gatherings worth showing up for, or bring your own event to life with a little more ease.</p>
          <div className="hero-actions">
            <Link className="button-primary" to="/events">Explore events <span aria-hidden="true">↗</span></Link>
            {user
              ? <Link className="button-secondary" to="/dashboard">Your dashboard</Link>
              : <Link className="button-secondary" to="/register">Create an account</Link>}
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-sun" />
          <div className="hero-orbit" />
          <div className="hero-ticket">
            <div className="ticket-top"><span>Gather / EMS</span><span className="ticket-stamp">G</span></div>
            <div className="ticket-title">Good things happen when we meet.</div>
            <div className="ticket-bottom"><span>Discover your next event</span><span>✳</span></div>
            <span className="ticket-squiggle">〰</span>
          </div>
        </div>
      </section>

      <section className="home-intro">
        <div>
          <p className="eyebrow">A place to begin</p>
          <h2>Less searching. More showing up.</h2>
        </div>
        <p>Browse published events, narrow down what suits you, and explore the details. Organizers can create drafts, shape the details, and publish when everything is ready.</p>
      </section>

      <section className="path-cards" aria-label="Choose where to go">
        <Link className="path-card" to="/events">
          <span><h3>Find your next thing</h3><p>Explore upcoming events and filter by what matters to you.</p></span>
          <span className="path-arrow" aria-hidden="true">↗</span>
        </Link>
        <Link className="path-card" to={isOrganizer ? "/manage-events" : user ? "/dashboard" : "/login"}>
          <span><h3>{isOrganizer ? "Your events, in hand" : "Host an event"}</h3><p>{isOrganizer ? "Manage drafts and published events from one place." : "Sign in as an organizer to create and manage events."}</p></span>
          <span className="path-arrow" aria-hidden="true">↗</span>
        </Link>
      </section>
    </main>
  );
}
