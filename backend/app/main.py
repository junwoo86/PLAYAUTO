"""
FastAPI Main Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.database import init_database, create_tables, test_connection
from app.core.scheduler import scheduler_instance
from app.core.exceptions import register_exception_handlers
from app.api.v1 import api_router

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting up PLAYAUTO Backend API...")
    
    # 데이터베이스 연결 테스트
    if test_connection():
        logger.info("Database connection successful")
        
        # 데이터베이스 초기화
        try:
            init_database()
            create_tables()
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            raise
    else:
        logger.error("Database connection failed")
        raise Exception("Cannot connect to database")
    
    # 스케줄러 시작
    try:
        scheduler_instance.start()
        logger.info("Scheduler started successfully")
    except Exception as e:
        logger.error(f"Scheduler startup failed: {e}")
        # 스케줄러 실패는 치명적이지 않으므로 계속 진행
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    
    # 스케줄러 중지
    try:
        scheduler_instance.stop()
        logger.info("Scheduler stopped successfully")
    except Exception as e:
        logger.error(f"Error stopping scheduler: {e}")


# API 태그 정의
tags_metadata = [
    {"name": "products", "description": "제품 관리 API"},
    {"name": "transactions", "description": "재고 트랜잭션 관리"},
    {"name": "statistics", "description": "통계 및 분석"},
    {"name": "daily-ledger", "description": "일일 수불부"},
    {"name": "batch", "description": "일괄 처리"},
    {"name": "purchase-orders", "description": "발주 관리"},
    {"name": "warehouses", "description": "창고 관리"},
    {"name": "scheduler", "description": "스케줄러 관리"},
    {"name": "inventory", "description": "재고 분석"},
    {"name": "sales", "description": "매출 분석"},
    {"name": "product-bom", "description": "제품 BOM 관리"},
    {"name": "stock-checkpoints", "description": "재고 체크포인트"},
    {"name": "disposal-report", "description": "폐기 손실 리포트"},
    {"name": "auth", "description": "인증 및 권한"},
    {"name": "users", "description": "사용자 관리"},
    {"name": "groups", "description": "그룹 및 권한"},
    {"name": "notifications", "description": "알림 설정"},
]

# FastAPI 앱 생성
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    ## PLAYAUTO 재고 관리 시스템 Backend API

    멀티채널 전자상거래를 위한 통합 재고 관리 시스템 API

    ### 주요 기능:
    * 📦 **재고 관리** - 실시간 재고 추적 및 관리
    * 🛒 **발주 관리** - 자동 발주 제안 및 처리
    * 📊 **통계 분석** - 재고 및 매출 분석
    * 📋 **일일 수불부** - 자동 수불부 생성
    * 🔐 **인증 시스템** - JWT 기반 보안 인증

    ### API 문서:
    * **Swagger UI**: [/docs](/docs)
    * **ReDoc**: [/redoc](/redoc)
    * **OpenAPI Schema**: [/openapi.json](/openapi.json)
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    openapi_tags=tags_metadata,
    lifespan=lifespan
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 임시로 모든 origin 허용 (테스트용)
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# API 라우터 등록
app.include_router(api_router, prefix="/api/v1")

# 통합 에러 핸들러 등록
register_exception_handlers(app)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to PLAYAUTO Backend API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    # 데이터베이스 연결 확인
    db_status = test_connection()
    
    return {
        "status": "healthy" if db_status else "unhealthy",
        "database": "connected" if db_status else "disconnected",
        "version": settings.APP_VERSION
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )