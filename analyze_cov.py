import xml.etree.ElementTree as ET, glob

files = sorted(glob.glob("TestResults/**/coverage.cobertura.xml", recursive=True))

# per-file (class) stats: {(pkg, filename): [valid, covered]}
file_stats = {}
asm = {}
for f in files:
    root = ET.parse(f).getroot()
    for pkg in root.findall(".//package"):
        pname = pkg.get("name")
        for cls in pkg.findall(".//class"):
            fname = cls.get("filename", "?")
            key = (pname, fname)
            v, c = 0, 0
            for line in cls.findall("lines/line"):
                v += 1
                if int(line.get("hits", 0)) > 0:
                    c += 1
            if key not in file_stats:
                file_stats[key] = [0, 0]
            file_stats[key][0] += v
            file_stats[key][1] += c
        asm.setdefault(pname, [0, 0])
        for v2, c2 in [file_stats[k] for k in file_stats if k[0] == pname]:
            pass  # accumulate below

# Re-aggregate per assembly from file_stats
asm = {}
for (pkg, fname), (v, c) in file_stats.items():
    asm.setdefault(pkg, [0, 0])
    asm[pkg][0] += v
    asm[pkg][1] += c

tv = sum(x[0] for x in asm.values())
tc = sum(x[1] for x in asm.values())
print(f"{'Assembly':<45} {'Valid':>7} {'Covered':>9} {'%':>6}")
print("-" * 72)
for name in sorted(asm):
    v, c = asm[name]
    print(f"{name:<45} {v:>7} {c:>9} {c/v*100 if v else 0:>5.1f}%")
print("-" * 72)
print(f"{'TOTAL':<45} {tv:>7} {tc:>9} {tc/tv*100 if tv else 0:>5.1f}%")
print(f"\nFor 75% overall: need {max(0, int(tv * 0.75 - tc)):,} more lines covered\n")

# Top 30 uncovered files across all assemblies
uncovered = [(v - c, v, c, pkg, fname) for (pkg, fname), (v, c) in file_stats.items() if v > 0]
uncovered.sort(reverse=True)
print(f"{'Top 30 files with most uncovered lines':}")
print(f"{'File':<60} {'Valid':>6} {'Covered':>8} {'%':>6} {'Gap':>6}")
print("-" * 90)
for gap, v, c, pkg, fname in uncovered[:30]:
    short = fname.split("/VexorionERP/")[-1] if "/VexorionERP/" in fname else fname[-55:]
    print(f"{short:<60} {v:>6} {c:>8} {c/v*100 if v else 0:>5.1f}% {gap:>6}")
