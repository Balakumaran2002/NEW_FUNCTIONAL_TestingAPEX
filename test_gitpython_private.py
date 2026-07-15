from git import Git
import traceback

def test_gitpython():
    try:
        g = Git()
        result = g.ls_remote("https://github.com/abhishekravi-7/private_repo_that_doesnt_exist", env={"GIT_TERMINAL_PROMPT": "0", "GIT_ASKPASS": "echo"})
        print("Success! First 50 chars:", result[:50])
    except Exception as e:
        print("Exception str:", str(e))
        print("Type:", type(e))

test_gitpython()
