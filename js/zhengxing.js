/**
 * 中醫證素辨證資料庫 - 證型查詢頁
 */

const state = {
  zhengsu: [],
  zhengxing: [],
  symptoms: [],  // 症狀資料
  formulas: [],  // 方劑資料
  selectedNature: [],  // 已選病性證素
  selectedLocation: [], // 已選病位證素
  matchedPattern: null
};

// 症狀文件列表
const SYMPTOM_FILES = [
  'qiduan.json',
  'zihan.json',
  'shengdiweiqie.json',
  'yaoxisuanruan.json',
  'erming.json',
  'fali.json',
  'nagu.json',
  'fuzhang.json',
  'bianxi.json',
  'xinji.json'
];

// 常用病性證素（用於選擇器）
const COMMON_NATURE_ZHENGSU = [
  'qi_xu', 'qi_zhi', 'qi_ni', 'qi_xian', 'qi_tuo', 'qi_jue', 'bu_gu',
  'xue_xu', 'xue_yu', 'xue_re',
  'yin_xu', 'yang_xu', 'wang_yin', 'wang_yang',
  'feng', 'han', 'shi', 'huo', 'tan'
];

// 病位證素
const LOCATION_ZHENGSU = [
  'xin', 'gan', 'pi', 'fei', 'shen',
  'wei', 'dachang', 'pangguang',
  'biao'
];

// 方劑文件列表
const FORMULA_FILES = [
  'buzhongyiqi_tang.json',
  'mahuangtang.json',
  'yupingfeng_san.json',
  'sijunzi_tang.json'
];

// 證型文件列表
const ZHENGXING_FILES = [
  'feiqixu.json',
  'piqixu.json',
  'xinqixu.json',
  'ganqixu.json',
  'shenqixu.json',
  'qixuelianxu.json',
  'qixubuning.json',
  'zhongqixiaxian.json',
  'qixuzheng.json',
  'qituozheng.json',
  'shenqibugu.json',
  'qingyangbusheng.json',
  'wangyinzheng.json',
  'wangyangzheng.json',
  'qijuezheng.json'
];

/**
 * 載入證素數據
 */
async function loadZhengsu() {
  const allIds = [...COMMON_NATURE_ZHENGSU, ...LOCATION_ZHENGSU];
  const uniqueIds = [...new Set(allIds)];

  const promises = uniqueIds.map(id => {
    const fileName = id === 'yin_xie' ? 'yin_pathogen.json' : `${id}.json`;
    return fetch(`data/zhengsu/${fileName}`)
      .then(res => res.ok ? res.json() : null)
      .catch(() => null);
  });

  const results = await Promise.all(promises);
  state.zhengsu = results.filter(Boolean);
}

/**
 * 載入證型數據
 */
async function loadZhengxing() {
  const promises = ZHENGXING_FILES.map(file =>
    fetch(`data/zhengxing/${file}`)
      .then(res => res.ok ? res.json() : null)
      .catch(() => null)
  );

  const results = await Promise.all(promises);
  state.zhengxing = results.filter(Boolean);
}

/**
 * 載入症狀數據
 */
async function loadSymptoms() {
  const promises = SYMPTOM_FILES.map(file =>
    fetch(`data/symptoms/${file}`)
      .then(res => res.ok ? res.json() : null)
      .catch(() => null)
  );

  const results = await Promise.all(promises);
  state.symptoms = results.filter(Boolean);
}

/**
 * 載入方劑數據
 */
async function loadFormulas() {
  const promises = FORMULA_FILES.map(file =>
    fetch(`data/formulas/${file}`)
      .then(res => res.ok ? res.json() : null)
      .catch(() => null)
  );

  const results = await Promise.all(promises);
  state.formulas = results.filter(Boolean);
}

/**
 * 獲取證素名稱
 */
function getZhengsuName(id) {
  const z = state.zhengsu.find(zs => zs.id === id);
  return z ? z.name : id;
}

/**
 * 獲取症狀名稱
 * 將症狀ID（如 symptom_qiduan）轉換為中文名稱（如 氣短）
 * 如果不是ID格式則直接返回原文字
 */
function getSymptomName(idOrName) {
  // 如果是症狀ID格式（以 symptom_ 開頭）
  if (typeof idOrName === 'string' && idOrName.startsWith('symptom_')) {
    const symptom = state.symptoms.find(s => s.id === idOrName);
    return symptom ? symptom.name : idOrName;
  }
  // 否則直接返回原文字（已經是中文名稱）
  return idOrName;
}

/**
 * 獲取方劑名稱
 * 將方劑ID（如 buzhongyiqi_tang）轉換為中文名稱（如 補中益氣湯）
 */
function getFormulaName(id) {
  const f = state.formulas.find(formula => formula.id === id);
  return f ? f.name : id;
}

/**
 * 獲取證型名稱
 * 將證型ID（如 qi_xu_zheng）轉換為中文名稱（如 氣虛證）
 */
function getZhengxingName(id) {
  const zx = state.zhengxing.find(z => z.id === id);
  return zx ? zx.name : id;
}

/**
 * 渲染證素選擇器
 */
function renderSelectors() {
  // 病性選擇器
  const natureSelector = document.getElementById('nature-selector');
  natureSelector.innerHTML = COMMON_NATURE_ZHENGSU.map(id => {
    const name = getZhengsuName(id);
    const z = state.zhengsu.find(zs => zs.id === id);
    const criticalClass = z?.is_critical ? 'critical' : '';
    return `<span class="selector-tag ${criticalClass}" data-id="${id}" data-type="nature">${name}</span>`;
  }).join(' ');

  // 病位選擇器
  const locationSelector = document.getElementById('location-selector');
  locationSelector.innerHTML = LOCATION_ZHENGSU.map(id => {
    const name = getZhengsuName(id);
    return `<span class="selector-tag" data-id="${id}" data-type="location">${name}</span>`;
  }).join('');

  // 綁定點擊事件
  document.querySelectorAll('.selector-tag').forEach(tag => {
    tag.addEventListener('click', () => toggleSelection(tag));
  });
}

/**
 * 切換選擇狀態
 */
function toggleSelection(tag) {
  const id = tag.dataset.id;
  const type = tag.dataset.type;

  if (type === 'nature') {
    if (state.selectedNature.includes(id)) {
      state.selectedNature = state.selectedNature.filter(z => z !== id);
      tag.classList.remove('active');
    } else {
      state.selectedNature.push(id);
      tag.classList.add('active');
    }
  } else {
    if (state.selectedLocation.includes(id)) {
      state.selectedLocation = state.selectedLocation.filter(z => z !== id);
      tag.classList.remove('active');
    } else {
      state.selectedLocation.push(id);
      tag.classList.add('active');
    }
  }

  updateSummary();
  matchPattern();
}

/**
 * 更新已選摘要
 */
function updateSummary() {
  const summaryContent = document.getElementById('summary-content');

  const allSelected = [...state.selectedLocation, ...state.selectedNature];

  if (allSelected.length === 0) {
    summaryContent.textContent = '尚未選擇';
  } else {
    const names = allSelected.map(id => getZhengsuName(id));
    summaryContent.textContent = names.join(' + ');
  }
}

/**
 * 匹配證型
 */
function matchPattern() {
  const resultContent = document.getElementById('result-content');
  const detailSection = document.getElementById('zhengxing-detail');

  if (state.selectedNature.length === 0) {
    resultContent.innerHTML = '<div class="no-selection">請先選擇病性證素</div>';
    detailSection.classList.add('hidden');
    return;
  }

  // 尋找匹配的證型
  const matched = state.zhengxing.filter(zx => {
    const patternNature = zx.zhengsu_composition?.nature || [];
    const patternLocation = zx.zhengsu_composition?.location || [];

    // 檢查病性是否匹配
    const natureMatch = state.selectedNature.every(n => patternNature.includes(n)) &&
                        patternNature.every(n => state.selectedNature.includes(n));

    // 檢查病位是否匹配
    let locationMatch;
    if (state.selectedLocation.length === 0) {
      // 未選病位：匹配無病位或全身性的證型
      locationMatch = patternLocation.length === 0;
    } else {
      locationMatch = state.selectedLocation.every(l => patternLocation.includes(l)) &&
                      patternLocation.every(l => state.selectedLocation.includes(l));
    }

    return natureMatch && locationMatch;
  });

  if (matched.length === 0) {
    // 顯示推測的證型名稱
    const inferredName = inferPatternName();
    resultContent.innerHTML = `
      <div class="inferred-pattern">
        <div class="inferred-name">${inferredName}</div>
        <div class="inferred-note">（資料庫中尚無此證型的詳細資料）</div>
      </div>
    `;
    detailSection.classList.add('hidden');
  } else {
    // 顯示匹配的證型
    state.matchedPattern = matched[0];
    resultContent.innerHTML = `
      <div class="matched-pattern" data-id="${matched[0].id}">
        <div class="matched-name">${matched[0].name}</div>
        <div class="matched-alias">${matched[0].alias?.join('、') || ''}</div>
      </div>
    `;

    // 顯示詳情
    renderPatternDetail(matched[0]);
    detailSection.classList.remove('hidden');
  }
}

/**
 * 推測證型名稱
 */
function inferPatternName() {
  const locationNames = state.selectedLocation.map(id => getZhengsuName(id));
  const natureNames = state.selectedNature.map(id => getZhengsuName(id));

  if (locationNames.length === 0) {
    return natureNames.join('') + '證';
  } else {
    return locationNames.join('') + natureNames.join('') + '證';
  }
}

/**
 * 渲染證型詳情
 */
function renderPatternDetail(pattern) {
  const detailSection = document.getElementById('zhengxing-detail');

  // 症狀（將ID轉換為中文名稱）
  const mainSymptoms = (pattern.symptoms?.main || []).map(s => getSymptomName(s));
  const secondarySymptoms = (pattern.symptoms?.secondary || []).map(s => getSymptomName(s));

  // 臨床變型
  const variants = pattern.clinical_variants || [];

  // 類證鑑別
  const differentiation = pattern.differentiation || [];

  // 文獻選錄
  const literature = pattern.literature || [];

  detailSection.innerHTML = `
    <h3 class="section-title">${pattern.name}</h3>

    <div class="detail-card">
      <h4>病機</h4>
      <p>${pattern.pathogenesis || pattern.description || '暫無說明'}</p>
    </div>

    <div class="detail-card">
      <h4>證素組成</h4>
      <div class="zhengsu-composition">
        <span class="comp-label">病位：</span>
        <span class="comp-tags">${(pattern.zhengsu_composition?.location || []).map(id =>
          `<span class="comp-tag location">${getZhengsuName(id)}</span>`
        ).join('') || '<span class="comp-tag location">全身性</span>'}</span>
        <span class="comp-label">病性：</span>
        <span class="comp-tags">${(pattern.zhengsu_composition?.nature || []).map(id =>
          `<span class="comp-tag nature">${getZhengsuName(id)}</span>`
        ).join('')}</span>
      </div>
    </div>

    <div class="detail-card">
      <h4>臨床表現</h4>
      <div class="symptoms-section">
        <div class="symptom-group">
          <span class="symptom-label">主症：</span>
          <span class="symptom-list">${mainSymptoms.join('、')}</span>
        </div>
        ${secondarySymptoms.length > 0 ? `
          <div class="symptom-group">
            <span class="symptom-label">次症：</span>
            <span class="symptom-list">${secondarySymptoms.join('、')}</span>
          </div>
        ` : ''}
        <div class="symptom-group">
          <span class="symptom-label">舌象：</span>
          <span>${pattern.symptoms?.tongue || '未詳'}</span>
        </div>
        <div class="symptom-group">
          <span class="symptom-label">脈象：</span>
          <span>${pattern.symptoms?.pulse || '未詳'}</span>
        </div>
      </div>
    </div>

    <div class="detail-card">
      <h4>治則治法</h4>
      <p>${(pattern.treatment_principle || []).join('、')}</p>
    </div>

    ${pattern.recommended_formulas?.length > 0 ? `
      <div class="detail-card">
        <h4>推薦方劑</h4>
        <div class="formula-tags">
          ${pattern.recommended_formulas.map(f => `<span class="formula-tag">${getFormulaName(f)}</span>`).join('')}
        </div>
      </div>
    ` : ''}

    ${(pattern.evolved_from?.length > 0 || pattern.can_evolve_to?.length > 0) ? `
      <div class="detail-card">
        <h4>演變關係</h4>
        <div class="evolution">
          ${pattern.evolved_from?.length > 0 ? `
            <div class="evo-line">
              <span>來源：</span>
              ${pattern.evolved_from.map(id => `<span class="evo-tag from">${getZhengxingName(id)}</span>`).join(' → ')}
              <span> → 本證</span>
            </div>
          ` : ''}
          ${pattern.can_evolve_to?.length > 0 ? `
            <div class="evo-line">
              <span>本證可演變為：</span>
              ${pattern.can_evolve_to.map(id => `<span class="evo-tag to">${getZhengxingName(id)}</span>`).join('、')}
            </div>
          ` : ''}
        </div>
      </div>
    ` : ''}

    ${variants.length > 0 ? `
      <div class="detail-card">
        <h4>臨床變型</h4>
        <div class="variants-list">
          ${variants.map(v => `
            <div class="variant-item">
              <div class="variant-name">${v.name}</div>
              <div class="variant-cause"><strong>病因：</strong>${v.cause || ''}</div>
              <div class="variant-symptoms"><strong>症狀：</strong>${(v.symptoms || []).map(s => getSymptomName(s)).join('、')}</div>
              <div class="variant-treatment"><strong>治法：</strong>${v.treatment || ''}</div>
              <div class="variant-formula"><strong>方劑：</strong>${v.formula || ''}${v.formula_source ? `（${v.formula_source}）` : ''}</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    ${differentiation.length > 0 ? `
      <div class="detail-card">
        <h4>類證鑑別</h4>
        <div class="diff-list">
          ${differentiation.map(d => `
            <div class="diff-item">
              <div class="diff-header">
                <span class="diff-vs">與</span>
                <span class="diff-name">${d.compare_name}</span>
                <span class="diff-vs">鑑別</span>
              </div>
              <div class="diff-similarities">
                <strong>相同點：</strong>${(d.similarities || []).join('；')}
              </div>
              <div class="diff-differences">
                <div class="diff-this"><strong>本證：</strong>${d.differences?.this_pattern || ''}</div>
                <div class="diff-other"><strong>彼證：</strong>${d.differences?.other_pattern || ''}</div>
              </div>
              ${d.key_points?.length > 0 ? `
                <div class="diff-keypoints">
                  <strong>鑑別要點：</strong>
                  <ul>${d.key_points.map(p => `<li>${p}</li>`).join('')}</ul>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    ${literature.length > 0 ? `
      <div class="detail-card">
        <h4>文獻選錄</h4>
        <div class="literature-list">
          ${literature.map(l => `
            <div class="literature-item">
              <div class="literature-source">${l.source}</div>
              <div class="literature-quote">「${l.quote}」</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    ${pattern.common_in?.length > 0 ? `
      <div class="detail-card">
        <h4>常見人群</h4>
        <p>${pattern.common_in.join('、')}</p>
      </div>
    ` : ''}
  `;
}

/**
 * 渲染所有證型列表
 */
function renderZhengxingList() {
  const listContainer = document.getElementById('zhengxing-list');

  if (state.zhengxing.length === 0) {
    listContainer.innerHTML = '<div class="no-results">尚無證型資料</div>';
    return;
  }

  listContainer.innerHTML = state.zhengxing.map(zx => {
    const locations = (zx.zhengsu_composition?.location || []).map(id => getZhengsuName(id));
    const natures = (zx.zhengsu_composition?.nature || []).map(id => getZhengsuName(id));
    const isCritical = natures.some(n => ['氣脫', '亡陰', '亡陽', '氣厥'].includes(n));

    return `
      <div class="zhengxing-card ${isCritical ? 'critical' : ''}" data-id="${zx.id}">
        <div class="zx-name">${zx.name}</div>
        <div class="zx-composition">
          ${locations.length > 0 ? locations.join(' + ') + ' + ' : ''}${natures.join(' + ')}
        </div>
        <div class="zx-treatment">${(zx.treatment_principle || []).slice(0, 2).join('、')}</div>
      </div>
    `;
  }).join('');

  // 綁定點擊事件
  listContainer.querySelectorAll('.zhengxing-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const pattern = state.zhengxing.find(zx => zx.id === id);
      if (pattern) {
        // 設置選擇器狀態
        clearSelection();

        // 選中對應證素
        (pattern.zhengsu_composition?.nature || []).forEach(n => {
          state.selectedNature.push(n);
          const tag = document.querySelector(`.selector-tag[data-id="${n}"]`);
          if (tag) tag.classList.add('active');
        });

        (pattern.zhengsu_composition?.location || []).forEach(l => {
          state.selectedLocation.push(l);
          const tag = document.querySelector(`.selector-tag[data-id="${l}"]`);
          if (tag) tag.classList.add('active');
        });

        updateSummary();
        matchPattern();

        // 滾動到頂部
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}

/**
 * 清除選擇
 */
function clearSelection() {
  state.selectedNature = [];
  state.selectedLocation = [];

  document.querySelectorAll('.selector-tag').forEach(tag => {
    tag.classList.remove('active');
  });

  updateSummary();

  const resultContent = document.getElementById('result-content');
  resultContent.innerHTML = '<div class="no-selection">請先選擇病性證素</div>';

  document.getElementById('zhengxing-detail').classList.add('hidden');
}

/**
 * 初始化
 */
document.addEventListener('DOMContentLoaded', async () => {
  // 載入數據
  await loadZhengsu();
  await loadZhengxing();
  await loadSymptoms();
  await loadFormulas();

  // 渲染選擇器
  renderSelectors();

  // 渲染證型列表
  renderZhengxingList();

  // 綁定清除按鈕
  document.getElementById('btn-clear-selection').addEventListener('click', clearSelection);
});
