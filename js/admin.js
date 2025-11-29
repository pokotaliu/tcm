/**
 * 中醫證素辨證資料庫 - 資料管理模組
 */

// 資料類別配置
const DATA_TYPES = {
  herbs: {
    name: '中藥',
    path: 'data/herbs/',
    schemaPath: 'data/herbs/_schema.json',
    listTitle: '現有中藥資料',
    formTitle: '中藥',
    displayFields: ['name', 'category', 'properties.nature', 'functions.length'],
    displayHeaders: ['名稱', '分類', '藥性', '功效數']
  },
  formulas: {
    name: '方劑',
    path: 'data/formulas/',
    schemaPath: 'data/formulas/_schema.json',
    listTitle: '現有方劑資料',
    formTitle: '方劑',
    displayFields: ['name', 'category', 'source', 'composition.length'],
    displayHeaders: ['名稱', '分類', '出處', '藥物數']
  },
  zhengsu: {
    name: '證素',
    path: 'data/zhengsu/',
    schemaPath: 'data/zhengsu/_schema.json',
    listTitle: '現有證素資料',
    formTitle: '證素',
    displayFields: ['name', 'category', 'subcategory', 'treatment'],
    displayHeaders: ['名稱', '類別', '子類別', '治法']
  },
  symptoms: {
    name: '症狀',
    path: 'data/symptoms/',
    schemaPath: 'data/symptoms/_schema.json',
    listTitle: '現有症狀資料',
    formTitle: '症狀',
    displayFields: ['name', 'category', 'description'],
    displayHeaders: ['名稱', '類別', '描述']
  },
  zhengxing: {
    name: '證型',
    path: 'data/zhengxing/',
    schemaPath: 'data/zhengxing/_schema.json',
    listTitle: '現有證型資料',
    formTitle: '證型',
    displayFields: ['name', 'zhengsu_composition', 'treatment_principle'],
    displayHeaders: ['名稱', '證素組成', '治則']
  },
  diseases: {
    name: '疾病',
    path: 'data/diseases/',
    schemaPath: 'data/diseases/_schema.json',
    listTitle: '現有疾病資料',
    formTitle: '疾病',
    displayFields: ['name', 'category', 'zhengxing_patterns.length'],
    displayHeaders: ['名稱', '類別', '證型數']
  }
};

// 選項配置
const OPTIONS = {
  herbCategories: [
    '解表藥', '清熱藥', '瀉下藥', '祛風濕藥', '化濕藥',
    '利水滲濕藥', '溫裡藥', '理氣藥', '消食藥', '驅蟲藥',
    '止血藥', '活血化瘀藥', '化痰止咳平喘藥', '安神藥',
    '平肝熄風藥', '開竅藥', '補虛藥', '收澀藥', '涌吐藥',
    '解毒殺蟲燥濕止癢藥', '拔毒化腐生肌藥'
  ],
  formulaCategories: [
    '解表劑', '瀉下劑', '和解劑', '清熱劑', '溫裡劑',
    '補益劑', '固澀劑', '安神劑', '開竅劑', '理氣劑',
    '理血劑', '治風劑', '治燥劑', '祛濕劑', '祛痰劑',
    '消食劑', '驅蟲劑', '治癰瘍劑'
  ],
  natures: ['寒', '涼', '平', '溫', '熱'],
  flavors: ['辛', '甘', '酸', '苦', '鹹', '淡', '澀', '微辛', '微甘', '微酸', '微苦', '微鹹'],
  meridians: ['心', '肝', '脾', '肺', '腎', '胃', '膽', '小腸', '大腸', '膀胱', '三焦', '心包'],
  roles: ['君', '臣', '佐', '使'],
  intensities: ['強', '中', '弱'],
  dosageTypes: ['常規', '引經', '峻猛'],
  zhengsuCategories: ['病位', '病性'],
  zhengsuSubcategories: {
    '病位': ['五臟', '六腑', '特殊', '部位', '表裡', '形體'],
    '病性': ['氣機病變', '血液病變', '陰陽病變', '外邪', '病理產物', '精津病變', '內生病邪']
  },
  symptomCategories: ['全身症狀', '頭面症狀', '胸腹症狀', '四肢症狀', '二便症狀', '舌象', '脈象', '其他'],
  diseaseCategories: ['外感病', '內傷病', '婦科病', '兒科病', '外科病', '皮膚病', '五官科病'],
  treatments: {
    'feng': '祛風', 'han': '散寒', 'shu': '清暑', 'shi': '化濕', 'zao': '潤燥',
    'huo': '瀉火', 'du': '解毒', 'tan': '化痰', 'yin': '化飲', 'shui_ting': '利水',
    'nong': '排膿', 'shi_ji': '消食', 'chong_ji': '驅蟲', 'qi_xu': '補氣',
    'qi_zhi': '行氣', 'qi_ni': '降氣', 'qi_xian': '升提', 'qi_bi': '開閉',
    'bu_gu': '收攝', 'qi_tuo': '固脫', 'xue_xu': '補血', 'xue_yu': '活血',
    'xue_re': '涼血', 'xue_han': '溫經', 'dong_xue': '止血', 'yin_xu': '滋陰',
    'yang_xu': '溫陽', 'yang_kang': '平肝潛陽', 'yang_fu': '引火歸元',
    'wang_yin': '救陰', 'wang_yang': '回陽', 'dong_feng': '熄風',
    'jin_kui': '生津', 'jing_kui': '填精'
  }
};

// 應用狀態
const state = {
  currentType: 'herbs',
  dataList: [],
  editingId: null,
  zhengsuData: [],
  herbsData: [],
  isFileProtocol: window.location.protocol === 'file:'
};

// DOM 元素
let elements = {};

// 初始化
document.addEventListener('DOMContentLoaded', init);

async function init() {
  cacheElements();
  bindEvents();

  // 檢查 file:// 協議
  if (state.isFileProtocol) {
    showFileProtocolWarning();
  }

  // 載入輔助資料
  await loadHelperData();

  // 載入初始資料
  await loadDataList('herbs');
}

function cacheElements() {
  elements = {
    dataTypeTabs: document.querySelectorAll('.data-type-tab'),
    btnNew: document.getElementById('btn-new'),
    btnImport: document.getElementById('btn-import'),
    btnExportAll: document.getElementById('btn-export-all'),
    importFile: document.getElementById('import-file'),
    adminSearch: document.getElementById('admin-search'),
    listTitle: document.getElementById('list-title'),
    dataList: document.getElementById('data-list'),
    formSection: document.getElementById('form-section'),
    formTitle: document.getElementById('form-title'),
    dataForm: document.getElementById('data-form'),
    btnCloseForm: document.getElementById('btn-close-form'),
    btnPreview: document.getElementById('btn-preview'),
    btnSave: document.getElementById('btn-save'),
    btnCancel: document.getElementById('btn-cancel'),
    jsonModal: document.getElementById('json-modal'),
    jsonPreview: document.getElementById('json-preview'),
    modalClose: document.getElementById('modal-close'),
    btnCopyJson: document.getElementById('btn-copy-json'),
    btnDownloadJson: document.getElementById('btn-download-json'),
    btnSaveLocal: document.getElementById('btn-save-local'),
    deleteModal: document.getElementById('delete-modal'),
    deleteMessage: document.getElementById('delete-message'),
    btnCancelDelete: document.getElementById('btn-cancel-delete'),
    btnConfirmDelete: document.getElementById('btn-confirm-delete'),
    toast: document.getElementById('toast')
  };
}

function bindEvents() {
  // 資料類別切換
  elements.dataTypeTabs.forEach(tab => {
    tab.addEventListener('click', () => switchDataType(tab.dataset.type));
  });

  // 新增按鈕
  elements.btnNew.addEventListener('click', () => openForm());

  // 匯入按鈕
  elements.btnImport.addEventListener('click', () => elements.importFile.click());
  elements.importFile.addEventListener('change', handleImport);

  // 匯出全部
  elements.btnExportAll.addEventListener('click', exportAll);

  // 搜尋
  elements.adminSearch.addEventListener('input', handleSearch);

  // 表單操作
  elements.btnCloseForm.addEventListener('click', closeForm);
  elements.btnCancel.addEventListener('click', closeForm);
  elements.btnPreview.addEventListener('click', previewJson);
  elements.btnSave.addEventListener('click', saveData);

  // 彈窗操作
  elements.modalClose.addEventListener('click', closeJsonModal);
  elements.btnCopyJson.addEventListener('click', copyJson);
  elements.btnDownloadJson.addEventListener('click', downloadJson);
  elements.btnSaveLocal.addEventListener('click', saveToLocal);

  // 刪除確認
  elements.btnCancelDelete.addEventListener('click', closeDeleteModal);
  elements.btnConfirmDelete.addEventListener('click', confirmDelete);

  // 點擊彈窗外部關閉
  elements.jsonModal.addEventListener('click', (e) => {
    if (e.target === elements.jsonModal) closeJsonModal();
  });
  elements.deleteModal.addEventListener('click', (e) => {
    if (e.target === elements.deleteModal) closeDeleteModal();
  });
}

function showFileProtocolWarning() {
  const banner = document.createElement('div');
  banner.className = 'load-error-banner';
  banner.innerHTML = `
    <div class="error-icon">&#9888;</div>
    <div class="error-content">
      <strong>本地檔案模式</strong>
      <p>您正在使用 file:// 協議開啟此頁面，部分功能可能受限。</p>
      <p>建議使用本地伺服器：<code>python -m http.server 8000</code></p>
    </div>
  `;
  document.querySelector('.container').prepend(banner);
}

// 載入輔助資料
async function loadHelperData() {
  try {
    // 載入證素資料
    const zhengsuFiles = await fetchFileList('data/zhengsu/');
    state.zhengsuData = await Promise.all(
      zhengsuFiles.map(f => fetchJson(`data/zhengsu/${f}`).catch(() => null))
    );
    state.zhengsuData = state.zhengsuData.filter(Boolean);

    // 載入中藥資料
    const herbFiles = await fetchFileList('data/herbs/');
    state.herbsData = await Promise.all(
      herbFiles.map(f => fetchJson(`data/herbs/${f}`).catch(() => null))
    );
    state.herbsData = state.herbsData.filter(Boolean);
  } catch (error) {
    console.warn('輔助資料載入失敗:', error);
  }
}

// 取得檔案列表
async function fetchFileList(path) {
  // 由於是靜態網站，我們需要預設的檔案列表
  // 實際部署時可以生成一個 index.json
  const indexUrl = `${path}_index.json`;
  try {
    const response = await fetch(indexUrl);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    // 忽略錯誤
  }

  // 回退：嘗試從 LocalStorage 取得
  const localData = getLocalData(state.currentType);
  if (localData.length > 0) {
    return localData.map(item => `${item.id}.json`);
  }

  // 預設列表
  const defaults = {
    'data/herbs/': ['mahuang.json', 'guizhi.json', 'huangqi.json', 'shengma.json'],
    'data/formulas/': ['mahuangtang.json', 'buzhongyiqi_tang.json'],
    'data/zhengsu/': [],
    'data/symptoms/': ['fali.json'],
    'data/zhengxing/': ['feiqixu.json'],
    'data/diseases/': ['ganmao.json']
  };
  return defaults[path] || [];
}

// 取得 JSON 檔案
async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}

// 切換資料類別
async function switchDataType(type) {
  state.currentType = type;

  // 更新 tab 狀態
  elements.dataTypeTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.type === type);
  });

  // 更新標題
  elements.listTitle.textContent = DATA_TYPES[type].listTitle;

  // 關閉表單
  closeForm();

  // 載入資料
  await loadDataList(type);
}

// 載入資料列表
async function loadDataList(type) {
  elements.dataList.innerHTML = '<div class="loading">載入中...</div>';

  try {
    const config = DATA_TYPES[type];
    const files = await fetchFileList(config.path);

    // 載入所有檔案
    const dataPromises = files
      .filter(f => f !== '_schema.json' && f !== '_index.json')
      .map(f => fetchJson(`${config.path}${f}`).catch(() => null));

    const dataList = (await Promise.all(dataPromises)).filter(Boolean);

    // 合併本地資料
    const localData = getLocalData(type);
    localData.forEach(local => {
      const existingIndex = dataList.findIndex(d => d.id === local.id);
      if (existingIndex >= 0) {
        dataList[existingIndex] = local;
      } else {
        dataList.push(local);
      }
    });

    state.dataList = dataList;
    renderDataList(dataList);
  } catch (error) {
    console.error('載入資料失敗:', error);

    // 嘗試僅顯示本地資料
    const localData = getLocalData(type);
    if (localData.length > 0) {
      state.dataList = localData;
      renderDataList(localData);
    } else {
      elements.dataList.innerHTML = '<div class="no-results">無法載入資料，請檢查網路連線或使用本地伺服器</div>';
    }
  }
}

// 渲染資料列表
function renderDataList(dataList) {
  const config = DATA_TYPES[state.currentType];

  if (dataList.length === 0) {
    elements.dataList.innerHTML = '<div class="no-results">尚無資料</div>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'data-table';

  // 表頭
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      ${config.displayHeaders.map(h => `<th>${h}</th>`).join('')}
      <th>操作</th>
    </tr>
  `;
  table.appendChild(thead);

  // 表體
  const tbody = document.createElement('tbody');
  dataList.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      ${config.displayFields.map(field => `<td>${getFieldValue(item, field)}</td>`).join('')}
      <td class="action-cell">
        <button class="btn-edit" data-id="${item.id}">編輯</button>
        <button class="btn-delete" data-id="${item.id}">刪除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  elements.dataList.innerHTML = '';
  elements.dataList.appendChild(table);

  // 綁定事件
  elements.dataList.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => editData(btn.dataset.id));
  });
  elements.dataList.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteData(btn.dataset.id));
  });
}

// 取得欄位值
function getFieldValue(item, field) {
  if (field.includes('.')) {
    const parts = field.split('.');
    let value = item;
    for (const part of parts) {
      if (value == null) return '-';
      if (part === 'length' && Array.isArray(value)) {
        return value.length;
      }
      value = value[part];
    }

    // 特殊處理證素組成
    if (typeof value === 'object' && value !== null) {
      if (value.location && value.nature) {
        return `${value.location.join('+')} + ${value.nature.join('+')}`;
      }
      return JSON.stringify(value);
    }

    return value || '-';
  }

  // 特殊處理治則
  if (field === 'treatment_principle' && Array.isArray(item[field])) {
    return item[field].join('、');
  }

  return item[field] || '-';
}

// 搜尋處理
function handleSearch() {
  const keyword = elements.adminSearch.value.trim().toLowerCase();

  if (!keyword) {
    renderDataList(state.dataList);
    return;
  }

  const filtered = state.dataList.filter(item => {
    const searchStr = JSON.stringify(item).toLowerCase();
    return searchStr.includes(keyword);
  });

  renderDataList(filtered);
}

// 開啟表單
function openForm(data = null) {
  state.editingId = data ? data.id : null;
  const config = DATA_TYPES[state.currentType];

  elements.formTitle.textContent = data ? `編輯${config.formTitle}` : `新增${config.formTitle}`;
  elements.formSection.classList.remove('hidden');

  // 根據類型生成表單
  renderForm(state.currentType, data);

  // 滾動到表單
  elements.formSection.scrollIntoView({ behavior: 'smooth' });
}

// 關閉表單
function closeForm() {
  elements.formSection.classList.add('hidden');
  state.editingId = null;
  elements.dataForm.innerHTML = '';
}

// 渲染表單
function renderForm(type, data = null) {
  switch (type) {
    case 'herbs':
      renderHerbForm(data);
      break;
    case 'formulas':
      renderFormulaForm(data);
      break;
    case 'zhengsu':
      renderZhengsuForm(data);
      break;
    case 'symptoms':
      renderSymptomForm(data);
      break;
    case 'zhengxing':
      renderZhengxingForm(data);
      break;
    case 'diseases':
      renderDiseaseForm(data);
      break;
  }
}

// 渲染中藥表單
function renderHerbForm(data = null) {
  const html = `
    <div class="form-group">
      <h3 class="form-section-title">基本資訊</h3>
      <div class="form-row">
        <label>名稱 *</label>
        <input type="text" name="name" value="${data?.name || ''}" required>
      </div>
      <div class="form-row">
        <label>拼音 *</label>
        <input type="text" name="pinyin" value="${data?.pinyin || ''}" required>
      </div>
      <div class="form-row">
        <label>ID *</label>
        <input type="text" name="id" value="${data?.id || ''}" ${data ? 'readonly' : ''} required>
        <small>系統識別碼，使用拼音格式如 ma_huang</small>
      </div>
      <div class="form-row">
        <label>別名</label>
        <div class="array-input" data-field="alias">
          ${(data?.alias || []).map(a => `<div class="array-item"><input type="text" value="${a}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增別名</button>
        </div>
      </div>
      <div class="form-row">
        <label>分類 *</label>
        <select name="category" required>
          <option value="">請選擇</option>
          ${OPTIONS.herbCategories.map(c => `<option value="${c}" ${data?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="form-group">
      <h3 class="form-section-title">性味歸經</h3>
      <div class="form-row">
        <label>藥性 *</label>
        <div class="radio-group">
          ${OPTIONS.natures.map(n => `
            <label class="radio-label">
              <input type="radio" name="nature" value="${n}" ${data?.properties?.nature === n ? 'checked' : ''}>
              ${n}
            </label>
          `).join('')}
        </div>
      </div>
      <div class="form-row">
        <label>藥味 *</label>
        <div class="checkbox-group">
          ${OPTIONS.flavors.map(f => `
            <label class="checkbox-label">
              <input type="checkbox" name="flavor" value="${f}" ${data?.properties?.flavor?.includes(f) ? 'checked' : ''}>
              ${f}
            </label>
          `).join('')}
        </div>
      </div>
      <div class="form-row">
        <label>歸經 *</label>
        <div class="checkbox-group">
          ${OPTIONS.meridians.map(m => `
            <label class="checkbox-label">
              <input type="checkbox" name="meridians" value="${m}" ${data?.properties?.meridians?.includes(m) ? 'checked' : ''}>
              ${m}
            </label>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="form-group">
      <h3 class="form-section-title">藥物特性</h3>
      <div class="form-row">
        <label>強度</label>
        <div class="radio-group">
          ${OPTIONS.intensities.map(i => `
            <label class="radio-label">
              <input type="radio" name="intensity" value="${i}" ${data?.intensity === i ? 'checked' : ''}>
              ${i}
            </label>
          `).join('')}
        </div>
      </div>
      <div class="form-row">
        <label>劑量類型</label>
        <div class="radio-group">
          ${OPTIONS.dosageTypes.map(d => `
            <label class="radio-label">
              <input type="radio" name="dosage_type" value="${d}" ${data?.dosage_type === d ? 'checked' : ''}>
              ${d}
            </label>
          `).join('')}
        </div>
      </div>
      <div class="form-row">
        <label>標準用量</label>
        <input type="text" name="dosage" value="${data?.dosage || ''}" placeholder="如：3-9g">
      </div>
      <div class="form-row">
        <label>最佳劑量</label>
        <input type="text" name="optimal_dosage" value="${data?.optimal_dosage || ''}" placeholder="引經藥填寫">
      </div>
    </div>

    <div class="form-group">
      <h3 class="form-section-title">功效（證素）</h3>
      <div class="functions-container" id="functions-container">
        ${(data?.functions || []).map((f, i) => renderFunctionItem(f, i)).join('')}
      </div>
      <button type="button" class="btn-add-function" id="btn-add-function">+ 新增功效</button>
    </div>

    <div class="form-group">
      <h3 class="form-section-title">禁忌與注意</h3>
      <div class="form-row">
        <label>禁忌證素</label>
        <div class="array-input" data-field="contraindications">
          ${(data?.contraindications || []).map(c => `<div class="array-item"><input type="text" value="${c}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增禁忌</button>
        </div>
      </div>
      <div class="form-row">
        <label>注意事項</label>
        <div class="array-input" data-field="cautions">
          ${(data?.cautions || []).map(c => `<div class="array-item"><input type="text" value="${c}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增注意事項</button>
        </div>
      </div>
    </div>
  `;

  elements.dataForm.innerHTML = html;

  // 綁定動態事件
  bindFormEvents();

  // 綁定功效新增事件
  document.getElementById('btn-add-function').addEventListener('click', addFunction);
}

// 渲染功效項目
function renderFunctionItem(func = null, index = 0) {
  const treatmentOptions = Object.entries(OPTIONS.treatments)
    .map(([id, name]) => `<option value="${name}" ${func?.treatment === name ? 'selected' : ''}>${name}</option>`)
    .join('');

  return `
    <div class="function-item-form" data-index="${index}">
      <div class="function-header">
        <span>功效 ${index + 1}</span>
        <button type="button" class="btn-remove-function">刪除</button>
      </div>
      <div class="form-row">
        <label>治法</label>
        <select name="function_treatment_${index}">
          <option value="">請選擇</option>
          ${treatmentOptions}
        </select>
      </div>
      <div class="form-row">
        <label>證素</label>
        <div class="array-input" data-field="function_zhengsu_${index}">
          ${(func?.zhengsu || []).map(z => `<div class="array-item"><input type="text" value="${z}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增證素</button>
        </div>
        <small>輸入證素 ID，如 biao, feng, han</small>
      </div>
      <div class="form-row">
        <label>前提條件</label>
        <input type="text" name="function_prerequisite_${index}" value="${func?.prerequisite || ''}" placeholder="選填，如：少量配溫陽藥">
      </div>
      <div class="form-row">
        <label>主治症狀</label>
        <div class="array-input" data-field="function_manifestations_${index}">
          ${(func?.manifestations || []).map(m => `<div class="array-item"><input type="text" value="${m}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增症狀</button>
        </div>
      </div>
    </div>
  `;
}

// 新增功效
function addFunction() {
  const container = document.getElementById('functions-container');
  const index = container.querySelectorAll('.function-item-form').length;
  const html = renderFunctionItem(null, index);
  container.insertAdjacentHTML('beforeend', html);
  bindFormEvents();
}

// 渲染方劑表單
function renderFormulaForm(data = null) {
  const html = `
    <div class="form-group">
      <h3 class="form-section-title">基本資訊</h3>
      <div class="form-row">
        <label>名稱 *</label>
        <input type="text" name="name" value="${data?.name || ''}" required>
      </div>
      <div class="form-row">
        <label>拼音 *</label>
        <input type="text" name="pinyin" value="${data?.pinyin || ''}" required>
      </div>
      <div class="form-row">
        <label>ID *</label>
        <input type="text" name="id" value="${data?.id || ''}" ${data ? 'readonly' : ''} required>
      </div>
      <div class="form-row">
        <label>出處 *</label>
        <input type="text" name="source" value="${data?.source || ''}" required placeholder="如：傷寒論">
      </div>
      <div class="form-row">
        <label>分類 *</label>
        <select name="category" required>
          <option value="">請選擇</option>
          ${OPTIONS.formulaCategories.map(c => `<option value="${c}" ${data?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <label>別名</label>
        <div class="array-input" data-field="alias">
          ${(data?.alias || []).map(a => `<div class="array-item"><input type="text" value="${a}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增別名</button>
        </div>
      </div>
    </div>

    <div class="form-group">
      <h3 class="form-section-title">組成藥物</h3>
      <div class="composition-container" id="composition-container">
        ${(data?.composition || []).map((c, i) => renderCompositionItem(c, i)).join('')}
      </div>
      <button type="button" class="btn-add-composition" id="btn-add-composition">+ 新增藥物</button>
    </div>

    <div class="form-group">
      <h3 class="form-section-title">功效與主治</h3>
      <div class="form-row">
        <label>功效</label>
        <div class="array-input" data-field="effects">
          ${(data?.effects || []).map(e => `<div class="array-item"><input type="text" value="${e}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增功效</button>
        </div>
      </div>
      <div class="form-row">
        <label>主治</label>
        <textarea name="indications" rows="3">${data?.indications || ''}</textarea>
      </div>
      <div class="form-row">
        <label>主要證素</label>
        <div class="array-input" data-field="primary_zhengsu">
          ${(data?.primary_zhengsu || []).map(z => `<div class="array-item"><input type="text" value="${z}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增證素</button>
        </div>
      </div>
    </div>

    <div class="form-group">
      <h3 class="form-section-title">使用說明</h3>
      <div class="form-row">
        <label>製備方法</label>
        <textarea name="preparation" rows="2">${data?.preparation || ''}</textarea>
      </div>
      <div class="form-row">
        <label>用法</label>
        <textarea name="usage" rows="2">${data?.usage || ''}</textarea>
      </div>
      <div class="form-row">
        <label>禁忌</label>
        <div class="array-input" data-field="contraindications">
          ${(data?.contraindications || []).map(c => `<div class="array-item"><input type="text" value="${c}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增禁忌</button>
        </div>
      </div>
      <div class="form-row">
        <label>注意事項</label>
        <div class="array-input" data-field="cautions">
          ${(data?.cautions || []).map(c => `<div class="array-item"><input type="text" value="${c}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增注意事項</button>
        </div>
      </div>
    </div>
  `;

  elements.dataForm.innerHTML = html;
  bindFormEvents();

  document.getElementById('btn-add-composition').addEventListener('click', addComposition);
}

// 渲染組成藥物項目
function renderCompositionItem(comp = null, index = 0) {
  const herbOptions = state.herbsData
    .map(h => `<option value="${h.id}" ${comp?.herb_id === h.id ? 'selected' : ''}>${h.name}</option>`)
    .join('');

  return `
    <div class="composition-item-form" data-index="${index}">
      <div class="composition-row">
        <div class="form-field">
          <label>藥物</label>
          <select name="comp_herb_${index}">
            <option value="">請選擇</option>
            ${herbOptions}
          </select>
          <input type="text" name="comp_name_${index}" value="${comp?.name || ''}" placeholder="或輸入藥名">
        </div>
        <div class="form-field">
          <label>用量</label>
          <input type="text" name="comp_amount_${index}" value="${comp?.amount || ''}" placeholder="如：9g">
        </div>
        <div class="form-field">
          <label>角色</label>
          <select name="comp_role_${index}">
            ${OPTIONS.roles.map(r => `<option value="${r}" ${comp?.role === r ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </div>
        <div class="form-field">
          <label>引經</label>
          <input type="checkbox" name="comp_guide_${index}" ${comp?.is_guide ? 'checked' : ''}>
        </div>
        <button type="button" class="btn-remove-composition">刪除</button>
      </div>
    </div>
  `;
}

// 新增藥物組成
function addComposition() {
  const container = document.getElementById('composition-container');
  const index = container.querySelectorAll('.composition-item-form').length;
  const html = renderCompositionItem(null, index);
  container.insertAdjacentHTML('beforeend', html);
  bindFormEvents();
}

// 渲染證素表單
function renderZhengsuForm(data = null) {
  const html = `
    <div class="form-group">
      <h3 class="form-section-title">基本資訊</h3>
      <div class="form-row">
        <label>名稱 *</label>
        <input type="text" name="name" value="${data?.name || ''}" required>
      </div>
      <div class="form-row">
        <label>ID *</label>
        <input type="text" name="id" value="${data?.id || ''}" ${data ? 'readonly' : ''} required>
        <small>使用拼音格式，如 qi_xu</small>
      </div>
      <div class="form-row">
        <label>類別 *</label>
        <select name="category" id="zhengsu-category" required>
          <option value="">請選擇</option>
          ${OPTIONS.zhengsuCategories.map(c => `<option value="${c}" ${data?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <label>子類別 *</label>
        <select name="subcategory" id="zhengsu-subcategory" required>
          <option value="">請選擇</option>
          ${data?.category ? OPTIONS.zhengsuSubcategories[data.category].map(s =>
            `<option value="${s}" ${data?.subcategory === s ? 'selected' : ''}>${s}</option>`
          ).join('') : ''}
        </select>
      </div>
      <div class="form-row">
        <label>治法</label>
        <input type="text" name="treatment" value="${data?.treatment || ''}" placeholder="病性證素填寫對應治法">
      </div>
    </div>

    <div class="form-group">
      <h3 class="form-section-title">其他資訊</h3>
      <div class="form-row">
        <label>危重證素</label>
        <input type="checkbox" name="is_critical" ${data?.is_critical ? 'checked' : ''}>
      </div>
      <div class="form-row">
        <label>別名</label>
        <div class="array-input" data-field="alias">
          ${(data?.alias || []).map(a => `<div class="array-item"><input type="text" value="${a}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增別名</button>
        </div>
      </div>
      <div class="form-row">
        <label>說明</label>
        <textarea name="description" rows="3">${data?.description || ''}</textarea>
      </div>
      <div class="form-row">
        <label>相關症狀</label>
        <div class="array-input" data-field="related_symptoms">
          ${(data?.related_symptoms || []).map(s => `<div class="array-item"><input type="text" value="${s}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增症狀ID</button>
        </div>
      </div>
    </div>
  `;

  elements.dataForm.innerHTML = html;
  bindFormEvents();

  // 類別聯動
  document.getElementById('zhengsu-category').addEventListener('change', function() {
    const subcategorySelect = document.getElementById('zhengsu-subcategory');
    subcategorySelect.innerHTML = '<option value="">請選擇</option>';
    if (this.value && OPTIONS.zhengsuSubcategories[this.value]) {
      OPTIONS.zhengsuSubcategories[this.value].forEach(s => {
        subcategorySelect.innerHTML += `<option value="${s}">${s}</option>`;
      });
    }
  });
}

// 渲染症狀表單
function renderSymptomForm(data = null) {
  const html = `
    <div class="form-group">
      <h3 class="form-section-title">基本資訊</h3>
      <div class="form-row">
        <label>名稱 *</label>
        <input type="text" name="name" value="${data?.name || ''}" required>
      </div>
      <div class="form-row">
        <label>ID *</label>
        <input type="text" name="id" value="${data?.id || ''}" ${data ? 'readonly' : ''} required>
      </div>
      <div class="form-row">
        <label>類別 *</label>
        <select name="category" required>
          <option value="">請選擇</option>
          ${OPTIONS.symptomCategories.map(c => `<option value="${c}" ${data?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <label>別名</label>
        <div class="array-input" data-field="alias">
          ${(data?.alias || []).map(a => `<div class="array-item"><input type="text" value="${a}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增別名</button>
        </div>
      </div>
      <div class="form-row">
        <label>描述</label>
        <textarea name="description" rows="3">${data?.description || ''}</textarea>
      </div>
    </div>

    <div class="form-group">
      <h3 class="form-section-title">診斷相關</h3>
      <div class="form-row">
        <label>相關證素</label>
        <div class="array-input" data-field="related_zhengsu">
          ${(data?.related_zhengsu || []).map(z => `<div class="array-item"><input type="text" value="${z}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增證素ID</button>
        </div>
      </div>
      <div class="form-row">
        <label>診斷價值</label>
        <textarea name="diagnostic_value" rows="2">${data?.diagnostic_value || ''}</textarea>
      </div>
    </div>
  `;

  elements.dataForm.innerHTML = html;
  bindFormEvents();
}

// 渲染證型表單
function renderZhengxingForm(data = null) {
  const html = `
    <div class="form-group">
      <h3 class="form-section-title">基本資訊</h3>
      <div class="form-row">
        <label>名稱 *</label>
        <input type="text" name="name" value="${data?.name || ''}" required>
      </div>
      <div class="form-row">
        <label>ID *</label>
        <input type="text" name="id" value="${data?.id || ''}" ${data ? 'readonly' : ''} required>
      </div>
      <div class="form-row">
        <label>別名</label>
        <div class="array-input" data-field="alias">
          ${(data?.alias || []).map(a => `<div class="array-item"><input type="text" value="${a}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增別名</button>
        </div>
      </div>
    </div>

    <div class="form-group">
      <h3 class="form-section-title">證素組成 *</h3>
      <div class="form-row">
        <label>病位證素</label>
        <div class="array-input" data-field="location">
          ${(data?.zhengsu_composition?.location || []).map(l => `<div class="array-item"><input type="text" value="${l}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增病位</button>
        </div>
      </div>
      <div class="form-row">
        <label>病性證素</label>
        <div class="array-input" data-field="nature">
          ${(data?.zhengsu_composition?.nature || []).map(n => `<div class="array-item"><input type="text" value="${n}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增病性</button>
        </div>
      </div>
    </div>

    <div class="form-group">
      <h3 class="form-section-title">症狀表現 *</h3>
      <div class="form-row">
        <label>主症</label>
        <div class="array-input" data-field="main_symptoms">
          ${(data?.symptoms?.main || []).map(m => `<div class="array-item"><input type="text" value="${m}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增主症</button>
        </div>
      </div>
      <div class="form-row">
        <label>次症</label>
        <div class="array-input" data-field="secondary_symptoms">
          ${(data?.symptoms?.secondary || []).map(s => `<div class="array-item"><input type="text" value="${s}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增次症</button>
        </div>
      </div>
      <div class="form-row">
        <label>舌象</label>
        <input type="text" name="tongue" value="${data?.symptoms?.tongue || ''}">
      </div>
      <div class="form-row">
        <label>脈象</label>
        <input type="text" name="pulse" value="${data?.symptoms?.pulse || ''}">
      </div>
    </div>

    <div class="form-group">
      <h3 class="form-section-title">治療</h3>
      <div class="form-row">
        <label>治則治法 *</label>
        <div class="array-input" data-field="treatment_principle">
          ${(data?.treatment_principle || []).map(t => `<div class="array-item"><input type="text" value="${t}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增治則</button>
        </div>
      </div>
      <div class="form-row">
        <label>推薦方劑</label>
        <div class="array-input" data-field="recommended_formulas">
          ${(data?.recommended_formulas || []).map(f => `<div class="array-item"><input type="text" value="${f}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增方劑ID</button>
        </div>
      </div>
      <div class="form-row">
        <label>推薦中藥</label>
        <div class="array-input" data-field="recommended_herbs">
          ${(data?.recommended_herbs || []).map(h => `<div class="array-item"><input type="text" value="${h}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增中藥ID</button>
        </div>
      </div>
      <div class="form-row">
        <label>說明</label>
        <textarea name="description" rows="3">${data?.description || ''}</textarea>
      </div>
    </div>
  `;

  elements.dataForm.innerHTML = html;
  bindFormEvents();
}

// 渲染疾病表單
function renderDiseaseForm(data = null) {
  const html = `
    <div class="form-group">
      <h3 class="form-section-title">基本資訊</h3>
      <div class="form-row">
        <label>名稱 *</label>
        <input type="text" name="name" value="${data?.name || ''}" required>
      </div>
      <div class="form-row">
        <label>ID *</label>
        <input type="text" name="id" value="${data?.id || ''}" ${data ? 'readonly' : ''} required>
      </div>
      <div class="form-row">
        <label>類別 *</label>
        <select name="category" required>
          <option value="">請選擇</option>
          ${OPTIONS.diseaseCategories.map(c => `<option value="${c}" ${data?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <label>別名</label>
        <div class="array-input" data-field="alias">
          ${(data?.alias || []).map(a => `<div class="array-item"><input type="text" value="${a}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增別名</button>
        </div>
      </div>
      <div class="form-row">
        <label>西醫參考</label>
        <div class="array-input" data-field="western_medicine_reference">
          ${(data?.western_medicine_reference || []).map(w => `<div class="array-item"><input type="text" value="${w}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增西醫病名</button>
        </div>
      </div>
    </div>

    <div class="form-group">
      <h3 class="form-section-title">病因病機</h3>
      <div class="form-row">
        <label>病因</label>
        <div class="array-input" data-field="etiology">
          ${(data?.etiology || []).map(e => `<div class="array-item"><input type="text" value="${e}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增病因</button>
        </div>
      </div>
      <div class="form-row">
        <label>病機</label>
        <textarea name="pathogenesis" rows="3">${data?.pathogenesis || ''}</textarea>
      </div>
      <div class="form-row">
        <label>主要症狀</label>
        <div class="array-input" data-field="main_symptoms">
          ${(data?.main_symptoms || []).map(s => `<div class="array-item"><input type="text" value="${s}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增症狀ID</button>
        </div>
      </div>
    </div>

    <div class="form-group">
      <h3 class="form-section-title">證型分類 *</h3>
      <div class="zhengxing-patterns-container" id="zhengxing-patterns-container">
        ${(data?.zhengxing_patterns || []).map((p, i) => renderZhengxingPatternItem(p, i)).join('')}
      </div>
      <button type="button" class="btn-add-pattern" id="btn-add-pattern">+ 新增證型</button>
    </div>

    <div class="form-group">
      <h3 class="form-section-title">治療與預後</h3>
      <div class="form-row">
        <label>治療大法</label>
        <div class="array-input" data-field="treatment_principles">
          ${(data?.treatment_principles || []).map(t => `<div class="array-item"><input type="text" value="${t}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增治則</button>
        </div>
      </div>
      <div class="form-row">
        <label>預防調護</label>
        <div class="array-input" data-field="prevention">
          ${(data?.prevention || []).map(p => `<div class="array-item"><input type="text" value="${p}"><button type="button" class="btn-remove">-</button></div>`).join('')}
          <button type="button" class="btn-add-item">+ 新增調護</button>
        </div>
      </div>
      <div class="form-row">
        <label>預後</label>
        <textarea name="prognosis" rows="2">${data?.prognosis || ''}</textarea>
      </div>
    </div>
  `;

  elements.dataForm.innerHTML = html;
  bindFormEvents();

  document.getElementById('btn-add-pattern').addEventListener('click', addZhengxingPattern);
}

// 渲染證型模式項目
function renderZhengxingPatternItem(pattern = null, index = 0) {
  return `
    <div class="pattern-item-form" data-index="${index}">
      <div class="pattern-row">
        <div class="form-field">
          <label>證型ID</label>
          <input type="text" name="pattern_id_${index}" value="${pattern?.zhengxing_id || ''}">
        </div>
        <div class="form-field">
          <label>常見度</label>
          <select name="pattern_frequency_${index}">
            <option value="常見" ${pattern?.frequency === '常見' ? 'selected' : ''}>常見</option>
            <option value="較常見" ${pattern?.frequency === '較常見' ? 'selected' : ''}>較常見</option>
            <option value="少見" ${pattern?.frequency === '少見' ? 'selected' : ''}>少見</option>
          </select>
        </div>
        <div class="form-field">
          <label>好發階段</label>
          <input type="text" name="pattern_stage_${index}" value="${pattern?.stage || ''}">
        </div>
        <button type="button" class="btn-remove-pattern">刪除</button>
      </div>
    </div>
  `;
}

// 新增證型模式
function addZhengxingPattern() {
  const container = document.getElementById('zhengxing-patterns-container');
  const index = container.querySelectorAll('.pattern-item-form').length;
  const html = renderZhengxingPatternItem(null, index);
  container.insertAdjacentHTML('beforeend', html);
  bindFormEvents();
}

// 綁定表單事件
function bindFormEvents() {
  // 陣列輸入新增
  document.querySelectorAll('.btn-add-item').forEach(btn => {
    btn.onclick = function() {
      const container = this.parentElement;
      const newItem = document.createElement('div');
      newItem.className = 'array-item';
      newItem.innerHTML = '<input type="text"><button type="button" class="btn-remove">-</button>';
      container.insertBefore(newItem, this);
      bindFormEvents();
    };
  });

  // 陣列輸入移除
  document.querySelectorAll('.btn-remove').forEach(btn => {
    btn.onclick = function() {
      this.parentElement.remove();
    };
  });

  // 功效移除
  document.querySelectorAll('.btn-remove-function').forEach(btn => {
    btn.onclick = function() {
      this.closest('.function-item-form').remove();
    };
  });

  // 組成移除
  document.querySelectorAll('.btn-remove-composition').forEach(btn => {
    btn.onclick = function() {
      this.closest('.composition-item-form').remove();
    };
  });

  // 證型模式移除
  document.querySelectorAll('.btn-remove-pattern').forEach(btn => {
    btn.onclick = function() {
      this.closest('.pattern-item-form').remove();
    };
  });

  // 名稱自動生成ID
  const nameInput = elements.dataForm.querySelector('input[name="name"]');
  const idInput = elements.dataForm.querySelector('input[name="id"]');
  if (nameInput && idInput && !idInput.readOnly) {
    nameInput.addEventListener('input', () => {
      if (!state.editingId) {
        idInput.value = generateId(nameInput.value);
      }
    });
  }
}

// 生成ID
function generateId(name) {
  // 簡單的拼音轉換（實際項目可使用 pinyin 庫）
  const pinyinMap = {
    '氣': 'qi', '血': 'xue', '陰': 'yin', '陽': 'yang', '虛': 'xu', '實': 'shi',
    '熱': 're', '寒': 'han', '濕': 'shi', '燥': 'zao', '風': 'feng', '火': 'huo',
    '痰': 'tan', '瘀': 'yu', '肝': 'gan', '心': 'xin', '脾': 'pi', '肺': 'fei',
    '腎': 'shen', '胃': 'wei', '膽': 'dan', '麻': 'ma', '黃': 'huang', '桂': 'gui',
    '枝': 'zhi', '升': 'sheng', '感': 'gan', '冒': 'mao', '咳': 'ke', '嗽': 'sou'
  };

  let id = '';
  for (const char of name) {
    id += pinyinMap[char] || char;
  }
  return id.toLowerCase().replace(/\s+/g, '_');
}

// 取得陣列欄位值
function getArrayFieldValues(fieldName) {
  const container = document.querySelector(`[data-field="${fieldName}"]`);
  if (!container) return [];

  const values = [];
  container.querySelectorAll('.array-item input').forEach(input => {
    if (input.value.trim()) {
      values.push(input.value.trim());
    }
  });
  return values;
}

// 收集表單資料
function collectFormData() {
  const form = elements.dataForm;
  const data = {};

  switch (state.currentType) {
    case 'herbs':
      data.id = form.querySelector('[name="id"]').value.trim();
      data.name = form.querySelector('[name="name"]').value.trim();
      data.pinyin = form.querySelector('[name="pinyin"]').value.trim();
      data.alias = getArrayFieldValues('alias');
      data.category = form.querySelector('[name="category"]').value;

      data.properties = {
        nature: form.querySelector('[name="nature"]:checked')?.value || '',
        flavor: [...form.querySelectorAll('[name="flavor"]:checked')].map(cb => cb.value),
        meridians: [...form.querySelectorAll('[name="meridians"]:checked')].map(cb => cb.value)
      };

      const intensity = form.querySelector('[name="intensity"]:checked')?.value;
      if (intensity) data.intensity = intensity;

      const dosageType = form.querySelector('[name="dosage_type"]:checked')?.value;
      if (dosageType) data.dosage_type = dosageType;

      const dosage = form.querySelector('[name="dosage"]')?.value.trim();
      if (dosage) data.dosage = dosage;

      const optimalDosage = form.querySelector('[name="optimal_dosage"]')?.value.trim();
      if (optimalDosage) data.optimal_dosage = optimalDosage;

      // 收集功效
      data.functions = [];
      form.querySelectorAll('.function-item-form').forEach((item, i) => {
        const func = {
          treatment: form.querySelector(`[name="function_treatment_${i}"]`)?.value || '',
          zhengsu: getArrayFieldValues(`function_zhengsu_${i}`),
          prerequisite: form.querySelector(`[name="function_prerequisite_${i}"]`)?.value.trim() || null,
          manifestations: getArrayFieldValues(`function_manifestations_${i}`)
        };
        if (func.treatment || func.zhengsu.length > 0) {
          data.functions.push(func);
        }
      });

      data.contraindications = getArrayFieldValues('contraindications');
      data.cautions = getArrayFieldValues('cautions');
      break;

    case 'formulas':
      data.id = form.querySelector('[name="id"]').value.trim();
      data.name = form.querySelector('[name="name"]').value.trim();
      data.pinyin = form.querySelector('[name="pinyin"]').value.trim();
      data.alias = getArrayFieldValues('alias');
      data.source = form.querySelector('[name="source"]').value.trim();
      data.category = form.querySelector('[name="category"]').value;

      // 收集組成
      data.composition = [];
      form.querySelectorAll('.composition-item-form').forEach((item, i) => {
        const herbSelect = form.querySelector(`[name="comp_herb_${i}"]`);
        const herbId = herbSelect?.value || '';
        const herbName = form.querySelector(`[name="comp_name_${i}"]`)?.value.trim() ||
                         herbSelect?.options[herbSelect.selectedIndex]?.text || '';

        if (herbId || herbName) {
          data.composition.push({
            herb_id: herbId || generateId(herbName),
            name: herbName,
            amount: form.querySelector(`[name="comp_amount_${i}"]`)?.value.trim() || '',
            role: form.querySelector(`[name="comp_role_${i}"]`)?.value || '佐',
            is_guide: form.querySelector(`[name="comp_guide_${i}"]`)?.checked || false
          });
        }
      });

      data.effects = getArrayFieldValues('effects');
      data.indications = form.querySelector('[name="indications"]')?.value.trim() || '';
      data.primary_zhengsu = getArrayFieldValues('primary_zhengsu');
      data.preparation = form.querySelector('[name="preparation"]')?.value.trim() || '';
      data.usage = form.querySelector('[name="usage"]')?.value.trim() || '';
      data.contraindications = getArrayFieldValues('contraindications');
      data.cautions = getArrayFieldValues('cautions');
      break;

    case 'zhengsu':
      data.id = form.querySelector('[name="id"]').value.trim();
      data.name = form.querySelector('[name="name"]').value.trim();
      data.category = form.querySelector('[name="category"]').value;
      data.subcategory = form.querySelector('[name="subcategory"]').value;
      data.treatment = form.querySelector('[name="treatment"]')?.value.trim() || '';
      data.is_critical = form.querySelector('[name="is_critical"]')?.checked || false;
      data.alias = getArrayFieldValues('alias');
      data.description = form.querySelector('[name="description"]')?.value.trim() || '';
      data.related_symptoms = getArrayFieldValues('related_symptoms');
      break;

    case 'symptoms':
      data.id = form.querySelector('[name="id"]').value.trim();
      data.name = form.querySelector('[name="name"]').value.trim();
      data.category = form.querySelector('[name="category"]').value;
      data.alias = getArrayFieldValues('alias');
      data.description = form.querySelector('[name="description"]')?.value.trim() || '';
      data.related_zhengsu = getArrayFieldValues('related_zhengsu');
      data.diagnostic_value = form.querySelector('[name="diagnostic_value"]')?.value.trim() || '';
      break;

    case 'zhengxing':
      data.id = form.querySelector('[name="id"]').value.trim();
      data.name = form.querySelector('[name="name"]').value.trim();
      data.alias = getArrayFieldValues('alias');

      data.zhengsu_composition = {
        location: getArrayFieldValues('location'),
        nature: getArrayFieldValues('nature')
      };

      data.symptoms = {
        main: getArrayFieldValues('main_symptoms'),
        secondary: getArrayFieldValues('secondary_symptoms'),
        tongue: form.querySelector('[name="tongue"]')?.value.trim() || '',
        pulse: form.querySelector('[name="pulse"]')?.value.trim() || ''
      };

      data.treatment_principle = getArrayFieldValues('treatment_principle');
      data.recommended_formulas = getArrayFieldValues('recommended_formulas');
      data.recommended_herbs = getArrayFieldValues('recommended_herbs');
      data.description = form.querySelector('[name="description"]')?.value.trim() || '';
      break;

    case 'diseases':
      data.id = form.querySelector('[name="id"]').value.trim();
      data.name = form.querySelector('[name="name"]').value.trim();
      data.category = form.querySelector('[name="category"]').value;
      data.alias = getArrayFieldValues('alias');
      data.western_medicine_reference = getArrayFieldValues('western_medicine_reference');
      data.etiology = getArrayFieldValues('etiology');
      data.pathogenesis = form.querySelector('[name="pathogenesis"]')?.value.trim() || '';
      data.main_symptoms = getArrayFieldValues('main_symptoms');

      // 收集證型模式
      data.zhengxing_patterns = [];
      form.querySelectorAll('.pattern-item-form').forEach((item, i) => {
        const patternId = form.querySelector(`[name="pattern_id_${i}"]`)?.value.trim();
        if (patternId) {
          data.zhengxing_patterns.push({
            zhengxing_id: patternId,
            frequency: form.querySelector(`[name="pattern_frequency_${i}"]`)?.value || '常見',
            stage: form.querySelector(`[name="pattern_stage_${i}"]`)?.value.trim() || ''
          });
        }
      });

      data.treatment_principles = getArrayFieldValues('treatment_principles');
      data.prevention = getArrayFieldValues('prevention');
      data.prognosis = form.querySelector('[name="prognosis"]')?.value.trim() || '';
      break;
  }

  // 清理空值
  cleanEmptyValues(data);

  return data;
}

// 清理空值
function cleanEmptyValues(obj) {
  for (const key in obj) {
    if (obj[key] === '' || obj[key] === null || obj[key] === undefined) {
      delete obj[key];
    } else if (Array.isArray(obj[key]) && obj[key].length === 0) {
      delete obj[key];
    } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      cleanEmptyValues(obj[key]);
      if (Object.keys(obj[key]).length === 0) {
        delete obj[key];
      }
    }
  }
}

// 編輯資料
function editData(id) {
  const data = state.dataList.find(item => item.id === id);
  if (data) {
    openForm(data);
  }
}

// 刪除資料
function deleteData(id) {
  state.editingId = id;
  const data = state.dataList.find(item => item.id === id);
  elements.deleteMessage.textContent = `確定要刪除「${data?.name || id}」嗎？`;
  elements.deleteModal.classList.remove('hidden');
}

// 確認刪除
function confirmDelete() {
  if (state.editingId) {
    // 從本地存儲刪除
    removeFromLocal(state.currentType, state.editingId);

    // 從列表移除
    state.dataList = state.dataList.filter(item => item.id !== state.editingId);
    renderDataList(state.dataList);

    showToast('已刪除（本地）');
  }
  closeDeleteModal();
}

// 關閉刪除彈窗
function closeDeleteModal() {
  elements.deleteModal.classList.add('hidden');
  state.editingId = null;
}

// 預覽 JSON
function previewJson() {
  const data = collectFormData();
  elements.jsonPreview.textContent = JSON.stringify(data, null, 2);
  elements.jsonModal.classList.remove('hidden');
}

// 關閉 JSON 彈窗
function closeJsonModal() {
  elements.jsonModal.classList.add('hidden');
}

// 複製 JSON
function copyJson() {
  const json = elements.jsonPreview.textContent;
  navigator.clipboard.writeText(json).then(() => {
    showToast('已複製到剪貼簿');
  }).catch(() => {
    showToast('複製失敗', 'error');
  });
}

// 下載 JSON
function downloadJson() {
  const data = collectFormData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.id || 'data'}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('已下載');
}

// 儲存到本地
function saveToLocal() {
  const data = collectFormData();
  saveToLocalStorage(state.currentType, data);
  showToast('已儲存到本地');
  closeJsonModal();

  // 更新列表
  const existingIndex = state.dataList.findIndex(item => item.id === data.id);
  if (existingIndex >= 0) {
    state.dataList[existingIndex] = data;
  } else {
    state.dataList.push(data);
  }
  renderDataList(state.dataList);
  closeForm();
}

// 儲存資料
function saveData() {
  const data = collectFormData();

  // 驗證必填欄位
  if (!data.id || !data.name) {
    showToast('請填寫必填欄位', 'error');
    return;
  }

  // 儲存到本地
  saveToLocalStorage(state.currentType, data);

  // 更新列表
  const existingIndex = state.dataList.findIndex(item => item.id === data.id);
  if (existingIndex >= 0) {
    state.dataList[existingIndex] = data;
  } else {
    state.dataList.push(data);
  }
  renderDataList(state.dataList);

  showToast('已儲存到本地');
  closeForm();
}

// LocalStorage 操作
function getLocalStorageKey(type) {
  return `tcm_admin_${type}`;
}

function getLocalData(type) {
  const key = getLocalStorageKey(type);
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveToLocalStorage(type, data) {
  const key = getLocalStorageKey(type);
  const existingData = getLocalData(type);
  const index = existingData.findIndex(item => item.id === data.id);

  if (index >= 0) {
    existingData[index] = data;
  } else {
    existingData.push(data);
  }

  localStorage.setItem(key, JSON.stringify(existingData));
}

function removeFromLocal(type, id) {
  const key = getLocalStorageKey(type);
  const existingData = getLocalData(type);
  const filtered = existingData.filter(item => item.id !== id);
  localStorage.setItem(key, JSON.stringify(filtered));
}

// 匯入 JSON
function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const data = JSON.parse(event.target.result);

      // 驗證資料
      if (!data.id || !data.name) {
        showToast('無效的資料格式', 'error');
        return;
      }

      // 儲存到本地
      saveToLocalStorage(state.currentType, data);

      // 更新列表
      const existingIndex = state.dataList.findIndex(item => item.id === data.id);
      if (existingIndex >= 0) {
        state.dataList[existingIndex] = data;
      } else {
        state.dataList.push(data);
      }
      renderDataList(state.dataList);

      showToast(`已匯入：${data.name}`);
    } catch (error) {
      showToast('JSON 解析失敗', 'error');
    }
  };
  reader.readAsText(file);

  // 清除選擇
  e.target.value = '';
}

// 匯出全部
function exportAll() {
  const localData = getLocalData(state.currentType);
  const allData = [...state.dataList];

  // 合併本地資料
  localData.forEach(local => {
    if (!allData.find(d => d.id === local.id)) {
      allData.push(local);
    }
  });

  if (allData.length === 0) {
    showToast('無資料可匯出', 'error');
    return;
  }

  const json = JSON.stringify(allData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.currentType}_all.json`;
  a.click();
  URL.revokeObjectURL(url);

  showToast(`已匯出 ${allData.length} 筆資料`);
}

// 顯示提示
function showToast(message, type = 'success') {
  elements.toast.textContent = message;
  elements.toast.className = `toast ${type}`;
  elements.toast.classList.remove('hidden');

  setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 3000);
}
