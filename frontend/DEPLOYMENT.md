# Deployment Guide

This guide covers deploying the Legacy Code Revival AI Web UI to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Build Configuration](#build-configuration)
- [Deployment Options](#deployment-options)
  - [Vercel](#vercel-recommended)
  - [Netlify](#netlify)
  - [Manual Deployment](#manual-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Custom Domain](#custom-domain)
- [Post-Deployment](#post-deployment)

## Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- Backend API deployed and accessible
- Git repository (for CI/CD)

## Environment Variables

### Development

Copy `.env.example` to `.env` for local development:

```bash
cp .env.example .env
```

### Production

Set the following environment variables in your deployment platform:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://api.your-domain.com/api` |
| `VITE_WS_URL` | WebSocket server URL | `https://api.your-domain.com` |

## Build Configuration

### Local Build

Test the production build locally:

```bash
cd frontend
npm install
npm run build
npm run preview
```

The build output will be in the `dist/` directory.

### Build Optimization

The project is configured with:

- **Code splitting**: Vendor chunks separated for better caching
- **Minification**: Using esbuild for fast builds
- **Tree shaking**: Removes unused code
- **Asset optimization**: Images and fonts optimized
- **Modern target**: ES2015+ for smaller bundles

## Deployment Options

### Vercel (Recommended)

Vercel provides the best experience for Vite applications with zero configuration.

#### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

#### Manual Setup

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   cd frontend
   vercel
   ```

4. **Set Environment Variables**:
   ```bash
   vercel env add VITE_API_URL production
   vercel env add VITE_WS_URL production
   ```

5. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

#### Vercel Dashboard Setup

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your Git repository
4. Set root directory to `frontend`
5. Framework preset: Vite
6. Add environment variables:
   - `VITE_API_URL`
   - `VITE_WS_URL`
7. Click "Deploy"

### Netlify

Netlify is another excellent option with great DX.

#### Quick Deploy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

#### Manual Setup

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**:
   ```bash
   netlify login
   ```

3. **Initialize**:
   ```bash
   cd frontend
   netlify init
   ```

4. **Deploy**:
   ```bash
   netlify deploy --prod
   ```

#### Netlify Dashboard Setup

1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your Git repository
4. Configure build settings:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`
5. Add environment variables in Site settings → Environment variables:
   - `VITE_API_URL`
   - `VITE_WS_URL`
6. Click "Deploy site"

### Manual Deployment

For custom hosting (AWS S3, DigitalOcean, etc.):

1. **Build the project**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Upload `dist/` folder** to your hosting provider

3. **Configure web server** for SPA routing:

   **Nginx**:
   ```nginx
   server {
     listen 80;
     server_name your-domain.com;
     root /path/to/dist;
     index index.html;

     location / {
       try_files $uri $uri/ /index.html;
     }

     # Cache static assets
     location /assets/ {
       expires 1y;
       add_header Cache-Control "public, immutable";
     }
   }
   ```

   **Apache** (`.htaccess`):
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

## CI/CD Pipeline

### GitHub Actions

The project includes a GitHub Actions workflow (`.github/workflows/deploy-frontend.yml`) that:

1. Runs on push to `main` branch
2. Runs tests and linting
3. Builds the application
4. Deploys to Vercel (production)
5. Creates preview deployments for PRs

#### Setup GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

| Secret | Description | How to get |
|--------|-------------|------------|
| `VERCEL_TOKEN` | Vercel authentication token | [Account Settings → Tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel organization ID | Run `vercel` CLI and check `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Vercel project ID | Run `vercel` CLI and check `.vercel/project.json` |
| `VITE_API_URL` | Production API URL | Your backend URL |
| `VITE_WS_URL` | Production WebSocket URL | Your backend URL |

### Alternative CI/CD Platforms

#### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
image: node:18

stages:
  - test
  - build
  - deploy

test:
  stage: test
  script:
    - cd frontend
    - npm ci
    - npm run lint
    - npm run test

build:
  stage: build
  script:
    - cd frontend
    - npm ci
    - npm run build
  artifacts:
    paths:
      - frontend/dist

deploy:
  stage: deploy
  script:
    - npm install -g vercel
    - cd frontend
    - vercel --token=$VERCEL_TOKEN --prod
  only:
    - main
```

## Custom Domain

### Vercel

1. Go to your project in Vercel dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Update DNS records as instructed:
   - Add A record or CNAME pointing to Vercel
5. Wait for DNS propagation (can take up to 48 hours)
6. SSL certificate is automatically provisioned

### Netlify

1. Go to your site in Netlify dashboard
2. Click "Domain settings"
3. Click "Add custom domain"
4. Follow DNS configuration instructions:
   - Add A record or CNAME pointing to Netlify
5. Enable HTTPS (automatic with Let's Encrypt)

### DNS Configuration

Example DNS records:

```
Type    Name    Value                   TTL
A       @       76.76.21.21            3600
CNAME   www     your-site.vercel.app   3600
```

## Post-Deployment

### Verification Checklist

- [ ] Application loads correctly
- [ ] All routes work (test navigation)
- [ ] API connection works
- [ ] WebSocket connection works
- [ ] Charts and visualizations render
- [ ] File uploads work
- [ ] Downloads work
- [ ] Mobile responsive design works
- [ ] Error handling works
- [ ] Performance is acceptable (Lighthouse score)

### Performance Testing

Run Lighthouse audit:

```bash
npm install -g lighthouse
lighthouse https://your-domain.com --view
```

Target scores:
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 90
- SEO: > 90

### Monitoring

Consider setting up:

1. **Error tracking**: Sentry, Rollbar, or Bugsnag
2. **Analytics**: Google Analytics, Plausible, or Fathom
3. **Uptime monitoring**: UptimeRobot, Pingdom, or StatusCake
4. **Performance monitoring**: Vercel Analytics or Netlify Analytics

### Rollback

If deployment fails:

**Vercel**:
```bash
vercel rollback
```

**Netlify**:
1. Go to Deploys tab
2. Find previous successful deploy
3. Click "Publish deploy"

## Troubleshooting

### Build Fails

- Check Node.js version (must be 18+)
- Clear cache: `rm -rf node_modules package-lock.json && npm install`
- Check for TypeScript errors: `npm run build`

### Environment Variables Not Working

- Ensure variables start with `VITE_` prefix
- Rebuild after changing environment variables
- Check deployment platform's environment variable settings

### 404 on Routes

- Ensure SPA redirect is configured (see deployment configs)
- Check `vercel.json` or `netlify.toml` is present

### API Connection Issues

- Verify `VITE_API_URL` is correct
- Check CORS settings on backend
- Ensure backend is deployed and accessible
- Check browser console for errors

### WebSocket Connection Issues

- Verify `VITE_WS_URL` is correct
- Ensure WebSocket endpoint is accessible
- Check for proxy/firewall blocking WebSocket connections
- Use WSS (secure WebSocket) in production

## Support

For deployment issues:

- Vercel: [vercel.com/support](https://vercel.com/support)
- Netlify: [netlify.com/support](https://netlify.com/support)
- GitHub Actions: [GitHub Community](https://github.community)

## Additional Resources

- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
