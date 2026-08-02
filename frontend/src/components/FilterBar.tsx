'use client';

import { useState, useEffect } from 'react';
import { proprietairesApi, locatairesApi } from '@/lib/api';

export interface FilterState {
  proprietaireId?: string;
  locataireId?: string;
  dateDebut?: string;
  dateFin?: string;
}

interface FilterBarProps {
  onFilterChange: (filters: FilterState) => void;
  showProprietaire?: boolean;
  showLocataire?: boolean;
  showDateRange?: boolean;
  className?: string;
}

export function FilterBar({
  onFilterChange,
  showProprietaire = true,
  showLocataire = true,
  showDateRange = true,
  className = '',
}: FilterBarProps) {
  const [proprietaires, setProprietaires] = useState<any[]>([]);
  const [locataires, setLocataires]       = useState<any[]>([]);
  
  const [selectedProprietaire, setSelectedProprietaire] = useState<string>('');
  const [selectedLocataire, setSelectedLocataire]       = useState<string>('');
  const [dateDebut, setDateDebut]                       = useState<string>('');
  const [dateFin, setDateFin]                           = useState<string>('');

  useEffect(() => {
    if (showProprietaire) {
      proprietairesApi.getAll({ pageSize: 200 })
        .then((res) => setProprietaires(res.Items || res.items || []))
        .catch(() => {});
    }
    if (showLocataire) {
      locatairesApi.getAll({ pageSize: 200 })
        .then((res) => setLocataires(res.Items || res.items || []))
        .catch(() => {});
    }
  }, [showProprietaire, showLocataire]);

  const handleApply = (
    pId = selectedProprietaire,
    lId = selectedLocataire,
    dStart = dateDebut,
    dEnd = dateFin
  ) => {
    onFilterChange({
      proprietaireId: pId || undefined,
      locataireId: lId || undefined,
      dateDebut: dStart || undefined,
      dateFin: dEnd || undefined,
    });
  };

  const handleReset = () => {
    setSelectedProprietaire('');
    setSelectedLocataire('');
    setDateDebut('');
    setDateFin('');
    onFilterChange({});
  };

  const hasActiveFilters = Boolean(selectedProprietaire || selectedLocataire || dateDebut || dateFin);

  return (
    <div className={`bg-white/80 backdrop-blur-md border border-gray-200/80 rounded-2xl p-4 shadow-sm mb-6 transition-all ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filtres multicritères
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Réinitialiser les filtres
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Propriétaire */}
        {showProprietaire && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Propriétaire</label>
            <select
              value={selectedProprietaire}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedProprietaire(val);
                handleApply(val, selectedLocataire, dateDebut, dateFin);
              }}
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
            >
              <option value="">Tous les propriétaires</option>
              {proprietaires.map((p) => (
                <option key={p.Id} value={p.Id}>
                  {p.NomPrenoms}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Locataire */}
        {showLocataire && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Locataire</label>
            <select
              value={selectedLocataire}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedLocataire(val);
                handleApply(selectedProprietaire, val, dateDebut, dateFin);
              }}
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
            >
              <option value="">Tous les locataires</option>
              {locataires.map((l) => (
                <option key={l.Id} value={l.Id}>
                  {l.NomPrenoms}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date Début */}
        {showDateRange && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date début</label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => {
                const val = e.target.value;
                setDateDebut(val);
                handleApply(selectedProprietaire, selectedLocataire, val, dateFin);
              }}
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
            />
          </div>
        )}

        {/* Date Fin */}
        {showDateRange && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date fin</label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => {
                const val = e.target.value;
                setDateFin(val);
                handleApply(selectedProprietaire, selectedLocataire, dateDebut, val);
              }}
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
