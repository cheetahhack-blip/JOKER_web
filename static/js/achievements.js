// achievements.js
window.Achievements = (() => {
  const MODE_LABEL = {
    auditor: "監査官モード",
    chogi: "山姥切長義モード",
    goke: "後家兼光モード"
  };

  const TROPHIES = [
    { n: 1, id: "m1_first_win",      name: "初勝利",     desc: "初めて払い戻しを確定する" },
    { n: 2, id: "m2_two_pair_plus",  name: "二枚目の扉", desc: "ツーペア以上を成立させる" },
    { n: 3, id: "m3_stop_3streak",   name: "引き際",     desc: "ダブルアップ3連以上で自分から降りる" },

    // ★ 250万 → 40万
    { n: 4, id: "m4_bigwin_250m",    name: "大勝ち",     desc: "1回の払い戻しが40万以上" },

    { n: 5, id: "m5_10streak",       name: "十連",       desc: "ダブルアップ10連成功（強制終了）" },
    { n: 6, id: "m6_yakuman",        name: "役満",       desc: "ロイヤル or ファイブカードを成立" },

    // ★ 1500万 → 50万
    { n: 7, id: "m7_goal_1500m",     name: "目標達成",   desc: "所持コインが50万に到達" },

    // ★ 3000万 → 150万
    { n: 8, id: "m8_secret_3000m",   name: "想定外",     desc: "所持コインが150万に到達" },

    { n: 9, id: "m9_bankrupt",       name: "破産",       desc: "所持コインが0になる" },
    { n:10, id: "m10_10streak_3",    name: "執念",       desc: "ダブルアップ10連成功を3回達成" },
  ];

  function trophyLine(mode, trophyId) {
    const L = {
      auditor: {
        m1_first_win: "初回確認。\n次へ進む。",
        m2_two_pair_plus: "基準達成。\nダブルアップ解禁。",
        m3_stop_3streak: "判断は妥当。\n引き際を確保。",

        // ★ 40万に合わせて修正
        m4_bigwin_250m: "大きい払い戻しを確認。\n記録する。",

        m5_10streak: "10連成功を確認。\n処理を終了。",
        m6_yakuman: "役満成立を確認。\n例外扱い。",

        // ★ 50万 / 150万 に合わせて修正
        m7_goal_1500m: "50万到達。\n目標を満たす。",
        m8_secret_3000m: "150万到達。\n想定外。",

        m9_bankrupt: "所持コインが0。\n再起動を推奨。",
        m10_10streak_3: "10連×3回。\n執念を確認。"
      },
      chogi: {
        m1_first_win: "まずは一つ。\n次へ行くぞ。",
        m2_two_pair_plus: "条件は満たした。\n倍にする権利はやる。",
        m3_stop_3streak: "退く判断も実力だ。\n無駄にするな。",

        // ★ 40万に合わせて修正
        m4_bigwin_250m: "40万以上か。\n浮かれるなよ。",

        m5_10streak: "10連だ。\nここで終わりだな。",
        m6_yakuman: "役満。\n……認める。",

        // ★ 50万 / 150万 に合わせて修正
        m7_goal_1500m: "50万到達。\n次の一手を考えろ。",
        m8_secret_3000m: "150万。\nやり過ぎだ。",

        m9_bankrupt: "0になったか。\n学べ。",
        m10_10streak_3: "10連を三度。\nしつこいな。嫌いじゃない。"
      },
      goke: {
        m1_first_win: "いいね。\nまずは手堅く一つ。",
        m2_two_pair_plus: "ほら、流れが来た。\n倍にして遊べる。",
        m3_stop_3streak: "その引き際、嫌いじゃない。\n次で取るか。",

        // ★ 40万に合わせて修正
        m4_bigwin_250m: "40万。\n……景気がいい。",

        m5_10streak: "十連。\nここは拍手しておくよ。",
        m6_yakuman: "役満。\n君、やるじゃないか。",

        // ★ 50万 / 150万 に合わせて修正
        m7_goal_1500m: "50万到達。\n目標は回収した。",
        m8_secret_3000m: "150万。\n想定外の顔、してる？",

        m9_bankrupt: "0か。\n次はもう少し丁寧に。",
        m10_10streak_3: "十連三回。\n執念ってやつだね。"
      }
    };
    return (L[mode] && L[mode][trophyId]) ? L[mode][trophyId] : "";
  }

  // popup queue
  const TrophyPopup = {
    queue: [],
    open: false,

    init() {
      const okBtn = document.querySelector("#btnTrophyPopupOk");
      if (okBtn) okBtn.addEventListener("click", () => this.close());
    },

    enqueue(ids) {
      for (const id of ids) this.queue.push(id);
      this.tryShowNext();
    },

    tryShowNext() {
      if (this.open) return;
      if (this.queue.length === 0) return;

      const mode = getMode();
      if (!mode) return;

      const id = this.queue.shift();
      const def = TROPHIES.find(t => t.id === id);
      if (!def) return;

      this.open = true;
      document.querySelector("#trophyPopup").classList.remove("hidden");
      UI.safeText("#trophyPopupTitle", `実績解除  ${def.n}/10`);
      UI.safeText("#trophyPopupName", def.name);
      UI.safeText("#trophyPopupDesc", def.desc);
      UI.safeText("#trophyPopupLine", trophyLine(mode, id));
    },

    close() {
      document.querySelector("#trophyPopup").classList.add("hidden");
      this.open = false;
      this.tryShowNext();
    }
  };

  function unlockAndQueue(ids) {
    const mode = getMode();
    if (!mode) return;

    const newly = [];
    for (const id of ids) {
      if (Storage.unlockTrophy(mode, id)) newly.push(id);
    }
    if (newly.length === 0) return;

    newly.sort((a, b) => {
      const A = TROPHIES.find(t => t.id === a)?.n ?? 999;
      const B = TROPHIES.find(t => t.id === b)?.n ?? 999;
      return A - B;
    });

    TrophyPopup.enqueue(newly);
  }

  function checkBankrupt() {
    const mode = getMode();
    if (!mode) return;
    if (Storage.getCoins(mode) === 0) unlockAndQueue(["m9_bankrupt"]);
  }

  function checkCoinMilestones() {
    const mode = getMode();
    if (!mode) return;
    const c = Storage.getCoins(mode);
    const ids = [];

    // ★ 50万 / 150万
    if (c >= 500000)  ids.push("m7_goal_1500m");
    if (c >= 1500000) ids.push("m8_secret_3000m");

    unlockAndQueue(ids);
  }

  function renderTrophies() {
    const mode = getMode();
    const label = document.querySelector("#trophyModeLabel");
    if (label) label.textContent = mode ? `対象：${MODE_LABEL[mode]}` : "対象：未選択";

    const list = document.querySelector("#trophyList");
    if (!list) return;

    list.innerHTML = "";
    if (!mode) return;

    const got = Storage.getTrophiesForMode(mode);

    for (const t of TROPHIES) {
      const row = document.createElement("div");
      row.className = "list-item";

      const left = document.createElement("div");
      const right = document.createElement("div");
      right.style.textAlign = "right";

      if (got[t.id]) {
        const line = trophyLine(mode, t.id);
        const lineHtml = line
          ? `<div class="muted" style="margin-top:8px; white-space:pre-line;">「${line}」</div>`
          : "";

        left.innerHTML =
          `<div class="list-title">${t.n}. ${t.name}</div>` +
          `<div class="list-sub">${t.desc}</div>` +
          lineHtml;

        right.innerHTML = `<div class="list-title">${got[t.id]}</div><div class="list-sub">達成日</div>`;
      } else {
        left.innerHTML = `<div class="list-title">？？？</div><div class="list-sub">未取得</div>`;
        right.innerHTML = `<div class="list-title">—</div><div class="list-sub">—</div>`;
      }

      row.appendChild(left);
      row.appendChild(right);
      list.appendChild(row);
    }
  }

  return {
    TROPHIES,
    TrophyPopup,
    unlockAndQueue,
    checkBankrupt,
    checkCoinMilestones,
    renderTrophies
  };
})();
