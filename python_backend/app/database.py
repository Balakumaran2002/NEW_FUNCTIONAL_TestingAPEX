import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Expect DATABASE_URL from .env or fallback to local postgres
# In standard Docker compose setup: postgresql://user:password@localhost:5432/provadb
DATABASE_URL = os.environ.get(
    "DATABASE_URL", 
    "sqlite:///./prova.db"
)

# Use synchronous SQLAlchemy to easily integrate with FastAPI and Celery without blocking issues
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """FastAPI Dependency for database sessions"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
