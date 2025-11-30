import React from 'react';
import Head from 'next/head';
import Sidebar from './Sidebar';
import { useAuth } from './AuthContainer';
import AuthForm from './AuthForm';

interface LayoutProps {
    children: React.ReactNode;
    title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title = '統合業務基盤' }) => {
    const { user, role, authReady, loading } = useAuth();

    if (!authReady || loading) {
        return <div className="p-8">読み込み中...</div>;
    }

    if (!user) {
        return <AuthForm />;
    }

    // Field users might be restricted in some pages, but Layout itself just renders.
    // Specific page logic should handle role-based access control if needed, 
    // or we can add it here if it applies globally (except for field dashboard).

    return (
        <>
            <Head>
                <title>{title}</title>
            </Head>
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar />
                <main className="flex-grow">
                    {children}
                </main>
            </div>
        </>
    );
};

export default Layout;
