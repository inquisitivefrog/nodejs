# GitHub Actions Workflows

This directory contains CI/CD workflows for the mobile-app-server project.

## Workflows

### 1. CI Pipeline (`ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Jobs:**
1. **Test**: Runs comprehensive test suite
   - Unit tests
   - Integration tests
   - Test coverage reporting
   - Uploads coverage to Codecov

2. **Build**: Builds Docker images (on push only)
   - Server image
   - Admin dashboard image
   - Nginx load balancer image
   - Pushes to GitHub Container Registry

3. **Security Scan**: Vulnerability scanning
   - Filesystem scan with Trivy
   - Docker image scan (if built)
   - Uploads results to GitHub Security tab

4. **Docker Compose Test**: Integration test (main branch only)
   - Builds and starts all services
   - Verifies health endpoints
   - Collects logs on failure

### 2. CD Pipeline (`cd.yml`)

**Triggers:**
- Push to `main` branch
- Version tags (v*.*.*)
- Manual workflow dispatch

**Jobs:**
1. **Deploy**: Deployment automation
   - Pulls latest images from registry
   - Deploys to staging/production
   - Customize based on your deployment target

### 3. Dependency Review (`dependency-review.yml`)

**Triggers:**
- Pull requests to `main` or `develop`

**Jobs:**
1. **Dependency Review**: Security review of dependencies
   - Checks for known vulnerabilities
   - Validates license compatibility
   - Fails on moderate+ severity issues

## Setup

### 1. GitHub Container Registry

Images are automatically pushed to:
```
ghcr.io/<owner>/<repo>-server
ghcr.io/<owner>/<repo>-admin-dashboard
ghcr.io/<owner>/<repo>-nginx
```

### 2. Secrets (Optional)

No secrets required for basic CI/CD. The `GITHUB_TOKEN` is automatically provided.

For deployment, you may need:
- `DEPLOY_KEY` - SSH key for deployment server
- `AWS_ACCESS_KEY_ID` - If deploying to AWS
- `KUBECONFIG` - If deploying to Kubernetes

### 3. Environments

Configure environments in GitHub:
1. Go to Settings → Environments
2. Create `staging` and `production` environments
3. Add required secrets for each environment

## Usage

### Running Tests Locally

```bash
cd apps/mobile-app-server/server
npm test
```

### Building Images Locally

```bash
# Server
docker build -t mobile-app-server:latest -f apps/mobile-app-server/server/Dockerfile apps/mobile-app-server/server

# Admin Dashboard
docker build -t mobile-app-admin:latest -f apps/mobile-app-server/admin-dashboard/Dockerfile apps/mobile-app-server/admin-dashboard

# Nginx
docker build -t mobile-app-nginx:latest -f apps/mobile-app-server/nginx/Dockerfile apps/mobile-app-server/nginx
```

### Manual Deployment

```bash
# Pull latest images
docker pull ghcr.io/<owner>/<repo>-server:latest
docker pull ghcr.io/<owner>/<repo>-admin-dashboard:latest
docker pull ghcr.io/<owner>/<repo>-nginx:latest

# Update docker-compose.yml to use registry images
# Then deploy
cd apps/mobile-app-server
docker compose pull
docker compose up -d
```

## Monitoring

- **Workflow Runs**: https://github.com/<owner>/<repo>/actions
- **Security**: https://github.com/<owner>/<repo>/security
- **Packages**: https://github.com/<owner>/<repo>/pkgs

## Troubleshooting

### Tests Failing in CI

1. Check MongoDB/Redis services are running
2. Verify environment variables
3. Review test logs in Actions tab

### Build Failures

1. Check Dockerfile syntax
2. Verify dependencies in package.json
3. Review build logs

### Image Push Failures

1. Verify `GITHUB_TOKEN` has package write permissions
2. Check repository settings → Actions → General
3. Ensure "Read and write permissions" is enabled

