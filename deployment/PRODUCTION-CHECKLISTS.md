# MediCore Production Checklists

Use these checklists before every production release.

---

## Deployment Checklist

- [ ] Copy `backend/.env.example` to `backend/.env` and set production secrets
- [ ] Copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL`
- [ ] Set strong `JWT_SECRET` (never use defaults in production)
- [ ] Configure `DATABASE_URL` to production PostgreSQL
- [ ] Set `NODE_ENV=production`
- [ ] Set `CORS_ORIGIN` to your frontend domain(s)
- [ ] Run `cd backend && npx prisma validate && npx prisma generate`
- [ ] Run `cd backend && npx prisma db push` or `prisma migrate deploy`
- [ ] Run `cd backend && npm run build`
- [ ] Run `cd frontend && npm run build`
- [ ] Start backend and verify `GET /health` returns 200
- [ ] Verify `GET /ready` returns 200 with database connected
- [ ] Verify `GET /health/system` returns `healthy` or `degraded` (not `unhealthy`)
- [ ] Confirm frontend can reach `/api/*` through reverse proxy
- [ ] Run `npm run db:seed-demo --prefix backend` only for demo/staging environments
- [ ] Restart process manager (PM2/Docker) after deploy

---

## Security Checklist

- [ ] Rotate `JWT_SECRET` if previously exposed
- [ ] Remove hardcoded secrets from `docker-compose.yml` for production (use env files)
- [ ] Restrict database access to private network only
- [ ] Enable HTTPS/TLS on all public endpoints
- [ ] Set restrictive `CORS_ORIGIN` (no wildcard in production)
- [ ] Verify RBAC middleware on all protected routes
- [ ] Confirm SUPER_ADMIN routes (`/api/rbac`, `/api/permissions`) are admin-only
- [ ] Review audit logs and security events after deploy
- [ ] Disable demo seed in production databases
- [ ] Ensure PostgreSQL uses strong credentials
- [ ] Verify no `.env` files are committed to git

---

## Testing Checklist

- [ ] Run `cd backend && npm test` (all integration tests pass)
- [ ] Run `cd frontend && npm run lint`
- [ ] Run `cd frontend && npm run build`
- [ ] Verify health endpoints: `/health`, `/ready`, `/health/system`
- [ ] Validate Patient Journey (profile, timeline)
- [ ] Validate Doctor Journey (profile, EMR, availability)
- [ ] Validate Admin Journey (security dashboard, RBAC, statistics)
- [ ] Validate Emergency Journey (case intake, triage, dashboard)
- [ ] Validate Billing Journey (invoice create, finalize, payment)
- [ ] Validate Appointment Journey (book, confirm, check-in, complete)
- [ ] Smoke test frontend login with demo accounts (staging only)
- [ ] Confirm CI pipeline passes on target branch

---

## Release Checklist

- [ ] All critical fixes from readiness audit are resolved or documented
- [ ] Version/tag recorded for release
- [ ] Database backup taken before schema changes
- [ ] Rollback plan documented (previous build artifact + DB snapshot)
- [ ] Deployment window communicated to stakeholders
- [ ] Post-deploy monitoring: `/ready`, error logs, response times
- [ ] Demo credentials verified for presentation environments
- [ ] Release notes updated with known limitations
- [ ] On-call contact assigned for first 24 hours post-release
