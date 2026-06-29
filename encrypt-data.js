/* Encrypt assets/data.js (plaintext, local-only) -> assets/data.enc.js (ciphertext, committed).
   Matches the browser's WebCrypto: PBKDF2-SHA256 -> AES-256-GCM (tag appended to ciphertext).
   Usage:  node encrypt-data.js "<passphrase>"
   The plaintext data.js is git-ignored and never pushed. */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const pass = process.argv[2];
if (!pass) { console.error('Usage: node encrypt-data.js "<passphrase>"'); process.exit(1); }

const dataPath = path.join(__dirname, 'assets', 'data.js');
if (!fs.existsSync(dataPath)) { console.error('Missing assets/data.js (the plaintext source).'); process.exit(1); }

// load window.DIANA from data.js in a sandbox
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(dataPath, 'utf8'), sandbox);
const data = sandbox.window.DIANA;
if (!data) { console.error('data.js did not set window.DIANA'); process.exit(1); }

const ITER = 310000;
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const key = crypto.pbkdf2Sync(pass, salt, ITER, 32, 'sha256');
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const pt = Buffer.from(JSON.stringify(data), 'utf8');
const ct = Buffer.concat([cipher.update(pt), cipher.final()]);
const tag = cipher.getAuthTag();                       // 16 bytes, appended for WebCrypto

const out = {
  v: 1, alg: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iter: ITER,
  salt: salt.toString('base64'),
  iv: iv.toString('base64'),
  ct: Buffer.concat([ct, tag]).toString('base64')
};
fs.writeFileSync(path.join(__dirname, 'assets', 'data.enc.js'),
  'window.DIANA_ENC = ' + JSON.stringify(out) + ';\n');
console.log('Wrote assets/data.enc.js (' + out.ct.length + ' b64 chars of ciphertext).');
