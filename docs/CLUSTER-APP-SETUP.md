# Adding New Apps to the Cluster

This guide documents how to deploy and expose new applications on the k3s cluster with DNS-based routing.

## Architecture Overview

```
Browser → AdGuard DNS → Hyper-V Host (nginx) → k3s Cluster (traefik) → App
         (10.1.1.56)     (10.1.1.55:80)        (10.10.10.10-12)
```

| Component | Location | Purpose |
|-----------|----------|---------|
| AdGuard | 10.1.1.56 | DNS resolution (*.home → 10.1.1.55) |
| nginx | Hyper-V host (10.1.1.55) | Reverse proxy, routes by hostname |
| traefik | k3s cluster | Ingress controller |
| ArgoCD | http://argocd.home | GitOps deployment |

## Step 1: Create Kubernetes Manifests

Create a new directory for your app's k8s manifests:

```bash
mkdir -p k8s/myapp
```

### Deployment (k8s/myapp/deployment.yaml)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp  # or use existing namespace
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myregistry/myapp:latest
          ports:
            - containerPort: 8080  # Your app's port
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
  namespace: myapp
spec:
  selector:
    app: myapp
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080  # Your app's port
  type: ClusterIP
```

### Namespace (k8s/myapp/namespace.yaml) - if needed

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: myapp
```

### Ingress (k8s/myapp/ingress.yaml) - if using traefik ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  namespace: myapp
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web
spec:
  ingressClassName: traefik
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp-service
                port:
                  number: 80
```

## Step 2: Deploy via ArgoCD

### Option A: Add to existing ArgoCD Application

If your app is part of this repo, ArgoCD will auto-sync it.

### Option B: Create new ArgoCD Application

```bash
argocd app create myapp \
  --repo https://github.com/YOUR_USERNAME/YOUR_REPO.git \
  --path k8s/myapp \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace myapp \
  --sync-policy automated \
  --auto-prune \
  --self-heal \
  --server argocd.home:80 \
  --plaintext
```

Or create via manifest (k8s/myapp/argocd-app.yaml):

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/YOUR_USERNAME/YOUR_REPO.git
    targetRevision: HEAD
    path: k8s/myapp
  destination:
    server: https://kubernetes.default.svc
    namespace: myapp
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Step 3: Configure nginx Reverse Proxy

SSH to the Hyper-V host and edit nginx config:

```powershell
notepad C:\nginx\conf\nginx.conf
```

Add a new server block:

```nginx
    # MyApp
    server {
        listen       80;
        server_name  myapp.home;

        location / {
            proxy_pass http://10.10.10.10:80;  # traefik ingress
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # WebSocket support (if needed)
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
```

Reload nginx:

```powershell
C:\nginx\nginx.exe -s reload
```

## Step 4: Configure DNS in AdGuard

1. Open AdGuard admin panel
2. Go to **Filters** → **DNS rewrites**
3. Add new entry:
   - Domain: `myapp.home`
   - Answer: `10.1.1.55`

## Step 5: Test

```bash
# Test DNS resolution
dig myapp.home @10.1.1.56

# Test HTTP
curl http://myapp.home/

# Open in browser
# http://myapp.home
```

## Quick Reference

### Cluster Access

| Resource | URL/Command |
|----------|-------------|
| ArgoCD UI | http://argocd.home (admin/admin123) |
| kubectl | Configured locally |
| Cluster nodes | 10.10.10.10 (master), 10.10.10.11-12 (workers) |

### nginx Commands (Hyper-V Host)

```powershell
# Service management
Get-Service nginx
Start-Service nginx
Stop-Service nginx
Restart-Service nginx

# Config management
notepad C:\nginx\conf\nginx.conf   # Edit config
C:\nginx\nginx.exe -t              # Test config
C:\nginx\nginx.exe -s reload       # Reload config
```

### ArgoCD CLI

```bash
# Login
argocd login argocd.home:80 --plaintext --username admin

# List apps
argocd app list --server argocd.home:80 --plaintext

# Sync app
argocd app sync myapp --server argocd.home:80 --plaintext

# Get app status
argocd app get myapp --server argocd.home:80 --plaintext
```

### Useful kubectl Commands

```bash
# Check pods
kubectl get pods -n myapp

# Check logs
kubectl logs -n myapp -l app=myapp

# Check services
kubectl get svc -n myapp

# Check ingress
kubectl get ingress -n myapp

# Describe resources
kubectl describe pod -n myapp <pod-name>
```

## Troubleshooting

### App not loading

1. Check pods are running: `kubectl get pods -n myapp`
2. Check logs: `kubectl logs -n myapp -l app=myapp`
3. Test service internally:
   ```bash
   kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- curl http://myapp-service.myapp.svc/
   ```

### 502 Bad Gateway from nginx

1. Check if traefik can reach the service
2. Verify ingress is configured correctly
3. Check nginx config: `C:\nginx\nginx.exe -t`

### DNS not resolving

1. Verify AdGuard entry exists
2. Check client is using AdGuard DNS: `dig myapp.home @10.1.1.56`
3. Flush DNS cache on client

### ArgoCD sync issues

1. Check ArgoCD UI for error messages
2. Verify repo is accessible: `argocd repo list --server argocd.home:80 --plaintext`
3. Check app status: `argocd app get myapp --server argocd.home:80 --plaintext`
