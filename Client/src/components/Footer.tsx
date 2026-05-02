import { Building2, Send } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 pt-20 pb-10">
      <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
        <div className="col-span-1 md:col-span-1">
          <div className="flex items-center gap-3 text-primary mb-6">
            <Building2 size={24} />
            <h2 className="text-slate-900 dark:text-white text-xl font-bold">PropVal</h2>
          </div>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            Nền tảng công nghệ định giá bất động sản hàng đầu Việt Nam, giúp người dùng đưa ra quyết định mua bán thông minh hơn.
          </p>
        </div>
        
        <div>
          <h4 className="font-bold mb-6 text-slate-900 dark:text-white">Công ty</h4>
          <ul className="space-y-4 text-slate-600 dark:text-slate-400">
            <li><a className="hover:text-primary" href="#">Về chúng tôi</a></li>
            <li><a className="hover:text-primary" href="#">Tuyển dụng</a></li>
            <li><a className="hover:text-primary" href="#">Báo chí</a></li>
            <li><a className="hover:text-primary" href="#">Liên hệ</a></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-bold mb-6 text-slate-900 dark:text-white">Dịch vụ</h4>
          <ul className="space-y-4 text-slate-600 dark:text-slate-400">
            <li><a className="hover:text-primary" href="#">Định giá nhà đất</a></li>
            <li><a className="hover:text-primary" href="#">Dữ liệu thị trường</a></li>
            <li><a className="hover:text-primary" href="#">Dành cho môi giới</a></li>
            <li><a className="hover:text-primary" href="#">API Dữ liệu</a></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-bold mb-6 text-slate-900 dark:text-white">Bản tin</h4>
          <p className="text-slate-500 dark:text-slate-400 mb-4 text-sm">Đăng ký nhận báo cáo thị trường hàng tuần.</p>
          <div className="flex gap-2">
            <input 
              className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" 
              placeholder="Email của bạn" 
              type="email" 
            />
            <button className="bg-primary text-white p-2 rounded-lg">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="max-w-[1200px] mx-auto px-6 border-t border-slate-100 dark:border-slate-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-slate-400 text-sm">© 2024 PropVal. Tất cả quyền được bảo lưu.</p>
        <div className="flex gap-6 text-slate-400 text-sm">
          <a className="hover:text-primary" href="#">Điều khoản</a>
          <a className="hover:text-primary" href="#">Bảo mật</a>
          <a className="hover:text-primary" href="#">Cookie</a>
        </div>
      </div>
    </footer>
  );
}
