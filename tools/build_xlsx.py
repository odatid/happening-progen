# =========================================================
# HAP//GEN — tools/build_xlsx.py
# （コメディ.csvを含む csv/ の全シートを xlsx 化する — 追記不要・globで自動反映）
# 使い方: python3 tools/build_xlsx.py
# =========================================================
import csv, glob, os
from openpyxl import Workbook

ROOT = os.path.join(os.path.dirname(__file__), '..')
CSV_DIR = os.path.join(ROOT, 'csv')
OUT = os.path.join(ROOT, 'happening_db.xlsx')

wb = Workbook()
wb.remove(wb.active)

for f in sorted(glob.glob(os.path.join(CSV_DIR, '*.csv'))):
    name = os.path.splitext(os.path.basename(f))[0][:31]
    ws = wb.create_sheet(title=name)
    with open(f, encoding='utf-8') as fh:
        for row in csv.reader(fh):
            if any(str(c).strip() != '' for c in row):
                ws.append(row)
    print('sheet:', name)

wb.save(OUT)
print('happening_db.xlsx を出力しました')
