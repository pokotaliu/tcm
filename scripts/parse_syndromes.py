#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
解析中醫證候純文字檔，輸出為結構化 JSON 檔案
"""

import json
import os
import re
from pathlib import Path
from pypinyin import lazy_pinyin

def get_pinyin_id(name: str) -> str:
    """將證候名稱轉換為拼音 ID"""
    # 移除「證」字
    clean_name = name.replace("證", "")
    # 轉換為拼音
    pinyin_list = lazy_pinyin(clean_name)
    return "".join(pinyin_list)

def parse_clinical_manifestations(overview: str) -> str:
    """從概述中提取臨床表現"""
    # 尋找臨床表現的描述
    patterns = [
        r"主要臨床表現為[：:](.+?)(?:本證|該證|常見於|可見於|散見於|\n\n)",
        r"臨床表現[為以]主[：:](.+?)(?:本證|該證|常見於|可見於|\n\n)",
    ]
    for pattern in patterns:
        match = re.search(pattern, overview, re.DOTALL)
        if match:
            return match.group(1).strip().replace("\n", "")
    return ""

def parse_common_diseases(overview: str) -> list:
    """從概述中提取常見病"""
    patterns = [
        r"(?:常見於|散見於|可見於)[「「]?(.+?)[」」]?(?:等疾病|等病變|等疾患|等。|中。|\n)",
    ]
    for pattern in patterns:
        match = re.search(pattern, overview, re.DOTALL)
        if match:
            diseases_text = match.group(1)
            # 分割疾病名稱
            diseases = re.split(r"[、」「]", diseases_text)
            return [d.strip().strip("「」") for d in diseases if d.strip() and d.strip() not in ["等"]]
    return []

def parse_differential_syndromes(overview: str) -> list:
    """從概述中提取鑑別證候"""
    patterns = [
        r"應(?:當)?與[「「]?(.+?)[」」]?等?相?鑑別",
    ]
    for pattern in patterns:
        match = re.search(pattern, overview, re.DOTALL)
        if match:
            syndromes_text = match.group(1)
            # 分割證候名稱
            syndromes = re.split(r"[、」「]", syndromes_text)
            return [s.strip().strip("「」") for s in syndromes if s.strip()]
    return []

def parse_syndrome(content: str, number: int, category: str) -> dict:
    """解析單個證候"""
    result = {
        "id": "",
        "number": number,
        "name": "",
        "category": category,
        "overview": "",
        "clinical_manifestations": "",
        "common_diseases": [],
        "differential_syndromes": [],
        "differential": {
            "self_analysis": "",
            "type_comparison": ""
        },
        "literature": ""
    }

    # 提取名稱
    name_match = re.match(r"\d+\.(.+?)證?\n", content)
    if name_match:
        name = name_match.group(1).strip()
        if not name.endswith("證"):
            name += "證"
        result["name"] = name
        result["id"] = get_pinyin_id(name)

    # 提取概述
    overview_match = re.search(r"【概述】\n(.+?)(?=【鑑別】|【鑒別】|$)", content, re.DOTALL)
    if overview_match:
        overview = overview_match.group(1).strip()
        result["overview"] = overview
        result["clinical_manifestations"] = parse_clinical_manifestations(overview)
        result["common_diseases"] = parse_common_diseases(overview)
        result["differential_syndromes"] = parse_differential_syndromes(overview)

    # 提取鑑別
    differential_match = re.search(r"【鑑別】\n(.+?)(?=【文獻選錄】|$)", content, re.DOTALL)
    if not differential_match:
        differential_match = re.search(r"【鑒別】\n(.+?)(?=【文獻選錄】|$)", content, re.DOTALL)

    if differential_match:
        diff_content = differential_match.group(1).strip()

        # 提取本證辨析
        self_match = re.search(r"本證辨析\n(.+?)(?=類證鑑別|類證辨析|$)", diff_content, re.DOTALL)
        if self_match:
            result["differential"]["self_analysis"] = self_match.group(1).strip()

        # 提取類證鑑別
        type_match = re.search(r"(?:類證鑑別|類證辨析)\n(.+?)$", diff_content, re.DOTALL)
        if type_match:
            result["differential"]["type_comparison"] = type_match.group(1).strip()

    # 提取文獻選錄
    lit_match = re.search(r"【文獻選錄】\n(.+?)$", content, re.DOTALL)
    if lit_match:
        result["literature"] = lit_match.group(1).strip()

    return result

def main():
    # 讀取純文字檔
    input_path = Path("/home/user/tcm/中醫證候純文字檔.md")
    output_dir = Path("/home/user/tcm/data/zhenghou/syndromes")
    output_dir.mkdir(parents=True, exist_ok=True)

    with open(input_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 按分類分割
    categories = re.split(r"(^[一二三四五六七八九十]+、.+)$", content, flags=re.MULTILINE)

    all_syndromes = []
    current_category = ""

    for i, part in enumerate(categories):
        if re.match(r"^[一二三四五六七八九十]+、", part):
            # 這是分類標題
            current_category = part.strip().split("、")[1] if "、" in part else part.strip()
            continue

        if not part.strip():
            continue

        # 分割各個證候
        syndrome_parts = re.split(r"(?=^\d+\.[^\d])", part, flags=re.MULTILINE)

        for syndrome_part in syndrome_parts:
            if not syndrome_part.strip():
                continue

            # 提取編號
            num_match = re.match(r"(\d+)\.", syndrome_part)
            if not num_match:
                continue

            number = int(num_match.group(1))

            try:
                syndrome = parse_syndrome(syndrome_part, number, current_category)

                if syndrome["name"]:
                    all_syndromes.append(syndrome)

                    # 寫入單獨的 JSON 檔案
                    output_path = output_dir / f"{syndrome['id']}.json"
                    with open(output_path, "w", encoding="utf-8") as f:
                        json.dump(syndrome, f, ensure_ascii=False, indent=2)

                    print(f"已生成: {syndrome['id']}.json ({syndrome['name']})")
            except Exception as e:
                print(f"解析錯誤 (編號 {number}): {e}")

    # 建立索引檔案
    index = {
        "total": len(all_syndromes),
        "categories": {},
        "syndromes": []
    }

    for syndrome in all_syndromes:
        cat = syndrome["category"]
        if cat not in index["categories"]:
            index["categories"][cat] = []
        index["categories"][cat].append({
            "id": syndrome["id"],
            "name": syndrome["name"],
            "number": syndrome["number"]
        })

        index["syndromes"].append({
            "id": syndrome["id"],
            "name": syndrome["name"],
            "category": syndrome["category"],
            "number": syndrome["number"]
        })

    index_path = output_dir / "index.json"
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"\n總共解析: {len(all_syndromes)} 個證候")
    print(f"索引檔案: {index_path}")

if __name__ == "__main__":
    main()
