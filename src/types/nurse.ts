export type Specialite = 
  | 'IAR' 
  | 'IP' 
  | 'ISM' 
  | 'IBO';

export type Fonction = 
  | 'Infirmier chef'
  | 'Anesthésiste' 
  | 'Aide-opératoire / Panseur'
  | 'Stérilisation'
  | 'Aide-opératoire' 
  | 'Panseur';

export type Sexe = 'Femme' | 'Homme';

export type EtatMarital = 'Célibataire' | 'Marié(e)' | 'Divorcé(e)' | 'Veuf(ve)';

export type Grade = 
  | 'Grade 1' 
  | 'Grade 2' 
  | 'Grade principal' 
  | 'Grade exceptionnel';

export type EtatFonctionPublique = 
  | 'Fonctionnaire Titulaire' 
  | 'Stagiaire' 
  | 'Mis en Disponibilité' 
  | 'Sous le Drapeau' 
  | 'Contractuel';

export type SituationActuelle = 
  | 'Système normal' 
  | 'Système de garde' 
  | 'Congé administratif' 
  | 'Congé de maladie' 
  | 'Congé de maternité'
  | 'Congé exceptionnel' 
  | 'Mis en disponibilité' 
  | 'Sous drapeau';

export interface CongeAdminData {
  limiteAnnuelle: number; // 22 jours ouvrables (hors week-ends et jours fériés)
  joursReportes: number; // Reliquat de l'année précédente reporté sur la nouvelle année
  joursConsommes: number;
}

export interface CongeMaladieData {
  limiteAnnuelleMois: number; // 3 mois (90 jours)
  joursConsommes: number;
}

export interface CongeMaterniteData {
  dateCessation: string;
  dateReprise: string;
  dureeJours: 90; // Fixé statutairement à 90 jours
  actif: boolean;
}

export interface NurseStaff {
  id: string;
  nom: string;
  prenom: string;
  sexe: Sexe; // Femme / Homme
  ppr: string; // Numéro de Poste Budgétaire / Matricule financier
  cni: string; // Numéro de Carte Nationale d'Identité
  specialite: Specialite;
  fonction: Fonction;
  dateNaissance: string; // YYYY-MM-DD
  lieuNaissance: string;
  etatMarital: EtatMarital;
  enceinte?: boolean; // Condition: si Femme + Mariée
  congeMaternite?: CongeMaterniteData; // Si enceinte (90 jours)
  nombreEnfants: number;
  grade: Grade; // Grade 1, Grade 2, Grade principal, Grade exceptionnel
  dateRecrutement: string; // YYYY-MM-DD
  etatFonctionPublique: EtatFonctionPublique;
  lieuResidence: string;
  navette: boolean; // Faisant la navette ou non
  trajetNavette?: string; // Ex: Rabat - Casablanca
  congeAdmin: CongeAdminData;
  congeMaladie: CongeMaladieData;
  situationActuelle: SituationActuelle;
  email?: string;
  notes?: string;
}

export type TypeConge = 
  | 'Congé Administratif' 
  | 'Congé de Maladie' 
  | 'Congé de Maternité (90 jours)'
  | 'Congé Exceptionnel' 
  | 'Maternité / Paternité' 
  | 'Pèlerinage' 
  | 'Mariage / Événement Familial';

export type EtatDemande = 'En attente' | 'Confirmé' | 'Refusé';

export type StatutDecision = 'Non reçue' | 'En cours de visa' | 'Reçue et visée';

export interface DemandeConge {
  id: string;
  nurseId: string;
  typeConge: TypeConge;
  dateDemande: string; // YYYY-MM-DD
  dateCessation: string; // Date de départ effectif / cessation
  dateReprisePrevue: string; // Date de reprise prévue
  dateRepriseEffective?: string; // Date réelle de reprise constatée
  nombreJours: number; // Jours ouvrables pour admin (hors WE et fériés), ou jours civils pour maladie/maternité
  etatDemande: EtatDemande;
  decisionRecue: StatutDecision;
  numeroDecision?: string; // Ex: "DEC-BO-2026/089"
  remplacantId?: string;
  motif?: string;
  observations?: string;
  estMaladieDirecte?: boolean; // Saisie directe sans passage hiérarchique
  statutPrevisionnel?: 'prevu_a_confirmer' | 'confirme_debut_mois' | 'annule'; // Pour planning annuel prévisionnel
  moisPrevu?: string; // Ex: "2026-11"
}

export interface ReminderItem {
  id: string;
  type: 'reprise_imminente' | 'reprise_retard' | 'cessation_imminente' | 'decision_manquante' | 'reliquat_eleve' | 'maladie_limite' | 'maternite_imminente';
  niveau: 'urgent' | 'attention' | 'info';
  titre: string;
  message: string;
  nurseId: string;
  demandeId?: string;
  dateCible: string;
  actionPossible?: 'confirmer_reprise' | 'marquer_decision' | 'voir_agent' | 'confirmer_demande_debut_mois';
}
