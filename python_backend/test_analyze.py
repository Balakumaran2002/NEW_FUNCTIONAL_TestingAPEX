import os
import sys

# Setup paths
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.models import AnalyzeRequest
from app.routers.api import analyze
from fastapi import Request
import asyncio

async def test():
    req = AnalyzeRequest(
        repoUrl="https://github.com/spring-projects/spring-petclinic",
        localPath=""
    )
    try:
        res = await analyze(req)
        print("Success:")
        print(res)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
