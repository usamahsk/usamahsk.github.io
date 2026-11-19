/* ============ JS Academy — shared app ============ */
/* syntax highlighting + quiz engine + stage tabs + lesson progress */

(function () {
  'use strict';

  /* ---------- tiny JS syntax highlighter ---------- */
  const KEYWORDS = /\b(const|let|var|function|return|if|else|for|while|new|this|typeof|await|async|throw|try|catch|true|false|null|undefined|of|in|class|extends|import|export|from)\b/g;

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  window.hl = function (src) {
    const stash = [];
    const keep = (cls, txt) => { stash.push('<span class="' + cls + '">' + txt + '</span>'); return '\x01' + (stash.length - 1) + '\x01'; };
    let out = esc(src);
    out = out.replace(/\/\/[^\n]*/g, m => keep('tok-c', m));
    out = out.replace(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g, m => keep('tok-s', m));
    out = out.replace(KEYWORDS, m => keep('tok-k', m));
    out = out.replace(/\x01(\d+)\x01/g, (_, n) => stash[+n]);
    return out;
  };

  function paintCode() {
    document.querySelectorAll('pre.code code').forEach(el => {
      if (el.querySelector('.ln')) return; // stepper blocks manage their own per-line markup
      el.innerHTML = window.hl(el.textContent);
    });
  }

  /* ---------- quiz engine ----------
     Two question types:
       default   — multiple choice, click to answer
       type:'output' — learner TYPES the predicted output; compared loosely
     Question fields: q, code?, options?+answer (MC) or answer (output), explain, key? */
  function normalize(s) {
    return String(s).toLowerCase().replace(/[,;]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function mountQuiz(hostSel, questions) {
    questions.forEach((q, qi) => {
      const host = document.querySelector(hostSel);
      if (!host) return;
      const box = document.createElement('div');
      box.className = 'quiz';
      if (q.type === 'output') box.dataset.output = '1';
      let html = '<span class="qn">Question</span>'
               + '<p class="qp">' + q.q + '</p>';
      if (q.code) html += '<pre class="code"><code></code></pre>';
      if (q.type === 'output') {
        html += '<div class="outin">'
              + '<input class="outin-input" spellcheck="false" autocomplete="off" placeholder="Type the predicted output, e.g. 1 4 3 2">'
              + '<button class="btn checkbtn">Check</button></div>';
      } else {
        html += '<div class="opts"></div>';
      }
      html += '<div class="fb"></div>'
            + '<button class="btn ghost retry" style="margin-top:10px;display:none">Try again</button>';
      box.innerHTML = html;
      host.appendChild(box);
      if (q.code) box.querySelector('pre.code code').innerHTML = window.hl(q.code);

      const fb = box.querySelector('.fb');
      const retry = box.querySelector('.retry');

      if (q.type === 'output') {
        const input = box.querySelector('.outin-input');
        const check = box.querySelector('.checkbtn');
        const attempt = () => {
          if (box.classList.contains('locked') || !input.value.trim()) return;
          box.classList.add('locked');
          const right = normalize(input.value) === normalize(q.answer);
          if (right) {
            fb.className = 'fb ok';
            fb.innerHTML = '<b>✔ Correct — that\u2019s the exact output.</b>' + q.explain;
          } else {
            fb.className = 'fb bad';
            fb.innerHTML = '<b>✘ Not quite.</b> Expected: <code>' + esc(q.answer) + '</code><br>' + q.explain;
          }
          retry.style.display = 'inline-block';
        };
        check.onclick = attempt;
        input.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });
        retry.onclick = () => {
          box.classList.remove('locked');
          fb.className = 'fb'; fb.innerHTML = '';
          retry.style.display = 'none';
          input.value = ''; input.focus();
        };
      } else {
        const optsEl = box.querySelector('.opts');
        const btns = q.options.map((opt, oi) => {
          const b = document.createElement('button');
          b.className = 'opt';
          b.innerHTML = opt;
          b.onclick = () => {
            if (box.classList.contains('locked')) return;
            box.classList.add('locked');
            const right = oi === q.answer;
            if (right) {
              b.classList.add('ok');
              fb.className = 'fb ok';
              fb.innerHTML = '<b>✔ Correct.</b>' + q.explain;
            } else {
              b.classList.add('bad');
              btns[q.answer].classList.add('ok');
              fb.className = 'fb bad';
              fb.innerHTML = '<b>✘ Not quite.</b>' + q.explain;
            }
            retry.style.display = 'inline-block';
          };
          optsEl.appendChild(b);
          return b;
        });
        retry.onclick = () => {
          box.classList.remove('locked');
          btns.forEach(b => b.classList.remove('ok', 'bad'));
          fb.className = 'fb'; fb.innerHTML = '';
          retry.style.display = 'none';
        };
      }
    });
  }

  /* expose to lesson scripts */
  window.mountQuiz = mountQuiz;

  /* ---------- numbering: one pass after ALL questions are mounted ---------- */
  function renumberQuizzes() {
    const all = document.querySelectorAll('.quiz');
    all.forEach((box, i) => {
      const label = box.querySelector('.qn');
      if (label) label.textContent = 'Question ' + (i + 1) + ' of ' + all.length
        + (box.dataset.output ? ' \u00b7 type the output' : '');
    });
  }

  /* ---------- stage tabs: render one stage at a time (supports 5 stages) ---------- */
  const TABS = [
    ['1 · Read', 'the concept'],
    ['2 · Watch', 'the animation'],
    ['3 · Practice', 'get checked'],
    ['4 · Prove', 'say it out loud'],
    ['5 · Build', 'make it stick'],
  ];

  function initStages() {
    const bar = document.querySelector('.stages');
    const page = document.querySelector('.page');
    if (!bar || !page) return;

    const h2s = [...page.querySelectorAll(':scope > h2')].filter(h => {
      const n = h.querySelector('.num');
      return n && /^[1-5]/.test(n.textContent.trim());
    });
    if (h2s.length < 2) return;

    /* rebuild the tab bar from the stages actually present in this lesson */
    bar.innerHTML = h2s.map((h, i) => {
      const n = parseInt(h.querySelector('.num').textContent, 10);
      const t = TABS[n - 1] || [n + ' · Stage ' + n, ''];
      return `<div><b>${t[0]}</b>${t[1]}</div>`;
    }).join('');

    const panels = h2s.map(h2 => {
      const p = document.createElement('div');
      p.className = 'stage-panel';
      page.insertBefore(p, h2);
      let node = h2;
      while (node && !(node.tagName === 'H2' && node !== h2) &&
             !(node.classList && node.classList.contains('lessonnav'))) {
        const next = node.nextSibling;
        p.appendChild(node);
        node = next;
      }
      return p;
    });

    const tabs = [...bar.children];
    const activate = i => {
      panels.forEach((p, k) => p.classList.toggle('active', k === i));
      tabs.forEach((t, k) => t.classList.toggle('here', k === i));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    tabs.forEach((t, i) => {
      t.title = 'Jump to this stage';
      t.style.cursor = 'pointer';
      t.onclick = () => activate(i);
    });

    panels.forEach((p, i) => {
      if (i < panels.length - 1) {
        const holder = document.createElement('div');
        holder.className = 'panel-next';
        const b = document.createElement('button');
        b.className = 'btn';
        b.textContent = 'Continue \u2192';
        b.onclick = () => activate(i + 1);
        holder.appendChild(b);
        p.appendChild(holder);
      } else {
        /* last stage: point back to the map */
        const holder = document.createElement('div');
        holder.className = 'panel-next';
        const b = document.createElement('button');
        b.className = 'btn ghost';
        b.textContent = '🎓 Back to course map';
        b.onclick = () => location.href = 'index.html';
        holder.appendChild(b);
        p.appendChild(holder);
      }
    });

    activate(0);
  }

  /* ---------- lesson progress (localStorage) ---------- */
  const STORE = 'jsacademy-progress-v2';
  const read = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } };
  const write = d => { try { localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) { /* storage unavailable (private mode / opaque origin) — progress just won't persist */ } };

  window.lessonProgress = function (key) { return !!read()[key]; };
  window.setLessonDone = function (key, done) {
    const d = read(); d[key] = done; write(d);
    const el = document.getElementById('doneMsg');
    if (el) el.textContent = done ? '\u2714 Saved \u2014 marked complete on the course map.' : 'Marked as not done.';
  };

  document.addEventListener('DOMContentLoaded', () => { paintCode(); renumberQuizzes(); initStages(); });
})();
