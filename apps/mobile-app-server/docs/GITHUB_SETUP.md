# GitHub Setup Guide

## Repository Status

Your repository is already connected to:
- **GitHub Account**: [inquisitivefrog](https://github.com/inquisitivefrog)
- **Repository**: `inquisitivefrog/nodejs`
- **Remote**: `git@github.com:inquisitivefrog/nodejs.git`

## Differences: GitHub Enterprise vs GitHub.com

### Similarities ✅
- Same workflow syntax and features
- Same GitHub Actions runners
- Same container registry (ghcr.io)
- Same security scanning capabilities

### Differences to Note
1. **Permissions**: GitHub.com uses your personal account permissions
2. **Rate Limits**: Personal accounts have different rate limits (usually sufficient)
3. **Package Storage**: 500MB free, then billing (Enterprise often has more)
4. **Secrets**: Managed per repository (not organization-wide)

## Activating CI/CD

### Step 1: Commit and Push Workflows

```bash
cd /Users/tim/Documents/workspace/nodejs

# Add the new workflow files
git add .github/workflows/

# Commit
git commit -m "Add CI/CD pipeline with GitHub Actions"

# Push to trigger first workflow run
git push origin main
```

### Step 2: Enable Actions (if needed)

1. Go to: https://github.com/inquisitivefrog/nodejs/settings/actions
2. Under "Actions permissions", select:
   - ✅ "Allow all actions and reusable workflows"
3. Under "Workflow permissions", select:
   - ✅ "Read and write permissions"
   - ✅ "Allow GitHub Actions to create and approve pull requests"

### Step 3: Verify First Run

1. Go to: https://github.com/inquisitivefrog/nodejs/actions
2. You should see "CI Pipeline" running
3. Click on it to view progress

## Image Registry

Your Docker images will be published to:
- **Registry**: `ghcr.io`
- **Images**:
  - `ghcr.io/inquisitivefrog/nodejs-server`
  - `ghcr.io/inquisitivefrog/nodejs-admin-dashboard`
  - `ghcr.io/inquisitivefrog/nodejs-nginx`

### Viewing Packages

1. Go to: https://github.com/inquisitivefrog/nodejs/pkgs
2. Or: https://github.com/inquisitivefrog?tab=packages

### Using Images

After the first successful build, you can pull images:

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u inquisitivefrog --password-stdin

# Pull images
docker pull ghcr.io/inquisitivefrog/nodejs-server:main
docker pull ghcr.io/inquisitivefrog/nodejs-admin-dashboard:main
docker pull ghcr.io/inquisitivefrog/nodejs-nginx:main
```

## Secrets (Optional)

If you need additional secrets for deployment:

1. Go to: https://github.com/inquisitivefrog/nodejs/settings/secrets/actions
2. Click "New repository secret"
3. Add secrets like:
   - `DEPLOY_KEY` - SSH key for deployment
   - `AWS_ACCESS_KEY_ID` - For AWS deployments
   - `DOCKER_HUB_TOKEN` - If using Docker Hub instead

**Note**: `GITHUB_TOKEN` is automatically provided - no setup needed!

## Environments (For Deployment)

To set up staging/production environments:

1. Go to: https://github.com/inquisitivefrog/nodejs/settings/environments
2. Click "New environment"
3. Create `staging` and `production`
4. Add environment-specific secrets if needed

## Monitoring Workflows

### View Runs
- **All runs**: https://github.com/inquisitivefrog/nodejs/actions
- **Specific workflow**: Click on workflow name in sidebar

### View Logs
1. Click on a workflow run
2. Click on a job (e.g., "Run Tests")
3. Expand steps to see logs

### Download Artifacts
- Test coverage reports
- Build logs
- Security scan results

## Troubleshooting

### Workflows Not Running

**Issue**: Workflows don't trigger after push

**Solutions**:
1. Check Actions are enabled: Settings → Actions → General
2. Verify workflow files are in `.github/workflows/`
3. Check branch name matches workflow triggers (`main` or `develop`)
4. View Actions tab for any error messages

### Permission Errors

**Issue**: "Permission denied" when pushing images

**Solutions**:
1. Settings → Actions → General → Workflow permissions
2. Select "Read and write permissions"
3. Check "Allow GitHub Actions to create and approve pull requests"
4. Re-run the workflow

### Rate Limit Issues

**Issue**: "API rate limit exceeded"

**Solutions**:
1. Personal accounts: 5,000 requests/hour (usually sufficient)
2. Use `GITHUB_TOKEN` (has higher limits)
3. Consider GitHub Pro for higher limits if needed

### Package Storage

**Issue**: "Storage quota exceeded"

**Solutions**:
1. Free tier: 500MB storage, 1GB bandwidth/month
2. Delete old/unused packages
3. Use tags instead of multiple images
4. Upgrade to GitHub Pro if needed

## Next Steps

1. ✅ **Push workflows** (see Step 1 above)
2. ✅ **Enable Actions** (see Step 2 above)
3. ✅ **Monitor first run** (see Step 3 above)
4. ⚙️ **Customize deployment** (edit `cd.yml` for your needs)
5. ⚙️ **Set up environments** (if deploying)

## Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Container Registry Docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Your Repository](https://github.com/inquisitivefrog/nodejs)
- [Your Actions](https://github.com/inquisitivefrog/nodejs/actions)

