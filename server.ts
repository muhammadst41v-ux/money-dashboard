import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import {
  initDatabase,
  queryAll,
  queryOne,
  run,
  seedSampleData,
  clearSampleData,
  autoMapStream,
  IncomeEntryDB,
  StreamDB,
  StreamRuleDB,
  GoalDB,
} from './server/db';
import { getConnectorsStatus, syncConnector } from './server/connectors';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));

// Initialize SQLite database
initDatabase().then(() => {
  console.log('SQLite database initialized successfully');
}).catch((err) => {
  console.error('Failed to initialize SQLite database:', err);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    hasStripeKey: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'rk_live_or_test_your_restricted_read_only_key'),
    hasGoogleKey: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  });
});

// ==========================================
// INCOME ENTRIES API
// ==========================================
app.get('/api/income', (req, res) => {
  try {
    const entries = queryAll<IncomeEntryDB>(
      'SELECT * FROM income_entries ORDER BY date DESC, created_at DESC'
    );
    const sampleCount = queryOne<{ count: number }>(
      'SELECT count(*) as count FROM income_entries WHERE is_sample = 1'
    )?.count || 0;

    res.json({
      success: true,
      entries,
      hasSampleData: sampleCount > 0,
      sampleCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/income', (req, res) => {
  try {
    const { date, amount, category, source, note, status } = req.body;
    if (!date || isNaN(Number(amount)) || !source) {
      return res.status(400).json({ error: 'Missing required fields: date, amount, source' });
    }

    const id = `inc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const finalCategory = category && category.trim() ? category.trim() : autoMapStream(source);

    run(
      `INSERT INTO income_entries 
       (id, date, amount, category, source, note, status, connector_id, external_id, is_sample, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', ?, 0, ?, ?)`,
      [id, date, Number(amount), finalCategory, source.trim(), note || '', status || 'Received', id, now, now]
    );

    const created = queryOne<IncomeEntryDB>('SELECT * FROM income_entries WHERE id = ?', [id]);
    res.json({ success: true, entry: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/income/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { date, amount, category, source, note, status } = req.body;
    const now = new Date().toISOString();

    run(
      `UPDATE income_entries 
       SET date = ?, amount = ?, category = ?, source = ?, note = ?, status = ?, updated_at = ? 
       WHERE id = ?`,
      [date, Number(amount), category, source, note || '', status, now, id]
    );

    const updated = queryOne<IncomeEntryDB>('SELECT * FROM income_entries WHERE id = ?', [id]);
    res.json({ success: true, entry: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/income/toggle-status/:id', (req, res) => {
  try {
    const { id } = req.params;
    const entry = queryOne<IncomeEntryDB>('SELECT * FROM income_entries WHERE id = ?', [id]);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    const newStatus = entry.status === 'Received' ? 'Pending' : 'Received';
    const now = new Date().toISOString();

    run('UPDATE income_entries SET status = ?, updated_at = ? WHERE id = ?', [newStatus, now, id]);
    res.json({ success: true, id, status: newStatus });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/income/:id', (req, res) => {
  try {
    const { id } = req.params;
    run('DELETE FROM income_entries WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CSV Import with de-duplication
app.post('/api/income/import-csv', (req, res) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'No entries provided for import' });
    }

    const now = new Date().toISOString();
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const amount = Number(e.amount);
      if (!e.date || isNaN(amount)) {
        skipped++;
        continue;
      }

      // De-duplication check: same date, source, amount, and category
      const extId = `csv-${e.date}-${e.source}-${amount}`;
      const exists = queryOne('SELECT id FROM income_entries WHERE external_id = ?', [extId]);
      if (exists) {
        skipped++;
        continue;
      }

      const id = `csv-${Date.now()}-${i}`;
      const category = e.category && e.category.trim() ? e.category.trim() : autoMapStream(e.source || '');

      run(
        `INSERT INTO income_entries 
         (id, date, amount, category, source, note, status, connector_id, external_id, is_sample, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'csv', ?, 0, ?, ?)`,
        [id, e.date, amount, category, e.source || 'CSV Import', e.note || '', e.status || 'Received', extId, now, now]
      );
      imported++;
    }

    res.json({
      success: true,
      imported,
      skipped,
      message: `Successfully imported ${imported} entries. ${skipped} duplicate(s) or invalid row(s) skipped.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// One-click clear sample data
app.post('/api/income/clear-sample', (req, res) => {
  try {
    const removedCount = clearSampleData();
    res.json({ success: true, removedCount, message: `Removed ${removedCount} sample entries.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Restore sample data
app.post('/api/income/reset-sample', (req, res) => {
  try {
    seedSampleData();
    res.json({ success: true, message: '6-month sample dataset restored successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Clear all data
app.post('/api/income/clear-all', (req, res) => {
  try {
    run('DELETE FROM income_entries');
    res.json({ success: true, message: 'All income entries cleared.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// STREAMS & RULES API
// ==========================================
app.get('/api/streams', (req, res) => {
  try {
    const streams = queryAll<StreamDB>('SELECT * FROM streams ORDER BY is_default DESC, name ASC');
    res.json({ success: true, streams });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/streams', (req, res) => {
  try {
    const { name, color, icon } = req.body;
    if (!name || !color) return res.status(400).json({ error: 'Stream name and color required' });

    const id = `stream-${Date.now()}`;
    const now = new Date().toISOString();
    run(
      'INSERT INTO streams (id, name, color, icon, is_default, created_at) VALUES (?, ?, ?, ?, 0, ?)',
      [id, name.trim(), color, icon || 'Briefcase', now]
    );

    const created = queryOne<StreamDB>('SELECT * FROM streams WHERE id = ?', [id]);
    res.json({ success: true, stream: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/streams/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, icon } = req.body;
    const oldStream = queryOne<StreamDB>('SELECT * FROM streams WHERE id = ?', [id]);
    if (!oldStream) return res.status(404).json({ error: 'Stream not found' });

    run('UPDATE streams SET name = ?, color = ?, icon = ? WHERE id = ?', [name.trim(), color, icon, id]);

    // If renamed, update entries
    if (oldStream.name !== name.trim()) {
      run('UPDATE income_entries SET category = ? WHERE category = ?', [name.trim(), oldStream.name]);
      run('UPDATE stream_rules SET stream_name = ? WHERE stream_name = ?', [name.trim(), oldStream.name]);
    }

    const updated = queryOne<StreamDB>('SELECT * FROM streams WHERE id = ?', [id]);
    res.json({ success: true, stream: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/streams/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stream = queryOne<StreamDB>('SELECT * FROM streams WHERE id = ?', [id]);
    if (stream) {
      run('UPDATE income_entries SET category = "Other" WHERE category = ?', [stream.name]);
      run('DELETE FROM stream_rules WHERE stream_name = ?', [stream.name]);
      run('DELETE FROM streams WHERE id = ?', [id]);
    }
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Auto-mapping Rules
app.get('/api/rules', (req, res) => {
  try {
    const rules = queryAll<StreamRuleDB>('SELECT * FROM stream_rules ORDER BY created_at DESC');
    res.json({ success: true, rules });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rules', (req, res) => {
  try {
    const { pattern, stream_name } = req.body;
    if (!pattern || !stream_name) {
      return res.status(400).json({ error: 'Pattern and stream_name required' });
    }

    const id = `rule-${Date.now()}`;
    const now = new Date().toISOString();
    run(
      'INSERT INTO stream_rules (id, pattern, stream_name, created_at) VALUES (?, ?, ?, ?)',
      [id, pattern.trim().toLowerCase(), stream_name, now]
    );

    const created = queryOne<StreamRuleDB>('SELECT * FROM stream_rules WHERE id = ?', [id]);
    res.json({ success: true, rule: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/rules/:id', (req, res) => {
  try {
    const { id } = req.params;
    run('DELETE FROM stream_rules WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rules/apply-all', (req, res) => {
  try {
    const entries = queryAll<IncomeEntryDB>('SELECT * FROM income_entries');
    let remapped = 0;

    for (const e of entries) {
      const targetCategory = autoMapStream(e.source, e.category);
      if (targetCategory !== e.category) {
        run('UPDATE income_entries SET category = ? WHERE id = ?', [targetCategory, e.id]);
        remapped++;
      }
    }

    res.json({ success: true, remapped, message: `Re-mapped ${remapped} entries according to current rules.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CONNECTORS API
// ==========================================
app.get('/api/connectors', (req, res) => {
  try {
    const connectors = getConnectorsStatus();
    res.json({ success: true, connectors });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/connectors/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await syncConnector(id, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// GOALS API
// ==========================================
app.get('/api/goals', (req, res) => {
  try {
    const goals = queryAll<GoalDB>('SELECT * FROM goals ORDER BY month ASC');
    res.json({ success: true, goals });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/goals', (req, res) => {
  try {
    const { month, target_amount } = req.body;
    if (!month || isNaN(Number(target_amount))) {
      return res.status(400).json({ error: 'Valid month and target_amount required' });
    }

    const now = new Date().toISOString();
    run(
      'INSERT OR REPLACE INTO goals (month, target_amount, updated_at) VALUES (?, ?, ?)',
      [month, Number(target_amount), now]
    );

    res.json({ success: true, goal: { month, target_amount: Number(target_amount), updated_at: now } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SETTINGS API
// ==========================================
app.get('/api/settings', (req, res) => {
  try {
    const rows = queryAll<{ key: string; value: string }>('SELECT * FROM settings');
    const settings: Record<string, string> = {
      currency: 'PKR',
      creatorName: 'Hamza Khan',
      creatorHandle: '@hamza_creates',
      businessTitle: 'Independent Creator & Product Designer',
      financialYearStartMonth: '1',
    };
    rows.forEach((r) => {
      settings[r.key] = r.value;
    });
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const updates = req.body;
    for (const [k, v] of Object.entries(updates)) {
      run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [k, String(v)]);
    }
    res.json({ success: true, settings: updates });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// AI INSIGHTS API (GEMINI 2.5 FLASH)
// ==========================================
app.post('/api/insights', async (req, res) => {
  try {
    const { incomeDataSummary, currency } = req.body;

    if (!incomeDataSummary) {
      return res.status(400).json({ error: 'No income data summary provided' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'Gemini API key is not configured in environment secrets.',
        needsKey: true,
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `Analyze this freelancer/creator financial dataset and provide truthful, data-grounded insights.
Strict rule: Rely ONLY on the numbers provided below. Never invent, hallucinate, or alter any numbers or clients.

Financial Data Summary (${currency || 'PKR'}):
${JSON.stringify(incomeDataSummary, null, 2)}

Provide:
1. Best Month (name of the highest grossing month, exact revenue, and brief why/breakdown)
2. Best Stream (top income stream, exact revenue, share percentage, and breakdown)
3. Trend (overall revenue trajectory, month-over-month growth patterns, and momentum)
4. Risks (identify 2-3 genuine concentration risks or cashflow warnings from this data, e.g. reliance on top client, proportion of pending payments, volatile monthly income)
5. 3 practical suggestions to grow income specifically tailored to these existing streams and clients.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are a premier CFO and financial strategist for freelance consultants, digital creators, and solopreneurs. Be direct, precise, data-grounded, and actionable. Never hallucinate numbers. Rely strictly on the supplied metrics.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bestMonth: {
              type: Type.OBJECT,
              properties: {
                month: { type: Type.STRING },
                revenue: { type: Type.NUMBER },
                details: { type: Type.STRING },
              },
              required: ['month', 'revenue', 'details'],
            },
            bestStream: {
              type: Type.OBJECT,
              properties: {
                stream: { type: Type.STRING },
                revenue: { type: Type.NUMBER },
                percentage: { type: Type.NUMBER },
                details: { type: Type.STRING },
              },
              required: ['stream', 'revenue', 'percentage', 'details'],
            },
            trend: {
              type: Type.OBJECT,
              properties: {
                direction: { type: Type.STRING, description: 'Growing, Stable, or Declining' },
                summary: { type: Type.STRING },
                details: { type: Type.STRING },
              },
              required: ['direction', 'summary', 'details'],
            },
            risks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 3 concise, factual financial risks identified in the data',
            },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 practical, high-leverage suggestions to grow income based on existing strengths',
            },
            executiveSummary: {
              type: Type.STRING,
              description: 'A punchy 2-sentence executive summary of financial health',
            },
          },
          required: ['bestMonth', 'bestStream', 'trend', 'risks', 'suggestions', 'executiveSummary'],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Empty response received from Gemini model');
    }

    const parsed = JSON.parse(responseText.trim());
    return res.json({ success: true, insights: parsed });
  } catch (err: any) {
    console.error('Error in /api/insights:', err);
    return res.status(500).json({
      error: err.message || 'Failed to generate insights from Gemini API',
      details: String(err),
    });
  }
});

// Vite or static serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Money Dashboard server running on port ${port}`);
  });
}

startServer();
