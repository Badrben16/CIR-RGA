import React, { useState } from 'react';
import { FileSpreadsheet, FileCode, FileJson, Download, ExternalLink, FileText, Printer, Check } from 'lucide-react';

interface ExportToolbarProps {
  jobId: string;
}

export const ExportToolbar: React.FC<ExportToolbarProps> = ({ jobId }) => {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handlePdfDownload = () => {
    setIsDownloadingPdf(true);
    // Trigger download
    const link = document.createElement('a');
    link.href = `/api/audit/export/pdf/${jobId}`;
    link.download = `rapport-audit-rgaa-${jobId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsDownloadingPdf(false);
    }, 4000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Download className="w-4 h-4 text-indigo-600" />
          Exportations & Rapports d'Audit
        </h4>
        <p className="text-xs text-gray-500 mt-0.5">
          Téléchargez vos livrables au format PDF pour présentation client, Excel pour le suivi ou HTML interactif.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* PDF Export - Highlighted */}
        <button
          type="button"
          onClick={handlePdfDownload}
          disabled={isDownloadingPdf}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs text-xs font-bold transition-all disabled:opacity-75 cursor-pointer"
          title="Générer et télécharger le rapport officiel au format PDF A4"
        >
          <FileText className="w-4 h-4" />
          {isDownloadingPdf ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Génération du PDF...
            </span>
          ) : (
            <span>Télécharger le Rapport PDF</span>
          )}
        </button>

        {/* Excel */}
        <a
          href={`/api/audit/export/excel/${jobId}`}
          download={`pre-audit-rgaa-${jobId}.xlsx`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition-colors"
          title="Tableur Excel avec mise en forme conditionnelle et filtres"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          Excel (.xlsx)
        </a>

        {/* HTML */}
        <a
          href={`/api/audit/export/html/${jobId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-semibold transition-colors"
          title="Consulter le rapport HTML autonome dans un nouvel onglet"
        >
          <FileCode className="w-4 h-4 text-indigo-600" />
          Rapport HTML <ExternalLink className="w-3 h-3 text-indigo-600/80" />
        </a>

        {/* Print Button */}
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 text-xs font-semibold transition-colors cursor-pointer"
          title="Imprimer directement ou enregistrer en PDF via le navigateur"
        >
          <Printer className="w-4 h-4 text-gray-500" />
          Imprimer
        </button>

        {/* JSON */}
        <a
          href={`/api/audit/export/json/${jobId}`}
          download={`pre-audit-rgaa-${jobId}.json`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 text-xs font-semibold transition-colors"
          title="Exporter l'arbre de données complet pour intégration API / CI/CD"
        >
          <FileJson className="w-4 h-4 text-gray-400" />
          JSON
        </a>
      </div>
    </div>
  );
};
