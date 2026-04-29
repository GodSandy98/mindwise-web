import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudent } from '../api/students';
import { getExams } from '../api/exams';
import { getStudentScores } from '../api/scores';
import { getIndicators } from '../api/indicators';
import { generateReport, saveReport, getReport, getIndicatorHistory, exportSingleDocx } from '../api/reports';
import type {
  ReportGenerateResponse, ReportGetResponse, IndicatorAnalysis,
  IndicatorHistoryResponse, IndicatorVersion, PersonaResult, Indicator,
} from '../types';
import LevelBadge from '../components/LevelBadge';
import ScoreBar from '../components/ScoreBar';
import { useAuth } from '../context/AuthContext';
import { buildIndicatorTree } from '../utils/indicatorTree';
import type { IndicatorScore as IScore } from '../utils/indicatorTree';

const CAN_GENERATE = ['super_admin', 'admin_teacher', 'psych_teacher'];
const CAN_VIEW_TEACHER = ['super_admin', 'admin_teacher', 'psych_teacher'];

const SYSTEM_LABELS: Record<string, string> = {
  motivation: '动力系统',
  regulation: '调控系统',
  execution: '执行系统',
};

export default function ReportPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const sid = Number(studentId);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const canGenerate = CAN_GENERATE.includes(user?.role ?? '');
  const canViewTeacher = CAN_VIEW_TEACHER.includes(user?.role ?? '');

  const [examId, setExamId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ReportGenerateResponse | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'report' | 'scores'>('scores');
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

  const { data: indicators = [] } = useQuery({ queryKey: ['indicators'], queryFn: getIndicators });
  const { data: scores, isLoading: scoresLoading } = useQuery({
    queryKey: ['student-scores', sid, examId],
    queryFn: () => getStudentScores(sid, examId!),
    enabled: !!examId && tab === 'scores',
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
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 mb-5 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回上一页
      </button>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800">
          {student ? student.name : '学生详情'}
        </h1>
        {student && <p className="text-sm text-gray-400 mt-1">{student.class_name}</p>}
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-gray-200 mb-6">
        {(['scores', 'report'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'report' ? '心理报告' : '得分详情'}
          </button>
        ))}
      </div>

      {tab === 'report' && <>
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

          <PersonaCard persona={draft.persona} canViewTeacher={canViewTeacher} />
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
                  isWeakness={false}
                  versions={getVersionsForIndicator(ind.indicator_name)}
                  onChangeAnalysis={(field, v) => updateStrength(idx, field, v)}
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
                  isWeakness={true}
                  versions={getVersionsForIndicator(ind.indicator_name)}
                  onChangeAnalysis={(field, v) => updateWeakness(idx, field, v)}
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
            <PersonaCard persona={savedReport.persona} canViewTeacher={canViewTeacher} />
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
                            <p className="text-sm text-gray-600 leading-relaxed">{item.analysis}</p>
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
      </>}

      {tab === 'scores' && (
        <div>
          <div className="flex gap-3 mb-5 items-center">
            <label className="text-sm text-gray-600 whitespace-nowrap">选择考试</label>
            <select
              className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={examId ?? ''}
              onChange={e => handleExamChange(Number(e.target.value))}
            >
              {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          {scoresLoading && <p className="text-gray-400 text-sm">加载得分中…</p>}
          {!scoresLoading && scores && (
            <HierarchicalScoreTable indicators={indicators} scores={scores.indicator_scores} />
          )}
          {!scoresLoading && !scores && (
            <p className="text-gray-400 text-sm">该考试暂无得分数据，请先在考试管理中计算成绩。</p>
          )}
        </div>
      )}

    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

// ── Radar chart ─────────────────────────────────────────────

// viewBox x bounds: left=-50, right=290
const VB_LEFT = -50, VB_RIGHT = 290;
const CHAR_PX = 12; // approx px per Chinese char at fontSize=12

function fitLabel(label: string, x: number, anch: 'middle' | 'start' | 'end', reservePx = 0): string {
  let avail: number;
  if (anch === 'start')  avail = VB_RIGHT - x - reservePx - 4;
  else if (anch === 'end') avail = x - VB_LEFT - reservePx - 4;
  else avail = Math.min(x - VB_LEFT, VB_RIGHT - x) * 2 - reservePx - 8;
  const max = Math.max(2, Math.floor(avail / CHAR_PX));
  return label.length <= max ? label : label.slice(0, max - 1) + '…';
}

interface RadarAxis { label: string; value: number | null; clickable?: boolean }

function RadarChart({ axes, onAxisClick }: { axes: RadarAxis[]; onAxisClick?: (i: number) => void }) {
  const cx = 120, cy = 115, R = 78;
  const n = axes.length;
  const angles = axes.map((_, i) => -Math.PI / 2 + (2 * Math.PI / n) * i);

  function norm(z: number | null) {
    if (z === null) return 0.5;
    return Math.max(0.08, Math.min(1, (z + 2) / 4));
  }
  function pt(angle: number, r: number) {
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }
  function poly(rFrac: number) {
    return angles.map(a => pt(a, rFrac * R))
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';
  }
  function anchor(a: number): 'middle' | 'start' | 'end' {
    const c = Math.cos(a);
    if (Math.abs(c) < 0.25) return 'middle';
    return c > 0 ? 'start' : 'end';
  }
  function valOffset(a: number) {
    return {
      x: Math.abs(Math.cos(a)) < 0.25 ? 0 : (Math.cos(a) > 0 ? 11 : -11),
      y: Math.sin(a) >= 0 ? 13 : -13,
    };
  }

  const dataPts = axes.map((ax, i) => pt(angles[i], norm(ax.value) * R));
  const dataPath = dataPts.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';

  return (
    <svg viewBox="-50 -8 340 256" className="w-full">
      {[0.25, 0.5, 0.75, 1].map(f => (
        <path key={f} d={poly(f)} fill="none" stroke="#e5e7eb" strokeWidth={f === 1 ? 1.5 : 1} />
      ))}
      {angles.map((a, i) => {
        const tip = pt(a, R);
        return <line key={i} x1={cx} y1={cy} x2={tip.x.toFixed(1)} y2={tip.y.toFixed(1)} stroke="#e5e7eb" strokeWidth="1" />;
      })}
      {[{ f: 0.17, label: 'L' }, { f: 0.5, label: 'M' }, { f: 0.83, label: 'H' }].map(({ f, label }) => {
        const p = pt(angles[0], f * R);
        return <text key={label} x={p.x + 6} y={p.y} fontSize="9" fill="#d1d5db" dominantBaseline="middle">{label}</text>;
      })}
      <path d={dataPath} fill="rgba(99,102,241,0.15)" stroke="rgb(99,102,241)" strokeWidth="2" strokeLinejoin="round" />
      {axes.map((ax, i) => {
        const dot = dataPts[i];
        const tip = pt(angles[i], R + 22);
        const vo = valOffset(angles[i]);
        const clickable = ax.clickable !== false && !!onAxisClick;
        const anch = anchor(angles[i]);
        const reservePx = clickable ? 10 : 0; // space for › marker
        const display = fitLabel(ax.label, tip.x, anch, reservePx);
        const needsTooltip = display !== ax.label;
        return (
          <g key={i} onClick={() => clickable && onAxisClick?.(i)} className={clickable ? 'cursor-pointer' : ''}>
            {needsTooltip && <title>{ax.label}</title>}
            {clickable && <circle cx={tip.x} cy={tip.y} r="24" fill="transparent" />}
            <circle cx={dot.x} cy={dot.y} r={clickable ? 5 : 4}
              fill="rgb(99,102,241)" stroke="white" strokeWidth="1.5" />
            <text x={dot.x + vo.x} y={dot.y + vo.y}
              fontSize="10" fill="rgb(79,70,229)" textAnchor="middle" fontWeight="600">
              {ax.value !== null ? ax.value.toFixed(2) : '—'}
            </text>
            <text x={tip.x} y={tip.y} fontSize="12"
              fill={clickable ? '#4338ca' : '#374151'}
              textAnchor={anchor(angles[i])} dominantBaseline="middle" fontWeight={clickable ? '600' : '500'}>
              {display}{clickable && <tspan fontSize="9" fill="#a5b4fc"> ›</tspan>}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function scoreLevel(score: number | null): 'H' | 'M' | 'L' {
  if (score === null) return 'M';
  if (score >= 0.5) return 'H';
  if (score <= -0.5) return 'L';
  return 'M';
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 18l6-6-6-6" />
    </svg>
  );
}

function HierarchicalScoreTable({ indicators, scores }: { indicators: Indicator[]; scores: IScore[] }) {
  const tree = buildIndicatorTree(indicators, scores);
  const [closedSystems, setClosedSystems] = useState<Set<string>>(new Set());
  const [closedParents, setClosedParents] = useState<Set<number>>(new Set());

  function toggleSystem(sys: string) {
    setClosedSystems(prev => { const s = new Set(prev); s.has(sys) ? s.delete(sys) : s.add(sys); return s; });
  }
  function toggleParent(id: number) {
    setClosedParents(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  // path = stack of selected child indices at each level
  const [drillPath, setDrillPath] = useState<Array<{ index: number; label: string }>>([]);

  // Traverse tree along drillPath to get items at current level
  interface DrillItem { key: string; label: string; value: number | null; hasChildren: boolean }

  function getItemsAtPath(path: typeof drillPath): DrillItem[] {
    if (path.length === 0) {
      return tree.map((s, i) => ({
        key: `sys-${i}`,
        label: s.label,
        value: s.avgStd,
        hasChildren: s.children.length > 0,
      }));
    }
    const sysNode = tree[path[0].index];
    if (path.length === 1) {
      return sysNode.children.map((c, i) => ({
        key: `child-${i}`,
        label: c.indicator.name,
        value: c.kind === 'parent' ? c.avgStd : c.score.score_standardized,
        hasChildren: c.kind === 'parent' && c.children.length > 0,
      }));
    }
    const parentChild = sysNode.children[path[1].index];
    if (parentChild.kind !== 'parent') return [];
    if (path.length === 2) {
      return parentChild.children.map((l, i) => ({
        key: `leaf-${i}`,
        label: l.indicator.name,
        value: l.score.score_standardized,
        hasChildren: false,
      }));
    }
    return []; // beyond current tree depth
  }

  const currentItems = getItemsAtPath(drillPath);
  const radarAxes: RadarAxis[] = currentItems.map(item => ({
    label: item.label,
    value: item.value,
    clickable: item.hasChildren,
  }));
  const summaryRows = currentItems.map(item => ({ key: item.key, label: item.label, value: item.value }));

  function handleAxisClick(i: number) {
    if (currentItems[i]?.hasChildren) {
      setDrillPath([...drillPath, { index: i, label: currentItems[i].label }]);
    }
  }

  const breadcrumb = [
    { label: '三系统总览', onClick: () => setDrillPath([]) },
    ...drillPath.map((step, idx) => ({
      label: step.label,
      onClick: () => setDrillPath(drillPath.slice(0, idx + 1)),
    })),
  ];

  return (
    <>
    {/* Radar + system summary */}
    <div className="rounded-xl border border-gray-200 shadow-sm bg-white p-5 mb-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 mb-3 min-h-[20px] flex-wrap">
        {drillPath.length === 0 ? (
          <span className="text-xs text-gray-400">点击系统名称可查看子指标</span>
        ) : (
          breadcrumb.map((crumb, idx) => (
            <span key={idx} className="flex items-center gap-1">
              {idx > 0 && <span className="text-gray-300 text-xs">›</span>}
              <button
                onClick={crumb.onClick}
                className={`text-xs transition-colors ${
                  idx === breadcrumb.length - 1
                    ? 'font-semibold text-gray-700 cursor-default'
                    : 'text-indigo-500 hover:text-indigo-700 font-medium'
                }`}
              >
                {crumb.label}
              </button>
            </span>
          ))
        )}
      </div>

      <div className="flex items-start gap-4">
        <div style={{ flex: '0 0 62%' }}>
          <RadarChart axes={radarAxes} onAxisClick={handleAxisClick} />
        </div>
        <div className="flex flex-col gap-2.5 pt-2" style={{ flex: '0 0 34%' }}>
          {summaryRows.map(row => (
            <div key={row.key} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-medium text-gray-700 leading-tight">{row.label}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <LevelBadge level={scoreLevel(row.value)} />
                  <span className="text-xs text-gray-400 tabular-nums">
                    {row.value !== null ? row.value.toFixed(2) : '—'}
                  </span>
                </div>
              </div>
              <ScoreBar score={row.value} showValue={false} />
            </div>
          ))}
          <p className="text-xs text-gray-300 mt-1">均值为所含指标标准化分</p>
        </div>
      </div>
    </div>

    {/* Detailed table */}
    <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden bg-white">
      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-[44%]" />
          <col className="w-[12%]" />
          <col className="w-[30%]" />
          <col className="w-[14%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">指标</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">原始分</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
              <span className="flex items-center gap-1 normal-case tracking-normal font-semibold">
                标准化得分
                <span className="relative group/tip cursor-default">
                  <svg className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth={2} />
                    <path strokeLinecap="round" strokeWidth={2} d="M12 16v-4M12 8h.01" />
                  </svg>
                  <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 rounded-lg bg-gray-800 text-white text-xs px-3 py-2 leading-relaxed opacity-0 group-hover/tip:opacity-100 transition-opacity z-10 shadow-lg font-normal">
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-gray-800" />
                    将原始分转换为 Z 分数（均值 0，标准差 1），反映该学生在全班中的相对水平。正值表示高于平均，负值表示低于平均。
                  </div>
                </span>
              </span>
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">等级</th>
          </tr>
        </thead>
        <tbody>
          {tree.map(sysNode => {
            const sysOpen = !closedSystems.has(sysNode.system);
            return (
              <>
                {/* System row */}
                <tr
                  key={`sys-${sysNode.system}`}
                  className="border-b border-gray-100 bg-indigo-50 cursor-pointer select-none hover:bg-indigo-100/70 transition-colors"
                  onClick={() => toggleSystem(sysNode.system)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-400"><Chevron open={sysOpen} /></span>
                      <span className="font-semibold text-indigo-800">{sysNode.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 tabular-nums">{sysNode.avgRaw.toFixed(2)}</td>
                  <td className="px-4 py-3"><ScoreBar score={sysNode.avgStd} /></td>
                  <td className="px-4 py-3"><LevelBadge level={scoreLevel(sysNode.avgStd)} /></td>
                </tr>

                {sysOpen && sysNode.children.map(child => {
                  if (child.kind === 'leaf') {
                    return (
                      <tr key={`leaf-${child.indicator.id}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2 pl-5">
                            <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                            <span className="text-gray-700 truncate">{child.indicator.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 tabular-nums">{child.score.score_raw.toFixed(2)}</td>
                        <td className="px-4 py-2.5"><ScoreBar score={child.score.score_standardized} /></td>
                        <td className="px-4 py-2.5"><LevelBadge level={scoreLevel(child.score.score_standardized)} /></td>
                      </tr>
                    );
                  }

                  // Parent row
                  const pOpen = !closedParents.has(child.indicator.id);
                  return (
                    <>
                      <tr
                        key={`parent-${child.indicator.id}`}
                        className="border-b border-gray-100 bg-gray-50/80 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                        onClick={() => toggleParent(child.indicator.id)}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2 pl-4">
                            <span className="text-gray-400"><Chevron open={pOpen} /></span>
                            <span className="font-medium text-gray-700 truncate">{child.indicator.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 tabular-nums">{child.avgRaw.toFixed(2)}</td>
                        <td className="px-4 py-2.5"><ScoreBar score={child.avgStd} /></td>
                        <td className="px-4 py-2.5"><LevelBadge level={scoreLevel(child.avgStd)} /></td>
                      </tr>
                      {pOpen && child.children.map(leaf => (
                        <tr key={`leaf-${leaf.indicator.id}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2 pl-9">
                              <span className="w-1 h-1 rounded-full bg-gray-200 flex-shrink-0" />
                              <span className="text-gray-600 truncate">{leaf.indicator.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 tabular-nums">{leaf.score.score_raw.toFixed(2)}</td>
                          <td className="px-4 py-2.5"><ScoreBar score={leaf.score.score_standardized} /></td>
                          <td className="px-4 py-2.5"><LevelBadge level={scoreLevel(leaf.score.score_standardized)} /></td>
                        </tr>
                      ))}
                    </>
                  );
                })}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}

function PersonaCard({ persona, canViewTeacher }: { persona: PersonaResult; canViewTeacher: boolean }) {
  const [viewMode, setViewMode] = useState<'student' | 'teacher'>('student');
  const label = viewMode === 'student' ? persona.student_label : persona.teacher_label;
  const description = viewMode === 'student' ? persona.student_description : persona.teacher_description;

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-lg p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">
          {persona.code[0] === 'H' ? '🔥' : persona.code[0] === 'M' ? '⚡' : '🌱'}
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-indigo-800">{label}</h2>
          <span className="text-xs text-indigo-400 font-mono">{persona.code}</span>
        </div>
        {canViewTeacher && (
          <div className="flex rounded overflow-hidden border border-indigo-200 text-xs">
            <button
              onClick={() => setViewMode('student')}
              className={`px-2.5 py-1 ${viewMode === 'student' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 hover:bg-indigo-50'}`}
            >
              学生
            </button>
            <button
              onClick={() => setViewMode('teacher')}
              className={`px-2.5 py-1 ${viewMode === 'teacher' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 hover:bg-indigo-50'}`}
            >
              教师
            </button>
          </div>
        )}
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
  indicator, isWeakness, versions, onChangeAnalysis, onChangeSuggestion,
}: {
  indicator: IndicatorAnalysis;
  isWeakness: boolean;
  versions: IndicatorVersion[];
  onChangeAnalysis: (field: 'analysis' | 'analysis_teacher', v: string) => void;
  onChangeSuggestion: ((v: string) => void) | null;
}) {
  const suggestion = indicator.suggestion ?? '';
  const borderColor = isWeakness ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100';

  return (
    <div className={`border rounded-lg p-4 ${borderColor}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="font-medium text-gray-800">{indicator.indicator_name}</span>
        <LevelBadge level={indicator.level} />
        <span className="text-xs text-gray-400 ml-auto">
          原始 {indicator.score_raw.toFixed(2)} · z = {indicator.score_standardized.toFixed(2)}
        </span>
      </div>

      <label className="text-xs text-gray-500 mb-1 block">学生版分析</label>
      <textarea
        className="w-full text-sm text-gray-700 bg-white border border-gray-200 rounded px-3 py-2 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-1"
        rows={3}
        value={indicator.analysis}
        onChange={e => onChangeAnalysis('analysis', e.target.value)}
      />
      <VersionHistory versions={versions} type="analysis" currentValue={indicator.analysis} onUse={v => onChangeAnalysis('analysis', v)} />

      <label className="text-xs text-gray-500 mb-1 block mt-3">教师版分析</label>
      <textarea
        className="w-full text-sm text-gray-700 bg-white border border-gray-200 rounded px-3 py-2 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-1"
        rows={3}
        value={indicator.analysis_teacher}
        onChange={e => onChangeAnalysis('analysis_teacher', e.target.value)}
      />

      {isWeakness && onChangeSuggestion && (
        <>
          <label className="text-xs text-gray-500 mb-1 block mt-3">改进建议</label>
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
