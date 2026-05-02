import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isConfigured: isFirebaseConfigured,
      async login(email: string, password: string) {
        if (!auth) {
          throw new Error('Firebase chưa được cấu hình.');
        }

        await signInWithEmailAndPassword(auth, email, password);
      },
      async register(name: string, email: string, password: string) {
        if (!auth) {
          throw new Error('Firebase chưa được cấu hình.');
        }

        const credential = await createUserWithEmailAndPassword(auth, email, password);

        if (name.trim()) {
          await updateProfile(credential.user, { displayName: name.trim() });
          setUser({ ...credential.user, displayName: name.trim() });
        }
      },
      async logout() {
        if (!auth) {
          throw new Error('Firebase chưa được cấu hình.');
        }

        await signOut(auth);
      },
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth phải được dùng trong AuthProvider.');
  }

  return context;
}
