
let transactions = JSON.parse(localStorage.getItem("transactions") || "[]");
let budgets = JSON.parse(localStorage.getItem("budgets") || "{}");
let editingId = null;


const qty = id => document.getElementById(id);
const balanceE = qty("balance"), incomeE = qty("income"), expenseE = qty("expense");
const trxListE = qty("transactionList"), catListE = qty("categoryList");
const catChartCtx = document.getElementById("categoryChart").getContext("2d");
const filterCat = qty("filterCategory"), filterMon = qty("filterMonth");
const trxForm = qty("transactionForm"), budgetForm = qty("budgetForm");
const toggleDM = qty("toggleDark");
const trsType = qty("trxType"), trsName = qty("trxName"), trsAmt = qty("trxAmount"), trsDate = qty("trxDate"), trsCat = qty("trxCategory");
const incomeBtn = document.getElementById("incomeBtn");
const expenseBtn = document.getElementById("expenseBtn");

incomeBtn.onclick = () => {
  trsType.value = "income";
  incomeBtn.classList.add("active");
  expenseBtn.classList.remove("active");
};

expenseBtn.onclick = () => {
  trsType.value = "expense";
  expenseBtn.classList.add("active");
  incomeBtn.classList.remove("active");
};



if (localStorage.getItem("darkMode") === "true") document.body.classList.add("dark-mode");
toggleDM.onclick = () => {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
};


const saveAll = () => {
  localStorage.setItem("transactions", JSON.stringify(transactions));
  localStorage.setItem("budgets", JSON.stringify(budgets));
  renderAll();
};
const randID = () => Date.now().toString();
const formatDate = dateStr => {
  const d = new Date(dateStr);
  const options = { day: "numeric", month: "long", year: "numeric" };
  return d.toLocaleDateString("en-IN", options);
};


function renderForms() {
  trsCat.innerHTML = "<option value=''>Category</option>";
  filterCat.innerHTML = "<option value='all'>All Categories</option>";
  Object.keys(budgets).forEach(c => {
    const opt = `<option value="${c}">${c}</option>`;
    trsCat.innerHTML += opt;
    filterCat.innerHTML += opt;
  });
  budgetForm.innerHTML = Object.keys(budgets).map(c => `
    <label>${c} Budget (₹)</label>
    <input type="number" data-cat="${c}" value="${budgets[c]}" />
  `).join("") + `<label>New Category</label><input type="text" id="newCat"/> <button type="button" id="addCatBtn">Add Category</button>`;
  qty("addCatBtn").onclick = () => {
    const name = qty("newCat").value.trim().toLowerCase();
    if (name && !budgets[name]) {
      budgets[name] = 0;
      saveAll();
    }
  };
  budgetForm.querySelectorAll("input[data-cat]").forEach(input => {
    input.onchange = () => {
      budgets[input.dataset.cat] = parseFloat(input.value) || 0;
      saveAll();
    };
  });
}


function renderAll() {
  renderForms();

  const fc = filterCat.value, fm = filterMon.value;
  const filtered = transactions.filter(t => {
    return (fc === "all" || t.category === fc) &&
      (!fm || t.date.startsWith(fm));
  });

  
  trxListE.innerHTML = filtered.map(t => `
    <li>
      <div>
        <strong>${t.name}</strong><br/>
        <small>${formatDate(t.date)}</small><br/>
        <small>${t.category}</small>
      </div>
      <div>
        <span class="${t.type}">₹${parseFloat(t.amount).toFixed(2)}</span>
        <button onclick="editTrx('${t.id}')">✏️</button>
        <button onclick="delTrx('${t.id}')">🗑️</button>
      </div>
    </li>
  `).join("") || "<li style='text-align:center;color:#aaa;padding:1rem;'>No transactions.</li>";

  
  let income = 0, expense = 0;
  const catTotals = {};
  transactions.forEach(t => {
    if (!catTotals[t.category]) catTotals[t.category] = 0;
    if (t.type === 'income') income += +t.amount;
    else expense += +t.amount;
    catTotals[t.category] += (t.type === 'expense' ? +t.amount : 0);
  });

  balanceE.textContent = `₹${(income - expense).toFixed(2)}`;
  incomeE.textContent = `₹${income.toFixed(2)}`;
  expenseE.textContent = `₹${expense.toFixed(2)}`;

 
  catListE.innerHTML = Object.keys(budgets).map(c => {
    const tot = catTotals[c] || 0;
    const bud = budgets[c];
    const pct = bud > 0 ? Math.min(100, Math.round((tot / bud) * 100)) : 0;
    if (bud > 0 && pct > 80) {
      Toastify({ text: `⚠️ ${c} at ${pct}% of budget`, duration: 3000 }).showToast();
    }
    return `<li>
      <span>${c}: ₹${tot.toFixed(2)}</span>
      ${bud > 0 ? `<progress value="${pct}" max="100"></progress> ₹${bud}` : ""}
    </li>`;
  }).join("");

  
  const catLabels = Object.keys(catTotals);
  const catValues = catLabels.map(c => catTotals[c]);
  if (window.catChart) window.catChart.destroy();
  window.catChart = new Chart(catChartCtx, {
    type: 'pie',
    data: {
      labels: catLabels,
      datasets: [{
        data: catValues,
        backgroundColor: catLabels.map(c => catTotals[c] > budgets[c] ? '#e74c3c' : '#3498db')
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });

  localStorage.setItem("transactions", JSON.stringify(transactions));
}


trxForm.onsubmit = e => {
  e.preventDefault();
  const entry = {
    id: editingId || randID(),
    type: trsType.value,
    name: trsName.value,
    amount: trsAmt.value,
    date: trsDate.value,
    category: trsCat.value
  };
  if (editingId) {
    transactions = transactions.map(t => t.id === editingId ? entry : t);
    editingId = null;
  } else {
    transactions.push(entry);
  }
  trxForm.reset();
  saveAll();
};


window.editTrx = id => {
  const t = transactions.find(x => x.id === id);
  editingId = id;
  trsType.value = t.type;
  trsName.value = t.name;
  trsAmt.value = t.amount;
  trsDate.value = t.date;
  trsCat.value = t.category;
};


window.delTrx = id => {
  if (confirm("Delete this transaction?")) {
    transactions = transactions.filter(t => t.id !== id);
    saveAll();
  }
};


filterCat.onchange = renderAll;
filterMon.onchange = renderAll;


renderAll();
