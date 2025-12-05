/**
 * 中醫證候辨證資料庫 - 證候模組
 */

// 全域資料
let zhenghouIndex = null;
let zhenghouCache = {};

// DOM 載入完成後執行
document.addEventListener('DOMContentLoaded', async () => {
  await loadZhenghouIndex();
  await loadOtherStats();
  setupEventListeners();
});

/**
 * 載入證候索引資料
 */
async function loadZhenghouIndex() {
  try {
    const response = await fetch('data/zhenghou/index.json');
    if (!response.ok) throw new Error('無法載入證候索引');
    zhenghouIndex = await response.json();

    // 更新統計數字
    document.getElementById('zhenghou-count').textContent = zhenghouIndex.total_syndromes;
    document.getElementById('category-count').textContent = zhenghouIndex.categories.length;

    // 渲染分類列表
    renderCategories();
  } catch (error) {
    console.error('載入證候索引失敗:', error);
    document.getElementById('zhenghou-categories').innerHTML = `
      <div class="no-results">載入證候資料失敗，請稍後再試。</div>
    `;
  }
}

/**
 * 載入其他統計資料（中藥、方劑）
 */
async function loadOtherStats() {
  // 載入中藥數量
  try {
    const herbFiles = await fetch('data/herbs/').catch(() => null);
    // 簡單計數，假設有固定數量或從其他來源取得
    const herbsCount = await countJsonFiles('data/herbs/');
    document.getElementById('herbs-count').textContent = herbsCount || '--';
  } catch (e) {
    document.getElementById('herbs-count').textContent = '--';
  }

  // 載入方劑數量
  try {
    const formulasCount = await countJsonFiles('data/formulas/');
    document.getElementById('formulas-count').textContent = formulasCount || '--';
  } catch (e) {
    document.getElementById('formulas-count').textContent = '--';
  }
}

/**
 * 計算目錄中的 JSON 檔案數量（排除 _schema.json）
 */
async function countJsonFiles(dir) {
  // 由於無法直接列出目錄，這裡使用硬編碼或嘗試載入索引
  // 這是一個簡化的實作
  const knownCounts = {
    'data/herbs/': 5,
    'data/formulas/': 4
  };
  return knownCounts[dir] || 0;
}

/**
 * 渲染證候分類
 */
function renderCategories() {
  const container = document.getElementById('zhenghou-categories');

  if (!zhenghouIndex || !zhenghouIndex.categories) {
    container.innerHTML = '<div class="no-results">暫無資料</div>';
    return;
  }

  let html = '';

  zhenghouIndex.categories.forEach((category, catIndex) => {
    html += `
      <div class="zhenghou-category">
        <h3 class="category-title">${category.id}、${category.name}（${category.syndrome_count} 個證候）</h3>
        <div class="zhengsu-cards">
    `;

    category.syndromes.forEach(syndrome => {
      html += `
        <div class="zhengsu-card bingxing" data-id="${syndrome.id}" onclick="showZhenghouDetail('${syndrome.id}')">
          <div class="zhengsu-card-header">
            <span class="zhengsu-card-name">${syndrome.name}</span>
            <span class="zhengsu-card-number">#${syndrome.number}</span>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  container.classList.remove('loading');
}

/**
 * 顯示證候詳情
 */
async function showZhenghouDetail(syndromeId) {
  const modal = document.getElementById('zhenghou-modal');

  // 檢查快取
  let data = zhenghouCache[syndromeId];

  if (!data) {
    try {
      const response = await fetch(`data/zhenghou/syndromes/${syndromeId}.json`);
      if (!response.ok) throw new Error('無法載入證候資料');
      data = await response.json();
      zhenghouCache[syndromeId] = data;
    } catch (error) {
      console.error('載入證候詳情失敗:', error);
      alert('載入證候資料失敗');
      return;
    }
  }

  // 填充彈窗內容
  document.getElementById('modal-zhenghou-name').textContent = data.name;

  // 概述
  const overviewEl = document.getElementById('modal-overview');
  overviewEl.innerHTML = formatText(data.overview || '暫無資料');

  // 臨床表現
  const manifestationsEl = document.getElementById('modal-manifestations');
  manifestationsEl.innerHTML = data.clinical_manifestations
    ? formatText(data.clinical_manifestations)
    : '<span class="no-data">暫無資料</span>';

  // 本證辨析
  const selfAnalysisEl = document.getElementById('modal-self-analysis');
  const differentialCard = document.getElementById('differential-card');
  if (data.differential && data.differential.self_analysis) {
    selfAnalysisEl.innerHTML = formatText(data.differential.self_analysis);
    differentialCard.classList.remove('hidden');
  } else {
    differentialCard.classList.add('hidden');
  }

  // 類證鑑別
  const typeComparisonEl = document.getElementById('modal-type-comparison');
  const comparisonCard = document.getElementById('comparison-card');
  if (data.differential && data.differential.type_comparison) {
    typeComparisonEl.innerHTML = formatText(data.differential.type_comparison);
    comparisonCard.classList.remove('hidden');
  } else {
    comparisonCard.classList.add('hidden');
  }

  // 文獻選錄
  const literatureEl = document.getElementById('modal-literature');
  const literatureCard = document.getElementById('literature-card');
  if (data.literature) {
    literatureEl.innerHTML = formatLiterature(data.literature);
    literatureCard.classList.remove('hidden');
  } else {
    literatureCard.classList.add('hidden');
  }

  // 顯示彈窗
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

/**
 * 格式化文字（換行處理）
 */
function formatText(text) {
  if (!text) return '';
  return text
    .replace(/\n/g, '<br>')
    .replace(/「([^」]+)」/g, '<span style="color: var(--primary-color);">「$1」</span>');
}

/**
 * 格式化文獻引用
 */
function formatLiterature(text) {
  if (!text) return '';

  // 分割每條引用
  const citations = text.split('\n').filter(line => line.trim());

  return citations.map(citation => {
    // 嘗試分離書名和引文
    const match = citation.match(/《([^》]+)》[：:「]?(.+)/);
    if (match) {
      return `
        <div class="literature-item">
          <div class="literature-source">《${match[1]}》</div>
          <div class="literature-quote">${match[2].replace(/」$/, '')}</div>
        </div>
      `;
    }
    return `<div class="literature-item"><div class="literature-quote">${citation}</div></div>`;
  }).join('');
}

/**
 * 關閉彈窗
 */
function closeModal() {
  const modal = document.getElementById('zhenghou-modal');
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

/**
 * 搜尋證候
 */
function searchZhenghou(keyword) {
  if (!keyword || !zhenghouIndex) return [];

  keyword = keyword.toLowerCase().trim();

  const results = [];

  zhenghouIndex.categories.forEach(category => {
    category.syndromes.forEach(syndrome => {
      if (syndrome.name.toLowerCase().includes(keyword)) {
        results.push({
          ...syndrome,
          category: category.name
        });
      }
    });
  });

  return results;
}

/**
 * 顯示搜尋結果
 */
function showSearchResults(results) {
  const container = document.getElementById('search-results');

  if (results.length === 0) {
    container.innerHTML = '<div class="no-results">未找到匹配的證候</div>';
  } else {
    let html = '<div class="zhengsu-cards">';
    results.forEach(syndrome => {
      html += `
        <div class="zhengsu-card bingxing" onclick="showZhenghouDetail('${syndrome.id}')">
          <div class="zhengsu-card-header">
            <span class="zhengsu-card-name">${syndrome.name}</span>
            <span class="zhengsu-card-number">#${syndrome.number}</span>
          </div>
          <div class="zhengsu-card-treatment">${syndrome.category}</div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  container.classList.remove('hidden');
}

/**
 * 設置事件監聽器
 */
function setupEventListeners() {
  // 搜尋按鈕
  const searchBtn = document.getElementById('search-btn');
  const searchInput = document.getElementById('search-input');

  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      const keyword = searchInput.value;
      if (keyword.trim()) {
        const results = searchZhenghou(keyword);
        showSearchResults(results);
      }
    });

    // Enter 鍵搜尋
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const keyword = searchInput.value;
        if (keyword.trim()) {
          const results = searchZhenghou(keyword);
          showSearchResults(results);
        }
      }
    });
  }

  // 彈窗關閉
  const modal = document.getElementById('zhenghou-modal');
  const closeBtn = modal.querySelector('.modal-close');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  // 點擊背景關閉
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // ESC 鍵關閉
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });
}
