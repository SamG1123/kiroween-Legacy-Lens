# Deployment Scripts

This directory contains scripts to help with deployment.

## Available Scripts

### deploy.sh (Bash)

For Unix-based systems (Linux, macOS).

**Usage**:
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh [platform] [environment]
```

**Examples**:
```bash
# Deploy to Vercel production
./scripts/deploy.sh vercel production

# Deploy to Netlify preview
./scripts/deploy.sh netlify preview

# Default: Vercel production
./scripts/deploy.sh
```

### deploy.ps1 (PowerShell)

For Windows systems.

**Usage**:
```powershell
.\scripts\deploy.ps1 -Platform [platform] -Environment [environment]
```

**Examples**:
```powershell
# Deploy to Vercel production
.\scripts\deploy.ps1 -Platform vercel -Environment production

# Deploy to Netlify preview
.\scripts\deploy.ps1 -Platform netlify -Environment preview

# Default: Vercel production
.\scripts\deploy.ps1
```

## What These Scripts Do

1. **Verify location**: Ensures you're in the frontend directory
2. **Install dependencies**: Runs `npm install` if needed
3. **Run tests**: Executes `npm run test`
4. **Run linter**: Executes `npm run lint`
5. **Build**: Creates production build with `npm run build`
6. **Deploy**: Deploys to the specified platform

## Prerequisites

### For Vercel

Install Vercel CLI:
```bash
npm install -g vercel
```

Login:
```bash
vercel login
```

### For Netlify

Install Netlify CLI:
```bash
npm install -g netlify-cli
```

Login:
```bash
netlify login
```

## NPM Scripts Alternative

You can also use the npm scripts directly:

```bash
# Vercel
npm run deploy:vercel          # Production
npm run deploy:vercel:preview  # Preview

# Netlify
npm run deploy:netlify         # Production
npm run deploy:netlify:preview # Preview
```

The `predeploy` script will automatically run linting, tests, and build before deployment.

## Troubleshooting

### Permission Denied (Bash)

Make the script executable:
```bash
chmod +x scripts/deploy.sh
```

### Execution Policy Error (PowerShell)

Allow script execution:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Tests Fail

Fix the failing tests before deploying:
```bash
npm run test:watch
```

### Build Fails

Check for TypeScript errors:
```bash
npm run build
```

## CI/CD

For automated deployments, use the GitHub Actions workflow instead:
- `.github/workflows/deploy-frontend.yml`

This workflow automatically deploys on push to main branch.
