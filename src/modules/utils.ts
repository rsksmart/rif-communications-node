/**
 * Apply a timeout to a given promise.
 *
 * @param ms - timeout in milliseconds
 * @param promise - Promise to fulfill or reject
 *
 * @returns Promise<any>
 */
export function promiseTimeout (ms: number, promise: Promise<any>) {
  const timeout = new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id)
      reject(new Error(`Timed out in ${ms}ms`))
    }, ms)
  })

  return Promise.race([
    promise,
    timeout
  ])
}
