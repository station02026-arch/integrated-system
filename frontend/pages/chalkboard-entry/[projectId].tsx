import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/components/AuthContainer';
import AuthForm from '@/components/AuthForm';

// 黒板データの型（数量計算のベース）
interface ChalkboardData {
    depth: number | null; // 深さ (メートル)
    width: number | null; // 幅 (メートル)
    pipe_type: string;    // 配管種類 (例: VU50, VP100)
    location: string;     // 撮影場所・測点
}

// 工事基本情報の型
interface ProjectInfo {
    id: string;
    project_name: string;
    customers: {
        name: string;
    } | null;
}

const initialChalkboardState: ChalkboardData = {
    depth: null,
    width: null,
    pipe_type: '',
    location: '',
};

const ChalkboardEntryPage: React.FC = () => {
    const router = useRouter();
    const { projectId } = router.query;
    // user?.id を取得するために useAuth を使用
    const { user, role, authReady } = useAuth();
    
    const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
    const [chalkboard, setChalkboard] = useState<ChalkboardData>(initialChalkboardState);
    const [photoFile, setPhotoFile] = useState<File | null>(null); // アップロードする写真ファイル
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // 1. 工事情報の取得
    useEffect(() => {
        // ルーターがIDを解決するまで待つ
        if (!router.isReady || !projectId || !authReady) return;

        const fetchProject = async () => {
            // RLSが無効化されているため、アクセスは通るはず
            const { data, error } = await supabase
                .from('projects')
                .select(`id, project_name, customers(name)`)
                .eq('id', projectId as string)
                .single();

            if (error || !data) {
                console.error('工事情報取得エラー:', error);
                setError('指定された工事情報が見つかりません。');
                return;
            }
            setProjectInfo(data);
        };
        fetchProject();
    }, [router.isReady, projectId, authReady]);
    
    // 認証チェック
    if (!authReady) {
        return <div className="p-4">システム準備中...</div>;
    }
    if (!user) {
        return <AuthForm />;
    }
    // 現場作業員以外はアクセス拒否
    if (role !== 'field') {
        return <div className="p-8 text-red-600">🚨 この画面は現場作業員専用です。</div>;
    }

    // 2. 写真のアップロードとデータ登録
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        if (!photoFile) {
            setError('写真をファイル選択でアップロードしてください。');
            setLoading(false);
            return;
        }
        if (!projectId || !user?.id) {
            setError('工事IDまたはユーザーIDが不明です。再ログインしてください。');
            setLoading(false);
            return;
        }

        const filePath = `${projectId}/${Date.now()}_${photoFile.name}`;

        // Step A: 写真ファイルをSupabase Storageにアップロード
        const { error: uploadError } = await supabase.storage
            .from('project-photos')
            .upload(filePath, photoFile, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('写真アップロードエラー:', uploadError);
            setError(`写真のアップロードに失敗しました: ${uploadError.message}`);
            setLoading(false);
            return;
        }
        
        // Step B: 写真URLと黒板データをデータベースに保存
        const { data: publicUrlData } = supabase.storage
            .from('project-photos')
            .getPublicUrl(filePath);
            
        const finalPhotoUrl = publicUrlData.publicUrl;


        // ★user_id を含めて挿入 (トリガーを削除したため、Next.js側で送信)
        const { error: dbError } = await supabase
            .from('photos')
            .insert({
                project_id: projectId as string,
                photo_url: finalPhotoUrl,
                chalkboard_data: chalkboard, // JSONBとして保存
                photo_type: '掘削状況',
                user_id: user.id, // ★ログインユーザーのIDを送信
            });

        if (dbError) {
            console.error('データベース登録エラー:', dbError);
            // RLSは無効化されているため、このエラーが出たらDBのNOT NULL制約違反の可能性が高い
            setError(`黒板データの登録に失敗しました: ${dbError.message} (DBのスキーマ設定を確認してください)`); 
        } else {
            setMessage('黒板データと写真の登録が完了しました！');
            setChalkboard(initialChalkboardState); // フォームクリア
            setPhotoFile(null);
            (document.getElementById('photo-input') as HTMLInputElement).value = ''; // ファイル入力もクリア
        }

        setLoading(false);
    };

    // projectIdの読み込みやデータ取得が完了していない場合はローディング表示
    if (!projectInfo) {
        return <div className="p-8">工事情報を読み込み中...</div>;
    }

    return (
        <>
            <Head><title>黒板入力 - {projectInfo.project_name}</title></Head>
            <div className="min-h-screen bg-gray-100 p-4 md:p-8">
                <header className="mb-6">
                    <button onClick={() => router.back()} className="text-blue-600 hover:text-blue-800 flex items-center mb-4">
                        <span className="text-xl mr-2">←</span> 現場ダッシュボードに戻る
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800 border-b pb-2">{projectInfo.project_name}</h1>
                    <p className="text-sm text-gray-600">顧客: {projectInfo.customers?.name}</p>
                </header>

                <main className="max-w-xl mx-auto bg-white p-6 rounded-lg shadow-xl">
                    <h2 className="text-xl font-semibold mb-4 text-green-700">📸 黒板データと写真の登録</h2>
                    
                    {error && <p className="text-red-600 bg-red-50 p-3 mb-4 rounded">{error}</p>}
                    {message && <p className="text-green-600 bg-green-50 p-3 mb-4 rounded">{message}</p>}

                    <form onSubmit={handleSave} className="space-y-6">
                        {/* 1. 写真ファイルの選択 (PC代替) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">写真ファイルを選択* (スマホ撮影の代替)</label>
                            <input 
                                id="photo-input"
                                type="file" 
                                accept="image/*" 
                                required
                                onChange={(e) => setPhotoFile(e.target.files ? e.target.files[0] : null)}
                                className="mt-1 block w-full text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {photoFile && <p className="mt-2 text-sm text-gray-500">選択中: {photoFile.name}</p>}
                        </div>

                        {/* 2. 黒板データ入力フォーム */}
                        <div className="border p-4 rounded-lg space-y-3 bg-gray-50">
                            <h3 className="text-lg font-medium text-gray-800">黒板計測データ</h3>
                            
                            {/* 測点/場所 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">測点 / 撮影場所*</label>
                                <input type="text" value={chalkboard.location} onChange={(e) => setChalkboard({...chalkboard, location: e.target.value})} required 
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900" /> 
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* 深さ */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">深さ (m)</label>
                                    <input type="number" step="0.01" value={chalkboard.depth ?? ''} onChange={(e) => setChalkboard({...chalkboard, depth: e.target.value ? parseFloat(e.target.value) : null})} 
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900" /> 
                                </div>
                                {/* 幅 */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">幅 (m)</label>
                                    <input type="number" step="0.01" value={chalkboard.width ?? ''} onChange={(e) => setChalkboard({...chalkboard, width: e.target.value ? parseFloat(e.target.value) : null})} 
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900" /> 
                                </div>
                            </div>
                            
                            {/* 配管種類 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">配管種類 (例: VP50)</label>
                                <input type="text" value={chalkboard.pipe_type} onChange={(e) => setChalkboard({...chalkboard, pipe_type: e.target.value})} 
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900" /> 
                            </div>
                        </div>

                        <button type="submit" disabled={loading}
                                className={`w-full py-3 px-4 rounded-md text-white font-bold transition ${
                                    loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                                }`}>
                            {loading ? 'アップロードと登録中...' : '写真と黒板データを登録'}
                        </button>
                    </form>
                </main>
            </div>
        </>
    );
};

export default ChalkboardEntryPage;