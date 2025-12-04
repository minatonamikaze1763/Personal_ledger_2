  // ✅ Your transaction accounts
  const SETTINGS_KEY = "vaultSettings";
const settings = loadSettingsValues();

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
  
  const accounts = [
    "Bank", "Cash", "Accounts Receivable", "Fixed Assets", "Investments", "Prepaid Expenses", "Inventory", "Savings",
    "Accounts Payable", "Credit Card", "Loans", "Taxes Payable",
    "Capital", "Owner’s Equity", "Retained Earnings",
    "Bonus", "Business Income", "Commission", "Interest", "Other Income", "Salary",
    "Bills", "Education", "Entertainment", "Food", "Healthcare", "Insurance", "Miscellaneous", "Rent", "Shopping",
    "Subscriptions", "Taxes", "Travel", "Utilities", "Business Partners", "Refunds", "Repairs & Maintenance", "Fuel",
    "Telecom", "Service Charges", "Family Support", "Vehicle", "Cash Reimbursement", "Household", "Bank Charges"
  ].sort();
  
  const fromLedger = document.getElementById("fromLedger");
  const toLedger = document.getElementById("toLedger");
  const txnAccount = document.getElementById("txnAccount");
  const transferForm = document.getElementById("transferForm");
  const ledgerTableBody = document.querySelector("#ledgerTable tbody");
  const finalBalanceCell = document.getElementById("finalBalance");
  // ✅ Load ledgers
  let ledgers = JSON.parse(localStorage.getItem("ledgers") || "[]");
  
  function setToday() {
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    return today;
  }
  async function generateTransactionId(date, desc, amount) {
    // Normalize values
    const normalizedDate = new Date(date).toISOString().split("T")[0]; // yyyy-mm-dd
    const normalizedDesc = desc;
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
  // ✅ Refresh balances table
  function refreshLedgerTable() {
    ledgerTableBody.innerHTML = "";
    let total = 0;
    ledgers.forEach(l => {
      let bal = getLedgerBalance(l);
      total += bal;
      let row = document.createElement("tr");
      row.innerHTML = `<td>${l}</td><td>${bal.toFixed(2)}</td>`;
      ledgerTableBody.appendChild(row);
    });
    finalBalanceCell.textContent = total.toFixed(2);
  }
  // ✅ Balance calculation
  function getLedgerBalance(ledgerName) {
    try {
      let data = JSON.parse(localStorage.getItem(ledgerName) || "[]");
      if (!Array.isArray(data)) return 0;
      
      let income = 0,
        expense = 0;
      data.forEach(tx => {
        let amt = parseFloat(tx.amount) || 0;
        if (tx.type === "income") income += amt;
        if (tx.type === "expense") expense += amt;
      });
      return income - expense;
    } catch {
      return 0;
    }
  }
  // ✅ Populate transaction accounts dropdown
  function populateAccounts() {
    txnAccount.innerHTML = "<option value=''>Select Transaction Account</option>";
    accounts.forEach(acc => txnAccount.add(new Option(acc, acc)));
  }
  
  
  // Populate ledger dropdowns
  function populateDropdowns() {
    fromLedger.innerHTML = "<option value=''>Select From Ledger</option>";
    toLedger.innerHTML = "<option value=''>Select To Ledger</option>";
    ledgers.forEach(l => {
      fromLedger.add(new Option(l, l));
      toLedger.add(new Option(l, l));
    });
  }
  
  // ✅ Handle transfer
  transferForm.addEventListener("submit", async e => {
    e.preventDefault();
    
    const from = fromLedger.value;
    const to = toLedger.value;
    const amount = parseFloat(document.getElementById("amount").value);
    const date = document.getElementById("date").value;
    const desc = document.getElementById("desc").value;
    const acc = txnAccount.value;
    
    if (!from || !to || from === to || !acc || isNaN(amount) || amount <= 0) {
      return alert("Please fill all fields correctly.");
    }
    if (amount > getLedgerBalance(from)) return alert("Insufficient funds ")
    const txId = await generateTransactionId(date, amount, desc);
    // Create transaction objects
    const txOut = {
      id: txId,
      date,
      account: acc,
      type: "expense",
      transactionName: "transfer-out",
      transactionType: "linked-transaction",
      transferredFrom: from,
      transferredTo: to,
      amount,
      desc: desc
    };
    
    const txIn = {
      id: txId,
      date,
      account: acc,
      type: "income",
      transactionName: "transfer-in",
      transactionType: "linked-transaction",
      transferredFrom: from,
      transferredTo: to,
      amount,
      desc: desc
    };
    // Save to localStorage
    let fromData = JSON.parse(localStorage.getItem(from) || "[]");
    fromData.push(txOut);
    localStorage.setItem(from, JSON.stringify(fromData));
    
    let toData = JSON.parse(localStorage.getItem(to) || "[]");
    toData.push(txIn);
    localStorage.setItem(to, JSON.stringify(toData));
    
    alert(`Transferred ${amount} (${acc}) from ${from} ➝ ${to}`);
    
    transferForm.reset();
    populateAccounts();
    populateDropdowns();
    refreshLedgerTable();
    setToday();
  });
  
  document.addEventListener("DOMContentLoaded", async () => {
    setToday();
    populateAccounts();
    populateDropdowns();
    refreshLedgerTable();
  });
  
  document.getElementById("clearBtn").addEventListener("click", () => {
    transferForm.reset();
    setToday();
  });
  
  
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
  
  window.onload =async () => {
    const enabled = getSetting("unlockWithBiometric", true);
    if (!enabled) return;
    const ok = await unlockWithBiometric();
    if (!ok) {
      document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;">
        <h2>🔒 Access Denied</h2>
        <p>Biometric unlock failed.</p>
      </div>`;
    }
  }