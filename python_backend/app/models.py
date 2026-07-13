from pydantic import BaseModel
from typing import List, Dict, Optional, Any

class AnalyzeRequest(BaseModel):
    repoUrl: str
    githubToken: Optional[str] = None
    localPath: Optional[str] = None
    apiKey: Optional[str] = None
    provider: Optional[str] = None
    modelName: Optional[str] = None

class ValidateRepoRequest(BaseModel):
    repoUrl: str
    patToken: Optional[str] = None

class ValidateRepoResponse(BaseModel):
    repositoryExists: bool
    repositoryType: Optional[str] = None
    isPublic: bool
    requiresPat: bool
    isAccessible: bool
    isValid: bool
    message: Optional[str] = None

class MigrateRequest(BaseModel):
    repoUrl: str
    targetVersion: str
    apiKey: Optional[str] = None
    provider: Optional[str] = None
    modelName: Optional[str] = None

class ConvertRequest(BaseModel):
    files: Dict[str, str]
    apiKey: Optional[str] = None
    provider: Optional[str] = None
    modelName: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    apiKey: Optional[str] = None
    provider: Optional[str] = None
    modelName: Optional[str] = None

class ChatResponse(BaseModel):
    response: Optional[str] = None
    errorMessage: Optional[str] = None

class TaskResponse(BaseModel):
    task_id: str
    status: str

from app.brd_models import FullBrdReport

class AnalysisResponse(BaseModel):
    repoUrl: str
    projectType: Optional[str] = None
    isJava: bool = True
    detectedJavaVersion: Optional[str] = None
    buildTool: Optional[str] = None          # "Maven", "Gradle", "Gradle Kotlin DSL"
    frameworkType: Optional[str] = None       # "Spring Boot", "Spring MVC", "JSP/Servlet", "Plain Java", etc.
    database: Optional[str] = None            # "MySQL", "PostgreSQL", "H2", "MongoDB", "None"
    packagingType: Optional[str] = None       # "jar", "war"
    isMultiModule: bool = False
    hasFrontend: bool = False
    frontendFramework: Optional[str] = None   # "React", "Angular", "Vue", "Thymeleaf", "JSP"
    endpointCount: int = 0
    riskLevel: Optional[str] = None           # "Low", "Medium", "High"
    deprecatedApis: List[str] = []
    dependencies: List[str] = []
    frameworkVersions: Dict[str, str] = {}
    fullBrdReport: Optional[FullBrdReport] = None
    errorMessage: Optional[str] = None
    usedProvider: Optional[str] = None

class MigrationResponse(BaseModel):
    success: bool
    targetVersion: str
    modifiedFiles: List[str] = []
    buildStatus: str
    suggestedFixes: Optional[str] = None
    detailedReport: Optional[str] = None
    buildErrors: Optional[str] = None
    migrationSummary: Optional[str] = None
    errorMessage: Optional[str] = None
    gitDiff: Optional[str] = None
    fixHistory: Optional[List[Dict[str, Any]]] = []
    usedProvider: Optional[str] = None

class ConvertedFile(BaseModel):
    originalName: str
    newName: str
    content: str
    explanation: Optional[str] = None

class ConversionResponse(BaseModel):
    success: bool
    convertedFiles: List[ConvertedFile] = []
    errorMessage: Optional[str] = None

class ExecutionStatus(BaseModel):
    repository: str
    version: str # "original" | "migrated"
    status: str # "RUNNING" | "STOPPED" | "FAILED"

class ExecutionResult(BaseModel):
    repository: str
    version: str # "original" | "migrated"
    buildStatus: str
    startupStatus: str
    testStatus: str
    testsPassed: int = 0
    testsFailed: int = 0
    executionTime: str = ""
    logs: str = ""

class RunStartRequest(BaseModel):
    repoName: str

class RunStatusResponse(BaseModel):
    repoName: str
    status: str  # "STARTING" | "RUNNING" | "RUNNING_JAVA" | "FAILED" | "STOPPED" | "IDLE"
    port: Optional[int] = None
    projectType: Optional[str] = None
    previewUrl: Optional[str] = None
    endpoints: List[Dict[str, str]] = []
    errorReason: Optional[str] = None
    noUiMessage: Optional[str] = None        # Shown when project has no browser UI
    swaggerUrl: Optional[str] = None          # Detected Swagger/OpenAPI URL

class PlaywrightStatusResponse(BaseModel):
    playwrightAvailable: bool = False
    testFilesCount: int = 0
    totalTests: int = 0
    passedTests: int = 0
    failedTests: int = 0
    skippedTests: int = 0
    executionTime: Optional[str] = None
    status: str = "NOT_AVAILABLE"   # NOT_AVAILABLE | NOT_RUN | RUNNING | PASSED | FAILED | ERROR | NO_TESTS
    htmlReportUrl: Optional[str] = None
    errorMessage: Optional[str] = None
