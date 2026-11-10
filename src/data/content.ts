import artManifest from './art.json';

export type Swatch = 'vermilion' | 'cobalt' | 'ochre' | 'lime' | 'ink';

export const CONTACT = {
  email: 'liamcooneyh@gmail.com',
  linkedin: 'https://www.linkedin.com/in/liam-cooney',
  github: 'https://github.com/liamcooneyh',
};

export type Job = {
  id: string;
  company: string;
  role: string;
  when: string;
  where: string;
  swatch: Swatch;
  oneLiner: string;
  /** The whole job split into areas of work, condensed from the bullets. Every bullet lands in one area. */
  areas: JobArea[];
  /** The brief's full wording, kept as the source for the areas. */
  bullets: string[];
};

export type JobArea = { title: string; text: string; tools: string[] };

export const JOBS: Job[] = [
  {
    id: 'shelf',
    company: 'Shelf',
    role: 'GTM Operations',
    when: 'Sep 2026 – Present',
    where: 'New York, NY',
    swatch: 'lime',
    oneLiner:
      'I build and run the systems behind Shelf’s sales and marketing teams, starting with the internal GTM tool that’s replacing Salesforce.',
    areas: [
      { title: 'The GTM tool', text: 'Data model, pipeline stages, and deal workflows for the in-house tool replacing Salesforce.', tools: [] },
      { title: 'Production code', text: 'Pull requests that make the tool work for AEs and executives: redesigns, clearer data, bug fixes, API changes.', tools: [] },
      { title: 'AI workflows', text: 'Document tagging by industry, persona, and stage, now in production. Tuned the criteria sales calls are scored against.', tools: [] },
      { title: 'Call analysis', text: 'Sentiment from sales calls, turned into what the playbooks and collateral need to explain.', tools: ['Python', 'SQL'] },
      { title: 'Data and leads', text: 'Gong and Salesforce data into Snowflake, leads sourced and enriched in Clay, A/B tests for marketing.', tools: ['Gong', 'Salesforce', 'Fivetran', 'Snowflake', 'Clay'] },
    ],
    bullets: [
      'Design the data model, pipeline and stage tracking, and deal workflows for Shelf’s internal GTM tool, a Salesforce replacement with built-in AI workflows that the sales team is starting to use.',
      'Ship pull requests to the tool’s production code to make it work for non-technical AEs and executives: page redesigns, clearer data presentation, bug fixes, and changes to the API behind it.',
      'Built an AI workflow, now in production, that tags documents by industry, persona, and stage. Also helped build the AI call-analysis workflow, tuning the criteria it scores sales calls against.',
      'Analyze sales call sentiment with Python and SQL to find what the sales team needs help explaining, which feeds the playbooks and collateral that support them.',
      'Move Gong and Salesforce data into Snowflake with Fivetran, source and enrich leads in Clay, and run A/B tests that inform marketing operations.',
    ],
  },
  {
    id: 'streamforce',
    company: 'StreamForce',
    role: 'Data Engineer',
    when: 'Jun 2025 – Sep 2026',
    where: 'Remote',
    swatch: 'cobalt',
    oneLiner:
      'A Salesforce-focused consultancy. I was the primary technical resource for five client accounts, usually two at a time, across trade associations, standardized testing, language education, and ed-tech.',
    areas: [
      { title: 'Client delivery', text: 'Primary technical resource for five client accounts: audited source systems, designed the pipelines, shipped them.', tools: [] },
      { title: 'Integrations', text: 'Workato and Apex builds, including a Planhat-to-Salesforce webhook that ran unattended at about 80 records a day.', tools: ['Workato', 'Apex', 'Planhat'] },
      { title: 'Migration', text: '400+ members’ records moved from WordPress into Salesforce after an acquisition, transformed and validated along the way.', tools: ['Python', 'SQL', 'Salesforce'] },
      { title: 'Data modeling', text: 'A master data management reference build with staging and mart models, tests, and docs.', tools: ['dbt Cloud', 'Snowflake'] },
      { title: 'Salesforce admin', text: 'Reports, dashboards, validation rules, and flows across client orgs.', tools: ['Salesforce'] },
    ],
    bullets: [
      'Built and QA’d integrations in Workato and Apex, including a Planhat-to-Salesforce webhook (event ingestion, activity creation, and recursion prevention) that ran unattended in production at about 80 records a day.',
      'Supported a post-acquisition migration of 400+ members’ records and all related data from WordPress into Salesforce, using Python and SQL to transform and validate them.',
      'Designed a master data management reference implementation in dbt Cloud and Snowflake, with layered staging and mart models, tests, and documentation.',
      'Owned pipeline design and delivery for clients: audited source systems, built ETL workflows, and developed transformation layers connecting operational data to analytics warehouses.',
      'Ran Salesforce and cross-system data administration: reports, dashboards, validation rules, and flows.',
    ],
  },
  {
    id: 'stonex',
    company: 'StoneX',
    role: 'Data Associate',
    when: 'Jun 2023 – Apr 2024',
    where: 'New York, NY',
    swatch: 'vermilion',
    oneLiner:
      'A global financial services firm. I built the data pipelines and reporting the compliance team ran on.',
    areas: [
      { title: 'Compliance pipelines', text: 'Built and automated the pipelines and recurring reports the compliance team ran on.', tools: ['Python', 'SQL', 'Azure Synapse'] },
      { title: 'Metric definitions', text: 'DAX measures and a semantic layer so every dashboard used the same definitions.', tools: ['Power BI', 'DAX'] },
      { title: 'Workload dashboard', text: 'The full pipeline behind a real-time view of compliance staff workloads and scheduling.', tools: ['Power BI'] },
    ],
    bullets: [
      'Built and automated compliance data pipelines in Python, SQL, and Azure Synapse, and automated recurring reporting and data-prep work.',
      'Designed DAX measures, model relationships, and semantic layer logic in Power BI to keep metric definitions consistent across every downstream dashboard.',
      'Built the full pipeline behind a real-time Power BI dashboard tracking compliance staff workloads and scheduling projections.',
    ],
  },
  {
    id: 'zippin',
    company: 'Zippin',
    role: 'Business Intelligence Analyst',
    when: 'Jun 2022 – Mar 2023',
    where: 'Remote',
    swatch: 'ochre',
    oneLiner:
      'A checkout-free retail startup built on computer vision. I was one of two data people supporting the whole company.',
    areas: [
      { title: 'Self-service quoting', text: 'A quoting tool detailed enough to price custom store builds, which took the data team out of every Sales quote.', tools: ['Google Sheets', 'Apps Script', 'JavaScript'] },
      { title: 'Live forecasts', text: 'Sales forecasts for stadium stores, run during NFL games and landing within a few percent of the final counts.', tools: [] },
      { title: 'Chargebacks', text: 'Payment data by processor and card type to find which cards got charged back, with findings for the stores hit most.', tools: ['Stripe', 'BigQuery'] },
      { title: 'Warehouse and reporting', text: 'The warehouse and reporting behind Sales, Operations, and Finance, presented up to the C-suite.', tools: ['BigQuery', 'Grafana'] },
    ],
    bullets: [
      'Built a self-service quoting (CPQ) tool from scratch in Google Sheets and Apps Script, writing the JavaScript by hand, with calculators detailed enough to price fully custom store builds down to the wiring. It took the data team out of the path of every Sales quote.',
      'Ran a predictive model at the end of the third quarter of NFL games that forecast final sales for a stadium’s checkout-free stores, landing within a few percent of the stadium’s own counts the next day.',
      'Analyzed Stripe payment data in BigQuery by processor and card type to find which cards were most likely to be charged back, and gave the most-affected stores specific findings.',
      'Designed the BigQuery warehouse structure and reporting layer behind Sales, Operations, and Finance, presented analyses to directors, VPs, and the C-suite, and watched live retail operations in Grafana.',
    ],
  },
];

export type Project = {
  id: string;
  name: string;
  tag: string;
  pitch: string;
  steps: string[];
  stack: string[];
  link?: string;
  swatch: Swatch;
  size: 'big' | 'small';
};

export const PROJECTS: Project[] = [
  {
    id: 'legwork',
    name: 'Legwork',
    tag: 'Personal project, 2026 – Present',
    pitch:
      'A job-search system that ranks, verifies, and tracks. It’s deployed and runs every day: it pulls thousands of postings on a schedule, scores each one against a candidate profile, and tailors materials only from facts it can verify. I review and submit every application myself.',
    steps: [
      'Pulls postings from Greenhouse, Lever, and Ashby boards and LinkedIn alert emails, matching alerts to the company’s own posting and flagging reposts and duplicates',
      'Scores each posting with Claude against a structured rubric, with a second opinion from a stronger model when a score lands near the cutoff',
      'Tailors resumes and cover letters from a single verified profile, with an automated fact-check that blocks any claim the profile doesn’t support',
      'An evaluation harness ranks tailored resumes against synthetic competing applicants across eight LLM reviewer personas',
      'Versions every profile edit and re-scores open jobs, tracks each application’s stage from email replies, and fills forms through a Chrome extension for human review',
    ],
    stack: ['Python', 'FastAPI', 'Jinja', 'SQLite', 'Claude API', 'Chrome extension', 'Fly.io'],
    link: 'https://github.com/liamcooneyh/legwork',
    swatch: 'cobalt',
    size: 'big',
  },
  {
    id: 'agent',
    name: 'Account planning agent',
    tag: 'Client demo, StreamForce',
    pitch:
      'A working demo for a prospective client, run on mock data. It pulled CRM data, assembled account context, had an LLM write a strategic plan, and wrote it back to Salesforce custom objects.',
    steps: ['Extract CRM data', 'Assemble account context in Postgres', 'Generate the plan with an LLM', 'Write back to custom objects'],
    stack: ['Python', 'PostgreSQL', 'LLM APIs', 'Salesforce'],
    swatch: 'vermilion',
    size: 'small',
  },
  {
    id: 'f1',
    name: 'F1 ELT pipeline',
    tag: 'Personal project, 2026 – Present',
    pitch:
      'Daily Formula 1 race data, from a public API to a Looker Studio dashboard with live filters across circuits, drivers, and constructors.',
    steps: [
      'Python ingests race data every day',
      'dbt staging, intermediate, and mart models in BigQuery, with tests and a documented semantic layer',
      'GitHub Actions runs it daily, with code review and CI/CD',
    ],
    stack: ['Python', 'dbt', 'BigQuery', 'GitHub Actions', 'Looker Studio'],
    link: 'https://github.com/liamcooneyh/f1-elt',
    swatch: 'ochre',
    size: 'small',
  },
  {
    id: 'spotify',
    name: 'Music metadata app',
    tag: 'Retired, 2024 – 2026',
    pitch:
      'An MVP in Python (Flask) and React that used Spotify’s API to analyze and surface music metadata for producers. Retired after Spotify’s API changes in early 2026.',
    steps: [],
    stack: ['Python', 'Flask', 'React', 'Spotify API'],
    swatch: 'ink',
    size: 'small',
  },
];

export const TOOLKIT: { group: string; items: string[] }[] = [
  { group: 'Data', items: ['Python', 'SQL', 'dbt', 'Snowflake', 'BigQuery', 'PostgreSQL', 'Fivetran'] },
  { group: 'Business systems', items: ['Salesforce (Flows, Apex, SOQL)', 'HubSpot', 'Workato', 'Planhat', 'Clay', 'REST APIs'] },
  { group: 'Analytics', items: ['Power BI', 'Looker', 'Tableau', 'Grafana', 'Excel and Sheets modeling'] },
  { group: 'Cloud and delivery', items: ['GCP', 'AWS', 'Azure', 'Docker', 'Git', 'GitHub Actions'] },
  { group: 'AI and apps', items: ['Claude Code', 'Claude API', 'FastAPI', 'Apps Script'] },
];

export const CERTIFICATIONS = ['Salesforce Certified Platform Foundations', 'Snowflake Badge 1'];

export type Artwork = {
  id: string;
  w: number;
  h: number;
  title: string | null;
  year: string | null;
  kind: string | null;
  hero: boolean;
  heroOrder?: number | null;
  v?: string;
  section: 'painting' | 'sketch';
  alt?: string;
};

const ARTWORKS = artManifest as Artwork[];

export const HERO_ART = ARTWORKS.filter((piece) => piece.hero).sort(
  (a, b) => (a.heroOrder ?? 99) - (b.heroOrder ?? 99),
);
export const PAINTINGS = ARTWORKS.filter((piece) => piece.section === 'painting');
export const SKETCHES = ARTWORKS.filter((piece) => piece.section === 'sketch');

export const artSrc = (artwork: Artwork, size: 's' | 'l') =>
  `/art/${artwork.id}-${size}.webp${artwork.v ? `?v=${artwork.v}` : ''}`;

export const describeArt = (artwork: Artwork) =>
  artwork.alt ??
  [
    artwork.title ? `“${artwork.title}”` : artwork.section === 'sketch' ? 'Sketch by Liam Cooney' : 'Painting by Liam Cooney',
    artwork.kind?.toLowerCase(),
    artwork.year,
  ]
    .filter(Boolean)
    .join(', ');

export const captionArt = (artwork: Artwork) =>
  [artwork.title ? `“${artwork.title}”` : artwork.section === 'sketch' ? 'Sketchbook' : 'Untitled', artwork.kind?.toLowerCase(), artwork.year]
    .filter(Boolean)
    .join(', ');
