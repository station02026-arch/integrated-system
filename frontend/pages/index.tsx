// frontend/pages/index.tsx (フルコード - 最終修正版)

import Head from 'next/head'
import AuthForm from '@/components/AuthForm'
import { useAuth } from '@/components/AuthContainer' 
import { supabase } from '@/utils/supabaseClient'
import { useRouter } from 'next/router';

const HomePage = () => {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  // 認証情報の取得中
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-lg">認証情報を確認中...</p>
      </div>
    );
  }
  
  // ユーザーがログインしていない場合 → 認証フォームを表示
  if (!user) {
    return (
      <>
        <Head><title>ログイン - 統合業務基盤</title></Head>
        <AuthForm />
      </>
    );
  }

  // ログイン済みだが role の取得がまだの場合（ここで待機する）
  // AuthContainerで authReady を使って待機するロジックに変更したため、ここは簡易化
  if (!role) {
     return (
        <div className="flex justify-center items-center min-h-screen">
            <p className="text-lg text-gray-500">ユーザー権限情報を最終確認中...</p>
        </div>
     );
  }

  // 権限(role)に応じて画面を振り分ける
  if (role === 'field') {
    // 現場（field）権限の場合は、専用のダッシュボードに強制遷移 (履歴に残さないreplaceを使用)
    // ★修正: replace を使用
    router.replace('/field-dashboard'); 
  } else {
    // field 以外の全てのロールは顧客管理画面に強制遷移 (履歴に残さないreplaceを使用)
    // ★修正: replace を使用
    router.replace('/customers'); 
  }
  
  // リダイレクト中であることを表示
  return <div className="p-8">権限を確認し、専用画面へ移動中...</div>;
};

export default HomePage;