import pandas as pd
import json
import os
print( os.getcwd())
print("local_data.csv　存在しますか:", os.path.exists("local_data.csv"))
print("flow_data.csv　存在しますか:", os.path.exists("flow_data.csv"))


csv_file = "local_data.csv"
df = pd.read_csv(csv_file)

# 列名を統一
df = df.rename(columns={
    "日付": "date",
    "都道府県": "pref",
    "アポ数": "actual",
    "キャパ数": "forecast",
    "比率": "rate"
})

# リスト辞書に変換
data_list = df.to_dict(orient="records")

# data.js を生成
with open("data.js", "w", encoding="utf-8") as f:
    f.write("// data.js 自動生成\n")
    f.write("const data = ")
    json.dump(data_list, f, ensure_ascii=False, indent=2)
    f.write(";")

print("data.js を生成/更新完了しました！")


# ========================
# 5️⃣ flow_data.csv を読み込んで flow_data.js を生成
# ========================
flow_csv = "flow_data.csv"
df_flow = pd.read_csv(flow_csv)


df_flow = df_flow.rename(columns={
    "date": "date",
    "from": "from",
    "to": "to",
    "number": "number"
})

flow_list = df_flow.to_dict(orient="records")

with open("flow_data.js", "w", encoding="utf-8") as f:
    f.write("// flow_data.js 自動生成\n")
    f.write("const flow_data = ")
    json.dump(flow_list, f, ensure_ascii=False, indent=2)
    f.write(";")

print("flow_data.js を生成/更新完了しました！")