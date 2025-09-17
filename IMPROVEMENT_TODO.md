# 📋 PLAYAUTO 개선사항 및 TODO 리스트
*최종 업데이트: 2025-09-14 22:50*
*실제 코드 및 DB 분석 기반*

## 📊 2025-09-14 22:30 실제 코드/DB 분석 결과

### 발견된 주요 사항
- **Backend**: 11개 API 모듈 (products, transactions, statistics, daily_ledger, batch, purchase_orders, warehouses, scheduler, product_bom, inventory, sales)
- **Frontend**: 23개 페이지 파일 (backup 제외)
- **Database**: 9개 테이블, product_bom 테이블에 4개 레코드 존재 (SET001, SET002)
- **Issues**: scheduler_logs 완전히 비어있음, transactions 테이블 레거시 FK 여전히 존재
- **Resolved**: discrepancies 모두 자동 해결됨 (2025-09-11)

## 🎯 즉시 해결 필요 (Critical)

### 1. Daily Ledger 자동화 복구 🔄
**현황**: 2025-09-09 이후 자동 생성 중단됨
**작업 필요**:
- [ ] 스케줄러 상태 확인 (`scheduler.py`)
- [ ] 자동 생성 크론잡 재활성화
- [ ] 누락된 데이터 백필 (2025-09-10 ~ 2025-09-14)
- [ ] 모니터링 알림 설정

### 2. 레거시 코드 정리 🧹
**현황**: transactions 테이블에 product_id FK 존재 (미사용)
**작업 필요**:
- [ ] 마이그레이션 스크립트 작성
- [ ] product_id 컬럼 및 FK 제거
- [ ] 백업 후 실행
- [ ] 관련 코드 정리

## 🔧 단기 개선사항 (1-2주)

### 1. BOM 기능 구현 📦
**현황**: product_bom 테이블 존재하나 데이터 없음
**작업 필요**:
- [ ] BOM 관리 UI 개발
- [ ] API 엔드포인트 구현
- [ ] 세트 상품 재고 계산 로직
- [ ] 테스트 데이터 입력

### 2. 테스트 커버리지 향상 🧪
**현황**: 전체 테스트 커버리지 45%
**목표**: 80% 이상
**작업 필요**:
- [ ] Backend 단위 테스트 작성
  - [ ] models 테스트
  - [ ] services 테스트
  - [ ] API endpoints 테스트
- [ ] Frontend 컴포넌트 테스트
  - [ ] 핵심 컴포넌트 테스트
  - [ ] 페이지 통합 테스트
- [ ] E2E 테스트 시나리오 작성

### 3. API 문서 업데이트 📝
**작업 필요**:
- [ ] Warehouses API 엔드포인트 문서화
- [ ] Swagger/OpenAPI 스펙 업데이트
- [ ] API_CONTRACTS.md에 Warehouses API 추가

## 📈 중기 개선사항 (1개월)

### 1. 성능 최적화 ⚡
**발견된 이슈**:
- 대량 데이터 조회 시 속도 저하
- 페이지네이션 최적화 필요

**작업 필요**:
- [ ] 데이터베이스 인덱스 최적화
  ```sql
  CREATE INDEX idx_products_warehouse_id ON products(warehouse_id);
  CREATE INDEX idx_transactions_transaction_date ON transactions(transaction_date);
  CREATE INDEX idx_daily_ledgers_ledger_date ON daily_ledgers(ledger_date);
  ```
- [ ] API 응답 캐싱 구현
- [ ] 프론트엔드 레이지 로딩 강화

### 2. 보안 강화 🔒
**작업 필요**:
- [ ] JWT 기반 인증 시스템 구현
- [ ] 역할 기반 접근 제어 (RBAC)
- [ ] API Rate Limiting
- [ ] 민감 정보 암호화 (supplier_email 등)

### 3. 모니터링 시스템 구축 📊
**작업 필요**:
- [ ] 에러 로깅 시스템 (Sentry 연동)
- [ ] 성능 모니터링 (DataDog APM)
- [ ] 실시간 알림 시스템
- [ ] 대시보드 메트릭 강화

## 🚀 장기 개선사항 (3개월)

### 1. 고급 기능 구현
- [ ] AI 기반 수요 예측 시스템
- [ ] 자동 발주 시스템
- [ ] 멀티 테넌트 지원
- [ ] 실시간 동기화 (WebSocket)

### 2. 통합 및 연동
- [ ] 외부 마켓플레이스 API 연동
  - [ ] 쿠팡 API
  - [ ] 네이버 스마트스토어 API
- [ ] ERP 시스템 연동
- [ ] 결제 시스템 통합

### 3. 모바일 대응
- [ ] 반응형 디자인 완성
- [ ] PWA 구현
- [ ] 네이티브 모바일 앱 개발

## 🐛 버그 수정 필요

### 높은 우선순위
1. [ ] transactions 테이블의 product_id 외래키 제약 조건 오류 (미사용 컬럼)
2. [ ] 일부 제품의 가격 데이터 타입 불일치 (Decimal → String 변환 오류)

### 중간 우선순위
1. [ ] 페이지네이션 컴포넌트의 마지막 페이지 계산 오류
2. [ ] CSV 업로드 시 대용량 파일 처리 실패

### 낮은 우선순위
1. [ ] 다크 모드 일부 컴포넌트 스타일 누락
2. [ ] 툴팁 위치 계산 오류

## 📚 문서화 작업

### 즉시 필요
- [x] DATABASE_SCHEMA.md 업데이트 (완료)
- [x] CURRENT_STATUS.md 업데이트 (완료)
- [ ] API_CONTRACTS.md에 Warehouses API 추가
- [ ] 설치 및 실행 가이드 작성

### 추가 필요
- [ ] 사용자 매뉴얼 작성
- [ ] API 사용 예제 코드
- [ ] 트러블슈팅 가이드
- [ ] 기여 가이드라인

## 🎯 추천 작업 순서

### Week 1
1. 재고 불일치 4건 해결
2. 발주서 2건 처리
3. Daily Ledger 자동화 구현

### Week 2
1. 테스트 코드 작성 시작
2. 데이터베이스 인덱스 추가
3. API 문서 업데이트

### Week 3-4
1. JWT 인증 시스템 구현
2. 성능 최적화
3. 모니터링 시스템 기초 구축

## 💡 개선 제안

### 코드 품질
1. **타입 안정성**: TypeScript strict 모드 활성화 권장
2. **코드 일관성**: ESLint/Prettier 규칙 강화
3. **컴포넌트 구조**: 재사용 가능한 컴포넌트 라이브러리 구축

### 아키텍처
1. **마이크로서비스**: 모놀리식에서 점진적 분리 고려
2. **이벤트 드리븐**: 재고 변경 등 주요 이벤트 기반 아키텍처
3. **캐싱 전략**: Redis 도입으로 성능 개선

### 프로세스
1. **CI/CD 강화**: 자동 배포 파이프라인 구축
2. **코드 리뷰**: PR 템플릿 및 체크리스트 강화
3. **모니터링**: 비즈니스 메트릭 대시보드 구축

## 📞 연락 및 지원

프로젝트 관련 문의나 지원이 필요한 경우:
- GitHub Issues: 버그 리포트 및 기능 제안
- 기술 문서: `.claude/` 디렉토리 참조
- API 문서: http://localhost:8000/docs

---

*이 문서는 2025년 9월 10일 코드 분석을 기반으로 작성되었습니다.*  
*정기적인 업데이트와 우선순위 재조정이 필요합니다.*