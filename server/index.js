const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
// node-fetch v3 ESM dynamic import pattern for CommonJS
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 8788;
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.GROQ_AI_API_KEY; // set in server/.env

app.get('/health', (_req, res) => res.json({ ok: true }));

// Chat completion proxy tailored for image-context Q&A
app.post('/qa', async (req, res) => {
  try {
    const { messages, model, temperature, max_tokens } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array required' });
    }
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY not set on server' });
    }

    // Prepend a system guardrail to keep Q&A on image context
    const system = {
      role: 'system',
      content:
        'You answer strictly about the provided image context. If off-topic, reply exactly: "Please ask in the context of the current image." Keep answers concise (2–4 sentences). Prefer factual specificity. If unsure, say so briefly.'
    };

    const body = {
      model: model || 'llama-3.3-70b-versatile',
      messages: [system, ...messages],
      temperature: typeof temperature === 'number' ? temperature : 0.3,
      max_tokens: typeof max_tokens === 'number' ? max_tokens : 350
    };

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(500).json({ error: data });
    }
    const answer = data?.choices?.[0]?.message?.content?.trim() || '';
    return res.json({ answer });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`QA backend listening on http://127.0.0.1:${PORT}`);
});
