import { useId } from 'react';
import LOGOS from '../data/logos.json';

type LogoArt = { viewBox: string; body: string };

/** Generic marks for things that aren't brands. */
const GLYPHS: Record<string, LogoArt> = {
  sql: {
    viewBox: '0 0 24 24',
    body: '<g fill="none" stroke="#1f4a86" stroke-width="2"><ellipse cx="12" cy="5.5" rx="7.5" ry="3"/><path d="M4.5 5.5v13c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-13M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/></g>',
  },
  api: {
    viewBox: '0 0 24 24',
    body: '<path fill="none" stroke="#1f4a86" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M8 4c-2 0-3 1-3 3v2.5C5 11 4 12 3 12c1 0 2 1 2 2.5V17c0 2 1 3 3 3M16 4c2 0 3 1 3 3v2.5c0 1.5 1 2.5 2 2.5-1 0-2 1-2 2.5V17c0 2-1 3-3 3"/>',
  },
};

/** Marks only published as images on the company's own site (public/logos). */
const IMAGES: Record<string, string> = {
  Fivetran: '/logos/fivetran.png',
  Planhat: '/logos/planhat.png',
  Clay: '/logos/clay.png',
};

/** Tool name as written in content.ts → logo key. Anything unmapped falls back to a monogram. */
const KEY_FOR: Record<string, string> = {
  Python: 'python',
  SQL: 'sql',
  dbt: 'dbt',
  'dbt Cloud': 'dbt',
  Snowflake: 'snowflake',
  BigQuery: 'bigquery',
  PostgreSQL: 'postgresql',
  'Salesforce (Flows, Apex, SOQL)': 'salesforce',
  Salesforce: 'salesforce',
  Apex: 'salesforce',
  HubSpot: 'hubspot',
  'REST APIs': 'api',
  'Power BI': 'powerbi',
  DAX: 'powerbi',
  Looker: 'looker',
  Tableau: 'tableau',
  Grafana: 'grafana',
  'Excel and Sheets modeling': 'sheets',
  'Google Sheets': 'sheets',
  GCP: 'gcp',
  AWS: 'aws',
  Azure: 'azure',
  'Azure Synapse': 'azure',
  Docker: 'docker',
  Git: 'git',
  'GitHub Actions': 'githubactions',
  'Claude Code': 'claude',
  'Claude API': 'claude',
  FastAPI: 'fastapi',
  'Apps Script': 'appsscript',
  JavaScript: 'javascript',
  Stripe: 'stripe',
  Gong: 'gong',
  Workato: 'workato',
  Jinja: 'jinja',
  SQLite: 'sqlite',
  'Chrome extension': 'chrome',
  'Fly.io': 'fly',
  'LLM APIs': 'api',
  'Looker Studio': 'looker',
  Flask: 'flask',
  React: 'react',
  'Spotify API': 'spotify',
};

const artFor = (tool: string): LogoArt | undefined => {
  const key = KEY_FOR[tool];
  if (!key) return undefined;
  return GLYPHS[key] ?? (LOGOS as Record<string, LogoArt>)[key];
};

/** Logo SVGs carry gradient ids; suffix them so repeated logos never point at a hidden copy. */
const uniqueIds = (body: string, suffix: string) =>
  body
    .replace(/id="([^"]+)"/g, `id="$1${suffix}"`)
    .replace(/url\(#([^)]+)\)/g, `url(#$1${suffix})`)
    .replace(/href="#([^"]+)"/g, `href="#$1${suffix}"`);

export const ToolLogo = ({ tool }: { tool: string }) => {
  const suffix = useId().replace(/[^a-zA-Z0-9]/g, '');
  const art = artFor(tool);
  const image = IMAGES[tool];
  if (image) {
    return (
      <span className="logo" aria-hidden="true">
        <img src={image} alt="" width={48} height={48} />
      </span>
    );
  }
  if (!art) {
    return (
      <span className="logo logo--mono" aria-hidden="true">
        {tool.charAt(0)}
      </span>
    );
  }
  return (
    <span className="logo" aria-hidden="true">
      <svg viewBox={art.viewBox} dangerouslySetInnerHTML={{ __html: uniqueIds(art.body, suffix) }} />
    </span>
  );
};
