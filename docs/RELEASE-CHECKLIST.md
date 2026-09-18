# Release Checklist

This checklist prepares the repository for a public static-site release. It is
documentation only; **do not run the publish commands until an operator
approves** the exact branch, preview, target project, and custom-domain change.

## Release candidate gate

From the intended release commit:

```bash
git status --short
npm ci
npm run check
node --experimental-strip-types --test "scripts/tests/*.test.mjs"
npm run build
```

The working tree must be clean and all commands must exit zero. Review the
resulting `dist/public` bundle and confirm that `/models/pmhc_model.json` and
`/models/pmhc_alleles.json` resolve as static assets rather than the SPA shell.

## Human review gate

- Confirm the release UI is the intended light/dark workbench, not an older
  deployment.
- Run one known pair and one wrong-allele control; confirm the research-only
  notice and raw-score caveat remain visible.
- Run a small batch with FASTA headers containing explicit HLA labels; verify
  those labels remain paired through output.
- Read [MODEL-CARD.md](MODEL-CARD.md) and [REPRODUCIBILITY.md](REPRODUCIBILITY.md)
  from the candidate branch and confirm no public claim exceeds their scope.
- Confirm the Vercel project and domain mapping before modifying DNS. A preview
  URL is not a custom-domain cutover.

## Operator-approved publish sequence

After the gates above and explicit approval, publish the reviewed commit to the
canonical branch, let the configured static host build it, then verify the
production deployment by exact commit and direct asset requests. Only after
that verification should the custom domain be pointed at the production host.

Record the deployed commit, deployment URL, asset checks, and domain result in
the release notes. Do not make DNS changes as a substitute for a verified build.
