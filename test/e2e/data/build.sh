#!/usr/bin/env bash
# Rebuilds the walk-file fixtures from their GFAs with gfa-to-tabix 4.0, in
# walk format 7. Usage: test/e2e/data/build.sh <gfa-to-tabix binary> <hprc-chrM.GRCh38.gfa>
# The chrM GFA is graph-walks' test_data/hprc-chrM.GRCh38.gfa, the graph
# hprc-chrM.gbz.db holds.
set -euo pipefail
B=$(realpath "${1:?the gfa-to-tabix binary}")
CHRM=$(realpath "${2:?the hprc-chrM GFA}")
cd "$(dirname "$0")"
EXAMPLES=../../../examples
build() {
  local name=$1 gfa=$2; shift 2
  "$B" "$gfa" --walks -o "$name.tmp" "$@" > /dev/null 2>&1
  local out
  for out in "$name".tmp.*.walks.gz; do
    local sample=${out#"$name".tmp.}; sample=${sample%.walks.gz}
    mv "$out" "$name.$sample.walks.gz"
    mv "$out.idx" "$name.$sample.walks.gz.idx"
  done
}
build hprc-chrM "$CHRM" --refs GRCh38 --tile 65536
build ecoli_pggb "$EXAMPLES/ecoli_pggb_subgraph.gfa" --refs K12 --tile 65536
build ecoli_pggb_abridged "$EXAMPLES/ecoli_pggb_subgraph.gfa" --refs K12 --tile 65536 --abridge-steps 20
build stepless stepless.REF.gfa --refs REF --tile 1000
