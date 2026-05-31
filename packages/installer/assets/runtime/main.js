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
  const cli = sourceRoot ? (0, import_node_path6.join)(sourceRoot, "packages", "installer", "dist", "cli.js") : null;
  if (!cli || !(0, import_node_fs6.existsSync)(cli)) {
    throw new Error("Codex++ source CLI was not found. Run the installer once, then try again.");
  }
  await runInstalledCli(cli, ["update", "--watcher"]);
  return readSelfUpdateState();
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
function runInstalledCli(cli, args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = (0, import_node_child_process2.spawn)(process.execPath, [cli, ...args], {
      cwd: (0, import_node_path6.resolve)((0, import_node_path6.dirname)(cli), "..", "..", ".."),
      env: { ...process.env, CODEX_PLUSPLUS_MANUAL_UPDATE: "1" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    child.stdout?.on("data", (chunk) => {
      output += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      output += String(chunk);
    });
    child.on("error", rejectRun);
    child.on("close", (code) => {
      if (code === 0) {
        resolveRun();
        return;
      }
      const tail = output.trim().split(/\r?\n/).slice(-12).join("\n");
      rejectRun(new Error(tail || `codexplusplus ${args.join(" ")} failed with exit code ${code}`));
    });
  });
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL21haW4udHMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2Nob2tpZGFyL2VzbS9pbmRleC5qcyIsICIuLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVhZGRpcnAvZXNtL2luZGV4LmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9jaG9raWRhci9lc20vaGFuZGxlci5qcyIsICIuLi9zcmMvdHdlYWstZGlzY292ZXJ5LnRzIiwgIi4uL3NyYy9zdG9yYWdlLnRzIiwgIi4uL3NyYy9tY3Atc3luYy50cyIsICIuLi9zcmMvd2F0Y2hlci1oZWFsdGgudHMiLCAiLi4vc3JjL3R3ZWFrLWxpZmVjeWNsZS50cyIsICIuLi9zcmMvbG9nZ2luZy50cyIsICIuLi9zcmMvdHdlYWstc3RvcmUudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogTWFpbi1wcm9jZXNzIGJvb3RzdHJhcC4gTG9hZGVkIGJ5IHRoZSBhc2FyIGxvYWRlciBiZWZvcmUgQ29kZXgncyBvd25cbiAqIG1haW4gcHJvY2VzcyBjb2RlIHJ1bnMuIFdlIGhvb2sgYEJyb3dzZXJXaW5kb3dgIHNvIGV2ZXJ5IHdpbmRvdyBDb2RleFxuICogY3JlYXRlcyBnZXRzIG91ciBwcmVsb2FkIHNjcmlwdCBhdHRhY2hlZC4gV2UgYWxzbyBzdGFuZCB1cCBhbiBJUENcbiAqIGNoYW5uZWwgZm9yIHR3ZWFrcyB0byB0YWxrIHRvIHRoZSBtYWluIHByb2Nlc3MuXG4gKlxuICogV2UgYXJlIGluIENKUyBsYW5kIGhlcmUgKG1hdGNoZXMgRWxlY3Ryb24ncyBtYWluIHByb2Nlc3MgYW5kIENvZGV4J3Mgb3duXG4gKiBjb2RlKS4gVGhlIHJlbmRlcmVyLXNpZGUgcnVudGltZSBpcyBidW5kbGVkIHNlcGFyYXRlbHkgaW50byBwcmVsb2FkLmpzLlxuICovXG5pbXBvcnQgeyBhcHAsIEJyb3dzZXJWaWV3LCBCcm93c2VyV2luZG93LCBjbGlwYm9hcmQsIGlwY01haW4sIHNlc3Npb24sIHNoZWxsLCB3ZWJDb250ZW50cyB9IGZyb20gXCJlbGVjdHJvblwiO1xuaW1wb3J0IHsgY3BTeW5jLCBleGlzdHNTeW5jLCBta2RpclN5bmMsIG1rZHRlbXBTeW5jLCByZWFkZGlyU3luYywgcmVhZEZpbGVTeW5jLCBybVN5bmMsIHN0YXRTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGV4ZWNGaWxlU3luYywgc3Bhd24sIHNwYXduU3luYyB9IGZyb20gXCJub2RlOmNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCB7IGNyZWF0ZUhhc2gsIHJhbmRvbUludCB9IGZyb20gXCJub2RlOmNyeXB0b1wiO1xuaW1wb3J0IHsgZGlybmFtZSwgaXNBYnNvbHV0ZSwgam9pbiwgcmVsYXRpdmUsIHJlc29sdmUgfSBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgeyBob21lZGlyLCB0bXBkaXIgfSBmcm9tIFwibm9kZTpvc1wiO1xuaW1wb3J0IGNob2tpZGFyIGZyb20gXCJjaG9raWRhclwiO1xuaW1wb3J0IHsgZGlzY292ZXJUd2Vha3MsIHR5cGUgRGlzY292ZXJlZFR3ZWFrIH0gZnJvbSBcIi4vdHdlYWstZGlzY292ZXJ5XCI7XG5pbXBvcnQgeyBjcmVhdGVEaXNrU3RvcmFnZSwgdHlwZSBEaXNrU3RvcmFnZSB9IGZyb20gXCIuL3N0b3JhZ2VcIjtcbmltcG9ydCB7IHN5bmNNYW5hZ2VkTWNwU2VydmVycyB9IGZyb20gXCIuL21jcC1zeW5jXCI7XG5pbXBvcnQgeyBnZXRXYXRjaGVySGVhbHRoIH0gZnJvbSBcIi4vd2F0Y2hlci1oZWFsdGhcIjtcbmltcG9ydCB7XG4gIGlzTWFpblByb2Nlc3NUd2Vha1Njb3BlLFxuICByZWxvYWRUd2Vha3MsXG4gIHNldFR3ZWFrRW5hYmxlZEFuZFJlbG9hZCxcbn0gZnJvbSBcIi4vdHdlYWstbGlmZWN5Y2xlXCI7XG5pbXBvcnQgeyBhcHBlbmRDYXBwZWRMb2cgfSBmcm9tIFwiLi9sb2dnaW5nXCI7XG5pbXBvcnQgdHlwZSB7IFR3ZWFrTWFuaWZlc3QgfSBmcm9tIFwiQGNvZGV4LXBsdXNwbHVzL3Nka1wiO1xuaW1wb3J0IHtcbiAgREVGQVVMVF9UV0VBS19TVE9SRV9JTkRFWF9VUkwsXG4gIG5vcm1hbGl6ZUdpdEh1YlJlcG8sXG4gIG5vcm1hbGl6ZVN0b3JlUmVnaXN0cnksXG4gIHNodWZmbGVTdG9yZUVudHJpZXMsXG4gIHN0b3JlQXJjaGl2ZVVybCxcbiAgdHlwZSBUd2Vha1N0b3JlUHVibGlzaFN1Ym1pc3Npb24sXG4gIHR5cGUgVHdlYWtTdG9yZUVudHJ5LFxuICB0eXBlIFR3ZWFrU3RvcmVSZWdpc3RyeSxcbiAgdHlwZSBUd2Vha1N0b3JlUGxhdGZvcm0sXG59IGZyb20gXCIuL3R3ZWFrLXN0b3JlXCI7XG5cbmNvbnN0IHVzZXJSb290ID0gcHJvY2Vzcy5lbnYuQ09ERVhfUExVU1BMVVNfVVNFUl9ST09UO1xuY29uc3QgcnVudGltZURpciA9IHByb2Nlc3MuZW52LkNPREVYX1BMVVNQTFVTX1JVTlRJTUU7XG5cbmlmICghdXNlclJvb3QgfHwgIXJ1bnRpbWVEaXIpIHtcbiAgdGhyb3cgbmV3IEVycm9yKFxuICAgIFwiY29kZXgtcGx1c3BsdXMgcnVudGltZSBzdGFydGVkIHdpdGhvdXQgQ09ERVhfUExVU1BMVVNfVVNFUl9ST09UL1JVTlRJTUUgZW52c1wiLFxuICApO1xufVxuXG5jb25zdCBQUkVMT0FEX1BBVEggPSByZXNvbHZlKHJ1bnRpbWVEaXIsIFwicHJlbG9hZC5qc1wiKTtcbmNvbnN0IFRXRUFLU19ESVIgPSBqb2luKHVzZXJSb290LCBcInR3ZWFrc1wiKTtcbmNvbnN0IExPR19ESVIgPSBqb2luKHVzZXJSb290LCBcImxvZ1wiKTtcbmNvbnN0IExPR19GSUxFID0gam9pbihMT0dfRElSLCBcIm1haW4ubG9nXCIpO1xuY29uc3QgQ09ORklHX0ZJTEUgPSBqb2luKHVzZXJSb290LCBcImNvbmZpZy5qc29uXCIpO1xuY29uc3QgQ09ERVhfQ09ORklHX0ZJTEUgPSBqb2luKGhvbWVkaXIoKSwgXCIuY29kZXhcIiwgXCJjb25maWcudG9tbFwiKTtcbmNvbnN0IElOU1RBTExFUl9TVEFURV9GSUxFID0gam9pbih1c2VyUm9vdCwgXCJzdGF0ZS5qc29uXCIpO1xuY29uc3QgVVBEQVRFX01PREVfRklMRSA9IGpvaW4odXNlclJvb3QsIFwidXBkYXRlLW1vZGUuanNvblwiKTtcbmNvbnN0IFNFTEZfVVBEQVRFX1NUQVRFX0ZJTEUgPSBqb2luKHVzZXJSb290LCBcInNlbGYtdXBkYXRlLXN0YXRlLmpzb25cIik7XG5jb25zdCBTSUdORURfQ09ERVhfQkFDS1VQID0gam9pbih1c2VyUm9vdCwgXCJiYWNrdXBcIiwgXCJDb2RleC5hcHBcIik7XG5jb25zdCBDT0RFWF9QTFVTUExVU19WRVJTSU9OID0gXCIxLjAuMFwiO1xuY29uc3QgQ09ERVhfUExVU1BMVVNfUkVQTyA9IFwiYi1ubmV0dC9jb2RleC1wbHVzcGx1c1wiO1xuY29uc3QgVFdFQUtfU1RPUkVfSU5ERVhfVVJMID0gcHJvY2Vzcy5lbnYuQ09ERVhfUExVU1BMVVNfU1RPUkVfSU5ERVhfVVJMID8/IERFRkFVTFRfVFdFQUtfU1RPUkVfSU5ERVhfVVJMO1xuY29uc3QgQ09ERVhfV0lORE9XX1NFUlZJQ0VTX0tFWSA9IFwiX19jb2RleHBwX3dpbmRvd19zZXJ2aWNlc19fXCI7XG5cbm1rZGlyU3luYyhMT0dfRElSLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbm1rZGlyU3luYyhUV0VBS1NfRElSLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblxuLy8gT3B0aW9uYWw6IGVuYWJsZSBDaHJvbWUgRGV2VG9vbHMgUHJvdG9jb2wgb24gYSBUQ1AgcG9ydCBzbyB3ZSBjYW4gZHJpdmUgdGhlXG4vLyBydW5uaW5nIENvZGV4IGZyb20gb3V0c2lkZSAoY3VybCBodHRwOi8vbG9jYWxob3N0Ojxwb3J0Pi9qc29uLCBhdHRhY2ggdmlhXG4vLyBDRFAgV2ViU29ja2V0LCB0YWtlIHNjcmVlbnNob3RzLCBldmFsdWF0ZSBpbiByZW5kZXJlciwgZXRjLikuIENvZGV4J3Ncbi8vIHByb2R1Y3Rpb24gYnVpbGQgc2V0cyB3ZWJQcmVmZXJlbmNlcy5kZXZUb29scz1mYWxzZSwgd2hpY2gga2lsbHMgdGhlXG4vLyBpbi13aW5kb3cgRGV2VG9vbHMgc2hvcnRjdXQsIGJ1dCBgLS1yZW1vdGUtZGVidWdnaW5nLXBvcnRgIHdvcmtzIHJlZ2FyZGxlc3Ncbi8vIGJlY2F1c2UgaXQncyBhIENocm9taXVtIGNvbW1hbmQtbGluZSBzd2l0Y2ggcHJvY2Vzc2VkIGJlZm9yZSBhcHAgaW5pdC5cbi8vXG4vLyBPZmYgYnkgZGVmYXVsdC4gU2V0IENPREVYUFBfUkVNT1RFX0RFQlVHPTEgKG9wdGlvbmFsbHkgQ09ERVhQUF9SRU1PVEVfREVCVUdfUE9SVClcbi8vIHRvIHR1cm4gaXQgb24uIE11c3QgYmUgYXBwZW5kZWQgYmVmb3JlIGBhcHBgIGJlY29tZXMgcmVhZHk7IHdlJ3JlIGF0IG1vZHVsZVxuLy8gdG9wLWxldmVsIHNvIHRoYXQncyBmaW5lLlxuaWYgKHByb2Nlc3MuZW52LkNPREVYUFBfUkVNT1RFX0RFQlVHID09PSBcIjFcIikge1xuICBjb25zdCBwb3J0ID0gcHJvY2Vzcy5lbnYuQ09ERVhQUF9SRU1PVEVfREVCVUdfUE9SVCA/PyBcIjkyMjJcIjtcbiAgYXBwLmNvbW1hbmRMaW5lLmFwcGVuZFN3aXRjaChcInJlbW90ZS1kZWJ1Z2dpbmctcG9ydFwiLCBwb3J0KTtcbiAgbG9nKFwiaW5mb1wiLCBgcmVtb3RlIGRlYnVnZ2luZyBlbmFibGVkIG9uIHBvcnQgJHtwb3J0fWApO1xufVxuXG5pbnRlcmZhY2UgUGVyc2lzdGVkU3RhdGUge1xuICBjb2RleFBsdXNQbHVzPzoge1xuICAgIGF1dG9VcGRhdGU/OiBib29sZWFuO1xuICAgIHNhZmVNb2RlPzogYm9vbGVhbjtcbiAgICB1cGRhdGVDaGFubmVsPzogU2VsZlVwZGF0ZUNoYW5uZWw7XG4gICAgdXBkYXRlUmVwbz86IHN0cmluZztcbiAgICB1cGRhdGVSZWY/OiBzdHJpbmc7XG4gICAgdXBkYXRlQ2hlY2s/OiBDb2RleFBsdXNQbHVzVXBkYXRlQ2hlY2s7XG4gIH07XG4gIC8qKiBQZXItdHdlYWsgZW5hYmxlIGZsYWdzLiBNaXNzaW5nIGVudHJpZXMgZGVmYXVsdCB0byBlbmFibGVkLiAqL1xuICB0d2Vha3M/OiBSZWNvcmQ8c3RyaW5nLCB7IGVuYWJsZWQ/OiBib29sZWFuIH0+O1xuICAvKiogQ2FjaGVkIEdpdEh1YiByZWxlYXNlIGNoZWNrcy4gUnVudGltZSBuZXZlciBhdXRvLWluc3RhbGxzIHVwZGF0ZXMuICovXG4gIHR3ZWFrVXBkYXRlQ2hlY2tzPzogUmVjb3JkPHN0cmluZywgVHdlYWtVcGRhdGVDaGVjaz47XG59XG5cbmludGVyZmFjZSBDb2RleFBsdXNQbHVzVXBkYXRlQ2hlY2sge1xuICBjaGVja2VkQXQ6IHN0cmluZztcbiAgY3VycmVudFZlcnNpb246IHN0cmluZztcbiAgbGF0ZXN0VmVyc2lvbjogc3RyaW5nIHwgbnVsbDtcbiAgcmVsZWFzZVVybDogc3RyaW5nIHwgbnVsbDtcbiAgcmVsZWFzZU5vdGVzOiBzdHJpbmcgfCBudWxsO1xuICB1cGRhdGVBdmFpbGFibGU6IGJvb2xlYW47XG4gIGVycm9yPzogc3RyaW5nO1xufVxuXG50eXBlIFNlbGZVcGRhdGVDaGFubmVsID0gXCJzdGFibGVcIiB8IFwicHJlcmVsZWFzZVwiIHwgXCJjdXN0b21cIjtcbnR5cGUgU2VsZlVwZGF0ZVN0YXR1cyA9IFwiY2hlY2tpbmdcIiB8IFwidXAtdG8tZGF0ZVwiIHwgXCJ1cGRhdGVkXCIgfCBcImZhaWxlZFwiIHwgXCJkaXNhYmxlZFwiO1xuXG5pbnRlcmZhY2UgU2VsZlVwZGF0ZVN0YXRlIHtcbiAgY2hlY2tlZEF0OiBzdHJpbmc7XG4gIGNvbXBsZXRlZEF0Pzogc3RyaW5nO1xuICBzdGF0dXM6IFNlbGZVcGRhdGVTdGF0dXM7XG4gIGN1cnJlbnRWZXJzaW9uOiBzdHJpbmc7XG4gIGxhdGVzdFZlcnNpb246IHN0cmluZyB8IG51bGw7XG4gIHRhcmdldFJlZjogc3RyaW5nIHwgbnVsbDtcbiAgcmVsZWFzZVVybDogc3RyaW5nIHwgbnVsbDtcbiAgcmVwbzogc3RyaW5nO1xuICBjaGFubmVsOiBTZWxmVXBkYXRlQ2hhbm5lbDtcbiAgc291cmNlUm9vdDogc3RyaW5nO1xuICBpbnN0YWxsYXRpb25Tb3VyY2U/OiBJbnN0YWxsYXRpb25Tb3VyY2U7XG4gIGVycm9yPzogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgSW5zdGFsbGF0aW9uU291cmNlIHtcbiAga2luZDogXCJnaXRodWItc291cmNlXCIgfCBcImhvbWVicmV3XCIgfCBcImxvY2FsLWRldlwiIHwgXCJzb3VyY2UtYXJjaGl2ZVwiIHwgXCJ1bmtub3duXCI7XG4gIGxhYmVsOiBzdHJpbmc7XG4gIGRldGFpbDogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgVHdlYWtVcGRhdGVDaGVjayB7XG4gIGNoZWNrZWRBdDogc3RyaW5nO1xuICByZXBvOiBzdHJpbmc7XG4gIGN1cnJlbnRWZXJzaW9uOiBzdHJpbmc7XG4gIGxhdGVzdFZlcnNpb246IHN0cmluZyB8IG51bGw7XG4gIGxhdGVzdFRhZzogc3RyaW5nIHwgbnVsbDtcbiAgcmVsZWFzZVVybDogc3RyaW5nIHwgbnVsbDtcbiAgdXBkYXRlQXZhaWxhYmxlOiBib29sZWFuO1xuICBlcnJvcj86IHN0cmluZztcbn1cblxuZnVuY3Rpb24gcmVhZFN0YXRlKCk6IFBlcnNpc3RlZFN0YXRlIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMoQ09ORklHX0ZJTEUsIFwidXRmOFwiKSkgYXMgUGVyc2lzdGVkU3RhdGU7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB7fTtcbiAgfVxufVxuZnVuY3Rpb24gd3JpdGVTdGF0ZShzOiBQZXJzaXN0ZWRTdGF0ZSk6IHZvaWQge1xuICB0cnkge1xuICAgIHdyaXRlRmlsZVN5bmMoQ09ORklHX0ZJTEUsIEpTT04uc3RyaW5naWZ5KHMsIG51bGwsIDIpKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZyhcIndhcm5cIiwgXCJ3cml0ZVN0YXRlIGZhaWxlZDpcIiwgU3RyaW5nKChlIGFzIEVycm9yKS5tZXNzYWdlKSk7XG4gIH1cbn1cbmZ1bmN0aW9uIGlzQ29kZXhQbHVzUGx1c0F1dG9VcGRhdGVFbmFibGVkKCk6IGJvb2xlYW4ge1xuICByZXR1cm4gcmVhZFN0YXRlKCkuY29kZXhQbHVzUGx1cz8uYXV0b1VwZGF0ZSAhPT0gZmFsc2U7XG59XG5mdW5jdGlvbiBzZXRDb2RleFBsdXNQbHVzQXV0b1VwZGF0ZShlbmFibGVkOiBib29sZWFuKTogdm9pZCB7XG4gIGNvbnN0IHMgPSByZWFkU3RhdGUoKTtcbiAgcy5jb2RleFBsdXNQbHVzID8/PSB7fTtcbiAgcy5jb2RleFBsdXNQbHVzLmF1dG9VcGRhdGUgPSBlbmFibGVkO1xuICB3cml0ZVN0YXRlKHMpO1xufVxuZnVuY3Rpb24gc2V0Q29kZXhQbHVzUGx1c1VwZGF0ZUNvbmZpZyhjb25maWc6IHtcbiAgdXBkYXRlQ2hhbm5lbD86IFNlbGZVcGRhdGVDaGFubmVsO1xuICB1cGRhdGVSZXBvPzogc3RyaW5nO1xuICB1cGRhdGVSZWY/OiBzdHJpbmc7XG59KTogdm9pZCB7XG4gIGNvbnN0IHMgPSByZWFkU3RhdGUoKTtcbiAgcy5jb2RleFBsdXNQbHVzID8/PSB7fTtcbiAgaWYgKGNvbmZpZy51cGRhdGVDaGFubmVsKSBzLmNvZGV4UGx1c1BsdXMudXBkYXRlQ2hhbm5lbCA9IGNvbmZpZy51cGRhdGVDaGFubmVsO1xuICBpZiAoXCJ1cGRhdGVSZXBvXCIgaW4gY29uZmlnKSBzLmNvZGV4UGx1c1BsdXMudXBkYXRlUmVwbyA9IGNsZWFuT3B0aW9uYWxTdHJpbmcoY29uZmlnLnVwZGF0ZVJlcG8pO1xuICBpZiAoXCJ1cGRhdGVSZWZcIiBpbiBjb25maWcpIHMuY29kZXhQbHVzUGx1cy51cGRhdGVSZWYgPSBjbGVhbk9wdGlvbmFsU3RyaW5nKGNvbmZpZy51cGRhdGVSZWYpO1xuICB3cml0ZVN0YXRlKHMpO1xufVxuZnVuY3Rpb24gaXNDb2RleFBsdXNQbHVzU2FmZU1vZGVFbmFibGVkKCk6IGJvb2xlYW4ge1xuICByZXR1cm4gcmVhZFN0YXRlKCkuY29kZXhQbHVzUGx1cz8uc2FmZU1vZGUgPT09IHRydWU7XG59XG5mdW5jdGlvbiBpc1R3ZWFrRW5hYmxlZChpZDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IHMgPSByZWFkU3RhdGUoKTtcbiAgaWYgKHMuY29kZXhQbHVzUGx1cz8uc2FmZU1vZGUgPT09IHRydWUpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIHMudHdlYWtzPy5baWRdPy5lbmFibGVkICE9PSBmYWxzZTtcbn1cbmZ1bmN0aW9uIHNldFR3ZWFrRW5hYmxlZChpZDogc3RyaW5nLCBlbmFibGVkOiBib29sZWFuKTogdm9pZCB7XG4gIGNvbnN0IHMgPSByZWFkU3RhdGUoKTtcbiAgcy50d2Vha3MgPz89IHt9O1xuICBzLnR3ZWFrc1tpZF0gPSB7IC4uLnMudHdlYWtzW2lkXSwgZW5hYmxlZCB9O1xuICB3cml0ZVN0YXRlKHMpO1xufVxuXG5pbnRlcmZhY2UgSW5zdGFsbGVyU3RhdGUge1xuICBhcHBSb290OiBzdHJpbmc7XG4gIGNvZGV4VmVyc2lvbjogc3RyaW5nIHwgbnVsbDtcbiAgc291cmNlUm9vdD86IHN0cmluZztcbn1cblxuZnVuY3Rpb24gcmVhZEluc3RhbGxlclN0YXRlKCk6IEluc3RhbGxlclN0YXRlIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKElOU1RBTExFUl9TVEFURV9GSUxFLCBcInV0ZjhcIikpIGFzIEluc3RhbGxlclN0YXRlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiByZWFkU2VsZlVwZGF0ZVN0YXRlKCk6IFNlbGZVcGRhdGVTdGF0ZSB8IG51bGwge1xuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhTRUxGX1VQREFURV9TVEFURV9GSUxFLCBcInV0ZjhcIikpIGFzIFNlbGZVcGRhdGVTdGF0ZTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gY2xlYW5PcHRpb25hbFN0cmluZyh2YWx1ZTogdW5rbm93bik6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09IFwic3RyaW5nXCIpIHJldHVybiB1bmRlZmluZWQ7XG4gIGNvbnN0IHRyaW1tZWQgPSB2YWx1ZS50cmltKCk7XG4gIHJldHVybiB0cmltbWVkID8gdHJpbW1lZCA6IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gaXNQYXRoSW5zaWRlKHBhcmVudDogc3RyaW5nLCB0YXJnZXQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBjb25zdCByZWwgPSByZWxhdGl2ZShyZXNvbHZlKHBhcmVudCksIHJlc29sdmUodGFyZ2V0KSk7XG4gIHJldHVybiByZWwgPT09IFwiXCIgfHwgKCEhcmVsICYmICFyZWwuc3RhcnRzV2l0aChcIi4uXCIpICYmICFpc0Fic29sdXRlKHJlbCkpO1xufVxuXG5mdW5jdGlvbiBsb2cobGV2ZWw6IFwiaW5mb1wiIHwgXCJ3YXJuXCIgfCBcImVycm9yXCIsIC4uLmFyZ3M6IHVua25vd25bXSk6IHZvaWQge1xuICBjb25zdCBsaW5lID0gYFske25ldyBEYXRlKCkudG9JU09TdHJpbmcoKX1dIFske2xldmVsfV0gJHthcmdzXG4gICAgLm1hcCgoYSkgPT4gKHR5cGVvZiBhID09PSBcInN0cmluZ1wiID8gYSA6IEpTT04uc3RyaW5naWZ5KGEpKSlcbiAgICAuam9pbihcIiBcIil9XFxuYDtcbiAgdHJ5IHtcbiAgICBhcHBlbmRDYXBwZWRMb2coTE9HX0ZJTEUsIGxpbmUpO1xuICB9IGNhdGNoIHt9XG4gIGlmIChsZXZlbCA9PT0gXCJlcnJvclwiKSBjb25zb2xlLmVycm9yKFwiW2NvZGV4LXBsdXNwbHVzXVwiLCAuLi5hcmdzKTtcbn1cblxuZnVuY3Rpb24gaW5zdGFsbFNwYXJrbGVVcGRhdGVIb29rKCk6IHZvaWQge1xuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSAhPT0gXCJkYXJ3aW5cIikgcmV0dXJuO1xuXG4gIGNvbnN0IE1vZHVsZSA9IHJlcXVpcmUoXCJub2RlOm1vZHVsZVwiKSBhcyB0eXBlb2YgaW1wb3J0KFwibm9kZTptb2R1bGVcIikgJiB7XG4gICAgX2xvYWQ/OiAocmVxdWVzdDogc3RyaW5nLCBwYXJlbnQ6IHVua25vd24sIGlzTWFpbjogYm9vbGVhbikgPT4gdW5rbm93bjtcbiAgfTtcbiAgY29uc3Qgb3JpZ2luYWxMb2FkID0gTW9kdWxlLl9sb2FkO1xuICBpZiAodHlwZW9mIG9yaWdpbmFsTG9hZCAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm47XG5cbiAgTW9kdWxlLl9sb2FkID0gZnVuY3Rpb24gY29kZXhQbHVzUGx1c01vZHVsZUxvYWQocmVxdWVzdDogc3RyaW5nLCBwYXJlbnQ6IHVua25vd24sIGlzTWFpbjogYm9vbGVhbikge1xuICAgIGNvbnN0IGxvYWRlZCA9IG9yaWdpbmFsTG9hZC5hcHBseSh0aGlzLCBbcmVxdWVzdCwgcGFyZW50LCBpc01haW5dKSBhcyB1bmtub3duO1xuICAgIGlmICh0eXBlb2YgcmVxdWVzdCA9PT0gXCJzdHJpbmdcIiAmJiAvc3BhcmtsZSg/OlxcLm5vZGUpPyQvaS50ZXN0KHJlcXVlc3QpKSB7XG4gICAgICB3cmFwU3BhcmtsZUV4cG9ydHMobG9hZGVkKTtcbiAgICB9XG4gICAgcmV0dXJuIGxvYWRlZDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gd3JhcFNwYXJrbGVFeHBvcnRzKGxvYWRlZDogdW5rbm93bik6IHZvaWQge1xuICBpZiAoIWxvYWRlZCB8fCB0eXBlb2YgbG9hZGVkICE9PSBcIm9iamVjdFwiKSByZXR1cm47XG4gIGNvbnN0IGV4cG9ydHMgPSBsb2FkZWQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gJiB7IF9fY29kZXhwcFNwYXJrbGVXcmFwcGVkPzogYm9vbGVhbiB9O1xuICBpZiAoZXhwb3J0cy5fX2NvZGV4cHBTcGFya2xlV3JhcHBlZCkgcmV0dXJuO1xuICBleHBvcnRzLl9fY29kZXhwcFNwYXJrbGVXcmFwcGVkID0gdHJ1ZTtcblxuICBmb3IgKGNvbnN0IG5hbWUgb2YgW1wiaW5zdGFsbFVwZGF0ZXNJZkF2YWlsYWJsZVwiXSkge1xuICAgIGNvbnN0IGZuID0gZXhwb3J0c1tuYW1lXTtcbiAgICBpZiAodHlwZW9mIGZuICE9PSBcImZ1bmN0aW9uXCIpIGNvbnRpbnVlO1xuICAgIGV4cG9ydHNbbmFtZV0gPSBmdW5jdGlvbiBjb2RleFBsdXNQbHVzU3BhcmtsZVdyYXBwZXIodGhpczogdW5rbm93biwgLi4uYXJnczogdW5rbm93bltdKSB7XG4gICAgICBwcmVwYXJlU2lnbmVkQ29kZXhGb3JTcGFya2xlSW5zdGFsbCgpO1xuICAgICAgcmV0dXJuIFJlZmxlY3QuYXBwbHkoZm4sIHRoaXMsIGFyZ3MpO1xuICAgIH07XG4gIH1cblxuICBpZiAoZXhwb3J0cy5kZWZhdWx0ICYmIGV4cG9ydHMuZGVmYXVsdCAhPT0gZXhwb3J0cykge1xuICAgIHdyYXBTcGFya2xlRXhwb3J0cyhleHBvcnRzLmRlZmF1bHQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHByZXBhcmVTaWduZWRDb2RleEZvclNwYXJrbGVJbnN0YWxsKCk6IHZvaWQge1xuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSAhPT0gXCJkYXJ3aW5cIikgcmV0dXJuO1xuICBpZiAoZXhpc3RzU3luYyhVUERBVEVfTU9ERV9GSUxFKSkge1xuICAgIGxvZyhcImluZm9cIiwgXCJTcGFya2xlIHVwZGF0ZSBwcmVwIHNraXBwZWQ7IHVwZGF0ZSBtb2RlIGFscmVhZHkgYWN0aXZlXCIpO1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoIWV4aXN0c1N5bmMoU0lHTkVEX0NPREVYX0JBQ0tVUCkpIHtcbiAgICBsb2coXCJ3YXJuXCIsIFwiU3BhcmtsZSB1cGRhdGUgcHJlcCBza2lwcGVkOyBzaWduZWQgQ29kZXguYXBwIGJhY2t1cCBpcyBtaXNzaW5nXCIpO1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoIWlzRGV2ZWxvcGVySWRTaWduZWRBcHAoU0lHTkVEX0NPREVYX0JBQ0tVUCkpIHtcbiAgICBsb2coXCJ3YXJuXCIsIFwiU3BhcmtsZSB1cGRhdGUgcHJlcCBza2lwcGVkOyBDb2RleC5hcHAgYmFja3VwIGlzIG5vdCBEZXZlbG9wZXIgSUQgc2lnbmVkXCIpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHN0YXRlID0gcmVhZEluc3RhbGxlclN0YXRlKCk7XG4gIGNvbnN0IGFwcFJvb3QgPSBzdGF0ZT8uYXBwUm9vdCA/PyBpbmZlck1hY0FwcFJvb3QoKTtcbiAgaWYgKCFhcHBSb290KSB7XG4gICAgbG9nKFwid2FyblwiLCBcIlNwYXJrbGUgdXBkYXRlIHByZXAgc2tpcHBlZDsgY291bGQgbm90IGluZmVyIENvZGV4LmFwcCBwYXRoXCIpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IG1vZGUgPSB7XG4gICAgZW5hYmxlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgYXBwUm9vdCxcbiAgICBjb2RleFZlcnNpb246IHN0YXRlPy5jb2RleFZlcnNpb24gPz8gbnVsbCxcbiAgfTtcbiAgd3JpdGVGaWxlU3luYyhVUERBVEVfTU9ERV9GSUxFLCBKU09OLnN0cmluZ2lmeShtb2RlLCBudWxsLCAyKSk7XG5cbiAgdHJ5IHtcbiAgICBleGVjRmlsZVN5bmMoXCJkaXR0b1wiLCBbU0lHTkVEX0NPREVYX0JBQ0tVUCwgYXBwUm9vdF0sIHsgc3RkaW86IFwiaWdub3JlXCIgfSk7XG4gICAgdHJ5IHtcbiAgICAgIGV4ZWNGaWxlU3luYyhcInhhdHRyXCIsIFtcIi1kclwiLCBcImNvbS5hcHBsZS5xdWFyYW50aW5lXCIsIGFwcFJvb3RdLCB7IHN0ZGlvOiBcImlnbm9yZVwiIH0pO1xuICAgIH0gY2F0Y2gge31cbiAgICBsb2coXCJpbmZvXCIsIFwiUmVzdG9yZWQgc2lnbmVkIENvZGV4LmFwcCBiZWZvcmUgU3BhcmtsZSBpbnN0YWxsXCIsIHsgYXBwUm9vdCB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZyhcImVycm9yXCIsIFwiRmFpbGVkIHRvIHJlc3RvcmUgc2lnbmVkIENvZGV4LmFwcCBiZWZvcmUgU3BhcmtsZSBpbnN0YWxsXCIsIHtcbiAgICAgIG1lc3NhZ2U6IChlIGFzIEVycm9yKS5tZXNzYWdlLFxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzRGV2ZWxvcGVySWRTaWduZWRBcHAoYXBwUm9vdDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IHJlc3VsdCA9IHNwYXduU3luYyhcImNvZGVzaWduXCIsIFtcIi1kdlwiLCBcIi0tdmVyYm9zZT00XCIsIGFwcFJvb3RdLCB7XG4gICAgZW5jb2Rpbmc6IFwidXRmOFwiLFxuICAgIHN0ZGlvOiBbXCJpZ25vcmVcIiwgXCJwaXBlXCIsIFwicGlwZVwiXSxcbiAgfSk7XG4gIGNvbnN0IG91dHB1dCA9IGAke3Jlc3VsdC5zdGRvdXQgPz8gXCJcIn0ke3Jlc3VsdC5zdGRlcnIgPz8gXCJcIn1gO1xuICByZXR1cm4gKFxuICAgIHJlc3VsdC5zdGF0dXMgPT09IDAgJiZcbiAgICAvQXV0aG9yaXR5PURldmVsb3BlciBJRCBBcHBsaWNhdGlvbjovLnRlc3Qob3V0cHV0KSAmJlxuICAgICEvU2lnbmF0dXJlPWFkaG9jLy50ZXN0KG91dHB1dCkgJiZcbiAgICAhL1RlYW1JZGVudGlmaWVyPW5vdCBzZXQvLnRlc3Qob3V0cHV0KVxuICApO1xufVxuXG5mdW5jdGlvbiBpbmZlck1hY0FwcFJvb3QoKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IG1hcmtlciA9IFwiLmFwcC9Db250ZW50cy9NYWNPUy9cIjtcbiAgY29uc3QgaWR4ID0gcHJvY2Vzcy5leGVjUGF0aC5pbmRleE9mKG1hcmtlcik7XG4gIHJldHVybiBpZHggPj0gMCA/IHByb2Nlc3MuZXhlY1BhdGguc2xpY2UoMCwgaWR4ICsgXCIuYXBwXCIubGVuZ3RoKSA6IG51bGw7XG59XG5cbi8vIFN1cmZhY2UgdW5oYW5kbGVkIGVycm9ycyBmcm9tIGFueXdoZXJlIGluIHRoZSBtYWluIHByb2Nlc3MgdG8gb3VyIGxvZy5cbnByb2Nlc3Mub24oXCJ1bmNhdWdodEV4Y2VwdGlvblwiLCAoZTogRXJyb3IgJiB7IGNvZGU/OiBzdHJpbmcgfSkgPT4ge1xuICBsb2coXCJlcnJvclwiLCBcInVuY2F1Z2h0RXhjZXB0aW9uXCIsIHsgY29kZTogZS5jb2RlLCBtZXNzYWdlOiBlLm1lc3NhZ2UsIHN0YWNrOiBlLnN0YWNrIH0pO1xufSk7XG5wcm9jZXNzLm9uKFwidW5oYW5kbGVkUmVqZWN0aW9uXCIsIChlKSA9PiB7XG4gIGxvZyhcImVycm9yXCIsIFwidW5oYW5kbGVkUmVqZWN0aW9uXCIsIHsgdmFsdWU6IFN0cmluZyhlKSB9KTtcbn0pO1xuXG5pbnN0YWxsU3BhcmtsZVVwZGF0ZUhvb2soKTtcblxuaW50ZXJmYWNlIExvYWRlZE1haW5Ud2VhayB7XG4gIHN0b3A/OiAoKSA9PiB2b2lkO1xuICBzdG9yYWdlOiBEaXNrU3RvcmFnZTtcbn1cblxuaW50ZXJmYWNlIENvZGV4V2luZG93U2VydmljZXMge1xuICBjcmVhdGVGcmVzaExvY2FsV2luZG93PzogKHJvdXRlPzogc3RyaW5nKSA9PiBQcm9taXNlPEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsPjtcbiAgZW5zdXJlSG9zdFdpbmRvdz86IChob3N0SWQ/OiBzdHJpbmcpID0+IFByb21pc2U8RWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGw+O1xuICBnZXRQcmltYXJ5V2luZG93PzogKGhvc3RJZD86IHN0cmluZykgPT4gRWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGw7XG4gIGdldENvbnRleHQ/OiAoaG9zdElkOiBzdHJpbmcpID0+IHsgcmVnaXN0ZXJXaW5kb3c/OiAod2luZG93TGlrZTogQ29kZXhXaW5kb3dMaWtlKSA9PiB2b2lkIH0gfCBudWxsO1xuICB3aW5kb3dNYW5hZ2VyPzoge1xuICAgIGNyZWF0ZVdpbmRvdz86IChvcHRzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikgPT4gUHJvbWlzZTxFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbD47XG4gICAgcmVnaXN0ZXJXaW5kb3c/OiAoXG4gICAgICB3aW5kb3dMaWtlOiBDb2RleFdpbmRvd0xpa2UsXG4gICAgICBob3N0SWQ6IHN0cmluZyxcbiAgICAgIHByaW1hcnk6IGJvb2xlYW4sXG4gICAgICBhcHBlYXJhbmNlOiBzdHJpbmcsXG4gICAgKSA9PiB2b2lkO1xuICAgIG9wdGlvbnM/OiB7XG4gICAgICBhbGxvd0RldnRvb2xzPzogYm9vbGVhbjtcbiAgICAgIHByZWxvYWRQYXRoPzogc3RyaW5nO1xuICAgIH07XG4gIH07XG59XG5cbmludGVyZmFjZSBDb2RleFdpbmRvd0xpa2Uge1xuICBpZDogbnVtYmVyO1xuICB3ZWJDb250ZW50czogRWxlY3Ryb24uV2ViQ29udGVudHM7XG4gIG9uKGV2ZW50OiBcImNsb3NlZFwiLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHVua25vd247XG4gIG9uY2U/KGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKTogdW5rbm93bjtcbiAgb2ZmPyhldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCk6IHVua25vd247XG4gIHJlbW92ZUxpc3RlbmVyPyhldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCk6IHVua25vd247XG4gIGlzRGVzdHJveWVkPygpOiBib29sZWFuO1xuICBpc0ZvY3VzZWQ/KCk6IGJvb2xlYW47XG4gIGZvY3VzPygpOiB2b2lkO1xuICBzaG93PygpOiB2b2lkO1xuICBoaWRlPygpOiB2b2lkO1xuICBnZXRCb3VuZHM/KCk6IEVsZWN0cm9uLlJlY3RhbmdsZTtcbiAgZ2V0Q29udGVudEJvdW5kcz8oKTogRWxlY3Ryb24uUmVjdGFuZ2xlO1xuICBnZXRTaXplPygpOiBbbnVtYmVyLCBudW1iZXJdO1xuICBnZXRDb250ZW50U2l6ZT8oKTogW251bWJlciwgbnVtYmVyXTtcbiAgc2V0VGl0bGU/KHRpdGxlOiBzdHJpbmcpOiB2b2lkO1xuICBnZXRUaXRsZT8oKTogc3RyaW5nO1xuICBzZXRSZXByZXNlbnRlZEZpbGVuYW1lPyhmaWxlbmFtZTogc3RyaW5nKTogdm9pZDtcbiAgc2V0RG9jdW1lbnRFZGl0ZWQ/KGVkaXRlZDogYm9vbGVhbik6IHZvaWQ7XG4gIHNldFdpbmRvd0J1dHRvblZpc2liaWxpdHk/KHZpc2libGU6IGJvb2xlYW4pOiB2b2lkO1xufVxuXG5pbnRlcmZhY2UgQ29kZXhDcmVhdGVXaW5kb3dPcHRpb25zIHtcbiAgcm91dGU6IHN0cmluZztcbiAgaG9zdElkPzogc3RyaW5nO1xuICBzaG93PzogYm9vbGVhbjtcbiAgYXBwZWFyYW5jZT86IHN0cmluZztcbiAgcGFyZW50V2luZG93SWQ/OiBudW1iZXI7XG4gIGJvdW5kcz86IEVsZWN0cm9uLlJlY3RhbmdsZTtcbn1cblxuaW50ZXJmYWNlIENvZGV4Q3JlYXRlVmlld09wdGlvbnMge1xuICByb3V0ZTogc3RyaW5nO1xuICBob3N0SWQ/OiBzdHJpbmc7XG4gIGFwcGVhcmFuY2U/OiBzdHJpbmc7XG59XG5cbmNvbnN0IHR3ZWFrU3RhdGUgPSB7XG4gIGRpc2NvdmVyZWQ6IFtdIGFzIERpc2NvdmVyZWRUd2Vha1tdLFxuICBsb2FkZWRNYWluOiBuZXcgTWFwPHN0cmluZywgTG9hZGVkTWFpblR3ZWFrPigpLFxufTtcblxuY29uc3QgdHdlYWtMaWZlY3ljbGVEZXBzID0ge1xuICBsb2dJbmZvOiAobWVzc2FnZTogc3RyaW5nKSA9PiBsb2coXCJpbmZvXCIsIG1lc3NhZ2UpLFxuICBzZXRUd2Vha0VuYWJsZWQsXG4gIHN0b3BBbGxNYWluVHdlYWtzLFxuICBjbGVhclR3ZWFrTW9kdWxlQ2FjaGUsXG4gIGxvYWRBbGxNYWluVHdlYWtzLFxuICBicm9hZGNhc3RSZWxvYWQsXG59O1xuXG4vLyAxLiBIb29rIGV2ZXJ5IHNlc3Npb24gc28gb3VyIHByZWxvYWQgcnVucyBpbiBldmVyeSByZW5kZXJlci5cbi8vXG4vLyBXZSB1c2UgRWxlY3Ryb24ncyBtb2Rlcm4gYHNlc3Npb24ucmVnaXN0ZXJQcmVsb2FkU2NyaXB0YCBBUEkgKGFkZGVkIGluXG4vLyBFbGVjdHJvbiAzNSkuIFRoZSBkZXByZWNhdGVkIGBzZXRQcmVsb2Fkc2AgcGF0aCBzaWxlbnRseSBuby1vcHMgaW4gc29tZVxuLy8gY29uZmlndXJhdGlvbnMgKG5vdGFibHkgd2l0aCBzYW5kYm94ZWQgcmVuZGVyZXJzKSwgc28gcmVnaXN0ZXJQcmVsb2FkU2NyaXB0XG4vLyBpcyB0aGUgb25seSByZWxpYWJsZSB3YXkgdG8gaW5qZWN0IGludG8gQ29kZXgncyBCcm93c2VyV2luZG93cy5cbmZ1bmN0aW9uIHJlZ2lzdGVyUHJlbG9hZChzOiBFbGVjdHJvbi5TZXNzaW9uLCBsYWJlbDogc3RyaW5nKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVnID0gKHMgYXMgdW5rbm93biBhcyB7XG4gICAgICByZWdpc3RlclByZWxvYWRTY3JpcHQ/OiAob3B0czoge1xuICAgICAgICB0eXBlPzogXCJmcmFtZVwiIHwgXCJzZXJ2aWNlLXdvcmtlclwiO1xuICAgICAgICBpZD86IHN0cmluZztcbiAgICAgICAgZmlsZVBhdGg6IHN0cmluZztcbiAgICAgIH0pID0+IHN0cmluZztcbiAgICB9KS5yZWdpc3RlclByZWxvYWRTY3JpcHQ7XG4gICAgaWYgKHR5cGVvZiByZWcgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgcmVnLmNhbGwocywgeyB0eXBlOiBcImZyYW1lXCIsIGZpbGVQYXRoOiBQUkVMT0FEX1BBVEgsIGlkOiBcImNvZGV4LXBsdXNwbHVzXCIgfSk7XG4gICAgICBsb2coXCJpbmZvXCIsIGBwcmVsb2FkIHJlZ2lzdGVyZWQgKHJlZ2lzdGVyUHJlbG9hZFNjcmlwdCkgb24gJHtsYWJlbH06YCwgUFJFTE9BRF9QQVRIKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gRmFsbGJhY2sgZm9yIG9sZGVyIEVsZWN0cm9uIHZlcnNpb25zLlxuICAgIGNvbnN0IGV4aXN0aW5nID0gcy5nZXRQcmVsb2FkcygpO1xuICAgIGlmICghZXhpc3RpbmcuaW5jbHVkZXMoUFJFTE9BRF9QQVRIKSkge1xuICAgICAgcy5zZXRQcmVsb2FkcyhbLi4uZXhpc3RpbmcsIFBSRUxPQURfUEFUSF0pO1xuICAgIH1cbiAgICBsb2coXCJpbmZvXCIsIGBwcmVsb2FkIHJlZ2lzdGVyZWQgKHNldFByZWxvYWRzKSBvbiAke2xhYmVsfTpgLCBQUkVMT0FEX1BBVEgpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKGUgaW5zdGFuY2VvZiBFcnJvciAmJiBlLm1lc3NhZ2UuaW5jbHVkZXMoXCJleGlzdGluZyBJRFwiKSkge1xuICAgICAgbG9nKFwiaW5mb1wiLCBgcHJlbG9hZCBhbHJlYWR5IHJlZ2lzdGVyZWQgb24gJHtsYWJlbH06YCwgUFJFTE9BRF9QQVRIKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbG9nKFwiZXJyb3JcIiwgYHByZWxvYWQgcmVnaXN0cmF0aW9uIG9uICR7bGFiZWx9IGZhaWxlZDpgLCBlKTtcbiAgfVxufVxuXG5hcHAud2hlblJlYWR5KCkudGhlbigoKSA9PiB7XG4gIGxvZyhcImluZm9cIiwgXCJhcHAgcmVhZHkgZmlyZWRcIik7XG4gIGlmIChpc0NvZGV4UGx1c1BsdXNTYWZlTW9kZUVuYWJsZWQoKSkge1xuICAgIGxvZyhcIndhcm5cIiwgXCJzYWZlIG1vZGUgaXMgZW5hYmxlZDsgcHJlbG9hZCB3aWxsIG5vdCBiZSByZWdpc3RlcmVkXCIpO1xuICAgIHJldHVybjtcbiAgfVxuICByZWdpc3RlclByZWxvYWQoc2Vzc2lvbi5kZWZhdWx0U2Vzc2lvbiwgXCJkZWZhdWx0U2Vzc2lvblwiKTtcbn0pO1xuXG5hcHAub24oXCJzZXNzaW9uLWNyZWF0ZWRcIiwgKHMpID0+IHtcbiAgaWYgKGlzQ29kZXhQbHVzUGx1c1NhZmVNb2RlRW5hYmxlZCgpKSByZXR1cm47XG4gIHJlZ2lzdGVyUHJlbG9hZChzLCBcInNlc3Npb24tY3JlYXRlZFwiKTtcbn0pO1xuXG4vLyBESUFHTk9TVElDOiBsb2cgZXZlcnkgd2ViQ29udGVudHMgY3JlYXRpb24uIFVzZWZ1bCBmb3IgdmVyaWZ5aW5nIG91clxuLy8gcHJlbG9hZCByZWFjaGVzIGV2ZXJ5IHJlbmRlcmVyIENvZGV4IHNwYXducy5cbmFwcC5vbihcIndlYi1jb250ZW50cy1jcmVhdGVkXCIsIChfZSwgd2MpID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCB3cCA9ICh3YyBhcyB1bmtub3duIGFzIHsgZ2V0TGFzdFdlYlByZWZlcmVuY2VzPzogKCkgPT4gUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfSlcbiAgICAgIC5nZXRMYXN0V2ViUHJlZmVyZW5jZXM/LigpO1xuICAgIGxvZyhcImluZm9cIiwgXCJ3ZWItY29udGVudHMtY3JlYXRlZFwiLCB7XG4gICAgICBpZDogd2MuaWQsXG4gICAgICB0eXBlOiB3Yy5nZXRUeXBlKCksXG4gICAgICBzZXNzaW9uSXNEZWZhdWx0OiB3Yy5zZXNzaW9uID09PSBzZXNzaW9uLmRlZmF1bHRTZXNzaW9uLFxuICAgICAgc2FuZGJveDogd3A/LnNhbmRib3gsXG4gICAgICBjb250ZXh0SXNvbGF0aW9uOiB3cD8uY29udGV4dElzb2xhdGlvbixcbiAgICB9KTtcbiAgICB3Yy5vbihcInByZWxvYWQtZXJyb3JcIiwgKF9ldiwgcCwgZXJyKSA9PiB7XG4gICAgICBsb2coXCJlcnJvclwiLCBgd2MgJHt3Yy5pZH0gcHJlbG9hZC1lcnJvciBwYXRoPSR7cH1gLCBTdHJpbmcoZXJyPy5zdGFjayA/PyBlcnIpKTtcbiAgICB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZyhcImVycm9yXCIsIFwid2ViLWNvbnRlbnRzLWNyZWF0ZWQgaGFuZGxlciBmYWlsZWQ6XCIsIFN0cmluZygoZSBhcyBFcnJvcik/LnN0YWNrID8/IGUpKTtcbiAgfVxufSk7XG5cbmxvZyhcImluZm9cIiwgXCJtYWluLnRzIGV2YWx1YXRlZDsgYXBwLmlzUmVhZHk9XCIgKyBhcHAuaXNSZWFkeSgpKTtcbmlmIChpc0NvZGV4UGx1c1BsdXNTYWZlTW9kZUVuYWJsZWQoKSkge1xuICBsb2coXCJ3YXJuXCIsIFwic2FmZSBtb2RlIGlzIGVuYWJsZWQ7IHR3ZWFrcyB3aWxsIG5vdCBiZSBsb2FkZWRcIik7XG59XG5cbi8vIDIuIEluaXRpYWwgdHdlYWsgZGlzY292ZXJ5ICsgbWFpbi1zY29wZSBsb2FkLlxubG9hZEFsbE1haW5Ud2Vha3MoKTtcblxuYXBwLm9uKFwid2lsbC1xdWl0XCIsICgpID0+IHtcbiAgc3RvcEFsbE1haW5Ud2Vha3MoKTtcbiAgLy8gQmVzdC1lZmZvcnQgZmx1c2ggb2YgYW55IHBlbmRpbmcgc3RvcmFnZSB3cml0ZXMuXG4gIGZvciAoY29uc3QgdCBvZiB0d2Vha1N0YXRlLmxvYWRlZE1haW4udmFsdWVzKCkpIHtcbiAgICB0cnkge1xuICAgICAgdC5zdG9yYWdlLmZsdXNoKCk7XG4gICAgfSBjYXRjaCB7fVxuICB9XG59KTtcblxuLy8gMy4gSVBDOiBleHBvc2UgdHdlYWsgbWV0YWRhdGEgKyByZXZlYWwtaW4tZmluZGVyLlxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmxpc3QtdHdlYWtzXCIsIGFzeW5jICgpID0+IHtcbiAgYXdhaXQgUHJvbWlzZS5hbGwodHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLm1hcCgodCkgPT4gZW5zdXJlVHdlYWtVcGRhdGVDaGVjayh0KSkpO1xuICBjb25zdCB1cGRhdGVDaGVja3MgPSByZWFkU3RhdGUoKS50d2Vha1VwZGF0ZUNoZWNrcyA/PyB7fTtcbiAgcmV0dXJuIHR3ZWFrU3RhdGUuZGlzY292ZXJlZC5tYXAoKHQpID0+ICh7XG4gICAgbWFuaWZlc3Q6IHQubWFuaWZlc3QsXG4gICAgZW50cnk6IHQuZW50cnksXG4gICAgZGlyOiB0LmRpcixcbiAgICBlbnRyeUV4aXN0czogZXhpc3RzU3luYyh0LmVudHJ5KSxcbiAgICBlbmFibGVkOiBpc1R3ZWFrRW5hYmxlZCh0Lm1hbmlmZXN0LmlkKSxcbiAgICB1cGRhdGU6IHVwZGF0ZUNoZWNrc1t0Lm1hbmlmZXN0LmlkXSA/PyBudWxsLFxuICB9KSk7XG59KTtcblxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmdldC10d2Vhay1lbmFibGVkXCIsIChfZSwgaWQ6IHN0cmluZykgPT4gaXNUd2Vha0VuYWJsZWQoaWQpKTtcbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpzZXQtdHdlYWstZW5hYmxlZFwiLCAoX2UsIGlkOiBzdHJpbmcsIGVuYWJsZWQ6IGJvb2xlYW4pID0+IHtcbiAgcmV0dXJuIHNldFR3ZWFrRW5hYmxlZEFuZFJlbG9hZChpZCwgZW5hYmxlZCwgdHdlYWtMaWZlY3ljbGVEZXBzKTtcbn0pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Z2V0LWNvbmZpZ1wiLCAoKSA9PiB7XG4gIGNvbnN0IHMgPSByZWFkU3RhdGUoKTtcbiAgY29uc3QgaW5zdGFsbGVyU3RhdGUgPSByZWFkSW5zdGFsbGVyU3RhdGUoKTtcbiAgY29uc3Qgc291cmNlUm9vdCA9IGluc3RhbGxlclN0YXRlPy5zb3VyY2VSb290ID8/IGZhbGxiYWNrU291cmNlUm9vdCgpO1xuICByZXR1cm4ge1xuICAgIHZlcnNpb246IENPREVYX1BMVVNQTFVTX1ZFUlNJT04sXG4gICAgYXV0b1VwZGF0ZTogcy5jb2RleFBsdXNQbHVzPy5hdXRvVXBkYXRlICE9PSBmYWxzZSxcbiAgICBzYWZlTW9kZTogcy5jb2RleFBsdXNQbHVzPy5zYWZlTW9kZSA9PT0gdHJ1ZSxcbiAgICB1cGRhdGVDaGFubmVsOiBzLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZUNoYW5uZWwgPz8gXCJzdGFibGVcIixcbiAgICB1cGRhdGVSZXBvOiBzLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZVJlcG8gPz8gQ09ERVhfUExVU1BMVVNfUkVQTyxcbiAgICB1cGRhdGVSZWY6IHMuY29kZXhQbHVzUGx1cz8udXBkYXRlUmVmID8/IFwiXCIsXG4gICAgdXBkYXRlQ2hlY2s6IHMuY29kZXhQbHVzUGx1cz8udXBkYXRlQ2hlY2sgPz8gbnVsbCxcbiAgICBzZWxmVXBkYXRlOiByZWFkU2VsZlVwZGF0ZVN0YXRlKCksXG4gICAgaW5zdGFsbGF0aW9uU291cmNlOiBkZXNjcmliZUluc3RhbGxhdGlvblNvdXJjZShzb3VyY2VSb290KSxcbiAgfTtcbn0pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6c2V0LWF1dG8tdXBkYXRlXCIsIChfZSwgZW5hYmxlZDogYm9vbGVhbikgPT4ge1xuICBzZXRDb2RleFBsdXNQbHVzQXV0b1VwZGF0ZSghIWVuYWJsZWQpO1xuICByZXR1cm4geyBhdXRvVXBkYXRlOiBpc0NvZGV4UGx1c1BsdXNBdXRvVXBkYXRlRW5hYmxlZCgpIH07XG59KTtcblxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOnNldC11cGRhdGUtY29uZmlnXCIsIChfZSwgY29uZmlnOiB7XG4gIHVwZGF0ZUNoYW5uZWw/OiBTZWxmVXBkYXRlQ2hhbm5lbDtcbiAgdXBkYXRlUmVwbz86IHN0cmluZztcbiAgdXBkYXRlUmVmPzogc3RyaW5nO1xufSkgPT4ge1xuICBzZXRDb2RleFBsdXNQbHVzVXBkYXRlQ29uZmlnKGNvbmZpZyk7XG4gIGNvbnN0IHMgPSByZWFkU3RhdGUoKTtcbiAgcmV0dXJuIHtcbiAgICB1cGRhdGVDaGFubmVsOiBzLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZUNoYW5uZWwgPz8gXCJzdGFibGVcIixcbiAgICB1cGRhdGVSZXBvOiBzLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZVJlcG8gPz8gQ09ERVhfUExVU1BMVVNfUkVQTyxcbiAgICB1cGRhdGVSZWY6IHMuY29kZXhQbHVzUGx1cz8udXBkYXRlUmVmID8/IFwiXCIsXG4gIH07XG59KTtcblxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmNoZWNrLWNvZGV4cHAtdXBkYXRlXCIsIGFzeW5jIChfZSwgZm9yY2U/OiBib29sZWFuKSA9PiB7XG4gIHJldHVybiBlbnN1cmVDb2RleFBsdXNQbHVzVXBkYXRlQ2hlY2soZm9yY2UgPT09IHRydWUpO1xufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpydW4tY29kZXhwcC11cGRhdGVcIiwgYXN5bmMgKCkgPT4ge1xuICBjb25zdCBzb3VyY2VSb290ID0gcmVhZEluc3RhbGxlclN0YXRlKCk/LnNvdXJjZVJvb3QgPz8gZmFsbGJhY2tTb3VyY2VSb290KCk7XG4gIGNvbnN0IGNsaSA9IHNvdXJjZVJvb3QgPyBqb2luKHNvdXJjZVJvb3QsIFwicGFja2FnZXNcIiwgXCJpbnN0YWxsZXJcIiwgXCJkaXN0XCIsIFwiY2xpLmpzXCIpIDogbnVsbDtcbiAgaWYgKCFjbGkgfHwgIWV4aXN0c1N5bmMoY2xpKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNvZGV4Kysgc291cmNlIENMSSB3YXMgbm90IGZvdW5kLiBSdW4gdGhlIGluc3RhbGxlciBvbmNlLCB0aGVuIHRyeSBhZ2Fpbi5cIik7XG4gIH1cbiAgYXdhaXQgcnVuSW5zdGFsbGVkQ2xpKGNsaSwgW1widXBkYXRlXCIsIFwiLS13YXRjaGVyXCJdKTtcbiAgcmV0dXJuIHJlYWRTZWxmVXBkYXRlU3RhdGUoKTtcbn0pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Z2V0LXdhdGNoZXItaGVhbHRoXCIsICgpID0+IGdldFdhdGNoZXJIZWFsdGgodXNlclJvb3QhKSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpnZXQtdHdlYWstc3RvcmVcIiwgYXN5bmMgKCkgPT4ge1xuICBjb25zdCBzdG9yZSA9IGF3YWl0IGZldGNoVHdlYWtTdG9yZVJlZ2lzdHJ5KCk7XG4gIGNvbnN0IHJlZ2lzdHJ5ID0gc3RvcmUucmVnaXN0cnk7XG4gIGNvbnN0IGluc3RhbGxlZCA9IG5ldyBNYXAodHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLm1hcCgodCkgPT4gW3QubWFuaWZlc3QuaWQsIHRdKSk7XG4gIGNvbnN0IGVudHJpZXMgPSBzaHVmZmxlU3RvcmVFbnRyaWVzKHJlZ2lzdHJ5LmVudHJpZXMsIHJhbmRvbUludCk7XG4gIHJldHVybiB7XG4gICAgLi4ucmVnaXN0cnksXG4gICAgc291cmNlVXJsOiBUV0VBS19TVE9SRV9JTkRFWF9VUkwsXG4gICAgZmV0Y2hlZEF0OiBzdG9yZS5mZXRjaGVkQXQsXG4gICAgZW50cmllczogZW50cmllcy5tYXAoKGVudHJ5KSA9PiB7XG4gICAgICBjb25zdCBsb2NhbCA9IGluc3RhbGxlZC5nZXQoZW50cnkuaWQpO1xuICAgICAgY29uc3QgcGxhdGZvcm0gPSBzdG9yZUVudHJ5UGxhdGZvcm1Db21wYXRpYmlsaXR5KGVudHJ5KTtcbiAgICAgIGNvbnN0IHJ1bnRpbWUgPSBzdG9yZUVudHJ5UnVudGltZUNvbXBhdGliaWxpdHkoZW50cnkpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4uZW50cnksXG4gICAgICAgIHBsYXRmb3JtLFxuICAgICAgICBydW50aW1lLFxuICAgICAgICBpbnN0YWxsZWQ6IGxvY2FsXG4gICAgICAgICAgPyB7XG4gICAgICAgICAgICAgIHZlcnNpb246IGxvY2FsLm1hbmlmZXN0LnZlcnNpb24sXG4gICAgICAgICAgICAgIGVuYWJsZWQ6IGlzVHdlYWtFbmFibGVkKGxvY2FsLm1hbmlmZXN0LmlkKSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICA6IG51bGwsXG4gICAgICB9O1xuICAgIH0pLFxuICB9O1xufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDppbnN0YWxsLXN0b3JlLXR3ZWFrXCIsIGFzeW5jIChfZSwgaWQ6IHN0cmluZykgPT4ge1xuICBjb25zdCB7IHJlZ2lzdHJ5IH0gPSBhd2FpdCBmZXRjaFR3ZWFrU3RvcmVSZWdpc3RyeSgpO1xuICBjb25zdCBlbnRyeSA9IHJlZ2lzdHJ5LmVudHJpZXMuZmluZCgoY2FuZGlkYXRlKSA9PiBjYW5kaWRhdGUuaWQgPT09IGlkKTtcbiAgaWYgKCFlbnRyeSkgdGhyb3cgbmV3IEVycm9yKGBUd2VhayBzdG9yZSBlbnRyeSBub3QgZm91bmQ6ICR7aWR9YCk7XG4gIGFzc2VydFN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGlibGUoZW50cnkpO1xuICBhc3NlcnRTdG9yZUVudHJ5UnVudGltZUNvbXBhdGlibGUoZW50cnkpO1xuICBhd2FpdCBpbnN0YWxsU3RvcmVUd2VhayhlbnRyeSk7XG4gIHJlbG9hZFR3ZWFrcyhcInN0b3JlLWluc3RhbGxcIiwgdHdlYWtMaWZlY3ljbGVEZXBzKTtcbiAgcmV0dXJuIHsgaW5zdGFsbGVkOiBlbnRyeS5pZCB9O1xufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpwcmVwYXJlLXR3ZWFrLXN0b3JlLXN1Ym1pc3Npb25cIiwgYXN5bmMgKF9lLCByZXBvSW5wdXQ6IHN0cmluZykgPT4ge1xuICByZXR1cm4gcHJlcGFyZVR3ZWFrU3RvcmVTdWJtaXNzaW9uKHJlcG9JbnB1dCk7XG59KTtcblxuLy8gU2FuZGJveGVkIHJlbmRlcmVyIHByZWxvYWQgY2FuJ3QgdXNlIE5vZGUgZnMgdG8gcmVhZCB0d2VhayBzb3VyY2UuIE1haW5cbi8vIHJlYWRzIGl0IG9uIHRoZSByZW5kZXJlcidzIGJlaGFsZi4gUGF0aCBtdXN0IGxpdmUgdW5kZXIgdHdlYWtzRGlyIGZvclxuLy8gc2VjdXJpdHkgXHUyMDE0IHdlIHJlZnVzZSBhbnl0aGluZyBlbHNlLlxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOnJlYWQtdHdlYWstc291cmNlXCIsIChfZSwgZW50cnlQYXRoOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgcmVzb2x2ZWQgPSByZXNvbHZlKGVudHJ5UGF0aCk7XG4gIGlmICghaXNQYXRoSW5zaWRlKFRXRUFLU19ESVIsIHJlc29sdmVkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcInBhdGggb3V0c2lkZSB0d2Vha3MgZGlyXCIpO1xuICB9XG4gIHJldHVybiByZXF1aXJlKFwibm9kZTpmc1wiKS5yZWFkRmlsZVN5bmMocmVzb2x2ZWQsIFwidXRmOFwiKTtcbn0pO1xuXG4vKipcbiAqIFJlYWQgYW4gYXJiaXRyYXJ5IGFzc2V0IGZpbGUgZnJvbSBpbnNpZGUgYSB0d2VhaydzIGRpcmVjdG9yeSBhbmQgcmV0dXJuIGl0XG4gKiBhcyBhIGBkYXRhOmAgVVJMLiBVc2VkIGJ5IHRoZSBzZXR0aW5ncyBpbmplY3RvciB0byByZW5kZXIgbWFuaWZlc3QgaWNvbnNcbiAqICh0aGUgcmVuZGVyZXIgaXMgc2FuZGJveGVkOyBgZmlsZTovL2Agd29uJ3QgbG9hZCkuXG4gKlxuICogU2VjdXJpdHk6IGNhbGxlciBwYXNzZXMgYHR3ZWFrRGlyYCBhbmQgYHJlbFBhdGhgOyB3ZSAoMSkgcmVxdWlyZSB0d2Vha0RpclxuICogdG8gbGl2ZSB1bmRlciBUV0VBS1NfRElSLCAoMikgcmVzb2x2ZSByZWxQYXRoIGFnYWluc3QgaXQgYW5kIHJlLWNoZWNrIHRoZVxuICogcmVzdWx0IHN0aWxsIGxpdmVzIHVuZGVyIFRXRUFLU19ESVIsICgzKSBjYXAgb3V0cHV0IHNpemUgYXQgMSBNaUIuXG4gKi9cbmNvbnN0IEFTU0VUX01BWF9CWVRFUyA9IDEwMjQgKiAxMDI0O1xuY29uc3QgTUlNRV9CWV9FWFQ6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIFwiLnBuZ1wiOiBcImltYWdlL3BuZ1wiLFxuICBcIi5qcGdcIjogXCJpbWFnZS9qcGVnXCIsXG4gIFwiLmpwZWdcIjogXCJpbWFnZS9qcGVnXCIsXG4gIFwiLmdpZlwiOiBcImltYWdlL2dpZlwiLFxuICBcIi53ZWJwXCI6IFwiaW1hZ2Uvd2VicFwiLFxuICBcIi5zdmdcIjogXCJpbWFnZS9zdmcreG1sXCIsXG4gIFwiLmljb1wiOiBcImltYWdlL3gtaWNvblwiLFxufTtcbmlwY01haW4uaGFuZGxlKFxuICBcImNvZGV4cHA6cmVhZC10d2Vhay1hc3NldFwiLFxuICAoX2UsIHR3ZWFrRGlyOiBzdHJpbmcsIHJlbFBhdGg6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IGZzID0gcmVxdWlyZShcIm5vZGU6ZnNcIikgYXMgdHlwZW9mIGltcG9ydChcIm5vZGU6ZnNcIik7XG4gICAgY29uc3QgZGlyID0gcmVzb2x2ZSh0d2Vha0Rpcik7XG4gICAgaWYgKCFpc1BhdGhJbnNpZGUoVFdFQUtTX0RJUiwgZGlyKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwidHdlYWtEaXIgb3V0c2lkZSB0d2Vha3MgZGlyXCIpO1xuICAgIH1cbiAgICBjb25zdCBmdWxsID0gcmVzb2x2ZShkaXIsIHJlbFBhdGgpO1xuICAgIGlmICghaXNQYXRoSW5zaWRlKGRpciwgZnVsbCkgfHwgZnVsbCA9PT0gZGlyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwYXRoIHRyYXZlcnNhbFwiKTtcbiAgICB9XG4gICAgY29uc3Qgc3RhdCA9IGZzLnN0YXRTeW5jKGZ1bGwpO1xuICAgIGlmIChzdGF0LnNpemUgPiBBU1NFVF9NQVhfQllURVMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgYXNzZXQgdG9vIGxhcmdlICgke3N0YXQuc2l6ZX0gPiAke0FTU0VUX01BWF9CWVRFU30pYCk7XG4gICAgfVxuICAgIGNvbnN0IGV4dCA9IGZ1bGwuc2xpY2UoZnVsbC5sYXN0SW5kZXhPZihcIi5cIikpLnRvTG93ZXJDYXNlKCk7XG4gICAgY29uc3QgbWltZSA9IE1JTUVfQllfRVhUW2V4dF0gPz8gXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIjtcbiAgICBjb25zdCBidWYgPSBmcy5yZWFkRmlsZVN5bmMoZnVsbCk7XG4gICAgcmV0dXJuIGBkYXRhOiR7bWltZX07YmFzZTY0LCR7YnVmLnRvU3RyaW5nKFwiYmFzZTY0XCIpfWA7XG4gIH0sXG4pO1xuXG4vLyBTYW5kYm94ZWQgcHJlbG9hZCBjYW4ndCB3cml0ZSBsb2dzIHRvIGRpc2s7IGZvcndhcmQgdG8gdXMgdmlhIElQQy5cbmlwY01haW4ub24oXCJjb2RleHBwOnByZWxvYWQtbG9nXCIsIChfZSwgbGV2ZWw6IFwiaW5mb1wiIHwgXCJ3YXJuXCIgfCBcImVycm9yXCIsIG1zZzogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IGx2bCA9IGxldmVsID09PSBcImVycm9yXCIgfHwgbGV2ZWwgPT09IFwid2FyblwiID8gbGV2ZWwgOiBcImluZm9cIjtcbiAgdHJ5IHtcbiAgICBhcHBlbmRDYXBwZWRMb2coam9pbihMT0dfRElSLCBcInByZWxvYWQubG9nXCIpLCBgWyR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpfV0gWyR7bHZsfV0gJHttc2d9XFxuYCk7XG4gIH0gY2F0Y2gge31cbn0pO1xuXG4vLyBTYW5kYm94LXNhZmUgZmlsZXN5c3RlbSBvcHMgZm9yIHJlbmRlcmVyLXNjb3BlIHR3ZWFrcy4gRWFjaCB0d2VhayBnZXRzXG4vLyBhIHNhbmRib3hlZCBkaXIgdW5kZXIgdXNlclJvb3QvdHdlYWstZGF0YS88aWQ+LiBSZW5kZXJlciBzaWRlIGNhbGxzIHRoZXNlXG4vLyBvdmVyIElQQyBpbnN0ZWFkIG9mIHVzaW5nIE5vZGUgZnMgZGlyZWN0bHkuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6dHdlYWstZnNcIiwgKF9lLCBvcDogc3RyaW5nLCBpZDogc3RyaW5nLCBwOiBzdHJpbmcsIGM/OiBzdHJpbmcpID0+IHtcbiAgaWYgKCEvXlthLXpBLVowLTkuXy1dKyQvLnRlc3QoaWQpKSB0aHJvdyBuZXcgRXJyb3IoXCJiYWQgdHdlYWsgaWRcIik7XG4gIGNvbnN0IGRpciA9IGpvaW4odXNlclJvb3QhLCBcInR3ZWFrLWRhdGFcIiwgaWQpO1xuICBta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgY29uc3QgZnVsbCA9IHJlc29sdmUoZGlyLCBwKTtcbiAgaWYgKCFpc1BhdGhJbnNpZGUoZGlyLCBmdWxsKSB8fCBmdWxsID09PSBkaXIpIHRocm93IG5ldyBFcnJvcihcInBhdGggdHJhdmVyc2FsXCIpO1xuICBjb25zdCBmcyA9IHJlcXVpcmUoXCJub2RlOmZzXCIpIGFzIHR5cGVvZiBpbXBvcnQoXCJub2RlOmZzXCIpO1xuICBzd2l0Y2ggKG9wKSB7XG4gICAgY2FzZSBcInJlYWRcIjogcmV0dXJuIGZzLnJlYWRGaWxlU3luYyhmdWxsLCBcInV0ZjhcIik7XG4gICAgY2FzZSBcIndyaXRlXCI6IHJldHVybiBmcy53cml0ZUZpbGVTeW5jKGZ1bGwsIGMgPz8gXCJcIiwgXCJ1dGY4XCIpO1xuICAgIGNhc2UgXCJleGlzdHNcIjogcmV0dXJuIGZzLmV4aXN0c1N5bmMoZnVsbCk7XG4gICAgY2FzZSBcImRhdGFEaXJcIjogcmV0dXJuIGRpcjtcbiAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoYHVua25vd24gb3A6ICR7b3B9YCk7XG4gIH1cbn0pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6dXNlci1wYXRoc1wiLCAoKSA9PiAoe1xuICB1c2VyUm9vdCxcbiAgcnVudGltZURpcixcbiAgdHdlYWtzRGlyOiBUV0VBS1NfRElSLFxuICBsb2dEaXI6IExPR19ESVIsXG59KSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpyZXZlYWxcIiwgKF9lLCBwOiBzdHJpbmcpID0+IHtcbiAgc2hlbGwub3BlblBhdGgocCkuY2F0Y2goKCkgPT4ge30pO1xufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpvcGVuLWV4dGVybmFsXCIsIChfZSwgdXJsOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgcGFyc2VkID0gbmV3IFVSTCh1cmwpO1xuICBpZiAocGFyc2VkLnByb3RvY29sICE9PSBcImh0dHBzOlwiIHx8IHBhcnNlZC5ob3N0bmFtZSAhPT0gXCJnaXRodWIuY29tXCIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJvbmx5IGdpdGh1Yi5jb20gbGlua3MgY2FuIGJlIG9wZW5lZCBmcm9tIHR3ZWFrIG1ldGFkYXRhXCIpO1xuICB9XG4gIHNoZWxsLm9wZW5FeHRlcm5hbChwYXJzZWQudG9TdHJpbmcoKSkuY2F0Y2goKCkgPT4ge30pO1xufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpjb3B5LXRleHRcIiwgKF9lLCB0ZXh0OiBzdHJpbmcpID0+IHtcbiAgY2xpcGJvYXJkLndyaXRlVGV4dChTdHJpbmcodGV4dCkpO1xuICByZXR1cm4gdHJ1ZTtcbn0pO1xuXG4vLyBNYW51YWwgZm9yY2UtcmVsb2FkIHRyaWdnZXIgZnJvbSB0aGUgcmVuZGVyZXIgKGUuZy4gdGhlIFwiRm9yY2UgUmVsb2FkXCJcbi8vIGJ1dHRvbiBvbiBvdXIgaW5qZWN0ZWQgVHdlYWtzIHBhZ2UpLiBCeXBhc3NlcyB0aGUgd2F0Y2hlciBkZWJvdW5jZS5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpyZWxvYWQtdHdlYWtzXCIsICgpID0+IHtcbiAgcmVsb2FkVHdlYWtzKFwibWFudWFsXCIsIHR3ZWFrTGlmZWN5Y2xlRGVwcyk7XG4gIHJldHVybiB7IGF0OiBEYXRlLm5vdygpLCBjb3VudDogdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLmxlbmd0aCB9O1xufSk7XG5cbi8vIDQuIEZpbGVzeXN0ZW0gd2F0Y2hlciBcdTIxOTIgZGVib3VuY2VkIHJlbG9hZCArIGJyb2FkY2FzdC5cbi8vICAgIFdlIHdhdGNoIHRoZSB0d2Vha3MgZGlyIGZvciBhbnkgY2hhbmdlLiBPbiB0aGUgZmlyc3QgdGljayBvZiBpbmFjdGl2aXR5XG4vLyAgICB3ZSBzdG9wIG1haW4tc2lkZSB0d2Vha3MsIGNsZWFyIHRoZWlyIGNhY2hlZCBtb2R1bGVzLCByZS1kaXNjb3ZlciwgdGhlblxuLy8gICAgcmVzdGFydCBhbmQgYnJvYWRjYXN0IGBjb2RleHBwOnR3ZWFrcy1jaGFuZ2VkYCB0byBldmVyeSByZW5kZXJlciBzbyBpdFxuLy8gICAgY2FuIHJlLWluaXQgaXRzIGhvc3QuXG5jb25zdCBSRUxPQURfREVCT1VOQ0VfTVMgPSAyNTA7XG5sZXQgcmVsb2FkVGltZXI6IE5vZGVKUy5UaW1lb3V0IHwgbnVsbCA9IG51bGw7XG5mdW5jdGlvbiBzY2hlZHVsZVJlbG9hZChyZWFzb246IHN0cmluZyk6IHZvaWQge1xuICBpZiAocmVsb2FkVGltZXIpIGNsZWFyVGltZW91dChyZWxvYWRUaW1lcik7XG4gIHJlbG9hZFRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgcmVsb2FkVGltZXIgPSBudWxsO1xuICAgIHJlbG9hZFR3ZWFrcyhyZWFzb24sIHR3ZWFrTGlmZWN5Y2xlRGVwcyk7XG4gIH0sIFJFTE9BRF9ERUJPVU5DRV9NUyk7XG59XG5cbnRyeSB7XG4gIGNvbnN0IHdhdGNoZXIgPSBjaG9raWRhci53YXRjaChUV0VBS1NfRElSLCB7XG4gICAgaWdub3JlSW5pdGlhbDogdHJ1ZSxcbiAgICAvLyBXYWl0IGZvciBmaWxlcyB0byBzZXR0bGUgYmVmb3JlIHRyaWdnZXJpbmcgXHUyMDE0IGd1YXJkcyBhZ2FpbnN0IHBhcnRpYWxseVxuICAgIC8vIHdyaXR0ZW4gdHdlYWsgZmlsZXMgZHVyaW5nIGVkaXRvciBzYXZlcyAvIGdpdCBjaGVja291dHMuXG4gICAgYXdhaXRXcml0ZUZpbmlzaDogeyBzdGFiaWxpdHlUaHJlc2hvbGQ6IDE1MCwgcG9sbEludGVydmFsOiA1MCB9LFxuICAgIC8vIEF2b2lkIGVhdGluZyBDUFUgb24gaHVnZSBub2RlX21vZHVsZXMgdHJlZXMgaW5zaWRlIHR3ZWFrIGZvbGRlcnMuXG4gICAgaWdub3JlZDogKHApID0+IHAuaW5jbHVkZXMoYCR7VFdFQUtTX0RJUn0vYCkgJiYgL1xcL25vZGVfbW9kdWxlc1xcLy8udGVzdChwKSxcbiAgfSk7XG4gIHdhdGNoZXIub24oXCJhbGxcIiwgKGV2ZW50LCBwYXRoKSA9PiBzY2hlZHVsZVJlbG9hZChgJHtldmVudH0gJHtwYXRofWApKTtcbiAgd2F0Y2hlci5vbihcImVycm9yXCIsIChlKSA9PiBsb2coXCJ3YXJuXCIsIFwid2F0Y2hlciBlcnJvcjpcIiwgZSkpO1xuICBsb2coXCJpbmZvXCIsIFwid2F0Y2hpbmdcIiwgVFdFQUtTX0RJUik7XG4gIGFwcC5vbihcIndpbGwtcXVpdFwiLCAoKSA9PiB3YXRjaGVyLmNsb3NlKCkuY2F0Y2goKCkgPT4ge30pKTtcbn0gY2F0Y2ggKGUpIHtcbiAgbG9nKFwiZXJyb3JcIiwgXCJmYWlsZWQgdG8gc3RhcnQgd2F0Y2hlcjpcIiwgZSk7XG59XG5cbi8vIC0tLSBoZWxwZXJzIC0tLVxuXG5mdW5jdGlvbiBsb2FkQWxsTWFpblR3ZWFrcygpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICB0d2Vha1N0YXRlLmRpc2NvdmVyZWQgPSBkaXNjb3ZlclR3ZWFrcyhUV0VBS1NfRElSKTtcbiAgICBsb2coXG4gICAgICBcImluZm9cIixcbiAgICAgIGBkaXNjb3ZlcmVkICR7dHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLmxlbmd0aH0gdHdlYWsocyk6YCxcbiAgICAgIHR3ZWFrU3RhdGUuZGlzY292ZXJlZC5tYXAoKHQpID0+IHQubWFuaWZlc3QuaWQpLmpvaW4oXCIsIFwiKSxcbiAgICApO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nKFwiZXJyb3JcIiwgXCJ0d2VhayBkaXNjb3ZlcnkgZmFpbGVkOlwiLCBlKTtcbiAgICB0d2Vha1N0YXRlLmRpc2NvdmVyZWQgPSBbXTtcbiAgfVxuXG4gIHN5bmNNY3BTZXJ2ZXJzRnJvbUVuYWJsZWRUd2Vha3MoKTtcblxuICBmb3IgKGNvbnN0IHQgb2YgdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkKSB7XG4gICAgaWYgKCFpc01haW5Qcm9jZXNzVHdlYWtTY29wZSh0Lm1hbmlmZXN0LnNjb3BlKSkgY29udGludWU7XG4gICAgaWYgKCFpc1R3ZWFrRW5hYmxlZCh0Lm1hbmlmZXN0LmlkKSkge1xuICAgICAgbG9nKFwiaW5mb1wiLCBgc2tpcHBpbmcgZGlzYWJsZWQgbWFpbiB0d2VhazogJHt0Lm1hbmlmZXN0LmlkfWApO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBtb2QgPSByZXF1aXJlKHQuZW50cnkpO1xuICAgICAgY29uc3QgdHdlYWsgPSBtb2QuZGVmYXVsdCA/PyBtb2Q7XG4gICAgICBpZiAodHlwZW9mIHR3ZWFrPy5zdGFydCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGNvbnN0IHN0b3JhZ2UgPSBjcmVhdGVEaXNrU3RvcmFnZSh1c2VyUm9vdCEsIHQubWFuaWZlc3QuaWQpO1xuICAgICAgICB0d2Vhay5zdGFydCh7XG4gICAgICAgICAgbWFuaWZlc3Q6IHQubWFuaWZlc3QsXG4gICAgICAgICAgcHJvY2VzczogXCJtYWluXCIsXG4gICAgICAgICAgbG9nOiBtYWtlTG9nZ2VyKHQubWFuaWZlc3QuaWQpLFxuICAgICAgICAgIHN0b3JhZ2UsXG4gICAgICAgICAgaXBjOiBtYWtlTWFpbklwYyh0Lm1hbmlmZXN0LmlkKSxcbiAgICAgICAgICBmczogbWFrZU1haW5Gcyh0Lm1hbmlmZXN0LmlkKSxcbiAgICAgICAgICBjb2RleDogbWFrZUNvZGV4QXBpKCksXG4gICAgICAgIH0pO1xuICAgICAgICB0d2Vha1N0YXRlLmxvYWRlZE1haW4uc2V0KHQubWFuaWZlc3QuaWQsIHtcbiAgICAgICAgICBzdG9wOiB0d2Vhay5zdG9wLFxuICAgICAgICAgIHN0b3JhZ2UsXG4gICAgICAgIH0pO1xuICAgICAgICBsb2coXCJpbmZvXCIsIGBzdGFydGVkIG1haW4gdHdlYWs6ICR7dC5tYW5pZmVzdC5pZH1gKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2coXCJlcnJvclwiLCBgdHdlYWsgJHt0Lm1hbmlmZXN0LmlkfSBmYWlsZWQgdG8gc3RhcnQ6YCwgZSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHN5bmNNY3BTZXJ2ZXJzRnJvbUVuYWJsZWRUd2Vha3MoKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVzdWx0ID0gc3luY01hbmFnZWRNY3BTZXJ2ZXJzKHtcbiAgICAgIGNvbmZpZ1BhdGg6IENPREVYX0NPTkZJR19GSUxFLFxuICAgICAgdHdlYWtzOiB0d2Vha1N0YXRlLmRpc2NvdmVyZWQuZmlsdGVyKCh0KSA9PiBpc1R3ZWFrRW5hYmxlZCh0Lm1hbmlmZXN0LmlkKSksXG4gICAgfSk7XG4gICAgaWYgKHJlc3VsdC5jaGFuZ2VkKSB7XG4gICAgICBsb2coXCJpbmZvXCIsIGBzeW5jZWQgQ29kZXggTUNQIGNvbmZpZzogJHtyZXN1bHQuc2VydmVyTmFtZXMuam9pbihcIiwgXCIpIHx8IFwibm9uZVwifWApO1xuICAgIH1cbiAgICBpZiAocmVzdWx0LnNraXBwZWRTZXJ2ZXJOYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICBsb2coXG4gICAgICAgIFwiaW5mb1wiLFxuICAgICAgICBgc2tpcHBlZCBDb2RleCsrIG1hbmFnZWQgTUNQIHNlcnZlcihzKSBhbHJlYWR5IGNvbmZpZ3VyZWQgYnkgdXNlcjogJHtyZXN1bHQuc2tpcHBlZFNlcnZlck5hbWVzLmpvaW4oXCIsIFwiKX1gLFxuICAgICAgKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2coXCJ3YXJuXCIsIFwiZmFpbGVkIHRvIHN5bmMgQ29kZXggTUNQIGNvbmZpZzpcIiwgZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc3RvcEFsbE1haW5Ud2Vha3MoKTogdm9pZCB7XG4gIGZvciAoY29uc3QgW2lkLCB0XSBvZiB0d2Vha1N0YXRlLmxvYWRlZE1haW4pIHtcbiAgICB0cnkge1xuICAgICAgdC5zdG9wPy4oKTtcbiAgICAgIHQuc3RvcmFnZS5mbHVzaCgpO1xuICAgICAgbG9nKFwiaW5mb1wiLCBgc3RvcHBlZCBtYWluIHR3ZWFrOiAke2lkfWApO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZyhcIndhcm5cIiwgYHN0b3AgZmFpbGVkIGZvciAke2lkfTpgLCBlKTtcbiAgICB9XG4gIH1cbiAgdHdlYWtTdGF0ZS5sb2FkZWRNYWluLmNsZWFyKCk7XG59XG5cbmZ1bmN0aW9uIGNsZWFyVHdlYWtNb2R1bGVDYWNoZSgpOiB2b2lkIHtcbiAgLy8gRHJvcCBhbnkgY2FjaGVkIHJlcXVpcmUoKSBlbnRyaWVzIHRoYXQgbGl2ZSBpbnNpZGUgdGhlIHR3ZWFrcyBkaXIgc28gYVxuICAvLyByZS1yZXF1aXJlIG9uIG5leHQgbG9hZCBwaWNrcyB1cCBmcmVzaCBjb2RlLlxuICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhyZXF1aXJlLmNhY2hlKSkge1xuICAgIGlmIChpc1BhdGhJbnNpZGUoVFdFQUtTX0RJUiwga2V5KSkgZGVsZXRlIHJlcXVpcmUuY2FjaGVba2V5XTtcbiAgfVxufVxuXG5jb25zdCBVUERBVEVfQ0hFQ0tfSU5URVJWQUxfTVMgPSAyNCAqIDYwICogNjAgKiAxMDAwO1xuY29uc3QgVkVSU0lPTl9SRSA9IC9edj8oXFxkKylcXC4oXFxkKylcXC4oXFxkKykoPzpbLStdLiopPyQvO1xuXG5hc3luYyBmdW5jdGlvbiBlbnN1cmVDb2RleFBsdXNQbHVzVXBkYXRlQ2hlY2soZm9yY2UgPSBmYWxzZSk6IFByb21pc2U8Q29kZXhQbHVzUGx1c1VwZGF0ZUNoZWNrPiB7XG4gIGNvbnN0IHN0YXRlID0gcmVhZFN0YXRlKCk7XG4gIGNvbnN0IGNhY2hlZCA9IHN0YXRlLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZUNoZWNrO1xuICBjb25zdCBjaGFubmVsID0gc3RhdGUuY29kZXhQbHVzUGx1cz8udXBkYXRlQ2hhbm5lbCA/PyBcInN0YWJsZVwiO1xuICBjb25zdCByZXBvID0gc3RhdGUuY29kZXhQbHVzUGx1cz8udXBkYXRlUmVwbyA/PyBDT0RFWF9QTFVTUExVU19SRVBPO1xuICBpZiAoXG4gICAgIWZvcmNlICYmXG4gICAgY2FjaGVkICYmXG4gICAgY2FjaGVkLmN1cnJlbnRWZXJzaW9uID09PSBDT0RFWF9QTFVTUExVU19WRVJTSU9OICYmXG4gICAgRGF0ZS5ub3coKSAtIERhdGUucGFyc2UoY2FjaGVkLmNoZWNrZWRBdCkgPCBVUERBVEVfQ0hFQ0tfSU5URVJWQUxfTVNcbiAgKSB7XG4gICAgcmV0dXJuIGNhY2hlZDtcbiAgfVxuXG4gIGNvbnN0IHJlbGVhc2UgPSBhd2FpdCBmZXRjaExhdGVzdFJlbGVhc2UocmVwbywgQ09ERVhfUExVU1BMVVNfVkVSU0lPTiwgY2hhbm5lbCA9PT0gXCJwcmVyZWxlYXNlXCIpO1xuICBjb25zdCBsYXRlc3RWZXJzaW9uID0gcmVsZWFzZS5sYXRlc3RUYWcgPyBub3JtYWxpemVWZXJzaW9uKHJlbGVhc2UubGF0ZXN0VGFnKSA6IG51bGw7XG4gIGNvbnN0IGNoZWNrOiBDb2RleFBsdXNQbHVzVXBkYXRlQ2hlY2sgPSB7XG4gICAgY2hlY2tlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgY3VycmVudFZlcnNpb246IENPREVYX1BMVVNQTFVTX1ZFUlNJT04sXG4gICAgbGF0ZXN0VmVyc2lvbixcbiAgICByZWxlYXNlVXJsOiByZWxlYXNlLnJlbGVhc2VVcmwgPz8gYGh0dHBzOi8vZ2l0aHViLmNvbS8ke3JlcG99L3JlbGVhc2VzYCxcbiAgICByZWxlYXNlTm90ZXM6IHJlbGVhc2UucmVsZWFzZU5vdGVzLFxuICAgIHVwZGF0ZUF2YWlsYWJsZTogbGF0ZXN0VmVyc2lvblxuICAgICAgPyBjb21wYXJlVmVyc2lvbnMobm9ybWFsaXplVmVyc2lvbihsYXRlc3RWZXJzaW9uKSwgQ09ERVhfUExVU1BMVVNfVkVSU0lPTikgPiAwXG4gICAgICA6IGZhbHNlLFxuICAgIC4uLihyZWxlYXNlLmVycm9yID8geyBlcnJvcjogcmVsZWFzZS5lcnJvciB9IDoge30pLFxuICB9O1xuICBzdGF0ZS5jb2RleFBsdXNQbHVzID8/PSB7fTtcbiAgc3RhdGUuY29kZXhQbHVzUGx1cy51cGRhdGVDaGVjayA9IGNoZWNrO1xuICB3cml0ZVN0YXRlKHN0YXRlKTtcbiAgcmV0dXJuIGNoZWNrO1xufVxuXG5hc3luYyBmdW5jdGlvbiBlbnN1cmVUd2Vha1VwZGF0ZUNoZWNrKHQ6IERpc2NvdmVyZWRUd2Vhayk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBpZCA9IHQubWFuaWZlc3QuaWQ7XG4gIGNvbnN0IHJlcG8gPSB0Lm1hbmlmZXN0LmdpdGh1YlJlcG87XG4gIGNvbnN0IHN0YXRlID0gcmVhZFN0YXRlKCk7XG4gIGNvbnN0IGNhY2hlZCA9IHN0YXRlLnR3ZWFrVXBkYXRlQ2hlY2tzPy5baWRdO1xuICBpZiAoXG4gICAgY2FjaGVkICYmXG4gICAgY2FjaGVkLnJlcG8gPT09IHJlcG8gJiZcbiAgICBjYWNoZWQuY3VycmVudFZlcnNpb24gPT09IHQubWFuaWZlc3QudmVyc2lvbiAmJlxuICAgIERhdGUubm93KCkgLSBEYXRlLnBhcnNlKGNhY2hlZC5jaGVja2VkQXQpIDwgVVBEQVRFX0NIRUNLX0lOVEVSVkFMX01TXG4gICkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IG5leHQgPSBhd2FpdCBmZXRjaExhdGVzdFJlbGVhc2UocmVwbywgdC5tYW5pZmVzdC52ZXJzaW9uKTtcbiAgY29uc3QgbGF0ZXN0VmVyc2lvbiA9IG5leHQubGF0ZXN0VGFnID8gbm9ybWFsaXplVmVyc2lvbihuZXh0LmxhdGVzdFRhZykgOiBudWxsO1xuICBjb25zdCBjaGVjazogVHdlYWtVcGRhdGVDaGVjayA9IHtcbiAgICBjaGVja2VkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICByZXBvLFxuICAgIGN1cnJlbnRWZXJzaW9uOiB0Lm1hbmlmZXN0LnZlcnNpb24sXG4gICAgbGF0ZXN0VmVyc2lvbixcbiAgICBsYXRlc3RUYWc6IG5leHQubGF0ZXN0VGFnLFxuICAgIHJlbGVhc2VVcmw6IG5leHQucmVsZWFzZVVybCxcbiAgICB1cGRhdGVBdmFpbGFibGU6IGxhdGVzdFZlcnNpb25cbiAgICAgID8gY29tcGFyZVZlcnNpb25zKGxhdGVzdFZlcnNpb24sIG5vcm1hbGl6ZVZlcnNpb24odC5tYW5pZmVzdC52ZXJzaW9uKSkgPiAwXG4gICAgICA6IGZhbHNlLFxuICAgIC4uLihuZXh0LmVycm9yID8geyBlcnJvcjogbmV4dC5lcnJvciB9IDoge30pLFxuICB9O1xuICBzdGF0ZS50d2Vha1VwZGF0ZUNoZWNrcyA/Pz0ge307XG4gIHN0YXRlLnR3ZWFrVXBkYXRlQ2hlY2tzW2lkXSA9IGNoZWNrO1xuICB3cml0ZVN0YXRlKHN0YXRlKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hMYXRlc3RSZWxlYXNlKFxuICByZXBvOiBzdHJpbmcsXG4gIGN1cnJlbnRWZXJzaW9uOiBzdHJpbmcsXG4gIGluY2x1ZGVQcmVyZWxlYXNlID0gZmFsc2UsXG4pOiBQcm9taXNlPHsgbGF0ZXN0VGFnOiBzdHJpbmcgfCBudWxsOyByZWxlYXNlVXJsOiBzdHJpbmcgfCBudWxsOyByZWxlYXNlTm90ZXM6IHN0cmluZyB8IG51bGw7IGVycm9yPzogc3RyaW5nIH0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBjb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgIGNvbnN0IHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IGNvbnRyb2xsZXIuYWJvcnQoKSwgODAwMCk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGVuZHBvaW50ID0gaW5jbHVkZVByZXJlbGVhc2UgPyBcInJlbGVhc2VzP3Blcl9wYWdlPTIwXCIgOiBcInJlbGVhc2VzL2xhdGVzdFwiO1xuICAgICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goYGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvJHtyZXBvfS8ke2VuZHBvaW50fWAsIHtcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIFwiQWNjZXB0XCI6IFwiYXBwbGljYXRpb24vdm5kLmdpdGh1Yitqc29uXCIsXG4gICAgICAgICAgXCJVc2VyLUFnZW50XCI6IGBjb2RleC1wbHVzcGx1cy8ke2N1cnJlbnRWZXJzaW9ufWAsXG4gICAgICAgIH0sXG4gICAgICAgIHNpZ25hbDogY29udHJvbGxlci5zaWduYWwsXG4gICAgICB9KTtcbiAgICAgIGlmIChyZXMuc3RhdHVzID09PSA0MDQpIHtcbiAgICAgICAgcmV0dXJuIHsgbGF0ZXN0VGFnOiBudWxsLCByZWxlYXNlVXJsOiBudWxsLCByZWxlYXNlTm90ZXM6IG51bGwsIGVycm9yOiBcIm5vIEdpdEh1YiByZWxlYXNlIGZvdW5kXCIgfTtcbiAgICAgIH1cbiAgICAgIGlmICghcmVzLm9rKSB7XG4gICAgICAgIHJldHVybiB7IGxhdGVzdFRhZzogbnVsbCwgcmVsZWFzZVVybDogbnVsbCwgcmVsZWFzZU5vdGVzOiBudWxsLCBlcnJvcjogYEdpdEh1YiByZXR1cm5lZCAke3Jlcy5zdGF0dXN9YCB9O1xuICAgICAgfVxuICAgICAgY29uc3QganNvbiA9IGF3YWl0IHJlcy5qc29uKCkgYXMgeyB0YWdfbmFtZT86IHN0cmluZzsgaHRtbF91cmw/OiBzdHJpbmc7IGJvZHk/OiBzdHJpbmc7IGRyYWZ0PzogYm9vbGVhbiB9IHwgQXJyYXk8eyB0YWdfbmFtZT86IHN0cmluZzsgaHRtbF91cmw/OiBzdHJpbmc7IGJvZHk/OiBzdHJpbmc7IGRyYWZ0PzogYm9vbGVhbiB9PjtcbiAgICAgIGNvbnN0IGJvZHkgPSBBcnJheS5pc0FycmF5KGpzb24pID8ganNvbi5maW5kKChyZWxlYXNlKSA9PiAhcmVsZWFzZS5kcmFmdCkgOiBqc29uO1xuICAgICAgaWYgKCFib2R5KSB7XG4gICAgICAgIHJldHVybiB7IGxhdGVzdFRhZzogbnVsbCwgcmVsZWFzZVVybDogbnVsbCwgcmVsZWFzZU5vdGVzOiBudWxsLCBlcnJvcjogXCJubyBHaXRIdWIgcmVsZWFzZSBmb3VuZFwiIH07XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsYXRlc3RUYWc6IGJvZHkudGFnX25hbWUgPz8gbnVsbCxcbiAgICAgICAgcmVsZWFzZVVybDogYm9keS5odG1sX3VybCA/PyBgaHR0cHM6Ly9naXRodWIuY29tLyR7cmVwb30vcmVsZWFzZXNgLFxuICAgICAgICByZWxlYXNlTm90ZXM6IGJvZHkuYm9keSA/PyBudWxsLFxuICAgICAgfTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiB7XG4gICAgICBsYXRlc3RUYWc6IG51bGwsXG4gICAgICByZWxlYXNlVXJsOiBudWxsLFxuICAgICAgcmVsZWFzZU5vdGVzOiBudWxsLFxuICAgICAgZXJyb3I6IGUgaW5zdGFuY2VvZiBFcnJvciA/IGUubWVzc2FnZSA6IFN0cmluZyhlKSxcbiAgICB9O1xuICB9XG59XG5cbmludGVyZmFjZSBUd2Vha1N0b3JlRmV0Y2hSZXN1bHQge1xuICByZWdpc3RyeTogVHdlYWtTdG9yZVJlZ2lzdHJ5O1xuICBmZXRjaGVkQXQ6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFN0b3JlSW5zdGFsbE1ldGFkYXRhIHtcbiAgcmVwbzogc3RyaW5nO1xuICBhcHByb3ZlZENvbW1pdFNoYTogc3RyaW5nO1xuICBpbnN0YWxsZWRBdDogc3RyaW5nO1xuICBzdG9yZUluZGV4VXJsOiBzdHJpbmc7XG4gIGZpbGVzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbn1cblxuaW50ZXJmYWNlIFN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGliaWxpdHkge1xuICBjdXJyZW50OiBOb2RlSlMuUGxhdGZvcm07XG4gIHN1cHBvcnRlZDogVHdlYWtTdG9yZVBsYXRmb3JtW10gfCBudWxsO1xuICBjb21wYXRpYmxlOiBib29sZWFuO1xuICByZWFzb246IHN0cmluZyB8IG51bGw7XG59XG5cbmludGVyZmFjZSBTdG9yZUVudHJ5UnVudGltZUNvbXBhdGliaWxpdHkge1xuICBjdXJyZW50OiBzdHJpbmc7XG4gIHJlcXVpcmVkOiBzdHJpbmcgfCBudWxsO1xuICBjb21wYXRpYmxlOiBib29sZWFuO1xuICByZWFzb246IHN0cmluZyB8IG51bGw7XG59XG5cbmNsYXNzIFN0b3JlVHdlYWtNb2RpZmllZEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih0d2Vha05hbWU6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgYCR7dHdlYWtOYW1lfSBoYXMgbG9jYWwgc291cmNlIGNoYW5nZXMsIHNvIENvZGV4KysgY2FuJ3QgYXV0by11cGRhdGUgaXQuIFJldmVydCB5b3VyIGxvY2FsIGNoYW5nZXMgb3IgcmVpbnN0YWxsIHRoZSB0d2VhayBtYW51YWxseS5gLFxuICAgICk7XG4gICAgdGhpcy5uYW1lID0gXCJTdG9yZVR3ZWFrTW9kaWZpZWRFcnJvclwiO1xuICB9XG59XG5cbmZ1bmN0aW9uIHN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGliaWxpdHkoZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSk6IFN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGliaWxpdHkge1xuICBjb25zdCBzdXBwb3J0ZWQgPSBlbnRyeS5wbGF0Zm9ybXMgPz8gbnVsbDtcbiAgY29uc3QgY29tcGF0aWJsZSA9ICFzdXBwb3J0ZWQgfHwgc3VwcG9ydGVkLmluY2x1ZGVzKHByb2Nlc3MucGxhdGZvcm0gYXMgVHdlYWtTdG9yZVBsYXRmb3JtKTtcbiAgcmV0dXJuIHtcbiAgICBjdXJyZW50OiBwcm9jZXNzLnBsYXRmb3JtLFxuICAgIHN1cHBvcnRlZCxcbiAgICBjb21wYXRpYmxlLFxuICAgIHJlYXNvbjogY29tcGF0aWJsZSA/IG51bGwgOiBgJHtlbnRyeS5tYW5pZmVzdC5uYW1lfSBpcyBvbmx5IGF2YWlsYWJsZSBvbiAke2Zvcm1hdFN0b3JlUGxhdGZvcm1zKHN1cHBvcnRlZCl9LmAsXG4gIH07XG59XG5cbmZ1bmN0aW9uIGFzc2VydFN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGlibGUoZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSk6IHZvaWQge1xuICBjb25zdCBwbGF0Zm9ybSA9IHN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGliaWxpdHkoZW50cnkpO1xuICBpZiAoIXBsYXRmb3JtLmNvbXBhdGlibGUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IocGxhdGZvcm0ucmVhc29uID8/IGAke2VudHJ5Lm1hbmlmZXN0Lm5hbWV9IGlzIG5vdCBhdmFpbGFibGUgb24gdGhpcyBwbGF0Zm9ybS5gKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzdG9yZUVudHJ5UnVudGltZUNvbXBhdGliaWxpdHkoZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSk6IFN0b3JlRW50cnlSdW50aW1lQ29tcGF0aWJpbGl0eSB7XG4gIGNvbnN0IHJlcXVpcmVkID0gY2xlYW5NaW5SdW50aW1lKGVudHJ5Lm1hbmlmZXN0Lm1pblJ1bnRpbWUpO1xuICBjb25zdCBjb21wYXRpYmxlID0gIXJlcXVpcmVkIHx8IGNvbXBhcmVWZXJzaW9ucyhDT0RFWF9QTFVTUExVU19WRVJTSU9OLCByZXF1aXJlZCkgPj0gMDtcbiAgcmV0dXJuIHtcbiAgICBjdXJyZW50OiBDT0RFWF9QTFVTUExVU19WRVJTSU9OLFxuICAgIHJlcXVpcmVkLFxuICAgIGNvbXBhdGlibGUsXG4gICAgcmVhc29uOiBjb21wYXRpYmxlIHx8ICFyZXF1aXJlZFxuICAgICAgPyBudWxsXG4gICAgICA6IGAke2VudHJ5Lm1hbmlmZXN0Lm5hbWV9IHJlcXVpcmVzIENvZGV4KysgJHtyZXF1aXJlZH0gb3IgbmV3ZXIuYCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXNzZXJ0U3RvcmVFbnRyeVJ1bnRpbWVDb21wYXRpYmxlKGVudHJ5OiBUd2Vha1N0b3JlRW50cnkpOiB2b2lkIHtcbiAgY29uc3QgcnVudGltZSA9IHN0b3JlRW50cnlSdW50aW1lQ29tcGF0aWJpbGl0eShlbnRyeSk7XG4gIGlmICghcnVudGltZS5jb21wYXRpYmxlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKHJ1bnRpbWUucmVhc29uID8/IGAke2VudHJ5Lm1hbmlmZXN0Lm5hbWV9IHJlcXVpcmVzIGEgbmV3ZXIgQ29kZXgrKyBydW50aW1lLmApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNsZWFuTWluUnVudGltZSh2YWx1ZTogdW5rbm93bik6IHN0cmluZyB8IG51bGwge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgdmVyc2lvbiA9IG5vcm1hbGl6ZVZlcnNpb24odmFsdWUucmVwbGFjZSgvXj49P1xccyovLCBcIlwiKSk7XG4gIHJldHVybiBWRVJTSU9OX1JFLnRlc3QodmVyc2lvbikgPyB2ZXJzaW9uIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gZm9ybWF0U3RvcmVQbGF0Zm9ybXMocGxhdGZvcm1zOiBUd2Vha1N0b3JlUGxhdGZvcm1bXSB8IG51bGwpOiBzdHJpbmcge1xuICBpZiAoIXBsYXRmb3JtcyB8fCBwbGF0Zm9ybXMubGVuZ3RoID09PSAwKSByZXR1cm4gXCJzdXBwb3J0ZWQgcGxhdGZvcm1zXCI7XG4gIHJldHVybiBwbGF0Zm9ybXMubWFwKChwbGF0Zm9ybSkgPT4ge1xuICAgIGlmIChwbGF0Zm9ybSA9PT0gXCJkYXJ3aW5cIikgcmV0dXJuIFwibWFjT1NcIjtcbiAgICBpZiAocGxhdGZvcm0gPT09IFwid2luMzJcIikgcmV0dXJuIFwiV2luZG93c1wiO1xuICAgIHJldHVybiBcIkxpbnV4XCI7XG4gIH0pLmpvaW4oXCIsIFwiKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hUd2Vha1N0b3JlUmVnaXN0cnkoKTogUHJvbWlzZTxUd2Vha1N0b3JlRmV0Y2hSZXN1bHQ+IHtcbiAgY29uc3QgZmV0Y2hlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICB0cnkge1xuICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgY29uc3QgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4gY29udHJvbGxlci5hYm9ydCgpLCA4MDAwKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goVFdFQUtfU1RPUkVfSU5ERVhfVVJMLCB7XG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICBcIkFjY2VwdFwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgICBcIlVzZXItQWdlbnRcIjogYGNvZGV4LXBsdXNwbHVzLyR7Q09ERVhfUExVU1BMVVNfVkVSU0lPTn1gLFxuICAgICAgICB9LFxuICAgICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLFxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlcy5vaykgdGhyb3cgbmV3IEVycm9yKGBzdG9yZSByZXR1cm5lZCAke3Jlcy5zdGF0dXN9YCk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZWdpc3RyeTogbm9ybWFsaXplU3RvcmVSZWdpc3RyeShhd2FpdCByZXMuanNvbigpKSxcbiAgICAgICAgZmV0Y2hlZEF0LFxuICAgICAgfTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnN0IGVycm9yID0gZSBpbnN0YW5jZW9mIEVycm9yID8gZSA6IG5ldyBFcnJvcihTdHJpbmcoZSkpO1xuICAgIGxvZyhcIndhcm5cIiwgXCJmYWlsZWQgdG8gZmV0Y2ggdHdlYWsgc3RvcmUgcmVnaXN0cnk6XCIsIGVycm9yLm1lc3NhZ2UpO1xuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluc3RhbGxTdG9yZVR3ZWFrKGVudHJ5OiBUd2Vha1N0b3JlRW50cnkpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgdXJsID0gc3RvcmVBcmNoaXZlVXJsKGVudHJ5KTtcbiAgY29uc3Qgd29yayA9IG1rZHRlbXBTeW5jKGpvaW4odG1wZGlyKCksIFwiY29kZXhwcC1zdG9yZS10d2Vhay1cIikpO1xuICBjb25zdCBhcmNoaXZlID0gam9pbih3b3JrLCBcInNvdXJjZS50YXIuZ3pcIik7XG4gIGNvbnN0IGV4dHJhY3REaXIgPSBqb2luKHdvcmssIFwiZXh0cmFjdFwiKTtcbiAgY29uc3QgdGFyZ2V0ID0gam9pbihUV0VBS1NfRElSLCBlbnRyeS5pZCk7XG4gIGNvbnN0IHN0YWdlZFRhcmdldCA9IGpvaW4od29yaywgXCJzdGFnZWRcIiwgZW50cnkuaWQpO1xuXG4gIHRyeSB7XG4gICAgbG9nKFwiaW5mb1wiLCBgaW5zdGFsbGluZyBzdG9yZSB0d2VhayAke2VudHJ5LmlkfSBmcm9tICR7ZW50cnkucmVwb31AJHtlbnRyeS5hcHByb3ZlZENvbW1pdFNoYX1gKTtcbiAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgIGhlYWRlcnM6IHsgXCJVc2VyLUFnZW50XCI6IGBjb2RleC1wbHVzcGx1cy8ke0NPREVYX1BMVVNQTFVTX1ZFUlNJT059YCB9LFxuICAgICAgcmVkaXJlY3Q6IFwiZm9sbG93XCIsXG4gICAgfSk7XG4gICAgaWYgKCFyZXMub2spIHRocm93IG5ldyBFcnJvcihgZG93bmxvYWQgZmFpbGVkOiAke3Jlcy5zdGF0dXN9YCk7XG4gICAgY29uc3QgYnl0ZXMgPSBCdWZmZXIuZnJvbShhd2FpdCByZXMuYXJyYXlCdWZmZXIoKSk7XG4gICAgd3JpdGVGaWxlU3luYyhhcmNoaXZlLCBieXRlcyk7XG4gICAgbWtkaXJTeW5jKGV4dHJhY3REaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIGV4dHJhY3RUYXJBcmNoaXZlKGFyY2hpdmUsIGV4dHJhY3REaXIpO1xuICAgIGNvbnN0IHNvdXJjZSA9IGZpbmRUd2Vha1Jvb3QoZXh0cmFjdERpcik7XG4gICAgaWYgKCFzb3VyY2UpIHRocm93IG5ldyBFcnJvcihcImRvd25sb2FkZWQgYXJjaGl2ZSBkaWQgbm90IGNvbnRhaW4gbWFuaWZlc3QuanNvblwiKTtcbiAgICB2YWxpZGF0ZVN0b3JlVHdlYWtTb3VyY2UoZW50cnksIHNvdXJjZSk7XG4gICAgcm1TeW5jKHN0YWdlZFRhcmdldCwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xuICAgIGNvcHlUd2Vha1NvdXJjZShzb3VyY2UsIHN0YWdlZFRhcmdldCk7XG4gICAgY29uc3Qgc3RhZ2VkRmlsZXMgPSBoYXNoVHdlYWtTb3VyY2Uoc3RhZ2VkVGFyZ2V0KTtcbiAgICB3cml0ZUZpbGVTeW5jKFxuICAgICAgam9pbihzdGFnZWRUYXJnZXQsIFwiLmNvZGV4cHAtc3RvcmUuanNvblwiKSxcbiAgICAgIEpTT04uc3RyaW5naWZ5KFxuICAgICAgICB7XG4gICAgICAgICAgcmVwbzogZW50cnkucmVwbyxcbiAgICAgICAgICBhcHByb3ZlZENvbW1pdFNoYTogZW50cnkuYXBwcm92ZWRDb21taXRTaGEsXG4gICAgICAgICAgaW5zdGFsbGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICBzdG9yZUluZGV4VXJsOiBUV0VBS19TVE9SRV9JTkRFWF9VUkwsXG4gICAgICAgICAgZmlsZXM6IHN0YWdlZEZpbGVzLFxuICAgICAgICB9LFxuICAgICAgICBudWxsLFxuICAgICAgICAyLFxuICAgICAgKSxcbiAgICApO1xuICAgIGF3YWl0IGFzc2VydFN0b3JlVHdlYWtDbGVhbkZvckF1dG9VcGRhdGUoZW50cnksIHRhcmdldCwgd29yayk7XG4gICAgcm1TeW5jKHRhcmdldCwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xuICAgIGNwU3luYyhzdGFnZWRUYXJnZXQsIHRhcmdldCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gIH0gZmluYWxseSB7XG4gICAgcm1TeW5jKHdvcmssIHsgcmVjdXJzaXZlOiB0cnVlLCBmb3JjZTogdHJ1ZSB9KTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBwcmVwYXJlVHdlYWtTdG9yZVN1Ym1pc3Npb24ocmVwb0lucHV0OiBzdHJpbmcpOiBQcm9taXNlPFR3ZWFrU3RvcmVQdWJsaXNoU3VibWlzc2lvbj4ge1xuICBjb25zdCByZXBvID0gbm9ybWFsaXplR2l0SHViUmVwbyhyZXBvSW5wdXQpO1xuICBjb25zdCByZXBvSW5mbyA9IGF3YWl0IGZldGNoR2l0aHViSnNvbjx7IGRlZmF1bHRfYnJhbmNoPzogc3RyaW5nIH0+KGBodHRwczovL2FwaS5naXRodWIuY29tL3JlcG9zLyR7cmVwb31gKTtcbiAgY29uc3QgZGVmYXVsdEJyYW5jaCA9IHJlcG9JbmZvLmRlZmF1bHRfYnJhbmNoO1xuICBpZiAoIWRlZmF1bHRCcmFuY2gpIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlc29sdmUgZGVmYXVsdCBicmFuY2ggZm9yICR7cmVwb31gKTtcblxuICBjb25zdCBjb21taXQgPSBhd2FpdCBmZXRjaEdpdGh1Ykpzb248e1xuICAgIHNoYT86IHN0cmluZztcbiAgICBodG1sX3VybD86IHN0cmluZztcbiAgfT4oYGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvJHtyZXBvfS9jb21taXRzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGRlZmF1bHRCcmFuY2gpfWApO1xuICBpZiAoIWNvbW1pdC5zaGEpIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlc29sdmUgY3VycmVudCBjb21taXQgZm9yICR7cmVwb31gKTtcblxuICBjb25zdCBtYW5pZmVzdCA9IGF3YWl0IGZldGNoTWFuaWZlc3RBdENvbW1pdChyZXBvLCBjb21taXQuc2hhKS5jYXRjaCgoZSkgPT4ge1xuICAgIGxvZyhcIndhcm5cIiwgYGNvdWxkIG5vdCByZWFkIG1hbmlmZXN0IGZvciBzdG9yZSBzdWJtaXNzaW9uICR7cmVwb31AJHtjb21taXQuc2hhfTpgLCBlKTtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9KTtcblxuICByZXR1cm4ge1xuICAgIHJlcG8sXG4gICAgZGVmYXVsdEJyYW5jaCxcbiAgICBjb21taXRTaGE6IGNvbW1pdC5zaGEsXG4gICAgY29tbWl0VXJsOiBjb21taXQuaHRtbF91cmwgPz8gYGh0dHBzOi8vZ2l0aHViLmNvbS8ke3JlcG99L2NvbW1pdC8ke2NvbW1pdC5zaGF9YCxcbiAgICBtYW5pZmVzdDogbWFuaWZlc3RcbiAgICAgID8ge1xuICAgICAgICAgIGlkOiB0eXBlb2YgbWFuaWZlc3QuaWQgPT09IFwic3RyaW5nXCIgPyBtYW5pZmVzdC5pZCA6IHVuZGVmaW5lZCxcbiAgICAgICAgICBuYW1lOiB0eXBlb2YgbWFuaWZlc3QubmFtZSA9PT0gXCJzdHJpbmdcIiA/IG1hbmlmZXN0Lm5hbWUgOiB1bmRlZmluZWQsXG4gICAgICAgICAgdmVyc2lvbjogdHlwZW9mIG1hbmlmZXN0LnZlcnNpb24gPT09IFwic3RyaW5nXCIgPyBtYW5pZmVzdC52ZXJzaW9uIDogdW5kZWZpbmVkLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiB0eXBlb2YgbWFuaWZlc3QuZGVzY3JpcHRpb24gPT09IFwic3RyaW5nXCIgPyBtYW5pZmVzdC5kZXNjcmlwdGlvbiA6IHVuZGVmaW5lZCxcbiAgICAgICAgICBpY29uVXJsOiB0eXBlb2YgbWFuaWZlc3QuaWNvblVybCA9PT0gXCJzdHJpbmdcIiA/IG1hbmlmZXN0Lmljb25VcmwgOiB1bmRlZmluZWQsXG4gICAgICAgIH1cbiAgICAgIDogdW5kZWZpbmVkLFxuICB9O1xufVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaEdpdGh1Ykpzb248VD4odXJsOiBzdHJpbmcpOiBQcm9taXNlPFQ+IHtcbiAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgY29uc3QgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4gY29udHJvbGxlci5hYm9ydCgpLCA4MDAwKTtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJBY2NlcHRcIjogXCJhcHBsaWNhdGlvbi92bmQuZ2l0aHViK2pzb25cIixcbiAgICAgICAgXCJVc2VyLUFnZW50XCI6IGBjb2RleC1wbHVzcGx1cy8ke0NPREVYX1BMVVNQTFVTX1ZFUlNJT059YCxcbiAgICAgIH0sXG4gICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLFxuICAgIH0pO1xuICAgIGlmICghcmVzLm9rKSB0aHJvdyBuZXcgRXJyb3IoYEdpdEh1YiByZXR1cm5lZCAke3Jlcy5zdGF0dXN9YCk7XG4gICAgcmV0dXJuIGF3YWl0IHJlcy5qc29uKCkgYXMgVDtcbiAgfSBmaW5hbGx5IHtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hNYW5pZmVzdEF0Q29tbWl0KHJlcG86IHN0cmluZywgY29tbWl0U2hhOiBzdHJpbmcpOiBQcm9taXNlPFBhcnRpYWw8VHdlYWtNYW5pZmVzdD4+IHtcbiAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goYGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS8ke3JlcG99LyR7Y29tbWl0U2hhfS9tYW5pZmVzdC5qc29uYCwge1xuICAgIGhlYWRlcnM6IHtcbiAgICAgIFwiQWNjZXB0XCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgXCJVc2VyLUFnZW50XCI6IGBjb2RleC1wbHVzcGx1cy8ke0NPREVYX1BMVVNQTFVTX1ZFUlNJT059YCxcbiAgICB9LFxuICB9KTtcbiAgaWYgKCFyZXMub2spIHRocm93IG5ldyBFcnJvcihgbWFuaWZlc3QgZmV0Y2ggcmV0dXJuZWQgJHtyZXMuc3RhdHVzfWApO1xuICByZXR1cm4gYXdhaXQgcmVzLmpzb24oKSBhcyBQYXJ0aWFsPFR3ZWFrTWFuaWZlc3Q+O1xufVxuXG5mdW5jdGlvbiBleHRyYWN0VGFyQXJjaGl2ZShhcmNoaXZlOiBzdHJpbmcsIHRhcmdldERpcjogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IHJlc3VsdCA9IHNwYXduU3luYyhcInRhclwiLCBbXCIteHpmXCIsIGFyY2hpdmUsIFwiLUNcIiwgdGFyZ2V0RGlyXSwge1xuICAgIGVuY29kaW5nOiBcInV0ZjhcIixcbiAgICBzdGRpbzogW1wiaWdub3JlXCIsIFwicGlwZVwiLCBcInBpcGVcIl0sXG4gIH0pO1xuICBpZiAocmVzdWx0LnN0YXR1cyAhPT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgdGFyIGV4dHJhY3Rpb24gZmFpbGVkOiAke3Jlc3VsdC5zdGRlcnIgfHwgcmVzdWx0LnN0ZG91dCB8fCByZXN1bHQuc3RhdHVzfWApO1xuICB9XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlU3RvcmVUd2Vha1NvdXJjZShlbnRyeTogVHdlYWtTdG9yZUVudHJ5LCBzb3VyY2U6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBtYW5pZmVzdFBhdGggPSBqb2luKHNvdXJjZSwgXCJtYW5pZmVzdC5qc29uXCIpO1xuICBjb25zdCBtYW5pZmVzdCA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKG1hbmlmZXN0UGF0aCwgXCJ1dGY4XCIpKSBhcyBUd2Vha01hbmlmZXN0O1xuICBpZiAobWFuaWZlc3QuaWQgIT09IGVudHJ5Lm1hbmlmZXN0LmlkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBkb3dubG9hZGVkIHR3ZWFrIGlkICR7bWFuaWZlc3QuaWR9IGRvZXMgbm90IG1hdGNoIGFwcHJvdmVkIGlkICR7ZW50cnkubWFuaWZlc3QuaWR9YCk7XG4gIH1cbiAgaWYgKG1hbmlmZXN0LmdpdGh1YlJlcG8gIT09IGVudHJ5LnJlcG8pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGRvd25sb2FkZWQgdHdlYWsgcmVwbyAke21hbmlmZXN0LmdpdGh1YlJlcG99IGRvZXMgbm90IG1hdGNoIGFwcHJvdmVkIHJlcG8gJHtlbnRyeS5yZXBvfWApO1xuICB9XG4gIGlmIChtYW5pZmVzdC52ZXJzaW9uICE9PSBlbnRyeS5tYW5pZmVzdC52ZXJzaW9uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBkb3dubG9hZGVkIHR3ZWFrIHZlcnNpb24gJHttYW5pZmVzdC52ZXJzaW9ufSBkb2VzIG5vdCBtYXRjaCBhcHByb3ZlZCB2ZXJzaW9uICR7ZW50cnkubWFuaWZlc3QudmVyc2lvbn1gKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kVHdlYWtSb290KGRpcjogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGlmICghZXhpc3RzU3luYyhkaXIpKSByZXR1cm4gbnVsbDtcbiAgaWYgKGV4aXN0c1N5bmMoam9pbihkaXIsIFwibWFuaWZlc3QuanNvblwiKSkpIHJldHVybiBkaXI7XG4gIGZvciAoY29uc3QgbmFtZSBvZiByZWFkZGlyU3luYyhkaXIpKSB7XG4gICAgY29uc3QgY2hpbGQgPSBqb2luKGRpciwgbmFtZSk7XG4gICAgdHJ5IHtcbiAgICAgIGlmICghc3RhdFN5bmMoY2hpbGQpLmlzRGlyZWN0b3J5KCkpIGNvbnRpbnVlO1xuICAgIH0gY2F0Y2gge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IGZvdW5kID0gZmluZFR3ZWFrUm9vdChjaGlsZCk7XG4gICAgaWYgKGZvdW5kKSByZXR1cm4gZm91bmQ7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGNvcHlUd2Vha1NvdXJjZShzb3VyY2U6IHN0cmluZywgdGFyZ2V0OiBzdHJpbmcpOiB2b2lkIHtcbiAgY3BTeW5jKHNvdXJjZSwgdGFyZ2V0LCB7XG4gICAgcmVjdXJzaXZlOiB0cnVlLFxuICAgIGZpbHRlcjogKHNyYykgPT4gIS8oXnxbL1xcXFxdKSg/OlxcLmdpdHxub2RlX21vZHVsZXMpKD86Wy9cXFxcXXwkKS8udGVzdChzcmMpLFxuICB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gYXNzZXJ0U3RvcmVUd2Vha0NsZWFuRm9yQXV0b1VwZGF0ZShcbiAgZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSxcbiAgdGFyZ2V0OiBzdHJpbmcsXG4gIHdvcms6IHN0cmluZyxcbik6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoIWV4aXN0c1N5bmModGFyZ2V0KSkgcmV0dXJuO1xuICBjb25zdCBtZXRhZGF0YSA9IHJlYWRTdG9yZUluc3RhbGxNZXRhZGF0YSh0YXJnZXQpO1xuICBpZiAoIW1ldGFkYXRhKSByZXR1cm47XG4gIGlmIChtZXRhZGF0YS5yZXBvICE9PSBlbnRyeS5yZXBvKSB7XG4gICAgdGhyb3cgbmV3IFN0b3JlVHdlYWtNb2RpZmllZEVycm9yKGVudHJ5Lm1hbmlmZXN0Lm5hbWUpO1xuICB9XG4gIGNvbnN0IGN1cnJlbnRGaWxlcyA9IGhhc2hUd2Vha1NvdXJjZSh0YXJnZXQpO1xuICBjb25zdCBiYXNlbGluZUZpbGVzID0gbWV0YWRhdGEuZmlsZXMgPz8gYXdhaXQgZmV0Y2hCYXNlbGluZVN0b3JlVHdlYWtIYXNoZXMobWV0YWRhdGEsIHdvcmspO1xuICBpZiAoIXNhbWVGaWxlSGFzaGVzKGN1cnJlbnRGaWxlcywgYmFzZWxpbmVGaWxlcykpIHtcbiAgICB0aHJvdyBuZXcgU3RvcmVUd2Vha01vZGlmaWVkRXJyb3IoZW50cnkubWFuaWZlc3QubmFtZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVhZFN0b3JlSW5zdGFsbE1ldGFkYXRhKHRhcmdldDogc3RyaW5nKTogU3RvcmVJbnN0YWxsTWV0YWRhdGEgfCBudWxsIHtcbiAgY29uc3QgbWV0YWRhdGFQYXRoID0gam9pbih0YXJnZXQsIFwiLmNvZGV4cHAtc3RvcmUuanNvblwiKTtcbiAgaWYgKCFleGlzdHNTeW5jKG1ldGFkYXRhUGF0aCkpIHJldHVybiBudWxsO1xuICB0cnkge1xuICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKG1ldGFkYXRhUGF0aCwgXCJ1dGY4XCIpKSBhcyBQYXJ0aWFsPFN0b3JlSW5zdGFsbE1ldGFkYXRhPjtcbiAgICBpZiAodHlwZW9mIHBhcnNlZC5yZXBvICE9PSBcInN0cmluZ1wiIHx8IHR5cGVvZiBwYXJzZWQuYXBwcm92ZWRDb21taXRTaGEgIT09IFwic3RyaW5nXCIpIHJldHVybiBudWxsO1xuICAgIHJldHVybiB7XG4gICAgICByZXBvOiBwYXJzZWQucmVwbyxcbiAgICAgIGFwcHJvdmVkQ29tbWl0U2hhOiBwYXJzZWQuYXBwcm92ZWRDb21taXRTaGEsXG4gICAgICBpbnN0YWxsZWRBdDogdHlwZW9mIHBhcnNlZC5pbnN0YWxsZWRBdCA9PT0gXCJzdHJpbmdcIiA/IHBhcnNlZC5pbnN0YWxsZWRBdCA6IFwiXCIsXG4gICAgICBzdG9yZUluZGV4VXJsOiB0eXBlb2YgcGFyc2VkLnN0b3JlSW5kZXhVcmwgPT09IFwic3RyaW5nXCIgPyBwYXJzZWQuc3RvcmVJbmRleFVybCA6IFwiXCIsXG4gICAgICBmaWxlczogaXNIYXNoUmVjb3JkKHBhcnNlZC5maWxlcykgPyBwYXJzZWQuZmlsZXMgOiB1bmRlZmluZWQsXG4gICAgfTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hCYXNlbGluZVN0b3JlVHdlYWtIYXNoZXMoXG4gIG1ldGFkYXRhOiBTdG9yZUluc3RhbGxNZXRhZGF0YSxcbiAgd29yazogc3RyaW5nLFxuKTogUHJvbWlzZTxSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+PiB7XG4gIGNvbnN0IGJhc2VsaW5lRGlyID0gam9pbih3b3JrLCBcImJhc2VsaW5lXCIpO1xuICBjb25zdCBhcmNoaXZlID0gam9pbih3b3JrLCBcImJhc2VsaW5lLnRhci5nelwiKTtcbiAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goYGh0dHBzOi8vY29kZWxvYWQuZ2l0aHViLmNvbS8ke21ldGFkYXRhLnJlcG99L3Rhci5nei8ke21ldGFkYXRhLmFwcHJvdmVkQ29tbWl0U2hhfWAsIHtcbiAgICBoZWFkZXJzOiB7IFwiVXNlci1BZ2VudFwiOiBgY29kZXgtcGx1c3BsdXMvJHtDT0RFWF9QTFVTUExVU19WRVJTSU9OfWAgfSxcbiAgICByZWRpcmVjdDogXCJmb2xsb3dcIixcbiAgfSk7XG4gIGlmICghcmVzLm9rKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCB2ZXJpZnkgbG9jYWwgdHdlYWsgY2hhbmdlcyBiZWZvcmUgdXBkYXRlOiAke3Jlcy5zdGF0dXN9YCk7XG4gIHdyaXRlRmlsZVN5bmMoYXJjaGl2ZSwgQnVmZmVyLmZyb20oYXdhaXQgcmVzLmFycmF5QnVmZmVyKCkpKTtcbiAgbWtkaXJTeW5jKGJhc2VsaW5lRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgZXh0cmFjdFRhckFyY2hpdmUoYXJjaGl2ZSwgYmFzZWxpbmVEaXIpO1xuICBjb25zdCBzb3VyY2UgPSBmaW5kVHdlYWtSb290KGJhc2VsaW5lRGlyKTtcbiAgaWYgKCFzb3VyY2UpIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCB2ZXJpZnkgbG9jYWwgdHdlYWsgY2hhbmdlcyBiZWZvcmUgdXBkYXRlOiBiYXNlbGluZSBtYW5pZmVzdCBtaXNzaW5nXCIpO1xuICByZXR1cm4gaGFzaFR3ZWFrU291cmNlKHNvdXJjZSk7XG59XG5cbmZ1bmN0aW9uIGhhc2hUd2Vha1NvdXJjZShyb290OiBzdHJpbmcpOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHtcbiAgY29uc3Qgb3V0OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gIGNvbGxlY3RUd2Vha0ZpbGVIYXNoZXMocm9vdCwgcm9vdCwgb3V0KTtcbiAgcmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gY29sbGVjdFR3ZWFrRmlsZUhhc2hlcyhyb290OiBzdHJpbmcsIGRpcjogc3RyaW5nLCBvdXQ6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBuYW1lIG9mIHJlYWRkaXJTeW5jKGRpcikuc29ydCgpKSB7XG4gICAgaWYgKG5hbWUgPT09IFwiLmdpdFwiIHx8IG5hbWUgPT09IFwibm9kZV9tb2R1bGVzXCIgfHwgbmFtZSA9PT0gXCIuY29kZXhwcC1zdG9yZS5qc29uXCIpIGNvbnRpbnVlO1xuICAgIGNvbnN0IGZ1bGwgPSBqb2luKGRpciwgbmFtZSk7XG4gICAgY29uc3QgcmVsID0gcmVsYXRpdmUocm9vdCwgZnVsbCkuc3BsaXQoXCJcXFxcXCIpLmpvaW4oXCIvXCIpO1xuICAgIGNvbnN0IHN0YXQgPSBzdGF0U3luYyhmdWxsKTtcbiAgICBpZiAoc3RhdC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICBjb2xsZWN0VHdlYWtGaWxlSGFzaGVzKHJvb3QsIGZ1bGwsIG91dCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKCFzdGF0LmlzRmlsZSgpKSBjb250aW51ZTtcbiAgICBvdXRbcmVsXSA9IGNyZWF0ZUhhc2goXCJzaGEyNTZcIikudXBkYXRlKHJlYWRGaWxlU3luYyhmdWxsKSkuZGlnZXN0KFwiaGV4XCIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNhbWVGaWxlSGFzaGVzKGE6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4sIGI6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pOiBib29sZWFuIHtcbiAgY29uc3QgYWsgPSBPYmplY3Qua2V5cyhhKS5zb3J0KCk7XG4gIGNvbnN0IGJrID0gT2JqZWN0LmtleXMoYikuc29ydCgpO1xuICBpZiAoYWsubGVuZ3RoICE9PSBiay5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBhay5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGtleSA9IGFrW2ldO1xuICAgIGlmIChrZXkgIT09IGJrW2ldIHx8IGFba2V5XSAhPT0gYltrZXldKSByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGlzSGFzaFJlY29yZCh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4ge1xuICBpZiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZSAhPT0gXCJvYmplY3RcIiB8fCBBcnJheS5pc0FycmF5KHZhbHVlKSkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gT2JqZWN0LnZhbHVlcyh2YWx1ZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikuZXZlcnkoKHYpID0+IHR5cGVvZiB2ID09PSBcInN0cmluZ1wiKTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplVmVyc2lvbih2OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdi50cmltKCkucmVwbGFjZSgvXnYvaSwgXCJcIik7XG59XG5cbmZ1bmN0aW9uIGNvbXBhcmVWZXJzaW9ucyhhOiBzdHJpbmcsIGI6IHN0cmluZyk6IG51bWJlciB7XG4gIGNvbnN0IGF2ID0gVkVSU0lPTl9SRS5leGVjKGEpO1xuICBjb25zdCBidiA9IFZFUlNJT05fUkUuZXhlYyhiKTtcbiAgaWYgKCFhdiB8fCAhYnYpIHJldHVybiAwO1xuICBmb3IgKGxldCBpID0gMTsgaSA8PSAzOyBpKyspIHtcbiAgICBjb25zdCBkaWZmID0gTnVtYmVyKGF2W2ldKSAtIE51bWJlcihidltpXSk7XG4gICAgaWYgKGRpZmYgIT09IDApIHJldHVybiBkaWZmO1xuICB9XG4gIHJldHVybiAwO1xufVxuXG5mdW5jdGlvbiBmYWxsYmFja1NvdXJjZVJvb3QoKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IGNhbmRpZGF0ZXMgPSBbXG4gICAgam9pbihob21lZGlyKCksIFwiLmNvZGV4LXBsdXNwbHVzXCIsIFwic291cmNlXCIpLFxuICAgIGpvaW4odXNlclJvb3QhLCBcInNvdXJjZVwiKSxcbiAgXTtcbiAgZm9yIChjb25zdCBjYW5kaWRhdGUgb2YgY2FuZGlkYXRlcykge1xuICAgIGlmIChleGlzdHNTeW5jKGpvaW4oY2FuZGlkYXRlLCBcInBhY2thZ2VzXCIsIFwiaW5zdGFsbGVyXCIsIFwiZGlzdFwiLCBcImNsaS5qc1wiKSkpIHJldHVybiBjYW5kaWRhdGU7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGRlc2NyaWJlSW5zdGFsbGF0aW9uU291cmNlKHNvdXJjZVJvb3Q6IHN0cmluZyB8IG51bGwpOiBJbnN0YWxsYXRpb25Tb3VyY2Uge1xuICBpZiAoIXNvdXJjZVJvb3QpIHtcbiAgICByZXR1cm4ge1xuICAgICAga2luZDogXCJ1bmtub3duXCIsXG4gICAgICBsYWJlbDogXCJVbmtub3duXCIsXG4gICAgICBkZXRhaWw6IFwiQ29kZXgrKyBzb3VyY2UgbG9jYXRpb24gaXMgbm90IHJlY29yZGVkIHlldC5cIixcbiAgICB9O1xuICB9XG4gIGNvbnN0IG5vcm1hbGl6ZWQgPSBzb3VyY2VSb290LnJlcGxhY2UoL1xcXFwvZywgXCIvXCIpO1xuICBpZiAoL1xcLyg/OkhvbWVicmV3fGhvbWVicmV3KVxcL0NlbGxhclxcL2NvZGV4cGx1c3BsdXNcXC8vLnRlc3Qobm9ybWFsaXplZCkpIHtcbiAgICByZXR1cm4geyBraW5kOiBcImhvbWVicmV3XCIsIGxhYmVsOiBcIkhvbWVicmV3XCIsIGRldGFpbDogc291cmNlUm9vdCB9O1xuICB9XG4gIGlmIChleGlzdHNTeW5jKGpvaW4oc291cmNlUm9vdCwgXCIuZ2l0XCIpKSkge1xuICAgIHJldHVybiB7IGtpbmQ6IFwibG9jYWwtZGV2XCIsIGxhYmVsOiBcIkxvY2FsIGRldmVsb3BtZW50IGNoZWNrb3V0XCIsIGRldGFpbDogc291cmNlUm9vdCB9O1xuICB9XG4gIGlmIChub3JtYWxpemVkLmVuZHNXaXRoKFwiLy5jb2RleC1wbHVzcGx1cy9zb3VyY2VcIikgfHwgbm9ybWFsaXplZC5pbmNsdWRlcyhcIi8uY29kZXgtcGx1c3BsdXMvc291cmNlL1wiKSkge1xuICAgIHJldHVybiB7IGtpbmQ6IFwiZ2l0aHViLXNvdXJjZVwiLCBsYWJlbDogXCJHaXRIdWIgc291cmNlIGluc3RhbGxlclwiLCBkZXRhaWw6IHNvdXJjZVJvb3QgfTtcbiAgfVxuICBpZiAoZXhpc3RzU3luYyhqb2luKHNvdXJjZVJvb3QsIFwicGFja2FnZS5qc29uXCIpKSkge1xuICAgIHJldHVybiB7IGtpbmQ6IFwic291cmNlLWFyY2hpdmVcIiwgbGFiZWw6IFwiU291cmNlIGFyY2hpdmVcIiwgZGV0YWlsOiBzb3VyY2VSb290IH07XG4gIH1cbiAgcmV0dXJuIHsga2luZDogXCJ1bmtub3duXCIsIGxhYmVsOiBcIlVua25vd25cIiwgZGV0YWlsOiBzb3VyY2VSb290IH07XG59XG5cbmZ1bmN0aW9uIHJ1bkluc3RhbGxlZENsaShjbGk6IHN0cmluZywgYXJnczogc3RyaW5nW10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlUnVuLCByZWplY3RSdW4pID0+IHtcbiAgICBjb25zdCBjaGlsZCA9IHNwYXduKHByb2Nlc3MuZXhlY1BhdGgsIFtjbGksIC4uLmFyZ3NdLCB7XG4gICAgICBjd2Q6IHJlc29sdmUoZGlybmFtZShjbGkpLCBcIi4uXCIsIFwiLi5cIiwgXCIuLlwiKSxcbiAgICAgIGVudjogeyAuLi5wcm9jZXNzLmVudiwgQ09ERVhfUExVU1BMVVNfTUFOVUFMX1VQREFURTogXCIxXCIgfSxcbiAgICAgIHN0ZGlvOiBbXCJpZ25vcmVcIiwgXCJwaXBlXCIsIFwicGlwZVwiXSxcbiAgICB9KTtcbiAgICBsZXQgb3V0cHV0ID0gXCJcIjtcbiAgICBjaGlsZC5zdGRvdXQ/Lm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IHtcbiAgICAgIG91dHB1dCArPSBTdHJpbmcoY2h1bmspO1xuICAgIH0pO1xuICAgIGNoaWxkLnN0ZGVycj8ub24oXCJkYXRhXCIsIChjaHVuaykgPT4ge1xuICAgICAgb3V0cHV0ICs9IFN0cmluZyhjaHVuayk7XG4gICAgfSk7XG4gICAgY2hpbGQub24oXCJlcnJvclwiLCByZWplY3RSdW4pO1xuICAgIGNoaWxkLm9uKFwiY2xvc2VcIiwgKGNvZGUpID0+IHtcbiAgICAgIGlmIChjb2RlID09PSAwKSB7XG4gICAgICAgIHJlc29sdmVSdW4oKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgdGFpbCA9IG91dHB1dC50cmltKCkuc3BsaXQoL1xccj9cXG4vKS5zbGljZSgtMTIpLmpvaW4oXCJcXG5cIik7XG4gICAgICByZWplY3RSdW4obmV3IEVycm9yKHRhaWwgfHwgYGNvZGV4cGx1c3BsdXMgJHthcmdzLmpvaW4oXCIgXCIpfSBmYWlsZWQgd2l0aCBleGl0IGNvZGUgJHtjb2RlfWApKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGJyb2FkY2FzdFJlbG9hZCgpOiB2b2lkIHtcbiAgY29uc3QgcGF5bG9hZCA9IHtcbiAgICBhdDogRGF0ZS5ub3coKSxcbiAgICB0d2Vha3M6IHR3ZWFrU3RhdGUuZGlzY292ZXJlZC5tYXAoKHQpID0+IHQubWFuaWZlc3QuaWQpLFxuICB9O1xuICBmb3IgKGNvbnN0IHdjIG9mIHdlYkNvbnRlbnRzLmdldEFsbFdlYkNvbnRlbnRzKCkpIHtcbiAgICB0cnkge1xuICAgICAgd2Muc2VuZChcImNvZGV4cHA6dHdlYWtzLWNoYW5nZWRcIiwgcGF5bG9hZCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nKFwid2FyblwiLCBcImJyb2FkY2FzdCBzZW5kIGZhaWxlZDpcIiwgZSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG1ha2VMb2dnZXIoc2NvcGU6IHN0cmluZykge1xuICByZXR1cm4ge1xuICAgIGRlYnVnOiAoLi4uYTogdW5rbm93bltdKSA9PiBsb2coXCJpbmZvXCIsIGBbJHtzY29wZX1dYCwgLi4uYSksXG4gICAgaW5mbzogKC4uLmE6IHVua25vd25bXSkgPT4gbG9nKFwiaW5mb1wiLCBgWyR7c2NvcGV9XWAsIC4uLmEpLFxuICAgIHdhcm46ICguLi5hOiB1bmtub3duW10pID0+IGxvZyhcIndhcm5cIiwgYFske3Njb3BlfV1gLCAuLi5hKSxcbiAgICBlcnJvcjogKC4uLmE6IHVua25vd25bXSkgPT4gbG9nKFwiZXJyb3JcIiwgYFske3Njb3BlfV1gLCAuLi5hKSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gbWFrZU1haW5JcGMoaWQ6IHN0cmluZykge1xuICBjb25zdCBjaCA9IChjOiBzdHJpbmcpID0+IGBjb2RleHBwOiR7aWR9OiR7Y31gO1xuICByZXR1cm4ge1xuICAgIG9uOiAoYzogc3RyaW5nLCBoOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKSA9PiB7XG4gICAgICBjb25zdCB3cmFwcGVkID0gKF9lOiB1bmtub3duLCAuLi5hcmdzOiB1bmtub3duW10pID0+IGgoLi4uYXJncyk7XG4gICAgICBpcGNNYWluLm9uKGNoKGMpLCB3cmFwcGVkKTtcbiAgICAgIHJldHVybiAoKSA9PiBpcGNNYWluLnJlbW92ZUxpc3RlbmVyKGNoKGMpLCB3cmFwcGVkIGFzIG5ldmVyKTtcbiAgICB9LFxuICAgIHNlbmQ6IChfYzogc3RyaW5nKSA9PiB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpcGMuc2VuZCBpcyByZW5kZXJlclx1MjE5Mm1haW47IG1haW4gc2lkZSB1c2VzIGhhbmRsZS9vblwiKTtcbiAgICB9LFxuICAgIGludm9rZTogKF9jOiBzdHJpbmcpID0+IHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImlwYy5pbnZva2UgaXMgcmVuZGVyZXJcdTIxOTJtYWluOyBtYWluIHNpZGUgdXNlcyBoYW5kbGVcIik7XG4gICAgfSxcbiAgICBoYW5kbGU6IChjOiBzdHJpbmcsIGhhbmRsZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHVua25vd24pID0+IHtcbiAgICAgIGlwY01haW4uaGFuZGxlKGNoKGMpLCAoX2U6IHVua25vd24sIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gaGFuZGxlciguLi5hcmdzKSk7XG4gICAgfSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gbWFrZU1haW5GcyhpZDogc3RyaW5nKSB7XG4gIGNvbnN0IGRpciA9IGpvaW4odXNlclJvb3QhLCBcInR3ZWFrLWRhdGFcIiwgaWQpO1xuICBta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgY29uc3QgZnMgPSByZXF1aXJlKFwibm9kZTpmcy9wcm9taXNlc1wiKSBhcyB0eXBlb2YgaW1wb3J0KFwibm9kZTpmcy9wcm9taXNlc1wiKTtcbiAgcmV0dXJuIHtcbiAgICBkYXRhRGlyOiBkaXIsXG4gICAgcmVhZDogKHA6IHN0cmluZykgPT4gZnMucmVhZEZpbGUoam9pbihkaXIsIHApLCBcInV0ZjhcIiksXG4gICAgd3JpdGU6IChwOiBzdHJpbmcsIGM6IHN0cmluZykgPT4gZnMud3JpdGVGaWxlKGpvaW4oZGlyLCBwKSwgYywgXCJ1dGY4XCIpLFxuICAgIGV4aXN0czogYXN5bmMgKHA6IHN0cmluZykgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZnMuYWNjZXNzKGpvaW4oZGlyLCBwKSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9LFxuICB9O1xufVxuXG5mdW5jdGlvbiBtYWtlQ29kZXhBcGkoKSB7XG4gIHJldHVybiB7XG4gICAgY3JlYXRlQnJvd3NlclZpZXc6IGFzeW5jIChvcHRzOiBDb2RleENyZWF0ZVZpZXdPcHRpb25zKSA9PiB7XG4gICAgICBjb25zdCBzZXJ2aWNlcyA9IGdldENvZGV4V2luZG93U2VydmljZXMoKTtcbiAgICAgIGNvbnN0IHdpbmRvd01hbmFnZXIgPSBzZXJ2aWNlcz8ud2luZG93TWFuYWdlcjtcbiAgICAgIGlmICghc2VydmljZXMgfHwgIXdpbmRvd01hbmFnZXI/LnJlZ2lzdGVyV2luZG93KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBcIkNvZGV4IGVtYmVkZGVkIHZpZXcgc2VydmljZXMgYXJlIG5vdCBhdmFpbGFibGUuIFJlaW5zdGFsbCBDb2RleCsrIDAuMS4xIG9yIGxhdGVyLlwiLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByb3V0ZSA9IG5vcm1hbGl6ZUNvZGV4Um91dGUob3B0cy5yb3V0ZSk7XG4gICAgICBjb25zdCBob3N0SWQgPSBvcHRzLmhvc3RJZCB8fCBcImxvY2FsXCI7XG4gICAgICBjb25zdCBhcHBlYXJhbmNlID0gb3B0cy5hcHBlYXJhbmNlIHx8IFwic2Vjb25kYXJ5XCI7XG4gICAgICBjb25zdCB2aWV3ID0gbmV3IEJyb3dzZXJWaWV3KHtcbiAgICAgICAgd2ViUHJlZmVyZW5jZXM6IHtcbiAgICAgICAgICBwcmVsb2FkOiB3aW5kb3dNYW5hZ2VyLm9wdGlvbnM/LnByZWxvYWRQYXRoLFxuICAgICAgICAgIGNvbnRleHRJc29sYXRpb246IHRydWUsXG4gICAgICAgICAgbm9kZUludGVncmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICBzcGVsbGNoZWNrOiBmYWxzZSxcbiAgICAgICAgICBkZXZUb29sczogd2luZG93TWFuYWdlci5vcHRpb25zPy5hbGxvd0RldnRvb2xzLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgICBjb25zdCB3aW5kb3dMaWtlID0gbWFrZVdpbmRvd0xpa2VGb3JWaWV3KHZpZXcpO1xuICAgICAgd2luZG93TWFuYWdlci5yZWdpc3RlcldpbmRvdyh3aW5kb3dMaWtlLCBob3N0SWQsIGZhbHNlLCBhcHBlYXJhbmNlKTtcbiAgICAgIHNlcnZpY2VzLmdldENvbnRleHQ/Lihob3N0SWQpPy5yZWdpc3RlcldpbmRvdz8uKHdpbmRvd0xpa2UpO1xuICAgICAgYXdhaXQgdmlldy53ZWJDb250ZW50cy5sb2FkVVJMKGNvZGV4QXBwVXJsKHJvdXRlLCBob3N0SWQpKTtcbiAgICAgIHJldHVybiB2aWV3O1xuICAgIH0sXG5cbiAgICBjcmVhdGVXaW5kb3c6IGFzeW5jIChvcHRzOiBDb2RleENyZWF0ZVdpbmRvd09wdGlvbnMpID0+IHtcbiAgICAgIGNvbnN0IHNlcnZpY2VzID0gZ2V0Q29kZXhXaW5kb3dTZXJ2aWNlcygpO1xuICAgICAgaWYgKCFzZXJ2aWNlcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgXCJDb2RleCB3aW5kb3cgc2VydmljZXMgYXJlIG5vdCBhdmFpbGFibGUuIFJlaW5zdGFsbCBDb2RleCsrIDAuMS4xIG9yIGxhdGVyLlwiLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByb3V0ZSA9IG5vcm1hbGl6ZUNvZGV4Um91dGUob3B0cy5yb3V0ZSk7XG4gICAgICBjb25zdCBob3N0SWQgPSBvcHRzLmhvc3RJZCB8fCBcImxvY2FsXCI7XG4gICAgICBjb25zdCBwYXJlbnQgPSB0eXBlb2Ygb3B0cy5wYXJlbnRXaW5kb3dJZCA9PT0gXCJudW1iZXJcIlxuICAgICAgICA/IEJyb3dzZXJXaW5kb3cuZnJvbUlkKG9wdHMucGFyZW50V2luZG93SWQpXG4gICAgICAgIDogQnJvd3NlcldpbmRvdy5nZXRGb2N1c2VkV2luZG93KCk7XG4gICAgICBjb25zdCBjcmVhdGVXaW5kb3cgPSBzZXJ2aWNlcy53aW5kb3dNYW5hZ2VyPy5jcmVhdGVXaW5kb3c7XG5cbiAgICAgIGxldCB3aW46IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsIHwgdW5kZWZpbmVkO1xuICAgICAgaWYgKHR5cGVvZiBjcmVhdGVXaW5kb3cgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICB3aW4gPSBhd2FpdCBjcmVhdGVXaW5kb3cuY2FsbChzZXJ2aWNlcy53aW5kb3dNYW5hZ2VyLCB7XG4gICAgICAgICAgaW5pdGlhbFJvdXRlOiByb3V0ZSxcbiAgICAgICAgICBob3N0SWQsXG4gICAgICAgICAgc2hvdzogb3B0cy5zaG93ICE9PSBmYWxzZSxcbiAgICAgICAgICBhcHBlYXJhbmNlOiBvcHRzLmFwcGVhcmFuY2UgfHwgXCJzZWNvbmRhcnlcIixcbiAgICAgICAgICBwYXJlbnQsXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChob3N0SWQgPT09IFwibG9jYWxcIiAmJiB0eXBlb2Ygc2VydmljZXMuY3JlYXRlRnJlc2hMb2NhbFdpbmRvdyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHdpbiA9IGF3YWl0IHNlcnZpY2VzLmNyZWF0ZUZyZXNoTG9jYWxXaW5kb3cocm91dGUpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygc2VydmljZXMuZW5zdXJlSG9zdFdpbmRvdyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHdpbiA9IGF3YWl0IHNlcnZpY2VzLmVuc3VyZUhvc3RXaW5kb3coaG9zdElkKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCF3aW4gfHwgd2luLmlzRGVzdHJveWVkKCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ29kZXggZGlkIG5vdCByZXR1cm4gYSB3aW5kb3cgZm9yIHRoZSByZXF1ZXN0ZWQgcm91dGVcIik7XG4gICAgICB9XG5cbiAgICAgIGlmIChvcHRzLmJvdW5kcykge1xuICAgICAgICB3aW4uc2V0Qm91bmRzKG9wdHMuYm91bmRzKTtcbiAgICAgIH1cbiAgICAgIGlmIChwYXJlbnQgJiYgIXBhcmVudC5pc0Rlc3Ryb3llZCgpKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgd2luLnNldFBhcmVudFdpbmRvdyhwYXJlbnQpO1xuICAgICAgICB9IGNhdGNoIHt9XG4gICAgICB9XG4gICAgICBpZiAob3B0cy5zaG93ICE9PSBmYWxzZSkge1xuICAgICAgICB3aW4uc2hvdygpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICB3aW5kb3dJZDogd2luLmlkLFxuICAgICAgICB3ZWJDb250ZW50c0lkOiB3aW4ud2ViQ29udGVudHMuaWQsXG4gICAgICB9O1xuICAgIH0sXG4gIH07XG59XG5cbmZ1bmN0aW9uIG1ha2VXaW5kb3dMaWtlRm9yVmlldyh2aWV3OiBFbGVjdHJvbi5Ccm93c2VyVmlldyk6IENvZGV4V2luZG93TGlrZSB7XG4gIGNvbnN0IHZpZXdCb3VuZHMgPSAoKSA9PiB2aWV3LmdldEJvdW5kcygpO1xuICByZXR1cm4ge1xuICAgIGlkOiB2aWV3LndlYkNvbnRlbnRzLmlkLFxuICAgIHdlYkNvbnRlbnRzOiB2aWV3LndlYkNvbnRlbnRzLFxuICAgIG9uOiAoZXZlbnQ6IFwiY2xvc2VkXCIsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKSA9PiB7XG4gICAgICBpZiAoZXZlbnQgPT09IFwiY2xvc2VkXCIpIHtcbiAgICAgICAgdmlldy53ZWJDb250ZW50cy5vbmNlKFwiZGVzdHJveWVkXCIsIGxpc3RlbmVyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZpZXcud2ViQ29udGVudHMub24oZXZlbnQsIGxpc3RlbmVyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB2aWV3O1xuICAgIH0sXG4gICAgb25jZTogKGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKSA9PiB7XG4gICAgICB2aWV3LndlYkNvbnRlbnRzLm9uY2UoZXZlbnQgYXMgXCJkZXN0cm95ZWRcIiwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHZpZXc7XG4gICAgfSxcbiAgICBvZmY6IChldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCkgPT4ge1xuICAgICAgdmlldy53ZWJDb250ZW50cy5vZmYoZXZlbnQgYXMgXCJkZXN0cm95ZWRcIiwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHZpZXc7XG4gICAgfSxcbiAgICByZW1vdmVMaXN0ZW5lcjogKGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKSA9PiB7XG4gICAgICB2aWV3LndlYkNvbnRlbnRzLnJlbW92ZUxpc3RlbmVyKGV2ZW50IGFzIFwiZGVzdHJveWVkXCIsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB2aWV3O1xuICAgIH0sXG4gICAgaXNEZXN0cm95ZWQ6ICgpID0+IHZpZXcud2ViQ29udGVudHMuaXNEZXN0cm95ZWQoKSxcbiAgICBpc0ZvY3VzZWQ6ICgpID0+IHZpZXcud2ViQ29udGVudHMuaXNGb2N1c2VkKCksXG4gICAgZm9jdXM6ICgpID0+IHZpZXcud2ViQ29udGVudHMuZm9jdXMoKSxcbiAgICBzaG93OiAoKSA9PiB7fSxcbiAgICBoaWRlOiAoKSA9PiB7fSxcbiAgICBnZXRCb3VuZHM6IHZpZXdCb3VuZHMsXG4gICAgZ2V0Q29udGVudEJvdW5kczogdmlld0JvdW5kcyxcbiAgICBnZXRTaXplOiAoKSA9PiB7XG4gICAgICBjb25zdCBiID0gdmlld0JvdW5kcygpO1xuICAgICAgcmV0dXJuIFtiLndpZHRoLCBiLmhlaWdodF07XG4gICAgfSxcbiAgICBnZXRDb250ZW50U2l6ZTogKCkgPT4ge1xuICAgICAgY29uc3QgYiA9IHZpZXdCb3VuZHMoKTtcbiAgICAgIHJldHVybiBbYi53aWR0aCwgYi5oZWlnaHRdO1xuICAgIH0sXG4gICAgc2V0VGl0bGU6ICgpID0+IHt9LFxuICAgIGdldFRpdGxlOiAoKSA9PiBcIlwiLFxuICAgIHNldFJlcHJlc2VudGVkRmlsZW5hbWU6ICgpID0+IHt9LFxuICAgIHNldERvY3VtZW50RWRpdGVkOiAoKSA9PiB7fSxcbiAgICBzZXRXaW5kb3dCdXR0b25WaXNpYmlsaXR5OiAoKSA9PiB7fSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gY29kZXhBcHBVcmwocm91dGU6IHN0cmluZywgaG9zdElkOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKFwiYXBwOi8vLS9pbmRleC5odG1sXCIpO1xuICB1cmwuc2VhcmNoUGFyYW1zLnNldChcImhvc3RJZFwiLCBob3N0SWQpO1xuICBpZiAocm91dGUgIT09IFwiL1wiKSB1cmwuc2VhcmNoUGFyYW1zLnNldChcImluaXRpYWxSb3V0ZVwiLCByb3V0ZSk7XG4gIHJldHVybiB1cmwudG9TdHJpbmcoKTtcbn1cblxuZnVuY3Rpb24gZ2V0Q29kZXhXaW5kb3dTZXJ2aWNlcygpOiBDb2RleFdpbmRvd1NlcnZpY2VzIHwgbnVsbCB7XG4gIGNvbnN0IHNlcnZpY2VzID0gKGdsb2JhbFRoaXMgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilbQ09ERVhfV0lORE9XX1NFUlZJQ0VTX0tFWV07XG4gIHJldHVybiBzZXJ2aWNlcyAmJiB0eXBlb2Ygc2VydmljZXMgPT09IFwib2JqZWN0XCIgPyAoc2VydmljZXMgYXMgQ29kZXhXaW5kb3dTZXJ2aWNlcykgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVDb2RleFJvdXRlKHJvdXRlOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAodHlwZW9mIHJvdXRlICE9PSBcInN0cmluZ1wiIHx8ICFyb3V0ZS5zdGFydHNXaXRoKFwiL1wiKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNvZGV4IHJvdXRlIG11c3QgYmUgYW4gYWJzb2x1dGUgYXBwIHJvdXRlXCIpO1xuICB9XG4gIGlmIChyb3V0ZS5pbmNsdWRlcyhcIjovL1wiKSB8fCByb3V0ZS5pbmNsdWRlcyhcIlxcblwiKSB8fCByb3V0ZS5pbmNsdWRlcyhcIlxcclwiKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNvZGV4IHJvdXRlIG11c3Qgbm90IGluY2x1ZGUgYSBwcm90b2NvbCBvciBjb250cm9sIGNoYXJhY3RlcnNcIik7XG4gIH1cbiAgcmV0dXJuIHJvdXRlO1xufVxuXG4vLyBUb3VjaCBCcm93c2VyV2luZG93IHRvIGtlZXAgaXRzIGltcG9ydCBcdTIwMTQgb2xkZXIgRWxlY3Ryb24gbGludCBydWxlcy5cbnZvaWQgQnJvd3NlcldpbmRvdztcbiIsICIvKiEgY2hva2lkYXIgLSBNSVQgTGljZW5zZSAoYykgMjAxMiBQYXVsIE1pbGxlciAocGF1bG1pbGxyLmNvbSkgKi9cbmltcG9ydCB7IHN0YXQgYXMgc3RhdGNiIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgc3RhdCwgcmVhZGRpciB9IGZyb20gJ2ZzL3Byb21pc2VzJztcbmltcG9ydCB7IEV2ZW50RW1pdHRlciB9IGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQgKiBhcyBzeXNQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgcmVhZGRpcnAgfSBmcm9tICdyZWFkZGlycCc7XG5pbXBvcnQgeyBOb2RlRnNIYW5kbGVyLCBFVkVOVFMgYXMgRVYsIGlzV2luZG93cywgaXNJQk1pLCBFTVBUWV9GTiwgU1RSX0NMT1NFLCBTVFJfRU5ELCB9IGZyb20gJy4vaGFuZGxlci5qcyc7XG5jb25zdCBTTEFTSCA9ICcvJztcbmNvbnN0IFNMQVNIX1NMQVNIID0gJy8vJztcbmNvbnN0IE9ORV9ET1QgPSAnLic7XG5jb25zdCBUV09fRE9UUyA9ICcuLic7XG5jb25zdCBTVFJJTkdfVFlQRSA9ICdzdHJpbmcnO1xuY29uc3QgQkFDS19TTEFTSF9SRSA9IC9cXFxcL2c7XG5jb25zdCBET1VCTEVfU0xBU0hfUkUgPSAvXFwvXFwvLztcbmNvbnN0IERPVF9SRSA9IC9cXC4uKlxcLihzd1tweF0pJHx+JHxcXC5zdWJsLipcXC50bXAvO1xuY29uc3QgUkVQTEFDRVJfUkUgPSAvXlxcLlsvXFxcXF0vO1xuZnVuY3Rpb24gYXJyaWZ5KGl0ZW0pIHtcbiAgICByZXR1cm4gQXJyYXkuaXNBcnJheShpdGVtKSA/IGl0ZW0gOiBbaXRlbV07XG59XG5jb25zdCBpc01hdGNoZXJPYmplY3QgPSAobWF0Y2hlcikgPT4gdHlwZW9mIG1hdGNoZXIgPT09ICdvYmplY3QnICYmIG1hdGNoZXIgIT09IG51bGwgJiYgIShtYXRjaGVyIGluc3RhbmNlb2YgUmVnRXhwKTtcbmZ1bmN0aW9uIGNyZWF0ZVBhdHRlcm4obWF0Y2hlcikge1xuICAgIGlmICh0eXBlb2YgbWF0Y2hlciA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgcmV0dXJuIG1hdGNoZXI7XG4gICAgaWYgKHR5cGVvZiBtYXRjaGVyID09PSAnc3RyaW5nJylcbiAgICAgICAgcmV0dXJuIChzdHJpbmcpID0+IG1hdGNoZXIgPT09IHN0cmluZztcbiAgICBpZiAobWF0Y2hlciBpbnN0YW5jZW9mIFJlZ0V4cClcbiAgICAgICAgcmV0dXJuIChzdHJpbmcpID0+IG1hdGNoZXIudGVzdChzdHJpbmcpO1xuICAgIGlmICh0eXBlb2YgbWF0Y2hlciA9PT0gJ29iamVjdCcgJiYgbWF0Y2hlciAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gKHN0cmluZykgPT4ge1xuICAgICAgICAgICAgaWYgKG1hdGNoZXIucGF0aCA9PT0gc3RyaW5nKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgaWYgKG1hdGNoZXIucmVjdXJzaXZlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVsYXRpdmUgPSBzeXNQYXRoLnJlbGF0aXZlKG1hdGNoZXIucGF0aCwgc3RyaW5nKTtcbiAgICAgICAgICAgICAgICBpZiAoIXJlbGF0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuICFyZWxhdGl2ZS5zdGFydHNXaXRoKCcuLicpICYmICFzeXNQYXRoLmlzQWJzb2x1dGUocmVsYXRpdmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gKCkgPT4gZmFsc2U7XG59XG5mdW5jdGlvbiBub3JtYWxpemVQYXRoKHBhdGgpIHtcbiAgICBpZiAodHlwZW9mIHBhdGggIT09ICdzdHJpbmcnKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3N0cmluZyBleHBlY3RlZCcpO1xuICAgIHBhdGggPSBzeXNQYXRoLm5vcm1hbGl6ZShwYXRoKTtcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgbGV0IHByZXBlbmQgPSBmYWxzZTtcbiAgICBpZiAocGF0aC5zdGFydHNXaXRoKCcvLycpKVxuICAgICAgICBwcmVwZW5kID0gdHJ1ZTtcbiAgICBjb25zdCBET1VCTEVfU0xBU0hfUkUgPSAvXFwvXFwvLztcbiAgICB3aGlsZSAocGF0aC5tYXRjaChET1VCTEVfU0xBU0hfUkUpKVxuICAgICAgICBwYXRoID0gcGF0aC5yZXBsYWNlKERPVUJMRV9TTEFTSF9SRSwgJy8nKTtcbiAgICBpZiAocHJlcGVuZClcbiAgICAgICAgcGF0aCA9ICcvJyArIHBhdGg7XG4gICAgcmV0dXJuIHBhdGg7XG59XG5mdW5jdGlvbiBtYXRjaFBhdHRlcm5zKHBhdHRlcm5zLCB0ZXN0U3RyaW5nLCBzdGF0cykge1xuICAgIGNvbnN0IHBhdGggPSBub3JtYWxpemVQYXRoKHRlc3RTdHJpbmcpO1xuICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBwYXR0ZXJucy5sZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgY29uc3QgcGF0dGVybiA9IHBhdHRlcm5zW2luZGV4XTtcbiAgICAgICAgaWYgKHBhdHRlcm4ocGF0aCwgc3RhdHMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5mdW5jdGlvbiBhbnltYXRjaChtYXRjaGVycywgdGVzdFN0cmluZykge1xuICAgIGlmIChtYXRjaGVycyA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2FueW1hdGNoOiBzcGVjaWZ5IGZpcnN0IGFyZ3VtZW50Jyk7XG4gICAgfVxuICAgIC8vIEVhcmx5IGNhY2hlIGZvciBtYXRjaGVycy5cbiAgICBjb25zdCBtYXRjaGVyc0FycmF5ID0gYXJyaWZ5KG1hdGNoZXJzKTtcbiAgICBjb25zdCBwYXR0ZXJucyA9IG1hdGNoZXJzQXJyYXkubWFwKChtYXRjaGVyKSA9PiBjcmVhdGVQYXR0ZXJuKG1hdGNoZXIpKTtcbiAgICBpZiAodGVzdFN0cmluZyA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiAodGVzdFN0cmluZywgc3RhdHMpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaFBhdHRlcm5zKHBhdHRlcm5zLCB0ZXN0U3RyaW5nLCBzdGF0cyk7XG4gICAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBtYXRjaFBhdHRlcm5zKHBhdHRlcm5zLCB0ZXN0U3RyaW5nKTtcbn1cbmNvbnN0IHVuaWZ5UGF0aHMgPSAocGF0aHNfKSA9PiB7XG4gICAgY29uc3QgcGF0aHMgPSBhcnJpZnkocGF0aHNfKS5mbGF0KCk7XG4gICAgaWYgKCFwYXRocy5ldmVyeSgocCkgPT4gdHlwZW9mIHAgPT09IFNUUklOR19UWVBFKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBOb24tc3RyaW5nIHByb3ZpZGVkIGFzIHdhdGNoIHBhdGg6ICR7cGF0aHN9YCk7XG4gICAgfVxuICAgIHJldHVybiBwYXRocy5tYXAobm9ybWFsaXplUGF0aFRvVW5peCk7XG59O1xuLy8gSWYgU0xBU0hfU0xBU0ggb2NjdXJzIGF0IHRoZSBiZWdpbm5pbmcgb2YgcGF0aCwgaXQgaXMgbm90IHJlcGxhY2VkXG4vLyAgICAgYmVjYXVzZSBcIi8vU3RvcmFnZVBDL0RyaXZlUG9vbC9Nb3ZpZXNcIiBpcyBhIHZhbGlkIG5ldHdvcmsgcGF0aFxuY29uc3QgdG9Vbml4ID0gKHN0cmluZykgPT4ge1xuICAgIGxldCBzdHIgPSBzdHJpbmcucmVwbGFjZShCQUNLX1NMQVNIX1JFLCBTTEFTSCk7XG4gICAgbGV0IHByZXBlbmQgPSBmYWxzZTtcbiAgICBpZiAoc3RyLnN0YXJ0c1dpdGgoU0xBU0hfU0xBU0gpKSB7XG4gICAgICAgIHByZXBlbmQgPSB0cnVlO1xuICAgIH1cbiAgICB3aGlsZSAoc3RyLm1hdGNoKERPVUJMRV9TTEFTSF9SRSkpIHtcbiAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UoRE9VQkxFX1NMQVNIX1JFLCBTTEFTSCk7XG4gICAgfVxuICAgIGlmIChwcmVwZW5kKSB7XG4gICAgICAgIHN0ciA9IFNMQVNIICsgc3RyO1xuICAgIH1cbiAgICByZXR1cm4gc3RyO1xufTtcbi8vIE91ciB2ZXJzaW9uIG9mIHVwYXRoLm5vcm1hbGl6ZVxuLy8gVE9ETzogdGhpcyBpcyBub3QgZXF1YWwgdG8gcGF0aC1ub3JtYWxpemUgbW9kdWxlIC0gaW52ZXN0aWdhdGUgd2h5XG5jb25zdCBub3JtYWxpemVQYXRoVG9Vbml4ID0gKHBhdGgpID0+IHRvVW5peChzeXNQYXRoLm5vcm1hbGl6ZSh0b1VuaXgocGF0aCkpKTtcbi8vIFRPRE86IHJlZmFjdG9yXG5jb25zdCBub3JtYWxpemVJZ25vcmVkID0gKGN3ZCA9ICcnKSA9PiAocGF0aCkgPT4ge1xuICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZVBhdGhUb1VuaXgoc3lzUGF0aC5pc0Fic29sdXRlKHBhdGgpID8gcGF0aCA6IHN5c1BhdGguam9pbihjd2QsIHBhdGgpKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiBwYXRoO1xuICAgIH1cbn07XG5jb25zdCBnZXRBYnNvbHV0ZVBhdGggPSAocGF0aCwgY3dkKSA9PiB7XG4gICAgaWYgKHN5c1BhdGguaXNBYnNvbHV0ZShwYXRoKSkge1xuICAgICAgICByZXR1cm4gcGF0aDtcbiAgICB9XG4gICAgcmV0dXJuIHN5c1BhdGguam9pbihjd2QsIHBhdGgpO1xufTtcbmNvbnN0IEVNUFRZX1NFVCA9IE9iamVjdC5mcmVlemUobmV3IFNldCgpKTtcbi8qKlxuICogRGlyZWN0b3J5IGVudHJ5LlxuICovXG5jbGFzcyBEaXJFbnRyeSB7XG4gICAgY29uc3RydWN0b3IoZGlyLCByZW1vdmVXYXRjaGVyKSB7XG4gICAgICAgIHRoaXMucGF0aCA9IGRpcjtcbiAgICAgICAgdGhpcy5fcmVtb3ZlV2F0Y2hlciA9IHJlbW92ZVdhdGNoZXI7XG4gICAgICAgIHRoaXMuaXRlbXMgPSBuZXcgU2V0KCk7XG4gICAgfVxuICAgIGFkZChpdGVtKSB7XG4gICAgICAgIGNvbnN0IHsgaXRlbXMgfSA9IHRoaXM7XG4gICAgICAgIGlmICghaXRlbXMpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGlmIChpdGVtICE9PSBPTkVfRE9UICYmIGl0ZW0gIT09IFRXT19ET1RTKVxuICAgICAgICAgICAgaXRlbXMuYWRkKGl0ZW0pO1xuICAgIH1cbiAgICBhc3luYyByZW1vdmUoaXRlbSkge1xuICAgICAgICBjb25zdCB7IGl0ZW1zIH0gPSB0aGlzO1xuICAgICAgICBpZiAoIWl0ZW1zKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpdGVtcy5kZWxldGUoaXRlbSk7XG4gICAgICAgIGlmIChpdGVtcy5zaXplID4gMClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY29uc3QgZGlyID0gdGhpcy5wYXRoO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgcmVhZGRpcihkaXIpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9yZW1vdmVXYXRjaGVyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVtb3ZlV2F0Y2hlcihzeXNQYXRoLmRpcm5hbWUoZGlyKSwgc3lzUGF0aC5iYXNlbmFtZShkaXIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBoYXMoaXRlbSkge1xuICAgICAgICBjb25zdCB7IGl0ZW1zIH0gPSB0aGlzO1xuICAgICAgICBpZiAoIWl0ZW1zKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICByZXR1cm4gaXRlbXMuaGFzKGl0ZW0pO1xuICAgIH1cbiAgICBnZXRDaGlsZHJlbigpIHtcbiAgICAgICAgY29uc3QgeyBpdGVtcyB9ID0gdGhpcztcbiAgICAgICAgaWYgKCFpdGVtcylcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgcmV0dXJuIFsuLi5pdGVtcy52YWx1ZXMoKV07XG4gICAgfVxuICAgIGRpc3Bvc2UoKSB7XG4gICAgICAgIHRoaXMuaXRlbXMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5wYXRoID0gJyc7XG4gICAgICAgIHRoaXMuX3JlbW92ZVdhdGNoZXIgPSBFTVBUWV9GTjtcbiAgICAgICAgdGhpcy5pdGVtcyA9IEVNUFRZX1NFVDtcbiAgICAgICAgT2JqZWN0LmZyZWV6ZSh0aGlzKTtcbiAgICB9XG59XG5jb25zdCBTVEFUX01FVEhPRF9GID0gJ3N0YXQnO1xuY29uc3QgU1RBVF9NRVRIT0RfTCA9ICdsc3RhdCc7XG5leHBvcnQgY2xhc3MgV2F0Y2hIZWxwZXIge1xuICAgIGNvbnN0cnVjdG9yKHBhdGgsIGZvbGxvdywgZnN3KSB7XG4gICAgICAgIHRoaXMuZnN3ID0gZnN3O1xuICAgICAgICBjb25zdCB3YXRjaFBhdGggPSBwYXRoO1xuICAgICAgICB0aGlzLnBhdGggPSBwYXRoID0gcGF0aC5yZXBsYWNlKFJFUExBQ0VSX1JFLCAnJyk7XG4gICAgICAgIHRoaXMud2F0Y2hQYXRoID0gd2F0Y2hQYXRoO1xuICAgICAgICB0aGlzLmZ1bGxXYXRjaFBhdGggPSBzeXNQYXRoLnJlc29sdmUod2F0Y2hQYXRoKTtcbiAgICAgICAgdGhpcy5kaXJQYXJ0cyA9IFtdO1xuICAgICAgICB0aGlzLmRpclBhcnRzLmZvckVhY2goKHBhcnRzKSA9PiB7XG4gICAgICAgICAgICBpZiAocGFydHMubGVuZ3RoID4gMSlcbiAgICAgICAgICAgICAgICBwYXJ0cy5wb3AoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZm9sbG93U3ltbGlua3MgPSBmb2xsb3c7XG4gICAgICAgIHRoaXMuc3RhdE1ldGhvZCA9IGZvbGxvdyA/IFNUQVRfTUVUSE9EX0YgOiBTVEFUX01FVEhPRF9MO1xuICAgIH1cbiAgICBlbnRyeVBhdGgoZW50cnkpIHtcbiAgICAgICAgcmV0dXJuIHN5c1BhdGguam9pbih0aGlzLndhdGNoUGF0aCwgc3lzUGF0aC5yZWxhdGl2ZSh0aGlzLndhdGNoUGF0aCwgZW50cnkuZnVsbFBhdGgpKTtcbiAgICB9XG4gICAgZmlsdGVyUGF0aChlbnRyeSkge1xuICAgICAgICBjb25zdCB7IHN0YXRzIH0gPSBlbnRyeTtcbiAgICAgICAgaWYgKHN0YXRzICYmIHN0YXRzLmlzU3ltYm9saWNMaW5rKCkpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5maWx0ZXJEaXIoZW50cnkpO1xuICAgICAgICBjb25zdCByZXNvbHZlZFBhdGggPSB0aGlzLmVudHJ5UGF0aChlbnRyeSk7XG4gICAgICAgIC8vIFRPRE86IHdoYXQgaWYgc3RhdHMgaXMgdW5kZWZpbmVkPyByZW1vdmUgIVxuICAgICAgICByZXR1cm4gdGhpcy5mc3cuX2lzbnRJZ25vcmVkKHJlc29sdmVkUGF0aCwgc3RhdHMpICYmIHRoaXMuZnN3Ll9oYXNSZWFkUGVybWlzc2lvbnMoc3RhdHMpO1xuICAgIH1cbiAgICBmaWx0ZXJEaXIoZW50cnkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZnN3Ll9pc250SWdub3JlZCh0aGlzLmVudHJ5UGF0aChlbnRyeSksIGVudHJ5LnN0YXRzKTtcbiAgICB9XG59XG4vKipcbiAqIFdhdGNoZXMgZmlsZXMgJiBkaXJlY3RvcmllcyBmb3IgY2hhbmdlcy4gRW1pdHRlZCBldmVudHM6XG4gKiBgYWRkYCwgYGFkZERpcmAsIGBjaGFuZ2VgLCBgdW5saW5rYCwgYHVubGlua0RpcmAsIGBhbGxgLCBgZXJyb3JgXG4gKlxuICogICAgIG5ldyBGU1dhdGNoZXIoKVxuICogICAgICAgLmFkZChkaXJlY3RvcmllcylcbiAqICAgICAgIC5vbignYWRkJywgcGF0aCA9PiBsb2coJ0ZpbGUnLCBwYXRoLCAnd2FzIGFkZGVkJykpXG4gKi9cbmV4cG9ydCBjbGFzcyBGU1dhdGNoZXIgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICAgIC8vIE5vdCBpbmRlbnRpbmcgbWV0aG9kcyBmb3IgaGlzdG9yeSBzYWtlOyBmb3Igbm93LlxuICAgIGNvbnN0cnVjdG9yKF9vcHRzID0ge30pIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5jbG9zZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fY2xvc2VycyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5faWdub3JlZFBhdGhzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLl90aHJvdHRsZWQgPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXMuX3N0cmVhbXMgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuX3N5bWxpbmtQYXRocyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5fd2F0Y2hlZCA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5fcGVuZGluZ1dyaXRlcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5fcGVuZGluZ1VubGlua3MgPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXMuX3JlYWR5Q291bnQgPSAwO1xuICAgICAgICB0aGlzLl9yZWFkeUVtaXR0ZWQgPSBmYWxzZTtcbiAgICAgICAgY29uc3QgYXdmID0gX29wdHMuYXdhaXRXcml0ZUZpbmlzaDtcbiAgICAgICAgY29uc3QgREVGX0FXRiA9IHsgc3RhYmlsaXR5VGhyZXNob2xkOiAyMDAwLCBwb2xsSW50ZXJ2YWw6IDEwMCB9O1xuICAgICAgICBjb25zdCBvcHRzID0ge1xuICAgICAgICAgICAgLy8gRGVmYXVsdHNcbiAgICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgICBpZ25vcmVJbml0aWFsOiBmYWxzZSxcbiAgICAgICAgICAgIGlnbm9yZVBlcm1pc3Npb25FcnJvcnM6IGZhbHNlLFxuICAgICAgICAgICAgaW50ZXJ2YWw6IDEwMCxcbiAgICAgICAgICAgIGJpbmFyeUludGVydmFsOiAzMDAsXG4gICAgICAgICAgICBmb2xsb3dTeW1saW5rczogdHJ1ZSxcbiAgICAgICAgICAgIHVzZVBvbGxpbmc6IGZhbHNlLFxuICAgICAgICAgICAgLy8gdXNlQXN5bmM6IGZhbHNlLFxuICAgICAgICAgICAgYXRvbWljOiB0cnVlLCAvLyBOT1RFOiBvdmVyd3JpdHRlbiBsYXRlciAoZGVwZW5kcyBvbiB1c2VQb2xsaW5nKVxuICAgICAgICAgICAgLi4uX29wdHMsXG4gICAgICAgICAgICAvLyBDaGFuZ2UgZm9ybWF0XG4gICAgICAgICAgICBpZ25vcmVkOiBfb3B0cy5pZ25vcmVkID8gYXJyaWZ5KF9vcHRzLmlnbm9yZWQpIDogYXJyaWZ5KFtdKSxcbiAgICAgICAgICAgIGF3YWl0V3JpdGVGaW5pc2g6IGF3ZiA9PT0gdHJ1ZSA/IERFRl9BV0YgOiB0eXBlb2YgYXdmID09PSAnb2JqZWN0JyA/IHsgLi4uREVGX0FXRiwgLi4uYXdmIH0gOiBmYWxzZSxcbiAgICAgICAgfTtcbiAgICAgICAgLy8gQWx3YXlzIGRlZmF1bHQgdG8gcG9sbGluZyBvbiBJQk0gaSBiZWNhdXNlIGZzLndhdGNoKCkgaXMgbm90IGF2YWlsYWJsZSBvbiBJQk0gaS5cbiAgICAgICAgaWYgKGlzSUJNaSlcbiAgICAgICAgICAgIG9wdHMudXNlUG9sbGluZyA9IHRydWU7XG4gICAgICAgIC8vIEVkaXRvciBhdG9taWMgd3JpdGUgbm9ybWFsaXphdGlvbiBlbmFibGVkIGJ5IGRlZmF1bHQgd2l0aCBmcy53YXRjaFxuICAgICAgICBpZiAob3B0cy5hdG9taWMgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIG9wdHMuYXRvbWljID0gIW9wdHMudXNlUG9sbGluZztcbiAgICAgICAgLy8gb3B0cy5hdG9taWMgPSB0eXBlb2YgX29wdHMuYXRvbWljID09PSAnbnVtYmVyJyA/IF9vcHRzLmF0b21pYyA6IDEwMDtcbiAgICAgICAgLy8gR2xvYmFsIG92ZXJyaWRlLiBVc2VmdWwgZm9yIGRldmVsb3BlcnMsIHdobyBuZWVkIHRvIGZvcmNlIHBvbGxpbmcgZm9yIGFsbFxuICAgICAgICAvLyBpbnN0YW5jZXMgb2YgY2hva2lkYXIsIHJlZ2FyZGxlc3Mgb2YgdXNhZ2UgLyBkZXBlbmRlbmN5IGRlcHRoXG4gICAgICAgIGNvbnN0IGVudlBvbGwgPSBwcm9jZXNzLmVudi5DSE9LSURBUl9VU0VQT0xMSU5HO1xuICAgICAgICBpZiAoZW52UG9sbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zdCBlbnZMb3dlciA9IGVudlBvbGwudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIGlmIChlbnZMb3dlciA9PT0gJ2ZhbHNlJyB8fCBlbnZMb3dlciA9PT0gJzAnKVxuICAgICAgICAgICAgICAgIG9wdHMudXNlUG9sbGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgZWxzZSBpZiAoZW52TG93ZXIgPT09ICd0cnVlJyB8fCBlbnZMb3dlciA9PT0gJzEnKVxuICAgICAgICAgICAgICAgIG9wdHMudXNlUG9sbGluZyA9IHRydWU7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgb3B0cy51c2VQb2xsaW5nID0gISFlbnZMb3dlcjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlbnZJbnRlcnZhbCA9IHByb2Nlc3MuZW52LkNIT0tJREFSX0lOVEVSVkFMO1xuICAgICAgICBpZiAoZW52SW50ZXJ2YWwpXG4gICAgICAgICAgICBvcHRzLmludGVydmFsID0gTnVtYmVyLnBhcnNlSW50KGVudkludGVydmFsLCAxMCk7XG4gICAgICAgIC8vIFRoaXMgaXMgZG9uZSB0byBlbWl0IHJlYWR5IG9ubHkgb25jZSwgYnV0IGVhY2ggJ2FkZCcgd2lsbCBpbmNyZWFzZSB0aGF0P1xuICAgICAgICBsZXQgcmVhZHlDYWxscyA9IDA7XG4gICAgICAgIHRoaXMuX2VtaXRSZWFkeSA9ICgpID0+IHtcbiAgICAgICAgICAgIHJlYWR5Q2FsbHMrKztcbiAgICAgICAgICAgIGlmIChyZWFkeUNhbGxzID49IHRoaXMuX3JlYWR5Q291bnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0UmVhZHkgPSBFTVBUWV9GTjtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZWFkeUVtaXR0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIC8vIHVzZSBwcm9jZXNzLm5leHRUaWNrIHRvIGFsbG93IHRpbWUgZm9yIGxpc3RlbmVyIHRvIGJlIGJvdW5kXG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB0aGlzLmVtaXQoRVYuUkVBRFkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fZW1pdFJhdyA9ICguLi5hcmdzKSA9PiB0aGlzLmVtaXQoRVYuUkFXLCAuLi5hcmdzKTtcbiAgICAgICAgdGhpcy5fYm91bmRSZW1vdmUgPSB0aGlzLl9yZW1vdmUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5vcHRpb25zID0gb3B0cztcbiAgICAgICAgdGhpcy5fbm9kZUZzSGFuZGxlciA9IG5ldyBOb2RlRnNIYW5kbGVyKHRoaXMpO1xuICAgICAgICAvLyBZb3VcdTIwMTlyZSBmcm96ZW4gd2hlbiB5b3VyIGhlYXJ0XHUyMDE5cyBub3Qgb3Blbi5cbiAgICAgICAgT2JqZWN0LmZyZWV6ZShvcHRzKTtcbiAgICB9XG4gICAgX2FkZElnbm9yZWRQYXRoKG1hdGNoZXIpIHtcbiAgICAgICAgaWYgKGlzTWF0Y2hlck9iamVjdChtYXRjaGVyKSkge1xuICAgICAgICAgICAgLy8gcmV0dXJuIGVhcmx5IGlmIHdlIGFscmVhZHkgaGF2ZSBhIGRlZXBseSBlcXVhbCBtYXRjaGVyIG9iamVjdFxuICAgICAgICAgICAgZm9yIChjb25zdCBpZ25vcmVkIG9mIHRoaXMuX2lnbm9yZWRQYXRocykge1xuICAgICAgICAgICAgICAgIGlmIChpc01hdGNoZXJPYmplY3QoaWdub3JlZCkgJiZcbiAgICAgICAgICAgICAgICAgICAgaWdub3JlZC5wYXRoID09PSBtYXRjaGVyLnBhdGggJiZcbiAgICAgICAgICAgICAgICAgICAgaWdub3JlZC5yZWN1cnNpdmUgPT09IG1hdGNoZXIucmVjdXJzaXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5faWdub3JlZFBhdGhzLmFkZChtYXRjaGVyKTtcbiAgICB9XG4gICAgX3JlbW92ZUlnbm9yZWRQYXRoKG1hdGNoZXIpIHtcbiAgICAgICAgdGhpcy5faWdub3JlZFBhdGhzLmRlbGV0ZShtYXRjaGVyKTtcbiAgICAgICAgLy8gbm93IGZpbmQgYW55IG1hdGNoZXIgb2JqZWN0cyB3aXRoIHRoZSBtYXRjaGVyIGFzIHBhdGhcbiAgICAgICAgaWYgKHR5cGVvZiBtYXRjaGVyID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpZ25vcmVkIG9mIHRoaXMuX2lnbm9yZWRQYXRocykge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8gKDQzMDgxaik6IG1ha2UgdGhpcyBtb3JlIGVmZmljaWVudC5cbiAgICAgICAgICAgICAgICAvLyBwcm9iYWJseSBqdXN0IG1ha2UgYSBgdGhpcy5faWdub3JlZERpcmVjdG9yaWVzYCBvciBzb21lXG4gICAgICAgICAgICAgICAgLy8gc3VjaCB0aGluZy5cbiAgICAgICAgICAgICAgICBpZiAoaXNNYXRjaGVyT2JqZWN0KGlnbm9yZWQpICYmIGlnbm9yZWQucGF0aCA9PT0gbWF0Y2hlcikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9pZ25vcmVkUGF0aHMuZGVsZXRlKGlnbm9yZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBQdWJsaWMgbWV0aG9kc1xuICAgIC8qKlxuICAgICAqIEFkZHMgcGF0aHMgdG8gYmUgd2F0Y2hlZCBvbiBhbiBleGlzdGluZyBGU1dhdGNoZXIgaW5zdGFuY2UuXG4gICAgICogQHBhcmFtIHBhdGhzXyBmaWxlIG9yIGZpbGUgbGlzdC4gT3RoZXIgYXJndW1lbnRzIGFyZSB1bnVzZWRcbiAgICAgKi9cbiAgICBhZGQocGF0aHNfLCBfb3JpZ0FkZCwgX2ludGVybmFsKSB7XG4gICAgICAgIGNvbnN0IHsgY3dkIH0gPSB0aGlzLm9wdGlvbnM7XG4gICAgICAgIHRoaXMuY2xvc2VkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2Nsb3NlUHJvbWlzZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgbGV0IHBhdGhzID0gdW5pZnlQYXRocyhwYXRoc18pO1xuICAgICAgICBpZiAoY3dkKSB7XG4gICAgICAgICAgICBwYXRocyA9IHBhdGhzLm1hcCgocGF0aCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFic1BhdGggPSBnZXRBYnNvbHV0ZVBhdGgocGF0aCwgY3dkKTtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBgcGF0aGAgaW5zdGVhZCBvZiBgYWJzUGF0aGAgYmVjYXVzZSB0aGUgY3dkIHBvcnRpb24gY2FuJ3QgYmUgYSBnbG9iXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFic1BhdGg7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBwYXRocy5mb3JFYWNoKChwYXRoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9yZW1vdmVJZ25vcmVkUGF0aChwYXRoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX3VzZXJJZ25vcmVkID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAoIXRoaXMuX3JlYWR5Q291bnQpXG4gICAgICAgICAgICB0aGlzLl9yZWFkeUNvdW50ID0gMDtcbiAgICAgICAgdGhpcy5fcmVhZHlDb3VudCArPSBwYXRocy5sZW5ndGg7XG4gICAgICAgIFByb21pc2UuYWxsKHBhdGhzLm1hcChhc3luYyAocGF0aCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgdGhpcy5fbm9kZUZzSGFuZGxlci5fYWRkVG9Ob2RlRnMocGF0aCwgIV9pbnRlcm5hbCwgdW5kZWZpbmVkLCAwLCBfb3JpZ0FkZCk7XG4gICAgICAgICAgICBpZiAocmVzKVxuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRSZWFkeSgpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfSkpLnRoZW4oKHJlc3VsdHMpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLmNsb3NlZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICByZXN1bHRzLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaXRlbSlcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGQoc3lzUGF0aC5kaXJuYW1lKGl0ZW0pLCBzeXNQYXRoLmJhc2VuYW1lKF9vcmlnQWRkIHx8IGl0ZW0pKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsb3NlIHdhdGNoZXJzIG9yIHN0YXJ0IGlnbm9yaW5nIGV2ZW50cyBmcm9tIHNwZWNpZmllZCBwYXRocy5cbiAgICAgKi9cbiAgICB1bndhdGNoKHBhdGhzXykge1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgY29uc3QgcGF0aHMgPSB1bmlmeVBhdGhzKHBhdGhzXyk7XG4gICAgICAgIGNvbnN0IHsgY3dkIH0gPSB0aGlzLm9wdGlvbnM7XG4gICAgICAgIHBhdGhzLmZvckVhY2goKHBhdGgpID0+IHtcbiAgICAgICAgICAgIC8vIGNvbnZlcnQgdG8gYWJzb2x1dGUgcGF0aCB1bmxlc3MgcmVsYXRpdmUgcGF0aCBhbHJlYWR5IG1hdGNoZXNcbiAgICAgICAgICAgIGlmICghc3lzUGF0aC5pc0Fic29sdXRlKHBhdGgpICYmICF0aGlzLl9jbG9zZXJzLmhhcyhwYXRoKSkge1xuICAgICAgICAgICAgICAgIGlmIChjd2QpXG4gICAgICAgICAgICAgICAgICAgIHBhdGggPSBzeXNQYXRoLmpvaW4oY3dkLCBwYXRoKTtcbiAgICAgICAgICAgICAgICBwYXRoID0gc3lzUGF0aC5yZXNvbHZlKHBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fY2xvc2VQYXRoKHBhdGgpO1xuICAgICAgICAgICAgdGhpcy5fYWRkSWdub3JlZFBhdGgocGF0aCk7XG4gICAgICAgICAgICBpZiAodGhpcy5fd2F0Y2hlZC5oYXMocGF0aCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hZGRJZ25vcmVkUGF0aCh7XG4gICAgICAgICAgICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHJlY3Vyc2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHJlc2V0IHRoZSBjYWNoZWQgdXNlcklnbm9yZWQgYW55bWF0Y2ggZm5cbiAgICAgICAgICAgIC8vIHRvIG1ha2UgaWdub3JlZFBhdGhzIGNoYW5nZXMgZWZmZWN0aXZlXG4gICAgICAgICAgICB0aGlzLl91c2VySWdub3JlZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDbG9zZSB3YXRjaGVycyBhbmQgcmVtb3ZlIGFsbCBsaXN0ZW5lcnMgZnJvbSB3YXRjaGVkIHBhdGhzLlxuICAgICAqL1xuICAgIGNsb3NlKCkge1xuICAgICAgICBpZiAodGhpcy5fY2xvc2VQcm9taXNlKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY2xvc2VQcm9taXNlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY2xvc2VkID0gdHJ1ZTtcbiAgICAgICAgLy8gTWVtb3J5IG1hbmFnZW1lbnQuXG4gICAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gICAgICAgIGNvbnN0IGNsb3NlcnMgPSBbXTtcbiAgICAgICAgdGhpcy5fY2xvc2Vycy5mb3JFYWNoKChjbG9zZXJMaXN0KSA9PiBjbG9zZXJMaXN0LmZvckVhY2goKGNsb3NlcikgPT4ge1xuICAgICAgICAgICAgY29uc3QgcHJvbWlzZSA9IGNsb3NlcigpO1xuICAgICAgICAgICAgaWYgKHByb21pc2UgaW5zdGFuY2VvZiBQcm9taXNlKVxuICAgICAgICAgICAgICAgIGNsb3NlcnMucHVzaChwcm9taXNlKTtcbiAgICAgICAgfSkpO1xuICAgICAgICB0aGlzLl9zdHJlYW1zLmZvckVhY2goKHN0cmVhbSkgPT4gc3RyZWFtLmRlc3Ryb3koKSk7XG4gICAgICAgIHRoaXMuX3VzZXJJZ25vcmVkID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLl9yZWFkeUNvdW50ID0gMDtcbiAgICAgICAgdGhpcy5fcmVhZHlFbWl0dGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX3dhdGNoZWQuZm9yRWFjaCgoZGlyZW50KSA9PiBkaXJlbnQuZGlzcG9zZSgpKTtcbiAgICAgICAgdGhpcy5fY2xvc2Vycy5jbGVhcigpO1xuICAgICAgICB0aGlzLl93YXRjaGVkLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuX3N0cmVhbXMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5fc3ltbGlua1BhdGhzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuX3Rocm90dGxlZC5jbGVhcigpO1xuICAgICAgICB0aGlzLl9jbG9zZVByb21pc2UgPSBjbG9zZXJzLmxlbmd0aFxuICAgICAgICAgICAgPyBQcm9taXNlLmFsbChjbG9zZXJzKS50aGVuKCgpID0+IHVuZGVmaW5lZClcbiAgICAgICAgICAgIDogUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIHJldHVybiB0aGlzLl9jbG9zZVByb21pc2U7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEV4cG9zZSBsaXN0IG9mIHdhdGNoZWQgcGF0aHNcbiAgICAgKiBAcmV0dXJucyBmb3IgY2hhaW5pbmdcbiAgICAgKi9cbiAgICBnZXRXYXRjaGVkKCkge1xuICAgICAgICBjb25zdCB3YXRjaExpc3QgPSB7fTtcbiAgICAgICAgdGhpcy5fd2F0Y2hlZC5mb3JFYWNoKChlbnRyeSwgZGlyKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBrZXkgPSB0aGlzLm9wdGlvbnMuY3dkID8gc3lzUGF0aC5yZWxhdGl2ZSh0aGlzLm9wdGlvbnMuY3dkLCBkaXIpIDogZGlyO1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBrZXkgfHwgT05FX0RPVDtcbiAgICAgICAgICAgIHdhdGNoTGlzdFtpbmRleF0gPSBlbnRyeS5nZXRDaGlsZHJlbigpLnNvcnQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB3YXRjaExpc3Q7XG4gICAgfVxuICAgIGVtaXRXaXRoQWxsKGV2ZW50LCBhcmdzKSB7XG4gICAgICAgIHRoaXMuZW1pdChldmVudCwgLi4uYXJncyk7XG4gICAgICAgIGlmIChldmVudCAhPT0gRVYuRVJST1IpXG4gICAgICAgICAgICB0aGlzLmVtaXQoRVYuQUxMLCBldmVudCwgLi4uYXJncyk7XG4gICAgfVxuICAgIC8vIENvbW1vbiBoZWxwZXJzXG4gICAgLy8gLS0tLS0tLS0tLS0tLS1cbiAgICAvKipcbiAgICAgKiBOb3JtYWxpemUgYW5kIGVtaXQgZXZlbnRzLlxuICAgICAqIENhbGxpbmcgX2VtaXQgRE9FUyBOT1QgTUVBTiBlbWl0KCkgd291bGQgYmUgY2FsbGVkIVxuICAgICAqIEBwYXJhbSBldmVudCBUeXBlIG9mIGV2ZW50XG4gICAgICogQHBhcmFtIHBhdGggRmlsZSBvciBkaXJlY3RvcnkgcGF0aFxuICAgICAqIEBwYXJhbSBzdGF0cyBhcmd1bWVudHMgdG8gYmUgcGFzc2VkIHdpdGggZXZlbnRcbiAgICAgKiBAcmV0dXJucyB0aGUgZXJyb3IgaWYgZGVmaW5lZCwgb3RoZXJ3aXNlIHRoZSB2YWx1ZSBvZiB0aGUgRlNXYXRjaGVyIGluc3RhbmNlJ3MgYGNsb3NlZGAgZmxhZ1xuICAgICAqL1xuICAgIGFzeW5jIF9lbWl0KGV2ZW50LCBwYXRoLCBzdGF0cykge1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGNvbnN0IG9wdHMgPSB0aGlzLm9wdGlvbnM7XG4gICAgICAgIGlmIChpc1dpbmRvd3MpXG4gICAgICAgICAgICBwYXRoID0gc3lzUGF0aC5ub3JtYWxpemUocGF0aCk7XG4gICAgICAgIGlmIChvcHRzLmN3ZClcbiAgICAgICAgICAgIHBhdGggPSBzeXNQYXRoLnJlbGF0aXZlKG9wdHMuY3dkLCBwYXRoKTtcbiAgICAgICAgY29uc3QgYXJncyA9IFtwYXRoXTtcbiAgICAgICAgaWYgKHN0YXRzICE9IG51bGwpXG4gICAgICAgICAgICBhcmdzLnB1c2goc3RhdHMpO1xuICAgICAgICBjb25zdCBhd2YgPSBvcHRzLmF3YWl0V3JpdGVGaW5pc2g7XG4gICAgICAgIGxldCBwdztcbiAgICAgICAgaWYgKGF3ZiAmJiAocHcgPSB0aGlzLl9wZW5kaW5nV3JpdGVzLmdldChwYXRoKSkpIHtcbiAgICAgICAgICAgIHB3Lmxhc3RDaGFuZ2UgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdHMuYXRvbWljKSB7XG4gICAgICAgICAgICBpZiAoZXZlbnQgPT09IEVWLlVOTElOSykge1xuICAgICAgICAgICAgICAgIHRoaXMuX3BlbmRpbmdVbmxpbmtzLnNldChwYXRoLCBbZXZlbnQsIC4uLmFyZ3NdKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcGVuZGluZ1VubGlua3MuZm9yRWFjaCgoZW50cnksIHBhdGgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdCguLi5lbnRyeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXQoRVYuQUxMLCAuLi5lbnRyeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wZW5kaW5nVW5saW5rcy5kZWxldGUocGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sIHR5cGVvZiBvcHRzLmF0b21pYyA9PT0gJ251bWJlcicgPyBvcHRzLmF0b21pYyA6IDEwMCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXZlbnQgPT09IEVWLkFERCAmJiB0aGlzLl9wZW5kaW5nVW5saW5rcy5oYXMocGF0aCkpIHtcbiAgICAgICAgICAgICAgICBldmVudCA9IEVWLkNIQU5HRTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wZW5kaW5nVW5saW5rcy5kZWxldGUocGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGF3ZiAmJiAoZXZlbnQgPT09IEVWLkFERCB8fCBldmVudCA9PT0gRVYuQ0hBTkdFKSAmJiB0aGlzLl9yZWFkeUVtaXR0ZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGF3ZkVtaXQgPSAoZXJyLCBzdGF0cykgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQgPSBFVi5FUlJPUjtcbiAgICAgICAgICAgICAgICAgICAgYXJnc1swXSA9IGVycjtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0V2l0aEFsbChldmVudCwgYXJncyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHN0YXRzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHN0YXRzIGRvZXNuJ3QgZXhpc3QgdGhlIGZpbGUgbXVzdCBoYXZlIGJlZW4gZGVsZXRlZFxuICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzWzFdID0gc3RhdHM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnB1c2goc3RhdHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdFdpdGhBbGwoZXZlbnQsIGFyZ3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLl9hd2FpdFdyaXRlRmluaXNoKHBhdGgsIGF3Zi5zdGFiaWxpdHlUaHJlc2hvbGQsIGV2ZW50LCBhd2ZFbWl0KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChldmVudCA9PT0gRVYuQ0hBTkdFKSB7XG4gICAgICAgICAgICBjb25zdCBpc1Rocm90dGxlZCA9ICF0aGlzLl90aHJvdHRsZShFVi5DSEFOR0UsIHBhdGgsIDUwKTtcbiAgICAgICAgICAgIGlmIChpc1Rocm90dGxlZClcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBpZiAob3B0cy5hbHdheXNTdGF0ICYmXG4gICAgICAgICAgICBzdGF0cyA9PT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICAoZXZlbnQgPT09IEVWLkFERCB8fCBldmVudCA9PT0gRVYuQUREX0RJUiB8fCBldmVudCA9PT0gRVYuQ0hBTkdFKSkge1xuICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBvcHRzLmN3ZCA/IHN5c1BhdGguam9pbihvcHRzLmN3ZCwgcGF0aCkgOiBwYXRoO1xuICAgICAgICAgICAgbGV0IHN0YXRzO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBzdGF0cyA9IGF3YWl0IHN0YXQoZnVsbFBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgIC8vIGRvIG5vdGhpbmdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFN1cHByZXNzIGV2ZW50IHdoZW4gZnNfc3RhdCBmYWlscywgdG8gYXZvaWQgc2VuZGluZyB1bmRlZmluZWQgJ3N0YXQnXG4gICAgICAgICAgICBpZiAoIXN0YXRzIHx8IHRoaXMuY2xvc2VkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGFyZ3MucHVzaChzdGF0cyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lbWl0V2l0aEFsbChldmVudCwgYXJncyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDb21tb24gaGFuZGxlciBmb3IgZXJyb3JzXG4gICAgICogQHJldHVybnMgVGhlIGVycm9yIGlmIGRlZmluZWQsIG90aGVyd2lzZSB0aGUgdmFsdWUgb2YgdGhlIEZTV2F0Y2hlciBpbnN0YW5jZSdzIGBjbG9zZWRgIGZsYWdcbiAgICAgKi9cbiAgICBfaGFuZGxlRXJyb3IoZXJyb3IpIHtcbiAgICAgICAgY29uc3QgY29kZSA9IGVycm9yICYmIGVycm9yLmNvZGU7XG4gICAgICAgIGlmIChlcnJvciAmJlxuICAgICAgICAgICAgY29kZSAhPT0gJ0VOT0VOVCcgJiZcbiAgICAgICAgICAgIGNvZGUgIT09ICdFTk9URElSJyAmJlxuICAgICAgICAgICAgKCF0aGlzLm9wdGlvbnMuaWdub3JlUGVybWlzc2lvbkVycm9ycyB8fCAoY29kZSAhPT0gJ0VQRVJNJyAmJiBjb2RlICE9PSAnRUFDQ0VTJykpKSB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoRVYuRVJST1IsIGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXJyb3IgfHwgdGhpcy5jbG9zZWQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEhlbHBlciB1dGlsaXR5IGZvciB0aHJvdHRsaW5nXG4gICAgICogQHBhcmFtIGFjdGlvblR5cGUgdHlwZSBiZWluZyB0aHJvdHRsZWRcbiAgICAgKiBAcGFyYW0gcGF0aCBiZWluZyBhY3RlZCB1cG9uXG4gICAgICogQHBhcmFtIHRpbWVvdXQgZHVyYXRpb24gb2YgdGltZSB0byBzdXBwcmVzcyBkdXBsaWNhdGUgYWN0aW9uc1xuICAgICAqIEByZXR1cm5zIHRyYWNraW5nIG9iamVjdCBvciBmYWxzZSBpZiBhY3Rpb24gc2hvdWxkIGJlIHN1cHByZXNzZWRcbiAgICAgKi9cbiAgICBfdGhyb3R0bGUoYWN0aW9uVHlwZSwgcGF0aCwgdGltZW91dCkge1xuICAgICAgICBpZiAoIXRoaXMuX3Rocm90dGxlZC5oYXMoYWN0aW9uVHlwZSkpIHtcbiAgICAgICAgICAgIHRoaXMuX3Rocm90dGxlZC5zZXQoYWN0aW9uVHlwZSwgbmV3IE1hcCgpKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBhY3Rpb24gPSB0aGlzLl90aHJvdHRsZWQuZ2V0KGFjdGlvblR5cGUpO1xuICAgICAgICBpZiAoIWFjdGlvbilcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignaW52YWxpZCB0aHJvdHRsZScpO1xuICAgICAgICBjb25zdCBhY3Rpb25QYXRoID0gYWN0aW9uLmdldChwYXRoKTtcbiAgICAgICAgaWYgKGFjdGlvblBhdGgpIHtcbiAgICAgICAgICAgIGFjdGlvblBhdGguY291bnQrKztcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcHJlZmVyLWNvbnN0XG4gICAgICAgIGxldCB0aW1lb3V0T2JqZWN0O1xuICAgICAgICBjb25zdCBjbGVhciA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBhY3Rpb24uZ2V0KHBhdGgpO1xuICAgICAgICAgICAgY29uc3QgY291bnQgPSBpdGVtID8gaXRlbS5jb3VudCA6IDA7XG4gICAgICAgICAgICBhY3Rpb24uZGVsZXRlKHBhdGgpO1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRPYmplY3QpO1xuICAgICAgICAgICAgaWYgKGl0ZW0pXG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGl0ZW0udGltZW91dE9iamVjdCk7XG4gICAgICAgICAgICByZXR1cm4gY291bnQ7XG4gICAgICAgIH07XG4gICAgICAgIHRpbWVvdXRPYmplY3QgPSBzZXRUaW1lb3V0KGNsZWFyLCB0aW1lb3V0KTtcbiAgICAgICAgY29uc3QgdGhyID0geyB0aW1lb3V0T2JqZWN0LCBjbGVhciwgY291bnQ6IDAgfTtcbiAgICAgICAgYWN0aW9uLnNldChwYXRoLCB0aHIpO1xuICAgICAgICByZXR1cm4gdGhyO1xuICAgIH1cbiAgICBfaW5jclJlYWR5Q291bnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yZWFkeUNvdW50Kys7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEF3YWl0cyB3cml0ZSBvcGVyYXRpb24gdG8gZmluaXNoLlxuICAgICAqIFBvbGxzIGEgbmV3bHkgY3JlYXRlZCBmaWxlIGZvciBzaXplIHZhcmlhdGlvbnMuIFdoZW4gZmlsZXMgc2l6ZSBkb2VzIG5vdCBjaGFuZ2UgZm9yICd0aHJlc2hvbGQnIG1pbGxpc2Vjb25kcyBjYWxscyBjYWxsYmFjay5cbiAgICAgKiBAcGFyYW0gcGF0aCBiZWluZyBhY3RlZCB1cG9uXG4gICAgICogQHBhcmFtIHRocmVzaG9sZCBUaW1lIGluIG1pbGxpc2Vjb25kcyBhIGZpbGUgc2l6ZSBtdXN0IGJlIGZpeGVkIGJlZm9yZSBhY2tub3dsZWRnaW5nIHdyaXRlIE9QIGlzIGZpbmlzaGVkXG4gICAgICogQHBhcmFtIGV2ZW50XG4gICAgICogQHBhcmFtIGF3ZkVtaXQgQ2FsbGJhY2sgdG8gYmUgY2FsbGVkIHdoZW4gcmVhZHkgZm9yIGV2ZW50IHRvIGJlIGVtaXR0ZWQuXG4gICAgICovXG4gICAgX2F3YWl0V3JpdGVGaW5pc2gocGF0aCwgdGhyZXNob2xkLCBldmVudCwgYXdmRW1pdCkge1xuICAgICAgICBjb25zdCBhd2YgPSB0aGlzLm9wdGlvbnMuYXdhaXRXcml0ZUZpbmlzaDtcbiAgICAgICAgaWYgKHR5cGVvZiBhd2YgIT09ICdvYmplY3QnKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCBwb2xsSW50ZXJ2YWwgPSBhd2YucG9sbEludGVydmFsO1xuICAgICAgICBsZXQgdGltZW91dEhhbmRsZXI7XG4gICAgICAgIGxldCBmdWxsUGF0aCA9IHBhdGg7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuY3dkICYmICFzeXNQYXRoLmlzQWJzb2x1dGUocGF0aCkpIHtcbiAgICAgICAgICAgIGZ1bGxQYXRoID0gc3lzUGF0aC5qb2luKHRoaXMub3B0aW9ucy5jd2QsIHBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICAgIGNvbnN0IHdyaXRlcyA9IHRoaXMuX3BlbmRpbmdXcml0ZXM7XG4gICAgICAgIGZ1bmN0aW9uIGF3YWl0V3JpdGVGaW5pc2hGbihwcmV2U3RhdCkge1xuICAgICAgICAgICAgc3RhdGNiKGZ1bGxQYXRoLCAoZXJyLCBjdXJTdGF0KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVyciB8fCAhd3JpdGVzLmhhcyhwYXRoKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyICYmIGVyci5jb2RlICE9PSAnRU5PRU5UJylcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3ZkVtaXQoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBub3cgPSBOdW1iZXIobmV3IERhdGUoKSk7XG4gICAgICAgICAgICAgICAgaWYgKHByZXZTdGF0ICYmIGN1clN0YXQuc2l6ZSAhPT0gcHJldlN0YXQuc2l6ZSkge1xuICAgICAgICAgICAgICAgICAgICB3cml0ZXMuZ2V0KHBhdGgpLmxhc3RDaGFuZ2UgPSBub3c7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHB3ID0gd3JpdGVzLmdldChwYXRoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkZiA9IG5vdyAtIHB3Lmxhc3RDaGFuZ2U7XG4gICAgICAgICAgICAgICAgaWYgKGRmID49IHRocmVzaG9sZCkge1xuICAgICAgICAgICAgICAgICAgICB3cml0ZXMuZGVsZXRlKHBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBhd2ZFbWl0KHVuZGVmaW5lZCwgY3VyU3RhdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aW1lb3V0SGFuZGxlciA9IHNldFRpbWVvdXQoYXdhaXRXcml0ZUZpbmlzaEZuLCBwb2xsSW50ZXJ2YWwsIGN1clN0YXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICghd3JpdGVzLmhhcyhwYXRoKSkge1xuICAgICAgICAgICAgd3JpdGVzLnNldChwYXRoLCB7XG4gICAgICAgICAgICAgICAgbGFzdENoYW5nZTogbm93LFxuICAgICAgICAgICAgICAgIGNhbmNlbFdhaXQ6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVzLmRlbGV0ZShwYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRIYW5kbGVyKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRpbWVvdXRIYW5kbGVyID0gc2V0VGltZW91dChhd2FpdFdyaXRlRmluaXNoRm4sIHBvbGxJbnRlcnZhbCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIHVzZXIgaGFzIGFza2VkIHRvIGlnbm9yZSB0aGlzIHBhdGguXG4gICAgICovXG4gICAgX2lzSWdub3JlZChwYXRoLCBzdGF0cykge1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmF0b21pYyAmJiBET1RfUkUudGVzdChwYXRoKSlcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICBpZiAoIXRoaXMuX3VzZXJJZ25vcmVkKSB7XG4gICAgICAgICAgICBjb25zdCB7IGN3ZCB9ID0gdGhpcy5vcHRpb25zO1xuICAgICAgICAgICAgY29uc3QgaWduID0gdGhpcy5vcHRpb25zLmlnbm9yZWQ7XG4gICAgICAgICAgICBjb25zdCBpZ25vcmVkID0gKGlnbiB8fCBbXSkubWFwKG5vcm1hbGl6ZUlnbm9yZWQoY3dkKSk7XG4gICAgICAgICAgICBjb25zdCBpZ25vcmVkUGF0aHMgPSBbLi4udGhpcy5faWdub3JlZFBhdGhzXTtcbiAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBbLi4uaWdub3JlZFBhdGhzLm1hcChub3JtYWxpemVJZ25vcmVkKGN3ZCkpLCAuLi5pZ25vcmVkXTtcbiAgICAgICAgICAgIHRoaXMuX3VzZXJJZ25vcmVkID0gYW55bWF0Y2gobGlzdCwgdW5kZWZpbmVkKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fdXNlcklnbm9yZWQocGF0aCwgc3RhdHMpO1xuICAgIH1cbiAgICBfaXNudElnbm9yZWQocGF0aCwgc3RhdCkge1xuICAgICAgICByZXR1cm4gIXRoaXMuX2lzSWdub3JlZChwYXRoLCBzdGF0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUHJvdmlkZXMgYSBzZXQgb2YgY29tbW9uIGhlbHBlcnMgYW5kIHByb3BlcnRpZXMgcmVsYXRpbmcgdG8gc3ltbGluayBoYW5kbGluZy5cbiAgICAgKiBAcGFyYW0gcGF0aCBmaWxlIG9yIGRpcmVjdG9yeSBwYXR0ZXJuIGJlaW5nIHdhdGNoZWRcbiAgICAgKi9cbiAgICBfZ2V0V2F0Y2hIZWxwZXJzKHBhdGgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBXYXRjaEhlbHBlcihwYXRoLCB0aGlzLm9wdGlvbnMuZm9sbG93U3ltbGlua3MsIHRoaXMpO1xuICAgIH1cbiAgICAvLyBEaXJlY3RvcnkgaGVscGVyc1xuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLyoqXG4gICAgICogUHJvdmlkZXMgZGlyZWN0b3J5IHRyYWNraW5nIG9iamVjdHNcbiAgICAgKiBAcGFyYW0gZGlyZWN0b3J5IHBhdGggb2YgdGhlIGRpcmVjdG9yeVxuICAgICAqL1xuICAgIF9nZXRXYXRjaGVkRGlyKGRpcmVjdG9yeSkge1xuICAgICAgICBjb25zdCBkaXIgPSBzeXNQYXRoLnJlc29sdmUoZGlyZWN0b3J5KTtcbiAgICAgICAgaWYgKCF0aGlzLl93YXRjaGVkLmhhcyhkaXIpKVxuICAgICAgICAgICAgdGhpcy5fd2F0Y2hlZC5zZXQoZGlyLCBuZXcgRGlyRW50cnkoZGlyLCB0aGlzLl9ib3VuZFJlbW92ZSkpO1xuICAgICAgICByZXR1cm4gdGhpcy5fd2F0Y2hlZC5nZXQoZGlyKTtcbiAgICB9XG4gICAgLy8gRmlsZSBoZWxwZXJzXG4gICAgLy8gLS0tLS0tLS0tLS0tXG4gICAgLyoqXG4gICAgICogQ2hlY2sgZm9yIHJlYWQgcGVybWlzc2lvbnM6IGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xMTc4MTQwNC8xMzU4NDA1XG4gICAgICovXG4gICAgX2hhc1JlYWRQZXJtaXNzaW9ucyhzdGF0cykge1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmlnbm9yZVBlcm1pc3Npb25FcnJvcnMpXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIEJvb2xlYW4oTnVtYmVyKHN0YXRzLm1vZGUpICYgMG80MDApO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIGVtaXR0aW5nIHVubGluayBldmVudHMgZm9yXG4gICAgICogZmlsZXMgYW5kIGRpcmVjdG9yaWVzLCBhbmQgdmlhIHJlY3Vyc2lvbiwgZm9yXG4gICAgICogZmlsZXMgYW5kIGRpcmVjdG9yaWVzIHdpdGhpbiBkaXJlY3RvcmllcyB0aGF0IGFyZSB1bmxpbmtlZFxuICAgICAqIEBwYXJhbSBkaXJlY3Rvcnkgd2l0aGluIHdoaWNoIHRoZSBmb2xsb3dpbmcgaXRlbSBpcyBsb2NhdGVkXG4gICAgICogQHBhcmFtIGl0ZW0gICAgICBiYXNlIHBhdGggb2YgaXRlbS9kaXJlY3RvcnlcbiAgICAgKi9cbiAgICBfcmVtb3ZlKGRpcmVjdG9yeSwgaXRlbSwgaXNEaXJlY3RvcnkpIHtcbiAgICAgICAgLy8gaWYgd2hhdCBpcyBiZWluZyBkZWxldGVkIGlzIGEgZGlyZWN0b3J5LCBnZXQgdGhhdCBkaXJlY3RvcnkncyBwYXRoc1xuICAgICAgICAvLyBmb3IgcmVjdXJzaXZlIGRlbGV0aW5nIGFuZCBjbGVhbmluZyBvZiB3YXRjaGVkIG9iamVjdFxuICAgICAgICAvLyBpZiBpdCBpcyBub3QgYSBkaXJlY3RvcnksIG5lc3RlZERpcmVjdG9yeUNoaWxkcmVuIHdpbGwgYmUgZW1wdHkgYXJyYXlcbiAgICAgICAgY29uc3QgcGF0aCA9IHN5c1BhdGguam9pbihkaXJlY3RvcnksIGl0ZW0pO1xuICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHN5c1BhdGgucmVzb2x2ZShwYXRoKTtcbiAgICAgICAgaXNEaXJlY3RvcnkgPVxuICAgICAgICAgICAgaXNEaXJlY3RvcnkgIT0gbnVsbCA/IGlzRGlyZWN0b3J5IDogdGhpcy5fd2F0Y2hlZC5oYXMocGF0aCkgfHwgdGhpcy5fd2F0Y2hlZC5oYXMoZnVsbFBhdGgpO1xuICAgICAgICAvLyBwcmV2ZW50IGR1cGxpY2F0ZSBoYW5kbGluZyBpbiBjYXNlIG9mIGFycml2aW5nIGhlcmUgbmVhcmx5IHNpbXVsdGFuZW91c2x5XG4gICAgICAgIC8vIHZpYSBtdWx0aXBsZSBwYXRocyAoc3VjaCBhcyBfaGFuZGxlRmlsZSBhbmQgX2hhbmRsZURpcilcbiAgICAgICAgaWYgKCF0aGlzLl90aHJvdHRsZSgncmVtb3ZlJywgcGF0aCwgMTAwKSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgLy8gaWYgdGhlIG9ubHkgd2F0Y2hlZCBmaWxlIGlzIHJlbW92ZWQsIHdhdGNoIGZvciBpdHMgcmV0dXJuXG4gICAgICAgIGlmICghaXNEaXJlY3RvcnkgJiYgdGhpcy5fd2F0Y2hlZC5zaXplID09PSAxKSB7XG4gICAgICAgICAgICB0aGlzLmFkZChkaXJlY3RvcnksIGl0ZW0sIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRoaXMgd2lsbCBjcmVhdGUgYSBuZXcgZW50cnkgaW4gdGhlIHdhdGNoZWQgb2JqZWN0IGluIGVpdGhlciBjYXNlXG4gICAgICAgIC8vIHNvIHdlIGdvdCB0byBkbyB0aGUgZGlyZWN0b3J5IGNoZWNrIGJlZm9yZWhhbmRcbiAgICAgICAgY29uc3Qgd3AgPSB0aGlzLl9nZXRXYXRjaGVkRGlyKHBhdGgpO1xuICAgICAgICBjb25zdCBuZXN0ZWREaXJlY3RvcnlDaGlsZHJlbiA9IHdwLmdldENoaWxkcmVuKCk7XG4gICAgICAgIC8vIFJlY3Vyc2l2ZWx5IHJlbW92ZSBjaGlsZHJlbiBkaXJlY3RvcmllcyAvIGZpbGVzLlxuICAgICAgICBuZXN0ZWREaXJlY3RvcnlDaGlsZHJlbi5mb3JFYWNoKChuZXN0ZWQpID0+IHRoaXMuX3JlbW92ZShwYXRoLCBuZXN0ZWQpKTtcbiAgICAgICAgLy8gQ2hlY2sgaWYgaXRlbSB3YXMgb24gdGhlIHdhdGNoZWQgbGlzdCBhbmQgcmVtb3ZlIGl0XG4gICAgICAgIGNvbnN0IHBhcmVudCA9IHRoaXMuX2dldFdhdGNoZWREaXIoZGlyZWN0b3J5KTtcbiAgICAgICAgY29uc3Qgd2FzVHJhY2tlZCA9IHBhcmVudC5oYXMoaXRlbSk7XG4gICAgICAgIHBhcmVudC5yZW1vdmUoaXRlbSk7XG4gICAgICAgIC8vIEZpeGVzIGlzc3VlICMxMDQyIC0+IFJlbGF0aXZlIHBhdGhzIHdlcmUgZGV0ZWN0ZWQgYW5kIGFkZGVkIGFzIHN5bWxpbmtzXG4gICAgICAgIC8vIChodHRwczovL2dpdGh1Yi5jb20vcGF1bG1pbGxyL2Nob2tpZGFyL2Jsb2IvZTE3NTNkZGJjOTU3MWJkYzMzYjRhNGFmMTcyZDUyY2I2ZTYxMWMxMC9saWIvbm9kZWZzLWhhbmRsZXIuanMjTDYxMiksXG4gICAgICAgIC8vIGJ1dCBuZXZlciByZW1vdmVkIGZyb20gdGhlIG1hcCBpbiBjYXNlIHRoZSBwYXRoIHdhcyBkZWxldGVkLlxuICAgICAgICAvLyBUaGlzIGxlYWRzIHRvIGFuIGluY29ycmVjdCBzdGF0ZSBpZiB0aGUgcGF0aCB3YXMgcmVjcmVhdGVkOlxuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vcGF1bG1pbGxyL2Nob2tpZGFyL2Jsb2IvZTE3NTNkZGJjOTU3MWJkYzMzYjRhNGFmMTcyZDUyY2I2ZTYxMWMxMC9saWIvbm9kZWZzLWhhbmRsZXIuanMjTDU1M1xuICAgICAgICBpZiAodGhpcy5fc3ltbGlua1BhdGhzLmhhcyhmdWxsUGF0aCkpIHtcbiAgICAgICAgICAgIHRoaXMuX3N5bWxpbmtQYXRocy5kZWxldGUoZnVsbFBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIC8vIElmIHdlIHdhaXQgZm9yIHRoaXMgZmlsZSB0byBiZSBmdWxseSB3cml0dGVuLCBjYW5jZWwgdGhlIHdhaXQuXG4gICAgICAgIGxldCByZWxQYXRoID0gcGF0aDtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5jd2QpXG4gICAgICAgICAgICByZWxQYXRoID0gc3lzUGF0aC5yZWxhdGl2ZSh0aGlzLm9wdGlvbnMuY3dkLCBwYXRoKTtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5hd2FpdFdyaXRlRmluaXNoICYmIHRoaXMuX3BlbmRpbmdXcml0ZXMuaGFzKHJlbFBhdGgpKSB7XG4gICAgICAgICAgICBjb25zdCBldmVudCA9IHRoaXMuX3BlbmRpbmdXcml0ZXMuZ2V0KHJlbFBhdGgpLmNhbmNlbFdhaXQoKTtcbiAgICAgICAgICAgIGlmIChldmVudCA9PT0gRVYuQUREKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBUaGUgRW50cnkgd2lsbCBlaXRoZXIgYmUgYSBkaXJlY3RvcnkgdGhhdCBqdXN0IGdvdCByZW1vdmVkXG4gICAgICAgIC8vIG9yIGEgYm9ndXMgZW50cnkgdG8gYSBmaWxlLCBpbiBlaXRoZXIgY2FzZSB3ZSBoYXZlIHRvIHJlbW92ZSBpdFxuICAgICAgICB0aGlzLl93YXRjaGVkLmRlbGV0ZShwYXRoKTtcbiAgICAgICAgdGhpcy5fd2F0Y2hlZC5kZWxldGUoZnVsbFBhdGgpO1xuICAgICAgICBjb25zdCBldmVudE5hbWUgPSBpc0RpcmVjdG9yeSA/IEVWLlVOTElOS19ESVIgOiBFVi5VTkxJTks7XG4gICAgICAgIGlmICh3YXNUcmFja2VkICYmICF0aGlzLl9pc0lnbm9yZWQocGF0aCkpXG4gICAgICAgICAgICB0aGlzLl9lbWl0KGV2ZW50TmFtZSwgcGF0aCk7XG4gICAgICAgIC8vIEF2b2lkIGNvbmZsaWN0cyBpZiB3ZSBsYXRlciBjcmVhdGUgYW5vdGhlciBmaWxlIHdpdGggdGhlIHNhbWUgbmFtZVxuICAgICAgICB0aGlzLl9jbG9zZVBhdGgocGF0aCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsb3NlcyBhbGwgd2F0Y2hlcnMgZm9yIGEgcGF0aFxuICAgICAqL1xuICAgIF9jbG9zZVBhdGgocGF0aCkge1xuICAgICAgICB0aGlzLl9jbG9zZUZpbGUocGF0aCk7XG4gICAgICAgIGNvbnN0IGRpciA9IHN5c1BhdGguZGlybmFtZShwYXRoKTtcbiAgICAgICAgdGhpcy5fZ2V0V2F0Y2hlZERpcihkaXIpLnJlbW92ZShzeXNQYXRoLmJhc2VuYW1lKHBhdGgpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xvc2VzIG9ubHkgZmlsZS1zcGVjaWZpYyB3YXRjaGVyc1xuICAgICAqL1xuICAgIF9jbG9zZUZpbGUocGF0aCkge1xuICAgICAgICBjb25zdCBjbG9zZXJzID0gdGhpcy5fY2xvc2Vycy5nZXQocGF0aCk7XG4gICAgICAgIGlmICghY2xvc2VycylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY2xvc2Vycy5mb3JFYWNoKChjbG9zZXIpID0+IGNsb3NlcigpKTtcbiAgICAgICAgdGhpcy5fY2xvc2Vycy5kZWxldGUocGF0aCk7XG4gICAgfVxuICAgIF9hZGRQYXRoQ2xvc2VyKHBhdGgsIGNsb3Nlcikge1xuICAgICAgICBpZiAoIWNsb3NlcilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgbGV0IGxpc3QgPSB0aGlzLl9jbG9zZXJzLmdldChwYXRoKTtcbiAgICAgICAgaWYgKCFsaXN0KSB7XG4gICAgICAgICAgICBsaXN0ID0gW107XG4gICAgICAgICAgICB0aGlzLl9jbG9zZXJzLnNldChwYXRoLCBsaXN0KTtcbiAgICAgICAgfVxuICAgICAgICBsaXN0LnB1c2goY2xvc2VyKTtcbiAgICB9XG4gICAgX3JlYWRkaXJwKHJvb3QsIG9wdHMpIHtcbiAgICAgICAgaWYgKHRoaXMuY2xvc2VkKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCBvcHRpb25zID0geyB0eXBlOiBFVi5BTEwsIGFsd2F5c1N0YXQ6IHRydWUsIGxzdGF0OiB0cnVlLCAuLi5vcHRzLCBkZXB0aDogMCB9O1xuICAgICAgICBsZXQgc3RyZWFtID0gcmVhZGRpcnAocm9vdCwgb3B0aW9ucyk7XG4gICAgICAgIHRoaXMuX3N0cmVhbXMuYWRkKHN0cmVhbSk7XG4gICAgICAgIHN0cmVhbS5vbmNlKFNUUl9DTE9TRSwgKCkgPT4ge1xuICAgICAgICAgICAgc3RyZWFtID0gdW5kZWZpbmVkO1xuICAgICAgICB9KTtcbiAgICAgICAgc3RyZWFtLm9uY2UoU1RSX0VORCwgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHN0cmVhbSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0cmVhbXMuZGVsZXRlKHN0cmVhbSk7XG4gICAgICAgICAgICAgICAgc3RyZWFtID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN0cmVhbTtcbiAgICB9XG59XG4vKipcbiAqIEluc3RhbnRpYXRlcyB3YXRjaGVyIHdpdGggcGF0aHMgdG8gYmUgdHJhY2tlZC5cbiAqIEBwYXJhbSBwYXRocyBmaWxlIC8gZGlyZWN0b3J5IHBhdGhzXG4gKiBAcGFyYW0gb3B0aW9ucyBvcHRzLCBzdWNoIGFzIGBhdG9taWNgLCBgYXdhaXRXcml0ZUZpbmlzaGAsIGBpZ25vcmVkYCwgYW5kIG90aGVyc1xuICogQHJldHVybnMgYW4gaW5zdGFuY2Ugb2YgRlNXYXRjaGVyIGZvciBjaGFpbmluZy5cbiAqIEBleGFtcGxlXG4gKiBjb25zdCB3YXRjaGVyID0gd2F0Y2goJy4nKS5vbignYWxsJywgKGV2ZW50LCBwYXRoKSA9PiB7IGNvbnNvbGUubG9nKGV2ZW50LCBwYXRoKTsgfSk7XG4gKiB3YXRjaCgnLicsIHsgYXRvbWljOiB0cnVlLCBhd2FpdFdyaXRlRmluaXNoOiB0cnVlLCBpZ25vcmVkOiAoZiwgc3RhdHMpID0+IHN0YXRzPy5pc0ZpbGUoKSAmJiAhZi5lbmRzV2l0aCgnLmpzJykgfSlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdhdGNoKHBhdGhzLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCB3YXRjaGVyID0gbmV3IEZTV2F0Y2hlcihvcHRpb25zKTtcbiAgICB3YXRjaGVyLmFkZChwYXRocyk7XG4gICAgcmV0dXJuIHdhdGNoZXI7XG59XG5leHBvcnQgZGVmYXVsdCB7IHdhdGNoLCBGU1dhdGNoZXIgfTtcbiIsICJpbXBvcnQgeyBzdGF0LCBsc3RhdCwgcmVhZGRpciwgcmVhbHBhdGggfSBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCB7IFJlYWRhYmxlIH0gZnJvbSAnbm9kZTpzdHJlYW0nO1xuaW1wb3J0IHsgcmVzb2x2ZSBhcyBwcmVzb2x2ZSwgcmVsYXRpdmUgYXMgcHJlbGF0aXZlLCBqb2luIGFzIHBqb2luLCBzZXAgYXMgcHNlcCB9IGZyb20gJ25vZGU6cGF0aCc7XG5leHBvcnQgY29uc3QgRW50cnlUeXBlcyA9IHtcbiAgICBGSUxFX1RZUEU6ICdmaWxlcycsXG4gICAgRElSX1RZUEU6ICdkaXJlY3RvcmllcycsXG4gICAgRklMRV9ESVJfVFlQRTogJ2ZpbGVzX2RpcmVjdG9yaWVzJyxcbiAgICBFVkVSWVRISU5HX1RZUEU6ICdhbGwnLFxufTtcbmNvbnN0IGRlZmF1bHRPcHRpb25zID0ge1xuICAgIHJvb3Q6ICcuJyxcbiAgICBmaWxlRmlsdGVyOiAoX2VudHJ5SW5mbykgPT4gdHJ1ZSxcbiAgICBkaXJlY3RvcnlGaWx0ZXI6IChfZW50cnlJbmZvKSA9PiB0cnVlLFxuICAgIHR5cGU6IEVudHJ5VHlwZXMuRklMRV9UWVBFLFxuICAgIGxzdGF0OiBmYWxzZSxcbiAgICBkZXB0aDogMjE0NzQ4MzY0OCxcbiAgICBhbHdheXNTdGF0OiBmYWxzZSxcbiAgICBoaWdoV2F0ZXJNYXJrOiA0MDk2LFxufTtcbk9iamVjdC5mcmVlemUoZGVmYXVsdE9wdGlvbnMpO1xuY29uc3QgUkVDVVJTSVZFX0VSUk9SX0NPREUgPSAnUkVBRERJUlBfUkVDVVJTSVZFX0VSUk9SJztcbmNvbnN0IE5PUk1BTF9GTE9XX0VSUk9SUyA9IG5ldyBTZXQoWydFTk9FTlQnLCAnRVBFUk0nLCAnRUFDQ0VTJywgJ0VMT09QJywgUkVDVVJTSVZFX0VSUk9SX0NPREVdKTtcbmNvbnN0IEFMTF9UWVBFUyA9IFtcbiAgICBFbnRyeVR5cGVzLkRJUl9UWVBFLFxuICAgIEVudHJ5VHlwZXMuRVZFUllUSElOR19UWVBFLFxuICAgIEVudHJ5VHlwZXMuRklMRV9ESVJfVFlQRSxcbiAgICBFbnRyeVR5cGVzLkZJTEVfVFlQRSxcbl07XG5jb25zdCBESVJfVFlQRVMgPSBuZXcgU2V0KFtcbiAgICBFbnRyeVR5cGVzLkRJUl9UWVBFLFxuICAgIEVudHJ5VHlwZXMuRVZFUllUSElOR19UWVBFLFxuICAgIEVudHJ5VHlwZXMuRklMRV9ESVJfVFlQRSxcbl0pO1xuY29uc3QgRklMRV9UWVBFUyA9IG5ldyBTZXQoW1xuICAgIEVudHJ5VHlwZXMuRVZFUllUSElOR19UWVBFLFxuICAgIEVudHJ5VHlwZXMuRklMRV9ESVJfVFlQRSxcbiAgICBFbnRyeVR5cGVzLkZJTEVfVFlQRSxcbl0pO1xuY29uc3QgaXNOb3JtYWxGbG93RXJyb3IgPSAoZXJyb3IpID0+IE5PUk1BTF9GTE9XX0VSUk9SUy5oYXMoZXJyb3IuY29kZSk7XG5jb25zdCB3YW50QmlnaW50RnNTdGF0cyA9IHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMic7XG5jb25zdCBlbXB0eUZuID0gKF9lbnRyeUluZm8pID0+IHRydWU7XG5jb25zdCBub3JtYWxpemVGaWx0ZXIgPSAoZmlsdGVyKSA9PiB7XG4gICAgaWYgKGZpbHRlciA9PT0gdW5kZWZpbmVkKVxuICAgICAgICByZXR1cm4gZW1wdHlGbjtcbiAgICBpZiAodHlwZW9mIGZpbHRlciA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgcmV0dXJuIGZpbHRlcjtcbiAgICBpZiAodHlwZW9mIGZpbHRlciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgY29uc3QgZmwgPSBmaWx0ZXIudHJpbSgpO1xuICAgICAgICByZXR1cm4gKGVudHJ5KSA9PiBlbnRyeS5iYXNlbmFtZSA9PT0gZmw7XG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KGZpbHRlcikpIHtcbiAgICAgICAgY29uc3QgdHJJdGVtcyA9IGZpbHRlci5tYXAoKGl0ZW0pID0+IGl0ZW0udHJpbSgpKTtcbiAgICAgICAgcmV0dXJuIChlbnRyeSkgPT4gdHJJdGVtcy5zb21lKChmKSA9PiBlbnRyeS5iYXNlbmFtZSA9PT0gZik7XG4gICAgfVxuICAgIHJldHVybiBlbXB0eUZuO1xufTtcbi8qKiBSZWFkYWJsZSByZWFkZGlyIHN0cmVhbSwgZW1pdHRpbmcgbmV3IGZpbGVzIGFzIHRoZXkncmUgYmVpbmcgbGlzdGVkLiAqL1xuZXhwb3J0IGNsYXNzIFJlYWRkaXJwU3RyZWFtIGV4dGVuZHMgUmVhZGFibGUge1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSkge1xuICAgICAgICBzdXBlcih7XG4gICAgICAgICAgICBvYmplY3RNb2RlOiB0cnVlLFxuICAgICAgICAgICAgYXV0b0Rlc3Ryb3k6IHRydWUsXG4gICAgICAgICAgICBoaWdoV2F0ZXJNYXJrOiBvcHRpb25zLmhpZ2hXYXRlck1hcmssXG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCBvcHRzID0geyAuLi5kZWZhdWx0T3B0aW9ucywgLi4ub3B0aW9ucyB9O1xuICAgICAgICBjb25zdCB7IHJvb3QsIHR5cGUgfSA9IG9wdHM7XG4gICAgICAgIHRoaXMuX2ZpbGVGaWx0ZXIgPSBub3JtYWxpemVGaWx0ZXIob3B0cy5maWxlRmlsdGVyKTtcbiAgICAgICAgdGhpcy5fZGlyZWN0b3J5RmlsdGVyID0gbm9ybWFsaXplRmlsdGVyKG9wdHMuZGlyZWN0b3J5RmlsdGVyKTtcbiAgICAgICAgY29uc3Qgc3RhdE1ldGhvZCA9IG9wdHMubHN0YXQgPyBsc3RhdCA6IHN0YXQ7XG4gICAgICAgIC8vIFVzZSBiaWdpbnQgc3RhdHMgaWYgaXQncyB3aW5kb3dzIGFuZCBzdGF0KCkgc3VwcG9ydHMgb3B0aW9ucyAobm9kZSAxMCspLlxuICAgICAgICBpZiAod2FudEJpZ2ludEZzU3RhdHMpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YXQgPSAocGF0aCkgPT4gc3RhdE1ldGhvZChwYXRoLCB7IGJpZ2ludDogdHJ1ZSB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YXQgPSBzdGF0TWV0aG9kO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX21heERlcHRoID0gb3B0cy5kZXB0aCA/PyBkZWZhdWx0T3B0aW9ucy5kZXB0aDtcbiAgICAgICAgdGhpcy5fd2FudHNEaXIgPSB0eXBlID8gRElSX1RZUEVTLmhhcyh0eXBlKSA6IGZhbHNlO1xuICAgICAgICB0aGlzLl93YW50c0ZpbGUgPSB0eXBlID8gRklMRV9UWVBFUy5oYXModHlwZSkgOiBmYWxzZTtcbiAgICAgICAgdGhpcy5fd2FudHNFdmVyeXRoaW5nID0gdHlwZSA9PT0gRW50cnlUeXBlcy5FVkVSWVRISU5HX1RZUEU7XG4gICAgICAgIHRoaXMuX3Jvb3QgPSBwcmVzb2x2ZShyb290KTtcbiAgICAgICAgdGhpcy5faXNEaXJlbnQgPSAhb3B0cy5hbHdheXNTdGF0O1xuICAgICAgICB0aGlzLl9zdGF0c1Byb3AgPSB0aGlzLl9pc0RpcmVudCA/ICdkaXJlbnQnIDogJ3N0YXRzJztcbiAgICAgICAgdGhpcy5fcmRPcHRpb25zID0geyBlbmNvZGluZzogJ3V0ZjgnLCB3aXRoRmlsZVR5cGVzOiB0aGlzLl9pc0RpcmVudCB9O1xuICAgICAgICAvLyBMYXVuY2ggc3RyZWFtIHdpdGggb25lIHBhcmVudCwgdGhlIHJvb3QgZGlyLlxuICAgICAgICB0aGlzLnBhcmVudHMgPSBbdGhpcy5fZXhwbG9yZURpcihyb290LCAxKV07XG4gICAgICAgIHRoaXMucmVhZGluZyA9IGZhbHNlO1xuICAgICAgICB0aGlzLnBhcmVudCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgYXN5bmMgX3JlYWQoYmF0Y2gpIHtcbiAgICAgICAgaWYgKHRoaXMucmVhZGluZylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdGhpcy5yZWFkaW5nID0gdHJ1ZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHdoaWxlICghdGhpcy5kZXN0cm95ZWQgJiYgYmF0Y2ggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyID0gdGhpcy5wYXJlbnQ7XG4gICAgICAgICAgICAgICAgY29uc3QgZmlsID0gcGFyICYmIHBhci5maWxlcztcbiAgICAgICAgICAgICAgICBpZiAoZmlsICYmIGZpbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcGF0aCwgZGVwdGggfSA9IHBhcjtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2xpY2UgPSBmaWwuc3BsaWNlKDAsIGJhdGNoKS5tYXAoKGRpcmVudCkgPT4gdGhpcy5fZm9ybWF0RW50cnkoZGlyZW50LCBwYXRoKSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGF3YWl0ZWQgPSBhd2FpdCBQcm9taXNlLmFsbChzbGljZSk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgYXdhaXRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlbnRyeSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmRlc3Ryb3llZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbnRyeVR5cGUgPSBhd2FpdCB0aGlzLl9nZXRFbnRyeVR5cGUoZW50cnkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVudHJ5VHlwZSA9PT0gJ2RpcmVjdG9yeScgJiYgdGhpcy5fZGlyZWN0b3J5RmlsdGVyKGVudHJ5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkZXB0aCA8PSB0aGlzLl9tYXhEZXB0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcmVudHMucHVzaCh0aGlzLl9leHBsb3JlRGlyKGVudHJ5LmZ1bGxQYXRoLCBkZXB0aCArIDEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuX3dhbnRzRGlyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaChlbnRyeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJhdGNoLS07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoKGVudHJ5VHlwZSA9PT0gJ2ZpbGUnIHx8IHRoaXMuX2luY2x1ZGVBc0ZpbGUoZW50cnkpKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2ZpbGVGaWx0ZXIoZW50cnkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuX3dhbnRzRmlsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2goZW50cnkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiYXRjaC0tO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyZW50ID0gdGhpcy5wYXJlbnRzLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXBhcmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wYXJlbnQgPSBhd2FpdCBwYXJlbnQ7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmRlc3Ryb3llZClcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3Ryb3koZXJyb3IpO1xuICAgICAgICB9XG4gICAgICAgIGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5yZWFkaW5nID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgYXN5bmMgX2V4cGxvcmVEaXIocGF0aCwgZGVwdGgpIHtcbiAgICAgICAgbGV0IGZpbGVzO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgZmlsZXMgPSBhd2FpdCByZWFkZGlyKHBhdGgsIHRoaXMuX3JkT3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICB0aGlzLl9vbkVycm9yKGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBmaWxlcywgZGVwdGgsIHBhdGggfTtcbiAgICB9XG4gICAgYXN5bmMgX2Zvcm1hdEVudHJ5KGRpcmVudCwgcGF0aCkge1xuICAgICAgICBsZXQgZW50cnk7XG4gICAgICAgIGNvbnN0IGJhc2VuYW1lID0gdGhpcy5faXNEaXJlbnQgPyBkaXJlbnQubmFtZSA6IGRpcmVudDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcHJlc29sdmUocGpvaW4ocGF0aCwgYmFzZW5hbWUpKTtcbiAgICAgICAgICAgIGVudHJ5ID0geyBwYXRoOiBwcmVsYXRpdmUodGhpcy5fcm9vdCwgZnVsbFBhdGgpLCBmdWxsUGF0aCwgYmFzZW5hbWUgfTtcbiAgICAgICAgICAgIGVudHJ5W3RoaXMuX3N0YXRzUHJvcF0gPSB0aGlzLl9pc0RpcmVudCA/IGRpcmVudCA6IGF3YWl0IHRoaXMuX3N0YXQoZnVsbFBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHRoaXMuX29uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZW50cnk7XG4gICAgfVxuICAgIF9vbkVycm9yKGVycikge1xuICAgICAgICBpZiAoaXNOb3JtYWxGbG93RXJyb3IoZXJyKSAmJiAhdGhpcy5kZXN0cm95ZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdCgnd2FybicsIGVycik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmRlc3Ryb3koZXJyKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBhc3luYyBfZ2V0RW50cnlUeXBlKGVudHJ5KSB7XG4gICAgICAgIC8vIGVudHJ5IG1heSBiZSB1bmRlZmluZWQsIGJlY2F1c2UgYSB3YXJuaW5nIG9yIGFuIGVycm9yIHdlcmUgZW1pdHRlZFxuICAgICAgICAvLyBhbmQgdGhlIHN0YXRzUHJvcCBpcyB1bmRlZmluZWRcbiAgICAgICAgaWYgKCFlbnRyeSAmJiB0aGlzLl9zdGF0c1Byb3AgaW4gZW50cnkpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzdGF0cyA9IGVudHJ5W3RoaXMuX3N0YXRzUHJvcF07XG4gICAgICAgIGlmIChzdGF0cy5pc0ZpbGUoKSlcbiAgICAgICAgICAgIHJldHVybiAnZmlsZSc7XG4gICAgICAgIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKVxuICAgICAgICAgICAgcmV0dXJuICdkaXJlY3RvcnknO1xuICAgICAgICBpZiAoc3RhdHMgJiYgc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgICAgY29uc3QgZnVsbCA9IGVudHJ5LmZ1bGxQYXRoO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBlbnRyeVJlYWxQYXRoID0gYXdhaXQgcmVhbHBhdGgoZnVsbCk7XG4gICAgICAgICAgICAgICAgY29uc3QgZW50cnlSZWFsUGF0aFN0YXRzID0gYXdhaXQgbHN0YXQoZW50cnlSZWFsUGF0aCk7XG4gICAgICAgICAgICAgICAgaWYgKGVudHJ5UmVhbFBhdGhTdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ2ZpbGUnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZW50cnlSZWFsUGF0aFN0YXRzLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGVuID0gZW50cnlSZWFsUGF0aC5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmdWxsLnN0YXJ0c1dpdGgoZW50cnlSZWFsUGF0aCkgJiYgZnVsbC5zdWJzdHIobGVuLCAxKSA9PT0gcHNlcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjdXJzaXZlRXJyb3IgPSBuZXcgRXJyb3IoYENpcmN1bGFyIHN5bWxpbmsgZGV0ZWN0ZWQ6IFwiJHtmdWxsfVwiIHBvaW50cyB0byBcIiR7ZW50cnlSZWFsUGF0aH1cImApO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVjdXJzaXZlRXJyb3IuY29kZSA9IFJFQ1VSU0lWRV9FUlJPUl9DT0RFO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29uRXJyb3IocmVjdXJzaXZlRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnZGlyZWN0b3J5JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9vbkVycm9yKGVycm9yKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgX2luY2x1ZGVBc0ZpbGUoZW50cnkpIHtcbiAgICAgICAgY29uc3Qgc3RhdHMgPSBlbnRyeSAmJiBlbnRyeVt0aGlzLl9zdGF0c1Byb3BdO1xuICAgICAgICByZXR1cm4gc3RhdHMgJiYgdGhpcy5fd2FudHNFdmVyeXRoaW5nICYmICFzdGF0cy5pc0RpcmVjdG9yeSgpO1xuICAgIH1cbn1cbi8qKlxuICogU3RyZWFtaW5nIHZlcnNpb246IFJlYWRzIGFsbCBmaWxlcyBhbmQgZGlyZWN0b3JpZXMgaW4gZ2l2ZW4gcm9vdCByZWN1cnNpdmVseS5cbiAqIENvbnN1bWVzIH5jb25zdGFudCBzbWFsbCBhbW91bnQgb2YgUkFNLlxuICogQHBhcmFtIHJvb3QgUm9vdCBkaXJlY3RvcnlcbiAqIEBwYXJhbSBvcHRpb25zIE9wdGlvbnMgdG8gc3BlY2lmeSByb290IChzdGFydCBkaXJlY3RvcnkpLCBmaWx0ZXJzIGFuZCByZWN1cnNpb24gZGVwdGhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRkaXJwKHJvb3QsIG9wdGlvbnMgPSB7fSkge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBsZXQgdHlwZSA9IG9wdGlvbnMuZW50cnlUeXBlIHx8IG9wdGlvbnMudHlwZTtcbiAgICBpZiAodHlwZSA9PT0gJ2JvdGgnKVxuICAgICAgICB0eXBlID0gRW50cnlUeXBlcy5GSUxFX0RJUl9UWVBFOyAvLyBiYWNrd2FyZHMtY29tcGF0aWJpbGl0eVxuICAgIGlmICh0eXBlKVxuICAgICAgICBvcHRpb25zLnR5cGUgPSB0eXBlO1xuICAgIGlmICghcm9vdCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlYWRkaXJwOiByb290IGFyZ3VtZW50IGlzIHJlcXVpcmVkLiBVc2FnZTogcmVhZGRpcnAocm9vdCwgb3B0aW9ucyknKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIHJvb3QgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3JlYWRkaXJwOiByb290IGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcuIFVzYWdlOiByZWFkZGlycChyb290LCBvcHRpb25zKScpO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlICYmICFBTExfVFlQRVMuaW5jbHVkZXModHlwZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGByZWFkZGlycDogSW52YWxpZCB0eXBlIHBhc3NlZC4gVXNlIG9uZSBvZiAke0FMTF9UWVBFUy5qb2luKCcsICcpfWApO1xuICAgIH1cbiAgICBvcHRpb25zLnJvb3QgPSByb290O1xuICAgIHJldHVybiBuZXcgUmVhZGRpcnBTdHJlYW0ob3B0aW9ucyk7XG59XG4vKipcbiAqIFByb21pc2UgdmVyc2lvbjogUmVhZHMgYWxsIGZpbGVzIGFuZCBkaXJlY3RvcmllcyBpbiBnaXZlbiByb290IHJlY3Vyc2l2ZWx5LlxuICogQ29tcGFyZWQgdG8gc3RyZWFtaW5nIHZlcnNpb24sIHdpbGwgY29uc3VtZSBhIGxvdCBvZiBSQU0gZS5nLiB3aGVuIDEgbWlsbGlvbiBmaWxlcyBhcmUgbGlzdGVkLlxuICogQHJldHVybnMgYXJyYXkgb2YgcGF0aHMgYW5kIHRoZWlyIGVudHJ5IGluZm9zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkZGlycFByb21pc2Uocm9vdCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgZmlsZXMgPSBbXTtcbiAgICAgICAgcmVhZGRpcnAocm9vdCwgb3B0aW9ucylcbiAgICAgICAgICAgIC5vbignZGF0YScsIChlbnRyeSkgPT4gZmlsZXMucHVzaChlbnRyeSkpXG4gICAgICAgICAgICAub24oJ2VuZCcsICgpID0+IHJlc29sdmUoZmlsZXMpKVxuICAgICAgICAgICAgLm9uKCdlcnJvcicsIChlcnJvcikgPT4gcmVqZWN0KGVycm9yKSk7XG4gICAgfSk7XG59XG5leHBvcnQgZGVmYXVsdCByZWFkZGlycDtcbiIsICJpbXBvcnQgeyB3YXRjaEZpbGUsIHVud2F0Y2hGaWxlLCB3YXRjaCBhcyBmc193YXRjaCB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IG9wZW4sIHN0YXQsIGxzdGF0LCByZWFscGF0aCBhcyBmc3JlYWxwYXRoIH0gZnJvbSAnZnMvcHJvbWlzZXMnO1xuaW1wb3J0ICogYXMgc3lzUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IHR5cGUgYXMgb3NUeXBlIH0gZnJvbSAnb3MnO1xuZXhwb3J0IGNvbnN0IFNUUl9EQVRBID0gJ2RhdGEnO1xuZXhwb3J0IGNvbnN0IFNUUl9FTkQgPSAnZW5kJztcbmV4cG9ydCBjb25zdCBTVFJfQ0xPU0UgPSAnY2xvc2UnO1xuZXhwb3J0IGNvbnN0IEVNUFRZX0ZOID0gKCkgPT4geyB9O1xuZXhwb3J0IGNvbnN0IElERU5USVRZX0ZOID0gKHZhbCkgPT4gdmFsO1xuY29uc3QgcGwgPSBwcm9jZXNzLnBsYXRmb3JtO1xuZXhwb3J0IGNvbnN0IGlzV2luZG93cyA9IHBsID09PSAnd2luMzInO1xuZXhwb3J0IGNvbnN0IGlzTWFjb3MgPSBwbCA9PT0gJ2Rhcndpbic7XG5leHBvcnQgY29uc3QgaXNMaW51eCA9IHBsID09PSAnbGludXgnO1xuZXhwb3J0IGNvbnN0IGlzRnJlZUJTRCA9IHBsID09PSAnZnJlZWJzZCc7XG5leHBvcnQgY29uc3QgaXNJQk1pID0gb3NUeXBlKCkgPT09ICdPUzQwMCc7XG5leHBvcnQgY29uc3QgRVZFTlRTID0ge1xuICAgIEFMTDogJ2FsbCcsXG4gICAgUkVBRFk6ICdyZWFkeScsXG4gICAgQUREOiAnYWRkJyxcbiAgICBDSEFOR0U6ICdjaGFuZ2UnLFxuICAgIEFERF9ESVI6ICdhZGREaXInLFxuICAgIFVOTElOSzogJ3VubGluaycsXG4gICAgVU5MSU5LX0RJUjogJ3VubGlua0RpcicsXG4gICAgUkFXOiAncmF3JyxcbiAgICBFUlJPUjogJ2Vycm9yJyxcbn07XG5jb25zdCBFViA9IEVWRU5UUztcbmNvbnN0IFRIUk9UVExFX01PREVfV0FUQ0ggPSAnd2F0Y2gnO1xuY29uc3Qgc3RhdE1ldGhvZHMgPSB7IGxzdGF0LCBzdGF0IH07XG5jb25zdCBLRVlfTElTVEVORVJTID0gJ2xpc3RlbmVycyc7XG5jb25zdCBLRVlfRVJSID0gJ2VyckhhbmRsZXJzJztcbmNvbnN0IEtFWV9SQVcgPSAncmF3RW1pdHRlcnMnO1xuY29uc3QgSEFORExFUl9LRVlTID0gW0tFWV9MSVNURU5FUlMsIEtFWV9FUlIsIEtFWV9SQVddO1xuLy8gcHJldHRpZXItaWdub3JlXG5jb25zdCBiaW5hcnlFeHRlbnNpb25zID0gbmV3IFNldChbXG4gICAgJzNkbScsICczZHMnLCAnM2cyJywgJzNncCcsICc3eicsICdhJywgJ2FhYycsICdhZHAnLCAnYWZkZXNpZ24nLCAnYWZwaG90bycsICdhZnB1YicsICdhaScsXG4gICAgJ2FpZicsICdhaWZmJywgJ2FseicsICdhcGUnLCAnYXBrJywgJ2FwcGltYWdlJywgJ2FyJywgJ2FyaicsICdhc2YnLCAnYXUnLCAnYXZpJyxcbiAgICAnYmFrJywgJ2JhbWwnLCAnYmgnLCAnYmluJywgJ2JrJywgJ2JtcCcsICdidGlmJywgJ2J6MicsICdiemlwMicsXG4gICAgJ2NhYicsICdjYWYnLCAnY2dtJywgJ2NsYXNzJywgJ2NteCcsICdjcGlvJywgJ2NyMicsICdjdXInLCAnZGF0JywgJ2RjbScsICdkZWInLCAnZGV4JywgJ2RqdnUnLFxuICAgICdkbGwnLCAnZG1nJywgJ2RuZycsICdkb2MnLCAnZG9jbScsICdkb2N4JywgJ2RvdCcsICdkb3RtJywgJ2RyYScsICdEU19TdG9yZScsICdkc2snLCAnZHRzJyxcbiAgICAnZHRzaGQnLCAnZHZiJywgJ2R3ZycsICdkeGYnLFxuICAgICdlY2VscDQ4MDAnLCAnZWNlbHA3NDcwJywgJ2VjZWxwOTYwMCcsICdlZ2cnLCAnZW9sJywgJ2VvdCcsICdlcHViJywgJ2V4ZScsXG4gICAgJ2Y0dicsICdmYnMnLCAnZmgnLCAnZmxhJywgJ2ZsYWMnLCAnZmxhdHBhaycsICdmbGknLCAnZmx2JywgJ2ZweCcsICdmc3QnLCAnZnZ0JyxcbiAgICAnZzMnLCAnZ2gnLCAnZ2lmJywgJ2dyYWZmbGUnLCAnZ3onLCAnZ3ppcCcsXG4gICAgJ2gyNjEnLCAnaDI2MycsICdoMjY0JywgJ2ljbnMnLCAnaWNvJywgJ2llZicsICdpbWcnLCAnaXBhJywgJ2lzbycsXG4gICAgJ2phcicsICdqcGVnJywgJ2pwZycsICdqcGd2JywgJ2pwbScsICdqeHInLCAna2V5JywgJ2t0eCcsXG4gICAgJ2xoYScsICdsaWInLCAnbHZwJywgJ2x6JywgJ2x6aCcsICdsem1hJywgJ2x6bycsXG4gICAgJ20zdScsICdtNGEnLCAnbTR2JywgJ21hcicsICdtZGknLCAnbWh0JywgJ21pZCcsICdtaWRpJywgJ21qMicsICdta2EnLCAnbWt2JywgJ21tcicsICdtbmcnLFxuICAgICdtb2JpJywgJ21vdicsICdtb3ZpZScsICdtcDMnLFxuICAgICdtcDQnLCAnbXA0YScsICdtcGVnJywgJ21wZycsICdtcGdhJywgJ214dScsXG4gICAgJ25lZicsICducHgnLCAnbnVtYmVycycsICdudXBrZycsXG4gICAgJ28nLCAnb2RwJywgJ29kcycsICdvZHQnLCAnb2dhJywgJ29nZycsICdvZ3YnLCAnb3RmJywgJ290dCcsXG4gICAgJ3BhZ2VzJywgJ3BibScsICdwY3gnLCAncGRiJywgJ3BkZicsICdwZWEnLCAncGdtJywgJ3BpYycsICdwbmcnLCAncG5tJywgJ3BvdCcsICdwb3RtJyxcbiAgICAncG90eCcsICdwcGEnLCAncHBhbScsXG4gICAgJ3BwbScsICdwcHMnLCAncHBzbScsICdwcHN4JywgJ3BwdCcsICdwcHRtJywgJ3BwdHgnLCAncHNkJywgJ3B5YScsICdweWMnLCAncHlvJywgJ3B5dicsXG4gICAgJ3F0JyxcbiAgICAncmFyJywgJ3JhcycsICdyYXcnLCAncmVzb3VyY2VzJywgJ3JnYicsICdyaXAnLCAncmxjJywgJ3JtZicsICdybXZiJywgJ3JwbScsICdydGYnLCAncnonLFxuICAgICdzM20nLCAnczd6JywgJ3NjcHQnLCAnc2dpJywgJ3NoYXInLCAnc25hcCcsICdzaWwnLCAnc2tldGNoJywgJ3NsaycsICdzbXYnLCAnc25rJywgJ3NvJyxcbiAgICAnc3RsJywgJ3N1bycsICdzdWInLCAnc3dmJyxcbiAgICAndGFyJywgJ3RieicsICd0YnoyJywgJ3RnYScsICd0Z3onLCAndGhteCcsICd0aWYnLCAndGlmZicsICd0bHonLCAndHRjJywgJ3R0ZicsICd0eHonLFxuICAgICd1ZGYnLCAndXZoJywgJ3V2aScsICd1dm0nLCAndXZwJywgJ3V2cycsICd1dnUnLFxuICAgICd2aXYnLCAndm9iJyxcbiAgICAnd2FyJywgJ3dhdicsICd3YXgnLCAnd2JtcCcsICd3ZHAnLCAnd2ViYScsICd3ZWJtJywgJ3dlYnAnLCAnd2hsJywgJ3dpbScsICd3bScsICd3bWEnLFxuICAgICd3bXYnLCAnd214JywgJ3dvZmYnLCAnd29mZjInLCAnd3JtJywgJ3d2eCcsXG4gICAgJ3hibScsICd4aWYnLCAneGxhJywgJ3hsYW0nLCAneGxzJywgJ3hsc2InLCAneGxzbScsICd4bHN4JywgJ3hsdCcsICd4bHRtJywgJ3hsdHgnLCAneG0nLFxuICAgICd4bWluZCcsICd4cGknLCAneHBtJywgJ3h3ZCcsICd4eicsXG4gICAgJ3onLCAnemlwJywgJ3ppcHgnLFxuXSk7XG5jb25zdCBpc0JpbmFyeVBhdGggPSAoZmlsZVBhdGgpID0+IGJpbmFyeUV4dGVuc2lvbnMuaGFzKHN5c1BhdGguZXh0bmFtZShmaWxlUGF0aCkuc2xpY2UoMSkudG9Mb3dlckNhc2UoKSk7XG4vLyBUT0RPOiBlbWl0IGVycm9ycyBwcm9wZXJseS4gRXhhbXBsZTogRU1GSUxFIG9uIE1hY29zLlxuY29uc3QgZm9yZWFjaCA9ICh2YWwsIGZuKSA9PiB7XG4gICAgaWYgKHZhbCBpbnN0YW5jZW9mIFNldCkge1xuICAgICAgICB2YWwuZm9yRWFjaChmbik7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBmbih2YWwpO1xuICAgIH1cbn07XG5jb25zdCBhZGRBbmRDb252ZXJ0ID0gKG1haW4sIHByb3AsIGl0ZW0pID0+IHtcbiAgICBsZXQgY29udGFpbmVyID0gbWFpbltwcm9wXTtcbiAgICBpZiAoIShjb250YWluZXIgaW5zdGFuY2VvZiBTZXQpKSB7XG4gICAgICAgIG1haW5bcHJvcF0gPSBjb250YWluZXIgPSBuZXcgU2V0KFtjb250YWluZXJdKTtcbiAgICB9XG4gICAgY29udGFpbmVyLmFkZChpdGVtKTtcbn07XG5jb25zdCBjbGVhckl0ZW0gPSAoY29udCkgPT4gKGtleSkgPT4ge1xuICAgIGNvbnN0IHNldCA9IGNvbnRba2V5XTtcbiAgICBpZiAoc2V0IGluc3RhbmNlb2YgU2V0KSB7XG4gICAgICAgIHNldC5jbGVhcigpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgZGVsZXRlIGNvbnRba2V5XTtcbiAgICB9XG59O1xuY29uc3QgZGVsRnJvbVNldCA9IChtYWluLCBwcm9wLCBpdGVtKSA9PiB7XG4gICAgY29uc3QgY29udGFpbmVyID0gbWFpbltwcm9wXTtcbiAgICBpZiAoY29udGFpbmVyIGluc3RhbmNlb2YgU2V0KSB7XG4gICAgICAgIGNvbnRhaW5lci5kZWxldGUoaXRlbSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGNvbnRhaW5lciA9PT0gaXRlbSkge1xuICAgICAgICBkZWxldGUgbWFpbltwcm9wXTtcbiAgICB9XG59O1xuY29uc3QgaXNFbXB0eVNldCA9ICh2YWwpID0+ICh2YWwgaW5zdGFuY2VvZiBTZXQgPyB2YWwuc2l6ZSA9PT0gMCA6ICF2YWwpO1xuY29uc3QgRnNXYXRjaEluc3RhbmNlcyA9IG5ldyBNYXAoKTtcbi8qKlxuICogSW5zdGFudGlhdGVzIHRoZSBmc193YXRjaCBpbnRlcmZhY2VcbiAqIEBwYXJhbSBwYXRoIHRvIGJlIHdhdGNoZWRcbiAqIEBwYXJhbSBvcHRpb25zIHRvIGJlIHBhc3NlZCB0byBmc193YXRjaFxuICogQHBhcmFtIGxpc3RlbmVyIG1haW4gZXZlbnQgaGFuZGxlclxuICogQHBhcmFtIGVyckhhbmRsZXIgZW1pdHMgaW5mbyBhYm91dCBlcnJvcnNcbiAqIEBwYXJhbSBlbWl0UmF3IGVtaXRzIHJhdyBldmVudCBkYXRhXG4gKiBAcmV0dXJucyB7TmF0aXZlRnNXYXRjaGVyfVxuICovXG5mdW5jdGlvbiBjcmVhdGVGc1dhdGNoSW5zdGFuY2UocGF0aCwgb3B0aW9ucywgbGlzdGVuZXIsIGVyckhhbmRsZXIsIGVtaXRSYXcpIHtcbiAgICBjb25zdCBoYW5kbGVFdmVudCA9IChyYXdFdmVudCwgZXZQYXRoKSA9PiB7XG4gICAgICAgIGxpc3RlbmVyKHBhdGgpO1xuICAgICAgICBlbWl0UmF3KHJhd0V2ZW50LCBldlBhdGgsIHsgd2F0Y2hlZFBhdGg6IHBhdGggfSk7XG4gICAgICAgIC8vIGVtaXQgYmFzZWQgb24gZXZlbnRzIG9jY3VycmluZyBmb3IgZmlsZXMgZnJvbSBhIGRpcmVjdG9yeSdzIHdhdGNoZXIgaW5cbiAgICAgICAgLy8gY2FzZSB0aGUgZmlsZSdzIHdhdGNoZXIgbWlzc2VzIGl0IChhbmQgcmVseSBvbiB0aHJvdHRsaW5nIHRvIGRlLWR1cGUpXG4gICAgICAgIGlmIChldlBhdGggJiYgcGF0aCAhPT0gZXZQYXRoKSB7XG4gICAgICAgICAgICBmc1dhdGNoQnJvYWRjYXN0KHN5c1BhdGgucmVzb2x2ZShwYXRoLCBldlBhdGgpLCBLRVlfTElTVEVORVJTLCBzeXNQYXRoLmpvaW4ocGF0aCwgZXZQYXRoKSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBmc193YXRjaChwYXRoLCB7XG4gICAgICAgICAgICBwZXJzaXN0ZW50OiBvcHRpb25zLnBlcnNpc3RlbnQsXG4gICAgICAgIH0sIGhhbmRsZUV2ZW50KTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGVyckhhbmRsZXIoZXJyb3IpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbn1cbi8qKlxuICogSGVscGVyIGZvciBwYXNzaW5nIGZzX3dhdGNoIGV2ZW50IGRhdGEgdG8gYSBjb2xsZWN0aW9uIG9mIGxpc3RlbmVyc1xuICogQHBhcmFtIGZ1bGxQYXRoIGFic29sdXRlIHBhdGggYm91bmQgdG8gZnNfd2F0Y2ggaW5zdGFuY2VcbiAqL1xuY29uc3QgZnNXYXRjaEJyb2FkY2FzdCA9IChmdWxsUGF0aCwgbGlzdGVuZXJUeXBlLCB2YWwxLCB2YWwyLCB2YWwzKSA9PiB7XG4gICAgY29uc3QgY29udCA9IEZzV2F0Y2hJbnN0YW5jZXMuZ2V0KGZ1bGxQYXRoKTtcbiAgICBpZiAoIWNvbnQpXG4gICAgICAgIHJldHVybjtcbiAgICBmb3JlYWNoKGNvbnRbbGlzdGVuZXJUeXBlXSwgKGxpc3RlbmVyKSA9PiB7XG4gICAgICAgIGxpc3RlbmVyKHZhbDEsIHZhbDIsIHZhbDMpO1xuICAgIH0pO1xufTtcbi8qKlxuICogSW5zdGFudGlhdGVzIHRoZSBmc193YXRjaCBpbnRlcmZhY2Ugb3IgYmluZHMgbGlzdGVuZXJzXG4gKiB0byBhbiBleGlzdGluZyBvbmUgY292ZXJpbmcgdGhlIHNhbWUgZmlsZSBzeXN0ZW0gZW50cnlcbiAqIEBwYXJhbSBwYXRoXG4gKiBAcGFyYW0gZnVsbFBhdGggYWJzb2x1dGUgcGF0aFxuICogQHBhcmFtIG9wdGlvbnMgdG8gYmUgcGFzc2VkIHRvIGZzX3dhdGNoXG4gKiBAcGFyYW0gaGFuZGxlcnMgY29udGFpbmVyIGZvciBldmVudCBsaXN0ZW5lciBmdW5jdGlvbnNcbiAqL1xuY29uc3Qgc2V0RnNXYXRjaExpc3RlbmVyID0gKHBhdGgsIGZ1bGxQYXRoLCBvcHRpb25zLCBoYW5kbGVycykgPT4ge1xuICAgIGNvbnN0IHsgbGlzdGVuZXIsIGVyckhhbmRsZXIsIHJhd0VtaXR0ZXIgfSA9IGhhbmRsZXJzO1xuICAgIGxldCBjb250ID0gRnNXYXRjaEluc3RhbmNlcy5nZXQoZnVsbFBhdGgpO1xuICAgIGxldCB3YXRjaGVyO1xuICAgIGlmICghb3B0aW9ucy5wZXJzaXN0ZW50KSB7XG4gICAgICAgIHdhdGNoZXIgPSBjcmVhdGVGc1dhdGNoSW5zdGFuY2UocGF0aCwgb3B0aW9ucywgbGlzdGVuZXIsIGVyckhhbmRsZXIsIHJhd0VtaXR0ZXIpO1xuICAgICAgICBpZiAoIXdhdGNoZXIpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHJldHVybiB3YXRjaGVyLmNsb3NlLmJpbmQod2F0Y2hlcik7XG4gICAgfVxuICAgIGlmIChjb250KSB7XG4gICAgICAgIGFkZEFuZENvbnZlcnQoY29udCwgS0VZX0xJU1RFTkVSUywgbGlzdGVuZXIpO1xuICAgICAgICBhZGRBbmRDb252ZXJ0KGNvbnQsIEtFWV9FUlIsIGVyckhhbmRsZXIpO1xuICAgICAgICBhZGRBbmRDb252ZXJ0KGNvbnQsIEtFWV9SQVcsIHJhd0VtaXR0ZXIpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgd2F0Y2hlciA9IGNyZWF0ZUZzV2F0Y2hJbnN0YW5jZShwYXRoLCBvcHRpb25zLCBmc1dhdGNoQnJvYWRjYXN0LmJpbmQobnVsbCwgZnVsbFBhdGgsIEtFWV9MSVNURU5FUlMpLCBlcnJIYW5kbGVyLCAvLyBubyBuZWVkIHRvIHVzZSBicm9hZGNhc3QgaGVyZVxuICAgICAgICBmc1dhdGNoQnJvYWRjYXN0LmJpbmQobnVsbCwgZnVsbFBhdGgsIEtFWV9SQVcpKTtcbiAgICAgICAgaWYgKCF3YXRjaGVyKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB3YXRjaGVyLm9uKEVWLkVSUk9SLCBhc3luYyAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGJyb2FkY2FzdEVyciA9IGZzV2F0Y2hCcm9hZGNhc3QuYmluZChudWxsLCBmdWxsUGF0aCwgS0VZX0VSUik7XG4gICAgICAgICAgICBpZiAoY29udClcbiAgICAgICAgICAgICAgICBjb250LndhdGNoZXJVbnVzYWJsZSA9IHRydWU7IC8vIGRvY3VtZW50ZWQgc2luY2UgTm9kZSAxMC40LjFcbiAgICAgICAgICAgIC8vIFdvcmthcm91bmQgZm9yIGh0dHBzOi8vZ2l0aHViLmNvbS9qb3llbnQvbm9kZS9pc3N1ZXMvNDMzN1xuICAgICAgICAgICAgaWYgKGlzV2luZG93cyAmJiBlcnJvci5jb2RlID09PSAnRVBFUk0nKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmQgPSBhd2FpdCBvcGVuKHBhdGgsICdyJyk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGZkLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyb2FkY2FzdEVycihlcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZG8gbm90aGluZ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGJyb2FkY2FzdEVycihlcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBjb250ID0ge1xuICAgICAgICAgICAgbGlzdGVuZXJzOiBsaXN0ZW5lcixcbiAgICAgICAgICAgIGVyckhhbmRsZXJzOiBlcnJIYW5kbGVyLFxuICAgICAgICAgICAgcmF3RW1pdHRlcnM6IHJhd0VtaXR0ZXIsXG4gICAgICAgICAgICB3YXRjaGVyLFxuICAgICAgICB9O1xuICAgICAgICBGc1dhdGNoSW5zdGFuY2VzLnNldChmdWxsUGF0aCwgY29udCk7XG4gICAgfVxuICAgIC8vIGNvbnN0IGluZGV4ID0gY29udC5saXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lcik7XG4gICAgLy8gcmVtb3ZlcyB0aGlzIGluc3RhbmNlJ3MgbGlzdGVuZXJzIGFuZCBjbG9zZXMgdGhlIHVuZGVybHlpbmcgZnNfd2F0Y2hcbiAgICAvLyBpbnN0YW5jZSBpZiB0aGVyZSBhcmUgbm8gbW9yZSBsaXN0ZW5lcnMgbGVmdFxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIGRlbEZyb21TZXQoY29udCwgS0VZX0xJU1RFTkVSUywgbGlzdGVuZXIpO1xuICAgICAgICBkZWxGcm9tU2V0KGNvbnQsIEtFWV9FUlIsIGVyckhhbmRsZXIpO1xuICAgICAgICBkZWxGcm9tU2V0KGNvbnQsIEtFWV9SQVcsIHJhd0VtaXR0ZXIpO1xuICAgICAgICBpZiAoaXNFbXB0eVNldChjb250Lmxpc3RlbmVycykpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIHRvIHByb3RlY3QgYWdhaW5zdCBpc3N1ZSBnaC03MzAuXG4gICAgICAgICAgICAvLyBpZiAoY29udC53YXRjaGVyVW51c2FibGUpIHtcbiAgICAgICAgICAgIGNvbnQud2F0Y2hlci5jbG9zZSgpO1xuICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgRnNXYXRjaEluc3RhbmNlcy5kZWxldGUoZnVsbFBhdGgpO1xuICAgICAgICAgICAgSEFORExFUl9LRVlTLmZvckVhY2goY2xlYXJJdGVtKGNvbnQpKTtcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgIGNvbnQud2F0Y2hlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIE9iamVjdC5mcmVlemUoY29udCk7XG4gICAgICAgIH1cbiAgICB9O1xufTtcbi8vIGZzX3dhdGNoRmlsZSBoZWxwZXJzXG4vLyBvYmplY3QgdG8gaG9sZCBwZXItcHJvY2VzcyBmc193YXRjaEZpbGUgaW5zdGFuY2VzXG4vLyAobWF5IGJlIHNoYXJlZCBhY3Jvc3MgY2hva2lkYXIgRlNXYXRjaGVyIGluc3RhbmNlcylcbmNvbnN0IEZzV2F0Y2hGaWxlSW5zdGFuY2VzID0gbmV3IE1hcCgpO1xuLyoqXG4gKiBJbnN0YW50aWF0ZXMgdGhlIGZzX3dhdGNoRmlsZSBpbnRlcmZhY2Ugb3IgYmluZHMgbGlzdGVuZXJzXG4gKiB0byBhbiBleGlzdGluZyBvbmUgY292ZXJpbmcgdGhlIHNhbWUgZmlsZSBzeXN0ZW0gZW50cnlcbiAqIEBwYXJhbSBwYXRoIHRvIGJlIHdhdGNoZWRcbiAqIEBwYXJhbSBmdWxsUGF0aCBhYnNvbHV0ZSBwYXRoXG4gKiBAcGFyYW0gb3B0aW9ucyBvcHRpb25zIHRvIGJlIHBhc3NlZCB0byBmc193YXRjaEZpbGVcbiAqIEBwYXJhbSBoYW5kbGVycyBjb250YWluZXIgZm9yIGV2ZW50IGxpc3RlbmVyIGZ1bmN0aW9uc1xuICogQHJldHVybnMgY2xvc2VyXG4gKi9cbmNvbnN0IHNldEZzV2F0Y2hGaWxlTGlzdGVuZXIgPSAocGF0aCwgZnVsbFBhdGgsIG9wdGlvbnMsIGhhbmRsZXJzKSA9PiB7XG4gICAgY29uc3QgeyBsaXN0ZW5lciwgcmF3RW1pdHRlciB9ID0gaGFuZGxlcnM7XG4gICAgbGV0IGNvbnQgPSBGc1dhdGNoRmlsZUluc3RhbmNlcy5nZXQoZnVsbFBhdGgpO1xuICAgIC8vIGxldCBsaXN0ZW5lcnMgPSBuZXcgU2V0KCk7XG4gICAgLy8gbGV0IHJhd0VtaXR0ZXJzID0gbmV3IFNldCgpO1xuICAgIGNvbnN0IGNvcHRzID0gY29udCAmJiBjb250Lm9wdGlvbnM7XG4gICAgaWYgKGNvcHRzICYmIChjb3B0cy5wZXJzaXN0ZW50IDwgb3B0aW9ucy5wZXJzaXN0ZW50IHx8IGNvcHRzLmludGVydmFsID4gb3B0aW9ucy5pbnRlcnZhbCkpIHtcbiAgICAgICAgLy8gXCJVcGdyYWRlXCIgdGhlIHdhdGNoZXIgdG8gcGVyc2lzdGVuY2Ugb3IgYSBxdWlja2VyIGludGVydmFsLlxuICAgICAgICAvLyBUaGlzIGNyZWF0ZXMgc29tZSB1bmxpa2VseSBlZGdlIGNhc2UgaXNzdWVzIGlmIHRoZSB1c2VyIG1peGVzXG4gICAgICAgIC8vIHNldHRpbmdzIGluIGEgdmVyeSB3ZWlyZCB3YXksIGJ1dCBzb2x2aW5nIGZvciB0aG9zZSBjYXNlc1xuICAgICAgICAvLyBkb2Vzbid0IHNlZW0gd29ydGh3aGlsZSBmb3IgdGhlIGFkZGVkIGNvbXBsZXhpdHkuXG4gICAgICAgIC8vIGxpc3RlbmVycyA9IGNvbnQubGlzdGVuZXJzO1xuICAgICAgICAvLyByYXdFbWl0dGVycyA9IGNvbnQucmF3RW1pdHRlcnM7XG4gICAgICAgIHVud2F0Y2hGaWxlKGZ1bGxQYXRoKTtcbiAgICAgICAgY29udCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgaWYgKGNvbnQpIHtcbiAgICAgICAgYWRkQW5kQ29udmVydChjb250LCBLRVlfTElTVEVORVJTLCBsaXN0ZW5lcik7XG4gICAgICAgIGFkZEFuZENvbnZlcnQoY29udCwgS0VZX1JBVywgcmF3RW1pdHRlcik7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICAvLyBUT0RPXG4gICAgICAgIC8vIGxpc3RlbmVycy5hZGQobGlzdGVuZXIpO1xuICAgICAgICAvLyByYXdFbWl0dGVycy5hZGQocmF3RW1pdHRlcik7XG4gICAgICAgIGNvbnQgPSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnM6IGxpc3RlbmVyLFxuICAgICAgICAgICAgcmF3RW1pdHRlcnM6IHJhd0VtaXR0ZXIsXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgd2F0Y2hlcjogd2F0Y2hGaWxlKGZ1bGxQYXRoLCBvcHRpb25zLCAoY3VyciwgcHJldikgPT4ge1xuICAgICAgICAgICAgICAgIGZvcmVhY2goY29udC5yYXdFbWl0dGVycywgKHJhd0VtaXR0ZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmF3RW1pdHRlcihFVi5DSEFOR0UsIGZ1bGxQYXRoLCB7IGN1cnIsIHByZXYgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgY29uc3QgY3Vycm10aW1lID0gY3Vyci5tdGltZU1zO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyLnNpemUgIT09IHByZXYuc2l6ZSB8fCBjdXJybXRpbWUgPiBwcmV2Lm10aW1lTXMgfHwgY3Vycm10aW1lID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcmVhY2goY29udC5saXN0ZW5lcnMsIChsaXN0ZW5lcikgPT4gbGlzdGVuZXIocGF0aCwgY3VycikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLFxuICAgICAgICB9O1xuICAgICAgICBGc1dhdGNoRmlsZUluc3RhbmNlcy5zZXQoZnVsbFBhdGgsIGNvbnQpO1xuICAgIH1cbiAgICAvLyBjb25zdCBpbmRleCA9IGNvbnQubGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpO1xuICAgIC8vIFJlbW92ZXMgdGhpcyBpbnN0YW5jZSdzIGxpc3RlbmVycyBhbmQgY2xvc2VzIHRoZSB1bmRlcmx5aW5nIGZzX3dhdGNoRmlsZVxuICAgIC8vIGluc3RhbmNlIGlmIHRoZXJlIGFyZSBubyBtb3JlIGxpc3RlbmVycyBsZWZ0LlxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIGRlbEZyb21TZXQoY29udCwgS0VZX0xJU1RFTkVSUywgbGlzdGVuZXIpO1xuICAgICAgICBkZWxGcm9tU2V0KGNvbnQsIEtFWV9SQVcsIHJhd0VtaXR0ZXIpO1xuICAgICAgICBpZiAoaXNFbXB0eVNldChjb250Lmxpc3RlbmVycykpIHtcbiAgICAgICAgICAgIEZzV2F0Y2hGaWxlSW5zdGFuY2VzLmRlbGV0ZShmdWxsUGF0aCk7XG4gICAgICAgICAgICB1bndhdGNoRmlsZShmdWxsUGF0aCk7XG4gICAgICAgICAgICBjb250Lm9wdGlvbnMgPSBjb250LndhdGNoZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBPYmplY3QuZnJlZXplKGNvbnQpO1xuICAgICAgICB9XG4gICAgfTtcbn07XG4vKipcbiAqIEBtaXhpblxuICovXG5leHBvcnQgY2xhc3MgTm9kZUZzSGFuZGxlciB7XG4gICAgY29uc3RydWN0b3IoZnNXKSB7XG4gICAgICAgIHRoaXMuZnN3ID0gZnNXO1xuICAgICAgICB0aGlzLl9ib3VuZEhhbmRsZUVycm9yID0gKGVycm9yKSA9PiBmc1cuX2hhbmRsZUVycm9yKGVycm9yKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogV2F0Y2ggZmlsZSBmb3IgY2hhbmdlcyB3aXRoIGZzX3dhdGNoRmlsZSBvciBmc193YXRjaC5cbiAgICAgKiBAcGFyYW0gcGF0aCB0byBmaWxlIG9yIGRpclxuICAgICAqIEBwYXJhbSBsaXN0ZW5lciBvbiBmcyBjaGFuZ2VcbiAgICAgKiBAcmV0dXJucyBjbG9zZXIgZm9yIHRoZSB3YXRjaGVyIGluc3RhbmNlXG4gICAgICovXG4gICAgX3dhdGNoV2l0aE5vZGVGcyhwYXRoLCBsaXN0ZW5lcikge1xuICAgICAgICBjb25zdCBvcHRzID0gdGhpcy5mc3cub3B0aW9ucztcbiAgICAgICAgY29uc3QgZGlyZWN0b3J5ID0gc3lzUGF0aC5kaXJuYW1lKHBhdGgpO1xuICAgICAgICBjb25zdCBiYXNlbmFtZSA9IHN5c1BhdGguYmFzZW5hbWUocGF0aCk7XG4gICAgICAgIGNvbnN0IHBhcmVudCA9IHRoaXMuZnN3Ll9nZXRXYXRjaGVkRGlyKGRpcmVjdG9yeSk7XG4gICAgICAgIHBhcmVudC5hZGQoYmFzZW5hbWUpO1xuICAgICAgICBjb25zdCBhYnNvbHV0ZVBhdGggPSBzeXNQYXRoLnJlc29sdmUocGF0aCk7XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgICAgICBwZXJzaXN0ZW50OiBvcHRzLnBlcnNpc3RlbnQsXG4gICAgICAgIH07XG4gICAgICAgIGlmICghbGlzdGVuZXIpXG4gICAgICAgICAgICBsaXN0ZW5lciA9IEVNUFRZX0ZOO1xuICAgICAgICBsZXQgY2xvc2VyO1xuICAgICAgICBpZiAob3B0cy51c2VQb2xsaW5nKSB7XG4gICAgICAgICAgICBjb25zdCBlbmFibGVCaW4gPSBvcHRzLmludGVydmFsICE9PSBvcHRzLmJpbmFyeUludGVydmFsO1xuICAgICAgICAgICAgb3B0aW9ucy5pbnRlcnZhbCA9IGVuYWJsZUJpbiAmJiBpc0JpbmFyeVBhdGgoYmFzZW5hbWUpID8gb3B0cy5iaW5hcnlJbnRlcnZhbCA6IG9wdHMuaW50ZXJ2YWw7XG4gICAgICAgICAgICBjbG9zZXIgPSBzZXRGc1dhdGNoRmlsZUxpc3RlbmVyKHBhdGgsIGFic29sdXRlUGF0aCwgb3B0aW9ucywge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLFxuICAgICAgICAgICAgICAgIHJhd0VtaXR0ZXI6IHRoaXMuZnN3Ll9lbWl0UmF3LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjbG9zZXIgPSBzZXRGc1dhdGNoTGlzdGVuZXIocGF0aCwgYWJzb2x1dGVQYXRoLCBvcHRpb25zLCB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXIsXG4gICAgICAgICAgICAgICAgZXJySGFuZGxlcjogdGhpcy5fYm91bmRIYW5kbGVFcnJvcixcbiAgICAgICAgICAgICAgICByYXdFbWl0dGVyOiB0aGlzLmZzdy5fZW1pdFJhdyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjbG9zZXI7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFdhdGNoIGEgZmlsZSBhbmQgZW1pdCBhZGQgZXZlbnQgaWYgd2FycmFudGVkLlxuICAgICAqIEByZXR1cm5zIGNsb3NlciBmb3IgdGhlIHdhdGNoZXIgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBfaGFuZGxlRmlsZShmaWxlLCBzdGF0cywgaW5pdGlhbEFkZCkge1xuICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGlybmFtZSA9IHN5c1BhdGguZGlybmFtZShmaWxlKTtcbiAgICAgICAgY29uc3QgYmFzZW5hbWUgPSBzeXNQYXRoLmJhc2VuYW1lKGZpbGUpO1xuICAgICAgICBjb25zdCBwYXJlbnQgPSB0aGlzLmZzdy5fZ2V0V2F0Y2hlZERpcihkaXJuYW1lKTtcbiAgICAgICAgLy8gc3RhdHMgaXMgYWx3YXlzIHByZXNlbnRcbiAgICAgICAgbGV0IHByZXZTdGF0cyA9IHN0YXRzO1xuICAgICAgICAvLyBpZiB0aGUgZmlsZSBpcyBhbHJlYWR5IGJlaW5nIHdhdGNoZWQsIGRvIG5vdGhpbmdcbiAgICAgICAgaWYgKHBhcmVudC5oYXMoYmFzZW5hbWUpKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCBsaXN0ZW5lciA9IGFzeW5jIChwYXRoLCBuZXdTdGF0cykgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmZzdy5fdGhyb3R0bGUoVEhST1RUTEVfTU9ERV9XQVRDSCwgZmlsZSwgNSkpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKCFuZXdTdGF0cyB8fCBuZXdTdGF0cy5tdGltZU1zID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3U3RhdHMgPSBhd2FpdCBzdGF0KGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayB0aGF0IGNoYW5nZSBldmVudCB3YXMgbm90IGZpcmVkIGJlY2F1c2Ugb2YgY2hhbmdlZCBvbmx5IGFjY2Vzc1RpbWUuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGF0ID0gbmV3U3RhdHMuYXRpbWVNcztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbXQgPSBuZXdTdGF0cy5tdGltZU1zO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWF0IHx8IGF0IDw9IG10IHx8IG10ICE9PSBwcmV2U3RhdHMubXRpbWVNcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX2VtaXQoRVYuQ0hBTkdFLCBmaWxlLCBuZXdTdGF0cyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKChpc01hY29zIHx8IGlzTGludXggfHwgaXNGcmVlQlNEKSAmJiBwcmV2U3RhdHMuaW5vICE9PSBuZXdTdGF0cy5pbm8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9jbG9zZUZpbGUocGF0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmV2U3RhdHMgPSBuZXdTdGF0cztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNsb3NlciA9IHRoaXMuX3dhdGNoV2l0aE5vZGVGcyhmaWxlLCBsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xvc2VyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9hZGRQYXRoQ2xvc2VyKHBhdGgsIGNsb3Nlcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmV2U3RhdHMgPSBuZXdTdGF0cztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRml4IGlzc3VlcyB3aGVyZSBtdGltZSBpcyBudWxsIGJ1dCBmaWxlIGlzIHN0aWxsIHByZXNlbnRcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX3JlbW92ZShkaXJuYW1lLCBiYXNlbmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGFkZCBpcyBhYm91dCB0byBiZSBlbWl0dGVkIGlmIGZpbGUgbm90IGFscmVhZHkgdHJhY2tlZCBpbiBwYXJlbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHBhcmVudC5oYXMoYmFzZW5hbWUpKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgdGhhdCBjaGFuZ2UgZXZlbnQgd2FzIG5vdCBmaXJlZCBiZWNhdXNlIG9mIGNoYW5nZWQgb25seSBhY2Nlc3NUaW1lLlxuICAgICAgICAgICAgICAgIGNvbnN0IGF0ID0gbmV3U3RhdHMuYXRpbWVNcztcbiAgICAgICAgICAgICAgICBjb25zdCBtdCA9IG5ld1N0YXRzLm10aW1lTXM7XG4gICAgICAgICAgICAgICAgaWYgKCFhdCB8fCBhdCA8PSBtdCB8fCBtdCAhPT0gcHJldlN0YXRzLm10aW1lTXMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX2VtaXQoRVYuQ0hBTkdFLCBmaWxlLCBuZXdTdGF0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHByZXZTdGF0cyA9IG5ld1N0YXRzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICAvLyBraWNrIG9mZiB0aGUgd2F0Y2hlclxuICAgICAgICBjb25zdCBjbG9zZXIgPSB0aGlzLl93YXRjaFdpdGhOb2RlRnMoZmlsZSwgbGlzdGVuZXIpO1xuICAgICAgICAvLyBlbWl0IGFuIGFkZCBldmVudCBpZiB3ZSdyZSBzdXBwb3NlZCB0b1xuICAgICAgICBpZiAoIShpbml0aWFsQWRkICYmIHRoaXMuZnN3Lm9wdGlvbnMuaWdub3JlSW5pdGlhbCkgJiYgdGhpcy5mc3cuX2lzbnRJZ25vcmVkKGZpbGUpKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuZnN3Ll90aHJvdHRsZShFVi5BREQsIGZpbGUsIDApKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIHRoaXMuZnN3Ll9lbWl0KEVWLkFERCwgZmlsZSwgc3RhdHMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjbG9zZXI7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBzeW1saW5rcyBlbmNvdW50ZXJlZCB3aGlsZSByZWFkaW5nIGEgZGlyLlxuICAgICAqIEBwYXJhbSBlbnRyeSByZXR1cm5lZCBieSByZWFkZGlycFxuICAgICAqIEBwYXJhbSBkaXJlY3RvcnkgcGF0aCBvZiBkaXIgYmVpbmcgcmVhZFxuICAgICAqIEBwYXJhbSBwYXRoIG9mIHRoaXMgaXRlbVxuICAgICAqIEBwYXJhbSBpdGVtIGJhc2VuYW1lIG9mIHRoaXMgaXRlbVxuICAgICAqIEByZXR1cm5zIHRydWUgaWYgbm8gbW9yZSBwcm9jZXNzaW5nIGlzIG5lZWRlZCBmb3IgdGhpcyBlbnRyeS5cbiAgICAgKi9cbiAgICBhc3luYyBfaGFuZGxlU3ltbGluayhlbnRyeSwgZGlyZWN0b3J5LCBwYXRoLCBpdGVtKSB7XG4gICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBmdWxsID0gZW50cnkuZnVsbFBhdGg7XG4gICAgICAgIGNvbnN0IGRpciA9IHRoaXMuZnN3Ll9nZXRXYXRjaGVkRGlyKGRpcmVjdG9yeSk7XG4gICAgICAgIGlmICghdGhpcy5mc3cub3B0aW9ucy5mb2xsb3dTeW1saW5rcykge1xuICAgICAgICAgICAgLy8gd2F0Y2ggc3ltbGluayBkaXJlY3RseSAoZG9uJ3QgZm9sbG93KSBhbmQgZGV0ZWN0IGNoYW5nZXNcbiAgICAgICAgICAgIHRoaXMuZnN3Ll9pbmNyUmVhZHlDb3VudCgpO1xuICAgICAgICAgICAgbGV0IGxpbmtQYXRoO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBsaW5rUGF0aCA9IGF3YWl0IGZzcmVhbHBhdGgocGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9lbWl0UmVhZHkoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKGRpci5oYXMoaXRlbSkpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mc3cuX3N5bWxpbmtQYXRocy5nZXQoZnVsbCkgIT09IGxpbmtQYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9zeW1saW5rUGF0aHMuc2V0KGZ1bGwsIGxpbmtQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX2VtaXQoRVYuQ0hBTkdFLCBwYXRoLCBlbnRyeS5zdGF0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZGlyLmFkZChpdGVtKTtcbiAgICAgICAgICAgICAgICB0aGlzLmZzdy5fc3ltbGlua1BhdGhzLnNldChmdWxsLCBsaW5rUGF0aCk7XG4gICAgICAgICAgICAgICAgdGhpcy5mc3cuX2VtaXQoRVYuQURELCBwYXRoLCBlbnRyeS5zdGF0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmZzdy5fZW1pdFJlYWR5KCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBkb24ndCBmb2xsb3cgdGhlIHNhbWUgc3ltbGluayBtb3JlIHRoYW4gb25jZVxuICAgICAgICBpZiAodGhpcy5mc3cuX3N5bWxpbmtQYXRocy5oYXMoZnVsbCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZnN3Ll9zeW1saW5rUGF0aHMuc2V0KGZ1bGwsIHRydWUpO1xuICAgIH1cbiAgICBfaGFuZGxlUmVhZChkaXJlY3RvcnksIGluaXRpYWxBZGQsIHdoLCB0YXJnZXQsIGRpciwgZGVwdGgsIHRocm90dGxlcikge1xuICAgICAgICAvLyBOb3JtYWxpemUgdGhlIGRpcmVjdG9yeSBuYW1lIG9uIFdpbmRvd3NcbiAgICAgICAgZGlyZWN0b3J5ID0gc3lzUGF0aC5qb2luKGRpcmVjdG9yeSwgJycpO1xuICAgICAgICB0aHJvdHRsZXIgPSB0aGlzLmZzdy5fdGhyb3R0bGUoJ3JlYWRkaXInLCBkaXJlY3RvcnksIDEwMDApO1xuICAgICAgICBpZiAoIXRocm90dGxlcilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY29uc3QgcHJldmlvdXMgPSB0aGlzLmZzdy5fZ2V0V2F0Y2hlZERpcih3aC5wYXRoKTtcbiAgICAgICAgY29uc3QgY3VycmVudCA9IG5ldyBTZXQoKTtcbiAgICAgICAgbGV0IHN0cmVhbSA9IHRoaXMuZnN3Ll9yZWFkZGlycChkaXJlY3RvcnksIHtcbiAgICAgICAgICAgIGZpbGVGaWx0ZXI6IChlbnRyeSkgPT4gd2guZmlsdGVyUGF0aChlbnRyeSksXG4gICAgICAgICAgICBkaXJlY3RvcnlGaWx0ZXI6IChlbnRyeSkgPT4gd2guZmlsdGVyRGlyKGVudHJ5KSxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghc3RyZWFtKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBzdHJlYW1cbiAgICAgICAgICAgIC5vbihTVFJfREFUQSwgYXN5bmMgKGVudHJ5KSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKSB7XG4gICAgICAgICAgICAgICAgc3RyZWFtID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBlbnRyeS5wYXRoO1xuICAgICAgICAgICAgbGV0IHBhdGggPSBzeXNQYXRoLmpvaW4oZGlyZWN0b3J5LCBpdGVtKTtcbiAgICAgICAgICAgIGN1cnJlbnQuYWRkKGl0ZW0pO1xuICAgICAgICAgICAgaWYgKGVudHJ5LnN0YXRzLmlzU3ltYm9saWNMaW5rKCkgJiZcbiAgICAgICAgICAgICAgICAoYXdhaXQgdGhpcy5faGFuZGxlU3ltbGluayhlbnRyeSwgZGlyZWN0b3J5LCBwYXRoLCBpdGVtKSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKSB7XG4gICAgICAgICAgICAgICAgc3RyZWFtID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZpbGVzIHRoYXQgcHJlc2VudCBpbiBjdXJyZW50IGRpcmVjdG9yeSBzbmFwc2hvdFxuICAgICAgICAgICAgLy8gYnV0IGFic2VudCBpbiBwcmV2aW91cyBhcmUgYWRkZWQgdG8gd2F0Y2ggbGlzdCBhbmRcbiAgICAgICAgICAgIC8vIGVtaXQgYGFkZGAgZXZlbnQuXG4gICAgICAgICAgICBpZiAoaXRlbSA9PT0gdGFyZ2V0IHx8ICghdGFyZ2V0ICYmICFwcmV2aW91cy5oYXMoaXRlbSkpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5mc3cuX2luY3JSZWFkeUNvdW50KCk7XG4gICAgICAgICAgICAgICAgLy8gZW5zdXJlIHJlbGF0aXZlbmVzcyBvZiBwYXRoIGlzIHByZXNlcnZlZCBpbiBjYXNlIG9mIHdhdGNoZXIgcmV1c2VcbiAgICAgICAgICAgICAgICBwYXRoID0gc3lzUGF0aC5qb2luKGRpciwgc3lzUGF0aC5yZWxhdGl2ZShkaXIsIHBhdGgpKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9hZGRUb05vZGVGcyhwYXRoLCBpbml0aWFsQWRkLCB3aCwgZGVwdGggKyAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgICAgIC5vbihFVi5FUlJPUiwgdGhpcy5fYm91bmRIYW5kbGVFcnJvcik7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAoIXN0cmVhbSlcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KCk7XG4gICAgICAgICAgICBzdHJlYW0ub25jZShTVFJfRU5ELCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZCkge1xuICAgICAgICAgICAgICAgICAgICBzdHJlYW0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3Qgd2FzVGhyb3R0bGVkID0gdGhyb3R0bGVyID8gdGhyb3R0bGVyLmNsZWFyKCkgOiBmYWxzZTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHVuZGVmaW5lZCk7XG4gICAgICAgICAgICAgICAgLy8gRmlsZXMgdGhhdCBhYnNlbnQgaW4gY3VycmVudCBkaXJlY3Rvcnkgc25hcHNob3RcbiAgICAgICAgICAgICAgICAvLyBidXQgcHJlc2VudCBpbiBwcmV2aW91cyBlbWl0IGByZW1vdmVgIGV2ZW50XG4gICAgICAgICAgICAgICAgLy8gYW5kIGFyZSByZW1vdmVkIGZyb20gQHdhdGNoZWRbZGlyZWN0b3J5XS5cbiAgICAgICAgICAgICAgICBwcmV2aW91c1xuICAgICAgICAgICAgICAgICAgICAuZ2V0Q2hpbGRyZW4oKVxuICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKChpdGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtICE9PSBkaXJlY3RvcnkgJiYgIWN1cnJlbnQuaGFzKGl0ZW0pO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9yZW1vdmUoZGlyZWN0b3J5LCBpdGVtKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBzdHJlYW0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgLy8gb25lIG1vcmUgdGltZSBmb3IgYW55IG1pc3NlZCBpbiBjYXNlIGNoYW5nZXMgY2FtZSBpbiBleHRyZW1lbHkgcXVpY2tseVxuICAgICAgICAgICAgICAgIGlmICh3YXNUaHJvdHRsZWQpXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZVJlYWQoZGlyZWN0b3J5LCBmYWxzZSwgd2gsIHRhcmdldCwgZGlyLCBkZXB0aCwgdGhyb3R0bGVyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmVhZCBkaXJlY3RvcnkgdG8gYWRkIC8gcmVtb3ZlIGZpbGVzIGZyb20gYEB3YXRjaGVkYCBsaXN0IGFuZCByZS1yZWFkIGl0IG9uIGNoYW5nZS5cbiAgICAgKiBAcGFyYW0gZGlyIGZzIHBhdGhcbiAgICAgKiBAcGFyYW0gc3RhdHNcbiAgICAgKiBAcGFyYW0gaW5pdGlhbEFkZFxuICAgICAqIEBwYXJhbSBkZXB0aCByZWxhdGl2ZSB0byB1c2VyLXN1cHBsaWVkIHBhdGhcbiAgICAgKiBAcGFyYW0gdGFyZ2V0IGNoaWxkIHBhdGggdGFyZ2V0ZWQgZm9yIHdhdGNoXG4gICAgICogQHBhcmFtIHdoIENvbW1vbiB3YXRjaCBoZWxwZXJzIGZvciB0aGlzIHBhdGhcbiAgICAgKiBAcGFyYW0gcmVhbHBhdGhcbiAgICAgKiBAcmV0dXJucyBjbG9zZXIgZm9yIHRoZSB3YXRjaGVyIGluc3RhbmNlLlxuICAgICAqL1xuICAgIGFzeW5jIF9oYW5kbGVEaXIoZGlyLCBzdGF0cywgaW5pdGlhbEFkZCwgZGVwdGgsIHRhcmdldCwgd2gsIHJlYWxwYXRoKSB7XG4gICAgICAgIGNvbnN0IHBhcmVudERpciA9IHRoaXMuZnN3Ll9nZXRXYXRjaGVkRGlyKHN5c1BhdGguZGlybmFtZShkaXIpKTtcbiAgICAgICAgY29uc3QgdHJhY2tlZCA9IHBhcmVudERpci5oYXMoc3lzUGF0aC5iYXNlbmFtZShkaXIpKTtcbiAgICAgICAgaWYgKCEoaW5pdGlhbEFkZCAmJiB0aGlzLmZzdy5vcHRpb25zLmlnbm9yZUluaXRpYWwpICYmICF0YXJnZXQgJiYgIXRyYWNrZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZnN3Ll9lbWl0KEVWLkFERF9ESVIsIGRpciwgc3RhdHMpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGVuc3VyZSBkaXIgaXMgdHJhY2tlZCAoaGFybWxlc3MgaWYgcmVkdW5kYW50KVxuICAgICAgICBwYXJlbnREaXIuYWRkKHN5c1BhdGguYmFzZW5hbWUoZGlyKSk7XG4gICAgICAgIHRoaXMuZnN3Ll9nZXRXYXRjaGVkRGlyKGRpcik7XG4gICAgICAgIGxldCB0aHJvdHRsZXI7XG4gICAgICAgIGxldCBjbG9zZXI7XG4gICAgICAgIGNvbnN0IG9EZXB0aCA9IHRoaXMuZnN3Lm9wdGlvbnMuZGVwdGg7XG4gICAgICAgIGlmICgob0RlcHRoID09IG51bGwgfHwgZGVwdGggPD0gb0RlcHRoKSAmJiAhdGhpcy5mc3cuX3N5bWxpbmtQYXRocy5oYXMocmVhbHBhdGgpKSB7XG4gICAgICAgICAgICBpZiAoIXRhcmdldCkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX2hhbmRsZVJlYWQoZGlyLCBpbml0aWFsQWRkLCB3aCwgdGFyZ2V0LCBkaXIsIGRlcHRoLCB0aHJvdHRsZXIpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNsb3NlciA9IHRoaXMuX3dhdGNoV2l0aE5vZGVGcyhkaXIsIChkaXJQYXRoLCBzdGF0cykgPT4ge1xuICAgICAgICAgICAgICAgIC8vIGlmIGN1cnJlbnQgZGlyZWN0b3J5IGlzIHJlbW92ZWQsIGRvIG5vdGhpbmdcbiAgICAgICAgICAgICAgICBpZiAoc3RhdHMgJiYgc3RhdHMubXRpbWVNcyA9PT0gMClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZVJlYWQoZGlyUGF0aCwgZmFsc2UsIHdoLCB0YXJnZXQsIGRpciwgZGVwdGgsIHRocm90dGxlcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2xvc2VyO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgYWRkZWQgZmlsZSwgZGlyZWN0b3J5LCBvciBnbG9iIHBhdHRlcm4uXG4gICAgICogRGVsZWdhdGVzIGNhbGwgdG8gX2hhbmRsZUZpbGUgLyBfaGFuZGxlRGlyIGFmdGVyIGNoZWNrcy5cbiAgICAgKiBAcGFyYW0gcGF0aCB0byBmaWxlIG9yIGlyXG4gICAgICogQHBhcmFtIGluaXRpYWxBZGQgd2FzIHRoZSBmaWxlIGFkZGVkIGF0IHdhdGNoIGluc3RhbnRpYXRpb24/XG4gICAgICogQHBhcmFtIHByaW9yV2ggZGVwdGggcmVsYXRpdmUgdG8gdXNlci1zdXBwbGllZCBwYXRoXG4gICAgICogQHBhcmFtIGRlcHRoIENoaWxkIHBhdGggYWN0dWFsbHkgdGFyZ2V0ZWQgZm9yIHdhdGNoXG4gICAgICogQHBhcmFtIHRhcmdldCBDaGlsZCBwYXRoIGFjdHVhbGx5IHRhcmdldGVkIGZvciB3YXRjaFxuICAgICAqL1xuICAgIGFzeW5jIF9hZGRUb05vZGVGcyhwYXRoLCBpbml0aWFsQWRkLCBwcmlvcldoLCBkZXB0aCwgdGFyZ2V0KSB7XG4gICAgICAgIGNvbnN0IHJlYWR5ID0gdGhpcy5mc3cuX2VtaXRSZWFkeTtcbiAgICAgICAgaWYgKHRoaXMuZnN3Ll9pc0lnbm9yZWQocGF0aCkgfHwgdGhpcy5mc3cuY2xvc2VkKSB7XG4gICAgICAgICAgICByZWFkeSgpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHdoID0gdGhpcy5mc3cuX2dldFdhdGNoSGVscGVycyhwYXRoKTtcbiAgICAgICAgaWYgKHByaW9yV2gpIHtcbiAgICAgICAgICAgIHdoLmZpbHRlclBhdGggPSAoZW50cnkpID0+IHByaW9yV2guZmlsdGVyUGF0aChlbnRyeSk7XG4gICAgICAgICAgICB3aC5maWx0ZXJEaXIgPSAoZW50cnkpID0+IHByaW9yV2guZmlsdGVyRGlyKGVudHJ5KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBldmFsdWF0ZSB3aGF0IGlzIGF0IHRoZSBwYXRoIHdlJ3JlIGJlaW5nIGFza2VkIHRvIHdhdGNoXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IHN0YXRNZXRob2RzW3doLnN0YXRNZXRob2RdKHdoLndhdGNoUGF0aCk7XG4gICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGlmICh0aGlzLmZzdy5faXNJZ25vcmVkKHdoLndhdGNoUGF0aCwgc3RhdHMpKSB7XG4gICAgICAgICAgICAgICAgcmVhZHkoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBmb2xsb3cgPSB0aGlzLmZzdy5vcHRpb25zLmZvbGxvd1N5bWxpbmtzO1xuICAgICAgICAgICAgbGV0IGNsb3NlcjtcbiAgICAgICAgICAgIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYWJzUGF0aCA9IHN5c1BhdGgucmVzb2x2ZShwYXRoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRQYXRoID0gZm9sbG93ID8gYXdhaXQgZnNyZWFscGF0aChwYXRoKSA6IHBhdGg7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGNsb3NlciA9IGF3YWl0IHRoaXMuX2hhbmRsZURpcih3aC53YXRjaFBhdGgsIHN0YXRzLCBpbml0aWFsQWRkLCBkZXB0aCwgdGFyZ2V0LCB3aCwgdGFyZ2V0UGF0aCk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIC8vIHByZXNlcnZlIHRoaXMgc3ltbGluaydzIHRhcmdldCBwYXRoXG4gICAgICAgICAgICAgICAgaWYgKGFic1BhdGggIT09IHRhcmdldFBhdGggJiYgdGFyZ2V0UGF0aCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9zeW1saW5rUGF0aHMuc2V0KGFic1BhdGgsIHRhcmdldFBhdGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHN0YXRzLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRQYXRoID0gZm9sbG93ID8gYXdhaXQgZnNyZWFscGF0aChwYXRoKSA6IHBhdGg7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudCA9IHN5c1BhdGguZGlybmFtZSh3aC53YXRjaFBhdGgpO1xuICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9nZXRXYXRjaGVkRGlyKHBhcmVudCkuYWRkKHdoLndhdGNoUGF0aCk7XG4gICAgICAgICAgICAgICAgdGhpcy5mc3cuX2VtaXQoRVYuQURELCB3aC53YXRjaFBhdGgsIHN0YXRzKTtcbiAgICAgICAgICAgICAgICBjbG9zZXIgPSBhd2FpdCB0aGlzLl9oYW5kbGVEaXIocGFyZW50LCBzdGF0cywgaW5pdGlhbEFkZCwgZGVwdGgsIHBhdGgsIHdoLCB0YXJnZXRQYXRoKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgLy8gcHJlc2VydmUgdGhpcyBzeW1saW5rJ3MgdGFyZ2V0IHBhdGhcbiAgICAgICAgICAgICAgICBpZiAodGFyZ2V0UGF0aCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9zeW1saW5rUGF0aHMuc2V0KHN5c1BhdGgucmVzb2x2ZShwYXRoKSwgdGFyZ2V0UGF0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY2xvc2VyID0gdGhpcy5faGFuZGxlRmlsZSh3aC53YXRjaFBhdGgsIHN0YXRzLCBpbml0aWFsQWRkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlYWR5KCk7XG4gICAgICAgICAgICBpZiAoY2xvc2VyKVxuICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9hZGRQYXRoQ2xvc2VyKHBhdGgsIGNsb3Nlcik7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5mc3cuX2hhbmRsZUVycm9yKGVycm9yKSkge1xuICAgICAgICAgICAgICAgIHJlYWR5KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhdGg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCAiLyoqXG4gKiBEaXNjb3ZlciB0d2Vha3MgdW5kZXIgPHVzZXJSb290Pi90d2Vha3MuIEVhY2ggdHdlYWsgaXMgYSBkaXJlY3Rvcnkgd2l0aCBhXG4gKiBtYW5pZmVzdC5qc29uIGFuZCBhbiBlbnRyeSBzY3JpcHQuIEVudHJ5IHJlc29sdXRpb24gaXMgbWFuaWZlc3QubWFpbiBmaXJzdCxcbiAqIHRoZW4gaW5kZXguanMsIGluZGV4Lm1qcywgYW5kIGluZGV4LmNqcy5cbiAqXG4gKiBUaGUgbWFuaWZlc3QgZ2F0ZSBpcyBpbnRlbnRpb25hbGx5IHN0cmljdC4gQSB0d2VhayBtdXN0IGlkZW50aWZ5IGl0cyBHaXRIdWJcbiAqIHJlcG9zaXRvcnkgc28gdGhlIG1hbmFnZXIgY2FuIGNoZWNrIHJlbGVhc2VzIHdpdGhvdXQgZ3JhbnRpbmcgdGhlIHR3ZWFrIGFuXG4gKiB1cGRhdGUvaW5zdGFsbCBjaGFubmVsLiBVcGRhdGUgY2hlY2tzIGFyZSBhZHZpc29yeSBvbmx5LlxuICovXG5pbXBvcnQgeyByZWFkZGlyU3luYywgc3RhdFN5bmMsIHJlYWRGaWxlU3luYywgZXhpc3RzU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuaW1wb3J0IHR5cGUgeyBUd2Vha01hbmlmZXN0IH0gZnJvbSBcIkBjb2RleC1wbHVzcGx1cy9zZGtcIjtcblxuZXhwb3J0IGludGVyZmFjZSBEaXNjb3ZlcmVkVHdlYWsge1xuICBkaXI6IHN0cmluZztcbiAgZW50cnk6IHN0cmluZztcbiAgbWFuaWZlc3Q6IFR3ZWFrTWFuaWZlc3Q7XG59XG5cbmNvbnN0IEVOVFJZX0NBTkRJREFURVMgPSBbXCJpbmRleC5qc1wiLCBcImluZGV4LmNqc1wiLCBcImluZGV4Lm1qc1wiXTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRpc2NvdmVyVHdlYWtzKHR3ZWFrc0Rpcjogc3RyaW5nKTogRGlzY292ZXJlZFR3ZWFrW10ge1xuICBpZiAoIWV4aXN0c1N5bmModHdlYWtzRGlyKSkgcmV0dXJuIFtdO1xuICBjb25zdCBvdXQ6IERpc2NvdmVyZWRUd2Vha1tdID0gW107XG4gIGZvciAoY29uc3QgbmFtZSBvZiByZWFkZGlyU3luYyh0d2Vha3NEaXIpKSB7XG4gICAgY29uc3QgZGlyID0gam9pbih0d2Vha3NEaXIsIG5hbWUpO1xuICAgIGlmICghc3RhdFN5bmMoZGlyKS5pc0RpcmVjdG9yeSgpKSBjb250aW51ZTtcbiAgICBjb25zdCBtYW5pZmVzdFBhdGggPSBqb2luKGRpciwgXCJtYW5pZmVzdC5qc29uXCIpO1xuICAgIGlmICghZXhpc3RzU3luYyhtYW5pZmVzdFBhdGgpKSBjb250aW51ZTtcbiAgICBsZXQgbWFuaWZlc3Q6IFR3ZWFrTWFuaWZlc3Q7XG4gICAgdHJ5IHtcbiAgICAgIG1hbmlmZXN0ID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMobWFuaWZlc3RQYXRoLCBcInV0ZjhcIikpIGFzIFR3ZWFrTWFuaWZlc3Q7XG4gICAgfSBjYXRjaCB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKCFpc1ZhbGlkTWFuaWZlc3QobWFuaWZlc3QpKSBjb250aW51ZTtcbiAgICBjb25zdCBlbnRyeSA9IHJlc29sdmVFbnRyeShkaXIsIG1hbmlmZXN0KTtcbiAgICBpZiAoIWVudHJ5KSBjb250aW51ZTtcbiAgICBvdXQucHVzaCh7IGRpciwgZW50cnksIG1hbmlmZXN0IH0pO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbmZ1bmN0aW9uIGlzVmFsaWRNYW5pZmVzdChtOiBUd2Vha01hbmlmZXN0KTogYm9vbGVhbiB7XG4gIGlmICghbS5pZCB8fCAhbS5uYW1lIHx8ICFtLnZlcnNpb24gfHwgIW0uZ2l0aHViUmVwbykgcmV0dXJuIGZhbHNlO1xuICBpZiAoIS9eW2EtekEtWjAtOS5fLV0rXFwvW2EtekEtWjAtOS5fLV0rJC8udGVzdChtLmdpdGh1YlJlcG8pKSByZXR1cm4gZmFsc2U7XG4gIGlmIChtLnNjb3BlICYmICFbXCJyZW5kZXJlclwiLCBcIm1haW5cIiwgXCJib3RoXCJdLmluY2x1ZGVzKG0uc2NvcGUpKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlRW50cnkoZGlyOiBzdHJpbmcsIG06IFR3ZWFrTWFuaWZlc3QpOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKG0ubWFpbikge1xuICAgIGNvbnN0IHAgPSBqb2luKGRpciwgbS5tYWluKTtcbiAgICByZXR1cm4gZXhpc3RzU3luYyhwKSA/IHAgOiBudWxsO1xuICB9XG4gIGZvciAoY29uc3QgYyBvZiBFTlRSWV9DQU5ESURBVEVTKSB7XG4gICAgY29uc3QgcCA9IGpvaW4oZGlyLCBjKTtcbiAgICBpZiAoZXhpc3RzU3luYyhwKSkgcmV0dXJuIHA7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG4iLCAiLyoqXG4gKiBEaXNrLWJhY2tlZCBrZXkvdmFsdWUgc3RvcmFnZSBmb3IgbWFpbi1wcm9jZXNzIHR3ZWFrcy5cbiAqXG4gKiBFYWNoIHR3ZWFrIGdldHMgb25lIEpTT04gZmlsZSB1bmRlciBgPHVzZXJSb290Pi9zdG9yYWdlLzxpZD4uanNvbmAuXG4gKiBXcml0ZXMgYXJlIGRlYm91bmNlZCAoNTAgbXMpIGFuZCBhdG9taWMgKHdyaXRlIHRvIDxmaWxlPi50bXAgdGhlbiByZW5hbWUpLlxuICogUmVhZHMgYXJlIGVhZ2VyICsgY2FjaGVkIGluLW1lbW9yeTsgd2UgbG9hZCBvbiBmaXJzdCBhY2Nlc3MuXG4gKi9cbmltcG9ydCB7XG4gIGV4aXN0c1N5bmMsXG4gIG1rZGlyU3luYyxcbiAgcmVhZEZpbGVTeW5jLFxuICByZW5hbWVTeW5jLFxuICB3cml0ZUZpbGVTeW5jLFxufSBmcm9tIFwibm9kZTpmc1wiO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gXCJub2RlOnBhdGhcIjtcblxuZXhwb3J0IGludGVyZmFjZSBEaXNrU3RvcmFnZSB7XG4gIGdldDxUPihrZXk6IHN0cmluZywgZGVmYXVsdFZhbHVlPzogVCk6IFQ7XG4gIHNldChrZXk6IHN0cmluZywgdmFsdWU6IHVua25vd24pOiB2b2lkO1xuICBkZWxldGUoa2V5OiBzdHJpbmcpOiB2b2lkO1xuICBhbGwoKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIGZsdXNoKCk6IHZvaWQ7XG59XG5cbmNvbnN0IEZMVVNIX0RFTEFZX01TID0gNTA7XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVEaXNrU3RvcmFnZShyb290RGlyOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiBEaXNrU3RvcmFnZSB7XG4gIGNvbnN0IGRpciA9IGpvaW4ocm9vdERpciwgXCJzdG9yYWdlXCIpO1xuICBta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgY29uc3QgZmlsZSA9IGpvaW4oZGlyLCBgJHtzYW5pdGl6ZShpZCl9Lmpzb25gKTtcblxuICBsZXQgZGF0YTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgaWYgKGV4aXN0c1N5bmMoZmlsZSkpIHtcbiAgICB0cnkge1xuICAgICAgZGF0YSA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKGZpbGUsIFwidXRmOFwiKSkgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBDb3JydXB0IGZpbGUgXHUyMDE0IHN0YXJ0IGZyZXNoLCBidXQgZG9uJ3QgY2xvYmJlciB0aGUgb3JpZ2luYWwgdW50aWwgd2VcbiAgICAgIC8vIHN1Y2Nlc3NmdWxseSB3cml0ZSBhZ2Fpbi4gKE1vdmUgaXQgYXNpZGUgZm9yIGZvcmVuc2ljcy4pXG4gICAgICB0cnkge1xuICAgICAgICByZW5hbWVTeW5jKGZpbGUsIGAke2ZpbGV9LmNvcnJ1cHQtJHtEYXRlLm5vdygpfWApO1xuICAgICAgfSBjYXRjaCB7fVxuICAgICAgZGF0YSA9IHt9O1xuICAgIH1cbiAgfVxuXG4gIGxldCBkaXJ0eSA9IGZhbHNlO1xuICBsZXQgdGltZXI6IE5vZGVKUy5UaW1lb3V0IHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3Qgc2NoZWR1bGVGbHVzaCA9ICgpID0+IHtcbiAgICBkaXJ0eSA9IHRydWU7XG4gICAgaWYgKHRpbWVyKSByZXR1cm47XG4gICAgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRpbWVyID0gbnVsbDtcbiAgICAgIGlmIChkaXJ0eSkgZmx1c2goKTtcbiAgICB9LCBGTFVTSF9ERUxBWV9NUyk7XG4gIH07XG5cbiAgY29uc3QgZmx1c2ggPSAoKTogdm9pZCA9PiB7XG4gICAgaWYgKCFkaXJ0eSkgcmV0dXJuO1xuICAgIGNvbnN0IHRtcCA9IGAke2ZpbGV9LnRtcGA7XG4gICAgdHJ5IHtcbiAgICAgIHdyaXRlRmlsZVN5bmModG1wLCBKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCAyKSwgXCJ1dGY4XCIpO1xuICAgICAgcmVuYW1lU3luYyh0bXAsIGZpbGUpO1xuICAgICAgZGlydHkgPSBmYWxzZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBMZWF2ZSBkaXJ0eT10cnVlIHNvIGEgZnV0dXJlIGZsdXNoIHJldHJpZXMuXG4gICAgICBjb25zb2xlLmVycm9yKFwiW2NvZGV4LXBsdXNwbHVzXSBzdG9yYWdlIGZsdXNoIGZhaWxlZDpcIiwgaWQsIGUpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4ge1xuICAgIGdldDogPFQ+KGs6IHN0cmluZywgZD86IFQpOiBUID0+XG4gICAgICBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoZGF0YSwgaykgPyAoZGF0YVtrXSBhcyBUKSA6IChkIGFzIFQpLFxuICAgIHNldChrLCB2KSB7XG4gICAgICBkYXRhW2tdID0gdjtcbiAgICAgIHNjaGVkdWxlRmx1c2goKTtcbiAgICB9LFxuICAgIGRlbGV0ZShrKSB7XG4gICAgICBpZiAoayBpbiBkYXRhKSB7XG4gICAgICAgIGRlbGV0ZSBkYXRhW2tdO1xuICAgICAgICBzY2hlZHVsZUZsdXNoKCk7XG4gICAgICB9XG4gICAgfSxcbiAgICBhbGw6ICgpID0+ICh7IC4uLmRhdGEgfSksXG4gICAgZmx1c2gsXG4gIH07XG59XG5cbmZ1bmN0aW9uIHNhbml0aXplKGlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICAvLyBUd2VhayBpZHMgYXJlIGF1dGhvci1jb250cm9sbGVkOyBjbGFtcCB0byBhIHNhZmUgZmlsZW5hbWUuXG4gIHJldHVybiBpZC5yZXBsYWNlKC9bXmEtekEtWjAtOS5fQC1dL2csIFwiX1wiKTtcbn1cbiIsICJpbXBvcnQgeyBleGlzdHNTeW5jLCBta2RpclN5bmMsIHJlYWRGaWxlU3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBkaXJuYW1lLCBpc0Fic29sdXRlLCByZXNvbHZlIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuaW1wb3J0IHR5cGUgeyBUd2Vha01jcFNlcnZlciB9IGZyb20gXCJAY29kZXgtcGx1c3BsdXMvc2RrXCI7XG5cbmV4cG9ydCBjb25zdCBNQ1BfTUFOQUdFRF9TVEFSVCA9IFwiIyBCRUdJTiBDT0RFWCsrIE1BTkFHRUQgTUNQIFNFUlZFUlNcIjtcbmV4cG9ydCBjb25zdCBNQ1BfTUFOQUdFRF9FTkQgPSBcIiMgRU5EIENPREVYKysgTUFOQUdFRCBNQ1AgU0VSVkVSU1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIE1jcFN5bmNUd2VhayB7XG4gIGRpcjogc3RyaW5nO1xuICBtYW5pZmVzdDoge1xuICAgIGlkOiBzdHJpbmc7XG4gICAgbWNwPzogVHdlYWtNY3BTZXJ2ZXI7XG4gIH07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnVpbHRNYW5hZ2VkTWNwQmxvY2sge1xuICBibG9jazogc3RyaW5nO1xuICBzZXJ2ZXJOYW1lczogc3RyaW5nW107XG4gIHNraXBwZWRTZXJ2ZXJOYW1lczogc3RyaW5nW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWFuYWdlZE1jcFN5bmNSZXN1bHQgZXh0ZW5kcyBCdWlsdE1hbmFnZWRNY3BCbG9jayB7XG4gIGNoYW5nZWQ6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzeW5jTWFuYWdlZE1jcFNlcnZlcnMoe1xuICBjb25maWdQYXRoLFxuICB0d2Vha3MsXG59OiB7XG4gIGNvbmZpZ1BhdGg6IHN0cmluZztcbiAgdHdlYWtzOiBNY3BTeW5jVHdlYWtbXTtcbn0pOiBNYW5hZ2VkTWNwU3luY1Jlc3VsdCB7XG4gIGNvbnN0IGN1cnJlbnQgPSBleGlzdHNTeW5jKGNvbmZpZ1BhdGgpID8gcmVhZEZpbGVTeW5jKGNvbmZpZ1BhdGgsIFwidXRmOFwiKSA6IFwiXCI7XG4gIGNvbnN0IGJ1aWx0ID0gYnVpbGRNYW5hZ2VkTWNwQmxvY2sodHdlYWtzLCBjdXJyZW50KTtcbiAgY29uc3QgbmV4dCA9IG1lcmdlTWFuYWdlZE1jcEJsb2NrKGN1cnJlbnQsIGJ1aWx0LmJsb2NrKTtcblxuICBpZiAobmV4dCAhPT0gY3VycmVudCkge1xuICAgIG1rZGlyU3luYyhkaXJuYW1lKGNvbmZpZ1BhdGgpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICB3cml0ZUZpbGVTeW5jKGNvbmZpZ1BhdGgsIG5leHQsIFwidXRmOFwiKTtcbiAgfVxuXG4gIHJldHVybiB7IC4uLmJ1aWx0LCBjaGFuZ2VkOiBuZXh0ICE9PSBjdXJyZW50IH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZE1hbmFnZWRNY3BCbG9jayhcbiAgdHdlYWtzOiBNY3BTeW5jVHdlYWtbXSxcbiAgZXhpc3RpbmdUb21sID0gXCJcIixcbik6IEJ1aWx0TWFuYWdlZE1jcEJsb2NrIHtcbiAgY29uc3QgbWFudWFsVG9tbCA9IHN0cmlwTWFuYWdlZE1jcEJsb2NrKGV4aXN0aW5nVG9tbCk7XG4gIGNvbnN0IG1hbnVhbE5hbWVzID0gZmluZE1jcFNlcnZlck5hbWVzKG1hbnVhbFRvbWwpO1xuICBjb25zdCB1c2VkTmFtZXMgPSBuZXcgU2V0KG1hbnVhbE5hbWVzKTtcbiAgY29uc3Qgc2VydmVyTmFtZXM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHNraXBwZWRTZXJ2ZXJOYW1lczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgZW50cmllczogc3RyaW5nW10gPSBbXTtcblxuICBmb3IgKGNvbnN0IHR3ZWFrIG9mIHR3ZWFrcykge1xuICAgIGNvbnN0IG1jcCA9IG5vcm1hbGl6ZU1jcFNlcnZlcih0d2Vhay5tYW5pZmVzdC5tY3ApO1xuICAgIGlmICghbWNwKSBjb250aW51ZTtcblxuICAgIGNvbnN0IGJhc2VOYW1lID0gbWNwU2VydmVyTmFtZUZyb21Ud2Vha0lkKHR3ZWFrLm1hbmlmZXN0LmlkKTtcbiAgICBpZiAobWFudWFsTmFtZXMuaGFzKGJhc2VOYW1lKSkge1xuICAgICAgc2tpcHBlZFNlcnZlck5hbWVzLnB1c2goYmFzZU5hbWUpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3Qgc2VydmVyTmFtZSA9IHJlc2VydmVVbmlxdWVOYW1lKGJhc2VOYW1lLCB1c2VkTmFtZXMpO1xuICAgIHNlcnZlck5hbWVzLnB1c2goc2VydmVyTmFtZSk7XG4gICAgZW50cmllcy5wdXNoKGZvcm1hdE1jcFNlcnZlcihzZXJ2ZXJOYW1lLCB0d2Vhay5kaXIsIG1jcCkpO1xuICB9XG5cbiAgaWYgKGVudHJpZXMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHsgYmxvY2s6IFwiXCIsIHNlcnZlck5hbWVzLCBza2lwcGVkU2VydmVyTmFtZXMgfTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgYmxvY2s6IFtNQ1BfTUFOQUdFRF9TVEFSVCwgLi4uZW50cmllcywgTUNQX01BTkFHRURfRU5EXS5qb2luKFwiXFxuXCIpLFxuICAgIHNlcnZlck5hbWVzLFxuICAgIHNraXBwZWRTZXJ2ZXJOYW1lcyxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlTWFuYWdlZE1jcEJsb2NrKGN1cnJlbnRUb21sOiBzdHJpbmcsIG1hbmFnZWRCbG9jazogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKCFtYW5hZ2VkQmxvY2sgJiYgIWN1cnJlbnRUb21sLmluY2x1ZGVzKE1DUF9NQU5BR0VEX1NUQVJUKSkgcmV0dXJuIGN1cnJlbnRUb21sO1xuICBjb25zdCBzdHJpcHBlZCA9IHN0cmlwTWFuYWdlZE1jcEJsb2NrKGN1cnJlbnRUb21sKS50cmltRW5kKCk7XG4gIGlmICghbWFuYWdlZEJsb2NrKSByZXR1cm4gc3RyaXBwZWQgPyBgJHtzdHJpcHBlZH1cXG5gIDogXCJcIjtcbiAgcmV0dXJuIGAke3N0cmlwcGVkID8gYCR7c3RyaXBwZWR9XFxuXFxuYCA6IFwiXCJ9JHttYW5hZ2VkQmxvY2t9XFxuYDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwTWFuYWdlZE1jcEJsb2NrKHRvbWw6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHBhdHRlcm4gPSBuZXcgUmVnRXhwKFxuICAgIGBcXFxcbj8ke2VzY2FwZVJlZ0V4cChNQ1BfTUFOQUdFRF9TVEFSVCl9W1xcXFxzXFxcXFNdKj8ke2VzY2FwZVJlZ0V4cChNQ1BfTUFOQUdFRF9FTkQpfVxcXFxuP2AsXG4gICAgXCJnXCIsXG4gICk7XG4gIHJldHVybiB0b21sLnJlcGxhY2UocGF0dGVybiwgXCJcXG5cIikucmVwbGFjZSgvXFxuezMsfS9nLCBcIlxcblxcblwiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1jcFNlcnZlck5hbWVGcm9tVHdlYWtJZChpZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3Qgd2l0aG91dFB1Ymxpc2hlciA9IGlkLnJlcGxhY2UoL15jb1xcLmJlbm5ldHRcXC4vLCBcIlwiKTtcbiAgY29uc3Qgc2x1ZyA9IHdpdGhvdXRQdWJsaXNoZXJcbiAgICAucmVwbGFjZSgvW15hLXpBLVowLTlfLV0rL2csIFwiLVwiKVxuICAgIC5yZXBsYWNlKC9eLSt8LSskL2csIFwiXCIpXG4gICAgLnRvTG93ZXJDYXNlKCk7XG4gIHJldHVybiBzbHVnIHx8IFwidHdlYWstbWNwXCI7XG59XG5cbmZ1bmN0aW9uIGZpbmRNY3BTZXJ2ZXJOYW1lcyh0b21sOiBzdHJpbmcpOiBTZXQ8c3RyaW5nPiB7XG4gIGNvbnN0IG5hbWVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IHRhYmxlUGF0dGVybiA9IC9eXFxzKlxcW21jcF9zZXJ2ZXJzXFwuKFteXFxdXFxzXSspXFxdXFxzKiQvZ207XG4gIGxldCBtYXRjaDogUmVnRXhwRXhlY0FycmF5IHwgbnVsbDtcbiAgd2hpbGUgKChtYXRjaCA9IHRhYmxlUGF0dGVybi5leGVjKHRvbWwpKSAhPT0gbnVsbCkge1xuICAgIG5hbWVzLmFkZCh1bnF1b3RlVG9tbEtleShtYXRjaFsxXSA/PyBcIlwiKSk7XG4gIH1cbiAgcmV0dXJuIG5hbWVzO1xufVxuXG5mdW5jdGlvbiByZXNlcnZlVW5pcXVlTmFtZShiYXNlTmFtZTogc3RyaW5nLCB1c2VkTmFtZXM6IFNldDxzdHJpbmc+KTogc3RyaW5nIHtcbiAgaWYgKCF1c2VkTmFtZXMuaGFzKGJhc2VOYW1lKSkge1xuICAgIHVzZWROYW1lcy5hZGQoYmFzZU5hbWUpO1xuICAgIHJldHVybiBiYXNlTmFtZTtcbiAgfVxuICBmb3IgKGxldCBpID0gMjsgOyBpICs9IDEpIHtcbiAgICBjb25zdCBjYW5kaWRhdGUgPSBgJHtiYXNlTmFtZX0tJHtpfWA7XG4gICAgaWYgKCF1c2VkTmFtZXMuaGFzKGNhbmRpZGF0ZSkpIHtcbiAgICAgIHVzZWROYW1lcy5hZGQoY2FuZGlkYXRlKTtcbiAgICAgIHJldHVybiBjYW5kaWRhdGU7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZU1jcFNlcnZlcih2YWx1ZTogVHdlYWtNY3BTZXJ2ZXIgfCB1bmRlZmluZWQpOiBUd2Vha01jcFNlcnZlciB8IG51bGwge1xuICBpZiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZS5jb21tYW5kICE9PSBcInN0cmluZ1wiIHx8IHZhbHVlLmNvbW1hbmQubGVuZ3RoID09PSAwKSByZXR1cm4gbnVsbDtcbiAgaWYgKHZhbHVlLmFyZ3MgIT09IHVuZGVmaW5lZCAmJiAhQXJyYXkuaXNBcnJheSh2YWx1ZS5hcmdzKSkgcmV0dXJuIG51bGw7XG4gIGlmICh2YWx1ZS5hcmdzPy5zb21lKChhcmcpID0+IHR5cGVvZiBhcmcgIT09IFwic3RyaW5nXCIpKSByZXR1cm4gbnVsbDtcbiAgaWYgKHZhbHVlLmVudiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKCF2YWx1ZS5lbnYgfHwgdHlwZW9mIHZhbHVlLmVudiAhPT0gXCJvYmplY3RcIiB8fCBBcnJheS5pc0FycmF5KHZhbHVlLmVudikpIHJldHVybiBudWxsO1xuICAgIGlmIChPYmplY3QudmFsdWVzKHZhbHVlLmVudikuc29tZSgoZW52VmFsdWUpID0+IHR5cGVvZiBlbnZWYWx1ZSAhPT0gXCJzdHJpbmdcIikpIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0TWNwU2VydmVyKHNlcnZlck5hbWU6IHN0cmluZywgdHdlYWtEaXI6IHN0cmluZywgbWNwOiBUd2Vha01jcFNlcnZlcik6IHN0cmluZyB7XG4gIGNvbnN0IGxpbmVzID0gW1xuICAgIGBbbWNwX3NlcnZlcnMuJHtmb3JtYXRUb21sS2V5KHNlcnZlck5hbWUpfV1gLFxuICAgIGBjb21tYW5kID0gJHtmb3JtYXRUb21sU3RyaW5nKHJlc29sdmVDb21tYW5kKHR3ZWFrRGlyLCBtY3AuY29tbWFuZCkpfWAsXG4gIF07XG5cbiAgaWYgKG1jcC5hcmdzICYmIG1jcC5hcmdzLmxlbmd0aCA+IDApIHtcbiAgICBsaW5lcy5wdXNoKGBhcmdzID0gJHtmb3JtYXRUb21sU3RyaW5nQXJyYXkobWNwLmFyZ3MubWFwKChhcmcpID0+IHJlc29sdmVBcmcodHdlYWtEaXIsIGFyZykpKX1gKTtcbiAgfVxuXG4gIGlmIChtY3AuZW52ICYmIE9iamVjdC5rZXlzKG1jcC5lbnYpLmxlbmd0aCA+IDApIHtcbiAgICBsaW5lcy5wdXNoKGBlbnYgPSAke2Zvcm1hdFRvbWxJbmxpbmVUYWJsZShtY3AuZW52KX1gKTtcbiAgfVxuXG4gIHJldHVybiBsaW5lcy5qb2luKFwiXFxuXCIpO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlQ29tbWFuZCh0d2Vha0Rpcjogc3RyaW5nLCBjb21tYW5kOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoaXNBYnNvbHV0ZShjb21tYW5kKSB8fCAhbG9va3NMaWtlUmVsYXRpdmVQYXRoKGNvbW1hbmQpKSByZXR1cm4gY29tbWFuZDtcbiAgcmV0dXJuIHJlc29sdmUodHdlYWtEaXIsIGNvbW1hbmQpO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlQXJnKHR3ZWFrRGlyOiBzdHJpbmcsIGFyZzogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKGlzQWJzb2x1dGUoYXJnKSB8fCBhcmcuc3RhcnRzV2l0aChcIi1cIikpIHJldHVybiBhcmc7XG4gIGNvbnN0IGNhbmRpZGF0ZSA9IHJlc29sdmUodHdlYWtEaXIsIGFyZyk7XG4gIHJldHVybiBleGlzdHNTeW5jKGNhbmRpZGF0ZSkgPyBjYW5kaWRhdGUgOiBhcmc7XG59XG5cbmZ1bmN0aW9uIGxvb2tzTGlrZVJlbGF0aXZlUGF0aCh2YWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiB2YWx1ZS5zdGFydHNXaXRoKFwiLi9cIikgfHwgdmFsdWUuc3RhcnRzV2l0aChcIi4uL1wiKSB8fCB2YWx1ZS5pbmNsdWRlcyhcIi9cIik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFRvbWxTdHJpbmcodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFRvbWxTdHJpbmdBcnJheSh2YWx1ZXM6IHN0cmluZ1tdKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBbJHt2YWx1ZXMubWFwKGZvcm1hdFRvbWxTdHJpbmcpLmpvaW4oXCIsIFwiKX1dYDtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VG9tbElubGluZVRhYmxlKHJlY29yZDogUmVjb3JkPHN0cmluZywgc3RyaW5nPik6IHN0cmluZyB7XG4gIHJldHVybiBgeyAke09iamVjdC5lbnRyaWVzKHJlY29yZClcbiAgICAubWFwKChba2V5LCB2YWx1ZV0pID0+IGAke2Zvcm1hdFRvbWxLZXkoa2V5KX0gPSAke2Zvcm1hdFRvbWxTdHJpbmcodmFsdWUpfWApXG4gICAgLmpvaW4oXCIsIFwiKX0gfWA7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFRvbWxLZXkoa2V5OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gL15bYS16QS1aMC05Xy1dKyQvLnRlc3Qoa2V5KSA/IGtleSA6IGZvcm1hdFRvbWxTdHJpbmcoa2V5KTtcbn1cblxuZnVuY3Rpb24gdW5xdW90ZVRvbWxLZXkoa2V5OiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoIWtleS5zdGFydHNXaXRoKCdcIicpIHx8ICFrZXkuZW5kc1dpdGgoJ1wiJykpIHJldHVybiBrZXk7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2Uoa2V5KSBhcyBzdHJpbmc7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBrZXk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZXNjYXBlUmVnRXhwKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdmFsdWUucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csIFwiXFxcXCQmXCIpO1xufVxuIiwgImltcG9ydCB7IGV4ZWNGaWxlU3luYyB9IGZyb20gXCJub2RlOmNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCB7IGV4aXN0c1N5bmMsIHJlYWRGaWxlU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBob21lZGlyLCBwbGF0Zm9ybSB9IGZyb20gXCJub2RlOm9zXCI7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuXG50eXBlIENoZWNrU3RhdHVzID0gXCJva1wiIHwgXCJ3YXJuXCIgfCBcImVycm9yXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2F0Y2hlckhlYWx0aENoZWNrIHtcbiAgbmFtZTogc3RyaW5nO1xuICBzdGF0dXM6IENoZWNrU3RhdHVzO1xuICBkZXRhaWw6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXYXRjaGVySGVhbHRoIHtcbiAgY2hlY2tlZEF0OiBzdHJpbmc7XG4gIHN0YXR1czogQ2hlY2tTdGF0dXM7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIHN1bW1hcnk6IHN0cmluZztcbiAgd2F0Y2hlcjogc3RyaW5nO1xuICBjaGVja3M6IFdhdGNoZXJIZWFsdGhDaGVja1tdO1xufVxuXG5pbnRlcmZhY2UgSW5zdGFsbGVyU3RhdGUge1xuICBhcHBSb290Pzogc3RyaW5nO1xuICB2ZXJzaW9uPzogc3RyaW5nO1xuICB3YXRjaGVyPzogXCJsYXVuY2hkXCIgfCBcImxvZ2luLWl0ZW1cIiB8IFwic2NoZWR1bGVkLXRhc2tcIiB8IFwic3lzdGVtZFwiIHwgXCJub25lXCI7XG59XG5cbmludGVyZmFjZSBSdW50aW1lQ29uZmlnIHtcbiAgY29kZXhQbHVzUGx1cz86IHtcbiAgICBhdXRvVXBkYXRlPzogYm9vbGVhbjtcbiAgfTtcbn1cblxuaW50ZXJmYWNlIFNlbGZVcGRhdGVTdGF0ZSB7XG4gIHN0YXR1cz86IFwiY2hlY2tpbmdcIiB8IFwidXAtdG8tZGF0ZVwiIHwgXCJ1cGRhdGVkXCIgfCBcImZhaWxlZFwiIHwgXCJkaXNhYmxlZFwiO1xuICBjb21wbGV0ZWRBdD86IHN0cmluZztcbiAgY2hlY2tlZEF0Pzogc3RyaW5nO1xuICBsYXRlc3RWZXJzaW9uPzogc3RyaW5nIHwgbnVsbDtcbiAgZXJyb3I/OiBzdHJpbmc7XG59XG5cbmNvbnN0IExBVU5DSERfTEFCRUwgPSBcImNvbS5jb2RleHBsdXNwbHVzLndhdGNoZXJcIjtcbmNvbnN0IFdBVENIRVJfTE9HID0gam9pbihob21lZGlyKCksIFwiTGlicmFyeVwiLCBcIkxvZ3NcIiwgXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyLmxvZ1wiKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFdhdGNoZXJIZWFsdGgodXNlclJvb3Q6IHN0cmluZyk6IFdhdGNoZXJIZWFsdGgge1xuICBjb25zdCBjaGVja3M6IFdhdGNoZXJIZWFsdGhDaGVja1tdID0gW107XG4gIGNvbnN0IHN0YXRlID0gcmVhZEpzb248SW5zdGFsbGVyU3RhdGU+KGpvaW4odXNlclJvb3QsIFwic3RhdGUuanNvblwiKSk7XG4gIGNvbnN0IGNvbmZpZyA9IHJlYWRKc29uPFJ1bnRpbWVDb25maWc+KGpvaW4odXNlclJvb3QsIFwiY29uZmlnLmpzb25cIikpID8/IHt9O1xuICBjb25zdCBzZWxmVXBkYXRlID0gcmVhZEpzb248U2VsZlVwZGF0ZVN0YXRlPihqb2luKHVzZXJSb290LCBcInNlbGYtdXBkYXRlLXN0YXRlLmpzb25cIikpO1xuXG4gIGNoZWNrcy5wdXNoKHtcbiAgICBuYW1lOiBcIkluc3RhbGwgc3RhdGVcIixcbiAgICBzdGF0dXM6IHN0YXRlID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgIGRldGFpbDogc3RhdGUgPyBgQ29kZXgrKyAke3N0YXRlLnZlcnNpb24gPz8gXCIodW5rbm93biB2ZXJzaW9uKVwifWAgOiBcInN0YXRlLmpzb24gaXMgbWlzc2luZ1wiLFxuICB9KTtcblxuICBpZiAoIXN0YXRlKSByZXR1cm4gc3VtbWFyaXplKFwibm9uZVwiLCBjaGVja3MpO1xuXG4gIGNvbnN0IGF1dG9VcGRhdGUgPSBjb25maWcuY29kZXhQbHVzUGx1cz8uYXV0b1VwZGF0ZSAhPT0gZmFsc2U7XG4gIGNoZWNrcy5wdXNoKHtcbiAgICBuYW1lOiBcIkF1dG9tYXRpYyByZWZyZXNoXCIsXG4gICAgc3RhdHVzOiBhdXRvVXBkYXRlID8gXCJva1wiIDogXCJ3YXJuXCIsXG4gICAgZGV0YWlsOiBhdXRvVXBkYXRlID8gXCJlbmFibGVkXCIgOiBcImRpc2FibGVkIGluIENvZGV4KysgY29uZmlnXCIsXG4gIH0pO1xuXG4gIGNoZWNrcy5wdXNoKHtcbiAgICBuYW1lOiBcIldhdGNoZXIga2luZFwiLFxuICAgIHN0YXR1czogc3RhdGUud2F0Y2hlciAmJiBzdGF0ZS53YXRjaGVyICE9PSBcIm5vbmVcIiA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICBkZXRhaWw6IHN0YXRlLndhdGNoZXIgPz8gXCJub25lXCIsXG4gIH0pO1xuXG4gIGlmIChzZWxmVXBkYXRlKSB7XG4gICAgY2hlY2tzLnB1c2goc2VsZlVwZGF0ZUNoZWNrKHNlbGZVcGRhdGUpKTtcbiAgfVxuXG4gIGNvbnN0IGFwcFJvb3QgPSBzdGF0ZS5hcHBSb290ID8/IFwiXCI7XG4gIGNoZWNrcy5wdXNoKHtcbiAgICBuYW1lOiBcIkNvZGV4IGFwcFwiLFxuICAgIHN0YXR1czogYXBwUm9vdCAmJiBleGlzdHNTeW5jKGFwcFJvb3QpID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgIGRldGFpbDogYXBwUm9vdCB8fCBcIm1pc3NpbmcgYXBwUm9vdCBpbiBzdGF0ZVwiLFxuICB9KTtcblxuICBzd2l0Y2ggKHBsYXRmb3JtKCkpIHtcbiAgICBjYXNlIFwiZGFyd2luXCI6XG4gICAgICBjaGVja3MucHVzaCguLi5jaGVja0xhdW5jaGRXYXRjaGVyKGFwcFJvb3QpKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgXCJsaW51eFwiOlxuICAgICAgY2hlY2tzLnB1c2goLi4uY2hlY2tTeXN0ZW1kV2F0Y2hlcihhcHBSb290KSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIFwid2luMzJcIjpcbiAgICAgIGNoZWNrcy5wdXNoKC4uLmNoZWNrU2NoZWR1bGVkVGFza1dhdGNoZXIoKSk7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgY2hlY2tzLnB1c2goe1xuICAgICAgICBuYW1lOiBcIlBsYXRmb3JtIHdhdGNoZXJcIixcbiAgICAgICAgc3RhdHVzOiBcIndhcm5cIixcbiAgICAgICAgZGV0YWlsOiBgdW5zdXBwb3J0ZWQgcGxhdGZvcm06ICR7cGxhdGZvcm0oKX1gLFxuICAgICAgfSk7XG4gIH1cblxuICByZXR1cm4gc3VtbWFyaXplKHN0YXRlLndhdGNoZXIgPz8gXCJub25lXCIsIGNoZWNrcyk7XG59XG5cbmZ1bmN0aW9uIHNlbGZVcGRhdGVDaGVjayhzdGF0ZTogU2VsZlVwZGF0ZVN0YXRlKTogV2F0Y2hlckhlYWx0aENoZWNrIHtcbiAgY29uc3QgYXQgPSBzdGF0ZS5jb21wbGV0ZWRBdCA/PyBzdGF0ZS5jaGVja2VkQXQgPz8gXCJ1bmtub3duIHRpbWVcIjtcbiAgaWYgKHN0YXRlLnN0YXR1cyA9PT0gXCJmYWlsZWRcIikge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBcImxhc3QgQ29kZXgrKyB1cGRhdGVcIixcbiAgICAgIHN0YXR1czogXCJ3YXJuXCIsXG4gICAgICBkZXRhaWw6IHN0YXRlLmVycm9yID8gYGZhaWxlZCAke2F0fTogJHtzdGF0ZS5lcnJvcn1gIDogYGZhaWxlZCAke2F0fWAsXG4gICAgfTtcbiAgfVxuICBpZiAoc3RhdGUuc3RhdHVzID09PSBcImRpc2FibGVkXCIpIHtcbiAgICByZXR1cm4geyBuYW1lOiBcImxhc3QgQ29kZXgrKyB1cGRhdGVcIiwgc3RhdHVzOiBcIndhcm5cIiwgZGV0YWlsOiBgc2tpcHBlZCAke2F0fTogYXV0b21hdGljIHJlZnJlc2ggZGlzYWJsZWRgIH07XG4gIH1cbiAgaWYgKHN0YXRlLnN0YXR1cyA9PT0gXCJ1cGRhdGVkXCIpIHtcbiAgICByZXR1cm4geyBuYW1lOiBcImxhc3QgQ29kZXgrKyB1cGRhdGVcIiwgc3RhdHVzOiBcIm9rXCIsIGRldGFpbDogYHVwZGF0ZWQgJHthdH0gdG8gJHtzdGF0ZS5sYXRlc3RWZXJzaW9uID8/IFwibmV3IHJlbGVhc2VcIn1gIH07XG4gIH1cbiAgaWYgKHN0YXRlLnN0YXR1cyA9PT0gXCJ1cC10by1kYXRlXCIpIHtcbiAgICByZXR1cm4geyBuYW1lOiBcImxhc3QgQ29kZXgrKyB1cGRhdGVcIiwgc3RhdHVzOiBcIm9rXCIsIGRldGFpbDogYHVwIHRvIGRhdGUgJHthdH1gIH07XG4gIH1cbiAgcmV0dXJuIHsgbmFtZTogXCJsYXN0IENvZGV4KysgdXBkYXRlXCIsIHN0YXR1czogXCJ3YXJuXCIsIGRldGFpbDogYGNoZWNraW5nIHNpbmNlICR7YXR9YCB9O1xufVxuXG5mdW5jdGlvbiBjaGVja0xhdW5jaGRXYXRjaGVyKGFwcFJvb3Q6IHN0cmluZyk6IFdhdGNoZXJIZWFsdGhDaGVja1tdIHtcbiAgY29uc3QgY2hlY2tzOiBXYXRjaGVySGVhbHRoQ2hlY2tbXSA9IFtdO1xuICBjb25zdCBwbGlzdFBhdGggPSBqb2luKGhvbWVkaXIoKSwgXCJMaWJyYXJ5XCIsIFwiTGF1bmNoQWdlbnRzXCIsIGAke0xBVU5DSERfTEFCRUx9LnBsaXN0YCk7XG4gIGNvbnN0IHBsaXN0ID0gZXhpc3RzU3luYyhwbGlzdFBhdGgpID8gcmVhZEZpbGVTYWZlKHBsaXN0UGF0aCkgOiBcIlwiO1xuICBjb25zdCBhc2FyUGF0aCA9IGFwcFJvb3QgPyBqb2luKGFwcFJvb3QsIFwiQ29udGVudHNcIiwgXCJSZXNvdXJjZXNcIiwgXCJhcHAuYXNhclwiKSA6IFwiXCI7XG5cbiAgY2hlY2tzLnB1c2goe1xuICAgIG5hbWU6IFwibGF1bmNoZCBwbGlzdFwiLFxuICAgIHN0YXR1czogcGxpc3QgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgZGV0YWlsOiBwbGlzdFBhdGgsXG4gIH0pO1xuXG4gIGlmIChwbGlzdCkge1xuICAgIGNoZWNrcy5wdXNoKHtcbiAgICAgIG5hbWU6IFwibGF1bmNoZCBsYWJlbFwiLFxuICAgICAgc3RhdHVzOiBwbGlzdC5pbmNsdWRlcyhMQVVOQ0hEX0xBQkVMKSA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICAgIGRldGFpbDogTEFVTkNIRF9MQUJFTCxcbiAgICB9KTtcbiAgICBjaGVja3MucHVzaCh7XG4gICAgICBuYW1lOiBcImxhdW5jaGQgdHJpZ2dlclwiLFxuICAgICAgc3RhdHVzOiBhc2FyUGF0aCAmJiBwbGlzdC5pbmNsdWRlcyhhc2FyUGF0aCkgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgICBkZXRhaWw6IGFzYXJQYXRoIHx8IFwibWlzc2luZyBhcHBSb290XCIsXG4gICAgfSk7XG4gICAgY2hlY2tzLnB1c2goe1xuICAgICAgbmFtZTogXCJ3YXRjaGVyIGNvbW1hbmRcIixcbiAgICAgIHN0YXR1czogcGxpc3QuaW5jbHVkZXMoXCJDT0RFWF9QTFVTUExVU19XQVRDSEVSPTFcIikgJiYgcGxpc3QuaW5jbHVkZXMoXCIgdXBkYXRlIC0td2F0Y2hlciAtLXF1aWV0XCIpXG4gICAgICAgID8gXCJva1wiXG4gICAgICAgIDogXCJlcnJvclwiLFxuICAgICAgZGV0YWlsOiBjb21tYW5kU3VtbWFyeShwbGlzdCksXG4gICAgfSk7XG5cbiAgICBjb25zdCBjbGlQYXRoID0gZXh0cmFjdEZpcnN0KHBsaXN0LCAvJyhbXiddKnBhY2thZ2VzXFwvaW5zdGFsbGVyXFwvZGlzdFxcL2NsaVxcLmpzKScvKTtcbiAgICBpZiAoY2xpUGF0aCkge1xuICAgICAgY2hlY2tzLnB1c2goe1xuICAgICAgICBuYW1lOiBcInJlcGFpciBDTElcIixcbiAgICAgICAgc3RhdHVzOiBleGlzdHNTeW5jKGNsaVBhdGgpID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgICAgICBkZXRhaWw6IGNsaVBhdGgsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBsb2FkZWQgPSBjb21tYW5kU3VjY2VlZHMoXCJsYXVuY2hjdGxcIiwgW1wibGlzdFwiLCBMQVVOQ0hEX0xBQkVMXSk7XG4gIGNoZWNrcy5wdXNoKHtcbiAgICBuYW1lOiBcImxhdW5jaGQgbG9hZGVkXCIsXG4gICAgc3RhdHVzOiBsb2FkZWQgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgZGV0YWlsOiBsb2FkZWQgPyBcInNlcnZpY2UgaXMgbG9hZGVkXCIgOiBcImxhdW5jaGN0bCBjYW5ub3QgZmluZCB0aGUgd2F0Y2hlclwiLFxuICB9KTtcblxuICBjaGVja3MucHVzaCh3YXRjaGVyTG9nQ2hlY2soKSk7XG4gIHJldHVybiBjaGVja3M7XG59XG5cbmZ1bmN0aW9uIGNoZWNrU3lzdGVtZFdhdGNoZXIoYXBwUm9vdDogc3RyaW5nKTogV2F0Y2hlckhlYWx0aENoZWNrW10ge1xuICBjb25zdCBkaXIgPSBqb2luKGhvbWVkaXIoKSwgXCIuY29uZmlnXCIsIFwic3lzdGVtZFwiLCBcInVzZXJcIik7XG4gIGNvbnN0IHNlcnZpY2UgPSBqb2luKGRpciwgXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyLnNlcnZpY2VcIik7XG4gIGNvbnN0IHRpbWVyID0gam9pbihkaXIsIFwiY29kZXgtcGx1c3BsdXMtd2F0Y2hlci50aW1lclwiKTtcbiAgY29uc3QgcGF0aFVuaXQgPSBqb2luKGRpciwgXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyLnBhdGhcIik7XG4gIGNvbnN0IGV4cGVjdGVkUGF0aCA9IGFwcFJvb3QgPyBqb2luKGFwcFJvb3QsIFwicmVzb3VyY2VzXCIsIFwiYXBwLmFzYXJcIikgOiBcIlwiO1xuICBjb25zdCBwYXRoQm9keSA9IGV4aXN0c1N5bmMocGF0aFVuaXQpID8gcmVhZEZpbGVTYWZlKHBhdGhVbml0KSA6IFwiXCI7XG5cbiAgcmV0dXJuIFtcbiAgICB7XG4gICAgICBuYW1lOiBcInN5c3RlbWQgc2VydmljZVwiLFxuICAgICAgc3RhdHVzOiBleGlzdHNTeW5jKHNlcnZpY2UpID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgICAgZGV0YWlsOiBzZXJ2aWNlLFxuICAgIH0sXG4gICAge1xuICAgICAgbmFtZTogXCJzeXN0ZW1kIHRpbWVyXCIsXG4gICAgICBzdGF0dXM6IGV4aXN0c1N5bmModGltZXIpID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgICAgZGV0YWlsOiB0aW1lcixcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6IFwic3lzdGVtZCBwYXRoXCIsXG4gICAgICBzdGF0dXM6IHBhdGhCb2R5ICYmIGV4cGVjdGVkUGF0aCAmJiBwYXRoQm9keS5pbmNsdWRlcyhleHBlY3RlZFBhdGgpID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgICAgZGV0YWlsOiBleHBlY3RlZFBhdGggfHwgcGF0aFVuaXQsXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiBcInBhdGggdW5pdCBhY3RpdmVcIixcbiAgICAgIHN0YXR1czogY29tbWFuZFN1Y2NlZWRzKFwic3lzdGVtY3RsXCIsIFtcIi0tdXNlclwiLCBcImlzLWFjdGl2ZVwiLCBcIi0tcXVpZXRcIiwgXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyLnBhdGhcIl0pID8gXCJva1wiIDogXCJ3YXJuXCIsXG4gICAgICBkZXRhaWw6IFwic3lzdGVtY3RsIC0tdXNlciBpcy1hY3RpdmUgY29kZXgtcGx1c3BsdXMtd2F0Y2hlci5wYXRoXCIsXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiBcInRpbWVyIGFjdGl2ZVwiLFxuICAgICAgc3RhdHVzOiBjb21tYW5kU3VjY2VlZHMoXCJzeXN0ZW1jdGxcIiwgW1wiLS11c2VyXCIsIFwiaXMtYWN0aXZlXCIsIFwiLS1xdWlldFwiLCBcImNvZGV4LXBsdXNwbHVzLXdhdGNoZXIudGltZXJcIl0pID8gXCJva1wiIDogXCJ3YXJuXCIsXG4gICAgICBkZXRhaWw6IFwic3lzdGVtY3RsIC0tdXNlciBpcy1hY3RpdmUgY29kZXgtcGx1c3BsdXMtd2F0Y2hlci50aW1lclwiLFxuICAgIH0sXG4gIF07XG59XG5cbmZ1bmN0aW9uIGNoZWNrU2NoZWR1bGVkVGFza1dhdGNoZXIoKTogV2F0Y2hlckhlYWx0aENoZWNrW10ge1xuICByZXR1cm4gW1xuICAgIHtcbiAgICAgIG5hbWU6IFwibG9nb24gdGFza1wiLFxuICAgICAgc3RhdHVzOiBjb21tYW5kU3VjY2VlZHMoXCJzY2h0YXNrcy5leGVcIiwgW1wiL1F1ZXJ5XCIsIFwiL1ROXCIsIFwiY29kZXgtcGx1c3BsdXMtd2F0Y2hlclwiXSkgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgICBkZXRhaWw6IFwiY29kZXgtcGx1c3BsdXMtd2F0Y2hlclwiLFxuICAgIH0sXG4gICAge1xuICAgICAgbmFtZTogXCJob3VybHkgdGFza1wiLFxuICAgICAgc3RhdHVzOiBjb21tYW5kU3VjY2VlZHMoXCJzY2h0YXNrcy5leGVcIiwgW1wiL1F1ZXJ5XCIsIFwiL1ROXCIsIFwiY29kZXgtcGx1c3BsdXMtd2F0Y2hlci1ob3VybHlcIl0pID8gXCJva1wiIDogXCJ3YXJuXCIsXG4gICAgICBkZXRhaWw6IFwiY29kZXgtcGx1c3BsdXMtd2F0Y2hlci1ob3VybHlcIixcbiAgICB9LFxuICBdO1xufVxuXG5mdW5jdGlvbiB3YXRjaGVyTG9nQ2hlY2soKTogV2F0Y2hlckhlYWx0aENoZWNrIHtcbiAgaWYgKCFleGlzdHNTeW5jKFdBVENIRVJfTE9HKSkge1xuICAgIHJldHVybiB7IG5hbWU6IFwid2F0Y2hlciBsb2dcIiwgc3RhdHVzOiBcIndhcm5cIiwgZGV0YWlsOiBcIm5vIHdhdGNoZXIgbG9nIHlldFwiIH07XG4gIH1cbiAgY29uc3QgdGFpbCA9IHJlYWRGaWxlU2FmZShXQVRDSEVSX0xPRykuc3BsaXQoL1xccj9cXG4vKS5zbGljZSgtNDApLmpvaW4oXCJcXG5cIik7XG4gIHJldHVybiBhbmFseXplV2F0Y2hlckxvZ1RhaWwodGFpbCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplV2F0Y2hlckxvZ1RhaWwodGFpbDogc3RyaW5nKTogV2F0Y2hlckhlYWx0aENoZWNrIHtcbiAgY29uc3QgaGFzRXJyb3IgPSAvXHUyNzE3IGNvZGV4LXBsdXNwbHVzIGZhaWxlZHxjb2RleC1wbHVzcGx1cyBmYWlsZWR8ZXJyb3J8ZmFpbGVkL2kudGVzdCh0YWlsKTtcbiAgY29uc3QgbmVlZHNNYW51YWxSZXBhaXIgPVxuICAgIGhhc0Vycm9yICYmXG4gICAgL0Nhbm5vdCB3cml0ZSB0byAuKkNvZGV4LipcXC5hcHB8QXBwIE1hbmFnZW1lbnR8ZmlsZSBvd25lcnNoaXB8c3VkbyBjb2RleHBsdXNwbHVzICg/Omluc3RhbGx8cmVwYWlyKXxFQUNDRVN8RVBFUk0vaS50ZXN0KHRhaWwpO1xuICByZXR1cm4ge1xuICAgIG5hbWU6IFwid2F0Y2hlciBsb2dcIixcbiAgICBzdGF0dXM6IGhhc0Vycm9yID8gXCJ3YXJuXCIgOiBcIm9rXCIsXG4gICAgZGV0YWlsOiBoYXNFcnJvclxuICAgICAgPyBuZWVkc01hbnVhbFJlcGFpclxuICAgICAgICA/IFwiYXV0by1yZXBhaXIgbmVlZHMgYXBwIHBlcm1pc3Npb25zOyBydW4gYGNvZGV4cGx1c3BsdXMgcmVwYWlyYCBmcm9tIFRlcm1pbmFsXCJcbiAgICAgICAgOiBcInJlY2VudCB3YXRjaGVyIGxvZyBjb250YWlucyBhbiBlcnJvclwiXG4gICAgICA6IFdBVENIRVJfTE9HLFxuICB9O1xufVxuXG5mdW5jdGlvbiBzdW1tYXJpemUod2F0Y2hlcjogc3RyaW5nLCBjaGVja3M6IFdhdGNoZXJIZWFsdGhDaGVja1tdKTogV2F0Y2hlckhlYWx0aCB7XG4gIGNvbnN0IGhhc0Vycm9yID0gY2hlY2tzLnNvbWUoKGMpID0+IGMuc3RhdHVzID09PSBcImVycm9yXCIpO1xuICBjb25zdCBoYXNXYXJuID0gY2hlY2tzLnNvbWUoKGMpID0+IGMuc3RhdHVzID09PSBcIndhcm5cIik7XG4gIGNvbnN0IHN0YXR1czogQ2hlY2tTdGF0dXMgPSBoYXNFcnJvciA/IFwiZXJyb3JcIiA6IGhhc1dhcm4gPyBcIndhcm5cIiA6IFwib2tcIjtcbiAgY29uc3QgZmFpbGVkID0gY2hlY2tzLmZpbHRlcigoYykgPT4gYy5zdGF0dXMgPT09IFwiZXJyb3JcIikubGVuZ3RoO1xuICBjb25zdCB3YXJuZWQgPSBjaGVja3MuZmlsdGVyKChjKSA9PiBjLnN0YXR1cyA9PT0gXCJ3YXJuXCIpLmxlbmd0aDtcbiAgY29uc3QgdGl0bGUgPVxuICAgIHN0YXR1cyA9PT0gXCJva1wiXG4gICAgICA/IFwiQXV0by1yZXBhaXIgd2F0Y2hlciBpcyByZWFkeVwiXG4gICAgICA6IHN0YXR1cyA9PT0gXCJ3YXJuXCJcbiAgICAgICAgPyBcIkF1dG8tcmVwYWlyIHdhdGNoZXIgbmVlZHMgcmV2aWV3XCJcbiAgICAgICAgOiBcIkF1dG8tcmVwYWlyIHdhdGNoZXIgaXMgbm90IHJlYWR5XCI7XG4gIGNvbnN0IHN1bW1hcnkgPVxuICAgIHN0YXR1cyA9PT0gXCJva1wiXG4gICAgICA/IFwiQ29kZXgrKyBzaG91bGQgYXV0b21hdGljYWxseSByZXBhaXIgaXRzZWxmIGFmdGVyIENvZGV4IHVwZGF0ZXMuXCJcbiAgICAgIDogYCR7ZmFpbGVkfSBmYWlsaW5nIGNoZWNrKHMpLCAke3dhcm5lZH0gd2FybmluZyhzKS5gO1xuXG4gIHJldHVybiB7XG4gICAgY2hlY2tlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgc3RhdHVzLFxuICAgIHRpdGxlLFxuICAgIHN1bW1hcnksXG4gICAgd2F0Y2hlcixcbiAgICBjaGVja3MsXG4gIH07XG59XG5cbmZ1bmN0aW9uIGNvbW1hbmRTdWNjZWVkcyhjb21tYW5kOiBzdHJpbmcsIGFyZ3M6IHN0cmluZ1tdKTogYm9vbGVhbiB7XG4gIHRyeSB7XG4gICAgZXhlY0ZpbGVTeW5jKGNvbW1hbmQsIGFyZ3MsIHsgc3RkaW86IFwiaWdub3JlXCIsIHRpbWVvdXQ6IDVfMDAwIH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZnVuY3Rpb24gY29tbWFuZFN1bW1hcnkocGxpc3Q6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGNvbW1hbmQgPSBleHRyYWN0Rmlyc3QocGxpc3QsIC88c3RyaW5nPihbXjxdKig/OnVwZGF0ZSAtLXdhdGNoZXIgLS1xdWlldHxyZXBhaXIgLS1xdWlldClbXjxdKik8XFwvc3RyaW5nPi8pO1xuICByZXR1cm4gY29tbWFuZCA/IHVuZXNjYXBlWG1sKGNvbW1hbmQpLnJlcGxhY2UoL1xccysvZywgXCIgXCIpLnRyaW0oKSA6IFwid2F0Y2hlciBjb21tYW5kIG5vdCBmb3VuZFwiO1xufVxuXG5mdW5jdGlvbiBleHRyYWN0Rmlyc3Qoc291cmNlOiBzdHJpbmcsIHBhdHRlcm46IFJlZ0V4cCk6IHN0cmluZyB8IG51bGwge1xuICByZXR1cm4gc291cmNlLm1hdGNoKHBhdHRlcm4pPy5bMV0gPz8gbnVsbDtcbn1cblxuZnVuY3Rpb24gcmVhZEpzb248VD4ocGF0aDogc3RyaW5nKTogVCB8IG51bGwge1xuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhwYXRoLCBcInV0ZjhcIikpIGFzIFQ7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlYWRGaWxlU2FmZShwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICB0cnkge1xuICAgIHJldHVybiByZWFkRmlsZVN5bmMocGF0aCwgXCJ1dGY4XCIpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gXCJcIjtcbiAgfVxufVxuXG5mdW5jdGlvbiB1bmVzY2FwZVhtbCh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHZhbHVlXG4gICAgLnJlcGxhY2UoLyZxdW90Oy9nLCBcIlxcXCJcIilcbiAgICAucmVwbGFjZSgvJmFwb3M7L2csIFwiJ1wiKVxuICAgIC5yZXBsYWNlKC8mbHQ7L2csIFwiPFwiKVxuICAgIC5yZXBsYWNlKC8mZ3Q7L2csIFwiPlwiKVxuICAgIC5yZXBsYWNlKC8mYW1wOy9nLCBcIiZcIik7XG59XG4iLCAiZXhwb3J0IHR5cGUgVHdlYWtTY29wZSA9IFwicmVuZGVyZXJcIiB8IFwibWFpblwiIHwgXCJib3RoXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVsb2FkVHdlYWtzRGVwcyB7XG4gIGxvZ0luZm8obWVzc2FnZTogc3RyaW5nKTogdm9pZDtcbiAgc3RvcEFsbE1haW5Ud2Vha3MoKTogdm9pZDtcbiAgY2xlYXJUd2Vha01vZHVsZUNhY2hlKCk6IHZvaWQ7XG4gIGxvYWRBbGxNYWluVHdlYWtzKCk6IHZvaWQ7XG4gIGJyb2FkY2FzdFJlbG9hZCgpOiB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNldFR3ZWFrRW5hYmxlZEFuZFJlbG9hZERlcHMgZXh0ZW5kcyBSZWxvYWRUd2Vha3NEZXBzIHtcbiAgc2V0VHdlYWtFbmFibGVkKGlkOiBzdHJpbmcsIGVuYWJsZWQ6IGJvb2xlYW4pOiB2b2lkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNNYWluUHJvY2Vzc1R3ZWFrU2NvcGUoc2NvcGU6IFR3ZWFrU2NvcGUgfCB1bmRlZmluZWQpOiBib29sZWFuIHtcbiAgcmV0dXJuIHNjb3BlICE9PSBcInJlbmRlcmVyXCI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWxvYWRUd2Vha3MocmVhc29uOiBzdHJpbmcsIGRlcHM6IFJlbG9hZFR3ZWFrc0RlcHMpOiB2b2lkIHtcbiAgZGVwcy5sb2dJbmZvKGByZWxvYWRpbmcgdHdlYWtzICgke3JlYXNvbn0pYCk7XG4gIGRlcHMuc3RvcEFsbE1haW5Ud2Vha3MoKTtcbiAgZGVwcy5jbGVhclR3ZWFrTW9kdWxlQ2FjaGUoKTtcbiAgZGVwcy5sb2FkQWxsTWFpblR3ZWFrcygpO1xuICBkZXBzLmJyb2FkY2FzdFJlbG9hZCgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0VHdlYWtFbmFibGVkQW5kUmVsb2FkKFxuICBpZDogc3RyaW5nLFxuICBlbmFibGVkOiB1bmtub3duLFxuICBkZXBzOiBTZXRUd2Vha0VuYWJsZWRBbmRSZWxvYWREZXBzLFxuKTogdHJ1ZSB7XG4gIGNvbnN0IG5vcm1hbGl6ZWRFbmFibGVkID0gISFlbmFibGVkO1xuICBkZXBzLnNldFR3ZWFrRW5hYmxlZChpZCwgbm9ybWFsaXplZEVuYWJsZWQpO1xuICBkZXBzLmxvZ0luZm8oYHR3ZWFrICR7aWR9IGVuYWJsZWQ9JHtub3JtYWxpemVkRW5hYmxlZH1gKTtcbiAgcmVsb2FkVHdlYWtzKFwiZW5hYmxlZC10b2dnbGVcIiwgZGVwcyk7XG4gIHJldHVybiB0cnVlO1xufVxuIiwgImltcG9ydCB7IGFwcGVuZEZpbGVTeW5jLCBleGlzdHNTeW5jLCByZWFkRmlsZVN5bmMsIHN0YXRTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcblxuZXhwb3J0IGNvbnN0IE1BWF9MT0dfQllURVMgPSAxMCAqIDEwMjQgKiAxMDI0O1xuXG5leHBvcnQgZnVuY3Rpb24gYXBwZW5kQ2FwcGVkTG9nKHBhdGg6IHN0cmluZywgbGluZTogc3RyaW5nLCBtYXhCeXRlcyA9IE1BWF9MT0dfQllURVMpOiB2b2lkIHtcbiAgY29uc3QgaW5jb21pbmcgPSBCdWZmZXIuZnJvbShsaW5lKTtcbiAgaWYgKGluY29taW5nLmJ5dGVMZW5ndGggPj0gbWF4Qnl0ZXMpIHtcbiAgICB3cml0ZUZpbGVTeW5jKHBhdGgsIGluY29taW5nLnN1YmFycmF5KGluY29taW5nLmJ5dGVMZW5ndGggLSBtYXhCeXRlcykpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRyeSB7XG4gICAgaWYgKGV4aXN0c1N5bmMocGF0aCkpIHtcbiAgICAgIGNvbnN0IHNpemUgPSBzdGF0U3luYyhwYXRoKS5zaXplO1xuICAgICAgY29uc3QgYWxsb3dlZEV4aXN0aW5nID0gbWF4Qnl0ZXMgLSBpbmNvbWluZy5ieXRlTGVuZ3RoO1xuICAgICAgaWYgKHNpemUgPiBhbGxvd2VkRXhpc3RpbmcpIHtcbiAgICAgICAgY29uc3QgZXhpc3RpbmcgPSByZWFkRmlsZVN5bmMocGF0aCk7XG4gICAgICAgIHdyaXRlRmlsZVN5bmMocGF0aCwgZXhpc3Rpbmcuc3ViYXJyYXkoTWF0aC5tYXgoMCwgZXhpc3RpbmcuYnl0ZUxlbmd0aCAtIGFsbG93ZWRFeGlzdGluZykpKTtcbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2gge1xuICAgIC8vIElmIHRyaW1taW5nIGZhaWxzLCBzdGlsbCB0cnkgdG8gYXBwZW5kIGJlbG93OyBsb2dnaW5nIG11c3QgYmUgYmVzdC1lZmZvcnQuXG4gIH1cblxuICBhcHBlbmRGaWxlU3luYyhwYXRoLCBpbmNvbWluZyk7XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBUd2Vha01hbmlmZXN0IH0gZnJvbSBcIkBjb2RleC1wbHVzcGx1cy9zZGtcIjtcblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfVFdFQUtfU1RPUkVfSU5ERVhfVVJMID1cbiAgXCJodHRwczovL2Itbm5ldHQuZ2l0aHViLmlvL2NvZGV4LXBsdXNwbHVzL3N0b3JlL2luZGV4Lmpzb25cIjtcbmV4cG9ydCBjb25zdCBUV0VBS19TVE9SRV9SRVZJRVdfSVNTVUVfVVJMID1cbiAgXCJodHRwczovL2dpdGh1Yi5jb20vYi1ubmV0dC9jb2RleC1wbHVzcGx1cy9pc3N1ZXMvbmV3XCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHdlYWtTdG9yZVJlZ2lzdHJ5IHtcbiAgc2NoZW1hVmVyc2lvbjogMTtcbiAgZ2VuZXJhdGVkQXQ/OiBzdHJpbmc7XG4gIGVudHJpZXM6IFR3ZWFrU3RvcmVFbnRyeVtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFR3ZWFrU3RvcmVFbnRyeSB7XG4gIGlkOiBzdHJpbmc7XG4gIG1hbmlmZXN0OiBUd2Vha01hbmlmZXN0O1xuICByZXBvOiBzdHJpbmc7XG4gIGFwcHJvdmVkQ29tbWl0U2hhOiBzdHJpbmc7XG4gIGFwcHJvdmVkQXQ6IHN0cmluZztcbiAgYXBwcm92ZWRCeTogc3RyaW5nO1xuICBwbGF0Zm9ybXM/OiBUd2Vha1N0b3JlUGxhdGZvcm1bXTtcbiAgcmVsZWFzZVVybD86IHN0cmluZztcbiAgcmV2aWV3VXJsPzogc3RyaW5nO1xufVxuXG5leHBvcnQgdHlwZSBUd2Vha1N0b3JlUGxhdGZvcm0gPSBcImRhcndpblwiIHwgXCJ3aW4zMlwiIHwgXCJsaW51eFwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFR3ZWFrU3RvcmVQdWJsaXNoU3VibWlzc2lvbiB7XG4gIHJlcG86IHN0cmluZztcbiAgZGVmYXVsdEJyYW5jaDogc3RyaW5nO1xuICBjb21taXRTaGE6IHN0cmluZztcbiAgY29tbWl0VXJsOiBzdHJpbmc7XG4gIG1hbmlmZXN0Pzoge1xuICAgIGlkPzogc3RyaW5nO1xuICAgIG5hbWU/OiBzdHJpbmc7XG4gICAgdmVyc2lvbj86IHN0cmluZztcbiAgICBkZXNjcmlwdGlvbj86IHN0cmluZztcbiAgICBpY29uVXJsPzogc3RyaW5nO1xuICB9O1xufVxuXG5jb25zdCBHSVRIVUJfUkVQT19SRSA9IC9eW0EtWmEtejAtOV8uLV0rXFwvW0EtWmEtejAtOV8uLV0rJC87XG5jb25zdCBGVUxMX1NIQV9SRSA9IC9eW2EtZjAtOV17NDB9JC9pO1xuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplR2l0SHViUmVwbyhpbnB1dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgcmF3ID0gaW5wdXQudHJpbSgpO1xuICBpZiAoIXJhdykgdGhyb3cgbmV3IEVycm9yKFwiR2l0SHViIHJlcG8gaXMgcmVxdWlyZWRcIik7XG5cbiAgY29uc3Qgc3NoID0gL15naXRAZ2l0aHViXFwuY29tOihbXi9dK1xcL1teL10rPykoPzpcXC5naXQpPyQvaS5leGVjKHJhdyk7XG4gIGlmIChzc2gpIHJldHVybiBub3JtYWxpemVSZXBvUGFydChzc2hbMV0pO1xuXG4gIGlmICgvXmh0dHBzPzpcXC9cXC8vaS50ZXN0KHJhdykpIHtcbiAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHJhdyk7XG4gICAgaWYgKHVybC5ob3N0bmFtZSAhPT0gXCJnaXRodWIuY29tXCIpIHRocm93IG5ldyBFcnJvcihcIk9ubHkgZ2l0aHViLmNvbSByZXBvc2l0b3JpZXMgYXJlIHN1cHBvcnRlZFwiKTtcbiAgICBjb25zdCBwYXJ0cyA9IHVybC5wYXRobmFtZS5yZXBsYWNlKC9eXFwvK3xcXC8rJC9nLCBcIlwiKS5zcGxpdChcIi9cIik7XG4gICAgaWYgKHBhcnRzLmxlbmd0aCA8IDIpIHRocm93IG5ldyBFcnJvcihcIkdpdEh1YiByZXBvIFVSTCBtdXN0IGluY2x1ZGUgb3duZXIgYW5kIHJlcG9zaXRvcnlcIik7XG4gICAgcmV0dXJuIG5vcm1hbGl6ZVJlcG9QYXJ0KGAke3BhcnRzWzBdfS8ke3BhcnRzWzFdfWApO1xuICB9XG5cbiAgcmV0dXJuIG5vcm1hbGl6ZVJlcG9QYXJ0KHJhdyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVTdG9yZVJlZ2lzdHJ5KGlucHV0OiB1bmtub3duKTogVHdlYWtTdG9yZVJlZ2lzdHJ5IHtcbiAgY29uc3QgcmVnaXN0cnkgPSBpbnB1dCBhcyBQYXJ0aWFsPFR3ZWFrU3RvcmVSZWdpc3RyeT4gfCBudWxsO1xuICBpZiAoIXJlZ2lzdHJ5IHx8IHJlZ2lzdHJ5LnNjaGVtYVZlcnNpb24gIT09IDEgfHwgIUFycmF5LmlzQXJyYXkocmVnaXN0cnkuZW50cmllcykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbnN1cHBvcnRlZCB0d2VhayBzdG9yZSByZWdpc3RyeVwiKTtcbiAgfVxuICBjb25zdCBlbnRyaWVzID0gcmVnaXN0cnkuZW50cmllcy5tYXAobm9ybWFsaXplU3RvcmVFbnRyeSk7XG4gIGVudHJpZXMuc29ydCgoYSwgYikgPT4gYS5tYW5pZmVzdC5uYW1lLmxvY2FsZUNvbXBhcmUoYi5tYW5pZmVzdC5uYW1lKSk7XG4gIHJldHVybiB7XG4gICAgc2NoZW1hVmVyc2lvbjogMSxcbiAgICBnZW5lcmF0ZWRBdDogdHlwZW9mIHJlZ2lzdHJ5LmdlbmVyYXRlZEF0ID09PSBcInN0cmluZ1wiID8gcmVnaXN0cnkuZ2VuZXJhdGVkQXQgOiB1bmRlZmluZWQsXG4gICAgZW50cmllcyxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNodWZmbGVTdG9yZUVudHJpZXM8VD4oXG4gIGVudHJpZXM6IHJlYWRvbmx5IFRbXSxcbiAgcmFuZG9tSW5kZXg6IChleGNsdXNpdmVNYXg6IG51bWJlcikgPT4gbnVtYmVyID0gKGV4Y2x1c2l2ZU1heCkgPT4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogZXhjbHVzaXZlTWF4KSxcbik6IFRbXSB7XG4gIGNvbnN0IHNodWZmbGVkID0gWy4uLmVudHJpZXNdO1xuICBmb3IgKGxldCBpID0gc2h1ZmZsZWQubGVuZ3RoIC0gMTsgaSA+IDA7IGkgLT0gMSkge1xuICAgIGNvbnN0IGogPSByYW5kb21JbmRleChpICsgMSk7XG4gICAgaWYgKCFOdW1iZXIuaXNJbnRlZ2VyKGopIHx8IGogPCAwIHx8IGogPiBpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYHNodWZmbGUgcmFuZG9tSW5kZXggcmV0dXJuZWQgJHtqfTsgZXhwZWN0ZWQgYW4gaW50ZWdlciBmcm9tIDAgdG8gJHtpfWApO1xuICAgIH1cbiAgICBbc2h1ZmZsZWRbaV0sIHNodWZmbGVkW2pdXSA9IFtzaHVmZmxlZFtqXSwgc2h1ZmZsZWRbaV1dO1xuICB9XG4gIHJldHVybiBzaHVmZmxlZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVN0b3JlRW50cnkoaW5wdXQ6IHVua25vd24pOiBUd2Vha1N0b3JlRW50cnkge1xuICBjb25zdCBlbnRyeSA9IGlucHV0IGFzIFBhcnRpYWw8VHdlYWtTdG9yZUVudHJ5PiB8IG51bGw7XG4gIGlmICghZW50cnkgfHwgdHlwZW9mIGVudHJ5ICE9PSBcIm9iamVjdFwiKSB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHR3ZWFrIHN0b3JlIGVudHJ5XCIpO1xuICBjb25zdCByZXBvID0gbm9ybWFsaXplR2l0SHViUmVwbyhTdHJpbmcoZW50cnkucmVwbyA/PyBlbnRyeS5tYW5pZmVzdD8uZ2l0aHViUmVwbyA/PyBcIlwiKSk7XG4gIGNvbnN0IG1hbmlmZXN0ID0gZW50cnkubWFuaWZlc3QgYXMgVHdlYWtNYW5pZmVzdCB8IHVuZGVmaW5lZDtcbiAgaWYgKCFtYW5pZmVzdD8uaWQgfHwgIW1hbmlmZXN0Lm5hbWUgfHwgIW1hbmlmZXN0LnZlcnNpb24pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFN0b3JlIGVudHJ5IGZvciAke3JlcG99IGlzIG1pc3NpbmcgbWFuaWZlc3QgZmllbGRzYCk7XG4gIH1cbiAgaWYgKG5vcm1hbGl6ZUdpdEh1YlJlcG8obWFuaWZlc3QuZ2l0aHViUmVwbykgIT09IHJlcG8pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFN0b3JlIGVudHJ5ICR7bWFuaWZlc3QuaWR9IHJlcG8gZG9lcyBub3QgbWF0Y2ggbWFuaWZlc3QgZ2l0aHViUmVwb2ApO1xuICB9XG4gIGlmICghaXNGdWxsQ29tbWl0U2hhKFN0cmluZyhlbnRyeS5hcHByb3ZlZENvbW1pdFNoYSA/PyBcIlwiKSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFN0b3JlIGVudHJ5ICR7bWFuaWZlc3QuaWR9IG11c3QgcGluIGEgZnVsbCBhcHByb3ZlZCBjb21taXQgU0hBYCk7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBpZDogbWFuaWZlc3QuaWQsXG4gICAgbWFuaWZlc3QsXG4gICAgcmVwbyxcbiAgICBhcHByb3ZlZENvbW1pdFNoYTogU3RyaW5nKGVudHJ5LmFwcHJvdmVkQ29tbWl0U2hhKSxcbiAgICBhcHByb3ZlZEF0OiB0eXBlb2YgZW50cnkuYXBwcm92ZWRBdCA9PT0gXCJzdHJpbmdcIiA/IGVudHJ5LmFwcHJvdmVkQXQgOiBcIlwiLFxuICAgIGFwcHJvdmVkQnk6IHR5cGVvZiBlbnRyeS5hcHByb3ZlZEJ5ID09PSBcInN0cmluZ1wiID8gZW50cnkuYXBwcm92ZWRCeSA6IFwiXCIsXG4gICAgcGxhdGZvcm1zOiBub3JtYWxpemVTdG9yZVBsYXRmb3JtcygoZW50cnkgYXMgeyBwbGF0Zm9ybXM/OiB1bmtub3duIH0pLnBsYXRmb3JtcyksXG4gICAgcmVsZWFzZVVybDogb3B0aW9uYWxHaXRodWJVcmwoZW50cnkucmVsZWFzZVVybCksXG4gICAgcmV2aWV3VXJsOiBvcHRpb25hbEdpdGh1YlVybChlbnRyeS5yZXZpZXdVcmwpLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RvcmVBcmNoaXZlVXJsKGVudHJ5OiBUd2Vha1N0b3JlRW50cnkpOiBzdHJpbmcge1xuICBpZiAoIWlzRnVsbENvbW1pdFNoYShlbnRyeS5hcHByb3ZlZENvbW1pdFNoYSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFN0b3JlIGVudHJ5ICR7ZW50cnkuaWR9IGlzIG5vdCBwaW5uZWQgdG8gYSBmdWxsIGNvbW1pdCBTSEFgKTtcbiAgfVxuICByZXR1cm4gYGh0dHBzOi8vY29kZWxvYWQuZ2l0aHViLmNvbS8ke2VudHJ5LnJlcG99L3Rhci5nei8ke2VudHJ5LmFwcHJvdmVkQ29tbWl0U2hhfWA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFR3ZWFrUHVibGlzaElzc3VlVXJsKHN1Ym1pc3Npb246IFR3ZWFrU3RvcmVQdWJsaXNoU3VibWlzc2lvbik6IHN0cmluZyB7XG4gIGNvbnN0IHJlcG8gPSBub3JtYWxpemVHaXRIdWJSZXBvKHN1Ym1pc3Npb24ucmVwbyk7XG4gIGlmICghaXNGdWxsQ29tbWl0U2hhKHN1Ym1pc3Npb24uY29tbWl0U2hhKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIlN1Ym1pc3Npb24gbXVzdCBpbmNsdWRlIHRoZSBmdWxsIGNvbW1pdCBTSEEgdG8gcmV2aWV3XCIpO1xuICB9XG4gIGNvbnN0IHRpdGxlID0gYFR3ZWFrIHN0b3JlIHJldmlldzogJHtyZXBvfWA7XG4gIGNvbnN0IGJvZHkgPSBbXG4gICAgXCIjIyBUd2VhayByZXBvXCIsXG4gICAgYGh0dHBzOi8vZ2l0aHViLmNvbS8ke3JlcG99YCxcbiAgICBcIlwiLFxuICAgIFwiIyMgQ29tbWl0IHRvIHJldmlld1wiLFxuICAgIHN1Ym1pc3Npb24uY29tbWl0U2hhLFxuICAgIHN1Ym1pc3Npb24uY29tbWl0VXJsLFxuICAgIFwiXCIsXG4gICAgXCJEbyBub3QgYXBwcm92ZSBhIGRpZmZlcmVudCBjb21taXQuIElmIHRoZSBhdXRob3IgcHVzaGVzIGNoYW5nZXMsIGFzayB0aGVtIHRvIHJlc3VibWl0LlwiLFxuICAgIFwiXCIsXG4gICAgXCIjIyBNYW5pZmVzdFwiLFxuICAgIGAtIGlkOiAke3N1Ym1pc3Npb24ubWFuaWZlc3Q/LmlkID8/IFwiKG5vdCBkZXRlY3RlZClcIn1gLFxuICAgIGAtIG5hbWU6ICR7c3VibWlzc2lvbi5tYW5pZmVzdD8ubmFtZSA/PyBcIihub3QgZGV0ZWN0ZWQpXCJ9YCxcbiAgICBgLSB2ZXJzaW9uOiAke3N1Ym1pc3Npb24ubWFuaWZlc3Q/LnZlcnNpb24gPz8gXCIobm90IGRldGVjdGVkKVwifWAsXG4gICAgYC0gZGVzY3JpcHRpb246ICR7c3VibWlzc2lvbi5tYW5pZmVzdD8uZGVzY3JpcHRpb24gPz8gXCIobm90IGRldGVjdGVkKVwifWAsXG4gICAgYC0gaWNvblVybDogJHtzdWJtaXNzaW9uLm1hbmlmZXN0Py5pY29uVXJsID8/IFwiKG5vdCBkZXRlY3RlZClcIn1gLFxuICAgIFwiXCIsXG4gICAgXCIjIyBBZG1pbiBjaGVja2xpc3RcIixcbiAgICBcIi0gWyBdIG1hbmlmZXN0Lmpzb24gaXMgdmFsaWRcIixcbiAgICBcIi0gWyBdIG1hbmlmZXN0Lmljb25VcmwgaXMgdXNhYmxlIGFzIHRoZSBzdG9yZSBpY29uXCIsXG4gICAgXCItIFsgXSBzb3VyY2Ugd2FzIHJldmlld2VkIGF0IHRoZSBleGFjdCBjb21taXQgYWJvdmVcIixcbiAgICBcIi0gWyBdIGBzdG9yZS9pbmRleC5qc29uYCBlbnRyeSBwaW5zIGBhcHByb3ZlZENvbW1pdFNoYWAgdG8gdGhlIGV4YWN0IGNvbW1pdCBhYm92ZVwiLFxuICBdLmpvaW4oXCJcXG5cIik7XG4gIGNvbnN0IHVybCA9IG5ldyBVUkwoVFdFQUtfU1RPUkVfUkVWSUVXX0lTU1VFX1VSTCk7XG4gIHVybC5zZWFyY2hQYXJhbXMuc2V0KFwidGVtcGxhdGVcIiwgXCJ0d2Vhay1zdG9yZS1yZXZpZXcubWRcIik7XG4gIHVybC5zZWFyY2hQYXJhbXMuc2V0KFwidGl0bGVcIiwgdGl0bGUpO1xuICB1cmwuc2VhcmNoUGFyYW1zLnNldChcImJvZHlcIiwgYm9keSk7XG4gIHJldHVybiB1cmwudG9TdHJpbmcoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRnVsbENvbW1pdFNoYSh2YWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBGVUxMX1NIQV9SRS50ZXN0KHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplUmVwb1BhcnQodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHJlcG8gPSB2YWx1ZS50cmltKCkucmVwbGFjZSgvXFwuZ2l0JC9pLCBcIlwiKS5yZXBsYWNlKC9eXFwvK3xcXC8rJC9nLCBcIlwiKTtcbiAgaWYgKCFHSVRIVUJfUkVQT19SRS50ZXN0KHJlcG8pKSB0aHJvdyBuZXcgRXJyb3IoXCJHaXRIdWIgcmVwbyBtdXN0IGJlIGluIG93bmVyL3JlcG8gZm9ybVwiKTtcbiAgcmV0dXJuIHJlcG87XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVN0b3JlUGxhdGZvcm1zKGlucHV0OiB1bmtub3duKTogVHdlYWtTdG9yZVBsYXRmb3JtW10gfCB1bmRlZmluZWQge1xuICBpZiAoaW5wdXQgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgaWYgKCFBcnJheS5pc0FycmF5KGlucHV0KSkgdGhyb3cgbmV3IEVycm9yKFwiU3RvcmUgZW50cnkgcGxhdGZvcm1zIG11c3QgYmUgYW4gYXJyYXlcIik7XG4gIGNvbnN0IGFsbG93ZWQgPSBuZXcgU2V0PFR3ZWFrU3RvcmVQbGF0Zm9ybT4oW1wiZGFyd2luXCIsIFwid2luMzJcIiwgXCJsaW51eFwiXSk7XG4gIGNvbnN0IHBsYXRmb3JtcyA9IEFycmF5LmZyb20obmV3IFNldChpbnB1dC5tYXAoKHZhbHVlKSA9PiB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIiB8fCAhYWxsb3dlZC5oYXModmFsdWUgYXMgVHdlYWtTdG9yZVBsYXRmb3JtKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBzdG9yZSBwbGF0Zm9ybTogJHtTdHJpbmcodmFsdWUpfWApO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWUgYXMgVHdlYWtTdG9yZVBsYXRmb3JtO1xuICB9KSkpO1xuICByZXR1cm4gcGxhdGZvcm1zLmxlbmd0aCA+IDAgPyBwbGF0Zm9ybXMgOiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIG9wdGlvbmFsR2l0aHViVXJsKHZhbHVlOiB1bmtub3duKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIiB8fCAhdmFsdWUudHJpbSgpKSByZXR1cm4gdW5kZWZpbmVkO1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKHZhbHVlKTtcbiAgaWYgKHVybC5wcm90b2NvbCAhPT0gXCJodHRwczpcIiB8fCB1cmwuaG9zdG5hbWUgIT09IFwiZ2l0aHViLmNvbVwiKSByZXR1cm4gdW5kZWZpbmVkO1xuICByZXR1cm4gdXJsLnRvU3RyaW5nKCk7XG59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LEVBQ3BFO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFNO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFXO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQzFFO0FBQUEsRUFBTTtBQUFBLEVBQU07QUFBQSxFQUFPO0FBQUEsRUFBVztBQUFBLEVBQU07QUFBQSxFQUNwQztBQUFBLEVBQVE7QUFBQSxFQUFRO0FBQUEsRUFBUTtBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDNUQ7QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDbkQ7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFNO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUMxQztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQ3JGO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFTO0FBQUEsRUFDeEI7QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQ3RDO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFXO0FBQUEsRUFDekI7QUFBQSxFQUFLO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQ3REO0FBQUEsRUFBUztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUMvRTtBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFDZjtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDakY7QUFBQSxFQUNBO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBYTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUNwRjtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFVO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDbkY7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUNyQjtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDaEY7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUMxQztBQUFBLEVBQU87QUFBQSxFQUNQO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBUTtBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU07QUFBQSxFQUNoRjtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQVM7QUFBQSxFQUFPO0FBQUEsRUFDdEM7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFB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IiwgImltcG9ydF9ub2RlX2NoaWxkX3Byb2Nlc3MiLCAiaW1wb3J0X25vZGVfcGF0aCIsICJpbXBvcnRfbm9kZV9vcyIsICJpbXBvcnRfZnMiLCAiaW1wb3J0X3Byb21pc2VzIiwgInN5c1BhdGgiLCAicHJlc29sdmUiLCAiYmFzZW5hbWUiLCAicGpvaW4iLCAicHJlbGF0aXZlIiwgInBzZXAiLCAiaW1wb3J0X3Byb21pc2VzIiwgIm9zVHlwZSIsICJmc193YXRjaCIsICJyYXdFbWl0dGVyIiwgImxpc3RlbmVyIiwgImJhc2VuYW1lIiwgImRpcm5hbWUiLCAibmV3U3RhdHMiLCAiY2xvc2VyIiwgImZzcmVhbHBhdGgiLCAicmVzb2x2ZSIsICJyZWFscGF0aCIsICJzdGF0cyIsICJyZWxhdGl2ZSIsICJET1VCTEVfU0xBU0hfUkUiLCAidGVzdFN0cmluZyIsICJwYXRoIiwgInN0YXRzIiwgInN0YXRjYiIsICJub3ciLCAic3RhdCIsICJpbXBvcnRfbm9kZV9wYXRoIiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX3BhdGgiLCAiaW1wb3J0X25vZGVfZnMiLCAiaW1wb3J0X25vZGVfcGF0aCIsICJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9wYXRoIiwgInVzZXJSb290IiwgImltcG9ydF9ub2RlX2ZzIiwgImV4cG9ydHMiLCAicGxhdGZvcm0iLCAic3RhdCJdCn0K
