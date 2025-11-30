import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/components/AuthContainer';
import AuthForm from '@/components/AuthForm';

// Types
interface Project {
    id: string;
    project_name: string;
    customers: { name: string } | null;
}

interface Material {
    name: string;
    quantity: number;
    unit: string;
}

interface ReportEntry {
    projectId: string;
    content: string;
    materials: Material[];
}

const DailyReportIndexPage: React.FC = () => {
    const router = useRouter();
    const { user, role, authReady } = useAuth();

    // State
    const [projects, setProjects] = useState<Project[]>([]);
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [entries, setEntries] = useState<ReportEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Temporary state for adding a new entry
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [tempContent, setTempContent] = useState('');
    const [tempMaterials, setTempMaterials] = useState<Material[]>([]);

    // Temporary state for material input
    const [matName, setMatName] = useState('');
    const [matQty, setMatQty] = useState('');
    const [matUnit, setMatUnit] = useState('');

    // Fetch Active Projects
    useEffect(() => {
        const fetchProjects = async () => {
            if (!authReady || role !== 'field') return;
            const { data, error } = await supabase
                .from('projects')
                .select(`id, project_name, customers(name)`)
                .eq('status', '進行中')
                .order('project_name');

            if (data) setProjects(data);
        };
        fetchProjects();
    }, [authReady, role]);

    // Auth Check
    if (!authReady) return <div className="p-4">Loading...</div>;
    if (!user) return <AuthForm />;
    if (role !== 'field') return <div className="p-8 text-red-600">現場作業員専用です。</div>;

    // --- Handlers ---

    const addMaterial = () => {
        if (!matName || !matQty) return;
        setTempMaterials([...tempMaterials, {
            name: matName,
            quantity: parseFloat(matQty),
            unit: matUnit || '個'
        }]);
        setMatName('');
        setMatQty('');
        setMatUnit('');
    };

    const removeMaterial = (idx: number) => {
        const newMats = [...tempMaterials];
        newMats.splice(idx, 1);
        setTempMaterials(newMats);
    };

    const addEntry = () => {
        if (!selectedProjectId) {
            alert('工事を選択してください');
            return;
        }
        if (!tempContent) {
            alert('作業内容を入力してください');
            return;
        }

        const newEntry: ReportEntry = {
            projectId: selectedProjectId,
            content: tempContent,
            materials: tempMaterials
        };

        setEntries([...entries, newEntry]);

        // Reset temp form
        setSelectedProjectId('');
        setTempContent('');
        setTempMaterials([]);
    };

    const removeEntry = (idx: number) => {
        const newEntries = [...entries];
        newEntries.splice(idx, 1);
        setEntries(newEntries);
    };

    const handleSubmit = async () => {
        if (entries.length === 0) {
            setError('少なくとも1つの工事報告を追加してください。');
            return;
        }
        setLoading(true);
        setError('');
        setMessage('');

        try {
            // 1. Create Report Header
            // First check if report exists for this date (Upsert logic or simple insert?)
            // For simplicity, we'll try to insert. If unique constraint fails, we should handle it, 
            // but for now let's assume one report per day.

            const { data: reportData, error: reportError } = await supabase
                .from('daily_reports')
                .insert({
                    user_id: user.id,
                    report_date: reportDate
                })
                .select()
                .single();

            if (reportError) throw reportError;

            // 2. Create Entries
            const dbEntries = entries.map(e => ({
                report_id: reportData.id,
                project_id: e.projectId,
                content: e.content,
                materials: e.materials // JSONB
            }));

            const { error: entriesError } = await supabase
                .from('daily_report_entries')
                .insert(dbEntries);

            if (entriesError) throw entriesError;

            setMessage('日報を提出しました！お疲れ様でした。');
            setEntries([]);
            setTimeout(() => router.push('/field-dashboard'), 2000);

        } catch (err: any) {
            console.error(err);
            if (err.code === '23505') { // Unique violation
                setError('この日付の日報は既に提出されています。');
            } else {
                setError(`エラーが発生しました: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Head><title>日報入力 - 統合業務基盤</title></Head>
            <div className="min-h-screen bg-gray-100 p-4 md:p-8">
                <header className="mb-6">
                    <button onClick={() => router.back()} className="text-blue-600 hover:text-blue-800 flex items-center mb-4">
                        <span className="text-xl mr-2">←</span> ダッシュボードへ戻る
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800 border-b pb-2">📋 本日の日報作成</h1>
                </header>

                <main className="max-w-3xl mx-auto space-y-8">
                    {/* Header Info */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
                        <input
                            type="date"
                            value={reportDate}
                            onChange={(e) => setReportDate(e.target.value)}
                            className="block w-full md:w-1/3 border-gray-300 rounded-md shadow-sm p-2 border"
                        />
                    </div>

                    {/* Entry Form */}
                    <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">作業の追加</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">工事選択</label>
                                <select
                                    value={selectedProjectId}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                >
                                    <option value="">選択してください</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.project_name} ({p.customers?.name})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">作業内容</label>
                                <textarea
                                    value={tempContent}
                                    onChange={(e) => setTempContent(e.target.value)}
                                    rows={3}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    placeholder="例: 掘削作業、配管敷設など"
                                />
                            </div>

                            {/* Materials Sub-form */}
                            <div className="bg-gray-50 p-3 rounded border">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">使用材料 (任意)</label>
                                <div className="flex gap-2 mb-2">
                                    <input type="text" placeholder="材料名" value={matName} onChange={e => setMatName(e.target.value)} className="flex-1 border p-1 text-sm rounded" />
                                    <input type="number" placeholder="数" value={matQty} onChange={e => setMatQty(e.target.value)} className="w-16 border p-1 text-sm rounded" />
                                    <input type="text" placeholder="単位" value={matUnit} onChange={e => setMatUnit(e.target.value)} className="w-12 border p-1 text-sm rounded" />
                                    <button onClick={addMaterial} className="bg-gray-600 text-white px-2 rounded text-sm">+</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {tempMaterials.map((m, i) => (
                                        <span key={i} className="bg-white border px-2 py-1 rounded text-xs flex items-center">
                                            {m.name} {m.quantity}{m.unit}
                                            <button onClick={() => removeMaterial(i)} className="ml-2 text-red-500 font-bold">×</button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={addEntry}
                                className="w-full py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700"
                            >
                                この作業をリストに追加
                            </button>
                        </div>
                    </div>

                    {/* Entries List */}
                    {entries.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-700">登録予定の作業リスト ({entries.length}件)</h3>
                            {entries.map((entry, idx) => {
                                const proj = projects.find(p => p.id === entry.projectId);
                                return (
                                    <div key={idx} className="bg-white p-4 rounded shadow flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-blue-800">{proj?.project_name}</p>
                                            <p className="text-gray-800 whitespace-pre-wrap">{entry.content}</p>
                                            {entry.materials.length > 0 && (
                                                <p className="text-sm text-gray-500 mt-1">
                                                    材料: {entry.materials.map(m => `${m.name} ${m.quantity}${m.unit}`).join(', ')}
                                                </p>
                                            )}
                                        </div>
                                        <button onClick={() => removeEntry(idx)} className="text-red-500 text-sm hover:underline">削除</button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Final Submit */}
                    <div className="pt-4">
                        {error && <p className="text-red-600 bg-red-50 p-3 mb-4 rounded">{error}</p>}
                        {message && <p className="text-green-600 bg-green-50 p-3 mb-4 rounded">{message}</p>}

                        <button
                            onClick={handleSubmit}
                            disabled={loading || entries.length === 0}
                            className={`w-full py-4 rounded-lg text-white font-bold text-lg shadow-lg transition ${loading || entries.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                                }`}
                        >
                            {loading ? '送信中...' : '日報を提出する (完了)'}
                        </button>
                    </div>

                </main>
            </div>
        </>
    );
};

export default DailyReportIndexPage;
