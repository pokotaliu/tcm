/**
 * 中醫證候演變圖譜視覺化
 * 使用 D3.js 實現互動式力導向圖
 */

// 全域變數
let evolutionData = null;
let simulation = null;
let svg = null;
let g = null;
let zoom = null;
let currentLayout = 'force';
let showLabels = true;
let selectedChain = 'all';

// 顏色配置
const severityColors = {
  1: '#6b8e23', // 輕證 - 橄欖綠
  2: '#daa520', // 中證 - 金色
  3: '#cd853f', // 重證 - 棕色
  4: '#c41e3a'  // 危重 - 深紅
};

const relationColors = {
  '發展': '#8b7355',
  '惡化': '#cd853f',
  '危變': '#c41e3a'
};

const categoryColors = {
  '基礎證候': '#5d4e37',
  '臟腑證候': '#8b7355',
  '六經證候': '#6b8e23',
  '危重證候': '#c41e3a'
};

// 演變鏈分類
const chainCategories = {
  'qi': ['chain_qi_xu_zheng', 'chain_pi_qi_xu', 'chain_fei_qi_xu', 'chain_xin_qi_xu', 'chain_shen_qi_xu', 'qi_disease_chain'],
  'blood': ['chain_xue_xu', 'chain_xue_yu'],
  'yin_yang': ['chain_yin_xu', 'chain_yang_xu', 'chain_wang_yin'],
  'liu_jing': ['chain_tai_yang_zheng', 'chain_tai_yin_zheng', 'chain_shao_yang'],
  'weiqi': ['chain_wei_fen', 'chain_qi_fen']
};

// DOM 載入完成後執行
document.addEventListener('DOMContentLoaded', async () => {
  await loadEvolutionData();
  initVisualization();
  setupEventListeners();
});

/**
 * 載入演變圖資料
 */
async function loadEvolutionData() {
  try {
    const response = await fetch('data/indexes/evolution_graph.json');
    if (!response.ok) throw new Error('無法載入演變圖資料');
    evolutionData = await response.json();

    // 更新統計數字
    document.getElementById('stat-nodes').textContent = evolutionData.statistics.total_nodes;
    document.getElementById('stat-edges').textContent = evolutionData.statistics.total_edges;
    document.getElementById('stat-critical').textContent = evolutionData.statistics.critical_nodes;
    document.getElementById('stat-chains').textContent = evolutionData.statistics.evolution_chains;

    // 渲染演變鏈導航
    renderChainsNav();
  } catch (error) {
    console.error('載入演變圖資料失敗:', error);
    document.getElementById('evolution-map').innerHTML =
      '<div class="no-results">載入演變圖資料失敗，請稍後再試。</div>';
  }
}

/**
 * 渲染演變鏈快速導航
 */
function renderChainsNav() {
  const container = document.getElementById('chains-list');
  let html = '';

  evolutionData.evolution_chains.forEach(chain => {
    html += `
      <div class="chain-nav-item" data-chain-id="${chain.id}">
        <span class="chain-nav-name">${chain.name}</span>
        <span class="chain-nav-path">${chain.path.length} 個節點</span>
      </div>
    `;
  });

  container.innerHTML = html;

  // 添加點擊事件
  container.querySelectorAll('.chain-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const chainId = item.dataset.chainId;
      highlightChain(chainId);
    });
  });
}

/**
 * 初始化視覺化
 */
function initVisualization() {
  const container = document.getElementById('evolution-map');
  container.innerHTML = '';

  const width = container.clientWidth;
  const height = Math.max(600, window.innerHeight - 400);

  // 創建 SVG
  svg = d3.select('#evolution-map')
    .append('svg')
    .attr('width', '100%')
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height]);

  // 定義箭頭標記
  const defs = svg.append('defs');

  Object.entries(relationColors).forEach(([relation, color]) => {
    defs.append('marker')
      .attr('id', `arrow-${relation}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', color)
      .attr('d', 'M0,-5L10,0L0,5');
  });

  // 創建縮放群組
  g = svg.append('g');

  // 設置縮放行為
  zoom = d3.zoom()
    .scaleExtent([0.3, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(zoom);

  // 根據佈局渲染
  renderGraph();
}

/**
 * 渲染圖形
 */
function renderGraph() {
  const width = svg.node().getBoundingClientRect().width;
  const height = svg.node().getBoundingClientRect().height;

  // 過濾數據
  let nodes = [...evolutionData.nodes];
  let edges = [...evolutionData.edges];

  if (selectedChain !== 'all') {
    const chainIds = chainCategories[selectedChain] || [];
    const chainPaths = evolutionData.evolution_chains
      .filter(c => chainIds.includes(c.id))
      .flatMap(c => c.path);

    if (chainPaths.length > 0) {
      const nodeIds = new Set(chainPaths);
      nodes = nodes.filter(n => nodeIds.has(n.id));
      edges = edges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));
    }
  }

  // 建立節點索引
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // 清除舊圖形
  g.selectAll('*').remove();

  // 創建連結
  const links = edges.map(e => ({
    source: e.from,
    target: e.to,
    relation: e.relation,
    description: e.description
  })).filter(l => nodeMap.has(l.source) && nodeMap.has(l.target));

  // 創建力導向模擬
  simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(120))
    .force('charge', d3.forceManyBody().strength(-400))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(50));

  // 繪製連結線
  const link = g.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('class', d => `link relation-${d.relation}`)
    .attr('stroke', d => relationColors[d.relation] || '#999')
    .attr('stroke-width', 2)
    .attr('marker-end', d => `url(#arrow-${d.relation})`)
    .attr('opacity', 0.7);

  // 繪製節點群組
  const node = g.append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .attr('class', d => `node severity-${d.severity} ${d.is_critical ? 'critical' : ''}`)
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended));

  // 節點圓形
  node.append('circle')
    .attr('r', d => d.is_critical ? 28 : 22)
    .attr('fill', d => severityColors[d.severity] || '#999')
    .attr('stroke', d => d.is_critical ? '#c41e3a' : '#fff')
    .attr('stroke-width', d => d.is_critical ? 3 : 2);

  // 節點標籤
  node.append('text')
    .attr('class', 'node-label')
    .attr('dy', 4)
    .attr('text-anchor', 'middle')
    .attr('fill', '#fff')
    .attr('font-size', '11px')
    .attr('font-weight', 500)
    .text(d => d.name.length > 4 ? d.name.slice(0, 4) : d.name);

  // 外部標籤（完整名稱）
  if (showLabels) {
    node.append('text')
      .attr('class', 'node-label-outer')
      .attr('dy', -30)
      .attr('text-anchor', 'middle')
      .attr('fill', '#5d4e37')
      .attr('font-size', '12px')
      .text(d => d.name);
  }

  // 節點懸停提示
  node.append('title')
    .text(d => `${d.name}\n類別: ${d.category}\n嚴重程度: ${getSeverityText(d.severity)}`);

  // 節點點擊事件
  node.on('click', (event, d) => {
    event.stopPropagation();
    showNodeDetail(d);
  });

  // 模擬更新
  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    node.attr('transform', d => `translate(${d.x},${d.y})`);
  });

  // 點擊空白區域隱藏詳情
  svg.on('click', () => {
    hideNodeDetail();
  });
}

/**
 * 獲取嚴重程度文字
 */
function getSeverityText(severity) {
  const texts = {
    1: '輕證',
    2: '中證',
    3: '重證',
    4: '危重證'
  };
  return texts[severity] || '未知';
}

/**
 * 顯示節點詳情
 */
function showNodeDetail(node) {
  const panel = document.getElementById('node-detail');

  document.getElementById('detail-name').textContent = node.name;
  document.getElementById('detail-category').textContent = node.category;
  document.getElementById('detail-severity').textContent = getSeverityText(node.severity);

  // 查找演變關係
  const evolveTo = evolutionData.edges
    .filter(e => e.from === node.id)
    .map(e => {
      const targetNode = evolutionData.nodes.find(n => n.id === e.to);
      return targetNode ? targetNode.name : e.to;
    });

  const evolveFrom = evolutionData.edges
    .filter(e => e.to === node.id)
    .map(e => {
      const sourceNode = evolutionData.nodes.find(n => n.id === e.from);
      return sourceNode ? sourceNode.name : e.from;
    });

  document.getElementById('detail-evolve-to').innerHTML =
    evolveTo.length > 0
      ? evolveTo.map(n => `<span class="detail-tag">${n}</span>`).join('')
      : '<span class="no-data">無</span>';

  document.getElementById('detail-evolve-from').innerHTML =
    evolveFrom.length > 0
      ? evolveFrom.map(n => `<span class="detail-tag">${n}</span>`).join('')
      : '<span class="no-data">無</span>';

  panel.classList.remove('hidden');

  // 高亮節點
  g.selectAll('.node').classed('dimmed', true);
  g.selectAll('.link').classed('dimmed', true);

  g.selectAll('.node').filter(d => d.id === node.id).classed('dimmed', false).classed('highlighted', true);

  // 高亮相關連結和節點
  const relatedIds = new Set([node.id]);
  evolutionData.edges.forEach(e => {
    if (e.from === node.id) relatedIds.add(e.to);
    if (e.to === node.id) relatedIds.add(e.from);
  });

  g.selectAll('.node').filter(d => relatedIds.has(d.id)).classed('dimmed', false);
  g.selectAll('.link').filter(d => d.source.id === node.id || d.target.id === node.id).classed('dimmed', false);
}

/**
 * 隱藏節點詳情
 */
function hideNodeDetail() {
  document.getElementById('node-detail').classList.add('hidden');
  g.selectAll('.node').classed('dimmed', false).classed('highlighted', false);
  g.selectAll('.link').classed('dimmed', false);
}

/**
 * 高亮演變鏈
 */
function highlightChain(chainId) {
  const chain = evolutionData.evolution_chains.find(c => c.id === chainId);
  if (!chain) return;

  const pathIds = new Set(chain.path);

  g.selectAll('.node').classed('dimmed', d => !pathIds.has(d.id));
  g.selectAll('.link').classed('dimmed', d => !pathIds.has(d.source.id) || !pathIds.has(d.target.id));

  // 聚焦到演變鏈
  const chainNodes = evolutionData.nodes.filter(n => pathIds.has(n.id));
  if (chainNodes.length > 0) {
    const xs = chainNodes.map(n => n.x || 0);
    const ys = chainNodes.map(n => n.y || 0);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

    svg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity.translate(
        svg.node().getBoundingClientRect().width / 2 - centerX,
        svg.node().getBoundingClientRect().height / 2 - centerY
      )
    );
  }
}

/**
 * 拖拽開始
 */
function dragstarted(event, d) {
  if (!event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

/**
 * 拖拽中
 */
function dragged(event, d) {
  d.fx = event.x;
  d.fy = event.y;
}

/**
 * 拖拽結束
 */
function dragended(event, d) {
  if (!event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

/**
 * 設置事件監聽器
 */
function setupEventListeners() {
  // 演變鏈選擇
  document.getElementById('chain-select').addEventListener('change', (e) => {
    selectedChain = e.target.value;
    renderGraph();
  });

  // 佈局按鈕
  document.querySelectorAll('.layout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLayout = btn.dataset.layout;
      applyLayout();
    });
  });

  // 重置視圖
  document.getElementById('reset-view').addEventListener('click', () => {
    svg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity
    );
    g.selectAll('.node').classed('dimmed', false).classed('highlighted', false);
    g.selectAll('.link').classed('dimmed', false);
    hideNodeDetail();
  });

  // 切換標籤
  document.getElementById('toggle-labels').addEventListener('click', (e) => {
    showLabels = !showLabels;
    e.target.textContent = showLabels ? '隱藏標籤' : '顯示標籤';
    g.selectAll('.node-label-outer').style('display', showLabels ? 'block' : 'none');
  });

  // 關閉詳情面板
  document.getElementById('close-detail').addEventListener('click', hideNodeDetail);

  // 視窗大小變化
  window.addEventListener('resize', () => {
    if (svg) {
      const container = document.getElementById('evolution-map');
      const height = Math.max(600, window.innerHeight - 400);
      svg.attr('height', height);
    }
  });
}

/**
 * 應用佈局
 */
function applyLayout() {
  const width = svg.node().getBoundingClientRect().width;
  const height = svg.node().getBoundingClientRect().height;

  if (simulation) simulation.stop();

  switch (currentLayout) {
    case 'hierarchical':
      applyHierarchicalLayout(width, height);
      break;
    case 'radial':
      applyRadialLayout(width, height);
      break;
    default:
      // 重新啟動力導向模擬
      simulation.alpha(1).restart();
  }
}

/**
 * 層級佈局
 */
function applyHierarchicalLayout(width, height) {
  const nodes = evolutionData.nodes;

  // 按嚴重程度分層
  const levels = {};
  nodes.forEach(n => {
    if (!levels[n.severity]) levels[n.severity] = [];
    levels[n.severity].push(n);
  });

  const levelCount = Object.keys(levels).length;
  const levelHeight = height / (levelCount + 1);

  Object.entries(levels).forEach(([severity, levelNodes]) => {
    const y = parseInt(severity) * levelHeight;
    const nodeWidth = width / (levelNodes.length + 1);

    levelNodes.forEach((node, i) => {
      node.fx = (i + 1) * nodeWidth;
      node.fy = y;
    });
  });

  simulation.alpha(0.5).restart();

  setTimeout(() => {
    nodes.forEach(n => {
      n.fx = null;
      n.fy = null;
    });
  }, 2000);
}

/**
 * 放射佈局
 */
function applyRadialLayout(width, height) {
  const nodes = evolutionData.nodes;
  const centerX = width / 2;
  const centerY = height / 2;

  // 按嚴重程度分環
  const levels = {};
  nodes.forEach(n => {
    if (!levels[n.severity]) levels[n.severity] = [];
    levels[n.severity].push(n);
  });

  Object.entries(levels).forEach(([severity, levelNodes]) => {
    const radius = parseInt(severity) * 120;
    const angleStep = (2 * Math.PI) / levelNodes.length;

    levelNodes.forEach((node, i) => {
      const angle = i * angleStep - Math.PI / 2;
      node.fx = centerX + radius * Math.cos(angle);
      node.fy = centerY + radius * Math.sin(angle);
    });
  });

  simulation.alpha(0.5).restart();

  setTimeout(() => {
    nodes.forEach(n => {
      n.fx = null;
      n.fy = null;
    });
  }, 2000);
}
