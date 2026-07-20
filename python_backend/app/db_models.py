import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Repository(Base):
    __tablename__ = "repositories"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    repo_url = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    branch = Column(String, nullable=True)
    commit_sha = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    analyses = relationship("Analysis", back_populates="repository", cascade="all, delete-orphan")

class Analysis(Base):
    __tablename__ = "analyses"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repositories.id"), nullable=False)
    project_type = Column(String, nullable=True)
    framework = Column(String, nullable=True)
    build_tool = Column(String, nullable=True)
    database_type = Column(String, nullable=True)
    status = Column(String, default="completed")
    
    # Store raw json for fallback / complex structures if needed, though we will map everything to relations
    full_brd_report = Column(JSON, nullable=True)
    existing_test_details = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    repository = relationship("Repository", back_populates="analyses")
    metrics = relationship("TestMetric", back_populates="analysis", uselist=False, cascade="all, delete-orphan")
    ai_strategy = relationship("AIStrategy", back_populates="analysis", uselist=False, cascade="all, delete-orphan")
    test_cases = relationship("TestCase", back_populates="analysis", cascade="all, delete-orphan")

class TestMetric(Base):
    __tablename__ = "test_metrics"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    analysis_id = Column(String, ForeignKey("analyses.id"), nullable=False, unique=True)
    total = Column(Integer, default=0)
    passed = Column(String, default="Not Executed")
    failed = Column(String, default="Not Executed")
    skipped = Column(String, default="Not Available")
    testing_types = Column(String, default="Not Detected")
    
    analysis = relationship("Analysis", back_populates="metrics")

class AIStrategy(Base):
    __tablename__ = "ai_strategies"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    analysis_id = Column(String, ForeignKey("analyses.id"), nullable=False, unique=True)
    testing_scope_summary = Column(Text, nullable=True)
    coverage_gaps = Column(JSON, nullable=True) # List of strings
    new_test_scope = Column(JSON, nullable=True) # JSON of generated test scopes
    
    # Recommended Strategy fields
    recommended_tool = Column(String, nullable=True)
    testing_type = Column(String, nullable=True)
    priority = Column(String, nullable=True)
    target = Column(String, nullable=True)
    reason = Column(Text, nullable=True)

    analysis = relationship("Analysis", back_populates="ai_strategy")

class TestCase(Base):
    __tablename__ = "test_cases"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    analysis_id = Column(String, ForeignKey("analyses.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    test_type = Column(String, nullable=True) # 'API', 'UI', 'E2E', 'Unit'
    tool = Column(String, nullable=True)
    priority = Column(String, nullable=True)
    status = Column(String, default="Pending") # 'Pending', 'Passed', 'Failed'
    is_ai_generated = Column(Boolean, default=True)
    file_path = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    analysis = relationship("Analysis", back_populates="test_cases")
    executions = relationship("TestExecution", back_populates="test_case", cascade="all, delete-orphan")

class TestExecution(Base):
    __tablename__ = "test_executions"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    test_case_id = Column(String, ForeignKey("test_cases.id"), nullable=False)
    status = Column(String, nullable=False) # 'Passed', 'Failed'
    error_message = Column(Text, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    executed_at = Column(DateTime, default=datetime.utcnow)

    test_case = relationship("TestCase", back_populates="executions")

class APIKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    provider = Column(String, nullable=False, index=True) # 'groq', 'openai', 'gemini'
    name = Column(String, nullable=False)
    encrypted_key = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
