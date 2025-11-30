import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../../../utils/supabaseClient';
import Layout from '../../../../../components/Layout';
import EstimateEditor from '../../../../../components/financial/EstimateEditor';

const EditEstimatePage = () => {
    const router = useRouter();
    const { projectId, estimateId } = router.query;
    const [estimate, setEstimate] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (estimateId) {
            fetchEstimate();
        }
    }, [estimateId]);

    const fetchEstimate = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('estimates')
            .select('*')
            .eq('id', estimateId)
            .single();

        if (error) console.error('Error fetching estimate:', error);
        else setEstimate(data);
        setLoading(false);
    };

    if (!projectId || !estimateId) return null;

    return (
        <Layout>
            <div className="p-6 max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-6 text-gray-800">見積編集</h1>
                {loading ? (
                    <p>読み込み中...</p>
                ) : estimate ? (
                    <EstimateEditor
                        projectId={projectId as string}
                        initialData={estimate}
                        onSave={() => router.push(`/projects/${projectId}/financial`)}
                        onCancel={() => router.back()}
                    />
                ) : (
                    <p>見積が見つかりません。</p>
                )}
            </div>
        </Layout>
    );
};

export default EditEstimatePage;
