/* ---------- SAFE HELPERS ---------- */
let lastFocused = null;
let popupTimer = null;

const originalSetItem = localStorage.setItem;




localStorage.setItem = function (key, value) {
    console.trace("🧨 localStorage.setItem CALLED:", key, value);
    originalSetItem.apply(this, arguments);
};




const $ = (id) => document.getElementById(id);

function bind(id, event, fn) {
    const el = $(id);
    if (!el) return;
    el.addEventListener(event, fn);
}

/* ---------- STATE ---------- */

let audioPlayer = null;

let currentSurah;
let currentAyah;
let currentIndex = 0;

let isPlayingSurah = false;
let surahQueue = [];

const surahCounts = window.surahCounts || {};
const pageData = window.pageData || null;

/* ---------- INIT ---------- */

document.addEventListener("DOMContentLoaded", init);

async function init() {

    if (!pageData) return; // prevents crashes on non-viewer pages

    const list = document.getElementById("list");
    console.log("LIST ELEMENT:", list || "not present");

    currentSurah = pageData.surah;
    currentAyah = pageData.ayah;

    updateAyahInfo();

    currentIndex = currentAyah - 1;

    audioPlayer = $("audioPlayer");

    setupUI();
    setupNavigation();
    setupDropdowns();
    setupAudio();
    await waitForAyahs();   // ✅ important
    loadReadStates(currentSurah);
    loadNoteStates(currentSurah); 
}

function updateAyahInfo() {
    const current = document.getElementById("currentAyah");
    const total = document.getElementById("totalAyahs");

    if (current) current.textContent = currentAyah;
    if (total) total.textContent = surahCounts[currentSurah] || "?";
}


/* ---------- UI INIT ---------- */

function setupUI() {

    const totalEl = $("totalAyahs");
    if (totalEl) {
        totalEl.textContent = surahCounts[currentSurah] || "?";
    }

    focusAyah(currentAyah);
}
function toggleTheme() {
    const isLight = document.body.classList.contains("light");
    setTheme(isLight ? "dark" : "light");
}

let fontSize = parseInt(localStorage.getItem("fontSize")) || 32;

/*
function applyFontSize() {
    const root = document.documentElement;
    const current = getComputedStyle(root)
        .getPropertyValue("--ayah-font-size");

    const newSize = fontSize + "px";

    if (current.trim() === newSize) return; // skip duplicate

    console.log("🔥 FONT SIZE APPLY:", fontSize);

    root.style.setProperty("--ayah-font-size", newSize);
//    localStorage.setItem("fontSize", fontSize);
}
*/

function applyFontSize() {
    const root = document.documentElement;

    const newSize = fontSize + "px";

    console.log("🔥 FONT SIZE APPLY:", fontSize);

    root.style.setProperty("--ayah-font-size", newSize);
}

/* ---------- FONT SIZE ---------- */
function changeFontSize(amount) {
    fontSize += amount;

    if (fontSize < 18) fontSize = 18;
    if (fontSize > 60) fontSize = 60;

    applyFontSize();

    localStorage.setItem("fontSize", fontSize);
}
/* ---------- THEME -------------- */
function setTheme(mode) {
    document.body.classList.remove("light");

    if (mode === "light") {
        document.body.classList.add("light");
    }

    localStorage.setItem("theme", mode);
}

/* ---------- NAV BUTTONS ---------- */

function setupNavigation() {
    bind("nextBtn", "click", goNext);
    bind("prevBtn", "click", goPrev);
}

/* ---------- DROPDOWNS ---------- */

function setupDropdowns() {

    const surahSelect = $("surahSelect");

    if (surahSelect) {
        surahSelect.value = String(currentSurah);
        surahSelect.addEventListener("change", (e) => {
            window.location.href = `/view/${e.target.value}/1`;
        });
    }

    const ayahSelect = $("ayahSelect");

    if (!ayahSelect) return;

    const total = surahCounts[currentSurah] || 0;

    ayahSelect.innerHTML = "";

    for (let i = 1; i <= total; i++) {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = "Ayah " + i;
        ayahSelect.appendChild(opt);
    }
    surahSelect.value = currentSurah;
    ayahSelect.value = currentAyah;

    ayahSelect.addEventListener("change", (e) => {
        window.location.href =
            `/view/${currentSurah}/${e.target.value}`;
    });
}
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("close-note")) {

        const popup = e.target.closest(".note-popup");
        if (!popup) return;

        popup.classList.add("hidden");
    }
});
/* ---------- AUDIO ---------- */

function setupAudio() {
    if (!audioPlayer) return;
    audioPlayer.addEventListener("ended", handleAudioEnd);
}
function handleAudioEnd() {
    if (!isPlayingSurah) return;
    currentIndex++;
    if (currentIndex >= surahQueue.length) {
        isPlayingSurah = false;
        return;
    }
    playNextInSurah();
}

/* ---------- NAVIGATION ---------- */

function goNext() {
    let s = currentSurah;
    let a = currentAyah;
    const max = surahCounts[s] || 0;
    a++;

    if (a > max) {
        s++;
        if (!surahCounts[s]) return;
        a = 1;
    }

    window.location.href = `/view/${s}/${a}`;
}

function goPrev() {
    let s = currentSurah;
    let a = currentAyah;

    a--;

    if (a < 1) {
        s--;
        if (!surahCounts[s]) return;
        a = surahCounts[s];
    }

    window.location.href = `/view/${s}/${a}`;
}

/* ---------- AYAH FOCUS ---------- */

function focusAyah(num) {

    if (lastFocused === num) return; // 🚫 prevent double run

    lastFocused = num;

    currentAyah = num;
    currentIndex = num - 1;
    console.log("focusAyah called:", num);
    // remove old highlight from CARD (not text)
    document.querySelectorAll(".ayah-row")
        .forEach(el => el.classList.remove("active"));

    // highlight current CARD
    const el = document.getElementById("ayah-" + num);

    if (el) {
        el.classList.add("active");

        el.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    // UI updates
    const currentEl = document.getElementById("currentAyah");
    if (currentEl) currentEl.textContent = num;

    const select = document.getElementById("ayahSelect");
    if (select) select.value = num;

    sendProgress();
}

// function focusAyah(num) {
//     currentAyah = num;
//     currentIndex = num - 1;
//     document.querySelectorAll(".ayah-block")
//         .forEach(el => el.classList.remove("active"));
//     const el = document.getElementById("ayah-" + num);
//     if (!el) return;
//     el.classList.add("active");
//     const offset = 120;
//     const top = el.getBoundingClientRect().top + window.scrollY - offset;
//     window.scrollTo({ top, behavior: "smooth" });
// }

/* ---------- AUDIO PLAYBACK ---------- */

function playAyah() {

    if (!audioPlayer) return;

    const id =
        String(currentSurah).padStart(3, "0") +
        String(currentAyah).padStart(3, "0");

    audioPlayer.src =
        "https://everyayah.com/data/Alafasy_128kbps/" + id + ".mp3";

    audioPlayer.play();
}

function playSurah() {
    const total = surahCounts[currentSurah] || 0;
    surahQueue = [];
    for (let i = 1; i <= total; i++) {
        const id =
            String(currentSurah).padStart(3, "0") +
            String(i).padStart(3, "0");

        surahQueue.push(
            "https://everyayah.com/data/Alafasy_128kbps/" + id + ".mp3"
        );
    }
    currentIndex = currentAyah - 1;
    isPlayingSurah = true;
    playNextInSurah();
}


function playNextInSurah() {
    if (!isPlayingSurah) return;
    // current ayah being played
    const ayahNum = currentIndex + 1;
    // highlight it
    focusAyah(ayahNum);
    // load audio
    audioPlayer.src = surahQueue[currentIndex];
    audioPlayer.play()
        .catch(err => {
            console.log(err);
            isPlayingSurah = false;
        });
}

/* ---------- PROGRESS ---------- */

let lastSaved = "";


async function sendProgress() {
    if (!currentSurah || !currentAyah) return;
    const key = `${currentSurah}:${currentAyah}`;
    // avoid duplicate saves
    if (key === lastSaved) return;
    lastSaved = key;
    try {
        await fetch("/save_progress", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                surah: currentSurah,
                ayah: currentAyah
            })
        });
    } catch (err) {
        console.log("Save failed");
    }
}


async function loadProgress() {
    try {
        console.log("STEP 1: fetch start");
        const res = await fetch("/get_progress");
        console.log("STEP 2: got response");
        const data = await res.json();
        console.log("STEP 3: parsed json", data);
        currentSurah = data.surah;
        currentAyah = data.ayah;
        console.log("STEP 4: calling loadAyah");
        loadAyah(currentSurah, currentAyah);
        console.log("STEP 5: calling setupDropdowns");
        setupDropdowns();
        console.log("STEP 6: calling loadReadStates");
        loadReadStates(currentSurah);
        console.log("STEP 7: calling focusAyah");
        focusAyah(currentAyah);

    } catch (err) {
        console.error("LOAD PROGRESS ERROR:", err);
    }
}

function loadAyah(surah, ayah) {
    currentSurah = surah;
    currentAyah = ayah;
    const target = document.querySelector(`[data-ayah="${ayah}"]`);
    if (target) {
        target.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
        target.classList.add("active");
    }
}

function waitForAyahs() {
    return new Promise(resolve => {
        const check = () => {
            const rows = document.querySelectorAll(".ayah-row");
            if (rows.length > 0) return resolve();
            setTimeout(check, 50);
        };
        check();
    });
}

async function loadNoteStates(surah) {

    const res = await fetch(`/get_notes?surah=${surah}`);
    const data = await res.json();

    console.log("NOTE MAP:", data);

    document.querySelectorAll(".note-dot").forEach(dot => {
        dot.classList.remove("has-note");
    });

    document.querySelectorAll(".ayah-row").forEach(card => {

        const ayah = String(card.dataset.ayah);
        const dot = card.querySelector(".note-dot");

        const note = data[ayah] ?? "";
        const hasNote = note.trim().length > 0;

        if (dot) {
            dot.classList.toggle("has-note", hasNote);
        }
    });
}

async function loadReadStates(surah) {
    const res = await fetch(`/get_read?surah=${surah}`);
    const data = await res.json();

    Object.entries(data).forEach(([ayah, is_read]) => {

        const card = document.getElementById(`ayah-${ayah}`);
        if (!card) return;

        const checkbox = card.querySelector(".read-toggle");

        const isRead = Number(is_read) === 1;

        if (checkbox) checkbox.checked = isRead;

        card.classList.toggle("read", isRead);
    });
}

document.querySelectorAll(".read-checkbox").forEach(cb => {
    cb.addEventListener("change", async function () {
        const surah = this.dataset.surah;
        const ayah = this.dataset.ayah;
        const is_read = this.checked;
        const card = document.getElementById(`ayah-${ayah}`);
        if (is_read) {
            card.classList.add("read");
        } else {
            card.classList.remove("read");
        }
        await fetch("/set_read", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                surah: currentSurah,
                ayah: ayahNumber,
                is_read: isRead
            })
        });
    });
});
/* ---------- IS READ ---------- */
document.addEventListener("change", async (e) => {

    console.log("EVENT TARGET:", e.target);

    if (!e.target.classList.contains("read-toggle")) return;

    console.log("PASS: read-toggle detected");

    const row = e.target.closest(".ayah-row");

    if (!row) {
        console.error("ROW NOT FOUND");
        return;
    }

    console.log("ROW FOUND:", row);

    const ayahNumber = row.dataset.ayah;
    const isRead = e.target.checked;

    // ✅ FIXED: use correct endpoint
    await fetch("/set_read", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            surah: currentSurah,   // IMPORTANT (you need this)
            ayah: ayahNumber,
            is_read: isRead
        })
    });

    row.classList.toggle("read", isRead);
});

/* ---------- BOOKMARK ---------- */

document.addEventListener("DOMContentLoaded", () => {
    loadBookmarks();
});

function loadBookmarks() {
    fetch("/api/bookmarks")
        .then(res => res.json())
        .then(data => {

        const box = document.getElementById("list");
        if (!box) return;

        box.innerHTML = "";

            if (!data.bookmarks || data.bookmarks.length === 0) {
                box.innerHTML = "<p>No bookmarks yet</p>";
                return;
            }

            data.bookmarks.forEach(b => {

                const row = document.createElement("div");
                row.className = "verse";

                row.innerHTML = `
                    <div class="left">
                        <div class="ref">
                            Surah ${b.surah}:${b.ayah}
                        </div>

                        <div class="text">
                            ${b.label || "No label"}
                        </div>
                    </div>

                    <div class="actions">
                        <button onclick="openVerse(${b.surah}, ${b.ayah})">
                            Open
                        </button>

                        <button class="delete-btn" onclick="deleteBookmark(${b.id})">
                            Delete
                        </button>
                    </div>
                `;

                box.appendChild(row);
            });
        });
}

function openVerse(surah, ayah) {
    window.location.href = `/view/${surah}/${ayah}`;
}

function deleteBookmark(id) {
    fetch(`/bookmark/${id}`, {
        method: "DELETE"
    })
    .then(() => loadBookmarks());
}

window.addBookmark = function () {

    const label = prompt("Enter bookmark name:");
    if (!label) return;

    console.log("ADD BOOKMARK CLICKED");

    fetch("/bookmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            surah: window.pageData.surah,
            ayah: window.pageData.ayah,
            label: label
        })
    })
    .then(res => res.json())
    .then(() => {
        console.log("Bookmark saved");
    })
    .catch(err => console.error("Bookmark failed:", err));
};

/* ---------- PIN ------------------- */
function pinAyah() {
    if (!currentSurah || !currentAyah) {
        console.error("No ayah selected");
        return;
    }

    fetch("/pin", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            surah: currentSurah,
            ayah: currentAyah
        })
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("pinStatus").innerText =
            `📌 Pinned ${currentSurah}:${currentAyah}`;

        showToast(`📌 Pinned ${currentSurah}:${currentAyah}`);
        
        console.log("Pinned:", data);
    })
    .catch(err => console.error("Pin error:", err));
}
function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("show");
    }, 10);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

async function goContinue() {
    const res = await fetch("/pin");
    const pin = await res.json();

    if (!pin || !pin.surah || !pin.ayah) {
        console.log("No pin found");
        return;
    }

    console.log("Going to pin:", pin);

    goToAyah(pin.surah, pin.ayah);
}

let pinsCache = [];
let currentPinIndex = -1;

async function loadPins() {
    const res = await fetch("/pins");
    pinsCache = await res.json();
}

function goToAyah(surah, ayah) {
    window.location.href = `/view/${surah}/${ayah}`;
}

function renderAyah(text) {
    const container = document.getElementById("ayahText");

    // split words but keep punctuation safe
    const words = text.split(/(\s+)/);

    container.innerHTML = words.map(w => {
        if (w.trim() === "") return w;

        // strip punctuation for lookup
        const clean = w.replace(/[.,!?;:"'()]/g, "");

        return `<span class="word" data-word="${clean}">${w}</span>`;
    }).join("");
}
/* ---------- DICTIONARY ---------- */
// click handler (event delegation)
document.addEventListener("click", async (e) => {

    // ignore toolbar clicks
    if (e.target.closest(".tool-btn")) return;

    console.log("🟡 CLICK EVENT FIRED:", e.target);

    if (!e.target.classList.contains("word")) {
        console.log("❌ Not a word span, ignoring");
        return;
    }

    console.log("✅ Word clicked");

    const word = (e.target.dataset.word || "").toLowerCase().trim();
    console.log("🔤 Raw dataset.word:", e.target.dataset.word);
    console.log("🔤 Clean word:", word);

    if (!word) {
        console.log("❌ Empty word, stopping");
        return;
    }

    const popup = document.getElementById("popup");

    if (!popup) {
        console.log("❌ POPUP ELEMENT NOT FOUND IN DOM");
        return;
    }

    console.log("✅ Popup found:", popup);

    popup.classList.remove("hidden");
    popup.innerHTML = "Loading...";

    showPopupTemporarily(popup);

    const rect = e.target.getBoundingClientRect();

// position near clicked word
popup.style.position = "absolute";

// horizontal position
let left = rect.left + window.scrollX;
let top = rect.bottom + window.scrollY + 8;

// prevent going off screen (right edge)
left = Math.min(left, window.innerWidth - 260);

popup.style.left = left + "px";
popup.style.top = top + "px";


function showPopupTemporarily(popup) {
    clearTimeout(popupTimer);

    popupTimer = setTimeout(() => {
        popup.classList.add("hidden");
    }, 5000);
}

    console.log("🌐 Fetching dictionary for:", word);

    try {
        const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
        console.log("📡 Request URL:", url);

        const res = await fetch(url);

        console.log("📥 Response status:", res.status);

        if (!res.ok) {
            console.log("❌ API returned NOT OK");
            popup.innerHTML = `No definition found for <b>${word}</b>`;
            return;
        }

        const data = await res.json();

        console.log("📦 API response:", data);

        const entry = data?.[0];

        if (!entry) {
            console.log("❌ No entry in response");
            popup.innerHTML = "No definition found";
            return;
        }

        const meaning =
            entry?.meanings?.[0]?.definitions?.[0]?.definition ||
            "No definition available";

        console.log("📖 Meaning extracted:", meaning);

        popup.innerHTML = `
            <b>${entry.word}</b><br><br>
            ${meaning}
        `;

        console.log("🎯 Popup updated successfully");

    } catch (err) {
        console.log("💥 FETCH ERROR:", err);
        popup.innerHTML = "Error fetching definition.";
    }
});

function makeClickable(text) {
    return text.split(/(\s+)/).map(w => {
        if (w.trim() === "") return w;

        const clean = w.replace(/[.,!?;:"'()]/g, "");

        return `<span class="word" data-word="${clean}">${w}</span>`;
    }).join("");
}

function initClickableAyahs() {
    document.querySelectorAll("[data-ayah]").forEach(el => {

        if (el.dataset.clickable === "true") return;

        const ayahText = el.querySelector(".ayah");
        if (!ayahText) return;

        ayahText.innerHTML = makeClickable(ayahText.innerText);

        el.dataset.clickable = "true";
    });
}
/* ---------- CONTROLS ---------- */

function togglePause() {

    if (!audioPlayer) return;

    if (audioPlayer.paused) {
        audioPlayer.play();
    } else {
        audioPlayer.pause();
    }
}
/* ---------- NOTES ---------- */

document.addEventListener("click", async (e) => {

    // OPEN NOTE
    if (e.target.classList.contains("note-dot")) {

        const row = e.target.closest(".ayah-row");
        const surah = currentSurah;
        const ayah = row.dataset.ayah;

        const popup = row.querySelector(".note-popup");
        const textarea = row.querySelector(".note-text");

        if (popup.dataset.loaded !== "1") {
            const res = await fetch(`/get_note?surah=${surah}&ayah=${ayah}`);
            const data = await res.json();

            textarea.value = data.note || "";
            popup.dataset.loaded = "1";
        }

        popup.classList.toggle("hidden");
        return;
    }

    // SAVE NOTE
    if (e.target.classList.contains("save-note")) {

        const row = e.target.closest(".ayah-row");

        const surah = currentSurah;
        const ayah = row.dataset.ayah;
        const textarea = row.querySelector(".note-text");

        const note = textarea.value;

        await fetch("/save_note", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ surah, ayah, note })
        });

        const dot = row.querySelector(".note-dot");

        dot.classList.toggle("has-note", note.trim() !== "");

        console.log("NOTE SAVED");
        return;
    }
});
/* -------------------------------- */
/* AUTO HIDE CONTROLS               */
/* -------------------------------- */

let controlsTimer = null;

document.addEventListener("DOMContentLoaded", () => {

    loadProgress();
    applyFontSize();

    // Words clickable
    setTimeout(() => {
        initClickableAyahs();
    }, 50);

    const saved = localStorage.getItem("theme") || "dark";
    setTheme(saved);

    const controls =
        document.querySelector(".left-controls");

    if (!controls) return;

    function hideControls() {
        controls.classList.add("hidden");
    }

    function showControls() {

        controls.classList.remove("hidden");

        clearTimeout(controlsTimer);

        controlsTimer = setTimeout(() => {
            hideControls();
        }, 2000);
    }

    // initial timer
    showControls();

    // mouse enters controls area
    controls.addEventListener("mouseenter", () => {
        showControls();
    });

    // movement near left edge restores controls
    document.addEventListener("mousemove", (e) => {

        if (e.clientX < 120) {
            showControls();
        }
    });

    // touch support
    document.addEventListener("touchstart", (e) => {

        const x = e.touches[0].clientX;

        if (x < 120) {
            showControls();
        }
    });
});