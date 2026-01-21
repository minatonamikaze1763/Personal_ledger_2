let ledger = [];
let editingId = null; // replace editingIndex
let fileName = "Untitled";
let currentLedgerKey = "";
let isUsingFilter = false;
let globalFilterData = [];
let sortState = { col: null, dir: "asc" };
let sortedLedger = [];
let currencySymbol = "";
let hasUnsavedChanges = false;
const SETTINGS_KEY = "vaultSettings";

function loadSettingsValues() {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved); // gives you { autoSave: {value: true}, ... }
    } catch (e) {
      console.error("Failed to parse settings", e);
    }
  }
  return {}; // fallback
}

function getSetting(key, fallback) {
  return settings[key]?.value ?? fallback;
}

// Usage:
const settings = loadSettingsValues();

const accounts = [
  // Assets
  "Bank",
  "Cash",
  "Accounts Receivable",
  "Fixed Assets",
  "Investments",
  "Prepaid Expenses",
  "Inventory",
  "Savings",
  "Office",
  
  // Liabilities
  "Accounts Payable",
  "Credit Card",
  "Loans",
  "Taxes Payable",
  
  // Equity
  "Capital",
  "Owner’s Equity",
  "Retained Earnings",
  
  // Income
  "Bonus",
  "Business Income",
  "Commission",
  "Interest",
  "Other Income",
  "Salary",
  'Incentive',
  
  // Expenses
  "Bills",
  "Education",
  "Entertainment",
  "Food",
  "Healthcare",
  "Insurance",
  "Miscellaneous",
  "Rent",
  "Shopping",
  "Subscriptions",
  "Taxes",
  "Travel",
  "Utilities",
  "Business Partners",
  "Refunds",
  "Repairs & Maintenance",
  "Fuel",
  "Telecom",
  "Service Charges",
  "Family Support",
  "Vehicle",
  "Cash Reimbursement",
  "Household",
  "Bank Charges",
  "Attendence",
  "Exchange",
  "Leave",
  "Sunday or Extra duty",
  "Half-day",
  "Balance Diff",
  "Rapido",
  "Orders"
].sort();

function buildAccountSelector() {
  const accountSelector = document.getElementById("account");
  
  accountSelector.innerHTML = `<option value="" disabled selected>Select Account</option>`;
  accounts.forEach(acc => {
    const option = document.createElement("option");
    option.value = acc;
    option.textContent = acc;
    accountSelector.appendChild(option);
  });
}

function buildFilterAccounts() {
  const filterAccounts = document.getElementById("filter-accounts");
  const currentValue = filterAccounts.value; // save what user selected before refresh
  
  filterAccounts.innerHTML = '';
  filterAccounts.innerHTML = `<option value="">All Accounts</option>`;
  
  // ✅ Collect unique accounts from ledger
  const uniqueAccounts = [...new Set(ledger.map(entry => entry.account))].sort();
  
  uniqueAccounts.forEach(acc => {
    const option = document.createElement("option");
    option.value = acc;
    option.textContent = acc;
    
    // ✅ restore selection if it matches
    if (currentValue === acc) {
      option.selected = true;
    }
    
    filterAccounts.appendChild(option);
  });
  
  // ✅ also restore "All Accounts" if previously selected
  if (currentValue === "") {
    filterAccounts.querySelector('option[value=""]').selected = true;
  }
}
async function generateTransactionId(date, desc, amount) {
  // Normalize values
  const normalizedDate = new Date(date).toISOString().split("T")[0]; // yyyy-mm-dd
  const normalizedDesc = desc.trim().toLowerCase();
  const normalizedAmount = parseFloat(amount).toFixed(2);
  
  // Add a salt (timestamp + random)
  const salt = Date.now().toString() + Math.random().toString(36).substring(2, 6);
  
  // Build string
  const baseString = `${normalizedDate}|${normalizedDesc}|${normalizedAmount}|${salt}`;
  
  // Hash using SHA-256
  const buffer = new TextEncoder().encode(baseString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  
  // Return shorter, prefixed ID
  return "tx_" + hashHex.substring(0, 12);
}

function getClosingBalance(data) {
  return data.reduce((acc, txn) => {
    if (txn.type === "income") return acc + txn.amount;
    if (txn.type === "expense") return acc - txn.amount;
    return acc;
  }, 0);
}
/*
function renderTable(data = ledger, showRecurringOnly = false) {
  const table = document.getElementById("tableBody");
  const balanceDiv = document.getElementById("balance");
  const totalIncomeSpan = document.getElementById("totalIncome");
  const totalExpenseSpan = document.getElementById("totalExpense");
  const finalBalanceSpan = document.getElementById("finalBalance");
  
  table.innerHTML = "";
  let balance = 0;
  let totalIncome = 0;
  let totalExpense = 0;
  
  // Sort the filtered data
  const displayData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
  if (isUsingFilter && displayData.length > 0) {
    const ledgerSorted = [...ledger].sort((a, b) => new Date(a.date) - new Date(b.date));
    const firstLedgerDate = new Date(ledgerSorted[0].date);
    const firstDisplayDate = new Date(displayData[0].date);
    
    if (firstDisplayDate > firstLedgerDate) {
      // ✅ Only consider transactions BEFORE the filter's first date
      const beforeRange = ledgerSorted.filter(txn => new Date(txn.date) < firstDisplayDate);
      
      // Compute closing balance of all previous transactions
      const openingBalance = getClosingBalance(beforeRange);
      
      // Inject opening balance entry dated exactly at filter start
      displayData.unshift({
        date: firstDisplayDate.toISOString().split("T")[0], // ensures it matches filter start date
        type: "income",
        desc: "Opening Balance",
        amount: openingBalance,
        account: "Balance Diff"
      });
    }
  }
  const recurringIndices = getRecurringIndices(displayData);
  
  displayData.forEach((entry, index) => {
    const isRecurring = recurringIndices.has(index);
    if (showRecurringOnly && !isRecurring) return;
    
    if (entry.type === "income") {
      balance += entry.amount;
      totalIncome += entry.amount;
    } else {
      balance -= entry.amount;
      totalExpense += entry.amount;
    }
    
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${entry.date}</td>
      <td>${entry.account}</td>
<td>
  ${entry.desc}
  ${isRecurring ? '<span class="recurring-badge">®</span>' : ''}
  ${entry.transactionType === "linked-transaction" 
      ? (entry.transferredFrom === currentLedgerKey 
          ? '<span class="highlight">to Ledger: ' + entry.transferredTo + '</span>' 
          : '<span class="highlight">from Ledger: ' + entry.transferredFrom + '</span>') 
      : ''}
</td>  
 <td>${entry.type === 'expense' ? 'Debit' : 'Credit'}</td>
<td class="${entry.type === 'expense' && 'expense-label'}">
  ${entry.type === 'expense' ? '-' + entry.amount.toFixed(2) : '-'}
</td> 
<td class = "${entry.type === 'income' && 'income-label'}" >
${ entry.type === 'income' ? '+' + entry.amount.toFixed(2) : '-' }
</td>    
<td>${balance.toFixed(2)}</td>
      <td class="actions">
        <button onclick="editEntry('${entry.id}')">Edit</button>
        <button class="delete-btn" onclick="deleteEntry('${entry.id}','${entry.desc}')">Delete</button>
      </td>
    `;
    table.appendChild(row);
  });
  
  balanceDiv.textContent = `Balance :  ${ currencySymbol + balance.toFixed(2)}`;
  totalIncomeSpan.textContent = totalIncome.toFixed(2);
  totalExpenseSpan.textContent = totalExpense.toFixed(2);
  finalBalanceSpan.textContent = balance.toFixed(2);
  updateWealthLight(totalIncome, totalExpense);
  showLowBalancePlan(balance);
  refreshReports();
  renderBudgetPlan();
}
*/
function renderTable(data = ledger, showRecurringOnly = false) {
  const table = document.getElementById("tableBody");
  const balanceDiv = document.getElementById("balance");
  
  const openingBalanceSpan = document.getElementById("openingBalance");
  const totalIncomeSpan = document.getElementById("totalIncome");
  const totalExpenseSpan = document.getElementById("totalExpense");
  const finalBalanceSpan = document.getElementById("finalBalance");
  
  table.innerHTML = "";
  
  let openingBalance = 0;
  let balance = 0;
  let totalIncome = 0;
  let totalExpense = 0;
  
  // ===== SORT DATA =====
  const displayData = [...data].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  
  // ===== OPENING BALANCE INJECTION =====
  if (isUsingFilter && displayData.length > 0) {
    const ledgerSorted = [...ledger].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    
    const firstLedgerDate = new Date(ledgerSorted[0].date);
    const firstDisplayDate = new Date(displayData[0].date);
    
    if (firstDisplayDate > firstLedgerDate) {
      const beforeRange = ledgerSorted.filter(
        txn => new Date(txn.date) < firstDisplayDate
      );
      
      openingBalance = getClosingBalance(beforeRange);
      
      displayData.unshift({
        date: firstDisplayDate.toISOString().split("T")[0],
        type: "opening",
        desc: "Opening Balance",
        amount: openingBalance,
        account: "Balance Diff"
      });
    }
  }
  
  // ===== RECURRING =====
  const recurringIndices = getRecurringIndices(displayData);
  
  // ===== RENDER ROWS =====
  displayData.forEach((entry, index) => {
    const isRecurring = recurringIndices.has(index);
    if (showRecurringOnly && !isRecurring) return;
    
    // ---- BALANCE LOGIC ----
    if (entry.type === "opening") {
      balance = entry.amount;
      openingBalance = entry.amount;
    } else if (entry.type === "income") {
      balance += entry.amount;
      totalIncome += entry.amount;
    } else if (entry.type === "expense") {
      balance -= entry.amount;
      totalExpense += entry.amount;
    }
    
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${entry.date}</td>
      <td>${entry.account}</td>
      <td>
        ${entry.desc}
        ${isRecurring ? '<span class="recurring-badge">®</span>' : ''}
        ${
          entry.transactionType === "linked-transaction"
            ? (entry.transferredFrom === currentLedgerKey
                ? '<span class="highlight">to Ledger: ' + entry.transferredTo + '</span>'
                : '<span class="highlight">from Ledger: ' + entry.transferredFrom + '</span>')
            : ''
        }
      </td>
      <td>
        ${
          entry.type === "opening"
            ? "-"
            : entry.type === "expense"
            ? "Debit"
            : "Credit"
        }
      </td>
      <td class="${entry.type === "expense" ? "expense-label" : ""}">
        ${entry.type === "expense" ? "-" + entry.amount.toFixed(2) : "-"}
      </td>
      <td class="${entry.type === "income" ? "income-label" : ""}">
        ${entry.type === "income" ? "+" + entry.amount.toFixed(2) : "-"}
      </td>
      <td>${balance.toFixed(2)}</td>
      <td class="actions">
        <button onclick="editEntry('${entry.id}')">Edit</button>
        <button class="delete-btn" onclick="deleteEntry('${entry.id}','${entry.desc}')">Delete</button>
      </td>
    `;
    table.appendChild(row);
  });
  
  // ===== SUMMARY UI =====
  openingBalanceSpan.textContent = openingBalance.toFixed(2);
  totalIncomeSpan.textContent = totalIncome.toFixed(2);
  totalExpenseSpan.textContent = totalExpense.toFixed(2);
  finalBalanceSpan.textContent = balance.toFixed(2);
  
  balanceDiv.textContent = `Balance : ${currencySymbol}${balance.toFixed(2)}`;
  
  updateWealthLight(totalIncome, totalExpense);
  showLowBalancePlan(balance);
  refreshReports();
  renderBudgetPlan();
}

function getRecurringIndices(data) {
  const ledgerKeyMap = {};
  
  // Build a map of keys from the full ledger (desc + amount)
  ledger.forEach(entry => {
    const key = `${entry.desc.toLowerCase()}-${entry.amount}`;
    if (!ledgerKeyMap[key]) ledgerKeyMap[key] = 0;
    ledgerKeyMap[key]++;
  });
  
  // Now mark indices in the current display data if the key appears more than once
  const recurring = new Set();
  data.forEach((entry, index) => {
    const key = `${entry.desc.toLowerCase()}-${entry.amount}`;
    if (ledgerKeyMap[key] > 1) {
      recurring.add(index);
    }
  });
  
  return recurring;
}

function setDeafults() {
  const account = document.getElementById("account");
  account.value = localStorage.getItem("lastSelectedAccount") || ''
}

// Sort function triggered from indicators
function sortTableColumn(colKey) {
  // base data should always come from your current ledger/filters
  sortedLedger = [...ledger]; // or [...filteredLedger] if you use filtering
  
  // toggle direction if same column clicked
  if (sortState.col === colKey) {
    sortState.dir = sortState.dir === "asc" ? "desc" : "asc";
  } else {
    sortState.col = colKey;
    sortState.dir = "asc";
  }
  
  // perform sorting
  // perform sorting
  sortedLedger.sort((a, b) => {
    let valA = a[colKey];
    let valB = b[colKey];
    
    // Amount and Closing Balance should always be numeric
    if (colKey === "amount" || colKey === "closingBalance") {
      valA = parseFloat(String(valA).replace(/[+,]/g, ""));
      valB = parseFloat(String(valB).replace(/[+,]/g, ""));
    }
    
    // Date
    else if (colKey === "date") {
      valA = new Date(valA);
      valB = new Date(valB);
    }
    
    // Default: compare as string (case-insensitive)
    else {
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
    }
    
    if (valA < valB) return sortState.dir === "asc" ? -1 : 1;
    if (valA > valB) return sortState.dir === "asc" ? 1 : -1;
    return 0;
  });
  // update indicators
  document.querySelectorAll(".sort-indicator").forEach(el => {
    el.textContent = "⇅";
  });
  const activeIndicator = document.querySelector(`.sort-indicator[data-col="${colKey}"]`);
  if (activeIndicator) {
    activeIndicator.textContent = sortState.dir === "asc" ? "▲" : "▼";
  }
  
  // render using your existing renderTable
  renderTable(sortedLedger);
}
document.querySelectorAll(".sort-indicator").forEach(indicator => {
  indicator.addEventListener("click", () => {
    sortTableColumn(indicator.dataset.col);
  });
});
document.getElementById("entryForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  saveLastState();
  const account = document.getElementById("account").value;
  const date = document.getElementById("date").value;
  const description = document.getElementById("desc").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const type = document.getElementById("type").value;
  
  if (editingId !== null) {
    const idx = ledger.findIndex(tx => tx.id === editingId);
    if (idx !== -1) {
      if (ledger[idx].transactionType === "linked-transaction") {
        // Let linkedModify handle both ledgers
        const correctEntry = {
          ...ledger[idx],
          date,
          account,
          desc: description,
          amount
        };
        // Update both ledgers properly
        linkedModify(editingId, correctEntry, 'edit');
      } else {
        // Normal update
        ledger[idx] = {
          ...ledger[idx],
          date,
          account,
          desc: description,
          amount,
          type
        };
      }
    }
    editingId = null;
  } else {
    const id = await generateTransactionId(date, description, amount);
    const entry = { id, date, desc: description, account, amount, type };
    ledger.push(entry);
  }
  document.getElementById("type").disabled = false
  saveToLocalStorage();
  e.target.reset();
  setDeafults();
  renderTable();
  renderCharts(ledger);
  clearFilters();
  
  transactions.push(1);
  hasUnsavedChanges = true;
});

function clearEntry() {
  const account = document.getElementById("account");
  const date = document.getElementById("date");
  const description = document.getElementById("desc");
  const amount = document.getElementById("amount");
  const type = document.getElementById("type");
  
  account.value = "";
  date.value = "";
  description.value = "";
  amount.value = "";
  type.value = "income";
  setToday();
  
}

function linkedModify(id, entry, action) {
  let fromLedger = JSON.parse(localStorage.getItem(entry.transferredFrom) || "[]");
  let toLedger = JSON.parse(localStorage.getItem(entry.transferredTo) || "[]");
  
  if (action === 'edit') {
    // Force expense in fromLedger
    const fromIdx = fromLedger.findIndex(tx => tx.id === id);
    if (fromIdx !== -1) {
      fromLedger[fromIdx] = { ...entry, type: "expense" };
    } else {
      fromLedger.push({ ...entry, type: "expense" });
    }
    
    // Force income in toLedger
    const linkedIdx = toLedger.findIndex(tx => tx.id === id);
    if (linkedIdx !== -1) {
      toLedger[linkedIdx] = { ...entry, type: "income" };
    } else {
      toLedger.push({ ...entry, type: "income" });
    }
    
  } else if (action === 'delete') {
    fromLedger = fromLedger.filter(tx => tx.id !== id);
    toLedger = toLedger.filter(tx => tx.id !== id);
  }
  
  // Save both back
  localStorage.setItem(entry.transferredFrom, JSON.stringify(fromLedger));
  localStorage.setItem(entry.transferredTo, JSON.stringify(toLedger));
  transactions.push(1);
  hasUnsavedChanges = true;
  // Refresh in-memory ledger
  if (currentLedgerKey === entry.transferredFrom) {
    ledger = fromLedger;
  } else if (currentLedgerKey === entry.transferredTo) {
    ledger = toLedger;
  }
}

function formatDateForInput(dateString) {
  // Split by "-" → [DD, MM, YYYY]
  let [day, month, year] = dateString.split("-");
  return `${day.padStart(2,"0")}-${month.padStart(2,"0")}-${year}`;
}

function editEntry(id) {
  // Find entry in ledger by ID
  const entry = ledger.find(tx => tx.id === id);
  if (!entry) {
    console.error("Entry not found for ID:", id);
    return;
  }
  clearFilters();
  
  // Fill form with entry values
  document.getElementById("date").value = entry.date;
  document.getElementById("desc").value = entry.desc;
  document.getElementById("account").value = entry.account;
  document.getElementById("amount").value = entry.amount;
  document.getElementById("type").value = entry.type.toLowerCase();
  
  if (entry.transactionType) document.getElementById("type").disabled = true
  // Store ID instead of index
  editingId = id;
  focusInput();
  
  // Save state
  saveToLocalStorage();
  saveLastState();
  renderCharts(ledger);
  transactions.push(1);
  hasUnsavedChanges = true;
}

function deleteEntry(id, desc) {
  if (confirm(`Delete ${desc} entry?`)) {
    saveLastState();
    
    // Find which ledger contains the entry
    let entry = ledger.find(tx => tx.id === id);
    if (!entry) return alert("Unable delete transaction!"); // not found in any ledger
    
    if (entry.transactionType === "linked-transaction") {
      const note = `NOTE: This is a linked-transaction meaning it will delete the transaction from both ${entry.transferredFrom} and ${entry.transferredTo} ledgers,Do you want to you continue?`;
      if (!confirm(note)) return;
      linkedModify(id, entry, 'delete')
    } else {
      const idx = ledger.findIndex(tx => tx.id === id);
      // Find index of entry by ID
      if (idx !== -1) {
        ledger.splice(idx, 1);
      }
      saveToLocalStorage();
    }
    renderTable();
    applyFilters();
    renderCharts(ledger);
    transactions.push(1);
    hasUnsavedChanges = true;
  }
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(ledger, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = currentLedgerKey + ".json";
  anchor.click();
  URL.revokeObjectURL(url);
}
// imports
async function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      const baseName = file.name.replace(/\.json$/, '');
      let ledgers = JSON.parse(localStorage.getItem("ledgers") || "[]");
      ledgers = [...new Set(ledgers)];
      
      // Handle duplicate ledger names
      if (ledgers.includes(baseName)) {
        let newName = prompt(`A ledger named "${baseName}" already exists. Enter a different name:`);
        if (!newName || ledgers.includes(newName)) {
          alert("Import cancelled or name already exists.");
          return;
        }
        currentLedgerKey = newName;
        fileName = newName;
      } else {
        currentLedgerKey = baseName;
        fileName = baseName;
      }
      
      // Normalize ledger structure (support array or object with { ledger: [...] })
      let importedLedger;
      if (Array.isArray(importedData)) {
        importedLedger = importedData;
      } else if (importedData.ledger) {
        importedLedger = importedData.ledger;
      } else {
        alert("Invalid JSON format!");
        return;
      }
      
      // Ensure every entry has an id
      for (let entry of importedLedger) {
        if (!entry.id) {
          entry.id = await generateTransactionId(entry.date, entry.desc, entry.amount);
        }
        if (!entry.account) entry.account = "Miscellaneous"; // fallback
      }
      
      ledger = importedLedger;
      
      // Save to localStorage
      localStorage.setItem(currentLedgerKey, JSON.stringify(ledger));
      if (!ledgers.includes(currentLedgerKey)) {
        ledgers.push(currentLedgerKey);
        localStorage.setItem("ledgers", JSON.stringify(ledgers));
      }
      
      localStorage.setItem("currentLedgerKey", currentLedgerKey);
      
      // UI updates
      document.getElementById("filename").value = fileName;
      updateLedgerSelect();
      renderTable();
      renderCharts(ledger);
      
      alert(`Ledger ${currentLedgerKey}  imported successfully ✅`);
    } catch (err) {
      alert("Error importing file ❌");
      console.error(err);
    }
  };
  reader.readAsText(file);
}
// ===== TXT Import =====
async function importTXT(file) {
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const lines = e.target.result.split("\n").filter(l => l.trim() !== "");
      let importedLedger = [];
      
      for (let line of lines) {
        const [date, account, desc, type, amount] = line.split(",");
        importedLedger.push({
          id: await generateTransactionId(date, desc, parseFloat(amount)),
          date: date.trim(),
          account: account?.trim() || "Miscellaneous",
          desc: desc?.trim() || "",
          type: type?.trim().toLowerCase(),
          amount: parseFloat(amount) || 0
        });
      }
      
      finalizeImport(file, importedLedger);
    } catch (err) {
      alert("Error importing TXT ❌");
      console.error(err);
    }
  };
  reader.readAsText(file);
}

// ===== CSV Import =====
async function importCSV(file) {
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const rows = e.target.result.split("\n").map(r => r.split(","));
      const headers = rows.shift().map(h => h.trim().toLowerCase());
      let importedLedger = [];
      
      for (let row of rows) {
        if (row.length < 4) continue;
        const entry = {};
        headers.forEach((h, i) => {
          entry[h] = row[i]?.trim();
        });
        
        importedLedger.push({
          id: await generateTransactionId(entry.date, entry.description, parseFloat(entry.amount)),
          date: entry.date,
          account: entry.account || "Miscellaneous",
          desc: entry.description || "",
          type: entry.type?.toLowerCase(),
          amount: parseFloat(entry.amount) || 0
        });
      }
      
      finalizeImport(file, importedLedger);
    } catch (err) {
      alert("Error importing CSV ❌");
      console.error(err);
    }
  };
  reader.readAsText(file);
}

// ===== XLS / XLSX Import =====
async function importXLSX(file) {
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      let importedLedger = [];
      for (let row of rows) {
        importedLedger.push({
          id: await generateTransactionId(row.Date, row.Description, parseFloat(row.Amount)),
          date: row.Date,
          account: row.Account || "Miscellaneous",
          desc: row.Description || "",
          type: row.Type?.toLowerCase(),
          amount: parseFloat(row.Amount) || 0
        });
      }
      
      finalizeImport(file, importedLedger);
    } catch (err) {
      alert("Error importing Excel ❌");
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(file);
}

// ===== PDF Import ===== (simple text extraction, not structured)
async function importPDF(file) {
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const pdfData = new Uint8Array(e.target.result);
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      
      let textContent = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        textContent += content.items.map(i => i.str).join(" ") + "\n";
      }
      
      // Very basic assumption: CSV-like format inside PDF text
      const lines = textContent.split("\n").filter(l => l.includes(","));
      let importedLedger = [];
      
      for (let line of lines) {
        const [date, account, desc, type, amount] = line.split(",");
        importedLedger.push({
          id: await generateTransactionId(date, desc, parseFloat(amount)),
          date: date?.trim(),
          account: account?.trim() || "Miscellaneous",
          desc: desc?.trim() || "",
          type: type?.trim().toLowerCase(),
          amount: parseFloat(amount) || 0
        });
      }
      
      finalizeImport(file, importedLedger);
    } catch (err) {
      alert("Error importing PDF ❌");
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(file);
}

// ===== Common Finalize Import =====
async function finalizeImport(file, importedLedger) {
  try {
    const baseName = file.name.replace(/\.[^/.]+$/, ""); // remove extension
    let ledgers = JSON.parse(localStorage.getItem("ledgers") || "[]");
    ledgers = [...new Set(ledgers)];
    
    if (ledgers.includes(baseName)) {
      let newName = prompt(`A ledger named "${baseName}" already exists. Enter a different name:`);
      if (!newName || ledgers.includes(newName)) {
        alert("Import cancelled or name already exists.");
        return;
      }
      currentLedgerKey = newName;
      fileName = newName;
    } else {
      currentLedgerKey = baseName;
      fileName = baseName;
    }
    
    // Ensure IDs
    for (let entry of importedLedger) {
      if (!entry.id) {
        entry.id = await generateTransactionId(entry.date, entry.desc, entry.amount);
      }
      if (!entry.account) entry.account = "Miscellaneous";
    }
    
    ledger = importedLedger;
    localStorage.setItem(currentLedgerKey, JSON.stringify(ledger));
    
    if (!ledgers.includes(currentLedgerKey)) {
      ledgers.push(currentLedgerKey);
      localStorage.setItem("ledgers", JSON.stringify(ledgers));
    }
    
    localStorage.setItem("currentLedgerKey", currentLedgerKey);
    
    document.getElementById("filename").value = fileName;
    updateLedgerSelect();
    renderTable();
    renderCharts(ledger);
    
    alert(`Ledger ${currentLedgerKey} imported successfully ✅`);
  } catch (err) {
    alert("Error finalizing import ❌");
    console.error(err);
  }
}
async function importZip(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const zip = new JSZip();
    const content = await zip.loadAsync(file);
    
    for (const fileName in content.files) {
      if (fileName.endsWith(".json")) {
        try {
          const fileData = await content.files[fileName].async("blob");
          const baseName = fileName.split('/').pop()
          const fakeFile = new File([fileData], baseName, { type: "application/json" });
          
          // create fake event object
          const fakeEvent = { target: { files: [fakeFile] } };
          
          // call your existing importJSON function
          await importJSON(fakeEvent);
          
        } catch (err) {
          console.error(`❌ Error importing ${fileName}:`, err);
          alert(`Error importing ${fileName}`);
        }
      }
    }
    
    alert("📦 ZIP import completed successfully!");
  } catch (err) {
    alert("Error reading ZIP file ❌");
    console.error(err);
  }
}
// ===== Master Import Handler =====
function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  // other import formats pending
  const ext = file.name.split(".").pop().toLowerCase();
  switch (ext) {
    case "json":
      return importJSON(event);
    case "zip":
      return importZip(event);
      /* case "txt": return importTXT(file);
       case "csv": return importCSV(file);
       case "xls":
       case "xlsx": return importXLSX(file);
       case "pdf": return importPDF(file);
      */
    default:
      alert("Unsupported file format ❌");
  }
}

// exports 
function handleExport() {
  const format = document.getElementById("exportFormat").value;
  
  if (!format) {
    alert("Please select an export format.");
    return;
  }
  
  switch (format) {
    case "json":
      exportJSON();
      break;
    case "excel":
      exportToExcel();
      break;
    case "summary":
      exportSummaryPDF();
      break;
    case "pdf":
      exportToPDF();
      break;
    case "png":
      exportToPNG();
      break;
    default:
      alert("Unsupported export format!");
  }
  return;
}

function exportToExcel() {
  const table = document.querySelector('table');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table);
  
  // Calculate closing balance
  let closingBalance = 0;
  ledger.forEach(entry => {
    if (entry.type === "income") closingBalance += entry.amount;
    else closingBalance -= entry.amount;
  });
  
  // Add closing balance row after table
  const rowIndex = XLSX.utils.decode_range(ws['!ref']).e.r + 2;
  const cellRef = `A${rowIndex + 1}`;
  ws[cellRef] = {
    v: `Closing Balance:  ${currencySymbol + closingBalance.toFixed(2)}`,
    t: 's',
    s: {
      font: { bold: true, sz: 14 }
    }
  };
  
  XLSX.utils.book_append_sheet(wb, ws, "Records");
  XLSX.writeFile(wb, currentLedgerKey + ".xlsx");
}
async function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // ===== THEME COLORS =====
  const rootStyles = getComputedStyle(document.documentElement);
  const primaryColor = rootStyles.getPropertyValue("--primary-color")?.trim() || "#6a0dad";
  const secondaryColor = rootStyles.getPropertyValue("--secondary-color")?.trim() || "#f3e8ff";
  const textColor = rootStyles.getPropertyValue("--text-color")?.trim() || "#000000";
  
  // ===== META =====
  const downloadDate = new Date().toLocaleString();
  const ledgerName = document.getElementById("filename")?.value || "Untitled Ledger";
  const appURL = window.location.href;
  
  // ===== HEADER =====
  doc.setFontSize(20).setTextColor(primaryColor).setFont(undefined, "bold");
  doc.text("Vault Ledger Report", 14, 15);
  
  doc.setFontSize(12).setTextColor(textColor).setFont(undefined, "normal");
  doc.text(`Ledger Name: ${ledgerName}`, 14, 25);
  doc.text(`Date of Download: ${downloadDate}`, 14, 37);
  doc.text(`URL: ${appURL}`, 14, 43);
  
  // ===== TABLE =====
  doc.autoTable({
    html: "table",
    startY: 50,
    styles: { fontSize: 10, textColor, lineColor: primaryColor, lineWidth: 0.2 },
    headStyles: { fillColor: primaryColor, textColor: "#ffffff", fontStyle: "bold" },
    bodyStyles: { fillColor: secondaryColor },
    alternateRowStyles: { fillColor: "#ffffff" }
  });
  
  let y = doc.lastAutoTable.finalY + 10;
  
  // ===== SUMMARY CALCULATION (FROM TABLE) =====
  const rows = document.querySelectorAll("table tbody tr");
  
  let openingBalance = 0;
  let totalCredit = 0;
  let totalDebit = 0;
  let lastClosing = 0;
  
  rows.forEach(row => {
    const cells = row.querySelectorAll("td");
    if (!cells.length) return;
    
    const desc = cells[3]?.innerText.trim();
    
    const debitText = cells[5]?.innerText.trim();
    const creditText = cells[6]?.innerText.trim();
    const closingText = cells[7]?.innerText.trim();
    
    const debit = parseFloat(debitText.replace(/[^\d.-]/g, "")) || 0;
    const credit = parseFloat(creditText.replace(/[^\d.-]/g, "")) || 0;
    const closing = parseFloat(closingText.replace(/[^\d.-]/g, "")) || 0;
    
    if (desc === "Opening Balance") {
      openingBalance = closing;
    } else {
      totalDebit += debit;
      totalCredit += credit;
    }
    
    lastClosing = closing;
  });
  
  // Reconciled closing balance
  const closingBalance =
   ( openingBalance + totalCredit) - totalDebit;
  
  // ===== SUMMARY =====
  doc.setFontSize(14).setTextColor(primaryColor).setFont(undefined, "bold");
  doc.text("Summary (Selected Period)", 14, y);
  
  doc.setFontSize(12).setTextColor(textColor).setFont(undefined, "normal");
  doc.text(`Opening Balance: ${currencySymbol} ${openingBalance.toFixed(2)}`, 14, y + 8);
  doc.text(`Total Credit: ${currencySymbol} ${totalCredit.toFixed(2)}`, 14, y + 16);
  doc.text(`Total Debit: ${currencySymbol} ${totalDebit.toFixed(2)}`, 14, y + 24);
  doc.text(`Closing Balance: ${currencySymbol} ${closingBalance.toFixed(2)}`, 14, y + 32);
  
  // ===== FOOTER =====
  doc.setFontSize(10).setTextColor("#666666").setFont(undefined, "italic");
  doc.text("Generated by Vault Ledger App", 14, 290);
  
  // ===== SAVE =====
  doc.save(`${ledgerName}.pdf`);
}
async function exportSummaryPDF(isZip, parsedData = ledger, ledgerName = document.getElementById("filename")?.value || "Ledger Summary") {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");
  
  // ====== THEME COLORS ======
  const root = getComputedStyle(document.documentElement);
  const primaryColor = root.getPropertyValue("--primary-color")?.trim() || "#6a0dad";
  const secondaryColor = root.getPropertyValue("--secondary-color")?.trim() || "#f3e8ff";
  const textColor = root.getPropertyValue("--text-color")?.trim() || "#000";
  
  // ====== META ======
  const downloadDate = new Date().toLocaleString();
  const appURL = window.location.href;
  
  // ====== FETCH DATA (Adjust based on your app) ======
  const ledgerData = parsedData;
  if (!ledgerData.length) {
    alert("No ledger data found to summarize!");
    return;
  }
  
  // ====== DATA PROCESSING ======
  const formatNum = n => Number(n || 0).toLocaleString("en-IN");
  const accountMap = {};
  const monthlyMap = {};
  let totalIncome = 0,
    totalExpense = 0;
  
  ledgerData.forEach(tx => {
    const acc = tx.account || "Unknown";
    const amt = Number(tx.amount) || 0;
    const type = tx.type;
    const month = new Date(tx.date).toLocaleString("default", { month: "short", year: "numeric" });
    
    if (!accountMap[acc]) accountMap[acc] = { income: 0, expense: 0 };
    if (!monthlyMap[month]) monthlyMap[month] = { income: 0, expense: 0 };
    
    if (type === "income") {
      accountMap[acc].income += amt;
      monthlyMap[month].income += amt;
      totalIncome += amt;
    } else if (type === "expense") {
      accountMap[acc].expense += amt;
      monthlyMap[month].expense += amt;
      totalExpense += amt;
    }
  });
  
  const netBalance = totalIncome - totalExpense;
  
  // ====== HEADER ======
  doc.setFontSize(18).setTextColor(primaryColor).setFont(undefined, "bold");
  doc.text(" Ledger Summary Report", 14, 15);
  doc.setFontSize(10).setTextColor(textColor);
  doc.text(`Ledger: ${ledgerName}`, 14, 25);
  doc.text(`Generated: ${downloadDate}`, 14, 31);
  doc.textWithLink(`URL: ${appURL}`, 14, 37, {
    url: appURL
  });
  let y = 45;
  
  // ====== WEALTH INDICATOR ======
  doc.setFontSize(14).setTextColor(primaryColor).setFont(undefined, "bold");
  doc.text("Wealth Indicator", 14, y);
  y += 10;
  
  let wealthStatus = "Good financial health";
  let wealthColor = "#4caf50"; // green
  
  if (netBalance < 0) {
    wealthStatus = "Poor financial health";
    wealthColor = "#f44336"; // red
  } else if (netBalance < 1000) {
    wealthStatus = "Needs improvement";
    wealthColor = "#ff9800"; // orange
  } else if (netBalance > 10000) {
    wealthStatus = "Excellent financial health";
    wealthColor = "#2196f3"; // blue
  }
  
  doc.setFontSize(11).setTextColor(wealthColor).setFont(undefined, "bold");
  doc.text(wealthStatus, 14, y);
  y += 7;
  
  doc.setFontSize(11).setTextColor(textColor).setFont(undefined, "normal");
  doc.text(`Balance: ₹${formatNum(netBalance)}`, 14, y);
  y += 10;
  
  // ====== Overall Totals ======
  doc.setFontSize(14).setTextColor(primaryColor).setFont(undefined, "bold");
  doc.text("Overall Totals", 14, y);
  y += 8;
  
  const overallData = [
    ["Type", "Amount (₹)"],
    ["Total Income", `₹${formatNum(totalIncome)}`],
    ["Total Expenses", `₹${formatNum(totalExpense)}`],
    ["Net Balance", `₹${formatNum(netBalance)} ${netBalance >= 0 ? "(Positive)" : "(Negative)"}`]
  ];
  
  doc.autoTable({
    head: [overallData[0]],
    body: overallData.slice(1),
    startY: y + 2,
    theme: "grid",
    styles: { fontSize: 10, textColor, lineColor: primaryColor },
    headStyles: { fillColor: primaryColor, textColor: "#fff" },
    bodyStyles: { fillColor: secondaryColor },
  });
  
  y = doc.lastAutoTable.finalY + 10;
  if (y > 260) {
    doc.addPage();
    y = 20;
  }
  
  // ====== Account-wise Summary ======
  doc.setFontSize(14).setTextColor(primaryColor).setFont(undefined, "bold");
  doc.text("Account-Wise Summary", 14, y);
  y += 6;
  
  const accountRows = Object.entries(accountMap).map(([acc, v]) => {
    const bal = v.income - v.expense;
    const balText = `${bal >= 0 ? "+" : "-"}${formatNum(Math.abs(bal))}`;
    return [acc, formatNum(v.income || 0), formatNum(v.expense || 0), balText];
  });
  
  const totalRow = [
    "Total",
    `₹${formatNum(totalIncome)}`,
    `₹${formatNum(totalExpense)}`,
    `₹${formatNum(netBalance)}`
  ];
  
  doc.autoTable({
    head: [
      ["Account", "Income (₹)", "Expense (₹)", "Balance (₹)"]
    ],
    body: [...accountRows, ["", "", "", ""], totalRow],
    startY: y + 2,
    theme: "grid",
    styles: { fontSize: 9, textColor, lineColor: primaryColor },
    headStyles: { fillColor: primaryColor, textColor: "#fff" },
    bodyStyles: { fillColor: secondaryColor },
  });
  
  y = doc.lastAutoTable.finalY + 10;
  if (y > 260) {
    doc.addPage();
    y = 20;
  }
  
  // ====== Monthly Summary ======
  doc.setFontSize(14).setTextColor(primaryColor).setFont(undefined, "bold");
  doc.text("Monthly Summary", 14, y);
  y += 6;
  
  const monthlyRows = Object.entries(monthlyMap)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .map(([month, v]) => [
      month,
      formatNum(v.income),
      formatNum(v.expense),
      (v.income - v.expense >= 0 ? "+" : "-") + formatNum(Math.abs(v.income - v.expense))
    ]);
  
  doc.autoTable({
    head: [
      ["Month", "Income (₹)", "Expense (₹)", "Net (₹)"]
    ],
    body: monthlyRows,
    startY: y + 2,
    theme: "grid",
    styles: { fontSize: 9, textColor, lineColor: primaryColor },
    headStyles: { fillColor: primaryColor, textColor: "#fff" },
    bodyStyles: { fillColor: secondaryColor },
  });
  
  y = doc.lastAutoTable.finalY + 10;
  if (y > 260) {
    doc.addPage();
    y = 20;
  }
  
  // ====== Highlights ======
  // ====== Highlights & Reports ======
  const allDates = ledgerData.map(tx => new Date(tx.date));
  const daysCount = new Set(allDates.map(d => d.toDateString())).size || 1;
  const monthsCount = new Set(allDates.map(d => `${d.getFullYear()}-${d.getMonth()}`)).size || 1;
  const yearsCount = new Set(allDates.map(d => d.getFullYear())).size || 1;
  
  // Daily, Monthly, Yearly averages
  const dailyAvgIncome = totalIncome / daysCount;
  const dailyAvgExpense = totalExpense / daysCount;
  const monthlyAvgIncome = totalIncome / monthsCount;
  const monthlyAvgExpense = totalExpense / monthsCount;
  const yearlyAvgIncome = totalIncome / yearsCount;
  const yearlyAvgExpense = totalExpense / yearsCount;
  
  // Highest & lowest incomes/expenses
  const incomeTxs = ledgerData.filter(t => t.type === "income").sort((a, b) => b.amount - a.amount);
  const expenseTxs = ledgerData.filter(t => t.type === "expense").sort((a, b) => b.amount - a.amount);
  const highestIncome = incomeTxs[0];
  const lowestIncome = incomeTxs[incomeTxs.length - 1];
  const highestExpense = expenseTxs[0];
  const lowestExpense = expenseTxs[expenseTxs.length - 1];
  
  // Frequent transactions by category
  const freqMap = {};
  ledgerData.forEach(t => {
    freqMap[t.account] = (freqMap[t.account] || 0) + 1;
  });
  const freqList = Object.entries(freqMap).sort((a, b) => b[1] - a[1]);
  
  // Detect recurring transactions (same date, account, desc, amount)
  const recurMap = {};
  ledgerData.forEach(t => {
    const key = `${t.date}|${t.account}|${t.desc}|${t.amount}`;
    recurMap[key] = (recurMap[key] || 0) + 1;
  });
  const recurring = Object.entries(recurMap)
    .filter(([_, c]) => c > 1)
    .map(([k, c]) => {
      const [date, acc, desc, amt] = k.split("|");
      return { date, acc, desc, amt, count: c };
    });
  
  // ====== PAGE ADJUST ======
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  
  // ====== SECTION TITLE ======
  doc.setFontSize(16).setTextColor(primaryColor).setFont(undefined, "bold");
  doc.text("Reports & Highlights", 14, y);
  y += 10;
  
  // ====== BASIC REPORTS ======
  doc.setFontSize(13).setTextColor(primaryColor).setFont(undefined, "bold");
  doc.text("Basic Reports", 14, y);
  y += 6;
  
  const basicData = [
    ["Metric", "Income (₹)", "Expense (₹)"],
    ["Daily Avg", formatNum(dailyAvgIncome.toFixed(2)), formatNum(dailyAvgExpense.toFixed(2))],
    ["Monthly Avg", formatNum(monthlyAvgIncome.toFixed(2)), formatNum(monthlyAvgExpense.toFixed(2))],
    ["Yearly Avg", formatNum(yearlyAvgIncome.toFixed(2)), formatNum(yearlyAvgExpense.toFixed(2))],
    ["Highest", `${highestIncome ? highestIncome.amount : 0}`, `${highestExpense ? highestExpense.amount : 0}`],
    ["Lowest", `${lowestIncome ? lowestIncome.amount : 0}`, `${lowestExpense ? lowestExpense.amount : 0}`]
  ];
  
  doc.autoTable({
    head: [basicData[0]],
    body: basicData.slice(1),
    startY: y + 2,
    theme: "grid",
    styles: { fontSize: 9, textColor, lineColor: primaryColor },
    headStyles: { fillColor: primaryColor, textColor: "#fff" },
    bodyStyles: { fillColor: secondaryColor },
  });
  y = doc.lastAutoTable.finalY + 10;
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  
  // ====== TOP 5 INCOMES ======
  doc.setFontSize(13).setTextColor(primaryColor).setFont(undefined, "bold");
  doc.text("Top 5 Incomes", 14, y);
  y += 6;
  doc.autoTable({
    head: [
      ["Account | Description", "Amount (₹)", "Date"]
    ],
    body: incomeTxs.slice(0, 5).map(t => [
      `${t.account} | ${t.desc}`,
      formatNum(t.amount),
      t.date
    ]),
    startY: y + 2,
    theme: "grid",
    styles: { fontSize: 9, textColor, lineColor: primaryColor },
    headStyles: { fillColor: primaryColor, textColor: "#fff" },
    bodyStyles: { fillColor: secondaryColor },
  });
  y = doc.lastAutoTable.finalY + 10;
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  
  // ====== TOP 5 EXPENSES ======
  doc.setFontSize(13).setTextColor(primaryColor).setFont(undefined, "bold");
  doc.text("Top 5 Expenses", 14, y);
  y += 6;
  doc.autoTable({
    head: [
      ["Account | Description", "Amount (₹)", "Date"]
    ],
    body: expenseTxs.slice(0, 5).map(t => [
      `${t.account} | ${t.desc}`,
      formatNum(t.amount),
      t.date
    ]),
    startY: y + 2,
    theme: "grid",
    styles: { fontSize: 9, textColor, lineColor: primaryColor },
    headStyles: { fillColor: primaryColor, textColor: "#fff" },
    bodyStyles: { fillColor: secondaryColor },
  });
  y = doc.lastAutoTable.finalY + 10;
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  
  // ====== FREQUENT TRANSACTIONS ======
  doc.setFontSize(13).setTextColor(primaryColor).setFont(undefined, "bold");
  doc.text("Frequent Transactions", 14, y);
  y += 6;
  doc.autoTable({
    head: [
      ["Category", "Transactions"]
    ],
    body: freqList.map(([acc, c]) => [acc, `${c} time${c > 1 ? "s" : ""}`]),
    startY: y + 2,
    theme: "grid",
    styles: { fontSize: 9, textColor, lineColor: primaryColor },
    headStyles: { fillColor: primaryColor, textColor: "#fff" },
    bodyStyles: { fillColor: secondaryColor },
  });
  y = doc.lastAutoTable.finalY + 10;
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  
  // ====== RECURRING TRANSACTIONS ======
  doc.setFontSize(13).setTextColor(primaryColor).setFont(undefined, "bold");
  doc.text("Recurring Transactions", 14, y);
  y += 6;
  if (recurring.length === 0) {
    doc.setFontSize(10).setTextColor(textColor);
    doc.text("No recurring transactions found.", 16, y + 4);
    y += 8;
  } else {
    doc.autoTable({
      head: [
        ["Date", "Account", "Description", "Amount (₹)", "Count"]
      ],
      body: recurring.map(r => [
        r.date,
        r.acc,
        r.desc,
        formatNum(r.amt),
        `${r.count}×`
      ]),
      startY: y + 2,
      theme: "grid",
      styles: { fontSize: 9, textColor, lineColor: primaryColor },
      headStyles: { fillColor: primaryColor, textColor: "#fff" },
      bodyStyles: { fillColor: secondaryColor },
    });
  }
  y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : y + 10;
  
  
  // ====== SPECIAL INSIGHTS ======
  y += 20;
  
  doc.setFontSize(14).setTextColor(primaryColor).setFont(undefined, "bold");
  doc.text("Special Insights", 14, y);
  y += 8;
  
  // Find zero-spent days
  const dates = [...new Set(ledger.map(t => t.date))];
  const dateTotals = {};
  ledger.forEach(t => {
    if (!dateTotals[t.date]) dateTotals[t.date] = { income: 0, expense: 0 };
    if (t.type === "income") dateTotals[t.date].income += t.amount;
    else dateTotals[t.date].expense += t.amount;
  });
  const zeroSpentDays = dates.filter(d => dateTotals[d].expense === 0);
  
  const incomeRatio =
    totalExpense > 0 ? ((totalIncome / totalExpense) * 100).toFixed(1) : "0.0";
  
  doc.setFontSize(11).setTextColor(textColor);
  
  const insights = [
    `Income Ratio: ${incomeRatio}%`
  ];
  
  insights.forEach(line => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(`• ${line}`, 16, y);
    y += 7;
  });
  
  y += 5;
  doc.setDrawColor(primaryColor);
  doc.line(15, y, 195, y);
  y += 10;
  
  
  
  
  
  // ====== CHARTS SECTION (All in one page with correct aspect ratio) ======
  function addCharts() {
    doc.addPage();
    
    try {
      const charts = [
        { id: "pieChart", title: "Income vs Expense" },
        { id: "barChart", title: "Monthly Totals" },
        { id: "lineChart", title: "Balance Trend" }
      ];
      
      let chartY = 10;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      
      charts.forEach((chart, index) => {
        const canvas = document.getElementById(chart.id);
        if (canvas) {
          const imgData = canvas.toDataURL("image/png");
          const imgWidth = canvas.width;
          const imgHeight = canvas.height;
          const aspectRatio = imgHeight / imgWidth;
          
          // Scale width to fit page but preserve aspect ratio
          const renderWidth = maxWidth;
          const renderHeight = renderWidth * aspectRatio;
          
          // Title
          doc.setFontSize(13)
            .setTextColor(primaryColor)
            .setFont(undefined, "bold");
          doc.text(chart.title, pageWidth / 2, chartY, { align: "center" });
          
          chartY += 8;
          
          // Add chart image with proportional scaling
          doc.addImage(imgData, "PNG", margin, chartY, renderWidth, renderHeight);
          chartY += renderHeight + 10;
          
          // If near page bottom, add new page
          if (chartY > 260 && index !== charts.length - 1) {
            doc.addPage();
            chartY = 20;
          }
        }
      });
    } catch (err) {
      console.error("Chart export failed:", err);
    }
  }
  isZip ? "" : addCharts();
  
  // ====== FOOTER SECTION ======
  doc.addPage();
  let footerY = 20;
  
  doc.setFontSize(14).setTextColor(primaryColor).setFont(undefined, "bold");
  doc.text("End of Report", 105, footerY, { align: "center" });
  
  footerY += 10;
  doc.setDrawColor(primaryColor);
  doc.line(15, footerY, 195, footerY);
  footerY += 10;
  
  doc.setFontSize(11).setTextColor(textColor).setFont(undefined, "normal");
  doc.text("Vault Ledger", 14, footerY);
  footerY += 7;
  
  doc.setFontSize(10);
  doc.text(
    "A secure and organized way to manage your personal and business accounts.",
    14,
    footerY
  );
  footerY += 6;
  doc.text(
    "Track transactions, monitor balances, and gain insights with powerful charts and reports — all in one place.",
    14,
    footerY
  );
  footerY += 10;
  
  doc.setFontSize(10).setTextColor(primaryColor).setFont(undefined, "bold");
  doc.text("Developed by: Minato", 14, footerY);
  footerY += 6;
  doc.setFontSize(10).setTextColor("#0000EE").setFont(undefined, "normal");
  doc.textWithLink("GitHub: github.com/Minato1763", 14, footerY, {
    url: "https://github.com/minatonamikaze1763"
  });
  footerY += 6;
  doc.textWithLink("Email: minato.namikaze1763@gmail.com", 14, footerY, {
    url: "mailto:minato.namikaze1763@gmail.com"
  });
  footerY += 12;
  
  doc.setFontSize(9).setTextColor("#777").setFont(undefined, "italic");
  doc.text(
    "NOTE: You can modify ledger settings in the Settings Page.",
    14,
    footerY
  );
  footerY += 10;
  
  doc.setFontSize(9).setTextColor("#999");
  doc.text("© 2025 Vault Ledger. All rights reserved.", 105, 290, {
    align: "center"
  });
  // ====== SAVE ======
  return isZip ? doc.output("arraybuffer") :
    doc.save(`${ledgerName}_Summary.pdf`);
}



function exportToPNG() {
  const table = document.querySelector('table');
  if (!table) {
    alert("No table found to export!");
    return;
  }
  html2canvas(table, { scale: 2 }).then(canvas => {
    const link = document.createElement("a");
    link.download = `${currentLedgerKey || "ledger"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }).catch(err => {
    alert('error')
    console.error("Error exporting table as PNG:", err);
  });
}
async function downloadAllLedgers(dnFormat = document.getElementById("exportFormat").value) {
  const format = dnFormat;
  if (!format) {
    alert("Please select an export format.");
    return;
  }
  
  const zip = new JSZip();
  const folder = zip.folder("ledgers");
  const ledgers = JSON.parse(localStorage.getItem("ledgers") || "[]");
  
  if (ledgers.length === 0) {
    alert("No ledgers found to export.");
    return;
  }
  
  for (const ledgerName of ledgers) {
    const value = localStorage.getItem(ledgerName);
    if (!value) continue;
    
    try {
      let parsed = JSON.parse(value);
      
      // ====== DATE RANGE FILTER ======
      const startInput = document.getElementById("startDate");
      const endInput = document.getElementById("endDate");
      
      const startDate = startInput?.value ? new Date(startInput.value) : null;
      const endDate = endInput?.value ? new Date(endInput.value) : null;
      
      const filtered = (startDate || endDate) ?
        parsed.filter(entry => {
          const entryDate = new Date(entry.date);
          if (startDate && entryDate < startDate) return false;
          if (endDate && entryDate > endDate) return false;
          return true;
        }) :
        parsed;
      parsed = filtered;
      switch (format) {
        case "json": {
          folder.file(`${ledgerName}.json`, JSON.stringify(parsed, null, 2));
          break;
        }
        
        case "excel": {
          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.json_to_sheet(parsed);
          XLSX.utils.book_append_sheet(wb, ws, "Records");
          
          const excelData = XLSX.write(wb, { bookType: "xlsx", type: "array" });
          folder.file(`${ledgerName}.xlsx`, excelData);
          break;
        }
        case "summary": {
          const pdfData = await exportSummaryPDF(true, parsed, ledgerName);
          if (pdfData) folder.file(`${ledgerName}.pdf`, pdfData);
          break;
        };
        /*case "pdf": {
          const { jsPDF } = window.jspdf;
          
          // Loop through each ledger individually
          for (const ledgerName of ledgers) {
            const value = localStorage.getItem(ledgerName);
            if (!value) continue;
            
            try {
              const parsed = JSON.parse(value);
              const doc = new jsPDF();
              
              // ====== THEME COLORS FROM CSS ======
              const rootStyles = getComputedStyle(document.documentElement);
              const primaryColor = rootStyles.getPropertyValue("--primary-color")?.trim() || "#6a0dad";
              const secondaryColor = rootStyles.getPropertyValue("--secondary-color")?.trim() || "#f3e8ff";
              const textColor = rootStyles.getPropertyValue("--text-color")?.trim() || "#000000";
              
              // ====== META DATA ======
              const downloadDate = new Date().toLocaleString();
              const appURL = window.location.href;
              
              // ====== HEADER ======
              doc.setFontSize(20).setTextColor(primaryColor).setFont(undefined, "bold");
              doc.text("Vault Ledger Report", 14, 15);
              doc.setFontSize(12).setTextColor(textColor).setFont(undefined, "normal");
              doc.text(`Ledger Name: ${ledgerName}`, 14, 25);
              doc.text(`Date of Download: ${downloadDate}`, 14, 37);
              doc.text(`URL: ${appURL}`, 14, 43);
              
              // ====== TABLE (built from data, not DOM) ======
              doc.autoTable({
                head: [
                  ["Sl.No", "Date", "Account", "Description", "Type", "Debit", "Credit", "Closing Balance"]
                ],
                body: (() => {
                  // ====== DATE RANGE FILTER ======
                  const startInput = document.getElementById("startDate");
                  const endInput = document.getElementById("endDate");
                  
                  const startDate = startInput?.value ? new Date(startInput.value) : null;
                  const endDate = endInput?.value ? new Date(endInput.value) : null;
                  
                  const data = (startDate || endDate) ?
                    parsed.filter(entry => {
                      const entryDate = new Date(entry.date);
                      if (startDate && entryDate < startDate) return false;
                      if (endDate && entryDate > endDate) return false;
                      return true;
                    }) :
                    parsed;
                  const displayData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
                  if (isUsingFilter && displayData.length > 0) {
                    const ledgerSorted = [...ledger].sort((a, b) => new Date(a.date) - new Date(b.date));
                    const firstLedgerDate = new Date(ledgerSorted[0].date);
                    const firstDisplayDate = new Date(displayData[0].date);
                    
                    if (firstDisplayDate > firstLedgerDate) {
                      // ✅ Only consider transactions BEFORE the filter's first date  
                      const beforeRange = ledgerSorted.filter(txn => new Date(txn.date) < firstDisplayDate);
                      
                      // Compute closing balance of all previous transactions  
                      const openingBalance = getClosingBalance(beforeRange);
                      
                      // Inject opening balance entry dated exactly at filter start  
                      displayData.unshift({
                        date: firstDisplayDate.toISOString().split("T")[0], // ensures it matches filter start date  
                        type: "income",
                        desc: "Opening Balance",
                        amount: openingBalance,
                        account: "Balance Diff"
                      });
                    }
                  }
                  
                  // ====== Closing Balance Calculation ======
                  let closingBalance = 0;
                  return displayData.map((entry, idx) => {
                    if (entry.type === "income") {
                      closingBalance += entry.amount;
                    } else if (entry.type === "expense") {
                      closingBalance -= entry.amount;
                    }
                    return [
                      idx + 1,
                      entry.date,
                      entry.account,
                      entry.desc,
                      entry.type,
                      entry.type === "expense" ? entry.amount : "-",
                      entry.type === "income" ? entry.amount : "-",
                      closingBalance.toFixed(2) // dynamically calculated closing balance
                    ];
                  });
                })(),
                startY: 50,
                styles: { fontSize: 10, textColor: textColor, lineColor: primaryColor, lineWidth: 0.2 },
                headStyles: { fillColor: primaryColor, textColor: "#ffffff", fontStyle: "bold" },
                bodyStyles: { fillColor: secondaryColor },
                alternateRowStyles: { fillColor: "#ffffff" },
              });
              
              let y = doc.lastAutoTable.finalY + 10;
              
              // ====== SUMMARY (calculated from parsed ledger) ======
              let totalIncome = 0,
                totalExpense = 0;
              parsed.forEach(entry => {
                if (entry.type === "income") totalIncome += entry.amount;
                else if (entry.type === "expense") totalExpense += entry.amount;
              });
              const finalBalance = totalIncome - totalExpense;
              
              doc.setFontSize(14).setTextColor(primaryColor).setFont(undefined, "bold");
              doc.text("Summary", 14, y);
              
              doc.setFontSize(12).setTextColor(textColor);
              doc.text(`Total Income: ${currencySymbol} ${totalIncome.toFixed(2)}`, 14, y + 8);
              doc.text(`Total Expense: ${currencySymbol} ${totalExpense.toFixed(2)}`, 14, y + 16);
              doc.text(`Final Balance: ${currencySymbol} ${finalBalance.toFixed(2)}`, 14, y + 24);
              
              // ====== FOOTER ======
              doc.setFontSize(10).setTextColor("#666666").setFont(undefined, "italic");
              doc.text("Generated by Vault Ledger App", 14, 290);
              
              // Save PDF into ZIP
              const pdfData = doc.output("arraybuffer");
              folder.file(`${ledgerName}.pdf`, pdfData);
            } catch (e) {
              console.warn(`Skipping PDF for ${ledgerName}, invalid JSON`, e);
            }
          }
          break;
        }*/
        
        case "pdf": {
          const { jsPDF } = window.jspdf;
          
          for (const ledgerName of ledgers) {
            const value = localStorage.getItem(ledgerName);
            if (!value) continue;
            
            try {
              const parsed = JSON.parse(value);
              const doc = new jsPDF();
              
              // ===== THEME COLORS =====
              const rootStyles = getComputedStyle(document.documentElement);
              const primaryColor = rootStyles.getPropertyValue("--primary-color")?.trim() || "#6a0dad";
              const secondaryColor = rootStyles.getPropertyValue("--secondary-color")?.trim() || "#f3e8ff";
              const textColor = rootStyles.getPropertyValue("--text-color")?.trim() || "#000000";
              
              // ===== META =====
              const downloadDate = new Date().toLocaleString();
              const appURL = window.location.href;
              
              // ===== HEADER =====
              doc.setFontSize(20).setTextColor(primaryColor).setFont(undefined, "bold");
              doc.text("Vault Ledger Report", 14, 15);
              
              doc.setFontSize(12).setTextColor(textColor).setFont(undefined, "normal");
              doc.text(`Ledger Name: ${ledgerName}`, 14, 25);
              doc.text(`Date of Download: ${downloadDate}`, 14, 37);
              doc.text(`URL: ${appURL}`, 14, 43);
              
              // ===== DATE RANGE =====
              const startInput = document.getElementById("startDate");
              const endInput = document.getElementById("endDate");
              
              const startDate = startInput?.value ? new Date(startInput.value) : null;
              const endDate = endInput?.value ? new Date(endInput.value) : null;
              
              // ===== FILTERED DATA =====
              const filtered = (startDate || endDate) ?
                parsed.filter(txn => {
                  const d = new Date(txn.date);
                  if (startDate && d < startDate) return false;
                  if (endDate && d > endDate) return false;
                  return true;
                }) :
                parsed;
              
              let displayData = [...filtered].sort(
                (a, b) => new Date(a.date) - new Date(b.date)
              );
              
              // ===== OPENING BALANCE =====
              let openingBalance = 0;
              
              if (isUsingFilter && displayData.length > 0) {
                const ledgerSorted = [...parsed].sort(
                  (a, b) => new Date(a.date) - new Date(b.date)
                );
                
                const firstDisplayDate = new Date(displayData[0].date);
                
                const beforeRange = ledgerSorted.filter(
                  txn => new Date(txn.date) < firstDisplayDate
                );
                
                openingBalance = getClosingBalance(beforeRange);
                
                displayData.unshift({
                  date: firstDisplayDate.toISOString().split("T")[0],
                  type: "opening",
                  desc: "Opening Balance",
                  amount: openingBalance,
                  account: "Balance Diff"
                });
              }
              
              // ===== TABLE =====
              let closingBalance = 0;
              
              doc.autoTable({
                head: [
                  ["Sl.No", "Date", "Account", "Description", "Type", "Debit", "Credit", "Closing Balance"]
                ],
                body: displayData.map((entry, idx) => {
                  if (entry.type === "opening") {
                    closingBalance = entry.amount;
                  } else if (entry.type === "income") {
                    closingBalance += entry.amount;
                  } else if (entry.type === "expense") {
                    closingBalance -= entry.amount;
                  }
                  
                  return [
                    idx + 1,
                    entry.date,
                    entry.account,
                    entry.desc,
                    entry.type === "opening" ? "-" : entry.type,
                    entry.type === "expense" ? entry.amount : "-",
                    entry.type === "income" ? entry.amount : "-",
                    closingBalance.toFixed(2)
                  ];
                }),
                startY: 50,
                styles: {
                  fontSize: 10,
                  textColor: textColor,
                  lineColor: primaryColor,
                  lineWidth: 0.2
                },
                headStyles: {
                  fillColor: primaryColor,
                  textColor: "#ffffff",
                  fontStyle: "bold"
                },
                bodyStyles: { fillColor: secondaryColor },
                alternateRowStyles: { fillColor: "#ffffff" }
              });
              
              // ===== SUMMARY (RECONCILED WITH TABLE) =====
              let totalIncome = 0;
              let totalExpense = 0;
              
              // Income & expense only from filtered data
              filtered.forEach(txn => {
                if (txn.type === "income") totalIncome += txn.amount;
                else if (txn.type === "expense") totalExpense += txn.amount;
              });
              
              // openingBalance was already calculated earlier
              const closingSummaryBalance =
                openingBalance + totalIncome - totalExpense;
              
              let y = doc.lastAutoTable.finalY + 10;
              
              doc.setFontSize(14).setTextColor(primaryColor).setFont(undefined, "bold");
              doc.text("Summary", 14, y);
              
              doc.setFontSize(12).setTextColor(textColor).setFont(undefined, "normal");
              doc.text(`Opening Balance: ${currencySymbol} ${openingBalance.toFixed(2)}`, 14, y + 8);
              doc.text(`Total Income: ${currencySymbol} ${totalIncome.toFixed(2)}`, 14, y + 16);
              doc.text(`Total Expense: ${currencySymbol} ${totalExpense.toFixed(2)}`, 14, y + 24);
              doc.text(`Closing Balance: ${currencySymbol} ${closingSummaryBalance.toFixed(2)}`, 14, y + 32);
              // ===== FOOTER =====
              doc.setFontSize(10).setTextColor("#666666").setFont(undefined, "italic");
              doc.text("Generated by Vault Ledger App", 14, 290);
              
              // ===== SAVE =====
              const pdfData = doc.output("arraybuffer");
              folder.file(`${ledgerName}.pdf`, pdfData);
              
            } catch (e) {
              console.warn(`Skipping PDF for ${ledgerName}, invalid JSON`, e);
            }
          }
          break;
        }
        
        case "png": {
          const tempTable = document.createElement("table");
          const headerRow = document.createElement("tr");
          ["Date", "Account", "Description", "Type", "Amount"].forEach(h => {
            const th = document.createElement("th");
            th.textContent = h;
            headerRow.appendChild(th);
          });
          tempTable.appendChild(headerRow);
          
          parsed.forEach(entry => {
            const tr = document.createElement("tr");
            [entry.date, entry.account, entry.description, entry.type, entry.amount].forEach(val => {
              const td = document.createElement("td");
              td.textContent = val;
              tr.appendChild(td);
            });
            tempTable.appendChild(tr);
          });
          
          const canvas = await html2canvas(tempTable, { scale: 2 });
          const pngData = canvas.toDataURL("image/png").split(",")[1];
          folder.file(`${ledgerName}.png`, pngData, { base64: true });
          break;
        }
      }
    } catch (e) {
      console.warn(`Skipping ${ledgerName}, invalid JSON`, e);
    }
  }
  
  const id = Date.now();
  zip.generateAsync({ type: "blob" }).then(content => {
    saveAs(content, `${id}_all_ledgers_${format}.zip`);
  });
}

function setToday() {
  const dateInput = document.getElementById('date');
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;
  return today;
  
}

function handleDateRangeChange() {
  const range = document.getElementById("dateRange").value;
  const startInput = document.getElementById("startDate");
  const endInput = document.getElementById("endDate");
  const customFields = document.getElementById("customDateFields");
  
  const today = new Date();
  let from = "",
    to = "";
  
  // Helpers
  const fmt = d => d.toISOString().split("T")[0]; // YYYY-MM-DD for input[type=date]
  const startOfMonth = d => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = d => new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const startOfQuarter = d => new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
  const endOfQuarter = d => new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3 + 3, 0);
  const startOfHalfYear = d => d.getMonth() < 6 ? new Date(d.getFullYear(), 0, 1) : new Date(d.getFullYear(), 6, 1);
  const endOfHalfYear = d => d.getMonth() < 6 ? new Date(d.getFullYear(), 5, 30) : new Date(d.getFullYear(), 11, 31);
  const startOfFY = d => (d.getMonth() < 3 ? new Date(d.getFullYear() - 1, 3, 1) : new Date(d.getFullYear(), 3, 1)); // FY Apr–Mar
  const endOfFY = d => (d.getMonth() < 3 ? new Date(d.getFullYear(), 2, 31) : new Date(d.getFullYear() + 1, 2, 31));
  
  switch (range) {
    case "today":
      from = to = today;
      break;
    case "yesterday":
      from = new Date(today); // clone today
      from.setDate(today.getDate() - 1);
      to = new Date(from); // copy "from" so both match
      break;
    case "thisWeek":
      from = new Date(today);
      from.setDate(today.getDate() - today.getDay());
      to = new Date();
      break;
    case "prevWeek":
      from = new Date(today);
      from.setDate(today.getDate() - today.getDay() - 7);
      to = new Date(from);
      to.setDate(from.getDate() + 6);
      break;
    case "thisMonth":
      from = startOfMonth(today);
      to = endOfMonth(today);
      break;
    case "prevMonth":
      from = startOfMonth(new Date(today.getFullYear(), today.getMonth() - 1, 1));
      to = endOfMonth(new Date(today.getFullYear(), today.getMonth() - 1, 1));
      break;
    case "thisQuarter":
      from = startOfQuarter(today);
      to = endOfQuarter(today);
      break;
    case "prevQuarter":
      let prevQ = new Date(today.getFullYear(), today.getMonth() - 3, 1);
      from = startOfQuarter(prevQ);
      to = endOfQuarter(prevQ);
      break;
    case "thisHalfYear":
      from = startOfHalfYear(today);
      to = endOfHalfYear(today);
      break;
    case "prevHalfYear":
      let prevHY = today.getMonth() < 6 ? new Date(today.getFullYear() - 1, 6, 1) : new Date(today.getFullYear(), 0, 1);
      from = startOfHalfYear(prevHY);
      to = endOfHalfYear(prevHY);
      break;
    case "thisFY":
      from = startOfFY(today);
      to = endOfFY(today);
      break;
    case "prevFY":
      let prevFY = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      from = startOfFY(prevFY);
      to = endOfFY(prevFY);
      break;
    case "thisCY":
      from = new Date(today.getFullYear(), 0, 1);
      to = new Date(today.getFullYear(), 11, 31);
      break;
    case "prevCY":
      from = new Date(today.getFullYear() - 1, 0, 1);
      to = new Date(today.getFullYear() - 1, 11, 31);
      break;
    case "tillDate":
      if (ledger.length > 0) {
        // Sort by date to find min and max
        const sorted = [...ledger].sort((a, b) => new Date(a.date) - new Date(b.date));
        from = new Date(sorted[0].date); // first entry date
        to = new Date(sorted[sorted.length - 1].date); // last entry date
      } else {
        from = to = today; // fallback if ledger is empty
      }
      break;
    case "custom":
    default:
      customFields.style.display = "block";
      return; // Don't overwrite manual input
  }
  
  // Hide custom date fields when not needed
  customFields.style.display = "none";
  
  // Set values to inputs
  startInput.value = fmt(from);
  endInput.value = fmt(to);
  
  // Apply filter immediately
  applyFilters();
}

function applyFilters() {
  isUsingFilter = true;
  
  const desc = document.getElementById('searchDesc').value.toLowerCase();
  const type = document.getElementById('filterType').value;
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const minAmount = parseFloat(document.getElementById('minAmount').value);
  const maxAmount = parseFloat(document.getElementById('maxAmount').value);
  const selectedAccount = document.getElementById('filter-accounts').value;
  
  const filtered = ledger.filter(entry => {
    const matchesDesc = desc ? entry.desc.toLowerCase().includes(desc) : true;
    const matchesType = type ? entry.type === type : true;
    const matchesStart = startDate ? entry.date >= startDate : true;
    const matchesEnd = endDate ? entry.date <= endDate : true;
    const matchesMinAmount = !isNaN(minAmount) ? entry.amount >= minAmount : true;
    const matchesMaxAmount = !isNaN(maxAmount) ? entry.amount <= maxAmount : true;
    const matchesAccount = selectedAccount ? entry.account === selectedAccount : true;
    
    return (
      matchesDesc &&
      matchesType &&
      matchesStart &&
      matchesEnd &&
      matchesMinAmount &&
      matchesMaxAmount &&
      matchesAccount
    );
  });
  
  globalFilterData = filtered;
  renderTable(filtered);
  renderCharts(filtered);
  renderReports(filtered);
  renderAdvancedReports(filtered);
  updateSpecialInsights(filtered);
}

function clearFilters() {
  isUsingFilter = false;
  document.getElementById('searchDesc').value = '';
  document.getElementById('filterType').value = '';
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  document.getElementById('minAmount').value = '';
  document.getElementById('maxAmount').value = '';
  document.getElementById('filter-accounts').value = '';
  
  const dateRange = document.getElementById("dateRange");
  dateRange.value = getSetting("defaultFilter", "thisMonth");
  handleDateRangeChange();
  refreshReports();
}

function saveToLocalStorage() {
  localStorage.setItem(currentLedgerKey, JSON.stringify(ledger));
  localStorage.setItem("fileName_" + currentLedgerKey, fileName);
  
  const account = document.getElementById("account").value;
  localStorage.setItem("lastSelectedAccount", account);
}

function saveLastState() {
  lastState = JSON.stringify(ledger);
  redoState = null; // Clear redo history on new action
}

function undoChange() {
  if (lastState) {
    redoState = JSON.stringify(ledger);
    ledger = JSON.parse(lastState);
    lastState = null;
    renderTable();
    applyFilters();
  } else {
    alert("Nothing to undo");
  }
}

function redoChange() {
  if (redoState) {
    lastState = JSON.stringify(ledger);
    ledger = JSON.parse(redoState);
    redoState = null;
    renderTable();
    applyFilters();
    
  } else {
    alert("Nothing to redo");
  }
}



let pieChart, barChart, lineChart;

function renderCharts(data = ledger) {
  const ctxPie = document.getElementById("pieChart").getContext("2d");
  const ctxBar = document.getElementById("barChart").getContext("2d");
  const ctxLine = document.getElementById("lineChart").getContext("2d");
  
  let totalIncome = 0;
  let totalExpense = 0;
  let balance = 0;
  let monthlyTotals = {};
  let balanceOverTime = [];
  
  const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  sortedData.forEach(entry => {
    const month = new Date(entry.date).toISOString().slice(0, 7); // YYYY-MM
    if (!monthlyTotals[month]) monthlyTotals[month] = { income: 0, expense: 0 };
    
    if (entry.type === "income") {
      totalIncome += entry.amount;
      monthlyTotals[month].income += entry.amount;
      balance += entry.amount;
    } else {
      totalExpense += entry.amount;
      monthlyTotals[month].expense += entry.amount;
      balance -= entry.amount;
    }
    
    balanceOverTime.push({ date: entry.date, balance });
  });
  
  // Destroy old charts if exist
  pieChart?.destroy();
  barChart?.destroy();
  lineChart?.destroy();
  
  pieChart = new Chart(ctxPie, {
    type: "pie",
    data: {
      labels: ["Income", "Expense"],
      datasets: [{
        data: [totalIncome, totalExpense],
        backgroundColor: ["#4caf50", "#f44336"]
      }]
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: "Income vs Expense" } }
    }
  });
  
  barChart = new Chart(ctxBar, {
    type: "bar",
    data: {
      labels: Object.keys(monthlyTotals),
      datasets: [
      {
        label: "Income",
        data: Object.values(monthlyTotals).map(m => m.income),
        backgroundColor: "#4caf50"
      },
      {
        label: "Expense",
        data: Object.values(monthlyTotals).map(m => m.expense),
        backgroundColor: "#f44336"
      }]
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: "Monthly Totals" } },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
  
  lineChart = new Chart(ctxLine, {
    type: "line",
    data: {
      labels: balanceOverTime.map(item => item.date),
      datasets: [{
        label: "Balance Over Time",
        data: balanceOverTime.map(item => item.balance),
        borderColor: "#2196f3",
        fill: false
      }]
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: "Balance Trend" } },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
  const pie = document.getElementById("pieChart-container");
  const bar = document.getElementById("barChart-container");
  const line = document.getElementById("lineChart-container");
  
  if (pie) {
    pie.style.display = getSetting("chartShowPie", true) ? "block" : "none";
  }
  
  if (bar) {
    bar.style.display = getSetting("chartShowBar", true) ? "block" : "none";
  }
  
  if (line) {
    line.style.display = getSetting("chartShowLine", true) ? "block" : "none";
  }
}

function renderBudgetPlan() {
  const planCard = document.getElementById("budgetPlan");
  // Get settings
  const monthlyBudget = parseFloat(getSetting("monthlyBudget", 0)) || 0;
  const preferredLedgers = settings?.budgetPreferredLedgers?.selected || [];
  // Hide if invalid
  if (monthlyBudget <= 0) {
    planCard.classList.add("hidden");
    return;
  }
  
  // Check if current ledger is in preferred list
  if (!preferredLedgers.includes(currentLedgerKey)) {
    planCard.classList.add("hidden");
    return;
  }
  
  // Calculate this month’s expenses
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  
  let totalExpenses = 0;
  if (Array.isArray(ledger)) {
    ledger.forEach(tx => {
      const txDate = new Date(tx.date);
      if (
        tx.type === "expense" &&
        txDate.getMonth() === thisMonth &&
        txDate.getFullYear() === thisYear
      ) {
        totalExpenses += parseFloat(tx.amount) || 0;
      }
    });
  }
  // Update HTML
  document.getElementById("budgetExpenses").textContent = currencySymbol + totalExpenses.toFixed(2);
  document.getElementById("budgetLimit").textContent = currencySymbol + monthlyBudget.toFixed(2);
  document.getElementById("budgetRemaining").textContent = currencySymbol + (monthlyBudget - totalExpenses).toFixed(2);
  const remaining = (monthlyBudget - totalExpenses).toFixed(2);
  const remainingEl = document.getElementById("budgetRemaining");
  
  // Budget status responses
  const goodResponses = [
    "✅ Great! You're on track with your budget.",
    "💰 Spending is under control this month.",
    "🎯 Perfect! You’re within your planned budget.",
    "👏 Excellent, your finances are balanced."
  ];
  const badResponses = [
    "⚠️ Uh-oh! You’ve exceeded your budget.",
    "❌ Careful! Spending has crossed the limit.",
    "🚨 Budget breached — time to cut expenses.",
    "😬 Too much spent, watch your finances closely!"
  ];
  
  const statusEl = document.getElementById("budgetStatus");
  if (remaining >= 0) {
    remainingEl.classList.remove("danger");
    statusEl.textContent = goodResponses[Math.floor(Math.random() * goodResponses.length)];
    statusEl.className = "";
  } else {
    remainingEl.classList.add("danger");
    statusEl.textContent = badResponses[Math.floor(Math.random() * badResponses.length)];
    statusEl.className = "danger";
  }
  
  planCard.classList.remove("hidden");
  
}

function downloadChart(chartId) {
  const canvas = document.getElementById(chartId);
  if (!canvas) return;
  
  const image = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = image;
  link.download = `${fileName || "chart"}_${chartId}.png`;
  link.click();
}

document.getElementById("filename").addEventListener("input", function() {
  fileName = this.value; // Update global var
});

function updateLedgerSelect() {
  clearFilters();
  const select = document.getElementById("ledgerSelect");
  let ledgers = JSON.parse(localStorage.getItem("ledgers") || "[]");
  
  // ✅ Remove duplicates
  ledgers = [...new Set(ledgers)].sort((a, b) => a.localeCompare(b));
  
  // ✅ Save cleaned list
  localStorage.setItem("ledgers", JSON.stringify(ledgers));
  
  // ✅ Clear existing options
  select.innerHTML = "";
  
  // ✅ Re-populate options
  ledgers.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    if (name === currentLedgerKey) option.selected = true;
    select.appendChild(option);
  });
  
  // ✅ Update global var + UI
  fileName = currentLedgerKey;
  document.getElementById("filename").value = currentLedgerKey;
}

async function createNewLedger() {
  clearFilters();
  const ledgerName = prompt("Enter new ledger name:");
  if (!ledgerName) {
    alert("Please enter a valid ledger name.");
    return;
  }
  
  let ledgers = JSON.parse(localStorage.getItem("ledgers") || "[]");
  ledgers = [...new Set(ledgers)];
  
  if (ledgers.includes(ledgerName)) {
    alert("A ledger with that name already exists. Choose a different name.");
    return;
  }
  
  const newLedger = [{
    id: await generateTransactionId(getCurrentDate(), "Opening Balance", 0),
    account: 'Capital',
    date: getCurrentDate(),
    desc: "Opening Balance",
    type: "Income",
    amount: 0
  }];
  
  ledgers.push(ledgerName);
  localStorage.setItem("ledgers", JSON.stringify(ledgers));
  localStorage.setItem(ledgerName, JSON.stringify(newLedger));
  
  currentLedgerKey = ledgerName;
  fileName = ledgerName;
  document.getElementById("filename").value = fileName;
  
  localStorage.setItem("currentLedgerKey", currentLedgerKey);
  ledger = newLedger;
  
  updateLedgerSelect();
  renderTable();
  renderCharts(ledger);
}
// 📥 Change selected ledger
document.getElementById("ledgerSelect").addEventListener("change", function(e) {
  const selected = e.target.value;
  if (!selected) return;
  
  const data = JSON.parse(localStorage.getItem(selected) || "[]");
  currentLedgerKey = selected;
  localStorage.setItem("currentLedgerKey", currentLedgerKey);
  ledger = data;
  document.getElementById("filename").value = currentLedgerKey;
  
  renderTable();
  applyFilters();
  renderCharts(ledger);
});

function applySettings() {
  const format = document.getElementById("exportFormat");
  format.value = getSetting('exportFormat', 'json');
  
  const range = document.getElementById("dateRange");
  range.value = getSetting('defaultFilter', "thisMonth");
  
  currencySymbol = getSetting('currencySymbol', "₹");
  
}
// ▶️ Init on load
// 🧠 Bind + New Ledger button
document.getElementById("newLedgerBtn").addEventListener("click", createNewLedger);

// 🕒 Helper: get today's date in yyyy-mm-dd
function getCurrentDate() {
  return new Date().toISOString().split("T")[0];
}

document.getElementById("filename").addEventListener("change", function() {
  const newName = this.value.trim();
  if (!newName) return alert("Filename can't be empty.");
  if (newName === currentLedgerKey) return; // No change
  
  let ledgers = JSON.parse(localStorage.getItem("ledgers") || "[]");
  if (ledgers.includes(newName)) {
    alert("Ledger name already exists.");
    this.value = currentLedgerKey;
    return;
  }
  
  // Rename in localStorage
  const data = localStorage.getItem(currentLedgerKey);
  localStorage.setItem(newName, data);
  localStorage.removeItem(currentLedgerKey);
  
  // Update ledger list
  ledgers = ledgers.map(name => name === currentLedgerKey ? newName : name);
  localStorage.setItem("ledgers", JSON.stringify(ledgers));
  
  // Update key trackers
  currentLedgerKey = newName;
  fileName = newName;
  localStorage.setItem("currentLedgerKey", newName);
  
  // Update UI
  updateLedgerSelect();
});

function deleteLedger(ledgerName) {
  // Remove from localStorage
  localStorage.removeItem(ledgerName);
  
  // Remove from ledger list
  let ledgers = JSON.parse(localStorage.getItem("ledgers") || "[]");
  ledgers = ledgers.filter(key => key !== ledgerName);
  localStorage.setItem("ledgers", JSON.stringify(ledgers));
  
  // Reset variables and UI
  ledger = [];
  currentLedgerKey = "";
  fileName = "";
  
  const ledgerSelect = document.getElementById("ledgerSelect");
  
  // If no ledgers left, create new untitled
  if (ledgers.length === 0) {
    const untitledKey = getSetting("defaultFileName", "Untitled");
    localStorage.setItem("ledgers", JSON.stringify([untitledKey]));
    localStorage.setItem(untitledKey, JSON.stringify([]));
    
    fileName = untitledKey;
    currentLedgerKey = untitledKey;
    ledger = [];
    renderTable();
    renderCharts();
  } else {
    // Load first remaining ledger
    currentLedgerKey = ledgers[0];
    fileName = currentLedgerKey.replace("ledger_", "");
    ledger = JSON.parse(localStorage.getItem(currentLedgerKey)) || [];
    renderTable();
    renderCharts();
  }
  
  // ✅ Update UI elements
  ledgerSelect.value = currentLedgerKey; // ← set selected <option>
  updateLedgerSelect();
  document.getElementById("filename").value = fileName; // ← update filename input
  transactions.push(1);
  hasUnsavedChanges = true;
}
document.getElementById("deleteLedgerBtn").addEventListener("click", () => {
  if (!currentLedgerKey) return alert("No ledger selected to delete.");
  const hasLinked = ledger.some(tx => tx.transactionType === "linked-transaction");
  if (hasLinked && !getSetting('allowDeleteLedger', false)) {
    alert("Cannot delete the current Ledger because of linked-transactions, please delete them first");
    return;
  }
  const confirmation = confirm(`Are you sure you want to delete "${currentLedgerKey}"?`);
  if (!confirmation) return;
  
  deleteLedger(currentLedgerKey);
});




function generateReports(data) {
  let dailyTotals = {};
  let monthlyTotals = {};
  let yearlyTotals = {};
  let incomes = [];
  let expenses = [];
  
  data.forEach(txn => {
    let dateObj = new Date(txn.date);
    let dayKey = txn.date;
    let monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}`;
    let yearKey = dateObj.getFullYear();
    
    // Group totals
    if (txn.type === "income") {
      incomes.push(txn.amount);
      dailyTotals[dayKey] = (dailyTotals[dayKey] || { income: 0, expense: 0 });
      dailyTotals[dayKey].income += txn.amount;
      
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || { income: 0, expense: 0 });
      monthlyTotals[monthKey].income += txn.amount;
      
      yearlyTotals[yearKey] = (yearlyTotals[yearKey] || { income: 0, expense: 0 });
      yearlyTotals[yearKey].income += txn.amount;
    } else {
      expenses.push(txn.amount);
      dailyTotals[dayKey] = (dailyTotals[dayKey] || { income: 0, expense: 0 });
      dailyTotals[dayKey].expense += txn.amount;
      
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || { income: 0, expense: 0 });
      monthlyTotals[monthKey].expense += txn.amount;
      
      yearlyTotals[yearKey] = (yearlyTotals[yearKey] || { income: 0, expense: 0 });
      yearlyTotals[yearKey].expense += txn.amount;
    }
  });
  
  // Averages
  const avgDailyIncome = (Object.values(dailyTotals).reduce((sum, day) => sum + day.income, 0) / Object.keys(dailyTotals).length) || 0;
  const avgDailyExpense = (Object.values(dailyTotals).reduce((sum, day) => sum + day.expense, 0) / Object.keys(dailyTotals).length) || 0;
  
  const avgMonthlyIncome = (Object.values(monthlyTotals).reduce((sum, m) => sum + m.income, 0) / Object.keys(monthlyTotals).length) || 0;
  const avgMonthlyExpense = (Object.values(monthlyTotals).reduce((sum, m) => sum + m.expense, 0) / Object.keys(monthlyTotals).length) || 0;
  
  const avgYearlyIncome = (Object.values(yearlyTotals).reduce((sum, y) => sum + y.income, 0) / Object.keys(yearlyTotals).length) || 0;
  const avgYearlyExpense = (Object.values(yearlyTotals).reduce((sum, y) => sum + y.expense, 0) / Object.keys(yearlyTotals).length) || 0;
  
  // Min/Max
  const highestIncome = incomes.length ? Math.max(...incomes) : 0;
  const lowestIncome = incomes.length ? Math.min(...incomes) : 0;
  const highestExpense = expenses.length ? Math.max(...expenses) : 0;
  const lowestExpense = expenses.length ? Math.min(...expenses) : 0;
  
  return {
    avgDailyIncome,
    avgDailyExpense,
    avgMonthlyIncome,
    avgMonthlyExpense,
    avgYearlyIncome,
    avgYearlyExpense,
    highestIncome,
    lowestIncome,
    highestExpense,
    lowestExpense
  };
}

function renderReports(data = ledger) {
  const reports = generateReports(data);
  const reportsDiv = document.getElementById("reportsOutput");
  reportsDiv.innerHTML = `
    <p class="line"><strong>Daily Avg:</strong> Income ${currencySymbol} ${reports.avgDailyIncome.toFixed(2)}, Expense ${currencySymbol} ${reports.avgDailyExpense.toFixed(2)}</p>
    <p class="line"><strong>Monthly Avg:</strong> Income ${currencySymbol} ${reports.avgMonthlyIncome.toFixed(2)}, Expense ${currencySymbol} ${reports.avgMonthlyExpense.toFixed(2)}</p>
    <p class="line"><strong>Yearly Avg:</strong> Income ${currencySymbol} ${reports.avgYearlyIncome.toFixed(2)}, Expense ${currencySymbol} ${reports.avgYearlyExpense.toFixed(2)}</p>
    <p class="line"><strong>Highest:</strong> Income ${currencySymbol} ${reports.highestIncome}, Expense ${currencySymbol} ${reports.highestExpense}</p>
    <p class="line"><strong>Lowest:</strong> Income ${currencySymbol} ${reports.lowestIncome}, Expense ${currencySymbol} ${reports.lowestExpense}</p>
  `;
}

function generateAdvancedReports(data = ledger) {
  // Separate income & expense transactions
  const incomes = data.filter(txn => txn.type === "income");
  const expenses = data.filter(txn => txn.type === "expense");
  
  // Top 5 incomes & expenses (with all details)
  const topIncomes = [...incomes].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const topExpenses = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);
  
  // Frequent transactions (by account only)
  const accountCount = {};
  data.forEach(txn => {
    let account = txn.account?.trim() || "No Account";
    accountCount[account] = (accountCount[account] || 0) + 1;
  });
  const frequentTransactions = Object.entries(accountCount)
    .filter(([account, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);
  
  // Recurring transactions (same account + amount + type)
  const recurringMap = {};
  data.forEach(txn => {
    let account = txn.account?.trim() || "No Account";
    const key = JSON.stringify({ account, amount: txn.amount, type: txn.type });
    if (!recurringMap[key]) {
      recurringMap[key] = { ...txn, count: 0 };
    }
    recurringMap[key].count++;
  });
  
  const recurringTransactions = Object.values(recurringMap).filter(r => r.count > 1);
  
  return { topIncomes, topExpenses, frequentTransactions, recurringTransactions };
}

function renderAdvancedReports(data = ledger) {
  const { topIncomes, topExpenses, frequentTransactions, recurringTransactions } = generateAdvancedReports(data);
  
  // Top incomes
  document.getElementById("topIncomesList").innerHTML = topIncomes.length ?
    topIncomes
    .map(
      txn =>
      `<li>${txn.account} | ${txn.desc} – ${currencySymbol} ${txn.amount} on ${txn.date}</li>`
    )
    .join("") :
    "<li>No transactions found</li>";
  
  // Top expenses
  document.getElementById("topExpensesList").innerHTML = topExpenses.length ?
    topExpenses
    .map(
      txn =>
      `<li>${txn.account} | ${txn.desc} – ${currencySymbol} ${txn.amount} on ${txn.date}</li>`
    )
    .join("") :
    "<li>No transactions found</li>";
  
  // Frequent accounts
  document.getElementById("frequentList").innerHTML = frequentTransactions.length ?
    frequentTransactions
    .map(([account, count]) => `<li>${account} – ${count} transactions</li>`)
    .join("") :
    "<li>No transactions found</li>";
  
  // Recurring
  document.getElementById("recurringList").innerHTML = recurringTransactions.length ?
    recurringTransactions
    .map(
      txn =>
      `<li>${txn.date} | ${txn.account} | ${txn.desc} – ${currencySymbol} ${txn.amount} (${txn.count} times)</li>`
    )
    .join("") :
    "<li>No transactions found</li>";
}

function generateUpcomingExpectations(data) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const lastMonth = (currentMonth - 1 + 12) % 12;
  const currentYear = now.getFullYear();
  const lastMonthYear = lastMonth === 11 ? currentYear - 1 : currentYear;
  
  // Filter last month's transactions
  const lastMonthData = data.filter(txn => {
    const txnDate = new Date(txn.date);
    return txnDate.getMonth() === lastMonth && txnDate.getFullYear() === lastMonthYear;
  });
  
  // Group last month's transactions by desc + amount + type
  const recurringMap = {};
  lastMonthData.forEach(txn => {
    let desc = txn.desc?.trim() || "No Description";
    const key = JSON.stringify({ desc, amount: txn.amount, type: txn.type });
    recurringMap[key] = (recurringMap[key] || 0) + 1;
  });
  
  // Get current month's transactions
  const currentMonthData = data.filter(txn => {
    const txnDate = new Date(txn.date);
    return txnDate.getMonth() === currentMonth && txnDate.getFullYear() === currentYear;
  });
  const currentMonthKeys = new Set(
    currentMonthData.map(txn => JSON.stringify({ desc: txn.desc?.trim() || "No Description", amount: txn.amount, type: txn.type }))
  );
  
  // Expected transactions for this month (not yet recorded)
  const expectedTransactions = Object.entries(recurringMap)
    .filter(([key, count]) => count >= 1 && !currentMonthKeys.has(key))
    .map(([key]) => JSON.parse(key));
  
  return expectedTransactions;
}

function renderUpcomingExpectations(data = ledger) {
  const upcoming = generateUpcomingExpectations(data);
  
  document.getElementById("upcomingList").innerHTML = upcoming.length ?
    upcoming.map(txn => `<li>${txn.desc} – ${currencySymbol} ${txn.amount} (${txn.type})</li>`).join("") :
    "<li>No upcoming expected transactions found</li>";
}


// ===== Special Insights =====
function updateSpecialInsights(data = ledger) {
  if (!data.length) {
    document.getElementById("highestIncome").innerHTML = "<strong>Highest Income:</strong> No data found";
    document.getElementById("highestExpense").innerHTML = "<strong>Highest Expense:</strong> No data found";
    document.getElementById("zeroDays").innerHTML = "<strong>Zero Spent Days:</strong> No data found";
    document.getElementById("incomeRatio").innerHTML = "<strong>Income Ratio:</strong> No data found";
    return;
  }
  
  // Highest Income
  let highestIncome = data.filter(t => t.type === "income").sort((a, b) => b.amount - a.amount)[0];
  document.getElementById("highestIncome").innerHTML =
    highestIncome ?
    `<strong>Highest Income:</strong> ${currencySymbol} ${highestIncome.amount} (${highestIncome.desc} on ${highestIncome.date})` :
    "<strong>Highest Income:</strong> No data found";
  
  // Highest Expense
  let highestExpense = data.filter(t => t.type === "expense").sort((a, b) => b.amount - a.amount)[0];
  document.getElementById("highestExpense").innerHTML =
    highestExpense ?
    `<strong>Highest Expense:</strong> ${currencySymbol} ${highestExpense.amount} (${highestExpense.desc} on ${highestExpense.date})` :
    "<strong>Highest Expense:</strong> No data found";
  
  // Zero Spent Days (list format)
  let expenseDates = new Set(data.filter(t => t.type === "expense").map(t => t.date));
  let allDates = new Set(data.map(t => t.date));
  let zeroSpentDays = [...allDates].filter(d => !expenseDates.has(d));
  
  if (zeroSpentDays.length) {
    document.getElementById("zeroDays").innerHTML =
      `<strong>Zero Spent Days:</strong><ul>${zeroSpentDays.map(date => `<li>${date}</li>`).join("")}</ul>`;
  } else {
    document.getElementById("zeroDays").innerHTML = "<strong>Zero Spent Days:</strong> No data found";
  }
  
  // Income Ratio (Expense / Income * 100)
  let totalIncome = data.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  let totalExpense = data.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  let ratio = totalIncome ? ((totalExpense / totalIncome) * 100).toFixed(1) : null;
  document.getElementById("incomeRatio").innerHTML =
    ratio !== null ?
    `<strong>Income Ratio:</strong> ${ratio}%` :
    "<strong>Income Ratio:</strong> No income data";
}

// Auto-update on changes
function refreshReports() {
  setToday();
  saveToLocalStorage();
  renderCharts();
  renderReports();
  renderAdvancedReports();
  updateSpecialInsights();
  buildFilterAccounts();
}

window.addEventListener("beforeunload", function() {
  if (!getSetting("autoDownload", false)) return;
  downloadAllLedgers("json");
});

// window.addEventListener("beforeunload", function() {
//   if (!getSetting("autoDownload", false)) return;

//   if (hasUnsavedChanges) downloadAllLedgers("json");
// });

function updateTxnCount() {
  localStorage.setItem("lastSavedTxnCount", transactions.length);
}


function scrollToTop(top = 0) {
  window.scrollTo({ top: top, behavior: 'smooth' });
}

function focusInput() {
  document.getElementById("desc").focus()
}
// Show button only when scrolled down
window.addEventListener('scroll', () => {
  const btn = document.getElementById('scrollTopBtn');
  if (window.scrollY > 200) {
    btn.classList.remove("hide");
    btn.classList.add("show");
  } else {
    btn.classList.remove("show");
    btn.classList.add("hide");
  }
});

// === Wealth Light Update ===
function updateWealthLight(income, expenses) {
  const light = document.getElementById("wealthLight");
  const title = document.getElementById("wealthTitle");
  if (!light) return;
  
  if (income >= expenses) {
    light.className = "wealth-light green";
    title.textContent = "Good financial health";
  } else if (income >= expenses * 0.7) {
    light.className = "wealth-light yellow";
    title.textContent = "Warning: More expenses than income";
  } else {
    light.className = "wealth-light red";
    title.textContent = "Danger: Too many expenses!";
  }
}

// === Smart Plan for Low Balance ===
function showLowBalancePlan(balance) {
  const alertDiv = document.getElementById("planSection");
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const lowAmount = getSetting("planLimit", 500);
  const planLimit = document.getElementById("planLimit");
  if (planLimit) planLimit.textContent = lowAmount;
  // Get remaining days in this month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const remainingDays = daysInMonth - today.getDate() + 1; // include today
  if (balance < 0) {
    alertDiv.style.display = "block";
    alertDiv.innerHTML = `
      <h2><i class="fa-solid fa-warning"></i> Low Balance Alert</h2>
      <p>Your balance is low</p>
      <p>Suggested expense plan for this Month:</p>
      <ul>
        <li>Total Remaining Days: ${remainingDays}</li>
        <li>Daily Allowance: 00</li>
      </ul>
      <p><b>Total Planned = No expenses per day until some income is received.</b></p>
    `;
    return;
  }
  if (balance < lowAmount && remainingDays > 0) {
    const perDay = Math.floor(balance / remainingDays);
    
    alertDiv.innerHTML = `
      <h2><i class="fa-solid fa-warning"></i> Low Balance Alert</h2>
      <p>Your balance is below ${currencySymbol + lowAmount}.</p>
      <p>Suggested expense plan for this Month (equal split):</p>
      <ul>
        <li>Total Remaining Days: ${remainingDays}</li>
        <li>Daily Allowance: ~${currencySymbol + perDay} per day</li>
      </ul>
      <p><b>Total Planned ${perDay + " x " + remainingDays}  = ${currencySymbol} ${perDay * remainingDays}</b></p>
    `;
    alertDiv.style.display = "block";
  } else {
    alertDiv.style.display = "none";
  }
  alertDiv.style.display = getSetting('alertSection', true) ? 'block' : 'none';
}



// Load credential ID
function loadCredentialId() {
  const stored = localStorage.getItem("vaultLedgerCredentialId");
  if (!stored) return null;
  return Uint8Array.from(atob(stored), c => c.charCodeAt(0));
}


// Step 2: Unlock with biometrics (run on app start)
async function unlockWithBiometric() {
  const credId = loadCredentialId();
  if (!credId) {
    console.log("No biometric lock set up → opening app normally.");
    return true; // allow access if not enabled
  }
  
  try {
    const publicKey = {
      challenge: new Uint8Array(32),
      allowCredentials: [{ type: "public-key", id: credId }],
      userVerification: "required"
    };
    
    const assertion = await navigator.credentials.get({ publicKey });
    console.log("Biometric unlock success:", assertion);
    return true;
  } catch (err) {
    console.error("Unlock failed:", err);
    return false;
  }
}

window.onload = async function() {
  applySettings();
  buildAccountSelector();
  
  let savedLedgers = JSON.parse(localStorage.getItem("ledgers") || "[]");
  
  // Remove duplicates
  savedLedgers = [...new Set(savedLedgers)];
  
  // Save cleaned version
  localStorage.setItem("ledgers", JSON.stringify(savedLedgers));
  
  // If no ledgers, create only one "Untitled"
  if (savedLedgers.length === 0) {
    const defaultLedger = [{
      id: await generateTransactionId(getCurrentDate(), "Opening Balance", 0),
      date: getCurrentDate(),
      account: 'Capital',
      desc: "Opening Balance",
      type: "Income",
      amount: 0
    }];
    const defaultName = getSetting("defaultFileName", "Untitled");
    savedLedgers.push(defaultName);
    localStorage.setItem("ledgers", JSON.stringify(savedLedgers));
    localStorage.setItem(defaultName, JSON.stringify(defaultLedger));
    localStorage.setItem("currentLedgerKey", defaultName);
  }
  
  // Load the current ledger
  currentLedgerKey = localStorage.getItem("currentLedgerKey") || "Untitled";
  ledger = JSON.parse(localStorage.getItem(currentLedgerKey) || "[]");
  
  fileName = currentLedgerKey;
  document.getElementById("filename").value = fileName;
  
  setToday();
  setDeafults()
  updateLedgerSelect();
  renderTable();
  renderCharts(ledger);
  buildFilterAccounts()
  handleDateRangeChange()
  
  const enabled = getSetting("unlockWithBiometric", true);
  if (!enabled) return;
  const ok = await unlockWithBiometric();
  if (!ok) {
    document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:10px;">
      <h2>🔒 Access Denied</h2>
      <p>Biometric unlock failed.</p>
      <button class='reload-btn' onclick="location.reload()" style="">
        Try Again
      </button>
    </div>`;
  }
};