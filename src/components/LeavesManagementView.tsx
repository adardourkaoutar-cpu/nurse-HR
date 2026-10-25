import React, { useState } from 'react';
import { 
  FileText, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Printer, 
  Plus, 
  Search, 
  AlertTriangle,
  FileCheck,
  Building,
  UserCheck
} from 'lucide-react';
import { DemandeConge, NurseStaff, EtatDemande, StatutDecision } from '../types/nurse';
import { formatDateFr } from '../utils/calculations';

interface LeavesManagementViewProps {
  nurses: NurseStaff[];
  demandes: DemandeConge[];
  onNewLeave: () => void;
  onUpdateDemande: (demande: DemandeConge) => void;
  onValidateReprise: (demandeId: string, nurseId: string) => void;
  onPrintDoc: (demande: DemandeConge, nurse: NurseStaff, typeDoc: 'cessation' | 'reprise') => void;
}

export const LeavesManagementView: React.FC<LeavesManagementViewProps> = ({
  nurses,
  demandes,
  onNewLeave,
  onUpdateDemande,
  onValidateReprise,
  onPrintDoc,
}) => {
  const [activeFilter, setActiveFilter] = useState<'tous' | 'en_attente' | 'confirmes' | 'reprises_a_valider' | 'refuses'>('tous');
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for Decision Edit Modal
  const [editingDecisionDemande, setEditingDecisionDemande] = useState<DemandeConge | null>(null);
  const [inputNumDecision, setInputNumDecision] = useState('');
  const [inputStatutDecision, setInputStatutDecision] = useState<StatutDecision>('Reçue et visée');

  // Filtrage
  const filteredDemandes = demandes.filter(dem => {
    const nurse = nurses.find(n => n.id === dem.nurseId);
    if (!nurse) return false;

    // Search query
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q || (
      nurse.nom.toLowerCase().includes(q) ||
      nurse.prenom.toLowerCase().includes(q) ||
      nurse.ppr.toLowerCase().includes(q) ||
      dem.typeConge.toLowerCase().includes(q) ||
      (dem.numeroDecision && dem.numeroDecision.toLowerCase().includes(q))
    );

    // Filter status
    let matchFilter = true;
    if (activeFilter === 'en_attente') {
      matchFilter = dem.etatDemande === 'En attente';
    } else if (activeFilter === 'confirmes') {
      matchFilter = dem.etatDemande === 'Confirmé';
    } else if (activeFilter === 'reprises_a_valider') {
      matchFilter = dem.etatDemande === 'Confirmé' && !dem.dateRepriseEffective;
    } else if (activeFilter === 'refuses') {
      matchFilter = dem.etatDemande === 'Refusé';
    }

    return matchSearch && matchFilter;
  });

  const handleOpenDecisionModal = (dem: DemandeConge) => {
    setEditingDecisionDemande(dem);
    setInputNumDecision(dem.numeroDecision || '');
    setInputStatutDecision(dem.decisionRecue);
  };

  const handleSaveDecision = () => {
    if (!editingDecisionDemande) return;
    onUpdateDemande({
      ...editingDecisionDemande,
      decisionRecue: inputStatutDecision,
      numeroDecision: inputNumDecision.trim()
    });
    setEditingDecisionDemande(null);
  };

  const handleUpdateEtat = (dem: DemandeConge, newEtat: EtatDemande) => {
    onUpdateDemande({
      ...dem,
      etatDemande: newEtat
    });
  };

  return (
    <div className="space-y-4">
      
      {/* Top Banner and Actions */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-slate-900">
              Gestion des Congés, Cessations & Reprises de Service
            </h1>
            <p className="text-xs text-slate-500">
              Suivi administratif, validation des états de demandes, visas et procès-verbaux de reprise
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNewLeave}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouvelle Demande de Congé
            </button>
          </div>
        </div>

        {/* Search & Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par agent, PPR, n° décision..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setActiveFilter('tous')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeFilter === 'tous'
                  ? 'bg-slate-900 text-white font-medium'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Toutes ({demandes.length})
            </button>

            <button
              onClick={() => setActiveFilter('en_attente')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeFilter === 'en_attente'
                  ? 'bg-amber-700 text-white font-medium'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              En attente ({demandes.filter(d => d.etatDemande === 'En attente').length})
            </button>

            <button
              onClick={() => setActiveFilter('confirmes')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeFilter === 'confirmes'
                  ? 'bg-emerald-700 text-white font-medium'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Confirmés ({demandes.filter(d => d.etatDemande === 'Confirmé').length})
            </button>

            <button
              onClick={() => setActiveFilter('reprises_a_valider')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeFilter === 'reprises_a_valider'
                  ? 'bg-teal-700 text-white font-medium'
                  : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
              }`}
            >
              Reprises à valider ({demandes.filter(d => d.etatDemande === 'Confirmé' && !d.dateRepriseEffective).length})
            </button>

            <button
              onClick={() => setActiveFilter('refuses')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeFilter === 'refuses'
                  ? 'bg-rose-700 text-white font-medium'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              Refusés ({demandes.filter(d => d.etatDemande === 'Refusé').length})
            </button>
          </div>

        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        {filteredDemandes.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Aucun mouvement ou demande de congé ne correspond aux filtres sélectionnés.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Infirmier(e)</th>
                  <th className="py-3 px-3">Type de Congé</th>
                  <th className="py-3 px-3">Date Cessation</th>
                  <th className="py-3 px-3">Reprise Prévue</th>
                  <th className="py-3 px-3">Reprise Réelle</th>
                  <th className="py-3 px-3">Durée</th>
                  <th className="py-3 px-3">État Demande</th>
                  <th className="py-3 px-3">Décision Reçue</th>
                  <th className="py-3 px-4 text-right">Actions de Suivi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDemandes.map(dem => {
                  const nurse = nurses.find(n => n.id === dem.nurseId);
                  if (!nurse) return null;

                  return (
                    <tr key={dem.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Nurse */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {nurse.nom} {nurse.prenom}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          PPR: <span className="font-mono tabular-nums">{nurse.ppr}</span> · {nurse.specialite}
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-3 font-medium text-slate-800">
                        {dem.typeConge}
                        {dem.motif && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]" title={dem.motif}>
                            {dem.motif}
                          </div>
                        )}
                      </td>

                      {/* Date Cessation */}
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-700">
                        {formatDateFr(dem.dateCessation)}
                      </td>

                      {/* Date Reprise Prévue */}
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-700 font-medium">
                        {formatDateFr(dem.dateReprisePrevue)}
                      </td>

                      {/* Date Reprise Effective */}
                      <td className="py-3 px-3">
                        {dem.dateRepriseEffective ? (
                          <div className="font-mono tabular-nums font-semibold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {formatDateFr(dem.dateRepriseEffective)}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            Non constatée
                          </span>
                        )}
                      </td>

                      {/* Durée */}
                      <td className="py-3 px-3 font-mono tabular-nums font-bold text-slate-900">
                        {dem.nombreJours} jours
                      </td>

                      {/* État Demande & Quick Status Change */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <select
                            value={dem.etatDemande}
                            onChange={(e) => handleUpdateEtat(dem, e.target.value as EtatDemande)}
                            className={`px-2 py-1 rounded text-xs font-semibold border ${
                              dem.etatDemande === 'Confirmé'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : dem.etatDemande === 'Refusé'
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            <option value="En attente">En attente</option>
                            <option value="Confirmé">Confirmé</option>
                            <option value="Refusé">Refusé</option>
                          </select>
                        </div>
                      </td>

                      {/* Décision Reçue & Visa */}
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleOpenDecisionModal(dem)}
                          className="text-left group cursor-pointer hover:opacity-80"
                          title="Cliquez pour modifier le numéro ou le statut de décision"
                        >
                          <div className="font-medium text-slate-800 group-hover:text-teal-700 flex items-center gap-1">
                            <span>{dem.decisionRecue}</span>
                            <span className="text-[10px] text-teal-600 underline">Éditer</span>
                          </div>
                          {dem.numeroDecision ? (
                            <div className="font-mono text-slate-500 text-[10px]">
                              N° {dem.numeroDecision}
                            </div>
                          ) : (
                            <div className="text-[10px] text-amber-600 italic">
                              Sans numéro de visa
                            </div>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Validation reprise rapide */}
                          {dem.etatDemande === 'Confirmé' && !dem.dateRepriseEffective && (
                            <button
                              onClick={() => onValidateReprise(dem.id, nurse.id)}
                              title="Valider la reprise effective de travail aujourd'hui"
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded transition-colors flex items-center gap-1 shadow-xs"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Reprise
                            </button>
                          )}

                          {/* Print Avis Cessation */}
                          <button
                            onClick={() => onPrintDoc(dem, nurse, 'cessation')}
                            title="Imprimer l'Avis de Cessation de Service officiel"
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Print PV Reprise */}
                          <button
                            onClick={() => onPrintDoc(dem, nurse, 'reprise')}
                            title="Imprimer le Procès-Verbal de Reprise de Fonctions"
                            className="p-1.5 text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded transition-colors"
                          >
                            <FileCheck className="w-4 h-4" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <div>
            Total: <span className="font-bold text-slate-900 tabular-nums">{filteredDemandes.length}</span> demande(s) affichée(s)
          </div>
          <div className="text-slate-400">
            Gestion statutaire des congés · Fonction Publique Hospitalière
          </div>
        </div>
      </div>

      {/* Modal for editing administrative decision */}
      {editingDecisionDemande && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              Mise à jour de la Décision Administrative
            </h3>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Statut de la décision
                </label>
                <select
                  value={inputStatutDecision}
                  onChange={(e) => setInputStatutDecision(e.target.value as StatutDecision)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500"
                >
                  <option value="Non reçue">Non reçue</option>
                  <option value="En cours de visa">En cours de visa / Transmission DRH</option>
                  <option value="Reçue et visée">Reçue et visée (Officielle)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Numéro de décision / Visa officiel
                </label>
                <input
                  type="text"
                  placeholder="Ex: DEC-BO-2026/184"
                  value={inputNumDecision}
                  onChange={(e) => setInputNumDecision(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                onClick={() => setEditingDecisionDemande(null)}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveDecision}
                className="px-3.5 py-1.5 bg-teal-700 text-white font-medium rounded hover:bg-teal-800"
              >
                Enregistrer la décision
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
