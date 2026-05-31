"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/main.ts
var import_electron = require("electron");
var import_node_fs6 = require("node:fs");
var import_node_child_process2 = require("node:child_process");
var import_node_crypto = require("node:crypto");
var import_node_path6 = require("node:path");
var import_node_os2 = require("node:os");

// ../../node_modules/chokidar/esm/index.js
var import_fs2 = require("fs");
var import_promises3 = require("fs/promises");
var import_events = require("events");
var sysPath2 = __toESM(require("path"), 1);

// ../../node_modules/readdirp/esm/index.js
var import_promises = require("node:fs/promises");
var import_node_stream = require("node:stream");
var import_node_path = require("node:path");
var EntryTypes = {
  FILE_TYPE: "files",
  DIR_TYPE: "directories",
  FILE_DIR_TYPE: "files_directories",
  EVERYTHING_TYPE: "all"
};
var defaultOptions = {
  root: ".",
  fileFilter: (_entryInfo) => true,
  directoryFilter: (_entryInfo) => true,
  type: EntryTypes.FILE_TYPE,
  lstat: false,
  depth: 2147483648,
  alwaysStat: false,
  highWaterMark: 4096
};
Object.freeze(defaultOptions);
var RECURSIVE_ERROR_CODE = "READDIRP_RECURSIVE_ERROR";
var NORMAL_FLOW_ERRORS = /* @__PURE__ */ new Set(["ENOENT", "EPERM", "EACCES", "ELOOP", RECURSIVE_ERROR_CODE]);
var ALL_TYPES = [
  EntryTypes.DIR_TYPE,
  EntryTypes.EVERYTHING_TYPE,
  EntryTypes.FILE_DIR_TYPE,
  EntryTypes.FILE_TYPE
];
var DIR_TYPES = /* @__PURE__ */ new Set([
  EntryTypes.DIR_TYPE,
  EntryTypes.EVERYTHING_TYPE,
  EntryTypes.FILE_DIR_TYPE
]);
var FILE_TYPES = /* @__PURE__ */ new Set([
  EntryTypes.EVERYTHING_TYPE,
  EntryTypes.FILE_DIR_TYPE,
  EntryTypes.FILE_TYPE
]);
var isNormalFlowError = (error) => NORMAL_FLOW_ERRORS.has(error.code);
var wantBigintFsStats = process.platform === "win32";
var emptyFn = (_entryInfo) => true;
var normalizeFilter = (filter) => {
  if (filter === void 0)
    return emptyFn;
  if (typeof filter === "function")
    return filter;
  if (typeof filter === "string") {
    const fl = filter.trim();
    return (entry) => entry.basename === fl;
  }
  if (Array.isArray(filter)) {
    const trItems = filter.map((item) => item.trim());
    return (entry) => trItems.some((f) => entry.basename === f);
  }
  return emptyFn;
};
var ReaddirpStream = class extends import_node_stream.Readable {
  constructor(options = {}) {
    super({
      objectMode: true,
      autoDestroy: true,
      highWaterMark: options.highWaterMark
    });
    const opts = { ...defaultOptions, ...options };
    const { root, type } = opts;
    this._fileFilter = normalizeFilter(opts.fileFilter);
    this._directoryFilter = normalizeFilter(opts.directoryFilter);
    const statMethod = opts.lstat ? import_promises.lstat : import_promises.stat;
    if (wantBigintFsStats) {
      this._stat = (path) => statMethod(path, { bigint: true });
    } else {
      this._stat = statMethod;
    }
    this._maxDepth = opts.depth ?? defaultOptions.depth;
    this._wantsDir = type ? DIR_TYPES.has(type) : false;
    this._wantsFile = type ? FILE_TYPES.has(type) : false;
    this._wantsEverything = type === EntryTypes.EVERYTHING_TYPE;
    this._root = (0, import_node_path.resolve)(root);
    this._isDirent = !opts.alwaysStat;
    this._statsProp = this._isDirent ? "dirent" : "stats";
    this._rdOptions = { encoding: "utf8", withFileTypes: this._isDirent };
    this.parents = [this._exploreDir(root, 1)];
    this.reading = false;
    this.parent = void 0;
  }
  async _read(batch) {
    if (this.reading)
      return;
    this.reading = true;
    try {
      while (!this.destroyed && batch > 0) {
        const par = this.parent;
        const fil = par && par.files;
        if (fil && fil.length > 0) {
          const { path, depth } = par;
          const slice = fil.splice(0, batch).map((dirent) => this._formatEntry(dirent, path));
          const awaited = await Promise.all(slice);
          for (const entry of awaited) {
            if (!entry)
              continue;
            if (this.destroyed)
              return;
            const entryType = await this._getEntryType(entry);
            if (entryType === "directory" && this._directoryFilter(entry)) {
              if (depth <= this._maxDepth) {
                this.parents.push(this._exploreDir(entry.fullPath, depth + 1));
              }
              if (this._wantsDir) {
                this.push(entry);
                batch--;
              }
            } else if ((entryType === "file" || this._includeAsFile(entry)) && this._fileFilter(entry)) {
              if (this._wantsFile) {
                this.push(entry);
                batch--;
              }
            }
          }
        } else {
          const parent = this.parents.pop();
          if (!parent) {
            this.push(null);
            break;
          }
          this.parent = await parent;
          if (this.destroyed)
            return;
        }
      }
    } catch (error) {
      this.destroy(error);
    } finally {
      this.reading = false;
    }
  }
  async _exploreDir(path, depth) {
    let files;
    try {
      files = await (0, import_promises.readdir)(path, this._rdOptions);
    } catch (error) {
      this._onError(error);
    }
    return { files, depth, path };
  }
  async _formatEntry(dirent, path) {
    let entry;
    const basename3 = this._isDirent ? dirent.name : dirent;
    try {
      const fullPath = (0, import_node_path.resolve)((0, import_node_path.join)(path, basename3));
      entry = { path: (0, import_node_path.relative)(this._root, fullPath), fullPath, basename: basename3 };
      entry[this._statsProp] = this._isDirent ? dirent : await this._stat(fullPath);
    } catch (err) {
      this._onError(err);
      return;
    }
    return entry;
  }
  _onError(err) {
    if (isNormalFlowError(err) && !this.destroyed) {
      this.emit("warn", err);
    } else {
      this.destroy(err);
    }
  }
  async _getEntryType(entry) {
    if (!entry && this._statsProp in entry) {
      return "";
    }
    const stats = entry[this._statsProp];
    if (stats.isFile())
      return "file";
    if (stats.isDirectory())
      return "directory";
    if (stats && stats.isSymbolicLink()) {
      const full = entry.fullPath;
      try {
        const entryRealPath = await (0, import_promises.realpath)(full);
        const entryRealPathStats = await (0, import_promises.lstat)(entryRealPath);
        if (entryRealPathStats.isFile()) {
          return "file";
        }
        if (entryRealPathStats.isDirectory()) {
          const len = entryRealPath.length;
          if (full.startsWith(entryRealPath) && full.substr(len, 1) === import_node_path.sep) {
            const recursiveError = new Error(`Circular symlink detected: "${full}" points to "${entryRealPath}"`);
            recursiveError.code = RECURSIVE_ERROR_CODE;
            return this._onError(recursiveError);
          }
          return "directory";
        }
      } catch (error) {
        this._onError(error);
        return "";
      }
    }
  }
  _includeAsFile(entry) {
    const stats = entry && entry[this._statsProp];
    return stats && this._wantsEverything && !stats.isDirectory();
  }
};
function readdirp(root, options = {}) {
  let type = options.entryType || options.type;
  if (type === "both")
    type = EntryTypes.FILE_DIR_TYPE;
  if (type)
    options.type = type;
  if (!root) {
    throw new Error("readdirp: root argument is required. Usage: readdirp(root, options)");
  } else if (typeof root !== "string") {
    throw new TypeError("readdirp: root argument must be a string. Usage: readdirp(root, options)");
  } else if (type && !ALL_TYPES.includes(type)) {
    throw new Error(`readdirp: Invalid type passed. Use one of ${ALL_TYPES.join(", ")}`);
  }
  options.root = root;
  return new ReaddirpStream(options);
}

// ../../node_modules/chokidar/esm/handler.js
var import_fs = require("fs");
var import_promises2 = require("fs/promises");
var sysPath = __toESM(require("path"), 1);
var import_os = require("os");
var STR_DATA = "data";
var STR_END = "end";
var STR_CLOSE = "close";
var EMPTY_FN = () => {
};
var pl = process.platform;
var isWindows = pl === "win32";
var isMacos = pl === "darwin";
var isLinux = pl === "linux";
var isFreeBSD = pl === "freebsd";
var isIBMi = (0, import_os.type)() === "OS400";
var EVENTS = {
  ALL: "all",
  READY: "ready",
  ADD: "add",
  CHANGE: "change",
  ADD_DIR: "addDir",
  UNLINK: "unlink",
  UNLINK_DIR: "unlinkDir",
  RAW: "raw",
  ERROR: "error"
};
var EV = EVENTS;
var THROTTLE_MODE_WATCH = "watch";
var statMethods = { lstat: import_promises2.lstat, stat: import_promises2.stat };
var KEY_LISTENERS = "listeners";
var KEY_ERR = "errHandlers";
var KEY_RAW = "rawEmitters";
var HANDLER_KEYS = [KEY_LISTENERS, KEY_ERR, KEY_RAW];
var binaryExtensions = /* @__PURE__ */ new Set([
  "3dm",
  "3ds",
  "3g2",
  "3gp",
  "7z",
  "a",
  "aac",
  "adp",
  "afdesign",
  "afphoto",
  "afpub",
  "ai",
  "aif",
  "aiff",
  "alz",
  "ape",
  "apk",
  "appimage",
  "ar",
  "arj",
  "asf",
  "au",
  "avi",
  "bak",
  "baml",
  "bh",
  "bin",
  "bk",
  "bmp",
  "btif",
  "bz2",
  "bzip2",
  "cab",
  "caf",
  "cgm",
  "class",
  "cmx",
  "cpio",
  "cr2",
  "cur",
  "dat",
  "dcm",
  "deb",
  "dex",
  "djvu",
  "dll",
  "dmg",
  "dng",
  "doc",
  "docm",
  "docx",
  "dot",
  "dotm",
  "dra",
  "DS_Store",
  "dsk",
  "dts",
  "dtshd",
  "dvb",
  "dwg",
  "dxf",
  "ecelp4800",
  "ecelp7470",
  "ecelp9600",
  "egg",
  "eol",
  "eot",
  "epub",
  "exe",
  "f4v",
  "fbs",
  "fh",
  "fla",
  "flac",
  "flatpak",
  "fli",
  "flv",
  "fpx",
  "fst",
  "fvt",
  "g3",
  "gh",
  "gif",
  "graffle",
  "gz",
  "gzip",
  "h261",
  "h263",
  "h264",
  "icns",
  "ico",
  "ief",
  "img",
  "ipa",
  "iso",
  "jar",
  "jpeg",
  "jpg",
  "jpgv",
  "jpm",
  "jxr",
  "key",
  "ktx",
  "lha",
  "lib",
  "lvp",
  "lz",
  "lzh",
  "lzma",
  "lzo",
  "m3u",
  "m4a",
  "m4v",
  "mar",
  "mdi",
  "mht",
  "mid",
  "midi",
  "mj2",
  "mka",
  "mkv",
  "mmr",
  "mng",
  "mobi",
  "mov",
  "movie",
  "mp3",
  "mp4",
  "mp4a",
  "mpeg",
  "mpg",
  "mpga",
  "mxu",
  "nef",
  "npx",
  "numbers",
  "nupkg",
  "o",
  "odp",
  "ods",
  "odt",
  "oga",
  "ogg",
  "ogv",
  "otf",
  "ott",
  "pages",
  "pbm",
  "pcx",
  "pdb",
  "pdf",
  "pea",
  "pgm",
  "pic",
  "png",
  "pnm",
  "pot",
  "potm",
  "potx",
  "ppa",
  "ppam",
  "ppm",
  "pps",
  "ppsm",
  "ppsx",
  "ppt",
  "pptm",
  "pptx",
  "psd",
  "pya",
  "pyc",
  "pyo",
  "pyv",
  "qt",
  "rar",
  "ras",
  "raw",
  "resources",
  "rgb",
  "rip",
  "rlc",
  "rmf",
  "rmvb",
  "rpm",
  "rtf",
  "rz",
  "s3m",
  "s7z",
  "scpt",
  "sgi",
  "shar",
  "snap",
  "sil",
  "sketch",
  "slk",
  "smv",
  "snk",
  "so",
  "stl",
  "suo",
  "sub",
  "swf",
  "tar",
  "tbz",
  "tbz2",
  "tga",
  "tgz",
  "thmx",
  "tif",
  "tiff",
  "tlz",
  "ttc",
  "ttf",
  "txz",
  "udf",
  "uvh",
  "uvi",
  "uvm",
  "uvp",
  "uvs",
  "uvu",
  "viv",
  "vob",
  "war",
  "wav",
  "wax",
  "wbmp",
  "wdp",
  "weba",
  "webm",
  "webp",
  "whl",
  "wim",
  "wm",
  "wma",
  "wmv",
  "wmx",
  "woff",
  "woff2",
  "wrm",
  "wvx",
  "xbm",
  "xif",
  "xla",
  "xlam",
  "xls",
  "xlsb",
  "xlsm",
  "xlsx",
  "xlt",
  "xltm",
  "xltx",
  "xm",
  "xmind",
  "xpi",
  "xpm",
  "xwd",
  "xz",
  "z",
  "zip",
  "zipx"
]);
var isBinaryPath = (filePath) => binaryExtensions.has(sysPath.extname(filePath).slice(1).toLowerCase());
var foreach = (val, fn) => {
  if (val instanceof Set) {
    val.forEach(fn);
  } else {
    fn(val);
  }
};
var addAndConvert = (main, prop, item) => {
  let container = main[prop];
  if (!(container instanceof Set)) {
    main[prop] = container = /* @__PURE__ */ new Set([container]);
  }
  container.add(item);
};
var clearItem = (cont) => (key) => {
  const set = cont[key];
  if (set instanceof Set) {
    set.clear();
  } else {
    delete cont[key];
  }
};
var delFromSet = (main, prop, item) => {
  const container = main[prop];
  if (container instanceof Set) {
    container.delete(item);
  } else if (container === item) {
    delete main[prop];
  }
};
var isEmptySet = (val) => val instanceof Set ? val.size === 0 : !val;
var FsWatchInstances = /* @__PURE__ */ new Map();
function createFsWatchInstance(path, options, listener, errHandler, emitRaw) {
  const handleEvent = (rawEvent, evPath) => {
    listener(path);
    emitRaw(rawEvent, evPath, { watchedPath: path });
    if (evPath && path !== evPath) {
      fsWatchBroadcast(sysPath.resolve(path, evPath), KEY_LISTENERS, sysPath.join(path, evPath));
    }
  };
  try {
    return (0, import_fs.watch)(path, {
      persistent: options.persistent
    }, handleEvent);
  } catch (error) {
    errHandler(error);
    return void 0;
  }
}
var fsWatchBroadcast = (fullPath, listenerType, val1, val2, val3) => {
  const cont = FsWatchInstances.get(fullPath);
  if (!cont)
    return;
  foreach(cont[listenerType], (listener) => {
    listener(val1, val2, val3);
  });
};
var setFsWatchListener = (path, fullPath, options, handlers) => {
  const { listener, errHandler, rawEmitter } = handlers;
  let cont = FsWatchInstances.get(fullPath);
  let watcher;
  if (!options.persistent) {
    watcher = createFsWatchInstance(path, options, listener, errHandler, rawEmitter);
    if (!watcher)
      return;
    return watcher.close.bind(watcher);
  }
  if (cont) {
    addAndConvert(cont, KEY_LISTENERS, listener);
    addAndConvert(cont, KEY_ERR, errHandler);
    addAndConvert(cont, KEY_RAW, rawEmitter);
  } else {
    watcher = createFsWatchInstance(
      path,
      options,
      fsWatchBroadcast.bind(null, fullPath, KEY_LISTENERS),
      errHandler,
      // no need to use broadcast here
      fsWatchBroadcast.bind(null, fullPath, KEY_RAW)
    );
    if (!watcher)
      return;
    watcher.on(EV.ERROR, async (error) => {
      const broadcastErr = fsWatchBroadcast.bind(null, fullPath, KEY_ERR);
      if (cont)
        cont.watcherUnusable = true;
      if (isWindows && error.code === "EPERM") {
        try {
          const fd = await (0, import_promises2.open)(path, "r");
          await fd.close();
          broadcastErr(error);
        } catch (err) {
        }
      } else {
        broadcastErr(error);
      }
    });
    cont = {
      listeners: listener,
      errHandlers: errHandler,
      rawEmitters: rawEmitter,
      watcher
    };
    FsWatchInstances.set(fullPath, cont);
  }
  return () => {
    delFromSet(cont, KEY_LISTENERS, listener);
    delFromSet(cont, KEY_ERR, errHandler);
    delFromSet(cont, KEY_RAW, rawEmitter);
    if (isEmptySet(cont.listeners)) {
      cont.watcher.close();
      FsWatchInstances.delete(fullPath);
      HANDLER_KEYS.forEach(clearItem(cont));
      cont.watcher = void 0;
      Object.freeze(cont);
    }
  };
};
var FsWatchFileInstances = /* @__PURE__ */ new Map();
var setFsWatchFileListener = (path, fullPath, options, handlers) => {
  const { listener, rawEmitter } = handlers;
  let cont = FsWatchFileInstances.get(fullPath);
  const copts = cont && cont.options;
  if (copts && (copts.persistent < options.persistent || copts.interval > options.interval)) {
    (0, import_fs.unwatchFile)(fullPath);
    cont = void 0;
  }
  if (cont) {
    addAndConvert(cont, KEY_LISTENERS, listener);
    addAndConvert(cont, KEY_RAW, rawEmitter);
  } else {
    cont = {
      listeners: listener,
      rawEmitters: rawEmitter,
      options,
      watcher: (0, import_fs.watchFile)(fullPath, options, (curr, prev) => {
        foreach(cont.rawEmitters, (rawEmitter2) => {
          rawEmitter2(EV.CHANGE, fullPath, { curr, prev });
        });
        const currmtime = curr.mtimeMs;
        if (curr.size !== prev.size || currmtime > prev.mtimeMs || currmtime === 0) {
          foreach(cont.listeners, (listener2) => listener2(path, curr));
        }
      })
    };
    FsWatchFileInstances.set(fullPath, cont);
  }
  return () => {
    delFromSet(cont, KEY_LISTENERS, listener);
    delFromSet(cont, KEY_RAW, rawEmitter);
    if (isEmptySet(cont.listeners)) {
      FsWatchFileInstances.delete(fullPath);
      (0, import_fs.unwatchFile)(fullPath);
      cont.options = cont.watcher = void 0;
      Object.freeze(cont);
    }
  };
};
var NodeFsHandler = class {
  constructor(fsW) {
    this.fsw = fsW;
    this._boundHandleError = (error) => fsW._handleError(error);
  }
  /**
   * Watch file for changes with fs_watchFile or fs_watch.
   * @param path to file or dir
   * @param listener on fs change
   * @returns closer for the watcher instance
   */
  _watchWithNodeFs(path, listener) {
    const opts = this.fsw.options;
    const directory = sysPath.dirname(path);
    const basename3 = sysPath.basename(path);
    const parent = this.fsw._getWatchedDir(directory);
    parent.add(basename3);
    const absolutePath = sysPath.resolve(path);
    const options = {
      persistent: opts.persistent
    };
    if (!listener)
      listener = EMPTY_FN;
    let closer;
    if (opts.usePolling) {
      const enableBin = opts.interval !== opts.binaryInterval;
      options.interval = enableBin && isBinaryPath(basename3) ? opts.binaryInterval : opts.interval;
      closer = setFsWatchFileListener(path, absolutePath, options, {
        listener,
        rawEmitter: this.fsw._emitRaw
      });
    } else {
      closer = setFsWatchListener(path, absolutePath, options, {
        listener,
        errHandler: this._boundHandleError,
        rawEmitter: this.fsw._emitRaw
      });
    }
    return closer;
  }
  /**
   * Watch a file and emit add event if warranted.
   * @returns closer for the watcher instance
   */
  _handleFile(file, stats, initialAdd) {
    if (this.fsw.closed) {
      return;
    }
    const dirname5 = sysPath.dirname(file);
    const basename3 = sysPath.basename(file);
    const parent = this.fsw._getWatchedDir(dirname5);
    let prevStats = stats;
    if (parent.has(basename3))
      return;
    const listener = async (path, newStats) => {
      if (!this.fsw._throttle(THROTTLE_MODE_WATCH, file, 5))
        return;
      if (!newStats || newStats.mtimeMs === 0) {
        try {
          const newStats2 = await (0, import_promises2.stat)(file);
          if (this.fsw.closed)
            return;
          const at = newStats2.atimeMs;
          const mt = newStats2.mtimeMs;
          if (!at || at <= mt || mt !== prevStats.mtimeMs) {
            this.fsw._emit(EV.CHANGE, file, newStats2);
          }
          if ((isMacos || isLinux || isFreeBSD) && prevStats.ino !== newStats2.ino) {
            this.fsw._closeFile(path);
            prevStats = newStats2;
            const closer2 = this._watchWithNodeFs(file, listener);
            if (closer2)
              this.fsw._addPathCloser(path, closer2);
          } else {
            prevStats = newStats2;
          }
        } catch (error) {
          this.fsw._remove(dirname5, basename3);
        }
      } else if (parent.has(basename3)) {
        const at = newStats.atimeMs;
        const mt = newStats.mtimeMs;
        if (!at || at <= mt || mt !== prevStats.mtimeMs) {
          this.fsw._emit(EV.CHANGE, file, newStats);
        }
        prevStats = newStats;
      }
    };
    const closer = this._watchWithNodeFs(file, listener);
    if (!(initialAdd && this.fsw.options.ignoreInitial) && this.fsw._isntIgnored(file)) {
      if (!this.fsw._throttle(EV.ADD, file, 0))
        return;
      this.fsw._emit(EV.ADD, file, stats);
    }
    return closer;
  }
  /**
   * Handle symlinks encountered while reading a dir.
   * @param entry returned by readdirp
   * @param directory path of dir being read
   * @param path of this item
   * @param item basename of this item
   * @returns true if no more processing is needed for this entry.
   */
  async _handleSymlink(entry, directory, path, item) {
    if (this.fsw.closed) {
      return;
    }
    const full = entry.fullPath;
    const dir = this.fsw._getWatchedDir(directory);
    if (!this.fsw.options.followSymlinks) {
      this.fsw._incrReadyCount();
      let linkPath;
      try {
        linkPath = await (0, import_promises2.realpath)(path);
      } catch (e) {
        this.fsw._emitReady();
        return true;
      }
      if (this.fsw.closed)
        return;
      if (dir.has(item)) {
        if (this.fsw._symlinkPaths.get(full) !== linkPath) {
          this.fsw._symlinkPaths.set(full, linkPath);
          this.fsw._emit(EV.CHANGE, path, entry.stats);
        }
      } else {
        dir.add(item);
        this.fsw._symlinkPaths.set(full, linkPath);
        this.fsw._emit(EV.ADD, path, entry.stats);
      }
      this.fsw._emitReady();
      return true;
    }
    if (this.fsw._symlinkPaths.has(full)) {
      return true;
    }
    this.fsw._symlinkPaths.set(full, true);
  }
  _handleRead(directory, initialAdd, wh, target, dir, depth, throttler) {
    directory = sysPath.join(directory, "");
    throttler = this.fsw._throttle("readdir", directory, 1e3);
    if (!throttler)
      return;
    const previous = this.fsw._getWatchedDir(wh.path);
    const current = /* @__PURE__ */ new Set();
    let stream = this.fsw._readdirp(directory, {
      fileFilter: (entry) => wh.filterPath(entry),
      directoryFilter: (entry) => wh.filterDir(entry)
    });
    if (!stream)
      return;
    stream.on(STR_DATA, async (entry) => {
      if (this.fsw.closed) {
        stream = void 0;
        return;
      }
      const item = entry.path;
      let path = sysPath.join(directory, item);
      current.add(item);
      if (entry.stats.isSymbolicLink() && await this._handleSymlink(entry, directory, path, item)) {
        return;
      }
      if (this.fsw.closed) {
        stream = void 0;
        return;
      }
      if (item === target || !target && !previous.has(item)) {
        this.fsw._incrReadyCount();
        path = sysPath.join(dir, sysPath.relative(dir, path));
        this._addToNodeFs(path, initialAdd, wh, depth + 1);
      }
    }).on(EV.ERROR, this._boundHandleError);
    return new Promise((resolve5, reject) => {
      if (!stream)
        return reject();
      stream.once(STR_END, () => {
        if (this.fsw.closed) {
          stream = void 0;
          return;
        }
        const wasThrottled = throttler ? throttler.clear() : false;
        resolve5(void 0);
        previous.getChildren().filter((item) => {
          return item !== directory && !current.has(item);
        }).forEach((item) => {
          this.fsw._remove(directory, item);
        });
        stream = void 0;
        if (wasThrottled)
          this._handleRead(directory, false, wh, target, dir, depth, throttler);
      });
    });
  }
  /**
   * Read directory to add / remove files from `@watched` list and re-read it on change.
   * @param dir fs path
   * @param stats
   * @param initialAdd
   * @param depth relative to user-supplied path
   * @param target child path targeted for watch
   * @param wh Common watch helpers for this path
   * @param realpath
   * @returns closer for the watcher instance.
   */
  async _handleDir(dir, stats, initialAdd, depth, target, wh, realpath2) {
    const parentDir = this.fsw._getWatchedDir(sysPath.dirname(dir));
    const tracked = parentDir.has(sysPath.basename(dir));
    if (!(initialAdd && this.fsw.options.ignoreInitial) && !target && !tracked) {
      this.fsw._emit(EV.ADD_DIR, dir, stats);
    }
    parentDir.add(sysPath.basename(dir));
    this.fsw._getWatchedDir(dir);
    let throttler;
    let closer;
    const oDepth = this.fsw.options.depth;
    if ((oDepth == null || depth <= oDepth) && !this.fsw._symlinkPaths.has(realpath2)) {
      if (!target) {
        await this._handleRead(dir, initialAdd, wh, target, dir, depth, throttler);
        if (this.fsw.closed)
          return;
      }
      closer = this._watchWithNodeFs(dir, (dirPath, stats2) => {
        if (stats2 && stats2.mtimeMs === 0)
          return;
        this._handleRead(dirPath, false, wh, target, dir, depth, throttler);
      });
    }
    return closer;
  }
  /**
   * Handle added file, directory, or glob pattern.
   * Delegates call to _handleFile / _handleDir after checks.
   * @param path to file or ir
   * @param initialAdd was the file added at watch instantiation?
   * @param priorWh depth relative to user-supplied path
   * @param depth Child path actually targeted for watch
   * @param target Child path actually targeted for watch
   */
  async _addToNodeFs(path, initialAdd, priorWh, depth, target) {
    const ready = this.fsw._emitReady;
    if (this.fsw._isIgnored(path) || this.fsw.closed) {
      ready();
      return false;
    }
    const wh = this.fsw._getWatchHelpers(path);
    if (priorWh) {
      wh.filterPath = (entry) => priorWh.filterPath(entry);
      wh.filterDir = (entry) => priorWh.filterDir(entry);
    }
    try {
      const stats = await statMethods[wh.statMethod](wh.watchPath);
      if (this.fsw.closed)
        return;
      if (this.fsw._isIgnored(wh.watchPath, stats)) {
        ready();
        return false;
      }
      const follow = this.fsw.options.followSymlinks;
      let closer;
      if (stats.isDirectory()) {
        const absPath = sysPath.resolve(path);
        const targetPath = follow ? await (0, import_promises2.realpath)(path) : path;
        if (this.fsw.closed)
          return;
        closer = await this._handleDir(wh.watchPath, stats, initialAdd, depth, target, wh, targetPath);
        if (this.fsw.closed)
          return;
        if (absPath !== targetPath && targetPath !== void 0) {
          this.fsw._symlinkPaths.set(absPath, targetPath);
        }
      } else if (stats.isSymbolicLink()) {
        const targetPath = follow ? await (0, import_promises2.realpath)(path) : path;
        if (this.fsw.closed)
          return;
        const parent = sysPath.dirname(wh.watchPath);
        this.fsw._getWatchedDir(parent).add(wh.watchPath);
        this.fsw._emit(EV.ADD, wh.watchPath, stats);
        closer = await this._handleDir(parent, stats, initialAdd, depth, path, wh, targetPath);
        if (this.fsw.closed)
          return;
        if (targetPath !== void 0) {
          this.fsw._symlinkPaths.set(sysPath.resolve(path), targetPath);
        }
      } else {
        closer = this._handleFile(wh.watchPath, stats, initialAdd);
      }
      ready();
      if (closer)
        this.fsw._addPathCloser(path, closer);
      return false;
    } catch (error) {
      if (this.fsw._handleError(error)) {
        ready();
        return path;
      }
    }
  }
};

// ../../node_modules/chokidar/esm/index.js
var SLASH = "/";
var SLASH_SLASH = "//";
var ONE_DOT = ".";
var TWO_DOTS = "..";
var STRING_TYPE = "string";
var BACK_SLASH_RE = /\\/g;
var DOUBLE_SLASH_RE = /\/\//;
var DOT_RE = /\..*\.(sw[px])$|~$|\.subl.*\.tmp/;
var REPLACER_RE = /^\.[/\\]/;
function arrify(item) {
  return Array.isArray(item) ? item : [item];
}
var isMatcherObject = (matcher) => typeof matcher === "object" && matcher !== null && !(matcher instanceof RegExp);
function createPattern(matcher) {
  if (typeof matcher === "function")
    return matcher;
  if (typeof matcher === "string")
    return (string) => matcher === string;
  if (matcher instanceof RegExp)
    return (string) => matcher.test(string);
  if (typeof matcher === "object" && matcher !== null) {
    return (string) => {
      if (matcher.path === string)
        return true;
      if (matcher.recursive) {
        const relative4 = sysPath2.relative(matcher.path, string);
        if (!relative4) {
          return false;
        }
        return !relative4.startsWith("..") && !sysPath2.isAbsolute(relative4);
      }
      return false;
    };
  }
  return () => false;
}
function normalizePath(path) {
  if (typeof path !== "string")
    throw new Error("string expected");
  path = sysPath2.normalize(path);
  path = path.replace(/\\/g, "/");
  let prepend = false;
  if (path.startsWith("//"))
    prepend = true;
  const DOUBLE_SLASH_RE2 = /\/\//;
  while (path.match(DOUBLE_SLASH_RE2))
    path = path.replace(DOUBLE_SLASH_RE2, "/");
  if (prepend)
    path = "/" + path;
  return path;
}
function matchPatterns(patterns, testString, stats) {
  const path = normalizePath(testString);
  for (let index = 0; index < patterns.length; index++) {
    const pattern = patterns[index];
    if (pattern(path, stats)) {
      return true;
    }
  }
  return false;
}
function anymatch(matchers, testString) {
  if (matchers == null) {
    throw new TypeError("anymatch: specify first argument");
  }
  const matchersArray = arrify(matchers);
  const patterns = matchersArray.map((matcher) => createPattern(matcher));
  if (testString == null) {
    return (testString2, stats) => {
      return matchPatterns(patterns, testString2, stats);
    };
  }
  return matchPatterns(patterns, testString);
}
var unifyPaths = (paths_) => {
  const paths = arrify(paths_).flat();
  if (!paths.every((p) => typeof p === STRING_TYPE)) {
    throw new TypeError(`Non-string provided as watch path: ${paths}`);
  }
  return paths.map(normalizePathToUnix);
};
var toUnix = (string) => {
  let str = string.replace(BACK_SLASH_RE, SLASH);
  let prepend = false;
  if (str.startsWith(SLASH_SLASH)) {
    prepend = true;
  }
  while (str.match(DOUBLE_SLASH_RE)) {
    str = str.replace(DOUBLE_SLASH_RE, SLASH);
  }
  if (prepend) {
    str = SLASH + str;
  }
  return str;
};
var normalizePathToUnix = (path) => toUnix(sysPath2.normalize(toUnix(path)));
var normalizeIgnored = (cwd = "") => (path) => {
  if (typeof path === "string") {
    return normalizePathToUnix(sysPath2.isAbsolute(path) ? path : sysPath2.join(cwd, path));
  } else {
    return path;
  }
};
var getAbsolutePath = (path, cwd) => {
  if (sysPath2.isAbsolute(path)) {
    return path;
  }
  return sysPath2.join(cwd, path);
};
var EMPTY_SET = Object.freeze(/* @__PURE__ */ new Set());
var DirEntry = class {
  constructor(dir, removeWatcher) {
    this.path = dir;
    this._removeWatcher = removeWatcher;
    this.items = /* @__PURE__ */ new Set();
  }
  add(item) {
    const { items } = this;
    if (!items)
      return;
    if (item !== ONE_DOT && item !== TWO_DOTS)
      items.add(item);
  }
  async remove(item) {
    const { items } = this;
    if (!items)
      return;
    items.delete(item);
    if (items.size > 0)
      return;
    const dir = this.path;
    try {
      await (0, import_promises3.readdir)(dir);
    } catch (err) {
      if (this._removeWatcher) {
        this._removeWatcher(sysPath2.dirname(dir), sysPath2.basename(dir));
      }
    }
  }
  has(item) {
    const { items } = this;
    if (!items)
      return;
    return items.has(item);
  }
  getChildren() {
    const { items } = this;
    if (!items)
      return [];
    return [...items.values()];
  }
  dispose() {
    this.items.clear();
    this.path = "";
    this._removeWatcher = EMPTY_FN;
    this.items = EMPTY_SET;
    Object.freeze(this);
  }
};
var STAT_METHOD_F = "stat";
var STAT_METHOD_L = "lstat";
var WatchHelper = class {
  constructor(path, follow, fsw) {
    this.fsw = fsw;
    const watchPath = path;
    this.path = path = path.replace(REPLACER_RE, "");
    this.watchPath = watchPath;
    this.fullWatchPath = sysPath2.resolve(watchPath);
    this.dirParts = [];
    this.dirParts.forEach((parts) => {
      if (parts.length > 1)
        parts.pop();
    });
    this.followSymlinks = follow;
    this.statMethod = follow ? STAT_METHOD_F : STAT_METHOD_L;
  }
  entryPath(entry) {
    return sysPath2.join(this.watchPath, sysPath2.relative(this.watchPath, entry.fullPath));
  }
  filterPath(entry) {
    const { stats } = entry;
    if (stats && stats.isSymbolicLink())
      return this.filterDir(entry);
    const resolvedPath = this.entryPath(entry);
    return this.fsw._isntIgnored(resolvedPath, stats) && this.fsw._hasReadPermissions(stats);
  }
  filterDir(entry) {
    return this.fsw._isntIgnored(this.entryPath(entry), entry.stats);
  }
};
var FSWatcher = class extends import_events.EventEmitter {
  // Not indenting methods for history sake; for now.
  constructor(_opts = {}) {
    super();
    this.closed = false;
    this._closers = /* @__PURE__ */ new Map();
    this._ignoredPaths = /* @__PURE__ */ new Set();
    this._throttled = /* @__PURE__ */ new Map();
    this._streams = /* @__PURE__ */ new Set();
    this._symlinkPaths = /* @__PURE__ */ new Map();
    this._watched = /* @__PURE__ */ new Map();
    this._pendingWrites = /* @__PURE__ */ new Map();
    this._pendingUnlinks = /* @__PURE__ */ new Map();
    this._readyCount = 0;
    this._readyEmitted = false;
    const awf = _opts.awaitWriteFinish;
    const DEF_AWF = { stabilityThreshold: 2e3, pollInterval: 100 };
    const opts = {
      // Defaults
      persistent: true,
      ignoreInitial: false,
      ignorePermissionErrors: false,
      interval: 100,
      binaryInterval: 300,
      followSymlinks: true,
      usePolling: false,
      // useAsync: false,
      atomic: true,
      // NOTE: overwritten later (depends on usePolling)
      ..._opts,
      // Change format
      ignored: _opts.ignored ? arrify(_opts.ignored) : arrify([]),
      awaitWriteFinish: awf === true ? DEF_AWF : typeof awf === "object" ? { ...DEF_AWF, ...awf } : false
    };
    if (isIBMi)
      opts.usePolling = true;
    if (opts.atomic === void 0)
      opts.atomic = !opts.usePolling;
    const envPoll = process.env.CHOKIDAR_USEPOLLING;
    if (envPoll !== void 0) {
      const envLower = envPoll.toLowerCase();
      if (envLower === "false" || envLower === "0")
        opts.usePolling = false;
      else if (envLower === "true" || envLower === "1")
        opts.usePolling = true;
      else
        opts.usePolling = !!envLower;
    }
    const envInterval = process.env.CHOKIDAR_INTERVAL;
    if (envInterval)
      opts.interval = Number.parseInt(envInterval, 10);
    let readyCalls = 0;
    this._emitReady = () => {
      readyCalls++;
      if (readyCalls >= this._readyCount) {
        this._emitReady = EMPTY_FN;
        this._readyEmitted = true;
        process.nextTick(() => this.emit(EVENTS.READY));
      }
    };
    this._emitRaw = (...args) => this.emit(EVENTS.RAW, ...args);
    this._boundRemove = this._remove.bind(this);
    this.options = opts;
    this._nodeFsHandler = new NodeFsHandler(this);
    Object.freeze(opts);
  }
  _addIgnoredPath(matcher) {
    if (isMatcherObject(matcher)) {
      for (const ignored of this._ignoredPaths) {
        if (isMatcherObject(ignored) && ignored.path === matcher.path && ignored.recursive === matcher.recursive) {
          return;
        }
      }
    }
    this._ignoredPaths.add(matcher);
  }
  _removeIgnoredPath(matcher) {
    this._ignoredPaths.delete(matcher);
    if (typeof matcher === "string") {
      for (const ignored of this._ignoredPaths) {
        if (isMatcherObject(ignored) && ignored.path === matcher) {
          this._ignoredPaths.delete(ignored);
        }
      }
    }
  }
  // Public methods
  /**
   * Adds paths to be watched on an existing FSWatcher instance.
   * @param paths_ file or file list. Other arguments are unused
   */
  add(paths_, _origAdd, _internal) {
    const { cwd } = this.options;
    this.closed = false;
    this._closePromise = void 0;
    let paths = unifyPaths(paths_);
    if (cwd) {
      paths = paths.map((path) => {
        const absPath = getAbsolutePath(path, cwd);
        return absPath;
      });
    }
    paths.forEach((path) => {
      this._removeIgnoredPath(path);
    });
    this._userIgnored = void 0;
    if (!this._readyCount)
      this._readyCount = 0;
    this._readyCount += paths.length;
    Promise.all(paths.map(async (path) => {
      const res = await this._nodeFsHandler._addToNodeFs(path, !_internal, void 0, 0, _origAdd);
      if (res)
        this._emitReady();
      return res;
    })).then((results) => {
      if (this.closed)
        return;
      results.forEach((item) => {
        if (item)
          this.add(sysPath2.dirname(item), sysPath2.basename(_origAdd || item));
      });
    });
    return this;
  }
  /**
   * Close watchers or start ignoring events from specified paths.
   */
  unwatch(paths_) {
    if (this.closed)
      return this;
    const paths = unifyPaths(paths_);
    const { cwd } = this.options;
    paths.forEach((path) => {
      if (!sysPath2.isAbsolute(path) && !this._closers.has(path)) {
        if (cwd)
          path = sysPath2.join(cwd, path);
        path = sysPath2.resolve(path);
      }
      this._closePath(path);
      this._addIgnoredPath(path);
      if (this._watched.has(path)) {
        this._addIgnoredPath({
          path,
          recursive: true
        });
      }
      this._userIgnored = void 0;
    });
    return this;
  }
  /**
   * Close watchers and remove all listeners from watched paths.
   */
  close() {
    if (this._closePromise) {
      return this._closePromise;
    }
    this.closed = true;
    this.removeAllListeners();
    const closers = [];
    this._closers.forEach((closerList) => closerList.forEach((closer) => {
      const promise = closer();
      if (promise instanceof Promise)
        closers.push(promise);
    }));
    this._streams.forEach((stream) => stream.destroy());
    this._userIgnored = void 0;
    this._readyCount = 0;
    this._readyEmitted = false;
    this._watched.forEach((dirent) => dirent.dispose());
    this._closers.clear();
    this._watched.clear();
    this._streams.clear();
    this._symlinkPaths.clear();
    this._throttled.clear();
    this._closePromise = closers.length ? Promise.all(closers).then(() => void 0) : Promise.resolve();
    return this._closePromise;
  }
  /**
   * Expose list of watched paths
   * @returns for chaining
   */
  getWatched() {
    const watchList = {};
    this._watched.forEach((entry, dir) => {
      const key = this.options.cwd ? sysPath2.relative(this.options.cwd, dir) : dir;
      const index = key || ONE_DOT;
      watchList[index] = entry.getChildren().sort();
    });
    return watchList;
  }
  emitWithAll(event, args) {
    this.emit(event, ...args);
    if (event !== EVENTS.ERROR)
      this.emit(EVENTS.ALL, event, ...args);
  }
  // Common helpers
  // --------------
  /**
   * Normalize and emit events.
   * Calling _emit DOES NOT MEAN emit() would be called!
   * @param event Type of event
   * @param path File or directory path
   * @param stats arguments to be passed with event
   * @returns the error if defined, otherwise the value of the FSWatcher instance's `closed` flag
   */
  async _emit(event, path, stats) {
    if (this.closed)
      return;
    const opts = this.options;
    if (isWindows)
      path = sysPath2.normalize(path);
    if (opts.cwd)
      path = sysPath2.relative(opts.cwd, path);
    const args = [path];
    if (stats != null)
      args.push(stats);
    const awf = opts.awaitWriteFinish;
    let pw;
    if (awf && (pw = this._pendingWrites.get(path))) {
      pw.lastChange = /* @__PURE__ */ new Date();
      return this;
    }
    if (opts.atomic) {
      if (event === EVENTS.UNLINK) {
        this._pendingUnlinks.set(path, [event, ...args]);
        setTimeout(() => {
          this._pendingUnlinks.forEach((entry, path2) => {
            this.emit(...entry);
            this.emit(EVENTS.ALL, ...entry);
            this._pendingUnlinks.delete(path2);
          });
        }, typeof opts.atomic === "number" ? opts.atomic : 100);
        return this;
      }
      if (event === EVENTS.ADD && this._pendingUnlinks.has(path)) {
        event = EVENTS.CHANGE;
        this._pendingUnlinks.delete(path);
      }
    }
    if (awf && (event === EVENTS.ADD || event === EVENTS.CHANGE) && this._readyEmitted) {
      const awfEmit = (err, stats2) => {
        if (err) {
          event = EVENTS.ERROR;
          args[0] = err;
          this.emitWithAll(event, args);
        } else if (stats2) {
          if (args.length > 1) {
            args[1] = stats2;
          } else {
            args.push(stats2);
          }
          this.emitWithAll(event, args);
        }
      };
      this._awaitWriteFinish(path, awf.stabilityThreshold, event, awfEmit);
      return this;
    }
    if (event === EVENTS.CHANGE) {
      const isThrottled = !this._throttle(EVENTS.CHANGE, path, 50);
      if (isThrottled)
        return this;
    }
    if (opts.alwaysStat && stats === void 0 && (event === EVENTS.ADD || event === EVENTS.ADD_DIR || event === EVENTS.CHANGE)) {
      const fullPath = opts.cwd ? sysPath2.join(opts.cwd, path) : path;
      let stats2;
      try {
        stats2 = await (0, import_promises3.stat)(fullPath);
      } catch (err) {
      }
      if (!stats2 || this.closed)
        return;
      args.push(stats2);
    }
    this.emitWithAll(event, args);
    return this;
  }
  /**
   * Common handler for errors
   * @returns The error if defined, otherwise the value of the FSWatcher instance's `closed` flag
   */
  _handleError(error) {
    const code = error && error.code;
    if (error && code !== "ENOENT" && code !== "ENOTDIR" && (!this.options.ignorePermissionErrors || code !== "EPERM" && code !== "EACCES")) {
      this.emit(EVENTS.ERROR, error);
    }
    return error || this.closed;
  }
  /**
   * Helper utility for throttling
   * @param actionType type being throttled
   * @param path being acted upon
   * @param timeout duration of time to suppress duplicate actions
   * @returns tracking object or false if action should be suppressed
   */
  _throttle(actionType, path, timeout) {
    if (!this._throttled.has(actionType)) {
      this._throttled.set(actionType, /* @__PURE__ */ new Map());
    }
    const action = this._throttled.get(actionType);
    if (!action)
      throw new Error("invalid throttle");
    const actionPath = action.get(path);
    if (actionPath) {
      actionPath.count++;
      return false;
    }
    let timeoutObject;
    const clear = () => {
      const item = action.get(path);
      const count = item ? item.count : 0;
      action.delete(path);
      clearTimeout(timeoutObject);
      if (item)
        clearTimeout(item.timeoutObject);
      return count;
    };
    timeoutObject = setTimeout(clear, timeout);
    const thr = { timeoutObject, clear, count: 0 };
    action.set(path, thr);
    return thr;
  }
  _incrReadyCount() {
    return this._readyCount++;
  }
  /**
   * Awaits write operation to finish.
   * Polls a newly created file for size variations. When files size does not change for 'threshold' milliseconds calls callback.
   * @param path being acted upon
   * @param threshold Time in milliseconds a file size must be fixed before acknowledging write OP is finished
   * @param event
   * @param awfEmit Callback to be called when ready for event to be emitted.
   */
  _awaitWriteFinish(path, threshold, event, awfEmit) {
    const awf = this.options.awaitWriteFinish;
    if (typeof awf !== "object")
      return;
    const pollInterval = awf.pollInterval;
    let timeoutHandler;
    let fullPath = path;
    if (this.options.cwd && !sysPath2.isAbsolute(path)) {
      fullPath = sysPath2.join(this.options.cwd, path);
    }
    const now = /* @__PURE__ */ new Date();
    const writes = this._pendingWrites;
    function awaitWriteFinishFn(prevStat) {
      (0, import_fs2.stat)(fullPath, (err, curStat) => {
        if (err || !writes.has(path)) {
          if (err && err.code !== "ENOENT")
            awfEmit(err);
          return;
        }
        const now2 = Number(/* @__PURE__ */ new Date());
        if (prevStat && curStat.size !== prevStat.size) {
          writes.get(path).lastChange = now2;
        }
        const pw = writes.get(path);
        const df = now2 - pw.lastChange;
        if (df >= threshold) {
          writes.delete(path);
          awfEmit(void 0, curStat);
        } else {
          timeoutHandler = setTimeout(awaitWriteFinishFn, pollInterval, curStat);
        }
      });
    }
    if (!writes.has(path)) {
      writes.set(path, {
        lastChange: now,
        cancelWait: () => {
          writes.delete(path);
          clearTimeout(timeoutHandler);
          return event;
        }
      });
      timeoutHandler = setTimeout(awaitWriteFinishFn, pollInterval);
    }
  }
  /**
   * Determines whether user has asked to ignore this path.
   */
  _isIgnored(path, stats) {
    if (this.options.atomic && DOT_RE.test(path))
      return true;
    if (!this._userIgnored) {
      const { cwd } = this.options;
      const ign = this.options.ignored;
      const ignored = (ign || []).map(normalizeIgnored(cwd));
      const ignoredPaths = [...this._ignoredPaths];
      const list = [...ignoredPaths.map(normalizeIgnored(cwd)), ...ignored];
      this._userIgnored = anymatch(list, void 0);
    }
    return this._userIgnored(path, stats);
  }
  _isntIgnored(path, stat4) {
    return !this._isIgnored(path, stat4);
  }
  /**
   * Provides a set of common helpers and properties relating to symlink handling.
   * @param path file or directory pattern being watched
   */
  _getWatchHelpers(path) {
    return new WatchHelper(path, this.options.followSymlinks, this);
  }
  // Directory helpers
  // -----------------
  /**
   * Provides directory tracking objects
   * @param directory path of the directory
   */
  _getWatchedDir(directory) {
    const dir = sysPath2.resolve(directory);
    if (!this._watched.has(dir))
      this._watched.set(dir, new DirEntry(dir, this._boundRemove));
    return this._watched.get(dir);
  }
  // File helpers
  // ------------
  /**
   * Check for read permissions: https://stackoverflow.com/a/11781404/1358405
   */
  _hasReadPermissions(stats) {
    if (this.options.ignorePermissionErrors)
      return true;
    return Boolean(Number(stats.mode) & 256);
  }
  /**
   * Handles emitting unlink events for
   * files and directories, and via recursion, for
   * files and directories within directories that are unlinked
   * @param directory within which the following item is located
   * @param item      base path of item/directory
   */
  _remove(directory, item, isDirectory) {
    const path = sysPath2.join(directory, item);
    const fullPath = sysPath2.resolve(path);
    isDirectory = isDirectory != null ? isDirectory : this._watched.has(path) || this._watched.has(fullPath);
    if (!this._throttle("remove", path, 100))
      return;
    if (!isDirectory && this._watched.size === 1) {
      this.add(directory, item, true);
    }
    const wp = this._getWatchedDir(path);
    const nestedDirectoryChildren = wp.getChildren();
    nestedDirectoryChildren.forEach((nested) => this._remove(path, nested));
    const parent = this._getWatchedDir(directory);
    const wasTracked = parent.has(item);
    parent.remove(item);
    if (this._symlinkPaths.has(fullPath)) {
      this._symlinkPaths.delete(fullPath);
    }
    let relPath = path;
    if (this.options.cwd)
      relPath = sysPath2.relative(this.options.cwd, path);
    if (this.options.awaitWriteFinish && this._pendingWrites.has(relPath)) {
      const event = this._pendingWrites.get(relPath).cancelWait();
      if (event === EVENTS.ADD)
        return;
    }
    this._watched.delete(path);
    this._watched.delete(fullPath);
    const eventName = isDirectory ? EVENTS.UNLINK_DIR : EVENTS.UNLINK;
    if (wasTracked && !this._isIgnored(path))
      this._emit(eventName, path);
    this._closePath(path);
  }
  /**
   * Closes all watchers for a path
   */
  _closePath(path) {
    this._closeFile(path);
    const dir = sysPath2.dirname(path);
    this._getWatchedDir(dir).remove(sysPath2.basename(path));
  }
  /**
   * Closes only file-specific watchers
   */
  _closeFile(path) {
    const closers = this._closers.get(path);
    if (!closers)
      return;
    closers.forEach((closer) => closer());
    this._closers.delete(path);
  }
  _addPathCloser(path, closer) {
    if (!closer)
      return;
    let list = this._closers.get(path);
    if (!list) {
      list = [];
      this._closers.set(path, list);
    }
    list.push(closer);
  }
  _readdirp(root, opts) {
    if (this.closed)
      return;
    const options = { type: EVENTS.ALL, alwaysStat: true, lstat: true, ...opts, depth: 0 };
    let stream = readdirp(root, options);
    this._streams.add(stream);
    stream.once(STR_CLOSE, () => {
      stream = void 0;
    });
    stream.once(STR_END, () => {
      if (stream) {
        this._streams.delete(stream);
        stream = void 0;
      }
    });
    return stream;
  }
};
function watch(paths, options = {}) {
  const watcher = new FSWatcher(options);
  watcher.add(paths);
  return watcher;
}
var esm_default = { watch, FSWatcher };

// src/tweak-discovery.ts
var import_node_fs = require("node:fs");
var import_node_path2 = require("node:path");
var ENTRY_CANDIDATES = ["index.js", "index.cjs", "index.mjs"];
function discoverTweaks(tweaksDir) {
  if (!(0, import_node_fs.existsSync)(tweaksDir)) return [];
  const out = [];
  for (const name of (0, import_node_fs.readdirSync)(tweaksDir)) {
    const dir = (0, import_node_path2.join)(tweaksDir, name);
    if (!(0, import_node_fs.statSync)(dir).isDirectory()) continue;
    const manifestPath = (0, import_node_path2.join)(dir, "manifest.json");
    if (!(0, import_node_fs.existsSync)(manifestPath)) continue;
    let manifest;
    try {
      manifest = JSON.parse((0, import_node_fs.readFileSync)(manifestPath, "utf8"));
    } catch {
      continue;
    }
    if (!isValidManifest(manifest)) continue;
    const entry = resolveEntry(dir, manifest);
    if (!entry) continue;
    out.push({ dir, entry, manifest });
  }
  return out;
}
function isValidManifest(m) {
  if (!m.id || !m.name || !m.version || !m.githubRepo) return false;
  if (!/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(m.githubRepo)) return false;
  if (m.scope && !["renderer", "main", "both"].includes(m.scope)) return false;
  return true;
}
function resolveEntry(dir, m) {
  if (m.main) {
    const p = (0, import_node_path2.join)(dir, m.main);
    return (0, import_node_fs.existsSync)(p) ? p : null;
  }
  for (const c of ENTRY_CANDIDATES) {
    const p = (0, import_node_path2.join)(dir, c);
    if ((0, import_node_fs.existsSync)(p)) return p;
  }
  return null;
}

// src/storage.ts
var import_node_fs2 = require("node:fs");
var import_node_path3 = require("node:path");
var FLUSH_DELAY_MS = 50;
function createDiskStorage(rootDir, id) {
  const dir = (0, import_node_path3.join)(rootDir, "storage");
  (0, import_node_fs2.mkdirSync)(dir, { recursive: true });
  const file = (0, import_node_path3.join)(dir, `${sanitize(id)}.json`);
  let data = {};
  if ((0, import_node_fs2.existsSync)(file)) {
    try {
      data = JSON.parse((0, import_node_fs2.readFileSync)(file, "utf8"));
    } catch {
      try {
        (0, import_node_fs2.renameSync)(file, `${file}.corrupt-${Date.now()}`);
      } catch {
      }
      data = {};
    }
  }
  let dirty = false;
  let timer = null;
  const scheduleFlush = () => {
    dirty = true;
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      if (dirty) flush();
    }, FLUSH_DELAY_MS);
  };
  const flush = () => {
    if (!dirty) return;
    const tmp = `${file}.tmp`;
    try {
      (0, import_node_fs2.writeFileSync)(tmp, JSON.stringify(data, null, 2), "utf8");
      (0, import_node_fs2.renameSync)(tmp, file);
      dirty = false;
    } catch (e) {
      console.error("[codex-plusplus] storage flush failed:", id, e);
    }
  };
  return {
    get: (k, d) => Object.prototype.hasOwnProperty.call(data, k) ? data[k] : d,
    set(k, v) {
      data[k] = v;
      scheduleFlush();
    },
    delete(k) {
      if (k in data) {
        delete data[k];
        scheduleFlush();
      }
    },
    all: () => ({ ...data }),
    flush
  };
}
function sanitize(id) {
  return id.replace(/[^a-zA-Z0-9._@-]/g, "_");
}

// src/mcp-sync.ts
var import_node_fs3 = require("node:fs");
var import_node_path4 = require("node:path");
var MCP_MANAGED_START = "# BEGIN CODEX++ MANAGED MCP SERVERS";
var MCP_MANAGED_END = "# END CODEX++ MANAGED MCP SERVERS";
function syncManagedMcpServers({
  configPath,
  tweaks
}) {
  const current = (0, import_node_fs3.existsSync)(configPath) ? (0, import_node_fs3.readFileSync)(configPath, "utf8") : "";
  const built = buildManagedMcpBlock(tweaks, current);
  const next = mergeManagedMcpBlock(current, built.block);
  if (next !== current) {
    (0, import_node_fs3.mkdirSync)((0, import_node_path4.dirname)(configPath), { recursive: true });
    (0, import_node_fs3.writeFileSync)(configPath, next, "utf8");
  }
  return { ...built, changed: next !== current };
}
function buildManagedMcpBlock(tweaks, existingToml = "") {
  const manualToml = stripManagedMcpBlock(existingToml);
  const manualNames = findMcpServerNames(manualToml);
  const usedNames = new Set(manualNames);
  const serverNames = [];
  const skippedServerNames = [];
  const entries = [];
  for (const tweak of tweaks) {
    const mcp = normalizeMcpServer(tweak.manifest.mcp);
    if (!mcp) continue;
    const baseName = mcpServerNameFromTweakId(tweak.manifest.id);
    if (manualNames.has(baseName)) {
      skippedServerNames.push(baseName);
      continue;
    }
    const serverName = reserveUniqueName(baseName, usedNames);
    serverNames.push(serverName);
    entries.push(formatMcpServer(serverName, tweak.dir, mcp));
  }
  if (entries.length === 0) {
    return { block: "", serverNames, skippedServerNames };
  }
  return {
    block: [MCP_MANAGED_START, ...entries, MCP_MANAGED_END].join("\n"),
    serverNames,
    skippedServerNames
  };
}
function mergeManagedMcpBlock(currentToml, managedBlock) {
  if (!managedBlock && !currentToml.includes(MCP_MANAGED_START)) return currentToml;
  const stripped = stripManagedMcpBlock(currentToml).trimEnd();
  if (!managedBlock) return stripped ? `${stripped}
` : "";
  return `${stripped ? `${stripped}

` : ""}${managedBlock}
`;
}
function stripManagedMcpBlock(toml) {
  const pattern = new RegExp(
    `\\n?${escapeRegExp(MCP_MANAGED_START)}[\\s\\S]*?${escapeRegExp(MCP_MANAGED_END)}\\n?`,
    "g"
  );
  return toml.replace(pattern, "\n").replace(/\n{3,}/g, "\n\n");
}
function mcpServerNameFromTweakId(id) {
  const withoutPublisher = id.replace(/^co\.bennett\./, "");
  const slug = withoutPublisher.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return slug || "tweak-mcp";
}
function findMcpServerNames(toml) {
  const names = /* @__PURE__ */ new Set();
  const tablePattern = /^\s*\[mcp_servers\.([^\]\s]+)\]\s*$/gm;
  let match;
  while ((match = tablePattern.exec(toml)) !== null) {
    names.add(unquoteTomlKey(match[1] ?? ""));
  }
  return names;
}
function reserveUniqueName(baseName, usedNames) {
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName);
    return baseName;
  }
  for (let i = 2; ; i += 1) {
    const candidate = `${baseName}-${i}`;
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      return candidate;
    }
  }
}
function normalizeMcpServer(value) {
  if (!value || typeof value.command !== "string" || value.command.length === 0) return null;
  if (value.args !== void 0 && !Array.isArray(value.args)) return null;
  if (value.args?.some((arg) => typeof arg !== "string")) return null;
  if (value.env !== void 0) {
    if (!value.env || typeof value.env !== "object" || Array.isArray(value.env)) return null;
    if (Object.values(value.env).some((envValue) => typeof envValue !== "string")) return null;
  }
  return value;
}
function formatMcpServer(serverName, tweakDir, mcp) {
  const lines = [
    `[mcp_servers.${formatTomlKey(serverName)}]`,
    `command = ${formatTomlString(resolveCommand(tweakDir, mcp.command))}`
  ];
  if (mcp.args && mcp.args.length > 0) {
    lines.push(`args = ${formatTomlStringArray(mcp.args.map((arg) => resolveArg(tweakDir, arg)))}`);
  }
  if (mcp.env && Object.keys(mcp.env).length > 0) {
    lines.push(`env = ${formatTomlInlineTable(mcp.env)}`);
  }
  return lines.join("\n");
}
function resolveCommand(tweakDir, command) {
  if ((0, import_node_path4.isAbsolute)(command) || !looksLikeRelativePath(command)) return command;
  return (0, import_node_path4.resolve)(tweakDir, command);
}
function resolveArg(tweakDir, arg) {
  if ((0, import_node_path4.isAbsolute)(arg) || arg.startsWith("-")) return arg;
  const candidate = (0, import_node_path4.resolve)(tweakDir, arg);
  return (0, import_node_fs3.existsSync)(candidate) ? candidate : arg;
}
function looksLikeRelativePath(value) {
  return value.startsWith("./") || value.startsWith("../") || value.includes("/");
}
function formatTomlString(value) {
  return JSON.stringify(value);
}
function formatTomlStringArray(values) {
  return `[${values.map(formatTomlString).join(", ")}]`;
}
function formatTomlInlineTable(record) {
  return `{ ${Object.entries(record).map(([key, value]) => `${formatTomlKey(key)} = ${formatTomlString(value)}`).join(", ")} }`;
}
function formatTomlKey(key) {
  return /^[a-zA-Z0-9_-]+$/.test(key) ? key : formatTomlString(key);
}
function unquoteTomlKey(key) {
  if (!key.startsWith('"') || !key.endsWith('"')) return key;
  try {
    return JSON.parse(key);
  } catch {
    return key;
  }
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// src/watcher-health.ts
var import_node_child_process = require("node:child_process");
var import_node_fs4 = require("node:fs");
var import_node_os = require("node:os");
var import_node_path5 = require("node:path");
var LAUNCHD_LABEL = "com.codexplusplus.watcher";
var WATCHER_LOG = (0, import_node_path5.join)((0, import_node_os.homedir)(), "Library", "Logs", "codex-plusplus-watcher.log");
function getWatcherHealth(userRoot2) {
  const checks = [];
  const state = readJson((0, import_node_path5.join)(userRoot2, "state.json"));
  const config = readJson((0, import_node_path5.join)(userRoot2, "config.json")) ?? {};
  const selfUpdate = readJson((0, import_node_path5.join)(userRoot2, "self-update-state.json"));
  checks.push({
    name: "Install state",
    status: state ? "ok" : "error",
    detail: state ? `Codex++ ${state.version ?? "(unknown version)"}` : "state.json is missing"
  });
  if (!state) return summarize("none", checks);
  const autoUpdate = config.codexPlusPlus?.autoUpdate !== false;
  checks.push({
    name: "Automatic refresh",
    status: autoUpdate ? "ok" : "warn",
    detail: autoUpdate ? "enabled" : "disabled in Codex++ config"
  });
  checks.push({
    name: "Watcher kind",
    status: state.watcher && state.watcher !== "none" ? "ok" : "error",
    detail: state.watcher ?? "none"
  });
  if (selfUpdate) {
    checks.push(selfUpdateCheck(selfUpdate));
  }
  const appRoot = state.appRoot ?? "";
  checks.push({
    name: "Codex app",
    status: appRoot && (0, import_node_fs4.existsSync)(appRoot) ? "ok" : "error",
    detail: appRoot || "missing appRoot in state"
  });
  switch ((0, import_node_os.platform)()) {
    case "darwin":
      checks.push(...checkLaunchdWatcher(appRoot));
      break;
    case "linux":
      checks.push(...checkSystemdWatcher(appRoot));
      break;
    case "win32":
      checks.push(...checkScheduledTaskWatcher());
      break;
    default:
      checks.push({
        name: "Platform watcher",
        status: "warn",
        detail: `unsupported platform: ${(0, import_node_os.platform)()}`
      });
  }
  return summarize(state.watcher ?? "none", checks);
}
function selfUpdateCheck(state) {
  const at = state.completedAt ?? state.checkedAt ?? "unknown time";
  if (state.status === "failed") {
    return {
      name: "last Codex++ update",
      status: "warn",
      detail: state.error ? `failed ${at}: ${state.error}` : `failed ${at}`
    };
  }
  if (state.status === "disabled") {
    return { name: "last Codex++ update", status: "warn", detail: `skipped ${at}: automatic refresh disabled` };
  }
  if (state.status === "updated") {
    return { name: "last Codex++ update", status: "ok", detail: `updated ${at} to ${state.latestVersion ?? "new release"}` };
  }
  if (state.status === "up-to-date") {
    return { name: "last Codex++ update", status: "ok", detail: `up to date ${at}` };
  }
  return { name: "last Codex++ update", status: "warn", detail: `checking since ${at}` };
}
function checkLaunchdWatcher(appRoot) {
  const checks = [];
  const plistPath = (0, import_node_path5.join)((0, import_node_os.homedir)(), "Library", "LaunchAgents", `${LAUNCHD_LABEL}.plist`);
  const plist = (0, import_node_fs4.existsSync)(plistPath) ? readFileSafe(plistPath) : "";
  const asarPath = appRoot ? (0, import_node_path5.join)(appRoot, "Contents", "Resources", "app.asar") : "";
  checks.push({
    name: "launchd plist",
    status: plist ? "ok" : "error",
    detail: plistPath
  });
  if (plist) {
    checks.push({
      name: "launchd label",
      status: plist.includes(LAUNCHD_LABEL) ? "ok" : "error",
      detail: LAUNCHD_LABEL
    });
    checks.push({
      name: "launchd trigger",
      status: asarPath && plist.includes(asarPath) ? "ok" : "error",
      detail: asarPath || "missing appRoot"
    });
    checks.push({
      name: "watcher command",
      status: plist.includes("CODEX_PLUSPLUS_WATCHER=1") && plist.includes(" update --watcher --quiet") ? "ok" : "error",
      detail: commandSummary(plist)
    });
    const cliPath = extractFirst(plist, /'([^']*packages\/installer\/dist\/cli\.js)'/);
    if (cliPath) {
      checks.push({
        name: "repair CLI",
        status: (0, import_node_fs4.existsSync)(cliPath) ? "ok" : "error",
        detail: cliPath
      });
    }
  }
  const loaded = commandSucceeds("launchctl", ["list", LAUNCHD_LABEL]);
  checks.push({
    name: "launchd loaded",
    status: loaded ? "ok" : "error",
    detail: loaded ? "service is loaded" : "launchctl cannot find the watcher"
  });
  checks.push(watcherLogCheck());
  return checks;
}
function checkSystemdWatcher(appRoot) {
  const dir = (0, import_node_path5.join)((0, import_node_os.homedir)(), ".config", "systemd", "user");
  const service = (0, import_node_path5.join)(dir, "codex-plusplus-watcher.service");
  const timer = (0, import_node_path5.join)(dir, "codex-plusplus-watcher.timer");
  const pathUnit = (0, import_node_path5.join)(dir, "codex-plusplus-watcher.path");
  const expectedPath = appRoot ? (0, import_node_path5.join)(appRoot, "resources", "app.asar") : "";
  const pathBody = (0, import_node_fs4.existsSync)(pathUnit) ? readFileSafe(pathUnit) : "";
  return [
    {
      name: "systemd service",
      status: (0, import_node_fs4.existsSync)(service) ? "ok" : "error",
      detail: service
    },
    {
      name: "systemd timer",
      status: (0, import_node_fs4.existsSync)(timer) ? "ok" : "error",
      detail: timer
    },
    {
      name: "systemd path",
      status: pathBody && expectedPath && pathBody.includes(expectedPath) ? "ok" : "error",
      detail: expectedPath || pathUnit
    },
    {
      name: "path unit active",
      status: commandSucceeds("systemctl", ["--user", "is-active", "--quiet", "codex-plusplus-watcher.path"]) ? "ok" : "warn",
      detail: "systemctl --user is-active codex-plusplus-watcher.path"
    },
    {
      name: "timer active",
      status: commandSucceeds("systemctl", ["--user", "is-active", "--quiet", "codex-plusplus-watcher.timer"]) ? "ok" : "warn",
      detail: "systemctl --user is-active codex-plusplus-watcher.timer"
    }
  ];
}
function checkScheduledTaskWatcher() {
  return [
    {
      name: "logon task",
      status: commandSucceeds("schtasks.exe", ["/Query", "/TN", "codex-plusplus-watcher"]) ? "ok" : "error",
      detail: "codex-plusplus-watcher"
    },
    {
      name: "hourly task",
      status: commandSucceeds("schtasks.exe", ["/Query", "/TN", "codex-plusplus-watcher-hourly"]) ? "ok" : "warn",
      detail: "codex-plusplus-watcher-hourly"
    }
  ];
}
function watcherLogCheck() {
  if (!(0, import_node_fs4.existsSync)(WATCHER_LOG)) {
    return { name: "watcher log", status: "warn", detail: "no watcher log yet" };
  }
  const tail = readFileSafe(WATCHER_LOG).split(/\r?\n/).slice(-40).join("\n");
  return analyzeWatcherLogTail(tail);
}
function analyzeWatcherLogTail(tail) {
  const hasError = /✗ codex-plusplus failed|codex-plusplus failed|error|failed/i.test(tail);
  const needsManualRepair = hasError && /Cannot write to .*Codex.*\.app|App Management|file ownership|sudo codexplusplus (?:install|repair)|EACCES|EPERM/i.test(tail);
  return {
    name: "watcher log",
    status: hasError ? "warn" : "ok",
    detail: hasError ? needsManualRepair ? "auto-repair needs app permissions; run `codexplusplus repair` from Terminal" : "recent watcher log contains an error" : WATCHER_LOG
  };
}
function summarize(watcher, checks) {
  const hasError = checks.some((c) => c.status === "error");
  const hasWarn = checks.some((c) => c.status === "warn");
  const status = hasError ? "error" : hasWarn ? "warn" : "ok";
  const failed = checks.filter((c) => c.status === "error").length;
  const warned = checks.filter((c) => c.status === "warn").length;
  const title = status === "ok" ? "Auto-repair watcher is ready" : status === "warn" ? "Auto-repair watcher needs review" : "Auto-repair watcher is not ready";
  const summary = status === "ok" ? "Codex++ should automatically repair itself after Codex updates." : `${failed} failing check(s), ${warned} warning(s).`;
  return {
    checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
    status,
    title,
    summary,
    watcher,
    checks
  };
}
function commandSucceeds(command, args) {
  try {
    (0, import_node_child_process.execFileSync)(command, args, { stdio: "ignore", timeout: 5e3 });
    return true;
  } catch {
    return false;
  }
}
function commandSummary(plist) {
  const command = extractFirst(plist, /<string>([^<]*(?:update --watcher --quiet|repair --quiet)[^<]*)<\/string>/);
  return command ? unescapeXml(command).replace(/\s+/g, " ").trim() : "watcher command not found";
}
function extractFirst(source, pattern) {
  return source.match(pattern)?.[1] ?? null;
}
function readJson(path) {
  try {
    return JSON.parse((0, import_node_fs4.readFileSync)(path, "utf8"));
  } catch {
    return null;
  }
}
function readFileSafe(path) {
  try {
    return (0, import_node_fs4.readFileSync)(path, "utf8");
  } catch {
    return "";
  }
}
function unescapeXml(value) {
  return value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

// src/tweak-lifecycle.ts
function isMainProcessTweakScope(scope) {
  return scope !== "renderer";
}
function reloadTweaks(reason, deps) {
  deps.logInfo(`reloading tweaks (${reason})`);
  deps.stopAllMainTweaks();
  deps.clearTweakModuleCache();
  deps.loadAllMainTweaks();
  deps.broadcastReload();
}
function setTweakEnabledAndReload(id, enabled, deps) {
  const normalizedEnabled = !!enabled;
  deps.setTweakEnabled(id, normalizedEnabled);
  deps.logInfo(`tweak ${id} enabled=${normalizedEnabled}`);
  reloadTweaks("enabled-toggle", deps);
  return true;
}

// src/logging.ts
var import_node_fs5 = require("node:fs");
var MAX_LOG_BYTES = 10 * 1024 * 1024;
function appendCappedLog(path, line, maxBytes = MAX_LOG_BYTES) {
  const incoming = Buffer.from(line);
  if (incoming.byteLength >= maxBytes) {
    (0, import_node_fs5.writeFileSync)(path, incoming.subarray(incoming.byteLength - maxBytes));
    return;
  }
  try {
    if ((0, import_node_fs5.existsSync)(path)) {
      const size = (0, import_node_fs5.statSync)(path).size;
      const allowedExisting = maxBytes - incoming.byteLength;
      if (size > allowedExisting) {
        const existing = (0, import_node_fs5.readFileSync)(path);
        (0, import_node_fs5.writeFileSync)(path, existing.subarray(Math.max(0, existing.byteLength - allowedExisting)));
      }
    }
  } catch {
  }
  (0, import_node_fs5.appendFileSync)(path, incoming);
}

// src/tweak-store.ts
var DEFAULT_TWEAK_STORE_INDEX_URL = "https://b-nnett.github.io/codex-plusplus/store/index.json";
var GITHUB_REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
var FULL_SHA_RE = /^[a-f0-9]{40}$/i;
function normalizeGitHubRepo(input) {
  const raw = input.trim();
  if (!raw) throw new Error("GitHub repo is required");
  const ssh = /^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/i.exec(raw);
  if (ssh) return normalizeRepoPart(ssh[1]);
  if (/^https?:\/\//i.test(raw)) {
    const url = new URL(raw);
    if (url.hostname !== "github.com") throw new Error("Only github.com repositories are supported");
    const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
    if (parts.length < 2) throw new Error("GitHub repo URL must include owner and repository");
    return normalizeRepoPart(`${parts[0]}/${parts[1]}`);
  }
  return normalizeRepoPart(raw);
}
function normalizeStoreRegistry(input) {
  const registry = input;
  if (!registry || registry.schemaVersion !== 1 || !Array.isArray(registry.entries)) {
    throw new Error("Unsupported tweak store registry");
  }
  const entries = registry.entries.map(normalizeStoreEntry);
  entries.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
  return {
    schemaVersion: 1,
    generatedAt: typeof registry.generatedAt === "string" ? registry.generatedAt : void 0,
    entries
  };
}
function shuffleStoreEntries(entries, randomIndex = (exclusiveMax) => Math.floor(Math.random() * exclusiveMax)) {
  const shuffled = [...entries];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    if (!Number.isInteger(j) || j < 0 || j > i) {
      throw new Error(`shuffle randomIndex returned ${j}; expected an integer from 0 to ${i}`);
    }
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
function normalizeStoreEntry(input) {
  const entry = input;
  if (!entry || typeof entry !== "object") throw new Error("Invalid tweak store entry");
  const repo = normalizeGitHubRepo(String(entry.repo ?? entry.manifest?.githubRepo ?? ""));
  const manifest = entry.manifest;
  if (!manifest?.id || !manifest.name || !manifest.version) {
    throw new Error(`Store entry for ${repo} is missing manifest fields`);
  }
  if (normalizeGitHubRepo(manifest.githubRepo) !== repo) {
    throw new Error(`Store entry ${manifest.id} repo does not match manifest githubRepo`);
  }
  if (!isFullCommitSha(String(entry.approvedCommitSha ?? ""))) {
    throw new Error(`Store entry ${manifest.id} must pin a full approved commit SHA`);
  }
  return {
    id: manifest.id,
    manifest,
    repo,
    approvedCommitSha: String(entry.approvedCommitSha),
    approvedAt: typeof entry.approvedAt === "string" ? entry.approvedAt : "",
    approvedBy: typeof entry.approvedBy === "string" ? entry.approvedBy : "",
    platforms: normalizeStorePlatforms(entry.platforms),
    releaseUrl: optionalGithubUrl(entry.releaseUrl),
    reviewUrl: optionalGithubUrl(entry.reviewUrl)
  };
}
function storeArchiveUrl(entry) {
  if (!isFullCommitSha(entry.approvedCommitSha)) {
    throw new Error(`Store entry ${entry.id} is not pinned to a full commit SHA`);
  }
  return `https://codeload.github.com/${entry.repo}/tar.gz/${entry.approvedCommitSha}`;
}
function isFullCommitSha(value) {
  return FULL_SHA_RE.test(value);
}
function normalizeRepoPart(value) {
  const repo = value.trim().replace(/\.git$/i, "").replace(/^\/+|\/+$/g, "");
  if (!GITHUB_REPO_RE.test(repo)) throw new Error("GitHub repo must be in owner/repo form");
  return repo;
}
function normalizeStorePlatforms(input) {
  if (input === void 0) return void 0;
  if (!Array.isArray(input)) throw new Error("Store entry platforms must be an array");
  const allowed = /* @__PURE__ */ new Set(["darwin", "win32", "linux"]);
  const platforms = Array.from(new Set(input.map((value) => {
    if (typeof value !== "string" || !allowed.has(value)) {
      throw new Error(`Unsupported store platform: ${String(value)}`);
    }
    return value;
  })));
  return platforms.length > 0 ? platforms : void 0;
}
function optionalGithubUrl(value) {
  if (typeof value !== "string" || !value.trim()) return void 0;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "github.com") return void 0;
  return url.toString();
}

// src/main.ts
var userRoot = process.env.CODEX_PLUSPLUS_USER_ROOT;
var runtimeDir = process.env.CODEX_PLUSPLUS_RUNTIME;
if (!userRoot || !runtimeDir) {
  throw new Error(
    "codex-plusplus runtime started without CODEX_PLUSPLUS_USER_ROOT/RUNTIME envs"
  );
}
var PRELOAD_PATH = (0, import_node_path6.resolve)(runtimeDir, "preload.js");
var TWEAKS_DIR = (0, import_node_path6.join)(userRoot, "tweaks");
var LOG_DIR = (0, import_node_path6.join)(userRoot, "log");
var LOG_FILE = (0, import_node_path6.join)(LOG_DIR, "main.log");
var CONFIG_FILE = (0, import_node_path6.join)(userRoot, "config.json");
var CODEX_CONFIG_FILE = (0, import_node_path6.join)((0, import_node_os2.homedir)(), ".codex", "config.toml");
var INSTALLER_STATE_FILE = (0, import_node_path6.join)(userRoot, "state.json");
var UPDATE_MODE_FILE = (0, import_node_path6.join)(userRoot, "update-mode.json");
var SELF_UPDATE_STATE_FILE = (0, import_node_path6.join)(userRoot, "self-update-state.json");
var SIGNED_CODEX_BACKUP = (0, import_node_path6.join)(userRoot, "backup", "Codex.app");
var CODEX_PLUSPLUS_VERSION = "1.0.0";
var CODEX_PLUSPLUS_REPO = "b-nnett/codex-plusplus";
var TWEAK_STORE_INDEX_URL = process.env.CODEX_PLUSPLUS_STORE_INDEX_URL ?? DEFAULT_TWEAK_STORE_INDEX_URL;
var CODEX_WINDOW_SERVICES_KEY = "__codexpp_window_services__";
(0, import_node_fs6.mkdirSync)(LOG_DIR, { recursive: true });
(0, import_node_fs6.mkdirSync)(TWEAKS_DIR, { recursive: true });
if (process.env.CODEXPP_REMOTE_DEBUG === "1") {
  const port = process.env.CODEXPP_REMOTE_DEBUG_PORT ?? "9222";
  import_electron.app.commandLine.appendSwitch("remote-debugging-port", port);
  log("info", `remote debugging enabled on port ${port}`);
}
function readState() {
  try {
    return JSON.parse((0, import_node_fs6.readFileSync)(CONFIG_FILE, "utf8"));
  } catch {
    return {};
  }
}
function writeState(s) {
  try {
    (0, import_node_fs6.writeFileSync)(CONFIG_FILE, JSON.stringify(s, null, 2));
  } catch (e) {
    log("warn", "writeState failed:", String(e.message));
  }
}
function isCodexPlusPlusAutoUpdateEnabled() {
  return readState().codexPlusPlus?.autoUpdate !== false;
}
function setCodexPlusPlusAutoUpdate(enabled) {
  const s = readState();
  s.codexPlusPlus ??= {};
  s.codexPlusPlus.autoUpdate = enabled;
  writeState(s);
}
function setCodexPlusPlusUpdateConfig(config) {
  const s = readState();
  s.codexPlusPlus ??= {};
  if (config.updateChannel) s.codexPlusPlus.updateChannel = config.updateChannel;
  if ("updateRepo" in config) s.codexPlusPlus.updateRepo = cleanOptionalString(config.updateRepo);
  if ("updateRef" in config) s.codexPlusPlus.updateRef = cleanOptionalString(config.updateRef);
  writeState(s);
}
function isCodexPlusPlusSafeModeEnabled() {
  return readState().codexPlusPlus?.safeMode === true;
}
function isTweakEnabled(id) {
  const s = readState();
  if (s.codexPlusPlus?.safeMode === true) return false;
  return s.tweaks?.[id]?.enabled !== false;
}
function setTweakEnabled(id, enabled) {
  const s = readState();
  s.tweaks ??= {};
  s.tweaks[id] = { ...s.tweaks[id], enabled };
  writeState(s);
}
function readInstallerState() {
  try {
    return JSON.parse((0, import_node_fs6.readFileSync)(INSTALLER_STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}
function readSelfUpdateState() {
  try {
    return JSON.parse((0, import_node_fs6.readFileSync)(SELF_UPDATE_STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}
function writeSelfUpdateState(state) {
  try {
    (0, import_node_fs6.writeFileSync)(SELF_UPDATE_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    log("warn", "writeSelfUpdateState failed:", String(e.message));
  }
}
function cleanOptionalString(value) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  return trimmed ? trimmed : void 0;
}
function isPathInside(parent, target) {
  const rel = (0, import_node_path6.relative)((0, import_node_path6.resolve)(parent), (0, import_node_path6.resolve)(target));
  return rel === "" || !!rel && !rel.startsWith("..") && !(0, import_node_path6.isAbsolute)(rel);
}
function log(level, ...args) {
  const line = `[${(/* @__PURE__ */ new Date()).toISOString()}] [${level}] ${args.map((a) => typeof a === "string" ? a : JSON.stringify(a)).join(" ")}
`;
  try {
    appendCappedLog(LOG_FILE, line);
  } catch {
  }
  if (level === "error") console.error("[codex-plusplus]", ...args);
}
function installSparkleUpdateHook() {
  if (process.platform !== "darwin") return;
  const Module = require("node:module");
  const originalLoad = Module._load;
  if (typeof originalLoad !== "function") return;
  Module._load = function codexPlusPlusModuleLoad(request, parent, isMain) {
    const loaded = originalLoad.apply(this, [request, parent, isMain]);
    if (typeof request === "string" && /sparkle(?:\.node)?$/i.test(request)) {
      wrapSparkleExports(loaded);
    }
    return loaded;
  };
}
function wrapSparkleExports(loaded) {
  if (!loaded || typeof loaded !== "object") return;
  const exports2 = loaded;
  if (exports2.__codexppSparkleWrapped) return;
  exports2.__codexppSparkleWrapped = true;
  for (const name of ["installUpdatesIfAvailable"]) {
    const fn = exports2[name];
    if (typeof fn !== "function") continue;
    exports2[name] = function codexPlusPlusSparkleWrapper(...args) {
      prepareSignedCodexForSparkleInstall();
      return Reflect.apply(fn, this, args);
    };
  }
  if (exports2.default && exports2.default !== exports2) {
    wrapSparkleExports(exports2.default);
  }
}
function prepareSignedCodexForSparkleInstall() {
  if (process.platform !== "darwin") return;
  if ((0, import_node_fs6.existsSync)(UPDATE_MODE_FILE)) {
    log("info", "Sparkle update prep skipped; update mode already active");
    return;
  }
  if (!(0, import_node_fs6.existsSync)(SIGNED_CODEX_BACKUP)) {
    log("warn", "Sparkle update prep skipped; signed Codex.app backup is missing");
    return;
  }
  if (!isDeveloperIdSignedApp(SIGNED_CODEX_BACKUP)) {
    log("warn", "Sparkle update prep skipped; Codex.app backup is not Developer ID signed");
    return;
  }
  const state = readInstallerState();
  const appRoot = state?.appRoot ?? inferMacAppRoot();
  if (!appRoot) {
    log("warn", "Sparkle update prep skipped; could not infer Codex.app path");
    return;
  }
  const mode = {
    enabledAt: (/* @__PURE__ */ new Date()).toISOString(),
    appRoot,
    codexVersion: state?.codexVersion ?? null
  };
  (0, import_node_fs6.writeFileSync)(UPDATE_MODE_FILE, JSON.stringify(mode, null, 2));
  try {
    (0, import_node_child_process2.execFileSync)("ditto", [SIGNED_CODEX_BACKUP, appRoot], { stdio: "ignore" });
    try {
      (0, import_node_child_process2.execFileSync)("xattr", ["-dr", "com.apple.quarantine", appRoot], { stdio: "ignore" });
    } catch {
    }
    log("info", "Restored signed Codex.app before Sparkle install", { appRoot });
  } catch (e) {
    log("error", "Failed to restore signed Codex.app before Sparkle install", {
      message: e.message
    });
  }
}
function isDeveloperIdSignedApp(appRoot) {
  const result = (0, import_node_child_process2.spawnSync)("codesign", ["-dv", "--verbose=4", appRoot], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  return result.status === 0 && /Authority=Developer ID Application:/.test(output) && !/Signature=adhoc/.test(output) && !/TeamIdentifier=not set/.test(output);
}
function inferMacAppRoot() {
  const marker = ".app/Contents/MacOS/";
  const idx = process.execPath.indexOf(marker);
  return idx >= 0 ? process.execPath.slice(0, idx + ".app".length) : null;
}
process.on("uncaughtException", (e) => {
  log("error", "uncaughtException", { code: e.code, message: e.message, stack: e.stack });
});
process.on("unhandledRejection", (e) => {
  log("error", "unhandledRejection", { value: String(e) });
});
installSparkleUpdateHook();
var tweakState = {
  discovered: [],
  loadedMain: /* @__PURE__ */ new Map()
};
var tweakLifecycleDeps = {
  logInfo: (message) => log("info", message),
  setTweakEnabled,
  stopAllMainTweaks,
  clearTweakModuleCache,
  loadAllMainTweaks,
  broadcastReload
};
function registerPreload(s, label) {
  try {
    const reg = s.registerPreloadScript;
    if (typeof reg === "function") {
      reg.call(s, { type: "frame", filePath: PRELOAD_PATH, id: "codex-plusplus" });
      log("info", `preload registered (registerPreloadScript) on ${label}:`, PRELOAD_PATH);
      return;
    }
    const existing = s.getPreloads();
    if (!existing.includes(PRELOAD_PATH)) {
      s.setPreloads([...existing, PRELOAD_PATH]);
    }
    log("info", `preload registered (setPreloads) on ${label}:`, PRELOAD_PATH);
  } catch (e) {
    if (e instanceof Error && e.message.includes("existing ID")) {
      log("info", `preload already registered on ${label}:`, PRELOAD_PATH);
      return;
    }
    log("error", `preload registration on ${label} failed:`, e);
  }
}
import_electron.app.whenReady().then(() => {
  log("info", "app ready fired");
  if (isCodexPlusPlusSafeModeEnabled()) {
    log("warn", "safe mode is enabled; preload will not be registered");
    return;
  }
  registerPreload(import_electron.session.defaultSession, "defaultSession");
});
import_electron.app.on("session-created", (s) => {
  if (isCodexPlusPlusSafeModeEnabled()) return;
  registerPreload(s, "session-created");
});
import_electron.app.on("web-contents-created", (_e, wc) => {
  try {
    const wp = wc.getLastWebPreferences?.();
    log("info", "web-contents-created", {
      id: wc.id,
      type: wc.getType(),
      sessionIsDefault: wc.session === import_electron.session.defaultSession,
      sandbox: wp?.sandbox,
      contextIsolation: wp?.contextIsolation
    });
    wc.on("preload-error", (_ev, p, err) => {
      log("error", `wc ${wc.id} preload-error path=${p}`, String(err?.stack ?? err));
    });
  } catch (e) {
    log("error", "web-contents-created handler failed:", String(e?.stack ?? e));
  }
});
log("info", "main.ts evaluated; app.isReady=" + import_electron.app.isReady());
if (isCodexPlusPlusSafeModeEnabled()) {
  log("warn", "safe mode is enabled; tweaks will not be loaded");
}
loadAllMainTweaks();
import_electron.app.on("will-quit", () => {
  stopAllMainTweaks();
  for (const t of tweakState.loadedMain.values()) {
    try {
      t.storage.flush();
    } catch {
    }
  }
});
import_electron.ipcMain.handle("codexpp:list-tweaks", async () => {
  await Promise.all(tweakState.discovered.map((t) => ensureTweakUpdateCheck(t)));
  const updateChecks = readState().tweakUpdateChecks ?? {};
  return tweakState.discovered.map((t) => ({
    manifest: t.manifest,
    entry: t.entry,
    dir: t.dir,
    entryExists: (0, import_node_fs6.existsSync)(t.entry),
    enabled: isTweakEnabled(t.manifest.id),
    update: updateChecks[t.manifest.id] ?? null
  }));
});
import_electron.ipcMain.handle("codexpp:get-tweak-enabled", (_e, id) => isTweakEnabled(id));
import_electron.ipcMain.handle("codexpp:set-tweak-enabled", (_e, id, enabled) => {
  return setTweakEnabledAndReload(id, enabled, tweakLifecycleDeps);
});
import_electron.ipcMain.handle("codexpp:get-config", () => {
  const s = readState();
  const installerState = readInstallerState();
  const sourceRoot = installerState?.sourceRoot ?? fallbackSourceRoot();
  return {
    version: CODEX_PLUSPLUS_VERSION,
    autoUpdate: s.codexPlusPlus?.autoUpdate !== false,
    safeMode: s.codexPlusPlus?.safeMode === true,
    updateChannel: s.codexPlusPlus?.updateChannel ?? "stable",
    updateRepo: s.codexPlusPlus?.updateRepo ?? CODEX_PLUSPLUS_REPO,
    updateRef: s.codexPlusPlus?.updateRef ?? "",
    updateCheck: s.codexPlusPlus?.updateCheck ?? null,
    selfUpdate: readSelfUpdateState(),
    installationSource: describeInstallationSource(sourceRoot)
  };
});
import_electron.ipcMain.handle("codexpp:set-auto-update", (_e, enabled) => {
  setCodexPlusPlusAutoUpdate(!!enabled);
  return { autoUpdate: isCodexPlusPlusAutoUpdateEnabled() };
});
import_electron.ipcMain.handle("codexpp:set-update-config", (_e, config) => {
  setCodexPlusPlusUpdateConfig(config);
  const s = readState();
  return {
    updateChannel: s.codexPlusPlus?.updateChannel ?? "stable",
    updateRepo: s.codexPlusPlus?.updateRepo ?? CODEX_PLUSPLUS_REPO,
    updateRef: s.codexPlusPlus?.updateRef ?? ""
  };
});
import_electron.ipcMain.handle("codexpp:check-codexpp-update", async (_e, force) => {
  return ensureCodexPlusPlusUpdateCheck(force === true);
});
import_electron.ipcMain.handle("codexpp:run-codexpp-update", async () => {
  const sourceRoot = readInstallerState()?.sourceRoot ?? fallbackSourceRoot();
  if (!sourceRoot) {
    throw new Error("Codex++ source CLI was not found. Run the installer once, then try again.");
  }
  const cli = (0, import_node_path6.join)(sourceRoot, "packages", "installer", "dist", "cli.js");
  if (!(0, import_node_fs6.existsSync)(cli)) {
    throw new Error("Codex++ source CLI was not found. Run the installer once, then try again.");
  }
  const pending = markSelfUpdateStarted(sourceRoot);
  startInstalledCli(cli, ["update", "--watcher"]);
  return pending;
});
import_electron.ipcMain.handle("codexpp:get-watcher-health", () => getWatcherHealth(userRoot));
import_electron.ipcMain.handle("codexpp:get-tweak-store", async () => {
  const store = await fetchTweakStoreRegistry();
  const registry = store.registry;
  const installed = new Map(tweakState.discovered.map((t) => [t.manifest.id, t]));
  const entries = shuffleStoreEntries(registry.entries, import_node_crypto.randomInt);
  return {
    ...registry,
    sourceUrl: TWEAK_STORE_INDEX_URL,
    fetchedAt: store.fetchedAt,
    entries: entries.map((entry) => {
      const local = installed.get(entry.id);
      const platform2 = storeEntryPlatformCompatibility(entry);
      const runtime = storeEntryRuntimeCompatibility(entry);
      return {
        ...entry,
        platform: platform2,
        runtime,
        installed: local ? {
          version: local.manifest.version,
          enabled: isTweakEnabled(local.manifest.id)
        } : null
      };
    })
  };
});
import_electron.ipcMain.handle("codexpp:install-store-tweak", async (_e, id) => {
  const { registry } = await fetchTweakStoreRegistry();
  const entry = registry.entries.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Tweak store entry not found: ${id}`);
  assertStoreEntryPlatformCompatible(entry);
  assertStoreEntryRuntimeCompatible(entry);
  await installStoreTweak(entry);
  reloadTweaks("store-install", tweakLifecycleDeps);
  return { installed: entry.id };
});
import_electron.ipcMain.handle("codexpp:prepare-tweak-store-submission", async (_e, repoInput) => {
  return prepareTweakStoreSubmission(repoInput);
});
import_electron.ipcMain.handle("codexpp:read-tweak-source", (_e, entryPath) => {
  const resolved = (0, import_node_path6.resolve)(entryPath);
  if (!isPathInside(TWEAKS_DIR, resolved)) {
    throw new Error("path outside tweaks dir");
  }
  return require("node:fs").readFileSync(resolved, "utf8");
});
var ASSET_MAX_BYTES = 1024 * 1024;
var MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};
import_electron.ipcMain.handle(
  "codexpp:read-tweak-asset",
  (_e, tweakDir, relPath) => {
    const fs = require("node:fs");
    const dir = (0, import_node_path6.resolve)(tweakDir);
    if (!isPathInside(TWEAKS_DIR, dir)) {
      throw new Error("tweakDir outside tweaks dir");
    }
    const full = (0, import_node_path6.resolve)(dir, relPath);
    if (!isPathInside(dir, full) || full === dir) {
      throw new Error("path traversal");
    }
    const stat4 = fs.statSync(full);
    if (stat4.size > ASSET_MAX_BYTES) {
      throw new Error(`asset too large (${stat4.size} > ${ASSET_MAX_BYTES})`);
    }
    const ext = full.slice(full.lastIndexOf(".")).toLowerCase();
    const mime = MIME_BY_EXT[ext] ?? "application/octet-stream";
    const buf = fs.readFileSync(full);
    return `data:${mime};base64,${buf.toString("base64")}`;
  }
);
import_electron.ipcMain.on("codexpp:preload-log", (_e, level, msg) => {
  const lvl = level === "error" || level === "warn" ? level : "info";
  try {
    appendCappedLog((0, import_node_path6.join)(LOG_DIR, "preload.log"), `[${(/* @__PURE__ */ new Date()).toISOString()}] [${lvl}] ${msg}
`);
  } catch {
  }
});
import_electron.ipcMain.handle("codexpp:tweak-fs", (_e, op, id, p, c) => {
  if (!/^[a-zA-Z0-9._-]+$/.test(id)) throw new Error("bad tweak id");
  const dir = (0, import_node_path6.join)(userRoot, "tweak-data", id);
  (0, import_node_fs6.mkdirSync)(dir, { recursive: true });
  const full = (0, import_node_path6.resolve)(dir, p);
  if (!isPathInside(dir, full) || full === dir) throw new Error("path traversal");
  const fs = require("node:fs");
  switch (op) {
    case "read":
      return fs.readFileSync(full, "utf8");
    case "write":
      return fs.writeFileSync(full, c ?? "", "utf8");
    case "exists":
      return fs.existsSync(full);
    case "dataDir":
      return dir;
    default:
      throw new Error(`unknown op: ${op}`);
  }
});
import_electron.ipcMain.handle("codexpp:user-paths", () => ({
  userRoot,
  runtimeDir,
  tweaksDir: TWEAKS_DIR,
  logDir: LOG_DIR
}));
import_electron.ipcMain.handle("codexpp:reveal", (_e, p) => {
  import_electron.shell.openPath(p).catch(() => {
  });
});
import_electron.ipcMain.handle("codexpp:open-external", (_e, url) => {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "github.com") {
    throw new Error("only github.com links can be opened from tweak metadata");
  }
  import_electron.shell.openExternal(parsed.toString()).catch(() => {
  });
});
import_electron.ipcMain.handle("codexpp:copy-text", (_e, text) => {
  import_electron.clipboard.writeText(String(text));
  return true;
});
import_electron.ipcMain.handle("codexpp:reload-tweaks", () => {
  reloadTweaks("manual", tweakLifecycleDeps);
  return { at: Date.now(), count: tweakState.discovered.length };
});
var RELOAD_DEBOUNCE_MS = 250;
var reloadTimer = null;
function scheduleReload(reason) {
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    reloadTimer = null;
    reloadTweaks(reason, tweakLifecycleDeps);
  }, RELOAD_DEBOUNCE_MS);
}
try {
  const watcher = esm_default.watch(TWEAKS_DIR, {
    ignoreInitial: true,
    // Wait for files to settle before triggering — guards against partially
    // written tweak files during editor saves / git checkouts.
    awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
    // Avoid eating CPU on huge node_modules trees inside tweak folders.
    ignored: (p) => p.includes(`${TWEAKS_DIR}/`) && /\/node_modules\//.test(p)
  });
  watcher.on("all", (event, path) => scheduleReload(`${event} ${path}`));
  watcher.on("error", (e) => log("warn", "watcher error:", e));
  log("info", "watching", TWEAKS_DIR);
  import_electron.app.on("will-quit", () => watcher.close().catch(() => {
  }));
} catch (e) {
  log("error", "failed to start watcher:", e);
}
function loadAllMainTweaks() {
  try {
    tweakState.discovered = discoverTweaks(TWEAKS_DIR);
    log(
      "info",
      `discovered ${tweakState.discovered.length} tweak(s):`,
      tweakState.discovered.map((t) => t.manifest.id).join(", ")
    );
  } catch (e) {
    log("error", "tweak discovery failed:", e);
    tweakState.discovered = [];
  }
  syncMcpServersFromEnabledTweaks();
  for (const t of tweakState.discovered) {
    if (!isMainProcessTweakScope(t.manifest.scope)) continue;
    if (!isTweakEnabled(t.manifest.id)) {
      log("info", `skipping disabled main tweak: ${t.manifest.id}`);
      continue;
    }
    try {
      const mod = require(t.entry);
      const tweak = mod.default ?? mod;
      if (typeof tweak?.start === "function") {
        const storage = createDiskStorage(userRoot, t.manifest.id);
        tweak.start({
          manifest: t.manifest,
          process: "main",
          log: makeLogger(t.manifest.id),
          storage,
          ipc: makeMainIpc(t.manifest.id),
          fs: makeMainFs(t.manifest.id),
          codex: makeCodexApi()
        });
        tweakState.loadedMain.set(t.manifest.id, {
          stop: tweak.stop,
          storage
        });
        log("info", `started main tweak: ${t.manifest.id}`);
      }
    } catch (e) {
      log("error", `tweak ${t.manifest.id} failed to start:`, e);
    }
  }
}
function syncMcpServersFromEnabledTweaks() {
  try {
    const result = syncManagedMcpServers({
      configPath: CODEX_CONFIG_FILE,
      tweaks: tweakState.discovered.filter((t) => isTweakEnabled(t.manifest.id))
    });
    if (result.changed) {
      log("info", `synced Codex MCP config: ${result.serverNames.join(", ") || "none"}`);
    }
    if (result.skippedServerNames.length > 0) {
      log(
        "info",
        `skipped Codex++ managed MCP server(s) already configured by user: ${result.skippedServerNames.join(", ")}`
      );
    }
  } catch (e) {
    log("warn", "failed to sync Codex MCP config:", e);
  }
}
function stopAllMainTweaks() {
  for (const [id, t] of tweakState.loadedMain) {
    try {
      t.stop?.();
      t.storage.flush();
      log("info", `stopped main tweak: ${id}`);
    } catch (e) {
      log("warn", `stop failed for ${id}:`, e);
    }
  }
  tweakState.loadedMain.clear();
}
function clearTweakModuleCache() {
  for (const key of Object.keys(require.cache)) {
    if (isPathInside(TWEAKS_DIR, key)) delete require.cache[key];
  }
}
var UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1e3;
var VERSION_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/;
async function ensureCodexPlusPlusUpdateCheck(force = false) {
  const state = readState();
  const cached = state.codexPlusPlus?.updateCheck;
  const channel = state.codexPlusPlus?.updateChannel ?? "stable";
  const repo = state.codexPlusPlus?.updateRepo ?? CODEX_PLUSPLUS_REPO;
  if (!force && cached && cached.currentVersion === CODEX_PLUSPLUS_VERSION && Date.now() - Date.parse(cached.checkedAt) < UPDATE_CHECK_INTERVAL_MS) {
    return cached;
  }
  const release = await fetchLatestRelease(repo, CODEX_PLUSPLUS_VERSION, channel === "prerelease");
  const latestVersion = release.latestTag ? normalizeVersion(release.latestTag) : null;
  const check = {
    checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
    currentVersion: CODEX_PLUSPLUS_VERSION,
    latestVersion,
    releaseUrl: release.releaseUrl ?? `https://github.com/${repo}/releases`,
    releaseNotes: release.releaseNotes,
    updateAvailable: latestVersion ? compareVersions(normalizeVersion(latestVersion), CODEX_PLUSPLUS_VERSION) > 0 : false,
    ...release.error ? { error: release.error } : {}
  };
  state.codexPlusPlus ??= {};
  state.codexPlusPlus.updateCheck = check;
  writeState(state);
  return check;
}
async function ensureTweakUpdateCheck(t) {
  const id = t.manifest.id;
  const repo = t.manifest.githubRepo;
  const state = readState();
  const cached = state.tweakUpdateChecks?.[id];
  if (cached && cached.repo === repo && cached.currentVersion === t.manifest.version && Date.now() - Date.parse(cached.checkedAt) < UPDATE_CHECK_INTERVAL_MS) {
    return;
  }
  const next = await fetchLatestRelease(repo, t.manifest.version);
  const latestVersion = next.latestTag ? normalizeVersion(next.latestTag) : null;
  const check = {
    checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
    repo,
    currentVersion: t.manifest.version,
    latestVersion,
    latestTag: next.latestTag,
    releaseUrl: next.releaseUrl,
    updateAvailable: latestVersion ? compareVersions(latestVersion, normalizeVersion(t.manifest.version)) > 0 : false,
    ...next.error ? { error: next.error } : {}
  };
  state.tweakUpdateChecks ??= {};
  state.tweakUpdateChecks[id] = check;
  writeState(state);
}
async function fetchLatestRelease(repo, currentVersion, includePrerelease = false) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8e3);
    try {
      const endpoint = includePrerelease ? "releases?per_page=20" : "releases/latest";
      const res = await fetch(`https://api.github.com/repos/${repo}/${endpoint}`, {
        headers: {
          "Accept": "application/vnd.github+json",
          "User-Agent": `codex-plusplus/${currentVersion}`
        },
        signal: controller.signal
      });
      if (res.status === 404) {
        return { latestTag: null, releaseUrl: null, releaseNotes: null, error: "no GitHub release found" };
      }
      if (!res.ok) {
        return { latestTag: null, releaseUrl: null, releaseNotes: null, error: `GitHub returned ${res.status}` };
      }
      const json = await res.json();
      const body = Array.isArray(json) ? json.find((release) => !release.draft) : json;
      if (!body) {
        return { latestTag: null, releaseUrl: null, releaseNotes: null, error: "no GitHub release found" };
      }
      return {
        latestTag: body.tag_name ?? null,
        releaseUrl: body.html_url ?? `https://github.com/${repo}/releases`,
        releaseNotes: body.body ?? null
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (e) {
    return {
      latestTag: null,
      releaseUrl: null,
      releaseNotes: null,
      error: e instanceof Error ? e.message : String(e)
    };
  }
}
var StoreTweakModifiedError = class extends Error {
  constructor(tweakName) {
    super(
      `${tweakName} has local source changes, so Codex++ can't auto-update it. Revert your local changes or reinstall the tweak manually.`
    );
    this.name = "StoreTweakModifiedError";
  }
};
function storeEntryPlatformCompatibility(entry) {
  const supported = entry.platforms ?? null;
  const compatible = !supported || supported.includes(process.platform);
  return {
    current: process.platform,
    supported,
    compatible,
    reason: compatible ? null : `${entry.manifest.name} is only available on ${formatStorePlatforms(supported)}.`
  };
}
function assertStoreEntryPlatformCompatible(entry) {
  const platform2 = storeEntryPlatformCompatibility(entry);
  if (!platform2.compatible) {
    throw new Error(platform2.reason ?? `${entry.manifest.name} is not available on this platform.`);
  }
}
function storeEntryRuntimeCompatibility(entry) {
  const required = cleanMinRuntime(entry.manifest.minRuntime);
  const compatible = !required || compareVersions(CODEX_PLUSPLUS_VERSION, required) >= 0;
  return {
    current: CODEX_PLUSPLUS_VERSION,
    required,
    compatible,
    reason: compatible || !required ? null : `${entry.manifest.name} requires Codex++ ${required} or newer.`
  };
}
function assertStoreEntryRuntimeCompatible(entry) {
  const runtime = storeEntryRuntimeCompatibility(entry);
  if (!runtime.compatible) {
    throw new Error(runtime.reason ?? `${entry.manifest.name} requires a newer Codex++ runtime.`);
  }
}
function cleanMinRuntime(value) {
  if (typeof value !== "string") return null;
  const version = normalizeVersion(value.replace(/^>=?\s*/, ""));
  return VERSION_RE.test(version) ? version : null;
}
function formatStorePlatforms(platforms) {
  if (!platforms || platforms.length === 0) return "supported platforms";
  return platforms.map((platform2) => {
    if (platform2 === "darwin") return "macOS";
    if (platform2 === "win32") return "Windows";
    return "Linux";
  }).join(", ");
}
async function fetchTweakStoreRegistry() {
  const fetchedAt = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8e3);
    try {
      const res = await fetch(TWEAK_STORE_INDEX_URL, {
        headers: {
          "Accept": "application/json",
          "User-Agent": `codex-plusplus/${CODEX_PLUSPLUS_VERSION}`
        },
        signal: controller.signal
      });
      if (!res.ok) throw new Error(`store returned ${res.status}`);
      return {
        registry: normalizeStoreRegistry(await res.json()),
        fetchedAt
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    log("warn", "failed to fetch tweak store registry:", error.message);
    throw error;
  }
}
async function installStoreTweak(entry) {
  const url = storeArchiveUrl(entry);
  const work = (0, import_node_fs6.mkdtempSync)((0, import_node_path6.join)((0, import_node_os2.tmpdir)(), "codexpp-store-tweak-"));
  const archive = (0, import_node_path6.join)(work, "source.tar.gz");
  const extractDir = (0, import_node_path6.join)(work, "extract");
  const target = (0, import_node_path6.join)(TWEAKS_DIR, entry.id);
  const stagedTarget = (0, import_node_path6.join)(work, "staged", entry.id);
  try {
    log("info", `installing store tweak ${entry.id} from ${entry.repo}@${entry.approvedCommitSha}`);
    const res = await fetch(url, {
      headers: { "User-Agent": `codex-plusplus/${CODEX_PLUSPLUS_VERSION}` },
      redirect: "follow"
    });
    if (!res.ok) throw new Error(`download failed: ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    (0, import_node_fs6.writeFileSync)(archive, bytes);
    (0, import_node_fs6.mkdirSync)(extractDir, { recursive: true });
    extractTarArchive(archive, extractDir);
    const source = findTweakRoot(extractDir);
    if (!source) throw new Error("downloaded archive did not contain manifest.json");
    validateStoreTweakSource(entry, source);
    (0, import_node_fs6.rmSync)(stagedTarget, { recursive: true, force: true });
    copyTweakSource(source, stagedTarget);
    const stagedFiles = hashTweakSource(stagedTarget);
    (0, import_node_fs6.writeFileSync)(
      (0, import_node_path6.join)(stagedTarget, ".codexpp-store.json"),
      JSON.stringify(
        {
          repo: entry.repo,
          approvedCommitSha: entry.approvedCommitSha,
          installedAt: (/* @__PURE__ */ new Date()).toISOString(),
          storeIndexUrl: TWEAK_STORE_INDEX_URL,
          files: stagedFiles
        },
        null,
        2
      )
    );
    await assertStoreTweakCleanForAutoUpdate(entry, target, work);
    (0, import_node_fs6.rmSync)(target, { recursive: true, force: true });
    (0, import_node_fs6.cpSync)(stagedTarget, target, { recursive: true });
  } finally {
    (0, import_node_fs6.rmSync)(work, { recursive: true, force: true });
  }
}
async function prepareTweakStoreSubmission(repoInput) {
  const repo = normalizeGitHubRepo(repoInput);
  const repoInfo = await fetchGithubJson(`https://api.github.com/repos/${repo}`);
  const defaultBranch = repoInfo.default_branch;
  if (!defaultBranch) throw new Error(`Could not resolve default branch for ${repo}`);
  const commit = await fetchGithubJson(`https://api.github.com/repos/${repo}/commits/${encodeURIComponent(defaultBranch)}`);
  if (!commit.sha) throw new Error(`Could not resolve current commit for ${repo}`);
  const manifest = await fetchManifestAtCommit(repo, commit.sha).catch((e) => {
    log("warn", `could not read manifest for store submission ${repo}@${commit.sha}:`, e);
    return void 0;
  });
  return {
    repo,
    defaultBranch,
    commitSha: commit.sha,
    commitUrl: commit.html_url ?? `https://github.com/${repo}/commit/${commit.sha}`,
    manifest: manifest ? {
      id: typeof manifest.id === "string" ? manifest.id : void 0,
      name: typeof manifest.name === "string" ? manifest.name : void 0,
      version: typeof manifest.version === "string" ? manifest.version : void 0,
      description: typeof manifest.description === "string" ? manifest.description : void 0,
      iconUrl: typeof manifest.iconUrl === "string" ? manifest.iconUrl : void 0
    } : void 0
  };
}
async function fetchGithubJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8e3);
  try {
    const res = await fetch(url, {
      headers: {
        "Accept": "application/vnd.github+json",
        "User-Agent": `codex-plusplus/${CODEX_PLUSPLUS_VERSION}`
      },
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}
async function fetchManifestAtCommit(repo, commitSha) {
  const res = await fetch(`https://raw.githubusercontent.com/${repo}/${commitSha}/manifest.json`, {
    headers: {
      "Accept": "application/json",
      "User-Agent": `codex-plusplus/${CODEX_PLUSPLUS_VERSION}`
    }
  });
  if (!res.ok) throw new Error(`manifest fetch returned ${res.status}`);
  return await res.json();
}
function extractTarArchive(archive, targetDir) {
  const result = (0, import_node_child_process2.spawnSync)("tar", ["-xzf", archive, "-C", targetDir], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.status !== 0) {
    throw new Error(`tar extraction failed: ${result.stderr || result.stdout || result.status}`);
  }
}
function validateStoreTweakSource(entry, source) {
  const manifestPath = (0, import_node_path6.join)(source, "manifest.json");
  const manifest = JSON.parse((0, import_node_fs6.readFileSync)(manifestPath, "utf8"));
  if (manifest.id !== entry.manifest.id) {
    throw new Error(`downloaded tweak id ${manifest.id} does not match approved id ${entry.manifest.id}`);
  }
  if (manifest.githubRepo !== entry.repo) {
    throw new Error(`downloaded tweak repo ${manifest.githubRepo} does not match approved repo ${entry.repo}`);
  }
  if (manifest.version !== entry.manifest.version) {
    throw new Error(`downloaded tweak version ${manifest.version} does not match approved version ${entry.manifest.version}`);
  }
}
function findTweakRoot(dir) {
  if (!(0, import_node_fs6.existsSync)(dir)) return null;
  if ((0, import_node_fs6.existsSync)((0, import_node_path6.join)(dir, "manifest.json"))) return dir;
  for (const name of (0, import_node_fs6.readdirSync)(dir)) {
    const child = (0, import_node_path6.join)(dir, name);
    try {
      if (!(0, import_node_fs6.statSync)(child).isDirectory()) continue;
    } catch {
      continue;
    }
    const found = findTweakRoot(child);
    if (found) return found;
  }
  return null;
}
function copyTweakSource(source, target) {
  (0, import_node_fs6.cpSync)(source, target, {
    recursive: true,
    filter: (src) => !/(^|[/\\])(?:\.git|node_modules)(?:[/\\]|$)/.test(src)
  });
}
async function assertStoreTweakCleanForAutoUpdate(entry, target, work) {
  if (!(0, import_node_fs6.existsSync)(target)) return;
  const metadata = readStoreInstallMetadata(target);
  if (!metadata) return;
  if (metadata.repo !== entry.repo) {
    throw new StoreTweakModifiedError(entry.manifest.name);
  }
  const currentFiles = hashTweakSource(target);
  const baselineFiles = metadata.files ?? await fetchBaselineStoreTweakHashes(metadata, work);
  if (!sameFileHashes(currentFiles, baselineFiles)) {
    throw new StoreTweakModifiedError(entry.manifest.name);
  }
}
function readStoreInstallMetadata(target) {
  const metadataPath = (0, import_node_path6.join)(target, ".codexpp-store.json");
  if (!(0, import_node_fs6.existsSync)(metadataPath)) return null;
  try {
    const parsed = JSON.parse((0, import_node_fs6.readFileSync)(metadataPath, "utf8"));
    if (typeof parsed.repo !== "string" || typeof parsed.approvedCommitSha !== "string") return null;
    return {
      repo: parsed.repo,
      approvedCommitSha: parsed.approvedCommitSha,
      installedAt: typeof parsed.installedAt === "string" ? parsed.installedAt : "",
      storeIndexUrl: typeof parsed.storeIndexUrl === "string" ? parsed.storeIndexUrl : "",
      files: isHashRecord(parsed.files) ? parsed.files : void 0
    };
  } catch {
    return null;
  }
}
async function fetchBaselineStoreTweakHashes(metadata, work) {
  const baselineDir = (0, import_node_path6.join)(work, "baseline");
  const archive = (0, import_node_path6.join)(work, "baseline.tar.gz");
  const res = await fetch(`https://codeload.github.com/${metadata.repo}/tar.gz/${metadata.approvedCommitSha}`, {
    headers: { "User-Agent": `codex-plusplus/${CODEX_PLUSPLUS_VERSION}` },
    redirect: "follow"
  });
  if (!res.ok) throw new Error(`Could not verify local tweak changes before update: ${res.status}`);
  (0, import_node_fs6.writeFileSync)(archive, Buffer.from(await res.arrayBuffer()));
  (0, import_node_fs6.mkdirSync)(baselineDir, { recursive: true });
  extractTarArchive(archive, baselineDir);
  const source = findTweakRoot(baselineDir);
  if (!source) throw new Error("Could not verify local tweak changes before update: baseline manifest missing");
  return hashTweakSource(source);
}
function hashTweakSource(root) {
  const out = {};
  collectTweakFileHashes(root, root, out);
  return out;
}
function collectTweakFileHashes(root, dir, out) {
  for (const name of (0, import_node_fs6.readdirSync)(dir).sort()) {
    if (name === ".git" || name === "node_modules" || name === ".codexpp-store.json") continue;
    const full = (0, import_node_path6.join)(dir, name);
    const rel = (0, import_node_path6.relative)(root, full).split("\\").join("/");
    const stat4 = (0, import_node_fs6.statSync)(full);
    if (stat4.isDirectory()) {
      collectTweakFileHashes(root, full, out);
      continue;
    }
    if (!stat4.isFile()) continue;
    out[rel] = (0, import_node_crypto.createHash)("sha256").update((0, import_node_fs6.readFileSync)(full)).digest("hex");
  }
}
function sameFileHashes(a, b) {
  const ak = Object.keys(a).sort();
  const bk = Object.keys(b).sort();
  if (ak.length !== bk.length) return false;
  for (let i = 0; i < ak.length; i++) {
    const key = ak[i];
    if (key !== bk[i] || a[key] !== b[key]) return false;
  }
  return true;
}
function isHashRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((v) => typeof v === "string");
}
function normalizeVersion(v) {
  return v.trim().replace(/^v/i, "");
}
function compareVersions(a, b) {
  const av = VERSION_RE.exec(a);
  const bv = VERSION_RE.exec(b);
  if (!av || !bv) return 0;
  for (let i = 1; i <= 3; i++) {
    const diff = Number(av[i]) - Number(bv[i]);
    if (diff !== 0) return diff;
  }
  return 0;
}
function fallbackSourceRoot() {
  const candidates = [
    (0, import_node_path6.join)((0, import_node_os2.homedir)(), ".codex-plusplus", "source"),
    (0, import_node_path6.join)(userRoot, "source")
  ];
  for (const candidate of candidates) {
    if ((0, import_node_fs6.existsSync)((0, import_node_path6.join)(candidate, "packages", "installer", "dist", "cli.js"))) return candidate;
  }
  return null;
}
function describeInstallationSource(sourceRoot) {
  if (!sourceRoot) {
    return {
      kind: "unknown",
      label: "Unknown",
      detail: "Codex++ source location is not recorded yet."
    };
  }
  const normalized = sourceRoot.replace(/\\/g, "/");
  if (/\/(?:Homebrew|homebrew)\/Cellar\/codexplusplus\//.test(normalized)) {
    return { kind: "homebrew", label: "Homebrew", detail: sourceRoot };
  }
  if ((0, import_node_fs6.existsSync)((0, import_node_path6.join)(sourceRoot, ".git"))) {
    return { kind: "local-dev", label: "Local development checkout", detail: sourceRoot };
  }
  if (normalized.endsWith("/.codex-plusplus/source") || normalized.includes("/.codex-plusplus/source/")) {
    return { kind: "github-source", label: "GitHub source installer", detail: sourceRoot };
  }
  if ((0, import_node_fs6.existsSync)((0, import_node_path6.join)(sourceRoot, "package.json"))) {
    return { kind: "source-archive", label: "Source archive", detail: sourceRoot };
  }
  return { kind: "unknown", label: "Unknown", detail: sourceRoot };
}
function startInstalledCli(cli, args) {
  const child = (0, import_node_child_process2.spawn)(process.execPath, [cli, ...args], {
    cwd: (0, import_node_path6.resolve)((0, import_node_path6.dirname)(cli), "..", "..", ".."),
    env: { ...process.env, CODEX_PLUSPLUS_MANUAL_UPDATE: "1" },
    detached: true,
    stdio: "ignore"
  });
  child.unref();
}
function markSelfUpdateStarted(sourceRoot) {
  const config = readState().codexPlusPlus;
  const channel = config?.updateChannel ?? "stable";
  const state = {
    checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
    status: "checking",
    currentVersion: CODEX_PLUSPLUS_VERSION,
    latestVersion: null,
    targetRef: config?.updateChannel === "custom" ? config.updateRef ?? null : null,
    releaseUrl: null,
    repo: config?.updateRepo ?? CODEX_PLUSPLUS_REPO,
    channel,
    sourceRoot,
    installationSource: describeInstallationSource(sourceRoot)
  };
  writeSelfUpdateState(state);
  return state;
}
function broadcastReload() {
  const payload = {
    at: Date.now(),
    tweaks: tweakState.discovered.map((t) => t.manifest.id)
  };
  for (const wc of import_electron.webContents.getAllWebContents()) {
    try {
      wc.send("codexpp:tweaks-changed", payload);
    } catch (e) {
      log("warn", "broadcast send failed:", e);
    }
  }
}
function makeLogger(scope) {
  return {
    debug: (...a) => log("info", `[${scope}]`, ...a),
    info: (...a) => log("info", `[${scope}]`, ...a),
    warn: (...a) => log("warn", `[${scope}]`, ...a),
    error: (...a) => log("error", `[${scope}]`, ...a)
  };
}
function makeMainIpc(id) {
  const ch = (c) => `codexpp:${id}:${c}`;
  return {
    on: (c, h) => {
      const wrapped = (_e, ...args) => h(...args);
      import_electron.ipcMain.on(ch(c), wrapped);
      return () => import_electron.ipcMain.removeListener(ch(c), wrapped);
    },
    send: (_c) => {
      throw new Error("ipc.send is renderer\u2192main; main side uses handle/on");
    },
    invoke: (_c) => {
      throw new Error("ipc.invoke is renderer\u2192main; main side uses handle");
    },
    handle: (c, handler) => {
      import_electron.ipcMain.handle(ch(c), (_e, ...args) => handler(...args));
    }
  };
}
function makeMainFs(id) {
  const dir = (0, import_node_path6.join)(userRoot, "tweak-data", id);
  (0, import_node_fs6.mkdirSync)(dir, { recursive: true });
  const fs = require("node:fs/promises");
  return {
    dataDir: dir,
    read: (p) => fs.readFile((0, import_node_path6.join)(dir, p), "utf8"),
    write: (p, c) => fs.writeFile((0, import_node_path6.join)(dir, p), c, "utf8"),
    exists: async (p) => {
      try {
        await fs.access((0, import_node_path6.join)(dir, p));
        return true;
      } catch {
        return false;
      }
    }
  };
}
function makeCodexApi() {
  return {
    createBrowserView: async (opts) => {
      const services = getCodexWindowServices();
      const windowManager = services?.windowManager;
      if (!services || !windowManager?.registerWindow) {
        throw new Error(
          "Codex embedded view services are not available. Reinstall Codex++ 0.1.1 or later."
        );
      }
      const route = normalizeCodexRoute(opts.route);
      const hostId = opts.hostId || "local";
      const appearance = opts.appearance || "secondary";
      const view = new import_electron.BrowserView({
        webPreferences: {
          preload: windowManager.options?.preloadPath,
          contextIsolation: true,
          nodeIntegration: false,
          spellcheck: false,
          devTools: windowManager.options?.allowDevtools
        }
      });
      const windowLike = makeWindowLikeForView(view);
      windowManager.registerWindow(windowLike, hostId, false, appearance);
      services.getContext?.(hostId)?.registerWindow?.(windowLike);
      await view.webContents.loadURL(codexAppUrl(route, hostId));
      return view;
    },
    createWindow: async (opts) => {
      const services = getCodexWindowServices();
      if (!services) {
        throw new Error(
          "Codex window services are not available. Reinstall Codex++ 0.1.1 or later."
        );
      }
      const route = normalizeCodexRoute(opts.route);
      const hostId = opts.hostId || "local";
      const parent = typeof opts.parentWindowId === "number" ? import_electron.BrowserWindow.fromId(opts.parentWindowId) : import_electron.BrowserWindow.getFocusedWindow();
      const createWindow = services.windowManager?.createWindow;
      let win;
      if (typeof createWindow === "function") {
        win = await createWindow.call(services.windowManager, {
          initialRoute: route,
          hostId,
          show: opts.show !== false,
          appearance: opts.appearance || "secondary",
          parent
        });
      } else if (hostId === "local" && typeof services.createFreshLocalWindow === "function") {
        win = await services.createFreshLocalWindow(route);
      } else if (typeof services.ensureHostWindow === "function") {
        win = await services.ensureHostWindow(hostId);
      }
      if (!win || win.isDestroyed()) {
        throw new Error("Codex did not return a window for the requested route");
      }
      if (opts.bounds) {
        win.setBounds(opts.bounds);
      }
      if (parent && !parent.isDestroyed()) {
        try {
          win.setParentWindow(parent);
        } catch {
        }
      }
      if (opts.show !== false) {
        win.show();
      }
      return {
        windowId: win.id,
        webContentsId: win.webContents.id
      };
    }
  };
}
function makeWindowLikeForView(view) {
  const viewBounds = () => view.getBounds();
  return {
    id: view.webContents.id,
    webContents: view.webContents,
    on: (event, listener) => {
      if (event === "closed") {
        view.webContents.once("destroyed", listener);
      } else {
        view.webContents.on(event, listener);
      }
      return view;
    },
    once: (event, listener) => {
      view.webContents.once(event, listener);
      return view;
    },
    off: (event, listener) => {
      view.webContents.off(event, listener);
      return view;
    },
    removeListener: (event, listener) => {
      view.webContents.removeListener(event, listener);
      return view;
    },
    isDestroyed: () => view.webContents.isDestroyed(),
    isFocused: () => view.webContents.isFocused(),
    focus: () => view.webContents.focus(),
    show: () => {
    },
    hide: () => {
    },
    getBounds: viewBounds,
    getContentBounds: viewBounds,
    getSize: () => {
      const b = viewBounds();
      return [b.width, b.height];
    },
    getContentSize: () => {
      const b = viewBounds();
      return [b.width, b.height];
    },
    setTitle: () => {
    },
    getTitle: () => "",
    setRepresentedFilename: () => {
    },
    setDocumentEdited: () => {
    },
    setWindowButtonVisibility: () => {
    }
  };
}
function codexAppUrl(route, hostId) {
  const url = new URL("app://-/index.html");
  url.searchParams.set("hostId", hostId);
  if (route !== "/") url.searchParams.set("initialRoute", route);
  return url.toString();
}
function getCodexWindowServices() {
  const services = globalThis[CODEX_WINDOW_SERVICES_KEY];
  return services && typeof services === "object" ? services : null;
}
function normalizeCodexRoute(route) {
  if (typeof route !== "string" || !route.startsWith("/")) {
    throw new Error("Codex route must be an absolute app route");
  }
  if (route.includes("://") || route.includes("\n") || route.includes("\r")) {
    throw new Error("Codex route must not include a protocol or control characters");
  }
  return route;
}
/*! Bundled license information:

chokidar/esm/index.js:
  (*! chokidar - MIT License (c) 2012 Paul Miller (paulmillr.com) *)
*/
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL21haW4udHMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2Nob2tpZGFyL2VzbS9pbmRleC5qcyIsICIuLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVhZGRpcnAvZXNtL2luZGV4LmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9jaG9raWRhci9lc20vaGFuZGxlci5qcyIsICIuLi9zcmMvdHdlYWstZGlzY292ZXJ5LnRzIiwgIi4uL3NyYy9zdG9yYWdlLnRzIiwgIi4uL3NyYy9tY3Atc3luYy50cyIsICIuLi9zcmMvd2F0Y2hlci1oZWFsdGgudHMiLCAiLi4vc3JjL3R3ZWFrLWxpZmVjeWNsZS50cyIsICIuLi9zcmMvbG9nZ2luZy50cyIsICIuLi9zcmMvdHdlYWstc3RvcmUudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogTWFpbi1wcm9jZXNzIGJvb3RzdHJhcC4gTG9hZGVkIGJ5IHRoZSBhc2FyIGxvYWRlciBiZWZvcmUgQ29kZXgncyBvd25cbiAqIG1haW4gcHJvY2VzcyBjb2RlIHJ1bnMuIFdlIGhvb2sgYEJyb3dzZXJXaW5kb3dgIHNvIGV2ZXJ5IHdpbmRvdyBDb2RleFxuICogY3JlYXRlcyBnZXRzIG91ciBwcmVsb2FkIHNjcmlwdCBhdHRhY2hlZC4gV2UgYWxzbyBzdGFuZCB1cCBhbiBJUENcbiAqIGNoYW5uZWwgZm9yIHR3ZWFrcyB0byB0YWxrIHRvIHRoZSBtYWluIHByb2Nlc3MuXG4gKlxuICogV2UgYXJlIGluIENKUyBsYW5kIGhlcmUgKG1hdGNoZXMgRWxlY3Ryb24ncyBtYWluIHByb2Nlc3MgYW5kIENvZGV4J3Mgb3duXG4gKiBjb2RlKS4gVGhlIHJlbmRlcmVyLXNpZGUgcnVudGltZSBpcyBidW5kbGVkIHNlcGFyYXRlbHkgaW50byBwcmVsb2FkLmpzLlxuICovXG5pbXBvcnQgeyBhcHAsIEJyb3dzZXJWaWV3LCBCcm93c2VyV2luZG93LCBjbGlwYm9hcmQsIGlwY01haW4sIHNlc3Npb24sIHNoZWxsLCB3ZWJDb250ZW50cyB9IGZyb20gXCJlbGVjdHJvblwiO1xuaW1wb3J0IHsgY3BTeW5jLCBleGlzdHNTeW5jLCBta2RpclN5bmMsIG1rZHRlbXBTeW5jLCByZWFkZGlyU3luYywgcmVhZEZpbGVTeW5jLCBybVN5bmMsIHN0YXRTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGV4ZWNGaWxlU3luYywgc3Bhd24sIHNwYXduU3luYyB9IGZyb20gXCJub2RlOmNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCB7IGNyZWF0ZUhhc2gsIHJhbmRvbUludCB9IGZyb20gXCJub2RlOmNyeXB0b1wiO1xuaW1wb3J0IHsgZGlybmFtZSwgaXNBYnNvbHV0ZSwgam9pbiwgcmVsYXRpdmUsIHJlc29sdmUgfSBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgeyBob21lZGlyLCB0bXBkaXIgfSBmcm9tIFwibm9kZTpvc1wiO1xuaW1wb3J0IGNob2tpZGFyIGZyb20gXCJjaG9raWRhclwiO1xuaW1wb3J0IHsgZGlzY292ZXJUd2Vha3MsIHR5cGUgRGlzY292ZXJlZFR3ZWFrIH0gZnJvbSBcIi4vdHdlYWstZGlzY292ZXJ5XCI7XG5pbXBvcnQgeyBjcmVhdGVEaXNrU3RvcmFnZSwgdHlwZSBEaXNrU3RvcmFnZSB9IGZyb20gXCIuL3N0b3JhZ2VcIjtcbmltcG9ydCB7IHN5bmNNYW5hZ2VkTWNwU2VydmVycyB9IGZyb20gXCIuL21jcC1zeW5jXCI7XG5pbXBvcnQgeyBnZXRXYXRjaGVySGVhbHRoIH0gZnJvbSBcIi4vd2F0Y2hlci1oZWFsdGhcIjtcbmltcG9ydCB7XG4gIGlzTWFpblByb2Nlc3NUd2Vha1Njb3BlLFxuICByZWxvYWRUd2Vha3MsXG4gIHNldFR3ZWFrRW5hYmxlZEFuZFJlbG9hZCxcbn0gZnJvbSBcIi4vdHdlYWstbGlmZWN5Y2xlXCI7XG5pbXBvcnQgeyBhcHBlbmRDYXBwZWRMb2cgfSBmcm9tIFwiLi9sb2dnaW5nXCI7XG5pbXBvcnQgdHlwZSB7IFR3ZWFrTWFuaWZlc3QgfSBmcm9tIFwiQGNvZGV4LXBsdXNwbHVzL3Nka1wiO1xuaW1wb3J0IHtcbiAgREVGQVVMVF9UV0VBS19TVE9SRV9JTkRFWF9VUkwsXG4gIG5vcm1hbGl6ZUdpdEh1YlJlcG8sXG4gIG5vcm1hbGl6ZVN0b3JlUmVnaXN0cnksXG4gIHNodWZmbGVTdG9yZUVudHJpZXMsXG4gIHN0b3JlQXJjaGl2ZVVybCxcbiAgdHlwZSBUd2Vha1N0b3JlUHVibGlzaFN1Ym1pc3Npb24sXG4gIHR5cGUgVHdlYWtTdG9yZUVudHJ5LFxuICB0eXBlIFR3ZWFrU3RvcmVSZWdpc3RyeSxcbiAgdHlwZSBUd2Vha1N0b3JlUGxhdGZvcm0sXG59IGZyb20gXCIuL3R3ZWFrLXN0b3JlXCI7XG5cbmNvbnN0IHVzZXJSb290ID0gcHJvY2Vzcy5lbnYuQ09ERVhfUExVU1BMVVNfVVNFUl9ST09UO1xuY29uc3QgcnVudGltZURpciA9IHByb2Nlc3MuZW52LkNPREVYX1BMVVNQTFVTX1JVTlRJTUU7XG5cbmlmICghdXNlclJvb3QgfHwgIXJ1bnRpbWVEaXIpIHtcbiAgdGhyb3cgbmV3IEVycm9yKFxuICAgIFwiY29kZXgtcGx1c3BsdXMgcnVudGltZSBzdGFydGVkIHdpdGhvdXQgQ09ERVhfUExVU1BMVVNfVVNFUl9ST09UL1JVTlRJTUUgZW52c1wiLFxuICApO1xufVxuXG5jb25zdCBQUkVMT0FEX1BBVEggPSByZXNvbHZlKHJ1bnRpbWVEaXIsIFwicHJlbG9hZC5qc1wiKTtcbmNvbnN0IFRXRUFLU19ESVIgPSBqb2luKHVzZXJSb290LCBcInR3ZWFrc1wiKTtcbmNvbnN0IExPR19ESVIgPSBqb2luKHVzZXJSb290LCBcImxvZ1wiKTtcbmNvbnN0IExPR19GSUxFID0gam9pbihMT0dfRElSLCBcIm1haW4ubG9nXCIpO1xuY29uc3QgQ09ORklHX0ZJTEUgPSBqb2luKHVzZXJSb290LCBcImNvbmZpZy5qc29uXCIpO1xuY29uc3QgQ09ERVhfQ09ORklHX0ZJTEUgPSBqb2luKGhvbWVkaXIoKSwgXCIuY29kZXhcIiwgXCJjb25maWcudG9tbFwiKTtcbmNvbnN0IElOU1RBTExFUl9TVEFURV9GSUxFID0gam9pbih1c2VyUm9vdCwgXCJzdGF0ZS5qc29uXCIpO1xuY29uc3QgVVBEQVRFX01PREVfRklMRSA9IGpvaW4odXNlclJvb3QsIFwidXBkYXRlLW1vZGUuanNvblwiKTtcbmNvbnN0IFNFTEZfVVBEQVRFX1NUQVRFX0ZJTEUgPSBqb2luKHVzZXJSb290LCBcInNlbGYtdXBkYXRlLXN0YXRlLmpzb25cIik7XG5jb25zdCBTSUdORURfQ09ERVhfQkFDS1VQID0gam9pbih1c2VyUm9vdCwgXCJiYWNrdXBcIiwgXCJDb2RleC5hcHBcIik7XG5jb25zdCBDT0RFWF9QTFVTUExVU19WRVJTSU9OID0gXCIxLjAuMFwiO1xuY29uc3QgQ09ERVhfUExVU1BMVVNfUkVQTyA9IFwiYi1ubmV0dC9jb2RleC1wbHVzcGx1c1wiO1xuY29uc3QgVFdFQUtfU1RPUkVfSU5ERVhfVVJMID0gcHJvY2Vzcy5lbnYuQ09ERVhfUExVU1BMVVNfU1RPUkVfSU5ERVhfVVJMID8/IERFRkFVTFRfVFdFQUtfU1RPUkVfSU5ERVhfVVJMO1xuY29uc3QgQ09ERVhfV0lORE9XX1NFUlZJQ0VTX0tFWSA9IFwiX19jb2RleHBwX3dpbmRvd19zZXJ2aWNlc19fXCI7XG5cbm1rZGlyU3luYyhMT0dfRElSLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbm1rZGlyU3luYyhUV0VBS1NfRElSLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblxuLy8gT3B0aW9uYWw6IGVuYWJsZSBDaHJvbWUgRGV2VG9vbHMgUHJvdG9jb2wgb24gYSBUQ1AgcG9ydCBzbyB3ZSBjYW4gZHJpdmUgdGhlXG4vLyBydW5uaW5nIENvZGV4IGZyb20gb3V0c2lkZSAoY3VybCBodHRwOi8vbG9jYWxob3N0Ojxwb3J0Pi9qc29uLCBhdHRhY2ggdmlhXG4vLyBDRFAgV2ViU29ja2V0LCB0YWtlIHNjcmVlbnNob3RzLCBldmFsdWF0ZSBpbiByZW5kZXJlciwgZXRjLikuIENvZGV4J3Ncbi8vIHByb2R1Y3Rpb24gYnVpbGQgc2V0cyB3ZWJQcmVmZXJlbmNlcy5kZXZUb29scz1mYWxzZSwgd2hpY2gga2lsbHMgdGhlXG4vLyBpbi13aW5kb3cgRGV2VG9vbHMgc2hvcnRjdXQsIGJ1dCBgLS1yZW1vdGUtZGVidWdnaW5nLXBvcnRgIHdvcmtzIHJlZ2FyZGxlc3Ncbi8vIGJlY2F1c2UgaXQncyBhIENocm9taXVtIGNvbW1hbmQtbGluZSBzd2l0Y2ggcHJvY2Vzc2VkIGJlZm9yZSBhcHAgaW5pdC5cbi8vXG4vLyBPZmYgYnkgZGVmYXVsdC4gU2V0IENPREVYUFBfUkVNT1RFX0RFQlVHPTEgKG9wdGlvbmFsbHkgQ09ERVhQUF9SRU1PVEVfREVCVUdfUE9SVClcbi8vIHRvIHR1cm4gaXQgb24uIE11c3QgYmUgYXBwZW5kZWQgYmVmb3JlIGBhcHBgIGJlY29tZXMgcmVhZHk7IHdlJ3JlIGF0IG1vZHVsZVxuLy8gdG9wLWxldmVsIHNvIHRoYXQncyBmaW5lLlxuaWYgKHByb2Nlc3MuZW52LkNPREVYUFBfUkVNT1RFX0RFQlVHID09PSBcIjFcIikge1xuICBjb25zdCBwb3J0ID0gcHJvY2Vzcy5lbnYuQ09ERVhQUF9SRU1PVEVfREVCVUdfUE9SVCA/PyBcIjkyMjJcIjtcbiAgYXBwLmNvbW1hbmRMaW5lLmFwcGVuZFN3aXRjaChcInJlbW90ZS1kZWJ1Z2dpbmctcG9ydFwiLCBwb3J0KTtcbiAgbG9nKFwiaW5mb1wiLCBgcmVtb3RlIGRlYnVnZ2luZyBlbmFibGVkIG9uIHBvcnQgJHtwb3J0fWApO1xufVxuXG5pbnRlcmZhY2UgUGVyc2lzdGVkU3RhdGUge1xuICBjb2RleFBsdXNQbHVzPzoge1xuICAgIGF1dG9VcGRhdGU/OiBib29sZWFuO1xuICAgIHNhZmVNb2RlPzogYm9vbGVhbjtcbiAgICB1cGRhdGVDaGFubmVsPzogU2VsZlVwZGF0ZUNoYW5uZWw7XG4gICAgdXBkYXRlUmVwbz86IHN0cmluZztcbiAgICB1cGRhdGVSZWY/OiBzdHJpbmc7XG4gICAgdXBkYXRlQ2hlY2s/OiBDb2RleFBsdXNQbHVzVXBkYXRlQ2hlY2s7XG4gIH07XG4gIC8qKiBQZXItdHdlYWsgZW5hYmxlIGZsYWdzLiBNaXNzaW5nIGVudHJpZXMgZGVmYXVsdCB0byBlbmFibGVkLiAqL1xuICB0d2Vha3M/OiBSZWNvcmQ8c3RyaW5nLCB7IGVuYWJsZWQ/OiBib29sZWFuIH0+O1xuICAvKiogQ2FjaGVkIEdpdEh1YiByZWxlYXNlIGNoZWNrcy4gUnVudGltZSBuZXZlciBhdXRvLWluc3RhbGxzIHVwZGF0ZXMuICovXG4gIHR3ZWFrVXBkYXRlQ2hlY2tzPzogUmVjb3JkPHN0cmluZywgVHdlYWtVcGRhdGVDaGVjaz47XG59XG5cbmludGVyZmFjZSBDb2RleFBsdXNQbHVzVXBkYXRlQ2hlY2sge1xuICBjaGVja2VkQXQ6IHN0cmluZztcbiAgY3VycmVudFZlcnNpb246IHN0cmluZztcbiAgbGF0ZXN0VmVyc2lvbjogc3RyaW5nIHwgbnVsbDtcbiAgcmVsZWFzZVVybDogc3RyaW5nIHwgbnVsbDtcbiAgcmVsZWFzZU5vdGVzOiBzdHJpbmcgfCBudWxsO1xuICB1cGRhdGVBdmFpbGFibGU6IGJvb2xlYW47XG4gIGVycm9yPzogc3RyaW5nO1xufVxuXG50eXBlIFNlbGZVcGRhdGVDaGFubmVsID0gXCJzdGFibGVcIiB8IFwicHJlcmVsZWFzZVwiIHwgXCJjdXN0b21cIjtcbnR5cGUgU2VsZlVwZGF0ZVN0YXR1cyA9IFwiY2hlY2tpbmdcIiB8IFwidXAtdG8tZGF0ZVwiIHwgXCJ1cGRhdGVkXCIgfCBcImZhaWxlZFwiIHwgXCJkaXNhYmxlZFwiO1xuXG5pbnRlcmZhY2UgU2VsZlVwZGF0ZVN0YXRlIHtcbiAgY2hlY2tlZEF0OiBzdHJpbmc7XG4gIGNvbXBsZXRlZEF0Pzogc3RyaW5nO1xuICBzdGF0dXM6IFNlbGZVcGRhdGVTdGF0dXM7XG4gIGN1cnJlbnRWZXJzaW9uOiBzdHJpbmc7XG4gIGxhdGVzdFZlcnNpb246IHN0cmluZyB8IG51bGw7XG4gIHRhcmdldFJlZjogc3RyaW5nIHwgbnVsbDtcbiAgcmVsZWFzZVVybDogc3RyaW5nIHwgbnVsbDtcbiAgcmVwbzogc3RyaW5nO1xuICBjaGFubmVsOiBTZWxmVXBkYXRlQ2hhbm5lbDtcbiAgc291cmNlUm9vdDogc3RyaW5nO1xuICBpbnN0YWxsYXRpb25Tb3VyY2U/OiBJbnN0YWxsYXRpb25Tb3VyY2U7XG4gIGVycm9yPzogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgSW5zdGFsbGF0aW9uU291cmNlIHtcbiAga2luZDogXCJnaXRodWItc291cmNlXCIgfCBcImhvbWVicmV3XCIgfCBcImxvY2FsLWRldlwiIHwgXCJzb3VyY2UtYXJjaGl2ZVwiIHwgXCJ1bmtub3duXCI7XG4gIGxhYmVsOiBzdHJpbmc7XG4gIGRldGFpbDogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgVHdlYWtVcGRhdGVDaGVjayB7XG4gIGNoZWNrZWRBdDogc3RyaW5nO1xuICByZXBvOiBzdHJpbmc7XG4gIGN1cnJlbnRWZXJzaW9uOiBzdHJpbmc7XG4gIGxhdGVzdFZlcnNpb246IHN0cmluZyB8IG51bGw7XG4gIGxhdGVzdFRhZzogc3RyaW5nIHwgbnVsbDtcbiAgcmVsZWFzZVVybDogc3RyaW5nIHwgbnVsbDtcbiAgdXBkYXRlQXZhaWxhYmxlOiBib29sZWFuO1xuICBlcnJvcj86IHN0cmluZztcbn1cblxuZnVuY3Rpb24gcmVhZFN0YXRlKCk6IFBlcnNpc3RlZFN0YXRlIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMoQ09ORklHX0ZJTEUsIFwidXRmOFwiKSkgYXMgUGVyc2lzdGVkU3RhdGU7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB7fTtcbiAgfVxufVxuZnVuY3Rpb24gd3JpdGVTdGF0ZShzOiBQZXJzaXN0ZWRTdGF0ZSk6IHZvaWQge1xuICB0cnkge1xuICAgIHdyaXRlRmlsZVN5bmMoQ09ORklHX0ZJTEUsIEpTT04uc3RyaW5naWZ5KHMsIG51bGwsIDIpKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZyhcIndhcm5cIiwgXCJ3cml0ZVN0YXRlIGZhaWxlZDpcIiwgU3RyaW5nKChlIGFzIEVycm9yKS5tZXNzYWdlKSk7XG4gIH1cbn1cbmZ1bmN0aW9uIGlzQ29kZXhQbHVzUGx1c0F1dG9VcGRhdGVFbmFibGVkKCk6IGJvb2xlYW4ge1xuICByZXR1cm4gcmVhZFN0YXRlKCkuY29kZXhQbHVzUGx1cz8uYXV0b1VwZGF0ZSAhPT0gZmFsc2U7XG59XG5mdW5jdGlvbiBzZXRDb2RleFBsdXNQbHVzQXV0b1VwZGF0ZShlbmFibGVkOiBib29sZWFuKTogdm9pZCB7XG4gIGNvbnN0IHMgPSByZWFkU3RhdGUoKTtcbiAgcy5jb2RleFBsdXNQbHVzID8/PSB7fTtcbiAgcy5jb2RleFBsdXNQbHVzLmF1dG9VcGRhdGUgPSBlbmFibGVkO1xuICB3cml0ZVN0YXRlKHMpO1xufVxuZnVuY3Rpb24gc2V0Q29kZXhQbHVzUGx1c1VwZGF0ZUNvbmZpZyhjb25maWc6IHtcbiAgdXBkYXRlQ2hhbm5lbD86IFNlbGZVcGRhdGVDaGFubmVsO1xuICB1cGRhdGVSZXBvPzogc3RyaW5nO1xuICB1cGRhdGVSZWY/OiBzdHJpbmc7XG59KTogdm9pZCB7XG4gIGNvbnN0IHMgPSByZWFkU3RhdGUoKTtcbiAgcy5jb2RleFBsdXNQbHVzID8/PSB7fTtcbiAgaWYgKGNvbmZpZy51cGRhdGVDaGFubmVsKSBzLmNvZGV4UGx1c1BsdXMudXBkYXRlQ2hhbm5lbCA9IGNvbmZpZy51cGRhdGVDaGFubmVsO1xuICBpZiAoXCJ1cGRhdGVSZXBvXCIgaW4gY29uZmlnKSBzLmNvZGV4UGx1c1BsdXMudXBkYXRlUmVwbyA9IGNsZWFuT3B0aW9uYWxTdHJpbmcoY29uZmlnLnVwZGF0ZVJlcG8pO1xuICBpZiAoXCJ1cGRhdGVSZWZcIiBpbiBjb25maWcpIHMuY29kZXhQbHVzUGx1cy51cGRhdGVSZWYgPSBjbGVhbk9wdGlvbmFsU3RyaW5nKGNvbmZpZy51cGRhdGVSZWYpO1xuICB3cml0ZVN0YXRlKHMpO1xufVxuZnVuY3Rpb24gaXNDb2RleFBsdXNQbHVzU2FmZU1vZGVFbmFibGVkKCk6IGJvb2xlYW4ge1xuICByZXR1cm4gcmVhZFN0YXRlKCkuY29kZXhQbHVzUGx1cz8uc2FmZU1vZGUgPT09IHRydWU7XG59XG5mdW5jdGlvbiBpc1R3ZWFrRW5hYmxlZChpZDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IHMgPSByZWFkU3RhdGUoKTtcbiAgaWYgKHMuY29kZXhQbHVzUGx1cz8uc2FmZU1vZGUgPT09IHRydWUpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIHMudHdlYWtzPy5baWRdPy5lbmFibGVkICE9PSBmYWxzZTtcbn1cbmZ1bmN0aW9uIHNldFR3ZWFrRW5hYmxlZChpZDogc3RyaW5nLCBlbmFibGVkOiBib29sZWFuKTogdm9pZCB7XG4gIGNvbnN0IHMgPSByZWFkU3RhdGUoKTtcbiAgcy50d2Vha3MgPz89IHt9O1xuICBzLnR3ZWFrc1tpZF0gPSB7IC4uLnMudHdlYWtzW2lkXSwgZW5hYmxlZCB9O1xuICB3cml0ZVN0YXRlKHMpO1xufVxuXG5pbnRlcmZhY2UgSW5zdGFsbGVyU3RhdGUge1xuICBhcHBSb290OiBzdHJpbmc7XG4gIGNvZGV4VmVyc2lvbjogc3RyaW5nIHwgbnVsbDtcbiAgc291cmNlUm9vdD86IHN0cmluZztcbn1cblxuZnVuY3Rpb24gcmVhZEluc3RhbGxlclN0YXRlKCk6IEluc3RhbGxlclN0YXRlIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKElOU1RBTExFUl9TVEFURV9GSUxFLCBcInV0ZjhcIikpIGFzIEluc3RhbGxlclN0YXRlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiByZWFkU2VsZlVwZGF0ZVN0YXRlKCk6IFNlbGZVcGRhdGVTdGF0ZSB8IG51bGwge1xuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhTRUxGX1VQREFURV9TVEFURV9GSUxFLCBcInV0ZjhcIikpIGFzIFNlbGZVcGRhdGVTdGF0ZTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbmZ1bmN0aW9uIHdyaXRlU2VsZlVwZGF0ZVN0YXRlKHN0YXRlOiBTZWxmVXBkYXRlU3RhdGUpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICB3cml0ZUZpbGVTeW5jKFNFTEZfVVBEQVRFX1NUQVRFX0ZJTEUsIEpTT04uc3RyaW5naWZ5KHN0YXRlLCBudWxsLCAyKSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2coXCJ3YXJuXCIsIFwid3JpdGVTZWxmVXBkYXRlU3RhdGUgZmFpbGVkOlwiLCBTdHJpbmcoKGUgYXMgRXJyb3IpLm1lc3NhZ2UpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjbGVhbk9wdGlvbmFsU3RyaW5nKHZhbHVlOiB1bmtub3duKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIikgcmV0dXJuIHVuZGVmaW5lZDtcbiAgY29uc3QgdHJpbW1lZCA9IHZhbHVlLnRyaW0oKTtcbiAgcmV0dXJuIHRyaW1tZWQgPyB0cmltbWVkIDogdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBpc1BhdGhJbnNpZGUocGFyZW50OiBzdHJpbmcsIHRhcmdldDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IHJlbCA9IHJlbGF0aXZlKHJlc29sdmUocGFyZW50KSwgcmVzb2x2ZSh0YXJnZXQpKTtcbiAgcmV0dXJuIHJlbCA9PT0gXCJcIiB8fCAoISFyZWwgJiYgIXJlbC5zdGFydHNXaXRoKFwiLi5cIikgJiYgIWlzQWJzb2x1dGUocmVsKSk7XG59XG5cbmZ1bmN0aW9uIGxvZyhsZXZlbDogXCJpbmZvXCIgfCBcIndhcm5cIiB8IFwiZXJyb3JcIiwgLi4uYXJnczogdW5rbm93bltdKTogdm9pZCB7XG4gIGNvbnN0IGxpbmUgPSBgWyR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpfV0gWyR7bGV2ZWx9XSAke2FyZ3NcbiAgICAubWFwKChhKSA9PiAodHlwZW9mIGEgPT09IFwic3RyaW5nXCIgPyBhIDogSlNPTi5zdHJpbmdpZnkoYSkpKVxuICAgIC5qb2luKFwiIFwiKX1cXG5gO1xuICB0cnkge1xuICAgIGFwcGVuZENhcHBlZExvZyhMT0dfRklMRSwgbGluZSk7XG4gIH0gY2F0Y2gge31cbiAgaWYgKGxldmVsID09PSBcImVycm9yXCIpIGNvbnNvbGUuZXJyb3IoXCJbY29kZXgtcGx1c3BsdXNdXCIsIC4uLmFyZ3MpO1xufVxuXG5mdW5jdGlvbiBpbnN0YWxsU3BhcmtsZVVwZGF0ZUhvb2soKTogdm9pZCB7XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtICE9PSBcImRhcndpblwiKSByZXR1cm47XG5cbiAgY29uc3QgTW9kdWxlID0gcmVxdWlyZShcIm5vZGU6bW9kdWxlXCIpIGFzIHR5cGVvZiBpbXBvcnQoXCJub2RlOm1vZHVsZVwiKSAmIHtcbiAgICBfbG9hZD86IChyZXF1ZXN0OiBzdHJpbmcsIHBhcmVudDogdW5rbm93biwgaXNNYWluOiBib29sZWFuKSA9PiB1bmtub3duO1xuICB9O1xuICBjb25zdCBvcmlnaW5hbExvYWQgPSBNb2R1bGUuX2xvYWQ7XG4gIGlmICh0eXBlb2Ygb3JpZ2luYWxMb2FkICE9PSBcImZ1bmN0aW9uXCIpIHJldHVybjtcblxuICBNb2R1bGUuX2xvYWQgPSBmdW5jdGlvbiBjb2RleFBsdXNQbHVzTW9kdWxlTG9hZChyZXF1ZXN0OiBzdHJpbmcsIHBhcmVudDogdW5rbm93biwgaXNNYWluOiBib29sZWFuKSB7XG4gICAgY29uc3QgbG9hZGVkID0gb3JpZ2luYWxMb2FkLmFwcGx5KHRoaXMsIFtyZXF1ZXN0LCBwYXJlbnQsIGlzTWFpbl0pIGFzIHVua25vd247XG4gICAgaWYgKHR5cGVvZiByZXF1ZXN0ID09PSBcInN0cmluZ1wiICYmIC9zcGFya2xlKD86XFwubm9kZSk/JC9pLnRlc3QocmVxdWVzdCkpIHtcbiAgICAgIHdyYXBTcGFya2xlRXhwb3J0cyhsb2FkZWQpO1xuICAgIH1cbiAgICByZXR1cm4gbG9hZGVkO1xuICB9O1xufVxuXG5mdW5jdGlvbiB3cmFwU3BhcmtsZUV4cG9ydHMobG9hZGVkOiB1bmtub3duKTogdm9pZCB7XG4gIGlmICghbG9hZGVkIHx8IHR5cGVvZiBsb2FkZWQgIT09IFwib2JqZWN0XCIpIHJldHVybjtcbiAgY29uc3QgZXhwb3J0cyA9IGxvYWRlZCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiAmIHsgX19jb2RleHBwU3BhcmtsZVdyYXBwZWQ/OiBib29sZWFuIH07XG4gIGlmIChleHBvcnRzLl9fY29kZXhwcFNwYXJrbGVXcmFwcGVkKSByZXR1cm47XG4gIGV4cG9ydHMuX19jb2RleHBwU3BhcmtsZVdyYXBwZWQgPSB0cnVlO1xuXG4gIGZvciAoY29uc3QgbmFtZSBvZiBbXCJpbnN0YWxsVXBkYXRlc0lmQXZhaWxhYmxlXCJdKSB7XG4gICAgY29uc3QgZm4gPSBleHBvcnRzW25hbWVdO1xuICAgIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikgY29udGludWU7XG4gICAgZXhwb3J0c1tuYW1lXSA9IGZ1bmN0aW9uIGNvZGV4UGx1c1BsdXNTcGFya2xlV3JhcHBlcih0aGlzOiB1bmtub3duLCAuLi5hcmdzOiB1bmtub3duW10pIHtcbiAgICAgIHByZXBhcmVTaWduZWRDb2RleEZvclNwYXJrbGVJbnN0YWxsKCk7XG4gICAgICByZXR1cm4gUmVmbGVjdC5hcHBseShmbiwgdGhpcywgYXJncyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChleHBvcnRzLmRlZmF1bHQgJiYgZXhwb3J0cy5kZWZhdWx0ICE9PSBleHBvcnRzKSB7XG4gICAgd3JhcFNwYXJrbGVFeHBvcnRzKGV4cG9ydHMuZGVmYXVsdCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJlcGFyZVNpZ25lZENvZGV4Rm9yU3BhcmtsZUluc3RhbGwoKTogdm9pZCB7XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtICE9PSBcImRhcndpblwiKSByZXR1cm47XG4gIGlmIChleGlzdHNTeW5jKFVQREFURV9NT0RFX0ZJTEUpKSB7XG4gICAgbG9nKFwiaW5mb1wiLCBcIlNwYXJrbGUgdXBkYXRlIHByZXAgc2tpcHBlZDsgdXBkYXRlIG1vZGUgYWxyZWFkeSBhY3RpdmVcIik7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICghZXhpc3RzU3luYyhTSUdORURfQ09ERVhfQkFDS1VQKSkge1xuICAgIGxvZyhcIndhcm5cIiwgXCJTcGFya2xlIHVwZGF0ZSBwcmVwIHNraXBwZWQ7IHNpZ25lZCBDb2RleC5hcHAgYmFja3VwIGlzIG1pc3NpbmdcIik7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICghaXNEZXZlbG9wZXJJZFNpZ25lZEFwcChTSUdORURfQ09ERVhfQkFDS1VQKSkge1xuICAgIGxvZyhcIndhcm5cIiwgXCJTcGFya2xlIHVwZGF0ZSBwcmVwIHNraXBwZWQ7IENvZGV4LmFwcCBiYWNrdXAgaXMgbm90IERldmVsb3BlciBJRCBzaWduZWRcIik7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3Qgc3RhdGUgPSByZWFkSW5zdGFsbGVyU3RhdGUoKTtcbiAgY29uc3QgYXBwUm9vdCA9IHN0YXRlPy5hcHBSb290ID8/IGluZmVyTWFjQXBwUm9vdCgpO1xuICBpZiAoIWFwcFJvb3QpIHtcbiAgICBsb2coXCJ3YXJuXCIsIFwiU3BhcmtsZSB1cGRhdGUgcHJlcCBza2lwcGVkOyBjb3VsZCBub3QgaW5mZXIgQ29kZXguYXBwIHBhdGhcIik7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgbW9kZSA9IHtcbiAgICBlbmFibGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICBhcHBSb290LFxuICAgIGNvZGV4VmVyc2lvbjogc3RhdGU/LmNvZGV4VmVyc2lvbiA/PyBudWxsLFxuICB9O1xuICB3cml0ZUZpbGVTeW5jKFVQREFURV9NT0RFX0ZJTEUsIEpTT04uc3RyaW5naWZ5KG1vZGUsIG51bGwsIDIpKTtcblxuICB0cnkge1xuICAgIGV4ZWNGaWxlU3luYyhcImRpdHRvXCIsIFtTSUdORURfQ09ERVhfQkFDS1VQLCBhcHBSb290XSwgeyBzdGRpbzogXCJpZ25vcmVcIiB9KTtcbiAgICB0cnkge1xuICAgICAgZXhlY0ZpbGVTeW5jKFwieGF0dHJcIiwgW1wiLWRyXCIsIFwiY29tLmFwcGxlLnF1YXJhbnRpbmVcIiwgYXBwUm9vdF0sIHsgc3RkaW86IFwiaWdub3JlXCIgfSk7XG4gICAgfSBjYXRjaCB7fVxuICAgIGxvZyhcImluZm9cIiwgXCJSZXN0b3JlZCBzaWduZWQgQ29kZXguYXBwIGJlZm9yZSBTcGFya2xlIGluc3RhbGxcIiwgeyBhcHBSb290IH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nKFwiZXJyb3JcIiwgXCJGYWlsZWQgdG8gcmVzdG9yZSBzaWduZWQgQ29kZXguYXBwIGJlZm9yZSBTcGFya2xlIGluc3RhbGxcIiwge1xuICAgICAgbWVzc2FnZTogKGUgYXMgRXJyb3IpLm1lc3NhZ2UsXG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNEZXZlbG9wZXJJZFNpZ25lZEFwcChhcHBSb290OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgcmVzdWx0ID0gc3Bhd25TeW5jKFwiY29kZXNpZ25cIiwgW1wiLWR2XCIsIFwiLS12ZXJib3NlPTRcIiwgYXBwUm9vdF0sIHtcbiAgICBlbmNvZGluZzogXCJ1dGY4XCIsXG4gICAgc3RkaW86IFtcImlnbm9yZVwiLCBcInBpcGVcIiwgXCJwaXBlXCJdLFxuICB9KTtcbiAgY29uc3Qgb3V0cHV0ID0gYCR7cmVzdWx0LnN0ZG91dCA/PyBcIlwifSR7cmVzdWx0LnN0ZGVyciA/PyBcIlwifWA7XG4gIHJldHVybiAoXG4gICAgcmVzdWx0LnN0YXR1cyA9PT0gMCAmJlxuICAgIC9BdXRob3JpdHk9RGV2ZWxvcGVyIElEIEFwcGxpY2F0aW9uOi8udGVzdChvdXRwdXQpICYmXG4gICAgIS9TaWduYXR1cmU9YWRob2MvLnRlc3Qob3V0cHV0KSAmJlxuICAgICEvVGVhbUlkZW50aWZpZXI9bm90IHNldC8udGVzdChvdXRwdXQpXG4gICk7XG59XG5cbmZ1bmN0aW9uIGluZmVyTWFjQXBwUm9vdCgpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgbWFya2VyID0gXCIuYXBwL0NvbnRlbnRzL01hY09TL1wiO1xuICBjb25zdCBpZHggPSBwcm9jZXNzLmV4ZWNQYXRoLmluZGV4T2YobWFya2VyKTtcbiAgcmV0dXJuIGlkeCA+PSAwID8gcHJvY2Vzcy5leGVjUGF0aC5zbGljZSgwLCBpZHggKyBcIi5hcHBcIi5sZW5ndGgpIDogbnVsbDtcbn1cblxuLy8gU3VyZmFjZSB1bmhhbmRsZWQgZXJyb3JzIGZyb20gYW55d2hlcmUgaW4gdGhlIG1haW4gcHJvY2VzcyB0byBvdXIgbG9nLlxucHJvY2Vzcy5vbihcInVuY2F1Z2h0RXhjZXB0aW9uXCIsIChlOiBFcnJvciAmIHsgY29kZT86IHN0cmluZyB9KSA9PiB7XG4gIGxvZyhcImVycm9yXCIsIFwidW5jYXVnaHRFeGNlcHRpb25cIiwgeyBjb2RlOiBlLmNvZGUsIG1lc3NhZ2U6IGUubWVzc2FnZSwgc3RhY2s6IGUuc3RhY2sgfSk7XG59KTtcbnByb2Nlc3Mub24oXCJ1bmhhbmRsZWRSZWplY3Rpb25cIiwgKGUpID0+IHtcbiAgbG9nKFwiZXJyb3JcIiwgXCJ1bmhhbmRsZWRSZWplY3Rpb25cIiwgeyB2YWx1ZTogU3RyaW5nKGUpIH0pO1xufSk7XG5cbmluc3RhbGxTcGFya2xlVXBkYXRlSG9vaygpO1xuXG5pbnRlcmZhY2UgTG9hZGVkTWFpblR3ZWFrIHtcbiAgc3RvcD86ICgpID0+IHZvaWQ7XG4gIHN0b3JhZ2U6IERpc2tTdG9yYWdlO1xufVxuXG5pbnRlcmZhY2UgQ29kZXhXaW5kb3dTZXJ2aWNlcyB7XG4gIGNyZWF0ZUZyZXNoTG9jYWxXaW5kb3c/OiAocm91dGU/OiBzdHJpbmcpID0+IFByb21pc2U8RWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGw+O1xuICBlbnN1cmVIb3N0V2luZG93PzogKGhvc3RJZD86IHN0cmluZykgPT4gUHJvbWlzZTxFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbD47XG4gIGdldFByaW1hcnlXaW5kb3c/OiAoaG9zdElkPzogc3RyaW5nKSA9PiBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbDtcbiAgZ2V0Q29udGV4dD86IChob3N0SWQ6IHN0cmluZykgPT4geyByZWdpc3RlcldpbmRvdz86ICh3aW5kb3dMaWtlOiBDb2RleFdpbmRvd0xpa2UpID0+IHZvaWQgfSB8IG51bGw7XG4gIHdpbmRvd01hbmFnZXI/OiB7XG4gICAgY3JlYXRlV2luZG93PzogKG9wdHM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSA9PiBQcm9taXNlPEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsPjtcbiAgICByZWdpc3RlcldpbmRvdz86IChcbiAgICAgIHdpbmRvd0xpa2U6IENvZGV4V2luZG93TGlrZSxcbiAgICAgIGhvc3RJZDogc3RyaW5nLFxuICAgICAgcHJpbWFyeTogYm9vbGVhbixcbiAgICAgIGFwcGVhcmFuY2U6IHN0cmluZyxcbiAgICApID0+IHZvaWQ7XG4gICAgb3B0aW9ucz86IHtcbiAgICAgIGFsbG93RGV2dG9vbHM/OiBib29sZWFuO1xuICAgICAgcHJlbG9hZFBhdGg/OiBzdHJpbmc7XG4gICAgfTtcbiAgfTtcbn1cblxuaW50ZXJmYWNlIENvZGV4V2luZG93TGlrZSB7XG4gIGlkOiBudW1iZXI7XG4gIHdlYkNvbnRlbnRzOiBFbGVjdHJvbi5XZWJDb250ZW50cztcbiAgb24oZXZlbnQ6IFwiY2xvc2VkXCIsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdW5rbm93bjtcbiAgb25jZT8oZXZlbnQ6IHN0cmluZywgbGlzdGVuZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpOiB1bmtub3duO1xuICBvZmY/KGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKTogdW5rbm93bjtcbiAgcmVtb3ZlTGlzdGVuZXI/KGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKTogdW5rbm93bjtcbiAgaXNEZXN0cm95ZWQ/KCk6IGJvb2xlYW47XG4gIGlzRm9jdXNlZD8oKTogYm9vbGVhbjtcbiAgZm9jdXM/KCk6IHZvaWQ7XG4gIHNob3c/KCk6IHZvaWQ7XG4gIGhpZGU/KCk6IHZvaWQ7XG4gIGdldEJvdW5kcz8oKTogRWxlY3Ryb24uUmVjdGFuZ2xlO1xuICBnZXRDb250ZW50Qm91bmRzPygpOiBFbGVjdHJvbi5SZWN0YW5nbGU7XG4gIGdldFNpemU/KCk6IFtudW1iZXIsIG51bWJlcl07XG4gIGdldENvbnRlbnRTaXplPygpOiBbbnVtYmVyLCBudW1iZXJdO1xuICBzZXRUaXRsZT8odGl0bGU6IHN0cmluZyk6IHZvaWQ7XG4gIGdldFRpdGxlPygpOiBzdHJpbmc7XG4gIHNldFJlcHJlc2VudGVkRmlsZW5hbWU/KGZpbGVuYW1lOiBzdHJpbmcpOiB2b2lkO1xuICBzZXREb2N1bWVudEVkaXRlZD8oZWRpdGVkOiBib29sZWFuKTogdm9pZDtcbiAgc2V0V2luZG93QnV0dG9uVmlzaWJpbGl0eT8odmlzaWJsZTogYm9vbGVhbik6IHZvaWQ7XG59XG5cbmludGVyZmFjZSBDb2RleENyZWF0ZVdpbmRvd09wdGlvbnMge1xuICByb3V0ZTogc3RyaW5nO1xuICBob3N0SWQ/OiBzdHJpbmc7XG4gIHNob3c/OiBib29sZWFuO1xuICBhcHBlYXJhbmNlPzogc3RyaW5nO1xuICBwYXJlbnRXaW5kb3dJZD86IG51bWJlcjtcbiAgYm91bmRzPzogRWxlY3Ryb24uUmVjdGFuZ2xlO1xufVxuXG5pbnRlcmZhY2UgQ29kZXhDcmVhdGVWaWV3T3B0aW9ucyB7XG4gIHJvdXRlOiBzdHJpbmc7XG4gIGhvc3RJZD86IHN0cmluZztcbiAgYXBwZWFyYW5jZT86IHN0cmluZztcbn1cblxuY29uc3QgdHdlYWtTdGF0ZSA9IHtcbiAgZGlzY292ZXJlZDogW10gYXMgRGlzY292ZXJlZFR3ZWFrW10sXG4gIGxvYWRlZE1haW46IG5ldyBNYXA8c3RyaW5nLCBMb2FkZWRNYWluVHdlYWs+KCksXG59O1xuXG5jb25zdCB0d2Vha0xpZmVjeWNsZURlcHMgPSB7XG4gIGxvZ0luZm86IChtZXNzYWdlOiBzdHJpbmcpID0+IGxvZyhcImluZm9cIiwgbWVzc2FnZSksXG4gIHNldFR3ZWFrRW5hYmxlZCxcbiAgc3RvcEFsbE1haW5Ud2Vha3MsXG4gIGNsZWFyVHdlYWtNb2R1bGVDYWNoZSxcbiAgbG9hZEFsbE1haW5Ud2Vha3MsXG4gIGJyb2FkY2FzdFJlbG9hZCxcbn07XG5cbi8vIDEuIEhvb2sgZXZlcnkgc2Vzc2lvbiBzbyBvdXIgcHJlbG9hZCBydW5zIGluIGV2ZXJ5IHJlbmRlcmVyLlxuLy9cbi8vIFdlIHVzZSBFbGVjdHJvbidzIG1vZGVybiBgc2Vzc2lvbi5yZWdpc3RlclByZWxvYWRTY3JpcHRgIEFQSSAoYWRkZWQgaW5cbi8vIEVsZWN0cm9uIDM1KS4gVGhlIGRlcHJlY2F0ZWQgYHNldFByZWxvYWRzYCBwYXRoIHNpbGVudGx5IG5vLW9wcyBpbiBzb21lXG4vLyBjb25maWd1cmF0aW9ucyAobm90YWJseSB3aXRoIHNhbmRib3hlZCByZW5kZXJlcnMpLCBzbyByZWdpc3RlclByZWxvYWRTY3JpcHRcbi8vIGlzIHRoZSBvbmx5IHJlbGlhYmxlIHdheSB0byBpbmplY3QgaW50byBDb2RleCdzIEJyb3dzZXJXaW5kb3dzLlxuZnVuY3Rpb24gcmVnaXN0ZXJQcmVsb2FkKHM6IEVsZWN0cm9uLlNlc3Npb24sIGxhYmVsOiBzdHJpbmcpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICBjb25zdCByZWcgPSAocyBhcyB1bmtub3duIGFzIHtcbiAgICAgIHJlZ2lzdGVyUHJlbG9hZFNjcmlwdD86IChvcHRzOiB7XG4gICAgICAgIHR5cGU/OiBcImZyYW1lXCIgfCBcInNlcnZpY2Utd29ya2VyXCI7XG4gICAgICAgIGlkPzogc3RyaW5nO1xuICAgICAgICBmaWxlUGF0aDogc3RyaW5nO1xuICAgICAgfSkgPT4gc3RyaW5nO1xuICAgIH0pLnJlZ2lzdGVyUHJlbG9hZFNjcmlwdDtcbiAgICBpZiAodHlwZW9mIHJlZyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICByZWcuY2FsbChzLCB7IHR5cGU6IFwiZnJhbWVcIiwgZmlsZVBhdGg6IFBSRUxPQURfUEFUSCwgaWQ6IFwiY29kZXgtcGx1c3BsdXNcIiB9KTtcbiAgICAgIGxvZyhcImluZm9cIiwgYHByZWxvYWQgcmVnaXN0ZXJlZCAocmVnaXN0ZXJQcmVsb2FkU2NyaXB0KSBvbiAke2xhYmVsfTpgLCBQUkVMT0FEX1BBVEgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBGYWxsYmFjayBmb3Igb2xkZXIgRWxlY3Ryb24gdmVyc2lvbnMuXG4gICAgY29uc3QgZXhpc3RpbmcgPSBzLmdldFByZWxvYWRzKCk7XG4gICAgaWYgKCFleGlzdGluZy5pbmNsdWRlcyhQUkVMT0FEX1BBVEgpKSB7XG4gICAgICBzLnNldFByZWxvYWRzKFsuLi5leGlzdGluZywgUFJFTE9BRF9QQVRIXSk7XG4gICAgfVxuICAgIGxvZyhcImluZm9cIiwgYHByZWxvYWQgcmVnaXN0ZXJlZCAoc2V0UHJlbG9hZHMpIG9uICR7bGFiZWx9OmAsIFBSRUxPQURfUEFUSCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBpZiAoZSBpbnN0YW5jZW9mIEVycm9yICYmIGUubWVzc2FnZS5pbmNsdWRlcyhcImV4aXN0aW5nIElEXCIpKSB7XG4gICAgICBsb2coXCJpbmZvXCIsIGBwcmVsb2FkIGFscmVhZHkgcmVnaXN0ZXJlZCBvbiAke2xhYmVsfTpgLCBQUkVMT0FEX1BBVEgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsb2coXCJlcnJvclwiLCBgcHJlbG9hZCByZWdpc3RyYXRpb24gb24gJHtsYWJlbH0gZmFpbGVkOmAsIGUpO1xuICB9XG59XG5cbmFwcC53aGVuUmVhZHkoKS50aGVuKCgpID0+IHtcbiAgbG9nKFwiaW5mb1wiLCBcImFwcCByZWFkeSBmaXJlZFwiKTtcbiAgaWYgKGlzQ29kZXhQbHVzUGx1c1NhZmVNb2RlRW5hYmxlZCgpKSB7XG4gICAgbG9nKFwid2FyblwiLCBcInNhZmUgbW9kZSBpcyBlbmFibGVkOyBwcmVsb2FkIHdpbGwgbm90IGJlIHJlZ2lzdGVyZWRcIik7XG4gICAgcmV0dXJuO1xuICB9XG4gIHJlZ2lzdGVyUHJlbG9hZChzZXNzaW9uLmRlZmF1bHRTZXNzaW9uLCBcImRlZmF1bHRTZXNzaW9uXCIpO1xufSk7XG5cbmFwcC5vbihcInNlc3Npb24tY3JlYXRlZFwiLCAocykgPT4ge1xuICBpZiAoaXNDb2RleFBsdXNQbHVzU2FmZU1vZGVFbmFibGVkKCkpIHJldHVybjtcbiAgcmVnaXN0ZXJQcmVsb2FkKHMsIFwic2Vzc2lvbi1jcmVhdGVkXCIpO1xufSk7XG5cbi8vIERJQUdOT1NUSUM6IGxvZyBldmVyeSB3ZWJDb250ZW50cyBjcmVhdGlvbi4gVXNlZnVsIGZvciB2ZXJpZnlpbmcgb3VyXG4vLyBwcmVsb2FkIHJlYWNoZXMgZXZlcnkgcmVuZGVyZXIgQ29kZXggc3Bhd25zLlxuYXBwLm9uKFwid2ViLWNvbnRlbnRzLWNyZWF0ZWRcIiwgKF9lLCB3YykgPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IHdwID0gKHdjIGFzIHVua25vd24gYXMgeyBnZXRMYXN0V2ViUHJlZmVyZW5jZXM/OiAoKSA9PiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB9KVxuICAgICAgLmdldExhc3RXZWJQcmVmZXJlbmNlcz8uKCk7XG4gICAgbG9nKFwiaW5mb1wiLCBcIndlYi1jb250ZW50cy1jcmVhdGVkXCIsIHtcbiAgICAgIGlkOiB3Yy5pZCxcbiAgICAgIHR5cGU6IHdjLmdldFR5cGUoKSxcbiAgICAgIHNlc3Npb25Jc0RlZmF1bHQ6IHdjLnNlc3Npb24gPT09IHNlc3Npb24uZGVmYXVsdFNlc3Npb24sXG4gICAgICBzYW5kYm94OiB3cD8uc2FuZGJveCxcbiAgICAgIGNvbnRleHRJc29sYXRpb246IHdwPy5jb250ZXh0SXNvbGF0aW9uLFxuICAgIH0pO1xuICAgIHdjLm9uKFwicHJlbG9hZC1lcnJvclwiLCAoX2V2LCBwLCBlcnIpID0+IHtcbiAgICAgIGxvZyhcImVycm9yXCIsIGB3YyAke3djLmlkfSBwcmVsb2FkLWVycm9yIHBhdGg9JHtwfWAsIFN0cmluZyhlcnI/LnN0YWNrID8/IGVycikpO1xuICAgIH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nKFwiZXJyb3JcIiwgXCJ3ZWItY29udGVudHMtY3JlYXRlZCBoYW5kbGVyIGZhaWxlZDpcIiwgU3RyaW5nKChlIGFzIEVycm9yKT8uc3RhY2sgPz8gZSkpO1xuICB9XG59KTtcblxubG9nKFwiaW5mb1wiLCBcIm1haW4udHMgZXZhbHVhdGVkOyBhcHAuaXNSZWFkeT1cIiArIGFwcC5pc1JlYWR5KCkpO1xuaWYgKGlzQ29kZXhQbHVzUGx1c1NhZmVNb2RlRW5hYmxlZCgpKSB7XG4gIGxvZyhcIndhcm5cIiwgXCJzYWZlIG1vZGUgaXMgZW5hYmxlZDsgdHdlYWtzIHdpbGwgbm90IGJlIGxvYWRlZFwiKTtcbn1cblxuLy8gMi4gSW5pdGlhbCB0d2VhayBkaXNjb3ZlcnkgKyBtYWluLXNjb3BlIGxvYWQuXG5sb2FkQWxsTWFpblR3ZWFrcygpO1xuXG5hcHAub24oXCJ3aWxsLXF1aXRcIiwgKCkgPT4ge1xuICBzdG9wQWxsTWFpblR3ZWFrcygpO1xuICAvLyBCZXN0LWVmZm9ydCBmbHVzaCBvZiBhbnkgcGVuZGluZyBzdG9yYWdlIHdyaXRlcy5cbiAgZm9yIChjb25zdCB0IG9mIHR3ZWFrU3RhdGUubG9hZGVkTWFpbi52YWx1ZXMoKSkge1xuICAgIHRyeSB7XG4gICAgICB0LnN0b3JhZ2UuZmx1c2goKTtcbiAgICB9IGNhdGNoIHt9XG4gIH1cbn0pO1xuXG4vLyAzLiBJUEM6IGV4cG9zZSB0d2VhayBtZXRhZGF0YSArIHJldmVhbC1pbi1maW5kZXIuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6bGlzdC10d2Vha3NcIiwgYXN5bmMgKCkgPT4ge1xuICBhd2FpdCBQcm9taXNlLmFsbCh0d2Vha1N0YXRlLmRpc2NvdmVyZWQubWFwKCh0KSA9PiBlbnN1cmVUd2Vha1VwZGF0ZUNoZWNrKHQpKSk7XG4gIGNvbnN0IHVwZGF0ZUNoZWNrcyA9IHJlYWRTdGF0ZSgpLnR3ZWFrVXBkYXRlQ2hlY2tzID8/IHt9O1xuICByZXR1cm4gdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLm1hcCgodCkgPT4gKHtcbiAgICBtYW5pZmVzdDogdC5tYW5pZmVzdCxcbiAgICBlbnRyeTogdC5lbnRyeSxcbiAgICBkaXI6IHQuZGlyLFxuICAgIGVudHJ5RXhpc3RzOiBleGlzdHNTeW5jKHQuZW50cnkpLFxuICAgIGVuYWJsZWQ6IGlzVHdlYWtFbmFibGVkKHQubWFuaWZlc3QuaWQpLFxuICAgIHVwZGF0ZTogdXBkYXRlQ2hlY2tzW3QubWFuaWZlc3QuaWRdID8/IG51bGwsXG4gIH0pKTtcbn0pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Z2V0LXR3ZWFrLWVuYWJsZWRcIiwgKF9lLCBpZDogc3RyaW5nKSA9PiBpc1R3ZWFrRW5hYmxlZChpZCkpO1xuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOnNldC10d2Vhay1lbmFibGVkXCIsIChfZSwgaWQ6IHN0cmluZywgZW5hYmxlZDogYm9vbGVhbikgPT4ge1xuICByZXR1cm4gc2V0VHdlYWtFbmFibGVkQW5kUmVsb2FkKGlkLCBlbmFibGVkLCB0d2Vha0xpZmVjeWNsZURlcHMpO1xufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpnZXQtY29uZmlnXCIsICgpID0+IHtcbiAgY29uc3QgcyA9IHJlYWRTdGF0ZSgpO1xuICBjb25zdCBpbnN0YWxsZXJTdGF0ZSA9IHJlYWRJbnN0YWxsZXJTdGF0ZSgpO1xuICBjb25zdCBzb3VyY2VSb290ID0gaW5zdGFsbGVyU3RhdGU/LnNvdXJjZVJvb3QgPz8gZmFsbGJhY2tTb3VyY2VSb290KCk7XG4gIHJldHVybiB7XG4gICAgdmVyc2lvbjogQ09ERVhfUExVU1BMVVNfVkVSU0lPTixcbiAgICBhdXRvVXBkYXRlOiBzLmNvZGV4UGx1c1BsdXM/LmF1dG9VcGRhdGUgIT09IGZhbHNlLFxuICAgIHNhZmVNb2RlOiBzLmNvZGV4UGx1c1BsdXM/LnNhZmVNb2RlID09PSB0cnVlLFxuICAgIHVwZGF0ZUNoYW5uZWw6IHMuY29kZXhQbHVzUGx1cz8udXBkYXRlQ2hhbm5lbCA/PyBcInN0YWJsZVwiLFxuICAgIHVwZGF0ZVJlcG86IHMuY29kZXhQbHVzUGx1cz8udXBkYXRlUmVwbyA/PyBDT0RFWF9QTFVTUExVU19SRVBPLFxuICAgIHVwZGF0ZVJlZjogcy5jb2RleFBsdXNQbHVzPy51cGRhdGVSZWYgPz8gXCJcIixcbiAgICB1cGRhdGVDaGVjazogcy5jb2RleFBsdXNQbHVzPy51cGRhdGVDaGVjayA/PyBudWxsLFxuICAgIHNlbGZVcGRhdGU6IHJlYWRTZWxmVXBkYXRlU3RhdGUoKSxcbiAgICBpbnN0YWxsYXRpb25Tb3VyY2U6IGRlc2NyaWJlSW5zdGFsbGF0aW9uU291cmNlKHNvdXJjZVJvb3QpLFxuICB9O1xufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpzZXQtYXV0by11cGRhdGVcIiwgKF9lLCBlbmFibGVkOiBib29sZWFuKSA9PiB7XG4gIHNldENvZGV4UGx1c1BsdXNBdXRvVXBkYXRlKCEhZW5hYmxlZCk7XG4gIHJldHVybiB7IGF1dG9VcGRhdGU6IGlzQ29kZXhQbHVzUGx1c0F1dG9VcGRhdGVFbmFibGVkKCkgfTtcbn0pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6c2V0LXVwZGF0ZS1jb25maWdcIiwgKF9lLCBjb25maWc6IHtcbiAgdXBkYXRlQ2hhbm5lbD86IFNlbGZVcGRhdGVDaGFubmVsO1xuICB1cGRhdGVSZXBvPzogc3RyaW5nO1xuICB1cGRhdGVSZWY/OiBzdHJpbmc7XG59KSA9PiB7XG4gIHNldENvZGV4UGx1c1BsdXNVcGRhdGVDb25maWcoY29uZmlnKTtcbiAgY29uc3QgcyA9IHJlYWRTdGF0ZSgpO1xuICByZXR1cm4ge1xuICAgIHVwZGF0ZUNoYW5uZWw6IHMuY29kZXhQbHVzUGx1cz8udXBkYXRlQ2hhbm5lbCA/PyBcInN0YWJsZVwiLFxuICAgIHVwZGF0ZVJlcG86IHMuY29kZXhQbHVzUGx1cz8udXBkYXRlUmVwbyA/PyBDT0RFWF9QTFVTUExVU19SRVBPLFxuICAgIHVwZGF0ZVJlZjogcy5jb2RleFBsdXNQbHVzPy51cGRhdGVSZWYgPz8gXCJcIixcbiAgfTtcbn0pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Y2hlY2stY29kZXhwcC11cGRhdGVcIiwgYXN5bmMgKF9lLCBmb3JjZT86IGJvb2xlYW4pID0+IHtcbiAgcmV0dXJuIGVuc3VyZUNvZGV4UGx1c1BsdXNVcGRhdGVDaGVjayhmb3JjZSA9PT0gdHJ1ZSk7XG59KTtcblxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOnJ1bi1jb2RleHBwLXVwZGF0ZVwiLCBhc3luYyAoKSA9PiB7XG4gIGNvbnN0IHNvdXJjZVJvb3QgPSByZWFkSW5zdGFsbGVyU3RhdGUoKT8uc291cmNlUm9vdCA/PyBmYWxsYmFja1NvdXJjZVJvb3QoKTtcbiAgaWYgKCFzb3VyY2VSb290KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ29kZXgrKyBzb3VyY2UgQ0xJIHdhcyBub3QgZm91bmQuIFJ1biB0aGUgaW5zdGFsbGVyIG9uY2UsIHRoZW4gdHJ5IGFnYWluLlwiKTtcbiAgfVxuICBjb25zdCBjbGkgPSBqb2luKHNvdXJjZVJvb3QsIFwicGFja2FnZXNcIiwgXCJpbnN0YWxsZXJcIiwgXCJkaXN0XCIsIFwiY2xpLmpzXCIpO1xuICBpZiAoIWV4aXN0c1N5bmMoY2xpKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNvZGV4Kysgc291cmNlIENMSSB3YXMgbm90IGZvdW5kLiBSdW4gdGhlIGluc3RhbGxlciBvbmNlLCB0aGVuIHRyeSBhZ2Fpbi5cIik7XG4gIH1cbiAgY29uc3QgcGVuZGluZyA9IG1hcmtTZWxmVXBkYXRlU3RhcnRlZChzb3VyY2VSb290KTtcbiAgc3RhcnRJbnN0YWxsZWRDbGkoY2xpLCBbXCJ1cGRhdGVcIiwgXCItLXdhdGNoZXJcIl0pO1xuICByZXR1cm4gcGVuZGluZztcbn0pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Z2V0LXdhdGNoZXItaGVhbHRoXCIsICgpID0+IGdldFdhdGNoZXJIZWFsdGgodXNlclJvb3QhKSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpnZXQtdHdlYWstc3RvcmVcIiwgYXN5bmMgKCkgPT4ge1xuICBjb25zdCBzdG9yZSA9IGF3YWl0IGZldGNoVHdlYWtTdG9yZVJlZ2lzdHJ5KCk7XG4gIGNvbnN0IHJlZ2lzdHJ5ID0gc3RvcmUucmVnaXN0cnk7XG4gIGNvbnN0IGluc3RhbGxlZCA9IG5ldyBNYXAodHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLm1hcCgodCkgPT4gW3QubWFuaWZlc3QuaWQsIHRdKSk7XG4gIGNvbnN0IGVudHJpZXMgPSBzaHVmZmxlU3RvcmVFbnRyaWVzKHJlZ2lzdHJ5LmVudHJpZXMsIHJhbmRvbUludCk7XG4gIHJldHVybiB7XG4gICAgLi4ucmVnaXN0cnksXG4gICAgc291cmNlVXJsOiBUV0VBS19TVE9SRV9JTkRFWF9VUkwsXG4gICAgZmV0Y2hlZEF0OiBzdG9yZS5mZXRjaGVkQXQsXG4gICAgZW50cmllczogZW50cmllcy5tYXAoKGVudHJ5KSA9PiB7XG4gICAgICBjb25zdCBsb2NhbCA9IGluc3RhbGxlZC5nZXQoZW50cnkuaWQpO1xuICAgICAgY29uc3QgcGxhdGZvcm0gPSBzdG9yZUVudHJ5UGxhdGZvcm1Db21wYXRpYmlsaXR5KGVudHJ5KTtcbiAgICAgIGNvbnN0IHJ1bnRpbWUgPSBzdG9yZUVudHJ5UnVudGltZUNvbXBhdGliaWxpdHkoZW50cnkpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4uZW50cnksXG4gICAgICAgIHBsYXRmb3JtLFxuICAgICAgICBydW50aW1lLFxuICAgICAgICBpbnN0YWxsZWQ6IGxvY2FsXG4gICAgICAgICAgPyB7XG4gICAgICAgICAgICAgIHZlcnNpb246IGxvY2FsLm1hbmlmZXN0LnZlcnNpb24sXG4gICAgICAgICAgICAgIGVuYWJsZWQ6IGlzVHdlYWtFbmFibGVkKGxvY2FsLm1hbmlmZXN0LmlkKSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICA6IG51bGwsXG4gICAgICB9O1xuICAgIH0pLFxuICB9O1xufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDppbnN0YWxsLXN0b3JlLXR3ZWFrXCIsIGFzeW5jIChfZSwgaWQ6IHN0cmluZykgPT4ge1xuICBjb25zdCB7IHJlZ2lzdHJ5IH0gPSBhd2FpdCBmZXRjaFR3ZWFrU3RvcmVSZWdpc3RyeSgpO1xuICBjb25zdCBlbnRyeSA9IHJlZ2lzdHJ5LmVudHJpZXMuZmluZCgoY2FuZGlkYXRlKSA9PiBjYW5kaWRhdGUuaWQgPT09IGlkKTtcbiAgaWYgKCFlbnRyeSkgdGhyb3cgbmV3IEVycm9yKGBUd2VhayBzdG9yZSBlbnRyeSBub3QgZm91bmQ6ICR7aWR9YCk7XG4gIGFzc2VydFN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGlibGUoZW50cnkpO1xuICBhc3NlcnRTdG9yZUVudHJ5UnVudGltZUNvbXBhdGlibGUoZW50cnkpO1xuICBhd2FpdCBpbnN0YWxsU3RvcmVUd2VhayhlbnRyeSk7XG4gIHJlbG9hZFR3ZWFrcyhcInN0b3JlLWluc3RhbGxcIiwgdHdlYWtMaWZlY3ljbGVEZXBzKTtcbiAgcmV0dXJuIHsgaW5zdGFsbGVkOiBlbnRyeS5pZCB9O1xufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpwcmVwYXJlLXR3ZWFrLXN0b3JlLXN1Ym1pc3Npb25cIiwgYXN5bmMgKF9lLCByZXBvSW5wdXQ6IHN0cmluZykgPT4ge1xuICByZXR1cm4gcHJlcGFyZVR3ZWFrU3RvcmVTdWJtaXNzaW9uKHJlcG9JbnB1dCk7XG59KTtcblxuLy8gU2FuZGJveGVkIHJlbmRlcmVyIHByZWxvYWQgY2FuJ3QgdXNlIE5vZGUgZnMgdG8gcmVhZCB0d2VhayBzb3VyY2UuIE1haW5cbi8vIHJlYWRzIGl0IG9uIHRoZSByZW5kZXJlcidzIGJlaGFsZi4gUGF0aCBtdXN0IGxpdmUgdW5kZXIgdHdlYWtzRGlyIGZvclxuLy8gc2VjdXJpdHkgXHUyMDE0IHdlIHJlZnVzZSBhbnl0aGluZyBlbHNlLlxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOnJlYWQtdHdlYWstc291cmNlXCIsIChfZSwgZW50cnlQYXRoOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgcmVzb2x2ZWQgPSByZXNvbHZlKGVudHJ5UGF0aCk7XG4gIGlmICghaXNQYXRoSW5zaWRlKFRXRUFLU19ESVIsIHJlc29sdmVkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcInBhdGggb3V0c2lkZSB0d2Vha3MgZGlyXCIpO1xuICB9XG4gIHJldHVybiByZXF1aXJlKFwibm9kZTpmc1wiKS5yZWFkRmlsZVN5bmMocmVzb2x2ZWQsIFwidXRmOFwiKTtcbn0pO1xuXG4vKipcbiAqIFJlYWQgYW4gYXJiaXRyYXJ5IGFzc2V0IGZpbGUgZnJvbSBpbnNpZGUgYSB0d2VhaydzIGRpcmVjdG9yeSBhbmQgcmV0dXJuIGl0XG4gKiBhcyBhIGBkYXRhOmAgVVJMLiBVc2VkIGJ5IHRoZSBzZXR0aW5ncyBpbmplY3RvciB0byByZW5kZXIgbWFuaWZlc3QgaWNvbnNcbiAqICh0aGUgcmVuZGVyZXIgaXMgc2FuZGJveGVkOyBgZmlsZTovL2Agd29uJ3QgbG9hZCkuXG4gKlxuICogU2VjdXJpdHk6IGNhbGxlciBwYXNzZXMgYHR3ZWFrRGlyYCBhbmQgYHJlbFBhdGhgOyB3ZSAoMSkgcmVxdWlyZSB0d2Vha0RpclxuICogdG8gbGl2ZSB1bmRlciBUV0VBS1NfRElSLCAoMikgcmVzb2x2ZSByZWxQYXRoIGFnYWluc3QgaXQgYW5kIHJlLWNoZWNrIHRoZVxuICogcmVzdWx0IHN0aWxsIGxpdmVzIHVuZGVyIFRXRUFLU19ESVIsICgzKSBjYXAgb3V0cHV0IHNpemUgYXQgMSBNaUIuXG4gKi9cbmNvbnN0IEFTU0VUX01BWF9CWVRFUyA9IDEwMjQgKiAxMDI0O1xuY29uc3QgTUlNRV9CWV9FWFQ6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIFwiLnBuZ1wiOiBcImltYWdlL3BuZ1wiLFxuICBcIi5qcGdcIjogXCJpbWFnZS9qcGVnXCIsXG4gIFwiLmpwZWdcIjogXCJpbWFnZS9qcGVnXCIsXG4gIFwiLmdpZlwiOiBcImltYWdlL2dpZlwiLFxuICBcIi53ZWJwXCI6IFwiaW1hZ2Uvd2VicFwiLFxuICBcIi5zdmdcIjogXCJpbWFnZS9zdmcreG1sXCIsXG4gIFwiLmljb1wiOiBcImltYWdlL3gtaWNvblwiLFxufTtcbmlwY01haW4uaGFuZGxlKFxuICBcImNvZGV4cHA6cmVhZC10d2Vhay1hc3NldFwiLFxuICAoX2UsIHR3ZWFrRGlyOiBzdHJpbmcsIHJlbFBhdGg6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IGZzID0gcmVxdWlyZShcIm5vZGU6ZnNcIikgYXMgdHlwZW9mIGltcG9ydChcIm5vZGU6ZnNcIik7XG4gICAgY29uc3QgZGlyID0gcmVzb2x2ZSh0d2Vha0Rpcik7XG4gICAgaWYgKCFpc1BhdGhJbnNpZGUoVFdFQUtTX0RJUiwgZGlyKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwidHdlYWtEaXIgb3V0c2lkZSB0d2Vha3MgZGlyXCIpO1xuICAgIH1cbiAgICBjb25zdCBmdWxsID0gcmVzb2x2ZShkaXIsIHJlbFBhdGgpO1xuICAgIGlmICghaXNQYXRoSW5zaWRlKGRpciwgZnVsbCkgfHwgZnVsbCA9PT0gZGlyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwYXRoIHRyYXZlcnNhbFwiKTtcbiAgICB9XG4gICAgY29uc3Qgc3RhdCA9IGZzLnN0YXRTeW5jKGZ1bGwpO1xuICAgIGlmIChzdGF0LnNpemUgPiBBU1NFVF9NQVhfQllURVMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgYXNzZXQgdG9vIGxhcmdlICgke3N0YXQuc2l6ZX0gPiAke0FTU0VUX01BWF9CWVRFU30pYCk7XG4gICAgfVxuICAgIGNvbnN0IGV4dCA9IGZ1bGwuc2xpY2UoZnVsbC5sYXN0SW5kZXhPZihcIi5cIikpLnRvTG93ZXJDYXNlKCk7XG4gICAgY29uc3QgbWltZSA9IE1JTUVfQllfRVhUW2V4dF0gPz8gXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIjtcbiAgICBjb25zdCBidWYgPSBmcy5yZWFkRmlsZVN5bmMoZnVsbCk7XG4gICAgcmV0dXJuIGBkYXRhOiR7bWltZX07YmFzZTY0LCR7YnVmLnRvU3RyaW5nKFwiYmFzZTY0XCIpfWA7XG4gIH0sXG4pO1xuXG4vLyBTYW5kYm94ZWQgcHJlbG9hZCBjYW4ndCB3cml0ZSBsb2dzIHRvIGRpc2s7IGZvcndhcmQgdG8gdXMgdmlhIElQQy5cbmlwY01haW4ub24oXCJjb2RleHBwOnByZWxvYWQtbG9nXCIsIChfZSwgbGV2ZWw6IFwiaW5mb1wiIHwgXCJ3YXJuXCIgfCBcImVycm9yXCIsIG1zZzogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IGx2bCA9IGxldmVsID09PSBcImVycm9yXCIgfHwgbGV2ZWwgPT09IFwid2FyblwiID8gbGV2ZWwgOiBcImluZm9cIjtcbiAgdHJ5IHtcbiAgICBhcHBlbmRDYXBwZWRMb2coam9pbihMT0dfRElSLCBcInByZWxvYWQubG9nXCIpLCBgWyR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpfV0gWyR7bHZsfV0gJHttc2d9XFxuYCk7XG4gIH0gY2F0Y2gge31cbn0pO1xuXG4vLyBTYW5kYm94LXNhZmUgZmlsZXN5c3RlbSBvcHMgZm9yIHJlbmRlcmVyLXNjb3BlIHR3ZWFrcy4gRWFjaCB0d2VhayBnZXRzXG4vLyBhIHNhbmRib3hlZCBkaXIgdW5kZXIgdXNlclJvb3QvdHdlYWstZGF0YS88aWQ+LiBSZW5kZXJlciBzaWRlIGNhbGxzIHRoZXNlXG4vLyBvdmVyIElQQyBpbnN0ZWFkIG9mIHVzaW5nIE5vZGUgZnMgZGlyZWN0bHkuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6dHdlYWstZnNcIiwgKF9lLCBvcDogc3RyaW5nLCBpZDogc3RyaW5nLCBwOiBzdHJpbmcsIGM/OiBzdHJpbmcpID0+IHtcbiAgaWYgKCEvXlthLXpBLVowLTkuXy1dKyQvLnRlc3QoaWQpKSB0aHJvdyBuZXcgRXJyb3IoXCJiYWQgdHdlYWsgaWRcIik7XG4gIGNvbnN0IGRpciA9IGpvaW4odXNlclJvb3QhLCBcInR3ZWFrLWRhdGFcIiwgaWQpO1xuICBta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgY29uc3QgZnVsbCA9IHJlc29sdmUoZGlyLCBwKTtcbiAgaWYgKCFpc1BhdGhJbnNpZGUoZGlyLCBmdWxsKSB8fCBmdWxsID09PSBkaXIpIHRocm93IG5ldyBFcnJvcihcInBhdGggdHJhdmVyc2FsXCIpO1xuICBjb25zdCBmcyA9IHJlcXVpcmUoXCJub2RlOmZzXCIpIGFzIHR5cGVvZiBpbXBvcnQoXCJub2RlOmZzXCIpO1xuICBzd2l0Y2ggKG9wKSB7XG4gICAgY2FzZSBcInJlYWRcIjogcmV0dXJuIGZzLnJlYWRGaWxlU3luYyhmdWxsLCBcInV0ZjhcIik7XG4gICAgY2FzZSBcIndyaXRlXCI6IHJldHVybiBmcy53cml0ZUZpbGVTeW5jKGZ1bGwsIGMgPz8gXCJcIiwgXCJ1dGY4XCIpO1xuICAgIGNhc2UgXCJleGlzdHNcIjogcmV0dXJuIGZzLmV4aXN0c1N5bmMoZnVsbCk7XG4gICAgY2FzZSBcImRhdGFEaXJcIjogcmV0dXJuIGRpcjtcbiAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoYHVua25vd24gb3A6ICR7b3B9YCk7XG4gIH1cbn0pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6dXNlci1wYXRoc1wiLCAoKSA9PiAoe1xuICB1c2VyUm9vdCxcbiAgcnVudGltZURpcixcbiAgdHdlYWtzRGlyOiBUV0VBS1NfRElSLFxuICBsb2dEaXI6IExPR19ESVIsXG59KSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpyZXZlYWxcIiwgKF9lLCBwOiBzdHJpbmcpID0+IHtcbiAgc2hlbGwub3BlblBhdGgocCkuY2F0Y2goKCkgPT4ge30pO1xufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpvcGVuLWV4dGVybmFsXCIsIChfZSwgdXJsOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgcGFyc2VkID0gbmV3IFVSTCh1cmwpO1xuICBpZiAocGFyc2VkLnByb3RvY29sICE9PSBcImh0dHBzOlwiIHx8IHBhcnNlZC5ob3N0bmFtZSAhPT0gXCJnaXRodWIuY29tXCIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJvbmx5IGdpdGh1Yi5jb20gbGlua3MgY2FuIGJlIG9wZW5lZCBmcm9tIHR3ZWFrIG1ldGFkYXRhXCIpO1xuICB9XG4gIHNoZWxsLm9wZW5FeHRlcm5hbChwYXJzZWQudG9TdHJpbmcoKSkuY2F0Y2goKCkgPT4ge30pO1xufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpjb3B5LXRleHRcIiwgKF9lLCB0ZXh0OiBzdHJpbmcpID0+IHtcbiAgY2xpcGJvYXJkLndyaXRlVGV4dChTdHJpbmcodGV4dCkpO1xuICByZXR1cm4gdHJ1ZTtcbn0pO1xuXG4vLyBNYW51YWwgZm9yY2UtcmVsb2FkIHRyaWdnZXIgZnJvbSB0aGUgcmVuZGVyZXIgKGUuZy4gdGhlIFwiRm9yY2UgUmVsb2FkXCJcbi8vIGJ1dHRvbiBvbiBvdXIgaW5qZWN0ZWQgVHdlYWtzIHBhZ2UpLiBCeXBhc3NlcyB0aGUgd2F0Y2hlciBkZWJvdW5jZS5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpyZWxvYWQtdHdlYWtzXCIsICgpID0+IHtcbiAgcmVsb2FkVHdlYWtzKFwibWFudWFsXCIsIHR3ZWFrTGlmZWN5Y2xlRGVwcyk7XG4gIHJldHVybiB7IGF0OiBEYXRlLm5vdygpLCBjb3VudDogdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLmxlbmd0aCB9O1xufSk7XG5cbi8vIDQuIEZpbGVzeXN0ZW0gd2F0Y2hlciBcdTIxOTIgZGVib3VuY2VkIHJlbG9hZCArIGJyb2FkY2FzdC5cbi8vICAgIFdlIHdhdGNoIHRoZSB0d2Vha3MgZGlyIGZvciBhbnkgY2hhbmdlLiBPbiB0aGUgZmlyc3QgdGljayBvZiBpbmFjdGl2aXR5XG4vLyAgICB3ZSBzdG9wIG1haW4tc2lkZSB0d2Vha3MsIGNsZWFyIHRoZWlyIGNhY2hlZCBtb2R1bGVzLCByZS1kaXNjb3ZlciwgdGhlblxuLy8gICAgcmVzdGFydCBhbmQgYnJvYWRjYXN0IGBjb2RleHBwOnR3ZWFrcy1jaGFuZ2VkYCB0byBldmVyeSByZW5kZXJlciBzbyBpdFxuLy8gICAgY2FuIHJlLWluaXQgaXRzIGhvc3QuXG5jb25zdCBSRUxPQURfREVCT1VOQ0VfTVMgPSAyNTA7XG5sZXQgcmVsb2FkVGltZXI6IE5vZGVKUy5UaW1lb3V0IHwgbnVsbCA9IG51bGw7XG5mdW5jdGlvbiBzY2hlZHVsZVJlbG9hZChyZWFzb246IHN0cmluZyk6IHZvaWQge1xuICBpZiAocmVsb2FkVGltZXIpIGNsZWFyVGltZW91dChyZWxvYWRUaW1lcik7XG4gIHJlbG9hZFRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgcmVsb2FkVGltZXIgPSBudWxsO1xuICAgIHJlbG9hZFR3ZWFrcyhyZWFzb24sIHR3ZWFrTGlmZWN5Y2xlRGVwcyk7XG4gIH0sIFJFTE9BRF9ERUJPVU5DRV9NUyk7XG59XG5cbnRyeSB7XG4gIGNvbnN0IHdhdGNoZXIgPSBjaG9raWRhci53YXRjaChUV0VBS1NfRElSLCB7XG4gICAgaWdub3JlSW5pdGlhbDogdHJ1ZSxcbiAgICAvLyBXYWl0IGZvciBmaWxlcyB0byBzZXR0bGUgYmVmb3JlIHRyaWdnZXJpbmcgXHUyMDE0IGd1YXJkcyBhZ2FpbnN0IHBhcnRpYWxseVxuICAgIC8vIHdyaXR0ZW4gdHdlYWsgZmlsZXMgZHVyaW5nIGVkaXRvciBzYXZlcyAvIGdpdCBjaGVja291dHMuXG4gICAgYXdhaXRXcml0ZUZpbmlzaDogeyBzdGFiaWxpdHlUaHJlc2hvbGQ6IDE1MCwgcG9sbEludGVydmFsOiA1MCB9LFxuICAgIC8vIEF2b2lkIGVhdGluZyBDUFUgb24gaHVnZSBub2RlX21vZHVsZXMgdHJlZXMgaW5zaWRlIHR3ZWFrIGZvbGRlcnMuXG4gICAgaWdub3JlZDogKHApID0+IHAuaW5jbHVkZXMoYCR7VFdFQUtTX0RJUn0vYCkgJiYgL1xcL25vZGVfbW9kdWxlc1xcLy8udGVzdChwKSxcbiAgfSk7XG4gIHdhdGNoZXIub24oXCJhbGxcIiwgKGV2ZW50LCBwYXRoKSA9PiBzY2hlZHVsZVJlbG9hZChgJHtldmVudH0gJHtwYXRofWApKTtcbiAgd2F0Y2hlci5vbihcImVycm9yXCIsIChlKSA9PiBsb2coXCJ3YXJuXCIsIFwid2F0Y2hlciBlcnJvcjpcIiwgZSkpO1xuICBsb2coXCJpbmZvXCIsIFwid2F0Y2hpbmdcIiwgVFdFQUtTX0RJUik7XG4gIGFwcC5vbihcIndpbGwtcXVpdFwiLCAoKSA9PiB3YXRjaGVyLmNsb3NlKCkuY2F0Y2goKCkgPT4ge30pKTtcbn0gY2F0Y2ggKGUpIHtcbiAgbG9nKFwiZXJyb3JcIiwgXCJmYWlsZWQgdG8gc3RhcnQgd2F0Y2hlcjpcIiwgZSk7XG59XG5cbi8vIC0tLSBoZWxwZXJzIC0tLVxuXG5mdW5jdGlvbiBsb2FkQWxsTWFpblR3ZWFrcygpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICB0d2Vha1N0YXRlLmRpc2NvdmVyZWQgPSBkaXNjb3ZlclR3ZWFrcyhUV0VBS1NfRElSKTtcbiAgICBsb2coXG4gICAgICBcImluZm9cIixcbiAgICAgIGBkaXNjb3ZlcmVkICR7dHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLmxlbmd0aH0gdHdlYWsocyk6YCxcbiAgICAgIHR3ZWFrU3RhdGUuZGlzY292ZXJlZC5tYXAoKHQpID0+IHQubWFuaWZlc3QuaWQpLmpvaW4oXCIsIFwiKSxcbiAgICApO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nKFwiZXJyb3JcIiwgXCJ0d2VhayBkaXNjb3ZlcnkgZmFpbGVkOlwiLCBlKTtcbiAgICB0d2Vha1N0YXRlLmRpc2NvdmVyZWQgPSBbXTtcbiAgfVxuXG4gIHN5bmNNY3BTZXJ2ZXJzRnJvbUVuYWJsZWRUd2Vha3MoKTtcblxuICBmb3IgKGNvbnN0IHQgb2YgdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkKSB7XG4gICAgaWYgKCFpc01haW5Qcm9jZXNzVHdlYWtTY29wZSh0Lm1hbmlmZXN0LnNjb3BlKSkgY29udGludWU7XG4gICAgaWYgKCFpc1R3ZWFrRW5hYmxlZCh0Lm1hbmlmZXN0LmlkKSkge1xuICAgICAgbG9nKFwiaW5mb1wiLCBgc2tpcHBpbmcgZGlzYWJsZWQgbWFpbiB0d2VhazogJHt0Lm1hbmlmZXN0LmlkfWApO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBtb2QgPSByZXF1aXJlKHQuZW50cnkpO1xuICAgICAgY29uc3QgdHdlYWsgPSBtb2QuZGVmYXVsdCA/PyBtb2Q7XG4gICAgICBpZiAodHlwZW9mIHR3ZWFrPy5zdGFydCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGNvbnN0IHN0b3JhZ2UgPSBjcmVhdGVEaXNrU3RvcmFnZSh1c2VyUm9vdCEsIHQubWFuaWZlc3QuaWQpO1xuICAgICAgICB0d2Vhay5zdGFydCh7XG4gICAgICAgICAgbWFuaWZlc3Q6IHQubWFuaWZlc3QsXG4gICAgICAgICAgcHJvY2VzczogXCJtYWluXCIsXG4gICAgICAgICAgbG9nOiBtYWtlTG9nZ2VyKHQubWFuaWZlc3QuaWQpLFxuICAgICAgICAgIHN0b3JhZ2UsXG4gICAgICAgICAgaXBjOiBtYWtlTWFpbklwYyh0Lm1hbmlmZXN0LmlkKSxcbiAgICAgICAgICBmczogbWFrZU1haW5Gcyh0Lm1hbmlmZXN0LmlkKSxcbiAgICAgICAgICBjb2RleDogbWFrZUNvZGV4QXBpKCksXG4gICAgICAgIH0pO1xuICAgICAgICB0d2Vha1N0YXRlLmxvYWRlZE1haW4uc2V0KHQubWFuaWZlc3QuaWQsIHtcbiAgICAgICAgICBzdG9wOiB0d2Vhay5zdG9wLFxuICAgICAgICAgIHN0b3JhZ2UsXG4gICAgICAgIH0pO1xuICAgICAgICBsb2coXCJpbmZvXCIsIGBzdGFydGVkIG1haW4gdHdlYWs6ICR7dC5tYW5pZmVzdC5pZH1gKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2coXCJlcnJvclwiLCBgdHdlYWsgJHt0Lm1hbmlmZXN0LmlkfSBmYWlsZWQgdG8gc3RhcnQ6YCwgZSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHN5bmNNY3BTZXJ2ZXJzRnJvbUVuYWJsZWRUd2Vha3MoKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVzdWx0ID0gc3luY01hbmFnZWRNY3BTZXJ2ZXJzKHtcbiAgICAgIGNvbmZpZ1BhdGg6IENPREVYX0NPTkZJR19GSUxFLFxuICAgICAgdHdlYWtzOiB0d2Vha1N0YXRlLmRpc2NvdmVyZWQuZmlsdGVyKCh0KSA9PiBpc1R3ZWFrRW5hYmxlZCh0Lm1hbmlmZXN0LmlkKSksXG4gICAgfSk7XG4gICAgaWYgKHJlc3VsdC5jaGFuZ2VkKSB7XG4gICAgICBsb2coXCJpbmZvXCIsIGBzeW5jZWQgQ29kZXggTUNQIGNvbmZpZzogJHtyZXN1bHQuc2VydmVyTmFtZXMuam9pbihcIiwgXCIpIHx8IFwibm9uZVwifWApO1xuICAgIH1cbiAgICBpZiAocmVzdWx0LnNraXBwZWRTZXJ2ZXJOYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICBsb2coXG4gICAgICAgIFwiaW5mb1wiLFxuICAgICAgICBgc2tpcHBlZCBDb2RleCsrIG1hbmFnZWQgTUNQIHNlcnZlcihzKSBhbHJlYWR5IGNvbmZpZ3VyZWQgYnkgdXNlcjogJHtyZXN1bHQuc2tpcHBlZFNlcnZlck5hbWVzLmpvaW4oXCIsIFwiKX1gLFxuICAgICAgKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2coXCJ3YXJuXCIsIFwiZmFpbGVkIHRvIHN5bmMgQ29kZXggTUNQIGNvbmZpZzpcIiwgZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc3RvcEFsbE1haW5Ud2Vha3MoKTogdm9pZCB7XG4gIGZvciAoY29uc3QgW2lkLCB0XSBvZiB0d2Vha1N0YXRlLmxvYWRlZE1haW4pIHtcbiAgICB0cnkge1xuICAgICAgdC5zdG9wPy4oKTtcbiAgICAgIHQuc3RvcmFnZS5mbHVzaCgpO1xuICAgICAgbG9nKFwiaW5mb1wiLCBgc3RvcHBlZCBtYWluIHR3ZWFrOiAke2lkfWApO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZyhcIndhcm5cIiwgYHN0b3AgZmFpbGVkIGZvciAke2lkfTpgLCBlKTtcbiAgICB9XG4gIH1cbiAgdHdlYWtTdGF0ZS5sb2FkZWRNYWluLmNsZWFyKCk7XG59XG5cbmZ1bmN0aW9uIGNsZWFyVHdlYWtNb2R1bGVDYWNoZSgpOiB2b2lkIHtcbiAgLy8gRHJvcCBhbnkgY2FjaGVkIHJlcXVpcmUoKSBlbnRyaWVzIHRoYXQgbGl2ZSBpbnNpZGUgdGhlIHR3ZWFrcyBkaXIgc28gYVxuICAvLyByZS1yZXF1aXJlIG9uIG5leHQgbG9hZCBwaWNrcyB1cCBmcmVzaCBjb2RlLlxuICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhyZXF1aXJlLmNhY2hlKSkge1xuICAgIGlmIChpc1BhdGhJbnNpZGUoVFdFQUtTX0RJUiwga2V5KSkgZGVsZXRlIHJlcXVpcmUuY2FjaGVba2V5XTtcbiAgfVxufVxuXG5jb25zdCBVUERBVEVfQ0hFQ0tfSU5URVJWQUxfTVMgPSAyNCAqIDYwICogNjAgKiAxMDAwO1xuY29uc3QgVkVSU0lPTl9SRSA9IC9edj8oXFxkKylcXC4oXFxkKylcXC4oXFxkKykoPzpbLStdLiopPyQvO1xuXG5hc3luYyBmdW5jdGlvbiBlbnN1cmVDb2RleFBsdXNQbHVzVXBkYXRlQ2hlY2soZm9yY2UgPSBmYWxzZSk6IFByb21pc2U8Q29kZXhQbHVzUGx1c1VwZGF0ZUNoZWNrPiB7XG4gIGNvbnN0IHN0YXRlID0gcmVhZFN0YXRlKCk7XG4gIGNvbnN0IGNhY2hlZCA9IHN0YXRlLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZUNoZWNrO1xuICBjb25zdCBjaGFubmVsID0gc3RhdGUuY29kZXhQbHVzUGx1cz8udXBkYXRlQ2hhbm5lbCA/PyBcInN0YWJsZVwiO1xuICBjb25zdCByZXBvID0gc3RhdGUuY29kZXhQbHVzUGx1cz8udXBkYXRlUmVwbyA/PyBDT0RFWF9QTFVTUExVU19SRVBPO1xuICBpZiAoXG4gICAgIWZvcmNlICYmXG4gICAgY2FjaGVkICYmXG4gICAgY2FjaGVkLmN1cnJlbnRWZXJzaW9uID09PSBDT0RFWF9QTFVTUExVU19WRVJTSU9OICYmXG4gICAgRGF0ZS5ub3coKSAtIERhdGUucGFyc2UoY2FjaGVkLmNoZWNrZWRBdCkgPCBVUERBVEVfQ0hFQ0tfSU5URVJWQUxfTVNcbiAgKSB7XG4gICAgcmV0dXJuIGNhY2hlZDtcbiAgfVxuXG4gIGNvbnN0IHJlbGVhc2UgPSBhd2FpdCBmZXRjaExhdGVzdFJlbGVhc2UocmVwbywgQ09ERVhfUExVU1BMVVNfVkVSU0lPTiwgY2hhbm5lbCA9PT0gXCJwcmVyZWxlYXNlXCIpO1xuICBjb25zdCBsYXRlc3RWZXJzaW9uID0gcmVsZWFzZS5sYXRlc3RUYWcgPyBub3JtYWxpemVWZXJzaW9uKHJlbGVhc2UubGF0ZXN0VGFnKSA6IG51bGw7XG4gIGNvbnN0IGNoZWNrOiBDb2RleFBsdXNQbHVzVXBkYXRlQ2hlY2sgPSB7XG4gICAgY2hlY2tlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgY3VycmVudFZlcnNpb246IENPREVYX1BMVVNQTFVTX1ZFUlNJT04sXG4gICAgbGF0ZXN0VmVyc2lvbixcbiAgICByZWxlYXNlVXJsOiByZWxlYXNlLnJlbGVhc2VVcmwgPz8gYGh0dHBzOi8vZ2l0aHViLmNvbS8ke3JlcG99L3JlbGVhc2VzYCxcbiAgICByZWxlYXNlTm90ZXM6IHJlbGVhc2UucmVsZWFzZU5vdGVzLFxuICAgIHVwZGF0ZUF2YWlsYWJsZTogbGF0ZXN0VmVyc2lvblxuICAgICAgPyBjb21wYXJlVmVyc2lvbnMobm9ybWFsaXplVmVyc2lvbihsYXRlc3RWZXJzaW9uKSwgQ09ERVhfUExVU1BMVVNfVkVSU0lPTikgPiAwXG4gICAgICA6IGZhbHNlLFxuICAgIC4uLihyZWxlYXNlLmVycm9yID8geyBlcnJvcjogcmVsZWFzZS5lcnJvciB9IDoge30pLFxuICB9O1xuICBzdGF0ZS5jb2RleFBsdXNQbHVzID8/PSB7fTtcbiAgc3RhdGUuY29kZXhQbHVzUGx1cy51cGRhdGVDaGVjayA9IGNoZWNrO1xuICB3cml0ZVN0YXRlKHN0YXRlKTtcbiAgcmV0dXJuIGNoZWNrO1xufVxuXG5hc3luYyBmdW5jdGlvbiBlbnN1cmVUd2Vha1VwZGF0ZUNoZWNrKHQ6IERpc2NvdmVyZWRUd2Vhayk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBpZCA9IHQubWFuaWZlc3QuaWQ7XG4gIGNvbnN0IHJlcG8gPSB0Lm1hbmlmZXN0LmdpdGh1YlJlcG87XG4gIGNvbnN0IHN0YXRlID0gcmVhZFN0YXRlKCk7XG4gIGNvbnN0IGNhY2hlZCA9IHN0YXRlLnR3ZWFrVXBkYXRlQ2hlY2tzPy5baWRdO1xuICBpZiAoXG4gICAgY2FjaGVkICYmXG4gICAgY2FjaGVkLnJlcG8gPT09IHJlcG8gJiZcbiAgICBjYWNoZWQuY3VycmVudFZlcnNpb24gPT09IHQubWFuaWZlc3QudmVyc2lvbiAmJlxuICAgIERhdGUubm93KCkgLSBEYXRlLnBhcnNlKGNhY2hlZC5jaGVja2VkQXQpIDwgVVBEQVRFX0NIRUNLX0lOVEVSVkFMX01TXG4gICkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IG5leHQgPSBhd2FpdCBmZXRjaExhdGVzdFJlbGVhc2UocmVwbywgdC5tYW5pZmVzdC52ZXJzaW9uKTtcbiAgY29uc3QgbGF0ZXN0VmVyc2lvbiA9IG5leHQubGF0ZXN0VGFnID8gbm9ybWFsaXplVmVyc2lvbihuZXh0LmxhdGVzdFRhZykgOiBudWxsO1xuICBjb25zdCBjaGVjazogVHdlYWtVcGRhdGVDaGVjayA9IHtcbiAgICBjaGVja2VkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICByZXBvLFxuICAgIGN1cnJlbnRWZXJzaW9uOiB0Lm1hbmlmZXN0LnZlcnNpb24sXG4gICAgbGF0ZXN0VmVyc2lvbixcbiAgICBsYXRlc3RUYWc6IG5leHQubGF0ZXN0VGFnLFxuICAgIHJlbGVhc2VVcmw6IG5leHQucmVsZWFzZVVybCxcbiAgICB1cGRhdGVBdmFpbGFibGU6IGxhdGVzdFZlcnNpb25cbiAgICAgID8gY29tcGFyZVZlcnNpb25zKGxhdGVzdFZlcnNpb24sIG5vcm1hbGl6ZVZlcnNpb24odC5tYW5pZmVzdC52ZXJzaW9uKSkgPiAwXG4gICAgICA6IGZhbHNlLFxuICAgIC4uLihuZXh0LmVycm9yID8geyBlcnJvcjogbmV4dC5lcnJvciB9IDoge30pLFxuICB9O1xuICBzdGF0ZS50d2Vha1VwZGF0ZUNoZWNrcyA/Pz0ge307XG4gIHN0YXRlLnR3ZWFrVXBkYXRlQ2hlY2tzW2lkXSA9IGNoZWNrO1xuICB3cml0ZVN0YXRlKHN0YXRlKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hMYXRlc3RSZWxlYXNlKFxuICByZXBvOiBzdHJpbmcsXG4gIGN1cnJlbnRWZXJzaW9uOiBzdHJpbmcsXG4gIGluY2x1ZGVQcmVyZWxlYXNlID0gZmFsc2UsXG4pOiBQcm9taXNlPHsgbGF0ZXN0VGFnOiBzdHJpbmcgfCBudWxsOyByZWxlYXNlVXJsOiBzdHJpbmcgfCBudWxsOyByZWxlYXNlTm90ZXM6IHN0cmluZyB8IG51bGw7IGVycm9yPzogc3RyaW5nIH0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBjb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgIGNvbnN0IHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IGNvbnRyb2xsZXIuYWJvcnQoKSwgODAwMCk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGVuZHBvaW50ID0gaW5jbHVkZVByZXJlbGVhc2UgPyBcInJlbGVhc2VzP3Blcl9wYWdlPTIwXCIgOiBcInJlbGVhc2VzL2xhdGVzdFwiO1xuICAgICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goYGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvJHtyZXBvfS8ke2VuZHBvaW50fWAsIHtcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIFwiQWNjZXB0XCI6IFwiYXBwbGljYXRpb24vdm5kLmdpdGh1Yitqc29uXCIsXG4gICAgICAgICAgXCJVc2VyLUFnZW50XCI6IGBjb2RleC1wbHVzcGx1cy8ke2N1cnJlbnRWZXJzaW9ufWAsXG4gICAgICAgIH0sXG4gICAgICAgIHNpZ25hbDogY29udHJvbGxlci5zaWduYWwsXG4gICAgICB9KTtcbiAgICAgIGlmIChyZXMuc3RhdHVzID09PSA0MDQpIHtcbiAgICAgICAgcmV0dXJuIHsgbGF0ZXN0VGFnOiBudWxsLCByZWxlYXNlVXJsOiBudWxsLCByZWxlYXNlTm90ZXM6IG51bGwsIGVycm9yOiBcIm5vIEdpdEh1YiByZWxlYXNlIGZvdW5kXCIgfTtcbiAgICAgIH1cbiAgICAgIGlmICghcmVzLm9rKSB7XG4gICAgICAgIHJldHVybiB7IGxhdGVzdFRhZzogbnVsbCwgcmVsZWFzZVVybDogbnVsbCwgcmVsZWFzZU5vdGVzOiBudWxsLCBlcnJvcjogYEdpdEh1YiByZXR1cm5lZCAke3Jlcy5zdGF0dXN9YCB9O1xuICAgICAgfVxuICAgICAgY29uc3QganNvbiA9IGF3YWl0IHJlcy5qc29uKCkgYXMgeyB0YWdfbmFtZT86IHN0cmluZzsgaHRtbF91cmw/OiBzdHJpbmc7IGJvZHk/OiBzdHJpbmc7IGRyYWZ0PzogYm9vbGVhbiB9IHwgQXJyYXk8eyB0YWdfbmFtZT86IHN0cmluZzsgaHRtbF91cmw/OiBzdHJpbmc7IGJvZHk/OiBzdHJpbmc7IGRyYWZ0PzogYm9vbGVhbiB9PjtcbiAgICAgIGNvbnN0IGJvZHkgPSBBcnJheS5pc0FycmF5KGpzb24pID8ganNvbi5maW5kKChyZWxlYXNlKSA9PiAhcmVsZWFzZS5kcmFmdCkgOiBqc29uO1xuICAgICAgaWYgKCFib2R5KSB7XG4gICAgICAgIHJldHVybiB7IGxhdGVzdFRhZzogbnVsbCwgcmVsZWFzZVVybDogbnVsbCwgcmVsZWFzZU5vdGVzOiBudWxsLCBlcnJvcjogXCJubyBHaXRIdWIgcmVsZWFzZSBmb3VuZFwiIH07XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsYXRlc3RUYWc6IGJvZHkudGFnX25hbWUgPz8gbnVsbCxcbiAgICAgICAgcmVsZWFzZVVybDogYm9keS5odG1sX3VybCA/PyBgaHR0cHM6Ly9naXRodWIuY29tLyR7cmVwb30vcmVsZWFzZXNgLFxuICAgICAgICByZWxlYXNlTm90ZXM6IGJvZHkuYm9keSA/PyBudWxsLFxuICAgICAgfTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiB7XG4gICAgICBsYXRlc3RUYWc6IG51bGwsXG4gICAgICByZWxlYXNlVXJsOiBudWxsLFxuICAgICAgcmVsZWFzZU5vdGVzOiBudWxsLFxuICAgICAgZXJyb3I6IGUgaW5zdGFuY2VvZiBFcnJvciA/IGUubWVzc2FnZSA6IFN0cmluZyhlKSxcbiAgICB9O1xuICB9XG59XG5cbmludGVyZmFjZSBUd2Vha1N0b3JlRmV0Y2hSZXN1bHQge1xuICByZWdpc3RyeTogVHdlYWtTdG9yZVJlZ2lzdHJ5O1xuICBmZXRjaGVkQXQ6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFN0b3JlSW5zdGFsbE1ldGFkYXRhIHtcbiAgcmVwbzogc3RyaW5nO1xuICBhcHByb3ZlZENvbW1pdFNoYTogc3RyaW5nO1xuICBpbnN0YWxsZWRBdDogc3RyaW5nO1xuICBzdG9yZUluZGV4VXJsOiBzdHJpbmc7XG4gIGZpbGVzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbn1cblxuaW50ZXJmYWNlIFN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGliaWxpdHkge1xuICBjdXJyZW50OiBOb2RlSlMuUGxhdGZvcm07XG4gIHN1cHBvcnRlZDogVHdlYWtTdG9yZVBsYXRmb3JtW10gfCBudWxsO1xuICBjb21wYXRpYmxlOiBib29sZWFuO1xuICByZWFzb246IHN0cmluZyB8IG51bGw7XG59XG5cbmludGVyZmFjZSBTdG9yZUVudHJ5UnVudGltZUNvbXBhdGliaWxpdHkge1xuICBjdXJyZW50OiBzdHJpbmc7XG4gIHJlcXVpcmVkOiBzdHJpbmcgfCBudWxsO1xuICBjb21wYXRpYmxlOiBib29sZWFuO1xuICByZWFzb246IHN0cmluZyB8IG51bGw7XG59XG5cbmNsYXNzIFN0b3JlVHdlYWtNb2RpZmllZEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih0d2Vha05hbWU6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgYCR7dHdlYWtOYW1lfSBoYXMgbG9jYWwgc291cmNlIGNoYW5nZXMsIHNvIENvZGV4KysgY2FuJ3QgYXV0by11cGRhdGUgaXQuIFJldmVydCB5b3VyIGxvY2FsIGNoYW5nZXMgb3IgcmVpbnN0YWxsIHRoZSB0d2VhayBtYW51YWxseS5gLFxuICAgICk7XG4gICAgdGhpcy5uYW1lID0gXCJTdG9yZVR3ZWFrTW9kaWZpZWRFcnJvclwiO1xuICB9XG59XG5cbmZ1bmN0aW9uIHN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGliaWxpdHkoZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSk6IFN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGliaWxpdHkge1xuICBjb25zdCBzdXBwb3J0ZWQgPSBlbnRyeS5wbGF0Zm9ybXMgPz8gbnVsbDtcbiAgY29uc3QgY29tcGF0aWJsZSA9ICFzdXBwb3J0ZWQgfHwgc3VwcG9ydGVkLmluY2x1ZGVzKHByb2Nlc3MucGxhdGZvcm0gYXMgVHdlYWtTdG9yZVBsYXRmb3JtKTtcbiAgcmV0dXJuIHtcbiAgICBjdXJyZW50OiBwcm9jZXNzLnBsYXRmb3JtLFxuICAgIHN1cHBvcnRlZCxcbiAgICBjb21wYXRpYmxlLFxuICAgIHJlYXNvbjogY29tcGF0aWJsZSA/IG51bGwgOiBgJHtlbnRyeS5tYW5pZmVzdC5uYW1lfSBpcyBvbmx5IGF2YWlsYWJsZSBvbiAke2Zvcm1hdFN0b3JlUGxhdGZvcm1zKHN1cHBvcnRlZCl9LmAsXG4gIH07XG59XG5cbmZ1bmN0aW9uIGFzc2VydFN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGlibGUoZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSk6IHZvaWQge1xuICBjb25zdCBwbGF0Zm9ybSA9IHN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGliaWxpdHkoZW50cnkpO1xuICBpZiAoIXBsYXRmb3JtLmNvbXBhdGlibGUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IocGxhdGZvcm0ucmVhc29uID8/IGAke2VudHJ5Lm1hbmlmZXN0Lm5hbWV9IGlzIG5vdCBhdmFpbGFibGUgb24gdGhpcyBwbGF0Zm9ybS5gKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzdG9yZUVudHJ5UnVudGltZUNvbXBhdGliaWxpdHkoZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSk6IFN0b3JlRW50cnlSdW50aW1lQ29tcGF0aWJpbGl0eSB7XG4gIGNvbnN0IHJlcXVpcmVkID0gY2xlYW5NaW5SdW50aW1lKGVudHJ5Lm1hbmlmZXN0Lm1pblJ1bnRpbWUpO1xuICBjb25zdCBjb21wYXRpYmxlID0gIXJlcXVpcmVkIHx8IGNvbXBhcmVWZXJzaW9ucyhDT0RFWF9QTFVTUExVU19WRVJTSU9OLCByZXF1aXJlZCkgPj0gMDtcbiAgcmV0dXJuIHtcbiAgICBjdXJyZW50OiBDT0RFWF9QTFVTUExVU19WRVJTSU9OLFxuICAgIHJlcXVpcmVkLFxuICAgIGNvbXBhdGlibGUsXG4gICAgcmVhc29uOiBjb21wYXRpYmxlIHx8ICFyZXF1aXJlZFxuICAgICAgPyBudWxsXG4gICAgICA6IGAke2VudHJ5Lm1hbmlmZXN0Lm5hbWV9IHJlcXVpcmVzIENvZGV4KysgJHtyZXF1aXJlZH0gb3IgbmV3ZXIuYCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXNzZXJ0U3RvcmVFbnRyeVJ1bnRpbWVDb21wYXRpYmxlKGVudHJ5OiBUd2Vha1N0b3JlRW50cnkpOiB2b2lkIHtcbiAgY29uc3QgcnVudGltZSA9IHN0b3JlRW50cnlSdW50aW1lQ29tcGF0aWJpbGl0eShlbnRyeSk7XG4gIGlmICghcnVudGltZS5jb21wYXRpYmxlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKHJ1bnRpbWUucmVhc29uID8/IGAke2VudHJ5Lm1hbmlmZXN0Lm5hbWV9IHJlcXVpcmVzIGEgbmV3ZXIgQ29kZXgrKyBydW50aW1lLmApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNsZWFuTWluUnVudGltZSh2YWx1ZTogdW5rbm93bik6IHN0cmluZyB8IG51bGwge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgdmVyc2lvbiA9IG5vcm1hbGl6ZVZlcnNpb24odmFsdWUucmVwbGFjZSgvXj49P1xccyovLCBcIlwiKSk7XG4gIHJldHVybiBWRVJTSU9OX1JFLnRlc3QodmVyc2lvbikgPyB2ZXJzaW9uIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gZm9ybWF0U3RvcmVQbGF0Zm9ybXMocGxhdGZvcm1zOiBUd2Vha1N0b3JlUGxhdGZvcm1bXSB8IG51bGwpOiBzdHJpbmcge1xuICBpZiAoIXBsYXRmb3JtcyB8fCBwbGF0Zm9ybXMubGVuZ3RoID09PSAwKSByZXR1cm4gXCJzdXBwb3J0ZWQgcGxhdGZvcm1zXCI7XG4gIHJldHVybiBwbGF0Zm9ybXMubWFwKChwbGF0Zm9ybSkgPT4ge1xuICAgIGlmIChwbGF0Zm9ybSA9PT0gXCJkYXJ3aW5cIikgcmV0dXJuIFwibWFjT1NcIjtcbiAgICBpZiAocGxhdGZvcm0gPT09IFwid2luMzJcIikgcmV0dXJuIFwiV2luZG93c1wiO1xuICAgIHJldHVybiBcIkxpbnV4XCI7XG4gIH0pLmpvaW4oXCIsIFwiKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hUd2Vha1N0b3JlUmVnaXN0cnkoKTogUHJvbWlzZTxUd2Vha1N0b3JlRmV0Y2hSZXN1bHQ+IHtcbiAgY29uc3QgZmV0Y2hlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICB0cnkge1xuICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgY29uc3QgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4gY29udHJvbGxlci5hYm9ydCgpLCA4MDAwKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goVFdFQUtfU1RPUkVfSU5ERVhfVVJMLCB7XG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICBcIkFjY2VwdFwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgICBcIlVzZXItQWdlbnRcIjogYGNvZGV4LXBsdXNwbHVzLyR7Q09ERVhfUExVU1BMVVNfVkVSU0lPTn1gLFxuICAgICAgICB9LFxuICAgICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLFxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlcy5vaykgdGhyb3cgbmV3IEVycm9yKGBzdG9yZSByZXR1cm5lZCAke3Jlcy5zdGF0dXN9YCk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZWdpc3RyeTogbm9ybWFsaXplU3RvcmVSZWdpc3RyeShhd2FpdCByZXMuanNvbigpKSxcbiAgICAgICAgZmV0Y2hlZEF0LFxuICAgICAgfTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnN0IGVycm9yID0gZSBpbnN0YW5jZW9mIEVycm9yID8gZSA6IG5ldyBFcnJvcihTdHJpbmcoZSkpO1xuICAgIGxvZyhcIndhcm5cIiwgXCJmYWlsZWQgdG8gZmV0Y2ggdHdlYWsgc3RvcmUgcmVnaXN0cnk6XCIsIGVycm9yLm1lc3NhZ2UpO1xuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluc3RhbGxTdG9yZVR3ZWFrKGVudHJ5OiBUd2Vha1N0b3JlRW50cnkpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgdXJsID0gc3RvcmVBcmNoaXZlVXJsKGVudHJ5KTtcbiAgY29uc3Qgd29yayA9IG1rZHRlbXBTeW5jKGpvaW4odG1wZGlyKCksIFwiY29kZXhwcC1zdG9yZS10d2Vhay1cIikpO1xuICBjb25zdCBhcmNoaXZlID0gam9pbih3b3JrLCBcInNvdXJjZS50YXIuZ3pcIik7XG4gIGNvbnN0IGV4dHJhY3REaXIgPSBqb2luKHdvcmssIFwiZXh0cmFjdFwiKTtcbiAgY29uc3QgdGFyZ2V0ID0gam9pbihUV0VBS1NfRElSLCBlbnRyeS5pZCk7XG4gIGNvbnN0IHN0YWdlZFRhcmdldCA9IGpvaW4od29yaywgXCJzdGFnZWRcIiwgZW50cnkuaWQpO1xuXG4gIHRyeSB7XG4gICAgbG9nKFwiaW5mb1wiLCBgaW5zdGFsbGluZyBzdG9yZSB0d2VhayAke2VudHJ5LmlkfSBmcm9tICR7ZW50cnkucmVwb31AJHtlbnRyeS5hcHByb3ZlZENvbW1pdFNoYX1gKTtcbiAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgIGhlYWRlcnM6IHsgXCJVc2VyLUFnZW50XCI6IGBjb2RleC1wbHVzcGx1cy8ke0NPREVYX1BMVVNQTFVTX1ZFUlNJT059YCB9LFxuICAgICAgcmVkaXJlY3Q6IFwiZm9sbG93XCIsXG4gICAgfSk7XG4gICAgaWYgKCFyZXMub2spIHRocm93IG5ldyBFcnJvcihgZG93bmxvYWQgZmFpbGVkOiAke3Jlcy5zdGF0dXN9YCk7XG4gICAgY29uc3QgYnl0ZXMgPSBCdWZmZXIuZnJvbShhd2FpdCByZXMuYXJyYXlCdWZmZXIoKSk7XG4gICAgd3JpdGVGaWxlU3luYyhhcmNoaXZlLCBieXRlcyk7XG4gICAgbWtkaXJTeW5jKGV4dHJhY3REaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIGV4dHJhY3RUYXJBcmNoaXZlKGFyY2hpdmUsIGV4dHJhY3REaXIpO1xuICAgIGNvbnN0IHNvdXJjZSA9IGZpbmRUd2Vha1Jvb3QoZXh0cmFjdERpcik7XG4gICAgaWYgKCFzb3VyY2UpIHRocm93IG5ldyBFcnJvcihcImRvd25sb2FkZWQgYXJjaGl2ZSBkaWQgbm90IGNvbnRhaW4gbWFuaWZlc3QuanNvblwiKTtcbiAgICB2YWxpZGF0ZVN0b3JlVHdlYWtTb3VyY2UoZW50cnksIHNvdXJjZSk7XG4gICAgcm1TeW5jKHN0YWdlZFRhcmdldCwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xuICAgIGNvcHlUd2Vha1NvdXJjZShzb3VyY2UsIHN0YWdlZFRhcmdldCk7XG4gICAgY29uc3Qgc3RhZ2VkRmlsZXMgPSBoYXNoVHdlYWtTb3VyY2Uoc3RhZ2VkVGFyZ2V0KTtcbiAgICB3cml0ZUZpbGVTeW5jKFxuICAgICAgam9pbihzdGFnZWRUYXJnZXQsIFwiLmNvZGV4cHAtc3RvcmUuanNvblwiKSxcbiAgICAgIEpTT04uc3RyaW5naWZ5KFxuICAgICAgICB7XG4gICAgICAgICAgcmVwbzogZW50cnkucmVwbyxcbiAgICAgICAgICBhcHByb3ZlZENvbW1pdFNoYTogZW50cnkuYXBwcm92ZWRDb21taXRTaGEsXG4gICAgICAgICAgaW5zdGFsbGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICBzdG9yZUluZGV4VXJsOiBUV0VBS19TVE9SRV9JTkRFWF9VUkwsXG4gICAgICAgICAgZmlsZXM6IHN0YWdlZEZpbGVzLFxuICAgICAgICB9LFxuICAgICAgICBudWxsLFxuICAgICAgICAyLFxuICAgICAgKSxcbiAgICApO1xuICAgIGF3YWl0IGFzc2VydFN0b3JlVHdlYWtDbGVhbkZvckF1dG9VcGRhdGUoZW50cnksIHRhcmdldCwgd29yayk7XG4gICAgcm1TeW5jKHRhcmdldCwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xuICAgIGNwU3luYyhzdGFnZWRUYXJnZXQsIHRhcmdldCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gIH0gZmluYWxseSB7XG4gICAgcm1TeW5jKHdvcmssIHsgcmVjdXJzaXZlOiB0cnVlLCBmb3JjZTogdHJ1ZSB9KTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBwcmVwYXJlVHdlYWtTdG9yZVN1Ym1pc3Npb24ocmVwb0lucHV0OiBzdHJpbmcpOiBQcm9taXNlPFR3ZWFrU3RvcmVQdWJsaXNoU3VibWlzc2lvbj4ge1xuICBjb25zdCByZXBvID0gbm9ybWFsaXplR2l0SHViUmVwbyhyZXBvSW5wdXQpO1xuICBjb25zdCByZXBvSW5mbyA9IGF3YWl0IGZldGNoR2l0aHViSnNvbjx7IGRlZmF1bHRfYnJhbmNoPzogc3RyaW5nIH0+KGBodHRwczovL2FwaS5naXRodWIuY29tL3JlcG9zLyR7cmVwb31gKTtcbiAgY29uc3QgZGVmYXVsdEJyYW5jaCA9IHJlcG9JbmZvLmRlZmF1bHRfYnJhbmNoO1xuICBpZiAoIWRlZmF1bHRCcmFuY2gpIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlc29sdmUgZGVmYXVsdCBicmFuY2ggZm9yICR7cmVwb31gKTtcblxuICBjb25zdCBjb21taXQgPSBhd2FpdCBmZXRjaEdpdGh1Ykpzb248e1xuICAgIHNoYT86IHN0cmluZztcbiAgICBodG1sX3VybD86IHN0cmluZztcbiAgfT4oYGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvJHtyZXBvfS9jb21taXRzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGRlZmF1bHRCcmFuY2gpfWApO1xuICBpZiAoIWNvbW1pdC5zaGEpIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlc29sdmUgY3VycmVudCBjb21taXQgZm9yICR7cmVwb31gKTtcblxuICBjb25zdCBtYW5pZmVzdCA9IGF3YWl0IGZldGNoTWFuaWZlc3RBdENvbW1pdChyZXBvLCBjb21taXQuc2hhKS5jYXRjaCgoZSkgPT4ge1xuICAgIGxvZyhcIndhcm5cIiwgYGNvdWxkIG5vdCByZWFkIG1hbmlmZXN0IGZvciBzdG9yZSBzdWJtaXNzaW9uICR7cmVwb31AJHtjb21taXQuc2hhfTpgLCBlKTtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9KTtcblxuICByZXR1cm4ge1xuICAgIHJlcG8sXG4gICAgZGVmYXVsdEJyYW5jaCxcbiAgICBjb21taXRTaGE6IGNvbW1pdC5zaGEsXG4gICAgY29tbWl0VXJsOiBjb21taXQuaHRtbF91cmwgPz8gYGh0dHBzOi8vZ2l0aHViLmNvbS8ke3JlcG99L2NvbW1pdC8ke2NvbW1pdC5zaGF9YCxcbiAgICBtYW5pZmVzdDogbWFuaWZlc3RcbiAgICAgID8ge1xuICAgICAgICAgIGlkOiB0eXBlb2YgbWFuaWZlc3QuaWQgPT09IFwic3RyaW5nXCIgPyBtYW5pZmVzdC5pZCA6IHVuZGVmaW5lZCxcbiAgICAgICAgICBuYW1lOiB0eXBlb2YgbWFuaWZlc3QubmFtZSA9PT0gXCJzdHJpbmdcIiA/IG1hbmlmZXN0Lm5hbWUgOiB1bmRlZmluZWQsXG4gICAgICAgICAgdmVyc2lvbjogdHlwZW9mIG1hbmlmZXN0LnZlcnNpb24gPT09IFwic3RyaW5nXCIgPyBtYW5pZmVzdC52ZXJzaW9uIDogdW5kZWZpbmVkLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiB0eXBlb2YgbWFuaWZlc3QuZGVzY3JpcHRpb24gPT09IFwic3RyaW5nXCIgPyBtYW5pZmVzdC5kZXNjcmlwdGlvbiA6IHVuZGVmaW5lZCxcbiAgICAgICAgICBpY29uVXJsOiB0eXBlb2YgbWFuaWZlc3QuaWNvblVybCA9PT0gXCJzdHJpbmdcIiA/IG1hbmlmZXN0Lmljb25VcmwgOiB1bmRlZmluZWQsXG4gICAgICAgIH1cbiAgICAgIDogdW5kZWZpbmVkLFxuICB9O1xufVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaEdpdGh1Ykpzb248VD4odXJsOiBzdHJpbmcpOiBQcm9taXNlPFQ+IHtcbiAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgY29uc3QgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4gY29udHJvbGxlci5hYm9ydCgpLCA4MDAwKTtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJBY2NlcHRcIjogXCJhcHBsaWNhdGlvbi92bmQuZ2l0aHViK2pzb25cIixcbiAgICAgICAgXCJVc2VyLUFnZW50XCI6IGBjb2RleC1wbHVzcGx1cy8ke0NPREVYX1BMVVNQTFVTX1ZFUlNJT059YCxcbiAgICAgIH0sXG4gICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLFxuICAgIH0pO1xuICAgIGlmICghcmVzLm9rKSB0aHJvdyBuZXcgRXJyb3IoYEdpdEh1YiByZXR1cm5lZCAke3Jlcy5zdGF0dXN9YCk7XG4gICAgcmV0dXJuIGF3YWl0IHJlcy5qc29uKCkgYXMgVDtcbiAgfSBmaW5hbGx5IHtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hNYW5pZmVzdEF0Q29tbWl0KHJlcG86IHN0cmluZywgY29tbWl0U2hhOiBzdHJpbmcpOiBQcm9taXNlPFBhcnRpYWw8VHdlYWtNYW5pZmVzdD4+IHtcbiAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goYGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS8ke3JlcG99LyR7Y29tbWl0U2hhfS9tYW5pZmVzdC5qc29uYCwge1xuICAgIGhlYWRlcnM6IHtcbiAgICAgIFwiQWNjZXB0XCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgXCJVc2VyLUFnZW50XCI6IGBjb2RleC1wbHVzcGx1cy8ke0NPREVYX1BMVVNQTFVTX1ZFUlNJT059YCxcbiAgICB9LFxuICB9KTtcbiAgaWYgKCFyZXMub2spIHRocm93IG5ldyBFcnJvcihgbWFuaWZlc3QgZmV0Y2ggcmV0dXJuZWQgJHtyZXMuc3RhdHVzfWApO1xuICByZXR1cm4gYXdhaXQgcmVzLmpzb24oKSBhcyBQYXJ0aWFsPFR3ZWFrTWFuaWZlc3Q+O1xufVxuXG5mdW5jdGlvbiBleHRyYWN0VGFyQXJjaGl2ZShhcmNoaXZlOiBzdHJpbmcsIHRhcmdldERpcjogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IHJlc3VsdCA9IHNwYXduU3luYyhcInRhclwiLCBbXCIteHpmXCIsIGFyY2hpdmUsIFwiLUNcIiwgdGFyZ2V0RGlyXSwge1xuICAgIGVuY29kaW5nOiBcInV0ZjhcIixcbiAgICBzdGRpbzogW1wiaWdub3JlXCIsIFwicGlwZVwiLCBcInBpcGVcIl0sXG4gIH0pO1xuICBpZiAocmVzdWx0LnN0YXR1cyAhPT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgdGFyIGV4dHJhY3Rpb24gZmFpbGVkOiAke3Jlc3VsdC5zdGRlcnIgfHwgcmVzdWx0LnN0ZG91dCB8fCByZXN1bHQuc3RhdHVzfWApO1xuICB9XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlU3RvcmVUd2Vha1NvdXJjZShlbnRyeTogVHdlYWtTdG9yZUVudHJ5LCBzb3VyY2U6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBtYW5pZmVzdFBhdGggPSBqb2luKHNvdXJjZSwgXCJtYW5pZmVzdC5qc29uXCIpO1xuICBjb25zdCBtYW5pZmVzdCA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKG1hbmlmZXN0UGF0aCwgXCJ1dGY4XCIpKSBhcyBUd2Vha01hbmlmZXN0O1xuICBpZiAobWFuaWZlc3QuaWQgIT09IGVudHJ5Lm1hbmlmZXN0LmlkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBkb3dubG9hZGVkIHR3ZWFrIGlkICR7bWFuaWZlc3QuaWR9IGRvZXMgbm90IG1hdGNoIGFwcHJvdmVkIGlkICR7ZW50cnkubWFuaWZlc3QuaWR9YCk7XG4gIH1cbiAgaWYgKG1hbmlmZXN0LmdpdGh1YlJlcG8gIT09IGVudHJ5LnJlcG8pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGRvd25sb2FkZWQgdHdlYWsgcmVwbyAke21hbmlmZXN0LmdpdGh1YlJlcG99IGRvZXMgbm90IG1hdGNoIGFwcHJvdmVkIHJlcG8gJHtlbnRyeS5yZXBvfWApO1xuICB9XG4gIGlmIChtYW5pZmVzdC52ZXJzaW9uICE9PSBlbnRyeS5tYW5pZmVzdC52ZXJzaW9uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBkb3dubG9hZGVkIHR3ZWFrIHZlcnNpb24gJHttYW5pZmVzdC52ZXJzaW9ufSBkb2VzIG5vdCBtYXRjaCBhcHByb3ZlZCB2ZXJzaW9uICR7ZW50cnkubWFuaWZlc3QudmVyc2lvbn1gKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kVHdlYWtSb290KGRpcjogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGlmICghZXhpc3RzU3luYyhkaXIpKSByZXR1cm4gbnVsbDtcbiAgaWYgKGV4aXN0c1N5bmMoam9pbihkaXIsIFwibWFuaWZlc3QuanNvblwiKSkpIHJldHVybiBkaXI7XG4gIGZvciAoY29uc3QgbmFtZSBvZiByZWFkZGlyU3luYyhkaXIpKSB7XG4gICAgY29uc3QgY2hpbGQgPSBqb2luKGRpciwgbmFtZSk7XG4gICAgdHJ5IHtcbiAgICAgIGlmICghc3RhdFN5bmMoY2hpbGQpLmlzRGlyZWN0b3J5KCkpIGNvbnRpbnVlO1xuICAgIH0gY2F0Y2gge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IGZvdW5kID0gZmluZFR3ZWFrUm9vdChjaGlsZCk7XG4gICAgaWYgKGZvdW5kKSByZXR1cm4gZm91bmQ7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGNvcHlUd2Vha1NvdXJjZShzb3VyY2U6IHN0cmluZywgdGFyZ2V0OiBzdHJpbmcpOiB2b2lkIHtcbiAgY3BTeW5jKHNvdXJjZSwgdGFyZ2V0LCB7XG4gICAgcmVjdXJzaXZlOiB0cnVlLFxuICAgIGZpbHRlcjogKHNyYykgPT4gIS8oXnxbL1xcXFxdKSg/OlxcLmdpdHxub2RlX21vZHVsZXMpKD86Wy9cXFxcXXwkKS8udGVzdChzcmMpLFxuICB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gYXNzZXJ0U3RvcmVUd2Vha0NsZWFuRm9yQXV0b1VwZGF0ZShcbiAgZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSxcbiAgdGFyZ2V0OiBzdHJpbmcsXG4gIHdvcms6IHN0cmluZyxcbik6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoIWV4aXN0c1N5bmModGFyZ2V0KSkgcmV0dXJuO1xuICBjb25zdCBtZXRhZGF0YSA9IHJlYWRTdG9yZUluc3RhbGxNZXRhZGF0YSh0YXJnZXQpO1xuICBpZiAoIW1ldGFkYXRhKSByZXR1cm47XG4gIGlmIChtZXRhZGF0YS5yZXBvICE9PSBlbnRyeS5yZXBvKSB7XG4gICAgdGhyb3cgbmV3IFN0b3JlVHdlYWtNb2RpZmllZEVycm9yKGVudHJ5Lm1hbmlmZXN0Lm5hbWUpO1xuICB9XG4gIGNvbnN0IGN1cnJlbnRGaWxlcyA9IGhhc2hUd2Vha1NvdXJjZSh0YXJnZXQpO1xuICBjb25zdCBiYXNlbGluZUZpbGVzID0gbWV0YWRhdGEuZmlsZXMgPz8gYXdhaXQgZmV0Y2hCYXNlbGluZVN0b3JlVHdlYWtIYXNoZXMobWV0YWRhdGEsIHdvcmspO1xuICBpZiAoIXNhbWVGaWxlSGFzaGVzKGN1cnJlbnRGaWxlcywgYmFzZWxpbmVGaWxlcykpIHtcbiAgICB0aHJvdyBuZXcgU3RvcmVUd2Vha01vZGlmaWVkRXJyb3IoZW50cnkubWFuaWZlc3QubmFtZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVhZFN0b3JlSW5zdGFsbE1ldGFkYXRhKHRhcmdldDogc3RyaW5nKTogU3RvcmVJbnN0YWxsTWV0YWRhdGEgfCBudWxsIHtcbiAgY29uc3QgbWV0YWRhdGFQYXRoID0gam9pbih0YXJnZXQsIFwiLmNvZGV4cHAtc3RvcmUuanNvblwiKTtcbiAgaWYgKCFleGlzdHNTeW5jKG1ldGFkYXRhUGF0aCkpIHJldHVybiBudWxsO1xuICB0cnkge1xuICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKG1ldGFkYXRhUGF0aCwgXCJ1dGY4XCIpKSBhcyBQYXJ0aWFsPFN0b3JlSW5zdGFsbE1ldGFkYXRhPjtcbiAgICBpZiAodHlwZW9mIHBhcnNlZC5yZXBvICE9PSBcInN0cmluZ1wiIHx8IHR5cGVvZiBwYXJzZWQuYXBwcm92ZWRDb21taXRTaGEgIT09IFwic3RyaW5nXCIpIHJldHVybiBudWxsO1xuICAgIHJldHVybiB7XG4gICAgICByZXBvOiBwYXJzZWQucmVwbyxcbiAgICAgIGFwcHJvdmVkQ29tbWl0U2hhOiBwYXJzZWQuYXBwcm92ZWRDb21taXRTaGEsXG4gICAgICBpbnN0YWxsZWRBdDogdHlwZW9mIHBhcnNlZC5pbnN0YWxsZWRBdCA9PT0gXCJzdHJpbmdcIiA/IHBhcnNlZC5pbnN0YWxsZWRBdCA6IFwiXCIsXG4gICAgICBzdG9yZUluZGV4VXJsOiB0eXBlb2YgcGFyc2VkLnN0b3JlSW5kZXhVcmwgPT09IFwic3RyaW5nXCIgPyBwYXJzZWQuc3RvcmVJbmRleFVybCA6IFwiXCIsXG4gICAgICBmaWxlczogaXNIYXNoUmVjb3JkKHBhcnNlZC5maWxlcykgPyBwYXJzZWQuZmlsZXMgOiB1bmRlZmluZWQsXG4gICAgfTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hCYXNlbGluZVN0b3JlVHdlYWtIYXNoZXMoXG4gIG1ldGFkYXRhOiBTdG9yZUluc3RhbGxNZXRhZGF0YSxcbiAgd29yazogc3RyaW5nLFxuKTogUHJvbWlzZTxSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+PiB7XG4gIGNvbnN0IGJhc2VsaW5lRGlyID0gam9pbih3b3JrLCBcImJhc2VsaW5lXCIpO1xuICBjb25zdCBhcmNoaXZlID0gam9pbih3b3JrLCBcImJhc2VsaW5lLnRhci5nelwiKTtcbiAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goYGh0dHBzOi8vY29kZWxvYWQuZ2l0aHViLmNvbS8ke21ldGFkYXRhLnJlcG99L3Rhci5nei8ke21ldGFkYXRhLmFwcHJvdmVkQ29tbWl0U2hhfWAsIHtcbiAgICBoZWFkZXJzOiB7IFwiVXNlci1BZ2VudFwiOiBgY29kZXgtcGx1c3BsdXMvJHtDT0RFWF9QTFVTUExVU19WRVJTSU9OfWAgfSxcbiAgICByZWRpcmVjdDogXCJmb2xsb3dcIixcbiAgfSk7XG4gIGlmICghcmVzLm9rKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCB2ZXJpZnkgbG9jYWwgdHdlYWsgY2hhbmdlcyBiZWZvcmUgdXBkYXRlOiAke3Jlcy5zdGF0dXN9YCk7XG4gIHdyaXRlRmlsZVN5bmMoYXJjaGl2ZSwgQnVmZmVyLmZyb20oYXdhaXQgcmVzLmFycmF5QnVmZmVyKCkpKTtcbiAgbWtkaXJTeW5jKGJhc2VsaW5lRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgZXh0cmFjdFRhckFyY2hpdmUoYXJjaGl2ZSwgYmFzZWxpbmVEaXIpO1xuICBjb25zdCBzb3VyY2UgPSBmaW5kVHdlYWtSb290KGJhc2VsaW5lRGlyKTtcbiAgaWYgKCFzb3VyY2UpIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCB2ZXJpZnkgbG9jYWwgdHdlYWsgY2hhbmdlcyBiZWZvcmUgdXBkYXRlOiBiYXNlbGluZSBtYW5pZmVzdCBtaXNzaW5nXCIpO1xuICByZXR1cm4gaGFzaFR3ZWFrU291cmNlKHNvdXJjZSk7XG59XG5cbmZ1bmN0aW9uIGhhc2hUd2Vha1NvdXJjZShyb290OiBzdHJpbmcpOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHtcbiAgY29uc3Qgb3V0OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gIGNvbGxlY3RUd2Vha0ZpbGVIYXNoZXMocm9vdCwgcm9vdCwgb3V0KTtcbiAgcmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gY29sbGVjdFR3ZWFrRmlsZUhhc2hlcyhyb290OiBzdHJpbmcsIGRpcjogc3RyaW5nLCBvdXQ6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBuYW1lIG9mIHJlYWRkaXJTeW5jKGRpcikuc29ydCgpKSB7XG4gICAgaWYgKG5hbWUgPT09IFwiLmdpdFwiIHx8IG5hbWUgPT09IFwibm9kZV9tb2R1bGVzXCIgfHwgbmFtZSA9PT0gXCIuY29kZXhwcC1zdG9yZS5qc29uXCIpIGNvbnRpbnVlO1xuICAgIGNvbnN0IGZ1bGwgPSBqb2luKGRpciwgbmFtZSk7XG4gICAgY29uc3QgcmVsID0gcmVsYXRpdmUocm9vdCwgZnVsbCkuc3BsaXQoXCJcXFxcXCIpLmpvaW4oXCIvXCIpO1xuICAgIGNvbnN0IHN0YXQgPSBzdGF0U3luYyhmdWxsKTtcbiAgICBpZiAoc3RhdC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICBjb2xsZWN0VHdlYWtGaWxlSGFzaGVzKHJvb3QsIGZ1bGwsIG91dCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKCFzdGF0LmlzRmlsZSgpKSBjb250aW51ZTtcbiAgICBvdXRbcmVsXSA9IGNyZWF0ZUhhc2goXCJzaGEyNTZcIikudXBkYXRlKHJlYWRGaWxlU3luYyhmdWxsKSkuZGlnZXN0KFwiaGV4XCIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNhbWVGaWxlSGFzaGVzKGE6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4sIGI6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pOiBib29sZWFuIHtcbiAgY29uc3QgYWsgPSBPYmplY3Qua2V5cyhhKS5zb3J0KCk7XG4gIGNvbnN0IGJrID0gT2JqZWN0LmtleXMoYikuc29ydCgpO1xuICBpZiAoYWsubGVuZ3RoICE9PSBiay5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBhay5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGtleSA9IGFrW2ldO1xuICAgIGlmIChrZXkgIT09IGJrW2ldIHx8IGFba2V5XSAhPT0gYltrZXldKSByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGlzSGFzaFJlY29yZCh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4ge1xuICBpZiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZSAhPT0gXCJvYmplY3RcIiB8fCBBcnJheS5pc0FycmF5KHZhbHVlKSkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gT2JqZWN0LnZhbHVlcyh2YWx1ZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikuZXZlcnkoKHYpID0+IHR5cGVvZiB2ID09PSBcInN0cmluZ1wiKTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplVmVyc2lvbih2OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdi50cmltKCkucmVwbGFjZSgvXnYvaSwgXCJcIik7XG59XG5cbmZ1bmN0aW9uIGNvbXBhcmVWZXJzaW9ucyhhOiBzdHJpbmcsIGI6IHN0cmluZyk6IG51bWJlciB7XG4gIGNvbnN0IGF2ID0gVkVSU0lPTl9SRS5leGVjKGEpO1xuICBjb25zdCBidiA9IFZFUlNJT05fUkUuZXhlYyhiKTtcbiAgaWYgKCFhdiB8fCAhYnYpIHJldHVybiAwO1xuICBmb3IgKGxldCBpID0gMTsgaSA8PSAzOyBpKyspIHtcbiAgICBjb25zdCBkaWZmID0gTnVtYmVyKGF2W2ldKSAtIE51bWJlcihidltpXSk7XG4gICAgaWYgKGRpZmYgIT09IDApIHJldHVybiBkaWZmO1xuICB9XG4gIHJldHVybiAwO1xufVxuXG5mdW5jdGlvbiBmYWxsYmFja1NvdXJjZVJvb3QoKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IGNhbmRpZGF0ZXMgPSBbXG4gICAgam9pbihob21lZGlyKCksIFwiLmNvZGV4LXBsdXNwbHVzXCIsIFwic291cmNlXCIpLFxuICAgIGpvaW4odXNlclJvb3QhLCBcInNvdXJjZVwiKSxcbiAgXTtcbiAgZm9yIChjb25zdCBjYW5kaWRhdGUgb2YgY2FuZGlkYXRlcykge1xuICAgIGlmIChleGlzdHNTeW5jKGpvaW4oY2FuZGlkYXRlLCBcInBhY2thZ2VzXCIsIFwiaW5zdGFsbGVyXCIsIFwiZGlzdFwiLCBcImNsaS5qc1wiKSkpIHJldHVybiBjYW5kaWRhdGU7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGRlc2NyaWJlSW5zdGFsbGF0aW9uU291cmNlKHNvdXJjZVJvb3Q6IHN0cmluZyB8IG51bGwpOiBJbnN0YWxsYXRpb25Tb3VyY2Uge1xuICBpZiAoIXNvdXJjZVJvb3QpIHtcbiAgICByZXR1cm4ge1xuICAgICAga2luZDogXCJ1bmtub3duXCIsXG4gICAgICBsYWJlbDogXCJVbmtub3duXCIsXG4gICAgICBkZXRhaWw6IFwiQ29kZXgrKyBzb3VyY2UgbG9jYXRpb24gaXMgbm90IHJlY29yZGVkIHlldC5cIixcbiAgICB9O1xuICB9XG4gIGNvbnN0IG5vcm1hbGl6ZWQgPSBzb3VyY2VSb290LnJlcGxhY2UoL1xcXFwvZywgXCIvXCIpO1xuICBpZiAoL1xcLyg/OkhvbWVicmV3fGhvbWVicmV3KVxcL0NlbGxhclxcL2NvZGV4cGx1c3BsdXNcXC8vLnRlc3Qobm9ybWFsaXplZCkpIHtcbiAgICByZXR1cm4geyBraW5kOiBcImhvbWVicmV3XCIsIGxhYmVsOiBcIkhvbWVicmV3XCIsIGRldGFpbDogc291cmNlUm9vdCB9O1xuICB9XG4gIGlmIChleGlzdHNTeW5jKGpvaW4oc291cmNlUm9vdCwgXCIuZ2l0XCIpKSkge1xuICAgIHJldHVybiB7IGtpbmQ6IFwibG9jYWwtZGV2XCIsIGxhYmVsOiBcIkxvY2FsIGRldmVsb3BtZW50IGNoZWNrb3V0XCIsIGRldGFpbDogc291cmNlUm9vdCB9O1xuICB9XG4gIGlmIChub3JtYWxpemVkLmVuZHNXaXRoKFwiLy5jb2RleC1wbHVzcGx1cy9zb3VyY2VcIikgfHwgbm9ybWFsaXplZC5pbmNsdWRlcyhcIi8uY29kZXgtcGx1c3BsdXMvc291cmNlL1wiKSkge1xuICAgIHJldHVybiB7IGtpbmQ6IFwiZ2l0aHViLXNvdXJjZVwiLCBsYWJlbDogXCJHaXRIdWIgc291cmNlIGluc3RhbGxlclwiLCBkZXRhaWw6IHNvdXJjZVJvb3QgfTtcbiAgfVxuICBpZiAoZXhpc3RzU3luYyhqb2luKHNvdXJjZVJvb3QsIFwicGFja2FnZS5qc29uXCIpKSkge1xuICAgIHJldHVybiB7IGtpbmQ6IFwic291cmNlLWFyY2hpdmVcIiwgbGFiZWw6IFwiU291cmNlIGFyY2hpdmVcIiwgZGV0YWlsOiBzb3VyY2VSb290IH07XG4gIH1cbiAgcmV0dXJuIHsga2luZDogXCJ1bmtub3duXCIsIGxhYmVsOiBcIlVua25vd25cIiwgZGV0YWlsOiBzb3VyY2VSb290IH07XG59XG5cbmZ1bmN0aW9uIHN0YXJ0SW5zdGFsbGVkQ2xpKGNsaTogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXSk6IHZvaWQge1xuICBjb25zdCBjaGlsZCA9IHNwYXduKHByb2Nlc3MuZXhlY1BhdGgsIFtjbGksIC4uLmFyZ3NdLCB7XG4gICAgY3dkOiByZXNvbHZlKGRpcm5hbWUoY2xpKSwgXCIuLlwiLCBcIi4uXCIsIFwiLi5cIiksXG4gICAgZW52OiB7IC4uLnByb2Nlc3MuZW52LCBDT0RFWF9QTFVTUExVU19NQU5VQUxfVVBEQVRFOiBcIjFcIiB9LFxuICAgIGRldGFjaGVkOiB0cnVlLFxuICAgIHN0ZGlvOiBcImlnbm9yZVwiLFxuICB9KTtcbiAgY2hpbGQudW5yZWYoKTtcbn1cblxuZnVuY3Rpb24gbWFya1NlbGZVcGRhdGVTdGFydGVkKHNvdXJjZVJvb3Q6IHN0cmluZyk6IFNlbGZVcGRhdGVTdGF0ZSB7XG4gIGNvbnN0IGNvbmZpZyA9IHJlYWRTdGF0ZSgpLmNvZGV4UGx1c1BsdXM7XG4gIGNvbnN0IGNoYW5uZWwgPSBjb25maWc/LnVwZGF0ZUNoYW5uZWwgPz8gXCJzdGFibGVcIjtcbiAgY29uc3Qgc3RhdGU6IFNlbGZVcGRhdGVTdGF0ZSA9IHtcbiAgICBjaGVja2VkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICBzdGF0dXM6IFwiY2hlY2tpbmdcIixcbiAgICBjdXJyZW50VmVyc2lvbjogQ09ERVhfUExVU1BMVVNfVkVSU0lPTixcbiAgICBsYXRlc3RWZXJzaW9uOiBudWxsLFxuICAgIHRhcmdldFJlZjogY29uZmlnPy51cGRhdGVDaGFubmVsID09PSBcImN1c3RvbVwiID8gY29uZmlnLnVwZGF0ZVJlZiA/PyBudWxsIDogbnVsbCxcbiAgICByZWxlYXNlVXJsOiBudWxsLFxuICAgIHJlcG86IGNvbmZpZz8udXBkYXRlUmVwbyA/PyBDT0RFWF9QTFVTUExVU19SRVBPLFxuICAgIGNoYW5uZWwsXG4gICAgc291cmNlUm9vdCxcbiAgICBpbnN0YWxsYXRpb25Tb3VyY2U6IGRlc2NyaWJlSW5zdGFsbGF0aW9uU291cmNlKHNvdXJjZVJvb3QpLFxuICB9O1xuICB3cml0ZVNlbGZVcGRhdGVTdGF0ZShzdGF0ZSk7XG4gIHJldHVybiBzdGF0ZTtcbn1cblxuZnVuY3Rpb24gYnJvYWRjYXN0UmVsb2FkKCk6IHZvaWQge1xuICBjb25zdCBwYXlsb2FkID0ge1xuICAgIGF0OiBEYXRlLm5vdygpLFxuICAgIHR3ZWFrczogdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLm1hcCgodCkgPT4gdC5tYW5pZmVzdC5pZCksXG4gIH07XG4gIGZvciAoY29uc3Qgd2Mgb2Ygd2ViQ29udGVudHMuZ2V0QWxsV2ViQ29udGVudHMoKSkge1xuICAgIHRyeSB7XG4gICAgICB3Yy5zZW5kKFwiY29kZXhwcDp0d2Vha3MtY2hhbmdlZFwiLCBwYXlsb2FkKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2coXCJ3YXJuXCIsIFwiYnJvYWRjYXN0IHNlbmQgZmFpbGVkOlwiLCBlKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gbWFrZUxvZ2dlcihzY29wZTogc3RyaW5nKSB7XG4gIHJldHVybiB7XG4gICAgZGVidWc6ICguLi5hOiB1bmtub3duW10pID0+IGxvZyhcImluZm9cIiwgYFske3Njb3BlfV1gLCAuLi5hKSxcbiAgICBpbmZvOiAoLi4uYTogdW5rbm93bltdKSA9PiBsb2coXCJpbmZvXCIsIGBbJHtzY29wZX1dYCwgLi4uYSksXG4gICAgd2FybjogKC4uLmE6IHVua25vd25bXSkgPT4gbG9nKFwid2FyblwiLCBgWyR7c2NvcGV9XWAsIC4uLmEpLFxuICAgIGVycm9yOiAoLi4uYTogdW5rbm93bltdKSA9PiBsb2coXCJlcnJvclwiLCBgWyR7c2NvcGV9XWAsIC4uLmEpLFxuICB9O1xufVxuXG5mdW5jdGlvbiBtYWtlTWFpbklwYyhpZDogc3RyaW5nKSB7XG4gIGNvbnN0IGNoID0gKGM6IHN0cmluZykgPT4gYGNvZGV4cHA6JHtpZH06JHtjfWA7XG4gIHJldHVybiB7XG4gICAgb246IChjOiBzdHJpbmcsIGg6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpID0+IHtcbiAgICAgIGNvbnN0IHdyYXBwZWQgPSAoX2U6IHVua25vd24sIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gaCguLi5hcmdzKTtcbiAgICAgIGlwY01haW4ub24oY2goYyksIHdyYXBwZWQpO1xuICAgICAgcmV0dXJuICgpID0+IGlwY01haW4ucmVtb3ZlTGlzdGVuZXIoY2goYyksIHdyYXBwZWQgYXMgbmV2ZXIpO1xuICAgIH0sXG4gICAgc2VuZDogKF9jOiBzdHJpbmcpID0+IHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImlwYy5zZW5kIGlzIHJlbmRlcmVyXHUyMTkybWFpbjsgbWFpbiBzaWRlIHVzZXMgaGFuZGxlL29uXCIpO1xuICAgIH0sXG4gICAgaW52b2tlOiAoX2M6IHN0cmluZykgPT4ge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaXBjLmludm9rZSBpcyByZW5kZXJlclx1MjE5Mm1haW47IG1haW4gc2lkZSB1c2VzIGhhbmRsZVwiKTtcbiAgICB9LFxuICAgIGhhbmRsZTogKGM6IHN0cmluZywgaGFuZGxlcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdW5rbm93bikgPT4ge1xuICAgICAgaXBjTWFpbi5oYW5kbGUoY2goYyksIChfZTogdW5rbm93biwgLi4uYXJnczogdW5rbm93bltdKSA9PiBoYW5kbGVyKC4uLmFyZ3MpKTtcbiAgICB9LFxuICB9O1xufVxuXG5mdW5jdGlvbiBtYWtlTWFpbkZzKGlkOiBzdHJpbmcpIHtcbiAgY29uc3QgZGlyID0gam9pbih1c2VyUm9vdCEsIFwidHdlYWstZGF0YVwiLCBpZCk7XG4gIG1rZGlyU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICBjb25zdCBmcyA9IHJlcXVpcmUoXCJub2RlOmZzL3Byb21pc2VzXCIpIGFzIHR5cGVvZiBpbXBvcnQoXCJub2RlOmZzL3Byb21pc2VzXCIpO1xuICByZXR1cm4ge1xuICAgIGRhdGFEaXI6IGRpcixcbiAgICByZWFkOiAocDogc3RyaW5nKSA9PiBmcy5yZWFkRmlsZShqb2luKGRpciwgcCksIFwidXRmOFwiKSxcbiAgICB3cml0ZTogKHA6IHN0cmluZywgYzogc3RyaW5nKSA9PiBmcy53cml0ZUZpbGUoam9pbihkaXIsIHApLCBjLCBcInV0ZjhcIiksXG4gICAgZXhpc3RzOiBhc3luYyAocDogc3RyaW5nKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBmcy5hY2Nlc3Moam9pbihkaXIsIHApKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH0sXG4gIH07XG59XG5cbmZ1bmN0aW9uIG1ha2VDb2RleEFwaSgpIHtcbiAgcmV0dXJuIHtcbiAgICBjcmVhdGVCcm93c2VyVmlldzogYXN5bmMgKG9wdHM6IENvZGV4Q3JlYXRlVmlld09wdGlvbnMpID0+IHtcbiAgICAgIGNvbnN0IHNlcnZpY2VzID0gZ2V0Q29kZXhXaW5kb3dTZXJ2aWNlcygpO1xuICAgICAgY29uc3Qgd2luZG93TWFuYWdlciA9IHNlcnZpY2VzPy53aW5kb3dNYW5hZ2VyO1xuICAgICAgaWYgKCFzZXJ2aWNlcyB8fCAhd2luZG93TWFuYWdlcj8ucmVnaXN0ZXJXaW5kb3cpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIFwiQ29kZXggZW1iZWRkZWQgdmlldyBzZXJ2aWNlcyBhcmUgbm90IGF2YWlsYWJsZS4gUmVpbnN0YWxsIENvZGV4KysgMC4xLjEgb3IgbGF0ZXIuXCIsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJvdXRlID0gbm9ybWFsaXplQ29kZXhSb3V0ZShvcHRzLnJvdXRlKTtcbiAgICAgIGNvbnN0IGhvc3RJZCA9IG9wdHMuaG9zdElkIHx8IFwibG9jYWxcIjtcbiAgICAgIGNvbnN0IGFwcGVhcmFuY2UgPSBvcHRzLmFwcGVhcmFuY2UgfHwgXCJzZWNvbmRhcnlcIjtcbiAgICAgIGNvbnN0IHZpZXcgPSBuZXcgQnJvd3NlclZpZXcoe1xuICAgICAgICB3ZWJQcmVmZXJlbmNlczoge1xuICAgICAgICAgIHByZWxvYWQ6IHdpbmRvd01hbmFnZXIub3B0aW9ucz8ucHJlbG9hZFBhdGgsXG4gICAgICAgICAgY29udGV4dElzb2xhdGlvbjogdHJ1ZSxcbiAgICAgICAgICBub2RlSW50ZWdyYXRpb246IGZhbHNlLFxuICAgICAgICAgIHNwZWxsY2hlY2s6IGZhbHNlLFxuICAgICAgICAgIGRldlRvb2xzOiB3aW5kb3dNYW5hZ2VyLm9wdGlvbnM/LmFsbG93RGV2dG9vbHMsXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHdpbmRvd0xpa2UgPSBtYWtlV2luZG93TGlrZUZvclZpZXcodmlldyk7XG4gICAgICB3aW5kb3dNYW5hZ2VyLnJlZ2lzdGVyV2luZG93KHdpbmRvd0xpa2UsIGhvc3RJZCwgZmFsc2UsIGFwcGVhcmFuY2UpO1xuICAgICAgc2VydmljZXMuZ2V0Q29udGV4dD8uKGhvc3RJZCk/LnJlZ2lzdGVyV2luZG93Py4od2luZG93TGlrZSk7XG4gICAgICBhd2FpdCB2aWV3LndlYkNvbnRlbnRzLmxvYWRVUkwoY29kZXhBcHBVcmwocm91dGUsIGhvc3RJZCkpO1xuICAgICAgcmV0dXJuIHZpZXc7XG4gICAgfSxcblxuICAgIGNyZWF0ZVdpbmRvdzogYXN5bmMgKG9wdHM6IENvZGV4Q3JlYXRlV2luZG93T3B0aW9ucykgPT4ge1xuICAgICAgY29uc3Qgc2VydmljZXMgPSBnZXRDb2RleFdpbmRvd1NlcnZpY2VzKCk7XG4gICAgICBpZiAoIXNlcnZpY2VzKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBcIkNvZGV4IHdpbmRvdyBzZXJ2aWNlcyBhcmUgbm90IGF2YWlsYWJsZS4gUmVpbnN0YWxsIENvZGV4KysgMC4xLjEgb3IgbGF0ZXIuXCIsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJvdXRlID0gbm9ybWFsaXplQ29kZXhSb3V0ZShvcHRzLnJvdXRlKTtcbiAgICAgIGNvbnN0IGhvc3RJZCA9IG9wdHMuaG9zdElkIHx8IFwibG9jYWxcIjtcbiAgICAgIGNvbnN0IHBhcmVudCA9IHR5cGVvZiBvcHRzLnBhcmVudFdpbmRvd0lkID09PSBcIm51bWJlclwiXG4gICAgICAgID8gQnJvd3NlcldpbmRvdy5mcm9tSWQob3B0cy5wYXJlbnRXaW5kb3dJZClcbiAgICAgICAgOiBCcm93c2VyV2luZG93LmdldEZvY3VzZWRXaW5kb3coKTtcbiAgICAgIGNvbnN0IGNyZWF0ZVdpbmRvdyA9IHNlcnZpY2VzLndpbmRvd01hbmFnZXI/LmNyZWF0ZVdpbmRvdztcblxuICAgICAgbGV0IHdpbjogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGwgfCB1bmRlZmluZWQ7XG4gICAgICBpZiAodHlwZW9mIGNyZWF0ZVdpbmRvdyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHdpbiA9IGF3YWl0IGNyZWF0ZVdpbmRvdy5jYWxsKHNlcnZpY2VzLndpbmRvd01hbmFnZXIsIHtcbiAgICAgICAgICBpbml0aWFsUm91dGU6IHJvdXRlLFxuICAgICAgICAgIGhvc3RJZCxcbiAgICAgICAgICBzaG93OiBvcHRzLnNob3cgIT09IGZhbHNlLFxuICAgICAgICAgIGFwcGVhcmFuY2U6IG9wdHMuYXBwZWFyYW5jZSB8fCBcInNlY29uZGFyeVwiLFxuICAgICAgICAgIHBhcmVudCxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKGhvc3RJZCA9PT0gXCJsb2NhbFwiICYmIHR5cGVvZiBzZXJ2aWNlcy5jcmVhdGVGcmVzaExvY2FsV2luZG93ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgd2luID0gYXdhaXQgc2VydmljZXMuY3JlYXRlRnJlc2hMb2NhbFdpbmRvdyhyb3V0ZSk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBzZXJ2aWNlcy5lbnN1cmVIb3N0V2luZG93ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgd2luID0gYXdhaXQgc2VydmljZXMuZW5zdXJlSG9zdFdpbmRvdyhob3N0SWQpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXdpbiB8fCB3aW4uaXNEZXN0cm95ZWQoKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb2RleCBkaWQgbm90IHJldHVybiBhIHdpbmRvdyBmb3IgdGhlIHJlcXVlc3RlZCByb3V0ZVwiKTtcbiAgICAgIH1cblxuICAgICAgaWYgKG9wdHMuYm91bmRzKSB7XG4gICAgICAgIHdpbi5zZXRCb3VuZHMob3B0cy5ib3VuZHMpO1xuICAgICAgfVxuICAgICAgaWYgKHBhcmVudCAmJiAhcGFyZW50LmlzRGVzdHJveWVkKCkpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB3aW4uc2V0UGFyZW50V2luZG93KHBhcmVudCk7XG4gICAgICAgIH0gY2F0Y2gge31cbiAgICAgIH1cbiAgICAgIGlmIChvcHRzLnNob3cgIT09IGZhbHNlKSB7XG4gICAgICAgIHdpbi5zaG93KCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHdpbmRvd0lkOiB3aW4uaWQsXG4gICAgICAgIHdlYkNvbnRlbnRzSWQ6IHdpbi53ZWJDb250ZW50cy5pZCxcbiAgICAgIH07XG4gICAgfSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gbWFrZVdpbmRvd0xpa2VGb3JWaWV3KHZpZXc6IEVsZWN0cm9uLkJyb3dzZXJWaWV3KTogQ29kZXhXaW5kb3dMaWtlIHtcbiAgY29uc3Qgdmlld0JvdW5kcyA9ICgpID0+IHZpZXcuZ2V0Qm91bmRzKCk7XG4gIHJldHVybiB7XG4gICAgaWQ6IHZpZXcud2ViQ29udGVudHMuaWQsXG4gICAgd2ViQ29udGVudHM6IHZpZXcud2ViQ29udGVudHMsXG4gICAgb246IChldmVudDogXCJjbG9zZWRcIiwgbGlzdGVuZXI6ICgpID0+IHZvaWQpID0+IHtcbiAgICAgIGlmIChldmVudCA9PT0gXCJjbG9zZWRcIikge1xuICAgICAgICB2aWV3LndlYkNvbnRlbnRzLm9uY2UoXCJkZXN0cm95ZWRcIiwgbGlzdGVuZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmlldy53ZWJDb250ZW50cy5vbihldmVudCwgbGlzdGVuZXIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHZpZXc7XG4gICAgfSxcbiAgICBvbmNlOiAoZXZlbnQ6IHN0cmluZywgbGlzdGVuZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpID0+IHtcbiAgICAgIHZpZXcud2ViQ29udGVudHMub25jZShldmVudCBhcyBcImRlc3Ryb3llZFwiLCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gdmlldztcbiAgICB9LFxuICAgIG9mZjogKGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKSA9PiB7XG4gICAgICB2aWV3LndlYkNvbnRlbnRzLm9mZihldmVudCBhcyBcImRlc3Ryb3llZFwiLCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gdmlldztcbiAgICB9LFxuICAgIHJlbW92ZUxpc3RlbmVyOiAoZXZlbnQ6IHN0cmluZywgbGlzdGVuZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpID0+IHtcbiAgICAgIHZpZXcud2ViQ29udGVudHMucmVtb3ZlTGlzdGVuZXIoZXZlbnQgYXMgXCJkZXN0cm95ZWRcIiwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHZpZXc7XG4gICAgfSxcbiAgICBpc0Rlc3Ryb3llZDogKCkgPT4gdmlldy53ZWJDb250ZW50cy5pc0Rlc3Ryb3llZCgpLFxuICAgIGlzRm9jdXNlZDogKCkgPT4gdmlldy53ZWJDb250ZW50cy5pc0ZvY3VzZWQoKSxcbiAgICBmb2N1czogKCkgPT4gdmlldy53ZWJDb250ZW50cy5mb2N1cygpLFxuICAgIHNob3c6ICgpID0+IHt9LFxuICAgIGhpZGU6ICgpID0+IHt9LFxuICAgIGdldEJvdW5kczogdmlld0JvdW5kcyxcbiAgICBnZXRDb250ZW50Qm91bmRzOiB2aWV3Qm91bmRzLFxuICAgIGdldFNpemU6ICgpID0+IHtcbiAgICAgIGNvbnN0IGIgPSB2aWV3Qm91bmRzKCk7XG4gICAgICByZXR1cm4gW2Iud2lkdGgsIGIuaGVpZ2h0XTtcbiAgICB9LFxuICAgIGdldENvbnRlbnRTaXplOiAoKSA9PiB7XG4gICAgICBjb25zdCBiID0gdmlld0JvdW5kcygpO1xuICAgICAgcmV0dXJuIFtiLndpZHRoLCBiLmhlaWdodF07XG4gICAgfSxcbiAgICBzZXRUaXRsZTogKCkgPT4ge30sXG4gICAgZ2V0VGl0bGU6ICgpID0+IFwiXCIsXG4gICAgc2V0UmVwcmVzZW50ZWRGaWxlbmFtZTogKCkgPT4ge30sXG4gICAgc2V0RG9jdW1lbnRFZGl0ZWQ6ICgpID0+IHt9LFxuICAgIHNldFdpbmRvd0J1dHRvblZpc2liaWxpdHk6ICgpID0+IHt9LFxuICB9O1xufVxuXG5mdW5jdGlvbiBjb2RleEFwcFVybChyb3V0ZTogc3RyaW5nLCBob3N0SWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHVybCA9IG5ldyBVUkwoXCJhcHA6Ly8tL2luZGV4Lmh0bWxcIik7XG4gIHVybC5zZWFyY2hQYXJhbXMuc2V0KFwiaG9zdElkXCIsIGhvc3RJZCk7XG4gIGlmIChyb3V0ZSAhPT0gXCIvXCIpIHVybC5zZWFyY2hQYXJhbXMuc2V0KFwiaW5pdGlhbFJvdXRlXCIsIHJvdXRlKTtcbiAgcmV0dXJuIHVybC50b1N0cmluZygpO1xufVxuXG5mdW5jdGlvbiBnZXRDb2RleFdpbmRvd1NlcnZpY2VzKCk6IENvZGV4V2luZG93U2VydmljZXMgfCBudWxsIHtcbiAgY29uc3Qgc2VydmljZXMgPSAoZ2xvYmFsVGhpcyBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVtDT0RFWF9XSU5ET1dfU0VSVklDRVNfS0VZXTtcbiAgcmV0dXJuIHNlcnZpY2VzICYmIHR5cGVvZiBzZXJ2aWNlcyA9PT0gXCJvYmplY3RcIiA/IChzZXJ2aWNlcyBhcyBDb2RleFdpbmRvd1NlcnZpY2VzKSA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZUNvZGV4Um91dGUocm91dGU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICh0eXBlb2Ygcm91dGUgIT09IFwic3RyaW5nXCIgfHwgIXJvdXRlLnN0YXJ0c1dpdGgoXCIvXCIpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ29kZXggcm91dGUgbXVzdCBiZSBhbiBhYnNvbHV0ZSBhcHAgcm91dGVcIik7XG4gIH1cbiAgaWYgKHJvdXRlLmluY2x1ZGVzKFwiOi8vXCIpIHx8IHJvdXRlLmluY2x1ZGVzKFwiXFxuXCIpIHx8IHJvdXRlLmluY2x1ZGVzKFwiXFxyXCIpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ29kZXggcm91dGUgbXVzdCBub3QgaW5jbHVkZSBhIHByb3RvY29sIG9yIGNvbnRyb2wgY2hhcmFjdGVyc1wiKTtcbiAgfVxuICByZXR1cm4gcm91dGU7XG59XG5cbi8vIFRvdWNoIEJyb3dzZXJXaW5kb3cgdG8ga2VlcCBpdHMgaW1wb3J0IFx1MjAxNCBvbGRlciBFbGVjdHJvbiBsaW50IHJ1bGVzLlxudm9pZCBCcm93c2VyV2luZG93O1xuIiwgIi8qISBjaG9raWRhciAtIE1JVCBMaWNlbnNlIChjKSAyMDEyIFBhdWwgTWlsbGVyIChwYXVsbWlsbHIuY29tKSAqL1xuaW1wb3J0IHsgc3RhdCBhcyBzdGF0Y2IgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyBzdGF0LCByZWFkZGlyIH0gZnJvbSAnZnMvcHJvbWlzZXMnO1xuaW1wb3J0IHsgRXZlbnRFbWl0dGVyIH0gZnJvbSAnZXZlbnRzJztcbmltcG9ydCAqIGFzIHN5c1BhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyByZWFkZGlycCB9IGZyb20gJ3JlYWRkaXJwJztcbmltcG9ydCB7IE5vZGVGc0hhbmRsZXIsIEVWRU5UUyBhcyBFViwgaXNXaW5kb3dzLCBpc0lCTWksIEVNUFRZX0ZOLCBTVFJfQ0xPU0UsIFNUUl9FTkQsIH0gZnJvbSAnLi9oYW5kbGVyLmpzJztcbmNvbnN0IFNMQVNIID0gJy8nO1xuY29uc3QgU0xBU0hfU0xBU0ggPSAnLy8nO1xuY29uc3QgT05FX0RPVCA9ICcuJztcbmNvbnN0IFRXT19ET1RTID0gJy4uJztcbmNvbnN0IFNUUklOR19UWVBFID0gJ3N0cmluZyc7XG5jb25zdCBCQUNLX1NMQVNIX1JFID0gL1xcXFwvZztcbmNvbnN0IERPVUJMRV9TTEFTSF9SRSA9IC9cXC9cXC8vO1xuY29uc3QgRE9UX1JFID0gL1xcLi4qXFwuKHN3W3B4XSkkfH4kfFxcLnN1YmwuKlxcLnRtcC87XG5jb25zdCBSRVBMQUNFUl9SRSA9IC9eXFwuWy9cXFxcXS87XG5mdW5jdGlvbiBhcnJpZnkoaXRlbSkge1xuICAgIHJldHVybiBBcnJheS5pc0FycmF5KGl0ZW0pID8gaXRlbSA6IFtpdGVtXTtcbn1cbmNvbnN0IGlzTWF0Y2hlck9iamVjdCA9IChtYXRjaGVyKSA9PiB0eXBlb2YgbWF0Y2hlciA9PT0gJ29iamVjdCcgJiYgbWF0Y2hlciAhPT0gbnVsbCAmJiAhKG1hdGNoZXIgaW5zdGFuY2VvZiBSZWdFeHApO1xuZnVuY3Rpb24gY3JlYXRlUGF0dGVybihtYXRjaGVyKSB7XG4gICAgaWYgKHR5cGVvZiBtYXRjaGVyID09PSAnZnVuY3Rpb24nKVxuICAgICAgICByZXR1cm4gbWF0Y2hlcjtcbiAgICBpZiAodHlwZW9mIG1hdGNoZXIgPT09ICdzdHJpbmcnKVxuICAgICAgICByZXR1cm4gKHN0cmluZykgPT4gbWF0Y2hlciA9PT0gc3RyaW5nO1xuICAgIGlmIChtYXRjaGVyIGluc3RhbmNlb2YgUmVnRXhwKVxuICAgICAgICByZXR1cm4gKHN0cmluZykgPT4gbWF0Y2hlci50ZXN0KHN0cmluZyk7XG4gICAgaWYgKHR5cGVvZiBtYXRjaGVyID09PSAnb2JqZWN0JyAmJiBtYXRjaGVyICE9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiAoc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICBpZiAobWF0Y2hlci5wYXRoID09PSBzdHJpbmcpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICBpZiAobWF0Y2hlci5yZWN1cnNpdmUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZWxhdGl2ZSA9IHN5c1BhdGgucmVsYXRpdmUobWF0Y2hlci5wYXRoLCBzdHJpbmcpO1xuICAgICAgICAgICAgICAgIGlmICghcmVsYXRpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gIXJlbGF0aXZlLnN0YXJ0c1dpdGgoJy4uJykgJiYgIXN5c1BhdGguaXNBYnNvbHV0ZShyZWxhdGl2ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiAoKSA9PiBmYWxzZTtcbn1cbmZ1bmN0aW9uIG5vcm1hbGl6ZVBhdGgocGF0aCkge1xuICAgIGlmICh0eXBlb2YgcGF0aCAhPT0gJ3N0cmluZycpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignc3RyaW5nIGV4cGVjdGVkJyk7XG4gICAgcGF0aCA9IHN5c1BhdGgubm9ybWFsaXplKHBhdGgpO1xuICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBsZXQgcHJlcGVuZCA9IGZhbHNlO1xuICAgIGlmIChwYXRoLnN0YXJ0c1dpdGgoJy8vJykpXG4gICAgICAgIHByZXBlbmQgPSB0cnVlO1xuICAgIGNvbnN0IERPVUJMRV9TTEFTSF9SRSA9IC9cXC9cXC8vO1xuICAgIHdoaWxlIChwYXRoLm1hdGNoKERPVUJMRV9TTEFTSF9SRSkpXG4gICAgICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoRE9VQkxFX1NMQVNIX1JFLCAnLycpO1xuICAgIGlmIChwcmVwZW5kKVxuICAgICAgICBwYXRoID0gJy8nICsgcGF0aDtcbiAgICByZXR1cm4gcGF0aDtcbn1cbmZ1bmN0aW9uIG1hdGNoUGF0dGVybnMocGF0dGVybnMsIHRlc3RTdHJpbmcsIHN0YXRzKSB7XG4gICAgY29uc3QgcGF0aCA9IG5vcm1hbGl6ZVBhdGgodGVzdFN0cmluZyk7XG4gICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IHBhdHRlcm5zLmxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICBjb25zdCBwYXR0ZXJuID0gcGF0dGVybnNbaW5kZXhdO1xuICAgICAgICBpZiAocGF0dGVybihwYXRoLCBzdGF0cykpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cbmZ1bmN0aW9uIGFueW1hdGNoKG1hdGNoZXJzLCB0ZXN0U3RyaW5nKSB7XG4gICAgaWYgKG1hdGNoZXJzID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYW55bWF0Y2g6IHNwZWNpZnkgZmlyc3QgYXJndW1lbnQnKTtcbiAgICB9XG4gICAgLy8gRWFybHkgY2FjaGUgZm9yIG1hdGNoZXJzLlxuICAgIGNvbnN0IG1hdGNoZXJzQXJyYXkgPSBhcnJpZnkobWF0Y2hlcnMpO1xuICAgIGNvbnN0IHBhdHRlcm5zID0gbWF0Y2hlcnNBcnJheS5tYXAoKG1hdGNoZXIpID0+IGNyZWF0ZVBhdHRlcm4obWF0Y2hlcikpO1xuICAgIGlmICh0ZXN0U3RyaW5nID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuICh0ZXN0U3RyaW5nLCBzdGF0cykgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoUGF0dGVybnMocGF0dGVybnMsIHRlc3RTdHJpbmcsIHN0YXRzKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIG1hdGNoUGF0dGVybnMocGF0dGVybnMsIHRlc3RTdHJpbmcpO1xufVxuY29uc3QgdW5pZnlQYXRocyA9IChwYXRoc18pID0+IHtcbiAgICBjb25zdCBwYXRocyA9IGFycmlmeShwYXRoc18pLmZsYXQoKTtcbiAgICBpZiAoIXBhdGhzLmV2ZXJ5KChwKSA9PiB0eXBlb2YgcCA9PT0gU1RSSU5HX1RZUEUpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYE5vbi1zdHJpbmcgcHJvdmlkZWQgYXMgd2F0Y2ggcGF0aDogJHtwYXRoc31gKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhdGhzLm1hcChub3JtYWxpemVQYXRoVG9Vbml4KTtcbn07XG4vLyBJZiBTTEFTSF9TTEFTSCBvY2N1cnMgYXQgdGhlIGJlZ2lubmluZyBvZiBwYXRoLCBpdCBpcyBub3QgcmVwbGFjZWRcbi8vICAgICBiZWNhdXNlIFwiLy9TdG9yYWdlUEMvRHJpdmVQb29sL01vdmllc1wiIGlzIGEgdmFsaWQgbmV0d29yayBwYXRoXG5jb25zdCB0b1VuaXggPSAoc3RyaW5nKSA9PiB7XG4gICAgbGV0IHN0ciA9IHN0cmluZy5yZXBsYWNlKEJBQ0tfU0xBU0hfUkUsIFNMQVNIKTtcbiAgICBsZXQgcHJlcGVuZCA9IGZhbHNlO1xuICAgIGlmIChzdHIuc3RhcnRzV2l0aChTTEFTSF9TTEFTSCkpIHtcbiAgICAgICAgcHJlcGVuZCA9IHRydWU7XG4gICAgfVxuICAgIHdoaWxlIChzdHIubWF0Y2goRE9VQkxFX1NMQVNIX1JFKSkge1xuICAgICAgICBzdHIgPSBzdHIucmVwbGFjZShET1VCTEVfU0xBU0hfUkUsIFNMQVNIKTtcbiAgICB9XG4gICAgaWYgKHByZXBlbmQpIHtcbiAgICAgICAgc3RyID0gU0xBU0ggKyBzdHI7XG4gICAgfVxuICAgIHJldHVybiBzdHI7XG59O1xuLy8gT3VyIHZlcnNpb24gb2YgdXBhdGgubm9ybWFsaXplXG4vLyBUT0RPOiB0aGlzIGlzIG5vdCBlcXVhbCB0byBwYXRoLW5vcm1hbGl6ZSBtb2R1bGUgLSBpbnZlc3RpZ2F0ZSB3aHlcbmNvbnN0IG5vcm1hbGl6ZVBhdGhUb1VuaXggPSAocGF0aCkgPT4gdG9Vbml4KHN5c1BhdGgubm9ybWFsaXplKHRvVW5peChwYXRoKSkpO1xuLy8gVE9ETzogcmVmYWN0b3JcbmNvbnN0IG5vcm1hbGl6ZUlnbm9yZWQgPSAoY3dkID0gJycpID0+IChwYXRoKSA9PiB7XG4gICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gbm9ybWFsaXplUGF0aFRvVW5peChzeXNQYXRoLmlzQWJzb2x1dGUocGF0aCkgPyBwYXRoIDogc3lzUGF0aC5qb2luKGN3ZCwgcGF0aCkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHBhdGg7XG4gICAgfVxufTtcbmNvbnN0IGdldEFic29sdXRlUGF0aCA9IChwYXRoLCBjd2QpID0+IHtcbiAgICBpZiAoc3lzUGF0aC5pc0Fic29sdXRlKHBhdGgpKSB7XG4gICAgICAgIHJldHVybiBwYXRoO1xuICAgIH1cbiAgICByZXR1cm4gc3lzUGF0aC5qb2luKGN3ZCwgcGF0aCk7XG59O1xuY29uc3QgRU1QVFlfU0VUID0gT2JqZWN0LmZyZWV6ZShuZXcgU2V0KCkpO1xuLyoqXG4gKiBEaXJlY3RvcnkgZW50cnkuXG4gKi9cbmNsYXNzIERpckVudHJ5IHtcbiAgICBjb25zdHJ1Y3RvcihkaXIsIHJlbW92ZVdhdGNoZXIpIHtcbiAgICAgICAgdGhpcy5wYXRoID0gZGlyO1xuICAgICAgICB0aGlzLl9yZW1vdmVXYXRjaGVyID0gcmVtb3ZlV2F0Y2hlcjtcbiAgICAgICAgdGhpcy5pdGVtcyA9IG5ldyBTZXQoKTtcbiAgICB9XG4gICAgYWRkKGl0ZW0pIHtcbiAgICAgICAgY29uc3QgeyBpdGVtcyB9ID0gdGhpcztcbiAgICAgICAgaWYgKCFpdGVtcylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKGl0ZW0gIT09IE9ORV9ET1QgJiYgaXRlbSAhPT0gVFdPX0RPVFMpXG4gICAgICAgICAgICBpdGVtcy5hZGQoaXRlbSk7XG4gICAgfVxuICAgIGFzeW5jIHJlbW92ZShpdGVtKSB7XG4gICAgICAgIGNvbnN0IHsgaXRlbXMgfSA9IHRoaXM7XG4gICAgICAgIGlmICghaXRlbXMpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGl0ZW1zLmRlbGV0ZShpdGVtKTtcbiAgICAgICAgaWYgKGl0ZW1zLnNpemUgPiAwKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCBkaXIgPSB0aGlzLnBhdGg7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCByZWFkZGlyKGRpcik7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgaWYgKHRoaXMuX3JlbW92ZVdhdGNoZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW1vdmVXYXRjaGVyKHN5c1BhdGguZGlybmFtZShkaXIpLCBzeXNQYXRoLmJhc2VuYW1lKGRpcikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGhhcyhpdGVtKSB7XG4gICAgICAgIGNvbnN0IHsgaXRlbXMgfSA9IHRoaXM7XG4gICAgICAgIGlmICghaXRlbXMpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHJldHVybiBpdGVtcy5oYXMoaXRlbSk7XG4gICAgfVxuICAgIGdldENoaWxkcmVuKCkge1xuICAgICAgICBjb25zdCB7IGl0ZW1zIH0gPSB0aGlzO1xuICAgICAgICBpZiAoIWl0ZW1zKVxuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICByZXR1cm4gWy4uLml0ZW1zLnZhbHVlcygpXTtcbiAgICB9XG4gICAgZGlzcG9zZSgpIHtcbiAgICAgICAgdGhpcy5pdGVtcy5jbGVhcigpO1xuICAgICAgICB0aGlzLnBhdGggPSAnJztcbiAgICAgICAgdGhpcy5fcmVtb3ZlV2F0Y2hlciA9IEVNUFRZX0ZOO1xuICAgICAgICB0aGlzLml0ZW1zID0gRU1QVFlfU0VUO1xuICAgICAgICBPYmplY3QuZnJlZXplKHRoaXMpO1xuICAgIH1cbn1cbmNvbnN0IFNUQVRfTUVUSE9EX0YgPSAnc3RhdCc7XG5jb25zdCBTVEFUX01FVEhPRF9MID0gJ2xzdGF0JztcbmV4cG9ydCBjbGFzcyBXYXRjaEhlbHBlciB7XG4gICAgY29uc3RydWN0b3IocGF0aCwgZm9sbG93LCBmc3cpIHtcbiAgICAgICAgdGhpcy5mc3cgPSBmc3c7XG4gICAgICAgIGNvbnN0IHdhdGNoUGF0aCA9IHBhdGg7XG4gICAgICAgIHRoaXMucGF0aCA9IHBhdGggPSBwYXRoLnJlcGxhY2UoUkVQTEFDRVJfUkUsICcnKTtcbiAgICAgICAgdGhpcy53YXRjaFBhdGggPSB3YXRjaFBhdGg7XG4gICAgICAgIHRoaXMuZnVsbFdhdGNoUGF0aCA9IHN5c1BhdGgucmVzb2x2ZSh3YXRjaFBhdGgpO1xuICAgICAgICB0aGlzLmRpclBhcnRzID0gW107XG4gICAgICAgIHRoaXMuZGlyUGFydHMuZm9yRWFjaCgocGFydHMpID0+IHtcbiAgICAgICAgICAgIGlmIChwYXJ0cy5sZW5ndGggPiAxKVxuICAgICAgICAgICAgICAgIHBhcnRzLnBvcCgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5mb2xsb3dTeW1saW5rcyA9IGZvbGxvdztcbiAgICAgICAgdGhpcy5zdGF0TWV0aG9kID0gZm9sbG93ID8gU1RBVF9NRVRIT0RfRiA6IFNUQVRfTUVUSE9EX0w7XG4gICAgfVxuICAgIGVudHJ5UGF0aChlbnRyeSkge1xuICAgICAgICByZXR1cm4gc3lzUGF0aC5qb2luKHRoaXMud2F0Y2hQYXRoLCBzeXNQYXRoLnJlbGF0aXZlKHRoaXMud2F0Y2hQYXRoLCBlbnRyeS5mdWxsUGF0aCkpO1xuICAgIH1cbiAgICBmaWx0ZXJQYXRoKGVudHJ5KSB7XG4gICAgICAgIGNvbnN0IHsgc3RhdHMgfSA9IGVudHJ5O1xuICAgICAgICBpZiAoc3RhdHMgJiYgc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSlcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZpbHRlckRpcihlbnRyeSk7XG4gICAgICAgIGNvbnN0IHJlc29sdmVkUGF0aCA9IHRoaXMuZW50cnlQYXRoKGVudHJ5KTtcbiAgICAgICAgLy8gVE9ETzogd2hhdCBpZiBzdGF0cyBpcyB1bmRlZmluZWQ/IHJlbW92ZSAhXG4gICAgICAgIHJldHVybiB0aGlzLmZzdy5faXNudElnbm9yZWQocmVzb2x2ZWRQYXRoLCBzdGF0cykgJiYgdGhpcy5mc3cuX2hhc1JlYWRQZXJtaXNzaW9ucyhzdGF0cyk7XG4gICAgfVxuICAgIGZpbHRlckRpcihlbnRyeSkge1xuICAgICAgICByZXR1cm4gdGhpcy5mc3cuX2lzbnRJZ25vcmVkKHRoaXMuZW50cnlQYXRoKGVudHJ5KSwgZW50cnkuc3RhdHMpO1xuICAgIH1cbn1cbi8qKlxuICogV2F0Y2hlcyBmaWxlcyAmIGRpcmVjdG9yaWVzIGZvciBjaGFuZ2VzLiBFbWl0dGVkIGV2ZW50czpcbiAqIGBhZGRgLCBgYWRkRGlyYCwgYGNoYW5nZWAsIGB1bmxpbmtgLCBgdW5saW5rRGlyYCwgYGFsbGAsIGBlcnJvcmBcbiAqXG4gKiAgICAgbmV3IEZTV2F0Y2hlcigpXG4gKiAgICAgICAuYWRkKGRpcmVjdG9yaWVzKVxuICogICAgICAgLm9uKCdhZGQnLCBwYXRoID0+IGxvZygnRmlsZScsIHBhdGgsICd3YXMgYWRkZWQnKSlcbiAqL1xuZXhwb3J0IGNsYXNzIEZTV2F0Y2hlciBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gICAgLy8gTm90IGluZGVudGluZyBtZXRob2RzIGZvciBoaXN0b3J5IHNha2U7IGZvciBub3cuXG4gICAgY29uc3RydWN0b3IoX29wdHMgPSB7fSkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLmNsb3NlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9jbG9zZXJzID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLl9pZ25vcmVkUGF0aHMgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuX3Rocm90dGxlZCA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5fc3RyZWFtcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5fc3ltbGlua1BhdGhzID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLl93YXRjaGVkID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLl9wZW5kaW5nV3JpdGVzID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLl9wZW5kaW5nVW5saW5rcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5fcmVhZHlDb3VudCA9IDA7XG4gICAgICAgIHRoaXMuX3JlYWR5RW1pdHRlZCA9IGZhbHNlO1xuICAgICAgICBjb25zdCBhd2YgPSBfb3B0cy5hd2FpdFdyaXRlRmluaXNoO1xuICAgICAgICBjb25zdCBERUZfQVdGID0geyBzdGFiaWxpdHlUaHJlc2hvbGQ6IDIwMDAsIHBvbGxJbnRlcnZhbDogMTAwIH07XG4gICAgICAgIGNvbnN0IG9wdHMgPSB7XG4gICAgICAgICAgICAvLyBEZWZhdWx0c1xuICAgICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcbiAgICAgICAgICAgIGlnbm9yZUluaXRpYWw6IGZhbHNlLFxuICAgICAgICAgICAgaWdub3JlUGVybWlzc2lvbkVycm9yczogZmFsc2UsXG4gICAgICAgICAgICBpbnRlcnZhbDogMTAwLFxuICAgICAgICAgICAgYmluYXJ5SW50ZXJ2YWw6IDMwMCxcbiAgICAgICAgICAgIGZvbGxvd1N5bWxpbmtzOiB0cnVlLFxuICAgICAgICAgICAgdXNlUG9sbGluZzogZmFsc2UsXG4gICAgICAgICAgICAvLyB1c2VBc3luYzogZmFsc2UsXG4gICAgICAgICAgICBhdG9taWM6IHRydWUsIC8vIE5PVEU6IG92ZXJ3cml0dGVuIGxhdGVyIChkZXBlbmRzIG9uIHVzZVBvbGxpbmcpXG4gICAgICAgICAgICAuLi5fb3B0cyxcbiAgICAgICAgICAgIC8vIENoYW5nZSBmb3JtYXRcbiAgICAgICAgICAgIGlnbm9yZWQ6IF9vcHRzLmlnbm9yZWQgPyBhcnJpZnkoX29wdHMuaWdub3JlZCkgOiBhcnJpZnkoW10pLFxuICAgICAgICAgICAgYXdhaXRXcml0ZUZpbmlzaDogYXdmID09PSB0cnVlID8gREVGX0FXRiA6IHR5cGVvZiBhd2YgPT09ICdvYmplY3QnID8geyAuLi5ERUZfQVdGLCAuLi5hd2YgfSA6IGZhbHNlLFxuICAgICAgICB9O1xuICAgICAgICAvLyBBbHdheXMgZGVmYXVsdCB0byBwb2xsaW5nIG9uIElCTSBpIGJlY2F1c2UgZnMud2F0Y2goKSBpcyBub3QgYXZhaWxhYmxlIG9uIElCTSBpLlxuICAgICAgICBpZiAoaXNJQk1pKVxuICAgICAgICAgICAgb3B0cy51c2VQb2xsaW5nID0gdHJ1ZTtcbiAgICAgICAgLy8gRWRpdG9yIGF0b21pYyB3cml0ZSBub3JtYWxpemF0aW9uIGVuYWJsZWQgYnkgZGVmYXVsdCB3aXRoIGZzLndhdGNoXG4gICAgICAgIGlmIChvcHRzLmF0b21pYyA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgb3B0cy5hdG9taWMgPSAhb3B0cy51c2VQb2xsaW5nO1xuICAgICAgICAvLyBvcHRzLmF0b21pYyA9IHR5cGVvZiBfb3B0cy5hdG9taWMgPT09ICdudW1iZXInID8gX29wdHMuYXRvbWljIDogMTAwO1xuICAgICAgICAvLyBHbG9iYWwgb3ZlcnJpZGUuIFVzZWZ1bCBmb3IgZGV2ZWxvcGVycywgd2hvIG5lZWQgdG8gZm9yY2UgcG9sbGluZyBmb3IgYWxsXG4gICAgICAgIC8vIGluc3RhbmNlcyBvZiBjaG9raWRhciwgcmVnYXJkbGVzcyBvZiB1c2FnZSAvIGRlcGVuZGVuY3kgZGVwdGhcbiAgICAgICAgY29uc3QgZW52UG9sbCA9IHByb2Nlc3MuZW52LkNIT0tJREFSX1VTRVBPTExJTkc7XG4gICAgICAgIGlmIChlbnZQb2xsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGVudkxvd2VyID0gZW52UG9sbC50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgaWYgKGVudkxvd2VyID09PSAnZmFsc2UnIHx8IGVudkxvd2VyID09PSAnMCcpXG4gICAgICAgICAgICAgICAgb3B0cy51c2VQb2xsaW5nID0gZmFsc2U7XG4gICAgICAgICAgICBlbHNlIGlmIChlbnZMb3dlciA9PT0gJ3RydWUnIHx8IGVudkxvd2VyID09PSAnMScpXG4gICAgICAgICAgICAgICAgb3B0cy51c2VQb2xsaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBvcHRzLnVzZVBvbGxpbmcgPSAhIWVudkxvd2VyO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVudkludGVydmFsID0gcHJvY2Vzcy5lbnYuQ0hPS0lEQVJfSU5URVJWQUw7XG4gICAgICAgIGlmIChlbnZJbnRlcnZhbClcbiAgICAgICAgICAgIG9wdHMuaW50ZXJ2YWwgPSBOdW1iZXIucGFyc2VJbnQoZW52SW50ZXJ2YWwsIDEwKTtcbiAgICAgICAgLy8gVGhpcyBpcyBkb25lIHRvIGVtaXQgcmVhZHkgb25seSBvbmNlLCBidXQgZWFjaCAnYWRkJyB3aWxsIGluY3JlYXNlIHRoYXQ/XG4gICAgICAgIGxldCByZWFkeUNhbGxzID0gMDtcbiAgICAgICAgdGhpcy5fZW1pdFJlYWR5ID0gKCkgPT4ge1xuICAgICAgICAgICAgcmVhZHlDYWxscysrO1xuICAgICAgICAgICAgaWYgKHJlYWR5Q2FsbHMgPj0gdGhpcy5fcmVhZHlDb3VudCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRSZWFkeSA9IEVNUFRZX0ZOO1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlYWR5RW1pdHRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgLy8gdXNlIHByb2Nlc3MubmV4dFRpY2sgdG8gYWxsb3cgdGltZSBmb3IgbGlzdGVuZXIgdG8gYmUgYm91bmRcbiAgICAgICAgICAgICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHRoaXMuZW1pdChFVi5SRUFEWSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB0aGlzLl9lbWl0UmF3ID0gKC4uLmFyZ3MpID0+IHRoaXMuZW1pdChFVi5SQVcsIC4uLmFyZ3MpO1xuICAgICAgICB0aGlzLl9ib3VuZFJlbW92ZSA9IHRoaXMuX3JlbW92ZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRzO1xuICAgICAgICB0aGlzLl9ub2RlRnNIYW5kbGVyID0gbmV3IE5vZGVGc0hhbmRsZXIodGhpcyk7XG4gICAgICAgIC8vIFlvdVx1MjAxOXJlIGZyb3plbiB3aGVuIHlvdXIgaGVhcnRcdTIwMTlzIG5vdCBvcGVuLlxuICAgICAgICBPYmplY3QuZnJlZXplKG9wdHMpO1xuICAgIH1cbiAgICBfYWRkSWdub3JlZFBhdGgobWF0Y2hlcikge1xuICAgICAgICBpZiAoaXNNYXRjaGVyT2JqZWN0KG1hdGNoZXIpKSB7XG4gICAgICAgICAgICAvLyByZXR1cm4gZWFybHkgaWYgd2UgYWxyZWFkeSBoYXZlIGEgZGVlcGx5IGVxdWFsIG1hdGNoZXIgb2JqZWN0XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGlnbm9yZWQgb2YgdGhpcy5faWdub3JlZFBhdGhzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTWF0Y2hlck9iamVjdChpZ25vcmVkKSAmJlxuICAgICAgICAgICAgICAgICAgICBpZ25vcmVkLnBhdGggPT09IG1hdGNoZXIucGF0aCAmJlxuICAgICAgICAgICAgICAgICAgICBpZ25vcmVkLnJlY3Vyc2l2ZSA9PT0gbWF0Y2hlci5yZWN1cnNpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9pZ25vcmVkUGF0aHMuYWRkKG1hdGNoZXIpO1xuICAgIH1cbiAgICBfcmVtb3ZlSWdub3JlZFBhdGgobWF0Y2hlcikge1xuICAgICAgICB0aGlzLl9pZ25vcmVkUGF0aHMuZGVsZXRlKG1hdGNoZXIpO1xuICAgICAgICAvLyBub3cgZmluZCBhbnkgbWF0Y2hlciBvYmplY3RzIHdpdGggdGhlIG1hdGNoZXIgYXMgcGF0aFxuICAgICAgICBpZiAodHlwZW9mIG1hdGNoZXIgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGlnbm9yZWQgb2YgdGhpcy5faWdub3JlZFBhdGhzKSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyAoNDMwODFqKTogbWFrZSB0aGlzIG1vcmUgZWZmaWNpZW50LlxuICAgICAgICAgICAgICAgIC8vIHByb2JhYmx5IGp1c3QgbWFrZSBhIGB0aGlzLl9pZ25vcmVkRGlyZWN0b3JpZXNgIG9yIHNvbWVcbiAgICAgICAgICAgICAgICAvLyBzdWNoIHRoaW5nLlxuICAgICAgICAgICAgICAgIGlmIChpc01hdGNoZXJPYmplY3QoaWdub3JlZCkgJiYgaWdub3JlZC5wYXRoID09PSBtYXRjaGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2lnbm9yZWRQYXRocy5kZWxldGUoaWdub3JlZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIFB1YmxpYyBtZXRob2RzXG4gICAgLyoqXG4gICAgICogQWRkcyBwYXRocyB0byBiZSB3YXRjaGVkIG9uIGFuIGV4aXN0aW5nIEZTV2F0Y2hlciBpbnN0YW5jZS5cbiAgICAgKiBAcGFyYW0gcGF0aHNfIGZpbGUgb3IgZmlsZSBsaXN0LiBPdGhlciBhcmd1bWVudHMgYXJlIHVudXNlZFxuICAgICAqL1xuICAgIGFkZChwYXRoc18sIF9vcmlnQWRkLCBfaW50ZXJuYWwpIHtcbiAgICAgICAgY29uc3QgeyBjd2QgfSA9IHRoaXMub3B0aW9ucztcbiAgICAgICAgdGhpcy5jbG9zZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fY2xvc2VQcm9taXNlID0gdW5kZWZpbmVkO1xuICAgICAgICBsZXQgcGF0aHMgPSB1bmlmeVBhdGhzKHBhdGhzXyk7XG4gICAgICAgIGlmIChjd2QpIHtcbiAgICAgICAgICAgIHBhdGhzID0gcGF0aHMubWFwKChwYXRoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgYWJzUGF0aCA9IGdldEFic29sdXRlUGF0aChwYXRoLCBjd2QpO1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGBwYXRoYCBpbnN0ZWFkIG9mIGBhYnNQYXRoYCBiZWNhdXNlIHRoZSBjd2QgcG9ydGlvbiBjYW4ndCBiZSBhIGdsb2JcbiAgICAgICAgICAgICAgICByZXR1cm4gYWJzUGF0aDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHBhdGhzLmZvckVhY2goKHBhdGgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3JlbW92ZUlnbm9yZWRQYXRoKHBhdGgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fdXNlcklnbm9yZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmICghdGhpcy5fcmVhZHlDb3VudClcbiAgICAgICAgICAgIHRoaXMuX3JlYWR5Q291bnQgPSAwO1xuICAgICAgICB0aGlzLl9yZWFkeUNvdW50ICs9IHBhdGhzLmxlbmd0aDtcbiAgICAgICAgUHJvbWlzZS5hbGwocGF0aHMubWFwKGFzeW5jIChwYXRoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByZXMgPSBhd2FpdCB0aGlzLl9ub2RlRnNIYW5kbGVyLl9hZGRUb05vZGVGcyhwYXRoLCAhX2ludGVybmFsLCB1bmRlZmluZWQsIDAsIF9vcmlnQWRkKTtcbiAgICAgICAgICAgIGlmIChyZXMpXG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdFJlYWR5KCk7XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9KSkudGhlbigocmVzdWx0cykgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuY2xvc2VkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIHJlc3VsdHMuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChpdGVtKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZChzeXNQYXRoLmRpcm5hbWUoaXRlbSksIHN5c1BhdGguYmFzZW5hbWUoX29yaWdBZGQgfHwgaXRlbSkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xvc2Ugd2F0Y2hlcnMgb3Igc3RhcnQgaWdub3JpbmcgZXZlbnRzIGZyb20gc3BlY2lmaWVkIHBhdGhzLlxuICAgICAqL1xuICAgIHVud2F0Y2gocGF0aHNfKSB7XG4gICAgICAgIGlmICh0aGlzLmNsb3NlZClcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICBjb25zdCBwYXRocyA9IHVuaWZ5UGF0aHMocGF0aHNfKTtcbiAgICAgICAgY29uc3QgeyBjd2QgfSA9IHRoaXMub3B0aW9ucztcbiAgICAgICAgcGF0aHMuZm9yRWFjaCgocGF0aCkgPT4ge1xuICAgICAgICAgICAgLy8gY29udmVydCB0byBhYnNvbHV0ZSBwYXRoIHVubGVzcyByZWxhdGl2ZSBwYXRoIGFscmVhZHkgbWF0Y2hlc1xuICAgICAgICAgICAgaWYgKCFzeXNQYXRoLmlzQWJzb2x1dGUocGF0aCkgJiYgIXRoaXMuX2Nsb3NlcnMuaGFzKHBhdGgpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGN3ZClcbiAgICAgICAgICAgICAgICAgICAgcGF0aCA9IHN5c1BhdGguam9pbihjd2QsIHBhdGgpO1xuICAgICAgICAgICAgICAgIHBhdGggPSBzeXNQYXRoLnJlc29sdmUocGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9jbG9zZVBhdGgocGF0aCk7XG4gICAgICAgICAgICB0aGlzLl9hZGRJZ25vcmVkUGF0aChwYXRoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLl93YXRjaGVkLmhhcyhwYXRoKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2FkZElnbm9yZWRQYXRoKHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgcmVjdXJzaXZlOiB0cnVlLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gcmVzZXQgdGhlIGNhY2hlZCB1c2VySWdub3JlZCBhbnltYXRjaCBmblxuICAgICAgICAgICAgLy8gdG8gbWFrZSBpZ25vcmVkUGF0aHMgY2hhbmdlcyBlZmZlY3RpdmVcbiAgICAgICAgICAgIHRoaXMuX3VzZXJJZ25vcmVkID0gdW5kZWZpbmVkO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsb3NlIHdhdGNoZXJzIGFuZCByZW1vdmUgYWxsIGxpc3RlbmVycyBmcm9tIHdhdGNoZWQgcGF0aHMuXG4gICAgICovXG4gICAgY2xvc2UoKSB7XG4gICAgICAgIGlmICh0aGlzLl9jbG9zZVByb21pc2UpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jbG9zZVByb21pc2U7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jbG9zZWQgPSB0cnVlO1xuICAgICAgICAvLyBNZW1vcnkgbWFuYWdlbWVudC5cbiAgICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcbiAgICAgICAgY29uc3QgY2xvc2VycyA9IFtdO1xuICAgICAgICB0aGlzLl9jbG9zZXJzLmZvckVhY2goKGNsb3Nlckxpc3QpID0+IGNsb3Nlckxpc3QuZm9yRWFjaCgoY2xvc2VyKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwcm9taXNlID0gY2xvc2VyKCk7XG4gICAgICAgICAgICBpZiAocHJvbWlzZSBpbnN0YW5jZW9mIFByb21pc2UpXG4gICAgICAgICAgICAgICAgY2xvc2Vycy5wdXNoKHByb21pc2UpO1xuICAgICAgICB9KSk7XG4gICAgICAgIHRoaXMuX3N0cmVhbXMuZm9yRWFjaCgoc3RyZWFtKSA9PiBzdHJlYW0uZGVzdHJveSgpKTtcbiAgICAgICAgdGhpcy5fdXNlcklnbm9yZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuX3JlYWR5Q291bnQgPSAwO1xuICAgICAgICB0aGlzLl9yZWFkeUVtaXR0ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fd2F0Y2hlZC5mb3JFYWNoKChkaXJlbnQpID0+IGRpcmVudC5kaXNwb3NlKCkpO1xuICAgICAgICB0aGlzLl9jbG9zZXJzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuX3dhdGNoZWQuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5fc3RyZWFtcy5jbGVhcigpO1xuICAgICAgICB0aGlzLl9zeW1saW5rUGF0aHMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5fdGhyb3R0bGVkLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuX2Nsb3NlUHJvbWlzZSA9IGNsb3NlcnMubGVuZ3RoXG4gICAgICAgICAgICA/IFByb21pc2UuYWxsKGNsb3NlcnMpLnRoZW4oKCkgPT4gdW5kZWZpbmVkKVxuICAgICAgICAgICAgOiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Nsb3NlUHJvbWlzZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRXhwb3NlIGxpc3Qgb2Ygd2F0Y2hlZCBwYXRoc1xuICAgICAqIEByZXR1cm5zIGZvciBjaGFpbmluZ1xuICAgICAqL1xuICAgIGdldFdhdGNoZWQoKSB7XG4gICAgICAgIGNvbnN0IHdhdGNoTGlzdCA9IHt9O1xuICAgICAgICB0aGlzLl93YXRjaGVkLmZvckVhY2goKGVudHJ5LCBkaXIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IHRoaXMub3B0aW9ucy5jd2QgPyBzeXNQYXRoLnJlbGF0aXZlKHRoaXMub3B0aW9ucy5jd2QsIGRpcikgOiBkaXI7XG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IGtleSB8fCBPTkVfRE9UO1xuICAgICAgICAgICAgd2F0Y2hMaXN0W2luZGV4XSA9IGVudHJ5LmdldENoaWxkcmVuKCkuc29ydCgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHdhdGNoTGlzdDtcbiAgICB9XG4gICAgZW1pdFdpdGhBbGwoZXZlbnQsIGFyZ3MpIHtcbiAgICAgICAgdGhpcy5lbWl0KGV2ZW50LCAuLi5hcmdzKTtcbiAgICAgICAgaWYgKGV2ZW50ICE9PSBFVi5FUlJPUilcbiAgICAgICAgICAgIHRoaXMuZW1pdChFVi5BTEwsIGV2ZW50LCAuLi5hcmdzKTtcbiAgICB9XG4gICAgLy8gQ29tbW9uIGhlbHBlcnNcbiAgICAvLyAtLS0tLS0tLS0tLS0tLVxuICAgIC8qKlxuICAgICAqIE5vcm1hbGl6ZSBhbmQgZW1pdCBldmVudHMuXG4gICAgICogQ2FsbGluZyBfZW1pdCBET0VTIE5PVCBNRUFOIGVtaXQoKSB3b3VsZCBiZSBjYWxsZWQhXG4gICAgICogQHBhcmFtIGV2ZW50IFR5cGUgb2YgZXZlbnRcbiAgICAgKiBAcGFyYW0gcGF0aCBGaWxlIG9yIGRpcmVjdG9yeSBwYXRoXG4gICAgICogQHBhcmFtIHN0YXRzIGFyZ3VtZW50cyB0byBiZSBwYXNzZWQgd2l0aCBldmVudFxuICAgICAqIEByZXR1cm5zIHRoZSBlcnJvciBpZiBkZWZpbmVkLCBvdGhlcndpc2UgdGhlIHZhbHVlIG9mIHRoZSBGU1dhdGNoZXIgaW5zdGFuY2UncyBgY2xvc2VkYCBmbGFnXG4gICAgICovXG4gICAgYXN5bmMgX2VtaXQoZXZlbnQsIHBhdGgsIHN0YXRzKSB7XG4gICAgICAgIGlmICh0aGlzLmNsb3NlZClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY29uc3Qgb3B0cyA9IHRoaXMub3B0aW9ucztcbiAgICAgICAgaWYgKGlzV2luZG93cylcbiAgICAgICAgICAgIHBhdGggPSBzeXNQYXRoLm5vcm1hbGl6ZShwYXRoKTtcbiAgICAgICAgaWYgKG9wdHMuY3dkKVxuICAgICAgICAgICAgcGF0aCA9IHN5c1BhdGgucmVsYXRpdmUob3B0cy5jd2QsIHBhdGgpO1xuICAgICAgICBjb25zdCBhcmdzID0gW3BhdGhdO1xuICAgICAgICBpZiAoc3RhdHMgIT0gbnVsbClcbiAgICAgICAgICAgIGFyZ3MucHVzaChzdGF0cyk7XG4gICAgICAgIGNvbnN0IGF3ZiA9IG9wdHMuYXdhaXRXcml0ZUZpbmlzaDtcbiAgICAgICAgbGV0IHB3O1xuICAgICAgICBpZiAoYXdmICYmIChwdyA9IHRoaXMuX3BlbmRpbmdXcml0ZXMuZ2V0KHBhdGgpKSkge1xuICAgICAgICAgICAgcHcubGFzdENoYW5nZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBpZiAob3B0cy5hdG9taWMpIHtcbiAgICAgICAgICAgIGlmIChldmVudCA9PT0gRVYuVU5MSU5LKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcGVuZGluZ1VubGlua3Muc2V0KHBhdGgsIFtldmVudCwgLi4uYXJnc10pO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9wZW5kaW5nVW5saW5rcy5mb3JFYWNoKChlbnRyeSwgcGF0aCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0KC4uLmVudHJ5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdChFVi5BTEwsIC4uLmVudHJ5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3BlbmRpbmdVbmxpbmtzLmRlbGV0ZShwYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSwgdHlwZW9mIG9wdHMuYXRvbWljID09PSAnbnVtYmVyJyA/IG9wdHMuYXRvbWljIDogMTAwKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChldmVudCA9PT0gRVYuQUREICYmIHRoaXMuX3BlbmRpbmdVbmxpbmtzLmhhcyhwYXRoKSkge1xuICAgICAgICAgICAgICAgIGV2ZW50ID0gRVYuQ0hBTkdFO1xuICAgICAgICAgICAgICAgIHRoaXMuX3BlbmRpbmdVbmxpbmtzLmRlbGV0ZShwYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoYXdmICYmIChldmVudCA9PT0gRVYuQUREIHx8IGV2ZW50ID09PSBFVi5DSEFOR0UpICYmIHRoaXMuX3JlYWR5RW1pdHRlZCkge1xuICAgICAgICAgICAgY29uc3QgYXdmRW1pdCA9IChlcnIsIHN0YXRzKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBldmVudCA9IEVWLkVSUk9SO1xuICAgICAgICAgICAgICAgICAgICBhcmdzWzBdID0gZXJyO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXRXaXRoQWxsKGV2ZW50LCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoc3RhdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgc3RhdHMgZG9lc24ndCBleGlzdCB0aGUgZmlsZSBtdXN0IGhhdmUgYmVlbiBkZWxldGVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3NbMV0gPSBzdGF0cztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MucHVzaChzdGF0cyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0V2l0aEFsbChldmVudCwgYXJncyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMuX2F3YWl0V3JpdGVGaW5pc2gocGF0aCwgYXdmLnN0YWJpbGl0eVRocmVzaG9sZCwgZXZlbnQsIGF3ZkVtaXQpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGV2ZW50ID09PSBFVi5DSEFOR0UpIHtcbiAgICAgICAgICAgIGNvbnN0IGlzVGhyb3R0bGVkID0gIXRoaXMuX3Rocm90dGxlKEVWLkNIQU5HRSwgcGF0aCwgNTApO1xuICAgICAgICAgICAgaWYgKGlzVGhyb3R0bGVkKVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChvcHRzLmFsd2F5c1N0YXQgJiZcbiAgICAgICAgICAgIHN0YXRzID09PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgIChldmVudCA9PT0gRVYuQUREIHx8IGV2ZW50ID09PSBFVi5BRERfRElSIHx8IGV2ZW50ID09PSBFVi5DSEFOR0UpKSB7XG4gICAgICAgICAgICBjb25zdCBmdWxsUGF0aCA9IG9wdHMuY3dkID8gc3lzUGF0aC5qb2luKG9wdHMuY3dkLCBwYXRoKSA6IHBhdGg7XG4gICAgICAgICAgICBsZXQgc3RhdHM7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHN0YXRzID0gYXdhaXQgc3RhdChmdWxsUGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgLy8gZG8gbm90aGluZ1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gU3VwcHJlc3MgZXZlbnQgd2hlbiBmc19zdGF0IGZhaWxzLCB0byBhdm9pZCBzZW5kaW5nIHVuZGVmaW5lZCAnc3RhdCdcbiAgICAgICAgICAgIGlmICghc3RhdHMgfHwgdGhpcy5jbG9zZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgYXJncy5wdXNoKHN0YXRzKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmVtaXRXaXRoQWxsKGV2ZW50LCBhcmdzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENvbW1vbiBoYW5kbGVyIGZvciBlcnJvcnNcbiAgICAgKiBAcmV0dXJucyBUaGUgZXJyb3IgaWYgZGVmaW5lZCwgb3RoZXJ3aXNlIHRoZSB2YWx1ZSBvZiB0aGUgRlNXYXRjaGVyIGluc3RhbmNlJ3MgYGNsb3NlZGAgZmxhZ1xuICAgICAqL1xuICAgIF9oYW5kbGVFcnJvcihlcnJvcikge1xuICAgICAgICBjb25zdCBjb2RlID0gZXJyb3IgJiYgZXJyb3IuY29kZTtcbiAgICAgICAgaWYgKGVycm9yICYmXG4gICAgICAgICAgICBjb2RlICE9PSAnRU5PRU5UJyAmJlxuICAgICAgICAgICAgY29kZSAhPT0gJ0VOT1RESVInICYmXG4gICAgICAgICAgICAoIXRoaXMub3B0aW9ucy5pZ25vcmVQZXJtaXNzaW9uRXJyb3JzIHx8IChjb2RlICE9PSAnRVBFUk0nICYmIGNvZGUgIT09ICdFQUNDRVMnKSkpIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdChFVi5FUlJPUiwgZXJyb3IpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlcnJvciB8fCB0aGlzLmNsb3NlZDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogSGVscGVyIHV0aWxpdHkgZm9yIHRocm90dGxpbmdcbiAgICAgKiBAcGFyYW0gYWN0aW9uVHlwZSB0eXBlIGJlaW5nIHRocm90dGxlZFxuICAgICAqIEBwYXJhbSBwYXRoIGJlaW5nIGFjdGVkIHVwb25cbiAgICAgKiBAcGFyYW0gdGltZW91dCBkdXJhdGlvbiBvZiB0aW1lIHRvIHN1cHByZXNzIGR1cGxpY2F0ZSBhY3Rpb25zXG4gICAgICogQHJldHVybnMgdHJhY2tpbmcgb2JqZWN0IG9yIGZhbHNlIGlmIGFjdGlvbiBzaG91bGQgYmUgc3VwcHJlc3NlZFxuICAgICAqL1xuICAgIF90aHJvdHRsZShhY3Rpb25UeXBlLCBwYXRoLCB0aW1lb3V0KSB7XG4gICAgICAgIGlmICghdGhpcy5fdGhyb3R0bGVkLmhhcyhhY3Rpb25UeXBlKSkge1xuICAgICAgICAgICAgdGhpcy5fdGhyb3R0bGVkLnNldChhY3Rpb25UeXBlLCBuZXcgTWFwKCkpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGFjdGlvbiA9IHRoaXMuX3Rocm90dGxlZC5nZXQoYWN0aW9uVHlwZSk7XG4gICAgICAgIGlmICghYWN0aW9uKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhbGlkIHRocm90dGxlJyk7XG4gICAgICAgIGNvbnN0IGFjdGlvblBhdGggPSBhY3Rpb24uZ2V0KHBhdGgpO1xuICAgICAgICBpZiAoYWN0aW9uUGF0aCkge1xuICAgICAgICAgICAgYWN0aW9uUGF0aC5jb3VudCsrO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBwcmVmZXItY29uc3RcbiAgICAgICAgbGV0IHRpbWVvdXRPYmplY3Q7XG4gICAgICAgIGNvbnN0IGNsZWFyID0gKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaXRlbSA9IGFjdGlvbi5nZXQocGF0aCk7XG4gICAgICAgICAgICBjb25zdCBjb3VudCA9IGl0ZW0gPyBpdGVtLmNvdW50IDogMDtcbiAgICAgICAgICAgIGFjdGlvbi5kZWxldGUocGF0aCk7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dE9iamVjdCk7XG4gICAgICAgICAgICBpZiAoaXRlbSlcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoaXRlbS50aW1lb3V0T2JqZWN0KTtcbiAgICAgICAgICAgIHJldHVybiBjb3VudDtcbiAgICAgICAgfTtcbiAgICAgICAgdGltZW91dE9iamVjdCA9IHNldFRpbWVvdXQoY2xlYXIsIHRpbWVvdXQpO1xuICAgICAgICBjb25zdCB0aHIgPSB7IHRpbWVvdXRPYmplY3QsIGNsZWFyLCBjb3VudDogMCB9O1xuICAgICAgICBhY3Rpb24uc2V0KHBhdGgsIHRocik7XG4gICAgICAgIHJldHVybiB0aHI7XG4gICAgfVxuICAgIF9pbmNyUmVhZHlDb3VudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JlYWR5Q291bnQrKztcbiAgICB9XG4gICAgLyoqXG4gICAgICogQXdhaXRzIHdyaXRlIG9wZXJhdGlvbiB0byBmaW5pc2guXG4gICAgICogUG9sbHMgYSBuZXdseSBjcmVhdGVkIGZpbGUgZm9yIHNpemUgdmFyaWF0aW9ucy4gV2hlbiBmaWxlcyBzaXplIGRvZXMgbm90IGNoYW5nZSBmb3IgJ3RocmVzaG9sZCcgbWlsbGlzZWNvbmRzIGNhbGxzIGNhbGxiYWNrLlxuICAgICAqIEBwYXJhbSBwYXRoIGJlaW5nIGFjdGVkIHVwb25cbiAgICAgKiBAcGFyYW0gdGhyZXNob2xkIFRpbWUgaW4gbWlsbGlzZWNvbmRzIGEgZmlsZSBzaXplIG11c3QgYmUgZml4ZWQgYmVmb3JlIGFja25vd2xlZGdpbmcgd3JpdGUgT1AgaXMgZmluaXNoZWRcbiAgICAgKiBAcGFyYW0gZXZlbnRcbiAgICAgKiBAcGFyYW0gYXdmRW1pdCBDYWxsYmFjayB0byBiZSBjYWxsZWQgd2hlbiByZWFkeSBmb3IgZXZlbnQgdG8gYmUgZW1pdHRlZC5cbiAgICAgKi9cbiAgICBfYXdhaXRXcml0ZUZpbmlzaChwYXRoLCB0aHJlc2hvbGQsIGV2ZW50LCBhd2ZFbWl0KSB7XG4gICAgICAgIGNvbnN0IGF3ZiA9IHRoaXMub3B0aW9ucy5hd2FpdFdyaXRlRmluaXNoO1xuICAgICAgICBpZiAodHlwZW9mIGF3ZiAhPT0gJ29iamVjdCcpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGNvbnN0IHBvbGxJbnRlcnZhbCA9IGF3Zi5wb2xsSW50ZXJ2YWw7XG4gICAgICAgIGxldCB0aW1lb3V0SGFuZGxlcjtcbiAgICAgICAgbGV0IGZ1bGxQYXRoID0gcGF0aDtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5jd2QgJiYgIXN5c1BhdGguaXNBYnNvbHV0ZShwYXRoKSkge1xuICAgICAgICAgICAgZnVsbFBhdGggPSBzeXNQYXRoLmpvaW4odGhpcy5vcHRpb25zLmN3ZCwgcGF0aCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgY29uc3Qgd3JpdGVzID0gdGhpcy5fcGVuZGluZ1dyaXRlcztcbiAgICAgICAgZnVuY3Rpb24gYXdhaXRXcml0ZUZpbmlzaEZuKHByZXZTdGF0KSB7XG4gICAgICAgICAgICBzdGF0Y2IoZnVsbFBhdGgsIChlcnIsIGN1clN0YXQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyIHx8ICF3cml0ZXMuaGFzKHBhdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIgJiYgZXJyLmNvZGUgIT09ICdFTk9FTlQnKVxuICAgICAgICAgICAgICAgICAgICAgICAgYXdmRW1pdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IG5vdyA9IE51bWJlcihuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgICAgICBpZiAocHJldlN0YXQgJiYgY3VyU3RhdC5zaXplICE9PSBwcmV2U3RhdC5zaXplKSB7XG4gICAgICAgICAgICAgICAgICAgIHdyaXRlcy5nZXQocGF0aCkubGFzdENoYW5nZSA9IG5vdztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgcHcgPSB3cml0ZXMuZ2V0KHBhdGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRmID0gbm93IC0gcHcubGFzdENoYW5nZTtcbiAgICAgICAgICAgICAgICBpZiAoZGYgPj0gdGhyZXNob2xkKSB7XG4gICAgICAgICAgICAgICAgICAgIHdyaXRlcy5kZWxldGUocGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIGF3ZkVtaXQodW5kZWZpbmVkLCBjdXJTdGF0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWVvdXRIYW5kbGVyID0gc2V0VGltZW91dChhd2FpdFdyaXRlRmluaXNoRm4sIHBvbGxJbnRlcnZhbCwgY3VyU3RhdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF3cml0ZXMuaGFzKHBhdGgpKSB7XG4gICAgICAgICAgICB3cml0ZXMuc2V0KHBhdGgsIHtcbiAgICAgICAgICAgICAgICBsYXN0Q2hhbmdlOiBub3csXG4gICAgICAgICAgICAgICAgY2FuY2VsV2FpdDogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB3cml0ZXMuZGVsZXRlKHBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dEhhbmRsZXIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnQ7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGltZW91dEhhbmRsZXIgPSBzZXRUaW1lb3V0KGF3YWl0V3JpdGVGaW5pc2hGbiwgcG9sbEludGVydmFsKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgdXNlciBoYXMgYXNrZWQgdG8gaWdub3JlIHRoaXMgcGF0aC5cbiAgICAgKi9cbiAgICBfaXNJZ25vcmVkKHBhdGgsIHN0YXRzKSB7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuYXRvbWljICYmIERPVF9SRS50ZXN0KHBhdGgpKVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIGlmICghdGhpcy5fdXNlcklnbm9yZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgY3dkIH0gPSB0aGlzLm9wdGlvbnM7XG4gICAgICAgICAgICBjb25zdCBpZ24gPSB0aGlzLm9wdGlvbnMuaWdub3JlZDtcbiAgICAgICAgICAgIGNvbnN0IGlnbm9yZWQgPSAoaWduIHx8IFtdKS5tYXAobm9ybWFsaXplSWdub3JlZChjd2QpKTtcbiAgICAgICAgICAgIGNvbnN0IGlnbm9yZWRQYXRocyA9IFsuLi50aGlzLl9pZ25vcmVkUGF0aHNdO1xuICAgICAgICAgICAgY29uc3QgbGlzdCA9IFsuLi5pZ25vcmVkUGF0aHMubWFwKG5vcm1hbGl6ZUlnbm9yZWQoY3dkKSksIC4uLmlnbm9yZWRdO1xuICAgICAgICAgICAgdGhpcy5fdXNlcklnbm9yZWQgPSBhbnltYXRjaChsaXN0LCB1bmRlZmluZWQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl91c2VySWdub3JlZChwYXRoLCBzdGF0cyk7XG4gICAgfVxuICAgIF9pc250SWdub3JlZChwYXRoLCBzdGF0KSB7XG4gICAgICAgIHJldHVybiAhdGhpcy5faXNJZ25vcmVkKHBhdGgsIHN0YXQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBQcm92aWRlcyBhIHNldCBvZiBjb21tb24gaGVscGVycyBhbmQgcHJvcGVydGllcyByZWxhdGluZyB0byBzeW1saW5rIGhhbmRsaW5nLlxuICAgICAqIEBwYXJhbSBwYXRoIGZpbGUgb3IgZGlyZWN0b3J5IHBhdHRlcm4gYmVpbmcgd2F0Y2hlZFxuICAgICAqL1xuICAgIF9nZXRXYXRjaEhlbHBlcnMocGF0aCkge1xuICAgICAgICByZXR1cm4gbmV3IFdhdGNoSGVscGVyKHBhdGgsIHRoaXMub3B0aW9ucy5mb2xsb3dTeW1saW5rcywgdGhpcyk7XG4gICAgfVxuICAgIC8vIERpcmVjdG9yeSBoZWxwZXJzXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvKipcbiAgICAgKiBQcm92aWRlcyBkaXJlY3RvcnkgdHJhY2tpbmcgb2JqZWN0c1xuICAgICAqIEBwYXJhbSBkaXJlY3RvcnkgcGF0aCBvZiB0aGUgZGlyZWN0b3J5XG4gICAgICovXG4gICAgX2dldFdhdGNoZWREaXIoZGlyZWN0b3J5KSB7XG4gICAgICAgIGNvbnN0IGRpciA9IHN5c1BhdGgucmVzb2x2ZShkaXJlY3RvcnkpO1xuICAgICAgICBpZiAoIXRoaXMuX3dhdGNoZWQuaGFzKGRpcikpXG4gICAgICAgICAgICB0aGlzLl93YXRjaGVkLnNldChkaXIsIG5ldyBEaXJFbnRyeShkaXIsIHRoaXMuX2JvdW5kUmVtb3ZlKSk7XG4gICAgICAgIHJldHVybiB0aGlzLl93YXRjaGVkLmdldChkaXIpO1xuICAgIH1cbiAgICAvLyBGaWxlIGhlbHBlcnNcbiAgICAvLyAtLS0tLS0tLS0tLS1cbiAgICAvKipcbiAgICAgKiBDaGVjayBmb3IgcmVhZCBwZXJtaXNzaW9uczogaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9hLzExNzgxNDA0LzEzNTg0MDVcbiAgICAgKi9cbiAgICBfaGFzUmVhZFBlcm1pc3Npb25zKHN0YXRzKSB7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuaWdub3JlUGVybWlzc2lvbkVycm9ycylcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICByZXR1cm4gQm9vbGVhbihOdW1iZXIoc3RhdHMubW9kZSkgJiAwbzQwMCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgZW1pdHRpbmcgdW5saW5rIGV2ZW50cyBmb3JcbiAgICAgKiBmaWxlcyBhbmQgZGlyZWN0b3JpZXMsIGFuZCB2aWEgcmVjdXJzaW9uLCBmb3JcbiAgICAgKiBmaWxlcyBhbmQgZGlyZWN0b3JpZXMgd2l0aGluIGRpcmVjdG9yaWVzIHRoYXQgYXJlIHVubGlua2VkXG4gICAgICogQHBhcmFtIGRpcmVjdG9yeSB3aXRoaW4gd2hpY2ggdGhlIGZvbGxvd2luZyBpdGVtIGlzIGxvY2F0ZWRcbiAgICAgKiBAcGFyYW0gaXRlbSAgICAgIGJhc2UgcGF0aCBvZiBpdGVtL2RpcmVjdG9yeVxuICAgICAqL1xuICAgIF9yZW1vdmUoZGlyZWN0b3J5LCBpdGVtLCBpc0RpcmVjdG9yeSkge1xuICAgICAgICAvLyBpZiB3aGF0IGlzIGJlaW5nIGRlbGV0ZWQgaXMgYSBkaXJlY3RvcnksIGdldCB0aGF0IGRpcmVjdG9yeSdzIHBhdGhzXG4gICAgICAgIC8vIGZvciByZWN1cnNpdmUgZGVsZXRpbmcgYW5kIGNsZWFuaW5nIG9mIHdhdGNoZWQgb2JqZWN0XG4gICAgICAgIC8vIGlmIGl0IGlzIG5vdCBhIGRpcmVjdG9yeSwgbmVzdGVkRGlyZWN0b3J5Q2hpbGRyZW4gd2lsbCBiZSBlbXB0eSBhcnJheVxuICAgICAgICBjb25zdCBwYXRoID0gc3lzUGF0aC5qb2luKGRpcmVjdG9yeSwgaXRlbSk7XG4gICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gc3lzUGF0aC5yZXNvbHZlKHBhdGgpO1xuICAgICAgICBpc0RpcmVjdG9yeSA9XG4gICAgICAgICAgICBpc0RpcmVjdG9yeSAhPSBudWxsID8gaXNEaXJlY3RvcnkgOiB0aGlzLl93YXRjaGVkLmhhcyhwYXRoKSB8fCB0aGlzLl93YXRjaGVkLmhhcyhmdWxsUGF0aCk7XG4gICAgICAgIC8vIHByZXZlbnQgZHVwbGljYXRlIGhhbmRsaW5nIGluIGNhc2Ugb2YgYXJyaXZpbmcgaGVyZSBuZWFybHkgc2ltdWx0YW5lb3VzbHlcbiAgICAgICAgLy8gdmlhIG11bHRpcGxlIHBhdGhzIChzdWNoIGFzIF9oYW5kbGVGaWxlIGFuZCBfaGFuZGxlRGlyKVxuICAgICAgICBpZiAoIXRoaXMuX3Rocm90dGxlKCdyZW1vdmUnLCBwYXRoLCAxMDApKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAvLyBpZiB0aGUgb25seSB3YXRjaGVkIGZpbGUgaXMgcmVtb3ZlZCwgd2F0Y2ggZm9yIGl0cyByZXR1cm5cbiAgICAgICAgaWYgKCFpc0RpcmVjdG9yeSAmJiB0aGlzLl93YXRjaGVkLnNpemUgPT09IDEpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkKGRpcmVjdG9yeSwgaXRlbSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGhpcyB3aWxsIGNyZWF0ZSBhIG5ldyBlbnRyeSBpbiB0aGUgd2F0Y2hlZCBvYmplY3QgaW4gZWl0aGVyIGNhc2VcbiAgICAgICAgLy8gc28gd2UgZ290IHRvIGRvIHRoZSBkaXJlY3RvcnkgY2hlY2sgYmVmb3JlaGFuZFxuICAgICAgICBjb25zdCB3cCA9IHRoaXMuX2dldFdhdGNoZWREaXIocGF0aCk7XG4gICAgICAgIGNvbnN0IG5lc3RlZERpcmVjdG9yeUNoaWxkcmVuID0gd3AuZ2V0Q2hpbGRyZW4oKTtcbiAgICAgICAgLy8gUmVjdXJzaXZlbHkgcmVtb3ZlIGNoaWxkcmVuIGRpcmVjdG9yaWVzIC8gZmlsZXMuXG4gICAgICAgIG5lc3RlZERpcmVjdG9yeUNoaWxkcmVuLmZvckVhY2goKG5lc3RlZCkgPT4gdGhpcy5fcmVtb3ZlKHBhdGgsIG5lc3RlZCkpO1xuICAgICAgICAvLyBDaGVjayBpZiBpdGVtIHdhcyBvbiB0aGUgd2F0Y2hlZCBsaXN0IGFuZCByZW1vdmUgaXRcbiAgICAgICAgY29uc3QgcGFyZW50ID0gdGhpcy5fZ2V0V2F0Y2hlZERpcihkaXJlY3RvcnkpO1xuICAgICAgICBjb25zdCB3YXNUcmFja2VkID0gcGFyZW50LmhhcyhpdGVtKTtcbiAgICAgICAgcGFyZW50LnJlbW92ZShpdGVtKTtcbiAgICAgICAgLy8gRml4ZXMgaXNzdWUgIzEwNDIgLT4gUmVsYXRpdmUgcGF0aHMgd2VyZSBkZXRlY3RlZCBhbmQgYWRkZWQgYXMgc3ltbGlua3NcbiAgICAgICAgLy8gKGh0dHBzOi8vZ2l0aHViLmNvbS9wYXVsbWlsbHIvY2hva2lkYXIvYmxvYi9lMTc1M2RkYmM5NTcxYmRjMzNiNGE0YWYxNzJkNTJjYjZlNjExYzEwL2xpYi9ub2RlZnMtaGFuZGxlci5qcyNMNjEyKSxcbiAgICAgICAgLy8gYnV0IG5ldmVyIHJlbW92ZWQgZnJvbSB0aGUgbWFwIGluIGNhc2UgdGhlIHBhdGggd2FzIGRlbGV0ZWQuXG4gICAgICAgIC8vIFRoaXMgbGVhZHMgdG8gYW4gaW5jb3JyZWN0IHN0YXRlIGlmIHRoZSBwYXRoIHdhcyByZWNyZWF0ZWQ6XG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9wYXVsbWlsbHIvY2hva2lkYXIvYmxvYi9lMTc1M2RkYmM5NTcxYmRjMzNiNGE0YWYxNzJkNTJjYjZlNjExYzEwL2xpYi9ub2RlZnMtaGFuZGxlci5qcyNMNTUzXG4gICAgICAgIGlmICh0aGlzLl9zeW1saW5rUGF0aHMuaGFzKGZ1bGxQYXRoKSkge1xuICAgICAgICAgICAgdGhpcy5fc3ltbGlua1BhdGhzLmRlbGV0ZShmdWxsUGF0aCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgd2Ugd2FpdCBmb3IgdGhpcyBmaWxlIHRvIGJlIGZ1bGx5IHdyaXR0ZW4sIGNhbmNlbCB0aGUgd2FpdC5cbiAgICAgICAgbGV0IHJlbFBhdGggPSBwYXRoO1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmN3ZClcbiAgICAgICAgICAgIHJlbFBhdGggPSBzeXNQYXRoLnJlbGF0aXZlKHRoaXMub3B0aW9ucy5jd2QsIHBhdGgpO1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmF3YWl0V3JpdGVGaW5pc2ggJiYgdGhpcy5fcGVuZGluZ1dyaXRlcy5oYXMocmVsUGF0aCkpIHtcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gdGhpcy5fcGVuZGluZ1dyaXRlcy5nZXQocmVsUGF0aCkuY2FuY2VsV2FpdCgpO1xuICAgICAgICAgICAgaWYgKGV2ZW50ID09PSBFVi5BREQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRoZSBFbnRyeSB3aWxsIGVpdGhlciBiZSBhIGRpcmVjdG9yeSB0aGF0IGp1c3QgZ290IHJlbW92ZWRcbiAgICAgICAgLy8gb3IgYSBib2d1cyBlbnRyeSB0byBhIGZpbGUsIGluIGVpdGhlciBjYXNlIHdlIGhhdmUgdG8gcmVtb3ZlIGl0XG4gICAgICAgIHRoaXMuX3dhdGNoZWQuZGVsZXRlKHBhdGgpO1xuICAgICAgICB0aGlzLl93YXRjaGVkLmRlbGV0ZShmdWxsUGF0aCk7XG4gICAgICAgIGNvbnN0IGV2ZW50TmFtZSA9IGlzRGlyZWN0b3J5ID8gRVYuVU5MSU5LX0RJUiA6IEVWLlVOTElOSztcbiAgICAgICAgaWYgKHdhc1RyYWNrZWQgJiYgIXRoaXMuX2lzSWdub3JlZChwYXRoKSlcbiAgICAgICAgICAgIHRoaXMuX2VtaXQoZXZlbnROYW1lLCBwYXRoKTtcbiAgICAgICAgLy8gQXZvaWQgY29uZmxpY3RzIGlmIHdlIGxhdGVyIGNyZWF0ZSBhbm90aGVyIGZpbGUgd2l0aCB0aGUgc2FtZSBuYW1lXG4gICAgICAgIHRoaXMuX2Nsb3NlUGF0aChwYXRoKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xvc2VzIGFsbCB3YXRjaGVycyBmb3IgYSBwYXRoXG4gICAgICovXG4gICAgX2Nsb3NlUGF0aChwYXRoKSB7XG4gICAgICAgIHRoaXMuX2Nsb3NlRmlsZShwYXRoKTtcbiAgICAgICAgY29uc3QgZGlyID0gc3lzUGF0aC5kaXJuYW1lKHBhdGgpO1xuICAgICAgICB0aGlzLl9nZXRXYXRjaGVkRGlyKGRpcikucmVtb3ZlKHN5c1BhdGguYmFzZW5hbWUocGF0aCkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDbG9zZXMgb25seSBmaWxlLXNwZWNpZmljIHdhdGNoZXJzXG4gICAgICovXG4gICAgX2Nsb3NlRmlsZShwYXRoKSB7XG4gICAgICAgIGNvbnN0IGNsb3NlcnMgPSB0aGlzLl9jbG9zZXJzLmdldChwYXRoKTtcbiAgICAgICAgaWYgKCFjbG9zZXJzKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjbG9zZXJzLmZvckVhY2goKGNsb3NlcikgPT4gY2xvc2VyKCkpO1xuICAgICAgICB0aGlzLl9jbG9zZXJzLmRlbGV0ZShwYXRoKTtcbiAgICB9XG4gICAgX2FkZFBhdGhDbG9zZXIocGF0aCwgY2xvc2VyKSB7XG4gICAgICAgIGlmICghY2xvc2VyKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBsZXQgbGlzdCA9IHRoaXMuX2Nsb3NlcnMuZ2V0KHBhdGgpO1xuICAgICAgICBpZiAoIWxpc3QpIHtcbiAgICAgICAgICAgIGxpc3QgPSBbXTtcbiAgICAgICAgICAgIHRoaXMuX2Nsb3NlcnMuc2V0KHBhdGgsIGxpc3QpO1xuICAgICAgICB9XG4gICAgICAgIGxpc3QucHVzaChjbG9zZXIpO1xuICAgIH1cbiAgICBfcmVhZGRpcnAocm9vdCwgb3B0cykge1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7IHR5cGU6IEVWLkFMTCwgYWx3YXlzU3RhdDogdHJ1ZSwgbHN0YXQ6IHRydWUsIC4uLm9wdHMsIGRlcHRoOiAwIH07XG4gICAgICAgIGxldCBzdHJlYW0gPSByZWFkZGlycChyb290LCBvcHRpb25zKTtcbiAgICAgICAgdGhpcy5fc3RyZWFtcy5hZGQoc3RyZWFtKTtcbiAgICAgICAgc3RyZWFtLm9uY2UoU1RSX0NMT1NFLCAoKSA9PiB7XG4gICAgICAgICAgICBzdHJlYW0gPSB1bmRlZmluZWQ7XG4gICAgICAgIH0pO1xuICAgICAgICBzdHJlYW0ub25jZShTVFJfRU5ELCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoc3RyZWFtKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RyZWFtcy5kZWxldGUoc3RyZWFtKTtcbiAgICAgICAgICAgICAgICBzdHJlYW0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3RyZWFtO1xuICAgIH1cbn1cbi8qKlxuICogSW5zdGFudGlhdGVzIHdhdGNoZXIgd2l0aCBwYXRocyB0byBiZSB0cmFja2VkLlxuICogQHBhcmFtIHBhdGhzIGZpbGUgLyBkaXJlY3RvcnkgcGF0aHNcbiAqIEBwYXJhbSBvcHRpb25zIG9wdHMsIHN1Y2ggYXMgYGF0b21pY2AsIGBhd2FpdFdyaXRlRmluaXNoYCwgYGlnbm9yZWRgLCBhbmQgb3RoZXJzXG4gKiBAcmV0dXJucyBhbiBpbnN0YW5jZSBvZiBGU1dhdGNoZXIgZm9yIGNoYWluaW5nLlxuICogQGV4YW1wbGVcbiAqIGNvbnN0IHdhdGNoZXIgPSB3YXRjaCgnLicpLm9uKCdhbGwnLCAoZXZlbnQsIHBhdGgpID0+IHsgY29uc29sZS5sb2coZXZlbnQsIHBhdGgpOyB9KTtcbiAqIHdhdGNoKCcuJywgeyBhdG9taWM6IHRydWUsIGF3YWl0V3JpdGVGaW5pc2g6IHRydWUsIGlnbm9yZWQ6IChmLCBzdGF0cykgPT4gc3RhdHM/LmlzRmlsZSgpICYmICFmLmVuZHNXaXRoKCcuanMnKSB9KVxuICovXG5leHBvcnQgZnVuY3Rpb24gd2F0Y2gocGF0aHMsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHdhdGNoZXIgPSBuZXcgRlNXYXRjaGVyKG9wdGlvbnMpO1xuICAgIHdhdGNoZXIuYWRkKHBhdGhzKTtcbiAgICByZXR1cm4gd2F0Y2hlcjtcbn1cbmV4cG9ydCBkZWZhdWx0IHsgd2F0Y2gsIEZTV2F0Y2hlciB9O1xuIiwgImltcG9ydCB7IHN0YXQsIGxzdGF0LCByZWFkZGlyLCByZWFscGF0aCB9IGZyb20gJ25vZGU6ZnMvcHJvbWlzZXMnO1xuaW1wb3J0IHsgUmVhZGFibGUgfSBmcm9tICdub2RlOnN0cmVhbSc7XG5pbXBvcnQgeyByZXNvbHZlIGFzIHByZXNvbHZlLCByZWxhdGl2ZSBhcyBwcmVsYXRpdmUsIGpvaW4gYXMgcGpvaW4sIHNlcCBhcyBwc2VwIH0gZnJvbSAnbm9kZTpwYXRoJztcbmV4cG9ydCBjb25zdCBFbnRyeVR5cGVzID0ge1xuICAgIEZJTEVfVFlQRTogJ2ZpbGVzJyxcbiAgICBESVJfVFlQRTogJ2RpcmVjdG9yaWVzJyxcbiAgICBGSUxFX0RJUl9UWVBFOiAnZmlsZXNfZGlyZWN0b3JpZXMnLFxuICAgIEVWRVJZVEhJTkdfVFlQRTogJ2FsbCcsXG59O1xuY29uc3QgZGVmYXVsdE9wdGlvbnMgPSB7XG4gICAgcm9vdDogJy4nLFxuICAgIGZpbGVGaWx0ZXI6IChfZW50cnlJbmZvKSA9PiB0cnVlLFxuICAgIGRpcmVjdG9yeUZpbHRlcjogKF9lbnRyeUluZm8pID0+IHRydWUsXG4gICAgdHlwZTogRW50cnlUeXBlcy5GSUxFX1RZUEUsXG4gICAgbHN0YXQ6IGZhbHNlLFxuICAgIGRlcHRoOiAyMTQ3NDgzNjQ4LFxuICAgIGFsd2F5c1N0YXQ6IGZhbHNlLFxuICAgIGhpZ2hXYXRlck1hcms6IDQwOTYsXG59O1xuT2JqZWN0LmZyZWV6ZShkZWZhdWx0T3B0aW9ucyk7XG5jb25zdCBSRUNVUlNJVkVfRVJST1JfQ09ERSA9ICdSRUFERElSUF9SRUNVUlNJVkVfRVJST1InO1xuY29uc3QgTk9STUFMX0ZMT1dfRVJST1JTID0gbmV3IFNldChbJ0VOT0VOVCcsICdFUEVSTScsICdFQUNDRVMnLCAnRUxPT1AnLCBSRUNVUlNJVkVfRVJST1JfQ09ERV0pO1xuY29uc3QgQUxMX1RZUEVTID0gW1xuICAgIEVudHJ5VHlwZXMuRElSX1RZUEUsXG4gICAgRW50cnlUeXBlcy5FVkVSWVRISU5HX1RZUEUsXG4gICAgRW50cnlUeXBlcy5GSUxFX0RJUl9UWVBFLFxuICAgIEVudHJ5VHlwZXMuRklMRV9UWVBFLFxuXTtcbmNvbnN0IERJUl9UWVBFUyA9IG5ldyBTZXQoW1xuICAgIEVudHJ5VHlwZXMuRElSX1RZUEUsXG4gICAgRW50cnlUeXBlcy5FVkVSWVRISU5HX1RZUEUsXG4gICAgRW50cnlUeXBlcy5GSUxFX0RJUl9UWVBFLFxuXSk7XG5jb25zdCBGSUxFX1RZUEVTID0gbmV3IFNldChbXG4gICAgRW50cnlUeXBlcy5FVkVSWVRISU5HX1RZUEUsXG4gICAgRW50cnlUeXBlcy5GSUxFX0RJUl9UWVBFLFxuICAgIEVudHJ5VHlwZXMuRklMRV9UWVBFLFxuXSk7XG5jb25zdCBpc05vcm1hbEZsb3dFcnJvciA9IChlcnJvcikgPT4gTk9STUFMX0ZMT1dfRVJST1JTLmhhcyhlcnJvci5jb2RlKTtcbmNvbnN0IHdhbnRCaWdpbnRGc1N0YXRzID0gcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJztcbmNvbnN0IGVtcHR5Rm4gPSAoX2VudHJ5SW5mbykgPT4gdHJ1ZTtcbmNvbnN0IG5vcm1hbGl6ZUZpbHRlciA9IChmaWx0ZXIpID0+IHtcbiAgICBpZiAoZmlsdGVyID09PSB1bmRlZmluZWQpXG4gICAgICAgIHJldHVybiBlbXB0eUZuO1xuICAgIGlmICh0eXBlb2YgZmlsdGVyID09PSAnZnVuY3Rpb24nKVxuICAgICAgICByZXR1cm4gZmlsdGVyO1xuICAgIGlmICh0eXBlb2YgZmlsdGVyID09PSAnc3RyaW5nJykge1xuICAgICAgICBjb25zdCBmbCA9IGZpbHRlci50cmltKCk7XG4gICAgICAgIHJldHVybiAoZW50cnkpID0+IGVudHJ5LmJhc2VuYW1lID09PSBmbDtcbiAgICB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZmlsdGVyKSkge1xuICAgICAgICBjb25zdCB0ckl0ZW1zID0gZmlsdGVyLm1hcCgoaXRlbSkgPT4gaXRlbS50cmltKCkpO1xuICAgICAgICByZXR1cm4gKGVudHJ5KSA9PiB0ckl0ZW1zLnNvbWUoKGYpID0+IGVudHJ5LmJhc2VuYW1lID09PSBmKTtcbiAgICB9XG4gICAgcmV0dXJuIGVtcHR5Rm47XG59O1xuLyoqIFJlYWRhYmxlIHJlYWRkaXIgc3RyZWFtLCBlbWl0dGluZyBuZXcgZmlsZXMgYXMgdGhleSdyZSBiZWluZyBsaXN0ZWQuICovXG5leHBvcnQgY2xhc3MgUmVhZGRpcnBTdHJlYW0gZXh0ZW5kcyBSZWFkYWJsZSB7XG4gICAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIHN1cGVyKHtcbiAgICAgICAgICAgIG9iamVjdE1vZGU6IHRydWUsXG4gICAgICAgICAgICBhdXRvRGVzdHJveTogdHJ1ZSxcbiAgICAgICAgICAgIGhpZ2hXYXRlck1hcms6IG9wdGlvbnMuaGlnaFdhdGVyTWFyayxcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IG9wdHMgPSB7IC4uLmRlZmF1bHRPcHRpb25zLCAuLi5vcHRpb25zIH07XG4gICAgICAgIGNvbnN0IHsgcm9vdCwgdHlwZSB9ID0gb3B0cztcbiAgICAgICAgdGhpcy5fZmlsZUZpbHRlciA9IG5vcm1hbGl6ZUZpbHRlcihvcHRzLmZpbGVGaWx0ZXIpO1xuICAgICAgICB0aGlzLl9kaXJlY3RvcnlGaWx0ZXIgPSBub3JtYWxpemVGaWx0ZXIob3B0cy5kaXJlY3RvcnlGaWx0ZXIpO1xuICAgICAgICBjb25zdCBzdGF0TWV0aG9kID0gb3B0cy5sc3RhdCA/IGxzdGF0IDogc3RhdDtcbiAgICAgICAgLy8gVXNlIGJpZ2ludCBzdGF0cyBpZiBpdCdzIHdpbmRvd3MgYW5kIHN0YXQoKSBzdXBwb3J0cyBvcHRpb25zIChub2RlIDEwKykuXG4gICAgICAgIGlmICh3YW50QmlnaW50RnNTdGF0cykge1xuICAgICAgICAgICAgdGhpcy5fc3RhdCA9IChwYXRoKSA9PiBzdGF0TWV0aG9kKHBhdGgsIHsgYmlnaW50OiB0cnVlIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc3RhdCA9IHN0YXRNZXRob2Q7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fbWF4RGVwdGggPSBvcHRzLmRlcHRoID8/IGRlZmF1bHRPcHRpb25zLmRlcHRoO1xuICAgICAgICB0aGlzLl93YW50c0RpciA9IHR5cGUgPyBESVJfVFlQRVMuaGFzKHR5cGUpIDogZmFsc2U7XG4gICAgICAgIHRoaXMuX3dhbnRzRmlsZSA9IHR5cGUgPyBGSUxFX1RZUEVTLmhhcyh0eXBlKSA6IGZhbHNlO1xuICAgICAgICB0aGlzLl93YW50c0V2ZXJ5dGhpbmcgPSB0eXBlID09PSBFbnRyeVR5cGVzLkVWRVJZVEhJTkdfVFlQRTtcbiAgICAgICAgdGhpcy5fcm9vdCA9IHByZXNvbHZlKHJvb3QpO1xuICAgICAgICB0aGlzLl9pc0RpcmVudCA9ICFvcHRzLmFsd2F5c1N0YXQ7XG4gICAgICAgIHRoaXMuX3N0YXRzUHJvcCA9IHRoaXMuX2lzRGlyZW50ID8gJ2RpcmVudCcgOiAnc3RhdHMnO1xuICAgICAgICB0aGlzLl9yZE9wdGlvbnMgPSB7IGVuY29kaW5nOiAndXRmOCcsIHdpdGhGaWxlVHlwZXM6IHRoaXMuX2lzRGlyZW50IH07XG4gICAgICAgIC8vIExhdW5jaCBzdHJlYW0gd2l0aCBvbmUgcGFyZW50LCB0aGUgcm9vdCBkaXIuXG4gICAgICAgIHRoaXMucGFyZW50cyA9IFt0aGlzLl9leHBsb3JlRGlyKHJvb3QsIDEpXTtcbiAgICAgICAgdGhpcy5yZWFkaW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMucGFyZW50ID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBhc3luYyBfcmVhZChiYXRjaCkge1xuICAgICAgICBpZiAodGhpcy5yZWFkaW5nKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB0aGlzLnJlYWRpbmcgPSB0cnVlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgd2hpbGUgKCF0aGlzLmRlc3Ryb3llZCAmJiBiYXRjaCA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXIgPSB0aGlzLnBhcmVudDtcbiAgICAgICAgICAgICAgICBjb25zdCBmaWwgPSBwYXIgJiYgcGFyLmZpbGVzO1xuICAgICAgICAgICAgICAgIGlmIChmaWwgJiYgZmlsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBwYXRoLCBkZXB0aCB9ID0gcGFyO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzbGljZSA9IGZpbC5zcGxpY2UoMCwgYmF0Y2gpLm1hcCgoZGlyZW50KSA9PiB0aGlzLl9mb3JtYXRFbnRyeShkaXJlbnQsIHBhdGgpKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXdhaXRlZCA9IGF3YWl0IFByb21pc2UuYWxsKHNsaWNlKTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBhd2FpdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWVudHJ5KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZGVzdHJveWVkKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVudHJ5VHlwZSA9IGF3YWl0IHRoaXMuX2dldEVudHJ5VHlwZShlbnRyeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW50cnlUeXBlID09PSAnZGlyZWN0b3J5JyAmJiB0aGlzLl9kaXJlY3RvcnlGaWx0ZXIoZW50cnkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRlcHRoIDw9IHRoaXMuX21heERlcHRoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFyZW50cy5wdXNoKHRoaXMuX2V4cGxvcmVEaXIoZW50cnkuZnVsbFBhdGgsIGRlcHRoICsgMSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5fd2FudHNEaXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoKGVudHJ5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmF0Y2gtLTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICgoZW50cnlUeXBlID09PSAnZmlsZScgfHwgdGhpcy5faW5jbHVkZUFzRmlsZShlbnRyeSkpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fZmlsZUZpbHRlcihlbnRyeSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5fd2FudHNGaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaChlbnRyeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJhdGNoLS07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnQgPSB0aGlzLnBhcmVudHMucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2gobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcmVudCA9IGF3YWl0IHBhcmVudDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZGVzdHJveWVkKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdHJveShlcnJvcik7XG4gICAgICAgIH1cbiAgICAgICAgZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLnJlYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBhc3luYyBfZXhwbG9yZURpcihwYXRoLCBkZXB0aCkge1xuICAgICAgICBsZXQgZmlsZXM7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBmaWxlcyA9IGF3YWl0IHJlYWRkaXIocGF0aCwgdGhpcy5fcmRPcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIHRoaXMuX29uRXJyb3IoZXJyb3IpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IGZpbGVzLCBkZXB0aCwgcGF0aCB9O1xuICAgIH1cbiAgICBhc3luYyBfZm9ybWF0RW50cnkoZGlyZW50LCBwYXRoKSB7XG4gICAgICAgIGxldCBlbnRyeTtcbiAgICAgICAgY29uc3QgYmFzZW5hbWUgPSB0aGlzLl9pc0RpcmVudCA/IGRpcmVudC5uYW1lIDogZGlyZW50O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwcmVzb2x2ZShwam9pbihwYXRoLCBiYXNlbmFtZSkpO1xuICAgICAgICAgICAgZW50cnkgPSB7IHBhdGg6IHByZWxhdGl2ZSh0aGlzLl9yb290LCBmdWxsUGF0aCksIGZ1bGxQYXRoLCBiYXNlbmFtZSB9O1xuICAgICAgICAgICAgZW50cnlbdGhpcy5fc3RhdHNQcm9wXSA9IHRoaXMuX2lzRGlyZW50ID8gZGlyZW50IDogYXdhaXQgdGhpcy5fc3RhdChmdWxsUGF0aCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgdGhpcy5fb25FcnJvcihlcnIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlbnRyeTtcbiAgICB9XG4gICAgX29uRXJyb3IoZXJyKSB7XG4gICAgICAgIGlmIChpc05vcm1hbEZsb3dFcnJvcihlcnIpICYmICF0aGlzLmRlc3Ryb3llZCkge1xuICAgICAgICAgICAgdGhpcy5lbWl0KCd3YXJuJywgZXJyKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdHJveShlcnIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGFzeW5jIF9nZXRFbnRyeVR5cGUoZW50cnkpIHtcbiAgICAgICAgLy8gZW50cnkgbWF5IGJlIHVuZGVmaW5lZCwgYmVjYXVzZSBhIHdhcm5pbmcgb3IgYW4gZXJyb3Igd2VyZSBlbWl0dGVkXG4gICAgICAgIC8vIGFuZCB0aGUgc3RhdHNQcm9wIGlzIHVuZGVmaW5lZFxuICAgICAgICBpZiAoIWVudHJ5ICYmIHRoaXMuX3N0YXRzUHJvcCBpbiBlbnRyeSkge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHN0YXRzID0gZW50cnlbdGhpcy5fc3RhdHNQcm9wXTtcbiAgICAgICAgaWYgKHN0YXRzLmlzRmlsZSgpKVxuICAgICAgICAgICAgcmV0dXJuICdmaWxlJztcbiAgICAgICAgaWYgKHN0YXRzLmlzRGlyZWN0b3J5KCkpXG4gICAgICAgICAgICByZXR1cm4gJ2RpcmVjdG9yeSc7XG4gICAgICAgIGlmIChzdGF0cyAmJiBzdGF0cy5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgICAgICBjb25zdCBmdWxsID0gZW50cnkuZnVsbFBhdGg7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVudHJ5UmVhbFBhdGggPSBhd2FpdCByZWFscGF0aChmdWxsKTtcbiAgICAgICAgICAgICAgICBjb25zdCBlbnRyeVJlYWxQYXRoU3RhdHMgPSBhd2FpdCBsc3RhdChlbnRyeVJlYWxQYXRoKTtcbiAgICAgICAgICAgICAgICBpZiAoZW50cnlSZWFsUGF0aFN0YXRzLmlzRmlsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnZmlsZSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChlbnRyeVJlYWxQYXRoU3RhdHMuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsZW4gPSBlbnRyeVJlYWxQYXRoLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZ1bGwuc3RhcnRzV2l0aChlbnRyeVJlYWxQYXRoKSAmJiBmdWxsLnN1YnN0cihsZW4sIDEpID09PSBwc2VwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZWN1cnNpdmVFcnJvciA9IG5ldyBFcnJvcihgQ2lyY3VsYXIgc3ltbGluayBkZXRlY3RlZDogXCIke2Z1bGx9XCIgcG9pbnRzIHRvIFwiJHtlbnRyeVJlYWxQYXRofVwiYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgICAgICAgICAgICAgICByZWN1cnNpdmVFcnJvci5jb2RlID0gUkVDVVJTSVZFX0VSUk9SX0NPREU7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fb25FcnJvcihyZWN1cnNpdmVFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdkaXJlY3RvcnknO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIHRoaXMuX29uRXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBfaW5jbHVkZUFzRmlsZShlbnRyeSkge1xuICAgICAgICBjb25zdCBzdGF0cyA9IGVudHJ5ICYmIGVudHJ5W3RoaXMuX3N0YXRzUHJvcF07XG4gICAgICAgIHJldHVybiBzdGF0cyAmJiB0aGlzLl93YW50c0V2ZXJ5dGhpbmcgJiYgIXN0YXRzLmlzRGlyZWN0b3J5KCk7XG4gICAgfVxufVxuLyoqXG4gKiBTdHJlYW1pbmcgdmVyc2lvbjogUmVhZHMgYWxsIGZpbGVzIGFuZCBkaXJlY3RvcmllcyBpbiBnaXZlbiByb290IHJlY3Vyc2l2ZWx5LlxuICogQ29uc3VtZXMgfmNvbnN0YW50IHNtYWxsIGFtb3VudCBvZiBSQU0uXG4gKiBAcGFyYW0gcm9vdCBSb290IGRpcmVjdG9yeVxuICogQHBhcmFtIG9wdGlvbnMgT3B0aW9ucyB0byBzcGVjaWZ5IHJvb3QgKHN0YXJ0IGRpcmVjdG9yeSksIGZpbHRlcnMgYW5kIHJlY3Vyc2lvbiBkZXB0aFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZGRpcnAocm9vdCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIGxldCB0eXBlID0gb3B0aW9ucy5lbnRyeVR5cGUgfHwgb3B0aW9ucy50eXBlO1xuICAgIGlmICh0eXBlID09PSAnYm90aCcpXG4gICAgICAgIHR5cGUgPSBFbnRyeVR5cGVzLkZJTEVfRElSX1RZUEU7IC8vIGJhY2t3YXJkcy1jb21wYXRpYmlsaXR5XG4gICAgaWYgKHR5cGUpXG4gICAgICAgIG9wdGlvbnMudHlwZSA9IHR5cGU7XG4gICAgaWYgKCFyb290KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigncmVhZGRpcnA6IHJvb3QgYXJndW1lbnQgaXMgcmVxdWlyZWQuIFVzYWdlOiByZWFkZGlycChyb290LCBvcHRpb25zKScpO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2Ygcm9vdCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigncmVhZGRpcnA6IHJvb3QgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZy4gVXNhZ2U6IHJlYWRkaXJwKHJvb3QsIG9wdGlvbnMpJyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGUgJiYgIUFMTF9UWVBFUy5pbmNsdWRlcyh0eXBlKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHJlYWRkaXJwOiBJbnZhbGlkIHR5cGUgcGFzc2VkLiBVc2Ugb25lIG9mICR7QUxMX1RZUEVTLmpvaW4oJywgJyl9YCk7XG4gICAgfVxuICAgIG9wdGlvbnMucm9vdCA9IHJvb3Q7XG4gICAgcmV0dXJuIG5ldyBSZWFkZGlycFN0cmVhbShvcHRpb25zKTtcbn1cbi8qKlxuICogUHJvbWlzZSB2ZXJzaW9uOiBSZWFkcyBhbGwgZmlsZXMgYW5kIGRpcmVjdG9yaWVzIGluIGdpdmVuIHJvb3QgcmVjdXJzaXZlbHkuXG4gKiBDb21wYXJlZCB0byBzdHJlYW1pbmcgdmVyc2lvbiwgd2lsbCBjb25zdW1lIGEgbG90IG9mIFJBTSBlLmcuIHdoZW4gMSBtaWxsaW9uIGZpbGVzIGFyZSBsaXN0ZWQuXG4gKiBAcmV0dXJucyBhcnJheSBvZiBwYXRocyBhbmQgdGhlaXIgZW50cnkgaW5mb3NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRkaXJwUHJvbWlzZShyb290LCBvcHRpb25zID0ge30pIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCBmaWxlcyA9IFtdO1xuICAgICAgICByZWFkZGlycChyb290LCBvcHRpb25zKVxuICAgICAgICAgICAgLm9uKCdkYXRhJywgKGVudHJ5KSA9PiBmaWxlcy5wdXNoKGVudHJ5KSlcbiAgICAgICAgICAgIC5vbignZW5kJywgKCkgPT4gcmVzb2x2ZShmaWxlcykpXG4gICAgICAgICAgICAub24oJ2Vycm9yJywgKGVycm9yKSA9PiByZWplY3QoZXJyb3IpKTtcbiAgICB9KTtcbn1cbmV4cG9ydCBkZWZhdWx0IHJlYWRkaXJwO1xuIiwgImltcG9ydCB7IHdhdGNoRmlsZSwgdW53YXRjaEZpbGUsIHdhdGNoIGFzIGZzX3dhdGNoIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgb3Blbiwgc3RhdCwgbHN0YXQsIHJlYWxwYXRoIGFzIGZzcmVhbHBhdGggfSBmcm9tICdmcy9wcm9taXNlcyc7XG5pbXBvcnQgKiBhcyBzeXNQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgdHlwZSBhcyBvc1R5cGUgfSBmcm9tICdvcyc7XG5leHBvcnQgY29uc3QgU1RSX0RBVEEgPSAnZGF0YSc7XG5leHBvcnQgY29uc3QgU1RSX0VORCA9ICdlbmQnO1xuZXhwb3J0IGNvbnN0IFNUUl9DTE9TRSA9ICdjbG9zZSc7XG5leHBvcnQgY29uc3QgRU1QVFlfRk4gPSAoKSA9PiB7IH07XG5leHBvcnQgY29uc3QgSURFTlRJVFlfRk4gPSAodmFsKSA9PiB2YWw7XG5jb25zdCBwbCA9IHByb2Nlc3MucGxhdGZvcm07XG5leHBvcnQgY29uc3QgaXNXaW5kb3dzID0gcGwgPT09ICd3aW4zMic7XG5leHBvcnQgY29uc3QgaXNNYWNvcyA9IHBsID09PSAnZGFyd2luJztcbmV4cG9ydCBjb25zdCBpc0xpbnV4ID0gcGwgPT09ICdsaW51eCc7XG5leHBvcnQgY29uc3QgaXNGcmVlQlNEID0gcGwgPT09ICdmcmVlYnNkJztcbmV4cG9ydCBjb25zdCBpc0lCTWkgPSBvc1R5cGUoKSA9PT0gJ09TNDAwJztcbmV4cG9ydCBjb25zdCBFVkVOVFMgPSB7XG4gICAgQUxMOiAnYWxsJyxcbiAgICBSRUFEWTogJ3JlYWR5JyxcbiAgICBBREQ6ICdhZGQnLFxuICAgIENIQU5HRTogJ2NoYW5nZScsXG4gICAgQUREX0RJUjogJ2FkZERpcicsXG4gICAgVU5MSU5LOiAndW5saW5rJyxcbiAgICBVTkxJTktfRElSOiAndW5saW5rRGlyJyxcbiAgICBSQVc6ICdyYXcnLFxuICAgIEVSUk9SOiAnZXJyb3InLFxufTtcbmNvbnN0IEVWID0gRVZFTlRTO1xuY29uc3QgVEhST1RUTEVfTU9ERV9XQVRDSCA9ICd3YXRjaCc7XG5jb25zdCBzdGF0TWV0aG9kcyA9IHsgbHN0YXQsIHN0YXQgfTtcbmNvbnN0IEtFWV9MSVNURU5FUlMgPSAnbGlzdGVuZXJzJztcbmNvbnN0IEtFWV9FUlIgPSAnZXJySGFuZGxlcnMnO1xuY29uc3QgS0VZX1JBVyA9ICdyYXdFbWl0dGVycyc7XG5jb25zdCBIQU5ETEVSX0tFWVMgPSBbS0VZX0xJU1RFTkVSUywgS0VZX0VSUiwgS0VZX1JBV107XG4vLyBwcmV0dGllci1pZ25vcmVcbmNvbnN0IGJpbmFyeUV4dGVuc2lvbnMgPSBuZXcgU2V0KFtcbiAgICAnM2RtJywgJzNkcycsICczZzInLCAnM2dwJywgJzd6JywgJ2EnLCAnYWFjJywgJ2FkcCcsICdhZmRlc2lnbicsICdhZnBob3RvJywgJ2FmcHViJywgJ2FpJyxcbiAgICAnYWlmJywgJ2FpZmYnLCAnYWx6JywgJ2FwZScsICdhcGsnLCAnYXBwaW1hZ2UnLCAnYXInLCAnYXJqJywgJ2FzZicsICdhdScsICdhdmknLFxuICAgICdiYWsnLCAnYmFtbCcsICdiaCcsICdiaW4nLCAnYmsnLCAnYm1wJywgJ2J0aWYnLCAnYnoyJywgJ2J6aXAyJyxcbiAgICAnY2FiJywgJ2NhZicsICdjZ20nLCAnY2xhc3MnLCAnY214JywgJ2NwaW8nLCAnY3IyJywgJ2N1cicsICdkYXQnLCAnZGNtJywgJ2RlYicsICdkZXgnLCAnZGp2dScsXG4gICAgJ2RsbCcsICdkbWcnLCAnZG5nJywgJ2RvYycsICdkb2NtJywgJ2RvY3gnLCAnZG90JywgJ2RvdG0nLCAnZHJhJywgJ0RTX1N0b3JlJywgJ2RzaycsICdkdHMnLFxuICAgICdkdHNoZCcsICdkdmInLCAnZHdnJywgJ2R4ZicsXG4gICAgJ2VjZWxwNDgwMCcsICdlY2VscDc0NzAnLCAnZWNlbHA5NjAwJywgJ2VnZycsICdlb2wnLCAnZW90JywgJ2VwdWInLCAnZXhlJyxcbiAgICAnZjR2JywgJ2ZicycsICdmaCcsICdmbGEnLCAnZmxhYycsICdmbGF0cGFrJywgJ2ZsaScsICdmbHYnLCAnZnB4JywgJ2ZzdCcsICdmdnQnLFxuICAgICdnMycsICdnaCcsICdnaWYnLCAnZ3JhZmZsZScsICdneicsICdnemlwJyxcbiAgICAnaDI2MScsICdoMjYzJywgJ2gyNjQnLCAnaWNucycsICdpY28nLCAnaWVmJywgJ2ltZycsICdpcGEnLCAnaXNvJyxcbiAgICAnamFyJywgJ2pwZWcnLCAnanBnJywgJ2pwZ3YnLCAnanBtJywgJ2p4cicsICdrZXknLCAna3R4JyxcbiAgICAnbGhhJywgJ2xpYicsICdsdnAnLCAnbHonLCAnbHpoJywgJ2x6bWEnLCAnbHpvJyxcbiAgICAnbTN1JywgJ200YScsICdtNHYnLCAnbWFyJywgJ21kaScsICdtaHQnLCAnbWlkJywgJ21pZGknLCAnbWoyJywgJ21rYScsICdta3YnLCAnbW1yJywgJ21uZycsXG4gICAgJ21vYmknLCAnbW92JywgJ21vdmllJywgJ21wMycsXG4gICAgJ21wNCcsICdtcDRhJywgJ21wZWcnLCAnbXBnJywgJ21wZ2EnLCAnbXh1JyxcbiAgICAnbmVmJywgJ25weCcsICdudW1iZXJzJywgJ251cGtnJyxcbiAgICAnbycsICdvZHAnLCAnb2RzJywgJ29kdCcsICdvZ2EnLCAnb2dnJywgJ29ndicsICdvdGYnLCAnb3R0JyxcbiAgICAncGFnZXMnLCAncGJtJywgJ3BjeCcsICdwZGInLCAncGRmJywgJ3BlYScsICdwZ20nLCAncGljJywgJ3BuZycsICdwbm0nLCAncG90JywgJ3BvdG0nLFxuICAgICdwb3R4JywgJ3BwYScsICdwcGFtJyxcbiAgICAncHBtJywgJ3BwcycsICdwcHNtJywgJ3Bwc3gnLCAncHB0JywgJ3BwdG0nLCAncHB0eCcsICdwc2QnLCAncHlhJywgJ3B5YycsICdweW8nLCAncHl2JyxcbiAgICAncXQnLFxuICAgICdyYXInLCAncmFzJywgJ3JhdycsICdyZXNvdXJjZXMnLCAncmdiJywgJ3JpcCcsICdybGMnLCAncm1mJywgJ3JtdmInLCAncnBtJywgJ3J0ZicsICdyeicsXG4gICAgJ3MzbScsICdzN3onLCAnc2NwdCcsICdzZ2knLCAnc2hhcicsICdzbmFwJywgJ3NpbCcsICdza2V0Y2gnLCAnc2xrJywgJ3NtdicsICdzbmsnLCAnc28nLFxuICAgICdzdGwnLCAnc3VvJywgJ3N1YicsICdzd2YnLFxuICAgICd0YXInLCAndGJ6JywgJ3RiejInLCAndGdhJywgJ3RneicsICd0aG14JywgJ3RpZicsICd0aWZmJywgJ3RseicsICd0dGMnLCAndHRmJywgJ3R4eicsXG4gICAgJ3VkZicsICd1dmgnLCAndXZpJywgJ3V2bScsICd1dnAnLCAndXZzJywgJ3V2dScsXG4gICAgJ3ZpdicsICd2b2InLFxuICAgICd3YXInLCAnd2F2JywgJ3dheCcsICd3Ym1wJywgJ3dkcCcsICd3ZWJhJywgJ3dlYm0nLCAnd2VicCcsICd3aGwnLCAnd2ltJywgJ3dtJywgJ3dtYScsXG4gICAgJ3dtdicsICd3bXgnLCAnd29mZicsICd3b2ZmMicsICd3cm0nLCAnd3Z4JyxcbiAgICAneGJtJywgJ3hpZicsICd4bGEnLCAneGxhbScsICd4bHMnLCAneGxzYicsICd4bHNtJywgJ3hsc3gnLCAneGx0JywgJ3hsdG0nLCAneGx0eCcsICd4bScsXG4gICAgJ3htaW5kJywgJ3hwaScsICd4cG0nLCAneHdkJywgJ3h6JyxcbiAgICAneicsICd6aXAnLCAnemlweCcsXG5dKTtcbmNvbnN0IGlzQmluYXJ5UGF0aCA9IChmaWxlUGF0aCkgPT4gYmluYXJ5RXh0ZW5zaW9ucy5oYXMoc3lzUGF0aC5leHRuYW1lKGZpbGVQYXRoKS5zbGljZSgxKS50b0xvd2VyQ2FzZSgpKTtcbi8vIFRPRE86IGVtaXQgZXJyb3JzIHByb3Blcmx5LiBFeGFtcGxlOiBFTUZJTEUgb24gTWFjb3MuXG5jb25zdCBmb3JlYWNoID0gKHZhbCwgZm4pID0+IHtcbiAgICBpZiAodmFsIGluc3RhbmNlb2YgU2V0KSB7XG4gICAgICAgIHZhbC5mb3JFYWNoKGZuKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGZuKHZhbCk7XG4gICAgfVxufTtcbmNvbnN0IGFkZEFuZENvbnZlcnQgPSAobWFpbiwgcHJvcCwgaXRlbSkgPT4ge1xuICAgIGxldCBjb250YWluZXIgPSBtYWluW3Byb3BdO1xuICAgIGlmICghKGNvbnRhaW5lciBpbnN0YW5jZW9mIFNldCkpIHtcbiAgICAgICAgbWFpbltwcm9wXSA9IGNvbnRhaW5lciA9IG5ldyBTZXQoW2NvbnRhaW5lcl0pO1xuICAgIH1cbiAgICBjb250YWluZXIuYWRkKGl0ZW0pO1xufTtcbmNvbnN0IGNsZWFySXRlbSA9IChjb250KSA9PiAoa2V5KSA9PiB7XG4gICAgY29uc3Qgc2V0ID0gY29udFtrZXldO1xuICAgIGlmIChzZXQgaW5zdGFuY2VvZiBTZXQpIHtcbiAgICAgICAgc2V0LmNsZWFyKCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBkZWxldGUgY29udFtrZXldO1xuICAgIH1cbn07XG5jb25zdCBkZWxGcm9tU2V0ID0gKG1haW4sIHByb3AsIGl0ZW0pID0+IHtcbiAgICBjb25zdCBjb250YWluZXIgPSBtYWluW3Byb3BdO1xuICAgIGlmIChjb250YWluZXIgaW5zdGFuY2VvZiBTZXQpIHtcbiAgICAgICAgY29udGFpbmVyLmRlbGV0ZShpdGVtKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoY29udGFpbmVyID09PSBpdGVtKSB7XG4gICAgICAgIGRlbGV0ZSBtYWluW3Byb3BdO1xuICAgIH1cbn07XG5jb25zdCBpc0VtcHR5U2V0ID0gKHZhbCkgPT4gKHZhbCBpbnN0YW5jZW9mIFNldCA/IHZhbC5zaXplID09PSAwIDogIXZhbCk7XG5jb25zdCBGc1dhdGNoSW5zdGFuY2VzID0gbmV3IE1hcCgpO1xuLyoqXG4gKiBJbnN0YW50aWF0ZXMgdGhlIGZzX3dhdGNoIGludGVyZmFjZVxuICogQHBhcmFtIHBhdGggdG8gYmUgd2F0Y2hlZFxuICogQHBhcmFtIG9wdGlvbnMgdG8gYmUgcGFzc2VkIHRvIGZzX3dhdGNoXG4gKiBAcGFyYW0gbGlzdGVuZXIgbWFpbiBldmVudCBoYW5kbGVyXG4gKiBAcGFyYW0gZXJySGFuZGxlciBlbWl0cyBpbmZvIGFib3V0IGVycm9yc1xuICogQHBhcmFtIGVtaXRSYXcgZW1pdHMgcmF3IGV2ZW50IGRhdGFcbiAqIEByZXR1cm5zIHtOYXRpdmVGc1dhdGNoZXJ9XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUZzV2F0Y2hJbnN0YW5jZShwYXRoLCBvcHRpb25zLCBsaXN0ZW5lciwgZXJySGFuZGxlciwgZW1pdFJhdykge1xuICAgIGNvbnN0IGhhbmRsZUV2ZW50ID0gKHJhd0V2ZW50LCBldlBhdGgpID0+IHtcbiAgICAgICAgbGlzdGVuZXIocGF0aCk7XG4gICAgICAgIGVtaXRSYXcocmF3RXZlbnQsIGV2UGF0aCwgeyB3YXRjaGVkUGF0aDogcGF0aCB9KTtcbiAgICAgICAgLy8gZW1pdCBiYXNlZCBvbiBldmVudHMgb2NjdXJyaW5nIGZvciBmaWxlcyBmcm9tIGEgZGlyZWN0b3J5J3Mgd2F0Y2hlciBpblxuICAgICAgICAvLyBjYXNlIHRoZSBmaWxlJ3Mgd2F0Y2hlciBtaXNzZXMgaXQgKGFuZCByZWx5IG9uIHRocm90dGxpbmcgdG8gZGUtZHVwZSlcbiAgICAgICAgaWYgKGV2UGF0aCAmJiBwYXRoICE9PSBldlBhdGgpIHtcbiAgICAgICAgICAgIGZzV2F0Y2hCcm9hZGNhc3Qoc3lzUGF0aC5yZXNvbHZlKHBhdGgsIGV2UGF0aCksIEtFWV9MSVNURU5FUlMsIHN5c1BhdGguam9pbihwYXRoLCBldlBhdGgpKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGZzX3dhdGNoKHBhdGgsIHtcbiAgICAgICAgICAgIHBlcnNpc3RlbnQ6IG9wdGlvbnMucGVyc2lzdGVudCxcbiAgICAgICAgfSwgaGFuZGxlRXZlbnQpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgZXJySGFuZGxlcihlcnJvcik7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxufVxuLyoqXG4gKiBIZWxwZXIgZm9yIHBhc3NpbmcgZnNfd2F0Y2ggZXZlbnQgZGF0YSB0byBhIGNvbGxlY3Rpb24gb2YgbGlzdGVuZXJzXG4gKiBAcGFyYW0gZnVsbFBhdGggYWJzb2x1dGUgcGF0aCBib3VuZCB0byBmc193YXRjaCBpbnN0YW5jZVxuICovXG5jb25zdCBmc1dhdGNoQnJvYWRjYXN0ID0gKGZ1bGxQYXRoLCBsaXN0ZW5lclR5cGUsIHZhbDEsIHZhbDIsIHZhbDMpID0+IHtcbiAgICBjb25zdCBjb250ID0gRnNXYXRjaEluc3RhbmNlcy5nZXQoZnVsbFBhdGgpO1xuICAgIGlmICghY29udClcbiAgICAgICAgcmV0dXJuO1xuICAgIGZvcmVhY2goY29udFtsaXN0ZW5lclR5cGVdLCAobGlzdGVuZXIpID0+IHtcbiAgICAgICAgbGlzdGVuZXIodmFsMSwgdmFsMiwgdmFsMyk7XG4gICAgfSk7XG59O1xuLyoqXG4gKiBJbnN0YW50aWF0ZXMgdGhlIGZzX3dhdGNoIGludGVyZmFjZSBvciBiaW5kcyBsaXN0ZW5lcnNcbiAqIHRvIGFuIGV4aXN0aW5nIG9uZSBjb3ZlcmluZyB0aGUgc2FtZSBmaWxlIHN5c3RlbSBlbnRyeVxuICogQHBhcmFtIHBhdGhcbiAqIEBwYXJhbSBmdWxsUGF0aCBhYnNvbHV0ZSBwYXRoXG4gKiBAcGFyYW0gb3B0aW9ucyB0byBiZSBwYXNzZWQgdG8gZnNfd2F0Y2hcbiAqIEBwYXJhbSBoYW5kbGVycyBjb250YWluZXIgZm9yIGV2ZW50IGxpc3RlbmVyIGZ1bmN0aW9uc1xuICovXG5jb25zdCBzZXRGc1dhdGNoTGlzdGVuZXIgPSAocGF0aCwgZnVsbFBhdGgsIG9wdGlvbnMsIGhhbmRsZXJzKSA9PiB7XG4gICAgY29uc3QgeyBsaXN0ZW5lciwgZXJySGFuZGxlciwgcmF3RW1pdHRlciB9ID0gaGFuZGxlcnM7XG4gICAgbGV0IGNvbnQgPSBGc1dhdGNoSW5zdGFuY2VzLmdldChmdWxsUGF0aCk7XG4gICAgbGV0IHdhdGNoZXI7XG4gICAgaWYgKCFvcHRpb25zLnBlcnNpc3RlbnQpIHtcbiAgICAgICAgd2F0Y2hlciA9IGNyZWF0ZUZzV2F0Y2hJbnN0YW5jZShwYXRoLCBvcHRpb25zLCBsaXN0ZW5lciwgZXJySGFuZGxlciwgcmF3RW1pdHRlcik7XG4gICAgICAgIGlmICghd2F0Y2hlcilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgcmV0dXJuIHdhdGNoZXIuY2xvc2UuYmluZCh3YXRjaGVyKTtcbiAgICB9XG4gICAgaWYgKGNvbnQpIHtcbiAgICAgICAgYWRkQW5kQ29udmVydChjb250LCBLRVlfTElTVEVORVJTLCBsaXN0ZW5lcik7XG4gICAgICAgIGFkZEFuZENvbnZlcnQoY29udCwgS0VZX0VSUiwgZXJySGFuZGxlcik7XG4gICAgICAgIGFkZEFuZENvbnZlcnQoY29udCwgS0VZX1JBVywgcmF3RW1pdHRlcik7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB3YXRjaGVyID0gY3JlYXRlRnNXYXRjaEluc3RhbmNlKHBhdGgsIG9wdGlvbnMsIGZzV2F0Y2hCcm9hZGNhc3QuYmluZChudWxsLCBmdWxsUGF0aCwgS0VZX0xJU1RFTkVSUyksIGVyckhhbmRsZXIsIC8vIG5vIG5lZWQgdG8gdXNlIGJyb2FkY2FzdCBoZXJlXG4gICAgICAgIGZzV2F0Y2hCcm9hZGNhc3QuYmluZChudWxsLCBmdWxsUGF0aCwgS0VZX1JBVykpO1xuICAgICAgICBpZiAoIXdhdGNoZXIpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHdhdGNoZXIub24oRVYuRVJST1IsIGFzeW5jIChlcnJvcikgPT4ge1xuICAgICAgICAgICAgY29uc3QgYnJvYWRjYXN0RXJyID0gZnNXYXRjaEJyb2FkY2FzdC5iaW5kKG51bGwsIGZ1bGxQYXRoLCBLRVlfRVJSKTtcbiAgICAgICAgICAgIGlmIChjb250KVxuICAgICAgICAgICAgICAgIGNvbnQud2F0Y2hlclVudXNhYmxlID0gdHJ1ZTsgLy8gZG9jdW1lbnRlZCBzaW5jZSBOb2RlIDEwLjQuMVxuICAgICAgICAgICAgLy8gV29ya2Fyb3VuZCBmb3IgaHR0cHM6Ly9naXRodWIuY29tL2pveWVudC9ub2RlL2lzc3Vlcy80MzM3XG4gICAgICAgICAgICBpZiAoaXNXaW5kb3dzICYmIGVycm9yLmNvZGUgPT09ICdFUEVSTScpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmZCA9IGF3YWl0IG9wZW4ocGF0aCwgJ3InKTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZmQuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJvYWRjYXN0RXJyKGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgICAgICAvLyBkbyBub3RoaW5nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYnJvYWRjYXN0RXJyKGVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnQgPSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnM6IGxpc3RlbmVyLFxuICAgICAgICAgICAgZXJySGFuZGxlcnM6IGVyckhhbmRsZXIsXG4gICAgICAgICAgICByYXdFbWl0dGVyczogcmF3RW1pdHRlcixcbiAgICAgICAgICAgIHdhdGNoZXIsXG4gICAgICAgIH07XG4gICAgICAgIEZzV2F0Y2hJbnN0YW5jZXMuc2V0KGZ1bGxQYXRoLCBjb250KTtcbiAgICB9XG4gICAgLy8gY29uc3QgaW5kZXggPSBjb250Lmxpc3RlbmVycy5pbmRleE9mKGxpc3RlbmVyKTtcbiAgICAvLyByZW1vdmVzIHRoaXMgaW5zdGFuY2UncyBsaXN0ZW5lcnMgYW5kIGNsb3NlcyB0aGUgdW5kZXJseWluZyBmc193YXRjaFxuICAgIC8vIGluc3RhbmNlIGlmIHRoZXJlIGFyZSBubyBtb3JlIGxpc3RlbmVycyBsZWZ0XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgZGVsRnJvbVNldChjb250LCBLRVlfTElTVEVORVJTLCBsaXN0ZW5lcik7XG4gICAgICAgIGRlbEZyb21TZXQoY29udCwgS0VZX0VSUiwgZXJySGFuZGxlcik7XG4gICAgICAgIGRlbEZyb21TZXQoY29udCwgS0VZX1JBVywgcmF3RW1pdHRlcik7XG4gICAgICAgIGlmIChpc0VtcHR5U2V0KGNvbnQubGlzdGVuZXJzKSkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgdG8gcHJvdGVjdCBhZ2FpbnN0IGlzc3VlIGdoLTczMC5cbiAgICAgICAgICAgIC8vIGlmIChjb250LndhdGNoZXJVbnVzYWJsZSkge1xuICAgICAgICAgICAgY29udC53YXRjaGVyLmNsb3NlKCk7XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICBGc1dhdGNoSW5zdGFuY2VzLmRlbGV0ZShmdWxsUGF0aCk7XG4gICAgICAgICAgICBIQU5ETEVSX0tFWVMuZm9yRWFjaChjbGVhckl0ZW0oY29udCkpO1xuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgY29udC53YXRjaGVyID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgT2JqZWN0LmZyZWV6ZShjb250KTtcbiAgICAgICAgfVxuICAgIH07XG59O1xuLy8gZnNfd2F0Y2hGaWxlIGhlbHBlcnNcbi8vIG9iamVjdCB0byBob2xkIHBlci1wcm9jZXNzIGZzX3dhdGNoRmlsZSBpbnN0YW5jZXNcbi8vIChtYXkgYmUgc2hhcmVkIGFjcm9zcyBjaG9raWRhciBGU1dhdGNoZXIgaW5zdGFuY2VzKVxuY29uc3QgRnNXYXRjaEZpbGVJbnN0YW5jZXMgPSBuZXcgTWFwKCk7XG4vKipcbiAqIEluc3RhbnRpYXRlcyB0aGUgZnNfd2F0Y2hGaWxlIGludGVyZmFjZSBvciBiaW5kcyBsaXN0ZW5lcnNcbiAqIHRvIGFuIGV4aXN0aW5nIG9uZSBjb3ZlcmluZyB0aGUgc2FtZSBmaWxlIHN5c3RlbSBlbnRyeVxuICogQHBhcmFtIHBhdGggdG8gYmUgd2F0Y2hlZFxuICogQHBhcmFtIGZ1bGxQYXRoIGFic29sdXRlIHBhdGhcbiAqIEBwYXJhbSBvcHRpb25zIG9wdGlvbnMgdG8gYmUgcGFzc2VkIHRvIGZzX3dhdGNoRmlsZVxuICogQHBhcmFtIGhhbmRsZXJzIGNvbnRhaW5lciBmb3IgZXZlbnQgbGlzdGVuZXIgZnVuY3Rpb25zXG4gKiBAcmV0dXJucyBjbG9zZXJcbiAqL1xuY29uc3Qgc2V0RnNXYXRjaEZpbGVMaXN0ZW5lciA9IChwYXRoLCBmdWxsUGF0aCwgb3B0aW9ucywgaGFuZGxlcnMpID0+IHtcbiAgICBjb25zdCB7IGxpc3RlbmVyLCByYXdFbWl0dGVyIH0gPSBoYW5kbGVycztcbiAgICBsZXQgY29udCA9IEZzV2F0Y2hGaWxlSW5zdGFuY2VzLmdldChmdWxsUGF0aCk7XG4gICAgLy8gbGV0IGxpc3RlbmVycyA9IG5ldyBTZXQoKTtcbiAgICAvLyBsZXQgcmF3RW1pdHRlcnMgPSBuZXcgU2V0KCk7XG4gICAgY29uc3QgY29wdHMgPSBjb250ICYmIGNvbnQub3B0aW9ucztcbiAgICBpZiAoY29wdHMgJiYgKGNvcHRzLnBlcnNpc3RlbnQgPCBvcHRpb25zLnBlcnNpc3RlbnQgfHwgY29wdHMuaW50ZXJ2YWwgPiBvcHRpb25zLmludGVydmFsKSkge1xuICAgICAgICAvLyBcIlVwZ3JhZGVcIiB0aGUgd2F0Y2hlciB0byBwZXJzaXN0ZW5jZSBvciBhIHF1aWNrZXIgaW50ZXJ2YWwuXG4gICAgICAgIC8vIFRoaXMgY3JlYXRlcyBzb21lIHVubGlrZWx5IGVkZ2UgY2FzZSBpc3N1ZXMgaWYgdGhlIHVzZXIgbWl4ZXNcbiAgICAgICAgLy8gc2V0dGluZ3MgaW4gYSB2ZXJ5IHdlaXJkIHdheSwgYnV0IHNvbHZpbmcgZm9yIHRob3NlIGNhc2VzXG4gICAgICAgIC8vIGRvZXNuJ3Qgc2VlbSB3b3J0aHdoaWxlIGZvciB0aGUgYWRkZWQgY29tcGxleGl0eS5cbiAgICAgICAgLy8gbGlzdGVuZXJzID0gY29udC5saXN0ZW5lcnM7XG4gICAgICAgIC8vIHJhd0VtaXR0ZXJzID0gY29udC5yYXdFbWl0dGVycztcbiAgICAgICAgdW53YXRjaEZpbGUoZnVsbFBhdGgpO1xuICAgICAgICBjb250ID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBpZiAoY29udCkge1xuICAgICAgICBhZGRBbmRDb252ZXJ0KGNvbnQsIEtFWV9MSVNURU5FUlMsIGxpc3RlbmVyKTtcbiAgICAgICAgYWRkQW5kQ29udmVydChjb250LCBLRVlfUkFXLCByYXdFbWl0dGVyKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIC8vIFRPRE9cbiAgICAgICAgLy8gbGlzdGVuZXJzLmFkZChsaXN0ZW5lcik7XG4gICAgICAgIC8vIHJhd0VtaXR0ZXJzLmFkZChyYXdFbWl0dGVyKTtcbiAgICAgICAgY29udCA9IHtcbiAgICAgICAgICAgIGxpc3RlbmVyczogbGlzdGVuZXIsXG4gICAgICAgICAgICByYXdFbWl0dGVyczogcmF3RW1pdHRlcixcbiAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICB3YXRjaGVyOiB3YXRjaEZpbGUoZnVsbFBhdGgsIG9wdGlvbnMsIChjdXJyLCBwcmV2KSA9PiB7XG4gICAgICAgICAgICAgICAgZm9yZWFjaChjb250LnJhd0VtaXR0ZXJzLCAocmF3RW1pdHRlcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByYXdFbWl0dGVyKEVWLkNIQU5HRSwgZnVsbFBhdGgsIHsgY3VyciwgcHJldiB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJybXRpbWUgPSBjdXJyLm10aW1lTXM7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnIuc2l6ZSAhPT0gcHJldi5zaXplIHx8IGN1cnJtdGltZSA+IHByZXYubXRpbWVNcyB8fCBjdXJybXRpbWUgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yZWFjaChjb250Lmxpc3RlbmVycywgKGxpc3RlbmVyKSA9PiBsaXN0ZW5lcihwYXRoLCBjdXJyKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSksXG4gICAgICAgIH07XG4gICAgICAgIEZzV2F0Y2hGaWxlSW5zdGFuY2VzLnNldChmdWxsUGF0aCwgY29udCk7XG4gICAgfVxuICAgIC8vIGNvbnN0IGluZGV4ID0gY29udC5saXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lcik7XG4gICAgLy8gUmVtb3ZlcyB0aGlzIGluc3RhbmNlJ3MgbGlzdGVuZXJzIGFuZCBjbG9zZXMgdGhlIHVuZGVybHlpbmcgZnNfd2F0Y2hGaWxlXG4gICAgLy8gaW5zdGFuY2UgaWYgdGhlcmUgYXJlIG5vIG1vcmUgbGlzdGVuZXJzIGxlZnQuXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgZGVsRnJvbVNldChjb250LCBLRVlfTElTVEVORVJTLCBsaXN0ZW5lcik7XG4gICAgICAgIGRlbEZyb21TZXQoY29udCwgS0VZX1JBVywgcmF3RW1pdHRlcik7XG4gICAgICAgIGlmIChpc0VtcHR5U2V0KGNvbnQubGlzdGVuZXJzKSkge1xuICAgICAgICAgICAgRnNXYXRjaEZpbGVJbnN0YW5jZXMuZGVsZXRlKGZ1bGxQYXRoKTtcbiAgICAgICAgICAgIHVud2F0Y2hGaWxlKGZ1bGxQYXRoKTtcbiAgICAgICAgICAgIGNvbnQub3B0aW9ucyA9IGNvbnQud2F0Y2hlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIE9iamVjdC5mcmVlemUoY29udCk7XG4gICAgICAgIH1cbiAgICB9O1xufTtcbi8qKlxuICogQG1peGluXG4gKi9cbmV4cG9ydCBjbGFzcyBOb2RlRnNIYW5kbGVyIHtcbiAgICBjb25zdHJ1Y3Rvcihmc1cpIHtcbiAgICAgICAgdGhpcy5mc3cgPSBmc1c7XG4gICAgICAgIHRoaXMuX2JvdW5kSGFuZGxlRXJyb3IgPSAoZXJyb3IpID0+IGZzVy5faGFuZGxlRXJyb3IoZXJyb3IpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBXYXRjaCBmaWxlIGZvciBjaGFuZ2VzIHdpdGggZnNfd2F0Y2hGaWxlIG9yIGZzX3dhdGNoLlxuICAgICAqIEBwYXJhbSBwYXRoIHRvIGZpbGUgb3IgZGlyXG4gICAgICogQHBhcmFtIGxpc3RlbmVyIG9uIGZzIGNoYW5nZVxuICAgICAqIEByZXR1cm5zIGNsb3NlciBmb3IgdGhlIHdhdGNoZXIgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBfd2F0Y2hXaXRoTm9kZUZzKHBhdGgsIGxpc3RlbmVyKSB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSB0aGlzLmZzdy5vcHRpb25zO1xuICAgICAgICBjb25zdCBkaXJlY3RvcnkgPSBzeXNQYXRoLmRpcm5hbWUocGF0aCk7XG4gICAgICAgIGNvbnN0IGJhc2VuYW1lID0gc3lzUGF0aC5iYXNlbmFtZShwYXRoKTtcbiAgICAgICAgY29uc3QgcGFyZW50ID0gdGhpcy5mc3cuX2dldFdhdGNoZWREaXIoZGlyZWN0b3J5KTtcbiAgICAgICAgcGFyZW50LmFkZChiYXNlbmFtZSk7XG4gICAgICAgIGNvbnN0IGFic29sdXRlUGF0aCA9IHN5c1BhdGgucmVzb2x2ZShwYXRoKTtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgIHBlcnNpc3RlbnQ6IG9wdHMucGVyc2lzdGVudCxcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCFsaXN0ZW5lcilcbiAgICAgICAgICAgIGxpc3RlbmVyID0gRU1QVFlfRk47XG4gICAgICAgIGxldCBjbG9zZXI7XG4gICAgICAgIGlmIChvcHRzLnVzZVBvbGxpbmcpIHtcbiAgICAgICAgICAgIGNvbnN0IGVuYWJsZUJpbiA9IG9wdHMuaW50ZXJ2YWwgIT09IG9wdHMuYmluYXJ5SW50ZXJ2YWw7XG4gICAgICAgICAgICBvcHRpb25zLmludGVydmFsID0gZW5hYmxlQmluICYmIGlzQmluYXJ5UGF0aChiYXNlbmFtZSkgPyBvcHRzLmJpbmFyeUludGVydmFsIDogb3B0cy5pbnRlcnZhbDtcbiAgICAgICAgICAgIGNsb3NlciA9IHNldEZzV2F0Y2hGaWxlTGlzdGVuZXIocGF0aCwgYWJzb2x1dGVQYXRoLCBvcHRpb25zLCB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXIsXG4gICAgICAgICAgICAgICAgcmF3RW1pdHRlcjogdGhpcy5mc3cuX2VtaXRSYXcsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNsb3NlciA9IHNldEZzV2F0Y2hMaXN0ZW5lcihwYXRoLCBhYnNvbHV0ZVBhdGgsIG9wdGlvbnMsIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcixcbiAgICAgICAgICAgICAgICBlcnJIYW5kbGVyOiB0aGlzLl9ib3VuZEhhbmRsZUVycm9yLFxuICAgICAgICAgICAgICAgIHJhd0VtaXR0ZXI6IHRoaXMuZnN3Ll9lbWl0UmF3LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNsb3NlcjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogV2F0Y2ggYSBmaWxlIGFuZCBlbWl0IGFkZCBldmVudCBpZiB3YXJyYW50ZWQuXG4gICAgICogQHJldHVybnMgY2xvc2VyIGZvciB0aGUgd2F0Y2hlciBpbnN0YW5jZVxuICAgICAqL1xuICAgIF9oYW5kbGVGaWxlKGZpbGUsIHN0YXRzLCBpbml0aWFsQWRkKSB7XG4gICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkaXJuYW1lID0gc3lzUGF0aC5kaXJuYW1lKGZpbGUpO1xuICAgICAgICBjb25zdCBiYXNlbmFtZSA9IHN5c1BhdGguYmFzZW5hbWUoZmlsZSk7XG4gICAgICAgIGNvbnN0IHBhcmVudCA9IHRoaXMuZnN3Ll9nZXRXYXRjaGVkRGlyKGRpcm5hbWUpO1xuICAgICAgICAvLyBzdGF0cyBpcyBhbHdheXMgcHJlc2VudFxuICAgICAgICBsZXQgcHJldlN0YXRzID0gc3RhdHM7XG4gICAgICAgIC8vIGlmIHRoZSBmaWxlIGlzIGFscmVhZHkgYmVpbmcgd2F0Y2hlZCwgZG8gbm90aGluZ1xuICAgICAgICBpZiAocGFyZW50LmhhcyhiYXNlbmFtZSkpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGNvbnN0IGxpc3RlbmVyID0gYXN5bmMgKHBhdGgsIG5ld1N0YXRzKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuZnN3Ll90aHJvdHRsZShUSFJPVFRMRV9NT0RFX1dBVENILCBmaWxlLCA1KSlcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBpZiAoIW5ld1N0YXRzIHx8IG5ld1N0YXRzLm10aW1lTXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdTdGF0cyA9IGF3YWl0IHN0YXQoZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIHRoYXQgY2hhbmdlIGV2ZW50IHdhcyBub3QgZmlyZWQgYmVjYXVzZSBvZiBjaGFuZ2VkIG9ubHkgYWNjZXNzVGltZS5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXQgPSBuZXdTdGF0cy5hdGltZU1zO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtdCA9IG5ld1N0YXRzLm10aW1lTXM7XG4gICAgICAgICAgICAgICAgICAgIGlmICghYXQgfHwgYXQgPD0gbXQgfHwgbXQgIT09IHByZXZTdGF0cy5tdGltZU1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZzdy5fZW1pdChFVi5DSEFOR0UsIGZpbGUsIG5ld1N0YXRzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoKGlzTWFjb3MgfHwgaXNMaW51eCB8fCBpc0ZyZWVCU0QpICYmIHByZXZTdGF0cy5pbm8gIT09IG5ld1N0YXRzLmlubykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX2Nsb3NlRmlsZShwYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZXZTdGF0cyA9IG5ld1N0YXRzO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2xvc2VyID0gdGhpcy5fd2F0Y2hXaXRoTm9kZUZzKGZpbGUsIGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbG9zZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX2FkZFBhdGhDbG9zZXIocGF0aCwgY2xvc2VyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZXZTdGF0cyA9IG5ld1N0YXRzO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBGaXggaXNzdWVzIHdoZXJlIG10aW1lIGlzIG51bGwgYnV0IGZpbGUgaXMgc3RpbGwgcHJlc2VudFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmZzdy5fcmVtb3ZlKGRpcm5hbWUsIGJhc2VuYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gYWRkIGlzIGFib3V0IHRvIGJlIGVtaXR0ZWQgaWYgZmlsZSBub3QgYWxyZWFkeSB0cmFja2VkIGluIHBhcmVudFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAocGFyZW50LmhhcyhiYXNlbmFtZSkpIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayB0aGF0IGNoYW5nZSBldmVudCB3YXMgbm90IGZpcmVkIGJlY2F1c2Ugb2YgY2hhbmdlZCBvbmx5IGFjY2Vzc1RpbWUuXG4gICAgICAgICAgICAgICAgY29uc3QgYXQgPSBuZXdTdGF0cy5hdGltZU1zO1xuICAgICAgICAgICAgICAgIGNvbnN0IG10ID0gbmV3U3RhdHMubXRpbWVNcztcbiAgICAgICAgICAgICAgICBpZiAoIWF0IHx8IGF0IDw9IG10IHx8IG10ICE9PSBwcmV2U3RhdHMubXRpbWVNcykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZzdy5fZW1pdChFVi5DSEFOR0UsIGZpbGUsIG5ld1N0YXRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcHJldlN0YXRzID0gbmV3U3RhdHM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIC8vIGtpY2sgb2ZmIHRoZSB3YXRjaGVyXG4gICAgICAgIGNvbnN0IGNsb3NlciA9IHRoaXMuX3dhdGNoV2l0aE5vZGVGcyhmaWxlLCBsaXN0ZW5lcik7XG4gICAgICAgIC8vIGVtaXQgYW4gYWRkIGV2ZW50IGlmIHdlJ3JlIHN1cHBvc2VkIHRvXG4gICAgICAgIGlmICghKGluaXRpYWxBZGQgJiYgdGhpcy5mc3cub3B0aW9ucy5pZ25vcmVJbml0aWFsKSAmJiB0aGlzLmZzdy5faXNudElnbm9yZWQoZmlsZSkpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5mc3cuX3Rocm90dGxlKEVWLkFERCwgZmlsZSwgMCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgdGhpcy5mc3cuX2VtaXQoRVYuQURELCBmaWxlLCBzdGF0cyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNsb3NlcjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogSGFuZGxlIHN5bWxpbmtzIGVuY291bnRlcmVkIHdoaWxlIHJlYWRpbmcgYSBkaXIuXG4gICAgICogQHBhcmFtIGVudHJ5IHJldHVybmVkIGJ5IHJlYWRkaXJwXG4gICAgICogQHBhcmFtIGRpcmVjdG9yeSBwYXRoIG9mIGRpciBiZWluZyByZWFkXG4gICAgICogQHBhcmFtIHBhdGggb2YgdGhpcyBpdGVtXG4gICAgICogQHBhcmFtIGl0ZW0gYmFzZW5hbWUgb2YgdGhpcyBpdGVtXG4gICAgICogQHJldHVybnMgdHJ1ZSBpZiBubyBtb3JlIHByb2Nlc3NpbmcgaXMgbmVlZGVkIGZvciB0aGlzIGVudHJ5LlxuICAgICAqL1xuICAgIGFzeW5jIF9oYW5kbGVTeW1saW5rKGVudHJ5LCBkaXJlY3RvcnksIHBhdGgsIGl0ZW0pIHtcbiAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGZ1bGwgPSBlbnRyeS5mdWxsUGF0aDtcbiAgICAgICAgY29uc3QgZGlyID0gdGhpcy5mc3cuX2dldFdhdGNoZWREaXIoZGlyZWN0b3J5KTtcbiAgICAgICAgaWYgKCF0aGlzLmZzdy5vcHRpb25zLmZvbGxvd1N5bWxpbmtzKSB7XG4gICAgICAgICAgICAvLyB3YXRjaCBzeW1saW5rIGRpcmVjdGx5IChkb24ndCBmb2xsb3cpIGFuZCBkZXRlY3QgY2hhbmdlc1xuICAgICAgICAgICAgdGhpcy5mc3cuX2luY3JSZWFkeUNvdW50KCk7XG4gICAgICAgICAgICBsZXQgbGlua1BhdGg7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGxpbmtQYXRoID0gYXdhaXQgZnNyZWFscGF0aChwYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5mc3cuX2VtaXRSZWFkeSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBpZiAoZGlyLmhhcyhpdGVtKSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZzdy5fc3ltbGlua1BhdGhzLmdldChmdWxsKSAhPT0gbGlua1BhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX3N5bWxpbmtQYXRocy5zZXQoZnVsbCwgbGlua1BhdGgpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZzdy5fZW1pdChFVi5DSEFOR0UsIHBhdGgsIGVudHJ5LnN0YXRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBkaXIuYWRkKGl0ZW0pO1xuICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9zeW1saW5rUGF0aHMuc2V0KGZ1bGwsIGxpbmtQYXRoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmZzdy5fZW1pdChFVi5BREQsIHBhdGgsIGVudHJ5LnN0YXRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZnN3Ll9lbWl0UmVhZHkoKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIGRvbid0IGZvbGxvdyB0aGUgc2FtZSBzeW1saW5rIG1vcmUgdGhhbiBvbmNlXG4gICAgICAgIGlmICh0aGlzLmZzdy5fc3ltbGlua1BhdGhzLmhhcyhmdWxsKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5mc3cuX3N5bWxpbmtQYXRocy5zZXQoZnVsbCwgdHJ1ZSk7XG4gICAgfVxuICAgIF9oYW5kbGVSZWFkKGRpcmVjdG9yeSwgaW5pdGlhbEFkZCwgd2gsIHRhcmdldCwgZGlyLCBkZXB0aCwgdGhyb3R0bGVyKSB7XG4gICAgICAgIC8vIE5vcm1hbGl6ZSB0aGUgZGlyZWN0b3J5IG5hbWUgb24gV2luZG93c1xuICAgICAgICBkaXJlY3RvcnkgPSBzeXNQYXRoLmpvaW4oZGlyZWN0b3J5LCAnJyk7XG4gICAgICAgIHRocm90dGxlciA9IHRoaXMuZnN3Ll90aHJvdHRsZSgncmVhZGRpcicsIGRpcmVjdG9yeSwgMTAwMCk7XG4gICAgICAgIGlmICghdGhyb3R0bGVyKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCBwcmV2aW91cyA9IHRoaXMuZnN3Ll9nZXRXYXRjaGVkRGlyKHdoLnBhdGgpO1xuICAgICAgICBjb25zdCBjdXJyZW50ID0gbmV3IFNldCgpO1xuICAgICAgICBsZXQgc3RyZWFtID0gdGhpcy5mc3cuX3JlYWRkaXJwKGRpcmVjdG9yeSwge1xuICAgICAgICAgICAgZmlsZUZpbHRlcjogKGVudHJ5KSA9PiB3aC5maWx0ZXJQYXRoKGVudHJ5KSxcbiAgICAgICAgICAgIGRpcmVjdG9yeUZpbHRlcjogKGVudHJ5KSA9PiB3aC5maWx0ZXJEaXIoZW50cnkpLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFzdHJlYW0pXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHN0cmVhbVxuICAgICAgICAgICAgLm9uKFNUUl9EQVRBLCBhc3luYyAoZW50cnkpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpIHtcbiAgICAgICAgICAgICAgICBzdHJlYW0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgaXRlbSA9IGVudHJ5LnBhdGg7XG4gICAgICAgICAgICBsZXQgcGF0aCA9IHN5c1BhdGguam9pbihkaXJlY3RvcnksIGl0ZW0pO1xuICAgICAgICAgICAgY3VycmVudC5hZGQoaXRlbSk7XG4gICAgICAgICAgICBpZiAoZW50cnkuc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSAmJlxuICAgICAgICAgICAgICAgIChhd2FpdCB0aGlzLl9oYW5kbGVTeW1saW5rKGVudHJ5LCBkaXJlY3RvcnksIHBhdGgsIGl0ZW0pKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpIHtcbiAgICAgICAgICAgICAgICBzdHJlYW0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRmlsZXMgdGhhdCBwcmVzZW50IGluIGN1cnJlbnQgZGlyZWN0b3J5IHNuYXBzaG90XG4gICAgICAgICAgICAvLyBidXQgYWJzZW50IGluIHByZXZpb3VzIGFyZSBhZGRlZCB0byB3YXRjaCBsaXN0IGFuZFxuICAgICAgICAgICAgLy8gZW1pdCBgYWRkYCBldmVudC5cbiAgICAgICAgICAgIGlmIChpdGVtID09PSB0YXJnZXQgfHwgKCF0YXJnZXQgJiYgIXByZXZpb3VzLmhhcyhpdGVtKSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZzdy5faW5jclJlYWR5Q291bnQoKTtcbiAgICAgICAgICAgICAgICAvLyBlbnN1cmUgcmVsYXRpdmVuZXNzIG9mIHBhdGggaXMgcHJlc2VydmVkIGluIGNhc2Ugb2Ygd2F0Y2hlciByZXVzZVxuICAgICAgICAgICAgICAgIHBhdGggPSBzeXNQYXRoLmpvaW4oZGlyLCBzeXNQYXRoLnJlbGF0aXZlKGRpciwgcGF0aCkpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2FkZFRvTm9kZUZzKHBhdGgsIGluaXRpYWxBZGQsIHdoLCBkZXB0aCArIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAgICAgLm9uKEVWLkVSUk9SLCB0aGlzLl9ib3VuZEhhbmRsZUVycm9yKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGlmICghc3RyZWFtKVxuICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QoKTtcbiAgICAgICAgICAgIHN0cmVhbS5vbmNlKFNUUl9FTkQsICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0cmVhbSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCB3YXNUaHJvdHRsZWQgPSB0aHJvdHRsZXIgPyB0aHJvdHRsZXIuY2xlYXIoKSA6IGZhbHNlO1xuICAgICAgICAgICAgICAgIHJlc29sdmUodW5kZWZpbmVkKTtcbiAgICAgICAgICAgICAgICAvLyBGaWxlcyB0aGF0IGFic2VudCBpbiBjdXJyZW50IGRpcmVjdG9yeSBzbmFwc2hvdFxuICAgICAgICAgICAgICAgIC8vIGJ1dCBwcmVzZW50IGluIHByZXZpb3VzIGVtaXQgYHJlbW92ZWAgZXZlbnRcbiAgICAgICAgICAgICAgICAvLyBhbmQgYXJlIHJlbW92ZWQgZnJvbSBAd2F0Y2hlZFtkaXJlY3RvcnldLlxuICAgICAgICAgICAgICAgIHByZXZpb3VzXG4gICAgICAgICAgICAgICAgICAgIC5nZXRDaGlsZHJlbigpXG4gICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoKGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0gIT09IGRpcmVjdG9yeSAmJiAhY3VycmVudC5oYXMoaXRlbSk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX3JlbW92ZShkaXJlY3RvcnksIGl0ZW0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHN0cmVhbSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAvLyBvbmUgbW9yZSB0aW1lIGZvciBhbnkgbWlzc2VkIGluIGNhc2UgY2hhbmdlcyBjYW1lIGluIGV4dHJlbWVseSBxdWlja2x5XG4gICAgICAgICAgICAgICAgaWYgKHdhc1Rocm90dGxlZClcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlUmVhZChkaXJlY3RvcnksIGZhbHNlLCB3aCwgdGFyZ2V0LCBkaXIsIGRlcHRoLCB0aHJvdHRsZXIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZWFkIGRpcmVjdG9yeSB0byBhZGQgLyByZW1vdmUgZmlsZXMgZnJvbSBgQHdhdGNoZWRgIGxpc3QgYW5kIHJlLXJlYWQgaXQgb24gY2hhbmdlLlxuICAgICAqIEBwYXJhbSBkaXIgZnMgcGF0aFxuICAgICAqIEBwYXJhbSBzdGF0c1xuICAgICAqIEBwYXJhbSBpbml0aWFsQWRkXG4gICAgICogQHBhcmFtIGRlcHRoIHJlbGF0aXZlIHRvIHVzZXItc3VwcGxpZWQgcGF0aFxuICAgICAqIEBwYXJhbSB0YXJnZXQgY2hpbGQgcGF0aCB0YXJnZXRlZCBmb3Igd2F0Y2hcbiAgICAgKiBAcGFyYW0gd2ggQ29tbW9uIHdhdGNoIGhlbHBlcnMgZm9yIHRoaXMgcGF0aFxuICAgICAqIEBwYXJhbSByZWFscGF0aFxuICAgICAqIEByZXR1cm5zIGNsb3NlciBmb3IgdGhlIHdhdGNoZXIgaW5zdGFuY2UuXG4gICAgICovXG4gICAgYXN5bmMgX2hhbmRsZURpcihkaXIsIHN0YXRzLCBpbml0aWFsQWRkLCBkZXB0aCwgdGFyZ2V0LCB3aCwgcmVhbHBhdGgpIHtcbiAgICAgICAgY29uc3QgcGFyZW50RGlyID0gdGhpcy5mc3cuX2dldFdhdGNoZWREaXIoc3lzUGF0aC5kaXJuYW1lKGRpcikpO1xuICAgICAgICBjb25zdCB0cmFja2VkID0gcGFyZW50RGlyLmhhcyhzeXNQYXRoLmJhc2VuYW1lKGRpcikpO1xuICAgICAgICBpZiAoIShpbml0aWFsQWRkICYmIHRoaXMuZnN3Lm9wdGlvbnMuaWdub3JlSW5pdGlhbCkgJiYgIXRhcmdldCAmJiAhdHJhY2tlZCkge1xuICAgICAgICAgICAgdGhpcy5mc3cuX2VtaXQoRVYuQUREX0RJUiwgZGlyLCBzdGF0cyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZW5zdXJlIGRpciBpcyB0cmFja2VkIChoYXJtbGVzcyBpZiByZWR1bmRhbnQpXG4gICAgICAgIHBhcmVudERpci5hZGQoc3lzUGF0aC5iYXNlbmFtZShkaXIpKTtcbiAgICAgICAgdGhpcy5mc3cuX2dldFdhdGNoZWREaXIoZGlyKTtcbiAgICAgICAgbGV0IHRocm90dGxlcjtcbiAgICAgICAgbGV0IGNsb3NlcjtcbiAgICAgICAgY29uc3Qgb0RlcHRoID0gdGhpcy5mc3cub3B0aW9ucy5kZXB0aDtcbiAgICAgICAgaWYgKChvRGVwdGggPT0gbnVsbCB8fCBkZXB0aCA8PSBvRGVwdGgpICYmICF0aGlzLmZzdy5fc3ltbGlua1BhdGhzLmhhcyhyZWFscGF0aCkpIHtcbiAgICAgICAgICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5faGFuZGxlUmVhZChkaXIsIGluaXRpYWxBZGQsIHdoLCB0YXJnZXQsIGRpciwgZGVwdGgsIHRocm90dGxlcik7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2xvc2VyID0gdGhpcy5fd2F0Y2hXaXRoTm9kZUZzKGRpciwgKGRpclBhdGgsIHN0YXRzKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gaWYgY3VycmVudCBkaXJlY3RvcnkgaXMgcmVtb3ZlZCwgZG8gbm90aGluZ1xuICAgICAgICAgICAgICAgIGlmIChzdGF0cyAmJiBzdGF0cy5tdGltZU1zID09PSAwKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlUmVhZChkaXJQYXRoLCBmYWxzZSwgd2gsIHRhcmdldCwgZGlyLCBkZXB0aCwgdGhyb3R0bGVyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjbG9zZXI7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBhZGRlZCBmaWxlLCBkaXJlY3RvcnksIG9yIGdsb2IgcGF0dGVybi5cbiAgICAgKiBEZWxlZ2F0ZXMgY2FsbCB0byBfaGFuZGxlRmlsZSAvIF9oYW5kbGVEaXIgYWZ0ZXIgY2hlY2tzLlxuICAgICAqIEBwYXJhbSBwYXRoIHRvIGZpbGUgb3IgaXJcbiAgICAgKiBAcGFyYW0gaW5pdGlhbEFkZCB3YXMgdGhlIGZpbGUgYWRkZWQgYXQgd2F0Y2ggaW5zdGFudGlhdGlvbj9cbiAgICAgKiBAcGFyYW0gcHJpb3JXaCBkZXB0aCByZWxhdGl2ZSB0byB1c2VyLXN1cHBsaWVkIHBhdGhcbiAgICAgKiBAcGFyYW0gZGVwdGggQ2hpbGQgcGF0aCBhY3R1YWxseSB0YXJnZXRlZCBmb3Igd2F0Y2hcbiAgICAgKiBAcGFyYW0gdGFyZ2V0IENoaWxkIHBhdGggYWN0dWFsbHkgdGFyZ2V0ZWQgZm9yIHdhdGNoXG4gICAgICovXG4gICAgYXN5bmMgX2FkZFRvTm9kZUZzKHBhdGgsIGluaXRpYWxBZGQsIHByaW9yV2gsIGRlcHRoLCB0YXJnZXQpIHtcbiAgICAgICAgY29uc3QgcmVhZHkgPSB0aGlzLmZzdy5fZW1pdFJlYWR5O1xuICAgICAgICBpZiAodGhpcy5mc3cuX2lzSWdub3JlZChwYXRoKSB8fCB0aGlzLmZzdy5jbG9zZWQpIHtcbiAgICAgICAgICAgIHJlYWR5KCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgd2ggPSB0aGlzLmZzdy5fZ2V0V2F0Y2hIZWxwZXJzKHBhdGgpO1xuICAgICAgICBpZiAocHJpb3JXaCkge1xuICAgICAgICAgICAgd2guZmlsdGVyUGF0aCA9IChlbnRyeSkgPT4gcHJpb3JXaC5maWx0ZXJQYXRoKGVudHJ5KTtcbiAgICAgICAgICAgIHdoLmZpbHRlckRpciA9IChlbnRyeSkgPT4gcHJpb3JXaC5maWx0ZXJEaXIoZW50cnkpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGV2YWx1YXRlIHdoYXQgaXMgYXQgdGhlIHBhdGggd2UncmUgYmVpbmcgYXNrZWQgdG8gd2F0Y2hcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgc3RhdE1ldGhvZHNbd2guc3RhdE1ldGhvZF0od2gud2F0Y2hQYXRoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKHRoaXMuZnN3Ll9pc0lnbm9yZWQod2gud2F0Y2hQYXRoLCBzdGF0cykpIHtcbiAgICAgICAgICAgICAgICByZWFkeSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGZvbGxvdyA9IHRoaXMuZnN3Lm9wdGlvbnMuZm9sbG93U3ltbGlua3M7XG4gICAgICAgICAgICBsZXQgY2xvc2VyO1xuICAgICAgICAgICAgaWYgKHN0YXRzLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhYnNQYXRoID0gc3lzUGF0aC5yZXNvbHZlKHBhdGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldFBhdGggPSBmb2xsb3cgPyBhd2FpdCBmc3JlYWxwYXRoKHBhdGgpIDogcGF0aDtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgY2xvc2VyID0gYXdhaXQgdGhpcy5faGFuZGxlRGlyKHdoLndhdGNoUGF0aCwgc3RhdHMsIGluaXRpYWxBZGQsIGRlcHRoLCB0YXJnZXQsIHdoLCB0YXJnZXRQYXRoKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgLy8gcHJlc2VydmUgdGhpcyBzeW1saW5rJ3MgdGFyZ2V0IHBhdGhcbiAgICAgICAgICAgICAgICBpZiAoYWJzUGF0aCAhPT0gdGFyZ2V0UGF0aCAmJiB0YXJnZXRQYXRoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX3N5bWxpbmtQYXRocy5zZXQoYWJzUGF0aCwgdGFyZ2V0UGF0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldFBhdGggPSBmb2xsb3cgPyBhd2FpdCBmc3JlYWxwYXRoKHBhdGgpIDogcGF0aDtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyZW50ID0gc3lzUGF0aC5kaXJuYW1lKHdoLndhdGNoUGF0aCk7XG4gICAgICAgICAgICAgICAgdGhpcy5mc3cuX2dldFdhdGNoZWREaXIocGFyZW50KS5hZGQod2gud2F0Y2hQYXRoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmZzdy5fZW1pdChFVi5BREQsIHdoLndhdGNoUGF0aCwgc3RhdHMpO1xuICAgICAgICAgICAgICAgIGNsb3NlciA9IGF3YWl0IHRoaXMuX2hhbmRsZURpcihwYXJlbnQsIHN0YXRzLCBpbml0aWFsQWRkLCBkZXB0aCwgcGF0aCwgd2gsIHRhcmdldFBhdGgpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAvLyBwcmVzZXJ2ZSB0aGlzIHN5bWxpbmsncyB0YXJnZXQgcGF0aFxuICAgICAgICAgICAgICAgIGlmICh0YXJnZXRQYXRoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX3N5bWxpbmtQYXRocy5zZXQoc3lzUGF0aC5yZXNvbHZlKHBhdGgpLCB0YXJnZXRQYXRoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjbG9zZXIgPSB0aGlzLl9oYW5kbGVGaWxlKHdoLndhdGNoUGF0aCwgc3RhdHMsIGluaXRpYWxBZGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVhZHkoKTtcbiAgICAgICAgICAgIGlmIChjbG9zZXIpXG4gICAgICAgICAgICAgICAgdGhpcy5mc3cuX2FkZFBhdGhDbG9zZXIocGF0aCwgY2xvc2VyKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmZzdy5faGFuZGxlRXJyb3IoZXJyb3IpKSB7XG4gICAgICAgICAgICAgICAgcmVhZHkoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGF0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbiIsICIvKipcbiAqIERpc2NvdmVyIHR3ZWFrcyB1bmRlciA8dXNlclJvb3Q+L3R3ZWFrcy4gRWFjaCB0d2VhayBpcyBhIGRpcmVjdG9yeSB3aXRoIGFcbiAqIG1hbmlmZXN0Lmpzb24gYW5kIGFuIGVudHJ5IHNjcmlwdC4gRW50cnkgcmVzb2x1dGlvbiBpcyBtYW5pZmVzdC5tYWluIGZpcnN0LFxuICogdGhlbiBpbmRleC5qcywgaW5kZXgubWpzLCBhbmQgaW5kZXguY2pzLlxuICpcbiAqIFRoZSBtYW5pZmVzdCBnYXRlIGlzIGludGVudGlvbmFsbHkgc3RyaWN0LiBBIHR3ZWFrIG11c3QgaWRlbnRpZnkgaXRzIEdpdEh1YlxuICogcmVwb3NpdG9yeSBzbyB0aGUgbWFuYWdlciBjYW4gY2hlY2sgcmVsZWFzZXMgd2l0aG91dCBncmFudGluZyB0aGUgdHdlYWsgYW5cbiAqIHVwZGF0ZS9pbnN0YWxsIGNoYW5uZWwuIFVwZGF0ZSBjaGVja3MgYXJlIGFkdmlzb3J5IG9ubHkuXG4gKi9cbmltcG9ydCB7IHJlYWRkaXJTeW5jLCBzdGF0U3luYywgcmVhZEZpbGVTeW5jLCBleGlzdHNTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGpvaW4gfSBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgdHlwZSB7IFR3ZWFrTWFuaWZlc3QgfSBmcm9tIFwiQGNvZGV4LXBsdXNwbHVzL3Nka1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIERpc2NvdmVyZWRUd2VhayB7XG4gIGRpcjogc3RyaW5nO1xuICBlbnRyeTogc3RyaW5nO1xuICBtYW5pZmVzdDogVHdlYWtNYW5pZmVzdDtcbn1cblxuY29uc3QgRU5UUllfQ0FORElEQVRFUyA9IFtcImluZGV4LmpzXCIsIFwiaW5kZXguY2pzXCIsIFwiaW5kZXgubWpzXCJdO1xuXG5leHBvcnQgZnVuY3Rpb24gZGlzY292ZXJUd2Vha3ModHdlYWtzRGlyOiBzdHJpbmcpOiBEaXNjb3ZlcmVkVHdlYWtbXSB7XG4gIGlmICghZXhpc3RzU3luYyh0d2Vha3NEaXIpKSByZXR1cm4gW107XG4gIGNvbnN0IG91dDogRGlzY292ZXJlZFR3ZWFrW10gPSBbXTtcbiAgZm9yIChjb25zdCBuYW1lIG9mIHJlYWRkaXJTeW5jKHR3ZWFrc0RpcikpIHtcbiAgICBjb25zdCBkaXIgPSBqb2luKHR3ZWFrc0RpciwgbmFtZSk7XG4gICAgaWYgKCFzdGF0U3luYyhkaXIpLmlzRGlyZWN0b3J5KCkpIGNvbnRpbnVlO1xuICAgIGNvbnN0IG1hbmlmZXN0UGF0aCA9IGpvaW4oZGlyLCBcIm1hbmlmZXN0Lmpzb25cIik7XG4gICAgaWYgKCFleGlzdHNTeW5jKG1hbmlmZXN0UGF0aCkpIGNvbnRpbnVlO1xuICAgIGxldCBtYW5pZmVzdDogVHdlYWtNYW5pZmVzdDtcbiAgICB0cnkge1xuICAgICAgbWFuaWZlc3QgPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhtYW5pZmVzdFBhdGgsIFwidXRmOFwiKSkgYXMgVHdlYWtNYW5pZmVzdDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAoIWlzVmFsaWRNYW5pZmVzdChtYW5pZmVzdCkpIGNvbnRpbnVlO1xuICAgIGNvbnN0IGVudHJ5ID0gcmVzb2x2ZUVudHJ5KGRpciwgbWFuaWZlc3QpO1xuICAgIGlmICghZW50cnkpIGNvbnRpbnVlO1xuICAgIG91dC5wdXNoKHsgZGlyLCBlbnRyeSwgbWFuaWZlc3QgfSk7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gaXNWYWxpZE1hbmlmZXN0KG06IFR3ZWFrTWFuaWZlc3QpOiBib29sZWFuIHtcbiAgaWYgKCFtLmlkIHx8ICFtLm5hbWUgfHwgIW0udmVyc2lvbiB8fCAhbS5naXRodWJSZXBvKSByZXR1cm4gZmFsc2U7XG4gIGlmICghL15bYS16QS1aMC05Ll8tXStcXC9bYS16QS1aMC05Ll8tXSskLy50ZXN0KG0uZ2l0aHViUmVwbykpIHJldHVybiBmYWxzZTtcbiAgaWYgKG0uc2NvcGUgJiYgIVtcInJlbmRlcmVyXCIsIFwibWFpblwiLCBcImJvdGhcIl0uaW5jbHVkZXMobS5zY29wZSkpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVFbnRyeShkaXI6IHN0cmluZywgbTogVHdlYWtNYW5pZmVzdCk6IHN0cmluZyB8IG51bGwge1xuICBpZiAobS5tYWluKSB7XG4gICAgY29uc3QgcCA9IGpvaW4oZGlyLCBtLm1haW4pO1xuICAgIHJldHVybiBleGlzdHNTeW5jKHApID8gcCA6IG51bGw7XG4gIH1cbiAgZm9yIChjb25zdCBjIG9mIEVOVFJZX0NBTkRJREFURVMpIHtcbiAgICBjb25zdCBwID0gam9pbihkaXIsIGMpO1xuICAgIGlmIChleGlzdHNTeW5jKHApKSByZXR1cm4gcDtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cbiIsICIvKipcbiAqIERpc2stYmFja2VkIGtleS92YWx1ZSBzdG9yYWdlIGZvciBtYWluLXByb2Nlc3MgdHdlYWtzLlxuICpcbiAqIEVhY2ggdHdlYWsgZ2V0cyBvbmUgSlNPTiBmaWxlIHVuZGVyIGA8dXNlclJvb3Q+L3N0b3JhZ2UvPGlkPi5qc29uYC5cbiAqIFdyaXRlcyBhcmUgZGVib3VuY2VkICg1MCBtcykgYW5kIGF0b21pYyAod3JpdGUgdG8gPGZpbGU+LnRtcCB0aGVuIHJlbmFtZSkuXG4gKiBSZWFkcyBhcmUgZWFnZXIgKyBjYWNoZWQgaW4tbWVtb3J5OyB3ZSBsb2FkIG9uIGZpcnN0IGFjY2Vzcy5cbiAqL1xuaW1wb3J0IHtcbiAgZXhpc3RzU3luYyxcbiAgbWtkaXJTeW5jLFxuICByZWFkRmlsZVN5bmMsXG4gIHJlbmFtZVN5bmMsXG4gIHdyaXRlRmlsZVN5bmMsXG59IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIERpc2tTdG9yYWdlIHtcbiAgZ2V0PFQ+KGtleTogc3RyaW5nLCBkZWZhdWx0VmFsdWU/OiBUKTogVDtcbiAgc2V0KGtleTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bik6IHZvaWQ7XG4gIGRlbGV0ZShrZXk6IHN0cmluZyk6IHZvaWQ7XG4gIGFsbCgpOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgZmx1c2goKTogdm9pZDtcbn1cblxuY29uc3QgRkxVU0hfREVMQVlfTVMgPSA1MDtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZURpc2tTdG9yYWdlKHJvb3REaXI6IHN0cmluZywgaWQ6IHN0cmluZyk6IERpc2tTdG9yYWdlIHtcbiAgY29uc3QgZGlyID0gam9pbihyb290RGlyLCBcInN0b3JhZ2VcIik7XG4gIG1rZGlyU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICBjb25zdCBmaWxlID0gam9pbihkaXIsIGAke3Nhbml0aXplKGlkKX0uanNvbmApO1xuXG4gIGxldCBkYXRhOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICBpZiAoZXhpc3RzU3luYyhmaWxlKSkge1xuICAgIHRyeSB7XG4gICAgICBkYXRhID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMoZmlsZSwgXCJ1dGY4XCIpKSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIENvcnJ1cHQgZmlsZSBcdTIwMTQgc3RhcnQgZnJlc2gsIGJ1dCBkb24ndCBjbG9iYmVyIHRoZSBvcmlnaW5hbCB1bnRpbCB3ZVxuICAgICAgLy8gc3VjY2Vzc2Z1bGx5IHdyaXRlIGFnYWluLiAoTW92ZSBpdCBhc2lkZSBmb3IgZm9yZW5zaWNzLilcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlbmFtZVN5bmMoZmlsZSwgYCR7ZmlsZX0uY29ycnVwdC0ke0RhdGUubm93KCl9YCk7XG4gICAgICB9IGNhdGNoIHt9XG4gICAgICBkYXRhID0ge307XG4gICAgfVxuICB9XG5cbiAgbGV0IGRpcnR5ID0gZmFsc2U7XG4gIGxldCB0aW1lcjogTm9kZUpTLlRpbWVvdXQgfCBudWxsID0gbnVsbDtcblxuICBjb25zdCBzY2hlZHVsZUZsdXNoID0gKCkgPT4ge1xuICAgIGRpcnR5ID0gdHJ1ZTtcbiAgICBpZiAodGltZXIpIHJldHVybjtcbiAgICB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGltZXIgPSBudWxsO1xuICAgICAgaWYgKGRpcnR5KSBmbHVzaCgpO1xuICAgIH0sIEZMVVNIX0RFTEFZX01TKTtcbiAgfTtcblxuICBjb25zdCBmbHVzaCA9ICgpOiB2b2lkID0+IHtcbiAgICBpZiAoIWRpcnR5KSByZXR1cm47XG4gICAgY29uc3QgdG1wID0gYCR7ZmlsZX0udG1wYDtcbiAgICB0cnkge1xuICAgICAgd3JpdGVGaWxlU3luYyh0bXAsIEpTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIDIpLCBcInV0ZjhcIik7XG4gICAgICByZW5hbWVTeW5jKHRtcCwgZmlsZSk7XG4gICAgICBkaXJ0eSA9IGZhbHNlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIExlYXZlIGRpcnR5PXRydWUgc28gYSBmdXR1cmUgZmx1c2ggcmV0cmllcy5cbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJbY29kZXgtcGx1c3BsdXNdIHN0b3JhZ2UgZmx1c2ggZmFpbGVkOlwiLCBpZCwgZSk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiB7XG4gICAgZ2V0OiA8VD4oazogc3RyaW5nLCBkPzogVCk6IFQgPT5cbiAgICAgIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChkYXRhLCBrKSA/IChkYXRhW2tdIGFzIFQpIDogKGQgYXMgVCksXG4gICAgc2V0KGssIHYpIHtcbiAgICAgIGRhdGFba10gPSB2O1xuICAgICAgc2NoZWR1bGVGbHVzaCgpO1xuICAgIH0sXG4gICAgZGVsZXRlKGspIHtcbiAgICAgIGlmIChrIGluIGRhdGEpIHtcbiAgICAgICAgZGVsZXRlIGRhdGFba107XG4gICAgICAgIHNjaGVkdWxlRmx1c2goKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGFsbDogKCkgPT4gKHsgLi4uZGF0YSB9KSxcbiAgICBmbHVzaCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gc2FuaXRpemUoaWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIC8vIFR3ZWFrIGlkcyBhcmUgYXV0aG9yLWNvbnRyb2xsZWQ7IGNsYW1wIHRvIGEgc2FmZSBmaWxlbmFtZS5cbiAgcmV0dXJuIGlkLnJlcGxhY2UoL1teYS16QS1aMC05Ll9ALV0vZywgXCJfXCIpO1xufVxuIiwgImltcG9ydCB7IGV4aXN0c1N5bmMsIG1rZGlyU3luYywgcmVhZEZpbGVTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGRpcm5hbWUsIGlzQWJzb2x1dGUsIHJlc29sdmUgfSBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgdHlwZSB7IFR3ZWFrTWNwU2VydmVyIH0gZnJvbSBcIkBjb2RleC1wbHVzcGx1cy9zZGtcIjtcblxuZXhwb3J0IGNvbnN0IE1DUF9NQU5BR0VEX1NUQVJUID0gXCIjIEJFR0lOIENPREVYKysgTUFOQUdFRCBNQ1AgU0VSVkVSU1wiO1xuZXhwb3J0IGNvbnN0IE1DUF9NQU5BR0VEX0VORCA9IFwiIyBFTkQgQ09ERVgrKyBNQU5BR0VEIE1DUCBTRVJWRVJTXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWNwU3luY1R3ZWFrIHtcbiAgZGlyOiBzdHJpbmc7XG4gIG1hbmlmZXN0OiB7XG4gICAgaWQ6IHN0cmluZztcbiAgICBtY3A/OiBUd2Vha01jcFNlcnZlcjtcbiAgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBCdWlsdE1hbmFnZWRNY3BCbG9jayB7XG4gIGJsb2NrOiBzdHJpbmc7XG4gIHNlcnZlck5hbWVzOiBzdHJpbmdbXTtcbiAgc2tpcHBlZFNlcnZlck5hbWVzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNYW5hZ2VkTWNwU3luY1Jlc3VsdCBleHRlbmRzIEJ1aWx0TWFuYWdlZE1jcEJsb2NrIHtcbiAgY2hhbmdlZDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN5bmNNYW5hZ2VkTWNwU2VydmVycyh7XG4gIGNvbmZpZ1BhdGgsXG4gIHR3ZWFrcyxcbn06IHtcbiAgY29uZmlnUGF0aDogc3RyaW5nO1xuICB0d2Vha3M6IE1jcFN5bmNUd2Vha1tdO1xufSk6IE1hbmFnZWRNY3BTeW5jUmVzdWx0IHtcbiAgY29uc3QgY3VycmVudCA9IGV4aXN0c1N5bmMoY29uZmlnUGF0aCkgPyByZWFkRmlsZVN5bmMoY29uZmlnUGF0aCwgXCJ1dGY4XCIpIDogXCJcIjtcbiAgY29uc3QgYnVpbHQgPSBidWlsZE1hbmFnZWRNY3BCbG9jayh0d2Vha3MsIGN1cnJlbnQpO1xuICBjb25zdCBuZXh0ID0gbWVyZ2VNYW5hZ2VkTWNwQmxvY2soY3VycmVudCwgYnVpbHQuYmxvY2spO1xuXG4gIGlmIChuZXh0ICE9PSBjdXJyZW50KSB7XG4gICAgbWtkaXJTeW5jKGRpcm5hbWUoY29uZmlnUGF0aCksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIHdyaXRlRmlsZVN5bmMoY29uZmlnUGF0aCwgbmV4dCwgXCJ1dGY4XCIpO1xuICB9XG5cbiAgcmV0dXJuIHsgLi4uYnVpbHQsIGNoYW5nZWQ6IG5leHQgIT09IGN1cnJlbnQgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkTWFuYWdlZE1jcEJsb2NrKFxuICB0d2Vha3M6IE1jcFN5bmNUd2Vha1tdLFxuICBleGlzdGluZ1RvbWwgPSBcIlwiLFxuKTogQnVpbHRNYW5hZ2VkTWNwQmxvY2sge1xuICBjb25zdCBtYW51YWxUb21sID0gc3RyaXBNYW5hZ2VkTWNwQmxvY2soZXhpc3RpbmdUb21sKTtcbiAgY29uc3QgbWFudWFsTmFtZXMgPSBmaW5kTWNwU2VydmVyTmFtZXMobWFudWFsVG9tbCk7XG4gIGNvbnN0IHVzZWROYW1lcyA9IG5ldyBTZXQobWFudWFsTmFtZXMpO1xuICBjb25zdCBzZXJ2ZXJOYW1lczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3Qgc2tpcHBlZFNlcnZlck5hbWVzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBlbnRyaWVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgdHdlYWsgb2YgdHdlYWtzKSB7XG4gICAgY29uc3QgbWNwID0gbm9ybWFsaXplTWNwU2VydmVyKHR3ZWFrLm1hbmlmZXN0Lm1jcCk7XG4gICAgaWYgKCFtY3ApIGNvbnRpbnVlO1xuXG4gICAgY29uc3QgYmFzZU5hbWUgPSBtY3BTZXJ2ZXJOYW1lRnJvbVR3ZWFrSWQodHdlYWsubWFuaWZlc3QuaWQpO1xuICAgIGlmIChtYW51YWxOYW1lcy5oYXMoYmFzZU5hbWUpKSB7XG4gICAgICBza2lwcGVkU2VydmVyTmFtZXMucHVzaChiYXNlTmFtZSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBzZXJ2ZXJOYW1lID0gcmVzZXJ2ZVVuaXF1ZU5hbWUoYmFzZU5hbWUsIHVzZWROYW1lcyk7XG4gICAgc2VydmVyTmFtZXMucHVzaChzZXJ2ZXJOYW1lKTtcbiAgICBlbnRyaWVzLnB1c2goZm9ybWF0TWNwU2VydmVyKHNlcnZlck5hbWUsIHR3ZWFrLmRpciwgbWNwKSk7XG4gIH1cblxuICBpZiAoZW50cmllcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4geyBibG9jazogXCJcIiwgc2VydmVyTmFtZXMsIHNraXBwZWRTZXJ2ZXJOYW1lcyB9O1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBibG9jazogW01DUF9NQU5BR0VEX1NUQVJULCAuLi5lbnRyaWVzLCBNQ1BfTUFOQUdFRF9FTkRdLmpvaW4oXCJcXG5cIiksXG4gICAgc2VydmVyTmFtZXMsXG4gICAgc2tpcHBlZFNlcnZlck5hbWVzLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWVyZ2VNYW5hZ2VkTWNwQmxvY2soY3VycmVudFRvbWw6IHN0cmluZywgbWFuYWdlZEJsb2NrOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoIW1hbmFnZWRCbG9jayAmJiAhY3VycmVudFRvbWwuaW5jbHVkZXMoTUNQX01BTkFHRURfU1RBUlQpKSByZXR1cm4gY3VycmVudFRvbWw7XG4gIGNvbnN0IHN0cmlwcGVkID0gc3RyaXBNYW5hZ2VkTWNwQmxvY2soY3VycmVudFRvbWwpLnRyaW1FbmQoKTtcbiAgaWYgKCFtYW5hZ2VkQmxvY2spIHJldHVybiBzdHJpcHBlZCA/IGAke3N0cmlwcGVkfVxcbmAgOiBcIlwiO1xuICByZXR1cm4gYCR7c3RyaXBwZWQgPyBgJHtzdHJpcHBlZH1cXG5cXG5gIDogXCJcIn0ke21hbmFnZWRCbG9ja31cXG5gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RyaXBNYW5hZ2VkTWNwQmxvY2sodG9tbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgcGF0dGVybiA9IG5ldyBSZWdFeHAoXG4gICAgYFxcXFxuPyR7ZXNjYXBlUmVnRXhwKE1DUF9NQU5BR0VEX1NUQVJUKX1bXFxcXHNcXFxcU10qPyR7ZXNjYXBlUmVnRXhwKE1DUF9NQU5BR0VEX0VORCl9XFxcXG4/YCxcbiAgICBcImdcIixcbiAgKTtcbiAgcmV0dXJuIHRvbWwucmVwbGFjZShwYXR0ZXJuLCBcIlxcblwiKS5yZXBsYWNlKC9cXG57Myx9L2csIFwiXFxuXFxuXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWNwU2VydmVyTmFtZUZyb21Ud2Vha0lkKGlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCB3aXRob3V0UHVibGlzaGVyID0gaWQucmVwbGFjZSgvXmNvXFwuYmVubmV0dFxcLi8sIFwiXCIpO1xuICBjb25zdCBzbHVnID0gd2l0aG91dFB1Ymxpc2hlclxuICAgIC5yZXBsYWNlKC9bXmEtekEtWjAtOV8tXSsvZywgXCItXCIpXG4gICAgLnJlcGxhY2UoL14tK3wtKyQvZywgXCJcIilcbiAgICAudG9Mb3dlckNhc2UoKTtcbiAgcmV0dXJuIHNsdWcgfHwgXCJ0d2Vhay1tY3BcIjtcbn1cblxuZnVuY3Rpb24gZmluZE1jcFNlcnZlck5hbWVzKHRvbWw6IHN0cmluZyk6IFNldDxzdHJpbmc+IHtcbiAgY29uc3QgbmFtZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgdGFibGVQYXR0ZXJuID0gL15cXHMqXFxbbWNwX3NlcnZlcnNcXC4oW15cXF1cXHNdKylcXF1cXHMqJC9nbTtcbiAgbGV0IG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xuICB3aGlsZSAoKG1hdGNoID0gdGFibGVQYXR0ZXJuLmV4ZWModG9tbCkpICE9PSBudWxsKSB7XG4gICAgbmFtZXMuYWRkKHVucXVvdGVUb21sS2V5KG1hdGNoWzFdID8/IFwiXCIpKTtcbiAgfVxuICByZXR1cm4gbmFtZXM7XG59XG5cbmZ1bmN0aW9uIHJlc2VydmVVbmlxdWVOYW1lKGJhc2VOYW1lOiBzdHJpbmcsIHVzZWROYW1lczogU2V0PHN0cmluZz4pOiBzdHJpbmcge1xuICBpZiAoIXVzZWROYW1lcy5oYXMoYmFzZU5hbWUpKSB7XG4gICAgdXNlZE5hbWVzLmFkZChiYXNlTmFtZSk7XG4gICAgcmV0dXJuIGJhc2VOYW1lO1xuICB9XG4gIGZvciAobGV0IGkgPSAyOyA7IGkgKz0gMSkge1xuICAgIGNvbnN0IGNhbmRpZGF0ZSA9IGAke2Jhc2VOYW1lfS0ke2l9YDtcbiAgICBpZiAoIXVzZWROYW1lcy5oYXMoY2FuZGlkYXRlKSkge1xuICAgICAgdXNlZE5hbWVzLmFkZChjYW5kaWRhdGUpO1xuICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplTWNwU2VydmVyKHZhbHVlOiBUd2Vha01jcFNlcnZlciB8IHVuZGVmaW5lZCk6IFR3ZWFrTWNwU2VydmVyIHwgbnVsbCB7XG4gIGlmICghdmFsdWUgfHwgdHlwZW9mIHZhbHVlLmNvbW1hbmQgIT09IFwic3RyaW5nXCIgfHwgdmFsdWUuY29tbWFuZC5sZW5ndGggPT09IDApIHJldHVybiBudWxsO1xuICBpZiAodmFsdWUuYXJncyAhPT0gdW5kZWZpbmVkICYmICFBcnJheS5pc0FycmF5KHZhbHVlLmFyZ3MpKSByZXR1cm4gbnVsbDtcbiAgaWYgKHZhbHVlLmFyZ3M/LnNvbWUoKGFyZykgPT4gdHlwZW9mIGFyZyAhPT0gXCJzdHJpbmdcIikpIHJldHVybiBudWxsO1xuICBpZiAodmFsdWUuZW52ICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAoIXZhbHVlLmVudiB8fCB0eXBlb2YgdmFsdWUuZW52ICE9PSBcIm9iamVjdFwiIHx8IEFycmF5LmlzQXJyYXkodmFsdWUuZW52KSkgcmV0dXJuIG51bGw7XG4gICAgaWYgKE9iamVjdC52YWx1ZXModmFsdWUuZW52KS5zb21lKChlbnZWYWx1ZSkgPT4gdHlwZW9mIGVudlZhbHVlICE9PSBcInN0cmluZ1wiKSkgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRNY3BTZXJ2ZXIoc2VydmVyTmFtZTogc3RyaW5nLCB0d2Vha0Rpcjogc3RyaW5nLCBtY3A6IFR3ZWFrTWNwU2VydmVyKTogc3RyaW5nIHtcbiAgY29uc3QgbGluZXMgPSBbXG4gICAgYFttY3Bfc2VydmVycy4ke2Zvcm1hdFRvbWxLZXkoc2VydmVyTmFtZSl9XWAsXG4gICAgYGNvbW1hbmQgPSAke2Zvcm1hdFRvbWxTdHJpbmcocmVzb2x2ZUNvbW1hbmQodHdlYWtEaXIsIG1jcC5jb21tYW5kKSl9YCxcbiAgXTtcblxuICBpZiAobWNwLmFyZ3MgJiYgbWNwLmFyZ3MubGVuZ3RoID4gMCkge1xuICAgIGxpbmVzLnB1c2goYGFyZ3MgPSAke2Zvcm1hdFRvbWxTdHJpbmdBcnJheShtY3AuYXJncy5tYXAoKGFyZykgPT4gcmVzb2x2ZUFyZyh0d2Vha0RpciwgYXJnKSkpfWApO1xuICB9XG5cbiAgaWYgKG1jcC5lbnYgJiYgT2JqZWN0LmtleXMobWNwLmVudikubGVuZ3RoID4gMCkge1xuICAgIGxpbmVzLnB1c2goYGVudiA9ICR7Zm9ybWF0VG9tbElubGluZVRhYmxlKG1jcC5lbnYpfWApO1xuICB9XG5cbiAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVDb21tYW5kKHR3ZWFrRGlyOiBzdHJpbmcsIGNvbW1hbmQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmIChpc0Fic29sdXRlKGNvbW1hbmQpIHx8ICFsb29rc0xpa2VSZWxhdGl2ZVBhdGgoY29tbWFuZCkpIHJldHVybiBjb21tYW5kO1xuICByZXR1cm4gcmVzb2x2ZSh0d2Vha0RpciwgY29tbWFuZCk7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVBcmcodHdlYWtEaXI6IHN0cmluZywgYXJnOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoaXNBYnNvbHV0ZShhcmcpIHx8IGFyZy5zdGFydHNXaXRoKFwiLVwiKSkgcmV0dXJuIGFyZztcbiAgY29uc3QgY2FuZGlkYXRlID0gcmVzb2x2ZSh0d2Vha0RpciwgYXJnKTtcbiAgcmV0dXJuIGV4aXN0c1N5bmMoY2FuZGlkYXRlKSA/IGNhbmRpZGF0ZSA6IGFyZztcbn1cblxuZnVuY3Rpb24gbG9va3NMaWtlUmVsYXRpdmVQYXRoKHZhbHVlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIHZhbHVlLnN0YXJ0c1dpdGgoXCIuL1wiKSB8fCB2YWx1ZS5zdGFydHNXaXRoKFwiLi4vXCIpIHx8IHZhbHVlLmluY2x1ZGVzKFwiL1wiKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VG9tbFN0cmluZyh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VG9tbFN0cmluZ0FycmF5KHZhbHVlczogc3RyaW5nW10pOiBzdHJpbmcge1xuICByZXR1cm4gYFske3ZhbHVlcy5tYXAoZm9ybWF0VG9tbFN0cmluZykuam9pbihcIiwgXCIpfV1gO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRUb21sSW5saW5lVGFibGUocmVjb3JkOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KTogc3RyaW5nIHtcbiAgcmV0dXJuIGB7ICR7T2JqZWN0LmVudHJpZXMocmVjb3JkKVxuICAgIC5tYXAoKFtrZXksIHZhbHVlXSkgPT4gYCR7Zm9ybWF0VG9tbEtleShrZXkpfSA9ICR7Zm9ybWF0VG9tbFN0cmluZyh2YWx1ZSl9YClcbiAgICAuam9pbihcIiwgXCIpfSB9YDtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VG9tbEtleShrZXk6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiAvXlthLXpBLVowLTlfLV0rJC8udGVzdChrZXkpID8ga2V5IDogZm9ybWF0VG9tbFN0cmluZyhrZXkpO1xufVxuXG5mdW5jdGlvbiB1bnF1b3RlVG9tbEtleShrZXk6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICgha2V5LnN0YXJ0c1dpdGgoJ1wiJykgfHwgIWtleS5lbmRzV2l0aCgnXCInKSkgcmV0dXJuIGtleTtcbiAgdHJ5IHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShrZXkpIGFzIHN0cmluZztcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGtleTtcbiAgfVxufVxuXG5mdW5jdGlvbiBlc2NhcGVSZWdFeHAodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB2YWx1ZS5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgXCJcXFxcJCZcIik7XG59XG4iLCAiaW1wb3J0IHsgZXhlY0ZpbGVTeW5jIH0gZnJvbSBcIm5vZGU6Y2hpbGRfcHJvY2Vzc1wiO1xuaW1wb3J0IHsgZXhpc3RzU3luYywgcmVhZEZpbGVTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGhvbWVkaXIsIHBsYXRmb3JtIH0gZnJvbSBcIm5vZGU6b3NcIjtcbmltcG9ydCB7IGpvaW4gfSBmcm9tIFwibm9kZTpwYXRoXCI7XG5cbnR5cGUgQ2hlY2tTdGF0dXMgPSBcIm9rXCIgfCBcIndhcm5cIiB8IFwiZXJyb3JcIjtcblxuZXhwb3J0IGludGVyZmFjZSBXYXRjaGVySGVhbHRoQ2hlY2sge1xuICBuYW1lOiBzdHJpbmc7XG4gIHN0YXR1czogQ2hlY2tTdGF0dXM7XG4gIGRldGFpbDogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdhdGNoZXJIZWFsdGgge1xuICBjaGVja2VkQXQ6IHN0cmluZztcbiAgc3RhdHVzOiBDaGVja1N0YXR1cztcbiAgdGl0bGU6IHN0cmluZztcbiAgc3VtbWFyeTogc3RyaW5nO1xuICB3YXRjaGVyOiBzdHJpbmc7XG4gIGNoZWNrczogV2F0Y2hlckhlYWx0aENoZWNrW107XG59XG5cbmludGVyZmFjZSBJbnN0YWxsZXJTdGF0ZSB7XG4gIGFwcFJvb3Q/OiBzdHJpbmc7XG4gIHZlcnNpb24/OiBzdHJpbmc7XG4gIHdhdGNoZXI/OiBcImxhdW5jaGRcIiB8IFwibG9naW4taXRlbVwiIHwgXCJzY2hlZHVsZWQtdGFza1wiIHwgXCJzeXN0ZW1kXCIgfCBcIm5vbmVcIjtcbn1cblxuaW50ZXJmYWNlIFJ1bnRpbWVDb25maWcge1xuICBjb2RleFBsdXNQbHVzPzoge1xuICAgIGF1dG9VcGRhdGU/OiBib29sZWFuO1xuICB9O1xufVxuXG5pbnRlcmZhY2UgU2VsZlVwZGF0ZVN0YXRlIHtcbiAgc3RhdHVzPzogXCJjaGVja2luZ1wiIHwgXCJ1cC10by1kYXRlXCIgfCBcInVwZGF0ZWRcIiB8IFwiZmFpbGVkXCIgfCBcImRpc2FibGVkXCI7XG4gIGNvbXBsZXRlZEF0Pzogc3RyaW5nO1xuICBjaGVja2VkQXQ/OiBzdHJpbmc7XG4gIGxhdGVzdFZlcnNpb24/OiBzdHJpbmcgfCBudWxsO1xuICBlcnJvcj86IHN0cmluZztcbn1cblxuY29uc3QgTEFVTkNIRF9MQUJFTCA9IFwiY29tLmNvZGV4cGx1c3BsdXMud2F0Y2hlclwiO1xuY29uc3QgV0FUQ0hFUl9MT0cgPSBqb2luKGhvbWVkaXIoKSwgXCJMaWJyYXJ5XCIsIFwiTG9nc1wiLCBcImNvZGV4LXBsdXNwbHVzLXdhdGNoZXIubG9nXCIpO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0V2F0Y2hlckhlYWx0aCh1c2VyUm9vdDogc3RyaW5nKTogV2F0Y2hlckhlYWx0aCB7XG4gIGNvbnN0IGNoZWNrczogV2F0Y2hlckhlYWx0aENoZWNrW10gPSBbXTtcbiAgY29uc3Qgc3RhdGUgPSByZWFkSnNvbjxJbnN0YWxsZXJTdGF0ZT4oam9pbih1c2VyUm9vdCwgXCJzdGF0ZS5qc29uXCIpKTtcbiAgY29uc3QgY29uZmlnID0gcmVhZEpzb248UnVudGltZUNvbmZpZz4oam9pbih1c2VyUm9vdCwgXCJjb25maWcuanNvblwiKSkgPz8ge307XG4gIGNvbnN0IHNlbGZVcGRhdGUgPSByZWFkSnNvbjxTZWxmVXBkYXRlU3RhdGU+KGpvaW4odXNlclJvb3QsIFwic2VsZi11cGRhdGUtc3RhdGUuanNvblwiKSk7XG5cbiAgY2hlY2tzLnB1c2goe1xuICAgIG5hbWU6IFwiSW5zdGFsbCBzdGF0ZVwiLFxuICAgIHN0YXR1czogc3RhdGUgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgZGV0YWlsOiBzdGF0ZSA/IGBDb2RleCsrICR7c3RhdGUudmVyc2lvbiA/PyBcIih1bmtub3duIHZlcnNpb24pXCJ9YCA6IFwic3RhdGUuanNvbiBpcyBtaXNzaW5nXCIsXG4gIH0pO1xuXG4gIGlmICghc3RhdGUpIHJldHVybiBzdW1tYXJpemUoXCJub25lXCIsIGNoZWNrcyk7XG5cbiAgY29uc3QgYXV0b1VwZGF0ZSA9IGNvbmZpZy5jb2RleFBsdXNQbHVzPy5hdXRvVXBkYXRlICE9PSBmYWxzZTtcbiAgY2hlY2tzLnB1c2goe1xuICAgIG5hbWU6IFwiQXV0b21hdGljIHJlZnJlc2hcIixcbiAgICBzdGF0dXM6IGF1dG9VcGRhdGUgPyBcIm9rXCIgOiBcIndhcm5cIixcbiAgICBkZXRhaWw6IGF1dG9VcGRhdGUgPyBcImVuYWJsZWRcIiA6IFwiZGlzYWJsZWQgaW4gQ29kZXgrKyBjb25maWdcIixcbiAgfSk7XG5cbiAgY2hlY2tzLnB1c2goe1xuICAgIG5hbWU6IFwiV2F0Y2hlciBraW5kXCIsXG4gICAgc3RhdHVzOiBzdGF0ZS53YXRjaGVyICYmIHN0YXRlLndhdGNoZXIgIT09IFwibm9uZVwiID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgIGRldGFpbDogc3RhdGUud2F0Y2hlciA/PyBcIm5vbmVcIixcbiAgfSk7XG5cbiAgaWYgKHNlbGZVcGRhdGUpIHtcbiAgICBjaGVja3MucHVzaChzZWxmVXBkYXRlQ2hlY2soc2VsZlVwZGF0ZSkpO1xuICB9XG5cbiAgY29uc3QgYXBwUm9vdCA9IHN0YXRlLmFwcFJvb3QgPz8gXCJcIjtcbiAgY2hlY2tzLnB1c2goe1xuICAgIG5hbWU6IFwiQ29kZXggYXBwXCIsXG4gICAgc3RhdHVzOiBhcHBSb290ICYmIGV4aXN0c1N5bmMoYXBwUm9vdCkgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgZGV0YWlsOiBhcHBSb290IHx8IFwibWlzc2luZyBhcHBSb290IGluIHN0YXRlXCIsXG4gIH0pO1xuXG4gIHN3aXRjaCAocGxhdGZvcm0oKSkge1xuICAgIGNhc2UgXCJkYXJ3aW5cIjpcbiAgICAgIGNoZWNrcy5wdXNoKC4uLmNoZWNrTGF1bmNoZFdhdGNoZXIoYXBwUm9vdCkpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBcImxpbnV4XCI6XG4gICAgICBjaGVja3MucHVzaCguLi5jaGVja1N5c3RlbWRXYXRjaGVyKGFwcFJvb3QpKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgXCJ3aW4zMlwiOlxuICAgICAgY2hlY2tzLnB1c2goLi4uY2hlY2tTY2hlZHVsZWRUYXNrV2F0Y2hlcigpKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBjaGVja3MucHVzaCh7XG4gICAgICAgIG5hbWU6IFwiUGxhdGZvcm0gd2F0Y2hlclwiLFxuICAgICAgICBzdGF0dXM6IFwid2FyblwiLFxuICAgICAgICBkZXRhaWw6IGB1bnN1cHBvcnRlZCBwbGF0Zm9ybTogJHtwbGF0Zm9ybSgpfWAsXG4gICAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBzdW1tYXJpemUoc3RhdGUud2F0Y2hlciA/PyBcIm5vbmVcIiwgY2hlY2tzKTtcbn1cblxuZnVuY3Rpb24gc2VsZlVwZGF0ZUNoZWNrKHN0YXRlOiBTZWxmVXBkYXRlU3RhdGUpOiBXYXRjaGVySGVhbHRoQ2hlY2sge1xuICBjb25zdCBhdCA9IHN0YXRlLmNvbXBsZXRlZEF0ID8/IHN0YXRlLmNoZWNrZWRBdCA/PyBcInVua25vd24gdGltZVwiO1xuICBpZiAoc3RhdGUuc3RhdHVzID09PSBcImZhaWxlZFwiKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IFwibGFzdCBDb2RleCsrIHVwZGF0ZVwiLFxuICAgICAgc3RhdHVzOiBcIndhcm5cIixcbiAgICAgIGRldGFpbDogc3RhdGUuZXJyb3IgPyBgZmFpbGVkICR7YXR9OiAke3N0YXRlLmVycm9yfWAgOiBgZmFpbGVkICR7YXR9YCxcbiAgICB9O1xuICB9XG4gIGlmIChzdGF0ZS5zdGF0dXMgPT09IFwiZGlzYWJsZWRcIikge1xuICAgIHJldHVybiB7IG5hbWU6IFwibGFzdCBDb2RleCsrIHVwZGF0ZVwiLCBzdGF0dXM6IFwid2FyblwiLCBkZXRhaWw6IGBza2lwcGVkICR7YXR9OiBhdXRvbWF0aWMgcmVmcmVzaCBkaXNhYmxlZGAgfTtcbiAgfVxuICBpZiAoc3RhdGUuc3RhdHVzID09PSBcInVwZGF0ZWRcIikge1xuICAgIHJldHVybiB7IG5hbWU6IFwibGFzdCBDb2RleCsrIHVwZGF0ZVwiLCBzdGF0dXM6IFwib2tcIiwgZGV0YWlsOiBgdXBkYXRlZCAke2F0fSB0byAke3N0YXRlLmxhdGVzdFZlcnNpb24gPz8gXCJuZXcgcmVsZWFzZVwifWAgfTtcbiAgfVxuICBpZiAoc3RhdGUuc3RhdHVzID09PSBcInVwLXRvLWRhdGVcIikge1xuICAgIHJldHVybiB7IG5hbWU6IFwibGFzdCBDb2RleCsrIHVwZGF0ZVwiLCBzdGF0dXM6IFwib2tcIiwgZGV0YWlsOiBgdXAgdG8gZGF0ZSAke2F0fWAgfTtcbiAgfVxuICByZXR1cm4geyBuYW1lOiBcImxhc3QgQ29kZXgrKyB1cGRhdGVcIiwgc3RhdHVzOiBcIndhcm5cIiwgZGV0YWlsOiBgY2hlY2tpbmcgc2luY2UgJHthdH1gIH07XG59XG5cbmZ1bmN0aW9uIGNoZWNrTGF1bmNoZFdhdGNoZXIoYXBwUm9vdDogc3RyaW5nKTogV2F0Y2hlckhlYWx0aENoZWNrW10ge1xuICBjb25zdCBjaGVja3M6IFdhdGNoZXJIZWFsdGhDaGVja1tdID0gW107XG4gIGNvbnN0IHBsaXN0UGF0aCA9IGpvaW4oaG9tZWRpcigpLCBcIkxpYnJhcnlcIiwgXCJMYXVuY2hBZ2VudHNcIiwgYCR7TEFVTkNIRF9MQUJFTH0ucGxpc3RgKTtcbiAgY29uc3QgcGxpc3QgPSBleGlzdHNTeW5jKHBsaXN0UGF0aCkgPyByZWFkRmlsZVNhZmUocGxpc3RQYXRoKSA6IFwiXCI7XG4gIGNvbnN0IGFzYXJQYXRoID0gYXBwUm9vdCA/IGpvaW4oYXBwUm9vdCwgXCJDb250ZW50c1wiLCBcIlJlc291cmNlc1wiLCBcImFwcC5hc2FyXCIpIDogXCJcIjtcblxuICBjaGVja3MucHVzaCh7XG4gICAgbmFtZTogXCJsYXVuY2hkIHBsaXN0XCIsXG4gICAgc3RhdHVzOiBwbGlzdCA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICBkZXRhaWw6IHBsaXN0UGF0aCxcbiAgfSk7XG5cbiAgaWYgKHBsaXN0KSB7XG4gICAgY2hlY2tzLnB1c2goe1xuICAgICAgbmFtZTogXCJsYXVuY2hkIGxhYmVsXCIsXG4gICAgICBzdGF0dXM6IHBsaXN0LmluY2x1ZGVzKExBVU5DSERfTEFCRUwpID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgICAgZGV0YWlsOiBMQVVOQ0hEX0xBQkVMLFxuICAgIH0pO1xuICAgIGNoZWNrcy5wdXNoKHtcbiAgICAgIG5hbWU6IFwibGF1bmNoZCB0cmlnZ2VyXCIsXG4gICAgICBzdGF0dXM6IGFzYXJQYXRoICYmIHBsaXN0LmluY2x1ZGVzKGFzYXJQYXRoKSA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICAgIGRldGFpbDogYXNhclBhdGggfHwgXCJtaXNzaW5nIGFwcFJvb3RcIixcbiAgICB9KTtcbiAgICBjaGVja3MucHVzaCh7XG4gICAgICBuYW1lOiBcIndhdGNoZXIgY29tbWFuZFwiLFxuICAgICAgc3RhdHVzOiBwbGlzdC5pbmNsdWRlcyhcIkNPREVYX1BMVVNQTFVTX1dBVENIRVI9MVwiKSAmJiBwbGlzdC5pbmNsdWRlcyhcIiB1cGRhdGUgLS13YXRjaGVyIC0tcXVpZXRcIilcbiAgICAgICAgPyBcIm9rXCJcbiAgICAgICAgOiBcImVycm9yXCIsXG4gICAgICBkZXRhaWw6IGNvbW1hbmRTdW1tYXJ5KHBsaXN0KSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNsaVBhdGggPSBleHRyYWN0Rmlyc3QocGxpc3QsIC8nKFteJ10qcGFja2FnZXNcXC9pbnN0YWxsZXJcXC9kaXN0XFwvY2xpXFwuanMpJy8pO1xuICAgIGlmIChjbGlQYXRoKSB7XG4gICAgICBjaGVja3MucHVzaCh7XG4gICAgICAgIG5hbWU6IFwicmVwYWlyIENMSVwiLFxuICAgICAgICBzdGF0dXM6IGV4aXN0c1N5bmMoY2xpUGF0aCkgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgICAgIGRldGFpbDogY2xpUGF0aCxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGxvYWRlZCA9IGNvbW1hbmRTdWNjZWVkcyhcImxhdW5jaGN0bFwiLCBbXCJsaXN0XCIsIExBVU5DSERfTEFCRUxdKTtcbiAgY2hlY2tzLnB1c2goe1xuICAgIG5hbWU6IFwibGF1bmNoZCBsb2FkZWRcIixcbiAgICBzdGF0dXM6IGxvYWRlZCA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICBkZXRhaWw6IGxvYWRlZCA/IFwic2VydmljZSBpcyBsb2FkZWRcIiA6IFwibGF1bmNoY3RsIGNhbm5vdCBmaW5kIHRoZSB3YXRjaGVyXCIsXG4gIH0pO1xuXG4gIGNoZWNrcy5wdXNoKHdhdGNoZXJMb2dDaGVjaygpKTtcbiAgcmV0dXJuIGNoZWNrcztcbn1cblxuZnVuY3Rpb24gY2hlY2tTeXN0ZW1kV2F0Y2hlcihhcHBSb290OiBzdHJpbmcpOiBXYXRjaGVySGVhbHRoQ2hlY2tbXSB7XG4gIGNvbnN0IGRpciA9IGpvaW4oaG9tZWRpcigpLCBcIi5jb25maWdcIiwgXCJzeXN0ZW1kXCIsIFwidXNlclwiKTtcbiAgY29uc3Qgc2VydmljZSA9IGpvaW4oZGlyLCBcImNvZGV4LXBsdXNwbHVzLXdhdGNoZXIuc2VydmljZVwiKTtcbiAgY29uc3QgdGltZXIgPSBqb2luKGRpciwgXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyLnRpbWVyXCIpO1xuICBjb25zdCBwYXRoVW5pdCA9IGpvaW4oZGlyLCBcImNvZGV4LXBsdXNwbHVzLXdhdGNoZXIucGF0aFwiKTtcbiAgY29uc3QgZXhwZWN0ZWRQYXRoID0gYXBwUm9vdCA/IGpvaW4oYXBwUm9vdCwgXCJyZXNvdXJjZXNcIiwgXCJhcHAuYXNhclwiKSA6IFwiXCI7XG4gIGNvbnN0IHBhdGhCb2R5ID0gZXhpc3RzU3luYyhwYXRoVW5pdCkgPyByZWFkRmlsZVNhZmUocGF0aFVuaXQpIDogXCJcIjtcblxuICByZXR1cm4gW1xuICAgIHtcbiAgICAgIG5hbWU6IFwic3lzdGVtZCBzZXJ2aWNlXCIsXG4gICAgICBzdGF0dXM6IGV4aXN0c1N5bmMoc2VydmljZSkgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgICBkZXRhaWw6IHNlcnZpY2UsXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiBcInN5c3RlbWQgdGltZXJcIixcbiAgICAgIHN0YXR1czogZXhpc3RzU3luYyh0aW1lcikgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgICBkZXRhaWw6IHRpbWVyLFxuICAgIH0sXG4gICAge1xuICAgICAgbmFtZTogXCJzeXN0ZW1kIHBhdGhcIixcbiAgICAgIHN0YXR1czogcGF0aEJvZHkgJiYgZXhwZWN0ZWRQYXRoICYmIHBhdGhCb2R5LmluY2x1ZGVzKGV4cGVjdGVkUGF0aCkgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgICBkZXRhaWw6IGV4cGVjdGVkUGF0aCB8fCBwYXRoVW5pdCxcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6IFwicGF0aCB1bml0IGFjdGl2ZVwiLFxuICAgICAgc3RhdHVzOiBjb21tYW5kU3VjY2VlZHMoXCJzeXN0ZW1jdGxcIiwgW1wiLS11c2VyXCIsIFwiaXMtYWN0aXZlXCIsIFwiLS1xdWlldFwiLCBcImNvZGV4LXBsdXNwbHVzLXdhdGNoZXIucGF0aFwiXSkgPyBcIm9rXCIgOiBcIndhcm5cIixcbiAgICAgIGRldGFpbDogXCJzeXN0ZW1jdGwgLS11c2VyIGlzLWFjdGl2ZSBjb2RleC1wbHVzcGx1cy13YXRjaGVyLnBhdGhcIixcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6IFwidGltZXIgYWN0aXZlXCIsXG4gICAgICBzdGF0dXM6IGNvbW1hbmRTdWNjZWVkcyhcInN5c3RlbWN0bFwiLCBbXCItLXVzZXJcIiwgXCJpcy1hY3RpdmVcIiwgXCItLXF1aWV0XCIsIFwiY29kZXgtcGx1c3BsdXMtd2F0Y2hlci50aW1lclwiXSkgPyBcIm9rXCIgOiBcIndhcm5cIixcbiAgICAgIGRldGFpbDogXCJzeXN0ZW1jdGwgLS11c2VyIGlzLWFjdGl2ZSBjb2RleC1wbHVzcGx1cy13YXRjaGVyLnRpbWVyXCIsXG4gICAgfSxcbiAgXTtcbn1cblxuZnVuY3Rpb24gY2hlY2tTY2hlZHVsZWRUYXNrV2F0Y2hlcigpOiBXYXRjaGVySGVhbHRoQ2hlY2tbXSB7XG4gIHJldHVybiBbXG4gICAge1xuICAgICAgbmFtZTogXCJsb2dvbiB0YXNrXCIsXG4gICAgICBzdGF0dXM6IGNvbW1hbmRTdWNjZWVkcyhcInNjaHRhc2tzLmV4ZVwiLCBbXCIvUXVlcnlcIiwgXCIvVE5cIiwgXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyXCJdKSA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICAgIGRldGFpbDogXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyXCIsXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiBcImhvdXJseSB0YXNrXCIsXG4gICAgICBzdGF0dXM6IGNvbW1hbmRTdWNjZWVkcyhcInNjaHRhc2tzLmV4ZVwiLCBbXCIvUXVlcnlcIiwgXCIvVE5cIiwgXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyLWhvdXJseVwiXSkgPyBcIm9rXCIgOiBcIndhcm5cIixcbiAgICAgIGRldGFpbDogXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyLWhvdXJseVwiLFxuICAgIH0sXG4gIF07XG59XG5cbmZ1bmN0aW9uIHdhdGNoZXJMb2dDaGVjaygpOiBXYXRjaGVySGVhbHRoQ2hlY2sge1xuICBpZiAoIWV4aXN0c1N5bmMoV0FUQ0hFUl9MT0cpKSB7XG4gICAgcmV0dXJuIHsgbmFtZTogXCJ3YXRjaGVyIGxvZ1wiLCBzdGF0dXM6IFwid2FyblwiLCBkZXRhaWw6IFwibm8gd2F0Y2hlciBsb2cgeWV0XCIgfTtcbiAgfVxuICBjb25zdCB0YWlsID0gcmVhZEZpbGVTYWZlKFdBVENIRVJfTE9HKS5zcGxpdCgvXFxyP1xcbi8pLnNsaWNlKC00MCkuam9pbihcIlxcblwiKTtcbiAgcmV0dXJuIGFuYWx5emVXYXRjaGVyTG9nVGFpbCh0YWlsKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVXYXRjaGVyTG9nVGFpbCh0YWlsOiBzdHJpbmcpOiBXYXRjaGVySGVhbHRoQ2hlY2sge1xuICBjb25zdCBoYXNFcnJvciA9IC9cdTI3MTcgY29kZXgtcGx1c3BsdXMgZmFpbGVkfGNvZGV4LXBsdXNwbHVzIGZhaWxlZHxlcnJvcnxmYWlsZWQvaS50ZXN0KHRhaWwpO1xuICBjb25zdCBuZWVkc01hbnVhbFJlcGFpciA9XG4gICAgaGFzRXJyb3IgJiZcbiAgICAvQ2Fubm90IHdyaXRlIHRvIC4qQ29kZXguKlxcLmFwcHxBcHAgTWFuYWdlbWVudHxmaWxlIG93bmVyc2hpcHxzdWRvIGNvZGV4cGx1c3BsdXMgKD86aW5zdGFsbHxyZXBhaXIpfEVBQ0NFU3xFUEVSTS9pLnRlc3QodGFpbCk7XG4gIHJldHVybiB7XG4gICAgbmFtZTogXCJ3YXRjaGVyIGxvZ1wiLFxuICAgIHN0YXR1czogaGFzRXJyb3IgPyBcIndhcm5cIiA6IFwib2tcIixcbiAgICBkZXRhaWw6IGhhc0Vycm9yXG4gICAgICA/IG5lZWRzTWFudWFsUmVwYWlyXG4gICAgICAgID8gXCJhdXRvLXJlcGFpciBuZWVkcyBhcHAgcGVybWlzc2lvbnM7IHJ1biBgY29kZXhwbHVzcGx1cyByZXBhaXJgIGZyb20gVGVybWluYWxcIlxuICAgICAgICA6IFwicmVjZW50IHdhdGNoZXIgbG9nIGNvbnRhaW5zIGFuIGVycm9yXCJcbiAgICAgIDogV0FUQ0hFUl9MT0csXG4gIH07XG59XG5cbmZ1bmN0aW9uIHN1bW1hcml6ZSh3YXRjaGVyOiBzdHJpbmcsIGNoZWNrczogV2F0Y2hlckhlYWx0aENoZWNrW10pOiBXYXRjaGVySGVhbHRoIHtcbiAgY29uc3QgaGFzRXJyb3IgPSBjaGVja3Muc29tZSgoYykgPT4gYy5zdGF0dXMgPT09IFwiZXJyb3JcIik7XG4gIGNvbnN0IGhhc1dhcm4gPSBjaGVja3Muc29tZSgoYykgPT4gYy5zdGF0dXMgPT09IFwid2FyblwiKTtcbiAgY29uc3Qgc3RhdHVzOiBDaGVja1N0YXR1cyA9IGhhc0Vycm9yID8gXCJlcnJvclwiIDogaGFzV2FybiA/IFwid2FyblwiIDogXCJva1wiO1xuICBjb25zdCBmYWlsZWQgPSBjaGVja3MuZmlsdGVyKChjKSA9PiBjLnN0YXR1cyA9PT0gXCJlcnJvclwiKS5sZW5ndGg7XG4gIGNvbnN0IHdhcm5lZCA9IGNoZWNrcy5maWx0ZXIoKGMpID0+IGMuc3RhdHVzID09PSBcIndhcm5cIikubGVuZ3RoO1xuICBjb25zdCB0aXRsZSA9XG4gICAgc3RhdHVzID09PSBcIm9rXCJcbiAgICAgID8gXCJBdXRvLXJlcGFpciB3YXRjaGVyIGlzIHJlYWR5XCJcbiAgICAgIDogc3RhdHVzID09PSBcIndhcm5cIlxuICAgICAgICA/IFwiQXV0by1yZXBhaXIgd2F0Y2hlciBuZWVkcyByZXZpZXdcIlxuICAgICAgICA6IFwiQXV0by1yZXBhaXIgd2F0Y2hlciBpcyBub3QgcmVhZHlcIjtcbiAgY29uc3Qgc3VtbWFyeSA9XG4gICAgc3RhdHVzID09PSBcIm9rXCJcbiAgICAgID8gXCJDb2RleCsrIHNob3VsZCBhdXRvbWF0aWNhbGx5IHJlcGFpciBpdHNlbGYgYWZ0ZXIgQ29kZXggdXBkYXRlcy5cIlxuICAgICAgOiBgJHtmYWlsZWR9IGZhaWxpbmcgY2hlY2socyksICR7d2FybmVkfSB3YXJuaW5nKHMpLmA7XG5cbiAgcmV0dXJuIHtcbiAgICBjaGVja2VkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICBzdGF0dXMsXG4gICAgdGl0bGUsXG4gICAgc3VtbWFyeSxcbiAgICB3YXRjaGVyLFxuICAgIGNoZWNrcyxcbiAgfTtcbn1cblxuZnVuY3Rpb24gY29tbWFuZFN1Y2NlZWRzKGNvbW1hbmQ6IHN0cmluZywgYXJnczogc3RyaW5nW10pOiBib29sZWFuIHtcbiAgdHJ5IHtcbiAgICBleGVjRmlsZVN5bmMoY29tbWFuZCwgYXJncywgeyBzdGRpbzogXCJpZ25vcmVcIiwgdGltZW91dDogNV8wMDAgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjb21tYW5kU3VtbWFyeShwbGlzdDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgY29tbWFuZCA9IGV4dHJhY3RGaXJzdChwbGlzdCwgLzxzdHJpbmc+KFtePF0qKD86dXBkYXRlIC0td2F0Y2hlciAtLXF1aWV0fHJlcGFpciAtLXF1aWV0KVtePF0qKTxcXC9zdHJpbmc+Lyk7XG4gIHJldHVybiBjb21tYW5kID8gdW5lc2NhcGVYbWwoY29tbWFuZCkucmVwbGFjZSgvXFxzKy9nLCBcIiBcIikudHJpbSgpIDogXCJ3YXRjaGVyIGNvbW1hbmQgbm90IGZvdW5kXCI7XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RGaXJzdChzb3VyY2U6IHN0cmluZywgcGF0dGVybjogUmVnRXhwKTogc3RyaW5nIHwgbnVsbCB7XG4gIHJldHVybiBzb3VyY2UubWF0Y2gocGF0dGVybik/LlsxXSA/PyBudWxsO1xufVxuXG5mdW5jdGlvbiByZWFkSnNvbjxUPihwYXRoOiBzdHJpbmcpOiBUIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKHBhdGgsIFwidXRmOFwiKSkgYXMgVDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVhZEZpbGVTYWZlKHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHJlYWRGaWxlU3luYyhwYXRoLCBcInV0ZjhcIik7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBcIlwiO1xuICB9XG59XG5cbmZ1bmN0aW9uIHVuZXNjYXBlWG1sKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdmFsdWVcbiAgICAucmVwbGFjZSgvJnF1b3Q7L2csIFwiXFxcIlwiKVxuICAgIC5yZXBsYWNlKC8mYXBvczsvZywgXCInXCIpXG4gICAgLnJlcGxhY2UoLyZsdDsvZywgXCI8XCIpXG4gICAgLnJlcGxhY2UoLyZndDsvZywgXCI+XCIpXG4gICAgLnJlcGxhY2UoLyZhbXA7L2csIFwiJlwiKTtcbn1cbiIsICJleHBvcnQgdHlwZSBUd2Vha1Njb3BlID0gXCJyZW5kZXJlclwiIHwgXCJtYWluXCIgfCBcImJvdGhcIjtcblxuZXhwb3J0IGludGVyZmFjZSBSZWxvYWRUd2Vha3NEZXBzIHtcbiAgbG9nSW5mbyhtZXNzYWdlOiBzdHJpbmcpOiB2b2lkO1xuICBzdG9wQWxsTWFpblR3ZWFrcygpOiB2b2lkO1xuICBjbGVhclR3ZWFrTW9kdWxlQ2FjaGUoKTogdm9pZDtcbiAgbG9hZEFsbE1haW5Ud2Vha3MoKTogdm9pZDtcbiAgYnJvYWRjYXN0UmVsb2FkKCk6IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2V0VHdlYWtFbmFibGVkQW5kUmVsb2FkRGVwcyBleHRlbmRzIFJlbG9hZFR3ZWFrc0RlcHMge1xuICBzZXRUd2Vha0VuYWJsZWQoaWQ6IHN0cmluZywgZW5hYmxlZDogYm9vbGVhbik6IHZvaWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc01haW5Qcm9jZXNzVHdlYWtTY29wZShzY29wZTogVHdlYWtTY29wZSB8IHVuZGVmaW5lZCk6IGJvb2xlYW4ge1xuICByZXR1cm4gc2NvcGUgIT09IFwicmVuZGVyZXJcIjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlbG9hZFR3ZWFrcyhyZWFzb246IHN0cmluZywgZGVwczogUmVsb2FkVHdlYWtzRGVwcyk6IHZvaWQge1xuICBkZXBzLmxvZ0luZm8oYHJlbG9hZGluZyB0d2Vha3MgKCR7cmVhc29ufSlgKTtcbiAgZGVwcy5zdG9wQWxsTWFpblR3ZWFrcygpO1xuICBkZXBzLmNsZWFyVHdlYWtNb2R1bGVDYWNoZSgpO1xuICBkZXBzLmxvYWRBbGxNYWluVHdlYWtzKCk7XG4gIGRlcHMuYnJvYWRjYXN0UmVsb2FkKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRUd2Vha0VuYWJsZWRBbmRSZWxvYWQoXG4gIGlkOiBzdHJpbmcsXG4gIGVuYWJsZWQ6IHVua25vd24sXG4gIGRlcHM6IFNldFR3ZWFrRW5hYmxlZEFuZFJlbG9hZERlcHMsXG4pOiB0cnVlIHtcbiAgY29uc3Qgbm9ybWFsaXplZEVuYWJsZWQgPSAhIWVuYWJsZWQ7XG4gIGRlcHMuc2V0VHdlYWtFbmFibGVkKGlkLCBub3JtYWxpemVkRW5hYmxlZCk7XG4gIGRlcHMubG9nSW5mbyhgdHdlYWsgJHtpZH0gZW5hYmxlZD0ke25vcm1hbGl6ZWRFbmFibGVkfWApO1xuICByZWxvYWRUd2Vha3MoXCJlbmFibGVkLXRvZ2dsZVwiLCBkZXBzKTtcbiAgcmV0dXJuIHRydWU7XG59XG4iLCAiaW1wb3J0IHsgYXBwZW5kRmlsZVN5bmMsIGV4aXN0c1N5bmMsIHJlYWRGaWxlU3luYywgc3RhdFN5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tIFwibm9kZTpmc1wiO1xuXG5leHBvcnQgY29uc3QgTUFYX0xPR19CWVRFUyA9IDEwICogMTAyNCAqIDEwMjQ7XG5cbmV4cG9ydCBmdW5jdGlvbiBhcHBlbmRDYXBwZWRMb2cocGF0aDogc3RyaW5nLCBsaW5lOiBzdHJpbmcsIG1heEJ5dGVzID0gTUFYX0xPR19CWVRFUyk6IHZvaWQge1xuICBjb25zdCBpbmNvbWluZyA9IEJ1ZmZlci5mcm9tKGxpbmUpO1xuICBpZiAoaW5jb21pbmcuYnl0ZUxlbmd0aCA+PSBtYXhCeXRlcykge1xuICAgIHdyaXRlRmlsZVN5bmMocGF0aCwgaW5jb21pbmcuc3ViYXJyYXkoaW5jb21pbmcuYnl0ZUxlbmd0aCAtIG1heEJ5dGVzKSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBpZiAoZXhpc3RzU3luYyhwYXRoKSkge1xuICAgICAgY29uc3Qgc2l6ZSA9IHN0YXRTeW5jKHBhdGgpLnNpemU7XG4gICAgICBjb25zdCBhbGxvd2VkRXhpc3RpbmcgPSBtYXhCeXRlcyAtIGluY29taW5nLmJ5dGVMZW5ndGg7XG4gICAgICBpZiAoc2l6ZSA+IGFsbG93ZWRFeGlzdGluZykge1xuICAgICAgICBjb25zdCBleGlzdGluZyA9IHJlYWRGaWxlU3luYyhwYXRoKTtcbiAgICAgICAgd3JpdGVGaWxlU3luYyhwYXRoLCBleGlzdGluZy5zdWJhcnJheShNYXRoLm1heCgwLCBleGlzdGluZy5ieXRlTGVuZ3RoIC0gYWxsb3dlZEV4aXN0aW5nKSkpO1xuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCB7XG4gICAgLy8gSWYgdHJpbW1pbmcgZmFpbHMsIHN0aWxsIHRyeSB0byBhcHBlbmQgYmVsb3c7IGxvZ2dpbmcgbXVzdCBiZSBiZXN0LWVmZm9ydC5cbiAgfVxuXG4gIGFwcGVuZEZpbGVTeW5jKHBhdGgsIGluY29taW5nKTtcbn1cbiIsICJpbXBvcnQgdHlwZSB7IFR3ZWFrTWFuaWZlc3QgfSBmcm9tIFwiQGNvZGV4LXBsdXNwbHVzL3Nka1wiO1xuXG5leHBvcnQgY29uc3QgREVGQVVMVF9UV0VBS19TVE9SRV9JTkRFWF9VUkwgPVxuICBcImh0dHBzOi8vYi1ubmV0dC5naXRodWIuaW8vY29kZXgtcGx1c3BsdXMvc3RvcmUvaW5kZXguanNvblwiO1xuZXhwb3J0IGNvbnN0IFRXRUFLX1NUT1JFX1JFVklFV19JU1NVRV9VUkwgPVxuICBcImh0dHBzOi8vZ2l0aHViLmNvbS9iLW5uZXR0L2NvZGV4LXBsdXNwbHVzL2lzc3Vlcy9uZXdcIjtcblxuZXhwb3J0IGludGVyZmFjZSBUd2Vha1N0b3JlUmVnaXN0cnkge1xuICBzY2hlbWFWZXJzaW9uOiAxO1xuICBnZW5lcmF0ZWRBdD86IHN0cmluZztcbiAgZW50cmllczogVHdlYWtTdG9yZUVudHJ5W107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHdlYWtTdG9yZUVudHJ5IHtcbiAgaWQ6IHN0cmluZztcbiAgbWFuaWZlc3Q6IFR3ZWFrTWFuaWZlc3Q7XG4gIHJlcG86IHN0cmluZztcbiAgYXBwcm92ZWRDb21taXRTaGE6IHN0cmluZztcbiAgYXBwcm92ZWRBdDogc3RyaW5nO1xuICBhcHByb3ZlZEJ5OiBzdHJpbmc7XG4gIHBsYXRmb3Jtcz86IFR3ZWFrU3RvcmVQbGF0Zm9ybVtdO1xuICByZWxlYXNlVXJsPzogc3RyaW5nO1xuICByZXZpZXdVcmw/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCB0eXBlIFR3ZWFrU3RvcmVQbGF0Zm9ybSA9IFwiZGFyd2luXCIgfCBcIndpbjMyXCIgfCBcImxpbnV4XCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHdlYWtTdG9yZVB1Ymxpc2hTdWJtaXNzaW9uIHtcbiAgcmVwbzogc3RyaW5nO1xuICBkZWZhdWx0QnJhbmNoOiBzdHJpbmc7XG4gIGNvbW1pdFNoYTogc3RyaW5nO1xuICBjb21taXRVcmw6IHN0cmluZztcbiAgbWFuaWZlc3Q/OiB7XG4gICAgaWQ/OiBzdHJpbmc7XG4gICAgbmFtZT86IHN0cmluZztcbiAgICB2ZXJzaW9uPzogc3RyaW5nO1xuICAgIGRlc2NyaXB0aW9uPzogc3RyaW5nO1xuICAgIGljb25Vcmw/OiBzdHJpbmc7XG4gIH07XG59XG5cbmNvbnN0IEdJVEhVQl9SRVBPX1JFID0gL15bQS1aYS16MC05Xy4tXStcXC9bQS1aYS16MC05Xy4tXSskLztcbmNvbnN0IEZVTExfU0hBX1JFID0gL15bYS1mMC05XXs0MH0kL2k7XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVHaXRIdWJSZXBvKGlucHV0OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCByYXcgPSBpbnB1dC50cmltKCk7XG4gIGlmICghcmF3KSB0aHJvdyBuZXcgRXJyb3IoXCJHaXRIdWIgcmVwbyBpcyByZXF1aXJlZFwiKTtcblxuICBjb25zdCBzc2ggPSAvXmdpdEBnaXRodWJcXC5jb206KFteL10rXFwvW14vXSs/KSg/OlxcLmdpdCk/JC9pLmV4ZWMocmF3KTtcbiAgaWYgKHNzaCkgcmV0dXJuIG5vcm1hbGl6ZVJlcG9QYXJ0KHNzaFsxXSk7XG5cbiAgaWYgKC9eaHR0cHM/OlxcL1xcLy9pLnRlc3QocmF3KSkge1xuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocmF3KTtcbiAgICBpZiAodXJsLmhvc3RuYW1lICE9PSBcImdpdGh1Yi5jb21cIikgdGhyb3cgbmV3IEVycm9yKFwiT25seSBnaXRodWIuY29tIHJlcG9zaXRvcmllcyBhcmUgc3VwcG9ydGVkXCIpO1xuICAgIGNvbnN0IHBhcnRzID0gdXJsLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8rfFxcLyskL2csIFwiXCIpLnNwbGl0KFwiL1wiKTtcbiAgICBpZiAocGFydHMubGVuZ3RoIDwgMikgdGhyb3cgbmV3IEVycm9yKFwiR2l0SHViIHJlcG8gVVJMIG11c3QgaW5jbHVkZSBvd25lciBhbmQgcmVwb3NpdG9yeVwiKTtcbiAgICByZXR1cm4gbm9ybWFsaXplUmVwb1BhcnQoYCR7cGFydHNbMF19LyR7cGFydHNbMV19YCk7XG4gIH1cblxuICByZXR1cm4gbm9ybWFsaXplUmVwb1BhcnQocmF3KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVN0b3JlUmVnaXN0cnkoaW5wdXQ6IHVua25vd24pOiBUd2Vha1N0b3JlUmVnaXN0cnkge1xuICBjb25zdCByZWdpc3RyeSA9IGlucHV0IGFzIFBhcnRpYWw8VHdlYWtTdG9yZVJlZ2lzdHJ5PiB8IG51bGw7XG4gIGlmICghcmVnaXN0cnkgfHwgcmVnaXN0cnkuc2NoZW1hVmVyc2lvbiAhPT0gMSB8fCAhQXJyYXkuaXNBcnJheShyZWdpc3RyeS5lbnRyaWVzKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIlVuc3VwcG9ydGVkIHR3ZWFrIHN0b3JlIHJlZ2lzdHJ5XCIpO1xuICB9XG4gIGNvbnN0IGVudHJpZXMgPSByZWdpc3RyeS5lbnRyaWVzLm1hcChub3JtYWxpemVTdG9yZUVudHJ5KTtcbiAgZW50cmllcy5zb3J0KChhLCBiKSA9PiBhLm1hbmlmZXN0Lm5hbWUubG9jYWxlQ29tcGFyZShiLm1hbmlmZXN0Lm5hbWUpKTtcbiAgcmV0dXJuIHtcbiAgICBzY2hlbWFWZXJzaW9uOiAxLFxuICAgIGdlbmVyYXRlZEF0OiB0eXBlb2YgcmVnaXN0cnkuZ2VuZXJhdGVkQXQgPT09IFwic3RyaW5nXCIgPyByZWdpc3RyeS5nZW5lcmF0ZWRBdCA6IHVuZGVmaW5lZCxcbiAgICBlbnRyaWVzLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2h1ZmZsZVN0b3JlRW50cmllczxUPihcbiAgZW50cmllczogcmVhZG9ubHkgVFtdLFxuICByYW5kb21JbmRleDogKGV4Y2x1c2l2ZU1heDogbnVtYmVyKSA9PiBudW1iZXIgPSAoZXhjbHVzaXZlTWF4KSA9PiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBleGNsdXNpdmVNYXgpLFxuKTogVFtdIHtcbiAgY29uc3Qgc2h1ZmZsZWQgPSBbLi4uZW50cmllc107XG4gIGZvciAobGV0IGkgPSBzaHVmZmxlZC5sZW5ndGggLSAxOyBpID4gMDsgaSAtPSAxKSB7XG4gICAgY29uc3QgaiA9IHJhbmRvbUluZGV4KGkgKyAxKTtcbiAgICBpZiAoIU51bWJlci5pc0ludGVnZXIoaikgfHwgaiA8IDAgfHwgaiA+IGkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgc2h1ZmZsZSByYW5kb21JbmRleCByZXR1cm5lZCAke2p9OyBleHBlY3RlZCBhbiBpbnRlZ2VyIGZyb20gMCB0byAke2l9YCk7XG4gICAgfVxuICAgIFtzaHVmZmxlZFtpXSwgc2h1ZmZsZWRbal1dID0gW3NodWZmbGVkW2pdLCBzaHVmZmxlZFtpXV07XG4gIH1cbiAgcmV0dXJuIHNodWZmbGVkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplU3RvcmVFbnRyeShpbnB1dDogdW5rbm93bik6IFR3ZWFrU3RvcmVFbnRyeSB7XG4gIGNvbnN0IGVudHJ5ID0gaW5wdXQgYXMgUGFydGlhbDxUd2Vha1N0b3JlRW50cnk+IHwgbnVsbDtcbiAgaWYgKCFlbnRyeSB8fCB0eXBlb2YgZW50cnkgIT09IFwib2JqZWN0XCIpIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgdHdlYWsgc3RvcmUgZW50cnlcIik7XG4gIGNvbnN0IHJlcG8gPSBub3JtYWxpemVHaXRIdWJSZXBvKFN0cmluZyhlbnRyeS5yZXBvID8/IGVudHJ5Lm1hbmlmZXN0Py5naXRodWJSZXBvID8/IFwiXCIpKTtcbiAgY29uc3QgbWFuaWZlc3QgPSBlbnRyeS5tYW5pZmVzdCBhcyBUd2Vha01hbmlmZXN0IHwgdW5kZWZpbmVkO1xuICBpZiAoIW1hbmlmZXN0Py5pZCB8fCAhbWFuaWZlc3QubmFtZSB8fCAhbWFuaWZlc3QudmVyc2lvbikge1xuICAgIHRocm93IG5ldyBFcnJvcihgU3RvcmUgZW50cnkgZm9yICR7cmVwb30gaXMgbWlzc2luZyBtYW5pZmVzdCBmaWVsZHNgKTtcbiAgfVxuICBpZiAobm9ybWFsaXplR2l0SHViUmVwbyhtYW5pZmVzdC5naXRodWJSZXBvKSAhPT0gcmVwbykge1xuICAgIHRocm93IG5ldyBFcnJvcihgU3RvcmUgZW50cnkgJHttYW5pZmVzdC5pZH0gcmVwbyBkb2VzIG5vdCBtYXRjaCBtYW5pZmVzdCBnaXRodWJSZXBvYCk7XG4gIH1cbiAgaWYgKCFpc0Z1bGxDb21taXRTaGEoU3RyaW5nKGVudHJ5LmFwcHJvdmVkQ29tbWl0U2hhID8/IFwiXCIpKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgU3RvcmUgZW50cnkgJHttYW5pZmVzdC5pZH0gbXVzdCBwaW4gYSBmdWxsIGFwcHJvdmVkIGNvbW1pdCBTSEFgKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIGlkOiBtYW5pZmVzdC5pZCxcbiAgICBtYW5pZmVzdCxcbiAgICByZXBvLFxuICAgIGFwcHJvdmVkQ29tbWl0U2hhOiBTdHJpbmcoZW50cnkuYXBwcm92ZWRDb21taXRTaGEpLFxuICAgIGFwcHJvdmVkQXQ6IHR5cGVvZiBlbnRyeS5hcHByb3ZlZEF0ID09PSBcInN0cmluZ1wiID8gZW50cnkuYXBwcm92ZWRBdCA6IFwiXCIsXG4gICAgYXBwcm92ZWRCeTogdHlwZW9mIGVudHJ5LmFwcHJvdmVkQnkgPT09IFwic3RyaW5nXCIgPyBlbnRyeS5hcHByb3ZlZEJ5IDogXCJcIixcbiAgICBwbGF0Zm9ybXM6IG5vcm1hbGl6ZVN0b3JlUGxhdGZvcm1zKChlbnRyeSBhcyB7IHBsYXRmb3Jtcz86IHVua25vd24gfSkucGxhdGZvcm1zKSxcbiAgICByZWxlYXNlVXJsOiBvcHRpb25hbEdpdGh1YlVybChlbnRyeS5yZWxlYXNlVXJsKSxcbiAgICByZXZpZXdVcmw6IG9wdGlvbmFsR2l0aHViVXJsKGVudHJ5LnJldmlld1VybCksXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdG9yZUFyY2hpdmVVcmwoZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSk6IHN0cmluZyB7XG4gIGlmICghaXNGdWxsQ29tbWl0U2hhKGVudHJ5LmFwcHJvdmVkQ29tbWl0U2hhKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgU3RvcmUgZW50cnkgJHtlbnRyeS5pZH0gaXMgbm90IHBpbm5lZCB0byBhIGZ1bGwgY29tbWl0IFNIQWApO1xuICB9XG4gIHJldHVybiBgaHR0cHM6Ly9jb2RlbG9hZC5naXRodWIuY29tLyR7ZW50cnkucmVwb30vdGFyLmd6LyR7ZW50cnkuYXBwcm92ZWRDb21taXRTaGF9YDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkVHdlYWtQdWJsaXNoSXNzdWVVcmwoc3VibWlzc2lvbjogVHdlYWtTdG9yZVB1Ymxpc2hTdWJtaXNzaW9uKTogc3RyaW5nIHtcbiAgY29uc3QgcmVwbyA9IG5vcm1hbGl6ZUdpdEh1YlJlcG8oc3VibWlzc2lvbi5yZXBvKTtcbiAgaWYgKCFpc0Z1bGxDb21taXRTaGEoc3VibWlzc2lvbi5jb21taXRTaGEpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiU3VibWlzc2lvbiBtdXN0IGluY2x1ZGUgdGhlIGZ1bGwgY29tbWl0IFNIQSB0byByZXZpZXdcIik7XG4gIH1cbiAgY29uc3QgdGl0bGUgPSBgVHdlYWsgc3RvcmUgcmV2aWV3OiAke3JlcG99YDtcbiAgY29uc3QgYm9keSA9IFtcbiAgICBcIiMjIFR3ZWFrIHJlcG9cIixcbiAgICBgaHR0cHM6Ly9naXRodWIuY29tLyR7cmVwb31gLFxuICAgIFwiXCIsXG4gICAgXCIjIyBDb21taXQgdG8gcmV2aWV3XCIsXG4gICAgc3VibWlzc2lvbi5jb21taXRTaGEsXG4gICAgc3VibWlzc2lvbi5jb21taXRVcmwsXG4gICAgXCJcIixcbiAgICBcIkRvIG5vdCBhcHByb3ZlIGEgZGlmZmVyZW50IGNvbW1pdC4gSWYgdGhlIGF1dGhvciBwdXNoZXMgY2hhbmdlcywgYXNrIHRoZW0gdG8gcmVzdWJtaXQuXCIsXG4gICAgXCJcIixcbiAgICBcIiMjIE1hbmlmZXN0XCIsXG4gICAgYC0gaWQ6ICR7c3VibWlzc2lvbi5tYW5pZmVzdD8uaWQgPz8gXCIobm90IGRldGVjdGVkKVwifWAsXG4gICAgYC0gbmFtZTogJHtzdWJtaXNzaW9uLm1hbmlmZXN0Py5uYW1lID8/IFwiKG5vdCBkZXRlY3RlZClcIn1gLFxuICAgIGAtIHZlcnNpb246ICR7c3VibWlzc2lvbi5tYW5pZmVzdD8udmVyc2lvbiA/PyBcIihub3QgZGV0ZWN0ZWQpXCJ9YCxcbiAgICBgLSBkZXNjcmlwdGlvbjogJHtzdWJtaXNzaW9uLm1hbmlmZXN0Py5kZXNjcmlwdGlvbiA/PyBcIihub3QgZGV0ZWN0ZWQpXCJ9YCxcbiAgICBgLSBpY29uVXJsOiAke3N1Ym1pc3Npb24ubWFuaWZlc3Q/Lmljb25VcmwgPz8gXCIobm90IGRldGVjdGVkKVwifWAsXG4gICAgXCJcIixcbiAgICBcIiMjIEFkbWluIGNoZWNrbGlzdFwiLFxuICAgIFwiLSBbIF0gbWFuaWZlc3QuanNvbiBpcyB2YWxpZFwiLFxuICAgIFwiLSBbIF0gbWFuaWZlc3QuaWNvblVybCBpcyB1c2FibGUgYXMgdGhlIHN0b3JlIGljb25cIixcbiAgICBcIi0gWyBdIHNvdXJjZSB3YXMgcmV2aWV3ZWQgYXQgdGhlIGV4YWN0IGNvbW1pdCBhYm92ZVwiLFxuICAgIFwiLSBbIF0gYHN0b3JlL2luZGV4Lmpzb25gIGVudHJ5IHBpbnMgYGFwcHJvdmVkQ29tbWl0U2hhYCB0byB0aGUgZXhhY3QgY29tbWl0IGFib3ZlXCIsXG4gIF0uam9pbihcIlxcblwiKTtcbiAgY29uc3QgdXJsID0gbmV3IFVSTChUV0VBS19TVE9SRV9SRVZJRVdfSVNTVUVfVVJMKTtcbiAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoXCJ0ZW1wbGF0ZVwiLCBcInR3ZWFrLXN0b3JlLXJldmlldy5tZFwiKTtcbiAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoXCJ0aXRsZVwiLCB0aXRsZSk7XG4gIHVybC5zZWFyY2hQYXJhbXMuc2V0KFwiYm9keVwiLCBib2R5KTtcbiAgcmV0dXJuIHVybC50b1N0cmluZygpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNGdWxsQ29tbWl0U2hhKHZhbHVlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIEZVTExfU0hBX1JFLnRlc3QodmFsdWUpO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVSZXBvUGFydCh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgcmVwbyA9IHZhbHVlLnRyaW0oKS5yZXBsYWNlKC9cXC5naXQkL2ksIFwiXCIpLnJlcGxhY2UoL15cXC8rfFxcLyskL2csIFwiXCIpO1xuICBpZiAoIUdJVEhVQl9SRVBPX1JFLnRlc3QocmVwbykpIHRocm93IG5ldyBFcnJvcihcIkdpdEh1YiByZXBvIG11c3QgYmUgaW4gb3duZXIvcmVwbyBmb3JtXCIpO1xuICByZXR1cm4gcmVwbztcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplU3RvcmVQbGF0Zm9ybXMoaW5wdXQ6IHVua25vd24pOiBUd2Vha1N0b3JlUGxhdGZvcm1bXSB8IHVuZGVmaW5lZCB7XG4gIGlmIChpbnB1dCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdW5kZWZpbmVkO1xuICBpZiAoIUFycmF5LmlzQXJyYXkoaW5wdXQpKSB0aHJvdyBuZXcgRXJyb3IoXCJTdG9yZSBlbnRyeSBwbGF0Zm9ybXMgbXVzdCBiZSBhbiBhcnJheVwiKTtcbiAgY29uc3QgYWxsb3dlZCA9IG5ldyBTZXQ8VHdlYWtTdG9yZVBsYXRmb3JtPihbXCJkYXJ3aW5cIiwgXCJ3aW4zMlwiLCBcImxpbnV4XCJdKTtcbiAgY29uc3QgcGxhdGZvcm1zID0gQXJyYXkuZnJvbShuZXcgU2V0KGlucHV0Lm1hcCgodmFsdWUpID0+IHtcbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiIHx8ICFhbGxvd2VkLmhhcyh2YWx1ZSBhcyBUd2Vha1N0b3JlUGxhdGZvcm0pKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIHN0b3JlIHBsYXRmb3JtOiAke1N0cmluZyh2YWx1ZSl9YCk7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZSBhcyBUd2Vha1N0b3JlUGxhdGZvcm07XG4gIH0pKSk7XG4gIHJldHVybiBwbGF0Zm9ybXMubGVuZ3RoID4gMCA/IHBsYXRmb3JtcyA6IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gb3B0aW9uYWxHaXRodWJVcmwodmFsdWU6IHVua25vd24pOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiIHx8ICF2YWx1ZS50cmltKCkpIHJldHVybiB1bmRlZmluZWQ7XG4gIGNvbnN0IHVybCA9IG5ldyBVUkwodmFsdWUpO1xuICBpZiAodXJsLnByb3RvY29sICE9PSBcImh0dHBzOlwiIHx8IHVybC5ob3N0bmFtZSAhPT0gXCJnaXRodWIuY29tXCIpIHJldHVybiB1bmRlZmluZWQ7XG4gIHJldHVybiB1cmwudG9TdHJpbmcoKTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFTQSxzQkFBaUc7QUFDakcsSUFBQUEsa0JBQXVIO0FBQ3ZILElBQUFDLDZCQUErQztBQUMvQyx5QkFBc0M7QUFDdEMsSUFBQUMsb0JBQTZEO0FBQzdELElBQUFDLGtCQUFnQzs7O0FDYmhDLElBQUFDLGFBQStCO0FBQy9CLElBQUFDLG1CQUE4QjtBQUM5QixvQkFBNkI7QUFDN0IsSUFBQUMsV0FBeUI7OztBQ0p6QixzQkFBK0M7QUFDL0MseUJBQXlCO0FBQ3pCLHVCQUF1RjtBQUNoRixJQUFNLGFBQWE7QUFBQSxFQUN0QixXQUFXO0FBQUEsRUFDWCxVQUFVO0FBQUEsRUFDVixlQUFlO0FBQUEsRUFDZixpQkFBaUI7QUFDckI7QUFDQSxJQUFNLGlCQUFpQjtBQUFBLEVBQ25CLE1BQU07QUFBQSxFQUNOLFlBQVksQ0FBQyxlQUFlO0FBQUEsRUFDNUIsaUJBQWlCLENBQUMsZUFBZTtB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O0FBQUEsRUFDMUU7QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQU07QUFBQSxFQUFPO0FBQUEsRUFBTTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQ3hEO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBUztBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDdkY7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFZO0FBQUEsRUFBTztBQUFBLEVBQ3JGO0FBQUEsRUFBUztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDdkI7QUFBQSxFQUFhO0FBQUEsRUFBYTtBQUFBLEVBQWE7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFDcEU7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU07QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQVc7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDMUU7QUFBQSxFQUFNO0FBQUEsRUFBTTtBQUFBLEVBQU87QUFBQSxFQUFXO0FBQUEsRUFBTTtBQUFBLEVBQ3BDO0FBQUEsRUFBUTtBQUFBLEVBQVE7QUFBQSxFQUFRO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUM1RDtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUNuRDtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU07QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQzFDO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDckY7QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQVM7QUFBQSxFQUN4QjtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFDdEM7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQVc7QUFBQSxFQUN6QjtBQUFBLEVBQUs7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDdEQ7QUFBQSxFQUFTO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQy9FO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUNmO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUNqRjtBQUFBLEVBQ0E7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFhO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQ3BGO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQVU7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUNuRjtBQUFBLEVBQU87QUFBQSxFQUFP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QSxJQUFDO0FBQUEsSUFDMUIsMkJBQTJCLE1BQU07QUFBQSxJQUFDO0FBQUEsRUFDcEM7QUFDRjtBQUVBLFNBQVMsWUFBWSxPQUFlLFFBQXdCO0FBQzFELFFBQU0sTUFBTSxJQUFJLElBQUksb0JBQW9CO0FBQ3hDLE1BQUksYUFBYSxJQUFJLFVBQVUsTUFBTTtBQUNyQyxNQUFJLFVBQVUsSUFBSyxLQUFJLGFBQWEsSUFBSSxnQkFBZ0IsS0FBSztBQUM3RCxTQUFPLElBQUksU0FBUztBQUN0QjtBQUVBLFNBQVMseUJBQXFEO0FBQzVELFFBQU0sV0FBWSxXQUFrRCx5QkFBeUI7QUFDN0YsU0FBTyxZQUFZLE9BQU8sYUFBYSxXQUFZLFdBQW1DO0FBQ3hGO0FBRUEsU0FBUyxvQkFBb0IsT0FBdUI7QUFDbEQsTUFBSSxPQUFPLFVBQVUsWUFBWSxDQUFDLE1BQU0sV0FBVyxHQUFHLEdBQUc7QUFDdkQsVUFBTSxJQUFJLE1BQU0sMkNBQTJDO0FBQUEsRUFDN0Q7QUFDQSxNQUFJLE1BQU0sU0FBUyxLQUFLLEtBQUssTUFBTSxTQUFTLElBQUksS0FBSyxNQUFNLFNBQVMsSUFBSSxHQUFHO0FBQ3pFLFVBQU0sSUFBSSxNQUFNLCtEQUErRDtBQUFBLEVBQ2pGO0FBQ0EsU0FBTztBQUNUOyIsCiAgIm5hbWVzIjogWyJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9jaGlsZF9wcm9jZXNzIiwgImltcG9ydF9ub2RlX3BhdGgiLCAiaW1wb3J0X25vZGVfb3MiLCAiaW1wb3J0X2ZzIiwgImltcG9ydF9wcm9taXNlcyIsICJzeXNQYXRoIiwgInByZXNvbHZlIiwgImJhc2VuYW1lIiwgInBqb2luIiwgInByZWxhdGl2ZSIsICJwc2VwIiwgImltcG9ydF9wcm9taXNlcyIsICJvc1R5cGUiLCAiZnNfd2F0Y2giLCAicmF3RW1pdHRlciIsICJsaXN0ZW5lciIsICJiYXNlbmFtZSIsICJkaXJuYW1lIiwgIm5ld1N0YXRzIiwgImNsb3NlciIsICJmc3JlYWxwYXRoIiwgInJlc29sdmUiLCAicmVhbHBhdGgiLCAic3RhdHMiLCAicmVsYXRpdmUiLCAiRE9VQkxFX1NMQVNIX1JFIiwgInRlc3RTdHJpbmciLCAicGF0aCIsICJzdGF0cyIsICJzdGF0Y2IiLCAibm93IiwgInN0YXQiLCAiaW1wb3J0X25vZGVfcGF0aCIsICJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9wYXRoIiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX3BhdGgiLCAiaW1wb3J0X25vZGVfZnMiLCAiaW1wb3J0X25vZGVfcGF0aCIsICJ1c2VyUm9vdCIsICJpbXBvcnRfbm9kZV9mcyIsICJleHBvcnRzIiwgInBsYXRmb3JtIiwgInN0YXQiXQp9Cg==
