import React, { useState, useEffect } from 'react';
import { Clock, Play, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { DataTable, PageHeader, StatsCard, Alert, Button } from '../components';
import { api } from '../services/api';

interface SchedulerLog {
  id: string;
  job_name: string;
  execution_time: string;
  status: 'running' | 'success' | 'failed';
  error_message?: string;
  duration_seconds?: number;
  result_summary?: any;
}

interface SchedulerJob {
  job_id: string;
  job_name: string;
  next_run_time?: string;
  trigger: string;
  state: string;
}

interface SchedulerStatus {
  is_running: boolean;
  jobs: SchedulerJob[];
  recent_logs: SchedulerLog[];
}

const SchedulerMonitoring: React.FC = () => {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [logs, setLogs] = useState<SchedulerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await api.get('/scheduler/status');
      setStatus(response.data);
    } catch (error) {
      console.error('스케줄러 상태 조회 실패:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await api.get('/scheduler/logs', {
        params: { limit: 50 }
      });
      setLogs(response.data.items);
    } catch (error) {
      console.error('로그 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStatus(), fetchLogs()]);
    setRefreshing(false);
  };

  const handleTriggerJob = async (jobName: string) => {
    if (!confirm(`'${jobName}' 작업을 수동으로 실행하시겠습니까?`)) return;

    setTriggeringJob(jobName);
    try {
      const response = await api.post('/scheduler/trigger', {
        job_name: jobName
      });

      if (response.data.success) {
        alert(response.data.message);
        await handleRefresh();
      } else {
        alert(`실행 실패: ${response.data.message}`);
      }
    } catch (error) {
      console.error('작업 트리거 실패:', error);
      alert('작업 실행에 실패했습니다.');
    } finally {
      setTriggeringJob(null);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchLogs();

    // 30초마다 자동 새로고침
    const interval = setInterval(() => {
      fetchStatus();
      fetchLogs();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <AlertCircle className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      running: 'bg-blue-100 text-blue-800',
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {getStatusIcon(status)}
        <span className="ml-1">
          {status === 'running' ? '실행 중' : status === 'success' ? '성공' : '실패'}
        </span>
      </span>
    );
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds.toFixed(1)}초`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}분 ${remainingSeconds.toFixed(0)}초`;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 통계 계산
  const stats = {
    totalJobs: status?.jobs.length || 0,
    successCount: logs.filter(log => log.status === 'success').length,
    failedCount: logs.filter(log => log.status === 'failed').length,
    avgDuration: logs
      .filter(log => log.duration_seconds)
      .reduce((sum, log) => sum + (log.duration_seconds || 0), 0) /
      (logs.filter(log => log.duration_seconds).length || 1)
  };

  const jobColumns = [
    { key: 'job_name', header: '작업명', sortable: true },
    { key: 'trigger', header: '트리거', sortable: false },
    {
      key: 'next_run_time',
      header: '다음 실행 시간',
      render: (_: any, job: SchedulerJob) => job.next_run_time ? formatDateTime(job.next_run_time) : '-'
    },
    {
      key: 'actions',
      header: '액션',
      render: (_: any, job: SchedulerJob) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleTriggerJob(job.job_name)}
          disabled={triggeringJob === job.job_name}
        >
          {triggeringJob === job.job_name ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span className="ml-1">실행</span>
        </Button>
      )
    }
  ];

  const logColumns = [
    {
      key: 'execution_time',
      header: '실행 시간',
      render: (_: any, log: SchedulerLog) => formatDateTime(log.execution_time)
    },
    { key: 'job_name', header: '작업명' },
    {
      key: 'status',
      header: '상태',
      render: (_: any, log: SchedulerLog) => getStatusBadge(log.status)
    },
    {
      key: 'duration_seconds',
      header: '소요 시간',
      render: (_: any, log: SchedulerLog) => formatDuration(log.duration_seconds)
    },
    {
      key: 'error_message',
      header: '오류 메시지',
      render: (_: any, log: SchedulerLog) => log.error_message ? (
        <span className="text-red-600 text-sm">{log.error_message}</span>
      ) : '-'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="스케줄러 모니터링"
        description="백그라운드 작업 실행 상태를 모니터링합니다"
        actions={
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
          >
            {refreshing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span className="ml-2">새로고침</span>
          </Button>
        }
      />

      {/* 스케줄러 상태 */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${status?.is_running ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="font-medium">
              스케줄러 상태: {status?.is_running ? '실행 중' : '중지됨'}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            30초마다 자동 새로고침
          </span>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="등록된 작업"
          value={stats.totalJobs}
          description="스케줄러에 등록된 작업 수"
          icon={<Clock className="w-5 h-5 text-blue-500" />}
        />
        <StatsCard
          title="성공"
          value={stats.successCount}
          description="최근 50개 중 성공한 작업"
          icon={<CheckCircle className="w-5 h-5 text-green-500" />}
        />
        <StatsCard
          title="실패"
          value={stats.failedCount}
          description="최근 50개 중 실패한 작업"
          icon={<XCircle className="w-5 h-5 text-red-500" />}
        />
        <StatsCard
          title="평균 실행 시간"
          value={formatDuration(stats.avgDuration)}
          description="작업당 평균 소요 시간"
          icon={<Clock className="w-5 h-5 text-gray-500" />}
        />
      </div>

      {/* 실패한 작업 알림 */}
      {stats.failedCount > 0 && (
        <Alert
          type="error"
          message={`최근 ${stats.failedCount}개의 작업이 실패했습니다. 로그를 확인해주세요.`}
        />
      )}

      {/* 예정된 작업 목록 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium">예정된 작업</h3>
        </div>
        <DataTable
          data={status?.jobs || []}
          columns={jobColumns}
          pagination={false}
        />
      </div>

      {/* 실행 로그 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium">실행 로그 (최근 50개)</h3>
        </div>
        <DataTable
          data={logs}
          columns={logColumns}
          pagination={false}
        />
      </div>
    </div>
  );
};

export default SchedulerMonitoring;