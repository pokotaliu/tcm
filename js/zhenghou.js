/**
 * 中醫證候資料庫 - 證候模組
 */

// 全域資料
let zhenghouIndex = null;
let zhenghouCache = {};

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

    // 更新統計數字
    const totalSyndromes = zhenghouIndex.total_syndromes;
    const totalCategories = zhenghouIndex.categories.length;
    document.getElementById('stats-text').textContent =
      `共收錄 ${totalCategories} 大類、${totalSyndromes} 個證候`;

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
          <h2 class="category-name">${category.id}、${category.name}</h2>
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
