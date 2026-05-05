import { useEffect, useRef } from "react";

export default function GameCanvas({ gameState, socket, spectating = false }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const spectatingRef = useRef(false);
  const myId = useRef(null);
  const camera = useRef({ x: 0, y: 0, frozen: false });
  const keys = useRef({});
  const trails = useRef({});
  const particles = useRef([]);

  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    spectatingRef.current = spectating;
  }, [spectating]);

  useEffect(() => {
    if (!socket) return;
    const onConnected = ({ socketId }) => {
      myId.current = socketId;
    };
    socket.on("connected", onConnected);
    if (socket.id) myId.current = socket.id;
    return () => socket.off("connected", onConnected);
  }, [socket]);

  useEffect(() => {
    function down(e) {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "x",
          "z",
          " ",
        ].includes(e.key)
      )
        e.preventDefault();
      keys.current[e.key] = true;
      emitInput();
    }
    function up(e) {
      keys.current[e.key] = false;
      emitInput();
    }
    function emitInput() {
      if (spectatingRef.current) return;
      socket?.emit("playerInput", {
        up: !!keys.current.ArrowUp,
        down: !!keys.current.ArrowDown,
        left: !!keys.current.ArrowLeft,
        right: !!keys.current.ArrowRight,
        attack: !!keys.current.x,
        shield: !!keys.current.z,
        dash: !!keys.current[" "],
      });
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    const interval = setInterval(emitInput, 25);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      clearInterval(interval);
    };
  }, [socket]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    function resize() {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function loop() {
      draw(ctx, canvas);
      requestAnimationFrame(loop);
    }
    loop();
    return () => window.removeEventListener("resize", resize);
  }, []);

  function draw(ctx, canvas) {
    const state = stateRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!state) {
      ctx.fillStyle = "white";
      ctx.font = "22px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        "Waiting for match state...",
        canvas.width / 2,
        canvas.height / 2,
      );
      return;
    }

    const me = state.players?.[myId.current];
    if (spectatingRef.current) {
      const camSpeed = 9;

      if (keys.current.ArrowUp) camera.current.y -= camSpeed;
      if (keys.current.ArrowDown) camera.current.y += camSpeed;
      if (keys.current.ArrowLeft) camera.current.x -= camSpeed;
      if (keys.current.ArrowRight) camera.current.x += camSpeed;
    } else if (me && me.alive) {
      camera.current.x = me.x - canvas.width / 2;
      camera.current.y = me.y - canvas.height / 2;
    } else if (me && !camera.current.frozen) {
      camera.current.x =
        (me.deathX || me.x || camera.current.x) - canvas.width / 2;
      camera.current.y =
        (me.deathY || me.y || camera.current.y) - canvas.height / 2;
      camera.current.frozen = true;
    }
    camera.current.x = Math.max(
      0,
      Math.min(state.mapWidth - canvas.width, camera.current.x),
    );
    camera.current.y = Math.max(
      0,
      Math.min(state.mapHeight - canvas.height, camera.current.y),
    );

    ctx.save();
    ctx.translate(-camera.current.x, -camera.current.y);
    drawFloor(ctx, state);
    drawGrid(ctx, state);
    drawDecorations(ctx, state.decorations || []);
    drawObstacles(ctx, state.obstacles || []);
    drawWalls(ctx, state.walls || []);
    drawBoundary(ctx, state);

    for (const p of Object.values(state.players || {})) {
      if (!p.alive) continue;
      drawShield(ctx, p);
      drawPlayer(ctx, p);
      drawSword(ctx, p);
    }
    drawParticles(ctx);
    ctx.restore();

    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    const minutes = Math.floor((state.timeLeft || 0) / 60);
    const seconds = (state.timeLeft || 0) % 60;
    ctx.fillText(
      `${minutes}:${String(seconds).padStart(2, "0")}`,
      canvas.width / 2,
      30,
    );
    ctx.font = "14px Arial";
    ctx.fillText(
      "Move: Arrow Keys | Attack: X | Shield: Z | Dash: Space",
      canvas.width / 2,
      55,
    );
  }

  function drawFloor(ctx, s) {
    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, s.mapWidth, s.mapHeight);
  }
  function drawGrid(ctx, s) {
    const size = 80;
    ctx.strokeStyle = "#2f2f2f";
    ctx.lineWidth = 1;
    for (let x = 0; x < s.mapWidth; x += size) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, s.mapHeight);
      ctx.stroke();
    }
    for (let y = 0; y < s.mapHeight; y += size) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(s.mapWidth, y);
      ctx.stroke();
    }
  }
  function drawBoundary(ctx, s) {
    const t = 40;
    ctx.fillStyle = "#555";
    ctx.fillRect(0, 0, s.mapWidth, t);
    ctx.fillRect(0, s.mapHeight - t, s.mapWidth, t);
    ctx.fillRect(0, 0, t, s.mapHeight);
    ctx.fillRect(s.mapWidth - t, 0, t, s.mapHeight);
  }

  function drawWalls(ctx, walls) {
    walls.forEach((w) => {
      const brickW = 40,
        brickH = 20;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(w.x + 4, w.y + 4, w.width, w.height);
      ctx.fillStyle = "#7b3f00";
      ctx.fillRect(w.x, w.y, w.width, w.height);
      for (let y = w.y; y < w.y + w.height; y += brickH) {
        const offset = Math.floor((y - w.y) / brickH) % 2 ? brickW / 2 : 0;
        for (let x = w.x - offset; x < w.x + w.width; x += brickW) {
          ctx.fillStyle = "#8b4513";
          ctx.fillRect(x, y, brickW, brickH);
          ctx.strokeStyle = "#5a2d0c";
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, brickW, brickH);
        }
      }
      ctx.strokeStyle = "#4a1f08";
      ctx.lineWidth = 3;
      ctx.strokeRect(w.x, w.y, w.width, w.height);
    });
  }

  function drawObstacles(ctx, obstacles) {
    obstacles.forEach((o) => {
      if (o.type === "rock") {
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath();
        ctx.arc(o.x + 5, o.y + 5, o.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#8d8d8d";
        ctx.beginPath();
        ctx.moveTo(o.x - o.radius, o.y);
        ctx.lineTo(o.x - o.radius / 2, o.y - o.radius);
        ctx.lineTo(o.x + o.radius / 2, o.y - o.radius * 0.8);
        ctx.lineTo(o.x + o.radius, o.y);
        ctx.lineTo(o.x + o.radius / 3, o.y + o.radius);
        ctx.lineTo(o.x - o.radius / 2, o.y + o.radius * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#c9c9c9";
        ctx.beginPath();
        ctx.arc(o.x - 5, o.y - 5, o.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (o.type === "pillar") {
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath();
        ctx.arc(o.x + 4, o.y + 4, o.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#6e6e6e";
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#bdbdbd";
        ctx.beginPath();
        ctx.arc(o.x, o.y - 4, o.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#4a4a4a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(o.x - 6, o.y);
        ctx.lineTo(o.x + 4, o.y + 8);
        ctx.stroke();
      }
      if (o.type === "bush") {
        ctx.fillStyle = "#2ecc71";
        ctx.beginPath();
        ctx.arc(o.x - 8, o.y, o.radius * 0.6, 0, Math.PI * 2);
        ctx.arc(o.x + 8, o.y, o.radius * 0.6, 0, Math.PI * 2);
        ctx.arc(o.x, o.y - 6, o.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#27ae60";
        ctx.beginPath();
        ctx.arc(o.x, o.y + 4, o.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#58f79a";
        ctx.beginPath();
        ctx.arc(o.x - 4, o.y - 4, o.radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  function drawDecorations(ctx, decorations) {
    decorations.forEach((d) => {
      if (d.type === "stone") {
        ctx.fillStyle = "#555";
        ctx.beginPath();
        ctx.arc(d.x, d.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      if (d.type === "bush") {
        ctx.fillStyle = "#2e8b57";
        ctx.beginPath();
        ctx.arc(d.x, d.y, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      if (d.type === "crack") {
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(d.x - 6, d.y);
        ctx.lineTo(d.x + 6, d.y + 3);
        ctx.lineTo(d.x - 3, d.y + 6);
        ctx.stroke();
      }
      if (d.type === "torch") {
        ctx.fillStyle = "#8b5a2b";
        ctx.fillRect(d.x - 2, d.y - 8, 4, 12);
        ctx.beginPath();
        ctx.arc(d.x, d.y - 10, 4, 0, Math.PI * 2);
        ctx.fillStyle = "orange";
        ctx.fill();
      }
      if (d.type === "debris") {
        ctx.fillStyle = "#777";
        ctx.fillRect(d.x - 3, d.y - 3, 6, 6);
      }
    });
  }

  function drawSword(ctx, p) {
    const dist = p.radius + 20;
    const restTilt = Math.PI / 3;
    const angle = p.direction + restTilt - p.swordAngle;
    const x = p.x + Math.cos(angle) * dist;
    const y = p.y + Math.sin(angle) * dist;
    if (p.attacking) {
      trails.current[p.socketId] ||= [];
      trails.current[p.socketId].push({ x, y, angle });
      if (trails.current[p.socketId].length > 10)
        trails.current[p.socketId].shift();
    } else trails.current[p.socketId] = [];
    (trails.current[p.socketId] || []).forEach((t, i, arr) => {
      const alpha = i / arr.length;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.angle);
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-8, -10);
      ctx.lineTo(-8, 10);
      ctx.closePath();
      ctx.fillStyle = `rgba(220,220,220,${alpha * 0.6})`;
      ctx.fill();
      ctx.restore();
    });
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (p.attacking) {
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 8;
    }
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(-6, -4);
    ctx.lineTo(-6, 4);
    ctx.closePath();
    ctx.fillStyle = "#ecf0f1";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-4, 0);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(-8, -7, 4, 14);
    ctx.fillStyle = "#7f8c8d";
    ctx.fill();
    ctx.beginPath();
    ctx.rect(-14, -2, 6, 4);
    ctx.fillStyle = "#8e44ad";
    ctx.fill();
    ctx.restore();
  }

  function drawShield(ctx, p) {
    const dist = p.radius + 10;
    const restTilt = Math.PI / 3;
    const angle = p.direction - restTilt + (Math.PI - p.shieldAngle);
    const x = p.x + Math.cos(angle) * dist;
    const y = p.y + Math.sin(angle) * dist;
    ctx.save();
    if (p.shielding) {
      ctx.shadowColor = "#3498db";
      ctx.shadowBlur = 10;
    }
    ctx.beginPath();
    ctx.arc(x, y, 13, angle - Math.PI / 2, angle + Math.PI / 2);
    ctx.fillStyle = "#2980b9";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 13, angle - Math.PI / 2, angle + Math.PI / 2);
    ctx.strokeStyle = "#1f4e79";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ecf0f1";
    ctx.fill();
    ctx.restore();
  }

  function drawPlayer(ctx, p) {
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + p.radius + 6, 18, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fill();
    const spikes = 40;
    ctx.beginPath();
    for (let i = 0; i <= spikes; i++) {
      const angle = (i / spikes) * Math.PI * 2;
      const spike =
        p.radius +
        Math.sin(i * 3 + p.x * 0.01) * 3 +
        Math.sin(Date.now() * 0.02 + i) * 1;
      const px = p.x + Math.cos(angle) * spike;
      const py = p.y + Math.sin(angle) * spike;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const gradient = ctx.createRadialGradient(
      p.x - 5,
      p.y - 5,
      5,
      p.x,
      p.y,
      p.radius + 10,
    );
    gradient.addColorStop(0, p.flash ? "white" : p.color);
    gradient.addColorStop(1, "#222");
    ctx.fillStyle = gradient;
    ctx.fill();

    const eyeForward = p.radius * 0.3,
      eyeSpread = p.radius * 0.45,
      eyeRadius = p.radius * 0.45;
    const eye1x =
      p.x +
      Math.cos(p.direction) * eyeForward -
      Math.sin(p.direction) * eyeSpread;
    const eye1y =
      p.y +
      Math.sin(p.direction) * eyeForward +
      Math.cos(p.direction) * eyeSpread;
    const eye2x =
      p.x +
      Math.cos(p.direction) * eyeForward +
      Math.sin(p.direction) * eyeSpread;
    const eye2y =
      p.y +
      Math.sin(p.direction) * eyeForward -
      Math.cos(p.direction) * eyeSpread;
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(eye1x, eye1y, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eye2x, eye2y, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(eye1x, eye1y, eyeRadius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eye2x, eye2y, eyeRadius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    const mForward = p.radius * 0.9,
      mWidth = p.radius * 1.2,
      curl = p.radius;
    const mx = p.x + Math.cos(p.direction) * mForward,
      my = p.y + Math.sin(p.direction) * mForward;
    const leftX = mx - Math.sin(p.direction) * mWidth,
      leftY = my + Math.cos(p.direction) * mWidth;
    const rightX = mx + Math.sin(p.direction) * mWidth,
      rightY = my - Math.cos(p.direction) * mWidth;
    ctx.strokeStyle = "#2b1a0a";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.quadraticCurveTo(
      leftX,
      leftY,
      leftX - Math.cos(p.direction) * curl,
      leftY - Math.sin(p.direction) * curl,
    );
    ctx.moveTo(mx, my);
    ctx.quadraticCurveTo(
      rightX,
      rightY,
      rightX - Math.cos(p.direction) * curl,
      rightY - Math.sin(p.direction) * curl,
    );
    ctx.stroke();

    const barWidth = 50,
      barHeight = 6,
      barX = p.x - barWidth / 2,
      barY = p.y - p.radius - 20;
    ctx.fillStyle = "#550000";
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = "#00ff66";
    ctx.fillRect(barX, barY, barWidth * (p.health / 100), barHeight);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(p.username, p.x, barY - 6);
  }

  function drawParticles(ctx) {
    particles.current = particles.current.filter((p) => p.life-- > 0);
    particles.current.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = "orange";
      ctx.fill();
    });
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        background: "#222",
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  );
}
