// Writes src/data/logos.json with only the logos the site uses.
// Sources: @iconify-json/logos (full colour), simple-icons (single colour, CC0), and tools/logos/brand.
// usage: node tools/logos/build_logos.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as si from 'simple-icons';

const require = createRequire(import.meta.url);
const logos = require('@iconify-json/logos/icons.json');

const FROM_LOGOS = {
  python: 'python', dbt: 'dbt-icon', snowflake: 'snowflake-icon', postgresql: 'postgresql',
  salesforce: 'salesforce', powerbi: 'microsoft-power-bi', looker: 'looker-icon',
  tableau: 'tableau-icon', grafana: 'grafana', gcp: 'google-cloud', aws: 'aws', azure: 'microsoft-azure',
  docker: 'docker-icon', git: 'git-icon', githubactions: 'github-actions', claude: 'claude-icon',
  fastapi: 'fastapi-icon', javascript: 'javascript',
  sqlite: 'sqlite', chrome: 'chrome', fly: 'fly-icon', flask: 'flask', react: 'react', spotify: 'spotify-icon',
};
const FROM_SIMPLE = { bigquery: 'siGooglebigquery', sheets: 'siGooglesheets', appsscript: 'siGoogleappsscript', hubspot: 'siHubspot', stripe: 'siStripe', jinja: 'siJinja' };

const out = {};
for (const [key, name] of Object.entries(FROM_LOGOS)) {
  const icon = logos.icons[name];
  if (!icon) throw new Error(`missing logos:${name}`);
  out[key] = { viewBox: `0 0 ${icon.width ?? logos.width ?? 256} ${icon.height ?? logos.height ?? 256}`, body: icon.body };
}
for (const [key, name] of Object.entries(FROM_SIMPLE)) {
  const icon = si[name];
  if (!icon) throw new Error(`missing simple-icons ${name}`);
  out[key] = { viewBox: '0 0 24 24', body: `<path fill="#${icon.hex}" d="${icon.path}"/>` };
}
// official marks saved from each company's own site (tools/logos/brand/*.svg)
const brandDir = new URL('./brand/', import.meta.url);
for (const file of readdirSync(brandDir).filter((name) => name.endsWith('.svg'))) {
  const svg = readFileSync(new URL(file, brandDir), 'utf8');
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1];
  const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
  if (!viewBox) throw new Error(`no viewBox in ${file}`);
  out[file.replace('.svg', '')] = { viewBox, body };
}
writeFileSync(new URL('../../src/data/logos.json', import.meta.url), JSON.stringify(out));
console.log(Object.keys(out).length, 'logos');
