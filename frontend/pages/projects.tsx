// frontend/pages/projects.tsx (フルコード)

import Head from 'next/head';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/components/AuthContainer';
import AuthForm from '@/components/AuthForm';

// 顧客データの型
interface Customer {
    id: string;
    name: string;
}

// 工事登録フォームコンポーネント
const ProjectForm: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [projectName, setProjectName] = useState('');
    const [contractAmount, setContractAmount] = useState('');
    const [startDate, setStartDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // 顧客一覧を読み込む
    useEffect(() => {
        const fetchCustomers = async () => {
            const { data, error } = await supabase
                .from('customers')
                .select('id, name')
                .order('name', { ascending: true });

            if (error) {
                console.error(error);
                setError('顧客一覧の読み込み中にエラーが発生しました。');
            } else {
                setCustomers(data || []);
                // 顧客がいたら最初の顧客をデフォルト選択
                if (data && data.length > 0) {
                    setSelectedCustomerId(data[0].id);
                }
            }
        };
        fetchCustomers();
    }, []);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        if (!selectedCustomerId) {
            setError('顧客を選択してください。');
            setLoading(false);
            return;
        }

        // データベースに新しい工事を挿入
        const { data: projectData, error: dbError } = await supabase
            .from('projects')
            .insert([{ 
                customer_id: selectedCustomerId, 
                project_name: projectName,
                contract_amount: parseFloat(contractAmount), // 数値型に変換
                start_date: startDate || null // 日付未入力ならNULL
            }])
            .select('id') // ★工事ID (ProjectID) を取得
            .single();

        if (dbError) {
            console.error(dbError);
            setError('工事の登録中にエラーが発生しました。権限やデータベース設定を確認してください。');
        } else if (projectData) {
            setMessage(`新しい工事を正常に登録しました！発行された工事ID: ${projectData.id}`);
            // フォームをクリア
            setProjectName('');
            setContractAmount('');
            setStartDate('');
            // setSelectedCustomerId(customers[0]?.id || ''); // 顧客選択はそのまま
        }
        setLoading(false);
    };

    if (customers.length === 0) {
        return <p className="text-yellow-600">🚨 工事を作成する前に、先に「顧客管理」で顧客情報を登録してください。</p>
    }

    return (
        <div className="p-8 max-w-3xl bg-white rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">新規工事の作成 (工事IDの発行)</h2>
            
            {error && <p className="text-red-600 bg-red-50 p-3 mb-4 rounded">{error}</p>}
            {message && <p className="text-green-600 bg-green-50 p-3 mb-4 rounded">{message}</p>}
            
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. 顧客選択 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">顧客の選択*</label>
                    <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} required 
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50">
                        {customers.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* 2. 工事名 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">工事名*</label>
                    <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} required 
                           className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                
                {/* 3. 契約金額 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">契約金額 (税抜)</label>
                    <input type="number" value={contractAmount} onChange={(e) => setContractAmount(e.target.value)} 
                           className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>

                {/* 4. 開始予定日 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">開始予定日</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} 
                           className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                
                <button type="submit" disabled={loading}
                        className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                            loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                        }`}>
                    {loading ? '登録中...' : '工事を登録し、工事IDを発行'}
                </button>
            </form>
        </div>
    );
};

// メインページ（認証チェックとレイアウト）
const ProjectsPage = () => {
    const { user, role, loading } = useAuth();
    
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
                    <ProjectForm />
                    {/* ★次のステップでここに「工事一覧」を配置 */}
                </main>
            </div>
        </>
    );
};

export default ProjectsPage;