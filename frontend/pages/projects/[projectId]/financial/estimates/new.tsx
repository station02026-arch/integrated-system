import React from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../../../components/Layout';
import EstimateEditor from '../../../../../components/financial/EstimateEditor';

const NewEstimatePage = () => {
    const router = useRouter();
    const { projectId } = router.query;

    if (!projectId) return null;

    return (
        <Layout>
            <div className="p-6 max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-6 text-gray-800">新規見積作成</h1>
                <EstimateEditor
                    projectId={projectId as string}
                    onSave={() => router.push(`/projects/${projectId}/financial`)}
                    onCancel={() => router.back()}
                />
            </div>
        </Layout>
    );
};

export default NewEstimatePage;
