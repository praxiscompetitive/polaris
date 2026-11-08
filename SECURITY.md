# Security policy

## Supported versions

POLARIS is a continuously deployed site. Only the latest commit on `main` is supported.

## Reporting a vulnerability

Please do not open a public issue. Use GitHub's **Report a vulnerability** button on the repository's *Security* tab
(private security advisories). Include what you found, how to reproduce it, and its impact. We aim to acknowledge reports
within a few days.

## Scope notes

- POLARIS has no database and stores no user accounts. The serverless functions in `api/` only proxy public datasets.
- Never commit secrets. `FIRMS_MAP_KEY` is server-side only; `VITE_CESIUM_TOKEN` is shipped to the browser by design, so
  use a token restricted to your own domain.
