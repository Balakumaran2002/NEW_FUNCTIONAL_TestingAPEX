import os
import subprocess
import re
from pathlib import Path
from git import Repo
from app.config import app_config
from app.models import MigrationResponse
from app.services.build_validation_service import build_validation_service
from app.ai.ai_factory import AIFactory

class MigrationService:
    def migrate_repository(self, repo_url: str, target_version: str, api_key: str, model_name: str) -> MigrationResponse:
        try:
            repo_name = repo_url.split('/')[-1]
            if repo_name.endswith(".git"):
                repo_name = repo_name[:-4]
            
            project_dir = app_config.get_project_dir(repo_name)
            if not project_dir.exists():
                return MigrationResponse(
                    success=False,
                    targetVersion=target_version,
                    buildStatus="Failed",
                    errorMessage="Project directory not found. Run analysis first."
                )

            # Find actual build dir (handles monorepos)
            build_dir = project_dir
            if not (build_dir / "pom.xml").exists() and not (build_dir / "build.gradle").exists() and not (build_dir / "build.gradle.kts").exists():
                sub_dir = self.find_build_file_directory(project_dir)
                if sub_dir:
                    build_dir = sub_dir
            
            output_log = []
            
            is_maven = (build_dir / "pom.xml").exists()
            is_gradle = (build_dir / "build.gradle").exists() or (build_dir / "build.gradle.kts").exists()
            
            # First pass
            if is_maven:
                success = self.run_maven_migration(build_dir, target_version, output_log)
            elif is_gradle:
                success = self.run_gradle_migration(build_dir, target_version, output_log)
            else:
                return MigrationResponse(
                    success=False,
                    targetVersion=target_version,
                    buildStatus="Failed",
                    errorMessage="No supported build tool found."
                )

            # Validate the build after migration
            build_result = build_validation_service.validate_build(build_dir, is_maven, api_key, model_name)
            
            # Auto-healing retry: If migration failed due to compile errors, but AI validation successfully fixed them, run migration again!
            if not success and build_result["success"] and len(build_result.get("fixHistory", [])) > 0:
                output_log.append("\n=== Auto-Healing triggered! Retrying OpenRewrite after AI build fixes ===")
                if is_maven:
                    success = self.run_maven_migration(build_dir, target_version, output_log)
                elif is_gradle:
                    success = self.run_gradle_migration(build_dir, target_version, output_log)
                
                # Re-validate the build after the second migration attempt
                build_result = build_validation_service.validate_build(build_dir, is_maven, api_key, model_name)

            modified_files = self.get_modified_files(project_dir)

            detailed_report = None
            diff_output = ""
            if len(modified_files) > 0:
                try:
                    diff_output = subprocess.check_output(["git", "diff"], cwd=str(project_dir), text=True, errors='replace')
                    if diff_output.strip():
                        diff_text = diff_output[:15000]
                        prompt = f"""Generate a detailed migration report for the following git diff.
You MUST return your answer STRICTLY as a valid, parsable JSON object. Do not include markdown formatting like ```json or anything outside the curly braces.

The JSON object must have the following schema:
{{
  "accuracy": 99,
  "percentage_migrated": 100,
  "files": [
    {{
      "filename": "string",
      "before_code": "string",
      "after_code": "string",
      "explanation": "string"
    }}
  ],
  "dependencies": [
    {{
      "name": "string",
      "old_version": "string",
      "new_version": "string",
      "reason": "string"
    }}
  ]
}}

Here is the diff:
```diff
{diff_text}
```"""
                        ai_client = AIFactory.get_client()
                        detailed_report = ai_client.generate(prompt, api_key=api_key, model_name=model_name)
                except Exception as e:
                    detailed_report = f"Failed to generate detailed report: {e}"

            # Prepare the response
            return MigrationResponse(
                success=success,
                targetVersion=target_version,
                modifiedFiles=modified_files,
                migrationSummary="\n".join(output_log),
                buildStatus=build_result["status"],
                buildErrors=None if build_result["success"] else build_result["buildLog"],
                suggestedFixes=build_result["suggestedFixes"],
                detailedReport=detailed_report,
                gitDiff=diff_output,
                fixHistory=build_result.get("fixHistory", []),
                usedProvider=getattr(ai_client, "last_provider_used", None) if 'ai_client' in locals() else None
            )
            
        except Exception as e:
            return MigrationResponse(
                success=False,
                targetVersion=target_version,
                buildStatus="Failed",
                errorMessage=str(e)
            )

    def run_maven_migration(self, project_dir: Path, target_version: str, output_log: list) -> bool:
        is_windows = os.name == 'nt'
        mvn_cmd = "mvn.cmd" if is_windows else "mvn"
        
        # Fallback to bundled maven
        local_maven = app_config.project_root / "apache-maven-3.9.6" / "bin" / mvn_cmd
        if local_maven.exists():
            mvn_cmd = str(local_maven)
            
        wrapper = project_dir / ("mvnw.cmd" if is_windows else "mvnw")
        wrapper_jar = project_dir / ".mvn" / "wrapper" / "maven-wrapper.jar"
        
        if wrapper.exists() and wrapper_jar.exists():
            if not is_windows:
                os.chmod(str(wrapper), 0o755)
            mvn_cmd = str(wrapper)

        # Apply pre-migration fixes
        pom = project_dir / "pom.xml"
        if pom.exists():
            content = pom.read_text(encoding='utf-8', errors='ignore')
            if "http://repo.spring.io" in content:
                content = content.replace("http://repo.spring.io", "https://repo.spring.io")
            if "wro4j-maven-plugin" in content:
                content = re.sub(r'(?s)<plugin>\s*<groupId>ro\.isdc\.wro4j</groupId>.*?</plugin>', '', content)
            
            # Bump Lombok to 1.18.34 to prevent JDK 21 compiler crash
            content = re.sub(r'<lombok\.version>1\.18\.[0-9]+</lombok\.version>', '<lombok.version>1.18.34</lombok.version>', content)
            content = re.sub(r'<version>1\.18\.[0-9]+</version>\s*<!--\s*lombok\s*-->', '<version>1.18.34</version>', content)

            # Force upgrade Java compiler properties to the target version
            content = re.sub(r'<java\.version>.*?</java\.version>', f'<java.version>{target_version}</java.version>', content)
            content = re.sub(r'<maven\.compiler\.source>.*?</maven\.compiler\.source>', f'<maven.compiler.source>{target_version}</maven.compiler.source>', content)
            content = re.sub(r'<maven\.compiler\.target>.*?</maven\.compiler\.target>', f'<maven.compiler.target>{target_version}</maven.compiler.target>', content)
            
            # Force upgrade hardcoded maven-compiler-plugin configuration if it exists
            content = re.sub(r'<source>(?:1\.[0-8]|[0-9]+)</source>', f'<source>{target_version}</source>', content)
            content = re.sub(r'<target>(?:1\.[0-8]|[0-9]+)</target>', f'<target>{target_version}</target>', content)
            content = re.sub(r'<release>(?:1\.[0-8]|[0-9]+)</release>', f'<release>{target_version}</release>', content)
            
            pom.write_text(content, encoding='utf-8')

            has_spring_boot = "spring-boot" in content
            has_javax = "javax" in content
            has_hibernate = "hibernate" in content
            has_junit = "junit" in content
            
        phases = []
        if target_version == "11":
            phases.append("org.openrewrite.java.migrate.Java8toJava11")
        else:
            phases.append(f"org.openrewrite.java.migrate.UpgradeToJava{target_version}")
        
        if (has_javax or has_hibernate) and (target_version == "17" or target_version == "21" or target_version == "25"):
            jakarta_recipes = []
            if has_javax:
                jakarta_recipes.append("org.openrewrite.java.migrate.jakarta.JavaxMigrationToJakarta")
            if has_hibernate:
                jakarta_recipes.append("org.openrewrite.hibernate.Hibernate5To6Migration")
            phases.append(",".join(jakarta_recipes))
            
        if has_spring_boot and (target_version == "17" or target_version == "21" or target_version == "25"):
            phases.append("org.openrewrite.java.spring.boot3.UpgradeSpringBoot_3_2")

        if has_junit:
            phases.append("org.openrewrite.java.testing.junit5.JUnit5BestPractices")

        all_recipes = ",".join(phases)
        output_log.append(f"\n--- Starting Migration ---")
        command = [
            mvn_cmd, "-B", "-T", "1C",
            "org.openrewrite.maven:rewrite-maven-plugin:run",
            "-Drewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-migrate-java:RELEASE,org.openrewrite.recipe:rewrite-spring:RELEASE",
            f"-Drewrite.activeRecipes={all_recipes}",
            "-DskipTests=true",
            "-Dmaven.test.skip=true"
        ]
        overall_success = self.execute_process(command, project_dir, output_log)
        return overall_success

    def run_gradle_migration(self, project_dir: Path, target_version: str, output_log: list) -> bool:
        is_windows = os.name == 'nt'
        gradle_cmd = "gradle.bat" if is_windows else "gradle"
        
        wrapper = project_dir / ("gradlew.bat" if is_windows else "gradlew")
        if wrapper.exists():
            if not is_windows:
                os.chmod(str(wrapper), 0o755)
            gradle_cmd = str(wrapper)
            
        has_spring_boot = False
        has_javax = False
        has_hibernate = False
        has_junit = False
        
        build_gradle = project_dir / "build.gradle"
        if not build_gradle.exists():
            build_gradle = project_dir / "build.gradle.kts"
            
        if build_gradle.exists():
            content = build_gradle.read_text(encoding='utf-8', errors='ignore')
            has_spring_boot = "spring-boot" in content
            has_javax = "javax" in content
            has_hibernate = "hibernate" in content
            has_junit = "junit" in content

        phases = []
        if target_version == "11":
            phases.append("org.openrewrite.java.migrate.Java8toJava11")
        else:
            phases.append(f"org.openrewrite.java.migrate.UpgradeToJava{target_version}")
        
        if (has_javax or has_hibernate) and (target_version == "17" or target_version == "21" or target_version == "25"):
            jakarta_recipes = []
            if has_javax:
                jakarta_recipes.append("org.openrewrite.java.migrate.jakarta.JavaxMigrationToJakarta")
            if has_hibernate:
                jakarta_recipes.append("org.openrewrite.hibernate.Hibernate5To6Migration")
            phases.append(",".join(jakarta_recipes))
            
        if has_spring_boot and (target_version == "17" or target_version == "21" or target_version == "25"):
            phases.append("org.openrewrite.java.spring.boot3.UpgradeSpringBoot_3_2")

        if has_junit:
            phases.append("org.openrewrite.java.testing.junit5.JUnit5BestPractices")

        all_recipes = ",".join(phases)
        output_log.append(f"\n--- Starting Migration ---")
        command = [
            gradle_cmd,
            "rewriteRun",
            f"-DactiveRecipe={all_recipes}",
            "-x", "test"
        ]
        
        overall_success = self.execute_process(command, project_dir, output_log)
        return overall_success

    def execute_process(self, command: list, project_dir: Path, output_log: list) -> bool:
        from app.services.java_runtime_service import java_runtime_service
        env, _ = java_runtime_service.prepare_env(os.environ.copy(), project_dir=project_dir)

        try:
            process = subprocess.Popen(
                command,
                cwd=str(project_dir),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                errors='replace',
                env=env
            )
            for line in iter(process.stdout.readline, ''):
                output_log.append(line.rstrip())
            process.wait()
            return process.returncode == 0
        except Exception as e:
            output_log.append(f"Execution Exception: {str(e)}")
            return False

    def get_modified_files(self, repo_dir: Path) -> list:
        try:
            repo = Repo(repo_dir)
            modified = [item.a_path for item in repo.index.diff(None)]
            untracked = repo.untracked_files
            return modified + untracked
        except Exception:
            return []

    def find_build_file_directory(self, root_dir: Path) -> Path:
        for child in root_dir.iterdir():
            if child.is_dir() and not child.name.startswith("."):
                if (child / "pom.xml").exists() or (child / "build.gradle").exists() or (child / "build.gradle.kts").exists():
                    return child
        return None

migration_service = MigrationService()
