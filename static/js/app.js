// app.js
(() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // ---- flash helper (cards + panels) ----
  function flashElement(el, cls){
    if (!el) return;
    el.classList.remove("flash-ok", "flash-ng", "flash-sp");
    // 再トリガー用
    void el.offsetWidth;
    el.classList.add(cls);
    el.addEventListener("animationend", () => {
      el.classList.remove("flash-ok", "flash-ng", "flash-sp");
    }, { once: true });
  }

  function flashPoker(cls){
    // 5枚のカード
    $$("#cards .card").forEach(c => flashElement(c, cls));
    // 結果パネル（表示されていれば）
    flashElement($("#pokerResult"), cls);
  }

  function flashDoubleUp(cls){
    flashElement($("#duCard"), cls);
    flashElement($("#doubleupPanel"), cls);
  }

  // --- SFX ---
  const SFX = {
    ok: null, ng: null, pay: null, sp: null,
    enabled: true,
    init() {
      this.ok = $("#sfxOk");
      this.ng = $("#sfxNg");
      this.pay = $("#sfxPay");
      this.sp = $("#sfxSp");
      this.enabled = Storage.getSettings().sfx === true;
    },
    play(aud) {
      if (!this.enabled || !aud) return;
      try {
        aud.currentTime = 0;
        const p = aud.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {}
    }
  };

  // --- game state ---
  const Game = {
    deck: null,
    hand: [],
    holds: [false,false,false,false,false],
    canExchange: false,

    pendingResult: null,
    pendingWin: 0,

    // double-up
    duDeck: null,
    duPrev: null,
    duAmount: 0,
    duStreak: 0,
    duPhase: "guess",   // "guess" | "continue" | "fail"
    duFailText: ""
  };

  function suitSymbolFromCard(card){
    // poker.js の実装差に強いように、まず suitLabel を信用してみる
    const lab = Poker.suitLabel(card.suit);
    if (lab && (lab.includes("♠") || lab.includes("♥") || lab.includes("♦") || lab.includes("♣"))) return lab;

    // だめならよくあるパターンにフォールバック
    const s = card.suit;
    const map = { S:"♠", H:"♥", D:"♦", C:"♣", 0:"♠", 1:"♥", 2:"♦", 3:"♣" };
    return map[s] || "♠";
  }

  function isRedSuitSymbol(sym){
    return sym === "♥" || sym === "♦" || String(sym).includes("♥") || String(sym).includes("♦");
  }

  function renderPlayingCard(el, card, { mode, showHold=false, held=false } = {}){
    el.classList.add("playing");
    el.classList.toggle("is-hold", !!held);
    el.innerHTML = "";

    // 装飾（四隅）
    const ornTL = document.createElement("div"); ornTL.className = "orn tl";
    const ornTR = document.createElement("div"); ornTR.className = "orn tr";
    const ornBL = document.createElement("div"); ornBL.className = "orn bl";
    const ornBR = document.createElement("div"); ornBR.className = "orn br";
    el.appendChild(ornTL); el.appendChild(ornTR); el.appendChild(ornBL); el.appendChild(ornBR);

    if (card.joker) {
      el.classList.add("joker");
      const img = document.createElement("img");
      img.alt = "JOKER";
      img.src = `/static/img/joker_${mode}.png`;
      el.appendChild(img);

      // ジョーカーでも HOLD バッジを出す
      if (showHold && held) {
        const badge = document.createElement("div");
        badge.className = "hold-badge";
        badge.textContent = "HOLD";
        el.appendChild(badge);
      }
      return;
    }

    const rank = Poker.rankLabel(card.rank);
    const suit = suitSymbolFromCard(card);
    const red = isRedSuitSymbol(suit);

    el.classList.toggle("red", red);

    const tl = document.createElement("div");
    tl.className = "corner tl";
    tl.innerHTML = `<div class="rank">${rank}</div><div class="suit">${suit}</div>`;

    const br = document.createElement("div");
    br.className = "corner br";
    br.innerHTML = `<div class="rank">${rank}</div><div class="suit">${suit}</div>`;

    const center = document.createElement("div");
    center.className = "center";
    center.innerHTML = `
      <div class="center-rank">${rank}</div>
      <div class="center-suit">${suit}</div>
    `;


    el.appendChild(tl);
    el.appendChild(center);
    el.appendChild(br);

    if (showHold && held) {
      const badge = document.createElement("div");
      badge.className = "hold-badge";
      badge.textContent = "HOLD";
      el.appendChild(badge);
    }
  }

  function renderHand() {
    const wrap = $("#cards");
    if (!wrap) return;
    wrap.innerHTML = "";

    const mode = getMode() || "auditor";

    Game.hand.forEach((c, i) => {
        const el = document.createElement("div");
        el.className = "card playing";
        el.style.cursor = Game.canExchange ? "pointer" : "default";

        renderPlayingCard(el, c, { mode, showHold: Game.canExchange, held: Game.holds[i] });

        el.addEventListener("click", () => {
        if (!Game.canExchange) return;
        Game.holds[i] = !Game.holds[i];
        renderHand();
        });

        wrap.appendChild(el);
    });
  }


  // ---------- Double-Up phase management ----------
  function setDuPhase(phase) {
    Game.duPhase = phase;

    const guessRow = $("#duGuessRow");
    const contRow  = $("#duContinueRow");
    const okRow    = $("#duOkRow");

    const btnHigh  = $("#btnHigh");
    const btnLow   = $("#btnLow");
    const btnYes   = $("#btnDuYes");
    const btnNo    = $("#btnDuNo");
    const btnOk    = $("#btnDuOk");

    if (guessRow) guessRow.classList.toggle("hidden", phase !== "guess");
    if (contRow)  contRow.classList.toggle("hidden", phase !== "continue");
    if (okRow)    okRow.classList.toggle("hidden", phase !== "fail");

    if (btnHigh) btnHigh.disabled = (phase !== "guess");
    if (btnLow)  btnLow.disabled  = (phase !== "guess");

    if (btnYes) btnYes.disabled = (phase !== "continue");
    if (btnNo)  btnNo.disabled  = (phase !== "continue");

    if (btnOk) btnOk.disabled = (phase !== "fail");
  }

  function updateDoubleUpUI() {
    const mode = getMode();
    const txt = (window.TEXT && mode && window.TEXT[mode])
      ? window.TEXT[mode].doubleup
      : null;

    // 連数
    const status = $("#duStatus");
    if (status) {
      status.textContent = `${Game.duStreak}連`;
    }

    // 現在額
    const amount = $("#duAmount");
    if (amount) {
      amount.textContent = UI.formatCoins(Game.duAmount);
    }

    // 表カード
    const card = $("#duCard");
    if (card && Game.duPrev) {
      card.className = "card playing";
      renderPlayingCard(card, Game.duPrev, { mode: mode || "auditor" });
    }
  }

  function startDoubleUp(amount) {
    Game.duDeck = Poker.makeDeck52();
    Game.duPrev = Poker.draw(Game.duDeck);
    Game.duAmount = amount;
    Game.duStreak = 0;
    Game.duFailText = "";

    UI.showDoubleUpView();
    updateDoubleUpUI();

    setDuPhase("guess");
    UI.safeText("#duMsg", "HIGH / LOW を選んで。");
  }

  function finalizePayout(amount) {
    const mode = getMode();
    if (!mode) return;

    const txt = (window.TEXT && mode && window.TEXT[mode]) ? window.TEXT[mode].doubleup : null;
    const payoutMsg = txt?.payout ?? "払い戻しを実行。";

    Storage.setCoins(mode, Storage.getCoins(mode) + amount);
    UI.updateHeader();

    SFX.play(SFX.pay);
    UI.setMessage(`${payoutMsg}\n+${UI.formatCoins(amount)}`, false);

    if (amount >= 2500000) Achievements.unlockAndQueue(["m4_bigwin_250m"]);
    Achievements.checkCoinMilestones();

    Game.pendingWin = 0;
    Game.pendingResult = null;
    UI.hidePokerResult();

    UI.setDealExchangeEnabled({ deal: true, exchange: false });
  }

  function finishDoubleUpPayout() {
    const amount = Game.duAmount;
    UI.showPokerView();
    finalizePayout(amount);
  }

  function showDoubleUpFail(nextCard, prevCard) {
    const prevLabel = `${Poker.rankLabel(prevCard.rank)}${Poker.suitLabel(prevCard.suit)}`;
    const nextLabel = `${Poker.rankLabel(nextCard.rank)}${Poker.suitLabel(nextCard.suit)}`;

    Game.duPrev = nextCard;
    updateDoubleUpUI();

    const mode = getMode();
    const txt = (window.TEXT && mode && window.TEXT[mode]) ? window.TEXT[mode].doubleup : null;
    const baseFail = (txt?.fail ?? "失敗。");
    Game.duFailText = `${baseFail}\n${prevLabel} → ${nextLabel}`;

    UI.safeText("#duMsg", Game.duFailText);

    flashDoubleUp("flash-ng");

    Game.duAmount = 0;
    setDuPhase("fail");
  }

  function onGuess(choice) {
    if (Game.duPhase !== "guess") return;
    if (!Game.duDeck || !Game.duPrev) return;

    const next = Poker.draw(Game.duDeck);
    const prev = Game.duPrev;

    const win = DoubleUp.compare(prev.rank, next.rank, choice);

    if (!win) {
      SFX.play(SFX.ng);
      showDoubleUpFail(next, prev);
      return;
    }

    Game.duStreak += 1;
    Game.duAmount *= 2;
    Game.duPrev = next;
    updateDoubleUpUI();

    if (Game.duStreak >= 10) {
      SFX.play(SFX.sp);
      flashDoubleUp("flash-sp");
      Achievements.unlockAndQueue(["m5_10streak"]);
      const mode = getMode();
      const count = Storage.incTenStreakCount(mode);
      if (count >= 3) Achievements.unlockAndQueue(["m10_10streak_3"]);

      setDuPhase("fail");
      const btnOk = $("#btnDuOk");
      if (btnOk) btnOk.disabled = true;

      const txt = (window.TEXT && mode && window.TEXT[mode]) ? window.TEXT[mode].doubleup : null;
      UI.safeText("#duMsg", txt?.ten ?? "10連成功。払い戻し。");

      setTimeout(() => {
        finishDoubleUpPayout();
      }, 650);
      return;
    }

    SFX.play(SFX.ok);
    flashDoubleUp("flash-ok");

    const mode = getMode();
    const txt = (window.TEXT && mode && window.TEXT[mode]) ? window.TEXT[mode].doubleup : null;
    UI.safeText("#duMsg", txt?.successContinue ?? "成功。\n続けるか。");
    setDuPhase("continue");
  }

  // ---------- Poker ----------
  function startPokerDeal() {
    const mode = getMode();
    if (!mode) return;

    UI.showPokerView();
    UI.hidePokerResult();

    UI.ensureBetNotExceedCoins();
    const coins = Storage.getCoins(mode);
    const bet = Storage.getBet(mode);

    if (coins < 1 || bet > coins) {
      UI.setMessage("コインが足りない。ベットを下げるか、ニューゲーム。", true);
      return;
    }

    Storage.setCoins(mode, coins - bet);
    UI.updateHeader();
    Achievements.checkBankrupt();

    Game.deck = Poker.makeDeck53();
    Game.hand = Poker.deal5(Game.deck);
    Game.holds = [false,false,false,false,false];
    Game.canExchange = true;

    Game.pendingWin = 0;
    Game.pendingResult = null;

    renderHand();
    UI.setDealExchangeEnabled({ deal: false, exchange: true });

    UI.setMessage("カードをタップでHOLD。決まったら「交換する」。", true);
  }

  function doExchangeAndJudge() {
    const mode = getMode();
    if (!mode) return;

    if (!Game.canExchange) return;
    if (!Game.deck) return;

    for (let i = 0; i < 5; i++) {
      if (!Game.holds[i]) Game.hand[i] = Poker.draw(Game.deck);
    }
    Game.canExchange = false;
    renderHand();
    UI.setDealExchangeEnabled({ deal: false, exchange: false });

    const res = Poker.evaluate(Game.hand);
    Game.pendingResult = res;

    const bet = Storage.getBet(mode);
    const baseWin = bet * res.mult;
    Game.pendingWin = baseWin;

    if (baseWin <= 0) {
      SFX.play(SFX.ng);
      UI.setMessage("役なし。次へ。", false);
      flashPoker("flash-ng");        // 追加
      UI.hidePokerResult();
      UI.setDealExchangeEnabled({ deal: true, exchange: false });
      return;
    }

    Achievements.unlockAndQueue(["m1_first_win"]);
    if ((res.mult ?? 0) >= 2) Achievements.unlockAndQueue(["m2_two_pair_plus"]);
    if (res.key === "royal" || res.key === "five_kind") Achievements.unlockAndQueue(["m6_yakuman"]);

    if (res.special) SFX.play(SFX.sp);
    else SFX.play(SFX.ok);

    UI.setMessage("結果を確認。", true);
    UI.showPokerResult(res, baseWin);
   
    const cls = res.special ? "flash-sp" : "flash-ok";
    flashPoker(cls);

    if ((res.mult ?? 0) < 2) {
      finalizePayout(baseWin);
    }
  }

  function boot() {
    Storage.initIfNeeded();
    SFX.init();
    Achievements.TrophyPopup.init();

    const st = Storage.getSettings();
    const toggle = $("#toggleSfx");
    if (toggle) {
      toggle.checked = st.sfx === true;
      toggle.addEventListener("change", () => {
        const now = { ...Storage.getSettings(), sfx: toggle.checked };
        Storage.setSettings(now);
        SFX.enabled = now.sfx;
      });
    } else {
      SFX.enabled = st.sfx === true;
    }

    $("#btnTrophies").addEventListener("click", () => {
      Achievements.renderTrophies();
      UI.showScreen("screenTrophies");
    });
    $("#btnSettings").addEventListener("click", () => UI.showScreen("screenSettings"));

    $("#btnBackFromTrophies").addEventListener("click", () => UI.showScreen(getMode() ? "screenGame" : "screenMode"));
    $("#btnBackFromSettings").addEventListener("click", () => UI.showScreen(getMode() ? "screenGame" : "screenMode"));

    $("#btnResetTrophies").addEventListener("click", () => {
      const ok = confirm("本当によろしいですか？\n全モードの実績が消える。取り消せない。");
      if (!ok) return;
      Storage.resetTrophiesAllModes();
      Achievements.renderTrophies();
    });

    $$(".mode-card").forEach(btn => {
      btn.addEventListener("click", () => {
        $$(".mode-card").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        $("#btnModeConfirm").disabled = false;
      });
    });

    $("#btnModeConfirm").addEventListener("click", () => {
      const selected = $$(".mode-card").find(b => b.classList.contains("selected"))?.dataset.mode;
      if (!selected) return;

      Storage.setMode(selected);
      document.body.dataset.mode = selected;
      Storage.initProfileIfNeeded(selected);

      UI.showScreen("screenGame");
      UI.showPokerView();

      UI.ensureBetNotExceedCoins();
      UI.updateHeader();

      Game.hand = [];
      Game.holds = [false,false,false,false,false];
      Game.canExchange = false;
      renderHand();
      UI.hidePokerResult();

      UI.setDealExchangeEnabled({ deal: true, exchange: false });
      UI.setMessage("準備完了。配る。", true);
    });

    $("#btnNewGame").addEventListener("click", () => {
      const mode = getMode();
      if (mode) {
        Storage.setCoins(mode, 1000);
        Storage.setBet(mode, 1);
      }
      document.body.dataset.mode = mode;

      Game.deck = null;
      Game.hand = [];
      Game.holds = [false,false,false,false,false];
      Game.canExchange = false;
      Game.pendingWin = 0;
      Game.pendingResult = null;

      Game.duDeck = null;
      Game.duPrev = null;
      Game.duAmount = 0;
      Game.duStreak = 0;
      Game.duPhase = "guess";
      Game.duFailText = "";

      UI.updateHeader();
      renderHand();
      UI.hidePokerResult();
      UI.showPokerView();
      UI.setDealExchangeEnabled({ deal: true, exchange: false });
      UI.setMessage("ニューゲーム。モードを選択。", true);

      Storage.setMode("");
      $("#btnModeConfirm").disabled = true;
      $$(".mode-card").forEach(b => b.classList.remove("selected"));
      UI.showScreen("screenMode");
    });

      // ---- bet helper ----
      function changeBet(delta){
          const mode = getMode();
          if (!mode) return;

          UI.ensureBetNotExceedCoins();
          const coins = Storage.getCoins(mode);
          const cur = Storage.getBet(mode);

          let next = cur + delta;
          next = Math.max(1, Math.min(100, next));
          next = Math.min(next, Math.max(1, coins)); // 所持コイン以下に丸める

          Storage.setBet(mode, next);
          UI.updateHeader();
      }

      function attachHoldRepeat(btn, delta){
          if (!btn) return;

          let timer = null;
          let interval = null;
          let holding = false;

          const stop = () => {
          holding = false;
          if (timer) { clearTimeout(timer); timer = null; }
          if (interval) { clearInterval(interval); interval = null; }
          };

          const start = (e) => {
          const mode = getMode();
          if (!mode) return;

          // モバイルでの長押し選択などを抑える
          try { e.preventDefault(); } catch {}

          if (holding) return;
          holding = true;

          // 押した瞬間に1回は動かす（体感が良い）
          changeBet(delta);

          // ちょい待ってから連打開始
          timer = setTimeout(() => {
              if (!holding) return;
              interval = setInterval(() => {
              // 上限/下限に張り付いたら止める（無駄に回さない）
              const mode2 = getMode();
              if (!mode2) return stop();

              const coins = Storage.getCoins(mode2);
              const cur = Storage.getBet(mode2);
              const maxBet = Math.min(100, Math.max(1, coins));
              if ((delta < 0 && cur <= 1) || (delta > 0 && cur >= maxBet)) {
                  return stop();
              }
              changeBet(delta);
              }, 80);
          }, 280);
          };

          // クリック（短押し）も従来通り効くように残す
          btn.addEventListener("click", () => changeBet(delta));

          // 長押し（pointer系で統一）
          btn.addEventListener("pointerdown", start);
          btn.addEventListener("pointerup", stop);
          btn.addEventListener("pointercancel", stop);
          btn.addEventListener("pointerleave", stop);

          // 保険（画面外に指が出た等）
          window.addEventListener("blur", stop);
          window.addEventListener("pointerup", stop);
      }

      attachHoldRepeat($("#betMinus"), -1);
      attachHoldRepeat($("#betPlus"), +1);


    // bet input
    const betInput = $("#betInput");
    if (betInput) {
    const apply = () => {
        const mode = getMode();
        if (!mode) return;

        const raw = Number(betInput.value);
        Storage.setBet(mode, raw);
        UI.updateHeader();
    };

    betInput.addEventListener("change", apply);
    betInput.addEventListener("blur", apply);
    betInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
        e.preventDefault();
        betInput.blur();
        }
    });
      // フォーカス時に全選択（打ち替えが速い）
    betInput.addEventListener("focus", () => {
        try { betInput.select(); } catch {}
    });
    betInput.addEventListener("click", () => {
        try { betInput.select(); } catch {}
    });
    }
    
    $("#btnDeal").addEventListener("click", startPokerDeal);
    $("#btnExchange").addEventListener("click", doExchangeAndJudge);

    $("#btnDuStartYes").addEventListener("click", () => {
      if (!Game.pendingWin || Game.pendingWin <= 0) return;
      startDoubleUp(Game.pendingWin);
    });

    $("#btnDuStartNo").addEventListener("click", () => {
      if (!Game.pendingWin || Game.pendingWin <= 0) return;
      finalizePayout(Game.pendingWin);
    });

    $("#btnHigh").addEventListener("click", () => onGuess("HIGH"));
    $("#btnLow").addEventListener("click", () => onGuess("LOW"));

    $("#btnDuYes").addEventListener("click", () => {
      if (Game.duPhase !== "continue") return;
      UI.safeText("#duMsg", "HIGH / LOW を選んで。");
      setDuPhase("guess");
    });

    $("#btnDuNo").addEventListener("click", () => {
      if (Game.duPhase !== "continue") return;
      if (Game.duStreak >= 3) Achievements.unlockAndQueue(["m3_stop_3streak"]);
      finishDoubleUpPayout();
    });

    $("#btnDuOk").addEventListener("click", () => {
      if (Game.duPhase !== "fail") return;

      UI.showPokerView();
      UI.hidePokerResult();

      UI.setMessage(Game.duFailText || "失敗。", false);
      UI.setDealExchangeEnabled({ deal: true, exchange: false });

      Game.duFailText = "";
      Game.duPhase = "guess";
    });

    const mode = getMode();
    if (mode) {
      Storage.initProfileIfNeeded(mode);
      UI.showScreen("screenGame");
      UI.showPokerView();
      UI.ensureBetNotExceedCoins();
      UI.updateHeader();

      Game.hand = [];
      renderHand();
      UI.hidePokerResult();
      UI.setDealExchangeEnabled({ deal: true, exchange: false });
      UI.setMessage("前回の続き。配る。", true);
    } else {
      UI.showScreen("screenMode");
    }

    setDuPhase("guess");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
