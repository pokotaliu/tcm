#!/usr/bin/env python3
"""
中藥查詢工具 - 按歸經查詢中藥資料
"""

import json
import os
import sys
from pathlib import Path


def load_all_herbs(herbs_dir: Path) -> list[dict]:
    """讀取所有中藥資料"""
    herbs = []
    for file_path in herbs_dir.glob("*.json"):
        with open(file_path, "r", encoding="utf-8") as f:
            herbs.append(json.load(f))
    return herbs


def query_by_meridian(herbs: list[dict], meridian: str) -> list[dict]:
    """按歸經查詢中藥"""
    results = []
    for herb in herbs:
        meridians = herb.get("properties", {}).get("meridians", [])
        if meridian in meridians:
            results.append(herb)
    return results


def display_herb(herb: dict) -> None:
    """顯示中藥資料"""
    print(f"\n{'=' * 40}")
    print(f"名稱：{herb.get('name', '未知')}")
    print(f"拼音：{herb.get('pinyin', '未知')}")
    print(f"別名：{'、'.join(herb.get('alias', []))}")
    print(f"分類：{herb.get('category', '未知')}")

    properties = herb.get("properties", {})
    print(f"性味：{properties.get('nature', '未知')}，{'、'.join(properties.get('flavor', []))}")
    print(f"歸經：{'、'.join(properties.get('meridians', []))}經")

    print(f"功效：{'、'.join(herb.get('effects', []))}")
    print(f"主治：{'、'.join(herb.get('indications', []))}")
    print(f"用量：{herb.get('dosage', '未知')}")
    print(f"注意事項：{'、'.join(herb.get('cautions', []))}")


def list_all_meridians(herbs: list[dict]) -> set[str]:
    """列出所有歸經"""
    meridians = set()
    for herb in herbs:
        for m in herb.get("properties", {}).get("meridians", []):
            meridians.add(m)
    return meridians


def main():
    # 確定資料目錄路徑
    script_dir = Path(__file__).parent
    herbs_dir = script_dir.parent / "data" / "herbs"

    if not herbs_dir.exists():
        print(f"錯誤：找不到中藥資料目錄 {herbs_dir}")
        sys.exit(1)

    # 讀取所有中藥資料
    herbs = load_all_herbs(herbs_dir)

    if not herbs:
        print("警告：沒有找到任何中藥資料")
        sys.exit(1)

    print(f"已載入 {len(herbs)} 筆中藥資料")

    # 列出所有可用的歸經
    all_meridians = list_all_meridians(herbs)
    print(f"\n可查詢的歸經：{'、'.join(sorted(all_meridians))}")

    # 命令列參數模式
    if len(sys.argv) > 1:
        meridian = sys.argv[1].replace("經", "")
        results = query_by_meridian(herbs, meridian)
        if results:
            print(f"\n找到 {len(results)} 筆歸{meridian}經的中藥：")
            for herb in results:
                display_herb(herb)
        else:
            print(f"\n沒有找到歸{meridian}經的中藥")
        return

    # 互動式查詢
    while True:
        print("\n" + "-" * 40)
        meridian = input("請輸入要查詢的歸經（輸入 q 退出）：").strip()

        if meridian.lower() == "q":
            print("感謝使用，再見！")
            break

        if not meridian:
            continue

        # 移除「經」字進行查詢
        meridian = meridian.replace("經", "")

        results = query_by_meridian(herbs, meridian)

        if results:
            print(f"\n找到 {len(results)} 筆歸{meridian}經的中藥：")
            for herb in results:
                display_herb(herb)
        else:
            print(f"\n沒有找到歸{meridian}經的中藥")


if __name__ == "__main__":
    main()
