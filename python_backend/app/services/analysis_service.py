import os
import re
import shutil
from pathlib import Path
from git import Repo
from app.config import app_config
from app.models import AnalysisResponse
from app.ai.ai_factory import AIFactory
from app.services.rag_service import rag_service


import os
import re

class ExistingTestDetector:
    def __init__(self, clone_dir):
        from pathlib import Path
        self.clone_dir = Path(clone_dir)
        self.tests_found = []
        self.frameworks = set()
        self.languages = set()
        self.total_test_count = 0
        self.passed = "Not Available"
        self.failed = "Not Available"
        self.skipped = "Not Available"
        self.test_types = set()

    def scan(self):
        import os
        from pathlib import Path
        
        self._detect_frameworks_from_configs()
        
        for root, dirs, files in os.walk(self.clone_dir):
            if 'node_modules' in dirs: dirs.remove('node_modules')
            if '.git' in dirs: dirs.remove('.git')
            if 'venv' in dirs: dirs.remove('venv')
            if 'target' in dirs: dirs.remove('target')
            if 'dist' in dirs: dirs.remove('dist')
            if 'build' in dirs: dirs.remove('build')
            if '.next' in dirs: dirs.remove('.next')

            for file in files:
                filepath = Path(root) / file
                try:
                    rel_path = filepath.relative_to(self.clone_dir).as_posix()
                except Exception:
                    continue
                self._analyze_file(filepath, rel_path)
                
        self._parse_execution_results()
                
        return {
            "metrics": {
                "total": self.total_test_count,
                "passed": self.passed,
                "failed": self.failed,
                "skipped": self.skipped,
                "type": ", ".join(self.frameworks) if self.frameworks else "Not Detected"
            },
            "details": {
                "frameworks": list(self.frameworks),
                "languages": list(self.languages),
                "testTypes": list(self.test_types),
                "testCases": self.tests_found
            }
        }
        
    def _detect_frameworks_from_configs(self):
        import json
        pkg_json = self.clone_dir / 'package.json'
        if pkg_json.exists():
            try:
                data = json.loads(pkg_json.read_text(encoding='utf-8', errors='ignore'))
                deps = str(data.get('dependencies', {})) + str(data.get('devDependencies', {}))
                if 'playwright' in deps: self.frameworks.add('Playwright')
                if 'cypress' in deps: self.frameworks.add('Cypress')
                if 'jest' in deps: self.frameworks.add('Jest')
                if 'vitest' in deps: self.frameworks.add('Vitest')
                if 'mocha' in deps: self.frameworks.add('Mocha')
                if 'supertest' in deps: self.frameworks.add('Supertest')
            except Exception:
                pass
                
    def _parse_execution_results(self):
        import re
        junit_path = self.clone_dir / 'junit.xml'
        if junit_path.exists():
            try:
                content = junit_path.read_text(encoding='utf-8', errors='ignore')
                failures = len(re.findall(r'<failure', content))
                testcases = len(re.findall(r'<testcase', content))
                self.passed = testcases - failures
                self.failed = failures
                self.skipped = 0
            except Exception:
                pass
        
    def _analyze_file(self, filepath, rel_path):
        import re
        name = filepath.name.lower()
        if not (name.endswith('.ts') or name.endswith('.js') or name.endswith('.java') or name.endswith('.py')):
            return
            
        try:
            content = filepath.read_text(encoding='utf-8', errors='ignore')
        except Exception:
            return
            
        is_test = False
        framework = "Unknown"
        language = "Unknown"
        test_type = "Unit / Integration"
        count = 0
        test_names = []
        
        if name.endswith('.spec.ts') or name.endswith('.test.ts') or name.endswith('.spec.js') or name.endswith('.test.js'):
            is_test = True
            language = "TypeScript" if name.endswith('.ts') else "JavaScript"
            if "playwright" in content.lower():
                framework = "Playwright"
                test_type = "UI / E2E"
            elif "cypress" in content.lower():
                framework = "Cypress"
                test_type = "UI / E2E"
            elif "jest" in content.lower():
                framework = "Jest"
            else:
                framework = "Mocha/Jest/Vitest"
                
            matches = re.findall(r'(?:test|it|describe|test\.describe)\s*\(\s*[\'"`](.*?)[\'"`]', content)
            count = len(matches)
            test_names = matches
            
        elif name.endswith('test.java') or name.endswith('tests.java'):
            is_test = True
            language = "Java"
            if "org.junit" in content:
                framework = "JUnit"
            if "org.testng" in content:
                framework = "TestNG"
            if "MockMvc" in content:
                test_type = "API / Integration"
                
            matches = re.findall(r'@Test[\s\S]*?void\s+([a-zA-Z0-9_]+)\s*\(', content)
            count = len(matches)
            test_names = matches
            
        elif (name.startswith('test_') or name.endswith('_test.py')) and name.endswith('.py'):
            is_test = True
            language = "Python"
            if "pytest" in content:
                framework = "PyTest"
            elif "unittest" in content:
                framework = "unittest"
            else:
                framework = "PyTest/unittest"
                
            matches = re.findall(r'def\s+(test_[a-zA-Z0-9_]+)\s*\(', content)
            count = len(matches)
            test_names = matches

        if is_test and count > 0:
            self.frameworks.add(framework)
            self.languages.add(language)
            self.test_types.add(test_type)
            self.total_test_count += count
            
            for t_name in test_names:
                parts = rel_path.split('/')
                module_name = parts[1] if len(parts) > 1 else parts[0]
                self.tests_found.append({
                    "name": t_name,
                    "file": rel_path,
                    "framework": framework,
                    "type": test_type,
                    "module": module_name,
                    "status": "Not Available"
                })

class AnalysisService:

    SKIP_DIRS = {".git", "target", "build", "node_modules", ".idea", ".vscode", ".mvn", "__pycache__", "test", "tests"}
    CONFIG_EXTENSIONS = {".xml", ".gradle", ".kts", ".properties", ".yml", ".yaml"}
    MAX_CONTEXT_CHARS = 3000
    MAX_CONFIG_FILE_BYTES = 3000
    MAX_JAVA_SCAN_BYTES = 3000
    MAX_FILES_PER_CATEGORY = 40
    BATCH_SIZE = 12
    MAX_IMPORTS = 100
    MAX_JAVA_FILES = 200
    
    def validate_repository(self, repo_url: str, pat_token: str = None) -> dict:
        from git import Git
        try:
            parts = repo_url.rstrip("/").split("/")
            if len(parts) >= 2:
                owner, repo = parts[-2], parts[-1]
                if repo.endswith(".git"):
                    repo = repo[:-4]
            else:
                return {
                    "repositoryExists": False,
                    "isPublic": False,
                    "requiresPat": False,
                    "isAccessible": False,
                    "isValid": False,
                    "message": "Invalid GitHub repository URL format."
                }

            auth_url = repo_url
            if pat_token and pat_token.strip() and "github.com" in repo_url:
                clean_url = repo_url.replace("https://", "").replace("http://", "")
                auth_url = f"https://{pat_token.strip()}@{clean_url}"

            g = Git()
            try:
                g.ls_remote(auth_url, env={"GIT_TERMINAL_PROMPT": "0", "GIT_ASKPASS": "echo"})
                
                return {
                    "repositoryExists": True,
                    "repositoryType": "Private" if pat_token else "Public",
                    "isPublic": not bool(pat_token),
                    "requiresPat": False,
                    "isAccessible": True,
                    "isValid": True,
                    "message": "Repository access verified successfully."
                }
            except Exception as e:
                err_msg = str(e).lower()
                if "authentication failed" in err_msg or "could not read username" in err_msg or "not found" in err_msg:
                    if not pat_token:
                        return {
                            "repositoryExists": True,
                            "repositoryType": "Unknown",
                            "isPublic": False,
                            "requiresPat": True,
                            "isAccessible": False,
                            "isValid": False,
                            "message": "Repository is private or does not exist. Authentication required."
                        }
                    else:
                        return {
                            "repositoryExists": False,
                            "repositoryType": "Private",
                            "isPublic": False,
                            "requiresPat": True,
                            "isAccessible": False,
                            "isValid": False,
                            "message": "Invalid PAT token or repository not found."
                        }
                else:
                    return {
                        "repositoryExists": False,
                        "isPublic": False,
                        "requiresPat": False,
                        "isAccessible": False,
                        "isValid": False,
                        "message": f"Git access error: {str(e)}"
                    }
                    
        except Exception as e:
            return {
                "repositoryExists": False,
                "isPublic": False,
                "requiresPat": False,
                "isAccessible": False,
                "isValid": False,
                "message": f"Failed to validate repository: {str(e)}"
            }

    def analyze_repository(self, repo_url: str, api_key: str, model_name: str, github_token: str = None, local_path: str = None) -> AnalysisResponse:
        try:
            clone_dir = self.clone_repository(repo_url, github_token, local_path)
            commit_hash = "unknown"
            try:
                commit_hash = Repo(clone_dir).head.commit.hexsha
            except Exception:
                pass
                
            from app.database import SessionLocal
            from app.db_models import Repository, Analysis, TestMetric, AIStrategy

            db = SessionLocal()
            try:
                repo_record = db.query(Repository).filter(Repository.repo_url == repo_url).first()
                if repo_record and repo_record.commit_sha == commit_hash:
                    # Look for completed analysis
                    db_analysis = db.query(Analysis).filter(
                        Analysis.repository_id == repo_record.id,
                        Analysis.status == "completed"
                    ).order_by(Analysis.created_at.desc()).first()

                    if db_analysis and db_analysis.full_brd_report and db_analysis.existing_test_details:
                        # Reconstruct response from DB json to prevent repeated LLM calls
                        test_metrics = db_analysis.metrics
                        metric_dict = {
                            "total": test_metrics.total if test_metrics else 0,
                            "passed": test_metrics.passed if test_metrics else "Not Executed",
                            "failed": test_metrics.failed if test_metrics else "Not Executed",
                            "type": test_metrics.testing_types if test_metrics else "Not Detected"
                        }
                        
                        # Fetch AI strategy if exists
                        if db_analysis.ai_strategy:
                            metric_dict["aiStrategy"] = {
                                "testingScope": db_analysis.ai_strategy.testing_scope_summary,
                                "coverageGaps": db_analysis.ai_strategy.coverage_gaps or [],
                                "recommendedStrategy": {
                                    "recommendedTool": db_analysis.ai_strategy.recommended_tool,
                                    "testingType": db_analysis.ai_strategy.testing_type,
                                    "priority": db_analysis.ai_strategy.priority,
                                    "target": db_analysis.ai_strategy.target,
                                    "reason": db_analysis.ai_strategy.reason
                                },
                                "newTestScope": db_analysis.ai_strategy.new_test_scope or []
                            }
                        else:
                            metric_dict["aiStrategy"] = {
                                "testingScope": "Failed to generate dynamic testing strategy.",
                                "coverageGaps": [],
                                "recommendedStrategy": {"testingType": "Unknown", "recommendedTool": "Unknown", "target": "Unknown", "priority": "Unknown", "reason": "Unknown"},
                                "newTestScope": []
                            }
                        return AnalysisResponse(
                            repoUrl=repo_url,
                            projectType=db_analysis.project_type,
                            isJava=db_analysis.project_type.lower() == "java" if db_analysis.project_type else False,
                            detectedJavaVersion=None,
                            buildTool=db_analysis.build_tool,
                            frameworkType=db_analysis.framework,
                            database=db_analysis.database_type,
                            packagingType=None,
                            isMultiModule=False,
                            hasFrontend=False,
                            frontendFramework=None,
                            endpointCount=0,
                            riskLevel="Unknown",
                            deprecatedApis=[],
                            dependencies=[],
                            frameworkVersions={},
                            fullBrdReport=db_analysis.full_brd_report,
                            errorMessage=None,
                            usedProvider="database",
                            testMetrics=metric_dict,
                            existingTestDetails=db_analysis.existing_test_details
                        )
            finally:
                db.close()

            project_type = self.detect_project_type(clone_dir)
            is_java = project_type.lower() == "java"
            
            build_dir = clone_dir
            if is_java and not (build_dir / "pom.xml").exists() and not (build_dir / "build.gradle").exists() and not (build_dir / "build.gradle.kts").exists():
                sub_dir = self.find_build_file_directory(clone_dir)
                if sub_dir:
                    build_dir = sub_dir
            
            current_java_version = self.detect_java_version(build_dir)
            dependencies = []
            framework_versions = {}
            self.parse_dependencies_and_frameworks(build_dir, dependencies, framework_versions)

            # Comprehensive detection
            project_info = self.detect_comprehensive_project_info(build_dir, clone_dir)
            deprecated_apis = self.detect_deprecated_apis(build_dir)
            
            context_notes = []
            context_parts = []
            self.collect_project_context(build_dir, clone_dir, context_parts, context_notes)
            project_context = "".join(context_parts)
            
            # Rule-based migration recommendation
            if is_java:
                version_int = 8
                try:
                    version_int = int(current_java_version)
                except:
                    pass
                    
                if version_int >= 21:
                    recommendation = "This project is already using the latest Java version. No migration is required."
                elif version_int >= 17:
                    recommendation = "Migrate to Java 21"
                else:
                    recommendation = "Migrate to Java 17"
                
                risk_level = self._calculate_risk_level(version_int, deprecated_apis, project_info)
                query = f"Migrating Java project. Current version: {current_java_version}. Frameworks: {framework_versions}. Framework type: {project_info.get('framework_type')}."
                system_instruction = (
                    "You are an expert Java architect advising on migration paths. "
                    "Provide a concise explanation and code fix suggestions for the migration."
                    "Do not repeat the recommendation itself, just provide the detailed reasoning based on the files you read, and step-by-step guidance."
                )
            else:
                recommendation = f"Ensure {project_type} project builds, installs dependencies, and runs properly."
                risk_level = "Low"
                query = f"Analyzing {project_type} project. Build tool: {project_info.get('build_tool')}. Framework: {project_info.get('framework_type')}."
                system_instruction = (
                    f"You are an expert {project_type} architect advising on project setup, execution, and potential local environment fixes. "
                    "Provide a concise explanation of what is required to build and run this project, "
                    "identifying any missing environment variables or complex setup steps."
                )

            retrieved_docs = rag_service.search(query, top_k=1)
            
            rag_context = "Relevant Knowledge:\n"
            for doc in retrieved_docs:
                rag_context += f"- From {doc['source']}:\n{doc['content']}\n\n"

            processing_summary = ""
            if context_notes:
                processing_summary = "Repository Processing Summary:\n" + "\n".join(f"- {note}" for note in context_notes) + "\n\n"
            
            # Detect Existing Tests
            detector = ExistingTestDetector(clone_dir)
            test_detection_result = detector.scan()
            test_metrics = test_detection_result['metrics']
            test_details = test_detection_result['details']

            # Generate Testing Strategy dynamically
            ai_client = AIFactory.get_client()
            ai_test_prompt = f'''
            Analyze the following repository test data and generate a testing strategy JSON.
            Existing Tests: {test_metrics['total']}
            Frameworks: {test_metrics['type']}
            Test Cases: {[tc['name'] for tc in test_details['testCases']]}
            Application Info: {project_info.get('framework_type')}
            
            Return ONLY a valid JSON object strictly matching this structure:
            {{
                "testingScope": "The AI analyzed the existing test coverage...",
                "coverageGaps": ["List of missing coverage areas", "Missing module X"],
                "recommendedStrategy": {{
                    "recommendedTool": "Playwright",
                    "testingType": "UI / E2E",
                    "priority": "High",
                    "target": "Authentication",
                    "reason": "..."
                }},
                "newTestScope": [
                    {{
                        "name": "Verify user login",
                        "description": "Ensure users can log in successfully",
                        "type": "UI / E2E",
                        "tool": "Playwright",
                        "priority": "High"
                    }}
                ]
            }}
            '''
            
            try:
                ai_test_result = ai_client.generate(ai_test_prompt, "You are an expert QA Architect. Output ONLY valid raw JSON with NO markdown blocks and NO formatting.", api_key, model_name)
                ai_test_result = ai_test_result.replace("```json", "").replace("```", "").strip()
                import json
                ai_strategy_json = json.loads(ai_test_result)
                test_metrics["aiStrategy"] = ai_strategy_json
            except Exception as e:
                print(f"Failed to generate AI test strategy: {e}")
                test_metrics["aiStrategy"] = {
                    "testingScope": "Failed to generate dynamic testing strategy.",
                    "coverageGaps": [],
                    "recommendedStrategy": {"testingType": "Unknown", "recommendedTool": "Unknown", "target": "Unknown", "priority": "Unknown", "reason": "Unknown"},
                    "newTestScope": []
                }


            # Build a rich facts section so LLM generates grounded analysis
            detected_facts = (
                f"=== Detected Repository Facts ===\n"
                f"- Build Tool: {project_info.get('build_tool', 'Unknown')}\n"
                f"- Framework Type: {project_info.get('framework_type', 'Unknown')}\n"
                f"- Database: {project_info.get('database', 'None')}\n"
                f"- Packaging: {project_info.get('packaging_type', 'jar')}\n"
                f"- Multi-module: {project_info.get('is_multi_module', False)}\n"
                f"- Has Separate Frontend: {project_info.get('has_frontend', False)} ({project_info.get('frontend_framework', 'None')})\n"
                f"- REST Endpoints Detected: {project_info.get('endpoint_count', 0)}\n"
                f"- Risk Level: {risk_level}\n"
                f"- Deprecated APIs Found: {', '.join(deprecated_apis[:10]) if deprecated_apis else 'None'}\n"
                f"- Spring Boot Version: {framework_versions.get('Spring Boot', 'Not detected')}\n"
                f"- Current Java Version: {current_java_version}\n"
                f"- Planned Migration Target: {recommendation}\n"
            )

            from app.brd_models import FullBrdReport
            raw_schema = FullBrdReport.model_json_schema()
            
            def strip_schema(d):
                if isinstance(d, dict):
                    d.pop('title', None)
                    d.pop('description', None)
                    d.pop('default', None)
                    for k, v in d.items():
                        strip_schema(v)
                elif isinstance(d, list):
                    for v in d:
                        strip_schema(v)
            
            strip_schema(raw_schema)
            import json
            schema_json = json.dumps(raw_schema)
            
            system_instruction = (
                "You are an expert IT Business Analyst, Architect, and QA Lead. "
                "Analyze the provided repository facts, structure, and context to generate a comprehensive Full BRD Report Summary for testing purposes. "
                "CRITICAL: The report MUST be entirely derived from the provided repository context. "
                "DO NOT hallucinate or copy placeholders (like 'Spring Petclinic') unless it is actually present in the provided repository facts. "
                "Ensure that appName, Tech Stack, and all details perfectly match the provided repository. "
                "EXTREMELY IMPORTANT: You MUST fully populate EVERY SINGLE ARRAY and string field in the JSON schema with highly detailed, realistic information inferred from the source code. "
                "DO NOT leave arrays like bizComponents, technicalRisks, architectureIntro, or useCases empty! "
                "If explicit business context is missing, infer the logical business components, use cases, and technical risks based on the code structure, endpoints, and database usage. "
                "Output ONLY a valid JSON object exactly matching this JSON schema, with NO markdown formatting or wrapping:\n"
                f"{schema_json}\n"
                "DO NOT include any information about migration, modernizing to new languages, or recommendations for migration. Focus purely on documenting the existing application as-is for testing and baseline comprehension."
            )

            user_prompt = (
                f"{rag_context}\n\n"
                f"{processing_summary}"
                f"{detected_facts}\n"
                f"Raw Project Files Context:\n{project_context}\n\n"
                "Generate the BRD summary JSON based on these facts."
            )
            
            # Truncate user prompt to ~25,000 characters to stay within Groq's 12,000 token limit
            max_prompt_chars = 25000
            if len(user_prompt) > max_prompt_chars:
                user_prompt = user_prompt[:max_prompt_chars] + "\n... [TRUNCATED due to size limits]"
            
            ai_client = AIFactory.get_client()
            
            try:
                ai_result = ai_client.generate(user_prompt, system_instruction, api_key, model_name)
                # Clean JSON formatting if LLM includes markdown
                cleaned_json = ai_result.replace("```json", "").replace("```", "").strip()
                import json
                brd_data = json.loads(cleaned_json)
                from app.brd_models import FullBrdReport
                try:
                    brd_summary = FullBrdReport(**brd_data)
                except Exception as ve:
                    print(f"Validation error in BRD JSON (falling back to unvalidated construct): {ve}")
                    brd_summary = FullBrdReport.model_construct(**brd_data)
            except Exception as e:
                print(f"Error generating or parsing BRD JSON completely: {e}")
                from app.brd_models import FullBrdReport, Capability, DataStoreInfo
                brd_summary = FullBrdReport.model_construct(
                    appName=repo_url.split('/')[-1].replace('.git', ''),
                    appPurposeDesc=f"This application is a {project_info.get('framework_type', 'Software')} project built using {project_info.get('build_tool', 'a standard build tool')}.",
                    capabilities=[
                        Capability.model_construct(name="Core Business Logic", description="Handles primary application domain logic."),
                        Capability.model_construct(name="Data Persistence", description="Stores and retrieves business data.")
                    ],
                    bizComponents=[
                        "Application Services",
                        "Data Access Layer",
                        "API Controllers"
                    ],
                    techStackSummary=[
                        f"Language: {project_type}",
                        f"Framework: {project_info.get('framework_type')}",
                        f"Build Tool: {project_info.get('build_tool')}",
                        f"Database: {project_info.get('database')}"
                    ],
                    apiGroups=[
                        __import__('app.brd_models', fromlist=['ApiGroup']).ApiGroup.model_construct(
                            name="REST Endpoints",
                            endpoints=[]
                        )
                    ],
                    primaryDataStores=[
                        DataStoreInfo.model_construct(name=project_info.get('database', 'Database'), description="Main application data store")
                    ],
                    modernizationContext=f"Project contains {len(deprecated_apis)} deprecated API usages and uses {project_type} {current_java_version if is_java else ''}. This baseline establishes functional testing boundaries for migration."
                )

            response = AnalysisResponse(
                repoUrl=repo_url,
                projectType=project_type,
                isJava=is_java,
                detectedJavaVersion=current_java_version if is_java else None,
                buildTool=project_info.get("build_tool"),
                frameworkType=project_info.get("framework_type"),
                database=project_info.get("database"),
                packagingType=project_info.get("packaging_type"),
                isMultiModule=project_info.get("is_multi_module", False),
                hasFrontend=project_info.get("has_frontend", False),
                frontendFramework=project_info.get("frontend_framework"),
                endpointCount=project_info.get("endpoint_count", 0),
                riskLevel=risk_level,
                deprecatedApis=deprecated_apis,
                dependencies=dependencies,
                frameworkVersions=framework_versions,
                fullBrdReport=brd_summary,
                errorMessage=None,
                usedProvider=getattr(ai_client, "last_provider_used", None),
                testMetrics=test_metrics,
                existingTestDetails=test_details
            )
            
            # Save to PostgreSQL Database
            from app.database import SessionLocal
            from app.db_models import Repository, Analysis, TestMetric, AIStrategy

            db = SessionLocal()
            try:
                # 1. Upsert Repository
                repo_record = db.query(Repository).filter(Repository.repo_url == repo_url).first()
                if not repo_record:
                    repo_record = Repository(
                        repo_url=repo_url,
                        name=repo_url.split("/")[-1].replace(".git", ""),
                        commit_sha=commit_hash
                    )
                    db.add(repo_record)
                    db.commit()
                    db.refresh(repo_record)
                else:
                    repo_record.commit_sha = commit_hash
                    db.commit()
                
                # 2. Insert Analysis
                new_analysis = Analysis(
                    repository_id=repo_record.id,
                    project_type=project_type,
                    framework=project_info.get("framework_type"),
                    build_tool=project_info.get("build_tool"),
                    database_type=project_info.get("database"),
                    status="completed",
                    full_brd_report=brd_summary.model_dump() if hasattr(brd_summary, "model_dump") else brd_summary,
                    existing_test_details=test_details
                )
                db.add(new_analysis)
                db.commit()
                db.refresh(new_analysis)
                
                # 3. Insert Metrics
                new_metric = TestMetric(
                    analysis_id=new_analysis.id,
                    total=test_metrics.get("total", 0),
                    passed=str(test_metrics.get("passed", "Not Executed")),
                    failed=str(test_metrics.get("failed", "Not Executed")),
                    testing_types=str(test_metrics.get("type", "Not Detected"))
                )
                db.add(new_metric)
                
                # 4. Insert AI Strategy
                ai_strat_dict = test_metrics.get("aiStrategy", {})
                rec_strat = ai_strat_dict.get("recommendedStrategy", {})
                new_strategy = AIStrategy(
                    analysis_id=new_analysis.id,
                    testing_scope_summary=ai_strat_dict.get("testingScope", ""),
                    coverage_gaps=ai_strat_dict.get("coverageGaps", []),
                    recommended_tool=rec_strat.get("recommendedTool", "Unknown"),
                    testing_type=rec_strat.get("testingType", "Unknown"),
                    priority=rec_strat.get("priority", "Unknown"),
                    target=rec_strat.get("target", "Unknown"),
                    reason=rec_strat.get("reason", "Unknown"),
                    new_test_scope=ai_strat_dict.get("newTestScope", [])
                )
                db.add(new_strategy)
                db.commit()
                
            except Exception as db_err:
                import traceback
                traceback.print_exc()
            finally:
                db.close()
                
            return response
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return AnalysisResponse(
                repoUrl=repo_url,
                projectType="Unknown",
                isJava=False,
                errorMessage=str(e)
            )

    def collect_project_context(self, build_dir: Path, clone_dir: Path, context_parts: list, notes: list):
        total_chars = 0

        def append_context(title: str, content: str):
            nonlocal total_chars
            if total_chars >= self.MAX_CONTEXT_CHARS:
                return False
            remaining = self.MAX_CONTEXT_CHARS - total_chars
            if len(content) > remaining:
                content = content[:remaining] + "\n...[TRUNCATED]"
            segment = f"\n\n--- {title} ---\n{content}"
            context_parts.append(segment)
            total_chars += len(segment)
            return total_chars < self.MAX_CONTEXT_CHARS

        def is_skipped(path: Path) -> bool:
            return any(part in self.SKIP_DIRS or part.startswith(".") for part in path.parts[:-1]) or any(skip in path.parts for skip in self.SKIP_DIRS)

        def is_binary(path: Path) -> bool:
            try:
                with open(path, "rb") as f:
                    sample = f.read(4096)
                return b"\x00" in sample
            except Exception:
                return True

        def read_text_limited(path: Path, limit: int) -> tuple[str, bool]:
            try:
                if path.stat().st_size > limit:
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        chunks = []
                        remaining = limit
                        while remaining > 0:
                            piece = f.read(min(8192, remaining))
                            if not piece:
                                break
                            chunks.append(piece)
                            remaining -= len(piece)
                        content = "".join(chunks)
                        return content, True
                return path.read_text(encoding="utf-8", errors="ignore"), False
            except Exception:
                return "", False

        def iter_project_files():
            for root, dirs, files in os.walk(build_dir):
                dirs[:] = [d for d in dirs if d not in self.SKIP_DIRS and not d.startswith(".")]
                for filename in files:
                    yield Path(root) / filename

        config_seen = 0
        config_processed = 0
        config_skipped_large = 0
        config_skipped_binary = 0

        batch = []
        stop_scanning = False
        for path in iter_project_files():
            if path.suffix.lower() not in self.CONFIG_EXTENSIONS:
                continue
            if config_seen >= self.MAX_FILES_PER_CATEGORY:
                config_skipped_large += 1
                continue
            config_seen += 1
            batch.append(path)
            if len(batch) >= self.BATCH_SIZE:
                processed, stop_scanning = self._process_context_batch(batch, clone_dir, append_context, notes, read_text_limited, is_binary)
                config_processed += processed
                batch = []
                if stop_scanning:
                    break
        if batch:
            processed, stop_scanning = self._process_context_batch(batch, clone_dir, append_context, notes, read_text_limited, is_binary)
            config_processed += processed

        if config_seen > 0:
            notes.append(f"Processed {config_processed} configuration files in batches of up to {self.BATCH_SIZE}.")
        if config_skipped_large > 0:
            notes.append(f"Skipped {config_skipped_large} additional configuration files after the safe limit of {self.MAX_FILES_PER_CATEGORY}.")
        if config_skipped_binary > 0:
            notes.append(f"Skipped {config_skipped_binary} binary or unreadable configuration files.")

        if stop_scanning:
            return

        java_imports = set()
        java_seen = 0
        java_skipped_large = 0
        java_skipped_binary = 0
        java_batch = []
        for path in iter_project_files():
            if path.suffix.lower() != ".java":
                continue
            if java_seen >= self.MAX_JAVA_FILES:
                java_skipped_large += 1
                continue
            java_seen += 1
            java_batch.append(path)
            if len(java_batch) >= self.BATCH_SIZE:
                if self._process_java_batch(java_batch, java_imports, notes, read_text_limited, is_binary):
                    break
                java_batch = []
        if java_batch:
            self._process_java_batch(java_batch, java_imports, notes, read_text_limited, is_binary)

        if java_seen > 0:
            notes.append(f"Scanned {min(java_seen, self.MAX_JAVA_FILES)} Java files for import usage in batches of up to {self.BATCH_SIZE}.")
        if java_skipped_large > 0:
            notes.append(f"Skipped {java_skipped_large} additional Java files after the safe limit of {self.MAX_JAVA_FILES}.")
        if java_imports:
            imports_block = "\n".join(sorted(list(java_imports))[: self.MAX_IMPORTS])
            append_context("Unique Java Imports Across Project", imports_block)
            if len(java_imports) > self.MAX_IMPORTS:
                notes.append(f"Trimmed Java imports to the first {self.MAX_IMPORTS} unique entries to stay within prompt limits.")

    def _process_context_batch(self, batch: list, clone_dir: Path, append_context, notes: list, read_text_limited, is_binary) -> tuple[int, bool]:
        processed = 0
        for file_path in batch:
            if is_binary(file_path):
                notes.append(f"Skipped binary file: {file_path.relative_to(clone_dir)}")
                continue
            content, was_truncated = read_text_limited(file_path, self.MAX_CONFIG_FILE_BYTES)
            if not content:
                notes.append(f"Skipped unreadable file: {file_path.relative_to(clone_dir)}")
                continue
            title = f"File: {file_path.relative_to(clone_dir)}"
            if was_truncated:
                notes.append(f"Truncated large file: {file_path.relative_to(clone_dir)}")
            if not append_context(title, content):
                notes.append("Stopped adding file context because the safe prompt size limit was reached.")
                return processed + 1, True
            processed += 1
        return processed, False

    def _process_java_batch(self, batch: list, java_imports: set, notes: list, read_text_limited, is_binary) -> bool:
        for file_path in batch:
            if is_binary(file_path):
                notes.append(f"Skipped binary Java file: {file_path.name}")
                continue
            content, _ = read_text_limited(file_path, self.MAX_JAVA_SCAN_BYTES)
            if not content:
                notes.append(f"Skipped unreadable Java file: {file_path.name}")
                continue
            for line in content.splitlines():
                stripped = line.strip()
                if stripped.startswith("import "):
                    java_imports.add(stripped)
                if len(java_imports) >= self.MAX_IMPORTS:
                    return True
        return False

    def clone_repository(self, repo_url: str, github_token: str = None, local_path: str = None) -> Path:
        if local_path and local_path.strip():
            # Treat the local path as the repository directory
            return Path(local_path.strip())

        repo_name = repo_url.split('/')[-1]
        if repo_name.endswith(".git"):
            repo_name = repo_name[:-4]
            
        clone_dir = app_config.get_project_dir(repo_name)
        
        # Inject token into clone URL if provided
        clone_url = repo_url
        if github_token and github_token.strip() and "github.com" in repo_url:
            clean_url = repo_url.replace("https://", "").replace("http://", "")
            clone_url = f"https://{github_token.strip()}@{clean_url}"

        if clone_dir.exists():
            try:
                repo = Repo(clone_dir)
                repo.git.reset('--hard')
                repo.git.clean('-fd')
                
                # Update remote URL in case token changed
                if 'origin' in repo.remotes:
                    repo.remotes.origin.set_url(clone_url)
                    repo.remotes.origin.pull()
                return clone_dir
            except Exception:
                shutil.rmtree(clone_dir, ignore_errors=True)
                if clone_dir.exists():
                    import subprocess
                    subprocess.run(["cmd", "/c", "rmdir", "/s", "/q", str(clone_dir)], shell=True)
                
                # If STILL exists, it's locked (e.g., by OneDrive or another process). We must use a new folder.
                if clone_dir.exists():
                    import time
                    clone_dir = app_config.workspace_directory / f"{repo_name}_{int(time.time())}"
                
        if not clone_dir.exists() or not list(clone_dir.iterdir()):
            Repo.clone_from(clone_url, clone_dir, depth=1)
            
        # Verify it actually cloned a git repository
        if not (clone_dir / ".git").exists():
            raise Exception(f"Failed to properly clone the repository to {clone_dir}. Check your GitHub URL and Personal Access Token.")

        return clone_dir

    def detect_project_type(self, repo_dir: Path) -> str:
        ext_counts = {}
        self.count_file_extensions(repo_dir, ext_counts)
        
        if (repo_dir / "pom.xml").exists() or (repo_dir / "build.gradle").exists() or ext_counts.get("java", 0) > 0:
            return "Java"
        if (repo_dir / "package.json").exists():
            return "Node.js"
        if (repo_dir / "requirements.txt").exists() or (repo_dir / "pyproject.toml").exists() or ext_counts.get("py", 0) > 0:
            return "Python"
        if list(repo_dir.glob("*.csproj")) or list(repo_dir.glob("*.sln")):
            return ".NET"
        if (repo_dir / "Cargo.toml").exists():
            return "Rust"
        if ext_counts.get("ts", 0) > 0 or ext_counts.get("tsx", 0) > 0:
            return "TypeScript"
        if ext_counts.get("js", 0) > 0 or ext_counts.get("jsx", 0) > 0:
            return "JavaScript"
        if ext_counts.get("c", 0) > 0 or ext_counts.get("cpp", 0) > 0 or ext_counts.get("h", 0) > 0:
            return "C/C++"
        return "Unknown"

    def count_file_extensions(self, directory: Path, ext_counts: dict):
        try:
            for path in directory.iterdir():
                try:
                    if path.is_dir():
                        if not path.name.startswith("."):
                            self.count_file_extensions(path, ext_counts)
                    else:
                        ext = path.suffix.lower()[1:]
                        if ext:
                            ext_counts[ext] = ext_counts.get(ext, 0) + 1
                except OSError:
                    continue
        except OSError:
            pass

    def detect_java_version(self, repo_dir: Path) -> str:
        pom = repo_dir / "pom.xml"
        if pom.exists():
            content = pom.read_text(encoding='utf-8', errors='ignore')
            patterns = [
                r"<java\.version>(.*?)</java\.version>",
                r"<maven\.compiler\.source>(.*?)</maven\.compiler\.source>",
                r"<maven\.compiler\.target>(.*?)</maven\.compiler\.target>",
                r"<maven\.compiler\.release>(.*?)</maven\.compiler\.release>"
            ]
            for p in patterns:
                match = re.search(p, content)
                if match:
                    return self.normalize_java_version(match.group(1).strip())

        gradle = repo_dir / "build.gradle"
        if not gradle.exists():
            gradle = repo_dir / "build.gradle.kts"
            
        if gradle.exists():
            content = gradle.read_text(encoding='utf-8', errors='ignore')
            patterns = [
                r"sourceCompatibility\s*=\s*['\"]?(1\.[0-8]|[0-9]+)['\"]?",
                r"targetCompatibility\s*=\s*['\"]?(1\.[0-8]|[0-9]+)['\"]?",
                r"languageVersion\s*=\s*JavaLanguageVersion\.of\((.*?)\)"
            ]
            for p in patterns:
                match = re.search(p, content)
                if match:
                    return self.normalize_java_version(match.group(1).strip())
                    
        return "8"

    def normalize_java_version(self, version: str) -> str:
        if version.startswith("1."):
            return version[2:]
        return version

    def parse_dependencies_and_frameworks(self, repo_dir: Path, dependencies: list, framework_versions: dict):
        pom = repo_dir / "pom.xml"
        if pom.exists():
            content = pom.read_text(encoding='utf-8', errors='ignore')
            sb_match = re.search(r"<parent>\s*<groupId>org\.springframework\.boot</groupId>\s*<artifactId>spring-boot-starter-parent</artifactId>\s*<version>(.*?)</version>", content)
            if sb_match:
                framework_versions["Spring Boot"] = sb_match.group(1).strip()
                
            dep_matches = re.finditer(r"<artifactId>(spring-boot-starter-.*?|hibernate-.*?|jackson-.*?|lombok)</artifactId>", content)
            dep_set = {m.group(1) for m in dep_matches}
            dependencies.extend(list(dep_set))

        gradle = repo_dir / "build.gradle"
        if not gradle.exists():
            gradle = repo_dir / "build.gradle.kts"
            
        if gradle.exists():
            content = gradle.read_text(encoding='utf-8', errors='ignore')
            sb_match = re.search(r"id\s*['\"]org\.springframework\.boot['\"]\s*version\s*['\"](.*?)['\"]", content)
            if sb_match:
                framework_versions["Spring Boot"] = sb_match.group(1).strip()
                
            dep_matches = re.finditer(r"['\"]org\.springframework\.boot:(spring-boot-starter-.*?):.*?['\"]", content)
            dep_set = {m.group(1) for m in dep_matches}
            dependencies.extend(list(dep_set))

    def detect_comprehensive_project_info(self, build_dir: Path, clone_dir: Path) -> dict:
        info = {
            "build_tool": "Unknown",
            "framework_type": "Plain Java",
            "database": "None",
            "packaging_type": "jar",
            "is_multi_module": False,
            "has_frontend": False,
            "frontend_framework": None,
            "endpoint_count": 0,
        }

        if (build_dir / "pom.xml").exists():
            info["build_tool"] = "Maven"
        elif (build_dir / "build.gradle.kts").exists():
            info["build_tool"] = "Gradle Kotlin DSL"
        elif (build_dir / "build.gradle").exists():
            info["build_tool"] = "Gradle"
        elif (build_dir / "package.json").exists():
            if (build_dir / "pnpm-lock.yaml").exists():
                info["build_tool"] = "pnpm"
            elif (build_dir / "yarn.lock").exists():
                info["build_tool"] = "yarn"
            elif (build_dir / "bun.lockb").exists():
                info["build_tool"] = "bun"
            else:
                info["build_tool"] = "npm"
            info["framework_type"] = "Node.js"
        elif (build_dir / "pyproject.toml").exists():
            content = (build_dir / "pyproject.toml").read_text(errors='ignore')
            if "poetry" in content:
                info["build_tool"] = "Poetry"
            elif "uv" in content:
                info["build_tool"] = "uv"
            else:
                info["build_tool"] = "pip (pyproject.toml)"
            info["framework_type"] = "Python"
        elif (build_dir / "requirements.txt").exists():
            info["build_tool"] = "pip"
            info["framework_type"] = "Python"
        elif list(build_dir.glob("*.csproj")):
            info["build_tool"] = "dotnet"
            info["framework_type"] = ".NET"
        elif (build_dir / "Cargo.toml").exists():
            info["build_tool"] = "cargo"
            info["framework_type"] = "Rust"

        build_content = ""
        for bf in [build_dir / "pom.xml", build_dir / "build.gradle", build_dir / "build.gradle.kts"]:
            if bf.exists():
                try:
                    build_content = bf.read_text(encoding="utf-8", errors="ignore").lower()
                except Exception:
                    pass
                break

        if build_content:
            if "spring-boot" in build_content:
                if "thymeleaf" in build_content:
                    info["framework_type"] = "Spring Boot / Thymeleaf"
                elif "jsp" in build_content or "jstl" in build_content or "tomcat-embed-jasper" in build_content:
                    info["framework_type"] = "Spring Boot / JSP"
                elif "spring-boot-starter-web" in build_content or "spring-webmvc" in build_content:
                    info["framework_type"] = "Spring Boot / Web MVC"
                elif "spring-boot-starter-webflux" in build_content:
                    info["framework_type"] = "Spring Boot / WebFlux (Reactive)"
                elif "spring-boot-starter-data" in build_content:
                    info["framework_type"] = "Spring Boot / Data Only"
                else:
                    info["framework_type"] = "Spring Boot"
            elif "spring-webmvc" in build_content or "spring-web" in build_content:
                info["framework_type"] = "Spring MVC (Non-Boot)"
            elif "javax.servlet" in build_content or "jakarta.servlet" in build_content or "servlet-api" in build_content:
                info["framework_type"] = "JSP/Servlet"
            elif "javafx" in build_content:
                info["framework_type"] = "JavaFX"

            if "mysql-connector" in build_content or "com.mysql" in build_content:
                info["database"] = "MySQL"
            elif "postgresql" in build_content or "org.postgresql" in build_content:
                info["database"] = "PostgreSQL"
            elif "mssql" in build_content or "sqlserver" in build_content:
                info["database"] = "SQL Server"
            elif "oracle" in build_content and "jdbc" in build_content:
                info["database"] = "Oracle"
            elif "mongodb" in build_content or "spring-data-mongodb" in build_content:
                info["database"] = "MongoDB"
            elif "com.h2database" in build_content or "h2" in build_content:
                info["database"] = "H2 (Embedded)"

            if "<packaging>war</packaging>" in build_content or "apply plugin: 'war'" in build_content or 'id "war"' in build_content:
                info["packaging_type"] = "war"

            if "<modules>" in build_content or "subprojects" in build_content or "include(" in build_content:
                info["is_multi_module"] = True

        for package_json in clone_dir.rglob("package.json"):
            if any(skip in package_json.parts for skip in ("node_modules", "target", "build", ".git")):
                continue
            try:
                import json
                pkg = json.loads(package_json.read_text(encoding="utf-8", errors="ignore"))
                deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
                if any(k.startswith("@angular") for k in deps):
                    info["has_frontend"] = True
                    info["frontend_framework"] = "Angular"
                elif "react" in deps or "react-dom" in deps:
                    info["has_frontend"] = True
                    info["frontend_framework"] = "React"
                elif "vue" in deps:
                    info["has_frontend"] = True
                    info["frontend_framework"] = "Vue"
                else:
                    info["has_frontend"] = True
                    info["frontend_framework"] = "Node.js"
                break
            except Exception:
                pass

        if not info["has_frontend"]:
            for pattern in ("src/main/resources/templates", "src/main/webapp", "src/main/resources/static"):
                if (build_dir / pattern).exists():
                    info["has_frontend"] = True
                    if "Thymeleaf" in info["framework_type"]:
                        info["frontend_framework"] = "Thymeleaf"
                    elif "JSP" in info["framework_type"]:
                        info["frontend_framework"] = "JSP"
                    else:
                        info["frontend_framework"] = "Static HTML"
                    break

        endpoint_count = 0
        mapping_pattern = re.compile(
            r'@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping|RequestMapping|app\.get|app\.post|router\.get|router\.post|@app\.get|@app\.post|@router\.get)',
            re.IGNORECASE
        )
        for src_file in build_dir.rglob("*.*"):
            if src_file.suffix not in {".java", ".py", ".ts", ".js"}:
                continue
            if any(p in src_file.parts for p in ("target", "build", ".git", "node_modules", "venv", "__pycache__")):
                continue
            try:
                content = src_file.read_text(encoding="utf-8", errors="ignore")
                endpoint_count += len(mapping_pattern.findall(content))
            except Exception:
                pass
        info["endpoint_count"] = endpoint_count

        return info

    def detect_deprecated_apis(self, build_dir: Path) -> list:
        deprecated_patterns = [
            ("javax.xml.bind", "javax.xml.bind (JAXB removed in Java 11, needs jakarta.xml.bind)"),
            ("javax.activation", "javax.activation (removed in Java 11)"),
            ("javax.annotation", "javax.annotation (moved to jakarta.annotation)"),
            ("com.sun.misc.Unsafe", "sun.misc.Unsafe (strongly restricted in Java 17+)"),
            ("sun.reflect", "sun.reflect (removed in Java 17)"),
            ("java.security.acl", "java.security.acl (removed in Java 17)"),
            ("javax.security.auth.Policy", "javax.security.auth.Policy (removed)"),
            ("Thread.stop()", "Thread.stop() (deprecated for removal)"),
            ("Thread.suspend()", "Thread.suspend() (deprecated for removal)"),
            ("Thread.resume()", "Thread.resume() (deprecated for removal)"),
            ("System.runFinalizersOnExit", "System.runFinalizersOnExit (removed)"),
            ("Runtime.runFinalizersOnExit", "Runtime.runFinalizersOnExit (removed)"),
            ("java.util.Date.toLocaleString", "Date.toLocaleString() (deprecated)"),
            ("new Integer(", "new Integer() constructor (deprecated, use Integer.valueOf())"),
            ("new Long(", "new Long() constructor (deprecated, use Long.valueOf())"),
            ("new Boolean(", "new Boolean() constructor (deprecated, use Boolean.valueOf())"),
        ]
        
        found = []
        scanned = 0
        for java_file in build_dir.rglob("*.java"):
            if any(p in java_file.parts for p in ("target", "build", ".git")):
                continue
            if scanned >= 100:
                break
            try:
                content = java_file.read_text(encoding="utf-8", errors="ignore")
                for pattern, description in deprecated_patterns:
                    if pattern in content and description not in found:
                        found.append(description)
                scanned += 1
            except Exception:
                pass
        return found

    def _calculate_risk_level(self, current_version: int, deprecated_apis: list, project_info: dict) -> str:
        score = 0
        if current_version <= 8:
            score += 3
        elif current_version <= 11:
            score += 2
        elif current_version <= 16:
            score += 1
        score += min(len(deprecated_apis), 3)
        if project_info.get("is_multi_module"):
            score += 1
        if project_info.get("database") not in ("None", "H2 (Embedded)", None):
            score += 1
        if project_info.get("packaging_type") == "war":
            score += 1

        if score >= 6:
            return "High"
        elif score >= 3:
            return "Medium"
        return "Low"

    def find_build_file_directory(self, root_dir: Path) -> Path:
        for child in root_dir.iterdir():
            if child.is_dir() and not child.name.startswith("."):
                if (child / "pom.xml").exists() or (child / "build.gradle").exists() or (child / "build.gradle.kts").exists():
                    return child
        return None

analysis_service = AnalysisService()
