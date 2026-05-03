import User from "../models/User.js";

const TICK_RATE = 60;
const MAP_WIDTH = 2000;
const MAP_HEIGHT = 2000;
const MATCH_SECONDS = 300;

function randColor() {
  return `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;
}

function generateWalls() {
  const walls = [];
  const cellSize = 250;
  const cols = Math.floor(MAP_WIDTH / cellSize);
  const rows = Math.floor(MAP_HEIGHT / cellSize);
  for (let x = 1; x < cols - 1; x++) {
    for (let y = 1; y < rows - 1; y++) {
      if (Math.random() < 0.35) {
        const vertical = Math.random() > 0.5;
        walls.push(
          vertical
            ? { x: x * cellSize, y: y * cellSize - 100, width: 40, height: 200 }
            : {
                x: x * cellSize - 100,
                y: y * cellSize,
                width: 200,
                height: 40,
              },
        );
      }
    }
  }
  return walls;
}

function generateDecorations() {
  const decorations = [];
  const types = ["crack", "stone", "bush", "torch", "debris"];
  for (let i = 0; i < 60; i++) {
    decorations.push({
      type: types[Math.floor(Math.random() * types.length)],
      x: Math.random() * MAP_WIDTH,
      y: Math.random() * MAP_HEIGHT,
    });
  }
  return decorations;
}

function generateObstacles() {
  return [
    { type: "rock", x: 250, y: 400, radius: 45 },
    { type: "pillar", x: 350, y: 650, radius: 30 },
    { type: "bush", x: 200, y: 900, radius: 40 },
    { type: "pillar", x: 1000, y: 600, radius: 32 },
    { type: "rock", x: 900, y: 900, radius: 45 },
    { type: "bush", x: 1100, y: 850, radius: 40 },
    { type: "rock", x: 1700, y: 500, radius: 45 },
    { type: "pillar", x: 1600, y: 900, radius: 30 },
    { type: "bush", x: 1800, y: 750, radius: 40 },
    { type: "pillar", x: 1700, y: 700, radius: 30 },
    { type: "pillar", x: 1750, y: 1050, radius: 30 },
    { type: "pillar", x: 1600, y: 1200, radius: 30 },
    { type: "bush", x: 800, y: 200, radius: 40 },
    { type: "rock", x: 1200, y: 250, radius: 45 },
    { type: "pillar", x: 700, y: 1700, radius: 32 },
    { type: "rock", x: 1300, y: 1650, radius: 45 },
    { type: "bush", x: 1000, y: 1800, radius: 40 },
  ];
}

function findSafeSpawn(walls, obstacles) {
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * MAP_WIDTH;
    const y = Math.random() * MAP_HEIGHT;
    let safe = true;
    for (const w of walls) {
      if (
        x > w.x - 60 &&
        x < w.x + w.width + 60 &&
        y > w.y - 60 &&
        y < w.y + w.height + 60
      )
        safe = false;
    }
    for (const o of obstacles) {
      const dist = Math.hypot(x - o.x, y - o.y);
      if (dist < o.radius + 60) safe = false;
    }
    if (safe) return { x, y };
  }
  return { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
}

function publicRoom(room) {
  return {
    roomId: room.roomId,
    hostUserId: room.hostUserId,
    status: room.status,
    players: [...room.players.values()].map((p) => ({
      userId: p.userId,
      username: p.username,
      socketId: p.socketId,
    })),
  };
}

export class GameManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    setInterval(() => this.tickAll(), 1000 / TICK_RATE);
  }

  createOrJoin(socket, roomId) {
    roomId = String(roomId || "")
      .trim()
      .slice(0, 20);
    if (!roomId) throw new Error("Room ID is required.");

    let room = this.rooms.get(roomId);

    if (!room) {
      room = {
        roomId,
        hostUserId: socket.user.userId,
        status: "waiting",
        players: new Map(),
        game: null,
      };

      this.rooms.set(roomId, room);
    }

    if (room.status !== "waiting") {
      throw new Error("Match already started. You cannot join now.");
    }

    // If same user already exists, replace old socket with new socket
    for (const [oldSocketId, p] of room.players.entries()) {
      if (p.userId === socket.user.userId) {
        room.players.delete(oldSocketId);
      }
    }

    if (room.players.size >= 10) {
      throw new Error("Room is full. Max 10 players.");
    }

    socket.join(roomId);
    socket.data.roomId = roomId;

    room.players.set(socket.id, {
      socketId: socket.id,
      userId: socket.user.userId,
      username: socket.user.username,
    });

    const updatedRoom = publicRoom(room);

    // Send to Socket.IO room
    this.io.to(roomId).emit("roomUpdated", updatedRoom);

    // Also send directly to every player socket as backup
    for (const p of room.players.values()) {
      this.io.to(p.socketId).emit("roomUpdated", updatedRoom);
    }

    return updatedRoom;
  }

  leave(socket) {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.status === "playing" && room.game?.players?.[socket.id]) {
      this.killPlayer(room, socket.id, true);
    } else {
      room.players.delete(socket.id);
      socket.leave(roomId);
      if (room.players.size === 0) this.rooms.delete(roomId);
      else {
        if (room.hostUserId === socket.user.userId)
          room.hostUserId = room.players.values().next().value.userId;
        this.emitLobby(room);
      }
    }
  }

  startMatch(socket) {
    const roomId = socket.data.roomId;
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Room not found.");
    if (room.hostUserId !== socket.user.userId)
      throw new Error("Only host can start.");
    if (room.players.size < 2) throw new Error("Need at least 2 players.");
    if (room.players.size > 10) throw new Error("Max 10 players allowed.");
    if (room.status !== "waiting") throw new Error("Match already started.");

    const walls = generateWalls();
    const obstacles = generateObstacles();
    const decorations = generateDecorations();
    const players = {};
    for (const p of room.players.values()) {
      const spawn = findSafeSpawn(walls, obstacles);
      players[p.socketId] = {
        socketId: p.socketId,
        userId: p.userId,
        username: p.username,
        x: spawn.x,
        y: spawn.y,
        radius: 20,
        speed: 7, //if not , 4
        direction: 0,
        color: randColor(),
        health: 100,
        alive: true,
        flash: 0,
        spawnProtection: 180,
        stuckTimer: 0,
        swordAngle: 0,
        shieldAngle: Math.PI,
        attacking: false,
        shielding: false,
        hitRegistered: false,
        kills: 0,
        input: {},
      };
    }

    room.status = "playing";
    room.game = {
      mapWidth: MAP_WIDTH,
      mapHeight: MAP_HEIGHT,
      startedAt: Date.now(),
      endsAt: Date.now() + MATCH_SECONDS * 1000,
      walls,
      obstacles,
      decorations,
      players,
      ended: false,
      result: null,
    };

    this.io.to(room.roomId).emit("matchStarted", this.publicGame(room));
  }

  setInput(socket, input) {
    const room = this.rooms.get(socket.data.roomId);
    const p = room?.game?.players?.[socket.id];
    if (!p || !p.alive) return;
    p.input = {
      up: !!input.up,
      down: !!input.down,
      left: !!input.left,
      right: !!input.right,
      attack: !!input.attack,
      shield: !!input.shield,
    };
  }

  tickAll() {
    for (const room of this.rooms.values()) {
      if (room.status === "playing" && room.game && !room.game.ended)
        this.tickRoom(room);
    }
  }

  tickRoom(room) {
    const game = room.game;
    const now = Date.now();
    for (const p of Object.values(game.players)) this.tickPlayer(p, game);
    this.checkHits(game);

    const alive = Object.values(game.players).filter((p) => p.alive);
    if (alive.length <= 1 || now >= game.endsAt) {
      this.finishMatch(room, now >= game.endsAt ? "timer" : "last_alive");
      return;
    }
    this.io.to(room.roomId).emit("gameState", this.publicGame(room));
  }

  tickPlayer(p, game) {
    if (!p.alive) return;
    let dx = 0,
      dy = 0;
    if (p.input.up) dy -= 1;
    if (p.input.down) dy += 1;
    if (p.input.left) dx -= 1;
    if (p.input.right) dx += 1;
    if (dx && dy) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }
    if (p.stuckTimer > 0) p.stuckTimer--;
    if (p.spawnProtection > 0) p.spawnProtection--;

    const oldX = p.x,
      oldY = p.y;
    if (p.stuckTimer <= 0) {
      p.x += dx * p.speed;
      p.y += dy * p.speed;
    }
    if (dx !== 0 || dy !== 0) p.direction = Math.atan2(dy, dx);

    p.attacking = p.input.attack && !p.input.shield;
    p.shielding = p.input.shield && !p.input.attack;

    if (p.attacking) {
      if (p.swordAngle < (2 * Math.PI) / 3) p.swordAngle += 0.28;
    } else {
      if (p.swordAngle > 0) p.swordAngle -= 0.28;
      else p.hitRegistered = false;
    }
    if (p.shielding) {
      if (p.shieldAngle > Math.PI / 2) p.shieldAngle -= 0.16;
    } else if (p.shieldAngle < Math.PI) p.shieldAngle += 0.16;

    p.x = Math.max(p.radius, Math.min(MAP_WIDTH - p.radius, p.x));
    p.y = Math.max(p.radius, Math.min(MAP_HEIGHT - p.radius, p.y));

    for (const o of game.obstacles) {
      const dist = Math.hypot(p.x - o.x, p.y - o.y);
      if (
        (o.type === "pillar" || o.type === "rock") &&
        dist < p.radius + o.radius
      ) {
        const angle = Math.atan2(p.y - o.y, p.x - o.x);
        p.x = o.x + Math.cos(angle) * (p.radius + o.radius);
        p.y = o.y + Math.sin(angle) * (p.radius + o.radius);
      }
      if (o.type === "bush" && dist < p.radius + o.radius && p.stuckTimer <= 0)
        p.stuckTimer = 120;
    }

    for (const w of game.walls) {
      if (
        p.x + p.radius > w.x &&
        p.x - p.radius < w.x + w.width &&
        p.y + p.radius > w.y &&
        p.y - p.radius < w.y + w.height
      ) {
        p.x = oldX;
        p.y = oldY;
        break;
      }
    }

    if (p.flash > 0) p.flash--;
  }

  swordTip(p) {
    const restTilt = Math.PI / 3;
    const dist = p.radius + 20;
    const angle = p.direction + restTilt - p.swordAngle;
    return {
      x: p.x + Math.cos(angle) * dist,
      y: p.y + Math.sin(angle) * dist,
      angle,
    };
  }

  checkHits(game) {
    const players = Object.values(game.players).filter((p) => p.alive);
    for (const attacker of players) {
      if (!attacker.attacking || attacker.hitRegistered) continue;
      const tip = this.swordTip(attacker);
      for (const target of players) {
        if (target.socketId === attacker.socketId || target.spawnProtection > 0)
          continue;
        const distance = Math.hypot(tip.x - target.x, tip.y - target.y);
        if (distance < target.radius + 10) {
          const attackerAngle = Math.atan2(
            attacker.y - target.y,
            attacker.x - target.x,
          );
          const shieldDir =
            target.direction - Math.PI / 3 + (Math.PI - target.shieldAngle);
          let diff = Math.abs(attackerAngle - shieldDir);
          if (diff > Math.PI) diff = 2 * Math.PI - diff;
          const blocked = target.shielding && diff < Math.PI / 3;
          if (!blocked) {
            target.health -= 10;
            target.flash = 6;
            target.x += Math.cos(attacker.direction) * 20;
            target.y += Math.sin(attacker.direction) * 20;
            if (target.health <= 0) {
              attacker.kills += 1;
              this.killPlayerByState(game, target.socketId);
            }
          }
          attacker.hitRegistered = true;
          break;
        }
      }
    }
  }

  killPlayer(room, socketId) {
    this.killPlayerByState(room.game, socketId);
    this.io.to(socketId).emit("youDied");
  }

  killPlayerByState(game, socketId) {
    const p = game.players[socketId];
    if (!p || !p.alive) return;
    p.alive = false;
    p.health = 0;
    p.deathX = p.x;
    p.deathY = p.y;
  }

  async finishMatch(room, reason) {
    if (room.game.ended) return;
    const game = room.game;
    game.ended = true;
    const players = Object.values(game.players);
    const alive = players.filter((p) => p.alive);
    let winners = [];

    if (reason === "last_alive") winners = alive;
    else {
      const maxHealth = Math.max(...players.map((p) => p.health));
      winners = players.filter((p) => p.health === maxHealth && maxHealth > 0);
      if (winners.length > 1) winners = [];
    }

    await User.updateMany(
      { _id: { $in: players.map((p) => p.userId) } },
      { $inc: { matchesPlayed: 1 } },
    );
    if (winners.length === 1)
      await User.updateOne(
        { _id: winners[0].userId },
        { $inc: { matchesWon: 1 } },
      );

    game.result = {
      reason,
      tie: winners.length !== 1,
      winner:
        winners.length === 1
          ? { username: winners[0].username, userId: winners[0].userId }
          : null,
      players: players.map((p) => ({
        username: p.username,
        health: p.health,
        kills: p.kills,
        alive: p.alive,
      })),
    };

    this.io.to(room.roomId).emit("matchEnded", game.result);
    setTimeout(() => this.rooms.delete(room.roomId), 5000);
  }

  publicGame(room) {
    const game = room.game;
    return {
      roomId: room.roomId,
      mapWidth: game.mapWidth,
      mapHeight: game.mapHeight,
      zoom: 1.4,
      timeLeft: Math.max(0, Math.ceil((game.endsAt - Date.now()) / 1000)),
      walls: game.walls,
      obstacles: game.obstacles,
      decorations: game.decorations,
      players: game.players,
    };
  }

  emitLobby(room) {
    const updatedRoom = publicRoom(room);

    this.io.to(room.roomId).emit("roomUpdated", updatedRoom);

    for (const p of room.players.values()) {
      this.io.to(p.socketId).emit("roomUpdated", updatedRoom);
    }
  }
}
