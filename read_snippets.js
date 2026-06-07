async function getSnippets(query) {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = await response.text();
    // Parse result snippets
    const regex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    const snippets = [];
    while ((match = regex.exec(html)) !== null) {
      snippets.push(match[1].replace(/<[^>]*>/g, '').trim());
    }
    return snippets;
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function run() {
  const queries = [
    "Elliott Smith Between the Bars site:open.spotify.com/track",
    "Poets of the Fall Carnival of Rust site:open.spotify.com/track",
    "Air Cherry Blossom Girl site:open.spotify.com/track",
    "Kansas Two Cents Worth site:open.spotify.com/track",
    "Auktyon Doroga site:open.spotify.com/track"
  ];

  for (const q of queries) {
    console.log(`QUERY: ${q}`);
    const snips = await getSnippets(q);
    console.log(`Snippets:`, snips.slice(0, 4));
    console.log('---');
  }
}

run();
