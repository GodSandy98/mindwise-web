import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeachers, createTeacher, updateTeacher } from '../api/teachers';
import { getClasses } from '../api/classes';
import { Teacher } from '../types';

const ROLE_LABELS: Record<string, string> = {
  super_admin: '超级管理员',
  admin_teacher: '管理教师',
  psych_teacher: '心理教师',
  class_teacher: '班主任',
};

export default function AdminPage() {
  const qc = useQueryClient();
  const { data: teachers = [], isLoading } = useQuery({ queryKey: ['teachers'], queryFn: getTeachers });
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: getClasses });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', password: '', role: 'class_teacher', class_id: '' });
  const [error, setError] = useState('');

  const create = useMutation({
    mutationFn: () => createTeacher({
      name: form.name,
      phone: form.phone,
      password: form.password,
      role: form.role,
      class_id: form.class_id ? Number(form.class_id) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teachers'] });
      setShowCreate(false);
      setForm({ name: '', phone: '', password: '', role: 'class_teacher', class_id: '' });
      setError('');
    },
    onError: (e: any) => setError(e.response?.data?.detail ?? '创建失败'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => updateTeacher(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers'] }),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role, class_id }: { id: number; role: string; class_id: number | null }) =>
      updateTeacher(id, { role, class_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers'] }),
  });

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">教师管理</h1>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700"
        >
          {showCreate ? '取消' : '+ 添加教师'}
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-lg shadow p-5 mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">新建教师账号</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">姓名</label>
              <input className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">手机号</label>
              <input className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">密码</label>
              <input type="password" className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">角色</label>
              <select className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="class_teacher">班主任</option>
                <option value="psych_teacher">心理教师</option>
                <option value="admin_teacher">管理教师</option>
              </select>
            </div>
            {(form.role === 'class_teacher') && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">负责班级</label>
                <select className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value })}>
                  <option value="">-- 选择班级 --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
          </div>
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
          >
            {create.isPending ? '创建中…' : '创建'}
          </button>
        </div>
      )}

      {isLoading ? <p className="text-gray-400">加载中…</p> : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">姓名</th>
                <th className="px-4 py-3 text-left">手机号</th>
                <th className="px-4 py-3 text-left">角色</th>
                <th className="px-4 py-3 text-left">班级</th>
                <th className="px-4 py-3 text-left">状态</th>
                <th className="px-4 py-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {teachers.map((t: Teacher) => (
                <tr key={t.id} className={`hover:bg-gray-50 ${!t.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-gray-500">{t.phone}</td>
                  <td className="px-4 py-3">
                    {t.role === 'super_admin' ? (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{ROLE_LABELS[t.role]}</span>
                    ) : (
                      <select
                        className="border rounded px-2 py-0.5 text-xs focus:outline-none"
                        value={t.role}
                        onChange={e => changeRole.mutate({ id: t.id, role: e.target.value, class_id: e.target.value === 'class_teacher' ? t.class_id : null })}
                      >
                        <option value="class_teacher">班主任</option>
                        <option value="psych_teacher">心理教师</option>
                        <option value="admin_teacher">管理教师</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {t.role === 'class_teacher' ? (
                      <select
                        className="border rounded px-2 py-0.5 text-xs focus:outline-none"
                        value={t.class_id ?? ''}
                        onChange={e => changeRole.mutate({ id: t.id, role: t.role, class_id: e.target.value ? Number(e.target.value) : null })}
                      >
                        <option value="">-- 未分配 --</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {t.is_active ? '正常' : '已禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {t.role !== 'super_admin' && (
                      <button
                        onClick={() => toggleActive.mutate({ id: t.id, is_active: !t.is_active })}
                        className={`text-xs hover:underline ${t.is_active ? 'text-red-500' : 'text-green-600'}`}
                      >
                        {t.is_active ? '禁用' : '启用'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
