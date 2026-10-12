/* ArtaPattern — small progressive enhancements. Everything works without JS. */
(function () {
  // Mobile menu
  var btn = document.querySelector('[data-menu]');
  var nav = document.getElementById('mobile-nav');
  if (btn && nav) {
    var setOpen = function (open) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.hidden = !open;
      nav.classList.toggle('is-open', open);
    };
    btn.addEventListener('click', function () { setOpen(btn.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !nav.hidden) { setOpen(false); btn.focus(); } });
    window.matchMedia('(min-width: 900px)').addEventListener('change', function (m) { if (m.matches) setOpen(false); });
  }

  // Disclosure buttons: <button data-toggle="id" aria-expanded>
  document.querySelectorAll('[data-toggle]').forEach(function (b) {
    var target = document.getElementById(b.getAttribute('data-toggle'));
    if (!target) return;
    var labels = { open: b.getAttribute('data-label-open'), closed: b.getAttribute('data-label-closed') };
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      target.hidden = !open;
      if (labels.open && labels.closed) b.textContent = open ? labels.open : labels.closed;
    });
  });

  // Filters: <div data-filter-group="x"> buttons with data-filter, items with data-tags
  document.querySelectorAll('[data-filter-group]').forEach(function (group) {
    var name = group.getAttribute('data-filter-group');
    var items = document.querySelectorAll('[data-filter-item="' + name + '"]');
    var empty = document.querySelector('[data-filter-empty="' + name + '"]');
    var count = document.querySelector('[data-filter-count="' + name + '"]');
    var unit = ((count && count.getAttribute('data-filter-unit')) || 'planned note|planned notes').split('|');
    group.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-filter]');
      if (!b) return;
      var f = b.getAttribute('data-filter');
      group.querySelectorAll('button[data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      var shown = 0;
      items.forEach(function (it) {
        var ok = f === 'all' || (' ' + it.getAttribute('data-tags') + ' ').indexOf(' ' + f + ' ') > -1;
        it.hidden = !ok; if (ok) shown++;
      });
      if (empty) empty.hidden = shown > 0;
      if (count) count.textContent = shown + ' ' + (shown === 1 ? unit[0] : unit[1]);
    });
  });

  // Contact form: sends to the inquiry endpoint; shows success only after a confirmed response.
  // If sending fails, falls back to a prefilled email draft, so no inquiry is lost.
  var form = document.querySelector('[data-inquiry]');
  if (form) {
    // Preselect the topic when arriving from a starting-engagement link (?type=...)
    var want = new URLSearchParams(window.location.search).get('type');
    var sel = form.querySelector('select[name="engagement"]');
    if (want && sel) { Array.prototype.forEach.call(sel.options, function (o) { if (o.text === want) sel.value = o.value; }); }
    var btn = form.querySelector('[data-inquiry-submit]');
    var btnHtml = btn ? btn.innerHTML : '';
    var ok = form.querySelector('[data-inquiry-ok]');
    var note = form.querySelector('[data-inquiry-note]');
    var sending = false;

    function mailtoFallback(d) {
      var body = 'Name: ' + d.name + '\nEmail: ' + d.email + '\nOrganization: ' + (d.organization || '-') +
        '\nTopic: ' + d.engagement + '\n\n' + d.description;
      var subject = d.engagement && d.engagement !== 'Not sure yet' ? 'Project inquiry — ' + d.engagement : 'Project inquiry';
      var href = 'mailto:' + form.getAttribute('data-to') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      if (note) { note.hidden = false; note.querySelector('a').setAttribute('href', href); }
      window.location.href = href;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      if (ok) ok.hidden = true;
      if (note) note.hidden = true;
      var invalid = form.querySelector(':invalid');
      form.querySelectorAll('.ap-field').forEach(function (f) { f.classList.remove('is-invalid'); });
      if (invalid) {
        var field = invalid.closest('.ap-field'); if (field) field.classList.add('is-invalid');
        invalid.focus();
        return;
      }
      var fd = new FormData(form);
      var d = {
        name: fd.get('name'), email: fd.get('email'), organization: fd.get('organization') || '',
        engagement: fd.get('engagement'), description: fd.get('description'),
        website: fd.get('website') || '', page: window.location.pathname + window.location.search
      };
      var endpoint = form.getAttribute('data-endpoint');
      if (!endpoint || !window.fetch) { mailtoFallback(d); return; }
      sending = true;
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      var ctrl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
      // text/plain keeps this a simple CORS request (no preflight), which Apps Script requires
      fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(d), signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && res.ok) {
            form.querySelectorAll('input:not([type=hidden]), textarea').forEach(function (el) { el.value = ''; });
            if (ok) { ok.hidden = false; ok.setAttribute('tabindex', '-1'); ok.focus(); }
          } else { mailtoFallback(d); }
        })
        .catch(function () { mailtoFallback(d); })
        .then(function () {
          clearTimeout(timer); sending = false;
          if (btn) { btn.disabled = false; btn.innerHTML = btnHtml; }
        });
    });
  }
})();
