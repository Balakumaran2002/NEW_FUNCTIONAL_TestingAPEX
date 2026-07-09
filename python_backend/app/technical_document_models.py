from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class TechnicalDocumentCreateRequest(BaseModel):
    repoUrl: Optional[str] = None
    title: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class TechnicalDocumentUpdateRequest(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    htmlContent: Optional[str] = None
    reportData: Optional[Dict[str, Any]] = None


class TechnicalDocumentVersionInfo(BaseModel):
    version: int
    createdAt: str
    action: str
    summary: str = ""


class TechnicalDocumentListItem(BaseModel):
    id: str
    title: str
    repoUrl: Optional[str] = None
    repoName: Optional[str] = None
    status: str = "draft"
    version: int = 1
    tags: List[str] = Field(default_factory=list)
    sourceType: str = "analysis"
    renderMode: str = "template"
    createdAt: str
    updatedAt: str
    summary: str = ""


class TechnicalDocumentDetail(TechnicalDocumentListItem):
    htmlUrl: str
    pdfUrl: str
    versionsUrl: str
    auditUrl: str
    versionHistory: List[TechnicalDocumentVersionInfo] = Field(default_factory=list)
    generatedAt: Optional[str] = None
    author: Optional[str] = None


class TechnicalDocumentListResponse(BaseModel):
    items: List[TechnicalDocumentListItem] = Field(default_factory=list)
    total: int = 0
    query: Optional[str] = None

