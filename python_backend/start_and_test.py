import subprocess
import time
import urllib.request
import json
import sys

def run_test():
    # Start the backend
    print("Starting backend...")
    proc = subprocess.Popen(
        [sys.executable, "main.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )
    
    # Wait for startup
    time.sleep(5)
    
    print("Sending request...")
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/analyze",
        data=json.dumps({
            "repoUrl": "https://github.com/spring-projects/spring-petclinic",
            "localPath": ""
        }).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            print("Status:", response.status)
            print(response.read().decode())
    except urllib.error.HTTPError as e:
        print("HTTP Error:", e.code)
        print(e.read().decode())
    except Exception as e:
        print("Other Error:", e)
        
    print("Terminating backend...")
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except:
        proc.kill()
        
    print("\n--- Backend Logs ---")
    print(proc.stdout.read())

if __name__ == "__main__":
    run_test()
