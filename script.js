
const SNIPPETS = [1, 2, 4, 7, 11, 16];
const MAX_ATTEMPTS = 6;

let mode = "daily";
let currentSong = getDailySong();
let currentAttempt = 0;
let guesses = [];
let gameOver = false;
let audio = null;
let stopTimer = null;
let streak = Number(localStorage.getItem("heardleStreak") || 0);

const dailyBtn = document.getElementById("dailyBtn");
const endlessBtn = document.getElementById("endlessBtn");
const playBtn = document.getElementById("playBtn");
const skipBtn = document.getElementById("skipBtn");
const shareBtn = document.getElementById("shareBtn");
const searchInput = document.getElementById("search");
const resultsEl = document.getElementById("results");
const guessesEl = document.getElementById("guesses");
const clipLengthEl = document.getElementById("clipLength");
const stepsEl = document.getElementById("steps");
const answerCard = document.getElementById("answerCard");
const answerText = document.getElementById("answerText");
const streakText = document.getElementById("streakText");

dailyBtn.onclick = () => switchMode("daily");
endlessBtn.onclick = () => switchMode("endless");
playBtn.onclick = playClip;
skipBtn.onclick = skipGuess;
shareBtn.onclick = shareResult;
searchInput.oninput = searchSongs;

render();

function switchMode(newMode) {
  mode = newMode;

  if (mode === "daily") {
    currentSong = getDailySong();
  } else {
    currentSong = getRandomSong();
  }

  dailyBtn.classList.toggle("active", mode === "daily");
  endlessBtn.classList.toggle("active", mode === "endless");

  resetRound();
}

function getDailySong() {
  const today = new Date().toISOString().slice(0, 10);
  let hash = 0;

  for (let i = 0; i < today.length; i++) {
    hash = (hash << 5) - hash + today.charCodeAt(i);
    hash |= 0;
  }

  const index = Math.abs(hash) % SONGS.length;
  return SONGS[index];
}

function getRandomSong() {
  let used = JSON.parse(localStorage.getItem("usedSongs") || "[]");

  // if all songs used → reset
  if (used.length >= SONGS.length) {
    used = [];
  }

  // filter unused songs
  const available = SONGS.filter(song => !used.includes(song.id));

  // pick random from unused
  const song = available[Math.floor(Math.random() * available.length)];

  // save it as used
  used.push(song.id);
  localStorage.setItem("usedSongs", JSON.stringify(used));

  return song;
}

function resetRound() {
  currentAttempt = 0;
  guesses = [];
  gameOver = false;

  searchInput.value = "";
  resultsEl.innerHTML = "";
  guessesEl.innerHTML = "";
  answerCard.style.display = "none";
  streakText.textContent = "";

  stopAudio();

  playBtn.disabled = false;
  playBtn.textContent = "▶ Play Clip";
  playBtn.onclick = playClip;

  render();
}

function stopAudio() {
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }

  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
}

function playClip() {
  if (gameOver) return;

  stopAudio();

  audio = new Audio(currentSong.clip);
  audio.currentTime = 0;

  playBtn.textContent = "Playing...";
  playBtn.disabled = true;

  audio.play();

  const seconds = SNIPPETS[currentAttempt];

  stopTimer = setTimeout(() => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    playBtn.textContent = "▶ Play Clip";
    playBtn.disabled = false;
  }, seconds * 1000);
}

function searchSongs() {
  if (gameOver) return;

  const query = searchInput.value.trim().toLowerCase();
  resultsEl.innerHTML = "";

  if (!query) return;

  const matches = SONGS.filter(song =>
    song.display.toLowerCase().includes(query)
  ).slice(0, 8);

  matches.forEach(song => {
    const div = document.createElement("div");
    div.className = "result-item";
    div.textContent = song.display;
    div.onclick = () => makeGuess(song);
    resultsEl.appendChild(div);
  });
}

function makeGuess(song) {
  if (gameOver) return;

  if (song.id === currentSong.id) {
    guesses.push({ text: song.display, result: "correct" });
    gameOver = true;
    showAnswer();
  } else {
    guesses.push({ text: song.display, result: "wrong" });
    currentAttempt++;

    if (currentAttempt >= MAX_ATTEMPTS) {
      gameOver = true;
      showAnswer();
    }
  }

  searchInput.value = "";
  resultsEl.innerHTML = "";
  render();
}

function skipGuess() {
  if (gameOver) return;

  guesses.push({ text: "Skipped", result: "skip" });
  currentAttempt++;

  if (currentAttempt >= MAX_ATTEMPTS) {
    gameOver = true;
    showAnswer();
  }

  render();
}

function showAnswer() {
  answerCard.style.display = "block";
  answerText.textContent = currentSong.display;

  const won = guesses.some(g => g.result === "correct");

  const old = answerCard.querySelector(".resultText");
  if (old) old.remove();

  const resultText = document.createElement("div");
  resultText.className = "resultText";

  if (won) {
    streak++;
    localStorage.setItem("heardleStreak", streak);
    resultText.textContent = "You got it 🎉";
    resultText.style.color = "#10b981";
  } else {
    streak = 0;
    localStorage.setItem("heardleStreak", streak);
    resultText.textContent = "You failed ❌";
    resultText.style.color = "#ef4444";

    document.body.classList.remove("shake");
    void document.body.offsetWidth;
    document.body.classList.add("shake");
  }

  answerCard.appendChild(resultText);
  streakText.textContent = `Streak: ${streak}`;

  playBtn.disabled = false;

  if (mode === "endless") {
    playBtn.textContent = "Next Song";
    playBtn.onclick = () => {
      currentSong = getRandomSong();
      resetRound();
    };
  } else {
    playBtn.textContent = "▶ Play Clip";
    playBtn.onclick = playClip;
  }
}

function shareResult() {
  const won = guesses.some(g => g.result === "correct");
  const score = won ? guesses.length : "X";

  const blocks = guesses.map(g => {
    if (g.result === "correct") return "🟩";
    if (g.result === "wrong") return "🟥";
    return "🟥";
  }).join("");

  const text = `Underground Heardle ${score}/${MAX_ATTEMPTS}\n${blocks}`;

  navigator.clipboard.writeText(text)
    .then(() => alert("Copied result"))
    .catch(() => alert(text));
}

function render() {
  const seconds = SNIPPETS[Math.min(currentAttempt, SNIPPETS.length - 1)];
  clipLengthEl.textContent = `${seconds}s`;

  stepsEl.innerHTML = "";
  SNIPPETS.forEach((s, i) => {
    const div = document.createElement("div");
    div.className = "step";

    if (i < currentAttempt) {
      const guess = guesses[i];

      if (guess && (guess.result === "wrong" || guess.result === "skip")) {
        div.classList.add("bad");
      } else {
        div.classList.add("used");
      }
    }

    if (i === currentAttempt && !gameOver) {
      div.classList.add("current");
    }

    div.innerHTML = `<div>Attempt ${i + 1}</div><strong>${s}s</strong>`;
    stepsEl.appendChild(div);
  });

  guessesEl.innerHTML = "";
  if (guesses.length === 0) {
    const empty = document.createElement("div");
    empty.className = "guess skip";
    empty.textContent = "No guesses yet.";
    guessesEl.appendChild(empty);
  } else {
    guesses.forEach((g, i) => {
      const row = document.createElement("div");
      row.className = `guess ${g.result}`;
      row.innerHTML = `<span>Attempt ${i + 1}: ${g.text}</span><strong>${g.result.toUpperCase()}</strong>`;
      guessesEl.appendChild(row);
    });
  }
}
