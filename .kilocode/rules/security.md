# Security Patterns

## Path Validation

All file operations MUST validate paths to prevent directory traversal:

```typescript
function validateDataPath(filePath: string): string {
    const absolutePath = path.resolve(DATA_DIR, filePath)
    if (!absolutePath.startsWith(DATA_DIR)) {
        throw new Error(`Access denied: File path "${filePath}" is outside the allowed data directory.`)
    }
    return absolutePath
}

// Also resolve real path to protect against symlinks
const realFullPath = await fs.realpath(fullPath)
if (!realFullPath.startsWith(DATA_DIR)) {
    throw new Error(`Access denied: File path is outside allowed directory`)
}
```

## HTML Sanitization

Use JSDOM for HTML processing with dangerous element/attribute removal:

```typescript
const DANGEROUS_TAGS = new Set([
    'script', 'style', 'iframe', 'embed', 'object', 'noscript',
    'meta', 'link', 'form', 'input', 'button', 'select', 'textarea'
])

const DANGEROUS_ATTRS = new Set([
    'onload', 'onerror', 'onclick', 'onmouseover', 'formaction'
])

function sanitizeHtml(html: string): string {
    const jsdom = new JSDOM(String(html), {
        contentType: 'text/html',
        includeNodeLocations: false,
    })
    const { document } = jsdom.window

    // Remove dangerous elements
    DANGEROUS_TAGS.forEach((tagName) => {
        const elements = document.querySelectorAll(tagName)
        elements.forEach((element) => element.remove())
    })

    // Remove event handler attributes
    const allElements = document.querySelectorAll('*')
    allElements.forEach((element) => {
        Array.from(element.attributes).forEach((attr) => {
            if (attr.name.startsWith('on') || DANGEROUS_ATTRS.has(attr.name.toLowerCase())) {
                element.removeAttribute(attr.name)
            }
        })
    })

    return document.body.innerHTML
}
```

## API Key Handling

- Never log or expose API keys
- Always redact in URLs: `finalUrl.replace(apiKey, '[REDACTED]')`
- Check for undefined/null/empty before use
- Return structured errors if missing

## Input Validation

- Use Zod schemas for all inputs
- Validate URLs before fetching
- Sanitize file names: `fileName.replace(/[^a-zA-Z0-9\-_.]/g, '_')`
- Limit pattern lengths to prevent ReDoS
- Never construct RegExp from untrusted input - use safe string matching

## Error Handling

- Never throw from tool execute functions
- Return structured errors: `{ data: null, error: errorMessage }`
- Log errors with context but mask sensitive data
- Update tracing spans with error information

## Governance Context

Extract and log governance information when available:

```typescript
const governanceCtx = runtimeContext as PolygonRuntimeContext
const userId = governanceCtx?.userId
const tenantId = governanceCtx?.tenantId
const roles = governanceCtx?.roles ?? []
const subscriptionTier = governanceCtx?.subscriptionTier ?? 'free'
const classificationLevel = governanceCtx?.classificationLevel ?? 'public'
```

## Governance Context (Optional)

Tools can optionally extract governance information from runtimeContext for logging and access control. This is not currently enforced but the pattern exists in financial tools.

## Data Directory Restrictions

- All file operations restricted to specific directories
- Use `validateDataPath()` before any file operation
- Common data directories:
  - `docs/data/` - main data directory
  - `src/mastra/data/` - Excalidraw and test data
  - `./data/` - scraped content and generated files
