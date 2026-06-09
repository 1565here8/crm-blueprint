type NewsItem = {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  link?: string;
};

const cache = new Map<string, { at: number; items: NewsItem[] }>();
const TTL_MS = 5 * 60_000;

function parseRss(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of blocks.slice(0, 12)) {
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/i);
    const link = block.match(/<link>(.*?)<\/link>/i);
    const pub = block.match(/<pubDate>(.*?)<\/pubDate>/i);
    const desc = block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/i);
    const rawTitle = (title?.[1] ?? title?.[2] ?? "").trim();
    if (!rawTitle) continue;
    const rawDesc = (desc?.[1] ?? desc?.[2] ?? "").replace(/<[^>]+>/g, "").trim();
    items.push({
      id: link?.[1] ?? rawTitle,
      title: rawTitle,
      date: pub?.[1]
        ? new Date(pub[1]).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : new Date().toLocaleString("en-GB"),
      excerpt: rawDesc.slice(0, 220) || "Market update from financial newswires.",
      link: link?.[1],
    });
  }
  return items;
}

export async function fetchSymbolNews(symbol: string): Promise<NewsItem[]> {
  const key = symbol.toUpperCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.items;

  const yahooSymbol = key.includes("/") ? key.replace("/", "") : key;
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(yahooSymbol)}&region=US&lang=en-US`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CurioniCRM/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`News feed ${res.status}`);
    const xml = await res.text();
    const items = parseRss(xml);
    if (items.length > 0) {
      cache.set(key, { at: Date.now(), items });
      return items;
    }
  } catch {
    /* fall through */
  }

  return fallbackNews(key);
}

function fallbackNews(symbol: string): NewsItem[] {
  const now = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return [
    {
      id: `${symbol}-1`,
      title: `${symbol} traders watch macro data and central bank commentary`,
      date: now,
      excerpt: "Live market participants monitor economic releases, earnings, and liquidity conditions affecting short-term price action.",
    },
    {
      id: `${symbol}-2`,
      title: `Institutional flow keeps ${symbol} in focus across major sessions`,
      date: now,
      excerpt: "Volume and volatility remain key drivers as global desks adjust exposure ahead of the next trading window.",
    },
    {
      id: `${symbol}-3`,
      title: "Risk sentiment shifts as investors balance growth and rate expectations",
      date: now,
      excerpt: "Cross-asset correlations influence FX, equities, and crypto as portfolio managers rebalance into the session close.",
    },
  ];
}
