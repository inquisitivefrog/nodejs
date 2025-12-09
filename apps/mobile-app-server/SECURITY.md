# Security Best Practices

## Secret Management

### Development

1. **Never commit `.env` files** - They are in `.gitignore`
2. **Use `.env.example`** - Template file without actual secrets
3. **Generate strong secrets**:
   ```bash
   # Generate a secure JWT secret
   openssl rand -base64 32
   ```

### Production

#### Option 1: Environment Variables (Simple)
- Use `.env` file (not committed to git)
- Load with: `docker compose --env-file .env up`
- Ensure `.env` has restricted file permissions: `chmod 600 .env`

#### Option 2: Docker Secrets (Recommended for Docker Swarm)
```yaml
services:
  server:
    secrets:
      - jwt_secret
    environment:
      JWT_SECRET_FILE: /run/secrets/jwt_secret

secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

#### Option 3: Secret Management Services (Enterprise)
- **AWS Secrets Manager** / **AWS Parameter Store**
- **HashiCorp Vault**
- **Azure Key Vault**
- **Google Secret Manager**

### Current Setup

The application uses environment variables loaded from:
- `.env` file (local development)
- Docker Compose environment variables (containerized)
- System environment variables (production)

### Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] `.env.example` exists without real secrets
- [ ] JWT secret is strong (32+ characters, random)
- [ ] Different secrets for each environment (dev/staging/prod)
- [ ] Secrets are rotated regularly
- [ ] No secrets in logs or error messages
- [ ] Database credentials are secure
- [ ] HTTPS/TLS in production
- [ ] Secrets have restricted file permissions (`chmod 600`)

### Generating Secrets

```bash
# JWT Secret
openssl rand -base64 32

# MongoDB Password
openssl rand -base64 24

# General random string
openssl rand -hex 32
```

### File Permissions

```bash
# Restrict .env file permissions
chmod 600 .env

# Restrict secrets directory
chmod 700 secrets/
chmod 600 secrets/*
```


