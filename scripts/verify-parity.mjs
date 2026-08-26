/**
 * Browser/Python parity check for the peptide-MHC model.
 *
 * The app reimplements XGBoost tree traversal in TypeScript so inference can run
 * client-side. That is only honest if it produces the same numbers as the Python
 * model it was exported from. This script computes predictions for a fixed set
 * of peptide/allele pairs using the browser code path and writes them to JSON;
 * `scripts/verify_parity.py` scores the same pairs with the original XGBoost
 * model and reports the largest disagreement.
 *
 *   node scripts/verify-parity.mjs
 *   uv run --with xgboost --with numpy python scripts/verify_parity.py
 *
 * Run both after any change to the model export or the TS predictor.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const models = join(root, "client", "public", "models");

const model = JSON.parse(readFileSync(join(models, "pmhc_model.json"), "utf8"));
const alleleTable = JSON.parse(readFileSync(join(models, "pmhc_alleles.json"), "utf8"));

const { alphabet, peptideLength, alleleLength, nFeatures, pseudoSequences } = alleleTable;
const index = Object.fromEntries([...alphabet].map((aa, i) => [aa, i]));
const A = alphabet.length;

function oneHotInto(out, offset, seq, length) {
  const n = Math.min(seq.length, length);
  for (let i = 0; i < n; i++) {
    const j = index[seq[i]];
    if (j !== undefined) out[offset + i * A + j] = 1;
  }
}

function encode(peptide, allele) {
  const x = new Float32Array(nFeatures);
  oneHotInto(x, 0, peptide.toUpperCase(), peptideLength);
  const pseudo = pseudoSequences[allele];
  if (pseudo !== undefined) oneHotInto(x, peptideLength * A, pseudo, alleleLength);
  return x;
}

function margin(x) {
  let sum = model.baseMargin;
  for (const t of model.trees) {
    let n = 0;
    while (t.l[n] !== -1) n = x[t.f[n]] < t.c[n] ? t.l[n] : t.r[n];
    sum = Math.fround(sum + t.c[n]);
  }
  return sum;
}

const predict = (peptide, allele) => 1 / (1 + Math.exp(-margin(encode(peptide, allele))));

// A deterministic spread of pairs: every allele, several peptide lengths, and
// residues chosen by a fixed LCG so Python scores exactly the same inputs.
const AAs = "ACDEFGHIKLMNPQRSTVWY";
let seed = 12345;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

const alleles = Object.keys(pseudoSequences).sort();
const cases = [];
for (const allele of alleles) {
  for (const len of [8, 9, 10, 11]) {
    let peptide = "";
    for (let i = 0; i < len; i++) peptide += AAs[Math.floor(rand() * AAs.length)];
    cases.push({ peptide, allele, probability: predict(peptide, allele) });
  }
}

const t0 = performance.now();
for (const c of cases) predict(c.peptide, c.allele);
const perCall = (performance.now() - t0) / cases.length;

mkdirSync(join(root, "scripts", "out"), { recursive: true });
writeFileSync(
  join(root, "scripts", "out", "parity-js.json"),
  JSON.stringify({ nTrees: model.nTrees, msPerPrediction: perCall, cases }, null, 1),
);
console.log(`scored ${cases.length} pairs across ${alleles.length} alleles`);
console.log(`${perCall.toFixed(3)} ms per prediction (JS, single-threaded)`);
console.log("wrote scripts/out/parity-js.json");
