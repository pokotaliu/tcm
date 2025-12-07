#!/usr/bin/env python3
"""
生成證型-證素對照表 (zhengsu_tagging_table.md)
"""

import json
from pathlib import Path
from collections import defaultdict

# 路徑設定
DATA_DIR = Path(__file__).parent.parent / "data"
SYNDROMES_DIR = DATA_DIR / "zhenghou" / "syndromes"
ZHENGSU_DIR = DATA_DIR / "zhengsu"
ANALYSIS_DIR = DATA_DIR / "analysis"

# 分類順序
CATEGORY_ORDER = [
    "基礎證候",
    "全身證候",
    "臟腑證候",
    "傷寒溫病證候",
    "經絡證候",
    "專科證候"
]


def load_zhengsu_names():
    """載入所有證素的 ID 到名稱對照表"""
    location_names = {}
    nature_names = {}

    for filepath in ZHENGSU_DIR.glob("*.json"):
        if filepath.name.startswith("_"):
            continue
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data.get("category") == "病位":
                    location_names[data["id"]] = data["name"]
                elif data.get("category") == "病性":
                    nature_names[data["id"]] = data["name"]
        except Exception:
            pass

    return location_names, nature_names


def load_all_syndromes():
    """載入所有證候資料"""
    syndromes = []
    for filepath in SYNDROMES_DIR.glob("*.json"):
        if filepath.name.startswith("_"):
            continue
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
                syndromes.append(data)
        except Exception:
            pass

    # 按編號排序
    syndromes.sort(key=lambda x: x.get("number", 9999))
    return syndromes


def format_zhengsu_list(ids, name_map):
    """格式化證素列表為可讀字串"""
    if not ids:
        return "-"
    names = [name_map.get(id, id) for id in ids]
    return ", ".join(sorted(names))


def generate_table():
    """產生對照表"""
    location_names, nature_names = load_zhengsu_names()
    syndromes = load_all_syndromes()

    # 按分類分組
    by_category = defaultdict(list)
    for s in syndromes:
        cat = s.get("category", "其他")
        by_category[cat].append(s)

    # 產生 Markdown
    lines = ["# 證型-證素對照表", ""]
    lines.append(f"總計 {len(syndromes)} 個證候")
    lines.append("")
    lines.append("---")

    section_num = 0
    category_zh = {
        "基礎證候": "一、基礎證候",
        "全身證候": "二、全身證候",
        "臟腑證候": "三、臟腑證候",
        "傷寒溫病證候": "四、傷寒溫病證候",
        "經絡證候": "五、經絡證候",
        "專科證候": "六、專科證候"
    }

    for cat in CATEGORY_ORDER:
        if cat not in by_category:
            continue
        section_num += 1
        items = by_category[cat]

        lines.append("")
        lines.append(f"## {category_zh.get(cat, cat)}（{len(items)}個）")
        lines.append("")
        lines.append("| 編號 | 證型名稱 | 病位 (location) | 病性 (nature) | 信心度 |")
        lines.append("|------|----------|-----------------|---------------|--------|")

        for s in items:
            num = s.get("number", "?")
            name = s.get("name", "?")
            comp = s.get("zhengsu_composition", {})
            locations = comp.get("location", [])
            natures = comp.get("nature", [])
            confidence = comp.get("confidence", "high")

            loc_str = format_zhengsu_list(locations, location_names)
            nat_str = format_zhengsu_list(natures, nature_names)

            lines.append(f"| {num} | {name} | {loc_str} | {nat_str} | {confidence} |")

    # 處理未分類的
    other_cats = set(by_category.keys()) - set(CATEGORY_ORDER)
    for cat in sorted(other_cats):
        items = by_category[cat]
        lines.append("")
        lines.append(f"## 其他：{cat}（{len(items)}個）")
        lines.append("")
        lines.append("| 編號 | 證型名稱 | 病位 (location) | 病性 (nature) | 信心度 |")
        lines.append("|------|----------|-----------------|---------------|--------|")

        for s in items:
            num = s.get("number", "?")
            name = s.get("name", "?")
            comp = s.get("zhengsu_composition", {})
            locations = comp.get("location", [])
            natures = comp.get("nature", [])
            confidence = comp.get("confidence", "high")

            loc_str = format_zhengsu_list(locations, location_names)
            nat_str = format_zhengsu_list(natures, nature_names)

            lines.append(f"| {num} | {name} | {loc_str} | {nat_str} | {confidence} |")

    lines.append("")
    return "\n".join(lines)


def main():
    """主函數"""
    content = generate_table()

    # 確保目錄存在
    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)

    output_path = ANALYSIS_DIR / "zhengsu_tagging_table.md"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"對照表已產生: {output_path}")


if __name__ == "__main__":
    main()
