from __future__ import annotations

import json

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response

from app.services.technical_document_service import technical_document_service
from app.technical_document_models import TechnicalDocumentCreateRequest, TechnicalDocumentUpdateRequest

router = APIRouter(prefix="/api/technical-documents", tags=["Technical Documents"])


@router.get("")
def list_documents(
    q: str | None = Query(default=None),
    repoUrl: str | None = Query(default=None),
    tag: str | None = Query(default=None),
):
    return technical_document_service.list_documents(query=q, repo_url=repoUrl, tag=tag)


@router.post("")
def create_document(request: TechnicalDocumentCreateRequest):
    try:
        return technical_document_service.create_from_analysis(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/from-analysis")
def create_document_from_analysis(payload: dict):
    try:
        return technical_document_service.create_from_analysis_payload(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    repoUrl: str | None = Form(default=None),
    tags: str | None = Form(default=None),
):
    try:
        payload_tags = [tag.strip() for tag in tags.split(",")] if tags else []
        file_bytes = await file.read()
        return technical_document_service.upload_document(
            filename=file.filename,
            file_bytes=file_bytes,
            title=title,
            repo_url=repoUrl,
            tags=payload_tags,
        )
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Uploaded JSON is invalid.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/{document_id}")
def get_document(document_id: str):
    try:
        return technical_document_service.get_document(document_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")


@router.get("/{document_id}/html")
def get_document_html(document_id: str):
    try:
        html = technical_document_service.get_html(document_id)
        return Response(content=html, media_type="text/html; charset=utf-8")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/{document_id}/download-html")
def download_document_html(document_id: str):
    try:
        html = technical_document_service.get_html(document_id)
        return Response(
            content=html,
            media_type="text/html; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{document_id}.html"'},
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.get("/{document_id}/download")
def download_document(document_id: str):
    try:
        pdf_bytes = technical_document_service.get_pdf(document_id)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{document_id}.pdf"'},
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/{document_id}")
def update_document(document_id: str, request: TechnicalDocumentUpdateRequest):
    try:
        return technical_document_service.update_document(document_id, request)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{document_id}")
def delete_document(document_id: str):
    try:
        technical_document_service.delete_document(document_id)
        return {"message": "Document deleted successfully"}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")


@router.get("/{document_id}/versions")
def list_versions(document_id: str):
    try:
        return {"items": [version.model_dump() for version in technical_document_service.list_versions(document_id)]}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")


@router.get("/{document_id}/audit")
def list_audit(document_id: str):
    try:
        return {"items": technical_document_service.list_audit(document_id)}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")

