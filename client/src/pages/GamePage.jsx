import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Protected } from "../App.jsx";
import { getSocket } from "../socket.js";
import GameCanvas from "../components/GameCanvas.jsx";

export default function GamePage() {
  return (
    <Protected>
      <GameInner />
    </Protected>
  );
}

function GameInner() {
  const { roomId } = useParams();
  const nav = useNavigate();
  const [state, setState] = useState(null);
  const [result, setResult] = useState(null);
  const [dead, setDead] = useState(false);
  const [spectating, setSpectating] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    socket.on("gameState", setState);
    socket.on("matchStarted", setState);
    socket.on("youDied", () => {
      setDead(true);
    });
    socket.on("matchEnded", setResult);
    socket.emit("joinRoom", { roomId }, () => {});
    return () => {
      socket.off("gameState", setState);
      socket.off("matchStarted", setState);
      socket.off("youDied");
      socket.off("matchEnded");
    };
  }, [roomId]);

  return (
    <div className="game-shell">
      <GameCanvas
        gameState={state}
        socket={getSocket()}
        spectating={spectating}
      />
      {/* {dead && (
        <div className="overlay">
          <div className="overlay-card">
            <h1>You died</h1>
          </div>
        </div>
      )} */}
      {dead && (
        <div className="overlay">
          <div className="overlay-card death-card">
            <h1>You died</h1>

            <div className="row">
              <button
                onClick={() => {
                  setDead(false);
                  setSpectating(true);
                }}
              >
                Spectate
              </button>

              <button
                className="danger"
                onClick={() => {
                  getSocket().emit("leaveRoom");
                  nav("/rooms");
                }}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
      {result && (
        <div className="overlay">
          <div className="overlay-card">
            <h1>
              {result.tie ? "Match Tied" : `${result.winner.username} Wins!`}
            </h1>
            {/* <p>Reason: {result.reason}</p> */}
            <div className="row">
              <button onClick={() => nav("/leaderboard")}>Leaderboard</button>
              <button className="secondary" onClick={() => nav("/rooms")}>
                Return to Room Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
