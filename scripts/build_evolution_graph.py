#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
演變圖建構腳本
讀取證型的 evolved_from 和 can_evolve_to 建立圖結構
輸出: data/indexes/evolution_graph.json
"""

import json
from pathlib import Path
from typing import Dict, List, Set, Any, Optional, Tuple
from datetime import datetime
from collections import defaultdict


# 證型類別定義
ZHENGXING_CATEGORIES = {
    "基礎證候": ["qi_xu_zheng", "qi_tuo_zheng", "zhong_qi_xia_xian"],
    "臟腑證候": [],  # 含臟腑病位的證型
    "六經證候": ["taiyang", "yangming", "shaoyang", "taiyin", "shaoyin", "jueyin"],
    "危重證候": ["qi_tuo_zheng", "wang_yin_zheng", "wang_yang_zheng"]
}

# 嚴重程度定義
SEVERITY_KEYWORDS = {
    1: ["虛", "不足"],
    2: ["下陷", "不固", "氣滯"],
    3: ["脫", "厥", "閉"],
    4: ["亡", "危"]
}

# 危重證素
CRITICAL_ZHENGSU = ["qi_tuo", "wang_yin", "wang_yang", "qi_jue", "xue_tuo"]


def determine_severity(data: Dict) -> int:
    """根據證型資料判斷嚴重程度 (1-4)"""
    name = data.get("name", "")

    # 根據名稱關鍵字判斷
    for severity, keywords in sorted(SEVERITY_KEYWORDS.items(), reverse=True):
        for keyword in keywords:
            if keyword in name:
                return severity

    # 根據證素判斷
    nature = data.get("zhengsu_composition", {}).get("nature", [])
    for zs in nature:
        if zs in CRITICAL_ZHENGSU:
            return 4

    return 1


def determine_category(data: Dict) -> str:
    """判斷證型類別"""
    zx_id = data.get("id", "")

    # 六經證候
    if any(key in zx_id for key in ["taiyang", "yangming", "shaoyang", "taiyin", "shaoyin", "jueyin"]):
        return "六經證候"

    # 危重證候
    if zx_id in ZHENGXING_CATEGORIES.get("危重證候", []):
        return "危重證候"

    # 臟腑證候
    location = data.get("zhengsu_composition", {}).get("location", [])
    if location:
        return "臟腑證候"

    return "基礎證候"


def is_critical(data: Dict) -> bool:
    """判斷是否為危重證型"""
    nature = data.get("zhengsu_composition", {}).get("nature", [])
    for zs in nature:
        if zs in CRITICAL_ZHENGSU:
            return True

    name = data.get("name", "")
    if any(kw in name for kw in ["亡", "脫", "厥"]):
        return True

    return False


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


def build_nodes(zhengxing_data: Dict[str, Dict]) -> List[Dict]:
    """建立節點列表"""
    nodes = []

    for zx_id, data in zhengxing_data.items():
        node = {
            "id": zx_id,
            "name": data.get("name", ""),
            "category": determine_category(data),
            "severity": determine_severity(data),
            "is_critical": is_critical(data)
        }
        nodes.append(node)

    # 按嚴重程度排序
    nodes.sort(key=lambda x: (x["severity"], x["name"]))

    return nodes


def build_edges(zhengxing_data: Dict[str, Dict]) -> List[Dict]:
    """建立邊列表"""
    edges = []
    seen_edges: Set[Tuple[str, str]] = set()

    for zx_id, data in zhengxing_data.items():
        # 處理 can_evolve_to
        for target_id in data.get("can_evolve_to", []):
            if (zx_id, target_id) not in seen_edges:
                edge = build_edge(zx_id, target_id, zhengxing_data, "發展")
                if edge:
                    edges.append(edge)
                    seen_edges.add((zx_id, target_id))

        # 處理 evolved_from (反向)
        for source_id in data.get("evolved_from", []):
            if (source_id, zx_id) not in seen_edges:
                edge = build_edge(source_id, zx_id, zhengxing_data, "發展")
                if edge:
                    edges.append(edge)
                    seen_edges.add((source_id, zx_id))

    return edges


def build_edge(from_id: str, to_id: str, zhengxing_data: Dict[str, Dict], default_relation: str) -> Optional[Dict]:
    """建立單個邊"""
    from_data = zhengxing_data.get(from_id, {})
    to_data = zhengxing_data.get(to_id, {})

    from_name = from_data.get("name", from_id)
    to_name = to_data.get("name", to_id)

    # 判斷關係類型
    from_severity = determine_severity(from_data) if from_data else 1
    to_severity = determine_severity(to_data) if to_data else 1

    if to_severity >= 4:
        relation = "危變"
    elif to_severity > from_severity:
        relation = "惡化"
    else:
        relation = default_relation

    # 查找 differentiation 中的描述
    condition = ""
    description = ""

    for diff in from_data.get("differentiation", []):
        if diff.get("compare_with") == to_id:
            key_points = diff.get("key_points", [])
            if key_points:
                description = key_points[0]
            break

    return {
        "from": from_id,
        "to": to_id,
        "relation": relation,
        "condition": condition,
        "description": description or f"{from_name}演變為{to_name}"
    }


def find_evolution_chains(edges: List[Dict], nodes: List[Dict]) -> List[Dict]:
    """識別演變鏈"""
    chains = []

    # 建立鄰接表
    graph: Dict[str, List[str]] = defaultdict(list)
    in_degree: Dict[str, int] = defaultdict(int)
    node_ids = {n["id"] for n in nodes}

    for edge in edges:
        if edge["from"] in node_ids and edge["to"] in node_ids:
            graph[edge["from"]].append(edge["to"])
            in_degree[edge["to"]] += 1

    # 找出起始節點（入度為0的節點）
    start_nodes = [n["id"] for n in nodes if in_degree.get(n["id"], 0) == 0 and graph.get(n["id"])]

    # 從每個起始節點開始尋找最長路徑
    def find_longest_path(start: str, visited: Set[str]) -> List[str]:
        if start in visited:
            return []
        visited.add(start)

        longest = [start]
        for next_node in graph.get(start, []):
            if next_node not in visited:
                path = find_longest_path(next_node, visited.copy())
                if len(path) + 1 > len(longest):
                    longest = [start] + path

        return longest

    # 為已知的演變鏈定義
    known_chains = [
        {
            "id": "qi_disease_chain",
            "name": "氣病演變鏈",
            "description": "從氣虛到氣脫的完整演變路徑",
            "path": ["qi_xu_zheng", "zhong_qi_xia_xian", "qi_tuo_zheng"],
            "severity_progression": "輕 → 中 → 重"
        }
    ]

    # 收集發現的演變鏈
    for start in start_nodes:
        path = find_longest_path(start, set())
        if len(path) >= 2:
            # 獲取節點名稱
            node_map = {n["id"]: n for n in nodes}

            # 判斷嚴重程度進展
            severities = [node_map.get(p, {}).get("severity", 1) for p in path]
            if all(severities[i] <= severities[i+1] for i in range(len(severities)-1)):
                progression = " → ".join(
                    ["輕", "中", "重", "危"][min(s-1, 3)] for s in severities
                )
            else:
                progression = ""

            chain = {
                "id": f"chain_{start}",
                "name": f"{node_map.get(path[0], {}).get('name', path[0])}演變鏈",
                "description": f"從{node_map.get(path[0], {}).get('name', path[0])}到{node_map.get(path[-1], {}).get('name', path[-1])}的演變路徑",
                "path": path,
                "severity_progression": progression
            }

            # 避免重複
            if not any(set(c["path"]) == set(path) for c in chains):
                chains.append(chain)

    # 合併已知鏈
    for known in known_chains:
        if not any(set(c["path"]) == set(known["path"]) for c in chains):
            chains.append(known)

    return chains


def find_branch_points(edges: List[Dict], zhengxing_data: Dict[str, Dict]) -> List[Dict]:
    """找出分支點（一個證型可發展為多個證型）"""
    branches = []

    # 統計每個節點的出邊
    out_edges: Dict[str, List[str]] = defaultdict(list)
    for edge in edges:
        out_edges[edge["from"]].append(edge["to"])

    # 找出有多個出邊的節點
    for from_id, targets in out_edges.items():
        if len(targets) > 1:
            from_data = zhengxing_data.get(from_id, {})
            branch_info = []
            for to_id in targets:
                to_data = zhengxing_data.get(to_id, {})
                branch_info.append({
                    "to": to_id,
                    "to_name": to_data.get("name", to_id),
                    "description": ""
                })

            branches.append({
                "from": from_id,
                "from_name": from_data.get("name", from_id),
                "branches": branch_info
            })

    return branches


def build_evolution_graph(data_dir: Path) -> Dict:
    """建立完整的演變圖"""
    print("正在載入證型資料...")
    zhengxing_data = load_zhengxing_data(data_dir)

    print(f"載入了 {len(zhengxing_data)} 個證型")

    print("正在建立節點...")
    nodes = build_nodes(zhengxing_data)

    print("正在建立邊...")
    edges = build_edges(zhengxing_data)

    print("正在識別演變鏈...")
    chains = find_evolution_chains(edges, nodes)

    print("正在找出分支點...")
    branches = find_branch_points(edges, zhengxing_data)

    # 構建最終圖結構
    graph = {
        "version": "1.0",
        "generated_at": datetime.now().strftime("%Y-%m-%d"),
        "description": "證型演變關係的有向圖結構，支援互動式演變圖",
        "nodes": nodes,
        "edges": edges,
        "evolution_chains": chains,
        "branch_points": branches,
        "statistics": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "critical_nodes": sum(1 for n in nodes if n["is_critical"]),
            "evolution_chains": len(chains)
        }
    }

    return graph


def main():
    """主函數"""
    import argparse

    parser = argparse.ArgumentParser(description="建立證型演變關係圖")
    parser.add_argument(
        "--data-dir",
        default="data",
        help="資料目錄路徑 (預設: data)"
    )
    parser.add_argument(
        "--output",
        default="data/indexes/evolution_graph.json",
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

    # 建立演變圖
    graph = build_evolution_graph(data_dir)

    # 寫入檔案
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(graph, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 演變圖已生成: {output_path}")
    print(f"   節點數: {graph['statistics']['total_nodes']}")
    print(f"   邊數: {graph['statistics']['total_edges']}")
    print(f"   危重節點: {graph['statistics']['critical_nodes']}")
    print(f"   演變鏈: {graph['statistics']['evolution_chains']}")

    return 0


if __name__ == "__main__":
    exit(main())
