// poker.js
const Poker = (() => {
  const SUITS = ["S", "H", "D", "C"];
  const RANKS = [2,3,4,5,6,7,8,9,10,11,12,13,14]; // A=14

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function makeDeck53() {
    const deck = [];
    for (const s of SUITS) for (const r of RANKS) deck.push({ suit: s, rank: r, joker: false });
    deck.push({ suit: null, rank: null, joker: true }); // Joker x1
    return shuffle(deck);
  }

  function makeDeck52() {
    const deck = [];
    for (const s of SUITS) for (const r of RANKS) deck.push({ suit: s, rank: r, joker: false });
    return shuffle(deck);
  }

  function draw(deck) {
    return deck.pop();
  }

  function deal5(deck) {
    return [draw(deck), draw(deck), draw(deck), draw(deck), draw(deck)];
  }

  function rankLabel(r) {
    if (r === 14) return "A";
    if (r === 13) return "K";
    if (r === 12) return "Q";
    if (r === 11) return "J";
    return String(r);
  }

  function suitLabel(s) {
    if (s === "S") return "♠";
    if (s === "H") return "♥";
    if (s === "D") return "♦";
    if (s === "C") return "♣";
    return "";
  }

  // ---- hand evaluation ----
  const PAYTABLE = [
    { key: "five_kind", name: "ファイブカード", mult: 500, special: true },
    { key: "royal",     name: "ロイヤルストレートフラッシュ", mult: 250, special: true },
    { key: "sf",        name: "ストレートフラッシュ", mult: 50, special: false },
    { key: "four",      name: "フォーカード", mult: 25, special: false },
    { key: "full",      name: "フルハウス", mult: 9, special: false },
    { key: "flush",     name: "フラッシュ", mult: 6, special: false },
    { key: "straight",  name: "ストレート", mult: 4, special: false },
    { key: "three",     name: "スリーカード", mult: 3, special: false },
    { key: "two_pair",  name: "ツーペア", mult: 2, special: false },
    { key: "pair",      name: "ワンペア", mult: 0, special: false },
    { key: "high",      name: "役なし", mult: 0, special: false },
  ];

  function eval5(cards) {
    // cards: 5, joker already substituted if needed
    const ranks = cards.map(c => c.rank).slice().sort((a,b)=>a-b);
    const suits = cards.map(c => c.suit);

    const counts = new Map();
    for (const r of ranks) counts.set(r, (counts.get(r) || 0) + 1);
    const freq = Array.from(counts.values()).sort((a,b)=>b-a); // e.g., [3,2]

    const isFlush = suits.every(s => s === suits[0]);

    // straight (A2345 OK)
    const uniq = Array.from(new Set(ranks));
    let isStraight = false;
    let isRoyal = false;

    if (uniq.length === 5) {
      const min = uniq[0], max = uniq[4];
      if (max - min === 4) isStraight = true;
      // wheel: A2345
      if (uniq[0] === 2 && uniq[1] === 3 && uniq[2] === 4 && uniq[3] === 5 && uniq[4] === 14) isStraight = true;
      // royal: 10JQKA
      if (uniq[0] === 10 && uniq[1] === 11 && uniq[2] === 12 && uniq[3] === 13 && uniq[4] === 14) isRoyal = true;
    }

    const maxCount = freq[0];

    // category pick
    if (maxCount === 5) return PAYTABLE[0]; // five of a kind
    if (isFlush && isRoyal) return PAYTABLE[1];
    if (isFlush && isStraight) return PAYTABLE[2];
    if (maxCount === 4) return PAYTABLE[3];
    if (freq.length === 2 && freq[0] === 3 && freq[1] === 2) return PAYTABLE[4];
    if (isFlush) return PAYTABLE[5];
    if (isStraight) return PAYTABLE[6];
    if (maxCount === 3) return PAYTABLE[7];
    if (freq.length === 3 && freq[0] === 2 && freq[1] === 2) return PAYTABLE[8];
    if (maxCount === 2) return PAYTABLE[9];
    return PAYTABLE[10];
  }

  function evaluate(cards) {
    const hasJoker = cards.some(c => c.joker);
    if (!hasJoker) {
      const res = eval5(cards);
      return { ...res };
    }

    // substitute joker with any of 52 cards (duplicates allowed; joker is wild)
    let best = PAYTABLE[10]; // high
    for (const s of SUITS) {
      for (const r of RANKS) {
        const replaced = cards.map(c => c.joker ? { suit: s, rank: r, joker: false } : c);
        const res = eval5(replaced);
        // choose higher multiplier; if tie, keep first (not important here)
        if (res.mult > best.mult) best = res;
      }
    }
    return { ...best };
  }

  return {
    makeDeck53,
    makeDeck52,
    deal5,
    draw,
    shuffle,
    rankLabel,
    suitLabel,
    evaluate,
    PAYTABLE,
  };
})();
