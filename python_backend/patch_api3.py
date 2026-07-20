import re

filepath = 'c:/Users/ST-Balakumaran/Desktop/PROVA/python_backend/app/routers/api.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'return JSONResponse(status_code=404, content={"status": "PROCESSING"})',
    'return JSONResponse(status_code=200, content={"status": "PROCESSING"})'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("api.py patched to return 200 for PROCESSING")
