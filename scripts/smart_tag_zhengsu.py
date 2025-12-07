#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
智能證素標註腳本 - 基於病機分析
為證候添加 zhengsu_composition, tagging_confidence, tagging_reasoning
"""

import json
from pathlib import Path
from typing import Dict, List, Tuple

PROJECT_ROOT = Path(__file__).parent.parent
SYNDROMES_DIR = PROJECT_ROOT / "data" / "zhenghou" / "syndromes"
ANALYSIS_DIR = PROJECT_ROOT / "data" / "analysis"


# 基礎證候的智能標註規則（根據病機分析）
BASIC_SYNDROME_RULES: Dict[str, Dict] = {
    # ===== 氣機病變 (1-6) =====
    "氣虛證": {
        "location": [],
        "nature": ["qi_xu"],
        "confidence": "high",
        "reasoning": "全身性基礎虛證，元氣不足，臟腑功能衰退。無特定臟腑定位，是各臟腑氣虛證的基礎。"
    },
    "氣陷證": {
        "location": ["pi"],
        "nature": ["qi_xu", "qi_xian"],
        "confidence": "high",
        "reasoning": "氣陷是氣虛的進一步發展，主要表現為中氣下陷。病機核心在脾，脾主升清，脾氣不升則中氣下陷，可見脫肛、子宮下垂等下陷症狀。"
    },
    "氣脫證": {
        "location": [],
        "nature": ["qi_tuo"],
        "confidence": "high",
        "reasoning": "危重證候，元氣欲脫。可發生於各臟腑的危急階段，無固定病位。表現為大汗淋漓、氣息微弱、脈微欲絕。"
    },
    "氣滯證": {
        "location": [],
        "nature": ["qi_zhi"],
        "confidence": "high",
        "reasoning": "全身性氣機阻滯證候。多因情志不舒所致，可發生於各臟腑部位，以脹悶、走竄疼痛為特點。"
    },
    "氣逆證": {
        "location": [],
        "nature": ["qi_ni"],
        "confidence": "high",
        "reasoning": "氣機當降不降，上逆為患。常見於肺（咳喘）、胃（呃逆嘔吐）、肝（頭脹頭痛）等臟腑，是全身性病機概念。"
    },
    "氣閉證": {
        "location": [],
        "nature": ["qi_bi"],
        "confidence": "high",
        "reasoning": "氣機閉阻不通。多為實證，可因痰、熱、瘀等邪氣閉阻所致。常見於心（神志昏迷）、肺（窒息）等急症。"
    },

    # ===== 血液病變 (7-12) =====
    "血虛證": {
        "location": [],
        "nature": ["xue_xu"],
        "confidence": "high",
        "reasoning": "全身性基礎虛證，血液虧虛不能濡養臟腑肌膚。無特定病位，以面色蒼白、頭暈心悸、脈細為特點。"
    },
    "血脫證": {
        "location": [],
        "nature": ["dong_xue", "qi_tuo"],
        "confidence": "high",
        "reasoning": "危重證候，大量出血導致血氣俱脫。血為氣之載體，血脫則氣亦隨之外脫，故兼有氣脫表現。"
    },
    "血瘀證": {
        "location": [],
        "nature": ["xue_yu"],
        "confidence": "high",
        "reasoning": "全身性病機，血液運行不暢或離經之血停滯體內。無特定病位，以固定刺痛、舌紫脈澀為特點。"
    },
    "血熱證": {
        "location": [],
        "nature": ["xue_re"],
        "confidence": "high",
        "reasoning": "熱邪侵入血分，血熱妄行。表現為出血鮮紅、身熱煩躁、舌紅絳。是全身性熱證深入血分的表現。"
    },
    "血燥證": {
        "location": [],
        "nature": ["xue_xu", "zao"],
        "confidence": "high",
        "reasoning": "血虛失養，兼有燥象。血虛不能濡潤肌膚筋脈，出現皮膚乾燥脫屑、瘙癢等燥象，體現血虛生燥的病機。"
    },
    "血寒證": {
        "location": [],
        "nature": ["xue_han"],
        "confidence": "high",
        "reasoning": "寒邪客於血脈，血行凝滯。表現為疼痛、肢冷、脈遲緊。是寒邪影響血液運行的全身性病機。"
    },

    # ===== 精津病變 (13-14) =====
    "精脫證": {
        "location": ["shen"],
        "nature": ["jing_kui", "qi_tuo"],
        "confidence": "high",
        "reasoning": "危重證候，腎精耗竭。腎藏精，精脫則元氣亦脫。常見於久病虛極或暴病傷精，病位在腎。"
    },
    "陰虛津虧證": {
        "location": [],
        "nature": ["yin_xu", "jin_kui"],
        "confidence": "high",
        "reasoning": "陰液和津液同虧。陰虛則內熱，津虧則燥象，二者常相互影響。是陰虛證和津液虧損的複合表現。"
    },

    # ===== 陰陽病變 (15-18) =====
    "陰虛證": {
        "location": [],
        "nature": ["yin_xu"],
        "confidence": "high",
        "reasoning": "全身性基礎虛證，陰精不足，陰不制陽。表現為潮熱盜汗、五心煩熱、舌紅脈細數，體現陰虛內熱的病機。"
    },
    "陽虛證": {
        "location": [],
        "nature": ["yang_xu"],
        "confidence": "high",
        "reasoning": "全身性基礎虛證，陽氣不足，溫煦失職。表現為畏寒肢冷、面白、脈沉遲，體現陽虛生寒的病機。"
    },
    "亡陰證": {
        "location": [],
        "nature": ["wang_yin"],
        "confidence": "high",
        "reasoning": "危重證候，陰液耗竭將盡。常見於熱病後期或大汗傷津。表現為身熱汗出如油、煩躁、脈細數疾。"
    },
    "亡陽證": {
        "location": [],
        "nature": ["wang_yang"],
        "confidence": "high",
        "reasoning": "危重證候，陽氣暴脫欲亡。常見於大汗、大吐、大瀉後。表現為冷汗淋漓、四肢厥冷、脈微欲絕。"
    },

    # ===== 神志病變 (19) =====
    "失神證": {
        "location": ["xin"],
        "nature": ["qi_xu"],
        "confidence": "high",
        "reasoning": "心主神明，失神病位在心。反映心神失養或心氣虛弱，表現為精神萎靡、反應遲鈍、目光無神。"
    },

    # ===== 六淫外邪 (20-25) =====
    "風證": {
        "location": [],
        "nature": ["feng"],
        "confidence": "high",
        "reasoning": "外感風邪所致的基礎證候。風為百病之長，善行數變。表現為遊走性、發病急、變化快的特點。"
    },
    "寒證": {
        "location": [],
        "nature": ["han"],
        "confidence": "high",
        "reasoning": "寒邪侵襲所致的基礎證候。寒性收引凝滯，表現為惡寒、疼痛、脈緊遲等收縮凝滯之象。"
    },
    "暑證": {
        "location": [],
        "nature": ["shu"],
        "confidence": "high",
        "reasoning": "感受暑熱之邪所致的基礎證候。暑為陽邪，易傷氣耗津，表現為身熱汗多、口渴、倦怠。"
    },
    "濕證": {
        "location": [],
        "nature": ["shi"],
        "confidence": "high",
        "reasoning": "濕邪侵襲所致的基礎證候。濕性重濁黏滯，表現為肢體困重、苔膩、病程纏綿難愈。"
    },
    "燥證": {
        "location": [],
        "nature": ["zao"],
        "confidence": "high",
        "reasoning": "燥邪傷津所致的基礎證候。燥性乾澀，易傷肺胃津液，表現為口乾咽燥、皮膚乾裂。"
    },
    "火熱證": {
        "location": [],
        "nature": ["huo"],
        "confidence": "high",
        "reasoning": "火熱之邪所致的基礎證候。熱為陽邪，易傷陰耗氣，表現為發熱、口渴、面紅、脈數。"
    },

    # ===== 病理產物 (26-27) =====
    "痰證": {
        "location": [],
        "nature": ["tan"],
        "confidence": "high",
        "reasoning": "痰濁內生所致的基礎證候。痰為津液代謝障礙的病理產物，可隨氣流竄，無處不到，故無固定病位。"
    },
    "邪毒熾盛證": {
        "location": [],
        "nature": ["du", "huo"],
        "confidence": "high",
        "reasoning": "毒邪熾盛的基礎證候。毒為邪氣之甚者，常與熱相兼為患。表現為紅腫熱痛、潰爛、高熱等。"
    },

    # ===== 六經證候 (28-33) =====
    "太陽證": {
        "location": ["biao"],
        "nature": ["feng", "han"],
        "confidence": "high",
        "reasoning": "傷寒太陽病證，外感風寒初起，邪在肌表。太陽主一身之表，表現為惡寒、頭項強痛、脈浮。"
    },
    "陽明證": {
        "location": ["wei", "dachang"],
        "nature": ["huo"],
        "confidence": "high",
        "reasoning": "傷寒陽明病證，裡熱熾盛。陽明主胃腸，表現為身熱、汗出、口渴、便秘、脈洪大。"
    },
    "少陽證": {
        "location": ["dan"],
        "nature": ["huo"],
        "confidence": "high",
        "reasoning": "傷寒少陽病證，邪在半表半裡。少陽主樞，膽與三焦相表裡，表現為往來寒熱、胸脅苦滿、口苦。"
    },
    "太陰證": {
        "location": ["pi"],
        "nature": ["yang_xu", "han", "shi"],
        "confidence": "high",
        "reasoning": "傷寒太陰病證，脾陽虛寒濕內盛。太陰主脾，表現為腹滿、吐利、食不下、脈遲緩。"
    },
    "厥陰證": {
        "location": ["gan"],
        "nature": ["han"],
        "confidence": "medium",
        "reasoning": "傷寒厥陰病證，寒熱錯雜，肝失疏洩。厥陰主肝，病機複雜，可見寒熱往來、厥熱勝復。標為medium因為厥陰病機複雜多變。"
    },
    "少陰證": {
        "location": ["shen", "xin"],
        "nature": ["yang_xu"],
        "confidence": "high",
        "reasoning": "傷寒少陰病證，心腎陽虛。少陰主心腎，表現為脈微細、但欲寐、畏寒肢冷。少陰病多為陽虛。"
    },

    # ===== 衛氣營血 (34-37) =====
    "衛分證": {
        "location": ["biao", "fei"],
        "nature": ["feng", "huo"],
        "confidence": "high",
        "reasoning": "溫病初期，溫邪襲表犯肺。衛分主皮毛，肺主皮毛，故兼有肺衛症狀。表現為發熱微惡寒、咳嗽、脈浮數。"
    },
    "氣分證": {
        "location": [],
        "nature": ["huo"],
        "confidence": "high",
        "reasoning": "溫病進展，熱邪入氣分。氣分涵蓋範圍廣，無固定病位。表現為壯熱、汗多、口渴、脈洪大。"
    },
    "營分證": {
        "location": ["xin"],
        "nature": ["huo"],
        "confidence": "high",
        "reasoning": "溫病深入，熱入營分擾心。營血為心所主，熱入營分必擾心神。表現為身熱夜甚、神昏譫語、斑疹隱隱。"
    },
    "血分證": {
        "location": ["xin"],
        "nature": ["huo", "dong_xue"],
        "confidence": "high",
        "reasoning": "溫病重症，熱入血分。熱盛動血，迫血妄行。表現為斑疹顯露、吐血衄血、神昏抽搐。病位在心因心主血。"
    },
}


def tag_basic_syndrome(syndrome_data: dict) -> dict:
    """
    為基礎證候添加智能標註
    """
    name = syndrome_data.get("name", "")

    if name in BASIC_SYNDROME_RULES:
        rule = BASIC_SYNDROME_RULES[name]
        syndrome_data["zhengsu_composition"] = {
            "location": rule["location"],
            "nature": rule["nature"]
        }
        syndrome_data["tagging_confidence"] = rule["confidence"]
        syndrome_data["tagging_reasoning"] = rule["reasoning"]
    else:
        # 保留原有標註但標記為需要審核
        if "zhengsu_composition" not in syndrome_data:
            syndrome_data["zhengsu_composition"] = {
                "location": [],
                "nature": []
            }
        syndrome_data["tagging_confidence"] = "low"
        syndrome_data["tagging_reasoning"] = "未找到對應的標註規則，需人工審核"

    return syndrome_data


def process_basic_syndromes():
    """
    處理所有基礎證候
    """
    results = {
        "total": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
        "details": []
    }

    # 找出所有基礎證候
    basic_syndromes = []
    for filepath in SYNDROMES_DIR.glob("*.json"):
        if filepath.name == "index.json":
            continue
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        if data.get("category") == "基礎證候":
            basic_syndromes.append((filepath, data))

    results["total"] = len(basic_syndromes)
    print(f"找到 {results['total']} 個基礎證候")

    for filepath, data in basic_syndromes:
        # 標註
        updated_data = tag_basic_syndrome(data)

        # 寫回檔案
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(updated_data, f, ensure_ascii=False, indent=2)

        # 統計
        confidence = updated_data.get("tagging_confidence", "low")
        if confidence == "high":
            results["high"] += 1
        elif confidence == "medium":
            results["medium"] += 1
        else:
            results["low"] += 1

        results["details"].append({
            "name": data.get("name"),
            "id": data.get("id"),
            "confidence": confidence,
            "location": updated_data["zhengsu_composition"]["location"],
            "nature": updated_data["zhengsu_composition"]["nature"],
            "reasoning": updated_data.get("tagging_reasoning", "")
        })

    # 保存報告
    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    report_path = ANALYSIS_DIR / "basic_syndrome_tagging_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n標註完成！")
    print(f"High: {results['high']}")
    print(f"Medium: {results['medium']}")
    print(f"Low: {results['low']}")
    print(f"報告已保存至: {report_path}")

    return results


if __name__ == "__main__":
    process_basic_syndromes()
