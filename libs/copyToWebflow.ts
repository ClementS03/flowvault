/**
 * Copy a Webflow XscpData JSON string to the clipboard.
 *
 * Webflow's Designer reads clipboard data via DataTransfer.getData('application/json')
 * inside a paste event. The only way to write that MIME type is through a
 * programmatic copy event — navigator.clipboard.write() does not support it.
 *
 * This function triggers a synthetic copy event on a provided textarea element
 * (the ClipboardBridge) so the browser's DataTransfer is available synchronously.
 */
export function copyToWebflow(json: string, bridgeElement: HTMLTextAreaElement): boolean {
  let success = false;

  const handleCopy = (e: ClipboardEvent) => {
    if (!e.clipboardData) return;
    e.clipboardData.setData("application/json", json);
    e.clipboardData.setData("text/plain", json);
    e.preventDefault();
    success = true;
  };

  // execCommand('copy') only fires the copy event when there is selected text.
  // Set a temporary value so select() has something to latch onto.
  bridgeElement.value = ' ';
  bridgeElement.addEventListener("copy", handleCopy, { once: true });
  bridgeElement.focus();
  bridgeElement.select();
  document.execCommand("copy");
  bridgeElement.value = '';
  bridgeElement.blur();

  return success;
}
