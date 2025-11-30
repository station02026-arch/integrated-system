import React, { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

// ユーザー情報とセッションに 'role' を追加
interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: string | null;
  loading: boolean;
  authReady: boolean; // ★追加：認証が完了し、roleの取得まで終わったかを示すフラグ
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ロールを取得する非同期関数
const fetchUserRole = async (userId: string): Promise<string | null> => {
  // public.users テーブルから、現在のユーザーIDの role を取得
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
  return data?.role || null;
};

// コンテキストプロバイダー (認証状態をアプリ全体に提供)
export const AuthContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false); // ★追加

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
      }

      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const userRole = await fetchUserRole(currentUser.id);
        setRole(userRole);
      } else {
        setRole(null);
      }

      setLoading(false);
      setAuthReady(true); // ★認証とロールの取得が完了
    };

    getInitialSession();

    // 認証状態の変化をリッスン
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const userRole = await fetchUserRole(currentUser.id);
          setRole(userRole);
        } else {
          setRole(null);
        }

        setLoading(false);
        setAuthReady(true); // ★認証とロールの取得が完了
      }
    );

    // クリーンアップ
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // 認証が完了するまで何も表示しない（白い画面で待つ）
  if (!authReady) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white">
        <p className="text-lg text-gray-500">システム準備中...</p>
      </div>
    );
  }

  // AuthContextを通して、セッションとユーザー情報、roleを渡す
  return (
    <AuthContext.Provider value={{ session, user, role, loading, authReady }}> {/* ★authReady を追加 */}
      {children}
    </AuthContext.Provider>
  );
};

// コンテキストを利用するためのカスタムフック
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthContainer');
  }
  return context;
};