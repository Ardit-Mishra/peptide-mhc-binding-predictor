/**
 * Export-format check: is pmhc_model.json a faithful, self-describing tree dump?
 *
 * WHAT THIS IS, AND WHAT IT IS NOT
 * --------------------------------
 * This walks the exported trees with a minimal independent traversal and
 * compares against the shipped PeptideMHCPredictor. It is a check on the EXPORT
 * FORMAT: that the arrays are internally consistent, that the structure is
 * sufficient to reproduce a score without the app's code, and that the shipped
 * class has not drifted from the plain reading of its own artifact.
 *
 * It is NOT proof that the browser matches Python. That claim belongs to
 * scripts/verify-parity.mjs, which imports the shipped class and is compared
 * against the original XGBoost booster by scripts/verify_parity.py.
 *
 * The distinction is the whole reason this file exists. This traversal used to
 * live inside verify-parity.mjs, where its agreement with Python was reported as
 * browser parity. It never was. Separated and relabelled rather than deleted,
 * because an independent reading of the artifact is genuinely useful evidence --
 * just evidence about a different thing.
 *
 *   node --experimental-strip-types --test scripts/tests/export-format.test.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

import { PeptideMHCPredictor } from "../../shared/pmhc-predictor.ts";

const here = dirname(fileURLToPath(import.meta.url));
const models = join(here, "..", "..", "client", "public", "models");
const model = JSON.parse(readFileSync(join(models, "pmhc_model.json"), "utf8"));
const alleles = JSON.parse(readFileSync(join(models, "pmhc_alleles.json"), "utf8"));
const predictor = new PeptideMHCPredictor(model, alleles);

const { alphabet, peptideLength, alleleLength, nFeatures, pseudoSequences } = alleles;
const index = Object.fromEntries([...alphabet].map((aa, i) => [aa, i]));
const A = alphabet.length;

/** Minimal encoder, written from the format alone rather than shared with the app. */
function encode(peptide, allele) {
  const x = new Float32Array(nFeatures);
  const put = (offset, seq, length) => {
    for (let i = 0; i < Math.min(seq.length, length); i++) {
      const j = index[seq[i]];
      if (j !== undefined) x[offset + i * A + j] = 1;
    }
  };
  put(0, peptide.toUpperCase(), peptideLength);
  const pseudo = pseudoSequences[allele];
  if (pseudo !== undefined) put(peptideLength * A, pseudo, alleleLength);
  return x;
}

/** Minimal traversal. float32 accumulation mirrors XGBoost's own summation. */
function margin(x) {
  let sum = model.baseMargin;
  for (const t of model.trees) {
    let n = 0;
    while (t.l[n] !== -1) n = x[t.f[n]] < t.c[n] ? t.l[n] : t.r[n];
    sum = Math.fround(sum + t.c[n]);
  }
  return sum;
}

const probability = (peptide, allele) => 1 / (1 + Math.exp(-margin(encode(peptide, allele))));

test("artifact declares the fields a consumer needs", () => {
  for (const key of ["objective", "baseMargin", "nFeatures", "nTrees", "trees"]) {
    assert.ok(key in model, `missing top-level field: ${key}`);
  }
  assert.equal(model.objective, "binary:logistic");
  assert.equal(model.trees.length, model.nTrees);
  assert.equal(model.nFeatures, alleles.nFeatures, "model and encoding disagree on feature count");
});

test("every tree is internally consistent", () => {
  for (const [i, t] of model.trees.entries()) {
    const n = t.l.length;
    for (const arr of ["r", "f", "c", "d"]) {
      assert.equal(t[arr].length, n, `tree ${i}: array ${arr} has a different length to l`);
    }
    for (let k = 0; k < n; k++) {
      if (t.l[k] === -1) continue; // leaf: c[k] holds the leaf value, not a split
      assert.ok(t.l[k] > 0 && t.l[k] < n, `tree ${i} node ${k}: left child out of range`);
      assert.ok(t.r[k] > 0 && t.r[k] < n, `tree ${i} node ${k}: right child out of range`);
      assert.ok(t.f[k] >= 0 && t.f[k] < model.nFeatures, `tree ${i} node ${k}: feature out of range`);
    }
  }
});

test("independent traversal reproduces the shipped predictor", () => {
  // Same deterministic generator as verify-parity.mjs, so the two cover the
  // same inputs and a divergence is attributable rather than mysterious.
  const AAs = "ACDEFGHIKLMNPQRSTVWY";
  let seed = 12345;
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  let worst = 0;
  let total = 0;
  let count = 0;
  for (const allele of Object.keys(pseudoSequences).sort()) {
    for (const len of [8, 9, 10, 11]) {
      let peptide = "";
      for (let i = 0; i < len; i++) peptide += AAs[Math.floor(rand() * AAs.length)];
      const d = Math.abs(probability(peptide, allele) - predictor.predict(peptide, allele).probability);
      worst = Math.max(worst, d);
      total += d;
      count += 1;
    }
  }

  // Exact equality is expected: both read the same arrays and both round in
  // float32. A tolerance is allowed only for IEEE ordering effects, which is why
  // it is far tighter than the 1e-6 used against Python.
  console.log(`    export-format vs runtime: max ${worst.toExponential(3)}, mean ${(total / count).toExponential(3)} over ${count} pairs`);
  assert.ok(worst < 1e-12, `export traversal diverges from the shipped predictor: max ${worst}`);
});
