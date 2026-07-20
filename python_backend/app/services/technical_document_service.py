from __future__ import annotations

import io
import json
import re
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from jinja2 import Environment, FileSystemLoader
from pydantic import ValidationError
from xhtml2pdf import pisa

from app.brd_models import FullBrdReport
from app.config import app_config
from app.technical_document_models import (
    TechnicalDocumentCreateRequest,
    TechnicalDocumentDetail,
    TechnicalDocumentListItem,
    TechnicalDocumentListResponse,
    TechnicalDocumentUpdateRequest,
    TechnicalDocumentVersionInfo,
)


class TechnicalDocumentService:
    DOCS_DIR = "technical_documents"
    MANIFEST_FILE = "manifest.json"
    CONTENT_FILE = "content.json"
    HTML_FILE = "document.html"
    PDF_FILE = "document.pdf"
    VERSIONS_DIR = "versions"
    AUDIT_FILE = "audit.json"

    def __init__(self):
        self.templates_dir = Path(__file__).parent.parent / "templates"
        self.env = Environment(loader=FileSystemLoader(str(self.templates_dir)))

    def documents_root(self) -> Path:
        root = app_config.workspace_directory / self.DOCS_DIR
        root.mkdir(parents=True, exist_ok=True)
        return root

    def _utc_now(self) -> str:
        return datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    def _slugify(self, value: str) -> str:
        cleaned = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
        return cleaned or "document"

    def _safe_repo_name(self, repo_url: Optional[str]) -> Optional[str]:
        if not repo_url:
            return None
        repo = repo_url.rstrip("/").split("/")[-1]
        return repo[:-4] if repo.endswith(".git") else repo

    def _document_dir(self, document_id: str) -> Path:
        return self.documents_root() / document_id

    def _manifest_path(self, document_id: str) -> Path:
        return self._document_dir(document_id) / self.MANIFEST_FILE

    def _content_path(self, document_id: str) -> Path:
        return self._document_dir(document_id) / self.CONTENT_FILE

    def _html_path(self, document_id: str) -> Path:
        return self._document_dir(document_id) / self.HTML_FILE

    def _pdf_path(self, document_id: str) -> Path:
        return self._document_dir(document_id) / self.PDF_FILE

    def _versions_dir(self, document_id: str) -> Path:
        return self._document_dir(document_id) / self.VERSIONS_DIR

    def _audit_path(self, document_id: str) -> Path:
        return self._document_dir(document_id) / self.AUDIT_FILE

    def _load_json(self, path: Path) -> Dict[str, Any]:
        if not path.exists():
            return {}
        return json.loads(path.read_text(encoding="utf-8"))

    def _write_json(self, path: Path, data: Dict[str, Any]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, indent=2, ensure_ascii=True), encoding="utf-8")

    def _load_audit(self, document_id: str) -> List[Dict[str, Any]]:
        path = self._audit_path(document_id)
        if not path.exists():
            return []
        return json.loads(path.read_text(encoding="utf-8"))

    def _append_audit(self, document_id: str, action: str, details: Optional[Dict[str, Any]] = None) -> None:
        audit = self._load_audit(document_id)
        audit.append({"timestamp": self._utc_now(), "action": action, "details": details or {}})
        self._write_json(self._audit_path(document_id), audit)

    def _load_manifest(self, document_id: str) -> Optional[Dict[str, Any]]:
        path = self._manifest_path(document_id)
        if not path.exists():
            return None
        return self._load_json(path)

    def _load_content(self, document_id: str) -> Dict[str, Any]:
        path = self._content_path(document_id)
        if not path.exists():
            return {}
        return self._load_json(path)

    def _normalize_tags(self, tags: Optional[Iterable[str]]) -> List[str]:
        seen = set()
        normalized: List[str] = []
        for tag in tags or []:
            clean_tag = str(tag).strip()
            if not clean_tag:
                continue
            lowered = clean_tag.lower()
            if lowered in seen:
                continue
            seen.add(lowered)
            normalized.append(clean_tag)
        return normalized

    def _infer_title(self, repo_url: Optional[str], fallback: str = "Technical Document") -> str:
        repo_name = self._safe_repo_name(repo_url)
        if repo_name:
            return f"{repo_name} {fallback}"
        return fallback

    def _load_analysis_cache(self, repo_url: str) -> Optional[Dict[str, Any]]:
        from app.database import SessionLocal
        from app.db_models import Repository, Analysis
        db = SessionLocal()
        try:
            repo = db.query(Repository).filter(Repository.repo_url == repo_url).first()
            if not repo:
                repo = db.query(Repository).filter(Repository.repo_url.contains(repo_url)).first()
            if repo:
                analysis = db.query(Analysis).filter(Analysis.repository_id == repo.id).order_by(Analysis.created_at.desc()).first()
                if analysis and analysis.full_brd_report:
                    return {
                        "repoUrl": repo.repo_url,
                        "fullBrdReport": analysis.full_brd_report
                    }
            return None
        finally:
            db.close()

    def _normalize_report(self, report_data: Dict[str, Any], repo_url: str, title: str) -> Dict[str, Any]:
        try:
            report = FullBrdReport.model_validate(report_data)
        except ValidationError:
            report = FullBrdReport.model_construct(**report_data)

        repo_name = self._safe_repo_name(repo_url) or report.appName or title
        current_date = datetime.now(timezone.utc).strftime("%B %d, %Y")

        report.appName = report.appName or repo_name
        report.repoUrl = report.repoUrl or repo_url
        report.docVersion = report.docVersion or "1.0"
        report.docStatus = report.docStatus or "Draft"
        report.docDate = report.docDate or current_date
        report.orgInitial = report.orgInitial or (repo_name[:1].upper() if repo_name else "T")
        report.orgName = report.orgName or "Technical Document"
        report.primaryLang = report.primaryLang or "Java"
        report.platform = report.platform or "Web"
        report.environment = report.environment or "Workspace"
        report.modernizationContext = report.modernizationContext or "Document generated from repository analysis."
        report.processingModes = report.processingModes or "analysis, export"
        report.totalPrograms = report.totalPrograms or max(len(report.fileGroups), len(report.capabilities), 1)
        report.totalLoc = report.totalLoc or 0
        report.totalOrphanFiles = report.totalOrphanFiles or 0
        report.sourceFiles = report.sourceFiles or [repo_url]
        report.revisionHistory = report.revisionHistory or []

        return report.model_dump()

    def _render_template_html(self, report_data: Dict[str, Any]) -> str:
        template = self.env.get_template("brd_full_template.html")
        return template.render(report_data)

    def _render_pdf(self, html: str) -> bytes:
        pdf_buffer = io.BytesIO()
        pisa_status = pisa.CreatePDF(io.StringIO(html), dest=pdf_buffer)
        if pisa_status.err:
            raise RuntimeError("Error during PDF generation")
        return pdf_buffer.getvalue()

    def _save_version_snapshot(self, document_id: str, manifest: Dict[str, Any], content: Dict[str, Any], action: str) -> None:
        versions_dir = self._versions_dir(document_id)
        versions_dir.mkdir(parents=True, exist_ok=True)
        snapshot = {
            "version": int(manifest.get("version", 1)),
            "manifest": manifest,
            "content": content,
            "audit": self._load_audit(document_id),
        }
        self._write_json(versions_dir / f"v{snapshot['version']}.json", snapshot)
        self._append_audit(document_id, action, {"version": snapshot["version"]})

    def _manifest_to_item(self, manifest: Dict[str, Any]) -> TechnicalDocumentListItem:
        return TechnicalDocumentListItem(**manifest)

    def create_from_analysis(self, request: TechnicalDocumentCreateRequest) -> TechnicalDocumentDetail:
        if not request.repoUrl:
            raise ValueError("repoUrl is required to generate a technical document")

        analysis_data = self._load_analysis_cache(request.repoUrl)
        if not analysis_data:
            raise ValueError("No analysis data found for this repository.")

        raw_report = analysis_data.get("fullBrdReport") or {}
        title = request.title or self._infer_title(request.repoUrl)
        report_data = self._normalize_report(raw_report, request.repoUrl, title)
        repo_name = self._safe_repo_name(request.repoUrl)
        document_id = f"{self._slugify(repo_name or title)}-{uuid.uuid4().hex[:8]}"
        now = self._utc_now()

        manifest = {
            "id": document_id,
            "title": title,
            "repoUrl": request.repoUrl,
            "repoName": repo_name,
            "status": "draft",
            "version": 1,
            "tags": self._normalize_tags(request.tags),
            "sourceType": "analysis",
            "renderMode": "template",
            "createdAt": now,
            "updatedAt": now,
            "summary": report_data.get("modernizationContext", ""),
            "generatedAt": now,
            "author": analysis_data.get("usedProvider") or "analysis-service",
        }

        document_dir = self._document_dir(document_id)
        document_dir.mkdir(parents=True, exist_ok=True)
        self._write_json(self._manifest_path(document_id), manifest)
        self._write_json(self._content_path(document_id), {"reportData": report_data, "sourceAnalysis": analysis_data})

        html = self._render_template_html(report_data)
        self._html_path(document_id).write_text(html, encoding="utf-8")
        self._append_audit(document_id, "created", {"source": "analysis"})

        return self.get_document(document_id)

    def upload_document(
        self,
        filename: str,
        file_bytes: bytes,
        title: Optional[str] = None,
        repo_url: Optional[str] = None,
        tags: Optional[List[str]] = None,
    ) -> TechnicalDocumentDetail:
        suffix = Path(filename).suffix.lower()
        provided_title = title or self._infer_title(repo_url, fallback="Imported Technical Document")
        repo_name = self._safe_repo_name(repo_url)
        document_id = f"{self._slugify(repo_name or provided_title)}-{uuid.uuid4().hex[:8]}"
        now = self._utc_now()
        document_dir = self._document_dir(document_id)
        document_dir.mkdir(parents=True, exist_ok=True)

        manifest = {
            "id": document_id,
            "title": provided_title,
            "repoUrl": repo_url,
            "repoName": repo_name,
            "status": "draft",
            "version": 1,
            "tags": self._normalize_tags(tags),
            "sourceType": "upload",
            "renderMode": "template" if suffix == ".json" else "raw_html",
            "createdAt": now,
            "updatedAt": now,
            "summary": "Imported document",
            "generatedAt": now,
            "author": "upload",
        }

        if suffix == ".json":
            raw_text = file_bytes.decode("utf-8", errors="replace")
            parsed = json.loads(raw_text)
            if not isinstance(parsed, dict):
                raise ValueError("Uploaded JSON must be an object.")
            report_data = parsed.get("reportData") if "reportData" in parsed else parsed
            if not isinstance(report_data, dict):
                raise ValueError("Uploaded JSON must contain a report object.")
            report_data = self._normalize_report(report_data, repo_url or "", provided_title)
            self._write_json(self._content_path(document_id), {"reportData": report_data, "sourceFile": filename})
            html = self._render_template_html(report_data)
            self._html_path(document_id).write_text(html, encoding="utf-8")
        else:
            raw_html = file_bytes.decode("utf-8", errors="replace")
            if suffix not in {".html", ".htm"}:
                raw_html = f"<html><body><pre>{raw_html}</pre></body></html>"
            manifest["renderMode"] = "raw_html"
            self._write_json(self._content_path(document_id), {"rawHtml": raw_html, "sourceFile": filename})
            self._html_path(document_id).write_text(raw_html, encoding="utf-8")
            self._pdf_path(document_id).write_bytes(self._render_pdf(raw_html))
            title_match = re.search(r"<title>(.*?)</title>", raw_html, re.IGNORECASE | re.DOTALL)
            if title_match and not title:
                manifest["title"] = re.sub(r"\s+", " ", title_match.group(1)).strip() or provided_title

        self._write_json(self._manifest_path(document_id), manifest)
        self._append_audit(document_id, "uploaded", {"filename": filename})
        return self.get_document(document_id)

    def list_documents(
        self,
        query: Optional[str] = None,
        repo_url: Optional[str] = None,
        tag: Optional[str] = None,
    ) -> TechnicalDocumentListResponse:
        items: List[TechnicalDocumentListItem] = []
        query_lc = query.lower().strip() if query else None
        tag_lc = tag.lower().strip() if tag else None
        repo_url_lc = repo_url.strip() if repo_url else None

        for manifest_file in self.documents_root().glob(f"*/{self.MANIFEST_FILE}"):
            try:
                manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
                item = self._manifest_to_item(manifest)
                if repo_url_lc and item.repoUrl != repo_url_lc:
                    continue
                if tag_lc and tag_lc not in [t.lower() for t in item.tags]:
                    continue
                if query_lc:
                    haystack = " ".join([item.title, item.repoName or "", item.repoUrl or "", " ".join(item.tags)]).lower()
                    if query_lc not in haystack:
                        continue
                items.append(item)
            except Exception:
                continue

        items.sort(key=lambda item: item.updatedAt, reverse=True)
        return TechnicalDocumentListResponse(items=items, total=len(items), query=query)

    def get_document(self, document_id: str) -> TechnicalDocumentDetail:
        manifest = self._load_manifest(document_id)
        if not manifest:
            raise FileNotFoundError("Document not found")
        item = self._manifest_to_item(manifest)
        return TechnicalDocumentDetail(
            **item.model_dump(),
            htmlUrl=f"/technical-documents/{document_id}/html",
            pdfUrl=f"/technical-documents/{document_id}/download",
            versionsUrl=f"/technical-documents/{document_id}/versions",
            auditUrl=f"/technical-documents/{document_id}/audit",
            versionHistory=self._load_version_history(document_id),
            generatedAt=manifest.get("generatedAt"),
            author=manifest.get("author"),
        )

    def _load_version_history(self, document_id: str) -> List[TechnicalDocumentVersionInfo]:
        versions_dir = self._versions_dir(document_id)
        if not versions_dir.exists():
            return []
        history: List[TechnicalDocumentVersionInfo] = []
        for snapshot_file in sorted(versions_dir.glob("v*.json")):
            try:
                snapshot = json.loads(snapshot_file.read_text(encoding="utf-8"))
                manifest = snapshot.get("manifest", {})
                audit = snapshot.get("audit", [])
                history.append(
                    TechnicalDocumentVersionInfo(
                        version=int(snapshot.get("version", manifest.get("version", 1))),
                        createdAt=manifest.get("updatedAt", manifest.get("createdAt", "")),
                        action=audit[-1].get("action", "snapshot") if audit else "snapshot",
                        summary=manifest.get("summary", ""),
                    )
                )
            except Exception:
                continue
        return history

    def get_html(self, document_id: str) -> str:
        manifest = self._load_manifest(document_id)
        if not manifest:
            raise FileNotFoundError("Document not found")
        content = self._load_content(document_id)
        if manifest.get("renderMode") == "raw_html":
            raw_html = content.get("rawHtml")
            if not raw_html:
                raise ValueError("Stored HTML is missing")
            return raw_html
        report_data = content.get("reportData")
        if not report_data:
            raise ValueError("Stored report data is missing")
        return self._render_template_html(report_data)

    def get_pdf(self, document_id: str) -> bytes:
        pdf_path = self._pdf_path(document_id)
        if pdf_path.exists():
            return pdf_path.read_bytes()
        html = self.get_html(document_id)
        pdf_bytes = self._render_pdf(html)
        pdf_path.write_bytes(pdf_bytes)
        return pdf_bytes

    def update_document(self, document_id: str, request: TechnicalDocumentUpdateRequest) -> TechnicalDocumentDetail:
        manifest = self._load_manifest(document_id)
        if not manifest:
            raise FileNotFoundError("Document not found")

        current_content = self._load_content(document_id)
        self._save_version_snapshot(document_id, manifest, current_content, "snapshot_before_update")

        if request.title is not None:
            manifest["title"] = request.title.strip() or manifest["title"]
        if request.summary is not None:
            manifest["summary"] = request.summary
        if request.status is not None:
            manifest["status"] = request.status.strip() or manifest["status"]
        if request.tags is not None:
            manifest["tags"] = self._normalize_tags(request.tags)
        manifest["version"] = int(manifest.get("version", 1)) + 1
        manifest["updatedAt"] = self._utc_now()

        if request.reportData is not None:
            report_data = self._normalize_report(
                request.reportData,
                manifest.get("repoUrl") or "",
                manifest.get("title") or "Technical Document",
            )
            current_content = {"reportData": report_data}
            manifest["renderMode"] = "template"
            self._write_json(self._content_path(document_id), current_content)
            html = self._render_template_html(report_data)
            self._html_path(document_id).write_text(html, encoding="utf-8")
        elif request.htmlContent is not None:
            current_content = {"rawHtml": request.htmlContent}
            manifest["renderMode"] = "raw_html"
            self._write_json(self._content_path(document_id), current_content)
            self._html_path(document_id).write_text(request.htmlContent, encoding="utf-8")
            self._pdf_path(document_id).write_bytes(self._render_pdf(request.htmlContent))

        self._write_json(self._manifest_path(document_id), manifest)
        self._append_audit(document_id, "updated", {"version": manifest["version"]})
        return self.get_document(document_id)

    def delete_document(self, document_id: str) -> None:
        document_dir = self._document_dir(document_id)
        if not document_dir.exists():
            raise FileNotFoundError("Document not found")
        shutil.rmtree(document_dir)

    def list_versions(self, document_id: str) -> List[TechnicalDocumentVersionInfo]:
        if not self._load_manifest(document_id):
            raise FileNotFoundError("Document not found")
        return self._load_version_history(document_id)

    def list_audit(self, document_id: str) -> List[Dict[str, Any]]:
        if not self._load_manifest(document_id):
            raise FileNotFoundError("Document not found")
        return self._load_audit(document_id)


    def create_from_analysis_payload(
        self,
        payload: Dict[str, Any],
        title: Optional[str] = None,
        tags: Optional[Iterable[str]] = None,
    ) -> TechnicalDocumentDetail:
        report_payload = payload.get("fullBrdReport") or {}
        if not report_payload:
            raise ValueError("fullBrdReport is required to generate a technical document")

        repo_url = payload.get("repoUrl") or payload.get("localPath") or ""
        provided_title = title or report_payload.get("appName") or payload.get("projectType") or "Technical Document"
        report_data = self._normalize_report(report_payload, repo_url, provided_title)
        repo_name = self._safe_repo_name(repo_url)
        document_id = f"{self._slugify(repo_name or provided_title)}-{uuid.uuid4().hex[:8]}"
        now = self._utc_now()

        manifest = {
            "id": document_id,
            "title": provided_title,
            "repoUrl": repo_url or None,
            "repoName": repo_name,
            "status": "draft",
            "version": 1,
            "tags": self._normalize_tags(tags),
            "sourceType": "analysis",
            "renderMode": "template",
            "createdAt": now,
            "updatedAt": now,
            "summary": report_data.get("modernizationContext", ""),
            "generatedAt": now,
            "author": payload.get("usedProvider") or "analysis-service",
        }

        document_dir = self._document_dir(document_id)
        document_dir.mkdir(parents=True, exist_ok=True)
        self._write_json(self._manifest_path(document_id), manifest)
        self._write_json(self._content_path(document_id), {"reportData": report_data, "sourceAnalysis": payload})

        html = self._render_template_html(report_data)
        self._html_path(document_id).write_text(html, encoding="utf-8")
        self._append_audit(document_id, "created", {"source": "analysis_payload"})

        return self.get_document(document_id)

technical_document_service = TechnicalDocumentService()


