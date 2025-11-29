/**
 * 中醫證素辨證資料庫 - 證素總覽頁
 */

// 全域狀態
const state = {
  zhengsu: [],
  herbs: [],
  currentFilter: 'all'
};

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
 * 載入中藥數據
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
 * 獲取與證素相關的中藥
 */
function getRelatedHerbs(zhengsuId) {
  return state.herbs.filter(herb => {
    if (!herb.functions) return false;
    return herb.functions.some(f =>
      f.zhengsu && f.zhengsu.includes(zhengsuId)
    );
  });
}

/**
 * 渲染證素卡片
 */
function renderZhengsuCards() {
  // 渲染病位證素
  Object.entries(ZHENGSU_CONFIG.bingwei).forEach(([key, ids]) => {
    const container = document.getElementById(`cards-${key}`);
    if (container) {
      container.innerHTML = ids.map(id => {
        const z = state.zhengsu.find(zs => zs.id === id);
        if (!z) return '';
        return createZhengsuCard(z, 'bingwei');
      }).join('');
    }
  });

  // 渲染病性證素
  Object.entries(ZHENGSU_CONFIG.bingxing).forEach(([key, ids]) => {
    const container = document.getElementById(`cards-${key}`);
    if (container) {
      container.innerHTML = ids.map(id => {
        const z = state.zhengsu.find(zs => zs.id === id);
        if (!z) return '';
        return createZhengsuCard(z, 'bingxing');
      }).join('');
    }
  });

  // 綁定卡片點擊事件
  document.querySelectorAll('.zhengsu-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      showZhengsuModal(id);
    });
  });
}

/**
 * 創建證素卡片 HTML
 */
function createZhengsuCard(zhengsu, type) {
  const criticalClass = zhengsu.is_critical ? 'critical' : '';
  const relatedHerbs = getRelatedHerbs(zhengsu.id);

  return `
    <div class="zhengsu-card ${type} ${criticalClass}" data-id="${zhengsu.id}">
      <div class="zhengsu-card-header">
        <span class="zhengsu-card-name">${zhengsu.name}</span>
        ${zhengsu.is_critical ? '<span class="critical-indicator">危重</span>' : ''}
      </div>
      ${zhengsu.treatment ? `<div class="zhengsu-card-treatment">治法：${zhengsu.treatment}</div>` : ''}
      <div class="zhengsu-card-info">
        <span class="zhengsu-card-category">${zhengsu.subcategory}</span>
        ${relatedHerbs.length > 0 ? `<span class="zhengsu-card-herbs">${relatedHerbs.length} 味藥</span>` : ''}
      </div>
    </div>
  `;
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

  // 渲染相關中藥
  const relatedHerbs = getRelatedHerbs(id);
  const herbsContainer = document.getElementById('modal-related-herbs');
  if (relatedHerbs.length > 0) {
    herbsContainer.innerHTML = relatedHerbs.map(herb =>
      `<a href="herbs.html" class="related-herb-tag">${herb.name}</a>`
    ).join('');
  } else {
    herbsContainer.innerHTML = '<span class="no-data">暫無相關中藥</span>';
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
 * 初始化篩選標籤
 */
function initFilters() {
  const tabs = document.querySelectorAll('.filter-tab');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const filter = tab.dataset.filter;

      // 更新 active 狀態
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // 應用篩選
      applyFilter(filter);
    });
  });
}

/**
 * 應用篩選
 */
function applyFilter(filter) {
  state.currentFilter = filter;

  const bingweiSection = document.getElementById('section-bingwei');
  const bingxingSection = document.getElementById('section-bingxing');

  // 顯示/隱藏區塊
  switch (filter) {
    case 'all':
      bingweiSection.classList.remove('hidden');
      bingxingSection.classList.remove('hidden');
      // 顯示所有卡片
      document.querySelectorAll('.zhengsu-card').forEach(card => {
        card.classList.remove('hidden');
      });
      break;

    case 'bingwei':
      bingweiSection.classList.remove('hidden');
      bingxingSection.classList.add('hidden');
      break;

    case 'bingxing':
      bingweiSection.classList.add('hidden');
      bingxingSection.classList.remove('hidden');
      break;

    case 'critical':
      bingweiSection.classList.remove('hidden');
      bingxingSection.classList.remove('hidden');
      // 只顯示危重證素
      document.querySelectorAll('.zhengsu-card').forEach(card => {
        if (card.classList.contains('critical')) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
      break;
  }
}

/**
 * 頁面初始化
 */
document.addEventListener('DOMContentLoaded', async () => {
  // 初始化 UI
  initModal();
  initFilters();

  // 載入數據
  await Promise.all([
    loadZhengsu(),
    loadHerbs()
  ]);

  // 渲染證素卡片
  renderZhengsuCards();
});
