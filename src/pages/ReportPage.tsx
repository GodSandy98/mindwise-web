import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudent } from '../api/students';
import { getExams } from '../api/exams';
import { generateReport, saveReport, getReport } from '../api/reports';
import { ReportGenerateResponse, ReportGetResponse, SavedIndicatorAnalysis } from '../types';
import LevelBadge from '../components/LevelBadge';

export default function ReportPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const sid = Number(studentId);
  const queryClient = useQueryClient();

  const [examId, setExamId] = useState<number | null>(null);
  const [generatedReport, setGeneratedReport] = useState<ReportGenerateResponse | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const { data: student } = useQuery({ queryKey: ['student', sid], queryFn: () => getStudent(sid) });
  const { data: exams = [] } = useQuery({ queryKey: ['exams'], queryFn: getExams });

  useEffect(() => {
    if (exams.length && !examId) setExamId(exams[0].id);
  }, [exams]);

  // 从数据库读取已保存报告，404 时 data 为 undefined（不报错）
  const { data: savedReport } = useQuery<ReportGetResponse>({
    queryKey: ['report', sid, examId],
    queryFn: () => getReport(sid, examId!),
    enabled: !!examId,
    retry: false,
  });

  const generate = useMutation({
    mutationFn: () => generateReport(sid, examId!),
    onSuccess: data => { setGeneratedReport(data); setSaved(false); setError(''); },
    onError: (e: any) => setError(e.response?.data?.detail ?? '生成失败'),
  });

  const save = useMutation({
    mutationFn: () => saveReport(generatedReport!),
    onSuccess: () => {
      setSaved(true);
      // 刷新缓存，使保存后的报告立即可读
      queryClient.invalidateQueries({ queryKey: ['report', sid, examId] });
    },
  });

  function handleExamChange(newExamId: number) {
    setExamId(newExamId);
    setGeneratedReport(null);
    setSaved(false);
    setError('');
  }

  const showGenerated = !!generatedReport;
  const showSaved = !generatedReport && !!savedReport;

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
            onChange={e => handleExamChange(Number(e.target.value))}
          >
            {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <button
          onClick={() => generate.mutate()}
          disabled={generate.isLoading || !examId}
          className="bg-indigo-600 text-white px-4 py-1.5 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {generate.isLoading ? '生成中…' : savedReport ? '重新生成' : '生成报告'}
        </button>
        {generatedReport && !saved && (
          <button
            onClick={() => save.mutate()}
            disabled={save.isLoading}
            className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50"
          >
            {save.isLoading ? '保存中…' : '保存报告'}
          </button>
        )}
        {saved && <span className="text-green-600 text-sm font-medium">✓ 已保存</span>}
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* 新生成的报告（含得分和等级） */}
      {showGenerated && generatedReport && (
        <div className="space-y-6">
          <ReportSection title="优势指标分析">
            {generatedReport.strengths_analysis.map(item => (
              <AnalysisCard
                key={item.indicator_name}
                color="green"
                name={item.indicator_name}
                level={item.level}
                score={item.score_standardized}
                analysis={item.analysis}
              />
            ))}
          </ReportSection>
          <ReportSection title="不足指标分析">
            {generatedReport.weaknesses_analysis.map(item => (
              <AnalysisCard
                key={item.indicator_name}
                color="red"
                name={item.indicator_name}
                level={item.level}
                score={item.score_standardized}
                analysis={item.analysis}
              />
            ))}
          </ReportSection>
          <ReportSection title="改进建议">
            {generatedReport.improvement_suggestions.map(item => (
              <SuggestionCard key={item.indicator_name} name={item.indicator_name} suggestion={item.suggestion} />
            ))}
          </ReportSection>
        </div>
      )}

      {/* 从数据库读取的已保存报告 */}
      {showSaved && savedReport && (
        <div className="space-y-6">
          <p className="text-xs text-gray-400 mb-2">以下为已保存的报告，点击「重新生成」可更新</p>
          <ReportSection title="优势指标分析">
            {savedReport.indicators.filter(i => i.is_positive).map(item => (
              <AnalysisCard key={item.indicator_name} color="green" name={item.indicator_name} analysis={item.analysis} />
            ))}
          </ReportSection>
          <ReportSection title="不足指标分析">
            {savedReport.indicators.filter(i => !i.is_positive).map(item => (
              <AnalysisCard key={item.indicator_name} color="red" name={item.indicator_name} analysis={item.analysis} />
            ))}
          </ReportSection>
          <ReportSection title="改进建议">
            {savedReport.indicators.filter((i): i is SavedIndicatorAnalysis & { suggestion: string } =>
              !i.is_positive && !!i.suggestion
            ).map(item => (
              <SuggestionCard key={item.indicator_name} name={item.indicator_name} suggestion={item.suggestion} />
            ))}
          </ReportSection>
        </div>
      )}

      {!showGenerated && !showSaved && !generate.isLoading && examId && (
        <p className="text-gray-400 text-sm text-center py-12">该学生暂无报告，点击「生成报告」按钮生成</p>
      )}
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-700 mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function AnalysisCard({ color, name, level, score, analysis }: {
  color: 'green' | 'red';
  name: string;
  level?: 'H' | 'M' | 'L';
  score?: number;
  analysis: string;
}) {
  const cls = color === 'green' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100';
  return (
    <div className={`border rounded-lg p-4 ${cls}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="font-medium text-gray-800">{name}</span>
        {level && <LevelBadge level={level} />}
        {score !== undefined && (
          <span className="text-xs text-gray-400 ml-auto">{score.toFixed(2)}</span>
        )}
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{analysis}</p>
    </div>
  );
}

function SuggestionCard({ name, suggestion }: { name: string; suggestion: string }) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
      <p className="text-sm font-medium text-blue-700 mb-1">{name}</p>
      <p className="text-sm text-gray-600 leading-relaxed">{suggestion}</p>
    </div>
  );
}
