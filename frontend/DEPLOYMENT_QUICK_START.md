# Deployment Quick Start 🚀

## TL;DR

```bash
# 1. Set environment variables in your platform
VITE_API_URL=https://api.your-domain.com/api
VITE_WS_URL=https://api.your-domain.com

# 2. Deploy
cd frontend
npm run deploy:vercel  # or deploy:netlify
```

## Vercel (Recommended)

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

### CLI Deploy

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel --prod
```

### Dashboard Deploy

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your Git repository
4. Set root directory: `frontend`
5. Add environment variables
6. Click "Deploy"

## Netlify

### One-Click Deploy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

### CLI Deploy

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
cd frontend
netlify deploy --prod
```

### Dashboard Deploy

1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site"
3. Import your Git repository
4. Base directory: `frontend`
5. Build command: `npm run build`
6. Publish directory: `frontend/dist`
7. Add environment variables
8. Click "Deploy site"

## Environment Variables

Set these in your deployment platform:

```env
VITE_API_URL=https://api.your-domain.com/api
VITE_WS_URL=https://api.your-domain.com
```

## Pre-Deployment Checklist

```bash
# Run tests
npm run test

# Run linter
npm run lint

# Test build
npm run build

# Preview build
npm run preview
```

## Deployment Scripts

### Unix/macOS/Linux

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh vercel production
```

### Windows

```powershell
.\scripts\deploy.ps1 -Platform vercel -Environment production
```

## CI/CD (GitHub Actions)

Push to `main` branch → Automatic deployment

**Setup:**
1. Add GitHub secrets:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
   - `VITE_API_URL`
   - `VITE_WS_URL`

2. Push to main:
```bash
git push origin main
```

## Custom Domain

### Vercel

1. Project Settings → Domains
2. Add your domain
3. Update DNS records
4. Wait for SSL provisioning

### Netlify

1. Site Settings → Domain management
2. Add custom domain
3. Update DNS records
4. Enable HTTPS

## Verification

After deployment:

- [ ] Visit deployment URL
- [ ] Test all routes
- [ ] Check API connection
- [ ] Test WebSocket
- [ ] Verify on mobile

## Troubleshooting

### Build fails
```bash
rm -rf node_modules dist
npm install
npm run build
```

### Environment variables not working
- Ensure they start with `VITE_`
- Rebuild after changes

### 404 on routes
- Check `vercel.json` or `netlify.toml` exists

### API connection fails
- Verify `VITE_API_URL` is correct
- Check CORS on backend

## Need Help?

See detailed guides:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Full deployment guide
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Pre-deployment checklist
- [CUSTOM_DOMAIN.md](./CUSTOM_DOMAIN.md) - Domain setup

## Support

- Vercel: [vercel.com/support](https://vercel.com/support)
- Netlify: [netlify.com/support](https://netlify.com/support)
