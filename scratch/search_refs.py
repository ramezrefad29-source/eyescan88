import os

base_dir = r"c:\Users\LENOVO\Desktop\eyescan"
matches = []

for root, dirs, files in os.walk(base_dir):
    # skip node_modules, .next, .git
    if any(p in root for p in ["node_modules", ".next", ".git"]):
        continue
    for file in files:
        if file.endswith((".py", ".ts", ".tsx", ".json", ".js", ".css", ".md")):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    if "full_retina_model" in content or "h5" in content:
                        matches.append(path)
            except Exception as e:
                pass

print("Files containing 'full_retina_model' or 'h5':")
for m in matches:
    print(f"  {m}")
