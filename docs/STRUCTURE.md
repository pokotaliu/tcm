# 中醫證素辨證資料庫 - 資料結構總覽

## 目錄結構

```
tcm/
├── data/                       # 核心資料
│   ├── zhengsu/               # 證素資料
│   │   ├── _schema.json       # 證素結構定義
│   │   ├── qi_xu.json         # 氣虛
│   │   ├── qi_xian.json       # 氣陷
│   │   ├── qi_tuo.json        # 氣脫
│   │   └── ...                # 其他證素
│   │
│   ├── zhengxing/             # 證型資料
│   │   ├── _schema.json       # 證型結構定義
│   │   ├── qixuzheng.json     # 氣虛證
│   │   ├── zhongqixiaxian.json# 中氣下陷證
│   │   ├── qituozheng.json    # 氣脫證
│   │   └── ...                # 其他證型
│   │
│   ├── herbs/                 # 中藥資料
│   │   ├── _schema.json       # 中藥結構定義
│   │   ├── mahuang.json       # 麻黃
│   │   ├── huangqi.json       # 黃耆
│   │   └── ...                # 其他中藥
│   │
│   ├── formulas/              # 方劑資料
│   │   ├── _schema.json       # 方劑結構定義
│   │   ├── buzhongyiqi_tang.json # 補中益氣湯
│   │   └── ...                # 其他方劑
│   │
│   ├── symptoms/              # 症狀資料
│   │   ├── _schema.json       # 症狀結構定義
│   │   ├── fali.json          # 乏力
│   │   └── ...                # 其他症狀
│   │
│   ├── diseases/              # 疾病資料
│   │   ├── _schema.json       # 疾病結構定義
│   │   ├── ganmao.json        # 感冒
│   │   └── ...                # 其他疾病
│   │
│   └── cases/                 # 醫案資料
│       ├── _schema.json       # 醫案結構定義
│       └── case_001.json      # 範例醫案
│
├── js/                        # 前端腳本
│   ├── app.js                 # 首頁邏輯
│   ├── zhengsu.js             # 證素總覽頁
│   ├── zhengxing.js           # 證型查詢頁
│   ├── herbs.js               # 中藥查詢頁
│   ├── formulas.js            # 方劑分析頁
│   └── admin.js               # 資料管理頁
│
├── css/
│   └── style.css              # 全站樣式
│
├── tools/                     # 工具腳本
│   └── query_herbs.py         # 中藥查詢工具
│
├── docs/                      # 文件
│   ├── CHANGELOG.md           # 開發日誌
│   └── STRUCTURE.md           # 本文件
│
├── index.html                 # 首頁
├── zhengsu.html               # 證素總覽
├── zhengxing.html             # 證型查詢
├── herbs.html                 # 中藥查詢
├── formulas.html              # 方劑分析
├── admin.html                 # 資料管理
├── README.md                  # 專案說明
└── CLAUDE.md                  # 開發規範
```

---

## 資料關聯圖

```
                              ┌─────────────┐
                              │    疾病     │
                              │  diseases   │
                              └──────┬──────┘
                                     │ 常見證型
                                     ▼
┌─────────────┐              ┌─────────────┐              ┌─────────────┐
│    症狀     │◄────────────│    證型     │─────────────►│    方劑     │
│  symptoms   │  相關症狀    │  zhengxing  │  推薦方劑    │  formulas   │
└──────┬──────┘              └──────┬──────┘              └──────┬──────┘
       │                            │                            │
       │ 相關證素                   │ 證素組成                   │ 組成藥物
       ▼                            ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                證素                                      │
│                              zhengsu                                     │
│  ┌─────────────────────────┐    ┌─────────────────────────────────────┐ │
│  │      病位證素（19）      │    │          病性證素（34）             │ │
│  │  心肝脾肺腎胃膽表經絡... │    │  氣虛氣陷氣脫血虛血瘀陰虛陽虛風寒...│ │
│  └─────────────────────────┘    └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
       ▲                                                         ▲
       │ 歸經/禁忌                                              │ 功效證素
       │                                                         │
┌──────┴──────┐                                          ┌──────┴──────┐
│    中藥     │◄─────────────────────────────────────────│    中藥     │
│   herbs     │                                          │   herbs     │
└─────────────┘                                          └─────────────┘
```

---

## 核心關聯說明

### 1. 證素 → 證型（組合關係）

證型由一個或多個證素組合而成：

| 證型 | 病位證素 | 病性證素 |
|------|----------|----------|
| 氣虛證 | - | 氣虛 |
| 肺氣虛證 | 肺 | 氣虛 |
| 中氣下陷證 | 脾 | 氣虛 + 氣陷 |
| 氣脫證 | - | 氣脫 |
| 脾腎陽虛證 | 脾 + 腎 | 陽虛 |

### 2. 證型 → 證型（演變關係）

證型之間的演變關係 = 證素的增減：

```
氣虛證 [氣虛]
   │
   │ +氣陷 +脾
   ▼
中氣下陷證 [脾 + 氣虛 + 氣陷]
   │
   │ 惡化
   ▼
氣脫證 [氣脫]
   │
   ├─ +陰竭 ──→ 亡陰證 [亡陰]
   │
   └─ +陽竭 ──→ 亡陽證 [亡陽]
```

### 3. 中藥 → 證素（功效關係）

每味中藥的功效對應特定的證素組合：

```json
// 黃耆的功效
{
  "functions": [
    {
      "treatment": "補氣",
      "zhengsu": ["pi", "qi_xu"],      // 脾 + 氣虛
      "manifestations": ["乏力", "食少", "便溏"]
    },
    {
      "treatment": "升提",
      "zhengsu": ["pi", "qi_xian"],    // 脾 + 氣陷
      "prerequisite": "重用，配升麻、柴胡",
      "manifestations": ["久瀉脫肛", "子宮下垂"]
    }
  ]
}
```

### 4. 方劑 → 證素（權重分析）

方劑的證素權重由組成藥物計算得出：

```json
// 補中益氣湯的權重
{
  "calculated_weights": {
    "treatment": { "補氣": 7.5, "升提": 2.0 },
    "location": { "pi": 8.75, "fei": 5.5 },
    "nature": { "qi_xu": 7.5, "qi_xian": 2.0 }
  },
  "primary_zhengsu": ["pi", "qi_xu", "qi_xian"]
}
```

### 5. 症狀 → 證素（診斷權重）

每個症狀關聯到可能的證素組合及其權重：

```json
// 乏力症狀
{
  "related_zhengsu": [
    {"zhengsu_ids": ["qi_xu"], "weight": "高"},
    {"zhengsu_ids": ["pi", "qi_xu"], "weight": "高"},
    {"zhengsu_ids": ["xue_xu"], "weight": "中"},
    {"zhengsu_ids": ["yang_xu"], "weight": "中"},
    {"zhengsu_ids": ["shi"], "weight": "低"}
  ]
}
```

---

## 證素分類完整列表

### 病位證素（19項）

| 子類別 | 證素 | ID |
|--------|------|-----|
| 五臟 | 心、肝、脾、肺、腎 | xin, gan, pi, fei, shen |
| 六腑 | 胃、膽、小腸、大腸、膀胱 | wei, dan, xiaochang, dachang, pangguang |
| 特殊 | 胞宮、精室 | baogong, jingshi |
| 部位 | 胸膈、少腹 | xiongge, shaofu |
| 表裡 | 表、半表半裡 | biao, banbiaobanli |
| 形體 | 肌膚、經絡、筋骨 | jifu, jingluo, jingu |

### 病性證素（34項）

| 子類別 | 證素 | ID | 治法 | 危重 |
|--------|------|-----|------|------|
| 氣機病變 | 氣虛 | qi_xu | 補氣 | |
| | 氣滯 | qi_zhi | 行氣 | |
| | 氣逆 | qi_ni | 降氣 | |
| | 氣陷 | qi_xian | 升提 | |
| | 氣閉 | qi_bi | 開閉 | ⚠️ |
| | 不固 | bu_gu | 收攝 | |
| | 氣脫 | qi_tuo | 固脫 | ⚠️ |
| 血液病變 | 血虛 | xue_xu | 補血 | |
| | 血瘀 | xue_yu | 活血 | |
| | 血熱 | xue_re | 涼血 | |
| | 血寒 | xue_han | 溫經 | |
| | 動血 | dong_xue | 止血 | |
| 陰陽病變 | 陰虛 | yin_xu | 滋陰 | |
| | 陽虛 | yang_xu | 溫陽 | |
| | 陽亢 | yang_kang | 平肝潛陽 | |
| | 陽浮 | yang_fu | 引火歸元 | |
| | 亡陰 | wang_yin | 救陰 | ⚠️ |
| | 亡陽 | wang_yang | 回陽 | ⚠️ |
| 外邪 | 風 | feng | 祛風 | |
| | 寒 | han | 散寒 | |
| | 暑 | shu | 清暑 | |
| | 濕 | shi | 化濕 | |
| | 燥 | zao | 潤燥 | |
| | 火 | huo | 瀉火 | |
| | 毒 | du | 解毒 | |
| 病理產物 | 痰 | tan | 化痰 | |
| | 飲 | yin | 化飲 | |
| | 水停 | shui_ting | 利水 | ⚠️ |
| | 膿 | nong | 排膿 | |
| | 食積 | shi_ji | 消食 | |
| | 蟲積 | chong_ji | 驅蟲 | |
| 精津病變 | 津虧 | jin_kui | 生津 | |
| | 精虧 | jing_kui | 填精 | |
| 內生病邪 | 動風 | dong_feng | 熄風 | |

---

## 命名規範

### 檔案命名

- 使用拼音小寫
- 多個詞用底線連接
- 例：`qi_xu.json`, `zhong_qi_xia_xian.json`

### ID 命名

- 證素 ID：`qi_xu`, `xue_yu`, `feng`
- 證型 ID：`qi_xu_zheng`, `zhong_qi_xia_xian`, `fei_qi_xu`
- 中藥 ID：`ma_huang`, `huang_qi`
- 方劑 ID：`buzhongyiqi_tang`, `sijunzi_tang`
- 症狀 ID：`symptom_fali`, `symptom_qiduan`
- 疾病 ID：`disease_ganmao`

---

## 擴充指南

### 新增證素

1. 在 `data/zhengsu/` 建立 JSON 檔案
2. 遵循 `_schema.json` 結構
3. 更新 `js/app.js` 和 `js/zhengsu.js` 中的 `ZHENGSU_CONFIG`

### 新增證型

1. 在 `data/zhengxing/` 建立 JSON 檔案
2. 遵循 `_schema.json` 結構
3. 更新 `js/zhengxing.js` 中的 `ZHENGXING_FILES`
4. 確保雙向關聯：
   - `evolved_from` 和 `can_evolve_to` 需雙向填寫
   - `differentiation` 需在兩個證型中都記錄

### 新增中藥

1. 在 `data/herbs/` 建立 JSON 檔案
2. 遵循 `_schema.json` 結構
3. 更新 `js/herbs.js` 中的 `HERB_FILES`

### 新增方劑

1. 在 `data/formulas/` 建立 JSON 檔案
2. 遵循 `_schema.json` 結構
3. 更新 `js/formulas.js` 中的 `FORMULA_FILES`
