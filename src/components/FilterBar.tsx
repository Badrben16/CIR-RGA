import React from 'react';
import { Search, Filter, SlidersHorizontal, X, RotateCcw } from 'lucide-react';

interface FilterBarProps {
  search: string;
  onSearchChange: (s: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  categoryFilter: string;
  onCategoryChange: (cat: string) => void;
  categories: string[];
  onlyHumanCheck: boolean;
  onToggleHumanCheck: (val: boolean) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  categoryFilter,
  onCategoryChange,
  categories,
  onlyHumanCheck,
  onToggleHumanCheck
}) => {
  const hasActiveFilters = Boolean(
    search || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || onlyHumanCheck
  );

  const handleResetFilters = () => {
    onSearchChange('');
    onStatusChange('ALL');
    onCategoryChange('ALL');
    onToggleHumanCheck(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
      {/* Barre de recherche */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher par critère, mot-clé, sélecteur (ex: 1.1, alt, form, #id)..."
          className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded"
            title="Effacer la recherche"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filtre par Thématique */}
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
        >
          <option value="ALL">Toutes les thématiques</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Filtre par Statut */}
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
        >
          <option value="ALL">Tous les statuts</option>
          <option value="KO">KO (Non conforme)</option>
          <option value="A_VERIFIER">À Vérifier</option>
          <option value="OK">OK (Conforme)</option>
          <option value="NON_APPLICABLE">Non applicable</option>
        </select>
      </div>

      {/* Switch Seuls les contrôles nécessitant validation humaine */}
      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none shrink-0 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors">
        <input
          type="checkbox"
          checked={onlyHumanCheck}
          onChange={(e) => onToggleHumanCheck(e.target.checked)}
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 bg-white w-3.5 h-3.5"
        />
        <span className="font-medium">À expertiser</span>
      </label>

      {/* Reset button if filters are active */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleResetFilters}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 font-medium transition-colors shrink-0"
          title="Réinitialiser tous les filtres"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Effacer filtres</span>
        </button>
      )}
    </div>
  );
};
