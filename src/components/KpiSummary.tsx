import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, MinusCircle, UserCheck } from 'lucide-react';

interface KpiSummaryProps {
  summary: {
    totalChecks: number;
    totalOK: number;
    totalKO: number;
    totalAVerifier: number;
    totalNA: number;
  };
  durationMs?: number;
  activeFilter?: string;
  onSelectFilter?: (status: string) => void;
}

export const KpiSummary: React.FC<KpiSummaryProps> = ({
  summary,
  durationMs,
  activeFilter,
  onSelectFilter
}) => {
  const humanRatio = summary.totalChecks > 0
    ? ((summary.totalAVerifier / summary.totalChecks) * 100).toFixed(0)
    : '0';

  const cards = [
    {
      id: 'ALL',
      label: 'Total Contrôles',
      count: summary.totalChecks,
      icon: MinusCircle,
      color: 'text-gray-900',
      iconColor: 'text-gray-400',
      bgColor: 'bg-white',
      borderColor: 'border-gray-200',
      activeBorder: 'ring-2 ring-indigo-500 ring-offset-2 shadow-md'
    },
    {
      id: 'OK',
      label: 'Conformes (OK)',
      count: summary.totalOK,
      icon: CheckCircle2,
      color: 'text-green-600',
      iconColor: 'text-green-600',
      bgColor: 'bg-white',
      borderColor: 'border-gray-200',
      activeBorder: 'ring-2 ring-green-500 ring-offset-2 shadow-md'
    },
    {
      id: 'KO',
      label: 'Non Conformes (KO)',
      count: summary.totalKO,
      icon: XCircle,
      color: 'text-red-600',
      iconColor: 'text-red-600',
      bgColor: 'bg-white',
      borderColor: 'border-gray-200',
      activeBorder: 'ring-2 ring-red-500 ring-offset-2 shadow-md'
    },
    {
      id: 'A_VERIFIER',
      label: 'À Vérifier (Humain)',
      count: summary.totalAVerifier,
      icon: AlertTriangle,
      color: 'text-orange-500',
      iconColor: 'text-orange-500',
      bgColor: 'bg-white',
      borderColor: 'border-gray-200',
      activeBorder: 'ring-2 ring-orange-500 ring-offset-2 shadow-md',
      badge: `${humanRatio}%`
    },
    {
      id: 'NON_APPLICABLE',
      label: 'Non Applicable',
      count: summary.totalNA,
      icon: MinusCircle,
      color: 'text-gray-400',
      iconColor: 'text-gray-300',
      bgColor: 'bg-white',
      borderColor: 'border-gray-200',
      activeBorder: 'ring-2 ring-gray-400 ring-offset-2 shadow-md'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(card => {
        const Icon = card.icon;
        const isActive = activeFilter === card.id;

        return (
          <button
            key={card.id}
            onClick={() => onSelectFilter && onSelectFilter(card.id)}
            className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden shadow-sm hover:shadow ${card.bgColor} ${card.borderColor} ${
              isActive ? card.activeBorder : 'hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{card.label}</span>
              <Icon className={`w-4 h-4 ${card.iconColor}`} />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold tracking-tight ${card.color}`}>
                {card.count}
              </span>
              {card.badge && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-orange-50 text-orange-700 font-bold uppercase tracking-tight border border-orange-200">
                  {card.badge} humain
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};
