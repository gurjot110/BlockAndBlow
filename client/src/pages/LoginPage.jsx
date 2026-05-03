import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setAuth } from "../App.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function LoginPage() {
  const nav = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowForm(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");

    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.message || "Login failed.");
      return;
    }

    setAuth(data.token, data.user);
    nav("/rooms");
  }

  return (
    <main className="login-screen">
      <section className={showForm ? "login-panel show" : "login-panel"}>
        <img
          src="/block_blow_logo_transparent.png"
          alt="Block & Blow"
          className="login-logo"
        />

        <div className="login-form-wrap">
          {/* <h1>Login / Signup</h1>  */}

          {error && <div className="error">{error}</div>}

          <form onSubmit={submit}>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
            />

            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
            />

            <button type="submit">Continue</button>
          </form>
        </div>
      </section>
    </main>
  );
}
