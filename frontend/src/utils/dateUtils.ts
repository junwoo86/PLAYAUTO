/**
 * 날짜 및 시간 처리 유틸리티
 * 한국 시간대(KST)와 UTC 간의 변환을 처리
 */

/**
 * 로컬 날짜를 YYYY-MM-DD 형식의 문자열로 반환
 * toISOString()과 달리 로컬 시간대를 사용
 */
export const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 로컬 날짜와 시간을 ISO 형식의 문자열로 반환
 * 백엔드로 전송할 때 사용
 */
export const getLocalDateTimeString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  // 한국 시간대 오프셋 추가 (+09:00)
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
};

/**
 * UTC 시간 문자열을 로컬 Date 객체로 변환
 * 백엔드에서 받은 데이터를 표시할 때 사용
 */
export const parseUTCToLocal = (utcString: string): Date => {
  if (!utcString) return new Date();

  // Z로 끝나거나 타임존 정보가 없는 경우 UTC로 간주
  if (utcString.endsWith('Z') || (!utcString.includes('+') && !utcString.includes('-') && utcString.includes('T'))) {
    // UTC 시간을 Date 객체로 파싱
    const date = new Date(utcString);
    return date;
  }

  // 이미 타임존 정보가 있는 경우 그대로 파싱
  return new Date(utcString);
};

/**
 * Date 객체를 한국어 형식으로 포맷팅
 * 예: 2025년 9월 15일 오전 1시 30분
 */
export const formatKoreanDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

/**
 * Date 객체를 짧은 한국어 형식으로 포맷팅
 * 예: 2025-09-15 01:30:45
 */
export const formatKoreanDateTimeShort = (date: Date): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
};

/**
 * 날짜만 한국어 형식으로 포맷팅
 * 예: 2025년 9월 15일
 */
export const formatKoreanDate = (date: Date): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

/**
 * 상대 시간 표시 (예: 3분 전, 2시간 전, 어제)
 */
export const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;

  return formatKoreanDateTimeShort(date);
};

/**
 * 오늘 날짜인지 확인
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

/**
 * 날짜 범위 필터링을 위한 헬퍼 함수
 */
export const getDateRangeFilter = (period: string) => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  switch (period) {
    case 'today':
      return { start: todayStart, end: todayEnd };
    case 'week':
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start: weekAgo, end: now };
    case 'month':
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { start: monthAgo, end: now };
    default:
      return null;
  }
};