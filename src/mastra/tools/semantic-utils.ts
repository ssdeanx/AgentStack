import { Project } from 'ts-morph';
import * as path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import * as os from 'os';
import * as crypto from 'crypto';
import { log } from '../config/logger';

// ==========================================
// ProjectCache Implementation
// ==========================================

interface CachedProject {
  project: Project;
  lastAccess: number;
  fileCount: number;
  estimatedMemoryMB: number;
  hitCount: number;
}

interface CacheStats {
  size: number;
  totalMemoryMB: number;
  hitRate: number;
  projects: Array<{
    path: string;
    files: number;
    memoryMB: number;
    age: number;
    hits: number;
  }>;
}

export class ProjectCache {
  private static instance: ProjectCache | null = null;
  private cache = new Map<string, CachedProject>();
  private totalHits = 0;
  private totalMisses = 0;
  
  // Configuration
  private readonly MAX_PROJECT_MEMORY_MB = 2048; // 2GB limit per project
  private readonly MAX_TOTAL_MEMORY_MB = 4096;   // 4GB total cache limit
  private readonly MEMORY_PER_FILE_MB = 0.5;     // Rough estimate
  private readonly CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

  private constructor() {}

  public static getInstance(): ProjectCache {
    if (!ProjectCache.instance) {
      ProjectCache.instance = new ProjectCache();
    }
    return ProjectCache.instance;
  }

  public getOrCreate(projectPath: string): Project {
    const normalizedPath = path.normalize(projectPath);
    const now = Date.now();
    
    // Check cache
    const cached = this.cache.get(normalizedPath);
    if (cached) {
      this.totalHits++;
      cached.hitCount++;
      cached.lastAccess = now;
      return cached.project;
    }

    this.totalMisses++;
    
    // Create new project
    log.info(`Initializing new ts-morph project for ${normalizedPath}`);
    const project = new Project({
      tsConfigFilePath: path.join(normalizedPath, 'tsconfig.json'),
      skipAddingFilesFromTsConfig: false,
    });

    // Estimate memory usage
    const fileCount = project.getSourceFiles().length;
    const estimatedMemoryMB = fileCount * this.MEMORY_PER_FILE_MB;

    // Cache if within limits
    if (estimatedMemoryMB <= this.MAX_PROJECT_MEMORY_MB) {
      // Evict if needed
      this.ensureCapacity(estimatedMemoryMB);
      
      this.cache.set(normalizedPath, {
        project,
        lastAccess: now,
        fileCount,
        estimatedMemoryMB,
        hitCount: 0
      });
    } else {
      log.warn(`Project ${normalizedPath} too large (${estimatedMemoryMB.toFixed(1)}MB) - skipping cache`);
    }

    return project;
  }

  private ensureCapacity(requiredMB: number): void {
    let currentUsage = this.getTotalMemoryUsage();
    
    if (currentUsage + requiredMB <= this.MAX_TOTAL_MEMORY_MB) {
      return;
    }

    // Evict LRU
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess);

    for (const [key, entry] of entries) {
      this.cache.delete(key);
      currentUsage -= entry.estimatedMemoryMB;
      if (currentUsage + requiredMB <= this.MAX_TOTAL_MEMORY_MB) {
        break;
      }
    }
  }

  private getTotalMemoryUsage(): number {
    let total = 0;
    this.cache.forEach(entry => total += entry.estimatedMemoryMB);
    return total;
  }

  public clear(): void {
    this.cache.clear();
  }
}

// ==========================================
// PythonParser Implementation
// ==========================================

const execAsync = promisify(exec);

const EXEC_CONFIG = {
  maxBuffer: 10 * 1024 * 1024, // 10MB
  timeout: 30000 // 30 seconds
} as const;

interface CacheEntry {
  result: any;
  timestamp: number;
}

const RESULT_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 1000; // 1 minute
const MAX_CACHE_SIZE = 50;

export interface PythonSymbol {
  name: string;
  kind: 'function' | 'class' | 'variable' | 'import';
  line: number;
  column: number;
  endLine?: number;
  docstring?: string;
}

export interface PythonComplexity {
  cyclomaticComplexity: number;
  functions: Array<{
    name: string;
    complexity: number;
    line: number;
  }>;
  classes: Array<{
    name: string;
    methods: number;
    line: number;
  }>;
}

export class PythonParser {
  private static cleanupRegistered = false;

  private static pythonScript = `
import ast
import sys
import json

def analyze_code(code):
    try:
        tree = ast.parse(code)
        symbols = []

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                symbols.append({
                    'name': node.name,
                    'kind': 'function',
                    'line': node.lineno,
                    'column': node.col_offset,
                    'endLine': node.end_lineno,
                    'docstring': ast.get_docstring(node)
                })
            elif isinstance(node, ast.ClassDef):
                symbols.append({
                    'name': node.name,
                    'kind': 'class',
                    'line': node.lineno,
                    'column': node.col_offset,
                    'endLine': node.end_lineno,
                    'docstring': ast.get_docstring(node)
                })
            elif isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        symbols.append({
                            'name': target.id,
                            'kind': 'variable',
                            'line': node.lineno,
                            'column': node.col_offset
                        })
            elif isinstance(node, ast.Import) or isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    symbols.append({
                        'name': alias.name,
                        'kind': 'import',
                        'line': node.lineno,
                        'column': node.col_offset
                    })

        return {'success': True, 'symbols': symbols}
    except SyntaxError as e:
        return {'success': False, 'error': str(e)}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def calculate_complexity(code):
    try:
        tree = ast.parse(code)

        def cyclomatic_complexity(node):
            complexity = 1
            for child in ast.walk(node):
                if isinstance(child, (ast.If, ast.For, ast.While, ast.And, ast.Or, ast.ExceptHandler)):
                    complexity += 1
                elif isinstance(child, ast.BoolOp):
                    complexity += len(child.values) - 1
            return complexity

        functions = []
        classes = []
        total_complexity = 1

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                func_complexity = cyclomatic_complexity(node)
                functions.append({
                    'name': node.name,
                    'complexity': func_complexity,
                    'line': node.lineno
                })
                total_complexity += func_complexity
            elif isinstance(node, ast.ClassDef):
                method_count = sum(1 for n in node.body if isinstance(n, ast.FunctionDef))
                classes.append({
                    'name': node.name,
                    'methods': method_count,
                    'line': node.lineno
                })

        return {
            'success': True,
            'cyclomaticComplexity': total_complexity,
            'functions': functions,
            'classes': classes
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def find_references(code, symbol_name):
    try:
        tree = ast.parse(code)
        references = []
        lines = code.splitlines()

        def get_line_content(lineno):
            if 0 <= lineno - 1 < len(lines):
                return lines[lineno - 1].strip()
            return ''

        for node in ast.walk(tree):
            match = False
            is_def = False
            kind = 'usage'
            lineno = getattr(node, 'lineno', 0)
            col_offset = getattr(node, 'col_offset', 0)

            if isinstance(node, ast.FunctionDef) and node.name == symbol_name:
                match = True
                is_def = True
                kind = 'function'
            elif isinstance(node, ast.ClassDef) and node.name == symbol_name:
                match = True
                is_def = True
                kind = 'class'
            elif isinstance(node, ast.Name) and node.id == symbol_name:
                match = True
                if isinstance(node.ctx, ast.Store):
                    is_def = True
                    kind = 'variable'
                else:
                    is_def = False
                    kind = 'usage'
            elif isinstance(node, ast.Attribute) and node.attr == symbol_name:
                match = True
                is_def = False
                kind = 'usage'
            elif isinstance(node, ast.arg) and node.arg == symbol_name:
                match = True
                is_def = True
                kind = 'parameter'
            elif isinstance(node, (ast.Import, ast.ImportFrom)):
                for alias in node.names:
                    if alias.name == symbol_name or alias.asname == symbol_name:
                        match = True
                        is_def = True
                        kind = 'import'
                        break
            
            if match and lineno > 0:
                references.append({
                    'name': symbol_name,
                    'kind': kind,
                    'line': lineno,
                    'column': col_offset,
                    'isDefinition': is_def,
                    'text': get_line_content(lineno)
                })

        return {'success': True, 'references': references}
    except Exception as e:
        return {'success': False, 'error': str(e)}

if __name__ == '__main__':
    code = sys.stdin.read()
    action = sys.argv[1] if len(sys.argv) > 1 else 'symbols'

    if action == 'symbols':
        result = analyze_code(code)
    elif action == 'complexity':
        result = calculate_complexity(code)
    elif action == 'references':
        symbol_name = sys.argv[2] if len(sys.argv) > 2 else ''
        result = find_references(code, symbol_name)
    else:
        result = {'success': False, 'error': 'Unknown action'}

    print(json.dumps(result))
`;

  private static scriptPath: string | null = null;
  private static pythonCommand: string | null = null;

  private static async getPythonCommand(): Promise<string> {
    if (this.pythonCommand) {
      return this.pythonCommand;
    }

    const commands = ['python3', 'python'];
    for (const cmd of commands) {
      try {
        await execAsync(`${cmd} --version`, { timeout: 5000 });
        this.pythonCommand = cmd;
        return cmd;
      } catch {
        continue;
      }
    }
    throw new Error('Python 3 not found. Please install Python 3 to analyze Python code.');
  }

  private static getCacheKey(code: string, action: string): string {
    const hash = crypto.createHash('md5').update(code).digest('hex');
    return `${action}:${hash}`;
  }

  private static getCachedResult(key: string): any | null {
    const entry = RESULT_CACHE.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.result;
    }
    if (entry) {
      RESULT_CACHE.delete(key);
    }
    return null;
  }

  private static cacheResult(key: string, result: any): void {
    if (RESULT_CACHE.size >= MAX_CACHE_SIZE) {
      const oldestKey = RESULT_CACHE.keys().next().value;
      if (oldestKey) {
        RESULT_CACHE.delete(oldestKey);
      }
    }
    RESULT_CACHE.set(key, { result, timestamp: Date.now() });
  }

  private static registerCleanup(): void {
    if (this.cleanupRegistered) {
      return;
    }

    this.cleanupRegistered = true;

    process.on('exit', () => {
      if (this.scriptPath) {
        try {
          // Use fs.unlinkSync via require to avoid async in exit handler
          require('fs').unlinkSync(this.scriptPath);
        } catch (e) {
          // Ignore errors
        }
      }
    });
  }

  private static async ensureScriptExists(): Promise<string> {
    if (this.scriptPath) {
      return this.scriptPath;
    }

    this.registerCleanup();

    this.scriptPath = path.join(os.tmpdir(), `mastra-python-parser-${process.pid}.py`);
    await writeFile(this.scriptPath, this.pythonScript);
    return this.scriptPath;
  }

  private static async executePython(code: string, action: string, args: string[] = []): Promise<any> {
    const cacheKey = this.getCacheKey(code, action + args.join(','));
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const pythonCmd = await this.getPythonCommand();
      const scriptPath = await this.ensureScriptExists();

      const result = await new Promise<any>((resolve, reject) => {
        const child = spawn(pythonCmd, [scriptPath, action, ...args], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (exitCode) => {
          if (stderr && !stderr.includes('DeprecationWarning')) {
            log.warn('Python stderr:', { stderr });
          }

          try {
            const parsed = JSON.parse(stdout);
            if (!parsed.success) {
              reject(new Error(parsed.error || `Python ${action} analysis failed`));
            } else {
              resolve(parsed);
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse Python output: ${stdout.substring(0, 200)}`));
          }
        });

        child.on('error', (error) => {
          reject(error);
        });

        const timeout = setTimeout(() => {
          child.kill('SIGTERM');
          reject(new Error('Python execution timed out'));
        }, EXEC_CONFIG.timeout);

        child.on('close', () => clearTimeout(timeout));

        child.stdin.write(code);
        child.stdin.end();
      });

      this.cacheResult(cacheKey, result);
      return result;

    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        throw new Error('Python 3 not found. Please install Python 3 to analyze Python code.');
      }
      throw error;
    }
  }

  public static async findSymbols(code: string): Promise<PythonSymbol[]> {
    const result = await this.executePython(code, 'symbols');
    return result.symbols || [];
  }

  public static async analyzeComplexity(code: string): Promise<PythonComplexity> {
    const result = await this.executePython(code, 'complexity');
    return {
      cyclomaticComplexity: result.cyclomaticComplexity || 1,
      functions: result.functions || [],
      classes: result.classes || []
    };
  }

  public static async findReferences(code: string, symbolName: string): Promise<Array<{
    name: string;
    kind: string;
    line: number;
    column: number;
    isDefinition: boolean;
    text: string;
  }>> {
    const result = await this.executePython(code, 'references', [symbolName]);
    return result.references || [];
  }

  public static async cleanup(): Promise<void> {
    if (this.scriptPath) {
      await unlink(this.scriptPath).catch(() => {});
      this.scriptPath = null;
    }
    RESULT_CACHE.clear();
    this.pythonCommand = null;
  }

  public static isPythonFile(filePath: string): boolean {
    return filePath.endsWith('.py');
  }
}
