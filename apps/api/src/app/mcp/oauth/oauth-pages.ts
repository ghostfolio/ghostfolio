export interface FormField {
  name: string;
  value: string;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Server-rendered on purpose: the OAuth redirect lands on the API, and one
// dialog is not worth routing through the Angular bundle.
function renderPage({ body, title }: { body: string; title: string }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)}</title>
<style>
:root { color-scheme: light dark; }
body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f6f6f7; color: #18181b; }
.card { width: min(420px, calc(100vw - 32px)); background: #fff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 28px; }
h1 { font-size: 18px; margin: 0 0 6px; }
p { font-size: 14px; line-height: 1.6; color: #52525b; margin: 0 0 16px; }
strong { color: #18181b; }
ul { margin: 0 0 20px; padding-left: 18px; font-size: 14px; color: #52525b; }
label { display: block; font-size: 13px; margin-bottom: 6px; color: #52525b; }
input[type=password] { box-sizing: border-box; width: 100%; padding: 9px 10px; margin-bottom: 20px; border-radius: 8px;
  border: 1px solid #d4d4d8; font-size: 14px; background: #fff; color: #18181b; }
.error { color: #b91c1c; margin-bottom: 12px; }
.actions { display: flex; gap: 10px; }
button { flex: 1; padding: 9px 14px; border-radius: 8px; font-size: 14px; cursor: pointer; border: 1px solid #d4d4d8; background: #fff; color: #18181b; }
button.primary { background: #18181b; border-color: #18181b; color: #fff; }
@media (prefers-color-scheme: dark) {
  body { background: #09090b; color: #fafafa; }
  .card { background: #18181b; border-color: #27272a; }
  strong { color: #fafafa; }
  p, ul, label { color: #a1a1aa; }
  input[type=password] { background: #09090b; border-color: #3f3f46; color: #fafafa; }
  button { background: #18181b; border-color: #3f3f46; color: #fafafa; }
  button.primary { background: #fafafa; border-color: #fafafa; color: #18181b; }
}
</style>
</head>
<body>
<div class="card">
${body}
</div>
</body>
</html>`;
}

export function renderConsentPage({
  clientName,
  errorMessage,
  fields
}: {
  clientName: string;
  errorMessage?: string;
  /** The authorization request, posted back as hidden fields. */
  fields: FormField[];
}) {
  const name = escapeHtml(clientName || 'An MCP client');

  return renderPage({
    title: 'Authorize access',
    body: `<h1>Authorize ${name}</h1>
<p><strong>${name}</strong> wants to read your Ghostfolio data (portfolio, holdings, transactions, accounts, investment plan) and to record new transactions in it. It cannot edit or delete anything.</p>
${errorMessage ? `<p class="error">${escapeHtml(errorMessage)}</p>` : ''}
<form method="post" action="/oauth/authorize">
${fields
  .map(
    ({ name: fieldName, value }) =>
      `<input type="hidden" name="${escapeHtml(fieldName)}" value="${escapeHtml(value)}">`
  )
  .join('\n')}
<label for="credential">Security Token (the one you sign in to Ghostfolio with)</label>
<input id="credential" type="password" name="credential" autocomplete="off" autofocus>
<div class="actions">
<button type="submit" name="decision" value="deny">Deny</button>
<button type="submit" name="decision" value="allow" class="primary">Authorize</button>
</div>
</form>`
  });
}

export function renderErrorPage(message: string) {
  return renderPage({
    title: 'Authorization failed',
    body: `<h1>Authorization failed</h1>
<p>${escapeHtml(message)}</p>`
  });
}
