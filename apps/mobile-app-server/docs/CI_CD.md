# CI/CD Pipeline Documentation

This document describes the continuous integration and deployment pipeline for the mobile app server.

## GitHub Actions Workflow

The CI/CD pipeline is defined in `.github/workflows/ci.yml` and runs automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

## Pipeline Stages

### 1. Test Stage

Runs comprehensive test suite including:

- **Unit Tests**: Fast, isolated tests for individual components
- **Integration Tests**: Tests that verify component interactions
- **Test Coverage**: Generates coverage reports and uploads to Codecov

**Services Required:**
- MongoDB (via GitHub Actions service)
- Redis (via GitHub Actions service)

**Environment Variables:**
- `NODE_ENV=test`
- `MONGODB_URI=mongodb://localhost:27017/mobileapp_test`
- `REDIS_URL=redis://localhost:6379`
- `JWT_SECRET=test-secret-key-for-ci`

### 2. Build Stage

Builds Docker images for all services:
- `server` - Backend API server
- `admin-dashboard` - React admin dashboard
- `nginx` - Load balancer

**Image Tags:**
- Branch name (e.g., `main`, `develop`)
- Commit SHA (e.g., `main-abc123`)
- Semantic version (if tagged)
- `latest` (for default branch)

**Registry:**
- Images are pushed to GitHub Container Registry (ghcr.io)
- Format: `ghcr.io/<owner>/<repo>-<service>`

### 3. Security Scan Stage

Runs Trivy vulnerability scanner:
- Scans filesystem for known vulnerabilities
- Reports CRITICAL and HIGH severity issues
- Uploads results to GitHub Security tab

### 4. Docker Compose Integration Test

Validates the complete stack:
- Builds all services with Docker Compose
- Waits for services to become healthy
- Runs health check endpoints
- Verifies metrics endpoint accessibility
- Collects logs on failure

## Local Testing

You can test the CI/CD pipeline locally using [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS
# or download from https://github.com/nektos/act/releases

# Run the workflow locally
act push
```

## Manual Deployment

### Build and Push Images

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Build and tag images
docker build -t ghcr.io/OWNER/REPO-server:latest -f apps/mobile-app-server/server/Dockerfile apps/mobile-app-server/server
docker build -t ghcr.io/OWNER/REPO-admin-dashboard:latest -f apps/mobile-app-server/admin-dashboard/Dockerfile apps/mobile-app-server/admin-dashboard
docker build -t ghcr.io/OWNER/REPO-nginx:latest -f apps/mobile-app-server/nginx/Dockerfile apps/mobile-app-server/nginx

# Push images
docker push ghcr.io/OWNER/REPO-server:latest
docker push ghcr.io/OWNER/REPO-admin-dashboard:latest
docker push ghcr.io/OWNER/REPO-nginx:latest
```

### Deploy with Docker Compose

```bash
# Update docker-compose.yml to use registry images
# Then deploy
docker compose pull
docker compose up -d
```

## Environment-Specific Deployments

### Development

```bash
docker compose -f docker-compose.yml up -d
```

### Production

1. Set environment variables in `.env` file
2. Use production-specific docker-compose override:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

## Secrets Management

### Required Secrets

- `GITHUB_TOKEN` - Automatically provided by GitHub Actions
- `GRAFANA_ADMIN_PASSWORD` - Optional, for Grafana admin password

### Environment Variables

Create a `.env` file with:

```bash
# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h

# Sentry (Optional)
SENTRY_DSN=your-sentry-dsn
SENTRY_ENVIRONMENT=production

# Grafana (Optional)
GRAFANA_ADMIN_PASSWORD=secure-password
```

## Monitoring CI/CD

### GitHub Actions

- View workflow runs: `https://github.com/<owner>/<repo>/actions`
- View logs for each job
- Download artifacts (test coverage, build logs)

### Codecov

- View test coverage: `https://codecov.io/gh/<owner>/<repo>`
- Coverage trends and reports

### GitHub Security

- View security scan results: `https://github.com/<owner>/<repo>/security`
- Vulnerability reports from Trivy

## Troubleshooting

### Tests Failing

1. Check MongoDB and Redis services are running
2. Verify environment variables are set correctly
3. Check test logs for specific failures

### Build Failures

1. Verify Dockerfile syntax
2. Check for missing dependencies
3. Review build logs for errors

### Deployment Issues

1. Verify images are pushed to registry
2. Check network connectivity
3. Review service logs: `docker compose logs <service>`

## Best Practices

1. **Always run tests locally** before pushing
2. **Use feature branches** for development
3. **Review PRs** before merging to main
4. **Monitor CI/CD** for failures
5. **Keep dependencies updated** (security patches)
6. **Use semantic versioning** for releases
7. **Tag releases** for production deployments


