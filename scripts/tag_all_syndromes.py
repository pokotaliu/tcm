#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
智能證素標註腳本 - 處理所有證候類別
為證候添加 zhengsu_composition, tagging_confidence, tagging_reasoning
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Tuple, Optional

PROJECT_ROOT = Path(__file__).parent.parent
SYNDROMES_DIR = PROJECT_ROOT / "data" / "zhenghou" / "syndromes"
ANALYSIS_DIR = PROJECT_ROOT / "data" / "analysis"

# ===== 證素映射表 =====

# 病位關鍵詞映射
LOCATION_KEYWORDS: Dict[str, List[str]] = {
    # 五臟
    "fei": ["肺", "呼吸", "皮毛", "鼻"],
    "xin": ["心", "心包", "神明", "血脈"],
    "gan": ["肝", "筋", "目"],
    "pi": ["脾", "運化", "肌肉"],
    "shen": ["腎", "命門", "髓", "骨", "耳", "二陰"],
    # 六腑
    "wei": ["胃", "胃脘"],
    "dachang": ["大腸", "腸道"],
    "xiaochang": ["小腸"],
    "dan": ["膽"],
    "pangguang": ["膀胱", "水道"],
    # 其他
    "biao": ["表", "肌表", "衛"],
    "baogong": ["胞宮", "子宮", "沖任"],
    "jingshi": ["精室", "精"],
    "jifu": ["肌膚", "皮膚"],
    "jingluo": ["經絡", "脈絡"],
    "jingu": ["筋骨", "筋脈", "關節"],
    "xiongge": ["胸膈", "胸"],
    "shaofu": ["少腹", "小腹"],
}

# 病性關鍵詞映射
NATURE_KEYWORDS: Dict[str, List[str]] = {
    # 氣病
    "qi_xu": ["氣虛", "氣弱", "虛弱", "兩虛", "俱虛", "虧虛", "衰絕", "衰竭", "中虛", "氣陰兩虛", "氣血兩虛", "心脾兩虛"],
    "qi_xian": ["氣陷", "下陷", "滑脫"],
    "qi_tuo": ["氣脫", "虛脫", "暴脫", "亡脫"],
    "qi_zhi": ["氣滯", "氣鬱", "鬱", "痞塞", "氣結", "不和", "不調", "不交"],
    "qi_ni": ["氣逆", "上逆", "上衝", "上擾", "凌心", "上亢"],
    "qi_bi": ["氣閉", "閉"],
    "qi_jue": ["氣厥"],
    # 血病
    "xue_xu": ["血虛", "血虧", "血少", "營虛", "營傷", "精血虧", "氣血兩虛"],
    "xue_yu": ["血瘀", "瘀血", "瘀", "蓄血", "敗血", "血络痹阻"],
    "xue_re": ["血熱", "燔", "兩燔"],
    "xue_han": ["血寒"],
    "dong_xue": ["動血", "出血", "血脫"],
    # 陰陽
    "yin_xu": ["陰虛", "陰虧", "陰兩虛", "液乾", "陰盛", "液虧"],
    "yang_xu": ["陽虛", "陽弱", "陽不足", "陰陽兩虛", "陽俱虛", "胸陽不振", "心陽不足"],
    "yang_kang": ["陽亢", "陽浮", "陽上擾", "戴陽", "格陽", "浮陽"],
    "wang_yin": ["亡陰"],
    "wang_yang": ["亡陽"],
    # 外邪
    "feng": ["風"],
    "han": ["寒", "寒凝"],
    "shu": ["暑"],
    "shi": ["濕"],
    "zao": ["燥", "便結", "便秘"],
    "huo": ["熱", "火", "熱毒", "溫", "燔", "經證", "腑實"],
    # 病理產物
    "tan": ["痰"],
    "du": ["毒", "疫毒", "蟲積", "蛔厥"],
    "shui_ting": ["水停", "水飲", "水泛", "飲停", "水濕", "水氣"],
    # 其他
    "jin_kui": ["津虧", "津液", "液乾"],
    "jing_kui": ["精虧", "精脫", "精不足", "精血虧", "髓虧"],
    "dong_feng": ["生風", "動風", "內風", "驚恐", "驚嚇", "驚風"],
    "bu_gu": ["不固", "失約", "不納氣"],
    "shi_ji": ["食積", "食滯", "食傷", "脾約", "胃強脾弱"],
}

# 複合證候特殊規則（需要特別處理的證候）
SPECIAL_RULES: Dict[str, Dict] = {
    # 真假寒熱
    "真寒假熱證": {
        "location": [],
        "nature": ["yang_xu"],
        "confidence": "high",
        "reasoning": "陽虛至極，虛陽外浮。本質是陽虛內寒，外現假熱之象（面紅、身熱），但欲蓋衣被、四肢厥冷。"
    },
    "真熱假寒證": {
        "location": [],
        "nature": ["huo"],
        "confidence": "high",
        "reasoning": "熱極至深，陽氣內鬱不達四末。本質是裡熱熾盛，外現假寒（四肢厥冷），但身熱不惡寒、渴喜冷飲。"
    },
    "虛陽浮越證": {
        "location": [],
        "nature": ["yang_xu", "yang_kang"],
        "confidence": "high",
        "reasoning": "陽虛根本不固，虛陽浮散於外。表現為下寒上熱，面紅如妝但足冷，是危重證候前兆。"
    },
    # 清濁升降
    "清陽不升證": {
        "location": ["pi"],
        "nature": ["qi_xu", "qi_xian"],
        "confidence": "high",
        "reasoning": "脾氣不升，清陽不能上達頭目。表現為頭暈目眩、神疲乏力、腹瀉。病機關鍵在脾。"
    },
    "濁陰不降證": {
        "location": ["wei"],
        "nature": ["qi_ni"],
        "confidence": "high",
        "reasoning": "胃氣不降，濁陰上逆。表現為噁心嘔吐、腹脹納呆。胃主降濁，濁陰不降病位在胃。"
    },
    # 氣血兩虛
    "氣血兩虛證": {
        "location": [],
        "nature": ["qi_xu", "xue_xu"],
        "confidence": "high",
        "reasoning": "氣血互生互化，虛損互因。氣虛則血無以生，血虛則氣無以附。表現為神疲乏力、面色蒼白、頭暈心悸。"
    },
    "氣陰兩虛證": {
        "location": [],
        "nature": ["qi_xu", "yin_xu"],
        "confidence": "high",
        "reasoning": "氣陰俱傷，多見於熱病後期或慢性消耗性疾病。氣虛則倦怠乏力，陰虛則口乾潮熱。"
    },
    "陰陽兩虛證": {
        "location": [],
        "nature": ["yin_xu", "yang_xu"],
        "confidence": "high",
        "reasoning": "陰陽互根，陰損及陰或陽損及陰。久病必致陰陽俱虛，既有畏寒肢冷又有潮熱盜汗。"
    },

    # ===== 臟腑證候特殊規則 =====
    "腎陰陽兩虛證": {
        "location": ["shen"],
        "nature": ["yin_xu", "yang_xu"],
        "confidence": "high",
        "reasoning": "腎陰陽俱虛。腎為先天之本，陰陽互根，久病腎精虧損可致陰陽兩虛。"
    },
    "腎不納氣證": {
        "location": ["shen", "fei"],
        "nature": ["qi_xu", "bu_gu"],
        "confidence": "high",
        "reasoning": "腎氣虛不能攝納肺氣。腎主納氣，肺主呼吸，腎虛則氣浮於上，表現為喘促、呼多吸少。"
    },
    "精血虧虛證": {
        "location": ["shen", "gan"],
        "nature": ["jing_kui", "xue_xu"],
        "confidence": "high",
        "reasoning": "精血同源，肝藏血、腎藏精，精血虧虛多涉肝腎。表現為頭暈目眩、腰膝酸軟。"
    },
    "心陽暴脫證": {
        "location": ["xin"],
        "nature": ["yang_xu", "qi_tuo"],
        "confidence": "high",
        "reasoning": "心陽突然衰竭欲脫。危重證候，表現為面色蒼白、四肢厥冷、脈微欲絕。"
    },
    "腎虛髓虧證": {
        "location": ["shen"],
        "nature": ["jing_kui"],
        "confidence": "high",
        "reasoning": "腎主骨生髓，腎精不足則髓海空虛。表現為腰膝酸軟、頭暈健忘、骨軟無力。"
    },
    "食傷脾胃證": {
        "location": ["pi", "wei"],
        "nature": ["shi_ji"],
        "confidence": "high",
        "reasoning": "飲食不節損傷脾胃。食積內停，表現為脘腹脹滿、噯腐吞酸、不思飲食。"
    },
    "心腎不交證": {
        "location": ["xin", "shen"],
        "nature": ["yin_xu", "huo"],
        "confidence": "high",
        "reasoning": "心腎水火不濟。腎水不能上濟心火，心火不能下交腎水，表現為心煩失眠、腰膝酸軟。"
    },
    "腎精不足證": {
        "location": ["shen"],
        "nature": ["jing_kui"],
        "confidence": "high",
        "reasoning": "腎精虧虛不足。腎主藏精，精虧則發育遲緩、早衰、生殖功能減退。"
    },
    "膀胱失約證": {
        "location": ["pangguang"],
        "nature": ["qi_xu", "bu_gu"],
        "confidence": "high",
        "reasoning": "膀胱約束無力。氣虛不能固攝，表現為小便頻數、遺尿、尿失禁。"
    },
    "肝胃不和證": {
        "location": ["gan", "wei"],
        "nature": ["qi_zhi"],
        "confidence": "high",
        "reasoning": "肝氣橫逆犯胃。肝失疏洩，胃失和降，表現為胃脘脹痛、噯氣、泛酸。"
    },
    "水氣凌心證": {
        "location": ["xin"],
        "nature": ["yang_xu", "shui_ting"],
        "confidence": "high",
        "reasoning": "水飲上凌心肺。腎陽虛水液泛濫，上凌於心，表現為心悸、胸悶、水腫。"
    },
    "肺氣陰兩虛證": {
        "location": ["fei"],
        "nature": ["qi_xu", "yin_xu"],
        "confidence": "high",
        "reasoning": "肺氣陰俱虛。久病耗傷肺氣肺陰，表現為咳嗽無力、氣短、口乾、潮熱。"
    },
    "胃強脾弱證": {
        "location": ["pi", "wei"],
        "nature": ["huo", "qi_xu"],
        "confidence": "high",
        "reasoning": "胃熱脾虛。胃火亢盛消穀善飢，脾虛運化無力則便溏，表現為多食易飢、大便溏薄。"
    },
    "心氣陰兩虛證": {
        "location": ["xin"],
        "nature": ["qi_xu", "yin_xu"],
        "confidence": "high",
        "reasoning": "心氣心陰俱虛。久病耗傷心氣心陰，表現為心悸氣短、口乾、五心煩熱。"
    },
    "肝陽上亢證": {
        "location": ["gan"],
        "nature": ["yin_xu", "yang_kang"],
        "confidence": "high",
        "reasoning": "肝腎陰虛，肝陽偏亢。陰不制陽，肝陽上擾，表現為頭暈頭痛、面紅目赤、急躁易怒。"
    },
    "肝脾不調證": {
        "location": ["gan", "pi"],
        "nature": ["qi_zhi", "qi_xu"],
        "confidence": "high",
        "reasoning": "肝鬱脾虛。肝失疏洩，脾失健運，表現為胸脅脹滿、腹脹、便溏。"
    },
    "肺氣衰絕證": {
        "location": ["fei"],
        "nature": ["qi_xu", "qi_tuo"],
        "confidence": "high",
        "reasoning": "肺氣衰竭欲絕。危重證候，肺主氣司呼吸功能衰竭，表現為呼吸微弱、汗出如油。"
    },
    "心脾兩虛證": {
        "location": ["xin", "pi"],
        "nature": ["qi_xu", "xue_xu"],
        "confidence": "high",
        "reasoning": "心脾氣血俱虛。思慮過度傷心脾，氣血生化不足，表現為心悸失眠、食少便溏。"
    },
    "心氣血兩虛證": {
        "location": ["xin"],
        "nature": ["qi_xu", "xue_xu"],
        "confidence": "high",
        "reasoning": "心氣心血俱虛。心失所養，表現為心悸怔忡、面色無華、神疲乏力。"
    },
    "艾滋病肺氣陰兩虛證": {
        "location": ["fei"],
        "nature": ["qi_xu", "yin_xu"],
        "confidence": "high",
        "reasoning": "艾滋病致肺氣陰兩虛。疫毒耗傷肺氣肺陰，表現為咳嗽氣短、潮熱盜汗。"
    },

    # ===== 傷寒證候特殊規則 =====
    "大結胸證": {
        "location": ["xiongge"],
        "nature": ["huo", "shui_ting"],
        "confidence": "high",
        "reasoning": "邪熱與水飲結於胸膈。表現為胸腹硬滿疼痛，從心下至少腹硬滿而痛，按之石硬。"
    },
    "少陽兼表證": {
        "location": ["dan", "biao"],
        "nature": ["huo", "feng"],
        "confidence": "high",
        "reasoning": "少陽病兼有表證未解。表現為往來寒熱兼惡風寒、頭痛。"
    },
    "少陰陰盛格陽證": {
        "location": ["shen"],
        "nature": ["yang_xu", "yang_kang"],
        "confidence": "high",
        "reasoning": "少陰陰寒內盛，格陽於外。真寒假熱，表現為身大熱而欲近衣、下利清谷。"
    },
    "太陽表虛證": {
        "location": ["biao"],
        "nature": ["feng", "qi_xu"],
        "confidence": "high",
        "reasoning": "太陽中風證，衛強營弱。表虛有汗，表現為發熱、汗出、惡風、脈浮緩。"
    },
    "少陽半表半里證": {
        "location": ["dan"],
        "nature": ["huo"],
        "confidence": "high",
        "reasoning": "邪在少陽半表半里。表現為往來寒熱、胸脅苦滿、口苦、咽乾、目眩。"
    },
    "太陽心氣陰兩虛證": {
        "location": ["xin", "biao"],
        "nature": ["qi_xu", "yin_xu"],
        "confidence": "high",
        "reasoning": "太陽病誤治後心氣心陰俱傷。表現為心悸、汗出、脈結代。"
    },
    "三陽合病證": {
        "location": ["biao", "wei", "dan"],
        "nature": ["huo"],
        "confidence": "high",
        "reasoning": "太陽、陽明、少陽三經同時受邪。表現為頭痛、身熱、口苦、便秘等。"
    },
    "下焦滑脫證": {
        "location": ["shen", "dachang"],
        "nature": ["yang_xu", "bu_gu"],
        "confidence": "high",
        "reasoning": "下焦虛寒滑脫。腎陽虛不能固攝，表現為下利不止、滑脫不禁。"
    },
    "太陽陰陽俱虛證": {
        "location": ["biao"],
        "nature": ["yin_xu", "yang_xu"],
        "confidence": "high",
        "reasoning": "太陽病誤治後陰陽俱傷。表現為汗出、惡寒、發熱、脈微弱。"
    },
    "太陽少陽邪迫大腸證": {
        "location": ["dachang", "biao", "dan"],
        "nature": ["huo"],
        "confidence": "high",
        "reasoning": "太陽少陽合病，邪熱迫於大腸。表現為下利、發熱、往來寒熱。"
    },
    "太陽表實經輸不利證": {
        "location": ["biao", "jingluo"],
        "nature": ["han", "shi"],
        "confidence": "high",
        "reasoning": "太陽傷寒兼經絡不利。表現為身疼痛、項背強、無汗。"
    },
    "太陽邪陷脾虛胃實證": {
        "location": ["pi", "wei", "biao"],
        "nature": ["qi_xu", "huo"],
        "confidence": "high",
        "reasoning": "太陽病誤下後脾虛胃實。表現為下利、腹脹滿、心下痞硬。"
    },
    "少陽兼表及里虛實錯雜證": {
        "location": ["dan", "biao"],
        "nature": ["huo", "qi_xu"],
        "confidence": "high",
        "reasoning": "少陽病兼表證及裡虛實夾雜。病機複雜，寒熱虛實並見。"
    },
    "太陽蓄水證": {
        "location": ["pangguang"],
        "nature": ["shui_ting"],
        "confidence": "high",
        "reasoning": "太陽之邪入裡，膀胱氣化不利。表現為小便不利、煩渴、水入即吐。"
    },
    "臟結證": {
        "location": ["pi"],
        "nature": ["yang_xu", "xue_yu"],
        "confidence": "high",
        "reasoning": "陽虛陰結於內。臟氣虛寒，邪結不解，表現為心下痞硬、繞臍痛。"
    },
    "太陽邪陷脾氣不和證": {
        "location": ["pi", "biao"],
        "nature": ["qi_xu"],
        "confidence": "high",
        "reasoning": "太陽病誤治後脾氣失和。表現為腹脹、下利、不欲食。"
    },
    "太陽陰盛虛陽上擾證": {
        "location": ["biao"],
        "nature": ["yang_xu", "yang_kang"],
        "confidence": "high",
        "reasoning": "太陽病陰盛陽浮。下焦虛寒，虛陽上擾，表現為煩躁、厥冷。"
    },
    "陽明腑實證": {
        "location": ["wei", "dachang"],
        "nature": ["huo", "zao"],
        "confidence": "high",
        "reasoning": "陽明熱結腸腑。燥屎內結，表現為潮熱、譫語、腹滿硬痛、便秘。"
    },
    "太陽表實證": {
        "location": ["biao"],
        "nature": ["han"],
        "confidence": "high",
        "reasoning": "太陽傷寒證，寒邪束表。表實無汗，表現為惡寒、發熱、無汗、頭身疼痛、脈浮緊。"
    },
    "脾約證": {
        "location": ["pi"],
        "nature": ["yin_xu", "zao"],
        "confidence": "high",
        "reasoning": "脾陰不足，津液不能四布。胃強脾弱，津液偏滲膀胱，表現為大便硬、小便數。"
    },
    "陽明經證": {
        "location": ["wei"],
        "nature": ["huo"],
        "confidence": "high",
        "reasoning": "陽明熱盛於經。邪熱熾盛，表現為身大熱、大汗、大渴、脈洪大。"
    },
    "太陽陰陽兩虛虛陽上擾證": {
        "location": ["biao"],
        "nature": ["yin_xu", "yang_xu", "yang_kang"],
        "confidence": "high",
        "reasoning": "太陽病誤治後陰陽兩虛，虛陽上擾。表現為心煩、汗出、厥冷。"
    },
    "小結胸證": {
        "location": ["xiongge"],
        "nature": ["tan", "huo"],
        "confidence": "high",
        "reasoning": "痰熱互結於心下。表現為心下痞、按之則痛，病位較大結胸為輕。"
    },
    "太陽心陽不足證": {
        "location": ["xin", "biao"],
        "nature": ["yang_xu"],
        "confidence": "high",
        "reasoning": "太陽病誤治後心陽虛。表現為心悸、胸悶、四肢厥冷。"
    },
    "少陰兼陽明證": {
        "location": ["shen", "wei"],
        "nature": ["yang_xu", "huo"],
        "confidence": "high",
        "reasoning": "少陰病兼陽明燥實。表現為下利清谷兼腹滿硬痛。"
    },
    "太陽表虛肺氣不利證": {
        "location": ["fei", "biao"],
        "nature": ["feng", "qi_xu"],
        "confidence": "high",
        "reasoning": "太陽中風兼肺氣不利。表現為發熱汗出、咳嗽、喘息。"
    },
    "太陽營傷經脈失養證": {
        "location": ["biao", "jingluo"],
        "nature": ["xue_xu"],
        "confidence": "high",
        "reasoning": "太陽病營血不足，經脈失養。表現為身體瞤動、肢體麻木。"
    },
    "少陰陰盛戴陽證": {
        "location": ["shen"],
        "nature": ["yang_xu", "yang_kang"],
        "confidence": "high",
        "reasoning": "少陰陰寒內盛，戴陽於上。真寒假熱，表現為面赤、下利清谷、四肢厥冷。"
    },
    "太陽陽明邪迫大腸證": {
        "location": ["dachang", "biao", "wei"],
        "nature": ["huo"],
        "confidence": "high",
        "reasoning": "太陽陽明合病，邪熱迫於大腸。表現為發熱、下利、腹痛。"
    },
    "少陰兼表證": {
        "location": ["shen", "biao"],
        "nature": ["yang_xu", "han"],
        "confidence": "high",
        "reasoning": "少陰病兼太陽表證未解。表現為惡寒、發熱、脈微細。"
    },
    "太陽蓄血證": {
        "location": ["pangguang"],
        "nature": ["xue_yu", "huo"],
        "confidence": "high",
        "reasoning": "太陽之邪入裡，熱與血結於下焦。表現為少腹急結、小便自利、如狂。"
    },
    "少陽兼里實證": {
        "location": ["dan", "wei"],
        "nature": ["huo"],
        "confidence": "high",
        "reasoning": "少陽病兼陽明里實。表現為往來寒熱、腹滿便秘。"
    },
    "太陽中虛里急證": {
        "location": ["pi", "biao"],
        "nature": ["qi_xu", "han"],
        "confidence": "high",
        "reasoning": "太陽病兼中焦虛寒。表現為發熱、腹中急痛、喜溫喜按。"
    },
    "少陽氣機微結證": {
        "location": ["dan"],
        "nature": ["qi_zhi"],
        "confidence": "high",
        "reasoning": "少陽病氣機輕度鬱結。表現為胸脅苦滿、心煩、小便不利。"
    },
    "太陽胸陽不振證": {
        "location": ["xiongge", "biao"],
        "nature": ["yang_xu"],
        "confidence": "high",
        "reasoning": "太陽病誤治後胸陽不振。表現為胸悶、心悸、短氣。"
    },
    "太陽表虛經輸不利證": {
        "location": ["biao", "jingluo"],
        "nature": ["feng", "qi_xu"],
        "confidence": "high",
        "reasoning": "太陽中風兼經絡不利。表現為汗出、惡風、項背強。"
    },
    "厥陰蛔厥證": {
        "location": ["gan"],
        "nature": ["han", "du"],
        "confidence": "high",
        "reasoning": "厥陰證蛔蟲上擾。寒熱錯雜，蛔蟲內動，表現為手足厥冷、嘔吐蛔蟲。"
    },

    # ===== 溫病證候特殊規則 =====
    "液乾便結證": {
        "location": ["dachang"],
        "nature": ["yin_xu", "zao"],
        "confidence": "high",
        "reasoning": "津液耗傷，腸道乾燥。表現為大便乾結、腹滿硬痛。"
    },
    "邪伏膜原證": {
        "location": [],
        "nature": ["shi", "huo"],
        "confidence": "high",
        "reasoning": "濕熱疫毒伏於膜原。膜原為半表半裡之處，表現為寒熱往來、苔白如積粉。"
    },
    "邪留陰分證": {
        "location": [],
        "nature": ["yin_xu", "huo"],
        "confidence": "high",
        "reasoning": "溫病後期，餘熱留於陰分。表現為夜熱早涼、熱退無汗、舌紅少苔。"
    },
    "氣營兩燔證": {
        "location": [],
        "nature": ["huo", "xue_re"],
        "confidence": "high",
        "reasoning": "氣分營分同時熱盛。氣分大熱兼營分熱擾，表現為壯熱、神昏、斑疹。"
    },
    "逆傳心包證": {
        "location": ["xin"],
        "nature": ["huo"],
        "confidence": "high",
        "reasoning": "溫邪由衛分直接內陷心包。病勢急重，表現為神昏譫語、舌絳。"
    },

    # ===== 專科證候特殊規則 =====
    "肌膚失養證": {
        "location": ["jifu"],
        "nature": ["xue_xu", "zao"],
        "confidence": "high",
        "reasoning": "血虛不能濡養肌膚。表現為皮膚乾燥、瘙癢、脫屑。"
    },
    "小兒心脾兩虛證": {
        "location": ["xin", "pi"],
        "nature": ["qi_xu", "xue_xu"],
        "confidence": "high",
        "reasoning": "小兒心脾氣血俱虛。表現為面黃、食少、心悸、多夢。"
    },
    "小兒蟲積證": {
        "location": ["pi", "wei"],
        "nature": ["du"],
        "confidence": "high",
        "reasoning": "蟲積腸胃。表現為臍周腹痛、面黃肌瘦、夜間磨牙。"
    },
    "小兒脾虛肝亢證": {
        "location": ["gan", "pi"],
        "nature": ["qi_xu", "dong_feng"],
        "confidence": "high",
        "reasoning": "小兒脾虛肝旺。土虛木乘，表現為食少便溏、急躁易怒、抽搐。"
    },
    "小兒驚恐驚嚇證": {
        "location": ["xin"],
        "nature": ["dong_feng"],
        "confidence": "high",
        "reasoning": "小兒受驚驚恐。心神不寧，表現為夜啼、夜驚、睡眠不安。"
    },
    "產後敗血上衝證": {
        "location": ["baogong", "xin"],
        "nature": ["xue_yu"],
        "confidence": "high",
        "reasoning": "產後瘀血上攻。惡露不下，瘀血上衝心胸，表現為胸悶、神昏。"
    },
    "衝任虛衰證": {
        "location": ["baogong"],
        "nature": ["qi_xu", "xue_xu"],
        "confidence": "high",
        "reasoning": "衝任二脈虛弱。主司月經胎孕的衝任失養，表現為月經不調、不孕。"
    },
    "水輪陰虧證": {
        "location": ["shen"],
        "nature": ["yin_xu"],
        "confidence": "high",
        "reasoning": "眼科證候，水輪（瞳仁）屬腎，腎陰虧虛。表現為視物模糊、目乾澀。"
    },
    "氣結咽喉證": {
        "location": [],
        "nature": ["qi_zhi"],
        "confidence": "high",
        "reasoning": "氣機鬱結於咽喉。表現為咽中如有物阻、吞之不下、吐之不出（梅核氣）。"
    },
    "水輪血络痹阻證": {
        "location": ["shen"],
        "nature": ["xue_yu"],
        "confidence": "high",
        "reasoning": "眼科證候，水輪血絡瘀阻。腎絡瘀滯，表現為眼底出血、視力下降。"
    },
    "小兒心氣虧虛證": {
        "location": ["xin"],
        "nature": ["qi_xu"],
        "confidence": "high",
        "reasoning": "小兒心氣虛弱。表現為心悸、氣短、面白、易驚。"
    },
    "小兒脾胃虛弱證": {
        "location": ["pi", "wei"],
        "nature": ["qi_xu"],
        "confidence": "high",
        "reasoning": "小兒脾胃功能虛弱。表現為食少、腹脹、便溏、面黃肌瘦。"
    },
}


def extract_location_from_name(name: str) -> List[str]:
    """從證候名稱提取病位"""
    locations = []

    # 特殊處理：臟腑證候常見組合
    organ_patterns = [
        (r"心肺", ["xin", "fei"]),
        (r"心脾", ["xin", "pi"]),
        (r"心腎", ["xin", "shen"]),
        (r"心肝", ["xin", "gan"]),
        (r"肝脾", ["gan", "pi"]),
        (r"肝腎", ["gan", "shen"]),
        (r"肝胃", ["gan", "wei"]),
        (r"肝膽", ["gan", "dan"]),
        (r"肺脾", ["fei", "pi"]),
        (r"肺腎", ["fei", "shen"]),
        (r"肺胃", ["fei", "wei"]),
        (r"脾腎", ["pi", "shen"]),
        (r"脾胃", ["pi", "wei"]),
        (r"胃腸", ["wei", "dachang"]),
        (r"沖任", ["baogong"]),
    ]

    for pattern, locs in organ_patterns:
        if pattern in name:
            locations.extend(locs)
            name = name.replace(pattern, "")  # 移除已匹配的部分避免重複

    # 通用關鍵詞匹配
    for loc_id, keywords in LOCATION_KEYWORDS.items():
        for keyword in keywords:
            if keyword in name and loc_id not in locations:
                locations.append(loc_id)

    return locations


def extract_nature_from_name(name: str) -> List[str]:
    """從證候名稱提取病性"""
    natures = []

    # 特殊複合病性處理
    compound_patterns = [
        (r"寒凝血瘀|血瘀寒凝|血虛寒凝", ["han", "xue_yu"]),
        (r"氣滯血瘀|血瘀氣滯", ["qi_zhi", "xue_yu"]),
        (r"氣虛血瘀", ["qi_xu", "xue_yu"]),
        (r"痰瘀互結|痰瘀", ["tan", "xue_yu"]),
        (r"痰熱", ["tan", "huo"]),
        (r"濕熱", ["shi", "huo"]),
        (r"寒濕", ["han", "shi"]),
        (r"風寒", ["feng", "han"]),
        (r"風熱", ["feng", "huo"]),
        (r"風濕", ["feng", "shi"]),
        (r"暑濕", ["shu", "shi"]),
        (r"暑熱", ["shu", "huo"]),
        (r"溫燥|燥熱", ["zao", "huo"]),
        (r"涼燥", ["zao", "han"]),
        (r"血熱動風|熱極生風|動風", ["xue_re", "dong_feng"]),
        (r"血虛生風|血虛風", ["xue_xu", "dong_feng"]),
        (r"陰虛陽亢|陰虛陽浮", ["yin_xu", "yang_kang"]),
        (r"陰虛血熱", ["yin_xu", "xue_re"]),
        (r"陰虛血燥", ["yin_xu", "zao"]),
        (r"陰虛動風", ["yin_xu", "dong_feng"]),
        (r"陽虛水泛|陽虛水停", ["yang_xu", "shui_ting"]),
        (r"陽虛寒凝", ["yang_xu", "han"]),
        (r"陽虛痰凝", ["yang_xu", "tan"]),
        (r"陽虛血瘀", ["yang_xu", "xue_yu"]),
        (r"氣滯痰凝", ["qi_zhi", "tan"]),
        (r"氣滯水停", ["qi_zhi", "shui_ting"]),
        (r"氣滯濕阻", ["qi_zhi", "shi"]),
        (r"氣鬱化火|氣鬱化熱", ["qi_zhi", "huo"]),
        (r"血熱動血", ["xue_re", "dong_xue"]),
        (r"血瘀動血", ["xue_yu", "dong_xue"]),
        (r"血瘀化熱", ["xue_yu", "huo"]),
        (r"血瘀水停", ["xue_yu", "shui_ting"]),
        (r"血虛津虧", ["xue_xu", "jin_kui"]),
        (r"血虛風燥", ["xue_xu", "dong_feng", "zao"]),
        (r"熱毒", ["huo", "du"]),
        (r"疫毒", ["du"]),
        (r"水濕泛濫|水濕", ["shi", "shui_ting"]),
    ]

    for pattern, nature_list in compound_patterns:
        if re.search(pattern, name):
            for n in nature_list:
                if n not in natures:
                    natures.append(n)
            return natures  # 找到複合模式後直接返回

    # 通用關鍵詞匹配
    for nat_id, keywords in NATURE_KEYWORDS.items():
        for keyword in keywords:
            if keyword in name and nat_id not in natures:
                natures.append(nat_id)

    return natures


def generate_reasoning(name: str, locations: List[str], natures: List[str]) -> str:
    """生成標註理由"""
    loc_names = {
        "fei": "肺", "xin": "心", "gan": "肝", "pi": "脾", "shen": "腎",
        "wei": "胃", "dachang": "大腸", "xiaochang": "小腸", "dan": "膽",
        "pangguang": "膀胱", "biao": "表", "baogong": "胞宮", "jingshi": "精室",
        "jifu": "肌膚", "jingluo": "經絡", "jingu": "筋骨", "xiongge": "胸膈",
        "shaofu": "少腹"
    }

    nat_names = {
        "qi_xu": "氣虛", "qi_xian": "氣陷", "qi_tuo": "氣脫", "qi_zhi": "氣滯",
        "qi_ni": "氣逆", "qi_bi": "氣閉", "qi_jue": "氣厥",
        "xue_xu": "血虛", "xue_yu": "血瘀", "xue_re": "血熱", "xue_han": "血寒",
        "dong_xue": "動血",
        "yin_xu": "陰虛", "yang_xu": "陽虛", "yang_kang": "陽亢",
        "wang_yin": "亡陰", "wang_yang": "亡陽",
        "feng": "風", "han": "寒", "shu": "暑", "shi": "濕", "zao": "燥", "huo": "熱/火",
        "tan": "痰", "du": "毒", "shui_ting": "水停", "dong_feng": "動風/內風",
        "jin_kui": "津虧", "jing_kui": "精虧", "bu_gu": "不固", "shi_ji": "食積"
    }

    loc_str = "、".join(loc_names.get(l, l) for l in locations) if locations else "全身/無特定病位"
    nat_str = "、".join(nat_names.get(n, n) for n in natures)

    return f"病位：{loc_str}。病性：{nat_str}。根據證候名稱「{name}」分析其病機組成。"


def tag_syndrome(syndrome_data: dict) -> dict:
    """為證候添加智能標註"""
    name = syndrome_data.get("name", "")

    # 首先檢查是否有特殊規則
    if name in SPECIAL_RULES:
        rule = SPECIAL_RULES[name]
        syndrome_data["zhengsu_composition"] = {
            "location": rule["location"],
            "nature": rule["nature"]
        }
        syndrome_data["tagging_confidence"] = rule["confidence"]
        syndrome_data["tagging_reasoning"] = rule["reasoning"]
        return syndrome_data

    # 提取病位和病性
    locations = extract_location_from_name(name)
    natures = extract_nature_from_name(name)

    # 確定置信度
    if natures:
        confidence = "high"
    else:
        confidence = "low"

    # 生成理由
    reasoning = generate_reasoning(name, locations, natures)

    syndrome_data["zhengsu_composition"] = {
        "location": locations,
        "nature": natures
    }
    syndrome_data["tagging_confidence"] = confidence
    syndrome_data["tagging_reasoning"] = reasoning

    return syndrome_data


def process_category(category: str) -> Dict:
    """處理指定類別的所有證候"""
    results = {
        "category": category,
        "total": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
        "details": []
    }

    syndromes = []
    for filepath in SYNDROMES_DIR.glob("*.json"):
        if filepath.name == "index.json":
            continue
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        if data.get("category") == category:
            syndromes.append((filepath, data))

    results["total"] = len(syndromes)
    print(f"處理 {category}: 找到 {results['total']} 個證候")

    for filepath, data in syndromes:
        # 標註
        updated_data = tag_syndrome(data)

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

    return results


def main():
    """主函數：處理所有非基礎證候類別"""
    categories = ["全身證候", "臟腑證候", "傷寒證候", "溫病證候", "專科證候"]

    all_results = {
        "summary": {
            "total": 0,
            "high": 0,
            "medium": 0,
            "low": 0
        },
        "by_category": {}
    }

    for category in categories:
        results = process_category(category)
        all_results["by_category"][category] = results
        all_results["summary"]["total"] += results["total"]
        all_results["summary"]["high"] += results["high"]
        all_results["summary"]["medium"] += results["medium"]
        all_results["summary"]["low"] += results["low"]

        print(f"  High: {results['high']}, Medium: {results['medium']}, Low: {results['low']}")

    # 保存報告
    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    report_path = ANALYSIS_DIR / "all_syndrome_tagging_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)

    print(f"\n===== 總計 =====")
    print(f"Total: {all_results['summary']['total']}")
    print(f"High: {all_results['summary']['high']}")
    print(f"Medium: {all_results['summary']['medium']}")
    print(f"Low: {all_results['summary']['low']}")
    print(f"\n報告已保存至: {report_path}")


if __name__ == "__main__":
    main()
