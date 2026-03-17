#!/usr/bin/env python3
"""Push all .env.local variables to Vercel production environment."""
import subprocess
import sys
import re

env_file = ".env.local"
target_env = "production"

with open(env_file, "r") as f:
    content = f.read()

# Parse env vars, handling multi-line quoted values
env = {}
lines = content.split("\n")
i = 0
while i < len(lines):
    line = lines[i]
    if line.startswith("#") or "=" not in line:
        i += 1
        continue
    key, _, val = line.partition("=")
    key = key.strip()
    # Handle multi-line double-quoted values
    if val.startswith('"') and not (val.count('"') >= 2 and val.endswith('"') and len(val) > 1):
        val_lines = [val]
        i += 1
        while i < len(lines):
            val_lines.append(lines[i])
            if lines[i].endswith('"'):
                break
            i += 1
        val = "\n".join(val_lines)
    val = val.strip()
    # Strip surrounding quotes
    if len(val) >= 2 and ((val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'"))):
        val = val[1:-1]
    # Keep \n as literal text (Vercel stores as-is; code does the replacement)
    env[key] = val
    i += 1

print(f"Found {len(env)} variables to push: {list(env.keys())}")

# Get already-set vars to skip
existing = subprocess.run(
    ["vercel", "env", "ls", target_env],
    capture_output=True, text=True
)
already_set = set()
for line in existing.stdout.splitlines():
    parts = line.split()
    if parts and parts[0] not in ("name", ">", ""):
        already_set.add(parts[0])
if already_set:
    print(f"Already set (will skip): {sorted(already_set)}")

for key, value in env.items():
    if key in already_set:
        print(f"→ Skipping {key} (already set)")
        continue
    print(f"\n→ Adding {key}...", end=" ", flush=True)
    result = subprocess.run(
        ["vercel", "env", "add", key, target_env],
        input=value,
        text=True,
        capture_output=True,
    )
    if result.returncode == 0:
        print("✓")
    else:
        # might already exist - try rm then re-add
        stderr = result.stderr.strip()
        if "already exists" in stderr or "already been set" in stderr:
            print("already exists, updating...", end=" ", flush=True)
            subprocess.run(["vercel", "env", "rm", key, target_env, "--yes"], capture_output=True)
            result2 = subprocess.run(
                ["vercel", "env", "add", key, target_env],
                input=value,
                text=True,
                capture_output=True,
            )
            print("✓" if result2.returncode == 0 else f"✗ {result2.stderr.strip()}")
        else:
            print(f"✗ {stderr}")

print("\nDone! Run 'vercel env ls production' to verify.")
