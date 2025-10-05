// Simple HTML include utility to reuse common fragments like headers/footers
// Usage: <div data-include="/assets/partials/header.html"></div>
(function () {
  function include(el) {
    const src = el.getAttribute('data-include');
    if (!src) return;
    fetch(src, { cache: 'no-cache' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load: ' + src);
        return res.text();
      })
      .then(html => {
        el.innerHTML = html;
        highlightActive(el);
        // Dispatch a custom event so pages can run any post-load logic
        el.dispatchEvent(new CustomEvent('included', { bubbles: true }));
      })
      .catch(err => {
        console.warn('Include fetch failed, using inline fallback for', src, err);
        // Fallback for file:// or blocked fetch: inline header (only for header.html)
        if (/header\.html$/i.test(src)) {
          el.innerHTML = `
<header class="header">
  <nav class="nav navbar navbar-expand-lg fixed-top">
    <div class="container-fluid">
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse"
        data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent"
        aria-expanded="false" aria-label="Toggle navigation">
        <i class="fa fa-bars" aria-hidden="true"></i>
      </button>
      <div class="collapse navbar-collapse" id="navbarSupportedContent">
        <ul class="navbar-nav mx-auto mb-2 mb-lg-0">
          <li class="nav-item"><a class="nav-link" href="index.html">Home</a></li>
          <li class="nav-item"><a class="nav-link" href="https://jonghan.gitbook.io/ctf-writeups">CTF Writeups</a></li>
          <li class="nav-item"><a class="nav-link" href="projects.html">Projects</a></li>
          <li class="nav-item"><a class="nav-link" href="QnJvd25pZSAg.html" id="shhhhhh">Meanwhile...</a></li>
        </ul>
      </div>
    </div>
  </nav>
</header>`;
          highlightActive(el);
        } else {
          el.innerHTML = '<!-- include failed: ' + src + ' -->';
        }
      });
  }

  function run() {
    document.querySelectorAll('[data-include]')
      .forEach(include);
  }

  function highlightActive(scope) {
    try {
      const here = window.location.pathname.replace(/\\/g, '/');
      const links = scope.querySelectorAll('a.nav-link[href]');
      links.forEach(a => {
        let href = a.getAttribute('href') || '';
        // Normalize relative links
        if (!href.startsWith('http')) {
          // handle leading /
          const url = new URL(href, window.location.origin);
          href = url.pathname;
        }
        if (href === here || (here.endsWith('/') && href.endsWith('/index.html'))) {
          a.classList.add('active');
          a.setAttribute('aria-current', 'page');
        }
      });
    } catch (_) { /* no-op */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
