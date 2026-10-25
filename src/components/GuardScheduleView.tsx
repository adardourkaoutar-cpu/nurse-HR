import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Shield, 
  Calendar, 
  Download, 
  Upload, 
  Save, 
  RotateCcw, 
  Printer, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  FileSpreadsheet, 
  FileText, 
  Layers, 
  Sparkles, 
  Info, 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  UserCheck, 
  Edit3, 
  Check, 
  X,
  FileCheck2,
  RefreshCw,
  Search,
  Eye
} from 'lucide-react';
import { MoroccanCoatOfArms } from './MoroccanCoatOfArms';
import { NurseStaff, DemandeConge } from '../types/nurse';
import { 
  GuardCategory, 
  GuardScheduleRecord, 
  NurseScheduleRow, 
  ShiftCode, 
  SHIFT_DEFINITIONS 
} from '../types/guardSchedule';
import { 
  getNursesByCategory, 
  getCategoryLabel, 
  checkPreparationWindow, 
  createInitialGuardRecord, 
  applyStandardCycle,
  MOIS_FR 
} from '../utils/guardScheduleHelpers';
import { 
  getDaysInMonth, 
  getDayOfWeekShort, 
  exportGuardScheduleToWPS, 
  parseWPSOfficeFile 
} from '../utils/wpsGuardExportImport';

const STORAGE_KEY_GUARD_ARCHIVES = 'blocrh_guard_archives_v2';

interface GuardScheduleViewProps {
  nurses: NurseStaff[];
  demandes: DemandeConge[];
  onOpenNurseDetail?: (nurse: NurseStaff) => void;
  onUpdateNurseHNPeriod?: (nurseId: string, dateDebut: string, dateFin: string) => void;
}

export const GuardScheduleView: React.FC<GuardScheduleViewProps> = ({
  nurses,
  demandes,
  onOpenNurseDetail,
  onUpdateNurseHNPeriod
}) => {
  // Current date in application context: 25 Octobre 2026
  const currentDateStr = '2026-10-25';
  const prepStatus = useMemo(() => checkPreparationWindow(currentDateStr), [currentDateStr]);

  // Selected Month and Year for guard schedule
  const [selectedYear, setSelectedYear] = useState<number>(prepStatus.recommendedNextMonth.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(prepStatus.recommendedNextMonth.month);

  // Active Category (1. Anesthésistes, 2. Aide-Opératoire / Panseur, 3. Stérilisation)
  const [activeCategory, setActiveCategory] = useState<GuardCategory>('anesth');

  // Sub-view: 'grille' (Interactive roster & WPS), 'pre_verrouillage' (Pre-defined CA & HN review), 'archives' (Stored history)
  const [subView, setSubView] = useState<'grille' | 'pre_verrouillage' | 'archives'>('grille');

  // Display mode for grid: 'modele_officiel' (matching exact PDF template) or 'vue_etendue' (with totals & details)
  const [viewMode, setViewMode] = useState<'modele_officiel' | 'vue_etendue'>('modele_officiel');

  // Stored Archives
  const [archives, setArchives] = useState<GuardScheduleRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GUARD_ARCHIVES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading guard archives', e);
    }
    return [];
  });

  // Save archives to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_GUARD_ARCHIVES, JSON.stringify(archives));
    } catch (e) {
      console.error('Error saving guard archives', e);
    }
  }, [archives]);

  // Active working record in memory for current category, year, and month
  const [activeRecord, setActiveRecord] = useState<GuardScheduleRecord | null>(null);

  // Notification / Feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Rectification modal / state
  const [rectificationModalOpen, setRectificationModalOpen] = useState(false);
  const [rectificationNotes, setRectificationNotes] = useState('');
  const [targetArchiveToRectify, setTargetArchiveToRectify] = useState<GuardScheduleRecord | null>(null);

  // Print Preview Modal state
  const [printRecord, setPrintRecord] = useState<GuardScheduleRecord | null>(null);

  // File input ref for WPS Office upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Days in selected month
  const daysCount = useMemo(() => getDaysInMonth(selectedYear, selectedMonth), [selectedYear, selectedMonth]);

  // Available nurses for the active category
  const categoryNurses = useMemo(() => {
    return getNursesByCategory(nurses, activeCategory);
  }, [nurses, activeCategory]);

  // Load or initialize activeRecord when category, month, or year changes
  useEffect(() => {
    // Check if there is an existing archive for this category & month
    const existing = archives.find(
      a => a.categorie === activeCategory && a.mois === selectedMonth && a.annee === selectedYear
    );

    if (existing) {
      // Load most recent version
      setActiveRecord(JSON.parse(JSON.stringify(existing)));
    } else {
      // Create fresh record with CA & HN locked
      const fresh = createInitialGuardRecord(activeCategory, nurses, demandes, selectedYear, selectedMonth);
      setActiveRecord(fresh);
    }
  }, [activeCategory, selectedMonth, selectedYear, nurses, demandes]);

  const showFeedback = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 6000);
  };

  // Toggle shift on cell click (GJ -> GN -> R -> HN -> CA -> Vide)
  const handleCellClick = (nurseId: string, day: number) => {
    if (!activeRecord) return;

    const nextShiftMap: Record<ShiftCode, ShiftCode> = {
      '': 'GJ',
      'GJ': 'GN',
      'GN': 'R',
      'R': 'HN',
      'HN': 'CA',
      'CA': ''
    };

    setActiveRecord(prev => {
      if (!prev) return prev;
      const updatedLignes = prev.lignes.map(row => {
        if (row.nurseId !== nurseId) return row;

        const cur = row.assignments[day];
        if (!cur) return row;

        const nextCode = nextShiftMap[cur.shift || ''];

        const newAssignments = {
          ...row.assignments,
          [day]: {
            ...cur,
            shift: nextCode
          }
        };

        // Recount totals
        let countGJ = 0;
        let countGN = 0;
        let countR = 0;
        let countHN = 0;
        let countCA = 0;

        for (let d = 1; d <= daysCount; d++) {
          const s = newAssignments[d]?.shift;
          if (s === 'GJ') countGJ++;
          else if (s === 'GN') countGN++;
          else if (s === 'R') countR++;
          else if (s === 'HN') countHN++;
          else if (s === 'CA') countCA++;
        }

        return {
          ...row,
          assignments: newAssignments,
          totalGJ: countGJ,
          totalGN: countGN,
          totalR: countR,
          totalHN: countHN,
          totalCA: countCA,
          totalHeuresGarde: (countGJ + countGN) * 12
        };
      });

      return {
        ...prev,
        lignes: updatedLignes,
        dateDerniereModification: new Date().toISOString()
      };
    });
  };

  // Direct set of shift code for a cell
  const handleSetCellShift = (nurseId: string, day: number, code: ShiftCode) => {
    if (!activeRecord) return;

    setActiveRecord(prev => {
      if (!prev) return prev;
      const updatedLignes = prev.lignes.map(row => {
        if (row.nurseId !== nurseId) return row;

        const cur = row.assignments[day];
        if (!cur) return row;

        const newAssignments = {
          ...row.assignments,
          [day]: {
            ...cur,
            shift: code
          }
        };

        let countGJ = 0;
        let countGN = 0;
        let countR = 0;
        let countHN = 0;
        let countCA = 0;

        for (let d = 1; d <= daysCount; d++) {
          const s = newAssignments[d]?.shift;
          if (s === 'GJ') countGJ++;
          else if (s === 'GN') countGN++;
          else if (s === 'R') countR++;
          else if (s === 'HN') countHN++;
          else if (s === 'CA') countCA++;
        }

        return {
          ...row,
          assignments: newAssignments,
          totalGJ: countGJ,
          totalGN: countGN,
          totalR: countR,
          totalHN: countHN,
          totalCA: countCA,
          totalHeuresGarde: (countGJ + countGN) * 12
        };
      });

      return {
        ...prev,
        lignes: updatedLignes,
        dateDerniereModification: new Date().toISOString()
      };
    });
  };

  // Apply standard cycle to a specific nurse or all nurses
  const handleApplyStandardCycleAll = () => {
    if (!activeRecord) return;

    setActiveRecord(prev => {
      if (!prev) return prev;
      const updatedLignes = prev.lignes.map((row, idx) => {
        // Distribute offsets across nurses so different teams cover different days (0, 1, 2, 3)
        const offset = idx % 4;
        return applyStandardCycle(row, offset, daysCount);
      });

      return {
        ...prev,
        lignes: updatedLignes,
        dateDerniereModification: new Date().toISOString()
      };
    });

    showFeedback('Cycle réglementaire (GJ → GN → R → R) appliqué en tournant sur 4 équipes en préservant strictement les CA et HN.');
  };

  // Reset/Clear empty days (while keeping CA & HN)
  const handleResetEmptyDays = () => {
    if (!activeRecord) return;
    const fresh = createInitialGuardRecord(activeCategory, nurses, demandes, selectedYear, selectedMonth);
    setActiveRecord(fresh);
    showFeedback('Grille réinitialisée. Seules les périodes obligatoires CA (congés) et HN (système normal) sont conservées.');
  };

  // WPS Office Export
  const handleExportWPS = () => {
    if (!activeRecord) return;
    try {
      exportGuardScheduleToWPS(activeRecord);
      showFeedback(`Fichier Excel généré avec succès pour WPS Office (${activeRecord.titre}.xlsx). Vous pouvez l'ouvrir directement dans WPS Office.`);
    } catch (err: any) {
      console.error(err);
      showFeedback(`Erreur lors de l'exportation WPS : ${err.message}`, 'error');
    }
  };

  // WPS Office Import handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeRecord) return;

    const result = await parseWPSOfficeFile(file, activeRecord);
    if (result.success && result.updatedLignes) {
      setActiveRecord(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          lignes: result.updatedLignes!,
          dateDerniereModification: new Date().toISOString()
        };
      });
      showFeedback(`Importation WPS Office réussie ! ${result.changedCount || 0} affectations mises à jour depuis le fichier.`);
    } else {
      showFeedback(result.error || 'Erreur lors de la lecture du fichier WPS Office.', 'error');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Save to Archive
  const handleSaveToArchive = (statut: 'Brouillon' | 'Validé') => {
    if (!activeRecord) return;

    const updatedRecord: GuardScheduleRecord = {
      ...activeRecord,
      statut,
      dateDerniereModification: new Date().toISOString()
    };

    setArchives(prev => {
      // Check if this version exists
      const existingIdx = prev.findIndex(
        a => a.categorie === updatedRecord.categorie && 
             a.mois === updatedRecord.mois && 
             a.annee === updatedRecord.annee
      );

      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = updatedRecord;
        return copy;
      } else {
        return [updatedRecord, ...prev];
      }
    });

    setActiveRecord(updatedRecord);
    showFeedback(`Le tableau de garde a été conservé avec succès dans l'Archive (${statut} - Version ${updatedRecord.version}).`);
  };

  // Initiate Rectification of an Archived Schedule
  const handleStartRectification = (archiveToRectify: GuardScheduleRecord) => {
    setTargetArchiveToRectify(archiveToRectify);
    setRectificationNotes(`Ajustement des gardes au cours du mois de ${archiveToRectify.moisLibelle}`);
    setRectificationModalOpen(true);
  };

  // Confirm Rectification: increments version (e.g. v1 -> v2) and marks as "Rectifié en cours de mois"
  const handleConfirmRectification = () => {
    if (!targetArchiveToRectify) return;

    const newVersion = (targetArchiveToRectify.version || 1) + 1;
    const rectifiedRecord: GuardScheduleRecord = {
      ...targetArchiveToRectify,
      version: newVersion,
      statut: 'Rectifié en cours de mois',
      rectificationNotes: rectificationNotes.trim() || 'Rectification effectuée en cours de mois',
      dateDerniereModification: new Date().toISOString()
    };

    // Update active record and category
    setActiveCategory(rectifiedRecord.categorie);
    setSelectedMonth(rectifiedRecord.mois);
    setSelectedYear(rectifiedRecord.annee);
    setActiveRecord(rectifiedRecord);

    // Update in archives
    setArchives(prev => {
      const idx = prev.findIndex(a => a.id === targetArchiveToRectify.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = rectifiedRecord;
        return copy;
      }
      return [rectifiedRecord, ...prev];
    });

    setRectificationModalOpen(false);
    setSubView('grille');
    showFeedback(`Le tableau a été basculé en mode Rectification (Version ${newVersion}). Vous pouvez modifier les gardes ou réimporter depuis WPS Office.`);
  };

  // Calculate daily totals for column coverage summary
  const dailyCoverage = useMemo(() => {
    if (!activeRecord) return [];
    const coverage: { day: number; countGJ: number; countGN: number }[] = [];

    for (let d = 1; d <= daysCount; d++) {
      let cGJ = 0;
      let cGN = 0;
      activeRecord.lignes.forEach(l => {
        const s = l.assignments[d]?.shift;
        if (s === 'GJ') cGJ++;
        if (s === 'GN') cGN++;
      });
      coverage.push({ day: d, countGJ: cGJ, countGN: cGN });
    }
    return coverage;
  }, [activeRecord, daysCount]);

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Preparation Window Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-200">
                Bloc Opératoire · Listes Distinctes
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Cycle standard : GJ (12h) → GN (12h) → Récupération 48h (R)
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-teal-700" />
              Tableaux de Garde & Système Normal
            </h1>
            <p className="text-xs text-slate-600">
              Conception, vérification préalable des congés (CA) et de l'horaire normal (HN), synchronisation bidirectionnelle avec WPS Office et archivage avec rectifications en cours de mois.
            </p>
          </div>

          {/* Preparation window card */}
          <div className={`p-3.5 rounded-lg border text-xs max-w-md ${
            prepStatus.isWindowOpen 
              ? 'bg-amber-50 border-amber-300 text-amber-900' 
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center gap-2 font-bold mb-1">
              <Clock className={`w-4 h-4 ${prepStatus.isWindowOpen ? 'text-amber-700 animate-pulse' : 'text-slate-500'}`} />
              <span>Fenêtre Réglementaire de Préparation (25 au 30/31)</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {prepStatus.message}
            </p>
            <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-amber-200/60 font-semibold text-[11px]">
              <span>Mois cible recommandé :</span>
              <span className="bg-white px-2 py-0.5 rounded border border-amber-300 text-amber-950 font-mono">
                {prepStatus.recommendedNextMonth.label}
              </span>
            </div>
          </div>
        </div>

        {/* Month Selector & Category Tabs */}
        <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Category Tabs: 1. Anesthésistes, 2. Aide-opératoire / Panseur, 3. Stérilisation */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveCategory('anesth')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeCategory === 'anesth'
                  ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-700/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              1. Anesthésistes (IAR)
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeCategory === 'anesth' ? 'bg-teal-800 text-teal-100' : 'bg-slate-200 text-slate-800'
              }`}>
                {getNursesByCategory(nurses, 'anesth').length}
              </span>
            </button>

            <button
              onClick={() => setActiveCategory('aide_op_panseur')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeCategory === 'aide_op_panseur'
                  ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-700/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              2. Aide-Opératoire / Panseur (IBO & IP)
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeCategory === 'aide_op_panseur' ? 'bg-teal-800 text-teal-100' : 'bg-slate-200 text-slate-800'
              }`}>
                {getNursesByCategory(nurses, 'aide_op_panseur').length}
              </span>
            </button>

            <button
              onClick={() => setActiveCategory('sterilisation')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeCategory === 'sterilisation'
                  ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-700/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              3. Stérilisation
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeCategory === 'sterilisation' ? 'bg-teal-800 text-teal-100' : 'bg-slate-200 text-slate-800'
              }`}>
                {getNursesByCategory(nurses, 'sterilisation').length}
              </span>
            </button>
          </div>

          {/* Month / Year selection */}
          <div className="flex items-center gap-2 self-start md:self-auto bg-slate-50 border border-slate-200 rounded-lg p-1.5">
            <span className="text-xs text-slate-500 font-medium pl-2">Mois :</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-600"
            >
              {MOIS_FR.map((m, idx) => (
                <option key={m} value={idx + 1}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-600"
            >
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

        </div>

        {/* Sub-view navigation tabs */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSubView('grille')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
                subView === 'grille'
                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-700" />
              Grille & Édition Roster
            </button>

            <button
              onClick={() => setSubView('pre_verrouillage')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
                subView === 'pre_verrouillage'
                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              Vérification Préalable CA & HN (N'improvise pas)
            </button>

            <button
              onClick={() => setSubView('archives')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
                subView === 'archives'
                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <History className="w-3.5 h-3.5 text-slate-600" />
              Archive des Listes & Rectifications ({archives.filter(a => a.categorie === activeCategory).length})
            </button>
          </div>

          {activeRecord && (
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded font-mono font-semibold ${
                activeRecord.statut === 'Validé' 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : activeRecord.statut === 'Rectifié en cours de mois'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-amber-100 text-amber-800'
              }`}>
                Version {activeRecord.version} · {activeRecord.statut}
              </span>
            </div>
          )}
        </div>

      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-lg text-xs font-medium flex items-center justify-between border ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
            : feedback.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-sky-50 text-sky-900 border-sky-200'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {feedback.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            {feedback.type === 'info' && <Info className="w-4 h-4 text-sky-600 shrink-0" />}
            <span>{feedback.text}</span>
          </div>
          <button 
            onClick={() => setFeedback(null)}
            className="text-slate-500 hover:text-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hidden file input for WPS Office import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".xlsx, .xls, .csv" 
        className="hidden" 
      />

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: GRILLE INTERACTIVE & WPS WORKFLOW */}
      {/* ========================================================================= */}
      {subView === 'grille' && (
        <div className="space-y-4">
          
          {/* Action Toolbar */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            
            {/* Left: WPS Office Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportWPS}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-lg shadow-sm transition-all"
                title="Télécharger le classeur Excel officiel prêt à ouvrir dans WPS Office"
              >
                <Download className="w-4 h-4 text-teal-200" />
                <span>Télécharger Modèle WPS Office (.xlsx)</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-all"
                title="Importer le tableau modifié ou complété dans l'application WPS Office"
              >
                <Upload className="w-4 h-4 text-amber-800" />
                <span>Importer depuis WPS Office</span>
              </button>

              <button
                onClick={handleApplyStandardCycleAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                title="Remplir automatiquement selon le cycle officiel GJ (12h) -> GN (12h) -> R (48h) en préservant CA et HN"
              >
                <RefreshCw className="w-3.5 h-3.5 text-teal-600" />
                <span>Générer Cycle Standard (GJ→GN→R)</span>
              </button>

              <button
                onClick={handleResetEmptyDays}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors"
                title="Vider les affectations de garde en conservant strictement les périodes CA et HN"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Réinitialiser</span>
              </button>
            </div>

            {/* Right: View Mode Toggle & Archive / Print Actions */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* View Mode Switcher */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => setViewMode('modele_officiel')}
                  className={`px-2.5 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                    viewMode === 'modele_officiel' 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Affichage 100% conforme au modèle officiel du Centre Hospitalier Sidi Ifni"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-teal-700" />
                  <span>Modèle Officiel (Sidi Ifni)</span>
                </button>
                <button
                  onClick={() => setViewMode('vue_etendue')}
                  className={`px-2.5 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                    viewMode === 'vue_etendue' 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Affichage avec totaux, PPR, jours de la semaine et détails statistiques"
                >
                  <span>Vue Étendue (Totaux)</span>
                </button>
              </div>

              {/* Link to view raw uploaded PDF template */}
              <a
                href="/assets/aistudio/LISTE_DE_GARDE_VIERGE_77a219c0.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-slate-600 hover:text-teal-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
                title="Consulter le fichier PDF officiel original fourni par l'hôpital"
              >
                <Eye className="w-4 h-4 text-teal-700" />
                <span className="hidden md:inline">Modèle PDF Vierge</span>
              </a>

              <button
                onClick={() => handleSaveToArchive('Brouillon')}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Enregistrer Brouillon
              </button>

              <button
                onClick={() => handleSaveToArchive('Validé')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Valider & Archiver</span>
              </button>

              <button
                onClick={() => setPrintRecord(activeRecord)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                title="Imprimer le tableau officiel conforme avec visas"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Quick Legend & Instructions Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-slate-700">Légende des postes :</span>
              
              <div className="flex items-center gap-1.5">
                <span className="w-6 h-5 rounded font-mono font-bold text-[10px] flex items-center justify-center bg-amber-100 text-amber-900 border border-amber-300">
                  GJ
                </span>
                <span className="text-slate-600">Garde Jour 12h (08h-20h)</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-6 h-5 rounded font-mono font-bold text-[10px] flex items-center justify-center bg-indigo-100 text-indigo-900 border border-indigo-300">
                  GN
                </span>
                <span className="text-slate-600">Garde Nuit 12h (20h-08h)</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-6 h-5 rounded font-mono font-bold text-[10px] flex items-center justify-center bg-emerald-100 text-emerald-900 border border-emerald-300">
                  R
                </span>
                <span className="text-slate-600">Récupération 48h</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-6 h-5 rounded font-mono font-bold text-[10px] flex items-center justify-center bg-sky-100 text-sky-900 border border-sky-300">
                  HN
                </span>
                <span className="text-slate-600">Horaire Normal (08h-16h30)</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-6 h-5 rounded font-mono font-bold text-[10px] flex items-center justify-center bg-rose-100 text-rose-900 border border-rose-300">
                  CA
                </span>
                <span className="text-slate-600">Congé Administratif</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 italic">
              💡 Astuce : Cliquez sur une case pour basculer le code, ou éditez directement dans WPS Office puis importez.
            </div>
          </div>

          {/* ========================================================================= */}
          {/* VIEW MODE 1: MODÈLE OFFICIEL (Strictement conforme au PDF Sidi Ifni) */}
          {/* ========================================================================= */}
          {viewMode === 'modele_officiel' && (
            <div className="bg-white border-2 border-slate-300 rounded-xl p-5 sm:p-8 shadow-sm space-y-6 overflow-hidden">
              
              {/* Official Moroccan Hospital Letterhead */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs border-b border-slate-900 pb-4">
                <div className="text-left font-serif space-y-0.5 text-center sm:text-left">
                  <div className="font-bold text-slate-900 text-sm">Royaume du Maroc</div>
                  <div className="text-slate-800 text-[11px]">Ministère de la santé et de la protection sociale</div>
                  <div className="text-slate-800 text-[11px]">Délégation provinciale de Sidi Ifni</div>
                  <div className="text-slate-800 text-[11px] font-semibold">Centre hospitalier provincial Sidi Ifni</div>
                </div>

                <div className="flex flex-col items-center justify-center shrink-0">
                  <MoroccanCoatOfArms className="w-16 h-16" />
                </div>

                <div className="text-right font-serif space-y-0.5 text-center sm:text-right" dir="rtl">
                  <div className="font-bold text-slate-900 text-sm">المملكة المغربية</div>
                  <div className="text-slate-800 text-[11px]">وزارة الصحة والحماية الاجتماعية</div>
                  <div className="text-slate-800 text-[11px]">المندوبية الإقليمية لسيدي إفني</div>
                  <div className="text-slate-800 text-[11px] font-semibold">المركز الاستشفائي الإقليمي سيدي إفني</div>
                </div>
              </div>

              {/* Main Title matching template: Liste de garde/horaire normal */}
              <div className="text-center pt-1 pb-1">
                <h2 className="text-2xl sm:text-3xl font-normal text-slate-900 tracking-tight font-serif">
                  Liste de garde/horaire normal
                </h2>
              </div>

              {/* Sub-header single line matching template */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-serif text-slate-900 border-b border-slate-200 pb-3">
                <div>
                  <span className="font-bold">Service : </span>
                  <span>Bloc opératoire</span>
                </div>
                <div>
                  <span className="font-bold">Mois : </span>
                  <span className="capitalize font-medium">{activeRecord?.moisNom || MOIS_FR[selectedMonth - 1]}</span>
                </div>
                <div>
                  <span className="font-bold">Année : </span>
                  <span className="font-medium">{selectedYear}</span>
                </div>
                <div>
                  <span className="font-bold">Cadre : </span>
                  <span className="font-semibold text-teal-900">
                    {activeRecord?.cadreLibelle || (
                      activeCategory === 'anesth' 
                        ? 'Infirmiers en anesthésie-réanimation' 
                        : activeCategory === 'aide_op_panseur' 
                          ? 'Infirmiers panseurs/aide-opératoire' 
                          : 'Infirmiers en stérilisation'
                    )}
                  </span>
                </div>
              </div>

              {/* Official Table Grid with diagonal header cell */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-900 text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-900 text-slate-900 h-11 bg-slate-50/50">
                      
                      {/* Diagonal split header cell: JOURS top-right / NOM COMPLET bottom-left */}
                      <th className="border border-slate-900 p-0 w-48 min-w-[190px] relative font-serif select-none">
                        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                          <line x1="0" y1="0" x2="100%" y2="100%" stroke="#0f172a" strokeWidth="1.2" />
                        </svg>
                        <div className="absolute top-1 right-2 text-[10px] font-bold tracking-wider text-slate-800">
                          JOURS
                        </div>
                        <div className="absolute bottom-1 left-2 text-[10px] font-bold tracking-wider text-slate-800 text-left leading-tight">
                          NOM<br/>COMPLET
                        </div>
                      </th>

                      {/* 1 to 31 columns */}
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <th 
                          key={day} 
                          className="border border-slate-900 px-0.5 py-1 text-center font-mono font-bold text-slate-900 min-w-[28px]"
                        >
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(!activeRecord || activeRecord.lignes.length === 0) ? (
                      <tr>
                        <td colSpan={32} className="py-12 text-center text-slate-400">
                          Aucun personnel enregistré dans cette catégorie.
                        </td>
                      </tr>
                    ) : (
                      activeRecord.lignes.map((ligne, idx) => (
                        <tr key={ligne.nurseId} className="border-b border-slate-900 h-8 hover:bg-slate-50 transition-colors">
                          <td className="border border-slate-900 px-2.5 py-1 font-serif text-[11px] font-bold text-slate-900 uppercase whitespace-nowrap bg-white">
                            {idx + 1}. {ligne.nom} {ligne.prenom}
                          </td>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                            const isPastMonth = day > daysCount;
                            const cur = ligne.assignments[day];
                            const s = isPastMonth ? '/' : (cur?.shift || '');

                            let colorClass = 'text-slate-400 hover:bg-slate-100';
                            if (isPastMonth) colorClass = 'text-slate-300 bg-slate-50 cursor-not-allowed';
                            else if (s === 'GJ') colorClass = 'bg-amber-100 text-amber-950 font-bold hover:bg-amber-200';
                            else if (s === 'GN') colorClass = 'bg-indigo-100 text-indigo-950 font-bold hover:bg-indigo-200';
                            else if (s === 'R') colorClass = 'bg-emerald-100 text-emerald-950 font-bold hover:bg-emerald-200';
                            else if (s === 'HN') colorClass = 'bg-sky-100 text-sky-950 font-bold hover:bg-sky-200';
                            else if (s === 'CA') colorClass = 'bg-rose-100 text-rose-950 font-bold hover:bg-rose-200';

                            return (
                              <td 
                                key={day} 
                                onClick={() => {
                                  if (!isPastMonth) handleCellClick(ligne.nurseId, day);
                                }}
                                title={!isPastMonth ? `Jour ${day} : ${s && s !== '/' ? (SHIFT_DEFINITIONS[s as ShiftCode]?.label || s) : 'Non affecté'} - Cliquez pour modifier` : undefined}
                                className={`border border-slate-900 px-0.5 py-0.5 text-center font-mono text-[11px] select-none transition-colors ${
                                  !isPastMonth ? 'cursor-pointer' : ''
                                } ${colorClass}`}
                              >
                                {s || '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}

                    {/* Extra blank rows matching official paper sheet aesthetic */}
                    {Array.from({ length: Math.max(0, 8 - (activeRecord?.lignes.length || 0)) }).map((_, idx) => (
                      <tr key={`empty-row-${idx}`} className="border-b border-slate-900 h-8 text-slate-400">
                        <td className="border border-slate-900 px-2.5 py-1 bg-white">&nbsp;</td>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <td key={day} className="border border-slate-900 px-0.5 py-0.5 text-center bg-white">&nbsp;</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Exact Legend matching template */}
              <div className="flex flex-wrap items-center justify-between text-xs font-serif text-slate-900 pt-3 px-2 border-t border-slate-200">
                <span className="font-bold">NB :</span>
                <span><span className="font-bold">GJ :</span> garde de jour</span>
                <span><span className="font-bold">GN :</span> garde de nuit</span>
                <span><span className="font-bold">R :</span> récupération</span>
                <span><span className="font-bold">HN :</span> horaire normal</span>
                <span><span className="font-bold">CA :</span> congé administratif</span>
              </div>

              {/* Exact Signatures row matching template */}
              <div className="pt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs font-serif text-slate-900">
                <div className="space-y-12">
                  <div className="font-bold">Infirmier Chef :</div>
                  <div className="border-b border-dotted border-slate-400 w-3/4"></div>
                </div>

                <div className="space-y-12 text-left sm:text-center">
                  <div className="font-bold">Chef du PSI :</div>
                  <div className="border-b border-dotted border-slate-400 w-3/4 sm:mx-auto"></div>
                </div>

                <div className="space-y-12 text-left sm:text-right">
                  <div className="font-bold">Le directeur :</div>
                  <div className="border-b border-dotted border-slate-400 w-3/4 sm:ml-auto"></div>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW MODE 2: VUE ÉTENDUE (Avec Totaux, PPR, Jours Semaine, Couverture) */}
          {/* ========================================================================= */}
          {viewMode === 'vue_etendue' && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[11px]">
                  
                  {/* Table Header */}
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                      <th className="sticky left-0 z-20 bg-slate-100 px-3 py-2.5 text-left font-bold text-slate-900 border-r border-slate-200 w-52 min-w-[210px]">
                        Personnel (du plus âgé au plus jeune)
                      </th>
                      <th className="px-2 py-2.5 text-center font-semibold border-r border-slate-200 w-20">
                        PPR
                      </th>
                      <th className="px-2 py-2.5 text-center font-semibold border-r border-slate-200 w-24">
                        Fonction
                      </th>

                      {/* Columns for days 1 to daysCount */}
                      {Array.from({ length: daysCount }, (_, i) => i + 1).map(day => {
                        const dow = getDayOfWeekShort(selectedYear, selectedMonth, day);
                        const isWeekend = dow === 'Sa' || dow === 'Di';

                        return (
                          <th 
                            key={day} 
                            className={`px-1 py-1.5 text-center font-bold border-r border-slate-200 min-w-[34px] ${
                              isWeekend ? 'bg-slate-200/80 text-rose-900 font-extrabold' : 'text-slate-800'
                            }`}
                          >
                            <div className="leading-tight font-mono">{day}</div>
                            <div className="text-[9px] font-normal text-slate-500">{dow}</div>
                          </th>
                        );
                      })}

                      {/* Summary Columns */}
                      <th className="px-2 py-2.5 text-center font-bold text-amber-900 bg-amber-50 border-r border-slate-200 min-w-[45px]">
                        GJ
                      </th>
                      <th className="px-2 py-2.5 text-center font-bold text-indigo-900 bg-indigo-50 border-r border-slate-200 min-w-[45px]">
                        GN
                      </th>
                      <th className="px-2 py-2.5 text-center font-bold text-emerald-900 bg-emerald-50 border-r border-slate-200 min-w-[45px]">
                        R
                      </th>
                      <th className="px-2 py-2.5 text-center font-bold text-sky-900 bg-sky-50 border-r border-slate-200 min-w-[45px]">
                        HN
                      </th>
                      <th className="px-2 py-2.5 text-center font-bold text-rose-900 bg-rose-50 border-r border-slate-200 min-w-[45px]">
                        CA
                      </th>
                      <th className="px-2 py-2.5 text-center font-bold text-teal-900 bg-teal-50 min-w-[60px]">
                        Heures
                      </th>
                    </tr>
                  </thead>

                  {/* Table Body: Nurses */}
                  <tbody className="divide-y divide-slate-150">
                    {(!activeRecord || activeRecord.lignes.length === 0) ? (
                      <tr>
                        <td colSpan={daysCount + 8} className="py-12 text-center text-slate-400">
                          Aucun infirmier enregistré dans la catégorie {getCategoryLabel(activeCategory)}.
                        </td>
                      </tr>
                    ) : (
                      activeRecord.lignes.map((ligne, rIdx) => {
                        return (
                          <tr key={ligne.nurseId} className="hover:bg-slate-50/70 transition-colors">
                            
                            {/* Nurse Name & Identity sticky cell */}
                            <td className="sticky left-0 z-10 bg-white hover:bg-slate-50 px-3 py-2 border-r border-slate-200 font-medium text-slate-900 whitespace-nowrap">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-semibold text-slate-900 text-xs">
                                    {rIdx + 1}. {ligne.nom.toUpperCase()} {ligne.prenom}
                                  </div>
                                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                    <span className="font-mono text-teal-700 font-semibold">{ligne.specialite}</span>
                                    <span>·</span>
                                    <span>Né(e) {ligne.dateNaissance}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* PPR */}
                            <td className="px-2 py-2 text-center font-mono text-[10px] text-slate-600 border-r border-slate-200">
                              {ligne.ppr}
                            </td>

                            {/* Fonction */}
                            <td className="px-2 py-2 text-center text-[10px] text-slate-700 border-r border-slate-200 truncate max-w-[100px]" title={ligne.fonction}>
                              {ligne.fonction}
                            </td>

                            {/* Days Cells */}
                            {Array.from({ length: daysCount }, (_, i) => i + 1).map(day => {
                              const cur = ligne.assignments[day];
                              const shift = cur?.shift || '';
                              const isLocked = cur?.isLocked;
                              const isWeekend = cur?.isWeekend;

                              let bgClass = 'bg-white hover:bg-slate-100 text-slate-400';
                              let borderClass = 'border-slate-200';

                              if (shift === 'GJ') {
                                bgClass = 'bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold';
                                borderClass = 'border-amber-300';
                              } else if (shift === 'GN') {
                                bgClass = 'bg-indigo-100 hover:bg-indigo-200 text-indigo-950 font-bold';
                                borderClass = 'border-indigo-300';
                              } else if (shift === 'R') {
                                bgClass = 'bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-bold';
                                borderClass = 'border-emerald-300';
                              } else if (shift === 'HN') {
                                bgClass = 'bg-sky-100 hover:bg-sky-200 text-sky-950 font-bold';
                                borderClass = 'border-sky-300';
                              } else if (shift === 'CA') {
                                bgClass = 'bg-rose-100 hover:bg-rose-200 text-rose-950 font-bold';
                                borderClass = 'border-rose-300';
                              } else if (isWeekend) {
                                bgClass = 'bg-slate-50 hover:bg-slate-100 text-slate-300';
                              }

                              return (
                                <td
                                  key={day}
                                  onClick={() => handleCellClick(ligne.nurseId, day)}
                                  title={`Jour ${day} : ${shift ? SHIFT_DEFINITIONS[shift]?.label : 'Non affecté'}${isLocked ? ` (Verrouillé préalable ${cur?.lockReason})` : ''} - Cliquez pour basculer`}
                                  className={`px-1 py-1.5 text-center font-mono text-[11px] cursor-pointer select-none transition-colors border-r ${borderClass} ${bgClass}`}
                                >
                                  {shift || '-'}
                                </td>
                              );
                            })}

                            {/* Totals */}
                            <td className="px-2 py-2 text-center font-mono font-bold text-amber-950 bg-amber-50/70 border-r border-slate-200">
                              {ligne.totalGJ}
                            </td>
                            <td className="px-2 py-2 text-center font-mono font-bold text-indigo-950 bg-indigo-50/70 border-r border-slate-200">
                              {ligne.totalGN}
                            </td>
                            <td className="px-2 py-2 text-center font-mono font-bold text-emerald-950 bg-emerald-50/70 border-r border-slate-200">
                              {ligne.totalR}
                            </td>
                            <td className="px-2 py-2 text-center font-mono font-bold text-sky-950 bg-sky-50/70 border-r border-slate-200">
                              {ligne.totalHN}
                            </td>
                            <td className="px-2 py-2 text-center font-mono font-bold text-rose-950 bg-rose-50/70 border-r border-slate-200">
                              {ligne.totalCA}
                            </td>
                            <td className="px-2 py-2 text-center font-mono font-bold text-teal-900 bg-teal-50/70">
                              {ligne.totalHeuresGarde}h
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                  {/* Daily Coverage Summary Footer */}
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-300 text-slate-900 font-semibold">
                      <td className="sticky left-0 z-20 bg-slate-100 px-3 py-2 font-bold text-left border-r border-slate-200">
                        Total Gardes de Jour (GJ)
                      </td>
                      <td className="border-r border-slate-200" colSpan={2}></td>
                      {dailyCoverage.map(c => (
                        <td 
                          key={c.day} 
                          className={`px-1 py-1 text-center font-mono font-bold border-r border-slate-200 ${
                            c.countGJ === 0 ? 'bg-rose-100 text-rose-900' : 'text-amber-900'
                          }`}
                          title={`Jour ${c.day} : ${c.countGJ} garde(s) de jour`}
                        >
                          {c.countGJ}
                        </td>
                      ))}
                      <td colSpan={6} className="bg-slate-100"></td>
                    </tr>

                    <tr className="bg-slate-100 border-t border-slate-200 text-slate-900 font-semibold">
                      <td className="sticky left-0 z-20 bg-slate-100 px-3 py-2 font-bold text-left border-r border-slate-200">
                        Total Gardes de Nuit (GN)
                      </td>
                      <td className="border-r border-slate-200" colSpan={2}></td>
                      {dailyCoverage.map(c => (
                        <td 
                          key={c.day} 
                          className={`px-1 py-1 text-center font-mono font-bold border-r border-slate-200 ${
                            c.countGN === 0 ? 'bg-rose-100 text-rose-900' : 'text-indigo-900'
                          }`}
                          title={`Jour ${c.day} : ${c.countGN} garde(s) de nuit`}
                        >
                          {c.countGN}
                        </td>
                      ))}
                      <td colSpan={6} className="bg-slate-100"></td>
                    </tr>
                  </tfoot>

                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: PRÉ-VERROUILLAGE CA & HN (N'IMPROVISE PAS) */}
      {/* ========================================================================= */}
      {subView === 'pre_verrouillage' && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-6">
          
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
              <Lock className="w-3.5 h-3.5" />
              Règle impérative : Aucune improvisation
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Définition & Verrouillage préalable des Périodes de Congé (CA) et d'Horaire Normal (HN)
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
              Avant de remplir la grille de garde ou de pousser le modèle vers WPS Office, chaque infirmier(ère) doit avoir ses périodes d'indisponibilité (CA) et de roulement en horaire normal (HN) clairement arrêtées. Ces périodes sont automatiquement reportées et verrouillées dans le tableau de garde.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryNurses.map((nurse, idx) => {
              // Find nurse row assignments to show locked days summary
              const row = activeRecord?.lignes.find(l => l.nurseId === nurse.id);
              const caDays = row ? Object.values(row.assignments).filter(a => a.shift === 'CA').map(a => a.day) : [];
              const hnDays = row ? Object.values(row.assignments).filter(a => a.shift === 'HN').map(a => a.day) : [];

              return (
                <div key={nurse.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
                  
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {idx + 1}. {nurse.nom.toUpperCase()} {nurse.prenom}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        PPR: {nurse.ppr} · {nurse.specialite}
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Né(e) {nurse.dateNaissance}
                    </span>
                  </div>

                  {/* Congé Administratif (CA) status */}
                  <div className="bg-white rounded-md p-2.5 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1 text-rose-700">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        Congé Administratif (CA)
                      </span>
                      <span className="font-mono text-rose-900 font-bold">
                        {caDays.length} jour(s)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      {caDays.length > 0 ? (
                        <>Jours verrouillés : <span className="font-mono font-semibold text-rose-800">{caDays.join(', ')}</span></>
                      ) : (
                        <span className="text-slate-400 italic">Aucun congé administratif programmé ce mois.</span>
                      )}
                    </p>
                  </div>

                  {/* Horaire Normal (HN) status */}
                  <div className="bg-white rounded-md p-2.5 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1 text-sky-700">
                        <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                        Système / Horaire Normal (HN)
                      </span>
                      <span className="font-mono text-sky-900 font-bold">
                        {hnDays.length} jour(s)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      {hnDays.length > 0 ? (
                        <>Période : <span className="font-mono font-semibold text-sky-800">{hnDays.join(', ')}</span></>
                      ) : (
                        <span className="text-slate-400 italic">Affecté(e) au système de garde standard ce mois.</span>
                      )}
                    </p>

                    {/* Quick period assigner button */}
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        onClick={() => {
                          // Quick set whole month as HN
                          for (let d = 1; d <= daysCount; d++) {
                            const cur = row?.assignments[d];
                            if (cur && cur.shift !== 'CA') {
                              handleSetCellShift(nurse.id, d, 'HN');
                            }
                          }
                          showFeedback(`Horaire normal (HN) appliqué pour le mois complet à ${nurse.nom.toUpperCase()} ${nurse.prenom}.`);
                        }}
                        className="text-[10px] px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded font-medium border border-sky-200 transition-colors"
                      >
                        Tout le mois en HN
                      </button>

                      <button
                        onClick={() => {
                          // Remove HN
                          for (let d = 1; d <= daysCount; d++) {
                            const cur = row?.assignments[d];
                            if (cur && cur.shift === 'HN') {
                              handleSetCellShift(nurse.id, d, '');
                            }
                          }
                          showFeedback(`Période HN retirée pour ${nurse.nom.toUpperCase()} ${nurse.prenom}.`);
                        }}
                        className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-medium transition-colors"
                      >
                        Retirer HN
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              onClick={() => setSubView('grille')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
            >
              <span>Continuer vers la Grille de Garde</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: ARCHIVES DES LISTES DE GARDE & RECTIFICATIONS */}
      {/* ========================================================================= */}
      {subView === 'archives' && (
        <div className="space-y-4">
          
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-teal-700" />
                Archive Officielle des Listes de Garde
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Historique des plannings validés et conservés au niveau de l'application, avec traçabilité intégrale des rectifications survenues au cours du mois.
              </p>
            </div>

            <div className="text-xs text-slate-600 font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              Catégorie active : <span className="font-bold text-teal-800">{getCategoryLabel(activeCategory)}</span>
            </div>
          </div>

          {archives.filter(a => a.categorie === activeCategory).length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-3">
              <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="font-bold text-slate-800">Aucune liste archivée pour cette catégorie</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Les tableaux de garde validés ou enregistrés s'archiveront automatiquement ici. Vous pourrez les ré-exporter vers WPS Office, les imprimer ou les rectifier en cours de mois.
              </p>
              <button
                onClick={() => handleSaveToArchive('Validé')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm transition-all"
              >
                <Save className="w-4 h-4" />
                Archiver le tableau actuel ({activeRecord?.moisLibelle})
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archives
                .filter(a => a.categorie === activeCategory)
                .map((arc) => {
                  const totalNursesInArc = arc.lignes.length;
                  const totalGardeHours = arc.lignes.reduce((sum, l) => sum + (l.totalHeuresGarde || 0), 0);

                  return (
                    <div 
                      key={arc.id} 
                      className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                              arc.statut === 'Validé' 
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' 
                                : arc.statut === 'Rectifié en cours de mois'
                                  ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                  : 'bg-amber-100 text-amber-900 border border-amber-200'
                            }`}>
                              Version {arc.version} · {arc.statut}
                            </span>
                            <h3 className="text-base font-bold text-slate-900 mt-1">
                              {arc.moisLibelle}
                            </h3>
                          </div>

                          <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
                            <FileCheck2 className="w-5 h-5" />
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 rounded-lg p-3">
                          <div className="flex justify-between">
                            <span>Effectif concerné :</span>
                            <span className="font-semibold text-slate-900">{totalNursesInArc} infirmiers</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Volume total gardes :</span>
                            <span className="font-semibold font-mono text-teal-800">{totalGardeHours} heures</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Dernière modification :</span>
                            <span className="text-slate-500 font-mono text-[11px]">
                              {new Date(arc.dateDerniereModification).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          {arc.rectificationNotes && (
                            <div className="pt-1.5 border-t border-slate-200 text-[11px] text-purple-900 font-medium">
                              📝 {arc.rectificationNotes}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => exportGuardScheduleToWPS(arc)}
                            className="p-2 text-slate-600 hover:text-teal-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Télécharger à nouveau pour WPS Office"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setPrintRecord(arc)}
                            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Visualiser / Imprimer la liste officielle"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleStartRectification(arc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-sm"
                          title="Modifier ou rectifier le tableau en cours de mois suite à un imprévu ou échange de garde"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Rectifier en cours de mois</span>
                        </button>
                      </div>

                    </div>
                  );
                })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* RECTIFICATION MODAL */}
      {/* ========================================================================= */}
      {rectificationModalOpen && targetArchiveToRectify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                  Rectification en cours de mois
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Rectifier la liste de {targetArchiveToRectify.moisLibelle}
                </h3>
                <p className="text-xs text-slate-500">
                  Catégorie : {targetArchiveToRectify.categorieLibelle} · Version actuelle : V{targetArchiveToRectify.version}
                </p>
              </div>
              <button 
                onClick={() => setRectificationModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Cette opération crée une nouvelle version incrémentée (Version {targetArchiveToRectify.version + 1}) avec la mention « Rectifié en cours de mois ». Vous pourrez modifier des cellules, faire des échanges de garde, ou ré-importer depuis WPS Office.
              </p>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Motif de la rectification (ex: Congé maladie imprévu, Remplacement, Ajustement opératoire) :
                </label>
                <textarea
                  value={rectificationNotes}
                  onChange={(e) => setRectificationNotes(e.target.value)}
                  rows={3}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Indiquez la raison de la modification..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setRectificationModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmRectification}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Ouvrir en Édition & Incrémenter Version</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINT / OFFICIAL DOCUMENT MODAL */}
      {/* ========================================================================= */}
      {printRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-5xl w-full p-8 space-y-6 my-8">
            
            <div className="flex items-center justify-between no-print border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-teal-700" />
                <span className="font-bold text-slate-900 text-sm">
                  Aperçu Document Officiel d'Affectation des Gardes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer</span>
                </button>
                <button
                  onClick={() => setPrintRecord(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>

            {/* Document Printable Header */}
            <div className="space-y-6 print:p-0">
              
              {/* Official Template Printable Header (Bilingual with Moroccan Royal Coat of Arms) */}
              <div className="flex items-center justify-between text-xs border-b border-slate-900 pb-3">
                <div className="text-left font-serif space-y-0.5">
                  <div className="font-bold text-slate-900 text-[13px]">Royaume du Maroc</div>
                  <div className="text-slate-800 text-[11px]">Ministère de la santé et de la protection sociale</div>
                  <div className="text-slate-800 text-[11px]">Délégation provinciale de Sidi Ifni</div>
                  <div className="text-slate-800 text-[11px]">Centre hospitalier provincial Sidi Ifni</div>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <MoroccanCoatOfArms className="w-16 h-16" />
                </div>

                <div className="text-right font-serif space-y-0.5" dir="rtl">
                  <div className="font-bold text-slate-900 text-[13px]">المملكة المغربية</div>
                  <div className="text-slate-800 text-[11px]">وزارة الصحة والحماية الاجتماعية</div>
                  <div className="text-slate-800 text-[11px]">المندوبية الإقليمية لسيدي إفني</div>
                  <div className="text-slate-800 text-[11px]">المركز الاستشفائي الإقليمي سيدي إفني</div>
                </div>
              </div>

              {/* Title exactly as in template */}
              <div className="text-center pt-2 pb-1">
                <h2 className="text-2xl font-normal text-slate-900 tracking-tight font-serif">
                  Liste de garde/horaire normal
                </h2>
              </div>

              {/* Meta single line: Service, Mois, Année, Cadre */}
              <div className="grid grid-cols-4 gap-4 text-xs font-serif text-slate-900 border-b border-slate-200 pb-2">
                <div>
                  <span className="font-bold">Service : </span>
                  <span>Bloc opératoire</span>
                </div>
                <div>
                  <span className="font-bold">Mois : </span>
                  <span className="capitalize">{printRecord.moisNom || printRecord.moisLibelle.split(' ')[0]}</span>
                </div>
                <div>
                  <span className="font-bold">Année : </span>
                  <span>{printRecord.annee}</span>
                </div>
                <div>
                  <span className="font-bold">Cadre : </span>
                  <span>
                    {printRecord.cadreLibelle || (
                      printRecord.categorie === 'anesth' 
                        ? 'Infirmiers en anesthésie-réanimation' 
                        : printRecord.categorie === 'aide_op_panseur' 
                          ? 'Infirmiers panseurs/aide-opératoire' 
                          : 'Infirmiers en stérilisation'
                    )}
                  </span>
                </div>
              </div>

              {/* Exact Table Grid with diagonal header cell */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-900 text-[10px]">
                  <thead>
                    <tr className="border-b border-slate-900 text-slate-900 h-10">
                      
                      {/* Diagonal split header cell: JOURS top-right / NOM COMPLET bottom-left */}
                      <th className="border border-slate-900 p-0 w-44 min-w-[170px] relative font-serif">
                        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                          <line x1="0" y1="0" x2="100%" y2="100%" stroke="#0f172a" strokeWidth="1" />
                        </svg>
                        <div className="absolute top-1 right-2 text-[9px] font-bold tracking-wider text-slate-800">
                          JOURS
                        </div>
                        <div className="absolute bottom-1 left-2 text-[9px] font-bold tracking-wider text-slate-800 text-left leading-tight">
                          NOM<br/>COMPLET
                        </div>
                      </th>

                      {/* 1 to 31 columns */}
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <th 
                          key={day} 
                          className="border border-slate-900 px-0.5 py-1 text-center font-mono font-bold text-slate-900 min-w-[22px]"
                        >
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {printRecord.lignes.map((l) => (
                      <tr key={l.nurseId} className="border-b border-slate-900 h-7 text-slate-900">
                        <td className="border border-slate-900 px-2 py-1 font-serif text-[10px] font-semibold uppercase whitespace-nowrap">
                          {l.nom} {l.prenom}
                        </td>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                          const isPastMonth = day > getDaysInMonth(printRecord.annee, printRecord.mois);
                          const s = isPastMonth ? '/' : (l.assignments[day]?.shift || '');
                          return (
                            <td 
                              key={day} 
                              className={`border border-slate-900 px-0.5 py-0.5 text-center font-mono text-[10px] font-bold ${
                                isPastMonth ? 'text-slate-300 bg-slate-50' : 'text-slate-900'
                              }`}
                            >
                              {s}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Fill remaining empty rows to maintain authentic Moroccan official paper grid look */}
                    {Array.from({ length: Math.max(0, 10 - printRecord.lignes.length) }).map((_, idx) => (
                      <tr key={`empty-${idx}`} className="border-b border-slate-900 h-7 text-slate-900">
                        <td className="border border-slate-900 px-2 py-1">&nbsp;</td>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <td key={day} className="border border-slate-900 px-0.5 py-0.5 text-center">&nbsp;</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Exact Legend matching template: NB : GJ : garde de jour ... */}
              <div className="flex flex-wrap items-center justify-between text-[11px] font-serif text-slate-900 pt-3 px-2">
                <span className="font-bold">NB :</span>
                <span><span className="font-bold">GJ :</span> garde de jour</span>
                <span><span className="font-bold">GN :</span> garde de nuit</span>
                <span><span className="font-bold">R :</span> récupération</span>
                <span><span className="font-bold">HN :</span> horaire normal</span>
                <span><span className="font-bold">CA :</span> congé administratif</span>
              </div>

              {/* Exact Signatures line matching template: Infirmier Chef : | Chef du PSI : | Le directeur : */}
              <div className="pt-10 grid grid-cols-3 gap-6 text-xs font-serif text-slate-900">
                <div className="space-y-14">
                  <div className="font-bold">Infirmier Chef :</div>
                  <div className="border-b border-dotted border-slate-400 w-3/4"></div>
                </div>

                <div className="space-y-14 text-center">
                  <div className="font-bold">Chef du PSI :</div>
                  <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto"></div>
                </div>

                <div className="space-y-14 text-right">
                  <div className="font-bold">Le directeur :</div>
                  <div className="border-b border-dotted border-slate-400 w-3/4 ml-auto"></div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
