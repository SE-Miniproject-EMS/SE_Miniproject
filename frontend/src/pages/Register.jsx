import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "ATTENDEE" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await register(form);
      setSuccess("Account created! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-content">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Create your account</h1>
        <p className="subtitle">Join as an attendee or an event organizer.</p>

        {error && <div className="alert-error" role="alert">{error}</div>}
        {success && <div className="alert-success" role="status">{success}</div>}

        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" value={form.name} onChange={update("name")} required minLength={2} />
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={form.email} onChange={update("email")} required />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={form.password} onChange={update("password")} required minLength={8} />
        </div>

        <div className="field">
          <label htmlFor="role">I am a...</label>
          <select id="role" value={form.role} onChange={update("role")}>
            <option value="ATTENDEE">Attendee</option>
            <option value="ORGANIZER">Organizer</option>
          </select>
        </div>

        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? "Creating account..." : "Sign Up"}
        </button>

        <div className="form-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </form>
    </div>
  );
}
