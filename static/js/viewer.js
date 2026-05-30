/* =========================================================
   SAFE HELPERS
========================================================= */
console.log("Hello Shabir")
let lastFocused = null;
let popupTimer = null;
let controlsTimer = null;
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
/* =========================================================
   STATE
========================================================= */
let audioPlayer = null;
let currentSurah;
let currentAyah;
let currentIndex = 0;
let isPlayingSurah = false;
let surahQueue = [];
let lastSaved = "";
let pinsCache = [];
let currentPinIndex = -1;
let fontSize = parseInt(localStorage.getItem("fontSize")) || 32;

const surahCounts = window.surahCounts || {};
const pageData = window.pageData || null;
/* =========================================================
   INIT
========================================================= */
document.addEventListener("DOMContentLoaded", init);
async function init() {
    if (!pageData) {
        console.warn("pageData missing");
        return;
    }
    console.log("INIT START");
    currentSurah = pageData.surah;
    currentAyah = pageData.ayah;
    currentIndex = currentAyah - 1;
    audioPlayer = $("audioPlayer");

    updateAyahInfo();
    setupUI();
    setupNavigation();
    setupDropdowns();
    setupAudio();
    setupTheme();
    setupControlsAutoHide();
    applyFontSize();

    await waitForAyahs();
    initClickableAyahs();
    console.log("initClickableAyahs")

    await loadReadStates(currentSurah);
    console.log("loadReadStates")

    await waitForAyahs();
    await loadNoteStates(currentSurah);
    console.log("loadNoteStates")

    await loadBookmarks();
    console.log("loadBookmarks")

    await loadProgress();
    console.log("loadProgress")

    console.log("INIT DONE");
}
/* =========================================================
   UI
========================================================= */
function updateAyahInfo() {
    const current = $("currentAyah");
    const total = $("totalAyahs");
    if (current) current.textContent = currentAyah;
    if (total) total.textContent = surahCounts[currentSurah] || "?";
}
function setupUI() {
    const totalEl = $("totalAyahs");
    if (totalEl) totalEl.textContent = surahCounts[currentSurah] || "?";
    focusAyah(currentAyah);
}
function stripHtml(html) {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
}
/* =========================================================
   THEME
========================================================= */
function setupTheme() {
    const saved = localStorage.getItem("theme") || "dark";
    setTheme(saved);
}
function setTheme(mode) {
    document.body.classList.remove("light");
    if (mode === "light") document.body.classList.add("light");
    localStorage.setItem("theme", mode);
}
function toggleTheme() {
    const isLight = document.body.classList.contains("light");
    setTheme(isLight ? "dark" : "light");
}
/* =========================================================
   FONT SIZE
========================================================= */
function applyFontSize() {
    const root = document.documentElement;
    root.style.setProperty("--ayah-font-size", fontSize + "px");
    console.log("🔥 FONT SIZE APPLY:", fontSize);
}
function changeFontSize(amount) {
    fontSize += amount;
    if (fontSize < 18) fontSize = 18;
    if (fontSize > 60) fontSize = 60;
    applyFontSize();
    localStorage.setItem("fontSize", fontSize);
}
/* =========================================================
   NAVIGATION
========================================================= */
function setupNavigation() {
    bind("nextBtn", "click", goNext);
    bind("prevBtn", "click", goPrev);
}
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
/* =========================================================
   DROPDOWNS
========================================================= */
function setupDropdowns() {
    const surahSelect = $("surahSelect");
    const ayahSelect = $("ayahSelect");

    if (!surahSelect || !ayahSelect) return;
    surahSelect.value = String(currentSurah);
    surahSelect.onchange = (e) => window.location.href = `/view/${e.target.value}/1`;
    const total = surahCounts[currentSurah] || 0;
    ayahSelect.innerHTML = "";

    for (let i = 1; i <= total; i++) {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = "Ayah " + i;
        ayahSelect.appendChild(opt);
    }
    ayahSelect.value = String(currentAyah);
    ayahSelect.onchange = (e) => window.location.href = `/view/${currentSurah}/${e.target.value}`;
    console.log("Dropdowns loaded");
}
/* =========================================================
   AYAH FOCUS
========================================================= */
function focusAyah(num) {
    if (lastFocused === num) return;
    lastFocused = num;
    currentAyah = num;
    currentIndex = num - 1;

    highlightAyah(num);
    updateAyahInfo();

    const select = $("ayahSelect");
    if (select) select.value = num;
    sendProgress();
}

function highlightAyah(num) {
    document.querySelectorAll(".ayah-row").forEach(el => el.classList.remove("active"));
    const el = $("ayah-" + num);
    if (!el) return;
    el.classList.add("active");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
}
/* =========================================================
   AUDIO
========================================================= */
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

function playAyah() {
    if (!audioPlayer) return;
    const id = String(currentSurah).padStart(3, "0") + String(currentAyah).padStart(3, "0");
    audioPlayer.src = "https://everyayah.com/data/Alafasy_128kbps/" + id + ".mp3";
    audioPlayer.play();
}

function playSurah() {
    const total = surahCounts[currentSurah] || 0;
    surahQueue = [];
    for (let i = 1; i <= total; i++) {
        const id = String(currentSurah).padStart(3, "0") + String(i).padStart(3, "0");
        surahQueue.push("https://everyayah.com/data/Alafasy_128kbps/" + id + ".mp3");
    }
    currentIndex = currentAyah - 1;
    isPlayingSurah = true;
    playNextInSurah();
}

function playNextInSurah() {
    if (!isPlayingSurah) return;
    const ayahNum = currentIndex + 1;
    focusAyah(ayahNum);
    if (!surahQueue[currentIndex]) {
        isPlayingSurah = false;
        return;
    }
    audioPlayer.src = surahQueue[currentIndex];
    audioPlayer.play().catch(err => {
        console.log(err);
        isPlayingSurah = false;
    });
}
function togglePause() {
    if (!audioPlayer) return;
    if (audioPlayer.paused) audioPlayer.play();
    else audioPlayer.pause();
}
/* =========================================================
   PROGRESS
========================================================= */
async function sendProgress() {
    if (!currentSurah || !currentAyah) return;
    const key = `${currentSurah}:${currentAyah}`;
    if (key === lastSaved) return;
    lastSaved = key;
    try {
        await fetch("/save_progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ surah: currentSurah, ayah: currentAyah })
        });
    } catch {
        console.log("Save failed");
    }
}
async function loadProgress() {
    try {
        const res = await fetch("/get_progress");
        const data = await res.json();
        currentSurah = data.surah;
        currentAyah = data.ayah;
        focusAyah(currentAyah);
        setupDropdowns();
        await loadReadStates(currentSurah);
    } catch (err) {
        console.error("LOAD PROGRESS ERROR:", err);
    }
}
/* =========================================================
   WAIT FOR AYAHS
========================================================= */
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
/* =========================================================
   READ STATES
========================================================= */
async function loadReadStates(surah) {
    const res = await fetch(`/get_read?surah=${surah}`);
    const data = await res.json();
    Object.entries(data).forEach(([ayah, is_read]) => {
        const card = $("ayah-" + ayah);
        if (!card) return;
        const checkbox = card.querySelector(".read-toggle");
        const isRead = Number(is_read) === 1;
        if (checkbox) checkbox.checked = isRead;
        card.classList.toggle("read", isRead);
    });
}
document.addEventListener("change", async (e) => {
    if (!e.target.classList.contains("read-toggle")) return;
    const row = e.target.closest(".ayah-row");
    if (!row) return;
    const ayahNumber = row.dataset.ayah;
    const isRead = e.target.checked;
    await fetch("/set_read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surah: currentSurah, ayah: ayahNumber, is_read: isRead })
    });
    row.classList.toggle("read", isRead);
});
/* =========================================================
   NOTES
========================================================= */
async function loadNoteStates(surah) {
    const res = await fetch(`/get_notes?surah=${surah}`);
    const data = await res.json();

    console.log("RAW NOTE RESPONSE:", data);
    console.log("TYPE:", typeof data);
    console.log("KEYS:", Object.keys(data || {}));
    console.table(data);

    document.querySelectorAll(".note-dot").forEach(dot => dot.classList.remove("has-note"));
    document.querySelectorAll(".ayah-row").forEach(card => {
        const ayah = String(card.dataset.ayah);
        const dot = card.querySelector(".note-dot");
        const note = data[ayah] ?? "";
        const hasNote = note.trim().length > 0;
        if (dot) dot.classList.toggle("has-note", hasNote);
    });
}
document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("note-dot")) {
        const row = e.target.closest(".ayah-row");
        if (!row) return;
        const surah = currentSurah;
        const ayah = row.dataset.ayah;
        const popup = row.querySelector(".note-popup");
        const textarea = row.querySelector(".note-text");
        if (!popup || !textarea) return;
        if (popup.dataset.loaded !== "1") {
            const res = await fetch(`/get_note?surah=${surah}&ayah=${ayah}`);
            const data = await res.json();
            textarea.value = stripHtml(data.note);
            const preview = row.querySelector(".note-preview");
            if (preview) preview.innerHTML = data.note || "";
            popup.dataset.loaded = "1";
        }
        popup.classList.toggle("hidden");
        return;
    }
    if (e.target.classList.contains("close-note")) {
        const popup = e.target.closest(".note-popup");
        if (!popup) return;
        popup.classList.add("hidden");
        return;
    }
    if (e.target.classList.contains("save-note")) {
        const row = e.target.closest(".ayah-row");
        if (!row) return;
        const surah = currentSurah;
        const ayah = row.dataset.ayah;
        const textarea = row.querySelector(".note-text");
        if (!textarea) return;
        const note = textarea.value;
        await fetch("/save_note", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ surah, ayah, note })
        });
        const dot = row.querySelector(".note-dot");
        if (dot) dot.classList.toggle("has-note", note.trim() !== "");
        console.log("NOTE SAVED");
        return;
    }
});
/* =========================================================
   BOOKMARKS
========================================================= */
async function loadBookmarks() {
    try {
        const res = await fetch("/api/bookmarks");
        const data = await res.json();
        const box = $("list");
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
                    <div class="ref">Surah ${b.surah}:${b.ayah}</div>
                    <div class="text">${b.label || "No label"}</div>
                </div>
                <div class="actions">
                    <button onclick="openVerse(${b.surah}, ${b.ayah})">Open</button>
                    <button class="delete-btn" onclick="deleteBookmark(${b.id})">Delete</button>
                </div>
            `;
            box.appendChild(row);
        });
    } catch (err) {
        console.error("BOOKMARK LOAD ERROR:", err);
    }
}
function openVerse(surah, ayah) {
    window.location.href = `/view/${surah}/${ayah}`;
}
function deleteBookmark(id) {
    fetch(`/bookmark/${id}`, { method: "DELETE" }).then(() => loadBookmarks());
}
window.addBookmark = function () {
    const label = prompt("Enter bookmark name:");
    if (!label) return;
    fetch("/bookmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surah: currentSurah, ayah: currentAyah, label })
    }).then(res => res.json()).then(() => {
        console.log("Bookmark saved");
        loadBookmarks();
    }).catch(err => console.error("Bookmark failed:", err));
};
/* =========================================================
   PINS
========================================================= */
function pinAyah() {
    if (!currentSurah || !currentAyah) return;
    fetch("/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surah: currentSurah, ayah: currentAyah })
    }).then(res => res.json()).then(data => {
        const pinStatus = $("pinStatus");
        if (pinStatus) pinStatus.innerText = `📌 Pinned ${currentSurah}:${currentAyah}`;
        showToast(`📌 Pinned ${currentSurah}:${currentAyah}`);
        console.log("Pinned:", data);
    });
}
async function goContinue() {
    const res = await fetch("/pin");
    const pin = await res.json();
    if (!pin || !pin.surah || !pin.ayah) return;
    goToAyah(pin.surah, pin.ayah);
}
async function loadPins() {
    const res = await fetch("/pins");
    pinsCache = await res.json();
}
function goToAyah(surah, ayah) {
    window.location.href = `/view/${surah}/${ayah}`;
}
/* =========================================================
   TOAST
========================================================= */
function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}
/* =========================================================
   CLICKABLE WORDS
========================================================= */
function renderAyah(text) {
    const container = $("ayahText");
    if (!container) return;
    const words = text.split(/(\s+)/);
    container.innerHTML = words.map(w => {
        if (w.trim() === "") return w;
        const clean = w.replace(/[.,!?;:"'()]/g, "");
        return `<span class="word" data-word="${clean}">${w}</span>`;
    }).join("");
}
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
/* =========================================================
   WKIK
========================================================= */
function renderNote(note) {
    const link = getWikiLink(note.surahName);

    return `
        <div class="note">
            <p>${note.text}</p>
            <a href="${link}" target="_blank">📖 Wikipedia</a>
        </div>
    `;
}
/* =========================================================
   SUMMARY POPUP
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    const summaryBtn = document.getElementById("summaryBtn");
    const closeBtn = document.getElementById("closeSummary");
    if (summaryBtn) {
        summaryBtn.addEventListener("click", async () => {
            const surah = document.getElementById("surahSelect").value;
            const res = await fetch(`/get_surah_summary?surah=${surah}`);
            const data = await res.json();
            console.log("summery text", data.text)
            document.getElementById("summaryText").innerText = data.text || "";
            document.getElementById("summaryPopup").classList.remove("hidden");
        });
    }
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            document.getElementById("summaryPopup").classList.add("hidden");
        });
    }
});

/* =========================================================
   WIKI
========================================================= */


document.addEventListener("DOMContentLoaded", () => {
    const wikiBtn = document.getElementById("wikiBtn");

    if (wikiBtn) {
        wikiBtn.addEventListener("click", async () => {
            const surah = document.getElementById("surahSelect").value;

            const res = await fetch(`/get_wiki_link?surah=${surah}`);
            const data = await res.json();

            if (data.url) {
                window.open(data.url, "_blank");
            } else {
                console.warn("No wiki link found for this surah");
            }
        });
    }
});


/* =========================================================
   DICTIONARY POPUP
========================================================= */
document.addEventListener("click", async (e) => {

//    console.log("🟢 CLICK EVENT FIRED");
    try {
        console.log("STEP 1: tool-btn check");
        if (e.target.closest(".tool-btn")) {
            console.log("❌ Click ignored (tool-btn)");
            return;
        }
//        console.log("STEP 2: word class check");
        if (!e.target.classList.contains("word")) {
            console.log("❌ Not a word element");
            return;
        }
//        console.log("STEP 3: word clicked");
        const word = (e.target.dataset.word || "").toLowerCase().trim();
//        console.log("STEP 4: extracted word =", word);
        if (!word) {
//            console.log("❌ Empty word, stopping");
            return;
        }
//        console.log("STEP 5: getting popup element");
        const popup = document.getElementById("popup");
//        console.log("popup element =", popup);
        if (!popup) {
            console.error("❌ popup NOT FOUND in DOM");
            return;
        }
//        console.log("STEP 6: clearing timer");
        clearTimeout(popupTimer);
//        console.log("STEP 7: showing popup");
        popup.classList.remove("hidden");
        popup.innerHTML = "Loading...";
//        console.log("STEP 8: positioning popup");
        const rect = e.target.getBoundingClientRect();
        let left = rect.left + window.scrollX;
        let top = rect.bottom + window.scrollY + 8;
//        console.log("raw position:", { left, top });
        left = Math.min(left, window.innerWidth - 260);
        popup.style.position = "absolute";
        popup.style.left = left + "px";
        popup.style.top = top + "px";
//        console.log("STEP 9: popup positioned");
        popupTimer = setTimeout(() => {
//            console.log("AUTO HIDE popup");
            popup.classList.add("hidden");
        }, 5000);
//        console.log("STEP 10: starting fetch");
        const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
//        console.log("fetch URL =", url);
        const res = await fetch(url);
//        console.log("STEP 11: fetch done, status =", res.status);
        if (!res.ok) {
            popup.innerHTML = `No definition found for <b>${word}</b>`;
            return;
        }
//        console.log("STEP 12: parsing JSON");
        const data = await res.json();
//        console.log("STEP 13: JSON parsed", data);
        const entry = data?.[0];
//        console.log("STEP 14: entry =", entry);
        const meaning =
            entry?.meanings?.[0]?.definitions?.[0]?.definition
            || "No definition";
//        console.log("STEP 15: setting popup text");
        popup.innerHTML = `<b>${entry.word}</b><br><br>${meaning}`;
//        console.log("STEP 16: DONE");
    } catch (err) {
//        console.error("🔥 CLICK HANDLER ERROR:", err);
    }
});/* =========================================================
   AUTO HIDE CONTROLS
========================================================= */
function setupControlsAutoHide() {
    const controls = document.querySelector(".left-controls");
    if (!controls) return;
    function hideControls() { controls.classList.add("hidden"); }
    function showControls() {
        controls.classList.remove("hidden");
        clearTimeout(controlsTimer);
        controlsTimer = setTimeout(() => hideControls(), 2000);
    }
    showControls();
    controls.addEventListener("mouseenter", showControls);
    document.addEventListener("mousemove", e => { if (e.clientX < 120) showControls(); });
    document.addEventListener("touchstart", e => { if (e.touches[0].clientX < 120) showControls(); });
}