/**
 * 中醫藥查詢系統
 */

// 全域狀態
const state = {
  herbs: [],
  filters: {
    meridian: null,
    nature: null,
    search: ''
  }
};

// 中藥文件列表（需手動維護或從索引讀取）
const HERB_FILES = [
  'mahuang.json',
  'guizhi.json'
];

// 歸經選項
const MERIDIANS = ['肺', '心', '脾', '肝', '腎', '胃', '膀胱', '大腸', '小腸', '膽', '三焦', '心包'];

// 性味選項
const NATURES = ['寒', '涼', '平', '溫', '熱'];

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
  const effects = herb.effects || [];
  const indications = herb.indications || [];
  const cautions = herb.cautions || [];
  const alias = herb.alias || [];

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
      </div>
      <span class="expand-icon">▼</span>
      <div class="herb-details">
        ${alias.length ? `
          <div class="detail-row">
            <div class="detail-label">別名</div>
            <div class="detail-content">${alias.join('、')}</div>
          </div>
        ` : ''}
        ${effects.length ? `
          <div class="detail-row">
            <div class="detail-label">功效</div>
            <ul class="detail-list">
              ${effects.map(e => `<li>${e}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${indications.length ? `
          <div class="detail-row">
            <div class="detail-label">主治</div>
            <ul class="detail-list">
              ${indications.map(i => `<li>${i}</li>`).join('')}
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

  // 綁定歸經點擊事件
  meridianTags.querySelectorAll('.filter-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const meridian = tag.dataset.meridian;

      // 切換選中狀態
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

      // 切換選中狀態
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
    meridian: null,
    nature: null,
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
document.addEventListener('DOMContentLoaded', () => {
  initFilters();
  initSearch();
  loadHerbs();
});
