export interface NewsArticle {
  id: string;
  title: string;
  link: string;
  description: string;
  publishedAt: string;
  imageUrl: string;
  source: string;
}

const RSS_FEEDS = [
  {
    url: 'https://vnexpress.net/rss/bat-dong-san.rss',
    source: 'VnExpress',
  },
  {
    url: 'https://vnexpress.net/rss/kinh-doanh/bat-dong-san.rss',
    source: 'VnExpress',
  },
  {
    url: 'https://cafef.vn/bat-dong-san.rss',
    source: 'CafeF',
  },
  {
    url: 'https://cafef.vn/tin-tuc-du-an.rss',
    source: 'CafeF',
  },
  {
    url: 'https://cafef.vn/bat-dong-san-du-lich.rss',
    source: 'CafeF',
  },
];

const FETCH_TIMEOUT_MS = 4500;

const RSS_PROXIES = [
  {
    name: 'RSS2JSON',
    buildUrl: (feedUrl: string) =>
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`,
    parseResponse: async (response: Response) => {
      const payload = await response.json();

      if (payload?.status !== 'ok' || !Array.isArray(payload?.items)) {
        return '';
      }

      const itemsXml = payload.items
        .map((item: any) => {
          const title = String(item?.title ?? '');
          const link = String(item?.link ?? '');
          const pubDate = String(item?.pubDate ?? '');
          const description = String(item?.description ?? '');
          const thumbnail = String(item?.thumbnail ?? '');

          return `
            <item>
              <title><![CDATA[${title}]]></title>
              <link>${link}</link>
              <description><![CDATA[${description}]]></description>
              <pubDate>${pubDate}</pubDate>
              ${thumbnail ? `<enclosure url="${thumbnail}" />` : ''}
            </item>
          `;
        })
        .join('');

      return `<rss><channel>${itemsXml}</channel></rss>`;
    },
  },
  {
    name: 'AllOrigins Raw',
    buildUrl: (feedUrl: string) =>
      `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`,
    parseResponse: async (response: Response) => response.text(),
  },
  {
    name: 'AllOrigins Get',
    buildUrl: (feedUrl: string) =>
      `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`,
    parseResponse: async (response: Response) => {
      const payload = await response.json();
      return typeof payload?.contents === 'string' ? payload.contents : '';
    },
  },
];

const stripHtml = (value: string) =>
  value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const decodeHtmlEntities = (value: string) => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
};

const extractFirstImage = (rawValue: string) => {
  const decoded = decodeHtmlEntities(rawValue);
  const matched = decoded.match(/<img[^>]+src=["']([^"']+)["']/i);
  return matched?.[1] ?? '';
};

const sanitizeImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('//')) return `https:${url}`;
  return url.trim();
};

const parseRss = (xmlText: string, sourceName: string): NewsArticle[] => {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'text/xml');
  const items = Array.from(xml.querySelectorAll('item'));

  return items
    .map((item, index) => {
      const title = item.querySelector('title')?.textContent?.trim() ?? '';
      const link = item.querySelector('link')?.textContent?.trim() ?? '';
      const descriptionRaw = item.querySelector('description')?.textContent?.trim() ?? '';
      const pubDate = item.querySelector('pubDate')?.textContent?.trim() ?? '';
      const enclosure = item.querySelector('enclosure')?.getAttribute('url') ?? '';
      const mediaContent =
        item.getElementsByTagName('media:content')[0]?.getAttribute('url') ?? '';
      const mediaThumbnail =
        item.getElementsByTagName('media:thumbnail')[0]?.getAttribute('url') ?? '';

      const imageUrl = sanitizeImageUrl(
        enclosure || mediaContent || mediaThumbnail || extractFirstImage(descriptionRaw)
      );

      return {
        id: link || `${title}-${index}`,
        title,
        link,
        description: stripHtml(decodeHtmlEntities(descriptionRaw)),
        publishedAt: pubDate,
        imageUrl,
        source: sourceName,
      };
    })
    .filter((article) => article.title && article.link);
};

const fetchWithTimeout = async (url: string) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
};

const fetchFeedViaProxy = async (
  feed: (typeof RSS_FEEDS)[number],
  proxy: (typeof RSS_PROXIES)[number]
) => {
  const response = await fetchWithTimeout(proxy.buildUrl(feed.url));

  if (!response.ok) {
    throw new Error(`Proxy ${proxy.name} trả về ${response.status}`);
  }

  const xmlText = await proxy.parseResponse(response);

  if (!xmlText.trim()) {
    throw new Error(`Proxy ${proxy.name} không trả về dữ liệu hợp lệ`);
  }

  const articles = parseRss(xmlText, feed.source);

  if (articles.length === 0) {
    throw new Error(`Proxy ${proxy.name} không có bài viết`);
  }

  return articles;
};

export async function fetchLatestRealEstateNews(): Promise<NewsArticle[]> {
  const attempts = RSS_FEEDS.flatMap((feed) =>
    RSS_PROXIES.map((proxy) => fetchFeedViaProxy(feed, proxy))
  );

  try {
    const settled = await Promise.allSettled(attempts);
    const articles = settled
      .filter((result): result is PromiseFulfilledResult<NewsArticle[]> => result.status === 'fulfilled')
      .flatMap((result) => result.value);

    const dedupedArticles = Array.from(
      new Map(
        articles.map((article) => [article.link || `${article.source}-${article.title}`, article])
      ).values()
    );

    dedupedArticles.sort((left, right) => {
      const leftTime = new Date(left.publishedAt).getTime();
      const rightTime = new Date(right.publishedAt).getTime();
      return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
    });

    if (dedupedArticles.length === 0) {
      throw new Error('Không thể tải tin tức từ nguồn RSS lúc này');
    }

    return dedupedArticles.slice(0, 40);
  } catch {
    throw new Error('Không thể tải tin tức từ nguồn RSS lúc này');
  }
}
