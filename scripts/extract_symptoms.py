#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
症狀提取腳本
從證型和證候資料中提取症狀，建立反向索引
輸出: data/indexes/symptom_index.json
"""

import json
import os
import re
from pathlib import Path
from typing import Dict, List, Set, Any, Optional
from datetime import datetime
from collections import defaultdict


# 症狀分類
SYMPTOM_CATEGORIES = {
    "發熱類": ["發熱", "潮熱", "低熱", "壯熱", "寒熱", "惡寒", "惡風", "身熱", "五心煩熱", "骨蒸", "午後熱"],
    "疼痛類": ["頭痛", "胸痛", "腹痛", "腰痛", "肢痛", "關節痛", "痠痛", "脹痛", "刺痛", "隱痛", "絞痛"],
    "虛損類": ["乏力", "氣短", "神疲", "懶言", "倦怠", "自汗", "盜汗", "頭暈", "眩暈", "心悸", "失眠"],
    "二便類": ["便秘", "泄瀉", "便溏", "下利", "小便不利", "尿頻", "遺尿", "尿閉"],
    "神志類": ["煩躁", "不寐", "多夢", "健忘", "神昏", "譫語", "狂躁", "抑鬱", "恍惚", "驚悸"],
    "呼吸類": ["咳嗽", "氣喘", "胸悶", "痰多", "喘息", "呼吸困難", "鼻塞"],
    "消化類": ["納呆", "食少", "嘔吐", "噁心", "噯氣", "呃逆", "腹脹", "反酸"],
    "皮膚類": ["皮疹", "瘙癢", "瘡瘍", "水腫", "黃疸", "脫屑", "斑疹"],
    "其他": []
}


def categorize_symptom(symptom: str) -> str:
    """根據症狀名稱判斷分類"""
    for category, keywords in SYMPTOM_CATEGORIES.items():
        if category == "其他":
            continue
        for keyword in keywords:
            if keyword in symptom:
                return category
    return "其他"


def extract_symptoms_from_zhengxing(data_dir: Path) -> Dict[str, List[Dict]]:
    """從證型資料中提取症狀"""
    symptom_map: Dict[str, List[Dict]] = defaultdict(list)

    zhengxing_dir = data_dir / "zhengxing"
    if not zhengxing_dir.exists():
        print(f"警告: 證型目錄不存在: {zhengxing_dir}")
        return symptom_map

    for f in zhengxing_dir.glob("*.json"):
        if f.name.startswith("_"):
            continue

        try:
            with open(f, 'r', encoding='utf-8') as fp:
                data = json.load(fp)
        except (json.JSONDecodeError, Exception) as e:
            print(f"警告: 無法讀取 {f}: {e}")
            continue

        zx_id = data.get("id", "")
        zx_name = data.get("name", "")
        symptoms = data.get("symptoms", {})

        # 提取主症
        for symptom in symptoms.get("main", []):
            if isinstance(symptom, str) and symptom.strip():
                symptom_map[symptom.strip()].append({
                    "id": zx_id,
                    "name": zx_name,
                    "relevance": "主症",
                    "differentiation_hint": _build_differentiation_hint(data)
                })

        # 提取次症
        for symptom in symptoms.get("secondary", []):
            if isinstance(symptom, str) and symptom.strip():
                symptom_map[symptom.strip()].append({
                    "id": zx_id,
                    "name": zx_name,
                    "relevance": "次症",
                    "differentiation_hint": _build_differentiation_hint(data)
                })

    return symptom_map


def extract_symptoms_from_zhenghou(data_dir: Path) -> Dict[str, List[Dict]]:
    """從證候資料中提取症狀"""
    symptom_map: Dict[str, List[Dict]] = defaultdict(list)

    syndromes_dir = data_dir / "zhenghou" / "syndromes"
    if not syndromes_dir.exists():
        print(f"警告: 證候目錄不存在: {syndromes_dir}")
        return symptom_map

    for f in syndromes_dir.glob("*.json"):
        if f.name.startswith("_"):
            continue

        try:
            with open(f, 'r', encoding='utf-8') as fp:
                data = json.load(fp)
        except (json.JSONDecodeError, Exception) as e:
            print(f"警告: 無法讀取 {f}: {e}")
            continue

        zh_id = data.get("id", "")
        zh_name = data.get("name", "")

        # 從 clinical_manifestations 提取症狀
        clinical = data.get("clinical_manifestations", "")
        if clinical:
            symptoms = _parse_clinical_manifestations(clinical)
            for symptom in symptoms:
                symptom_map[symptom].append({
                    "id": zh_id,
                    "name": zh_name,
                    "relevance": "相關",
                    "differentiation_hint": ""
                })

    return symptom_map


def _build_differentiation_hint(data: Dict) -> str:
    """建立鑑別提示"""
    hints = []

    symptoms = data.get("symptoms", {})

    # 舌象
    tongue = symptoms.get("tongue", "")
    if tongue:
        hints.append(tongue)

    # 脈象
    pulse = symptoms.get("pulse", "")
    if pulse:
        hints.append(pulse)

    # 部分主症（取前2-3個）
    main = symptoms.get("main", [])[:3]
    if main:
        hints.extend(main)

    return "、".join(hints[:4]) if hints else ""


def _parse_clinical_manifestations(text: str) -> List[str]:
    """從臨床表現文字中提取症狀"""
    symptoms = []

    # 用逗號、分號、頓號分割
    parts = re.split(r'[，,、；;]', text)

    for part in parts:
        part = part.strip()
        # 過濾太長的描述（不像是單獨的症狀）
        if 2 <= len(part) <= 8:
            symptoms.append(part)

    return symptoms


def build_symptom_index(data_dir: Path) -> Dict:
    """建立完整的症狀索引"""
    print("正在從證型提取症狀...")
    zhengxing_symptoms = extract_symptoms_from_zhengxing(data_dir)

    print("正在從證候提取症狀...")
    zhenghou_symptoms = extract_symptoms_from_zhenghou(data_dir)

    # 合併症狀
    all_symptoms: Dict[str, Dict] = {}

    for symptom, syndromes in zhengxing_symptoms.items():
        if symptom not in all_symptoms:
            all_symptoms[symptom] = {
                "display_name": symptom,
                "related_syndromes": [],
                "category": categorize_symptom(symptom)
            }
        all_symptoms[symptom]["related_syndromes"].extend(syndromes)

    for symptom, syndromes in zhenghou_symptoms.items():
        if symptom not in all_symptoms:
            all_symptoms[symptom] = {
                "display_name": symptom,
                "related_syndromes": [],
                "category": categorize_symptom(symptom)
            }
        # 避免重複添加
        existing_ids = {s["id"] for s in all_symptoms[symptom]["related_syndromes"]}
        for s in syndromes:
            if s["id"] not in existing_ids:
                all_symptoms[symptom]["related_syndromes"].append(s)

    # 按主症優先排序
    for symptom_data in all_symptoms.values():
        symptom_data["related_syndromes"].sort(
            key=lambda x: (0 if x["relevance"] == "主症" else 1, x["name"])
        )

    # 收集所有分類
    categories = set()
    for symptom_data in all_symptoms.values():
        categories.add(symptom_data["category"])

    # 構建最終索引
    index = {
        "version": "1.0",
        "generated_at": datetime.now().strftime("%Y-%m-%d"),
        "description": "症狀到證型的反向索引，支援症狀反查功能",
        "symptoms": all_symptoms,
        "categories": sorted(list(categories)),
        "statistics": {
            "total_symptoms": len(all_symptoms),
            "symptoms_with_main_relevance": sum(
                1 for s in all_symptoms.values()
                if any(r["relevance"] == "主症" for r in s["related_syndromes"])
            )
        }
    }

    return index


def main():
    """主函數"""
    import argparse

    parser = argparse.ArgumentParser(description="從證型和證候中提取症狀，建立反向索引")
    parser.add_argument(
        "--data-dir",
        default="data",
        help="資料目錄路徑 (預設: data)"
    )
    parser.add_argument(
        "--output",
        default="data/indexes/symptom_index.json",
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

    # 建立索引
    index = build_symptom_index(data_dir)

    # 寫入檔案
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 症狀索引已生成: {output_path}")
    print(f"   總症狀數: {index['statistics']['total_symptoms']}")
    print(f"   含主症關聯: {index['statistics']['symptoms_with_main_relevance']}")

    return 0


if __name__ == "__main__":
    exit(main())
