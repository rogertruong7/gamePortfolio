// Native modals block clicks on the page behind them, but a listener on window still hears keys
export function isModalOpen() {
  return document.querySelector("dialog[open]") !== null;
}
