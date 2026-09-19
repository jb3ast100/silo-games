import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { renderWebManifest, renderInstallPageHtml } from './grok-pwa-shared.mjs';
const result=spawnSync(process.execPath,['scripts/with-app-env.mjs',process.execPath,'node_modules/vite/bin/vite.js','build'],{
  stdio:'inherit',env:{...process.env,SILO_STATIC_BUILD:'1',VITE_PUBLIC_HOSTNAME:process.env.SILO_PUBLIC_HOST||'silo-games.pages.dev',VITE_ECONOMY_API_ORIGIN:process.env.VITE_ECONOMY_API_ORIGIN||'https://game-server-production-4b94.up.railway.app'}
});
if(result.status!==0)process.exit(result.status||1);
const out='.output/public';
for(const path of ['index.html','exchange/index.html']){
  if(!existsSync(`${out}/${path}`))throw Error(`Missing prerendered page ${path}`);
  const html=readFileSync(`${out}/${path}`,'utf8');
  if(!html.includes('Silo'))throw Error(`Empty prerendered page ${path}`);
  writeFileSync(`${out}/${path}`,html.replace('<head>','<head><script src="/static-install.js"></script>'));
}
mkdirSync(`${out}/__grok`,{recursive:true});
const manifest=JSON.parse(renderWebManifest(process.env.SILO_PUBLIC_HOST||'silo-games.pages.dev'));
manifest.name='Silo Games';manifest.short_name='Silo Games';
writeFileSync(`${out}/__grok/manifest.webmanifest`,JSON.stringify(manifest));
writeFileSync(`${out}/static-install.js`,"if(new URLSearchParams(location.search).get('install')==='1')location.replace('/install.html'+location.search);");
writeFileSync(`${out}/install.html`,renderInstallPageHtml(readFileSync('scripts/install-page.html','utf8'),{host:process.env.SILO_PUBLIC_HOST||'silo-games.pages.dev',url:'/?install=1'}));
writeFileSync(`${out}/_headers`,'/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Cache-Control: public, max-age=0, must-revalidate\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n');
writeFileSync(`${out}/404.html`,'<!doctype html><title>Silo Games</title><h1>Page not found</h1><a href="/">Return to Silo Games</a>');
console.log('Cloudflare Pages deploy directory: .output/public (static files only)');
