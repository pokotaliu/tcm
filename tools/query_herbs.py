#!/usr/bin/env python3
"""
中藥查詢工具 - 支援按歸經、證素、治法查詢中藥資料
"""

import json
import sys
from pathlib import Path


def load_all_herbs(herbs_dir: Path) -> list[dict]:
    """讀取所有中藥資料"""
    herbs = []
    for file_path in herbs_dir.glob("*.json"):
        if file_path.name.startswith("_"):
            continue
        with open(file_path, "r", encoding="utf-8") as f:
            herbs.append(json.load(f))
    return herbs


def load_all_zhengsu(zhengsu_dir: Path) -> dict[str, dict]:
    """讀取所有證素資料，返回 ID 到證素的映射"""
    zhengsu_map = {}
    for file_path in zhengsu_dir.glob("*.json"):
        if file_path.name.startswith("_"):
            continue
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            zhengsu_map[data["id"]] = data
    return zhengsu_map


def get_herb_zhengsu(herb: dict) -> set[str]:
    """獲取中藥的所有證素 ID"""
    zhengsu_set = set()
    for func in herb.get("functions", []):
        for z in func.get("zhengsu", []):
            zhengsu_set.add(z)
    return zhengsu_set


def get_herb_treatments(herb: dict) -> set[str]:
    """獲取中藥的所有治法"""
    treatments = set()
    for func in herb.get("functions", []):
        if func.get("treatment"):
            treatments.add(func["treatment"])
    return treatments


def query_by_meridian(herbs: list[dict], meridian: str) -> list[dict]:
    """按歸經查詢中藥"""
    results = []
    for herb in herbs:
        meridians = herb.get("properties", {}).get("meridians", [])
        if meridian in meridians:
            results.append(herb)
    return results


def query_by_zhengsu(herbs: list[dict], zhengsu_id: str) -> list[dict]:
    """按證素查詢中藥"""
    results = []
    for herb in herbs:
        herb_zhengsu = get_herb_zhengsu(herb)
        if zhengsu_id in herb_zhengsu:
            results.append(herb)
    return results


def query_by_treatment(herbs: list[dict], treatment: str) -> list[dict]:
    """按治法查詢中藥"""
    results = []
    for herb in herbs:
        herb_treatments = get_herb_treatments(herb)
        if treatment in herb_treatments:
            results.append(herb)
    return results


def display_herb(herb: dict, zhengsu_map: dict[str, dict]) -> None:
    """顯示中藥資料"""
    print(f"\n{'=' * 50}")
    print(f"名稱：{herb.get('name', '未知')}")
    print(f"拼音：{herb.get('pinyin', '未知')}")
    print(f"別名：{'、'.join(herb.get('alias', []))}")
    print(f"分類：{herb.get('category', '未知')}")

    properties = herb.get("properties", {})
    print(f"性味：{properties.get('nature', '未知')}，{'、'.join(properties.get('flavor', []))}")
    print(f"歸經：{'、'.join(properties.get('meridians', []))}經")

    # 顯示功效（新結構）
    functions = herb.get("functions", [])
    if functions:
        print("\n功效（證素）：")
        for i, func in enumerate(functions, 1):
            treatment = func.get("treatment", "")
            zhengsu_ids = func.get("zhengsu", [])
            zhengsu_names = [zhengsu_map.get(z, {}).get("name", z) for z in zhengsu_ids]
            manifestations = func.get("manifestations", [])
            prerequisite = func.get("prerequisite")

            print(f"  {i}. 【{treatment}】")
            print(f"     證素：{' + '.join(zhengsu_names)}")
            print(f"     主治：{'、'.join(manifestations)}")
            if prerequisite:
                print(f"     前提：{prerequisite}")
    else:
        # 兼容舊結構
        effects = herb.get("effects", [])
        indications = herb.get("indications", [])
        if effects:
            print(f"功效：{'、'.join(effects)}")
        if indications:
            print(f"主治：{'、'.join(indications)}")

    print(f"用量：{herb.get('dosage', '未知')}")

    cautions = herb.get("cautions", [])
    if cautions:
        print(f"注意事項：{'、'.join(cautions)}")


def list_all_meridians(herbs: list[dict]) -> set[str]:
    """列出所有歸經"""
    meridians = set()
    for herb in herbs:
        for m in herb.get("properties", {}).get("meridians", []):
            meridians.add(m)
    return meridians


def list_all_zhengsu_in_herbs(herbs: list[dict]) -> set[str]:
    """列出所有中藥包含的證素"""
    zhengsu_set = set()
    for herb in herbs:
        zhengsu_set.update(get_herb_zhengsu(herb))
    return zhengsu_set


def list_all_treatments(herbs: list[dict]) -> set[str]:
    """列出所有治法"""
    treatments = set()
    for herb in herbs:
        treatments.update(get_herb_treatments(herb))
    return treatments


def print_help():
    """顯示幫助資訊"""
    print("""
中藥查詢工具

用法：
  python query_herbs.py [選項] [查詢值]

選項：
  -m, --meridian <歸經>    按歸經查詢（如：肺、心、脾）
  -z, --zhengsu <證素ID>   按證素查詢（如：feng、han、qi_xu）
  -t, --treatment <治法>   按治法查詢（如：祛風、散寒、補氣）
  -l, --list               列出可用的查詢選項
  -h, --help               顯示此幫助資訊

範例：
  python query_herbs.py -m 肺           # 查詢歸肺經的中藥
  python query_herbs.py -z feng         # 查詢治療「風」證素的中藥
  python query_herbs.py -t 祛風         # 查詢具有「祛風」治法的中藥
  python query_herbs.py                 # 進入互動模式
""")


def interactive_mode(herbs: list[dict], zhengsu_map: dict[str, dict]):
    """互動式查詢模式"""
    print("\n中藥查詢工具 - 互動模式")
    print("=" * 50)
    print("查詢選項：")
    print("  1. 按歸經查詢")
    print("  2. 按證素查詢")
    print("  3. 按治法查詢")
    print("  q. 退出")

    while True:
        print("\n" + "-" * 50)
        choice = input("請選擇查詢方式（1/2/3/q）：").strip()

        if choice.lower() == "q":
            print("感謝使用，再見！")
            break

        if choice == "1":
            all_meridians = list_all_meridians(herbs)
            print(f"可查詢的歸經：{'、'.join(sorted(all_meridians))}")
            meridian = input("請輸入歸經：").strip().replace("經", "")
            if meridian:
                results = query_by_meridian(herbs, meridian)
                if results:
                    print(f"\n找到 {len(results)} 筆歸{meridian}經的中藥：")
                    for herb in results:
                        display_herb(herb, zhengsu_map)
                else:
                    print(f"沒有找到歸{meridian}經的中藥")

        elif choice == "2":
            all_zhengsu = list_all_zhengsu_in_herbs(herbs)
            zhengsu_names = [(z, zhengsu_map.get(z, {}).get("name", z)) for z in sorted(all_zhengsu)]
            print("可查詢的證素：")
            for z_id, z_name in zhengsu_names:
                print(f"  {z_id}: {z_name}")
            zhengsu_id = input("請輸入證素 ID：").strip()
            if zhengsu_id:
                results = query_by_zhengsu(herbs, zhengsu_id)
                zhengsu_name = zhengsu_map.get(zhengsu_id, {}).get("name", zhengsu_id)
                if results:
                    print(f"\n找到 {len(results)} 筆治療「{zhengsu_name}」的中藥：")
                    for herb in results:
                        display_herb(herb, zhengsu_map)
                else:
                    print(f"沒有找到治療「{zhengsu_name}」的中藥")

        elif choice == "3":
            all_treatments = list_all_treatments(herbs)
            print(f"可查詢的治法：{'、'.join(sorted(all_treatments))}")
            treatment = input("請輸入治法：").strip()
            if treatment:
                results = query_by_treatment(herbs, treatment)
                if results:
                    print(f"\n找到 {len(results)} 筆具有「{treatment}」治法的中藥：")
                    for herb in results:
                        display_herb(herb, zhengsu_map)
                else:
                    print(f"沒有找到具有「{treatment}」治法的中藥")


def main():
    # 確定資料目錄路徑
    script_dir = Path(__file__).parent
    herbs_dir = script_dir.parent / "data" / "herbs"
    zhengsu_dir = script_dir.parent / "data" / "zhengsu"

    if not herbs_dir.exists():
        print(f"錯誤：找不到中藥資料目錄 {herbs_dir}")
        sys.exit(1)

    # 讀取所有資料
    herbs = load_all_herbs(herbs_dir)
    zhengsu_map = load_all_zhengsu(zhengsu_dir) if zhengsu_dir.exists() else {}

    if not herbs:
        print("警告：沒有找到任何中藥資料")
        sys.exit(1)

    print(f"已載入 {len(herbs)} 筆中藥資料")
    print(f"已載入 {len(zhengsu_map)} 筆證素資料")

    # 命令列參數模式
    if len(sys.argv) > 1:
        arg = sys.argv[1]

        if arg in ["-h", "--help"]:
            print_help()
            return

        if arg in ["-l", "--list"]:
            print("\n可用的歸經：")
            print(f"  {'、'.join(sorted(list_all_meridians(herbs)))}")
            print("\n可用的證素：")
            for z_id, z_name in [(z, zhengsu_map.get(z, {}).get("name", z))
                                  for z in sorted(list_all_zhengsu_in_herbs(herbs))]:
                print(f"  {z_id}: {z_name}")
            print("\n可用的治法：")
            print(f"  {'、'.join(sorted(list_all_treatments(herbs)))}")
            return

        if len(sys.argv) >= 3:
            value = sys.argv[2]

            if arg in ["-m", "--meridian"]:
                meridian = value.replace("經", "")
                results = query_by_meridian(herbs, meridian)
                if results:
                    print(f"\n找到 {len(results)} 筆歸{meridian}經的中藥：")
                    for herb in results:
                        display_herb(herb, zhengsu_map)
                else:
                    print(f"沒有找到歸{meridian}經的中藥")
                return

            if arg in ["-z", "--zhengsu"]:
                zhengsu_id = value
                results = query_by_zhengsu(herbs, zhengsu_id)
                zhengsu_name = zhengsu_map.get(zhengsu_id, {}).get("name", zhengsu_id)
                if results:
                    print(f"\n找到 {len(results)} 筆治療「{zhengsu_name}」的中藥：")
                    for herb in results:
                        display_herb(herb, zhengsu_map)
                else:
                    print(f"沒有找到治療「{zhengsu_name}」的中藥")
                return

            if arg in ["-t", "--treatment"]:
                treatment = value
                results = query_by_treatment(herbs, treatment)
                if results:
                    print(f"\n找到 {len(results)} 筆具有「{treatment}」治法的中藥：")
                    for herb in results:
                        display_herb(herb, zhengsu_map)
                else:
                    print(f"沒有找到具有「{treatment}」治法的中藥")
                return

        # 舊版兼容：直接傳入歸經
        meridian = arg.replace("經", "")
        results = query_by_meridian(herbs, meridian)
        if results:
            print(f"\n找到 {len(results)} 筆歸{meridian}經的中藥：")
            for herb in results:
                display_herb(herb, zhengsu_map)
        else:
            print(f"沒有找到歸{meridian}經的中藥")
        return

    # 互動式查詢
    interactive_mode(herbs, zhengsu_map)


if __name__ == "__main__":
    main()
