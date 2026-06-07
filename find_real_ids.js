async function searchDDG(query) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36'
      }
    });
    const html = await response.text();
    const regex = /open\.spotify\.com\/(?:[a-zA-Z-]{2,5}\/)?track\/([a-zA-Z0-9]{22})/gi;
    let match;
    const ids = new Set();
    while ((match = regex.exec(html)) !== null) {
      ids.add(match[1]);
    }
    return Array.from(ids);
  } catch (err) {
    console.error(`Error searching for query [${query}]:`, err);
    return [];
  }
}

async function run() {
  const songs = [
    { name: "Air Cherry Blossom Girl", query: "Air \"Cherry Blossom Girl\" spotify track" },
    { name: "Kansas Two Cents Worth", query: "Kansas \"Two Cents Worth\" spotify track" },
    { name: "Auktyon Doroga", query: "Auktyon \"Doroga\" OR \"Дорога\" spotify track" }
  ];

  for (const song of songs) {
    console.log(`Searching for: ${song.name}...`);
    const ids = await searchDDG(song.query);
    console.log(`Results for ${song.name}:`, ids);
    // Let's also do a more specific query with "site:open.spotify.com/track"
    const ids2 = await searchDDG(`${song.name} site:open.spotify.com/track`);
    console.log(`Results with site filter:`, ids2);
    console.log('---');
    await new Promise(r => setTimeout(r, 4000)); // Sleep 4s to prevent rate limiting
  }
}

run();
