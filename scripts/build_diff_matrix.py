#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
類證鑑別矩陣建構腳本
讀取證型的 differentiation 資料建立鑑別矩陣
輸出: data/indexes/differentiation_matrix.json
"""

import json
from pathlib import Path
from typing import Dict, List, Set, Any, Optional, Tuple
from datetime import datetime
from collections import defaultdict


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


def extract_comparison_table(zx_data: Dict, compare_data: Dict) -> List[Dict]:
    """提取兩個證型的對比表"""
    aspects = []

    zx_id = zx_data.get("id", "")
    compare_id = compare_data.get("id", "")

    # 病機對比
    zx_pathogenesis = zx_data.get("pathogenesis", "")
    compare_pathogenesis = compare_data.get("pathogenesis", "")
    if zx_pathogenesis or compare_pathogenesis:
        # 擷取病機的前100字
        aspects.append({
            "aspect": "病機",
            zx_id: zx_pathogenesis[:100] + "..." if len(zx_pathogenesis) > 100 else zx_pathogenesis,
            compare_id: compare_pathogenesis[:100] + "..." if len(compare_pathogenesis) > 100 else compare_pathogenesis
        })

    # 主要症狀對比
    zx_symptoms = "、".join(zx_data.get("symptoms", {}).get("main", [])[:5])
    compare_symptoms = "、".join(compare_data.get("symptoms", {}).get("main", [])[:5])
    if zx_symptoms or compare_symptoms:
        aspects.append({
            "aspect": "主要症狀",
            zx_id: zx_symptoms,
            compare_id: compare_symptoms
        })

    # 舌脈對比
    zx_tongue = zx_data.get("symptoms", {}).get("tongue", "")
    zx_pulse = zx_data.get("symptoms", {}).get("pulse", "")
    compare_tongue = compare_data.get("symptoms", {}).get("tongue", "")
    compare_pulse = compare_data.get("symptoms", {}).get("pulse", "")

    zx_tongue_pulse = f"{zx_tongue}、{zx_pulse}" if zx_tongue and zx_pulse else zx_tongue or zx_pulse
    compare_tongue_pulse = f"{compare_tongue}、{compare_pulse}" if compare_tongue and compare_pulse else compare_tongue or compare_pulse

    if zx_tongue_pulse or compare_tongue_pulse:
        aspects.append({
            "aspect": "舌脈",
            zx_id: zx_tongue_pulse,
            compare_id: compare_tongue_pulse
        })

    # 治法對比
    zx_treatment = "、".join(zx_data.get("treatment_principle", []))
    compare_treatment = "、".join(compare_data.get("treatment_principle", []))
    if zx_treatment or compare_treatment:
        aspects.append({
            "aspect": "治法",
            zx_id: zx_treatment,
            compare_id: compare_treatment
        })

    # 代表方對比
    zx_formulas = "、".join(zx_data.get("recommended_formulas", [])[:2])
    compare_formulas = "、".join(compare_data.get("recommended_formulas", [])[:2])
    if zx_formulas or compare_formulas:
        aspects.append({
            "aspect": "代表方",
            zx_id: zx_formulas,
            compare_id: compare_formulas
        })

    return aspects


def build_pair_comparison(zx_id: str, zx_data: Dict, diff_info: Dict, zhengxing_data: Dict[str, Dict]) -> Optional[Dict]:
    """建立一對證型的對比資料"""
    compare_id = diff_info.get("compare_with", "")
    compare_name = diff_info.get("compare_name", "")

    compare_data = zhengxing_data.get(compare_id, {})

    # 如果找不到對比證型的資料，使用 diff_info 中的資訊
    if not compare_data:
        compare_data = {"id": compare_id, "name": compare_name}

    # 提取對比面向
    comparison_aspects = extract_comparison_table(zx_data, compare_data)

    # 從 differentiation 中提取更多資訊
    differences = diff_info.get("differences", {})
    if differences:
        this_pattern = differences.get("this_pattern", "")
        other_pattern = differences.get("other_pattern", "")

        if this_pattern or other_pattern:
            comparison_aspects.append({
                "aspect": "特點",
                zx_id: this_pattern,
                compare_id: other_pattern
            })

    pair = {
        "syndromes": [zx_id, compare_id],
        "syndrome_names": [zx_data.get("name", zx_id), compare_name or compare_data.get("name", compare_id)],
        "group_name": f"{zx_data.get('name', zx_id)}與{compare_name or compare_data.get('name', compare_id)}鑑別",
        "comparison_aspects": comparison_aspects,
        "similarities": diff_info.get("similarities", []),
        "key_differentiation": "、".join(diff_info.get("key_points", []))
    }

    return pair


def find_related_groups(zhengxing_data: Dict[str, Dict]) -> List[Dict]:
    """找出相關的證型群組（如氣虛系列）"""
    groups = []

    # 根據證素分組
    zhengsu_groups: Dict[str, List[str]] = defaultdict(list)

    for zx_id, data in zhengxing_data.items():
        nature = data.get("zhengsu_composition", {}).get("nature", [])
        for zs in nature:
            zhengsu_groups[zs].append(zx_id)

    # 對於每個有多個證型的證素，建立群組比較
    for zs, zx_ids in zhengsu_groups.items():
        if len(zx_ids) >= 2:
            zx_names = [zhengxing_data.get(zx_id, {}).get("name", zx_id) for zx_id in zx_ids]

            # 建立多證型對比表
            comparison_aspects = []

            # 病機對比
            pathogenesis_row = {"aspect": "病機"}
            for zx_id in zx_ids:
                data = zhengxing_data.get(zx_id, {})
                pathogenesis = data.get("pathogenesis", "")
                pathogenesis_row[zx_id] = pathogenesis[:80] + "..." if len(pathogenesis) > 80 else pathogenesis
            comparison_aspects.append(pathogenesis_row)

            # 主症對比
            symptoms_row = {"aspect": "主要症狀"}
            for zx_id in zx_ids:
                data = zhengxing_data.get(zx_id, {})
                main_symptoms = "、".join(data.get("symptoms", {}).get("main", [])[:4])
                symptoms_row[zx_id] = main_symptoms
            comparison_aspects.append(symptoms_row)

            # 治法對比
            treatment_row = {"aspect": "治法"}
            for zx_id in zx_ids:
                data = zhengxing_data.get(zx_id, {})
                treatment = "、".join(data.get("treatment_principle", []))
                treatment_row[zx_id] = treatment
            comparison_aspects.append(treatment_row)

            group = {
                "syndromes": zx_ids,
                "syndrome_names": zx_names,
                "group_name": f"含「{zs}」證素的證型群組",
                "comparison_aspects": comparison_aspects,
                "key_differentiation": f"皆含{zs}證素，以具體症狀和病位區分"
            }

            groups.append(group)

    return groups


def build_suggested_comparisons(zhengxing_data: Dict[str, Dict]) -> Dict[str, List[str]]:
    """建立建議對比的證型"""
    suggestions: Dict[str, List[str]] = {}

    for zx_id, data in zhengxing_data.items():
        related = set()

        # 從 differentiate_from 獲取
        for diff_id in data.get("differentiate_from", []):
            related.add(diff_id)

        # 從 differentiation 獲取
        for diff in data.get("differentiation", []):
            compare_id = diff.get("compare_with", "")
            if compare_id:
                related.add(compare_id)

        # 從演變關係獲取
        for evo_id in data.get("can_evolve_to", []):
            related.add(evo_id)
        for evo_id in data.get("evolved_from", []):
            related.add(evo_id)

        if related:
            suggestions[zx_id] = list(related)[:5]  # 最多5個建議

    return suggestions


def build_differentiation_matrix(data_dir: Path) -> Dict:
    """建立完整的鑑別矩陣"""
    print("正在載入證型資料...")
    zhengxing_data = load_zhengxing_data(data_dir)

    print(f"載入了 {len(zhengxing_data)} 個證型")

    # 收集所有配對比較
    pairs = []
    seen_pairs: Set[Tuple[str, str]] = set()

    print("正在建立配對比較...")
    for zx_id, data in zhengxing_data.items():
        for diff_info in data.get("differentiation", []):
            compare_id = diff_info.get("compare_with", "")

            # 避免重複配對
            pair_key = tuple(sorted([zx_id, compare_id]))
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)

            pair = build_pair_comparison(zx_id, data, diff_info, zhengxing_data)
            if pair:
                pairs.append(pair)

    print("正在建立證素群組...")
    groups = find_related_groups(zhengxing_data)

    print("正在建立建議對比...")
    suggested = build_suggested_comparisons(zhengxing_data)

    # 構建最終矩陣
    matrix = {
        "version": "1.0",
        "generated_at": datetime.now().strftime("%Y-%m-%d"),
        "description": "類證鑑別的關係矩陣，支援並列對比功能",
        "pairs": pairs,
        "groups": groups,
        "suggested_comparisons": suggested,
        "statistics": {
            "total_pairs": len(pairs),
            "total_groups": len(groups),
            "syndromes_with_suggestions": len(suggested)
        }
    }

    return matrix


def main():
    """主函數"""
    import argparse

    parser = argparse.ArgumentParser(description="建立類證鑑別矩陣")
    parser.add_argument(
        "--data-dir",
        default="data",
        help="資料目錄路徑 (預設: data)"
    )
    parser.add_argument(
        "--output",
        default="data/indexes/differentiation_matrix.json",
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

    # 建立鑑別矩陣
    matrix = build_differentiation_matrix(data_dir)

    # 寫入檔案
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(matrix, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 鑑別矩陣已生成: {output_path}")
    print(f"   配對比較數: {matrix['statistics']['total_pairs']}")
    print(f"   證素群組數: {matrix['statistics']['total_groups']}")
    print(f"   有建議對比的證型: {matrix['statistics']['syndromes_with_suggestions']}")

    return 0


if __name__ == "__main__":
    exit(main())
