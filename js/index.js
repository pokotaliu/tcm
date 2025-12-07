/**
 * 中醫證候資料庫 - 首頁腳本
 */

// 全域狀態
let syndromeIndex = null;
let syndromeCache = {};
let currentCategory = 'all';

// 分類 ID 對應表
const categoryMapping = {
  'all': null,
  'basic': 'basic',
  'systemic': 'systemic',
  'zangfu': 'zangfu',
  'shanghan': 'shanghan',
  'wenbing': 'wenbing',
  'specialty': 'specialty'
};

// DOM 元素
const elements = {};

/**
 * 初始化
 */
document.addEventListener('DOMContentLoaded', async () => {
  cacheElements();
  setupEventListeners();
  await loadSyndromeIndex();
});

/**
 * 緩存 DOM 元素
 */
function cacheElements() {
  elements.syndromeCategories = document.getElementById('syndrome-categories');
  elements.searchInput = document.getElementById('global-search-input');
  elements.searchBtn = document.getElementById('global-search-btn');
  elements.searchResultsArea = document.getElementById('search-results-area');
  elements.searchResultsGrid = document.getElementById('search-results-grid');
  elements.modal = document.getElementById('syndrome-modal');
  elements.modalName = document.getElementById('modal-syndrome-name');
  elements.modalCategory = document.getElementById('modal-category');
  elements.modalNumber = document.getElementById('modal-number');
  elements.modalZhengsu = document.getElementById('modal-zhengsu');
  elements.modalBody = document.getElementById('modal-body');
}

/**
 * 設置事件監聯器
 */
function setupEventListeners() {
  // 模組切換
  document.querySelectorAll('.module-tab').forEach(tab => {
    tab.addEventListener('click', () => switchModule(tab.dataset.module));
  });

  // 分類篩選
  document.querySelectorAll('.category-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => filterByCategory(btn.dataset.category));
  });

  // 搜尋
  elements.searchInput?.addEventListener('input', handleSearch);
  elements.searchBtn?.addEventListener('click', handleSearch);
  elements.searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  // 清除搜尋
  document.querySelector('.btn-clear-search')?.addEventListener('click', clearSearch);

  // 彈窗關閉
  elements.modal?.querySelector('.modal-close')?.addEventListener('click', closeModal);
  elements.modal?.addEventListener('click', (e) => {
    if (e.target === elements.modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // 展開更多按鈕
  document.querySelectorAll('.btn-expand-more').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.classList.toggle('hidden');
        btn.classList.toggle('expanded');
        btn.textContent = targetEl.classList.contains('hidden') ? '展開更多' : '收起';
      }
    });
  });
}

/**
 * 載入證型索引資料
 */
async function loadSyndromeIndex() {
  try {
    const response = await fetch('data/index/syndrome_index.json');
    if (!response.ok) throw new Error('無法載入證型索引');
    syndromeIndex = await response.json();

    updateCategoryCountBadges();
    renderCategories();
  } catch (error) {
    console.error('載入證型索引失敗:', error);
    elements.syndromeCategories.innerHTML = `
      <div class="no-results">載入資料失敗，請重新整理頁面</div>
    `;
  }
}

/**
 * 更新分類數量徽章
 */
function updateCategoryCountBadges() {
  if (!syndromeIndex?.categories) return;

  syndromeIndex.categories.forEach(cat => {
    const btn = document.querySelector(`[data-category="${cat.id}"]`);
    if (btn) {
      const countSpan = btn.querySelector('.count');
      if (countSpan) {
        countSpan.textContent = `(${cat.count})`;
      }
    }
  });
}

/**
 * 渲染分類內容
 */
function renderCategories(filterCategoryId = null) {
  if (!syndromeIndex?.categories) {
    elements.syndromeCategories.innerHTML = '<div class="no-results">暫無資料</div>';
    return;
  }

  let html = '';
  const categories = filterCategoryId
    ? syndromeIndex.categories.filter(c => c.id === filterCategoryId)
    : syndromeIndex.categories;

  categories.forEach(category => {
    html += renderCategorySection(category);
  });

  elements.syndromeCategories.innerHTML = html;

  // 綁定展開/收合事件
  document.querySelectorAll('.category-header').forEach(header => {
    header.addEventListener('click', () => {
      const section = header.closest('.category-section');
      section.classList.toggle('collapsed');
    });
  });

  // 綁定證型標籤點擊事件
  document.querySelectorAll('.syndrome-tag').forEach(tag => {
    tag.addEventListener('click', (e) => {
      e.stopPropagation();
      showSyndromeDetail(tag.dataset.id);
    });
  });
}

/**
 * 渲染單個分類區塊
 */
function renderCategorySection(category) {
  let subcategoriesHtml = '';

  if (category.subcategories && category.subcategories.length > 0) {
    category.subcategories.forEach(subcat => {
      subcategoriesHtml += `
        <div class="subcategory">
          <div class="subcategory-title">${subcat.name}（${subcat.count}）</div>
          <div class="subcategory-syndromes">
            ${renderSyndromeTags(subcat.syndromes)}
          </div>
        </div>
      `;
    });
  }

  return `
    <div class="category-section" data-category="${category.id}">
      <div class="category-header">
        <h3 class="category-name">
          <span class="category-toggle">▼</span>
          ${category.name}
        </h3>
        <span class="category-count">${category.count} 個證候</span>
      </div>
      <div class="category-content">
        ${subcategoriesHtml}
      </div>
    </div>
  `;
}

/**
 * 渲染證型標籤
 */
function renderSyndromeTags(syndromes) {
  if (!syndromes || syndromes.length === 0) return '';

  return syndromes.map(s => {
    // 建立 tooltip 內容
    let tooltipContent = '';
    if (s.location && s.location.length > 0) {
      tooltipContent += `<span class="tooltip-location">📍 ${s.location.join('、')}</span>`;
    }
    if (s.nature && s.nature.length > 0) {
      tooltipContent += `<span class="tooltip-nature">🔹 ${s.nature.join('、')}</span>`;
    }

    const tooltipHtml = tooltipContent
      ? `<span class="tooltip">${tooltipContent}</span>`
      : '';

    return `
      <span class="syndrome-tag" data-id="${s.id}">
        <span class="tag-number">${s.number}</span>${s.name}${tooltipHtml}
      </span>
    `;
  }).join('');
}

/**
 * 切換功能模組
 */
function switchModule(moduleId) {
  // 更新標籤狀態
  document.querySelectorAll('.module-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.module === moduleId);
  });

  // 更新面板顯示
  document.querySelectorAll('.module-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `module-${moduleId}`);
  });
}

/**
 * 按分類篩選
 */
function filterByCategory(categoryId) {
  currentCategory = categoryId;

  // 更新按鈕狀態
  document.querySelectorAll('.category-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === categoryId);
  });

  // 渲染篩選後的內容
  const filterCategoryId = categoryMapping[categoryId];
  renderCategories(filterCategoryId);
}

/**
 * 處理搜尋
 */
function handleSearch() {
  const keyword = elements.searchInput?.value?.trim();

  if (!keyword || keyword.length < 1) {
    clearSearch();
    return;
  }

  const results = searchSyndromes(keyword);
  showSearchResults(results, keyword);
}

/**
 * 搜尋證型
 */
function searchSyndromes(keyword) {
  if (!syndromeIndex?.categories) return [];

  const results = [];
  const lowerKeyword = keyword.toLowerCase();

  syndromeIndex.categories.forEach(category => {
    if (category.subcategories) {
      category.subcategories.forEach(subcat => {
        subcat.syndromes?.forEach(syndrome => {
          if (syndrome.name.toLowerCase().includes(lowerKeyword) ||
              syndrome.id.toLowerCase().includes(lowerKeyword)) {
            results.push({
              ...syndrome,
              category: category.name,
              subcategory: subcat.name
            });
          }
        });
      });
    }
  });

  return results;
}

/**
 * 顯示搜尋結果
 */
function showSearchResults(results, keyword) {
  if (results.length === 0) {
    elements.searchResultsGrid.innerHTML = `
      <div class="no-results">未找到與「${keyword}」相關的證候</div>
    `;
  } else {
    let html = '';
    results.forEach(s => {
      html += `
        <span class="syndrome-tag" data-id="${s.id}" title="${s.category} > ${s.subcategory}">
          <span class="tag-number">#${s.number}</span>${s.name}
        </span>
      `;
    });
    elements.searchResultsGrid.innerHTML = html;

    // 綁定點擊事件
    elements.searchResultsGrid.querySelectorAll('.syndrome-tag').forEach(tag => {
      tag.addEventListener('click', () => showSyndromeDetail(tag.dataset.id));
    });
  }

  elements.searchResultsArea.classList.remove('hidden');

  // 更新標題
  const title = elements.searchResultsArea.querySelector('.search-results-title');
  if (title) {
    title.textContent = `搜尋結果：${results.length} 個證候`;
  }
}

/**
 * 清除搜尋
 */
function clearSearch() {
  if (elements.searchInput) {
    elements.searchInput.value = '';
  }
  elements.searchResultsArea?.classList.add('hidden');
}

/**
 * 顯示證型詳情
 */
async function showSyndromeDetail(syndromeId) {
  if (!syndromeId) return;

  // 檢查快取
  let data = syndromeCache[syndromeId];

  if (!data) {
    try {
      const response = await fetch(`data/zhenghou/syndromes/${syndromeId}.json`);
      if (!response.ok) throw new Error('無法載入證型資料');
      data = await response.json();
      syndromeCache[syndromeId] = data;
    } catch (error) {
      console.error('載入證型詳情失敗:', error);
      alert('載入證型資料失敗，請稍後再試');
      return;
    }
  }

  // 填充彈窗內容
  elements.modalName.textContent = data.name;
  elements.modalCategory.textContent = data.category || '';
  elements.modalNumber.textContent = `#${data.number}`;

  // 證素標籤
  elements.modalZhengsu.innerHTML = renderZhengsuTags(data.zhengsu_composition);

  // 詳情內容
  elements.modalBody.innerHTML = buildDetailContent(data);

  // 顯示彈窗
  elements.modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

/**
 * 渲染證素標籤
 */
function renderZhengsuTags(composition) {
  if (!composition) return '';

  let html = '';

  // 病位
  if (composition.location && composition.location.length > 0) {
    composition.location.forEach(loc => {
      html += `<span class="zhengsu-tag location">📍 ${loc}</span>`;
    });
  }

  // 病性
  if (composition.nature && composition.nature.length > 0) {
    composition.nature.forEach(nat => {
      html += `<span class="zhengsu-tag nature">🔹 ${formatNatureName(nat)}</span>`;
    });
  }

  return html;
}

/**
 * 格式化病性名稱
 */
function formatNatureName(natureId) {
  const nameMap = {
    'qi_xu': '氣虛',
    'xue_xu': '血虛',
    'yin_xu': '陰虛',
    'yang_xu': '陽虛',
    'qi_zhi': '氣滯',
    'xue_yu': '血瘀',
    'tan': '痰',
    'shi': '濕',
    'han': '寒',
    'huo': '火',
    're': '熱',
    'feng': '風',
    'zao': '燥',
    'du': '毒',
    'shu': '暑',
    'shui_ting': '水停',
    'qi_ni': '氣逆',
    'qi_xian': '氣陷',
    'qi_tuo': '氣脫',
    'wang_yin': '亡陰',
    'wang_yang': '亡陽',
    'dong_xue': '動血',
    'dong_feng': '動風',
    'jing_kui': '精虧',
    'jin_kui': '津虧',
    'yang_kang': '陽亢',
    'yang_fu': '陽浮',
    'bu_gu': '不固',
    'shi_ji': '食積',
    'chong_ji': '蟲積',
    'nong': '膿',
    'qingyang_busheng': '清陽不升'
  };
  return nameMap[natureId] || natureId;
}

/**
 * 建構詳情內容
 */
function buildDetailContent(data) {
  let html = '';

  // 概述
  if (data.overview) {
    html += `
      <section class="detail-section">
        <h3 class="section-heading">定義</h3>
        <div class="section-content">
          ${formatParagraphs(data.overview)}
        </div>
      </section>
    `;
  }

  // 臨床表現
  if (data.clinical_manifestations) {
    html += `
      <section class="detail-section">
        <h3 class="section-heading">臨床表現</h3>
        <div class="section-content">
          ${formatClinicalManifestations(data.clinical_manifestations)}
        </div>
      </section>
    `;
  }

  // 本證辨析
  if (data.differential?.self_analysis) {
    html += `
      <section class="detail-section">
        <h3 class="section-heading">本證辨析</h3>
        <div class="section-content">
          ${formatParagraphs(data.differential.self_analysis)}
        </div>
      </section>
    `;
  }

  // 類證鑑別
  if (data.differential?.type_comparison) {
    html += `
      <section class="detail-section">
        <h3 class="section-heading">類證鑑別</h3>
        <div class="section-content">
          ${formatParagraphs(data.differential.type_comparison)}
        </div>
      </section>
    `;
  }

  // 文獻選錄
  if (data.literature) {
    html += `
      <section class="detail-section">
        <h3 class="section-heading">文獻選錄</h3>
        <div class="section-content">
          ${formatLiterature(data.literature)}
        </div>
      </section>
    `;
  }

  return html;
}

/**
 * 格式化段落
 */
function formatParagraphs(text) {
  if (!text) return '';

  const paragraphs = text.split('\n').filter(p => p.trim());

  return paragraphs.map(p => {
    let formatted = p
      .replace(/「([^」]+)」/g, '<span class="highlight-quote">「$1」</span>')
      .replace(/《([^》]+)》/g, '<cite class="book-title">《$1》</cite>');
    return `<p>${formatted}</p>`;
  }).join('');
}

/**
 * 格式化臨床表現
 */
function formatClinicalManifestations(text) {
  if (!text) return '';

  const symptoms = text.split(/[，、；]/);

  if (symptoms.length > 3) {
    return `
      <div class="symptom-tags">
        ${symptoms.map(s => s.trim()).filter(s => s).map(s =>
          `<span class="symptom-tag">${s}</span>`
        ).join('')}
      </div>
    `;
  }

  return `<p>${text}</p>`;
}

/**
 * 格式化文獻引用
 */
function formatLiterature(text) {
  if (!text) return '';

  const citations = text.split('\n').filter(line => line.trim());

  return citations.map(citation => {
    const match = citation.match(/^《([^》]+)》[·：:「]?\s*(.+)/);
    if (match) {
      const source = match[1];
      let quote = match[2];
      if (quote.startsWith('：「') || quote.startsWith(':"')) {
        quote = quote.substring(2);
      }
      if (quote.endsWith('」') || quote.endsWith('"')) {
        quote = quote.slice(0, -1);
      }
      return `
        <blockquote class="literature-quote">
          <div class="quote-source">《${source}》</div>
          <div class="quote-text">「${quote}」</div>
        </blockquote>
      `;
    }
    return `<blockquote class="literature-quote"><div class="quote-text">${citation}</div></blockquote>`;
  }).join('');
}

/**
 * 關閉彈窗
 */
function closeModal() {
  elements.modal?.classList.add('hidden');
  document.body.style.overflow = '';
}
