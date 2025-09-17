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


# FastAPI 앱 생성
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="PLAYAUTO 재고 관리 시스템 Backend API",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(api_router, prefix="/api/v1")


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