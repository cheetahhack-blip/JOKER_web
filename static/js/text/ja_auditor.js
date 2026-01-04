window.TEXT = window.TEXT || {};
window.TEXT.auditor = {
  doubleup: {
    start: "ダブルアップを開始するか。",
    successContinue: "成功。\n続行するか。",
    fail: "失敗。\n払い戻しはない。",
    streak: (n) => `${n}連成功中。`,
    ten: "10連成功を確認。\n払い戻しを実行。",
    payout: "払い戻しを実行。"
  }
};
