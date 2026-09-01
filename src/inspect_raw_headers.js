const url = 'https://docs.google.com/spreadsheets/d/1NP_huOVUwBcpK71bk1vO4ZWRrauskG4ra0f10gB_n1E/htmlview/sheet?headers=true&gid=1551405064';

async function checkRow01() {
  const res = await fetch(url);
  const html = await res.text();
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  const trMatches = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  
  for (let r = 0; r < 5; r++) {
    const cells = [...trMatches[r][1].matchAll(/<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/gi)].map(m => ({
      text: m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      colspan: m[1].match(/colspan=["']?(\d+)["']?/i)?.[1] || 1,
      rowspan: m[1].match(/rowspan=["']?(\d+)["']?/i)?.[1] || 1,
    }));
    console.log(`Raw Row ${r}:`, cells);
  }
}

checkRow01().catch(console.error);
