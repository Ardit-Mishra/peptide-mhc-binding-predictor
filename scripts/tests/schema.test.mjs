/**
 * Schema tests — malformed input rejection.
 *
 * These import the REAL zod schemas from shared/schema.ts (Node 24+ strips TS
 * types natively, so this runs the app's actual validation code, not a copy
 * of it). See scripts/tests/README.md for how this suite is wired into CI.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  predictRequestSchema,
  mutationRequestSchema,
  batchUploadSchema,
  MODEL_KEYS,
} from "../../shared/schema.ts";

test("schema: accepts a valid 9-mer peptide", () => {
  const r = predictRequestSchema.parse({
    sequence: "GILGFVFTL",
    model: MODEL_KEYS[0],
    mhcAllele: "HLA-A*02:01",
  });
  assert.equal(r.sequence, "GILGFVFTL");
});

test("schema: rejects a peptide shorter than 8 residues", () => {
  assert.throws(() =>
    predictRequestSchema.parse({ sequence: "GILGF", model: MODEL_KEYS[0] }),
  );
});

test("schema: rejects a peptide longer than 11 residues", () => {
  assert.throws(() =>
    predictRequestSchema.parse({ sequence: "GILGFVFTLAAAA", model: MODEL_KEYS[0] }),
  );
});

test("schema: rejects non-amino-acid characters (malformed peptide)", () => {
  for (const bad of ["GILGF9FTL", "GIL-FVFTL", "gilgfvftl!", "SEQ WITH SPACE"]) {
    assert.throws(
      () => predictRequestSchema.parse({ sequence: bad, model: MODEL_KEYS[0] }),
      `expected rejection for ${JSON.stringify(bad)}`,
    );
  }
});

test("schema: rejects a model key that doesn't exist", () => {
  assert.throws(() =>
    predictRequestSchema.parse({ sequence: "GILGFVFTL", model: "cnn_v2" }),
  );
});

test("schema: mutation request rejects a non-standard replacement residue", () => {
  assert.throws(() =>
    mutationRequestSchema.parse({
      sequence: "GILGFVFTL",
      position: 1,
      newAminoAcid: "X",
      model: MODEL_KEYS[0],
    }),
  );
});

test("schema: batch upload requires an allele per peptide, not one for the whole batch", () => {
  assert.throws(() =>
    batchUploadSchema.parse({
      projectId: "p1",
      name: "batch",
      models: [MODEL_KEYS[0]],
      entries: [{ peptide: "GILGFVFTL" }], // no allele on the row
    }),
  );
  const ok = batchUploadSchema.parse({
    projectId: "p1",
    name: "batch",
    models: [MODEL_KEYS[0]],
    entries: [{ peptide: "GILGFVFTL", allele: "HLA-A*02:01" }],
  });
  assert.equal(ok.entries.length, 1);
});

test("schema: batch upload rejects an empty batch", () => {
  assert.throws(() =>
    batchUploadSchema.parse({ projectId: "p1", name: "batch", models: [MODEL_KEYS[0]], entries: [] }),
  );
});
