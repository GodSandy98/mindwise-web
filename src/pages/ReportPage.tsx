import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getStudent } from '../api/students';
import { getExams } from '../api/exams';
import { generateReport, saveReport } from '../api/reports';
import { ReportGenerateResponse } from '../types';
import LevelBadge from '../components/LevelBadge';

export default function ReportPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const sid = Number(studentId);

  const [examId, setExamId] = useState<number | null>(null);
  const [report, setReport] = useState<ReportGenerateResponse | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const { data: student } = useQuery({ queryKey: ['student', sid], queryFn: () => getStudent(sid) });
  const { data: exams = [] } = useQuery({ queryKey: ['exams'], queryFn: getExams });

  useEffect(() => {
    if (exams.length && !examId) setExamId(exams[0].id);
  }, [exams]);

  const generate = useMutation({
    mutationFn: () => generateReport(sid, examId!),
    onSuccess: data => { setReport(data); setSaved(false); setError(''); },
    onError: (e: any) => setError(e.response?.data?.detail ?? '生成失败'),
  });

  const save = useMutation({
    mutationFn: () => saveReport(report!),
    onSuccess: () => setSaved(true),
  });

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {student ? `${student.name} 的心理报告` : '心理报告'}
        </h1>
        {student && <p className="text-sm text-gray-400 mt-1">{student.class_name}</p>}
      </div>

      <div className="flex gap-3 mb-6 items-end">
        <div>
          <label className="block text-sm text-gray-600 mb-1">选择考试</label>
          <select
            className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={examId ?? ''}
            onChange={e => { setExamId(Number(e.target.value)); setReport(null); }}
          >
            {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <button
          onClick={() => generate.mutate()}
          disabled={generate.isLoading || !examId}
          className="bg-indigo-600 text-white px-4 py-1.5 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {generate.isLoading ? '生成中…' : '生成报告'}
        </button>
        {report && !saved && (
          <button
            onClick={() => save.mutate()}
            disabled={save.isLoading}
            className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50"
          >
            {save.isLoading ? '保存中…' : '保存报告'}
          </button>
        )}
        {saved && <span className="text-green-600 text-sm">已保存</span>}
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {report && (
        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-3">优势指标分析</h2>
            <div className="space-y-3">
              {report.strengths_analysis.map(item => (
                <div key={item.indicator_name} className="bg-green-50 border border-green-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-800">{item.indicator_name}</span>
                    <LevelBadge level={item.level} />
                    <span className="text-xs text-gray-400 ml-auto">{item.score_standardized.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.analysis}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-3">不足指标分析</h2>
            <div className="space-y-3">
              {report.weaknesses_analysis.map(item => (
                <div key={item.indicator_name} className="bg-red-50 border border-red-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-800">{item.indicator_name}</span>
                    <LevelBadge level={item.level} />
                    <span className="text-xs text-gray-400 ml-auto">{item.score_standardized.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.analysis}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-3">改进建议</h2>
            <div className="space-y-3">
              {report.improvement_suggestions.map(item => (
                <div key={item.indicator_name} className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-700 mb-1">{item.indicator_name}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.suggestion}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
