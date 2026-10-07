import React, { useState } from 'react';
import { RuleResult } from '../types/audit.js';
import { CheckCircle2, XCircle, AlertTriangle, MinusCircle, ChevronDown, ChevronUp, Code, Lightbulb, Compass, FileCheck, Copy, Check } from 'lucide-react';

interface RuleCardProps {
  rule: RuleResult;
}

export const RuleCard: React.FC<RuleCardProps> = ({ rule }) => {
  const [expanded, setExpanded] = useState(false);
  const [copiedSelector, setCopiedSelector] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSelector(text);
    setTimeout(() => setCopiedSelector(null), 2000);
  };

  const getStatusBadge = () => {
    switch (rule.status) {
      case 'OK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            CONFORME (OK)
          </span>
        );
      case 'KO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            NON CONFORME (KO)
          </span>
        );
      case 'A_VERIFIER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
            À VÉRIFIER
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
            <MinusCircle className="w-3.5 h-3.5 text-gray-400" />
            NON APPLICABLE
          </span>
        );
    }
  };

  const getConfidenceBadge = () => {
    const map = {
      FORTE: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      MOYENNE: 'bg-blue-50 text-blue-700 border-blue-100',
      FAIBLE: 'bg-gray-100 text-gray-600 border-gray-200'
    };
    return (
      <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${map[rule.confidence] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
        Confiance {rule.confidence.toLowerCase()}
      </span>
    );
  };

  const getDecisionBorderClass = () => {
    switch (rule.status) {
      case 'KO':
        return 'border-red-500 bg-red-50/40 text-red-950';
      case 'A_VERIFIER':
        return 'border-orange-500 bg-orange-50/50 text-orange-950';
      case 'OK':
        return 'border-green-500 bg-green-50/40 text-green-950';
      default:
        return 'border-gray-400 bg-gray-50 text-gray-800';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors shadow-sm">
      {/* Header */}
      <div className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-indigo-600 tracking-wide uppercase">
              {rule.category}
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
              {rule.rgaaCriterion}
            </span>
            {getConfidenceBadge()}
          </div>
          <div>{getStatusBadge()}</div>
        </div>

        <h3 className="text-base font-semibold text-gray-900 tracking-tight">
          {rule.title}
        </h3>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          {rule.description}
        </p>

        {/* Chaîne de Traçabilité Rigoureuse */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* 1. Observation */}
          <div className="space-y-1 pl-3.5 border-l-2 border-blue-500 bg-blue-50/30 p-2.5 rounded-r">
            <div className="flex items-center gap-1.5 font-semibold text-blue-700 uppercase tracking-wider text-[10px]">
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              1. Observation (DOM & Rendu)
            </div>
            <p className="text-gray-700 leading-relaxed pl-5">
              {rule.observation}
            </p>
          </div>

          {/* 2. Analyse Technique */}
          <div className="space-y-1 pl-3.5 border-l-2 border-indigo-500 bg-indigo-50/30 p-2.5 rounded-r">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-700 uppercase tracking-wider text-[10px]">
              <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
              2. Analyse Technique
            </div>
            <p className="text-gray-700 leading-relaxed pl-5">
              {rule.analysis}
            </p>
          </div>

          {/* 3. Décision Opérationnelle */}
          <div className={`space-y-1 pl-3.5 border-l-2 p-2.5 rounded-r ${getDecisionBorderClass()}`}>
            <span className="font-semibold text-gray-600 uppercase tracking-wider text-[10px] block mb-0.5">
              3. Décision Opérationnelle
            </span>
            <p className="font-semibold text-gray-900 leading-relaxed">
              {rule.decision}
            </p>
          </div>

          {/* 4. Justification RGAA */}
          <div className="space-y-1 pl-3.5 border-l-2 border-gray-400 bg-gray-50/70 p-2.5 rounded-r">
            <span className="font-semibold text-gray-600 uppercase tracking-wider text-[10px] block mb-0.5">
              4. Justification RGAA
            </span>
            <p className="text-gray-600 leading-relaxed">
              {rule.justification}
            </p>
          </div>
        </div>

        {/* Recommandation */}
        <div className="mt-3.5 flex items-start gap-2.5 p-3 rounded-lg bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950">
          <Lightbulb className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-indigo-900">Recommandation : </span>
            <span className="text-indigo-800">{rule.recommendation}</span>
          </div>
        </div>

        {/* Accordéon Preuves */}
        {rule.evidence && rule.evidence.length > 0 && (
          <div className="mt-3.5">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center justify-between w-full text-left py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-700 border border-gray-200 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Code className="w-3.5 h-3.5 text-gray-500" />
                Preuves techniques et sélecteurs ({rule.evidence.length} élément{rule.evidence.length > 1 ? 's' : ''})
              </span>
              {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>

            {expanded && (
              <div className="mt-2.5 space-y-2.5 pl-1">
                {rule.evidence.map((ev, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-xs space-y-1.5 font-mono">
                    <div className="flex items-center justify-between text-gray-300 gap-2">
                      <span className="text-indigo-300 font-semibold truncate" title={ev.selector}>{ev.selector}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(ev.selector)}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 font-sans flex items-center gap-1 transition-colors"
                          title="Copier le sélecteur CSS"
                        >
                          {copiedSelector === ev.selector ? (
                            <>
                              <Check className="w-2.5 h-2.5 text-emerald-400" />
                              <span className="text-emerald-400">Copié</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-2.5 h-2.5" />
                              <span>Copier</span>
                            </>
                          )}
                        </button>
                        <span className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-300 font-sans border border-gray-700">
                          &lt;{ev.tagName}&gt;
                        </span>
                      </div>
                    </div>

                    {ev.issueDescription && (
                      <p className="text-red-300 font-sans text-[11px]">
                        {ev.issueDescription}
                      </p>
                    )}

                    {ev.htmlSnippet && (
                      <div className="bg-gray-950 p-2.5 rounded text-[11px] text-gray-300 overflow-x-auto border border-gray-800">
                        <code>{ev.htmlSnippet}</code>
                      </div>
                    )}

                    {ev.signals && Object.keys(ev.signals).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-sans text-gray-400">
                        {Object.entries(ev.signals).map(([key, val]) => (
                          <span key={key} className="bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 text-gray-300">
                            <strong>{key}:</strong> {String(val)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
