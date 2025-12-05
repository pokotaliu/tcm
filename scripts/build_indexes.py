#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
主控腳本：生成所有索引
依序呼叫各索引建構腳本，並輸出生成報告
"""

import sys
import json
import time
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

# 添加腳本目錄到路徑
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from validate_data import DataValidator
from extract_symptoms import build_symptom_index
from build_evolution_graph import build_evolution_graph
from build_diff_matrix import build_differentiation_matrix
from build_zhengsu_mapping import build_zhengsu_mapping


def write_json(data: Dict, output_path: Path):
    """寫入 JSON 檔案"""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def print_header(title: str):
    """輸出標題"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_step(step: int, total: int, name: str):
    """輸出步驟"""
    print(f"\n[{step}/{total}] {name}")
    print("-" * 40)


def main():
    """主函數"""
    import argparse

    parser = argparse.ArgumentParser(description="生成所有 TCM 資料索引")
    parser.add_argument(
        "--data-dir",
        default="data",
        help="資料目錄路徑 (預設: data)"
    )
    parser.add_argument(
        "--skip-validation",
        action="store_true",
        help="跳過資料驗證"
    )
    parser.add_argument(
        "--only",
        choices=["symptoms", "evolution", "diff", "zhengsu", "validate"],
        help="只執行指定的索引建構"
    )

    args = parser.parse_args()

    # 確定資料目錄
    data_dir = script_dir.parent / args.data_dir
    indexes_dir = data_dir / "indexes"

    if not data_dir.exists():
        print(f"錯誤: 資料目錄不存在: {data_dir}")
        return 1

    start_time = time.time()

    print_header("TCM 資料索引生成系統")
    print(f"資料目錄: {data_dir}")
    print(f"輸出目錄: {indexes_dir}")
    print(f"開始時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    total_steps = 5
    current_step = 0
    results = {}

    # Step 1: 資料驗證
    if not args.skip_validation and args.only in [None, "validate"]:
        current_step += 1
        print_step(current_step, total_steps, "資料驗證")

        validator = DataValidator(str(data_dir))
        validation_result = validator.run()
        results["validation"] = {
            "errors": len(validation_result.errors),
            "warnings": len(validation_result.warnings)
        }

        if validation_result.has_errors:
            print("\n⚠️  發現驗證錯誤，建議修正後再生成索引")
            if args.only == "validate":
                return 1

    # Step 2: 症狀索引
    if args.only in [None, "symptoms"]:
        current_step += 1
        print_step(current_step, total_steps, "症狀反查索引")

        try:
            index = build_symptom_index(data_dir)
            output_path = indexes_dir / "symptom_index.json"
            write_json(index, output_path)

            results["symptom_index"] = {
                "path": str(output_path),
                "total_symptoms": index["statistics"]["total_symptoms"]
            }
            print(f"✅ 完成: {output_path}")
        except Exception as e:
            print(f"❌ 錯誤: {e}")
            results["symptom_index"] = {"error": str(e)}

    # Step 3: 演變圖
    if args.only in [None, "evolution"]:
        current_step += 1
        print_step(current_step, total_steps, "證型演變圖")

        try:
            graph = build_evolution_graph(data_dir)
            output_path = indexes_dir / "evolution_graph.json"
            write_json(graph, output_path)

            results["evolution_graph"] = {
                "path": str(output_path),
                "nodes": graph["statistics"]["total_nodes"],
                "edges": graph["statistics"]["total_edges"]
            }
            print(f"✅ 完成: {output_path}")
        except Exception as e:
            print(f"❌ 錯誤: {e}")
            results["evolution_graph"] = {"error": str(e)}

    # Step 4: 鑑別矩陣
    if args.only in [None, "diff"]:
        current_step += 1
        print_step(current_step, total_steps, "類證鑑別矩陣")

        try:
            matrix = build_differentiation_matrix(data_dir)
            output_path = indexes_dir / "differentiation_matrix.json"
            write_json(matrix, output_path)

            results["differentiation_matrix"] = {
                "path": str(output_path),
                "pairs": matrix["statistics"]["total_pairs"],
                "groups": matrix["statistics"]["total_groups"]
            }
            print(f"✅ 完成: {output_path}")
        except Exception as e:
            print(f"❌ 錯誤: {e}")
            results["differentiation_matrix"] = {"error": str(e)}

    # Step 5: 證素對應
    if args.only in [None, "zhengsu"]:
        current_step += 1
        print_step(current_step, total_steps, "證素-證型對應")

        try:
            mapping = build_zhengsu_mapping(data_dir)
            output_path = indexes_dir / "zhengsu_mapping.json"
            write_json(mapping, output_path)

            results["zhengsu_mapping"] = {
                "path": str(output_path),
                "zhengsu": mapping["statistics"]["total_zhengsu"],
                "zhengxing": mapping["statistics"]["total_zhengxing"]
            }
            print(f"✅ 完成: {output_path}")
        except Exception as e:
            print(f"❌ 錯誤: {e}")
            results["zhengsu_mapping"] = {"error": str(e)}

    # 輸出總結報告
    elapsed_time = time.time() - start_time

    print_header("生成報告")
    print(f"耗時: {elapsed_time:.2f} 秒")
    print(f"生成時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    print("\n索引檔案:")
    for name, result in results.items():
        if "error" in result:
            print(f"  ❌ {name}: 失敗 - {result['error']}")
        elif "path" in result:
            stats = ", ".join(f"{k}={v}" for k, v in result.items() if k != "path")
            print(f"  ✅ {name}: {stats}")

    # 寫入生成報告
    report = {
        "generated_at": datetime.now().isoformat(),
        "elapsed_seconds": elapsed_time,
        "data_dir": str(data_dir),
        "results": results
    }
    report_path = indexes_dir / "_build_report.json"
    write_json(report, report_path)
    print(f"\n報告已儲存: {report_path}")

    # 檢查是否有錯誤
    has_errors = any("error" in r for r in results.values())
    if has_errors:
        print("\n⚠️  部分索引生成失敗，請檢查錯誤訊息")
        return 1

    print("\n✅ 所有索引生成完成！")
    return 0


if __name__ == "__main__":
    sys.exit(main())
