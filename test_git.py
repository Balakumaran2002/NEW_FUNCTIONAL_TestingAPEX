import subprocess

def validate_repo(url):
    env = {"GIT_TERMINAL_PROMPT": "0", "GIT_ASKPASS": "echo"}
    try:
        result = subprocess.run(["git", "ls-remote", url], env=env, capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("Success!")
            return True
        else:
            print("Failed:", result.stderr)
            return False
    except Exception as e:
        print("Exception:", e)
        return False

print("Public repo:", validate_repo("https://github.com/abhishekravi-7/EMS"))
print("Private/Invalid repo:", validate_repo("https://github.com/abhishekravi-7/private_repo_that_doesnt_exist"))
