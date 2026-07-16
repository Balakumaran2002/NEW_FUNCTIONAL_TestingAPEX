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

    def generate_brd_pdf(self, repo_url: str) -> bytes:
        # Load analysis data from cache
        cache_file = app_config.workspace_directory / "analysis_cache.json"
        
        # If we don't have the exact cache key, we can try to find the last analysis for this repo
        cache_data = None
        if cache_file.exists():
            try:
                cache = json.loads(cache_file.read_text())
                # Try to find a cache entry matching the repo URL
                for key, data in cache.items():
                    if data.get("repoUrl") == repo_url:
                        cache_data = data
                        break
            except Exception:
                pass
                
        # Fallback to last_analysis.json
        if not cache_data:
            last_analysis_file = app_config.workspace_directory / "reports" / "last_analysis.json"
            if last_analysis_file.exists():
                try:
                    data = json.loads(last_analysis_file.read_text())
                    if data.get("repoUrl") == repo_url:
                        cache_data = data
                except Exception:
                    pass

        if not cache_data:
            raise Exception("No analysis data found for this repository.")

        full_brd_report = cache_data.get("fullBrdReport", {})
        if not full_brd_report:
            raise Exception("BRD Summary not generated for this repository.")

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
