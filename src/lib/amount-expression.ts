import Decimal from 'decimal.js'

/**
 * An amount can be typed as a small calculation -- `12+8,50` for a dinner and
 * its drinks -- which the form works out when the field is left. Numbers take
 * either decimal separator, the operators are `+ - * /` with their usual
 * precedence, parentheses group what should be worked out first, and a sign may
 * lead the value. Everything is computed on Decimal, so `0,1+0,2` comes out as
 * `0.3` rather than as a float artefact.
 */

type Token =
  { type: 'number'; value: Decimal } | { type: 'operator'; value: Operator }

type Operator = '+' | '-' | '*' | '/' | '(' | ')'

// A number (with or without a decimal part, or only a decimal part), an
// operator or a parenthesis. Anything the typed value holds besides these makes
// it invalid.
const TOKEN_PATTERN = /\d+(?:\.\d+)?|\.\d+|[+\-*/()]/g

type Cursor = { tokens: Token[]; index: number }

/**
 * Whether the value is a calculation rather than a plain amount. Only a sign
 * leading the value is skipped -- that is the sign of an income, not an
 * operator -- so that a calculation may open on a parenthesis.
 */
export const isAmountExpression = (value: string) => {
  const typed = value.trim()
  return /[-+*/()]/.test(/^[-+]/.test(typed) ? typed.slice(1) : typed)
}

function tokenize(value: string): Token[] | null {
  const normalized = value.replace(/,/g, '.').replace(/\s/g, '')
  const tokens: Token[] = []
  let position = 0
  for (const match of normalized.matchAll(TOKEN_PATTERN)) {
    // Every character has to belong to a token: a gap between the last match
    // and this one is something we do not understand.
    if (match.index !== position) return null
    position += match[0].length
    tokens.push(
      /[-+*/()]/.test(match[0])
        ? { type: 'operator', value: match[0] as Operator }
        : { type: 'number', value: new Decimal(match[0]) },
    )
  }
  if (position !== normalized.length || tokens.length === 0) return null
  return tokens
}

const peek = (cursor: Cursor) => {
  const token = cursor.tokens[cursor.index]
  return token?.type === 'operator' ? token.value : undefined
}

/**
 * A number or a parenthesised calculation, possibly signed -- but only at the
 * very start of the value, where the sign makes an income out of the amount.
 * Everywhere else an operator wants something on either side, so that a slip
 * such as `12++8` is reported rather than worked out.
 */
function parseFactor(cursor: Cursor): Decimal | null {
  let negated = false
  const sign = cursor.index === 0 ? cursor.tokens[0] : undefined
  if (sign?.type === 'operator' && (sign.value === '+' || sign.value === '-')) {
    negated = sign.value === '-'
    cursor.index++
  }

  const token = cursor.tokens[cursor.index]
  if (token === undefined) return null
  let value: Decimal
  if (token.type === 'number') {
    cursor.index++
    value = token.value
  } else if (token.value === '(') {
    cursor.index++
    const grouped = parseExpression(cursor)
    if (grouped === null) return null
    const closing = cursor.tokens[cursor.index]
    if (closing?.type !== 'operator' || closing.value !== ')') return null
    cursor.index++
    value = grouped
  } else {
    return null
  }
  return negated ? value.negated() : value
}

/** Factors joined by the operators that bind tightest. */
function parseTerm(cursor: Cursor): Decimal | null {
  let left = parseFactor(cursor)
  if (left === null) return null
  for (let operator = peek(cursor); operator; operator = peek(cursor)) {
    if (operator !== '*' && operator !== '/') break
    cursor.index++
    const right = parseFactor(cursor)
    if (right === null) return null
    if (operator === '/' && right.isZero()) return null
    left = operator === '*' ? left.times(right) : left.dividedBy(right)
  }
  return left
}

function parseExpression(cursor: Cursor): Decimal | null {
  let left = parseTerm(cursor)
  if (left === null) return null
  for (let operator = peek(cursor); operator; operator = peek(cursor)) {
    if (operator !== '+' && operator !== '-') break
    cursor.index++
    const right = parseTerm(cursor)
    if (right === null) return null
    left = operator === '+' ? left.plus(right) : left.minus(right)
  }
  return left
}

/**
 * Works the typed calculation out, or returns null when it makes no sense --
 * a letter, a dangling operator, a division by zero. A plain amount evaluates
 * to itself.
 */
export function evaluateAmountExpression(value: string): number | null {
  const tokens = tokenize(value)
  if (tokens === null) return null
  const cursor: Cursor = { tokens, index: 0 }
  const result = parseExpression(cursor)
  // A leftover token means the value holds something the grammar could not
  // take, as `12+*8`, `12.5.3` or `(12+8`'s missing bracket do.
  if (result === null || cursor.index !== tokens.length) return null
  return result.isFinite() ? result.toNumber() : null
}
