"""
Email Service for sending notifications
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import List, Optional
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """이메일 발송 서비스"""

    def __init__(self):
        # SMTP 설정을 config에서 가져옴
        self.smtp_host = settings.EMAIL_HOST
        self.smtp_port = settings.EMAIL_PORT
        self.sender_email = settings.EMAIL_FROM
        self.sender_password = settings.EMAIL_PASSWORD
        self.sender_name = settings.EMAIL_FROM_NAME
        self.use_tls = settings.EMAIL_USE_TLS
        self.enabled = settings.EMAIL_ENABLED

        logger.info("="*60)
        logger.info("[EMAIL SERVICE] 이메일 서비스 초기화")
        logger.info(f"[EMAIL SERVICE] EMAIL_ENABLED: {self.enabled}")
        logger.info(f"[EMAIL SERVICE] EMAIL_HOST: {self.smtp_host}")
        logger.info(f"[EMAIL SERVICE] EMAIL_PORT: {self.smtp_port}")
        logger.info(f"[EMAIL SERVICE] EMAIL_FROM: {self.sender_email}")
        logger.info(f"[EMAIL SERVICE] EMAIL_PASSWORD: {'***설정됨***' if self.sender_password else '설정안됨'}")
        logger.info("="*60)

    def send_notification_email(
        self,
        to_email: str,
        notification_type: str,
        group_name: str,
        test: bool = False
    ) -> bool:
        """알림 이메일 발송"""
        logger.info("="*60)
        logger.info(f"[EMAIL] send_notification_email 호출됨")
        logger.info(f"[EMAIL] to_email: {to_email}")
        logger.info(f"[EMAIL] notification_type: {notification_type}")
        logger.info(f"[EMAIL] group_name: {group_name}")
        logger.info(f"[EMAIL] test: {test}")
        logger.info(f"[EMAIL] EMAIL_ENABLED: {self.enabled}")
        logger.info(f"[EMAIL] EMAIL_HOST: {self.smtp_host}")
        logger.info(f"[EMAIL] EMAIL_FROM: {self.sender_email}")
        logger.info("="*60)

        try:
            # 이메일 제목과 내용 설정
            subject_map = {
                "low_stock_alert": "📦 재고 부족 알림",
                "order_status_change": "📋 발주 상태 변경 알림",
                "daily_report": "📊 일일 보고서",
                "system_error": "⚠️ 시스템 오류 알림"
            }

            subject = subject_map.get(notification_type, "시스템 알림")
            if test:
                subject = f"[테스트] {subject}"

            # HTML 이메일 본문 생성
            html_content = self._create_email_body(
                notification_type,
                group_name,
                test
            )

            # 이메일 메시지 구성
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.sender_name} <{self.sender_email}>"
            msg['To'] = to_email

            # HTML 파트 추가
            html_part = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(html_part)

            # 이메일 발송이 비활성화된 경우 콘솔 출력만
            if not self.enabled:
                logger.info(f"[EMAIL DISABLED] 이메일 발송이 비활성화 상태입니다.")
                logger.info(f"[EMAIL PREVIEW] To: {to_email}")
                logger.info(f"[EMAIL PREVIEW] Subject: {subject}")
                logger.info(f"[EMAIL PREVIEW] From: {self.sender_email}")
                if test:
                    logger.info("[EMAIL PREVIEW] Type: 테스트 알림")
                logger.info(f"[EMAIL PREVIEW] 이메일을 활성화하려면 .env 파일에서 EMAIL_ENABLED=True로 설정하세요.")
                return True

            logger.info(f"[EMAIL] 이메일 발송이 활성화됨. 실제 발송 시도 시작...")

            # 실제 이메일 발송
            try:
                # 비밀번호가 설정되지 않은 경우 경고
                if not self.sender_password:
                    logger.warning("이메일 비밀번호가 설정되지 않았습니다. .env 파일에서 EMAIL_PASSWORD를 설정하세요.")
                    logger.info(f"[EMAIL NOT SENT] To: {to_email}, Subject: {subject}")
                    return False

                # SMTP 서버로 실제 발송
                logger.info(f"[EMAIL] SMTP 서버 연결 시도: {self.smtp_host}:{self.smtp_port}")

                with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                    logger.info(f"[EMAIL] SMTP 서버 연결 성공")

                    if self.use_tls:
                        logger.info(f"[EMAIL] TLS 시작...")
                        server.starttls()
                        logger.info(f"[EMAIL] TLS 연결 완료")

                    logger.info(f"[EMAIL] 로그인 시도: {self.sender_email}")
                    server.login(self.sender_email, self.sender_password)
                    logger.info(f"[EMAIL] 로그인 성공")

                    logger.info(f"[EMAIL] 메시지 전송 시작...")
                    server.send_message(msg)
                    logger.info(f"[EMAIL] 메시지 전송 완료")

                logger.info(f"[EMAIL SENT] 이메일이 성공적으로 발송되었습니다: {to_email}")
                return True

            except smtplib.SMTPAuthenticationError:
                logger.error(f"이메일 인증 실패. Gmail 앱 비밀번호를 확인하세요.")
                return False
            except smtplib.SMTPException as e:
                logger.error(f"SMTP 오류: {e}")
                return False

        except Exception as e:
            logger.error(f"이메일 발송 실패: {e}")
            return False

    def _create_email_body(
        self,
        notification_type: str,
        group_name: str,
        test: bool = False
    ) -> str:
        """이메일 본문 HTML 생성"""

        current_time = datetime.now().strftime("%Y년 %m월 %d일 %H시 %M분")

        content_map = {
            "low_stock_alert": {
                "title": "재고 부족 알림",
                "icon": "📦",
                "message": "다음 제품들의 재고가 최소 수준 이하로 떨어졌습니다.",
                "details": """
                    <ul style="list-style-type: none; padding-left: 0;">
                        <li>• 오메가3 소프트젤: 현재 재고 10개 (최소 재고: 50개)</li>
                        <li>• 비타민C 1000mg: 현재 재고 25개 (최소 재고: 100개)</li>
                        <li>• 칼슘 마그네슘 비타민D: 현재 재고 5개 (최소 재고: 30개)</li>
                    </ul>
                """
            },
            "order_status_change": {
                "title": "발주 상태 변경",
                "icon": "📋",
                "message": "발주 상태가 변경되었습니다.",
                "details": """
                    <ul style="list-style-type: none; padding-left: 0;">
                        <li>• 발주 번호: PO-2025-001</li>
                        <li>• 상태 변경: 대기중 → 승인됨</li>
                        <li>• 예상 입고일: 2025년 9월 25일</li>
                    </ul>
                """
            },
            "daily_report": {
                "title": "일일 보고서",
                "icon": "📊",
                "message": f"{current_time} 기준 일일 재고 및 거래 보고서입니다.",
                "details": """
                    <ul style="list-style-type: none; padding-left: 0;">
                        <li>• 오늘 입고: 0건</li>
                        <li>• 오늘 출고: 0건</li>
                        <li>• 재고 조정: 1건</li>
                        <li>• 총 재고 가치: ₩169,522,211</li>
                    </ul>
                """
            },
            "system_error": {
                "title": "시스템 오류",
                "icon": "⚠️",
                "message": "시스템에서 오류가 감지되었습니다.",
                "details": """
                    <ul style="list-style-type: none; padding-left: 0;">
                        <li>• 오류 유형: 데이터베이스 연결 실패</li>
                        <li>• 발생 시간: {current_time}</li>
                        <li>• 조치 사항: 자동 복구 시도 중</li>
                    </ul>
                """
            }
        }

        content = content_map.get(notification_type, {
            "title": "시스템 알림",
            "icon": "📧",
            "message": "새로운 알림이 있습니다.",
            "details": ""
        })

        test_banner = ""
        if test:
            test_banner = """
                <div style="background-color: #FEF3C7; border: 2px solid #F59E0B; padding: 10px; margin-bottom: 20px; border-radius: 5px;">
                    <strong style="color: #D97706;">⚠️ 테스트 알림</strong><br>
                    <span style="color: #92400E;">이것은 테스트 알림입니다. 실제 상황이 아닙니다.</span>
                </div>
            """

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    border-radius: 10px 10px 0 0;
                    text-align: center;
                }}
                .content {{
                    background: white;
                    padding: 30px;
                    border: 1px solid #e0e0e0;
                    border-radius: 0 0 10px 10px;
                }}
                .footer {{
                    text-align: center;
                    padding: 20px;
                    color: #666;
                    font-size: 12px;
                }}
                .button {{
                    display: inline-block;
                    padding: 12px 30px;
                    background-color: #667eea;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    margin-top: 20px;
                }}
            </style>
        </head>
        <body>
            {test_banner}
            <div class="header">
                <h1 style="margin: 0; font-size: 36px;">{content['icon']}</h1>
                <h2 style="margin: 10px 0 0 0;">{content['title']}</h2>
            </div>
            <div class="content">
                <p><strong>수신 그룹:</strong> {group_name}</p>
                <p><strong>발송 시간:</strong> {current_time}</p>
                <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;">
                <p>{content['message']}</p>
                {content['details']}
                <div style="text-align: center; margin-top: 30px;">
                    <a href="http://localhost:3001" class="button">시스템으로 이동</a>
                </div>
            </div>
            <div class="footer">
                <p>이 이메일은 PLAYAUTO 재고 관리 시스템에서 자동으로 발송되었습니다.</p>
                <p>문의사항이 있으시면 관리자에게 연락해주세요.</p>
                <p>© 2025 BIOCOM. All rights reserved.</p>
            </div>
        </body>
        </html>
        """

        return html


# 싱글톤 인스턴스
email_service = EmailService()