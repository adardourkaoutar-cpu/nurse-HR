import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  FileText, 
  Download, 
  Edit3, 
  Check, 
  FileCheck2, 
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { NurseStaff, DemandeConge } from '../types/nurse';
import { 
  formatDateFr, 
  calculateAnciennete, 
  getSoldeCongeAdmin, 
  getSoldeCongeMaladie, 
  formatFonction 
} from '../utils/calculations';

interface PrintDocumentModalProps {
  nurse: NurseStaff;
  demande?: DemandeConge | null;
  typeDoc: 'cessation' | 'reprise' | 'dossier' | 'les_deux';
  onClose: () => void;
}

export const PrintDocumentModal: React.FC<PrintDocumentModalProps> = ({
  nurse,
  demande,
  typeDoc: initialTypeDoc,
  onClose,
}) => {
  // Document type selector
  const [activeDoc, setActiveDoc] = useState<'cessation' | 'reprise' | 'les_deux' | 'dossier'>(
    initialTypeDoc || 'cessation'
  );

  // Mode: "rempli" (filled from dossier) or "vierge" (blank template with dotted lines)
  const [isVierge, setIsVierge] = useState<boolean>(false);

  // Collapsible inline editor to customize fields prior to printing
  const [showEditor, setShowEditor] = useState<boolean>(false);

  // Today's date components for the "sidi ifni le DD / MM / YYYY" line
  const today = new Date();
  const defaultDateDoc = `${String(today.getDate()).padStart(2, '0')} / ${String(today.getMonth() + 1).padStart(2, '0')} / ${today.getFullYear()}`;

  // Editable form state initialized from the nurse's dossier and leave request
  const [customFields, setCustomFields] = useState({
    dateSidiIfni: defaultDateDoc,
    nomPrenom: `${nurse.nom} ${nurse.prenom}`.toUpperCase(),
    ppr: nurse.ppr || '',
    cni: nurse.cni || '',
    grade: nurse.grade || '',
    specialite: nurse.specialite ? `${nurse.specialite} (${formatFonction(nurse.fonction)})` : formatFonction(nurse.fonction),
    motif: demande?.motif || (demande ? demande.typeConge : 'Congé Administratif Annuel'),
    numeroDecision: demande?.numeroDecision || '',
    nbrJours: demande?.nombreJours ? `${demande.nombreJours} jours` : '',
    dateDecision: demande?.dateDemande ? formatDateFr(demande.dateDemande) : '',
    dateCessation: demande?.dateCessation ? formatDateFr(demande.dateCessation) : '',
    dateReprise: demande?.dateRepriseEffective 
      ? formatDateFr(demande.dateRepriseEffective) 
      : (demande?.dateReprisePrevue ? formatDateFr(demande.dateReprisePrevue) : ''),
    adresseTel: [
      nurse.lieuResidence || 'Sidi Ifni',
      nurse.email ? `Tél/Contact: ${nurse.email}` : ''
    ].filter(Boolean).join('  ·  ')
  });

  const handlePrint = () => {
    window.print();
  };

  // Calculations for individual file / dossier
  const anc = calculateAnciennete(nurse.dateRecrutement);
  const soldeAdmin = getSoldeCongeAdmin(nurse);
  const soldeMaladie = getSoldeCongeMaladie(nurse);

  /**
   * Component rendering the official Moroccan Ministry & Provincial Hospital Header
   */
  const renderOfficialHeader = () => (
    <div className="flex justify-between items-start text-[10px] leading-[1.3] font-sans font-bold text-black border-b border-black/20 pb-3">
      {/* Left side in French */}
      <div className="text-left space-y-0.5 tracking-tight uppercase">
        <div>ROYAUME DU MAROC</div>
        <div>MINISTERE DE LA SANTE ET DE LA PROTECTION SOCIALE</div>
        <div>DIRECTION REGIONALE DE LA SANTE ET DE LA PROTECTION SOCIALE</div>
        <div>A LA REGION DE GUELMIM OUED NOUN</div>
        <div>DELEGATION DE LA SANTE ET DE LA PROTECTION SOCIALE</div>
        <div>A LA PROVINCE DE SIDI IFNI</div>
        <div>CENTRE HOSPITALIER PROVINCIAL SIDI IFNI</div>
      </div>

      {/* Right side in Arabic */}
      <div className="text-right space-y-0.5 tracking-tight text-[11px] font-semibold" dir="rtl" lang="ar">
        <div>المملكة المغربية</div>
        <div>وزارة الصحة والحماية الاجتماعية</div>
        <div>المديرية الجهوية للصحة والحماية الاجتماعية بجهة كلميم واد نون</div>
        <div>المندوبية الإقليمية للصحة والحماية الاجتماعية بإقليم سيدي افني</div>
        <div>المركز الاستشفائي الإقليمي سيدي إفني</div>
      </div>
    </div>
  );

  /**
   * Component rendering the 4-signature approval grid
   */
  const renderApprovalTable = () => (
    <div className="mt-8 border border-black text-black">
      <div className="grid grid-cols-4 divide-x divide-black border-b border-black text-center font-bold text-[11px] py-1.5 bg-slate-50/50 print:bg-transparent">
        <div className="px-1">Avis du chef immédiat</div>
        <div className="px-1">Chef du pôle</div>
        <div className="px-1">responsable du BRH</div>
        <div className="px-1">Le Directeur</div>
      </div>
      <div className="grid grid-cols-4 divide-x divide-black h-32 print:h-36">
        <div className="p-1 text-[10px] text-slate-400 italic print:hidden text-center mt-20">Cachet & Signature</div>
        <div className="p-1 text-[10px] text-slate-400 italic print:hidden text-center mt-20">Cachet & Signature</div>
        <div className="p-1 text-[10px] text-slate-400 italic print:hidden text-center mt-20">Cachet & Signature</div>
        <div className="p-1 text-[10px] text-slate-400 italic print:hidden text-center mt-20">Cachet & Signature</div>
      </div>
    </div>
  );

  /**
   * Component rendering a dotted line or filled field
   */
  const renderDottedField = (label: string, value: string, placeholderDots = '...............................................................................................................................') => {
    return (
      <div className="flex items-baseline w-full py-1.5 text-[13px] font-sans">
        <span className="font-bold text-black shrink-0 mr-2">{label} :</span>
        {isVierge || !value.trim() ? (
          <span className="font-mono text-slate-400 tracking-wider flex-1 overflow-hidden select-none">
            {placeholderDots}
          </span>
        ) : (
          <div className="flex-1 border-b border-dotted border-black px-1 flex items-baseline justify-between">
            <span className="font-semibold text-black uppercase tracking-wide">{value}</span>
          </div>
        )}
      </div>
    );
  };

  /**
   * Single page for Cessation de service
   */
  const renderCessationPage = () => (
    <div className="print-page bg-white p-8 md:p-12 text-black font-sans leading-relaxed text-[13px] relative">
      {/* Official Header */}
      {renderOfficialHeader()}

      {/* Date sidi ifni le ... */}
      <div className="text-right text-xs italic font-serif py-3">
        {isVierge || !customFields.dateSidiIfni ? (
          <span>sidi ifni le ...... / ...... / .........</span>
        ) : (
          <span>sidi ifni le <strong className="font-sans font-semibold not-italic">{customFields.dateSidiIfni}</strong></span>
        )}
      </div>

      {/* Title */}
      <div className="text-center py-3">
        <h2 className="text-base md:text-lg font-bold underline underline-offset-4 text-black uppercase tracking-wide">
          Compt rendu de cessation de service
        </h2>
      </div>

      {/* Nurse / Agent Details */}
      <div className="space-y-1 pt-2">
        {renderDottedField('Nom et Prénom', customFields.nomPrenom)}
        
        <div className="flex items-baseline justify-between gap-6 w-full py-1.5 text-[13px]">
          <div className="flex items-baseline flex-1">
            <span className="font-bold text-black shrink-0 mr-2">PPR :</span>
            {isVierge || !customFields.ppr ? (
              <span className="font-mono text-slate-400 tracking-wider flex-1 overflow-hidden select-none">.......................................................</span>
            ) : (
              <span className="flex-1 border-b border-dotted border-black font-semibold text-black font-mono px-1">{customFields.ppr}</span>
            )}
          </div>
          <div className="flex items-baseline flex-1">
            <span className="font-bold text-black shrink-0 mr-2">CNI :</span>
            {isVierge || !customFields.cni ? (
              <span className="font-mono text-slate-400 tracking-wider flex-1 overflow-hidden select-none">.......................................................</span>
            ) : (
              <span className="flex-1 border-b border-dotted border-black font-semibold text-black font-mono px-1">{customFields.cni}</span>
            )}
          </div>
        </div>

        {renderDottedField('Grade', customFields.grade)}
        {renderDottedField('Spécialité', customFields.specialite)}

        <div className="flex items-baseline w-full py-1.5 text-[13px]">
          <span className="font-bold text-black shrink-0 mr-6">Service :</span>
          <span className="font-bold text-black uppercase tracking-wide">BLOC OPERATOIRE</span>
        </div>
      </div>

      {/* Section Détails de decision/note */}
      <div className="pt-4 space-y-1">
        <div className="font-bold text-black underline underline-offset-2 text-sm">
          Détails de decision/note
        </div>

        {renderDottedField('motif', customFields.motif)}

        <div className="flex items-baseline justify-between gap-6 w-full py-1.5 text-[13px]">
          <div className="flex items-baseline flex-1">
            <span className="font-bold text-black shrink-0 mr-2">N° de decision :</span>
            {isVierge || !customFields.numeroDecision ? (
              <span className="font-mono text-slate-400 tracking-wider flex-1 overflow-hidden select-none">.......................................................</span>
            ) : (
              <span className="flex-1 border-b border-dotted border-black font-semibold text-black font-mono px-1">{customFields.numeroDecision}</span>
            )}
          </div>
          <div className="flex items-baseline flex-1">
            <span className="font-bold text-black shrink-0 mr-2">Nbr de jours :</span>
            {isVierge || !customFields.nbrJours ? (
              <span className="font-mono text-slate-400 tracking-wider flex-1 overflow-hidden select-none">...........................................</span>
            ) : (
              <span className="flex-1 border-b border-dotted border-black font-semibold text-black px-1">{customFields.nbrJours}</span>
            )}
          </div>
        </div>

        {renderDottedField('Date de decision', customFields.dateDecision)}
      </div>

      {/* Section Cessation */}
      <div className="pt-4 space-y-1">
        <div className="font-bold text-black underline underline-offset-2 text-sm">
          Cessation :
        </div>

        {renderDottedField('Date de cessation', customFields.dateCessation)}
        {renderDottedField('adresse / tel', customFields.adresseTel)}
      </div>

      {/* Signature de l'intéressé(e) */}
      <div className="pt-6 pb-6">
        <span className="font-bold text-black underline underline-offset-2 text-[13px]">
          signature de l'interesse(e)
        </span>
      </div>

      {/* Official 4-Box Approval Grid */}
      {renderApprovalTable()}
    </div>
  );

  /**
   * Single page for Prise / Reprise de service
   */
  const renderReprisePage = () => (
    <div className="print-page bg-white p-8 md:p-12 text-black font-sans leading-relaxed text-[13px] relative">
      {/* Official Header */}
      {renderOfficialHeader()}

      {/* Date sidi ifni le ... */}
      <div className="text-right text-xs italic font-serif py-3">
        {isVierge || !customFields.dateSidiIfni ? (
          <span>sidi ifni le ...... / ...... / .........</span>
        ) : (
          <span>sidi ifni le <strong className="font-sans font-semibold not-italic">{customFields.dateSidiIfni}</strong></span>
        )}
      </div>

      {/* Title */}
      <div className="text-center py-3">
        <h2 className="text-base md:text-lg font-bold underline underline-offset-4 text-black uppercase tracking-wide">
          Compt rendu de prise/reprise de service
        </h2>
      </div>

      {/* Nurse / Agent Details */}
      <div className="space-y-1 pt-2">
        {renderDottedField('Nom et Prénom', customFields.nomPrenom)}
        
        <div className="flex items-baseline justify-between gap-6 w-full py-1.5 text-[13px]">
          <div className="flex items-baseline flex-1">
            <span className="font-bold text-black shrink-0 mr-2">PPR :</span>
            {isVierge || !customFields.ppr ? (
              <span className="font-mono text-slate-400 tracking-wider flex-1 overflow-hidden select-none">.......................................................</span>
            ) : (
              <span className="flex-1 border-b border-dotted border-black font-semibold text-black font-mono px-1">{customFields.ppr}</span>
            )}
          </div>
          <div className="flex items-baseline flex-1">
            <span className="font-bold text-black shrink-0 mr-2">CNI :</span>
            {isVierge || !customFields.cni ? (
              <span className="font-mono text-slate-400 tracking-wider flex-1 overflow-hidden select-none">.......................................................</span>
            ) : (
              <span className="flex-1 border-b border-dotted border-black font-semibold text-black font-mono px-1">{customFields.cni}</span>
            )}
          </div>
        </div>

        {renderDottedField('Grade', customFields.grade)}
        {renderDottedField('Spécialité', customFields.specialite)}

        <div className="flex items-baseline w-full py-1.5 text-[13px]">
          <span className="font-bold text-black shrink-0 mr-6">Service :</span>
          <span className="font-bold text-black uppercase tracking-wide">BLOC OPERATOIRE</span>
        </div>
      </div>

      {/* Section Détails de decision/note */}
      <div className="pt-4 space-y-1">
        <div className="font-bold text-black underline underline-offset-2 text-sm">
          Détails de decision/note
        </div>

        {renderDottedField('motif', customFields.motif)}

        <div className="flex items-baseline justify-between gap-6 w-full py-1.5 text-[13px]">
          <div className="flex items-baseline flex-1">
            <span className="font-bold text-black shrink-0 mr-2">N° de decision :</span>
            {isVierge || !customFields.numeroDecision ? (
              <span className="font-mono text-slate-400 tracking-wider flex-1 overflow-hidden select-none">.......................................................</span>
            ) : (
              <span className="flex-1 border-b border-dotted border-black font-semibold text-black font-mono px-1">{customFields.numeroDecision}</span>
            )}
          </div>
          <div className="flex items-baseline flex-1">
            <span className="font-bold text-black shrink-0 mr-2">Nbr de jours :</span>
            {isVierge || !customFields.nbrJours ? (
              <span className="font-mono text-slate-400 tracking-wider flex-1 overflow-hidden select-none">...........................................</span>
            ) : (
              <span className="flex-1 border-b border-dotted border-black font-semibold text-black px-1">{customFields.nbrJours}</span>
            )}
          </div>
        </div>

        {renderDottedField('Date de decision', customFields.dateDecision)}
      </div>

      {/* Section Prise/reprise */}
      <div className="pt-4 space-y-1">
        <div className="font-bold text-black underline underline-offset-2 text-sm">
          Prise/reprise :
        </div>

        {renderDottedField('Date de prise/reprise', customFields.dateReprise)}
        {renderDottedField('adresse / tel', customFields.adresseTel)}
      </div>

      {/* Signature de l'intéressé(e) */}
      <div className="pt-6 pb-6">
        <span className="font-bold text-black underline underline-offset-2 text-[13px]">
          signature de l'interesse(e)
        </span>
      </div>

      {/* Official 4-Box Approval Grid */}
      {renderApprovalTable()}
    </div>
  );

  /**
   * Dossier / Fiche Individuelle
   */
  const renderDossierPage = () => (
    <div className="print-page bg-white p-8 md:p-12 text-black font-sans leading-relaxed text-xs">
      {renderOfficialHeader()}
      <div className="text-center py-3">
        <h2 className="text-base font-bold underline underline-offset-4 text-black uppercase tracking-wide">
          Fiche Individuelle du Personnel Infirmier
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4 border border-slate-300 p-4 rounded mt-4">
        <div>
          <h4 className="font-bold text-slate-900 border-b pb-1 mb-2">1. Renseignements Personnels</h4>
          <div className="space-y-1.5 text-xs">
            <div>Nom : <strong>{nurse.nom}</strong></div>
            <div>Prénom : <strong>{nurse.prenom}</strong></div>
            <div>CNI : <strong className="font-mono">{nurse.cni}</strong></div>
            <div>Né(e) le : <strong>{formatDateFr(nurse.dateNaissance)}</strong> à <strong>{nurse.lieuNaissance}</strong></div>
            <div>Situation : <strong>{nurse.etatMarital}</strong> ({nurse.nombreEnfants} enfants)</div>
            <div>Résidence : <strong>{nurse.lieuResidence}</strong></div>
            <div>Navette : <strong>{nurse.navette ? `Oui (${nurse.trajetNavette})` : 'Non'}</strong></div>
          </div>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 border-b pb-1 mb-2">2. Données Statutaires & Bloc</h4>
          <div className="space-y-1.5 text-xs">
            <div>PPR : <strong className="font-mono">{nurse.ppr}</strong></div>
            <div>Spécialité : <strong>{nurse.specialite}</strong></div>
            <div>Fonction au Bloc : <strong>{formatFonction(nurse.fonction)}</strong></div>
            <div>Grade : <strong>{nurse.grade}</strong></div>
            <div>Date recrutement : <strong>{formatDateFr(nurse.dateRecrutement)}</strong></div>
            <div>Ancienneté : <strong>{anc.texte}</strong></div>
            <div>Position : <strong>{nurse.etatFonctionPublique}</strong></div>
            <div>Situation actuelle : <strong>{nurse.situationActuelle}</strong></div>
          </div>
        </div>
      </div>

      {/* Compteurs congés */}
      <div className="border border-slate-300 p-4 rounded space-y-2 mt-4 text-xs">
        <h4 className="font-bold text-slate-900 border-b pb-1">3. Compteurs & Soldes de Congés ({new Date().getFullYear()})</h4>
        <div className="grid grid-cols-2 gap-4">
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

      <div className="mt-8 border-t border-slate-300 pt-6 grid grid-cols-3 gap-4 text-center">
        <div className="space-y-12">
          <span className="font-semibold block">L'Agent Intéressé(e)</span>
          <div className="text-[10px] text-slate-400 italic">(Signature)</div>
        </div>
        <div className="space-y-12">
          <span className="font-semibold block">Le Major du Bloc</span>
          <div className="text-[10px] text-slate-400 italic">(Cachet et Visa)</div>
        </div>
        <div className="space-y-12">
          <span className="font-semibold block">Le Chef de Service</span>
          <div className="text-[10px] text-slate-400 italic">(Cachet et Signature)</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      
      {/* Modal Container */}
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        
        {/* Top Control Bar (Hidden in Print) */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden">
          
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-teal-100 text-teal-800 rounded-lg">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">
                  Compte Rendu Officiel · Cessation & Reprise
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-teal-50 border border-teal-200 text-teal-800">
                  CHP Sidi Ifni
                </span>
              </div>
              <div className="text-xs text-slate-500">
                Agent : <strong className="text-slate-800">{nurse.nom} {nurse.prenom}</strong> (PPR: {nurse.ppr})
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            
            {/* Mode toggle: Rempli vs Vierge */}
            <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => setIsVierge(false)}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                  !isVierge 
                    ? 'bg-teal-700 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Rempli (Dossier)
              </button>
              <button
                type="button"
                onClick={() => setIsVierge(true)}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                  isVierge 
                    ? 'bg-teal-700 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Modèle Vierge
              </button>
            </div>

            {/* Toggle Quick Editor */}
            {!isVierge && (
              <button
                type="button"
                onClick={() => setShowEditor(!showEditor)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                  showEditor 
                    ? 'bg-slate-200 text-slate-800 border-slate-300' 
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
                title="Ajuster les valeurs avant l'impression"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Ajuster</span>
                {showEditor ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Direct download link to original blank PDF */}
            <a
              href="/assets/aistudio/Cessation_et_Reprise_de_Service_491c469d.pdf"
              download="Cessation_et_Reprise_de_Service_Sidi_Ifni_Vierge.pdf"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
              title="Télécharger l'exemplaire vierge original en format PDF"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">PDF Vierge Source</span>
            </a>

            {/* Print button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Tabs Bar (Hidden in Print) */}
        <div className="px-6 py-2 border-b border-slate-200 bg-slate-100/70 flex flex-wrap items-center justify-between gap-2 print:hidden text-xs">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveDoc('cessation')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-all whitespace-nowrap ${
                activeDoc === 'cessation'
                  ? 'bg-white text-teal-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              1. Cessation de Service
            </button>
            <button
              onClick={() => setActiveDoc('reprise')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-all whitespace-nowrap ${
                activeDoc === 'reprise'
                  ? 'bg-white text-teal-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              2. Prise / Reprise de Service
            </button>
            <button
              onClick={() => setActiveDoc('les_deux')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-all whitespace-nowrap ${
                activeDoc === 'les_deux'
                  ? 'bg-white text-teal-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              3. Imprimer les 2 Pages (Cessation + Reprise)
            </button>
            <button
              onClick={() => setActiveDoc('dossier')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-all whitespace-nowrap ${
                activeDoc === 'dossier'
                  ? 'bg-white text-teal-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              4. Fiche Dossier RH
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            {isVierge ? 'Affichage : Exemplaire vierge officiel' : 'Affichage : Remplissage automatique actif'}
          </div>
        </div>

        {/* Quick Fields Customizer (Collapsible) */}
        {showEditor && !isVierge && (
          <div className="p-4 bg-teal-50/50 border-b border-teal-200 text-xs space-y-3 print:hidden">
            <div className="flex items-center justify-between">
              <span className="font-bold text-teal-950 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-teal-700" />
                Ajustement rapide des informations imprimées (Dossier de l'infirmier) :
              </span>
              <button
                type="button"
                onClick={() => setShowEditor(false)}
                className="text-[11px] text-teal-700 hover:text-teal-900 font-semibold"
              >
                Masquer l'éditeur
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Date du document (Sidi Ifni le ...)</label>
                <input
                  type="text"
                  value={customFields.dateSidiIfni}
                  onChange={(e) => setCustomFields({ ...customFields, dateSidiIfni: e.target.value })}
                  placeholder="Ex: 27 / 10 / 2026"
                  className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Motif</label>
                <input
                  type="text"
                  value={customFields.motif}
                  onChange={(e) => setCustomFields({ ...customFields, motif: e.target.value })}
                  placeholder="Ex: Congé administratif annuel"
                  className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">N° de décision</label>
                <input
                  type="text"
                  value={customFields.numeroDecision}
                  onChange={(e) => setCustomFields({ ...customFields, numeroDecision: e.target.value })}
                  placeholder="Ex: DEC-BO-2026/042"
                  className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Nombre de jours</label>
                <input
                  type="text"
                  value={customFields.nbrJours}
                  onChange={(e) => setCustomFields({ ...customFields, nbrJours: e.target.value })}
                  placeholder="Ex: 22 jours"
                  className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Date de décision</label>
                <input
                  type="text"
                  value={customFields.dateDecision}
                  onChange={(e) => setCustomFields({ ...customFields, dateDecision: e.target.value })}
                  placeholder="Ex: 20/10/2026"
                  className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Date de cessation</label>
                <input
                  type="text"
                  value={customFields.dateCessation}
                  onChange={(e) => setCustomFields({ ...customFields, dateCessation: e.target.value })}
                  placeholder="Ex: 24/10/2026"
                  className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Date de prise/reprise</label>
                <input
                  type="text"
                  value={customFields.dateReprise}
                  onChange={(e) => setCustomFields({ ...customFields, dateReprise: e.target.value })}
                  placeholder="Ex: 15/11/2026"
                  className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Adresse / Téléphone de l'agent</label>
                <input
                  type="text"
                  value={customFields.adresseTel}
                  onChange={(e) => setCustomFields({ ...customFields, adresseTel: e.target.value })}
                  placeholder="Ex: Hay Lalla Meryem, Sidi Ifni · 06 61 23 45 67"
                  className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Document Preview Area */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-200/50 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          <div className="w-full max-w-[210mm] bg-white shadow-lg border border-slate-300 print:shadow-none print:border-none">
            
            {activeDoc === 'cessation' && renderCessationPage()}

            {activeDoc === 'reprise' && renderReprisePage()}

            {activeDoc === 'les_deux' && (
              <div className="space-y-8 print:space-y-0">
                {renderCessationPage()}
                <div className="border-t-4 border-dashed border-slate-300 my-6 print:hidden"></div>
                {renderReprisePage()}
              </div>
            )}

            {activeDoc === 'dossier' && renderDossierPage()}

          </div>
        </div>

        {/* Footer info (Hidden in Print) */}
        <div className="px-6 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 print:hidden">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Modèle conforme à l'exemplaire officiel du Centre Hospitalier Provincial Sidi Ifni</span>
          </div>
          <div>
            Format A4 · Prêt pour impression ou export PDF
          </div>
        </div>

      </div>
    </div>
  );
};
