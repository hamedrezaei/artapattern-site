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
      if (count) count.textContent = shown + (shown === 1 ? ' planned note' : ' planned notes');
    });
  });

  // Contact form: prototype only — never pretend it was sent.
  var form = document.querySelector('[data-inquiry]');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = form.querySelector('[data-inquiry-note]');
      var invalid = form.querySelector(':invalid');
      form.querySelectorAll('.ap-field').forEach(function (f) { f.classList.remove('is-invalid'); });
      if (invalid) {
        var field = invalid.closest('.ap-field'); if (field) field.classList.add('is-invalid');
        invalid.focus();
        return;
      }
      // Build a mailto draft so the visitor can still reach out until a form endpoint is connected.
      var d = new FormData(form);
      var body = 'Name: ' + d.get('name') + '\nEmail: ' + d.get('email') + '\nOrganization: ' + (d.get('organization') || '-') +
        '\nEngagement: ' + d.get('engagement') + '\n\n' + d.get('description');
      var href = 'mailto:' + form.getAttribute('data-to') + '?subject=' + encodeURIComponent('Project inquiry — ' + d.get('engagement')) + '&body=' + encodeURIComponent(body);
      if (note) { note.hidden = false; note.querySelector('a').setAttribute('href', href); }
    });
  }
})();
