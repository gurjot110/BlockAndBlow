import { io } from "socket.io-client";
import { API_URL } from "./App.jsx";

let socket;
export function getSocket() {
  const token = localStorage.getItem("token");
  if (!socket || socket.disconnected) {
    socket = io(API_URL, { auth: { token } });
  }
  return socket;
}
