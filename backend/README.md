# Backend operations

## Platform administrator access

Platform administrators use the authenticated workspace at `/app/admin`. The
console exposes aggregate service statistics, basic account identity and
status, shared category templates, maintenance settings, operational audit
events, and user-submitted issue reports. It does not expose user transactions,
balances, budgets, savings goals, or accounts.

To grant administrator access, first create and activate the intended user
account through the normal registration flow. Then, from the backend directory
and with the intended database configured, run:

```sh
npm run admin:bootstrap -- admin@example.com
```

This operator-only script promotes exactly the specified existing active
account. There is no public role-assignment API. Keep database credentials and
access to this command limited to trusted operators.

To revoke administrator access from an account while ensuring at least one
active administrator remains, run:

```sh
npm run admin:revoke -- admin@example.com
```

## Deploying platform administration

Apply database migrations before deploying the backend:

```sh
npx prisma migrate deploy
npm run build
```

The platform category templates are copied into a user's private categories
when a new account is registered. Editing or deactivating a shared template
does not modify any existing user's categories.

Maintenance mode blocks ordinary API routes with HTTP 503 while leaving
authentication, health checks, and administrator routes available. It does not
turn off the frontend static site.

Issue-report descriptions are user-submitted text. The support form tells users
not to include sensitive financial information. Administrators should use
reports only for support triage; report records are not linked to financial
records.
