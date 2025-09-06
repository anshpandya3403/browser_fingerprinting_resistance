// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log('Anti-Fingerprinting Extension installed.');
});


// background.js (service worker)

const headerOptions = {
  userAgents: [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/115.0",
  ],
  acceptLangs: ["en-US,en;q=0.9", "en-GB,en;q=0.8", "fr-FR,fr;q=0.9", "de-DE,de;q=0.9"],
  dntValues: ["1", "0"],
};

// Pick a random identity
function pickIdentity() {
  return {
    ua: headerOptions.userAgents[Math.floor(Math.random() * headerOptions.userAgents.length)],
    lang: headerOptions.acceptLangs[Math.floor(Math.random() * headerOptions.acceptLangs.length)],
    dnt: headerOptions.dntValues[Math.floor(Math.random() * headerOptions.dntValues.length)],
  };
}

// Get or create identity for a domain
async function getIdentityForDomain(domain) {
  const stored = await chrome.storage.local.get(domain);
  if (stored[domain]) {
    return stored[domain];
  }

  const newIdentity = pickIdentity();
  await chrome.storage.local.set({ [domain]: newIdentity });
  return newIdentity;
}

// Intercept outgoing requests and spoof headers
chrome.webRequest.onBeforeSendHeaders.addListener(
  async (details) => {
    const url = new URL(details.url);
    const domain = url.hostname;

    const identity = await getIdentityForDomain(domain);

    for (const header of details.requestHeaders) {
      if (header.name.toLowerCase() === "user-agent") {
        header.value = identity.ua;
      }
      if (header.name.toLowerCase() === "accept-language") {
        header.value = identity.lang;
      }
      if (header.name.toLowerCase() === "dnt") {
        header.value = identity.dnt;
      }
    }

    return { requestHeaders: details.requestHeaders };
  },
  { urls: ["<all_urls>"] },
  ["blocking", "requestHeaders"]
);

console.log("🔒 Per-domain persistent header spoofing enabled");
