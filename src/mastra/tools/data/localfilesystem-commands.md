# LocalFilesystem Commands

## Overview

The LocalFilesystem class provides a secure filesystem interface for reading and writing files within specified allowed paths. It enforces path restrictions to prevent unauthorized access.

The following is just examples, you must always import and use the `mainFilesystem` instance from `../workspaces` to ensure proper integration with Mastra's workspace management and path resolution. Do not create separate LocalFilesystem instances or import Node's fs/path modules directly in your tools.

## Methods

### init()

Initialize the filesystem. Creates the base directory if it doesn't exist.

```typescript
await filesystem.init()
```

Called by `workspace.init()`.

### Lazy initialization

LocalFilesystem initializes on first operation if not already initialized, creating the base directory automatically. Calling `init()` explicitly is optional but can be useful to pre-create directories before the first operation.

### destroy()

Clean up filesystem resources.

```typescript
await filesystem.destroy()
```

Called by `workspace.destroy()`.

### setAllowedPaths(pathsOrUpdater)

Update the allowed paths at runtime. Accepts a new paths array (replaces current) or an updater callback that receives the current paths and returns the new set.

```typescript
// Set directly
filesystem.setAllowedPaths(['/home/user/.config'])

// Update with callback
filesystem.setAllowedPaths(prev => [...prev, '/home/user/documents'])

// Clear all allowed paths
filesystem.setAllowedPaths([])
```

**Parameters:**

### pathsOrUpdater:

string\[\] | ((current: readonly string\[\]) => string\[\])

New allowed paths array or updater function receiving current paths

### readFile(path, options?)

Read file contents.

```typescript
const content = await filesystem.readFile('/docs/guide.md')
const buffer = await filesystem.readFile('/image.png', { encoding: 'binary' })
```

**Parameters:**

### path:

string

File path relative to basePath

### options?:

Options

Configuration options.

Options

### encoding?:

'utf-8' | 'binary'

Text or binary encoding

### writeFile(path, content, options?)

Write content to a file.

```typescript
await filesystem.writeFile('/docs/new.md', '# New Document')
await filesystem.writeFile('/nested/path/file.md', content, { recursive: true })
```

**Parameters:**

### path:

string

File path relative to basePath

### content:

string | Buffer

File content

### options?:

Options

Configuration options.

Options

### recursive?:

boolean

Create parent directories if they don't exist

### overwrite?:

boolean

Overwrite existing file

### expectedMtime?:

Date

If provided, the write fails with a StaleFileError when the file's current modification time doesn't match. Use this for optimistic concurrency control to detect external modifications between read and write.

### appendFile(path, content)

Append content to an existing file.

```typescript
await filesystem.appendFile('/logs/app.log', 'New log entry\n')
```

**Parameters:**

### path:

string

File path relative to basePath

### content:

string | Buffer

Content to append

### deleteFile(path, options?)

Delete a file.

```typescript
await filesystem.deleteFile('/docs/old.md')
await filesystem.deleteFile('/docs/maybe.md', { force: true }) // Don't throw if missing
```

**Parameters:**

### path:

string

File path

### options?:

Options

Configuration options.

Options

### force?:

boolean

Don't throw error if file doesn't exist

### copyFile(src, dest, options?)

Copy a file to a new location.

```typescript
await filesystem.copyFile('/docs/template.md', '/docs/new-doc.md')
await filesystem.copyFile('/src/config.json', '/backup/config.json', { overwrite: false })
```

**Parameters:**

### src:

string

Source file path

### dest:

string

Destination file path

### options?:

Options

Configuration options.

Options

### overwrite?:

boolean

Overwrite destination if it exists

### moveFile(src, dest, options?)

Move or rename a file.

```typescript
await filesystem.moveFile('/docs/draft.md', '/docs/final.md')
await filesystem.moveFile('/temp/upload.txt', '/files/document.txt')
```

**Parameters:**

### src:

string

Source file path

### dest:

string

Destination file path

### options?:

Options

Configuration options.

Options

### overwrite?:

boolean

Overwrite destination if it exists

### mkdir(path, options?)

Create a directory.

```typescript
await filesystem.mkdir('/docs/api')
await filesystem.mkdir('/deeply/nested/path', { recursive: true })
```

**Parameters:**

### path:

string

Directory path

### options?:

Options

Configuration options.

Options

### recursive?:

boolean

Create parent directories

### rmdir(path, options?)

Remove a directory.

```typescript
await filesystem.rmdir('/docs/old')
await filesystem.rmdir('/docs/nested', { recursive: true })
```

**Parameters:**

### path:

string

Directory path

### options?:

Options

Configuration options.

Options

### recursive?:

boolean

Remove contents recursively

### force?:

boolean

Don't throw if directory doesn't exist

### readdir(path, options?)

List directory contents.

```typescript
const entries = await filesystem.readdir('/docs')
// [{ name: 'guide.md', type: 'file' }, { name: 'api', type: 'directory' }]
```

### exists(path)

Check if a path exists.

```typescript
const exists = await filesystem.exists('/docs/guide.md')
```

### stat(path)

Get file or directory metadata.

```typescript
const stat = await filesystem.stat('/docs/guide.md')
// { type: 'file', size: 1234, modifiedAt: Date, createdAt: Date, path: '/docs/guide.md' }
```

### getInfo()

Returns metadata about this filesystem instance.

```typescript
const info = filesystem.getInfo()
// { id: '...', name: 'LocalFilesystem', provider: 'local', basePath: '/workspace', readOnly: false }
```

### getInstructions(opts?)

Returns a description of how paths work in this filesystem. When assigned to an agent, this is injected into the agent's system message.

```typescript
const instructions = filesystem.getInstructions()
// 'Local filesystem at "/workspace". Files at workspace path "/foo" are stored at "/workspace/foo" on disk.'
```

Pass `requestContext` to enable per-request customization when the `instructions` constructor option is a function:

```typescript
const instructions = filesystem.getInstructions({ requestContext })
```

**Parameters:**

### opts.requestContext?:

RequestContext

Forwarded to the \`instructions\` function if one was provided in the constructor.

**Returns:** `string`

To override the default output, pass an `instructions` option to the constructor

## Path resolution

### How basePath works

The `basePath` option sets the root directory for all file operations. File paths passed to methods like `readFile()` are resolved relative to this base:

- Leading slashes are stripped: `/docs/guide.md` → `docs/guide.md`
- The path is normalized and joined with basePath
- Result: `./workspace` + `docs/guide.md` → `./workspace/docs/guide.md`

```typescript
const filesystem = new LocalFilesystem({
  basePath: './workspace',
})

// These all resolve to ./workspace/docs/guide.md
await filesystem.readFile('/docs/guide.md')
await filesystem.readFile('docs/guide.md')
```

### Relative paths and execution context

When you use a relative path for `basePath`, it resolves from `process.cwd()`. In Mastra projects, cwd varies depending on how you run your code:

| Context | Working directory | `./workspace` resolves to |
| --- | --- | --- |
| `mastra dev` | `./src/mastra/public/` | `./src/mastra/public/workspace` |
| `mastra start` | `./.mastra/output/` | `./.mastra/output/workspace` |
| Direct script | Where you ran the command | Relative to that location |

This can cause confusion when the same relative path resolves to different locations.
