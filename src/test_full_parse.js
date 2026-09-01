const url = 'https://docs.google.com/spreadsheets/d/1NP_huOVUwBcpK71bk1vO4ZWRrauskG4ra0f10gB_n1E/htmlview/sheet?headers=true&gid=1551405064';

function parseClassText(text) {
  if (!text || text.toLowerCase() === 'lunch') {
    return { type: 'lunch', subject: 'Lunch', teacher: '', room: '' };
  }
  
  // Example text: "ICP - 2030 Grp A (Akansha) Claas A 2nd floor"
  // or "Web Dev LAB - 2030 Grp A (Shubham) Class B 1st floor"
  // or "Academic Clubs [5:30 - 8 PM] Class A 2nd floor"
  
  let subject = text;
  let teacher = '';
  let room = '';
  
  // Check teacher in parentheses (e.g. (Akansha), (Dr. Noor))
  const teacherMatch = text.match(/\(([^)]+)\)/);
  if (teacherMatch) {
    teacher = teacherMatch[1].trim();
  }
  
  // Check room (e.g. Class A 2nd floor, Claas A 2nd floor, Lab 1, etc.)
  const roomMatch = text.match(/(?:Class|Claas|Lab|B1|C301|B203)[^()]*$/i);
  if (roomMatch) {
    room = roomMatch[0].trim().replace(/^Claas/i, 'Class');
  }
  
  // Clean subject
  let cleanSubject = text;
  if (teacherMatch) {
    cleanSubject = cleanSubject.replace(teacherMatch[0], '');
  }
  if (roomMatch) {
    cleanSubject = cleanSubject.replace(roomMatch[0], '');
  }
  
  // Remove batch/grp strings like "- 2030 Grp A", "2030 Grp D", etc.
  cleanSubject = cleanSubject
    .replace(/-\s*2030\s*Grp\s*[A-D]/gi, '')
    .replace(/2030\s*Grp\s*[A-D]/gi, '')
    .replace(/\[[^\]]+\]/g, '') // Remove [5:30 - 8 PM]
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

async function parseAllSchedules() {
  const res = await fetch(url);
  const html = await res.text();
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  const trMatches = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  
  const matrix = [];
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

  // Define slot times for row index 4..45
  // Row 4: Before 9:30 AM
  // Row 5: 9:30 - 9:45 AM (09:30 - 09:45)
  // Each row is 15 minutes!
  // Row 5 = 09:30, Row 6 = 09:45, ...
  function getTimeForSlot(slotRow, isEnd = false) {
    if (slotRow === 4) return isEnd ? '09:30' : '09:00';
    if (slotRow === 45) return isEnd ? '20:00' : '19:30';
    // Row 5 is 9:30 (570 minutes from midnight)
    const startMinutes = 570 + (slotRow - 5) * 15;
    const minutes = isEnd ? startMinutes + 15 : startMinutes;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  const groups = [
    { name: 'Group A', groupKey: 'A', startCol: 4 },
    { name: 'Group B', groupKey: 'B', startCol: 12 },
    { name: 'Group C', groupKey: 'C', startCol: 20 },
    { name: 'Group D', groupKey: 'D', startCol: 28 },
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const allRecords = [];

  for (const grp of groups) {
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const col = grp.startCol + dayIdx;
      const dayName = days[dayIdx];
      const seenCells = new Set();
      
      const dayClasses = [];

      for (let r = 4; r < matrix.length; r++) {
        const cell = matrix[r][col];
        if (!cell || !cell.text || seenCells.has(cell)) continue;
        seenCells.add(cell);

        const startR = cell.startRow;
        const endR = cell.startRow + cell.rowspan - 1;
        
        let startTime = getTimeForSlot(startR, false);
        let endTime = getTimeForSlot(endR, true);

        // If academic clubs has [5:30 - 8 PM]
        if (cell.text.includes('5:30 - 8 PM')) {
          startTime = '17:30';
          endTime = '20:00';
        }

        const parsed = parseClassText(cell.text);

        dayClasses.push({
          dayOfWeek: dayIdx + 1 > 6 ? 0 : dayIdx + 1, // 1=Mon..5=Fri, 6=Sat, 0=Sun
          dayName,
          year: '1st',
          program: 'CS AI', // SST 2030 Batch core foundation
          group: grp.groupKey,
          subject: parsed.subject,
          teacher: parsed.teacher,
          room: parsed.room,
          startTime,
          endTime,
          type: parsed.type,
          rawText: cell.text,
        });
      }

      // Sort by start time
      dayClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));
      allRecords.push(...dayClasses);
    }
  }

  console.log(`Parsed total of ${allRecords.length} classes/events across 4 groups.`);
  
  // Sample print for Wednesday Group A
  console.log('\n--- Sample: Wednesday Group A ---');
  const sample = allRecords.filter(r => r.group === 'A' && r.dayName === 'Wednesday');
  console.log(sample);

  // Sample print for Wednesday Group B
  console.log('\n--- Sample: Wednesday Group B ---');
  console.log(allRecords.filter(r => r.group === 'B' && r.dayName === 'Wednesday'));
}

parseAllSchedules().catch(console.error);
