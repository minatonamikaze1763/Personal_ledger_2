
/*(function guardVaultAccess() {
  const unlocked = sessionStorage.getItem("vaultUnlocked") === "true";
  const isLockedSetting = localStorage.getItem("vaultSettings")?.requirePassword?.value || false;
  if (!unlocked && isLockedSetting) {
    window.location.href = "/index.html"; // fallback route
  }
})();*/