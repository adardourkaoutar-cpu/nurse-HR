import { NurseStaff, DemandeConge } from '../types/nurse';
import { 
  GuardCategory, 
  GuardScheduleRecord, 
  NurseScheduleRow, 
  DayAssignment, 
  ShiftCode, 
  SHIFT_DEFINITIONS 
} from '../types/guardSchedule';
import { getDaysInMonth, getDayOfWeekShort } from './wpsGuardExportImport';

/**
 * Filter nurses by category according to Moroccan hospital rules
 */
export function getNursesByCategory(nurses: NurseStaff[], category: GuardCategory): NurseStaff[] {
  return nurses.filter(n => {
    // Exclude head nurse from standard 12h duty lists
    if (n.fonction === 'Infirmier chef') return false;

    if (category === 'anesth') {
      return n.specialite === 'IAR' || n.fonction === 'Anesthésiste';
    }

    if (category === 'aide_op_panseur') {
      return (
        n.specialite === 'IBO' || 
        n.specialite === 'IP' || 
        n.fonction === 'Aide-opératoire / Panseur' || 
        n.fonction === 'Aide-opératoire' || 
        n.fonction === 'Panseur'
      );
    }

    if (category === 'sterilisation') {
      return n.fonction === 'Stérilisation';
    }

    return false;
  }).sort((a, b) => {
    // Trier du grand au petit (du plus âgé au plus jeune)
    return new Date(a.dateNaissance).getTime() - new Date(b.dateNaissance).getTime();
  });
}

/**
 * Get category human-readable title
 */
export function getCategoryLabel(category: GuardCategory): string {
  switch (category) {
    case 'anesth':
      return 'Anesthésistes (IAR)';
    case 'aide_op_panseur':
      return 'Aide-opératoire / Panseur (IBO & IP)';
    case 'sterilisation':
      return 'Stérilisation Centrale';
    default:
      return 'Personnel du Bloc';
  }
}

/**
 * Get cadre designation strictly according to official template
 */
export function getCadreLabel(category: GuardCategory): string {
  switch (category) {
    case 'anesth':
      return 'Infirmiers en anesthésie-réanimation';
    case 'aide_op_panseur':
      return 'Infirmiers panseurs/aide-opératoire';
    case 'sterilisation':
      return 'Infirmiers en stérilisation';
    default:
      return 'Infirmiers du Bloc opératoire';
  }
}

/**
 * Month names in French
 */
export const MOIS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/**
 * Checks if current date is within the preparation window (25th to 30th/31st of month)
 */
export function checkPreparationWindow(currentDateStr: string = '2026-10-25'): {
  isWindowOpen: boolean;
  dayOfMonth: number;
  message: string;
  recommendedNextMonth: { month: number; year: number; label: string };
} {
  const date = new Date(currentDateStr);
  const day = date.getDate();
  const currentMonth = date.getMonth() + 1; // 1-12
  const currentYear = date.getFullYear();

  // Next month calculation
  let nextMonth = currentMonth + 1;
  let nextYear = currentYear;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const nextMonthLabel = `${MOIS_FR[nextMonth - 1]} ${nextYear}`;

  const isWindowOpen = day >= 25;

  let message = '';
  if (isWindowOpen) {
    message = `Période active de préparation réglementaire (du 25 au 30/31). La liste de garde du mois prochain (${nextMonthLabel}) doit être finalisée maintenant.`;
  } else {
    message = `La préparation officielle s'effectue réglementairement entre le 25 et le 30/31 de chaque mois. (Jour actuel : ${day} ${MOIS_FR[currentMonth - 1]}).`;
  }

  return {
    isWindowOpen,
    dayOfMonth: day,
    message,
    recommendedNextMonth: {
      month: nextMonth,
      year: nextYear,
      label: nextMonthLabel
    }
  };
}

/**
 * Determine locked days for CA and HN for a specific nurse in a given month
 */
export function getPreLockedDaysForNurse(
  nurse: NurseStaff, 
  demandes: DemandeConge[], 
  year: number, 
  month: number
): { caDays: Set<number>; hnDays: Set<number> } {
  const caDays = new Set<number>();
  const hnDays = new Set<number>();
  const daysInMonth = getDaysInMonth(year, month);

  // 1. Check Demandes de Congé Administratif (CA)
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month - 1, daysInMonth);

  demandes.forEach(d => {
    if (d.nurseId === nurse.id && (d.etatDemande === 'Confirmé' || d.typeConge === 'Congé Administratif')) {
      const dep = new Date(d.dateCessation);
      const rep = new Date(d.dateReprisePrevue);

      for (let day = 1; day <= daysInMonth; day++) {
        const cur = new Date(year, month - 1, day);
        if (cur >= dep && cur <= rep) {
          caDays.add(day);
        }
      }
    }
  });

  // 2. Check Horaire Normal (HN) / Système normal
  // From explicit periodeSystemeNormal or situationActuelle
  if (nurse.periodeSystemeNormal?.dateDebut && nurse.periodeSystemeNormal?.dateFin) {
    const hnDeb = new Date(nurse.periodeSystemeNormal.dateDebut);
    const hnFin = new Date(nurse.periodeSystemeNormal.dateFin);

    for (let day = 1; day <= daysInMonth; day++) {
      const cur = new Date(year, month - 1, day);
      if (cur >= hnDeb && cur <= hnFin) {
        // If not already in CA, mark as HN
        if (!caDays.has(day)) {
          hnDays.add(day);
        }
      }
    }
  } else if (nurse.situationActuelle === 'Système normal') {
    // If situation is marked as Système normal without dates, all days not in CA are HN by default
    for (let day = 1; day <= daysInMonth; day++) {
      if (!caDays.has(day)) {
        hnDays.add(day);
      }
    }
  }

  return { caDays, hnDays };
}

/**
 * Initialize a blank GuardScheduleRecord pre-populated with locked CA and HN
 */
export function createInitialGuardRecord(
  category: GuardCategory,
  nurses: NurseStaff[],
  demandes: DemandeConge[],
  year: number,
  month: number
): GuardScheduleRecord {
  const categoryNurses = getNursesByCategory(nurses, category);
  const daysCount = getDaysInMonth(year, month);
  const moisLibelle = `${MOIS_FR[month - 1]} ${year}`;

  const lignes: NurseScheduleRow[] = categoryNurses.map(nurse => {
    const { caDays, hnDays } = getPreLockedDaysForNurse(nurse, demandes, year, month);

    const assignments: Record<number, DayAssignment> = {};
    let totalCA = 0;
    let totalHN = 0;

    for (let d = 1; d <= daysCount; d++) {
      const dow = getDayOfWeekShort(year, month, d);
      const isWeekend = dow === 'Sa' || dow === 'Di';
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      let shift: ShiftCode = '';
      let isLocked = false;
      let lockReason: 'CA' | 'HN' | undefined = undefined;

      if (caDays.has(d)) {
        shift = 'CA';
        isLocked = true;
        lockReason = 'CA';
        totalCA++;
      } else if (hnDays.has(d)) {
        shift = 'HN';
        isLocked = true;
        lockReason = 'HN';
        totalHN++;
      }

      assignments[d] = {
        day: d,
        dateStr,
        dayOfWeek: dow,
        isWeekend,
        shift,
        isLocked,
        lockReason
      };
    }

    return {
      nurseId: nurse.id,
      nom: nurse.nom,
      prenom: nurse.prenom,
      ppr: nurse.ppr,
      specialite: nurse.specialite,
      fonction: nurse.fonction,
      dateNaissance: nurse.dateNaissance,
      assignments,
      totalGJ: 0,
      totalGN: 0,
      totalR: 0,
      totalHN,
      totalCA,
      totalHeuresGarde: 0
    };
  });

  const cadreLibelle = getCadreLabel(category);
  const moisNom = MOIS_FR[month - 1];

  return {
    id: `sched_${category}_${year}_${month}_${Date.now()}`,
    mois: month,
    annee: year,
    moisLibelle,
    moisNom,
    categorie: category,
    categorieLibelle: getCategoryLabel(category),
    cadreLibelle,
    service: 'Bloc opératoire',
    delegation: 'Délégation provinciale de Sidi Ifni',
    etablissement: 'Centre hospitalier provincial Sidi Ifni',
    version: 1,
    titre: `Liste de garde/horaire normal - ${cadreLibelle} - ${moisLibelle}`,
    dateCreation: new Date().toISOString(),
    dateDerniereModification: new Date().toISOString(),
    statut: 'Brouillon',
    creePar: 'Infirmier Chef du Bloc',
    lignes
  };
}

/**
 * Apply the standard Moroccan 12h cycle:
 * Day 1: GJ (12h Jour: 08h-20h)
 * Day 2: GN (12h Nuit: 20h-08h)
 * Day 3: R (Récupération 24h)
 * Day 4: R (Récupération 48h)
 * Skipping/preserving days pre-locked by CA or HN!
 */
export function applyStandardCycle(
  row: NurseScheduleRow, 
  startOffset: number, // 0, 1, 2, 3
  daysCount: number
): NurseScheduleRow {
  const cycle: ShiftCode[] = ['GJ', 'GN', 'R', 'R'];
  const newRow: NurseScheduleRow = JSON.parse(JSON.stringify(row));

  let cycleIdx = startOffset % 4;

  let countGJ = 0;
  let countGN = 0;
  let countR = 0;
  let countHN = 0;
  let countCA = 0;

  for (let d = 1; d <= daysCount; d++) {
    const cur = newRow.assignments[d];
    if (!cur) continue;

    // If pre-locked by CA or HN, keep it intact and do not advance cycle inappropriately
    if (cur.isLocked) {
      if (cur.shift === 'CA') countCA++;
      else if (cur.shift === 'HN') countHN++;
      continue;
    }

    const assignedShift = cycle[cycleIdx];
    cur.shift = assignedShift;

    if (assignedShift === 'GJ') countGJ++;
    else if (assignedShift === 'GN') countGN++;
    else if (assignedShift === 'R') countR++;

    cycleIdx = (cycleIdx + 1) % 4;
  }

  newRow.totalGJ = countGJ;
  newRow.totalGN = countGN;
  newRow.totalR = countR;
  newRow.totalHN = countHN;
  newRow.totalCA = countCA;
  newRow.totalHeuresGarde = (countGJ + countGN) * 12;

  return newRow;
}
