import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getExamScores, computeScores } from '../api/scores';
import { getExam } from '../api/exams';
import { getStudents } from '../api/students';
import { getIndicators } from '../api/indicators';
import ScoreBar from '../components/ScoreBar';

export default function ExamScoresPage() {
  const { id } = useParams<{ id: string }>();
  const examId = Number(id);

  const { data: exam } = useQuery({ queryKey: ['exam', examId], queryFn: () => getExam(examId) });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: getStudents });
  const { data: indicators = [] } = useQuery({ queryKey: ['indicators'], queryFn: getIndicators });
  const { data: scores, refetch, isLoading } = useQuery({
    queryKey: ['exam-scores', examId],
    queryFn: () => getExamScores(examId),
    retry: false,
  });

  const compute = useMutation({
    mutationFn: () => computeScores(examId),
    onSuccess: () => refetch(),
  });

  const studentMap = Object.fromEntries(students.map(s => [s.id, s.name]));
  const indicatorMap = Object.fromEntries(indicators.map(i => [i.id, i.name]));

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{exam?.name ?? '考试得分'}</h1>
          <p className="text-sm text-gray-400 mt-0.5">全班标准化得分总览</p>
        </div>
        <button
          onClick={() => compute.mutate()}
          disabled={compute.isLoading}
          className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {compute.isLoading ? '计算中…' : '重新计算得分'}
        </button>
      </div>

      {isLoading && <p className="text-gray-400">加载中…</p>}
      {scores && scores.results.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left sticky left-0 bg-gray-50">学生</th>
                {scores.results[0].indicator_scores.map(s => (
                  <th key={s.indicator_id} className="px-3 py-3 text-left whitespace-nowrap">
                    {indicatorMap[s.indicator_id] ?? `指标${s.indicator_id}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {scores.results.map(r => (
                <tr key={r.student_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium sticky left-0 bg-white">
                    {studentMap[r.student_id] ?? `学生${r.student_id}`}
                  </td>
                  {r.indicator_scores.map(s => (
                    <td key={s.indicator_id} className="px-3 py-3 min-w-[100px]">
                      <ScoreBar score={s.score_standardized} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!isLoading && !scores && (
        <div className="text-center py-16 text-gray-400">
          <p className="mb-4">暂无得分数据，请先点击「重新计算得分」</p>
        </div>
      )}
    </div>
  );
}
