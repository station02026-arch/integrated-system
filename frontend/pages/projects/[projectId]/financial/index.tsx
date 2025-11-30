import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../../components/Layout';
import BillingManager from '../../../../components/financial/BillingManager';
import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';

const FinancialDashboard = () => {
    const router = useRouter();
    const { projectId } = router.query;

    const [activeTab, setActiveTab] = useState('billings');
    const [summary, setSummary] = useState({
        totalEstimate: 0,
        totalContract: 0,
        totalBilled: 0,
        totalPaid: 0
    });
    const [estimates, setEstimates] = useState<any[]>([]);
    const [contracts, setContracts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (projectId) {
            fetchFinancialData();
        }
    }, [projectId]);

    const fetchFinancialData = async () => {
        setLoading(true);
        try {
            // Fetch Estimates
            const { data: estData } = await supabase
                .from('estimates')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            // Fetch Contracts
            const { data: conData } = await supabase
                .from('contracts')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            // Fetch Billings
            const { data: billData } = await supabase
                .from('billings')
                .select('*')
                .eq('project_id', projectId);

            // Fetch Payments
            // We need to fetch payments linked to the billings of this project
            // Or we can fetch payments and filter by billing_id in (billings of this project)
            // Supabase join: payments inner join billings on billing_id
            const { data: payData } = await supabase
                .from('payments')
                .select('*, billings!inner(project_id)')
                .eq('billings.project_id', projectId);

            setEstimates(estData || []);
            setContracts(conData || []);

            // Calculate Totals
            const totalEst = estData?.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.total_amount, 0) || 0;
            const totalCon = conData?.filter(c => c.status === 'signed').reduce((sum, c) => sum + c.contract_amount, 0) || 0;
            const totalBil = billData?.filter(b => b.status !== 'draft').reduce((sum, b) => sum + b.total_amount, 0) || 0; // Exclude draft?
            const totalPay = payData?.reduce((sum, p) => sum + p.amount, 0) || 0;

            setSummary({
                totalEstimate: totalEst,
                totalContract: totalCon,
                totalBilled: totalBil,
                totalPaid: totalPay
            });

        } catch (error) {
            console.error('Error fetching financial data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!projectId) return <Layout><div>読み込み中...</div></Layout>;

    return (
        <Layout title="プロジェクト収支管理">
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">プロジェクト収支管理</h1>
                    <Link href={`/project-detail/${projectId}`} className="text-indigo-600 hover:text-indigo-800">
                        ← 工事詳細に戻る
                    </Link>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
                        <p className="text-sm text-gray-500 mb-1">見積金額 (承認済)</p>
                        <p className="text-xl font-bold text-gray-800">¥{summary.totalEstimate.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
                        <p className="text-sm text-gray-500 mb-1">契約金額 (締結済)</p>
                        <p className="text-xl font-bold text-gray-800">¥{summary.totalContract.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
                        <p className="text-sm text-gray-500 mb-1">請求済み金額</p>
                        <p className="text-xl font-bold text-gray-800">¥{summary.totalBilled.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-indigo-500">
                        <p className="text-sm text-gray-500 mb-1">入金済み金額</p>
                        <p className="text-xl font-bold text-gray-800">¥{summary.totalPaid.toLocaleString()}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow min-h-[500px]">
                    <div className="flex border-b border-gray-200">
                        <button
                            className={`py-3 px-6 font-medium ${activeTab === 'billings' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('billings')}
                        >
                            請求・入金 (Billings & Payments)
                        </button>
                        <button
                            className={`py-3 px-6 font-medium ${activeTab === 'contracts' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('contracts')}
                        >
                            契約 (Contracts)
                        </button>
                        <button
                            className={`py-3 px-6 font-medium ${activeTab === 'estimates' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('estimates')}
                        >
                            見積 (Estimates)
                        </button>
                    </div>

                    <div className="p-6">
                        {activeTab === 'billings' && (
                            <BillingManager projectId={projectId as string} />
                        )}

                        {activeTab === 'contracts' && (
                            <div>
                                <div className="flex justify-end mb-4">
                                    <Link href="/financial/estimates-contracts?tab=contracts" className="text-sm text-blue-600 hover:underline">
                                        契約管理ページへ移動
                                    </Link>
                                </div>
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">契約日</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金額</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">備考</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {contracts.length === 0 ? (
                                            <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">契約データがありません</td></tr>
                                        ) : contracts.map((con) => (
                                            <tr key={con.id}>
                                                <td className="px-6 py-4 text-sm text-gray-900">{con.contract_date}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">¥{con.contract_amount.toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${con.status === 'signed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {con.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{con.notes}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'estimates' && (
                            <div>
                                <div className="flex justify-end mb-4">
                                    <Link href="/financial/estimates-contracts?tab=estimates" className="text-sm text-blue-600 hover:underline">
                                        見積管理ページへ移動
                                    </Link>
                                </div>
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">見積番号</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金額</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">作成日</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {estimates.length === 0 ? (
                                            <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">見積データがありません</td></tr>
                                        ) : estimates.map((est) => (
                                            <tr key={est.id}>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{est.estimate_number}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">¥{est.total_amount.toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${est.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                            est.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                                                est.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                                    'bg-gray-100 text-gray-800'}`}>
                                                        {est.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{new Date(est.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default FinancialDashboard;
