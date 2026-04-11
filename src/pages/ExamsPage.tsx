import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getExams } from '../api/exams';
import {
  batchGenerateReports, getBatchJob, listBatchJobs, batchExportDocx,
  getStudentReportStatus,
} from '../api/reports';
import type { BatchJobStatus, BatchJobSummary, StudentReportStatus } from '../api/reports';
import { useAuth } from '../context/AuthContext';

const CAN_BATCH_GENERATE = ['super_admin', 'admin_teacher', 'psych_teacher'];

const STATUS_LABEL: Record<string, string> = {
  pending: '排队中', running: '生成中', done: '已完成', failed: '失败',
};
const STATUS_COLOR: Record<string, string> = {
  pending: 'text-gray-500 bg-gray-50',
  running: 'text-blue-600 bg-blue-50',
  done: 'text-green-600 bg-green-50',
  failed: 'text-red-600 bg-red-50',
};

// ── Student selection modal ───────────────────────────────────

function SelectStudentsModal({
  examId, examName, mode, onClose, onConfirm,
}: {
  examId: number;
  examName: string;
  mode: 'generate' | 'export';
  onClose: () => void;
  onConfirm: (studentIds: number[]) => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<'all' | 'no_report' | 'has_report'>('all');
  const [search, setSearch] = useState('');

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['student-report-status', examId],
    queryFn: () => getStudentReportStatus(examId),
  });

  // For export: default filter to has_report and pre-select those students
  useEffect(() => {
    if (mode === 'export' && students.length > 0) {
      setFilter('has_report');
      setSelected(new Set(students.filter(s => s.has_report).map(s => s.student_id)));
    }
  }, [students, mode]);

  const filtered = students.filter(s => {
    if (filter === 'no_report' && s.has_report) return false;
    if (filter === 'has_report' && !s.has_report) return false;
    if (search && !s.student_name.includes(search)) return false;
    return true;
  });

  const filteredIds = filtered
    .filter(s => mode === 'export' ? s.has_report : true)
    .map(s => s.student_id);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selected.has(id));

  function toggleAll() {
    if (allFilteredSelected) {
      setSelected(prev => { const s = new Set(prev); filteredIds.forEach(id => s.delete(id)); return s; });
    } else {
      setSelected(prev => new Set([...prev, ...filteredIds]));
    }
  }

  function toggle(id: number) {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  const noReportCount = students.filter(s => !s.has_report).length;
  const hasReportCount = students.filter(s => s.has_report).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-[560px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">{mode === 'export' ? '选择导出对象' : '选择生成对象'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{examName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {/* Filters & search */}
        <div className="px-5 py-3 border-b flex gap-2 items-center flex-wrap">
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
            {(['all', 'no_report', 'has_report'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 ${filter === f ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {f === 'all' && `全部 (${students.length})`}
                {f === 'no_report' && `未生成 (${noReportCount})`}
                {f === 'has_report' && `已有报告 (${hasReportCount})`}
              </button>
            ))}
          </div>
          <input
            className="border rounded-lg px-3 py-1.5 text-xs flex-1 min-w-[120px] focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="搜索姓名…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Select all row */}
        <div className="px-5 py-2 border-b bg-gray-50 flex items-center gap-2 text-xs text-gray-500">
          <input
            type="checkbox"
            className="w-3.5 h-3.5 accent-indigo-600"
            checked={allFilteredSelected}
            onChange={toggleAll}
            disabled={filteredIds.length === 0}
          />
          <span>
            {allFilteredSelected ? '取消全选' : '全选当前筛选'}
            {selected.size > 0 && (
              <span className="ml-2 text-indigo-600 font-medium">已选 {selected.size} 人</span>
            )}
          </span>
        </div>

        {/* Student list */}
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-4">
          {isLoading && <p className="text-gray-400 text-sm text-center py-8">加载中…</p>}
          {!isLoading && filtered.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">没有符合条件的学生</p>
          )}
          {!isLoading && Object.entries(
            filtered.reduce<Record<string, StudentReportStatus[]>>((acc, s) => {
              if (!acc[s.class_name]) acc[s.class_name] = [];
              acc[s.class_name].push(s);
              return acc;
            }, {})
          ).map(([className, classStudents]) => (
            <div key={className}>
              <p className="text-xs font-semibold text-gray-400 mb-2">{className}</p>
              <div className="space-y-1">
                {classStudents.map(s => (
                  <label
                    key={s.student_id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg ${mode === 'export' && !s.has_report ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-indigo-600 flex-shrink-0"
                      checked={selected.has(s.student_id)}
                      onChange={() => toggle(s.student_id)}
                      disabled={mode === 'export' && !s.has_report}
                    />
                    <span className="flex-1 text-sm text-gray-800">{s.student_name}</span>
                    {s.has_report ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">已有报告</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">未生成</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Warning for re-generation (generate mode only) */}
        {mode === 'generate' && [...selected].some(id => students.find(s => s.student_id === id)?.has_report) && (
          <div className="px-5 py-2 bg-amber-50 border-t border-amber-100">
            <p className="text-xs text-amber-700">
              已选中部分有报告的学生，这些学生的报告将被 LLM 重新生成并覆盖。
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">取消</button>
          <button
            onClick={() => onConfirm([...selected])}
            disabled={selected.size === 0}
            className="bg-indigo-600 text-white text-sm px-5 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-40"
          >
            {mode === 'export' ? `开始导出（${selected.size} 人）` : `开始生成（${selected.size} 人）`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Per-exam job panel ────────────────────────────────────────

function JobPanel({ examId, examName }: { examId: number; examName: string }) {
  const { user } = useAuth();
  const canGenerate = CAN_BATCH_GENERATE.includes(user?.role ?? '');

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [jobStatus, setJobStatus] = useState<BatchJobStatus | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data: recentJobs } = useQuery<BatchJobSummary[]>({
    queryKey: ['batch-jobs', examId],
    queryFn: () => listBatchJobs(examId),
    enabled: canGenerate,
    retry: false,
  });

  useEffect(() => {
    if (!recentJobs || recentJobs.length === 0) return;
    const last = recentJobs[0];
    if (last.status === 'pending' || last.status === 'running') {
      setActiveJobId(last.job_id);
    } else {
      setJobStatus({
        job_id: last.job_id, status: last.status,
        total: last.total, success: last.success, failed: last.failed,
        errors: [], updated_at: last.created_at,
      });
    }
  }, [recentJobs]);

  useEffect(() => {
    if (!activeJobId) return;
    const poll = async () => {
      try {
        const status = await getBatchJob(activeJobId);
        setJobStatus(status);
        if (status.status === 'done' || status.status === 'failed') {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setActiveJobId(null);
        }
      } catch {
        clearInterval(pollRef.current!);
        pollRef.current = null;
      }
    };
    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeJobId]);

  const startJob = useMutation({
    mutationFn: (studentIds: number[]) => batchGenerateReports(examId, studentIds),
    onSuccess: (data) => {
      setJobStatus({ job_id: data.job_id, status: 'pending', total: data.total, success: 0, failed: 0, errors: [], updated_at: null });
      setActiveJobId(data.job_id);
    },
  });

  function handleConfirmGenerate(studentIds: number[]) {
    setShowGenerateModal(false);
    startJob.mutate(studentIds);
  }

  async function handleExport(studentIds: number[]) {
    setShowExportModal(false);
    setExporting(true);
    try {
      const blob = await batchExportDocx(examId, studentIds);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${examName}-报告.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  }

  const isRunning = jobStatus?.status === 'pending' || jobStatus?.status === 'running';
  const progress = jobStatus && jobStatus.total > 0
    ? Math.round(((jobStatus.success + jobStatus.failed) / jobStatus.total) * 100)
    : 0;

  if (!canGenerate) return null;

  return (
    <>
      {showGenerateModal && (
        <SelectStudentsModal
          examId={examId}
          examName={examName}
          mode="generate"
          onClose={() => setShowGenerateModal(false)}
          onConfirm={handleConfirmGenerate}
        />
      )}
      {showExportModal && (
        <SelectStudentsModal
          examId={examId}
          examName={examName}
          mode="export"
          onClose={() => setShowExportModal(false)}
          onConfirm={handleExport}
        />
      )}

      <div className="mt-3 space-y-2">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowGenerateModal(true)}
            disabled={isRunning}
            className="text-xs px-3 py-1.5 rounded-full font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50"
          >
            {isRunning ? '生成中…' : '生成报告'}
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            disabled={exporting}
            className="text-xs px-3 py-1.5 rounded-full font-medium bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {exporting ? '导出中…' : '批量导出 Word'}
          </button>
        </div>

        {jobStatus && (
          <div className={`rounded-md px-3 py-2 text-xs ${STATUS_COLOR[jobStatus.status] ?? 'bg-gray-50 text-gray-600'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">
                {STATUS_LABEL[jobStatus.status]}
                {' · '}共 {jobStatus.total} 人，成功 {jobStatus.success} 人
                {jobStatus.failed > 0 && `，失败 ${jobStatus.failed} 人`}
              </span>
              {isRunning && <span className="text-blue-400 tabular-nums">{progress}%</span>}
            </div>
            {isRunning && (
              <div className="w-full bg-blue-100 rounded-full h-1.5 mt-1">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            {jobStatus.errors.length > 0 && (
              <ul className="mt-1.5 space-y-0.5 text-red-600">
                {jobStatus.errors.slice(0, 3).map((err, i) => (
                  <li key={i}>{err.student_name || `学生${err.student_id}`}：{err.error}</li>
                ))}
                {jobStatus.errors.length > 3 && <li>…还有 {jobStatus.errors.length - 3} 条错误</li>}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function ExamsPage() {
  const { data: exams = [], isLoading } = useQuery({ queryKey: ['exams'], queryFn: getExams });

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="border-l-4 border-indigo-500 pl-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">考试列表</h1>
        <p className="text-sm text-gray-400 mt-0.5">管理和查看所有考试</p>
      </div>

      {isLoading ? <p className="text-gray-500">加载中…</p> : (
        <div className="grid gap-4">
          {exams.map(e => (
            <div key={e.id} className="bg-white rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-indigo-400 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{e.name}</p>
                  <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    {new Date(e.date).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/exams/${e.id}/scores`}
                    className="text-xs px-3 py-1.5 rounded-full font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                  >
                    全班得分
                  </Link>
                  <Link
                    to={`/exams/${e.id}/submit`}
                    className="text-xs px-3 py-1.5 rounded-full font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                  >
                    提交答卷
                  </Link>
                </div>
              </div>
              <JobPanel examId={e.id} examName={e.name} />
            </div>
          ))}
          {exams.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">暂无考试</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
