import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';

interface Customer {
    id: string;
    name: string;
}

interface ProjectFormProps {
    onRegistered: (projectId: string) => void;
    initialStatus?: string;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ onRegistered, initialStatus = 'planning' }) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [projectName, setProjectName] = useState('');
    const [contractAmount, setContractAmount] = useState('');
    const [startDate, setStartDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // 顧客一覧を読み込む
    useEffect(() => {
        const fetchCustomers = async () => {
            const { data, error } = await supabase
                .from('customers')
                .select('id, name')
                .order('name', { ascending: true });

            if (error) {
                console.error('顧客一覧読み込みエラー:', error);
                setError('顧客一覧の読み込み中にエラーが発生しました。');
            } else {
                setCustomers(data || []);
                // 顧客がいたら最初の顧客をデフォルト選択
                if (data && data.length > 0) {
                    setSelectedCustomerId(data[0].id);
                }
            }
        };
        fetchCustomers();
    }, []);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        if (!selectedCustomerId) {
            setError('顧客を選択してください。');
            setLoading(false);
            return;
        }

        // データベースに新しい工事を挿入
        const { data: projectData, error: dbError } = await supabase
            .from('projects')
            .insert([{
                customer_id: selectedCustomerId,
                project_name: projectName,
                // 入力がない場合はNULLを許可する設定
                contract_amount: contractAmount ? parseFloat(contractAmount) : null,
                start_date: startDate || null,
                status: initialStatus
            }])
            .select('id') // 工事ID (ProjectID) を取得
            .single();

        if (dbError) {
            console.error('工事登録エラー:', dbError);
            // 権限や外部キー参照のエラーがあるため、具体的なエラーメッセージに頼る
            setError('工事の登録中にエラーが発生しました。権限やデータベース設定（RLSポリシー、必須項目）を確認してください。');
        } else if (projectData) {
            setMessage(`新しい工事を正常に登録しました！発行された工事ID: ${projectData.id}`);
            // フォームをクリア
            setProjectName('');
            setContractAmount('');
            setStartDate('');

            onRegistered(projectData.id); // 登録完了後、親コンポーネントにIDを通知
        }
        setLoading(false);
    };

    if (customers.length === 0) {
        return <p className="text-yellow-600">🚨 工事を作成する前に、先に「顧客管理」で顧客情報を登録してください。</p>
    }

    return (
        <div className="p-8 max-w-3xl bg-white rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">新規工事の作成 ({initialStatus === 'planning' ? '仮登録' : '本登録'})</h2>

            {error && <p className="text-red-600 bg-red-50 p-3 mb-4 rounded">{error}</p>}
            {message && <p className="text-green-600 bg-green-50 p-3 mb-4 rounded">{message}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. 顧客選択 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">顧客の選択*</label>
                    <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50 text-gray-900">
                        {customers.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* 2. 工事名 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">工事名*</label>
                    <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900" />
                </div>

                {/* 3. 契約金額 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">契約金額 (税抜)</label>
                    <input type="number" value={contractAmount} onChange={(e) => setContractAmount(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900" />
                </div>

                {/* 4. 開始予定日 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">開始予定日</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900" />
                </div>

                <button type="submit" disabled={loading}
                    className={`w-full py-2 px-4 rounded-md text-white font-medium ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                        }`}>
                    {loading ? '登録中...' : '工事を登録'}
                </button>
            </form>
        </div>
    );
};

export default ProjectForm;
