import React, { useState, useMemo } from 'react';
import { 
  X, 
  RotateCcw, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  Users, 
  ArrowRightLeft, 
  AlertCircle,
  HelpCircle,
  CalendarDays,
  Sparkles,
  Check
} from 'lucide-react';
import { NurseStaff, Specialite, SituationActuelle, PeriodeSystemeNormal } from '../types/nurse';
import { calculateAge, formatDateFr, formatFonction } from '../utils/calculations';

interface RotationPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  nurses: NurseStaff[];
  onSaveRotation: (updatedNurses: NurseStaff[], summaryMsg: string) => void;
  initialYear?: number;
  initialMonth?: number; // 1-indexed (1..12)
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const SPECIALITES_ORDER: Specialite[] = ['IAR', 'IBO', 'IP', 'ISM'];

export const RotationPlanningModal: React.FC<RotationPlanningModalProps> = ({
  isOpen,
  onClose,
  nurses,
  onSaveRotation,
  initialYear = 2026,
  initialMonth = 11, // Default to Novembre 2026 or current
}) => {
  if (!isOpen) return null;

  // Selected Month & Year
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);

  // Helper function to get default start & end dates of month
  const getDefaultDates = (year: number, month: number) => {
    const yStr = String(year);
    const mStr = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    return {
      debut: `${yStr}-${mStr}-01`,
      fin: `${yStr}-${mStr}-${String(lastDay).padStart(2, '0')}`,
    };
  };

  const initialRange = getDefaultDates(selectedYear, selectedMonth);
  const [dateDebut, setDateDebut] = useState<string>(initialRange.debut);
  const [dateFin, setDateFin] = useState<string>(initialRange.fin);
  const [descriptionTour, setDescriptionTour] = useState<string>(`Tour de rôle ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Per-nurse assignment state for this planning session:
  // Map of nurseId -> 'Système normal' | 'Système de garde' | 'conserver'
  const [assignments, setAssignments] = useState<Record<string, 'Système normal' | 'Système de garde' | 'conserver'>>(() => {
    const initial: Record<string, 'Système normal' | 'Système de garde' | 'conserver'> = {};
    nurses.forEach(n => {
      if (n.situationActuelle === 'Système normal') {
        initial[n.id] = 'Système normal';
      } else if (n.situationActuelle === 'Système de garde') {
        initial[n.id] = 'Système de garde';
      } else {
        // If already in congé or other, keep their situation by default
        initial[n.id] = 'conserver';
      }
    });
    return initial;
  });

  // When Month/Year changes, update default dates
  const handleMonthYearChange = (newYear: number, newMonth: number) => {
    setSelectedYear(newYear);
    setSelectedMonth(newMonth);
    const range = getDefaultDates(newYear, newMonth);
    setDateDebut(range.debut);
    setDateFin(range.fin);
    setDescriptionTour(`Tour de rôle ${MONTH_NAMES[newMonth - 1]} ${newYear}`);
  };

  // Grouped & sorted nurses: IAR -> IBO -> IP -> ISM, then by birth date du grand au petit
  const classifiedNurses = useMemo(() => {
    const sorted = [...nurses].sort((a, b) => {
      const idxA = SPECIALITES_ORDER.indexOf(a.specialite);
      const idxB = SPECIALITES_ORDER.indexOf(b.specialite);
      if (idxA !== idxB) {
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
      }
      return (a.dateNaissance || '').localeCompare(b.dateNaissance || '');
    });

    const groups: { specialite: Specialite; items: NurseStaff[] }[] = [];
    SPECIALITES_ORDER.forEach(spec => {
      const items = sorted.filter(n => n.specialite === spec);
      if (items.length > 0) {
        groups.push({ specialite: spec, items });
      }
    });
    return groups;
  }, [nurses]);

  // Counts
  const stats = useMemo(() => {
    let normalCount = 0;
    let gardeCount = 0;
    let keepCount = 0;
    Object.values(assignments).forEach(val => {
      if (val === 'Système normal') normalCount++;
      else if (val === 'Système de garde') gardeCount++;
      else keepCount++;
    });
    return { normalCount, gardeCount, keepCount };
  }, [assignments]);

  // Bulk actions
  const setAllTo = (target: 'Système normal' | 'Système de garde') => {
    setAssignments(prev => {
      const next = { ...prev };
      nurses.forEach(n => {
        // Only switch active staff or everyone
        next[n.id] = target;
      });
      return next;
    });
  };

  const alternateBySpecialty = () => {
    // Alternates 50% normal / 50% garde within each specialty
    setAssignments(prev => {
      const next = { ...prev };
      classifiedNurses.forEach(group => {
        group.items.forEach((nurse, index) => {
          next[nurse.id] = index % 2 === 0 ? 'Système normal' : 'Système de garde';
        });
      });
      return next;
    });
  };

  const swapCurrentRoles = () => {
    setAssignments(prev => {
      const next = { ...prev };
      nurses.forEach(n => {
        if (prev[n.id] === 'Système normal') {
          next[n.id] = 'Système de garde';
        } else if (prev[n.id] === 'Système de garde') {
          next[n.id] = 'Système normal';
        }
      });
      return next;
    });
  };

  // Submit and apply the defined periods & rotation
  const handleApply = () => {
    if (!dateDebut || !dateFin) {
      setErrorMsg('Veuillez définir la date de début et la date de fin de la période.');
      return;
    }
    if (dateDebut > dateFin) {
      setErrorMsg('La date de début doit être antérieure ou égale à la date de fin.');
      return;
    }

    const updatedNurses: NurseStaff[] = nurses.map(nurse => {
      const chosen = assignments[nurse.id];
      if (chosen === 'Système normal') {
        const periode: PeriodeSystemeNormal = {
          dateDebut,
          dateFin,
          moisReference: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`,
          commentaire: descriptionTour,
        };
        return {
          ...nurse,
          situationActuelle: 'Système normal',
          periodeSystemeNormal: periode,
        };
      } else if (chosen === 'Système de garde') {
        return {
          ...nurse,
          situationActuelle: 'Système de garde',
          // Keep or clear periodeSystemeNormal
          periodeSystemeNormal: undefined,
        };
      }
      // 'conserver' : keep previous situation
      return nurse;
    });

    const summary = `Tour de rôle appliqué pour la période du ${formatDateFr(dateDebut)} au ${formatDateFr(dateFin)} (${stats.normalCount} en Système Normal, ${stats.gardeCount} en Système de Garde).`;
    onSaveRotation(updatedNurses, summary);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-teal-900 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600/40 border border-teal-400/40 flex items-center justify-center text-teal-200 shadow-xs">
              <RotateCcw className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Tour de Rôle : Définition des Périodes du Système Normal
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-500/30 text-teal-200 border border-teal-400/30">
                  Début de Mois
                </span>
              </div>
              <p className="text-xs text-teal-100/80 mt-0.5">
                Définissez manuellement les dates de rotation entre Système Normal et Système de Garde (aucune improvisation)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-teal-200/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Définition explicite de la période */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4.5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/80 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-800" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-950">
                  1. Définition Manuelle de la Période du Tour de Rôle
                </h3>
              </div>
              <span className="text-[11px] font-medium text-emerald-800 bg-white px-2.5 py-0.5 rounded-full border border-emerald-300">
                Période active pour les infirmiers en Système Normal
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              
              {/* Choix du Mois & Année */}
              <div>
                <label className="block text-xs font-semibold text-emerald-950 mb-1">
                  Mois de Référence
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={selectedMonth}
                    onChange={(e) => handleMonthYearChange(selectedYear, Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg font-medium text-slate-800 focus:ring-1 focus:ring-emerald-500"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={name} value={idx + 1}>{name}</option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => handleMonthYearChange(Number(e.target.value), selectedMonth)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg font-medium text-slate-800 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                    <option value={2028}>2028</option>
                  </select>
                </div>
              </div>

              {/* Date Début */}
              <div>
                <label className="block text-xs font-bold text-emerald-950 mb-1">
                  Date de Début de Période *
                </label>
                <input
                  type="date"
                  required
                  value={dateDebut}
                  onChange={(e) => {
                    setDateDebut(e.target.value);
                    setErrorMsg('');
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg font-medium text-slate-900 focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                />
                <span className="text-[10px] text-emerald-800 mt-0.5 block">
                  Ex: 1er du mois ou date personnalisée
                </span>
              </div>

              {/* Date Fin */}
              <div>
                <label className="block text-xs font-bold text-emerald-950 mb-1">
                  Date de Fin de Période *
                </label>
                <input
                  type="date"
                  required
                  value={dateFin}
                  onChange={(e) => {
                    setDateFin(e.target.value);
                    setErrorMsg('');
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg font-medium text-slate-900 focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                />
                <span className="text-[10px] text-emerald-800 mt-0.5 block">
                  Ex: dernier jour du mois ou date personnalisée
                </span>
              </div>

              {/* Libellé / Observation */}
              <div>
                <label className="block text-xs font-semibold text-emerald-950 mb-1">
                  Intitulé du Tour de Rôle
                </label>
                <input
                  type="text"
                  value={descriptionTour}
                  onChange={(e) => setDescriptionTour(e.target.value)}
                  placeholder="Ex: Tour de rôle Novembre 2026"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-emerald-800 mt-0.5 block">
                  Enregistré dans la fiche de chaque agent
                </span>
              </div>

            </div>

            {/* Quick Presets for Current Month */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-emerald-900 font-semibold text-[11px]">Raccourcis de dates :</span>
              <button
                type="button"
                onClick={() => {
                  const r = getDefaultDates(selectedYear, selectedMonth);
                  setDateDebut(r.debut);
                  setDateFin(r.fin);
                }}
                className="px-2.5 py-1 text-[11px] bg-white border border-emerald-300 hover:bg-emerald-100 rounded-md font-medium text-emerald-900 transition-colors"
              >
                Mois complet ({MONTH_NAMES[selectedMonth - 1]})
              </button>
              <button
                type="button"
                onClick={() => {
                  const y = String(selectedYear);
                  const m = String(selectedMonth).padStart(2, '0');
                  setDateDebut(`${y}-${m}-01`);
                  setDateFin(`${y}-${m}-15`);
                }}
                className="px-2.5 py-1 text-[11px] bg-white border border-emerald-300 hover:bg-emerald-100 rounded-md font-medium text-emerald-900 transition-colors"
              >
                1ère Quinzaine (01 au 15)
              </button>
              <button
                type="button"
                onClick={() => {
                  const y = String(selectedYear);
                  const m = String(selectedMonth).padStart(2, '0');
                  const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
                  setDateDebut(`${y}-${m}-16`);
                  setDateFin(`${y}-${m}-${lastDay}`);
                }}
                className="px-2.5 py-1 text-[11px] bg-white border border-emerald-300 hover:bg-emerald-100 rounded-md font-medium text-emerald-900 transition-colors"
              >
                2ème Quinzaine (16 à fin de mois)
              </button>
            </div>
          </div>

          {/* Section 2: Répartition de l'Équipe & Actions Rapides */}
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              
              {/* Counters */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="font-bold text-slate-800">Effectif total: {nurses.length}</span>
                <span className="h-4 w-px bg-slate-300"></span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  Système Normal: {stats.normalCount}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                  Système de Garde: {stats.gardeCount}
                </span>
                {stats.keepCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-medium text-[11px]">
                    Statut conservé (Congés): {stats.keepCount}
                  </span>
                )}
              </div>

              {/* Fast action helpers */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={alternateBySpecialty}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md transition-colors text-[11px] font-medium"
                  title="Alterner 50% normal / 50% garde pour chaque spécialité"
                >
                  <Sparkles className="w-3 h-3 text-teal-600" />
                  Alterner 50/50
                </button>

                <button
                  type="button"
                  onClick={swapCurrentRoles}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md transition-colors text-[11px] font-medium"
                  title="Inverser les rôles Système Normal ⮂ Système de Garde"
                >
                  <ArrowRightLeft className="w-3 h-3 text-slate-600" />
                  Inverser Rôles
                </button>

                <button
                  type="button"
                  onClick={() => setAllTo('Système normal')}
                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-md transition-colors text-[11px] font-medium"
                >
                  Tous Normal
                </button>

                <button
                  type="button"
                  onClick={() => setAllTo('Système de garde')}
                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-md transition-colors text-[11px] font-medium"
                >
                  Tous Garde
                </button>
              </div>

            </div>

            {/* Staff list grouped by specialty and ordered by birth date */}
            {classifiedNurses.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                Aucun infirmier enregistré. Veuillez d'abord ajouter du personnel infirmier.
              </div>
            ) : (
              <div className="space-y-4">
                {classifiedNurses.map(group => (
                  <div 
                    key={group.specialite}
                    className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs"
                  >
                    {/* Specialty Header */}
                    <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-teal-900 font-mono px-2 py-0.5 bg-white border border-slate-300 rounded">
                          {group.specialite}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {group.specialite === 'IAR' && 'Infirmier en Anesthésie-Réanimation'}
                          {group.specialite === 'IBO' && 'Infirmier de Bloc Opératoire'}
                          {group.specialite === 'IP' && 'Infirmier Polyvalent'}
                          {group.specialite === 'ISM' && 'Infirmier en Santé Mentale'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          ({group.items.length} agents · classés par date de naissance)
                        </span>
                      </div>
                    </div>

                    {/* Table of nurses in this specialty */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs divide-y divide-slate-100">
                        <thead className="bg-slate-50/60 text-slate-500 text-[11px] uppercase font-semibold">
                          <tr>
                            <th className="py-2 px-3">Agent</th>
                            <th className="py-2 px-3">Rôle au Bloc</th>
                            <th className="py-2 px-3">Date Naissance / Âge</th>
                            <th className="py-2 px-3">Situation Actuelle</th>
                            <th className="py-2 px-3 text-right">Affectation pour la Période Définie</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {group.items.map(nurse => {
                            const age = calculateAge(nurse.dateNaissance);
                            const currentAssignment = assignments[nurse.id] || 'conserver';

                            return (
                              <tr 
                                key={nurse.id}
                                className={`hover:bg-slate-50/80 transition-colors ${
                                  currentAssignment === 'Système normal'
                                    ? 'bg-emerald-50/30'
                                    : currentAssignment === 'Système de garde'
                                      ? 'bg-amber-50/30'
                                      : ''
                                }`}
                              >
                                <td className="py-2.5 px-3">
                                  <div className="font-bold text-slate-900">
                                    {nurse.nom} {nurse.prenom}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    PPR: {nurse.ppr} · CNI: {nurse.cni}
                                  </div>
                                </td>

                                <td className="py-2.5 px-3">
                                  <span className="font-medium text-slate-700">
                                    {formatFonction(nurse.fonction)}
                                  </span>
                                  <div className="text-[10px] text-slate-400">
                                    {nurse.grade}
                                  </div>
                                </td>

                                <td className="py-2.5 px-3">
                                  <div className="text-slate-700 font-mono">
                                    {formatDateFr(nurse.dateNaissance)}
                                  </div>
                                  {age !== null && (
                                    <div className="text-[10px] font-semibold text-teal-800">
                                      {age} ans
                                    </div>
                                  )}
                                </td>

                                <td className="py-2.5 px-3">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                                    nurse.situationActuelle === 'Système normal'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : nurse.situationActuelle === 'Système de garde'
                                        ? 'bg-amber-100 text-amber-800'
                                        : nurse.situationActuelle.includes('Congé')
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {nurse.situationActuelle}
                                  </span>
                                  {nurse.situationActuelle === 'Système normal' && nurse.periodeSystemeNormal && (
                                    <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                      Du {formatDateFr(nurse.periodeSystemeNormal.dateDebut)} au {formatDateFr(nurse.periodeSystemeNormal.dateFin)}
                                    </div>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 text-right">
                                  <div className="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAssignments(prev => ({ ...prev, [nurse.id]: 'Système normal' }));
                                      }}
                                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                                        currentAssignment === 'Système normal'
                                          ? 'bg-emerald-600 text-white shadow-2xs'
                                          : 'text-slate-600 hover:text-slate-900'
                                      }`}
                                    >
                                      {currentAssignment === 'Système normal' && <Check className="w-3 h-3" />}
                                      Système Normal
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAssignments(prev => ({ ...prev, [nurse.id]: 'Système de garde' }));
                                      }}
                                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                                        currentAssignment === 'Système de garde'
                                          ? 'bg-amber-600 text-white shadow-2xs'
                                          : 'text-slate-600 hover:text-slate-900'
                                      }`}
                                    >
                                      {currentAssignment === 'Système de garde' && <Check className="w-3 h-3" />}
                                      Garde
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAssignments(prev => ({ ...prev, [nurse.id]: 'conserver' }));
                                      }}
                                      className={`px-2 py-1 rounded-md text-[11px] transition-colors ${
                                        currentAssignment === 'conserver'
                                          ? 'bg-white text-slate-800 font-semibold shadow-2xs'
                                          : 'text-slate-500 hover:text-slate-800'
                                      }`}
                                      title="Conserver le statut actuel de l'agent"
                                    >
                                      Conserver
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            Période définie : <strong className="text-emerald-950 font-bold">{formatDateFr(dateDebut)}</strong> au <strong className="text-emerald-950 font-bold">{formatDateFr(dateFin)}</strong>
            <span className="ml-2 text-slate-500 font-mono">({stats.normalCount} normal · {stats.gardeCount} garde)</span>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-xs font-medium"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-2 px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors text-xs font-semibold shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              Valider & Appliquer le Tour de Rôle
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
