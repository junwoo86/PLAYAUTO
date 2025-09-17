"""
시간대 처리 유틸리티
한국 시간대(KST)와 UTC 간 변환을 처리
"""
from datetime import datetime, timezone
from typing import Optional

# UTC 시간대
UTC = timezone.utc

def get_current_utc_time() -> datetime:
    """현재 UTC 시간을 반환"""
    return datetime.now(UTC)

def get_current_kst_time() -> datetime:
    """현재 한국 시간(KST)을 반환 - 실제로는 UTC로 저장"""
    # 데이터베이스는 UTC로 저장하므로 UTC 시간을 반환
    # 프론트엔드에서 표시할 때 로컬 시간대로 변환
    return datetime.now(UTC)

def ensure_timezone_aware(dt: Optional[datetime]) -> datetime:
    """
    datetime 객체가 timezone-aware인지 확인하고,
    naive한 경우 UTC로 설정
    """
    if dt is None:
        return get_current_utc_time()
    
    if dt.tzinfo is None:
        # naive datetime을 UTC로 설정
        return dt.replace(tzinfo=UTC)
    
    return dt

def parse_datetime_string(date_str: Optional[str]) -> datetime:
    """
    문자열을 datetime 객체로 변환
    ISO 8601 형식 지원
    """
    if not date_str:
        return get_current_utc_time()
    
    try:
        # ISO 8601 형식 처리
        if 'T' in date_str:
            # Z가 있으면 제거하고 UTC로 처리
            if date_str.endswith('Z'):
                dt = datetime.fromisoformat(date_str[:-1])
                return dt.replace(tzinfo=UTC)
            # +09:00 같은 타임존 정보가 있는 경우
            elif '+' in date_str or date_str.count(':') >= 3:
                return datetime.fromisoformat(date_str)
            else:
                # 타임존 정보가 없는 경우 UTC로 가정
                dt = datetime.fromisoformat(date_str)
                return dt.replace(tzinfo=UTC)
        else:
            # 날짜만 있는 경우 00:00:00 UTC로 설정
            dt = datetime.fromisoformat(date_str + 'T00:00:00')
            return dt.replace(tzinfo=UTC)
    except:
        return get_current_utc_time()