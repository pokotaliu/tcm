#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
資料驗證腳本
檢查 TCM 資料的完整性和一致性
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Set, Any, Tuple
from dataclasses import dataclass, field


@dataclass
class ValidationResult:
    """驗證結果"""
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    info: List[str] = field(default_factory=list)

    def add_error(self, msg: str):
        self.errors.append(msg)

    def add_warning(self, msg: str):
        self.warnings.append(msg)

    def add_info(self, msg: str):
        self.info.append(msg)

    @property
    def has_errors(self) -> bool:
        return len(self.errors) > 0

    def print_report(self):
        """輸出驗證報告"""
        print("\n" + "=" * 60)
        print("資料驗證報告")
        print("=" * 60)

        if self.errors:
            print(f"\n錯誤 ({len(self.errors)}):")
            for err in self.errors:
                print(f"  ❌ {err}")

        if self.warnings:
            print(f"\n警告 ({len(self.warnings)}):")
            for warn in self.warnings:
                print(f"  ⚠️  {warn}")

        if self.info:
            print(f"\n資訊 ({len(self.info)}):")
            for info in self.info:
                print(f"  ℹ️  {info}")

        print("\n" + "-" * 60)
        if not self.has_errors:
            print("✅ 驗證通過，無嚴重錯誤")
        else:
            print(f"❌ 驗證發現 {len(self.errors)} 個錯誤")
        print("=" * 60 + "\n")


class DataValidator:
    """資料驗證器"""

    def __init__(self, data_dir: str):
        self.data_dir = Path(data_dir)
        self.result = ValidationResult()

        # 載入所有資料
        self.zhengsu_ids: Set[str] = set()
        self.zhengxing_ids: Set[str] = set()
        self.formula_ids: Set[str] = set()
        self.herb_ids: Set[str] = set()
        self.symptom_ids: Set[str] = set()

        self.zhengxing_data: Dict[str, Any] = {}
        self.zhengsu_data: Dict[str, Any] = {}

    def load_json(self, file_path: Path) -> Dict:
        """載入 JSON 檔案"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            self.result.add_error(f"JSON 解析錯誤: {file_path} - {e}")
            return {}
        except Exception as e:
            self.result.add_error(f"讀取檔案錯誤: {file_path} - {e}")
            return {}

    def load_all_ids(self):
        """載入所有實體的 ID"""
        # 載入證素 ID
        zhengsu_dir = self.data_dir / "zhengsu"
        if zhengsu_dir.exists():
            for f in zhengsu_dir.glob("*.json"):
                if f.name.startswith("_"):
                    continue
                data = self.load_json(f)
                if "id" in data:
                    self.zhengsu_ids.add(data["id"])
                    self.zhengsu_data[data["id"]] = data

        # 載入證型 ID
        zhengxing_dir = self.data_dir / "zhengxing"
        if zhengxing_dir.exists():
            for f in zhengxing_dir.glob("*.json"):
                if f.name.startswith("_"):
                    continue
                data = self.load_json(f)
                if "id" in data:
                    self.zhengxing_ids.add(data["id"])
                    self.zhengxing_data[data["id"]] = data

        # 載入方劑 ID
        formulas_dir = self.data_dir / "formulas"
        if formulas_dir.exists():
            for f in formulas_dir.glob("*.json"):
                if f.name.startswith("_"):
                    continue
                data = self.load_json(f)
                if "id" in data:
                    self.formula_ids.add(data["id"])

        # 載入中藥 ID
        herbs_dir = self.data_dir / "herbs"
        if herbs_dir.exists():
            for f in herbs_dir.glob("*.json"):
                if f.name.startswith("_"):
                    continue
                data = self.load_json(f)
                if "id" in data:
                    self.herb_ids.add(data["id"])

        # 載入症狀 ID
        symptoms_dir = self.data_dir / "symptoms"
        if symptoms_dir.exists():
            for f in symptoms_dir.glob("*.json"):
                if f.name.startswith("_"):
                    continue
                data = self.load_json(f)
                if "id" in data:
                    self.symptom_ids.add(data["id"])

        self.result.add_info(f"載入證素: {len(self.zhengsu_ids)} 個")
        self.result.add_info(f"載入證型: {len(self.zhengxing_ids)} 個")
        self.result.add_info(f"載入方劑: {len(self.formula_ids)} 個")
        self.result.add_info(f"載入中藥: {len(self.herb_ids)} 個")
        self.result.add_info(f"載入症狀: {len(self.symptom_ids)} 個")

    def validate_zhengsu_references(self):
        """驗證證素引用的有效性"""
        for zx_id, data in self.zhengxing_data.items():
            comp = data.get("zhengsu_composition", {})

            # 檢查病位證素
            for loc_id in comp.get("location", []):
                if loc_id not in self.zhengsu_ids:
                    self.result.add_warning(
                        f"證型 [{data.get('name', zx_id)}] 引用了不存在的病位證素: {loc_id}"
                    )

            # 檢查病性證素
            for nat_id in comp.get("nature", []):
                if nat_id not in self.zhengsu_ids:
                    self.result.add_warning(
                        f"證型 [{data.get('name', zx_id)}] 引用了不存在的病性證素: {nat_id}"
                    )

    def validate_evolution_consistency(self):
        """驗證演變關係的一致性"""
        # 建立演變關係映射
        evolve_to: Dict[str, Set[str]] = {}
        evolve_from: Dict[str, Set[str]] = {}

        for zx_id, data in self.zhengxing_data.items():
            # 可演變成的證型
            for target in data.get("can_evolve_to", []):
                if zx_id not in evolve_to:
                    evolve_to[zx_id] = set()
                evolve_to[zx_id].add(target)

            # 由哪些證型演變而來
            for source in data.get("evolved_from", []):
                if zx_id not in evolve_from:
                    evolve_from[zx_id] = set()
                evolve_from[zx_id].add(source)

        # 檢查雙向一致性
        for zx_id, targets in evolve_to.items():
            for target in targets:
                # 檢查目標證型是否存在
                if target not in self.zhengxing_ids:
                    self.result.add_warning(
                        f"證型 [{self.zhengxing_data.get(zx_id, {}).get('name', zx_id)}] "
                        f"的 can_evolve_to 引用了不存在的證型: {target}"
                    )
                    continue

                # 檢查反向引用
                if target in evolve_from and zx_id in evolve_from[target]:
                    pass  # 一致
                else:
                    # 不強制要求雙向一致，只作為警告
                    self.result.add_info(
                        f"演變關係單向: [{self.zhengxing_data.get(zx_id, {}).get('name', zx_id)}] "
                        f"→ [{self.zhengxing_data.get(target, {}).get('name', target)}]，"
                        f"但反向未標記"
                    )

        # 檢查 evolved_from 引用的有效性
        for zx_id, sources in evolve_from.items():
            for source in sources:
                if source not in self.zhengxing_ids:
                    self.result.add_warning(
                        f"證型 [{self.zhengxing_data.get(zx_id, {}).get('name', zx_id)}] "
                        f"的 evolved_from 引用了不存在的證型: {source}"
                    )

        # 檢查循環引用
        self._check_evolution_cycles(evolve_to)

    def _check_evolution_cycles(self, evolve_to: Dict[str, Set[str]]):
        """檢查演變關係是否有循環"""
        def dfs(node: str, visited: Set[str], path: List[str]) -> bool:
            if node in path:
                cycle = path[path.index(node):] + [node]
                cycle_names = [
                    self.zhengxing_data.get(n, {}).get('name', n)
                    for n in cycle
                ]
                self.result.add_error(f"發現演變循環: {' → '.join(cycle_names)}")
                return True

            if node in visited:
                return False

            visited.add(node)
            path.append(node)

            for next_node in evolve_to.get(node, set()):
                if next_node in self.zhengxing_ids:
                    if dfs(next_node, visited, path):
                        return True

            path.pop()
            return False

        visited: Set[str] = set()
        for start in evolve_to.keys():
            if start not in visited:
                dfs(start, visited, [])

    def validate_differentiation_references(self):
        """驗證鑑別證型引用的有效性"""
        for zx_id, data in self.zhengxing_data.items():
            # 檢查 differentiate_from
            for diff_id in data.get("differentiate_from", []):
                if diff_id not in self.zhengxing_ids:
                    self.result.add_warning(
                        f"證型 [{data.get('name', zx_id)}] 的 differentiate_from "
                        f"引用了不存在的證型: {diff_id}"
                    )

            # 檢查 differentiation 陣列
            for diff in data.get("differentiation", []):
                compare_id = diff.get("compare_with")
                if compare_id and compare_id not in self.zhengxing_ids:
                    self.result.add_warning(
                        f"證型 [{data.get('name', zx_id)}] 的 differentiation "
                        f"引用了不存在的證型: {compare_id}"
                    )

    def validate_formula_references(self):
        """驗證方劑引用的有效性"""
        for zx_id, data in self.zhengxing_data.items():
            for formula_id in data.get("recommended_formulas", []):
                if formula_id not in self.formula_ids:
                    self.result.add_info(
                        f"證型 [{data.get('name', zx_id)}] 引用的方劑 "
                        f"[{formula_id}] 尚未建立資料檔案"
                    )

    def validate_herb_references(self):
        """驗證中藥引用的有效性"""
        for zx_id, data in self.zhengxing_data.items():
            for herb_id in data.get("recommended_herbs", []):
                if herb_id not in self.herb_ids:
                    self.result.add_info(
                        f"證型 [{data.get('name', zx_id)}] 引用的中藥 "
                        f"[{herb_id}] 尚未建立資料檔案"
                    )

    def validate_required_fields(self):
        """驗證必填欄位"""
        required_fields = ["id", "name", "zhengsu_composition", "symptoms", "treatment_principle"]

        for zx_id, data in self.zhengxing_data.items():
            for field in required_fields:
                if field not in data:
                    self.result.add_error(
                        f"證型 [{data.get('name', zx_id)}] 缺少必填欄位: {field}"
                    )

    def run(self) -> ValidationResult:
        """執行所有驗證"""
        print("開始資料驗證...")

        self.load_all_ids()
        self.validate_required_fields()
        self.validate_zhengsu_references()
        self.validate_evolution_consistency()
        self.validate_differentiation_references()
        self.validate_formula_references()
        self.validate_herb_references()

        self.result.print_report()
        return self.result


def main():
    """主函數"""
    import argparse

    parser = argparse.ArgumentParser(description="驗證 TCM 資料的完整性和一致性")
    parser.add_argument(
        "--data-dir",
        default="data",
        help="資料目錄路徑 (預設: data)"
    )

    args = parser.parse_args()

    # 確定資料目錄
    script_dir = Path(__file__).parent
    data_dir = script_dir.parent / args.data_dir

    if not data_dir.exists():
        print(f"錯誤: 資料目錄不存在: {data_dir}")
        return 1

    validator = DataValidator(str(data_dir))
    result = validator.run()

    return 1 if result.has_errors else 0


if __name__ == "__main__":
    exit(main())
