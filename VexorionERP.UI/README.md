# VexorionERP UI

React + Vite + MUI frontend for the Vexorion ERP backend.

## Available routes

- `/` dashboard shell
- `/login` JWT login flow against `/api/auth/login`
- `/products` protected product list against `/api/products`
- `/tenants` anonymous tenant onboarding against `/api/tenants/onboard`

## Development

```bash
npm install
npm run dev
```

The app defaults to `VITE_API_BASE_URL=/api` and uses the Vite proxy to forward `/api/*` to `http://localhost:5125`.

## Environment

Copy `.env.example` if you want to override API settings.

- `VITE_API_BASE_URL` controls the fetch base URL used in the browser.
- `VITE_API_PROXY_TARGET` controls the Vite dev proxy target.
