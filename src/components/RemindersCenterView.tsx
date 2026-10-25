import React, { useState } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  UserCheck, 
  FileText, 
  Eye, 
  AlertCircle,
  HelpCircle,
  Check
} from 'lucide-react';
import { ReminderItem, NurseStaff, DemandeConge } from '../types/nurse';
import { formatDateFr } from '../utils/calculations';

interface RemindersCenterViewProps {
  reminders: ReminderItem[];
  nurses: NurseStaff[];
  demandes: DemandeConge[];
  onValidateReprise: (demandeId: string, nurseId: string) => void;
  onSelectNurse: (nurse: NurseStaff) => void;
  onPrintDoc: (demande: DemandeConge, nurse: NurseStaff, typeDoc: 'cessation' | 'reprise') => void;
}

export const RemindersCenterView: React.FC<RemindersCenterViewProps> = ({
  reminders,
  nurses,
  demandes,
  onValidateReprise,
  onSelectNurse,
  onPrintDoc,
}) => {
  const [filterLevel, setFilterLevel] = useState<'all' | 'urgent' | 'attention' | 'info'>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredReminders = reminders.filter(r => {
    const matchLevel = filterLevel === 'all' || r.niveau === filterLevel;
    const matchType = filterType === 'all' || r.type === filterType;
    return matchLevel && matchType;
  });

  const urgentCount = reminders.filter(r => r.niveau === 'urgent').length;
  const attentionCount = reminders.filter(r => r.niveau === 'attention').length;
  const infoCount = reminders.filter(r => r.niveau === 'info').length;

  return (
    <div className="space-y-4">
      
      {/* Header and Quick Stats */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                Centre de Suivi des Dates & Rappels Opérationnels
              </h1>
              <p className="text-xs text-slate-500">
                Détection automatique des reprises de service, départs imminents, retards et alertes statutaires
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Date de calcul : <strong className="text-slate-900 font-mono">24/10/2026</strong></span>
            </div>
          </div>
        </div>

        {/* Level filter tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <button
            onClick={() => setFilterLevel('all')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              filterLevel === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Tous les rappels ({reminders.length})
          </button>

          <button
            onClick={() => setFilterLevel('urgent')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              filterLevel === 'urgent'
                ? 'bg-rose-700 text-white'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-600"></span>
            Urgents / Aujourd'hui ({urgentCount})
          </button>

          <button
            onClick={() => setFilterLevel('attention')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              filterLevel === 'attention'
                ? 'bg-amber-700 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            À surveiller (48h / 72h) ({attentionCount})
          </button>

          <button
            onClick={() => setFilterLevel('info')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              filterLevel === 'info'
                ? 'bg-teal-700 text-white'
                : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
            Soldes & Droits ({infoCount})
          </button>
        </div>
      </div>

      {/* Reminders List */}
      <div className="space-y-3">
        {filteredReminders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-900">
              Aucun rappel actif pour ce filtre
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Toutes les échéances et reprises du bloc opératoire sont à jour.
            </p>
          </div>
        ) : (
          filteredReminders.map(reminder => {
            const nurse = nurses.find(n => n.id === reminder.nurseId);
            const demande = reminder.demandeId ? demandes.find(d => d.id === reminder.demandeId) : undefined;

            const isUrgent = reminder.niveau === 'urgent';
            const isAttention = reminder.niveau === 'attention';

            return (
              <div
                key={reminder.id}
                className={`p-4 rounded-lg border transition-all ${
                  isUrgent 
                    ? 'bg-rose-50/60 border-rose-200 hover:border-rose-300' 
                    : isAttention 
                      ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* Left: Indicator & Content */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        isUrgent
                          ? 'bg-rose-600 text-white'
                          : isAttention
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-200 text-slate-800'
                      }`}>
                        {reminder.type === 'reprise_imminente' && 'Reprise de Service'}
                        {reminder.type === 'reprise_retard' && 'Retard Reprise'}
                        {reminder.type === 'cessation_imminente' && 'Cessation / Départ'}
                        {reminder.type === 'decision_manquante' && 'Décision Administrative'}
                        {reminder.type === 'reliquat_eleve' && 'Reliquat Important'}
                        {reminder.type === 'maladie_limite' && 'Alerte Maladie'}
                      </span>

                      <span className="text-xs font-bold text-slate-900">
                        {reminder.titre}
                      </span>

                      <span className="text-xs font-mono tabular-nums text-slate-500">
                        · Échéance : {formatDateFr(reminder.dateCible)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">
                      {reminder.message}
                    </p>

                    {nurse && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-1">
                        <span>Agent : <strong className="text-slate-800">{nurse.nom} {nurse.prenom}</strong></span>
                        <span>·</span>
                        <span>PPR : <strong className="font-mono">{nurse.ppr}</strong></span>
                        <span>·</span>
                        <span>Spécialité : {nurse.specialite}</span>
                        <span>·</span>
                        <span>Position : {nurse.situationActuelle}</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Functional Action buttons */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                    
                    {/* Primary Action: Confirm Reprise */}
                    {reminder.actionPossible === 'confirmer_reprise' && reminder.demandeId && (
                      <button
                        onClick={() => onValidateReprise(reminder.demandeId!, reminder.nurseId)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors shadow-xs flex items-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Confirmer Reprise
                      </button>
                    )}

                    {/* Print PV Reprise or Cessation if demande available */}
                    {demande && nurse && (
                      <button
                        onClick={() => onPrintDoc(demande, nurse, reminder.type === 'cessation_imminente' ? 'cessation' : 'reprise')}
                        title="Imprimer document officiel"
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        Doc Officiel
                      </button>
                    )}

                    {/* Consult agent dossier */}
                    {nurse && (
                      <button
                        onClick={() => onSelectNurse(nurse)}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        Dossier
                      </button>
                    )}

                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
