async function searchGeniusForSpotify(slug) {
  try {
    const url = `https://genius.com/${slug}`;
    console.log(`Fetching Genius: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) {
      console.log(`Failed to fetch Genius page, status: ${response.status}`);
      return null;
    }
    const html = await response.text();
    // Look for track strings or spotify embed links
    const regexList = [
      /track\/([a-zA-Z0-9]{22})/i,
      /open\.spotify\.com\/(?:[a-zA-Z-]{2,5}\/)?track\/([a-zA-Z0-9]{22})/i,
      /spotify:track:([a-zA-Z0-9]{22})/i,
      /spotifyId["']:["']([a-zA-Z0-9]{22})/i
    ];
    for (const regex of regexList) {
      const match = html.match(regex);
      if (match) {
        return match[1];
      }
    }
    return null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function run() {
  const songs = [
    { name: "Cherry Blossom Girl", slug: "Air-cherry-blossom-girl-lyrics" },
    { name: "Two Cents Worth", slug: "Kansas-two-cents-worth-lyrics" },
    { name: "Doroga", slug: "Auktyon-doroga-lyrics" }
  ];

  for (const song of songs) {
    console.log(`Checking ${song.name}...`);
    const id = await searchGeniusForSpotify(song.slug);
    console.log(`RESULT ID: ${id}`);
    console.log('---');
    await new Promise(r => setTimeout(r, 1500));
  }
}

run();
