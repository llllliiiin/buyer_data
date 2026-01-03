import os
import shutil
import pandas as pd
import json

# # ========================
# # 1️⃣ パス設定
# # ========================
# downloads_dir = r"C:/Users/お客様/Downloads"
project_dir = r"E:\CODE\FOR WORK\JapanMapProject (2)\JapanMapProject"

# # 元のファイル名
# local_data_orig = "充足率マップ - data9月.csv"
# flow_data_orig = "充足率マップ - 移動データ9月.csv"

# 新しいファイル名
local_data_new = "local_data_9.csv"
flow_data_new = "flow_data_9.csv"

# # ========================
# # 2️⃣ 既存ファイルがあれば削除
# # ========================
# for file_name in [local_data_new, flow_data_new]:
#     file_path = os.path.join(project_dir, file_name)
#     if os.path.exists(file_path):
#         os.remove(file_path)
#         print(f"{file_name} を削除しました。")

# # ========================
# # 3️⃣ ファイルを移動してリネーム
# # ========================
# shutil.move(os.path.join(downloads_dir, local_data_orig),
#             os.path.join(project_dir, local_data_new))
# shutil.move(os.path.join(downloads_dir, flow_data_orig),
#             os.path.join(project_dir, flow_data_new))
# print("ファイルを移動してリネームしました。")

# ========================
# 4️⃣ local_data_9.csv を読み込んで data_9.js を生成
# ========================
csv_file = os.path.join(project_dir, local_data_new)
df = pd.read_csv(csv_file)

# 列名を統一
df = df.rename(columns={
    "日付": "date",
    "都道府県": "pref",
    "アポ数": "actual",
    "キャパ数": "forecast",
    "比率": "rate"
})

# df["rate"] = df["rate"].replace('%','', regex=True).astype(float) / 100

# リスト辞書に変換
data_list = df.to_dict(orient="records")

# data.js を生成
with open(os.path.join(project_dir, "data_9.js"), "w", encoding="utf-8") as f:
    f.write("// data_9.js 自動生成\n")
    f.write("const data_9 = ")
    json.dump(data_list, f, ensure_ascii=False, indent=2)
    f.write(";")

print("data_9.js を生成/更新完了しました！")

# ========================
# 5️⃣ flow_data_9.csv を読み込んで flow_data_9.js を生成
# ========================
flow_csv = os.path.join(project_dir, flow_data_new)
df_flow = pd.read_csv(flow_csv)

# 列名を統一
df_flow = df_flow.rename(columns={
    "date": "date",
    "from": "from",
    "to": "to",
    "number": "number"
})

flow_list = df_flow.to_dict(orient="records")

with open(os.path.join(project_dir, "flow_data_9.js"), "w", encoding="utf-8") as f:
    f.write("// flow_data_9.js 自動生成\n")
    f.write("const flow_data_9 = ")
    json.dump(flow_list, f, ensure_ascii=False, indent=2)
    f.write(";")

print("flow_data_9.js を生成/更新完了しました！")
