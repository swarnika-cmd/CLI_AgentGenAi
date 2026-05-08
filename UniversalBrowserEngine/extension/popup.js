document.getElementById('extractBtn').addEventListener('click', () => {
  const status = document.getElementById('status');
  status.textContent = "Extracting...";
  chrome.runtime.sendMessage({ action: 'EXTRACT_AND_SEND' }, (response) => {
    if (response && response.success) {
      status.textContent = "Sent successfully!";
      status.style.color = "green";
    } else {
      status.textContent = "Error or no response.";
      status.style.color = "red";
    }
  });
});
