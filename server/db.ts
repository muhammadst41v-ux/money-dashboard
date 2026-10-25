import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'money_dashboard.sqlite');

let SQL: SqlJsStatic;
let db: Database;

export interface IncomeEntryDB {
  id: string;
  date: string;
  amount: number;
  category: string;
  source: string;
  note: string;
  status: 'Received' | 'Pending';
  connector_id: string;
  external_id: string;
  is_sample: number;
  created_at: string;
  updated_at: string;
}

export interface StreamDB {
  id: string;
  name: string;
  color: string;
  icon: string;
  is_default: number;
  created_at: string;
}

export interface StreamRuleDB {
  id: string;
  pattern: string;
  stream_name: string;
  created_at: string;
}

export interface ConnectorDB {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'not_connected' | 'syncing' | 'error';
  last_synced_at: string | null;
  config_json: string;
}

export interface GoalDB {
  month: string;
  target_amount: number;
  updated_at: string;
}

/**
 * Initializes the SQLite database via sql.js, creating tables and loading disk cache.
 */
export async function initDatabase(): Promise<Database> {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
    } catch (err) {
      console.warn('Could not read existing SQLite file, creating fresh database:', err);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS income_entries (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      source TEXT NOT NULL,
      note TEXT DEFAULT '',
      status TEXT DEFAULT 'Received',
      connector_id TEXT DEFAULT 'manual',
      external_id TEXT DEFAULT '',
      is_sample INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS streams (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stream_rules (
      id TEXT PRIMARY KEY,
      pattern TEXT NOT NULL,
      stream_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS connectors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      last_synced_at TEXT,
      config_json TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS goals (
      month TEXT PRIMARY KEY,
      target_amount REAL NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_entries_date ON income_entries (date);
    CREATE INDEX IF NOT EXISTS idx_entries_connector ON income_entries (connector_id, external_id);
  `);

  // Seed default streams if empty
  const streamsCount = queryOne<{ count: number }>('SELECT count(*) as count FROM streams')?.count || 0;
  if (streamsCount === 0) {
    const defaults = [
      { id: 'stream-client-work', name: 'Client Work', color: '#3B82F6', icon: 'Briefcase', is_default: 1 },
      { id: 'stream-brand-deals', name: 'Brand Deals', color: '#F59E0B', icon: 'Megaphone', is_default: 1 },
      { id: 'stream-product-sales', name: 'Product Sales', color: '#10B981', icon: 'ShoppingBag', is_default: 1 },
      { id: 'stream-other', name: 'Other', color: '#8B5CF6', icon: 'Sparkles', is_default: 1 },
    ];
    for (const d of defaults) {
      db.run(
        'INSERT INTO streams (id, name, color, icon, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [d.id, d.name, d.color, d.icon, d.is_default, new Date().toISOString()]
      );
    }
  }

  // Seed default stream rules if empty
  const rulesCount = queryOne<{ count: number }>('SELECT count(*) as count FROM stream_rules')?.count || 0;
  if (rulesCount === 0) {
    const defaultRules = [
      { id: 'rule-stripe', pattern: 'stripe', stream_name: 'Product Sales' },
      { id: 'rule-gumroad', pattern: 'gumroad', stream_name: 'Product Sales' },
      { id: 'rule-lemon', pattern: 'lemon', stream_name: 'Product Sales' },
      { id: 'rule-sponsor', pattern: 'sponsor', stream_name: 'Brand Deals' },
      { id: 'rule-partner', pattern: 'partner', stream_name: 'Brand Deals' },
      { id: 'rule-consulting', pattern: 'consulting', stream_name: 'Client Work' },
      { id: 'rule-retainer', pattern: 'retainer', stream_name: 'Client Work' },
      { id: 'rule-adsense', pattern: 'adsense', stream_name: 'Other' },
    ];
    for (const r of defaultRules) {
      db.run(
        'INSERT INTO stream_rules (id, pattern, stream_name, created_at) VALUES (?, ?, ?, ?)',
        [r.id, r.pattern, r.stream_name, new Date().toISOString()]
      );
    }
  }

  // Seed connectors
  const hasStripeKey = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'rk_live_or_test_your_restricted_read_only_key');
  const hasGoogleKey = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  const initialConnectors = [
    {
      id: 'manual',
      name: 'Manual & CSV Entry',
      type: 'manual',
      status: 'connected' as const,
      last_synced_at: new Date().toISOString(),
      config_json: JSON.stringify({ alwaysActive: true }),
    },
    {
      id: 'sheets',
      name: 'Google Sheets',
      type: 'google_sheets',
      status: hasGoogleKey ? ('connected' as const) : ('not_connected' as const),
      last_synced_at: null,
      config_json: JSON.stringify({
        hasEnvKeys: hasGoogleKey,
        sheetUrl: '',
        range: 'A2:F',
      }),
    },
    {
      id: 'stripe',
      name: 'Stripe Payments',
      type: 'stripe',
      status: hasStripeKey ? ('connected' as const) : ('not_connected' as const),
      last_synced_at: null,
      config_json: JSON.stringify({
        hasEnvKey: hasStripeKey,
        defaultCategory: 'Product Sales',
      }),
    },
    {
      id: 'gumroad_paypal',
      name: 'PayPal / Gumroad CSV',
      type: 'csv_importer',
      status: 'connected' as const,
      last_synced_at: null,
      config_json: JSON.stringify({ autoDetect: true }),
    },
  ];

  for (const c of initialConnectors) {
    const existing = queryOne('SELECT id FROM connectors WHERE id = ?', [c.id]);
    if (!existing) {
      db.run(
        'INSERT INTO connectors (id, name, type, status, last_synced_at, config_json) VALUES (?, ?, ?, ?, ?, ?)',
        [c.id, c.name, c.type, c.status, c.last_synced_at, c.config_json]
      );
    } else {
      // update status based on current env
      db.run('UPDATE connectors SET status = ? WHERE id = ?', [c.status, c.id]);
    }
  }

  // Check if income entries are empty -> seed 6 months of sample data
  const entriesCount = queryOne<{ count: number }>('SELECT count(*) as count FROM income_entries')?.count || 0;
  if (entriesCount === 0) {
    seedSampleData();
  }

  persistDatabase();
  return db;
}

export function persistDatabase(): void {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Failed to persist SQLite database to disk:', err);
  }
}

export function queryAll<T>(sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return rows;
}

export function queryOne<T>(sql: string, params: any[] = []): T | null {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let result: T | null = null;
  if (stmt.step()) {
    result = stmt.getAsObject() as unknown as T;
  }
  stmt.free();
  return result;
}

export function run(sql: string, params: any[] = []): void {
  db.run(sql, params);
  persistDatabase();
}

/**
 * Automatically maps a source name to a stream category using rules.
 */
export function autoMapStream(sourceName: string, fallbackCategory = 'Client Work'): string {
  const rules = queryAll<StreamRuleDB>('SELECT * FROM stream_rules');
  const lowerSource = sourceName.toLowerCase();
  for (const r of rules) {
    if (lowerSource.includes(r.pattern.toLowerCase())) {
      return r.stream_name;
    }
  }
  return fallbackCategory;
}

/**
 * Seeds 6 months of rich, realistic creator sample data (May 2026 - October 2026).
 */
export function seedSampleData(): void {
  const samples = [
    // May 2026
    { id: 's-05-1', date: '2026-05-04', amount: 140000, category: 'Client Work', source: 'TechCorp Solutions', note: 'Mobile app UX sprint kickoff', status: 'Received' },
    { id: 's-05-2', date: '2026-05-12', amount: 95000, category: 'Brand Deals', source: 'NordPass Security', note: 'YouTube 60s integration segment', status: 'Received' },
    { id: 's-05-3', date: '2026-05-20', amount: 68000, category: 'Product Sales', source: 'Gumroad Store', note: 'Notion Freelance OS bundle sales', status: 'Received' },
    { id: 's-05-4', date: '2026-05-28', amount: 32000, category: 'Other', source: 'YouTube AdSense', note: 'Monthly video monetization payout', status: 'Received' },

    // June 2026
    { id: 's-06-1', date: '2026-06-03', amount: 175000, category: 'Client Work', source: 'FinEdge Global', note: 'Design system tokens and responsive dashboard', status: 'Received' },
    { id: 's-06-2', date: '2026-06-14', amount: 110000, category: 'Brand Deals', source: 'Hostinger Cloud', note: 'Newsletter sponsorship feature & social post', status: 'Received' },
    { id: 's-06-3', date: '2026-06-22', amount: 72000, category: 'Product Sales', source: 'Lemon Squeezy', note: 'Figma UI Kit commercial licenses', status: 'Received' },
    { id: 's-06-4', date: '2026-06-29', amount: 38000, category: 'Other', source: '1-on-1 Mentorship (Topmate)', note: 'Four advisory & portfolio critique calls', status: 'Received' },

    // July 2026
    { id: 's-07-1', date: '2026-07-06', amount: 160000, category: 'Client Work', source: 'VentureCraft Studio', note: 'Webflow custom marketing landing page build', status: 'Received' },
    { id: 's-07-2', date: '2026-07-15', amount: 125000, category: 'Brand Deals', source: 'Skillshare Creator Partner', note: 'Sponsored project challenge and community workshop', status: 'Received' },
    { id: 's-07-3', date: '2026-07-23', amount: 92000, category: 'Product Sales', source: 'Gumroad Store', note: 'Summer creator bundle launch flash sale', status: 'Received' },
    { id: 's-07-4', date: '2026-07-28', amount: 55000, category: 'Other', source: 'YouTube AdSense', note: 'AI freelance workflow video ad revenue', status: 'Received' },

    // August 2026
    { id: 's-08-1', date: '2026-08-04', amount: 150000, category: 'Client Work', source: 'TechCorp Solutions', note: 'Phase 2 UI implementation support & QA', status: 'Received' },
    { id: 's-08-2', date: '2026-08-13', amount: 90000, category: 'Brand Deals', source: 'Cursor AI Tooling', note: 'Dedicated workflow tutorial video & LinkedIn article', status: 'Received' },
    { id: 's-08-3', date: '2026-08-21', amount: 85000, category: 'Product Sales', source: 'Lemon Squeezy', note: 'Monthly recurring template and community subscriptions', status: 'Received' },
    { id: 's-08-4', date: '2026-08-29', amount: 50000, category: 'Other', source: 'Affiliate Commissions', note: 'Webflow, Figma, and Setapp affiliate payouts', status: 'Received' },

    // September 2026
    { id: 's-09-1', date: '2026-09-02', amount: 220000, category: 'Client Work', source: 'Apex Logistics Corp', note: 'Enterprise B2B portal redesign contract milestone 1', status: 'Received' },
    { id: 's-09-2', date: '2026-09-11', amount: 140000, category: 'Brand Deals', source: 'Notion Official', note: 'Productivity Q3 campaign sponsorship package', status: 'Received' },
    { id: 's-09-3', date: '2026-09-20', amount: 115000, category: 'Product Sales', source: 'Gumroad Store', note: 'Freelance Masterclass mini-course preorder batch', status: 'Received' },
    { id: 's-09-4', date: '2026-09-27', amount: 40000, category: 'Other', source: 'YouTube AdSense', note: 'Monthly creator ad earnings', status: 'Received' },

    // October 2026 (Current month with realistic pending invoices)
    { id: 's-10-1', date: '2026-10-05', amount: 240000, category: 'Client Work', source: 'Apex Logistics Corp', note: 'Milestone 2 frontend handover & style guides', status: 'Received' },
    { id: 's-10-2', date: '2026-10-12', amount: 130000, category: 'Brand Deals', source: 'Figma Community Event', note: 'Keynote presentation & guest webinar lead session', status: 'Received' },
    { id: 's-10-3', date: '2026-10-18', amount: 95000, category: 'Product Sales', source: 'Gumroad & LemonSqueezy', note: 'Digital templates monthly downloads volume', status: 'Received' },
    { id: 's-10-4', date: '2026-10-22', amount: 70000, category: 'Client Work', source: 'FinEdge Global', note: 'Quarterly design maintenance & brand advisory retainer', status: 'Pending' },
    { id: 's-10-5', date: '2026-10-24', amount: 45000, category: 'Other', source: 'YouTube AdSense & Affiliates', note: 'Expected end-of-month bank deposit payout', status: 'Pending' },
  ];

  const now = new Date().toISOString();
  for (const s of samples) {
    db.run(
      `INSERT OR REPLACE INTO income_entries 
       (id, date, amount, category, source, note, status, connector_id, external_id, is_sample, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'sample', ?, 1, ?, ?)`,
      [s.id, s.date, s.amount, s.category, s.source, s.note, s.status, s.id, now, now]
    );
  }

  // Also seed sample goals
  const sampleGoals = [
    { month: '2026-05', target: 320000 },
    { month: '2026-06', target: 380000 },
    { month: '2026-07', target: 420000 },
    { month: '2026-08', target: 420000 },
    { month: '2026-09', target: 500000 },
    { month: '2026-10', target: 550000 },
  ];

  for (const g of sampleGoals) {
    db.run('INSERT OR REPLACE INTO goals (month, target_amount, updated_at) VALUES (?, ?, ?)', [
      g.month,
      g.target,
      now,
    ]);
  }

  // Seed default settings
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('currency', 'PKR')");
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('creatorName', 'Hamza Khan')");
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('creatorHandle', '@hamza_creates')");
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('businessTitle', 'Independent Creator & Product Designer')");
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('financialYearStartMonth', '1')");

  persistDatabase();
}

/**
 * Wipes only sample data records without touching any user created entries.
 */
export function clearSampleData(): number {
  const result = queryOne<{ count: number }>('SELECT count(*) as count FROM income_entries WHERE is_sample = 1');
  const count = result?.count || 0;
  db.run('DELETE FROM income_entries WHERE is_sample = 1');
  persistDatabase();
  return count;
}
