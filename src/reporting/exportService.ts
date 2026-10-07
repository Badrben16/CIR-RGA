import ExcelJS from 'exceljs';
import { PageAuditResult, AuditJob } from '../types/audit.js';
import { getBrowser } from '../engine/browserRunner.js';

export async function generateExcelReport(job: AuditJob): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AccessiBot v2 - Assistant Pré-Audit RGAA';
  workbook.created = new Date();

  // 1. Feuille Synthèse Globale
  const summarySheet = workbook.addWorksheet('Synthèse Globale');
  summarySheet.columns = [
    { header: 'Indicateur', key: 'metric', width: 35 },
    { header: 'Valeur', key: 'value', width: 45 }
  ];

  summarySheet.addRows([
    { metric: 'Date de l\'audit', value: new Date(job.createdAt).toLocaleString('fr-FR') },
    { metric: 'Nombre de pages analysées', value: job.results.length },
    { metric: 'Total des contrôles exécutés', value: job.globalSummary.totalChecks },
    { metric: 'Conformes (OK)', value: job.globalSummary.totalOK },
    { metric: 'Non-Conformes (KO)', value: job.globalSummary.totalKO },
    { metric: 'À vérifier (Validation humaine)', value: job.globalSummary.totalAVerifier },
    { metric: 'Non Applicables (NA)', value: job.globalSummary.totalNA },
    { metric: 'Taux de contrôles à vérifier', value: `${((job.globalSummary.totalAVerifier / Math.max(1, job.globalSummary.totalChecks)) * 100).toFixed(1)}%` }
  ]);

  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  summarySheet.views = [{ state: 'frozen', ySplit: 1 }];

  // 2. Feuilles par Page ou Feuille Détaillée
  for (const pageResult of job.results) {
    let sheetName = pageResult.title.replace(/[\\/?*[\]]/g, '').substring(0, 28) || 'Audit';
    let ws = workbook.getWorksheet(sheetName);
    if (ws) sheetName = `${sheetName.substring(0, 24)}_${Math.floor(Math.random() * 900)}`;

    const pageSheet = workbook.addWorksheet(sheetName);
    pageSheet.columns = [
      { header: 'Thématique RGAA', key: 'category', width: 24 },
      { header: 'Critère RGAA', key: 'criterion', width: 16 },
      { header: 'Titre du contrôle', key: 'title', width: 34 },
      { header: 'Statut', key: 'status', width: 16 },
      { header: 'Confiance', key: 'confidence', width: 14 },
      { header: 'Validation requise', key: 'humanValidation', width: 18 },
      { header: 'Observation (DOM / Réel)', key: 'observation', width: 45 },
      { header: 'Analyse & Décision', key: 'decision', width: 40 },
      { header: 'Justification méthodologique', key: 'justification', width: 45 },
      { header: 'Recommandation technique', key: 'recommendation', width: 45 },
      { header: 'Éléments en preuve (Sélecteurs / Extraits)', key: 'evidence', width: 50 },
      { header: 'URL de la page', key: 'url', width: 35 }
    ];

    pageSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    pageSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    pageSheet.getRow(1).height = 28;
    pageSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    pageSheet.views = [{ state: 'frozen', ySplit: 1 }];
    pageSheet.autoFilter = { from: 'A1', to: 'L1' };

    for (const rule of pageResult.rules) {
      const evidenceStr = rule.evidence
        .slice(0, 5)
        .map(e => `[${e.tagName}] ${e.selector} : ${e.issueDescription}`)
        .join('\n');

      const row = pageSheet.addRow({
        category: rule.category,
        criterion: rule.rgaaCriterion,
        title: rule.title,
        status: rule.status,
        confidence: rule.confidence,
        humanValidation: rule.humanValidationRequired ? 'OUI' : 'NON',
        observation: rule.observation,
        decision: `${rule.analysis}\n→ ${rule.decision}`,
        justification: rule.justification,
        recommendation: rule.recommendation,
        evidence: evidenceStr || 'Aucune anomalie spécifique',
        url: pageResult.url
      });

      row.alignment = { vertical: 'top', wrapText: true };
      row.height = 65;

      // Status color matching
      const statusCell = row.getCell('status');
      if (rule.status === 'OK') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
        statusCell.font = { color: { argb: 'FF15803D' }, bold: true };
      } else if (rule.status === 'KO') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        statusCell.font = { color: { argb: 'FFB91C1C' }, bold: true };
      } else if (rule.status === 'A_VERIFIER') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } };
        statusCell.font = { color: { argb: 'FFC2410C' }, bold: true };
      } else if (rule.status === 'NON_APPLICABLE') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        statusCell.font = { color: { argb: 'FF6B7280' } };
      }

      // Border style
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function generateHtmlReport(job: AuditJob): string {
  const dateStr = new Date(job.createdAt).toLocaleString('fr-FR');
  const total = job.globalSummary.totalChecks;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport d'Audit RGAA 4.1.2 - ${dateStr}</title>
  <style>
    @page {
      size: A4;
      margin: 14mm 12mm 14mm 12mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.5;
      background: #ffffff;
      color: #111827;
      margin: 0;
      padding: 24px;
      font-size: 13px;
    }
    .container { max-width: 1100px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-icon {
      width: 40px;
      height: 40px;
      background: #4f46e5;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: bold;
      font-size: 20px;
    }
    h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      color: #111827;
      letter-spacing: -0.02em;
    }
    .meta { color: #6b7280; font-size: 12px; margin-top: 4px; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      margin-bottom: 28px;
    }
    .kpi-card {
      background: #f9fafb;
      padding: 14px 16px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .kpi-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; }
    .kpi-val { font-size: 26px; font-weight: 800; margin-top: 4px; color: #111827; }
    
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .badge-ok { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-ko { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .badge-verif { background: #ffedd5; color: #9a3412; border: 1px solid #fed7aa; }
    .badge-na { background: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb; }

    .page-section { margin-top: 32px; }
    .page-title {
      font-size: 17px;
      font-weight: 700;
      color: #111827;
      border-bottom: 1.5px solid #e5e7eb;
      padding-bottom: 8px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .page-url { font-size: 12px; font-weight: 500; color: #4f46e5; }

    .rule-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .rule-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 8px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .rule-tag {
      font-size: 11px;
      font-weight: 700;
      color: #4f46e5;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .rule-criterion {
      font-family: monospace;
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      color: #374151;
      margin-left: 6px;
    }
    .rule-title { font-size: 15px; font-weight: 700; color: #111827; margin-top: 2px; }
    .rule-desc { color: #6b7280; font-size: 12px; margin-top: 2px; }

    .steps-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 12px 0;
      font-size: 12px;
    }
    .step-box {
      background: #f9fafb;
      border-left: 3px solid #cbd5e1;
      padding: 8px 12px;
      border-radius: 0 6px 6px 0;
    }
    .step-box.decision-ko { border-left-color: #ef4444; background: #fff5f5; }
    .step-box.decision-verif { border-left-color: #f97316; background: #fffaf0; }
    .step-box.decision-ok { border-left-color: #22c55e; background: #f0fdf4; }

    .step-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      margin-bottom: 3px;
    }

    .reco-box {
      background: #eef2ff;
      border: 1px solid #e0e7ff;
      border-left: 3px solid #4f46e5;
      padding: 10px 14px;
      border-radius: 0 6px 6px 0;
      font-size: 12px;
      color: #312e81;
      margin-top: 10px;
    }
    .evidence-section {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid #f3f4f6;
    }
    .evidence-item {
      background: #111827;
      color: #e5e7eb;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      padding: 8px 10px;
      border-radius: 6px;
      margin-top: 6px;
      word-break: break-all;
    }

    @media print {
      body { padding: 0; }
      .container { max-width: 100%; }
      .rule-card { page-break-inside: avoid; break-inside: avoid; }
      .kpi-card { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">
        <div class="brand-icon">✓</div>
        <div>
          <h1>Rapport d'Audit RGAA 4.1.2 & WCAG</h1>
          <div class="meta">Généré le ${dateStr} • Job ID: ${job.id}</div>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 700; color: #111827; font-size: 14px;">AccessiBot v2</div>
        <div style="color: #6b7280; font-size: 11px;">Moteur d'analyse automatisé et traçable</div>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Contrôles</div>
        <div class="kpi-val">${total}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label" style="color: #166534;">Conformes (OK)</div>
        <div class="kpi-val" style="color: #166534;">${job.globalSummary.totalOK}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label" style="color: #991b1b;">Non Conformes (KO)</div>
        <div class="kpi-val" style="color: #991b1b;">${job.globalSummary.totalKO}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label" style="color: #9a3412;">À Vérifier</div>
        <div class="kpi-val" style="color: #9a3412;">${job.globalSummary.totalAVerifier}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label" style="color: #4b5563;">Non Applicable</div>
        <div class="kpi-val" style="color: #4b5563;">${job.globalSummary.totalNA}</div>
      </div>
    </div>

    ${job.results.map((page, pIdx) => `
      <div class="page-section">
        <div class="page-title">
          <span>Page ${pIdx + 1} : ${page.title}</span>
          <span class="page-url">${page.url}</span>
        </div>

        ${page.rules.map(rule => {
          let badgeClass = 'badge-na';
          let decisionClass = '';
          if (rule.status === 'OK') {
            badgeClass = 'badge-ok';
            decisionClass = 'decision-ok';
          } else if (rule.status === 'KO') {
            badgeClass = 'badge-ko';
            decisionClass = 'decision-ko';
          } else if (rule.status === 'A_VERIFIER') {
            badgeClass = 'badge-verif';
            decisionClass = 'decision-verif';
          }

          return `
            <div class="rule-card">
              <div class="rule-header">
                <div>
                  <span class="rule-tag">${rule.category}</span>
                  <span class="rule-criterion">Critère ${rule.rgaaCriterion}</span>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <span class="badge ${badgeClass}">${rule.status === 'A_VERIFIER' ? 'À Vérifier' : rule.status}</span>
                  <span style="font-size: 11px; color: #6b7280;">Confiance ${rule.confidence.toLowerCase()}</span>
                </div>
              </div>

              <div class="rule-title">${rule.title}</div>
              <div class="rule-desc">${rule.description}</div>

              <div class="steps-grid">
                <div class="step-box">
                  <div class="step-label">1. Observation DOM & Rendu</div>
                  <div>${rule.observation}</div>
                </div>
                <div class="step-box">
                  <div class="step-label">2. Analyse Technique</div>
                  <div>${rule.analysis}</div>
                </div>
                <div class="step-box ${decisionClass}">
                  <div class="step-label">3. Décision Opérationnelle</div>
                  <div><strong>${rule.decision}</strong></div>
                </div>
                <div class="step-box">
                  <div class="step-label">4. Justification RGAA</div>
                  <div>${rule.justification}</div>
                </div>
              </div>

              <div class="reco-box">
                <strong>Recommandation :</strong> ${rule.recommendation}
              </div>

              ${rule.evidence.length > 0 ? `
                <div class="evidence-section">
                  <div style="font-size: 11px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">
                    Preuves techniques identifiées (${rule.evidence.length}) :
                  </div>
                  ${rule.evidence.slice(0, 4).map(ev => `
                    <div class="evidence-item">
                      <span style="color: #818cf8;">${ev.selector}</span> &lt;${ev.tagName}&gt; : ${ev.issueDescription}
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `).join('')}
  </div>
</body>
</html>`;
}

export async function generatePdfReport(job: AuditJob): Promise<Buffer> {
  const browser = await getBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const htmlContent = generateHtmlReport(job);
    await page.setContent(htmlContent, { waitUntil: 'load' });

    const pdfUint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        bottom: '15mm',
        left: '12mm',
        right: '12mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-family: -apple-system, sans-serif; font-size: 8px; color: #9ca3af; width: 100%; padding: 0 12mm; display: flex; justify-content: space-between;">
          <span>AccessiBot v2 • Rapport d'Audit RGAA 4.1.2</span>
          <span>${new Date(job.createdAt).toLocaleDateString('fr-FR')}</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-family: -apple-system, sans-serif; font-size: 8px; color: #9ca3af; width: 100%; padding: 0 12mm; display: flex; justify-content: space-between;">
          <span>Identifiant audit : ${job.id}</span>
          <span>Page <span class="pageNumber"></span> sur <span class="totalPages"></span></span>
        </div>
      `
    });

    return Buffer.from(pdfUint8Array);
  } finally {
    await page.close();
    await context.close();
  }
}

