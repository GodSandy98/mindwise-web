import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.name, form.phone, form.password);
      navigate('/login', { state: { message: '注册成功，请登录' } });
    } catch (err: any) {
      setError(err.response?.data?.detail ?? '注册失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-800 mb-1 text-center">教师注册</h1>
        <p className="text-sm text-gray-400 text-center mb-6">注册后需等待管理员分配班级权限</p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="请输入姓名"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="请输入手机号"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="请设置密码"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? '注册中…' : '注册'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          已有账号？
          <Link to="/login" className="text-indigo-600 hover:underline ml-1">登录</Link>
        </p>
      </div>
    </div>
  );
}
