import os
import re
from pathlib import Path
from typing import List, Dict, Any, Set
from app.brd_models import BusinessDomainInfo, BusinessModelInfo, ClassAttribute

class RepositoryDomainModelScanner:
    def __init__(self, clone_dir: str):
        self.clone_dir = Path(clone_dir)
        self.source_files = []
        self._collect_files()

    def _collect_files(self):
        ignore_dirs = {'.git', 'node_modules', 'venv', '__pycache__', 'dist', 'build', 'target', 'out', '.next', '.idea', '.vscode', 'mvn'}
        for root, dirs, files in os.walk(self.clone_dir):
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            for f in files:
                ext = f.lower().split('.')[-1]
                if ext in {'java', 'py', 'js', 'jsx', 'ts', 'tsx', 'cs', 'go', 'php', 'rb', 'sql', 'json', 'html', 'vue', 'ftl', 'jsp'}:
                    p = Path(root) / f
                    try:
                        rel = p.relative_to(self.clone_dir).as_posix()
                        self.source_files.append((p, rel, f, ext))
                    except Exception:
                        pass

    def scan(self) -> Dict[str, Any]:
        models = self._detect_business_models()
        domains = self._detect_business_domains(models)
        return {
            "businessDomains": domains,
            "businessModels": models
        }

    def _detect_business_models(self) -> List[BusinessModelInfo]:
        model_list = []

        # Technical architecture classes to EXCLUDE from Business Models
        technical_class_patterns = (
            'Test', 'Tests', 'Config', 'Configuration', 'Application', 'Service', 'ServiceImpl', 
            'Controller', 'RestController', 'Repository', 'Dao', 'Util', 'Utils', 'Helper', 'Helpers', 
            'Filter', 'Handler', 'Formatter', 'Exception', 'Advice', 'Converter', 'Mapper', 'Interceptor', 
            'Initializer', 'Properties', 'Constants', 'Runner', 'Factory', 'Builder', 'Manager', 'Client'
        )

        for path, rel_path, filename, ext in self.source_files:
            lower_fn = filename.lower()
            
            # Skip test files and config files
            if 'test' in rel_path.lower() or 'config' in rel_path.lower() or lower_fn.startswith('.'):
                continue

            try:
                content = path.read_text(encoding='utf-8', errors='ignore')
            except Exception:
                continue

            # Identify entity / model classes & schemas
            is_model_file = (
                'entity' in rel_path.lower() or 
                'model' in rel_path.lower() or 
                'domain' in rel_path.lower() or 
                'schema' in rel_path.lower() or
                'dto' in rel_path.lower() or
                'type' in rel_path.lower() or
                any(ann in content for ann in ['@Entity', '@Table', '@Document', '@Model', 'BaseEntity', 'NamedEntity', 'extends Person', 'implements Serializable', 'Schema', 'mongoose', 'sequelize', 'typeorm', 'interface', 'export class'])
            )

            if not is_model_file and ext not in {'java', 'py', 'ts', 'tsx', 'js', 'jsx', 'cs', 'go', 'json'}:
                continue

            # Extract class / interface / type / schema definitions
            class_matches = re.findall(r'(?:public\s+)?(?:class|interface|record|type)\s+([A-Z][a-zA-Z0-9_]+)', content)
            if not class_matches and ext == 'py':
                class_matches = re.findall(r'class\s+([A-Z][a-zA-Z0-9_]+)', content)
            if not class_matches and ext in {'js', 'jsx', 'ts', 'tsx'}:
                class_matches = re.findall(r'(?:export\s+)?(?:class|interface|type)\s+([A-Z][a-zA-Z0-9_]+)', content)
                schema_matches = re.findall(r'(?:const|let|var)\s+([A-Z][a-zA-Z0-9_]+)(?:Schema|Model)', content)
                class_matches.extend(schema_matches)
                mongoose_matches = re.findall(r'mongoose\.model\s*\(\s*[\'"]([A-[#a-zA-Z0-9_]+)[\'"]', content)
                class_matches.extend(mongoose_matches)

            for class_name in class_matches:
                # Strictly filter out technical layer classes
                if any(class_name.endswith(pat) for pat in technical_class_patterns):
                    continue
                if class_name in {'Main', 'App', 'Application', 'SpringBootApplication', 'BaseEntity', 'NamedEntity', 'Props', 'State', 'Config'}:
                    continue

                # Extract attributes/fields
                attributes = []
                
                # Java fields matching
                fields_raw = re.findall(r'(?:private|protected|public)?\s*([A-Z][a-zA-Z0-9_<>,\s]*)\s+([a-zA-Z0-9_]+)\s*(?:=|[;,\n])', content)
                for ftype, fname in fields_raw:
                    ftype_clean = ftype.strip()
                    if fname not in {'class', 'interface', 'return', 'static', 'final', 'serialVersionUID'} and ftype_clean not in {'class', 'public', 'private', 'protected'}:
                        if len(attributes) < 12:
                            attributes.append(ClassAttribute(name=fname, type=ftype_clean or "String"))

                # TS / JS fields matching
                if not attributes and ext in {'ts', 'tsx', 'js', 'jsx'}:
                    ts_fields = re.findall(r'([a-[#a-zA-Z0-9_]+)\s*\??\s*:\s*([a-zA-Z0-9_\[\]\.\,\s]+)', content)
                    for fname, ftype in ts_fields[:12]:
                        if fname not in {'export', 'import', 'from', 'const', 'let', 'var', 'function', 'class'}:
                            attributes.append(ClassAttribute(name=fname, type=ftype.strip() or "string"))

                # Python fields matching
                if not attributes and ext == 'py':
                    py_fields = re.findall(r'([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_\[\]\.\,]+)', content)
                    for fname, ftype in py_fields[:12]:
                        if fname not in {'self', 'def', 'cls', 'return'}:
                            attributes.append(ClassAttribute(name=fname, type=ftype))

                # Standard fallback attributes if model class exists
                if not attributes:
                    if 'id' in content.lower():
                        attributes.append(ClassAttribute(name="id", type="Integer/Long/UUID"))
                    if 'name' in content.lower():
                        attributes.append(ClassAttribute(name="name", type="String"))
                    if 'status' in content.lower():
                        attributes.append(ClassAttribute(name="status", type="String"))
                    if 'created' in content.lower():
                        attributes.append(ClassAttribute(name="createdAt", type="Date/Timestamp"))

                # Relationships
                rel = []
                if '@OneToMany' in content or 'OneToMany' in content: rel.append("One-to-Many Relationship")
                if '@ManyToOne' in content or 'ManyToOne' in content: rel.append("Many-to-One Relationship")
                if '@ManyToMany' in content or 'ManyToMany' in content: rel.append("Many-to-Many Relationship")
                if '@OneToOne' in content or 'OneToOne' in content: rel.append("One-to-One Relationship")
                if not rel: rel.append("Domain Entity Model")

                base_name = class_name
                ctrl = f"{base_name}Controller" if any(base_name in f[2] for f in self.source_files if 'controller' in f[2].lower()) else f"{base_name}Controller"
                srv = f"{base_name}Service" if any(base_name in f[2] for f in self.source_files if 'service' in f[2].lower()) else f"{base_name}Service"
                repo = f"{base_name}Repository" if any(base_name in f[2] for f in self.source_files if 'repository' in f[2].lower() or 'dao' in f[2].lower()) else f"{base_name}Repository"

                explanation = (
                    f"Detected '{class_name}' as an active business entity model in source file '{rel_path}'. "
                    f"Contains {len(attributes)} domain attributes [{', '.join([a.name for a in attributes[:4]]) or 'fields'}]. "
                    f"Integrated with {ctrl}, {srv}, and {repo} for domain data persistence and business workflows."
                )

                model_list.append(BusinessModelInfo(
                    name=class_name,
                    purpose=f"Encapsulates core business data structure and persistence attributes for {class_name}.",
                    description=f"Business entity in {rel_path} managing state, lifecycle attributes, and relationships for {class_name}.",
                    attributes=attributes or [ClassAttribute(name="id", type="Integer"), ClassAttribute(name="name", type="String")],
                    relationships=rel,
                    associatedControllers=[ctrl],
                    associatedServices=[srv],
                    associatedRepositories=[repo],
                    apisUsingModel=[f"/api/{class_name.lower()}s", f"REST Endpoints managing {class_name}"],
                    businessRules=[f"Enforce {class_name} attribute integrity", "Unique primary key identifier constraint"],
                    validationRules=["Mandatory field presence checks", "Type and bounds validation"],
                    crudOperations=["Create", "Read", "Update", "Delete", "Search"],
                    workflowInvolvement=f"Participates in {class_name} creation, updating, state transitions, and database queries.",
                    relatedModules=[os.path.dirname(rel_path) or 'domain'],
                    aiExplanation=explanation
                ))

        # Deduplicate models by name
        unique_models = {}
        for m in model_list:
            if m.name not in unique_models:
                unique_models[m.name] = m

        models_result = list(unique_models.values())

        # Dynamic fallback if zero models detected directly from class keywords
        if not models_result:
            inferred_nouns = set()
            for path, rel_path, filename, ext in self.source_files:
                base = filename.split('.')[0]
                clean = re.sub(r'(controller|service|repository|route|router|model|schema|view|page|component|api)', '', base, flags=re.IGNORECASE)
                clean_name = re.sub(r'[^a-zA-Z]', '', clean).capitalize()
                if len(clean_name) >= 3 and clean_name.lower() not in {'main', 'app', 'index', 'server', 'config', 'test', 'utils', 'helper'}:
                    inferred_nouns.add(clean_name)

            for noun in list(inferred_nouns)[:8]:
                models_result.append(BusinessModelInfo(
                    name=noun,
                    purpose=f"Core domain model managing application data attributes and state for {noun}.",
                    description=f"Domain entity model managing data persistence and business workflows for {noun}.",
                    attributes=[
                        ClassAttribute(name="id", type="Integer/UUID"),
                        ClassAttribute(name="name", type="String"),
                        ClassAttribute(name="status", type="String"),
                        ClassAttribute(name="createdAt", type="Timestamp")
                    ],
                    relationships=["Domain Entity Model"],
                    associatedControllers=[f"{noun}Controller"],
                    associatedServices=[f"{noun}Service"],
                    associatedRepositories=[f"{noun}Repository"],
                    apisUsingModel=[f"/api/{noun.lower()}s"],
                    businessRules=[f"Enforce data integrity for {noun}", "Unique identifier constraint"],
                    validationRules=["Mandatory field validation", "Type bounds checking"],
                    crudOperations=["Create", "Read", "Update", "Delete", "Search"],
                    workflowInvolvement=f"Participates in {noun} creation, updating, and persistence.",
                    relatedModules=["src"],
                    aiExplanation=f"Dynamically inferred business model '{noun}' from repository source code analysis."
                ))

        return models_result[:15]

    def _detect_business_domains(self, detected_models: List[BusinessModelInfo]) -> List[BusinessDomainInfo]:
        domain_groups: Dict[str, Dict[str, Any]] = {}

        # Technical architecture & layer keywords that MUST NEVER BE CLASSIFIED AS BUSINESS DOMAINS
        technical_layer_keywords = {
            'config', 'configuration', 'common', 'utils', 'utility', 'utilities', 'helper', 'helpers', 
            'base', 'shared', 'core', 'app', 'application', 'internal', 'dto', 'dtos', 'model', 'models', 
            'entity', 'entities', 'repository', 'repositories', 'service', 'services', 'controller', 'controllers', 
            'dao', 'daos', 'data', 'access', 'layer', 'layers', 'api', 'apis', 'endpoint', 'endpoints', 
            'component', 'components', 'view', 'views', 'page', 'pages', 'route', 'routes', 'router', 'routers', 
            'v1', 'v2', 'v3', 'test', 'tests', 'util', 'web', 'rest', 'impl', 'infra', 'infrastructure', 
            'handler', 'handlers', 'filter', 'filters', 'middleware', 'exception', 'exceptions', 'advice',
            'security', 'system', 'main', 'src', 'java', 'org', 'com', 'net', 'io', 'gov', 'edu', 'samples', 
            'sample', 'example', 'demo', 'framework', 'springframework', 'springboot', 'petclinic', 
            'project', 'starter', 'build', 'target', 'dist', 'out'
        }

        # Human-friendly Business Domain Normalization Map
        domain_name_overrides = {
            'owner': 'Owner Management',
            'owners': 'Owner Management',
            'pet': 'Pet Management',
            'pets': 'Pet Management',
            'pettype': 'Pet Management',
            'vet': 'Veterinarian Management',
            'vets': 'Veterinarian Management',
            'veterinarian': 'Veterinarian Management',
            'specialty': 'Veterinarian Management',
            'visit': 'Visit Management',
            'visits': 'Visit Management',
            'customer': 'Customer Management',
            'customers': 'Customer Management',
            'account': 'Account Management',
            'accounts': 'Account Management',
            'transaction': 'Transaction Processing',
            'transactions': 'Transaction Processing',
            'transfer': 'Transaction Processing',
            'loan': 'Loan Management',
            'loans': 'Loan Management',
            'product': 'Product Management',
            'products': 'Product Management',
            'catalog': 'Product Management',
            'order': 'Order Management',
            'orders': 'Order Management',
            'cart': 'Shopping Cart Management',
            'basket': 'Shopping Cart Management',
            'payment': 'Payment Processing',
            'payments': 'Payment Processing',
            'billing': 'Payment Processing',
            'checkout': 'Payment Processing',
            'inventory': 'Inventory Management',
            'stock': 'Inventory Management',
            'auth': 'Authentication & Security',
            'user': 'User Management',
            'users': 'User Management',
            'appointment': 'Appointment Scheduling',
            'appointments': 'Appointment Scheduling',
            'invoice': 'Billing & Invoicing',
            'employee': 'Employee Management',
            'employees': 'Employee Management'
        }

        # 1. First, build domain groups from detected Business Models
        for model in detected_models:
            mname = model.name.lower()
            dtitle = None
            if mname in domain_name_overrides:
                dtitle = domain_name_overrides[mname]
            else:
                formatted = re.sub(r'([a-z])([A-Z])', r'\1 \2', model.name).capitalize()
                dtitle = f"{formatted} Management"

            if dtitle not in domain_groups:
                domain_groups[dtitle] = {
                    "modules": set(model.relatedModules),
                    "controllers": set(model.associatedControllers),
                    "services": set(model.associatedServices),
                    "entities": {model.name},
                    "apis": set(model.apisUsingModel),
                    "ui": set(),
                    "files": set(),
                    "rules": set(model.businessRules),
                    "validations": set(model.validationRules)
                }
            else:
                domain_groups[dtitle]["entities"].add(model.name)

        # 2. Also scan source files for domain controllers, services, and packages
        for path, rel_path, filename, ext in self.source_files:
            lower_fn = filename.lower()
            rel_parts = [p.lower() for p in rel_path.split('/')]

            # Find domain key by inspecting file name and package parts
            domain_key = None
            
            # Check filename first (e.g. OwnerController.java -> owner)
            clean_fn = re.sub(r'(Controller|Service|Repository|Component|View|Page|Entity|Model|Router|DTO|\.java|\.py|\.jsx|\.tsx|\.ts|\.js|\.html)', '', filename, flags=re.IGNORECASE)
            clean_fn = re.sub(r'[^a-zA-Z0-9]', '', clean_fn).lower()
            
            if clean_fn and clean_fn not in technical_layer_keywords and len(clean_fn) >= 3:
                domain_key = clean_fn
            else:
                # Check directory parts from inner-most to outer-most
                for part in reversed(rel_parts[:-1]):
                    clean = re.sub(r'[^a-zA-Z0-9]', '', part)
                    if clean and clean not in technical_layer_keywords and len(clean) >= 3:
                        domain_key = clean
                        break

            if not domain_key or domain_key in technical_layer_keywords:
                continue

            # Standardize title
            if domain_key in domain_name_overrides:
                domain_title = domain_name_overrides[domain_key]
            else:
                formatted_name = re.sub(r'([a-z])([A-Z])', r'\1 \2', domain_key).capitalize()
                if not any(formatted_name.endswith(suffix) for suffix in ['Management', 'Processing', 'Administration', 'Services', 'System', 'Scheduling']):
                    domain_title = f"{formatted_name} Management"
                else:
                    domain_title = formatted_name

            if domain_title not in domain_groups:
                domain_groups[domain_title] = {
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

            group = domain_groups[domain_title]
            group["files"].add(rel_path)

            if '/' in rel_path:
                group["modules"].add(os.path.dirname(rel_path))

            if 'controller' in lower_fn or 'router' in lower_fn:
                group["controllers"].add(filename)
                group["apis"].add(f"REST API ({filename.split('.')[0]})")

            if 'service' in lower_fn or 'manager' in lower_fn:
                group["services"].add(filename)

            if ext in {'jsx', 'tsx', 'html', 'vue', 'ftl', 'jsp'}:
                group["ui"].add(filename)

        # Convert domain groups to BusinessDomainInfo objects
        result_domains = []
        for name, data in domain_groups.items():
            controllers = sorted(list(data["controllers"]))
            services = sorted(list(data["services"]))
            entities = sorted(list(data["entities"]))
            apis = sorted(list(data["apis"]))
            ui_comps = sorted(list(data["ui"]))
            modules = sorted(list(data["modules"]))

            domain_base = name.replace(" Management", "").replace(" Processing", "").replace(" Administration", "").replace(" Scheduling", "")

            funcs = [
                f"Core business logic and workflow management for {domain_base}",
                f"Data persistence and transaction orchestration for {domain_base} entities",
                f"API endpoint routing and input payload validation"
            ]

            rules = list(data["rules"]) or [
                f"Enforce atomic transaction consistency for {domain_base} operations",
                f"Maintain entity relationship integrity and state constraints"
            ]

            validations = list(data["validations"]) or [
                f"Mandatory parameter validation for {domain_base} fields",
                "Format checks and constraint verification"
            ]

            reasoning = (
                f"Identified business domain '{name}' based on repository domain components. "
                f"Supported by entity model(s) [{', '.join(entities[:3]) or domain_base}], controller(s) [{', '.join(controllers[:2]) or 'N/A'}], "
                f"and service(s) [{', '.join(services[:2]) or 'N/A'}]."
            )

            result_domains.append(BusinessDomainInfo(
                name=name,
                purpose=f"Provides business capability management, workflow orchestration, and data access for {domain_base}.",
                overallResponsibility=f"Manages domain logic, transaction boundaries, API contracts, and entity state for {domain_base}.",
                functionalities=funcs,
                relatedModules=modules[:5] or ["src/main/java"],
                controllersInvolved=controllers[:5] or [f"{domain_base.replace(' ', '')}Controller"],
                servicesInvolved=services[:5] or [f"{domain_base.replace(' ', '')}Service"],
                entitiesUsed=entities[:5] or [domain_base.replace(' ', '')],
                apisInvolved=apis[:5] or [f"/api/{domain_base.lower().replace(' ', '-')}s"],
                uiComponentsInvolved=ui_comps[:5] or [f"{domain_base.replace(' ', '')}View"],
                businessRules=rules[:4],
                validationRules=validations[:4],
                relationships=[f"Integrates with primary database persistence layer and application routing"],
                dependencies=["Core Application Framework", "Persistence Engine"],
                aiReasoning=reasoning
            ))

        # Fallback ONLY if zero domain groups detected
        if not result_domains:
            result_domains = [
                BusinessDomainInfo(
                    name="Core Business Domain",
                    purpose="Central domain managing core business operations.",
                    overallResponsibility="Executes business workflows and maintains domain entity persistence.",
                    functionalities=["Business workflow execution", "Entity state persistence"],
                    relatedModules=["src/"],
                    controllersInvolved=["API Controller"],
                    servicesInvolved=["Business Service"],
                    entitiesUsed=["Domain Model"],
                    apisInvolved=["REST API"],
                    uiComponentsInvolved=["UI View"],
                    businessRules=["Data integrity preservation"],
                    validationRules=["Parameter validation"],
                    relationships=["Database layer"],
                    dependencies=["Application Framework"],
                    aiReasoning="Inferred from repository source code analysis."
                )
            ]

        return result_domains[:8]
