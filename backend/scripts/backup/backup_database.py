#!/usr/bin/env python3
"""
PostgreSQL 데이터베이스 백업 스크립트
자동/수동 백업 실행 및 관리
"""

import os
import sys
import subprocess
import gzip
import shutil
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Tuple
import json

# 프로젝트 경로 추가
sys.path.append(str(Path(__file__).parent.parent.parent))

from scripts.backup.backup_config import backup_config
from app.models.scheduler_log import SchedulerLog
from app.core.database import SessionLocal


class DatabaseBackup:
    """데이터베이스 백업 클래스"""

    def __init__(self, config=None):
        self.config = config or backup_config
        self.setup_logging()

    def setup_logging(self):
        """로깅 설정"""
        log_file = self.config.get_log_filename("backup")

        logging.basicConfig(
            level=logging.INFO if self.config.verbose else logging.WARNING,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger(__name__)

    def run_backup(self, backup_type: str = "manual", description: str = "") -> Tuple[bool, str]:
        """백업 실행"""
        start_time = datetime.now()
        self.logger.info(f"{'='*60}")
        self.logger.info(f"🚀 백업 시작: {backup_type}")
        self.logger.info(f"시작 시간: {start_time}")
        self.logger.info(f"데이터베이스: {self.config.db_name}")
        if description:
            self.logger.info(f"설명: {description}")

        try:
            # 백업 파일명 생성
            backup_file = self.config.get_backup_filename(backup_type)
            self.logger.info(f"백업 파일: {backup_file}")

            # pg_dump 명령 생성
            cmd = self.config.get_pg_dump_command(backup_file)

            # 환경변수 설정 (비밀번호)
            env = os.environ.copy()
            env['PGPASSWORD'] = self.config.db_password

            # 백업 실행
            self.logger.info(f"명령어: {' '.join(cmd[:-1])}...")  # 비밀번호 제외
            result = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                check=True
            )

            if result.stderr and self.config.verbose:
                self.logger.info(f"백업 진행 상황:\n{result.stderr}")

            # Plain SQL 압축 처리
            if self.config.backup_format == "plain" and self.config.backup_compression:
                self.logger.info("파일 압축 중...")
                self._compress_file(backup_file)
                backup_file = f"{backup_file}.gz"

            # 백업 검증
            if self._verify_backup(backup_file):
                self.logger.info("✅ 백업 검증 성공")
            else:
                raise Exception("백업 파일 검증 실패")

            # 백업 정보 저장
            backup_info = self._save_backup_info(backup_file, backup_type, description, start_time)

            # 오래된 백업 정리
            self._cleanup_old_backups(backup_type)

            # S3 업로드 (선택적)
            if self.config.s3_enabled:
                self._upload_to_s3(backup_file, backup_type)

            # 성공 로그
            duration = (datetime.now() - start_time).total_seconds()
            self.logger.info(f"✅ 백업 완료!")
            self.logger.info(f"소요 시간: {duration:.2f}초")
            self.logger.info(f"파일 크기: {self._get_file_size_str(backup_file)}")

            # 스케줄러 로그 기록
            self._log_to_scheduler("database_backup", "success", backup_info)

            return True, backup_file

        except subprocess.CalledProcessError as e:
            self.logger.error(f"❌ 백업 실패: {e}")
            self.logger.error(f"에러 출력: {e.stderr}")
            self._log_to_scheduler("database_backup", "failed", {"error": str(e)})

            # 이메일 알림
            if self.config.email_alerts:
                self._send_alert(f"백업 실패: {e}")

            return False, str(e)

        except Exception as e:
            self.logger.error(f"❌ 예상치 못한 오류: {e}")
            self._log_to_scheduler("database_backup", "failed", {"error": str(e)})

            if self.config.email_alerts:
                self._send_alert(f"백업 오류: {e}")

            return False, str(e)

        finally:
            self.logger.info(f"{'='*60}")

    def _compress_file(self, file_path: str):
        """파일 압축"""
        with open(file_path, 'rb') as f_in:
            with gzip.open(f"{file_path}.gz", 'wb', compresslevel=9) as f_out:
                shutil.copyfileobj(f_in, f_out)

        # 원본 파일 삭제
        os.remove(file_path)
        self.logger.info(f"파일 압축 완료: {file_path}.gz")

    def _verify_backup(self, backup_file: str) -> bool:
        """백업 파일 검증"""
        if not Path(backup_file).exists():
            return False

        file_size = Path(backup_file).stat().st_size
        if file_size < 1024:  # 1KB 미만이면 실패로 간주
            self.logger.warning(f"백업 파일 크기가 너무 작음: {file_size} bytes")
            return False

        # Custom format 검증
        if self.config.backup_format == "custom":
            try:
                # pg_restore -l로 목차 확인
                cmd = ["pg_restore", "-l", backup_file]
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                return result.returncode == 0
            except Exception as e:
                self.logger.error(f"백업 검증 실패: {e}")
                return False

        return True

    def _save_backup_info(self, backup_file: str, backup_type: str,
                         description: str, start_time: datetime) -> dict:
        """백업 정보 저장"""
        info = {
            "file": backup_file,
            "type": backup_type,
            "description": description,
            "database": self.config.db_name,
            "timestamp": start_time.isoformat(),
            "size": Path(backup_file).stat().st_size,
            "format": self.config.backup_format,
            "compressed": self.config.backup_compression or backup_file.endswith('.gz'),
            "duration": (datetime.now() - start_time).total_seconds()
        }

        # JSON 파일로 메타데이터 저장
        info_file = f"{backup_file}.info.json"
        with open(info_file, 'w') as f:
            json.dump(info, f, indent=2)

        self.logger.info(f"백업 정보 저장: {info_file}")
        return info

    def _cleanup_old_backups(self, backup_type: str):
        """오래된 백업 파일 정리"""
        backup_dir = self.config.backup_dir / backup_type
        cutoff_date = datetime.now() - timedelta(days=self.config.backup_retention_days)

        deleted_count = 0
        for file_path in backup_dir.iterdir():
            if file_path.is_file():
                # 파일 생성 시간 확인
                file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                if file_time < cutoff_date:
                    self.logger.info(f"오래된 백업 삭제: {file_path.name}")
                    file_path.unlink()

                    # 메타데이터 파일도 삭제
                    info_file = Path(f"{file_path}.info.json")
                    if info_file.exists():
                        info_file.unlink()

                    deleted_count += 1

        if deleted_count > 0:
            self.logger.info(f"{deleted_count}개의 오래된 백업 파일 삭제됨")

    def _upload_to_s3(self, backup_file: str, backup_type: str):
        """S3에 백업 파일 업로드"""
        try:
            import boto3
            from botocore.exceptions import NoCredentialsError

            s3_client = boto3.client(
                's3',
                region_name=self.config.s3_region,
                aws_access_key_id=self.config.s3_access_key,
                aws_secret_access_key=self.config.s3_secret_key
            )

            file_name = Path(backup_file).name
            s3_key = f"{self.config.s3_prefix}/{backup_type}/{file_name}"

            self.logger.info(f"S3 업로드 중: {s3_key}")
            s3_client.upload_file(backup_file, self.config.s3_bucket, s3_key)
            self.logger.info(f"✅ S3 업로드 완료: s3://{self.config.s3_bucket}/{s3_key}")

        except ImportError:
            self.logger.warning("boto3가 설치되지 않음. S3 업로드 건너뜀")
        except NoCredentialsError:
            self.logger.error("AWS 자격 증명을 찾을 수 없음")
        except Exception as e:
            self.logger.error(f"S3 업로드 실패: {e}")

    def _log_to_scheduler(self, job_name: str, status: str, result_summary: dict):
        """스케줄러 로그 기록"""
        try:
            db = SessionLocal()
            log = SchedulerLog(
                job_name=job_name,
                status=status,
                result_summary=json.dumps(result_summary),
                execution_time=datetime.now()
            )
            db.add(log)
            db.commit()
            db.close()
        except Exception as e:
            self.logger.error(f"스케줄러 로그 기록 실패: {e}")

    def _send_alert(self, message: str):
        """이메일 알림 전송"""
        try:
            from app.services.email_service import EmailService

            email_service = EmailService()
            email_service.send_email(
                to_email=self.config.alert_email,
                subject="[PLAYAUTO] 백업 알림",
                body=f"""
                백업 작업 중 문제가 발생했습니다.

                시간: {datetime.now()}
                데이터베이스: {self.config.db_name}
                메시지: {message}

                자세한 내용은 로그를 확인하세요.
                """
            )
            self.logger.info(f"알림 이메일 전송: {self.config.alert_email}")
        except Exception as e:
            self.logger.error(f"이메일 전송 실패: {e}")

    def _get_file_size_str(self, file_path: str) -> str:
        """파일 크기를 읽기 쉬운 형태로 변환"""
        size = Path(file_path).stat().st_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.2f} {unit}"
            size /= 1024.0
        return f"{size:.2f} TB"

    def list_backups(self, backup_type: Optional[str] = None) -> list:
        """백업 파일 목록 조회"""
        backups = []

        if backup_type:
            dirs = [self.config.backup_dir / backup_type]
        else:
            dirs = [
                self.config.backup_dir / "daily",
                self.config.backup_dir / "weekly",
                self.config.backup_dir / "monthly",
                self.config.backup_dir / "manual"
            ]

        for backup_dir in dirs:
            if backup_dir.exists():
                for file_path in backup_dir.glob("*.dump*"):
                    if file_path.name.endswith('.info.json'):
                        continue

                    info_file = Path(f"{file_path}.info.json")
                    if info_file.exists():
                        with open(info_file, 'r') as f:
                            info = json.load(f)
                    else:
                        info = {
                            "file": str(file_path),
                            "type": backup_dir.name,
                            "timestamp": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                            "size": file_path.stat().st_size
                        }

                    backups.append(info)

        # 날짜순 정렬
        backups.sort(key=lambda x: x['timestamp'], reverse=True)
        return backups


def main():
    """메인 함수"""
    import argparse

    parser = argparse.ArgumentParser(description="PostgreSQL 데이터베이스 백업")
    parser.add_argument('--type', choices=['daily', 'weekly', 'monthly', 'manual'],
                       default='manual', help='백업 타입')
    parser.add_argument('--description', help='백업 설명')
    parser.add_argument('--list', action='store_true', help='백업 목록 조회')
    parser.add_argument('--schema-only', action='store_true', help='스키마만 백업')
    parser.add_argument('--data-only', action='store_true', help='데이터만 백업')

    args = parser.parse_args()

    backup = DatabaseBackup()

    if args.list:
        # 백업 목록 출력
        backups = backup.list_backups()
        print(f"\n총 {len(backups)}개의 백업 파일:")
        print("-" * 80)
        for b in backups:
            size_str = f"{b['size'] / (1024*1024):.2f} MB"
            print(f"[{b['type']}] {b['timestamp']} - {size_str} - {Path(b['file']).name}")
    else:
        # 백업 실행
        success, result = backup.run_backup(args.type, args.description or "")
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()