/**
 * expression.js — safe mathematical expression engine.
 *
 * Pipeline: tokenize → Pratt parser → AST → compiled evaluator.
 * NO eval(), NO new Function(): user equations can only ever reference
 * the injected scope (variables, constants, stdlib functions).
 *
 * Supports:
 *   arithmetic:  + - * / ^ %   (^ right-associative, unary minus)
 *   calls:       sin(t), clamp(x, 0, 1), noise(x, y)
 *   constants:   pi tau e phi
 *   programs:    `k = 3; x = sin(k*t) + 0.25*sin(11*t)`  (multi-statement)
 *   comments:    # ...  or  // ...
 *
 * Errors carry source spans { message, start, end } for inline display.
 */

/* ———————————————— Tokenizer ———————————————— */

export const TOKEN = {
  NUM: 'num',
  IDENT: 'ident',
  OP: 'op',
  LPAREN: '(',
  RPAREN: ')',
  COMMA: ',',
  ASSIGN: '=',
  SEMI: ';',
  EOF: 'eof',
};

export function tokenize(source) {
  const tokens = [];
  const src = String(source ?? '');
  let i = 0;

  const error = (message, start, end = start + 1) => {
    const e = new Error(message);
    e.span = { message, start, end };
    throw e;
  };

  while (i < src.length) {
    const ch = src[i];

    // whitespace (newlines become statement separators)
    if (ch === ' ' || ch === '\t' || ch === '\r') { i++; continue; }
    if (ch === '\n') { tokens.push({ type: TOKEN.SEMI, value: ';', start: i, end: i + 1 }); i++; continue; }

    // comments
    if (ch === '#' || (ch === '/' && src[i + 1] === '/')) {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }

    // numbers: 123  1.5  .5  1e-3
    if (/[0-9.]/.test(ch)) {
      const start = i;
      let seenDot = false;
      while (i < src.length && /[0-9.]/.test(src[i])) {
        if (src[i] === '.') {
          if (seenDot) error('Malformed number', start, i + 1);
          seenDot = true;
        }
        i++;
      }
      if (i < src.length && (src[i] === 'e' || src[i] === 'E')) {
        i++;
        if (src[i] === '+' || src[i] === '-') i++;
        if (!/[0-9]/.test(src[i])) error('Malformed exponent', start, i + 1);
        while (i < src.length && /[0-9]/.test(src[i])) i++;
      }
      const text = src.slice(start, i);
      const value = Number(text);
      if (!Number.isFinite(value)) error(`Invalid number "${text}"`, start, i);
      tokens.push({ type: TOKEN.NUM, value, start, end: i });
      continue;
    }

    // identifiers
    if (/[a-zA-Z_]/.test(ch)) {
      const start = i;
      while (i < src.length && /[a-zA-Z0-9_]/.test(src[i])) i++;
      tokens.push({ type: TOKEN.IDENT, value: src.slice(start, i), start, end: i });
      continue;
    }

    if ('+-*/^%'.includes(ch)) {
      tokens.push({ type: TOKEN.OP, value: ch, start: i, end: i + 1 });
      i++; continue;
    }
    if (ch === '(') { tokens.push({ type: TOKEN.LPAREN, start: i, end: i + 1 }); i++; continue; }
    if (ch === ')') { tokens.push({ type: TOKEN.RPAREN, start: i, end: i + 1 }); i++; continue; }
    if (ch === ',') { tokens.push({ type: TOKEN.COMMA, start: i, end: i + 1 }); i++; continue; }
    if (ch === ';') { tokens.push({ type: TOKEN.SEMI, start: i, end: i + 1 }); i++; continue; }
    if (ch === '=') { tokens.push({ type: TOKEN.ASSIGN, start: i, end: i + 1 }); i++; continue; }

    error(`Unexpected character "${ch}"`, i);
  }

  tokens.push({ type: TOKEN.EOF, start: src.length, end: src.length });
  return tokens;
}

/* ———————————————— Parser (Pratt) ———————————————— */

const BINARY_PRECEDENCE = { '+': 2, '-': 2, '*': 3, '/': 3, '%': 3, '^': 4 };

function parse(tokens) {
  let pos = 0;

  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const fail = (message, token) => {
    const e = new Error(message);
    e.span = { message, start: token.start, end: token.end };
    throw e;
  };

  function parseExpression(minPrecedence = 0) {
    let left = parsePrefix();

    while (peek().type === TOKEN.OP && BINARY_PRECEDENCE[peek().value] >= minPrecedence) {
      const opToken = next();
      const op = opToken.value;
      const precedence = BINARY_PRECEDENCE[op];
      // '^' is right-associative
      const right = parseExpression(op === '^' ? precedence : precedence + 1);
      left = { type: 'binary', op, left, right, start: left.start, end: right.end };
    }
    return left;
  }

  function parsePrefix() {
    const token = next();

    if (token.type === TOKEN.NUM) {
      return { type: 'num', value: token.value, start: token.start, end: token.end };
    }

    if (token.type === TOKEN.IDENT) {
      // function call?
      if (peek().type === TOKEN.LPAREN) {
        next(); // consume (
        const args = [];
        if (peek().type !== TOKEN.RPAREN) {
          for (;;) {
            args.push(parseExpression(0));
            if (peek().type === TOKEN.COMMA) { next(); continue; }
            break;
          }
        }
        const close = next();
        if (close.type !== TOKEN.RPAREN) fail('Expected ")"', close);
        return { type: 'call', name: token.value, args, start: token.start, end: close.end };
      }
      return { type: 'var', name: token.value, start: token.start, end: token.end };
    }

    if (token.type === TOKEN.OP && token.value === '-') {
      // operand parses at ^ precedence: -2^2 = -(2^2) = -4 (math convention)
      const arg = parseExpression(BINARY_PRECEDENCE['^']);
      return { type: 'unary', op: '-', arg, start: token.start, end: arg.end };
    }
    if (token.type === TOKEN.OP && token.value === '+') {
      return parseExpression(BINARY_PRECEDENCE['^']);
    }

    if (token.type === TOKEN.LPAREN) {
      const inner = parseExpression(0);
      const close = next();
      if (close.type !== TOKEN.RPAREN) fail('Expected ")"', close);
      inner.start = token.start;
      inner.end = close.end;
      return inner;
    }

    fail(`Unexpected "${token.value ?? token.type}"`, token);
    return null; // unreachable
  }

  function parseStatement() {
    const token = peek();
    if (token.type === TOKEN.IDENT && tokens[pos + 1]?.type === TOKEN.ASSIGN) {
      next(); // ident
      next(); // =
      const value = parseExpression(0);
      return { type: 'assign', name: token.value, value, start: token.start, end: value.end };
    }
    return parseExpression(0);
  }

  const statements = [];
  while (peek().type !== TOKEN.EOF) {
    if (peek().type === TOKEN.SEMI) { next(); continue; }
    statements.push(parseStatement());
    if (peek().type === TOKEN.SEMI) next();
  }
  if (!statements.length) {
    fail('Empty expression', tokens[tokens.length - 1]);
  }
  return { type: 'program', statements };
}

/* ———————————————— Evaluator ———————————————— */

function evaluateNode(node, scope) {
  switch (node.type) {
    case 'num':
      return node.value;

    case 'var': {
      const v = scope[node.name];
      if (typeof v === 'number') return v;
      if (v === undefined) {
        const e = new Error(`Unknown variable "${node.name}"`);
        e.span = { message: e.message, start: node.start, end: node.end };
        throw e;
      }
      const e = new Error(`"${node.name}" is a function, not a variable`);
      e.span = { message: e.message, start: node.start, end: node.end };
      throw e;
    }

    case 'unary':
      return -evaluateNode(node.arg, scope);

    case 'binary': {
      const l = evaluateNode(node.left, scope);
      const r = evaluateNode(node.right, scope);
      switch (node.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return l / r;
        case '%': return ((l % r) + r) % r;
        case '^': return Math.pow(l, r);
        default: return NaN;
      }
    }

    case 'call': {
      const fn = scope[node.name];
      if (typeof fn !== 'function') {
        const e = new Error(`Unknown function "${node.name}"`);
        e.span = { message: e.message, start: node.start, end: node.end };
        throw e;
      }
      const args = node.args.map((a) => evaluateNode(a, scope));
      return fn(...args);
    }

    case 'assign': {
      const v = evaluateNode(node.value, scope);
      scope[node.name] = v;
      return v;
    }

    case 'program': {
      let result = 0;
      for (const s of node.statements) result = evaluateNode(s, scope);
      return result;
    }

    default:
      return NaN;
  }
}

/* ———————————————— Public API ———————————————— */

const compileCache = new Map();
const CACHE_LIMIT = 300;

/**
 * Compile source into an evaluator.
 * @param {string} source
 * @returns {{ok: true, fn: (scope: object) => number} | {ok: false, error: {message,start,end}}}
 */
export function compileExpression(source) {
  const key = String(source ?? '');
  if (compileCache.has(key)) return compileCache.get(key);

  let result;
  try {
    const ast = parse(tokenize(key));
    result = {
      ok: true,
      ast,
      fn: (scope) => evaluateNode(ast, scope),
    };
  } catch (e) {
    result = { ok: false, error: e.span ?? { message: e.message, start: 0, end: key.length } };
  }

  if (compileCache.size >= CACHE_LIMIT) compileCache.clear();
  compileCache.set(key, result);
  return result;
}

/**
 * One-shot evaluation convenience.
 * @param {string} source
 * @param {object} vars  variables + stdlib base
 */
export function evaluate(source, vars) {
  const compiled = compileExpression(source);
  if (!compiled.ok) return compiled;
  try {
    return { ok: true, value: compiled.fn(vars) };
  } catch (e) {
    return { ok: false, error: e.span ?? { message: e.message, start: 0, end: 0 } };
  }
}

/**
 * Perturb every numeric literal in a source string (mutation in
 * equation space). Returns new source; syntax is always preserved.
 */
export function perturbLiterals(source, gaussian, strength = 0.12) {
  return String(source).replace(
    /(?<![a-zA-Z0-9_.])(\d+\.?\d*(?:[eE][+-]?\d+)?)/g,
    (match) => {
      const v = Number(match);
      if (!Number.isFinite(v) || v === 0) return match;
      const mutated = v * (1 + gaussian() * strength);
      return Number(mutated.toFixed(5)).toString();
    },
  );
}
