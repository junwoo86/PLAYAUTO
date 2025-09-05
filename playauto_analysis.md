# PLAYAUTO 시스템 분석 문서

## 📋 시스템 개요

PLAYAUTO는 이커머스 플랫폼을 위한 **AI 기반 재고 관리 시스템**입니다. Streamlit을 사용한 웹 애플리케이션으로 구현되어 있으며, PostgreSQL 데이터베이스와 연동하여 재고 관리, 수요 예측, 알림 기능 등을 제공합니다.

### 주요 기술 스택
- **Frontend**: Streamlit (Python 웹 프레임워크)
- **Backend**: Python 3.x
- **Database**: PostgreSQL
- **AI/ML**: Prophet, ARIMA, XGBoost, TensorFlow
- **Data Processing**: Pandas, NumPy
- **Visualization**: Plotly, Matplotlib, Seaborn
- **API Framework**: FastAPI (requirements에 포함)

---

## 🗂️ 프로젝트 구조

```
playauto/
├── app.py                      # 메인 애플리케이션 (4,428 라인)
├── train_adaptive_daily_improved.py  # AI 모델 학습
├── config/
│   ├── database.py            # 데이터베이스 연결 및 쿼리 클래스
│   └── settings.py            # 설정 관리
├── utils/
│   ├── calculations.py        # 재고 계산 로직
│   ├── order_timing.py        # 발주 시점 계산
│   ├── email_alerts.py        # 이메일 알림 시스템
│   ├── notification_scheduler.py  # 알림 스케줄러
│   └── excel_handler.py       # 엑셀 파일 처리
├── models/                    # 데이터 모델 (미확인)
├── pages/                     # 추가 페이지
├── tests/                     # 테스트 코드
└── data/                      # 데이터 파일
```

---

## 🔧 핵심 기능 분석

### 1. 사용자 인증 및 관리

#### 회원 관리 기능
- **회원가입**: 사용자명, 비밀번호, 이름, 이메일, 전화번호
- **로그인**: 사용자명/비밀번호 인증
- **회원 정보 수정**: 이메일, 전화번호, 비밀번호 변경
- **권한 관리**: 일반 사용자 / 관리자(master) 구분

#### 관련 데이터베이스 테이블
- `playauto_members`: 회원 정보 저장
  - id, password, name, master, email, phone_no, joined_date, last_update_time

---

### 2. 제품 관리

#### 제품 관련 기능
- **제품 등록**: 단품/세트 구분하여 등록
- **제품 정보 수정**: 리드타임, MOQ, 안전재고, 소비기한 등
- **제품 조회**: 전체 제품 목록, 카테고리별 조회
- **재고 부족 제품 확인**: 안전재고 대비 현재재고 체크

#### 제품 데이터 구조
```python
{
    '마스터_sku': str,
    '플레이오토_sku': str,
    '상품명': str,
    '카테고리': str,
    '세트유무': str,
    '현재재고': int,
    '출고량': int,
    '입고량': int,
    '리드타임': int,
    '최소주문수량': int,
    '안전재고': int,
    '제조사': str,
    '소비기한': date,
    '배수': int
}
```

#### 관련 데이터베이스 테이블
- `playauto_product_inventory`: 제품 재고 정보
- `playauto_product_category`: 제품 카테고리 정보
- `playauto_update_history`: 제품 수정 이력

---

### 3. 재고 관리

#### 입출고 처리
- **입고 처리**: 제품별 입고 수량 등록
- **출고 처리**: 제품별 출고 수량 등록
- **재고 조정**: 실사 재고와 시스템 재고 차이 조정
- **입출고 내역 조회**: 시점별 입출고 현황

#### 재고 계산 로직
```python
# 안전재고 계산
safety_stock = predicted_demand * (lead_time_days / 30)

# 재발주점 계산
reorder_point = (daily_usage * lead_time_days) + safety_stock

# 재고소진일 계산
days_until_stockout = current_stock / daily_usage

# 권장 발주량 계산
recommended_qty = reorder_point + (avg_daily_consumption * lead_time) - current_stock
```

#### 관련 데이터베이스 테이블
- `playauto_copy_shipment_receipt`: 입출고 기록
- `playauto_inventory_adjust`: 재고 조정 이력
- `playauto_inNout_adjust`: 입출고 수정 요청

---

### 4. 수요 예측 (AI/ML)

#### 예측 모델
- **ARIMA**: 시계열 예측
- **Prophet**: Facebook의 시계열 예측 라이브러리
- **XGBoost**: 그래디언트 부스팅
- **Adaptive Model**: 복합 예측 모델

#### 예측 기능
- 1개월, 2개월, 3개월 미래 수요 예측
- 예측 정확도 평가 (MAE, RMSE, MAPE, R²)
- 수동 예측값 조정
- 계절성 및 트렌드 분석

#### 예측 결과 활용
- 안전재고 자동 계산
- 발주 시점 추천
- 재고 소진 예상일 계산

---

### 5. 알림 시스템

#### 알림 종류
- **재고 부족 알림**: 안전재고 미달 시
- **발주 필요 알림**: 재발주점 도달 시
- **긴급 발주 알림**: 재고 소진 임박 시

#### 알림 채널
- 이메일 알림 (SMTP 설정)
- 대시보드 내 알림 표시
- 자동 스케줄링 지원

#### 알림 우선순위
```python
# 긴급도 계산
if current_stock <= reorder_point:
    urgency = "긴급"
elif days_until_safety_stock <= 10:
    urgency = "주의"
else:
    urgency = "정상"
```

---

### 6. 대시보드 및 리포팅

#### 대시보드 구성
- **실시간 재고 현황**: 전체 제품 수, 재고 부족 제품, 7일 내 발주 필요
- **제품별 재고 상태**: 표 형식으로 재고 현황 표시
- **재고 현황 차트**: Plotly를 활용한 시각화

#### 통계 및 분석
- 월별 출고량 추이
- 카테고리별 재고 현황
- 제품별 수요 트렌드 분석

---

## 💾 데이터베이스 스키마

### 주요 테이블
1. **playauto_members**: 회원 정보
2. **playauto_product_inventory**: 제품 재고
3. **playauto_product_category**: 제품 카테고리
4. **playauto_copy_shipment_receipt**: 입출고 내역
5. **playauto_inventory_adjust**: 재고 조정 이력
6. **playauto_inNout_adjust**: 입출고 수정 요청
7. **playauto_predictions**: AI 예측 결과
8. **playauto_update_history**: 제품 정보 수정 이력
9. **playauto_api_keys**: API 키 관리

---

## 🔌 FastAPI 추출 가능 기능

### 1. 인증 API
```python
POST /api/auth/login          # 로그인
POST /api/auth/register       # 회원가입
POST /api/auth/logout         # 로그아웃
PUT  /api/users/profile       # 프로필 수정
PUT  /api/users/password      # 비밀번호 변경
```

### 2. 제품 관리 API
```python
GET    /api/products                    # 제품 목록 조회
GET    /api/products/{sku}             # 제품 상세 조회
POST   /api/products                    # 제품 등록
PUT    /api/products/{sku}             # 제품 정보 수정
DELETE /api/products/{sku}             # 제품 삭제
GET    /api/products/low-stock         # 재고 부족 제품 조회
```

### 3. 재고 관리 API
```python
POST   /api/inventory/in                # 입고 처리
POST   /api/inventory/out               # 출고 처리
POST   /api/inventory/adjust            # 재고 조정
GET    /api/inventory/transactions      # 입출고 내역 조회
GET    /api/inventory/status/{sku}      # 재고 상태 조회
```

### 4. 예측 API
```python
POST   /api/predictions/generate        # 수요 예측 생성
GET    /api/predictions/{sku}          # 예측 결과 조회
PUT    /api/predictions/{sku}/adjust   # 예측값 수동 조정
GET    /api/predictions/accuracy        # 예측 정확도 조회
```

### 5. 알림 API
```python
GET    /api/alerts                      # 알림 목록 조회
POST   /api/alerts/send                 # 즉시 알림 발송
PUT    /api/alerts/settings             # 알림 설정 변경
POST   /api/alerts/schedule             # 알림 스케줄 설정
```

### 6. 리포트 API
```python
GET    /api/reports/dashboard           # 대시보드 데이터
GET    /api/reports/shipments/monthly   # 월별 출고 통계
GET    /api/reports/inventory/summary   # 재고 현황 요약
GET    /api/reports/predictions/trend   # 수요 트렌드 분석
```

### 7. 발주 관리 API
```python
GET    /api/orders/recommendations      # 발주 추천 목록
POST   /api/orders/calculate           # 발주량 계산
GET    /api/orders/urgent               # 긴급 발주 필요 제품
POST   /api/orders/generate-po          # 발주서 생성
```

---

## 📊 비즈니스 로직 핵심 함수

### 재고 계산 (utils/calculations.py)
- `calculate_safety_stock()`: 안전재고 계산
- `calculate_reorder_point()`: 재발주점 계산
- `calculate_order_quantity()`: 발주량 계산
- `calculate_stockout_date()`: 재고 소진일 계산
- `calculate_inventory_metrics()`: 재고 지표 계산
- `get_inventory_status()`: 재고 상태 판단

### 발주 타이밍 (utils/order_timing.py)
- `calculate_reorder_point()`: AI 예측 기반 발주점 계산
- `calculate_demand_trend()`: 수요 트렌드 분석
- `get_order_priority()`: 발주 우선순위 계산
- `batch_calculate_reorder_points()`: 일괄 발주점 계산

### 데이터베이스 쿼리 (config/database.py)
- `MemberQueries`: 회원 관련 쿼리
- `ProductQueries`: 제품 관련 쿼리
- `ShipmentQueries`: 입출고 관련 쿼리
- `PredictionQueries`: 예측 관련 쿼리
- `ApiKeyQueries`: API 키 관련 쿼리

---

## 🚀 FastAPI 마이그레이션 전략

### 1단계: API 서버 구축
1. FastAPI 프로젝트 구조 설정
2. 인증/권한 미들웨어 구현 (JWT)
3. 데이터베이스 연결 풀 설정
4. Pydantic 모델 정의

### 2단계: 핵심 비즈니스 로직 이전
1. 데이터베이스 쿼리 클래스 재사용
2. 유틸리티 함수 모듈화
3. AI 모델 서빙 API 구현

### 3단계: RESTful API 구현
1. CRUD 엔드포인트 구현
2. 비즈니스 로직 엔드포인트 구현
3. WebSocket 실시간 알림 구현

### 4단계: 프론트엔드 분리
1. React/Vue.js 등으로 UI 재구현
2. API 클라이언트 라이브러리 개발
3. 실시간 대시보드 구현

---

## 📝 추가 고려사항

### 성능 최적화
- 데이터베이스 인덱싱 최적화
- 캐싱 전략 (Redis)
- 비동기 처리 (Celery)
- API 응답 페이지네이션

### 보안
- API 키 관리 시스템 강화
- Rate Limiting
- Input Validation
- SQL Injection 방지

### 확장성
- 마이크로서비스 아키텍처 고려
- 메시지 큐 (RabbitMQ/Kafka)
- 로드 밸런싱
- 컨테이너화 (Docker/Kubernetes)

### 모니터링
- 로깅 시스템 구축
- APM 도구 연동
- 에러 추적 시스템
- 성능 메트릭 수집