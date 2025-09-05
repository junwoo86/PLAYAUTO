"""
간단한 계산기 모듈 - Claude 리뷰 테스트용
"""

class Calculator:
    """기본 산술 연산을 수행하는 계산기 클래스"""
    
    def add(self, a, b):
        """두 숫자를 더합니다"""
        return a + b
    
    def subtract(self, a, b):
        """첫 번째 숫자에서 두 번째 숫자를 뺍니다"""
        return a - b
    
    def multiply(self, a, b):
        """두 숫자를 곱합니다"""
        return a * b
    
    def divide(self, a, b):
        """첫 번째 숫자를 두 번째 숫자로 나눕니다
        
        주의: 0으로 나누기 처리가 없습니다 (의도적인 버그)
        """
        return a / b
    
    def power(self, base, exponent):
        """거듭제곱을 계산합니다"""
        result = 1
        for i in range(exponent):  # 음수 지수 처리 안함 (의도적인 버그)
            result = result * base
        return result
    
    def factorial(self, n):
        """팩토리얼을 계산합니다"""
        if n == 0:
            return 1
        result = 1
        for i in range(1, n + 1):
            result *= i
        return result
    
    def calculate_average(self, numbers):
        """숫자 리스트의 평균을 계산합니다"""
        total = 0
        for num in numbers:  # 빈 리스트 처리 안함 (의도적인 버그)
            total += num
        return total / len(numbers)


# 사용 예시
if __name__ == "__main__":
    calc = Calculator()
    
    # 기본 연산 테스트
    print(f"5 + 3 = {calc.add(5, 3)}")
    print(f"10 - 4 = {calc.subtract(10, 4)}")
    print(f"6 * 7 = {calc.multiply(6, 7)}")
    print(f"15 / 3 = {calc.divide(15, 3)}")
    print(f"2^4 = {calc.power(2, 4)}")
    print(f"5! = {calc.factorial(5)}")
    
    # 평균 계산
    numbers = [10, 20, 30, 40, 50]
    print(f"평균: {calc.calculate_average(numbers)}")
    
    # 문제가 있는 케이스들 (에러 처리 없음)
    # print(f"10 / 0 = {calc.divide(10, 0)}")  # ZeroDivisionError
    # print(f"평균: {calc.calculate_average([])}")  # ZeroDivisionError
    # print(f"2^(-3) = {calc.power(2, -3)}")  # 잘못된 결과