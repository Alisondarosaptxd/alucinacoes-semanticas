const delay = ms => new Promise(res => setTimeout(res, ms));

async function getSpotifyId(query) {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });
    const html = await response.text();
    // Support intl track formats and normal track formats
    const regex = /open\.spotify\.com\/(?:[a-zA-Z-]{2,6}\/)?track\/([a-zA-Z0-9]{22})/gi;
    let match;
    const ids = [];
    while ((match = regex.exec(html)) !== null) {
      ids.push(match[1]);
    }
    return ids;
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function isIdValid(id) {
  try {
    const url = `https://open.spotify.com/embed/track/${id}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) return false;
    const html = await res.text();
    return !html.includes("We can't seem to find the page") && !html.includes("Page not found");
  } catch (err) {
    return false;
  }
}

async function run() {
  const queries = [
    { name: "Cherry Blossom Girl", q: '"Air" "Cherry Blossom Girl" spotify track' },
    { name: "Two Cents Worth", q: '"Kansas" "Two Cents Worth" spotify track' },
    { name: "Дорога", q: '"Аукцыон" "Дорога" spotify track' }
  ];

  for (const item of queries) {
    console.log(`Querying: ${item.q}`);
    const ids = await getSpotifyId(item.q);
    const uniqueIds = Array.from(new Set(ids));
    console.log(`Found IDs:`, uniqueIds);
    for (const id of uniqueIds) {
      const valid = await isIdValid(id);
      console.log(`  Verify ${id}: Valid? ${valid}`);
    }
    console.log('---');
    await delay(3000);
  }
}

run();
