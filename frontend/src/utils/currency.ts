/**
 * 통화 관련 유틸리티 함수들
 */

export type Currency = 'KRW' | 'USD';

/**
 * 가격을 통화에 맞게 포맷팅
 * @param value - 숫자 값
 * @param currency - 통화 단위 (KRW, USD)
 * @returns 포맷팅된 문자열
 */
export function formatPrice(value: number | string, currency: Currency = 'KRW'): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return currency === 'KRW' ? '₩0' : '$0.00';
  }

  switch (currency) {
    case 'KRW':
      // 원화: 소수점 제거, 천 단위 구분
      return `₩${Math.round(numValue).toLocaleString('ko-KR')}`;
    
    case 'USD':
      // 달러: 소수점 2자리, 천 단위 구분
      return `$${numValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    
    default:
      return `${numValue}`;
  }
}

/**
 * 포맷팅된 가격 문자열을 숫자로 파싱
 * @param formattedValue - 포맷팅된 가격 문자열
 * @param currency - 통화 단위
 * @returns 숫자 값
 */
export function parsePrice(formattedValue: string, currency: Currency = 'KRW'): number {
  // 통화 기호와 천 단위 구분자 제거
  const cleanValue = formattedValue
    .replace(/[₩$,]/g, '')
    .trim();
  
  const parsed = parseFloat(cleanValue);
  
  if (isNaN(parsed)) {
    return 0;
  }
  
  // KRW는 정수로, USD는 소수점 2자리까지
  return currency === 'KRW' ? Math.round(parsed) : Math.round(parsed * 100) / 100;
}

/**
 * 통화 기호 반환
 * @param currency - 통화 단위
 * @returns 통화 기호
 */
export function getCurrencySymbol(currency: Currency): string {
  switch (currency) {
    case 'KRW':
      return '₩';
    case 'USD':
      return '$';
    default:
      return '';
  }
}

/**
 * 입력값을 통화에 맞게 검증 및 포맷팅
 * @param value - 입력값
 * @param currency - 통화 단위
 * @returns 검증된 숫자값
 */
export function validatePriceInput(value: string, currency: Currency): string {
  // 숫자와 소수점만 허용
  let cleaned = value.replace(/[^0-9.]/g, '');
  
  if (currency === 'KRW') {
    // KRW는 정수만 허용
    cleaned = cleaned.replace(/\./g, '');
    return cleaned;
  } else if (currency === 'USD') {
    // USD는 소수점 2자리까지만 허용
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      // 소수점이 여러 개인 경우 첫 번째만 유지
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts.length === 2 && parts[1].length > 2) {
      // 소수점 이하 2자리까지만
      cleaned = parts[0] + '.' + parts[1].substring(0, 2);
    }
    return cleaned;
  }
  
  return cleaned;
}

/**
 * 통화 선택 옵션
 */
export const CURRENCY_OPTIONS = [
  { value: 'KRW', label: '원화(₩)' },
  { value: 'USD', label: '달러($)' }
] as const;