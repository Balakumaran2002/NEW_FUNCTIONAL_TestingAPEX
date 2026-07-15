from git import Git
import traceback

def test_gitpython():
    try:
        g = Git()
        # use GIT_TERMINAL_PROMPT=0 environment variable
        result = g.ls_remote("https://github.com/abhishekravi-7/EMS", env={"GIT_TERMINAL_PROMPT": "0"})
        print("Success! First 50 chars:", result[:50])
    except Exception as e:
        print("Exception:")
        traceback.print_exc()

test_gitpython()
