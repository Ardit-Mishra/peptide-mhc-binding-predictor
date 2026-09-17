const AA_ONLY = /^[ACDEFGHIKLMNPQRSTVWY]+$/;
const HLA_IN_FASTA_HEADER = /HLA-[A-Z0-9]+\*\d{2}:\d{2}/i;

export type ParsedBatchRow = {
  peptide: string;
  allele: string;
  usedFallback: boolean;
};

export type ParsedBatchInput = {
  entries: ParsedBatchRow[];
  invalid: string[];
  badLength: string[];
};

function isColumnHeader(fields: string[]): boolean {
  const [first = "", second = ""] = fields.map((field) => field.trim().toLowerCase());
  return (first === "sequence" || first === "peptide") &&
    ["allele", "mhc_allele", "mhcallele", "hla_allele"].includes(second);
}

/**
 * Parse pasted peptide/allele pairs without inventing a pairing.
 *
 * Plain rows are `PEPTIDE` or `PEPTIDE,ALLELE` (comma, tab, or semicolon).
 * FASTA records are also accepted: a canonical `HLA-X*00:00` in the header is
 * applied to that record, and wrapped sequence lines are joined. A FASTA header
 * without an HLA value remains an explicit fallback row, surfaced by the UI.
 */
export function parseBatchInput(raw: string, fallbackAllele: string): ParsedBatchInput {
  const entries: ParsedBatchRow[] = [];
  const invalid: string[] = [];
  const badLength: string[] = [];
  let fastaAllele = "";
  let fastaSequence: string[] = [];
  let inFastaRecord = false;

  const add = (rawPeptide: string, rawAllele: string, label = rawPeptide) => {
    const peptide = rawPeptide.replace(/\s+/g, "").toUpperCase();
    const allele = rawAllele.toUpperCase() || fallbackAllele;

    if (!AA_ONLY.test(peptide)) {
      invalid.push(label.trim());
    } else if (peptide.length < 8 || peptide.length > 11) {
      badLength.push(peptide);
    } else {
      entries.push({ peptide, allele, usedFallback: rawAllele === "" });
    }
  };

  const flushFastaRecord = () => {
    if (fastaSequence.length > 0) add(fastaSequence.join(""), fastaAllele);
    fastaSequence = [];
    fastaAllele = "";
  };

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith(">")) {
      flushFastaRecord();
      inFastaRecord = true;
      fastaAllele = trimmed.match(HLA_IN_FASTA_HEADER)?.[0]?.toUpperCase() ?? "";
      continue;
    }

    if (inFastaRecord) {
      fastaSequence.push(trimmed);
      continue;
    }

    const fields = trimmed.split(/[,;\t]/).map((field) => field.trim());
    if (isColumnHeader(fields)) continue;
    add(fields[0] ?? "", fields[1] ?? "", trimmed);
  }
  flushFastaRecord();

  return { entries, invalid, badLength };
}
