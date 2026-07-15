from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import api
from app.routers import api_keys
from app.routers import technical_documents

app = FastAPI(title="Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api.router, prefix="/api")
app.include_router(api_keys.router)
app.include_router(technical_documents.router)

from app.services.rag_service import rag_service
import asyncio

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(asyncio.to_thread(rag_service.initialize_rag))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

