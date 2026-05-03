import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Protected, getAuth } from "../App.jsx";
import { getSocket } from "../socket.js";

export default function LobbyPage() {
  return (
    <Protected>
      <LobbyInner />
    </Protected>
  );
}

function LobbyInner() {
  const { roomId } = useParams();
  const nav = useNavigate();
  const { user } = getAuth();

  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const socket = getSocket();

    function handleRoomUpdated(updatedRoom) {
      setRoom(updatedRoom);
    }

    function handleMatchStarted() {
      nav(`/game/${roomId}`);
    }

    // ✅ LISTEN FIRST
    socket.on("roomUpdated", handleRoomUpdated);
    socket.on("matchStarted", handleMatchStarted);

    // ✅ THEN EMIT
    socket.emit("joinRoom", { roomId }, (res) => {
      if (!res?.ok) {
        setError(res?.message || "Could not join room.");
        return;
      }

      setRoom(res.room);
    });

    return () => {
      socket.off("roomUpdated", handleRoomUpdated);
      socket.off("matchStarted", handleMatchStarted);
    };
  }, [roomId, nav]);

  function start() {
    setError("");

    getSocket().emit("startMatch", {}, (res) => {
      if (!res?.ok) {
        setError(res?.message || "Could not start match.");
      }
    });
  }

  function leave() {
    getSocket().emit("leaveRoom");
    nav("/rooms");
  }

  const players = room?.players || [];
  const isHost = room?.hostUserId === user?.id;

  return (
    <main className="page">
      <section className="card">
        <h1>Lobby: {roomId}</h1>

        {error && <div className="error">{error}</div>}

        <p>Players: {players.length}/10</p>

        <ul className="list">
          {players.map((p) => (
            <li key={p.socketId}>
              <span>{p.username}</span>
              {p.userId === room?.hostUserId && <b>Host</b>}
            </li>
          ))}
        </ul>

        <div className="row">
          {isHost && (
            <button disabled={players.length < 2} onClick={start}>
              Start Match
            </button>
          )}

          <button className="danger" onClick={leave}>
            Return to Room Page
          </button>
        </div>
      </section>
    </main>
  );
}
