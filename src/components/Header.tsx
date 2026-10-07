import React from 'react';
import { ShieldCheck, Sparkles, BookOpen, AlertCircle } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                AccessiBot <span className="text-indigo-600">v2</span>
              </h1>
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                Assistant Pré-Audit RGAA
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Moteur d'automatisation fiable et traçable • Conforme RGAA 4.1.2 & WCAG 2.1 AA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Moteur prêt pour analyse</span>
          </div>
          <span className="hidden sm:inline-flex items-center px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium text-[11px] border border-gray-200">
            RGAA 4.1.2 • WCAG 2.1 AA
          </span>
        </div>
      </div>
    </header>
  );
};
