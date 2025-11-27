// frontend/components/CustomerList.tsx (フルコード)

import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';

// TypeScriptで顧客データの型を定義（DBのcustomersテーブルに対応）
interface Customer {
    id: string;
    name: string;
    address: string | null;
    contact_name: string | null;
    created_at: string;
}

const CustomerList: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        setError('');
        
        // データベースから顧客データを全て取得
        const { data, error } = await supabase
            .from('customers')
            .select('*') // 全カラムを取得
            .order('name', { ascending: true }); // 名前順でソート

        if (error) {
            console.error('顧客一覧の取得エラー:', error);
            setError('顧客一覧の取得中にエラーが発生しました。RLSポリシーを確認してください。');
            setLoading(false);
            return;
        }
        
        setCustomers(data || []);
        setLoading(false);
    };

    if (loading) {
        return <p className="text-blue-600">顧客データを読み込み中...</p>;
    }

    if (error) {
        return <p className="text-red-600">エラー: {error}</p>;
    }
    
    // 登録された顧客がいない場合
    if (customers.length === 0) {
        return (
            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700">
                まだ顧客情報が登録されていません。上のフォームから登録してください。
            </div>
        );
    }

    // 顧客一覧をテーブルで表示
    return (
        <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">登録済み顧客一覧 ({customers.length}件)</h2>
            <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">顧客名</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">担当者名</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">住所</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {customers.map((customer) => (
                            <tr key={customer.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.contact_name || '未登録'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.address || '未登録'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono text-xs">{customer.id.substring(0, 8)}...</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CustomerList;