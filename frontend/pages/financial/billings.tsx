import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import BillingManager from '../../components/financial/BillingManager';
import { supabase } from '@/utils/supabaseClient';

const BillingsPage = () => {
    // We want to list ALL billings.
    // BillingManager currently takes a projectId.
    // If we want to list all, we need to modify BillingManager or create a new list component.
    // BillingManager was modified to handle optional projectId and list billings if projectId is provided.
    // But it doesn't list ALL billings if no projectId is provided (it asks to select one).
    // The user wants a "Billing List" in the sidebar.
    // I should probably create a specific "AllBillingsList" component or modify BillingManager to support "All" mode.
    // For now, I'll create a simple list view here similar to EstimatesContractsPage.

    const [billings, setBillings] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchBillings();
    }, []);

    const fetchBillings = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('billings')
            .select('*, projects(project_name)')
            .order('issue_date', { ascending: false });
        setBillings(data || []);
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('本当に削除しますか？この操作は取り消せません。')) return;

        setLoading(true);
        const { error } = await supabase
            .from('billings')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting:', error);
            alert('削除に失敗しました: ' + error.message);
        } else {
            fetchBillings();
        }
        setLoading(false);
    };

    return (
        <Layout title="請求書一覧">
            <div className="p-8">
                <h1 className="text-3xl font-bold mb-8 text-gray-800">請求書一覧</h1>

                <div className="bg-white rounded-lg shadow p-6">
                    {loading ? <p>読み込み中...</p> : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">請求番号</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">工事名</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">発行日</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金額</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {billings.map((billing) => (
                                    <tr key={billing.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{billing.billing_number}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{billing.projects?.project_name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{billing.issue_date}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">¥{billing.total_amount.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${billing.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                    billing.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'}`}>
                                                {billing.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">
                                            {/* Link to Project Detail's Billing Tab? Or open modal? */}
                                            {/* For simplicity, link to project detail */}
                                            <a href={`/projects/${billing.project_id}?tab=billing`} className="text-indigo-600 hover:text-indigo-900">
                                                詳細
                                            </a>
                                            <button
                                                onClick={() => handleDelete(billing.id)}
                                                className="text-red-600 hover:text-red-900 ml-4"
                                            >
                                                削除
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default BillingsPage;
