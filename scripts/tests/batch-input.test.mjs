import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { parseBatchInput } from "../../client/src/lib/batch-input.ts";

const FALLBACK = "HLA-A*02:01";

test("batch input preserves an allele declared in a FASTA header", () => {
  const parsed = parseBatchInput(
    ">CMV epitope | HLA-B*07:02 | source note\nFPRP\nWLHGL\n",
    FALLBACK,
  );

  assert.deepEqual(parsed, {
    entries: [{ peptide: "FPRPWLHGL", allele: "HLA-B*07:02", usedFallback: false }],
    invalid: [],
    badLength: [],
  });
});

test("batch input skips conventional CSV headings while retaining the peptide-allele pair", () => {
  const parsed = parseBatchInput(
    "sequence,mhc_allele,binding_affinity\nGILGFVFTL,HLA-A*02:01,0.89\n",
    "HLA-B*07:02",
  );

  assert.deepEqual(parsed.entries, [
    { peptide: "GILGFVFTL", allele: "HLA-A*02:01", usedFallback: false },
  ]);
  assert.deepEqual(parsed.invalid, []);
  assert.deepEqual(parsed.badLength, []);
});

test("batch input makes an allele-less row an explicit fallback", () => {
  const parsed = parseBatchInput("nlvpmvatv\n", FALLBACK);
  assert.deepEqual(parsed.entries, [
    { peptide: "NLVPMVATV", allele: FALLBACK, usedFallback: true },
  ]);
});

test("batch input refuses malformed and unsupported-length records", () => {
  const parsed = parseBatchInput(">bad | HLA-A*02:01\nGILG!VFTL\n>long\nGILGFVFTLKQQ\n", FALLBACK);
  assert.deepEqual(parsed.entries, []);
  assert.deepEqual(parsed.invalid, ["GILG!VFTL"]);
  assert.deepEqual(parsed.badLength, ["GILGFVFTLKQQ"]);
});

test("the shipped FASTA sample keeps the allele declared by every record", () => {
  const raw = readFileSync(new URL("../../sample_peptide_dataset.fasta", import.meta.url), "utf8");
  const declaredAlleles = [...raw.matchAll(/^>.*?(HLA-[A-Z0-9]+\*\d{2}:\d{2})/gim)]
    .map((match) => match[1].toUpperCase());
  const parsed = parseBatchInput(raw, FALLBACK);

  assert.equal(parsed.invalid.length, 0);
  assert.equal(parsed.badLength.length, 0);
  assert.equal(parsed.entries.length, declaredAlleles.length);
  assert.deepEqual(parsed.entries.map((entry) => entry.allele), declaredAlleles);
  assert.equal(parsed.entries.some((entry) => entry.usedFallback), false);
});
