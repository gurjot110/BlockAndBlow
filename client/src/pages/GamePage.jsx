import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Protected } from "../App.jsx";
import { getSocket } from "../socket.js";
import GameCanvas from "../components/GameCanvas.jsx";

export default function GamePage() { return <Protected><GameInner /></Protected>; }

function GameInner() {
  const { roomId } = useParams();
  const nav = useNavigate();
  const [state, setState] = useState(null);
  const [result, setResult] = useState(null);
  const [dead, setDead] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    socket.on("gameState", setState);
    socket.on("matchStarted", setState);
    socket.on("youDied", () => { setDead(true); setTimeout(() => setDead(false), 3000); });
    socket.on("matchEnded", setResult);
    socket.emit("joinRoom", { roomId }, () => {});
    return () => {
      socket.off("gameState", setState);
      socket.off("matchStarted", setState);
      socket.off("youDied");
      socket.off("matchEnded");
    };
  }, [roomId]);

  return <div className="game-shell">
    <GameCanvas gameState={state} socket={getSocket()} />
    {dead && <div className="overlay"><div className="overlay-card"><h1>You died</h1></div></div>}
    {result && <div className="overlay"><div className="overlay-card">
      <h1>{result.tie ? "Match Tied" : `${result.winner.username} Wins!`}</h1>
      <p>Reason: {result.reason}</p>
      <div className="row">
        <button onClick={() => nav("/leaderboard")}>Leaderboard</button>
        <button className="secondary" onClick={() => nav("/rooms")}>Return to Room Page</button>
      </div>
    </div></div>}
  </div>;
}
