"""
Authentication & Authorization Module
JWT-based auth with in-memory user store, password hashing, and role-based permissions.
"""
import os
import json
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, List

from jose import JWTError, jwt
from fastapi import HTTPException, Header as FastAPIHeader

# ─── Configuration ────────────────────────────────────────────────
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "mospi-survey-intelligence-platform-secret-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "data"))
USERS_FILE = os.path.join(DATA_DIR, "users.json")


def _hash_password(password: str) -> str:
    """Hash password with SHA-256 + salt."""
    salt = secrets.token_hex(16)
    h = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}${h}"


def _verify_password(password: str, password_hash: str) -> bool:
    """Verify password against stored hash."""
    parts = password_hash.split("$")
    if len(parts) != 2:
        return False
    salt, stored_hash = parts
    h = hashlib.sha256((salt + password).encode()).hexdigest()
    return h == stored_hash

# ─── Role Definitions ────────────────────────────────────────────
ROLES = {
    "ADMIN": {
        "label": "Administrator",
        "permissions": [
            "manage_users", "manage_datasets", "manage_rules",
            "upload_datasets", "run_validation", "review_records",
            "approve_records", "escalate_records", "analyze",
            "create_reports", "view_dashboard", "view_audit",
            "manage_settings",
        ]
    },
    "DATA_SUPERVISOR": {
        "label": "Data Supervisor",
        "permissions": [
            "upload_datasets", "run_validation", "review_records",
            "approve_records", "escalate_records", "analyze",
            "create_reports", "view_dashboard", "view_audit",
            "manage_rules",
        ]
    },
    "FIELD_SUPERVISOR": {
        "label": "Field Supervisor",
        "permissions": [
            "review_records", "approve_records", "escalate_records",
            "view_dashboard", "view_audit",
        ]
    },
    "ANALYST": {
        "label": "Analyst",
        "permissions": [
            "analyze", "create_reports", "view_dashboard",
            "view_audit", "upload_datasets",
        ]
    },
    "VIEWER": {
        "label": "Viewer",
        "permissions": [
            "view_dashboard",
        ]
    },
}

# ─── Default Users ────────────────────────────────────────────────
DEFAULT_USERS = [
    {
        "username": "admin",
        "password": "admin123",
        "name": "Dr. Rajesh Kumar",
        "role": "ADMIN",
        "department": "NSO HQ",
    },
    {
        "username": "supervisor",
        "password": "super123",
        "name": "Priya Sharma",
        "role": "DATA_SUPERVISOR",
        "department": "Field Operations",
    },
    {
        "username": "data_sup",
        "password": "data123",
        "name": "Arjun Mehta",
        "role": "DATA_SUPERVISOR",
        "department": "Data Quality",
    },
    {
        "username": "field_sup",
        "password": "field123",
        "name": "Kavitha Rajan",
        "role": "FIELD_SUPERVISOR",
        "department": "Field Staff TN",
    },
    {
        "username": "analyst",
        "password": "analyst123",
        "name": "Deepak Nair",
        "role": "ANALYST",
        "department": "Statistical Analysis",
    },
    {
        "username": "viewer",
        "password": "viewer123",
        "name": "Suresh Gupta",
        "role": "VIEWER",
        "department": "Public Reporting",
    },
]


class UserStore:
    """Manages users with password hashing and persistence."""

    def __init__(self):
        self.users: Dict[str, dict] = {}
        self._load()

    def _load(self):
        """Load users from file or seed defaults."""
        if os.path.exists(USERS_FILE):
            try:
                with open(USERS_FILE, 'r') as f:
                    data = json.load(f)
                self.users = data.get("users", {})
                return
            except Exception:
                pass

        # Seed default users
        for u in DEFAULT_USERS:
            self.users[u["username"]] = {
                "username": u["username"],
                "password_hash": _hash_password(u["password"]),
                "name": u["name"],
                "role": u["role"],
                "department": u["department"],
                "created_at": datetime.utcnow().isoformat(),
                "is_active": True,
            }
        self._save()

    def _save(self):
        """Save users to file."""
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(USERS_FILE, 'w') as f:
            json.dump({"users": self.users}, f, indent=2)

    def authenticate(self, username: str, password: str) -> Optional[dict]:
        """Verify credentials and return user info (without hash)."""
        user = self.users.get(username)
        if not user or not user.get("is_active", True):
            return None
        if not _verify_password(password, user["password_hash"]):
            return None
        return self._safe_user(user)

    def get_user(self, username: str) -> Optional[dict]:
        """Get user info (without hash)."""
        user = self.users.get(username)
        if user:
            return self._safe_user(user)
        return None

    def list_users(self) -> List[dict]:
        """List all users (without hashes)."""
        return [self._safe_user(u) for u in self.users.values()]

    def create_user(self, username: str, password: str, name: str, role: str, department: str) -> dict:
        """Create a new user."""
        if username in self.users:
            raise ValueError(f"User '{username}' already exists.")
        if role not in ROLES:
            raise ValueError(f"Invalid role: {role}")
        self.users[username] = {
            "username": username,
            "password_hash": _hash_password(password),
            "name": name,
            "role": role,
            "department": department,
            "created_at": datetime.utcnow().isoformat(),
            "is_active": True,
        }
        self._save()
        return self._safe_user(self.users[username])

    def update_user(self, username: str, updates: dict) -> dict:
        """Update user fields."""
        if username not in self.users:
            raise ValueError(f"User '{username}' not found.")
        if "password" in updates:
            self.users[username]["password_hash"] = _hash_password(updates.pop("password"))
        if "role" in updates and updates["role"] not in ROLES:
            raise ValueError(f"Invalid role: {updates['role']}")
        for key in ("name", "role", "department", "is_active"):
            if key in updates:
                self.users[username][key] = updates[key]
        self._save()
        return self._safe_user(self.users[username])

    def delete_user(self, username: str):
        """Delete a user."""
        if username in self.users:
            del self.users[username]
            self._save()

    def _safe_user(self, user: dict) -> dict:
        """Return user dict without password hash."""
        return {k: v for k, v in user.items() if k != "password_hash"}


# ─── Token Functions ──────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_current_user_from_token(authorization: Optional[str] = None, user_store: 'UserStore' = None) -> dict:
    """Extract current user from authorization header."""
    if not authorization:
        return {"username": "guest", "role": "VIEWER", "name": "Guest User", "department": "Public"}

    # Strip "Bearer " prefix if present
    token = authorization.replace("Bearer ", "").strip()

    payload = decode_token(token)
    if not payload:
        return {"username": "guest", "role": "VIEWER", "name": "Guest User", "department": "Public"}

    username = payload.get("sub")
    if not username or not user_store:
        return {"username": "guest", "role": "VIEWER", "name": "Guest User", "department": "Public"}

    user = user_store.get_user(username)
    if user:
        return user
    return {"username": "guest", "role": "VIEWER", "name": "Guest User", "department": "Public"}


def check_permission(user: dict, permission: str) -> bool:
    """Check if a user has a specific permission."""
    role = user.get("role", "VIEWER")
    role_config = ROLES.get(role, ROLES["VIEWER"])
    return permission in role_config.get("permissions", [])


def require_permission(user: dict, permission: str):
    """Raise HTTP 403 if user lacks permission."""
    if not check_permission(user, permission):
        raise HTTPException(
            status_code=403,
            detail=f"Permission denied. Required: {permission}. Your role: {user.get('role')}"
        )


# Singleton instance
user_store = UserStore()
