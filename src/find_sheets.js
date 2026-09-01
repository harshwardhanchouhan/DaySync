const url = 'https://docs.google.com/spreadsheets/d/1NP_huOVUwBcpK71bk1vO4ZWRrauskG4ra0f10gB_n1E/htmlview';

async function checkAllSheets() {
  const res = await fetch(url);
  const html = await res.text();
  const matches = [...html.matchAll(/name:\s*"([^"]+)",\s*pageUrl:[^,]+,\s*gid:\s*"([^"]+)"/g)];
  console.log('Found sheets in HTML:');
  for (const m of matches) {
    console.log(`- Name: ${m[1]}, GID: ${m[2]}`);
  }
}

checkAllSheets().catch(console.error);
