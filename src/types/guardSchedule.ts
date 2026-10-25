export type GuardCategory = 'anesth' | 'aide_op_panseur' | 'sterilisation';

export type ShiftCode = 'GJ' | 'GN' | 'R' | 'HN' | 'CA' | '';

export interface ShiftDefinition {
  code: ShiftCode;
  label: string;
  description: string;
  heures: number;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}

export const SHIFT_DEFINITIONS: Record<ShiftCode, ShiftDefinition> = {
  GJ: {
    code: 'GJ',
    label: 'Garde de Jour',
    description: 'Service de garde 12 heures (08h00 - 20h00)',
    heures: 12,
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    borderColor: 'border-amber-300'
  },
  GN: {
    code: 'GN',
    label: 'Garde de Nuit',
    description: 'Service de garde 12 heures (20h00 - 08h00 le lendemain)',
    heures: 12,
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-900',
    borderColor: 'border-indigo-300'
  },
  R: {
    code: 'R',
    label: 'Récupération (48h)',
    description: 'Repos compensateur réglementaire post-garde',
    heures: 0,
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-900',
    borderColor: 'border-emerald-300'
  },
  HN: {
    code: 'HN',
    label: 'Horaire Normal',
    description: 'Programme opératoire réglé (08h00 - 16h30)',
    heures: 8,
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-900',
    borderColor: 'border-sky-300'
  },
  CA: {
    code: 'CA',
    label: 'Congé Administratif',
    description: 'Congé statutaire approuvé',
    heures: 0,
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-900',
    borderColor: 'border-rose-300'
  },
  '': {
    code: '',
    label: 'Non affecté',
    description: 'Aucune affectation définie',
    heures: 0,
    badgeBg: 'bg-slate-50',
    badgeText: 'text-slate-400',
    borderColor: 'border-slate-200'
  }
};

export interface NursePreLockedPeriod {
  nurseId: string;
  nomComplet: string;
  ppr: string;
  specialite: string;
  fonction: string;
  // Plages verrouillées
  caDates: string[]; // ['2026-11-03', '2026-11-04', ...]
  hnDates: string[]; // ['2026-11-01', '2026-11-02', ...]
  isHNWholeMonth?: boolean;
}

export interface DayAssignment {
  day: number; // 1 to 31
  dateStr: string; // YYYY-MM-DD
  dayOfWeek: string; // Lu, Ma, Me, Je, Ve, Sa, Di
  isWeekend: boolean;
  shift: ShiftCode;
  isLocked?: boolean; // True if locked by CA or predefined HN
  lockReason?: 'CA' | 'HN';
  note?: string;
}

export interface NurseScheduleRow {
  nurseId: string;
  nom: string;
  prenom: string;
  ppr: string;
  specialite: string;
  fonction: string;
  dateNaissance: string;
  assignments: Record<number, DayAssignment>; // key: day number (1..31)
  totalGJ: number;
  totalGN: number;
  totalR: number;
  totalHN: number;
  totalCA: number;
  totalHeuresGarde: number;
}

export interface GuardScheduleRecord {
  id: string;
  mois: number; // 1-12 (ex: 11)
  annee: number; // ex: 2026
  moisLibelle: string; // "Novembre 2026"
  moisNom: string; // "Novembre" or "Octobre"
  categorie: GuardCategory;
  categorieLibelle: string; // "Anesthésistes" | "Aide-Opératoire & Panseurs" | "Stérilisation"
  cadreLibelle: string; // "Infirmiers en anesthésie-réanimation" | "Infirmiers panseurs/aide-opératoire" | "Infirmiers en stérilisation"
  service: string; // "Bloc opératoire"
  delegation: string; // "Délégation provinciale de Sidi Ifni"
  etablissement: string; // "Centre hospitalier provincial Sidi Ifni"
  version: number; // 1, 2, 3...
  titre: string;
  dateCreation: string; // ISO
  dateDerniereModification: string; // ISO
  statut: 'Brouillon' | 'Validé' | 'Rectifié en cours de mois';
  rectificationNotes?: string;
  creePar: string;
  lignes: NurseScheduleRow[];
}
