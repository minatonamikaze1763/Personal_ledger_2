document.addEventListener("DOMContentLoaded", () => {
  const accountSelect = document.getElementById("accountSelect");
  const ledgerSelect = document.getElementById("ledgerSelect");
  const reportBtn = document.getElementById("generateTransactionReport");
  const transactionTableBody = document.querySelector("#transactionTable tbody");
  
  // 🔹 Get ledgers list
  let ledgers = JSON.parse(localStorage.getItem("ledgers") || "[]");
  
  // 🔹 Collect all accounts across ledgers
  function getAllAccounts() {
    let accountsSet = new Set();
    ledgers.forEach(ledgerName => {
      let data = JSON.parse(localStorage.getItem(ledgerName) || "[]");
      data.forEach(tx => {
        if (tx.account) accountsSet.add(tx.account);
      });
    });
    return [...accountsSet];
  }
  
  // 🔹 Populate accounts dropdown
  function populateAccounts() {
    accountSelect.innerHTML = "";
    getAllAccounts().forEach(acc => {
      let opt = new Option(acc, acc);
      accountSelect.add(opt);
    });
  }
  
  // 🔹 Populate ledgers dropdown based on selected accounts
  function populateLedgersForAccounts(selectedAccounts) {
    ledgerSelect.innerHTML = "";
    
    // If no accounts selected → show nothing
    if (selectedAccounts.length === 0) return;
    
    ledgers.forEach(ledgerName => {
      let transactions = JSON.parse(localStorage.getItem(ledgerName) || "[]");
      
      // Check if ledger has at least one transaction for the selected accounts
      let hasMatch = transactions.some(tx => selectedAccounts.includes(tx.account));
      
      if (hasMatch) {
        let opt = new Option(ledgerName, ledgerName);
        ledgerSelect.add(opt);
      }
    });
  }
  
  // 🔹 Generate Transaction Report
  function generateTransactionReport() {
    let selectedAccounts = Array.from(accountSelect.selectedOptions).map(o => o.value);
    let selectedLedgers = Array.from(ledgerSelect.selectedOptions).map(o => o.value);
    
    transactionTableBody.innerHTML = "";
    
    if (selectedAccounts.length === 0 || selectedLedgers.length === 0) {
      alert("Please select at least one account and one ledger.");
      return;
    }
    
    let count = 1;
    
    selectedLedgers.forEach(ledgerName => {
      let transactions = JSON.parse(localStorage.getItem(ledgerName) || "[]");
      
      transactions.forEach(tx => {
        if (selectedAccounts.includes(tx.account)) {
          let row = document.createElement("tr");
          row.innerHTML = `
            <td>${count++}</td>
            <td>${ledgerName}</td>
            <td>${tx.account || "-"}</td>
            <td>${tx.date || "-"}</td>
            <td>${tx.type || "-"}</td>
            <td>${(parseFloat(tx.amount) || 0).toFixed(2)}</td>
            <td>${tx.desc || ""}</td>
          `;
          transactionTableBody.appendChild(row);
        }
      });
    });
  }
  
  // 🔹 Event Listeners
  accountSelect.addEventListener("change", () => {
    let selectedAccounts = Array.from(accountSelect.selectedOptions).map(o => o.value);
    populateLedgersForAccounts(selectedAccounts);
  });
  
  reportBtn.addEventListener("click", generateTransactionReport);
  
  // Initial load
  populateAccounts();
});
// 🔹 Download Transactions Table as PNG
document.getElementById("downloadTransactionsPngBtn").addEventListener("click", () => {
  const table = document.getElementById("transactionTable");
  
  html2canvas(table, { scale: 2 }).then(canvas => {
    const link = document.createElement("a");
    link.download = "transactions_report.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
});