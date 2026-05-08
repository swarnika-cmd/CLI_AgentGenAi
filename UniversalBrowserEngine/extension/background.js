chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXTRACT_AND_SEND') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      if (!tab) {
        sendResponse({ success: false });
        return;
      }
      
      try {
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
        
        chrome.tabs.sendMessage(tab.id, { action: "GATHER_DOM", screenshot: dataUrl }, async (response) => {
          if (chrome.runtime.lastError || !response || !response.payload) {
             console.error("Content script error:", chrome.runtime.lastError);
             sendResponse({ success: false });
             return;
          }
          
          try {
             const res = await fetch("http://localhost:8000/ingest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(response.payload)
             });
             const jsonRes = await res.json();
             console.log("Ingested successfully:", jsonRes);
             sendResponse({ success: true });
          } catch (e) {
             console.error("Failed to POST to localhost:8000", e);
             sendResponse({ success: false });
          }
        });
      } catch(err) {
        console.error("Error capturing tab", err);
        sendResponse({ success: false });
      }
    });
    return true; // Keep message channel open for async response
  }
});
