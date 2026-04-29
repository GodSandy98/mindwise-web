import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listAllBatchJobs, getBatchJob, batchExportDocx } from '../api/reports';
import type { BatchJobFull } from '../api/reports';

const STATUS_LABEL: Record<string, string> = {
  pending: '排队中', running: '生成中', done: '已完成', failed: '失败',
};
const STATUS_COLOR: Record<string, string> = {
  pending: 'text-gray-500 bg-gray-100',
  running: 'text-blue-600 bg-blue-50',
  done: 'text-green-600 bg-green-50',
  failed: 'text-red-600 bg-red-50',
};

function JobCard({ initialJob }: { initialJob: BatchJobFull }) {
  const [job, setJob] = useState<BatchJobFull>(initialJob);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [exporting, setExporting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setJob(initialJob);
  }, [initialJob]);

  const isActive = job.status === 'pending' || job.status === 'running';

  useEffect(() => {
    if (!isActive) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    const poll = async () => {
      try {
        const updated = await getBatchJob(job.job_id);
        setJob(prev => ({ ...prev, ...updated }));
        if (updated.status === 'done' || updated.status === 'failed') {
          clearInterval(pollRef.current!);
          pollRef.current = null;
        }
      } catch {
        clearInterval(pollRef.current!);
      }
    };
    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [job.job_id, isActive]);

  const progress = job.total > 0
    ? Math.round(((job.success + job.failed) / job.total) * 100)
    : 0;

  async function handleExport() {
    setExporting(true);
    try {
      const ids = job.student_ids ?? [];
      if (ids.length === 0) return;
      const blob = await batchExportDocx(job.exam_id, ids);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${job.exam_name}-报告.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  }

  const students = job.students ?? [];
  const PREVIEW_COUNT = 5;

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-gray-800 truncate">{job.exam_name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {job.created_at ? new Date(job.created_at).toLocaleString('zh-CN') : '—'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[job.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {STATUS_LABEL[job.status] ?? job.status}
          </span>
          {job.status === 'done' && job.success > 0 && (
            <button
              onClick={handleExport}
              disabled={exporting}
              title={`下载本次任务 ${job.success} 份报告`}
              className="flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-teal-50 text-teal-700 hover:bg-teal-100 font-medium disabled:opacity-50 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {exporting ? '下载中…' : `下载 ${job.success} 份 Word`}
            </button>
          )}
        </div>
      </div>

      {/* Student list */}
      {students.length > 0 && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-1.5">
            {(expanded ? students : students.slice(0, PREVIEW_COUNT)).map(s => (
              <Link
                key={s.student_id}
                to={`/reports/${s.student_id}`}
                className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
              >
                {s.student_name}
              </Link>
            ))}
            {!expanded && students.length > PREVIEW_COUNT && (
              <button
                onClick={() => setExpanded(true)}
                className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-500 hover:bg-indigo-100"
              >
                +{students.length - PREVIEW_COUNT} 人
              </button>
            )}
            {expanded && students.length > PREVIEW_COUNT && (
              <button
                onClick={() => setExpanded(false)}
                className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-500 hover:bg-indigo-100"
              >
                收起
              </button>
            )}
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="mt-3 space-y-1.5">
        <div className="flex justify-between text-xs text-gray-500">
          <span>
            共 {job.total} 人 · 成功 <span className="text-green-600 font-medium">{job.success}</span>
            {job.failed > 0 && <> · 失败 <span className="text-red-500 font-medium">{job.failed}</span></>}
          </span>
          {isActive && <span className="tabular-nums text-blue-500">{progress}%</span>}
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${
              job.status === 'failed' ? 'bg-red-400' :
              job.status === 'done' ? 'bg-green-400' : 'bg-blue-400'
            }`}
            style={{ width: `${job.status === 'done' ? 100 : progress}%` }}
          />
        </div>
      </div>

      {/* Errors */}
      {job.errors && job.errors.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {job.errors.slice(0, 3).map((err, i) => (
            <p key={i} className="text-xs text-red-500">
              {err.student_name || `学生${err.student_id}`}：{err.error}
            </p>
          ))}
          {job.errors.length > 3 && (
            <p className="text-xs text-red-400">…还有 {job.errors.length - 3} 条错误</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function TaskCenterPage() {
  const { data: jobs = [], isLoading, refetch } = useQuery({
    queryKey: ['batch-jobs-all'],
    queryFn: listAllBatchJobs,
    staleTime: 0,
  });

  useEffect(() => {
    const t = setInterval(() => refetch(), 30000);
    return () => clearInterval(t);
  }, [refetch]);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="border-l-4 border-indigo-500 pl-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">任务中心</h1>
        <p className="text-sm text-gray-400 mt-0.5">报告批量生成任务的进度和结果</p>
      </div>

      {isLoading && <p className="text-gray-400 text-sm">加载中…</p>}

      {!isLoading && jobs.length === 0 && (
        <div className="text-center py-20">
          <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-400 text-sm">暂无生成任务</p>
          <p className="text-gray-300 text-xs mt-1">在「考试管理」页面发起批量生成后，任务会显示在这里</p>
        </div>
      )}

      <div className="grid gap-3">
        {jobs.map(job => (
          <JobCard key={job.job_id} initialJob={job} />
        ))}
      </div>
    </div>
  );
}
