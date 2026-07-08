import requests, time

repo = 'gs-handling-form-submission'
base_url = 'http://127.0.0.1:8000/api'

print('Starting project...')
requests.post(f'{base_url}/run/start', json={'repoName': repo})

for _ in range(30):
    status = requests.get(f'{base_url}/run/status/{repo}').json()
    if status.get('status') == 'RUNNING':
        print(f"Project started on port {status.get('port')}")
        break
    time.sleep(2)
else:
    print('Project failed to start')
    exit(1)

for framework in ['playwright', 'selenium']:
    print(f'Starting {framework} tests...')
    requests.post(f'{base_url}/migration/{repo}/{framework}/run')
    
    for _ in range(60):
        s = requests.get(f'{base_url}/migration/{repo}/{framework}/status').json()
        status_state = s.get('status')
        if status_state in ['COMPLETED', 'ERROR']:
            print(f"{framework} completed with status: {status_state}")
            print(f"Passed: {s.get('passedTests')}, Failed: {s.get('failedTests')}")
            break
        time.sleep(3)
    else:
        print(f'{framework} timed out')
