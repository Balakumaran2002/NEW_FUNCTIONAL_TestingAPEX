import httpx
print("Testing httpx...")
try:
    with httpx.Client() as client:
        response = client.get("https://api.github.com/repos/abhishekravi-7/EMS", timeout=10.0)
    print("Status:", response.status_code)
    print("JSON:", response.json())
except Exception as e:
    print("Exception:", e)
