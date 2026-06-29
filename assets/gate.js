/* Diana Dashboard — passphrase gate.
   The data ships encrypted (data.enc.js). This prompts for the passphrase,
   derives a key (PBKDF2-SHA256) and decrypts (AES-256-GCM) entirely in the
   browser. Without the passphrase the repo/site only ever holds ciphertext.
   The decrypted data is kept in sessionStorage so navigating between pages
   doesn't re-prompt (cleared when the tab closes). */
(function(){
  const ENC = window.DIANA_ENC;
  const SKEY = 'diana_dash_data_v1';

  function b64ToBuf(s){ const bin=atob(s); const u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i); return u.buffer; }

  async function decrypt(pass){
    const enc = new TextEncoder();
    const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name:'PBKDF2', salt:b64ToBuf(ENC.salt), iterations:ENC.iter, hash:'SHA-256' },
      base, { name:'AES-GCM', length:256 }, false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name:'AES-GCM', iv:b64ToBuf(ENC.iv) }, key, b64ToBuf(ENC.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }

  function launch(data){
    window.DIANA = data;
    try { sessionStorage.setItem(SKEY, JSON.stringify(data)); } catch(e){}
    const ov = document.getElementById('gate'); if(ov) ov.remove();
    window.startApp();
  }

  function showGate(){
    const ov = document.createElement('div');
    ov.id = 'gate';
    ov.innerHTML = `<div class="gate-card">
      <div class="gate-lock">🔒</div>
      <h1>Diana · Dashboard</h1>
      <p>Enter the passphrase to unlock.</p>
      <form id="gate-form" autocomplete="off">
        <input id="gate-pass" type="password" inputmode="text" placeholder="Passphrase" autofocus aria-label="Passphrase">
        <button type="submit">Unlock</button>
      </form>
      <div id="gate-err" class="gate-err"></div>
      <div class="gate-foot">Data is end-to-end encrypted. The passphrase never leaves your device.</div>
    </div>`;
    document.body.appendChild(ov);
    const form = ov.querySelector('#gate-form');
    const input = ov.querySelector('#gate-pass');
    const err = ov.querySelector('#gate-err');
    const btn = form.querySelector('button');
    form.addEventListener('submit', async e=>{
      e.preventDefault();
      const pass = input.value.trim();
      if(!pass) return;
      btn.disabled = true; btn.textContent = 'Unlocking…'; err.textContent = '';
      try {
        const data = await decrypt(pass);
        launch(data);
      } catch(ex){
        err.textContent = 'Wrong passphrase — try again.';
        btn.disabled = false; btn.textContent = 'Unlock';
        input.select();
      }
    });
  }

  // already unlocked this tab session?
  const cached = sessionStorage.getItem(SKEY);
  if(cached){ try { window.DIANA = JSON.parse(cached); window.startApp(); return; } catch(e){} }
  if(!ENC){ document.body.innerHTML = '<p style="font-family:sans-serif;padding:40px">Missing encrypted data file.</p>'; return; }
  showGate();
})();
