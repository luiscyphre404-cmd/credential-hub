import { adminApi } from './auth.js';
import { initI18n, onLanguageChange, t, userFacingError } from './i18n.js';
import { mountAdminShell } from './admin-shell.js';

initI18n();
await mountAdminShell();

const statusBadge = document.getElementById('credential-transfer-status');
const errorBox = document.getElementById('credential-transfer-error');
const successBox = document.getElementById('credential-transfer-success');
const refreshButton = document.getElementById('refresh-credentials');
const exportForm = document.getElementById('credential-export-form');
const exportAllCheckbox = document.getElementById('export-all');
const exportTableBody = document.getElementById('credential-export-table-body');
const exportSubmitButton = document.getElementById('export-submit');
const importForm = document.getElementById('credential-import-form');
const importSourceFormatInput = document.getElementById('import-source-format');
const importPasswordField = document.getElementById('import-password-field');
const importFileInput = document.getElementById('import-file');
const importContentInput = document.getElementById('import-content');
const importPasswordInput = document.getElementById('import-password');
const importConflictStrategyInput = document.getElementById('conflict-strategy');
const importPreviewButton = document.getElementById('import-preview-submit');
const importSubmitButton = document.getElementById('import-submit');
const importPreviewPanel = document.getElementById('import-preview-panel');
const importPreviewSummary = document.getElementById('import-preview-summary');
const importPreviewTableBody = document.getElementById('import-preview-table-body');

let credentials = [];
let lastPreview = null;
let lastPreviewFingerprint = null;

refreshButton?.addEventListener('click', () => loadCredentials());
exportAllCheckbox?.addEventListener('change', () => renderCredentials(credentials));

exportForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  exportCredentials();
});

importSourceFormatInput?.addEventListener('change', () => updateImportFormatUi());
importFileInput?.addEventListener('change', () => readSelectedImportFile());
importContentInput?.addEventListener('input', () => resetPreview());
importPasswordInput?.addEventListener('input', () => resetPreview());
importConflictStrategyInput?.addEventListener('change', () => resetPreview());

importPreviewButton?.addEventListener('click', () => previewImport());

importForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  importCredentials();
});

updateImportFormatUi();
loadCredentials();

async function loadCredentials() {
  setStatus(t('transfer.loading'));
  hideMessages();

  try {
    const body = await adminApi.get('/api/v1/credentials?pageSize=500');

    credentials = Array.isArray(body.data) ? body.data : [];
    renderCredentials(credentials);
    setStatus(`${credentials.length} Credential${credentials.length === 1 ? '' : 's'}`);
    statusBadge.classList.remove('down');
  } catch (error) {
    credentials = [];
    renderCredentials(credentials);
    setStatus(t('transfer.unavailable'));
    statusBadge.classList.add('down');
    showError(error);
  }
}

function renderCredentials(items) {
  if (items.length === 0) {
    exportTableBody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><h3>${t('transfer.noCredentials')}</h3><p>${t('transfer.noCredentialsHelp')}</p></div></td></tr>`;
    return;
  }

  const disabled = exportAllCheckbox.checked ? 'disabled' : '';
  exportTableBody.innerHTML = items.map((credential) => {
    const id = credential.credentialId ?? '';
    const name = credential.display?.name ?? credential.metadata?.displayName ?? credential.externalReference ?? id;
    const provider = credential.providerName ?? credential.providerKey ?? '–';
    const type = credential.credentialType ?? 'unknown';
    const status = credential.status ?? credential.lifecycleState ?? 'unknown';

    return `
      <tr>
        <td><input type="checkbox" name="credentialIds" value="${escapeHtml(id)}" ${disabled} aria-label="${escapeHtml(name)}"></td>
        <td><strong>${escapeHtml(name)}</strong><small>${escapeHtml(id)}</small></td>
        <td>${escapeHtml(provider)}</td>
        <td>${escapeHtml(type)}</td>
        <td><span class="status-pill status-${escapeHtml(status)}">${escapeHtml(status)}</span></td>
      </tr>
    `;
  }).join('');
}

async function exportCredentials() {
  hideMessages();
  setExportSubmitting(true);

  try {
    const formData = new FormData(exportForm);
    const password = String(formData.get('exportPassword') ?? '');
    const selectedIds = Array.from(exportForm.querySelectorAll('input[name="credentialIds"]:checked')).map((input) => input.value);
    const all = exportAllCheckbox.checked;

    if (!all && selectedIds.length === 0) {
      throw new Error(t('transfer.selectCredentialsError'));
    }

    const body = await postJson('/api/v1/credentials/export', {
      all,
      credentialIds: all ? undefined : selectedIds,
      encryptionPassword: password
    });

    const data = body.data ?? {};
    const content = typeof data.content === 'string' ? data.content : JSON.stringify(data.payload, null, 2);
    downloadTextFile(data.filename ?? 'credential-hub-credentials.encrypted.json', content, data.contentType ?? 'application/json');
    showSuccess(t('transfer.exportCreated', { filename: data.filename ?? 'credential-hub-credentials.encrypted.json' }));
  } catch (error) {
    showError(error);
  } finally {
    setExportSubmitting(false);
  }
}

async function readSelectedImportFile() {
  hideMessages();
  resetPreview();
  const file = importFileInput.files?.[0];
  if (!file) return;

  try {
    importContentInput.value = await file.text();
  } catch (error) {
    showError(error);
  }
}

async function previewImport() {
  hideMessages();
  setPreviewSubmitting(true);

  try {
    const payload = buildImportPayload();
    const fingerprint = await fingerprintImportPayload(payload);
    const body = await postJson('/api/v1/credentials/import/preview', payload);
    lastPreview = body.data;
    lastPreviewFingerprint = fingerprint;
    renderPreview(lastPreview);
    importSubmitButton.disabled = false;
    showSuccess(t('transfer.previewReady'));
  } catch (error) {
    resetPreview();
    showError(error);
  } finally {
    setPreviewSubmitting(false);
  }
}

async function importCredentials() {
  hideMessages();
  setImportSubmitting(true);

  try {
    if (!lastPreview) {
      throw new Error(t('transfer.previewFirst'));
    }

    const payload = buildImportPayload();
    if (lastPreviewFingerprint !== await fingerprintImportPayload(payload)) {
      resetPreview();
      throw new Error(t('transfer.previewFirst'));
    }
    const body = await postJson('/api/v1/credentials/import', payload);
    const summary = body.data?.summary ?? {};

    showSuccess(t('transfer.complete', { created: numberOrZero(summary.created), overwritten: numberOrZero(summary.overwritten), skipped: numberOrZero(summary.skipped) }));
    resetPreview();
    importForm.reset();
    await updateImportFormatUi();
loadCredentials();
  } catch (error) {
    resetPreview();
    showError(error);
  } finally {
    setImportSubmitting(false);
  }
}

function updateImportFormatUi({ reset = true } = {}) {
  const sourceFormat = importSourceFormatInput?.value ?? 'transfer';
  const isCsv = sourceFormat === 'csv';
  if (importPasswordField) {
    importPasswordField.classList.toggle('hidden', isCsv);
  }
  if (importContentInput) {
    importContentInput.placeholder = isCsv
      ? 'providerKey,externalReference,displayName,apiKey\nopenai,prod,OpenAI Production,sk-...'
      : '{ ... }';
  }
  if (reset) resetPreview();
}

function buildImportPayload() {
  const formData = new FormData(importForm);
  const content = String(formData.get('importContent') ?? '').trim();
  const sourceFormat = String(formData.get('sourceFormat') ?? 'transfer');
  const password = String(formData.get('importPassword') ?? '');
  const conflictStrategy = String(formData.get('conflictStrategy') ?? 'skip');

  if (!content) {
    throw new Error(t('transfer.contentRequired'));
  }

  return {
    content,
    sourceFormat,
    encryptionPassword: password,
    conflictStrategy
  };
}

function renderPreview(preview) {
  const summary = preview?.summary ?? {};
  const items = Array.isArray(preview?.items) ? preview.items : [];

  importPreviewSummary.innerHTML = [
    [t('transfer.total'), summary.total],
    [t('transfer.new'), summary.create],
    [t('transfer.conflicts'), summary.conflicts],
    [t('transfer.csvRows'), preview?.csv?.rowCount],
    [t('transfer.skip'), summary.skip]
  ].map(([label, value]) => `
    <div class="dashboard-card">
      <h3>${escapeHtml(label)}</h3>
      <strong>${numberOrZero(value)}</strong>
    </div>
  `).join('');

  importPreviewTableBody.innerHTML = items.map((item) => {
    const credential = item.credential ?? item.source ?? {};
    const id = credential.credentialId ?? item.credentialId ?? '–';
    const name = credential.metadata?.displayName ?? credential.externalReference ?? id;
    const provider = credential.providerKey ?? item.providerKey ?? '–';
    const action = item.action ?? item.operation ?? 'unknown';
    const conflict = item.conflict ? (item.conflict.reason ?? item.conflict.type ?? 'Konflikt') : '–';

    return `
      <tr>
        <td><span class="status-pill status-${escapeHtml(action)}">${escapeHtml(action)}</span></td>
        <td><strong>${escapeHtml(name)}</strong><small>${escapeHtml(id)}</small></td>
        <td>${escapeHtml(provider)}</td>
        <td>${escapeHtml(conflict)}</td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="4">${t('transfer.noImportable')}</td></tr>`;

  importPreviewPanel.classList.remove('hidden');
}

function resetPreview() {
  lastPreview = null;
  lastPreviewFingerprint = null;
  importSubmitButton.disabled = true;
  importPreviewPanel.classList.add('hidden');
  importPreviewSummary.innerHTML = '';
  importPreviewTableBody.innerHTML = '';
}

async function postJson(path, payload) {
  return adminApi.post(path, payload);
}

function downloadTextFile(filename, content, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function setStatus(message) {
  statusBadge.textContent = message;
}

function hideMessages() {
  errorBox.classList.add('hidden');
  successBox.classList.add('hidden');
}

function showError(error) {
  errorBox.textContent = error instanceof Error ? userFacingError(error) : error;
  errorBox.classList.remove('hidden');
}

function showSuccess(message) {
  successBox.textContent = message;
  successBox.classList.remove('hidden');
}

function setExportSubmitting(isSubmitting) {
  exportSubmitButton.disabled = isSubmitting;
  exportSubmitButton.textContent = isSubmitting ? t('transfer.creatingExport') : t('transfer.createExport');
}

function setPreviewSubmitting(isSubmitting) {
  importPreviewButton.disabled = isSubmitting;
  importPreviewButton.textContent = isSubmitting ? t('transfer.checkingPreview') : t('transfer.checkPreview');
}

function setImportSubmitting(isSubmitting) {
  importSubmitButton.disabled = isSubmitting || !lastPreview || !lastPreviewFingerprint;
  importSubmitButton.textContent = isSubmitting ? t('transfer.importing') : t('transfer.runImport');
}

async function fingerprintImportPayload(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
  }

  let hash = 2166136261;
  for (const value of bytes) {
    hash ^= value;
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16)}`;
}

onLanguageChange(() => {
  updateImportFormatUi({ reset: false });
  renderCredentials(credentials);
  if (lastPreview) renderPreview(lastPreview);
});

function numberOrZero(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
