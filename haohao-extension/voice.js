const $ = s => document.querySelector(s);
const target = new URLSearchParams(location.search).get('target') || 'idea';
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, listening = false, finalText = '';

if (target === 'todo') { $('#saveTodo').classList.add('main'); $('#saveIdea').classList.remove('main'); }

function setUI() {
  $('#mic').classList.toggle('on', listening); $('#mic').classList.toggle('off', !listening);
  $('#head').textContent = listening ? 'HaoHao đang nghe…' : 'Đã dừng nghe';
  const has = $('#txt').value.trim().length > 0;
  $('#saveIdea').disabled = !has; $('#saveTodo').disabled = !has;
}
function status(t, err) { $('#status').textContent = t; $('#status').classList.toggle('err', !!err); }

function start() {
  if (!SR) { status('Chrome này không hỗ trợ nhận giọng nói. Bạn gõ tay vào ô bên dưới nhé.', true); setUI(); return; }
  if (listening) return;
  rec = new SR();
  rec.lang = 'vi-VN'; rec.continuous = true; rec.interimResults = true;
  finalText = $('#txt').value ? $('#txt').value.trim() + ' ' : '';
  rec.onresult = e => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript.trim() + ' '; else interim += r[0].transcript;
    }
    $('#txt').value = (finalText + interim).trim();
    setUI();
  };
  rec.onerror = e => {
    const map = {
      'not-allowed': 'Chưa cho phép dùng micro. Bấm vào biểu tượng ổ khoá hoặc micro ở đầu cửa sổ, chọn Cho phép, rồi bấm nút micro lại.',
      'service-not-allowed': 'Chrome chưa cho phép nhận giọng nói. Bấm nút micro để thử lại.',
      'no-speech': 'Không nghe thấy gì. Bấm nút micro rồi nói lại nhé.',
      'audio-capture': 'Không tìm thấy micro trên máy.',
      'network': 'Nhận giọng nói cần có mạng Internet.'
    };
    status(map[e.error] || ('Lỗi: ' + e.error), true);
  };
  rec.onend = () => { listening = false; setUI(); if (!$('#status').classList.contains('err')) status($('#txt').value ? 'Xong. Sửa lại nếu cần rồi bấm Lưu.' : 'Bấm nút micro để nói.'); };
  try { rec.start(); listening = true; status('Cứ nói tự nhiên bằng tiếng Việt. Nói xong bấm Lưu.'); } catch { }
  setUI();
}
function stop() { if (rec) rec.stop(); }

$('#mic').addEventListener('click', () => listening ? stop() : start());
$('#again').addEventListener('click', () => { stop(); $('#txt').value = ''; finalText = ''; setTimeout(start, 250); });
$('#txt').addEventListener('input', setUI);
$('#saveIdea').addEventListener('click', async () => {
  stop();
  const text = $('#txt').value.trim(); if (!text) return;
  await chrome.runtime.sendMessage({ type: 'idea-add', item: { type: 'voice', text, title: 'Ghi chú giọng nói' } });
  status('Đã lưu vào kho ý tưởng 💡'); setTimeout(() => window.close(), 600);
});
$('#saveTodo').addEventListener('click', async () => {
  stop();
  const text = $('#txt').value.trim(); if (!text) return;
  const { todos = [] } = await chrome.storage.local.get('todos');
  todos.push({ id: 't' + Date.now().toString(36), text, done: false, due: '', notified: false });
  await chrome.storage.local.set({ todos });
  status('Đã thêm vào Todolist ✅'); setTimeout(() => window.close(), 600);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') window.close(); });
setUI();
start();
