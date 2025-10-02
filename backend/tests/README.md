# 📝 PLAYAUTO Backend 테스트 가이드라인

## 📁 테스트 디렉토리 구조

```
tests/
├── unit/           # 단위 테스트 (개별 함수/클래스)
├── integration/    # 통합 테스트 (여러 컴포넌트 상호작용)
├── e2e/           # End-to-End 테스트 (전체 시나리오)
├── fixtures/      # 테스트 데이터 및 픽스처
└── conftest.py    # Pytest 설정 및 공통 픽스처
```

## 🎯 테스트 작성 규칙

### 1. 파일 위치
- **단위 테스트**: `tests/unit/test_<module_name>.py`
- **통합 테스트**: `tests/integration/test_<feature_name>.py`
- **E2E 테스트**: `tests/e2e/test_<scenario_name>.py`

### 2. 명명 규칙
```python
# 테스트 파일명
test_transaction_service.py  # 서비스 테스트
test_auth_endpoints.py       # API 엔드포인트 테스트

# 테스트 함수명
def test_should_create_transaction_with_valid_data():
    """유효한 데이터로 거래를 생성해야 한다"""
    pass

def test_should_reject_invalid_product_code():
    """잘못된 제품 코드를 거부해야 한다"""
    pass
```

### 3. 테스트 구조 (AAA 패턴)
```python
def test_example():
    # Arrange (준비)
    data = {"key": "value"}

    # Act (실행)
    result = function_to_test(data)

    # Assert (검증)
    assert result.status == "success"
```

## 🚀 테스트 실행 방법

### 전체 테스트 실행
```bash
pytest
```

### 특정 카테고리 실행
```bash
# 단위 테스트만
pytest tests/unit/

# 통합 테스트만
pytest tests/integration/

# 마커로 실행
pytest -m unit
pytest -m "not slow"
```

### 커버리지 확인
```bash
# 터미널에 표시
pytest --cov=app

# HTML 리포트 생성
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

## 📊 테스트 마커 사용

```python
import pytest

@pytest.mark.unit
def test_unit_example():
    """단위 테스트"""
    pass

@pytest.mark.integration
@pytest.mark.db
def test_database_integration():
    """데이터베이스 통합 테스트"""
    pass

@pytest.mark.e2e
@pytest.mark.slow
def test_full_scenario():
    """전체 시나리오 테스트 (느림)"""
    pass
```

## 🔧 픽스처 사용

### 기본 제공 픽스처
- `client`: FastAPI 테스트 클라이언트
- `db_session`: 테스트용 DB 세션
- `auth_headers`: 인증된 요청 헤더
- `sample_product_data`: 샘플 제품 데이터
- `sample_transaction_data`: 샘플 거래 데이터

### 사용 예제
```python
def test_create_product(client, auth_headers, sample_product_data):
    response = client.post(
        "/api/v1/products",
        json=sample_product_data,
        headers=auth_headers
    )
    assert response.status_code == 201
```

## ⚠️ 주의사항

### 절대 하지 말아야 할 것
1. ❌ **실제 DB 사용 금지**: 항상 테스트 DB 사용
2. ❌ **외부 API 직접 호출 금지**: Mock 사용
3. ❌ **테스트 간 의존성 생성 금지**: 각 테스트는 독립적이어야 함
4. ❌ **루트 디렉토리에 테스트 파일 생성 금지**

### 반드시 해야 할 것
1. ✅ **적절한 디렉토리에 테스트 작성**
2. ✅ **명확한 테스트 이름 사용**
3. ✅ **테스트 문서화 (docstring)**
4. ✅ **AAA 패턴 준수**
5. ✅ **적절한 마커 사용**

## 🎯 커버리지 목표

| 구분 | 현재 | 목표 | 우선순위 |
|-----|------|------|---------|
| 전체 | 35% | 70% | - |
| 핵심 서비스 | 40% | 90% | 🔴 높음 |
| API 엔드포인트 | 30% | 80% | 🟡 중간 |
| 유틸리티 | 20% | 60% | 🟢 낮음 |

## 📝 체크리스트

### 새 기능 개발 시
- [ ] 단위 테스트 작성
- [ ] 통합 테스트 작성
- [ ] 커버리지 70% 이상 확인
- [ ] CI 통과 확인

### PR 제출 전
- [ ] 모든 테스트 통과
- [ ] 커버리지 감소하지 않음
- [ ] 테스트 문서화 완료
- [ ] 적절한 디렉토리에 배치

## 🔗 참고 자료

- [Pytest 공식 문서](https://docs.pytest.org/)
- [FastAPI 테스트 가이드](https://fastapi.tiangolo.com/tutorial/testing/)
- [테스트 주도 개발 (TDD)](https://en.wikipedia.org/wiki/Test-driven_development)

---

_Last Updated: 2025-09-25_
_테스트 구조 v2.0_