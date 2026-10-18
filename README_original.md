# FindMyDorm — HTTPS-ready project

## Run locally
1. Install Node.js 18+.
2. Set your API key in your terminal, never in `index.html`:
   - macOS/Linux: `export OPENAI_API_KEY="your-api-key"`
   - Windows PowerShell: `$env:OPENAI_API_KEY="your-api-key"`
3. Run `node server.js` and open `http://localhost:3000`. Localhost is for development; it is not public HTTPS.

## Public HTTPS deployment
Recommended: deploy to a managed host or use a trusted reverse proxy such as Caddy/Nginx that provisions and renews a valid TLS certificate for your domain. Configure HTTP-to-HTTPS redirects at the proxy and forward to Node over a private network. Set `TRUST_PROXY=1` only when that trusted proxy overwrites `X-Forwarded-Proto`.

Or provide trusted TLS certificate files:
- `TLS_KEY_FILE=/path/to/privkey.pem`
- `TLS_CERT_FILE=/path/to/fullchain.pem`
- `PORT=443`
- `OPENAI_API_KEY=...`
Then run `node server.js`. Do not use self-signed certificates publicly.

## Security included
Security headers, CSP, frame blocking, referrer/permissions policies, HSTS on HTTPS responses, basic Origin validation and request size limits. API keys stay server-side. Calculator uses a parser rather than `eval()`.

## Important limitations before production
HTTPS encrypts traffic but does not make every feature secure. The account system still stores data in browser localStorage; move authentication to a server/database with secure HttpOnly/SameSite cookies, password reset, rate limiting and CSRF protection. The booking form is only a demo and must not collect real card details; use a PCI-compliant payment provider. Listings are sample data, not independently verified. Inline scripts/styles currently require `unsafe-inline` in CSP; refactor them and use CSP nonces/hashes for stronger protection. Add API rate limiting, monitoring and deployment testing.
