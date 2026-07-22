from pydantic import BaseModel
from typing import List, Optional

class UpdateTracking(BaseModel):
    updateDate: str = ""
    remarks: str = ""

class ProgramTypeStats(BaseModel):
    progType: str = ""
    phyFiles: int = 0
    usedFiles: int = 0
    orphFiles: int = 0
    phyLoc: int = 0
    usedLoc: int = 0
    orphLoc: int = 0

class StaticCodeAnalysis(BaseModel):
    programTypes: List[ProgramTypeStats] = []
    totalPhyFiles: int = 0
    totalUsedFiles: int = 0
    totalOrphFiles: int = 0
    totalPhyLoc: int = 0
    totalUsedLoc: int = 0
    totalOrphLoc: int = 0

class Objective(BaseModel):
    title: str = ""
    description: str = ""

class Capability(BaseModel):
    name: str = ""
    overview: str = ""
    features: List[str] = []
    value: str = ""
    processes: List[str] = []

class ArchPattern(BaseModel):
    pattern: str = ""
    description: str = ""

class LanguageStat(BaseModel):
    language: str = ""
    programs: int = 0
    loc: int = 0
    notes: str = ""

class OnlineEnv(BaseModel):
    component: str = ""
    description: str = ""

class DatabaseStat(BaseModel):
    technology: str = ""
    type: str = ""
    usage: str = ""

class MiddlewareStat(BaseModel):
    technology: str = ""
    useCase: str = ""

class DevTool(BaseModel):
    tool: str = ""
    purpose: str = ""

class DataStoreInfo(BaseModel):
    name: str = ""
    description: str = ""

class KeyRelationship(BaseModel):
    parent: str = ""
    child: str = ""
    type: str = ""

class Transaction(BaseModel):
    code: str = ""
    program: str = ""
    description: str = ""

class BatchCycle(BaseModel):
    cycle: str = ""
    jobs: str = ""
    purpose: str = ""

class KeyTransaction(BaseModel):
    name: str = ""
    description: str = ""

class KeyScreenFlow(BaseModel):
    title: str = ""
    description: str = ""

class UseCase(BaseModel):
    title: str = ""
    actor: str = ""
    priority: str = ""
    precondition: str = ""
    postcondition: str = ""
    steps: List[str] = []

class ClassAttribute(BaseModel):
    name: str = ""
    type: str = ""

class ClassMethod(BaseModel):
    name: str = ""
    type: str = ""

class ClassModel(BaseModel):
    name: str = ""
    attributes: List[ClassAttribute] = []
    methods: List[ClassMethod] = []

class BusinessDomainInfo(BaseModel):
    name: str = ""
    purpose: str = ""
    overallResponsibility: str = ""
    functionalities: List[str] = []
    relatedModules: List[str] = []
    controllersInvolved: List[str] = []
    servicesInvolved: List[str] = []
    entitiesUsed: List[str] = []
    apisInvolved: List[str] = []
    uiComponentsInvolved: List[str] = []
    businessRules: List[str] = []
    validationRules: List[str] = []
    relationships: List[str] = []
    dependencies: List[str] = []
    aiReasoning: str = ""

class BusinessModelInfo(BaseModel):
    name: str = ""
    purpose: str = ""
    description: str = ""
    attributes: List[ClassAttribute] = []
    relationships: List[str] = []
    associatedControllers: List[str] = []
    associatedServices: List[str] = []
    associatedRepositories: List[str] = []
    apisUsingModel: List[str] = []
    businessRules: List[str] = []
    validationRules: List[str] = []
    crudOperations: List[str] = []
    workflowInvolvement: str = ""
    relatedModules: List[str] = []
    aiExplanation: str = ""


class ActivityFlow(BaseModel):
    title: str = ""
    steps: List[str] = []

class SequenceDiagram(BaseModel):
    title: str = ""
    actors: List[str] = []
    messages: List[str] = []

class InboundIntegration(BaseModel):
    name: str = ""
    tech: str = ""
    format: str = ""
    frequency: str = ""
    errorHandling: str = ""
    desc: str = ""

class OutboundIntegration(BaseModel):
    name: str = ""
    tech: str = ""
    format: str = ""
    frequency: str = ""
    consumers: str = ""
    desc: str = ""

class IntegrationTech(BaseModel):
    tech: str = ""
    direction: str = ""
    pattern: str = ""
    notes: str = ""

class ApiEndpoint(BaseModel):
    method: str = ""
    path: str = ""
    desc: str = ""

class ApiGroup(BaseModel):
    name: str = ""
    endpoints: List[ApiEndpoint] = []

class PerfMetric(BaseModel):
    metric: str = ""
    target: str = ""
    notes: str = ""

class Risk(BaseModel):
    level: str = ""
    title: str = ""
    desc: str = ""
    mitigation: str = ""

class FileItem(BaseModel):
    name: str = ""
    desc: str = ""

class FileGroup(BaseModel):
    name: str = ""
    files: List[FileItem] = []

class OrphanFileCategory(BaseModel):
    category: str = ""
    files: str = ""
    notes: str = ""

class SecurityCheck(BaseModel):
    item: str = ""
    status: str = "" # e.g. Pass, Gap, Partial

class PiiAnalysis(BaseModel):
    category: str = ""
    elements: str = ""
    risk: str = ""
    capabilities: str = ""

class SupportChannel(BaseModel):
    channel: str = ""
    details: str = ""
    hours: str = ""

class Escalation(BaseModel):
    level: str = ""
    trigger: str = ""
    contact: str = ""
    sla: str = ""

class RoleContact(BaseModel):
    role: str = ""
    name: str = ""
    email: str = ""

class GlossaryTerm(BaseModel):
    term: str = ""
    definition: str = ""

class RevisionHistory(BaseModel):
    version: str = ""
    date: str = ""
    author: str = ""
    changes: str = ""

class FullBrdReport(BaseModel):
    # Metadata
    orgInitial: str = ""
    orgName: str = ""
    appName: str = ""
    docVersion: str = ""
    docStatus: str = ""
    docDate: str = ""
    repoUrl: str = ""
    primaryLang: str = ""
    platform: str = ""
    environment: str = ""
    techStackSummary: List[str] = []
    
    # 1. Introduction
    docPurposeDesc: str = ""
    appPurposeDesc: str = ""
    modernizationContext: str = ""
    processingModes: str = ""
    totalPrograms: int = 0
    totalLoc: int = 0
    totalOrphanFiles: int = 0
    
    # Update Tracking & Static Code
    updateTracking: List[UpdateTracking] = []
    staticCodeAnalysis: StaticCodeAnalysis = StaticCodeAnalysis()
    
    # 2. Purpose and Scope
    detailedPurpose: str = ""
    objectives: List[Objective] = []
    inScope: List[str] = []
    outOfScope: List[str] = []
    
    # 3. Business Functionality
    capabilities: List[Capability] = []
    businessDomains: List[BusinessDomainInfo] = []
    businessModels: List[BusinessModelInfo] = []
    
    # 4. Architecture
    architectureIntro: str = ""
    actors: List[str] = []
    uiComponents: List[str] = []
    bizComponents: List[str] = []
    dataAccessComponents: List[str] = []
    dataStores: List[str] = []
    externalSystems: List[str] = []
    archPatterns: List[ArchPattern] = []
    businessFlowOverview: str = ""
    fullModuleBreakdown: str = ""
    
    # 5. Tech Stack
    languages: List[LanguageStat] = []
    onlineEnvironments: List[OnlineEnv] = []
    databases: List[DatabaseStat] = []
    jobControlDesc: str = ""
    jobSchedulingDesc: str = ""
    middlewares: List[MiddlewareStat] = []
    securityFrameworkDesc: str = ""
    devTools: List[DevTool] = []
    osDesc: str = ""
    
    # 6. Data Management
    dataEntitiesIntro: str = ""
    primaryDataStores: List[DataStoreInfo] = []
    dataEntryPoints: List[str] = []
    dataProcessingWorkflows: List[str] = []
    dataExitPoints: List[str] = []
    criticalDataDependencies: List[str] = []
    
    # 7. DB Schema
    dbSchemaIntro: str = ""
    keyRelationships: List[KeyRelationship] = []
    
    # 8. Process Overview
    onlineProcessIntro: str = ""
    onlineTransactions: List[Transaction] = []
    batchProcessIntro: str = ""
    batchCycles: List[BatchCycle] = []
    jobStreamDependencyDesc: str = ""
    
    # 9. Application Flow
    keyTransactions: List[KeyTransaction] = []
    keyScreenFlows: List[KeyScreenFlow] = []
    
    # 10. Use Cases
    useCases: List[UseCase] = []
    
    # 11. Object Model
    classModelIntro: str = ""
    classes: List[ClassModel] = []
    
    # 12. Activity Flows
    activityFlows: List[ActivityFlow] = []
    
    # 13. Sequence Diagrams
    sequenceDiagrams: List[SequenceDiagram] = []
    
    # 14. Integration Points
    inboundIntegrations: List[InboundIntegration] = []
    outboundIntegrations: List[OutboundIntegration] = []
    integrationTechs: List[IntegrationTech] = []
    
    # 15. API
    apiGeneralNote: str = ""
    apiGroups: List[ApiGroup] = []
    
    # 16. NFRs
    authNfrs: List[str] = []
    authzNfrs: List[str] = []
    dataSecurityNfrs: List[str] = []
    availabilityNfrs: List[str] = []
    performanceNfrs: List[PerfMetric] = []
    scalabilityNfrs: List[str] = []
    complianceNfrs: List[str] = []
    
    # 17. Risks
    technicalRisks: List[Risk] = []
    operationalChallenges: List[Risk] = []
    securityConcerns: List[Risk] = []
    maintenanceIssues: List[Risk] = []
    
    # 18. File Guide
    fileGroups: List[FileGroup] = []
    orphanFilesByCategory: List[OrphanFileCategory] = []
    
    # 19. Security, Acceptance
    securityChecklist: List[SecurityCheck] = []
    piiAnalysis: List[PiiAnalysis] = []
    acceptanceCriteria: List[str] = []
    knownLimitations: List[str] = []
    
    # 20. Support
    supportChannels: List[SupportChannel] = []
    escalationMatrix: List[Escalation] = []
    
    # 21. Contacts
    roles: List[RoleContact] = []
    
    # 22. Glossary
    glossary: List[GlossaryTerm] = []
    
    # 23. References
    sourceFiles: List[str] = []
    processingSummaryList: List[str] = []
    revisionHistory: List[RevisionHistory] = []
