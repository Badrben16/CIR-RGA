import React, { useState } from 'react';
import { KeyboardTrailReport } from '../types/audit.js';
import { Keyboard, AlertOctagon, Eye, EyeOff, CheckCircle2, ArrowRight, ShieldAlert } from 'lucide-react';

interface KeyboardTrailViewerProps {
  trail: KeyboardTrailReport;
}

export const KeyboardTrailViewer: React.FC<KeyboardTrailViewerProps> = ({ trail }) => {
  const [filterInvisible, setFilterInvisible] = useState(false);

  const displayedSteps = filterInvisible
    ? trail.steps.filter(s => !s.hasFocusIndicator)
    : trail.steps;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5 shadow-sm">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            trail.trapDetected ? 'bg-red-50 text-red-600 border border-red-200' :
            trail.invisibleFocusCount > 0 ? 'bg-orange-50 text-orange-600 border border-orange-200' :
            'bg-green-50 text-green-600 border border-green-200'
          }`}>
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">
                Parcours Clavier & Visualisation du Focus (Tab)
              </h3>
              {trail.trapDetected ? (
                <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Piège Clavier Détecté
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200 text-xs font-medium">
                  Aucun piège bloquant
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {trail.summary}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterInvisible(!filterInvisible)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              filterInvisible
                ? 'bg-orange-50 border-orange-200 text-orange-700 font-semibold'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            {filterInvisible ? 'Afficher toutes les étapes' : `Masqués uniquement (${trail.invisibleFocusCount})`}
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">Étapes Tab simulées</span>
          <span className="text-xl font-bold text-gray-900">{trail.totalSteps}</span>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">Éléments interactifs uniques</span>
          <span className="text-xl font-bold text-indigo-600">{trail.uniqueElementsReached}</span>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">Focus invisible (outline:none)</span>
          <span className={`text-xl font-bold ${trail.invisibleFocusCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {trail.invisibleFocusCount}
          </span>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">Pertes de focus (body)</span>
          <span className={`text-xl font-bold ${trail.lostFocusCount > 0 ? 'text-orange-500' : 'text-gray-500'}`}>
            {trail.lostFocusCount}
          </span>
        </div>
      </div>

      {/* Steps Trail List */}
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {displayedSteps.map((step) => {
          const isBadFocus = !step.hasFocusIndicator;

          return (
            <div
              key={step.stepIndex}
              className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                step.isTrap
                  ? 'bg-red-50/70 border-red-200'
                  : isBadFocus
                  ? 'bg-orange-50/50 border-orange-200'
                  : 'bg-gray-50/80 border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center font-mono font-bold text-[11px] text-gray-700 shrink-0">
                  {step.stepIndex}
                </span>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-indigo-600 font-semibold">{step.selector}</span>
                    <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-700">
                      &lt;{step.tagName}&gt;
                    </span>
                    {step.role && step.role !== step.tagName && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded">
                        role="{step.role}"
                      </span>
                    )}
                  </div>

                  <p className="text-gray-700">
                    <span className="text-gray-500">Nom accessible : </span>
                    {step.accessibleName ? (
                      <span className="font-medium text-gray-900">"{step.accessibleName}"</span>
                    ) : (
                      <span className="text-red-600 italic">Aucun nom accessible</span>
                    )}
                  </p>

                  <div className="font-mono text-[10px] text-gray-500">
                    <span>Style focus mesuré : </span>
                    <span className={isBadFocus ? 'text-red-600 font-semibold' : 'text-green-600'}>
                      outline: {step.computedFocusStyles.outlineWidth} {step.computedFocusStyles.outlineStyle} {step.computedFocusStyles.outlineColor}
                      {step.computedFocusStyles.boxShadow !== 'none' && ` | box-shadow: ${step.computedFocusStyles.boxShadow.slice(0, 30)}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex sm:flex-col items-end gap-1">
                {step.hasFocusIndicator ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-green-700 font-semibold">
                    <Eye className="w-3.5 h-3.5 text-green-600" /> Visible
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    <EyeOff className="w-3.5 h-3.5 text-red-600" /> Invisible
                  </span>
                )}
                {step.isOffScreen && (
                  <span className="text-[10px] text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200 font-medium">
                    Hors écran
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
