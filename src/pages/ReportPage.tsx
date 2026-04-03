import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudent } from '../api/students';
import { getExams } from '../api/exams';
import { generateReport, saveReport, getReport, getIndicatorHistory } from '../api/reports';
import {
  ReportGenerateResponse, ReportGetResponse, SavedIndicatorAnalysis,
  IndicatorHistoryResponse, IndicatorVersion,
} from '../types';
import LevelBadge from '../components/LevelBadge';
import { useAuth } from '../context/AuthContext';

const CAN_GENERATE = ['super_admin', 'admin_teacher', 'psych_teacher'];

export default function ReportPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const sid = Number(studentId);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const canGenerate = CAN_GENERATE.includes(user?.role ?? '');

  const [examId, setExamId] = useState<number | null>(null);
  const [generatedReport, setGeneratedReport] = useState<ReportGenerateResponse | null>(null);
  const [draft, setDraft] = useState<ReportGenerateResponse | null>(null);
  const [isEditingSaved, setIsEditingSaved] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const { data: student } = useQuery({ queryKey: ['student', sid], queryFn: () => getStudent(sid) });
  const { data: exams = [] } = useQuery({ queryKey: ['exams'], queryFn: getExams });

  useEffect(() => {
    if (exams.length && !examId) setExamId(exams[0].id);
  }, [exams]);

  const { data: savedReport } = useQuery<ReportGetResponse>({
    queryKey: ['report', sid, examId],
    queryFn: () => getReport(sid, examId!),
    enabled: !!examId,
    retry: false,
  });

  // 历史版本：仅在编辑模式且有已保存报告时加载
  const { data: history } = useQuery<IndicatorHistoryResponse>({
    queryKey: ['report-history', sid, examId],
    queryFn: () => getIndicatorHistory(sid, examId!),
    enabled: !!examId && !!draft && canGenerate,
    retry: false,
  });

  const generate = useMutation({
    mutationFn: () => generateReport(sid, examId!),
    onSuccess: data => {
      setGeneratedReport(data);
      setDraft(JSON.parse(JSON.stringify(data)));
      setIsEditingSaved(false);
      setSaved(false);
      setError('');
    },
    onError: (e: any) => setError(e.response?.data?.detail ?? '生成失败'),
  });

  const save = useMutation({
    mutationFn: () => saveReport(draft!),
    onSuccess: () => {
      setDraft(null);
      setGeneratedReport(null);
      setIsEditingSaved(false);
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['report', sid, examId] });
      queryClient.invalidateQueries({ queryKey: ['report-history', sid, examId] });
    },
  });

  function handleExamChange(newExamId: number) {
    setExamId(newExamId);
    setGeneratedReport(null);
    setDraft(null);
    setIsEditingSaved(false);
    setSaved(false);
    setError('');
  }

  function startEditingSaved() {
    if (!savedReport) return;
    const positives = savedReport.indicators.filter(i => i.is_positive);
    const negatives = savedReport.indicators.filter(i => !i.is_positive);
    const converted: ReportGenerateResponse = {
      student_id: savedReport.student_id,
      exam_id: savedReport.exam_id,
      strengths_analysis: positives.map(i => ({
        indicator_name: i.indicator_name,
        score_standardized: 0,
        level: 'M' as const,
        analysis: i.analysis ?? '',
      })),
      weaknesses_analysis: negatives.map(i => ({
        indicator_name: i.indicator_name,
        score_standardized: 0,
        level: 'M' as const,
        analysis: i.analysis ?? '',
      })),
      improvement_suggestions: negatives
        .filter(i => !!i.suggestion)
        .map(i => ({ indicator_name: i.indicator_name, suggestion: i.suggestion! })),
    };
    setDraft(JSON.parse(JSON.stringify(converted)));
    setGeneratedReport(null);
    setIsEditingSaved(true);
    setSaved(false);
  }

  function cancelEditing() {
    setDraft(null);
    setIsEditingSaved(false);
  }

  function updateAnalysis(section: 'strengths_analysis' | 'weaknesses_analysis', index: number, value: string) {
    if (!draft) return;
    setDraft({ ...draft, [section]: draft[section].map((item, i) => i === index ? { ...item, analysis: value } : item) });
  }

  function updateSuggestion(index: number, value: string) {
    if (!draft) return;
    setDraft({ ...draft, improvement_suggestions: draft.improvement_suggestions.map((item, i) => i === index ? { ...item, suggestion: value } : item) });
  }

  // 从历史版本中获取某指标的所有版本（version > 1 才有历史可看）
  function getVersionsForIndicator(name: string) {
    return history?.indicators.find(i => i.indicator_name === name)?.versions ?? [];
  }

  const showDraft = !!draft;
  const showSaved = !draft && !!savedReport;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {student ? `${student.name} 的心理报告` : '心理报告'}
        </h1>
        {student && <p className="text-sm text-gray-400 mt-1">{student.class_name}</p>}
      </div>

      <div className="flex gap-3 mb-6 items-end flex-wrap">
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

        {canGenerate && !isEditingSaved && (
          <button
            onClick={() => generate.mutate()}
            disabled={generate.isLoading || !examId}
            className="bg-indigo-600 text-white px-4 py-1.5 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {generate.isLoading ? '生成中…' : savedReport ? '重新生成' : '生成报告'}
          </button>
        )}

        {canGenerate && showSaved && (
          <button
            onClick={startEditingSaved}
            disabled={generate.isLoading}
            className="border border-indigo-400 text-indigo-600 px-4 py-1.5 rounded text-sm hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            编辑报告
          </button>
        )}

        {showDraft && (
          <>
            {isEditingSaved && (
              <button
                onClick={cancelEditing}
                className="border border-gray-300 text-gray-600 px-4 py-1.5 rounded text-sm hover:bg-gray-50"
              >
                取消编辑
              </button>
            )}
            <button
              onClick={() => save.mutate()}
              disabled={save.isLoading}
              className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {save.isLoading ? '保存中…' : '确认并保存'}
            </button>
          </>
        )}

        {saved && !showDraft && (
          <span className="text-green-600 text-sm font-medium">✓ 已保存</span>
        )}
      </div>

      {!canGenerate && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded px-3 py-2 mb-4">
          班主任仅可查看已保存的报告，如需生成或修改请联系心理教师
        </p>
      )}

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* 可编辑草稿 */}
      {showDraft && draft && (
        <div className="space-y-6">
          <div className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-3 py-2">
            {isEditingSaved
              ? '✏️ 编辑模式：修改完成后点击「确认并保存」，保存后恢复只读'
              : '✏️ 以下为 AI 生成的初稿，可直接编辑，确认无误后点击「确认并保存」'}
          </div>

          <ReportSection title="优势指标分析">
            {draft.strengths_analysis.map((item, i) => (
              <EditableAnalysisCard
                key={item.indicator_name}
                color="green"
                name={item.indicator_name}
                level={isEditingSaved ? undefined : item.level}
                score={isEditingSaved ? undefined : item.score_standardized}
                value={item.analysis}
                versions={getVersionsForIndicator(item.indicator_name)}
                onChange={v => updateAnalysis('strengths_analysis', i, v)}
              />
            ))}
          </ReportSection>

          <ReportSection title="不足指标分析">
            {draft.weaknesses_analysis.map((item, i) => (
              <EditableAnalysisCard
                key={item.indicator_name}
                color="red"
                name={item.indicator_name}
                level={isEditingSaved ? undefined : item.level}
                score={isEditingSaved ? undefined : item.score_standardized}
                value={item.analysis}
                versions={getVersionsForIndicator(item.indicator_name)}
                onChange={v => updateAnalysis('weaknesses_analysis', i, v)}
              />
            ))}
          </ReportSection>

          <ReportSection title="改进建议">
            {draft.improvement_suggestions.map((item, i) => (
              <EditableSuggestionCard
                key={item.indicator_name}
                name={item.indicator_name}
                value={item.suggestion}
                versions={getVersionsForIndicator(item.indicator_name)}
                onChange={v => updateSuggestion(i, v)}
              />
            ))}
          </ReportSection>
        </div>
      )}

      {/* 只读已保存报告 */}
      {showSaved && savedReport && (
        <div className="space-y-6">
          <p className="text-xs text-gray-400">
            {canGenerate ? '已保存的报告，点击「编辑报告」修改或「重新生成」用 AI 重新生成' : '已保存的报告'}
          </p>
          <ReportSection title="优势指标分析">
            {savedReport.indicators.filter(i => i.is_positive).map(item => (
              <ReadonlyAnalysisCard key={item.indicator_name} color="green" name={item.indicator_name} analysis={item.analysis ?? ''} />
            ))}
          </ReportSection>
          <ReportSection title="不足指标分析">
            {savedReport.indicators.filter(i => !i.is_positive).map(item => (
              <ReadonlyAnalysisCard key={item.indicator_name} color="red" name={item.indicator_name} analysis={item.analysis ?? ''} />
            ))}
          </ReportSection>
          <ReportSection title="改进建议">
            {savedReport.indicators
              .filter((i): i is SavedIndicatorAnalysis & { suggestion: string } => !i.is_positive && !!i.suggestion)
              .map(item => (
                <ReadonlySuggestionCard key={item.indicator_name} name={item.indicator_name} suggestion={item.suggestion} />
              ))}
          </ReportSection>
        </div>
      )}

      {!showDraft && !showSaved && !generate.isLoading && examId && (
        <p className="text-gray-400 text-sm text-center py-12">
          {canGenerate ? '该学生暂无报告，点击「生成报告」按钮生成' : '该学生暂无报告'}
        </p>
      )}
    </div>
  );
}

// ── 子组件 ────────────────────────────────────────────────

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-700 mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

/** 历史版本折叠面板 */
function VersionHistory({ versions, type, onUse }: {
  versions: IndicatorVersion[];
  type: 'analysis' | 'suggestion';
  onUse: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // 过滤掉当前版本（已在 textarea 中显示），只显示历史版本
  const historical = versions.filter(v => !v.is_current);
  if (historical.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="text-xs text-gray-400 hover:text-indigo-500 flex items-center gap-1"
      >
        <span>{open ? '▲' : '▼'}</span>
        历史版本（{historical.length} 条）
      </button>
      {open && (
        <div className="mt-2 space-y-2 border-l-2 border-gray-100 pl-3">
          {historical.map(v => {
            const text = type === 'analysis' ? v.analysis : v.suggestion;
            const date = new Date(v.created_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            return (
              <div key={v.version} className="bg-gray-50 rounded p-2 text-xs text-gray-600">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400">版本 {v.version} · {date}</span>
                  <button
                    type="button"
                    onClick={() => { onUse(text ?? ''); setOpen(false); }}
                    className="text-indigo-500 hover:underline ml-2 shrink-0"
                  >
                    使用此版本
                  </button>
                </div>
                <p className="leading-relaxed line-clamp-3">{text}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EditableAnalysisCard({ color, name, level, score, value, versions, onChange }: {
  color: 'green' | 'red';
  name: string;
  level?: 'H' | 'M' | 'L';
  score?: number;
  value: string;
  versions: IndicatorVersion[];
  onChange: (v: string) => void;
}) {
  const cls = color === 'green' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100';
  return (
    <div className={`border rounded-lg p-4 ${cls}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-medium text-gray-800">{name}</span>
        {level && <LevelBadge level={level} />}
        {score !== undefined && <span className="text-xs text-gray-400 ml-auto">{score.toFixed(2)}</span>}
      </div>
      <textarea
        className="w-full text-sm text-gray-700 bg-white border border-gray-200 rounded px-3 py-2 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
        rows={4}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      <VersionHistory versions={versions} type="analysis" onUse={onChange} />
    </div>
  );
}

function EditableSuggestionCard({ name, value, versions, onChange }: {
  name: string;
  value: string;
  versions: IndicatorVersion[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
      <p className="text-sm font-medium text-blue-700 mb-2">{name}</p>
      <textarea
        className="w-full text-sm text-gray-700 bg-white border border-gray-200 rounded px-3 py-2 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
        rows={3}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      <VersionHistory versions={versions} type="suggestion" onUse={onChange} />
    </div>
  );
}

function ReadonlyAnalysisCard({ color, name, analysis }: { color: 'green' | 'red'; name: string; analysis: string }) {
  const cls = color === 'green' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100';
  return (
    <div className={`border rounded-lg p-4 ${cls}`}>
      <p className="font-medium text-gray-800 mb-1">{name}</p>
      <p className="text-sm text-gray-600 leading-relaxed">{analysis}</p>
    </div>
  );
}

function ReadonlySuggestionCard({ name, suggestion }: { name: string; suggestion: string }) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
      <p className="text-sm font-medium text-blue-700 mb-1">{name}</p>
      <p className="text-sm text-gray-600 leading-relaxed">{suggestion}</p>
    </div>
  );
}
