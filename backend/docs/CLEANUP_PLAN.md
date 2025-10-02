# 🧹 백엔드 디렉토리 정리 계획

## 📁 폴더별 파일 재배치 계획

### 1. `scripts/db/` - 데이터베이스 관련 스크립트
```
analyze_db_schema.py
check_categories.py
check_database_schema.py
check_product_columns.py
check_transactions_constraints.py
check_transactions_table.py
check_and_remove_legacy_fk.py
verify_schema_integrity.py
seed_data.py
insert_supplement_data.py
```

### 2. `scripts/scheduler/` - 스케줄러 관련 스크립트
```
scheduler.py
scheduler_service.py
check_scheduler_health.py
test_scheduler_and_generate_ledgers.py
setup_cron.sh
start_scheduler.sh
```

### 3. `scripts/data/` - 데이터 처리 스크립트
```
daily_ledger_automation.py
generate_missing_daily_ledgers.py
process_purchase_orders.py
resolve_discrepancies.py
```

### 4. `scripts/migration/` - 마이그레이션 실행 스크립트
```
run_migration.py
run_migrations.py
run_migration_safe.py
run_migration_009.py
run_migration_010.py
run_migration_011.py
run_migration_012.py
run_migration_014.py
run_migration_015.py
run_warehouse_migration.py
```

### 5. `tests/` - 테스트 파일 (기존 폴더로 이동)
```
test_adjustment_consistency.py
test_bom_data.py
test_checkpoint_system.py
test_comprehensive_validation.py
test_new_adjustment.py
test_timezone.py
```

### 6. `config/` - 설정 파일
```
.env
.env.production.example
pyproject.toml
requirements.txt
railway.toml
```

### 7. `deploy/` - 배포 관련 (기존 폴더 활용)
```
Dockerfile
docker-compose.yml
.dockerignore
start_server.sh
```

### 8. `docs/` - 문서
```
DEPLOYMENT_GUIDE.md
IMPROVEMENT_TODO.md
```

### 9. 삭제 대상 (로그 파일)
```
backend.log  # logs/ 폴더로 이동 또는 삭제
```

## 🔧 정리 실행 스크립트

```bash
#!/bin/bash
# organize_backend.sh

# 1. 폴더 생성
mkdir -p scripts/{db,scheduler,data,migration}
mkdir -p config
mkdir -p docs

# 2. 파일 이동
# DB 관련
mv analyze_db_schema.py check_*.py verify_schema_integrity.py seed_data.py insert_supplement_data.py scripts/db/
mv check_and_remove_legacy_fk.py scripts/db/

# 스케줄러 관련
mv scheduler*.py check_scheduler_health.py test_scheduler_and_generate_ledgers.py scripts/scheduler/
mv setup_cron.sh start_scheduler.sh scripts/scheduler/

# 데이터 처리
mv daily_ledger_automation.py generate_missing_daily_ledgers.py scripts/data/
mv process_purchase_orders.py resolve_discrepancies.py scripts/data/

# 마이그레이션 실행
mv run_migration*.py scripts/migration/
mv run_warehouse_migration.py scripts/migration/

# 테스트
mv test_*.py tests/

# 설정 파일
mv .env* pyproject.toml requirements.txt railway.toml config/

# 배포
mv Dockerfile docker-compose.yml .dockerignore start_server.sh deploy/

# 문서
mv DEPLOYMENT_GUIDE.md IMPROVEMENT_TODO.md docs/

# 3. 로그 파일 정리
mv backend.log logs/ 2>/dev/null || rm -f backend.log
```

## 📝 정리 후 구조

```
backend/
├── app/                    # 핵심 애플리케이션 코드
├── migrations/             # DB 마이그레이션 SQL
├── tests/                  # 모든 테스트 파일
├── scripts/                # 유틸리티 스크립트
│   ├── db/                 # DB 검사/수정 스크립트
│   ├── scheduler/          # 스케줄러 관련
│   ├── data/               # 데이터 처리/자동화
│   └── migration/          # 마이그레이션 실행 도구
├── config/                 # 모든 설정 파일
├── deploy/                 # Docker, 배포 관련
├── docs/                   # 프로젝트 문서
├── logs/                   # 로그 파일
└── .github/                # GitHub Actions

# 루트에 남는 파일 (최소화)
├── README.md               # 프로젝트 설명
└── .gitignore              # Git 제외 목록
```

## 🎯 장점

1. **명확한 구조**: 파일 용도별로 체계적 분류
2. **유지보수 용이**: 새 스크립트 추가 시 적절한 폴더 선택 가능
3. **깔끔한 루트**: 루트 디렉토리가 깨끗해짐
4. **팀 협업 향상**: 누구나 쉽게 파일 위치 파악

## ⚠️ 주의사항

- import 경로 수정 필요한 파일들 확인
- .gitignore 업데이트
- CI/CD 스크립트 경로 업데이트
- 문서에서 참조하는 경로 업데이트