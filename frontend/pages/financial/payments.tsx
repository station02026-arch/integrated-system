import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { supabase } from '@/utils/supabaseClient';

const PaymentsPage = () => {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        setLoading(true);
        // Fetch payments with billing and project info
        // Note: Supabase nested select syntax might vary depending on exact foreign key names
        // Assuming standard naming conventions
        const { data, error } = await supabase
            .from('payments')
            .select(`
                *,
                billings (
                    billing_number,
                    projects (
                        project_name
                    )
                )
            `)
            .order('payment_date', { ascending: false });

        if (error) {
            console.error('Error fetching payments:', error);
        } else {
            setPayments(data || []);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('本当にこの入金記録を削除しますか？')) return;

        setLoading(true);
        const { error } = await supabase
            .from('payments')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting payment:', error);
            alert('削除に失敗しました: ' + error.message);
        } else {
            fetchPayments();
        }
        setLoading(false);
    };

    return (
        <Layout title="入金一覧">
            <div className="p-8">
                <h1 className="text-3xl font-bold mb-8 text-gray-800">入金一覧</h1>

                <div className="bg-white rounded-lg shadow p-6">
                    {loading ? <p>読み込み中...</p> : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">入金日</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">工事名</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">請求番号</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金額</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">方法</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {payments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm text-gray-900">{payment.payment_date}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {payment.billings?.projects?.project_name || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {payment.billings?.billing_number || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                ¥{payment.amount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {payment.method === 'bank_transfer' ? '銀行振込' :
                                                    payment.method === 'cash' ? '現金' :
                                                        payment.method === 'check' ? '小切手' : 'その他'}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleDelete(payment.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    削除
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {payments.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                                入金データがありません。
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default PaymentsPage;
