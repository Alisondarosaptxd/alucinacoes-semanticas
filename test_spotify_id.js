async function searchYahoo(query) {
  try {
    const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
    console.log(`Searching Yahoo for: ${query}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) return [];
    const html = await response.text();
    const regex = /open\.spotify\.com\/(?:[a-zA-Z-]{2,5}\/)?track\/([a-zA-Z0-9]{22})/gi;
    let match;
    const ids = new Set();
    while ((match = regex.exec(html)) !== null) {
      ids.add(match[1]);
    }
    return Array.from(ids);
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
  const songs = [
    { name: "Cherry Blossom Girl", query: 'Air "Cherry Blossom Girl" site:open.spotify.com/track' },
    { name: "Two Cents Worth", query: 'Kansas "Two Cents Worth" site:open.spotify.com/track' },
    { name: "Auktyon Doroga", query: 'Auktyon "Дорога" OR "Doroga" site:open.spotify.com/track' }
  ];

  for (const song of songs) {
    const candidates = await searchYahoo(song.query);
    console.log(`Candidates for ${song.name}:`, candidates);
    for (const c of candidates) {
      const valid = await isIdValid(c);
      console.log(`  Candidate ${c}: Valid? ${valid}`);
    }
    console.log('---');
    await new Promise(r => setTimeout(r, 2000));
  }
}

run();
