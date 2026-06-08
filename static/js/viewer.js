/* =========================================================
   SAFE HELPERS
========================================================= */

console.log("NAV HANDLER FILE LOADED");
let lastFocused = null;
let popupTimer = null;
let controlsTimer = null;
const originalSetItem = localStorage.setItem;

localStorage.setItem = function (key, value) {
    console.trace("🧨 localStorage.setItem CALLED:", key, value);
    originalSetItem.apply(this, arguments);
};


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
function observeLeftControls() {
    const controls = document.querySelector(".left-controls");
    if (!controls) return;

    const observer = new MutationObserver(() => {
        const hidden = controls.classList.contains("hidden");

        if (hidden) {
            document.body.classList.add("controls-hidden");
        } else {
            document.body.classList.remove("controls-hidden");
        }
    });

    observer.observe(controls, {
        attributes: true,
        attributeFilter: ["class"]
    });
}


document.addEventListener("DOMContentLoaded", init);

async function init() {
    if (!pageData) {
        console.warn("pageData missing");
        return;
    }

    await setupApp();
    await hydrateApp();
    await postRender();


}

async function setupApp() {
    currentSurah = pageData.surah;
    currentAyah = pageData.ayah;
    currentIndex = currentAyah - 1;
    audioPlayer = $("audioPlayer");

    setupUI();
    setupDropdowns();
    setupAudio();
    setupTheme();
    setupControlsAutoHide();
    setupSummary();
    setupLinks();

    observeLeftControls();
    applyFontSize();
    updateAyahInfo();
    loadreadProgress();
}
async function hydrateApp() {
    await loadReadStates(currentSurah);
    await waitForAyahs();
    await loadNoteStates(currentSurah);
    await loadBookmarks();

    // IMPORTANT: only override progress AFTER initial render is stable
    const progress = await loadProgress();
    if (progress) {
        currentSurah = progress.surah;
        currentAyah = progress.ayah;
        currentIndex = currentAyah - 1;
    }
}

async function postRender() {
    await waitForAyahs();   // 1. render .ayah text
    wrapWords();         // 2. convert text → spans
    await loadHighlights(); // 3. apply DB highlights

    focusAyah(currentSurah, currentAyah); // 4. now safe
    requestAnimationFrame(() => {
        updateAyahInfo();
    });
}

/* =========================================================
   UI
========================================================= */
/* Updates: current ayah number display, total ayahs display*/
function updateAyahInfo() {
    const current = $("currentAyah");
    const total = $("totalAyahs");
    if (current) current.textContent = currentAyah;
    if (total) total.textContent = surahCounts[currentSurah] || "?";
}

/*Initial UI setup: sets total ayahs, forces initial highlight via focusAyah */
function setupUI() {
    const totalEl = $("totalAyahs");
    if (totalEl) totalEl.textContent = surahCounts[currentSurah] || "?";

    focusAyah(currentSurah, currentAyah);
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
=========================================================*/

function goNextAyah() {
    console.log("NEXT CLICK:", currentSurah, currentAyah);
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

function goPrevAyah() {
    console.log("PREV CLICK:", currentSurah, currentAyah);
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
        opt.textContent = "Ayah " + i +"/"+ total;
        ayahSelect.appendChild(opt);
    }
    ayahSelect.value = String(currentAyah);
    ayahSelect.onchange = (e) => window.location.href = `/view/${currentSurah}/${e.target.value}`;
    console.log("Dropdowns loaded");
}
/* =========================================================
   AYAH FOCUS
    Prevent duplicate updates (lastFocused)
    Update: currentAyah currentIndex
    Call:
        highlightAyah(num)
        updateAyahInfo()
    Sync dropdown
    Save progress
========================================================= */

function focusAyah(surah, ayah) {
    if (lastFocused === `${surah}-${ayah}`) return;
    lastFocused = `${surah}-${ayah}`;
    currentSurah = surah;
    currentAyah = ayah;

    highlightAyah(surah, ayah,true);
    updateAyahInfo();

    const select = $("ayahSelect");
    if (select) select.value = ayah;
    sendProgress();
}

/* Remove .active from all ayahs
   Add .active to current ayah
   Scroll into view (ONLY during playback):
*/

function highlightAyah(surah, ayah, scroll = false) {
    document.querySelectorAll(".ayah-row")
        .forEach(el => el.classList.remove("active"));
    const el = document.getElementById(`ayah-${surah}-${ayah}`);
    if (!el) return;
    el.classList.add("active");
    if (scroll) {
        el.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}
/* =========================================================
   HIGHLIGHTER
========================================================= */
let wrapped = false;

function wrapWords() {
  if (wrapped) return;
  wrapped = true;
  document.querySelectorAll(".ayah").forEach((ayah) => {
    const text = ayah.textContent.trim();
    if (!text) return;
    const words = text.split(/\s+/);
    ayah.innerHTML = words
      .map((word, i) =>
        `<span class="word" data-word="${i}">${word}</span>`
      )
      .join(" ");
    ayah.dataset.wrapped = "1";
  });
}

async function saveHighlight(el) {
  const ayahEl = el.closest(".ayah");
  if (!ayahEl || !ayahEl.dataset?.ayah) {
    console.error("Invalid ayah element:", ayahEl);
    return;
  }
  const ayah = parseInt(ayahEl.dataset.ayah, 10);
  const word = parseInt(el.dataset.word, 10);
  if (Number.isNaN(ayah) || Number.isNaN(word)) {
    console.error("Invalid highlight payload:", { ayah, word });
    return;
  }
  try {
    const res = await fetch("/api/highlight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        surah: currentSurah,
        ayah,
        word_index: word
      })
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("Server error:", err);
      return;
    }
    const data = await res.json();
    el.classList.toggle("highlighted", data.status === "added");
  } catch (err) {
    console.error("Network error:", err);
  }
}

async function loadHighlights() {
  const res = await fetch(`/api/highlights?surah=${currentSurah}`);
  const data = await res.json();
  data.forEach(({ ayah, word_index }) => {
    const ayahEl = document.querySelector(
      `.ayah[data-ayah="${ayah}"]`
    );
    if (!ayahEl) {
      console.warn("Missing ayah in DOM:", ayah);
      return;
    }
    const wordEl = ayahEl.querySelector(
      `.word[data-word="${word_index}"]`
    );
    if (!wordEl) {
      console.warn("Missing word:", ayah, word_index);
      return;
    }
    wordEl.classList.add("highlighted");
  });
}

document.addEventListener("click", (e) => {
  if (!e.target.classList.contains("word")) return;
  const el = e.target;
  el.classList.toggle("highlighted");
  saveHighlight(el);
});

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

    showTray();

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
    if (!surahQueue[currentIndex]) {
        isPlayingSurah = false;
        return;
    }
    focusAyah(currentSurah, ayahNum);

    showTray();

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
   PREV, NEXT & SEARCH SURAH
========================================================= */

document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    switch (btn.dataset.action) {
        case "prev-ayah": return goPrevAyah();
        case "next-ayah": return goNextAyah();
        case "prev-surah": return goToPreviousSurah();
        case "next-surah": return goToNextSurah();
    }
});


const searchBox = document.getElementById("surahSearchBox");
const searchInput = document.getElementById("surahSearchInput");
const resultsBox = document.getElementById("surahSearchResults");

function goToPreviousSurah() {
    if (currentSurah > 1) {
        window.location.href = `/view/${currentSurah - 1}/1`;
    }
}

function goToNextSurah() {
    if (currentSurah < 114) {
        window.location.href = `/view/${currentSurah + 1}/1`;
    }
}

function searchSurah() {
    const query = prompt("Search Surah:");
    if (!query) return;
    const q = query.trim().toLowerCase();
    const match = surahs.find(s =>
        s.name.toLowerCase().includes(q) ||
        s.number.toString() === q
    );
    if (match) {
        loadSurah(match.number);
    } else {
        alert("No matching surah found.");
    }
}

function toggleSearch() {
    const isHidden = searchBox.style.display === "none" || !searchBox.style.display;
    if (isHidden) {
        searchBox.style.display = "block";
        searchInput.focus();
    } else {
        searchBox.style.display = "none";
    }
}

searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
        resultsBox.style.display = "none";
        return;
    }
    const matches = surahs
        .filter(s =>
            s.name.toLowerCase().includes(q) ||
            s.number.toString() === q
        )
        .slice(0, 15);
    renderResults(matches);
});

function renderResults(matches) {
    resultsBox.innerHTML = "";
    if (!matches.length) {
        resultsBox.style.display = "none";
        return;
    }
    matches.forEach(surah => {
        const div = document.createElement("div");
        div.className = "search-item";
        div.textContent = `${surah.number}. ${surah.name}`;
        div.addEventListener("click", () => {
            // ✅ JUMP TO SURAH (ayah 1)
            window.location.href = `/view/${surah.number}/1`;
        });
        resultsBox.appendChild(div);
    });
    resultsBox.style.display = "block";
}

document.addEventListener("click", e => {

    if (!e.target.closest(".surah-search")) {
        resultsBox.style.display = "none";
    }
});

let selectedIndex = -1;

searchInput.addEventListener("keydown", e => {
    const items = [...resultsBox.querySelectorAll(".search-item")];
    if (!items.length) return;
    if (e.key === "ArrowDown") {
        e.preventDefault();
        selectedIndex = Math.min(
            selectedIndex + 1,
            items.length - 1
        );
        updateSelection(items);
    }
    else if (e.key === "ArrowUp") {
        e.preventDefault();
        selectedIndex = Math.max(
            selectedIndex - 1,
            0
        );
        updateSelection(items);
    }
    else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIndex >= 0) {
            items[selectedIndex].click();
        }
    }
});

function updateSelection(items) {
    items.forEach(i => i.classList.remove("active"));
    if (selectedIndex >= 0) {
        items[selectedIndex].classList.add("active");
        items[selectedIndex].scrollIntoView({
            block: "nearest"
        });
    }
}
/* =========================================================
   MARK READ
========================================================= */
document.getElementById("markReadBtn")
    .addEventListener("click", async () => {
        document.querySelectorAll(".read-toggle").forEach(cb => {
            cb.checked = true;
        });
        document.querySelectorAll(".ayah-card").forEach(card => {
            card.classList.add("read");
        });
        const res = await fetch(`/mark_read/${currentSurah}`, {
            method: "POST"
        });
        const data = await res.json();
        if (data.status === "ok") {
            markSurahAsReadUI();
        }
        loadreadProgress();
    });

async function loadreadProgress() {
    const res = await fetch("/readprogress");
    const data = await res.json();
    const el = document.getElementById("progressDisplay");
    el.textContent = `${data.percent}%`;
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

/*
Remove .active from all ayahs
   Add .active to current ayah
Scroll into view (ONLY during playback):
*/
async function loadProgress() {
    try {
        const res = await fetch("/get_progress");
        const data = await res.json();
        currentSurah = data.surah;
        currentAyah = data.ayah;
        setupDropdowns();
        await loadReadStates(currentSurah);
        await waitForAyahs();
        // IMPORTANT: trigger native browser anchor scroll first
        const id = `ayah-${currentSurah}-${currentAyah}`;
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({
                behavior: "auto",
                block: "center"
            });
        }
        focusAyah(currentSurah, currentAyah);
        // then stabilize + apply highlight
        requestAnimationFrame(() => {
            const el = document.getElementById(id);
            if (!el) return;
            el.classList.add("active");
            updateAyahInfo();
        });
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
   Marks ayahs as read
   Fetch backend data
   Set checkbox state
   Toggle .read class
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
    loadreadProgress();
});

/* =========================================================
   NOTES
   Marks which ayahs have notes
    Fetch notes
    Toggle .note-dot
========================================================= */
async function loadNoteStates(surah) {
    const res = await fetch(`/get_notes?surah=${surah}`);
    const data = await res.json();
/*
    console.log("RAW NOTE RESPONSE:", data);
    console.log("TYPE:", typeof data);
    console.log("KEYS:", Object.keys(data || {}));
    console.table(data);
*/
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

        // Show feedback
        const btn = e.target;
        const originalText = btn.textContent;

        btn.textContent = "✓ Saved";
        btn.disabled = true;

        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 1500);

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
                <div class="row">
                    <div class="left">
                        <div class="ref">Surah ${b.surah}:${b.ayah}</div>
                        <div class="text">${b.label || "No label"}</div>
                    </div>
                    <div class="actions">
                        <button class="play-btn">🔊 Play</button>
                        <button class="open-btn">Open</button>
                        <button class="delete-btn">Delete</button>
                    </div>
                </div>
            `;

            // 🔊 PLAY
            row.querySelector(".play-btn").addEventListener("click", (e) => {
                e.stopPropagation();
                playSurah(b.surah, b.ayah);
            });

            // OPEN
            row.querySelector(".open-btn").addEventListener("click", (e) => {
                e.stopPropagation();
                openVerse(b.surah, b.ayah);
            });

            // DELETE
            row.querySelector(".delete-btn").addEventListener("click", (e) => {
                e.stopPropagation();
                deleteBookmark(b.id);
            });

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

function waitForElement(id, timeout = 3000) {
    return new Promise(resolve => {
        const start = Date.now();
        const check = () => {
            const el = document.getElementById(id);
            if (el) return resolve(el);
            if (Date.now() - start > timeout) {
                return resolve(null);
            }
            requestAnimationFrame(check);
        };
        check();
    });
}

async function goContinue() {
    const res = await fetch("/pin");
    const pin = await res.json();
    console.log("PIN FROM SERVER:", pin);
    if (!pin || !pin.surah || !pin.ayah) return;
    goToAyah(pin.surah, pin.ayah);
}

window.goToAyah = function (surah, ayah) {
    window.location.href = `/view/${surah}/${ayah}#ayah-${surah}-${ayah}`;
};


window.addEventListener("DOMContentLoaded", async () => {
const id = window.location.hash.replace("#", "");
if (!id) return;
console.log("scroll target:", id);
const el = document.getElementById(id);
console.log("element found:", !!el);
if (el) {
    el.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}
});

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
   SUMMARY
========================================================= */
function setupSummary() {
    const summaryBtn = document.getElementById("summaryBtn");
    const closeBtn = document.getElementById("closeSummary");
    const saveBtn = document.getElementById("saveSummary");

    let summarySurah = null;

    if (summaryBtn) {
        summaryBtn.addEventListener("click", async () => {
            summarySurah = document.getElementById("surahSelect").value;
            const res = await fetch(
                `/get_surah_summary?surah=${summarySurah}`
            );
            const data = await res.json();
            document.getElementById("summaryText").value =
                data.text || "";
            document.getElementById("summaryPopup")
                .classList.remove("hidden");
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            document.getElementById("summaryPopup")
                .classList.add("hidden");
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener("click", async (e) => {
            const text =
                document.getElementById("summaryText").value;
            await fetch("/update_surah_summary", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    surah: summarySurah,
                    text: text
                })
            });

            const btn = e.target;
            const originalText = btn.textContent;

            btn.textContent = "✓ Saved";
            btn.disabled = true;

            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            }, 1500);
        });
    }
}
/* =========================================================
   WIKI
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

function setupLinks() {
    // Yusuf Ali and other direct URLs
    document.querySelectorAll(".externalLink")
        .forEach(btn => {
            btn.addEventListener("click", () => {
                const surah =
                    document.getElementById("surahSelect").value;
                const url =
                    btn.dataset.url.replace(
                        "{surah}",
                        surah
                    );
                console.log("🔗 Opening:", url);
                window.open(url, "_blank");
            });
        });

    // Wiki links from database
    document.querySelectorAll(".wikiLink")
        .forEach(btn => {
            btn.addEventListener("click", async () => {
                const surah =
                    document.getElementById("surahSelect").value;
                console.log("📖 Requesting wiki for surah:", surah);
                const res =
                    await fetch(
                        `/get_wiki_link?surah=${surah}`
                    );
                const data = await res.json();
                console.log("📦 Wiki response:", data);
                if (data.url) {
                    window.open(data.url, "_blank");
                } else {
                    console.warn(
                        "No wiki URL found for surah",
                        surah
                    );
                }
            });
        });
}

const $ = (id) => document.getElementById(id);

/* =========================================================
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
/* =========================================================
   AUDIO TRAY
========================================================= */
const audioTray = document.getElementById("audioTray");
const trayInfo = document.getElementById("trayInfo");

// show tray when audio starts

function showTray(text = "") {
    const surahNum = Number(currentSurah);
    const ayahNum = Number(currentAyah);
    const surah = surahs.find(s => s.number === surahNum);
    trayInfo.textContent =
        `🔊 ${surah?.number}. ${surah?.name} • Ayah ${ayahNum} • ${text}`;
    audioTray.classList.remove("hidden");
}

// hide tray
function closeTray() {
    audioTray.classList.add("hidden");
}