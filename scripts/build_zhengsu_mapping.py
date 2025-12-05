#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
證素對應建構腳本
建立證素與證型的雙向對應關係
輸出: data/indexes/zhengsu_mapping.json
"""

import json
from pathlib import Path
from typing import Dict, List, Set, Any, Optional, Tuple
from datetime import datetime
from collections import defaultdict


def load_zhengsu_data(data_dir: Path) -> Dict[str, Dict]:
    """載入所有證素資料"""
    zhengsu_data: Dict[str, Dict] = {}

    zhengsu_dir = data_dir / "zhengsu"
    if not zhengsu_dir.exists():
        print(f"警告: 證素目錄不存在: {zhengsu_dir}")
        return zhengsu_data

    for f in zhengsu_dir.glob("*.json"):
        if f.name.startswith("_"):
            continue

        try:
            with open(f, 'r', encoding='utf-8') as fp:
                data = json.load(fp)
        except (json.JSONDecodeError, Exception) as e:
            print(f"警告: 無法讀取 {f}: {e}")
            continue

        if "id" in data:
            zhengsu_data[data["id"]] = data

    return zhengsu_data


def load_zhengxing_data(data_dir: Path) -> Dict[str, Dict]:
    """載入所有證型資料"""
    zhengxing_data: Dict[str, Dict] = {}

    zhengxing_dir = data_dir / "zhengxing"
    if not zhengxing_dir.exists():
        print(f"警告: 證型目錄不存在: {zhengxing_dir}")
        return zhengxing_data

    for f in zhengxing_dir.glob("*.json"):
        if f.name.startswith("_"):
            continue

        try:
            with open(f, 'r', encoding='utf-8') as fp:
                data = json.load(fp)
        except (json.JSONDecodeError, Exception) as e:
            print(f"警告: 無法讀取 {f}: {e}")
            continue

        if "id" in data:
            zhengxing_data[data["id"]] = data

    return zhengxing_data


def build_by_zhengsu(zhengsu_data: Dict[str, Dict], zhengxing_data: Dict[str, Dict]) -> Dict[str, Dict]:
    """建立證素 → 證型的對應"""
    by_zhengsu: Dict[str, Dict] = {}

    # 統計每個證素對應的證型
    zhengsu_to_zhengxing: Dict[str, List[Tuple[str, str, bool]]] = defaultdict(list)

    for zx_id, zx_data in zhengxing_data.items():
        comp = zx_data.get("zhengsu_composition", {})
        zx_name = zx_data.get("name", "")

        # 處理病位證素
        for loc_id in comp.get("location", []):
            # 判斷是否為主要關聯
            is_primary = len(comp.get("nature", [])) <= 2
            zhengsu_to_zhengxing[loc_id].append((zx_id, zx_name, is_primary))

        # 處理病性證素
        for nat_id in comp.get("nature", []):
            # 單一病性證素時為主要關聯
            is_primary = len(comp.get("nature", [])) == 1
            zhengsu_to_zhengxing[nat_id].append((zx_id, zx_name, is_primary))

    # 建立每個證素的對應資料
    for zs_id, zs_data in zhengsu_data.items():
        related = zhengsu_to_zhengxing.get(zs_id, [])

        # 按是否為主要關聯排序
        related.sort(key=lambda x: (0 if x[2] else 1, x[1]))

        related_zhengxing = [
            {
                "id": zx_id,
                "name": zx_name,
                "is_primary": is_primary
            }
            for zx_id, zx_name, is_primary in related
        ]

        by_zhengsu[zs_id] = {
            "name": zs_data.get("name", ""),
            "category": zs_data.get("category", ""),
            "subcategory": zs_data.get("subcategory", ""),
            "treatment": zs_data.get("treatment", ""),
            "related_zhengxing": related_zhengxing
        }

    return by_zhengsu


def build_by_zhengxing(zhengsu_data: Dict[str, Dict], zhengxing_data: Dict[str, Dict]) -> Dict[str, Dict]:
    """建立證型 → 證素的對應"""
    by_zhengxing: Dict[str, Dict] = {}

    for zx_id, zx_data in zhengxing_data.items():
        comp = zx_data.get("zhengsu_composition", {})

        location_ids = comp.get("location", [])
        nature_ids = comp.get("nature", [])

        # 獲取證素名稱
        location_names = [
            zhengsu_data.get(loc_id, {}).get("name", loc_id)
            for loc_id in location_ids
        ]
        nature_names = [
            zhengsu_data.get(nat_id, {}).get("name", nat_id)
            for nat_id in nature_ids
        ]

        # 獲取對應的治法
        treatments = []
        for nat_id in nature_ids:
            treatment = zhengsu_data.get(nat_id, {}).get("treatment", "")
            if treatment:
                treatments.append(treatment)

        by_zhengxing[zx_id] = {
            "name": zx_data.get("name", ""),
            "location": location_ids,
            "location_names": location_names,
            "nature": nature_ids,
            "nature_names": nature_names,
            "combined_treatment": treatments
        }

    return by_zhengxing


def find_combination_patterns(zhengsu_data: Dict[str, Dict], zhengxing_data: Dict[str, Dict]) -> List[Dict]:
    """識別常見的證素組合模式"""
    patterns = []

    # 統計證素組合的出現次數
    combination_counts: Dict[Tuple[str, ...], List[str]] = defaultdict(list)

    for zx_id, zx_data in zhengxing_data.items():
        comp = zx_data.get("zhengsu_composition", {})
        nature_ids = tuple(sorted(comp.get("nature", [])))

        if len(nature_ids) >= 1:
            combination_counts[nature_ids].append(zx_id)

    # 找出出現多次的組合
    for combo, zx_ids in combination_counts.items():
        if len(combo) >= 2 and len(zx_ids) >= 1:
            # 獲取證素名稱
            names = [zhengsu_data.get(zs_id, {}).get("name", zs_id) for zs_id in combo]

            # 獲取治法
            treatments = []
            for zs_id in combo:
                treatment = zhengsu_data.get(zs_id, {}).get("treatment", "")
                if treatment:
                    treatments.append(treatment)

            # 獲取典型證型
            typical = zhengxing_data.get(zx_ids[0], {}).get("name", zx_ids[0])

            pattern = {
                "name": "+".join(names),
                "zhengsu": list(combo),
                "zhengsu_names": names,
                "typical_zhengxing": typical,
                "typical_zhengxing_id": zx_ids[0],
                "treatment": "、".join(treatments),
                "occurrence_count": len(zx_ids)
            }

            patterns.append(pattern)

    # 按出現次數排序
    patterns.sort(key=lambda x: -x["occurrence_count"])

    return patterns[:20]  # 返回前20個常見組合


def build_category_summary(zhengsu_data: Dict[str, Dict]) -> Dict[str, Dict]:
    """建立證素分類摘要"""
    summary: Dict[str, Dict] = {}

    # 按類別和子類別分組
    categories: Dict[str, Dict[str, List[Dict]]] = defaultdict(lambda: defaultdict(list))

    for zs_id, zs_data in zhengsu_data.items():
        category = zs_data.get("category", "未分類")
        subcategory = zs_data.get("subcategory", "其他")

        categories[category][subcategory].append({
            "id": zs_id,
            "name": zs_data.get("name", ""),
            "treatment": zs_data.get("treatment", "")
        })

    for category, subcats in categories.items():
        summary[category] = {
            "subcategories": dict(subcats),
            "total_count": sum(len(items) for items in subcats.values())
        }

    return summary


def build_zhengsu_mapping(data_dir: Path) -> Dict:
    """建立完整的證素對應"""
    print("正在載入證素資料...")
    zhengsu_data = load_zhengsu_data(data_dir)

    print("正在載入證型資料...")
    zhengxing_data = load_zhengxing_data(data_dir)

    print(f"載入了 {len(zhengsu_data)} 個證素, {len(zhengxing_data)} 個證型")

    print("正在建立證素→證型對應...")
    by_zhengsu = build_by_zhengsu(zhengsu_data, zhengxing_data)

    print("正在建立證型→證素對應...")
    by_zhengxing = build_by_zhengxing(zhengsu_data, zhengxing_data)

    print("正在識別組合模式...")
    patterns = find_combination_patterns(zhengsu_data, zhengxing_data)

    print("正在建立分類摘要...")
    category_summary = build_category_summary(zhengsu_data)

    # 構建最終對應
    mapping = {
        "version": "1.0",
        "generated_at": datetime.now().strftime("%Y-%m-%d"),
        "description": "證素與證型的雙向對應關係，支援證素篩選功能",
        "by_zhengsu": by_zhengsu,
        "by_zhengxing": by_zhengxing,
        "combination_patterns": {
            "description": "常見的證素組合模式",
            "patterns": patterns
        },
        "category_summary": category_summary,
        "statistics": {
            "total_zhengsu": len(zhengsu_data),
            "total_zhengxing": len(zhengxing_data),
            "zhengsu_with_related": sum(
                1 for zs in by_zhengsu.values()
                if zs.get("related_zhengxing")
            ),
            "combination_patterns": len(patterns)
        }
    }

    return mapping


def main():
    """主函數"""
    import argparse

    parser = argparse.ArgumentParser(description="建立證素-證型對應")
    parser.add_argument(
        "--data-dir",
        default="data",
        help="資料目錄路徑 (預設: data)"
    )
    parser.add_argument(
        "--output",
        default="data/indexes/zhengsu_mapping.json",
        help="輸出檔案路徑"
    )

    args = parser.parse_args()

    # 確定資料目錄
    script_dir = Path(__file__).parent
    data_dir = script_dir.parent / args.data_dir
    output_path = script_dir.parent / args.output

    if not data_dir.exists():
        print(f"錯誤: 資料目錄不存在: {data_dir}")
        return 1

    # 確保輸出目錄存在
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # 建立證素對應
    mapping = build_zhengsu_mapping(data_dir)

    # 寫入檔案
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 證素對應已生成: {output_path}")
    print(f"   證素數: {mapping['statistics']['total_zhengsu']}")
    print(f"   證型數: {mapping['statistics']['total_zhengxing']}")
    print(f"   有關聯的證素: {mapping['statistics']['zhengsu_with_related']}")
    print(f"   組合模式數: {mapping['statistics']['combination_patterns']}")

    return 0


if __name__ == "__main__":
    exit(main())
