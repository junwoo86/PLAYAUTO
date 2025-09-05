# BIOCOM 물류 통합 관리 시스템 - 프론트엔드 분석 문서

## 📌 시스템 개요
- **프로젝트명**: BIOCOM 물류 통합 관리 시스템
- **기술 스택**: React, TypeScript, Tailwind CSS
- **주요 기능**: 재고 관리, 입출고 처리, 재고 분석, 발주 관리

## 🏗️ 시스템 아키텍처

### 컴포넌트 구조
```
frontend/src/
├── App.tsx               # 메인 앱 컴포넌트 (라우팅 및 레이아웃)
├── main.tsx             # 애플리케이션 진입점
├── contexts/
│   └── DataContext.tsx  # 전역 상태 관리 컨텍스트
├── components/          # 공통 컴포넌트
│   ├── buttons/        # 버튼 컴포넌트
│   ├── cards/          # 카드 컴포넌트
│   ├── feedback/       # 알림, 경고 컴포넌트
│   ├── forms/          # 폼 관련 컴포넌트
│   ├── layout/         # 레이아웃 컴포넌트
│   ├── navigation/     # 네비게이션 컴포넌트
│   └── tables/         # 테이블 컴포넌트
└── pages/              # 페이지 컴포넌트
    ├── Dashboard.tsx
    ├── ProductList.tsx
    ├── TransactionForm.tsx
    ├── PurchaseOrder.tsx
    ├── DailyClosing.tsx    # 일일 수불부 (새로운 기능)
    ├── ExcelUpload.tsx
    ├── History.tsx
    ├── ReturnManagement.tsx
    ├── StockAlert.tsx
    ├── Analysis.tsx
    └── Settings.tsx
```

## 📄 페이지별 상세 기능 분석

### 1. 대시보드 (Dashboard)
**파일**: `frontend/src/pages/Dashboard.tsx`

#### 주요 기능
- **오늘의 거래 요약**: 
  - MiniStatsCard 컴포넌트로 입고/출고/조정/엑셀 업로드 현황 표시
  - 실시간 거래 데이터 집계
- **KPI 지표**: 
  - 재고 정확도: 목표 98% 대비 현재 달성률 표시
  - 월간 손실액: 조정 건수 및 평균 손실 금액 표시
  - 재고 총액: 총 SKU 수 및 평균 재고일수 표시
- **주간 조정 분석**: 
  - SimpleBarChart로 재고 정확도 추이 시각화
  - 조정 사유 TOP 5 (막대 그래프와 백분율 표시)
- **빈번한 조정 품목**: 
  - 조정 횟수 기준 TOP 6 품목 표시
  - 1-3위는 빨간색으로 강조

#### 알림 기능
- 미처리 불일치 알림 (pendingDiscrepancies)
- "지금 처리하기" 버튼으로 즉시 처리 페이지 이동

---

### 2. 제품목록 (ProductList)
**파일**: `frontend/src/pages/ProductList.tsx`

#### 주요 기능
- **제품 목록 조회**: 
  - 검색 필터 (제품명, 코드, 바코드) - debounce 300ms 적용
  - 위치별 필터링
  - 재고 보유 여부 필터링
  - 실시간 재고 정확도 표시 (색상 구분: 녹색 98%↑, 노란색 95-98%, 빨간색 95%↓)
- **발주점 관리**: 
  - 자동 발주점 설정
  - 발주 필요 품목 자동 표시
  - MOQ 및 리드타임 표시
- **공급업체 정보**: 업체명 및 리드타임 표시

#### 버튼별 상세 기능
1. **제품 추가 모달**
   - **SKU 관리**: 
     - 자동 생성 버튼 (랜덤 8자리)
     - action prop 패턴으로 필드 내 버튼 배치
   - **바코드 관리**: 
     - EAN-13 형식 자동 생성
     - action prop 패턴 적용
   - **제품 속성 섹션**: 
     - 카테고리, 브랜드, 제조사
     - 공급업체 및 연락처 (필수)
     - MOQ (최소발주수량) 설정
     - 리드타임 (일) 설정
     - 자동 발주점 설정
   - **가격 정보**: 구매가, 판매가
   - **초기 재고**: 위치별 수량 설정
   - **메모**: 추가 정보 입력

2. **BOM 관리 모달** 
   - **현재 재고 상태 표시**: 
     - 세트 재고, 조립 가능 수량, 예상 재고
   - **부품 추가 기능**: 
     - 실시간 제품 검색 (자동완성 드롭다운)
     - 자기 자신 및 이미 추가된 부품 제외
     - 부품별 재고 표시
   - **부품 관리**: 
     - 수량 실시간 수정
     - 삭제 버튼 (휴지통 아이콘)
   - **세트 조립/해체**: 
     - 최대 가능 수량 자동 계산
     - 조립: 부품 소비 → 세트 생성
     - 해체: 세트 소비 → 부품 환원
     - 예상 결과 미리보기 (파란색 박스)
   - **버튼 구성**: 초기화, 취소, 저장

3. **재고 조정 모달**
   - **제품 정보 표시**: 제품명, 코드, 현재/최소 재고
   - **실제 재고 입력**: 
     - 불일치 자동 계산 (녹색: 증가, 빨간색: 감소)
     - 변동 내역 실시간 표시
   - **조정 사유** (필수 선택): 
     - 실사 차이, 파손/폐기, 도난/분실
     - 시스템 오류, 기타
   - **메모**: 추가 설명 입력
   - **검증 로직**: 
     - 수량 0 불가
     - 현재 재고와 동일 시 조정 불가
     - 사유 미선택 시 저장 불가

4. **이력 보기 버튼**
   - localStorage에 필터 정보 저장
   - History 페이지로 이동 (제품 필터 적용)

---

### 3. 일일 수불부 (DailyClosing) - 새로운 기능
**파일**: `frontend/src/pages/DailyClosing.tsx`

#### 주요 기능
- **일일 재고 수불 관리**: 
  - 날짜별 입출고 및 재고 변동 추적
  - 기초재고 → 입고/출고/조정 → 마감재고 흐름
  - 시스템 재고와 계산 재고 비교
- **마감 처리**: 
  - 일일 마감 상태 관리 (미마감/처리중/완료)
  - 마감 후 거래 수정 불가 처리
- **통계 표시**: 
  - 총 거래, 입고, 출고, 조정 수량
  - 재고 정확도 계산
  - 불일치 품목 수 표시

#### 상세 기능
1. **수불부 테이블**
   - **상태 표시**: 
     - 녹색 체크: 재고 일치
     - 빨간색 경고: 큰 불일치 (10개 초과)
     - 노란색 경고: 작은 불일치
   - **재고 흐름 컬럼**: 
     - 기초재고 (opening stock)
     - 입고 (+녹색), 출고 (-빨간색)
     - 조정 (파란색/주황색)
     - 마감재고 (굵은 글씨)
     - 시스템재고
     - 차이 (불일치 시 색상 표시)

2. **마감 확인 모달**
   - 마감일 및 처리 항목 요약
   - 불일치 건수 경고 표시
   - 마감 후 수정 불가 안내

3. **다운로드 기능**
   - **Excel 형식**: CSV로 데이터 내보내기
   - **PDF 형식**: 인쇄용 문서 (추가 구현 필요)
   - 한글 인코딩 지원 (BOM 추가)

#### 데이터 계산 로직
- 기초재고 = 현재재고 - 입고 + 출고 - 조정
- 마감재고 = 기초재고 + 입고 - 출고 + 조정
- 불일치 = 마감재고 - 시스템재고
- 정확도 = (전체품목 - 불일치품목) / 전체품목 × 100

---

### 4. 입고/출고/조정/이동 (TransactionForm)
**파일**: `frontend/src/pages/TransactionForm.tsx`

#### 공통 기능
- **기본 설정**: 
  - 날짜 선택 (기본값: 오늘)
  - 위치 선택 (본사 창고/지점 창고)
- **제품 검색 시스템**: 
  - 실시간 검색 (debounce 300ms)
  - 제품명 및 코드로 검색
  - 클릭하면 전체 목록 표시
  - 현재 재고 실시간 표시
- **일괄 처리**: 
  - 여러 제품을 목록에 추가
  - 개별 삭제 가능
  - 테이블 형태로 처리 대기 목록 표시

#### 유형별 특수 기능
1. **입고 (receive)**
   - 재고 증가 처리
   - 입고 수량 입력
   - 메모 입력 (선택)

2. **출고 (dispatch)**
   - 재고 감소 처리 (음수 처리 자동)
   - 출고 수량 입력
   - 메모 입력 (선택)

3. **조정 (adjustment)**
   - **실제 재고 입력**: 
     - 불일치 자동 계산 및 시각화
     - 증가: 녹색, 감소: 빨간색 표시
   - **필수 입력 사항**: 
     - 조정 사유 선택 (드롭다운)
       - 실사 차이, 파손/폐기, 도난/분실
       - 시스템 오류, 기타
     - 상세 설명 (최소 10자 필수)
   - **소명 모달**: 미입력 시 경고 모달 표시

4. **이동 (transfer)** - 현재 구현 중
   - 창고 간 재고 이동
   - 출발지/도착지 설정

---

### 5. 발주 관리 (PurchaseOrder)
**파일**: `frontend/src/pages/PurchaseOrder.tsx`

#### 발주서 목록 화면
- **상태별 필터 탭**: 
  - 전체/임시 저장/입고 대기/부분 입고/입고 완료
  - 각 상태별 카운트 표시
- **발주서 정보 표시**: 
  - 상태 뱃지 (색상 구분)
  - 발주일/시간, 주문 번호
  - 공급자, 품목 수, 총액
  - 입고 진행률 (부분 입고 시 프로그레스 바)
- **검색 및 필터**: 
  - 주문 번호/공급자 검색
  - 기간 필터 (전체/오늘/이번 주/이번 달/기간 선택)

#### 발주서 작성 화면
1. **기본 정보 입력**
   - 공급자(거래처) 선택 (필수)
   - 주문 번호 (자동 생성 또는 수동 입력)
   - 하나의 발주서에 하나의 제품만 등록

2. **제품 선택 시스템**
   - **실시간 검색**: 전체 목록 표시 또는 검색
   - **자동 설정**: 
     - MOQ를 기본 수량으로 설정
     - 리드타임 기반 예상 입고일 자동 계산
     - 제품별 구매가 자동 입력

3. **가격 계산 시스템**
   - 소계 = 단가 × 수량
   - 할인 금액 = 소계 × 할인률
   - 세금 = (소계 - 할인) × 세율
   - 총액 = 소계 - 할인 + 세금

4. **발주 처리 옵션**
   - **임시 저장 (draft)**: 나중에 수정 가능
   - **발주 확정 (pending)**: 입고 대기 상태
   - **"즉시 입고 처리"**: 체크 시 재고 즉시 반영
   - **MOQ 검증**: MOQ 미달 시 경고 표시

---

### 6. 엑셀 업로드 (ExcelUpload)
**파일**: `frontend/src/pages/ExcelUpload.tsx`

#### 주요 기능
1. **템플릿 다운로드**
   - **커스터마이징 가능**: 
     - 현재 재고 포함 여부
     - 공급업체 정보 포함
     - 바코드 포함
   - **날짜 형식 선택**: 
     - YYYY-MM-DD
     - DD/MM/YYYY
     - MM/DD/YYYY
   - **구분자 선택**: 콤마(,), 세미콜론(;), 탭(\t)
   - **샘플 데이터**: 실제 제품 5개 포함

2. **파일 업로드**
   - **드래그 앤 드롭**: 시각적 피드백 제공
   - **파일 선택**: 클릭으로 파일 탐색기 열기
   - **중복 파일 체크**: 
     - SHA-256 해시로 파일 고유성 검증
     - 이미 업로드된 파일 경고
   - **진행률 표시**: 대용량 파일 처리 시 %표시

3. **데이터 검증 및 불일치 처리**
   - **실시간 검증**: 
     - 존재하지 않는 제품 코드 검출
     - 재고 계산 검증
   - **불일치 분류**: 
     - error (빨간색): 치명적 오류
     - warning (노란색): 재고 불일치
     - valid (녹색): 정상 처리
   - **필수 소명**: 
     - 모든 불일치 항목에 소명 필수
     - 소명 없으면 처리 불가

4. **업로드 이력 관리**
   - **상태 표시**: 
     - processing: 처리 중
     - completed: 완료
     - error: 오류 발생
   - **이력 정보**: 
     - 파일명, 업로드 시간, 업로더
     - 처리 건수/전체 건수
   - **롤백 기능**: 
     - 잘못된 업로드 취소
     - 거래 복원

#### 데이터 처리 로직
- 각 행별로 입고/출고/조정 거래 생성
- 불일치 발생 시 자동 조정 거래 생성
- 트랜잭션 단위 처리로 데이터 일관성 보장

---

### 7. 히스토리 (History)
**파일**: `frontend/src/pages/History.tsx`

#### 주요 기능
- **거래 내역 조회**: 
  - 트랜잭션 그룹화 (같은 시간대 거래 묶음)
  - 제품별 필터링 (localStorage 연동)
  - 실시간 검색 (debounce 300ms)
- **기간 필터**: 
  - 전체, 오늘, 최근 7일, 최근 30일
  - 커스텀 날짜 범위 선택
- **거래 유형 필터**: 
  - 입고 (녹색), 출고 (빨간색)
  - 조정 (파란색), 이동 (보라색)
  - 다중 필터 태그 지원

#### UI/UX 특징
- **분할 뷰 레이아웃**: 
  - 왼쪽: 거래 목록 (스크롤 가능)
  - 오른쪽: 선택된 거래 상세 정보
- **세트 상품 처리**: 
  - 세트 구성품 자동 그룹화
  - "세트 -" 패턴 인식
- **성능 최적화**: 
  - react-window 가상 스크롤
  - useMemo로 필터링 최적화
  - debounce 검색

#### 상세 정보 표시
- 거래 일시 (초 단위까지)
- 품목별 수량 및 위치 정보
- 이동 거래 시 출발/도착지 표시
- 거래 담당자 및 메모

---

### 8. 취소 및 반품 (ReturnManagement)
**파일**: `frontend/src/pages/ReturnManagement.tsx`

#### 처리 유형
1. **주문 취소**
   - 배송 전 취소 처리
   - 재고 즉시 복구 (입고 거래 생성)
   - 취소 사유 기록

2. **반품 처리**
   - **제품 상태 평가**: 
     - 양호 (CheckCircle): 재판매 가능
     - 파손 (XCircle): 물리적 손상
     - 불량 (AlertTriangle): 기능상 문제
   - **처리 방법 결정**:
     - 재입고: 판매 가능 재고로 추가
     - 폐기: 재고에서 완전 제거 (조정 거래)
     - 보류: 추가 검토 필요
   - **AI 권장 사항**: 상태 기반 자동 처리 제안
     - 양호 → 재입고 권장
     - 파손/불량 → 폐기 권장

#### 상세 기능
- **실시간 재고 예측**: 처리 방법별 예상 재고 표시
- **처리 요약**: 선택 사항 실시간 미리보기
- **반품 사유 옵션**: 
  - 고객 변심, 제품 하자, 오배송
  - 배송 지연, 기타
- **검사 메모**: 상세 내용 기록

---

### 9. 재고 부족 알림 (StockAlert)
**파일**: `frontend/src/pages/StockAlert.tsx`

#### 주요 기능
- **알림 레벨 분류**: 
  - 긴급 (빨간색): 재고 소진 또는 50% 미만
  - 경고 (노란색): 재고 부족 임박
  - 확인됨 (녹색): 발주 완료/진행중
- **발주 상태 추적**:
  - 발주 필요 (none): 발주하기 버튼 표시
  - 임시 저장 (draft): 회색 상태
  - 입고 대기 (pending): 예상 입고일 표시
  - 부분 입고 (partial): 진행률 표시
  - 입고 완료 (completed): 목록에서 제외

#### 스마트 기능
- **MOQ 기반 발주 제안**: 
  - 부족 수량 < MOQ일 때 MOQ 수량 제안
  - 효율적인 발주 권장
- **실시간 통계**: 
  - 긴급/경고/해결됨 카운트
  - 발주 대기/임시 저장 건수
- **상태별 필터링**: 긴급도별 분류 조회
- **발주 페이지 연동**: 원클릭 발주 이동

---

### 10. 분석 (Analysis)
**파일**: `frontend/src/pages/Analysis.tsx`

#### 분석 유형별 기능

1. **입출고 요약 (analysis-summary)**
   - 일별/주별/월별 거래 요약
   - 입출고 트렌드 분석

2. **과거 수량 조회 (past-quantity)**
   - 특정 시점 재고 수량 확인
   - 시계열 재고 변동 추적

3. **분석 대시보드 (analysis-dashboard)**
   - 월 평균 재고, 재고 회전율
   - 재고 보유 일수, 재고 가치
   - 월별 재고 추이 차트 (SimpleBarChart)
   - 카테고리별 재고 분포

4. **재고 분석 (inventory-analysis)**
   - ABC 분석 (A등급 20%, B등급 30%, C등급 50%)
   - 재고 부족 예상 품목 (리드타임 기반)
   - 과잉 재고 품목 (재고일수 기준)

5. **조정 이력 분석 (adjustment-analysis)**
   - **핵심 지표**:
     - 총 조정 건수 (전월 대비)
     - 조정 손실액
     - 재고 정확도 (목표 98%)
     - 평균 조정률 (목표 < 2%)
   - **조정 사유 분석**:
     - 실사 차이 (45%)
     - 파손/폐기 (25%)
     - 도난/분실 (15%)
     - 시스템 오류 (10%)
     - 기타 (5%)
   - **리포트 빌더**: 커스텀 리포트 생성
   - **스케줄 설정**: 정기 리포트 자동 발송

6. **매출 분석 (sales-analysis)**
   - 제품별 판매 실적
   - 매출 트렌드 분석

7. **데이터 관리 (data-management)**
   - 데이터 백업/복원
   - 데이터 정합성 검사

---

### 11. 설정 (Settings)
**파일**: `frontend/src/pages/Settings.tsx`

#### 설정 카테고리

1. **일반 설정 (settings-general)**
   - **회사 정보**:
     - 회사명, 사업자번호
     - 대표자명, 전화번호
   - **데이터 설정**:
     - 기본 통화 (KRW, USD, EUR)
     - 시간대 (서울, 뉴욕, 런던)
     - 자동 백업 활성화 (스위치)

2. **사용자 관리 (settings-users)**
   - **사용자 역할**:
     - 관리자, 일반 사용자, 게스트
   - **권한 관리**:
     - 사용자별 접근 권한 설정
     - 역할 기반 접근 제어 (RBAC)
   - **사용자 추가/편집**: 이메일 기반 계정 관리

3. **알림 설정 (settings-notifications)**
   - **알림 유형** (모두 스위치로 제어):
     - 재고 부족 알림 (최소 수량 이하)
     - 일일 리포트 (매일 오전 9시)
     - 거래 알림 (입출고 발생 시)
     - 시스템 알림 (업데이트/유지보수)
   - **알림 채널**:
     - 이메일 주소 설정
     - 알림 빈도 설정

---

## 🔄 기능별 그룹화

### 재고 관리 기능군
1. **재고 조회 및 관리**
   - 제품목록 (ProductList)
   - 재고 부족 알림 (StockAlert)
   - 재고 분석 (Analysis - inventory-analysis)

2. **재고 거래 처리**
   - 입고 (TransactionForm - receive)
   - 출고 (TransactionForm - dispatch)
   - 조정 (TransactionForm - adjustment)
   - 이동 (TransactionForm - transfer)

3. **BOM 관리**
   - 세트 조립/해체 (ProductList - BOM 관리)

### 구매/판매 관리 기능군
1. **발주 관리**
   - 발주서 작성 (PurchaseOrder - 작성)
   - 발주서 목록 (PurchaseOrder - 목록)
   - 발주 상태 추적

2. **반품/취소 처리**
   - 주문 취소 (ReturnManagement - cancel)
   - 반품 처리 (ReturnManagement - return)

### 데이터 관리 기능군
1. **데이터 입력**
   - 엑셀 업로드 (ExcelUpload)
   - 제품 추가 (ProductList - 제품 추가)

2. **데이터 조회**
   - 히스토리 (History)
   - 분석 대시보드 (Analysis)

3. **데이터 정정**
   - 재고 조정 (ProductList - 재고 조정)
   - 불일치 처리 (ExcelUpload - 불일치 소명)
   - 롤백 (ExcelUpload - 롤백, History)

### 분석 및 보고 기능군
1. **실시간 모니터링**
   - 대시보드 (Dashboard)
   - 재고 부족 알림 (StockAlert)

2. **분석 보고서**
   - 조정 이력 분석 (Analysis - adjustment-analysis)
   - 매출 분석 (Analysis - sales-analysis)
   - 재고 분석 (Analysis - inventory-analysis)

3. **AI 기반 인사이트**
   - 재고 정확도 분석
   - 개선 제안
   - 발주 제안

### 시스템 관리 기능군
1. **설정 관리**
   - 일반 설정 (Settings - general)
   - 사용자 관리 (Settings - users)
   - 알림 설정 (Settings - notifications)

2. **권한 관리**
   - 사용자별 권한 설정
   - 역할 기반 접근 제어

---

## 🔑 핵심 비즈니스 로직

### 재고 정확도 관리
- **계산 방식**: `100 - |불일치 수량 / 현재 재고 × 100|`
- **목표 정확도**: 98%
- **정확도 추적**: 실시간 모니터링 및 추이 분석

### 불일치 처리 프로세스
1. 불일치 감지 (시스템 재고 ≠ 실재고)
2. 소명 요구 (최소 10자 이상)
3. 조정 거래 생성
4. 정확도 재계산

### BOM(Bill of Materials) 처리
- **세트 조립**: 부품 재고 차감 → 세트 재고 증가
- **세트 해체**: 세트 재고 차감 → 부품 재고 증가
- **조립 가능 수량**: `MIN(부품재고 ÷ 필요수량)`

### 발주 관리
- **MOQ 검증**: 최소발주수량 미달 시 경고
- **리드타임 계산**: 발주일 + 리드타임 = 예상 입고일
- **즉시 입고**: 발주와 동시에 재고 반영 옵션

---

## 📊 데이터 컨텍스트 (DataContext)
**파일**: `frontend/src/contexts/DataContext.tsx`

### 주요 엔티티

1. **Product** - 제품 정보
   ```typescript
   {
     id, productCode, productName, barcode, category,
     currentStock, bookStock, physicalStock,  // 재고 관리
     minStock, maxStock, price,
     accuracyRate, discrepancy,  // 정확도 관리
     lastAdjustmentDate, lastAdjustmentReason,
     bom: BOMItem[],  // BOM 구성
     // 발주 관련 필드
     reorderPoint, leadTime, supplier, supplierContact,
     moq, purchasePrice
   }
   ```

2. **Transaction** - 거래 내역
   ```typescript
   {
     id, type: 'inbound' | 'outbound' | 'adjustment' | 'transfer',
     productId, productName, quantity,
     previousStock, newStock,
     date, memo, reason,
     uploadFileId,  // 엑셀 업로드 연결
     createdBy, createdAt,
     isRollbackable  // 롤백 가능 여부
   }
   ```

3. **ExcelUpload** - 엑셀 업로드 기록
   ```typescript
   {
     id, fileName, uploadedAt, uploadedBy,
     totalRows, processedRows, errorRows,
     status: 'pending' | 'processing' | 'completed' | 'error',
     transactions: string[]  // 관련 거래 ID 목록
   }
   ```

4. **AdjustmentAnalysis** - 조정 분석 데이터
   ```typescript
   {
     period, totalAdjustments, totalLossAmount,
     topAdjustedProducts[],  // 빈번한 조정 제품
     reasonBreakdown: {},  // 사유별 비율
     accuracyRate, accuracyTrend[]  // 정확도 추이
   }
   ```

### 주요 함수

#### 제품 관리
- `addProduct(product)`: 신규 제품 등록
- `updateProduct(id, updates)`: 제품 정보 수정
- `getProduct(id)`: 특정 제품 조회

#### 거래 관리
- `addTransaction(transaction)`: 
  - 거래 생성 및 재고 자동 업데이트
  - 조정 시 정확도 재계산
- `rollbackTransaction(id, reason)`: 
  - 역방향 거래 자동 생성
  - 조정 거래는 롤백 불가

#### BOM 처리
- `assembleSet(productId, quantity)`: 
  - 부품 재고 차감
  - 세트 재고 증가
- `disassembleSet(productId, quantity)`: 
  - 세트 재고 차감
  - 부품 재고 증가

#### 엑셀 업로드
- `uploadExcel(file)`: 
  - 파일 처리 및 검증
  - 불일치 감지 시 pendingDiscrepancies 생성
- `rollbackExcelUpload(uploadId, reason)`: 
  - 관련 거래 모두 롤백

#### 불일치 처리
- `pendingDiscrepancies[]`: 처리 대기 불일치 목록
- `resolveDiscrepancy(productId, explanation)`: 
  - 불일치 소명 처리
  - 조정 거래 자동 생성

#### 분석 데이터
- `getAdjustmentAnalysis(period)`: 
  - 기간별 조정 분석
  - 사유별 통계
  - 정확도 추이

---

## 🎯 시스템 특징

### 1. 실시간 재고 관리
- 모든 거래가 즉시 재고에 반영
- 다중 창고 지원
- 실시간 재고 정확도 추적

### 2. 스마트 알림 시스템
- 재고 부족 사전 경고
- MOQ 기반 발주 제안
- 불일치 자동 감지

### 3. 강력한 분석 도구
- 다양한 차트와 그래프
- AI 기반 개선 제안
- 추이 분석 및 예측

### 4. 유연한 데이터 처리
- 엑셀 일괄 업로드
- 트랜잭션 롤백
- 불일치 소명 관리

### 5. 사용자 친화적 UI
- 직관적인 네비게이션
- 상태별 색상 코딩
- 드래그 앤 드롭 지원
- 자동 완성 및 제안

---

## 📝 개선 제안 사항

1. **모바일 대응**: 반응형 디자인 강화
2. **실시간 동기화**: WebSocket 활용한 실시간 업데이트
3. **고급 필터링**: 더 많은 필터 옵션 제공
4. **대시보드 커스터마이징**: 사용자별 대시보드 설정
5. **API 통합**: 외부 ERP/WMS 시스템 연동
6. **바코드 스캐닝**: 모바일 바코드 스캔 기능
7. **다국어 지원**: 영어, 중국어 등 추가
8. **고급 보고서**: 더 상세한 분석 보고서 템플릿

---

## 📚 기술 스택 상세

- **Frontend Framework**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Icons**: Lucide React
- **Charts**: Victory Charts (SimpleBarChart 컴포넌트)
- **Build Tool**: Vite

---

## 🔌 백엔드 개발 가이드

### API 엔드포인트 요구사항

#### 인증 & 권한
- `/api/auth/login` - 로그인
- `/api/auth/logout` - 로그아웃
- `/api/auth/refresh` - 토큰 갱신
- `/api/users/*` - 사용자 관리 CRUD

#### 제품 관리
- `GET /api/products` - 제품 목록 조회
- `POST /api/products` - 제품 생성
- `PUT /api/products/:id` - 제품 수정
- `DELETE /api/products/:id` - 제품 삭제
- `GET /api/products/:id/history` - 제품별 거래 내역

#### 재고 거래
- `POST /api/transactions/inbound` - 입고 처리
- `POST /api/transactions/outbound` - 출고 처리
- `POST /api/transactions/adjustment` - 조정 처리
- `POST /api/transactions/transfer` - 이동 처리
- `POST /api/transactions/:id/rollback` - 거래 롤백

#### BOM 관리
- `GET /api/products/:id/bom` - BOM 조회
- `POST /api/products/:id/bom` - BOM 설정
- `POST /api/products/:id/assemble` - 세트 조립
- `POST /api/products/:id/disassemble` - 세트 해체

#### 발주 관리
- `GET /api/purchase-orders` - 발주서 목록
- `POST /api/purchase-orders` - 발주서 생성
- `PUT /api/purchase-orders/:id` - 발주서 수정
- `POST /api/purchase-orders/:id/receive` - 입고 처리

#### 엑셀 처리
- `POST /api/excel/upload` - 엑셀 업로드
- `GET /api/excel/template` - 템플릿 다운로드
- `POST /api/excel/validate` - 데이터 검증
- `POST /api/excel/:id/rollback` - 업로드 롤백

#### 분석 & 리포트
- `GET /api/analytics/dashboard` - 대시보드 데이터
- `GET /api/analytics/inventory` - 재고 분석
- `GET /api/analytics/adjustments` - 조정 분석
- `GET /api/analytics/accuracy-trend` - 정확도 추이
- `POST /api/reports/generate` - 리포트 생성
- `POST /api/reports/schedule` - 리포트 스케줄링

#### 알림
- `GET /api/alerts/stock` - 재고 부족 알림
- `POST /api/alerts/settings` - 알림 설정
- `GET /api/alerts/history` - 알림 이력

### 데이터베이스 스키마 요구사항

#### 핵심 테이블
1. **products** - 제품 마스터
2. **transactions** - 거래 내역
3. **bom_items** - BOM 구성
4. **purchase_orders** - 발주서
5. **excel_uploads** - 엑셀 업로드 이력
6. **users** - 사용자
7. **alerts** - 알림 설정

#### 인덱스 요구사항
- 제품코드, 바코드 (unique)
- 거래일시 (범위 검색용)
- 재고 수량 (알림용)
- 발주 상태

### 실시간 처리 요구사항

#### WebSocket 이벤트
- `stock:update` - 재고 변동 알림
- `alert:new` - 새 알림 발생
- `order:status` - 발주 상태 변경
- `discrepancy:found` - 불일치 감지

#### 백그라운드 작업
- 일일 재고 스냅샷
- 정기 리포트 생성
- 재고 부족 예측
- 데이터 정합성 검사

---

## 📋 변경 이력

### 2025-01-03 (v3.0)
- 모든 페이지 상세 분석 완료
- 백엔드 개발 가이드 추가
- DataContext 상세 문서화
- UI/UX 세부사항 추가

### 2025-01-03 (v2.0)
- **새로운 페이지 추가**: 일일 수불부 (DailyClosing.tsx)
- **네비게이션 메뉴 구조 변경**: 
  - 분석 메뉴 서브메뉴 추가 (입출고 요약, 과거 수량 조회, 대시보드, 재고 분석, 조정 이력 분석, 매출 분석, 데이터 관리)
  - 재고 모니터링 메뉴 추가
  - 설정 메뉴 서브메뉴 세분화 (일반, 사용자, 알림)
- **제품목록 페이지 개선**:
  - 발주점 관리 기능 추가
  - 공급업체 정보 표시 강화
  - BOM 관리 UI 개선
  - 재고 조정 모달 검증 로직 강화
- **대시보드 개선**:
  - MiniStatsCard 컴포넌트 도입
  - 데이터 시각화 강화

### 2025-01-03 (v1.0)
- 초기 문서 작성
- 시스템 아키텍처 및 페이지별 기능 분석

---

*문서 최종 수정일: 2025-01-03*
*분석 도구: Sequential Thinking MCP를 활용한 체계적 분석*