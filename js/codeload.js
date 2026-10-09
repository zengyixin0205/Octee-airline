// Load an account from a code. Two kinds work: the long OCTEE1... backup code, and the short personal code of an
// etched account. Used by the Log in > Backup code tab and by the Account page.
import { logInWithCode, MESSAGES, AuthError } from "./auth.js";
import { restoreBackup, BACKUP_MESSAGES } from "./backup.js";

export async function loadCode(raw) {
  const code = String(raw || "").trim();
  if (!code) throw new Error("empty");
  return /^OCTEE[01]\b/i.test(code) ? restoreBackup(code) : logInWithCode(code);
}
export function codeMessage(err) {
  if (err instanceof AuthError) return MESSAGES[err.code] || MESSAGES.bad_code;
  if (err?.message === "empty") return "Type a code first.";
  return BACKUP_MESSAGES[err?.message] || MESSAGES.bad_code;
}
