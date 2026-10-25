import React from 'react';
import { 
  Users, 
  Activity, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  MapPin, 
  Calendar, 
  ArrowRight, 
  HeartPulse, 
  Syringe, 
  FileBadge, 
  Plus, 
  UserPlus,
  RotateCcw,
  FileSpreadsheet,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';
import { NurseStaff, DemandeConge, ReminderItem } from '../types/nurse';
import { formatDateFr } from '../utils/calculations';

interface DashboardViewProps {
  nurses: NurseStaff[];
  demandes: DemandeConge[];
  reminders: ReminderItem[];
  onNavigateTab: (tab: 'personnel' | 'conges' | 'reminders' | 'calendrier' | 'gardes') => void;
  onSelectNurse: (nurse: NurseStaff) => void;
  onValidateReprise: (demandeId: string, nurseId: string) => void;
  onFilterSituation: (situation: string) => void;
  onNewNurse?: () => void;
  onOpenRotationModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  nurses,
  demandes,
  reminders,
  onNavigateTab,
  onSelectNurse,
  onValidateReprise,
  onFilterSituation,
  onNewNurse,
  onOpenRotationModal,
}) => {
  // Calculs statistiques
  const totalNurses = nurses.length;
  const systemeNormal = nurses.filter(n => n.situationActuelle === 'Système normal').length;
  const systemeGarde = nurses.filter(n => n.situationActuelle === 'Système de garde').length;
  const presentsBloc = systemeNormal + systemeGarde;
  const congeAdmin = nurses.filter(n => n.situationActuelle === 'Congé administratif').length;
  const congeMaladie = nurses.filter(n => n.situationActuelle === 'Congé de maladie').length;
  const congeExceptionnel = nurses.filter(n => n.situationActuelle === 'Congé exceptionnel').length;
  const totalConges = congeAdmin + congeMaladie + congeExceptionnel;
  const horsService = nurses.filter(n => n.situationActuelle === 'Mis en disponibilité' || n.situationActuelle === 'Sous drapeau').length;
  
  const tauxPresence = totalNurses > 0 ? Math.round((presentsBloc / totalNurses) * 100) : 0;
  const navettistes = nurses.filter(n => n.navette).length;

  // Spécialités breakdown (IAR, IP, ISM, IBO)
  const iar = nurses.filter(n => n.specialite === 'IAR').length;
  const ip = nurses.filter(n => n.specialite === 'IP').length;
  const ism = nurses.filter(n => n.specialite === 'ISM').length;
  const ibo = nurses.filter(n => n.specialite === 'IBO').length;

  // Fonctions au bloc (Infirmier chef, Anesthésiste, Aide-opératoire / Panseur combinés, Stérilisation)
  const fnChef = nurses.filter(n => n.fonction === 'Infirmier chef').length;
  const fnAnesthesiste = nurses.filter(n => n.fonction === 'Anesthésiste').length;
  const fnAideOpPanseur = nurses.filter(n => 
    n.fonction === 'Aide-opératoire / Panseur' || 
    n.fonction === 'Aide-opératoire' || 
    n.fonction === 'Panseur'
  ).length;
  const fnSterilisation = nurses.filter(n => n.fonction === 'Stérilisation').length;

  // Active rotation period for Système normal
  const activePeriodeNormal = nurses.find(n => n.situationActuelle === 'Système normal' && n.periodeSystemeNormal?.dateDebut)?.periodeSystemeNormal;

  const urgentReminders = reminders.filter(r => r.niveau === 'urgent');
  const otherReminders = reminders.filter(r => r.niveau !== 'urgent').slice(0, 3);

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Service context & date */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 tracking-wider uppercase mb-1">
            <span>Royaume du Maroc</span>
            <span>·</span>
            <span>Ministère de la Santé & de la Protection Sociale</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Service du Bloc Opératoire Central
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tableau de bord de gestion des ressources humaines, effectifs du staff infirmier et suivi des congés
          </p>
        </div>
        
        <div className="flex items-center gap-3 self-start md:self-auto bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs">
          <Calendar className="w-4 h-4 text-slate-600" />
          <div>
            <div className="text-slate-500">Date de référence</div>
            <div className="font-semibold text-slate-900 tabular-nums">24 Octobre 2026</div>
          </div>
        </div>
      </div>

      {/* When 0 nurses: Clean Slate Banner */}
      {totalNurses === 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-teal-900 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-teal-700" />
              Base de données prête à être alimentée
            </h3>
            <p className="text-xs text-teal-800 leading-relaxed max-w-2xl">
              Tous les chiffres et listes sont initialisés à zéro. Vous pouvez maintenant saisir les informations de votre personnel infirmier (PPR, CNI, spécialité, grade, congés, situation). Toutes les données sont modifiables à tout moment.
            </p>
          </div>
          {onNewNurse && (
            <button
              onClick={onNewNurse}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Ajouter le 1er Infirmier
            </button>
          )}
        </div>
      )}

      {/* Tour de Rôle Mensuel Widget */}
      {totalNurses > 0 && onOpenRotationModal && (
        <div className="bg-emerald-50/90 border border-emerald-200 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-md">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-950 flex flex-wrap items-center gap-2">
                <span>Tour de Rôle Mensuel (Système Normal ⮂ Système de Garde)</span>
                {activePeriodeNormal && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white border border-emerald-300 text-emerald-800">
                    Période active : Du {formatDateFr(activePeriodeNormal.dateDebut)} au {formatDateFr(activePeriodeNormal.dateFin)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Définissez les dates de début et de fin au début de chaque mois pour le staff en système normal et organisez l'alternance.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenRotationModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md shadow-2xs transition-colors shrink-0"
          >
            <Clock className="w-3.5 h-3.5" />
            Définir les Périodes du Tour de Rôle
          </button>
        </div>
      )}

      {/* Tableaux de Garde (3 Catégories Séparées) & WPS Office Preparation Widget */}
      {totalNurses > 0 && (
        <div className="bg-white border-2 border-teal-600/30 rounded-lg p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-teal-700 text-white rounded-lg shadow-sm">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                    Tableaux de Garde & Système Normal
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Période 25 au 30/31 active
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  Préparation du Roster de Novembre 2026 (Compatible WPS Office)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Listes distinctes par catégorie · Cycle standard (GJ 12h → GN 12h → R 48h) · Périodes CA et HN verrouillées au préalable
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('gardes')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-lg shadow-sm transition-all shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-200" />
              <span>Ouvrir Tableaux de Garde (WPS)</span>
            </button>
          </div>

          {/* Quick links to the 3 separated categories */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 text-xs">
            
            <div 
              onClick={() => onNavigateTab('gardes')}
              className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-200 transition-colors cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-700" />
                <div>
                  <div className="font-bold text-slate-800">1. Anesthésistes (IAR)</div>
                  <div className="text-[10px] text-slate-500">Liste distincte de garde 12h</div>
                </div>
              </div>
              <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                {iar + (fnAnesthesiste > iar ? fnAnesthesiste - iar : 0)}
              </span>
            </div>

            <div 
              onClick={() => onNavigateTab('gardes')}
              className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-200 transition-colors cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-700" />
                <div>
                  <div className="font-bold text-slate-800">2. Aide-Opératoire / Panseur</div>
                  <div className="text-[10px] text-slate-500">IBO & IP · Roster chirurgical</div>
                </div>
              </div>
              <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                {fnAideOpPanseur}
              </span>
            </div>

            <div 
              onClick={() => onNavigateTab('gardes')}
              className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-200 transition-colors cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-700" />
                <div>
                  <div className="font-bold text-slate-800">3. Stérilisation</div>
                  <div className="text-[10px] text-slate-500">Stérilisation Centrale</div>
                </div>
              </div>
              <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                {fnSterilisation}
              </span>
            </div>

          </div>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        
        {/* Total Staff */}
        <div 
          onClick={() => onNavigateTab('personnel')} 
          className="bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Staff Total</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">{totalNurses}</div>
          <div className="text-xs text-slate-500 mt-1">Infirmiers inscrits</div>
        </div>

        {/* Présents Opérationnels */}
        <div 
          onClick={() => onFilterSituation('Système normal')}
          className="bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-teal-300 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Présents au Bloc</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 tabular-nums">{presentsBloc}</div>
          <div className="text-xs text-emerald-600 mt-1 tabular-nums font-medium">{tauxPresence}% de disponibilité</div>
        </div>

        {/* Système de Garde */}
        <div 
          onClick={() => onFilterSituation('Système de garde')}
          className="bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Garde & Astreinte</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 tabular-nums">{systemeGarde}</div>
          <div className="text-xs text-slate-500 mt-1">Urgences 24h</div>
        </div>

        {/* Congés Administratifs */}
        <div 
          onClick={() => onFilterSituation('Congé administratif')}
          className="bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Congé Admin</span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-700 tabular-nums">{congeAdmin}</div>
          <div className="text-xs text-slate-500 mt-1">Droit 22j + reliquat</div>
        </div>

        {/* Congés Maladie */}
        <div 
          onClick={() => onFilterSituation('Congé de maladie')}
          className="bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Congé Maladie</span>
            <HeartPulse className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700 tabular-nums">{congeMaladie}</div>
          <div className="text-xs text-slate-500 mt-1">Limite 3 mois / an</div>
        </div>

        {/* Navettistes */}
        <div 
          onClick={() => onNavigateTab('personnel')}
          className="bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Navettistes</span>
            <MapPin className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{navettistes}</div>
          <div className="text-xs text-slate-500 mt-1">Trajet interurbain</div>
        </div>

      </div>

      {/* Grid: Alertes Imminentes & Répartition */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Alertes & Échéances Immédiates (2 Columns on large screen) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-700" />
              <h2 className="text-base font-bold text-slate-900">
                Suivi des Échéances & Reminders
              </h2>
            </div>
            <button 
              onClick={() => onNavigateTab('reminders')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 transition-colors"
            >
              Voir tous les rappels ({reminders.length})
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {urgentReminders.length === 0 && otherReminders.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              {totalNurses === 0 
                ? 'Aucune alerte pour l\'instant. Les rappels de reprises et cessations s\'afficheront dès l\'enregistrement de vos congés.' 
                : 'Aucune alerte urgente ni échéance critique en attente.'}
            </div>
          ) : (
            <div className="space-y-3">
              {urgentReminders.map(rem => {
                const nurse = nurses.find(n => n.id === rem.nurseId);
                return (
                  <div 
                    key={rem.id}
                    className="p-3.5 rounded-lg border border-rose-200 bg-rose-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                        <span className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                          {rem.titre}
                        </span>
                        <span className="text-xs text-rose-700 tabular-nums">
                          · {formatDateFr(rem.dateCible)}
                        </span>
                      </div>
                      <p className="text-xs text-rose-800 leading-relaxed">
                        {rem.message}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {rem.actionPossible === 'confirmer_reprise' && rem.demandeId && (
                        <button
                          onClick={() => onValidateReprise(rem.demandeId!, rem.nurseId)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors shadow-xs flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirmer Reprise
                        </button>
                      )}
                      {nurse && (
                        <button
                          onClick={() => onSelectNurse(nurse)}
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors"
                        >
                          Dossier
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {otherReminders.map(rem => {
                const nurse = nurses.find(n => n.id === rem.nurseId);
                return (
                  <div 
                    key={rem.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">
                        {rem.titre}
                      </div>
                      <div className="text-slate-600 mt-0.5">
                        {rem.message}
                      </div>
                    </div>
                    {nurse && (
                      <button
                        onClick={() => onSelectNurse(nurse)}
                        className="self-start sm:self-auto px-2 py-1 text-xs text-slate-700 hover:text-slate-900 border border-slate-200 bg-white rounded hover:bg-slate-50 transition-colors"
                      >
                        Consulter
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Répartition Spécialités & Fonctions au Bloc (1 Column) */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h2 className="text-base font-bold text-slate-900">
              Spécialités au Bloc
            </h2>
            <Syringe className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3 text-xs">
            
            <div>
              <div className="flex justify-between font-medium text-slate-700 mb-1">
                <span>IAR</span>
                <span className="tabular-nums font-semibold">{iar}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-teal-600 h-2 rounded-full" 
                  style={{ width: totalNurses > 0 ? `${(iar / totalNurses) * 100}%` : '0%' }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium text-slate-700 mb-1">
                <span>IP</span>
                <span className="tabular-nums font-semibold">{ip}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-2 rounded-full" 
                  style={{ width: totalNurses > 0 ? `${(ip / totalNurses) * 100}%` : '0%' }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium text-slate-700 mb-1">
                <span>ISM</span>
                <span className="tabular-nums font-semibold">{ism}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: totalNurses > 0 ? `${(ism / totalNurses) * 100}%` : '0%' }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium text-slate-700 mb-1">
                <span>IBO</span>
                <span className="tabular-nums font-semibold">{ibo}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-amber-600 h-2 rounded-full" 
                  style={{ width: totalNurses > 0 ? `${(ibo / totalNurses) * 100}%` : '0%' }}
                ></div>
              </div>
            </div>

          </div>

          {/* Fonctions au bloc */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-900 mb-2">
              Fonctions au Bloc
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div className="bg-teal-50/70 p-2 rounded border border-teal-200 flex items-center justify-between">
                <div className="text-teal-900 font-medium">Infirmier chef</div>
                <div className="font-semibold text-teal-950 tabular-nums font-mono">{fnChef}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-100 flex items-center justify-between">
                <div className="text-slate-600 font-medium">Anesthésiste</div>
                <div className="font-semibold text-slate-900 tabular-nums font-mono">{fnAnesthesiste}</div>
              </div>
              <div className="col-span-2 bg-indigo-50/60 p-2.5 rounded border border-indigo-200 flex items-center justify-between">
                <div>
                  <div className="text-indigo-950 font-semibold">Aide-opératoire / Panseur</div>
                  <div className="text-[10px] text-indigo-700">Catégorie unifiée des soins opératoires</div>
                </div>
                <div className="font-bold text-indigo-950 text-sm tabular-nums font-mono">{fnAideOpPanseur}</div>
              </div>
              <div className="col-span-2 bg-slate-50 p-2 rounded border border-slate-100 flex items-center justify-between">
                <div className="text-slate-600 font-medium">Stérilisation</div>
                <div className="font-semibold text-slate-900 tabular-nums font-mono">{fnSterilisation}</div>
              </div>
            </div>
          </div>

          {/* Quick Stats: Fonction publique */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-900 mb-2">
              Statut Fonction Publique
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <div className="text-slate-400">Titulaires</div>
                <div className="font-semibold text-slate-900 tabular-nums">
                  {nurses.filter(n => n.etatFonctionPublique === 'Fonctionnaire Titulaire').length}
                </div>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <div className="text-slate-400">Stagiaires</div>
                <div className="font-semibold text-slate-900 tabular-nums">
                  {nurses.filter(n => n.etatFonctionPublique === 'Stagiaire').length}
                </div>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <div className="text-slate-400">Disponibilité</div>
                <div className="font-semibold text-slate-900 tabular-nums">
                  {nurses.filter(n => n.etatFonctionPublique === 'Mis en Disponibilité').length}
                </div>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <div className="text-slate-400">Sous drapeau</div>
                <div className="font-semibold text-slate-900 tabular-nums">
                  {nurses.filter(n => n.etatFonctionPublique === 'Sous le Drapeau').length}
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Section Demandes Récentes & Mouvements en cours */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <FileBadge className="w-5 h-5 text-slate-700" />
            <h2 className="text-base font-bold text-slate-900">
              Derniers Mouvements & Demandes de Congé
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('conges')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 transition-colors"
          >
            Gérer les demandes ({demandes.length})
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {demandes.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            Aucune demande de congé enregistrée pour le moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 px-3">Agent</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Cessation</th>
                  <th className="py-2.5 px-3">Reprise Prévue</th>
                  <th className="py-2.5 px-3">Durée</th>
                  <th className="py-2.5 px-3">État Demande</th>
                  <th className="py-2.5 px-3">Décision Reçue</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {demandes.slice(0, 5).map(dem => {
                  const nurse = nurses.find(n => n.id === dem.nurseId);
                  if (!nurse) return null;

                  return (
                    <tr key={dem.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">
                          {nurse.nom} {nurse.prenom}
                        </div>
                        <div className="text-slate-500 text-xs">
                          PPR: <span className="font-mono tabular-nums">{nurse.ppr}</span> · {nurse.specialite}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">
                        {dem.typeConge}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-700">
                        {formatDateFr(dem.dateCessation)}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-700">
                        {formatDateFr(dem.dateReprisePrevue)}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-900 font-semibold">
                        {dem.nombreJours} jours
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center text-xs font-medium ${
                          dem.etatDemande === 'Confirmé' 
                            ? 'text-emerald-700 font-semibold' 
                            : dem.etatDemande === 'Refusé' 
                              ? 'text-rose-700 font-semibold' 
                              : 'text-amber-700 font-semibold'
                        }`}>
                          {dem.etatDemande}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-700">
                          {dem.decisionRecue}
                        </div>
                        {dem.numeroDecision && (
                          <div className="text-xs font-mono text-slate-400">
                            {dem.numeroDecision}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onSelectNurse(nurse)}
                          className="text-xs font-medium text-teal-700 hover:text-teal-900 underline"
                        >
                          Consulter
                        </button>
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
  );
};
