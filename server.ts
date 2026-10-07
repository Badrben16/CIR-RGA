import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { runPageAudit } from './src/engine/browserRunner.js';
import { AuditJob, PageAuditResult } from './src/types/audit.js';
import { generateExcelReport, generateHtmlReport, generatePdfReport } from './src/reporting/exportService.js';
import { testPages } from './src/server/testPages.js';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));

// In-memory store for audit jobs
const jobsStore = new Map<string, AuditJob>();

// --- Embedded Test Laboratory Pages ---
app.get('/test-pages/:slug', (req, res) => {
  const page = testPages[req.params.slug];
  if (!page) {
    return res.status(404).send('Page de test introuvable');
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(page.html);
});

app.get('/api/test-pages', (req, res) => {
  const list = Object.entries(testPages).map(([slug, p]) => ({
    slug,
    title: p.title,
    description: p.description,
    localUrl: `http://localhost:${PORT}/test-pages/${slug}`
  }));
  res.json({ testPages: list });
});

// --- API: Start Audit ---
app.post('/api/audit/start', async (req, res) => {
  try {
    const { urls, options } = req.body;
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'La liste des URLs est requise (tableau non vide).' });
    }

    // Nettoyage et validation des URLs
    const sanitizedUrls: string[] = urls.map((u: string) => {
      let trimmed = u.trim();
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        trimmed = `https://${trimmed}`;
      }
      return trimmed;
    });

    const jobId = `job-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const job: AuditJob = {
      id: jobId,
      status: 'RUNNING',
      createdAt: new Date().toISOString(),
      options: {
        simulateKeyboard: options?.simulateKeyboard ?? true,
        simulateForms: options?.simulateForms ?? true,
        simulateZoom: options?.simulateZoom ?? true,
        takeScreenshots: options?.takeScreenshots ?? true,
        timeout: options?.timeout ?? 30000
      },
      urls: sanitizedUrls,
      currentUrlIndex: 0,
      totalUrls: sanitizedUrls.length,
      results: [],
      globalSummary: {
        totalChecks: 0,
        totalOK: 0,
        totalKO: 0,
        totalAVerifier: 0,
        totalNA: 0
      }
    };

    jobsStore.set(jobId, job);

    // Launch audit process in background asynchronously
    processAuditJob(job).catch(err => {
      console.error(`Erreur sur le job ${jobId}:`, err);
      job.status = 'FAILED';
    });

    res.json({
      jobId,
      status: 'RUNNING',
      message: 'Audit démarré avec succès.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper background runner with controlled concurrency
async function processAuditJob(job: AuditJob) {
  for (let i = 0; i < job.urls.length; i++) {
    job.currentUrlIndex = i;
    const url = job.urls[i];
    try {
      const pageResult = await runPageAudit(url, job.options);
      job.results.push(pageResult);

      // Mettre à jour les stats globales
      job.globalSummary.totalOK += pageResult.statusCounts.OK;
      job.globalSummary.totalKO += pageResult.statusCounts.KO;
      job.globalSummary.totalAVerifier += pageResult.statusCounts.A_VERIFIER;
      job.globalSummary.totalNA += pageResult.statusCounts.NON_APPLICABLE;
      job.globalSummary.totalChecks += pageResult.statusCounts.total;
    } catch (pageErr: any) {
      console.error(`Échec sur ${url}:`, pageErr);
      job.results.push({
        id: `audit-${Date.now()}`,
        url,
        title: 'Erreur inattendue',
        timestamp: new Date().toISOString(),
        durationMs: 0,
        viewport: { width: 1366, height: 768 },
        statusCounts: { OK: 0, KO: 0, A_VERIFIER: 0, NON_APPLICABLE: 0, total: 0 },
        rules: [],
        error: {
          type: 'UNEXPECTED_ERROR',
          message: pageErr.message || 'Une erreur inattendue est survenue pendant l\'analyse de la page.',
          isAccessibilityKO: false
        }
      });
    }
  }

  job.status = 'COMPLETED';
  job.completedAt = new Date().toISOString();
}

// --- API: Get Job Status ---
app.get('/api/audit/jobs/:id', (req, res) => {
  const job = jobsStore.get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job introuvable' });
  }
  res.json(job);
});

// --- API: List Recent Jobs ---
app.get('/api/audit/jobs', (req, res) => {
  const list = Array.from(jobsStore.values())
    .slice(-10)
    .reverse()
    .map(j => ({
      id: j.id,
      status: j.status,
      createdAt: j.createdAt,
      totalUrls: j.totalUrls,
      completedUrls: j.results.length,
      globalSummary: j.globalSummary
    }));
  res.json({ jobs: list });
});

// --- API: Export Excel ---
app.get('/api/audit/export/excel/:id', async (req, res) => {
  const job = jobsStore.get(req.params.id);
  if (!job) {
    return res.status(404).send('Job introuvable');
  }

  try {
    const buffer = await generateExcelReport(job);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="pre-audit-rgaa-${job.id}.xlsx"`);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).send(`Erreur lors de la génération Excel : ${err.message}`);
  }
});

// --- API: Export PDF ---
app.get('/api/audit/export/pdf/:id', async (req, res) => {
  const job = jobsStore.get(req.params.id);
  if (!job) {
    return res.status(404).send('Job introuvable');
  }

  try {
    const pdfBuffer = await generatePdfReport(job);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rapport-audit-rgaa-${job.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('Erreur génération PDF:', err);
    res.status(500).send(`Erreur lors de la génération PDF : ${err.message}`);
  }
});

// --- API: Export HTML ---
app.get('/api/audit/export/html/:id', (req, res) => {
  const job = jobsStore.get(req.params.id);
  if (!job) {
    return res.status(404).send('Job introuvable');
  }

  const html = generateHtmlReport(job);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `inline; filename="rapport-pre-audit-${job.id}.html"`);
  res.send(html);
});

// --- API: Export JSON ---
app.get('/api/audit/export/json/:id', (req, res) => {
  const job = jobsStore.get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job introuvable' });
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="pre-audit-rgaa-${job.id}.json"`);
  res.json(job);
});

// --- Vite Middleware & Production Serving ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Assistant RGAA Server en écoute sur http://0.0.0.0:${PORT}`);
  });
}

startServer();
