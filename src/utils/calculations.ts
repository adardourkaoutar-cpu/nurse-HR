import { NurseStaff, DemandeConge, ReminderItem } from '../types/nurse';
import { calculateWorkingDays } from './moroccanHolidays';

/**
 * Calcule l'ancienneté en années et mois à partir de la date de recrutement.
 */
export function calculateAnciennete(dateRecrutement: string, dateReference: Date = new Date()): { annees: number; mois: number; texte: string } {
  if (!dateRecrutement) return { annees: 0, mois: 0, texte: 'Non renseignée' };
  
  const debut = new Date(dateRecrutement);
  if (isNaN(debut.getTime())) return { annees: 0, mois: 0, texte: 'Date invalide' };

  let annees = dateReference.getFullYear() - debut.getFullYear();
  let mois = dateReference.getMonth() - debut.getMonth();

  if (dateReference.getDate() < debut.getDate()) {
    mois--;
  }
  if (mois < 0) {
    annees--;
    mois += 12;
  }
  if (annees < 0) {
    return { annees: 0, mois: 0, texte: '0 mois' };
  }

  const texte = annees > 0 
    ? `${annees} an${annees > 1 ? 's' : ''}${mois > 0 ? ` et ${mois} mois` : ''}` 
    : `${mois} mois`;

  return { annees, mois, texte };
}

/**
 * Calcule l'âge d'un agent à partir de sa date de naissance.
 */
export function calculateAge(dateNaissance: string, dateReference: Date = new Date()): number | null {
  if (!dateNaissance) return null;
  const naissance = new Date(dateNaissance);
  if (isNaN(naissance.getTime())) return null;

  let age = dateReference.getFullYear() - naissance.getFullYear();
  const m = dateReference.getMonth() - naissance.getMonth();
  if (m < 0 || (m === 0 && dateReference.getDate() < naissance.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

/**
 * Normalise la fonction dans le bloc en combinant Aide-opératoire et Panseur
 * dans la même catégorie unifiée "Aide-opératoire / Panseur".
 */
export function formatFonction(fonction: string): string {
  if (!fonction) return 'Aide-opératoire / Panseur';
  if (fonction === 'Aide-opératoire' || fonction === 'Panseur' || fonction === 'Aide-opératoire / Panseur') {
    return 'Aide-opératoire / Panseur';
  }
  return fonction;
}

/**
 * Calcule le solde des congés administratifs.
 * Limite de 22 jours ouvrables par an + reliquat de l'année précédente.
 */
export function getSoldeCongeAdmin(nurse: NurseStaff): {
  droitAnnuel: number;
  reporte: number;
  totalAcquis: number;
  consomme: number;
  restant: number;
  pourcentageUtilise: number;
} {
  const droitAnnuel = nurse.congeAdmin?.limiteAnnuelle ?? 22;
  const reporte = nurse.congeAdmin?.joursReportes ?? 0;
  const consomme = nurse.congeAdmin?.joursConsommes ?? 0;
  const totalAcquis = droitAnnuel + reporte;
  const restant = Math.max(0, totalAcquis - consomme);
  const pourcentageUtilise = totalAcquis > 0 ? Math.min(100, Math.round((consomme / totalAcquis) * 100)) : 0;

  return {
    droitAnnuel,
    reporte,
    totalAcquis,
    consomme,
    restant,
    pourcentageUtilise
  };
}

/**
 * Calcule le solde des congés de maladie.
 * Limite de 3 mois (90 jours) à plein traitement par an.
 */
export function getSoldeCongeMaladie(nurse: NurseStaff): {
  limiteJours: number;
  consomme: number;
  restant: number;
  pourcentageUtilise: number;
} {
  const limiteJours = (nurse.congeMaladie?.limiteAnnuelleMois ?? 3) * 30; // 90 jours
  const consomme = nurse.congeMaladie?.joursConsommes ?? 0;
  const restant = Math.max(0, limiteJours - consomme);
  const pourcentageUtilise = Math.min(100, Math.round((consomme / limiteJours) * 100));

  return {
    limiteJours,
    consomme,
    restant,
    pourcentageUtilise
  };
}

/**
 * Calcule la durée d'un congé selon son type :
 * - Congé Administratif : Jours ouvrables stricts (sans samedis, dimanches ni jours fériés marocains)
 * - Congé de Maternité : 90 jours calendaires statutaires
 * - Autres congés (Maladie, etc.) : Jours calendaires inclusifs
 */
export function calculateLeaveDays(typeConge: string, startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  
  if (typeConge === 'Congé Administratif') {
    return calculateWorkingDays(startDate, endDate);
  }
  
  if (typeConge.includes('Maternité')) {
    const diff = calculateDaysBetween(startDate, endDate);
    return diff > 0 ? diff : 90;
  }

  return calculateDaysBetween(startDate, endDate);
}

/**
 * Calcule la différence en jours entre deux dates (format YYYY-MM-DD).
 */
export function calculateDaysBetween(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const d1 = new Date(startDate);
  const d2 = new Date(endDate);
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusif
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Formate une date en français (ex: 15/04/2026 ou 15 Avril 2026).
 */
export function formatDateFr(dateString: string, style: 'court' | 'long' = 'court'): string {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const date = new Date(year, month, day);

  if (isNaN(date.getTime())) return dateString;

  if (style === 'long') {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Analyse l'ensemble des infirmiers et des demandes pour détecter les alertes et rappels de dates.
 */
export function generateReminders(nurses: NurseStaff[], demandes: DemandeConge[], referenceDateStr?: string): ReminderItem[] {
  const today = referenceDateStr ? new Date(referenceDateStr) : new Date();
  today.setHours(0, 0, 0, 0);

  const reminders: ReminderItem[] = [];

  demandes.forEach(demande => {
    const nurse = nurses.find(n => n.id === demande.nurseId);
    if (!nurse) return;

    const nomComplet = `${nurse.nom} ${nurse.prenom}`;

    // 1. Reprise de service imminente ou en retard (pour demandes confirmées sans date de reprise effective)
    if (demande.etatDemande === 'Confirmé' && !demande.dateRepriseEffective && demande.dateReprisePrevue) {
      const repriseDate = new Date(demande.dateReprisePrevue);
      repriseDate.setHours(0, 0, 0, 0);

      const diffDays = Math.round((repriseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        // En retard !
        reminders.push({
          id: `retard-reprise-${demande.id}`,
          type: 'reprise_retard',
          niveau: 'urgent',
          titre: `Retard de reprise de service (${Math.abs(diffDays)}j)`,
          message: `${nomComplet} (${nurse.specialite}) devait reprendre le ${formatDateFr(demande.dateReprisePrevue)}. Reprise non confirmée.`,
          nurseId: nurse.id,
          demandeId: demande.id,
          dateCible: demande.dateReprisePrevue,
          actionPossible: 'confirmer_reprise'
        });
      } else if (diffDays === 0) {
        reminders.push({
          id: `reprise-today-${demande.id}`,
          type: 'reprise_imminente',
          niveau: 'urgent',
          titre: `Reprise de service AUJOURD'HUI`,
          message: `${nomComplet} (${nurse.specialite}) reprend ses fonctions au bloc opératoire ce jour.`,
          nurseId: nurse.id,
          demandeId: demande.id,
          dateCible: demande.dateReprisePrevue,
          actionPossible: 'confirmer_reprise'
        });
      } else if (diffDays <= 3) {
        reminders.push({
          id: `reprise-soon-${demande.id}`,
          type: 'reprise_imminente',
          niveau: 'attention',
          titre: `Reprise dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`,
          message: `Reprise de poste prévue le ${formatDateFr(demande.dateReprisePrevue)} pour ${nomComplet}. Prévoir affectation salle d'opération.`,
          nurseId: nurse.id,
          demandeId: demande.id,
          dateCible: demande.dateReprisePrevue,
          actionPossible: 'voir_agent'
        });
      }
    }

    // 2. Cessation de service imminente (départ en congé)
    if (demande.etatDemande === 'Confirmé' && demande.dateCessation) {
      const cessationDate = new Date(demande.dateCessation);
      cessationDate.setHours(0, 0, 0, 0);

      const diffDays = Math.round((cessationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= 4) {
        reminders.push({
          id: `cessation-soon-${demande.id}`,
          type: 'cessation_imminente',
          niveau: diffDays <= 1 ? 'urgent' : 'attention',
          titre: diffDays === 0 ? `Cessation de service AUJOURD'HUI` : `Départ en congé dans ${diffDays}j`,
          message: `${nomComplet} (${demande.typeConge}, ${demande.nombreJours} jours). Cessation le ${formatDateFr(demande.dateCessation)}.`,
          nurseId: nurse.id,
          demandeId: demande.id,
          dateCible: demande.dateCessation,
          actionPossible: 'voir_agent'
        });
      }
    }

    // 3. Décision administrative manquante pour un départ prochain
    if (demande.etatDemande === 'Confirmé' && demande.decisionRecue !== 'Reçue et visée') {
      const cessationDate = new Date(demande.dateCessation);
      cessationDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((cessationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 7 && diffDays >= -5) {
        reminders.push({
          id: `decision-missing-${demande.id}`,
          type: 'decision_manquante',
          niveau: 'attention',
          titre: `Décision administrative non enregistrée`,
          message: `La décision officielle pour le congé de ${nomComplet} (Cessation: ${formatDateFr(demande.dateCessation)}) est en statut "${demande.decisionRecue}".`,
          nurseId: nurse.id,
          demandeId: demande.id,
          dateCible: demande.dateCessation,
          actionPossible: 'marquer_decision'
        });
      }
    }
    // 4. Demandes prévisionnelles du mois en cours à confirmer ou annuler
    if (demande.statutPrevisionnel === 'prevu_a_confirmer') {
      reminders.push({
        id: `prev-confirm-${demande.id}`,
        type: 'reprise_imminente',
        niveau: 'attention',
        titre: `Début de mois : Demande prévisionnelle à confirmer`,
        message: `${nomComplet} a un congé prévisionnel (${demande.typeConge}, ${demande.nombreJours}j) prévu le ${formatDateFr(demande.dateCessation)}. Confirmer ou annuler la demande initiale.`,
        nurseId: nurse.id,
        demandeId: demande.id,
        dateCible: demande.dateCessation,
        actionPossible: 'confirmer_demande_debut_mois'
      });
    }
  });

  // 5. Alertes sur les soldes critiques et maternité des infirmiers
  nurses.forEach(nurse => {
    const admin = getSoldeCongeAdmin(nurse);
    const maladie = getSoldeCongeMaladie(nurse);

    // Congé Maternité programmé
    if (nurse.sexe === 'Femme' && nurse.etatMarital === 'Marié(e)' && nurse.enceinte && nurse.congeMaternite?.dateCessation) {
      const cessationMat = new Date(nurse.congeMaternite.dateCessation);
      cessationMat.setHours(0, 0, 0, 0);
      const diffMat = Math.round((cessationMat.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffMat >= 0 && diffMat <= 15) {
        reminders.push({
          id: `maternite-bientot-${nurse.id}`,
          type: 'maternite_imminente',
          niveau: diffMat <= 3 ? 'urgent' : 'attention',
          titre: `Congé de maternité imminent (90 jours)`,
          message: `${nurse.nom} ${nurse.prenom} débutera son congé de maternité le ${formatDateFr(nurse.congeMaternite.dateCessation)} (reprise prévue le ${formatDateFr(nurse.congeMaternite.dateReprise)}).`,
          nurseId: nurse.id,
          dateCible: nurse.congeMaternite.dateCessation,
          actionPossible: 'voir_agent'
        });
      }
    }

    // Reliquat élevé non consommé
    if (admin.reporte >= 15) {
      reminders.push({
        id: `reliquat-eleve-${nurse.id}`,
        type: 'reliquat_eleve',
        niveau: 'info',
        titre: `Reliquat important (${admin.reporte} jours)`,
        message: `${nurse.nom} ${nurse.prenom} a un reliquat reporté de ${admin.reporte} jours. À planifier pour éviter la forclusion.`,
        nurseId: nurse.id,
        dateCible: today.toISOString().split('T')[0],
        actionPossible: 'voir_agent'
      });
    }

    // Maladie proche du seuil des 3 mois (90 jours)
    if (maladie.consomme >= 60) {
      reminders.push({
        id: `maladie-critique-${nurse.id}`,
        type: 'maladie_limite',
        niveau: maladie.consomme >= 75 ? 'urgent' : 'attention',
        titre: `Seuil congé de maladie (${maladie.consomme}/90 jours consommés)`,
        message: `${nurse.nom} ${nurse.prenom} a consommé ${maladie.consomme} jours sur les 90 jours annuels autorisés (${maladie.restant}j restants).`,
        nurseId: nurse.id,
        dateCible: today.toISOString().split('T')[0],
        actionPossible: 'voir_agent'
      });
    }
  });

  return reminders;
}
