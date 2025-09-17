-- 스케줄러 실행 로그 테이블 생성
CREATE TABLE IF NOT EXISTS playauto_platform.scheduler_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name VARCHAR(100) NOT NULL,
    job_id VARCHAR(100),
    execution_time TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'success', 'failed')),
    error_message TEXT,
    duration_seconds NUMERIC(10, 2),
    result_summary JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_scheduler_logs_execution_time ON playauto_platform.scheduler_logs(execution_time DESC);
CREATE INDEX idx_scheduler_logs_status ON playauto_platform.scheduler_logs(status);
CREATE INDEX idx_scheduler_logs_job_name ON playauto_platform.scheduler_logs(job_name);

-- 코멘트 추가
COMMENT ON TABLE playauto_platform.scheduler_logs IS '스케줄러 작업 실행 로그';
COMMENT ON COLUMN playauto_platform.scheduler_logs.job_name IS '작업 이름';
COMMENT ON COLUMN playauto_platform.scheduler_logs.job_id IS 'APScheduler job ID';
COMMENT ON COLUMN playauto_platform.scheduler_logs.execution_time IS '실행 시간';
COMMENT ON COLUMN playauto_platform.scheduler_logs.status IS '실행 상태 (running/success/failed)';
COMMENT ON COLUMN playauto_platform.scheduler_logs.error_message IS '오류 메시지 (실패 시)';
COMMENT ON COLUMN playauto_platform.scheduler_logs.duration_seconds IS '실행 소요 시간 (초)';
COMMENT ON COLUMN playauto_platform.scheduler_logs.result_summary IS '실행 결과 요약 (JSON)';