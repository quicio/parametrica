/**
 * expression.ts — safe mathematical expression engine.
 *
 * Pipeline: tokenize → Pratt parser → AST → compiled evaluator.
 * NO eval(), NO new Function(): user equations can only ever reference
 * the injected scope (variables, constants, stdlib functions).
 *
 * Supports:
 *   arithmetic:  + - * / ^ %   (^ right-associative, unary minus)
 *   comparison:  < <= > >= == !=   (result 1/0)
 *   boolean:     && || !             (result 1/0)
 *   calls:       sin(t), clamp(x, 0, 1), noise(x, y)
 *   constants:   pi tau e phi
 *   programs:    `k = 3; x = sin(k*t) + 0.25*sin(11*t)`  (multi-statement)
 *   comments:    # ...  or  // ...
 *
 * Errors carry source spans { message, start, end } for inline display.
 */

type Rec = Record<string, unknown>;

export interface SpanError {
  message: string;
  start: number;
  end: number;
}

export interface Token {
  type: string;
  value?: string | number;
  start: number;
  end: number;
}

export interface NumNode {
  type: 'num';
  value: number;
  start: number;
  end: number;
}

export interface VarNode {
  type: 'var';
  name: string;
  start: number;
  end: number;
}

export interface UnaryNode {
  type: 'unary';
  op: string;
  arg: ExprNode;
  start: number;
  end: number;
}

export interface BinaryNode {
  type: 'binary';
  op: string;
  left: ExprNode;
  right: ExprNode;
  start: number;
  end: number;
}

export interface CallNode {
  type: 'call';
  name: string;
  args: ExprNode[];
  start: number;
  end: number;
}

export type ExprNode = NumNode | VarNode | UnaryNode | BinaryNode | CallNode;

export interface AssignNode {
  type: 'assign';
  name: string;
  value: ExprNode;
  start: number;
  end: number;
}

export type StatementNode = AssignNode | ExprNode;

export interface ProgramNode {
  type: 'program';
  statements: StatementNode[];
}

export interface CompileSuccess {
  ok: true;
  ast: ProgramNode;
  fn: (scope: Rec) => number;
}

export interface CompileFailure {
  ok: false;
  error: SpanError;
}

export type CompileResult = CompileSuccess | CompileFailure;

export interface EvaluateSuccess {
  ok: true;
  value: number;
}

export type EvaluateResult = EvaluateSuccess | CompileFailure;

function expressionError(message: string, span: SpanError): Error & { span: SpanError } {
  const error = new Error(message) as Error & { span?: SpanError };
  error.span = span;
  return error as Error & { span: SpanError };
}

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
} as const;

export function tokenize(source: unknown): Token[] {
  const tokens: Token[] = [];
  const src = String(source ?? '');
  let i = 0;

  const error = (message: string, start: number, end = start + 1): never => {
    throw expressionError(message, { message, start, end });
  };

  while (i < src.length) {
    const ch = src[i]!;

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
      while (i < src.length && /[0-9.]/.test(src[i]!)) {
        if (src[i] === '.') {
          if (seenDot) error('Malformed number', start, i + 1);
          seenDot = true;
        }
        i++;
      }
      if (i < src.length && (src[i] === 'e' || src[i] === 'E')) {
        i++;
        if (src[i] === '+' || src[i] === '-') i++;
        if (!/[0-9]/.test(src[i]!)) error('Malformed exponent', start, i + 1);
        while (i < src.length && /[0-9]/.test(src[i]!)) i++;
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
      while (i < src.length && /[a-zA-Z0-9_]/.test(src[i]!)) i++;
      tokens.push({ type: TOKEN.IDENT, value: src.slice(start, i), start, end: i });
      continue;
    }

    if ('+-*/^%'.includes(ch)) {
      tokens.push({ type: TOKEN.OP, value: ch, start: i, end: i + 1 });
      i++; continue;
    }
    if (ch === '<' || ch === '>') {
      const value = src[i + 1] === '=' ? ch + '=' : ch;
      tokens.push({ type: TOKEN.OP, value, start: i, end: i + value.length });
      i += value.length; continue;
    }
    if (ch === '=' && src[i + 1] === '=') {
      tokens.push({ type: TOKEN.OP, value: '==', start: i, end: i + 2 });
      i += 2; continue;
    }
    if (ch === '!') {
      const value = src[i + 1] === '=' ? '!=' : '!';
      tokens.push({ type: TOKEN.OP, value, start: i, end: i + value.length });
      i += value.length; continue;
    }
    if (ch === '&' && src[i + 1] === '&') {
      tokens.push({ type: TOKEN.OP, value: '&&', start: i, end: i + 2 });
      i += 2; continue;
    }
    if (ch === '|' && src[i + 1] === '|') {
      tokens.push({ type: TOKEN.OP, value: '||', start: i, end: i + 2 });
      i += 2; continue;
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

const BINARY_PRECEDENCE: Record<string, number> = {
  '||': 1,
  '&&': 2,
  '==': 3, '!=': 3,
  '<': 4, '<=': 4, '>': 4, '>=': 4,
  '+': 5, '-': 5,
  '*': 6, '/': 6, '%': 6,
  '^': 7,
};

function parse(tokens: Token[]): ProgramNode {
  let pos = 0;

  const peek = (): Token => tokens[pos]!;
  const next = (): Token => tokens[pos++]!;
  const fail = (message: string, token: Token): never => {
    throw expressionError(message, { message, start: token.start, end: token.end });
  };

  function parseExpression(minPrecedence = 0): ExprNode {
    let left = parsePrefix();

    while (peek().type === TOKEN.OP && BINARY_PRECEDENCE[peek().value as string]! >= minPrecedence) {
      const opToken = next();
      const op = opToken.value as string;
      const precedence = BINARY_PRECEDENCE[op]!;
      // '^' is right-associative
      const right = parseExpression(op === '^' ? precedence : precedence + 1);
      left = { type: 'binary', op, left, right, start: left.start, end: right.end };
    }
    return left;
  }

  function parsePrefix(): ExprNode {
    const token = next();

    if (token.type === TOKEN.NUM) {
      return { type: 'num', value: token.value as number, start: token.start, end: token.end };
    }

    if (token.type === TOKEN.IDENT) {
      // function call?
      if (peek().type === TOKEN.LPAREN) {
        next(); // consume (
        const args: ExprNode[] = [];
        if (peek().type !== TOKEN.RPAREN) {
          for (;;) {
            args.push(parseExpression(0));
            if (peek().type === TOKEN.COMMA) { next(); continue; }
            break;
          }
        }
        const close = next();
        if (close.type !== TOKEN.RPAREN) fail('Expected ")"', close);
        return { type: 'call', name: token.value as string, args, start: token.start, end: close.end };
      }
      return { type: 'var', name: token.value as string, start: token.start, end: token.end };
    }

    if (token.type === TOKEN.OP && token.value === '-') {
      // operand parses at ^ precedence: -2^2 = -(2^2) = -4 (math convention)
      const arg = parseExpression(BINARY_PRECEDENCE['^']!);
      return { type: 'unary', op: '-', arg, start: token.start, end: arg.end };
    }
    if (token.type === TOKEN.OP && token.value === '+') {
      return parseExpression(BINARY_PRECEDENCE['^']!);
    }
    if (token.type === TOKEN.OP && token.value === '!') {
      const arg = parseExpression(BINARY_PRECEDENCE['^']!);
      return { type: 'unary', op: '!', arg, start: token.start, end: arg.end };
    }

    if (token.type === TOKEN.LPAREN) {
      const inner = parseExpression(0);
      const close = next();
      if (close.type !== TOKEN.RPAREN) fail('Expected ")"', close);
      inner.start = token.start;
      inner.end = close.end;
      return inner;
    }

    return fail(`Unexpected "${token.value ?? token.type}"`, token);
  }

  function parseStatement(): StatementNode {
    const token = peek();
    if (token.type === TOKEN.IDENT && tokens[pos + 1]?.type === TOKEN.ASSIGN) {
      next(); // ident
      next(); // =
      const value = parseExpression(0);
      return { type: 'assign', name: token.value as string, value, start: token.start, end: value.end };
    }
    return parseExpression(0);
  }

  const statements: StatementNode[] = [];
  while (peek().type !== TOKEN.EOF) {
    if (peek().type === TOKEN.SEMI) { next(); continue; }
    statements.push(parseStatement());
    if (peek().type === TOKEN.SEMI) next();
  }
  if (!statements.length) {
    fail('Empty expression', tokens[tokens.length - 1]!);
  }
  return { type: 'program', statements };
}

/* ———————————————— Evaluator ———————————————— */

function evaluateNode(node: StatementNode | ProgramNode, scope: Rec): number {
  switch (node.type) {
    case 'num':
      return node.value;

    case 'var': {
      const v = scope[node.name];
      if (typeof v === 'number') return v;
      if (v === undefined) {
        const e = expressionError(`Unknown variable "${node.name}"`, { message: '', start: node.start, end: node.end });
        (e.span as SpanError).message = e.message;
        throw e;
      }
      const e = expressionError(`"${node.name}" is a function, not a variable`, { message: '', start: node.start, end: node.end });
      (e.span as SpanError).message = e.message;
      throw e;
    }

    case 'unary': {
      const value = evaluateNode(node.arg, scope);
      return node.op === '!' ? (value ? 0 : 1) : -value;
    }

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
        case '<': return l < r ? 1 : 0;
        case '<=': return l <= r ? 1 : 0;
        case '>': return l > r ? 1 : 0;
        case '>=': return l >= r ? 1 : 0;
        case '==': return l === r ? 1 : 0;
        case '!=': return l !== r ? 1 : 0;
        case '&&': return l && r ? 1 : 0;
        case '||': return l || r ? 1 : 0;
        default: return NaN;
      }
    }

    case 'call': {
      const fn = scope[node.name];
      if (typeof fn !== 'function') {
        const e = expressionError(`Unknown function "${node.name}"`, { message: '', start: node.start, end: node.end });
        (e.span as SpanError).message = e.message;
        throw e;
      }
      const args = node.args.map((a) => evaluateNode(a, scope));
      return (fn as (...values: number[]) => number)(...args);
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

const compileCache = new Map<string, CompileResult>();
const CACHE_LIMIT = 300;

/**
 * Compile source into an evaluator.
 */
export function compileExpression(source: unknown): CompileResult {
  const key = String(source ?? '');
  const cached = compileCache.get(key);
  if (cached) return cached;

  let result: CompileResult;
  try {
    const ast = parse(tokenize(key));
    result = {
      ok: true,
      ast,
      fn: (scope) => evaluateNode(ast, scope),
    };
  } catch (e) {
    const error = e as Error & { span?: SpanError };
    result = { ok: false, error: error.span ?? { message: error.message, start: 0, end: key.length } };
  }

  if (compileCache.size >= CACHE_LIMIT) compileCache.clear();
  compileCache.set(key, result);
  return result;
}

/**
 * One-shot evaluation convenience.
 */
export function evaluate(source: unknown, vars: Rec): EvaluateResult {
  const compiled = compileExpression(source);
  if (!compiled.ok) return compiled;
  try {
    return { ok: true, value: compiled.fn(vars) };
  } catch (e) {
    const error = e as Error & { span?: SpanError };
    return { ok: false, error: error.span ?? { message: error.message, start: 0, end: 0 } };
  }
}

/**
 * Perturb every numeric literal in a source string (mutation in
 * equation space). Returns new source; syntax is always preserved.
 */
export function perturbLiterals(source: unknown, gaussian: () => number, strength = 0.12): string {
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
