import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getExams } from '../api/exams';

export default function ExamsPage() {
  const { data: exams = [], isLoading } = useQuery({ queryKey: ['exams'], queryFn: getExams });

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">考试列表</h1>
      {isLoading ? <p className="text-gray-500">加载中…</p> : (
        <div className="grid gap-4">
          {exams.map(e => (
            <div key={e.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">{e.name}</p>
                <p className="text-sm text-gray-400 mt-0.5">{new Date(e.date).toLocaleDateString('zh-CN')}</p>
              </div>
              <div className="flex gap-3 text-sm">
                <Link to={`/exams/${e.id}/scores`} className="text-indigo-600 hover:underline">全班得分</Link>
                <Link to={`/exams/${e.id}/submit`} className="text-green-600 hover:underline">提交答卷</Link>
              </div>
            </div>
          ))}
          {exams.length === 0 && <p className="text-gray-400 text-center py-8">暂无考试</p>}
        </div>
      )}
    </div>
  );
}
