import React from 'react';
import { 
  X, 
  User, 
  Briefcase, 
  Calendar, 
  MapPin, 
  Mail, 
  FileText, 
  Printer, 
  Edit3, 
  Plus, 
  HeartPulse, 
  ShieldCheck, 
  Clock, 
  Baby, 
  Home,
  CheckCircle2
} from 'lucide-react';
import { NurseStaff, DemandeConge } from '../types/nurse';
import { 
  calculateAnciennete, 
  calculateAge, 
  getSoldeCongeAdmin, 
  getSoldeCongeMaladie, 
  formatDateFr,
  formatFonction 
} from '../utils/calculations';

interface NurseDetailModalProps {
  nurse: NurseStaff;
  demandes: DemandeConge[];
  onClose: () => void;
  onEdit: (nurse: NurseStaff) => void;
  onNewLeave: (nurse: NurseStaff) => void;
  onPrintDossier: (nurse: NurseStaff) => void;
  onPrintLeaveDoc: (demande: DemandeConge, nurse: NurseStaff, typeDoc: 'cessation' | 'reprise') => void;
}

export const NurseDetailModal: React.FC<NurseDetailModalProps> = ({
  nurse,
  demandes,
  onClose,
  onEdit,
  onNewLeave,
  onPrintDossier,
  onPrintLeaveDoc,
}) => {
  const anc = calculateAnciennete(nurse.dateRecrutement);
  const age = calculateAge(nurse.dateNaissance);
  const soldeAdmin = getSoldeCongeAdmin(nurse);
  const soldeMaladie = getSoldeCongeMaladie(nurse);

  const nurseDemandes = demandes.filter(d => d.nurseId === nurse.id);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-base shadow-xs">
              {nurse.nom.charAt(0)}{nurse.prenom.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {nurse.nom} {nurse.prenom}
                </h2>
                <span className="text-xs font-mono font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                  PPR: {nurse.ppr}
                </span>
                <span className="text-xs font-mono text-slate-500">
                  CNI: {nurse.cni}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {nurse.specialite} · {formatFonction(nurse.fonction)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrintDossier(nurse)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
              title="Imprimer la fiche individuelle"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(nurse)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
              title="Modifier les données de l'agent"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500">Situation Actuelle</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {nurse.situationActuelle}
              </div>
              <div className="text-[11px] text-teal-700 font-medium mt-1">
                {formatFonction(nurse.fonction)}
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500">Ancienneté Administrative</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 tabular-nums">
                {anc.texte}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Recruté le {formatDateFr(nurse.dateRecrutement)}
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500">Congé Admin Restant</div>
              <div className="text-sm font-bold text-teal-800 mt-0.5 tabular-nums">
                {soldeAdmin.restant} jours
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Droit: 22j + Rep: {soldeAdmin.reporte}j
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500">Congé Maladie Restant</div>
              <div className="text-sm font-bold text-rose-800 mt-0.5 tabular-nums">
                {soldeMaladie.restant} jours
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Sur limite de 90j (3 mois/an)
              </div>
            </div>

          </div>

          {/* Section 1: État Civil & Situation Familiale */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wide">
              <User className="w-4 h-4 text-teal-700" />
              État Civil & Coordonnées Personnelles
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Sexe de l'agent:</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    nurse.sexe === 'Femme'
                      ? 'bg-pink-100 text-pink-800 border border-pink-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {nurse.sexe || 'Non renseigné'}
                  </span>
                </span>
              </div>

              <div>
                <span className="text-slate-400 block">Date et Lieu de Naissance:</span>
                <span className="font-semibold text-slate-800">
                  {formatDateFr(nurse.dateNaissance, 'long')} à {nurse.lieuNaissance || '-'}
                </span>
                {age !== null && (
                  <span className="text-slate-500 ml-1">({age} ans)</span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block">Situation Familiale:</span>
                <span className="font-semibold text-slate-800">
                  {nurse.etatMarital}
                </span>
                <span className="text-slate-600 block">
                  {nurse.nombreEnfants} enfant{nurse.nombreEnfants > 1 ? 's' : ''} à charge
                </span>
              </div>

              {/* Si Femme + Mariée : Affichage grossesse et congé de maternité 90 jours */}
              {nurse.sexe === 'Femme' && nurse.etatMarital === 'Marié(e)' && (
                <div className="md:col-span-3 bg-purple-50/70 border border-purple-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-purple-950 flex items-center gap-1.5">
                      <Baby className="w-4 h-4 text-purple-700" />
                      Condition Statutaire : Agent Femme Mariée
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      nurse.enceinte
                        ? 'bg-purple-200 text-purple-900'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {nurse.enceinte ? 'Enceinte' : 'Non enceinte'}
                    </span>
                  </div>

                  {nurse.enceinte && nurse.congeMaternite && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-purple-200/60 text-[11px]">
                      <div className="bg-white p-2 rounded border border-purple-200">
                        <span className="text-slate-500 block">Durée Réglementaire:</span>
                        <span className="font-bold text-purple-950 text-xs">90 jours statutaires</span>
                      </div>
                      <div className="bg-white p-2 rounded border border-purple-200">
                        <span className="text-slate-500 block">Date de cessation:</span>
                        <span className="font-mono font-bold text-slate-800 text-xs">
                          {formatDateFr(nurse.congeMaternite.dateCessation) || 'Non définie'}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded border border-purple-200">
                        <span className="text-slate-500 block">Date de reprise prévue:</span>
                        <span className="font-mono font-bold text-teal-800 text-xs">
                          {formatDateFr(nurse.congeMaternite.dateReprise) || 'Non définie'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <span className="text-slate-400 block">Lieu de Résidence:</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Home className="w-3.5 h-3.5 text-slate-400" />
                  {nurse.lieuResidence}
                </span>
              </div>

              <div className="md:col-span-2">
                <span className="text-slate-400 block">Régime de déplacement (Navette):</span>
                {nurse.navette ? (
                  <span className="text-teal-700 font-semibold flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-600" />
                    Fait la navette : {nurse.trajetNavette || 'Trajet interurbain quotidien'}
                  </span>
                ) : (
                  <span className="text-slate-600 mt-0.5 block">
                    Ne fait pas la navette (résidence locale)
                  </span>
                )}
              </div>

              {nurse.email && (
                <div>
                  <span className="text-slate-400 block">Email professionnel:</span>
                  <span className="text-slate-700 font-medium block truncate">{nurse.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Statut Professionnel & Fonction Publique */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wide">
              <Briefcase className="w-4 h-4 text-teal-700" />
              Statut Statutaire & Rôle au Bloc Opératoire
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Grade dans la Fonction Publique:</span>
                <span className="font-semibold text-slate-800">{nurse.grade}</span>
              </div>

              <div>
                <span className="text-slate-400 block">Position Statutaire:</span>
                <span className="font-semibold text-slate-800">{nurse.etatFonctionPublique}</span>
              </div>

              <div>
                <span className="text-slate-400 block">Date de recrutement:</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {formatDateFr(nurse.dateRecrutement, 'long')}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block">Spécialité:</span>
                <span className="font-semibold text-teal-800">{nurse.specialite}</span>
              </div>

              <div>
                <span className="text-slate-400 block">Fonction attribuée au bloc:</span>
                <span className="font-semibold text-slate-800">{formatFonction(nurse.fonction)}</span>
              </div>
            </div>

            {nurse.notes && (
              <div className="pt-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100">
                <span className="font-semibold text-slate-700">Observations de service: </span>
                {nurse.notes}
              </div>
            )}
          </div>

          {/* Section 3: Droits & Soldes de Congés */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wide">
                <Calendar className="w-4 h-4 text-teal-700" />
                Droits & Compteurs Annuels de Congés
              </div>
              <button
                onClick={() => onNewLeave(nurse)}
                className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Poser un congé
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Congé Administratif */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">Congé Administratif Annuel</span>
                  <span className="font-mono text-teal-800 font-bold tabular-nums">
                    {soldeAdmin.restant}j disponibles
                  </span>
                </div>
                
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-teal-600 h-2 rounded-full" 
                    style={{ width: `${(soldeAdmin.restant / soldeAdmin.totalAcquis) * 100}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                  <div className="bg-white p-1.5 rounded border border-slate-200 text-center">
                    <div className="text-slate-400">Droit 2026</div>
                    <div className="font-bold text-slate-900 tabular-nums font-mono">{soldeAdmin.droitAnnuel}j</div>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-slate-200 text-center">
                    <div className="text-slate-400">Reliquat N-1</div>
                    <div className="font-bold text-slate-900 tabular-nums font-mono">+{soldeAdmin.reporte}j</div>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-slate-200 text-center">
                    <div className="text-slate-400">Consommés</div>
                    <div className="font-bold text-slate-900 tabular-nums font-mono">-{soldeAdmin.consomme}j</div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  Total acquis : {soldeAdmin.totalAcquis} jours (limite statutaire de 22 jours ouvrables + reliquat).
                </p>
              </div>

              {/* Congé de Maladie */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">Congé de Maladie Ordinaire (CMO)</span>
                  <span className="font-mono text-rose-800 font-bold tabular-nums">
                    {soldeMaladie.restant}j disponibles
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-rose-500 h-2 rounded-full" 
                    style={{ width: `${(soldeMaladie.consomme / 90) * 100}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="bg-white p-1.5 rounded border border-slate-200 text-center">
                    <div className="text-slate-400">Plafond annuel statutaire</div>
                    <div className="font-bold text-slate-900 tabular-nums font-mono">3 mois (90j)</div>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-slate-200 text-center">
                    <div className="text-slate-400">Jours consommés</div>
                    <div className="font-bold text-rose-700 tabular-nums font-mono">{soldeMaladie.consomme}j</div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  Régime à plein traitement : 3 mois par an. Au-delà, examen en commission médicale (demi-traitement).
                </p>
              </div>

            </div>
          </div>

          {/* Section 4: Historique des Demandes & Mouvements */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wide">
                <FileText className="w-4 h-4 text-teal-700" />
                Historique des Demandes, Cessations et Reprises
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {nurseDemandes.length} mouvement(s)
              </span>
            </div>

            {nurseDemandes.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                Aucune demande de congé enregistrée pour cet agent pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="py-2 px-2">Type</th>
                      <th className="py-2 px-2">Cessation</th>
                      <th className="py-2 px-2">Reprise Prévue</th>
                      <th className="py-2 px-2">Reprise Effective</th>
                      <th className="py-2 px-2">Durée</th>
                      <th className="py-2 px-2">État</th>
                      <th className="py-2 px-2">Décision</th>
                      <th className="py-2 px-2 text-right">Documents</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {nurseDemandes.map(dem => (
                      <tr key={dem.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-2 font-medium text-slate-800">
                          {dem.typeConge}
                        </td>
                        <td className="py-2.5 px-2 font-mono tabular-nums text-slate-700">
                          {formatDateFr(dem.dateCessation)}
                        </td>
                        <td className="py-2.5 px-2 font-mono tabular-nums text-slate-700">
                          {formatDateFr(dem.dateReprisePrevue)}
                        </td>
                        <td className="py-2.5 px-2 font-mono tabular-nums text-teal-800 font-semibold">
                          {dem.dateRepriseEffective ? formatDateFr(dem.dateRepriseEffective) : (
                            <span className="text-slate-400 italic">En attente</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 font-mono tabular-nums font-semibold text-slate-900">
                          {dem.nombreJours}j
                        </td>
                        <td className="py-2.5 px-2">
                          <span className={`inline-flex items-center text-[11px] font-semibold ${
                            dem.etatDemande === 'Confirmé' 
                              ? 'text-emerald-700' 
                              : dem.etatDemande === 'Refusé' 
                                ? 'text-rose-700' 
                                : 'text-amber-700'
                          }`}>
                            {dem.etatDemande}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-[11px]">
                          <div>{dem.decisionRecue}</div>
                          {dem.numeroDecision && (
                            <div className="font-mono text-slate-400 text-[10px]">{dem.numeroDecision}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onPrintLeaveDoc(dem, nurse, 'cessation')}
                              title="Avis de cessation de service"
                              className="px-2 py-1 text-[11px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                            >
                              Avis Cessation
                            </button>
                            <button
                              onClick={() => onPrintLeaveDoc(dem, nurse, 'reprise')}
                              title="PV de reprise de fonctions"
                              className="px-2 py-1 text-[11px] text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 rounded transition-colors font-medium"
                            >
                              PV Reprise
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-mono">
            Dossier Administratif Numérique · Bloc Opératoire
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNewLeave(nurse)}
              className="px-3.5 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors shadow-xs"
            >
              Déclarer un Congé
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
