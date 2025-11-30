import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';

interface EstimateItem {
    name: string;
    quantity: number;
    unit: string;
    unit_price: number;
    amount: number;
}

interface EstimateEditorProps {
    projectId?: string; // Optional now
    estimateId?: string; // Add this
    initialData?: any;
    onSave: () => void;
    onCancel: () => void;
}

interface Project {
    id: string;
    project_name: string;
}

const EstimateEditor: React.FC<EstimateEditorProps> = ({ projectId, estimateId, initialData, onSave, onCancel }) => {
    const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
    const [estimateNumber, setEstimateNumber] = useState('');
    const [items, setItems] = useState<EstimateItem[]>([
        { name: '', quantity: 1, unit: '式', unit_price: 0, amount: 0 }
    ]);
    const [status, setStatus] = useState('draft');
    const [loading, setLoading] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [customers, setCustomers] = useState<{ id: string, name: string }[]>([]);
    const [materials, setMaterials] = useState<{ id: string, name: string, unit: string, unit_price: number }[]>([]);

    useEffect(() => {
        if (!projectId) {
            fetchCustomers();
        } else {
            setSelectedProjectId(projectId);
        }
        fetchMaterials();

        if (estimateId) {
            fetchEstimate(estimateId);
        } else if (initialData) {
            setEstimateData(initialData);
        } else {
            // Generate default estimate number
            setEstimateNumber(`EST-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);
        }
    }, [initialData, projectId, estimateId]);

    const fetchEstimate = async (id: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('estimates')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching estimate:', error);
            alert('見積情報の取得に失敗しました');
        } else if (data) {
            setEstimateData(data);
        }
        setLoading(false);
    };

    const setEstimateData = (data: any) => {
        setEstimateNumber(data.estimate_number);
        setItems(data.items || []);
        setStatus(data.status);
        if (!projectId && data.project_id) {
            setSelectedProjectId(data.project_id);
        }
        if (data.customer_id) {
            setSelectedCustomerId(data.customer_id);
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

    const fetchMaterials = async () => {
        const { data, error } = await supabase
            .from('materials')
            .select('id, name, unit, unit_price')
            .order('name', { ascending: true });

        if (error) console.error('Error fetching materials:', error);
        else setMaterials(data || []);
    };

    const handleItemNameChange = (index: number, value: string) => {
        const newItems = [...items];
        newItems[index].name = value;

        // Auto-fill if match found
        const matchedMaterial = materials.find(m => m.name === value);
        if (matchedMaterial) {
            newItems[index].unit = matchedMaterial.unit;
            newItems[index].unit_price = matchedMaterial.unit_price;
            newItems[index].amount = newItems[index].quantity * matchedMaterial.unit_price;
        }

        setItems(newItems);
    };

    const handleItemChange = (index: number, field: keyof EstimateItem, value: any) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;

        // Auto-calculate amount
        if (field === 'quantity' || field === 'unit_price') {
            newItems[index].amount = newItems[index].quantity * newItems[index].unit_price;
        }

        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { name: '', quantity: 1, unit: '式', unit_price: 0, amount: 0 }]);
    };

    const removeItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + item.amount, 0);
    };

    const calculateTax = (total: number) => {
        return Math.floor(total * 0.1);
    };

    const handleSave = async () => {
        if (!selectedProjectId && !selectedCustomerId) {
            alert('顧客を選択してください');
            return;
        }

        setLoading(true);
        const total = calculateTotal();
        const tax = calculateTax(total);

        const payload = {
            project_id: selectedProjectId || null,
            customer_id: selectedCustomerId || null,
            estimate_number: estimateNumber,
            items: items,
            total_amount: total,
            tax_amount: tax,
            status: status,
            updated_at: new Date().toISOString()
        };

        let error;
        const idToUpdate = estimateId || initialData?.id;

        if (idToUpdate) {
            const { error: updateError } = await supabase
                .from('estimates')
                .update(payload)
                .eq('id', idToUpdate);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('estimates')
                .insert([payload]);
            error = insertError;
        }

        setLoading(false);
        if (error) {
            alert('保存に失敗しました: ' + error.message);
        } else {
            onSave();
        }
    };

    const totalAmount = calculateTotal();
    const taxAmount = calculateTax(totalAmount);

    return (
        <div className="bg-white p-6 rounded shadow">
            <div className="mb-6 grid grid-cols-2 gap-4">
                {/* Customer Selection if not pre-filled */}
                {!projectId && (
                    <div className="col-span-2">
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
                        <p className="text-xs text-gray-500 mt-1">※ 工事は契約締結後に作成されます。</p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700">見積番号</label>
                    <input
                        type="text"
                        value={estimateNumber}
                        onChange={(e) => setEstimateNumber(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">ステータス</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900"
                    >
                        <option value="draft">下書き (Draft)</option>
                        <option value="sent">送付済 (Sent)</option>
                        <option value="approved">承認済 (Approved)</option>
                        <option value="rejected">却下 (Rejected)</option>
                    </select>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">明細項目</h3>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">品名</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">数量</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">単位</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">単価</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">金額</th>
                            <th className="px-3 py-2 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {items.map((item, index) => (
                            <tr key={index}>
                                <td className="px-3 py-2">
                                    <input
                                        type="text"
                                        list="material-options"
                                        value={item.name}
                                        onChange={(e) => handleItemNameChange(index, e.target.value)}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                                        placeholder="工事一式など"
                                    />
                                    <datalist id="material-options">
                                        {materials.map(m => (
                                            <option key={m.id} value={m.name} />
                                        ))}
                                    </datalist>
                                </td>
                                <td className="px-3 py-2">
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                                        className="w-full text-right border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <input
                                        type="text"
                                        value={item.unit}
                                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                                        className="w-full text-center border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <input
                                        type="number"
                                        value={item.unit_price}
                                        onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value))}
                                        className="w-full text-right border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                                    />
                                </td>
                                <td className="px-3 py-2 text-right font-medium">
                                    ¥{item.amount.toLocaleString()}
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <button
                                        onClick={() => removeItem(index)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        ×
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button
                    onClick={addItem}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                    + 行を追加
                </button>
            </div>

            <div className="border-t border-gray-200 pt-4 flex justify-end">
                <div className="w-64">
                    <div className="flex justify-between py-1">
                        <span className="text-gray-600">小計</span>
                        <span className="font-medium">¥{totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1">
                        <span className="text-gray-600">消費税 (10%)</span>
                        <span className="font-medium">¥{taxAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-t border-gray-300 mt-2">
                        <span className="text-lg font-bold">合計</span>
                        <span className="text-lg font-bold text-blue-600">¥{(totalAmount + taxAmount).toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
                <button
                    onClick={onCancel}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                >
                    キャンセル
                </button>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? '保存中...' : '保存する'}
                </button>
            </div>
        </div>
    );
};

export default EstimateEditor;
