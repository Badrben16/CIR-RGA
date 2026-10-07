import React, { useState, useEffect } from 'react';
import { Play, Sparkles, Settings2, Globe, Beaker, Check, AlertCircle } from 'lucide-react';

interface AuditLauncherProps {
  onStartAudit: (urls: string[], options: any) => void;
  isRunning: boolean;
  progress?: { current: number; total: number; currentUrl?: string };
}

interface TestPage {
  slug: string;
  title: string;
  description: string;
  localUrl: string;
}

export const AuditLauncher: React.FC<AuditLauncherProps> = ({
  onStartAudit,
  isRunning,
  progress
}) => {
  const [urlInput, setUrlInput] = useState<string>('');
  const [simulateKeyboard, setSimulateKeyboard] = useState<boolean>(true);
  const [simulateForms, setSimulateForms] = useState<boolean>(true);
  const [simulateZoom, setSimulateZoom] = useState<boolean>(true);
  const [takeScreenshots, setTakeScreenshots] = useState<boolean>(true);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [testPagesList, setTestPagesList] = useState<TestPage[]>([]);

  useEffect(() => {
    fetch('/api/test-pages')
      .then(res => res.json())
      .then(data => {
        if (data.testPages) setTestPagesList(data.testPages);
      })
      .catch(() => {});
  }, []);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const urls = urlInput
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0);

    if (urls.length === 0) return;

    onStartAudit(urls, {
      simulateKeyboard,
      simulateForms,
      simulateZoom,
      takeScreenshots
    });
  };

  const handleLoadTestPage = (localUrl: string) => {
    setUrlInput(localUrl);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
      <form onSubmit={handleStart} className="space-y-4 relative z-10">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <label htmlFor="urlInput" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-600" />
              <span>Adresse du site ou des pages à auditer</span>
            </label>
            <div className="flex items-center gap-2">
              {urlInput && !isRunning && (
                <button
                  type="button"
                  onClick={() => setUrlInput('')}
                  className="text-xs text-gray-500 hover:text-red-600 font-medium px-2 py-0.5 rounded hover:bg-gray-100 transition-colors"
                >
                  Effacer
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setUrlInput(prev => prev ? `${prev}\n${text}` : text);
                  } catch {}
                }}
                disabled={isRunning}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors"
              >
                Coller depuis le presse-papier
              </button>
            </div>
          </div>

          <textarea
            id="urlInput"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Exemple: https://mon-site.fr ou entrez plusieurs URLs (une par ligne)"
            rows={3}
            disabled={isRunning}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3.5 text-sm text-gray-900 font-mono placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-y disabled:opacity-60"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Astuce : vous pouvez renseigner un site public ou tester les pages exemples intégrées ci-dessous.
          </p>
        </div>

        {/* Quick Benchmarks / Lab Test Cases */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <Beaker className="w-3.5 h-3.5 text-indigo-600" />
            <span>Cas de test étalons du laboratoire local (1 clic pour vérifier le moteur) :</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {testPagesList.map((tp) => (
              <button
                key={tp.slug}
                type="button"
                onClick={() => handleLoadTestPage(tp.localUrl)}
                className="px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs text-gray-700 font-medium transition-all flex items-center gap-1.5"
                title={tp.description}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                {tp.title.replace('Laboratoire Test : ', '')}
              </button>
            ))}
          </div>
        </div>

        {/* Options d'Analyse Avancées */}
        <div className="pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            {showAdvanced ? 'Masquer les options d\'analyse dynamiques' : 'Configurer les simulations dynamiques (Clavier, Formulaires, Zoom 320px)'}
          </button>

          {showAdvanced && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simulateKeyboard}
                  onChange={(e) => setSimulateKeyboard(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 bg-white w-3.5 h-3.5"
                />
                <div>
                  <span className="font-semibold text-gray-800 block">Simulation Clavier (Tab)</span>
                  <span className="text-[11px] text-gray-500">Parcours séquentiel, pièges, outline/shadow</span>
                </div>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simulateForms}
                  onChange={(e) => setSimulateForms(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 bg-white w-3.5 h-3.5"
                />
                <div>
                  <span className="font-semibold text-gray-800 block">Test Formulaires</span>
                  <span className="text-[11px] text-gray-500">Soumission à blanc, alertes aria-invalid</span>
                </div>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simulateZoom}
                  onChange={(e) => setSimulateZoom(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 bg-white w-3.5 h-3.5"
                />
                <div>
                  <span className="font-semibold text-gray-800 block">Reflow & Zoom 320px</span>
                  <span className="text-[11px] text-gray-500">Mesure du défilement horizontal en 320 CSS px</span>
                </div>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={takeScreenshots}
                  onChange={(e) => setTakeScreenshots(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 bg-white w-3.5 h-3.5"
                />
                <div>
                  <span className="font-semibold text-gray-800 block">Captures d'écran</span>
                  <span className="text-[11px] text-gray-500">Clichés visuels pour preuves d'audit</span>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Start Button & Progress */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Moteur headless Playwright Chromium • Extraction des styles calculés & de l'arbre d'accessibilité</span>
          </div>

          <button
            type="submit"
            disabled={isRunning || !urlInput.trim()}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
              isRunning || !urlInput.trim()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isRunning ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Audit en cours...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Lancer le Pré-Audit RGAA</span>
              </>
            )}
          </button>
        </div>

        {/* Active Progress Bar */}
        {isRunning && progress && (
          <div className="mt-4 p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-indigo-900 font-medium">
                Analyse de la page {progress.current} / {progress.total} : {progress.currentUrl}
              </span>
              <span className="text-gray-500 font-mono">
                {Math.round((progress.current / progress.total) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${Math.max(10, Math.round((progress.current / progress.total) * 100))}%` }}
              />
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
