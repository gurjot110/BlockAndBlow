# MERN Realtime Arena Game

This is a MERN-style realtime multiplayer arena game starter.

## Important fixes included

- `GameManager` is now the only source of truth for rooms and matches.
- Removed the broken `roomManager.js` dependency.
- Lobby updates are broadcast to every player through `roomUpdated`.
- `startMatch` uses the same room storage as `joinRoom`, so `Room not found` is fixed.
- Auth now creates a user if username does not exist, logs in existing users with the correct password, and returns `Incorrect password.` for wrong passwords.

## Server setup

```bash
cd server
npm install
copy .env.example .env
```

On macOS/Linux/Git Bash:

```bash
cp .env.example .env
```

Edit `server/.env`:

```env
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/arena-game?retryWrites=true&w=majority
JWT_SECRET=replace_with_a_long_secret
PORT=5000
CLIENT_URL=http://localhost:5173
```

Then run:

```bash
npm run dev
```

## Client setup

```bash
cd client
npm install
copy .env.example .env
npm run dev
```

On macOS/Linux/Git Bash:

```bash
cp .env.example .env
```

## MongoDB Atlas note

In the `users` collection indexes, keep only:

- `_id_`
- `username_1`

Drop any accidental unique index like `email_1`, otherwise account creation can fail.
