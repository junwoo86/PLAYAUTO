"""
Common Pydantic schemas
"""
from typing import Optional, Any, List, Generic, TypeVar
from pydantic import BaseModel, Field
from datetime import datetime

DataT = TypeVar('DataT')


class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = Field(default=1, ge=1, description="Page number")
    limit: int = Field(default=20, ge=1, le=100, description="Items per page")
    search: Optional[str] = Field(default=None, description="Search query")
    sort: Optional[str] = Field(default=None, description="Sort field")
    order: Optional[str] = Field(default="asc", pattern="^(asc|desc)$")


class PaginationResponse(BaseModel):
    """Pagination metadata"""
    page: int
    limit: int
    total: int
    total_pages: int


class BaseResponse(BaseModel, Generic[DataT]):
    """Base API response"""
    success: bool = True
    data: DataT
    message: str = "Success"
    errors: List[str] = []


class PaginatedResponse(BaseResponse[DataT]):
    """Paginated API response"""
    pagination: PaginationResponse


class MessageResponse(BaseModel):
    """Simple message response"""
    success: bool = True
    message: str
    

class ErrorResponse(BaseModel):
    """Error response"""
    success: bool = False
    message: str
    errors: List[str] = []
    

class TimestampMixin(BaseModel):
    """Mixin for timestamp fields"""
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True