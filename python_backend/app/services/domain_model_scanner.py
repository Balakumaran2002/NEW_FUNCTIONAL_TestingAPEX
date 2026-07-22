import os
import re
from pathlib import Path
from typing import List, Dict, Any
from app.brd_models import BusinessDomainInfo, BusinessModelInfo, ClassAttribute

class RepositoryDomainModelScanner:
    def __init__(self, clone_dir: str):
        self.clone_dir = Path(clone_dir)
        self.source_files = []
        self._collect_files()

    def _collect_files(self):
        ignore_dirs = {'.git', 'node_modules', 'venv', '__pycache__', 'dist', 'build', 'target', 'out', '.next'}
        for root, dirs, files in os.walk(self.clone_dir):
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            for f in files:
                ext = f.lower().split('.')[-1]
                if ext in {'java', 'py', 'js', 'jsx', 'ts', 'tsx', 'cs', 'go', 'php', 'rb', 'sql', 'json', 'html', 'vue'}:
                    p = Path(root) / f
                    try:
                        rel = p.relative_to(self.clone_dir).as_posix()
                        self.source_files.append((p, rel, f, ext))
                    except Exception:
                        pass

    def scan(self) -> Dict[str, Any]:
        domains = self._detect_business_domains()
        models = self._detect_business_models()
        return {
            "businessDomains": domains,
            "businessModels": models
        }

    def _detect_business_domains(self) -> List[BusinessDomainInfo]:
        domain_groups: Dict[str, Dict[str, Any]] = {}

        # Keywords for domain inferencing
        ignore_keywords = {'config', 'common', 'utils', 'helper', 'base', 'shared', 'core', 'app', 'internal', 'dto', 'model', 'entity', 'repository', 'service', 'controller'}

        for path, rel_path, filename, ext in self.source_files:
            parts = [p.lower() for p in rel_path.split('/')]
            
            # Look for domain packages or directory names
            candidate_names = []
            for part in rel_path.split('/'):
                clean_part = re.sub(r'[^a-zA-Z0-9]', '', part)
                if clean_part and clean_part.lower() not in ignore_keywords and not clean_part.endswith(('.java', '.py', '.js', '.jsx', '.ts', '.tsx', '.cs', '.go', '.html', '.css', '.json')):
                    candidate_names.append(clean_part)

            # Determine domain title
            domain_name = None
            if candidate_names:
                domain_name = candidate_names[-1].capitalize()
                if not domain_name.endswith('Management') and not domain_name.endswith('Service') and not domain_name.endswith('System'):
                    domain_name = f"{domain_name.capitalize()} Management"
            
            # Infer from controller/service filenames if package is too generic
            if not domain_name or domain_name.lower() in {'api management', 'main management', 'src management'}:
                base_name = re.sub(r'(Controller|Service|Repository|Component|View|Page|Entity|Model|\.java|\.py|\.jsx|\.tsx|\.ts|\.js)', '', filename, flags=re.IGNORECASE)
                base_name = re.sub(r'([a-z])([A-Z])', r'\1 \2', base_name).strip()
                if base_name and len(base_name) > 2 and base_name.lower() not in ignore_keywords:
                    domain_name = f"{base_name.capitalize()} Management"

            if not domain_name or len(domain_name) < 4:
                continue

            if domain_name not in domain_groups:
                domain_groups[domain_name] = {
                    "modules": set(),
                    "controllers": set(),
                    "services": set(),
                    "entities": set(),
                    "apis": set(),
                    "ui": set(),
                    "files": set(),
                    "rules": set(),
                    "validations": set()
                }

            group = domain_groups[domain_name]
            group["files"].add(rel_path)
            
            # Categorize component type
            lower_fn = filename.lower()
            if 'controller' in lower_fn or 'router' in lower_fn or 'api' in lower_fn or 'endpoint' in lower_fn:
                group["controllers"].add(filename)
                group["apis"].add(f"REST API ({filename})")
            elif 'service' in lower_fn or 'manager' in lower_fn or 'handler' in lower_fn:
                group["services"].add(filename)
            elif 'entity' in lower_fn or 'model' in lower_fn or 'domain' in lower_fn:
                group["entities"].add(filename.split('.')[0])
            elif ext in {'jsx', 'tsx', 'html', 'vue'}:
                group["ui"].add(filename)

            # Extract package module
            if '/' in rel_path:
                group["modules"].add(os.path.dirname(rel_path))

            # Inspect content for validation/business rules
            try:
                content = path.read_text(encoding='utf-8', errors='ignore')
                if '@NotNull' in content or '@NotEmpty' in content or 'required' in content:
                    group["validations"].add("Input format and mandatory field enforcement")
                if 'validate' in content.lower() or 'check' in content.lower():
                    group["validations"].add("Business constraint and invariant checking")
                if '@Transactional' in content or 'transaction' in content.lower():
                    group["rules"].add("Atomic transaction consistency across entity state changes")
                if 'auth' in content.lower() or 'role' in content.lower() or 'permission' in content.lower():
                    group["rules"].add("Role-based access authorization for domain actions")
            except Exception:
                pass

        # Convert groups to BusinessDomainInfo objects
        result_domains = []
        for name, data in domain_groups.items():
            if len(data["files"]) < 1:
                continue
            
            controllers = sorted(list(data["controllers"]))
            services = sorted(list(data["services"]))
            entities = sorted(list(data["entities"]))
            apis = sorted(list(data["apis"]))
            ui_comps = sorted(list(data["ui"]))
            modules = sorted(list(data["modules"]))
            
            funcs = [
                f"Core operations for {name.replace(' Management', '')}",
                f"Data persistence & query orchestration for {name.replace(' Management', '')}",
                f"Business validation & constraint enforcement"
            ]
            
            rules = list(data["rules"]) or ["System state preservation", "Data integrity validation"]
            validations = list(data["validations"]) or ["Required field checks", "Type & format bounds verification"]
            
            reasoning = (
                f"Identified '{name}' based on {len(data['files'])} repository source file(s) across module(s) {', '.join(modules[:3]) or 'root'}. "
                f"Supported by controller(s) [{', '.join(controllers[:2]) or 'N/A'}], service(s) [{', '.join(services[:2]) or 'N/A'}], "
                f"and entity model(s) [{', '.join(entities[:2]) or 'N/A'}]."
            )
            
            result_domains.append(BusinessDomainInfo(
                name=name,
                purpose=f"Orchestrates end-to-end workflow, data access, and API contract logic for {name.replace(' Management', '')}.",
                overallResponsibility=f"Manages domain lifecycle, business rules, API handlers, and data persistence for {name.replace(' Management', '')}.",
                functionalities=funcs,
                relatedModules=modules[:5],
                controllersInvolved=controllers[:5],
                servicesInvolved=services[:5],
                entitiesUsed=entities[:5],
                apisInvolved=apis[:5],
                uiComponentsInvolved=ui_comps[:5],
                businessRules=rules,
                validationRules=validations,
                relationships=[f"Integrates with shared data persistence layer and application routing"],
                dependencies=[f"Core Framework", f"Database Persistence Engine"],
                aiReasoning=reasoning
            ))

        # Fallback default domains if repository structure is completely flat
        if not result_domains:
            result_domains = [
                BusinessDomainInfo(
                    name="Core Business Capabilities",
                    purpose="Main business logic engine handling core domain transactions and entity operations.",
                    overallResponsibility="Executes primary application workflows and data processing pipelines.",
                    functionalities=["Entity lifecycle management", "API request processing", "State persistence"],
                    relatedModules=["src/"],
                    controllersInvolved=["API Router / Controllers"],
                    servicesInvolved=["Business Service Layer"],
                    entitiesUsed=["Domain Models"],
                    apisInvolved=["Application REST Endpoints"],
                    uiComponentsInvolved=["Web Views / Components"],
                    businessRules=["Data consistency enforcement", "Workflow validation"],
                    validationRules=["Schema verification", "Mandatory parameter checks"],
                    relationships=["Database layer"],
                    dependencies=["Application Framework"],
                    aiReasoning="Inferred from repository project layout and source code file organization."
                )
            ]

        return result_domains[:8]

    def _detect_business_models(self) -> List[BusinessModelInfo]:
        model_list = []

        for path, rel_path, filename, ext in self.source_files:
            lower_fn = filename.lower()
            
            is_model_file = (
                'entity' in rel_path.lower() or 
                'model' in rel_path.lower() or 
                'domain' in rel_path.lower() or 
                'dto' in rel_path.lower() or
                lower_fn.endswith(('entity.java', 'model.java', 'dto.java', 'schema.js', 'schema.ts'))
            )

            if not is_model_file and ext not in {'java', 'py', 'ts', 'cs'}:
                continue

            try:
                content = path.read_text(encoding='utf-8', errors='ignore')
            except Exception:
                continue

            # Check if file contains class/entity definition
            if is_model_file or any(ann in content.lower() for ann in ['@entity', '@table', 'class ']):
                # Extract class name
                class_matches = re.findall(r'(?:public\s+)?class\s+([A-Z][a-zA-Z0-9_]+)', content)
                if not class_matches and ext == 'py':
                    class_matches = re.findall(r'class\s+([A-Z][a-zA-Z0-9_]+)', content)

                for class_name in class_matches:
                    if class_name.endswith(('Test', 'Tests', 'Config', 'Application', 'Service', 'Controller', 'Repository', 'Util', 'Helper', 'Filter', 'Handler')):
                        continue

                    # Extract attributes/fields
                    attributes = []
                    fields_raw = re.findall(r'(?:private|protected|public)\s+([A-Z][a-zA-Z0-9_<>,\s]+)\s+([a-zA-Z0-9_]+);', content)
                    for ftype, fname in fields_raw[:10]:
                        attributes.append(ClassAttribute(name=fname, type=ftype.strip()))

                    if not attributes and ext == 'py':
                        py_fields = re.findall(r'([a-zA-Z0-9_]+):\s*([a-zA-Z0-9_\[\]]+)', content)
                        for fname, ftype in py_fields[:10]:
                            if fname not in {'self', 'def', 'cls'}:
                                attributes.append(ClassAttribute(name=fname, type=ftype))

                    # Infer relationships
                    rel = []
                    if '@OneToMany' in content or 'OneToMany' in content: rel.append("One-to-Many Relationship")
                    if '@ManyToOne' in content or 'ManyToOne' in content: rel.append("Many-to-One Relationship")
                    if '@ManyToMany' in content or 'ManyToMany' in content: rel.append("Many-to-Many Relationship")
                    if '@OneToOne' in content or 'OneToOne' in content: rel.append("One-to-One Relationship")
                    if not rel: rel.append("Domain Entity Model")

                    # Look for associated controllers/services/repositories
                    base_name = class_name
                    ctrl = f"{base_name}Controller" if any(base_name in f[2] for f in self.source_files if 'controller' in f[2].lower()) else "API Router"
                    srv = f"{base_name}Service" if any(base_name in f[2] for f in self.source_files if 'service' in f[2].lower()) else "Business Service"
                    repo = f"{base_name}Repository" if any(base_name in f[2] for f in self.source_files if 'repository' in f[2].lower() or 'dao' in f[2].lower()) else "Data Access Component"

                    explanation = (
                        f"Detected '{class_name}' as a core business model in file '{rel_path}'. "
                        f"Contains {len(attributes)} attributes ({', '.join([a.name for a in attributes[:3]]) or 'fields'}). "
                        f"Linked with {ctrl}, {srv}, and {repo}."
                    )

                    model_list.append(BusinessModelInfo(
                        name=class_name,
                        purpose=f"Represents core domain data structure and persistence entity for {class_name}.",
                        description=f"Business entity encapsulated in {rel_path} managing state and domain attributes for {class_name}.",
                        attributes=attributes or [ClassAttribute(name="id", type="Long/String"), ClassAttribute(name="name", type="String")],
                        relationships=rel,
                        associatedControllers=[ctrl],
                        associatedServices=[srv],
                        associatedRepositories=[repo],
                        apisUsingModel=[f"REST Endpoints managing {class_name}"],
                        businessRules=[f"{class_name} state integrity", "Unique identifier constraint"],
                        validationRules=["Non-null identifier", "Field type and constraint validation"],
                        crudOperations=["Create", "Read", "Update", "Delete", "Search"],
                        workflowInvolvement=f"Participates in {class_name} creation, updating, and domain retrieval workflows.",
                        relatedModules=[os.path.dirname(rel_path) or 'root'],
                        aiExplanation=explanation
                    ))

        # Deduplicate models by name
        unique_models = {}
        for m in model_list:
            if m.name not in unique_models:
                unique_models[m.name] = m

        final_models = list(unique_models.values())
        return final_models[:12]
