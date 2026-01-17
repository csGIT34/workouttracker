#!/bin/bash

set -e

echo "🚀 Deploying Workout Tracker to Kubernetes"

# Build Docker images
echo "📦 Building Docker images..."
docker build -t workout-backend:latest ./packages/backend
docker build -t workout-frontend:latest ./packages/frontend

# Optional: Push to registry
# docker tag workout-backend:latest <your-registry>/workout-backend:latest
# docker tag workout-frontend:latest <your-registry>/workout-frontend:latest
# docker push <your-registry>/workout-backend:latest
# docker push <your-registry>/workout-frontend:latest

# Apply Kubernetes configurations
echo "☸️  Applying Kubernetes configurations..."

# Create namespace and configs
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml

# Deploy database
echo "🗄️  Deploying PostgreSQL..."
kubectl apply -f k8s/database/

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n workout-tracker --timeout=120s

# Deploy backend
echo "🔧 Deploying backend..."
kubectl apply -f k8s/backend/

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
kubectl wait --for=condition=ready pod -l app=backend -n workout-tracker --timeout=120s

# Run database migrations
echo "🔄 Running database migrations..."
BACKEND_POD=$(kubectl get pods -n workout-tracker -l app=backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it $BACKEND_POD -n workout-tracker -- npx prisma migrate deploy
kubectl exec -it $BACKEND_POD -n workout-tracker -- npm run prisma:seed

# Deploy frontend
echo "🎨 Deploying frontend..."
kubectl apply -f k8s/frontend/

# Deploy ingress
echo "🌐 Deploying ingress..."
kubectl apply -f k8s/ingress/

# Show status
echo "✅ Deployment complete!"
echo ""
echo "📊 Current status:"
kubectl get pods -n workout-tracker
echo ""
kubectl get services -n workout-tracker
echo ""
echo "🌍 Access the application:"
kubectl get ingress -n workout-tracker
