#!/usr/bin/env python3
"""
PostgreSQL 데이터베이스 복구 스크립트
백업 파일로부터 데이터베이스 복구
"""

import os
import sys
import subprocess
import gzip
import shutil
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional
import json

# 프로젝트 경로 추가
sys.path.append(str(Path(__file__).parent.parent.parent))

from scripts.backup.backup_config import backup_config
from app.models.scheduler_log import SchedulerLog
from app.core.database import SessionLocal


class DatabaseRestore:
    """데이터베이스 복구 클래스"""

    def __init__(self, config=None):
        self.config = config or backup_config
        self.setup_logging()

    def setup_logging(self):
        """로깅 설정"""
        log_file = self.config.get_log_filename("restore")

        logging.basicConfig(
            level=logging.INFO if self.config.verbose else logging.WARNING,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger(__name__)

    def restore_backup(self, backup_file: str, target_db: Optional[str] = None,
                      drop_existing: bool = False, create_db: bool = False) -> bool:
        """백업 복구 실행"""
        start_time = datetime.now()
        self.logger.info(f"{'='*60}")
        self.logger.info(f"🔄 복구 시작")
        self.logger.info(f"시작 시간: {start_time}")
        self.logger.info(f"백업 파일: {backup_file}")

        # 백업 파일 확인
        if not Path(backup_file).exists():
            self.logger.error(f"❌ 백업 파일을 찾을 수 없음: {backup_file}")
            return False

        # 타겟 데이터베이스
        if target_db is None:
            target_db = self.config.db_name

        self.logger.info(f"타겟 데이터베이스: {target_db}")

        try:
            # 임시 파일 처리 (압축된 경우)
            temp_file = None
            if backup_file.endswith('.gz'):
                self.logger.info("압축 파일 해제 중...")
                temp_file = self._decompress_file(backup_file)
                restore_file = temp_file
            else:
                restore_file = backup_file

            # 백업 정보 로드
            info_file = f"{backup_file}.info.json"
            if Path(info_file).exists():
                with open(info_file, 'r') as f:
                    backup_info = json.load(f)
                    self.logger.info(f"백업 정보: {backup_info.get('timestamp')} - {backup_info.get('description', 'N/A')}")

            # 데이터베이스 준비
            if drop_existing:
                self._drop_database(target_db)

            if create_db:
                self._create_database(target_db)

            # 복구 명령 생성
            cmd = self.config.get_pg_restore_command(restore_file, target_db)

            # 환경변수 설정
            env = os.environ.copy()
            env['PGPASSWORD'] = self.config.db_password

            # 복구 실행
            self.logger.info(f"복구 명령 실행 중...")
            self.logger.info(f"명령어: {' '.join(cmd[:-1])}...")

            result = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True
            )

            # 복구 결과 처리
            if result.returncode != 0:
                # pg_restore는 경고가 있어도 0이 아닌 코드를 반환할 수 있음
                if "WARNING" in result.stderr and "ERROR" not in result.stderr:
                    self.logger.warning("복구 중 경고 발생 (계속 진행):")
                    if self.config.verbose:
                        self.logger.warning(result.stderr)
                else:
                    raise subprocess.CalledProcessError(result.returncode, cmd, result.stdout, result.stderr)

            if result.stderr and self.config.verbose:
                self.logger.info(f"복구 진행 상황:\n{result.stderr}")

            # 복구 검증
            if self._verify_restore(target_db):
                self.logger.info("✅ 복구 검증 성공")
            else:
                raise Exception("복구된 데이터베이스 검증 실패")

            # 성공 로그
            duration = (datetime.now() - start_time).total_seconds()
            self.logger.info(f"✅ 복구 완료!")
            self.logger.info(f"소요 시간: {duration:.2f}초")

            # 스케줄러 로그 기록
            self._log_to_scheduler("database_restore", "success", {
                "backup_file": backup_file,
                "target_db": target_db,
                "duration": duration
            })

            return True

        except subprocess.CalledProcessError as e:
            self.logger.error(f"❌ 복구 실패: {e}")
            self.logger.error(f"에러 출력: {e.stderr}")
            self._log_to_scheduler("database_restore", "failed", {"error": str(e)})
            return False

        except Exception as e:
            self.logger.error(f"❌ 예상치 못한 오류: {e}")
            self._log_to_scheduler("database_restore", "failed", {"error": str(e)})
            return False

        finally:
            # 임시 파일 정리
            if temp_file and Path(temp_file).exists():
                os.remove(temp_file)
                self.logger.info(f"임시 파일 삭제: {temp_file}")

            self.logger.info(f"{'='*60}")

    def _decompress_file(self, gz_file: str) -> str:
        """압축 파일 해제"""
        output_file = gz_file.replace('.gz', '')

        with gzip.open(gz_file, 'rb') as f_in:
            with open(output_file, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)

        self.logger.info(f"파일 압축 해제 완료: {output_file}")
        return output_file

    def _drop_database(self, database: str):
        """데이터베이스 삭제"""
        self.logger.info(f"기존 데이터베이스 삭제 중: {database}")

        # 연결 종료
        terminate_sql = f"""
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '{database}'
        AND pid <> pg_backend_pid();
        """

        drop_sql = f"DROP DATABASE IF EXISTS {database};"

        env = os.environ.copy()
        env['PGPASSWORD'] = self.config.db_password

        # 연결 종료
        subprocess.run(
            ["psql", "-h", self.config.db_host, "-p", self.config.db_port,
             "-U", self.config.db_user, "-d", "postgres", "-c", terminate_sql],
            env=env,
            capture_output=True
        )

        # 데이터베이스 삭제
        result = subprocess.run(
            ["psql", "-h", self.config.db_host, "-p", self.config.db_port,
             "-U", self.config.db_user, "-d", "postgres", "-c", drop_sql],
            env=env,
            capture_output=True,
            text=True
        )

        if result.returncode == 0:
            self.logger.info(f"✅ 데이터베이스 삭제 완료: {database}")
        else:
            self.logger.warning(f"데이터베이스 삭제 실패 또는 존재하지 않음: {database}")

    def _create_database(self, database: str):
        """데이터베이스 생성"""
        self.logger.info(f"새 데이터베이스 생성 중: {database}")

        create_sql = f"""
        CREATE DATABASE {database}
        WITH OWNER = {self.config.db_user}
        ENCODING = 'UTF8'
        LC_COLLATE = 'en_US.UTF-8'
        LC_CTYPE = 'en_US.UTF-8'
        TEMPLATE = template0;
        """

        env = os.environ.copy()
        env['PGPASSWORD'] = self.config.db_password

        result = subprocess.run(
            ["psql", "-h", self.config.db_host, "-p", self.config.db_port,
             "-U", self.config.db_user, "-d", "postgres", "-c", create_sql],
            env=env,
            capture_output=True,
            text=True
        )

        if result.returncode == 0:
            self.logger.info(f"✅ 데이터베이스 생성 완료: {database}")
        else:
            raise Exception(f"데이터베이스 생성 실패: {result.stderr}")

    def _verify_restore(self, database: str) -> bool:
        """복구 검증"""
        try:
            # 테이블 수 확인
            check_sql = """
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_schema = 'playauto_platform';
            """

            env = os.environ.copy()
            env['PGPASSWORD'] = self.config.db_password

            result = subprocess.run(
                ["psql", "-h", self.config.db_host, "-p", self.config.db_port,
                 "-U", self.config.db_user, "-d", database, "-t", "-c", check_sql],
                env=env,
                capture_output=True,
                text=True
            )

            if result.returncode == 0:
                table_count = int(result.stdout.strip())
                self.logger.info(f"복구된 테이블 수: {table_count}")
                return table_count > 0
            else:
                return False

        except Exception as e:
            self.logger.error(f"복구 검증 실패: {e}")
            return False

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

    def list_available_backups(self) -> list:
        """복구 가능한 백업 목록"""
        from scripts.backup.backup_database import DatabaseBackup

        backup = DatabaseBackup(self.config)
        return backup.list_backups()

    def restore_latest(self, backup_type: str = "daily") -> bool:
        """최신 백업으로 복구"""
        backups = self.list_available_backups()

        # 타입별 필터링
        typed_backups = [b for b in backups if b.get('type') == backup_type]

        if not typed_backups:
            self.logger.error(f"복구 가능한 {backup_type} 백업이 없습니다")
            return False

        # 최신 백업 선택
        latest = typed_backups[0]
        self.logger.info(f"최신 백업 선택: {latest['timestamp']} - {Path(latest['file']).name}")

        return self.restore_backup(latest['file'])


def main():
    """메인 함수"""
    import argparse

    parser = argparse.ArgumentParser(description="PostgreSQL 데이터베이스 복구")
    parser.add_argument('backup_file', nargs='?', help='복구할 백업 파일 경로')
    parser.add_argument('--target-db', help='타겟 데이터베이스 이름')
    parser.add_argument('--drop-existing', action='store_true',
                       help='기존 데이터베이스 삭제')
    parser.add_argument('--create-db', action='store_true',
                       help='새 데이터베이스 생성')
    parser.add_argument('--latest', choices=['daily', 'weekly', 'monthly'],
                       help='최신 백업으로 복구')
    parser.add_argument('--list', action='store_true',
                       help='복구 가능한 백업 목록')

    args = parser.parse_args()

    restore = DatabaseRestore()

    if args.list:
        # 백업 목록 출력
        backups = restore.list_available_backups()
        print(f"\n복구 가능한 백업 파일 ({len(backups)}개):")
        print("-" * 80)
        for b in backups:
            size_str = f"{b['size'] / (1024*1024):.2f} MB"
            print(f"[{b['type']}] {b['timestamp']} - {size_str}")
            print(f"  파일: {b['file']}")
            if b.get('description'):
                print(f"  설명: {b['description']}")
            print()

    elif args.latest:
        # 최신 백업으로 복구
        success = restore.restore_latest(args.latest)
        sys.exit(0 if success else 1)

    elif args.backup_file:
        # 지정된 파일로 복구
        success = restore.restore_backup(
            args.backup_file,
            target_db=args.target_db,
            drop_existing=args.drop_existing,
            create_db=args.create_db
        )
        sys.exit(0 if success else 1)

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()