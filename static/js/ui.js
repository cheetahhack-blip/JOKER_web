// ui.js
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

window.getMode = function () {
  const m = Storage.getMode();
  if (m === "auditor" || m === "chogi" || m === "goke") return m;
  return null;
};

window.UI = {
  showScreen(id) {
    const screens = ["screenMode", "screenGame", "screenTrophies", "screenSettings"];
    screens.forEach(s => {
      const el = $("#" + s);
      if (el) el.classList.add("hidden");
    });
    const target = $("#" + id);
    if (target) target.classList.remove("hidden");
  },

  showPokerView() {
    const p = $("#pokerArea");
    const d = $("#doubleupArea");
    if (p) p.classList.remove("hidden");
    if (d) d.classList.add("hidden");
  },

  showDoubleUpView() {
    const p = $("#pokerArea");
    const d = $("#doubleupArea");
    if (p) p.classList.add("hidden");
    if (d) d.classList.remove("hidden");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  },

  formatCoins(n) {
    return (n ?? 0).toLocaleString("ja-JP");
  },

  safeText(sel, text) {
    const el = $(sel);
    if (el) el.textContent = text;
  },

  updateHeader() {
    const mode = getMode();
    if (!mode) return;

    const coins = Storage.getCoins(mode);
    const bet = Storage.getBet(mode);

    this.safeText("#coinAmount", this.formatCoins(coins));

    // 旧UI互換（残ってても壊れない）
    this.safeText("#betAmount", String(bet));

    // 新UI
    const inp = document.querySelector("#betInput");
    if (inp) inp.value = String(bet);
  },


  setMessage(msg, muted = false) {
    const el = $("#message");
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle("muted", muted);
  },

  setDealExchangeEnabled({ deal, exchange }) {
    const btnDeal = $("#btnDeal");
    const btnEx = $("#btnExchange");
    if (btnDeal) btnDeal.disabled = !deal;
    if (btnEx) btnEx.disabled = !exchange;
  },

  ensureBetNotExceedCoins() {
    const mode = getMode();
    if (!mode) return;
    const coins = Storage.getCoins(mode);
    const bet = Storage.getBet(mode);
    if (bet > coins) Storage.setBet(mode, Math.max(1, Math.min(100, coins)));
  },

  hidePokerResult() {
    const panel = $("#pokerResult");
    if (panel) panel.classList.add("hidden");
    this.safeText("#pokerHandName", "-");
    this.safeText("#pokerMult", "×0");
    this.safeText("#pokerWin", "0");
    this.safeText("#pokerResultMsg", "");
    this.safeText("#pokerSummary", "-");
    const ask = $("#duAsk");
    if (ask) ask.classList.remove("hidden");
  },

  showPokerResult(res, baseWin) {
    const panel = $("#pokerResult");
    if (panel) panel.classList.remove("hidden");

    this.safeText("#pokerHandName", res?.name ?? "-");
    this.safeText("#pokerMult", `×${res?.mult ?? 0}`);
    this.safeText("#pokerWin", this.formatCoins(baseWin));
        // summary line
    const hand = res?.name ?? "-";
    const mult = res?.mult ?? 0;
    const win  = this.formatCoins(baseWin);
    this.safeText("#pokerSummary", `${hand}  ×${mult}  →  ${win}`);

    const mode = getMode();
    const txt = (window.TEXT && mode && window.TEXT[mode]) ? window.TEXT[mode].doubleup : null;
    const startPrompt = txt?.start ?? "ダブルアップを開始するか。";
    this.safeText("#pokerResultMsg", startPrompt);

    const ask = $("#duAsk");
    if (ask) {
      if (baseWin > 0 && (res?.mult ?? 0) >= 2) ask.classList.remove("hidden");
      else ask.classList.add("hidden");
    }
  }
};
