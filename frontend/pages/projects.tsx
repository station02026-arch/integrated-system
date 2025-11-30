import Head from 'next/head';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/components/AuthContainer';
import AuthForm from '@/components/AuthForm';
import ProjectList from '@/components/ProjectList';
import ProjectForm from '@/components/ProjectForm';

// メインページ（認証チェックとレイアウト）
const ProjectsPage = () => {
    const { user, role, loading } = useAuth();
    const [lastRegisteredId, setLastRegisteredId] = useState('');

    // 工事登録成功時にIDを格納する関数
    const handleProjectRegistered = (projectId: string) => {
        setLastRegisteredId(projectId);
    };

    // 認証情報確認中
    if (loading) {
        return <div className="p-8">認証情報を確認中...</div>;
    }

    // 未ログインの場合はログインフォームを表示
    if (!user) {
        return <AuthForm />;
    }

    // 現場（field）権限の場合はアクセス拒否
    if (role === 'field') {
        return (
            <div className="p-8 text-red-600">
                🚨 アクセス権限がありません。（現場作業員権限のため）
                <button onClick={() => supabase.auth.signOut()} className="mt-4 block py-2 px-4 bg-gray-200 rounded">ログアウト</button>
            </div>
        );
    }

    // 事務・役員などの権限の場合は管理画面を表示
    return (
        <>
            <Head><title>工事管理 - 統合業務基盤</title></Head>
            <div className="flex">
                <Sidebar />
                <main className="flex-grow p-8 bg-gray-50">
                    <h1 className="text-3xl font-bold mb-8 text-gray-800">工事管理モジュール</h1>

                    {/* 登録完了時にIDを渡すハンドラーを組み込む */}
                    <ProjectForm onRegistered={handleProjectRegistered} />

                    {/* 登録されたIDを渡すことで、一覧を自動更新する */}
                    <ProjectList onProjectRegistered={lastRegisteredId} />
                </main>
            </div>
        </>
    );
};

export default ProjectsPage;