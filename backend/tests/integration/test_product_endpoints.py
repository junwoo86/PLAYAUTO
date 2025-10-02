"""
Product API 엔드포인트 통합 테스트
실제 API 호출 및 응답 검증
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.mark.integration
@pytest.mark.api
class TestProductEndpoints:
    """제품 API 엔드포인트 통합 테스트"""

    def test_should_create_product_with_valid_data(
        self, client: TestClient, auth_headers: dict
    ):
        """유효한 데이터로 제품을 생성해야 한다"""
        # Arrange
        product_data = {
            "code": "NEW001",
            "name": "새 제품",
            "category": "원재료",
            "quantity": 100,
            "unit": "kg",
            "price": 15000,
            "description": "테스트 제품"
        }

        # Act
        response = client.post(
            "/api/v1/products",
            json=product_data,
            headers=auth_headers
        )

        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["code"] == product_data["code"]
        assert data["name"] == product_data["name"]
        assert data["quantity"] == product_data["quantity"]

    def test_should_get_all_products(
        self, client: TestClient, auth_headers: dict
    ):
        """모든 제품 목록을 조회해야 한다"""
        # Act
        response = client.get(
            "/api/v1/products",
            headers=auth_headers
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_should_get_product_by_code(
        self, client: TestClient, auth_headers: dict
    ):
        """제품 코드로 특정 제품을 조회해야 한다"""
        # Arrange - 먼저 제품 생성
        product_data = {
            "code": "SEARCH001",
            "name": "검색용 제품",
            "category": "제품",
            "quantity": 50,
            "unit": "개",
            "price": 20000
        }
        client.post("/api/v1/products", json=product_data, headers=auth_headers)

        # Act
        response = client.get(
            f"/api/v1/products/{product_data['code']}",
            headers=auth_headers
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == product_data["code"]
        assert data["name"] == product_data["name"]

    def test_should_update_product_quantity(
        self, client: TestClient, auth_headers: dict
    ):
        """제품 수량을 업데이트해야 한다"""
        # Arrange - 제품 생성
        product_data = {
            "code": "UPDATE001",
            "name": "업데이트용 제품",
            "category": "제품",
            "quantity": 100,
            "unit": "개",
            "price": 10000
        }
        client.post("/api/v1/products", json=product_data, headers=auth_headers)

        # Act
        update_data = {"quantity": 200}
        response = client.patch(
            f"/api/v1/products/{product_data['code']}",
            json=update_data,
            headers=auth_headers
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["quantity"] == 200

    def test_should_delete_product(
        self, client: TestClient, auth_headers: dict
    ):
        """제품을 삭제해야 한다"""
        # Arrange - 제품 생성
        product_data = {
            "code": "DELETE001",
            "name": "삭제용 제품",
            "category": "제품",
            "quantity": 10,
            "unit": "개",
            "price": 5000
        }
        client.post("/api/v1/products", json=product_data, headers=auth_headers)

        # Act
        response = client.delete(
            f"/api/v1/products/{product_data['code']}",
            headers=auth_headers
        )

        # Assert
        assert response.status_code == 204

        # 삭제 확인
        get_response = client.get(
            f"/api/v1/products/{product_data['code']}",
            headers=auth_headers
        )
        assert get_response.status_code == 404

    def test_should_filter_products_by_category(
        self, client: TestClient, auth_headers: dict
    ):
        """카테고리로 제품을 필터링해야 한다"""
        # Arrange - 여러 제품 생성
        products = [
            {"code": "CAT001", "name": "원재료1", "category": "원재료", "quantity": 10, "unit": "kg", "price": 1000},
            {"code": "CAT002", "name": "제품1", "category": "제품", "quantity": 20, "unit": "개", "price": 2000},
            {"code": "CAT003", "name": "원재료2", "category": "원재료", "quantity": 30, "unit": "kg", "price": 3000}
        ]
        for product in products:
            client.post("/api/v1/products", json=product, headers=auth_headers)

        # Act
        response = client.get(
            "/api/v1/products?category=원재료",
            headers=auth_headers
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert len([p for p in data if p["category"] == "원재료"]) >= 2

    def test_should_reject_duplicate_product_code(
        self, client: TestClient, auth_headers: dict
    ):
        """중복된 제품 코드를 거부해야 한다"""
        # Arrange
        product_data = {
            "code": "DUP001",
            "name": "중복 테스트 제품",
            "category": "제품",
            "quantity": 100,
            "unit": "개",
            "price": 10000
        }
        # 첫 번째 생성
        client.post("/api/v1/products", json=product_data, headers=auth_headers)

        # Act - 같은 코드로 다시 생성 시도
        response = client.post(
            "/api/v1/products",
            json=product_data,
            headers=auth_headers
        )

        # Assert
        assert response.status_code == 400
        assert "이미 존재하는 제품 코드" in response.json()["detail"]

    def test_should_validate_product_data(
        self, client: TestClient, auth_headers: dict
    ):
        """잘못된 제품 데이터를 검증해야 한다"""
        # Arrange
        invalid_product_data = {
            "code": "",  # 빈 코드
            "name": "테스트",
            "category": "잘못된카테고리",  # 허용되지 않는 카테고리
            "quantity": -10,  # 음수 수량
            "unit": "kg",
            "price": -5000  # 음수 가격
        }

        # Act
        response = client.post(
            "/api/v1/products",
            json=invalid_product_data,
            headers=auth_headers
        )

        # Assert
        assert response.status_code == 422

    def test_should_require_authentication(
        self, client: TestClient
    ):
        """인증 없이 접근 시 거부해야 한다"""
        # Act
        response = client.get("/api/v1/products")

        # Assert
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]

    def test_should_handle_pagination(
        self, client: TestClient, auth_headers: dict
    ):
        """페이지네이션을 처리해야 한다"""
        # Arrange - 여러 제품 생성
        for i in range(25):
            product_data = {
                "code": f"PAGE{i:03d}",
                "name": f"페이지 테스트 제품 {i}",
                "category": "제품",
                "quantity": 10,
                "unit": "개",
                "price": 1000
            }
            client.post("/api/v1/products", json=product_data, headers=auth_headers)

        # Act
        response = client.get(
            "/api/v1/products?skip=10&limit=5",
            headers=auth_headers
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 5