import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, getMe } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { access_token } = await login(phone, password);
      localStorage.setItem('access_token', access_token);
      const user = await getMe();
      setAuth(access_token, user);
      navigate('/students');
    } catch (err: any) {
      setError(err.response?.data?.detail ?? '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-md w-full max-w-sm overflow-hidden">
        <div className="h-1.5 bg-indigo-600 rounded-t-xl" />
        <div className="px-8 pt-7 pb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-1 text-center">MindWise</h1>
          <p className="text-sm text-gray-400 text-center mb-7">学生心理测评系统</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">手机号</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="请输入手机号"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">密码</label>
              <input
                type="password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="请输入密码"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '登录中…' : '登录'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            还没有账号？
            <Link to="/register" className="text-indigo-600 hover:underline ml-1">注册</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
