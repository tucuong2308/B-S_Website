import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Building2, LoaderCircle, Lock, Mail, User } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { register, user, loading, isConfigured } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true });
    }
  }, [loading, navigate, user]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!isConfigured) {
      setError('Firebase chưa được cấu hình. Hãy thêm biến môi trường trước khi đăng ký.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      setIsSubmitting(true);
      await register(name.trim(), email.trim(), password);
      navigate('/', { replace: true });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Không thể tạo tài khoản lúc này.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <main className="max-w-md mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="bg-primary p-3 rounded-2xl text-white mb-4">
              <Building2 size={32} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Tạo tài khoản mới</h1>
            <p className="text-sm text-slate-500 mt-2 text-center">
              Bắt đầu hành trình định giá bất động sản thông minh
            </p>
          </div>

          {!isConfigured && (
            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 p-4 rounded-xl text-sm font-medium mb-6">
              Firebase chưa được cấu hình. Hãy thêm `VITE_FIREBASE_*` vào môi trường để bật đăng ký.
            </div>
          )}

          {error && (
            <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 p-4 rounded-xl text-sm font-medium mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                Họ và tên
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm"
                  placeholder="Nguyễn Văn A"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm"
                  placeholder="Tối thiểu 6 ký tự"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm"
                  placeholder="Nhập lại mật khẩu"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? <LoaderCircle size={18} className="animate-spin" /> : null}
              <span>{isSubmitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}</span>
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-primary font-bold hover:underline">
              Đăng nhập ngay
            </Link>
          </p>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
