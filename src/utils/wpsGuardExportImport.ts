import * as XLSX from 'xlsx';
import { 
  GuardCategory, 
  GuardScheduleRecord, 
  NurseScheduleRow, 
  ShiftCode, 
  DayAssignment 
} from '../types/guardSchedule';

/**
 * Returns days in a given month (e.g. 30 for November, 31 for October/December)
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Get short french day of week for a given day
 */
export function getDayOfWeekShort(year: number, month: number, day: number): string {
  const date = new Date(year, month - 1, day);
  const days = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];
  return days[date.getDay()];
}

/**
 * Export a GuardScheduleRecord to an authentic .xlsx workbook tailored for WPS Office
 */
export function exportGuardScheduleToWPS(record: GuardScheduleRecord): void {
  const wb = XLSX.utils.book_new();
  const daysCount = getDaysInMonth(record.annee, record.mois);

  // Build the 2D sheet data
  const data: any[][] = [];

  // Header Titles
  data.push(['ROYAUME DU MAROC']);
  data.push(['MINISTÈRE DE LA SANTÉ ET DE LA PROTECTION SOCIALE']);
  data.push(['SERVICE DU BLOC OPÉRATOIRE - TABLEAU MENSUEL DE GARDE ET SYSTÈME NORMAL']);
  data.push([
    `PÉRIODE : ${record.moisLibelle.toUpperCase()} (${record.mois}/${record.annee})`,
    '',
    `CATÉGORIE : ${record.categorieLibelle.toUpperCase()}`,
    '',
    `VERSION : V${record.version} (${record.statut})`
  ]);
  data.push([
    'RÈGLE DU CYCLE : Garde de Jour (GJ 12h) -> Garde de Nuit (GN 12h le lendemain) -> Récupération (R 48h) | HN: Horaire Normal | CA: Congé'
  ]);
  data.push([]); // blank line

  // Table Column Headers
  const headerRow: string[] = ['N°', 'Nom & Prénom', 'PPR', 'Spécialité', 'Fonction'];
  for (let d = 1; d <= daysCount; d++) {
    const dow = getDayOfWeekShort(record.annee, record.mois, d);
    headerRow.push(`${d} (${dow})`);
  }
  headerRow.push('Total GJ', 'Total GN', 'Total R', 'Total HN', 'Total CA', 'Total H Garde');
  data.push(headerRow);

  // Data rows for nurses
  record.lignes.forEach((ligne, index) => {
    const row: any[] = [
      index + 1,
      `${ligne.nom.toUpperCase()} ${ligne.prenom}`,
      ligne.ppr,
      ligne.specialite,
      ligne.fonction
    ];

    let countGJ = 0;
    let countGN = 0;
    let countR = 0;
    let countHN = 0;
    let countCA = 0;

    for (let d = 1; d <= daysCount; d++) {
      const assignment = ligne.assignments[d];
      const shift = assignment ? assignment.shift : '';
      row.push(shift);

      if (shift === 'GJ') countGJ++;
      else if (shift === 'GN') countGN++;
      else if (shift === 'R') countR++;
      else if (shift === 'HN') countHN++;
      else if (shift === 'CA') countCA++;
    }

    const totalHeures = (countGJ + countGN) * 12;

    row.push(countGJ, countGN, countR, countHN, countCA, `${totalHeures}h`);
    data.push(row);
  });

  // Daily Totals Row for quick coverage audit in WPS Office
  data.push([]);
  const totalGJRow: any[] = ['', 'TOTAL GARDES DE JOUR (GJ)', '', '', ''];
  const totalGNRow: any[] = ['', 'TOTAL GARDES DE NUIT (GN)', '', '', ''];

  for (let d = 1; d <= daysCount; d++) {
    let dayGJ = 0;
    let dayGN = 0;
    record.lignes.forEach(l => {
      const s = l.assignments[d]?.shift;
      if (s === 'GJ') dayGJ++;
      if (s === 'GN') dayGN++;
    });
    totalGJRow.push(dayGJ);
    totalGNRow.push(dayGN);
  }
  data.push(totalGJRow);
  data.push(totalGNRow);

  // Instructions & Legend for WPS user
  data.push([]);
  data.push(['GUIDE D\'UTILISATION DANS WPS OFFICE :']);
  data.push(['1. Respectez les abréviations : GJ (Garde Jour 12h), GN (Garde Nuit 12h), R (Récupération 48h), HN (Horaire normal), CA (Congé)']);
  data.push(['2. Ne modifiez pas la colonne PPR afin de garantir la correspondance exacte lors de la ré-importation dans BlocRH']);
  data.push(['3. Après saisie ou rectification dans WPS Office, sauvegardez le fichier puis importez-le dans l\'application']);
  data.push(['4. Visa du Médecin Chef de Service et de l\'Infirmier Chef du Bloc Opératoire']);

  // Create sheet
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column width formatting for comfortable reading in WPS Office
  const colWidths: any[] = [
    { wch: 5 },   // N°
    { wch: 26 },  // Nom
    { wch: 12 },  // PPR
    { wch: 10 },  // Spe
    { wch: 22 },  // Fonction
  ];
  for (let d = 1; d <= daysCount; d++) {
    colWidths.push({ wch: 6 });
  }
  colWidths.push({ wch: 9 }, { wch: 9 }, { wch: 8 }, { wch: 9 }, { wch: 9 }, { wch: 12 });
  ws['!cols'] = colWidths;

  const sheetName = record.categorie === 'anesth' 
    ? 'Garde Anesthésie' 
    : record.categorie === 'aide_op_panseur' 
      ? 'Garde Aide-Op Panseur' 
      : 'Garde Stérilisation';

  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Sanitize filename for download
  const cleanMois = record.moisLibelle.replace(/\s+/g, '_');
  const fileName = `Tableau_Garde_WPS_${record.categorie}_${cleanMois}_v${record.version}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

/**
 * Parses an uploaded file (XLSX, XLS, CSV) edited in WPS Office
 * and returns the updated NurseScheduleRow[] array
 */
export async function parseWPSOfficeFile(
  file: File, 
  currentRecord: GuardScheduleRecord
): Promise<{ success: boolean; updatedLignes?: NurseScheduleRow[]; error?: string; changedCount?: number }> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) {
          resolve({ success: false, error: 'Impossible de lire le fichier.' });
          return;
        }

        const wb = XLSX.read(buffer, { type: 'binary' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        if (!ws) {
          resolve({ success: false, error: 'Feuille de calcul introuvable dans le fichier.' });
          return;
        }

        const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (!rawRows || rawRows.length < 5) {
          resolve({ success: false, error: 'Format de fichier non reconnu. Veuillez utiliser le modèle téléchargé depuis BlocRH.' });
          return;
        }

        // Find header row containing PPR or N° and days
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(rawRows.length, 12); i++) {
          const rowStr = (rawRows[i] || []).map(cell => String(cell || '').toLowerCase()).join(' ');
          if (rowStr.includes('ppr') || (rowStr.includes('nom') && (rowStr.includes('1') || rowStr.includes('spécialité')))) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx === -1) {
          resolve({ success: false, error: 'Ligne d\'en-tête (Nom, PPR, Jours) introuvable dans le tableau WPS.' });
          return;
        }

        const headerRow = rawRows[headerRowIdx];
        const daysCount = getDaysInMonth(currentRecord.annee, currentRecord.mois);

        // Find columns indices
        let pprColIdx = -1;
        let nomColIdx = -1;
        const dayColIndices: Record<number, number> = {};

        headerRow.forEach((cell, idx) => {
          const cellStr = String(cell || '').trim().toLowerCase();
          if (cellStr === 'ppr' || cellStr.includes('ppr')) {
            pprColIdx = idx;
          }
          if (cellStr.includes('nom') && !cellStr.includes('jour')) {
            nomColIdx = idx;
          }

          // Check for day columns (e.g. "1", "1 (Lu)", "01", etc.)
          const match = cellStr.match(/^(\d{1,2})/);
          if (match) {
            const dayNum = parseInt(match[1], 10);
            if (dayNum >= 1 && dayNum <= daysCount) {
              dayColIndices[dayNum] = idx;
            }
          }
        });

        if (pprColIdx === -1 && nomColIdx === -1) {
          resolve({ success: false, error: 'Colonnes d\'identification (PPR ou Nom) absentes.' });
          return;
        }

        // Copy current lines to modify
        const newLignes: NurseScheduleRow[] = JSON.parse(JSON.stringify(currentRecord.lignes));
        let changedCount = 0;

        // Process data rows
        for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || row.length === 0) continue;

          const rowPPR = pprColIdx !== -1 ? String(row[pprColIdx] || '').trim() : '';
          const rowNom = nomColIdx !== -1 ? String(row[nomColIdx] || '').trim().toLowerCase() : '';

          if (!rowPPR && !rowNom) continue;
          if (rowNom.includes('total') || rowNom.includes('guide')) continue;

          // Find corresponding nurse in newLignes
          const nurseRow = newLignes.find(nl => {
            if (rowPPR && nl.ppr && nl.ppr.trim() === rowPPR) return true;
            if (rowNom && `${nl.nom} ${nl.prenom}`.toLowerCase().includes(rowNom)) return true;
            return false;
          });

          if (!nurseRow) continue;

          // Update assignments for days
          for (let d = 1; d <= daysCount; d++) {
            const colIdx = dayColIndices[d];
            if (colIdx !== undefined && colIdx < row.length) {
              const rawVal = String(row[colIdx] || '').trim().toUpperCase();
              let code: ShiftCode = '';

              if (rawVal === 'GJ' || rawVal === 'JOUR' || rawVal === 'J') code = 'GJ';
              else if (rawVal === 'GN' || rawVal === 'NUIT' || rawVal === 'N') code = 'GN';
              else if (rawVal === 'R' || rawVal === 'RECUP' || rawVal === 'REPOS') code = 'R';
              else if (rawVal === 'HN' || rawVal === 'NORMAL') code = 'HN';
              else if (rawVal === 'CA' || rawVal === 'CONGE') code = 'CA';

              // Update if changed
              const existing = nurseRow.assignments[d];
              if (existing && existing.shift !== code) {
                // If cell was locked by CA, keep CA unless explicitly overridden
                existing.shift = code;
                changedCount++;
              }
            }
          }

          // Recalculate totals for this nurse
          let countGJ = 0;
          let countGN = 0;
          let countR = 0;
          let countHN = 0;
          let countCA = 0;

          for (let d = 1; d <= daysCount; d++) {
            const s = nurseRow.assignments[d]?.shift;
            if (s === 'GJ') countGJ++;
            else if (s === 'GN') countGN++;
            else if (s === 'R') countR++;
            else if (s === 'HN') countHN++;
            else if (s === 'CA') countCA++;
          }

          nurseRow.totalGJ = countGJ;
          nurseRow.totalGN = countGN;
          nurseRow.totalR = countR;
          nurseRow.totalHN = countHN;
          nurseRow.totalCA = countCA;
          nurseRow.totalHeuresGarde = (countGJ + countGN) * 12;
        }

        resolve({
          success: true,
          updatedLignes: newLignes,
          changedCount
        });

      } catch (err: any) {
        console.error('Error parsing WPS Office file:', err);
        resolve({ success: false, error: `Erreur d'analyse du fichier : ${err.message || 'Format invalide'}` });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, error: 'Échec de lecture du fichier WPS.' });
    };

    reader.readAsBinaryString(file);
  });
}
