// frontend/components/Sidebar.tsx (フルコード)

import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabaseClient';

// サイドバーのメニュー項目定義
const navItems = [
    { name: 'ダッシュボード', href: '/' },
    { name: '顧客管理', href: '/customers' },
    { name: '工事管理', href: '/projects' },
    { name: '請求・原価管理', href: '/billing' },
];

const Sidebar: React.FC = () => {
    const router = useRouter();

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
                    onClick={() => supabase.auth.signOut()}
                    className="w-full py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                >
                    ログアウト
                </button>
            </div>
        </div>
    );
};

export default Sidebar;