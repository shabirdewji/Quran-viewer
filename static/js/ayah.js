let audioPlayer;

let currentSurah = window.pageData.surah;
let currentAyah = window.pageData.ayah;

let currentIndex = currentAyah - 1;
let isPlayingSurah = false;
let surahQueue = [];

const surahCounts = window.surahCounts;


/* -------------------------------- */
/* INIT                             */
/* -------------------------------- */

document.addEventListener("DOMContentLoaded", () => {

    audioPlayer = document.getElementById("audioPlayer");

    focusAyah(currentAyah);

    document.getElementById("totalAyahs").textContent =
        surahCounts[currentSurah];

    document.getElementById("surahSelect")
        ?.addEventListener("change", (e) => {
            window.location.href =
                `/view/${e.target.value}`;
        });
});


/* -------------------------------- */
/* CORE NAVIGATION                  */
/* -------------------------------- */

function focusAyah(num) {

    currentAyah = num;
    currentIndex = num - 1;

    document.querySelectorAll(".ayah-block")
        .forEach(el => el.classList.remove("active"));

    const el = document.getElementById("ayah-" + num);

    if (el) {

        el.classList.add("active");

        el.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    document.getElementById("currentAyah").textContent = num;

    document.getElementById("ayahSelect").value = num;

    sendProgress();
}


function goNext() {

    let s = currentSurah;
    let a = currentAyah;

    const max = surahCounts[s];

    a++;

    if (a > max) {
        s++;
        a = 1;

        if (!surahCounts[s]) return;
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


/* -------------------------------- */
/* AUDIO                            */
/* -------------------------------- */

function playAyah() {

    const id =
        String(currentSurah).padStart(3, "0") +
        String(currentAyah).padStart(3, "0");

    audioPlayer.src =
        "https://everyayah.com/data/Alafasy_128kbps/" +
        id + ".mp3";

    audioPlayer.play();
}


function playSurah() {

    const total = surahCounts[currentSurah];

    surahQueue = [];

    for (let i = 1; i <= total; i++) {

        const id =
            String(currentSurah).padStart(3, "0") +
            String(i).padStart(3, "0");

        surahQueue.push(
            "https://everyayah.com/data/Alafasy_128kbps/" +
            id + ".mp3"
        );
    }

    currentIndex = currentAyah - 1;
    isPlayingSurah = true;

    playNextInSurah();
}


function playNextInSurah() {

    if (!isPlayingSurah) return;

    const ayahNum = currentIndex + 1;

    focusAyah(ayahNum);

    audioPlayer.src = surahQueue[currentIndex];
    audioPlayer.play();
}


audioPlayer.addEventListener("ended", () => {

    if (!isPlayingSurah) return;

    currentIndex++;

    if (currentIndex >= surahQueue.length) {
        isPlayingSurah = false;
        return;
    }

    playNextInSurah();
});


function togglePause() {

    if (audioPlayer.paused) {
        audioPlayer.play();
    } else {
        audioPlayer.pause();
    }
}


/* -------------------------------- */
/* BOOKMARK / PROGRESS              */
/* -------------------------------- */

function sendProgress() {

    fetch("/save_progress", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            surah: currentSurah,
            ayah: currentAyah
        })
    });
}


function pinAyah() {

    fetch("/bookmark", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            surah: currentSurah,
            ayah: currentAyah
        })
    });
}


/* -------------------------------- */
/* NAV BUTTONS                      */
/* -------------------------------- */

document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("nextBtn")
        ?.addEventListener("click", goNext);

    document.getElementById("prevBtn")
        ?.addEventListener("click", goPrev);

});