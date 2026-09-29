SOGOD – Stay · Experience · Local Help

Dorian Villa and Albay experiences.

## Development and deployment

The committed HTML, assets and `api/` tree are the deployment source. CI validates
the repository and deploys it without running source-generating scripts.

- Run static-site checks: `node scripts/check-site.mjs`
- Run API tests: `npm ci --prefix api && npm test --prefix api`
- Review Azure setup and data-handling prerequisites in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

The request API is not registered for this Gallery release. Keep
`BOOKING_ENABLED=false`; visitors use the request form's email fallback.
