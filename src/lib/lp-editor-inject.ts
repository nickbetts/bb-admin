/**
 * Generates a JavaScript string to inject into the LP iframe for live text editing.
 * The script adds:
 * - Hover highlighting on editable text elements
 * - Click to contentEditable
 * - A red × delete button that appears on hover for any deletable element
 * - postMessage back to parent on blur with { type, selector, oldText, newText }
 * - postMessage back to parent on delete with { type: 'lp-delete-element', selector }
 *
 * The parent page listens for messages and patches previewHtml accordingly.
 */

export function getEditorInjectionScript(): string {
  return `
<script data-lp-editor="true">
(function() {
  if (window.__lpEditorActive) return;
  window.__lpEditorActive = true;

  var EDITABLE_TAGS = ['H1','H2','H3','H4','H5','H6','P','SPAN','A','BUTTON','LI','TD','TH','LABEL','FIGCAPTION','BLOCKQUOTE'];
  var SKIP_DELETE_TAGS = ['HTML','BODY','HEAD','SCRIPT','STYLE','META','LINK','TITLE'];

  function isEditable(el) {
    if (!el || !el.tagName) return false;
    if (EDITABLE_TAGS.indexOf(el.tagName) === -1) return false;
    if (el.children.length > 0 && el.textContent.trim().length > 500) return false;
    if (el.textContent.trim().length === 0) return false;
    return true;
  }

  function isDeletable(el) {
    if (!el || !el.tagName) return false;
    if (SKIP_DELETE_TAGS.indexOf(el.tagName) !== -1) return false;
    if (el.getAttribute && el.getAttribute('data-lp-delete-btn')) return false;
    return true;
  }

  // Build a unique CSS selector path for an element
  function cssPath(el) {
    var parts = [];
    while (el && el !== document.documentElement) {
      if (el.id) {
        parts.unshift('#' + el.id);
        break;
      }
      var tag = el.tagName.toLowerCase();
      var siblings = el.parentNode ? Array.from(el.parentNode.children).filter(function(c) { return c.tagName === el.tagName; }) : [];
      if (siblings.length > 1) {
        var idx = siblings.indexOf(el) + 1;
        tag += ':nth-of-type(' + idx + ')';
      }
      parts.unshift(tag);
      el = el.parentNode;
    }
    return parts.join(' > ');
  }

  var currentEditing = null;
  var originalText = '';
  var deleteBtn = null;
  var deleteBtnTarget = null;

  function removeDeleteBtn() {
    if (deleteBtn && deleteBtn.parentNode) {
      var host = deleteBtn.parentNode;
      if (host.getAttribute && host.getAttribute('data-lp-pos-reset')) {
        host.style.position = '';
        host.removeAttribute('data-lp-pos-reset');
      }
      host.removeChild(deleteBtn);
    }
    deleteBtn = null;
    deleteBtnTarget = null;
  }

  function addDeleteBtn(el) {
    if (deleteBtnTarget === el) return; // already showing for this element
    removeDeleteBtn();
    if (!isDeletable(el)) return;

    var btn = document.createElement('button');
    btn.setAttribute('data-lp-delete-btn', '1');
    btn.title = 'Delete element';
    btn.style.cssText = [
      'position:absolute', 'top:-9px', 'right:-9px',
      'width:20px', 'height:20px',
      'background:#ef4444', 'color:#fff',
      'border:none', 'border-radius:50%',
      'font-size:15px', 'line-height:1',
      'cursor:pointer', 'z-index:2147483647',
      'box-shadow:0 1px 4px rgba(0,0,0,.35)',
      'padding:0', 'display:flex',
      'align-items:center', 'justify-content:center',
      'flex-shrink:0'
    ].join(';');
    btn.textContent = '×';

    btn.addEventListener('mousedown', function(e) {
      e.stopPropagation();
      e.preventDefault();
    });
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      e.preventDefault();
      var selector = cssPath(el);
      removeDeleteBtn();
      window.parent.postMessage({ type: 'lp-delete-element', selector: selector }, '*');
    });

    var pos = window.getComputedStyle(el).position;
    if (pos === 'static') {
      el.style.position = 'relative';
      el.setAttribute('data-lp-pos-reset', '1');
    }
    el.appendChild(btn);
    deleteBtn = btn;
    deleteBtnTarget = el;
  }

  // Hover highlight + delete button
  document.addEventListener('mouseover', function(e) {
    var el = e.target;
    if (el && el.getAttribute && el.getAttribute('data-lp-delete-btn')) return;
    if (isEditable(el) && el !== currentEditing) {
      el.style.outline = '2px solid rgba(59,130,246,0.5)';
      el.style.outlineOffset = '2px';
      el.style.cursor = 'text';
    }
    addDeleteBtn(el);
  }, true);

  document.addEventListener('mouseout', function(e) {
    var el = e.target;
    if (el !== currentEditing) {
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.cursor = '';
    }
    // Keep button while mouse is moving into the button itself
    var related = e.relatedTarget;
    if (related && related.getAttribute && related.getAttribute('data-lp-delete-btn')) return;
    removeDeleteBtn();
  }, true);

  // Click to edit
  document.addEventListener('click', function(e) {
    var el = e.target;
    if (!isEditable(el)) return;
    e.preventDefault();
    e.stopPropagation();

    if (currentEditing && currentEditing !== el) {
      finishEditing(currentEditing);
    }

    if (el.contentEditable === 'true') return;

    removeDeleteBtn();
    originalText = el.textContent;
    el.contentEditable = 'true';
    el.style.outline = '2px solid rgba(59,130,246,0.8)';
    el.style.outlineOffset = '2px';
    el.style.minHeight = '1em';
    el.focus();
    currentEditing = el;
  }, true);

  function finishEditing(el) {
    if (!el) return;
    var newText = el.textContent;
    el.contentEditable = 'false';
    el.style.outline = '';
    el.style.outlineOffset = '';
    el.style.cursor = '';

    if (newText !== originalText) {
      window.parent.postMessage({
        type: 'lp-text-edit',
        selector: cssPath(el),
        oldText: originalText,
        newText: newText
      }, '*');
    }
    currentEditing = null;
    originalText = '';
  }

  document.addEventListener('focusout', function(e) {
    if (currentEditing && e.target === currentEditing) {
      finishEditing(currentEditing);
    }
  }, true);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey && currentEditing) {
      e.preventDefault();
      finishEditing(currentEditing);
    }
    if (e.key === 'Escape' && currentEditing) {
      currentEditing.textContent = originalText;
      finishEditing(currentEditing);
    }
  }, true);

  // Signal ready
  window.parent.postMessage({ type: 'lp-editor-ready' }, '*');
})();
</script>`;
}

/**
 * Inject the editor script into HTML, or remove it.
 */
export function injectEditorScript(html: string): string {
  // Remove any existing editor script first
  const cleaned = html.replace(/<script data-lp-editor="true">[\s\S]*?<\/script>/g, "");
  const script = getEditorInjectionScript();
  if (cleaned.includes("</body>")) {
    return cleaned.replace("</body>", `${script}\n</body>`);
  }
  return cleaned + script;
}

export function removeEditorScript(html: string): string {
  return html.replace(/<script data-lp-editor="true">[\s\S]*?<\/script>/g, "");
}

/**
 * Remove the first element matching `selector` from the HTML string.
 * Uses DOMParser so whitespace differences between the stored HTML and the
 * live DOM don't cause mismatches.
 */
export function deleteElementByCssSelector(html: string, selector: string): string {
  if (typeof window === "undefined") return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const el = doc.querySelector(selector);
    if (!el) return html;
    el.remove();
    return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
  } catch {
    return html;
  }
}

/**
 * Apply a text edit to HTML by finding and replacing the text content.
 * Uses the old/new text approach — more robust than CSS selector patching.
 */
export function applyTextEdit(html: string, oldText: string, newText: string): string {
  // Escape special regex characters in oldText
  const escaped = oldText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Replace the first occurrence only (within tag content, not attributes)
  const regex = new RegExp(`(>\\s*)${escaped}(\\s*<)`, "s");
  const match = html.match(regex);
  if (match) {
    return html.replace(regex, `$1${newText}$2`);
  }
  // Fallback: simple string replace
  return html.replace(oldText, newText);
}
