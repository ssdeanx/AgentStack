/**
 * Creates an AbortController that mirrors an optional parent signal.
 *
 * The returned controller is always real and can be passed to HTTP clients that
 * require an AbortSignal. If a parent signal is supplied, the controller is
 * aborted as soon as the parent aborts.
 *
 * @param parentSignal - Optional parent AbortSignal to mirror.
 * @returns A request-scoped AbortController.
 */
export function createLinkedAbortController(
    parentSignal?: AbortSignal
): AbortController {
    const controller = new AbortController()

    if (parentSignal === undefined) {
        return controller
    }

    if (parentSignal.aborted) {
        controller.abort()
        return controller
    }

    parentSignal.addEventListener(
        'abort',
        () => {
            controller.abort()
        },
        { once: true }
    )

    return controller
}

/**
 * Resolves an AbortSignal for logging or read-only checks.
 *
 * If a parent signal is available, it is returned directly. Otherwise, a
 * fresh AbortController is created so callers can always read `aborted`
 * without optional chaining.
 *
 * @param parentSignal - Optional parent AbortSignal.
 * @returns A defined AbortSignal.
 */
export function resolveAbortSignal(
    parentSignal?: AbortSignal
): AbortSignal {
    return parentSignal ?? new AbortController().signal
}
