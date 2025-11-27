// frontend/pages/customers.tsx (フルコード)

import Head from 'next/head';
import { useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/components/AuthContainer';
import AuthForm from '@/components/AuthForm';
import CustomerList from '@/components/CustomerList'; // ★追加

// 顧客登録フォームコンポーネント
const CustomerForm: React.FC<{ onRegistered: () => void }> = ({ onRegistered }) => {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [contactName, setContactName] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        // データベースに新しい顧客を挿入
        const { error: dbError } = await supabase
            .from('customers')
            .insert([{ name, address, contact_name: contactName }]);

        if (dbError) {
            console.error(dbError);
            setError('顧客の登録中にエラーが発生しました。権限やデータベース設定を確認してください。');
        } else {
            setMessage(`顧客「${name}」を正常に登録しました。`);
            // フォームをクリア
            setName('');
            setAddress('');
            setContactName('');
            
            onRegistered(); // ★登録完了後、親コンポーネントに通知
        }
        setLoading(false);
    };

    return (
        <div className="p-8 max-w-2xl bg-white rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">新規顧客の登録</h2>
            
            {error && <p className="text-red-600 bg-red-50 p-3 mb-4 rounded">{error}</p>}
            {message && <p className="text-green-600 bg-green-50 p-3 mb-4 rounded">{message}</p>}
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">顧客名*</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required 
                           className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">住所</label>
                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                           className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">担当者名</label>
                    <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)}
                           className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
                
                <button type="submit" disabled={loading}
                        className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                            loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                        }`}>
                    {loading ? '登録中...' : '顧客情報を登録'}
                </button>
            </form>
        </div>
    );
};

// メインページ（認証チェックとレイアウト）
const CustomersPage = () => {
    const { user, role, loading } = useAuth();
    const [registerKey, setRegisterKey] = useState(0); // ★状態変数: 顧客登録が成功したらこれを更新

    // 顧客登録成功時に呼び出す関数
    const handleCustomerRegistered = () => {
        setRegisterKey(prev => prev + 1); // キーを更新してCustomerListを再読み込みさせる
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
            <Head><title>顧客管理 - 統合業務基盤</title></Head>
            <div className="flex">
                <Sidebar />
                <main className="flex-grow p-8 bg-gray-50">
                    <h1 className="text-3xl font-bold mb-8 text-gray-800">顧客管理モジュール</h1>
                    
                    {/* ★登録完了時に一覧を更新するハンドラーを渡す */}
                    <CustomerForm onRegistered={handleCustomerRegistered} /> 
                    
                    {/* ★登録キーを渡すことで、登録完了時に一覧が自動更新される */}
                    <CustomerList onCustomerRegistered={registerKey} /> 
                </main>
            </div>
        </>
    );
};

export default CustomersPage;