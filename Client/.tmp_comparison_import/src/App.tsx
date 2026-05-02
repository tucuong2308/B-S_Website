import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  User, 
  ChevronRight, 
  Plus, 
  X, 
  TrendingUp, 
  LayoutGrid, 
  ChevronDown,
  Globe,
  Facebook,
  Twitter,
  Instagram,
  MapPin,
  Map as MapIcon
} from 'lucide-react';

// Mock Data for Vietnam Locations
const LOCATIONS = {
  'Hà Nội': {
    'Quận Cầu Giấy': ['Phường Dịch Vọng', 'Phường Yên Hòa', 'Phường Mai Dịch'],
    'Quận Nam Từ Liêm': ['Phường Mỹ Đình 1', 'Phường Mỹ Đình 2', 'Phường Mễ Trì'],
    'Huyện Gia Lâm': ['Thị trấn Trâu Quỳ', 'Xã Đa Tốn', 'Xã Kiêu Kỵ']
  },
  'TP. Hồ Chí Minh': {
    'Quận 1': ['Phường Bến Nghé', 'Phường Bến Thành', 'Phường Đa Kao'],
    'Thành phố Thủ Đức': ['Phường Thảo Điền', 'Phường An Phú', 'Phường Thủ Thiêm'],
    'Quận 7': ['Phường Tân Phong', 'Phường Tân Kiểng', 'Phường Phú Mỹ']
  },
  'Đà Nẵng': {
    'Quận Hải Châu': ['Phường Hải Châu I', 'Phường Hải Châu II', 'Phường Hòa Cường Bắc'],
    'Quận Liên Chiểu': ['Phường Hòa Khánh Bắc', 'Phường Hòa Khánh Nam', 'Phường Hòa Minh']
  }
};

type SelectedArea = {
  id: string;
  province: string;
  district: string;
  ward: string;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('gia-dat');
  const [selectedAreas, setSelectedAreas] = useState<SelectedArea[]>([
    { id: '1', province: 'Hà Nội', district: 'Huyện Gia Lâm', ward: 'Xã Đa Tốn' }
  ]);

  const addArea = () => {
    if (selectedAreas.length < 3) {
      const newId = Math.random().toString(36).substr(2, 9);
      setSelectedAreas([...selectedAreas, { id: newId, province: '', district: '', ward: '' }]);
    }
  };

  const removeArea = (id: string) => {
    setSelectedAreas(selectedAreas.filter(a => a.id !== id));
  };

  const updateArea = (id: string, field: keyof SelectedArea, value: string) => {
    setSelectedAreas(selectedAreas.map(a => {
      if (a.id === id) {
        const updated = { ...a, [field]: value };
        // Reset down-level fields if parent changes
        if (field === 'province') {
          updated.district = '';
          updated.ward = '';
        } else if (field === 'district') {
          updated.ward = '';
        }
        return updated;
      }
      return a;
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <h1 className="text-xl font-extrabold text-primary tracking-tight">Real Estate Analytica</h1>
            <div className="hidden lg:flex items-center gap-8">
              <NavLink label="Trang chủ" active={false} />
              <NavLink label="So sánh" active={true} />
              <NavLink label="Xu hướng thị trường" active={false} />
              <NavLink label="Đã lưu" active={false} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
              <User className="w-5 h-5" />
            </button>
            <button className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-all">
              Đăng nhập
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        {/* Header Section */}
        <section className="mb-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="text-4xl font-bold text-primary mb-2">So sánh Giá Đất Khu vực</h2>
            <p className="text-gray-500 text-lg">Phân tích giá đất chi tiết theo Tỉnh, Quận/Huyện và Phường/Xã.</p>
          </motion.div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
            <div className="flex gap-6 mb-10 border-b border-gray-100 pb-2">
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {selectedAreas.map((area, index) => (
                  <AreaSelectorCard 
                    key={area.id}
                    area={area}
                    index={index}
                    onRemove={() => removeArea(area.id)}
                    onUpdate={(field, value) => updateArea(area.id, field, value)}
                  />
                ))}
                {selectedAreas.length < 3 && (
                  <motion.button 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={addArea}
                    className="group border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-3 p-8 hover:border-emerald-600 hover:bg-emerald-50/30 transition-all aspect-[16/11]"
                  >
                    <div className="w-14 h-14 rounded-full border border-gray-200 flex items-center justify-center group-hover:bg-emerald-700 group-hover:border-emerald-700 transition-all">
                      <Plus className="w-7 h-7 text-gray-400 group-hover:text-white" />
                    </div>
                    <span className="font-bold text-base text-gray-400 group-hover:text-emerald-800 transition-colors">Thêm khu vực so sánh</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Comparison Data */}
        <div className="space-y-16">
          <section>
            <h3 className="text-2xl font-bold text-primary mb-6">Chi tiết Biến động Giá</h3>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden min-h-[460px] flex">
              <div className="w-72 bg-gray-50/50 p-6 flex flex-col gap-10 text-sm font-semibold text-gray-500 border-r border-gray-100">
                <div className="flex items-center gap-2 text-primary"><MapPin className="w-4 h-4"/> Vị trí địa lý</div>
                <div>Giá đất trung bình (m2)</div>
                <div>Tỷ lệ tăng trưởng năm</div>
                <div>Loại đất phổ biến</div>
                <div>Pháp lý hiện trạng</div>
                <div>Hạ tầng khu vực</div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                {selectedAreas.some(a => !a.ward) ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-2">
                      <LayoutGrid className="w-12 h-12 text-emerald-600" />
                    </div>
                    <h4 className="text-xl font-bold">Hãy hoàn tất chọn khu vực</h4>
                    <p className="text-gray-400 text-sm max-w-sm">Chọn Tỉnh, Quận và Phường để chúng tôi có thể truy xuất dữ liệu so sánh chính xác nhất.</p>
                  </div>
                ) : (
                  <div className="w-full flex justify-around">
                    {selectedAreas.map(area => (
                      <div key={area.id} className="flex flex-col gap-10 text-sm font-bold text-primary">
                        <div className="text-emerald-700">{area.ward}</div>
                        <div>45.2 Tr/m2</div>
                        <div className="text-emerald-600">+12.4%</div>
                        <div>Đất ở đô thị</div>
                        <div>Sổ đỏ riêng</div>
                        <div>Đường 12m</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Area Trends Chart Placeholder */}
          <section>
            <h3 className="text-2xl font-bold text-primary mb-6">Biểu đồ Xu hướng Giá</h3>
            <div className="bg-white rounded-2xl border border-gray-100 p-8">
              <div className="flex gap-8 mb-8 border-b border-gray-100 pb-4">
                <button className="font-bold text-emerald-800 border-b-2 border-emerald-800 pb-4">Biến động 12 tháng</button>
                <button className="font-semibold text-gray-400 hover:text-gray-600 pb-4">Dự báo 6 tháng tới</button>
              </div>
              <div className="relative flex flex-col items-center justify-center py-24 bg-gray-50/20 rounded-2xl border border-dashed border-gray-100">
                <div className="flex items-end gap-3 mb-8 opacity-20">
                  <div className="w-16 h-32 bg-emerald-700" />
                  <div className="w-16 h-48 bg-emerald-700" />
                  <div className="w-16 h-40 bg-emerald-700" />
                  <div className="w-16 h-64 bg-emerald-700" />
                </div>
                <div className="text-center">
                  <p className="text-gray-400 font-medium mb-4">Dữ liệu phân tích đang được tổng hợp cho {selectedAreas.length} khu vực</p>
                  <button className="bg-primary text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-emerald-950/20">
                    Xuất báo cáo PDF
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-20 py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1">
              <h2 className="text-lg font-black text-primary mb-4 uppercase tracking-tighter">Real Estate Analytica</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Nền tảng phân tích dữ liệu giá đất hàng đầu Việt Nam, hỗ trợ nhà đầu tư ra quyết định thông minh.
              </p>
              <div className="flex gap-4">
                <SocialIcon Icon={Facebook} />
                <SocialIcon Icon={Twitter} />
                <SocialIcon Icon={Instagram} />
              </div>
            </div>
            
            <FooterList title="Khám phá" items={['Bản đồ giá', 'Báo cáo thị trường', 'Công cụ định giá']} />
            <FooterList title="Pháp lý" items={['Điều khoản sử dụng', 'Chính sách bảo mật']} />
            <FooterList title="Hỗ trợ" items={['Tư vấn đầu tư', 'Hotline: 1900 xxxx']} />
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-gray-100 text-gray-400 text-xs font-bold uppercase tracking-widest gap-4">
            <p>© 2024 Real Estate Analytica. Powered by Data Intelligence.</p>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>Tiếng Việt</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Components
function AreaSelectorCard({ area, index, onRemove, onUpdate }: { 
  area: SelectedArea; 
  index: number; 
  onRemove: () => void;
  onUpdate: (field: keyof SelectedArea, value: string) => void;
}) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white rounded-2xl border-2 border-emerald-50 p-6 shadow-xl shadow-emerald-950/5 relative group"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-bold text-sm">
            {index + 1}
          </div>
          <span className="font-bold text-primary">Khu vực so sánh</span>
        </div>
        {index > 0 && (
          <button onClick={onRemove} className="text-gray-300 hover:text-red-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        <LocationSelect 
          label="Tỉnh / Thành phố" 
          value={area.province}
          options={Object.keys(LOCATIONS)}
          onChange={(v) => onUpdate('province', v)}
        />
        <LocationSelect 
          label="Quận / Huyện" 
          value={area.district}
          options={area.province ? Object.keys(LOCATIONS[area.province as keyof typeof LOCATIONS]) : []}
          disabled={!area.province}
          onChange={(v) => onUpdate('district', v)}
        />
        <LocationSelect 
          label="Phường / Xã" 
          value={area.ward}
          options={area.district ? (LOCATIONS[area.province as keyof typeof LOCATIONS] as any)[area.district] : []}
          disabled={!area.district}
          onChange={(v) => onUpdate('ward', v)}
        />
      </div>

      <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-emerald-700">
          <MapIcon className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wide">Ready for analysis</span>
        </div>
      </div>
    </motion.div>
  );
}

function LocationSelect({ label, value, options, disabled, onChange }: { 
  label: string; 
  value: string; 
  options: string[]; 
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5 flex-1">
      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{label}</label>
      <div className="relative group">
        <select 
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-semibold appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <option value="">Chọn {label.split(' / ')[0]}</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover:text-emerald-600 transition-colors" />
      </div>
    </div>
  );
}

function NavLink({ label, active }: { label: string; active: boolean }) {
  return (
    <a href="#" className={`font-semibold text-sm transition-colors ${active ? 'text-primary' : 'text-gray-500 hover:text-primary'}`}>
      {label}
      {active && <motion.div layoutId="nav-underline" className="h-0.5 bg-primary mt-1 rounded-full" />}
    </a>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 font-bold text-sm transition-all relative ${active ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
    >
      {label}
      {active && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
    </button>
  );
}

function FooterList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h5 className="text-xs font-black uppercase tracking-widest text-primary mb-6">{title}</h5>
      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item}>
            <a href="#" className="text-sm text-gray-500 hover:text-primary transition-colors underline decoration-gray-100 underline-offset-8 hover:decoration-primary">
              {item}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialIcon({ Icon }: { Icon: any }) {
  return (
    <a href="#" className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-all shadow-sm">
      <Icon className="w-5 h-5" />
    </a>
  );
}
