// frontend/components/AuthContainer.tsx (フルコード)

import React, { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

// ユーザー情報とセッションに 'role' を追加
interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: string | null; // ★追加：ユーザーの権限を格納
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ロールを取得する非同期関数
const fetchUserRole = async (userId: string): Promise<string | null> => {
    // public.users テーブルから、現在のユーザーIDの role を取得
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single(); // 1件だけ取得

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
  const [role, setRole] = useState<string | null>(null); // ★追加：roleの状態
  const [loading, setLoading] = useState(true);

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
          // ログインしている場合、追加で role を取得
          const userRole = await fetchUserRole(currentUser.id);
          setRole(userRole);
      } else {
          setRole(null);
      }
      
      setLoading(false);
    };

    getInitialSession();

    // 認証状態の変化をリッスン
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => { // ★async に変更
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
            // 状態が変更されたら role を再取得
            const userRole = await fetchUserRole(currentUser.id);
            setRole(userRole);
        } else {
            setRole(null);
        }
        
        setLoading(false);
      }
    );

    // クリーンアップ
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // AuthContextを通して、セッションとユーザー情報、roleを渡す
  return (
    <AuthContext.Provider value={{ session, user, role, loading }}> {/* ★role を追加 */}
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