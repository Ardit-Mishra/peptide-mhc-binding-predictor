/**
 * Boundary behaviour of the shipped runtime.
 *
 * The parity harness proves the predictor agrees with Python on inputs it is
 * willing to score. This covers the other half: what it does with inputs it
 * should refuse.
 *
 * The refusal matters more than it looks. An allele absent from training has no
 * pseudo-sequence, so all 780 of its allele features (39 residues x 20) encode as
 * all-zero -- and the model
 * will still return a confident-looking probability from the peptide features
 * alone. That number is not a prediction about that allele; it is a prediction
 * about a peptide against a blank. Returning it would be the most plausible-
 * looking wrong answer this system can produce, which is exactly the class of
 * failure worth a test.
 *
 *   node --experimental-strip-types --test scripts/tests/runtime-boundaries.test.mjs
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

const KNOWN = Object.keys(alleles.pseudoSequences).sort()[0];

test("hasAllele distinguishes trained alleles from everything else", () => {
  assert.equal(predictor.hasAllele(KNOWN), true, `${KNOWN} is in the table and should be known`);
  for (const unknown of ["HLA-Z*99:99", "NOT-AN-ALLELE", "", "hla-a*02:01 "]) {
    assert.equal(predictor.hasAllele(unknown), false, `"${unknown}" must not be treated as trained`);
  }
});

test("an unknown allele is flagged, not silently scored as if known", () => {
  // encode() still produces a vector -- the model has a fixed input width -- but
  // alleleKnown is the signal callers must gate on. local-backend.ts refuses the
  // request on this basis rather than returning the number.
  const { alleleKnown } = predictor.encode("SIINFEKL", "HLA-Z*99:99");
  assert.equal(alleleKnown, false);

  const known = predictor.encode("SIINFEKL", KNOWN);
  assert.equal(known.alleleKnown, true);
});

test("an unknown allele leaves the allele half of the vector empty", () => {
  // The concrete reason a score against an unknown allele is meaningless: the
  // allele features are all zero, so the model is reading a blank where the
  // pseudo-sequence should be.
  const { x } = predictor.encode("SIINFEKL", "HLA-Z*99:99");
  const alleleOffset = alleles.peptideLength * alleles.alphabet.length;
  const alleleFeatures = x.slice(alleleOffset);
  assert.equal(alleleFeatures.some((v) => v !== 0), false,
    "unknown allele should contribute no set features");

  const { x: xk } = predictor.encode("SIINFEKL", KNOWN);
  assert.ok(xk.slice(alleleOffset).some((v) => v !== 0),
    "a known allele must set its pseudo-sequence features");
});

test("the constructor rejects a model/encoding feature mismatch", () => {
  // Guards the failure where a retrained model is shipped against a stale allele
  // table. Both would load; every prediction would be quietly wrong.
  assert.throws(
    () => new PeptideMHCPredictor({ ...model, nFeatures: model.nFeatures + 1 }, alleles),
    /Model\/encoding mismatch/,
  );
});

test("peptide length variation stays in range and is deterministic", () => {
  for (const peptide of ["SIINFEK", "SIINFEKL", "SIINFEKLM", "SIINFEKLMN", "SIINFEKLMNPQ"]) {
    const { probability } = predictor.predict(peptide, KNOWN);
    assert.ok(probability >= 0 && probability <= 1, `${peptide}: probability out of range`);
    assert.equal(probability, predictor.predict(peptide, KNOWN).probability,
      `${peptide}: repeated calls must return the same value`);
  }
});
