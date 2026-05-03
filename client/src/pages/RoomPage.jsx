import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Protected, getAuth } from "../App.jsx";

export default function RoomPage() {
  return (
    <Protected>
      <div className="room-container">
        <LogoutButton />
        <RoomPageInner />
      </div>
    </Protected>
  );
}

function LogoutButton() {
  const nav = useNavigate();

  function logout() {
    localStorage.clear();
    nav("/login");
  }

  return (
    <button className="logout-btn" onClick={logout}>
      Logout
    </button>
  );
}

function RoomPageInner() {
  const [roomId, setRoomId] = useState("");
  const nav = useNavigate();
  const { user } = getAuth();

  function join(e) {
    e.preventDefault();
    const id = roomId.trim();
    if (id) nav(`/lobby/${encodeURIComponent(id)}`);
  }

  function logout() {
    localStorage.clear();
    nav("/login");
  }

  return (
    <main className="room-page">
      <button className="logout-btn" onClick={logout}>
        Logout
      </button>

      <section className="room-hero">
        <h1 className="room-title">
          Logged in as <span>{user?.username}</span>
        </h1>

        <form className="room-content" onSubmit={join}>
          <input
            placeholder="Enter room ID (e.g. room1)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />

          <div className="room-actions">
            <button type="submit">Join / Create Room</button>

            <button
              type="button"
              className="secondary room-leaderboard-btn"
              onClick={() => nav("/leaderboard")}
            >
              Leaderboard
            </button>
          </div>
        </form>

        <section className="rules-box">
          <h2>Moves & Rules</h2>

          <p>
            <b>Move:</b> Arrow Keys
          </p>
          <p>
            <b>Attack:</b> X
          </p>
          <p>
            <b>Shield:</b> Z
          </p>
          <p>
            <b>Players:</b> Minimum 2, maximum 10
          </p>
          <p>
            <b>Goal:</b> Survive until the end or be the last player alive
          </p>
          <p>
            <b>Spacebar:</b> Dash (Only 1 per game, use wisely)
          </p>
        </section>
      </section>
    </main>
  );
}
