// storage.js
window.Storage = window.Storage || {};

const KEY_SETTINGS = "settings";
const KEY_MODE = "mode";

const PROFILE_PREFIX = "profile_";     // profile_<mode>
const TROPHIES_PREFIX = "trophies_";   // trophies_<mode>

const MODES = ["auditor", "chogi", "goke"];

function clampInt(n, min, max){
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, Math.trunc(x)));
}

function todayStr(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getJson(key, fallback){
  try { return JSON.parse(localStorage.getItem(key) || ""); }
  catch { return fallback; }
}
function setJson(key, obj){
  localStorage.setItem(key, JSON.stringify(obj));
}

Storage.initIfNeeded = function(){
  const s = getJson(KEY_SETTINGS, null);
  if (!s || typeof s !== "object") {
    setJson(KEY_SETTINGS, { sfx: true });
  } else if (typeof s.sfx !== "boolean") {
    setJson(KEY_SETTINGS, { ...s, sfx: true });
  }

  const m = localStorage.getItem(KEY_MODE);
  if (m === null) localStorage.setItem(KEY_MODE, "");
};

Storage.getSettings = function(){
  return getJson(KEY_SETTINGS, { sfx: true });
};

Storage.setSettings = function(obj){
  const safe = { sfx: !!obj?.sfx };
  setJson(KEY_SETTINGS, safe);
};

Storage.getMode = function(){
  return localStorage.getItem(KEY_MODE) || "";
};

Storage.setMode = function(mode){
  localStorage.setItem(KEY_MODE, mode || "");
};

Storage.initProfileIfNeeded = function(mode){
  if (!MODES.includes(mode)) return;
  const key = PROFILE_PREFIX + mode;
  const p = getJson(key, null);
  if (p && typeof p === "object" && typeof p.coins === "number" && typeof p.bet === "number") return;

  setJson(key, {
    coins: 1000,
    bet: 1,
    stats: { tenStreakCount: 0 }
  });
};

Storage.getProfile = function(mode){
  Storage.initProfileIfNeeded(mode);
  return getJson(PROFILE_PREFIX + mode, { coins: 1000, bet: 1, stats: { tenStreakCount: 0 } });
};

Storage.setProfile = function(mode, profile){
  if (!MODES.includes(mode)) return;
  const safe = {
    coins: clampInt(profile?.coins, 0, 999999999999),
    bet: clampInt(profile?.bet, 1, 100),
    stats: {
      tenStreakCount: clampInt(profile?.stats?.tenStreakCount, 0, 999999)
    }
  };
  setJson(PROFILE_PREFIX + mode, safe);
};

Storage.getCoins = function(mode){
  return Storage.getProfile(mode).coins;
};

Storage.setCoins = function(mode, coins){
  const p = Storage.getProfile(mode);
  p.coins = clampInt(coins, 0, 999999999999);
  if (p.bet > p.coins) p.bet = clampInt(p.coins, 1, 100);
  Storage.setProfile(mode, p);
};

Storage.getBet = function(mode){
  return Storage.getProfile(mode).bet;
};

Storage.setBet = function(mode, bet){
  const p = Storage.getProfile(mode);
  const coins = p.coins;
  const b = clampInt(bet, 1, 100);
  p.bet = Math.min(b, Math.max(1, coins));
  Storage.setProfile(mode, p);
};

Storage.getStats = function(mode){
  return Storage.getProfile(mode).stats;
};

Storage.incTenStreakCount = function(mode){
  const p = Storage.getProfile(mode);
  p.stats.tenStreakCount = clampInt(p.stats.tenStreakCount + 1, 0, 999999);
  Storage.setProfile(mode, p);
  return p.stats.tenStreakCount;
};

// ---- trophies (per mode) ----
Storage.getTrophiesForMode = function(mode){
  if (!MODES.includes(mode)) return {};
  return getJson(TROPHIES_PREFIX + mode, {});
};

Storage.setTrophiesForMode = function(mode, obj){
  if (!MODES.includes(mode)) return;
  setJson(TROPHIES_PREFIX + mode, obj || {});
};

Storage.unlockTrophy = function(mode, trophyId){
  if (!MODES.includes(mode)) return false;
  const got = Storage.getTrophiesForMode(mode);
  if (got[trophyId]) return false;
  got[trophyId] = todayStr();
  Storage.setTrophiesForMode(mode, got);
  return true;
};

Storage.resetTrophiesAllModes = function(){
  MODES.forEach(m => localStorage.removeItem(TROPHIES_PREFIX + m));
};
