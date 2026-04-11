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
      <div className="border-l-4 border-indigo-500 pl-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">学生管理</h1>
        <p className="text-sm text-gray-400 mt-0.5">查看和管理所有学生信息</p>
      </div>

      <div className="flex gap-3 mb-4 items-center">
        <input
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 max-w-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="搜索姓名…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
        <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-500 text-xs font-semibold">姓名</th>
                <th className="px-4 py-3 text-left text-gray-500 text-xs font-semibold">班级</th>
                <th className="px-4 py-3 text-left text-gray-500 text-xs font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                      {s.class_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <Link
                      to={`/students/${s.id}`}
                      className="text-xs px-2.5 py-1 rounded-full font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                      得分详情
                    </Link>
                    <Link
                      to={`/reports/${s.id}`}
                      className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                    >
                      心理报告
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">暂无数据</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
