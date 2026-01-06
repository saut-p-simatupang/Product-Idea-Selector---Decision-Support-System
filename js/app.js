// ------------------ INITIALIZATION ------------------
let products = JSON.parse(localStorage.getItem("pdss_products")) || [];
let currentChart = null;
let chartType = 'bar'; // 'bar', 'radar', 'pie'

// DOM Elements
const form = document.getElementById("productForm");
const tableBody = document.querySelector("#productTable tbody");
const rankingList = document.getElementById("rankingList");
const feedback = document.getElementById("formFeedback");
const weightFeedback = document.getElementById("weightFeedback");

// Weight inputs
const wDemand = document.getElementById("wDemand");
const wCompetition = document.getElementById("wCompetition");
const wProfit = document.getElementById("wProfit");
const wCapital = document.getElementById("wCapital");
const wProductionTime = document.getElementById("wProductionTime");
const wRisk = document.getElementById("wRisk");

// Buttons
const analyzeBtn = document.getElementById("analyzeBtn");
const resetBtn = document.getElementById("resetBtn");
const exportBtn = document.getElementById("exportBtn");
const autoWeightBtn = document.getElementById("autoWeightBtn");
const chartTypeBtn = document.getElementById("chartTypeBtn");

// Insight boxes
const insightBox = document.getElementById("insightBox");
const actionBox = document.getElementById("actionBox");

// Dashboard elements
const bestProductStat = document.querySelector("#bestProductStat .stat-value");
const averageScoreElement = document.getElementById("averageScore");
const scoreDistributionElement = document.getElementById("scoreDistribution");
const lastAnalysisElement = document.getElementById("lastAnalysis");

// Sensitivity results
const sensitivityResults = document.getElementById("sensitivityResults");

// ------------------ UTILITY FUNCTIONS ------------------
function saveSession() {
  localStorage.setItem("pdss_products", JSON.stringify(products));
}

function updateLastAnalysisTime() {
  const now = new Date();
  lastAnalysisElement.textContent = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function calculateTotalWeight() {
  const weights = [
    parseFloat(wDemand.value) || 0,
    parseFloat(wCompetition.value) || 0,
    parseFloat(wProfit.value) || 0,
    parseFloat(wCapital.value) || 0,
    parseFloat(wProductionTime.value) || 0,
    parseFloat(wRisk.value) || 0
  ];
  
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  document.getElementById("totalWeight").textContent = total.toFixed(0);
  
  return { total, weights };
}

function validateWeights() {
  const { total } = calculateTotalWeight();
  
  if (total !== 100) {
    weightFeedback.textContent = `Total bobot harus 100% (Sekarang: ${total}%)`;
    weightFeedback.className = "feedback error";
    return false;
  }
  
  weightFeedback.textContent = "✓ Bobot valid";
  weightFeedback.className = "feedback success";
  return true;
}

// ------------------ PRODUCT TABLE ------------------
function renderTable() {
  tableBody.innerHTML = "";
  
  products.forEach((p, index) => {
    const row = document.createElement("tr");
    
    // Determine score color
    let scoreColor = "";
    if (p.score >= 0.7) scoreColor = "score-high";
    else if (p.score >= 0.5) scoreColor = "score-medium";
    else scoreColor = "score-low";
    
    row.innerHTML = `
      <td>${p.name}</td>
      <td>${p.demand}</td>
      <td>${p.competition}</td>
      <td>${p.profit}</td>
      <td>${p.capital}</td>
      <td>${p.productionTime}</td>
      <td>${p.risk}</td>
      <td class="score-cell ${scoreColor}">
        ${p.score ? p.score.toFixed(2) : "-"}
      </td>
      <td>
        <button class="btn-delete" data-index="${index}" title="Hapus">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    
    tableBody.appendChild(row);
  });
  
  // Add delete event listeners
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.dataset.index);
      deleteProduct(index);
    });
  });
}

function deleteProduct(index) {
  if (confirm(`Hapus produk "${products[index].name}"?`)) {
    products.splice(index, 1);
    saveSession();
    renderTable();
    feedback.textContent = "Produk berhasil dihapus.";
    feedback.className = "feedback success";
  }
}

// ------------------ SCORE CALCULATION ------------------
function calculateScore() {
  if (!validateWeights()) return false;
  
  const { weights } = calculateTotalWeight();
  const [wd, wc, wp, wcap, wtime, wr] = weights.map(w => w / 100);
  
  products.forEach(p => {
    // Normalize values (all are 1-100 scale)
    const normDemand = p.demand / 100;           // benefit
    const normCompetition = (100 - p.competition) / 100; // cost → inverted
    const normProfit = p.profit / 100;           // benefit
    const normCapital = (100 - p.capital) / 100; // cost → inverted
    const normProductionTime = (100 - p.productionTime) / 100; // cost → inverted
    const normRisk = (100 - p.risk) / 100;       // cost → inverted
    
    // Calculate weighted score
    p.score = 
      normDemand * wd +
      normCompetition * wc +
      normProfit * wp +
      normCapital * wcap +
      normProductionTime * wtime +
      normRisk * wr;
    
    // Ensure score is between 0-1
    p.score = Math.max(0, Math.min(1, p.score));
  });
  
  return true;
}

// ------------------ RANKING ------------------
function renderRanking() {
  rankingList.innerHTML = "";
  
  if (products.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Belum ada data produk";
    li.className = "muted";
    rankingList.appendChild(li);
    return null;
  }
  
  const sorted = [...products].sort((a, b) => b.score - a.score);
  const topProduct = sorted[0];
  
  sorted.forEach((p, i) => {
    const li = document.createElement("li");
    
    // Determine ranking badge
    let badge = "";
    if (i === 0) badge = "🥇";
    else if (i === 1) badge = "🥈";
    else if (i === 2) badge = "🥉";
    
    li.innerHTML = `
      <span class="rank-badge">${badge}</span>
      <span class="rank-name">${p.name}</span>
      <span class="rank-score">${p.score.toFixed(2)}</span>
    `;
    
    rankingList.appendChild(li);
  });
  
  return topProduct;
}

// ------------------ VISUALIZATION ------------------
function renderChart() {
  const ctx = document.getElementById('comparisonChart').getContext('2d');
  
  // Destroy previous chart if exists
  if (currentChart) {
    currentChart.destroy();
  }
  
  if (products.length === 0) {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#999";
    ctx.textAlign = "center";
    ctx.fillText("Tidak ada data untuk ditampilkan", 250, 150);
    return;
  }
  
  const sortedProducts = [...products].sort((a, b) => b.score - a.score).slice(0, 5);
  
  const data = {
    labels: sortedProducts.map(p => p.name),
    datasets: [
      {
        label: 'Skor Total',
        data: sortedProducts.map(p => p.score * 100),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      },
      {
        label: 'Minat',
        data: sortedProducts.map(p => p.demand),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }
    ]
  };
  
  const config = {
    type: chartType,
    data: data,
    options: {
      responsive: true,
      scales: chartType === 'bar' ? {
        y: {
          beginAtZero: true,
          max: 100
        }
      } : {},
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Perbandingan 5 Produk Terbaik'
        }
      }
    }
  };
  
  currentChart = new Chart(ctx, config);
}

// ------------------ SENSITIVITY ANALYSIS ------------------
function runSensitivityAnalysis(scenario) {
  const scenarios = {
    optimis: { name: "Optimis", weights: [40, 10, 30, 10, 5, 5] },
    pesimis: { name: "Pesimis", weights: [20, 30, 20, 15, 10, 5] },
    balanced: { name: "Seimbang", weights: [25, 20, 25, 10, 10, 10] },
    lowRisk: { name: "Minim Risiko", weights: [20, 15, 20, 10, 10, 25] }
  };
  
  const selected = scenarios[scenario];
  const [wd, wc, wp, wcap, wtime, wr] = selected.weights.map(w => w / 100);
  
  // Calculate scores with scenario weights
  const scenarioProducts = JSON.parse(JSON.stringify(products));
  scenarioProducts.forEach(p => {
    const normDemand = p.demand / 100;
    const normCompetition = (100 - p.competition) / 100;
    const normProfit = p.profit / 100;
    const normCapital = (100 - p.capital) / 100;
    const normProductionTime = (100 - p.productionTime) / 100;
    const normRisk = (100 - p.risk) / 100;
    
    p.scenarioScore = 
      normDemand * wd +
      normCompetition * wc +
      normProfit * wp +
      normCapital * wcap +
      normProductionTime * wtime +
      normRisk * wr;
  });
  
  // Sort by scenario score
  const sorted = [...scenarioProducts].sort((a, b) => b.scenarioScore - a.scenarioScore);
  const top3 = sorted.slice(0, 3);
  
  // Display results
  let html = `
    <div class="scenario-result">
      <h3>Skenario ${selected.name}</h3>
      <p>Bobot: Minat(${selected.weights[0]}%), Pesaing(${selected.weights[1]}%), 
         Untung(${selected.weights[2]}%), Modal(${selected.weights[3]}%), 
         Waktu(${selected.weights[4]}%), Risiko(${selected.weights[5]}%)</p>
      <ol>
  `;
  
  top3.forEach((p, i) => {
    html += `
      <li>
        <strong>${p.name}</strong> - Skor: ${p.scenarioScore.toFixed(2)}
        ${i === 0 ? ' 🏆' : ''}
      </li>
    `;
  });
  
  html += `</ol></div>`;
  sensitivityResults.innerHTML = html;
}

// ------------------ INSIGHT GENERATION ------------------
function generateInsight(bestProduct) {
  if (!bestProduct) return;
  
  let insight = "";
  let status = "";
  
  if (bestProduct.score >= 0.8) {
    status = "🟢 SIAP DICOBA - Peluang sangat baik";
  } else if (bestProduct.score >= 0.6) {
    status = "🟡 POTENSIAL - Perlu validasi lebih lanjut";
  } else if (bestProduct.score >= 0.4) {
    status = "🟡 HATI-HATI - Risiko sedang, evaluasi lebih lanjut";
  } else {
    status = "🔴 RISIKO TINGGI - Pertimbangkan alternatif lain";
  }
  
  // Generate specific insights based on criteria
  const insights = [];
  
  if (bestProduct.demand >= 80) {
    insights.push("✅ Minat pasar sangat tinggi");
  } else if (bestProduct.demand >= 60) {
    insights.push("👍 Minat pasar cukup baik");
  } else {
    insights.push("⚠️ Minat pasar perlu ditingkatkan");
  }
  
  if (bestProduct.competition <= 30) {
    insights.push("✅ Persaingan rendah, peluang baik");
  } else if (bestProduct.competition <= 60) {
    insights.push("⚠️ Persaingan sedang, perlu diferensiasi");
  } else {
    insights.push("❌ Persaingan ketat, strategi khusus dibutuhkan");
  }
  
  if (bestProduct.capital <= 30) {
    insights.push("✅ Modal rendah, cocok untuk pemula");
  } else if (bestProduct.capital <= 60) {
    insights.push("⚠️ Modal sedang, butuh perencanaan keuangan");
  } else {
    insights.push("❌ Modal tinggi, pertimbangkan alternatif pendanaan");
  }
  
  if (bestProduct.risk <= 30) {
    insights.push("✅ Risiko rendah, aman untuk dijalankan");
  } else if (bestProduct.risk <= 60) {
    insights.push("⚠️ Risiko sedang, perlu mitigasi");
  } else {
    insights.push("❌ Risiko tinggi, butuh strategi khusus");
  }
  
  insightBox.innerHTML = `
    <div class="product-header">
      <h3>${bestProduct.name}</h3>
      <span class="status-badge">${status}</span>
    </div>
    <div class="product-score">
      <strong>Skor Total:</strong> ${bestProduct.score.toFixed(2)}/1.0
    </div>
    <div class="insight-list">
      ${insights.map(i => `<p>${i}</p>`).join('')}
    </div>
  `;
}

// ------------------ ACTION RECOMMENDATIONS ------------------
function generateAction(bestProduct) {
  if (!bestProduct) return;
  
  let actions = [];
  
  // General actions based on score
  if (bestProduct.score >= 0.8) {
    actions.push("🚀 Mulai eksekusi dengan skala kecil");
    actions.push("📊 Lakukan survei pasar untuk validasi");
    actions.push("💰 Siapkan rencana keuangan 3 bulan pertama");
  } else if (bestProduct.score >= 0.6) {
    actions.push("🔍 Lakukan riset mendalam tentang kompetitor");
    actions.push("👥 Cari mitra atau investor");
    actions.push("📝 Buat prototype atau MVP");
  } else {
    actions.push("⏸️ Tunda eksekusi, evaluasi ulang konsep");
    actions.push("💡 Cari ide alternatif atau modifikasi produk");
    actions.push("🤝 Konsultasi dengan mentor bisnis");
  }
  
  // Specific actions based on criteria
  if (bestProduct.competition >= 70) {
    actions.push("🎯 Fokus pada diferensiasi produk");
    actions.push("📈 Kembangkan Unique Selling Proposition (USP)");
  }
  
  if (bestProduct.capital >= 70) {
    actions.push("💳 Pertimbangkan pendanaan eksternal");
    actions.push("📋 Buat proposal bisnis untuk investor");
  }
  
  if (bestProduct.risk >= 70) {
    actions.push("🛡️ Buat rencana mitigasi risiko");
    actions.push("📑 Pertimbangkan asuransi bisnis");
  }
  
  actionBox.innerHTML = `
    <h3>Langkah-Langkah yang Direkomendasikan:</h3>
    <ol class="action-list">
      ${actions.map((action, i) => `<li>${action}</li>`).join('')}
    </ol>
    <div class="timeline-note">
      <small><i class="fa-solid fa-clock"></i> Estimasi waktu: 2-4 minggu untuk persiapan</small>
    </div>
  `;
}

// ------------------ DASHBOARD UPDATE ------------------
function updateDashboard() {
  if (products.length === 0) {
    bestProductStat.textContent = "-";
    bestProductStat.nextElementSibling.textContent = "Skor: -";
    averageScoreElement.textContent = "-";
    scoreDistributionElement.textContent = "-";
    return;
  }
  
  // Best product
  const bestProduct = [...products].sort((a, b) => b.score - a.score)[0];
  bestProductStat.textContent = bestProduct.name;
  bestProductStat.nextElementSibling.textContent = `Skor: ${bestProduct.score.toFixed(2)}`;
  
  // Average score
  const totalScore = products.reduce((sum, p) => sum + (p.score || 0), 0);
  const averageScore = totalScore / products.length;
  averageScoreElement.textContent = averageScore.toFixed(2);
  
  // Score distribution
  const high = products.filter(p => p.score >= 0.7).length;
  const medium = products.filter(p => p.score >= 0.5 && p.score < 0.7).length;
  const low = products.filter(p => p.score < 0.5).length;
  
  scoreDistributionElement.textContent = `${high}/${medium}/${low}`;
}

// ------------------ EXPORT FUNCTION ------------------
function exportToCSV() {
  if (products.length === 0) {
    alert("Tidak ada data untuk diekspor");
    return;
  }
  
  const headers = ["Nama Produk", "Minat", "Pesaing", "Untung", "Modal", "Waktu Produksi", "Risiko", "Skor", "Rekomendasi"];
  
  const rows = products.map(p => [
    p.name,
    p.demand,
    p.competition,
    p.profit,
    p.capital,
    p.productionTime,
    p.risk,
    p.score ? p.score.toFixed(2) : "-",
    p.score >= 0.7 ? "Direkomendasikan" : 
    p.score >= 0.5 ? "Pertimbangkan" : "Evaluasi Ulang"
  ]);
  
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");
  
  // Create and trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `analisis-produk_${new Date().toISOString().slice(0,10)}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ------------------ AUTO WEIGHT ------------------
function autoWeightByIndustry() {
  // Simple heuristic: give more weight to criteria with better average scores
  if (products.length === 0) {
    alert("Tambahkan produk terlebih dahulu untuk menggunakan fitur ini");
    return;
  }
  
  // Calculate averages
  const averages = {
    demand: products.reduce((sum, p) => sum + p.demand, 0) / products.length,
    competition: products.reduce((sum, p) => sum + p.competition, 0) / products.length,
    profit: products.reduce((sum, p) => sum + p.profit, 0) / products.length,
    capital: products.reduce((sum, p) => sum + p.capital, 0) / products.length,
    productionTime: products.reduce((sum, p) => sum + p.productionTime, 0) / products.length,
    risk: products.reduce((sum, p) => sum + p.risk, 0) / products.length
  };
  
  // Normalize and convert to weights (higher average = higher weight for benefit criteria)
  // For cost criteria (competition, capital, productionTime, risk), we want lower = better
  const normalized = {
    demand: averages.demand / 100, // benefit
    competition: (100 - averages.competition) / 100, // cost inverted
    profit: averages.profit / 100, // benefit
    capital: (100 - averages.capital) / 100, // cost inverted
    productionTime: (100 - averages.productionTime) / 100, // cost inverted
    risk: (100 - averages.risk) / 100 // cost inverted
  };
  
  // Convert to percentages
  const total = Object.values(normalized).reduce((sum, val) => sum + val, 0);
  const weights = {};
  
  for (const [key, value] of Object.entries(normalized)) {
    weights[key] = Math.round((value / total) * 100);
  }
  
  // Apply weights
  wDemand.value = weights.demand;
  wCompetition.value = weights.competition;
  wProfit.value = weights.profit;
  wCapital.value = weights.capital;
  wProductionTime.value = weights.productionTime;
  wRisk.value = weights.risk;
  
  validateWeights();
  feedback.textContent = "Bobot telah diatur otomatis berdasarkan data produk";
  feedback.className = "feedback success";
}

// ------------------ LOAD TEMPLATE ------------------
function loadTemplate() {
  const template = JSON.parse(localStorage.getItem('current_template'));
  
  if (template && template.weights) {
    wDemand.value = template.weights.demand || 25;
    wCompetition.value = template.weights.competition || 20;
    wProfit.value = template.weights.profit || 25;
    wCapital.value = template.weights.capital || 10;
    wProductionTime.value = template.weights.productionTime || 10;
    wRisk.value = template.weights.risk || 10;
    
    // Ensure total is 100
    validateWeights();
    
    if (template.name) {
      feedback.textContent = `Template "${template.name}" telah diterapkan`;
      feedback.className = "feedback success";
    }
  }
}

// ------------------ EVENT LISTENERS ------------------
// Form submission
form.addEventListener("submit", e => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const demand = parseFloat(document.getElementById("demand").value);
  const competition = parseFloat(document.getElementById("competition").value);
  const profit = parseFloat(document.getElementById("profit").value);
  const capital = parseFloat(document.getElementById("capital").value);
  const productionTime = parseFloat(document.getElementById("productionTime").value);
  const risk = parseFloat(document.getElementById("risk").value);

  // Validation
  if (!name) {
    feedback.textContent = "Nama produk harus diisi";
    feedback.className = "feedback error";
    return;
  }

  const values = [demand, competition, profit, capital, productionTime, risk];
  if (values.some(v => isNaN(v) || v < 1 || v > 100)) {
    feedback.textContent = "Semua nilai harus antara 1-100";
    feedback.className = "feedback error";
    return;
  }

  // Add product
  products.push({ 
    name, 
    demand, 
    competition, 
    profit, 
    capital, 
    productionTime, 
    risk, 
    score: 0 
  });
  
  saveSession();
  renderTable();
  updateDashboard();

  feedback.textContent = `Produk "${name}" berhasil ditambahkan`;
  feedback.className = "feedback success";
  form.reset();
});

// Analyze button
analyzeBtn.addEventListener("click", () => {
  if (products.length === 0) {
    alert("Belum ada data produk. Tambahkan produk terlebih dahulu.");
    return;
  }

  if (calculateScore()) {
    renderTable();
    const best = renderRanking();
    generateInsight(best);
    generateAction(best);
    renderChart();
    updateDashboard();
    updateLastAnalysisTime();
    
    feedback.textContent = "Analisis berhasil dilakukan!";
    feedback.className = "feedback success";
  }
});

// Reset button
resetBtn.addEventListener("click", () => {
  if (confirm("Yakin ingin menghapus semua data produk?")) {
    products = [];
    saveSession();
    renderTable();
    rankingList.innerHTML = "";
    insightBox.innerHTML = "<p class='muted'>Lakukan analisis untuk melihat insight.</p>";
    actionBox.innerHTML = "<p class='muted'>Rekomendasi akan muncul setelah analisis.</p>";
    updateDashboard();
    renderChart();
    
    feedback.textContent = "Semua data telah dihapus.";
    feedback.className = "feedback success";
  }
});

// Export button
exportBtn.addEventListener("click", exportToCSV);

// Auto weight button
autoWeightBtn.addEventListener("click", autoWeightByIndustry);

// Chart type toggle
chartTypeBtn.addEventListener("click", () => {
  const types = ['bar', 'radar', 'pie'];
  const currentIndex = types.indexOf(chartType);
  chartType = types[(currentIndex + 1) % types.length];
  
  renderChart();
  chartTypeBtn.innerHTML = `<i class="fa-solid fa-exchange-alt"></i> Ganti ke ${types[(currentIndex + 2) % types.length].toUpperCase()}`;
});

// Sensitivity analysis buttons
document.querySelectorAll('.scenario-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    if (products.length === 0) {
      alert("Tambahkan produk terlebih dahulu untuk analisis sensitivitas");
      return;
    }
    
    runSensitivityAnalysis(this.dataset.scenario);
  });
});

// Template buttons
document.querySelectorAll('.template-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const templateId = this.dataset.template;
    
    // Load predefined template
    const templates = {
      fashion: { demand: 35, competition: 25, profit: 20, capital: 10, productionTime: 5, risk: 5 },
      fandb: { demand: 40, competition: 20, profit: 25, capital: 5, productionTime: 5, risk: 5 },
      digital: { demand: 25, competition: 15, profit: 35, capital: 10, productionTime: 10, risk: 5 },
      jasa: { demand: 25, competition: 30, profit: 25, capital: 5, productionTime: 5, risk: 10 }
    };
    
    const template = templates[templateId];
    if (template) {
      wDemand.value = template.demand;
      wCompetition.value = template.competition;
      wProfit.value = template.profit;
      wCapital.value = template.capital;
      wProductionTime.value = template.productionTime;
      wRisk.value = template.risk;
      
      validateWeights();
      feedback.textContent = `Template ${this.textContent.trim()} diterapkan`;
      feedback.className = "feedback success";
    }
  });
});

// Real-time weight validation
[wDemand, wCompetition, wProfit, wCapital, wProductionTime, wRisk].forEach(input => {
  input.addEventListener("input", validateWeights);
});

// ------------------ INITIALIZATION ------------------
// Load template on page load
window.addEventListener('DOMContentLoaded', () => {
  loadTemplate();
  renderTable();
  renderChart();
  updateDashboard();
  validateWeights();
});