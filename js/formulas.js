/**
 * 中醫證素辨證資料庫 - 方劑分析頁
 */

// 全域狀態
const state = {
  zhengsu: [],
  formulas: []
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

// 方劑文件列表
const FORMULA_FILES = [
  'mahuangtang.json',
  'buzhongyiqi_tang.json'
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
 * 載入方劑數據
 */
async function loadFormulas() {
  const formulaList = document.getElementById('formula-list');
  formulaList.innerHTML = '<div class="loading">載入方劑數據中</div>';

  try {
    const promises = FORMULA_FILES.map(file =>
      fetch(`data/formulas/${file}`)
        .then(res => {
          if (!res.ok) throw new Error(`無法載入 ${file}`);
          return res.json();
        })
        .catch(err => {
          console.warn(`載入方劑 ${file} 失敗:`, err);
          return null;
        })
    );

    const results = await Promise.all(promises);
    state.formulas = results.filter(f => f !== null);

    renderFormulas();
  } catch (error) {
    console.error('載入方劑數據失敗:', error);
    formulaList.innerHTML = '<div class="no-results">載入數據失敗，請重新整理頁面</div>';
  }
}

/**
 * 獲取證素名稱
 */
function getZhengsuName(id) {
  const z = state.zhengsu.find(zs => zs.id === id);
  return z ? z.name : id;
}

/**
 * 渲染方劑列表
 */
function renderFormulas() {
  const formulaList = document.getElementById('formula-list');

  if (state.formulas.length === 0) {
    formulaList.innerHTML = '<div class="no-results">尚無方劑數據</div>';
    return;
  }

  formulaList.innerHTML = state.formulas.map(formula => createFormulaCard(formula)).join('');

  // 綁定卡片點擊事件
  document.querySelectorAll('.formula-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      showFormulaModal(id);
    });
  });
}

/**
 * 創建方劑卡片 HTML
 */
function createFormulaCard(formula) {
  const effects = formula.effects || [];
  const primaryZhengsu = formula.primary_zhengsu || [];
  const composition = formula.composition || [];

  // 獲取最高權重的治法
  const weights = formula.calculated_weights?.treatment || {};
  const topTreatments = Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, weight]) => ({ name, weight }));

  return `
    <div class="formula-card" data-id="${formula.id}">
      <div class="formula-card-header">
        <div class="formula-name">${formula.name}</div>
        <div class="formula-source">${formula.source}</div>
      </div>
      <div class="formula-category">${formula.category}</div>
      <div class="formula-effects">
        ${effects.map(e => `<span class="effect-tag">${e}</span>`).join('')}
      </div>
      <div class="formula-composition-preview">
        ${composition.slice(0, 4).map(c => `<span class="herb-preview">${c.name}</span>`).join('')}
        ${composition.length > 4 ? `<span class="herb-preview more">+${composition.length - 4}</span>` : ''}
      </div>
      <div class="formula-weights-preview">
        ${topTreatments.map(t => `
          <div class="weight-preview-item">
            <span class="weight-label">${t.name}</span>
            <div class="weight-bar-mini">
              <div class="weight-fill" style="width: ${Math.min(t.weight / 10 * 100, 100)}%"></div>
            </div>
            <span class="weight-value">${t.weight.toFixed(1)}</span>
          </div>
        `).join('')}
      </div>
      <div class="formula-zhengsu">
        ${primaryZhengsu.map(z => `<span class="zhengsu-tag-small">${getZhengsuName(z)}</span>`).join('')}
      </div>
    </div>
  `;
}

/**
 * 顯示方劑詳情彈窗
 */
function showFormulaModal(id) {
  const formula = state.formulas.find(f => f.id === id);
  if (!formula) return;

  document.getElementById('modal-formula-name').textContent = formula.name;
  document.getElementById('modal-formula-source').textContent = formula.source || '';
  document.getElementById('modal-formula-category').textContent = formula.category || '';
  document.getElementById('modal-formula-effects').textContent = (formula.effects || []).join('、');
  document.getElementById('modal-formula-indications').textContent = formula.indications || '';
  document.getElementById('modal-formula-usage').textContent = formula.usage || '';
  document.getElementById('modal-formula-contraindications').textContent =
    (formula.contraindications || []).join('、') || '無';

  // 渲染組成
  renderComposition(formula.composition || []);

  // 渲染權重分析
  renderWeights(formula.calculated_weights || {});

  // 渲染主要證素
  const primaryZhengsuContainer = document.getElementById('modal-primary-zhengsu');
  primaryZhengsuContainer.innerHTML = (formula.primary_zhengsu || [])
    .map(z => `<span class="zhengsu-tag-inline">${getZhengsuName(z)}</span>`)
    .join('');

  document.getElementById('formula-modal').classList.remove('hidden');
}

/**
 * 渲染組成表格
 */
function renderComposition(composition) {
  const container = document.getElementById('modal-composition');

  container.innerHTML = `
    <table class="composition-table-inner">
      <thead>
        <tr>
          <th>藥物</th>
          <th>用量</th>
          <th>角色</th>
          <th>引經</th>
        </tr>
      </thead>
      <tbody>
        ${composition.map(c => `
          <tr class="role-${c.role}">
            <td>${c.name}</td>
            <td>${c.amount}</td>
            <td><span class="role-badge role-${c.role}">${c.role}</span></td>
            <td>${c.is_guide ? '是' : ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/**
 * 渲染權重分析
 */
function renderWeights(weights) {
  // 治法權重
  renderWeightBars('treatment-weights', weights.treatment || {}, '治法');

  // 病位權重
  const locationWeights = {};
  Object.entries(weights.location || {}).forEach(([key, value]) => {
    locationWeights[getZhengsuName(key)] = value;
  });
  renderWeightBars('location-weights', locationWeights, '病位');

  // 病性權重
  const natureWeights = {};
  Object.entries(weights.nature || {}).forEach(([key, value]) => {
    natureWeights[getZhengsuName(key)] = value;
  });
  renderWeightBars('nature-weights', natureWeights, '病性');
}

/**
 * 渲染權重條
 */
function renderWeightBars(containerId, weights, type) {
  const container = document.getElementById(containerId);
  const entries = Object.entries(weights).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    container.innerHTML = '<div class="no-data">暫無數據</div>';
    return;
  }

  const maxWeight = Math.max(...entries.map(e => e[1]));

  container.innerHTML = entries.map(([name, weight]) => `
    <div class="weight-bar-row">
      <span class="weight-name">${name}</span>
      <div class="weight-bar">
        <div class="weight-fill ${type}" style="width: ${(weight / maxWeight) * 100}%"></div>
      </div>
      <span class="weight-number">${weight.toFixed(1)}</span>
    </div>
  `).join('');
}

/**
 * 關閉方劑詳情彈窗
 */
function hideFormulaModal() {
  document.getElementById('formula-modal').classList.add('hidden');
}

/**
 * 初始化彈窗
 */
function initModal() {
  const modal = document.getElementById('formula-modal');
  if (!modal) return;

  const closeBtn = modal.querySelector('.modal-close');

  closeBtn.addEventListener('click', hideFormulaModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideFormulaModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideFormulaModal();
    }
  });
}

/**
 * 頁面初始化
 */
document.addEventListener('DOMContentLoaded', async () => {
  // 初始化彈窗
  initModal();

  // 檢測 file:// 協議
  if (isFileProtocol()) {
    showLoadError();
    document.getElementById('formula-list').innerHTML = '';
    return;
  }

  // 載入數據
  await loadZhengsu();
  await loadFormulas();

  // 檢查數據載入是否成功
  if (state.formulas.length === 0) {
    showLoadError();
  }
});
