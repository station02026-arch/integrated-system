import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/components/AuthContainer';
import AuthForm from '@/components/AuthForm';

interface Material {
    name: string;
    quantity: number;
    unit: string;
}

interface ProjectInfo {
    id: string;
    project_name: string;
    customers: {
        name: string;
    } | null;
}

const DailyReportPage: React.FC = () => {
    const router = useRouter();
    const { projectId } = router.query;
    const { user, role, authReady } = useAuth();
    
    const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [content, setContent] = useState('');
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Material input state
    const [matName, setMatName] = useState('');
    const [matQty, setMatQty] = useState('');
    const [matUnit, setMatUnit] = useState('');

    // 1. Fetch Project Info
    useEffect(() => {
        if (!router.isReady || !projectId || !authReady) return;

        const fetchProject = async () => {
            const { data, error } = await supabase
                .from('projects')
                .select(`id, project_name, customers(name)`)
                .eq('id', projectId as string)
                .single();

            if (error || !data) {
                console.error('Project fetch error:', error);
                setError('工事情報が見つかりません。');
                return;
            }
            setProjectInfo(data);
        };
        fetchProject();
    }, [router.isReady, projectId, authReady]);

    // Auth Check
    if (!authReady) return <div className="p-4">Loading...</div>;
    if (!user) return <AuthForm />;
    if (role !== 'field') return <div className="p-8 text-red-600">現場作業員専用です。</div>;

    // Add Material Helper
    const addMaterial = () => {
        if (!matName || !matQty) return;
        const newMat: Material = {
            name: matName,
            quantity: parseFloat(matQty),
            unit: matUnit || '個'
        };
        setMaterials([...materials, newMat]);
        setMatName('');
        setMatQty('');
        setMatUnit('');
    };

    const removeMaterial = (index: number) => {
        const newMats = [...materials];
        newMats.splice(index, 1);
        setMaterials(newMats);
    };

    // Submit Report
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        if (!projectId || !user?.id) {
            setError('エラー: プロジェクトまたはユーザーIDが不明です。');
            setLoading(false);
            return;
        }

        const { error: dbError } = await supabase
            .from('daily_reports')
            .insert({
                project_id: projectId,
                user_id: user.id,
                report_date: reportDate,
                content: content,
                materials: materials // Saved as JSONB
            });

        if (dbError) {
            console.error('Report submit error:', dbError);
            setError(`日報の送信に失敗しました: ${dbError.message}`);
        } else {
            setMessage('日報を送信しました！');
            setContent('');
            setMaterials([]);
            // Optional: Redirect back to dashboard after delay
            setTimeout(() => router.push('/field-dashboard'), 1500);
        }
        setLoading(false);
    };

    if (!projectInfo) return <div className="p-8">工事情報を読み込み中...</div>;

    return (
        <>
            <Head><title>日報入力 - {projectInfo.project_name}</title></Head>
            <div className="min-h-screen bg-gray-100 p-4 md:p-8">
                <header className="mb-6">
                    <button onClick={() => router.back()} className="text-blue-600 hover:text-blue-800 flex items-center mb-4">
                        <span className="text-xl mr-2">←</span> 戻る
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800 border-b pb-2">{projectInfo.project_name} - 日報</h1>
                </header>

                <main className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-xl">
                    {error && <p className="text-red-600 bg-red-50 p-3 mb-4 rounded">{error}</p>}
                    {message && <p className="text-green-600 bg-green-50 p-3 mb-4 rounded">{message}</p>}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">日付</label>
                            <input 
                                type="date" 
                                value={reportDate} 
                                onChange={(e) => setReportDate(e.target.value)}
                                required
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>

                        {/* Content */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">作業内容</label>
                            <textarea 
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                required
                                rows={5}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                placeholder="本日の作業内容を詳しく記入してください..."
                            />
                        </div>

                        {/* Materials */}
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h3 className="text-md font-medium text-gray-800 mb-2">使用材料</h3>
                            
                            <div className="flex gap-2 mb-2">
                                <input 
                                    type="text" 
                                    placeholder="材料名 (例: VP50パイプ)" 
                                    value={matName}
                                    onChange={(e) => setMatName(e.target.value)}
                                    className="flex-1 border border-gray-300 rounded p-2 text-sm"
                                />
                                <input 
                                    type="number" 
                                    placeholder="数量" 
                                    value={matQty}
                                    onChange={(e) => setMatQty(e.target.value)}
                                    className="w-20 border border-gray-300 rounded p-2 text-sm"
                                />
                                <input 
                                    type="text" 
                                    placeholder="単位" 
                                    value={matUnit}
                                    onChange={(e) => setMatUnit(e.target.value)}
                                    className="w-16 border border-gray-300 rounded p-2 text-sm"
                                />
                                <button 
                                    type="button"
                                    onClick={addMaterial}
                                    className="bg-blue-500 text-white px-3 rounded hover:bg-blue-600"
                                >
                                    追加
                                </button>
                            </div>

                            {materials.length > 0 && (
                                <ul className="space-y-1 mt-2">
                                    {materials.map((m, idx) => (
                                        <li key={idx} className="flex justify-between items-center bg-white p-2 rounded border text-sm">
                                            <span>{m.name} - {m.quantity} {m.unit}</span>
                                            <button 
                                                type="button" 
                                                onClick={() => removeMaterial(idx)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                削除
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className={`w-full py-3 px-4 rounded-md text-white font-bold transition ${
                                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                        >
                            {loading ? '送信中...' : '日報を提出する'}
                        </button>
                    </form>
                </main>
            </div>
        </>
    );
};

export default DailyReportPage;
