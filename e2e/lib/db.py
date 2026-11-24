"""Create or drop the e2e Postgres database. Run with the backend's Python.

    python lib/db.py ensure   # create the database when missing
    python lib/db.py drop     # drop it (terminates open connections first)

Connection settings come from E2E_DB_HOST, E2E_DB_PORT, E2E_DB_USER,
E2E_DB_PASSWORD and E2E_DB_NAME (see e2e/README.md for the defaults).
"""
import os
import re
import sys

import psycopg2
from psycopg2 import sql

host = os.environ.get("E2E_DB_HOST", "localhost")
port = os.environ.get("E2E_DB_PORT", "5470")
user = os.environ.get("E2E_DB_USER", "osdagdeveloper")
password = os.environ.get("E2E_DB_PASSWORD", "password")
name = os.environ.get("E2E_DB_NAME", "osdag_e2e")

if not re.fullmatch(r"[A-Za-z0-9_]+", name) or name in ("postgres", "template0", "template1"):
    sys.exit(f"Refusing to use database name {name!r}")

action = sys.argv[1] if len(sys.argv) > 1 else ""
if action not in ("ensure", "drop"):
    sys.exit(__doc__)

connection = psycopg2.connect(host=host, port=port, user=user, password=password, dbname="postgres")
connection.autocommit = True
cursor = connection.cursor()
cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (name,))
exists = cursor.fetchone() is not None

if action == "ensure":
    if exists:
        print(f"database {name} exists")
    else:
        cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))
        print(f"database {name} created")
elif exists:
    cursor.execute(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = %s AND pid <> pg_backend_pid()",
        (name,),
    )
    cursor.execute(sql.SQL("DROP DATABASE {}").format(sql.Identifier(name)))
    print(f"database {name} dropped")
else:
    print(f"database {name} does not exist")
connection.close()
