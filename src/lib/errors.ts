import { strings, type ErrorCode } from '../strings'

export function errorCode(err: unknown): ErrorCode {
  const message = typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : ''
  if (message in strings.errors) return message as ErrorCode
  if (/fetch|network|load failed/i.test(message)) return 'network'
  return 'unknown'
}

export function errorMessage(err: unknown): string {
  return strings.errors[errorCode(err)]
}
