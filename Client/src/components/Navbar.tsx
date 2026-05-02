import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Building2,
  ChevronDown,
  LogIn,
  LogOut,
  User,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      setIsMenuOpen(false);
      navigate('/');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const userLabel = user?.displayName || user?.email || 'Tài khoản';
  const isActive = (path: string) => location.pathname === path;
  const navClassName = (path: string) =>
    `text-[15px] font-semibold transition-colors ${
      isActive(path)
        ? 'text-[#2563eb]'
        : 'text-slate-800 hover:text-[#2563eb] dark:text-slate-300'
    }`;

  return (
    <header className="sticky top-0 z-[2000] flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 md:px-20">
      <Link to="/" className="flex items-center gap-3 text-[#2563eb]">
        <div className="rounded-lg bg-[#2563eb] p-2 text-white">
          <Building2 size={24} />
        </div>
        <h2 className="text-[1.7rem] font-black leading-tight tracking-tight text-slate-950 dark:text-white">
          PropVal
        </h2>
      </Link>

      <div className="flex flex-1 items-center justify-end gap-8">
        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/" className={navClassName('/')}>
            Định giá
          </Link>
          <Link to="/analysis" className={navClassName('/analysis')}>
            Phân tích
          </Link>
          <Link to="/comparison" className={navClassName('/comparison')}>
            So sánh
          </Link>
          <Link to="/news" className={navClassName('/news')}>
            Tin tức
          </Link>
          <Link to="/chat" className={navClassName('/chat')}>
            Chatbot
          </Link>
          <a
            href="#"
            className="text-[15px] font-semibold text-slate-800 transition-colors hover:text-[#2563eb] dark:text-slate-300"
          >
            Về chúng tôi
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-full border border-[#2563eb]/10 bg-white/75 p-1 transition-all hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563eb]/10">
                <User className="text-[#2563eb]" size={20} />
              </div>
              <div className="hidden text-left sm:block">
                <p className="max-w-[140px] truncate text-sm font-bold text-slate-950 dark:text-white">
                  {loading ? 'Đang tải...' : userLabel}
                </p>
              </div>
              <ChevronDown
                size={16}
                className={`text-slate-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 z-[2010] mt-2 w-64 rounded-2xl border border-[#2563eb]/10 bg-white py-2 shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900"
                >
                  {user ? (
                    <>
                      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {user.displayName || 'Người dùng PropVal'}
                        </p>
                        <p className="truncate text-xs text-slate-500">{user.email}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <LogOut size={18} />
                        {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
                      </button>
                    </>
                  ) : (
                    <div className="py-1">
                      <Link
                        to="/login"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <LogIn size={18} />
                        Đăng nhập
                      </Link>
                      <Link
                        to="/register"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <UserPlus size={18} />
                        Đăng ký tài khoản
                      </Link>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <Link
          to="/"
          className="hidden h-11 min-w-[128px] cursor-pointer items-center justify-center rounded-lg bg-[#1e036e] px-5 text-[15px] font-bold tracking-wide text-white transition-all hover:brightness-110 lg:flex"
        >
          Định giá ngay
        </Link>
      </div>
    </header>
  );
}
