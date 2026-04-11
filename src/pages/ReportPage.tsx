import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudent } from '../api/students';
import { getExams } from '../api/exams';
import { generateReport, saveReport, getReport, getIndicatorHistory, exportSingleDocx } from '../api/reports';
import type {
  ReportGenerateResponse, ReportGetResponse, IndicatorAnalysis,
  IndicatorHistoryResponse, IndicatorVersion, PersonaResult,
} from '../types';
import LevelBadge from '../components/LevelBadge';
import { useAuth } from '../context/AuthContext';

const CAN_GENERATE = ['super_admin', 'admin_teacher', 'psych_teacher'];
const CAN_VIEW_TEACHER = ['super_admin', 'admin_teacher', 'psych_teacher'];

const SYSTEM_LABELS: Record<string, string> = {
  motivation: '动力系统',
  regulation: '调控系统',
  execution: '执行系统',
};

export default function ReportPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const sid = Number(studentId);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const canGenerate = CAN_GENERATE.includes(user?.role ?? '');
  const canViewTeacher = CAN_VIEW_TEACHER.includes(user?.role ?? '');

  const [examId, setExamId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ReportGenerateResponse | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'student' | 'teacher'>('student');
  const [exporting, setExporting] = useState(false);

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

  const { data: history } = useQuery<IndicatorHistoryResponse>({
    queryKey: ['report-history', sid, examId],
    queryFn: () => getIndicatorHistory(sid, examId!),
    enabled: !!examId && !!draft && canGenerate,
    retry: false,
  });

  const generate = useMutation({
    mutationFn: () => generateReport(sid, examId!),
    onSuccess: data => {
      setDraft(JSON.parse(JSON.stringify(data)));
      setSaved(false);
      setError('');
    },
    onError: (e: any) => setError(e.response?.data?.detail ?? '生成失败'),
  });

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new Error('无草稿');
      return saveReport({
        student_id: draft.student_id,
        exam_id: draft.exam_id,
        persona_code: draft.persona.code,
        motivation_level: draft.persona.code[0],
        regulation_level: draft.persona.code[1],
        execution_level: draft.persona.code[2],
        summary: draft.summary ?? '',
        strengths: draft.strengths,
        weaknesses: draft.weaknesses,
      });
    },
    onSuccess: () => {
      setDraft(null);
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['report', sid, examId] });
      queryClient.invalidateQueries({ queryKey: ['report-history', sid, examId] });
    },
  });

  function handleExamChange(newExamId: number) {
    setExamId(newExamId);
    setDraft(null);
    setSaved(false);
    setError('');
  }

  function updateStrength(index: number, field: 'analysis' | 'analysis_teacher', value: string) {
    if (!draft) return;
    setDraft({
      ...draft,
      strengths: draft.strengths.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    });
  }

  function updateWeakness(index: number, field: 'analysis' | 'analysis_teacher' | 'suggestion', value: string) {
    if (!draft) return;
    setDraft({
      ...draft,
      weaknesses: draft.weaknesses.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    });
  }

  function getVersionsForIndicator(name: string) {
    return history?.indicators.find(i => i.indicator_name === name)?.versions ?? [];
  }

  async function handleExport() {
    if (!examId) return;
    setExporting(true);
    try {
      const blob = await exportSingleDocx(sid, examId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${student?.name ?? sid}-报告.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  }

  const showDraft = !!draft;
  const showSaved = !draft && !!savedReport;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {student ? `${student.name} 的心理测评报告` : '心理测评报告'}
        </h1>
        {student && <p className="text-sm text-gray-400 mt-1">{student.class_name}</p>}
      </div>

      {/* Controls */}
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

        {canGenerate && (
          <button
            onClick={() => generate.mutate()}
            disabled={generate.isLoading || !examId}
            className="bg-indigo-600 text-white px-4 py-1.5 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {generate.isLoading ? '生成中…' : savedReport ? '重新生成' : '生成报告'}
          </button>
        )}

        {showDraft && (
          <>
            <button
              onClick={() => setDraft(null)}
              className="border border-gray-300 text-gray-600 px-4 py-1.5 rounded text-sm hover:bg-gray-50"
            >
              取消
            </button>
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
          <span className="text-green-600 text-sm font-medium">已保存</span>
        )}

        {/* Export button — only when saved report exists and not in draft mode */}
        {showSaved && !showDraft && (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="border border-gray-300 text-gray-600 px-4 py-1.5 rounded text-sm hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {exporting ? '导出中…' : '导出 Word'}
          </button>
        )}

        {/* View mode toggle */}
        {canViewTeacher && (showDraft || showSaved) && (
          <div className="ml-auto flex rounded overflow-hidden border border-gray-300 text-sm">
            <button
              onClick={() => setViewMode('student')}
              className={`px-3 py-1 ${viewMode === 'student' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              学生视角
            </button>
            <button
              onClick={() => setViewMode('teacher')}
              className={`px-3 py-1 ${viewMode === 'teacher' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              教师视角
            </button>
          </div>
        )}
      </div>

      {!canGenerate && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded px-3 py-2 mb-4">
          班主任仅可查看已保存的报告，如需生成或修改请联系心理教师
        </p>
      )}

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* Draft mode */}
      {showDraft && draft && (
        <div className="space-y-6">
          <div className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-3 py-2">
            以下为 AI 生成的报告，可直接编辑，确认无误后点击「确认并保存」
          </div>

          <PersonaCard persona={draft.persona} viewMode={viewMode} />
          <SystemLevelsCard systemLevels={draft.system_levels} />

          {/* Summary */}
          <div className="bg-white border rounded-lg p-4">
            <label className="text-sm font-semibold text-gray-600 mb-2 block">综合概述</label>
            <textarea
              className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded px-3 py-2 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
              rows={4}
              value={draft.summary ?? ''}
              onChange={e => setDraft({ ...draft, summary: e.target.value })}
            />
          </div>

          {/* Strengths */}
          <section>
            <h2 className="text-base font-semibold text-green-700 mb-3 flex items-center gap-2">
              <span className="inline-block w-1.5 h-4 bg-green-500 rounded-full"></span>
              优势亮点（得分最高的三项）
            </h2>
            <div className="space-y-3">
              {draft.strengths.map((ind, idx) => (
                <EditableIndicatorCard
                  key={ind.indicator_id}
                  indicator={ind}
                  viewMode={viewMode}
                  isWeakness={false}
                  versions={getVersionsForIndicator(ind.indicator_name)}
                  onChangeAnalysis={v => updateStrength(idx, viewMode === 'student' ? 'analysis' : 'analysis_teacher', v)}
                  onChangeSuggestion={null}
                />
              ))}
            </div>
          </section>

          {/* Weaknesses */}
          <section>
            <h2 className="text-base font-semibold text-amber-700 mb-3 flex items-center gap-2">
              <span className="inline-block w-1.5 h-4 bg-amber-500 rounded-full"></span>
              成长空间（得分最低的三项）
            </h2>
            <div className="space-y-3">
              {draft.weaknesses.map((ind, idx) => (
                <EditableIndicatorCard
                  key={ind.indicator_id}
                  indicator={ind}
                  viewMode={viewMode}
                  isWeakness={true}
                  versions={getVersionsForIndicator(ind.indicator_name)}
                  onChangeAnalysis={v => updateWeakness(idx, viewMode === 'student' ? 'analysis' : 'analysis_teacher', v)}
                  onChangeSuggestion={v => updateWeakness(idx, 'suggestion', v)}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Saved report readonly */}
      {showSaved && savedReport && (
        <div className="space-y-6">
          <p className="text-xs text-gray-400">
            {canGenerate ? '已保存的报告，点击「重新生成」刷新' : '已保存的报告'}
          </p>

          {savedReport.persona && (
            <PersonaCard persona={savedReport.persona} viewMode={viewMode} />
          )}

          {(savedReport.motivation_level || savedReport.regulation_level || savedReport.execution_level) && (
            <div className="bg-white border rounded-lg p-4">
              <h2 className="text-sm font-semibold text-gray-600 mb-3">三系统水平</h2>
              <div className="flex gap-4">
                {[
                  { label: '动力', level: savedReport.motivation_level },
                  { label: '调控', level: savedReport.regulation_level },
                  { label: '执行', level: savedReport.execution_level },
                ].filter(s => s.level).map(s => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{s.label}</span>
                    <LevelBadge level={s.level as 'H' | 'M' | 'L'} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {savedReport.summary && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
              <p className="text-xs font-semibold text-indigo-500 mb-1">综合概述</p>
              <p className="text-sm text-gray-700 leading-relaxed">{savedReport.summary}</p>
            </div>
          )}

          {savedReport.indicators.length > 0 && (() => {
            const strengths = savedReport.indicators.filter(i => i.is_positive);
            const weaknesses = savedReport.indicators.filter(i => !i.is_positive);
            return (
              <>
                {strengths.length > 0 && (
                  <section>
                    <h2 className="text-base font-semibold text-green-700 mb-3 flex items-center gap-2">
                      <span className="inline-block w-1.5 h-4 bg-green-500 rounded-full"></span>
                      优势亮点
                    </h2>
                    <div className="space-y-3">
                      {strengths.map(item => (
                        <div key={item.indicator_id} className="border border-green-100 bg-green-50 rounded-lg p-4">
                          <p className="font-medium text-gray-800 mb-1">{item.indicator_name}</p>
                          {item.analysis && (
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {viewMode === 'teacher' ? item.analysis : item.analysis}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {weaknesses.length > 0 && (
                  <section>
                    <h2 className="text-base font-semibold text-amber-700 mb-3 flex items-center gap-2">
                      <span className="inline-block w-1.5 h-4 bg-amber-500 rounded-full"></span>
                      成长空间
                    </h2>
                    <div className="space-y-3">
                      {weaknesses.map(item => (
                        <div key={item.indicator_id} className="border border-amber-100 bg-amber-50 rounded-lg p-4">
                          <p className="font-medium text-gray-800 mb-1">{item.indicator_name}</p>
                          {item.analysis && (
                            <p className="text-sm text-gray-600 leading-relaxed mb-2">{item.analysis}</p>
                          )}
                          {item.suggestion && (
                            <p className="text-sm text-blue-600 leading-relaxed">
                              <span className="font-medium">改进建议：</span>{item.suggestion}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            );
          })()}
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

// ── Sub-components ──────────────────────────────────────────

function PersonaCard({ persona, viewMode }: { persona: PersonaResult; viewMode: 'student' | 'teacher' }) {
  const label = viewMode === 'student' ? persona.student_label : persona.teacher_label;
  const description = viewMode === 'student' ? persona.student_description : persona.teacher_description;

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-lg p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">
          {persona.code[0] === 'H' ? '🔥' : persona.code[0] === 'M' ? '⚡' : '🌱'}
        </span>
        <div>
          <h2 className="text-lg font-bold text-indigo-800">{label}</h2>
          <span className="text-xs text-indigo-400 font-mono">{persona.code}</span>
        </div>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
    </div>
  );
}

function SystemLevelsCard({ systemLevels }: { systemLevels: { system: string; avg_z: number; level: string }[] }) {
  const order = ['motivation', 'regulation', 'execution'];
  const sorted = [...systemLevels].sort((a, b) => order.indexOf(a.system) - order.indexOf(b.system));

  return (
    <div className="bg-white border rounded-lg p-4">
      <h2 className="text-sm font-semibold text-gray-600 mb-3">三系统水平</h2>
      <div className="grid grid-cols-3 gap-4">
        {sorted.map(s => (
          <div key={s.system} className="text-center">
            <p className="text-xs text-gray-400 mb-1">{SYSTEM_LABELS[s.system] || s.system}</p>
            <LevelBadge level={s.level as 'H' | 'M' | 'L'} />
            <p className="text-xs text-gray-400 mt-1">z = {s.avg_z.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditableIndicatorCard({
  indicator, viewMode, isWeakness, versions, onChangeAnalysis, onChangeSuggestion,
}: {
  indicator: IndicatorAnalysis;
  viewMode: 'student' | 'teacher';
  isWeakness: boolean;
  versions: IndicatorVersion[];
  onChangeAnalysis: (v: string) => void;
  onChangeSuggestion: ((v: string) => void) | null;
}) {
  const analysis = viewMode === 'student' ? indicator.analysis : indicator.analysis_teacher;
  const suggestion = indicator.suggestion ?? '';
  const borderColor = isWeakness ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100';

  return (
    <div className={`border rounded-lg p-4 ${borderColor}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-medium text-gray-800">{indicator.indicator_name}</span>
        <LevelBadge level={indicator.level} />
        <span className="text-xs text-gray-400 ml-auto">
          原始 {indicator.score_raw.toFixed(2)} · z = {indicator.score_standardized.toFixed(2)}
        </span>
      </div>

      <label className="text-xs text-gray-500 mb-1 block">分析</label>
      <textarea
        className="w-full text-sm text-gray-700 bg-white border border-gray-200 rounded px-3 py-2 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-1"
        rows={3}
        value={analysis}
        onChange={e => onChangeAnalysis(e.target.value)}
      />
      <VersionHistory versions={versions} type="analysis" currentValue={analysis} onUse={onChangeAnalysis} />

      {isWeakness && onChangeSuggestion && (
        <>
          <label className="text-xs text-gray-500 mb-1 block mt-2">改进建议</label>
          <textarea
            className="w-full text-sm text-gray-700 bg-white border border-gray-200 rounded px-3 py-2 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            rows={2}
            value={suggestion}
            onChange={e => onChangeSuggestion(e.target.value)}
          />
          <VersionHistory versions={versions} type="suggestion" currentValue={suggestion} onUse={onChangeSuggestion} />
        </>
      )}
    </div>
  );
}

function VersionHistory({ versions, type, currentValue, onUse }: {
  versions: IndicatorVersion[];
  type: 'analysis' | 'suggestion';
  currentValue: string;
  onUse: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const historical = versions.filter(v => {
    const text = type === 'analysis' ? v.analysis : v.suggestion;
    return (text ?? '') !== currentValue;
  });
  if (historical.length === 0) return null;

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="text-xs text-gray-400 hover:text-indigo-500 flex items-center gap-1"
      >
        <span>{open ? '▲' : '▼'}</span>
        历史版本（{historical.length}）
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
