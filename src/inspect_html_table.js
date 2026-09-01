const url = 'https://docs.google.com/spreadsheets/d/1NP_huOVUwBcpK71bk1vO4ZWRrauskG4ra0f10gB_n1E/htmlview/sheet?headers=true&gid=1551405064';

async function inspectHtml() {
  const res = await fetch(url);
  const html = await res.text();
  console.log('HTML length:', html.length);
  
  // Look for <table>
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) {
    console.log('No table tag found directly. Showing first 1000 chars:\n', html.slice(0, 1000));
    return;
  }
  
  console.log('Table found!');
  const rows = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  console.log('Total <tr> count:', rows.length);
  
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const cells = [...rows[r][1].matchAll(/<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/gi)].map(m => {
      const attrs = m[1];
      const content = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const rowspan = attrs.match(/rowspan=["']?(\d+)["']?/i)?.[1] || '1';
      const colspan = attrs.match(/colspan=["']?(\d+)["']?/i)?.[1] || '1';
      return { content, rowspan: Number(rowspan), colspan: Number(colspan) };
    });
    console.log(`Row ${r}:`, JSON.stringify(cells));
  }
}

inspectHtml().catch(console.error);
