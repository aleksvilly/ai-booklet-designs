import { PRINT_MODE_STORAGE_KEY } from './config.js';
import { safeClass, nextPaint, promiseWithin, averageCanvasEdgeColor } from './utils.js';
import { closeBookletEditor } from './editor.js';

let printExportItem = null;
let pdfExportBusy = false;
let pdfDownloadUrl = '';

export function setPrintExportItem(item) {
  printExportItem = item;
}

function getPdfControls() {
  return {
    dialog: document.querySelector('#booklet-dialog'),
    dialogContent: document.querySelector('#dialog-content'),
    printSettingsDialog: document.querySelector('#print-settings-dialog'),
    printSettingsForm: document.querySelector('#print-settings-form'),
    printSettingsClose: document.querySelector('#print-settings-close'),
    printSettingsCancel: document.querySelector('#print-settings-cancel'),
    printSystemButton: document.querySelector('#print-system-button'),
    pdfExportProgress: document.querySelector('#pdf-export-progress'),
    pdfExportStatus: document.querySelector('#pdf-export-status'),
    pdfDownloadLink: document.querySelector('#pdf-download-link')
  };
}

export function closePrintSettings() {
  const { printSettingsDialog } = getPdfControls();
  if (pdfExportBusy) return;
  if (printSettingsDialog?.open) printSettingsDialog.close();
  if (pdfDownloadUrl) {
    URL.revokeObjectURL(pdfDownloadUrl);
    pdfDownloadUrl = '';
  }
}

export function openPrintSettings() {
  const { printSettingsForm, printSettingsDialog, pdfExportStatus, pdfExportProgress, pdfDownloadLink } = getPdfControls();
  closeBookletEditor();
  if (pdfExportStatus) pdfExportStatus.textContent = 'Preparing PDF…';
  if (pdfExportProgress) {
    pdfExportProgress.hidden = true;
    pdfExportProgress.classList.remove('is-ready', 'is-error');
  }
  if (pdfDownloadLink) pdfDownloadLink.hidden = true;

  const savedMode = localStorage.getItem(PRINT_MODE_STORAGE_KEY);
  const mode = savedMode === 'spreads' ? 'spreads' : 'pages';
  if (printSettingsForm) {
    printSettingsForm.querySelectorAll('input[name="print-mode"]').forEach(option => {
      option.checked = option.value === mode;
    });
  }
  if (printSettingsDialog && !printSettingsDialog.open) printSettingsDialog.showModal();
}

export function selectedPrintMode() {
  const { printSettingsForm } = getPdfControls();
  if (!printSettingsForm) return 'pages';
  const data = new FormData(printSettingsForm);
  return data.get('print-mode') === 'spreads' ? 'spreads' : 'pages';
}

export function setPdfExportBusy(busy) {
  const { printSettingsForm, printSettingsClose, printSettingsDialog } = getPdfControls();
  pdfExportBusy = busy;
  if (printSettingsForm) {
    printSettingsForm.querySelectorAll('button,input').forEach(control => {
      control.disabled = busy;
    });
  }
  if (printSettingsClose) printSettingsClose.disabled = busy;
  if (printSettingsDialog) printSettingsDialog.classList.toggle('is-exporting', busy);
}

export async function waitForBookletAssets() {
  const { dialogContent } = getPdfControls();
  if (document.fonts?.ready) {
    await promiseWithin(document.fonts.ready, 12000, 'Font loading timed out').catch(() => {});
  }
  const images = [...(dialogContent?.querySelectorAll('.book-page img') || [])];
  const imageReady = Promise.all(images.map(async image => {
    if (!image.complete) {
      await new Promise(resolve => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    }
    if (typeof image.decode === 'function') await image.decode().catch(() => {});
  }));
  await promiseWithin(imageReady, 15000, 'Image loading timed out').catch(() => {});
  await nextPaint();
}

export async function renderPageForPdf(page, index, total, fontEmbedCSS) {
  const { pdfExportStatus } = getPdfControls();
  if (pdfExportStatus) pdfExportStatus.textContent = `Rendering page ${index + 1} of ${total}…`;

  const width = Math.max(1, page.getBoundingClientRect().width);
  const pixelRatio = Math.min(4, Math.max(2, 1400 / width));
  const canvas = await promiseWithin(window.htmlToImage.toCanvas(page, {
    pixelRatio,
    quality: .94,
    cacheBust: false,
    includeQueryParams: true,
    preferredFontFormat: 'woff2',
    fontEmbedCSS,
    backgroundColor: getComputedStyle(page).backgroundColor || '#ffffff'
  }), 45000, `Page ${index + 1} rendering timed out`);

  return {
    dataUrl: canvas.toDataURL('image/jpeg', .94),
    edgeColor: averageCanvasEdgeColor(canvas)
  };
}

export function addSinglePageToPdf(pdf, rendered, firstPage) {
  if (!firstPage) pdf.addPage('a4', 'portrait');
  pdf.addImage(rendered.dataUrl, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
}

export function addTwoPagesToPdf(pdf, renderedPages, firstSheet) {
  if (!firstSheet) pdf.addPage('a4', 'landscape');
  renderedPages.forEach((rendered, index) => {
    const slotX = index * 148.5;
    pdf.setFillColor(...rendered.edgeColor);
    pdf.rect(slotX, 0, 148.5, 210, 'F');
    pdf.addImage(rendered.dataUrl, 'JPEG', slotX, 0, 148.5, 210, undefined, 'FAST');
  });
  pdf.setDrawColor(205, 205, 205);
  pdf.setLineWidth(.2);
  pdf.line(148.5, 0, 148.5, 210);
}

export function bookletPdfName(item, mode) {
  const base = safeClass(item?.id || item?.title || 'booklet') || 'booklet';
  return `${base}-${mode === 'spreads' ? 'two-pages' : 'single-pages'}.pdf`;
}

export function exposePdfDownload(blob, filename) {
  const { pdfDownloadLink } = getPdfControls();
  if (pdfDownloadUrl) URL.revokeObjectURL(pdfDownloadUrl);
  pdfDownloadUrl = URL.createObjectURL(blob);
  if (pdfDownloadLink) {
    pdfDownloadLink.href = pdfDownloadUrl;
    pdfDownloadLink.download = filename;
    pdfDownloadLink.hidden = false;
    pdfDownloadLink.click();
  }
}

export async function downloadBookletPdf(event) {
  event.preventDefault();
  if (pdfExportBusy) return;

  const { dialogContent, dialog, pdfExportProgress, pdfExportStatus, pdfDownloadLink } = getPdfControls();
  const mode = selectedPrintMode();
  localStorage.setItem(PRINT_MODE_STORAGE_KEY, mode);

  if (!window.htmlToImage?.toCanvas || !window.jspdf?.jsPDF) {
    if (pdfExportProgress) pdfExportProgress.hidden = false;
    if (pdfExportStatus) pdfExportStatus.textContent = 'The PDF renderer did not load. Please use Browser print.';
    return;
  }

  const pages = [...(dialogContent?.querySelectorAll('.book-page:not(.blank-page)') || [])];
  if (!pages.length) return;

  setPdfExportBusy(true);
  if (pdfExportProgress) {
    pdfExportProgress.hidden = false;
    pdfExportProgress.classList.remove('is-ready', 'is-error');
  }
  if (pdfDownloadLink) pdfDownloadLink.hidden = true;
  if (dialog) dialog.classList.add('pdf-exporting');

  try {
    await waitForBookletAssets();
    const fontEmbedCSS = await promiseWithin(window.htmlToImage.getFontEmbedCSS(dialogContent, {
      preferredFontFormat: 'woff2'
    }), 20000, 'Font embedding timed out').catch(() => '');

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: mode === 'pages' ? 'portrait' : 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true,
      putOnlyUsedFonts: true
    });

    if (mode === 'pages') {
      for (let index = 0; index < pages.length; index += 1) {
        const rendered = await renderPageForPdf(pages[index], index, pages.length, fontEmbedCSS);
        addSinglePageToPdf(pdf, rendered, index === 0);
      }
    } else {
      for (let index = 0; index < pages.length; index += 2) {
        const pair = [];
        pair.push(await renderPageForPdf(pages[index], index, pages.length, fontEmbedCSS));
        if (pages[index + 1]) {
          pair.push(await renderPageForPdf(pages[index + 1], index + 1, pages.length, fontEmbedCSS));
        }
        addTwoPagesToPdf(pdf, pair, index === 0);
      }
    }

    if (pdfExportProgress) pdfExportProgress.classList.add('is-ready');
    if (pdfExportStatus) pdfExportStatus.textContent = 'PDF is ready. The download should start automatically.';
    exposePdfDownload(pdf.output('blob'), bookletPdfName(printExportItem, mode));
  } catch (error) {
    console.error('PDF export failed', error);
    if (pdfExportProgress) pdfExportProgress.classList.add('is-error');
    if (pdfExportStatus) pdfExportStatus.textContent = 'PDF creation failed. Try again or use Browser print.';
  } finally {
    if (dialog) dialog.classList.remove('pdf-exporting');
    setPdfExportBusy(false);
  }
}

export function printBookletInBrowser() {
  const mode = selectedPrintMode();
  localStorage.setItem(PRINT_MODE_STORAGE_KEY, mode);
  document.documentElement.dataset.printMode = mode;
  closePrintSettings();
  requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
}

export function setupPdfEvents() {
  const {
    printSettingsForm,
    printSettingsClose,
    printSettingsCancel,
    printSystemButton,
    printSettingsDialog
  } = getPdfControls();

  printSettingsForm?.addEventListener('submit', downloadBookletPdf);
  printSettingsClose?.addEventListener('click', closePrintSettings);
  printSettingsCancel?.addEventListener('click', closePrintSettings);
  printSystemButton?.addEventListener('click', printBookletInBrowser);

  printSettingsDialog?.addEventListener('click', event => {
    const rect = printSettingsDialog.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    if (outside) closePrintSettings();
  });
  printSettingsDialog?.addEventListener('cancel', event => {
    if (pdfExportBusy) event.preventDefault();
  });
}
