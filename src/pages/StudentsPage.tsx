import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getStudents } from '../api/students';
import { getClasses } from '../api/classes';

export default function StudentsPage() {
  const [classFilter, setClassFilter] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');

  const { data: students = [], isLoading } = useQuery({ queryKey: ['students'], queryFn: getStudents });
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: getClasses });

  const filtered = students.filter(s => {
    if (classFilter !== 'all' && s.class_id !== classFilter) return false;
    if (search && !s.name.includes(search)) return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">学生管理</h1>
      <div className="flex gap-3 mb-4">
        <input
          className="border rounded px-3 py-2 text-sm flex-1 max-w-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="搜索姓名…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={classFilter}
          onChange={e => setClassFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
        >
          <option value="all">全部班级</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <p className="text-gray-500">加载中…</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">姓名</th>
                <th className="px-4 py-3 text-left">班级</th>
                <th className="px-4 py-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{s.id}</td>
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500">{s.class_name}</td>
                  <td className="px-4 py-3 flex gap-3">
                    <Link to={`/students/${s.id}`} className="text-indigo-600 hover:underline">得分详情</Link>
                    <Link to={`/reports/${s.id}`} className="text-purple-600 hover:underline">心理报告</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8">暂无数据</p>}
        </div>
      )}
    </div>
  );
}
