const url = 'https://docs.google.com/spreadsheets/d/1NP_huOVUwBcpK71bk1vO4ZWRrauskG4ra0f10gB_n1E/htmlview/sheet?headers=true&gid=1551405064';

async function parseTable() {
  const res = await fetch(url);
  const html = await res.text();
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) throw new Error('No table');
  
  const trMatches = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  
  // Matrix to store placed cells taking rowspan into account
  const matrix = []; // [row][col] = cell
  
  for (let r = 0; r < trMatches.length; r++) {
    if (!matrix[r]) matrix[r] = [];
    let colPointer = 0;
    
    const tdMatches = [...trMatches[r][1].matchAll(/<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/gi)];
    
    for (const td of tdMatches) {
      const attrs = td[1];
      const text = td[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const rowspan = parseInt(attrs.match(/rowspan=["']?(\d+)["']?/i)?.[1] || '1', 10);
      const colspan = parseInt(attrs.match(/colspan=["']?(\d+)["']?/i)?.[1] || '1', 10);
      
      // Find next free column in matrix[r]
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
  
  console.log('Matrix reconstructed! Total rows:', matrix.length);
  
  // Row 2 is Batches/Groups, Row 3 is Days, Row 4+ is TimeSlots
  console.log('Row 2 headers:', matrix[2]?.map((c, i) => `[${i}] ${c?.text}`).filter(Boolean));
  console.log('Row 3 days:', matrix[3]?.map((c, i) => `[${i}] ${c?.text}`).filter(Boolean));

  // Print all time slots
  const timeSlots = [];
  for (let r = 4; r < matrix.length; r++) {
    const timeCell = matrix[r][1]?.text;
    if (timeCell) {
      timeSlots.push({ row: r, time: timeCell });
    }
  }
  console.log('Total time slots found:', timeSlots.length);
  console.log('Time slots:', timeSlots);
}

parseTable().catch(console.error);
