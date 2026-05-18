from flask import Flask, render_template, request
from flask import redirect, url_for
import sqlite3
import os

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "quran.db")


def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


SURAH_NAMES = {
    1: "Al-Fatiha",
    2: "Al-Baqarah",
    3: "Aal-E-Imran",
    4: "An-Nisa",
    5: "Al-Ma'idah",
    6: "Al-An'am",
    7: "Al-A'raf",
    8: "Al-Anfal",
    9: "At-Tawbah",
    10: "Yunus",
    11: "Hud",
    12: "Yusuf",
    13: "Ar-Ra'd",
    14: "Ibrahim",
    15: "Al-Hijr",
    16: "An-Nahl",
    17: "Al-Isra",
    18: "Al-Kahf",
    19: "Maryam",
    20: "Taha",
    21: "Al-Anbiya",
    22: "Al-Hajj",
    23: "Al-Mu'minun",
    24: "An-Nur",
    25: "Al-Furqan",
    26: "Ash-Shu'ara",
    27: "An-Naml",
    28: "Al-Qasas",
    29: "Al-Ankabut",
    30: "Ar-Rum",
    31: "Luqman",
    32: "As-Sajda",
    33: "Al-Ahzab",
    34: "Saba",
    35: "Fatir",
    36: "Ya-Sin",
    37: "As-Saffat",
    38: "Sad",
    39: "Az-Zumar",
    40: "Ghafir",
    41: "Fussilat",
    42: "Ash-Shura",
    43: "Az-Zukhruf",
    44: "Ad-Dukhan",
    45: "Al-Jathiya",
    46: "Al-Ahqaf",
    47: "Muhammad",
    48: "Al-Fath",
    49: "Al-Hujurat",
    50: "Qaf",
    51: "Adh-Dhariyat",
    52: "At-Tur",
    53: "An-Najm",
    54: "Al-Qamar",
    55: "Ar-Rahman",
    56: "Al-Waqi'a",
    57: "Al-Hadid",
    58: "Al-Mujadila",
    59: "Al-Hashr",
    60: "Al-Mumtahina",
    61: "As-Saff",
    62: "Al-Jumu'a",
    63: "Al-Munafiqun",
    64: "At-Taghabun",
    65: "At-Talaq",
    66: "At-Tahrim",
    67: "Al-Mulk",
    68: "Al-Qalam",
    69: "Al-Haqqa",
    70: "Al-Ma'arij",
    71: "Nuh",
    72: "Al-Jinn",
    73: "Al-Muzzammil",
    74: "Al-Muddathir",
    75: "Al-Qiyama",
    76: "Al-Insan",
    77: "Al-Mursalat",
    78: "An-Naba",
    79: "An-Nazi'at",
    80: "Abasa",
    81: "At-Takwir",
    82: "Al-Infitar",
    83: "Al-Mutaffifin",
    84: "Al-Inshiqaq",
    85: "Al-Buruj",
    86: "At-Tariq",
    87: "Al-Ala",
    88: "Al-Ghashiya",
    89: "Al-Fajr",
    90: "Al-Balad",
    91: "Ash-Shams",
    92: "Al-Layl",
    93: "Ad-Duha",
    94: "Ash-Sharh",
    95: "At-Tin",
    96: "Al-Alaq",
    97: "Al-Qadr",
    98: "Al-Bayyina",
    99: "Az-Zalzala",
    100: "Al-Adiyat",
    101: "Al-Qari'a",
    102: "At-Takathur",
    103: "Al-Asr",
    104: "Al-Humaza",
    105: "Al-Fil",
    106: "Quraysh",
    107: "Al-Ma'un",
    108: "Al-Kawthar",
    109: "Al-Kafirun",
    110: "An-Nasr",
    111: "Al-Masad",
    112: "Al-Ikhlas",
    113: "Al-Falaq",
    114: "An-Nas"
}


def init_db():
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS progress (
        id INTEGER PRIMARY KEY,
        surah INTEGER,
        ayah INTEGER
    )
    """)

    conn.commit()
    conn.close()

init_db()

@app.route("/")
def index():

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT DISTINCT surah
        FROM quran
        ORDER BY surah
    """)
    surahs = [row["surah"] for row in cur.fetchall()]

    selected_surah = request.args.get("surah", type=int, default=1)
    selected_ayah = request.args.get("ayah", type=int, default=1)
    
    
    
    
    cur.execute("SELECT surah, ayah FROM progress WHERE id = 1")
    progress = cur.fetchone()

    pinned_surah = progress["surah"] if progress else None
    pinned_ayah = progress["ayah"] if progress else None
    
    
    
    
    
    
    
    

    cur.execute("""
        SELECT rowid, surah, ayah, text, is_read, is_bookmarked
        FROM quran
        WHERE surah = ?
        ORDER BY ayah
    """, (selected_surah,))

    verses = cur.fetchall()
    conn.close()

    return render_template(
        "index.html",
        surahs=surahs,
        verses=verses,
        selected_surah=selected_surah,
        selected_ayah=selected_ayah,
        pinned_surah=pinned_surah,
        pinned_ayah=pinned_ayah,
        surah_names=SURAH_NAMES
    )
    

@app.route("/toggle_read/<int:rowid>")
def toggle_read(rowid):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        UPDATE quran
        SET is_read = CASE is_read WHEN 1 THEN 0 ELSE 1 END
        WHERE rowid = ?
    """, (rowid,))

    conn.commit()
    conn.close()

    return redirect(request.referrer)


@app.route("/toggle_bookmark/<int:rowid>")
def toggle_bookmark(rowid):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        UPDATE quran
        SET is_bookmarked = CASE is_bookmarked WHEN 1 THEN 0 ELSE 1 END
        WHERE rowid = ?
    """, (rowid,))

    conn.commit()
    conn.close()

    return redirect(request.referrer)

@app.route("/bookmarks")
def bookmarks():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT rowid, surah, ayah, text
        FROM quran
        WHERE is_bookmarked = 1
        ORDER BY surah, ayah
    """)

    verses = cur.fetchall()
    conn.close()

    return render_template("bookmarks.html", verses=verses)


@app.route("/mark_progress/<int:surah>/<int:ayah>")
def mark_progress(surah, ayah):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO progress (id, surah, ayah)
        VALUES (1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            surah = excluded.surah,
            ayah = excluded.ayah
    """, (surah, ayah))

    conn.commit()
    conn.close()

    return "", 204

@app.route("/mark-read", methods=["POST"])
def mark_read():
    data = request.get_json()

    surah = data["surah"]
    ayah = data["ayah"]
    is_read = data["is_read"]

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        UPDATE quran
        SET is_read = ?
        WHERE surah = ? AND ayah = ?
    """, (is_read, surah, ayah))

    conn.commit()
    conn.close()

    return {"status": "ok"}



@app.route("/resume")
def resume():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT surah, ayah FROM progress WHERE id = 1")
    row = cur.fetchone()

    conn.close()

    # fallback if nothing saved yet
    if not row:
        return redirect("/")

    return redirect(f"/?surah={row['surah']}&ayah={row['ayah']}")

@app.route("/clear_progress", methods=["POST"])
def clear_progress():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        UPDATE progress
        SET surah = 1,
            ayah = 1
        WHERE id = 1
    """)

    conn.commit()
    conn.close()

    return "", 204
    
    
if __name__ == "__main__":
    app.run(debug=True)