#!/usr/bin/env python3
"""
백업 설정 관리 모듈
환경변수 및 백업 정책 설정
"""

import os
from pathlib import Path
from datetime import datetime
from typing import Optional

# 프로젝트 루트 경로
PROJECT_ROOT = Path(__file__).parent.parent.parent
BACKUP_ROOT = PROJECT_ROOT / "backups"

# 환경변수에서 설정 로드
class BackupConfig:
    """백업 설정 클래스"""

    def __init__(self):
        # 데이터베이스 연결 정보
        self.db_host = os.getenv("DB_HOST", "localhost")
        self.db_port = os.getenv("DB_PORT", "5432")
        self.db_name = os.getenv("DB_NAME", "dashboard")
        self.db_user = os.getenv("DB_USER", "postgres")
        self.db_password = os.getenv("DB_PASSWORD", "")

        # 백업 설정
        self.backup_dir = Path(os.getenv("BACKUP_DIR", str(BACKUP_ROOT)))
        self.backup_retention_days = int(os.getenv("BACKUP_RETENTION_DAYS", "30"))
        self.backup_compression = os.getenv("BACKUP_COMPRESSION", "gzip") in ["gzip", "true"]
        self.backup_format = os.getenv("BACKUP_FORMAT", "custom")  # custom, plain, tar

        # S3 설정 (선택적)
        self.s3_enabled = os.getenv("S3_BACKUP_ENABLED", "false").lower() == "true"
        self.s3_bucket = os.getenv("S3_BACKUP_BUCKET", "")
        self.s3_region = os.getenv("AWS_REGION", "ap-northeast-2")
        self.s3_access_key = os.getenv("AWS_ACCESS_KEY_ID", "")
        self.s3_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY", "")
        self.s3_prefix = os.getenv("S3_BACKUP_PREFIX", "playauto-backups")

        # 이메일 알림 설정
        self.email_alerts = os.getenv("BACKUP_EMAIL_ALERTS", "false").lower() == "true"
        self.alert_email = os.getenv("BACKUP_ALERT_EMAIL", "admin@playauto.com")

        # 백업 타입
        self.backup_tables = os.getenv("BACKUP_TABLES", "all")  # all, schema_only, data_only
        self.exclude_tables = os.getenv("BACKUP_EXCLUDE_TABLES", "").split(",") if os.getenv("BACKUP_EXCLUDE_TABLES") else []

        # 로깅 설정
        self.log_dir = Path(os.getenv("BACKUP_LOG_DIR", str(BACKUP_ROOT / "logs")))
        self.verbose = os.getenv("BACKUP_VERBOSE", "true").lower() == "true"

        # 디렉토리 생성
        self._create_directories()

    def _create_directories(self):
        """필요한 디렉토리 생성"""
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.log_dir.mkdir(parents=True, exist_ok=True)

        # 백업 타입별 서브 디렉토리
        (self.backup_dir / "daily").mkdir(exist_ok=True)
        (self.backup_dir / "weekly").mkdir(exist_ok=True)
        (self.backup_dir / "monthly").mkdir(exist_ok=True)
        (self.backup_dir / "manual").mkdir(exist_ok=True)

    def get_backup_filename(self, backup_type: str = "manual", prefix: str = "backup") -> str:
        """백업 파일명 생성"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        extension = ".sql"

        if self.backup_format == "custom":
            extension = ".dump"
        elif self.backup_format == "tar":
            extension = ".tar"

        if self.backup_compression and self.backup_format == "plain":
            extension += ".gz"

        filename = f"{prefix}_{self.db_name}_{timestamp}{extension}"
        return str(self.backup_dir / backup_type / filename)

    def get_log_filename(self, backup_type: str = "backup") -> str:
        """로그 파일명 생성"""
        date = datetime.now().strftime("%Y%m%d")
        return str(self.log_dir / f"{backup_type}_{date}.log")

    def get_connection_string(self) -> str:
        """PostgreSQL 연결 문자열 생성"""
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    def get_pg_dump_command(self, output_file: str, schema_only: bool = False, data_only: bool = False) -> list:
        """pg_dump 명령어 생성"""
        cmd = [
            "pg_dump",
            "-h", self.db_host,
            "-p", self.db_port,
            "-U", self.db_user,
            "-d", self.db_name,
            "-f", output_file,
            "--verbose",
            "--no-owner",
            "--no-privileges"
        ]

        # 백업 포맷
        if self.backup_format == "custom":
            cmd.extend(["-F", "c"])  # Custom format (압축 포함)
        elif self.backup_format == "tar":
            cmd.extend(["-F", "t"])  # Tar format
        else:
            cmd.extend(["-F", "p"])  # Plain SQL

        # 압축 설정 (custom format은 자동 압축)
        if self.backup_compression and self.backup_format == "custom":
            cmd.extend(["-Z", "9"])  # 최대 압축 레벨

        # 스키마/데이터 옵션
        if schema_only:
            cmd.append("--schema-only")
        elif data_only:
            cmd.append("--data-only")

        # 테이블 제외
        for table in self.exclude_tables:
            if table.strip():
                cmd.extend(["--exclude-table", f"playauto_platform.{table.strip()}"])

        return cmd

    def get_pg_restore_command(self, backup_file: str, target_db: Optional[str] = None) -> list:
        """pg_restore 명령어 생성"""
        if target_db is None:
            target_db = self.db_name

        if self.backup_format == "plain":
            # Plain SQL은 psql로 복구
            return [
                "psql",
                "-h", self.db_host,
                "-p", self.db_port,
                "-U", self.db_user,
                "-d", target_db,
                "-f", backup_file
            ]
        else:
            # Custom/Tar format은 pg_restore 사용
            return [
                "pg_restore",
                "-h", self.db_host,
                "-p", self.db_port,
                "-U", self.db_user,
                "-d", target_db,
                "--verbose",
                "--no-owner",
                "--no-privileges",
                backup_file
            ]

    def __str__(self) -> str:
        """설정 정보 출력"""
        return f"""
백업 설정:
- 데이터베이스: {self.db_name}@{self.db_host}:{self.db_port}
- 백업 디렉토리: {self.backup_dir}
- 보관 기간: {self.backup_retention_days}일
- 압축: {self.backup_compression}
- 포맷: {self.backup_format}
- S3 백업: {self.s3_enabled}
- 이메일 알림: {self.email_alerts}
"""


# 싱글톤 인스턴스
backup_config = BackupConfig()