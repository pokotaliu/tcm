# 中醫證素辨證資料庫 - 開發日誌

## 專案概述

本資料庫以「證素」為核心架構，將傳統中醫的證型拆解為原子化的病理單位（證素），並建立證素、證型、中藥、方劑、症狀、疾病之間的關聯網絡。

### 核心概念

- **證素**：病理狀態的最小單位（原子）
  - 病位證素：心、肝、脾、肺、腎、表、經絡...
  - 病性證素：氣虛、氣陷、氣脫、血虛、陰虛、陽虛、風、寒、濕...
- **證型**：證素的組合（分子）
  - 例：脾氣虛證 = 脾（病位）+ 氣虛（病性）
  - 例：中氣下陷證 = 脾 + 氣虛 + 氣陷
- **演變關係**：證型之間的發展演變 = 證素的增減變化

---

## 更新記錄

### 2024-11-30：氣虛系列證型完整更新

#### 背景
根據《中醫診斷學》教材，完整整理氣虛證、氣陷證（中氣下陷證）、氣脫證三個核心證型的資料。

#### 新增/更新的證素檔案

| 檔案 | 狀態 | 說明 |
|------|------|------|
| `data/zhengsu/qi_xu.json` | ✅ 更新 | 氣虛證素，補充說明 |
| `data/zhengsu/qi_xian.json` | ✅ 更新 | 氣陷證素，補充演變說明 |
| `data/zhengsu/qi_tuo.json` | ✅ 更新 | 氣脫證素（危重） |
| `data/zhengsu/qingyang_busheng.json` | 🆕 新增 | 清陽不升證素（框架） |
| `data/zhengsu/qi_jue.json` | 🆕 新增 | 氣厥證素（實證，框架） |

#### 新增/更新的證型檔案

| 檔案 | 狀態 | 證素組成 | 說明 |
|------|------|----------|------|
| `data/zhengxing/qixuzheng.json` | 🆕 新增 | 氣虛 | 全身性氣虛證 |
| `data/zhengxing/zhongqixiaxian.json` | ✅ 更新 | 脾 + 氣虛 + 氣陷 | 完整臨床變型、類證鑑別、文獻 |
| `data/zhengxing/qituozheng.json` | 🆕 新增 | 氣脫 | 8種臨床變型、4組類證鑑別、5條文獻 |
| `data/zhengxing/shenqibugu.json` | 🆕 新增 | 腎 + 氣虛 + 不固 | 腎氣不固證（框架） |
| `data/zhengxing/qingyangbusheng.json` | 🆕 新增 | 脾 + 氣虛 + 清陽不升 | 清陽不升證（框架） |
| `data/zhengxing/wangyinzheng.json` | 🆕 新增 | 亡陰 | 亡陰證（框架） |
| `data/zhengxing/wangyangzheng.json` | 🆕 新增 | 亡陽 | 亡陽證（框架） |
| `data/zhengxing/qijuezheng.json` | 🆕 新增 | 氣厥 | 氣厥證（實證，框架） |

#### 建立的演變關係

```
氣虛證 ──→ 中氣下陷證 ──→ 腎氣不固證
  │            │
  │            ↓
  │        清陽不升證
  │
  ↓
氣脫證 ──→ 亡陰證
  │
  ↓
       亡陽證

氣厥證（實證）←──鑑別──→ 氣脫證（虛證）
```

#### 建立的類證鑑別關係

- 氣虛證 ↔ 陽虛證
- 氣陷證 ↔ 氣脫證
- 氣陷證 ↔ 清陽不升證
- 氣陷證 ↔ 氣虛證
- 氣陷證 ↔ 腎氣不固證
- 氣脫證 ↔ 亡陰證
- 氣脫證 ↔ 亡陽證
- 氣脫證 ↔ 氣厥證
- 氣脫證 ↔ 中氣下陷證

#### JavaScript 更新

| 檔案 | 說明 |
|------|------|
| `js/zhengxing.js` | 更新證型文件列表、修正選擇器渲染、新增演變關係顯示 |

#### 發現的介面問題

- **問題**：證型查看頁面的證素選擇器標籤渲染失敗（純文字擠在一起）
- **原因**：`renderSelectors()` 函數只輸出文字，未生成 `<span>` 標籤
- **修正**：已在更新的 `js/zhengxing.js` 中修復

---

## 待辦事項

### 高優先

- [ ] 執行上述所有檔案建立指令
- [ ] 驗證證型查看介面功能
- [ ] 補充各「框架」證型的詳細內容

### 中優先

- [ ] 血虛系列證型（血虛證 → 血瘀證 → 出血證）
- [ ] 陰虛系列證型（陰虛證 → 亡陰證）
- [ ] 陽虛系列證型（陽虛證 → 亡陽證）
- [ ] 外感系列證型（風寒表證、風熱表證等）

### 低優先

- [ ] 方劑與證型的雙向關聯
- [ ] 症狀與證素的權重關聯
- [ ] 疾病的證型分布統計

---

## 資料結構參考

### 證型 Schema 關鍵欄位

```json
{
  "id": "zheng_xing_id",
  "name": "證型名稱",
  "alias": ["別名"],
  "zhengsu_composition": {
    "location": ["病位證素ID"],
    "nature": ["病性證素ID"]
  },
  "pathogenesis": "病機概述",
  "symptoms": {
    "main": ["主症"],
    "secondary": ["次症"],
    "tongue": "舌象",
    "pulse": "脈象"
  },
  "treatment_principle": ["治則治法"],
  "recommended_formulas": ["方劑ID"],
  "recommended_herbs": ["中藥ID"],
  "evolved_from": ["來源證型ID"],
  "can_evolve_to": ["可演變證型ID"],
  "differentiate_from": ["需鑑別證型ID"],
  "clinical_variants": [
    {
      "name": "變型名稱",
      "cause": "病因",
      "symptoms": ["症狀"],
      "treatment": "治法",
      "formula": "方劑",
      "formula_source": "出處"
    }
  ],
  "differentiation": [
    {
      "compare_with": "比較證型ID",
      "compare_name": "比較證型名稱",
      "similarities": ["相同點"],
      "differences": {
        "this_pattern": "本證特點",
        "other_pattern": "彼證特點"
      },
      "key_points": ["鑑別要點"]
    }
  ],
  "literature": [
    {
      "source": "出處",
      "quote": "原文"
    }
  ],
  "common_in": ["常見人群"],
  "related_diseases": ["相關疾病ID"]
}
```

### 證素 Schema 關鍵欄位

```json
{
  "id": "zheng_su_id",
  "name": "證素名稱",
  "category": "病位|病性",
  "subcategory": "子類別",
  "treatment": "對應治法（病性證素）",
  "is_critical": false,
  "alias": ["別名"],
  "description": "說明",
  "related_symptoms": ["相關症狀ID"]
}
```

---

## 檔案清單

### 證素檔案 (`data/zhengsu/`)

#### 病位證素（19項）
- 五臟：xin, gan, pi, fei, shen
- 六腑：wei, dan, xiaochang, dachang, pangguang
- 特殊：baogong, jingshi
- 部位：xiongge, shaofu
- 表裡：biao, banbiaobanli
- 形體：jifu, jingluo, jingu

#### 病性證素（34項）
- 氣機病變：qi_xu, qi_zhi, qi_ni, qi_xian, qi_bi, bu_gu, qi_tuo, qingyang_busheng, qi_jue
- 血液病變：xue_xu, xue_yu, xue_re, xue_han, dong_xue
- 陰陽病變：yin_xu, yang_xu, yang_kang, yang_fu, wang_yin, wang_yang
- 外邪：feng, han, shu, shi, zao, huo, du
- 病理產物：tan, yin, shui_ting, nong, shi_ji, chong_ji
- 精津病變：jin_kui, jing_kui
- 內生病邪：dong_feng

### 證型檔案 (`data/zhengxing/`)

| 檔案名 | 證型名稱 | 狀態 |
|--------|----------|------|
| feiqixu.json | 肺氣虛證 | ✅ |
| piqixu.json | 脾氣虛證 | ✅ |
| xinqixu.json | 心氣虛證 | ✅ |
| ganqixu.json | 肝氣虛證 | ✅ |
| shenqixu.json | 腎氣虛證 | ✅ |
| qixuelianxu.json | 氣血兩虛證 | ✅ |
| qixubuning.json | 氣不固攝證 | ✅ |
| zhongqixiaxian.json | 中氣下陷證 | ✅ 更新 |
| qixuzheng.json | 氣虛證 | 🆕 新增 |
| qituozheng.json | 氣脫證 | 🆕 新增 |
| shenqibugu.json | 腎氣不固證 | 🆕 框架 |
| qingyangbusheng.json | 清陽不升證 | 🆕 框架 |
| wangyinzheng.json | 亡陰證 | 🆕 框架 |
| wangyangzheng.json | 亡陽證 | 🆕 框架 |
| qijuezheng.json | 氣厥證 | 🆕 框架 |

---

## 附錄：文獻來源

- 《中醫診斷學》（統編教材）
- 《靈樞》
- 《難經》
- 《金匱要略》
- 《諸病源候論》
- 《景岳全書》
- 《醫宗金鑒》
- 《溫病條辨》
- 《內外傷辨惑論》
- 《臨證指南醫案》
- 《脾胃論》
- 《十藥神書》
- 《婦人良方》
