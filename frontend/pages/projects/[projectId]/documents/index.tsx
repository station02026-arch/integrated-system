import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabaseClient';
import Layout from '../../../../components/Layout';
import Head from 'next/head';

interface Project {
    id: string;
    project_name: string;
    customer_id: string;
    customers: {
        name: string;
        address: string;
    };
    start_date: string;
    end_date: string;
}

interface PublicDoc {
    id?: string;
    project_id: string;
    doc_type: string;
    content: any;
    status: string;
}

const DocumentsPage = () => {
    const router = useRouter();
    const { projectId } = router.query;
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [docType, setDocType] = useState('completion_report');
    const [formData, setFormData] = useState<any>({});
    const [savedDoc, setSavedDoc] = useState<PublicDoc | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);

    useEffect(() => {
        if (projectId) {
            fetchProject(projectId as string);
            fetchSavedDoc(projectId as string);
        }
    }, [projectId]);

    const fetchProject = async (id: string) => {
        const { data, error } = await supabase
            .from('projects')
            .select(`
                *,
                customers (
                    name,
                    address
                )
            `)
            .eq('id', id)
            .single();

        if (error) console.error('Error fetching project:', error);
        else {
            setProject(data);
            // Pre-fill form data
            setFormData({
                project_name: data.project_name,
                customer_name: data.customers?.name,
                customer_address: data.customers?.address,
                construction_start: data.start_date,
                construction_end: data.end_date,
                completion_date: new Date().toISOString().split('T')[0],
            });
        }
        setLoading(false);
    };

    const fetchSavedDoc = async (id: string) => {
        const { data, error } = await supabase
            .from('public_docs')
            .select('*')
            .eq('project_id', id)
            .eq('doc_type', 'completion_report') // Currently only supporting one type per project for simplicity
            .single();

        if (data) {
            setSavedDoc(data);
            setFormData(data.content);
        }
    };

    const handleSave = async () => {
        const payload = {
            project_id: projectId,
            doc_type: docType,
            content: formData,
            status: 'draft'
        };

        const { error } = savedDoc?.id
            ? await supabase.from('public_docs').update(payload).eq('id', savedDoc.id)
            : await supabase.from('public_docs').insert([payload]);

        if (error) {
            alert('保存エラー: ' + error.message);
        } else {
            alert('保存しました');
            fetchSavedDoc(projectId as string);
        }
    };

    const handlePrint = () => {
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 100);
    };

    if (loading) return <div className="p-8">読み込み中...</div>;
    if (!project) return <div className="p-8">プロジェクトが見つかりません</div>;

    return (
        <Layout title="書類作成">
            <div className={`p-8 ${isPrinting ? 'hidden' : ''}`}>
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">書類作成: {project.project_name}</h1>
                    <div className="space-x-4">
                        <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">保存</button>
                        <button onClick={handlePrint} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">印刷プレビュー</button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded shadow mb-8">
                    <h2 className="text-xl font-bold mb-4">工事完了届</h2>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">宛名 (提出先)</label>
                            <input
                                type="text"
                                value={formData.recipient || '〇〇水道局長'}
                                onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                                className="mt-1 block w-full border border-gray-300 rounded p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">日付</label>
                            <input
                                type="date"
                                value={formData.report_date || new Date().toISOString().split('T')[0]}
                                onChange={(e) => setFormData({ ...formData, report_date: e.target.value })}
                                className="mt-1 block w-full border border-gray-300 rounded p-2"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700">工事名称</label>
                            <input
                                type="text"
                                value={formData.project_name}
                                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                                className="mt-1 block w-full border border-gray-300 rounded p-2"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700">工事場所 (顧客住所)</label>
                            <input
                                type="text"
                                value={formData.customer_address}
                                onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                                className="mt-1 block w-full border border-gray-300 rounded p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">着工日</label>
                            <input
                                type="date"
                                value={formData.construction_start}
                                onChange={(e) => setFormData({ ...formData, construction_start: e.target.value })}
                                className="mt-1 block w-full border border-gray-300 rounded p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">完了日</label>
                            <input
                                type="date"
                                value={formData.completion_date}
                                onChange={(e) => setFormData({ ...formData, completion_date: e.target.value })}
                                className="mt-1 block w-full border border-gray-300 rounded p-2"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Print View */}
            <div className="print-only hidden">
                <style jsx global>{`
                    @media print {
                        body * { visibility: hidden; }
                        .print-only, .print-only * { visibility: visible; }
                        .print-only { position: absolute; left: 0; top: 0; width: 100%; }
                        @page { size: A4; margin: 20mm; }
                    }
                    .print-only { display: block; font-family: "Mincho", serif; }
                `}</style>

                <div className="max-w-[210mm] mx-auto p-8">
                    <div className="text-right mb-8">{formData.report_date}</div>
                    <div className="text-left text-xl font-bold mb-12">{formData.recipient} 様</div>

                    <div className="text-center mb-16">
                        <h1 className="text-3xl font-bold border-b-2 border-black inline-block pb-2">工事完了届</h1>
                    </div>

                    <div className="text-right mb-8">
                        <p>住所: 東京都〇〇区〇〇 1-2-3</p>
                        <p>氏名: 株式会社 水道工事社</p>
                        <p>代表取締役 水道 太郎 ㊞</p>
                    </div>

                    <div className="mb-8">
                        <p>下記の通り工事が完了しましたのでお届けします。</p>
                    </div>

                    <div className="border border-black p-4">
                        <div className="grid grid-cols-[120px_1fr] gap-4 mb-4">
                            <div className="font-bold">1. 工事名称</div>
                            <div>{formData.project_name}</div>
                        </div>
                        <div className="grid grid-cols-[120px_1fr] gap-4 mb-4">
                            <div className="font-bold">2. 工事場所</div>
                            <div>{formData.customer_address}</div>
                            <div></div>
                            <div>({formData.customer_name} 様邸)</div>
                        </div>
                        <div className="grid grid-cols-[120px_1fr] gap-4 mb-4">
                            <div className="font-bold">3. 工期</div>
                            <div>
                                自 {formData.construction_start}<br />
                                至 {formData.completion_date}
                            </div>
                        </div>
                        <div className="grid grid-cols-[120px_1fr] gap-4">
                            <div className="font-bold">4. 備考</div>
                            <div className="h-32"></div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default DocumentsPage;
