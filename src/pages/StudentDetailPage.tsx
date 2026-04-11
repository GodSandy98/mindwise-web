import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getStudent } from '../api/students';
import { getExams } from '../api/exams';
import { getStudentScores } from '../api/scores';
import { getIndicators } from '../api/indicators';
import ScoreBar from '../components/ScoreBar';
import LevelBadge from '../components/LevelBadge';

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const studentId = Number(id);
  const [examId, setExamId] = useState<number | null>(null);

  const { data: student } = useQuery({ queryKey: ['student', studentId], queryFn: () => getStudent(studentId) });
  const { data: exams = [] } = useQuery({ queryKey: ['exams'], queryFn: getExams });

  useEffect(() => {
    if (exams.length && !examId) setExamId(exams[0].id);
  }, [exams]);
  const { data: indicators = [] } = useQuery({ queryKey: ['indicators'], queryFn: getIndicators });
  const { data: scores, isLoading: scoresLoading } = useQuery({
    queryKey: ['student-scores', studentId, examId],
    queryFn: () => getStudentScores(studentId, examId!),
    enabled: !!examId,
  });

  const indicatorMap = Object.fromEntries(indicators.map(i => [i.id, i.name]));

  function getLevel(score: number | null): 'H' | 'M' | 'L' {
    if (score === null) return 'M';
    if (score >= 0.5) return 'H';
    if (score <= -0.5) return 'L';
    return 'M';
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {student && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="border-l-4 border-indigo-500 pl-4">
            <h1 className="text-2xl font-bold text-gray-800">{student.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                {student.class_name}
              </span>
              <span className="text-xs text-gray-400">ID {student.id}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 whitespace-nowrap">选择考试</label>
            <select
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={examId ?? ''}
              onChange={e => setExamId(Number(e.target.value))}
            >
              {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {scoresLoading && <p className="text-gray-400">加载得分中…</p>}
      {scores && (
        <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-500 text-xs font-semibold">指标</th>
                <th className="px-4 py-3 text-left text-gray-500 text-xs font-semibold">原始分</th>
                <th className="px-4 py-3 text-left text-gray-500 text-xs font-semibold">标准化得分</th>
                <th className="px-4 py-3 text-left text-gray-500 text-xs font-semibold">等级</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {scores.indicator_scores.map(s => (
                <tr key={s.indicator_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{indicatorMap[s.indicator_id] ?? `指标${s.indicator_id}`}</td>
                  <td className="px-4 py-3 text-gray-500">{s.score_raw.toFixed(2)}</td>
                  <td className="px-4 py-3 w-48"><ScoreBar score={s.score_standardized} /></td>
                  <td className="px-4 py-3"><LevelBadge level={getLevel(s.score_standardized)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
