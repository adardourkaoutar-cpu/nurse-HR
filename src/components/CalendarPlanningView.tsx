import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Flag, 
  Sparkles,
  AlertTriangle,
  User,
  Plus,
  Info,
  CalendarDays,
  FileCheck2,
  RotateCcw
} from 'lucide-react';
import { NurseStaff, DemandeConge, TypeConge } from '../types/nurse';
import { 
  MOROCCAN_HOLIDAYS_MAP, 
  getMoroccanHolidaysForMonth, 
  getMoroccanHolidaysForYear, 
  isMoroccanHoliday,
  MoroccanHoliday
} from '../utils/moroccanHolidays';
import { formatDateFr, formatFonction } from '../utils/calculations';

interface CalendarPlanningViewProps {
  nurses: NurseStaff[];
  demandes: DemandeConge[];
  onConfirmPlannedLeave: (demandeId: string) => void;
  onCancelPlannedLeave: (demandeId: string) => void;
  onNewLeave: () => void;
  onSelectNurse: (nurse: NurseStaff) => void;
  onOpenRotationModal?: () => void;
}

export const CalendarPlanningView: React.FC<CalendarPlanningViewProps> = ({
  nurses,
  demandes,
  onConfirmPlannedLeave,
  onCancelPlannedLeave,
  onNewLeave,
  onSelectNurse,
  onOpenRotationModal,
}) => {
  // Current view reference: default to current Moroccan calendar month in 2026
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(10); // 1-indexed (10 = Octobre)
  const [activeSubTab, setActiveSubTab] = useState<'mensuel' | 'annuel' | 'feries'>('mensuel');
  const [selectedDayModal, setSelectedDayModal] = useState<string | null>(null);

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // Navigate months
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Moroccan holidays for current month
  const monthlyHolidays = useMemo(() => {
    return getMoroccanHolidaysForMonth(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Moroccan holidays full year
  const yearlyHolidays = useMemo(() => {
    return getMoroccanHolidaysForYear(currentYear);
  }, [currentYear]);

  // Current month string formatted "YYYY-MM"
  const currentMonthPrefix = useMemo(() => {
    return `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  }, [currentYear, currentMonth]);

  // Planned leaves for this month requiring start-of-month confirmation/cancellation
  const plannedLeavesForConfirmation = useMemo(() => {
    return demandes.filter(d => {
      // Must be planned for current month or overlapping, and in planned state or pending
      const startsInMonth = d.dateCessation.startsWith(currentMonthPrefix);
      const isPendingPlanning = d.statutPrevisionnel === 'prevu_a_confirmer' || 
        (!d.statutPrevisionnel && d.etatDemande === 'En attente' && startsInMonth);
      return isPendingPlanning;
    });
  }, [demandes, currentMonthPrefix]);

  // Calculate calendar days matrix for the active month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const totalDays = lastDay.getDate();

    // In JS, getDay() returns 0 for Sunday, 1 for Monday...
    // We want Monday = 0, Tuesday = 1, ... Sunday = 6
    let startingDayOfWeek = firstDay.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const days = [];

    // Previous month padding
    const prevMonthLastDay = new Date(currentYear, currentMonth - 1, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        dayOfWeek: (startingDayOfWeek - 1 - i) % 7,
      });
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const d = new Date(currentYear, currentMonth - 1, day);
      let dayOfWeek = d.getDay() - 1;
      if (dayOfWeek === -1) dayOfWeek = 6;

      days.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: true,
        dayOfWeek,
      });
    }

    // Next month padding to complete 35 or 42 grid cells
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: false,
        dayOfWeek: (days.length) % 7,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Helper: Get leaves active on a specific date
  const getLeavesForDate = (dateStr: string) => {
    return demandes.filter(d => {
      if (d.etatDemande === 'Refusé' || d.statutPrevisionnel === 'annule') return false;
      return dateStr >= d.dateCessation && dateStr <= d.dateReprisePrevue;
    }).map(d => {
      const nurse = nurses.find(n => n.id === d.nurseId);
      return {
        demande: d,
        nurse,
      };
    });
  };

  // Color mapper for leave types
  const getLeaveTypeStyle = (type: TypeConge) => {
    if (type === 'Congé Administratif') {
      return 'bg-teal-50 text-teal-800 border-teal-200';
    } else if (type === 'Congé de Maladie') {
      return 'bg-rose-50 text-rose-800 border-rose-200';
    } else if (type.includes('Maternité')) {
      return 'bg-purple-50 text-purple-800 border-purple-200';
    }
    return 'bg-indigo-50 text-indigo-800 border-indigo-200';
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Toolbar: Navigation & Sub-tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Month / Year Navigator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-white rounded-md text-slate-700 transition-colors"
                title="Mois précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-3 py-1 font-bold text-slate-900 text-sm whitespace-nowrap min-w-[140px] text-center">
                {monthNames[currentMonth - 1]} {currentYear}
              </div>
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-white rounded-md text-slate-700 transition-colors"
                title="Mois suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Year Selector */}
            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(Number(e.target.value))}
              className="text-xs font-semibold px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          {/* Sub-view switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveSubTab('mensuel')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'mensuel' 
                  ? 'bg-white text-teal-800 font-semibold shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Calendrier Mensuel des Congés
            </button>
            <button
              onClick={() => setActiveSubTab('annuel')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'annuel' 
                  ? 'bg-white text-teal-800 font-semibold shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Planning Annuel Prévisionnel
            </button>
            <button
              onClick={() => setActiveSubTab('feries')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'feries' 
                  ? 'bg-white text-teal-800 font-semibold shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Flag className="w-3.5 h-3.5 text-amber-600" />
              Jours Fériés Maroc ({monthlyHolidays.length} ce mois)
            </button>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-2">
            {onOpenRotationModal && (
              <button
                onClick={onOpenRotationModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg shadow-2xs transition-colors"
                title="Définir manuellement la période du Système Normal pour ce mois"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                Tour de Rôle : Définir Période ({monthNames[currentMonth - 1]})
              </button>
            )}

            <button
              onClick={onNewLeave}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Poser un Congé
            </button>
          </div>

        </div>
      </div>

      {/* 2. SPEC REQUIREMENT: "au début de chaque mois, il faut confirmer ou annuler la demande initiale, puis passer vers la procédure de demande de congé" */}
      {plannedLeavesForConfirmation.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  Point de Contrôle Début de Mois · {monthNames[currentMonth - 1]} {currentYear}
                </h3>
                <p className="text-xs text-amber-900 mt-0.5">
                  Conformément aux directives de gestion du bloc opératoire, au début de chaque mois, vous devez <span className="font-semibold underline">confirmer ou annuler les demandes initiales prévues</span> avant le déclenchement de la procédure formelle.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-amber-200 text-amber-900 rounded-full shrink-0">
              {plannedLeavesForConfirmation.length} demande(s) en attente d'arbitrage
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {plannedLeavesForConfirmation.map(dem => {
              const nurse = nurses.find(n => n.id === dem.nurseId);
              return (
                <div 
                  key={dem.id}
                  className="bg-white border border-amber-200 rounded-lg p-3.5 flex flex-col justify-between shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-teal-700" />
                        {nurse ? `${nurse.nom} ${nurse.prenom}` : 'Infirmier inconnu'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        PPR: {nurse?.ppr || '-'} · {nurse?.specialite} · {nurse ? formatFonction(nurse.fonction) : ''}
                      </div>
                      <div className="text-xs font-semibold text-teal-800 mt-1">
                        {dem.typeConge}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Du <span className="font-semibold">{formatDateFr(dem.dateCessation)}</span> au <span className="font-semibold">{formatDateFr(dem.dateReprisePrevue)}</span>
                        <span className="ml-1 font-mono text-slate-500">({dem.nombreJours} jours)</span>
                      </div>
                    </div>

                    <span className="text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                      Prévu Début Mois
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 justify-end">
                    <button
                      onClick={() => onCancelPlannedLeave(dem.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Annuler la demande initiale
                    </button>
                    <button
                      onClick={() => onConfirmPlannedLeave(dem.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Confirmer & Lancer la procédure
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2.B TOUR DE RÔLE MENSUEL : Définition des périodes du Système Normal */}
      {onOpenRotationModal && (
        <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 mt-0.5">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-emerald-950">
                  Tour de Rôle Mensuel · Alternance Système Normal & Système de Garde
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded">
                  {monthNames[currentMonth - 1]} {currentYear}
                </span>
              </div>
              <p className="text-xs text-emerald-900 mt-1 max-w-3xl leading-relaxed">
                Le personnel infirmier alterne entre le système de garde et le système normal. 
                Au début de chaque mois, définissez manuellement les dates de début et de fin de période pour l'équipe en système normal.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenRotationModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors shrink-0"
          >
            <Clock className="w-4 h-4" />
            Définir les Périodes du Tour de Rôle
          </button>
        </div>
      )}

      {/* 3. Sub Tab 1: Calendrier Mensuel des Congés & Jours Fériés */}
      {activeSubTab === 'mensuel' && (
        <div className="space-y-4">
          
          {/* Quick Legend & Info */}
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-semibold text-slate-800">Légende:</span>
              
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-500"></span>
                <span>Jour Férié Officiel (Maroc)</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-teal-100 border border-teal-300"></span>
                <span>Congé Administratif (22j ouvrables)</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-rose-100 border border-rose-300"></span>
                <span>Congé Maladie (Saisie directe)</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-purple-100 border border-purple-300"></span>
                <span>Maternité (90 jours statutaires)</span>
              </div>

              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200"></span>
                <span>Samedi & Dimanche (Exclus du décompte)</span>
              </div>
            </div>

            <div className="text-[11px] text-teal-800 font-medium">
              Décompte légal : 22 jours ouvrables hors samedis, dimanches et fériés
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            
            {/* Days of week header */}
            <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200 text-center text-xs font-bold text-slate-700 py-2.5">
              <div>Lundi</div>
              <div>Mardi</div>
              <div>Mercredi</div>
              <div>Jeudi</div>
              <div>Vendredi</div>
              <div className="text-rose-700">Samedi</div>
              <div className="text-rose-700">Dimanche</div>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-100">
              {calendarDays.map((cell, idx) => {
                const holiday = isMoroccanHoliday(cell.dateStr);
                const isWeekend = cell.dayOfWeek === 5 || cell.dayOfWeek === 6; // Samedi ou Dimanche
                const dayLeaves = getLeavesForDate(cell.dateStr);

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (dayLeaves.length > 0 || holiday.isHoliday) {
                        setSelectedDayModal(cell.dateStr);
                      }
                    }}
                    className={`min-h-[105px] p-2 flex flex-col justify-between transition-colors cursor-pointer ${
                      !cell.isCurrentMonth
                        ? 'bg-slate-50/50 text-slate-400'
                        : isWeekend
                          ? 'bg-slate-50/90 text-slate-700 hover:bg-slate-100'
                          : holiday.isHoliday
                            ? 'bg-amber-50/60 text-slate-900 hover:bg-amber-50'
                            : 'bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {/* Top: Day Number & Holiday Tag */}
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-bold tabular-nums font-mono ${
                        holiday.isHoliday 
                          ? 'px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900' 
                          : isWeekend 
                            ? 'text-rose-600' 
                            : 'text-slate-800'
                      }`}>
                        {cell.dayNum}
                      </span>

                      {holiday.isHoliday && (
                        <span 
                          title={holiday.name} 
                          className="text-[10px] font-semibold text-amber-900 truncate max-w-[85px] bg-amber-100 px-1 py-0.5 rounded border border-amber-300"
                        >
                          {holiday.name}
                        </span>
                      )}
                    </div>

                    {/* Middle: Active Leaves Pills */}
                    <div className="space-y-1 my-1 overflow-hidden">
                      {dayLeaves.slice(0, 3).map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          title={`${item.nurse?.nom || ''} ${item.nurse?.prenom || ''} - ${item.demande.typeConge}`}
                          className={`text-[10px] px-1.5 py-0.5 rounded border font-medium truncate flex items-center justify-between ${getLeaveTypeStyle(item.demande.typeConge)}`}
                        >
                          <span className="truncate">
                            {item.nurse?.nom || 'Agent'} {item.nurse?.prenom?.charAt(0) || ''}.
                          </span>
                          <span className="text-[9px] opacity-75 shrink-0 ml-1">
                            {item.demande.typeConge.split(' ')[1] || ''}
                          </span>
                        </div>
                      ))}

                      {dayLeaves.length > 3 && (
                        <div className="text-[10px] text-teal-800 font-bold text-center bg-teal-50 rounded py-0.5">
                          +{dayLeaves.length - 3} autre(s)
                        </div>
                      )}
                    </div>

                    {/* Bottom: Quick Indicator */}
                    <div className="text-[10px] text-slate-400 text-right">
                      {dayLeaves.length > 0 && (
                        <span className="font-mono text-slate-600 font-semibold">
                          {dayLeaves.length} en congé
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Monthly Holidays list card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-3">
              <Flag className="w-4 h-4 text-amber-600" />
              Jours Fériés Officiels du Mois de {monthNames[currentMonth - 1]} {currentYear} au Maroc
            </h3>

            {monthlyHolidays.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                Aucun jour férié officiel enregistré pour ce mois.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {monthlyHolidays.map((h, i) => (
                  <div key={i} className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-900 flex flex-col items-center justify-center font-bold text-xs shrink-0">
                      <span>{h.date.split('-')[2]}</span>
                      <span className="text-[9px] uppercase font-normal">{monthNames[currentMonth - 1].slice(0, 3)}</span>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{h.nom}</div>
                      <div className="text-[11px] text-amber-900 font-medium">{h.description}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Date officielle: {formatDateFr(h.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* 4. Sub Tab 2: Planning Annuel Prévisionnel */}
      {activeSubTab === 'annuel' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-teal-700" />
                  Planning Annuel Prévisionnel des Congés ({currentYear})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Répartition mensuelle des congés pour l'ensemble du staff infirmier du bloc opératoire.
                </p>
              </div>

              <div className="text-xs font-mono text-slate-500">
                Total staff : {nurses.length} infirmiers
              </div>
            </div>

            {nurses.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Aucun infirmier enregistré dans l'application. Ajoutez du personnel pour visualiser le planning.
              </div>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="py-2.5 px-3 min-w-[180px]">Agent / Rôle</th>
                      {monthNames.map((m, idx) => (
                        <th key={idx} className="py-2.5 px-1.5 text-center min-w-[70px]">
                          {m.slice(0, 3)}
                        </th>
                      ))}
                      <th className="py-2.5 px-3 text-right">Reliquat Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {nurses.map(nurse => {
                      const nurseDemandes = demandes.filter(d => 
                        d.nurseId === nurse.id && 
                        d.dateCessation.startsWith(`${currentYear}`) &&
                        d.etatDemande !== 'Refusé' &&
                        d.statutPrevisionnel !== 'annule'
                      );

                      return (
                        <tr key={nurse.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3">
                            <div 
                              onClick={() => onSelectNurse(nurse)}
                              className="font-bold text-slate-900 hover:text-teal-700 cursor-pointer"
                            >
                              {nurse.nom} {nurse.prenom}
                            </div>
                            <div className="text-[11px] text-teal-800">
                              {nurse.specialite} · {formatFonction(nurse.fonction)}
                            </div>
                          </td>

                          {monthNames.map((_, mIdx) => {
                            const monthNum = String(mIdx + 1).padStart(2, '0');
                            const monthKey = `${currentYear}-${monthNum}`;
                            const monthDemandes = nurseDemandes.filter(d => d.dateCessation.startsWith(monthKey));

                            return (
                              <td key={mIdx} className="py-2.5 px-1 text-center">
                                {monthDemandes.length > 0 ? (
                                  <div className="space-y-1">
                                    {monthDemandes.map(md => (
                                      <div
                                        key={md.id}
                                        title={`${md.typeConge}: ${md.nombreJours}j (du ${formatDateFr(md.dateCessation)} au ${formatDateFr(md.dateReprisePrevue)})`}
                                        className={`px-1 py-0.5 rounded text-[10px] font-bold truncate ${
                                          md.statutPrevisionnel === 'prevu_a_confirmer'
                                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                            : md.typeConge === 'Congé Administratif'
                                              ? 'bg-teal-100 text-teal-800'
                                              : md.typeConge === 'Congé de Maladie'
                                                ? 'bg-rose-100 text-rose-800'
                                                : 'bg-purple-100 text-purple-800'
                                        }`}
                                      >
                                        {md.nombreJours}j
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-300 text-[10px]">-</span>
                                )}
                              </td>
                            );
                          })}

                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                            {nurse.congeAdmin.limiteAnnuelle + nurse.congeAdmin.joursReportes - nurse.congeAdmin.joursConsommes}j
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 5. Sub Tab 3: Répertoire Complet des Jours Fériés au Maroc */}
      {activeSubTab === 'feries' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Flag className="w-4 h-4 text-amber-600" />
                  Calendrier Officiel des Jours Fériés au Royaume du Maroc ({currentYear})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mis à jour automatiquement avec les fêtes nationales civiles et fêtes religieuses hégiriennes.
                </p>
              </div>

              <div className="text-xs text-teal-800 font-semibold bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200">
                Règle : Jours fériés totalement décomptés et exemptés des 22 jours de congé
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
              {yearlyHolidays.map((monthGroup) => (
                <div key={monthGroup.mois} className="bg-slate-50/70 border border-slate-200 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span className="font-bold text-xs text-slate-800">
                      {monthGroup.nomMois} {currentYear}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {monthGroup.feries.length} férié(s)
                    </span>
                  </div>

                  {monthGroup.feries.length === 0 ? (
                    <div className="text-[11px] text-slate-400 italic py-2">
                      Aucun jour férié ce mois-ci
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      {monthGroup.feries.map((f, fIdx) => (
                        <div key={fIdx} className="bg-white p-2.5 rounded border border-amber-200/80 shadow-2xs">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                            <span>{f.nom}</span>
                            <span className="font-mono text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded text-[11px]">
                              {formatDateFr(f.date)}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            {f.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* 6. Day Detail Modal */}
      {selectedDayModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Détail de la Journée : {formatDateFr(selectedDayModal, 'long')}
                </h3>
                <p className="text-xs text-slate-500">
                  Situation du personnel et calendrier officiel
                </p>
              </div>
              <button
                onClick={() => setSelectedDayModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Holiday Info */}
              {isMoroccanHoliday(selectedDayModal).isHoliday && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
                  <Flag className="w-5 h-5 text-amber-700 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-amber-950">
                      Jour Férié Officiel : {isMoroccanHoliday(selectedDayModal).name}
                    </div>
                    <div className="text-[11px] text-amber-900">
                      Jour chômé et payé · Non décompté des 22 jours de congé administratif
                    </div>
                  </div>
                </div>
              )}

              {/* Staff on leave */}
              <div>
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Staff infirmier en congé ce jour ({getLeavesForDate(selectedDayModal).length})
                </div>

                {getLeavesForDate(selectedDayModal).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    Aucun infirmier en congé pour cette date.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {getLeavesForDate(selectedDayModal).map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {item.nurse?.nom} {item.nurse?.prenom}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {item.nurse?.specialite} · {item.nurse ? formatFonction(item.nurse.fonction) : ''} (PPR: {item.nurse?.ppr})
                          </div>
                          <div className="text-xs font-semibold text-teal-800 mt-1">
                            {item.demande.typeConge} ({item.demande.nombreJours}j)
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Période : {formatDateFr(item.demande.dateCessation)} au {formatDateFr(item.demande.dateReprisePrevue)}
                          </div>
                        </div>

                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          item.demande.etatDemande === 'Confirmé'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.demande.etatDemande}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedDayModal(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
