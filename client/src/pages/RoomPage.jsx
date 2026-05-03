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
    <main className="page">
      <form className="card" onSubmit={join}>
        <h1>Room Page</h1>
        <p>
          Logged in as <b>{user?.username}</b>
        </p>
        <input
          placeholder="Enter room ID, e.g. room1"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <div className="row">
          <button>Join / Create Room</button>
          <button
            type="button"
            className="secondary"
            onClick={() => nav("/leaderboard")}
          >
            Leaderboard
          </button>
          <button type="button" className="danger" onClick={logout}>
            Logout
          </button>
        </div>
      </form>
    </main>
  );
}
