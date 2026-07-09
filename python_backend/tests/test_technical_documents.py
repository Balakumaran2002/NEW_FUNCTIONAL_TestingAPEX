import json
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import app_config
from app.brd_models import FullBrdReport
from main import app


class TechnicalDocumentApiTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_work_dir_name = app_config.work_dir_name
        app_config.work_dir_name = self.temp_dir.name
        self.client = TestClient(app)
        self.repo_url = "https://github.com/example/shop.git"
        self._write_analysis_cache()

    def tearDown(self):
        app_config.work_dir_name = self.original_work_dir_name
        self.temp_dir.cleanup()

    def _write_analysis_cache(self):
        workspace = app_config.workspace_directory
        workspace.mkdir(parents=True, exist_ok=True)
        report = FullBrdReport(
            appName="shop",
            repoUrl=self.repo_url,
            orgInitial="S",
            orgName="Example Org",
            modernizationContext="Generated from repository analysis.",
            docVersion="1.0",
            docStatus="Draft",
            docDate="July 09, 2026",
            sourceFiles=["pom.xml", "src/main/java/App.java"],
        ).model_dump()

        cache = {
            "sample_key": {
                "repoUrl": self.repo_url,
                "usedProvider": "test-provider",
                "fullBrdReport": report,
            }
        }
        (workspace / "analysis_cache.json").write_text(json.dumps(cache), encoding="utf-8")
        reports_dir = workspace / "reports"
        reports_dir.mkdir(parents=True, exist_ok=True)
        (reports_dir / "last_analysis.json").write_text(json.dumps(cache["sample_key"]), encoding="utf-8")

    def test_create_list_export_and_delete_document(self):
        create_response = self.client.post(
            "/api/technical-documents",
            json={"repoUrl": self.repo_url, "title": "Shop Technical Document", "tags": ["spring", "audit"]},
        )
        self.assertEqual(create_response.status_code, 200, create_response.text)
        document = create_response.json()
        document_id = document["id"]
        self.assertEqual(document["title"], "Shop Technical Document")
        self.assertEqual(document["repoUrl"], self.repo_url)

        list_response = self.client.get("/api/technical-documents")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.json()["total"], 1)

        html_response = self.client.get(f"/api/technical-documents/{document_id}/html")
        self.assertEqual(html_response.status_code, 200)
        self.assertIn("shop", html_response.text.lower())

        pdf_response = self.client.get(f"/api/technical-documents/{document_id}/download")
        self.assertEqual(pdf_response.status_code, 200)
        self.assertEqual(pdf_response.headers["content-type"], "application/pdf")
        self.assertGreater(len(pdf_response.content), 0)

        update_response = self.client.put(
            f"/api/technical-documents/{document_id}",
            json={
                "title": "Shop Technical Document v2",
                "status": "published",
                "tags": ["spring", "archived"],
                "htmlContent": "<html><body><h1>Custom Technical Document</h1></body></html>",
            },
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()["version"], 2)

        versions_response = self.client.get(f"/api/technical-documents/{document_id}/versions")
        self.assertEqual(versions_response.status_code, 200)
        self.assertGreaterEqual(len(versions_response.json()["items"]), 1)

        delete_response = self.client.delete(f"/api/technical-documents/{document_id}")
        self.assertEqual(delete_response.status_code, 200)

        missing_response = self.client.get(f"/api/technical-documents/{document_id}")
        self.assertEqual(missing_response.status_code, 404)

    def test_upload_html_document(self):
        upload_payload = {
            "file": ("reference.html", b"<html><head><title>Reference Doc</title></head><body><h1>Reference</h1></body></html>", "text/html"),
            "title": (None, "Reference Document"),
            "repoUrl": (None, self.repo_url),
            "tags": (None, "reference, html"),
        }
        response = self.client.post("/api/technical-documents/upload", files=upload_payload)
        self.assertEqual(response.status_code, 200, response.text)
        document = response.json()
        self.assertEqual(document["renderMode"], "raw_html")

        html_response = self.client.get(f"/api/technical-documents/{document['id']}/html")
        self.assertEqual(html_response.status_code, 200)
        self.assertIn("Reference", html_response.text)


if __name__ == "__main__":
    unittest.main()
