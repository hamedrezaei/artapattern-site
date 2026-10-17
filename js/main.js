/* ArtaPattern — small progressive enhancements. Pages work without JS; the contact form then offers email instead. */
(function () {
  // Analytics events (GoatCounter, cookieless). No-ops when the counter is not loaded (local builds, blockers).
  function track(name, title) {
    try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: name, title: title || name, event: true }); } catch (e) {}
  }
  window.apTrack = track;
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    var from = window.location.pathname;
    if (href.indexOf('/contact/') === 0) track('cta-contact' + from, 'Contact CTA clicked on ' + from);
    else if (a.classList.contains('latest')) track('latest-note-click', 'Latest note card clicked');
    else if (href.indexOf('mailto:') === 0) track('mailto' + from, 'Email link clicked on ' + from);
    else if (href.indexOf('linkedin.com') > -1) track('linkedin' + from, 'LinkedIn link clicked on ' + from);
  });

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
    var unit = ((count && count.getAttribute('data-filter-unit')) || 'note|notes').split('|');
    group.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-filter]');
      if (!b) return;
      var f = b.getAttribute('data-filter');
      group.querySelectorAll('button[data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      var shown = 0;
      var only = count && count.getAttribute('data-filter-only');
      items.forEach(function (it) {
        var ok = f === 'all' || (' ' + it.getAttribute('data-tags') + ' ').indexOf(' ' + f + ' ') > -1;
        it.hidden = !ok; if (ok && (!only || it.getAttribute('data-status') === only)) shown++;
      });
      if (empty) empty.hidden = shown > 0;
      if (count) count.textContent = shown + ' ' + (shown === 1 ? unit[0] : unit[1]);
    });
  });

  // Contact form (A01–A07). Sends the unchanged payload to the inquiry endpoint as text/plain (a simple CORS
  // request, no preflight) and shows success only when the response body says {"ok":true}.
  // The submit button ships disabled in the HTML and is enabled only after this handler is attached, so without
  // JavaScript (or if this script fails before this point) neither a click nor Enter can submit the form, and no
  // inquiry text can end up in a URL. On any failure the entry is kept and an "Email instead" link is offered;
  // the email app is never opened automatically.
  var form = document.querySelector('[data-inquiry]');
  if (form) {
    var sel = form.querySelector('select[name="engagement"]');
    // Preselect the topic from ?type=... (URLSearchParams decodes %26 etc.); unknown values leave the default.
    var want = null;
    try { want = new URLSearchParams(window.location.search).get('type'); } catch (err) {}
    if (want && sel) { Array.prototype.forEach.call(sel.options, function (o) { if (o.text === want) sel.value = o.value; }); }

    var btn = form.querySelector('[data-inquiry-submit]');
    var btnHtml = btn ? btn.innerHTML : '';
    var ok = form.querySelector('[data-inquiry-ok]');
    var note = form.querySelector('[data-inquiry-note]');
    var mailLink = form.querySelector('[data-inquiry-mailto]');
    var descLabel = form.querySelector('[data-desc-label]');
    var descHint = form.querySelector('[data-desc-hint]');
    var sending = false;

    // A07: the description wording follows the selected topic; the payload field stays "description".
    function updateDesc() {
      if (!sel || !descLabel || !descHint) return;
      var recruiting = sel.value === 'Remote Engineering Opportunity';
      descLabel.textContent = recruiting ? 'Role Details' : 'Project Description';
      descHint.textContent = recruiting
        ? 'The role, the team and the systems involved, and how you would like to proceed.'
        : 'The context, the current system if there is one, and the decision or problem in front of you.';
    }
    if (sel) sel.addEventListener('change', updateDesc);
    updateDesc();

    // A03: mark every invalid field (aria-invalid + visible message), focus the first one.
    function validate() {
      var first = null;
      form.querySelectorAll('.ap-field').forEach(function (f) {
        var el = f.querySelector('input, textarea, select');
        if (!el || !el.willValidate) return;
        var bad = !el.checkValidity();
        f.classList.toggle('is-invalid', bad);
        el.setAttribute('aria-invalid', bad ? 'true' : 'false');
        if (bad && !first) first = el;
      });
      if (first) first.focus();
      return !first;
    }
    form.addEventListener('input', function (e) {
      var f = e.target.closest && e.target.closest('.ap-field');
      if (f && f.classList.contains('is-invalid') && e.target.checkValidity()) {
        f.classList.remove('is-invalid'); e.target.setAttribute('aria-invalid', 'false');
      }
    });

    function payload() {
      var fd = new FormData(form);
      return {
        name: fd.get('name'), email: fd.get('email'), organization: fd.get('organization') || '',
        engagement: fd.get('engagement'), description: fd.get('description'),
        website: fd.get('website') || '', page: window.location.pathname + window.location.search
      };
    }

    // A04: user-initiated email fallback; fields stay as typed for a retry.
    function showFallback(d) {
      track('inquiry-fallback-mailto', 'Inquiry could not be sent; email fallback offered');
      var body = 'Name: ' + d.name + '\nEmail: ' + d.email + '\nOrganization: ' + (d.organization || '-') +
        '\nTopic: ' + d.engagement + '\n\n' + d.description;
      var subject = d.engagement && d.engagement !== 'Not sure yet' ? 'Project inquiry — ' + d.engagement : 'Project inquiry';
      if (mailLink) mailLink.setAttribute('href', 'mailto:' + form.getAttribute('data-to') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body));
      if (note) { note.hidden = false; note.setAttribute('tabindex', '-1'); note.focus(); }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      if (ok) ok.hidden = true;
      if (note) note.hidden = true;
      if (!validate()) return;
      var d = payload();
      var endpoint = form.getAttribute('data-endpoint');
      if (!endpoint || !window.fetch) { showFallback(d); return; }
      sending = true;
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      var ctrl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
      fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(d), signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && res.ok === true) {
            form.querySelectorAll('input:not([type=hidden]), textarea').forEach(function (el) { el.value = ''; });
            if (ok) { ok.hidden = false; ok.setAttribute('tabindex', '-1'); ok.focus(); }
            track('inquiry-sent', 'Inquiry sent: ' + (d.engagement || 'unknown'));
          } else { showFallback(d); }
        })
        .catch(function () { showFallback(d); })
        .then(function () {
          clearTimeout(timer); sending = false;
          if (btn) { btn.disabled = false; btn.innerHTML = btnHtml; }
        });
    });

    // A02: enable submission only now that the handler above is attached.
    if (btn) btn.disabled = false;
    form.setAttribute('data-ready', '');
  }
})();

// Comparison tables: copy column headers onto cells so stacked rows stay readable on phones
document.querySelectorAll("table.cmp").forEach((t) => {
  const heads = [...t.querySelectorAll("thead th")].map((th) => th.textContent.trim());
  t.querySelectorAll("tbody tr").forEach((tr) => {
    [...tr.children].forEach((cell, i) => { if (cell.tagName === "TD" && heads[i]) cell.setAttribute("data-label", heads[i]); });
  });
});
