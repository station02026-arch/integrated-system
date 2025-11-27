// frontend/components/AuthForm.tsx (フルコード)

import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthForm: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false); // true: サインアップ, false: サインイン
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (password.length < 6) {
      setError('パスワードは6文字以上である必要があります。');
      setLoading(false);
      return;
    }

    const { data, error: authError } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      // エラーメッセージは Supabase から返される
      setError(authError.message);
    } else if (isSignUp && data.user) {
      // サインアップ成功時（メール確認は無効化しているため、すぐに利用可能）
      setMessage('サインアップに成功しました。ログインしてください。');
      setIsSignUp(false); // ログイン画面に戻す
      setEmail('');
      setPassword('');
    } else if (!isSignUp && data.user) {
      // サインイン成功時（AuthContainerがセッションを検知し、自動で画面遷移します）
      setMessage('ログイン成功！システムに移動中...');
    } else {
      // その他の不明なエラー
      setError('不明な認証エラーが発生しました。');
    }

    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold text-center text-gray-900">
          {isSignUp ? '新規アカウント登録' : 'システムへログイン'}
        </h2>

        {error && <p className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded-md border border-red-200">{error}</p>}
        {message && <p className="text-sm font-medium text-green-600 bg-green-50 p-3 rounded-md border border-green-200">{message}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">メールアドレス</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">パスワード (6文字以上)</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {loading ? '処理中...' : isSignUp ? '登録してログイン' : 'ログイン'}
          </button>
        </form>

        <div className="text-center text-sm">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-medium text-blue-600 hover:text-blue-500"
            disabled={loading}
          >
            {isSignUp ? 'すでにアカウントをお持ちの方はこちら (ログイン)' : 'アカウントをお持ちでない方はこちら (新規登録)'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;