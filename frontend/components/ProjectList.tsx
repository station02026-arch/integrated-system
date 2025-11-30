import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';

// 工事データの型を定義 (顧客名も含む)
interface Project {
    id: string;
    project_name: string;
    contract_amount: number | null;
    status: string;
    // 顧客情報 (JOINで取得)
    customers: {
        name: string;
    } | null;
    estimates: { total_amount: number; status: string }[];
    contracts: { contract_amount: number; status: string }[];
}

const ProjectList: React.FC<{ onProjectRegistered: string }> = ({ onProjectRegistered }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchProjects();
    }, [onProjectRegistered]); // 工事登録成功時に再読み込み

    const fetchProjects = async () => {
        setLoading(true);
        setError('');

        // データベースから工事データを取得
        // RLSが有効な環境では、このSELECTが権限に引っかかる場合がある
        // estimatesも取得して承認済みの合計を計算する
        const { data, error } = await supabase
            .from('projects')
            .select('*, customers(name), estimates(total_amount, status), contracts(contract_amount, status)')
            .order('start_date', { ascending: false });

        if (error) {
            console.error('工事一覧の取得エラー:', error);
            setError('工事一覧の取得中にエラーが発生しました。RLSポリシーを確認してください。');
            setLoading(false);
            return;
        }

        setProjects(data || []);
        setLoading(false);
    };

    const handleDelete = async (projectId: string) => {
        if (!window.confirm('本当にこの工事を削除しますか？この操作は元に戻せません。')) {
            return;
        }

        setLoading(true);
        setError('');

        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (error) {
            console.error('工事の削除エラー:', error);
            setError('工事の削除中にエラーが発生しました。関連するデータ（見積、契約など）が存在するため削除できない可能性があります。');
        } else {
            alert('工事が正常に削除されました。');
            fetchProjects(); // 削除後にリストを再読み込み
        }
        setLoading(false);
    };

    // Helper to calculate project amount (Contract > Estimate)
    const getProjectAmount = (project: Project) => {
        // First check for signed contract
        const signedContract = project.contracts?.find(c => c.status === 'signed');
        if (signedContract) return signedContract.contract_amount;

        // Fallback to approved estimates
        if (!project.estimates) return 0;
        return project.estimates
            .filter(e => e.status === 'approved')
            .reduce((sum, e) => sum + e.total_amount, 0);
    };

    const statusMap: { [key: string]: string } = {
        'planning': '計画中',
        'construction_in_progress': '着工中',
        'completed': '完了',
        'cancelled': 'キャンセル'
    };

    if (loading) {
        return <p className="text-blue-600">工事データを読み込み中...</p>;
    }

    if (error) {
        return <p className="text-red-600">エラー: {error}</p>;
    }

    if (projects.length === 0) {
        return (
            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700">
                まだ工事情報が登録されていません。
            </div>
        );
    }

    // 工事一覧をテーブルで表示
    return (
        <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">登録済み工事一覧 ({projects.length}件)</h2>
            <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">工事名 / ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">顧客名</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金額 (契約/見積)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                            <th className="px-6 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {projects.map((project) => (
                            <tr key={project.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                    {project.project_name}
                                    <div className="text-xs text-gray-400 font-mono mt-1">ID: {project.id.substring(0, 8)}...</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {project.customers?.name || '不明'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    ¥{getProjectAmount(project).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium 
                                        ${project.status === 'construction_in_progress' ? 'bg-blue-100 text-blue-800' :
                                            project.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                'bg-yellow-100 text-yellow-800'}`}>
                                        {statusMap[project.status] || project.status}
                                    </span>
                                </td>
                                {/* 詳細ボタンを追加 */}
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <Link href={`/project-detail/${project.id}`} className="text-indigo-600 hover:text-indigo-900">
                                        詳細/黒板確認
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(project.id)}
                                        className="text-red-600 hover:text-red-900 ml-4"
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
    );
};

export default ProjectList;