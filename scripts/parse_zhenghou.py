#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
解析中醫證候純文字檔.md，將其轉換為 JSON 資料格式
"""

import json
import re
import os
from pathlib import Path


def parse_zhenghou_md(md_path: str) -> dict:
    """解析證候 MD 文件"""

    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 分割大分類
    categories = {}

    # 找出所有大分類標題
    category_pattern = re.compile(r'^([一二三四五六七八九十]+)、(.+)$', re.MULTILINE)
    category_matches = list(category_pattern.finditer(content))

    # 找出所有證候標題
    zhenghou_pattern = re.compile(r'^(\d+)\.(.+證)$', re.MULTILINE)
    zhenghou_matches = list(zhenghou_pattern.finditer(content))

    # 建立大分類映射
    category_map = {}
    for i, match in enumerate(category_matches):
        start = match.start()
        end = category_matches[i + 1].start() if i + 1 < len(category_matches) else len(content)
        category_map[match.group(2).strip()] = {
            'id': match.group(1),
            'name': match.group(2).strip(),
            'start': start,
            'end': end,
            'syndromes': []
        }

    # 解析每個證候
    all_syndromes = []

    for i, match in enumerate(zhenghou_matches):
        syndrome_start = match.start()
        syndrome_end = zhenghou_matches[i + 1].start() if i + 1 < len(zhenghou_matches) else len(content)
        syndrome_content = content[syndrome_start:syndrome_end]

        syndrome_id = int(match.group(1))
        syndrome_name = match.group(2).strip()

        # 確定所屬分類
        category_name = None
        for cat_name, cat_info in category_map.items():
            if cat_info['start'] <= syndrome_start < cat_info['end']:
                category_name = cat_name
                break

        # 解析各個部分
        syndrome_data = parse_syndrome_content(syndrome_id, syndrome_name, syndrome_content, category_name)
        all_syndromes.append(syndrome_data)

        # 添加到分類中
        if category_name and category_name in category_map:
            category_map[category_name]['syndromes'].append(syndrome_data)

    return {
        'categories': category_map,
        'syndromes': all_syndromes
    }


def parse_syndrome_content(syndrome_id: int, name: str, content: str, category: str) -> dict:
    """解析單個證候的內容"""

    # 提取概述
    overview = extract_section(content, '【概述】', ['【鑑別】', '【文獻選錄】'])

    # 提取鑑別
    differential = extract_section(content, '【鑑別】', ['【文獻選錄】'])

    # 提取文獻選錄
    literature = extract_section(content, '【文獻選錄】', [])

    # 從概述中提取主要臨床表現
    clinical_manifestations = extract_clinical_manifestations(overview)

    # 從概述中提取常見於哪些疾病
    common_diseases = extract_common_diseases(overview)

    # 從概述中提取鑒別證候
    differential_syndromes = extract_differential_syndromes(overview)

    # 從鑑別中解析本證辨析和類證鑑別
    self_analysis = ""
    type_comparison = ""
    if differential:
        self_analysis = extract_subsection(differential, '本證辨析', ['類證鑑別'])
        type_comparison = extract_subsection(differential, '類證鑑別', [])

    # 生成拼音 ID
    pinyin_id = generate_pinyin_id(name)

    return {
        'id': pinyin_id,
        'number': syndrome_id,
        'name': name,
        'category': category,
        'overview': overview.strip() if overview else "",
        'clinical_manifestations': clinical_manifestations,
        'common_diseases': common_diseases,
        'differential_syndromes': differential_syndromes,
        'differential': {
            'self_analysis': self_analysis.strip() if self_analysis else "",
            'type_comparison': type_comparison.strip() if type_comparison else ""
        },
        'literature': literature.strip() if literature else ""
    }


def extract_section(content: str, start_marker: str, end_markers: list) -> str:
    """提取指定區段的內容"""
    start_idx = content.find(start_marker)
    if start_idx == -1:
        return ""

    start_idx += len(start_marker)

    end_idx = len(content)
    for marker in end_markers:
        idx = content.find(marker, start_idx)
        if idx != -1 and idx < end_idx:
            end_idx = idx

    return content[start_idx:end_idx].strip()


def extract_subsection(content: str, start_marker: str, end_markers: list) -> str:
    """提取子區段內容"""
    start_idx = content.find(start_marker)
    if start_idx == -1:
        return ""

    start_idx += len(start_marker)

    end_idx = len(content)
    for marker in end_markers:
        idx = content.find(marker, start_idx)
        if idx != -1 and idx < end_idx:
            end_idx = idx

    return content[start_idx:end_idx].strip()


def extract_clinical_manifestations(overview: str) -> str:
    """從概述中提取主要臨床表現"""
    # 尋找「主要臨床表現為：」
    pattern = r'主要臨床表現為[：:](.+?)(?=\n|$|。\n)'
    match = re.search(pattern, overview, re.DOTALL)
    if match:
        return match.group(1).strip()
    return ""


def extract_common_diseases(overview: str) -> list:
    """從概述中提取常見疾病"""
    # 尋找「常見於」或「散見於」
    pattern = r'(?:常見於|散見於)[「「](.+?)[」」]'
    matches = re.findall(pattern, overview)
    diseases = []
    for match in matches:
        # 分割並清理
        parts = re.split(r'[、」「]', match)
        diseases.extend([p.strip() for p in parts if p.strip()])
    return diseases


def extract_differential_syndromes(overview: str) -> list:
    """從概述中提取需要鑑別的證候"""
    # 尋找「應與」...「相鑑別」
    pattern = r'應(?:當)?與[「「](.+?)[」」]等?相鑑別'
    match = re.search(pattern, overview)
    if match:
        content = match.group(1)
        parts = re.split(r'[、」「]', content)
        return [p.strip() for p in parts if p.strip()]
    return []


def generate_pinyin_id(name: str) -> str:
    """生成拼音 ID（簡化版，使用映射表）"""
    # 證候名稱到拼音的映射
    pinyin_map = {
        '氣虛證': 'qixu',
        '氣陷證': 'qixian',
        '氣脫證': 'qituo',
        '氣滯證': 'qizhi',
        '氣逆證': 'qini',
        '氣閉證': 'qibi',
        '血虛證': 'xuexu',
        '血脫證': 'xuetuo',
        '血瘀證': 'xueyu',
        '血熱證': 'xuere',
        '血燥證': 'xuezao',
        '血寒證': 'xuehan',
        '精脫證': 'jingtuo',
        '陰虛津虧證': 'yinxu_jinkui',
        '陰虛證': 'yinxu',
        '陽虛證': 'yangxu',
        '亡陰證': 'wangyin',
        '亡陽證': 'wangyang',
        '失神證': 'shishen',
        '風證': 'feng',
        '寒證': 'han',
        '暑證': 'shu',
        '濕證': 'shi',
        '燥證': 'zao',
        '火熱證': 'huore',
        '痰證': 'tan',
        '邪毒熾盛證': 'xiedu_chisheng',
        '太陽證': 'taiyang',
        '陽明證': 'yangming',
        '少陽證': 'shaoyang',
        '太陰證': 'taiyin',
        '厥陰證': 'jueyin',
        '少陰證': 'shaoyin',
        '衛分證': 'weifen',
        '氣分證': 'qifen',
        '營分證': 'yingfen',
        '血分證': 'xuefen',
        '氣虛發熱證': 'qixu_fare',
        '氣虛外感證': 'qixu_waigan',
        '氣虛血瘀證': 'qixu_xueyu',
        '氣滯血瘀證': 'qizhi_xueyu',
        '氣滯痰凝證': 'qizhi_tanning',
        '氣滯濕阻證': 'qizhi_shizu',
        '氣鬱化火證': 'qiyu_huahuo',
        '氣滯水停證': 'qizhi_shuiting',
        '血虛生風證': 'xuexu_shengfeng',
        '血虛風燥證': 'xuexu_fengzao',
        '血虛津虧證': 'xuexu_jinkui',
        '血虛寒凝證': 'xuexu_hanning',
        '血虛外感證': 'xuexu_waigan',
        '血瘀氣滯證': 'xueyu_qizhi',
        '血瘀化熱證': 'xueyu_huare',
        '血瘀水停證': 'xueyu_shuiting',
        '血瘀動血證': 'xueyu_dongxue',
        '瘀血痺阻證': 'yuxue_bizu',
        '血熱動風證': 'xuere_dongfeng',
    }

    if name in pinyin_map:
        return pinyin_map[name]

    # 如果不在映射表中，嘗試簡單處理
    # 移除「證」字，轉換為小寫拼音格式
    clean_name = name.replace('證', '')
    # 這裡可以添加更多轉換邏輯
    return clean_name.lower().replace(' ', '_')


def save_syndromes_to_json(data: dict, output_dir: str):
    """將證候資料儲存為 JSON 檔案"""

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # 儲存索引檔案
    index_data = {
        'categories': [],
        'total_syndromes': len(data['syndromes'])
    }

    for cat_name, cat_info in data['categories'].items():
        index_data['categories'].append({
            'id': cat_info['id'],
            'name': cat_name,
            'syndrome_count': len(cat_info['syndromes']),
            'syndromes': [
                {'id': s['id'], 'number': s['number'], 'name': s['name']}
                for s in cat_info['syndromes']
            ]
        })

    with open(output_path / 'index.json', 'w', encoding='utf-8') as f:
        json.dump(index_data, f, ensure_ascii=False, indent=2)

    print(f"已儲存索引檔案: {output_path / 'index.json'}")

    # 儲存每個證候的詳細資料
    syndromes_dir = output_path / 'syndromes'
    syndromes_dir.mkdir(exist_ok=True)

    for syndrome in data['syndromes']:
        filename = f"{syndrome['id']}.json"
        with open(syndromes_dir / filename, 'w', encoding='utf-8') as f:
            json.dump(syndrome, f, ensure_ascii=False, indent=2)

    print(f"已儲存 {len(data['syndromes'])} 個證候檔案到 {syndromes_dir}")

    # 儲存 schema 檔案
    schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "中醫證候資料結構",
        "description": "描述中醫證候的 JSON 結構",
        "type": "object",
        "required": ["id", "number", "name", "category", "overview"],
        "properties": {
            "id": {
                "type": "string",
                "description": "證候的拼音 ID"
            },
            "number": {
                "type": "integer",
                "description": "證候編號"
            },
            "name": {
                "type": "string",
                "description": "證候名稱"
            },
            "category": {
                "type": "string",
                "description": "所屬分類"
            },
            "overview": {
                "type": "string",
                "description": "概述"
            },
            "clinical_manifestations": {
                "type": "string",
                "description": "主要臨床表現"
            },
            "common_diseases": {
                "type": "array",
                "items": {"type": "string"},
                "description": "常見於哪些疾病"
            },
            "differential_syndromes": {
                "type": "array",
                "items": {"type": "string"},
                "description": "需要鑑別的證候"
            },
            "differential": {
                "type": "object",
                "properties": {
                    "self_analysis": {
                        "type": "string",
                        "description": "本證辨析"
                    },
                    "type_comparison": {
                        "type": "string",
                        "description": "類證鑑別"
                    }
                }
            },
            "literature": {
                "type": "string",
                "description": "文獻選錄"
            }
        }
    }

    with open(output_path / '_schema.json', 'w', encoding='utf-8') as f:
        json.dump(schema, f, ensure_ascii=False, indent=2)

    print(f"已儲存 schema 檔案: {output_path / '_schema.json'}")


def main():
    # 設定路徑
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    md_path = project_root / '中醫證候純文字檔.md'
    output_dir = project_root / 'data' / 'zhenghou'

    print(f"解析檔案: {md_path}")

    # 解析 MD 檔案
    data = parse_zhenghou_md(str(md_path))

    print(f"找到 {len(data['categories'])} 個分類")
    print(f"找到 {len(data['syndromes'])} 個證候")

    # 儲存為 JSON
    save_syndromes_to_json(data, str(output_dir))

    print("完成！")


if __name__ == '__main__':
    main()
