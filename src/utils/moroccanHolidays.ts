export interface MoroccanHoliday {
  date: string; // YYYY-MM-DD
  nom: string;
  type: 'national' | 'religieux';
  description: string;
}

/**
 * Calendrier officiel des jours fériés au Maroc.
 * Comprend les fêtes nationales à date fixe (solaire) et les fêtes religieuses (calendrier hégirien)
 * calculées et observées pour les années 2025, 2026 et 2027.
 */
export const MOROCCAN_HOLIDAYS_MAP: Record<string, string> = {
  // --- Année 2025 ---
  '2025-01-01': "Jour de l'An",
  '2025-01-11': "Manifeste de l'Indépendance",
  '2025-01-14': "Nouvel An Amazigh (Yennayer)",
  '2025-03-31': "Aïd Al-Fitr (1er jour)",
  '2025-04-01': "Aïd Al-Fitr (2ème jour)",
  '2025-05-01': "Fête du Travail",
  '2025-06-07': "Aïd Al-Adha (1er jour)",
  '2025-06-08': "Aïd Al-Adha (2ème jour)",
  '2025-06-27': "1er Moharram (Nouvel An Hégirien)",
  '2025-07-30': "Fête du Trône",
  '2025-08-14': "Allégeance Oued Eddahab",
  '2025-08-20': "Révolution du Roi et du Peuple",
  '2025-08-21': "Fête de la Jeunesse",
  '2025-09-05': "Aïd Al Mawlid Annabawi (1er jour)",
  '2025-09-06': "Aïd Al Mawlid Annabawi (2ème jour)",
  '2025-11-06': "Anniversaire de la Marche Verte",
  '2025-11-18': "Fête de l'Indépendance",

  // --- Année 2026 ---
  '2026-01-01': "Jour de l'An",
  '2026-01-11': "Manifeste de l'Indépendance",
  '2026-01-14': "Nouvel An Amazigh (Yennayer)",
  '2026-03-20': "Aïd Al-Fitr (1er jour)",
  '2026-03-21': "Aïd Al-Fitr (2ème jour)",
  '2026-05-01': "Fête du Travail",
  '2026-05-27': "Aïd Al-Adha (1er jour)",
  '2026-05-28': "Aïd Al-Adha (2ème jour)",
  '2026-06-16': "1er Moharram (Nouvel An Hégirien 1448)",
  '2026-07-30': "Fête du Trône",
  '2026-08-14': "Allégeance Oued Eddahab",
  '2026-08-20': "Révolution du Roi et du Peuple",
  '2026-08-21': "Fête de la Jeunesse",
  '2026-08-26': "Aïd Al Mawlid Annabawi (1er jour)",
  '2026-08-27': "Aïd Al Mawlid Annabawi (2ème jour)",
  '2026-11-06': "Anniversaire de la Marche Verte",
  '2026-11-18': "Fête de l'Indépendance",

  // --- Année 2027 ---
  '2027-01-01': "Jour de l'An",
  '2027-01-11': "Manifeste de l'Indépendance",
  '2027-01-14': "Nouvel An Amazigh (Yennayer)",
  '2027-03-10': "Aïd Al-Fitr (1er jour)",
  '2027-03-11': "Aïd Al-Fitr (2ème jour)",
  '2027-05-01': "Fête du Travail",
  '2027-05-16': "Aïd Al-Adha (1er jour)",
  '2027-05-17': "Aïd Al-Adha (2ème jour)",
  '2027-06-06': "1er Moharram (Nouvel An Hégirien 1449)",
  '2027-07-30': "Fête du Trône",
  '2027-08-14': "Allégeance Oued Eddahab",
  '2027-08-15': "Aïd Al Mawlid Annabawi (1er jour)",
  '2027-08-16': "Aïd Al Mawlid Annabawi (2ème jour)",
  '2027-08-20': "Révolution du Roi et du Peuple",
  '2027-08-21': "Fête de la Jeunesse",
  '2027-11-06': "Anniversaire de la Marche Verte",
  '2027-11-18': "Fête de l'Indépendance",
};

/**
 * Vérifie si une date donnée est un jour férié officiel au Maroc.
 */
export function isMoroccanHoliday(date: Date | string): { isHoliday: boolean; name?: string } {
  const dateStr = typeof date === 'string' 
    ? date.split('T')[0] 
    : date.toISOString().split('T')[0];

  const name = MOROCCAN_HOLIDAYS_MAP[dateStr];
  return {
    isHoliday: !!name,
    name
  };
}

/**
 * Retourne la liste des jours fériés pour un mois et une année donnés.
 * @param year Année (ex: 2026)
 * @param month Mois (1 = Janvier, 12 = Décembre)
 */
export function getMoroccanHolidaysForMonth(year: number, month: number): MoroccanHoliday[] {
  const monthStr = month < 10 ? `0${month}` : `${month}`;
  const prefix = `${year}-${monthStr}`;

  return Object.entries(MOROCCAN_HOLIDAYS_MAP)
    .filter(([date]) => date.startsWith(prefix))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, nom]) => ({
      date,
      nom,
      type: nom.includes('Aïd') || nom.includes('Moharram') ? 'religieux' : 'national',
      description: nom.includes('Aïd') || nom.includes('Moharram') 
        ? 'Fête religieuse musulmane (2 jours fériés)' 
        : 'Fête nationale civile officielle'
    }));
}

/**
 * Retourne la liste de tous les jours fériés de l'année au Maroc regroupés par mois.
 */
export function getMoroccanHolidaysForYear(year: number): { mois: number; nomMois: string; feries: MoroccanHoliday[] }[] {
  const nomsMois = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  return nomsMois.map((nomMois, index) => {
    const mois = index + 1;
    return {
      mois,
      nomMois,
      feries: getMoroccanHolidaysForMonth(year, mois)
    };
  });
}

/**
 * Calcule le nombre exact de jours ouvrables entre deux dates.
 * En excluant strictement :
 * 1. Les samedis et dimanches (week-ends)
 * 2. Les jours fériés officiels au Maroc
 * 
 * Cette fonction respecte la règle statutaire :
 * "le congé administratif est de 22 jours par an sans compter les jours fériés et les week-ends (samedi et dimanche)"
 */
export function calculateWorkingDays(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 0;
  
  const startParts = startDateStr.split('-').map(Number);
  const endParts = endDateStr.split('-').map(Number);
  
  const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
  const end = new Date(endParts[0], endParts[1] - 1, endParts[2]);

  if (start > end) return 0;

  let workingDays = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0 = Dimanche, 6 = Samedi
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (!isWeekend) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const currentStr = `${year}-${month}-${day}`;

      const holiday = isMoroccanHoliday(currentStr);
      if (!holiday.isHoliday) {
        workingDays++;
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return workingDays;
}
