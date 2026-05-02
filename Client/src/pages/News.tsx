import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, Clock3, TrendingUp } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fetchLatestRealEstateNews, type NewsArticle } from '../services/news';

const NEWS_CACHE_KEY = 'propval-news-cache-v1';
const NEWS_CACHE_TTL_MS = 15 * 60 * 1000;
const fallbackImage =
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1600&auto=format&fit=crop';
const newsFontFamily = 'Roboto, sans-serif';
const INITIAL_LATEST_COUNT = 6;
const LOAD_MORE_STEP = 4;

type CachedNewsPayload = {
  savedAt: number;
  articles: NewsArticle[];
};

function NewsImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  const [imageSrc, setImageSrc] = useState(src || fallbackImage);

  useEffect(() => {
    setImageSrc(src || fallbackImage);
  }, [src]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (imageSrc !== fallbackImage) {
          setImageSrc(fallbackImage);
        }
      }}
    />
  );
}

const formatPublishedDate = (value: string) => {
  if (!value) return 'Mới cập nhật';

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  const day = `${parsedDate.getDate()}`.padStart(2, '0');
  const month = `${parsedDate.getMonth() + 1}`.padStart(2, '0');
  const year = parsedDate.getFullYear();
  const hours = `${parsedDate.getHours()}`.padStart(2, '0');
  const minutes = `${parsedDate.getMinutes()}`.padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const readNewsCache = (): CachedNewsPayload | null => {
  try {
    const rawValue = localStorage.getItem(NEWS_CACHE_KEY);
    if (!rawValue) return null;

    const payload = JSON.parse(rawValue) as CachedNewsPayload;
    if (!payload?.savedAt || !Array.isArray(payload.articles) || payload.articles.length === 0) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};

const writeNewsCache = (articles: NewsArticle[]) => {
  try {
    const payload: CachedNewsPayload = {
      savedAt: Date.now(),
      articles,
    };
    localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore cache write failures so the page still works.
  }
};

export default function News() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [visibleLatestCount, setVisibleLatestCount] = useState(INITIAL_LATEST_COUNT);

  const featuredArticle = useMemo(() => articles[0] ?? null, [articles]);
  const latestPool = useMemo(() => articles.slice(4), [articles]);
  const latestStories = useMemo(
    () => latestPool.slice(0, visibleLatestCount),
    [latestPool, visibleLatestCount]
  );
  const trendingStories = useMemo(() => articles.slice(0, 5), [articles]);
  const hasMoreLatestStories = latestStories.length < latestPool.length;

  const loadNews = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    try {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError('');
      const latest = await fetchLatestRealEstateNews();
      setArticles(latest);
      setVisibleLatestCount(INITIAL_LATEST_COUNT);
      writeNewsCache(latest);
    } catch (loadError) {
      if (articles.length === 0) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Không thể tải tin tức bất động sản lúc này'
        );
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const cached = readNewsCache();

    if (cached) {
      setArticles(cached.articles);
      setIsLoading(false);
      loadNews({ silent: true });
      return;
    }

    loadNews();
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: newsFontFamily }}>
      <Navbar />

      <main className="mx-auto w-full max-w-[1180px] px-4 py-8 md:px-6 lg:px-8">
        <section className="mb-8 text-center">
          <h1
            className="text-[1.9rem] font-bold leading-tight text-slate-950 md:text-[2.2rem]"
            style={{ fontFamily: newsFontFamily }}
          >
            Tin tức bất động sản mới nhất
          </h1>
          <div className="mx-auto mt-3 h-1.5 w-28 rounded-full bg-slate-200" />
        </section>

        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            {error}. Kiểm tra kết nối mạng hoặc thử tải lại sau.
          </div>
        )}

        {isLoading ? (
          <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="h-[520px] animate-pulse rounded-[2rem] bg-white" />
            <div className="grid gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-[120px] animate-pulse rounded-[1.5rem] bg-white" />
              ))}
            </div>
          </section>
        ) : featuredArticle ? (
          <>
            <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
              <div className="rounded-[2rem] bg-white p-4">
                <a
                  href={featuredArticle.link}
                  target="_blank"
                  rel="noreferrer"
                  className="group block overflow-hidden rounded-[1.5rem]"
                >
                  <div className="h-[320px] overflow-hidden rounded-[1.4rem] md:h-[430px]">
                    <NewsImage
                      src={featuredArticle.imageUrl}
                      alt={featuredArticle.title}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="px-1 pb-1 pt-5">
                    <p className="text-sm font-medium text-slate-500">Tiêu điểm hôm nay</p>
                    <h2
                      className="mt-3 max-w-3xl text-xl font-bold leading-tight text-slate-950 md:text-[1.75rem]"
                      style={{ fontFamily: newsFontFamily }}
                    >
                      {featuredArticle.title}
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                      {featuredArticle.description}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-400">
                      <Clock3 size={13} />
                      {formatPublishedDate(featuredArticle.publishedAt)}
                    </div>
                  </div>
                </a>
              </div>

              <aside className="rounded-[2rem] bg-white p-6">
                <div className="flex items-center gap-3 pb-4">
                  <div className="rounded-2xl bg-slate-100 p-3 text-slate-800">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h3
                      className="text-lg font-black text-slate-950"
                      style={{ fontFamily: newsFontFamily }}
                    >
                      Các bài viết được xem nhiều nhất
                    </h3>
                  </div>
                </div>

                <div className="mt-4 divide-y divide-slate-200/80">
                  {trendingStories.map((article, index) => (
                    <a
                      key={article.id}
                      href={article.link}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex gap-4 rounded-2xl py-4 transition hover:bg-slate-50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#cfe3ff] text-sm font-black text-[#315f9a]">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <h4 className="line-clamp-3 text-sm font-bold leading-6 text-slate-900">
                          {article.title}
                        </h4>
                        <p className="mt-1 text-sm font-medium text-slate-400">
                          {formatPublishedDate(article.publishedAt)}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </aside>
            </section>

            <section className="mt-10 rounded-[2rem] bg-white p-6 md:p-8">
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2
                    className="text-[1.7rem] font-bold text-slate-950 md:text-[1.9rem]"
                    style={{ fontFamily: newsFontFamily }}
                  >
                    Tin mới cập nhật
                  </h2>
                </div>
              </div>

              <div className="divide-y divide-slate-200/80">
                {latestStories.map((article) => (
                  <a
                    key={article.id}
                    href={article.link}
                    target="_blank"
                    rel="noreferrer"
                    className="group grid gap-5 rounded-[1.5rem] bg-slate-50/60 p-4 transition hover:bg-white md:grid-cols-[220px_1fr]"
                  >
                    <div className="h-40 overflow-hidden rounded-[1.2rem] bg-slate-100 md:h-full">
                      <NewsImage
                        src={article.imageUrl}
                        alt={article.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-400">
                        <span>{article.source}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span>{formatPublishedDate(article.publishedAt)}</span>
                      </div>
                      <h3
                        className="mt-3 text-lg font-bold leading-snug text-slate-950"
                        style={{ fontFamily: newsFontFamily }}
                      >
                        {article.title}
                      </h3>
                      <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-500">
                        {article.description}
                      </p>
                      <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-slate-900">
                        Đọc chi tiết
                        <ArrowRight size={15} className="transition group-hover:translate-x-1" />
                      </span>
                    </div>
                  </a>
                ))}
              </div>

              {hasMoreLatestStories ? (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleLatestCount((current) =>
                        Math.min(current + LOAD_MORE_STEP, latestPool.length)
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-full bg-[#1e036e] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#2b0a8f]"
                  >
                    Xem thêm
                    <ArrowDown size={15} />
                  </button>
                </div>
              ) : null}
            </section>
          </>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
