// Renders the 4471-split page as the desk sees it: the table, note, timeline and desk ref
// are computed from the same data and the same rules as src/lib/kb (causes.ts, desk-ref.ts).
// Run: node render-page.mjs  -> rendered/4471-split.html
import fs from 'node:fs';

const lib = 'src/lib/';
const reports = [...new Map(JSON.parse(fs.readFileSync(lib + 'data/reports-4471.json', 'utf8')).map((r) => [r.id, r])).values()];
const notes = JSON.parse(fs.readFileSync(lib + 'data/desk-notes.json', 'utf8'));
const tenants = Object.fromEntries(fs.readdirSync(lib + 'data/tenants').map((f) => { const t = JSON.parse(fs.readFileSync(lib + 'data/tenants/' + f, 'utf8')); return [t.handle, t]; }));
const page = fs.readFileSync('src/routes/kb/incidents/4471-split/+page.svx', 'utf8');
const signature = page.match(/^signature: (.+)$/m)[1].trim();
const title = page.match(/^title: '(.+)'$/m)[1];

// --- same logic as causes.ts
const DATE_HINT = { 'booking-v2': 'DD/MM/YYYY', 'booking-v3': 'MM/DD/YYYY' };
const dayFirst = (l) => { const o = new Intl.DateTimeFormat(l, { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(Date.UTC(2026, 0, 2, 12))).map((p) => p.type); return o.indexOf('day') < o.indexOf('month'); };
const causeOf = (r) => { const t = tenants[r.tenant]; if (!t || !dayFirst(t.locale)) return null; return r.channel === 'form' && DATE_HINT[t.form].startsWith('MM') ? 'hint' : 'parser'; };

// --- same logic as desk-ref.ts
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const fnv = (text, seed) => { let h = seed >>> 0; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; };
function deskRef(sig) { const t = sig.trim(); const a = fnv(t, 0x811c9dc5), b = fnv(t, 0x9e3779b9); let bits = (BigInt(a) << 8n) | BigInt(b & 0xff); let out = ''; for (let i = 0; i < 8; i++) { out = ALPHABET[Number(bits & 31n)] + out; bits >>= 5n; } return `DR-${out.slice(0, 4)}-${out.slice(4)}`; }

const merged = reports.filter((r) => r.mergedInto === 4471);
const by = new Map();
for (const r of merged) { const c = causeOf(r) ?? 'unplaced'; by.set(c, [...(by.get(c) ?? []), r]); }
const groups = [...by.entries()].map(([cause, rs]) => {
  const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
  const tags = rs.reduce((n, r) => ({ ...n, [r.meta.intakeTag]: (n[r.meta.intakeTag] ?? 0) + 1 }), {});
  return { cause, rs, tags, tenants: new Set(rs.map((r) => r.tenant)).size, first: days[0], last: days.at(-1) };
}).sort((a, b) => b.rs.length - a.rs.length);
const owner = 'parser';
const tagStr = (g) => Object.entries(g.tags).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ×${n}`).join(' · ');

const WEEK = 7 * 86400000, day = (s) => Date.parse(s.slice(0, 10)), start = day('2026-03-30');
const n = Math.ceil((day('2026-10-05') - start) / WEEK);
const weeks = Array.from({ length: n }, (_, i) => ({ at: start + i * WEEK, received: 0, merged: 0 }));
const wk = (s) => weeks[Math.floor((day(s) - start) / WEEK)];
for (const r of merged) { const a = wk(r.receivedAt); if (a) a.received++; const m = r.mergedAt ? wk(r.mergedAt) : null; if (m) m.merged++; }
const max = Math.max(...weeks.flatMap((w) => [w.received, w.merged]));
const h = (v) => (v / max) * 100;
const svg = `<svg viewBox="0 0 ${n * 24} 140" role="img" aria-label="reports received and merged into #4471, per week" style="width:100%;max-width:640px">` +
  weeks.map((w, i) => `<rect x="${i * 24 + 2}" y="${110 - h(w.received)}" width="9" height="${h(w.received)}" fill="#b4501f"/><rect x="${i * 24 + 12}" y="${110 - h(w.merged)}" width="9" height="${h(w.merged)}" fill="#2f6f5e"/>` + (i % 4 === 0 ? `<text x="${i * 24 + 12}" y="128" font-size="8" text-anchor="middle" fill="#6b6a66">${new Date(w.at).toISOString().slice(5, 10)}</text>` : '')).join('') + '</svg>';

const rows = groups.map((g) => `<tr${g.cause !== owner ? ' class="wrong"' : ''}><td><code>${g.cause}</code></td><td>${g.rs.length}</td><td class="tags">${tagStr(g)}</td><td>${g.tenants}</td><td>${g.first} → ${g.last}</td><td>${g.cause === owner ? '#4471' : 'not this ticket — no ticket of its own'}</td></tr>`).join('\n');
const foot = groups.map((g) => { const m = g.rs.filter((r) => notes.oneDayMove.includes(r.id)).length; return m ? `<p class="note">${m} reports read as a one-day move; filed under <code>${g.cause}</code> by tenant.</p>` : ''; }).join('');
const reviewed = '2026-10-28';

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title} · support kb</title><style>
body{margin:0;background:#fbfaf7;color:#1d1d1b;font:16px/1.6 system-ui,sans-serif}.kb{max-width:760px;margin:0 auto;padding:2rem 16px 4rem}
table{border-collapse:collapse;width:100%;margin:1rem 0;font-size:.92rem}th,td{border-bottom:1px solid #e3e0d8;padding:.35rem .5rem;text-align:left}
code{font:.88em ui-monospace,monospace}a{color:#2f6f5e}.crumb{font:.8rem ui-monospace,monospace;color:#6b6a66;text-decoration:none}
.meta{display:flex;gap:1rem;color:#6b6a66;font-size:.85rem}.tags,.note{color:#6b6a66;font-size:.85em}.wrong td{background:#fbeee6}.wrong td:last-child{color:#b4501f;font-weight:600}
aside{border-left:4px solid #b4501f;padding:.5rem 1rem;margin:1rem 0;background:#fbeee6}.stamp{margin-top:2rem;font:.85rem ui-monospace,monospace;color:#6b6a66}.stamp b{color:#2f6f5e}
footer{margin-top:3rem;color:#6b6a66;font-size:.8rem;border-top:1px solid #e3e0d8;padding-top:1rem}</style></head><body><div class="kb">
<header><a class="crumb" href="/kb">support desk · kb</a><h1>${title}</h1><p class="meta"><span>owner <b>support desk</b></span><span>living</span><span>reviewed ${reviewed} · 0 days ago</span></p></header><main>
<p>The <a href="/kb/incidents/4471">#4471 page</a> says one issue, one fix. The reports say otherwise. They were merged on one symptom, a wrong date, and they hold three different problems. Fixing the parser will not close the ticket.</p>
<aside>Not one issue. A parser fix leaves the form-hint reports and the one-day reports open.</aside>
<h2>What the reports hold</h2>
<p style="font-size:1.1rem"><strong>${merged.length}</strong> reports merged into #4471 · <strong>${groups.length}</strong> causes</p>
<table><thead><tr><th>cause</th><th>reports</th><th>tagged as</th><th>tenants</th><th>seen</th><th></th></tr></thead><tbody>
${rows}
</tbody></table>
${foot}
<p>The table is computed from the export, one row per cause. Each cause now has its own ticket:</p>
<ol><li><b>Parser reads month first</b> (<a href="https://github.com/Mw-megadev/kb-4471/issues/1">issue 1</a>). The shared parser reads every date month first; day-first tenants write the day first. This is the <code>parser</code> row, minus the one-day reports below.</li>
<li><b>Form hint says MM/DD/YYYY</b> (<a href="https://github.com/Mw-megadev/kb-4471/issues/2">issue 2</a>). Day-first tenants on <code>booking-v3</code> type what the hint tells them. This is the <code>hint</code> row.</li>
<li><b>Off by one day</b> (<a href="https://github.com/Mw-megadev/kb-4471/issues/3">issue 3</a>). Not a month flip. These are the reports in the note under the table, filed under <code>parser</code> only because of their tenant. Likely a timezone or day-boundary bug.</li></ol>
<h2>Why one ticket looked right</h2>
<p><a href="/kb/decisions/0001-dedupe-by-subject">Decision 0001</a> merges on subject. Intake also tags each report from the reporter's browser. Both are guesses about the symptom. The cause depends on the tenant: its locale and its booking form (<code>causes.ts</code>). The "tagged as" column shows intake disagreeing with the cause in both rows.</p>
<h2>Since April</h2>
<figure>${svg}<figcaption style="color:#6b6a66;font-size:.85rem">received (orange) · merged into #4471 (green) · per week</figcaption></figure>
<h2>What to do</h2>
<ul><li>Work the three tickets separately.</li><li>Triage by cause, not by subject line. <a href="/kb/triage/dedupe">The explorer</a> shows pairs with the same subject and different causes.</li><li>Do not read "merged" as "one bug". Count by cause.</li></ul>
<p class="stamp">desk ref <b>${deskRef(signature)}</b></p>
</main><footer>Pages are written by people. Tables and charts are built from data at render time.</footer></div></body></html>`;
fs.mkdirSync('rendered', { recursive: true });
fs.writeFileSync('rendered/4471-split.html', html);
console.log(groups.map((g) => `${g.cause} ${g.rs.length}`).join(', '), deskRef(signature));
