# Legacy Code Revival AI - Web UI

Modern React web interface for the Legacy Code Revival AI system.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **React Query** for server state management
- **React Router** for routing
- **Axios** for API calls
- **Socket.io** for real-time updates

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development

The development server runs on `http://localhost:5173` by default.

### Project Structure

```
src/
├── components/     # React components
│   └── ui/        # shadcn/ui components
├── pages/         # Page components
├── api/           # API client and endpoints
├── hooks/         # Custom React hooks
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
├── App.tsx        # Main app component
└── main.tsx       # Entry point
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run deploy:vercel` - Deploy to Vercel (production)
- `npm run deploy:netlify` - Deploy to Netlify (production)

## Environment Variables

Create a `.env` file in the frontend directory:

```
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000
```

## Adding shadcn/ui Components

To add more shadcn/ui components:

```bash
npx shadcn-ui@latest add [component-name]
```

Example:
```bash
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add badge
```

## Testing

Run the test suite:

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## Deployment

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

### Manual Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Quick commands**:

```bash
# Deploy to Vercel
npm run deploy:vercel

# Deploy to Netlify
npm run deploy:netlify

# Or use deployment scripts
./scripts/deploy.sh vercel production
```

### Environment Variables for Production

Set these in your deployment platform:

- `VITE_API_URL` - Production API URL
- `VITE_WS_URL` - Production WebSocket URL

### CI/CD

GitHub Actions workflow is configured in `.github/workflows/deploy-frontend.yml` for automatic deployments.

## Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Pre-deployment checklist
- [CUSTOM_DOMAIN.md](./CUSTOM_DOMAIN.md) - Custom domain setup
- [ACCESSIBILITY.md](./ACCESSIBILITY.md) - Accessibility guidelines
- [ERROR_HANDLING.md](./ERROR_HANDLING.md) - Error handling patterns
- [PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md) - Performance tips

## Code Style

- ESLint for linting
- Prettier for formatting
- TypeScript strict mode enabled

## License

MIT
