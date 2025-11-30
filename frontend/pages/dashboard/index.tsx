import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { supabase } from '@/utils/supabaseClient';

interface DashboardStats {
    totalSales: number;
    totalBillings: number;
    totalPayments: number;
    outstandingAmount: number;
    projectCount: number;
    activeProjects: number;
}

const DashboardPage = () => {
    const [stats, setStats] = useState<DashboardStats>({
        totalSales: 0,
        totalBillings: 0,
        totalPayments: 0,
        outstandingAmount: 0,
        projectCount: 0,
        activeProjects: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Fetch Contracts (Sales)
            const { data: contracts } = await supabase
                .from('contracts')
                .select('contract_amount')
                .eq('status', 'signed');

            const totalSales = contracts?.reduce((sum, c) => sum + c.contract_amount, 0) || 0;

            // Fetch Billings
            const { data: billings } = await supabase
                .from('billings')
                .select('total_amount');

            const totalBillings = billings?.reduce((sum, b) => sum + b.total_amount, 0) || 0;

            // Fetch Payments
            const { data: payments } = await supabase
                .from('payments')
                .select('amount');

            const totalPayments = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

            // Fetch Projects
            const { data: projects } = await supabase
                .from('projects')
                .select('status');

            const projectCount = projects?.length || 0;
            const activeProjects = projects?.filter(p => p.status !== 'completed' && p.status !== 'cancelled').length || 0;

            setStats({
                totalSales,
                totalBillings,
                totalPayments,
                outstandingAmount: totalBillings - totalPayments,
                projectCount,
                activeProjects
            });

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
        setLoading(false);
    };

    if (loading) return <Layout title="経営ダッシュボード"><div className="p-8">読み込み中...</div></Layout>;

    return (
        <Layout title="経営ダッシュボード">
            <div className="p-8 bg-gray-100 min-h-screen">
                <h1 className="text-3xl font-bold text-gray-800 mb-8">経営ダッシュボード</h1>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                        <div className="text-gray-500 text-sm font-medium uppercase">総売上 (契約済)</div>
                        <div className="mt-2 text-3xl font-bold text-gray-900">¥{stats.totalSales.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                        <div className="text-gray-500 text-sm font-medium uppercase">請求総額</div>
                        <div className="mt-2 text-3xl font-bold text-gray-900">¥{stats.totalBillings.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
                        <div className="text-gray-500 text-sm font-medium uppercase">入金総額</div>
                        <div className="mt-2 text-3xl font-bold text-gray-900">¥{stats.totalPayments.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
                        <div className="text-gray-500 text-sm font-medium uppercase">未回収金</div>
                        <div className="mt-2 text-3xl font-bold text-red-600">¥{stats.outstandingAmount.toLocaleString()}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Project Status */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">プロジェクト稼働状況</h3>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-gray-600">稼働中プロジェクト</span>
                            <span className="text-2xl font-bold text-blue-600">{stats.activeProjects} / {stats.projectCount}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                            <div
                                className="bg-blue-600 h-4 rounded-full transition-all duration-500"
                                style={{ width: `${stats.projectCount > 0 ? (stats.activeProjects / stats.projectCount) * 100 : 0}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-gray-500 mt-2 text-right">
                            稼働率: {stats.projectCount > 0 ? Math.round((stats.activeProjects / stats.projectCount) * 100) : 0}%
                        </p>
                    </div>

                    {/* Financial Health */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">回収状況</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>請求に対する入金率</span>
                                    <span>{stats.totalBillings > 0 ? Math.round((stats.totalPayments / stats.totalBillings) * 100) : 0}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-green-500 h-2 rounded-full"
                                        style={{ width: `${stats.totalBillings > 0 ? (stats.totalPayments / stats.totalBillings) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default DashboardPage;
