import re
from pathlib import Path

# Regex for page header/footer lines
pattern = re.compile(
    r'^.*\s+\d+\s+of\s+\d+(\s+pages)?\s*$',
    re.IGNORECASE
)

base_dir = Path(r"C:\Users\Yuvraj Singh\OneDrive\Desktop\Dataset")

for subdir in ["commercial", "arbitration"]:
    folder = base_dir / subdir

    for file in folder.glob("*.txt"):
        cleaned_lines = []

        with open(file, "r", encoding="utf-8") as f:
            for line in f:
                if not pattern.match(line.strip()):
                    cleaned_lines.append(line)

        with open(file, "w", encoding="utf-8") as f:
            f.writelines(cleaned_lines)

        print(f"✅ Cleaned: {file}")
