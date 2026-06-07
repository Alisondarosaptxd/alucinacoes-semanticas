import "dotenv/config";
import express from "express";
import path from "path";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function fetchTumblrImages(): Promise<any[]> {
  const allImages: any[] = [];
  const urlsToFetch = [
    "https://asemanticas.tumblr.com/api/read/json?num=50&start=0",
    "https://asemanticas.tumblr.com/api/read/json?num=50&start=50"
  ];

  try {
    const fetchPromises = urlsToFetch.map(async (url) => {
      try {
        const res = await fetchWithTimeout(url, {
          headers: {
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        }, 2500);
        if (!res.ok) return [];
        const text = await res.text();
        
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return [];
        
        const data = JSON.parse(jsonMatch[0]);
        if (!data || !Array.isArray(data.posts)) return [];
        
        const pageImages: any[] = [];
        for (const post of data.posts) {
          let dateStr = "01/06/2026";
          if (post["date-gmt"]) {
            try {
              const d = new Date(post["date-gmt"]);
              const day = String(d.getDate()).padStart(2, '0');
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const year = d.getFullYear();
              dateStr = `${day}/${month}/${year}`;
            } catch (_) {}
          }

          let category = "Visual";
          if (Array.isArray(post.tags) && post.tags.length > 0) {
            category = post.tags[0];
            category = category.charAt(0).toUpperCase() + category.slice(1);
          } else {
            const defaultCats = ["Liminar", "Enigma", "Nostalgia", "Estético", "Vazio", "Abstrato", "Rastro", "Onírico", "Memória"];
            const hash = post.id ? Number(post.id) % defaultCats.length : 0;
            category = defaultCats[hash];
          }

          let caption = "";
          if (post["photo-caption"]) {
            caption = post["photo-caption"].replace(/<[^>]*>/g, "").trim();
          } else if (post["regular-title"]) {
            caption = post["regular-title"];
          } else if (post["regular-body"]) {
            caption = post["regular-body"].replace(/<[^>]*>/g, "").trim();
          }

          if (caption.length > 55) {
            caption = caption.substring(0, 52) + "...";
          }
          if (!caption) {
            caption = "Sem título";
          }

          if (post.type === "photo") {
            if (Array.isArray(post.photos) && post.photos.length > 0) {
              for (let pIdx = 0; pIdx < post.photos.length; pIdx++) {
                const photo = post.photos[pIdx];
                const imgUrl = photo["photo-url-1280"] || photo["photo-url-500"] || photo["photo-url-400"];
                if (imgUrl) {
                  pageImages.push({
                    id: `${post.id}-${pIdx}`,
                    url: `/api/notion-image?url=${encodeURIComponent(imgUrl)}`,
                    title: caption,
                    category,
                    date: dateStr
                  });
                }
              }
            } else {
              const imgUrl = post["photo-url-1280"] || post["photo-url-500"] || post["photo-url-400"];
              if (imgUrl) {
                pageImages.push({
                  id: String(post.id),
                  url: `/api/notion-image?url=${encodeURIComponent(imgUrl)}`,
                  title: caption,
                  category,
                  date: dateStr
                });
              }
            }
          } else {
            const bodyText = post["regular-body"] || post["link-description"] || post["video-player"] || "";
            const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
            let match;
            let count = 0;
            while ((match = imgRegex.exec(bodyText)) !== null && count < 5) {
              const imgUrl = match[1];
              if (imgUrl && !imgUrl.includes("assets/tumblr_")) {
                pageImages.push({
                  id: `${post.id}-inline-${count}`,
                  url: `/api/notion-image?url=${encodeURIComponent(imgUrl)}`,
                  title: caption,
                  category,
                  date: dateStr
                });
                count++;
              }
            }
          }
        }
        return pageImages;
      } catch (err: any) {
        console.warn("Failed fetching page of Tumblr API:", err.message);
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    const combined = results.flat();
    if (combined.length > 0) {
      const uniqueImagesMap = new Map();
      for (const img of combined) {
        uniqueImagesMap.set(img.url, img);
      }
      return Array.from(uniqueImagesMap.values());
    }
  } catch (err: any) {
    console.warn("Tumblr API read JSON error, trying RSS:", err.message);
  }

  // RSS Backup
  try {
    const rssRes = await fetchWithTimeout("https://asemanticas.tumblr.com/rss", {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    }, 2500);
    if (rssRes.ok) {
      const xmlText = await rssRes.text();
      const itemsMatch = xmlText.match(/<item>[\s\S]*?<\/item>/gi);
      if (itemsMatch) {
         const rssImages: any[] = [];
         for (let i = 0; i < itemsMatch.length; i++) {
           const itemContent = itemsMatch[i];
           let dateStr = "01/06/2026";
           const pubDateMatch = itemContent.match(/<pubDate>([^<]+)<\/pubDate>/i);
           if (pubDateMatch) {
             try {
               const d = new Date(pubDateMatch[1]);
               const day = String(d.getDate()).padStart(2, '0');
               const month = String(d.getMonth() + 1).padStart(2, '0');
               const year = d.getFullYear();
               dateStr = `${day}/${month}/${year}`;
             } catch (_) {}
           }

           let titleStr = "Sem título";
           const titleMatch = itemContent.match(/<title>([^<]+)<\/title>/i);
           if (titleMatch && titleMatch[1] && !titleMatch[1].startsWith("Photo")) {
             titleStr = titleMatch[1].replace(/<[^>]*>/g, "").trim();
             if (titleStr.length > 55) titleStr = titleStr.substring(0, 52) + "...";
           }

           const descMatch = itemContent.match(/<description>([\s\S]*?)<\/description>/i);
           if (descMatch) {
              const description = descMatch[1];
              const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
              let match;
              let count = 0;
              while ((match = imgRegex.exec(description)) !== null && count < 6) {
                const imgUrl = match[1];
                if (imgUrl) {
                  const defaultCats = ["Liminar", "Enigma", "Nostalgia", "Estético", "Vazio", "Abstrato", "Onírico", "Memória"];
                  const category = defaultCats[(i + count) % defaultCats.length];
                  rssImages.push({
                    id: `rss-${i}-${count}`,
                    url: `/api/notion-image?url=${encodeURIComponent(imgUrl)}`,
                    title: titleStr === "Sem título" ? "Ensaio Visual" : titleStr,
                    category,
                    date: dateStr
                  });
                  count++;
                }
              }
           }
         }
         if (rssImages.length > 0) {
           return rssImages;
         }
      }
    }
  } catch (err: any) {
    console.warn("RSS parsing fell back:", err.message);
  }

  return [];
}

const app = express();
app.use(express.json());

async function startServer() {
  // Proxy Endpoint para o Last.fm, mantendo as chaves protegidas no servidor
  app.get("/api/lastfm", async (req, res) => {
    try {
      const apiKey = process.env.LASTFM_API_KEY || "29305d8bd3eda88f769fa007c62ec4f4";
      const user = (req.query.user as string) || process.env.LASTFM_USER || "Alison__R";
      
      const lastfmUrl = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(user)}&api_key=${encodeURIComponent(apiKey)}&format=json&limit=1`;
      
      const response = await fetchWithTimeout(lastfmUrl, {}, 3000);
      if (!response.ok) {
        throw new Error(`Last.fm retornou status ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao consultar o Last.fm" });
    }
  });

  // Endpoint do Arquivo Visual (Imagens liminares e estéticas selecionadas)
  app.get("/api/notion-gallery", async (req, res) => {
    try {
      const tumblrImages = await fetchTumblrImages();
      if (tumblrImages && tumblrImages.length > 0) {
        return res.json({ images: tumblrImages });
      }
    } catch (error: any) {
      console.warn("Falha ao obter imagens do Tumblr, usando fallback estático:", error.message);
    }

    const images = [
      {
        id: "1",
        url: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1200&q=80",
        title: "Sintonia Retrofuturista",
        category: "Estético",
        date: "01/06/2026"
      },
      {
        id: "2",
        url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80",
        title: "Caminho Neon Vaporwave",
        category: "Vaporwave",
        date: "28/05/2026"
      },
      {
        id: "3",
        url: "https://images.unsplash.com/photo-1542640244-7e672d6cef21?auto=format&fit=crop&w=1200&q=80",
        title: "Escada Rolante Solitária",
        category: "Liminar",
        date: "24/05/2026"
      },
      {
        id: "4",
        url: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&w=1200&q=80",
        title: "Terminal Metropolitano Vazio",
        category: "Liminar",
        date: "19/05/2026"
      },
      {
        id: "5",
        url: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80",
        title: "Poste de Luz na Meia-Noite",
        category: "Misterioso",
        date: "14/05/2026"
      },
      {
        id: "6",
        url: "https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?auto=format&fit=crop&w=1200&q=80",
        title: "Ilusão Espectral Roxa",
        category: "Abstrato",
        date: "10/05/2026"
      },
      {
        id: "7",
        url: "https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?auto=format&fit=crop&w=1200&q=80",
        title: "Corredor do Abismo",
        category: "Liminar",
        date: "05/05/2026"
      },
      {
        id: "8",
        url: "https://images.unsplash.com/photo-1504701954957-2390f806e9f4?auto=format&fit=crop&w=1200&q=80",
        title: "Cais Encoberto pela Névoa",
        category: "Nostalgia",
        date: "01/05/2026"
      },
      {
        id: "9",
        url: "https://64.media.tumblr.com/c60f3a719e110c3e2c62c16499e002ee/32c06cda9eb54bbc-19/s640x960/64e25cbc4e3a92b588afc7f50a34c08db8ac55b7.jpg",
        title: "Parque Noturno Desfocado",
        category: "Memória",
        date: "27/04/2026"
      },
      {
        id: "10",
        url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80",
        title: "Cume Alpino Sob Estrelas",
        category: "Estético",
        date: "20/04/2026"
      },
      {
        id: "11",
        url: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80",
        title: "Horizonte Costeiro Silencioso",
        category: "Vazio",
        date: "12/04/2026"
      },
      {
        id: "12",
        url: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1200&q=80",
        title: "Caminho de Névoas na Montanha",
        category: "Estético",
        date: "05/04/2026"
      }
    ];
    res.json({ images });
  });

  // Proxy Endpoint de imagem do Notion para resolver cache e expiração de assinaturas de S3
  app.get("/api/notion-image", async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      const blockId = req.query.id as string;
      if (!imageUrl) {
        return res.status(400).send("Falta parâmetro url");
      }

      let targetUrl = imageUrl;
      // Se for apenas uma imagem estática pública nativa do Notion (começa com '/'), fazemos o fetch direto com prefixo
      if (imageUrl.startsWith("/")) {
        targetUrl = `https://www.notion.so${imageUrl}`;
      }

      const headers: Record<string, string> = {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
      };

      if (targetUrl.includes("steamstatic.com")) {
        headers["referer"] = "https://store.steampowered.com";
      }

      const imgResponse = await fetchWithTimeout(targetUrl, { headers }, 3000);

      if (!imgResponse.ok) {
        // Se falhar o fetch direto e for uma URL de S3 assinada, tenta usar o resizer oficial do Notion como contingência
        if (imageUrl.startsWith("https://prod-files-secure.s3.") || imageUrl.includes("amazonaws.com")) {
          const resizerUrl = `https://www.notion.so/image/${encodeURIComponent(imageUrl)}?table=block&id=${blockId || ""}&cache=v2`;
          const resizerResponse = await fetchWithTimeout(resizerUrl, {
            headers: {
              "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
              "referer": "https://www.notion.so"
            }
          }, 3000);
          if (resizerResponse.ok) {
            res.setHeader("Content-Type", resizerResponse.headers.get("Content-Type") || "image/jpeg");
            res.setHeader("Cache-Control", "public, max-age=86400");
            const buffer = Buffer.from(await resizerResponse.arrayBuffer());
            return res.send(buffer);
          }
        }
        throw new Error("Não foi possível carregar a imagem");
      }

      res.setHeader("Content-Type", imgResponse.headers.get("Content-Type") || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400"); // Cache de 24 horas
      const buffer = Buffer.from(await imgResponse.arrayBuffer());
      return res.send(buffer);
    } catch (error: any) {
      console.log("[Info] Proxy de imagem falhou, redirecionando para URL original como contingência:", error.message);
      const imageUrl = req.query.url as string;
      if (imageUrl && imageUrl.startsWith("http")) {
        return res.redirect(imageUrl);
      }
      return res.redirect("https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=400&q=80");
    }
  });

  // Proxy Endpoint para obter gameplays em tempo real direto do Notion
  app.get("/api/notion-gameplays", async (req, res) => {
    try {
      const collectionId = "06721e7b-1800-49e7-a7eb-0850c7b6963b";
      const collectionViewId = "114a14ed-07b4-4b11-8af4-2878c322f9d1";
      const spaceId = "8602a3be-e72a-4aec-b435-6129e34d5c11";

      const notionUrl = "https://www.notion.so/api/v3/queryCollection";
      const body = {
        collection: { id: collectionId, spaceId: spaceId },
        collectionView: { id: collectionViewId, spaceId: spaceId },
        loader: {
          type: "reducer",
          reducers: {
            collection_group_results: { type: "results", limit: 120 }
          },
          searchQuery: "",
          userTimeZone: "America/New_York"
        }
      };

      const response = await fetchWithTimeout(notionUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        body: JSON.stringify(body)
      }, 3500);

      if (!response.ok) {
        throw new Error(`Erro na API do Notion: status ${response.status}`);
      }

      const data: any = await response.json();
      const blocks = data.recordMap?.block || {};

      const curatedGames: Record<string, { youtubeId: string; cover: string }> = {
        "no man's sky": {
          youtubeId: "MRY-wXpG3E8",
          cover: "https://shared.cloudflare.steamstatic.com/store_images/steam/apps/275850/header.jpg"
        },
        "silent hill 2": {
          youtubeId: "f_p06L4jO0o",
          cover: "https://shared.cloudflare.steamstatic.com/store_images/steam/apps/2427600/header.jpg"
        },
        "yume nikki": {
          youtubeId: "z195-2gYn4c",
          cover: "https://shared.cloudflare.steamstatic.com/store_images/steam/apps/835810/header.jpg"
        },
        "fallout: new vegas": {
          youtubeId: "l-x-1L_YgG4",
          cover: "https://shared.cloudflare.steamstatic.com/store_images/steam/apps/22380/header.jpg"
        },
        "metro 2033": {
          youtubeId: "77D-tA77Z1w",
          cover: "https://shared.cloudflare.steamstatic.com/store_images/steam/apps/286690/header.jpg"
        },
        "batman: arkham city": {
          youtubeId: "D-Iu-O9b_tI",
          cover: "https://shared.cloudflare.steamstatic.com/store_images/steam/apps/200260/header.jpg"
        },
        "batman: arkham asylum": {
          youtubeId: "Cpxb1_6v7iM",
          cover: "https://shared.cloudflare.steamstatic.com/store_images/steam/apps/35140/header.jpg"
        },
        "bully: scholarship edition": {
          youtubeId: "f96-Nf90I7Q",
          cover: "https://shared.cloudflare.steamstatic.com/store_images/steam/apps/12220/header.jpg"
        },
        "stranded deep": {
          youtubeId: "O9uN17g52hI",
          cover: "https://shared.cloudflare.steamstatic.com/store_images/steam/apps/313120/header.jpg"
        },
        "assassin's creed rogue": {
          youtubeId: "c_u_4K97O-o",
          cover: "https://shared.cloudflare.steamstatic.com/store_images/steam/apps/311560/header.jpg"
        },
        "star wars jedi: fallen order": {
          youtubeId: "NqK1iE5W6K8",
          cover: "https://shared.cloudflare.steamstatic.com/store_images/steam/apps/1172380/header.jpg"
        },
        "assassin's creed: revelations": {
          youtubeId: "A3E_C333_c4",
          cover: "https://shared.cloudflare.steamstatic.com/store_images/steam/apps/201870/header.jpg"
        },
        "assassin's creed: brotherhood": {
          youtubeId: "f7_u8lRj3C4",
          cover: "https://shared.cloudflare.steamstatic.com/store_images/steam/apps/48190/header.jpg"
        },
        "assassin's creed ii": {
          youtubeId: "hc2o2pWl73U",
          cover: "https://shared.cloudflare.steamstatic.com/store_images/steam/apps/33230/header.jpg"
        },
        "assassin's creed odyssey": {
          youtubeId: "YfPhY_Tq9lU",
          cover: "https://shared.cloudflare.steamstatic.com/store_images/steam/apps/812140/header.jpg"
        },
        "mafia iii": {
          youtubeId: "4_C6L6bW6Uo",
          cover: "https://shared.cloudflare.steamstatic.com/store_images/steam/apps/360430/header.jpg"
        },
        "ultimate spider-man": {
          youtubeId: "lV_L-g8eEfc",
          cover: "https://upload.wikimedia.org/wikipedia/en/2/23/Ultimate_Spider-Man_%28video_game%29_cover_art.jpg"
        },
        "immortals fenyx rising": {
          youtubeId: "y1n1v0_XoW0",
          cover: "https://shared.cloudflare.steamstatic.com/store_images/steam/apps/2221920/header.jpg"
        }
      };

      const items: any[] = [];
      const blockKeys = Object.keys(blocks);

      for (const id of blockKeys) {
        const blockVal = blocks[id]?.value?.value;
        if (blockVal && blockVal.type === "page" && blockVal.parent_id === collectionId) {
          const props = blockVal.properties || {};
          const formats = blockVal.format || {};

          const title = props.title?.[0]?.[0] || "Sem título";
          const consolePlatform = props[";jws"]?.[0]?.[0] || "PC";
          const status = props["\\dby"]?.[0]?.[0] || "Currently Playing";
          const genre = props["cvFh"]?.[0]?.[0] || "Indie";
          
          let releaseYear = "Retro";
          try {
            const relInfo = props["EBmf"]?.[0]?.[1]?.[0]?.[1];
            if (relInfo && relInfo.start_date) {
              releaseYear = relInfo.start_date.split("-")[0];
            }
          } catch (_) {}

          let notes = "";
          if (props["VTeY"]?.[0]?.[0]) {
            notes = props["VTeY"]?.[0]?.[0];
          }

          const lookupKey = title.toLowerCase().trim();
          const gameCurated = curatedGames[lookupKey];

          // Determinar imagem de capa: Se for um jogo curado, use a capa oficial curada. Se for customizado e possuir cover no Notion, use-a.
          let coverUrl = "";
          if (gameCurated) {
            coverUrl = `/api/notion-image?url=${encodeURIComponent(gameCurated.cover)}`;
          } else if (formats.page_cover) {
            coverUrl = `/api/notion-image?url=${encodeURIComponent(formats.page_cover)}&id=${id}`;
          } else {
            coverUrl = `/api/notion-image?url=${encodeURIComponent("https://shared.cloudflare.steamstatic.com/store_images/steam/apps/367520/header.jpg")}`;
          }

          let matchedYoutubeId = "";
          let isSearch = false;

          if (gameCurated) {
            matchedYoutubeId = gameCurated.youtubeId;
          } else {
            // Se não temos no catálogo curado, usamos uma gameplay relaxante de fallback e marcamos como busca
            matchedYoutubeId = "gPhv1K_4Z3I"; // LSD Dream Emulator como fallback artístico
            isSearch = true;
          }

          items.push({
            id,
            youtubeId: matchedYoutubeId,
            isSearch,
            title,
            status,
            year: releaseYear,
            vibe: `${genre.split(",").join(" · ")} | ${consolePlatform.split(",").join(" + ")}`,
            notes: notes || `Sinal de vídeo transmitido para a malha neural. Estilo ${genre.split(",")[0] || "Retro"}.`,
            cover: coverUrl
          });
        }
      }

      // Ordenar os itens para que "Currently Playing" / em progresso fiquem primeiro
      items.sort((a, b) => {
        const order = { "Currently Playing": 1, "Estagnado": 2, "Completo": 3, "Abandonado": 4 };
        const scoreA = (order as any)[a.status] || 5;
        const scoreB = (order as any)[b.status] || 5;
        return scoreA - scoreB;
      });

      res.json({ items });
    } catch (error: any) {
      console.warn("Erro ao obter gameplays do Notion, enviando fallback:", error.message);
      // Fallback robusto e autêntico se a API estiver fora do ar
      const fallbackItems = [
        {
          id: "fb1",
          youtubeId: "MRY-wXpG3E8",
          isSearch: false,
          title: "No Man's Sky",
          status: "Currently Playing",
          year: "2016",
          vibe: "RPG · Sci-Fi · Open World | PC + Steam",
          notes: "Atravessando o cosmos em exploração liminar constante.",
          cover: `/api/notion-image?url=${encodeURIComponent("https://shared.cloudflare.steamstatic.com/store_images/steam/apps/275850/header.jpg")}`
        },
        {
          id: "fb2",
          youtubeId: "f_p06L4jO0o",
          isSearch: false,
          title: "Silent Hill 2",
          status: "Completo",
          year: "2001",
          vibe: "Horror · Psychological · Story | PS2",
          notes: "Exploração onírica e melancólica na névoa solitária do abismo.",
          cover: `/api/notion-image?url=${encodeURIComponent("https://shared.cloudflare.steamstatic.com/store_images/steam/apps/2427600/header.jpg")}`
        },
        {
          id: "fb3",
          youtubeId: "l-x-1L_YgG4",
          isSearch: false,
          title: "Fallout: New Vegas",
          status: "Abandonado",
          year: "2010",
          vibe: "RPG · Open World · FPS | PC + GOG",
          notes: "A poeira radioativa e as escolhas morais sob o sol de Vegas.",
          cover: `/api/notion-image?url=${encodeURIComponent("https://shared.cloudflare.steamstatic.com/store_images/steam/apps/22380/header.jpg")}`
        },
        {
          id: "fb4",
          youtubeId: "f96-Nf90I7Q",
          isSearch: false,
          title: "Bully: Scholarship Edition",
          status: "Completo",
          year: "2008",
          vibe: "Open World · Action · Adventure | PC + Steam",
          notes: "Nostalgia escolar satírica em Bullworth Academy.",
          cover: `/api/notion-image?url=${encodeURIComponent("https://shared.cloudflare.steamstatic.com/store_images/steam/apps/12220/header.jpg")}`
        }
      ];
      res.json({ items: fallbackItems });
    }
  });

  // Caso o frontend procure por gallery.json diretamente, apontamos para a API
  app.get("/gallery.json", (req, res) => {
    res.redirect("/api/notion-gallery");
  });
}

// Inicia o roteador de desenvolvimento ou produção local
async function runListeners() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configLoader: "runner",
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    if (!process.env.VERCEL) {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  if (!process.env.VERCEL) {
    const port = Number(process.env.PORT) || 3000;
    app.listen(port, "0.0.0.0", () => {
      console.log(`Servidor rodando na porta http://localhost:${port}`);
    });
  }
}

// Inicializa as rotas do proxy express
startServer();

// Inicia os escutadores locais
runListeners();

export default app;
