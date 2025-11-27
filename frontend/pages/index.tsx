// frontend/pages/index.tsx (フルコード - リダイレクト処理に修正)

import Head from 'next/head'
import AuthForm from '@/components/AuthForm'
import { useAuth } from '@/components/AuthContainer' 
import { supabase } from '@/utils/supabaseClient'
import { useRouter } from 'next/router'; // ★追加

// 現場作業員向けのダッシュボード（骨組み） - このページでは使わないため削除
// const FieldDashboard = () => { ... } 
// 管理者向けのダッシュボード（骨組み） - このページでは使わないため削除
// const AdminDashboard = () => { ... }


const HomePage = () => {
  const { user, role, loading } = useAuth();
  const router = useRouter(); // ★追加

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

  // ログイン済みだが role の取得がまだの場合
  if (!role) {
     return (
        <div className="flex justify-center items-center min-h-screen">
            <p className="text-lg text-red-600">🚨 ユーザー権限情報(role)を取得できませんでした。データベースを確認してください。</p>
            <button onClick={() => supabase.auth.signOut()}>再ログイン</button>
        </div>
     );
  }

  // 権限(role)に応じて画面を振り分ける
  if (role === 'field') {
    // 現場（field）権限の場合は、専用のダッシュボードにリダイレクト
    return (
        <div className="p-8 text-blue-600">
            現場ユーザーとしてログインしました。専用画面に移動します...
            {/* ここでrouter.push('/field-dashboard')などを行うが、一旦メッセージ表示に留める */}
            <button onClick={() => supabase.auth.signOut()}>ログアウト</button>
        </div>
    );
  } else {
    // field 以外の全てのロールは顧客管理画面にリダイレクト
    router.push('/customers'); // ★顧客管理画面に強制遷移
    return <div className="p-8">管理画面へ移動中...</div>;
  }
};

export default HomePage;