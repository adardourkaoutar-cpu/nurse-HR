import React, { useRef } from 'react';
import { X, Printer, FileText, CheckCircle2 } from 'lucide-react';
import { NurseStaff, DemandeConge } from '../types/nurse';
import { formatDateFr, calculateAnciennete, getSoldeCongeAdmin, getSoldeCongeMaladie, formatFonction } from '../utils/calculations';

interface PrintDocumentModalProps {
  nurse: NurseStaff;
  demande?: DemandeConge | null;
  typeDoc: 'cessation' | 'reprise' | 'dossier';
  onClose: () => void;
}

export const PrintDocumentModal: React.FC<PrintDocumentModalProps> = ({
  nurse,
  demande,
  typeDoc,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const anc = calculateAnciennete(nurse.dateRecrutement);
  const soldeAdmin = getSoldeCongeAdmin(nurse);
  const soldeMaladie = getSoldeCongeMaladie(nurse);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      
      {/* Container */}
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:border-none print:w-full">
        
        {/* Top bar (Hidden in print) */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-700" />
            <span className="font-bold text-sm text-slate-900">
              {typeDoc === 'cessation' && 'Avis de Cessation de Service'}
              {typeDoc === 'reprise' && 'Procès-Verbal de Reprise de Fonctions'}
              {typeDoc === 'dossier' && 'Fiche Individuelle du Personnel Infirmier'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              Imprimer / Exporter PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 overflow-y-auto print:p-8 space-y-6 text-slate-900 font-serif leading-relaxed text-xs">
          
          {/* Header officiel */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start text-center">
            <div className="text-left font-sans text-[11px] space-y-0.5">
              <div className="font-bold uppercase tracking-wider text-slate-900">Royaume du Maroc</div>
              <div className="text-slate-700">Ministère de la Santé et de la Protection Sociale</div>
              <div className="text-slate-700">Direction Régionale de la Santé</div>
              <div className="text-slate-700">Centre Hospitalier Universitaire / Provincial</div>
              <div className="font-semibold text-teal-900 pt-1">Service du Bloc Opératoire Central</div>
            </div>

            <div className="text-right font-sans text-[11px] space-y-1">
              <div className="font-mono text-slate-600">Réf: BO/RH-{new Date().getFullYear()}</div>
              <div className="text-slate-600">Fait à Rabat, le <span className="font-mono font-semibold">24 Octobre 2026</span></div>
            </div>
          </div>

          {/* Document Title Banner */}
          <div className="text-center py-3">
            <h1 className="text-base font-bold font-sans uppercase tracking-widest text-slate-900 border-b border-t border-slate-300 py-2 inline-block px-8">
              {typeDoc === 'cessation' && 'AVIS DE CESSATION DE SERVICE'}
              {typeDoc === 'reprise' && 'PROCÈS-VERBAL DE REPRISE DE FONCTIONS'}
              {typeDoc === 'dossier' && 'FICHE INDIVIDUELLE DU PERSONNEL INFIRMIER'}
            </h1>
          </div>

          {/* Corps de l'Avis de Cessation */}
          {typeDoc === 'cessation' && demande && (
            <div className="space-y-4 font-sans text-xs">
              <p className="text-justify leading-relaxed">
                Le Major du Bloc Opératoire et le Chef de Service certifient que l'infirmier(e) désigné(e) ci-après a cessé son service le <strong>{formatDateFr(demande.dateCessation, 'long')}</strong> après la fin de la séance opératoire, pour bénéficier d'un <strong>{demande.typeConge}</strong> d'une durée de <strong>{demande.nombreJours} jours</strong>.
              </p>

              {/* Tableau Agent */}
              <div className="border border-slate-300 rounded overflow-hidden">
                <table className="w-full text-left text-xs divide-y divide-slate-200">
                  <tbody className="divide-y divide-slate-200">
                    <tr className="bg-slate-50">
                      <td className="py-1.5 px-3 font-semibold text-slate-600 w-1/3">Nom & Prénom</td>
                      <td className="py-1.5 px-3 font-bold text-slate-900">{nurse.nom} {nurse.prenom}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-semibold text-slate-600">N° Somme / PPR</td>
                      <td className="py-1.5 px-3 font-mono font-bold">{nurse.ppr}</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="py-1.5 px-3 font-semibold text-slate-600">N° Carte Nationale d'Identité (CNI)</td>
                      <td className="py-1.5 px-3 font-mono">{nurse.cni}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-semibold text-slate-600">Grade & Spécialité</td>
                      <td className="py-1.5 px-3">{nurse.grade} · {nurse.specialite}</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="py-1.5 px-3 font-semibold text-slate-600">Fonction au Bloc Opératoire</td>
                      <td className="py-1.5 px-3">{nurse.fonction}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-semibold text-slate-600">Date et Lieu de Naissance</td>
                      <td className="py-1.5 px-3">{formatDateFr(nurse.dateNaissance)} à {nurse.lieuNaissance}</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="py-1.5 px-3 font-semibold text-slate-600">Position Statutaire</td>
                      <td className="py-1.5 px-3">{nurse.etatFonctionPublique}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-semibold text-slate-600">Décision administrative de congé</td>
                      <td className="py-1.5 px-3">
                        {demande.numeroDecision ? `N° ${demande.numeroDecision}` : 'En cours de visa administratif'} ({demande.decisionRecue})
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="py-1.5 px-3 font-semibold text-slate-600">Date de Reprise Prévue</td>
                      <td className="py-1.5 px-3 font-bold font-mono text-teal-800">
                        {formatDateFr(demande.dateReprisePrevue, 'long')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-justify text-[11px] text-slate-600 pt-2">
                Le présent avis est établi en trois exemplaires originaux pour valoir ce que de droit et être transmis à la Direction des Ressources Humaines ainsi qu'au Service du Personnel.
              </p>
            </div>
          )}

          {/* Corps du Procès-Verbal de Reprise */}
          {typeDoc === 'reprise' && (
            <div className="space-y-4 font-sans text-xs">
              <p className="text-justify leading-relaxed">
                Le Major du Bloc Opératoire certifie que l'infirmier(e) désigné(e) ci-après a repris effectivement et régulièrement ses fonctions au sein du <strong>Service du Bloc Opératoire Central</strong> le :
              </p>

              <div className="p-3 bg-teal-50 border border-teal-200 rounded text-center">
                <span className="text-xs uppercase font-bold text-teal-900 block">Date effective de reprise de fonctions</span>
                <span className="text-base font-bold font-mono text-teal-900">
                  {demande?.dateRepriseEffective ? formatDateFr(demande.dateRepriseEffective, 'long') : '24 Octobre 2026 à 08h00'}
                </span>
              </div>

              {/* Tableau Agent */}
              <div className="border border-slate-300 rounded overflow-hidden">
                <table className="w-full text-left text-xs divide-y divide-slate-200">
                  <tbody className="divide-y divide-slate-200">
                    <tr className="bg-slate-50">
                      <td className="py-1.5 px-3 font-semibold text-slate-600 w-1/3">Nom & Prénom</td>
                      <td className="py-1.5 px-3 font-bold text-slate-900">{nurse.nom} {nurse.prenom}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-semibold text-slate-600">N° Somme / PPR</td>
                      <td className="py-1.5 px-3 font-mono font-bold">{nurse.ppr}</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="py-1.5 px-3 font-semibold text-slate-600">N° CNI</td>
                      <td className="py-1.5 px-3 font-mono">{nurse.cni}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-semibold text-slate-600">Spécialité & Grade</td>
                      <td className="py-1.5 px-3">{nurse.specialite} · {nurse.grade}</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="py-1.5 px-3 font-semibold text-slate-600">Motif d'absence précédente</td>
                      <td className="py-1.5 px-3">{demande?.typeConge || 'Congé statutaire'}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-semibold text-slate-600">Fonction de Reprise</td>
                      <td className="py-1.5 px-3 font-semibold">{formatFonction(nurse.fonction)} · Bloc Opératoire</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-justify text-[11px] text-slate-600 pt-2">
                Le présent procès-verbal est dressé pour servir et valoir ce que de droit, notamment pour la régularisation de la situation de présence et de traitement financier auprès de la Trésorerie Générale.
              </p>
            </div>
          )}

          {/* Corps de la Fiche Individuelle */}
          {typeDoc === 'dossier' && (
            <div className="space-y-4 font-sans text-xs">
              
              <div className="grid grid-cols-2 gap-4 border border-slate-300 p-3 rounded">
                <div>
                  <h4 className="font-bold text-slate-900 border-b pb-1 mb-2">1. Renseignements Personnels</h4>
                  <div className="space-y-1">
                    <div>Nom: <strong>{nurse.nom}</strong></div>
                    <div>Prénom: <strong>{nurse.prenom}</strong></div>
                    <div>CNI: <strong className="font-mono">{nurse.cni}</strong></div>
                    <div>Né(e) le: <strong>{formatDateFr(nurse.dateNaissance)}</strong> à <strong>{nurse.lieuNaissance}</strong></div>
                    <div>Situation: <strong>{nurse.etatMarital}</strong> ({nurse.nombreEnfants} enfants)</div>
                    <div>Résidence: <strong>{nurse.lieuResidence}</strong></div>
                    <div>Navetteur: <strong>{nurse.navette ? `Oui (${nurse.trajetNavette})` : 'Non'}</strong></div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 border-b pb-1 mb-2">2. Données Administratives & Bloc</h4>
                  <div className="space-y-1">
                    <div>PPR: <strong className="font-mono">{nurse.ppr}</strong></div>
                    <div>Spécialité: <strong>{nurse.specialite}</strong></div>
                    <div>Fonction: <strong>{formatFonction(nurse.fonction)}</strong></div>
                    <div>Grade: <strong>{nurse.grade}</strong></div>
                    <div>Date recrutement: <strong>{formatDateFr(nurse.dateRecrutement)}</strong></div>
                    <div>Ancienneté: <strong>{anc.texte}</strong></div>
                    <div>Position: <strong>{nurse.etatFonctionPublique}</strong></div>
                    <div>Situation actuelle: <strong>{nurse.situationActuelle}</strong></div>
                  </div>
                </div>
              </div>

              {/* Compteurs de congés */}
              <div className="border border-slate-300 p-3 rounded space-y-2">
                <h4 className="font-bold text-slate-900 border-b pb-1">3. Compteurs & Soldes de Congés ({new Date().getFullYear()})</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-semibold block text-slate-700">Congé Administratif (22j + Reporté) :</span>
                    <div>Droit annuel : 22 jours</div>
                    <div>Reliquat reporté : {soldeAdmin.reporte} jours</div>
                    <div>Jours consommés : {soldeAdmin.consomme} jours</div>
                    <div className="font-bold text-teal-800">Solde restant : {soldeAdmin.restant} jours</div>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-700">Congé de Maladie (Plafond 90 jours / 3 mois) :</span>
                    <div>Plafond statutaire : 90 jours</div>
                    <div>Jours consommés : {soldeMaladie.consomme} jours</div>
                    <div className="font-bold text-rose-800">Solde restant : {soldeMaladie.restant} jours</div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Zone Signatures & Cachets */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-3 gap-4 text-center font-sans text-xs">
            <div className="space-y-12">
              <span className="font-semibold text-slate-700 block">L'Agent Intéressé(e)</span>
              <div className="text-[10px] text-slate-400 italic">(Signature)</div>
            </div>

            <div className="space-y-12">
              <span className="font-semibold text-slate-700 block">Le Major du Bloc Opératoire</span>
              <div className="text-[10px] text-slate-400 italic">(Cachet et Visa)</div>
            </div>

            <div className="space-y-12">
              <span className="font-semibold text-slate-700 block">Le Chef de Service Médical</span>
              <div className="text-[10px] text-slate-400 italic">(Cachet et Signature)</div>
            </div>
          </div>

          <div className="pt-6 text-center text-[10px] font-sans text-slate-400">
            Document généré par l'application BlocRH · Service du Bloc Opératoire Central · Archive RH
          </div>

        </div>

      </div>
    </div>
  );
};
