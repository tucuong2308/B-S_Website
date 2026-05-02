import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  LayoutGrid,
  Loader2,
  Map as MapIcon,
  MapPin,
  Plus,
  X,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  fetchDistrictAveragePrice,
  fetchDistrictsByProvince,
  fetchProvinceAveragePrice,
  fetchProvinces,
  fetchWardAveragePrice,
  fetchWardsByDistrict,
} from '../services/api';
import type { AdministrativeUnit } from '../types';

type SelectedArea = {
  id: string;
  provinceId: string;
  provinceName: string;
  districtId: string;
  districtName: string;
  wardId: string;
  wardName: string;
};

type ComparisonLevel = 'province' | 'district' | 'ward';

type AreaInsight = {
  level: ComparisonLevel | null;
  avgPrice: number | null;
  benchmarkPrice: number | null;
  yearlyGrowth: string;
  commonType: string;
  legalStatus: string;
  infrastructure: string;
};

const pageTheme = {
  background: '#f8f9ff',
  primary: '#003527',
  primarySoft: '#064e3b',
  accent: '#059669',
  border: '#e5e7eb',
  borderSoft: '#f1f5f9',
  muted: '#6b7280',
  panel: '#ffffff',
  panelMuted: '#f9fafb',
};

const emptyInsight: AreaInsight = {
  level: null,
  avgPrice: null,
  benchmarkPrice: null,
  yearlyGrowth: '--',
  commonType: 'Đang cập nhật',
  legalStatus: 'Đang cập nhật',
  infrastructure: 'Đang cập nhật',
};

const getAreaSelectionLevel = (area: SelectedArea): ComparisonLevel | null => {
  if (area.wardId) {
    return 'ward';
  }

  if (area.districtId) {
    return 'district';
  }

  if (area.provinceId) {
    return 'province';
  }

  return null;
};

const getAreaDisplayName = (area: SelectedArea) => {
  if (area.wardName && area.districtName) {
    return `${area.wardName}, ${area.districtName}`;
  }

  if (area.districtName && area.provinceName) {
    return `${area.districtName}, ${area.provinceName}`;
  }

  return area.provinceName || 'Chưa chọn khu vực';
};

const getAreaLevelLabel = (level: ComparisonLevel | null) => {
  if (level === 'ward') {
    return 'phường/xã';
  }

  if (level === 'district') {
    return 'quận/huyện';
  }

  if (level === 'province') {
    return 'tỉnh/thành phố';
  }

  return 'khu vực';
};

const formatPrice = (value: number | null) => {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return 'Chưa có dữ liệu';
  }

  return `${new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 1,
  }).format(value / 1_000_000)} Tr/m2`;
};

export default function Comparison() {
  const [activeTab, setActiveTab] = useState('gia-dat');
  const [selectedAreas, setSelectedAreas] = useState<SelectedArea[]>([
    {
      id: '1',
      provinceId: '',
      provinceName: '',
      districtId: '',
      districtName: '',
      wardId: '',
      wardName: '',
    },
  ]);
  const [provinces, setProvinces] = useState<AdministrativeUnit[]>([]);
  const [districtOptions, setDistrictOptions] = useState<Record<string, AdministrativeUnit[]>>({});
  const [wardOptions, setWardOptions] = useState<Record<string, AdministrativeUnit[]>>({});
  const [insightsByArea, setInsightsByArea] = useState<Record<string, AreaInsight>>({});
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState<Record<string, boolean>>({});
  const [loadingWards, setLoadingWards] = useState<Record<string, boolean>>({});
  const [loadingInsights, setLoadingInsights] = useState<Record<string, boolean>>({});
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    const loadProvinces = async () => {
      setLoadingProvinces(true);
      setPageError('');

      try {
        const data = await fetchProvinces();
        setProvinces(data);
      } catch (error) {
        setPageError(
          error instanceof Error ? error.message : 'Không thể tải danh sách tỉnh/thành.'
        );
      } finally {
        setLoadingProvinces(false);
      }
    };

    void loadProvinces();
  }, []);

  const addArea = () => {
    if (selectedAreas.length < 3) {
      const newId = crypto.randomUUID();
      setSelectedAreas([
        ...selectedAreas,
        {
          id: newId,
          provinceId: '',
          provinceName: '',
          districtId: '',
          districtName: '',
          wardId: '',
          wardName: '',
        },
      ]);
    }
  };

  const removeArea = (id: string) => {
    setSelectedAreas((current) => current.filter((item) => item.id !== id));
    setDistrictOptions((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setWardOptions((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setInsightsByArea((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const loadDistrictsForArea = async (areaId: string, provinceId: string) => {
    setLoadingDistricts((current) => ({ ...current, [areaId]: true }));

    try {
      const data = await fetchDistrictsByProvince(provinceId);
      setDistrictOptions((current) => ({ ...current, [areaId]: data }));
    } catch {
      setDistrictOptions((current) => ({ ...current, [areaId]: [] }));
    } finally {
      setLoadingDistricts((current) => ({ ...current, [areaId]: false }));
    }
  };

  const loadWardsForArea = async (areaId: string, districtId: string) => {
    setLoadingWards((current) => ({ ...current, [areaId]: true }));

    try {
      const data = await fetchWardsByDistrict(districtId);
      setWardOptions((current) => ({ ...current, [areaId]: data }));
    } catch {
      setWardOptions((current) => ({ ...current, [areaId]: [] }));
    } finally {
      setLoadingWards((current) => ({ ...current, [areaId]: false }));
    }
  };

  const updateArea = async (
    id: string,
    field: 'province' | 'district' | 'ward',
    value: string
  ) => {
    if (field === 'province') {
      const province = provinces.find((item) => item.id === value);

      setSelectedAreas((current) =>
        current.map((area) =>
          area.id === id
            ? {
                ...area,
                provinceId: value,
                provinceName: province?.name ?? '',
                districtId: '',
                districtName: '',
                wardId: '',
                wardName: '',
              }
            : area
        )
      );

      setWardOptions((current) => ({ ...current, [id]: [] }));
      setInsightsByArea((current) => ({ ...current, [id]: emptyInsight }));

      if (value) {
        await loadDistrictsForArea(id, value);
      } else {
        setDistrictOptions((current) => ({ ...current, [id]: [] }));
      }

      return;
    }

    if (field === 'district') {
      const district = (districtOptions[id] ?? []).find((item) => item.id === value);

      setSelectedAreas((current) =>
        current.map((area) =>
          area.id === id
            ? {
                ...area,
                districtId: value,
                districtName: district?.name ?? '',
                wardId: '',
                wardName: '',
              }
            : area
        )
      );

      setInsightsByArea((current) => ({ ...current, [id]: emptyInsight }));

      if (value) {
        await loadWardsForArea(id, value);
      } else {
        setWardOptions((current) => ({ ...current, [id]: [] }));
      }

      return;
    }

    const ward = (wardOptions[id] ?? []).find((item) => item.id === value);

    setSelectedAreas((current) =>
      current.map((area) =>
        area.id === id
          ? {
              ...area,
              wardId: value,
              wardName: ward?.name ?? '',
            }
          : area
      )
    );
  };

  useEffect(() => {
    const areasToFetch = selectedAreas.filter((area) => Boolean(getAreaSelectionLevel(area)));

    areasToFetch.forEach((area) => {
      const level = getAreaSelectionLevel(area);
      const alreadyLoaded = insightsByArea[area.id];
      const isLoading = loadingInsights[area.id];

      if (
        !level ||
        isLoading ||
        (alreadyLoaded &&
          (alreadyLoaded.avgPrice !== null ||
            alreadyLoaded.benchmarkPrice !== null ||
            alreadyLoaded.commonType !== emptyInsight.commonType))
      ) {
        return;
      }

      const loadInsights = async () => {
        setLoadingInsights((current) => ({ ...current, [area.id]: true }));

        try {
          let avgPrice: number | null = null;
          let benchmarkPrice: number | null = null;
          let growth = '--';

          if (level === 'ward') {
            const [wardAvg, districtAvg] = await Promise.all([
              fetchWardAveragePrice(area.wardId),
              fetchDistrictAveragePrice(area.districtId),
            ]);

            avgPrice = wardAvg.avg_price_per_m2;
            benchmarkPrice = districtAvg.avg_price_per_m2;
          } else if (level === 'district') {
            const [districtAvg, provinceAvg] = await Promise.all([
              fetchDistrictAveragePrice(area.districtId),
              fetchProvinceAveragePrice(area.provinceId),
            ]);

            avgPrice = districtAvg.avg_price_per_m2;
            benchmarkPrice = provinceAvg.avg_price_per_m2;
          } else {
            const provinceAvg = await fetchProvinceAveragePrice(area.provinceId);
            avgPrice = provinceAvg.avg_price_per_m2;
          }

          if (avgPrice && benchmarkPrice && benchmarkPrice > 0) {
            growth = `${(((avgPrice - benchmarkPrice) / benchmarkPrice) * 100).toFixed(1)}%`;
          }

          setInsightsByArea((current) => ({
            ...current,
            [area.id]: {
              level,
              avgPrice,
              benchmarkPrice,
              yearlyGrowth:
                growth === '--'
                  ? '--'
                  : `${Number(growth.replace('%', '')) >= 0 ? '+' : ''}${growth}`,
              commonType: activeTab === 'gia-dat' ? 'Đất ở đô thị' : 'Nhà phố liền kề',
              legalStatus: 'Theo dữ liệu hành chính',
              infrastructure: `${getAreaDisplayName(area)} đang theo dõi`,
            },
          }));
        } catch {
          setInsightsByArea((current) => ({ ...current, [area.id]: emptyInsight }));
        } finally {
          setLoadingInsights((current) => ({ ...current, [area.id]: false }));
        }
      };

      void loadInsights();
    });
  }, [activeTab, insightsByArea, loadingInsights, selectedAreas]);

  const readyToCompare = useMemo(
    () => selectedAreas.every((area) => Boolean(getAreaSelectionLevel(area))),
    [selectedAreas]
  );

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: pageTheme.background,
        fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <section className="mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h2
              className="mb-2 text-4xl font-bold"
              style={{
                color: pageTheme.primary,
                fontFamily: '"Manrope", "Inter", sans-serif',
              }}
            >
              So sánh Giá Đất Khu vực
            </h2>
            <p className="text-lg" style={{ color: pageTheme.muted }}>
              Chọn tỉnh, quận/huyện hoặc phường/xã. Hệ thống sẽ so sánh theo cấp sâu nhất bạn
              đã chọn cho từng khu vực.
            </p>
          </motion.div>

          <div
            className="rounded-2xl border p-6 shadow-sm md:p-8"
            style={{ backgroundColor: pageTheme.panel, borderColor: pageTheme.border }}
          >
            <div className="mb-10 flex gap-6 border-b pb-2" style={{ borderColor: pageTheme.border }}>
              <TabButton
                label="Giá đất nền"
                active={activeTab === 'gia-dat'}
                onClick={() => setActiveTab('gia-dat')}
              />
              <TabButton
                label="Giá nhà phố"
                active={activeTab === 'nha-pho'}
                onClick={() => setActiveTab('nha-pho')}
              />
            </div>

            {pageError ? (
              <div
                className="mb-6 rounded-xl border px-4 py-3 text-sm"
                style={{
                  backgroundColor: '#fef2f2',
                  borderColor: '#fecaca',
                  color: '#b91c1c',
                }}
              >
                {pageError}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {selectedAreas.map((area, index) => (
                  <AreaSelectorCard
                    key={area.id}
                    area={area}
                    index={index}
                    provinces={provinces}
                    districts={districtOptions[area.id] ?? []}
                    wards={wardOptions[area.id] ?? []}
                    insight={insightsByArea[area.id] ?? emptyInsight}
                    loadingProvinces={loadingProvinces}
                    loadingDistricts={Boolean(loadingDistricts[area.id])}
                    loadingWards={Boolean(loadingWards[area.id])}
                    loadingInsight={Boolean(loadingInsights[area.id])}
                    onRemove={() => removeArea(area.id)}
                    onUpdate={updateArea}
                  />
                ))}
                {selectedAreas.length < 3 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={addArea}
                    className="group flex aspect-[16/11] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 transition-all"
                    style={{
                      borderColor: pageTheme.border,
                      color: pageTheme.muted,
                      backgroundColor: pageTheme.panel,
                    }}
                  >
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-full border transition-all"
                      style={{ borderColor: pageTheme.border }}
                    >
                      <Plus className="w-7 h-7" />
                    </div>
                    <span className="font-bold text-base">Thêm khu vực so sánh</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        <div className="space-y-16">
          <section>
            <h3
              className="mb-6 text-2xl font-bold"
              style={{
                color: pageTheme.primary,
                fontFamily: '"Manrope", "Inter", sans-serif',
              }}
            >
              Chi tiết Biến động Giá
            </h3>
            <div
              className="flex min-h-[460px] overflow-hidden rounded-2xl border"
              style={{ backgroundColor: pageTheme.panel, borderColor: pageTheme.border }}
            >
              <div
                className="hidden w-72 border-r p-6 lg:flex lg:flex-col lg:gap-10"
                style={{
                  backgroundColor: pageTheme.panelMuted,
                  borderColor: pageTheme.border,
                  color: pageTheme.muted,
                }}
              >
                <div className="flex items-center gap-2 font-semibold" style={{ color: pageTheme.primary }}>
                  <MapPin className="w-4 h-4" />
                  Vị trí địa lý
                </div>
                <div className="text-sm font-semibold">Giá đất trung bình (m2)</div>
                <div className="text-sm font-semibold">So sánh cấp trên</div>
                <div className="text-sm font-semibold">Loại hình mặc định</div>
                <div className="text-sm font-semibold">Pháp lý hiện trạng</div>
                <div className="text-sm font-semibold">Ghi chú hạ tầng</div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                {!readyToCompare ? (
                  <div className="flex flex-col items-center gap-4">
                    <div
                      className="mb-2 flex h-24 w-24 items-center justify-center rounded-full"
                      style={{ backgroundColor: '#ecfdf5' }}
                    >
                      <LayoutGrid className="w-12 h-12" style={{ color: pageTheme.accent }} />
                    </div>
                    <h4
                      className="text-xl font-bold"
                      style={{ fontFamily: '"Manrope", "Inter", sans-serif', color: pageTheme.primary }}
                    >
                      Hãy hoàn tất chọn khu vực
                    </h4>
                    <p className="max-w-sm text-sm" style={{ color: pageTheme.muted }}>
                      Bạn có thể so sánh theo tỉnh, quận hoặc phường. Hệ thống sẽ dùng cấp sâu
                      nhất mà bạn đã chọn cho từng khu vực.
                    </p>
                  </div>
                ) : (
                  <div className="w-full flex flex-col gap-10 lg:flex-row lg:justify-around">
                    {selectedAreas.map((area) => {
                      const insight = insightsByArea[area.id] ?? emptyInsight;
                      const loading = loadingInsights[area.id];

                      return (
                        <div
                          key={area.id}
                          className="flex flex-col gap-10 text-sm font-bold"
                          style={{ color: pageTheme.primary }}
                        >
                          <div style={{ color: pageTheme.accent }}>{getAreaDisplayName(area)}</div>
                          <div>{loading ? 'Đang tải...' : formatPrice(insight.avgPrice)}</div>
                          <div style={{ color: pageTheme.accent }}>
                            {loading ? 'Đang tải...' : insight.yearlyGrowth}
                          </div>
                          <div>{insight.commonType}</div>
                          <div>{insight.legalStatus}</div>
                          <div>{insight.infrastructure}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section>
            <h3
              className="mb-6 text-2xl font-bold"
              style={{
                color: pageTheme.primary,
                fontFamily: '"Manrope", "Inter", sans-serif',
              }}
            >
              Biểu đồ Xu hướng Giá
            </h3>
            <div
              className="rounded-2xl border p-8"
              style={{ backgroundColor: pageTheme.panel, borderColor: pageTheme.border }}
            >
              <div className="mb-8 flex gap-8 border-b pb-4" style={{ borderColor: pageTheme.border }}>
                <button
                  className="border-b-2 pb-4 font-bold"
                  style={{ borderColor: pageTheme.primarySoft, color: pageTheme.primarySoft }}
                >
                  Biến động hiện tại
                </button>
                <button className="pb-4 font-semibold" style={{ color: pageTheme.muted }}>
                  Theo dõi theo nhóm khu vực
                </button>
              </div>
              <div
                className="relative flex flex-col items-center justify-center rounded-2xl border border-dashed py-24"
                style={{ backgroundColor: '#fbfcff', borderColor: pageTheme.border }}
              >
                <div className="mb-8 flex items-end gap-3 opacity-25">
                  {selectedAreas.map((area) => {
                    const value = insightsByArea[area.id]?.avgPrice ?? 0;
                    const height = value > 0 ? Math.max(96, Math.min(256, value / 1_000_000)) : 96;

                    return (
                      <div
                        key={area.id}
                        className="w-16"
                        style={{ height, backgroundColor: pageTheme.primarySoft }}
                      />
                    );
                  })}
                </div>
                <div className="text-center">
                  <p className="mb-4 font-medium" style={{ color: pageTheme.muted }}>
                    Biểu đồ đang phản ánh mức giá hiện có của {selectedAreas.length} khu vực
                  </p>
                  <button
                    className="rounded-xl px-10 py-3 font-bold text-white shadow-lg"
                    style={{
                      backgroundColor: pageTheme.primary,
                      boxShadow: '0 18px 40px rgba(6, 78, 59, 0.18)',
                    }}
                  >
                    Xuất báo cáo PDF
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function AreaSelectorCard({
  area,
  index,
  provinces,
  districts,
  wards,
  insight,
  loadingProvinces,
  loadingDistricts,
  loadingWards,
  loadingInsight,
  onRemove,
  onUpdate,
}: {
  area: SelectedArea;
  index: number;
  provinces: AdministrativeUnit[];
  districts: AdministrativeUnit[];
  wards: AdministrativeUnit[];
  insight: AreaInsight;
  loadingProvinces: boolean;
  loadingDistricts: boolean;
  loadingWards: boolean;
  loadingInsight: boolean;
  onRemove: () => void;
  onUpdate: (id: string, field: 'province' | 'district' | 'ward', value: string) => Promise<void>;
}) {
  const selectedLevel = getAreaSelectionLevel(area);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative rounded-2xl border-2 p-6 shadow-xl"
      style={{
        backgroundColor: pageTheme.panel,
        borderColor: '#ecfdf5',
        boxShadow: '0 20px 40px rgba(6, 78, 59, 0.06)',
      }}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: pageTheme.primarySoft }}
          >
            {index + 1}
          </div>
          <span className="font-bold" style={{ color: pageTheme.primary }}>
            Khu vực so sánh
          </span>
        </div>
        {index > 0 && (
          <button onClick={onRemove} className="transition-colors" style={{ color: '#d1d5db' }}>
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        <LocationSelect
          label="Tỉnh / Thành phố"
          value={area.provinceId}
          options={provinces}
          loading={loadingProvinces}
          onChange={(value) => void onUpdate(area.id, 'province', value)}
        />
        <LocationSelect
          label="Quận / Huyện"
          value={area.districtId}
          options={districts}
          disabled={!area.provinceId}
          loading={loadingDistricts}
          onChange={(value) => void onUpdate(area.id, 'district', value)}
        />
        <LocationSelect
          label="Phường / Xã"
          value={area.wardId}
          options={wards}
          disabled={!area.districtId}
          loading={loadingWards}
          onChange={(value) => void onUpdate(area.id, 'ward', value)}
        />
      </div>

      <div
        className="mt-6 rounded-xl border px-4 py-3"
        style={{ borderColor: pageTheme.borderSoft, backgroundColor: pageTheme.panelMuted }}
      >
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide">
          <div className="flex items-center gap-2" style={{ color: pageTheme.accent }}>
            <MapIcon className="w-4 h-4" />
            Ready for analysis
          </div>
          {loadingInsight ? (
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: pageTheme.accent }} />
          ) : null}
        </div>
        <p className="mt-3 text-sm font-semibold" style={{ color: pageTheme.primary }}>
          {getAreaDisplayName(area)}
        </p>
        <p className="mt-1 text-sm" style={{ color: pageTheme.muted }}>
          {selectedLevel
            ? `Đang so sánh theo cấp ${getAreaLevelLabel(selectedLevel)}`
            : 'Chọn tỉnh, quận hoặc phường để bắt đầu so sánh'}
        </p>
        {selectedLevel ? (
          <p className="mt-3 text-sm font-bold" style={{ color: pageTheme.primarySoft }}>
            Giá trung bình: {formatPrice(insight.avgPrice)}
          </p>
        ) : null}
      </div>
    </motion.div>
  );
}

function LocationSelect({
  label,
  value,
  options,
  disabled,
  loading,
  onChange,
}: {
  label: string;
  value: string;
  options: AdministrativeUnit[];
  disabled?: boolean;
  loading?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5 flex-1">
      <label className="ml-1 text-[10px] font-black uppercase tracking-widest" style={{ color: pageTheme.muted }}>
        {label}
      </label>
      <div className="relative group">
        <select
          value={value}
          disabled={disabled || loading}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            backgroundColor: pageTheme.panelMuted,
            borderColor: pageTheme.border,
            color: pageTheme.primary,
          }}
        >
          <option value="">{loading ? 'Đang tải...' : `Chọn ${label.split(' / ')[0]}`}</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.prefix ? `${opt.prefix} ${opt.name}` : opt.name}
            </option>
          ))}
        </select>
        {loading ? (
          <Loader2
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin"
            style={{ color: pageTheme.muted }}
          />
        ) : (
          <ChevronDown
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors"
            style={{ color: pageTheme.muted }}
          />
        )}
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative px-4 py-2 text-sm font-bold transition-all"
      style={{ color: active ? pageTheme.primary : pageTheme.muted }}
    >
      {label}
      {active && (
        <motion.div
          layoutId="tab-underline"
          className="absolute bottom-0 left-0 right-0 h-1 rounded-t-full"
          style={{ backgroundColor: pageTheme.primary }}
        />
      )}
    </button>
  );
}
