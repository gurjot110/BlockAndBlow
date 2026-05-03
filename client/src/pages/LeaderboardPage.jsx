import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL, Protected } from "../App.jsx";

export default function LeaderboardPage() {
  return (
    <Protected>
      <LeaderboardInner />
    </Protected>
  );
}

function LeaderboardInner() {
  const [rows, setRows] = useState([]);
  const nav = useNavigate();
  useEffect(() => {
    fetch(`${API_URL}/api/leaderboard`)
      .then((r) => r.json())
      .then(setRows);
  }, []);
  return (
    <main className="leaderboard-container">
      <h1 className="leaderboard-title">Leaderboard</h1>
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Username</th>
            <th>Won</th>
            <th>Played</th>
            <th>Win Ratio</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.username}>
              <td>{i + 1}</td>
              <td>{r.username}</td>
              <td>{r.matchesWon}</td>
              <td>{r.matchesPlayed}</td>
              <td>{(r.winRatio * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => nav("/rooms")}>Return to Room Page</button>
    </main>
  );
}
