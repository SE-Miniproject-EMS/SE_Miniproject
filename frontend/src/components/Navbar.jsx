
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const isOrganizer =
    user?.role === "ORGANIZER" || user?.role === "ADMIN";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const navLinkClass = ({ isActive }) =>
    isActive ? "nav-link active" : "nav-link";

  return (
    <header className="navbar">
      <Link to="/" className="brand" aria-label="Event Management System home">
        <span>Event Management System</span>
      </Link>

      <nav className="nav-links" aria-label="Main navigation">
        <NavLink to="/events" className={navLinkClass}>
          Explore events
        </NavLink>

        {!loading && user && (
          <>
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>

            {isOrganizer && (
              <>
                <NavLink
                  to="/manage-events"
                  className={navLinkClass}
                >
                  Manage events
                </NavLink>

                <NavLink
                  to="/events/create"
                  className={navLinkClass}
                >
                  Create event
                </NavLink>
              </>
            )}

            <button
              type="button"
              className="nav-logout"
              onClick={handleLogout}
            >
              Log out
            </button>
          </>
        )}

        {!loading && !user && (
          <>
            <NavLink to="/login" className={navLinkClass}>
              Log in
            </NavLink>

            <NavLink to="/register" className={navLinkClass}>
              Sign up
            </NavLink>
          </>
        )}
      </nav>
    </header>
  );
}
