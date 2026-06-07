# Filmera

Filmera is an Expo React Native app for deciding what to watch together. Users sign in, create or join a room, filter movie suggestions, swipe through titles, and get a match when everyone likes the same movie.

## Features

- Email/password sign up, login, logout, and persisted sessions with AsyncStorage
- Create a watch room and share a generated room code
- Join an existing room by code
- Filter movie discovery by genre, release year, and sort order
- Swipe movie cards left or right with haptic feedback
- Receive room participants and matches in real time over WebSocket
- Animated match celebration screen
- TMDB movie discovery when `EXPO_PUBLIC_TMDB_TOKEN` is available, with backend movie fallback
- Dark visual theme using Expo Router, React Native, Poppins, Inter, gradients, and custom brand assets

## Tech Stack

- Expo SDK 54
- React 19 and React Native 0.81
- Expo Router 6
- TypeScript
- pnpm workspaces
- TanStack React Query
- Expo Haptics, Fonts, Linear Gradient, Splash Screen, and Status Bar
- React Native Gesture Handler, Reanimated, Safe Area Context, Screens, and Keyboard Controller

## Project Structure

```text
.
├── package.json                 # Workspace scripts
├── pnpm-workspace.yaml          # pnpm workspace and dependency catalog
├── tsconfig.base.json           # Shared TypeScript settings
└── artifacts/
    ├── backend/                 # Express REST API and WebSocket server
    │   └── src/server.js
    └── mobile/                  # Expo frontend
        ├── app/                 # Expo Router routes
        │   ├── (tabs)/index.tsx # Home, auth, create/join room UI
        │   ├── room.tsx         # Room setup, filters, swiping flow
        │   └── match.tsx        # Match celebration screen
        ├── assets/images/       # App icon and Filmera logo
        ├── components/          # Shared UI and error handling
        ├── context/             # Auth provider
        ├── hooks/               # Theme color hook
        ├── services/api.ts      # Backend and TMDB API layer
        ├── scripts/build.js     # Static Expo build helper
        └── server/serve.js      # Static build server
```

## Prerequisites

- Node.js 24, matching the Replit module configuration
- pnpm
- Expo Go or a simulator/device for native testing
- MongoDB for persistent production data
- Optional: a TMDB API read access token for richer movie discovery

## Environment Variables

Create environment variables in your shell, Replit user env, or a local env setup before running the app.

```bash
EXPO_PUBLIC_TMDB_TOKEN=your_tmdb_read_access_token
EXPO_PUBLIC_API_URL=https://filmera-backend.onrender.com
EXPO_PUBLIC_WS_URL=wss://filmera-backend.onrender.com
```

`EXPO_PUBLIC_TMDB_TOKEN` is optional. When it is missing, Filmera falls back to the backend `/movies` endpoint.

`EXPO_PUBLIC_API_URL` is optional for native builds and defaults to `https://filmera-backend.onrender.com`. Web preview can use the local `/api/filmera` proxy when no explicit domain is set.

The backend reads:

```bash
PORT=3000
JWT_SECRET=replace-with-a-long-random-secret
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/filmera
ALLOWED_ORIGINS=*
```

## Install

```bash
pnpm install
```

## Development

From the workspace root:

```bash
pnpm --filter @workspace/mobile run dev
pnpm run dev:backend
```

The `dev` script is tailored for Replit and expects variables such as `PORT`, `REPLIT_DEV_DOMAIN`, `REPLIT_EXPO_DEV_DOMAIN`, and `REPL_ID`.

For a more typical local Expo workflow, you can run from the mobile package:

```bash
cd artifacts/mobile
pnpm exec expo start
```

Then open the app in Expo Go, an iOS simulator, an Android emulator, or the web preview.

## Scripts

From the workspace root:

```bash
pnpm run typecheck
pnpm run build
```

From `artifacts/mobile`:

```bash
pnpm run dev        # Start Expo using the Replit-oriented dev command
pnpm run typecheck  # Run TypeScript with no emitted files
pnpm run build      # Generate a static Expo build
pnpm run serve      # Serve static-build/ with the Node server
```

## API Expectations

The mobile app talks to a Filmera backend through `artifacts/mobile/services/api.ts`. The expected routes include:

- `POST /signup`
- `POST /signin`
- `GET /users/me`
- `GET /movies`
- `POST /rooms`
- `POST /rooms/:roomId/join`
- `GET /rooms/:roomId`
- `POST /swipes`
- `GET /health`
- `WS /rooms/:roomCode/ws?token=<jwt>`

Authenticated requests send a bearer token after login. Room creation stores normalized movie data, and swipes return a matched movie when both participants like the same title.

## Render Deployment

The repository includes `render.yaml`. In Render, create a new Blueprint and select this repository. Configure `MONGODB_URI` when prompted. Render generates `JWT_SECRET`.

For a manually created Web Service, use:

```text
Root Directory: leave blank
Build Command: corepack enable && pnpm install --frozen-lockfile
Start Command: pnpm --filter @workspace/backend start
Health Check Path: /health
```

Add these environment variables:

```text
NODE_VERSION=24
JWT_SECRET=<long random value>
MONGODB_URI=<MongoDB Atlas connection string>
ALLOWED_ORIGINS=*
```

After deployment, configure the mobile build with the backend URL:

```text
EXPO_PUBLIC_API_URL=https://YOUR-SERVICE.onrender.com
EXPO_PUBLIC_WS_URL=wss://YOUR-SERVICE.onrender.com
```

## Build and Serve

The custom build script starts Metro, exports iOS and Android static assets into `artifacts/mobile/static-build`, and prepares manifests for the static server.

```bash
pnpm --filter @workspace/mobile run build
pnpm --filter @workspace/mobile run serve
```

The static server serves a landing page at `/`, platform manifests for Expo clients, and generated static assets from `static-build/`.

## Notes

- The app uses `@/*` path aliases scoped to `artifacts/mobile`.
- The Expo app name is `Filmera`, with dark mode enabled in `app.json`.
- The UI is portrait-oriented and does not currently support tablets.
- Keep API tokens out of committed documentation and source files. Prefer environment variables or Replit secrets for real credentials.
