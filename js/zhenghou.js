/**
 * 中醫證候資料庫 - 證候模組
 */

// 全域資料
let zhenghouIndex = null;
let zhenghouCache = {};
let syndromeMap = {}; // id -> syndrome 的快速查找

// DOM 載入完成後執行
document.addEventListener('DOMContentLoaded', async () => {
  await loadZhenghouIndex();
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

    // 建立快速查找表
    buildSyndromeMap();

    // 更新統計數字
    const totalSyndromes = zhenghouIndex.total_syndromes;
    const totalCategories = zhenghouIndex.categories.length;
    document.getElementById('stats-text').textContent =
      `共收錄 ${totalCategories} 大類、${totalSyndromes} 個證候`;

    // 渲染各區塊
    renderEvolutionGroups();
    renderComparisonPairs();
    renderCategories();
  } catch (error) {
    console.error('載入證候索引失敗:', error);
    document.getElementById('zhenghou-categories').innerHTML = `
      <div class="no-results">載入證候資料失敗，請稍後再試。</div>
    `;
  }
}

/**
 * 建立證候快速查找表
 */
function buildSyndromeMap() {
  syndromeMap = {};
  zhenghouIndex.categories.forEach(category => {
    category.syndromes.forEach(syndrome => {
      syndromeMap[syndrome.id] = {
        ...syndrome,
        category: category.name
      };
    });
  });
}

/**
 * 渲染證候演變圖譜
 */
function renderEvolutionGroups() {
  const container = document.getElementById('evolution-groups');
  if (!zhenghouIndex?.syndrome_evolution_groups?.groups) {
    container.innerHTML = '<div class="no-results">暫無資料</div>';
    return;
  }

  let html = '';
  zhenghouIndex.syndrome_evolution_groups.groups.forEach(group => {
    html += `
      <div class="evolution-group">
        <div class="evolution-group-header">
          <h3 class="evolution-group-name">${group.name}</h3>
          <span class="evolution-group-desc">${group.description}</span>
        </div>
        <div class="evolution-chains">
    `;

    group.evolution_chains.forEach(chain => {
      html += `
        <div class="evolution-chain">
          <div class="chain-title">${chain.name}</div>
          <div class="chain-flow">
      `;

      chain.syndromes.forEach((syndromeId, idx) => {
        const syndrome = syndromeMap[syndromeId];
        if (syndrome) {
          html += `
            <div class="chain-item" data-id="${syndromeId}" onclick="showZhenghouDetail('${syndromeId}')">
              <span class="chain-number">${syndrome.number}</span>
              <span class="chain-name">${syndrome.name}</span>
            </div>
          `;
          if (idx < chain.syndromes.length - 1) {
            html += `<span class="chain-arrow">→</span>`;
          }
        }
      });

      html += `
          </div>
          <div class="chain-description">${chain.description}</div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * 渲染類證對照
 */
function renderComparisonPairs() {
  const container = document.getElementById('comparison-pairs');
  if (!zhenghouIndex?.syndrome_comparison_pairs?.pairs) {
    container.innerHTML = '<div class="no-results">暫無資料</div>';
    return;
  }

  let html = '';
  zhenghouIndex.syndrome_comparison_pairs.pairs.forEach(pair => {
    const syndrome1 = syndromeMap[pair.syndromes[0]];
    const syndrome2 = syndromeMap[pair.syndromes[1]];

    if (syndrome1 && syndrome2) {
      const relationshipClass = pair.relationship === '對立' ? 'opposite' :
                                pair.relationship === '遞進' ? 'progressive' : 'related';

      html += `
        <div class="comparison-pair ${relationshipClass}">
          <div class="pair-syndrome" data-id="${syndrome1.id}" onclick="showZhenghouDetail('${syndrome1.id}')">
            <span class="pair-number">${syndrome1.number}</span>
            <span class="pair-name">${syndrome1.name}</span>
          </div>
          <div class="pair-relation">
            <span class="relation-type">${pair.relationship}</span>
            <span class="relation-key">${pair.comparison_key}</span>
          </div>
          <div class="pair-syndrome" data-id="${syndrome2.id}" onclick="showZhenghouDetail('${syndrome2.id}')">
            <span class="pair-number">${syndrome2.number}</span>
            <span class="pair-name">${syndrome2.name}</span>
          </div>
          <div class="pair-description">${pair.description}</div>
        </div>
      `;
    }
  });

  container.innerHTML = html;
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

  zhenghouIndex.categories.forEach((category) => {
    html += `
      <div class="category-section">
        <div class="category-header">
          <h3 class="category-name">${category.id}、${category.name}</h3>
          <span class="category-count">${category.syndrome_count} 個證候</span>
        </div>
        <div class="syndrome-grid">
    `;

    category.syndromes.forEach(syndrome => {
      html += `
        <div class="syndrome-card" data-id="${syndrome.id}" onclick="showZhenghouDetail('${syndrome.id}')">
          <span class="syndrome-number">${syndrome.number}</span>
          <span class="syndrome-name">${syndrome.name}</span>
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
  document.getElementById('modal-category').textContent = data.category || '';
  document.getElementById('modal-number').textContent = `#${data.number}`;

  // 建構詳情內容
  const modalBody = document.getElementById('modal-body');
  modalBody.innerHTML = buildDetailContent(data);

  // 顯示彈窗
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

/**
 * 建構證候詳情內容
 */
function buildDetailContent(data) {
  let html = '';

  // 定義/概述
  if (data.overview) {
    html += `
      <section class="detail-section">
        <h3 class="section-heading">定義</h3>
        <div class="section-content overview-content">
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
        <div class="section-content clinical-content">
          ${formatClinicalManifestations(data.clinical_manifestations)}
        </div>
      </section>
    `;
  }

  // 本證辨析
  if (data.differential && data.differential.self_analysis) {
    html += `
      <section class="detail-section">
        <h3 class="section-heading">本證辨析</h3>
        <div class="section-content analysis-content">
          ${formatParagraphs(data.differential.self_analysis)}
        </div>
      </section>
    `;
  }

  // 類證鑑別
  if (data.differential && data.differential.type_comparison) {
    html += `
      <section class="detail-section">
        <h3 class="section-heading">類證鑑別</h3>
        <div class="section-content comparison-content">
          ${formatTypeComparison(data.differential.type_comparison)}
        </div>
      </section>
    `;
  }

  // 文獻選錄
  if (data.literature) {
    html += `
      <section class="detail-section">
        <h3 class="section-heading">文獻選錄</h3>
        <div class="section-content literature-content">
          ${formatLiterature(data.literature)}
        </div>
      </section>
    `;
  }

  return html;
}

/**
 * 格式化段落文字
 */
function formatParagraphs(text) {
  if (!text) return '';

  // 分割段落並處理
  const paragraphs = text.split('\n').filter(p => p.trim());

  return paragraphs.map(p => {
    // 高亮引號內容和書名
    let formatted = p
      .replace(/「([^」]+)」/g, '<span class="highlight-quote">「$1」</span>')
      .replace(/《([^》]+)》/g, '<cite class="book-title">《$1》</cite>')
      .replace(/\(《([^》]+)》\)/g, '(<cite class="book-title">《$1》</cite>)');

    return `<p>${formatted}</p>`;
  }).join('');
}

/**
 * 格式化臨床表現
 */
function formatClinicalManifestations(text) {
  if (!text) return '';

  // 分析是否包含症狀列表特徵
  const symptoms = text.split(/[，、；]/);

  if (symptoms.length > 3) {
    // 以標籤形式展示
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
 * 格式化類證鑑別
 */
function formatTypeComparison(text) {
  if (!text) return '';

  // 嘗試按證候名稱分割（如「陽虛證與氣虛證」）
  const sections = text.split(/\n(?=[^\s]+證與[^\s]+證)/);

  return sections.map(section => {
    const lines = section.split('\n').filter(l => l.trim());
    if (lines.length === 0) return '';

    // 第一行可能是標題
    const firstLine = lines[0];
    const match = firstLine.match(/^([^\s]+證與[^\s]+證)/);

    if (match) {
      const title = match[1];
      const content = [firstLine.replace(title, '').trim(), ...lines.slice(1)].filter(l => l).join('\n');
      return `
        <div class="comparison-item">
          <h4 class="comparison-title">${title}</h4>
          <div class="comparison-content">${formatParagraphs(content)}</div>
        </div>
      `;
    }

    return `<div class="comparison-item">${formatParagraphs(section)}</div>`;
  }).join('');
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
    const match = citation.match(/^《([^》]+)》[·：:「]?\s*(.+)/);
    if (match) {
      const source = match[1];
      let quote = match[2];

      // 處理引號
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
    let html = '<div class="search-results-grid">';
    results.forEach(syndrome => {
      html += `
        <div class="syndrome-card search-result" onclick="showZhenghouDetail('${syndrome.id}')">
          <span class="syndrome-number">${syndrome.number}</span>
          <span class="syndrome-name">${syndrome.name}</span>
          <span class="syndrome-category">${syndrome.category}</span>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  container.classList.remove('hidden');
}

/**
 * 隱藏搜尋結果
 */
function hideSearchResults() {
  const container = document.getElementById('search-results');
  container.classList.add('hidden');
}

/**
 * 按病位篩選
 */
function filterByLocation(location) {
  if (!zhenghouIndex?.search_indexes?.by_location) return [];

  const syndromeIds = zhenghouIndex.search_indexes.by_location[location] || [];
  return syndromeIds.map(id => syndromeMap[id]).filter(s => s);
}

/**
 * 按病性篩選
 */
function filterByNature(nature) {
  if (!zhenghouIndex?.search_indexes?.by_nature) return [];

  const byNature = zhenghouIndex.search_indexes.by_nature;
  let syndromeIds = [];

  // 檢查虛證子類
  if (byNature.虛 && byNature.虛[nature]) {
    syndromeIds = byNature.虛[nature];
  }
  // 檢查實證子類
  else if (byNature.實 && byNature.實[nature]) {
    syndromeIds = byNature.實[nature];
  }
  // 檢查直接分類（寒、熱、風、燥）
  else if (byNature[nature]) {
    syndromeIds = byNature[nature];
  }

  return syndromeIds.map(id => syndromeMap[id]).filter(s => s);
}

/**
 * 按輕重篩選
 */
function filterBySeverity(severity) {
  if (!zhenghouIndex?.search_indexes?.by_severity) return [];

  const syndromeIds = zhenghouIndex.search_indexes.by_severity[severity] || [];
  return syndromeIds.map(id => syndromeMap[id]).filter(s => s);
}

/**
 * 顯示篩選結果
 */
function showFilterResults(results, filterType, filterValue) {
  const container = document.getElementById('filter-results');
  const grid = document.getElementById('filter-results-grid');

  if (results.length === 0) {
    grid.innerHTML = '<div class="no-results">無匹配結果</div>';
  } else {
    let html = '';
    results.forEach(syndrome => {
      html += `
        <div class="syndrome-card filter-result" onclick="showZhenghouDetail('${syndrome.id}')">
          <span class="syndrome-number">${syndrome.number}</span>
          <span class="syndrome-name">${syndrome.name}</span>
          <span class="syndrome-category">${syndrome.category}</span>
        </div>
      `;
    });
    grid.innerHTML = html;
  }

  // 更新標題
  const title = container.querySelector('.filter-results-title');
  title.textContent = `篩選結果：${filterValue}（${results.length}個證候）`;

  container.classList.remove('hidden');
}

/**
 * 清除篩選
 */
function clearFilter() {
  // 移除所有 active 狀態
  document.querySelectorAll('.filter-pill.active').forEach(pill => {
    pill.classList.remove('active');
  });

  // 隱藏結果
  document.getElementById('filter-results').classList.add('hidden');
}

/**
 * 設置事件監聯器
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
      } else {
        hideSearchResults();
      }
    });

    // Enter 鍵搜尋
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const keyword = searchInput.value;
        if (keyword.trim()) {
          const results = searchZhenghou(keyword);
          showSearchResults(results);
        } else {
          hideSearchResults();
        }
      }
    });

    // 即時搜尋（輸入時）
    searchInput.addEventListener('input', (e) => {
      const keyword = e.target.value;
      if (keyword.trim().length >= 1) {
        const results = searchZhenghou(keyword);
        showSearchResults(results);
      } else {
        hideSearchResults();
      }
    });
  }

  // 篩選標籤頁切換
  const filterTabBtns = document.querySelectorAll('.filter-tab-btn');
  filterTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // 移除所有 active
      filterTabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.filter-content').forEach(c => c.classList.remove('active'));

      // 添加當前 active
      btn.classList.add('active');
      const tabId = btn.dataset.tab;
      document.getElementById(`filter-${tabId}`).classList.add('active');
    });
  });

  // 篩選藥丸點擊
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      // 切換 active 狀態
      const wasActive = pill.classList.contains('active');
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));

      if (wasActive) {
        clearFilter();
        return;
      }

      pill.classList.add('active');

      let results = [];
      let filterType = '';
      let filterValue = '';

      if (pill.dataset.location) {
        filterType = 'location';
        filterValue = pill.dataset.location;
        results = filterByLocation(filterValue);
      } else if (pill.dataset.nature) {
        filterType = 'nature';
        filterValue = pill.dataset.nature;
        results = filterByNature(filterValue);
      } else if (pill.dataset.severity) {
        filterType = 'severity';
        filterValue = pill.dataset.severity;
        results = filterBySeverity(filterValue);
      }

      showFilterResults(results, filterType, filterValue);
    });
  });

  // 清除篩選按鈕
  const clearFilterBtn = document.querySelector('.btn-clear-filter');
  if (clearFilterBtn) {
    clearFilterBtn.addEventListener('click', clearFilter);
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
