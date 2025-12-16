# CI/CD Pipeline Setup Guide

## Overview

The CI/CD pipeline is now configured with GitHub Actions. It automatically:
- ✅ Runs tests on every push and pull request
- ✅ Builds Docker images on push to main/develop
- ✅ Scans for security vulnerabilities
- ✅ Tests Docker Compose integration
- ✅ Reviews dependencies for security issues

## Quick Start

### 1. Push to GitHub

The workflows will automatically run when you:
- Push to `main` or `develop` branches
- Open a pull request
- Tag a release (v*.*.*)

### 2. View Workflow Runs

Go to: `https://github.com/<your-username>/<your-repo>/actions`

### 3. View Built Images

Go to: `https://github.com/<your-username>/<your-repo>/pkgs/container`

## Workflow Files

### `.github/workflows/ci.yml`
Main CI pipeline with:
- Test execution
- Docker image building
- Security scanning
- Integration testing

### `.github/workflows/cd.yml`
Deployment pipeline (customize for your needs)

### `.github/workflows/dependency-review.yml`
Dependency security review on PRs

## Configuration

### GitHub Settings

1. **Enable Actions** (if not already):
   - Go to Settings → Actions → General
   - Enable "Allow all actions and reusable workflows"

2. **Package Permissions**:
   - Settings → Actions → General → Workflow permissions
   - Select "Read and write permissions"
   - Check "Allow GitHub Actions to create and approve pull requests"

3. **Environments** (for deployment):
   - Settings → Environments
   - Create `staging` and `production` environments
   - Add deployment secrets if needed

### Environment Variables

The workflows use these environment variables (set automatically):

**Test Environment:**
- `NODE_ENV=test`
- `MONGODB_URI=mongodb://localhost:27017/mobileapp-test`
- `REDIS_URL=redis://localhost:6379`
- `JWT_SECRET=test-secret-key-for-ci`

**Build Environment:**
- `REGISTRY=ghcr.io`
- `IMAGE_PREFIX=<your-repo>`

## Workflow Details

### Test Job

**Services:**
- MongoDB 7 (port 27017)
- Redis 7 (port 6379)

**Steps:**
1. Checkout code
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. Run linter (if configured)
5. Run all tests with coverage
6. Upload coverage to Codecov

**Expected Duration:** ~5-10 minutes

### Build Job

**Triggers:** Only on push (not PRs)

**Builds:**
- `server` Docker image
- `admin-dashboard` Docker image
- `nginx` Docker image

**Tags:**
- Branch name (e.g., `main`, `develop`)
- Commit SHA (e.g., `main-abc123`)
- Semantic version (if tagged)
- `latest` (for default branch)

**Registry:** GitHub Container Registry (ghcr.io)

### Security Scan Job

**Scans:**
- Filesystem for vulnerabilities
- Docker images (if built)
- Dependencies (via dependency-review)

**Severity Levels:** CRITICAL, HIGH

**Results:** Uploaded to GitHub Security tab

### Docker Compose Test Job

**Triggers:** Only on push to `main`

**Steps:**
1. Pull/build images
2. Start all services
3. Wait for health checks
4. Test endpoints:
   - `/health`
   - `/metrics`
   - Prometheus targets
   - Grafana health
5. Collect logs on failure

## Customization

### Adding More Tests

Edit `.github/workflows/ci.yml`:

```yaml
- name: Run performance tests
  working-directory: apps/mobile-app-server/server
  run: npm run test:performance
```

### Changing Image Registry

Edit the `env` section in `ci.yml`:

```yaml
env:
  REGISTRY: docker.io  # or your registry
  IMAGE_PREFIX: your-org/your-repo
```

### Adding Deployment Steps

Edit `.github/workflows/cd.yml` and add your deployment commands:

```yaml
- name: Deploy to AWS ECS
  run: |
    aws ecs update-service \
      --cluster your-cluster \
      --service your-service \
      --force-new-deployment
```

## Troubleshooting

### Tests Failing in CI

**Issue:** Tests pass locally but fail in CI

**Solutions:**
1. Check MongoDB/Redis services are running
2. Verify environment variables match
3. Check test timeout settings
4. Review test logs in Actions tab

### Build Failures

**Issue:** Docker build fails

**Solutions:**
1. Check Dockerfile syntax
2. Verify all dependencies in package.json
3. Review build logs for specific errors
4. Test build locally: `docker build -f Dockerfile .`

### Image Push Failures

**Issue:** Cannot push to GitHub Container Registry

**Solutions:**
1. Verify `GITHUB_TOKEN` has package write permissions
2. Check repository settings → Actions → General
3. Ensure "Read and write permissions" is enabled
4. Check if package already exists and has different permissions

### Security Scan False Positives

**Issue:** Security scan reports vulnerabilities that aren't relevant

**Solutions:**
1. Review vulnerability details in GitHub Security tab
2. Update dependencies if fix available
3. Add exceptions in workflow if needed (not recommended)
4. Use `severity: CRITICAL` to only fail on critical issues

## Local Testing

### Test Workflow Locally

Install [act](https://github.com/nektos/act):

```bash
# macOS
brew install act

# Or download from releases
```

Run workflow:

```bash
# Test CI workflow
act push

# Test specific job
act -j test

# Test with secrets
act push --secret GITHUB_TOKEN=your-token
```

### Test Docker Builds Locally

```bash
cd apps/mobile-app-server

# Build server
docker build -t test-server -f server/Dockerfile server/

# Build admin dashboard
docker build -t test-admin -f admin-dashboard/Dockerfile admin-dashboard/

# Build nginx
docker build -t test-nginx -f nginx/Dockerfile nginx/
```

## Best Practices

1. **Always test locally** before pushing
2. **Use feature branches** for development
3. **Review PRs** before merging
4. **Monitor CI/CD** for failures
5. **Keep dependencies updated**
6. **Use semantic versioning** for releases
7. **Tag releases** for production deployments
8. **Review security scans** regularly

## Next Steps

1. ✅ Push code to GitHub to trigger first CI run
2. ✅ Review workflow runs in Actions tab
3. ✅ Check built images in Packages
4. ✅ Review security scan results
5. ⚙️ Customize CD pipeline for your deployment target
6. ⚙️ Set up deployment environments
7. ⚙️ Configure deployment secrets

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Trivy Security Scanner](https://github.com/aquasecurity/trivy)
- [Codecov Coverage](https://codecov.io/)

