#!/usr/bin/env node

/**
 * MCP Server Template - Full Featured
 * 
 * This template includes all common tools for file system operations,
 * command execution, and more. Copy this to your project and customize.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

// Get the working directory from args or use current directory
const ROOT_DIR = process.argv[2] || process.cwd();

// Create MCP server instance
const server = new Server(
  {
    name: 'mcp-full-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Security: ensure paths stay within ROOT_DIR
function getSafePath(requestedPath) {
  if (!requestedPath || requestedPath === '.') return ROOT_DIR;
  const resolved = path.resolve(ROOT_DIR, path.normalize(requestedPath));
  if (!resolved.startsWith(ROOT_DIR)) {
    throw new Error('Access denied: path outside root directory');
  }
  return resolved;
}

// Helper: format file size
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

// Define all available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ==================== FILE OPERATIONS ====================
      {
        name: 'read_file',
        description: 'Read the contents of a file. Returns text content with optional line range.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path relative to root' },
            startLine: { type: 'number', description: 'Start line (1-indexed, optional)' },
            endLine: { type: 'number', description: 'End line (inclusive, optional)' },
          },
          required: ['path'],
        },
      },
      {
        name: 'write_file',
        description: 'Write content to a file. Creates the file if it does not exist, overwrites if it does.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path relative to root' },
            content: { type: 'string', description: 'Content to write' },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'append_file',
        description: 'Append content to the end of a file.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path relative to root' },
            content: { type: 'string', description: 'Content to append' },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'delete_file',
        description: 'Delete a file.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to delete' },
          },
          required: ['path'],
        },
      },
      {
        name: 'copy_file',
        description: 'Copy a file to a new location.',
        inputSchema: {
          type: 'object',
          properties: {
            source: { type: 'string', description: 'Source file path' },
            destination: { type: 'string', description: 'Destination file path' },
          },
          required: ['source', 'destination'],
        },
      },
      {
        name: 'move_file',
        description: 'Move or rename a file or directory.',
        inputSchema: {
          type: 'object',
          properties: {
            source: { type: 'string', description: 'Source path' },
            destination: { type: 'string', description: 'Destination path' },
          },
          required: ['source', 'destination'],
        },
      },
      {
        name: 'file_info',
        description: 'Get detailed information about a file or directory.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File or directory path' },
          },
          required: ['path'],
        },
      },
      {
        name: 'file_exists',
        description: 'Check if a file or directory exists.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to check' },
          },
          required: ['path'],
        },
      },
      
      // ==================== DIRECTORY OPERATIONS ====================
      {
        name: 'list_directory',
        description: 'List files and directories in a path. Returns names, types, and sizes.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path (default: root)' },
            recursive: { type: 'boolean', description: 'List recursively (default: false)' },
            maxDepth: { type: 'number', description: 'Max depth for recursive listing (default: 3)' },
          },
        },
      },
      {
        name: 'create_directory',
        description: 'Create a directory (including parent directories if needed).',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path to create' },
          },
          required: ['path'],
        },
      },
      {
        name: 'delete_directory',
        description: 'Delete a directory and all its contents.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path to delete' },
          },
          required: ['path'],
        },
      },
      {
        name: 'get_directory_size',
        description: 'Calculate the total size of a directory.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path' },
          },
          required: ['path'],
        },
      },
      
      // ==================== SEARCH OPERATIONS ====================
      {
        name: 'search_files',
        description: 'Search for files by name pattern (glob-style: *.js, test*, etc).',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Search pattern (e.g., "*.js", "README*")' },
            path: { type: 'string', description: 'Directory to search in (default: root)' },
            maxResults: { type: 'number', description: 'Maximum results to return (default: 100)' },
          },
          required: ['pattern'],
        },
      },
      {
        name: 'search_content',
        description: 'Search for text content within files (grep-like).',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Text or regex pattern to search for' },
            path: { type: 'string', description: 'Directory to search in (default: root)' },
            filePattern: { type: 'string', description: 'File pattern to search in (e.g., "*.js")' },
            caseSensitive: { type: 'boolean', description: 'Case sensitive search (default: false)' },
            maxResults: { type: 'number', description: 'Maximum results (default: 50)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'find_replace',
        description: 'Find and replace text in a file.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' },
            find: { type: 'string', description: 'Text to find' },
            replace: { type: 'string', description: 'Text to replace with' },
            all: { type: 'boolean', description: 'Replace all occurrences (default: true)' },
          },
          required: ['path', 'find', 'replace'],
        },
      },
      
      // ==================== COMMAND EXECUTION ====================
      {
        name: 'run_command',
        description: 'Run a shell command and return the output.',
        inputSchema: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Shell command to run' },
            cwd: { type: 'string', description: 'Working directory (default: root)' },
            timeout: { type: 'number', description: 'Timeout in seconds (default: 60)' },
          },
          required: ['command'],
        },
      },
      {
        name: 'run_script',
        description: 'Run a script file (bash, python, node, etc).',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Script file path' },
            args: { type: 'array', items: { type: 'string' }, description: 'Arguments to pass' },
            interpreter: { type: 'string', description: 'Interpreter (auto-detected if not specified)' },
          },
          required: ['path'],
        },
      },
      
      // ==================== SYSTEM INFO ====================
      {
        name: 'system_info',
        description: 'Get system information (OS, memory, CPU, etc).',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'environment_vars',
        description: 'Get or set environment variables.',
        inputSchema: {
          type: 'object',
          properties: {
            get: { type: 'string', description: 'Variable name to get (optional)' },
            list: { type: 'boolean', description: 'List all environment variables' },
          },
        },
      },
      {
        name: 'disk_usage',
        description: 'Get disk usage information.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to check (default: root)' },
          },
        },
      },
      
      // ==================== TEXT PROCESSING ====================
      {
        name: 'count_lines',
        description: 'Count lines, words, and characters in a file.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' },
          },
          required: ['path'],
        },
      },
      {
        name: 'head',
        description: 'Get the first N lines of a file.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' },
            lines: { type: 'number', description: 'Number of lines (default: 10)' },
          },
          required: ['path'],
        },
      },
      {
        name: 'tail',
        description: 'Get the last N lines of a file.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' },
            lines: { type: 'number', description: 'Number of lines (default: 10)' },
          },
          required: ['path'],
        },
      },
      
      // ==================== JSON OPERATIONS ====================
      {
        name: 'read_json',
        description: 'Read and parse a JSON file.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'JSON file path' },
            query: { type: 'string', description: 'JSONPath query (optional, e.g., "$.name")' },
          },
          required: ['path'],
        },
      },
      {
        name: 'write_json',
        description: 'Write data to a JSON file.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'JSON file path' },
            data: { type: 'object', description: 'Data to write' },
            pretty: { type: 'boolean', description: 'Pretty print (default: true)' },
          },
          required: ['path', 'data'],
        },
      },
      {
        name: 'modify_json',
        description: 'Modify a specific field in a JSON file.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'JSON file path' },
            key: { type: 'string', description: 'Key to modify (dot notation: "a.b.c")' },
            value: { description: 'New value' },
          },
          required: ['path', 'key', 'value'],
        },
      },
      
      // ==================== COMPRESSION ====================
      {
        name: 'compress',
        description: 'Compress files or directories into a zip archive.',
        inputSchema: {
          type: 'object',
          properties: {
            source: { type: 'string', description: 'File or directory to compress' },
            destination: { type: 'string', description: 'Output zip file path' },
          },
          required: ['source', 'destination'],
        },
      },
      {
        name: 'decompress',
        description: 'Extract a zip archive.',
        inputSchema: {
          type: 'object',
          properties: {
            source: { type: 'string', description: 'Zip file path' },
            destination: { type: 'string', description: 'Extraction directory' },
          },
          required: ['source', 'destination'],
        },
      },
      
      // ==================== DIFF & PATCH ====================
      {
        name: 'diff_files',
        description: 'Compare two files and show differences.',
        inputSchema: {
          type: 'object',
          properties: {
            file1: { type: 'string', description: 'First file path' },
            file2: { type: 'string', description: 'Second file path' },
          },
          required: ['file1', 'file2'],
        },
      },
      
      // ==================== PERMISSIONS ====================
      {
        name: 'chmod',
        description: 'Change file permissions.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' },
            mode: { type: 'string', description: 'Permission mode (e.g., "755", "644")' },
          },
          required: ['path', 'mode'],
        },
      },
      
      // ==================== WATCH ====================
      {
        name: 'tree',
        description: 'Display directory structure as a tree.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path (default: root)' },
            maxDepth: { type: 'number', description: 'Maximum depth (default: 3)' },
          },
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // ==================== FILE OPERATIONS ====================
      case 'read_file': {
        const filePath = getSafePath(args.path);
        let content = await fs.readFile(filePath, 'utf-8');
        
        if (args.startLine || args.endLine) {
          const lines = content.split('\n');
          const start = (args.startLine || 1) - 1;
          const end = args.endLine || lines.length;
          content = lines.slice(start, end).join('\n');
        }
        
        const truncated = content.length > 100000 
          ? content.slice(0, 100000) + '\n... (truncated, file too large)'
          : content;
        return { content: [{ type: 'text', text: truncated }] };
      }

      case 'write_file': {
        const filePath = getSafePath(args.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, args.content, 'utf-8');
        return { content: [{ type: 'text', text: `File written: ${args.path}` }] };
      }

      case 'append_file': {
        const filePath = getSafePath(args.path);
        await fs.appendFile(filePath, args.content, 'utf-8');
        return { content: [{ type: 'text', text: `Content appended to: ${args.path}` }] };
      }

      case 'delete_file': {
        const filePath = getSafePath(args.path);
        await fs.unlink(filePath);
        return { content: [{ type: 'text', text: `File deleted: ${args.path}` }] };
      }

      case 'copy_file': {
        const srcPath = getSafePath(args.source);
        const destPath = getSafePath(args.destination);
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await fs.copyFile(srcPath, destPath);
        return { content: [{ type: 'text', text: `Copied: ${args.source} -> ${args.destination}` }] };
      }

      case 'move_file': {
        const srcPath = getSafePath(args.source);
        const destPath = getSafePath(args.destination);
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await fs.rename(srcPath, destPath);
        return { content: [{ type: 'text', text: `Moved: ${args.source} -> ${args.destination}` }] };
      }

      case 'file_info': {
        const filePath = getSafePath(args.path);
        const stats = await fs.stat(filePath);
        const info = {
          path: args.path,
          type: stats.isDirectory() ? 'directory' : stats.isSymbolicLink() ? 'symlink' : 'file',
          size: stats.size,
          sizeFormatted: formatSize(stats.size),
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString(),
          accessed: stats.atime.toISOString(),
          permissions: stats.mode.toString(8).slice(-3),
        };
        return { content: [{ type: 'text', text: JSON.stringify(info, null, 2) }] };
      }

      case 'file_exists': {
        const filePath = getSafePath(args.path);
        try {
          await fs.access(filePath);
          const stats = await fs.stat(filePath);
          return { content: [{ type: 'text', text: JSON.stringify({ exists: true, type: stats.isDirectory() ? 'directory' : 'file' }) }] };
        } catch {
          return { content: [{ type: 'text', text: JSON.stringify({ exists: false }) }] };
        }
      }

      // ==================== DIRECTORY OPERATIONS ====================
      case 'list_directory': {
        const dirPath = getSafePath(args.path || '.');
        
        async function listDir(dir, depth = 0, maxDepth = 3) {
          if (depth > maxDepth) return [];
          
          const entries = await fs.readdir(dir, { withFileTypes: true });
          const results = [];
          
          for (const entry of entries) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
            
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(ROOT_DIR, fullPath);
            const stats = await fs.stat(fullPath);
            
            const item = {
              name: entry.name,
              path: relativePath,
              type: entry.isDirectory() ? 'directory' : 'file',
              size: entry.isDirectory() ? null : formatSize(stats.size),
            };
            
            results.push(item);
            
            if (args.recursive && entry.isDirectory() && depth < (args.maxDepth || 3)) {
              item.children = await listDir(fullPath, depth + 1, args.maxDepth || 3);
            }
          }
          
          return results.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
        }
        
        const result = await listDir(dirPath);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'create_directory': {
        const dirPath = getSafePath(args.path);
        await fs.mkdir(dirPath, { recursive: true });
        return { content: [{ type: 'text', text: `Directory created: ${args.path}` }] };
      }

      case 'delete_directory': {
        const dirPath = getSafePath(args.path);
        await fs.rm(dirPath, { recursive: true, force: true });
        return { content: [{ type: 'text', text: `Directory deleted: ${args.path}` }] };
      }

      case 'get_directory_size': {
        const dirPath = getSafePath(args.path);
        
        async function getSize(dir) {
          let size = 0;
          const entries = await fs.readdir(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              size += await getSize(fullPath);
            } else {
              const stats = await fs.stat(fullPath);
              size += stats.size;
            }
          }
          return size;
        }
        
        const size = await getSize(dirPath);
        return { content: [{ type: 'text', text: JSON.stringify({ bytes: size, formatted: formatSize(size) }) }] };
      }

      // ==================== SEARCH OPERATIONS ====================
      case 'search_files': {
        const searchDir = getSafePath(args.path || '.');
        const pattern = args.pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
        const regex = new RegExp(pattern, 'i');
        const maxResults = args.maxResults || 100;
        const results = [];

        async function search(dir) {
          if (results.length >= maxResults) return;
          
          const entries = await fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (results.length >= maxResults) return;
            if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
            
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(ROOT_DIR, fullPath);
            
            if (regex.test(entry.name)) {
              results.push({
                name: entry.name,
                path: relativePath,
                type: entry.isDirectory() ? 'directory' : 'file',
              });
            }
            
            if (entry.isDirectory()) {
              await search(fullPath);
            }
          }
        }

        await search(searchDir);
        return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
      }

      case 'search_content': {
        const searchDir = getSafePath(args.path || '.');
        const flags = args.caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(args.query, flags);
        const filePattern = args.filePattern ? new RegExp(args.filePattern.replace(/\*/g, '.*').replace(/\?/g, '.'), 'i') : null;
        const maxResults = args.maxResults || 50;
        const results = [];

        async function search(dir) {
          if (results.length >= maxResults) return;
          
          const entries = await fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (results.length >= maxResults) return;
            if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
            
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
              await search(fullPath);
            } else {
              if (filePattern && !filePattern.test(entry.name)) continue;
              
              try {
                const content = await fs.readFile(fullPath, 'utf-8');
                const lines = content.split('\n');
                
                for (let i = 0; i < lines.length && results.length < maxResults; i++) {
                  if (regex.test(lines[i])) {
                    results.push({
                      file: path.relative(ROOT_DIR, fullPath),
                      line: i + 1,
                      content: lines[i].trim().substring(0, 200),
                    });
                  }
                }
              } catch {
                // Skip binary or unreadable files
              }
            }
          }
        }

        await search(searchDir);
        return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
      }

      case 'find_replace': {
        const filePath = getSafePath(args.path);
        let content = await fs.readFile(filePath, 'utf-8');
        
        const count = (content.match(new RegExp(args.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        
        if (args.all !== false) {
          content = content.split(args.find).join(args.replace);
        } else {
          content = content.replace(args.find, args.replace);
        }
        
        await fs.writeFile(filePath, content, 'utf-8');
        return { content: [{ type: 'text', text: `Replaced ${count} occurrence(s) in ${args.path}` }] };
      }

      // ==================== COMMAND EXECUTION ====================
      case 'run_command': {
        const cwd = args.cwd ? getSafePath(args.cwd) : ROOT_DIR;
        const timeout = (args.timeout || 60) * 1000;
        
        try {
          const { stdout, stderr } = await execAsync(args.command, {
            cwd,
            timeout,
            maxBuffer: 10 * 1024 * 1024,
          });
          
          let output = stdout;
          if (stderr) output += '\n[STDERR]:\n' + stderr;
          
          return { content: [{ type: 'text', text: output || 'Command completed (no output)' }] };
        } catch (error) {
          return { 
            content: [{ type: 'text', text: `Error: ${error.message}\n${error.stderr || ''}` }],
            isError: true,
          };
        }
      }

      case 'run_script': {
        const scriptPath = getSafePath(args.path);
        let interpreter = args.interpreter;
        
        if (!interpreter) {
          const ext = path.extname(scriptPath);
          interpreter = {
            '.js': 'node',
            '.py': 'python3',
            '.sh': 'bash',
            '.rb': 'ruby',
            '.pl': 'perl',
          }[ext] || 'bash';
        }
        
        const scriptArgs = args.args || [];
        const { stdout, stderr } = await execAsync(`${interpreter} "${scriptPath}" ${scriptArgs.join(' ')}`, {
          cwd: ROOT_DIR,
          timeout: 60000,
        });
        
        let output = stdout;
        if (stderr) output += '\n[STDERR]:\n' + stderr;
        
        return { content: [{ type: 'text', text: output || 'Script completed (no output)' }] };
      }

      // ==================== SYSTEM INFO ====================
      case 'system_info': {
        const info = {
          platform: os.platform(),
          arch: os.arch(),
          hostname: os.hostname(),
          cpus: os.cpus().length,
          totalMemory: formatSize(os.totalmem()),
          freeMemory: formatSize(os.freemem()),
          uptime: Math.floor(os.uptime() / 3600) + ' hours',
          nodeVersion: process.version,
          cwd: ROOT_DIR,
        };
        return { content: [{ type: 'text', text: JSON.stringify(info, null, 2) }] };
      }

      case 'environment_vars': {
        if (args.get) {
          return { content: [{ type: 'text', text: process.env[args.get] || '(not set)' }] };
        }
        if (args.list) {
          return { content: [{ type: 'text', text: JSON.stringify(process.env, null, 2) }] };
        }
        return { content: [{ type: 'text', text: 'Specify "get" or "list" parameter' }] };
      }

      case 'disk_usage': {
        const targetPath = args.path ? getSafePath(args.path) : ROOT_DIR;
        const { stdout } = await execAsync(`df -h "${targetPath}"`);
        return { content: [{ type: 'text', text: stdout }] };
      }

      // ==================== TEXT PROCESSING ====================
      case 'count_lines': {
        const filePath = getSafePath(args.path);
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').length;
        const words = content.split(/\s+/).filter(w => w).length;
        const chars = content.length;
        
        return { content: [{ type: 'text', text: JSON.stringify({ lines, words, characters: chars }) }] };
      }

      case 'head': {
        const filePath = getSafePath(args.path);
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').slice(0, args.lines || 10);
        return { content: [{ type: 'text', text: lines.join('\n') }] };
      }

      case 'tail': {
        const filePath = getSafePath(args.path);
        const content = await fs.readFile(filePath, 'utf-8');
        const allLines = content.split('\n');
        const lines = allLines.slice(-(args.lines || 10));
        return { content: [{ type: 'text', text: lines.join('\n') }] };
      }

      // ==================== JSON OPERATIONS ====================
      case 'read_json': {
        const filePath = getSafePath(args.path);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        if (args.query) {
          // Simple dot notation query
          const keys = args.query.replace(/^\$\.?/, '').split('.');
          let result = data;
          for (const key of keys) {
            if (key && result !== undefined) {
              result = result[key];
            }
          }
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'write_json': {
        const filePath = getSafePath(args.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        const indent = args.pretty !== false ? 2 : 0;
        await fs.writeFile(filePath, JSON.stringify(args.data, null, indent), 'utf-8');
        return { content: [{ type: 'text', text: `JSON written to: ${args.path}` }] };
      }

      case 'modify_json': {
        const filePath = getSafePath(args.path);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        const keys = args.key.split('.');
        let obj = data;
        for (let i = 0; i < keys.length - 1; i++) {
          if (obj[keys[i]] === undefined) obj[keys[i]] = {};
          obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = args.value;
        
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return { content: [{ type: 'text', text: `Modified ${args.key} in ${args.path}` }] };
      }

      // ==================== COMPRESSION ====================
      case 'compress': {
        const srcPath = getSafePath(args.source);
        const destPath = getSafePath(args.destination);
        await execAsync(`zip -r "${destPath}" "${srcPath}"`);
        return { content: [{ type: 'text', text: `Compressed to: ${args.destination}` }] };
      }

      case 'decompress': {
        const srcPath = getSafePath(args.source);
        const destPath = getSafePath(args.destination);
        await fs.mkdir(destPath, { recursive: true });
        await execAsync(`unzip -o "${srcPath}" -d "${destPath}"`);
        return { content: [{ type: 'text', text: `Extracted to: ${args.destination}` }] };
      }

      // ==================== DIFF ====================
      case 'diff_files': {
        const file1 = getSafePath(args.file1);
        const file2 = getSafePath(args.file2);
        
        try {
          const { stdout } = await execAsync(`diff "${file1}" "${file2}"`);
          return { content: [{ type: 'text', text: stdout || 'Files are identical' }] };
        } catch (error) {
          return { content: [{ type: 'text', text: error.stdout || 'Files differ' }] };
        }
      }

      // ==================== PERMISSIONS ====================
      case 'chmod': {
        const filePath = getSafePath(args.path);
        await fs.chmod(filePath, parseInt(args.mode, 8));
        return { content: [{ type: 'text', text: `Permissions changed to ${args.mode} for: ${args.path}` }] };
      }

      // ==================== TREE ====================
      case 'tree': {
        const dirPath = getSafePath(args.path || '.');
        const maxDepth = args.maxDepth || 3;
        
        async function buildTree(dir, prefix = '', depth = 0) {
          if (depth > maxDepth) return '';
          
          const entries = await fs.readdir(dir, { withFileTypes: true });
          const filtered = entries.filter(e => !e.name.startsWith('.') && e.name !== 'node_modules');
          let result = '';
          
          for (let i = 0; i < filtered.length; i++) {
            const entry = filtered[i];
            const isLast = i === filtered.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            const newPrefix = prefix + (isLast ? '    ' : '│   ');
            
            result += prefix + connector + entry.name + '\n';
            
            if (entry.isDirectory()) {
              result += await buildTree(path.join(dir, entry.name), newPrefix, depth + 1);
            }
          }
          
          return result;
        }
        
        const tree = path.basename(dirPath) + '\n' + await buildTree(dirPath);
        return { content: [{ type: 'text', text: tree }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`MCP Server running for: ${ROOT_DIR}`);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});