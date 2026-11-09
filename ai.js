const chatLog = document.getElementById('chat-log');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');

const signInButton = document.getElementById('sign-in-button');
const accountStatus = document.getElementById('account-status');

// Conversation history sent to Puter on every turn
const history = [];

function addMessage(role, text) {
  const empty = chatLog.querySelector('.chat-empty');
  if (empty) empty.remove();

  const el = document.createElement('div');
  el.className = `chat-msg ${role}`;
  el.textContent = text;
  chatLog.append(el);
  chatLog.scrollTop = chatLog.scrollHeight;
  return el;
}

// Non-streamed replies can be a string or a message object with string/array content
function replyText(res) {
  if (typeof res === 'string') return res;
  const content = res?.message?.content ?? res?.text ?? '';
  if (Array.isArray(content)) return content.map((part) => part?.text ?? '').join('');
  return String(content);
}

async function refreshAccount() {
  if (typeof puter === 'undefined' || !puter.auth.isSignedIn()) {
    accountStatus.textContent = 'Guest mode';
    signInButton.textContent = 'Sign in';
    return;
  }
  try {
    const user = await puter.auth.getUser();
    accountStatus.textContent = user.is_temp ? 'Guest (temporary)' : user.username;
    signInButton.textContent = user.is_temp ? 'Sign in' : 'Switch account';
  } catch (error) {
    console.error('Could not read Puter user:', error);
  }
}

// Guests get a temporary Puter account automatically. Must run inside a click/submit handler
// so the browser allows the popup.
function ensureAccount() {
  if (puter.auth.isSignedIn()) return Promise.resolve();
  return puter.auth.signIn({ attempt_temp_user_creation: true });
}

function authErrorMessage(error) {
  const code = error?.code || error?.error;
  if (code === 'popup_blocked') return 'Your browser blocked the Puter popup. Allow popups for this page and try again.';
  if (code === 'auth_window_closed') return 'The Puter window was closed before finishing. Send your message again to retry.';
  if (code === 'unsupported_origin') return 'Puter sign-in is not supported on this page (file:// or sandboxed frame). Open it from the hosted site.';
  return null;
}

async function sendMessage(text) {

  history.push({ role: 'user', content: text });
  addMessage('user', text);
  const replyEl = addMessage('assistant', '…');

  try {
    let reply = '';
    const stream = await puter.ai.chat(history, { stream: true });

    if (stream && typeof stream[Symbol.asyncIterator] === 'function') {
      for await (const part of stream) {
        reply += part?.text ?? '';
        replyEl.textContent = reply || '…';
        chatLog.scrollTop = chatLog.scrollHeight;
      }
    } else {
      reply = replyText(stream);
      replyEl.textContent = reply;
    }

    history.push({ role: 'assistant', content: reply });
  } catch (error) {
    console.error('AI request failed:', error);
    history.pop();
    replyEl.classList.add('error');
    replyEl.textContent = authErrorMessage(error) || 'Something went wrong. Please try again.';
  }
}

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  if (typeof puter === 'undefined') {
    addMessage('assistant error', 'Puter.js failed to load. Check your connection and try again.');
    return;
  }

  chatSend.disabled = true;
  // Start the guest sign-in synchronously so it still counts as a user action
  const accountReady = ensureAccount();
  try {
    await accountReady;
  } catch (error) {
    console.error('Puter sign-in failed:', error);
    addMessage('assistant error', authErrorMessage(error) || 'Could not start a Puter session. Please try again.');
    chatSend.disabled = false;
    return;
  }
  refreshAccount();

  chatInput.value = '';
  await sendMessage(text);
  chatSend.disabled = false;
  chatInput.focus();
});

signInButton.addEventListener('click', async () => {
  if (typeof puter === 'undefined') return;
  signInButton.disabled = true;
  try {
    // request_auth lets someone with a guest session pick or switch to a real account
    await puter.auth.signIn({ request_auth: true });
    await refreshAccount();
  } catch (error) {
    console.error('Puter sign-in failed:', error);
    addMessage('assistant error', authErrorMessage(error) || 'Sign-in did not complete.');
  } finally {
    signInButton.disabled = false;
  }
});

window.addEventListener('load', refreshAccount);
