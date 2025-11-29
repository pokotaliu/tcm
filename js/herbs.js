/**
 * 中醫證素辨證資料庫 - 中藥查詢頁
 */

// 全域狀態
const state = {
  zhengsu: [],
  herbs: [],
  filters: {
    zhengsu: null,
    meridian: null,
    nature: null,
    treatment: null,
    search: ''
  }
};

/**
 * 檢測是否使用 file:// 協議開啟
 */
function isFileProtocol() {
  return window.location.protocol === 'file:';
}

/**
 * 顯示錯誤提示
 */
function showLoadError() {
  const container = document.querySelector('.container');
  if (!container) return;

  const errorDiv = document.createElement('div');
  errorDiv.className = 'load-error-banner';
  errorDiv.innerHTML = `
    <div class="error-icon">⚠️</div>
    <div class="error-content">
      <strong>數據載入失敗</strong>
      <p>請使用本地伺服器開啟此頁面。在終端機執行：</p>
      <code>python -m http.server 8000</code>
      <p>然後訪問 <a href="http://localhost:8000">http://localhost:8000</a></p>
    </div>
  `;
  container.insertBefore(errorDiv, container.firstChild);
}

// 證素分類配置
const ZHENGSU_CONFIG = {
  bingwei: {
    wuzang: ['xin', 'gan', 'pi', 'fei', 'shen'],
    liufu: ['wei', 'dan', 'xiaochang', 'dachang', 'pangguang'],
    teshu: ['baogong', 'jingshi'],
    buwei: ['xiongge', 'shaofu'],
    biaoli: ['biao', 'banbiaobanli'],
    xingti: ['jifu', 'jingluo', 'jingu']
  },
  bingxing: {
    qiji: ['qi_xu', 'qi_zhi', 'qi_ni', 'qi_xian', 'qi_bi', 'bu_gu', 'qi_tuo'],
    xueye: ['xue_xu', 'xue_yu', 'xue_re', 'xue_han', 'dong_xue'],
    yinyang: ['yin_xu', 'yang_xu', 'yang_kang', 'yang_fu', 'wang_yin', 'wang_yang'],
    waixie: ['feng', 'han', 'shu', 'shi', 'zao', 'huo', 'du'],
    bingli: ['tan', 'yin_xie', 'shui_ting', 'nong', 'shi_ji', 'chong_ji'],
    jingjin: ['jin_kui', 'jing_kui'],
    neisheng: ['dong_feng']
  }
};

// 中藥文件列表
const HERB_FILES = [
  'mahuang.json',
  'guizhi.json',
  'shengma.json',
  'huangqi.json'
];

// 歸經選項
const MERIDIANS = ['肺', '心', '脾', '肝', '腎', '胃', '膀胱', '大腸', '小腸', '膽', '三焦', '心包'];

// 性味選項
const NATURES = ['寒', '涼', '平', '溫', '熱'];

// 常用證素選項（用於篩選）
const COMMON_ZHENGSU = [
  { id: 'feng', name: '風' },
  { id: 'han', name: '寒' },
  { id: 'shi', name: '濕' },
  { id: 'huo', name: '火' },
  { id: 'tan', name: '痰' },
  { id: 'qi_xu', name: '氣虛' },
  { id: 'xue_xu', name: '血虛' },
  { id: 'yin_xu', name: '陰虛' },
  { id: 'yang_xu', name: '陽虛' },
  { id: 'xue_yu', name: '血瘀' },
  { id: 'qi_zhi', name: '氣滯' },
  { id: 'qi_xian', name: '氣陷' }
];

// 常用治法選項
const COMMON_TREATMENTS = [
  '補氣', '補血', '滋陰', '溫陽', '活血', '行氣',
  '祛風', '散寒', '清熱', '化濕', '化痰', '升提'
];

/**
 * 載入所有證素數據
 */
async function loadZhengsu() {
  const zhengsuIds = [
    ...Object.values(ZHENGSU_CONFIG.bingwei).flat(),
    ...Object.values(ZHENGSU_CONFIG.bingxing).flat()
  ];

  const promises = zhengsuIds.map(id => {
    const fileName = id === 'yin_xie' ? 'yin_pathogen.json' : `${id}.json`;
    return fetch(`data/zhengsu/${fileName}`)
      .then(res => {
        if (!res.ok) throw new Error(`無法載入 ${fileName}`);
        return res.json();
      })
      .catch(err => {
        console.warn(`載入證素 ${id} 失敗:`, err);
        return null;
      });
  });

  const results = await Promise.all(promises);
  state.zhengsu = results.filter(z => z !== null);
}

/**
 * 載入所有中藥數據
 */
async function loadHerbs() {
  const herbList = document.getElementById('herb-list');
  herbList.innerHTML = '<div class="loading">載入中藥數據中</div>';

  try {
    const promises = HERB_FILES.map(file =>
      fetch(`data/herbs/${file}`)
        .then(res => {
          if (!res.ok) throw new Error(`無法載入 ${file}`);
          return res.json();
        })
        .catch(err => {
          console.warn(`載入 ${file} 失敗:`, err);
          return null;
        })
    );

    const results = await Promise.all(promises);
    state.herbs = results.filter(herb => herb !== null);

    renderHerbs();
    updateStats();
  } catch (error) {
    console.error('載入數據失敗:', error);
    herbList.innerHTML = '<div class="no-results">載入數據失敗，請重新整理頁面</div>';
  }
}

/**
 * 獲取中藥的所有證素
 */
function getHerbZhengsu(herb) {
  const zhengsuSet = new Set();
  if (herb.functions) {
    herb.functions.forEach(f => {
      if (f.zhengsu) {
        f.zhengsu.forEach(z => zhengsuSet.add(z));
      }
    });
  }
  return Array.from(zhengsuSet);
}

/**
 * 獲取中藥的所有治法
 */
function getHerbTreatments(herb) {
  const treatmentSet = new Set();
  if (herb.functions) {
    herb.functions.forEach(f => {
      if (f.treatment) {
        treatmentSet.add(f.treatment);
      }
    });
  }
  return Array.from(treatmentSet);
}

/**
 * 獲取證素名稱
 */
function getZhengsuName(id) {
  const z = state.zhengsu.find(zs => zs.id === id);
  return z ? z.name : id;
}

/**
 * 渲染中藥列表
 */
function renderHerbs() {
  const herbList = document.getElementById('herb-list');
  const filtered = filterHerbs();

  if (filtered.length === 0) {
    herbList.innerHTML = '<div class="no-results">沒有找到符合條件的中藥</div>';
    return;
  }

  herbList.innerHTML = filtered.map(herb => createHerbCard(herb)).join('');

  // 綁定卡片點擊事件
  document.querySelectorAll('.herb-card').forEach(card => {
    card.addEventListener('click', () => {
      card.classList.toggle('expanded');
    });
  });

  updateStats();
}

/**
 * 創建中藥卡片 HTML
 */
function createHerbCard(herb) {
  const nature = herb.properties?.nature || '未知';
  const flavors = herb.properties?.flavor?.join('、') || '';
  const meridians = herb.properties?.meridians?.join('、') || '';
  const cautions = herb.cautions || [];
  const alias = herb.alias || [];
  const herbZhengsu = getHerbZhengsu(herb);
  const herbTreatments = getHerbTreatments(herb);

  // 新版 functions 結構
  const functions = herb.functions || [];
  const hasFunctions = functions.length > 0;

  // 強度和劑量類型
  const intensity = herb.intensity || '';
  const dosageType = herb.dosage_type || '';

  return `
    <div class="herb-card" data-id="${herb.id}">
      <div class="herb-card-header">
        <div>
          <div class="herb-name">${herb.name}</div>
          <div class="herb-pinyin">${herb.pinyin}</div>
        </div>
        <span class="herb-nature nature-${nature}">${nature}</span>
      </div>
      <div class="herb-tags">
        ${flavors ? `<span class="herb-tag">味${flavors}</span>` : ''}
        ${meridians ? `<span class="herb-tag">歸${meridians}經</span>` : ''}
        ${herb.category ? `<span class="herb-tag">${herb.category}</span>` : ''}
        ${intensity ? `<span class="herb-tag intensity-tag">${intensity}</span>` : ''}
        ${dosageType ? `<span class="herb-tag dosage-type-tag">${dosageType}</span>` : ''}
        ${herbTreatments.slice(0, 2).map(t => `<span class="herb-tag treatment-tag">${t}</span>`).join('')}
      </div>
      <span class="expand-icon">▼</span>
      <div class="herb-details">
        ${alias.length ? `
          <div class="detail-row">
            <div class="detail-label">別名</div>
            <div class="detail-content">${alias.join('、')}</div>
          </div>
        ` : ''}
        ${herb.standard_dosage ? `
          <div class="detail-row">
            <div class="detail-label">標準用量</div>
            <div class="detail-content">${herb.standard_dosage}${herb.optimal_dosage ? `（最佳：${herb.optimal_dosage}）` : ''}</div>
          </div>
        ` : ''}
        ${hasFunctions ? `
          <div class="detail-row">
            <div class="detail-label">功效（證素）</div>
            <ul class="function-list">
              ${functions.map(f => `
                <li class="function-item">
                  <div class="function-treatment">${f.treatment}</div>
                  <div class="function-zhengsu">證素：${f.zhengsu.map(z => getZhengsuName(z)).join(' + ')}</div>
                  <div class="function-manifestations">主治：${f.manifestations.join('、')}</div>
                  ${f.prerequisite ? `<div class="function-prerequisite">前提：${f.prerequisite}</div>` : ''}
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
        ${herb.dosage ? `
          <div class="detail-row">
            <div class="detail-label">用量</div>
            <div class="detail-content">${herb.dosage}</div>
          </div>
        ` : ''}
        ${cautions.length ? `
          <div class="detail-row">
            <div class="detail-label">注意事項</div>
            <ul class="detail-list">
              ${cautions.map(c => `<li>${c}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * 篩選中藥
 */
function filterHerbs() {
  return state.herbs.filter(herb => {
    // 證素篩選
    if (state.filters.zhengsu) {
      const herbZhengsu = getHerbZhengsu(herb);
      if (!herbZhengsu.includes(state.filters.zhengsu)) {
        return false;
      }
    }

    // 歸經篩選
    if (state.filters.meridian) {
      const meridians = herb.properties?.meridians || [];
      if (!meridians.includes(state.filters.meridian)) {
        return false;
      }
    }

    // 性味篩選
    if (state.filters.nature) {
      if (herb.properties?.nature !== state.filters.nature) {
        return false;
      }
    }

    // 治法篩選
    if (state.filters.treatment) {
      const treatments = getHerbTreatments(herb);
      if (!treatments.includes(state.filters.treatment)) {
        return false;
      }
    }

    // 搜尋篩選
    if (state.filters.search) {
      const search = state.filters.search.toLowerCase();
      const name = herb.name || '';
      const pinyin = (herb.pinyin || '').toLowerCase();
      const alias = (herb.alias || []).join('');

      if (!name.includes(search) &&
          !pinyin.includes(search) &&
          !alias.includes(search)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * 更新統計資訊
 */
function updateStats() {
  const stats = document.getElementById('stats');
  const filtered = filterHerbs();
  const total = state.herbs.length;

  if (filtered.length === total) {
    stats.textContent = `共收錄 ${total} 味中藥`;
  } else {
    stats.textContent = `顯示 ${filtered.length} / ${total} 味中藥`;
  }
}

/**
 * 初始化篩選標籤
 */
function initFilters() {
  // 證素篩選標籤
  const zhengsuFilterTags = document.getElementById('zhengsu-filter-tags');
  zhengsuFilterTags.innerHTML = COMMON_ZHENGSU.map(z =>
    `<span class="filter-tag" data-zhengsu="${z.id}">${z.name}</span>`
  ).join('');

  // 歸經標籤
  const meridianTags = document.getElementById('meridian-tags');
  meridianTags.innerHTML = MERIDIANS.map(m =>
    `<span class="filter-tag" data-meridian="${m}">${m}經</span>`
  ).join('');

  // 性味標籤
  const natureTags = document.getElementById('nature-tags');
  natureTags.innerHTML = NATURES.map(n =>
    `<span class="filter-tag" data-nature="${n}">${n}</span>`
  ).join('');

  // 治法標籤
  const treatmentTags = document.getElementById('treatment-tags');
  treatmentTags.innerHTML = COMMON_TREATMENTS.map(t =>
    `<span class="filter-tag" data-treatment="${t}">${t}</span>`
  ).join('');

  // 綁定證素點擊事件
  zhengsuFilterTags.querySelectorAll('.filter-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const zhengsu = tag.dataset.zhengsu;

      if (state.filters.zhengsu === zhengsu) {
        state.filters.zhengsu = null;
        tag.classList.remove('active');
      } else {
        zhengsuFilterTags.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
        state.filters.zhengsu = zhengsu;
        tag.classList.add('active');
      }

      renderHerbs();
    });
  });

  // 綁定歸經點擊事件
  meridianTags.querySelectorAll('.filter-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const meridian = tag.dataset.meridian;

      if (state.filters.meridian === meridian) {
        state.filters.meridian = null;
        tag.classList.remove('active');
      } else {
        meridianTags.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
        state.filters.meridian = meridian;
        tag.classList.add('active');
      }

      renderHerbs();
    });
  });

  // 綁定性味點擊事件
  natureTags.querySelectorAll('.filter-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const nature = tag.dataset.nature;

      if (state.filters.nature === nature) {
        state.filters.nature = null;
        tag.classList.remove('active');
      } else {
        natureTags.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
        state.filters.nature = nature;
        tag.classList.add('active');
      }

      renderHerbs();
    });
  });

  // 綁定治法點擊事件
  treatmentTags.querySelectorAll('.filter-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const treatment = tag.dataset.treatment;

      if (state.filters.treatment === treatment) {
        state.filters.treatment = null;
        tag.classList.remove('active');
      } else {
        treatmentTags.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
        state.filters.treatment = treatment;
        tag.classList.add('active');
      }

      renderHerbs();
    });
  });

  // 清除篩選按鈕
  document.getElementById('clear-filters').addEventListener('click', clearFilters);
}

/**
 * 初始化搜尋功能
 */
function initSearch() {
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');

  // 搜尋按鈕
  searchBtn.addEventListener('click', () => {
    state.filters.search = searchInput.value.trim();
    renderHerbs();
  });

  // Enter 鍵搜尋
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      state.filters.search = searchInput.value.trim();
      renderHerbs();
    }
  });

  // 即時搜尋（輸入時）
  searchInput.addEventListener('input', () => {
    state.filters.search = searchInput.value.trim();
    renderHerbs();
  });
}

/**
 * 清除所有篩選
 */
function clearFilters() {
  state.filters = {
    zhengsu: null,
    meridian: null,
    nature: null,
    treatment: null,
    search: ''
  };

  document.querySelectorAll('.filter-tag').forEach(tag => {
    tag.classList.remove('active');
  });

  document.getElementById('search-input').value = '';

  renderHerbs();
}

/**
 * 頁面初始化
 */
document.addEventListener('DOMContentLoaded', async () => {
  // 初始化 UI
  initFilters();
  initSearch();

  // 檢測 file:// 協議
  if (isFileProtocol()) {
    showLoadError();
    document.getElementById('herb-list').innerHTML = '';
    return;
  }

  // 載入數據
  await loadZhengsu();
  await loadHerbs();

  // 檢查數據載入是否成功
  if (state.herbs.length === 0) {
    showLoadError();
  }
});
