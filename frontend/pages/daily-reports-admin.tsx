import Head from 'next/head';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/components/AuthContainer';
import AuthForm from '@/components/AuthForm';

interface ReportEntry {
    id: string;
    project_id: string;
    content: string;
    materials: any[];
    projects: { project_name: string };
}

interface DailyReport {
    id: string;
    user_id: string;
    report_date: string;
    created_at: string;
    users: { email: string }; // Joined from auth.users? No, public.users usually
    daily_report_entries: ReportEntry[];
}

const DailyReportsAdminPage = () => {
    const { user, role, authReady } = useAuth();
    const [reports, setReports] = useState<DailyReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState('');

    useEffect(() => {
        if (!authReady) return;
        fetchReports();
    }, [authReady, filterDate]);

    const fetchReports = async () => {
        setLoading(true);
        let query = supabase
            .from('daily_reports')
            .select(`
                id, 
                user_id, 
                report_date, 
                created_at,
                daily_report_entries (
                    id,
                    project_id,
                    content,
                    materials,
                    projects (project_name)
                )
            `)
            .order('report_date', { ascending: false });

        if (filterDate) {
            query = query.eq('report_date', filterDate);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching reports:', error);
        } else {
            // Fetch user emails manually since we can't join auth.users easily without a public view
            // Or we can assume public.users has email or name.
            // Let's try to fetch public.users info if available.
            // For now, we'll just show the user_id or try to fetch names separately if needed.
            // Actually, let's just display the ID for now to be safe, or fetch from public.users if it exists.
            // The AuthContainer uses 'public.users', so let's try to join that.
            const { data: reportsWithUsers, error: userError } = await supabase
                .from('daily_reports')
                .select(`
                    *,
                    users (email, role), 
                    daily_report_entries (
                        *,
                        projects (project_name)
                    )
                `)
                .order('report_date', { ascending: false });

            if (!userError && reportsWithUsers) {
                setReports(reportsWithUsers as any);
            } else {
                // Fallback if join fails
                setReports(data as any || []);
            }
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('本当にこの日報を削除しますか？')) return;

        setLoading(true);
        const { error } = await supabase
            .from('daily_reports')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting report:', error);
            alert('削除に失敗しました: ' + error.message);
        } else {
            fetchReports();
        }
        setLoading(false);
    };

    if (!authReady) return <div className="p-8">Loading...</div>;
    if (!user) return <AuthForm />;
    if (role === 'field') return <div className="p-8 text-red-600">権限がありません。</div>;

    return (
        <>
            <Head><title>日報管理 - 統合業務基盤</title></Head>
            <div className="flex">
                <Sidebar />
                <main className="flex-grow p-8 bg-gray-50 min-h-screen">
                    <h1 className="text-3xl font-bold mb-8 text-gray-800">日報管理</h1>

                    <div className="bg-white p-4 rounded shadow mb-6 flex items-center gap-4">
                        <label className="font-bold text-gray-800">日付フィルタ:</label>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="border rounded p-2 text-gray-900 bg-white"
                        />
                        <button onClick={() => setFilterDate('')} className="text-sm text-blue-600 hover:underline">クリア</button>
                        <button onClick={fetchReports} className="ml-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">更新</button>
                    </div>

                    {loading ? (
                        <p>読み込み中...</p>
                    ) : reports.length === 0 ? (
                        <p className="text-gray-500">日報は見つかりませんでした。</p>
                    ) : (
                        <div className="space-y-6">
                            {reports.map(report => (
                                <div key={report.id} className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                                    <div className="bg-gray-100 p-4 flex justify-between items-center border-b">
                                        <div>
                                            <span className="font-bold text-lg mr-4">{report.report_date}</span>
                                            <span className="text-gray-600 text-sm">
                                                提出者: {(report as any).users?.email || report.user_id}
                                            </span>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="text-xs text-gray-400">ID: {report.id}</span>
                                            <button
                                                onClick={() => handleDelete(report.id)}
                                                className="ml-4 text-red-600 hover:text-red-900 text-sm"
                                            >
                                                削除
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        {report.daily_report_entries && report.daily_report_entries.length > 0 ? (
                                            <div className="space-y-4">
                                                {report.daily_report_entries.map(entry => (
                                                    <div key={entry.id} className="border-l-4 border-blue-400 pl-4 py-1">
                                                        <p className="font-bold text-blue-800">
                                                            {entry.projects?.project_name || '不明な工事'}
                                                        </p>
                                                        <p className="text-gray-800 whitespace-pre-wrap my-1">{entry.content}</p>
                                                        {entry.materials && Array.isArray(entry.materials) && entry.materials.length > 0 && (
                                                            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-2 inline-block">
                                                                <span className="font-bold">使用材料:</span>
                                                                <ul className="list-disc list-inside ml-2">
                                                                    {entry.materials.map((m: any, i: number) => (
                                                                        <li key={i}>{m.name}: {m.quantity}{m.unit}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-400 italic">作業明細なし</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </>
    );
};

export default DailyReportsAdminPage;
