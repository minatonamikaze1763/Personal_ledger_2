const settings = {
  // Import/Export
  defaultFileName: {
    value: "Untitled",
    type: "text",
    label: "Default File Name",
    desc: "File name used for untitled ledgers."
  },
  exportFormat: {
    value: "json",
    type: "select",
    options: ["excel", "pdf","summary","json", "png"],
    label: "Export Format",
    desc: "Default export format."
  },
  monthlyBudget: {
    value: 0,
    type: "number",
    label: "Monthly budget",
    desc: "Enter monthly budget for preferred ledgers (works if the value is greater than 0)"
  },
  budgetPreferredLedgers: {
    value: "",
    type: "multiselect",
    options: [],
    selected: [],
    label: "Preferred ledgers",
    desc: "Select Monthly budget preferred ledgers."
  },
  // Display & Charts
  defaultFilter: {
    value: "thisMonth",
    type: "select",
    options: [
      "custom",
      "today",
      "yesterday",
      "thisWeek",
      "prevWeek",
      "thisMonth",
      "prevMonth",
      "thisQuarter",
      "prevQuarter",
      "thisHalfYear",
      "prevHalfYear",
      "thisFY",
      "prevFY",
      "thisCY",
      "prevCY",
      "tillDate"
    ],
    label: "Default Filter",
    desc: "Default filter applied."
  },
  currencySymbol: {
    value: "₹",
    type: "select",
    options: [
      "$", "€", "£", "₹", "¥", "₩", "₽", "₺", "R$", "₱",
      "฿", "₦", "₫", "₴", "₡", "₲", "₵", "₸", "₪"
    ],
    label: "Currency Symbol",
    desc: "Symbol for amounts."
  },
  autoDownload: {
    value: true,
    type: "checkbox",
    label: "Auto Download",
    desc: "Auto download all ledgers as zip when page is closed."
  },
  allowDeleteLedger: {
  value: false,
  type: "checkbox",
  label: "Allow deleting linked Ledgers",
  desc: "Allow deleting Ledgers those has linked transactions."
},
  chartShowPie: {
    value: true,
    type: "checkbox",
    label: "Show Pie Chart",
    desc: "Enable or disable pie chart."
  },
  chartShowBar: {
    value: true,
    type: "checkbox",
    label: "Show Bar Chart",
    desc: "Enable or disable bar chart."
  },
  chartShowLine: {
    value: true,
    type: "checkbox",
    label: "Show Line Chart",
    desc: "Enable or disable line chart."
  },
  alertSection: {
    value: true,
    type: "checkbox",
    label: "Show Expense Plan",
    desc: "Enable or disable expense plan."
  },
  planLimit: {
    value: 500,
    type: "number",
    label: "Expense Plan limit",
    desc: "Show expense plan when the balance is below the defined amount."
  },
  // Security
  /*  requirePassword: {
      value: false,
      type: "checkbox",
      label: "Require Password",
      desc: "Protect vault with a password."
    },
    lockedKey: {
      value: "1234",
      type: "text",
      label: "Enter password",
      desc: "Password for locking vault, this will be enabled when Require password is enabled!"
    },*/
  unlockWithBiometric: {
    value: false,
    type: "checkbox",
    label: "Unlock ledger with biometric",
    desc: "Enable this to unlock ledger with registered biometric."
  },
};

const SETTINGS_KEY = "vaultSettings";

/* ========= LOAD SETTINGS ========= */
function loadSettings() {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      for (const key in parsed) {
        if (settings[key] !== undefined) {
          if ("value" in parsed[key]) {
            settings[key].value = parsed[key].value;
          }
          if ("selected" in parsed[key]) {
            settings[key].selected = parsed[key].selected || [];
          }
        }
      }
    } catch (e) {
      console.error("Failed to parse settings from storage", e);
    }
  }
}

/* ========= SAVE SETTINGS ========= */
function saveSettings() {
  const values = {};
  for (const key in settings) {
    values[key] = { value: settings[key].value };
    if (settings[key].selected) {
      values[key].selected = settings[key].selected;
    }
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(values));
}

/* ========= BUILD SETTINGS FORM ========= */
function buildSettingsForm() {
  const container = document.getElementById("settingsContainer");
  container.innerHTML = "";
  
  for (const key in settings) {
    const setting = settings[key];
    
    const wrapper = document.createElement("div");
    wrapper.className = "mb-4 p-3 border rounded";
    
    const lbl = document.createElement("label");
    lbl.textContent = setting.label;
    lbl.className = "block font-semibold mb-1";
    
    let input;
    
    if (setting.type === "checkbox") {
      input = document.createElement("input");
      input.type = "checkbox";
      input.checked = setting.value;
    } else if (setting.type === "number" || setting.type === "text") {
      input = document.createElement("input");
      input.type = setting.type;
      input.value = setting.value;
      input.className = "border p-1 w-full";
    } else if (setting.type === "select") {
      input = document.createElement("select");
      input.className = "border p-1 w-full";
      setting.options.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        if (opt === setting.value) option.selected = true;
        input.appendChild(option);
      });
    } else if (setting.type === "multiselect") {
      const multiContainer = document.createElement("div");
      multiContainer.className = "space-y-1";
      
      setting.options.forEach(opt => {
        const label = document.createElement("label");
        label.className = "flex items-center space-x-2";
        
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = opt;
        
        if (setting.selected.includes(opt)) {
          checkbox.checked = true;
        }
        
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) {
            if (!settings[key].selected.includes(opt)) {
              settings[key].selected.push(opt);
            }
          } else {
            settings[key].selected = settings[key].selected.filter(x => x !== opt);
          }
          saveSettings();
        });
        
        const span = document.createElement("span");
        span.textContent = opt;
        
        label.appendChild(span);
        label.appendChild(checkbox);
        multiContainer.appendChild(label);
      });
      
      input = multiContainer;
    }
    
    if (input) {
      input.id = key;
      input.classList.add("setting-input");
      
      if (setting.type !== "multiselect") {
        input.addEventListener("change", () => {
          if (input.type === "checkbox") {
            settings[key].value = input.checked;
          } else {
            settings[key].value = input.value;
          }
          saveSettings();
        });
      }
    }
    
    const description = document.createElement("p");
    description.textContent = setting.desc;
    description.className = "text-sm text-gray-600";
    
    wrapper.appendChild(lbl);
    if (input) wrapper.appendChild(input);
    wrapper.appendChild(description);
    container.appendChild(wrapper);
  }
  const button = document.createElement("button");
  button.textContent = "Register Biometric"
  button.onclick = setupBiometricLock;
  container.appendChild(button)
}

/* ========= LEDGERS INTO MULTISELECT ========= */
function addLedgers() {
  let ledgers = JSON.parse(localStorage.getItem("ledgers") || "[]");
  settings.budgetPreferredLedgers.options = ledgers.map(l => l.name || l);
}

// Save credential ID
function saveCredentialId(rawId) {
  const credId = btoa(String.fromCharCode(...new Uint8Array(rawId)));
  localStorage.setItem("vaultLedgerCredentialId", credId);
}

// Step 1: Setup biometrics (run when enabling in settings)
async function setupBiometricLock() {
  const saved = localStorage.getItem(SETTINGS_KEY);
  const parsed = JSON.parse(saved);
  if (!parsed.unlockWithBiometric.value) return;
  try {
    const publicKey = {
      challenge: new Uint8Array(32), // Normally from server
      rp: { name: "Vault Ledger" },
      user: {
        id: new Uint8Array(16), // Random local ID
        name: "vault-user",
        displayName: "Vault Ledger User"
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: {
        authenticatorAttachment: "platform", // Use device lock
        userVerification: "required"
      },
      timeout: 60000,
      attestation: "none"
    };
    
    const credential = await navigator.credentials.create({ publicKey });
    saveCredentialId(credential.rawId);
    
    alert("🔐 Biometric lock enabled!");
  } catch (err) {
    console.error("Biometric setup failed:", err);
  }
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

/* ========= INIT ========= */
window.addEventListener("beforeunload", saveSettings);

window.onload =async () => {
  addLedgers();
  loadSettings();
  buildSettingsForm();
  const enabled = settings.unlockWithBiometric.value;
  if (!enabled) return;
  const ok = await unlockWithBiometric();
  if (!ok) {
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;">
        <h2>🔒 Access Denied</h2>
        <p>Biometric unlock failed.</p>
      </div>`;
  }
};