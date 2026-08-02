import { adminApi } from './auth.js';
import { getLanguage, initI18n, onLanguageChange, t, userFacingError } from './i18n.js';
import { mountAdminShell } from './admin-shell.js';

initI18n();
await mountAdminShell();

const statusBadge = document.getElementById('api-token-status');
const errorBox = document.getElementById('api-token-error');
const tableBody = document.getElementById('api-token-table-body');
const refreshButton = document.getElementById('refresh-api-tokens');
const createOpenButton = document.getElementById('create-api-token-open');
const createPanel = document.getElementById('create-api-token-panel');
const createForm = document.getElementById('create-api-token-form');
const createCloseButton = document.getElementById('create-api-token-close');
const createCancelButton = document.getElementById('create-api-token-cancel');
const createSubmitButton = document.getElementById('create-api-token-submit');
const createErrorBox = document.getElementById('create-api-token-error');
const createdPanel = document.getElementById('created-api-token-panel');
const createdTokenValue = document.getElementById('created-api-token-value');
const copyCreatedTokenButton = document.getElementById('copy-created-api-token');
const closeCreatedTokenButton = document.getElementById('close-created-api-token');
const revokePanel = document.getElementById('revoke-api-token-panel');
const revokeMessage = document.getElementById('revoke-api-token-message');
const revokeCloseButton = document.getElementById('revoke-api-token-close');
const revokeCancelButton = document.getElementById('revoke-api-token-cancel');
const revokeConfirmButton = document.getElementById('revoke-api-token-confirm');
const revokeErrorBox = document.getElementById('revoke-api-token-error');

let selectedTokenForRevocation = null;
let currentTokens = [];

refreshButton?.addEventListener('click', () => {
  loadApiTokens();
});

createOpenButton?.addEventListener('click', () => {
  openCreateDialog();
});

createCloseButton?.addEventListener('click', () => {
  closeCreateDialog();
});

createCancelButton?.addEventListener('click', () => {
  closeCreateDialog();
});

createForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  submitCreateTokenForm();
});

copyCreatedTokenButton?.addEventListener('click', () => {
  copyCreatedToken();
});

closeCreatedTokenButton?.addEventListener('click', () => {
  closeCreatedTokenDialog();
});

tableBody?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="revoke-api-token"]');
  if (!button) return;

  openRevokeDialog({
    id: button.dataset.tokenId,
    name: button.dataset.tokenName,
    status: button.dataset.tokenStatus
  });
});

revokeCloseButton?.addEventListener('click', () => {
  closeRevokeDialog();
});

revokeCancelButton?.addEventListener('click', () => {
  closeRevokeDialog();
});

revokeConfirmButton?.addEventListener('click', () => {
  confirmRevokeToken();
});

loadApiTokens().then(async () => {
  const requestedTokenId = new URLSearchParams(window.location.search).get('tokenId');
  if (!requestedTokenId) return;
  try { await fetchTokenDetail(requestedTokenId); } catch (error) { showError(error); }
});

async function loadApiTokens() {
  setStatus(t('apiTokens.loading'));
  hideError();

  try {
    const tokens = await fetchApiTokens();
    currentTokens = tokens;
    renderApiTokens(tokens);
    setStatus(`${tokens.length} API Token${tokens.length === 1 ? '' : 's'}`);
    statusBadge.classList.remove('down');
  } catch (error) {
    renderApiTokens([]);
    setStatus(t('apiTokens.unavailable'));
    statusBadge.classList.add('down');
    showError(error);
  }
}

async function fetchApiTokens() {
  const body = await adminApi.get('/api/v1/management/api-tokens');
  if (body.success !== true) {
    const error = new Error(body.error?.message ?? 'API token request failed');
    error.code = body.error?.code;
    throw error;
  }

  return Array.isArray(body.data) ? body.data : [];
}

async function fetchTokenDetail(tokenId) {
  const body = await adminApi.get(`/api/v1/management/api-tokens/${encodeURIComponent(tokenId)}`);
  if (body.success !== true) {
    const error = new Error(body.error?.message ?? 'API token request failed');
    error.code = body.error?.code;
    throw error;
  }
  return body.data;
}

async function revokeApiToken(tokenId) {
  const body = await adminApi.delete(`/api/v1/management/api-tokens/${encodeURIComponent(tokenId)}`);
  if (body.success !== true) {
    const error = new Error(body.error?.message ?? 'API token request failed');
    error.code = body.error?.code;
    throw error;
  }

  return body.data;
}

async function createApiToken(payload) {
  const body = await adminApi.post('/api/v1/management/api-tokens', payload);
  if (body.success !== true) {
    const error = new Error(body.error?.message ?? 'API token request failed');
    error.code = body.error?.code;
    throw error;
  }

  return body.data;
}

function renderApiTokens(tokens) {
  if (tokens.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><h3>${t('apiTokens.none')}</h3><p>${t('apiTokens.noneHelp')}</p></div></td></tr>`;
    return;
  }

  tableBody.innerHTML = tokens.map((token) => `
    <tr>
      <td><strong>${escapeHtml(token.name ?? token.id ?? t('common.unknown'))}</strong><small>${escapeHtml(technicalId(token.id))}</small></td>
      <td><strong>${escapeHtml(token.userId ?? t('common.unknown'))}</strong></td>
      <td><code>${escapeHtml(token.credentialId ?? '–')}</code></td>
      <td><span class="status-pill status-${escapeHtml(token.status ?? 'unknown')}">${statusLabel(token.status)}</span></td>
      <td><code>${escapeHtml(token.tokenPrefix ?? '–')}</code></td>
      <td>${renderScopes(token.scopes)}</td>
      <td>${formatDateTime(token.createdAt)}</td>
      <td>${formatDateTime(token.expiresAt)}</td>
      <td>${formatDateTime(token.lastUsedAt)}</td>
      <td>${renderTokenActions(token)}</td>
    </tr>
  `).join('');
}

function openCreateDialog() {
  hideCreateError();
  createForm?.reset();
  const userIdField = document.getElementById('api-token-user-id');
  if (userIdField) userIdField.value = 'admin';
  createPanel.classList.remove('hidden');
  document.getElementById('api-token-name')?.focus();
}

function closeCreateDialog() {
  createPanel.classList.add('hidden');
  hideCreateError();
}

async function submitCreateTokenForm() {
  hideCreateError();
  setCreateSubmitting(true);

  try {
    const formData = new FormData(createForm);
    const payload = {
      name: String(formData.get('name') ?? '').trim(),
      userId: String(formData.get('userId') ?? '').trim(),
      expiresAt: normalizeExpiresAt(formData.get('expiresAt')),
      scopes: parseScopes(formData.get('scopes'))
    };

    const created = await createApiToken(payload);
    closeCreateDialog();
    await loadApiTokens();
    showCreatedToken(created.token);
  } catch (error) {
    showCreateError(error);
  } finally {
    setCreateSubmitting(false);
  }
}

function normalizeExpiresAt(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  return new Date(text).toISOString();
}

function parseScopes(value) {
  return String(value ?? '')
    .split(/[\n,]/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function showCreatedToken(token) {
  createdTokenValue.value = token ?? '';
  createdPanel.classList.remove('hidden');
  createdTokenValue.focus();
  createdTokenValue.select();
}

function closeCreatedTokenDialog() {
  createdTokenValue.value = '';
  createdPanel.classList.add('hidden');
}

async function copyCreatedToken() {
  const token = createdTokenValue.value;
  if (!token) return;

  try {
    await navigator.clipboard.writeText(token);
    copyCreatedTokenButton.textContent = t('apiTokens.copied');
    setTimeout(() => {
      copyCreatedTokenButton.textContent = t('apiTokens.copy');
    }, 1600);
  } catch {
    createdTokenValue.focus();
    createdTokenValue.select();
  }
}

function setCreateSubmitting(isSubmitting) {
  if (!createSubmitButton) return;
  createSubmitButton.disabled = isSubmitting;
  createSubmitButton.textContent = isSubmitting ? t('apiTokens.creating') : t('apiTokens.create');
}


function renderTokenActions(token) {
  const isRevoked = token.status === 'revoked';
  const disabled = isRevoked ? ' disabled' : '';
  const title = isRevoked ? t('apiTokens.alreadyRevoked') : t('apiTokens.revokeTitle');

  return `<button class="danger small" type="button" data-action="revoke-api-token" data-token-id="${escapeHtml(token.id ?? '')}" data-token-name="${escapeHtml(token.name ?? token.id ?? t('common.unknown'))}" data-token-status="${escapeHtml(token.status ?? '')}" title="${title}"${disabled}>${t('common.revoke')}</button>`;
}

function openRevokeDialog(token) {
  if (!token?.id) return;
  selectedTokenForRevocation = token;
  hideRevokeError();
  revokeMessage.textContent = t('apiTokens.revokeMessage', { name: token.name ?? token.id });
  revokePanel.classList.remove('hidden');
  revokeConfirmButton?.focus();
}

function closeRevokeDialog() {
  selectedTokenForRevocation = null;
  hideRevokeError();
  revokePanel.classList.add('hidden');
  setRevokeSubmitting(false);
}

async function confirmRevokeToken() {
  if (!selectedTokenForRevocation?.id) return;
  hideRevokeError();
  setRevokeSubmitting(true);

  try {
    await revokeApiToken(selectedTokenForRevocation.id);
    closeRevokeDialog();
    await loadApiTokens();
  } catch (error) {
    showRevokeError(error);
  } finally {
    setRevokeSubmitting(false);
  }
}

function setRevokeSubmitting(isSubmitting) {
  if (!revokeConfirmButton) return;
  revokeConfirmButton.disabled = isSubmitting;
  revokeConfirmButton.textContent = isSubmitting ? t('apiTokens.revoking') : t('apiTokens.revokeTitle');
}

function renderScopes(scopes) {
  const values = Array.isArray(scopes) ? scopes : [];
  if (values.length === 0) return `<span class="muted">${t('apiTokens.noScopes')}</span>`;
  return `<span class="tags">${values.map((scope) => `<span class="tag">${escapeHtml(scope)}</span>`).join('')}</span>`;
}

function statusLabel(value) {
  return t(`apiTokens.status.${value ?? 'unknown'}`);
}

function technicalId(value) { return value ? `${t('apiTokens.technicalId')}: ${value}` : ''; }

function formatDateTime(value) {
  if (!value) return '–';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return date.toLocaleString(getLanguage());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setStatus(message) {
  statusBadge.textContent = message;
}

function showError(error) {
  errorBox.textContent = userFacingError(error);
  errorBox.classList.remove('hidden');
}

function hideError() {
  errorBox.textContent = '';
  errorBox.classList.add('hidden');
}

function showCreateError(error) {
  createErrorBox.textContent = userFacingError(error);
  createErrorBox.classList.remove('hidden');
}

function hideCreateError() {
  createErrorBox.textContent = '';
  createErrorBox.classList.add('hidden');
}

function showRevokeError(error) {
  revokeErrorBox.textContent = userFacingError(error);
  revokeErrorBox.classList.remove('hidden');
}

onLanguageChange(() => {
  renderApiTokens(currentTokens);
  if (selectedTokenForRevocation) openRevokeDialog(selectedTokenForRevocation);
});

function hideRevokeError() {
  revokeErrorBox.textContent = '';
  revokeErrorBox.classList.add('hidden');
}
