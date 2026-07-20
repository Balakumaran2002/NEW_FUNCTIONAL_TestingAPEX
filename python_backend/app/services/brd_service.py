import os
import io
import json
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from xhtml2pdf import pisa
from app.config import app_config

class BrdService:
    def __init__(self):
        self.templates_dir = Path(__file__).parent.parent / "templates"
        self.env = Environment(loader=FileSystemLoader(str(self.templates_dir)))


    def _generate_fallback_brd(self, cache_data: dict) -> dict:
        from app.brd_models import FullBrdReport, Capability, DataStoreInfo
        
        repo_url = cache_data.get("repoUrl") or "Unknown"
        repo_name = repo_url.split('/')[-1].replace('.git', '')
        project_type = cache_data.get("projectType") or "Unknown"
        framework = cache_data.get("frameworkType") or "Unknown"
        language = "Java" if cache_data.get("isJava") else project_type
        
        report = FullBrdReport(
            appName=repo_name,
            orgName="Analyzed Organization",
            docPurposeDesc="Business Requirements Document generated dynamically based on repository analysis.",
            appPurposeDesc=f"This application is a {project_type} project using {framework}. It has been analyzed to document its architecture and endpoints.",
            techStackSummary=[
                language,
                framework,
                cache_data.get("database") or "No database detected"
            ],
            primaryLang=language,
            totalPrograms=cache_data.get("endpointCount", 0) or 0,
            capabilities=[
                Capability(name="Core Application Logic", overview=f"Main business logic constructed using {framework}.", features=[], processes=[], value="")
            ],
            primaryDataStores=[
                DataStoreInfo(name=cache_data.get("database") or "Unknown DB", description="Primary datastore")
            ]
        )
        return report.model_dump()

    def generate_brd_pdf(self, repo_url: str) -> bytes:
        def _get_project_data(self, project_id: str):
            from app.database import SessionLocal
            from app.db_models import Repository, Analysis
            db = SessionLocal()
            try:
                repo = db.query(Repository).filter(Repository.name == project_id).first()
                if not repo:
                    repo = db.query(Repository).filter(Repository.repo_url == project_id).first()
                if repo:
                    analysis = db.query(Analysis).filter(Analysis.repository_id == repo.id).order_by(Analysis.created_at.desc()).first()
                    if analysis:
                        return {
                            "repoUrl": repo.repo_url,
                            "projectType": analysis.project_type,
                            "isJava": analysis.project_type.lower() == "java" if analysis.project_type else False,
                            "analysis_id": analysis.id,
                            "fullBrdReport": analysis.full_brd_report
                        }
                raise Exception(f"No analysis data found for {project_id}. Please run repository analysis first.")
            finally:
                db.close()

        cache_data = _get_project_data(self, repo_url)

        full_brd_report = cache_data.get("fullBrdReport", {})
        if not full_brd_report:
            full_brd_report = self._generate_fallback_brd(cache_data)

        # Prepare template variables
        template_vars = full_brd_report

        # Render HTML
        template = self.env.get_template("brd_full_template.html")
        html_out = template.render(template_vars)

        # Convert to PDF
        pdf_buffer = io.BytesIO()
        pisa_status = pisa.CreatePDF(io.StringIO(html_out), dest=pdf_buffer)

        if pisa_status.err:
            raise Exception("Error during PDF generation")

        return pdf_buffer.getvalue()

brd_service = BrdService()
