/* Runs the reference solution of every lab against the course files.

     node labs/solutions/check.mjs            every lab
     node labs/solutions/check.mjs 1.2 1.5    some labs

   Node 22, no dependencies. Nothing is written to disk and no model is called.
   What runs for real: the eight lines of lab 1.2 recomputed from travel_q3.csv; the six-criteria
   scores of the prepared outputs and drafts of labs 1.3 and 1.4; every planted fault of labs
   1.2 and 1.5 against its source; the rules of the reference delegation card and of the
   decision notes and the disclosure note.
   What runs against a stand-in: the steps a participant does in a chat assistant. standin.json
   holds scripted replies with the mistakes a real assistant makes, and the prepared outputs in
   labs/files are written by hand in the same way. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILES = path.join(HERE, '..', 'files');
const read = (name) => fs.readFileSync(path.join(FILES, name), 'utf8');
const json = (name) => JSON.parse(fs.readFileSync(path.join(HERE, name), 'utf8'));
const REF = json('reference.json');
const ANS = json('answers.json');
const STANDIN = json('standin.json');
const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const round1 = (x) => Math.round(x * 10) / 10;

function equal(actual, expected, what) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${what}: expected ${e}, got ${a}`);
}
function has(haystack, needle, what) {
  if (!haystack.includes(needle)) throw new Error(`${what}: "${needle}" is not in the file`);
}
function lacks(haystack, needle, what) {
  if (haystack.includes(needle)) throw new Error(`${what}: "${needle}" should not be in the file`);
}
/* The inner HTML of the element <div ... id="ID">, with nested divs counted. */
function block(html, id) {
  const open = html.search(new RegExp(`<div[^>]*id="${id}"[^>]*>`));
  if (open < 0) throw new Error(`no block with id ${id}`);
  const start = html.indexOf('>', open) + 1;
  let depth = 1, i = start;
  const re = /<\/?div\b[^>]*>/g;
  re.lastIndex = start;
  let m;
  while ((m = re.exec(html))) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (depth === 0) { i = m.index; break; }
  }
  return html.slice(start, i);
}

/* ---- the six criteria of labs 1.3 and 1.4, as a reader would apply them, made mechanical */
const V2 = text(read('policy_travel_v2.html'));
const V3 = text(read('policy_travel_v3.html'));
const numbers = (s) => (s.match(/\d+(?:[.,]\d+)*/g) || []).map((n) => n.replace(/,/g, ''));
const ALLOWED = new Set([...numbers(V2), ...numbers(V3)]);
const CHANGES = [
  { name: 'approval', article: 2, test: (t) => /5 ليالٍ/.test(t) },
  { name: 'booking', article: 3, test: (t) => /14 يومًا|بـ14/.test(t) },
  { name: 'class', article: 4, test: (t) => /السياحية/.test(t) },
  { name: 'per diem', article: 5, test: (t) => /650/.test(t) && /500/.test(t) },
  { name: 'emergency', article: 8, test: (t) => /الطارئة/.test(t) },
  { name: 'settlement', article: 9, test: (t) => /10 أيام عمل/.test(t) }
];
function score(html) {
  const t = text(html);
  const words = t.split(' ').filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  const changes = CHANGES.filter((c) => c.test(t)).length;
  const c1 = changes === 6 ? 2 : changes >= 3 ? 1 : 0;
  const dated = /1 يناير 2027/.test(t);
  const c2 = dated ? (/قبل هذا التاريخ/.test(t) && /الإصدار 2/.test(t) ? 2 : 1) : 0;
  const invented = numbers(t).filter((n) => !ALLOWED.has(n) && !(Number.isInteger(Number(n)) && Number(n) <= 12));
  const c3 = invented.length ? 0 : 2;
  const c4 = (/رؤساء الإدارات/.test(t) ? 1 : 0) + (/المطلوب/.test(t) ? 1 : 0);
  const cited = CHANGES.filter((c) => new RegExp(`\\(المادة ${c.article}\\)`).test(t)).length;
  const c5 = cited === 6 ? 2 : cited >= 1 ? 1 : 0;
  const c6 = (words <= 200 ? 1 : 0) + (/<table|<li/.test(html) ? 1 : 0);
  return { scores: [c1, c2, c3, c4, c5, c6], total: c1 + c2 + c3 + c4 + c5 + c6, words, invented };
}

const LABS = {};

LABS['1.1'] = () => {
  const task = read('briefing_task.html');
  const steps = [...task.matchAll(/<li>(.*?)<\/li>/g)].slice(0, REF.steps).map((m) => m[1]);
  equal((task.match(/<ol>[\s\S]*?<\/ol>/)[0].match(/<li>/g) || []).length, 10, 'steps of the briefing task');
  for (const needle of ['تصنيفه «سري»', 'تصنيفه «مقيّد»', 'تصنيفهما «عام»']) has(task, needle, 'classification of the materials');
  equal((read('delegation_card.html').match(/<td class="fill">/g) || []).length, 40, 'blank cells of the delegation card');
  const WHO = ['شخص', 'مساعد', 'معًا', 'لا أحد'];
  /* the rules a card must keep, whoever fills it */
  const violations = (who) => {
    const v = [];
    if (who[2] === 'مساعد') v.push(3);          // calculation: not delegated before it is tested
    if (who[3] !== 'شخص') v.push(4);            // the legal question is asked by a person
    if (who[5] !== 'شخص') v.push(6);            // the check against the approved text stays with the author
    if (who[6] !== 'لا أحد') v.push(7);         // personal data the briefing does not need: nobody does it
    if (who[9] !== 'شخص') v.push(10);           // sending is signing
    return v;
  };
  const card = ANS.lab_1_1.card;
  equal(card.length, steps.length, 'rows of the reference card');
  for (const row of card) {
    if (!WHO.includes(row.who)) throw new Error(`step ${row.step}: unknown assignment ${row.who}`);
    if (!/المخاطر|المهارة|المساءلة/.test(row.reason)) throw new Error(`step ${row.step}: the reason names neither risk, skill nor accountability`);
    if (!row.check) throw new Error(`step ${row.step}: no check`);
  }
  const who = card.map((r) => r.who);
  equal(violations(who), [], 'rule violations of the reference card');
  equal(WHO.map((w) => who.filter((x) => x === w).length), [5, 2, 2, 1], 'person, assistant, both, nobody in the reference card');
  equal(ANS.lab_1_1.needs_test_first, 3, 'the step to test before delegating');
  const naive = violations(STANDIN.lab_1_1.assistant_card);
  equal(naive, [3, 6, 7], 'rule violations of the stand-in card the assistant proposes for itself');
  return `10 steps; reference card: 5 person, 2 assistant, 2 both, 1 nobody, 0 rule violations; the stand-in assistant's own card breaks the rules at steps ${naive.join(', ')}`;
};

/* lab 1.2: first the table recomputed, then the prepared summary compared with it */
LABS['1.2'] = ((inner) => () => {
  const F = REF.frontier, W = F.planted;
  const page = text(read('frontier_summary_sample.html'));
  const agree = [fmt(F.q3_cost), `${F.q3_trips} رحلة`, '55.0%', `${F.nights} ليلة، منها ${F.nights_a}`, `${F.nights_a_share_pct}%`, `${fmt(F.highest_per_trip)} ريال`];
  for (const n of agree) has(page, n, 'a line of the prepared summary that agrees with the reference');
  const planted = [
    [3, `${W.change_pct_wrong_base}%`, `${F.change_pct}%`],
    [4, fmt(W.cost_per_trip_mean_of_means), fmt(F.cost_per_trip)],
    [8, fmt(W.per_diem_all_tier_b), fmt(F.per_diem_new)],
    ['التنبؤات', fmt(W.forecast_cost_transposed), '61,300']
  ];
  for (const [line, wrong, right] of planted) { has(page, wrong, `planted difference at ${line}`); lacks(page, right, `the right value at ${line}`); }
  equal([W.change_pct_wrong_base, W.cost_per_trip_mean_of_means, W.per_diem_all_tier_b, W.per_diem_all_tier_b_change_pct], [16.4, 4274, 198000, -16.7], 'the planted wrong values');
  equal(ANS.lab_1_2.differences.map((d) => d.line), planted.map((p) => p[0]), 'the differences of the reference trial record');
  equal(ANS.lab_1_2.decision, 'تقييد', 'the reference decision');
  equal((read('frontier_trial_record.html').match(/<td class="fill">/g) || []).length, 43, 'blank cells of the trial record');
  return `${inner()}; prepared summary: 5 of 8 lines agree, 3 differ (lines 3, 4, 8) and one figure is transposed (63,100 for 61,300); decision: limit`;
})(() => {
  const lines = read('travel_q3.csv').trim().split('\n');
  const head = lines[0].split(',');
  const rows = lines.slice(1).map((l) => Object.fromEntries(l.split(',').map((v, i) => [head[i], i ? Number(v) : v])));
  equal(rows.length, 8, 'departments in travel_q3.csv');
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
  const P = REF.policy;
  const q3 = sum('q3_cost_sar'), q2 = sum('q2_cost_sar'), trips = sum('q3_trips'), nights = sum('q3_nights'), nightsA = sum('q3_nights_tier_a');
  const perTrip = rows.map((r) => r.q3_cost_sar / r.q3_trips);
  const top = rows.reduce((a, r) => (r.q3_cost_sar > a.q3_cost_sar ? r : a));
  const got = {
    q3_cost: q3, q3_trips: trips, q2_cost: q2, change_pct: round1(((q3 - q2) / q2) * 100), cost_per_trip: Math.round(q3 / trips),
    top_share_pct: round1((top.q3_cost_sar / q3) * 100), nights, nights_a: nightsA, nights_a_share_pct: round1((nightsA / nights) * 100),
    highest_per_trip: Math.round(Math.max(...perTrip)), per_diem_old: nights * P.flatOld,
    per_diem_new: nightsA * P.tierA + (nights - nightsA) * P.tierB
  };
  const F = REF.frontier;
  for (const k of Object.keys(got)) equal(got[k], F[k], `reference line ${k}`);
  equal([got.q3_cost, got.q3_trips, got.change_pct, got.cost_per_trip, got.top_share_pct, got.nights_a_share_pct, got.highest_per_trip, got.per_diem_new - got.per_diem_old, round1(((got.per_diem_new - got.per_diem_old) / got.per_diem_old) * 100)],
    [548000, 116, 19.7, 4724, 55, 41.7, 5200, -14850, -6.2], 'the numbers the lab page and the slides quote');
  const ref = text(read('frontier_reference.html'));
  for (const n of [fmt(q3), `+${got.change_pct}%`, fmt(got.cost_per_trip), '55.0%', `${got.nights_a_share_pct}%`, fmt(got.highest_per_trip), fmt(got.per_diem_old), fmt(got.per_diem_new), '-14,850', '-6.2%']) has(ref, n, 'worked reference answer');
  return `8 reference lines recomputed from the table: total ${fmt(q3)} SAR in ${trips} trips, +${got.change_pct}% on Q2, ${fmt(got.cost_per_trip)} per trip, per diem ${fmt(got.per_diem_old)} to ${fmt(got.per_diem_new)} (-6.2%)`;
});

LABS['1.3'] = () => {
  const page = read('ladder_outputs_sample.html');
  const out = {};
  for (const id of ['L1', 'L2', 'L3']) {
    out[id] = score(block(page, id));
    equal(out[id].scores, ANS.lab_1_3.scores[id], `criteria scores of prepared output ${id}`);
  }
  equal([out.L1.total, out.L2.total, out.L3.total], [1, 5, 11], 'totals of the three prepared outputs');
  equal(out.L1.invented, ['21', '700'], 'numbers in output 1 that are in neither policy');
  equal(out.L2.invented, ['15'], 'numbers in output 2 that are in neither policy');
  if (out.L3.words <= 200) throw new Error(`output 3 should run over 200 words, has ${out.L3.words}`);
  const req = read('ladder_requests.html');
  for (const needle of ['معايير النجاح', 'مثال على سطر واحد', 'اسألني ما تحتاج', 'اعتمد على النصين وحدهما']) has(req, needle, 'the third request');
  equal((req.match(/<td class="fill">/g) || []).length, 21, 'blank cells of the scoring sheet');
  return `prepared outputs score ${out.L1.total}, ${out.L2.total} and ${out.L3.total} of 12; output 1 invents 21 and 700, output 2 invents 15; output 3 runs to ${out.L3.words} words`;
};

LABS['1.4'] = () => {
  const v1 = score(block(read('iteration_start.html'), 'v1'));
  const transcript = read('iteration_transcript_sample.html');
  const v3 = score(block(transcript, 'v3'));
  equal(v1.scores, ANS.lab_1_4.scores.v1, 'criteria scores of the starting draft');
  equal(v3.scores, ANS.lab_1_4.scores.v3, 'criteria scores after turn 3');
  equal([v1.total, v3.total], [6, 12], 'before and after');
  has(text(transcript), `${v1.words} كلمة`, 'the word count the prepared critique states');
  equal((transcript.match(/<h2>الجولة/g) || []).length, 3, 'turns in the prepared conversation');
  equal(score(block(read('briefing_final_sample.html'), 'final')).total, 12, 'the prepared final briefing');
  /* the stuck conversation: how often the assistant returns to the old rate after a correction */
  const stuck = read('conversation_stuck.html');
  const turns = [...stuck.matchAll(/<div class="(q|a)"><span class="who">[^<]*<\/span><p>(.*?)<\/p><\/div>/g)].map((m) => ({ ai: m[1] === 'a', text: m[2] }));
  equal(turns.length, 10, 'turns of the stuck conversation');
  const firstCorrection = turns.findIndex((t) => !t.ai && /650/.test(t.text));
  const relapses = turns.slice(firstCorrection + 1).filter((t) => t.ai && /600/.test(t.text)).length;
  equal(relapses, 2, 'returns to the old rate after the first correction');
  equal(ANS.lab_1_4.stuck_decision, 'بداية جديدة', 'the reference decision on the stuck conversation');
  return `starting draft ${v1.total} of 12 (${v1.words} words), after three turns ${v3.total} of 12 (${v3.words} words); the stuck conversation returns to the old rate ${relapses} times after being corrected`;
};

LABS['1.5'] = () => {
  const page = read('five_outputs.html');
  const O = Object.fromEntries(['O1', 'O2', 'O3', 'O4', 'O5'].map((id) => [id, text(block(page, id))]));
  const F = REF.frontier, P = REF.policy;
  const sources = V2 + V3 + text(read('frontier_reference.html'));
  /* F1: a circular and a ceiling that no source holds */
  has(O.O1, '14/2026', 'F1'); lacks(sources, '14/2026', 'F1 in the sources'); lacks(sources, 'السقف', 'F1 in the sources');
  has(O.O1, fmt(F.q3_cost), 'the true total in output 1'); has(O.O1, `${F.change_pct}%`, 'the true change in output 1');
  /* F2: the exception of article 8 dropped */
  has(O.O2, 'دون استثناء', 'F2'); lacks(O.O2, 'الطارئة', 'F2'); has(V3, 'تُستثنى المهام الميدانية الطارئة من مهلة الحجز', 'F2 in version 3');
  has(O.O2, P.effective, 'the true date in output 2');
  /* F3: every night priced at tier B */
  const wrongSaving = F.per_diem_old - F.planted.per_diem_all_tier_b;
  has(O.O3, fmt(wrongSaving), 'F3'); has(O.O3, '16.7%', 'F3'); lacks(O.O3, String(P.tierA), 'F3: tier A is never mentioned');
  equal([wrongSaving, -F.per_diem_change], [39600, 14850], 'the saving output 3 claims and the true one');
  /* F4: a premise the policy does not hold, accepted */
  has(O.O4, 'تقل مدتها عن ليلتين', 'F4'); has(O.O4, 'بالتأكيد', 'F4'); lacks(V3, 'ليلتين', 'F4 in version 3'); has(V3, 'يُصرف عن كل ليلة في المهمة', 'F4 in version 3');
  /* F5: an article that does not exist; F6: working days dropped */
  has(O.O5, 'المادة 14', 'F5'); equal((V3.match(/المادة \d+ ·/g) || []).length, P.articles, 'articles of version 3'); lacks(V3, 'يُخصم', 'F5 in version 3');
  has(O.O5, '10 أيام من العودة', 'F6'); lacks(O.O5, 'أيام عمل', 'F6'); has(V3, '10 أيام عمل من العودة', 'F6 in version 3');
  equal(ANS.lab_1_5.faults.map((f) => f.output), ['O1', 'O2', 'O3', 'O4', 'O5', 'O5'], 'the planted faults of the answer key');
  /* the stand-in assistant as a checker: one catch, one false alarm, one miss */
  const truth = { exception_missing: true, date_wrong: false, calculation_ok: false };
  const verdicts = STANDIN.lab_1_5.checker.map((c) => truth[c.claim]);
  equal(verdicts, [true, false, false], 'the three claims of the stand-in checker against the sources');
  equal((read('error_log.html').match(/<td class="fill">/g) || []).length, 28, 'blank cells of the error log');
  return '6 planted faults in 5 outputs, each contradicted by its source; the stand-in checker catches 1, raises 1 false alarm and passes the faulty calculation';
};

LABS['1.6'] = () => {
  const scenarios = text(read('three_scenarios.html'));
  for (const needle of ['تطبيق مساعد مجاني على هاتفي', 'ظرف صحي', 'خطاب إنذار رسميًّا', 'في إجازة حتى الأحد', 'تصنيفه «عام»', 'نسب احتمال']) has(scenarios, needle, 'the three scenarios');
  const notes = ANS.lab_1_6.notes;
  equal(notes.map((n) => n.decision), ['تقييد', 'رفض', 'استخدام'], 'the three reference decisions');
  for (const n of notes) for (const k of ['risk', 'skill', 'accountability', 'human']) if (!n[k] || n[k].length < 20) throw new Error(`scenario ${n.scenario}: the field ${k} is empty`);
  /* the three-point checklist of a disclosure note */
  const points = (note) => [
    /المساعد/.test(note) && /صاغ|رتّب|لخّص|ترجم|اقترح/.test(note),
    /راجعت|تحققت|طابقت/.test(note) && /على /.test(note),
    /المسؤول/.test(note)
  ];
  equal(points(ANS.lab_1_6.disclosure), [true, true, true], 'the reference disclosure note against the three points');
  equal(points(STANDIN.lab_1_6.weak_disclosure), [false, false, false], 'the stand-in one-line disclosure against the three points');
  equal((read('three_scenarios.html').match(/<td class="fill">/g) || []).length, 15, 'blank cells of the decision notes');
  equal((read('followup_log.html').match(/<td class="fill">/g) || []).length, 12, 'blank cells of the follow-up log');
  equal((read('prework_my_tasks.html').match(/<td class="fill">/g) || []).length, 25, 'blank cells of the pre-work sheet');
  return 'reference decisions: limit, refuse, use; the reference disclosure note meets 3 of 3 points, the one-line stand-in note 0 of 3';
};

const wanted = process.argv.slice(2);
const ids = wanted.length ? wanted : Object.keys(LABS);
let failed = 0;
for (const id of ids) {
  if (!LABS[id]) { console.log(`lab ${id}: no such lab`); failed++; continue; }
  try {
    console.log(`lab ${id}: ${LABS[id]()}`);
    console.log(`lab ${id}: PASS`);
  } catch (e) {
    failed++;
    console.log(`lab ${id}: FAIL: ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
