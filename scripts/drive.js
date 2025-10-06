const CLIENT_ID = "853589860349-boj18p6vfg18v1tacrro294ns4t0g5kg.apps.googleusercontent.com"; // from Google Cloud
// ================== GOOGLE DRIVE INTEGRATION ==================

// Replace with your own CLIENT_ID from Google Cloud Console
const API_KEY = ""; // Not needed for OAuth-based Drive read/write
const SCOPES = "https://www.googleapis.com/auth/drive.file";
let accessToken = null;

// Load the Google API client
function loadGoogleAPI() {
  gapi.load("client:picker", () => {
    gapi.client.init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
      scope: SCOPES
    }).then(() => {
      console.log("Google API loaded");
    });
  });
}

// Sign in and get access token
function signInToGoogle() {
  return gapi.auth2.getAuthInstance().signIn().then(googleUser => {
    accessToken = googleUser.getAuthResponse().access_token;
    console.log("Signed in to Google Drive");
  });
}

// Export JSON to Google Drive
function exportLedgerToDrive() {
  if (!ledger.length) return alert("No data to export.");
  
  const fileContent = JSON.stringify(ledger, null, 2);
  const file = new Blob([fileContent], { type: "application/json" });
  const metadata = {
    name: `${fileName}.json`,
    mimeType: "application/json"
  };
  
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", file);
  
  fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: new Headers({ Authorization: "Bearer " + accessToken }),
      body: form
    })
    .then(res => res.json())
    .then(data => {
      alert(`File uploaded to Drive: ${data.name}`);
    })
    .catch(err => console.error("Error uploading to Drive:", err));
}

// Import JSON from Google Drive
function importLedgerFromDrive() {
  const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
    .setMimeTypes("application/json")
    .setSelectFolderEnabled(false);
  
  const picker = new google.picker.PickerBuilder()
    .setOAuthToken(accessToken)
    .addView(view)
    .setDeveloperKey(API_KEY)
    .setCallback(pickerCallback)
    .build();
  picker.setVisible(true);
}

function pickerCallback(data) {
  if (data.action === google.picker.Action.PICKED) {
    const fileId = data.docs[0].id;
    gapi.client.drive.files.get({
      fileId: fileId,
      alt: "media"
    }).then(response => {
      const importedData = JSON.parse(response.body);
      ledger = importedData;
      renderTable();
      alert("Ledger imported from Google Drive!");
    });
  }
}

// Init Google API after page load
window.onload = () => {
  loadGoogleAPI();
};