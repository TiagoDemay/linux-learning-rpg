// ============================================================
// Virtual File System (VFS) + Linux Terminal Engine
// Simulates Ubuntu 24.04 LTS basic commands
// ============================================================

export interface VFSNode {
  type: "file" | "directory";
  content?: string;
  permissions?: string;
  children?: Record<string, VFSNode>;
  createdAt?: number;
  modifiedAt?: number;
}

export interface VFSState {
  filesystem: Record<string, VFSNode>;
  currentPath: string;
  user: string;
  hostname: string;
}

export interface CommandResult {
  output: string;
  error?: string;
  newState: VFSState;
}

// ─── Initial VFS ────────────────────────────────────────────
export function createInitialVFS(): VFSState {
  const now = Date.now();
  return {
    currentPath: "/home/user",
    user: "aventureiro",
    hostname: "terras-do-kernel",
    filesystem: {
      "/": {
        type: "directory",
        permissions: "drwxr-xr-x",
        children: { home: { type: "directory" }, etc: { type: "directory" }, var: { type: "directory" }, tmp: { type: "directory" } },
        createdAt: now,
        modifiedAt: now,
      },
      "/home": {
        type: "directory",
        permissions: "drwxr-xr-x",
        children: { user: { type: "directory" } },
        createdAt: now,
        modifiedAt: now,
      },
      "/home/user": {
        type: "directory",
        permissions: "drwxr-xr-x",
        children: {
          ".bashrc": { type: "file", content: "# .bashrc\nexport PS1='\\u@\\h:\\w\\$ '\n", permissions: "-rw-r--r--", createdAt: now, modifiedAt: now },
          ".profile": { type: "file", content: "# .profile\n", permissions: "-rw-r--r--", createdAt: now, modifiedAt: now },
          "README.txt": { type: "file", content: "Bem-vindo às Terras do Kernel!\nComplete as missões para desbloquear novos territórios.\n", permissions: "-rw-r--r--", createdAt: now, modifiedAt: now },
        },
        createdAt: now,
        modifiedAt: now,
      },
      "/etc": {
        type: "directory",
        permissions: "drwxr-xr-x",
        children: {
          "os-release": { type: "file", content: 'NAME="Ubuntu"\nVERSION="24.04 LTS (Noble Numbat)"\nID=ubuntu\n', permissions: "-rw-r--r--", createdAt: now, modifiedAt: now },
          hostname: { type: "file", content: "terras-do-kernel\n", permissions: "-rw-r--r--", createdAt: now, modifiedAt: now },
        },
        createdAt: now,
        modifiedAt: now,
      },
      "/var": {
        type: "directory",
        permissions: "drwxr-xr-x",
        children: { log: { type: "directory" } },
        createdAt: now,
        modifiedAt: now,
      },
      "/tmp": {
        type: "directory",
        permissions: "drwxrwxrwt",
        children: {},
        createdAt: now,
        modifiedAt: now,
      },
    },
  };
}

// ─── Path Utilities ─────────────────────────────────────────
function resolvePath(current: string, target: string): string {
  if (target.startsWith("/")) return normalizePath(target);
  const parts = current.split("/").filter(Boolean);
  const targetParts = target.split("/").filter(Boolean);
  for (const part of targetParts) {
    if (part === ".") continue;
    else if (part === "..") parts.pop();
    else parts.push(part);
  }
  return "/" + parts.join("/") || "/";
}

function normalizePath(p: string): string {
  const parts = p.split("/").filter(Boolean);
  const result: string[] = [];
  for (const part of parts) {
    if (part === ".") continue;
    else if (part === "..") result.pop();
    else result.push(part);
  }
  return "/" + result.join("/") || "/";
}

function getNode(vfs: VFSState, path: string): VFSNode | null {
  const normalized = normalizePath(path);
  if (vfs.filesystem[normalized]) return vfs.filesystem[normalized];
  // Try to find via parent chain (handles nodes created inline in children)
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length === 0) return vfs.filesystem["/"];
  // Walk the tree from root through children
  let current: VFSNode | null = vfs.filesystem["/"] || null;
  for (const part of parts) {
    if (!current || current.type !== "directory") return null;
    // Check filesystem map first
    const childPath = "/" + parts.slice(0, parts.indexOf(part) + 1).join("/");
    if (vfs.filesystem[childPath]) {
      current = vfs.filesystem[childPath];
    } else if (current.children?.[part]) {
      current = current.children[part];
    } else {
      return null;
    }
  }
  return current;
}

function getParentPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 1) return "/";
  return "/" + parts.slice(0, -1).join("/");
}

function getBaseName(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || "/";
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ─── Command Implementations ─────────────────────────────────

function cmdPwd(vfs: VFSState): CommandResult {
  return { output: vfs.currentPath, newState: vfs };
}

function cmdLs(vfs: VFSState, args: string[]): CommandResult {
  const showAll = args.includes("-a") || args.includes("-la") || args.includes("-al") || args.includes("-l");
  const showLong = args.includes("-l") || args.includes("-la") || args.includes("-al");
  const pathArg = args.find((a) => !a.startsWith("-")) || vfs.currentPath;
  const targetPath = resolvePath(vfs.currentPath, pathArg);
  const node = getNode(vfs, targetPath);

  if (!node) return { output: "", error: `ls: cannot access '${pathArg}': No such file or directory`, newState: vfs };
  if (node.type === "file") {
    if (showLong) {
      const perm = node.permissions || "-rw-r--r--";
      return { output: `${perm} 1 ${vfs.user} ${vfs.user} ${(node.content || "").length} Jan  1 00:00 ${getBaseName(targetPath)}`, newState: vfs };
    }
    return { output: getBaseName(targetPath), newState: vfs };
  }

  const children = node.children || {};
  let entries = Object.keys(children);
  if (!showAll) entries = entries.filter((e) => !e.startsWith("."));
  entries.sort();

  if (showLong) {
    const total = entries.length;
    const lines = [`total ${total}`];
    if (showAll) {
      lines.push(`drwxr-xr-x 2 ${vfs.user} ${vfs.user} 4096 Jan  1 00:00 .`);
      lines.push(`drwxr-xr-x 3 ${vfs.user} ${vfs.user} 4096 Jan  1 00:00 ..`);
    }
    for (const name of entries) {
      const child = children[name];
      const perm = child.permissions || (child.type === "directory" ? "drwxr-xr-x" : "-rw-r--r--");
      const size = child.type === "file" ? (child.content || "").length : 4096;
      lines.push(`${perm} 1 ${vfs.user} ${vfs.user} ${size} Jan  1 00:00 ${name}`);
    }
    return { output: lines.join("\n"), newState: vfs };
  }

  return { output: entries.join("  ") || "", newState: vfs };
}

function cmdCd(vfs: VFSState, args: string[]): CommandResult {
  const state = deepClone(vfs);
  const target = args[0] || "/home/user";
  const resolved = resolvePath(state.currentPath, target === "~" ? "/home/user" : target);
  const node = getNode(state, resolved);
  if (!node) return { output: "", error: `cd: ${target}: No such file or directory`, newState: state };
  if (node.type !== "directory") return { output: "", error: `cd: ${target}: Not a directory`, newState: state };
  state.currentPath = resolved;
  return { output: "", newState: state };
}

function cmdMkdir(vfs: VFSState, args: string[]): CommandResult {
  const state = deepClone(vfs);
  if (args.length === 0) return { output: "", error: "mkdir: missing operand", newState: state };
  const errors: string[] = [];
  for (const arg of args.filter((a) => !a.startsWith("-"))) {
    const resolved = resolvePath(state.currentPath, arg);
    const parentPath = getParentPath(resolved);
    const name = getBaseName(resolved);
    if (getNode(state, resolved)) {
      errors.push(`mkdir: cannot create directory '${arg}': File exists`);
      continue;
    }
    // Verify parent exists (check both map and inline children)
    const parentInMap = state.filesystem[parentPath];
    const parentNode = parentInMap || getNode(state, parentPath);
    if (!parentNode) { errors.push(`mkdir: cannot create directory '${arg}': No such file or directory`); continue; }
    const now = Date.now();
    const newDir: VFSNode = { type: "directory", permissions: "drwxr-xr-x", children: {}, createdAt: now, modifiedAt: now };
    // Add to filesystem map
    state.filesystem[resolved] = newDir;
    // Add to parent children - update both the map entry AND any inline reference
    if (!parentNode.children) parentNode.children = {};
    parentNode.children[name] = newDir;
    if (parentInMap && parentInMap !== parentNode) {
      if (!parentInMap.children) parentInMap.children = {};
      parentInMap.children[name] = newDir;
    }
  }
  return { output: "", error: errors.join("\n") || undefined, newState: state };
}

function cmdTouch(vfs: VFSState, args: string[]): CommandResult {
  const state = deepClone(vfs);
  if (args.length === 0) return { output: "", error: "touch: missing file operand", newState: state };
  const errors: string[] = [];
  for (const arg of args.filter((a) => !a.startsWith("-"))) {
    const resolved = resolvePath(state.currentPath, arg);
    const parentPath = getParentPath(resolved);
    const name = getBaseName(resolved);
    const existing = getNode(state, resolved);
    if (existing) {
      existing.modifiedAt = Date.now();
      continue;
    }
    const parentInMap = state.filesystem[parentPath];
    const parentNode = parentInMap || getNode(state, parentPath);
    if (!parentNode) { errors.push(`touch: cannot touch '${arg}': No such file or directory`); continue; }
    const now = Date.now();
    const newFile: VFSNode = { type: "file", content: "", permissions: "-rw-r--r--", createdAt: now, modifiedAt: now };
    // Add to parent children
    if (!parentNode.children) parentNode.children = {};
    parentNode.children[name] = newFile;
    if (parentInMap && parentInMap !== parentNode) {
      if (!parentInMap.children) parentInMap.children = {};
      parentInMap.children[name] = newFile;
    }
    state.filesystem[resolved] = newFile;
  }
  return { output: "", error: errors.join("\n") || undefined, newState: state };
}

function cmdEcho(vfs: VFSState, args: string[]): CommandResult {
  const state = deepClone(vfs);
  // Detect redirection: echo "text" > file or echo "text" >> file
  const redirectIdx = args.findIndex((a) => a === ">" || a === ">>");
  if (redirectIdx !== -1) {
    const mode = args[redirectIdx];
    const textParts = args.slice(0, redirectIdx);
    const filePart = args[redirectIdx + 1];
    if (!filePart) return { output: "", error: "bash: syntax error near unexpected token 'newline'", newState: state };
    const text = textParts.join(" ").replace(/^['"]/g, "").replace(/['"]$/g, "") + "\n";
    const resolved = resolvePath(state.currentPath, filePart);
    const parentPath = getParentPath(resolved);
    const name = getBaseName(resolved);
    // Look up existing node in filesystem map or parent children
    const existingInMap = state.filesystem[resolved];
    const existingInParent = state.filesystem[parentPath]?.children?.[name];
    const existing = existingInMap || existingInParent;
    if (existing && existing.type === "file") {
      existing.content = mode === ">>" ? (existing.content || "") + text : text;
      existing.modifiedAt = Date.now();
      // Sync both locations
      if (existingInMap) existingInMap.content = existing.content;
      if (existingInParent) existingInParent.content = existing.content;
    } else {
      const now = Date.now();
      const newFile: VFSNode = { type: "file", content: text, permissions: "-rw-r--r--", createdAt: now, modifiedAt: now };
      if (state.filesystem[parentPath]) {
        if (!state.filesystem[parentPath].children) state.filesystem[parentPath].children = {};
        state.filesystem[parentPath].children![name] = newFile;
      }
      state.filesystem[resolved] = newFile;
    }
    return { output: "", newState: state };
  }
  const text = args.join(" ").replace(/^['"]/g, "").replace(/['"]$/g, "");
  return { output: text, newState: state };
}

function cmdCat(vfs: VFSState, args: string[]): CommandResult {
  if (args.length === 0) return { output: "", error: "cat: missing operand", newState: vfs };
  const outputs: string[] = [];
  const errors: string[] = [];
  for (const arg of args.filter((a) => !a.startsWith("-"))) {
    const resolved = resolvePath(vfs.currentPath, arg);
    const node = getNode(vfs, resolved);
    if (!node) { errors.push(`cat: ${arg}: No such file or directory`); continue; }
    if (node.type === "directory") { errors.push(`cat: ${arg}: Is a directory`); continue; }
    outputs.push(node.content || "");
  }
  return { output: outputs.join(""), error: errors.join("\n") || undefined, newState: vfs };
}

function cmdRm(vfs: VFSState, args: string[]): CommandResult {
  const state = deepClone(vfs);
  const recursive = args.includes("-r") || args.includes("-rf") || args.includes("-fr");
  const files = args.filter((a) => !a.startsWith("-"));
  if (files.length === 0) return { output: "", error: "rm: missing operand", newState: state };
  const errors: string[] = [];
  for (const arg of files) {
    const resolved = resolvePath(state.currentPath, arg);
    const name = getBaseName(resolved);
    const parentPath = getParentPath(resolved);
    const node = getNode(state, resolved);
    if (!node) { errors.push(`rm: cannot remove '${arg}': No such file or directory`); continue; }
    if (node.type === "directory" && !recursive) { errors.push(`rm: cannot remove '${arg}': Is a directory`); continue; }
    // Remove from parent
    if (state.filesystem[parentPath]?.children) {
      delete state.filesystem[parentPath].children![name];
    }
    // Remove from filesystem map (and children recursively)
    const toDelete = Object.keys(state.filesystem).filter((k) => k === resolved || k.startsWith(resolved + "/"));
    for (const key of toDelete) delete state.filesystem[key];
  }
  return { output: "", error: errors.join("\n") || undefined, newState: state };
}

function cmdCp(vfs: VFSState, args: string[]): CommandResult {
  const state = deepClone(vfs);
  const files = args.filter((a) => !a.startsWith("-"));
  if (files.length < 2) return { output: "", error: "cp: missing destination file operand", newState: state };
  const src = resolvePath(state.currentPath, files[0]);
  const dst = resolvePath(state.currentPath, files[1]);
  const srcNode = getNode(state, src);
  if (!srcNode) return { output: "", error: `cp: cannot stat '${files[0]}': No such file or directory`, newState: state };
  const dstParent = getParentPath(dst);
  const dstName = getBaseName(dst);
  const now = Date.now();
  const newNode: VFSNode = { ...deepClone(srcNode), createdAt: now, modifiedAt: now };
  if (state.filesystem[dstParent]) {
    if (!state.filesystem[dstParent].children) state.filesystem[dstParent].children = {};
    state.filesystem[dstParent].children![dstName] = newNode;
  }
  state.filesystem[dst] = newNode;
  return { output: "", newState: state };
}

function cmdMv(vfs: VFSState, args: string[]): CommandResult {
  const state = deepClone(vfs);
  const files = args.filter((a) => !a.startsWith("-"));
  if (files.length < 2) return { output: "", error: "mv: missing destination file operand", newState: state };
  const src = resolvePath(state.currentPath, files[0]);
  const dst = resolvePath(state.currentPath, files[1]);
  const srcNode = getNode(state, src);
  if (!srcNode) return { output: "", error: `mv: cannot stat '${files[0]}': No such file or directory`, newState: state };
  const srcParent = getParentPath(src);
  const srcName = getBaseName(src);
  const dstParent = getParentPath(dst);
  const dstName = getBaseName(dst);
  // Remove from source
  if (state.filesystem[srcParent]?.children) delete state.filesystem[srcParent].children![srcName];
  delete state.filesystem[src];
  // Add to destination
  const now = Date.now();
  const newNode: VFSNode = { ...deepClone(srcNode), modifiedAt: now };
  if (state.filesystem[dstParent]) {
    if (!state.filesystem[dstParent].children) state.filesystem[dstParent].children = {};
    state.filesystem[dstParent].children![dstName] = newNode;
  }
  state.filesystem[dst] = newNode;
  return { output: "", newState: state };
}

function cmdRmdir(vfs: VFSState, args: string[]): CommandResult {
  const state = deepClone(vfs);
  if (args.length === 0) return { output: "", error: "rmdir: missing operand", newState: state };
  const target = resolvePath(state.currentPath, args[0]);
  const node = getNode(state, target);
  if (!node) return { output: "", error: `rmdir: failed to remove '${args[0]}': No such file or directory`, newState: state };
  if (node.type !== "directory") return { output: "", error: `rmdir: failed to remove '${args[0]}': Not a directory`, newState: state };
  const childCount = Object.keys(node.children || {}).length;
  if (childCount > 0) return { output: "", error: `rmdir: failed to remove '${args[0]}': Directory not empty`, newState: state };
  // Remove from parent's children
  const parentPath = target.substring(0, target.lastIndexOf("/")) || "/";
  const name = target.substring(target.lastIndexOf("/") + 1);
  const parentNode = state.filesystem[parentPath];
  if (parentNode?.children) delete parentNode.children[name];
  // Remove from filesystem map
  delete state.filesystem[target];
  return { output: "", newState: state };
}

function cmdGrep(vfs: VFSState, args: string[]): CommandResult {
  if (args.length < 2) return { output: "", error: "grep: usage: grep PATTERN FILE", newState: vfs };
  const pattern = args[0];
  const filePath = resolvePath(vfs.currentPath, args[1]);
  const node = getNode(vfs, filePath);
  if (!node) return { output: "", error: `grep: ${args[1]}: No such file or directory`, newState: vfs };
  if (node.type === "directory") return { output: "", error: `grep: ${args[1]}: Is a directory`, newState: vfs };
  const content = node.content || "";
  const lines = content.split("\n");
  const matched = lines.filter((l) => l.includes(pattern));
  if (matched.length === 0) return { output: "", error: `(sem correspondências para '${pattern}')`, newState: vfs };
  return { output: matched.join("\n"), newState: vfs };
}

function cmdFind(vfs: VFSState, args: string[]): CommandResult {
  // find [dir] -name pattern
  const nameIdx = args.indexOf("-name");
  const searchPattern = nameIdx >= 0 ? args[nameIdx + 1] : undefined;
  const startDir = args[0] && !args[0].startsWith("-") ? resolvePath(vfs.currentPath, args[0]) : vfs.currentPath;
  const results: string[] = [];
  const allPaths = Object.keys(vfs.filesystem);
  for (const p of allPaths) {
    if (!p.startsWith(startDir)) continue;
    const name = p.substring(p.lastIndexOf("/") + 1);
    if (!searchPattern || name === searchPattern || name.includes(searchPattern.replace(/\*/g, ""))) {
      const rel = p.replace(startDir, ".");
      results.push(rel || ".");
    }
  }
  if (results.length === 0) return { output: "", error: `(nenhum arquivo encontrado)`, newState: vfs };
  return { output: results.join("\n"), newState: vfs };
}

function cmdChmod(vfs: VFSState, args: string[]): CommandResult {
  const state = deepClone(vfs);
  if (args.length < 2) return { output: "", error: "chmod: missing operand", newState: state };
  const mode = args[0];
  const target = resolvePath(state.currentPath, args[1]);
  const node = getNode(state, target);
  if (!node) return { output: "", error: `chmod: cannot access '${args[1]}': No such file or directory`, newState: state };
  node.permissions = (node.type === "directory" ? "d" : "-") + mode.padEnd(9, "-").slice(0, 9);
  return { output: "", newState: state };
}

function cmdMan(vfs: VFSState, args: string[]): CommandResult {
  const manPages: Record<string, string> = {
    ls: "LS(1)\n\nNAME\n  ls - list directory contents\n\nSYNOPSIS\n  ls [OPTION]... [FILE]...\n\nOPTIONS\n  -a  do not ignore entries starting with .\n  -l  use a long listing format",
    cd: "CD(1)\n\nNAME\n  cd - change the shell working directory\n\nSYNOPSIS\n  cd [DIR]",
    mkdir: "MKDIR(1)\n\nNAME\n  mkdir - make directories\n\nSYNOPSIS\n  mkdir [OPTION]... DIRECTORY...",
    touch: "TOUCH(1)\n\nNAME\n  touch - change file timestamps\n\nSYNOPSIS\n  touch [OPTION]... FILE...",
    rm: "RM(1)\n\nNAME\n  rm - remove files or directories\n\nSYNOPSIS\n  rm [OPTION]... FILE...\n\nOPTIONS\n  -r  remove directories and their contents recursively",
    cat: "CAT(1)\n\nNAME\n  cat - concatenate files and print on the standard output\n\nSYNOPSIS\n  cat [OPTION]... [FILE]...",
    echo: "ECHO(1)\n\nNAME\n  echo - display a line of text\n\nSYNOPSIS\n  echo [STRING]...",
    cp: "CP(1)\n\nNAME\n  cp - copy files and directories\n\nSYNOPSIS\n  cp [OPTION]... SOURCE DEST",
    mv: "MV(1)\n\nNAME\n  mv - move (rename) files\n\nSYNOPSIS\n  mv [OPTION]... SOURCE DEST",
    pwd: "PWD(1)\n\nNAME\n  pwd - print name of current/working directory\n\nSYNOPSIS\n  pwd",
    chmod: "CHMOD(1)\n\nNAME\n  chmod - change file mode bits\n\nSYNOPSIS\n  chmod MODE FILE",
  };
  const cmd = args[0];
  if (!cmd) return { output: "What manual page do you want?", newState: vfs };
  const page = manPages[cmd];
  if (!page) return { output: "", error: `No manual entry for ${cmd}`, newState: vfs };
  return { output: page, newState: vfs };
}

function cmdHelp(vfs: VFSState): CommandResult {
  const help = `Comandos disponíveis nas Terras do Kernel:

  pwd          - Mostra o diretório atual
  ls [opções]  - Lista arquivos e diretórios
  cd [dir]     - Muda de diretório
  mkdir <dir>  - Cria um diretório
  touch <arq>  - Cria um arquivo vazio
  echo <texto> - Exibe texto (use > para redirecionar)
  cat <arq>    - Exibe conteúdo de arquivo
  rm <arq>     - Remove arquivo (-r para diretório)
  cp <src> <dst> - Copia arquivo
  mv <src> <dst> - Move/renomeia arquivo
  chmod <modo> <arq> - Altera permissões
  man <cmd>    - Manual do comando
  clear        - Limpa o terminal
  help         - Esta ajuda

Exemplos:
  echo 'Olá Mundo' > ola.txt
  mkdir minha-pasta && cd minha-pasta
  ls -la`;
  return { output: help, newState: vfs };
}

// ─── Pipe and Chain support ──────────────────────────────────
function parseCommandLine(input: string): string[][] {
  // Split by && first (sequential), then handle each
  const chains = input.split("&&").map((s) => s.trim());
  return chains.map((cmd) => {
    // Simple tokenizer respecting quotes
    const tokens: string[] = [];
    let current = "";
    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i < cmd.length; i++) {
      const ch = cmd[i];
      if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
      if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
      if (ch === " " && !inSingle && !inDouble) {
        if (current) { tokens.push(current); current = ""; }
        continue;
      }
      current += ch;
    }
    if (current) tokens.push(current);
    return tokens;
  });
}

// ─── Main Execute Function ───────────────────────────────────
export function executeCommand(input: string, vfs: VFSState): CommandResult {
  const trimmed = input.trim();
  if (!trimmed) return { output: "", newState: vfs };

  const chains = parseCommandLine(trimmed);
  let currentState = vfs;
  const allOutputs: string[] = [];
  const allErrors: string[] = [];

  for (const tokens of chains) {
    if (tokens.length === 0) continue;
    const [cmd, ...args] = tokens;

    let result: CommandResult;

    switch (cmd.toLowerCase()) {
      case "pwd":
        result = cmdPwd(currentState);
        break;
      case "ls":
        result = cmdLs(currentState, args);
        break;
      case "cd":
        result = cmdCd(currentState, args);
        break;
      case "mkdir":
        result = cmdMkdir(currentState, args);
        break;
      case "touch":
        result = cmdTouch(currentState, args);
        break;
      case "echo":
        result = cmdEcho(currentState, args);
        break;
      case "cat":
        result = cmdCat(currentState, args);
        break;
      case "rm":
        result = cmdRm(currentState, args);
        break;
      case "cp":
        result = cmdCp(currentState, args);
        break;
      case "mv":
        result = cmdMv(currentState, args);
        break;
      case "rmdir":
        result = cmdRmdir(currentState, args);
        break;
      case "grep":
        result = cmdGrep(currentState, args);
        break;
      case "find":
        result = cmdFind(currentState, args);
        break;
      case "chmod":
        result = cmdChmod(currentState, args);
        break;
      case "man":
        result = cmdMan(currentState, args);
        break;
      case "help":
        result = cmdHelp(currentState);
        break;
      case "clear":
        return { output: "\x1b[CLEAR]", newState: currentState };
      case "whoami":
        result = { output: currentState.user, newState: currentState };
        break;
      case "hostname":
        result = { output: currentState.hostname, newState: currentState };
        break;
      case "uname":
        result = {
          output: args.includes("-a")
            ? "Linux terras-do-kernel 6.8.0-kernel #1 SMP PREEMPT_DYNAMIC Ubuntu 24.04 LTS x86_64 GNU/Linux"
            : "Linux",
          newState: currentState,
        };
        break;
      case "date":
        result = { output: new Date().toString(), newState: currentState };
        break;
      case "uptime":
        result = { output: " 00:00:01 up 0 min,  1 user,  load average: 0.00, 0.00, 0.00", newState: currentState };
        break;
      case "history":
        result = { output: "(histórico não disponível nesta sessão)", newState: currentState };
        break;
      default:
        result = {
          output: "",
          error: `${cmd}: command not found\nDica: digite 'help' para ver os comandos disponíveis`,
          newState: currentState,
        };
    }

    if (result.output) allOutputs.push(result.output);
    if (result.error) allErrors.push(result.error);
    currentState = result.newState;

    // Stop chain on error
    if (result.error) break;
  }

  return {
    output: allOutputs.join("\n"),
    error: allErrors.join("\n") || undefined,
    newState: currentState,
  };
}

export function getPrompt(vfs: VFSState): string {
  const path =
    vfs.currentPath === `/home/${vfs.user}` || vfs.currentPath === "/home/user"
      ? "~"
      : vfs.currentPath.replace(`/home/${vfs.user}`, "~").replace("/home/user", "~");
  return `${vfs.user}@${vfs.hostname}:${path}$`;
}
