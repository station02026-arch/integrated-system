import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabaseClient';

// サイドバーのメニュー項目定義
const navItems = [
    { name: 'ダッシュボード', href: '/' },
    { name: '経営ダッシュボード', href: '/dashboard' },
    { name: '顧客管理', href: '/customers' },
    { name: '工事管理', href: '/projects' },
    { name: '日報管理', href: '/daily-reports-admin' },
    { name: '見積・契約管理', href: '/financial/estimates-contracts' },
    { name: '請求書一覧', href: '/financial/billings' },
    { name: '入金一覧', href: '/financial/payments' },
    { name: '材料マスタ', href: '/materials' },
];

const Sidebar: React.FC = () => {
    const router = useRouter();

    // ★ログアウト処理をラップする関数 (アカウント切り替え時のエラー回避用)
    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('ログアウトエラー:', error);
            // 本来はカスタムモーダルを使うべきだが、開発中の簡易アラートで通知
            alert('ログアウト中にエラーが発生しました。');
            return;
        }
        // ログアウトが成功したら、強制的にルートにリダイレクト (履歴に残さないreplaceが重要)
        router.replace('/');
    };

    return (
        <div className="w-64 bg-gray-800 text-white min-h-screen p-4 flex flex-col">
            <div className="text-xl font-bold mb-8 border-b border-gray-700 pb-4">
                💼 業務統合基盤
            </div>
            <nav className="flex-grow">
                {navItems.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={`block py-2.5 px-4 rounded transition duration-200 
                            ${router.pathname === item.href ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                    >
                        {item.name}
                    </Link>
                ))}
            </nav>
            <div className="mt-auto pt-4 border-t border-gray-700">
                <button
                    // ★修正: handleLogout を呼び出す
                    onClick={handleLogout}
                    className="w-full py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                >
                    ログアウト
                </button>
            </div>
        </div>
    );
};

export default Sidebar;