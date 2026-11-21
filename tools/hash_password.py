#!/usr/bin/env python3
"""Generate a PBKDF2 + salt + pepper credential record for users.json.

Usage:
    python3 tools/hash_password.py <username> <password> [role]

The pepper and iteration count MUST match data/users.json -> authParams.
The printed JSON block can be pasted into the "users" array.
"""
import base64
import hashlib
import json
import os
import sys
from datetime import date

# Keep in sync with data/users.json -> authParams
PEPPER = "AttackDetect-Pepper-v1-CHANGE-ME"
ITERATIONS = 310000
HASH_LENGTH = 32


def make_record(username: str, password: str, role: str = "viewer") -> dict:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac(
        "sha256", (password + PEPPER).encode(), salt, ITERATIONS, dklen=HASH_LENGTH
    )
    return {
        "username": username,
        "role": role,
        "salt": base64.b64encode(salt).decode(),
        "hash": base64.b64encode(dk).decode(),
        "createdAt": date.today().isoformat(),
    }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    rec = make_record(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "viewer")
    print(json.dumps(rec, indent=2))