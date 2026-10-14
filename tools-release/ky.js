// Ký gói phát hành: node ky.js → ghi HaoHao-V1.sig (chữ ký Ed25519 của HaoHao-V1.zip). Khoá riêng: khoa-ky/rieng.pem – KHÔNG đưa lên GitHub
const c = require('crypto'), fs = require('fs'), p = require('path'), d = __dirname;
const sig = c.sign(null, fs.readFileSync(p.join(d, 'HaoHao-V1.zip')), fs.readFileSync(p.join(d, 'khoa-ky', 'rieng.pem')));
fs.writeFileSync(p.join(d, 'HaoHao-V1.sig'), sig.toString('base64')); console.log('ky xong', sig.toString('base64').slice(0, 16));
