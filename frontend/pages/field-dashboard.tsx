// frontend/pages/field-dashboard.tsx (フルコード)

import Head from 'next/head';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/components/AuthContainer';
import AuthForm from '@/components/AuthForm';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Link from 'next/link';

// 工事データの型を定義 (顧客名も含む)
interface Project {
    id: string;
    project_name: string;
    status: string;
    customers: {
        name: string;
    } | null;
}

// 現場アプリのメイン画面（工事一覧とタスク表示）
const FieldDashboard: React.FC = () => {
    const { user, role, loading, authReady } = useAuth();
    const router = useRouter();

    const [assignedProjects, setAssignedProjects] = useState<Project[]>([]); // 担当工事一覧
    const [projectLoading, setProjectLoading] = useState(true); // ローディング状態

    // ログアウト処理
    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('ログアウトエラー:', error);
            alert('ログアウト中にエラーが発生しました。');
            return;
        }
        router.replace('/');
    };

    // ロード中のプロジェクトデータを取得する処理
    useEffect(() => {
        const fetchAssignedProjects = async () => {
            if (!authReady || role !== 'field') return;

            // 現場は「進行中」の全工事を担当していると仮定して取得
            // RLSポリシーで SELECT true が設定されているため、全件取得が可能
            const { data, error } = await supabase
                .from('projects')
                .select(`id, project_name, status, customers(name)`) // customers(name)で顧客名を取得 (JOIN)
                .eq('status', '進行中')
                .order('start_date', { ascending: false });

            if (error) {
                console.error('担当工事の取得エラー:', error);
                setAssignedProjects([]);
            } else {
                setAssignedProjects(data || []);
            }
            setProjectLoading(false);
        };
        fetchAssignedProjects();
    }, [authReady, role]);

    // 権限チェック
    if (!authReady) {
        return <div className="p-4">システム準備中...</div>;
    }
    if (!user) {
        return <AuthForm />;
    }
    if (role !== 'field') {
        router.push('/customers');
        return <div className="p-4 text-red-600">この画面は現場作業員専用です。管理画面へ移動中...</div>;
    }

    return (
        <>
            <Head>
                <title>現場アプリ - 統合業務基盤</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </Head>
            <div className="min-h-screen bg-gray-50 p-4 md:p-8">
                <header className="flex justify-between items-center mb-6 border-b pb-4">
                    <h1 className="text-xl font-bold text-blue-700">👷 現場アプリ</h1>
                    <button
                        onClick={handleLogout}
                        className="py-1 px-3 text-sm bg-red-500 text-white rounded-md hover:bg-red-600"
                    >
                        ログアウト
                    </button>
                </header>

                <main>
                    <div className="mb-8 p-4 bg-white rounded-lg shadow-md">
                        <p className="text-gray-600 mb-2">ユーザーID: {user.id.substring(0, 8)}...</p>
                        <h2 className="text-2xl font-semibold mb-4">本日の作業リスト</h2>

                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                            <p className="font-medium text-blue-700 mb-2">タスクが割り当てられている工事:</p>

                            {projectLoading ? (
                                <p className="text-blue-500">工事情報を読み込み中...</p>
                            ) : assignedProjects.length === 0 ? (
                                <p className="text-yellow-600">現在、進行中の工事はありません。</p>
                            ) : (
                                <ul className="space-y-2">
                                    {assignedProjects.map(p => (
                                        <li key={p.id} className="text-sm border-b pb-1 last:border-b-0 last:pb-0 flex justify-between items-center">
                                            <div>
                                                <span className="font-semibold text-gray-800">{p.project_name}</span>
                                                <span className="text-gray-500 block text-xs">({p.customers?.name || '顧客不明'})</span>
                                            </div>

                                            <div className="flex space-x-2">
                                                <Link href={`/chalkboard-entry/${p.id}`}
                                                    className="py-1 px-3 text-xs bg-blue-500 text-white rounded-full hover:bg-blue-600 transition">
                                                    黒板入力へ
                                                </Link>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* PCでの操作案内 */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="w-full py-4 bg-gray-200 text-gray-600 font-bold rounded-lg shadow-lg text-center">
                            上記工事一覧から、入力する工事を選択してください。
                        </div>
                        <Link href="/daily-report"
                            className="block w-full py-4 bg-yellow-500 text-white font-bold rounded-lg shadow-lg hover:bg-yellow-600 transition text-center"
                        >
                            📋 日報を提出
                        </Link>
                    </div>

                </main>
            </div>
        </>
    );
};

export default FieldDashboard;