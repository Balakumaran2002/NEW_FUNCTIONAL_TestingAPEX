import asyncio
async def test():
    p = await asyncio.create_subprocess_shell('""C:\\Users\\ST-Sivaranjini\\OneDrive - SORIM TECHNOLOGIES\\Desktop\\Testex\\Testex\\apache-maven-3.9.6\\bin\\mvn.cmd" --version"', stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT)
    out, err = await p.communicate()
    print(out.decode())
    print('ReturnCode:', p.returncode)
asyncio.run(test())
