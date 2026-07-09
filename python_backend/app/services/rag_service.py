import os
import re
import json
import faiss
import numpy as np
from pathlib import Path
from app.config import app_config

class RagService:
    def __init__(self):
        self.is_initialized = False
        self.initialization_status = "Not Initialized"
        self.model = None
        self.index = None
        self.metadata = []
        
        self.knowledge_dir = app_config.project_root / "knowledge_base"
        self.index_path = app_config.workspace_directory / "faiss_index.bin"
        self.meta_path = app_config.workspace_directory / "metadata.json"
        
        self.initialize_rag()
        
    def chunk_markdown(self, file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        raw_sections = re.split(r'\n(##+ .*)\n', content)
        chunks = []
        current_header = ""
        
        for sec in raw_sections:
            sec = sec.strip()
            if not sec: continue
            
            if sec.startswith('##'):
                current_header = sec
            else:
                chunk_text = f"{current_header}\n{sec}" if current_header else sec
                if len(chunk_text) > 1200:
                    paragraphs = chunk_text.split('\n\n')
                    sub_chunk = ""
                    for p in paragraphs:
                        if len(sub_chunk) + len(p) < 1000:
                            sub_chunk += "\n\n" + p
                        else:
                            if sub_chunk.strip():
                                chunks.append(sub_chunk.strip())
                            sub_chunk = p
                    if sub_chunk.strip():
                        chunks.append(sub_chunk.strip())
                else:
                    chunks.append(chunk_text)
        return chunks

    def build_index(self):
        if not self.knowledge_dir.exists():
            self.initialization_status = f"Knowledge dir not found: {self.knowledge_dir}"
            return

        all_chunks = []
        metadata = []
        
        for filename in os.listdir(self.knowledge_dir):
            if filename.endswith('.md') or filename.endswith('.txt'):
                file_path = self.knowledge_dir / filename
                chunks = self.chunk_markdown(file_path)
                for c in chunks:
                    all_chunks.append(c)
                    metadata.append({
                        "source": filename,
                        "content": c
                    })
        
        if not all_chunks:
            self.initialization_status = "No documents found to index"
            return
            
        from sentence_transformers import SentenceTransformer
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        embeddings = self.model.encode(all_chunks, show_progress_bar=False)
        embeddings = np.array(embeddings).astype('float32')
        
        dimension = embeddings.shape[1]
        self.index = faiss.IndexFlatL2(dimension)
        self.index.add(embeddings)
        
        faiss.write_index(self.index, str(self.index_path))
        with open(self.meta_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)
            
        self.metadata = metadata
        self.is_initialized = True
        self.initialization_status = f"Successfully indexed {len(all_chunks)} chunks."

    def load_index(self):
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            self.index = faiss.read_index(str(self.index_path))
            with open(self.meta_path, 'r', encoding='utf-8') as f:
                self.metadata = json.load(f)
            self.is_initialized = True
            self.initialization_status = f"Successfully loaded {len(self.metadata)} chunks from disk."
        except Exception as e:
            self.initialization_status = f"Error loading index: {str(e)}"
            self.build_index()

    def initialize_rag(self):
        if self.index_path.exists() and self.meta_path.exists():
            self.load_index()
        else:
            self.build_index()

    def search(self, query: str, top_k: int = 3):
        if not self.is_initialized:
            try:
                self.initialize_rag()
            except Exception as e:
                self.initialization_status = f"Lazy initialization failed: {e}"
        if not self.is_initialized:
            return []
            
        query_vector = self.model.encode([query], show_progress_bar=False)
        query_vector = np.array(query_vector).astype('float32')
        
        distances, indices = self.index.search(query_vector, min(top_k, len(self.metadata)))
        
        results = []
        for i, idx in enumerate(indices[0]):
            if idx < len(self.metadata) and idx >= 0:
                results.append({
                    "score": float(distances[0][i]),
                    "source": self.metadata[idx]["source"],
                    "content": self.metadata[idx]["content"]
                })
        return results

rag_service = RagService()
