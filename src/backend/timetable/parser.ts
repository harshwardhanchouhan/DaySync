/**
 * SST Timetable Google Sheet Parser & Pipeline
 * 
 * Fetches the live Google Sheet (or cached export) and parses merged cells,
 * rowspans, subjects, faculty names, classrooms, and start/end time slots.
 */

import type { TimetableEntry } from '../../types';

export const SST_SHEET_ID = '1NP_huOVUwBcpK71bk1vO4ZWRrauskG4ra0f10gB_n1E';
export const WEEKLY_SCHEDULE_GID = '1551405064';
export const LIVE_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SST_SHEET_ID}/htmlview/sheet?headers=true&gid=${WEEKLY_SCHEDULE_GID}`;

export interface NormalizedClassRecord {
  id: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  dayName: string;
  year: string;      // '1st'
  program: string;   // 'CS AI'
  group: string;     // 'A' | 'B' | 'C' | 'D'
  subject: string;
  teacher: string;
  room: string;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  type: 'class' | 'lunch';
}

function parseClassText(text: string): { type: 'class' | 'lunch'; subject: string; teacher: string; room: string } {
  if (!text || text.toLowerCase().trim() === 'lunch') {
    return { type: 'lunch', subject: 'Lunch', teacher: '', room: '' };
  }

  let teacher = '';
  let room = '';

  const teacherMatch = text.match(/\(([^)]+)\)/);
  if (teacherMatch) {
    teacher = teacherMatch[1].trim();
  }

  const roomMatch = text.match(/(?:Class|Claas|Lab|B1|C301|B203)[^()]*$/i);
  if (roomMatch) {
    room = roomMatch[0].trim().replace(/^Claas/i, 'Class');
  }

  let cleanSubject = text;
  if (teacherMatch) cleanSubject = cleanSubject.replace(teacherMatch[0], '');
  if (roomMatch) cleanSubject = cleanSubject.replace(roomMatch[0], '');

  cleanSubject = cleanSubject
    .replace(/-\s*2030\s*Grp\s*[A-D]/gi, '')
    .replace(/2030\s*Grp\s*[A-D]/gi, '')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/-\s*$/g, '')
    .trim();

  if (cleanSubject.startsWith('ICP')) {
    cleanSubject = cleanSubject.includes('LAB') ? 'ICP Lab' : 'Intro to Computer Programming (ICP)';
  } else if (cleanSubject.startsWith('Web Dev')) {
    cleanSubject = cleanSubject.includes('LAB') ? 'Web Dev Lab' : 'Web Development 101';
  } else if (cleanSubject.startsWith('Maths')) {
    cleanSubject = 'Maths for Programming';
  } else if (cleanSubject.startsWith('English')) {
    cleanSubject = 'English Language & Communication';
  } else if (cleanSubject.toLowerCase().includes('academic clubs')) {
    cleanSubject = 'Academic Clubs';
  }

  return {
    type: 'class',
    subject: cleanSubject || text,
    teacher: teacher ? (teacher.startsWith('Dr.') || teacher.startsWith('Prof.') ? teacher : `Prof. ${teacher}`) : '',
    room: room || '',
  };
}

function getTimeForSlot(slotRow: number, isEnd = false): string {
  if (slotRow === 4) return isEnd ? '09:30' : '09:00';
  if (slotRow === 45) return isEnd ? '20:00' : '19:30';
  // Row 5 is 9:30 AM (570 minutes from midnight). Each row is 15 mins.
  const startMinutes = 570 + (slotRow - 5) * 15;
  const minutes = isEnd ? startMinutes + 15 : startMinutes;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseSheetHtmlToRecords(html: string): NormalizedClassRecord[] {
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) throw new Error('Could not locate <table> tag in Google Sheet HTML');

  const trMatches = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const matrix: Array<Array<{ text: string; rowspan: number; colspan: number; startRow: number; startCol: number }>> = [];

  for (let r = 0; r < trMatches.length; r++) {
    if (!matrix[r]) matrix[r] = [];
    let colPointer = 0;
    const tdMatches = [...trMatches[r][1].matchAll(/<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/gi)];

    for (const td of tdMatches) {
      const attrs = td[1];
      const text = td[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const rowspan = parseInt(attrs.match(/rowspan=["']?(\d+)["']?/i)?.[1] || '1', 10);
      const colspan = parseInt(attrs.match(/colspan=["']?(\d+)["']?/i)?.[1] || '1', 10);

      while (matrix[r][colPointer] !== undefined) {
        colPointer++;
      }

      const cellData = { text, rowspan, colspan, startRow: r, startCol: colPointer };
      for (let ro = 0; ro < rowspan; ro++) {
        for (let co = 0; co < colspan; co++) {
          const targetR = r + ro;
          const targetC = colPointer + co;
          if (!matrix[targetR]) matrix[targetR] = [];
          matrix[targetR][targetC] = cellData;
        }
      }
      colPointer += colspan;
    }
  }

  const groups = [
    { name: 'Group A', groupKey: 'A', startCol: 4 },
    { name: 'Group B', groupKey: 'B', startCol: 12 },
    { name: 'Group C', groupKey: 'C', startCol: 20 },
    { name: 'Group D', groupKey: 'D', startCol: 28 },
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const allRecords: NormalizedClassRecord[] = [];

  for (const grp of groups) {
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const col = grp.startCol + dayIdx;
      const dayName = days[dayIdx];
      const seenCells = new Set();
      const dayClasses: NormalizedClassRecord[] = [];

      for (let r = 4; r < matrix.length; r++) {
        const cell = matrix[r]?.[col];
        if (!cell || !cell.text || seenCells.has(cell)) continue;
        seenCells.add(cell);

        const startR = cell.startRow;
        const endR = cell.startRow + cell.rowspan - 1;

        let startTime = getTimeForSlot(startR, false);
        let endTime = getTimeForSlot(endR, true);

        if (cell.text.includes('5:30 - 8 PM')) {
          startTime = '17:30';
          endTime = '20:00';
        }

        const parsed = parseClassText(cell.text);

        dayClasses.push({
          id: `sst-${grp.groupKey.toLowerCase()}-${dayIdx}-${startTime}`,
          dayOfWeek: dayIdx + 1 > 6 ? 0 : dayIdx + 1,
          dayName,
          year: '1st',
          program: 'CS AI',
          group: grp.groupKey,
          subject: parsed.subject,
          teacher: parsed.teacher,
          room: parsed.room,
          startTime,
          endTime,
          type: parsed.type,
        });
      }

      dayClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));
      allRecords.push(...dayClasses);
    }
  }

  return allRecords;
}

/**
 * Builds standard timeline entries including calculated free gaps
 */
export function buildTimelineEntriesWithGaps(classes: NormalizedClassRecord[]): TimetableEntry[] {
  if (classes.length === 0) return [];

  const result: TimetableEntry[] = [];

  for (let i = 0; i < classes.length; i++) {
    const curr = classes[i];

    // Check if there is a gap between previous entry and this entry
    if (i > 0) {
      const prev = classes[i - 1];
      if (prev.endTime < curr.startTime) {
        result.push({
          id: `gap-${prev.endTime}-${curr.startTime}`,
          type: 'free',
          startTime: prev.endTime,
          endTime: curr.startTime,
        });
      }
    }

    result.push({
      id: curr.id,
      type: curr.type,
      subject: curr.subject,
      teacher: curr.teacher,
      room: curr.room,
      startTime: curr.startTime,
      endTime: curr.endTime,
    });
  }

  return result;
}
