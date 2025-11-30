import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { supabase } from '@/utils/supabaseClient';
import Layout from '../../../../components/Layout';

// Dynamically import PipeLinkerEditor to avoid SSR issues with Konva
const PipeLinkerEditor = dynamic(
    () => import('../../../../components/drawing/PipeLinkerEditor'),
    { ssr: false }
);

const DrawingPage = () => {
    const router = useRouter();
    const { projectId } = router.query;
    const [loading, setLoading] = useState(true);
    const [drawingData, setDrawingData] = useState<any>(null);
    const [drawingId, setDrawingId] = useState<string | null>(null);

    useEffect(() => {
        if (projectId) {
            fetchDrawing(projectId as string);
        }
    }, [projectId]);

    const fetchDrawing = async (id: string) => {
        const { data, error } = await supabase
            .from('drawings')
            .select('*')
            .eq('project_id', id)
            .single();

        if (data) {
            setDrawingId(data.id);
            // Parse JSON content if it exists, otherwise null
            try {
                const parsed = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
                // Check if it's the new format (has nodes/edges)
                if (parsed && parsed.nodes) {
                    setDrawingData(parsed);
                }
            } catch (e) {
                console.log('Legacy drawing content or empty');
            }
        }
        setLoading(false);
    };

    const handleSave = async (newData: any) => {
        const payload = {
            project_id: projectId,
            content: JSON.stringify(newData), // Store as JSON string for now to be safe
            metadata: {
                updated_at: new Date().toISOString(),
                tool: 'PipeLinker'
            }
        };

        const { error } = drawingId
            ? await supabase.from('drawings').update(payload).eq('id', drawingId)
            : await supabase.from('drawings').insert([payload]);

        if (error) {
            alert('保存エラー: ' + error.message);
        } else {
            alert('保存しました');
        }
    };

    if (loading) return <div className="p-8">読み込み中...</div>;

    return (
        <Layout title="配管図作成 (Pipe Linker)">
            <div className="h-[calc(100vh-64px)] flex flex-col">
                <div className="bg-white border-b p-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-800">Pipe Linker</h1>
                    <div className="text-sm text-gray-500">
                        モバイルモード推奨 (Chrome DevTools: Ctrl+Shift+M)
                    </div>
                </div>
                <div className="flex-grow relative">
                    <PipeLinkerEditor
                        initialData={drawingData}
                        onSave={handleSave}
                    />
                </div>
            </div>
        </Layout>
    );
};

export default DrawingPage;
