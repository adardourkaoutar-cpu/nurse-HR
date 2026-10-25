import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Baby, Heart, Clock, Calendar } from 'lucide-react';
import { 
  NurseStaff, 
  Specialite, 
  Fonction, 
  EtatMarital, 
  Grade, 
  EtatFonctionPublique, 
  SituationActuelle,
  Sexe,
  PeriodeSystemeNormal
} from '../types/nurse';

interface NurseFormModalProps {
  initialNurse?: NurseStaff | null;
  onSave: (nurse: NurseStaff) => void;
  onClose: () => void;
}

const SPECIALITES: Specialite[] = [
  'IAR',
  'IP',
  'ISM',
  'IBO',
];

const FONCTIONS: Fonction[] = [
  'Infirmier chef',
  'Anesthésiste',
  'Aide-opératoire / Panseur',
  'Stérilisation',
];

const GRADES: Grade[] = [
  'Grade 1',
  'Grade 2',
  'Grade principal',
  'Grade exceptionnel',
];

const ETATS_FP: EtatFonctionPublique[] = [
  'Fonctionnaire Titulaire',
  'Stagiaire',
  'Mis en Disponibilité',
  'Sous le Drapeau',
  'Contractuel',
];

const SITUATIONS: SituationActuelle[] = [
  'Système normal',
  'Système de garde',
  'Congé administratif',
  'Congé de maladie',
  'Congé de maternité',
  'Congé exceptionnel',
  'Mis en disponibilité',
  'Sous drapeau',
];

export const NurseFormModal: React.FC<NurseFormModalProps> = ({
  initialNurse,
  onSave,
  onClose,
}) => {
  const isEditing = !!initialNurse;

  // Form states
  const [nom, setNom] = useState(initialNurse?.nom || '');
  const [prenom, setPrenom] = useState(initialNurse?.prenom || '');
  const [sexe, setSexe] = useState<Sexe>(initialNurse?.sexe || 'Femme');
  const [ppr, setPpr] = useState(initialNurse?.ppr || '');
  const [cni, setCni] = useState(initialNurse?.cni || '');
  const [specialite, setSpecialite] = useState<Specialite>(initialNurse?.specialite || 'IBO');
  const [fonction, setFonction] = useState<Fonction>(() => {
    if (!initialNurse?.fonction) return 'Aide-opératoire / Panseur';
    if (initialNurse.fonction === 'Aide-opératoire' || initialNurse.fonction === 'Panseur') {
      return 'Aide-opératoire / Panseur';
    }
    return initialNurse.fonction;
  });
  const [dateNaissance, setDateNaissance] = useState(initialNurse?.dateNaissance || '1992-01-01');
  const [lieuNaissance, setLieuNaissance] = useState(initialNurse?.lieuNaissance || 'Rabat');
  const [etatMarital, setEtatMarital] = useState<EtatMarital>(initialNurse?.etatMarital || 'Marié(e)');
  
  // Condition spécifique: Femme + Mariée -> Enceinte
  const [enceinte, setEnceinte] = useState<boolean>(initialNurse?.enceinte || false);
  const [matCessation, setMatCessation] = useState<string>(initialNurse?.congeMaternite?.dateCessation || '');
  const [matReprise, setMatReprise] = useState<string>(initialNurse?.congeMaternite?.dateReprise || '');
  const [matActif, setMatActif] = useState<boolean>(initialNurse?.congeMaternite?.actif || false);

  const [nombreEnfants, setNombreEnfants] = useState<number>(initialNurse?.nombreEnfants ?? 0);
  const [grade, setGrade] = useState<Grade>(initialNurse?.grade || 'Grade 1');
  const [dateRecrutement, setDateRecrutement] = useState(initialNurse?.dateRecrutement || '2016-01-01');
  const [etatFonctionPublique, setEtatFonctionPublique] = useState<EtatFonctionPublique>(initialNurse?.etatFonctionPublique || 'Fonctionnaire Titulaire');
  const [lieuResidence, setLieuResidence] = useState(initialNurse?.lieuResidence || 'Rabat');
  const [navette, setNavette] = useState<boolean>(initialNurse?.navette || false);
  const [trajetNavette, setTrajetNavette] = useState(initialNurse?.trajetNavette || '');
  
  // Congé admin (22 jours ouvrables)
  const [reliquatReporte, setReliquatReporte] = useState<number>(initialNurse?.congeAdmin?.joursReportes ?? 0);
  const [joursConsommesAdmin, setJoursConsommesAdmin] = useState<number>(initialNurse?.congeAdmin?.joursConsommes ?? 0);
  
  // Congé maladie (3 mois / 90 jours)
  const [joursConsommesMaladie, setJoursConsommesMaladie] = useState<number>(initialNurse?.congeMaladie?.joursConsommes ?? 0);
  
  // Situation actuelle & Tour de Rôle
  const [situationActuelle, setSituationActuelle] = useState<SituationActuelle>(initialNurse?.situationActuelle || 'Système normal');
  const [dateDebutNormal, setDateDebutNormal] = useState(initialNurse?.periodeSystemeNormal?.dateDebut || '');
  const [dateFinNormal, setDateFinNormal] = useState(initialNurse?.periodeSystemeNormal?.dateFin || '');
  const [commentaireTourRole, setCommentaireTourRole] = useState(initialNurse?.periodeSystemeNormal?.commentaire || '');

  const [email, setEmail] = useState(initialNurse?.email || '');
  const [notes, setNotes] = useState(initialNurse?.notes || '');

  const [errorMsg, setErrorMsg] = useState('');

  // Auto-calcul de la date de reprise pour le congé maternité (exactement 90 jours après la date de cessation)
  useEffect(() => {
    if (matCessation) {
      const start = new Date(matCessation);
      if (!isNaN(start.getTime())) {
        const end = new Date(start);
        end.setDate(end.getDate() + 90);
        const y = end.getFullYear();
        const m = String(end.getMonth() + 1).padStart(2, '0');
        const d = String(end.getDate()).padStart(2, '0');
        setMatReprise(`${y}-${m}-${d}`);
      }
    }
  }, [matCessation]);

  // Si situation change en 'Congé de maternité', activer le statut
  useEffect(() => {
    if (situationActuelle === 'Congé de maternité') {
      setMatActif(true);
    }
  }, [situationActuelle]);

  const isFemmeMariee = sexe === 'Femme' && etatMarital === 'Marié(e)';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !prenom.trim() || !ppr.trim() || !cni.trim()) {
      setErrorMsg('Veuillez renseigner les champs obligatoires (Nom, Prénom, PPR, CNI).');
      return;
    }

    const effectiveSituation = (isFemmeMariee && enceinte && matCessation && matActif) 
      ? 'Congé de maternité' 
      : situationActuelle;

    // Si Système normal, valider les dates de période de tour de rôle
    if (effectiveSituation === 'Système normal') {
      if (!dateDebutNormal || !dateFinNormal) {
        setErrorMsg('Veuillez définir la période exacte (Date de début et Date de fin) du tour de rôle pour le Système Normal.');
        return;
      }
      if (dateDebutNormal > dateFinNormal) {
        setErrorMsg('La date de début du Système Normal doit être antérieure ou égale à la date de fin de période.');
        return;
      }
    }

    const hasMaternite = isFemmeMariee && enceinte && matCessation;

    const nurseData: NurseStaff = {
      id: initialNurse?.id || `nurse-${Date.now()}`,
      nom: nom.toUpperCase().trim(),
      prenom: prenom.trim(),
      sexe,
      ppr: ppr.trim(),
      cni: cni.toUpperCase().trim(),
      specialite,
      fonction,
      dateNaissance,
      lieuNaissance: lieuNaissance.trim(),
      etatMarital,
      enceinte: isFemmeMariee ? enceinte : undefined,
      congeMaternite: hasMaternite ? {
        dateCessation: matCessation,
        dateReprise: matReprise,
        dureeJours: 90,
        actif: matActif || effectiveSituation === 'Congé de maternité'
      } : undefined,
      nombreEnfants: Number(nombreEnfants) || 0,
      grade,
      dateRecrutement,
      etatFonctionPublique,
      lieuResidence: lieuResidence.trim(),
      navette,
      trajetNavette: navette ? trajetNavette.trim() : undefined,
      congeAdmin: {
        limiteAnnuelle: 22,
        joursReportes: Number(reliquatReporte) || 0,
        joursConsommes: Number(joursConsommesAdmin) || 0,
      },
      congeMaladie: {
        limiteAnnuelleMois: 3,
        joursConsommes: Number(joursConsommesMaladie) || 0,
      },
      situationActuelle: effectiveSituation,
      periodeSystemeNormal: effectiveSituation === 'Système normal' && dateDebutNormal && dateFinNormal ? {
        dateDebut: dateDebutNormal,
        dateFin: dateFinNormal,
        commentaire: commentaireTourRole.trim() || undefined,
      } : undefined,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    onSave(nurseData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEditing ? `Modifier l'agent : ${initialNurse?.nom} ${initialNurse?.prenom}` : 'Ajouter un Infirmier au Bloc Opératoire'}
            </h2>
            <p className="text-xs text-slate-500">
              Fiche administrative & dossier du personnel infirmier (Fonction Publique)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-xs">
          
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Identification, Sexe & État Civil */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider pb-1 border-b border-slate-100 text-teal-800">
              1. État Civil & Identifiants
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nom *</label>
                <input
                  type="text"
                  required
                  placeholder="EX: BENNANI"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Prénom *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Amina"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Sexe (Genre) *</label>
                <select
                  value={sexe}
                  onChange={(e) => {
                    const newSexe = e.target.value as Sexe;
                    setSexe(newSexe);
                    if (newSexe !== 'Femme') {
                      setEnceinte(false);
                    }
                  }}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none font-semibold text-slate-800"
                >
                  <option value="Femme">Femme</option>
                  <option value="Homme">Homme</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">PPR (Matricule) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 1789420"
                  value={ppr}
                  onChange={(e) => setPpr(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">CNI (Carte Identité) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: AA12345"
                  value={cni}
                  onChange={(e) => setCni(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Date de Naissance *</label>
                <input
                  type="date"
                  required
                  value={dateNaissance}
                  onChange={(e) => setDateNaissance(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Lieu de Naissance</label>
                <input
                  type="text"
                  placeholder="Ex: Rabat, Fès..."
                  value={lieuNaissance}
                  onChange={(e) => setLieuNaissance(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">État Marital</label>
                <select
                  value={etatMarital}
                  onChange={(e) => {
                    const newEtat = e.target.value as EtatMarital;
                    setEtatMarital(newEtat);
                    if (newEtat !== 'Marié(e)') {
                      setEnceinte(false);
                    }
                  }}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none font-medium"
                >
                  <option value="Célibataire">Célibataire</option>
                  <option value="Marié(e)">Marié(e)</option>
                  <option value="Divorcé(e)">Divorcé(e)</option>
                  <option value="Veuf(ve)">Veuf(ve)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Nombre d'enfants</label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={nombreEnfants}
                  onChange={(e) => setNombreEnfants(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Condition: Si Femme + Mariée -> Case Enceinte & Congé de maternité */}
            {isFemmeMariee && (
              <div className="p-3.5 bg-rose-50/50 border border-rose-200 rounded-lg space-y-3 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Baby className="w-4 h-4 text-rose-600" />
                    <span className="font-bold text-rose-900 text-xs">Situation de Grossesse (Femme Mariée)</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="radio"
                        name="enceinte"
                        checked={enceinte === false}
                        onChange={() => setEnceinte(false)}
                        className="text-teal-600 focus:ring-teal-500"
                      />
                      <span>Non enceinte</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-rose-800">
                      <input
                        type="radio"
                        name="enceinte"
                        checked={enceinte === true}
                        onChange={() => setEnceinte(true)}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>Enceinte</span>
                    </label>
                  </div>
                </div>

                {/* Si Enceinte : Saisie du Congé de Maternité (90 jours) */}
                {enceinte && (
                  <div className="pt-2 border-t border-rose-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-rose-900 mb-1">
                        Date de Cessation (Départ Maternité) *
                      </label>
                      <input
                        type="date"
                        value={matCessation}
                        onChange={(e) => setMatCessation(e.target.value)}
                        className="w-full px-3 py-1.5 border border-rose-300 rounded-md bg-white focus:ring-1 focus:ring-rose-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-rose-900 mb-1">
                        Date de Reprise (Calcul 90 jours) *
                      </label>
                      <input
                        type="date"
                        value={matReprise}
                        onChange={(e) => setMatReprise(e.target.value)}
                        className="w-full px-3 py-1.5 border border-rose-300 rounded-md bg-white focus:ring-1 focus:ring-rose-500 font-medium"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <div className="p-2 bg-white rounded border border-rose-200 text-center">
                        <span className="text-[10px] text-rose-700 block uppercase font-bold">Durée statutaire</span>
                        <span className="font-mono font-bold text-rose-900 text-xs">90 Jours</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* 2. Rôle, Spécialité & Statut Fonction Publique */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider pb-1 border-b border-slate-100 text-teal-800">
              2. Spécialité, Rôle dans le bloc & Statut Fonction Publique
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Spécialité *</label>
                <select
                  value={specialite}
                  onChange={(e) => setSpecialite(e.target.value as Specialite)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none font-semibold text-slate-800"
                >
                  {SPECIALITES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Rôle / Fonction dans le bloc *</label>
                <select
                  value={fonction}
                  onChange={(e) => setFonction(e.target.value as Fonction)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none font-semibold text-slate-800"
                >
                  {FONCTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Grade (Seulement 4 grades) *</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value as Grade)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none font-semibold text-teal-900"
                >
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Date de Recrutement *</label>
                <input
                  type="date"
                  required
                  value={dateRecrutement}
                  onChange={(e) => setDateRecrutement(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Position Statutaire *</label>
                <select
                  value={etatFonctionPublique}
                  onChange={(e) => setEtatFonctionPublique(e.target.value as EtatFonctionPublique)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none font-medium"
                >
                  {ETATS_FP.map(efp => <option key={efp} value={efp}>{efp}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Situation Actuelle *</label>
                <select
                  value={situationActuelle}
                  onChange={(e) => setSituationActuelle(e.target.value as SituationActuelle)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none font-semibold text-teal-900 bg-teal-50/50"
                >
                  {SITUATIONS.map(sit => <option key={sit} value={sit}>{sit}</option>)}
                </select>
              </div>

              {/* Si Système normal : Définition de la période du tour de rôle */}
              {situationActuelle === 'Système normal' && (
                <div className="md:col-span-3 bg-emerald-50/90 border border-emerald-300 rounded-lg p-3.5 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/80 pb-2">
                    <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-700" />
                      Période du Tour de Rôle en Système Normal
                    </span>
                    <span className="text-[11px] text-emerald-800 bg-white border border-emerald-300 px-2 py-0.5 rounded font-medium">
                      Alternance tour de rôle : Système de garde ⮂ Système normal
                    </span>
                  </div>

                  <p className="text-[11px] text-emerald-900 leading-relaxed">
                    Le staff fait un tour de rôle entre système de garde et système normal. 
                    Veuillez définir manuellement la période exacte (date de début et date de fin) pour cet agent :
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                        Date de début de la période *
                      </label>
                      <input
                        type="date"
                        required={situationActuelle === 'Système normal'}
                        value={dateDebutNormal}
                        onChange={(e) => setDateDebutNormal(e.target.value)}
                        className="w-full px-3 py-1.5 border border-emerald-300 rounded-md bg-white focus:ring-1 focus:ring-emerald-500 font-medium text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                        Date de fin de la période *
                      </label>
                      <input
                        type="date"
                        required={situationActuelle === 'Système normal'}
                        value={dateFinNormal}
                        onChange={(e) => setDateFinNormal(e.target.value)}
                        className="w-full px-3 py-1.5 border border-emerald-300 rounded-md bg-white focus:ring-1 focus:ring-emerald-500 font-medium text-xs text-slate-900"
                      />
                    </div>

                    <div className="sm:col-span-2 md:col-span-1">
                      <label className="block text-[11px] font-medium text-emerald-950 mb-1">
                        Raccourcis de période
                      </label>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setDateDebutNormal('2026-10-01');
                            setDateFinNormal('2026-10-31');
                          }}
                          className="px-2 py-1 text-[10px] font-semibold bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded transition-colors"
                        >
                          Octobre 2026
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDateDebutNormal('2026-11-01');
                            setDateFinNormal('2026-11-30');
                          }}
                          className="px-2 py-1 text-[10px] font-semibold bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded transition-colors"
                        >
                          Novembre 2026
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-emerald-950 mb-1">
                      Observation / Équipe de roulement (optionnel)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Équipe A - Bloc Central matinée / Vacation programmée"
                      value={commentaireTourRole}
                      onChange={(e) => setCommentaireTourRole(e.target.value)}
                      className="w-full px-3 py-1 border border-emerald-200 rounded-md bg-white text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Résidence & Navette */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider pb-1 border-b border-slate-100 text-teal-800">
              3. Résidence & Déplacements (Navette)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Lieu de Résidence</label>
                <input
                  type="text"
                  placeholder="Ex: Rabat (Agdal), Salé..."
                  value={lieuResidence}
                  onChange={(e) => setLieuResidence(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Faisant la Navette ?</label>
                <div className="flex items-center gap-4 mt-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="navette"
                      checked={navette === true}
                      onChange={() => setNavette(true)}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <span>Oui (Navettiste)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="navette"
                      checked={navette === false}
                      onChange={() => setNavette(false)}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <span>Non (Résident local)</span>
                  </label>
                </div>
              </div>

              {navette && (
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Détails Trajet Navette</label>
                  <input
                    type="text"
                    placeholder="Ex: Casablanca - Rabat (Train Al Boraq)"
                    value={trajetNavette}
                    onChange={(e) => setTrajetNavette(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 4. Soldes & Compteurs de Congés */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider pb-1 border-b border-slate-100 text-teal-800">
              4. Compteurs & Report Statutaire des Congés
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <label className="block font-medium text-slate-700 mb-1">Droit Congé Admin Annuel</label>
                <input
                  type="number"
                  disabled
                  value={22}
                  className="w-full px-3 py-1 border border-slate-300 bg-slate-100 rounded-md font-mono tabular-nums text-slate-600"
                />
                <span className="text-[10px] text-slate-400">22 jours ouvrables (hors sam/dim et fériés)</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <label className="block font-medium text-slate-700 mb-1">Jours Reportés (Reliquat N-1)</label>
                <input
                  type="number"
                  min="0"
                  max="66"
                  value={reliquatReporte}
                  onChange={(e) => setReliquatReporte(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1 border border-slate-300 rounded-md font-mono tabular-nums focus:ring-1 focus:ring-teal-500"
                />
                <span className="text-[10px] text-teal-700 font-medium">Rajoutés au droit de l'année en cours</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <label className="block font-medium text-slate-700 mb-1">Jours Admin Consommés</label>
                <input
                  type="number"
                  min="0"
                  value={joursConsommesAdmin}
                  onChange={(e) => setJoursConsommesAdmin(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1 border border-slate-300 rounded-md font-mono tabular-nums focus:ring-1 focus:ring-teal-500"
                />
                <span className="text-[10px] text-teal-700 font-bold">
                  Restants: {Math.max(0, 22 + reliquatReporte - joursConsommesAdmin)} jours
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <label className="block font-medium text-slate-700 mb-1">Jours Maladie Consommés</label>
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={joursConsommesMaladie}
                  onChange={(e) => setJoursConsommesMaladie(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1 border border-slate-300 rounded-md font-mono tabular-nums focus:ring-1 focus:ring-teal-500"
                />
                <span className="text-[10px] text-rose-700 font-bold">
                  Restants: {Math.max(0, 90 - joursConsommesMaladie)} jours / 90j (3 mois)
                </span>
              </div>
            </div>
          </div>

          {/* 5. Observations & Contact */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider pb-1 border-b border-slate-100 text-teal-800">
              5. Email & Observations Administratives
            </h3>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Email professionnel (optionnel)</label>
              <input
                type="email"
                placeholder="nom@hopital.ma"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Notes & Observations de service</label>
              <textarea
                rows={2}
                placeholder="Remarques particulières, compétences spécifiques, antécédents de garde..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none"
              ></textarea>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-lg transition-colors shadow-xs"
            >
              <Save className="w-4 h-4" />
              {isEditing ? 'Enregistrer les Modifications' : 'Créer la Fiche Infirmier'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
