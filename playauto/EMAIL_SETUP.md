# Email Alert Setup Guide

## 환경 변수 설정

이메일 알림 기능을 사용하려면 `.env` 파일에 다음 환경 변수를 설정해야 합니다:

```env
# SMTP 서버 설정
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SENDER_EMAIL=your-email@gmail.com
SENDER_PASSWORD=your-app-password
```

## Gmail 설정 방법

1. **2단계 인증 활성화**
   - Google 계정 설정 > 보안으로 이동
   - 2단계 인증 활성화

2. **앱 비밀번호 생성**
   - Google 계정 설정 > 보안 > 2단계 인증
   - 앱 비밀번호 클릭
   - 앱 선택: 메일
   - 기기 선택: 기타 (PLAYAUTO)
   - 생성된 16자리 비밀번호를 `SENDER_PASSWORD`에 입력

## 다른 이메일 서비스 설정

### Naver Mail
```env
SMTP_SERVER=smtp.naver.com
SMTP_PORT=587
SENDER_EMAIL=your-id@naver.com
SENDER_PASSWORD=your-password
```

### Office 365
```env
SMTP_SERVER=smtp.office365.com
SMTP_PORT=587
SENDER_EMAIL=your-email@company.com
SENDER_PASSWORD=your-password
```

## 알림 설정 사용법

1. **알림 관리** 메뉴로 이동
2. **알림 설정** 탭 선택
3. 재고 소진 예상일 기준 설정 (예: 10일)
4. 이메일 알림 체크박스 활성화
5. 이메일 주소 입력
6. **테스트 이메일 발송** 버튼으로 설정 확인
7. **설정 저장** 클릭

## 자동 알림 스케줄링 (추가 구현 필요)

현재는 수동으로 테스트 이메일을 발송하는 기능만 구현되어 있습니다.
자동 알림을 위해서는 다음과 같은 추가 구현이 필요합니다:

1. **스케줄러 설정** (예: APScheduler, Celery)
2. **일일 체크 작업** 구현
3. **알림 이력 데이터베이스** 저장

## 문제 해결

### 이메일이 발송되지 않는 경우
1. 환경 변수가 올바르게 설정되었는지 확인
2. 이메일 계정의 보안 설정 확인 (앱 비밀번호 사용)
3. 방화벽이 SMTP 포트를 차단하지 않는지 확인
4. 이메일 주소 형식이 올바른지 확인

### Gmail "보안 수준이 낮은 앱" 오류
- 2단계 인증과 앱 비밀번호를 사용하면 이 문제가 해결됩니다
- 일반 비밀번호 대신 앱 비밀번호를 사용해야 합니다