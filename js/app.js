/**
 * 中醫證素辨證資料庫 - 首頁
 */

// 全域狀態
const state = {
  zhengsu: [],
  herbs: [],
  formulas: [],
  zhengxing: [],
  loadError: false
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
  const container = document.querySelector('.stats-cards');
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
  container.parentNode.insertBefore(errorDiv, container);
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

// 方劑文件列表
const FORMULA_FILES = [
  'mahuangtang.json',
  'buzhongyiqi_tang.json',
  'sijunzi_tang.json',
  'yupingfeng_san.json'
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
  'zhongqixiaxian.json'
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
    // 處理「飲」這個特殊情況
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
  } catch (error) {
    console.error('載入中藥數據失敗:', error);
  }
}

/**
 * 載入方劑數據
 */
async function loadFormulas() {
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
}

/**
 * 載入證型數據
 */
async function loadZhengxing() {
  const promises = ZHENGXING_FILES.map(file =>
    fetch(`data/zhengxing/${file}`)
      .then(res => {
        if (!res.ok) throw new Error(`無法載入 ${file}`);
        return res.json();
      })
      .catch(err => {
        console.warn(`載入證型 ${file} 失敗:`, err);
        return null;
      })
  );

  const results = await Promise.all(promises);
  state.zhengxing = results.filter(z => z !== null);
}

/**
 * 更新統計卡片
 */
function updateStatsCards() {
  const bingweiCount = Object.values(ZHENGSU_CONFIG.bingwei).flat().length;
  const bingxingCount = Object.values(ZHENGSU_CONFIG.bingxing).flat().length;

  document.getElementById('zhengsu-count').textContent = bingweiCount + bingxingCount;
  document.getElementById('zhengsu-detail').textContent = `病位 ${bingweiCount} / 病性 ${bingxingCount}`;
  document.getElementById('herbs-count').textContent = state.herbs.length;
  document.getElementById('formulas-count').textContent = state.formulas.length;
  document.getElementById('zhengxing-count').textContent = state.zhengxing.length;
}

/**
 * 渲染證素速覽
 */
function renderZhengsuOverview() {
  // 渲染病位證素
  Object.entries(ZHENGSU_CONFIG.bingwei).forEach(([key, ids]) => {
    const container = document.getElementById(`tags-${key}`);
    if (container) {
      container.innerHTML = ids.map(id => {
        const z = state.zhengsu.find(zs => zs.id === id);
        if (!z) return '';
        const criticalClass = z.is_critical ? 'critical' : '';
        return `<span class="zhengsu-tag bingwei ${criticalClass}" data-id="${id}">${z.name}</span>`;
      }).join('');
    }
  });

  // 渲染病性證素
  Object.entries(ZHENGSU_CONFIG.bingxing).forEach(([key, ids]) => {
    const container = document.getElementById(`tags-${key}`);
    if (container) {
      container.innerHTML = ids.map(id => {
        const z = state.zhengsu.find(zs => zs.id === id);
        if (!z) return '';
        const criticalClass = z.is_critical ? 'critical' : '';
        return `<span class="zhengsu-tag bingxing ${criticalClass}" data-id="${id}">${z.name}</span>`;
      }).join('');
    }
  });

  // 綁定點擊事件
  document.querySelectorAll('.zhengsu-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const id = tag.dataset.id;
      showZhengsuModal(id);
    });
  });
}

/**
 * 顯示證素詳情彈窗
 */
function showZhengsuModal(id) {
  const z = state.zhengsu.find(zs => zs.id === id);
  if (!z) return;

  document.getElementById('modal-zhengsu-name').textContent = z.name;
  document.getElementById('modal-zhengsu-category').textContent = `${z.category} - ${z.subcategory}`;
  document.getElementById('modal-zhengsu-treatment').textContent = z.treatment || '（無對應治法）';
  document.getElementById('modal-zhengsu-alias').textContent = z.alias?.join('、') || '無';
  document.getElementById('modal-zhengsu-desc').textContent = z.description || '';

  const criticalRow = document.getElementById('modal-zhengsu-critical-row');
  if (z.is_critical) {
    criticalRow.classList.remove('hidden');
  } else {
    criticalRow.classList.add('hidden');
  }

  document.getElementById('zhengsu-modal').classList.remove('hidden');
}

/**
 * 關閉證素詳情彈窗
 */
function hideZhengsuModal() {
  document.getElementById('zhengsu-modal').classList.add('hidden');
}

/**
 * 初始化證素標籤頁切換
 */
function initZhengsuTabs() {
  const tabs = document.querySelectorAll('.zhengsu-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;

      // 切換標籤頁 active 狀態
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // 切換內容顯示
      document.getElementById('zhengsu-bingwei').classList.toggle('hidden', targetTab !== 'bingwei');
      document.getElementById('zhengsu-bingxing').classList.toggle('hidden', targetTab !== 'bingxing');
    });
  });
}

/**
 * 初始化彈窗
 */
function initModal() {
  const modal = document.getElementById('zhengsu-modal');
  if (!modal) return;

  const closeBtn = modal.querySelector('.modal-close');

  closeBtn.addEventListener('click', hideZhengsuModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideZhengsuModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideZhengsuModal();
    }
  });
}

/**
 * 頁面初始化
 */
document.addEventListener('DOMContentLoaded', async () => {
  // 初始化 UI
  initZhengsuTabs();
  initModal();

  // 檢測 file:// 協議
  if (isFileProtocol()) {
    showLoadError();
    return;
  }

  // 載入數據
  await Promise.all([
    loadZhengsu(),
    loadHerbs(),
    loadFormulas(),
    loadZhengxing()
  ]);

  // 檢查數據載入是否成功
  if (state.zhengsu.length === 0) {
    state.loadError = true;
    showLoadError();
  }

  // 渲染證素速覽
  renderZhengsuOverview();

  // 更新統計
  updateStatsCards();
});
