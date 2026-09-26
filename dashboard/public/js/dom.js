// Tiny DOM builders. Everything goes through createElement and textContent:
// the page runs under Trusted Types with no policy, so HTML strings never exist.

const SVG_NS = 'http://www.w3.org/2000/svg';
const FORBIDDEN_ATTR = /^(on|style$|srcdoc$)/i;

function setAttrs(el, attrs) {
  if (!attrs) return;
  for (const [name, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (FORBIDDEN_ATTR.test(name)) throw new Error(`attribute not allowed: ${name}`);
    el.setAttribute(name, value === true ? '' : String(value));
  }
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false || child === '') continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/**
 * h('p', 'caption', 'Some text') or h('div', { class: 'x', attrs: {...} }, child...).
 * A string second argument is the class name.
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (typeof props === 'string') {
    if (props) el.className = props;
  } else if (props) {
    if (props.class) el.className = props.class;
    setAttrs(el, props.attrs);
    if (props.data) for (const [k, v] of Object.entries(props.data)) el.dataset[k] = String(v);
    if (props.hidden) el.hidden = true;
  }
  append(el, children);
  return el;
}

/** SVG element with presentation attributes (never a style attribute). */
export function s(tag, attrs, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  setAttrs(el, attrs);
  append(el, children);
  return el;
}

/** A link only for https URLs; anything else renders as plain text. */
export function link(url, label, cls) {
  if (typeof url === 'string' && url.startsWith('https://')) {
    return h('a', { class: cls || '', attrs: { href: url, target: '_blank', rel: 'noopener noreferrer' } },
      label, h('span', 'sr-only', ' (opens in a new tab)'));
  }
  return h('span', cls || '', label);
}

/** Status marker: a shape per level so the state never rides on colour alone. */
export function statusIcon(level, size = 20) {
  const svgEl = s('svg', {
    class: `sicon sicon-${level}`, width: size, height: size, viewBox: '0 0 20 20', 'aria-hidden': 'true', focusable: 'false',
  });
  if (level === 'good') {
    svgEl.append(
      s('circle', { class: 'sfill', cx: 10, cy: 10, r: 9 }),
      s('path', { class: 'smark', d: 'M5.5 10.3l3 3 6-6.4', fill: 'none', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    );
  } else if (level === 'warn') {
    svgEl.append(
      s('path', { class: 'sfill', d: 'M10 1.6l8.8 15.6a1 1 0 0 1-.9 1.5H2.1a1 1 0 0 1-.9-1.5z' }),
      s('path', { class: 'smark', d: 'M10 7v5', fill: 'none', 'stroke-width': 2.2, 'stroke-linecap': 'round' }),
      s('circle', { class: 'smark-dot', cx: 10, cy: 15.2, r: 1.25 }),
    );
  } else if (level === 'bad') {
    svgEl.append(
      s('path', { class: 'sfill', d: 'M6.3 1h7.4L19 6.3v7.4L13.7 19H6.3L1 13.7V6.3z' }),
      s('path', { class: 'smark', d: 'M7 7l6 6M13 7l-6 6', fill: 'none', 'stroke-width': 2.2, 'stroke-linecap': 'round' }),
    );
  } else if (level === 'info') {
    svgEl.append(
      s('circle', { class: 'sfill', cx: 10, cy: 10, r: 9 }),
      s('path', { class: 'smark', d: 'M10 9v5.2', fill: 'none', 'stroke-width': 2.2, 'stroke-linecap': 'round' }),
      s('circle', { class: 'smark-dot', cx: 10, cy: 5.9, r: 1.25 }),
    );
  } else {
    svgEl.append(
      s('circle', { class: 'sring', cx: 10, cy: 10, r: 8, fill: 'none', 'stroke-width': 2 }),
      s('path', { class: 'sring', d: 'M6.5 10h7', fill: 'none', 'stroke-width': 2, 'stroke-linecap': 'round' }),
    );
  }
  return svgEl;
}

/** Word that goes with a status marker, for screen readers and colour-blind eyes. */
export const LEVEL_WORD = { good: 'OK', warn: 'Check', bad: 'Problem', neutral: 'Note', info: 'Note' };

/** A text span whose age ("12 s ago") the page ticker keeps current. */
export function ageSpan(iso, { suffix = ' ago', empty = 'none yet' } = {}) {
  const el = h('span', 'age');
  el.dataset.ageFrom = typeof iso === 'string' ? iso : '';
  el.dataset.ageSuffix = suffix;
  el.dataset.ageEmpty = empty;
  return el;
}
