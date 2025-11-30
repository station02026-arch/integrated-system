import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import EstimateEditor from '../../components/financial/EstimateEditor';
import ContractEditor from '../../components/financial/ContractEditor';
import BillingManager from '../../components/financial/BillingManager';
import { supabase } from '@/utils/supabaseClient';

// Helper components for list views
const EstimateList = ({ onEdit }: { onEdit: (id: string | null) => void }) => {
    const [estimates, setEstimates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');

    useEffect(() => {
        fetchProjects();
    }, []);

    useEffect(() => {
        if (selectedProjectId) {
            fetchEstimates(selectedProjectId);
        } else {
            setEstimates([]);
        }
    }, [selectedProjectId]);

    const fetchProjects = async () => {
        const { data } = await supabase.from('projects').select('id, project_name').order('created_at', { ascending: false });
        setProjects(data || []);
    };

    const fetchEstimates = async (projectId: string) => {
        setLoading(true);
        const { data } = await supabase
            .from('estimates')
            .select('*, projects(project_name)')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });
        setEstimates(data || []);
        setLoading(false);
    };

    return (
        <div>
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700">対象工事を選択</label>
                <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="mt-1 block w-full md:w-1/2 border border-gray-300 rounded-md shadow-sm p-2 text-gray-900"
                >
                    <option value="">工事を選択してください</option>
                    {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.project_name}</option>
                    ))}
                </select>
            </div>

            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">見積一覧</h2>
                <button
                    onClick={() => onEdit(null)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    新規見積作成
                </button>
            </div>

            {selectedProjectId ? (
                loading ? <p>読み込み中...</p> : estimates.length === 0 ? <p className="text-gray-500">見積データがありません。</p> : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">見積番号</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">合計金額</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {estimates.map((est) => (
                                <tr key={est.id}>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{est.estimate_number}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">¥{est.total_amount.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${est.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                est.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'}`}>
                                            {est.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                        <button onClick={() => onEdit(est.id)} className="text-indigo-600 hover:text-indigo-900">詳細/編集</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )
            ) : (
                <div className="text-center py-10 text-gray-500 bg-gray-50 rounded">
                    見積を表示するには、対象の工事を選択してください。
                </div>
            )}
        </div>
    );
};

const ContractList = ({ onEdit }: { onEdit: (id: string | null) => void }) => {
    const [contracts, setContracts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');

    useEffect(() => {
        fetchProjects();
    }, []);

    useEffect(() => {
        if (selectedProjectId) {
            fetchContracts(selectedProjectId);
        } else {
            setContracts([]);
        }
    }, [selectedProjectId]);

    const fetchProjects = async () => {
        const { data } = await supabase.from('projects').select('id, project_name').order('created_at', { ascending: false });
        setProjects(data || []);
    };

    const fetchContracts = async (projectId: string) => {
        setLoading(true);
        const { data } = await supabase
            .from('contracts')
            .select('*')
            .eq('project_id', projectId)
            .order('contract_date', { ascending: false });
        setContracts(data || []);
        setLoading(false);
    };

    return (
        <div>
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700">対象工事を選択</label>
                <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="mt-1 block w-full md:w-1/2 border border-gray-300 rounded-md shadow-sm p-2 text-gray-900"
                >
                    <option value="">工事を選択してください</option>
                    {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.project_name}</option>
                    ))}
                </select>
            </div>

            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">契約一覧</h2>
                <button
                    onClick={() => onEdit(null)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    新規契約登録
                </button>
            </div>

            {selectedProjectId ? (
                loading ? <p>読み込み中...</p> : contracts.length === 0 ? <p className="text-gray-500">契約データがありません。</p> : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">契約日</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金額</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {contracts.map((contract) => (
                                <tr key={contract.id}>
                                    <td className="px-6 py-4 text-sm text-gray-900">{contract.contract_date}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">¥{contract.contract_amount.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${contract.status === 'signed' ? 'bg-green-100 text-green-800' :
                                                contract.status === 'negotiating' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'}`}>
                                            {contract.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                        <button onClick={() => onEdit(contract.id)} className="text-indigo-600 hover:text-indigo-900">編集</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )
            ) : (
                <div className="text-center py-10 text-gray-500 bg-gray-50 rounded">
                    契約を表示するには、対象の工事を選択してください。
                </div>
            )}
        </div>
    );
};

const FinancialPage = () => {
    const [activeTab, setActiveTab] = useState('estimates');
    const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleEditEstimate = (id: string | null) => {
        setEditingId(id);
        setViewMode('edit');
    };

    const handleEditContract = (id: string | null) => {
        setEditingId(id);
        setViewMode('edit');
    };

    const handleSave = () => {
        setViewMode('list');
        setEditingId(null);
    };

    const handleCancel = () => {
        setViewMode('list');
        setEditingId(null);
    };

    return (
        <Layout title="財務管理">
            <div className="p-8">
                <h1 className="text-3xl font-bold mb-8 text-gray-800">財務管理 (見積・契約・請求)</h1>

                {/* Tabs - Only show in list mode */}
                {viewMode === 'list' && (
                    <div className="flex border-b border-gray-200 mb-6">
                        <button
                            className={`py-2 px-4 font-medium ${activeTab === 'estimates' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('estimates')}
                        >
                            見積 (Estimates)
                        </button>
                        <button
                            className={`py-2 px-4 font-medium ${activeTab === 'contracts' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('contracts')}
                        >
                            契約 (Contracts)
                        </button>
                        <button
                            className={`py-2 px-4 font-medium ${activeTab === 'billing' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('billing')}
                        >
                            請求・入金 (Billing)
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="bg-white rounded-lg shadow p-6 min-h-[500px]">
                    {activeTab === 'estimates' && (
                        viewMode === 'list' ? (
                            <EstimateList onEdit={handleEditEstimate} />
                        ) : (
                            <EstimateEditor
                                estimateId={editingId || undefined}
                                onSave={handleSave}
                                onCancel={handleCancel}
                            />
                        )
                    )}

                    {activeTab === 'contracts' && (
                        viewMode === 'list' ? (
                            <ContractList onEdit={handleEditContract} />
                        ) : (
                            <ContractEditor
                                contractId={editingId || undefined}
                                onSave={handleSave}
                                onCancel={handleCancel}
                            />
                        )
                    )}

                    {activeTab === 'billing' && (
                        <BillingManager />
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default FinancialPage;
