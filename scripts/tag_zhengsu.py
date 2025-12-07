#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
為證候添加證素標註腳本
遍歷所有證候 JSON 檔案，根據證候名稱自動標註病位和病性證素
"""

import json
import os
import re
from pathlib import Path
from typing import Dict, List, Tuple, Set

# 項目根目錄
PROJECT_ROOT = Path(__file__).parent.parent
ZHENGSU_DIR = PROJECT_ROOT / "data" / "zhengsu"
SYNDROMES_DIR = PROJECT_ROOT / "data" / "zhenghou" / "syndromes"
ANALYSIS_DIR = PROJECT_ROOT / "data" / "analysis"


def load_zhengsu_mapping() -> Tuple[Dict[str, str], Dict[str, str]]:
    """
    讀取所有證素檔案，建立名稱到 ID 的對照表
    返回: (病位對照表, 病性對照表)
    """
    location_map = {}  # 病位: 名稱 -> ID
    nature_map = {}    # 病性: 名稱 -> ID

    for f in ZHENGSU_DIR.glob("*.json"):
        if f.name == "_schema.json":
            continue
        with open(f, "r", encoding="utf-8") as file:
            data = json.load(file)
            name = data.get("name", "")
            id_ = data.get("id", "")
            category = data.get("category", "")
            alias_list = data.get("alias", [])

            if category == "病位":
                location_map[name] = id_
                for alias in alias_list:
                    location_map[alias] = id_
            elif category == "病性":
                nature_map[name] = id_
                for alias in alias_list:
                    nature_map[alias] = id_

    return location_map, nature_map


def build_extended_mappings() -> Tuple[Dict[str, str], Dict[str, str]]:
    """
    建立擴展的證素對照表，包含額外的關鍵字匹配
    """
    location_map, nature_map = load_zhengsu_mapping()

    # 添加額外的病位關鍵字
    extra_locations = {
        "肺": "fei", "心": "xin", "肝": "gan", "脾": "pi", "腎": "shen",
        "胃": "wei", "膽": "dan", "小腸": "xiaochang", "大腸": "dachang",
        "膀胱": "pangguang", "表": "biao", "半表半裡": "banbiaobanli",
        "胞宮": "baogong", "精室": "jingshi", "胸膈": "xiongge",
        "少腹": "shaofu", "經絡": "jingluo", "筋骨": "jingu", "肌膚": "jifu",
        # 額外別名
        "衛": "biao", "衛分": "biao",
        "營": "xin", "營分": "xin", "血分": "xin",
        "三焦": "xiongge",
        # 衝任經絡
        "衝任": "baogong",
        # 眼科風輪（對應肝）
        "風輪": "gan",
        # 喉、耳、鼻（特殊部位，對應肺）
        "喉": "fei", "鼻": "fei", "耳": "shen",
        # 腸
        "腸": "dachang",
    }
    location_map.update(extra_locations)

    # 添加額外的病性關鍵字
    extra_natures = {
        # 氣機病變
        "氣虛": "qi_xu", "氣陷": "qi_xian", "氣滯": "qi_zhi", "氣逆": "qi_ni",
        "氣閉": "qi_bi", "氣脫": "qi_tuo", "氣鬱": "qi_zhi",
        # 血液病變
        "血虛": "xue_xu", "血瘀": "xue_yu", "血熱": "xue_re", "血寒": "xue_han",
        "動血": "dong_xue", "瘀血": "xue_yu", "瘀": "xue_yu", "出血": "dong_xue",
        "血滯": "xue_yu", "瘀滯": "xue_yu", "瘀阻": "xue_yu",
        # 陰陽病變
        "陰虛": "yin_xu", "陽虛": "yang_xu", "陽亢": "yang_kang", "亡陰": "wang_yin",
        "亡陽": "wang_yang", "陽浮": "yang_fu", "虛陽外越": "yang_fu",
        # 外邪
        "風": "feng", "寒": "han", "暑": "shu", "濕": "shi", "燥": "zao",
        "火": "huo", "毒": "du", "熱": "huo", "溫": "huo",
        # 病理產物
        "痰": "tan", "飲": "yin", "水停": "shui_ting", "食積": "shi_ji",
        "水腫": "shui_ting", "水濕": "shui_ting", "痰濁": "tan", "痰熱": "tan",
        "痰飲": "tan", "積滯": "shi_ji", "宿食": "shi_ji", "膿": "nong",
        "積": "shi_ji", "水": "shui_ting",
        # 精津病變
        "津虧": "jin_kui", "精虧": "jing_kui", "津液虧虛": "jin_kui",
        "陰津虧虛": "jin_kui", "精血虧虛": "jing_kui",
        # 內生病邪
        "動風": "dong_feng", "內風": "dong_feng", "風動": "dong_feng",
        "肝風": "dong_feng", "肝風內動": "dong_feng",
        # 其他複合病性
        "不固": "bu_gu", "蟲積": "chong_ji", "清陽不升": "qingyang_busheng",
        # 虛證
        "虛": "qi_xu", "虛寒": "yang_xu", "虛熱": "yin_xu", "虛衰": "qi_xu",
        "虛羸": "qi_xu", "虛損": "qi_xu",
        # 實證相關
        "結": "qi_zhi", "閉": "qi_bi", "阻": "qi_zhi", "滯": "qi_zhi",
        "凝": "han", "凝滯": "han",
        # 其他
        "鬱": "qi_zhi", "郁": "qi_zhi", "鬱結": "qi_zhi",
        "上亢": "yang_kang", "上炎": "huo", "上擾": "huo", "上衝": "qi_ni",
        "內動": "dong_feng", "內擾": "huo",
        "化火": "huo", "化熱": "huo",
        "困": "shi", "蘊": "shi", "壅": "qi_zhi",
        "犯": "feng", "襲": "feng", "侵": "feng",
        "痺": "feng", "痺阻": "feng",
        "敗血": "xue_yu", "離經之血": "xue_yu",
        "蟲": "chong_ji", "蟲毒": "du",
        "疫": "du", "疫毒": "du",
        "邪戀": "feng", "邪留": "feng",
        "兩虛": "qi_xu", "兩燔": "huo",
        "錯雜": "han",
    }
    nature_map.update(extra_natures)

    return location_map, nature_map


def preprocess_name(name: str) -> str:
    """
    預處理證候名稱：移除疾病前綴
    """
    # 移除「證」字尾
    clean_name = name.rstrip("證")

    # 移除常見疾病前綴
    disease_prefixes = [
        "艾滋病", "糖尿病", "冠心病", "高血壓", "肝炎", "肝硬化",
        "病後", "病差", "產後", "術後", "久病", "新病",
    ]
    for prefix in disease_prefixes:
        if clean_name.startswith(prefix):
            clean_name = clean_name[len(prefix):]
            break

    return clean_name


def extract_zhengsu_from_name(name: str, location_map: Dict[str, str],
                               nature_map: Dict[str, str]) -> Tuple[List[str], List[str], List[str]]:
    """
    從證候名稱中提取病位和病性證素
    返回: (病位ID列表, 病性ID列表, 無法識別的原因列表)
    """
    locations: Set[str] = set()
    natures: Set[str] = set()
    issues: List[str] = []

    # 預處理名稱
    clean_name = preprocess_name(name)

    # 特殊證候處理
    special_syndromes = process_special_syndromes(clean_name)
    if special_syndromes:
        return special_syndromes[0], special_syndromes[1], []

    # 按長度排序，優先匹配較長的關鍵字
    sorted_locations = sorted(location_map.keys(), key=len, reverse=True)
    sorted_natures = sorted(nature_map.keys(), key=len, reverse=True)

    # 匹配病位（使用副本避免多次替換問題）
    remaining = clean_name
    for keyword in sorted_locations:
        if keyword in remaining:
            locations.add(location_map[keyword])
            remaining = remaining.replace(keyword, "□", 1)  # 用占位符避免重複匹配

    # 匹配病性
    remaining = clean_name
    for keyword in sorted_natures:
        if keyword in remaining:
            natures.add(nature_map[keyword])
            remaining = remaining.replace(keyword, "□", 1)

    # 特殊情況：氣陰兩虛 -> qi_xu + yin_xu
    if "氣陰" in clean_name and "兩虛" in clean_name:
        natures.add("qi_xu")
        natures.add("yin_xu")
    if "氣陰兩虛" in clean_name:
        natures.add("qi_xu")
        natures.add("yin_xu")

    # 特殊情況：「息不利」-> 肺病
    if "息不利" in clean_name or "鼻塞" in clean_name:
        locations.add("fei")

    # 檢查是否有未識別的部分
    if not locations and not natures:
        issues.append("無法識別任何證素")
    elif not natures:
        issues.append("無法識別病性")

    return list(locations), list(natures), issues


def process_special_syndromes(name: str) -> Tuple[List[str], List[str]] | None:
    """
    處理特殊類型的證候（六經、衛氣營血等）
    """
    # 六經證候
    liujing_patterns = {
        "太陽": (["biao"], ["feng", "han"]),
        "陽明": (["wei", "dachang"], ["huo"]),
        "少陽": (["dan"], ["huo"]),
        "太陰": (["pi"], ["han", "shi"]),
        "少陰": (["shen", "xin"], ["yang_xu"]),
        "厥陰": (["gan"], ["han"]),
    }

    for pattern, (locs, nats) in liujing_patterns.items():
        if name.startswith(pattern) and "經" in name:
            return (locs, nats)
        if pattern == name:
            return (locs, nats)

    # 衛氣營血證候
    weiqiyingxue = {
        "衛分": (["biao"], ["feng", "huo"]),
        "衛氣同病": (["biao"], ["feng", "huo"]),
        "氣分": ([], ["huo"]),
        "氣營兩燔": ([], ["huo"]),
        "營分": (["xin"], ["huo"]),
        "營衛不和": (["biao"], ["feng"]),
        "血分": (["xin"], ["huo", "dong_xue"]),
        "熱入營血": (["xin"], ["huo"]),
        "熱入血分": (["xin"], ["huo", "dong_xue"]),
        "熱入心包": (["xin"], ["huo"]),
        "熱閉心包": (["xin"], ["huo", "qi_bi"]),
    }

    for pattern, result in weiqiyingxue.items():
        if pattern in name:
            return result

    # 三焦證候
    sanjiao = {
        "上焦": (["fei", "xin"], []),
        "中焦": (["pi", "wei"], []),
        "下焦": (["gan", "shen"], []),
    }

    for pattern, (locs, nats) in sanjiao.items():
        if pattern in name:
            base_nats = nats.copy()
            if "濕熱" in name:
                base_nats.extend(["shi", "huo"])
            elif "熱" in name or "火" in name:
                base_nats.append("huo")
            elif "寒" in name:
                base_nats.append("han")
            elif "濕" in name:
                base_nats.append("shi")
            return (locs, base_nats)

    # 結胸證候
    if "結胸" in name:
        base_nats = []
        if "大結胸" in name:
            base_nats = ["huo", "shui_ting"]
        elif "小結胸" in name:
            base_nats = ["tan", "huo"]
        elif "寒實" in name:
            base_nats = ["han", "shui_ting"]
        else:
            base_nats = ["tan", "huo"]
        return (["xiongge"], base_nats)

    # 痞證
    if "痞" in name:
        base_nats = ["qi_zhi"]
        if "寒熱錯雜" in name or "錯雜" in name:
            base_nats.extend(["han", "huo"])
        elif "熱" in name:
            base_nats.append("huo")
        elif "寒" in name:
            base_nats.append("han")
        elif "痰" in name:
            base_nats.append("tan")
        return (["wei"], base_nats)

    # 單純虛證
    simple_patterns = {
        "氣虛": ([], ["qi_xu"]),
        "血虛": ([], ["xue_xu"]),
        "陰虛": ([], ["yin_xu"]),
        "陽虛": ([], ["yang_xu"]),
        "血瘀": ([], ["xue_yu"]),
        "寒": ([], ["han"]),
        "熱": ([], ["huo"]),
        "風": ([], ["feng"]),
        "濕": ([], ["shi"]),
    }

    if name in simple_patterns:
        return simple_patterns[name]

    # 臟腑不和/不調/不交證候
    disharmony_patterns = {
        "肝胃不和": (["gan", "wei"], ["qi_zhi"]),
        "肝脾不調": (["gan", "pi"], ["qi_zhi"]),
        "心腎不交": (["shen", "xin"], ["yin_xu", "huo"]),
        "脾胃不和": (["pi", "wei"], ["qi_zhi"]),
        "肺脾不和": (["fei", "pi"], ["qi_xu"]),
        "肝腎不交": (["gan", "shen"], ["yin_xu"]),
    }

    for pattern, result in disharmony_patterns.items():
        if pattern in name:
            return result

    # 六經病變證候
    liujing_variants = {
        "太陽表實": (["biao"], ["feng", "han"]),
        "太陽表虛": (["biao"], ["feng", "yang_xu"]),
        "太陽蓄血": (["pangguang"], ["xue_yu", "huo"]),
        "太陽蓄水": (["pangguang"], ["shui_ting"]),
        "太陽邪陷脾氣不和": (["pi"], ["feng", "qi_zhi"]),
        "太陽心陽不足": (["xin"], ["yang_xu"]),
        "太陽胸陽不振": (["xiongge"], ["yang_xu"]),
        "太陽少陽邪迫大腸": (["dachang"], ["feng", "huo"]),
        "太陽陽明邪迫大腸": (["dachang"], ["feng", "huo"]),
        "陽明腑實": (["wei", "dachang"], ["huo", "shi_ji"]),
        "陽明經": (["wei"], ["huo"]),
        "少陽兼表": (["dan", "biao"], ["huo", "feng"]),
        "少陽兼里實": (["dan"], ["huo", "shi_ji"]),
        "少陽兼裡實": (["dan"], ["huo", "shi_ji"]),  # 繁體裡
        "少陽半表半里": (["dan"], ["huo"]),
        "少陽半表半裡": (["dan"], ["huo"]),  # 繁體裡
        "少陰兼表": (["shen", "xin", "biao"], ["yang_xu", "feng"]),
        "少陰兼陽明": (["shen", "xin", "wei"], ["yang_xu", "huo"]),
        "少陰陰盛格陽": (["shen", "xin"], ["yang_xu", "han"]),
        "少陰陰盛戴陽": (["shen", "xin"], ["yang_xu", "han"]),
        "厥陰蛔厥": (["gan"], ["han", "chong_ji"]),
        "三陽合病": (["biao", "dan", "wei"], ["feng", "huo"]),
    }

    for pattern, result in liujing_variants.items():
        if name == pattern or name.startswith(pattern):
            return result

    # 特殊病性證候
    special_natures = {
        "肌膚失養": (["jifu"], ["xue_xu"]),
        "心陽暴脫": (["xin"], ["wang_yang"]),
        "腎不納氣": (["shen"], ["qi_xu"]),
        "膀胱失約": (["pangguang"], ["qi_xu", "bu_gu"]),
        "肺氣衰絕": (["fei"], ["qi_tuo"]),
        "逆傳心包": (["xin"], ["huo"]),
        "邪伏膜原": (["banbiaobanli"], ["shi", "huo"]),
        "失神": (["xin"], ["qi_xu"]),
        "脾約": (["pi"], ["yin_xu", "huo"]),
        "胃強脾弱": (["pi", "wei"], ["yin_xu"]),
        "血脫": ([], ["dong_xue", "qi_tuo"]),
        "精脫": (["shen"], ["jing_kui", "qi_tuo"]),
        "食傷脾胃": (["pi", "wei"], ["shi_ji"]),
        "小兒驚恐驚嚇": (["xin"], ["feng"]),
    }

    for pattern, result in special_natures.items():
        if pattern in name:
            return result

    return None


def tag_syndrome(syndrome_data: dict, location_map: Dict[str, str],
                 nature_map: Dict[str, str]) -> Tuple[dict, List[str]]:
    """
    為單個證候添加證素標註
    返回: (更新後的資料, 問題列表)
    """
    name = syndrome_data.get("name", "")
    locations, natures, issues = extract_zhengsu_from_name(name, location_map, nature_map)

    # 添加證素組成欄位
    syndrome_data["zhengsu_composition"] = {
        "location": sorted(locations),
        "nature": sorted(natures)
    }

    return syndrome_data, issues


def process_all_syndromes():
    """
    處理所有證候檔案
    """
    location_map, nature_map = build_extended_mappings()

    results = {
        "total": 0,
        "auto_tagged": 0,
        "needs_review": []
    }

    # 確保分析目錄存在
    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)

    # 遍歷所有證候檔案（排除索引檔案）
    syndrome_files = [f for f in SYNDROMES_DIR.glob("*.json") if f.name != "index.json"]
    results["total"] = len(syndrome_files)

    print(f"開始處理 {results['total']} 個證候檔案...")

    for filepath in syndrome_files:
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)

            updated_data, issues = tag_syndrome(data, location_map, nature_map)

            # 寫回檔案
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(updated_data, f, ensure_ascii=False, indent=2)

            if issues:
                results["needs_review"].append({
                    "id": data.get("id", filepath.stem),
                    "name": data.get("name", ""),
                    "reason": "; ".join(issues),
                    "tagged_location": updated_data["zhengsu_composition"]["location"],
                    "tagged_nature": updated_data["zhengsu_composition"]["nature"]
                })
            else:
                results["auto_tagged"] += 1

        except Exception as e:
            results["needs_review"].append({
                "id": filepath.stem,
                "name": "",
                "reason": f"處理錯誤: {str(e)}"
            })

    # 統計信息
    results["auto_tagged"] = results["total"] - len(results["needs_review"])

    # 寫入報告
    report_path = ANALYSIS_DIR / "zhengsu_tagging_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n標註完成!")
    print(f"總計: {results['total']} 個證候")
    print(f"自動標註成功: {results['auto_tagged']} 個")
    print(f"需人工確認: {len(results['needs_review'])} 個")
    print(f"報告已保存至: {report_path}")

    return results


if __name__ == "__main__":
    process_all_syndromes()
