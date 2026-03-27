const COOLDOWN_MINUTES = 10;
const STORAGE_PREFIX = "easter-hunt-supabase-progress-v3";
const ADMIN_PASSCODE = "bunnyboss";

let teamKey = null;
let state = null;
let now = Date.now();
let supabaseReady = false;
let supabaseClient = null;
let liveBoardCache = {};
let liveProgressCache = {};
let fileQrScanner = null;

function el(id){ return document.getElementById(id); }
function storageKey(team){ return `${STORAGE_PREFIX}-${team}`; }
function leaderboardKey(){ return `${STORAGE_PREFIX}-leaderboard`; }
function toMillis(value){
  if (value == null || value === "") return 0;
  if (typeof value === "number") return value;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function defaultState(teamLabel){
  return {
    teamName: teamLabel,
    progressIndex: 0,
    completed: [],
    scannedTokens: [],
    usedHints: 0,
    nextHintAt: null,
    finished: false,
    startedAt: Date.now(),
    lastUpdatedAt: Date.now()
  };
}

function readJson(key, fallback){
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error){
    console.error(error);
    return fallback;
  }
}

function loadLocalState(team){
  return readJson(storageKey(team), defaultState(TEAMS[team].label));
}

function saveLocalState(){
  if (teamKey && state) localStorage.setItem(storageKey(teamKey), JSON.stringify(state));
}

function saveLocalBoard(){
  if (!teamKey || !state) return;
  const board = readJson(leaderboardKey(), {});
  board[teamKey] = { teamName: state.teamName, found: state.completed.length, finished: state.finished, lastUpdatedAt: state.lastUpdatedAt };
  localStorage.setItem(leaderboardKey(), JSON.stringify(board));
}

function localBoardRows(){
  const board = readJson(leaderboardKey(), {});
  return Object.entries(TEAMS).map(([key, t]) => ({
    key,
    teamName: board[key]?.teamName || t.label,
    found: board[key]?.found || 0,
    finished: board[key]?.finished || false,
    lastUpdatedAt: board[key]?.lastUpdatedAt || 0
  })).sort((a, b) => (b.found - a.found) || (toMillis(a.lastUpdatedAt) - toMillis(b.lastUpdatedAt)));
}

function remoteBoardRows(){
  return Object.entries(TEAMS).map(([key, t]) => ({
    key,
    teamName: liveBoardCache[key]?.team_name || t.label,
    found: liveBoardCache[key]?.found || 0,
    finished: liveBoardCache[key]?.finished || false,
    lastUpdatedAt: liveBoardCache[key]?.last_updated_at || 0
  })).sort((a, b) => (b.found - a.found) || (toMillis(a.lastUpdatedAt) - toMillis(b.lastUpdatedAt)));
}

function boardRows(){
  return supabaseReady ? remoteBoardRows() : localBoardRows();
}

function setFeedback(msg){ if (el("feedbackBox")) el("feedbackBox").textContent = msg; }
function setScanMessage(msg){ if (el("scanMessage")) el("scanMessage").textContent = msg; }
function setScanStatus(status, msg){
  const box = el("scanStatusBox");
  if (!box) return;
  const classMap = {
    idle: "scanStatusIdle",
    checking: "scanStatusChecking",
    correct: "scanStatusSuccess",
    wrong: "scanStatusError",
    "no-qr": "scanStatusWarn",
    "no-team": "scanStatusError",
    finished: "scanStatusSuccess",
    error: "scanStatusError"
  };
  box.className = `scanStatus ${classMap[status] || "scanStatusChecking"}`;
  box.textContent = msg;
}

function fmtCountdown(ms){
  const secs = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function normalizeRemoteProgress(data){
  if (!data) return null;
  return {
    teamName: data.team_name,
    progressIndex: data.progress_index ?? 0,
    completed: Array.isArray(data.completed) ? data.completed : [],
    scannedTokens: Array.isArray(data.scanned_tokens) ? data.scanned_tokens : [],
    usedHints: data.used_hints ?? 0,
    nextHintAt: data.next_hint_at,
    finished: !!data.finished,
    startedAt: data.started_at,
    lastUpdatedAt: data.last_updated_at
  };
}

function cachedRemoteProgress(team){
  return liveProgressCache[team] ? { ...liveProgressCache[team] } : null;
}

function getCachedClaimedTeamName(team){
  const remoteProgress = cachedRemoteProgress(team);
  if (remoteProgress && remoteProgress.teamName && remoteProgress.teamName !== TEAMS[team].label) return remoteProgress.teamName;
  const boardRow = liveBoardCache[team];
  if (boardRow && boardRow.team_name && boardRow.team_name !== TEAMS[team].label) return boardRow.team_name;
  const local = loadLocalState(team);
  if (local && local.teamName && local.teamName !== TEAMS[team].label) return local.teamName;
  return null;
}

function updateSharedModeText(){
  const mode = el("sharedModeText");
  if (!mode) return;
  if (supabaseReady){
    mode.hidden = false;
    mode.style.display = "block";
    mode.textContent = "Shared progress is live across devices.";
  } else {
    mode.hidden = false;
    mode.style.display = "block";
    mode.textContent = "Cross-device sync needs Supabase configured in supabase-config.js.";
  }
}

async function initSupabase(){
  try{
    if (!window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.url || !window.SUPABASE_CONFIG.anonKey || window.SUPABASE_CONFIG.url.startsWith("PASTE_")){
      if (el("leaderboardModeText")){
        el("leaderboardModeText").textContent = "Using local device leaderboard only.";
        el("leaderboardModeText").hidden = false;
        el("leaderboardModeText").style.display = "block";
      }
      updateSharedModeText();
      renderBoard();
      return;
    }
    supabaseClient = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
    supabaseReady = true;
    if (el("leaderboardModeText")){
      el("leaderboardModeText").textContent = "";
      el("leaderboardModeText").hidden = true;
      el("leaderboardModeText").style.display = "none";
    }
    updateSharedModeText();
    await Promise.all([fetchLeaderboard(), fetchAllRemoteProgress()]);
    subscribeLeaderboard();
    subscribeTeamProgress();
  } catch (error){
    console.error(error);
    supabaseReady = false;
    if (el("leaderboardModeText")){
      el("leaderboardModeText").textContent = "Using local device leaderboard only.";
      el("leaderboardModeText").hidden = false;
      el("leaderboardModeText").style.display = "block";
    }
    updateSharedModeText();
    renderBoard();
  }
}

async function fetchLeaderboard(){
  if (!supabaseReady) return;
  const { data, error } = await supabaseClient.from("leaderboard").select("*");
  if (error){
    console.error(error);
    supabaseReady = false;
    if (el("leaderboardModeText")){
      el("leaderboardModeText").textContent = "Using local device leaderboard only.";
      el("leaderboardModeText").hidden = false;
      el("leaderboardModeText").style.display = "block";
    }
    updateSharedModeText();
    renderBoard();
    return;
  }
  liveBoardCache = {};
  (data || []).forEach(row => liveBoardCache[row.team_id] = row);
  renderBoard();
}

async function fetchAllRemoteProgress(){
  if (!supabaseReady) return;
  const { data, error } = await supabaseClient.from("team_progress").select("*");
  if (error){
    console.error(error);
    return;
  }
  liveProgressCache = {};
  (data || []).forEach(row => {
    const normalized = normalizeRemoteProgress(row);
    liveProgressCache[row.team_id] = normalized;
    localStorage.setItem(storageKey(row.team_id), JSON.stringify(normalized));
  });
}

function subscribeLeaderboard(){
  if (!supabaseReady) return;
  supabaseClient.channel("leaderboard-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "leaderboard" }, payload => {
      const row = payload.new || payload.old;
      if (!row || !row.team_id) return;
      if (payload.eventType === "DELETE") delete liveBoardCache[row.team_id];
      else liveBoardCache[row.team_id] = row;
      renderBoard();
    }).subscribe();
}

function maybeRefreshGateSelection(){
  if (!teamKey || !el("teamGate") || el("teamGate").classList.contains("hidden")) return;
  const claimedName = getCachedClaimedTeamName(teamKey);
  if (claimedName) setGateNameLock(true, claimedName);
}

function subscribeTeamProgress(){
  if (!supabaseReady) return;
  supabaseClient.channel("team-progress-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "team_progress" }, async payload => {
      const row = payload.new || payload.old;
      if (!row || !row.team_id) return;

      if (payload.eventType === "DELETE") {
        delete liveProgressCache[row.team_id];
        localStorage.removeItem(storageKey(row.team_id));
      } else {
        const normalized = normalizeRemoteProgress(row);
        liveProgressCache[row.team_id] = normalized;
        localStorage.setItem(storageKey(row.team_id), JSON.stringify(normalized));

        if (teamKey === row.team_id){
          const incomingTs = toMillis(normalized.lastUpdatedAt);
          const currentTs = toMillis(state?.lastUpdatedAt);
          if (!state || incomingTs >= currentTs){
            state = normalized;
            await renderAll({ persist: false });
          }
        }
      }

      if (el("adminTeamSelect") && el("adminTeamSelect").value === row.team_id) {
        await syncAdminFields();
      }
      maybeRefreshGateSelection();
      renderBoard();
    }).subscribe();
}

async function loadRemoteProgress(team){
  if (!supabaseReady) return null;
  const cached = cachedRemoteProgress(team);
  if (cached) return cached;
  const { data, error } = await supabaseClient.from("team_progress").select("*").eq("team_id", team).maybeSingle();
  if (error){
    console.error(error);
    return null;
  }
  const normalized = normalizeRemoteProgress(data);
  if (normalized) {
    liveProgressCache[team] = normalized;
    localStorage.setItem(storageKey(team), JSON.stringify(normalized));
  }
  return normalized;
}

async function getClaimedTeamName(team){
  const cached = getCachedClaimedTeamName(team);
  if (cached) return cached;
  const remote = await loadRemoteProgress(team);
  if (remote && remote.teamName && remote.teamName !== TEAMS[team].label) return remote.teamName;
  return null;
}

function setGateNameLock(locked, value){
  const input = el("gateTeamName");
  if (!input) return;
  input.value = value || "";
  input.readOnly = !!locked;
  input.disabled = !!locked;
  input.placeholder = locked ? "Team name already locked" : "Enter team name";
}

async function pushRemoteProgress(){
  if (!supabaseReady || !teamKey || !state) return;
  const payload = {
    team_id: teamKey,
    team_name: state.teamName,
    progress_index: state.progressIndex,
    completed: state.completed,
    scanned_tokens: state.scannedTokens,
    used_hints: state.usedHints,
    next_hint_at: state.nextHintAt,
    finished: state.finished,
    started_at: state.startedAt,
    last_updated_at: state.lastUpdatedAt
  };
  const { error } = await supabaseClient.from("team_progress").upsert(payload, { onConflict: "team_id" });
  if (error) console.error(error);
}

async function pushLeaderboard(){
  saveLocalBoard();
  if (!supabaseReady || !teamKey || !state) return;
  const payload = {
    team_id: teamKey,
    team_name: state.teamName,
    found: state.completed.length,
    finished: state.finished,
    last_updated_at: state.lastUpdatedAt
  };
  const { error } = await supabaseClient.from("leaderboard").upsert(payload, { onConflict: "team_id" });
  if (error) console.error(error);
}

function setPage(pageId){
  document.querySelectorAll(".page").forEach(p => p.classList.remove("activePage"));
  const page = el(pageId);
  if (page) page.classList.add("activePage");
  document.querySelectorAll(".menuBtn").forEach(btn => btn.classList.toggle("active", btn.dataset.page === pageId));
}

function renderGateTeams(selected){
  const mount = el("gateTeamButtons");
  if (!mount) return;
  mount.innerHTML = "";
  Object.entries(TEAMS).forEach(([key, team]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "teamBtn" + (key === selected ? " selected" : "");
    btn.textContent = team.label;
    btn.addEventListener("click", async () => {
      teamKey = key;
      renderGateTeams(teamKey);
      const claimedName = await getClaimedTeamName(teamKey);
      if (claimedName) {
        setGateNameLock(true, claimedName);
      } else {
        const local = loadLocalState(teamKey);
        setGateNameLock(false, (local && local.teamName && local.teamName !== team.label) ? local.teamName : "");
      }
    });
    mount.appendChild(btn);
  });
}

function renderTop(){
  if (!teamKey || !state) return;
  const total = TEAMS[teamKey].sequence.length;
  el("progressCount").textContent = `${state.completed.length} / ${total}`;
  el("progressBar").style.width = `${(state.completed.length / total) * 100}%`;
  el("hintCount").textContent = `${state.usedHints} / 3`;
  const locked = state.nextHintAt && now < toMillis(state.nextHintAt);
  el("hintStatus").textContent = locked ? `Next hint in ${fmtCountdown(toMillis(state.nextHintAt) - now)}` : (state.usedHints >= 3 ? "No hints left" : "Hint ready");
  el("teamDisplay").textContent = `${TEAMS[teamKey].label} • ${state.teamName}`;
}

function renderChores(){
  if (!teamKey || !state) return;
  const seq = TEAMS[teamKey].sequence;
  const list = el("choreList");
  list.innerHTML = "";
  seq.forEach((id, idx) => {
    const div = document.createElement("div");
    div.className = idx < state.progressIndex ? "item complete" : idx === state.progressIndex ? "item active" : "item locked";
    const clue = CLUES[id];
    if (idx < state.progressIndex) {
      div.innerHTML = `<strong>${clue.title}</strong>${clue.subtitle ? `<div class="muted">${clue.subtitle}</div>` : ""}<div class="muted">Found at: <strong>${clue.location}</strong></div>`;
    } else if (idx === state.progressIndex) {
      div.innerHTML = `<strong>${clue.title}</strong>${clue.subtitle ? `<div class="muted">${clue.subtitle}</div>` : ""}<div class="muted">Find the egg, then scan its QR code to unlock the next chore.</div>`;
    } else {
      div.innerHTML = `<strong>Locked chore</strong><div class="muted">Scan the correct egg to unlock this item.</div>`;
    }
    list.appendChild(div);
  });
}

function renderMap(){
  if (!teamKey || !state) return;
  const seq = TEAMS[teamKey].sequence;
  const mapPins = el("mapPins");
  mapPins.innerHTML = "";
  seq.forEach((id, idx) => {
    if (idx > state.progressIndex) return;
    const clue = CLUES[id];
    const shown = idx < state.progressIndex;
    const pin = document.createElement("div");
    pin.className = shown ? "pin complete" : "pin";
    pin.style.left = `${clue.zone.x}%`;
    pin.style.top = `${clue.zone.y}%`;
    pin.textContent = shown ? clue.location : "Current area hidden";
    mapPins.appendChild(pin);
  });
}

function renderHint(){
  if (!teamKey || !state) return;
  const activeId = TEAMS[teamKey].sequence[state.progressIndex];
  const clue = CLUES[activeId];
  const locked = state.nextHintAt && now < toMillis(state.nextHintAt);
  el("hintBtn").disabled = state.usedHints >= 3 || locked || !clue;
  el("hintsLeft").textContent = `Hints left: ${3 - state.usedHints}`;
  el("hintBox").textContent = state.usedHints > 0 && clue ? clue.hint : "No hint displayed yet for this active clue.";
  if (locked){
    el("hintTimerPill").hidden = false;
    el("hintTimerPill").textContent = fmtCountdown(toMillis(state.nextHintAt) - now);
  } else {
    el("hintTimerPill").hidden = true;
  }
}

function renderBoard(){
  const board = el("leaderboard");
  if (!board) return;
  board.innerHTML = "";
  boardRows().forEach((row, i) => {
    const div = document.createElement("div");
    div.className = "leaderRow";
    div.innerHTML = `<div><strong>${i + 1}. ${row.teamName}</strong><div class="muted">${row.finished ? "Finished" : "In progress"}</div></div><div><strong>${row.found}</strong><div class="small">clues found</div></div>`;
    board.appendChild(div);
  });
}

async function persistAll(){
  saveLocalState();
  saveLocalBoard();
  if (supabaseReady){
    await pushRemoteProgress();
    await pushLeaderboard();
  }
}

async function renderAll(options = {}){
  const shouldPersist = options.persist !== false;
  renderTop();
  renderChores();
  renderMap();
  renderHint();
  renderBoard();
  if (shouldPersist) await persistAll();
}

async function unlockToken(token, options = {}){
  const quiet = !!options.quiet;
  if (!teamKey || !state) {
    const message = "Pick a team first.";
    if (!quiet) setFeedback(message);
    return { status: "no-team", message };
  }

  const expected = TOKENS[teamKey][state.progressIndex];
  if (!expected){
    const message = "This team has already finished every clue.";
    if (!quiet) setFeedback(message);
    return { status: "finished", message };
  }

  if ((token || "").trim() !== expected){
    const message = "Wrong QR code. Try again.";
    if (!quiet) setFeedback(message);
    return { status: "wrong", message };
  }

  const finishedStep = TEAMS[teamKey].sequence[state.progressIndex];
  state.completed.push(finishedStep);
  state.scannedTokens.push(expected);
  state.progressIndex += 1;
  state.finished = state.progressIndex >= TEAMS[teamKey].sequence.length || expected.includes("FINISH");
  state.lastUpdatedAt = Date.now();
  await renderAll();

  const message = state.finished ? "That was the right QR code. You finished the hunt." : "That was the right QR code. Your next chore is unlocked.";
  if (!quiet) setFeedback(message);
  return { status: "correct", message };
}

function resetPhotoArea(){
  const reader = el("qr-reader");
  if (!reader) return;
  reader.innerHTML = '<div class="photoPlaceholder">No photo selected yet.</div>';
  if (el("qrPhotoInput")) el("qrPhotoInput").value = "";
}

async function checkPhotoFile(file){
  if (!file) return;
  if (typeof Html5Qrcode === "undefined"){
    const message = "QR checker library did not load. Use manual code entry below.";
    setScanMessage(message);
    setFeedback(message);
    setScanStatus("error", message);
    return;
  }

  setScanMessage("Checking photo...");
  setScanStatus("checking", "Checking photo...");
  try {
    if (!fileQrScanner) fileQrScanner = new Html5Qrcode("qr-reader");
    const decodedText = await fileQrScanner.scanFile(file, true);
    const result = await unlockToken(decodedText, { quiet: true });
    setScanMessage(result.message);
    setFeedback(result.message);
    setScanStatus(result.status, result.message);
  } catch (error){
    console.error(error);
    setScanMessage("No QR code detected. Try again.");
    setFeedback("No QR code detected. Try again.");
    setScanStatus("no-qr", "No QR code detected. Try again.");
  }
}

function showAdminOverlay(){ const o = el("adminOverlay"); if (o) o.classList.remove("hidden"); }
function hideAdminOverlay(){ const o = el("adminOverlay"); if (o) o.classList.add("hidden"); }
function showAdminPanel(){ populateAdminTeams(); syncAdminFields(); const p = el("adminPanel"); if (p) p.classList.remove("hidden"); }
function hideAdminPanel(){ const p = el("adminPanel"); if (p) p.classList.add("hidden"); }
function openAdminPrompt(){
  hideAdminPanel();
  if (el("adminPasscode")) el("adminPasscode").value = "";
  if (el("adminFeedback")) el("adminFeedback").textContent = "Admin tools are hidden from players.";
  showAdminOverlay();
}

function populateAdminTeams(){
  const select = el("adminTeamSelect");
  if (!select) return;
  const current = select.value || teamKey || "Team1";
  select.innerHTML = "";
  Object.entries(TEAMS).forEach(([key, team]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = team.label;
    if (key === current) opt.selected = true;
    select.appendChild(opt);
  });
}

async function syncAdminFields(){
  const select = el("adminTeamSelect");
  if (!select) return;
  const team = select.value;
  const remote = await loadRemoteProgress(team);
  const local = loadLocalState(team);
  const name = remote?.teamName || local.teamName || TEAMS[team].label;
  el("adminTeamName").value = name;
}

async function adminSaveTeamName(){
  const team = el("adminTeamSelect").value;
  const newName = el("adminTeamName").value.trim();
  if (!newName){
    el("adminPanelFeedback").textContent = "Enter a team name first.";
    return;
  }

  let targetState = await loadRemoteProgress(team) || loadLocalState(team);
  targetState.teamName = newName;
  targetState.lastUpdatedAt = Date.now();
  liveProgressCache[team] = { ...targetState };
  localStorage.setItem(storageKey(team), JSON.stringify(targetState));

  const localBoard = readJson(leaderboardKey(), {});
  localBoard[team] = { teamName: newName, found: targetState.completed.length, finished: targetState.finished, lastUpdatedAt: targetState.lastUpdatedAt };
  localStorage.setItem(leaderboardKey(), JSON.stringify(localBoard));

  if (supabaseReady){
    await supabaseClient.from("team_progress").upsert({
      team_id: team,
      team_name: newName,
      progress_index: targetState.progressIndex,
      completed: targetState.completed,
      scanned_tokens: targetState.scannedTokens,
      used_hints: targetState.usedHints,
      next_hint_at: targetState.nextHintAt,
      finished: targetState.finished,
      started_at: targetState.startedAt,
      last_updated_at: targetState.lastUpdatedAt
    }, { onConflict: "team_id" });

    await supabaseClient.from("leaderboard").upsert({
      team_id: team,
      team_name: newName,
      found: targetState.completed.length,
      finished: targetState.finished,
      last_updated_at: targetState.lastUpdatedAt
    }, { onConflict: "team_id" });

    liveBoardCache[team] = { team_id: team, team_name: newName, found: targetState.completed.length, finished: targetState.finished, last_updated_at: targetState.lastUpdatedAt };
  }

  if (teamKey === team && state){
    state.teamName = newName;
    await renderAll({ persist: false });
  } else {
    renderBoard();
  }

  maybeRefreshGateSelection();
  el("adminPanelFeedback").textContent = supabaseReady ? "Team name updated everywhere." : "Team name updated on this device only.";
}

async function adminResetTeam(){
  const team = el("adminTeamSelect").value;
  const fresh = defaultState(TEAMS[team].label);
  liveProgressCache[team] = { ...fresh };
  localStorage.setItem(storageKey(team), JSON.stringify(fresh));

  const localBoard = readJson(leaderboardKey(), {});
  localBoard[team] = { teamName: fresh.teamName, found: 0, finished: false, lastUpdatedAt: fresh.lastUpdatedAt };
  localStorage.setItem(leaderboardKey(), JSON.stringify(localBoard));

  if (supabaseReady){
    await supabaseClient.from("team_progress").upsert({
      team_id: team,
      team_name: fresh.teamName,
      progress_index: 0,
      completed: [],
      scanned_tokens: [],
      used_hints: 0,
      next_hint_at: null,
      finished: false,
      started_at: fresh.startedAt,
      last_updated_at: fresh.lastUpdatedAt
    }, { onConflict: "team_id" });

    await supabaseClient.from("leaderboard").upsert({
      team_id: team,
      team_name: fresh.teamName,
      found: 0,
      finished: false,
      last_updated_at: fresh.lastUpdatedAt
    }, { onConflict: "team_id" });

    liveBoardCache[team] = { team_id: team, team_name: fresh.teamName, found: 0, finished: false, last_updated_at: fresh.lastUpdatedAt };
  }

  if (teamKey === team){
    state = fresh;
    await renderAll({ persist: false });
  } else {
    renderBoard();
  }

  await syncAdminFields();
  maybeRefreshGateSelection();
  el("adminPanelFeedback").textContent = supabaseReady ? "Selected team reset everywhere." : "Selected team reset on this device only.";
}

async function adminReloadTeam(){
  const team = el("adminTeamSelect").value;
  if (!supabaseReady){
    el("adminPanelFeedback").textContent = "Supabase is not configured.";
    return;
  }
  const remote = await loadRemoteProgress(team);
  if (!remote){
    el("adminPanelFeedback").textContent = "No shared progress found for that team.";
    return;
  }
  localStorage.setItem(storageKey(team), JSON.stringify(remote));
  if (teamKey === team){
    state = remote;
    await renderAll({ persist: false });
  }
  await syncAdminFields();
  el("adminPanelFeedback").textContent = "Selected team reloaded from shared progress.";
}

function wireAdminEvents(){
  const rabbit = el("rabbitTrigger");
  if (rabbit){
    rabbit.onclick = ev => {
      ev.preventDefault();
      ev.stopPropagation();
      openAdminPrompt();
    };
    rabbit.addEventListener("touchend", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      openAdminPrompt();
    }, { passive: false });
  }

  if (el("adminCloseX")) el("adminCloseX").addEventListener("click", hideAdminOverlay);
  if (el("adminPanelCloseX")) el("adminPanelCloseX").addEventListener("click", hideAdminPanel);

  if (el("adminUnlockBtn")) el("adminUnlockBtn").addEventListener("click", () => {
    const pass = (el("adminPasscode")?.value || "").trim();
    if (pass === ADMIN_PASSCODE){
      hideAdminOverlay();
      showAdminPanel();
    } else {
      if (el("adminPasscode")) el("adminPasscode").value = "";
      hideAdminOverlay();
    }
  });

  if (el("adminOverlay")) el("adminOverlay").addEventListener("click", e => { if (e.target === el("adminOverlay")) hideAdminOverlay(); });
  if (el("adminPanel")) el("adminPanel").addEventListener("click", e => { if (e.target === el("adminPanel")) hideAdminPanel(); });

  if (el("adminTeamSelect")) el("adminTeamSelect").addEventListener("change", syncAdminFields);
  if (el("adminSaveNameBtn")) el("adminSaveNameBtn").addEventListener("click", adminSaveTeamName);
  if (el("adminResetTeamBtn")) el("adminResetTeamBtn").addEventListener("click", adminResetTeam);
  if (el("adminReloadTeamBtn")) el("adminReloadTeamBtn").addEventListener("click", adminReloadTeam);
}

function wireScannerEvents(){
  if (el("qrPhotoInput")) {
    el("qrPhotoInput").addEventListener("change", async event => {
      const file = event.target.files && event.target.files[0];
      await checkPhotoFile(file);
    });
  }

  if (el("clearPhotoBtn")) {
    el("clearPhotoBtn").addEventListener("click", () => {
      resetPhotoArea();
      setScanMessage("Take a photo of the egg QR code or type the code manually.");
      setScanStatus("idle", "Waiting for a photo or code.");
    });
  }

  if (el("unlockBtn")) {
    el("unlockBtn").addEventListener("click", async () => {
      const val = el("manualCode").value.trim();
      if (!val) return;
      const result = await unlockToken(val, { quiet: true });
      setScanMessage(result.message);
      setFeedback(result.message);
      setScanStatus(result.status, result.message);
      el("manualCode").value = "";
    });
  }
}

document.querySelectorAll(".menuBtn").forEach(btn => btn.addEventListener("click", () => setPage(btn.dataset.page)));

if (el("startGameBtn")) {
  el("startGameBtn").addEventListener("click", async () => {
    if (!teamKey){
      setFeedback("Choose a team first.");
      return;
    }
    const claimedName = await getClaimedTeamName(teamKey);
    const enteredName = (el("gateTeamName").value || "").trim();
    let loaded = loadLocalState(teamKey);
    const remote = await loadRemoteProgress(teamKey);
    if (remote) loaded = remote;
    state = loaded;
    state.teamName = claimedName || enteredName || state.teamName || TEAMS[teamKey].label;
    state.lastUpdatedAt = Date.now();
    el("teamGate").classList.add("hidden");
    await renderAll();
  });
}

if (el("hintBtn")) {
  el("hintBtn").addEventListener("click", async () => {
    if (!state) return;
    const locked = state.nextHintAt && now < toMillis(state.nextHintAt);
    if (state.usedHints >= 3 || locked) return;
    state.usedHints += 1;
    state.nextHintAt = state.usedHints >= 3 ? null : Date.now() + COOLDOWN_MINUTES * 60 * 1000;
    state.lastUpdatedAt = Date.now();
    await renderAll();
  });
}

(async function boot(){
  await initSupabase();
  renderGateTeams(null);
  setGateNameLock(false, "");
  renderBoard();
  updateSharedModeText();
  resetPhotoArea();
  setScanStatus("idle", "Waiting for a photo or code.");
  setPage("choresPage");
  wireAdminEvents();
  wireScannerEvents();
  setInterval(() => {
    now = Date.now();
    if (state){
      renderTop();
      renderHint();
    }
  }, 1000);
})();
