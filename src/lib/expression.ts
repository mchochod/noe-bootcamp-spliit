/**
 * A four-operation calculator for the Amount field, so that a bill can be typed
 * the way it was paid: `12+8,50`, `3*4,20`, `(12+8,50)*2`.
 *
 * Both `.` and `,` are decimal separators, never thousands separators, which is
 * what the field already does to a plain amount (`1,000` is one, not a
 * thousand).
 *
 * Parsing is a recursive descent over:
 *
 *   expr    := term (('+' | '-') term)*
 *   term    := factor (('*' | '/') factor)*
 *   factor  := '-' factor | primary
 *   primary := number | '(' expr ')'
 *
 * The grammar has no unary plus on purpose: it is what makes `12++8` an error
 * rather than 20, and nobody types a leading `+` on an amount.
 *
 * Running out of input mid-expression is reported as `incomplete` rather than as
 * an error, because with parentheses almost everything is transiently
 * unparseable while it is being typed: `(12+8,50` is unfinished, not wrong, and
 * a field that turns red on every keystroke feels broken.
 *
 * No `eval`, no `new Function`: this string comes from a text input in a group
 * anyone can reach by link.
 */

export type ParseResult =
  | { status: 'ok'; value: number }
  | { status: 'incomplete' }
  | { status: 'error'; message: 'invalidExpression' | 'divisionByZero' }

type Token =
  | { type: 'number'; value: number }
  | { type: 'operator'; value: '+' | '-' | '*' | '/' }
  | { type: 'paren'; value: '(' | ')' }

const NUMBER = /^(?:\d+(?:[.,]\d*)?|[.,]\d+)/

const INVALID: ParseResult = { status: 'error', message: 'invalidExpression' }
const INCOMPLETE: ParseResult = { status: 'incomplete' }

/**
 * Whether the input should be handed to the parser at all. Everything else keeps
 * the plain-amount code path it has today, which is what keeps the common case
 * (a number, possibly negative) out of reach of anything new here.
 *
 * Half-typed states have to count as expressions: `12+` is an expression, or the
 * keystroke filter on the field would strip the `+` the instant it is typed and
 * no calculation could ever be entered.
 */
export function looksLikeExpression(input: string): boolean {
  const trimmed = input.trim()
  if (/[()*/+]/.test(trimmed)) return true
  // A leading minus is an income amount, not a subtraction.
  return trimmed.indexOf('-', 1) > 0
}

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = []
  let rest = input.trim()
  while (rest.length > 0) {
    const char = rest[0]
    if (char === ' ') {
      rest = rest.slice(1)
      continue
    }
    if (char === '+' || char === '-' || char === '*' || char === '/') {
      tokens.push({ type: 'operator', value: char })
      rest = rest.slice(1)
      continue
    }
    if (char === '(' || char === ')') {
      tokens.push({ type: 'paren', value: char })
      rest = rest.slice(1)
      continue
    }
    const number = NUMBER.exec(rest)
    if (!number) return null
    tokens.push({ type: 'number', value: Number(number[0].replace(',', '.')) })
    rest = rest.slice(number[0].length)
  }
  return tokens
}

export function parseAmountExpression(input: string): ParseResult {
  const tokens = tokenize(input)
  if (tokens === null) return INVALID
  if (tokens.length === 0) return INCOMPLETE

  let position = 0
  let failure: ParseResult | null = null

  const peek = () => tokens[position]

  /** Reports the failure that stops the parse, and unwinds through `NaN`. */
  const fail = (result: ParseResult) => {
    failure ??= result
    return NaN
  }

  const parseExpr = (): number => {
    let value = parseTerm()
    while (!failure) {
      const token = peek()
      if (token?.type !== 'operator') break
      if (token.value !== '+' && token.value !== '-') break
      position++
      const right = parseTerm()
      value = token.value === '+' ? value + right : value - right
    }
    return value
  }

  const parseTerm = (): number => {
    let value = parseFactor()
    while (!failure) {
      const token = peek()
      if (token?.type !== 'operator') break
      if (token.value !== '*' && token.value !== '/') break
      position++
      const right = parseFactor()
      if (token.value === '*') {
        value = value * right
      } else if (right === 0) {
        return fail({ status: 'error', message: 'divisionByZero' })
      } else {
        value = value / right
      }
    }
    return value
  }

  const parseFactor = (): number => {
    const token = peek()
    if (token === undefined) return fail(INCOMPLETE)
    if (token.type === 'operator') {
      if (token.value !== '-') return fail(INVALID)
      position++
      return -parseFactor()
    }
    if (token.type === 'number') {
      position++
      return token.value
    }
    if (token.value === ')') return fail(INVALID)
    position++
    const value = parseExpr()
    if (failure) return NaN
    const closing = peek()
    if (closing === undefined) return fail(INCOMPLETE)
    if (closing.type !== 'paren' || closing.value !== ')') return fail(INVALID)
    position++
    return value
  }

  const value = parseExpr()
  if (failure) return failure
  // Tokens left over means two operands with no operator between them, such as
  // the implicit multiplication of `2(3+4)`. Guessing the missing operator is
  // the class of mistake this whole feature exists to stop.
  if (position < tokens.length) return INVALID
  if (!Number.isFinite(value)) return INVALID
  return { status: 'ok', value }
}
