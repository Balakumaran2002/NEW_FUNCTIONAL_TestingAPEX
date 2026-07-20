import json
import uuid
import base64
import os
from pathlib import Path
from typing import List, Dict, Optional
from app.db_models import APIKey
from app.database import SessionLocal

class KeyManagerService:
    def __init__(self):
        self._secret = b"ai_provider_secret_key_2026"
        self._ensure_storage()
        
    def _ensure_storage(self):
        # We ensure default provider exists when querying, but no file needs to be initialized.
        pass

    # Internal helpers not needed for reading/writing full JSON anymore
    # but we'll keep get_active_provider stored perhaps in a local mock or environment since the user didn't request a DB table for "active_provider"
    # Actually, let's derive active_provider by querying default keys, or default to groq.
    
    def get_active_provider(self) -> str:
        # Check if there is a default key
        db = SessionLocal()
        try:
            default_key = db.query(APIKey).filter(APIKey.is_default == True).first()
            if default_key:
                return default_key.provider
            return "groq"
        finally:
            db.close()
            
    def set_active_provider(self, provider_name: str):
        # We just set one of its keys to default if possible
        pass
        
    def _encrypt(self, text: str) -> str:
        """Simple XOR obfuscation for local storage to prevent plaintext keys on disk."""
        if not text:
            return text
        text_bytes = text.encode('utf-8')
        encrypted = bytearray()
        for i in range(len(text_bytes)):
            encrypted.append(text_bytes[i] ^ self._secret[i % len(self._secret)])
        return base64.b64encode(encrypted).decode('utf-8')
        
    def _decrypt(self, text: str) -> str:
        if not text:
            return text
        try:
            encrypted_bytes = base64.b64decode(text.encode('utf-8'))
            decrypted = bytearray()
            for i in range(len(encrypted_bytes)):
                decrypted.append(encrypted_bytes[i] ^ self._secret[i % len(self._secret)])
            return decrypted.decode('utf-8')
        except Exception:
            return ""

    def _mask_key(self, key: str) -> str:
        if not key:
            return ""
        if len(key) <= 8:
            return "***"
        prefix = key[:4]
        suffix = key[-4:]
        return f"{prefix}_{'*' * 16}_{suffix}"

    # --- Provider Level ---
    
    def _get_settings_path(self):
        return os.path.join(os.path.dirname(__file__), "..", "..", "settings.json")

    def get_active_provider(self) -> str:
        path = self._get_settings_path()
        if os.path.exists(path):
            with open(path, "r") as f:
                return json.load(f).get("active_provider", "groq")
        return "groq"
        
    def set_active_provider(self, provider_name: str):
        path = self._get_settings_path()
        data = {"active_provider": "groq"}
        if os.path.exists(path):
            with open(path, "r") as f:
                data = json.load(f)
        data["active_provider"] = provider_name
        with open(path, "w") as f:
            json.dump(data, f)

    # --- Key Level ---
    
    def get_keys(self, provider: str, unmask: bool = False) -> List[Dict]:
        db = SessionLocal()
        try:
            db_keys = db.query(APIKey).filter(APIKey.provider == provider).order_by(APIKey.is_default.desc()).all()
            result = []
            for dbk in db_keys:
                raw_key = self._decrypt(dbk.encrypted_key)
                k_dict = {
                    "id": dbk.id,
                    "name": dbk.name,
                    "is_active": dbk.is_active,
                    "is_default": dbk.is_default,
                    "key": raw_key if unmask else self._mask_key(raw_key)
                }
                result.append(k_dict)
            return result
        finally:
            db.close()
        
    def get_active_keys(self, provider: str) -> List[Dict]:
        """Returns fully unmasked, active keys, default first."""
        all_keys = self.get_keys(provider, unmask=True)
        return [k for k in all_keys if k.get("is_active", True)]

    def add_key(self, provider: str, name: str, key_val: str, is_default: bool = False) -> Dict:
        db = SessionLocal()
        try:
            if is_default:
                db.query(APIKey).filter(APIKey.provider == provider).update({"is_default": False})
            
            # If no keys exist for this provider, make it default anyway
            existing = db.query(APIKey).filter(APIKey.provider == provider).first()
            if not existing:
                is_default = True

            new_db_key = APIKey(
                provider=provider,
                name=name,
                encrypted_key=self._encrypt(key_val),
                is_active=True,
                is_default=is_default
            )
            db.add(new_db_key)
            db.commit()
            db.refresh(new_db_key)
            
            return {
                "id": new_db_key.id,
                "name": new_db_key.name,
                "is_active": new_db_key.is_active,
                "is_default": new_db_key.is_default,
                "key": self._mask_key(key_val)
            }
        finally:
            db.close()
        
        ret = new_key.copy()
        ret["key"] = self._mask_key(key_val)
        return ret

    def edit_key(self, provider: str, key_id: str, name: str, key_val: Optional[str]) -> bool:
        db = SessionLocal()
        try:
            db_key = db.query(APIKey).filter(APIKey.id == key_id, APIKey.provider == provider).first()
            if db_key:
                if name:
                    db_key.name = name
                if key_val:
                    db_key.encrypted_key = self._encrypt(key_val)
                db.commit()
                return True
            return False
        finally:
            db.close()
        
    def delete_key(self, provider: str, key_id: str) -> bool:
        db = SessionLocal()
        try:
            db_key = db.query(APIKey).filter(APIKey.id == key_id, APIKey.provider == provider).first()
            if not db_key:
                return False
                
            was_default = db_key.is_default
            db.delete(db_key)
            db.commit()
            
            if was_default:
                # Make first available key default
                first_key = db.query(APIKey).filter(APIKey.provider == provider).first()
                if first_key:
                    first_key.is_default = True
                    db.commit()
            return True
        finally:
            db.close()

    def toggle_key(self, provider: str, key_id: str, is_active: bool) -> bool:
        db = SessionLocal()
        try:
            db_key = db.query(APIKey).filter(APIKey.id == key_id, APIKey.provider == provider).first()
            if db_key:
                db_key.is_active = is_active
                db.commit()
                return True
            return False
        finally:
            db.close()

    def set_default_key(self, provider: str, key_id: str) -> bool:
        db = SessionLocal()
        try:
            db_key = db.query(APIKey).filter(APIKey.id == key_id, APIKey.provider == provider).first()
            if db_key:
                db.query(APIKey).filter(APIKey.provider == provider).update({"is_default": False})
                db_key.is_default = True
                db.commit()
                return True
            return False
        finally:
            db.close()

key_manager_service = KeyManagerService()
