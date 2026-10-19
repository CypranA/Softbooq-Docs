#!/usr/bin/env node
/**
 * The docs say what the app says (S7, 2026-10-16).
 *
 * 1. Every image a page uses exists: <img src="/images/..."> and ![...](/images/...).
 * 2. Every name the docs put in bold as a path through the app - "**Settings → Business → Tax & VAT**",
 *    "Finance → Accounting → Period End Closing" - is a label the app shows: each step must be a string
 *    in the English locale files of the Softbooq apps (apps/<app>/src/locales/en/*.json, and the
 *    ERP's apps/erp/src/locales/en). A renamed tab or button then fails here instead of on a customer.
 * 3. A page that names an integration the app shows as Coming soon says so (2026-10-18). The names come from
 *    the one availability registry, packages/brand-assets/src/integrations.ts: every entry whose availability
 *    is 'coming_soon'. A page naming one must carry a <Note> or <Warning> that contains "Coming soon" and that
 *    name, so the docs never present as connectable what the app does not let anyone connect. QuickBooks went
 *    Coming soon the day before launch, and five pages still walked readers through connecting it.
 *
 * The app is read from ERP_REPO. Without it: the monorepo root when these docs sit in its apps/docs
 * (where they are written, and where the gate runs this through check-landing-claims), else
 * ../Softbooq-ERP (the deploy-only Softbooq-Docs repo they are mirrored to). Run: node scripts/check-docs.mjs
 * Steps that are not app labels (a variable like "N", a URL) are skipped by the rules below; anything
 * else that is not found is listed with the page, and the run fails.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const IN_MONOREPO = fs.existsSync(path.join(ROOT, '../../apps/erp/src/locales/en'));
const ERP = path.resolve(ROOT, process.env.ERP_REPO || (IN_MONOREPO ? '../..' : '../Softbooq-ERP'));

function walk(dir, ext, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, out); else if (p.endsWith(ext)) out.push(p);
  }
  return out;
}

// Every English UI string the apps can show.
const labels = new Set();
const localeDirs = [];
for (const app of fs.existsSync(path.join(ERP, 'apps')) ? fs.readdirSync(path.join(ERP, 'apps')) : []) {
  for (const rel of ['src/locales/en', 'src/i18n/locales', 'locales/en']) {
    const d = path.join(ERP, 'apps', app, rel);
    if (fs.existsSync(d)) localeDirs.push(d);
  }
}
for (const d of localeDirs) {
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.json') && (d.endsWith('en') || x === 'en.json'))) {
    const add = (o) => { for (const v of Object.values(o)) { if (typeof v === 'string') labels.add(v.trim()); else if (v && typeof v === 'object') add(v); } };
    try { add(JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))); } catch { /* not a locale file */ }
  }
}
if (labels.size < 5000) {
  console.error(`check-docs: read only ${labels.size} app strings from ${ERP} - is ERP_REPO right? The check is not looking.`);
  process.exit(2);
}
// Module names as the sidebar shows them, and "{{assistant}}" resolved.
for (const l of [...labels]) if (l.includes('{{assistant}}')) labels.add(l.replace(/\{\{assistant\}\}/g, 'Jacinta'));

// Rule 3: the names of the integrations the registry marks Coming soon.
const REGISTRY = path.join(ERP, 'packages/brand-assets/src/integrations.ts');
if (!fs.existsSync(REGISTRY)) {
  console.error(`check-docs: no availability registry at ${REGISTRY}. Set ERP_REPO to a Softbooq-ERP checkout.`);
  process.exit(2);
}
const comingSoon = [];
for (const m of fs.readFileSync(REGISTRY, 'utf8').matchAll(/\n {4}([a-z0-9_]+): \{([\s\S]*?)\n {4}\},/g)) {
  const name = m[2].match(/\bname: '([^']+)'/)?.[1];
  if (name && /availability: 'coming_soon'/.test(m[2])) comingSoon.push(name);
}
if (comingSoon.length < 5) {
  console.error(`check-docs: read only ${comingSoon.length} Coming soon names from ${REGISTRY}; the parse is broken.`);
  process.exit(2);
}
const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const pages = walk(ROOT, '.mdx');
const problems = [];
let images = 0, steps = 0, soonNamed = 0;
const EXTERNAL = /^(WooCommerce|Shopify|Xero|HubSpot|Trello|Jira|Confluence|Asana|Linear|Microsoft|Azure|Entra|Intune|Jamf|Google|Stripe|Wise|Revolut|lexoffice|Pennylane|sevdesk|MoneyBird|Zoho|Personio|Salesforce|Pipedrive|Airalo|Enable Banking)\b/;
const SKIP =/^(N|\.\.\.|[A-Z]{2,}|.*\.(com|json|md)|<.*>)$/;
for (const p of pages) {
  const rel = path.relative(ROOT, p).replace(/\\/g, '/');
  const s = fs.readFileSync(p, 'utf8');
  for (const m of s.matchAll(/(?:<img[^>]*src="|!\[[^\]]*\]\()(\/images\/[^")\s]+)/g)) {
    images++;
    if (!fs.existsSync(path.join(ROOT, m[1]))) problems.push(`${rel}: image ${m[1]} does not exist`);
  }
  for (const m of s.matchAll(/\*\*([^*\n]*→[^*\n]*)\*\*/g)) {
    // A path through ANOTHER product's screens (WooCommerce admin, Xero, ...) is theirs to name, not
    // ours: it is skipped when it starts with that product's name.
    if (EXTERNAL.test(m[1].trim())) continue;
    for (const raw of m[1].split('→')) {
      const step = raw.trim();
      if (!step || SKIP.test(step)) continue;
      steps++;
      if (!labels.has(step)) problems.push(`${rel}: "${step}" (in "${m[1].trim()}") is not a label the app shows`);
    }
  }
  const notes = [...s.matchAll(/<(Note|Warning)>([\s\S]*?)<\/\1>/g)].map((n) => n[2]).filter((n) => /Coming soon/i.test(n));
  for (const name of comingSoon) {
    if (!new RegExp(`\\b${escapeRe(name)}\\b`).test(s)) continue;
    soonNamed++;
    if (!notes.some((n) => n.includes(name))) {
      problems.push(`${rel}: names ${name}, which the app shows as Coming soon, without a <Note> saying "Coming soon" that names it`);
    }
  }
}
if (problems.length) {
  console.error(`check-docs: ${problems.length} problem(s) in ${pages.length} pages:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`check-docs: OK - ${images} images exist, ${steps} path steps in ${pages.length} pages are labels the app shows (${labels.size} app strings), and ${soonNamed} mentions of ${comingSoon.length} Coming soon integrations say so.`);
