# Quick Start Guide

Get the Workout Tracker app running in 5 minutes!

## Local Development Setup

### 1. Start the Database

```bash
docker-compose up -d
```

This starts PostgreSQL on port 5432.

### 2. Install Dependencies

```bash
npm install
```

This installs all dependencies for backend, frontend, and shared packages.

### 3. Set Up the Database

```bash
cd packages/backend
cp .env.example .env
npx prisma migrate dev
npm run prisma:seed
```

This:
- Creates the `.env` file with default settings
- Runs database migrations to create tables
- Seeds the database with 40+ exercises

### 4. Start the Backend

```bash
npm run dev:backend
```

Backend runs at http://localhost:3000

### 5. Start the Frontend (in a new terminal)

```bash
npm run dev:frontend
```

Frontend runs at http://localhost:5173

### 6. Create Your Account

1. Open http://localhost:5173
2. Click "Register"
3. Fill in your details
4. Start tracking workouts!

## First Workout

1. On the dashboard, enter a workout name (e.g., "Push Day")
2. Click "Start Workout"
3. Click "+ Add Exercise"
4. Search and select an exercise (e.g., "Barbell Bench Press")
5. Set target sets (e.g., 3) and reps (e.g., 10)
6. Click "Add Exercise"
7. Log your sets:
   - Enter reps completed
   - Enter weight used
   - (Optional) Enter RPE (1-10)
   - Click "Log Set"
8. Use the rest timer between sets
9. Mark exercises complete as you finish them
10. Click "Complete Workout" when done

## Using the Stopwatch

- **Preset timers**: Click 30s, 2min, or 3min buttons
- **Manual control**: Use Start/Pause/Reset
- The timer auto-starts after logging a set (30 seconds)
- You'll hear a beep when the timer completes

## Troubleshooting

### Database Connection Error

Make sure PostgreSQL is running:
```bash
docker-compose ps
```

If not running:
```bash
docker-compose up -d
```

### Port Already in Use

Backend (3000) or Frontend (5173) port conflict:
- Backend: Change `PORT` in `packages/backend/.env`
- Frontend: Change `server.port` in `packages/frontend/vite.config.ts`

### Can't Log In

1. Check backend is running: http://localhost:3000/health
2. Check browser console for errors
3. Ensure `.env` file exists in `packages/backend`

## Next Steps

- **View History**: Click "History" to see past workouts
- **Progression**: Complete the same exercise in multiple workouts to see progression recommendations
- **Kubernetes**: See README.md for deployment instructions

## Default Configuration

- Backend: http://localhost:3000
- Frontend: http://localhost:5173
- Database: localhost:5432
- JWT tokens expire after 15 minutes
- Refresh tokens valid for 7 days

## Development Commands

```bash
# Backend
npm run dev:backend          # Start backend dev server
cd packages/backend && npx prisma studio  # Open Prisma Studio

# Frontend
npm run dev:frontend         # Start frontend dev server

# Build
npm run build:all            # Build all packages
npm run docker:build         # Build Docker images
```

## API Documentation

Backend API runs at http://localhost:3000

Key endpoints:
- `POST /api/v1/auth/register` - Create account
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/exercises` - List exercises
- `POST /api/v1/workouts` - Create workout
- `GET /api/v1/workouts` - List workouts

See README.md for full API documentation.
