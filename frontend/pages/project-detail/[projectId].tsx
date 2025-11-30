import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/components/AuthContainer';
import Layout from '@/components/Layout';
import Link from 'next/link';

// 黒板データの型（数量計算のベース）
interface ChalkboardData {
    depth: number;
    width: number;
    pipe_type: string;
    location: string;
}
// 写真と黒板データの統合型
interface PhotoData {
    id: string;
    photo_url: string;
    chalkboard_data: ChalkboardData;
    taken_at: string;
}
// 工事基本情報の型
interface ProjectInfo {
    id: string;
    project_name: string;
    customers: { name: string } | { name: string }[] | null;
}

// 数量計算ロジック
const calculateQuantities = (data: ChalkboardData) => {
    // 簡易的に1mの布設と仮定
    const trenchLength = 1.0;
    // 土工量 = 深さ * 幅 * 長さ
    const excavationVolume = (data.depth || 0) * (data.width || 0) * trenchLength;

    // 配管費用 (VP100は単価1500円と仮定)
    const pipeUnitCost = data.pipe_type.includes('VP100') ? 1500 : 800;
    const materialCost = pipeUnitCost * trenchLength;

    return {
        excavationVolume: excavationVolume.toFixed(2), // 土工量 (m³)
        trenchLength: trenchLength.toFixed(1), // 布設延長 (m)
        materialCost: materialCost.toLocaleString(), // 材料費概算
    };
};

const ProjectDetailPage: React.FC = () => {
    const router = useRouter();
    const { projectId } = router.query;
    const { role, authReady } = useAuth();

    const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
    const [photos, setPhotos] = useState<PhotoData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [estimateAmount, setEstimateAmount] = useState<number | null>(null);

    useEffect(() => {
        if (!router.isReady || !projectId || !authReady) return;

        if (role === 'field') {
            setLoading(false);
            setError('🚨 このページは管理業務専用です。');
            return;
        }

        const fetchDetails = async () => {
            setLoading(true);
            setError('');

            try {
                const { data: projectData, error: projError } = await supabase
                    .from('projects')
                    .select(`id, project_name, customers(name)`)
                    .eq('id', projectId as string)
                    .single();

                if (projError || !projectData) {
                    console.error('工事情報取得エラー:', projError);
                    setError('工事情報が見つかりません。');
                    setLoading(false);
                    return;
                }
                setProjectInfo(projectData);

                const { data: photoData, error: photoError } = await supabase
                    .from('photos')
                    .select(`id, photo_url, chalkboard_data, taken_at`)
                    .eq('project_id', projectId as string)
                    .order('taken_at', { ascending: false });

                if (photoError) {
                    console.error('写真データ取得エラー:', photoError);
                    setError('黒板写真データの取得に失敗しました。');
                } else {
                    setPhotos(photoData || []);
                }

                // Fetch total approved estimate amount
                const { data: estimateData, error: estError } = await supabase
                    .from('estimates')
                    .select('total_amount')
                    .eq('project_id', projectId as string)
                    .eq('status', 'approved');

                if (estError) {
                    console.error('見積情報取得エラー:', estError);
                } else {
                    const total = estimateData?.reduce((sum, est) => sum + est.total_amount, 0) || 0;
                    setEstimateAmount(total);
                }

            } catch (err) {
                console.error('予期せぬエラー:', err);
                setError('データの読み込み中に予期せぬエラーが発生しました。');
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [router.isReady, projectId, authReady, role]);

    const getCustomerName = (info: ProjectInfo) => {
        if (!info.customers) return '不明';
        if (Array.isArray(info.customers)) return info.customers[0]?.name || '不明';
        return info.customers.name;
    };

    if (error) {
        return (
            <Layout title="エラー">
                <div className="p-8 text-red-600 bg-red-50 rounded">🚨 {error}</div>
            </Layout>
        );
    }

    if (!projectInfo && !loading) {
        return (
            <Layout title="エラー">
                <div className="p-8 text-red-600">🚨 工事情報が見つかりません。</div>
            </Layout>
        );
    }

    return (
        <Layout title={`詳細: ${projectInfo?.project_name || '読み込み中...'}`}>
            <div className="p-8">
                {loading ? (
                    <p>読み込み中...</p>
                ) : projectInfo && (
                    <>
                        <h1 className="text-3xl font-bold mb-2 text-gray-800">{projectInfo.project_name}</h1>
                        <p className="text-gray-600 mb-2">顧客: {getCustomerName(projectInfo)}</p>
                        <p className="text-gray-600 mb-6">見積金額 (承認済み): <span className="font-bold text-lg">¥{estimateAmount?.toLocaleString() || '0'}</span></p>

                        <nav className="flex space-x-4 border-b pb-2 mb-8">
                            <span className="font-semibold text-indigo-600 border-b-2 border-indigo-600 pb-2">黒板・数量確認</span>
                            <Link href={`/projects/${projectId}/drawing`} className="text-gray-500 hover:text-indigo-600">
                                配管図作成
                            </Link>
                            <Link href={`/projects/${projectId}/financial`} className="text-gray-500 hover:text-indigo-600">
                                請求・入金管理
                            </Link>
                            <Link href={`/projects/${projectId}/documents`} className="text-gray-500 hover:text-indigo-600">
                                書類作成
                            </Link>
                        </nav>

                        <h2 className="text-2xl font-semibold mb-4">登録済み黒板・写真データ ({photos.length}件)</h2>

                        {photos.length === 0 ? (
                            <p className="text-gray-500">この工事にはまだ黒板データが登録されていません。</p>
                        ) : (
                            <div className="space-y-8">
                                {photos.map((photo) => {
                                    const quantities = calculateQuantities(photo.chalkboard_data);
                                    return (
                                        <div key={photo.id} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-indigo-400 grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="md:col-span-2">
                                                <h3 className="text-lg font-bold mb-2">黒板データ入力 ({photo.chalkboard_data.location || '測点不明'})</h3>
                                                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                                                    <p><span className="font-medium text-gray-700">深さ:</span> {photo.chalkboard_data.depth} m</p>
                                                    <p><span className="font-medium text-gray-700">幅:</span> {photo.chalkboard_data.width} m</p>
                                                    <p><span className="font-medium text-gray-700">配管:</span> {photo.chalkboard_data.pipe_type}</p>
                                                    <p><span className="font-medium text-gray-700">撮影日時:</span> {new Date(photo.taken_at).toLocaleString()}</p>
                                                </div>
                                                <div className="mt-4 border p-1 rounded-lg">
                                                    <img src={photo.photo_url} alt="現場写真" className="w-full h-auto rounded-lg max-h-96 object-contain" />
                                                </div>
                                            </div>
                                            <div className="bg-indigo-50 p-4 rounded-lg">
                                                <h3 className="text-xl font-bold mb-3 text-indigo-800">数量自動連動</h3>
                                                <div className="space-y-2">
                                                    <p className="text-lg font-semibold"><span className="text-indigo-600">土工量:</span> {quantities.excavationVolume} m³</p>
                                                    <p className="text-lg font-semibold"><span className="text-indigo-600">布設延長:</span> {quantities.trenchLength} m</p>
                                                    <p className="text-lg font-semibold"><span className="text-indigo-600">材料費概算:</span> ¥ {quantities.materialCost}</p>
                                                </div>
                                                <button className="mt-4 w-full py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 text-sm">
                                                    ✅ 数量を完了書に反映
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
};

export default ProjectDetailPage;