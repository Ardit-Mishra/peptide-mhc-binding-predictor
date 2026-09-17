import test from "node:test";
import assert from "node:assert/strict";
import { predictionHistoryCsv } from "../../client/src/lib/prediction-export.ts";

test("prediction history CSV preserves browser-local records and escapes fields", () => {
  const csv = predictionHistoryCsv([
    {
      sequence: "GILGFVFTL",
      mhcAllele: "HLA-A*02:01",
      probability: 0.8954,
      model: "xgb_pseudoseq",
      computeTime: 0.001,
      createdAt: "2026-09-17T12:00:00.000Z",
    },
    {
      sequence: "A,PEPTIDE",
      mhcAllele: null,
      probability: 0.5,
      model: "xgb_pseudoseq",
      computeTime: 0,
      createdAt: null,
    },
  ]);

  assert.equal(
    csv,
    [
      "peptide,allele,raw_binding_score,model,compute_seconds,created_at",
      "GILGFVFTL,HLA-A*02:01,0.8954,xgb_pseudoseq,0.001,2026-09-17T12:00:00.000Z",
      '\"A,PEPTIDE\",,0.5000,xgb_pseudoseq,0,',
    ].join("\n"),
  );
});
