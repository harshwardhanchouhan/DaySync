const url = 'https://docs.google.com/spreadsheets/d/1NP_huOVUwBcpK71bk1vO4ZWRrauskG4ra0f10gB_n1E/export?format=csv&gid=1551405064';

function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentCell.trim());
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }
  return rows;
}

async function run() {
  const res = await fetch(url);
  const csvText = await res.text();
  const grid = parseCSV(csvText);
  
  console.log('Total grid rows:', grid.length);
  console.log('Row 0 (Batches/Groups):', grid[0]);
  console.log('Row 1 (Days):', grid[1]);

  for (let r = 2; r < grid.length; r++) {
    const timeSlot = grid[r][0];
    const nonEmpties = [];
    for (let c = 1; c < grid[r].length; c++) {
      if (grid[r][c]) {
        nonEmpties.push({ col: c, text: grid[r][c].replace(/\n/g, ' / ') });
      }
    }
    if (nonEmpties.length > 0) {
      console.log(`[Row ${r}] Time: "${timeSlot}" ->`, JSON.stringify(nonEmpties));
    }
  }
}

run().catch(console.error);
