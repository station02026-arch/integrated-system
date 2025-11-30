import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';

interface Billing {
    id: string;
    project_id: string;
    contract_id?: string;
    billing_number: string;
    issue_date: string;
    due_date: string;
    total_amount: number;
    status: 'draft' | 'sent' | 'paid' | 'overdue';
}

interface Payment {
    id: string;
    billing_id: string;
    payment_date: string;
    amount: number;
    method: string;
    notes: string;
}

interface Contract {
    id: string;
    contract_amount: number;
    contract_date: string;
    status: string;
}

interface BillingManagerProps {
    projectId?: string; // Optional
}

interface Project {
    id: string;
    project_name: string;
}

const BillingManager: React.FC<BillingManagerProps> = ({ projectId }) => {
    const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
    const [billings, setBillings] = useState<Billing[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingBilling, setEditingBilling] = useState<Partial<Billing> | null>(null);
    const [showEditor, setShowEditor] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);

    // Payment recording state
    const [selectedBillingId, setSelectedBillingId] = useState<string | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [newPayment, setNewPayment] = useState<Partial<Payment>>({
        payment_date: new Date().toISOString().split('T')[0],
        amount: 0,
        method: 'bank_transfer',
        notes: ''
    });

    useEffect(() => {
        if (!projectId) {
            fetchProjects();
        } else {
            setSelectedProjectId(projectId);
        }
    }, [projectId]);

    useEffect(() => {
        if (selectedProjectId) {
            fetchBillings(selectedProjectId);
            fetchContracts(selectedProjectId);
        } else {
            setBillings([]);
            setContracts([]);
        }
    }, [selectedProjectId]);

    const fetchProjects = async () => {
        const { data, error } = await supabase
            .from('projects')
            .select('id, project_name')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching projects:', error);
        else setProjects(data || []);
    };

    const fetchBillings = async (projId: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('billings')
            .select('*')
            .eq('project_id', projId)
            .order('issue_date', { ascending: false });

        if (error) console.error('Error fetching billings:', error);
        else setBillings(data || []);
        setLoading(false);
    };

    const fetchContracts = async (projId: string) => {
        const { data, error } = await supabase
            .from('contracts')
            .select('*')
            .eq('project_id', projId)
            .eq('status', 'signed'); // Only signed contracts can be billed

        if (error) console.error('Error fetching contracts:', error);
        else setContracts(data || []);
    };

    const fetchPayments = async (billingId: string) => {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('billing_id', billingId)
            .order('payment_date', { ascending: false });

        if (error) console.error('Error fetching payments:', error);
        else setPayments(data || []);
    };

    const handleSaveBilling = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBilling) return;
        if (!selectedProjectId) {
            alert('工事を選択してください');
            return;
        }

        const billingData = {
            ...editingBilling,
            project_id: selectedProjectId,
            status: editingBilling.status || 'draft'
        };

        const { error } = editingBilling.id
            ? await supabase.from('billings').update(billingData).eq('id', editingBilling.id)
            : await supabase.from('billings').insert([billingData]);

        if (error) {
            alert('保存エラー: ' + error.message);
        } else {
            setShowEditor(false);
            setEditingBilling(null);
            fetchBillings(selectedProjectId);
        }
    };

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBillingId) return;

        const paymentData = {
            ...newPayment,
            billing_id: selectedBillingId
        };

        const { error } = await supabase.from('payments').insert([paymentData]);

        if (error) {
            alert('入金記録エラー: ' + error.message);
        } else {
            setNewPayment({
                payment_date: new Date().toISOString().split('T')[0],
                amount: 0,
                method: 'bank_transfer',
                notes: ''
            });
            fetchPayments(selectedBillingId);

            // Optionally update billing status to 'paid'
            // Simple logic: if payment added, maybe check total? For now just leave as is or manual update.
            // await supabase.from('billings').update({ status: 'paid' }).eq('id', selectedBillingId);
            fetchBillings(selectedProjectId);
        }
    };

    const handleDeleteBilling = async (id: string) => {
        if (!window.confirm('本当にこの請求書を削除しますか？関連する入金記録も削除されます。')) return;

        const { error } = await supabase
            .from('billings')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting billing:', error);
            alert('削除に失敗しました: ' + error.message);
        } else {
            if (selectedBillingId === id) {
                setSelectedBillingId(null);
                setPayments([]);
            }
            fetchBillings(selectedProjectId);
        }
    };

    const handleDeletePayment = async (id: string, billingId: string) => {
        if (!window.confirm('本当にこの入金記録を削除しますか？')) return;

        const { error } = await supabase
            .from('payments')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting payment:', error);
            alert('削除に失敗しました: ' + error.message);
        } else {
            fetchPayments(billingId);
            fetchBillings(selectedProjectId); // Update billing list (e.g. status might change if we had logic)
        }
    };

    return (
        <div>
            {/* Project Selection if not pre-filled */}
            {!projectId && (
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
            )}

            {selectedProjectId ? (
                <>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">請求・入金一覧</h2>
                        <button
                            onClick={() => {
                                setEditingBilling({
                                    billing_number: `INV-${new Date().getFullYear()}-${String(billings.length + 1).padStart(3, '0')}`,
                                    issue_date: new Date().toISOString().split('T')[0],
                                    total_amount: 0,
                                    status: 'draft'
                                });
                                setShowEditor(true);
                            }}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                            新規請求書作成
                        </button>
                    </div>

                    {showEditor && editingBilling && (
                        <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200">
                            <h3 className="font-bold mb-4">{editingBilling.id ? '請求書編集' : '新規請求書'}</h3>
                            <form onSubmit={handleSaveBilling} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">請求番号</label>
                                        <input
                                            type="text"
                                            value={editingBilling.billing_number}
                                            onChange={(e) => setEditingBilling({ ...editingBilling, billing_number: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded p-2 text-gray-900"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">関連契約</label>
                                        <select
                                            value={editingBilling.contract_id || ''}
                                            onChange={(e) => setEditingBilling({ ...editingBilling, contract_id: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded p-2 text-gray-900"
                                        >
                                            <option value="">選択なし</option>
                                            {contracts.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.contract_date} - ¥{c.contract_amount.toLocaleString()}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">発行日</label>
                                        <input
                                            type="date"
                                            value={editingBilling.issue_date}
                                            onChange={(e) => setEditingBilling({ ...editingBilling, issue_date: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded p-2 text-gray-900"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">支払期限</label>
                                        <input
                                            type="date"
                                            value={editingBilling.due_date || ''}
                                            onChange={(e) => setEditingBilling({ ...editingBilling, due_date: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded p-2 text-gray-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">請求金額 (税込)</label>
                                        <input
                                            type="number"
                                            value={editingBilling.total_amount}
                                            onChange={(e) => setEditingBilling({ ...editingBilling, total_amount: Number(e.target.value) })}
                                            className="mt-1 block w-full border border-gray-300 rounded p-2 text-gray-900"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">ステータス</label>
                                        <select
                                            value={editingBilling.status}
                                            onChange={(e) => setEditingBilling({ ...editingBilling, status: e.target.value as any })}
                                            className="mt-1 block w-full border border-gray-300 rounded p-2 text-gray-900"
                                        >
                                            <option value="draft">下書き</option>
                                            <option value="sent">送付済み</option>
                                            <option value="paid">入金済み</option>
                                            <option value="overdue">期限切れ</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditor(false)}
                                        className="px-4 py-2 border rounded hover:bg-gray-100"
                                    >
                                        キャンセル
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        保存
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="bg-white rounded shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">請求番号</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">発行日</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金額</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {billings.map((billing) => (
                                    <React.Fragment key={billing.id}>
                                        <tr className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{billing.billing_number}</td>
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
                                                <button
                                                    onClick={() => {
                                                        window.open(`/financial/billings/${billing.id}/print`, '_blank');
                                                    }}
                                                    className="text-gray-600 hover:text-gray-900 mr-4"
                                                >
                                                    🖨️ 印刷
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingBilling(billing);
                                                        setShowEditor(true);
                                                    }}
                                                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                                                >
                                                    編集
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (selectedBillingId === billing.id) {
                                                            setSelectedBillingId(null);
                                                        } else {
                                                            setSelectedBillingId(billing.id);
                                                            fetchPayments(billing.id);
                                                        }
                                                    }}
                                                    className="text-green-600 hover:text-green-900"
                                                >
                                                    {selectedBillingId === billing.id ? '閉じる' : '入金記録'}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteBilling(billing.id)}
                                                    className="text-red-600 hover:text-red-900 ml-4"
                                                >
                                                    削除
                                                </button>
                                            </td>
                                        </tr>
                                        {selectedBillingId === billing.id && (
                                            <tr>
                                                <td colSpan={5} className="bg-gray-50 px-6 py-4">
                                                    <div className="mb-4">
                                                        <h4 className="font-bold text-sm text-gray-700 mb-2">入金履歴</h4>
                                                        {payments.length === 0 ? (
                                                            <p className="text-sm text-gray-500">入金記録はありません。</p>
                                                        ) : (
                                                            <ul className="space-y-2 mb-4">
                                                                {payments.map(p => (
                                                                    <li key={p.id} className="text-sm flex justify-between border-b pb-1">
                                                                        <span>{p.payment_date} ({p.method})</span>
                                                                        <div>
                                                                            <span className="font-medium mr-4">¥{p.amount.toLocaleString()}</span>
                                                                            <button
                                                                                onClick={() => handleDeletePayment(p.id, billing.id)}
                                                                                className="text-red-600 hover:text-red-800 text-xs"
                                                                            >
                                                                                削除
                                                                            </button>
                                                                        </div>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>

                                                    <form onSubmit={handleAddPayment} className="flex items-end space-x-2">
                                                        <div>
                                                            <label className="block text-xs text-gray-500">日付</label>
                                                            <input
                                                                type="date"
                                                                value={newPayment.payment_date}
                                                                onChange={(e) => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                                                                className="border rounded p-1 text-sm text-gray-900"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-gray-500">金額</label>
                                                            <input
                                                                type="number"
                                                                value={newPayment.amount}
                                                                onChange={(e) => setNewPayment({ ...newPayment, amount: Number(e.target.value) })}
                                                                className="border rounded p-1 text-sm w-32 text-gray-900"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-gray-500">方法</label>
                                                            <select
                                                                value={newPayment.method}
                                                                onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value })}
                                                                className="border rounded p-1 text-sm text-gray-900"
                                                            >
                                                                <option value="bank_transfer">銀行振込</option>
                                                                <option value="cash">現金</option>
                                                                <option value="check">小切手</option>
                                                                <option value="other">その他</option>
                                                            </select>
                                                        </div>
                                                        <button type="submit" className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                                                            入金追加
                                                        </button>
                                                    </form>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <div className="text-center py-10 text-gray-500 bg-gray-50 rounded">
                    請求・入金情報を表示するには、対象の工事を選択してください。
                </div>
            )}
        </div>
    );
};

export default BillingManager;
