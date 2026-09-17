export type PredictionHistoryRecord = {
  sequence: string;
  mhcAllele?: string | null;
  probability: number;
  model: string;
  computeTime: number;
  createdAt?: string | null;
};

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Serialize the records this browser actually retained, without inventing metadata it lacks. */
export function predictionHistoryCsv(predictions: PredictionHistoryRecord[]): string {
  const rows = predictions.map((prediction) =>
    [
      prediction.sequence,
      prediction.mhcAllele,
      prediction.probability.toFixed(4),
      prediction.model,
      prediction.computeTime,
      prediction.createdAt,
    ]
      .map(csvCell)
      .join(","),
  );

  return ["peptide,allele,raw_binding_score,model,compute_seconds,created_at", ...rows].join("\n");
}

export function downloadPredictionHistory(predictions: PredictionHistoryRecord[]): void {
  if (predictions.length === 0) return;

  const url = URL.createObjectURL(
    new Blob([predictionHistoryCsv(predictions)], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "peptide-mhc-local-predictions.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
