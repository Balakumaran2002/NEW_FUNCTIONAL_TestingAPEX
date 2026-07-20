import re
from pathlib import Path

backend_dir = Path("c:/Users/ST-Balakumaran/Desktop/PROVA/python_backend/app/services")

# 1. Update api_test_case_service.py
api_file = backend_dir / "api_test_case_service.py"
api_content = api_file.read_text(encoding="utf-8")
api_content = re.sub(
    r'except Exception as e:\s*print\(f"Error generating or parsing LLM JSON: \{e\}"\)\s*test_cases = \[\s*\{\s*"method": "GET",\s*"path": "/api/fallback",\s*"scenario": "Fallback API Test",\s*"expected": "200 OK",\s*"source": "FallbackController"\s*\}\s*\]',
    'except Exception as e:\n            print(f"Error generating or parsing LLM JSON: {e}")\n            test_cases = []',
    api_content
)
api_file.write_text(api_content, encoding="utf-8")

# 2. Update ui_test_case_service.py
ui_file = backend_dir / "ui_test_case_service.py"
ui_content = ui_file.read_text(encoding="utf-8")
ui_content = re.sub(
    r'except Exception as e:\s*print\(f"\[UI Scanner Error\] LLM generation failed: \{e\}\. Using fallback data\."\)\s*result_data = \{\s*"summary": \[\s*\{\s*"scenario": "Fallback Scenario",\s*"purpose": "Test application load",\s*"expected": "Page loads successfully",\s*"migration_result": "Passed",\s*"status": "Pass"\s*\}\s*\],\s*"metrics": \{\s*"pages_to_test": 1,\s*"detected_routes": 1,\s*"forms_detected": 0,\s*"data_tables": 0\s*\},\s*"test_cases": \[\s*\{\s*"route": "/",\s*"type": "Fallback Page",\s*"scenario": "Basic Load Test",\s*"interaction": "Page load only",\s*"steps": "1\. Open application\\n2\. Verify it does not crash"\s*\}\s*\]\s*\}',
    'except Exception as e:\n            print(f"[UI Scanner Error] LLM generation failed: {e}. Using empty data.")\n            result_data = {\n                "summary": [],\n                "metrics": {"pages_to_test": 0, "detected_routes": 0, "forms_detected": 0, "data_tables": 0},\n                "test_cases": []\n            }',
    ui_content
)
ui_file.write_text(ui_content, encoding="utf-8")

print("Backend fallback logic updated successfully!")
