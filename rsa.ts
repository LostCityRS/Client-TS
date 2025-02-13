import fs from 'fs';

import forge from 'node-forge';

fs.writeFileSync('.env', '');

const key = forge.pki.rsa.generateKeyPair(1024); // RS3/OSRS still uses 1024 today
const privkey = forge.pki.privateKeyToPem(key.privateKey);
const pubkey = forge.pki.publicKeyToPem(key.publicKey);
fs.writeFileSync('private.pem', privkey);
fs.writeFileSync('public.pem', pubkey);

fs.appendFileSync('.env', 'LOGIN_RSAE=' + key.publicKey.e.toString(10) + '\n');
fs.appendFileSync('.env', 'LOGIN_RSAN=' + key.publicKey.n.toString(10) + '\n');
