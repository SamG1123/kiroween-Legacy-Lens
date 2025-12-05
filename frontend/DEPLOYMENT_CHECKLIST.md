# Pre-Deployment Checklist

Use this checklist before deploying to production.

## Code Quality

- [ ] All tests pass (`npm run test`)
- [ ] No linting errors (`npm run lint`)
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] No console errors in browser
- [ ] Code reviewed and approved

## Configuration

- [ ] Environment variables configured
  - [ ] `VITE_API_URL` set to production API
  - [ ] `VITE_WS_URL` set to production WebSocket
- [ ] Backend API is deployed and accessible
- [ ] CORS configured on backend for frontend domain
- [ ] WebSocket endpoint is accessible

## Features Testing

- [ ] Upload functionality works
  - [ ] GitHub URL upload
  - [ ] ZIP file upload
  - [ ] File size validation (100MB)
- [ ] Dashboard displays correctly
  - [ ] Project cards render
  - [ ] Filtering works
  - [ ] Sorting works
  - [ ] Search works
- [ ] Project details page works
  - [ ] All tabs load (Overview, Languages, Dependencies, Metrics, Issues)
  - [ ] Charts render correctly
  - [ ] Data displays accurately
- [ ] Real-time updates work
  - [ ] Progress tracker updates
  - [ ] WebSocket connection stable
- [ ] Download functionality works
  - [ ] JSON format
  - [ ] PDF format (if implemented)
  - [ ] Markdown format
- [ ] Delete functionality works
  - [ ] Confirmation dialog appears
  - [ ] Project deleted successfully
  - [ ] Dashboard updates

## UI/UX

- [ ] Responsive design works
  - [ ] Desktop (1920x1080)
  - [ ] Laptop (1366x768)
  - [ ] Tablet (768x1024)
  - [ ] Mobile (375x667)
- [ ] Loading states display correctly
- [ ] Error messages are user-friendly
- [ ] Tooltips and help text are clear
- [ ] Navigation works smoothly
- [ ] Animations are smooth (no jank)

## Performance

- [ ] Lighthouse score > 90 (Performance)
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3.5s
- [ ] Bundle size is reasonable (< 500KB gzipped)
- [ ] Images are optimized
- [ ] Code splitting is working
- [ ] Lazy loading is implemented

## Accessibility

- [ ] Lighthouse score > 95 (Accessibility)
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible
- [ ] ARIA labels present

## Security

- [ ] No sensitive data in client code
- [ ] Environment variables not exposed
- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] XSS protection in place
- [ ] CSRF protection (if applicable)

## SEO

- [ ] Meta tags configured
- [ ] Open Graph tags added
- [ ] Favicon present
- [ ] robots.txt configured
- [ ] sitemap.xml generated (if applicable)

## Monitoring

- [ ] Error tracking configured (Sentry, etc.)
- [ ] Analytics configured (optional)
- [ ] Uptime monitoring set up
- [ ] Performance monitoring enabled

## Documentation

- [ ] README updated
- [ ] DEPLOYMENT.md reviewed
- [ ] Environment variables documented
- [ ] API endpoints documented
- [ ] Changelog updated

## Deployment Platform

- [ ] Platform account created (Vercel/Netlify)
- [ ] Project connected to Git repository
- [ ] Build settings configured
- [ ] Environment variables set in platform
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active

## CI/CD

- [ ] GitHub Actions workflow configured
- [ ] GitHub secrets added
- [ ] CI/CD pipeline tested
- [ ] Preview deployments working
- [ ] Production deployment working

## Post-Deployment

- [ ] Verify production URL loads
- [ ] Test all critical user flows
- [ ] Check browser console for errors
- [ ] Verify API connections work
- [ ] Test on multiple devices
- [ ] Monitor error tracking for issues
- [ ] Check performance metrics

## Rollback Plan

- [ ] Previous version tagged in Git
- [ ] Rollback procedure documented
- [ ] Team knows how to rollback
- [ ] Database migrations are reversible (if applicable)

## Communication

- [ ] Team notified of deployment
- [ ] Users notified of new features (if applicable)
- [ ] Documentation updated
- [ ] Release notes published

---

**Deployment Date**: _______________

**Deployed By**: _______________

**Version**: _______________

**Notes**:
