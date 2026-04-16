(function() {
  if (window.__devHelperLoaded) return;
  window.__devHelperLoaded = true;

  var isActive = false;
  var selectedEls = [];
  var hoveredEl = null;

  // --- Styles ---
  var style = document.createElement('style');
  style.textContent = `
    .dh-panel {
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 99999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #1a1a1a;
      direction: ltr;
      text-align: left;
    }
    .dh-toggle {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #236cc0;
      color: #fff;
      border: none;
      cursor: pointer;
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      transition: background 0.2s;
    }
    .dh-toggle:hover { background: #3588f2; }
    .dh-toggle { cursor: grab; }
    .dh-toggle:active { cursor: grabbing; }
    .dh-toggle.active { background: #e74c3c; }
    .dh-body {
      display: none;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      width: 380px;
      max-height: 70vh;
      overflow: hidden;
      margin-bottom: 10px;
      border: 1px solid #e0e0e0;
    }
    .dh-body.open { display: flex; flex-direction: column; }
    .dh-header {
      padding: 12px 16px;
      background: #f8f8f8;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 600;
      font-size: 14px;
      cursor: grab;
    }
    .dh-header:active { cursor: grabbing; }
    .dh-header-actions { display: flex; gap: 8px; align-items: center; }
    .dh-header-actions button {
      background: none;
      border: 1px solid #d0d0d0;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 12px;
      cursor: pointer;
      color: #555;
    }
    .dh-header-actions button:hover { background: #eee; }
    .dh-select-btn {
      background: #236cc0 !important;
      color: #fff !important;
      border-color: #236cc0 !important;
    }
    .dh-select-btn.selecting {
      background: #e74c3c !important;
      border-color: #e74c3c !important;
    }
    .dh-selected-list {
      padding: 8px 16px;
      max-height: 180px;
      overflow-y: auto;
      border-bottom: 1px solid #e0e0e0;
    }
    .dh-selected-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px;
      margin-bottom: 4px;
      background: #f0f6ff;
      border-radius: 6px;
      font-size: 12px;
      font-family: 'SF Mono', Monaco, monospace;
    }
    .dh-selected-item .dh-tag { color: #236cc0; font-weight: 600; }
    .dh-selected-item .dh-class { color: #888; margin-left: 6px; }
    .dh-selected-item .dh-size { color: #aaa; margin-left: 6px; }
    .dh-remove-btn {
      background: none;
      border: none;
      color: #ccc;
      cursor: pointer;
      font-size: 16px;
      padding: 0 4px;
      line-height: 1;
    }
    .dh-remove-btn:hover { color: #e74c3c; }
    .dh-empty {
      padding: 16px;
      text-align: center;
      color: #aaa;
      font-size: 13px;
    }
    .dh-input-area {
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .dh-input-area textarea {
      width: 100%;
      border: 1px solid #d0d0d0;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 13px;
      font-family: inherit;
      resize: none;
      min-height: 60px;
      outline: none;
      direction: rtl;
      box-sizing: border-box;
    }
    .dh-input-area textarea:focus { border-color: #236cc0; }
    .dh-btn-row {
      display: flex;
      gap: 8px;
    }
    .dh-copy-btn {
      flex: 1;
      background: none;
      color: #555;
      border: 1px solid #d0d0d0;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    .dh-copy-btn:hover { background: #f0f0f0; }
    .dh-send-btn {
      flex: 2;
      background: #236cc0;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.2s;
    }
    .dh-send-btn:hover { background: #3588f2; }
    .dh-send-btn:disabled {
      background: #a0c4e8;
      cursor: not-allowed;
    }
    .dh-toast {
      position: fixed;
      bottom: 80px;
      left: 20px;
      background: #1a1a1a;
      color: #fff;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      z-index: 100000;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
    }
    .dh-toast.show { opacity: 1; }
    .dh-highlight-outline {
      position: absolute;
      border: 2px solid #236cc0;
      background: rgba(35, 108, 192, 0.08);
      pointer-events: none;
      z-index: 99998;
      border-radius: 4px;
      transition: none;
    }
    .dh-hover-outline {
      position: absolute;
      border: 2px dashed #3588f2;
      background: rgba(53, 136, 242, 0.05);
      pointer-events: none;
      z-index: 99997;
      border-radius: 4px;
    }
    .dh-hover-label {
      position: absolute;
      top: -22px;
      left: 0;
      background: #3588f2;
      color: #fff;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'SF Mono', Monaco, monospace;
      white-space: nowrap;
      pointer-events: none;
    }
    .dh-margin-overlay {
      position: absolute;
      background: rgba(246, 178, 107, 0.4);
      pointer-events: none;
      z-index: 99996;
    }
    .dh-padding-overlay {
      position: absolute;
      background: rgba(147, 196, 125, 0.45);
      pointer-events: none;
      z-index: 99997;
    }
    .dh-spacing-label {
      position: absolute;
      font-size: 9px;
      font-family: 'SF Mono', Monaco, monospace;
      color: #fff;
      pointer-events: none;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `;
  document.head.appendChild(style);

  // --- Toast ---
  var toast = document.createElement('div');
  toast.className = 'dh-toast';
  document.body.appendChild(toast);

  function showToast(msg, duration) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, duration || 2000);
  }

  // --- DOM ---
  var panel = document.createElement('div');
  panel.className = 'dh-panel';
  panel.innerHTML = `
    <div class="dh-body">
      <div class="dh-header">
        <span>Dev Helper</span>
        <div class="dh-header-actions">
          <button class="dh-clear-btn">Clear</button>
          <button class="dh-select-btn">Select</button>
        </div>
      </div>
      <div class="dh-selected-list">
        <div class="dh-empty">Click "Select" then click elements on the page.<br>Hold Shift to multi-select.</div>
      </div>
      <div class="dh-input-area">
        <textarea placeholder="Type instructions for the agent..."></textarea>
        <div class="dh-btn-row">
          <button class="dh-copy-btn">Copy</button>
          <button class="dh-send-btn">Send to Agent</button>
        </div>
      </div>
    </div>
    <button class="dh-toggle" title="Dev Helper">&#9881;</button>
  `;
  document.body.appendChild(panel);

  var toggleBtn = panel.querySelector('.dh-toggle');
  var body = panel.querySelector('.dh-body');
  var selectBtn = panel.querySelector('.dh-select-btn');
  var clearBtn = panel.querySelector('.dh-clear-btn');
  var listEl = panel.querySelector('.dh-selected-list');
  var textarea = panel.querySelector('textarea');
  var copyBtn = panel.querySelector('.dh-copy-btn');
  var sendBtn = panel.querySelector('.dh-send-btn');
  var hoverBox = null;

  toggleBtn.addEventListener('click', function() {
    body.classList.toggle('open');
  });

  selectBtn.addEventListener('click', function() {
    isActive = !isActive;
    selectBtn.classList.toggle('selecting', isActive);
    selectBtn.textContent = isActive ? 'Stop' : 'Select';
    toggleBtn.classList.toggle('active', isActive);
    if (!isActive) removeHover();
  });

  clearBtn.addEventListener('click', function() {
    selectedEls = [];
    renderList();
    removeHighlights();
  });

  function getSelector(el) {
    if (el.id) return el.tagName.toLowerCase() + '#' + el.id;
    var tag = el.tagName.toLowerCase();
    var cls = el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\s+/).filter(function(c) {
          return c && !c.startsWith('dh-');
        }).join('.')
      : '';
    return tag + cls;
  }

  function getPath(el) {
    var parts = [];
    var cur = el;
    while (cur && cur !== document.body && parts.length < 3) {
      parts.unshift(getSelector(cur));
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }

  function getOuterSnippet(el) {
    var clone = el.cloneNode(false);
    var html = clone.outerHTML;
    if (html.length > 120) html = html.substring(0, 120) + '...';
    return html;
  }

  function buildOutput() {
    var instruction = textarea.value.trim();
    var output = '';

    if (selectedEls.length > 0) {
      output += 'Selected elements:\n';
      selectedEls.forEach(function(el, i) {
        var rect = el.getBoundingClientRect();
        output += '\n' + (i + 1) + '. ' + getPath(el) + '\n';
        output += '   Size: ' + Math.round(rect.width) + 'x' + Math.round(rect.height) + '\n';
        output += '   HTML: ' + getOuterSnippet(el) + '\n';
        var cs = window.getComputedStyle(el);
        output += '   Styles: font-size=' + cs.fontSize + ', color=' + cs.color + ', bg=' + cs.backgroundColor + ', padding=' + cs.padding + ', margin=' + cs.margin + ', border-radius=' + cs.borderRadius + '\n';
      });
    }

    if (instruction) {
      output += '\nInstruction: ' + instruction + '\n';
    }

    return output;
  }

  function renderList() {
    if (selectedEls.length === 0) {
      listEl.innerHTML = '<div class="dh-empty">Click "Select" then click elements on the page.<br>Hold Shift to multi-select.</div>';
      return;
    }
    listEl.innerHTML = '';
    selectedEls.forEach(function(el, i) {
      var rect = el.getBoundingClientRect();
      var item = document.createElement('div');
      item.className = 'dh-selected-item';
      item.innerHTML = '<span><span class="dh-tag">' + el.tagName.toLowerCase() + '</span>' +
        '<span class="dh-class">' + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).filter(function(c){ return !c.startsWith('dh-'); }).slice(0,2).join('.') : '') + '</span>' +
        '<span class="dh-size"> ' + Math.round(rect.width) + 'x' + Math.round(rect.height) + '</span></span>' +
        '<button class="dh-remove-btn" data-index="' + i + '">&times;</button>';
      item.addEventListener('mouseenter', function() { highlightOne(el, 'hover'); });
      item.addEventListener('mouseleave', function() { removeHover(); });
      listEl.appendChild(item);
    });
    listEl.querySelectorAll('.dh-remove-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var idx = parseInt(btn.getAttribute('data-index'));
        selectedEls.splice(idx, 1);
        renderList();
        removeHighlights();
        drawHighlights();
      });
    });
  }

  function removeHighlights() {
    document.querySelectorAll('.dh-highlight-outline, .dh-sel-overlay').forEach(function(el) { el.remove(); });
  }

  function drawHighlights() {
    removeHighlights();
    selectedEls.forEach(function(el) {
      var rect = el.getBoundingClientRect();
      var cs = window.getComputedStyle(el);
      var scrollX = window.scrollX;
      var scrollY = window.scrollY;

      var pt = parseFloat(cs.paddingTop) || 0;
      var pr = parseFloat(cs.paddingRight) || 0;
      var pb = parseFloat(cs.paddingBottom) || 0;
      var pl = parseFloat(cs.paddingLeft) || 0;
      var mt = parseFloat(cs.marginTop) || 0;
      var mr = parseFloat(cs.marginRight) || 0;
      var mb = parseFloat(cs.marginBottom) || 0;
      var ml = parseFloat(cs.marginLeft) || 0;
      var hasMargin = mt || mr || mb || ml;
      var hasPadding = pt || pr || pb || pl;

      var container = document.createElement('div');
      container.className = 'dh-sel-overlay';
      container.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;pointer-events:none;z-index:99997;';

      // Margin overlays
      if (hasMargin) {
        var elTop = rect.top + scrollY, elLeft = rect.left + scrollX;
        if (mt > 0) drawBox(container, 'dh-margin-overlay', elLeft - ml, elTop - mt, rect.width + ml + mr, mt, mt);
        if (mb > 0) drawBox(container, 'dh-margin-overlay', elLeft - ml, elTop + rect.height, rect.width + ml + mr, mb, mb);
        if (ml > 0) drawBox(container, 'dh-margin-overlay', elLeft - ml, elTop, ml, rect.height, ml);
        if (mr > 0) drawBox(container, 'dh-margin-overlay', elLeft + rect.width, elTop, mr, rect.height, mr);
      }

      // Padding overlays
      if (hasPadding) {
        var elTop = rect.top + scrollY, elLeft = rect.left + scrollX;
        if (pt > 0) drawBox(container, 'dh-padding-overlay', elLeft, elTop, rect.width, pt, pt);
        if (pb > 0) drawBox(container, 'dh-padding-overlay', elLeft, elTop + rect.height - pb, rect.width, pb, pb);
        if (pl > 0) drawBox(container, 'dh-padding-overlay', elLeft, elTop + pt, pl, rect.height - pt - pb, pl);
        if (pr > 0) drawBox(container, 'dh-padding-overlay', elLeft + rect.width - pr, elTop + pt, pr, rect.height - pt - pb, pr);
      }

      // Outline
      var box = document.createElement('div');
      box.className = 'dh-highlight-outline';
      box.style.top = (rect.top + scrollY) + 'px';
      box.style.left = (rect.left + scrollX) + 'px';
      box.style.width = rect.width + 'px';
      box.style.height = rect.height + 'px';

      // Info label
      var labelParts = [getSelector(el) + ' — ' + Math.round(rect.width) + 'x' + Math.round(rect.height)];
      labelParts.push('F:' + cs.fontSize);
      if (hasPadding) labelParts.push('P:' + pt + '/' + pr + '/' + pb + '/' + pl);
      if (hasMargin) labelParts.push('M:' + mt + '/' + mr + '/' + mb + '/' + ml);
      var label = document.createElement('div');
      label.className = 'dh-hover-label';
      label.textContent = labelParts.join('  ');
      box.appendChild(label);

      container.appendChild(box);
      document.body.appendChild(container);
    });
  }

  function highlightOne(el, type) {
    removeHover();
    var rect = el.getBoundingClientRect();
    var cs = window.getComputedStyle(el);
    var scrollX = window.scrollX;
    var scrollY = window.scrollY;

    var pt = parseFloat(cs.paddingTop) || 0;
    var pr = parseFloat(cs.paddingRight) || 0;
    var pb = parseFloat(cs.paddingBottom) || 0;
    var pl = parseFloat(cs.paddingLeft) || 0;
    var mt = parseFloat(cs.marginTop) || 0;
    var mr = parseFloat(cs.marginRight) || 0;
    var mb = parseFloat(cs.marginBottom) || 0;
    var ml = parseFloat(cs.marginLeft) || 0;

    var hasMargin = mt || mr || mb || ml;
    var hasPadding = pt || pr || pb || pl;

    // Container for all hover overlays
    hoverBox = document.createElement('div');
    hoverBox.style.position = 'absolute';
    hoverBox.style.top = '0';
    hoverBox.style.left = '0';
    hoverBox.style.width = '0';
    hoverBox.style.height = '0';
    hoverBox.style.pointerEvents = 'none';
    hoverBox.style.zIndex = '99997';

    // Margin overlays (orange) — 4 rectangles around the element
    if (hasMargin) {
      var elTop = rect.top + scrollY;
      var elLeft = rect.left + scrollX;
      // Top margin
      if (mt > 0) drawBox(hoverBox, 'dh-margin-overlay', elLeft - ml, elTop - mt, rect.width + ml + mr, mt, mt);
      // Bottom margin
      if (mb > 0) drawBox(hoverBox, 'dh-margin-overlay', elLeft - ml, elTop + rect.height, rect.width + ml + mr, mb, mb);
      // Left margin
      if (ml > 0) drawBox(hoverBox, 'dh-margin-overlay', elLeft - ml, elTop, ml, rect.height, ml);
      // Right margin
      if (mr > 0) drawBox(hoverBox, 'dh-margin-overlay', elLeft + rect.width, elTop, mr, rect.height, mr);
    }

    // Padding overlays (green) — 4 rectangles inside the element border
    if (hasPadding) {
      var elTop = rect.top + scrollY;
      var elLeft = rect.left + scrollX;
      // Top padding
      if (pt > 0) drawBox(hoverBox, 'dh-padding-overlay', elLeft, elTop, rect.width, pt, pt);
      // Bottom padding
      if (pb > 0) drawBox(hoverBox, 'dh-padding-overlay', elLeft, elTop + rect.height - pb, rect.width, pb, pb);
      // Left padding
      if (pl > 0) drawBox(hoverBox, 'dh-padding-overlay', elLeft, elTop + pt, pl, rect.height - pt - pb, pl);
      // Right padding
      if (pr > 0) drawBox(hoverBox, 'dh-padding-overlay', elLeft + rect.width - pr, elTop + pt, pr, rect.height - pt - pb, pr);
    }

    // Element outline (dashed blue)
    var outline = document.createElement('div');
    outline.className = 'dh-hover-outline';
    outline.style.top = (rect.top + scrollY) + 'px';
    outline.style.left = (rect.left + scrollX) + 'px';
    outline.style.width = rect.width + 'px';
    outline.style.height = rect.height + 'px';

    // Label
    var labelParts = [getSelector(el) + ' — ' + Math.round(rect.width) + 'x' + Math.round(rect.height)];
    labelParts.push('F:' + cs.fontSize);
    if (hasPadding) labelParts.push('P:' + pt + '/' + pr + '/' + pb + '/' + pl);
    if (hasMargin) labelParts.push('M:' + mt + '/' + mr + '/' + mb + '/' + ml);
    var label = document.createElement('div');
    label.className = 'dh-hover-label';
    label.textContent = labelParts.join('  ');
    outline.appendChild(label);
    hoverBox.appendChild(outline);

    document.body.appendChild(hoverBox);
  }

  function drawBox(parent, className, x, y, w, h, value) {
    if (w <= 0 || h <= 0) return;
    var box = document.createElement('div');
    box.className = className;
    box.style.top = y + 'px';
    box.style.left = x + 'px';
    box.style.width = w + 'px';
    box.style.height = h + 'px';
    // Show value label if the box is big enough
    if (value && (w >= 16 || h >= 16)) {
      var lbl = document.createElement('div');
      lbl.className = 'dh-spacing-label';
      lbl.textContent = Math.round(value);
      lbl.style.top = y + 'px';
      lbl.style.left = x + 'px';
      lbl.style.width = w + 'px';
      lbl.style.height = h + 'px';
      lbl.style.color = className.includes('margin') ? '#b45309' : '#2d6a1e';
      lbl.style.fontWeight = '600';
      parent.appendChild(lbl);
    }
    parent.appendChild(box);
  }

  function removeHover() {
    if (hoverBox) { hoverBox.remove(); hoverBox = null; }
  }

  // --- Page interaction ---
  document.addEventListener('mouseover', function(e) {
    if (!isActive) return;
    if (panel.contains(e.target)) return;
    hoveredEl = e.target;
    highlightOne(e.target);
  });

  document.addEventListener('mouseout', function(e) {
    if (!isActive) return;
    if (panel.contains(e.target)) return;
    removeHover();
    hoveredEl = null;
  });

  document.addEventListener('click', function(e) {
    if (!isActive) return;
    if (panel.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();

    var el = e.target;
    var idx = selectedEls.indexOf(el);
    if (e.shiftKey && idx > -1) {
      selectedEls.splice(idx, 1);
    } else if (e.shiftKey) {
      selectedEls.push(el);
    } else {
      selectedEls = [el];
    }
    renderList();
    drawHighlights();
  }, true);

  // --- Copy ---
  copyBtn.addEventListener('click', function() {
    var output = buildOutput();
    if (!output) return;
    navigator.clipboard.writeText(output).then(function() {
      showToast('Copied to clipboard');
    });
  });

  // --- Send to Agent ---
  sendBtn.addEventListener('click', function() {
    var output = buildOutput();
    if (!output) {
      showToast('Select elements or type instructions first');
      return;
    }

    navigator.clipboard.writeText(output).then(function() {
      showToast('Copied! Paste in Claude Code (Cmd+V)', 3000);
      textarea.value = '';
      selectedEls = [];
      renderList();
      removeHighlights();
    }).catch(function() {
      showToast('Failed to copy to clipboard');
    });
  });

  // --- Keyboard shortcut: Cmd+Shift+D ---
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isActive) {
      e.preventDefault();
      isActive = false;
      selectBtn.classList.remove('selecting');
      selectBtn.textContent = 'Select';
      toggleBtn.classList.remove('active');
      removeHover();
      selectedEls = [];
      renderList();
      removeHighlights();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      // Open panel if closed
      if (!body.classList.contains('open')) {
        body.classList.add('open');
      }
      // Toggle select mode
      isActive = !isActive;
      selectBtn.classList.toggle('selecting', isActive);
      selectBtn.textContent = isActive ? 'Stop' : 'Select';
      toggleBtn.classList.toggle('active', isActive);
      if (!isActive) removeHover();
    }
  });

  // --- Drag support ---
  var isDragging = false;
  var dragOffsetX = 0;
  var dragOffsetY = 0;

  toggleBtn.addEventListener('mousedown', function(e) {
    if (body.classList.contains('open')) return;
    isDragging = true;
    var rect = panel.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    e.preventDefault();
  });

  panel.querySelector('.dh-header').addEventListener('mousedown', function(e) {
    isDragging = true;
    var rect = panel.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    e.preventDefault();
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    var x = e.clientX - dragOffsetX;
    var y = e.clientY - dragOffsetY;
    panel.style.left = x + 'px';
    panel.style.top = y + 'px';
    panel.style.bottom = 'auto';
    panel.style.right = 'auto';
  });

  document.addEventListener('mouseup', function() {
    isDragging = false;
  });

  // Update highlights on scroll/resize
  window.addEventListener('scroll', drawHighlights);
  window.addEventListener('resize', drawHighlights);
})();
