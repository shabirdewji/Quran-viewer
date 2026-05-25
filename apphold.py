from flask import Flask, render_template, request, jsonify, redirect
import sqlite3
import os

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "quran.db")

def get_db():
    conn = sqlite3.connect(
        "quran.db",
        timeout=30,
        check_same_thread=False
    )

    conn.row_factory = sqlite3.Row

    # WAL mode (good for concurrent reads/writes)
    conn.execute("PRAGMA journal_mode=WAL")

    # IMPORTANT: wait instead of failing immediately
    conn.execute("PRAGMA busy_timeout = 30000")

    return conn

def get_surah_counts():

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT surah, MAX(ayah) as total
        FROM quran
        GROUP BY surah
        ORDER BY surah
    """)

    rows = cur.fetchall()

    conn.close()

    counts = {}

    for row in rows:
        counts[row["surah"]] = row["total"]

    return counts
# -----------------------------
# SURAH NAMES
# -----------------------------
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

# -----------------------------
# INIT DB
# -----------------------------
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


# -----------------------------
# MAIN VIEW
# -----------------------------
@app.route("/")
def home():

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT surah, ayah
        FROM progress
        WHERE id = 1
    """)

    row = cur.fetchone()
    conn.close()

    if row:
        return redirect(f"/view/{row['surah']}/{row['ayah']}")

    return redirect("/view/1/1")


# -----------------------------
# VIEW SINGLE ayah
# -----------------------------
@app.route("/view/<int:surah>/<int:ayah>")
def view_ayah(surah, ayah):

    conn = get_db()
    cur = conn.cursor()

    # CURRENT AYAH
    cur.execute("""
        SELECT *
        FROM quran
        WHERE surah = ? AND ayah = ?
    """, (surah, ayah))

    verse = cur.fetchone()

    if not verse:
        return redirect("/view/1/1")

    # -----------------------------
    # NEXT AYAH (same surah first)
    # -----------------------------
    cur.execute("""
        SELECT surah, ayah
        FROM quran
        WHERE (surah = ? AND ayah > ?)
           OR (surah > ?)
        ORDER BY surah ASC, ayah ASC
        LIMIT 1
    """, (surah, ayah, surah))

    next_row = cur.fetchone()

    # -----------------------------
    # PREVIOUS AYAH
    # -----------------------------
    cur.execute("""
        SELECT surah, ayah
        FROM quran
        WHERE (surah = ? AND ayah < ?)
           OR (surah < ?)
        ORDER BY surah DESC, ayah DESC
        LIMIT 1
    """, (surah, ayah, surah))

    prev_row = cur.fetchone()

    conn.close()

    next_url = f"/view/{next_row['surah']}/{next_row['ayah']}" if next_row else None
    prev_url = f"/view/{prev_row['surah']}/{prev_row['ayah']}" if prev_row else None

    
    return render_template(
        "ayah.html",
        verse=verse,
        next_url=next_url,
        prev_url=prev_url,
        surahs=list(range(1, 115)),
        surah_names=SURAH_NAMES,
        surah_counts=get_surah_counts()
    )


@app.route("/ayah")
def get_ayah():
    surah = request.args.get("surah")
    ayah = request.args.get("ayah")
    cur = get_db().cursor()
    cur.execute("""
        SELECT text FROM quran
        WHERE surah=? AND ayah=?
    """, (surah, ayah))

    row = cur.fetchone()

    if row:
        surah_counts = get_surah_counts()
        return jsonify({
    "text": row[0],
    "surah": surah,
    "ayah": ayah,
    "total": surah_counts.get(surah)
})

    return jsonify({"text": "Not found"}), 404

@app.route("/api/surah/<int:surah>")
def api_surah(surah):
    conn = get_db()
    rows = conn.execute(
        "SELECT ayah, text FROM quran WHERE surah = ? ORDER BY ayah",
        (surah,)
    ).fetchall()

    return jsonify([
        {"ayah": r["ayah"], "text": r["text"]}
        for r in rows
    ])
    


@app.route("/api/bookmarks")
def get_bookmarks():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT id, surah, ayah, label FROM bookmarks ORDER BY id DESC")
    rows = cur.fetchall()
    conn.close()

    return {
        "bookmarks": [
            {
                "id": r["id"],
                "surah": r["surah"],
                "ayah": r["ayah"],
                "label": r["label"]
            }
            for r in rows
        ]
    }
# -----------------------------
# MARK READ
# -----------------------------
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
    """, (1 if is_read else 0, surah, ayah))

    conn.commit()
    conn.close()

    return {"status": "ok"}


# -----------------------------
# PIN ayah (PROGRESS)
# -----------------------------
@app.route("/pin", methods=["POST"])
def pin():
    data = request.get_json()

    surah = data["surah"]
    ayah = data["ayah"]

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO pins (id, surah, ayah)
        VALUES (1, ?, ?)
        ON CONFLICT(id)
        DO UPDATE SET surah=excluded.surah, ayah=excluded.ayah
    """, (surah, ayah))

    conn.commit()
    conn.close()

    return {"success": True}


# --------------------------------
# CONTINUE
# --------------------------------
@app.route("/continue")
def continue_reading():

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT surah, ayah
        FROM pins
        WHERE id = 1
    """)

    row = cur.fetchone()
    conn.close()

    if not row:
        return redirect("/view/1/1")

    return redirect(f"/view/{row['surah']}/{row['ayah']}")
# -----------------------------
# BOOKMARK TOGGLE
# -----------------------------
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


# -----------------------------
# BOOKMARKS PAGE
# -----------------------------
@app.route("/bookmark", methods=["POST"])
def add_bookmark():

    data = request.json

    surah = data["surah"]
    ayah = data["ayah"]
    label = data.get("label")

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO bookmarks (surah, ayah, label)
        VALUES (?, ?, ?)
    """, (surah, ayah, label))

    conn.commit()
    conn.close()

    return {"ok": True}

@app.route("/bookmarks")
def bookmarks_page():

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT b.id, b.surah, b.ayah, b.label, q.text
        FROM bookmarks b
        JOIN quran q
        ON q.surah = b.surah AND q.ayah = b.ayah
        ORDER BY b.id DESC
    """)

    rows = cur.fetchall()
    conn.close()

    verses = [
        {
            "id": r["id"],
            "surah": r["surah"],
            "ayah": r["ayah"],
            "label": r["label"],
            "text": r["text"]
        }
        for r in rows
    ]

    return render_template("bookmarks.html", verses=verses)

@app.route("/bookmark/<int:bid>", methods=["DELETE"])
def delete_bookmark(bid):

    conn = get_db()
    cur = conn.cursor()

    cur.execute("DELETE FROM bookmarks WHERE id = ?", (bid,))

    conn.commit()
    conn.close()

    return {"ok": True}

@app.route("/save_progress", methods=["POST"])
def save_progress():
    
    data = request.json
    surah = data["surah"]
    ayah = data["ayah"]
    print("SAVE_PROGRESS HIT:", data)
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO progress (id, surah, ayah)
        VALUES (1, ?, ?)
        ON CONFLICT(id)
        DO UPDATE SET
            surah = excluded.surah,
            ayah = excluded.ayah
    """, (surah, ayah))

    conn.commit()
    conn.close()

    return {"ok": True}
# -----------------------------
# RUN APP
# -----------------------------
if __name__ == "__main__":
    app.run(debug=True)