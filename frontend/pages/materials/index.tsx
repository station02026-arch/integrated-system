import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { supabase } from '@/utils/supabaseClient';

interface Material {
    id: string;
    name: string;
    unit: string;
    unit_price: number;
    category?: string;
}

const MaterialsPage = () => {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<Partial<Material> | null>(null);
    const [showEditor, setShowEditor] = useState(false);

    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('materials')
            .select('*')
            .order('category', { ascending: true })
            .order('name', { ascending: true });

        if (error) console.error('Error fetching materials:', error);
        else setMaterials(data || []);
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMaterial) return;

        const { error } = editingMaterial.id
            ? await supabase.from('materials').update(editingMaterial).eq('id', editingMaterial.id)
            : await supabase.from('materials').insert([editingMaterial]);

        if (error) {
            alert('保存エラー: ' + error.message);
        } else {
            setShowEditor(false);
            setEditingMaterial(null);
            fetchMaterials();
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('本当に削除しますか？')) return;

        const { error } = await supabase
            .from('materials')
            .delete()
            .eq('id', id);

        if (error) {
            alert('削除エラー: ' + error.message);
        } else {
            fetchMaterials();
        }
    };

    return (
        <Layout title="材料マスタ管理">
            <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">材料マスタ管理</h1>
                    <button
                        onClick={() => {
                            setEditingMaterial({ name: '', unit: '個', unit_price: 0, category: '' });
                            setShowEditor(true);
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        新規材料登録
                    </button>
                </div>

                {showEditor && editingMaterial && (
                    <div className="bg-white p-6 rounded shadow mb-8 border border-gray-200">
                        <h2 className="text-xl font-bold mb-4">{editingMaterial.id ? '材料編集' : '新規登録'}</h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">品名</label>
                                    <input
                                        type="text"
                                        value={editingMaterial.name}
                                        onChange={(e) => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded p-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">カテゴリ</label>
                                    <input
                                        type="text"
                                        value={editingMaterial.category || ''}
                                        onChange={(e) => setEditingMaterial({ ...editingMaterial, category: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded p-2"
                                        placeholder="例: 配管材, 継手"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">単位</label>
                                    <input
                                        type="text"
                                        value={editingMaterial.unit}
                                        onChange={(e) => setEditingMaterial({ ...editingMaterial, unit: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded p-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">単価</label>
                                    <input
                                        type="number"
                                        value={editingMaterial.unit_price}
                                        onChange={(e) => setEditingMaterial({ ...editingMaterial, unit_price: Number(e.target.value) })}
                                        className="mt-1 block w-full border border-gray-300 rounded p-2"
                                        required
                                    />
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">カテゴリ</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">品名</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">単位</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">単価</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {materials.map((mat) => (
                                <tr key={mat.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-500">{mat.category}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{mat.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{mat.unit}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">¥{mat.unit_price.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                        <button
                                            onClick={() => {
                                                setEditingMaterial(mat);
                                                setShowEditor(true);
                                            }}
                                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                                        >
                                            編集
                                        </button>
                                        <button
                                            onClick={() => handleDelete(mat.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            削除
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
};

export default MaterialsPage;
