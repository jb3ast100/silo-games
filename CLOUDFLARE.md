# Static Cloudflare Pages release

Production website: https://silo-games.pages.dev/
Exchange: https://silo-games.pages.dev/exchange
Game client: https://strike-force.pages.dev/
Economy API remains on Railway.

Run `npm ci`, `npm run build:cloudflare`, and `npm run typecheck`. Publish only `.output/public` to Pages project `silo-games`, branch `main`. Never upload `.output/server`, the repository root, environment files or credentials. Both routes are prerendered and hydrate in the browser; there are no deployed Pages Functions. The install helper and manifest are emitted as static assets.

The first release uses direct upload. GitHub pushes do not automatically update Pages. Use the dashboard to upload the build folder/ZIP, or an authenticated `wrangler pages deploy .output/public --project-name silo-games --branch main`. Existing `npm run build` remains the Vercel rollback build.

`VITE_ECONOMY_API_ORIGIN` defaults to the existing Railway service in the Cloudflare build script. `SILO_PUBLIC_HOST` optionally changes the public metadata hostname. Keep `GAME_ORIGIN` separate from `ECONOMY_API_ORIGIN`: game links go to Cloudflare, wallet configuration goes to Railway. The Railway service's `SF_ECONOMY_ORIGINS` must allow the exact production Pages origin. Preview origins are intentionally not authorized for wallet sessions.

Verify homepage, exchange direct navigation, live listings, wallet connection and mobile layout after publishing. Preserve Vercel as rollback until custom-domain routing and retirement are explicitly completed.
