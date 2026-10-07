import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { AuditLauncher } from './components/AuditLauncher.js';
import { KpiSummary } from './components/KpiSummary.js';
import { RuleCard } from './components/RuleCard.js';
import { KeyboardTrailViewer } from './components/KeyboardTrailViewer.js';
import { ExportToolbar } from './components/ExportToolbar.js';
import { FilterBar } from './components/FilterBar.js';
import { AuditJob, PageAuditResult, RuleResult } from './types/audit.js';
import { ShieldCheck, Keyboard, Image as ImageIcon, AlertCircle, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeJob, setActiveJob] = useState<AuditJob | null>(null);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number; currentUrl?: string }>({ current: 0, total: 0 });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);

  // Filtres
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyHumanCheck, setOnlyHumanCheck] = useState<boolean>(false);

  // Vues
  const [activeTab, setActiveTab] = useState<'rules' | 'keyboard' | 'screenshot'>('rules');

  // Load recent jobs
  const fetchRecentJobs = () => {
    fetch('/api/audit/jobs')
      .then(res => res.json())
      .then(data => {
        if (data.jobs) setRecentJobs(data.jobs);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchRecentJobs();
  }, []);

  // Polling when job is RUNNING
  useEffect(() => {
    if (!isRunning || !activeJob?.id) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/audit/jobs/${activeJob.id}`);
        if (!res.ok) return;
        const updatedJob: AuditJob = await res.json();
        setActiveJob(updatedJob);

        setProgress({
          current: updatedJob.results.length + 1,
          total: updatedJob.totalUrls,
          currentUrl: updatedJob.urls[updatedJob.currentUrlIndex]
        });

        if (updatedJob.status === 'COMPLETED' || updatedJob.status === 'FAILED') {
          setIsRunning(false);
          fetchRecentJobs();
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [isRunning, activeJob?.id]);

  const handleStartAudit = async (urls: string[], options: any) => {
    setIsRunning(true);
    setSelectedPageIndex(0);
    setProgress({ current: 1, total: urls.length, currentUrl: urls[0] });

    try {
      const res = await fetch('/api/audit/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, options })
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`Erreur: ${errorData.error}`);
        setIsRunning(false);
        return;
      }

      const data = await res.json();
      setActiveJob({
        id: data.jobId,
        status: 'RUNNING',
        createdAt: new Date().toISOString(),
        options,
        urls,
        currentUrlIndex: 0,
        totalUrls: urls.length,
        results: [],
        globalSummary: { totalChecks: 0, totalOK: 0, totalKO: 0, totalAVerifier: 0, totalNA: 0 }
      });
    } catch (err: any) {
      alert(`Erreur de connexion avec le serveur : ${err.message}`);
      setIsRunning(false);
    }
  };

  const handleLoadExistingJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/audit/jobs/${jobId}`);
      if (!res.ok) return;
      const job: AuditJob = await res.json();
      setActiveJob(job);
      setSelectedPageIndex(0);
    } catch (err) {
      console.error(err);
    }
  };

  const currentPage: PageAuditResult | undefined = activeJob?.results[selectedPageIndex];

  // Extraction des catégories disponibles pour les filtres
  const availableCategories = React.useMemo(() => {
    if (!currentPage) return [];
    const set = new Set<string>();
    currentPage.rules.forEach(r => set.add(r.category));
    return Array.from(set).sort();
  }, [currentPage]);

  // Filtrage des règles
  const filteredRules = React.useMemo(() => {
    if (!currentPage) return [];
    return currentPage.rules.filter(rule => {
      // Filtre statut
      if (statusFilter !== 'ALL' && rule.status !== statusFilter) return false;

      // Filtre catégorie
      if (categoryFilter !== 'ALL' && rule.category !== categoryFilter) return false;

      // Filtre vérification humaine
      if (onlyHumanCheck && !rule.humanValidationRequired) return false;

      // Recherche textuelle
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = rule.title.toLowerCase().includes(q);
        const matchCrit = rule.rgaaCriterion.toLowerCase().includes(q);
        const matchCat = rule.category.toLowerCase().includes(q);
        const matchObs = rule.observation.toLowerCase().includes(q);
        const matchEvidence = rule.evidence.some(e =>
          e.selector.toLowerCase().includes(q) ||
          (e.issueDescription || '').toLowerCase().includes(q)
        );
        if (!matchTitle && !matchCrit && !matchCat && !matchObs && !matchEvidence) return false;
      }

      return true;
    });
  }, [currentPage, statusFilter, categoryFilter, searchQuery, onlyHumanCheck]);

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#111827] flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Launcher Section */}
        <AuditLauncher
          onStartAudit={handleStartAudit}
          isRunning={isRunning}
          progress={progress}
        />

        {/* Global Summary & Results Section */}
        {activeJob && activeJob.results.length > 0 && (
          <div className="space-y-6">
            {/* Multi-Page Tabs */}
            {activeJob.results.length > 1 && (
              <div className="bg-white border border-gray-200 rounded-xl p-2.5 flex items-center gap-2 overflow-x-auto shadow-sm">
                <span className="text-xs font-bold text-gray-400 px-3 uppercase tracking-wider shrink-0">
                  Pages auditées ({activeJob.results.length}) :
                </span>
                {activeJob.results.map((page, idx) => (
                  <button
                    key={page.id}
                    onClick={() => setSelectedPageIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                      selectedPageIndex === idx
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {page.title.slice(0, 30) || page.url}
                  </button>
                ))}
              </div>
            )}

            {/* Page Header info */}
            {currentPage && (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                      Page active
                    </span>
                    <h2 className="text-base font-bold text-gray-900">
                      {currentPage.title}
                    </h2>
                  </div>
                  <a
                    href={currentPage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-indigo-600 hover:underline mt-0.5 block"
                  >
                    {currentPage.url}
                  </a>
                </div>

                <div className="text-xs text-gray-500 flex items-center gap-4">
                  <span>Durée : {(currentPage.durationMs / 1000).toFixed(1)}s</span>
                  <span>Résolution : {currentPage.viewport.width}×{currentPage.viewport.height}</span>
                  <span>{new Date(currentPage.timestamp).toLocaleTimeString('fr-FR')}</span>
                </div>
              </div>
            )}

            {/* KPI Summary Strip */}
            {currentPage && (
              <KpiSummary
                summary={{
                  totalChecks: currentPage.statusCounts.total,
                  totalOK: currentPage.statusCounts.OK,
                  totalKO: currentPage.statusCounts.KO,
                  totalAVerifier: currentPage.statusCounts.A_VERIFIER,
                  totalNA: currentPage.statusCounts.NON_APPLICABLE
                }}
                durationMs={currentPage.durationMs}
                activeFilter={statusFilter}
                onSelectFilter={(status) => setStatusFilter(status)}
              />
            )}

            {/* Export Toolbar */}
            <ExportToolbar jobId={activeJob.id} />

            {/* Sub-Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
              <button
                onClick={() => setActiveTab('rules')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'rules'
                    ? 'bg-white text-indigo-700 border border-gray-200 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                Contrôles RGAA & Traçabilité ({filteredRules.length})
              </button>

              {currentPage?.keyboardTrail && (
                <button
                  onClick={() => setActiveTab('keyboard')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === 'keyboard'
                      ? 'bg-white text-indigo-700 border border-gray-200 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Keyboard className="w-4 h-4" />
                  Parcours Clavier (Tab Trail)
                  {currentPage.keyboardTrail.invisibleFocusCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                  )}
                </button>
              )}

              {currentPage?.fullScreenshotBase64 && (
                <button
                  onClick={() => setActiveTab('screenshot')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === 'screenshot'
                      ? 'bg-white text-indigo-700 border border-gray-200 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  Capture de Rendu Visuel
                </button>
              )}
            </div>

            {/* View: Rules List */}
            {activeTab === 'rules' && (
              <div className="space-y-4">
                <FilterBar
                  search={searchQuery}
                  onSearchChange={setSearchQuery}
                  statusFilter={statusFilter}
                  onStatusChange={setStatusFilter}
                  categoryFilter={categoryFilter}
                  onCategoryChange={setCategoryFilter}
                  categories={availableCategories}
                  onlyHumanCheck={onlyHumanCheck}
                  onToggleHumanCheck={setOnlyHumanCheck}
                />

                {filteredRules.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 text-sm shadow-sm">
                    Aucun contrôle ne correspond aux filtres actifs.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRules.map((rule) => (
                      <RuleCard key={rule.id} rule={rule} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* View: Keyboard Trail */}
            {activeTab === 'keyboard' && currentPage?.keyboardTrail && (
              <KeyboardTrailViewer trail={currentPage.keyboardTrail} />
            )}

            {/* View: Screenshot */}
            {activeTab === 'screenshot' && currentPage?.fullScreenshotBase64 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Capture d'écran du viewport lors de l'audit</h3>
                  <span className="text-xs text-gray-500">1366 × 768 px</span>
                </div>
                <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex justify-center p-2">
                  <img
                    src={currentPage.fullScreenshotBase64}
                    alt="Capture du viewport"
                    className="max-h-[600px] object-contain w-auto rounded shadow-sm"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Audits History */}
        {recentJobs.length > 0 && !isRunning && (!activeJob || activeJob.results.length === 0) && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-600" />
              Historique des sessions de pré-audit récentes
            </h3>
            <div className="divide-y divide-gray-100 text-xs">
              {recentJobs.map((j) => (
                <div key={j.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-indigo-600 font-semibold">{j.id}</span>
                    <span className="text-gray-500 ml-2">
                      ({j.completedUrls}/{j.totalUrls} pages auditées)
                    </span>
                    <div className="text-gray-400 text-[11px] mt-0.5">
                      {new Date(j.createdAt).toLocaleString('fr-FR')} • {j.globalSummary.totalChecks} contrôles
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLoadExistingJob(j.id)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200 transition-colors"
                    >
                      Consulter les résultats
                    </button>
                    <a
                      href={`/api/audit/export/pdf/${j.id}`}
                      download={`rapport-audit-rgaa-${j.id}.pdf`}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-semibold transition-colors"
                      title="Télécharger le rapport PDF"
                    >
                      PDF
                    </a>
                    <a
                      href={`/api/audit/export/excel/${j.id}`}
                      download={`pre-audit-rgaa-${j.id}.xlsx`}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-medium transition-colors"
                      title="Télécharger le rapport Excel"
                    >
                      Excel
                    </a>
                    <a
                      href={`/api/audit/export/html/${j.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 font-medium transition-colors"
                      title="Ouvrir le rapport HTML"
                    >
                      HTML
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
