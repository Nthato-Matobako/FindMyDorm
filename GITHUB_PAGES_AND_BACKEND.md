# FindMyDorm: GitHub Pages + secure AI backend

## Important architecture
GitHub Pages serves the static `index.html`; it cannot run `server.js`. Deploy this same repository separately as a Render **Web Service** to run the Node.js API. No API key belongs in the HTML or GitHub.

## A. Publish the static website on GitHub Pages
1. Create a GitHub repository named `FindMyDorm`.
2. Upload `index.html` to the repository root and commit it. You may also commit `server.js`, `package.json`, and this guide for Render; never commit secrets.
3. In repository **Settings → Pages**, select **Deploy from a branch**, branch `main`, folder `/(root)`, and save.
4. Wait for GitHub to show the published address, usually `https://YOUR-USERNAME.github.io/FindMyDorm/` for a project repository.
5. Your site origin is `https://YOUR-USERNAME.github.io` (no `/FindMyDorm/` path). This exact origin will be used for backend CORS.

GitHub Pages' `github.io` sites support HTTPS automatically. In Settings → Pages, enable **Enforce HTTPS** if the option is shown.

## B. Deploy the backend on Render
1. Create/sign in at Render and choose **New → Web Service**.
2. Connect the same GitHub repository.
3. Build command: `npm install`; Start command: `npm start`; Node runtime.
4. In the service's Environment settings add:
   - `NODE_ENV` = `production`
   - `TRUST_PROXY` = `1`
   - `FRONTEND_ORIGIN` = `https://YOUR-USERNAME.github.io` (exact origin only, no repository path or trailing slash)
   - `OPENAI_API_KEY` = your private OpenAI API key
   - optional `OPENAI_MODEL` = `gpt-4.1-mini`
5. Deploy and copy the backend service's HTTPS URL, e.g. `https://your-service.onrender.com`.
6. In `index.html`, replace `https://YOUR-BACKEND.onrender.com/api/chat` with the exact backend URL plus `/api/chat`. Commit the change. GitHub Pages will redeploy automatically.
7. If you use a different GitHub Pages username/domain, update `FRONTEND_ORIGIN` on Render to match the site's origin exactly. Redeploy/restart the backend.

## C. Test
- Visit the GitHub Pages URL and check that it loads over HTTPS.
- Use the chatbot and confirm it receives a reply.
- Test the maths calculator.
- If the chatbot fails, check browser developer console and Render logs. Common causes: placeholder backend URL not replaced, wrong `FRONTEND_ORIGIN`, missing/invalid API key, or API billing/access not enabled.

## Security reminders
- Never commit `OPENAI_API_KEY`, `.env`, certificate files, or other secrets to GitHub.
- CORS is not authentication; it only restricts which browser origins can read API responses. Add rate limiting, quotas/usage alerts, abuse monitoring, and ideally user authentication before public launch.
- The calculator can run client-side. HTTPS encrypts traffic but does not secure client-side localStorage authentication or make demo listings/booking/payment flows production-ready. Do not collect real payment-card details in this prototype.
- Render may spin down free web services when idle, so the first chatbot request after inactivity may be slow.
