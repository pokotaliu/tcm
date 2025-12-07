#!/usr/bin/env python3
"""
首頁索引資料生成腳本

生成四個索引檔案供首頁使用：
1. syndrome_index.json - 證型分類索引（含子分類）
2. symptom_categories.json - 症狀分類（8大類）
3. symptom_to_syndrome.json - 症狀→證型反向索引
4. evolution_graph.json - 演變關係圖（從現有資料增強）
"""

import json
import os
import re
from collections import defaultdict
from datetime import datetime

# 路徑設定
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SYNDROMES_DIR = os.path.join(BASE_DIR, "data", "zhenghou", "syndromes")
OUTPUT_DIR = os.path.join(BASE_DIR, "data", "index")
ZHENGSU_DIR = os.path.join(BASE_DIR, "data", "zhengsu")

# 證素 ID 到中文名稱的映射
ZHENGSU_NAMES = {}

def load_zhengsu_names():
    """載入證素名稱映射"""
    global ZHENGSU_NAMES
    for filename in os.listdir(ZHENGSU_DIR):
        if filename.endswith('.json') and not filename.startswith('_'):
            filepath = os.path.join(ZHENGSU_DIR, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    zs_id = data.get('id', filename.replace('.json', ''))
                    zs_name = data.get('name', zs_id)
                    ZHENGSU_NAMES[zs_id] = zs_name
            except:
                pass

    # 補充常見證素映射
    extra_mappings = {
        'qi_xu': '氣虛', 'xue_xu': '血虛', 'yin_xu': '陰虛', 'yang_xu': '陽虛',
        'qi_zhi': '氣滯', 'xue_yu': '血瘀', 'qi_ni': '氣逆', 'qi_bi': '氣閉',
        'qi_xian': '氣陷', 'qi_tuo': '氣脫', 'wang_yin': '亡陰', 'wang_yang': '亡陽',
        'feng': '風', 'han': '寒', 'shu': '暑', 'shi': '濕', 'zao': '燥', 'huo': '火',
        'tan': '痰', 'yin': '飲', 'shui_ting': '水停', 'shi_ji': '食積',
        'dong_feng': '動風', 'dong_xue': '動血', 'bu_gu': '不固',
        'xin': '心', 'gan': '肝', 'pi': '脾', 'fei': '肺', 'shen': '腎',
        'wei': '胃', 'dan': '膽', 'dachang': '大腸', 'xiaochang': '小腸',
        'pangguang': '膀胱', 'sanjiao': '三焦', 'baogong': '胞宮',
        'biao': '表', 'li': '裡', 'banbiaobanli': '半表半裡',
        'jingluo': '經絡', 'jingu': '筋骨', 'jifu': '肌膚',
        'du': '毒', 'nong': '膿', 'jing_kui': '精虧', 'jin_kui': '津虧',
        'yang_kang': '陽亢', 'yang_fu': '陽浮', 'xue_re': '血熱', 'xue_han': '血寒',
        're': '熱', 'xu': '虛', 'shi_zheng': '實', 'chong_ji': '蟲積',
        'qingyang_busheng': '清陽不升', 'qi_jue': '氣厥'
    }
    ZHENGSU_NAMES.update(extra_mappings)


def load_all_syndromes():
    """載入所有證候資料"""
    syndromes = []
    for filename in os.listdir(SYNDROMES_DIR):
        if filename.endswith('.json'):
            filepath = os.path.join(SYNDROMES_DIR, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    data['_filename'] = filename.replace('.json', '')
                    syndromes.append(data)
            except Exception as e:
                print(f"Error loading {filename}: {e}")
    return syndromes


def get_zhengsu_name(zs_id):
    """獲取證素中文名稱"""
    return ZHENGSU_NAMES.get(zs_id, zs_id)


def classify_syndrome(syndrome):
    """根據證候名稱和內容進一步分類"""
    name = syndrome.get('name', '')
    category = syndrome.get('category', '')

    # 基礎證候子分類
    if category == '基礎證候':
        if any(x in name for x in ['氣虛', '氣陷', '氣脫', '氣滯', '氣逆', '氣閉', '氣厥']):
            return '氣病系列'
        elif any(x in name for x in ['血虛', '血脫', '血瘀', '血熱', '血燥', '血寒']):
            return '血病系列'
        elif any(x in name for x in ['陰虛', '陽虛', '亡陰', '亡陽', '失神']):
            return '陰陽系列'
        elif any(x in name for x in ['風證', '寒證', '暑證', '濕證', '燥證', '火熱', '邪毒']):
            return '外邪系列'
        elif any(x in name for x in ['太陽', '陽明', '少陽', '太陰', '少陰', '厥陰']):
            return '六經系列'
        elif any(x in name for x in ['衛分', '氣分', '營分', '血分', '痰證']):
            return '衛氣營血系列'
        elif any(x in name for x in ['精脫', '津虧']):
            return '精津系列'
        else:
            return '其他基礎'

    # 臟腑證候子分類
    elif category == '臟腑證候':
        if any(x in name for x in ['心氣', '心血', '心陰', '心陽', '心火', '心脈', '痰迷心', '痰火擾心', '水氣凌心']):
            return '心系'
        elif any(x in name for x in ['肝氣', '肝血', '肝陰', '肝陽', '肝火', '肝風', '肝鬱', '肝經', '寒滯肝']):
            return '肝系'
        elif any(x in name for x in ['脾氣', '脾陽', '脾陰', '脾虛', '脾不', '濕困脾', '寒濕困', '脾胃']):
            return '脾系'
        elif any(x in name for x in ['肺氣', '肺陰', '肺陽', '肺熱', '風寒犯肺', '風熱犯肺', '燥邪犯肺', '痰熱壅肺', '痰濕阻肺', '飲停於肺']):
            return '肺系'
        elif any(x in name for x in ['腎氣', '腎陰', '腎陽', '腎精', '腎虛', '腎不']):
            return '腎系'
        elif any(x in name for x in ['胃', '膽', '大腸', '小腸', '膀胱', '三焦']):
            return '腑系'
        elif any(x in name for x in ['心脾', '心肺', '心腎', '心肝', '肝脾', '肝腎', '肺脾', '肺腎', '脾腎', '肝膽', '脾胃']):
            return '臟腑兼證'
        else:
            return '其他臟腑'

    # 傷寒證候子分類
    elif category == '傷寒證候':
        if '太陽' in name:
            return '太陽病類'
        elif '陽明' in name:
            return '陽明病類'
        elif '少陽' in name:
            return '少陽病類'
        elif '太陰' in name:
            return '太陰病類'
        elif '少陰' in name:
            return '少陰病類'
        elif '厥陰' in name:
            return '厥陰病類'
        else:
            return '其他傷寒'

    # 溫病證候子分類
    elif category == '溫病證候':
        if '衛' in name or '表' in name:
            return '衛分類'
        elif '氣分' in name or '氣營' in name:
            return '氣分類'
        elif '營' in name:
            return '營分類'
        elif '血' in name:
            return '血分類'
        else:
            return '其他溫病'

    # 專科證候子分類
    elif category == '專科證候':
        if any(x in name for x in ['胞宮', '衝任', '月經', '帶下', '崩漏', '經', '產', '妊']):
            return '婦科'
        elif any(x in name for x in ['兒', '小兒', '疳']):
            return '兒科'
        elif any(x in name for x in ['目', '眼', '瞳', '視', '翳', '內障', '外障', '青盲', '雀目']):
            return '眼科'
        elif any(x in name for x in ['耳', '聾', '鳴']):
            return '耳科'
        elif any(x in name for x in ['鼻', '鼽', '嚏']):
            return '鼻科'
        elif any(x in name for x in ['咽', '喉', '嗓']):
            return '咽喉科'
        elif any(x in name for x in ['齒', '牙', '口', '舌', '唇']):
            return '口齒科'
        elif any(x in name for x in ['瘡', '癰', '疽', '疔', '癤', '瘍', '瘻', '痔', '蟲']):
            return '外科'
        elif any(x in name for x in ['癢', '疹', '斑', '皮', '瘡']):
            return '皮膚科'
        else:
            return '其他專科'

    # 全身證候子分類
    elif category == '全身證候':
        if '氣虛' in name or '氣陷' in name:
            return '氣虛類'
        elif '血虛' in name:
            return '血虛類'
        elif '陰虛' in name:
            return '陰虛類'
        elif '陽虛' in name:
            return '陽虛類'
        elif '氣滯' in name or '氣鬱' in name:
            return '氣滯類'
        elif '血瘀' in name or '瘀血' in name:
            return '血瘀類'
        elif '痰' in name:
            return '痰證類'
        elif '濕' in name:
            return '濕證類'
        elif '寒' in name:
            return '寒證類'
        elif '熱' in name or '火' in name:
            return '熱證類'
        else:
            return '其他全身'

    return '未分類'


def generate_syndrome_index(syndromes):
    """生成證型分類索引"""
    print("生成證型分類索引...")

    # 按大類分組
    categories_data = defaultdict(lambda: defaultdict(list))

    for syn in syndromes:
        category = syn.get('category', 'N/A')
        subcategory = classify_syndrome(syn)

        # 獲取證素資訊
        zhengsu = syn.get('zhengsu_composition', {})
        location = zhengsu.get('location', [])
        nature = zhengsu.get('nature', [])

        location_names = [get_zhengsu_name(loc) for loc in location]
        nature_names = [get_zhengsu_name(nat) for nat in nature]

        syndrome_info = {
            'id': syn.get('id', syn.get('_filename', '')),
            'name': syn.get('name', ''),
            'number': syn.get('number', 0),
            'location': location_names,
            'nature': nature_names
        }

        categories_data[category][subcategory].append(syndrome_info)

    # 定義分類順序
    category_order = ['基礎證候', '全身證候', '臟腑證候', '傷寒證候', '溫病證候', '專科證候']

    # 建構輸出結構
    result = {
        'version': '2.0',
        'generated_at': datetime.now().strftime('%Y-%m-%d'),
        'description': '證型分類索引（含子分類），支援首頁分類瀏覽',
        'total': len(syndromes),
        'categories': []
    }

    category_id_map = {
        '基礎證候': 'basic',
        '全身證候': 'systemic',
        '臟腑證候': 'zangfu',
        '傷寒證候': 'shanghan',
        '溫病證候': 'wenbing',
        '專科證候': 'specialty'
    }

    for cat_name in category_order:
        if cat_name not in categories_data:
            continue

        subcats = categories_data[cat_name]
        subcategories = []
        cat_total = 0

        for subcat_name, syn_list in sorted(subcats.items()):
            # 按編號排序
            syn_list.sort(key=lambda x: x.get('number', 9999))
            cat_total += len(syn_list)

            subcategories.append({
                'name': subcat_name,
                'count': len(syn_list),
                'syndromes': syn_list
            })

        result['categories'].append({
            'id': category_id_map.get(cat_name, cat_name),
            'name': cat_name,
            'count': cat_total,
            'subcategories': subcategories
        })

    return result


def extract_symptoms(text):
    """從臨床表現文本中提取症狀"""
    if not text:
        return []

    symptoms = []

    # 清理文本
    text = text.replace('\n', '，').replace('。', '，')

    # 常見症狀模式
    patterns = [
        # 四字症狀
        r'[神氣面形身心][\u4e00-\u9fff]{2,3}',
        # 常見症狀詞
        r'頭痛|頭暈|眩暈|頭重|頭脹',
        r'心悸|怔忡|心煩|心慌|胸悶|胸痛',
        r'氣短|氣促|喘息|呼吸[困難急促]',
        r'咳嗽|咯痰|痰[多黃白稀稠]',
        r'發熱|惡寒|寒熱|潮熱|盜汗|自汗',
        r'口[苦乾渴淡]|口渴|咽[乾痛]',
        r'納[差呆少]|食[少慾不振]|不欲飲食|厭食',
        r'腹[痛脹滿]|脘[痛脹悶]|胃[痛脹]',
        r'便[溏秘結稀]|腹瀉|下利|大便[乾結溏薄]',
        r'小便[短赤頻數清長不利]|尿[頻急痛]',
        r'失眠|不寐|多夢|易醒|嗜睡',
        r'腰[痛酸軟]|膝[軟痛]|腰膝酸軟',
        r'乏力|倦怠|神疲|疲乏|困倦',
        r'肢[冷麻木腫]|四肢[不溫厥冷]',
        r'面[白黃紅赤青]|面色[蒼晄黃白]',
        r'舌[淡紅暗紫]|苔[白黃膩滑]',
        r'脈[沉浮弦滑數遲細弱虛實]',
        r'耳鳴|耳聾|目眩|目赤|視物模糊',
        r'月經[不調量多量少]|痛經|崩漏|帶下',
        r'遺精|滑精|陽痿|早洩',
        r'水腫|浮腫|肢腫',
        r'疼痛|刺痛|脹痛|隱痛|絞痛'
    ]

    for pattern in patterns:
        matches = re.findall(pattern, text)
        symptoms.extend(matches)

    # 去重
    return list(set(symptoms))


def categorize_symptom(symptom):
    """將症狀分類到八大類之一"""
    # 定義分類規則
    categories = {
        '頭面五官': ['頭', '目', '眼', '耳', '鼻', '口', '舌', '咽', '喉', '面', '齒', '牙', '唇', '視', '聽', '嗅'],
        '胸脅腹部': ['胸', '心', '脅', '腹', '脘', '胃', '肋', '乳'],
        '腰背四肢': ['腰', '背', '肢', '臂', '腿', '膝', '足', '手', '指', '筋', '骨', '關節'],
        '二便': ['便', '尿', '小便', '大便', '溺', '利'],
        '寒熱汗出': ['寒', '熱', '汗', '發熱', '惡寒', '潮熱', '盜汗', '自汗', '冷', '溫'],
        '神志精神': ['神', '志', '眠', '夢', '悸', '怔', '煩', '驚', '恐', '怒', '憂', '思', '悲', '喜', '恍惚', '健忘', '失眠', '嗜睡'],
        '飲食口味': ['食', '飲', '渴', '口', '納', '味', '嘔', '吐', '噁', '呃', '噫', '吞'],
        '婦科': ['經', '帶', '孕', '產', '乳', '胞', '崩', '漏', '月']
    }

    for cat_name, keywords in categories.items():
        for keyword in keywords:
            if keyword in symptom:
                return cat_name

    return '其他'


def generate_symptom_categories(syndromes):
    """生成症狀分類索引"""
    print("生成症狀分類索引...")

    # 收集所有症狀
    all_symptoms = defaultdict(lambda: {'count': 0, 'syndromes': []})

    for syn in syndromes:
        clinical = syn.get('clinical_manifestations', '')
        symptoms = extract_symptoms(clinical)

        syn_info = {
            'id': syn.get('id', syn.get('_filename', '')),
            'name': syn.get('name', '')
        }

        for symptom in symptoms:
            all_symptoms[symptom]['count'] += 1
            if syn_info not in all_symptoms[symptom]['syndromes']:
                all_symptoms[symptom]['syndromes'].append(syn_info)

    # 按類別組織
    categories = defaultdict(list)

    for symptom, data in all_symptoms.items():
        if data['count'] >= 2:  # 至少出現在2個證候中
            cat = categorize_symptom(symptom)
            categories[cat].append({
                'name': symptom,
                'count': data['count'],
                'syndrome_count': len(data['syndromes'])
            })

    # 排序
    for cat in categories:
        categories[cat].sort(key=lambda x: -x['count'])

    result = {
        'version': '1.0',
        'generated_at': datetime.now().strftime('%Y-%m-%d'),
        'description': '症狀分類索引（8大類），支援首頁症狀反查',
        'categories': []
    }

    cat_order = ['頭面五官', '胸脅腹部', '腰背四肢', '二便', '寒熱汗出', '神志精神', '飲食口味', '婦科', '其他']

    for cat_name in cat_order:
        if cat_name in categories:
            result['categories'].append({
                'name': cat_name,
                'symptom_count': len(categories[cat_name]),
                'symptoms': categories[cat_name][:50]  # 每類最多50個
            })

    result['total_symptoms'] = sum(len(cat['symptoms']) for cat in result['categories'])

    return result


def generate_symptom_to_syndrome(syndromes):
    """生成症狀到證型的反向索引"""
    print("生成症狀反查索引...")

    symptom_index = defaultdict(list)

    for syn in syndromes:
        clinical = syn.get('clinical_manifestations', '')
        symptoms = extract_symptoms(clinical)

        # 獲取證素資訊
        zhengsu = syn.get('zhengsu_composition', {})
        location = zhengsu.get('location', [])
        nature = zhengsu.get('nature', [])

        location_names = [get_zhengsu_name(loc) for loc in location]
        nature_names = [get_zhengsu_name(nat) for nat in nature]

        syn_info = {
            'id': syn.get('id', syn.get('_filename', '')),
            'name': syn.get('name', ''),
            'category': syn.get('category', ''),
            'location': location_names,
            'nature': nature_names
        }

        for symptom in symptoms:
            # 避免重複
            if syn_info not in symptom_index[symptom]:
                symptom_index[symptom].append(syn_info)

    # 建構輸出結構
    result = {
        'version': '2.0',
        'generated_at': datetime.now().strftime('%Y-%m-%d'),
        'description': '症狀到證型的反向索引，支援首頁症狀反查功能',
        'symptoms': {}
    }

    for symptom, syn_list in sorted(symptom_index.items()):
        if len(syn_list) >= 1:  # 至少關聯1個證候
            result['symptoms'][symptom] = {
                'display_name': symptom,
                'category': categorize_symptom(symptom),
                'syndrome_count': len(syn_list),
                'related_syndromes': syn_list
            }

    result['total_symptoms'] = len(result['symptoms'])
    result['total_mappings'] = sum(s['syndrome_count'] for s in result['symptoms'].values())

    return result


def generate_evolution_graph(syndromes):
    """生成演變關係圖"""
    print("生成演變關係圖...")

    # 載入現有的演變關係
    existing_graph_path = os.path.join(BASE_DIR, "data", "indexes", "evolution_graph.json")
    existing_graph = {}
    if os.path.exists(existing_graph_path):
        with open(existing_graph_path, 'r', encoding='utf-8') as f:
            existing_graph = json.load(f)

    # 建立證候ID到名稱的映射
    id_to_name = {}
    for syn in syndromes:
        syn_id = syn.get('id', syn.get('_filename', ''))
        syn_name = syn.get('name', '')
        id_to_name[syn_id] = syn_name

    # 從現有關係中提取節點和邊
    nodes = existing_graph.get('nodes', [])
    edges = existing_graph.get('edges', [])

    # 補充更多節點
    existing_node_ids = {n['id'] for n in nodes}

    for syn in syndromes:
        syn_id = syn.get('id', syn.get('_filename', ''))
        if syn_id and syn_id not in existing_node_ids:
            category = syn.get('category', '')

            # 判斷嚴重程度
            name = syn.get('name', '')
            severity = 1
            is_critical = False

            if any(x in name for x in ['亡', '脫', '厥', '閉']):
                severity = 4
                is_critical = True
            elif any(x in name for x in ['虛', '寒', '熱']):
                severity = 2

            nodes.append({
                'id': syn_id,
                'name': syn.get('name', ''),
                'category': category,
                'severity': severity,
                'is_critical': is_critical
            })

    result = {
        'version': '2.0',
        'generated_at': datetime.now().strftime('%Y-%m-%d'),
        'description': '證型演變關係的有向圖結構，支援首頁互動式演變圖',
        'nodes': nodes,
        'edges': edges,
        'evolution_chains': existing_graph.get('evolution_chains', []),
        'branch_points': existing_graph.get('branch_points', []),
        'statistics': {
            'total_nodes': len(nodes),
            'total_edges': len(edges),
            'critical_nodes': sum(1 for n in nodes if n.get('is_critical', False)),
            'evolution_chains': len(existing_graph.get('evolution_chains', []))
        }
    }

    return result


def main():
    """主函數"""
    print("=" * 60)
    print("首頁索引資料生成腳本")
    print("=" * 60)

    # 確保輸出目錄存在
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 載入證素名稱
    load_zhengsu_names()
    print(f"載入 {len(ZHENGSU_NAMES)} 個證素名稱映射")

    # 載入所有證候
    syndromes = load_all_syndromes()
    print(f"載入 {len(syndromes)} 個證候資料")

    # 生成各個索引
    syndrome_index = generate_syndrome_index(syndromes)
    symptom_categories = generate_symptom_categories(syndromes)
    symptom_to_syndrome = generate_symptom_to_syndrome(syndromes)
    evolution_graph = generate_evolution_graph(syndromes)

    # 輸出檔案
    outputs = [
        ('syndrome_index.json', syndrome_index),
        ('symptom_categories.json', symptom_categories),
        ('symptom_to_syndrome.json', symptom_to_syndrome),
        ('evolution_graph.json', evolution_graph)
    ]

    print("\n" + "=" * 60)
    print("輸出檔案統計")
    print("=" * 60)

    for filename, data in outputs:
        filepath = os.path.join(OUTPUT_DIR, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        # 統計資訊
        if filename == 'syndrome_index.json':
            print(f"\n{filename}:")
            print(f"  - 總證型數: {data['total']}")
            for cat in data['categories']:
                print(f"  - {cat['name']}: {cat['count']} 個, {len(cat['subcategories'])} 子分類")

        elif filename == 'symptom_categories.json':
            print(f"\n{filename}:")
            print(f"  - 總症狀數: {data['total_symptoms']}")
            for cat in data['categories']:
                print(f"  - {cat['name']}: {cat['symptom_count']} 個症狀")

        elif filename == 'symptom_to_syndrome.json':
            print(f"\n{filename}:")
            print(f"  - 總症狀數: {data['total_symptoms']}")
            print(f"  - 總對應關係: {data['total_mappings']}")

        elif filename == 'evolution_graph.json':
            print(f"\n{filename}:")
            print(f"  - 總節點數: {data['statistics']['total_nodes']}")
            print(f"  - 總邊數: {data['statistics']['total_edges']}")
            print(f"  - 危重節點: {data['statistics']['critical_nodes']}")

    print("\n" + "=" * 60)
    print("生成完成！")
    print("=" * 60)


if __name__ == '__main__':
    main()
