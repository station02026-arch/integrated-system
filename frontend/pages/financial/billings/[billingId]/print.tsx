import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabaseClient';
import Head from 'next/head';

interface BillingDetail {
    id: string;
    billing_number: string;
    issue_date: string;
    due_date: string;
    total_amount: number;
    project_id: string;
    contract_id?: string;
    projects: {
        project_name: string;
        customer_id: string;
        customers: {
            name: string;
            address?: string;
        }
    };
}

const InvoicePrintPage = () => {
    const router = useRouter();
    const { billingId } = router.query;
    const [billing, setBilling] = useState<BillingDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (billingId) {
            fetchBillingDetails(billingId as string);
        }
    }, [billingId]);

    const fetchBillingDetails = async (id: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('billings')
            .select(`
                *,
                projects (
                    project_name,
                    customer_id,
                    customers (
                        name,
                        address
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching billing:', error);
            alert('請求書データの取得に失敗しました');
        } else {
            setBilling(data);
        }
        setLoading(false);
    };

    if (loading) return <div className="p-8">読み込み中...</div>;
    if (!billing) return <div className="p-8">請求書が見つかりません</div>;

    const customerName = billing.projects?.customers?.name || '顧客名未設定';
    const projectName = billing.projects?.project_name || '';

    return (
        <div className="bg-white min-h-screen">
            <Head>
                <title>請求書 - {billing.billing_number}</title>
            </Head>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: A4; }
                    body { margin: 0; -webkit-print-color-adjust: exact; }
                    .no-print { display: none !important; }
                    .print-container { padding: 40px; width: 100%; max-width: 210mm; margin: 0 auto; }
                }
                @media screen {
                    .print-container { 
                        width: 210mm; 
                        min-height: 297mm; 
                        margin: 40px auto; 
                        padding: 40px;
                        background: white; 
                        box-shadow: 0 0 10px rgba(0,0,0,0.1); 
                    }
                    body { background: #f0f0f0; }
                }
            `}</style>

            {/* Toolbar */}
            <div className="no-print fixed top-0 left-0 right-0 bg-gray-800 text-white p-4 flex justify-between items-center shadow-lg z-50">
                <div className="font-bold">請求書プレビュー</div>
                <div className="space-x-4">
                    <button onClick={() => window.close()} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded">閉じる</button>
                    <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-bold">印刷 / PDF保存</button>
                </div>
            </div>

            <div className="print-container text-gray-900 font-serif">
                {/* Header */}
                <div className="flex justify-between items-end border-b-2 border-gray-800 pb-4 mb-8">
                    <h1 className="text-4xl font-bold tracking-widest">御 請 求 書</h1>
                    <div className="text-right">
                        <div className="text-sm text-gray-600">請求番号: {billing.billing_number}</div>
                        <div className="text-sm text-gray-600">発行日: {billing.issue_date}</div>
                    </div>
                </div>

                {/* Customer & Company Info */}
                <div className="flex justify-between mb-12">
                    <div className="w-1/2">
                        <h2 className="text-2xl font-bold border-b border-gray-400 pb-2 mb-4 inline-block min-w-[300px]">
                            {customerName} <span className="text-lg font-normal">御中</span>
                        </h2>
                        <div className="mb-2">
                            <span className="font-bold border-b border-gray-300">件名: {projectName}</span>
                        </div>
                        <div className="text-sm text-gray-600 mt-4">
                            下記の通りご請求申し上げます。
                        </div>
                    </div>

                    <div className="w-1/3 text-sm text-right leading-relaxed">
                        <h3 className="text-lg font-bold mb-2">株式会社 水道工事社</h3>
                        <p>〒123-4567</p>
                        <p>東京都〇〇区〇〇 1-2-3</p>
                        <p>TEL: 03-1234-5678</p>
                        <p>FAX: 03-1234-5679</p>
                        <p>登録番号: T1234567890123</p>
                    </div>
                </div>

                {/* Amount */}
                <div className="mb-12 text-center bg-gray-100 py-4 border border-gray-300 rounded">
                    <span className="text-sm text-gray-600 mr-4">ご請求金額</span>
                    <span className="text-4xl font-bold">¥ {billing.total_amount.toLocaleString()} -</span>
                    <span className="text-sm text-gray-600 ml-2">(税込)</span>
                </div>

                {/* Details Table */}
                <div className="mb-12">
                    <table className="w-full border-collapse border border-gray-400">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="border border-gray-400 p-2 text-center w-16">No.</th>
                                <th className="border border-gray-400 p-2 text-left">摘要</th>
                                <th className="border border-gray-400 p-2 text-right w-24">数量</th>
                                <th className="border border-gray-400 p-2 text-center w-16">単位</th>
                                <th className="border border-gray-400 p-2 text-right w-32">単価</th>
                                <th className="border border-gray-400 p-2 text-right w-32">金額</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Currently we don't have detailed items for billing, so we show a summary line */}
                            <tr>
                                <td className="border border-gray-400 p-2 text-center">1</td>
                                <td className="border border-gray-400 p-2">工事代金として ({projectName})</td>
                                <td className="border border-gray-400 p-2 text-right">1</td>
                                <td className="border border-gray-400 p-2 text-center">式</td>
                                <td className="border border-gray-400 p-2 text-right">{billing.total_amount.toLocaleString()}</td>
                                <td className="border border-gray-400 p-2 text-right">{billing.total_amount.toLocaleString()}</td>
                            </tr>
                            {/* Empty rows to fill space */}
                            {[...Array(5)].map((_, i) => (
                                <tr key={i}>
                                    <td className="border border-gray-400 p-2 text-center">&nbsp;</td>
                                    <td className="border border-gray-400 p-2">&nbsp;</td>
                                    <td className="border border-gray-400 p-2">&nbsp;</td>
                                    <td className="border border-gray-400 p-2">&nbsp;</td>
                                    <td className="border border-gray-400 p-2">&nbsp;</td>
                                    <td className="border border-gray-400 p-2">&nbsp;</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={4} className="border border-gray-400 p-2 text-right font-bold">小計</td>
                                <td colSpan={2} className="border border-gray-400 p-2 text-right">
                                    {Math.round(billing.total_amount / 1.1).toLocaleString()}
                                </td>
                            </tr>
                            <tr>
                                <td colSpan={4} className="border border-gray-400 p-2 text-right font-bold">消費税 (10%)</td>
                                <td colSpan={2} className="border border-gray-400 p-2 text-right">
                                    {(billing.total_amount - Math.round(billing.total_amount / 1.1)).toLocaleString()}
                                </td>
                            </tr>
                            <tr>
                                <td colSpan={4} className="border border-gray-400 p-2 text-right font-bold bg-gray-100">合計</td>
                                <td colSpan={2} className="border border-gray-400 p-2 text-right font-bold bg-gray-100">
                                    ¥ {billing.total_amount.toLocaleString()}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Bank Info */}
                <div className="border border-gray-400 p-4 rounded">
                    <h4 className="font-bold border-b border-gray-300 pb-2 mb-2">お振込先</h4>
                    <div className="flex space-x-8 text-sm">
                        <div>
                            <p>銀行名: 〇〇銀行</p>
                            <p>支店名: 〇〇支店</p>
                        </div>
                        <div>
                            <p>口座種別: 普通</p>
                            <p>口座番号: 1234567</p>
                        </div>
                        <div>
                            <p>口座名義: カ）スイドウコウジシャ</p>
                        </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                        ※ 恐れ入りますが、振込手数料は貴社にてご負担願います。
                        {billing.due_date && <span className="ml-4 font-bold text-red-600">お支払期限: {billing.due_date}</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoicePrintPage;
