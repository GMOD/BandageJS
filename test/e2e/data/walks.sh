#!/usr/bin/env bash
# Rebuilds the walk-file fixtures, walk format 6, with gfa-to-tabix 3.0 or later.
# Usage: test/e2e/data/walks.sh <gfa-to-tabix binary> <hprc-chrM.GRCh38.gfa>
# The chrM GFA is graph-walks' test_data/hprc-chrM.GRCh38.gfa, the graph
# hprc-chrM.gbz.db holds.
set -euo pipefail
B=$(realpath "${1:?the gfa-to-tabix binary}")
CHRM=$(realpath "${2:?the hprc-chrM GFA}")
cd "$(dirname "$0")"
EXAMPLES=../../../examples
build() {
  local name=$1 gfa=$2
  shift 2
  "$B" "$gfa" --walks -o "$name.tmp" "$@" >/dev/null 2>&1
  local out sample
  for out in "$name".tmp.*.walks.bed.gz; do
    sample=${out#"$name".tmp.}
    sample=${sample%.walks.bed.gz}
    mv "$out" "$name.$sample.walks.bed.gz"
    mv "$out.tbi" "$name.$sample.walks.bed.gz.tbi"
  done
}
build hprc-chrM "$CHRM" --refs GRCh38
build ecoli_pggb "$EXAMPLES/ecoli_pggb_subgraph.gfa" --refs K12
build ecoli_pggb_abridged "$EXAMPLES/ecoli_pggb_subgraph.gfa" --refs K12 --abridge-steps 20
build stepless stepless.REF.gfa --refs REF --chunk 1000
