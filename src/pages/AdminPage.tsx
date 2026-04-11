import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeachers, createTeacher, updateTeacher } from '../api/teachers';
import { getClasses, renameClass, archiveClass, restoreClass, batchPromoteClasses } from '../api/classes';
import { Teacher, Class } from '../types';

const ROLE_LABELS: Record<string, string> = {
  super_admin: '超级管理员',
  admin_teacher: '管理教师',
  psych_teacher: '心理教师',
  class_teacher: '班主任',
};

type Tab = 'teachers' | 'classes';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('teachers');

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">系统管理</h1>
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['teachers', 'classes'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-medium rounded-t transition-colors ${
              tab === t
                ? 'bg-white border border-b-white border-gray-200 text-indigo-600 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'teachers' ? '教师管理' : '班级管理'}
          </button>
        ))}
      </div>
      {tab === 'teachers' ? <TeacherPanel /> : <ClassPanel />}
    </div>
  );
}

// ── 教师管理 ──────────────────────────────────────────────────

function TeacherPanel() {
  const qc = useQueryClient();
  const { data: teachers = [], isLoading } = useQuery({ queryKey: ['teachers'], queryFn: getTeachers });
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => getClasses(false) });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', password: '', role: 'class_teacher', class_id: '' });
  const [error, setError] = useState('');

  const create = useMutation({
    mutationFn: () => createTeacher({
      name: form.name, phone: form.phone, password: form.password,
      role: form.role, class_id: form.class_id ? Number(form.class_id) : undefined,
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
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">管理教师账号与权限</p>
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
              <select className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.role} onChange={e => setForm({ ...form, role: e.target.value, class_id: '' })}>
                <option value="class_teacher">班主任</option>
                <option value="psych_teacher">心理教师</option>
                <option value="admin_teacher">管理教师</option>
              </select>
            </div>
            {form.role === 'class_teacher' && (
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
          <button onClick={() => create.mutate()} disabled={create.isPending} className="mt-4 bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50">
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
                      <select className="border rounded px-2 py-0.5 text-xs focus:outline-none" value={t.role}
                        onChange={e => changeRole.mutate({ id: t.id, role: e.target.value, class_id: e.target.value === 'class_teacher' ? t.class_id : null })}>
                        <option value="class_teacher">班主任</option>
                        <option value="psych_teacher">心理教师</option>
                        <option value="admin_teacher">管理教师</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {t.role === 'class_teacher' ? (
                      <select className="border rounded px-2 py-0.5 text-xs focus:outline-none" value={t.class_id ?? ''}
                        onChange={e => changeRole.mutate({ id: t.id, role: t.role, class_id: e.target.value ? Number(e.target.value) : null })}>
                        <option value="">-- 未分配 --</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {t.is_active ? '正常' : '已禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {t.role !== 'super_admin' && (
                      <button onClick={() => toggleActive.mutate({ id: t.id, is_active: !t.is_active })}
                        className={`text-xs hover:underline ${t.is_active ? 'text-red-500' : 'text-green-600'}`}>
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

// ── 班级管理 ──────────────────────────────────────────────────

function ClassPanel() {
  const qc = useQueryClient();
  const { data: allClasses = [], isLoading } = useQuery({
    queryKey: ['classes-all'],
    queryFn: () => getClasses(true),
  });

  const active = allClasses.filter(c => c.is_active);
  const archived = allClasses.filter(c => !c.is_active);

  // 重命名
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [renameError, setRenameError] = useState('');

  const renameMut = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => renameClass(id, name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classes-all'] }); qc.invalidateQueries({ queryKey: ['classes'] }); setRenamingId(null); setRenameError(''); },
    onError: (e: any) => setRenameError(e.response?.data?.detail ?? '重命名失败'),
  });

  // 归档/恢复
  const archiveMut = useMutation({
    mutationFn: (id: number) => archiveClass(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classes-all'] }); qc.invalidateQueries({ queryKey: ['classes'] }); },
  });
  const restoreMut = useMutation({
    mutationFn: (id: number) => restoreClass(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classes-all'] }); qc.invalidateQueries({ queryKey: ['classes'] }); },
  });

  // 批量升级
  const [showPromote, setShowPromote] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [promoteError, setPromoteError] = useState('');

  const promoteMut = useMutation({
    mutationFn: () => batchPromoteClasses([...selectedIds], findText, replaceText),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['classes-all'] });
      qc.invalidateQueries({ queryKey: ['classes'] });
      setShowPromote(false);
      setSelectedIds(new Set());
      setFindText('');
      setReplaceText('');
      setPromoteError('');
      alert(`升级成功：${updated.map(c => c.name).join('、')}`);
    },
    onError: (e: any) => setPromoteError(e.response?.data?.detail ?? '批量升级失败'),
  });

  const [showArchived, setShowArchived] = useState(false);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const previewName = (name: string) =>
    findText && name.includes(findText) ? name.replace(findText, replaceText) : null;

  if (isLoading) return <p className="text-gray-400">加载中…</p>;

  return (
    <div className="space-y-6">
      {/* 在校班级 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700">在校班级 <span className="text-sm font-normal text-gray-400">({active.length})</span></h2>
          <button
            onClick={() => { setShowPromote(v => !v); setSelectedIds(new Set()); setPromoteError(''); }}
            className="border border-indigo-400 text-indigo-600 px-3 py-1.5 rounded text-sm hover:bg-indigo-50"
          >
            {showPromote ? '取消' : '批量升级'}
          </button>
        </div>

        {showPromote && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 mb-3">勾选需要升级的班级，设置替换规则（如「高一」→「高二」）</p>
            <div className="flex gap-3 items-center mb-3">
              <input
                className="border rounded px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="查找（如高一）"
                value={findText}
                onChange={e => setFindText(e.target.value)}
              />
              <span className="text-gray-400">→</span>
              <input
                className="border rounded px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="替换为（如高二）"
                value={replaceText}
                onChange={e => setReplaceText(e.target.value)}
              />
              <button
                onClick={() => promoteMut.mutate()}
                disabled={promoteMut.isPending || selectedIds.size === 0 || !findText || !replaceText}
                className="bg-indigo-600 text-white px-4 py-1.5 rounded text-sm hover:bg-indigo-700 disabled:opacity-40"
              >
                {promoteMut.isPending ? '升级中…' : `确认升级（${selectedIds.size}个）`}
              </button>
            </div>
            {promoteError && <p className="text-red-500 text-xs mb-2">{promoteError}</p>}
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                {showPromote && <th className="px-4 py-3 w-8"></th>}
                <th className="px-4 py-3 text-left">班级名</th>
                {showPromote && <th className="px-4 py-3 text-left text-indigo-500">升级预览</th>}
                <th className="px-4 py-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {active.map(cls => (
                <tr key={cls.id} className="hover:bg-gray-50">
                  {showPromote && (
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedIds.has(cls.id)} onChange={() => toggleSelect(cls.id)} className="rounded" />
                    </td>
                  )}
                  <td className="px-4 py-3 font-medium">
                    {renamingId === cls.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-36"
                          value={renameVal}
                          onChange={e => setRenameVal(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') renameMut.mutate({ id: cls.id, name: renameVal }); if (e.key === 'Escape') setRenamingId(null); }}
                          autoFocus
                        />
                        <button onClick={() => renameMut.mutate({ id: cls.id, name: renameVal })} className="text-xs text-indigo-600 hover:underline">确认</button>
                        <button onClick={() => { setRenamingId(null); setRenameError(''); }} className="text-xs text-gray-400 hover:underline">取消</button>
                        {renameError && renamingId === cls.id && <span className="text-xs text-red-500">{renameError}</span>}
                      </div>
                    ) : cls.name}
                  </td>
                  {showPromote && (
                    <td className="px-4 py-3 text-indigo-500 text-xs">
                      {selectedIds.has(cls.id) && previewName(cls.name)
                        ? <span>→ {previewName(cls.name)}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                  )}
                  <td className="px-4 py-3 flex gap-3">
                    {renamingId !== cls.id && (
                      <button onClick={() => { setRenamingId(cls.id); setRenameVal(cls.name); setRenameError(''); }} className="text-xs text-indigo-500 hover:underline">重命名</button>
                    )}
                    <button
                      onClick={() => { if (confirm(`确认归档「${cls.name}」？归档后该班学生不再显示在学生列表中，但历史数据完整保留。`)) archiveMut.mutate(cls.id); }}
                      className="text-xs text-orange-500 hover:underline"
                    >
                      归档
                    </button>
                  </td>
                </tr>
              ))}
              {active.length === 0 && (
                <tr><td colSpan={showPromote ? 4 : 3} className="px-4 py-8 text-center text-gray-400">暂无在校班级</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 已归档班级 */}
      <div>
        <button
          onClick={() => setShowArchived(v => !v)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <span>{showArchived ? '▲' : '▼'}</span>
          已归档班级（{archived.length}）
        </button>
        {showArchived && (
          <div className="bg-white rounded-lg shadow overflow-hidden opacity-75">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">班级名</th>
                  <th className="px-4 py-3 text-left">归档日期</th>
                  <th className="px-4 py-3 text-left">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {archived.map(cls => (
                  <tr key={cls.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{cls.name}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {cls.graduated_at ? new Date(cls.graduated_at).toLocaleDateString('zh-CN') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => restoreMut.mutate(cls.id)}
                        className="text-xs text-green-600 hover:underline"
                      >
                        恢复
                      </button>
                    </td>
                  </tr>
                ))}
                {archived.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">暂无归档班级</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
