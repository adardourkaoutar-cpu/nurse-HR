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

  // Build the 2D sheet data matching the user's PDF template exactly
  const data: any[][] = [];

  // 1. Official Header (Bilingual French / Arabic as in PDF template)
  const padRight = (left: string, right: string) => {
    const row = new Array(32).fill('');
    row[0] = left;
    row[28] = right;
    return row;
  };

  data.push(padRight('Royaume du Maroc', 'المملكة المغربية'));
  data.push(padRight('Ministère de la santé et de la protection sociale', 'وزارة الصحة والحماية الاجتماعية'));
  data.push(padRight('Délégation provinciale de Sidi Ifni', 'المندوبية الإقليمية لسيدي إفني'));
  data.push(padRight('Centre hospitalier provincial Sidi Ifni', 'المركز الاستشفائي الإقليمي سيدي إفني'));
  data.push([]); // blank

  // 2. Title
  const titleRow = new Array(32).fill('');
  titleRow[10] = 'Liste de garde/horaire normal';
  data.push(titleRow);
  data.push([]); // blank

  // 3. Sub-header (Service, Mois, Année, Cadre)
  const metaRow = new Array(32).fill('');
  metaRow[0] = 'Service : Bloc opératoire';
  metaRow[8] = `Mois : ${record.moisNom || record.moisLibelle.split(' ')[0]}`;
  metaRow[16] = `Année : ${record.annee}`;
  metaRow[22] = `Cadre : ${record.cadreLibelle || record.categorieLibelle}`;
  data.push(metaRow);
  data.push([]); // blank

  // 4. Table Header: "NOM COMPLET" then days 1 to 31
  const headerRow: string[] = ['NOM COMPLET'];
  for (let d = 1; d <= 31; d++) {
    headerRow.push(String(d));
  }
  headerRow.push('Total GJ', 'Total GN', 'Total R', 'Total HN', 'Total CA', 'Total H');
  data.push(headerRow);

  // 5. Data rows for nurses
  record.lignes.forEach((ligne) => {
    const row: any[] = [
      `${ligne.nom.toUpperCase()} ${ligne.prenom}`
    ];

    let countGJ = 0;
    let countGN = 0;
    let countR = 0;
    let countHN = 0;
    let countCA = 0;

    for (let d = 1; d <= 31; d++) {
      if (d <= daysCount) {
        const assignment = ligne.assignments[d];
        const shift = assignment ? assignment.shift : '';
        row.push(shift);

        if (shift === 'GJ') countGJ++;
        else if (shift === 'GN') countGN++;
        else if (shift === 'R') countR++;
        else if (shift === 'HN') countHN++;
        else if (shift === 'CA') countCA++;
      } else {
        // Days beyond month (e.g. day 31 in a 30-day month)
        row.push('/');
      }
    }

    const totalHeures = (countGJ + countGN) * 12;
    row.push(countGJ, countGN, countR, countHN, countCA, `${totalHeures}h`);
    data.push(row);
  });

  // 6. Legend row matching exact PDF:
  // "NB :   GJ : garde de jour   GN : garde de nuit   R : récupération   HN : horaire normal   CA : congé administratif"
  data.push([]); // blank
  const legendRow = new Array(32).fill('');
  legendRow[2] = 'NB :';
  legendRow[4] = 'GJ : garde de jour';
  legendRow[9] = 'GN : garde de nuit';
  legendRow[14] = 'R : récupération';
  legendRow[19] = 'HN : horaire normal';
  legendRow[25] = 'CA : congé administratif';
  data.push(legendRow);

  // 7. Signature row matching exact PDF:
  // "Infirmier Chef :"           "Chef du PSI :"           "Le directeur :"
  data.push([]); // blank
  data.push([]); // blank
  const signatureRow = new Array(32).fill('');
  signatureRow[1] = 'Infirmier Chef :';
  signatureRow[13] = 'Chef du PSI :';
  signatureRow[26] = 'Le directeur :';
  data.push(signatureRow);

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column width formatting
  const colWidths: any[] = [
    { wch: 28 }, // NOM COMPLET
  ];
  for (let d = 1; d <= 31; d++) {
    colWidths.push({ wch: 4.5 });
  }
  colWidths.push({ wch: 8 }, { wch: 8 }, { wch: 7 }, { wch: 8 }, { wch: 8 }, { wch: 10 });
  ws['!cols'] = colWidths;

  const sheetName = 'Liste de garde';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Sanitize filename
  const cleanMois = (record.moisNom || record.moisLibelle.split(' ')[0]).replace(/\s+/g, '_');
  const fileName = `Liste_de_garde_${record.categorie}_${cleanMois}_${record.annee}.xlsx`;

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
