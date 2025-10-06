document.addEventListener("DOMContentLoaded", () => {
  const includeSelect = document.getElementById("includeLedgers");
  const excludeSelect = document.getElementById("excludeLedgers");
  const modeRadios = document.querySelectorAll("input[name='ledgerMode']");
  const reportBtn = document.getElementById("generateReport");
  const reportTableBody = document.querySelector("#reportTable tbody");
  const finalBalanceCell = document.getElementById("finalBalance");
  
  // 🔹 Get saved ledger names
  let ledgers = JSON.parse(localStorage.getItem("ledgers") || "[]");
  
  // Populate both dropdowns
  function populateDropdowns() {
    includeSelect.innerHTML = "";
    excludeSelect.innerHTML = "";
    ledgers.forEach(l => {
      let opt1 = new Option(l, l);
      let opt2 = new Option(l, l);
      includeSelect.add(opt1);
      excludeSelect.add(opt2);
    });
  }
  populateDropdowns();
  
  // 🔹 Switch dropdowns based on selected mode
  modeRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.value === "all") {
        includeSelect.style.display = "none";
        excludeSelect.style.display = "none";
      } else if (radio.value === "custom") {
        includeSelect.style.display = "block";
        excludeSelect.style.display = "none";
      } else if (radio.value === "exclude") {
        includeSelect.style.display = "none";
        excludeSelect.style.display = "block";
      }
    });
  });
  
  // 🔹 Calculate closing balance from transactions (income - expense)
  function getLedgerBalance(ledgerName) {
    try {
      let data = JSON.parse(localStorage.getItem(ledgerName) || "[]");
      if (!Array.isArray(data) || data.length === 0) return 0;
      
      let income = 0;
      let expense = 0;
      
      data.forEach(tx => {
        // assuming transaction structure like { type: "income"/"expense", amount: number }
        let amt = parseFloat(tx.amount) || 0;
        if (tx.type && tx.type.toLowerCase() === "income") {
          income += amt;
        } else if (tx.type && tx.type.toLowerCase() === "expense") {
          expense += amt;
        }
      });
      
      return income - expense;
    } catch (err) {
      console.error("Error reading ledger:", ledgerName, err);
      return 0;
    }
  }
  
  // 🔹 Generate Report
  function generateReport() {
    const mode = document.querySelector("input[name='ledgerMode']:checked").value;
    let selectedLedgers = [...ledgers];
    
    if (mode === "custom") {
      selectedLedgers = Array.from(includeSelect.selectedOptions).map(o => o.value);
    } else if (mode === "exclude") {
      let excluded = Array.from(excludeSelect.selectedOptions).map(o => o.value);
      selectedLedgers = ledgers.filter(l => !excluded.includes(l));
    }
    
    // Clear table
    reportTableBody.innerHTML = "";
    
    let finalBalance = 0;
    
    selectedLedgers.forEach(l => {
      let balance = getLedgerBalance(l);
      finalBalance += balance;
      
      let row = document.createElement("tr");
      row.innerHTML = `
        <td>${l}</td>
        <td>${balance.toFixed(2)}</td>
      `;
      reportTableBody.appendChild(row);
    });
    
    // Update final balance
    finalBalanceCell.textContent = finalBalance.toFixed(2);
  }
  
  // Bind button
  reportBtn.addEventListener("click", generateReport);
});



// Handle ledger filter type change
document.querySelectorAll("input[name='ledgerFilter']").forEach(radio => {
  radio.addEventListener("change", function() {
    const selectionBox = document.getElementById("ledgerSelection");
    if (this.value === "custom" || this.value === "exclude") {
      selectionBox.style.display = "block";
    } else {
      selectionBox.style.display = "none";
    }
  });
});

// On load, make sure dropdown is hidden unless custom/exclude is chosen
window.addEventListener("DOMContentLoaded", () => {
  const selected = document.querySelector("input[name='ledgerFilter']:checked");
  const selectionBox = document.getElementById("includeLedgers");
  if (selected && (selected.value === "custom" || selected.value === "exclude")) {
    selectionBox.style.display = "block";
  } else {
    selectionBox.style.display = "none";
  }
});


document.getElementById("downloadPngBtn").addEventListener("click", function() {
  const table = document.getElementById("reportTable");
  
  // Use html2canvas to capture table
  html2canvas(table, { scale: 2 }).then(canvas => {
    const link = document.createElement("a");
    link.download = "ledger_report.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
});