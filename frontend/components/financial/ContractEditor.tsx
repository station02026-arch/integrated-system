import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';

interface Contract {
    id?: string;
    project_id?: string | null;
    customer_id?: string | null;
    estimate_id?: string | null;
    contract_date: string;
    contract_amount: number;
    status: 'negotiating' | 'signed' | 'completed' | 'cancelled';
    notes: string;
}

interface Estimate {
    id: string;
    estimate_number: string;
    total_amount: number;
}

interface ContractEditorProps {
    projectId?: string; // Optional
    customerId?: string; // Add this
    contractId?: string;
    initialEstimateId?: string; // Add this
    onSave: () => void;
    onCancel: () => void;
}

interface Project {
    id: string;
    project_name: string;
}

const ContractEditor: React.FC<ContractEditorProps> = ({ projectId, customerId, contractId, initialEstimateId, onSave, onCancel }) => {
    const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
    const [selectedCustomerId, setSelectedCustomerId] = useState(customerId || '');
    const [contract, setContract] = useState<Contract>({
        project_id: projectId || null,
        customer_id: customerId || null,
        estimate_id: initialEstimateId || null, // Set initial estimate ID
        contract_date: new Date().toISOString().split('T')[0],
        contract_amount: 0,
        status: 'negotiating',
        notes: '',
    });
    const [estimates, setEstimates] = useState<Estimate[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [projects, setProjects] = useState<Project[]>([]);
    const [customers, setCustomers] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        if (!projectId) {
            fetchCustomers();
            fetchProjects();
        } else {
            setSelectedProjectId(projectId);
        }

        if (customerId) {
            setSelectedCustomerId(customerId);
        }

        if (contractId) {
            fetchContract(contractId);
        }
    }, [contractId, projectId, customerId]);

    useEffect(() => {
        if (selectedProjectId) {
            fetchEstimates(selectedProjectId);
            setContract(prev => ({ ...prev, project_id: selectedProjectId, customer_id: null }));
        } else if (selectedCustomerId) {
            fetchEstimatesByCustomer(selectedCustomerId);
            setContract(prev => ({ ...prev, customer_id: selectedCustomerId, project_id: null }));
        }
    }, [selectedProjectId, selectedCustomerId]);

    // Effect to set initial estimate amount if provided
    useEffect(() => {
        if (initialEstimateId) {
            // If we have the list, find it
            if (estimates.length > 0) {
                const selectedEstimate = estimates.find(e => e.id === initialEstimateId);
                if (selectedEstimate) {
                    setContract(prev => ({
                        ...prev,
                        estimate_id: initialEstimateId,
                        contract_amount: selectedEstimate.total_amount
                    }));
                }
            } else {
                // If list not loaded yet (or empty), fetch specific estimate
                fetchEstimateDetails(initialEstimateId);
            }
        }
    }, [initialEstimateId, estimates]);

    const fetchEstimateDetails = async (id: string) => {
        const { data, error } = await supabase
            .from('estimates')
            .select('id, total_amount, project_id, customer_id')
            .eq('id', id)
            .single();

        if (data) {
            setContract(prev => ({
                ...prev,
                estimate_id: id,
                contract_amount: data.total_amount
            }));
            // Also ensure context is set if missing
            if (!selectedProjectId && data.project_id) setSelectedProjectId(data.project_id);
            if (!selectedCustomerId && data.customer_id) setSelectedCustomerId(data.customer_id);
        }
    };

    const fetchCustomers = async () => {
        const { data, error } = await supabase
            .from('customers')
            .select('id, name')
            .order('name', { ascending: true });

        if (error) console.error('Error fetching customers:', error);
        else setCustomers(data || []);
    };

    const fetchProjects = async () => {
        const { data, error } = await supabase
            .from('projects')
            .select('id, project_name')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching projects:', error);
        else setProjects(data || []);
    };

    const fetchEstimates = async (projId: string) => {
        const { data, error } = await supabase
            .from('estimates')
            .select('id, estimate_number, total_amount')
            .eq('project_id', projId)
            .eq('status', 'approved');

        if (error) console.error('Error fetching estimates:', error);
        else setEstimates(data || []);
    };

    const fetchEstimatesByCustomer = async (custId: string) => {
        const { data, error } = await supabase
            .from('estimates')
            .select('id, estimate_number, total_amount')
            .eq('customer_id', custId)
            .eq('status', 'approved');

        if (error) console.error('Error fetching estimates:', error);
        else setEstimates(data || []);
    };

    const fetchContract = async (id: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('contracts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            setError('契約情報の取得に失敗しました');
        } else if (data) {
            setContract(data);
            if (!projectId && data.project_id) {
                setSelectedProjectId(data.project_id);
            }
            if (data.customer_id) {
                setSelectedCustomerId(data.customer_id);
            }
        }
        setLoading(false);
    };

    const handleEstimateChange = (estimateId: string) => {
        const selectedEstimate = estimates.find(e => e.id === estimateId);
        setContract(prev => ({
            ...prev,
            estimate_id: estimateId,
            contract_amount: selectedEstimate ? selectedEstimate.total_amount : prev.contract_amount
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProjectId && !selectedCustomerId) {
            setError('顧客を選択してください');
            return;
        }

        setLoading(true);
        setError('');

        // Sanitize payload: ensure empty strings are null for UUID fields
        const payload = {
            ...contract,
            project_id: contract.project_id || null,
            customer_id: contract.customer_id || null,
            estimate_id: contract.estimate_id || null,
        };

        const { error } = contractId
            ? await supabase.from('contracts').update(payload).eq('id', contractId)
            : await supabase.from('contracts').insert([payload]);

        if (error) {
            setError('保存中にエラーが発生しました: ' + error.message);
        } else {
            // If contract is signed and NO project exists, create one
            if (contract.status === 'signed' && !selectedProjectId && selectedCustomerId) {
                // Find customer name
                const customer = customers.find(c => c.id === selectedCustomerId);
                const projectName = customer ? `${customer.name}様邸工事` : '新規工事';

                const { data: newProject, error: projError } = await supabase
                    .from('projects')
                    .insert([{
                        project_name: projectName,
                        customer_id: selectedCustomerId, // Assuming project has customer_id directly or via relation
                        status: 'construction_in_progress',
                        start_date: new Date().toISOString().split('T')[0]
                    }])
                    .select()
                    .single();

                if (!projError && newProject) {
                    // Link contract and estimate to new project
                    const contractIdToUpdate = contractId || (await supabase.from('contracts').select('id').order('created_at', { ascending: false }).limit(1).single()).data?.id;

                    if (contractIdToUpdate) {
                        await supabase.from('contracts').update({ project_id: newProject.id }).eq('id', contractIdToUpdate);
                    }
                    if (contract.estimate_id) {
                        await supabase.from('estimates').update({ project_id: newProject.id }).eq('id', contract.estimate_id);
                    }
                }
            }
            // If project already exists and signed
            else if (contract.status === 'signed' && selectedProjectId) {
                await supabase
                    .from('projects')
                    .update({ status: 'construction_in_progress' })
                    .eq('id', selectedProjectId);
            }
            onSave();
        }
        setLoading(false);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">{contractId ? '契約編集' : '新規契約登録'}</h2>

            {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Customer Selection if not pre-filled */}
                {!projectId && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">顧客 (Customer)</label>
                        <select
                            value={selectedCustomerId}
                            onChange={(e) => setSelectedCustomerId(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900"
                        >
                            <option value="">顧客を選択してください</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">※ 契約締結 (Signed) にすると、自動的に工事が作成されます。</p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700">関連見積 (承認済みのみ)</label>
                    <select
                        value={contract.estimate_id || ''}
                        onChange={(e) => handleEstimateChange(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900"
                        disabled={!selectedProjectId && !selectedCustomerId}
                    >
                        <option value="">選択なし (直接入力)</option>
                        {estimates.map(est => (
                            <option key={est.id} value={est.id}>
                                {est.estimate_number} (¥{est.total_amount.toLocaleString()})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">契約日</label>
                        <input
                            type="date"
                            value={contract.contract_date}
                            onChange={(e) => setContract({ ...contract, contract_date: e.target.value })}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">契約金額 (税抜)</label>
                        <input
                            type="number"
                            value={contract.contract_amount}
                            onChange={(e) => setContract({ ...contract, contract_amount: Number(e.target.value) })}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">ステータス</label>
                    <select
                        value={contract.status}
                        onChange={(e) => setContract({ ...contract, status: e.target.value as any })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900"
                    >
                        <option value="negotiating">交渉中 (Negotiating)</option>
                        <option value="signed">契約締結 (Signed)</option>
                        <option value="completed">完了 (Completed)</option>
                        <option value="cancelled">キャンセル (Cancelled)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">備考</label>
                    <textarea
                        value={contract.notes || ''}
                        onChange={(e) => setContract({ ...contract, notes: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900"
                        rows={3}
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                        キャンセル
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                    >
                        {loading ? '保存中...' : '保存'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ContractEditor;
