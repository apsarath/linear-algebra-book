"""Compile every figures/<chapter>/<name>.tex (a bare tikzpicture) to public/figures/<chapter>/<name>.svg.

Goes through DVI with TikZ's dvisvgm driver, so Ghostscript is not needed.

Usage: python3 scripts/build_figures.py [--force]
Only figures whose .tex (or the shared preamble) changed since the last build are recompiled.
"""

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIG_SRC = ROOT / "figures"
FIG_OUT = ROOT / "public" / "figures"
PREAMBLE = FIG_SRC / "preamble.tex"

WRAPPER = r"""\def\pgfsysdriver{{pgfsys-dvisvgm.def}}
\documentclass[border=4pt]{{standalone}}
\input{{{preamble}}}
\begin{{document}}
\input{{{figure}}}
\end{{document}}
"""


def build(tex: Path, svg: Path, workdir: Path) -> None:
    doc = workdir / f"{tex.stem}.tex"
    doc.write_text(WRAPPER.format(preamble=PREAMBLE.as_posix(), figure=tex.as_posix()))
    result = subprocess.run(
        ["latex", "-interaction=nonstopmode", "-halt-on-error", doc.name],
        cwd=workdir, capture_output=True, text=True,
    )
    if result.returncode != 0:
        log = result.stdout[-3000:]
        raise RuntimeError(f"latex failed for {tex.relative_to(ROOT)}:\n{log}")
    svg.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["dvisvgm", "--no-fonts", "--optimize", f"--output={svg}", f"{tex.stem}.dvi"],
        cwd=workdir, check=True, capture_output=True,
    )


def main() -> None:
    force = "--force" in sys.argv
    sources = sorted(p for p in FIG_SRC.glob("*/*.tex"))
    built = 0
    with tempfile.TemporaryDirectory() as tmp:
        workdir = Path(tmp)
        for tex in sources:
            svg = FIG_OUT / tex.parent.name / f"{tex.stem}.svg"
            stale = (
                force
                or not svg.exists()
                or svg.stat().st_mtime < max(tex.stat().st_mtime, PREAMBLE.stat().st_mtime)
            )
            if not stale:
                continue
            build(tex, svg, workdir)
            built += 1
            print(f"built {svg.relative_to(ROOT)}")
    print(f"{built} figure(s) rebuilt, {len(sources) - built} up to date")


if __name__ == "__main__":
    if shutil.which("latex") is None or shutil.which("dvisvgm") is None:
        sys.exit("latex and dvisvgm are required (both ship with TeX Live)")
    main()
