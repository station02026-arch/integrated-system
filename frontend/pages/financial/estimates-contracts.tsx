import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import EstimateEditor from '../../components/financial/EstimateEditor';
import ContractEditor from '../../components/financial/ContractEditor';
import ProjectForm from '../../components/ProjectForm';
import { supabase } from '@/utils/supabaseClient';

const EstimatesContractsPage = () => {
    const [activeTab, setActiveTab] = useState('estimates');
    const [viewMode, setViewMode] = useState<'list' | 'edit' | 'create_project'>('list');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [initialEstimateId, setInitialEstimateId] = useState<string | undefined>(undefined);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

    // Lists
    const [estimates, setEstimates] = useState<any[]>([]);
    const [contracts, setContracts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'estimates') {
            fetchEstimates();
        } else {
            fetchContracts();
        }
    }, [activeTab]);

    const fetchEstimates = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('estimates')
            .select('*, projects(project_name, status), customers(name)')
            .order('created_at', { ascending: false });
        setEstimates(data || []);
        setLoading(false);
    };

    const fetchContracts = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('contracts')
            .select('*, projects(project_name, status), customers(name)')
            .order('created_at', { ascending: false });
        setContracts(data || []);
        setLoading(false);
    };

    const handleCreateNewEstimate = () => {
        setViewMode('edit');
        setEditingId(null);
        setSelectedProjectId(null);
        setSelectedCustomerId(null);
    };

    const handleProjectCreated = (projectId: string) => {
        setSelectedProjectId(projectId);
        setViewMode('edit'); // Go to Estimate Editor
        setEditingId(null); // New estimate
    };

    const handleEditEstimate = (id: string, projectId: string) => {
        setEditingId(id);
        setSelectedProjectId(projectId);
        setViewMode('edit');
    };

    const handleEditContract = (id: string, projectId: string) => {
        setEditingId(id);
        setSelectedProjectId(projectId);
        setViewMode('edit');
    };

    const handleCreateContractFromEstimate = (estimateId: string, projectId: string | null, customerId: string | null) => {
        setActiveTab('contracts');
        setViewMode('edit');
        setSelectedProjectId(projectId);
        setSelectedCustomerId(customerId);
        setEditingId(null);
        setInitialEstimateId(estimateId);
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        const { error } = await supabase
            .from('estimates')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            console.error('Error updating status:', error);
            alert('ステータスの更新に失敗しました');
        } else {
            fetchEstimates();
        }
    };

    const handleDelete = async (type: 'estimates' | 'contracts', id: string) => {
        if (!window.confirm('本当に削除しますか？この操作は取り消せません。')) return;

        setLoading(true);
        const { error } = await supabase
            .from(type)
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting:', error);
            alert('削除に失敗しました: ' + error.message);
        } else {
            if (type === 'estimates') fetchEstimates();
            else fetchContracts();
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setViewMode('list');
        setEditingId(null);
        setSelectedProjectId(null);
        setSelectedCustomerId(null);
        setInitialEstimateId(undefined);
        if (activeTab === 'estimates') fetchEstimates();
        else fetchContracts();
    };

    const handleCancel = () => {
        setViewMode('list');
        setEditingId(null);
        setSelectedProjectId(null);
        setSelectedCustomerId(null);
        setInitialEstimateId(undefined);
    };

    return (
        <Layout title="見積・契約管理">
            <div className="p-8">
                <h1 className="text-3xl font-bold mb-8 text-gray-800">見積・契約管理</h1>

                {/* Tabs */}
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
                    </div>
                )}

                <div className="bg-white rounded-lg shadow p-6 min-h-[500px]">
                    {viewMode === 'create_project' && (
                        <div>
                            <div className="mb-4">
                                <button onClick={handleCancel} className="text-gray-500 hover:text-gray-700">← 戻る</button>
                            </div>
                            <ProjectForm onRegistered={handleProjectCreated} initialStatus="planning" />
                        </div>
                    )}

                    {viewMode === 'edit' && activeTab === 'estimates' && (
                        <EstimateEditor
                            projectId={selectedProjectId || undefined}
                            estimateId={editingId || undefined}
                            onSave={handleSave}
                            onCancel={handleCancel}
                        />
                    )}

                    {viewMode === 'edit' && activeTab === 'contracts' && (
                        <ContractEditor
                            projectId={selectedProjectId || undefined}
                            customerId={selectedCustomerId || undefined}
                            contractId={editingId || undefined}
                            initialEstimateId={initialEstimateId || undefined}
                            onSave={handleSave}
                            onCancel={handleCancel}
                        />
                    )}

                    {viewMode === 'list' && activeTab === 'estimates' && (
                        <div>
                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={handleCreateNewEstimate}
                                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                >
                                    新規見積作成
                                </button>
                            </div>
                            {loading ? <p>読み込み中...</p> : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">見積番号</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">工事名 / 顧客名</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金額</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {estimates.map((est) => (
                                            <tr key={est.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{est.estimate_number}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {est.projects ? (
                                                        <>
                                                            {est.projects.project_name}
                                                            <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">{est.projects.status}</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-600">{est.customers?.name || '顧客未設定'} (未契約)</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">¥{est.total_amount.toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${est.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                            est.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                                est.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-yellow-100 text-yellow-800'}`}>
                                                        {est.status === 'draft' ? '下書き' :
                                                            est.status === 'sent' ? '見積中' :
                                                                est.status === 'approved' ? '承認済み' :
                                                                    est.status === 'rejected' ? '却下' : est.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm font-medium">
                                                    <button onClick={() => handleEditEstimate(est.id, est.project_id)} className="text-indigo-600 hover:text-indigo-900 mr-4">編集</button>
                                                    <button
                                                        onClick={() => handleCreateContractFromEstimate(est.id, est.project_id, est.customer_id)}
                                                        className="text-green-600 hover:text-green-900 mr-4"
                                                    >
                                                        契約書作成
                                                    </button>
                                                    <button onClick={() => handleDelete('estimates', est.id)} className="text-red-600 hover:text-red-900">
                                                        {est.status === 'sent' || est.status === 'draft' ? '破棄' : '削除'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {viewMode === 'list' && activeTab === 'contracts' && (
                        <div>
                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={() => {
                                        setSelectedProjectId(null);
                                        setEditingId(null);
                                        setViewMode('edit');
                                    }}
                                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                >
                                    新規契約登録
                                </button>
                            </div>
                            {loading ? <p>読み込み中...</p> : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">契約日</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">工事名 / 顧客名</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金額</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {contracts.map((con) => (
                                            <tr key={con.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-sm text-gray-900">{con.contract_date}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {con.projects?.project_name || con.customers?.name || '不明'}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">¥{con.contract_amount.toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${con.status === 'signed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {con.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => handleEditContract(con.id, con.project_id)}
                                                        className="text-indigo-600 hover:text-indigo-900"
                                                    >
                                                        編集
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete('contracts', con.id)}
                                                        className="text-red-600 hover:text-red-900 ml-2"
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
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default EstimatesContractsPage;
