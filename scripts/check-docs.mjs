#!/usr/bin/env node
/**
 * The docs say what the app says (S7, 2026-10-16).
 *
 * 1. Every image a page uses exists: <img src="/images/..."> and ![...](/images/...).
 * 2. Every name the docs put in bold as a path through the app - "**Settings → Business → Tax & VAT**",
 *    "Finance → Accounting → Period End Closing" - is a label the app shows: each step must be a string
 *    in the English locale files of the Softbooq apps (apps/<app>/src/locales/en/*.json, and the
 *    ERP's apps/erp/src/locales/en). A renamed tab or button then fails here instead of on a customer.
 *
 * The app is read from ERP_REPO (default ../Softbooq-ERP). Run: node scripts/check-docs.mjs
 * Steps that are not app labels (a variable like "N", a URL) are skipped by the rules below; anything
 * else that is not found is listed with the page, and the run fails.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ERP = path.resolve(ROOT, process.env.ERP_REPO || '../Softbooq-ERP');

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

const pages = walk(ROOT, '.mdx');
const problems = [];
let images = 0, steps = 0;
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
}
if (problems.length) {
  console.error(`check-docs: ${problems.length} problem(s) in ${pages.length} pages:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`check-docs: OK - ${images} images exist, ${steps} path steps in ${pages.length} pages are labels the app shows (${labels.size} app strings).`);
