import { Outlet, Navigate } from "react-router-dom";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function setAuth(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function getAuth() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  return { token, user };
}

export function requireToken() {
  return localStorage.getItem("token");
}

export function Protected({ children }) {
  return requireToken() ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <div className="app-bg">
      <div className="bg-gradient"></div>
      <div className="bg-arena-characters">
        <span className="bg-blob b1"></span>
        <span className="bg-blob b2"></span>
        <span className="bg-blob b3"></span>
        <span className="bg-blob b4"></span>
        <span className="bg-blob b5"></span>
        <span className="bg-blob b6"></span>
      </div>

      <div className="app-content">
        <Outlet />
      </div>
    </div>
  );
}
