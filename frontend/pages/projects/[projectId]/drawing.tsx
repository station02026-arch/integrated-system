import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/components/AuthContainer';
import AuthForm from '@/components/AuthForm';
import Link from 'next/link';
import CanvasApp from '@/components/drawing/CanvasApp';

const DrawingEditor = () => {
    const { user, authReady } = useAuth();
    const router = useRouter();
    const { projectId } = router.query;

    const [initialData, setInitialData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Load existing drawing
    useEffect(() => {
        if (!projectId || !authReady) return;

        const fetchDrawing = async () => {
            const { data, error } = await supabase
                .from('drawings')
                .select('*')
                .eq('project_id', projectId)
                .eq('type', 'piping')
                .single();

            if (data && data.data) {
                setInitialData(data.data);
            }
            setLoading(false);
        };
        fetchDrawing();
    }, [projectId, authReady]);

    // Save drawing
    const handleSave = async (drawingData: any) => {
        if (!projectId) return;

        // Check if exists
        const { data: existing } = await supabase
            .from('drawings')
            .select('id')
            .eq('project_id', projectId)
            .eq('type', 'piping')
            .single();

        if (existing) {
            const { error } = await supabase
                .from('drawings')
                .update({ data: drawingData, updated_at: new Date() })
                .eq('id', existing.id);
            if (error) alert('保存に失敗しました');
            else alert('保存しました');
        } else {
            const { error } = await supabase
                .from('drawings')
                .insert([{
                    project_id: projectId,
                    type: 'piping',
                    data: drawingData
                }]);
            if (error) alert('保存に失敗しました');
            else alert('保存しました');
        }
    };

    if (!authReady) return <div>Loading...</div>;
    if (!user) return <AuthForm />;

    return (
        <>
            <Head><title>配管図エディタ</title></Head>
            <div className="flex h-screen flex-col bg-gray-100">
                {/* Header */}
                <header className="bg-white border-b p-2 flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <Link href="/field-dashboard" className="text-gray-500 hover:text-gray-800 text-sm">← ダッシュボードへ</Link>
                        <h1 className="text-lg font-bold text-gray-800">配管図エディタ</h1>
                    </div>
                </header>

                <div className="flex-grow overflow-hidden">
                    {!loading && (
                        <CanvasApp
                            initialData={initialData}
                            onSave={handleSave}
                        />
                    )}
                </div>
            </div>
        </>
    );
};

export default DrawingEditor;
