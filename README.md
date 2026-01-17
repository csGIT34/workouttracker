# Workout Tracker

A full-stack workout tracking application with React frontend, Node.js/Fastify backend, PostgreSQL database, and Kubernetes deployment support.

## Features

- **User Authentication**: JWT-based authentication with refresh tokens
- **Workout Tracking**: Log exercises, sets, reps, and weight
- **Built-in Stopwatch**: Configurable rest timers (30s, 2min, 3min)
- **Progression Tracking**: Intelligent recommendations for weight and rep increases
- **Multi-user Support**: Each user has their own workout data
- **Exercise Library**: Pre-seeded with 40+ common exercises
- **Kubernetes Ready**: Full deployment configuration included

## Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Fastify + Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: JWT with refresh tokens
- **Deployment**: Docker + Kubernetes

## Project Structure

```
workouttracker/
├── packages/
│   ├── frontend/          # React app
│   ├── backend/           # Node.js API
│   └── shared/            # Shared TypeScript types
├── k8s/                   # Kubernetes configs
└── docker-compose.yml     # Local development
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- PostgreSQL (or use docker-compose)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd workouttracker
```

2. Install dependencies:
```bash
npm install
```

3. Start PostgreSQL:
```bash
docker-compose up -d
```

4. Set up the database:
```bash
cd packages/backend
cp .env.example .env
npx prisma migrate dev
npm run prisma:seed
```

5. Start the backend:
```bash
npm run dev:backend
```

6. In a new terminal, start the frontend:
```bash
npm run dev:frontend
```

7. Open http://localhost:5173 in your browser

### Default Credentials

The app requires you to register a new account on first use.

## Development

### Backend Development

```bash
cd packages/backend
npm run dev          # Start dev server
npm run build        # Build for production
npx prisma studio    # Open Prisma Studio
npm run prisma:seed  # Seed exercises
```

### Frontend Development

```bash
cd packages/frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

## Docker Build

Build Docker images:

```bash
npm run docker:build
```

Or build individually:

```bash
docker build -t workout-backend:latest ./packages/backend
docker build -t workout-frontend:latest ./packages/frontend
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (minikube, kind, or production cluster)
- kubectl configured
- nginx ingress controller installed

### Deploy to Kubernetes

1. Create namespace and secrets:
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml
```

2. Deploy database:
```bash
kubectl apply -f k8s/database/
```

3. Deploy backend:
```bash
kubectl apply -f k8s/backend/
```

4. Deploy frontend:
```bash
kubectl apply -f k8s/frontend/
```

5. Deploy ingress:
```bash
kubectl apply -f k8s/ingress/
```

6. Check status:
```bash
kubectl get pods -n workout-tracker
kubectl get services -n workout-tracker
```

### Run Database Migrations

```bash
kubectl exec -it <backend-pod-name> -n workout-tracker -- npx prisma migrate deploy
kubectl exec -it <backend-pod-name> -n workout-tracker -- npm run prisma:seed
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - Logout

### Workouts
- `GET /api/v1/workouts` - List workouts
- `GET /api/v1/workouts/:id` - Get workout
- `POST /api/v1/workouts` - Create workout
- `POST /api/v1/workouts/:workoutId/exercises` - Add exercise
- `PATCH /api/v1/workouts/:id/complete` - Complete workout
- `DELETE /api/v1/workouts/:id` - Delete workout

### Sets
- `POST /api/v1/workouts/exercises/:exerciseId/sets` - Log set
- `PUT /api/v1/workouts/sets/:setId` - Update set
- `PATCH /api/v1/workouts/sets/:setId/complete` - Complete set

### Exercises
- `GET /api/v1/exercises` - List exercises
- `GET /api/v1/exercises/:id` - Get exercise

### Progression
- `GET /api/v1/progression/exercises/:exerciseId` - Get progression
- `GET /api/v1/progression/recommendations` - Get recommendations

## Environment Variables

### Backend (.env)

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/workouttracker"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"
```

## Features in Detail

### Stopwatch
- Preset timers: 30s (between sets), 2min, 3min (between exercises)
- Auto-start after completing a set
- Visual progress bar
- Audio alert when timer completes
- Persists to localStorage

### Progression Tracking
- Analyzes last 3 workouts for each exercise
- Recommendations:
  - **Increase Weight**: All sets completed with target reps
  - **More Reps**: 80%+ of sets completed
  - **Maintain**: Less than 80% completion

### Multi-user Support
- Each user has isolated workout data
- Secure JWT authentication
- Password hashing with bcrypt (cost factor 12)
- HttpOnly cookies for refresh tokens

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.
