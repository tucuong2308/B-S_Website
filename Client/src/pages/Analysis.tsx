import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import Navbar from '../components/Navbar';

type MarketSignal = 'up' | 'down';

interface MarketZoneInsight {
  name: string;
  subtitle: string;
  signal: MarketSignal;
  changeLabel: string;
  priceLabel: string;
}

const marketInsights: MarketZoneInsight[] = [
  {
    name: 'Quận 2',
    subtitle: 'Thành phố Thủ Đức',
    signal: 'up',
    changeLabel: '+12.4%',
    priceLabel: '124.5M/m²',
  },
  {
    name: 'Quận 7',
    subtitle: 'Khu Nam',
    signal: 'up',
    changeLabel: '+8.2%',
    priceLabel: '98.2M/m²',
  },
  {
    name: 'Huyện Cần Giờ',
    subtitle: 'Khu ven biển',
    signal: 'down',
    changeLabel: '-4.2%',
    priceLabel: '22.5M/m²',
  },
  {
    name: 'Quận Bình Tân',
    subtitle: 'Khu Tây',
    signal: 'down',
    changeLabel: '-1.8%',
    priceLabel: '45.0M/m²',
  },
];

const signalMeta: Record<
  MarketSignal,
  {
    icon: typeof ArrowUpRight;
    sectionTitle: string;
    changeClass: string;
  }
> = {
  up: {
    icon: ArrowUpRight,
    sectionTitle: 'Tăng giá mạnh nhất',
    changeClass: 'text-[#2f7cf6]',
  },
  down: {
    icon: ArrowDownRight,
    sectionTitle: 'Giảm giá mạnh nhất',
    changeClass: 'text-[#ef4444]',
  },
};

export default function Analysis() {
  const [mapMode, setMapMode] = useState<'polygons' | 'circles'>('circles');

  const hotspotMapSrc = `${import.meta.env.BASE_URL}${
    mapMode === 'circles' ? 'map_hotspot_circles.html' : 'map_hotspot_polygons.html'
  }`;
  const hotZones = marketInsights.filter((item) => item.signal === 'up');
  const coolZones = marketInsights.filter((item) => item.signal === 'down');

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <main className="flex-1 p-3 md:p-4">
        <section className="grid h-[calc(100vh-88px)] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm lg:grid-cols-[1.55fr_0.85fr] dark:border-slate-800 dark:bg-slate-900">
          <div className="relative min-h-[50vh] border-b border-slate-200 bg-slate-100 lg:border-b-0 lg:border-r dark:border-slate-800 dark:bg-slate-950">
            <iframe
              title="Hotspot map"
              src={hotspotMapSrc}
              className="h-full min-h-[50vh] w-full border-0"
              loading="lazy"
            />

            <div className="absolute right-4 top-4 z-10 flex gap-2 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
              <button
                onClick={() => setMapMode('polygons')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  mapMode === 'polygons'
                    ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                Polygons
              </button>

              <button
                onClick={() => setMapMode('circles')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  mapMode === 'circles'
                    ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                Circles
              </button>
            </div>
          </div>

          <aside className="flex min-h-0 flex-col bg-[#f8f9fc] dark:bg-slate-900">
            <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Thị trường toàn quốc
              </h1>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
              {[hotZones, coolZones].map((group) => {
                const firstItem = group[0];
                if (!firstItem) return null;

                const meta = signalMeta[firstItem.signal];
                const Icon = meta.icon;

                return (
                  <section key={firstItem.signal}>
                    <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                      <Icon size={14} className={meta.changeClass} />
                      <span>{meta.sectionTitle}</span>
                    </div>

                    <div className="space-y-3">
                      {group.slice(0, 2).map((zone) => (
                        <article
                          key={zone.name}
                          className="rounded-xl border border-[#d9dfec] bg-white px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.02)] dark:border-slate-700 dark:bg-slate-800"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[15px] font-black leading-5 text-slate-800 dark:text-white">
                                {zone.name}
                              </p>
                              <p className="mt-1 text-[12px] font-medium text-slate-500 dark:text-slate-300">
                                {zone.subtitle}
                              </p>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className={`text-[14px] font-black ${signalMeta[zone.signal].changeClass}`}>
                                {zone.changeLabel}
                              </p>
                              <p className="mt-1 text-[12px] font-medium text-slate-500 dark:text-slate-300">
                                {zone.priceLabel}
                              </p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
