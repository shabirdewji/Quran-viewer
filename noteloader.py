import json
import sqlite3
import re

DB_PATH = "/Users/shabirdewji/python/esyq/quran.db"
JSON_PATH = "q.json"

URL_PATTERN = r'(https?://[^\s]+)'

BASE_URL = "https://al-islam.org/holy-quran-final-testament-juz-1-mirza-mahdi-pooya-sv-mir-ahmad-ali/al-fatiha-opening"

def convert_to_html(text):
    if not text:
        return ""

    def replacer(match):
        url = match.group(0)
        label = "Al-Islam Tafsir" if "al-islam.org" in url else "Open Source"
        return f'<a href="{url}" target="_blank">{label}</a>'

    return re.sub(URL_PATTERN, replacer, text)


def parse_ayah(label):
    match = re.match(r"(\d+):(\d+)", label)
    if not match:
        return None, None
    return int(match.group(1)), int(match.group(2))

def build_link(ref_id):
    return f"{BASE_URL}#{ref_id}"

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    updated = 0
    inserted = 0
    step = 0

    for item in data:
        step += 1

        label = item.get("label", "")
        ref_id = item.get("id", "")

        surah, ayah = parse_ayah(label)

        if surah is None:
            continue

        link = build_link(ref_id)
        note = note = f'<a href="{link}" target="_blank">Al-Islam Tafsir</a>'

        # -------------------------
        # 1. TRY UPDATE FIRST
        # -------------------------
        cursor.execute("""
            UPDATE notes
            SET note = ?
            WHERE surah = ? AND ayah = ?
        """, (note, surah, ayah))

        if cursor.rowcount > 0:
            updated += 1
            action = "UPDATED"
        else:
            # -------------------------
            # 2. INSERT IF NOT EXISTS
            # -------------------------
            cursor.execute("""
                INSERT INTO notes (surah, ayah, note)
                VALUES (?, ?, ?)
            """, (surah, ayah, note))

            inserted += 1
            action = "INSERTED"

        print(f"[{step}] {action} → {surah}:{ayah}")
        print(f"    {note}")

    conn.commit()
    conn.close()

    print("\n==============================")
    print(f"UPDATED: {updated}")
    print(f"INSERTED: {inserted}")
    print("==============================")

if __name__ == "__main__":
    main()