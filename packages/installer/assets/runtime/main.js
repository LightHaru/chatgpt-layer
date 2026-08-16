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

// packages/runtime/src/main.ts
var import_electron6 = require("electron");
var import_node_fs20 = require("node:fs");
var import_node_path17 = require("node:path");

// node_modules/chokidar/esm/index.js
var import_fs2 = require("fs");
var import_promises3 = require("fs/promises");
var import_events = require("events");
var sysPath2 = __toESM(require("path"), 1);

// node_modules/readdirp/esm/index.js
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
    const basename4 = this._isDirent ? dirent.name : dirent;
    try {
      const fullPath = (0, import_node_path.resolve)((0, import_node_path.join)(path, basename4));
      entry = { path: (0, import_node_path.relative)(this._root, fullPath), fullPath, basename: basename4 };
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

// node_modules/chokidar/esm/handler.js
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
    const basename4 = sysPath.basename(path);
    const parent = this.fsw._getWatchedDir(directory);
    parent.add(basename4);
    const absolutePath = sysPath.resolve(path);
    const options = {
      persistent: opts.persistent
    };
    if (!listener)
      listener = EMPTY_FN;
    let closer;
    if (opts.usePolling) {
      const enableBin = opts.interval !== opts.binaryInterval;
      options.interval = enableBin && isBinaryPath(basename4) ? opts.binaryInterval : opts.interval;
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
    const dirname8 = sysPath.dirname(file);
    const basename4 = sysPath.basename(file);
    const parent = this.fsw._getWatchedDir(dirname8);
    let prevStats = stats;
    if (parent.has(basename4))
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
          this.fsw._remove(dirname8, basename4);
        }
      } else if (parent.has(basename4)) {
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
    return new Promise((resolve10, reject) => {
      if (!stream)
        return reject();
      stream.once(STR_END, () => {
        if (this.fsw.closed) {
          stream = void 0;
          return;
        }
        const wasThrottled = throttler ? throttler.clear() : false;
        resolve10(void 0);
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

// node_modules/chokidar/esm/index.js
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
        const relative6 = sysPath2.relative(matcher.path, string);
        if (!relative6) {
          return false;
        }
        return !relative6.startsWith("..") && !sysPath2.isAbsolute(relative6);
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

// packages/runtime/src/logging.ts
var import_node_fs = require("node:fs");
var MAX_LOG_BYTES = 10 * 1024 * 1024;
function appendCappedLog(path, line, maxBytes = MAX_LOG_BYTES) {
  const incoming = Buffer.from(line);
  if (incoming.byteLength >= maxBytes) {
    (0, import_node_fs.writeFileSync)(path, incoming.subarray(incoming.byteLength - maxBytes));
    return;
  }
  try {
    if ((0, import_node_fs.existsSync)(path)) {
      const size = (0, import_node_fs.statSync)(path).size;
      const allowedExisting = maxBytes - incoming.byteLength;
      if (size > allowedExisting) {
        const existing = (0, import_node_fs.readFileSync)(path);
        (0, import_node_fs.writeFileSync)(path, existing.subarray(Math.max(0, existing.byteLength - allowedExisting)));
      }
    }
  } catch {
  }
  (0, import_node_fs.appendFileSync)(path, incoming);
}

// packages/runtime/src/codex-runtime-probe.ts
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");
function probeRuntimeCompatibility(opts) {
  const env = { ...createDefaultProbeEnv(opts), ...opts.env };
  const getWindowServices = env.getWindowServices ?? opts.getWindowServices;
  const runtimeType = detectRuntimeType(env);
  const appVersion = opts.codexVersion ?? safeCall(() => env.app?.getVersion?.()) ?? null;
  const appPath = safeAppPath(env);
  const buildFlavor = safeBuildFlavor(env, appPath);
  const session2 = defaultSessionFrom(env);
  const preloadStrategy = selectPreloadRegistration(session2);
  const windows = inspectWindowServices(safeCall(getWindowServices) ?? null);
  const windowSample = env.inspectExistingWindow?.() ?? null;
  const viewSample = env.inspectBrowserView?.() ?? viewSampleFromConstructor(env.browserView);
  const attach = inspectViewAttachTargets(windowSampleToParent(windowSample), viewSampleToView(viewSample));
  const browserViewCtor = env.browserView != null || Boolean(viewSample?.present);
  const browserView = attach.addBrowserView || browserViewCtor;
  const webContentsViewObserved = Boolean(viewSample?.webContentsView) || attach.webContentsView;
  const webContentsViewSetBounds = attach.webContentsViewSetBounds || isFn(asRecord(viewSample?.webContentsView)?.setBounds);
  const webContentsView = webContentsViewObserved && webContentsViewSetBounds;
  const privateViewTree = attach.addChildView && attach.removeChildView && webContentsView;
  const electronCompatible = runtimeType === "electron" || runtimeType === "owl" || session2 != null || env.browserWindow != null || env.browserView != null || env.app != null;
  const owl = runtimeType === "owl";
  const preload = {
    registerPreloadScript: preloadStrategy === "registerPreloadScript",
    setPreloadsFallback: isFn(asRecord(session2)?.setPreloads)
  };
  const snapshotWindows = {
    windowServices: windows.present,
    createWindow: windows.canCreate,
    getPrimaryWindow: windows.getPrimaryWindow || windows.getPrimaryWindowFromManager,
    registerWindow: windows.registerWindow
  };
  const snapshotViews = {
    browserView,
    contentView: attach.contentView,
    webContentsView,
    privateViewTree
  };
  const shell2 = { owl, electronCompatible };
  return {
    runtimeType,
    appVersion,
    buildFlavor,
    preload,
    windows: snapshotWindows,
    views: snapshotViews,
    shell: shell2,
    support: supportFrom(runtimeType, electronCompatible, preload, snapshotWindows, snapshotViews)
  };
}
function getRuntimeInfo(opts) {
  const snapshot = probeRuntimeCompatibility(opts);
  const env = { ...createDefaultProbeEnv(opts), ...opts.env };
  return {
    type: snapshot.runtimeType,
    codexVersion: snapshot.appVersion,
    channel: opts.channel,
    buildFlavor: snapshot.buildFlavor,
    usesOwlAppShell: null,
    appPath: safeAppPath(env),
    resourcesPath: env.resourcesPath ?? null
  };
}
function getRuntimeCapabilities(opts) {
  const snapshot = probeRuntimeCompatibility(opts);
  const native = opts.getNativeCapabilities?.() ?? defaultNativeCapabilities(opts.env?.platform ?? process.platform);
  const env = { ...createDefaultProbeEnv(opts), ...opts.env };
  const canFocus = isFn(asRecord(env.browserWindow)?.fromId) || snapshot.shell.electronCompatible;
  return capabilitiesFromSnapshot(snapshot, native, canFocus);
}
function capabilitiesFromSnapshot(snapshot, native, canFocus = true) {
  const cdp = getCdpStatus();
  return {
    windows: {
      create: snapshot.windows.createWindow,
      focus: canFocus,
      primary: snapshot.windows.getPrimaryWindow,
      browserView: snapshot.windows.registerWindow
    },
    views: viewsCapabilitiesFromSnapshot(snapshot),
    cdp: {
      supported: true,
      enabled: cdp.enabled,
      port: cdp.port
    },
    native
  };
}
function viewsCapabilitiesFromSnapshot(snapshot) {
  const privateAttach = snapshot.views.privateViewTree;
  return {
    create: privateAttach || snapshot.views.browserView,
    privateViewTree: privateAttach,
    webContentsView: snapshot.views.webContentsView,
    browserViewFallback: snapshot.views.browserView
  };
}
function getCdpStatus() {
  const enabled = process.env.CODEXPP_REMOTE_DEBUG === "1";
  const port = parseCdpPort(process.env.CODEXPP_REMOTE_DEBUG_PORT);
  return {
    supported: true,
    enabled,
    port: enabled ? port : null,
    url: enabled ? `http://127.0.0.1:${port}` : null
  };
}
async function listCdpTargets() {
  const status = getCdpStatus();
  if (!status.enabled || !status.url) return [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1e3);
  try {
    const res = await fetch(`${status.url}/json`, { signal: controller.signal });
    if (!res.ok) return [];
    const rows = await res.json();
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => normalizeCdpTarget(row)).filter((row) => row !== null);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
function selectPreloadRegistration(sessionLike) {
  const session2 = asRecord(sessionLike);
  if (isFn(session2?.registerPreloadScript)) return "registerPreloadScript";
  if (isFn(session2?.setPreloads)) return "setPreloads";
  return "unavailable";
}
function inspectWindowServices(services) {
  const rec = asRecord(services);
  const windowManager = asRecord(rec?.windowManager);
  const createWindow = isFn(windowManager?.createWindow);
  const createFreshWindow = isFn(rec?.createFreshWindow);
  const createFreshLocalWindow = isFn(rec?.createFreshLocalWindow);
  const ensureHostWindow = isFn(rec?.ensureHostWindow);
  const getPrimaryWindow = isFn(rec?.getPrimaryWindow);
  const getPrimaryWindowFromManager = isFn(windowManager?.getPrimaryWindow);
  const registerWindow = isFn(windowManager?.registerWindow);
  return {
    present: rec !== null,
    createWindow,
    createFreshWindow,
    createFreshLocalWindow,
    ensureHostWindow,
    getPrimaryWindow,
    getPrimaryWindowFromManager,
    registerWindow,
    canCreate: createWindow || createFreshWindow || createFreshLocalWindow || ensureHostWindow
  };
}
function inspectViewAttachTargets(parent, view) {
  const parentRecord = asRecord(parent);
  const contentView = asRecord(parentRecord?.contentView);
  const viewRecord = asRecord(view);
  const webContentsView = asRecord(viewRecord?.webContentsView);
  const webContentsViewPresent = Boolean(viewRecord && viewRecord.webContentsView);
  return {
    addBrowserView: isFn(parentRecord?.addBrowserView),
    contentView: contentView !== null,
    addChildView: isFn(contentView?.addChildView),
    removeChildView: isFn(contentView?.removeChildView),
    webContentsView: webContentsViewPresent,
    webContentsViewSetBounds: isFn(webContentsView?.setBounds) || isFn(viewRecord?.setBounds)
  };
}
function windowSampleFrom(win) {
  const rec = asRecord(win);
  if (!rec) return null;
  const contentView = asRecord(rec.contentView);
  return {
    addBrowserView: rec.addBrowserView,
    fromId: rec.fromId,
    contentView: rec.contentView,
    addChildView: contentView?.addChildView,
    removeChildView: contentView?.removeChildView
  };
}
function viewSampleFromConstructor(browserView) {
  if (browserView == null) return null;
  const ctor = asRecord(browserView);
  const proto = asRecord(ctor?.prototype) ?? (typeof browserView === "object" ? asRecord(Object.getPrototypeOf(browserView)) : null);
  const webContentsView = proto?.webContentsView ?? ctor?.webContentsView;
  return {
    present: typeof browserView === "function" || proto !== null,
    webContentsView,
    setBounds: asRecord(webContentsView)?.setBounds ?? proto?.setBounds
  };
}
function createDefaultProbeEnv(opts) {
  const electron = tryRequireElectron();
  const BrowserWindow5 = electron?.BrowserWindow;
  const BrowserView4 = electron?.BrowserView;
  return {
    platform: process.platform,
    execPath: process.execPath,
    resourcesPath: process.resourcesPath ?? null,
    existsSync: import_node_fs2.existsSync,
    processEnv: process.env,
    app: electron?.app ?? null,
    session: electron?.session ?? null,
    browserWindow: BrowserWindow5 ?? null,
    browserView: BrowserView4 ?? null,
    getWindowServices: opts?.getWindowServices,
    inspectExistingWindow: () => {
      try {
        const focused = BrowserWindow5?.getFocusedWindow?.();
        if (focused) return windowSampleFrom(focused);
        const windows = BrowserWindow5?.getAllWindows?.() ?? [];
        const live = windows.find((win) => {
          const isDestroyed = asRecord(win)?.isDestroyed;
          return typeof isDestroyed !== "function" || !isDestroyed.call(win);
        });
        return windowSampleFrom(live ?? null);
      } catch {
        return null;
      }
    },
    inspectBrowserView: () => {
      try {
        const fromCtor = viewSampleFromConstructor(BrowserView4);
        if (fromCtor?.webContentsView) return fromCtor;
        const windows = BrowserWindow5?.getAllWindows?.() ?? [];
        for (const win of windows) {
          const views = asRecord(win)?.getBrowserViews;
          if (typeof views !== "function") continue;
          const listed = views.call(win);
          if (!Array.isArray(listed)) continue;
          for (const view of listed) {
            const sample = viewSampleFromInstance(view);
            if (sample?.webContentsView) return sample;
          }
        }
        return fromCtor;
      } catch {
        return viewSampleFromConstructor(BrowserView4);
      }
    }
  };
}
function supportFrom(runtimeType, electronCompatible, preload, windows, views) {
  const reasons = [];
  const hasUsefulCapability = windows.windowServices || windows.createWindow || preload.registerPreloadScript || preload.setPreloadsFallback || views.browserView || views.privateViewTree || electronCompatible;
  if (runtimeType === "unknown" && !hasUsefulCapability) {
    return { level: "unknown", reasons: ["runtime type and capabilities could not be determined"] };
  }
  if (runtimeType === "unknown" && hasUsefulCapability) {
    reasons.push("runtime type could not be determined");
  }
  if (!windows.windowServices) reasons.push("window services unavailable");
  if (!windows.createWindow) reasons.push("createWindow unavailable");
  if (!preload.registerPreloadScript && preload.setPreloadsFallback) {
    reasons.push("registerPreloadScript missing; using setPreloads fallback");
  } else if (!preload.registerPreloadScript && !preload.setPreloadsFallback) {
    reasons.push("no session preload registration API");
  }
  if (!views.privateViewTree && views.browserView) {
    reasons.push("private contentView unavailable; using BrowserView fallback");
  } else if (!views.privateViewTree && !views.browserView) {
    reasons.push("no view attachment surface");
  }
  const usingFallback = !preload.registerPreloadScript && preload.setPreloadsFallback || !views.privateViewTree && views.browserView || runtimeType === "electron" || !windows.windowServices || !windows.createWindow;
  if (runtimeType === "unknown") {
    return { level: "unknown", reasons };
  }
  if (usingFallback) {
    return { level: "degraded", reasons };
  }
  return { level: "supported", reasons: [] };
}
function detectRuntimeType(env) {
  const platform2 = env.platform ?? process.platform;
  const exists = env.existsSync ?? import_node_fs2.existsSync;
  const resourcesPath = env.resourcesPath ?? null;
  if (platform2 === "darwin") {
    const appRoot = inferMacAppRoot(env.execPath ?? process.execPath);
    if (appRoot && exists((0, import_node_path2.join)(appRoot, "Contents", "Frameworks", "Codex Framework.framework"))) {
      return "owl";
    }
    if (appRoot && exists((0, import_node_path2.join)(appRoot, "Contents", "Frameworks", "Electron Framework.framework"))) {
      return "electron";
    }
    if (resourcesPath && exists((0, import_node_path2.join)(resourcesPath, "app.asar"))) {
      return "electron";
    }
    return "unknown";
  }
  return resourcesPath && exists((0, import_node_path2.join)(resourcesPath, "app.asar")) ? "electron" : "unknown";
}
function inferMacAppRoot(execPath) {
  const marker = ".app/Contents/MacOS/";
  const idx = execPath.indexOf(marker);
  return idx >= 0 ? execPath.slice(0, idx + ".app".length) : null;
}
function safeAppPath(env) {
  const fromApp = safeCall(() => env.app?.getAppPath?.());
  if (fromApp) return fromApp;
  return env.resourcesPath ? (0, import_node_path2.join)(env.resourcesPath, "app.asar") : null;
}
function safeBuildFlavor(env, appPath) {
  if (!appPath) return null;
  const parent = (0, import_node_path2.dirname)(appPath);
  if (parent.includes("Nightly")) return "nightly";
  if (typeof env.app?.isPackaged === "boolean") return env.app.isPackaged ? "prod" : "dev";
  return null;
}
function defaultSessionFrom(env) {
  const session2 = env.session;
  if (!session2) return null;
  if ("defaultSession" in session2) return asRecord(session2.defaultSession);
  return asRecord(session2);
}
function windowSampleToParent(sample) {
  if (!sample) return null;
  return {
    addBrowserView: sample.addBrowserView,
    contentView: sample.contentView ?? (sample.addChildView || sample.removeChildView ? { addChildView: sample.addChildView, removeChildView: sample.removeChildView } : void 0)
  };
}
function viewSampleToView(sample) {
  if (!sample) return null;
  return {
    webContentsView: sample.webContentsView ?? (sample.setBounds ? { setBounds: sample.setBounds } : void 0),
    setBounds: sample.setBounds
  };
}
function viewSampleFromInstance(view) {
  const rec = asRecord(view);
  if (!rec) return null;
  return {
    present: true,
    webContentsView: rec.webContentsView,
    setBounds: asRecord(rec.webContentsView)?.setBounds ?? rec.setBounds
  };
}
function defaultNativeCapabilities(platform2) {
  return {
    inProcessModules: true,
    swiftModules: platform2 === "darwin",
    appKitEmbedding: false,
    childWindowOverlay: false,
    directViewAttach: false,
    metalViews: false,
    nativeHost: false,
    helpers: true
  };
}
function parseCdpPort(value) {
  const parsed = Number(value ?? "9222");
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : 9222;
}
function normalizeCdpTarget(row) {
  const value = asRecord(row);
  if (!value || typeof value.id !== "string" || typeof value.type !== "string" || typeof value.url !== "string") {
    return null;
  }
  return {
    id: value.id,
    type: value.type,
    url: value.url,
    ...typeof value.title === "string" ? { title: value.title } : {},
    ...typeof value.webSocketDebuggerUrl === "string" ? { webSocketDebuggerUrl: value.webSocketDebuggerUrl } : {}
  };
}
function tryRequireElectron() {
  try {
    return require("electron");
  } catch {
    return null;
  }
}
function safeCall(fn) {
  try {
    const value = fn();
    return value === void 0 ? null : value;
  } catch {
    return null;
  }
}
function isFn(value) {
  return typeof value === "function";
}
function asRecord(value) {
  return value && typeof value === "object" ? value : null;
}

// packages/runtime/src/watcher-health.ts
var import_node_child_process = require("node:child_process");
var import_node_fs3 = require("node:fs");
var import_node_os = require("node:os");
var import_node_path3 = require("node:path");

// packages/runtime/src/ipc-guard.ts
function classifyIpcSender(sender, untrustedIds = /* @__PURE__ */ new Set()) {
  if (sender.isDestroyed?.()) return "guest";
  if (untrustedIds.has(sender.id)) return "guest";
  const type = sender.getType?.() ?? "window";
  if (type === "webview" || type === "offscreen") return "guest";
  if (type === "window" || type === "browserView") return "privileged";
  return "guest";
}
function isPrivilegedIpcSender(sender, untrustedIds = /* @__PURE__ */ new Set()) {
  return classifyIpcSender(sender, untrustedIds) === "privileged";
}
function assertPrivilegedIpcSender(channel, sender, untrustedIds = /* @__PURE__ */ new Set()) {
  if (!isPrivilegedIpcSender(sender, untrustedIds)) {
    throw new Error(`blocked ${channel} from untrusted frame`);
  }
}
function isLayerAutoUpdateEnabled(value) {
  return value === true;
}
function stripRendererUpdateRepo(config) {
  const { updateRepo: _ignored, ...rest } = config;
  return rest;
}

// packages/runtime/src/watcher-health.ts
var LAUNCHD_LABEL = "com.codexplusplus.watcher";
var WATCHER_LOG = (0, import_node_path3.join)((0, import_node_os.homedir)(), "Library", "Logs", "codex-plusplus-watcher.log");
function getWatcherHealth(userRoot2) {
  const checks = [];
  const state = readJson((0, import_node_path3.join)(userRoot2, "state.json"));
  const config = readJson((0, import_node_path3.join)(userRoot2, "config.json")) ?? {};
  const selfUpdate = readJson((0, import_node_path3.join)(userRoot2, "self-update-state.json"));
  checks.push({
    name: "Install state",
    status: state ? "ok" : "error",
    detail: state ? `Codex++ ${state.version ?? "(unknown version)"}` : "state.json is missing"
  });
  if (!state) return summarize("none", checks);
  const autoUpdate = isLayerAutoUpdateEnabled(config.codexPlusPlus?.autoUpdate);
  checks.push({
    name: "Layer self-update",
    status: autoUpdate ? "ok" : "warn",
    detail: autoUpdate ? "enabled" : "disabled (opt-in; default off)"
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
    status: appRoot && (0, import_node_fs3.existsSync)(appRoot) ? "ok" : "error",
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
    return { name: "last Codex++ update", status: "warn", detail: `skipped ${at}: Layer self-update disabled` };
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
  const plistPath = (0, import_node_path3.join)((0, import_node_os.homedir)(), "Library", "LaunchAgents", `${LAUNCHD_LABEL}.plist`);
  const plist = (0, import_node_fs3.existsSync)(plistPath) ? readFileSafe(plistPath) : "";
  const asarPath = appRoot ? (0, import_node_path3.join)(appRoot, "Contents", "Resources", "app.asar") : "";
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
        status: (0, import_node_fs3.existsSync)(cliPath) ? "ok" : "error",
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
  const dir = (0, import_node_path3.join)((0, import_node_os.homedir)(), ".config", "systemd", "user");
  const service = (0, import_node_path3.join)(dir, "codex-plusplus-watcher.service");
  const timer = (0, import_node_path3.join)(dir, "codex-plusplus-watcher.timer");
  const pathUnit = (0, import_node_path3.join)(dir, "codex-plusplus-watcher.path");
  const expectedPath = appRoot ? (0, import_node_path3.join)(appRoot, "resources", "app.asar") : "";
  const pathBody = (0, import_node_fs3.existsSync)(pathUnit) ? readFileSafe(pathUnit) : "";
  return [
    {
      name: "systemd service",
      status: (0, import_node_fs3.existsSync)(service) ? "ok" : "error",
      detail: service
    },
    {
      name: "systemd timer",
      status: (0, import_node_fs3.existsSync)(timer) ? "ok" : "error",
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
  if (!(0, import_node_fs3.existsSync)(WATCHER_LOG)) {
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
    return JSON.parse((0, import_node_fs3.readFileSync)(path, "utf8"));
  } catch {
    return null;
  }
}
function readFileSafe(path) {
  try {
    return (0, import_node_fs3.readFileSync)(path, "utf8");
  } catch {
    return "";
  }
}
function unescapeXml(value) {
  return value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

// packages/runtime/src/tweak-lifecycle.ts
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

// packages/runtime/src/browser-ui.ts
var import_electron = require("electron");
var import_node_crypto = require("node:crypto");
var import_node_fs4 = require("node:fs");
var import_node_http = require("node:http");
var import_node_path4 = require("node:path");
var CONNECT_PORT_CHANNEL = "codexpp:browser-ui-connect-app-host";
var BRIDGE_REQUEST_CHANNEL = "codexpp:browser-ui-bridge-request";
var BRIDGE_RESPONSE_CHANNEL = "codexpp:browser-ui-bridge-response";
var MESSAGE_FOR_VIEW_CHANNEL = "codexpp:browser-ui-message-for-view";
var WORKER_MESSAGE_CHANNEL = "codexpp:browser-ui-worker-message";
var SYSTEM_THEME_CHANNEL = "codexpp:browser-ui-system-theme";
var MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};
var activeServer = null;
var activeHost = null;
var activeOptions = null;
var bridgeRequests = /* @__PURE__ */ new Map();
var controlClients = /* @__PURE__ */ new Set();
function maybeStartBrowserUiServer(opts) {
  if (process.env.CODEXPP_BROWSER_UI !== "1") return;
  const port = parsePort(process.env.CODEXPP_BROWSER_UI_PORT, 8765);
  startBrowserUiServer({
    ...opts,
    port,
    host: "127.0.0.1",
    hideMainWindow: process.env.CODEXPP_BROWSER_UI_HIDE_MAIN === "1"
  });
}
function startBrowserUiServer(opts) {
  if (activeServer) return;
  activeOptions = opts;
  installBrowserUiIpcHandlers(opts.log);
  const server = (0, import_node_http.createServer)((req, res) => {
    handleHttpRequest(req, res).catch((error) => {
      opts.log("error", "browser UI request failed", { message: error.message });
      sendText(res, 500, "Internal Server Error\n", "text/plain; charset=utf-8");
    });
  });
  server.on("upgrade", (req, socket, head) => {
    handleUpgrade(req, socket, head).catch((error) => {
      opts.log("warn", "browser UI websocket upgrade failed", { message: error.message });
      socket.destroy();
    });
  });
  server.on("error", (error) => {
    opts.log("error", "browser UI server failed", { message: error.message });
  });
  server.listen(opts.port, opts.host, () => {
    opts.log("info", `browser UI server listening at http://${opts.host}:${opts.port}/`);
  });
  activeServer = server;
  if (opts.hideMainWindow) {
    for (const delayMs of [500, 1500, 3e3]) {
      const timer = setTimeout(hideVisibleCodexWindows, delayMs);
      timer.unref?.();
    }
  }
}
function installBrowserUiIpcHandlers(log2) {
  import_electron.ipcMain.removeAllListeners(BRIDGE_RESPONSE_CHANNEL);
  import_electron.ipcMain.removeAllListeners(MESSAGE_FOR_VIEW_CHANNEL);
  import_electron.ipcMain.removeAllListeners(WORKER_MESSAGE_CHANNEL);
  import_electron.ipcMain.removeAllListeners(SYSTEM_THEME_CHANNEL);
  import_electron.ipcMain.on(BRIDGE_RESPONSE_CHANNEL, (event, payload) => {
    if (!isBrowserUiHostSender(event.sender)) return;
    const response = asRecord2(payload);
    const id = typeof response?.id === "string" ? response.id : "";
    const pending = bridgeRequests.get(id);
    if (!pending) return;
    bridgeRequests.delete(id);
    clearTimeout(pending.timer);
    if (response?.ok === true) {
      pending.resolve(response.value);
    } else {
      pending.reject(new Error(typeof response?.error === "string" ? response.error : "Bridge request failed"));
    }
  });
  import_electron.ipcMain.on(MESSAGE_FOR_VIEW_CHANNEL, (event, message) => {
    if (!isBrowserUiHostSender(event.sender)) return;
    broadcastControl({ type: "message-for-view", message });
  });
  import_electron.ipcMain.on(WORKER_MESSAGE_CHANNEL, (event, workerId, message) => {
    if (!isBrowserUiHostSender(event.sender)) return;
    if (typeof workerId !== "string") return;
    broadcastControl({ type: "worker-message", workerId, message });
  });
  import_electron.ipcMain.on(SYSTEM_THEME_CHANNEL, (event, value) => {
    if (!isBrowserUiHostSender(event.sender)) return;
    broadcastControl({ type: "system-theme-variant-updated", value });
  });
  process.once("exit", () => {
    for (const pending of bridgeRequests.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Codex++ browser UI server stopped"));
    }
    bridgeRequests.clear();
    for (const client of controlClients) client.close();
    controlClients.clear();
    try {
      if (activeHost && !activeHost.webContents.isDestroyed()) {
        activeHost.webContents.close({ waitForBeforeUnload: false });
      }
    } catch (error) {
      log2("warn", "browser UI host cleanup failed", { message: String(error) });
    }
  });
}
async function handleHttpRequest(req, res) {
  const options = requireOptions();
  const url = requestUrl(req);
  if (!url) {
    sendText(res, 400, "Bad Request\n", "text/plain; charset=utf-8");
    return;
  }
  if (url.pathname === "/codexpp/browser-ui/health") {
    sendJson(res, 200, { ok: true });
    return;
  }
  if (url.pathname === "/codexpp/browser-ui/bridge") {
    if (req.method !== "POST") {
      sendText(res, 405, "Method Not Allowed\n", "text/plain; charset=utf-8");
      return;
    }
    const body = asRecord2(await readJsonBody(req));
    const method = typeof body?.method === "string" ? body.method : "";
    const args = Array.isArray(body?.args) ? body.args : [];
    try {
      const value = await callHiddenBridge(method, args);
      sendJson(res, 200, { ok: true, value });
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    return;
  }
  if (url.pathname === "/codexpp/browser-ui/bridge.js") {
    if (req.method !== "GET" && req.method !== "HEAD") {
      sendText(res, 405, "Method Not Allowed\n", "text/plain; charset=utf-8");
      return;
    }
    const script = browserBridgeScript(await collectInitialState(options));
    sendBuffer(res, 200, Buffer.from(script), MIME_TYPES[".js"], req.method === "HEAD");
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendText(res, 405, "Method Not Allowed\n", "text/plain; charset=utf-8");
    return;
  }
  if (url.pathname === "/" || url.pathname === "/index.html") {
    const html = await browserIndexHtml(options);
    sendBuffer(res, 200, Buffer.from(html), MIME_TYPES[".html"], req.method === "HEAD");
    return;
  }
  const file = webviewFile(url.pathname);
  if (!file) {
    sendText(res, 404, "Not Found\n", "text/plain; charset=utf-8");
    return;
  }
  const content = (0, import_node_fs4.readFileSync)(file);
  sendBuffer(res, 200, content, mimeType(file), req.method === "HEAD");
}
async function handleUpgrade(req, socket, head) {
  const url = requestUrl(req);
  if (!url) throw new Error("bad websocket URL");
  if (url.pathname !== "/codexpp/browser-ui/rpc" && url.pathname !== "/codexpp/browser-ui/control") {
    socket.destroy();
    return;
  }
  const ws = acceptWebSocket(req, socket, head);
  if (url.pathname === "/codexpp/browser-ui/control") {
    controlClients.add(ws);
    ws.onClose(() => controlClients.delete(ws));
    ws.sendJson({ type: "hello" });
    return;
  }
  const host = await ensureBrowserUiHost();
  const { port1, port2 } = new import_electron.MessageChannelMain();
  host.webContents.postMessage(CONNECT_PORT_CHANNEL, {}, [port2]);
  bridgeMessagePortToWebSocket(port1, ws);
}
async function browserIndexHtml(options) {
  const indexPath = (0, import_node_path4.join)(webviewRoot(), "index.html");
  let html = relaxBrowserUiCsp((0, import_node_fs4.readFileSync)(indexPath, "utf8"));
  const shim = `<script src="/codexpp/browser-ui/bridge.js"></script>`;
  if (html.includes("</head>")) {
    html = html.replace("</head>", `${shim}
  </head>`);
  } else {
    html = `${shim}
${html}`;
  }
  return html;
}
function relaxBrowserUiCsp(html) {
  return html.replace(
    /(<meta\s+http-equiv=["']Content-Security-Policy["']\s+content=")([^"]*)(")/,
    (_match, prefix, content, suffix) => {
      const directives = parseCspDirectives(decodeHtmlAttribute(content));
      directives.set("child-src", "'self' blob: data: http: https:");
      directives.set("frame-src", "'self' blob: data: http: https:");
      directives.set("connect-src", "'self' http: https: ws: wss: sentry-ipc:");
      return `${prefix}${encodeHtmlAttribute(formatCspDirectives(directives))}${suffix}`;
    }
  );
}
function parseCspDirectives(content) {
  const directives = /* @__PURE__ */ new Map();
  for (const part of content.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [name, ...rest] = trimmed.split(/\s+/);
    if (!name) continue;
    directives.set(name, rest.join(" "));
  }
  return directives;
}
function formatCspDirectives(directives) {
  return [...directives.entries()].map(([name, value]) => value ? `${name} ${value}` : name).join("; ");
}
function decodeHtmlAttribute(value) {
  return value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}
function encodeHtmlAttribute(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
async function collectInitialState(options) {
  await ensureBrowserUiHost();
  const [snapshot, systemThemeVariant, sentryInitOptions, buildFlavor, usesOwlAppShell] = await Promise.all([
    callHiddenBridge("snapshot", []),
    callHiddenBridge("systemTheme", []),
    callHiddenBridge("sentryOptions", []),
    callHiddenBridge("buildFlavor", []),
    callHiddenBridge("usesOwlAppShell", [])
  ]);
  if (options.hideMainWindow) hideVisibleCodexWindows();
  return {
    snapshot: asPlainObject(snapshot),
    systemThemeVariant: typeof systemThemeVariant === "string" ? systemThemeVariant : currentSystemThemeVariant(),
    sentryInitOptions,
    buildFlavor,
    usesOwlAppShell: usesOwlAppShell === true,
    platform: process.platform,
    arch: process.arch
  };
}
async function ensureBrowserUiHost() {
  if (activeHost && !activeHost.webContents.isDestroyed()) return activeHost;
  const options = requireOptions();
  const services = await waitForWindowServices(options);
  const windowManager = services.windowManager;
  if (!windowManager?.registerWindow) {
    throw new Error("Codex window registration services are unavailable");
  }
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
  windowManager.registerWindow(windowLike, "local", false, "secondary");
  const context = services.getContextForWebContents?.(view.webContents) ?? services.getContext?.("local");
  context?.registerWindow?.(windowLike);
  await view.webContents.loadURL("about:blank");
  activeHost = { view, webContents: view.webContents };
  view.webContents.once("destroyed", () => {
    if (activeHost?.webContents === view.webContents) activeHost = null;
  });
  options.log("info", "browser UI hidden host ready", { webContentsId: view.webContents.id });
  return activeHost;
}
async function waitForWindowServices(options) {
  const started = Date.now();
  while (Date.now() - started < 3e4) {
    const services = options.getWindowServices();
    if (services?.windowManager?.registerWindow && (services.getContext || services.getContextForWebContents)) {
      return services;
    }
    await delay(100);
  }
  throw new Error("Timed out waiting for Codex window services");
}
function callHiddenBridge(method, args) {
  assertBridgeMethod(method);
  return ensureBrowserUiHost().then((host) => {
    const id = (0, import_node_crypto.randomUUID)();
    return new Promise((resolve10, reject) => {
      const timer = setTimeout(() => {
        bridgeRequests.delete(id);
        reject(new Error(`Timed out waiting for browser UI bridge method: ${method}`));
      }, 15e3);
      bridgeRequests.set(id, { resolve: resolve10, reject, timer });
      host.webContents.send(BRIDGE_REQUEST_CHANNEL, { id, method, args });
    });
  });
}
function bridgeMessagePortToWebSocket(port, ws) {
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    try {
      port.postMessage(null);
    } catch {
    }
    try {
      port.close();
    } catch {
    }
    ws.close();
  };
  port.start();
  port.on("message", (event) => {
    if (closed) return;
    if (event.data == null) {
      close();
      return;
    }
    if (typeof event.data === "string") {
      ws.sendText(event.data);
    }
  });
  port.on("close", close);
  ws.onText((text) => {
    if (closed) return;
    port.postMessage(text);
  });
  ws.onClose(close);
}
function broadcastControl(payload) {
  for (const client of [...controlClients]) {
    try {
      client.sendJson(payload);
    } catch {
      client.close();
      controlClients.delete(client);
    }
  }
}
function browserBridgeScript(state) {
  return `
(() => {
  const initialState = ${safeJson(state)};
  const snapshot = new Map(Object.entries(initialState.snapshot || {}));
  const workerSubscribers = new Map();
  const themeSubscribers = new Set();
  const browserSidebarSnapshots = new Map();
  const browserSidebarSeededLocalServers = new Set();
  let systemThemeVariant = initialState.systemThemeVariant || "light";

  window.__codexppBrowserUi = true;
  installBrowserUiWebviewShim();

  const control = new WebSocket(new URL("/codexpp/browser-ui/control", location.href));
  control.addEventListener("message", (event) => {
    let payload;
    try { payload = JSON.parse(event.data); } catch { return; }
    if (payload.type === "message-for-view") {
      const message = payload.message;
      if (message && message.type === "shared-object-updated") {
        if (message.value === undefined) snapshot.delete(message.key);
        else snapshot.set(message.key, message.value);
      }
      rememberBrowserSidebarHostMessage(message);
      window.dispatchEvent(new MessageEvent("message", { data: message }));
    } else if (payload.type === "worker-message") {
      const subs = workerSubscribers.get(payload.workerId);
      if (subs) for (const fn of [...subs]) fn(payload.message);
    } else if (payload.type === "system-theme-variant-updated") {
      systemThemeVariant = payload.value;
      for (const fn of [...themeSubscribers]) fn();
    }
  });

  async function bridge(method, args = []) {
    const res = await fetch("/codexpp/browser-ui/bridge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ method, args }),
    });
    const body = await res.json();
    if (!body.ok) throw new Error(body.error || "Codex++ browser bridge failed");
    return body.value;
  }

  function legacyBrowserTabId(conversationId) {
    return String(conversationId || "new-conversation") + ":legacy";
  }

  function browserSidebarKey(conversationId, browserTabId) {
    return String(conversationId || "new-conversation") + "::" + String(browserTabId || legacyBrowserTabId(conversationId));
  }

  function normalizeBrowserUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      return new URL(raw).href;
    } catch {}
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return raw;
    try {
      return new URL("https://" + raw).href;
    } catch {
      return raw;
    }
  }

  function browserTitleForUrl(url) {
    if (!url) return "New tab";
    try {
      const host = new URL(url).hostname.replace(/^www\\./, "");
      return host || url;
    } catch {
      return url;
    }
  }

  function makeBrowserSidebarSnapshot(url, patch = {}) {
    const normalized = normalizeBrowserUrl(url);
    return {
      tabType: normalized ? "web" : "new-tab-page",
      isSuspended: false,
      title: normalized ? browserTitleForUrl(normalized) : "New tab",
      url: normalized,
      faviconUrl: null,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      zoomPercent: 100,
      commentModeDisabledReason: null,
      interactionMode: "browse",
      annotationEditorMode: "comment",
      isAnnotationAddModifierPressed: false,
      isOriginalViewEnabled: false,
      isTweaksEditorOpen: false,
      comments: [],
      ...patch,
    };
  }

  function dispatchBrowserSidebarMessage(message) {
    window.dispatchEvent(new MessageEvent("message", { data: message }));
  }

  function seedBrowserSidebarLocalServers(conversationId) {
    if (!conversationId || browserSidebarSeededLocalServers.has(conversationId)) return;
    browserSidebarSeededLocalServers.add(conversationId);
    queueMicrotask(() => {
      dispatchBrowserSidebarMessage({
        type: "browser-sidebar-local-servers",
        conversationId,
        state: { isLoading: false, servers: [], hiddenServers: [] },
      });
    });
  }

  function rememberBrowserSidebarHostMessage(message) {
    if (!message || typeof message !== "object") return;
    if (message.type === "browser-sidebar-state") {
      const conversationId = message.conversationId;
      if (!conversationId || !message.snapshot) return;
      browserSidebarSnapshots.set(browserSidebarKey(conversationId, message.browserTabId), message.snapshot);
    } else if (message.type === "browser-sidebar-local-servers") {
      if (message.conversationId) browserSidebarSeededLocalServers.add(message.conversationId);
    }
  }

  function sendBrowserSidebarSnapshot(conversationId, browserTabId, snapshotPatch) {
    if (!conversationId) return;
    const key = browserSidebarKey(conversationId, browserTabId);
    const previous = browserSidebarSnapshots.get(key) || makeBrowserSidebarSnapshot("");
    const next = { ...previous, ...snapshotPatch };
    browserSidebarSnapshots.set(key, next);
    dispatchBrowserSidebarMessage({
      type: "browser-sidebar-state",
      conversationId,
      ...(browserTabId ? { browserTabId } : {}),
      snapshot: next,
    });
  }

  function setBrowserSidebarUrl(conversationId, browserTabId, url, isLoading = false) {
    const normalized = normalizeBrowserUrl(url);
    sendBrowserSidebarSnapshot(conversationId, browserTabId, makeBrowserSidebarSnapshot(normalized, { isLoading }));
  }

  function findBrowserSidebarFrame(conversationId, browserTabId) {
    const selector = "[data-browser-sidebar-conversation-id='" + cssEscape(conversationId) + "'][data-browser-sidebar-browser-tab-id='" + cssEscape(browserTabId || legacyBrowserTabId(conversationId)) + "']";
    return document.querySelector(selector);
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(String(value));
    return String(value).replace(/['\\\\]/g, "\\\\$&");
  }

  function handleBrowserSidebarViewMessage(message) {
    if (!message || typeof message !== "object") return;
    if (message.type === "browser-sidebar-sync") {
      const payload = message.payload || {};
      seedBrowserSidebarLocalServers(payload.conversationId);
      return;
    }
    if (message.type === "browser-sidebar-owner-sync") {
      seedBrowserSidebarLocalServers(message.conversationId);
      return;
    }
    if (message.type !== "browser-sidebar-command") return;

    const conversationId = message.conversationId;
    const browserTabId = message.browserTabId;
    const command = message.command || {};
    seedBrowserSidebarLocalServers(conversationId);

    if (command.type === "navigate") {
      const normalized = normalizeBrowserUrl(command.url);
      setBrowserSidebarUrl(conversationId, browserTabId, normalized, true);
      queueMicrotask(() => {
        const frame = findBrowserSidebarFrame(conversationId, browserTabId);
        if (!frame || !normalized || frame.getURL?.() === normalized) return;
        frame.loadURL?.(normalized);
      });
      window.setTimeout(() => setBrowserSidebarUrl(conversationId, browserTabId, normalized, false), 500);
    } else if (command.type === "reload") {
      const frame = findBrowserSidebarFrame(conversationId, browserTabId);
      frame?.reload?.();
      const current = browserSidebarSnapshots.get(browserSidebarKey(conversationId, browserTabId));
      if (current?.url) {
        sendBrowserSidebarSnapshot(conversationId, browserTabId, { ...current, isLoading: true });
        window.setTimeout(() => sendBrowserSidebarSnapshot(conversationId, browserTabId, { ...current, isLoading: false }), 250);
      }
    } else if (command.type === "go-back") {
      findBrowserSidebarFrame(conversationId, browserTabId)?.goBack?.();
    } else if (command.type === "go-forward") {
      findBrowserSidebarFrame(conversationId, browserTabId)?.goForward?.();
    } else if (command.type === "stop") {
      const current = browserSidebarSnapshots.get(browserSidebarKey(conversationId, browserTabId));
      if (current) sendBrowserSidebarSnapshot(conversationId, browserTabId, { ...current, isLoading: false });
    } else if (command.type === "reset" || command.type === "close-tab") {
      sendBrowserSidebarSnapshot(conversationId, browserTabId, makeBrowserSidebarSnapshot(""));
    }
  }

  window.codexWindowType = "electron";
  window.electronBridge = {
    windowType: "electron",
    sendMessageFromView: (message) => {
      if (message && message.type === "shared-object-set") snapshot.set(message.key, message.value);
      handleBrowserSidebarViewMessage(message);
      return bridge("sendMessageFromView", [message]);
    },
    getPathForFile: () => null,
    sendWorkerMessageFromView: (workerId, message) => bridge("sendWorkerMessageFromView", [workerId, message]),
    subscribeToWorkerMessages: (workerId, handler) => {
      let subs = workerSubscribers.get(workerId);
      if (!subs) {
        subs = new Set();
        workerSubscribers.set(workerId, subs);
        bridge("subscribeWorkerMessages", [workerId]).catch(console.error);
      }
      subs.add(handler);
      return () => {
        const current = workerSubscribers.get(workerId);
        if (!current) return;
        current.delete(handler);
        if (current.size === 0) {
          workerSubscribers.delete(workerId);
          bridge("unsubscribeWorkerMessages", [workerId]).catch(console.error);
        }
      };
    },
    showContextMenu: (items) => bridge("showContextMenu", [items]),
    showApplicationMenu: (menuId, x, y) => bridge("showApplicationMenu", [menuId, x, y]),
    getFastModeRolloutMetrics: (params) => bridge("getFastModeRolloutMetrics", [params]),
    getSharedObjectSnapshotValue: (key) => snapshot.get(key),
    getSystemThemeVariant: () => systemThemeVariant,
    subscribeToSystemThemeVariant: (handler) => {
      themeSubscribers.add(handler);
      return () => themeSubscribers.delete(handler);
    },
    triggerSentryTestError: () => bridge("triggerSentryTestError", []),
    getSentryInitOptions: () => null,
    getAppSessionId: () => null,
    getBuildFlavor: () => initialState.buildFlavor,
    isIntelMacBuild: () => initialState.platform === "darwin" && initialState.arch === "x64",
    usesOwlAppShell: () => initialState.usesOwlAppShell,
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.type !== "connect-app-host") return;
    const port = event.data.port;
    if (!port) return;
    const ws = new WebSocket(new URL("/codexpp/browser-ui/rpc", location.href));
    ws.addEventListener("message", (message) => port.postMessage(message.data));
    ws.addEventListener("close", () => {
      try { port.postMessage(null); } catch {}
      try { port.close(); } catch {}
    });
    ws.addEventListener("open", () => {
      port.onmessage = (message) => {
        if (message.data == null) {
          ws.close();
          return;
        }
        ws.send(message.data);
      };
      port.start && port.start();
    });
  });

  function installBrowserUiWebviewShim() {
    if (window.__codexppWebviewShimInstalled) return;
    window.__codexppWebviewShimInstalled = true;
    const originalCreateElement = Document.prototype.createElement;
    Document.prototype.createElement = function(tagName, options) {
      if (String(tagName).toLowerCase() !== "webview") {
        return originalCreateElement.call(this, tagName, options);
      }
      return createWebviewIframe(this);
    };

    function createWebviewIframe(doc) {
      const iframe = originalCreateElement.call(doc, "iframe");
      iframe.dataset.codexppWebviewShim = "true";
      iframe.style.border = "0";
      iframe.style.display = "block";
      iframe.style.backgroundColor = "#fff";
      iframe.setAttribute("allow", "autoplay; clipboard-read; clipboard-write; display-capture; fullscreen; microphone; camera");
      const nativeSetAttribute = iframe.setAttribute.bind(iframe);
      const nativeGetAttribute = iframe.getAttribute.bind(iframe);

      try {
        Object.defineProperty(iframe, "tagName", { configurable: true, get: () => "WEBVIEW" });
        Object.defineProperty(iframe, "nodeName", { configurable: true, get: () => "WEBVIEW" });
      } catch {}

      const emit = (type, extra = {}) => {
        const event = new Event(type);
        Object.assign(event, extra);
        iframe.dispatchEvent(event);
      };
      const currentUrl = () => iframe.dataset.codexppRequestedSrc || nativeGetAttribute("src") || "about:blank";
      const actualFrameUrl = (url) => {
        const requested = String(url || "about:blank");
        if (!shouldBreakRecursiveFrameLoad(requested)) return requested;
        try {
          const next = new URL(requested, location.href);
          next.searchParams.set("__codexpp_frame_depth", String(frameAncestorDepth() + 1));
          return next.href;
        } catch {
          return requested;
        }
      };
      const setFrameUrl = (url) => {
        const requested = String(url || "about:blank");
        iframe.dataset.codexppRequestedSrc = requested;
        nativeSetAttribute("src", actualFrameUrl(requested));
      };
      const navigate = (url) => {
        const next = String(url || "about:blank");
        emit("did-start-loading", { url: next });
        setFrameUrl(next);
      };

      iframe.setAttribute = (name, value) => {
        if (String(name).toLowerCase() === "src") {
          setFrameUrl(value);
          return;
        }
        nativeSetAttribute(name, value);
      };

      try {
        Object.defineProperty(iframe, "src", {
          configurable: true,
          get: () => currentUrl(),
          set: (value) => setFrameUrl(value),
        });
      } catch {}

      iframe.addEventListener("load", () => {
        const url = currentUrl();
        emit("dom-ready", { url });
        emit("did-navigate", { url });
        emit("did-stop-loading", { url });
        emit("did-finish-load", { url });
        let title = "";
        try {
          title = iframe.contentDocument?.title || "";
        } catch {}
        const conversationId = iframe.getAttribute("data-browser-sidebar-conversation-id");
        const browserTabId = iframe.getAttribute("data-browser-sidebar-browser-tab-id");
        if (conversationId) {
          sendBrowserSidebarSnapshot(conversationId, browserTabId, makeBrowserSidebarSnapshot(url, {
            title: title || browserTitleForUrl(url),
            isLoading: false,
          }));
        }
        if (title) emit("page-title-updated", { title });
      });
      iframe.addEventListener("error", () => {
        emit("did-fail-load", { errorCode: -2, errorDescription: "iframe load failed", validatedURL: currentUrl() });
        emit("did-stop-loading", { url: currentUrl() });
      });

      Object.defineProperties(iframe, {
        destroy: { value: () => iframe.remove() },
        getURL: { value: () => currentUrl() },
        getTitle: {
          value: () => {
            try {
              return iframe.contentDocument?.title || "";
            } catch {
              return "";
            }
          },
        },
        loadURL: { value: (url) => { navigate(url); return Promise.resolve(); } },
        reload: {
          value: () => {
            try {
              iframe.contentWindow?.location.reload();
            } catch {
              navigate(currentUrl());
            }
          },
        },
        stop: { value: () => {} },
        canGoBack: { value: () => false },
        canGoForward: { value: () => false },
        goBack: {
          value: () => {
            try {
              iframe.contentWindow?.history.back();
            } catch {}
          },
        },
        goForward: {
          value: () => {
            try {
              iframe.contentWindow?.history.forward();
            } catch {}
          },
        },
        executeJavaScript: {
          value: (code) => {
            try {
              return Promise.resolve(iframe.contentWindow?.eval(String(code)));
            } catch (error) {
              return Promise.reject(error);
            }
          },
        },
        insertCSS: { value: () => Promise.resolve("") },
        openDevTools: { value: () => {} },
        closeDevTools: { value: () => {} },
        isDevToolsOpened: { value: () => false },
        send: { value: () => {} },
      });

      return iframe;
    }

    function frameAncestorDepth() {
      let depth = 0;
      let current = window;
      const seen = new Set();
      while (current && !seen.has(current)) {
        seen.add(current);
        let parent;
        try {
          parent = current.parent;
        } catch {
          break;
        }
        if (parent === current) break;
        depth += 1;
        current = parent;
      }
      return depth;
    }

    function shouldBreakRecursiveFrameLoad(url) {
      let target;
      try {
        target = new URL(url, location.href).href;
      } catch {
        return false;
      }
      let current = window;
      const seen = new Set();
      while (current && !seen.has(current)) {
        seen.add(current);
        try {
          if (new URL(current.location.href).href === target) return true;
          if (current.parent === current) break;
          current = current.parent;
        } catch {
          return false;
        }
      }
      return false;
    }
  }
})();
`;
}
function hideVisibleCodexWindows() {
  if (process.platform === "darwin") {
    try {
      import_electron.app.hide();
    } catch {
    }
  }
  for (const win of import_electron.BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    if (activeHost && win.webContents.id === activeHost.webContents.id) continue;
    if (!win.isVisible()) continue;
    try {
      win.hide();
    } catch {
    }
  }
}
function makeWindowLikeForView(view) {
  const viewBounds = () => view.getBounds();
  return {
    id: view.webContents.id,
    webContents: view.webContents,
    on: (event, listener) => {
      if (event === "closed") view.webContents.once("destroyed", listener);
      else view.webContents.on(event, listener);
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
function acceptWebSocket(req, socket, head) {
  const key = req.headers["sec-websocket-key"];
  if (typeof key !== "string") throw new Error("missing Sec-WebSocket-Key");
  const accept = (0, import_node_crypto.createHash)("sha1").update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest("base64");
  socket.write(
    [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${accept}`,
      "\r\n"
    ].join("\r\n")
  );
  const ws = new WebSocketConnection(socket);
  if (head.length > 0) ws.acceptHead(head);
  return ws;
}
var WebSocketConnection = class {
  constructor(socket) {
    this.socket = socket;
    socket.on("data", (chunk) => this.acceptHead(chunk));
    socket.on("close", () => this.emitClose());
    socket.on("error", () => this.emitClose());
  }
  socket;
  buffer = Buffer.alloc(0);
  textHandlers = /* @__PURE__ */ new Set();
  closeHandlers = /* @__PURE__ */ new Set();
  closed = false;
  acceptHead(chunk) {
    if (this.closed) return;
    this.buffer = Buffer.concat([this.buffer, chunk]);
    this.readFrames();
  }
  onText(handler) {
    this.textHandlers.add(handler);
  }
  onClose(handler) {
    this.closeHandlers.add(handler);
  }
  sendJson(payload) {
    this.sendText(JSON.stringify(payload));
  }
  sendText(text) {
    this.sendFrame(1, Buffer.from(text, "utf8"));
  }
  close() {
    if (this.closed) return;
    try {
      this.sendFrame(8, Buffer.alloc(0));
    } catch {
    }
    this.closed = true;
    this.socket.end();
    this.emitClose();
  }
  readFrames() {
    while (this.buffer.length >= 2) {
      const first = this.buffer[0];
      const second = this.buffer[1];
      const opcode = first & 15;
      const masked = (second & 128) !== 0;
      let length = second & 127;
      let offset = 2;
      if (length === 126) {
        if (this.buffer.length < offset + 2) return;
        length = this.buffer.readUInt16BE(offset);
        offset += 2;
      } else if (length === 127) {
        if (this.buffer.length < offset + 8) return;
        const high = this.buffer.readUInt32BE(offset);
        const low = this.buffer.readUInt32BE(offset + 4);
        if (high !== 0) {
          this.close();
          return;
        }
        length = low;
        offset += 8;
      }
      const maskOffset = offset;
      if (masked) offset += 4;
      if (this.buffer.length < offset + length) return;
      const mask = masked ? this.buffer.subarray(maskOffset, maskOffset + 4) : null;
      const payload = Buffer.from(this.buffer.subarray(offset, offset + length));
      this.buffer = this.buffer.subarray(offset + length);
      if (mask) {
        for (let i = 0; i < payload.length; i += 1) payload[i] ^= mask[i % 4];
      }
      if (opcode === 8) {
        this.close();
      } else if (opcode === 9) {
        this.sendFrame(10, payload);
      } else if (opcode === 1) {
        const text = payload.toString("utf8");
        for (const handler of [...this.textHandlers]) handler(text);
      }
    }
  }
  sendFrame(opcode, payload) {
    if (this.closed && opcode !== 8) return;
    const length = payload.length;
    let header;
    if (length < 126) {
      header = Buffer.from([128 | opcode, length]);
    } else if (length <= 65535) {
      header = Buffer.alloc(4);
      header[0] = 128 | opcode;
      header[1] = 126;
      header.writeUInt16BE(length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 128 | opcode;
      header[1] = 127;
      header.writeUInt32BE(0, 2);
      header.writeUInt32BE(length, 6);
    }
    this.socket.write(Buffer.concat([header, payload]));
  }
  emitClose() {
    if (!this.closed) this.closed = true;
    for (const handler of [...this.closeHandlers]) handler();
    this.closeHandlers.clear();
    this.textHandlers.clear();
  }
};
function requestUrl(req) {
  try {
    return new URL(req.url ?? "/", "http://127.0.0.1");
  } catch {
    return null;
  }
}
function readJsonBody(req) {
  return new Promise((resolve10, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > 1024 * 1024) {
        reject(new Error("request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve10(null);
        return;
      }
      try {
        resolve10(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}
function sendJson(res, status, body) {
  sendBuffer(res, status, Buffer.from(JSON.stringify(body)), MIME_TYPES[".json"], false);
}
function sendText(res, status, body, contentType) {
  sendBuffer(res, status, Buffer.from(body), contentType, false);
}
function sendBuffer(res, status, body, contentType, headOnly) {
  res.writeHead(status, {
    "content-type": contentType,
    "content-length": body.length,
    "cache-control": "no-store"
  });
  if (headOnly) res.end();
  else res.end(body);
}
function webviewRoot() {
  return (0, import_node_path4.join)(process.resourcesPath, "app.asar", "webview");
}
function webviewFile(pathname) {
  const cleanPath = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (!cleanPath || cleanPath.includes("\0")) return null;
  const root = webviewRoot();
  const file = (0, import_node_path4.normalize)((0, import_node_path4.join)(root, cleanPath));
  const rel = (0, import_node_path4.relative)(root, file);
  if (rel.startsWith("..") || rel === "") return null;
  if (!(0, import_node_fs4.existsSync)(file) || !(0, import_node_fs4.statSync)(file).isFile()) return null;
  return file;
}
function mimeType(file) {
  const dot = file.lastIndexOf(".");
  const ext = dot >= 0 ? file.slice(dot).toLowerCase() : "";
  return MIME_TYPES[ext] ?? "application/octet-stream";
}
function requireOptions() {
  if (!activeOptions) throw new Error("Codex++ browser UI server is not configured");
  return activeOptions;
}
function isBrowserUiHostSender(sender) {
  return !!activeHost && !activeHost.webContents.isDestroyed() && sender.id === activeHost.webContents.id;
}
function assertBridgeMethod(method) {
  if (!/^[a-zA-Z0-9._:-]+$/.test(method)) throw new Error("invalid bridge method");
}
function parsePort(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : fallback;
}
function asRecord2(value) {
  return value && typeof value === "object" ? value : null;
}
function asPlainObject(value) {
  const record = asRecord2(value);
  return record && !Array.isArray(record) ? record : {};
}
function currentSystemThemeVariant() {
  return import_electron.nativeTheme.shouldUseDarkColors ? "dark" : "light";
}
function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
function delay(ms) {
  return new Promise((resolve10) => setTimeout(resolve10, ms));
}

// packages/runtime/src/native-paths.ts
var import_node_fs5 = require("node:fs");
var import_node_path5 = require("node:path");
function resolveNativeTweakPath(tweakDir, path) {
  if (typeof path !== "string" || path.trim() === "") throw new Error("native path is required");
  const root = (0, import_node_fs5.realpathSync)(tweakDir);
  const full = (0, import_node_path5.resolve)(tweakDir, path);
  let target;
  try {
    target = (0, import_node_fs5.realpathSync)(full);
  } catch {
    throw new Error("native path does not exist");
  }
  if (!isPathInside(root, target) || target === root) {
    throw new Error("native path must stay inside the tweak directory");
  }
  return target;
}
function isPathInside(parent, target) {
  const rel = (0, import_node_path5.relative)((0, import_node_path5.resolve)(parent), (0, import_node_path5.resolve)(target));
  return rel === "" || !!rel && !rel.startsWith("..") && !(0, import_node_path5.isAbsolute)(rel);
}

// packages/runtime/src/runtime-paths.ts
var import_node_fs6 = require("node:fs");
var import_node_os2 = require("node:os");
var import_node_path6 = require("node:path");

// packages/runtime/src/tweak-store.ts
var PINNED_TWEAK_STORE_INDEX_COMMIT = "7a0e95b161de5480261f17bbf84004d9be90dc6e";
var PINNED_TWEAK_STORE_INDEX_SHA256 = "378e88cc366ef6d50816a27838af146c34fef122c6bfee3ba03c9549b862d063";
var DEFAULT_TWEAK_STORE_INDEX_URL = `https://raw.githubusercontent.com/LightHaru/chatgpt-layer/${PINNED_TWEAK_STORE_INDEX_COMMIT}/store/index.json`;
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
function resolveTweakStoreIndexUrl(env = process.env) {
  const override = env.CODEX_PLUSPLUS_STORE_INDEX_URL?.trim();
  if (override) {
    if (env.CODEX_PLUSPLUS_ALLOW_STORE_INDEX_OVERRIDE !== "1") {
      throw new Error(
        "CODEX_PLUSPLUS_STORE_INDEX_URL override requires CODEX_PLUSPLUS_ALLOW_STORE_INDEX_OVERRIDE=1"
      );
    }
    return override;
  }
  return DEFAULT_TWEAK_STORE_INDEX_URL;
}

// packages/runtime/src/runtime-paths.ts
var userRootEnv = process.env.CODEX_PLUSPLUS_USER_ROOT;
var runtimeDirEnv = process.env.CODEX_PLUSPLUS_RUNTIME;
if (!userRootEnv || !runtimeDirEnv) {
  throw new Error(
    "codex-plusplus runtime started without CODEX_PLUSPLUS_USER_ROOT/RUNTIME envs"
  );
}
var userRoot = userRootEnv;
var runtimeDir = runtimeDirEnv;
var PRELOAD_PATH = (0, import_node_path6.resolve)(runtimeDir, "preload.js");
var GUEST_PRELOAD_PATH = (0, import_node_path6.resolve)(runtimeDir, "guest-preload.js");
var TWEAKS_DIR = (0, import_node_path6.join)(userRoot, "tweaks");
var LOG_DIR = (0, import_node_path6.join)(userRoot, "log");
var LOG_FILE = (0, import_node_path6.join)(LOG_DIR, "main.log");
var CONFIG_FILE = (0, import_node_path6.join)(userRoot, "config.json");
var CODEX_CONFIG_FILE = (0, import_node_path6.join)((0, import_node_os2.homedir)(), ".codex", "config.toml");
var INSTALLER_STATE_FILE = (0, import_node_path6.join)(userRoot, "state.json");
var UPDATE_MODE_FILE = (0, import_node_path6.join)(userRoot, "update-mode.json");
var SELF_UPDATE_STATE_FILE = (0, import_node_path6.join)(userRoot, "self-update-state.json");
var SIGNED_CODEX_BACKUP = (0, import_node_path6.join)(userRoot, "backup", "Codex.app");
var CODEX_PLUSPLUS_VERSION = "1.1.4";
var CODEX_PLUSPLUS_REPO = "LightHaru/chatgpt-layer";
var TWEAK_STORE_INDEX_URL = resolveTweakStoreIndexUrl();
var CODEX_WINDOW_SERVICES_KEY = "__codexpp_window_services__";
(0, import_node_fs6.mkdirSync)(LOG_DIR, { recursive: true });
(0, import_node_fs6.mkdirSync)(TWEAKS_DIR, { recursive: true });
function log(level, ...args) {
  const line = `[${(/* @__PURE__ */ new Date()).toISOString()}] [${level}] ${args.map((a) => typeof a === "string" ? a : JSON.stringify(a)).join(" ")}
`;
  try {
    appendCappedLog(LOG_FILE, line);
  } catch {
  }
  if (level === "error") console.error("[codex-plusplus]", ...args);
}

// packages/runtime/src/config-state.ts
var import_node_fs7 = require("node:fs");
function readState() {
  try {
    return JSON.parse((0, import_node_fs7.readFileSync)(CONFIG_FILE, "utf8"));
  } catch {
    return {};
  }
}
function writeState(s) {
  try {
    (0, import_node_fs7.writeFileSync)(CONFIG_FILE, JSON.stringify(s, null, 2));
  } catch (e) {
    log("warn", "writeState failed:", String(e.message));
  }
}
function isCodexPlusPlusAutoUpdateEnabled() {
  return isLayerAutoUpdateEnabled(readState().codexPlusPlus?.autoUpdate);
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
    return JSON.parse((0, import_node_fs7.readFileSync)(INSTALLER_STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}
function readSelfUpdateState() {
  try {
    return JSON.parse((0, import_node_fs7.readFileSync)(SELF_UPDATE_STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}
function writeSelfUpdateState(state) {
  try {
    (0, import_node_fs7.writeFileSync)(SELF_UPDATE_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    log("warn", "writeSelfUpdateState failed:", String(e.message));
  }
}
function cleanOptionalString(value) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  return trimmed ? trimmed : void 0;
}

// packages/runtime/src/store-install.ts
var import_node_fs8 = require("node:fs");
var import_node_child_process2 = require("node:child_process");
var import_node_crypto3 = require("node:crypto");
var import_node_path7 = require("node:path");
var import_node_os3 = require("node:os");

// packages/runtime/src/tweak-store-integrity.ts
var import_node_crypto2 = require("node:crypto");
function hashStoreIndex(body) {
  return (0, import_node_crypto2.createHash)("sha256").update(body).digest("hex");
}
function assertStoreIndexMatchesPin(body, expectedSha256 = PINNED_TWEAK_STORE_INDEX_SHA256) {
  const hash = hashStoreIndex(body);
  if (hash !== expectedSha256) {
    throw new Error(`Store index hash ${hash} does not match runtime pin ${expectedSha256}`);
  }
}

// packages/runtime/src/store-install.ts
var VERSION_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/;
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
function readBundledStoreRegistry() {
  const bundled = (0, import_node_path7.join)(runtimeDir, "store-index.json");
  if (!(0, import_node_fs8.existsSync)(bundled)) return null;
  try {
    const body = (0, import_node_fs8.readFileSync)(bundled);
    if (!process.env.CODEX_PLUSPLUS_ALLOW_STORE_INDEX_OVERRIDE) {
      assertStoreIndexMatchesPin(body);
    }
    return normalizeStoreRegistry(JSON.parse(body.toString("utf8")));
  } catch (e) {
    log("warn", "bundled store index rejected:", String(e.message));
    return null;
  }
}
async function fetchTweakStoreRegistry() {
  const fetchedAt = (/* @__PURE__ */ new Date()).toISOString();
  const allowOverride = process.env.CODEX_PLUSPLUS_ALLOW_STORE_INDEX_OVERRIDE === "1";
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
      const body = Buffer.from(await res.arrayBuffer());
      if (!allowOverride) assertStoreIndexMatchesPin(body);
      return {
        registry: normalizeStoreRegistry(JSON.parse(body.toString("utf8"))),
        fetchedAt
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    const bundled = readBundledStoreRegistry();
    if (bundled) {
      log("warn", "using bundled store index pin:", error.message);
      return { registry: bundled, fetchedAt };
    }
    log("warn", "failed to fetch tweak store registry:", error.message);
    throw error;
  }
}
async function installStoreTweak(entry) {
  const url = storeArchiveUrl(entry);
  const work = (0, import_node_fs8.mkdtempSync)((0, import_node_path7.join)((0, import_node_os3.tmpdir)(), "codexpp-store-tweak-"));
  const archive = (0, import_node_path7.join)(work, "source.tar.gz");
  const extractDir = (0, import_node_path7.join)(work, "extract");
  const target = (0, import_node_path7.join)(TWEAKS_DIR, entry.id);
  const stagedTarget = (0, import_node_path7.join)(work, "staged", entry.id);
  try {
    log("info", `installing store tweak ${entry.id} from ${entry.repo}@${entry.approvedCommitSha}`);
    const res = await fetch(url, {
      headers: { "User-Agent": `codex-plusplus/${CODEX_PLUSPLUS_VERSION}` },
      redirect: "follow"
    });
    if (!res.ok) throw new Error(`download failed: ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    (0, import_node_fs8.writeFileSync)(archive, bytes);
    (0, import_node_fs8.mkdirSync)(extractDir, { recursive: true });
    extractTarArchive(archive, extractDir);
    const source = findTweakRoot(extractDir);
    if (!source) throw new Error("downloaded archive did not contain manifest.json");
    validateStoreTweakSource(entry, source);
    (0, import_node_fs8.rmSync)(stagedTarget, { recursive: true, force: true });
    copyTweakSource(source, stagedTarget);
    const stagedFiles = hashTweakSource(stagedTarget);
    (0, import_node_fs8.writeFileSync)(
      (0, import_node_path7.join)(stagedTarget, ".codexpp-store.json"),
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
    (0, import_node_fs8.rmSync)(target, { recursive: true, force: true });
    (0, import_node_fs8.cpSync)(stagedTarget, target, { recursive: true });
  } finally {
    (0, import_node_fs8.rmSync)(work, { recursive: true, force: true });
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
  const manifestPath = (0, import_node_path7.join)(source, "manifest.json");
  const manifest = JSON.parse((0, import_node_fs8.readFileSync)(manifestPath, "utf8"));
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
  if (!(0, import_node_fs8.existsSync)(dir)) return null;
  if ((0, import_node_fs8.existsSync)((0, import_node_path7.join)(dir, "manifest.json"))) return dir;
  for (const name of (0, import_node_fs8.readdirSync)(dir)) {
    const child = (0, import_node_path7.join)(dir, name);
    try {
      if (!(0, import_node_fs8.statSync)(child).isDirectory()) continue;
    } catch {
      continue;
    }
    const found = findTweakRoot(child);
    if (found) return found;
  }
  return null;
}
function copyTweakSource(source, target) {
  (0, import_node_fs8.cpSync)(source, target, {
    recursive: true,
    filter: (src) => !/(^|[/\\])(?:\.git|node_modules)(?:[/\\]|$)/.test(src)
  });
}
async function assertStoreTweakCleanForAutoUpdate(entry, target, work) {
  if (!(0, import_node_fs8.existsSync)(target)) return;
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
  const metadataPath = (0, import_node_path7.join)(target, ".codexpp-store.json");
  if (!(0, import_node_fs8.existsSync)(metadataPath)) return null;
  try {
    const parsed = JSON.parse((0, import_node_fs8.readFileSync)(metadataPath, "utf8"));
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
  const baselineDir = (0, import_node_path7.join)(work, "baseline");
  const archive = (0, import_node_path7.join)(work, "baseline.tar.gz");
  const res = await fetch(`https://codeload.github.com/${metadata.repo}/tar.gz/${metadata.approvedCommitSha}`, {
    headers: { "User-Agent": `codex-plusplus/${CODEX_PLUSPLUS_VERSION}` },
    redirect: "follow"
  });
  if (!res.ok) throw new Error(`Could not verify local tweak changes before update: ${res.status}`);
  (0, import_node_fs8.writeFileSync)(archive, Buffer.from(await res.arrayBuffer()));
  (0, import_node_fs8.mkdirSync)(baselineDir, { recursive: true });
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
  for (const name of (0, import_node_fs8.readdirSync)(dir).sort()) {
    if (name === ".git" || name === "node_modules" || name === ".codexpp-store.json") continue;
    const full = (0, import_node_path7.join)(dir, name);
    const rel = (0, import_node_path7.relative)(root, full).split("\\").join("/");
    const stat4 = (0, import_node_fs8.statSync)(full);
    if (stat4.isDirectory()) {
      collectTweakFileHashes(root, full, out);
      continue;
    }
    if (!stat4.isFile()) continue;
    out[rel] = (0, import_node_crypto3.createHash)("sha256").update((0, import_node_fs8.readFileSync)(full)).digest("hex");
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

// packages/runtime/src/main.ts
var import_node_crypto7 = require("node:crypto");

// packages/runtime/src/self-update.ts
var import_node_fs9 = require("node:fs");
var import_node_child_process3 = require("node:child_process");
var import_node_path8 = require("node:path");
var import_node_os4 = require("node:os");
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
  if ((0, import_node_fs9.existsSync)(UPDATE_MODE_FILE)) {
    log("info", "Sparkle update prep skipped; update mode already active");
    return;
  }
  if (!(0, import_node_fs9.existsSync)(SIGNED_CODEX_BACKUP)) {
    log("warn", "Sparkle update prep skipped; signed Codex.app backup is missing");
    return;
  }
  if (!isDeveloperIdSignedApp(SIGNED_CODEX_BACKUP)) {
    log("warn", "Sparkle update prep skipped; Codex.app backup is not Developer ID signed");
    return;
  }
  const state = readInstallerState();
  const appRoot = state?.appRoot ?? inferMacAppRoot2();
  if (!appRoot) {
    log("warn", "Sparkle update prep skipped; could not infer Codex.app path");
    return;
  }
  const mode = {
    enabledAt: (/* @__PURE__ */ new Date()).toISOString(),
    appRoot,
    codexVersion: state?.codexVersion ?? null
  };
  (0, import_node_fs9.writeFileSync)(UPDATE_MODE_FILE, JSON.stringify(mode, null, 2));
  try {
    (0, import_node_child_process3.execFileSync)("ditto", [SIGNED_CODEX_BACKUP, appRoot], { stdio: "ignore" });
    try {
      (0, import_node_child_process3.execFileSync)("xattr", ["-dr", "com.apple.quarantine", appRoot], { stdio: "ignore" });
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
  const result = (0, import_node_child_process3.spawnSync)("codesign", ["-dv", "--verbose=4", appRoot], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  return result.status === 0 && /Authority=Developer ID Application:/.test(output) && !/Signature=adhoc/.test(output) && !/TeamIdentifier=not set/.test(output);
}
function inferMacAppRoot2() {
  const marker = ".app/Contents/MacOS/";
  const idx = process.execPath.indexOf(marker);
  return idx >= 0 ? process.execPath.slice(0, idx + ".app".length) : null;
}
var UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1e3;
var VERSION_RE2 = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/;
async function ensureCodexPlusPlusUpdateCheck(force = false) {
  const state = readState();
  const cached = state.codexPlusPlus?.updateCheck;
  const channel = state.codexPlusPlus?.updateChannel ?? "stable";
  const repo = state.codexPlusPlus?.updateRepo ?? CODEX_PLUSPLUS_REPO;
  if (!force && cached && cached.currentVersion === CODEX_PLUSPLUS_VERSION && Date.now() - Date.parse(cached.checkedAt) < UPDATE_CHECK_INTERVAL_MS) {
    return cached;
  }
  const release = await fetchLatestRelease(repo, CODEX_PLUSPLUS_VERSION, channel === "prerelease");
  const latestVersion = release.latestTag ? normalizeVersion2(release.latestTag) : null;
  const check = {
    checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
    currentVersion: CODEX_PLUSPLUS_VERSION,
    latestVersion,
    releaseUrl: release.releaseUrl ?? `https://github.com/${repo}/releases`,
    releaseNotes: release.releaseNotes,
    updateAvailable: latestVersion ? compareVersions2(normalizeVersion2(latestVersion), CODEX_PLUSPLUS_VERSION) > 0 : false,
    ...release.error ? { error: release.error } : {}
  };
  state.codexPlusPlus ??= {};
  state.codexPlusPlus.updateCheck = check;
  writeState(state);
  return check;
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
function normalizeVersion2(v) {
  return v.trim().replace(/^v/i, "");
}
function compareVersions2(a, b) {
  const av = VERSION_RE2.exec(a);
  const bv = VERSION_RE2.exec(b);
  if (!av || !bv) return 0;
  for (let i = 1; i <= 3; i++) {
    const diff = Number(av[i]) - Number(bv[i]);
    if (diff !== 0) return diff;
  }
  return 0;
}
function fallbackSourceRoot() {
  const candidates = [
    (0, import_node_path8.join)((0, import_node_os4.homedir)(), ".codex-plusplus", "source"),
    (0, import_node_path8.join)(userRoot, "source")
  ];
  for (const candidate of candidates) {
    if ((0, import_node_fs9.existsSync)((0, import_node_path8.join)(candidate, "packages", "installer", "dist", "cli.js"))) return candidate;
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
  if ((0, import_node_fs9.existsSync)((0, import_node_path8.join)(sourceRoot, ".git"))) {
    return { kind: "local-dev", label: "Local development checkout", detail: sourceRoot };
  }
  if (normalized.endsWith("/.codex-plusplus/source") || normalized.includes("/.codex-plusplus/source/")) {
    return { kind: "github-source", label: "GitHub source installer", detail: sourceRoot };
  }
  if ((0, import_node_fs9.existsSync)((0, import_node_path8.join)(sourceRoot, "package.json"))) {
    return { kind: "source-archive", label: "Source archive", detail: sourceRoot };
  }
  return { kind: "unknown", label: "Unknown", detail: sourceRoot };
}
function startInstalledCli(cli, args) {
  if (process.platform === "darwin" && startInstalledCliWithLaunchd(cli, args)) {
    return;
  }
  const child = (0, import_node_child_process3.spawn)(process.execPath, [cli, ...args], {
    cwd: (0, import_node_path8.resolve)((0, import_node_path8.dirname)(cli), "..", "..", ".."),
    env: { ...process.env, CODEX_PLUSPLUS_MANUAL_UPDATE: "1" },
    detached: true,
    stdio: "ignore"
  });
  child.unref();
}
function startInstalledCliWithLaunchd(cli, args) {
  const label = `com.codexplusplus.patch-helper.${process.pid}.${Date.now()}`;
  const cleanup = `launchctl remove ${label} >/dev/null 2>&1 || launchctl bootout gui/$(id -u)/${label} >/dev/null 2>&1 || true`;
  const command = [
    `trap ${shellQuote(cleanup)} EXIT`,
    `cd ${shellQuote((0, import_node_path8.resolve)((0, import_node_path8.dirname)(cli), "..", "..", ".."))}`,
    `CODEX_PLUSPLUS_MANUAL_UPDATE=1 ${[process.execPath, cli, ...args].map(shellQuote).join(" ")}`
  ].join(" && ");
  const result = (0, import_node_child_process3.spawnSync)(
    "launchctl",
    [
      "submit",
      "-l",
      label,
      "--",
      "/bin/sh",
      "-c",
      `${command} || true`
    ],
    {
      encoding: "utf8",
      stdio: "ignore"
    }
  );
  if (result.status === 0) return true;
  log("warn", `launchctl submit failed for Codex++ patch helper: ${result.error?.message ?? result.status}`);
  return false;
}
function shellQuote(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
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

// packages/runtime/src/owl-views.ts
var import_electron3 = require("electron");
var import_node_fs10 = require("node:fs");
var import_node_crypto4 = require("node:crypto");

// packages/runtime/src/codex-windows.ts
var import_electron2 = require("electron");
function getPrimaryCodexWindow() {
  const services = getCodexWindowServices();
  const inspected = inspectWindowServices(services);
  const fromServices = inspected.getPrimaryWindow ? services?.getPrimaryWindow?.("local") ?? null : null;
  if (fromServices && !fromServices.isDestroyed()) return fromServices;
  const fromManager = inspected.getPrimaryWindowFromManager ? services?.windowManager?.getPrimaryWindow?.call(services.windowManager) ?? null : null;
  if (fromManager && !fromManager.isDestroyed()) return fromManager;
  const focused = import_electron2.BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) return focused;
  return import_electron2.BrowserWindow.getAllWindows().find((win) => !win.isDestroyed()) ?? null;
}
function getPrimaryCodexWindowRef() {
  const win = getPrimaryCodexWindow();
  if (!win || win.isDestroyed()) return null;
  return { windowId: win.id, webContentsId: win.webContents.id };
}
function focusCodexWindow(windowId) {
  const win = import_electron2.BrowserWindow.fromId(windowId);
  if (!win || win.isDestroyed()) return false;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
  return true;
}
function showCodexWindow(windowId) {
  const win = import_electron2.BrowserWindow.fromId(windowId);
  if (!win || win.isDestroyed()) return false;
  win.show();
  return true;
}
async function createCodexBrowserView(opts) {
  const services = getCodexWindowServices();
  const windowManager = services?.windowManager;
  const inspected = inspectWindowServices(services);
  if (!services || !windowManager?.registerWindow || !inspected.registerWindow) {
    throw new Error(
      "Codex embedded view services are not available. Reinstall Codex++ 1.0.0 or later."
    );
  }
  const route = normalizeCodexRoute(opts.route);
  const hostId = opts.hostId || "local";
  const appearance = opts.appearance || "secondary";
  const view = new import_electron2.BrowserView({
    webPreferences: {
      preload: windowManager.options?.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      devTools: windowManager.options?.allowDevtools
    }
  });
  const windowLike = makeWindowLikeForView2(view);
  windowManager.registerWindow(windowLike, hostId, false, appearance);
  services.getContext?.(hostId)?.registerWindow?.(windowLike);
  await view.webContents.loadURL(codexAppUrl(route, hostId));
  return view;
}
async function createCodexWindow(opts) {
  const services = getCodexWindowServices();
  const inspected = inspectWindowServices(services);
  if (!services || !inspected.present) {
    throw new Error(
      "Codex window services are not available. Reinstall Codex++ 1.0.0 or later."
    );
  }
  const route = normalizeCodexRoute(opts.route);
  const hostId = opts.hostId || "local";
  const parent = typeof opts.parentWindowId === "number" ? import_electron2.BrowserWindow.fromId(opts.parentWindowId) : import_electron2.BrowserWindow.getFocusedWindow();
  const createWindow = services.windowManager?.createWindow;
  let win;
  if (inspected.createWindow && typeof createWindow === "function") {
    win = await createWindow.call(services.windowManager, {
      initialRoute: route,
      hostId,
      show: opts.show !== false,
      appearance: opts.appearance || "secondary",
      parent
    });
  } else if (hostId === "local" && inspected.createFreshWindow && typeof services.createFreshWindow === "function") {
    win = await services.createFreshWindow(route);
  } else if (hostId === "local" && inspected.createFreshLocalWindow && typeof services.createFreshLocalWindow === "function") {
    win = await services.createFreshLocalWindow(route);
  } else if (inspected.ensureHostWindow && typeof services.ensureHostWindow === "function") {
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
function makeWindowLikeForView2(view) {
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
function normalizeOwlViewUrl(url) {
  if (typeof url !== "string" || url.includes("\n") || url.includes("\r")) {
    throw new Error("Owl view URL must be a string without control characters");
  }
  const parsed = new URL(url);
  if (!["http:", "https:", "app:", "file:", "data:", "about:"].includes(parsed.protocol)) {
    throw new Error(`unsupported Owl view URL protocol: ${parsed.protocol}`);
  }
  return parsed.toString();
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
function asRecord3(value) {
  return value && typeof value === "object" ? value : null;
}
function callObjectMethod(target, method, args) {
  const fn = asRecord3(target)?.[method];
  if (typeof fn !== "function") return void 0;
  return fn.apply(target, args);
}
function isWindowDestroyed(win) {
  if (!win) return true;
  const fn = asRecord3(win)?.isDestroyed;
  if (typeof fn !== "function") return false;
  try {
    return Boolean(fn.call(win));
  } catch {
    return true;
  }
}
function windowIdFor(win) {
  const id = asRecord3(win)?.id;
  return typeof id === "number" ? id : null;
}

// packages/runtime/src/owl-views.ts
var untrustedWebContentsIds = /* @__PURE__ */ new Set();
var owlViews = /* @__PURE__ */ new Map();
function markUntrustedWebContents(wc) {
  untrustedWebContentsIds.add(wc.id);
  wc.once("destroyed", () => {
    untrustedWebContentsIds.delete(wc.id);
  });
}
async function createOwlView(ctx, opts) {
  const id = assertBridgeId(opts.id ?? (0, import_node_crypto4.randomUUID)(), "Codex view id");
  const key = owlViewKey(ctx.id, id);
  if (owlViews.has(key)) throw new Error(`Codex view already exists: ${ctx.id}:${id}`);
  const parent = typeof opts.parentWindowId === "number" ? import_electron3.BrowserWindow.fromId(opts.parentWindowId) : getPrimaryCodexWindow();
  if (!parent || isWindowDestroyed(parent)) {
    throw new Error("Codex view needs an active parent window");
  }
  const services = getCodexWindowServices();
  const windowManager = services?.windowManager;
  const route = opts.route === void 0 ? null : normalizeCodexRoute(opts.route);
  const hostId = opts.hostId || "local";
  const view = new import_electron3.BrowserView({
    webPreferences: {
      preload: opts.registerWithCodex === false ? (0, import_node_fs10.existsSync)(GUEST_PRELOAD_PATH) ? GUEST_PRELOAD_PATH : void 0 : windowManager?.options?.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      devTools: windowManager?.options?.allowDevtools
    }
  });
  markUntrustedWebContents(view.webContents);
  if (opts.backgroundColor) {
    callObjectMethod(view, "setBackgroundColor", [opts.backgroundColor]);
    callObjectMethod(asRecord3(view)?.webContentsView, "setBackgroundColor", [opts.backgroundColor]);
  }
  const managed = {
    key,
    tweakId: ctx.id,
    id,
    view,
    parentWindowId: windowIdFor(parent),
    attachMode: null,
    disposeBindings: [],
    disposed: false
  };
  owlViews.set(key, managed);
  try {
    if (route !== null && opts.registerWithCodex !== false && windowManager?.registerWindow) {
      const appearance = opts.appearance || "secondary";
      const windowLike = makeWindowLikeForView2(view);
      windowManager.registerWindow(windowLike, hostId, false, appearance);
      services?.getContext?.(hostId)?.registerWindow?.(windowLike);
    }
    attachOwlView(managed, parent);
    if (opts.bounds) setOwlViewBounds(managed, opts.bounds);
    if (opts.visible === false) setOwlViewVisible(managed, false);
    if (route !== null) {
      await view.webContents.loadURL(codexAppUrl(route, hostId));
    } else if (opts.url) {
      await view.webContents.loadURL(normalizeOwlViewUrl(opts.url));
    } else {
      await view.webContents.loadURL("about:blank");
    }
  } catch (e) {
    disposeOwlView(managed);
    throw e;
  }
  log("info", `created Owl view ${ctx.id}:${id}`, {
    parentWindowId: managed.parentWindowId,
    webContentsId: view.webContents.id,
    attachMode: managed.attachMode
  });
  return owlViewRef(managed);
}
async function callOwlView(tweakId, id, method, arg, arg2) {
  const view = owlViewFor(tweakId, id);
  if (method === "setBounds") return setOwlViewBounds(view, arg);
  if (method === "setVisible") return setOwlViewVisible(view, Boolean(arg));
  if (method === "bringToFront") return bringOwlViewToFront(view);
  if (method === "loadRoute") {
    const route = normalizeCodexRoute(String(arg));
    const hostId = typeof arg2 === "string" && arg2 ? arg2 : "local";
    return view.view.webContents.loadURL(codexAppUrl(route, hostId));
  }
  if (method === "loadUrl") return view.view.webContents.loadURL(normalizeOwlViewUrl(String(arg)));
  if (method === "dispose") return disposeOwlViewById(tweakId, id);
  throw new Error(`unknown Codex view method: ${method}`);
}
function owlViewRef(view) {
  return {
    id: view.id,
    webContentsId: view.view.webContents.id,
    parentWindowId: view.parentWindowId,
    setBounds: (bounds) => Promise.resolve(setOwlViewBounds(view, bounds)),
    setVisible: (visible) => Promise.resolve(setOwlViewVisible(view, visible)),
    bringToFront: () => Promise.resolve(bringOwlViewToFront(view)),
    loadRoute: (route, hostId) => view.view.webContents.loadURL(codexAppUrl(normalizeCodexRoute(route), hostId || "local")).then(() => {
    }),
    loadUrl: (url) => view.view.webContents.loadURL(normalizeOwlViewUrl(url)).then(() => {
    }),
    dispose: () => Promise.resolve(disposeOwlViewById(view.tweakId, view.id))
  };
}
function attachOwlView(view, parent) {
  const targets = inspectViewAttachTargets(parent, view.view);
  if (targets.addBrowserView) {
    callObjectMethod(parent, "addBrowserView", [view.view]);
    view.attachMode = "browserView";
  } else if (targets.addChildView && targets.webContentsView) {
    try {
      addOwlChildView(parent, view.view);
      view.attachMode = "contentView";
    } catch (e) {
      log("warn", "Owl contentView attachment failed; falling back to BrowserView", {
        tweakId: view.tweakId,
        viewId: view.id,
        error: String(e)
      });
    }
  }
  if (!view.attachMode) {
    throw new Error("Owl view attachment is not available on this Codex window");
  }
  const dispose = () => disposeOwlViewById(view.tweakId, view.id);
  bindWindowEvent(parent, view, "closed", dispose);
  bindWindowEvent(parent, view, "close", dispose);
}
function bringOwlViewToFront(view) {
  if (view.disposed) return;
  const parent = view.parentWindowId === null ? null : import_electron3.BrowserWindow.fromId(view.parentWindowId);
  if (!parent || isWindowDestroyed(parent)) return;
  const contentView = asRecord3(parent)?.contentView;
  const webContentsView = asRecord3(view.view)?.webContentsView;
  if (view.attachMode === "contentView" && webContentsView) {
    try {
      if (typeof asRecord3(parent)?.setTopBrowserView === "function") {
        callObjectMethod(parent, "setTopBrowserView", [view.view]);
      } else {
        callObjectMethod(contentView, "addChildView", [webContentsView]);
      }
      return;
    } catch (e) {
      log("warn", "Owl contentView bring-to-front failed", {
        tweakId: view.tweakId,
        viewId: view.id,
        error: String(e)
      });
    }
  }
  if (typeof asRecord3(parent)?.setTopBrowserView === "function") {
    callObjectMethod(parent, "setTopBrowserView", [view.view]);
  }
}
function setOwlViewBounds(view, bounds) {
  assertBounds(bounds);
  callObjectMethod(view.view, "setBounds", [bounds]);
  callObjectMethod(asRecord3(view.view)?.webContentsView, "setBounds", [bounds]);
}
function setOwlViewVisible(view, visible) {
  callObjectMethod(asRecord3(view.view)?.webContentsView, "setVisible", [visible]);
}
function disposeOwlViewById(tweakId, id) {
  const view = owlViews.get(owlViewKey(tweakId, id));
  if (!view) return;
  disposeOwlView(view);
}
function disposeOwlViewsForTweak(tweakId) {
  for (const view of [...owlViews.values()]) {
    if (view.tweakId === tweakId) disposeOwlView(view);
  }
}
function disposeAllOwlViews() {
  for (const view of [...owlViews.values()]) disposeOwlView(view);
}
function disposeOwlView(view) {
  if (view.disposed) return;
  view.disposed = true;
  owlViews.delete(view.key);
  for (const dispose of view.disposeBindings.splice(0)) {
    try {
      dispose();
    } catch {
    }
  }
  const parent = view.parentWindowId === null ? null : import_electron3.BrowserWindow.fromId(view.parentWindowId);
  if (parent && !isWindowDestroyed(parent)) {
    try {
      if (view.attachMode === "contentView") {
        removeOwlChildView(parent, view.view);
      } else if (view.attachMode === "browserView") {
        callObjectMethod(parent, "removeBrowserView", [view.view]);
      }
    } catch (e) {
      log("warn", "Owl view detach failed during dispose", {
        tweakId: view.tweakId,
        viewId: view.id,
        error: String(e)
      });
    }
  }
  try {
    if (!view.view.webContents.isDestroyed()) {
      view.view.webContents.close({ waitForBeforeUnload: false });
    }
  } catch {
  }
}
function owlViewFor(tweakId, id) {
  const view = owlViews.get(owlViewKey(tweakId, id));
  if (!view || view.disposed) throw new Error(`Codex view is not loaded: ${tweakId}:${id}`);
  return view;
}
function owlViewKey(tweakId, viewId) {
  return `${tweakId}:${viewId}`;
}
function addOwlChildView(parent, child) {
  const ownerWindow = asRecord3(child)?.ownerWindow;
  if (ownerWindow && ownerWindow !== parent) {
    callObjectMethod(ownerWindow, "removeBrowserView", [child]);
  }
  callObjectMethod(asRecord3(parent)?.contentView, "addChildView", [asRecord3(child)?.webContentsView]);
  try {
    child.ownerWindow = parent;
  } catch {
  }
  callObjectMethod(asRecord3(child.webContents), "_setOwnerWindow", [parent]);
  const browserViews = asRecord3(parent)?._browserViews;
  if (Array.isArray(browserViews) && !browserViews.includes(child)) {
    browserViews.push(child);
  }
}
function removeOwlChildView(parent, child) {
  callObjectMethod(asRecord3(parent)?.contentView, "removeChildView", [asRecord3(child)?.webContentsView]);
  try {
    child.ownerWindow = null;
  } catch {
  }
  const browserViews = asRecord3(parent)?._browserViews;
  if (Array.isArray(browserViews)) {
    const index = browserViews.indexOf(child);
    if (index >= 0) browserViews.splice(index, 1);
  }
}
function bindWindowEvent(win, view, event, listener) {
  const on = asRecord3(win)?.on;
  const off = asRecord3(win)?.off;
  if (typeof on !== "function") return;
  on.call(win, event, listener);
  view.disposeBindings.push(() => {
    if (typeof off === "function") off.call(win, event, listener);
    else callObjectMethod(win, "removeListener", [event, listener]);
  });
}
function assertBridgeId(value, label) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9._-]+$/.test(value)) {
    throw new Error(`${label} may only contain letters, numbers, dots, underscores, and dashes`);
  }
  return value;
}
function assertBounds(bounds) {
  const values = [bounds?.x, bounds?.y, bounds?.width, bounds?.height];
  if (!values.every((value) => typeof value === "number" && Number.isFinite(value))) {
    throw new Error("bounds must contain finite x, y, width, and height numbers");
  }
  if (bounds.width < 0 || bounds.height < 0) {
    throw new Error("bounds width and height must be non-negative");
  }
}

// packages/runtime/src/tweak-main-host.ts
var import_electron5 = require("electron");
var import_node_fs19 = require("node:fs");
var import_node_path16 = require("node:path");

// packages/runtime/src/tweak-discovery.ts
var import_node_fs11 = require("node:fs");
var import_node_path9 = require("node:path");
var ENTRY_CANDIDATES = ["index.js", "index.cjs", "index.mjs"];
function discoverTweaks(tweaksDir) {
  if (!(0, import_node_fs11.existsSync)(tweaksDir)) return [];
  const out = [];
  for (const name of (0, import_node_fs11.readdirSync)(tweaksDir)) {
    const dir = (0, import_node_path9.join)(tweaksDir, name);
    if (!(0, import_node_fs11.statSync)(dir).isDirectory()) continue;
    const manifestPath = (0, import_node_path9.join)(dir, "manifest.json");
    if (!(0, import_node_fs11.existsSync)(manifestPath)) continue;
    let manifest;
    try {
      manifest = JSON.parse((0, import_node_fs11.readFileSync)(manifestPath, "utf8"));
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
    const p = (0, import_node_path9.join)(dir, m.main);
    return (0, import_node_fs11.existsSync)(p) ? p : null;
  }
  for (const c of ENTRY_CANDIDATES) {
    const p = (0, import_node_path9.join)(dir, c);
    if ((0, import_node_fs11.existsSync)(p)) return p;
  }
  return null;
}

// packages/runtime/src/storage.ts
var import_node_fs12 = require("node:fs");
var import_node_path10 = require("node:path");
var FLUSH_DELAY_MS = 50;
function createDiskStorage(rootDir, id) {
  const dir = (0, import_node_path10.join)(rootDir, "storage");
  (0, import_node_fs12.mkdirSync)(dir, { recursive: true });
  const file = (0, import_node_path10.join)(dir, `${sanitize(id)}.json`);
  let data = {};
  if ((0, import_node_fs12.existsSync)(file)) {
    try {
      data = JSON.parse((0, import_node_fs12.readFileSync)(file, "utf8"));
    } catch {
      try {
        (0, import_node_fs12.renameSync)(file, `${file}.corrupt-${Date.now()}`);
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
      (0, import_node_fs12.writeFileSync)(tmp, JSON.stringify(data, null, 2), "utf8");
      (0, import_node_fs12.renameSync)(tmp, file);
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

// packages/runtime/src/mcp-sync.ts
var import_node_fs13 = require("node:fs");
var import_node_path11 = require("node:path");
var MCP_MANAGED_START = "# BEGIN CODEX++ MANAGED MCP SERVERS";
var MCP_MANAGED_END = "# END CODEX++ MANAGED MCP SERVERS";
function syncManagedMcpServers({
  configPath,
  tweaks
}) {
  const current = (0, import_node_fs13.existsSync)(configPath) ? (0, import_node_fs13.readFileSync)(configPath, "utf8") : "";
  const built = buildManagedMcpBlock(tweaks, current);
  const next = mergeManagedMcpBlock(current, built.block);
  if (next !== current) {
    (0, import_node_fs13.mkdirSync)((0, import_node_path11.dirname)(configPath), { recursive: true });
    (0, import_node_fs13.writeFileSync)(configPath, next, "utf8");
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
  if ((0, import_node_path11.isAbsolute)(command) || !looksLikeRelativePath(command)) return command;
  return (0, import_node_path11.resolve)(tweakDir, command);
}
function resolveArg(tweakDir, arg) {
  if ((0, import_node_path11.isAbsolute)(arg) || arg.startsWith("-")) return arg;
  const candidate = (0, import_node_path11.resolve)(tweakDir, arg);
  return (0, import_node_fs13.existsSync)(candidate) ? candidate : arg;
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

// packages/runtime/src/native-bridge.ts
var import_electron4 = require("electron");
var import_node_child_process4 = require("node:child_process");
var import_node_crypto5 = require("node:crypto");
var import_node_fs14 = require("node:fs");
var import_node_readline = require("node:readline");
var NativeBridge = class {
  constructor(log2, options = {}) {
    this.log = log2;
    this.options = options;
  }
  log;
  options;
  modules = /* @__PURE__ */ new Map();
  instances = /* @__PURE__ */ new Map();
  helpers = /* @__PURE__ */ new Map();
  nativeHostExports = null;
  nativeHostLoadError = null;
  getCapabilities() {
    const host = this.loadNativeHost(false);
    const hostCapabilities = host ? this.readNativeHostCapabilities(host) : {};
    const nativeHost = host !== null;
    return {
      inProcessModules: true,
      swiftModules: process.platform === "darwin",
      appKitEmbedding: Boolean(hostCapabilities.appKitEmbedding),
      childWindowOverlay: Boolean(hostCapabilities.childWindowOverlay),
      directViewAttach: Boolean(hostCapabilities.directViewAttach),
      metalViews: Boolean(hostCapabilities.metalViews),
      nativeHost,
      helpers: true
    };
  }
  loadModule(ctx, options) {
    const id = assertBridgeId2(options.id, "native module id");
    const fullPath = resolveTweakPath(ctx, options.path);
    const kind = options.kind ?? inferModuleKind(fullPath);
    if (kind !== "node-addon") {
      throw new Error(
        `${kind} native modules must be loaded through a .node Objective-C++ shim in Codex++ 1.0.0`
      );
    }
    if (!fullPath.endsWith(".node")) {
      throw new Error("node-addon native modules must use a .node file");
    }
    const loaded = require(fullPath);
    const exports2 = selectEntrypoint(loaded, options.entrypoint);
    const key = moduleKey(ctx.id, id);
    this.modules.set(key, { key, tweakId: ctx.id, id, kind, path: fullPath, exports: exports2 });
    this.log("info", `loaded native module ${ctx.id}:${id}`, { kind, path: fullPath });
    return this.moduleRef(ctx.id, id, kind);
  }
  async createPanel(ctx, options) {
    const created = await this.createNativeInstance(ctx, "panel", options.moduleId, options.factory ?? "createPanel", {
      parentWindowId: options.parentWindowId,
      bounds: options.bounds,
      transparent: options.transparent === true,
      passthroughMouse: options.passthroughMouse === true
    });
    return this.panelRef(created);
  }
  async attachView(ctx, options) {
    const created = await this.createNativeInstance(ctx, "view", options.moduleId, options.factory ?? "attachView", {
      parentWindowId: options.parentWindowId,
      bounds: options.bounds,
      zIndex: options.zIndex
    });
    return this.viewRef(created);
  }
  launchHelper(ctx, options) {
    const id = assertBridgeId2(options.id, "native helper id");
    if ((options.transport ?? "stdio") !== "stdio") {
      throw new Error("native helpers support only stdio transport in Codex++ 1.0.0");
    }
    if ((options.restart ?? "never") !== "never") {
      throw new Error("native helper restart policies are not available in Codex++ 1.0.0");
    }
    const executable = resolveTweakPath(ctx, options.executable);
    const args = options.args ?? [];
    const env = { ...process.env, ...options.env ?? {} };
    const child = (0, import_node_child_process4.spawn)(executable, args, {
      cwd: ctx.dir,
      env,
      stdio: ["pipe", "pipe", "pipe"]
    });
    const key = helperKey(ctx.id, id);
    const helper = {
      key,
      tweakId: ctx.id,
      id,
      child,
      pending: /* @__PURE__ */ new Map()
    };
    this.helpers.set(key, helper);
    const stdout = (0, import_node_readline.createInterface)({ input: child.stdout });
    stdout.on("line", (line) => this.handleHelperLine(helper, line));
    child.stderr.on("data", (chunk) => {
      this.log("warn", `native helper ${ctx.id}:${id} stderr`, String(chunk));
    });
    child.on("exit", (code, signal) => {
      this.log("info", `native helper ${ctx.id}:${id} exited`, { code, signal });
      this.helpers.delete(key);
      for (const request of helper.pending.values()) {
        clearTimeout(request.timer);
        request.reject(new Error(`native helper exited before response`));
      }
      helper.pending.clear();
    });
    child.on("error", (error) => {
      this.log("error", `native helper ${ctx.id}:${id} failed`, error);
      this.helpers.delete(key);
      for (const request of helper.pending.values()) {
        clearTimeout(request.timer);
        request.reject(error);
      }
      helper.pending.clear();
    });
    this.log("info", `launched native helper ${ctx.id}:${id}`, { pid: child.pid, executable });
    return this.helperRef(ctx.id, id, child.pid ?? -1);
  }
  disposeTweak(tweakId) {
    for (const [key, instance] of [...this.instances]) {
      if (instance.tweakId !== tweakId) continue;
      void this.disposeInstance(instance).finally(() => this.instances.delete(key));
    }
    for (const [key, helper] of [...this.helpers]) {
      if (helper.tweakId !== tweakId) continue;
      this.stopHelper(helper);
      this.helpers.delete(key);
    }
    for (const [key, mod] of [...this.modules]) {
      if (mod.tweakId !== tweakId) continue;
      void callOptional(mod.exports, "dispose", []);
      this.modules.delete(key);
    }
  }
  disposeAll() {
    const tweakIds = /* @__PURE__ */ new Set([
      ...[...this.modules.values()].map((item) => item.tweakId),
      ...[...this.instances.values()].map((item) => item.tweakId),
      ...[...this.helpers.values()].map((item) => item.tweakId)
    ]);
    for (const id of tweakIds) this.disposeTweak(id);
  }
  async callInstance(tweakId, kind, id, method, arg) {
    if (kind === "panel") {
      if (method === "setBounds") return this.invokeInstance(tweakId, id, "setBounds", [arg]);
      if (method === "show") return this.invokeInstance(tweakId, id, "show", []);
      if (method === "hide") return this.invokeInstance(tweakId, id, "hide", []);
      if (method === "dispose") return this.disposeInstanceById(tweakId, id);
    }
    if (kind === "view") {
      if (method === "setBounds") return this.invokeInstance(tweakId, id, "setBounds", [arg]);
      if (method === "setVisible") return this.invokeInstance(tweakId, id, "setVisible", [arg]);
      if (method === "dispose") return this.disposeInstanceById(tweakId, id);
    }
    throw new Error(`unknown native ${kind} method: ${method}`);
  }
  async callHelper(tweakId, helperId, method, payload, timeoutMs) {
    if (method === "send") return this.sendHelper(tweakId, helperId, payload);
    if (method === "request") return this.requestHelper(tweakId, helperId, payload, timeoutMs);
    if (method === "stop") return this.stopHelperById(tweakId, helperId);
    throw new Error(`unknown native helper method: ${method}`);
  }
  moduleRef(tweakId, id, kind = this.moduleFor(tweakId, id).kind) {
    return {
      id,
      kind,
      request: (method, payload, timeoutMs) => this.requestModule(tweakId, id, method, payload, timeoutMs),
      dispose: () => this.disposeModule(tweakId, id)
    };
  }
  panelRef(instance) {
    return {
      id: instance.id,
      windowId: instance.windowId,
      setBounds: (bounds) => this.invokeInstance(instance.tweakId, instance.id, "setBounds", [bounds]),
      show: () => this.invokeInstance(instance.tweakId, instance.id, "show", []),
      hide: () => this.invokeInstance(instance.tweakId, instance.id, "hide", []),
      dispose: () => this.disposeInstanceById(instance.tweakId, instance.id)
    };
  }
  viewRef(instance) {
    return {
      id: instance.id,
      setBounds: (bounds) => this.invokeInstance(instance.tweakId, instance.id, "setBounds", [bounds]),
      setVisible: (visible) => this.invokeInstance(instance.tweakId, instance.id, "setVisible", [visible]),
      dispose: () => this.disposeInstanceById(instance.tweakId, instance.id)
    };
  }
  helperRef(tweakId, id, pid) {
    return {
      id,
      pid,
      send: (message) => this.sendHelper(tweakId, id, message),
      request: (message, timeoutMs) => this.requestHelper(tweakId, id, message, timeoutMs),
      stop: () => this.stopHelperById(tweakId, id)
    };
  }
  async requestModule(tweakId, id, method, payload, _timeoutMs) {
    const mod = this.moduleFor(tweakId, id);
    const target = asRecord4(mod.exports);
    const fn = target?.request;
    if (typeof fn === "function") {
      return await fn.call(mod.exports, method, payload);
    }
    const methodFn = target?.[method];
    if (typeof methodFn === "function") {
      return await methodFn.call(mod.exports, payload);
    }
    throw new Error(`native module ${tweakId}:${id} has no request() or ${method}()`);
  }
  async disposeModule(tweakId, id) {
    const key = moduleKey(tweakId, id);
    const mod = this.modules.get(key);
    if (!mod) return;
    await callOptional(mod.exports, "dispose", []);
    this.modules.delete(key);
  }
  async createNativeInstance(ctx, kind, moduleId, factory, options) {
    const target = moduleId ? this.moduleFor(ctx.id, moduleId).exports : this.loadNativeHost(true);
    const fn = asRecord4(target)?.[factory];
    if (typeof fn !== "function") {
      const label = moduleId ? `native module ${ctx.id}:${moduleId}` : "Codex++ native host";
      throw new Error(`${label} has no factory ${factory}()`);
    }
    const parentWindow = typeof options.parentWindowId === "number" ? import_electron4.BrowserWindow.fromId(options.parentWindowId) : import_electron4.BrowserWindow.getFocusedWindow();
    const parentNativeHandle = nativeHandleForWindow(parentWindow);
    const value = await fn.call(target, {
      ...options,
      parentWindowId: windowIdFor2(parentWindow),
      parentWebContentsId: webContentsIdFor(parentWindow),
      parentNativeHandle
    });
    const id = typeof asRecord4(value)?.id === "string" ? String(asRecord4(value)?.id) : (0, import_node_crypto5.randomUUID)();
    const windowId = typeof asRecord4(value)?.windowId === "number" ? Number(asRecord4(value)?.windowId) : null;
    const instance = {
      key: instanceKey(ctx.id, id),
      tweakId: ctx.id,
      id,
      kind,
      value,
      parentWindowId: windowIdFor2(parentWindow),
      windowId,
      disposeBindings: [],
      disposing: false
    };
    this.instances.set(instance.key, instance);
    if (canBindParentWindow(parentWindow)) {
      this.bindInstanceToParent(instance, parentWindow);
      this.syncParentState(instance, parentWindow, "created");
    }
    this.log("info", `created native ${kind} ${ctx.id}:${id}`, {
      moduleId: moduleId ?? "codexpp.native-host",
      factory,
      windowId
    });
    return instance;
  }
  loadNativeHost(required) {
    if (this.nativeHostExports) return this.nativeHostExports;
    if (this.nativeHostLoadError && !required) return null;
    const nativeHostPath = this.options.nativeHostPath;
    if (!nativeHostPath || !(0, import_node_fs14.existsSync)(nativeHostPath)) {
      const error = new Error("Codex++ native host is not installed");
      this.nativeHostLoadError = error;
      if (required) throw error;
      return null;
    }
    try {
      this.nativeHostExports = require(nativeHostPath);
      this.nativeHostLoadError = null;
      this.log("info", "loaded Codex++ native host", { path: nativeHostPath });
      return this.nativeHostExports;
    } catch (error) {
      this.nativeHostLoadError = error instanceof Error ? error : new Error(String(error));
      this.log("error", "failed to load Codex++ native host", this.nativeHostLoadError);
      if (required) throw this.nativeHostLoadError;
      return null;
    }
  }
  readNativeHostCapabilities(host) {
    const getCapabilities = asRecord4(host)?.getCapabilities;
    if (typeof getCapabilities !== "function") return {};
    try {
      const capabilities = getCapabilities.call(host);
      return asRecord4(capabilities) ?? {};
    } catch (error) {
      this.log("warn", "Codex++ native host capability probe failed", error);
      return {};
    }
  }
  async invokeInstance(tweakId, id, method, args) {
    const instance = this.instanceFor(tweakId, id);
    const fn = asRecord4(instance.value)?.[method];
    if (typeof fn === "function") {
      await fn.apply(instance.value, args);
      return;
    }
    if (instance.windowId !== null) {
      const win = import_electron4.BrowserWindow.fromId(instance.windowId);
      if (win && !win.isDestroyed()) {
        if (method === "setBounds") win.setBounds(args[0]);
        else if (method === "show") win.show();
        else if (method === "hide") win.hide();
        else if (method === "setVisible") args[0] ? win.show() : win.hide();
        return;
      }
    }
    throw new Error(`native ${instance.kind} ${tweakId}:${id} does not implement ${method}()`);
  }
  async disposeInstanceById(tweakId, id) {
    const key = instanceKey(tweakId, id);
    const instance = this.instances.get(key);
    if (!instance) return;
    await this.disposeInstance(instance);
    this.instances.delete(key);
  }
  async disposeInstance(instance) {
    if (instance.disposing) return;
    instance.disposing = true;
    for (const dispose of instance.disposeBindings.splice(0)) {
      try {
        dispose();
      } catch {
      }
    }
    await callOptional(instance.value, "dispose", []);
    if (instance.windowId !== null) {
      const win = import_electron4.BrowserWindow.fromId(instance.windowId);
      if (win && !win.isDestroyed()) win.close();
    }
  }
  bindInstanceToParent(instance, parentWindow) {
    const on = (event, listener) => {
      parentWindow.on(event, listener);
      instance.disposeBindings.push(() => parentWindow.off(event, listener));
    };
    const syncBounds = () => this.syncParentState(instance, parentWindow, "bounds");
    const syncFocus = (focused) => this.signalParentState(instance, parentWindow, "focus", { focused });
    const syncVisibility = (visible) => this.signalParentState(instance, parentWindow, "visibility", { visible });
    const disposeWithParent = () => {
      this.log("info", `disposing native ${instance.kind} ${instance.tweakId}:${instance.id}; parent closed`);
      void this.disposeInstanceById(instance.tweakId, instance.id);
    };
    on("move", syncBounds);
    on("resize", syncBounds);
    on("enter-full-screen", syncBounds);
    on("leave-full-screen", syncBounds);
    on("maximize", syncBounds);
    on("unmaximize", syncBounds);
    on("minimize", syncBounds);
    on("restore", syncBounds);
    on("show", () => syncVisibility(true));
    on("hide", () => syncVisibility(false));
    on("focus", () => syncFocus(true));
    on("blur", () => syncFocus(false));
    on("close", disposeWithParent);
    on("closed", disposeWithParent);
  }
  syncParentState(instance, parentWindow, reason) {
    const state = parentWindowState(parentWindow, reason);
    if (!state) return;
    void this.callFirstOptionalInstance(instance, ["syncParent", "parentChanged"], [state]).then((handled) => {
      if (!handled) {
        return this.callFirstOptionalInstance(
          instance,
          ["setParentBounds", "parentBoundsChanged"],
          [state.bounds, state]
        );
      }
      return false;
    }).catch((error) => this.log("warn", `native ${instance.kind} parent sync failed`, error));
  }
  signalParentState(instance, parentWindow, reason, patch) {
    const state = parentWindowState(parentWindow, reason);
    if (!state) return;
    const payload = { ...state, ...patch };
    void this.callFirstOptionalInstance(instance, ["parentStateChanged", "parentChanged"], [payload]).catch((error) => this.log("warn", `native ${instance.kind} parent signal failed`, error));
  }
  async callFirstOptionalInstance(instance, methods, args) {
    const target = asRecord4(instance.value);
    for (const method of methods) {
      const fn = target?.[method];
      if (typeof fn !== "function") continue;
      await fn.apply(instance.value, args);
      return true;
    }
    return false;
  }
  async sendHelper(tweakId, id, message) {
    const helper = this.helperFor(tweakId, id);
    helper.child.stdin.write(`${JSON.stringify(message)}
`);
  }
  async requestHelper(tweakId, id, message, timeoutMs = 1e4) {
    const helper = this.helperFor(tweakId, id);
    const requestId = (0, import_node_crypto5.randomUUID)();
    const payload = { id: requestId, message };
    return await new Promise((resolve10, reject) => {
      const timer = setTimeout(() => {
        helper.pending.delete(requestId);
        reject(new Error(`native helper request timed out: ${tweakId}:${id}`));
      }, timeoutMs);
      helper.pending.set(requestId, { resolve: resolve10, reject, timer });
      helper.child.stdin.write(`${JSON.stringify(payload)}
`);
    });
  }
  async stopHelperById(tweakId, id) {
    const key = helperKey(tweakId, id);
    const helper = this.helpers.get(key);
    if (!helper) return;
    this.stopHelper(helper);
    this.helpers.delete(key);
  }
  stopHelper(helper) {
    if (helper.child.killed) return;
    helper.child.kill();
    const timer = setTimeout(() => {
      if (!helper.child.killed) helper.child.kill("SIGKILL");
    }, 1500);
    timer.unref?.();
  }
  handleHelperLine(helper, line) {
    let payload;
    try {
      payload = JSON.parse(line);
    } catch {
      this.log("info", `native helper ${helper.tweakId}:${helper.id}`, line);
      return;
    }
    if (typeof payload.id !== "string") return;
    const request = helper.pending.get(payload.id);
    if (!request) return;
    helper.pending.delete(payload.id);
    clearTimeout(request.timer);
    if (payload.error) {
      request.reject(new Error(String(payload.error)));
    } else {
      request.resolve(payload.result);
    }
  }
  moduleFor(tweakId, id) {
    const mod = this.modules.get(moduleKey(tweakId, id));
    if (!mod) throw new Error(`native module is not loaded: ${tweakId}:${id}`);
    return mod;
  }
  instanceFor(tweakId, id) {
    const instance = this.instances.get(instanceKey(tweakId, id));
    if (!instance) throw new Error(`native instance is not loaded: ${tweakId}:${id}`);
    return instance;
  }
  helperFor(tweakId, id) {
    const helper = this.helpers.get(helperKey(tweakId, id));
    if (!helper) throw new Error(`native helper is not running: ${tweakId}:${id}`);
    return helper;
  }
};
function resolveTweakPath(ctx, path) {
  return resolveNativeTweakPath(ctx.dir, path);
}
function inferModuleKind(path) {
  if (path.endsWith(".node")) return "node-addon";
  if (path.endsWith(".dylib")) return "dylib";
  if (path.endsWith(".framework")) return "framework";
  throw new Error("native module path must end in .node, .dylib, or .framework");
}
function selectEntrypoint(loaded, entrypoint) {
  if (!entrypoint) return asRecord4(loaded)?.default ?? loaded;
  const selected = asRecord4(loaded)?.[entrypoint];
  if (selected === void 0) throw new Error(`native module entrypoint not found: ${entrypoint}`);
  return selected;
}
function assertBridgeId2(value, label) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9._-]+$/.test(value)) {
    throw new Error(`${label} may only contain letters, numbers, dots, underscores, and dashes`);
  }
  return value;
}
function moduleKey(tweakId, moduleId) {
  return `${tweakId}:${moduleId}`;
}
function instanceKey(tweakId, id) {
  return `${tweakId}:${id}`;
}
function helperKey(tweakId, id) {
  return `${tweakId}:${id}`;
}
function asRecord4(value) {
  return value && typeof value === "object" ? value : null;
}
async function callOptional(target, method, args) {
  const fn = asRecord4(target)?.[method];
  if (typeof fn === "function") await fn.apply(target, args);
}
function parentWindowState(parentWindow, reason) {
  if (isWindowDestroyed2(parentWindow)) return null;
  const bounds = callWindowMethod(parentWindow, "getBounds");
  const contentBounds = callWindowMethod(parentWindow, "getContentBounds");
  return {
    reason,
    windowId: windowIdFor2(parentWindow),
    webContentsId: webContentsIdFor(parentWindow),
    bounds,
    contentBounds,
    visible: callWindowMethod(parentWindow, "isVisible") ?? null,
    focused: callWindowMethod(parentWindow, "isFocused") ?? null,
    minimized: callWindowMethod(parentWindow, "isMinimized") ?? null,
    maximized: callWindowMethod(parentWindow, "isMaximized") ?? null,
    fullscreen: callWindowMethod(parentWindow, "isFullScreen") ?? null
  };
}
function nativeHandleForWindow(parentWindow) {
  if (!parentWindow || isWindowDestroyed2(parentWindow)) return null;
  const fn = asRecord4(parentWindow)?.getNativeWindowHandle;
  if (typeof fn !== "function") return null;
  try {
    const handle = fn.call(parentWindow);
    return Buffer.isBuffer(handle) ? handle : null;
  } catch {
    return null;
  }
}
function canBindParentWindow(parentWindow) {
  if (!parentWindow || isWindowDestroyed2(parentWindow)) return false;
  return typeof asRecord4(parentWindow)?.on === "function" && typeof asRecord4(parentWindow)?.off === "function";
}
function isWindowDestroyed2(parentWindow) {
  const fn = asRecord4(parentWindow)?.isDestroyed;
  if (typeof fn !== "function") return false;
  try {
    return Boolean(fn.call(parentWindow));
  } catch {
    return true;
  }
}
function windowIdFor2(parentWindow) {
  const id = asRecord4(parentWindow)?.id;
  return typeof id === "number" ? id : null;
}
function webContentsIdFor(parentWindow) {
  const webContents2 = asRecord4(asRecord4(parentWindow)?.webContents);
  const id = webContents2?.id;
  return typeof id === "number" ? id : null;
}
function callWindowMethod(parentWindow, method) {
  const fn = asRecord4(parentWindow)?.[method];
  if (typeof fn !== "function") return null;
  try {
    return fn.call(parentWindow);
  } catch {
    return null;
  }
}

// packages/runtime/src/codex-sessions/ids.ts
var import_node_crypto6 = require("node:crypto");
var SESSION_ID_RE = /^session_[a-f0-9]{24}$/;
function generateSessionId() {
  return `session_${(0, import_node_crypto6.randomBytes)(12).toString("hex")}`;
}
function isSessionId(value) {
  return typeof value === "string" && SESSION_ID_RE.test(value);
}
function assertSessionId(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("invalid session id");
  }
  if (value.includes("..") || value.includes("/") || value.includes("\\") || value.includes(":") || value.includes("@") || value.includes(" ") || value.startsWith("\\\\") || /^[A-Za-z]:/.test(value)) {
    throw new Error("invalid session id");
  }
  if (!SESSION_ID_RE.test(value)) {
    throw new Error("invalid session id");
  }
}

// packages/runtime/src/codex-sessions/paths.ts
var import_node_fs15 = require("node:fs");
var import_node_path12 = require("node:path");
function sessionsRoot(userRoot2) {
  return (0, import_node_path12.join)(userRoot2, "codex-sessions");
}
function accountsRoot(userRoot2) {
  return (0, import_node_path12.join)(sessionsRoot(userRoot2), "accounts");
}
function lstatIfExists(path) {
  try {
    return (0, import_node_fs15.lstatSync)(path);
  } catch (error) {
    const code = error.code;
    if (code === "ENOENT") return null;
    throw error;
  }
}
function realUserRootOf(userRoot2) {
  try {
    return (0, import_node_fs15.realpathSync)(userRoot2);
  } catch {
    return (0, import_node_path12.resolve)(userRoot2);
  }
}
function assertStrictlyInside(parent, child, message) {
  if (!isPathInside(parent, child) || child === parent) {
    throw new Error(message);
  }
}
function assertSafeStructuralDir(realUserRoot, lexicalPath, relativeParts, label) {
  const stat4 = lstatIfExists(lexicalPath);
  if (!stat4) {
    const intended = (0, import_node_path12.join)(realUserRoot, ...relativeParts);
    assertStrictlyInside(realUserRoot, intended, `${label} must stay inside user root`);
    return intended;
  }
  if (stat4.isSymbolicLink()) {
    throw new Error(`${label} must not be a symlink`);
  }
  if (!stat4.isDirectory()) {
    throw new Error(`${label} must be a directory`);
  }
  const realDir = (0, import_node_fs15.realpathSync)(lexicalPath);
  assertStrictlyInside(realUserRoot, realDir, `${label} must stay inside user root`);
  return realDir;
}
function assertSafeSessionLayout(userRoot2) {
  const realUserRoot = realUserRootOf(userRoot2);
  const realSessionsRoot = assertSafeStructuralDir(
    realUserRoot,
    sessionsRoot(userRoot2),
    ["codex-sessions"],
    "session root"
  );
  const realAccountsRoot = assertSafeStructuralDir(
    realUserRoot,
    accountsRoot(userRoot2),
    ["codex-sessions", "accounts"],
    "accounts root"
  );
  assertStrictlyInside(realUserRoot, realAccountsRoot, "accounts root must stay inside user root");
  return { realUserRoot, realSessionsRoot, realAccountsRoot };
}
function mkdirRealDir(path) {
  if (lstatIfExists(path)) return;
  (0, import_node_fs15.mkdirSync)(path, { recursive: true });
}
function ensureSafeSessionLayout(userRoot2) {
  assertSafeSessionLayout(userRoot2);
  mkdirRealDir(sessionsRoot(userRoot2));
  assertSafeSessionLayout(userRoot2);
  mkdirRealDir(accountsRoot(userRoot2));
  return assertSafeSessionLayout(userRoot2);
}
function sessionDirUnderLayout(layout, id) {
  assertSessionId(id);
  const dir = (0, import_node_path12.join)(layout.realAccountsRoot, id);
  assertStrictlyInside(layout.realAccountsRoot, dir, "session path must stay inside accounts root");
  return dir;
}
function assertSafeExistingSessionDir(layout, dir) {
  const stat4 = lstatIfExists(dir);
  if (!stat4) return dir;
  if (stat4.isSymbolicLink()) {
    throw new Error("session directory must not be a symlink");
  }
  if (!stat4.isDirectory()) {
    throw new Error("session path must be a directory");
  }
  const realDir = (0, import_node_fs15.realpathSync)(dir);
  assertStrictlyInside(layout.realAccountsRoot, realDir, "session path must stay inside accounts root");
  return realDir;
}
function sessionDir(userRoot2, id) {
  const layout = assertSafeSessionLayout(userRoot2);
  const dir = sessionDirUnderLayout(layout, id);
  return assertSafeExistingSessionDir(layout, dir);
}
function sessionMetaPath(userRoot2, id) {
  return (0, import_node_path12.join)(sessionDir(userRoot2, id), "session.json");
}
function sessionCodexHome(userRoot2, id) {
  return (0, import_node_path12.join)(sessionDir(userRoot2, id), "codex-home");
}
function sessionSqliteHome(userRoot2, id) {
  return (0, import_node_path12.join)(sessionDir(userRoot2, id), "sqlite-home");
}
function collectForbiddenDeleteTargets(userRoot2) {
  const out = [
    (0, import_node_path12.resolve)(userRoot2),
    (0, import_node_path12.resolve)(userRoot2, "tweak-data"),
    (0, import_node_path12.resolve)(userRoot2, "tweaks"),
    (0, import_node_path12.resolve)(userRoot2, "runtime"),
    (0, import_node_path12.resolve)(userRoot2, "config.json"),
    (0, import_node_path12.resolve)(userRoot2, "state.json"),
    (0, import_node_path12.resolve)(sessionsRoot(userRoot2)),
    (0, import_node_path12.resolve)(accountsRoot(userRoot2))
  ];
  if (process.env.HOME) {
    out.push((0, import_node_path12.resolve)(process.env.HOME));
    out.push((0, import_node_path12.resolve)(process.env.HOME, ".codex"));
  }
  if (process.env.USERPROFILE) {
    out.push((0, import_node_path12.resolve)(process.env.USERPROFILE));
    out.push((0, import_node_path12.resolve)(process.env.USERPROFILE, ".codex"));
  }
  if (process.env.APPDATA) out.push((0, import_node_path12.resolve)(process.env.APPDATA));
  try {
    out.push((0, import_node_fs15.realpathSync)(userRoot2));
  } catch {
  }
  return [...new Set(out)];
}
function isForbiddenSessionDeleteTarget(userRoot2, target) {
  const resolved = (0, import_node_path12.resolve)(target);
  const forbidden = collectForbiddenDeleteTargets(userRoot2);
  if (forbidden.includes(resolved)) return true;
  try {
    return forbidden.includes((0, import_node_fs15.realpathSync)(target));
  } catch {
    return false;
  }
}
function rmSessionDir(userRoot2, id) {
  assertSessionId(id);
  const layout = assertSafeSessionLayout(userRoot2);
  const dir = sessionDirUnderLayout(layout, id);
  const stat4 = lstatIfExists(dir);
  if (!stat4) return;
  if (stat4.isSymbolicLink()) {
    throw new Error("session directory must not be a symlink");
  }
  if (!stat4.isDirectory()) {
    throw new Error("session path must be a directory");
  }
  const realDir = (0, import_node_fs15.realpathSync)(dir);
  assertStrictlyInside(
    layout.realAccountsRoot,
    realDir,
    "refusing to delete path outside accounts root"
  );
  if (isForbiddenSessionDeleteTarget(userRoot2, realDir)) {
    throw new Error("refusing to delete protected path");
  }
  (0, import_node_fs15.rmSync)(realDir, { recursive: true, force: true });
}

// packages/runtime/src/codex-sessions/launcher.ts
var import_node_child_process5 = require("node:child_process");
var import_node_fs16 = require("node:fs");
var import_node_path13 = require("node:path");
var ISOLATED_ENV_ALLOWLIST = [
  "PATH",
  "HOME",
  "USERPROFILE",
  "SYSTEMROOT",
  "WINDIR",
  "TEMP",
  "TMP",
  "LANG",
  "LC_ALL"
];
function isolatedSessionEnv(intent, sourceEnv = process.env) {
  const env = {};
  for (const key of ISOLATED_ENV_ALLOWLIST) {
    const value = sourceEnv[key];
    if (typeof value === "string") env[key] = value;
  }
  env.CODEX_HOME = intent.codexHome;
  env.CODEX_SQLITE_HOME = intent.sqliteHome;
  return env;
}
function resolveTrustedCodexExecutable(opts) {
  const exists = opts.existsSync ?? import_node_fs16.existsSync;
  const platform2 = opts.platform ?? process.platform;
  const candidates = [];
  const addRelatives = (root) => {
    if (!root) return;
    candidates.push(
      (0, import_node_path13.join)(root, "codex"),
      (0, import_node_path13.join)(root, "bin", "codex"),
      (0, import_node_path13.join)(root, "Codex.exe"),
      (0, import_node_path13.join)(root, "bin", "Codex.exe")
    );
  };
  addRelatives(opts.resourcesPath ?? void 0);
  addRelatives(opts.appPath ?? void 0);
  if (platform2 === "darwin" && opts.appPath) {
    addRelatives((0, import_node_path13.join)(opts.appPath, "Contents", "Resources"));
  }
  for (const candidate of candidates) {
    if (exists(candidate)) return candidate;
  }
  return null;
}
function createNodeCodexProcessLauncher(options) {
  const spawnImpl = options.spawnImpl ?? import_node_child_process5.spawn;
  return {
    launch(intent) {
      const exe = options.resolveExecutable();
      if (!exe) {
        return Promise.reject(new Error("trusted Codex executable is not available"));
      }
      let child;
      try {
        child = spawnImpl(exe, [], {
          env: isolatedSessionEnv(intent),
          cwd: (0, import_node_path13.dirname)(intent.codexHome),
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true
        });
      } catch (error) {
        return Promise.reject(error);
      }
      drain(child);
      return waitForSpawn(child);
    }
  };
}
function drain(child) {
  child.stdout?.on("data", () => {
  });
  child.stderr?.on("data", () => {
  });
  child.stdout?.resume();
  child.stderr?.resume();
}
function waitForSpawn(child) {
  return new Promise((resolve10, reject) => {
    const onError = (error) => {
      child.off("spawn", onSpawn);
      reject(error);
    };
    const onSpawn = () => {
      child.off("error", onError);
      child.on("error", () => {
      });
      resolve10(wrapChild(child));
    };
    child.once("error", onError);
    child.once("spawn", onSpawn);
    if (child.pid != null) {
      child.off("error", onError);
      child.off("spawn", onSpawn);
      child.on("error", () => {
      });
      resolve10(wrapChild(child));
    }
  });
}
function wrapChild(child) {
  return {
    kill(signal) {
      try {
        return child.kill(signal);
      } catch {
        return false;
      }
    },
    onExit(listener) {
      const handler = (code, signal) => {
        listener(code, signal);
      };
      child.on("exit", handler);
      return () => {
        child.off("exit", handler);
      };
    }
  };
}

// packages/runtime/src/codex-sessions/manager.ts
var import_node_fs17 = require("node:fs");
var import_node_path14 = require("node:path");
var CodexSessionManager = class {
  userRoot;
  launcher;
  now;
  log;
  stopTimeoutMs;
  killTimeoutMs;
  records = /* @__PURE__ */ new Map();
  timers = /* @__PURE__ */ new Set();
  constructor(options) {
    this.userRoot = options.userRoot;
    this.launcher = options.launcher;
    this.now = options.now ?? (() => /* @__PURE__ */ new Date());
    this.log = options.log;
    this.stopTimeoutMs = options.stopTimeoutMs ?? 2e3;
    this.killTimeoutMs = options.killTimeoutMs ?? 1e3;
    this.loadFromDisk();
  }
  listSessions() {
    assertSafeSessionLayout(this.userRoot);
    return [...this.records.values()].map((record) => cloneMetadata(record.metadata)).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  }
  getSession(id) {
    return cloneMetadata(this.require(id).metadata);
  }
  getSessionStatus(id) {
    const record = this.require(id);
    return {
      id: record.metadata.id,
      lifecycle: record.lifecycle,
      metadata: cloneMetadata(record.metadata)
    };
  }
  createSession(input = {}) {
    assertSafeSessionLayout(this.userRoot);
    const id = input.id === void 0 ? this.allocateId() : (assertSessionId(input.id), input.id);
    if (this.records.has(id) || (0, import_node_fs17.existsSync)(sessionDir(this.userRoot, id))) {
      throw new Error("session already exists");
    }
    const createdAt = this.isoNow();
    const metadata = {
      id,
      label: normalizeLabel(input.label),
      enabled: true,
      createdAt
    };
    ensureSafeSessionLayout(this.userRoot);
    const dir = sessionDir(this.userRoot, id);
    try {
      (0, import_node_fs17.mkdirSync)(dir);
    } catch (error) {
      const code = error.code;
      if (code === "EEXIST") throw new Error("session already exists");
      throw error;
    }
    (0, import_node_fs17.mkdirSync)(sessionCodexHome(this.userRoot, id), { recursive: true });
    (0, import_node_fs17.mkdirSync)(sessionSqliteHome(this.userRoot, id), { recursive: true });
    writeJsonAtomic(sessionMetaPath(this.userRoot, id), metadata);
    this.records.set(id, {
      metadata,
      lifecycle: "STOPPED",
      child: null,
      unsubExit: null,
      inFlight: null
    });
    this.log?.("info", `created session ${id}`);
    return cloneMetadata(metadata);
  }
  renameSession(id, label) {
    const record = this.require(id);
    record.metadata.label = normalizeLabel(label);
    record.metadata.updatedAt = this.isoNow();
    this.persist(record);
    return cloneMetadata(record.metadata);
  }
  enableSession(id) {
    return this.setEnabled(id, true);
  }
  disableSession(id) {
    return this.setEnabled(id, false);
  }
  async removeSession(id, options = {}) {
    assertSafeSessionLayout(this.userRoot);
    const record = this.require(id);
    if (record.lifecycle === "STARTING" || record.lifecycle === "RUNNING" || record.lifecycle === "STOPPING") {
      if (!options.forceStop) {
        throw new Error("session is running");
      }
      await this.stopSession(id);
    }
    this.detach(record);
    this.records.delete(id);
    rmSessionDir(this.userRoot, id);
    this.log?.("info", `removed session ${id}`);
  }
  async startSession(id) {
    const record = this.require(id);
    if (!record.metadata.enabled) throw new Error("session is disabled");
    if (record.lifecycle === "STARTING" || record.lifecycle === "RUNNING") {
      throw new Error("session already starting/running");
    }
    if (record.lifecycle === "STOPPING") throw new Error("session is stopping");
    record.lifecycle = "STARTING";
    const work = this.launchRecord(record);
    record.inFlight = work;
    try {
      await work;
    } finally {
      if (record.inFlight === work) record.inFlight = null;
    }
    return this.getSessionStatus(id);
  }
  async stopSession(id) {
    const record = this.require(id);
    if (record.lifecycle === "STOPPED") return this.getSessionStatus(id);
    if (record.lifecycle === "FAILED" && !record.child) return this.getSessionStatus(id);
    if (record.lifecycle === "STOPPING" && record.inFlight) {
      await record.inFlight.catch(() => {
      });
      return this.getSessionStatus(id);
    }
    record.lifecycle = "STOPPING";
    const work = this.stopRecord(record);
    record.inFlight = work;
    try {
      await work;
    } finally {
      if (record.inFlight === work) record.inFlight = null;
    }
    return this.getSessionStatus(id);
  }
  async restartSession(id) {
    await this.stopSession(id);
    return this.startSession(id);
  }
  async shutdownAll(options = {}) {
    const timeoutMs = options.timeoutMs ?? this.stopTimeoutMs + this.killTimeoutMs;
    const live = [...this.records.values()].filter((record) => this.isLive(record));
    const stopping = Promise.all(live.map((record) => this.stopSession(record.metadata.id).catch(() => {
    })));
    await Promise.race([stopping, this.delay(timeoutMs)]);
    for (const record of this.records.values()) {
      this.detach(record);
      if (record.lifecycle === "STARTING" || record.lifecycle === "RUNNING" || record.lifecycle === "STOPPING") {
        record.lifecycle = "STOPPED";
      }
    }
    this.clearTimers();
  }
  hasLiveChildren() {
    for (const record of this.records.values()) {
      if (this.isLive(record)) return true;
    }
    return false;
  }
  isLive(record) {
    return record.child !== null || record.lifecycle === "STARTING" || record.lifecycle === "RUNNING" || record.lifecycle === "STOPPING";
  }
  setEnabled(id, enabled) {
    const record = this.require(id);
    record.metadata.enabled = enabled;
    record.metadata.updatedAt = this.isoNow();
    this.persist(record);
    return cloneMetadata(record.metadata);
  }
  async launchRecord(record) {
    try {
      const child = await this.launcher.launch({
        sessionId: record.metadata.id,
        codexHome: sessionCodexHome(this.userRoot, record.metadata.id),
        sqliteHome: sessionSqliteHome(this.userRoot, record.metadata.id)
      });
      record.child = child;
      record.unsubExit = child.onExit((code, signal) => {
        this.onChildExit(record, code, signal);
      });
      record.lifecycle = "RUNNING";
      record.metadata.lastStartedAt = this.isoNow();
      record.metadata.updatedAt = record.metadata.lastStartedAt;
      this.persist(record);
    } catch (error) {
      record.lifecycle = "FAILED";
      record.child = null;
      record.unsubExit = null;
      record.metadata.lastExit = {
        at: this.isoNow(),
        code: null,
        signal: null,
        reason: "launch-failed"
      };
      record.metadata.updatedAt = record.metadata.lastExit.at;
      this.persist(record);
      throw error;
    }
  }
  async stopRecord(record) {
    const child = record.child;
    if (!child) {
      record.lifecycle = "STOPPED";
      record.metadata.lastStoppedAt = this.isoNow();
      record.metadata.updatedAt = record.metadata.lastStoppedAt;
      this.persist(record);
      return;
    }
    let exitCode = null;
    let exitSignal = null;
    const waitExit = new Promise((resolve10) => {
      const unsub = child.onExit((code, signal) => {
        exitCode = code;
        exitSignal = signal;
        unsub();
        resolve10();
      });
    });
    child.kill("SIGTERM");
    const termExited = await this.waitWithTimeout(waitExit, this.stopTimeoutMs);
    if (!termExited) {
      child.kill("SIGKILL");
      await this.waitWithTimeout(waitExit, this.killTimeoutMs);
    }
    this.detach(record);
    record.lifecycle = "STOPPED";
    record.metadata.lastStoppedAt = this.isoNow();
    record.metadata.lastExit = {
      at: record.metadata.lastStoppedAt,
      code: exitCode,
      signal: exitSignal,
      reason: "requested"
    };
    record.metadata.updatedAt = record.metadata.lastStoppedAt;
    this.persist(record);
  }
  onChildExit(record, code, signal) {
    if (record.lifecycle === "STOPPING") return;
    if (record.lifecycle !== "RUNNING" && record.lifecycle !== "STARTING") return;
    this.detach(record);
    record.lifecycle = "FAILED";
    record.metadata.lastExit = {
      at: this.isoNow(),
      code,
      signal,
      reason: "unexpected"
    };
    record.metadata.updatedAt = record.metadata.lastExit.at;
    this.persist(record);
    this.log?.("warn", `session ${record.metadata.id} exited unexpectedly`);
  }
  detach(record) {
    record.unsubExit?.();
    record.unsubExit = null;
    if (record.child) {
      try {
        record.child.kill("SIGKILL");
      } catch {
      }
      record.child = null;
    }
  }
  require(id) {
    assertSessionId(id);
    assertSafeSessionLayout(this.userRoot);
    const record = this.records.get(id);
    if (!record) throw new Error(`unknown session: ${id}`);
    return record;
  }
  allocateId() {
    const layout = assertSafeSessionLayout(this.userRoot);
    for (let i = 0; i < 8; i++) {
      const id = generateSessionId();
      if (!this.records.has(id) && !(0, import_node_fs17.existsSync)((0, import_node_path14.join)(layout.realAccountsRoot, id))) return id;
    }
    throw new Error("failed to allocate session id");
  }
  persist(record) {
    assertSafeSessionLayout(this.userRoot);
    writeJsonAtomic(sessionMetaPath(this.userRoot, record.metadata.id), record.metadata);
  }
  loadFromDisk() {
    const layout = assertSafeSessionLayout(this.userRoot);
    const root = layout.realAccountsRoot;
    if (!(0, import_node_fs17.existsSync)(root)) return;
    let entries = [];
    try {
      entries = (0, import_node_fs17.readdirSync)(root);
    } catch {
      return;
    }
    for (const name of entries) {
      if (!isSessionId(name)) continue;
      try {
        const metaPath = sessionMetaPath(this.userRoot, name);
        if (!(0, import_node_fs17.existsSync)(metaPath)) continue;
        const raw = JSON.parse((0, import_node_fs17.readFileSync)(metaPath, "utf8"));
        const metadata = stripCredentials(raw, name);
        this.records.set(name, {
          metadata,
          lifecycle: "STOPPED",
          child: null,
          unsubExit: null,
          inFlight: null
        });
      } catch (error) {
        this.log?.("warn", `failed to load session ${name}`);
      }
    }
  }
  isoNow() {
    return this.now().toISOString();
  }
  delay(ms) {
    return new Promise((resolve10) => {
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        resolve10();
      }, ms);
      this.timers.add(timer);
    });
  }
  async waitWithTimeout(promise, timeoutMs) {
    let settled = false;
    const timeout = this.delay(timeoutMs).then(() => {
      if (settled) return false;
      return false;
    });
    const winner = await Promise.race([
      promise.then(() => {
        settled = true;
        return true;
      }),
      timeout
    ]);
    return winner;
  }
  clearTimers() {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
  }
};
function normalizeLabel(label) {
  if (label === void 0 || label === null) return "";
  if (typeof label !== "string") throw new Error("session label must be a string");
  return label.slice(0, 200);
}
function cloneMetadata(metadata) {
  return {
    ...metadata,
    ...metadata.lastExit ? { lastExit: { ...metadata.lastExit } } : {}
  };
}
function stripCredentials(raw, fallbackId) {
  const rec = isRecord(raw) ? raw : {};
  const lastExitRaw = isRecord(rec.lastExit) ? rec.lastExit : void 0;
  let reason = "unexpected";
  if (lastExitRaw && (lastExitRaw.reason === "requested" || lastExitRaw.reason === "unexpected" || lastExitRaw.reason === "launch-failed")) {
    reason = lastExitRaw.reason;
  }
  const lastExit = lastExitRaw ? {
    at: typeof lastExitRaw.at === "string" ? lastExitRaw.at : (/* @__PURE__ */ new Date(0)).toISOString(),
    code: typeof lastExitRaw.code === "number" ? lastExitRaw.code : null,
    signal: typeof lastExitRaw.signal === "string" ? lastExitRaw.signal : null,
    reason
  } : void 0;
  const metadata = {
    id: fallbackId,
    label: typeof rec.label === "string" ? rec.label : "",
    enabled: rec.enabled !== false,
    createdAt: typeof rec.createdAt === "string" ? rec.createdAt : (/* @__PURE__ */ new Date(0)).toISOString()
  };
  if (typeof rec.updatedAt === "string") metadata.updatedAt = rec.updatedAt;
  if (typeof rec.lastStartedAt === "string") metadata.lastStartedAt = rec.lastStartedAt;
  if (typeof rec.lastStoppedAt === "string") metadata.lastStoppedAt = rec.lastStoppedAt;
  if (lastExit) metadata.lastExit = lastExit;
  return metadata;
}
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function writeJsonAtomic(filePath, data) {
  const dir = (0, import_node_path14.dirname)(filePath);
  (0, import_node_fs17.mkdirSync)(dir, { recursive: true });
  const tmp = (0, import_node_path14.join)(dir, `.${(0, import_node_path14.basename)(filePath)}.${process.pid}.tmp`);
  (0, import_node_fs17.writeFileSync)(tmp, `${JSON.stringify(data, null, 2)}
`, "utf8");
  try {
    (0, import_node_fs17.renameSync)(tmp, filePath);
  } catch {
    try {
      (0, import_node_fs17.unlinkSync)(filePath);
    } catch {
    }
    (0, import_node_fs17.renameSync)(tmp, filePath);
  }
}

// packages/runtime/src/codex-sessions/host.ts
var manager = null;
function setCodexSessionManager(next) {
  manager = next;
}
function requireCodexSessionManager() {
  if (!manager) throw new Error("codex session manager is not available");
  return manager;
}

// packages/runtime/src/tweak-permissions.ts
var TWEAK_PERMISSION_ALIASES = {
  "codex.windows": "codex-windows",
  "codex.views": "codex-views"
};
var TWEAK_ID_RE = /^[a-zA-Z0-9._-]+$/;
function normalizePermission(permission) {
  const aliased = TWEAK_PERMISSION_ALIASES[permission] ?? permission;
  return aliased;
}
function hasExplicitPermissions(manifest) {
  return Array.isArray(manifest.permissions);
}
var EXPLICIT_ONLY_PERMISSIONS = /* @__PURE__ */ new Set(["codex-sessions"]);
function hasTweakPermission(manifest, permission) {
  const wanted = normalizePermission(permission);
  if (EXPLICIT_ONLY_PERMISSIONS.has(wanted)) {
    return (manifest.permissions ?? []).some((entry) => normalizePermission(entry) === wanted);
  }
  if (!hasExplicitPermissions(manifest)) return true;
  return (manifest.permissions ?? []).some((entry) => normalizePermission(entry) === wanted);
}
function permissionDeniedMessage(tweakId, permission) {
  return `tweak ${tweakId} must declare ${normalizePermission(permission)} permission`;
}
function permissionDeniedError(tweakId, permission) {
  return new Error(permissionDeniedMessage(tweakId, permission));
}
function assertTweakHasPermission(manifest, permission) {
  if (!hasTweakPermission(manifest, permission)) {
    throw permissionDeniedError(manifest.id, permission);
  }
}
function isValidTweakId(value) {
  return typeof value === "string" && TWEAK_ID_RE.test(value);
}
function assertValidTweakId(value) {
  if (!isValidTweakId(value)) throw new Error("bad tweak id");
}
function bindOwnedTweakId(ownerId, requestedId) {
  assertValidTweakId(ownerId);
  assertValidTweakId(requestedId);
  if (ownerId !== requestedId) {
    throw new Error(`tweak ${ownerId} cannot use tweak ${requestedId}'s identity`);
  }
  return ownerId;
}
function tweakApiSurface(manifest) {
  return {
    settings: hasTweakPermission(manifest, "settings"),
    ipc: hasTweakPermission(manifest, "ipc"),
    filesystem: hasTweakPermission(manifest, "filesystem"),
    network: hasTweakPermission(manifest, "network"),
    codexRuntime: hasTweakPermission(manifest, "codex-runtime"),
    codexWindows: hasTweakPermission(manifest, "codex-windows"),
    codexViews: hasTweakPermission(manifest, "codex-views"),
    codexCdp: hasTweakPermission(manifest, "codex-cdp"),
    nativeModule: hasTweakPermission(manifest, "native-module"),
    nativeView: hasTweakPermission(manifest, "native-view"),
    nativeHelper: hasTweakPermission(manifest, "native-helper"),
    codexSessions: hasTweakPermission(manifest, "codex-sessions")
  };
}
function hasAnyCodexApi(surface) {
  return surface.codexRuntime || surface.codexWindows || surface.codexViews || surface.codexCdp || surface.nativeModule || surface.nativeView || surface.nativeHelper || surface.codexSessions;
}
function scopedTweakIpcChannel(tweakId, channel) {
  return `codexpp:${tweakId}:${channel}`;
}
function authorizeTweakCapability(snapshot, requestedId, permission, ownerId) {
  assertValidTweakId(requestedId);
  if (ownerId !== void 0) bindOwnedTweakId(ownerId, requestedId);
  if (!snapshot || snapshot.id !== requestedId) {
    throw new Error(`unknown tweak: ${requestedId}`);
  }
  if (!snapshot.enabled) {
    throw new Error(`tweak is disabled: ${requestedId}`);
  }
  assertTweakHasPermission(snapshot.manifest, permission);
  return snapshot;
}
function createDeniedMethod(tweakId, permission) {
  return () => {
    throw permissionDeniedError(tweakId, permission);
  };
}
function createDeniedAsyncMethod(tweakId, permission) {
  return async () => {
    throw permissionDeniedError(tweakId, permission);
  };
}
function createDeniedTweakFs(tweakId) {
  const deny = createDeniedAsyncMethod(tweakId, "filesystem");
  return {
    dataDir: `<denied>/tweak-data/${tweakId}`,
    read: deny,
    write: deny,
    exists: deny
  };
}
function createDeniedTweakIpc(tweakId) {
  const deny = createDeniedMethod(tweakId, "ipc");
  return {
    on: deny,
    send: deny,
    invoke: deny,
    handle: deny
  };
}

// packages/runtime/src/tweak-fs-sandbox.ts
var import_node_fs18 = require("node:fs");
var import_node_path15 = require("node:path");
function tweakDataDir(userRoot2, tweakId) {
  assertValidTweakId(tweakId);
  return (0, import_node_path15.join)(userRoot2, "tweak-data", tweakId);
}
function ensureTweakDataDir(userRoot2, tweakId) {
  const dir = tweakDataDir(userRoot2, tweakId);
  (0, import_node_fs18.mkdirSync)(dir, { recursive: true });
  return dir;
}
function resolveTweakDataPath(userRoot2, tweakId, relPath) {
  const dir = tweakDataDir(userRoot2, tweakId);
  const full = (0, import_node_path15.resolve)(dir, relPath);
  if (!isPathInside(dir, full) || full === dir) throw new Error("path traversal");
  return { dir, full };
}

// packages/runtime/src/tweak-main-host.ts
var UPDATE_CHECK_INTERVAL_MS2 = 24 * 60 * 60 * 1e3;
var tweakState = {
  discovered: [],
  loadedMain: /* @__PURE__ */ new Map()
};
var nativeBridge = new NativeBridge(log, {
  nativeHostPath: (0, import_node_path16.join)(runtimeDir, "native", "codexpp_native_host.node")
});
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
          ipc: makeMainIpc(t.manifest),
          fs: makeMainFs(t.manifest),
          codex: makeCodexApi(t)
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
    } finally {
      nativeBridge.disposeTweak(id);
      disposeOwlViewsForTweak(id);
    }
  }
  tweakState.loadedMain.clear();
}
function clearTweakModuleCache() {
  const rootSet = /* @__PURE__ */ new Set([TWEAKS_DIR, safeRealpath(TWEAKS_DIR)]);
  const entrySet = /* @__PURE__ */ new Set();
  for (const tweak of tweakState.discovered) {
    rootSet.add(tweak.dir);
    rootSet.add(safeRealpath(tweak.dir));
    entrySet.add(tweak.entry);
    entrySet.add(safeRealpath(tweak.entry));
  }
  const roots = [...rootSet];
  for (const key of Object.keys(require.cache)) {
    const realKey = safeRealpath(key);
    const isTweakModule = entrySet.has(key) || entrySet.has(realKey) || roots.some((root) => isPathInside(root, key) || isPathInside(root, realKey));
    if (isTweakModule) delete require.cache[key];
  }
}
function safeRealpath(filePath) {
  try {
    return (0, import_node_fs19.realpathSync)(filePath);
  } catch {
    return filePath;
  }
}
function listedTweaksSnapshot() {
  const updateChecks = readState().tweakUpdateChecks ?? {};
  return tweakState.discovered.map((t) => ({
    manifest: t.manifest,
    entry: t.entry,
    dir: t.dir,
    entryExists: (0, import_node_fs19.existsSync)(t.entry),
    enabled: isTweakEnabled(t.manifest.id),
    update: updateChecks[t.manifest.id] ?? null
  }));
}
async function ensureTweakUpdateCheck(t, force = false) {
  const id = t.manifest.id;
  const repo = t.manifest.githubRepo;
  if (!repo) return;
  const state = readState();
  const cached = state.tweakUpdateChecks?.[id];
  if (!force && cached && cached.repo === repo && cached.currentVersion === t.manifest.version && Date.now() - Date.parse(cached.checkedAt) < UPDATE_CHECK_INTERVAL_MS2) {
    return;
  }
  let check;
  try {
    const { registry } = await fetchTweakStoreRegistry();
    const entry = registry.entries.find((candidate) => candidate.id === id);
    if (!entry) {
      check = {
        checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
        repo,
        currentVersion: t.manifest.version,
        latestVersion: null,
        latestTag: null,
        releaseUrl: null,
        updateAvailable: false
      };
    } else {
      const latestVersion = normalizeVersion(entry.manifest.version);
      check = {
        checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
        repo,
        currentVersion: t.manifest.version,
        latestVersion,
        latestTag: null,
        releaseUrl: entry.releaseUrl ?? `https://github.com/${repo}/releases`,
        updateAvailable: compareVersions(latestVersion, normalizeVersion(t.manifest.version)) > 0,
        pinnedSha: entry.approvedCommitSha
      };
    }
  } catch (e) {
    check = {
      checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
      repo,
      currentVersion: t.manifest.version,
      latestVersion: null,
      latestTag: null,
      releaseUrl: null,
      updateAvailable: false,
      error: e instanceof Error ? e.message : String(e)
    };
  }
  state.tweakUpdateChecks ??= {};
  state.tweakUpdateChecks[id] = check;
  writeState(state);
}
async function installGithubReleaseTweak(id) {
  const tweak = tweakState.discovered.find((item) => item.manifest.id === id);
  if (!tweak) throw new Error(`unknown tweak: ${id}`);
  if (!tweak.manifest.githubRepo) {
    throw new Error(`${tweak.manifest.name} has no githubRepo in its manifest`);
  }
  let repo;
  try {
    repo = normalizeGitHubRepo(tweak.manifest.githubRepo);
  } catch {
    throw new Error(`${tweak.manifest.name} has an invalid githubRepo: ${tweak.manifest.githubRepo}`);
  }
  const { registry } = await fetchTweakStoreRegistry();
  const storeEntry = registry.entries.find((entry) => {
    if (entry.id !== id) return false;
    try {
      return normalizeGitHubRepo(entry.repo) === repo;
    } catch {
      return entry.repo === repo;
    }
  });
  if (!storeEntry) {
    throw new Error(
      `${tweak.manifest.name} is not listed in the ChatGPT Layer tweak store, so it can't be updated from GitHub.`
    );
  }
  assertStoreEntryPlatformCompatible(storeEntry);
  assertStoreEntryRuntimeCompatible(storeEntry);
  await installStoreTweak(storeEntry);
  reloadTweaks("store-pin-install", tweakLifecycleDeps);
  const installed = tweakState.discovered.find((item) => item.manifest.id === id) ?? tweak;
  await ensureTweakUpdateCheck(installed, true);
  return { installed: id, version: storeEntry.manifest.version, commitSha: storeEntry.approvedCommitSha };
}
function broadcastReload() {
  const payload = {
    at: Date.now(),
    tweaks: tweakState.discovered.map((t) => t.manifest.id)
  };
  for (const wc of import_electron5.webContents.getAllWebContents()) {
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
function makeMainIpc(manifest) {
  if (!hasTweakPermission(manifest, "ipc")) return createDeniedTweakIpc(manifest.id);
  const id = manifest.id;
  const ch = (c) => scopedTweakIpcChannel(id, c);
  return {
    on: (c, h) => {
      const wrapped = (_e, ...args) => h(...args);
      import_electron5.ipcMain.on(ch(c), wrapped);
      return () => import_electron5.ipcMain.removeListener(ch(c), wrapped);
    },
    send: (_c) => {
      throw new Error("ipc.send is renderer\u2192main; main side uses handle/on");
    },
    invoke: (_c) => {
      throw new Error("ipc.invoke is renderer\u2192main; main side uses handle");
    },
    handle: (c, handler) => {
      import_electron5.ipcMain.handle(ch(c), (_e, ...args) => handler(...args));
    }
  };
}
function makeMainFs(manifest) {
  if (!hasTweakPermission(manifest, "filesystem")) return createDeniedTweakFs(manifest.id);
  const id = manifest.id;
  const dir = ensureTweakDataDir(userRoot, id);
  const fs = require("node:fs/promises");
  return {
    dataDir: dir,
    read: (p) => fs.readFile(resolveTweakDataPath(userRoot, id, p).full, "utf8"),
    write: (p, c) => fs.writeFile(resolveTweakDataPath(userRoot, id, p).full, c, "utf8"),
    exists: async (p) => {
      try {
        await fs.access(resolveTweakDataPath(userRoot, id, p).full);
        return true;
      } catch {
        return false;
      }
    }
  };
}
function currentRuntimeInfo() {
  const installerState = readInstallerState();
  return getRuntimeInfo({
    userRoot,
    runtimeDir,
    codexVersion: installerState?.codexVersion ?? null,
    channel: null,
    getWindowServices: getCodexWindowServices,
    env: liveProbeEnv()
  });
}
function currentRuntimeCapabilities() {
  const installerState = readInstallerState();
  return getRuntimeCapabilities({
    userRoot,
    runtimeDir,
    codexVersion: installerState?.codexVersion ?? null,
    channel: null,
    getWindowServices: getCodexWindowServices,
    getNativeCapabilities: () => nativeBridge.getCapabilities(),
    env: liveProbeEnv()
  });
}
function liveProbeEnv() {
  return {
    inspectExistingWindow: () => windowSampleFrom(getPrimaryCodexWindow())
  };
}
function tweakContext(tweakId, permission) {
  const tweak = permission ? assertAuthorizedTweak(tweakId, permission) : tweakById(tweakId);
  return { id: tweak.manifest.id, dir: tweak.dir };
}
function discoveredTweakSnapshot(tweakId) {
  const tweak = tweakState.discovered.find((item) => item.manifest.id === tweakId);
  if (!tweak) return void 0;
  return {
    id: tweak.manifest.id,
    enabled: isTweakEnabled(tweak.manifest.id),
    dir: tweak.dir,
    manifest: tweak.manifest
  };
}
function tweakById(tweakId) {
  const snapshot = authorizeEnabledTweak(tweakId);
  const tweak = tweakState.discovered.find((item) => item.manifest.id === snapshot.id);
  if (!tweak) throw new Error(`unknown tweak: ${tweakId}`);
  return tweak;
}
function authorizeEnabledTweak(tweakId) {
  assertValidTweakId(tweakId);
  const snapshot = discoveredTweakSnapshot(tweakId);
  if (!snapshot) throw new Error(`unknown tweak: ${tweakId}`);
  if (!snapshot.enabled) throw new Error(`tweak is disabled: ${tweakId}`);
  return snapshot;
}
function assertAuthorizedTweak(tweakId, permission, ownerId) {
  const snapshot = authorizeTweakCapability(
    typeof tweakId === "string" ? discoveredTweakSnapshot(tweakId) : void 0,
    tweakId,
    permission,
    ownerId
  );
  const tweak = tweakState.discovered.find((item) => item.manifest.id === snapshot.id);
  if (!tweak) throw new Error(`unknown tweak: ${String(tweakId)}`);
  return tweak;
}
function assertTweakId(tweakId) {
  assertValidTweakId(tweakId);
}
function makeCodexApi(tweak) {
  const surface = tweakApiSurface(tweak.manifest);
  if (!hasAnyCodexApi(surface)) return void 0;
  const ctx = () => ({ id: tweak.manifest.id, dir: tweak.dir });
  const deny = (permission) => createDeniedAsyncMethod(tweak.manifest.id, permission);
  const guard = (permission, fn) => {
    return async (...args) => {
      assertTweakHasPermission(tweak.manifest, permission);
      return await fn(...args);
    };
  };
  return {
    runtime: {
      getInfo: surface.codexRuntime ? async () => currentRuntimeInfo() : deny("codex-runtime"),
      getCapabilities: surface.codexRuntime ? async () => currentRuntimeCapabilities() : deny("codex-runtime")
    },
    windows: {
      create: surface.codexWindows ? guard("codex-windows", createCodexWindow) : deny("codex-windows"),
      getPrimary: surface.codexWindows ? async () => getPrimaryCodexWindowRef() : deny("codex-windows"),
      focus: surface.codexWindows ? guard("codex-windows", async (windowId) => focusCodexWindow(windowId)) : deny("codex-windows"),
      show: surface.codexWindows ? guard("codex-windows", async (windowId) => showCodexWindow(windowId)) : deny("codex-windows")
    },
    views: {
      create: surface.codexViews ? guard("codex-views", (options) => createOwlView(ctx(), options)) : deny("codex-views")
    },
    cdp: {
      getStatus: surface.codexCdp ? async () => getCdpStatus() : deny("codex-cdp"),
      listTargets: surface.codexCdp ? async () => listCdpTargets() : deny("codex-cdp")
    },
    native: {
      loadModule: surface.nativeModule ? guard("native-module", async (options) => nativeBridge.loadModule(ctx(), options)) : deny("native-module"),
      createPanel: surface.nativeView ? guard("native-view", (options) => nativeBridge.createPanel(ctx(), options)) : deny("native-view"),
      attachView: surface.nativeView ? guard("native-view", (options) => nativeBridge.attachView(ctx(), options)) : deny("native-view"),
      launchHelper: surface.nativeHelper ? guard("native-helper", async (options) => nativeBridge.launchHelper(ctx(), options)) : deny("native-helper")
    },
    createBrowserView: surface.codexViews ? guard("codex-views", createCodexBrowserView) : deny("codex-views"),
    createWindow: surface.codexWindows ? guard("codex-windows", createCodexWindow) : deny("codex-windows"),
    sessions: {
      list: surface.codexSessions ? async () => requireCodexSessionManager().listSessions() : deny("codex-sessions"),
      getStatus: surface.codexSessions ? async (id) => requireCodexSessionManager().getSessionStatus(id) : deny("codex-sessions")
    }
  };
}
var tweakLifecycleDeps = {
  logInfo: (message) => log("info", message),
  setTweakEnabled,
  stopAllMainTweaks,
  clearTweakModuleCache,
  loadAllMainTweaks,
  broadcastReload
};

// packages/runtime/src/main.ts
if (process.env.CODEXPP_REMOTE_DEBUG === "1") {
  const port = process.env.CODEXPP_REMOTE_DEBUG_PORT ?? "9222";
  import_electron6.app.commandLine.appendSwitch("remote-debugging-port", port);
  log("info", `remote debugging enabled on port ${port}`);
}
process.on("uncaughtException", (e) => {
  log("error", "uncaughtException", { code: e.code, message: e.message, stack: e.stack });
});
process.on("unhandledRejection", (e) => {
  log("error", "unhandledRejection", { value: String(e) });
});
installSparkleUpdateHook();
function registerPreload(s, label, kind = "full") {
  const filePath = kind === "guest" && (0, import_node_fs20.existsSync)(GUEST_PRELOAD_PATH) ? GUEST_PRELOAD_PATH : PRELOAD_PATH;
  const id = kind === "guest" ? "codex-plusplus-guest" : "codex-plusplus";
  try {
    const strategy = selectPreloadRegistration(s);
    if (strategy === "registerPreloadScript") {
      const reg = s.registerPreloadScript;
      reg.call(s, { type: "frame", filePath, id });
      log("info", `preload registered (registerPreloadScript) on ${label}:`, filePath);
      return;
    }
    if (strategy === "setPreloads") {
      const existing = s.getPreloads();
      if (!existing.includes(filePath)) {
        s.setPreloads([...existing, filePath]);
      }
      log("info", `preload registered (setPreloads) on ${label}:`, filePath);
      return;
    }
    log("error", `preload registration on ${label} failed: no session preload API`);
  } catch (e) {
    if (e instanceof Error && e.message.includes("existing ID")) {
      log("info", `preload already registered on ${label}:`, PRELOAD_PATH);
      return;
    }
    log("error", `preload registration on ${label} failed:`, e);
  }
}
import_electron6.app.whenReady().then(() => {
  log("info", "app ready fired");
  if (isCodexPlusPlusSafeModeEnabled()) {
    log("warn", "safe mode is enabled; preload will not be registered");
    return;
  }
  registerPreload(import_electron6.session.defaultSession, "defaultSession", "full");
  maybeStartBrowserUiServer({
    getWindowServices: getCodexWindowServices,
    log
  });
});
import_electron6.app.on("session-created", (s) => {
  if (isCodexPlusPlusSafeModeEnabled()) return;
  if (s === import_electron6.session.defaultSession) return;
  registerPreload(s, "session-created", "guest");
});
import_electron6.app.on("web-contents-created", (_e, wc) => {
  try {
    const wp = wc.getLastWebPreferences?.();
    log("info", "web-contents-created", {
      id: wc.id,
      type: wc.getType(),
      sessionIsDefault: wc.session === import_electron6.session.defaultSession,
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
log("info", "main.ts evaluated; app.isReady=" + import_electron6.app.isReady());
if (isCodexPlusPlusSafeModeEnabled()) {
  log("warn", "safe mode is enabled; tweaks will not be loaded");
}
var sessionManager = new CodexSessionManager({
  userRoot,
  launcher: createNodeCodexProcessLauncher({
    resolveExecutable: () => {
      let resourcesPath = null;
      let appPath = null;
      try {
        const info = currentRuntimeInfo();
        resourcesPath = info.resourcesPath;
        appPath = info.appPath;
      } catch {
      }
      if (!resourcesPath) {
        const fromProcess = process.resourcesPath;
        if (typeof fromProcess === "string") resourcesPath = fromProcess;
      }
      if (!appPath) {
        try {
          appPath = import_electron6.app.getAppPath();
        } catch {
          appPath = null;
        }
      }
      return resolveTrustedCodexExecutable({
        platform: process.platform,
        resourcesPath,
        appPath
      });
    }
  }),
  log
});
setCodexSessionManager(sessionManager);
loadAllMainTweaks();
var sessionShutdownStarted = false;
import_electron6.app.on("will-quit", (event) => {
  stopAllMainTweaks();
  nativeBridge.disposeAll();
  disposeAllOwlViews();
  for (const t of tweakState.loadedMain.values()) {
    try {
      t.storage.flush();
    } catch {
    }
  }
  if (sessionShutdownStarted) return;
  if (!sessionManager.hasLiveChildren()) return;
  event.preventDefault();
  sessionShutdownStarted = true;
  const failSafe = setTimeout(() => {
    import_electron6.app.quit();
  }, 3e3);
  void sessionManager.shutdownAll({ timeoutMs: 3e3 }).finally(() => {
    clearTimeout(failSafe);
    import_electron6.app.quit();
  });
});
function privilegedHandle(channel, listener) {
  import_electron6.ipcMain.handle(channel, (event, ...args) => {
    assertPrivilegedIpcSender(channel, event.sender, untrustedWebContentsIds);
    return listener(event, ...args);
  });
}
import_electron6.ipcMain.on("codexpp:privileged-frame", (event) => {
  event.returnValue = isPrivilegedIpcSender(event.sender, untrustedWebContentsIds);
});
import_electron6.ipcMain.handle("codexpp:list-tweaks", async (_e, opts) => {
  const force = opts === true || opts !== null && typeof opts === "object" && opts.force === true;
  await Promise.all(tweakState.discovered.map((t) => ensureTweakUpdateCheck(t, force)));
  return listedTweaksSnapshot();
});
import_electron6.ipcMain.handle("codexpp:get-tweak-enabled", (_e, id) => isTweakEnabled(id));
import_electron6.ipcMain.handle("codexpp:set-tweak-enabled", (_e, id, enabled) => {
  return setTweakEnabledAndReload(id, enabled, tweakLifecycleDeps);
});
import_electron6.ipcMain.handle("codexpp:get-config", () => {
  const s = readState();
  const installerState = readInstallerState();
  const sourceRoot = installerState?.sourceRoot ?? fallbackSourceRoot();
  return {
    version: CODEX_PLUSPLUS_VERSION,
    autoUpdate: isLayerAutoUpdateEnabled(s.codexPlusPlus?.autoUpdate),
    safeMode: s.codexPlusPlus?.safeMode === true,
    updateChannel: s.codexPlusPlus?.updateChannel ?? "stable",
    updateRepo: s.codexPlusPlus?.updateRepo ?? CODEX_PLUSPLUS_REPO,
    updateRef: s.codexPlusPlus?.updateRef ?? "",
    updateCheck: s.codexPlusPlus?.updateCheck ?? null,
    selfUpdate: readSelfUpdateState(),
    installationSource: describeInstallationSource(sourceRoot)
  };
});
privilegedHandle("codexpp:set-auto-update", (_e, enabled) => {
  setCodexPlusPlusAutoUpdate(!!enabled);
  return { autoUpdate: isCodexPlusPlusAutoUpdateEnabled() };
});
privilegedHandle("codexpp:set-update-config", (_e, config) => {
  setCodexPlusPlusUpdateConfig(stripRendererUpdateRepo(config ?? {}));
  const s = readState();
  return {
    updateChannel: s.codexPlusPlus?.updateChannel ?? "stable",
    updateRepo: s.codexPlusPlus?.updateRepo ?? CODEX_PLUSPLUS_REPO,
    updateRef: s.codexPlusPlus?.updateRef ?? ""
  };
});
import_electron6.ipcMain.handle("codexpp:check-codexpp-update", async (_e, force) => {
  return ensureCodexPlusPlusUpdateCheck(force === true);
});
privilegedHandle("codexpp:run-codexpp-update", async () => {
  const sourceRoot = readInstallerState()?.sourceRoot ?? fallbackSourceRoot();
  if (!sourceRoot) {
    throw new Error("Codex++ source CLI was not found. Run the installer once, then try again.");
  }
  const cli = (0, import_node_path17.join)(sourceRoot, "packages", "installer", "dist", "cli.js");
  if (!(0, import_node_fs20.existsSync)(cli)) {
    throw new Error("Codex++ source CLI was not found. Run the installer once, then try again.");
  }
  const pending = markSelfUpdateStarted(sourceRoot);
  startInstalledCli(cli, ["update", "--watcher"]);
  return pending;
});
import_electron6.ipcMain.handle("codexpp:get-watcher-health", () => getWatcherHealth(userRoot));
import_electron6.ipcMain.handle("codexpp:get-tweak-store", async () => {
  const store = await fetchTweakStoreRegistry();
  const registry = store.registry;
  const installed = new Map(tweakState.discovered.map((t) => [t.manifest.id, t]));
  const entries = shuffleStoreEntries(registry.entries, import_node_crypto7.randomInt);
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
privilegedHandle("codexpp:install-store-tweak", async (_e, id) => {
  const { registry } = await fetchTweakStoreRegistry();
  const entry = registry.entries.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Tweak store entry not found: ${id}`);
  assertStoreEntryPlatformCompatible(entry);
  assertStoreEntryRuntimeCompatible(entry);
  await installStoreTweak(entry);
  reloadTweaks("store-install", tweakLifecycleDeps);
  return { installed: entry.id };
});
privilegedHandle("codexpp:install-github-tweak", async (_e, id) => {
  return installGithubReleaseTweak(id);
});
privilegedHandle("codexpp:prepare-tweak-store-submission", async (_e, repoInput) => {
  return prepareTweakStoreSubmission(repoInput);
});
import_electron6.ipcMain.handle("codexpp:read-tweak-source", (_e, entryPath) => {
  const resolved = (0, import_node_path17.resolve)(entryPath);
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
import_electron6.ipcMain.handle(
  "codexpp:read-tweak-asset",
  (_e, tweakDir, relPath) => {
    const fs = require("node:fs");
    const dir = (0, import_node_path17.resolve)(tweakDir);
    if (!isPathInside(TWEAKS_DIR, dir)) {
      throw new Error("tweakDir outside tweaks dir");
    }
    const full = (0, import_node_path17.resolve)(dir, relPath);
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
import_electron6.ipcMain.on("codexpp:preload-log", (_e, level, msg) => {
  const lvl = level === "error" || level === "warn" ? level : "info";
  try {
    appendCappedLog((0, import_node_path17.join)(LOG_DIR, "preload.log"), `[${(/* @__PURE__ */ new Date()).toISOString()}] [${lvl}] ${msg}
`);
  } catch {
  }
});
privilegedHandle("codexpp:tweak-fs", (_e, op, id, p, c) => {
  const tweak = assertAuthorizedTweak(id, "filesystem");
  const dir = ensureTweakDataDir(userRoot, tweak.manifest.id);
  const fs = require("node:fs");
  if (op === "dataDir") return dir;
  const { full } = resolveTweakDataPath(userRoot, tweak.manifest.id, p);
  switch (op) {
    case "read":
      return fs.readFileSync(full, "utf8");
    case "write":
      return fs.writeFileSync(full, c ?? "", "utf8");
    case "exists":
      return fs.existsSync(full);
    default:
      throw new Error(`unknown op: ${op}`);
  }
});
import_electron6.ipcMain.handle("codexpp:user-paths", () => ({
  userRoot,
  runtimeDir,
  tweaksDir: TWEAKS_DIR,
  logDir: LOG_DIR
}));
import_electron6.ipcMain.handle("codexpp:codex-runtime-info", (_e, tweakId) => {
  assertAuthorizedTweak(tweakId, "codex-runtime");
  return currentRuntimeInfo();
});
import_electron6.ipcMain.handle("codexpp:codex-runtime-capabilities", (_e, tweakId) => {
  assertAuthorizedTweak(tweakId, "codex-runtime");
  return currentRuntimeCapabilities();
});
import_electron6.ipcMain.handle("codexpp:codex-cdp-status", (_e, tweakId) => {
  assertAuthorizedTweak(tweakId, "codex-cdp");
  return getCdpStatus();
});
import_electron6.ipcMain.handle("codexpp:codex-cdp-targets", (_e, tweakId) => {
  assertAuthorizedTweak(tweakId, "codex-cdp");
  return listCdpTargets();
});
privilegedHandle("codexpp:codex-window-create", (_e, tweakId, opts) => {
  assertAuthorizedTweak(tweakId, "codex-windows");
  return createCodexWindow(opts);
});
privilegedHandle("codexpp:codex-window-primary", (_e, tweakId) => {
  assertAuthorizedTweak(tweakId, "codex-windows");
  return getPrimaryCodexWindowRef();
});
privilegedHandle("codexpp:codex-window-focus", (_e, tweakId, windowId) => {
  assertAuthorizedTweak(tweakId, "codex-windows");
  return focusCodexWindow(windowId);
});
privilegedHandle("codexpp:codex-window-show", (_e, tweakId, windowId) => {
  assertAuthorizedTweak(tweakId, "codex-windows");
  return showCodexWindow(windowId);
});
privilegedHandle(
  "codexpp:codex-view-create",
  async (_e, tweakId, options) => {
    const tweak = assertAuthorizedTweak(tweakId, "codex-views");
    const ref = await createOwlView({ id: tweak.manifest.id, dir: tweak.dir }, options);
    return {
      id: ref.id,
      webContentsId: ref.webContentsId,
      parentWindowId: ref.parentWindowId
    };
  }
);
privilegedHandle(
  "codexpp:codex-view-call",
  (_e, tweakId, viewId, method, arg, arg2) => {
    const tweak = assertAuthorizedTweak(tweakId, "codex-views");
    return callOwlView(tweak.manifest.id, viewId, method, arg, arg2);
  }
);
import_electron6.ipcMain.handle("codexpp:codex-view-dispose-tweak", (_e, tweakId) => {
  assertTweakId(tweakId);
  disposeOwlViewsForTweak(tweakId);
});
privilegedHandle(
  "codexpp:native-load-module",
  (_e, tweakId, options) => {
    const tweak = assertAuthorizedTweak(tweakId, "native-module");
    const ref = nativeBridge.loadModule(tweakContext(tweak.manifest.id, "native-module"), options);
    return { id: ref.id, kind: ref.kind };
  }
);
privilegedHandle(
  "codexpp:native-module-request",
  (_e, tweakId, moduleId, method, payload, timeoutMs) => {
    const tweak = assertAuthorizedTweak(tweakId, "native-module");
    return nativeBridge.requestModule(tweak.manifest.id, moduleId, method, payload, timeoutMs);
  }
);
privilegedHandle("codexpp:native-module-dispose", (_e, tweakId, moduleId) => {
  const tweak = assertAuthorizedTweak(tweakId, "native-module");
  return nativeBridge.disposeModule(tweak.manifest.id, moduleId);
});
import_electron6.ipcMain.handle("codexpp:native-dispose-tweak", (_e, tweakId) => {
  assertTweakId(tweakId);
  nativeBridge.disposeTweak(tweakId);
});
privilegedHandle(
  "codexpp:native-create-panel",
  async (_e, tweakId, options) => {
    const tweak = assertAuthorizedTweak(tweakId, "native-view");
    const ref = await nativeBridge.createPanel(tweakContext(tweak.manifest.id, "native-view"), options);
    return { id: ref.id, windowId: ref.windowId };
  }
);
privilegedHandle(
  "codexpp:native-attach-view",
  async (_e, tweakId, options) => {
    const tweak = assertAuthorizedTweak(tweakId, "native-view");
    const ref = await nativeBridge.attachView(tweakContext(tweak.manifest.id, "native-view"), options);
    return { id: ref.id };
  }
);
privilegedHandle(
  "codexpp:native-instance-call",
  async (_e, tweakId, kind, instanceId, method, arg) => {
    const tweak = assertAuthorizedTweak(tweakId, "native-view");
    return nativeBridge.callInstance(tweak.manifest.id, kind, instanceId, method, arg);
  }
);
privilegedHandle(
  "codexpp:native-launch-helper",
  (_e, tweakId, options) => {
    const tweak = assertAuthorizedTweak(tweakId, "native-helper");
    const ref = nativeBridge.launchHelper(tweakContext(tweak.manifest.id, "native-helper"), options);
    return { id: ref.id, pid: ref.pid };
  }
);
privilegedHandle(
  "codexpp:native-helper-call",
  (_e, tweakId, helperId, method, payload, timeoutMs) => {
    const tweak = assertAuthorizedTweak(tweakId, "native-helper");
    return nativeBridge.callHelper(tweak.manifest.id, helperId, method, payload, timeoutMs);
  }
);
privilegedHandle("codexpp:codex-sessions-list", (_e, tweakId, extra) => {
  assertAuthorizedTweak(tweakId, "codex-sessions");
  if (extra !== void 0) throw new Error("unexpected payload");
  return sessionManager.listSessions();
});
privilegedHandle("codexpp:codex-sessions-status", (_e, tweakId, sessionId, extra) => {
  assertAuthorizedTweak(tweakId, "codex-sessions");
  if (typeof sessionId !== "string") throw new Error("invalid session id");
  assertSessionId(sessionId);
  if (extra !== void 0) throw new Error("unexpected payload");
  return sessionManager.getSessionStatus(sessionId);
});
privilegedHandle("codexpp:reveal", (_e, p) => {
  import_electron6.shell.openPath(p).catch(() => {
  });
});
import_electron6.ipcMain.handle("codexpp:open-external", (_e, url) => {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "github.com") {
    throw new Error("only github.com links can be opened from tweak metadata");
  }
  import_electron6.shell.openExternal(parsed.toString()).catch(() => {
  });
});
privilegedHandle("codexpp:copy-text", (_e, text) => {
  import_electron6.clipboard.writeText(String(text));
  return true;
});
import_electron6.ipcMain.handle("codexpp:reload-tweaks", () => {
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
  import_electron6.app.on("will-quit", () => watcher.close().catch(() => {
  }));
} catch (e) {
  log("error", "failed to start watcher:", e);
}
/*! Bundled license information:

chokidar/esm/index.js:
  (*! chokidar - MIT License (c) 2012 Paul Miller (paulmillr.com) *)
*/
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL21haW4udHMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2Nob2tpZGFyL2VzbS9pbmRleC5qcyIsICIuLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVhZGRpcnAvZXNtL2luZGV4LmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9jaG9raWRhci9lc20vaGFuZGxlci5qcyIsICIuLi9zcmMvbG9nZ2luZy50cyIsICIuLi9zcmMvY29kZXgtcnVudGltZS1wcm9iZS50cyIsICIuLi9zcmMvd2F0Y2hlci1oZWFsdGgudHMiLCAiLi4vc3JjL2lwYy1ndWFyZC50cyIsICIuLi9zcmMvdHdlYWstbGlmZWN5Y2xlLnRzIiwgIi4uL3NyYy9icm93c2VyLXVpLnRzIiwgIi4uL3NyYy9uYXRpdmUtcGF0aHMudHMiLCAiLi4vc3JjL3J1bnRpbWUtcGF0aHMudHMiLCAiLi4vc3JjL3R3ZWFrLXN0b3JlLnRzIiwgIi4uL3NyYy9jb25maWctc3RhdGUudHMiLCAiLi4vc3JjL3N0b3JlLWluc3RhbGwudHMiLCAiLi4vc3JjL3R3ZWFrLXN0b3JlLWludGVncml0eS50cyIsICIuLi9zcmMvc2VsZi11cGRhdGUudHMiLCAiLi4vc3JjL293bC12aWV3cy50cyIsICIuLi9zcmMvY29kZXgtd2luZG93cy50cyIsICIuLi9zcmMvdHdlYWstbWFpbi1ob3N0LnRzIiwgIi4uL3NyYy90d2Vhay1kaXNjb3ZlcnkudHMiLCAiLi4vc3JjL3N0b3JhZ2UudHMiLCAiLi4vc3JjL21jcC1zeW5jLnRzIiwgIi4uL3NyYy9uYXRpdmUtYnJpZGdlLnRzIiwgIi4uL3NyYy9jb2RleC1zZXNzaW9ucy9pZHMudHMiLCAiLi4vc3JjL2NvZGV4LXNlc3Npb25zL3BhdGhzLnRzIiwgIi4uL3NyYy9jb2RleC1zZXNzaW9ucy9sYXVuY2hlci50cyIsICIuLi9zcmMvY29kZXgtc2Vzc2lvbnMvbWFuYWdlci50cyIsICIuLi9zcmMvY29kZXgtc2Vzc2lvbnMvaG9zdC50cyIsICIuLi9zcmMvdHdlYWstcGVybWlzc2lvbnMudHMiLCAiLi4vc3JjL3R3ZWFrLWZzLXNhbmRib3gudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogTWFpbi1wcm9jZXNzIGJvb3RzdHJhcC4gTG9hZGVkIGJ5IHRoZSBhc2FyIGxvYWRlciBiZWZvcmUgQ29kZXgncyBvd25cbiAqIG1haW4gcHJvY2VzcyBjb2RlIHJ1bnMuIFdlIGhvb2sgYEJyb3dzZXJXaW5kb3dgIHNvIGV2ZXJ5IHdpbmRvdyBDb2RleFxuICogY3JlYXRlcyBnZXRzIG91ciBwcmVsb2FkIHNjcmlwdCBhdHRhY2hlZC4gV2UgYWxzbyBzdGFuZCB1cCBhbiBJUENcbiAqIGNoYW5uZWwgZm9yIHR3ZWFrcyB0byB0YWxrIHRvIHRoZSBtYWluIHByb2Nlc3MuXG4gKlxuICogV2UgYXJlIGluIENKUyBsYW5kIGhlcmUgKG1hdGNoZXMgRWxlY3Ryb24ncyBtYWluIHByb2Nlc3MgYW5kIENvZGV4J3Mgb3duXG4gKiBjb2RlKS4gVGhlIHJlbmRlcmVyLXNpZGUgcnVudGltZSBpcyBidW5kbGVkIHNlcGFyYXRlbHkgaW50byBwcmVsb2FkLmpzLlxuICovXG5cbmltcG9ydCB7IGFwcCwgY2xpcGJvYXJkLCBpcGNNYWluLCBzZXNzaW9uLCBzaGVsbCB9IGZyb20gXCJlbGVjdHJvblwiO1xuaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBqb2luLCByZXNvbHZlIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuaW1wb3J0IGNob2tpZGFyIGZyb20gXCJjaG9raWRhclwiO1xuaW1wb3J0IHsgYXBwZW5kQ2FwcGVkTG9nIH0gZnJvbSBcIi4vbG9nZ2luZ1wiO1xuaW1wb3J0IHsgZ2V0Q2RwU3RhdHVzLCBsaXN0Q2RwVGFyZ2V0cywgc2VsZWN0UHJlbG9hZFJlZ2lzdHJhdGlvbiB9IGZyb20gXCIuL2NvZGV4LXJ1bnRpbWUtcHJvYmVcIjtcbmltcG9ydCB7IGdldFdhdGNoZXJIZWFsdGggfSBmcm9tIFwiLi93YXRjaGVyLWhlYWx0aFwiO1xuaW1wb3J0IHtcbiAgcmVsb2FkVHdlYWtzLFxuICBzZXRUd2Vha0VuYWJsZWRBbmRSZWxvYWQsXG59IGZyb20gXCIuL3R3ZWFrLWxpZmVjeWNsZVwiO1xuaW1wb3J0IHtcbiAgYXNzZXJ0UHJpdmlsZWdlZElwY1NlbmRlcixcbiAgaXNMYXllckF1dG9VcGRhdGVFbmFibGVkLFxuICBpc1ByaXZpbGVnZWRJcGNTZW5kZXIsXG4gIHN0cmlwUmVuZGVyZXJVcGRhdGVSZXBvLFxufSBmcm9tIFwiLi9pcGMtZ3VhcmRcIjtcbmltcG9ydCB7IG1heWJlU3RhcnRCcm93c2VyVWlTZXJ2ZXIgfSBmcm9tIFwiLi9icm93c2VyLXVpXCI7XG5pbXBvcnQgeyBpc1BhdGhJbnNpZGUgfSBmcm9tIFwiLi9uYXRpdmUtcGF0aHNcIjtcbmltcG9ydCB7XG4gIENPREVYX1BMVVNQTFVTX1JFUE8sXG4gIENPREVYX1BMVVNQTFVTX1ZFUlNJT04sXG4gIEdVRVNUX1BSRUxPQURfUEFUSCxcbiAgTE9HX0RJUixcbiAgUFJFTE9BRF9QQVRILFxuICBUV0VBS1NfRElSLFxuICBUV0VBS19TVE9SRV9JTkRFWF9VUkwsXG4gIGxvZyxcbiAgcnVudGltZURpcixcbiAgdXNlclJvb3QsXG59IGZyb20gXCIuL3J1bnRpbWUtcGF0aHNcIjtcbmltcG9ydCB7XG4gIGlzQ29kZXhQbHVzUGx1c0F1dG9VcGRhdGVFbmFibGVkLFxuICBpc0NvZGV4UGx1c1BsdXNTYWZlTW9kZUVuYWJsZWQsXG4gIGlzVHdlYWtFbmFibGVkLFxuICByZWFkSW5zdGFsbGVyU3RhdGUsXG4gIHJlYWRTZWxmVXBkYXRlU3RhdGUsXG4gIHJlYWRTdGF0ZSxcbiAgc2V0Q29kZXhQbHVzUGx1c0F1dG9VcGRhdGUsXG4gIHNldENvZGV4UGx1c1BsdXNVcGRhdGVDb25maWcsXG4gIHR5cGUgU2VsZlVwZGF0ZUNoYW5uZWwsXG59IGZyb20gXCIuL2NvbmZpZy1zdGF0ZVwiO1xuaW1wb3J0IHtcbiAgYXNzZXJ0U3RvcmVFbnRyeVBsYXRmb3JtQ29tcGF0aWJsZSxcbiAgYXNzZXJ0U3RvcmVFbnRyeVJ1bnRpbWVDb21wYXRpYmxlLFxuICBmZXRjaFR3ZWFrU3RvcmVSZWdpc3RyeSxcbiAgaW5zdGFsbFN0b3JlVHdlYWssXG4gIHByZXBhcmVUd2Vha1N0b3JlU3VibWlzc2lvbixcbiAgc3RvcmVFbnRyeVBsYXRmb3JtQ29tcGF0aWJpbGl0eSxcbiAgc3RvcmVFbnRyeVJ1bnRpbWVDb21wYXRpYmlsaXR5LFxufSBmcm9tIFwiLi9zdG9yZS1pbnN0YWxsXCI7XG5pbXBvcnQgeyBzaHVmZmxlU3RvcmVFbnRyaWVzIH0gZnJvbSBcIi4vdHdlYWstc3RvcmVcIjtcbmltcG9ydCB7IHJhbmRvbUludCB9IGZyb20gXCJub2RlOmNyeXB0b1wiO1xuaW1wb3J0IHtcbiAgZGVzY3JpYmVJbnN0YWxsYXRpb25Tb3VyY2UsXG4gIGVuc3VyZUNvZGV4UGx1c1BsdXNVcGRhdGVDaGVjayxcbiAgZmFsbGJhY2tTb3VyY2VSb290LFxuICBpbnN0YWxsU3BhcmtsZVVwZGF0ZUhvb2ssXG4gIG1hcmtTZWxmVXBkYXRlU3RhcnRlZCxcbiAgc3RhcnRJbnN0YWxsZWRDbGksXG59IGZyb20gXCIuL3NlbGYtdXBkYXRlXCI7XG5pbXBvcnQge1xuICBjYWxsT3dsVmlldyxcbiAgY3JlYXRlT3dsVmlldyxcbiAgZGlzcG9zZUFsbE93bFZpZXdzLFxuICBkaXNwb3NlT3dsVmlld3NGb3JUd2VhayxcbiAgdW50cnVzdGVkV2ViQ29udGVudHNJZHMsXG59IGZyb20gXCIuL293bC12aWV3c1wiO1xuaW1wb3J0IHtcbiAgY3JlYXRlQ29kZXhXaW5kb3csXG4gIGZvY3VzQ29kZXhXaW5kb3csXG4gIGdldENvZGV4V2luZG93U2VydmljZXMsXG4gIGdldFByaW1hcnlDb2RleFdpbmRvd1JlZixcbiAgc2hvd0NvZGV4V2luZG93LFxuICB0eXBlIENvZGV4Q3JlYXRlV2luZG93T3B0aW9ucyxcbn0gZnJvbSBcIi4vY29kZXgtd2luZG93c1wiO1xuaW1wb3J0IHtcbiAgYXNzZXJ0QXV0aG9yaXplZFR3ZWFrLFxuICBhc3NlcnRUd2Vha0lkLFxuICBjdXJyZW50UnVudGltZUNhcGFiaWxpdGllcyxcbiAgY3VycmVudFJ1bnRpbWVJbmZvLFxuICBlbnN1cmVUd2Vha1VwZGF0ZUNoZWNrLFxuICBpbnN0YWxsR2l0aHViUmVsZWFzZVR3ZWFrLFxuICBsaXN0ZWRUd2Vha3NTbmFwc2hvdCxcbiAgbG9hZEFsbE1haW5Ud2Vha3MsXG4gIG5hdGl2ZUJyaWRnZSxcbiAgc3RvcEFsbE1haW5Ud2Vha3MsXG4gIHR3ZWFrQ29udGV4dCxcbiAgdHdlYWtMaWZlY3ljbGVEZXBzLFxuICB0d2Vha1N0YXRlLFxufSBmcm9tIFwiLi90d2Vhay1tYWluLWhvc3RcIjtcbmltcG9ydCB7IGVuc3VyZVR3ZWFrRGF0YURpciwgcmVzb2x2ZVR3ZWFrRGF0YVBhdGggfSBmcm9tIFwiLi90d2Vhay1mcy1zYW5kYm94XCI7XG5pbXBvcnQge1xuICBDb2RleFNlc3Npb25NYW5hZ2VyLFxuICBhc3NlcnRTZXNzaW9uSWQsXG4gIGNyZWF0ZU5vZGVDb2RleFByb2Nlc3NMYXVuY2hlcixcbiAgcmVzb2x2ZVRydXN0ZWRDb2RleEV4ZWN1dGFibGUsXG4gIHNldENvZGV4U2Vzc2lvbk1hbmFnZXIsXG59IGZyb20gXCIuL2NvZGV4LXNlc3Npb25zXCI7XG5pbXBvcnQgdHlwZSB7XG4gIENvZGV4Vmlld0NyZWF0ZU9wdGlvbnMsXG4gIE5hdGl2ZUhlbHBlckxhdW5jaE9wdGlvbnMsXG4gIE5hdGl2ZU1vZHVsZUxvYWRPcHRpb25zLFxuICBOYXRpdmVQYW5lbENyZWF0ZU9wdGlvbnMsXG4gIE5hdGl2ZVZpZXdBdHRhY2hPcHRpb25zLFxufSBmcm9tIFwiQGNvZGV4LXBsdXNwbHVzL3Nka1wiO1xuXG4vLyBPcHRpb25hbDogZW5hYmxlIENocm9tZSBEZXZUb29scyBQcm90b2NvbCBvbiBhIFRDUCBwb3J0IHNvIHdlIGNhbiBkcml2ZSB0aGVcbi8vIHJ1bm5pbmcgQ29kZXggZnJvbSBvdXRzaWRlIChjdXJsIGh0dHA6Ly9sb2NhbGhvc3Q6PHBvcnQ+L2pzb24sIGF0dGFjaCB2aWFcbi8vIENEUCBXZWJTb2NrZXQsIHRha2Ugc2NyZWVuc2hvdHMsIGV2YWx1YXRlIGluIHJlbmRlcmVyLCBldGMuKS4gQ29kZXgnc1xuLy8gcHJvZHVjdGlvbiBidWlsZCBzZXRzIHdlYlByZWZlcmVuY2VzLmRldlRvb2xzPWZhbHNlLCB3aGljaCBraWxscyB0aGVcbi8vIGluLXdpbmRvdyBEZXZUb29scyBzaG9ydGN1dCwgYnV0IGAtLXJlbW90ZS1kZWJ1Z2dpbmctcG9ydGAgd29ya3MgcmVnYXJkbGVzc1xuLy8gYmVjYXVzZSBpdCdzIGEgQ2hyb21pdW0gY29tbWFuZC1saW5lIHN3aXRjaCBwcm9jZXNzZWQgYmVmb3JlIGFwcCBpbml0LlxuLy9cbi8vIE9mZiBieSBkZWZhdWx0LiBTZXQgQ09ERVhQUF9SRU1PVEVfREVCVUc9MSAob3B0aW9uYWxseSBDT0RFWFBQX1JFTU9URV9ERUJVR19QT1JUKVxuLy8gdG8gdHVybiBpdCBvbi4gTXVzdCBiZSBhcHBlbmRlZCBiZWZvcmUgYGFwcGAgYmVjb21lcyByZWFkeTsgd2UncmUgYXQgbW9kdWxlXG4vLyB0b3AtbGV2ZWwgc28gdGhhdCdzIGZpbmUuXG5pZiAocHJvY2Vzcy5lbnYuQ09ERVhQUF9SRU1PVEVfREVCVUcgPT09IFwiMVwiKSB7XG4gIGNvbnN0IHBvcnQgPSBwcm9jZXNzLmVudi5DT0RFWFBQX1JFTU9URV9ERUJVR19QT1JUID8/IFwiOTIyMlwiO1xuICBhcHAuY29tbWFuZExpbmUuYXBwZW5kU3dpdGNoKFwicmVtb3RlLWRlYnVnZ2luZy1wb3J0XCIsIHBvcnQpO1xuICBsb2coXCJpbmZvXCIsIGByZW1vdGUgZGVidWdnaW5nIGVuYWJsZWQgb24gcG9ydCAke3BvcnR9YCk7XG59XG5cbi8vIFN1cmZhY2UgdW5oYW5kbGVkIGVycm9ycyBmcm9tIGFueXdoZXJlIGluIHRoZSBtYWluIHByb2Nlc3MgdG8gb3VyIGxvZy5cbnByb2Nlc3Mub24oXCJ1bmNhdWdodEV4Y2VwdGlvblwiLCAoZTogRXJyb3IgJiB7IGNvZGU/OiBzdHJpbmcgfSkgPT4ge1xuICBsb2coXCJlcnJvclwiLCBcInVuY2F1Z2h0RXhjZXB0aW9uXCIsIHsgY29kZTogZS5jb2RlLCBtZXNzYWdlOiBlLm1lc3NhZ2UsIHN0YWNrOiBlLnN0YWNrIH0pO1xufSk7XG5wcm9jZXNzLm9uKFwidW5oYW5kbGVkUmVqZWN0aW9uXCIsIChlKSA9PiB7XG4gIGxvZyhcImVycm9yXCIsIFwidW5oYW5kbGVkUmVqZWN0aW9uXCIsIHsgdmFsdWU6IFN0cmluZyhlKSB9KTtcbn0pO1xuXG5pbnN0YWxsU3BhcmtsZVVwZGF0ZUhvb2soKTtcblxuLy8gMS4gSG9vayBldmVyeSBzZXNzaW9uIHNvIG91ciBwcmVsb2FkIHJ1bnMgaW4gZXZlcnkgcmVuZGVyZXIuXG4vL1xuLy8gV2UgdXNlIEVsZWN0cm9uJ3MgbW9kZXJuIGBzZXNzaW9uLnJlZ2lzdGVyUHJlbG9hZFNjcmlwdGAgQVBJIChhZGRlZCBpblxuLy8gRWxlY3Ryb24gMzUpLiBUaGUgZGVwcmVjYXRlZCBgc2V0UHJlbG9hZHNgIHBhdGggc2lsZW50bHkgbm8tb3BzIGluIHNvbWVcbi8vIGNvbmZpZ3VyYXRpb25zIChub3RhYmx5IHdpdGggc2FuZGJveGVkIHJlbmRlcmVycyksIHNvIHJlZ2lzdGVyUHJlbG9hZFNjcmlwdFxuLy8gaXMgdGhlIG9ubHkgcmVsaWFibGUgd2F5IHRvIGluamVjdCBpbnRvIENvZGV4J3MgQnJvd3NlcldpbmRvd3MuXG5mdW5jdGlvbiByZWdpc3RlclByZWxvYWQoczogRWxlY3Ryb24uU2Vzc2lvbiwgbGFiZWw6IHN0cmluZywga2luZDogXCJmdWxsXCIgfCBcImd1ZXN0XCIgPSBcImZ1bGxcIik6IHZvaWQge1xuICBjb25zdCBmaWxlUGF0aCA9IGtpbmQgPT09IFwiZ3Vlc3RcIiAmJiBleGlzdHNTeW5jKEdVRVNUX1BSRUxPQURfUEFUSCkgPyBHVUVTVF9QUkVMT0FEX1BBVEggOiBQUkVMT0FEX1BBVEg7XG4gIGNvbnN0IGlkID0ga2luZCA9PT0gXCJndWVzdFwiID8gXCJjb2RleC1wbHVzcGx1cy1ndWVzdFwiIDogXCJjb2RleC1wbHVzcGx1c1wiO1xuICB0cnkge1xuICAgIGNvbnN0IHN0cmF0ZWd5ID0gc2VsZWN0UHJlbG9hZFJlZ2lzdHJhdGlvbihzKTtcbiAgICBpZiAoc3RyYXRlZ3kgPT09IFwicmVnaXN0ZXJQcmVsb2FkU2NyaXB0XCIpIHtcbiAgICAgIGNvbnN0IHJlZyA9IChzIGFzIHVua25vd24gYXMge1xuICAgICAgICByZWdpc3RlclByZWxvYWRTY3JpcHQ6IChvcHRzOiB7XG4gICAgICAgICAgdHlwZT86IFwiZnJhbWVcIiB8IFwic2VydmljZS13b3JrZXJcIjtcbiAgICAgICAgICBpZD86IHN0cmluZztcbiAgICAgICAgICBmaWxlUGF0aDogc3RyaW5nO1xuICAgICAgICB9KSA9PiBzdHJpbmc7XG4gICAgICB9KS5yZWdpc3RlclByZWxvYWRTY3JpcHQ7XG4gICAgICByZWcuY2FsbChzLCB7IHR5cGU6IFwiZnJhbWVcIiwgZmlsZVBhdGgsIGlkIH0pO1xuICAgICAgbG9nKFwiaW5mb1wiLCBgcHJlbG9hZCByZWdpc3RlcmVkIChyZWdpc3RlclByZWxvYWRTY3JpcHQpIG9uICR7bGFiZWx9OmAsIGZpbGVQYXRoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHN0cmF0ZWd5ID09PSBcInNldFByZWxvYWRzXCIpIHtcbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gcy5nZXRQcmVsb2FkcygpO1xuICAgICAgaWYgKCFleGlzdGluZy5pbmNsdWRlcyhmaWxlUGF0aCkpIHtcbiAgICAgICAgcy5zZXRQcmVsb2FkcyhbLi4uZXhpc3RpbmcsIGZpbGVQYXRoXSk7XG4gICAgICB9XG4gICAgICBsb2coXCJpbmZvXCIsIGBwcmVsb2FkIHJlZ2lzdGVyZWQgKHNldFByZWxvYWRzKSBvbiAke2xhYmVsfTpgLCBmaWxlUGF0aCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxvZyhcImVycm9yXCIsIGBwcmVsb2FkIHJlZ2lzdHJhdGlvbiBvbiAke2xhYmVsfSBmYWlsZWQ6IG5vIHNlc3Npb24gcHJlbG9hZCBBUElgKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChlIGluc3RhbmNlb2YgRXJyb3IgJiYgZS5tZXNzYWdlLmluY2x1ZGVzKFwiZXhpc3RpbmcgSURcIikpIHtcbiAgICAgIGxvZyhcImluZm9cIiwgYHByZWxvYWQgYWxyZWFkeSByZWdpc3RlcmVkIG9uICR7bGFiZWx9OmAsIFBSRUxPQURfUEFUSCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxvZyhcImVycm9yXCIsIGBwcmVsb2FkIHJlZ2lzdHJhdGlvbiBvbiAke2xhYmVsfSBmYWlsZWQ6YCwgZSk7XG4gIH1cbn1cblxuYXBwLndoZW5SZWFkeSgpLnRoZW4oKCkgPT4ge1xuICBsb2coXCJpbmZvXCIsIFwiYXBwIHJlYWR5IGZpcmVkXCIpO1xuICBpZiAoaXNDb2RleFBsdXNQbHVzU2FmZU1vZGVFbmFibGVkKCkpIHtcbiAgICBsb2coXCJ3YXJuXCIsIFwic2FmZSBtb2RlIGlzIGVuYWJsZWQ7IHByZWxvYWQgd2lsbCBub3QgYmUgcmVnaXN0ZXJlZFwiKTtcbiAgICByZXR1cm47XG4gIH1cbiAgcmVnaXN0ZXJQcmVsb2FkKHNlc3Npb24uZGVmYXVsdFNlc3Npb24sIFwiZGVmYXVsdFNlc3Npb25cIiwgXCJmdWxsXCIpO1xuICBtYXliZVN0YXJ0QnJvd3NlclVpU2VydmVyKHtcbiAgICBnZXRXaW5kb3dTZXJ2aWNlczogZ2V0Q29kZXhXaW5kb3dTZXJ2aWNlcyxcbiAgICBsb2csXG4gIH0pO1xufSk7XG5cbmFwcC5vbihcInNlc3Npb24tY3JlYXRlZFwiLCAocykgPT4ge1xuICBpZiAoaXNDb2RleFBsdXNQbHVzU2FmZU1vZGVFbmFibGVkKCkpIHJldHVybjtcbiAgaWYgKHMgPT09IHNlc3Npb24uZGVmYXVsdFNlc3Npb24pIHJldHVybjtcbiAgcmVnaXN0ZXJQcmVsb2FkKHMsIFwic2Vzc2lvbi1jcmVhdGVkXCIsIFwiZ3Vlc3RcIik7XG59KTtcblxuLy8gRElBR05PU1RJQzogbG9nIGV2ZXJ5IHdlYkNvbnRlbnRzIGNyZWF0aW9uLiBVc2VmdWwgZm9yIHZlcmlmeWluZyBvdXJcbi8vIHByZWxvYWQgcmVhY2hlcyBldmVyeSByZW5kZXJlciBDb2RleCBzcGF3bnMuXG5hcHAub24oXCJ3ZWItY29udGVudHMtY3JlYXRlZFwiLCAoX2UsIHdjKSA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3Qgd3AgPSAod2MgYXMgdW5rbm93biBhcyB7IGdldExhc3RXZWJQcmVmZXJlbmNlcz86ICgpID0+IFJlY29yZDxzdHJpbmcsIHVua25vd24+IH0pXG4gICAgICAuZ2V0TGFzdFdlYlByZWZlcmVuY2VzPy4oKTtcbiAgICBsb2coXCJpbmZvXCIsIFwid2ViLWNvbnRlbnRzLWNyZWF0ZWRcIiwge1xuICAgICAgaWQ6IHdjLmlkLFxuICAgICAgdHlwZTogd2MuZ2V0VHlwZSgpLFxuICAgICAgc2Vzc2lvbklzRGVmYXVsdDogd2Muc2Vzc2lvbiA9PT0gc2Vzc2lvbi5kZWZhdWx0U2Vzc2lvbixcbiAgICAgIHNhbmRib3g6IHdwPy5zYW5kYm94LFxuICAgICAgY29udGV4dElzb2xhdGlvbjogd3A/LmNvbnRleHRJc29sYXRpb24sXG4gICAgfSk7XG4gICAgd2Mub24oXCJwcmVsb2FkLWVycm9yXCIsIChfZXYsIHAsIGVycikgPT4ge1xuICAgICAgbG9nKFwiZXJyb3JcIiwgYHdjICR7d2MuaWR9IHByZWxvYWQtZXJyb3IgcGF0aD0ke3B9YCwgU3RyaW5nKGVycj8uc3RhY2sgPz8gZXJyKSk7XG4gICAgfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2coXCJlcnJvclwiLCBcIndlYi1jb250ZW50cy1jcmVhdGVkIGhhbmRsZXIgZmFpbGVkOlwiLCBTdHJpbmcoKGUgYXMgRXJyb3IpPy5zdGFjayA/PyBlKSk7XG4gIH1cbn0pO1xuXG5sb2coXCJpbmZvXCIsIFwibWFpbi50cyBldmFsdWF0ZWQ7IGFwcC5pc1JlYWR5PVwiICsgYXBwLmlzUmVhZHkoKSk7XG5pZiAoaXNDb2RleFBsdXNQbHVzU2FmZU1vZGVFbmFibGVkKCkpIHtcbiAgbG9nKFwid2FyblwiLCBcInNhZmUgbW9kZSBpcyBlbmFibGVkOyB0d2Vha3Mgd2lsbCBub3QgYmUgbG9hZGVkXCIpO1xufVxuXG5jb25zdCBzZXNzaW9uTWFuYWdlciA9IG5ldyBDb2RleFNlc3Npb25NYW5hZ2VyKHtcbiAgdXNlclJvb3QsXG4gIGxhdW5jaGVyOiBjcmVhdGVOb2RlQ29kZXhQcm9jZXNzTGF1bmNoZXIoe1xuICAgIHJlc29sdmVFeGVjdXRhYmxlOiAoKSA9PiB7XG4gICAgICBsZXQgcmVzb3VyY2VzUGF0aDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gICAgICBsZXQgYXBwUGF0aDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBpbmZvID0gY3VycmVudFJ1bnRpbWVJbmZvKCk7XG4gICAgICAgIHJlc291cmNlc1BhdGggPSBpbmZvLnJlc291cmNlc1BhdGg7XG4gICAgICAgIGFwcFBhdGggPSBpbmZvLmFwcFBhdGg7XG4gICAgICB9IGNhdGNoIHt9XG4gICAgICBpZiAoIXJlc291cmNlc1BhdGgpIHtcbiAgICAgICAgY29uc3QgZnJvbVByb2Nlc3MgPSAocHJvY2VzcyBhcyBOb2RlSlMuUHJvY2VzcyAmIHsgcmVzb3VyY2VzUGF0aD86IHN0cmluZyB9KS5yZXNvdXJjZXNQYXRoO1xuICAgICAgICBpZiAodHlwZW9mIGZyb21Qcm9jZXNzID09PSBcInN0cmluZ1wiKSByZXNvdXJjZXNQYXRoID0gZnJvbVByb2Nlc3M7XG4gICAgICB9XG4gICAgICBpZiAoIWFwcFBhdGgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhcHBQYXRoID0gYXBwLmdldEFwcFBhdGgoKTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgYXBwUGF0aCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXNvbHZlVHJ1c3RlZENvZGV4RXhlY3V0YWJsZSh7XG4gICAgICAgIHBsYXRmb3JtOiBwcm9jZXNzLnBsYXRmb3JtLFxuICAgICAgICByZXNvdXJjZXNQYXRoLFxuICAgICAgICBhcHBQYXRoLFxuICAgICAgfSk7XG4gICAgfSxcbiAgfSksXG4gIGxvZyxcbn0pO1xuc2V0Q29kZXhTZXNzaW9uTWFuYWdlcihzZXNzaW9uTWFuYWdlcik7XG5cbi8vIDIuIEluaXRpYWwgdHdlYWsgZGlzY292ZXJ5ICsgbWFpbi1zY29wZSBsb2FkLlxubG9hZEFsbE1haW5Ud2Vha3MoKTtcblxubGV0IHNlc3Npb25TaHV0ZG93blN0YXJ0ZWQgPSBmYWxzZTtcbmFwcC5vbihcIndpbGwtcXVpdFwiLCAoZXZlbnQpID0+IHtcbiAgc3RvcEFsbE1haW5Ud2Vha3MoKTtcbiAgbmF0aXZlQnJpZGdlLmRpc3Bvc2VBbGwoKTtcbiAgZGlzcG9zZUFsbE93bFZpZXdzKCk7XG4gIC8vIEJlc3QtZWZmb3J0IGZsdXNoIG9mIGFueSBwZW5kaW5nIHN0b3JhZ2Ugd3JpdGVzLlxuICBmb3IgKGNvbnN0IHQgb2YgdHdlYWtTdGF0ZS5sb2FkZWRNYWluLnZhbHVlcygpKSB7XG4gICAgdHJ5IHtcbiAgICAgIHQuc3RvcmFnZS5mbHVzaCgpO1xuICAgIH0gY2F0Y2gge31cbiAgfVxuICBpZiAoc2Vzc2lvblNodXRkb3duU3RhcnRlZCkgcmV0dXJuO1xuICBpZiAoIXNlc3Npb25NYW5hZ2VyLmhhc0xpdmVDaGlsZHJlbigpKSByZXR1cm47XG4gIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gIHNlc3Npb25TaHV0ZG93blN0YXJ0ZWQgPSB0cnVlO1xuICBjb25zdCBmYWlsU2FmZSA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgIGFwcC5xdWl0KCk7XG4gIH0sIDMwMDApO1xuICB2b2lkIHNlc3Npb25NYW5hZ2VyLnNodXRkb3duQWxsKHsgdGltZW91dE1zOiAzMDAwIH0pLmZpbmFsbHkoKCkgPT4ge1xuICAgIGNsZWFyVGltZW91dChmYWlsU2FmZSk7XG4gICAgYXBwLnF1aXQoKTtcbiAgfSk7XG59KTtcblxuZnVuY3Rpb24gcHJpdmlsZWdlZEhhbmRsZShjaGFubmVsOiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogYW55W10pID0+IHVua25vd24pOiB2b2lkIHtcbiAgaXBjTWFpbi5oYW5kbGUoY2hhbm5lbCwgKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgYXNzZXJ0UHJpdmlsZWdlZElwY1NlbmRlcihjaGFubmVsLCBldmVudC5zZW5kZXIsIHVudHJ1c3RlZFdlYkNvbnRlbnRzSWRzKTtcbiAgICByZXR1cm4gbGlzdGVuZXIoZXZlbnQsIC4uLmFyZ3MpO1xuICB9KTtcbn1cblxuaXBjTWFpbi5vbihcImNvZGV4cHA6cHJpdmlsZWdlZC1mcmFtZVwiLCAoZXZlbnQpID0+IHtcbiAgZXZlbnQucmV0dXJuVmFsdWUgPSBpc1ByaXZpbGVnZWRJcGNTZW5kZXIoZXZlbnQuc2VuZGVyLCB1bnRydXN0ZWRXZWJDb250ZW50c0lkcyk7XG59KTtcblxuLy8gMy4gSVBDOiBleHBvc2UgdHdlYWsgbWV0YWRhdGEgKyByZXZlYWwtaW4tZmluZGVyLlxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmxpc3QtdHdlYWtzXCIsIGFzeW5jIChfZSwgb3B0cz86IHsgZm9yY2U/OiBib29sZWFuIH0gfCBib29sZWFuKSA9PiB7XG4gIGNvbnN0IGZvcmNlID0gb3B0cyA9PT0gdHJ1ZSB8fCAob3B0cyAhPT0gbnVsbCAmJiB0eXBlb2Ygb3B0cyA9PT0gXCJvYmplY3RcIiAmJiBvcHRzLmZvcmNlID09PSB0cnVlKTtcbiAgYXdhaXQgUHJvbWlzZS5hbGwodHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLm1hcCgodCkgPT4gZW5zdXJlVHdlYWtVcGRhdGVDaGVjayh0LCBmb3JjZSkpKTtcbiAgcmV0dXJuIGxpc3RlZFR3ZWFrc1NuYXBzaG90KCk7XG59KTtcblxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmdldC10d2Vhay1lbmFibGVkXCIsIChfZSwgaWQ6IHN0cmluZykgPT4gaXNUd2Vha0VuYWJsZWQoaWQpKTtcbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpzZXQtdHdlYWstZW5hYmxlZFwiLCAoX2UsIGlkOiBzdHJpbmcsIGVuYWJsZWQ6IGJvb2xlYW4pID0+IHtcbiAgcmV0dXJuIHNldFR3ZWFrRW5hYmxlZEFuZFJlbG9hZChpZCwgZW5hYmxlZCwgdHdlYWtMaWZlY3ljbGVEZXBzKTtcbn0pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Z2V0LWNvbmZpZ1wiLCAoKSA9PiB7XG4gIGNvbnN0IHMgPSByZWFkU3RhdGUoKTtcbiAgY29uc3QgaW5zdGFsbGVyU3RhdGUgPSByZWFkSW5zdGFsbGVyU3RhdGUoKTtcbiAgY29uc3Qgc291cmNlUm9vdCA9IGluc3RhbGxlclN0YXRlPy5zb3VyY2VSb290ID8/IGZhbGxiYWNrU291cmNlUm9vdCgpO1xuICByZXR1cm4ge1xuICAgIHZlcnNpb246IENPREVYX1BMVVNQTFVTX1ZFUlNJT04sXG4gICAgYXV0b1VwZGF0ZTogaXNMYXllckF1dG9VcGRhdGVFbmFibGVkKHMuY29kZXhQbHVzUGx1cz8uYXV0b1VwZGF0ZSksXG4gICAgc2FmZU1vZGU6IHMuY29kZXhQbHVzUGx1cz8uc2FmZU1vZGUgPT09IHRydWUsXG4gICAgdXBkYXRlQ2hhbm5lbDogcy5jb2RleFBsdXNQbHVzPy51cGRhdGVDaGFubmVsID8/IFwic3RhYmxlXCIsXG4gICAgdXBkYXRlUmVwbzogcy5jb2RleFBsdXNQbHVzPy51cGRhdGVSZXBvID8/IENPREVYX1BMVVNQTFVTX1JFUE8sXG4gICAgdXBkYXRlUmVmOiBzLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZVJlZiA/PyBcIlwiLFxuICAgIHVwZGF0ZUNoZWNrOiBzLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZUNoZWNrID8/IG51bGwsXG4gICAgc2VsZlVwZGF0ZTogcmVhZFNlbGZVcGRhdGVTdGF0ZSgpLFxuICAgIGluc3RhbGxhdGlvblNvdXJjZTogZGVzY3JpYmVJbnN0YWxsYXRpb25Tb3VyY2Uoc291cmNlUm9vdCksXG4gIH07XG59KTtcblxucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6c2V0LWF1dG8tdXBkYXRlXCIsIChfZSwgZW5hYmxlZDogYm9vbGVhbikgPT4ge1xuICBzZXRDb2RleFBsdXNQbHVzQXV0b1VwZGF0ZSghIWVuYWJsZWQpO1xuICByZXR1cm4geyBhdXRvVXBkYXRlOiBpc0NvZGV4UGx1c1BsdXNBdXRvVXBkYXRlRW5hYmxlZCgpIH07XG59KTtcblxucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6c2V0LXVwZGF0ZS1jb25maWdcIiwgKF9lLCBjb25maWc6IHtcbiAgdXBkYXRlQ2hhbm5lbD86IFNlbGZVcGRhdGVDaGFubmVsO1xuICB1cGRhdGVSZXBvPzogc3RyaW5nO1xuICB1cGRhdGVSZWY/OiBzdHJpbmc7XG59KSA9PiB7XG4gIHNldENvZGV4UGx1c1BsdXNVcGRhdGVDb25maWcoc3RyaXBSZW5kZXJlclVwZGF0ZVJlcG8oY29uZmlnID8/IHt9KSk7XG4gIGNvbnN0IHMgPSByZWFkU3RhdGUoKTtcbiAgcmV0dXJuIHtcbiAgICB1cGRhdGVDaGFubmVsOiBzLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZUNoYW5uZWwgPz8gXCJzdGFibGVcIixcbiAgICB1cGRhdGVSZXBvOiBzLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZVJlcG8gPz8gQ09ERVhfUExVU1BMVVNfUkVQTyxcbiAgICB1cGRhdGVSZWY6IHMuY29kZXhQbHVzUGx1cz8udXBkYXRlUmVmID8/IFwiXCIsXG4gIH07XG59KTtcblxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmNoZWNrLWNvZGV4cHAtdXBkYXRlXCIsIGFzeW5jIChfZSwgZm9yY2U/OiBib29sZWFuKSA9PiB7XG4gIHJldHVybiBlbnN1cmVDb2RleFBsdXNQbHVzVXBkYXRlQ2hlY2soZm9yY2UgPT09IHRydWUpO1xufSk7XG5cbnByaXZpbGVnZWRIYW5kbGUoXCJjb2RleHBwOnJ1bi1jb2RleHBwLXVwZGF0ZVwiLCBhc3luYyAoKSA9PiB7XG4gIGNvbnN0IHNvdXJjZVJvb3QgPSByZWFkSW5zdGFsbGVyU3RhdGUoKT8uc291cmNlUm9vdCA/PyBmYWxsYmFja1NvdXJjZVJvb3QoKTtcbiAgaWYgKCFzb3VyY2VSb290KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ29kZXgrKyBzb3VyY2UgQ0xJIHdhcyBub3QgZm91bmQuIFJ1biB0aGUgaW5zdGFsbGVyIG9uY2UsIHRoZW4gdHJ5IGFnYWluLlwiKTtcbiAgfVxuICBjb25zdCBjbGkgPSBqb2luKHNvdXJjZVJvb3QsIFwicGFja2FnZXNcIiwgXCJpbnN0YWxsZXJcIiwgXCJkaXN0XCIsIFwiY2xpLmpzXCIpO1xuICBpZiAoIWV4aXN0c1N5bmMoY2xpKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNvZGV4Kysgc291cmNlIENMSSB3YXMgbm90IGZvdW5kLiBSdW4gdGhlIGluc3RhbGxlciBvbmNlLCB0aGVuIHRyeSBhZ2Fpbi5cIik7XG4gIH1cbiAgY29uc3QgcGVuZGluZyA9IG1hcmtTZWxmVXBkYXRlU3RhcnRlZChzb3VyY2VSb290KTtcbiAgc3RhcnRJbnN0YWxsZWRDbGkoY2xpLCBbXCJ1cGRhdGVcIiwgXCItLXdhdGNoZXJcIl0pO1xuICByZXR1cm4gcGVuZGluZztcbn0pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Z2V0LXdhdGNoZXItaGVhbHRoXCIsICgpID0+IGdldFdhdGNoZXJIZWFsdGgodXNlclJvb3QhKSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpnZXQtdHdlYWstc3RvcmVcIiwgYXN5bmMgKCkgPT4ge1xuICBjb25zdCBzdG9yZSA9IGF3YWl0IGZldGNoVHdlYWtTdG9yZVJlZ2lzdHJ5KCk7XG4gIGNvbnN0IHJlZ2lzdHJ5ID0gc3RvcmUucmVnaXN0cnk7XG4gIGNvbnN0IGluc3RhbGxlZCA9IG5ldyBNYXAodHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLm1hcCgodCkgPT4gW3QubWFuaWZlc3QuaWQsIHRdKSk7XG4gIGNvbnN0IGVudHJpZXMgPSBzaHVmZmxlU3RvcmVFbnRyaWVzKHJlZ2lzdHJ5LmVudHJpZXMsIHJhbmRvbUludCk7XG4gIHJldHVybiB7XG4gICAgLi4ucmVnaXN0cnksXG4gICAgc291cmNlVXJsOiBUV0VBS19TVE9SRV9JTkRFWF9VUkwsXG4gICAgZmV0Y2hlZEF0OiBzdG9yZS5mZXRjaGVkQXQsXG4gICAgZW50cmllczogZW50cmllcy5tYXAoKGVudHJ5KSA9PiB7XG4gICAgICBjb25zdCBsb2NhbCA9IGluc3RhbGxlZC5nZXQoZW50cnkuaWQpO1xuICAgICAgY29uc3QgcGxhdGZvcm0gPSBzdG9yZUVudHJ5UGxhdGZvcm1Db21wYXRpYmlsaXR5KGVudHJ5KTtcbiAgICAgIGNvbnN0IHJ1bnRpbWUgPSBzdG9yZUVudHJ5UnVudGltZUNvbXBhdGliaWxpdHkoZW50cnkpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4uZW50cnksXG4gICAgICAgIHBsYXRmb3JtLFxuICAgICAgICBydW50aW1lLFxuICAgICAgICBpbnN0YWxsZWQ6IGxvY2FsXG4gICAgICAgICAgPyB7XG4gICAgICAgICAgICAgIHZlcnNpb246IGxvY2FsLm1hbmlmZXN0LnZlcnNpb24sXG4gICAgICAgICAgICAgIGVuYWJsZWQ6IGlzVHdlYWtFbmFibGVkKGxvY2FsLm1hbmlmZXN0LmlkKSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICA6IG51bGwsXG4gICAgICB9O1xuICAgIH0pLFxuICB9O1xufSk7XG5cbnByaXZpbGVnZWRIYW5kbGUoXCJjb2RleHBwOmluc3RhbGwtc3RvcmUtdHdlYWtcIiwgYXN5bmMgKF9lLCBpZDogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IHsgcmVnaXN0cnkgfSA9IGF3YWl0IGZldGNoVHdlYWtTdG9yZVJlZ2lzdHJ5KCk7XG4gIGNvbnN0IGVudHJ5ID0gcmVnaXN0cnkuZW50cmllcy5maW5kKChjYW5kaWRhdGUpID0+IGNhbmRpZGF0ZS5pZCA9PT0gaWQpO1xuICBpZiAoIWVudHJ5KSB0aHJvdyBuZXcgRXJyb3IoYFR3ZWFrIHN0b3JlIGVudHJ5IG5vdCBmb3VuZDogJHtpZH1gKTtcbiAgYXNzZXJ0U3RvcmVFbnRyeVBsYXRmb3JtQ29tcGF0aWJsZShlbnRyeSk7XG4gIGFzc2VydFN0b3JlRW50cnlSdW50aW1lQ29tcGF0aWJsZShlbnRyeSk7XG4gIGF3YWl0IGluc3RhbGxTdG9yZVR3ZWFrKGVudHJ5KTtcbiAgcmVsb2FkVHdlYWtzKFwic3RvcmUtaW5zdGFsbFwiLCB0d2Vha0xpZmVjeWNsZURlcHMpO1xuICByZXR1cm4geyBpbnN0YWxsZWQ6IGVudHJ5LmlkIH07XG59KTtcblxucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6aW5zdGFsbC1naXRodWItdHdlYWtcIiwgYXN5bmMgKF9lLCBpZDogc3RyaW5nKSA9PiB7XG4gIHJldHVybiBpbnN0YWxsR2l0aHViUmVsZWFzZVR3ZWFrKGlkKTtcbn0pO1xuXG5wcml2aWxlZ2VkSGFuZGxlKFwiY29kZXhwcDpwcmVwYXJlLXR3ZWFrLXN0b3JlLXN1Ym1pc3Npb25cIiwgYXN5bmMgKF9lLCByZXBvSW5wdXQ6IHN0cmluZykgPT4ge1xuICByZXR1cm4gcHJlcGFyZVR3ZWFrU3RvcmVTdWJtaXNzaW9uKHJlcG9JbnB1dCk7XG59KTtcblxuLy8gU2FuZGJveGVkIHJlbmRlcmVyIHByZWxvYWQgY2FuJ3QgdXNlIE5vZGUgZnMgdG8gcmVhZCB0d2VhayBzb3VyY2UuIE1haW5cbi8vIHJlYWRzIGl0IG9uIHRoZSByZW5kZXJlcidzIGJlaGFsZi4gUGF0aCBtdXN0IGxpdmUgdW5kZXIgdHdlYWtzRGlyIGZvclxuLy8gc2VjdXJpdHkgXHUyMDE0IHdlIHJlZnVzZSBhbnl0aGluZyBlbHNlLlxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOnJlYWQtdHdlYWstc291cmNlXCIsIChfZSwgZW50cnlQYXRoOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgcmVzb2x2ZWQgPSByZXNvbHZlKGVudHJ5UGF0aCk7XG4gIGlmICghaXNQYXRoSW5zaWRlKFRXRUFLU19ESVIsIHJlc29sdmVkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcInBhdGggb3V0c2lkZSB0d2Vha3MgZGlyXCIpO1xuICB9XG4gIHJldHVybiByZXF1aXJlKFwibm9kZTpmc1wiKS5yZWFkRmlsZVN5bmMocmVzb2x2ZWQsIFwidXRmOFwiKTtcbn0pO1xuXG4vKipcbiAqIFJlYWQgYW4gYXJiaXRyYXJ5IGFzc2V0IGZpbGUgZnJvbSBpbnNpZGUgYSB0d2VhaydzIGRpcmVjdG9yeSBhbmQgcmV0dXJuIGl0XG4gKiBhcyBhIGBkYXRhOmAgVVJMLiBVc2VkIGJ5IHRoZSBzZXR0aW5ncyBpbmplY3RvciB0byByZW5kZXIgbWFuaWZlc3QgaWNvbnNcbiAqICh0aGUgcmVuZGVyZXIgaXMgc2FuZGJveGVkOyBgZmlsZTovL2Agd29uJ3QgbG9hZCkuXG4gKlxuICogU2VjdXJpdHk6IGNhbGxlciBwYXNzZXMgYHR3ZWFrRGlyYCBhbmQgYHJlbFBhdGhgOyB3ZSAoMSkgcmVxdWlyZSB0d2Vha0RpclxuICogdG8gbGl2ZSB1bmRlciBUV0VBS1NfRElSLCAoMikgcmVzb2x2ZSByZWxQYXRoIGFnYWluc3QgaXQgYW5kIHJlLWNoZWNrIHRoZVxuICogcmVzdWx0IHN0aWxsIGxpdmVzIHVuZGVyIFRXRUFLU19ESVIsICgzKSBjYXAgb3V0cHV0IHNpemUgYXQgMSBNaUIuXG4gKi9cbmNvbnN0IEFTU0VUX01BWF9CWVRFUyA9IDEwMjQgKiAxMDI0O1xuY29uc3QgTUlNRV9CWV9FWFQ6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIFwiLnBuZ1wiOiBcImltYWdlL3BuZ1wiLFxuICBcIi5qcGdcIjogXCJpbWFnZS9qcGVnXCIsXG4gIFwiLmpwZWdcIjogXCJpbWFnZS9qcGVnXCIsXG4gIFwiLmdpZlwiOiBcImltYWdlL2dpZlwiLFxuICBcIi53ZWJwXCI6IFwiaW1hZ2Uvd2VicFwiLFxuICBcIi5zdmdcIjogXCJpbWFnZS9zdmcreG1sXCIsXG4gIFwiLmljb1wiOiBcImltYWdlL3gtaWNvblwiLFxufTtcbmlwY01haW4uaGFuZGxlKFxuICBcImNvZGV4cHA6cmVhZC10d2Vhay1hc3NldFwiLFxuICAoX2UsIHR3ZWFrRGlyOiBzdHJpbmcsIHJlbFBhdGg6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IGZzID0gcmVxdWlyZShcIm5vZGU6ZnNcIikgYXMgdHlwZW9mIGltcG9ydChcIm5vZGU6ZnNcIik7XG4gICAgY29uc3QgZGlyID0gcmVzb2x2ZSh0d2Vha0Rpcik7XG4gICAgaWYgKCFpc1BhdGhJbnNpZGUoVFdFQUtTX0RJUiwgZGlyKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwidHdlYWtEaXIgb3V0c2lkZSB0d2Vha3MgZGlyXCIpO1xuICAgIH1cbiAgICBjb25zdCBmdWxsID0gcmVzb2x2ZShkaXIsIHJlbFBhdGgpO1xuICAgIGlmICghaXNQYXRoSW5zaWRlKGRpciwgZnVsbCkgfHwgZnVsbCA9PT0gZGlyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwYXRoIHRyYXZlcnNhbFwiKTtcbiAgICB9XG4gICAgY29uc3Qgc3RhdCA9IGZzLnN0YXRTeW5jKGZ1bGwpO1xuICAgIGlmIChzdGF0LnNpemUgPiBBU1NFVF9NQVhfQllURVMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgYXNzZXQgdG9vIGxhcmdlICgke3N0YXQuc2l6ZX0gPiAke0FTU0VUX01BWF9CWVRFU30pYCk7XG4gICAgfVxuICAgIGNvbnN0IGV4dCA9IGZ1bGwuc2xpY2UoZnVsbC5sYXN0SW5kZXhPZihcIi5cIikpLnRvTG93ZXJDYXNlKCk7XG4gICAgY29uc3QgbWltZSA9IE1JTUVfQllfRVhUW2V4dF0gPz8gXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIjtcbiAgICBjb25zdCBidWYgPSBmcy5yZWFkRmlsZVN5bmMoZnVsbCk7XG4gICAgcmV0dXJuIGBkYXRhOiR7bWltZX07YmFzZTY0LCR7YnVmLnRvU3RyaW5nKFwiYmFzZTY0XCIpfWA7XG4gIH0sXG4pO1xuXG4vLyBTYW5kYm94ZWQgcHJlbG9hZCBjYW4ndCB3cml0ZSBsb2dzIHRvIGRpc2s7IGZvcndhcmQgdG8gdXMgdmlhIElQQy5cbmlwY01haW4ub24oXCJjb2RleHBwOnByZWxvYWQtbG9nXCIsIChfZSwgbGV2ZWw6IFwiaW5mb1wiIHwgXCJ3YXJuXCIgfCBcImVycm9yXCIsIG1zZzogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IGx2bCA9IGxldmVsID09PSBcImVycm9yXCIgfHwgbGV2ZWwgPT09IFwid2FyblwiID8gbGV2ZWwgOiBcImluZm9cIjtcbiAgdHJ5IHtcbiAgICBhcHBlbmRDYXBwZWRMb2coam9pbihMT0dfRElSLCBcInByZWxvYWQubG9nXCIpLCBgWyR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpfV0gWyR7bHZsfV0gJHttc2d9XFxuYCk7XG4gIH0gY2F0Y2gge31cbn0pO1xuXG4vLyBTYW5kYm94LXNhZmUgZmlsZXN5c3RlbSBvcHMgZm9yIHJlbmRlcmVyLXNjb3BlIHR3ZWFrcy4gRWFjaCB0d2VhayBnZXRzXG4vLyBhIHNhbmRib3hlZCBkaXIgdW5kZXIgdXNlclJvb3QvdHdlYWstZGF0YS88aWQ+LiBSZW5kZXJlciBzaWRlIGNhbGxzIHRoZXNlXG4vLyBvdmVyIElQQyBpbnN0ZWFkIG9mIHVzaW5nIE5vZGUgZnMgZGlyZWN0bHkuXG5wcml2aWxlZ2VkSGFuZGxlKFwiY29kZXhwcDp0d2Vhay1mc1wiLCAoX2UsIG9wOiBzdHJpbmcsIGlkOiBzdHJpbmcsIHA6IHN0cmluZywgYz86IHN0cmluZykgPT4ge1xuICBjb25zdCB0d2VhayA9IGFzc2VydEF1dGhvcml6ZWRUd2VhayhpZCwgXCJmaWxlc3lzdGVtXCIpO1xuICBjb25zdCBkaXIgPSBlbnN1cmVUd2Vha0RhdGFEaXIodXNlclJvb3QhLCB0d2Vhay5tYW5pZmVzdC5pZCk7XG4gIGNvbnN0IGZzID0gcmVxdWlyZShcIm5vZGU6ZnNcIikgYXMgdHlwZW9mIGltcG9ydChcIm5vZGU6ZnNcIik7XG4gIGlmIChvcCA9PT0gXCJkYXRhRGlyXCIpIHJldHVybiBkaXI7XG4gIGNvbnN0IHsgZnVsbCB9ID0gcmVzb2x2ZVR3ZWFrRGF0YVBhdGgodXNlclJvb3QhLCB0d2Vhay5tYW5pZmVzdC5pZCwgcCk7XG4gIHN3aXRjaCAob3ApIHtcbiAgICBjYXNlIFwicmVhZFwiOiByZXR1cm4gZnMucmVhZEZpbGVTeW5jKGZ1bGwsIFwidXRmOFwiKTtcbiAgICBjYXNlIFwid3JpdGVcIjogcmV0dXJuIGZzLndyaXRlRmlsZVN5bmMoZnVsbCwgYyA/PyBcIlwiLCBcInV0ZjhcIik7XG4gICAgY2FzZSBcImV4aXN0c1wiOiByZXR1cm4gZnMuZXhpc3RzU3luYyhmdWxsKTtcbiAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoYHVua25vd24gb3A6ICR7b3B9YCk7XG4gIH1cbn0pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6dXNlci1wYXRoc1wiLCAoKSA9PiAoe1xuICB1c2VyUm9vdCxcbiAgcnVudGltZURpcixcbiAgdHdlYWtzRGlyOiBUV0VBS1NfRElSLFxuICBsb2dEaXI6IExPR19ESVIsXG59KSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpjb2RleC1ydW50aW1lLWluZm9cIiwgKF9lLCB0d2Vha0lkOiBzdHJpbmcpID0+IHtcbiAgYXNzZXJ0QXV0aG9yaXplZFR3ZWFrKHR3ZWFrSWQsIFwiY29kZXgtcnVudGltZVwiKTtcbiAgcmV0dXJuIGN1cnJlbnRSdW50aW1lSW5mbygpO1xufSk7XG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Y29kZXgtcnVudGltZS1jYXBhYmlsaXRpZXNcIiwgKF9lLCB0d2Vha0lkOiBzdHJpbmcpID0+IHtcbiAgYXNzZXJ0QXV0aG9yaXplZFR3ZWFrKHR3ZWFrSWQsIFwiY29kZXgtcnVudGltZVwiKTtcbiAgcmV0dXJuIGN1cnJlbnRSdW50aW1lQ2FwYWJpbGl0aWVzKCk7XG59KTtcbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpjb2RleC1jZHAtc3RhdHVzXCIsIChfZSwgdHdlYWtJZDogc3RyaW5nKSA9PiB7XG4gIGFzc2VydEF1dGhvcml6ZWRUd2Vhayh0d2Vha0lkLCBcImNvZGV4LWNkcFwiKTtcbiAgcmV0dXJuIGdldENkcFN0YXR1cygpO1xufSk7XG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Y29kZXgtY2RwLXRhcmdldHNcIiwgKF9lLCB0d2Vha0lkOiBzdHJpbmcpID0+IHtcbiAgYXNzZXJ0QXV0aG9yaXplZFR3ZWFrKHR3ZWFrSWQsIFwiY29kZXgtY2RwXCIpO1xuICByZXR1cm4gbGlzdENkcFRhcmdldHMoKTtcbn0pO1xucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6Y29kZXgtd2luZG93LWNyZWF0ZVwiLCAoX2UsIHR3ZWFrSWQ6IHN0cmluZywgb3B0czogQ29kZXhDcmVhdGVXaW5kb3dPcHRpb25zKSA9PiB7XG4gIGFzc2VydEF1dGhvcml6ZWRUd2Vhayh0d2Vha0lkLCBcImNvZGV4LXdpbmRvd3NcIik7XG4gIHJldHVybiBjcmVhdGVDb2RleFdpbmRvdyhvcHRzKTtcbn0pO1xucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6Y29kZXgtd2luZG93LXByaW1hcnlcIiwgKF9lLCB0d2Vha0lkOiBzdHJpbmcpID0+IHtcbiAgYXNzZXJ0QXV0aG9yaXplZFR3ZWFrKHR3ZWFrSWQsIFwiY29kZXgtd2luZG93c1wiKTtcbiAgcmV0dXJuIGdldFByaW1hcnlDb2RleFdpbmRvd1JlZigpO1xufSk7XG5wcml2aWxlZ2VkSGFuZGxlKFwiY29kZXhwcDpjb2RleC13aW5kb3ctZm9jdXNcIiwgKF9lLCB0d2Vha0lkOiBzdHJpbmcsIHdpbmRvd0lkOiBudW1iZXIpID0+IHtcbiAgYXNzZXJ0QXV0aG9yaXplZFR3ZWFrKHR3ZWFrSWQsIFwiY29kZXgtd2luZG93c1wiKTtcbiAgcmV0dXJuIGZvY3VzQ29kZXhXaW5kb3cod2luZG93SWQpO1xufSk7XG5wcml2aWxlZ2VkSGFuZGxlKFwiY29kZXhwcDpjb2RleC13aW5kb3ctc2hvd1wiLCAoX2UsIHR3ZWFrSWQ6IHN0cmluZywgd2luZG93SWQ6IG51bWJlcikgPT4ge1xuICBhc3NlcnRBdXRob3JpemVkVHdlYWsodHdlYWtJZCwgXCJjb2RleC13aW5kb3dzXCIpO1xuICByZXR1cm4gc2hvd0NvZGV4V2luZG93KHdpbmRvd0lkKTtcbn0pO1xucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6Y29kZXgtdmlldy1jcmVhdGVcIixcbiAgYXN5bmMgKF9lLCB0d2Vha0lkOiBzdHJpbmcsIG9wdGlvbnM6IENvZGV4Vmlld0NyZWF0ZU9wdGlvbnMpID0+IHtcbiAgICBjb25zdCB0d2VhayA9IGFzc2VydEF1dGhvcml6ZWRUd2Vhayh0d2Vha0lkLCBcImNvZGV4LXZpZXdzXCIpO1xuICAgIGNvbnN0IHJlZiA9IGF3YWl0IGNyZWF0ZU93bFZpZXcoeyBpZDogdHdlYWsubWFuaWZlc3QuaWQsIGRpcjogdHdlYWsuZGlyIH0sIG9wdGlvbnMpO1xuICAgIHJldHVybiB7XG4gICAgICBpZDogcmVmLmlkLFxuICAgICAgd2ViQ29udGVudHNJZDogcmVmLndlYkNvbnRlbnRzSWQsXG4gICAgICBwYXJlbnRXaW5kb3dJZDogcmVmLnBhcmVudFdpbmRvd0lkLFxuICAgIH07XG4gIH0sXG4pO1xucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6Y29kZXgtdmlldy1jYWxsXCIsXG4gIChfZSwgdHdlYWtJZDogc3RyaW5nLCB2aWV3SWQ6IHN0cmluZywgbWV0aG9kOiBzdHJpbmcsIGFyZz86IHVua25vd24sIGFyZzI/OiB1bmtub3duKSA9PiB7XG4gICAgY29uc3QgdHdlYWsgPSBhc3NlcnRBdXRob3JpemVkVHdlYWsodHdlYWtJZCwgXCJjb2RleC12aWV3c1wiKTtcbiAgICByZXR1cm4gY2FsbE93bFZpZXcodHdlYWsubWFuaWZlc3QuaWQsIHZpZXdJZCwgbWV0aG9kLCBhcmcsIGFyZzIpO1xuICB9LFxuKTtcbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpjb2RleC12aWV3LWRpc3Bvc2UtdHdlYWtcIiwgKF9lLCB0d2Vha0lkOiBzdHJpbmcpID0+IHtcbiAgYXNzZXJ0VHdlYWtJZCh0d2Vha0lkKTtcbiAgZGlzcG9zZU93bFZpZXdzRm9yVHdlYWsodHdlYWtJZCk7XG59KTtcbnByaXZpbGVnZWRIYW5kbGUoXCJjb2RleHBwOm5hdGl2ZS1sb2FkLW1vZHVsZVwiLFxuICAoX2UsIHR3ZWFrSWQ6IHN0cmluZywgb3B0aW9uczogTmF0aXZlTW9kdWxlTG9hZE9wdGlvbnMpID0+IHtcbiAgICBjb25zdCB0d2VhayA9IGFzc2VydEF1dGhvcml6ZWRUd2Vhayh0d2Vha0lkLCBcIm5hdGl2ZS1tb2R1bGVcIik7XG4gICAgY29uc3QgcmVmID0gbmF0aXZlQnJpZGdlLmxvYWRNb2R1bGUodHdlYWtDb250ZXh0KHR3ZWFrLm1hbmlmZXN0LmlkLCBcIm5hdGl2ZS1tb2R1bGVcIiksIG9wdGlvbnMpO1xuICAgIHJldHVybiB7IGlkOiByZWYuaWQsIGtpbmQ6IHJlZi5raW5kIH07XG4gIH0sXG4pO1xucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6bmF0aXZlLW1vZHVsZS1yZXF1ZXN0XCIsXG4gIChfZSwgdHdlYWtJZDogc3RyaW5nLCBtb2R1bGVJZDogc3RyaW5nLCBtZXRob2Q6IHN0cmluZywgcGF5bG9hZD86IHVua25vd24sIHRpbWVvdXRNcz86IG51bWJlcikgPT4ge1xuICAgIGNvbnN0IHR3ZWFrID0gYXNzZXJ0QXV0aG9yaXplZFR3ZWFrKHR3ZWFrSWQsIFwibmF0aXZlLW1vZHVsZVwiKTtcbiAgICByZXR1cm4gbmF0aXZlQnJpZGdlLnJlcXVlc3RNb2R1bGUodHdlYWsubWFuaWZlc3QuaWQsIG1vZHVsZUlkLCBtZXRob2QsIHBheWxvYWQsIHRpbWVvdXRNcyk7XG4gIH0sXG4pO1xucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6bmF0aXZlLW1vZHVsZS1kaXNwb3NlXCIsIChfZSwgdHdlYWtJZDogc3RyaW5nLCBtb2R1bGVJZDogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IHR3ZWFrID0gYXNzZXJ0QXV0aG9yaXplZFR3ZWFrKHR3ZWFrSWQsIFwibmF0aXZlLW1vZHVsZVwiKTtcbiAgcmV0dXJuIG5hdGl2ZUJyaWRnZS5kaXNwb3NlTW9kdWxlKHR3ZWFrLm1hbmlmZXN0LmlkLCBtb2R1bGVJZCk7XG59KTtcbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpuYXRpdmUtZGlzcG9zZS10d2Vha1wiLCAoX2UsIHR3ZWFrSWQ6IHN0cmluZykgPT4ge1xuICBhc3NlcnRUd2Vha0lkKHR3ZWFrSWQpO1xuICBuYXRpdmVCcmlkZ2UuZGlzcG9zZVR3ZWFrKHR3ZWFrSWQpO1xufSk7XG5wcml2aWxlZ2VkSGFuZGxlKFwiY29kZXhwcDpuYXRpdmUtY3JlYXRlLXBhbmVsXCIsXG4gIGFzeW5jIChfZSwgdHdlYWtJZDogc3RyaW5nLCBvcHRpb25zOiBOYXRpdmVQYW5lbENyZWF0ZU9wdGlvbnMpID0+IHtcbiAgICBjb25zdCB0d2VhayA9IGFzc2VydEF1dGhvcml6ZWRUd2Vhayh0d2Vha0lkLCBcIm5hdGl2ZS12aWV3XCIpO1xuICAgIGNvbnN0IHJlZiA9IGF3YWl0IG5hdGl2ZUJyaWRnZS5jcmVhdGVQYW5lbCh0d2Vha0NvbnRleHQodHdlYWsubWFuaWZlc3QuaWQsIFwibmF0aXZlLXZpZXdcIiksIG9wdGlvbnMpO1xuICAgIHJldHVybiB7IGlkOiByZWYuaWQsIHdpbmRvd0lkOiByZWYud2luZG93SWQgfTtcbiAgfSxcbik7XG5wcml2aWxlZ2VkSGFuZGxlKFwiY29kZXhwcDpuYXRpdmUtYXR0YWNoLXZpZXdcIixcbiAgYXN5bmMgKF9lLCB0d2Vha0lkOiBzdHJpbmcsIG9wdGlvbnM6IE5hdGl2ZVZpZXdBdHRhY2hPcHRpb25zKSA9PiB7XG4gICAgY29uc3QgdHdlYWsgPSBhc3NlcnRBdXRob3JpemVkVHdlYWsodHdlYWtJZCwgXCJuYXRpdmUtdmlld1wiKTtcbiAgICBjb25zdCByZWYgPSBhd2FpdCBuYXRpdmVCcmlkZ2UuYXR0YWNoVmlldyh0d2Vha0NvbnRleHQodHdlYWsubWFuaWZlc3QuaWQsIFwibmF0aXZlLXZpZXdcIiksIG9wdGlvbnMpO1xuICAgIHJldHVybiB7IGlkOiByZWYuaWQgfTtcbiAgfSxcbik7XG5wcml2aWxlZ2VkSGFuZGxlKFwiY29kZXhwcDpuYXRpdmUtaW5zdGFuY2UtY2FsbFwiLFxuICBhc3luYyAoX2UsIHR3ZWFrSWQ6IHN0cmluZywga2luZDogXCJwYW5lbFwiIHwgXCJ2aWV3XCIsIGluc3RhbmNlSWQ6IHN0cmluZywgbWV0aG9kOiBzdHJpbmcsIGFyZz86IHVua25vd24pID0+IHtcbiAgICBjb25zdCB0d2VhayA9IGFzc2VydEF1dGhvcml6ZWRUd2Vhayh0d2Vha0lkLCBcIm5hdGl2ZS12aWV3XCIpO1xuICAgIHJldHVybiBuYXRpdmVCcmlkZ2UuY2FsbEluc3RhbmNlKHR3ZWFrLm1hbmlmZXN0LmlkLCBraW5kLCBpbnN0YW5jZUlkLCBtZXRob2QsIGFyZyk7XG4gIH0sXG4pO1xucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6bmF0aXZlLWxhdW5jaC1oZWxwZXJcIixcbiAgKF9lLCB0d2Vha0lkOiBzdHJpbmcsIG9wdGlvbnM6IE5hdGl2ZUhlbHBlckxhdW5jaE9wdGlvbnMpID0+IHtcbiAgICBjb25zdCB0d2VhayA9IGFzc2VydEF1dGhvcml6ZWRUd2Vhayh0d2Vha0lkLCBcIm5hdGl2ZS1oZWxwZXJcIik7XG4gICAgY29uc3QgcmVmID0gbmF0aXZlQnJpZGdlLmxhdW5jaEhlbHBlcih0d2Vha0NvbnRleHQodHdlYWsubWFuaWZlc3QuaWQsIFwibmF0aXZlLWhlbHBlclwiKSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIHsgaWQ6IHJlZi5pZCwgcGlkOiByZWYucGlkIH07XG4gIH0sXG4pO1xucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6bmF0aXZlLWhlbHBlci1jYWxsXCIsXG4gIChfZSwgdHdlYWtJZDogc3RyaW5nLCBoZWxwZXJJZDogc3RyaW5nLCBtZXRob2Q6IHN0cmluZywgcGF5bG9hZD86IHVua25vd24sIHRpbWVvdXRNcz86IG51bWJlcikgPT4ge1xuICAgIGNvbnN0IHR3ZWFrID0gYXNzZXJ0QXV0aG9yaXplZFR3ZWFrKHR3ZWFrSWQsIFwibmF0aXZlLWhlbHBlclwiKTtcbiAgICByZXR1cm4gbmF0aXZlQnJpZGdlLmNhbGxIZWxwZXIodHdlYWsubWFuaWZlc3QuaWQsIGhlbHBlcklkLCBtZXRob2QsIHBheWxvYWQsIHRpbWVvdXRNcyk7XG4gIH0sXG4pO1xucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6Y29kZXgtc2Vzc2lvbnMtbGlzdFwiLCAoX2UsIHR3ZWFrSWQ6IHN0cmluZywgZXh0cmE/OiB1bmtub3duKSA9PiB7XG4gIGFzc2VydEF1dGhvcml6ZWRUd2Vhayh0d2Vha0lkLCBcImNvZGV4LXNlc3Npb25zXCIpO1xuICBpZiAoZXh0cmEgIT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKFwidW5leHBlY3RlZCBwYXlsb2FkXCIpO1xuICByZXR1cm4gc2Vzc2lvbk1hbmFnZXIubGlzdFNlc3Npb25zKCk7XG59KTtcbnByaXZpbGVnZWRIYW5kbGUoXCJjb2RleHBwOmNvZGV4LXNlc3Npb25zLXN0YXR1c1wiLCAoX2UsIHR3ZWFrSWQ6IHN0cmluZywgc2Vzc2lvbklkOiBzdHJpbmcsIGV4dHJhPzogdW5rbm93bikgPT4ge1xuICBhc3NlcnRBdXRob3JpemVkVHdlYWsodHdlYWtJZCwgXCJjb2RleC1zZXNzaW9uc1wiKTtcbiAgaWYgKHR5cGVvZiBzZXNzaW9uSWQgIT09IFwic3RyaW5nXCIpIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgc2Vzc2lvbiBpZFwiKTtcbiAgYXNzZXJ0U2Vzc2lvbklkKHNlc3Npb25JZCk7XG4gIGlmIChleHRyYSAhPT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoXCJ1bmV4cGVjdGVkIHBheWxvYWRcIik7XG4gIHJldHVybiBzZXNzaW9uTWFuYWdlci5nZXRTZXNzaW9uU3RhdHVzKHNlc3Npb25JZCk7XG59KTtcblxucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6cmV2ZWFsXCIsIChfZSwgcDogc3RyaW5nKSA9PiB7XG4gIHNoZWxsLm9wZW5QYXRoKHApLmNhdGNoKCgpID0+IHt9KTtcbn0pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6b3Blbi1leHRlcm5hbFwiLCAoX2UsIHVybDogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IHBhcnNlZCA9IG5ldyBVUkwodXJsKTtcbiAgaWYgKHBhcnNlZC5wcm90b2NvbCAhPT0gXCJodHRwczpcIiB8fCBwYXJzZWQuaG9zdG5hbWUgIT09IFwiZ2l0aHViLmNvbVwiKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwib25seSBnaXRodWIuY29tIGxpbmtzIGNhbiBiZSBvcGVuZWQgZnJvbSB0d2VhayBtZXRhZGF0YVwiKTtcbiAgfVxuICBzaGVsbC5vcGVuRXh0ZXJuYWwocGFyc2VkLnRvU3RyaW5nKCkpLmNhdGNoKCgpID0+IHt9KTtcbn0pO1xuXG5wcml2aWxlZ2VkSGFuZGxlKFwiY29kZXhwcDpjb3B5LXRleHRcIiwgKF9lLCB0ZXh0OiBzdHJpbmcpID0+IHtcbiAgY2xpcGJvYXJkLndyaXRlVGV4dChTdHJpbmcodGV4dCkpO1xuICByZXR1cm4gdHJ1ZTtcbn0pO1xuXG4vLyBNYW51YWwgZm9yY2UtcmVsb2FkIHRyaWdnZXIgZnJvbSB0aGUgcmVuZGVyZXIgKGUuZy4gdGhlIFwiRm9yY2UgUmVsb2FkXCJcbi8vIGJ1dHRvbiBvbiBvdXIgaW5qZWN0ZWQgVHdlYWtzIHBhZ2UpLiBCeXBhc3NlcyB0aGUgd2F0Y2hlciBkZWJvdW5jZS5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpyZWxvYWQtdHdlYWtzXCIsICgpID0+IHtcbiAgcmVsb2FkVHdlYWtzKFwibWFudWFsXCIsIHR3ZWFrTGlmZWN5Y2xlRGVwcyk7XG4gIHJldHVybiB7IGF0OiBEYXRlLm5vdygpLCBjb3VudDogdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLmxlbmd0aCB9O1xufSk7XG5cbi8vIDQuIEZpbGVzeXN0ZW0gd2F0Y2hlciBcdTIxOTIgZGVib3VuY2VkIHJlbG9hZCArIGJyb2FkY2FzdC5cbi8vICAgIFdlIHdhdGNoIHRoZSB0d2Vha3MgZGlyIGZvciBhbnkgY2hhbmdlLiBPbiB0aGUgZmlyc3QgdGljayBvZiBpbmFjdGl2aXR5XG4vLyAgICB3ZSBzdG9wIG1haW4tc2lkZSB0d2Vha3MsIGNsZWFyIHRoZWlyIGNhY2hlZCBtb2R1bGVzLCByZS1kaXNjb3ZlciwgdGhlblxuLy8gICAgcmVzdGFydCBhbmQgYnJvYWRjYXN0IGBjb2RleHBwOnR3ZWFrcy1jaGFuZ2VkYCB0byBldmVyeSByZW5kZXJlciBzbyBpdFxuLy8gICAgY2FuIHJlLWluaXQgaXRzIGhvc3QuXG5jb25zdCBSRUxPQURfREVCT1VOQ0VfTVMgPSAyNTA7XG5sZXQgcmVsb2FkVGltZXI6IE5vZGVKUy5UaW1lb3V0IHwgbnVsbCA9IG51bGw7XG5mdW5jdGlvbiBzY2hlZHVsZVJlbG9hZChyZWFzb246IHN0cmluZyk6IHZvaWQge1xuICBpZiAocmVsb2FkVGltZXIpIGNsZWFyVGltZW91dChyZWxvYWRUaW1lcik7XG4gIHJlbG9hZFRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgcmVsb2FkVGltZXIgPSBudWxsO1xuICAgIHJlbG9hZFR3ZWFrcyhyZWFzb24sIHR3ZWFrTGlmZWN5Y2xlRGVwcyk7XG4gIH0sIFJFTE9BRF9ERUJPVU5DRV9NUyk7XG59XG5cbnRyeSB7XG4gIGNvbnN0IHdhdGNoZXIgPSBjaG9raWRhci53YXRjaChUV0VBS1NfRElSLCB7XG4gICAgaWdub3JlSW5pdGlhbDogdHJ1ZSxcbiAgICAvLyBXYWl0IGZvciBmaWxlcyB0byBzZXR0bGUgYmVmb3JlIHRyaWdnZXJpbmcgXHUyMDE0IGd1YXJkcyBhZ2FpbnN0IHBhcnRpYWxseVxuICAgIC8vIHdyaXR0ZW4gdHdlYWsgZmlsZXMgZHVyaW5nIGVkaXRvciBzYXZlcyAvIGdpdCBjaGVja291dHMuXG4gICAgYXdhaXRXcml0ZUZpbmlzaDogeyBzdGFiaWxpdHlUaHJlc2hvbGQ6IDE1MCwgcG9sbEludGVydmFsOiA1MCB9LFxuICAgIC8vIEF2b2lkIGVhdGluZyBDUFUgb24gaHVnZSBub2RlX21vZHVsZXMgdHJlZXMgaW5zaWRlIHR3ZWFrIGZvbGRlcnMuXG4gICAgaWdub3JlZDogKHApID0+IHAuaW5jbHVkZXMoYCR7VFdFQUtTX0RJUn0vYCkgJiYgL1xcL25vZGVfbW9kdWxlc1xcLy8udGVzdChwKSxcbiAgfSk7XG4gIHdhdGNoZXIub24oXCJhbGxcIiwgKGV2ZW50LCBwYXRoKSA9PiBzY2hlZHVsZVJlbG9hZChgJHtldmVudH0gJHtwYXRofWApKTtcbiAgd2F0Y2hlci5vbihcImVycm9yXCIsIChlKSA9PiBsb2coXCJ3YXJuXCIsIFwid2F0Y2hlciBlcnJvcjpcIiwgZSkpO1xuICBsb2coXCJpbmZvXCIsIFwid2F0Y2hpbmdcIiwgVFdFQUtTX0RJUik7XG4gIGFwcC5vbihcIndpbGwtcXVpdFwiLCAoKSA9PiB3YXRjaGVyLmNsb3NlKCkuY2F0Y2goKCkgPT4ge30pKTtcbn0gY2F0Y2ggKGUpIHtcbiAgbG9nKFwiZXJyb3JcIiwgXCJmYWlsZWQgdG8gc3RhcnQgd2F0Y2hlcjpcIiwgZSk7XG59XG4iLCAiLyohIGNob2tpZGFyIC0gTUlUIExpY2Vuc2UgKGMpIDIwMTIgUGF1bCBNaWxsZXIgKHBhdWxtaWxsci5jb20pICovXG5pbXBvcnQgeyBzdGF0IGFzIHN0YXRjYiB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IHN0YXQsIHJlYWRkaXIgfSBmcm9tICdmcy9wcm9taXNlcyc7XG5pbXBvcnQgeyBFdmVudEVtaXR0ZXIgfSBmcm9tICdldmVudHMnO1xuaW1wb3J0ICogYXMgc3lzUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IHJlYWRkaXJwIH0gZnJvbSAncmVhZGRpcnAnO1xuaW1wb3J0IHsgTm9kZUZzSGFuZGxlciwgRVZFTlRTIGFzIEVWLCBpc1dpbmRvd3MsIGlzSUJNaSwgRU1QVFlfRk4sIFNUUl9DTE9TRSwgU1RSX0VORCwgfSBmcm9tICcuL2hhbmRsZXIuanMnO1xuY29uc3QgU0xBU0ggPSAnLyc7XG5jb25zdCBTTEFTSF9TTEFTSCA9ICcvLyc7XG5jb25zdCBPTkVfRE9UID0gJy4nO1xuY29uc3QgVFdPX0RPVFMgPSAnLi4nO1xuY29uc3QgU1RSSU5HX1RZUEUgPSAnc3RyaW5nJztcbmNvbnN0IEJBQ0tfU0xBU0hfUkUgPSAvXFxcXC9nO1xuY29uc3QgRE9VQkxFX1NMQVNIX1JFID0gL1xcL1xcLy87XG5jb25zdCBET1RfUkUgPSAvXFwuLipcXC4oc3dbcHhdKSR8fiR8XFwuc3VibC4qXFwudG1wLztcbmNvbnN0IFJFUExBQ0VSX1JFID0gL15cXC5bL1xcXFxdLztcbmZ1bmN0aW9uIGFycmlmeShpdGVtKSB7XG4gICAgcmV0dXJuIEFycmF5LmlzQXJyYXkoaXRlbSkgPyBpdGVtIDogW2l0ZW1dO1xufVxuY29uc3QgaXNNYXRjaGVyT2JqZWN0ID0gKG1hdGNoZXIpID0+IHR5cGVvZiBtYXRjaGVyID09PSAnb2JqZWN0JyAmJiBtYXRjaGVyICE9PSBudWxsICYmICEobWF0Y2hlciBpbnN0YW5jZW9mIFJlZ0V4cCk7XG5mdW5jdGlvbiBjcmVhdGVQYXR0ZXJuKG1hdGNoZXIpIHtcbiAgICBpZiAodHlwZW9mIG1hdGNoZXIgPT09ICdmdW5jdGlvbicpXG4gICAgICAgIHJldHVybiBtYXRjaGVyO1xuICAgIGlmICh0eXBlb2YgbWF0Y2hlciA9PT0gJ3N0cmluZycpXG4gICAgICAgIHJldHVybiAoc3RyaW5nKSA9PiBtYXRjaGVyID09PSBzdHJpbmc7XG4gICAgaWYgKG1hdGNoZXIgaW5zdGFuY2VvZiBSZWdFeHApXG4gICAgICAgIHJldHVybiAoc3RyaW5nKSA9PiBtYXRjaGVyLnRlc3Qoc3RyaW5nKTtcbiAgICBpZiAodHlwZW9mIG1hdGNoZXIgPT09ICdvYmplY3QnICYmIG1hdGNoZXIgIT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIChzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIGlmIChtYXRjaGVyLnBhdGggPT09IHN0cmluZylcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChtYXRjaGVyLnJlY3Vyc2l2ZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlID0gc3lzUGF0aC5yZWxhdGl2ZShtYXRjaGVyLnBhdGgsIHN0cmluZyk7XG4gICAgICAgICAgICAgICAgaWYgKCFyZWxhdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiAhcmVsYXRpdmUuc3RhcnRzV2l0aCgnLi4nKSAmJiAhc3lzUGF0aC5pc0Fic29sdXRlKHJlbGF0aXZlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuICgpID0+IGZhbHNlO1xufVxuZnVuY3Rpb24gbm9ybWFsaXplUGF0aChwYXRoKSB7XG4gICAgaWYgKHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdzdHJpbmcgZXhwZWN0ZWQnKTtcbiAgICBwYXRoID0gc3lzUGF0aC5ub3JtYWxpemUocGF0aCk7XG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIGxldCBwcmVwZW5kID0gZmFsc2U7XG4gICAgaWYgKHBhdGguc3RhcnRzV2l0aCgnLy8nKSlcbiAgICAgICAgcHJlcGVuZCA9IHRydWU7XG4gICAgY29uc3QgRE9VQkxFX1NMQVNIX1JFID0gL1xcL1xcLy87XG4gICAgd2hpbGUgKHBhdGgubWF0Y2goRE9VQkxFX1NMQVNIX1JFKSlcbiAgICAgICAgcGF0aCA9IHBhdGgucmVwbGFjZShET1VCTEVfU0xBU0hfUkUsICcvJyk7XG4gICAgaWYgKHByZXBlbmQpXG4gICAgICAgIHBhdGggPSAnLycgKyBwYXRoO1xuICAgIHJldHVybiBwYXRoO1xufVxuZnVuY3Rpb24gbWF0Y2hQYXR0ZXJucyhwYXR0ZXJucywgdGVzdFN0cmluZywgc3RhdHMpIHtcbiAgICBjb25zdCBwYXRoID0gbm9ybWFsaXplUGF0aCh0ZXN0U3RyaW5nKTtcbiAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgcGF0dGVybnMubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgIGNvbnN0IHBhdHRlcm4gPSBwYXR0ZXJuc1tpbmRleF07XG4gICAgICAgIGlmIChwYXR0ZXJuKHBhdGgsIHN0YXRzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuZnVuY3Rpb24gYW55bWF0Y2gobWF0Y2hlcnMsIHRlc3RTdHJpbmcpIHtcbiAgICBpZiAobWF0Y2hlcnMgPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdhbnltYXRjaDogc3BlY2lmeSBmaXJzdCBhcmd1bWVudCcpO1xuICAgIH1cbiAgICAvLyBFYXJseSBjYWNoZSBmb3IgbWF0Y2hlcnMuXG4gICAgY29uc3QgbWF0Y2hlcnNBcnJheSA9IGFycmlmeShtYXRjaGVycyk7XG4gICAgY29uc3QgcGF0dGVybnMgPSBtYXRjaGVyc0FycmF5Lm1hcCgobWF0Y2hlcikgPT4gY3JlYXRlUGF0dGVybihtYXRjaGVyKSk7XG4gICAgaWYgKHRlc3RTdHJpbmcgPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gKHRlc3RTdHJpbmcsIHN0YXRzKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hQYXR0ZXJucyhwYXR0ZXJucywgdGVzdFN0cmluZywgc3RhdHMpO1xuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gbWF0Y2hQYXR0ZXJucyhwYXR0ZXJucywgdGVzdFN0cmluZyk7XG59XG5jb25zdCB1bmlmeVBhdGhzID0gKHBhdGhzXykgPT4ge1xuICAgIGNvbnN0IHBhdGhzID0gYXJyaWZ5KHBhdGhzXykuZmxhdCgpO1xuICAgIGlmICghcGF0aHMuZXZlcnkoKHApID0+IHR5cGVvZiBwID09PSBTVFJJTkdfVFlQRSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgTm9uLXN0cmluZyBwcm92aWRlZCBhcyB3YXRjaCBwYXRoOiAke3BhdGhzfWApO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aHMubWFwKG5vcm1hbGl6ZVBhdGhUb1VuaXgpO1xufTtcbi8vIElmIFNMQVNIX1NMQVNIIG9jY3VycyBhdCB0aGUgYmVnaW5uaW5nIG9mIHBhdGgsIGl0IGlzIG5vdCByZXBsYWNlZFxuLy8gICAgIGJlY2F1c2UgXCIvL1N0b3JhZ2VQQy9Ecml2ZVBvb2wvTW92aWVzXCIgaXMgYSB2YWxpZCBuZXR3b3JrIHBhdGhcbmNvbnN0IHRvVW5peCA9IChzdHJpbmcpID0+IHtcbiAgICBsZXQgc3RyID0gc3RyaW5nLnJlcGxhY2UoQkFDS19TTEFTSF9SRSwgU0xBU0gpO1xuICAgIGxldCBwcmVwZW5kID0gZmFsc2U7XG4gICAgaWYgKHN0ci5zdGFydHNXaXRoKFNMQVNIX1NMQVNIKSkge1xuICAgICAgICBwcmVwZW5kID0gdHJ1ZTtcbiAgICB9XG4gICAgd2hpbGUgKHN0ci5tYXRjaChET1VCTEVfU0xBU0hfUkUpKSB7XG4gICAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKERPVUJMRV9TTEFTSF9SRSwgU0xBU0gpO1xuICAgIH1cbiAgICBpZiAocHJlcGVuZCkge1xuICAgICAgICBzdHIgPSBTTEFTSCArIHN0cjtcbiAgICB9XG4gICAgcmV0dXJuIHN0cjtcbn07XG4vLyBPdXIgdmVyc2lvbiBvZiB1cGF0aC5ub3JtYWxpemVcbi8vIFRPRE86IHRoaXMgaXMgbm90IGVxdWFsIHRvIHBhdGgtbm9ybWFsaXplIG1vZHVsZSAtIGludmVzdGlnYXRlIHdoeVxuY29uc3Qgbm9ybWFsaXplUGF0aFRvVW5peCA9IChwYXRoKSA9PiB0b1VuaXgoc3lzUGF0aC5ub3JtYWxpemUodG9Vbml4KHBhdGgpKSk7XG4vLyBUT0RPOiByZWZhY3RvclxuY29uc3Qgbm9ybWFsaXplSWdub3JlZCA9IChjd2QgPSAnJykgPT4gKHBhdGgpID0+IHtcbiAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBub3JtYWxpemVQYXRoVG9Vbml4KHN5c1BhdGguaXNBYnNvbHV0ZShwYXRoKSA/IHBhdGggOiBzeXNQYXRoLmpvaW4oY3dkLCBwYXRoKSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gcGF0aDtcbiAgICB9XG59O1xuY29uc3QgZ2V0QWJzb2x1dGVQYXRoID0gKHBhdGgsIGN3ZCkgPT4ge1xuICAgIGlmIChzeXNQYXRoLmlzQWJzb2x1dGUocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIHBhdGg7XG4gICAgfVxuICAgIHJldHVybiBzeXNQYXRoLmpvaW4oY3dkLCBwYXRoKTtcbn07XG5jb25zdCBFTVBUWV9TRVQgPSBPYmplY3QuZnJlZXplKG5ldyBTZXQoKSk7XG4vKipcbiAqIERpcmVjdG9yeSBlbnRyeS5cbiAqL1xuY2xhc3MgRGlyRW50cnkge1xuICAgIGNvbnN0cnVjdG9yKGRpciwgcmVtb3ZlV2F0Y2hlcikge1xuICAgICAgICB0aGlzLnBhdGggPSBkaXI7XG4gICAgICAgIHRoaXMuX3JlbW92ZVdhdGNoZXIgPSByZW1vdmVXYXRjaGVyO1xuICAgICAgICB0aGlzLml0ZW1zID0gbmV3IFNldCgpO1xuICAgIH1cbiAgICBhZGQoaXRlbSkge1xuICAgICAgICBjb25zdCB7IGl0ZW1zIH0gPSB0aGlzO1xuICAgICAgICBpZiAoIWl0ZW1zKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAoaXRlbSAhPT0gT05FX0RPVCAmJiBpdGVtICE9PSBUV09fRE9UUylcbiAgICAgICAgICAgIGl0ZW1zLmFkZChpdGVtKTtcbiAgICB9XG4gICAgYXN5bmMgcmVtb3ZlKGl0ZW0pIHtcbiAgICAgICAgY29uc3QgeyBpdGVtcyB9ID0gdGhpcztcbiAgICAgICAgaWYgKCFpdGVtcylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaXRlbXMuZGVsZXRlKGl0ZW0pO1xuICAgICAgICBpZiAoaXRlbXMuc2l6ZSA+IDApXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGNvbnN0IGRpciA9IHRoaXMucGF0aDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHJlYWRkaXIoZGlyKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fcmVtb3ZlV2F0Y2hlcikge1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbW92ZVdhdGNoZXIoc3lzUGF0aC5kaXJuYW1lKGRpciksIHN5c1BhdGguYmFzZW5hbWUoZGlyKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgaGFzKGl0ZW0pIHtcbiAgICAgICAgY29uc3QgeyBpdGVtcyB9ID0gdGhpcztcbiAgICAgICAgaWYgKCFpdGVtcylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgcmV0dXJuIGl0ZW1zLmhhcyhpdGVtKTtcbiAgICB9XG4gICAgZ2V0Q2hpbGRyZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgaXRlbXMgfSA9IHRoaXM7XG4gICAgICAgIGlmICghaXRlbXMpXG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIHJldHVybiBbLi4uaXRlbXMudmFsdWVzKCldO1xuICAgIH1cbiAgICBkaXNwb3NlKCkge1xuICAgICAgICB0aGlzLml0ZW1zLmNsZWFyKCk7XG4gICAgICAgIHRoaXMucGF0aCA9ICcnO1xuICAgICAgICB0aGlzLl9yZW1vdmVXYXRjaGVyID0gRU1QVFlfRk47XG4gICAgICAgIHRoaXMuaXRlbXMgPSBFTVBUWV9TRVQ7XG4gICAgICAgIE9iamVjdC5mcmVlemUodGhpcyk7XG4gICAgfVxufVxuY29uc3QgU1RBVF9NRVRIT0RfRiA9ICdzdGF0JztcbmNvbnN0IFNUQVRfTUVUSE9EX0wgPSAnbHN0YXQnO1xuZXhwb3J0IGNsYXNzIFdhdGNoSGVscGVyIHtcbiAgICBjb25zdHJ1Y3RvcihwYXRoLCBmb2xsb3csIGZzdykge1xuICAgICAgICB0aGlzLmZzdyA9IGZzdztcbiAgICAgICAgY29uc3Qgd2F0Y2hQYXRoID0gcGF0aDtcbiAgICAgICAgdGhpcy5wYXRoID0gcGF0aCA9IHBhdGgucmVwbGFjZShSRVBMQUNFUl9SRSwgJycpO1xuICAgICAgICB0aGlzLndhdGNoUGF0aCA9IHdhdGNoUGF0aDtcbiAgICAgICAgdGhpcy5mdWxsV2F0Y2hQYXRoID0gc3lzUGF0aC5yZXNvbHZlKHdhdGNoUGF0aCk7XG4gICAgICAgIHRoaXMuZGlyUGFydHMgPSBbXTtcbiAgICAgICAgdGhpcy5kaXJQYXJ0cy5mb3JFYWNoKChwYXJ0cykgPT4ge1xuICAgICAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+IDEpXG4gICAgICAgICAgICAgICAgcGFydHMucG9wKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmZvbGxvd1N5bWxpbmtzID0gZm9sbG93O1xuICAgICAgICB0aGlzLnN0YXRNZXRob2QgPSBmb2xsb3cgPyBTVEFUX01FVEhPRF9GIDogU1RBVF9NRVRIT0RfTDtcbiAgICB9XG4gICAgZW50cnlQYXRoKGVudHJ5KSB7XG4gICAgICAgIHJldHVybiBzeXNQYXRoLmpvaW4odGhpcy53YXRjaFBhdGgsIHN5c1BhdGgucmVsYXRpdmUodGhpcy53YXRjaFBhdGgsIGVudHJ5LmZ1bGxQYXRoKSk7XG4gICAgfVxuICAgIGZpbHRlclBhdGgoZW50cnkpIHtcbiAgICAgICAgY29uc3QgeyBzdGF0cyB9ID0gZW50cnk7XG4gICAgICAgIGlmIChzdGF0cyAmJiBzdGF0cy5pc1N5bWJvbGljTGluaygpKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmlsdGVyRGlyKGVudHJ5KTtcbiAgICAgICAgY29uc3QgcmVzb2x2ZWRQYXRoID0gdGhpcy5lbnRyeVBhdGgoZW50cnkpO1xuICAgICAgICAvLyBUT0RPOiB3aGF0IGlmIHN0YXRzIGlzIHVuZGVmaW5lZD8gcmVtb3ZlICFcbiAgICAgICAgcmV0dXJuIHRoaXMuZnN3Ll9pc250SWdub3JlZChyZXNvbHZlZFBhdGgsIHN0YXRzKSAmJiB0aGlzLmZzdy5faGFzUmVhZFBlcm1pc3Npb25zKHN0YXRzKTtcbiAgICB9XG4gICAgZmlsdGVyRGlyKGVudHJ5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmZzdy5faXNudElnbm9yZWQodGhpcy5lbnRyeVBhdGgoZW50cnkpLCBlbnRyeS5zdGF0cyk7XG4gICAgfVxufVxuLyoqXG4gKiBXYXRjaGVzIGZpbGVzICYgZGlyZWN0b3JpZXMgZm9yIGNoYW5nZXMuIEVtaXR0ZWQgZXZlbnRzOlxuICogYGFkZGAsIGBhZGREaXJgLCBgY2hhbmdlYCwgYHVubGlua2AsIGB1bmxpbmtEaXJgLCBgYWxsYCwgYGVycm9yYFxuICpcbiAqICAgICBuZXcgRlNXYXRjaGVyKClcbiAqICAgICAgIC5hZGQoZGlyZWN0b3JpZXMpXG4gKiAgICAgICAub24oJ2FkZCcsIHBhdGggPT4gbG9nKCdGaWxlJywgcGF0aCwgJ3dhcyBhZGRlZCcpKVxuICovXG5leHBvcnQgY2xhc3MgRlNXYXRjaGVyIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgICAvLyBOb3QgaW5kZW50aW5nIG1ldGhvZHMgZm9yIGhpc3Rvcnkgc2FrZTsgZm9yIG5vdy5cbiAgICBjb25zdHJ1Y3Rvcihfb3B0cyA9IHt9KSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuY2xvc2VkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2Nsb3NlcnMgPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXMuX2lnbm9yZWRQYXRocyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5fdGhyb3R0bGVkID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLl9zdHJlYW1zID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLl9zeW1saW5rUGF0aHMgPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXMuX3dhdGNoZWQgPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXMuX3BlbmRpbmdXcml0ZXMgPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXMuX3BlbmRpbmdVbmxpbmtzID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLl9yZWFkeUNvdW50ID0gMDtcbiAgICAgICAgdGhpcy5fcmVhZHlFbWl0dGVkID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IGF3ZiA9IF9vcHRzLmF3YWl0V3JpdGVGaW5pc2g7XG4gICAgICAgIGNvbnN0IERFRl9BV0YgPSB7IHN0YWJpbGl0eVRocmVzaG9sZDogMjAwMCwgcG9sbEludGVydmFsOiAxMDAgfTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IHtcbiAgICAgICAgICAgIC8vIERlZmF1bHRzXG4gICAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlLFxuICAgICAgICAgICAgaWdub3JlSW5pdGlhbDogZmFsc2UsXG4gICAgICAgICAgICBpZ25vcmVQZXJtaXNzaW9uRXJyb3JzOiBmYWxzZSxcbiAgICAgICAgICAgIGludGVydmFsOiAxMDAsXG4gICAgICAgICAgICBiaW5hcnlJbnRlcnZhbDogMzAwLFxuICAgICAgICAgICAgZm9sbG93U3ltbGlua3M6IHRydWUsXG4gICAgICAgICAgICB1c2VQb2xsaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIC8vIHVzZUFzeW5jOiBmYWxzZSxcbiAgICAgICAgICAgIGF0b21pYzogdHJ1ZSwgLy8gTk9URTogb3ZlcndyaXR0ZW4gbGF0ZXIgKGRlcGVuZHMgb24gdXNlUG9sbGluZylcbiAgICAgICAgICAgIC4uLl9vcHRzLFxuICAgICAgICAgICAgLy8gQ2hhbmdlIGZvcm1hdFxuICAgICAgICAgICAgaWdub3JlZDogX29wdHMuaWdub3JlZCA/IGFycmlmeShfb3B0cy5pZ25vcmVkKSA6IGFycmlmeShbXSksXG4gICAgICAgICAgICBhd2FpdFdyaXRlRmluaXNoOiBhd2YgPT09IHRydWUgPyBERUZfQVdGIDogdHlwZW9mIGF3ZiA9PT0gJ29iamVjdCcgPyB7IC4uLkRFRl9BV0YsIC4uLmF3ZiB9IDogZmFsc2UsXG4gICAgICAgIH07XG4gICAgICAgIC8vIEFsd2F5cyBkZWZhdWx0IHRvIHBvbGxpbmcgb24gSUJNIGkgYmVjYXVzZSBmcy53YXRjaCgpIGlzIG5vdCBhdmFpbGFibGUgb24gSUJNIGkuXG4gICAgICAgIGlmIChpc0lCTWkpXG4gICAgICAgICAgICBvcHRzLnVzZVBvbGxpbmcgPSB0cnVlO1xuICAgICAgICAvLyBFZGl0b3IgYXRvbWljIHdyaXRlIG5vcm1hbGl6YXRpb24gZW5hYmxlZCBieSBkZWZhdWx0IHdpdGggZnMud2F0Y2hcbiAgICAgICAgaWYgKG9wdHMuYXRvbWljID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBvcHRzLmF0b21pYyA9ICFvcHRzLnVzZVBvbGxpbmc7XG4gICAgICAgIC8vIG9wdHMuYXRvbWljID0gdHlwZW9mIF9vcHRzLmF0b21pYyA9PT0gJ251bWJlcicgPyBfb3B0cy5hdG9taWMgOiAxMDA7XG4gICAgICAgIC8vIEdsb2JhbCBvdmVycmlkZS4gVXNlZnVsIGZvciBkZXZlbG9wZXJzLCB3aG8gbmVlZCB0byBmb3JjZSBwb2xsaW5nIGZvciBhbGxcbiAgICAgICAgLy8gaW5zdGFuY2VzIG9mIGNob2tpZGFyLCByZWdhcmRsZXNzIG9mIHVzYWdlIC8gZGVwZW5kZW5jeSBkZXB0aFxuICAgICAgICBjb25zdCBlbnZQb2xsID0gcHJvY2Vzcy5lbnYuQ0hPS0lEQVJfVVNFUE9MTElORztcbiAgICAgICAgaWYgKGVudlBvbGwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc3QgZW52TG93ZXIgPSBlbnZQb2xsLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICBpZiAoZW52TG93ZXIgPT09ICdmYWxzZScgfHwgZW52TG93ZXIgPT09ICcwJylcbiAgICAgICAgICAgICAgICBvcHRzLnVzZVBvbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIGVsc2UgaWYgKGVudkxvd2VyID09PSAndHJ1ZScgfHwgZW52TG93ZXIgPT09ICcxJylcbiAgICAgICAgICAgICAgICBvcHRzLnVzZVBvbGxpbmcgPSB0cnVlO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIG9wdHMudXNlUG9sbGluZyA9ICEhZW52TG93ZXI7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZW52SW50ZXJ2YWwgPSBwcm9jZXNzLmVudi5DSE9LSURBUl9JTlRFUlZBTDtcbiAgICAgICAgaWYgKGVudkludGVydmFsKVxuICAgICAgICAgICAgb3B0cy5pbnRlcnZhbCA9IE51bWJlci5wYXJzZUludChlbnZJbnRlcnZhbCwgMTApO1xuICAgICAgICAvLyBUaGlzIGlzIGRvbmUgdG8gZW1pdCByZWFkeSBvbmx5IG9uY2UsIGJ1dCBlYWNoICdhZGQnIHdpbGwgaW5jcmVhc2UgdGhhdD9cbiAgICAgICAgbGV0IHJlYWR5Q2FsbHMgPSAwO1xuICAgICAgICB0aGlzLl9lbWl0UmVhZHkgPSAoKSA9PiB7XG4gICAgICAgICAgICByZWFkeUNhbGxzKys7XG4gICAgICAgICAgICBpZiAocmVhZHlDYWxscyA+PSB0aGlzLl9yZWFkeUNvdW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdFJlYWR5ID0gRU1QVFlfRk47XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVhZHlFbWl0dGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAvLyB1c2UgcHJvY2Vzcy5uZXh0VGljayB0byBhbGxvdyB0aW1lIGZvciBsaXN0ZW5lciB0byBiZSBib3VuZFxuICAgICAgICAgICAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4gdGhpcy5lbWl0KEVWLlJFQURZKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuX2VtaXRSYXcgPSAoLi4uYXJncykgPT4gdGhpcy5lbWl0KEVWLlJBVywgLi4uYXJncyk7XG4gICAgICAgIHRoaXMuX2JvdW5kUmVtb3ZlID0gdGhpcy5fcmVtb3ZlLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IG9wdHM7XG4gICAgICAgIHRoaXMuX25vZGVGc0hhbmRsZXIgPSBuZXcgTm9kZUZzSGFuZGxlcih0aGlzKTtcbiAgICAgICAgLy8gWW91XHUyMDE5cmUgZnJvemVuIHdoZW4geW91ciBoZWFydFx1MjAxOXMgbm90IG9wZW4uXG4gICAgICAgIE9iamVjdC5mcmVlemUob3B0cyk7XG4gICAgfVxuICAgIF9hZGRJZ25vcmVkUGF0aChtYXRjaGVyKSB7XG4gICAgICAgIGlmIChpc01hdGNoZXJPYmplY3QobWF0Y2hlcikpIHtcbiAgICAgICAgICAgIC8vIHJldHVybiBlYXJseSBpZiB3ZSBhbHJlYWR5IGhhdmUgYSBkZWVwbHkgZXF1YWwgbWF0Y2hlciBvYmplY3RcbiAgICAgICAgICAgIGZvciAoY29uc3QgaWdub3JlZCBvZiB0aGlzLl9pZ25vcmVkUGF0aHMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNNYXRjaGVyT2JqZWN0KGlnbm9yZWQpICYmXG4gICAgICAgICAgICAgICAgICAgIGlnbm9yZWQucGF0aCA9PT0gbWF0Y2hlci5wYXRoICYmXG4gICAgICAgICAgICAgICAgICAgIGlnbm9yZWQucmVjdXJzaXZlID09PSBtYXRjaGVyLnJlY3Vyc2l2ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2lnbm9yZWRQYXRocy5hZGQobWF0Y2hlcik7XG4gICAgfVxuICAgIF9yZW1vdmVJZ25vcmVkUGF0aChtYXRjaGVyKSB7XG4gICAgICAgIHRoaXMuX2lnbm9yZWRQYXRocy5kZWxldGUobWF0Y2hlcik7XG4gICAgICAgIC8vIG5vdyBmaW5kIGFueSBtYXRjaGVyIG9iamVjdHMgd2l0aCB0aGUgbWF0Y2hlciBhcyBwYXRoXG4gICAgICAgIGlmICh0eXBlb2YgbWF0Y2hlciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaWdub3JlZCBvZiB0aGlzLl9pZ25vcmVkUGF0aHMpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPICg0MzA4MWopOiBtYWtlIHRoaXMgbW9yZSBlZmZpY2llbnQuXG4gICAgICAgICAgICAgICAgLy8gcHJvYmFibHkganVzdCBtYWtlIGEgYHRoaXMuX2lnbm9yZWREaXJlY3Rvcmllc2Agb3Igc29tZVxuICAgICAgICAgICAgICAgIC8vIHN1Y2ggdGhpbmcuXG4gICAgICAgICAgICAgICAgaWYgKGlzTWF0Y2hlck9iamVjdChpZ25vcmVkKSAmJiBpZ25vcmVkLnBhdGggPT09IG1hdGNoZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5faWdub3JlZFBhdGhzLmRlbGV0ZShpZ25vcmVkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gUHVibGljIG1ldGhvZHNcbiAgICAvKipcbiAgICAgKiBBZGRzIHBhdGhzIHRvIGJlIHdhdGNoZWQgb24gYW4gZXhpc3RpbmcgRlNXYXRjaGVyIGluc3RhbmNlLlxuICAgICAqIEBwYXJhbSBwYXRoc18gZmlsZSBvciBmaWxlIGxpc3QuIE90aGVyIGFyZ3VtZW50cyBhcmUgdW51c2VkXG4gICAgICovXG4gICAgYWRkKHBhdGhzXywgX29yaWdBZGQsIF9pbnRlcm5hbCkge1xuICAgICAgICBjb25zdCB7IGN3ZCB9ID0gdGhpcy5vcHRpb25zO1xuICAgICAgICB0aGlzLmNsb3NlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9jbG9zZVByb21pc2UgPSB1bmRlZmluZWQ7XG4gICAgICAgIGxldCBwYXRocyA9IHVuaWZ5UGF0aHMocGF0aHNfKTtcbiAgICAgICAgaWYgKGN3ZCkge1xuICAgICAgICAgICAgcGF0aHMgPSBwYXRocy5tYXAoKHBhdGgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBhYnNQYXRoID0gZ2V0QWJzb2x1dGVQYXRoKHBhdGgsIGN3ZCk7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgYHBhdGhgIGluc3RlYWQgb2YgYGFic1BhdGhgIGJlY2F1c2UgdGhlIGN3ZCBwb3J0aW9uIGNhbid0IGJlIGEgZ2xvYlxuICAgICAgICAgICAgICAgIHJldHVybiBhYnNQYXRoO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcGF0aHMuZm9yRWFjaCgocGF0aCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fcmVtb3ZlSWdub3JlZFBhdGgocGF0aCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl91c2VySWdub3JlZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKCF0aGlzLl9yZWFkeUNvdW50KVxuICAgICAgICAgICAgdGhpcy5fcmVhZHlDb3VudCA9IDA7XG4gICAgICAgIHRoaXMuX3JlYWR5Q291bnQgKz0gcGF0aHMubGVuZ3RoO1xuICAgICAgICBQcm9taXNlLmFsbChwYXRocy5tYXAoYXN5bmMgKHBhdGgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IHRoaXMuX25vZGVGc0hhbmRsZXIuX2FkZFRvTm9kZUZzKHBhdGgsICFfaW50ZXJuYWwsIHVuZGVmaW5lZCwgMCwgX29yaWdBZGQpO1xuICAgICAgICAgICAgaWYgKHJlcylcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0UmVhZHkoKTtcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH0pKS50aGVuKChyZXN1bHRzKSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy5jbG9zZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgcmVzdWx0cy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0pXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkKHN5c1BhdGguZGlybmFtZShpdGVtKSwgc3lzUGF0aC5iYXNlbmFtZShfb3JpZ0FkZCB8fCBpdGVtKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDbG9zZSB3YXRjaGVycyBvciBzdGFydCBpZ25vcmluZyBldmVudHMgZnJvbSBzcGVjaWZpZWQgcGF0aHMuXG4gICAgICovXG4gICAgdW53YXRjaChwYXRoc18pIHtcbiAgICAgICAgaWYgKHRoaXMuY2xvc2VkKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIGNvbnN0IHBhdGhzID0gdW5pZnlQYXRocyhwYXRoc18pO1xuICAgICAgICBjb25zdCB7IGN3ZCB9ID0gdGhpcy5vcHRpb25zO1xuICAgICAgICBwYXRocy5mb3JFYWNoKChwYXRoKSA9PiB7XG4gICAgICAgICAgICAvLyBjb252ZXJ0IHRvIGFic29sdXRlIHBhdGggdW5sZXNzIHJlbGF0aXZlIHBhdGggYWxyZWFkeSBtYXRjaGVzXG4gICAgICAgICAgICBpZiAoIXN5c1BhdGguaXNBYnNvbHV0ZShwYXRoKSAmJiAhdGhpcy5fY2xvc2Vycy5oYXMocGF0aCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoY3dkKVxuICAgICAgICAgICAgICAgICAgICBwYXRoID0gc3lzUGF0aC5qb2luKGN3ZCwgcGF0aCk7XG4gICAgICAgICAgICAgICAgcGF0aCA9IHN5c1BhdGgucmVzb2x2ZShwYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2Nsb3NlUGF0aChwYXRoKTtcbiAgICAgICAgICAgIHRoaXMuX2FkZElnbm9yZWRQYXRoKHBhdGgpO1xuICAgICAgICAgICAgaWYgKHRoaXMuX3dhdGNoZWQuaGFzKHBhdGgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYWRkSWdub3JlZFBhdGgoe1xuICAgICAgICAgICAgICAgICAgICBwYXRoLFxuICAgICAgICAgICAgICAgICAgICByZWN1cnNpdmU6IHRydWUsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyByZXNldCB0aGUgY2FjaGVkIHVzZXJJZ25vcmVkIGFueW1hdGNoIGZuXG4gICAgICAgICAgICAvLyB0byBtYWtlIGlnbm9yZWRQYXRocyBjaGFuZ2VzIGVmZmVjdGl2ZVxuICAgICAgICAgICAgdGhpcy5fdXNlcklnbm9yZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xvc2Ugd2F0Y2hlcnMgYW5kIHJlbW92ZSBhbGwgbGlzdGVuZXJzIGZyb20gd2F0Y2hlZCBwYXRocy5cbiAgICAgKi9cbiAgICBjbG9zZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuX2Nsb3NlUHJvbWlzZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2Nsb3NlUHJvbWlzZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNsb3NlZCA9IHRydWU7XG4gICAgICAgIC8vIE1lbW9yeSBtYW5hZ2VtZW50LlxuICAgICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygpO1xuICAgICAgICBjb25zdCBjbG9zZXJzID0gW107XG4gICAgICAgIHRoaXMuX2Nsb3NlcnMuZm9yRWFjaCgoY2xvc2VyTGlzdCkgPT4gY2xvc2VyTGlzdC5mb3JFYWNoKChjbG9zZXIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSBjbG9zZXIoKTtcbiAgICAgICAgICAgIGlmIChwcm9taXNlIGluc3RhbmNlb2YgUHJvbWlzZSlcbiAgICAgICAgICAgICAgICBjbG9zZXJzLnB1c2gocHJvbWlzZSk7XG4gICAgICAgIH0pKTtcbiAgICAgICAgdGhpcy5fc3RyZWFtcy5mb3JFYWNoKChzdHJlYW0pID0+IHN0cmVhbS5kZXN0cm95KCkpO1xuICAgICAgICB0aGlzLl91c2VySWdub3JlZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5fcmVhZHlDb3VudCA9IDA7XG4gICAgICAgIHRoaXMuX3JlYWR5RW1pdHRlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLl93YXRjaGVkLmZvckVhY2goKGRpcmVudCkgPT4gZGlyZW50LmRpc3Bvc2UoKSk7XG4gICAgICAgIHRoaXMuX2Nsb3NlcnMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5fd2F0Y2hlZC5jbGVhcigpO1xuICAgICAgICB0aGlzLl9zdHJlYW1zLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuX3N5bWxpbmtQYXRocy5jbGVhcigpO1xuICAgICAgICB0aGlzLl90aHJvdHRsZWQuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5fY2xvc2VQcm9taXNlID0gY2xvc2Vycy5sZW5ndGhcbiAgICAgICAgICAgID8gUHJvbWlzZS5hbGwoY2xvc2VycykudGhlbigoKSA9PiB1bmRlZmluZWQpXG4gICAgICAgICAgICA6IFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICByZXR1cm4gdGhpcy5fY2xvc2VQcm9taXNlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBFeHBvc2UgbGlzdCBvZiB3YXRjaGVkIHBhdGhzXG4gICAgICogQHJldHVybnMgZm9yIGNoYWluaW5nXG4gICAgICovXG4gICAgZ2V0V2F0Y2hlZCgpIHtcbiAgICAgICAgY29uc3Qgd2F0Y2hMaXN0ID0ge307XG4gICAgICAgIHRoaXMuX3dhdGNoZWQuZm9yRWFjaCgoZW50cnksIGRpcikgPT4ge1xuICAgICAgICAgICAgY29uc3Qga2V5ID0gdGhpcy5vcHRpb25zLmN3ZCA/IHN5c1BhdGgucmVsYXRpdmUodGhpcy5vcHRpb25zLmN3ZCwgZGlyKSA6IGRpcjtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0ga2V5IHx8IE9ORV9ET1Q7XG4gICAgICAgICAgICB3YXRjaExpc3RbaW5kZXhdID0gZW50cnkuZ2V0Q2hpbGRyZW4oKS5zb3J0KCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gd2F0Y2hMaXN0O1xuICAgIH1cbiAgICBlbWl0V2l0aEFsbChldmVudCwgYXJncykge1xuICAgICAgICB0aGlzLmVtaXQoZXZlbnQsIC4uLmFyZ3MpO1xuICAgICAgICBpZiAoZXZlbnQgIT09IEVWLkVSUk9SKVxuICAgICAgICAgICAgdGhpcy5lbWl0KEVWLkFMTCwgZXZlbnQsIC4uLmFyZ3MpO1xuICAgIH1cbiAgICAvLyBDb21tb24gaGVscGVyc1xuICAgIC8vIC0tLS0tLS0tLS0tLS0tXG4gICAgLyoqXG4gICAgICogTm9ybWFsaXplIGFuZCBlbWl0IGV2ZW50cy5cbiAgICAgKiBDYWxsaW5nIF9lbWl0IERPRVMgTk9UIE1FQU4gZW1pdCgpIHdvdWxkIGJlIGNhbGxlZCFcbiAgICAgKiBAcGFyYW0gZXZlbnQgVHlwZSBvZiBldmVudFxuICAgICAqIEBwYXJhbSBwYXRoIEZpbGUgb3IgZGlyZWN0b3J5IHBhdGhcbiAgICAgKiBAcGFyYW0gc3RhdHMgYXJndW1lbnRzIHRvIGJlIHBhc3NlZCB3aXRoIGV2ZW50XG4gICAgICogQHJldHVybnMgdGhlIGVycm9yIGlmIGRlZmluZWQsIG90aGVyd2lzZSB0aGUgdmFsdWUgb2YgdGhlIEZTV2F0Y2hlciBpbnN0YW5jZSdzIGBjbG9zZWRgIGZsYWdcbiAgICAgKi9cbiAgICBhc3luYyBfZW1pdChldmVudCwgcGF0aCwgc3RhdHMpIHtcbiAgICAgICAgaWYgKHRoaXMuY2xvc2VkKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCBvcHRzID0gdGhpcy5vcHRpb25zO1xuICAgICAgICBpZiAoaXNXaW5kb3dzKVxuICAgICAgICAgICAgcGF0aCA9IHN5c1BhdGgubm9ybWFsaXplKHBhdGgpO1xuICAgICAgICBpZiAob3B0cy5jd2QpXG4gICAgICAgICAgICBwYXRoID0gc3lzUGF0aC5yZWxhdGl2ZShvcHRzLmN3ZCwgcGF0aCk7XG4gICAgICAgIGNvbnN0IGFyZ3MgPSBbcGF0aF07XG4gICAgICAgIGlmIChzdGF0cyAhPSBudWxsKVxuICAgICAgICAgICAgYXJncy5wdXNoKHN0YXRzKTtcbiAgICAgICAgY29uc3QgYXdmID0gb3B0cy5hd2FpdFdyaXRlRmluaXNoO1xuICAgICAgICBsZXQgcHc7XG4gICAgICAgIGlmIChhd2YgJiYgKHB3ID0gdGhpcy5fcGVuZGluZ1dyaXRlcy5nZXQocGF0aCkpKSB7XG4gICAgICAgICAgICBwdy5sYXN0Q2hhbmdlID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChvcHRzLmF0b21pYykge1xuICAgICAgICAgICAgaWYgKGV2ZW50ID09PSBFVi5VTkxJTkspIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9wZW5kaW5nVW5saW5rcy5zZXQocGF0aCwgW2V2ZW50LCAuLi5hcmdzXSk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3BlbmRpbmdVbmxpbmtzLmZvckVhY2goKGVudHJ5LCBwYXRoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXQoLi4uZW50cnkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0KEVWLkFMTCwgLi4uZW50cnkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcGVuZGluZ1VubGlua3MuZGVsZXRlKHBhdGgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LCB0eXBlb2Ygb3B0cy5hdG9taWMgPT09ICdudW1iZXInID8gb3B0cy5hdG9taWMgOiAxMDApO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGV2ZW50ID09PSBFVi5BREQgJiYgdGhpcy5fcGVuZGluZ1VubGlua3MuaGFzKHBhdGgpKSB7XG4gICAgICAgICAgICAgICAgZXZlbnQgPSBFVi5DSEFOR0U7XG4gICAgICAgICAgICAgICAgdGhpcy5fcGVuZGluZ1VubGlua3MuZGVsZXRlKHBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChhd2YgJiYgKGV2ZW50ID09PSBFVi5BREQgfHwgZXZlbnQgPT09IEVWLkNIQU5HRSkgJiYgdGhpcy5fcmVhZHlFbWl0dGVkKSB7XG4gICAgICAgICAgICBjb25zdCBhd2ZFbWl0ID0gKGVyciwgc3RhdHMpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50ID0gRVYuRVJST1I7XG4gICAgICAgICAgICAgICAgICAgIGFyZ3NbMF0gPSBlcnI7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdFdpdGhBbGwoZXZlbnQsIGFyZ3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChzdGF0cykge1xuICAgICAgICAgICAgICAgICAgICAvLyBpZiBzdGF0cyBkb2Vzbid0IGV4aXN0IHRoZSBmaWxlIG11c3QgaGF2ZSBiZWVuIGRlbGV0ZWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJnc1sxXSA9IHN0YXRzO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5wdXNoKHN0YXRzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXRXaXRoQWxsKGV2ZW50LCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5fYXdhaXRXcml0ZUZpbmlzaChwYXRoLCBhd2Yuc3RhYmlsaXR5VGhyZXNob2xkLCBldmVudCwgYXdmRW1pdCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZXZlbnQgPT09IEVWLkNIQU5HRSkge1xuICAgICAgICAgICAgY29uc3QgaXNUaHJvdHRsZWQgPSAhdGhpcy5fdGhyb3R0bGUoRVYuQ0hBTkdFLCBwYXRoLCA1MCk7XG4gICAgICAgICAgICBpZiAoaXNUaHJvdHRsZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdHMuYWx3YXlzU3RhdCAmJlxuICAgICAgICAgICAgc3RhdHMgPT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgKGV2ZW50ID09PSBFVi5BREQgfHwgZXZlbnQgPT09IEVWLkFERF9ESVIgfHwgZXZlbnQgPT09IEVWLkNIQU5HRSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gb3B0cy5jd2QgPyBzeXNQYXRoLmpvaW4ob3B0cy5jd2QsIHBhdGgpIDogcGF0aDtcbiAgICAgICAgICAgIGxldCBzdGF0cztcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgc3RhdHMgPSBhd2FpdCBzdGF0KGZ1bGxQYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAvLyBkbyBub3RoaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBTdXBwcmVzcyBldmVudCB3aGVuIGZzX3N0YXQgZmFpbHMsIHRvIGF2b2lkIHNlbmRpbmcgdW5kZWZpbmVkICdzdGF0J1xuICAgICAgICAgICAgaWYgKCFzdGF0cyB8fCB0aGlzLmNsb3NlZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBhcmdzLnB1c2goc3RhdHMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZW1pdFdpdGhBbGwoZXZlbnQsIGFyZ3MpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ29tbW9uIGhhbmRsZXIgZm9yIGVycm9yc1xuICAgICAqIEByZXR1cm5zIFRoZSBlcnJvciBpZiBkZWZpbmVkLCBvdGhlcndpc2UgdGhlIHZhbHVlIG9mIHRoZSBGU1dhdGNoZXIgaW5zdGFuY2UncyBgY2xvc2VkYCBmbGFnXG4gICAgICovXG4gICAgX2hhbmRsZUVycm9yKGVycm9yKSB7XG4gICAgICAgIGNvbnN0IGNvZGUgPSBlcnJvciAmJiBlcnJvci5jb2RlO1xuICAgICAgICBpZiAoZXJyb3IgJiZcbiAgICAgICAgICAgIGNvZGUgIT09ICdFTk9FTlQnICYmXG4gICAgICAgICAgICBjb2RlICE9PSAnRU5PVERJUicgJiZcbiAgICAgICAgICAgICghdGhpcy5vcHRpb25zLmlnbm9yZVBlcm1pc3Npb25FcnJvcnMgfHwgKGNvZGUgIT09ICdFUEVSTScgJiYgY29kZSAhPT0gJ0VBQ0NFUycpKSkge1xuICAgICAgICAgICAgdGhpcy5lbWl0KEVWLkVSUk9SLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVycm9yIHx8IHRoaXMuY2xvc2VkO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBIZWxwZXIgdXRpbGl0eSBmb3IgdGhyb3R0bGluZ1xuICAgICAqIEBwYXJhbSBhY3Rpb25UeXBlIHR5cGUgYmVpbmcgdGhyb3R0bGVkXG4gICAgICogQHBhcmFtIHBhdGggYmVpbmcgYWN0ZWQgdXBvblxuICAgICAqIEBwYXJhbSB0aW1lb3V0IGR1cmF0aW9uIG9mIHRpbWUgdG8gc3VwcHJlc3MgZHVwbGljYXRlIGFjdGlvbnNcbiAgICAgKiBAcmV0dXJucyB0cmFja2luZyBvYmplY3Qgb3IgZmFsc2UgaWYgYWN0aW9uIHNob3VsZCBiZSBzdXBwcmVzc2VkXG4gICAgICovXG4gICAgX3Rocm90dGxlKGFjdGlvblR5cGUsIHBhdGgsIHRpbWVvdXQpIHtcbiAgICAgICAgaWYgKCF0aGlzLl90aHJvdHRsZWQuaGFzKGFjdGlvblR5cGUpKSB7XG4gICAgICAgICAgICB0aGlzLl90aHJvdHRsZWQuc2V0KGFjdGlvblR5cGUsIG5ldyBNYXAoKSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYWN0aW9uID0gdGhpcy5fdGhyb3R0bGVkLmdldChhY3Rpb25UeXBlKTtcbiAgICAgICAgaWYgKCFhY3Rpb24pXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgdGhyb3R0bGUnKTtcbiAgICAgICAgY29uc3QgYWN0aW9uUGF0aCA9IGFjdGlvbi5nZXQocGF0aCk7XG4gICAgICAgIGlmIChhY3Rpb25QYXRoKSB7XG4gICAgICAgICAgICBhY3Rpb25QYXRoLmNvdW50Kys7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHByZWZlci1jb25zdFxuICAgICAgICBsZXQgdGltZW91dE9iamVjdDtcbiAgICAgICAgY29uc3QgY2xlYXIgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpdGVtID0gYWN0aW9uLmdldChwYXRoKTtcbiAgICAgICAgICAgIGNvbnN0IGNvdW50ID0gaXRlbSA/IGl0ZW0uY291bnQgOiAwO1xuICAgICAgICAgICAgYWN0aW9uLmRlbGV0ZShwYXRoKTtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0T2JqZWN0KTtcbiAgICAgICAgICAgIGlmIChpdGVtKVxuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChpdGVtLnRpbWVvdXRPYmplY3QpO1xuICAgICAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgICAgICB9O1xuICAgICAgICB0aW1lb3V0T2JqZWN0ID0gc2V0VGltZW91dChjbGVhciwgdGltZW91dCk7XG4gICAgICAgIGNvbnN0IHRociA9IHsgdGltZW91dE9iamVjdCwgY2xlYXIsIGNvdW50OiAwIH07XG4gICAgICAgIGFjdGlvbi5zZXQocGF0aCwgdGhyKTtcbiAgICAgICAgcmV0dXJuIHRocjtcbiAgICB9XG4gICAgX2luY3JSZWFkeUNvdW50KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcmVhZHlDb3VudCsrO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBd2FpdHMgd3JpdGUgb3BlcmF0aW9uIHRvIGZpbmlzaC5cbiAgICAgKiBQb2xscyBhIG5ld2x5IGNyZWF0ZWQgZmlsZSBmb3Igc2l6ZSB2YXJpYXRpb25zLiBXaGVuIGZpbGVzIHNpemUgZG9lcyBub3QgY2hhbmdlIGZvciAndGhyZXNob2xkJyBtaWxsaXNlY29uZHMgY2FsbHMgY2FsbGJhY2suXG4gICAgICogQHBhcmFtIHBhdGggYmVpbmcgYWN0ZWQgdXBvblxuICAgICAqIEBwYXJhbSB0aHJlc2hvbGQgVGltZSBpbiBtaWxsaXNlY29uZHMgYSBmaWxlIHNpemUgbXVzdCBiZSBmaXhlZCBiZWZvcmUgYWNrbm93bGVkZ2luZyB3cml0ZSBPUCBpcyBmaW5pc2hlZFxuICAgICAqIEBwYXJhbSBldmVudFxuICAgICAqIEBwYXJhbSBhd2ZFbWl0IENhbGxiYWNrIHRvIGJlIGNhbGxlZCB3aGVuIHJlYWR5IGZvciBldmVudCB0byBiZSBlbWl0dGVkLlxuICAgICAqL1xuICAgIF9hd2FpdFdyaXRlRmluaXNoKHBhdGgsIHRocmVzaG9sZCwgZXZlbnQsIGF3ZkVtaXQpIHtcbiAgICAgICAgY29uc3QgYXdmID0gdGhpcy5vcHRpb25zLmF3YWl0V3JpdGVGaW5pc2g7XG4gICAgICAgIGlmICh0eXBlb2YgYXdmICE9PSAnb2JqZWN0JylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY29uc3QgcG9sbEludGVydmFsID0gYXdmLnBvbGxJbnRlcnZhbDtcbiAgICAgICAgbGV0IHRpbWVvdXRIYW5kbGVyO1xuICAgICAgICBsZXQgZnVsbFBhdGggPSBwYXRoO1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmN3ZCAmJiAhc3lzUGF0aC5pc0Fic29sdXRlKHBhdGgpKSB7XG4gICAgICAgICAgICBmdWxsUGF0aCA9IHN5c1BhdGguam9pbih0aGlzLm9wdGlvbnMuY3dkLCBwYXRoKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgICBjb25zdCB3cml0ZXMgPSB0aGlzLl9wZW5kaW5nV3JpdGVzO1xuICAgICAgICBmdW5jdGlvbiBhd2FpdFdyaXRlRmluaXNoRm4ocHJldlN0YXQpIHtcbiAgICAgICAgICAgIHN0YXRjYihmdWxsUGF0aCwgKGVyciwgY3VyU3RhdCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIgfHwgIXdyaXRlcy5oYXMocGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVyciAmJiBlcnIuY29kZSAhPT0gJ0VOT0VOVCcpXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2ZFbWl0KGVycik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3Qgbm93ID0gTnVtYmVyKG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgICAgIGlmIChwcmV2U3RhdCAmJiBjdXJTdGF0LnNpemUgIT09IHByZXZTdGF0LnNpemUpIHtcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVzLmdldChwYXRoKS5sYXN0Q2hhbmdlID0gbm93O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBwdyA9IHdyaXRlcy5nZXQocGF0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGYgPSBub3cgLSBwdy5sYXN0Q2hhbmdlO1xuICAgICAgICAgICAgICAgIGlmIChkZiA+PSB0aHJlc2hvbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVzLmRlbGV0ZShwYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgYXdmRW1pdCh1bmRlZmluZWQsIGN1clN0YXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGltZW91dEhhbmRsZXIgPSBzZXRUaW1lb3V0KGF3YWl0V3JpdGVGaW5pc2hGbiwgcG9sbEludGVydmFsLCBjdXJTdGF0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXdyaXRlcy5oYXMocGF0aCkpIHtcbiAgICAgICAgICAgIHdyaXRlcy5zZXQocGF0aCwge1xuICAgICAgICAgICAgICAgIGxhc3RDaGFuZ2U6IG5vdyxcbiAgICAgICAgICAgICAgICBjYW5jZWxXYWl0OiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHdyaXRlcy5kZWxldGUocGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SGFuZGxlcik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBldmVudDtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aW1lb3V0SGFuZGxlciA9IHNldFRpbWVvdXQoYXdhaXRXcml0ZUZpbmlzaEZuLCBwb2xsSW50ZXJ2YWwpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIERldGVybWluZXMgd2hldGhlciB1c2VyIGhhcyBhc2tlZCB0byBpZ25vcmUgdGhpcyBwYXRoLlxuICAgICAqL1xuICAgIF9pc0lnbm9yZWQocGF0aCwgc3RhdHMpIHtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5hdG9taWMgJiYgRE9UX1JFLnRlc3QocGF0aCkpXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgaWYgKCF0aGlzLl91c2VySWdub3JlZCkge1xuICAgICAgICAgICAgY29uc3QgeyBjd2QgfSA9IHRoaXMub3B0aW9ucztcbiAgICAgICAgICAgIGNvbnN0IGlnbiA9IHRoaXMub3B0aW9ucy5pZ25vcmVkO1xuICAgICAgICAgICAgY29uc3QgaWdub3JlZCA9IChpZ24gfHwgW10pLm1hcChub3JtYWxpemVJZ25vcmVkKGN3ZCkpO1xuICAgICAgICAgICAgY29uc3QgaWdub3JlZFBhdGhzID0gWy4uLnRoaXMuX2lnbm9yZWRQYXRoc107XG4gICAgICAgICAgICBjb25zdCBsaXN0ID0gWy4uLmlnbm9yZWRQYXRocy5tYXAobm9ybWFsaXplSWdub3JlZChjd2QpKSwgLi4uaWdub3JlZF07XG4gICAgICAgICAgICB0aGlzLl91c2VySWdub3JlZCA9IGFueW1hdGNoKGxpc3QsIHVuZGVmaW5lZCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3VzZXJJZ25vcmVkKHBhdGgsIHN0YXRzKTtcbiAgICB9XG4gICAgX2lzbnRJZ25vcmVkKHBhdGgsIHN0YXQpIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLl9pc0lnbm9yZWQocGF0aCwgc3RhdCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFByb3ZpZGVzIGEgc2V0IG9mIGNvbW1vbiBoZWxwZXJzIGFuZCBwcm9wZXJ0aWVzIHJlbGF0aW5nIHRvIHN5bWxpbmsgaGFuZGxpbmcuXG4gICAgICogQHBhcmFtIHBhdGggZmlsZSBvciBkaXJlY3RvcnkgcGF0dGVybiBiZWluZyB3YXRjaGVkXG4gICAgICovXG4gICAgX2dldFdhdGNoSGVscGVycyhwYXRoKSB7XG4gICAgICAgIHJldHVybiBuZXcgV2F0Y2hIZWxwZXIocGF0aCwgdGhpcy5vcHRpb25zLmZvbGxvd1N5bWxpbmtzLCB0aGlzKTtcbiAgICB9XG4gICAgLy8gRGlyZWN0b3J5IGhlbHBlcnNcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8qKlxuICAgICAqIFByb3ZpZGVzIGRpcmVjdG9yeSB0cmFja2luZyBvYmplY3RzXG4gICAgICogQHBhcmFtIGRpcmVjdG9yeSBwYXRoIG9mIHRoZSBkaXJlY3RvcnlcbiAgICAgKi9cbiAgICBfZ2V0V2F0Y2hlZERpcihkaXJlY3RvcnkpIHtcbiAgICAgICAgY29uc3QgZGlyID0gc3lzUGF0aC5yZXNvbHZlKGRpcmVjdG9yeSk7XG4gICAgICAgIGlmICghdGhpcy5fd2F0Y2hlZC5oYXMoZGlyKSlcbiAgICAgICAgICAgIHRoaXMuX3dhdGNoZWQuc2V0KGRpciwgbmV3IERpckVudHJ5KGRpciwgdGhpcy5fYm91bmRSZW1vdmUpKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dhdGNoZWQuZ2V0KGRpcik7XG4gICAgfVxuICAgIC8vIEZpbGUgaGVscGVyc1xuICAgIC8vIC0tLS0tLS0tLS0tLVxuICAgIC8qKlxuICAgICAqIENoZWNrIGZvciByZWFkIHBlcm1pc3Npb25zOiBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMTE3ODE0MDQvMTM1ODQwNVxuICAgICAqL1xuICAgIF9oYXNSZWFkUGVybWlzc2lvbnMoc3RhdHMpIHtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5pZ25vcmVQZXJtaXNzaW9uRXJyb3JzKVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIHJldHVybiBCb29sZWFuKE51bWJlcihzdGF0cy5tb2RlKSAmIDBvNDAwKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogSGFuZGxlcyBlbWl0dGluZyB1bmxpbmsgZXZlbnRzIGZvclxuICAgICAqIGZpbGVzIGFuZCBkaXJlY3RvcmllcywgYW5kIHZpYSByZWN1cnNpb24sIGZvclxuICAgICAqIGZpbGVzIGFuZCBkaXJlY3RvcmllcyB3aXRoaW4gZGlyZWN0b3JpZXMgdGhhdCBhcmUgdW5saW5rZWRcbiAgICAgKiBAcGFyYW0gZGlyZWN0b3J5IHdpdGhpbiB3aGljaCB0aGUgZm9sbG93aW5nIGl0ZW0gaXMgbG9jYXRlZFxuICAgICAqIEBwYXJhbSBpdGVtICAgICAgYmFzZSBwYXRoIG9mIGl0ZW0vZGlyZWN0b3J5XG4gICAgICovXG4gICAgX3JlbW92ZShkaXJlY3RvcnksIGl0ZW0sIGlzRGlyZWN0b3J5KSB7XG4gICAgICAgIC8vIGlmIHdoYXQgaXMgYmVpbmcgZGVsZXRlZCBpcyBhIGRpcmVjdG9yeSwgZ2V0IHRoYXQgZGlyZWN0b3J5J3MgcGF0aHNcbiAgICAgICAgLy8gZm9yIHJlY3Vyc2l2ZSBkZWxldGluZyBhbmQgY2xlYW5pbmcgb2Ygd2F0Y2hlZCBvYmplY3RcbiAgICAgICAgLy8gaWYgaXQgaXMgbm90IGEgZGlyZWN0b3J5LCBuZXN0ZWREaXJlY3RvcnlDaGlsZHJlbiB3aWxsIGJlIGVtcHR5IGFycmF5XG4gICAgICAgIGNvbnN0IHBhdGggPSBzeXNQYXRoLmpvaW4oZGlyZWN0b3J5LCBpdGVtKTtcbiAgICAgICAgY29uc3QgZnVsbFBhdGggPSBzeXNQYXRoLnJlc29sdmUocGF0aCk7XG4gICAgICAgIGlzRGlyZWN0b3J5ID1cbiAgICAgICAgICAgIGlzRGlyZWN0b3J5ICE9IG51bGwgPyBpc0RpcmVjdG9yeSA6IHRoaXMuX3dhdGNoZWQuaGFzKHBhdGgpIHx8IHRoaXMuX3dhdGNoZWQuaGFzKGZ1bGxQYXRoKTtcbiAgICAgICAgLy8gcHJldmVudCBkdXBsaWNhdGUgaGFuZGxpbmcgaW4gY2FzZSBvZiBhcnJpdmluZyBoZXJlIG5lYXJseSBzaW11bHRhbmVvdXNseVxuICAgICAgICAvLyB2aWEgbXVsdGlwbGUgcGF0aHMgKHN1Y2ggYXMgX2hhbmRsZUZpbGUgYW5kIF9oYW5kbGVEaXIpXG4gICAgICAgIGlmICghdGhpcy5fdGhyb3R0bGUoJ3JlbW92ZScsIHBhdGgsIDEwMCkpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIC8vIGlmIHRoZSBvbmx5IHdhdGNoZWQgZmlsZSBpcyByZW1vdmVkLCB3YXRjaCBmb3IgaXRzIHJldHVyblxuICAgICAgICBpZiAoIWlzRGlyZWN0b3J5ICYmIHRoaXMuX3dhdGNoZWQuc2l6ZSA9PT0gMSkge1xuICAgICAgICAgICAgdGhpcy5hZGQoZGlyZWN0b3J5LCBpdGVtLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUaGlzIHdpbGwgY3JlYXRlIGEgbmV3IGVudHJ5IGluIHRoZSB3YXRjaGVkIG9iamVjdCBpbiBlaXRoZXIgY2FzZVxuICAgICAgICAvLyBzbyB3ZSBnb3QgdG8gZG8gdGhlIGRpcmVjdG9yeSBjaGVjayBiZWZvcmVoYW5kXG4gICAgICAgIGNvbnN0IHdwID0gdGhpcy5fZ2V0V2F0Y2hlZERpcihwYXRoKTtcbiAgICAgICAgY29uc3QgbmVzdGVkRGlyZWN0b3J5Q2hpbGRyZW4gPSB3cC5nZXRDaGlsZHJlbigpO1xuICAgICAgICAvLyBSZWN1cnNpdmVseSByZW1vdmUgY2hpbGRyZW4gZGlyZWN0b3JpZXMgLyBmaWxlcy5cbiAgICAgICAgbmVzdGVkRGlyZWN0b3J5Q2hpbGRyZW4uZm9yRWFjaCgobmVzdGVkKSA9PiB0aGlzLl9yZW1vdmUocGF0aCwgbmVzdGVkKSk7XG4gICAgICAgIC8vIENoZWNrIGlmIGl0ZW0gd2FzIG9uIHRoZSB3YXRjaGVkIGxpc3QgYW5kIHJlbW92ZSBpdFxuICAgICAgICBjb25zdCBwYXJlbnQgPSB0aGlzLl9nZXRXYXRjaGVkRGlyKGRpcmVjdG9yeSk7XG4gICAgICAgIGNvbnN0IHdhc1RyYWNrZWQgPSBwYXJlbnQuaGFzKGl0ZW0pO1xuICAgICAgICBwYXJlbnQucmVtb3ZlKGl0ZW0pO1xuICAgICAgICAvLyBGaXhlcyBpc3N1ZSAjMTA0MiAtPiBSZWxhdGl2ZSBwYXRocyB3ZXJlIGRldGVjdGVkIGFuZCBhZGRlZCBhcyBzeW1saW5rc1xuICAgICAgICAvLyAoaHR0cHM6Ly9naXRodWIuY29tL3BhdWxtaWxsci9jaG9raWRhci9ibG9iL2UxNzUzZGRiYzk1NzFiZGMzM2I0YTRhZjE3MmQ1MmNiNmU2MTFjMTAvbGliL25vZGVmcy1oYW5kbGVyLmpzI0w2MTIpLFxuICAgICAgICAvLyBidXQgbmV2ZXIgcmVtb3ZlZCBmcm9tIHRoZSBtYXAgaW4gY2FzZSB0aGUgcGF0aCB3YXMgZGVsZXRlZC5cbiAgICAgICAgLy8gVGhpcyBsZWFkcyB0byBhbiBpbmNvcnJlY3Qgc3RhdGUgaWYgdGhlIHBhdGggd2FzIHJlY3JlYXRlZDpcbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3BhdWxtaWxsci9jaG9raWRhci9ibG9iL2UxNzUzZGRiYzk1NzFiZGMzM2I0YTRhZjE3MmQ1MmNiNmU2MTFjMTAvbGliL25vZGVmcy1oYW5kbGVyLmpzI0w1NTNcbiAgICAgICAgaWYgKHRoaXMuX3N5bWxpbmtQYXRocy5oYXMoZnVsbFBhdGgpKSB7XG4gICAgICAgICAgICB0aGlzLl9zeW1saW5rUGF0aHMuZGVsZXRlKGZ1bGxQYXRoKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBJZiB3ZSB3YWl0IGZvciB0aGlzIGZpbGUgdG8gYmUgZnVsbHkgd3JpdHRlbiwgY2FuY2VsIHRoZSB3YWl0LlxuICAgICAgICBsZXQgcmVsUGF0aCA9IHBhdGg7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuY3dkKVxuICAgICAgICAgICAgcmVsUGF0aCA9IHN5c1BhdGgucmVsYXRpdmUodGhpcy5vcHRpb25zLmN3ZCwgcGF0aCk7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuYXdhaXRXcml0ZUZpbmlzaCAmJiB0aGlzLl9wZW5kaW5nV3JpdGVzLmhhcyhyZWxQYXRoKSkge1xuICAgICAgICAgICAgY29uc3QgZXZlbnQgPSB0aGlzLl9wZW5kaW5nV3JpdGVzLmdldChyZWxQYXRoKS5jYW5jZWxXYWl0KCk7XG4gICAgICAgICAgICBpZiAoZXZlbnQgPT09IEVWLkFERClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGhlIEVudHJ5IHdpbGwgZWl0aGVyIGJlIGEgZGlyZWN0b3J5IHRoYXQganVzdCBnb3QgcmVtb3ZlZFxuICAgICAgICAvLyBvciBhIGJvZ3VzIGVudHJ5IHRvIGEgZmlsZSwgaW4gZWl0aGVyIGNhc2Ugd2UgaGF2ZSB0byByZW1vdmUgaXRcbiAgICAgICAgdGhpcy5fd2F0Y2hlZC5kZWxldGUocGF0aCk7XG4gICAgICAgIHRoaXMuX3dhdGNoZWQuZGVsZXRlKGZ1bGxQYXRoKTtcbiAgICAgICAgY29uc3QgZXZlbnROYW1lID0gaXNEaXJlY3RvcnkgPyBFVi5VTkxJTktfRElSIDogRVYuVU5MSU5LO1xuICAgICAgICBpZiAod2FzVHJhY2tlZCAmJiAhdGhpcy5faXNJZ25vcmVkKHBhdGgpKVxuICAgICAgICAgICAgdGhpcy5fZW1pdChldmVudE5hbWUsIHBhdGgpO1xuICAgICAgICAvLyBBdm9pZCBjb25mbGljdHMgaWYgd2UgbGF0ZXIgY3JlYXRlIGFub3RoZXIgZmlsZSB3aXRoIHRoZSBzYW1lIG5hbWVcbiAgICAgICAgdGhpcy5fY2xvc2VQYXRoKHBhdGgpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDbG9zZXMgYWxsIHdhdGNoZXJzIGZvciBhIHBhdGhcbiAgICAgKi9cbiAgICBfY2xvc2VQYXRoKHBhdGgpIHtcbiAgICAgICAgdGhpcy5fY2xvc2VGaWxlKHBhdGgpO1xuICAgICAgICBjb25zdCBkaXIgPSBzeXNQYXRoLmRpcm5hbWUocGF0aCk7XG4gICAgICAgIHRoaXMuX2dldFdhdGNoZWREaXIoZGlyKS5yZW1vdmUoc3lzUGF0aC5iYXNlbmFtZShwYXRoKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsb3NlcyBvbmx5IGZpbGUtc3BlY2lmaWMgd2F0Y2hlcnNcbiAgICAgKi9cbiAgICBfY2xvc2VGaWxlKHBhdGgpIHtcbiAgICAgICAgY29uc3QgY2xvc2VycyA9IHRoaXMuX2Nsb3NlcnMuZ2V0KHBhdGgpO1xuICAgICAgICBpZiAoIWNsb3NlcnMpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGNsb3NlcnMuZm9yRWFjaCgoY2xvc2VyKSA9PiBjbG9zZXIoKSk7XG4gICAgICAgIHRoaXMuX2Nsb3NlcnMuZGVsZXRlKHBhdGgpO1xuICAgIH1cbiAgICBfYWRkUGF0aENsb3NlcihwYXRoLCBjbG9zZXIpIHtcbiAgICAgICAgaWYgKCFjbG9zZXIpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGxldCBsaXN0ID0gdGhpcy5fY2xvc2Vycy5nZXQocGF0aCk7XG4gICAgICAgIGlmICghbGlzdCkge1xuICAgICAgICAgICAgbGlzdCA9IFtdO1xuICAgICAgICAgICAgdGhpcy5fY2xvc2Vycy5zZXQocGF0aCwgbGlzdCk7XG4gICAgICAgIH1cbiAgICAgICAgbGlzdC5wdXNoKGNsb3Nlcik7XG4gICAgfVxuICAgIF9yZWFkZGlycChyb290LCBvcHRzKSB7XG4gICAgICAgIGlmICh0aGlzLmNsb3NlZClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHsgdHlwZTogRVYuQUxMLCBhbHdheXNTdGF0OiB0cnVlLCBsc3RhdDogdHJ1ZSwgLi4ub3B0cywgZGVwdGg6IDAgfTtcbiAgICAgICAgbGV0IHN0cmVhbSA9IHJlYWRkaXJwKHJvb3QsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLl9zdHJlYW1zLmFkZChzdHJlYW0pO1xuICAgICAgICBzdHJlYW0ub25jZShTVFJfQ0xPU0UsICgpID0+IHtcbiAgICAgICAgICAgIHN0cmVhbSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfSk7XG4gICAgICAgIHN0cmVhbS5vbmNlKFNUUl9FTkQsICgpID0+IHtcbiAgICAgICAgICAgIGlmIChzdHJlYW0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdHJlYW1zLmRlbGV0ZShzdHJlYW0pO1xuICAgICAgICAgICAgICAgIHN0cmVhbSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdHJlYW07XG4gICAgfVxufVxuLyoqXG4gKiBJbnN0YW50aWF0ZXMgd2F0Y2hlciB3aXRoIHBhdGhzIHRvIGJlIHRyYWNrZWQuXG4gKiBAcGFyYW0gcGF0aHMgZmlsZSAvIGRpcmVjdG9yeSBwYXRoc1xuICogQHBhcmFtIG9wdGlvbnMgb3B0cywgc3VjaCBhcyBgYXRvbWljYCwgYGF3YWl0V3JpdGVGaW5pc2hgLCBgaWdub3JlZGAsIGFuZCBvdGhlcnNcbiAqIEByZXR1cm5zIGFuIGluc3RhbmNlIG9mIEZTV2F0Y2hlciBmb3IgY2hhaW5pbmcuXG4gKiBAZXhhbXBsZVxuICogY29uc3Qgd2F0Y2hlciA9IHdhdGNoKCcuJykub24oJ2FsbCcsIChldmVudCwgcGF0aCkgPT4geyBjb25zb2xlLmxvZyhldmVudCwgcGF0aCk7IH0pO1xuICogd2F0Y2goJy4nLCB7IGF0b21pYzogdHJ1ZSwgYXdhaXRXcml0ZUZpbmlzaDogdHJ1ZSwgaWdub3JlZDogKGYsIHN0YXRzKSA9PiBzdGF0cz8uaXNGaWxlKCkgJiYgIWYuZW5kc1dpdGgoJy5qcycpIH0pXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3YXRjaChwYXRocywgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3Qgd2F0Y2hlciA9IG5ldyBGU1dhdGNoZXIob3B0aW9ucyk7XG4gICAgd2F0Y2hlci5hZGQocGF0aHMpO1xuICAgIHJldHVybiB3YXRjaGVyO1xufVxuZXhwb3J0IGRlZmF1bHQgeyB3YXRjaCwgRlNXYXRjaGVyIH07XG4iLCAiaW1wb3J0IHsgc3RhdCwgbHN0YXQsIHJlYWRkaXIsIHJlYWxwYXRoIH0gZnJvbSAnbm9kZTpmcy9wcm9taXNlcyc7XG5pbXBvcnQgeyBSZWFkYWJsZSB9IGZyb20gJ25vZGU6c3RyZWFtJztcbmltcG9ydCB7IHJlc29sdmUgYXMgcHJlc29sdmUsIHJlbGF0aXZlIGFzIHByZWxhdGl2ZSwgam9pbiBhcyBwam9pbiwgc2VwIGFzIHBzZXAgfSBmcm9tICdub2RlOnBhdGgnO1xuZXhwb3J0IGNvbnN0IEVudHJ5VHlwZXMgPSB7XG4gICAgRklMRV9UWVBFOiAnZmlsZXMnLFxuICAgIERJUl9UWVBFOiAnZGlyZWN0b3JpZXMnLFxuICAgIEZJTEVfRElSX1RZUEU6ICdmaWxlc19kaXJlY3RvcmllcycsXG4gICAgRVZFUllUSElOR19UWVBFOiAnYWxsJyxcbn07XG5jb25zdCBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICByb290OiAnLicsXG4gICAgZmlsZUZpbHRlcjogKF9lbnRyeUluZm8pID0+IHRydWUsXG4gICAgZGlyZWN0b3J5RmlsdGVyOiAoX2VudHJ5SW5mbykgPT4gdHJ1ZSxcbiAgICB0eXBlOiBFbnRyeVR5cGVzLkZJTEVfVFlQRSxcbiAgICBsc3RhdDogZmFsc2UsXG4gICAgZGVwdGg6IDIxNDc0ODM2NDgsXG4gICAgYWx3YXlzU3RhdDogZmFsc2UsXG4gICAgaGlnaFdhdGVyTWFyazogNDA5Nixcbn07XG5PYmplY3QuZnJlZXplKGRlZmF1bHRPcHRpb25zKTtcbmNvbnN0IFJFQ1VSU0lWRV9FUlJPUl9DT0RFID0gJ1JFQURESVJQX1JFQ1VSU0lWRV9FUlJPUic7XG5jb25zdCBOT1JNQUxfRkxPV19FUlJPUlMgPSBuZXcgU2V0KFsnRU5PRU5UJywgJ0VQRVJNJywgJ0VBQ0NFUycsICdFTE9PUCcsIFJFQ1VSU0lWRV9FUlJPUl9DT0RFXSk7XG5jb25zdCBBTExfVFlQRVMgPSBbXG4gICAgRW50cnlUeXBlcy5ESVJfVFlQRSxcbiAgICBFbnRyeVR5cGVzLkVWRVJZVEhJTkdfVFlQRSxcbiAgICBFbnRyeVR5cGVzLkZJTEVfRElSX1RZUEUsXG4gICAgRW50cnlUeXBlcy5GSUxFX1RZUEUsXG5dO1xuY29uc3QgRElSX1RZUEVTID0gbmV3IFNldChbXG4gICAgRW50cnlUeXBlcy5ESVJfVFlQRSxcbiAgICBFbnRyeVR5cGVzLkVWRVJZVEhJTkdfVFlQRSxcbiAgICBFbnRyeVR5cGVzLkZJTEVfRElSX1RZUEUsXG5dKTtcbmNvbnN0IEZJTEVfVFlQRVMgPSBuZXcgU2V0KFtcbiAgICBFbnRyeVR5cGVzLkVWRVJZVEhJTkdfVFlQRSxcbiAgICBFbnRyeVR5cGVzLkZJTEVfRElSX1RZUEUsXG4gICAgRW50cnlUeXBlcy5GSUxFX1RZUEUsXG5dKTtcbmNvbnN0IGlzTm9ybWFsRmxvd0Vycm9yID0gKGVycm9yKSA9PiBOT1JNQUxfRkxPV19FUlJPUlMuaGFzKGVycm9yLmNvZGUpO1xuY29uc3Qgd2FudEJpZ2ludEZzU3RhdHMgPSBwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInO1xuY29uc3QgZW1wdHlGbiA9IChfZW50cnlJbmZvKSA9PiB0cnVlO1xuY29uc3Qgbm9ybWFsaXplRmlsdGVyID0gKGZpbHRlcikgPT4ge1xuICAgIGlmIChmaWx0ZXIgPT09IHVuZGVmaW5lZClcbiAgICAgICAgcmV0dXJuIGVtcHR5Rm47XG4gICAgaWYgKHR5cGVvZiBmaWx0ZXIgPT09ICdmdW5jdGlvbicpXG4gICAgICAgIHJldHVybiBmaWx0ZXI7XG4gICAgaWYgKHR5cGVvZiBmaWx0ZXIgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGNvbnN0IGZsID0gZmlsdGVyLnRyaW0oKTtcbiAgICAgICAgcmV0dXJuIChlbnRyeSkgPT4gZW50cnkuYmFzZW5hbWUgPT09IGZsO1xuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheShmaWx0ZXIpKSB7XG4gICAgICAgIGNvbnN0IHRySXRlbXMgPSBmaWx0ZXIubWFwKChpdGVtKSA9PiBpdGVtLnRyaW0oKSk7XG4gICAgICAgIHJldHVybiAoZW50cnkpID0+IHRySXRlbXMuc29tZSgoZikgPT4gZW50cnkuYmFzZW5hbWUgPT09IGYpO1xuICAgIH1cbiAgICByZXR1cm4gZW1wdHlGbjtcbn07XG4vKiogUmVhZGFibGUgcmVhZGRpciBzdHJlYW0sIGVtaXR0aW5nIG5ldyBmaWxlcyBhcyB0aGV5J3JlIGJlaW5nIGxpc3RlZC4gKi9cbmV4cG9ydCBjbGFzcyBSZWFkZGlycFN0cmVhbSBleHRlbmRzIFJlYWRhYmxlIHtcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICAgICAgc3VwZXIoe1xuICAgICAgICAgICAgb2JqZWN0TW9kZTogdHJ1ZSxcbiAgICAgICAgICAgIGF1dG9EZXN0cm95OiB0cnVlLFxuICAgICAgICAgICAgaGlnaFdhdGVyTWFyazogb3B0aW9ucy5oaWdoV2F0ZXJNYXJrLFxuICAgICAgICB9KTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IHsgLi4uZGVmYXVsdE9wdGlvbnMsIC4uLm9wdGlvbnMgfTtcbiAgICAgICAgY29uc3QgeyByb290LCB0eXBlIH0gPSBvcHRzO1xuICAgICAgICB0aGlzLl9maWxlRmlsdGVyID0gbm9ybWFsaXplRmlsdGVyKG9wdHMuZmlsZUZpbHRlcik7XG4gICAgICAgIHRoaXMuX2RpcmVjdG9yeUZpbHRlciA9IG5vcm1hbGl6ZUZpbHRlcihvcHRzLmRpcmVjdG9yeUZpbHRlcik7XG4gICAgICAgIGNvbnN0IHN0YXRNZXRob2QgPSBvcHRzLmxzdGF0ID8gbHN0YXQgOiBzdGF0O1xuICAgICAgICAvLyBVc2UgYmlnaW50IHN0YXRzIGlmIGl0J3Mgd2luZG93cyBhbmQgc3RhdCgpIHN1cHBvcnRzIG9wdGlvbnMgKG5vZGUgMTArKS5cbiAgICAgICAgaWYgKHdhbnRCaWdpbnRGc1N0YXRzKSB7XG4gICAgICAgICAgICB0aGlzLl9zdGF0ID0gKHBhdGgpID0+IHN0YXRNZXRob2QocGF0aCwgeyBiaWdpbnQ6IHRydWUgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zdGF0ID0gc3RhdE1ldGhvZDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9tYXhEZXB0aCA9IG9wdHMuZGVwdGggPz8gZGVmYXVsdE9wdGlvbnMuZGVwdGg7XG4gICAgICAgIHRoaXMuX3dhbnRzRGlyID0gdHlwZSA/IERJUl9UWVBFUy5oYXModHlwZSkgOiBmYWxzZTtcbiAgICAgICAgdGhpcy5fd2FudHNGaWxlID0gdHlwZSA/IEZJTEVfVFlQRVMuaGFzKHR5cGUpIDogZmFsc2U7XG4gICAgICAgIHRoaXMuX3dhbnRzRXZlcnl0aGluZyA9IHR5cGUgPT09IEVudHJ5VHlwZXMuRVZFUllUSElOR19UWVBFO1xuICAgICAgICB0aGlzLl9yb290ID0gcHJlc29sdmUocm9vdCk7XG4gICAgICAgIHRoaXMuX2lzRGlyZW50ID0gIW9wdHMuYWx3YXlzU3RhdDtcbiAgICAgICAgdGhpcy5fc3RhdHNQcm9wID0gdGhpcy5faXNEaXJlbnQgPyAnZGlyZW50JyA6ICdzdGF0cyc7XG4gICAgICAgIHRoaXMuX3JkT3B0aW9ucyA9IHsgZW5jb2Rpbmc6ICd1dGY4Jywgd2l0aEZpbGVUeXBlczogdGhpcy5faXNEaXJlbnQgfTtcbiAgICAgICAgLy8gTGF1bmNoIHN0cmVhbSB3aXRoIG9uZSBwYXJlbnQsIHRoZSByb290IGRpci5cbiAgICAgICAgdGhpcy5wYXJlbnRzID0gW3RoaXMuX2V4cGxvcmVEaXIocm9vdCwgMSldO1xuICAgICAgICB0aGlzLnJlYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5wYXJlbnQgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGFzeW5jIF9yZWFkKGJhdGNoKSB7XG4gICAgICAgIGlmICh0aGlzLnJlYWRpbmcpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRoaXMucmVhZGluZyA9IHRydWU7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB3aGlsZSAoIXRoaXMuZGVzdHJveWVkICYmIGJhdGNoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhciA9IHRoaXMucGFyZW50O1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbCA9IHBhciAmJiBwYXIuZmlsZXM7XG4gICAgICAgICAgICAgICAgaWYgKGZpbCAmJiBmaWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHBhdGgsIGRlcHRoIH0gPSBwYXI7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNsaWNlID0gZmlsLnNwbGljZSgwLCBiYXRjaCkubWFwKChkaXJlbnQpID0+IHRoaXMuX2Zvcm1hdEVudHJ5KGRpcmVudCwgcGF0aCkpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhd2FpdGVkID0gYXdhaXQgUHJvbWlzZS5hbGwoc2xpY2UpO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGF3YWl0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZW50cnkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5kZXN0cm95ZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZW50cnlUeXBlID0gYXdhaXQgdGhpcy5fZ2V0RW50cnlUeXBlKGVudHJ5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbnRyeVR5cGUgPT09ICdkaXJlY3RvcnknICYmIHRoaXMuX2RpcmVjdG9yeUZpbHRlcihlbnRyeSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGVwdGggPD0gdGhpcy5fbWF4RGVwdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wYXJlbnRzLnB1c2godGhpcy5fZXhwbG9yZURpcihlbnRyeS5mdWxsUGF0aCwgZGVwdGggKyAxKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLl93YW50c0Rpcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2goZW50cnkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiYXRjaC0tO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKChlbnRyeVR5cGUgPT09ICdmaWxlJyB8fCB0aGlzLl9pbmNsdWRlQXNGaWxlKGVudHJ5KSkgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9maWxlRmlsdGVyKGVudHJ5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLl93YW50c0ZpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoKGVudHJ5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmF0Y2gtLTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudCA9IHRoaXMucGFyZW50cy5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwYXJlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaChudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGFyZW50ID0gYXdhaXQgcGFyZW50O1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5kZXN0cm95ZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgdGhpcy5kZXN0cm95KGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgICBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMucmVhZGluZyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIGFzeW5jIF9leHBsb3JlRGlyKHBhdGgsIGRlcHRoKSB7XG4gICAgICAgIGxldCBmaWxlcztcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGZpbGVzID0gYXdhaXQgcmVhZGRpcihwYXRoLCB0aGlzLl9yZE9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgdGhpcy5fb25FcnJvcihlcnJvcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgZmlsZXMsIGRlcHRoLCBwYXRoIH07XG4gICAgfVxuICAgIGFzeW5jIF9mb3JtYXRFbnRyeShkaXJlbnQsIHBhdGgpIHtcbiAgICAgICAgbGV0IGVudHJ5O1xuICAgICAgICBjb25zdCBiYXNlbmFtZSA9IHRoaXMuX2lzRGlyZW50ID8gZGlyZW50Lm5hbWUgOiBkaXJlbnQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHByZXNvbHZlKHBqb2luKHBhdGgsIGJhc2VuYW1lKSk7XG4gICAgICAgICAgICBlbnRyeSA9IHsgcGF0aDogcHJlbGF0aXZlKHRoaXMuX3Jvb3QsIGZ1bGxQYXRoKSwgZnVsbFBhdGgsIGJhc2VuYW1lIH07XG4gICAgICAgICAgICBlbnRyeVt0aGlzLl9zdGF0c1Byb3BdID0gdGhpcy5faXNEaXJlbnQgPyBkaXJlbnQgOiBhd2FpdCB0aGlzLl9zdGF0KGZ1bGxQYXRoKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICB0aGlzLl9vbkVycm9yKGVycik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVudHJ5O1xuICAgIH1cbiAgICBfb25FcnJvcihlcnIpIHtcbiAgICAgICAgaWYgKGlzTm9ybWFsRmxvd0Vycm9yKGVycikgJiYgIXRoaXMuZGVzdHJveWVkKSB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ3dhcm4nLCBlcnIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5kZXN0cm95KGVycik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgYXN5bmMgX2dldEVudHJ5VHlwZShlbnRyeSkge1xuICAgICAgICAvLyBlbnRyeSBtYXkgYmUgdW5kZWZpbmVkLCBiZWNhdXNlIGEgd2FybmluZyBvciBhbiBlcnJvciB3ZXJlIGVtaXR0ZWRcbiAgICAgICAgLy8gYW5kIHRoZSBzdGF0c1Byb3AgaXMgdW5kZWZpbmVkXG4gICAgICAgIGlmICghZW50cnkgJiYgdGhpcy5fc3RhdHNQcm9wIGluIGVudHJ5KSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc3RhdHMgPSBlbnRyeVt0aGlzLl9zdGF0c1Byb3BdO1xuICAgICAgICBpZiAoc3RhdHMuaXNGaWxlKCkpXG4gICAgICAgICAgICByZXR1cm4gJ2ZpbGUnO1xuICAgICAgICBpZiAoc3RhdHMuaXNEaXJlY3RvcnkoKSlcbiAgICAgICAgICAgIHJldHVybiAnZGlyZWN0b3J5JztcbiAgICAgICAgaWYgKHN0YXRzICYmIHN0YXRzLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGwgPSBlbnRyeS5mdWxsUGF0aDtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZW50cnlSZWFsUGF0aCA9IGF3YWl0IHJlYWxwYXRoKGZ1bGwpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGVudHJ5UmVhbFBhdGhTdGF0cyA9IGF3YWl0IGxzdGF0KGVudHJ5UmVhbFBhdGgpO1xuICAgICAgICAgICAgICAgIGlmIChlbnRyeVJlYWxQYXRoU3RhdHMuaXNGaWxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdmaWxlJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGVudHJ5UmVhbFBhdGhTdGF0cy5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxlbiA9IGVudHJ5UmVhbFBhdGgubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZnVsbC5zdGFydHNXaXRoKGVudHJ5UmVhbFBhdGgpICYmIGZ1bGwuc3Vic3RyKGxlbiwgMSkgPT09IHBzZXApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlY3Vyc2l2ZUVycm9yID0gbmV3IEVycm9yKGBDaXJjdWxhciBzeW1saW5rIGRldGVjdGVkOiBcIiR7ZnVsbH1cIiBwb2ludHMgdG8gXCIke2VudHJ5UmVhbFBhdGh9XCJgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlY3Vyc2l2ZUVycm9yLmNvZGUgPSBSRUNVUlNJVkVfRVJST1JfQ09ERTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9vbkVycm9yKHJlY3Vyc2l2ZUVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ2RpcmVjdG9yeSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fb25FcnJvcihlcnJvcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIF9pbmNsdWRlQXNGaWxlKGVudHJ5KSB7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gZW50cnkgJiYgZW50cnlbdGhpcy5fc3RhdHNQcm9wXTtcbiAgICAgICAgcmV0dXJuIHN0YXRzICYmIHRoaXMuX3dhbnRzRXZlcnl0aGluZyAmJiAhc3RhdHMuaXNEaXJlY3RvcnkoKTtcbiAgICB9XG59XG4vKipcbiAqIFN0cmVhbWluZyB2ZXJzaW9uOiBSZWFkcyBhbGwgZmlsZXMgYW5kIGRpcmVjdG9yaWVzIGluIGdpdmVuIHJvb3QgcmVjdXJzaXZlbHkuXG4gKiBDb25zdW1lcyB+Y29uc3RhbnQgc21hbGwgYW1vdW50IG9mIFJBTS5cbiAqIEBwYXJhbSByb290IFJvb3QgZGlyZWN0b3J5XG4gKiBAcGFyYW0gb3B0aW9ucyBPcHRpb25zIHRvIHNwZWNpZnkgcm9vdCAoc3RhcnQgZGlyZWN0b3J5KSwgZmlsdGVycyBhbmQgcmVjdXJzaW9uIGRlcHRoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkZGlycChyb290LCBvcHRpb25zID0ge30pIHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgbGV0IHR5cGUgPSBvcHRpb25zLmVudHJ5VHlwZSB8fCBvcHRpb25zLnR5cGU7XG4gICAgaWYgKHR5cGUgPT09ICdib3RoJylcbiAgICAgICAgdHlwZSA9IEVudHJ5VHlwZXMuRklMRV9ESVJfVFlQRTsgLy8gYmFja3dhcmRzLWNvbXBhdGliaWxpdHlcbiAgICBpZiAodHlwZSlcbiAgICAgICAgb3B0aW9ucy50eXBlID0gdHlwZTtcbiAgICBpZiAoIXJvb3QpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdyZWFkZGlycDogcm9vdCBhcmd1bWVudCBpcyByZXF1aXJlZC4gVXNhZ2U6IHJlYWRkaXJwKHJvb3QsIG9wdGlvbnMpJyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiByb290ICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdyZWFkZGlycDogcm9vdCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nLiBVc2FnZTogcmVhZGRpcnAocm9vdCwgb3B0aW9ucyknKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZSAmJiAhQUxMX1RZUEVTLmluY2x1ZGVzKHR5cGUpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgcmVhZGRpcnA6IEludmFsaWQgdHlwZSBwYXNzZWQuIFVzZSBvbmUgb2YgJHtBTExfVFlQRVMuam9pbignLCAnKX1gKTtcbiAgICB9XG4gICAgb3B0aW9ucy5yb290ID0gcm9vdDtcbiAgICByZXR1cm4gbmV3IFJlYWRkaXJwU3RyZWFtKG9wdGlvbnMpO1xufVxuLyoqXG4gKiBQcm9taXNlIHZlcnNpb246IFJlYWRzIGFsbCBmaWxlcyBhbmQgZGlyZWN0b3JpZXMgaW4gZ2l2ZW4gcm9vdCByZWN1cnNpdmVseS5cbiAqIENvbXBhcmVkIHRvIHN0cmVhbWluZyB2ZXJzaW9uLCB3aWxsIGNvbnN1bWUgYSBsb3Qgb2YgUkFNIGUuZy4gd2hlbiAxIG1pbGxpb24gZmlsZXMgYXJlIGxpc3RlZC5cbiAqIEByZXR1cm5zIGFycmF5IG9mIHBhdGhzIGFuZCB0aGVpciBlbnRyeSBpbmZvc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZGRpcnBQcm9taXNlKHJvb3QsIG9wdGlvbnMgPSB7fSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IGZpbGVzID0gW107XG4gICAgICAgIHJlYWRkaXJwKHJvb3QsIG9wdGlvbnMpXG4gICAgICAgICAgICAub24oJ2RhdGEnLCAoZW50cnkpID0+IGZpbGVzLnB1c2goZW50cnkpKVxuICAgICAgICAgICAgLm9uKCdlbmQnLCAoKSA9PiByZXNvbHZlKGZpbGVzKSlcbiAgICAgICAgICAgIC5vbignZXJyb3InLCAoZXJyb3IpID0+IHJlamVjdChlcnJvcikpO1xuICAgIH0pO1xufVxuZXhwb3J0IGRlZmF1bHQgcmVhZGRpcnA7XG4iLCAiaW1wb3J0IHsgd2F0Y2hGaWxlLCB1bndhdGNoRmlsZSwgd2F0Y2ggYXMgZnNfd2F0Y2ggfSBmcm9tICdmcyc7XG5pbXBvcnQgeyBvcGVuLCBzdGF0LCBsc3RhdCwgcmVhbHBhdGggYXMgZnNyZWFscGF0aCB9IGZyb20gJ2ZzL3Byb21pc2VzJztcbmltcG9ydCAqIGFzIHN5c1BhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyB0eXBlIGFzIG9zVHlwZSB9IGZyb20gJ29zJztcbmV4cG9ydCBjb25zdCBTVFJfREFUQSA9ICdkYXRhJztcbmV4cG9ydCBjb25zdCBTVFJfRU5EID0gJ2VuZCc7XG5leHBvcnQgY29uc3QgU1RSX0NMT1NFID0gJ2Nsb3NlJztcbmV4cG9ydCBjb25zdCBFTVBUWV9GTiA9ICgpID0+IHsgfTtcbmV4cG9ydCBjb25zdCBJREVOVElUWV9GTiA9ICh2YWwpID0+IHZhbDtcbmNvbnN0IHBsID0gcHJvY2Vzcy5wbGF0Zm9ybTtcbmV4cG9ydCBjb25zdCBpc1dpbmRvd3MgPSBwbCA9PT0gJ3dpbjMyJztcbmV4cG9ydCBjb25zdCBpc01hY29zID0gcGwgPT09ICdkYXJ3aW4nO1xuZXhwb3J0IGNvbnN0IGlzTGludXggPSBwbCA9PT0gJ2xpbnV4JztcbmV4cG9ydCBjb25zdCBpc0ZyZWVCU0QgPSBwbCA9PT0gJ2ZyZWVic2QnO1xuZXhwb3J0IGNvbnN0IGlzSUJNaSA9IG9zVHlwZSgpID09PSAnT1M0MDAnO1xuZXhwb3J0IGNvbnN0IEVWRU5UUyA9IHtcbiAgICBBTEw6ICdhbGwnLFxuICAgIFJFQURZOiAncmVhZHknLFxuICAgIEFERDogJ2FkZCcsXG4gICAgQ0hBTkdFOiAnY2hhbmdlJyxcbiAgICBBRERfRElSOiAnYWRkRGlyJyxcbiAgICBVTkxJTks6ICd1bmxpbmsnLFxuICAgIFVOTElOS19ESVI6ICd1bmxpbmtEaXInLFxuICAgIFJBVzogJ3JhdycsXG4gICAgRVJST1I6ICdlcnJvcicsXG59O1xuY29uc3QgRVYgPSBFVkVOVFM7XG5jb25zdCBUSFJPVFRMRV9NT0RFX1dBVENIID0gJ3dhdGNoJztcbmNvbnN0IHN0YXRNZXRob2RzID0geyBsc3RhdCwgc3RhdCB9O1xuY29uc3QgS0VZX0xJU1RFTkVSUyA9ICdsaXN0ZW5lcnMnO1xuY29uc3QgS0VZX0VSUiA9ICdlcnJIYW5kbGVycyc7XG5jb25zdCBLRVlfUkFXID0gJ3Jhd0VtaXR0ZXJzJztcbmNvbnN0IEhBTkRMRVJfS0VZUyA9IFtLRVlfTElTVEVORVJTLCBLRVlfRVJSLCBLRVlfUkFXXTtcbi8vIHByZXR0aWVyLWlnbm9yZVxuY29uc3QgYmluYXJ5RXh0ZW5zaW9ucyA9IG5ldyBTZXQoW1xuICAgICczZG0nLCAnM2RzJywgJzNnMicsICczZ3AnLCAnN3onLCAnYScsICdhYWMnLCAnYWRwJywgJ2FmZGVzaWduJywgJ2FmcGhvdG8nLCAnYWZwdWInLCAnYWknLFxuICAgICdhaWYnLCAnYWlmZicsICdhbHonLCAnYXBlJywgJ2FwaycsICdhcHBpbWFnZScsICdhcicsICdhcmonLCAnYXNmJywgJ2F1JywgJ2F2aScsXG4gICAgJ2JhaycsICdiYW1sJywgJ2JoJywgJ2JpbicsICdiaycsICdibXAnLCAnYnRpZicsICdiejInLCAnYnppcDInLFxuICAgICdjYWInLCAnY2FmJywgJ2NnbScsICdjbGFzcycsICdjbXgnLCAnY3BpbycsICdjcjInLCAnY3VyJywgJ2RhdCcsICdkY20nLCAnZGViJywgJ2RleCcsICdkanZ1JyxcbiAgICAnZGxsJywgJ2RtZycsICdkbmcnLCAnZG9jJywgJ2RvY20nLCAnZG9jeCcsICdkb3QnLCAnZG90bScsICdkcmEnLCAnRFNfU3RvcmUnLCAnZHNrJywgJ2R0cycsXG4gICAgJ2R0c2hkJywgJ2R2YicsICdkd2cnLCAnZHhmJyxcbiAgICAnZWNlbHA0ODAwJywgJ2VjZWxwNzQ3MCcsICdlY2VscDk2MDAnLCAnZWdnJywgJ2VvbCcsICdlb3QnLCAnZXB1YicsICdleGUnLFxuICAgICdmNHYnLCAnZmJzJywgJ2ZoJywgJ2ZsYScsICdmbGFjJywgJ2ZsYXRwYWsnLCAnZmxpJywgJ2ZsdicsICdmcHgnLCAnZnN0JywgJ2Z2dCcsXG4gICAgJ2czJywgJ2doJywgJ2dpZicsICdncmFmZmxlJywgJ2d6JywgJ2d6aXAnLFxuICAgICdoMjYxJywgJ2gyNjMnLCAnaDI2NCcsICdpY25zJywgJ2ljbycsICdpZWYnLCAnaW1nJywgJ2lwYScsICdpc28nLFxuICAgICdqYXInLCAnanBlZycsICdqcGcnLCAnanBndicsICdqcG0nLCAnanhyJywgJ2tleScsICdrdHgnLFxuICAgICdsaGEnLCAnbGliJywgJ2x2cCcsICdseicsICdsemgnLCAnbHptYScsICdsem8nLFxuICAgICdtM3UnLCAnbTRhJywgJ200dicsICdtYXInLCAnbWRpJywgJ21odCcsICdtaWQnLCAnbWlkaScsICdtajInLCAnbWthJywgJ21rdicsICdtbXInLCAnbW5nJyxcbiAgICAnbW9iaScsICdtb3YnLCAnbW92aWUnLCAnbXAzJyxcbiAgICAnbXA0JywgJ21wNGEnLCAnbXBlZycsICdtcGcnLCAnbXBnYScsICdteHUnLFxuICAgICduZWYnLCAnbnB4JywgJ251bWJlcnMnLCAnbnVwa2cnLFxuICAgICdvJywgJ29kcCcsICdvZHMnLCAnb2R0JywgJ29nYScsICdvZ2cnLCAnb2d2JywgJ290ZicsICdvdHQnLFxuICAgICdwYWdlcycsICdwYm0nLCAncGN4JywgJ3BkYicsICdwZGYnLCAncGVhJywgJ3BnbScsICdwaWMnLCAncG5nJywgJ3BubScsICdwb3QnLCAncG90bScsXG4gICAgJ3BvdHgnLCAncHBhJywgJ3BwYW0nLFxuICAgICdwcG0nLCAncHBzJywgJ3Bwc20nLCAncHBzeCcsICdwcHQnLCAncHB0bScsICdwcHR4JywgJ3BzZCcsICdweWEnLCAncHljJywgJ3B5bycsICdweXYnLFxuICAgICdxdCcsXG4gICAgJ3JhcicsICdyYXMnLCAncmF3JywgJ3Jlc291cmNlcycsICdyZ2InLCAncmlwJywgJ3JsYycsICdybWYnLCAncm12YicsICdycG0nLCAncnRmJywgJ3J6JyxcbiAgICAnczNtJywgJ3M3eicsICdzY3B0JywgJ3NnaScsICdzaGFyJywgJ3NuYXAnLCAnc2lsJywgJ3NrZXRjaCcsICdzbGsnLCAnc212JywgJ3NuaycsICdzbycsXG4gICAgJ3N0bCcsICdzdW8nLCAnc3ViJywgJ3N3ZicsXG4gICAgJ3RhcicsICd0YnonLCAndGJ6MicsICd0Z2EnLCAndGd6JywgJ3RobXgnLCAndGlmJywgJ3RpZmYnLCAndGx6JywgJ3R0YycsICd0dGYnLCAndHh6JyxcbiAgICAndWRmJywgJ3V2aCcsICd1dmknLCAndXZtJywgJ3V2cCcsICd1dnMnLCAndXZ1JyxcbiAgICAndml2JywgJ3ZvYicsXG4gICAgJ3dhcicsICd3YXYnLCAnd2F4JywgJ3dibXAnLCAnd2RwJywgJ3dlYmEnLCAnd2VibScsICd3ZWJwJywgJ3dobCcsICd3aW0nLCAnd20nLCAnd21hJyxcbiAgICAnd212JywgJ3dteCcsICd3b2ZmJywgJ3dvZmYyJywgJ3dybScsICd3dngnLFxuICAgICd4Ym0nLCAneGlmJywgJ3hsYScsICd4bGFtJywgJ3hscycsICd4bHNiJywgJ3hsc20nLCAneGxzeCcsICd4bHQnLCAneGx0bScsICd4bHR4JywgJ3htJyxcbiAgICAneG1pbmQnLCAneHBpJywgJ3hwbScsICd4d2QnLCAneHonLFxuICAgICd6JywgJ3ppcCcsICd6aXB4Jyxcbl0pO1xuY29uc3QgaXNCaW5hcnlQYXRoID0gKGZpbGVQYXRoKSA9PiBiaW5hcnlFeHRlbnNpb25zLmhhcyhzeXNQYXRoLmV4dG5hbWUoZmlsZVBhdGgpLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCkpO1xuLy8gVE9ETzogZW1pdCBlcnJvcnMgcHJvcGVybHkuIEV4YW1wbGU6IEVNRklMRSBvbiBNYWNvcy5cbmNvbnN0IGZvcmVhY2ggPSAodmFsLCBmbikgPT4ge1xuICAgIGlmICh2YWwgaW5zdGFuY2VvZiBTZXQpIHtcbiAgICAgICAgdmFsLmZvckVhY2goZm4pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgZm4odmFsKTtcbiAgICB9XG59O1xuY29uc3QgYWRkQW5kQ29udmVydCA9IChtYWluLCBwcm9wLCBpdGVtKSA9PiB7XG4gICAgbGV0IGNvbnRhaW5lciA9IG1haW5bcHJvcF07XG4gICAgaWYgKCEoY29udGFpbmVyIGluc3RhbmNlb2YgU2V0KSkge1xuICAgICAgICBtYWluW3Byb3BdID0gY29udGFpbmVyID0gbmV3IFNldChbY29udGFpbmVyXSk7XG4gICAgfVxuICAgIGNvbnRhaW5lci5hZGQoaXRlbSk7XG59O1xuY29uc3QgY2xlYXJJdGVtID0gKGNvbnQpID0+IChrZXkpID0+IHtcbiAgICBjb25zdCBzZXQgPSBjb250W2tleV07XG4gICAgaWYgKHNldCBpbnN0YW5jZW9mIFNldCkge1xuICAgICAgICBzZXQuY2xlYXIoKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGRlbGV0ZSBjb250W2tleV07XG4gICAgfVxufTtcbmNvbnN0IGRlbEZyb21TZXQgPSAobWFpbiwgcHJvcCwgaXRlbSkgPT4ge1xuICAgIGNvbnN0IGNvbnRhaW5lciA9IG1haW5bcHJvcF07XG4gICAgaWYgKGNvbnRhaW5lciBpbnN0YW5jZW9mIFNldCkge1xuICAgICAgICBjb250YWluZXIuZGVsZXRlKGl0ZW0pO1xuICAgIH1cbiAgICBlbHNlIGlmIChjb250YWluZXIgPT09IGl0ZW0pIHtcbiAgICAgICAgZGVsZXRlIG1haW5bcHJvcF07XG4gICAgfVxufTtcbmNvbnN0IGlzRW1wdHlTZXQgPSAodmFsKSA9PiAodmFsIGluc3RhbmNlb2YgU2V0ID8gdmFsLnNpemUgPT09IDAgOiAhdmFsKTtcbmNvbnN0IEZzV2F0Y2hJbnN0YW5jZXMgPSBuZXcgTWFwKCk7XG4vKipcbiAqIEluc3RhbnRpYXRlcyB0aGUgZnNfd2F0Y2ggaW50ZXJmYWNlXG4gKiBAcGFyYW0gcGF0aCB0byBiZSB3YXRjaGVkXG4gKiBAcGFyYW0gb3B0aW9ucyB0byBiZSBwYXNzZWQgdG8gZnNfd2F0Y2hcbiAqIEBwYXJhbSBsaXN0ZW5lciBtYWluIGV2ZW50IGhhbmRsZXJcbiAqIEBwYXJhbSBlcnJIYW5kbGVyIGVtaXRzIGluZm8gYWJvdXQgZXJyb3JzXG4gKiBAcGFyYW0gZW1pdFJhdyBlbWl0cyByYXcgZXZlbnQgZGF0YVxuICogQHJldHVybnMge05hdGl2ZUZzV2F0Y2hlcn1cbiAqL1xuZnVuY3Rpb24gY3JlYXRlRnNXYXRjaEluc3RhbmNlKHBhdGgsIG9wdGlvbnMsIGxpc3RlbmVyLCBlcnJIYW5kbGVyLCBlbWl0UmF3KSB7XG4gICAgY29uc3QgaGFuZGxlRXZlbnQgPSAocmF3RXZlbnQsIGV2UGF0aCkgPT4ge1xuICAgICAgICBsaXN0ZW5lcihwYXRoKTtcbiAgICAgICAgZW1pdFJhdyhyYXdFdmVudCwgZXZQYXRoLCB7IHdhdGNoZWRQYXRoOiBwYXRoIH0pO1xuICAgICAgICAvLyBlbWl0IGJhc2VkIG9uIGV2ZW50cyBvY2N1cnJpbmcgZm9yIGZpbGVzIGZyb20gYSBkaXJlY3RvcnkncyB3YXRjaGVyIGluXG4gICAgICAgIC8vIGNhc2UgdGhlIGZpbGUncyB3YXRjaGVyIG1pc3NlcyBpdCAoYW5kIHJlbHkgb24gdGhyb3R0bGluZyB0byBkZS1kdXBlKVxuICAgICAgICBpZiAoZXZQYXRoICYmIHBhdGggIT09IGV2UGF0aCkge1xuICAgICAgICAgICAgZnNXYXRjaEJyb2FkY2FzdChzeXNQYXRoLnJlc29sdmUocGF0aCwgZXZQYXRoKSwgS0VZX0xJU1RFTkVSUywgc3lzUGF0aC5qb2luKHBhdGgsIGV2UGF0aCkpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gZnNfd2F0Y2gocGF0aCwge1xuICAgICAgICAgICAgcGVyc2lzdGVudDogb3B0aW9ucy5wZXJzaXN0ZW50LFxuICAgICAgICB9LCBoYW5kbGVFdmVudCk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICBlcnJIYW5kbGVyKGVycm9yKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG59XG4vKipcbiAqIEhlbHBlciBmb3IgcGFzc2luZyBmc193YXRjaCBldmVudCBkYXRhIHRvIGEgY29sbGVjdGlvbiBvZiBsaXN0ZW5lcnNcbiAqIEBwYXJhbSBmdWxsUGF0aCBhYnNvbHV0ZSBwYXRoIGJvdW5kIHRvIGZzX3dhdGNoIGluc3RhbmNlXG4gKi9cbmNvbnN0IGZzV2F0Y2hCcm9hZGNhc3QgPSAoZnVsbFBhdGgsIGxpc3RlbmVyVHlwZSwgdmFsMSwgdmFsMiwgdmFsMykgPT4ge1xuICAgIGNvbnN0IGNvbnQgPSBGc1dhdGNoSW5zdGFuY2VzLmdldChmdWxsUGF0aCk7XG4gICAgaWYgKCFjb250KVxuICAgICAgICByZXR1cm47XG4gICAgZm9yZWFjaChjb250W2xpc3RlbmVyVHlwZV0sIChsaXN0ZW5lcikgPT4ge1xuICAgICAgICBsaXN0ZW5lcih2YWwxLCB2YWwyLCB2YWwzKTtcbiAgICB9KTtcbn07XG4vKipcbiAqIEluc3RhbnRpYXRlcyB0aGUgZnNfd2F0Y2ggaW50ZXJmYWNlIG9yIGJpbmRzIGxpc3RlbmVyc1xuICogdG8gYW4gZXhpc3Rpbmcgb25lIGNvdmVyaW5nIHRoZSBzYW1lIGZpbGUgc3lzdGVtIGVudHJ5XG4gKiBAcGFyYW0gcGF0aFxuICogQHBhcmFtIGZ1bGxQYXRoIGFic29sdXRlIHBhdGhcbiAqIEBwYXJhbSBvcHRpb25zIHRvIGJlIHBhc3NlZCB0byBmc193YXRjaFxuICogQHBhcmFtIGhhbmRsZXJzIGNvbnRhaW5lciBmb3IgZXZlbnQgbGlzdGVuZXIgZnVuY3Rpb25zXG4gKi9cbmNvbnN0IHNldEZzV2F0Y2hMaXN0ZW5lciA9IChwYXRoLCBmdWxsUGF0aCwgb3B0aW9ucywgaGFuZGxlcnMpID0+IHtcbiAgICBjb25zdCB7IGxpc3RlbmVyLCBlcnJIYW5kbGVyLCByYXdFbWl0dGVyIH0gPSBoYW5kbGVycztcbiAgICBsZXQgY29udCA9IEZzV2F0Y2hJbnN0YW5jZXMuZ2V0KGZ1bGxQYXRoKTtcbiAgICBsZXQgd2F0Y2hlcjtcbiAgICBpZiAoIW9wdGlvbnMucGVyc2lzdGVudCkge1xuICAgICAgICB3YXRjaGVyID0gY3JlYXRlRnNXYXRjaEluc3RhbmNlKHBhdGgsIG9wdGlvbnMsIGxpc3RlbmVyLCBlcnJIYW5kbGVyLCByYXdFbWl0dGVyKTtcbiAgICAgICAgaWYgKCF3YXRjaGVyKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICByZXR1cm4gd2F0Y2hlci5jbG9zZS5iaW5kKHdhdGNoZXIpO1xuICAgIH1cbiAgICBpZiAoY29udCkge1xuICAgICAgICBhZGRBbmRDb252ZXJ0KGNvbnQsIEtFWV9MSVNURU5FUlMsIGxpc3RlbmVyKTtcbiAgICAgICAgYWRkQW5kQ29udmVydChjb250LCBLRVlfRVJSLCBlcnJIYW5kbGVyKTtcbiAgICAgICAgYWRkQW5kQ29udmVydChjb250LCBLRVlfUkFXLCByYXdFbWl0dGVyKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHdhdGNoZXIgPSBjcmVhdGVGc1dhdGNoSW5zdGFuY2UocGF0aCwgb3B0aW9ucywgZnNXYXRjaEJyb2FkY2FzdC5iaW5kKG51bGwsIGZ1bGxQYXRoLCBLRVlfTElTVEVORVJTKSwgZXJySGFuZGxlciwgLy8gbm8gbmVlZCB0byB1c2UgYnJvYWRjYXN0IGhlcmVcbiAgICAgICAgZnNXYXRjaEJyb2FkY2FzdC5iaW5kKG51bGwsIGZ1bGxQYXRoLCBLRVlfUkFXKSk7XG4gICAgICAgIGlmICghd2F0Y2hlcilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgd2F0Y2hlci5vbihFVi5FUlJPUiwgYXN5bmMgKGVycm9yKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBicm9hZGNhc3RFcnIgPSBmc1dhdGNoQnJvYWRjYXN0LmJpbmQobnVsbCwgZnVsbFBhdGgsIEtFWV9FUlIpO1xuICAgICAgICAgICAgaWYgKGNvbnQpXG4gICAgICAgICAgICAgICAgY29udC53YXRjaGVyVW51c2FibGUgPSB0cnVlOyAvLyBkb2N1bWVudGVkIHNpbmNlIE5vZGUgMTAuNC4xXG4gICAgICAgICAgICAvLyBXb3JrYXJvdW5kIGZvciBodHRwczovL2dpdGh1Yi5jb20vam95ZW50L25vZGUvaXNzdWVzLzQzMzdcbiAgICAgICAgICAgIGlmIChpc1dpbmRvd3MgJiYgZXJyb3IuY29kZSA9PT0gJ0VQRVJNJykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZkID0gYXdhaXQgb3BlbihwYXRoLCAncicpO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBmZC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICBicm9hZGNhc3RFcnIoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGRvIG5vdGhpbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBicm9hZGNhc3RFcnIoZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgY29udCA9IHtcbiAgICAgICAgICAgIGxpc3RlbmVyczogbGlzdGVuZXIsXG4gICAgICAgICAgICBlcnJIYW5kbGVyczogZXJySGFuZGxlcixcbiAgICAgICAgICAgIHJhd0VtaXR0ZXJzOiByYXdFbWl0dGVyLFxuICAgICAgICAgICAgd2F0Y2hlcixcbiAgICAgICAgfTtcbiAgICAgICAgRnNXYXRjaEluc3RhbmNlcy5zZXQoZnVsbFBhdGgsIGNvbnQpO1xuICAgIH1cbiAgICAvLyBjb25zdCBpbmRleCA9IGNvbnQubGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpO1xuICAgIC8vIHJlbW92ZXMgdGhpcyBpbnN0YW5jZSdzIGxpc3RlbmVycyBhbmQgY2xvc2VzIHRoZSB1bmRlcmx5aW5nIGZzX3dhdGNoXG4gICAgLy8gaW5zdGFuY2UgaWYgdGhlcmUgYXJlIG5vIG1vcmUgbGlzdGVuZXJzIGxlZnRcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICBkZWxGcm9tU2V0KGNvbnQsIEtFWV9MSVNURU5FUlMsIGxpc3RlbmVyKTtcbiAgICAgICAgZGVsRnJvbVNldChjb250LCBLRVlfRVJSLCBlcnJIYW5kbGVyKTtcbiAgICAgICAgZGVsRnJvbVNldChjb250LCBLRVlfUkFXLCByYXdFbWl0dGVyKTtcbiAgICAgICAgaWYgKGlzRW1wdHlTZXQoY29udC5saXN0ZW5lcnMpKSB7XG4gICAgICAgICAgICAvLyBDaGVjayB0byBwcm90ZWN0IGFnYWluc3QgaXNzdWUgZ2gtNzMwLlxuICAgICAgICAgICAgLy8gaWYgKGNvbnQud2F0Y2hlclVudXNhYmxlKSB7XG4gICAgICAgICAgICBjb250LndhdGNoZXIuY2xvc2UoKTtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIEZzV2F0Y2hJbnN0YW5jZXMuZGVsZXRlKGZ1bGxQYXRoKTtcbiAgICAgICAgICAgIEhBTkRMRVJfS0VZUy5mb3JFYWNoKGNsZWFySXRlbShjb250KSk7XG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgICBjb250LndhdGNoZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBPYmplY3QuZnJlZXplKGNvbnQpO1xuICAgICAgICB9XG4gICAgfTtcbn07XG4vLyBmc193YXRjaEZpbGUgaGVscGVyc1xuLy8gb2JqZWN0IHRvIGhvbGQgcGVyLXByb2Nlc3MgZnNfd2F0Y2hGaWxlIGluc3RhbmNlc1xuLy8gKG1heSBiZSBzaGFyZWQgYWNyb3NzIGNob2tpZGFyIEZTV2F0Y2hlciBpbnN0YW5jZXMpXG5jb25zdCBGc1dhdGNoRmlsZUluc3RhbmNlcyA9IG5ldyBNYXAoKTtcbi8qKlxuICogSW5zdGFudGlhdGVzIHRoZSBmc193YXRjaEZpbGUgaW50ZXJmYWNlIG9yIGJpbmRzIGxpc3RlbmVyc1xuICogdG8gYW4gZXhpc3Rpbmcgb25lIGNvdmVyaW5nIHRoZSBzYW1lIGZpbGUgc3lzdGVtIGVudHJ5XG4gKiBAcGFyYW0gcGF0aCB0byBiZSB3YXRjaGVkXG4gKiBAcGFyYW0gZnVsbFBhdGggYWJzb2x1dGUgcGF0aFxuICogQHBhcmFtIG9wdGlvbnMgb3B0aW9ucyB0byBiZSBwYXNzZWQgdG8gZnNfd2F0Y2hGaWxlXG4gKiBAcGFyYW0gaGFuZGxlcnMgY29udGFpbmVyIGZvciBldmVudCBsaXN0ZW5lciBmdW5jdGlvbnNcbiAqIEByZXR1cm5zIGNsb3NlclxuICovXG5jb25zdCBzZXRGc1dhdGNoRmlsZUxpc3RlbmVyID0gKHBhdGgsIGZ1bGxQYXRoLCBvcHRpb25zLCBoYW5kbGVycykgPT4ge1xuICAgIGNvbnN0IHsgbGlzdGVuZXIsIHJhd0VtaXR0ZXIgfSA9IGhhbmRsZXJzO1xuICAgIGxldCBjb250ID0gRnNXYXRjaEZpbGVJbnN0YW5jZXMuZ2V0KGZ1bGxQYXRoKTtcbiAgICAvLyBsZXQgbGlzdGVuZXJzID0gbmV3IFNldCgpO1xuICAgIC8vIGxldCByYXdFbWl0dGVycyA9IG5ldyBTZXQoKTtcbiAgICBjb25zdCBjb3B0cyA9IGNvbnQgJiYgY29udC5vcHRpb25zO1xuICAgIGlmIChjb3B0cyAmJiAoY29wdHMucGVyc2lzdGVudCA8IG9wdGlvbnMucGVyc2lzdGVudCB8fCBjb3B0cy5pbnRlcnZhbCA+IG9wdGlvbnMuaW50ZXJ2YWwpKSB7XG4gICAgICAgIC8vIFwiVXBncmFkZVwiIHRoZSB3YXRjaGVyIHRvIHBlcnNpc3RlbmNlIG9yIGEgcXVpY2tlciBpbnRlcnZhbC5cbiAgICAgICAgLy8gVGhpcyBjcmVhdGVzIHNvbWUgdW5saWtlbHkgZWRnZSBjYXNlIGlzc3VlcyBpZiB0aGUgdXNlciBtaXhlc1xuICAgICAgICAvLyBzZXR0aW5ncyBpbiBhIHZlcnkgd2VpcmQgd2F5LCBidXQgc29sdmluZyBmb3IgdGhvc2UgY2FzZXNcbiAgICAgICAgLy8gZG9lc24ndCBzZWVtIHdvcnRod2hpbGUgZm9yIHRoZSBhZGRlZCBjb21wbGV4aXR5LlxuICAgICAgICAvLyBsaXN0ZW5lcnMgPSBjb250Lmxpc3RlbmVycztcbiAgICAgICAgLy8gcmF3RW1pdHRlcnMgPSBjb250LnJhd0VtaXR0ZXJzO1xuICAgICAgICB1bndhdGNoRmlsZShmdWxsUGF0aCk7XG4gICAgICAgIGNvbnQgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGlmIChjb250KSB7XG4gICAgICAgIGFkZEFuZENvbnZlcnQoY29udCwgS0VZX0xJU1RFTkVSUywgbGlzdGVuZXIpO1xuICAgICAgICBhZGRBbmRDb252ZXJ0KGNvbnQsIEtFWV9SQVcsIHJhd0VtaXR0ZXIpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgLy8gVE9ET1xuICAgICAgICAvLyBsaXN0ZW5lcnMuYWRkKGxpc3RlbmVyKTtcbiAgICAgICAgLy8gcmF3RW1pdHRlcnMuYWRkKHJhd0VtaXR0ZXIpO1xuICAgICAgICBjb250ID0ge1xuICAgICAgICAgICAgbGlzdGVuZXJzOiBsaXN0ZW5lcixcbiAgICAgICAgICAgIHJhd0VtaXR0ZXJzOiByYXdFbWl0dGVyLFxuICAgICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgICAgIHdhdGNoZXI6IHdhdGNoRmlsZShmdWxsUGF0aCwgb3B0aW9ucywgKGN1cnIsIHByZXYpID0+IHtcbiAgICAgICAgICAgICAgICBmb3JlYWNoKGNvbnQucmF3RW1pdHRlcnMsIChyYXdFbWl0dGVyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJhd0VtaXR0ZXIoRVYuQ0hBTkdFLCBmdWxsUGF0aCwgeyBjdXJyLCBwcmV2IH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJtdGltZSA9IGN1cnIubXRpbWVNcztcbiAgICAgICAgICAgICAgICBpZiAoY3Vyci5zaXplICE9PSBwcmV2LnNpemUgfHwgY3Vycm10aW1lID4gcHJldi5tdGltZU1zIHx8IGN1cnJtdGltZSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBmb3JlYWNoKGNvbnQubGlzdGVuZXJzLCAobGlzdGVuZXIpID0+IGxpc3RlbmVyKHBhdGgsIGN1cnIpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgfTtcbiAgICAgICAgRnNXYXRjaEZpbGVJbnN0YW5jZXMuc2V0KGZ1bGxQYXRoLCBjb250KTtcbiAgICB9XG4gICAgLy8gY29uc3QgaW5kZXggPSBjb250Lmxpc3RlbmVycy5pbmRleE9mKGxpc3RlbmVyKTtcbiAgICAvLyBSZW1vdmVzIHRoaXMgaW5zdGFuY2UncyBsaXN0ZW5lcnMgYW5kIGNsb3NlcyB0aGUgdW5kZXJseWluZyBmc193YXRjaEZpbGVcbiAgICAvLyBpbnN0YW5jZSBpZiB0aGVyZSBhcmUgbm8gbW9yZSBsaXN0ZW5lcnMgbGVmdC5cbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICBkZWxGcm9tU2V0KGNvbnQsIEtFWV9MSVNURU5FUlMsIGxpc3RlbmVyKTtcbiAgICAgICAgZGVsRnJvbVNldChjb250LCBLRVlfUkFXLCByYXdFbWl0dGVyKTtcbiAgICAgICAgaWYgKGlzRW1wdHlTZXQoY29udC5saXN0ZW5lcnMpKSB7XG4gICAgICAgICAgICBGc1dhdGNoRmlsZUluc3RhbmNlcy5kZWxldGUoZnVsbFBhdGgpO1xuICAgICAgICAgICAgdW53YXRjaEZpbGUoZnVsbFBhdGgpO1xuICAgICAgICAgICAgY29udC5vcHRpb25zID0gY29udC53YXRjaGVyID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgT2JqZWN0LmZyZWV6ZShjb250KTtcbiAgICAgICAgfVxuICAgIH07XG59O1xuLyoqXG4gKiBAbWl4aW5cbiAqL1xuZXhwb3J0IGNsYXNzIE5vZGVGc0hhbmRsZXIge1xuICAgIGNvbnN0cnVjdG9yKGZzVykge1xuICAgICAgICB0aGlzLmZzdyA9IGZzVztcbiAgICAgICAgdGhpcy5fYm91bmRIYW5kbGVFcnJvciA9IChlcnJvcikgPT4gZnNXLl9oYW5kbGVFcnJvcihlcnJvcik7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFdhdGNoIGZpbGUgZm9yIGNoYW5nZXMgd2l0aCBmc193YXRjaEZpbGUgb3IgZnNfd2F0Y2guXG4gICAgICogQHBhcmFtIHBhdGggdG8gZmlsZSBvciBkaXJcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXIgb24gZnMgY2hhbmdlXG4gICAgICogQHJldHVybnMgY2xvc2VyIGZvciB0aGUgd2F0Y2hlciBpbnN0YW5jZVxuICAgICAqL1xuICAgIF93YXRjaFdpdGhOb2RlRnMocGF0aCwgbGlzdGVuZXIpIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IHRoaXMuZnN3Lm9wdGlvbnM7XG4gICAgICAgIGNvbnN0IGRpcmVjdG9yeSA9IHN5c1BhdGguZGlybmFtZShwYXRoKTtcbiAgICAgICAgY29uc3QgYmFzZW5hbWUgPSBzeXNQYXRoLmJhc2VuYW1lKHBhdGgpO1xuICAgICAgICBjb25zdCBwYXJlbnQgPSB0aGlzLmZzdy5fZ2V0V2F0Y2hlZERpcihkaXJlY3RvcnkpO1xuICAgICAgICBwYXJlbnQuYWRkKGJhc2VuYW1lKTtcbiAgICAgICAgY29uc3QgYWJzb2x1dGVQYXRoID0gc3lzUGF0aC5yZXNvbHZlKHBhdGgpO1xuICAgICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICAgICAgcGVyc2lzdGVudDogb3B0cy5wZXJzaXN0ZW50LFxuICAgICAgICB9O1xuICAgICAgICBpZiAoIWxpc3RlbmVyKVxuICAgICAgICAgICAgbGlzdGVuZXIgPSBFTVBUWV9GTjtcbiAgICAgICAgbGV0IGNsb3NlcjtcbiAgICAgICAgaWYgKG9wdHMudXNlUG9sbGluZykge1xuICAgICAgICAgICAgY29uc3QgZW5hYmxlQmluID0gb3B0cy5pbnRlcnZhbCAhPT0gb3B0cy5iaW5hcnlJbnRlcnZhbDtcbiAgICAgICAgICAgIG9wdGlvbnMuaW50ZXJ2YWwgPSBlbmFibGVCaW4gJiYgaXNCaW5hcnlQYXRoKGJhc2VuYW1lKSA/IG9wdHMuYmluYXJ5SW50ZXJ2YWwgOiBvcHRzLmludGVydmFsO1xuICAgICAgICAgICAgY2xvc2VyID0gc2V0RnNXYXRjaEZpbGVMaXN0ZW5lcihwYXRoLCBhYnNvbHV0ZVBhdGgsIG9wdGlvbnMsIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcixcbiAgICAgICAgICAgICAgICByYXdFbWl0dGVyOiB0aGlzLmZzdy5fZW1pdFJhdyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY2xvc2VyID0gc2V0RnNXYXRjaExpc3RlbmVyKHBhdGgsIGFic29sdXRlUGF0aCwgb3B0aW9ucywge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLFxuICAgICAgICAgICAgICAgIGVyckhhbmRsZXI6IHRoaXMuX2JvdW5kSGFuZGxlRXJyb3IsXG4gICAgICAgICAgICAgICAgcmF3RW1pdHRlcjogdGhpcy5mc3cuX2VtaXRSYXcsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2xvc2VyO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBXYXRjaCBhIGZpbGUgYW5kIGVtaXQgYWRkIGV2ZW50IGlmIHdhcnJhbnRlZC5cbiAgICAgKiBAcmV0dXJucyBjbG9zZXIgZm9yIHRoZSB3YXRjaGVyIGluc3RhbmNlXG4gICAgICovXG4gICAgX2hhbmRsZUZpbGUoZmlsZSwgc3RhdHMsIGluaXRpYWxBZGQpIHtcbiAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRpcm5hbWUgPSBzeXNQYXRoLmRpcm5hbWUoZmlsZSk7XG4gICAgICAgIGNvbnN0IGJhc2VuYW1lID0gc3lzUGF0aC5iYXNlbmFtZShmaWxlKTtcbiAgICAgICAgY29uc3QgcGFyZW50ID0gdGhpcy5mc3cuX2dldFdhdGNoZWREaXIoZGlybmFtZSk7XG4gICAgICAgIC8vIHN0YXRzIGlzIGFsd2F5cyBwcmVzZW50XG4gICAgICAgIGxldCBwcmV2U3RhdHMgPSBzdGF0cztcbiAgICAgICAgLy8gaWYgdGhlIGZpbGUgaXMgYWxyZWFkeSBiZWluZyB3YXRjaGVkLCBkbyBub3RoaW5nXG4gICAgICAgIGlmIChwYXJlbnQuaGFzKGJhc2VuYW1lKSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY29uc3QgbGlzdGVuZXIgPSBhc3luYyAocGF0aCwgbmV3U3RhdHMpID0+IHtcbiAgICAgICAgICAgIGlmICghdGhpcy5mc3cuX3Rocm90dGxlKFRIUk9UVExFX01PREVfV0FUQ0gsIGZpbGUsIDUpKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGlmICghbmV3U3RhdHMgfHwgbmV3U3RhdHMubXRpbWVNcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1N0YXRzID0gYXdhaXQgc3RhdChmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZClcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgdGhhdCBjaGFuZ2UgZXZlbnQgd2FzIG5vdCBmaXJlZCBiZWNhdXNlIG9mIGNoYW5nZWQgb25seSBhY2Nlc3NUaW1lLlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhdCA9IG5ld1N0YXRzLmF0aW1lTXM7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG10ID0gbmV3U3RhdHMubXRpbWVNcztcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFhdCB8fCBhdCA8PSBtdCB8fCBtdCAhPT0gcHJldlN0YXRzLm10aW1lTXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9lbWl0KEVWLkNIQU5HRSwgZmlsZSwgbmV3U3RhdHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICgoaXNNYWNvcyB8fCBpc0xpbnV4IHx8IGlzRnJlZUJTRCkgJiYgcHJldlN0YXRzLmlubyAhPT0gbmV3U3RhdHMuaW5vKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZzdy5fY2xvc2VGaWxlKHBhdGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJldlN0YXRzID0gbmV3U3RhdHM7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjbG9zZXIgPSB0aGlzLl93YXRjaFdpdGhOb2RlRnMoZmlsZSwgbGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNsb3NlcilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZzdy5fYWRkUGF0aENsb3NlcihwYXRoLCBjbG9zZXIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJldlN0YXRzID0gbmV3U3RhdHM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZpeCBpc3N1ZXMgd2hlcmUgbXRpbWUgaXMgbnVsbCBidXQgZmlsZSBpcyBzdGlsbCBwcmVzZW50XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9yZW1vdmUoZGlybmFtZSwgYmFzZW5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBhZGQgaXMgYWJvdXQgdG8gYmUgZW1pdHRlZCBpZiBmaWxlIG5vdCBhbHJlYWR5IHRyYWNrZWQgaW4gcGFyZW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChwYXJlbnQuaGFzKGJhc2VuYW1lKSkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIHRoYXQgY2hhbmdlIGV2ZW50IHdhcyBub3QgZmlyZWQgYmVjYXVzZSBvZiBjaGFuZ2VkIG9ubHkgYWNjZXNzVGltZS5cbiAgICAgICAgICAgICAgICBjb25zdCBhdCA9IG5ld1N0YXRzLmF0aW1lTXM7XG4gICAgICAgICAgICAgICAgY29uc3QgbXQgPSBuZXdTdGF0cy5tdGltZU1zO1xuICAgICAgICAgICAgICAgIGlmICghYXQgfHwgYXQgPD0gbXQgfHwgbXQgIT09IHByZXZTdGF0cy5tdGltZU1zKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9lbWl0KEVWLkNIQU5HRSwgZmlsZSwgbmV3U3RhdHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwcmV2U3RhdHMgPSBuZXdTdGF0cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgLy8ga2ljayBvZmYgdGhlIHdhdGNoZXJcbiAgICAgICAgY29uc3QgY2xvc2VyID0gdGhpcy5fd2F0Y2hXaXRoTm9kZUZzKGZpbGUsIGxpc3RlbmVyKTtcbiAgICAgICAgLy8gZW1pdCBhbiBhZGQgZXZlbnQgaWYgd2UncmUgc3VwcG9zZWQgdG9cbiAgICAgICAgaWYgKCEoaW5pdGlhbEFkZCAmJiB0aGlzLmZzdy5vcHRpb25zLmlnbm9yZUluaXRpYWwpICYmIHRoaXMuZnN3Ll9pc250SWdub3JlZChmaWxlKSkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmZzdy5fdGhyb3R0bGUoRVYuQURELCBmaWxlLCAwKSlcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB0aGlzLmZzdy5fZW1pdChFVi5BREQsIGZpbGUsIHN0YXRzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2xvc2VyO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgc3ltbGlua3MgZW5jb3VudGVyZWQgd2hpbGUgcmVhZGluZyBhIGRpci5cbiAgICAgKiBAcGFyYW0gZW50cnkgcmV0dXJuZWQgYnkgcmVhZGRpcnBcbiAgICAgKiBAcGFyYW0gZGlyZWN0b3J5IHBhdGggb2YgZGlyIGJlaW5nIHJlYWRcbiAgICAgKiBAcGFyYW0gcGF0aCBvZiB0aGlzIGl0ZW1cbiAgICAgKiBAcGFyYW0gaXRlbSBiYXNlbmFtZSBvZiB0aGlzIGl0ZW1cbiAgICAgKiBAcmV0dXJucyB0cnVlIGlmIG5vIG1vcmUgcHJvY2Vzc2luZyBpcyBuZWVkZWQgZm9yIHRoaXMgZW50cnkuXG4gICAgICovXG4gICAgYXN5bmMgX2hhbmRsZVN5bWxpbmsoZW50cnksIGRpcmVjdG9yeSwgcGF0aCwgaXRlbSkge1xuICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZnVsbCA9IGVudHJ5LmZ1bGxQYXRoO1xuICAgICAgICBjb25zdCBkaXIgPSB0aGlzLmZzdy5fZ2V0V2F0Y2hlZERpcihkaXJlY3RvcnkpO1xuICAgICAgICBpZiAoIXRoaXMuZnN3Lm9wdGlvbnMuZm9sbG93U3ltbGlua3MpIHtcbiAgICAgICAgICAgIC8vIHdhdGNoIHN5bWxpbmsgZGlyZWN0bHkgKGRvbid0IGZvbGxvdykgYW5kIGRldGVjdCBjaGFuZ2VzXG4gICAgICAgICAgICB0aGlzLmZzdy5faW5jclJlYWR5Q291bnQoKTtcbiAgICAgICAgICAgIGxldCBsaW5rUGF0aDtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgbGlua1BhdGggPSBhd2FpdCBmc3JlYWxwYXRoKHBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZzdy5fZW1pdFJlYWR5KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGlmIChkaXIuaGFzKGl0ZW0pKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZnN3Ll9zeW1saW5rUGF0aHMuZ2V0KGZ1bGwpICE9PSBsaW5rUGF0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZzdy5fc3ltbGlua1BhdGhzLnNldChmdWxsLCBsaW5rUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9lbWl0KEVWLkNIQU5HRSwgcGF0aCwgZW50cnkuc3RhdHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGRpci5hZGQoaXRlbSk7XG4gICAgICAgICAgICAgICAgdGhpcy5mc3cuX3N5bWxpbmtQYXRocy5zZXQoZnVsbCwgbGlua1BhdGgpO1xuICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9lbWl0KEVWLkFERCwgcGF0aCwgZW50cnkuc3RhdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5mc3cuX2VtaXRSZWFkeSgpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZG9uJ3QgZm9sbG93IHRoZSBzYW1lIHN5bWxpbmsgbW9yZSB0aGFuIG9uY2VcbiAgICAgICAgaWYgKHRoaXMuZnN3Ll9zeW1saW5rUGF0aHMuaGFzKGZ1bGwpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZzdy5fc3ltbGlua1BhdGhzLnNldChmdWxsLCB0cnVlKTtcbiAgICB9XG4gICAgX2hhbmRsZVJlYWQoZGlyZWN0b3J5LCBpbml0aWFsQWRkLCB3aCwgdGFyZ2V0LCBkaXIsIGRlcHRoLCB0aHJvdHRsZXIpIHtcbiAgICAgICAgLy8gTm9ybWFsaXplIHRoZSBkaXJlY3RvcnkgbmFtZSBvbiBXaW5kb3dzXG4gICAgICAgIGRpcmVjdG9yeSA9IHN5c1BhdGguam9pbihkaXJlY3RvcnksICcnKTtcbiAgICAgICAgdGhyb3R0bGVyID0gdGhpcy5mc3cuX3Rocm90dGxlKCdyZWFkZGlyJywgZGlyZWN0b3J5LCAxMDAwKTtcbiAgICAgICAgaWYgKCF0aHJvdHRsZXIpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGNvbnN0IHByZXZpb3VzID0gdGhpcy5mc3cuX2dldFdhdGNoZWREaXIod2gucGF0aCk7XG4gICAgICAgIGNvbnN0IGN1cnJlbnQgPSBuZXcgU2V0KCk7XG4gICAgICAgIGxldCBzdHJlYW0gPSB0aGlzLmZzdy5fcmVhZGRpcnAoZGlyZWN0b3J5LCB7XG4gICAgICAgICAgICBmaWxlRmlsdGVyOiAoZW50cnkpID0+IHdoLmZpbHRlclBhdGgoZW50cnkpLFxuICAgICAgICAgICAgZGlyZWN0b3J5RmlsdGVyOiAoZW50cnkpID0+IHdoLmZpbHRlckRpcihlbnRyeSksXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXN0cmVhbSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgc3RyZWFtXG4gICAgICAgICAgICAub24oU1RSX0RBVEEsIGFzeW5jIChlbnRyeSkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZCkge1xuICAgICAgICAgICAgICAgIHN0cmVhbSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBpdGVtID0gZW50cnkucGF0aDtcbiAgICAgICAgICAgIGxldCBwYXRoID0gc3lzUGF0aC5qb2luKGRpcmVjdG9yeSwgaXRlbSk7XG4gICAgICAgICAgICBjdXJyZW50LmFkZChpdGVtKTtcbiAgICAgICAgICAgIGlmIChlbnRyeS5zdGF0cy5pc1N5bWJvbGljTGluaygpICYmXG4gICAgICAgICAgICAgICAgKGF3YWl0IHRoaXMuX2hhbmRsZVN5bWxpbmsoZW50cnksIGRpcmVjdG9yeSwgcGF0aCwgaXRlbSkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZCkge1xuICAgICAgICAgICAgICAgIHN0cmVhbSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBGaWxlcyB0aGF0IHByZXNlbnQgaW4gY3VycmVudCBkaXJlY3Rvcnkgc25hcHNob3RcbiAgICAgICAgICAgIC8vIGJ1dCBhYnNlbnQgaW4gcHJldmlvdXMgYXJlIGFkZGVkIHRvIHdhdGNoIGxpc3QgYW5kXG4gICAgICAgICAgICAvLyBlbWl0IGBhZGRgIGV2ZW50LlxuICAgICAgICAgICAgaWYgKGl0ZW0gPT09IHRhcmdldCB8fCAoIXRhcmdldCAmJiAhcHJldmlvdXMuaGFzKGl0ZW0pKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9pbmNyUmVhZHlDb3VudCgpO1xuICAgICAgICAgICAgICAgIC8vIGVuc3VyZSByZWxhdGl2ZW5lc3Mgb2YgcGF0aCBpcyBwcmVzZXJ2ZWQgaW4gY2FzZSBvZiB3YXRjaGVyIHJldXNlXG4gICAgICAgICAgICAgICAgcGF0aCA9IHN5c1BhdGguam9pbihkaXIsIHN5c1BhdGgucmVsYXRpdmUoZGlyLCBwYXRoKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fYWRkVG9Ob2RlRnMocGF0aCwgaW5pdGlhbEFkZCwgd2gsIGRlcHRoICsgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgICAgICAub24oRVYuRVJST1IsIHRoaXMuX2JvdW5kSGFuZGxlRXJyb3IpO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKCFzdHJlYW0pXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdCgpO1xuICAgICAgICAgICAgc3RyZWFtLm9uY2UoU1RSX0VORCwgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RyZWFtID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHdhc1Rocm90dGxlZCA9IHRocm90dGxlciA/IHRocm90dGxlci5jbGVhcigpIDogZmFsc2U7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh1bmRlZmluZWQpO1xuICAgICAgICAgICAgICAgIC8vIEZpbGVzIHRoYXQgYWJzZW50IGluIGN1cnJlbnQgZGlyZWN0b3J5IHNuYXBzaG90XG4gICAgICAgICAgICAgICAgLy8gYnV0IHByZXNlbnQgaW4gcHJldmlvdXMgZW1pdCBgcmVtb3ZlYCBldmVudFxuICAgICAgICAgICAgICAgIC8vIGFuZCBhcmUgcmVtb3ZlZCBmcm9tIEB3YXRjaGVkW2RpcmVjdG9yeV0uXG4gICAgICAgICAgICAgICAgcHJldmlvdXNcbiAgICAgICAgICAgICAgICAgICAgLmdldENoaWxkcmVuKClcbiAgICAgICAgICAgICAgICAgICAgLmZpbHRlcigoaXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbSAhPT0gZGlyZWN0b3J5ICYmICFjdXJyZW50LmhhcyhpdGVtKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZzdy5fcmVtb3ZlKGRpcmVjdG9yeSwgaXRlbSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgc3RyZWFtID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIC8vIG9uZSBtb3JlIHRpbWUgZm9yIGFueSBtaXNzZWQgaW4gY2FzZSBjaGFuZ2VzIGNhbWUgaW4gZXh0cmVtZWx5IHF1aWNrbHlcbiAgICAgICAgICAgICAgICBpZiAod2FzVGhyb3R0bGVkKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9oYW5kbGVSZWFkKGRpcmVjdG9yeSwgZmFsc2UsIHdoLCB0YXJnZXQsIGRpciwgZGVwdGgsIHRocm90dGxlcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJlYWQgZGlyZWN0b3J5IHRvIGFkZCAvIHJlbW92ZSBmaWxlcyBmcm9tIGBAd2F0Y2hlZGAgbGlzdCBhbmQgcmUtcmVhZCBpdCBvbiBjaGFuZ2UuXG4gICAgICogQHBhcmFtIGRpciBmcyBwYXRoXG4gICAgICogQHBhcmFtIHN0YXRzXG4gICAgICogQHBhcmFtIGluaXRpYWxBZGRcbiAgICAgKiBAcGFyYW0gZGVwdGggcmVsYXRpdmUgdG8gdXNlci1zdXBwbGllZCBwYXRoXG4gICAgICogQHBhcmFtIHRhcmdldCBjaGlsZCBwYXRoIHRhcmdldGVkIGZvciB3YXRjaFxuICAgICAqIEBwYXJhbSB3aCBDb21tb24gd2F0Y2ggaGVscGVycyBmb3IgdGhpcyBwYXRoXG4gICAgICogQHBhcmFtIHJlYWxwYXRoXG4gICAgICogQHJldHVybnMgY2xvc2VyIGZvciB0aGUgd2F0Y2hlciBpbnN0YW5jZS5cbiAgICAgKi9cbiAgICBhc3luYyBfaGFuZGxlRGlyKGRpciwgc3RhdHMsIGluaXRpYWxBZGQsIGRlcHRoLCB0YXJnZXQsIHdoLCByZWFscGF0aCkge1xuICAgICAgICBjb25zdCBwYXJlbnREaXIgPSB0aGlzLmZzdy5fZ2V0V2F0Y2hlZERpcihzeXNQYXRoLmRpcm5hbWUoZGlyKSk7XG4gICAgICAgIGNvbnN0IHRyYWNrZWQgPSBwYXJlbnREaXIuaGFzKHN5c1BhdGguYmFzZW5hbWUoZGlyKSk7XG4gICAgICAgIGlmICghKGluaXRpYWxBZGQgJiYgdGhpcy5mc3cub3B0aW9ucy5pZ25vcmVJbml0aWFsKSAmJiAhdGFyZ2V0ICYmICF0cmFja2VkKSB7XG4gICAgICAgICAgICB0aGlzLmZzdy5fZW1pdChFVi5BRERfRElSLCBkaXIsIHN0YXRzKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBlbnN1cmUgZGlyIGlzIHRyYWNrZWQgKGhhcm1sZXNzIGlmIHJlZHVuZGFudClcbiAgICAgICAgcGFyZW50RGlyLmFkZChzeXNQYXRoLmJhc2VuYW1lKGRpcikpO1xuICAgICAgICB0aGlzLmZzdy5fZ2V0V2F0Y2hlZERpcihkaXIpO1xuICAgICAgICBsZXQgdGhyb3R0bGVyO1xuICAgICAgICBsZXQgY2xvc2VyO1xuICAgICAgICBjb25zdCBvRGVwdGggPSB0aGlzLmZzdy5vcHRpb25zLmRlcHRoO1xuICAgICAgICBpZiAoKG9EZXB0aCA9PSBudWxsIHx8IGRlcHRoIDw9IG9EZXB0aCkgJiYgIXRoaXMuZnN3Ll9zeW1saW5rUGF0aHMuaGFzKHJlYWxwYXRoKSkge1xuICAgICAgICAgICAgaWYgKCF0YXJnZXQpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLl9oYW5kbGVSZWFkKGRpciwgaW5pdGlhbEFkZCwgd2gsIHRhcmdldCwgZGlyLCBkZXB0aCwgdGhyb3R0bGVyKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjbG9zZXIgPSB0aGlzLl93YXRjaFdpdGhOb2RlRnMoZGlyLCAoZGlyUGF0aCwgc3RhdHMpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBpZiBjdXJyZW50IGRpcmVjdG9yeSBpcyByZW1vdmVkLCBkbyBub3RoaW5nXG4gICAgICAgICAgICAgICAgaWYgKHN0YXRzICYmIHN0YXRzLm10aW1lTXMgPT09IDApXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB0aGlzLl9oYW5kbGVSZWFkKGRpclBhdGgsIGZhbHNlLCB3aCwgdGFyZ2V0LCBkaXIsIGRlcHRoLCB0aHJvdHRsZXIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNsb3NlcjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogSGFuZGxlIGFkZGVkIGZpbGUsIGRpcmVjdG9yeSwgb3IgZ2xvYiBwYXR0ZXJuLlxuICAgICAqIERlbGVnYXRlcyBjYWxsIHRvIF9oYW5kbGVGaWxlIC8gX2hhbmRsZURpciBhZnRlciBjaGVja3MuXG4gICAgICogQHBhcmFtIHBhdGggdG8gZmlsZSBvciBpclxuICAgICAqIEBwYXJhbSBpbml0aWFsQWRkIHdhcyB0aGUgZmlsZSBhZGRlZCBhdCB3YXRjaCBpbnN0YW50aWF0aW9uP1xuICAgICAqIEBwYXJhbSBwcmlvcldoIGRlcHRoIHJlbGF0aXZlIHRvIHVzZXItc3VwcGxpZWQgcGF0aFxuICAgICAqIEBwYXJhbSBkZXB0aCBDaGlsZCBwYXRoIGFjdHVhbGx5IHRhcmdldGVkIGZvciB3YXRjaFxuICAgICAqIEBwYXJhbSB0YXJnZXQgQ2hpbGQgcGF0aCBhY3R1YWxseSB0YXJnZXRlZCBmb3Igd2F0Y2hcbiAgICAgKi9cbiAgICBhc3luYyBfYWRkVG9Ob2RlRnMocGF0aCwgaW5pdGlhbEFkZCwgcHJpb3JXaCwgZGVwdGgsIHRhcmdldCkge1xuICAgICAgICBjb25zdCByZWFkeSA9IHRoaXMuZnN3Ll9lbWl0UmVhZHk7XG4gICAgICAgIGlmICh0aGlzLmZzdy5faXNJZ25vcmVkKHBhdGgpIHx8IHRoaXMuZnN3LmNsb3NlZCkge1xuICAgICAgICAgICAgcmVhZHkoKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB3aCA9IHRoaXMuZnN3Ll9nZXRXYXRjaEhlbHBlcnMocGF0aCk7XG4gICAgICAgIGlmIChwcmlvcldoKSB7XG4gICAgICAgICAgICB3aC5maWx0ZXJQYXRoID0gKGVudHJ5KSA9PiBwcmlvcldoLmZpbHRlclBhdGgoZW50cnkpO1xuICAgICAgICAgICAgd2guZmlsdGVyRGlyID0gKGVudHJ5KSA9PiBwcmlvcldoLmZpbHRlckRpcihlbnRyeSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZXZhbHVhdGUgd2hhdCBpcyBhdCB0aGUgcGF0aCB3ZSdyZSBiZWluZyBhc2tlZCB0byB3YXRjaFxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBzdGF0TWV0aG9kc1t3aC5zdGF0TWV0aG9kXSh3aC53YXRjaFBhdGgpO1xuICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBpZiAodGhpcy5mc3cuX2lzSWdub3JlZCh3aC53YXRjaFBhdGgsIHN0YXRzKSkge1xuICAgICAgICAgICAgICAgIHJlYWR5KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZm9sbG93ID0gdGhpcy5mc3cub3B0aW9ucy5mb2xsb3dTeW1saW5rcztcbiAgICAgICAgICAgIGxldCBjbG9zZXI7XG4gICAgICAgICAgICBpZiAoc3RhdHMuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFic1BhdGggPSBzeXNQYXRoLnJlc29sdmUocGF0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0UGF0aCA9IGZvbGxvdyA/IGF3YWl0IGZzcmVhbHBhdGgocGF0aCkgOiBwYXRoO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICBjbG9zZXIgPSBhd2FpdCB0aGlzLl9oYW5kbGVEaXIod2gud2F0Y2hQYXRoLCBzdGF0cywgaW5pdGlhbEFkZCwgZGVwdGgsIHRhcmdldCwgd2gsIHRhcmdldFBhdGgpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAvLyBwcmVzZXJ2ZSB0aGlzIHN5bWxpbmsncyB0YXJnZXQgcGF0aFxuICAgICAgICAgICAgICAgIGlmIChhYnNQYXRoICE9PSB0YXJnZXRQYXRoICYmIHRhcmdldFBhdGggIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZzdy5fc3ltbGlua1BhdGhzLnNldChhYnNQYXRoLCB0YXJnZXRQYXRoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChzdGF0cy5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0UGF0aCA9IGZvbGxvdyA/IGF3YWl0IGZzcmVhbHBhdGgocGF0aCkgOiBwYXRoO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnQgPSBzeXNQYXRoLmRpcm5hbWUod2gud2F0Y2hQYXRoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmZzdy5fZ2V0V2F0Y2hlZERpcihwYXJlbnQpLmFkZCh3aC53YXRjaFBhdGgpO1xuICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9lbWl0KEVWLkFERCwgd2gud2F0Y2hQYXRoLCBzdGF0cyk7XG4gICAgICAgICAgICAgICAgY2xvc2VyID0gYXdhaXQgdGhpcy5faGFuZGxlRGlyKHBhcmVudCwgc3RhdHMsIGluaXRpYWxBZGQsIGRlcHRoLCBwYXRoLCB3aCwgdGFyZ2V0UGF0aCk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIC8vIHByZXNlcnZlIHRoaXMgc3ltbGluaydzIHRhcmdldCBwYXRoXG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldFBhdGggIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZzdy5fc3ltbGlua1BhdGhzLnNldChzeXNQYXRoLnJlc29sdmUocGF0aCksIHRhcmdldFBhdGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNsb3NlciA9IHRoaXMuX2hhbmRsZUZpbGUod2gud2F0Y2hQYXRoLCBzdGF0cywgaW5pdGlhbEFkZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZWFkeSgpO1xuICAgICAgICAgICAgaWYgKGNsb3NlcilcbiAgICAgICAgICAgICAgICB0aGlzLmZzdy5fYWRkUGF0aENsb3NlcihwYXRoLCBjbG9zZXIpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgaWYgKHRoaXMuZnN3Ll9oYW5kbGVFcnJvcihlcnJvcikpIHtcbiAgICAgICAgICAgICAgICByZWFkeSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuIiwgImltcG9ydCB7IGFwcGVuZEZpbGVTeW5jLCBleGlzdHNTeW5jLCByZWFkRmlsZVN5bmMsIHN0YXRTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcblxuZXhwb3J0IGNvbnN0IE1BWF9MT0dfQllURVMgPSAxMCAqIDEwMjQgKiAxMDI0O1xuXG5leHBvcnQgZnVuY3Rpb24gYXBwZW5kQ2FwcGVkTG9nKHBhdGg6IHN0cmluZywgbGluZTogc3RyaW5nLCBtYXhCeXRlcyA9IE1BWF9MT0dfQllURVMpOiB2b2lkIHtcbiAgY29uc3QgaW5jb21pbmcgPSBCdWZmZXIuZnJvbShsaW5lKTtcbiAgaWYgKGluY29taW5nLmJ5dGVMZW5ndGggPj0gbWF4Qnl0ZXMpIHtcbiAgICB3cml0ZUZpbGVTeW5jKHBhdGgsIGluY29taW5nLnN1YmFycmF5KGluY29taW5nLmJ5dGVMZW5ndGggLSBtYXhCeXRlcykpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRyeSB7XG4gICAgaWYgKGV4aXN0c1N5bmMocGF0aCkpIHtcbiAgICAgIGNvbnN0IHNpemUgPSBzdGF0U3luYyhwYXRoKS5zaXplO1xuICAgICAgY29uc3QgYWxsb3dlZEV4aXN0aW5nID0gbWF4Qnl0ZXMgLSBpbmNvbWluZy5ieXRlTGVuZ3RoO1xuICAgICAgaWYgKHNpemUgPiBhbGxvd2VkRXhpc3RpbmcpIHtcbiAgICAgICAgY29uc3QgZXhpc3RpbmcgPSByZWFkRmlsZVN5bmMocGF0aCk7XG4gICAgICAgIHdyaXRlRmlsZVN5bmMocGF0aCwgZXhpc3Rpbmcuc3ViYXJyYXkoTWF0aC5tYXgoMCwgZXhpc3RpbmcuYnl0ZUxlbmd0aCAtIGFsbG93ZWRFeGlzdGluZykpKTtcbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2gge1xuICAgIC8vIElmIHRyaW1taW5nIGZhaWxzLCBzdGlsbCB0cnkgdG8gYXBwZW5kIGJlbG93OyBsb2dnaW5nIG11c3QgYmUgYmVzdC1lZmZvcnQuXG4gIH1cblxuICBhcHBlbmRGaWxlU3luYyhwYXRoLCBpbmNvbWluZyk7XG59XG4iLCAiaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBkaXJuYW1lLCBqb2luIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuaW1wb3J0IHR5cGUge1xuICBDb2RleENkcFN0YXR1cyxcbiAgQ29kZXhDZHBUYXJnZXQsXG4gIENvZGV4UnVudGltZUNhcGFiaWxpdGllcyxcbiAgQ29kZXhSdW50aW1lSW5mbyxcbiAgQ29kZXhSdW50aW1lVHlwZSxcbn0gZnJvbSBcIkBjb2RleC1wbHVzcGx1cy9zZGtcIjtcblxuLyoqXG4gKiBSdW50aW1lIGNvbXBhdGliaWxpdHkgaXMgY2FwYWJpbGl0eS1kcml2ZW4uIEFwcC92ZXJzaW9uIHN0cmluZ3MgYXJlXG4gKiBkaWFnbm9zdGljIG1ldGFkYXRhIG9ubHkgXHUyMDE0IHRoZXkgbXVzdCBub3QgZ2F0ZSBiZWhhdmlvci4gUHJvYmUgYWRhcHRlcnNcbiAqIGluc3BlY3QgZXhpc3Rpbmcgc3VyZmFjZXM7IHRoZXkgbmV2ZXIgY3JlYXRlIHdpbmRvd3MsIG11dGF0ZSBwZXJzaXN0ZW50XG4gKiBzdGF0ZSwgb3IgdG91Y2ggdGhlIG5ldHdvcmsuXG4gKi9cblxuZXhwb3J0IHR5cGUgUnVudGltZVN1cHBvcnRMZXZlbCA9IFwic3VwcG9ydGVkXCIgfCBcImRlZ3JhZGVkXCIgfCBcInVua25vd25cIjtcbmV4cG9ydCB0eXBlIFByZWxvYWRSZWdpc3RyYXRpb25TdHJhdGVneSA9IFwicmVnaXN0ZXJQcmVsb2FkU2NyaXB0XCIgfCBcInNldFByZWxvYWRzXCIgfCBcInVuYXZhaWxhYmxlXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvYmVBcHBBZGFwdGVyIHtcbiAgZ2V0VmVyc2lvbj86ICgpID0+IHN0cmluZztcbiAgZ2V0QXBwUGF0aD86ICgpID0+IHN0cmluZztcbiAgaXNQYWNrYWdlZD86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvYmVTZXNzaW9uQWRhcHRlciB7XG4gIHJlZ2lzdGVyUHJlbG9hZFNjcmlwdD86IHVua25vd247XG4gIHNldFByZWxvYWRzPzogdW5rbm93bjtcbiAgZ2V0UHJlbG9hZHM/OiB1bmtub3duO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFByb2JlV2luZG93U2FtcGxlIHtcbiAgYWRkQnJvd3NlclZpZXc/OiB1bmtub3duO1xuICBmcm9tSWQ/OiB1bmtub3duO1xuICBjb250ZW50Vmlldz86IHVua25vd247XG4gIGFkZENoaWxkVmlldz86IHVua25vd247XG4gIHJlbW92ZUNoaWxkVmlldz86IHVua25vd247XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvYmVWaWV3U2FtcGxlIHtcbiAgcHJlc2VudD86IGJvb2xlYW47XG4gIHdlYkNvbnRlbnRzVmlldz86IHVua25vd247XG4gIHNldEJvdW5kcz86IHVua25vd247XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVudGltZVByb2JlRW52IHtcbiAgcGxhdGZvcm0/OiBOb2RlSlMuUGxhdGZvcm07XG4gIGV4ZWNQYXRoPzogc3RyaW5nO1xuICByZXNvdXJjZXNQYXRoPzogc3RyaW5nIHwgbnVsbDtcbiAgZXhpc3RzU3luYz86IChwYXRoOiBzdHJpbmcpID0+IGJvb2xlYW47XG4gIHByb2Nlc3NFbnY/OiBOb2RlSlMuUHJvY2Vzc0VudjtcbiAgYXBwPzogUHJvYmVBcHBBZGFwdGVyIHwgbnVsbDtcbiAgc2Vzc2lvbj86IHsgZGVmYXVsdFNlc3Npb24/OiBQcm9iZVNlc3Npb25BZGFwdGVyIHwgbnVsbCB9IHwgUHJvYmVTZXNzaW9uQWRhcHRlciB8IG51bGw7XG4gIGJyb3dzZXJXaW5kb3c/OiB7IGZyb21JZD86IHVua25vd247IGdldEZvY3VzZWRXaW5kb3c/OiAoKSA9PiB1bmtub3duOyBnZXRBbGxXaW5kb3dzPzogKCkgPT4gdW5rbm93bltdIH0gfCBudWxsO1xuICBicm93c2VyVmlldz86IHVua25vd247XG4gIGdldFdpbmRvd1NlcnZpY2VzPzogKCkgPT4gdW5rbm93biB8IG51bGw7XG4gIGluc3BlY3RFeGlzdGluZ1dpbmRvdz86ICgpID0+IFByb2JlV2luZG93U2FtcGxlIHwgbnVsbDtcbiAgaW5zcGVjdEJyb3dzZXJWaWV3PzogKCkgPT4gUHJvYmVWaWV3U2FtcGxlIHwgbnVsbDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSdW50aW1lUHJvYmVPcHRpb25zIHtcbiAgdXNlclJvb3Q6IHN0cmluZztcbiAgcnVudGltZURpcjogc3RyaW5nO1xuICBjb2RleFZlcnNpb246IHN0cmluZyB8IG51bGw7XG4gIGNoYW5uZWw6IHN0cmluZyB8IG51bGw7XG4gIGdldFdpbmRvd1NlcnZpY2VzKCk6IHVua25vd24gfCBudWxsO1xuICBnZXROYXRpdmVDYXBhYmlsaXRpZXM/KCk6IENvZGV4UnVudGltZUNhcGFiaWxpdGllc1tcIm5hdGl2ZVwiXTtcbiAgZW52PzogUnVudGltZVByb2JlRW52O1xufVxuXG4vKiogSW50ZXJuYWwgc25hcHNob3QuIE5vdCBwYXJ0IG9mIHRoZSBwdWJsaWMgU0RLLiAqL1xuZXhwb3J0IGludGVyZmFjZSBSdW50aW1lQ29tcGF0aWJpbGl0eVNuYXBzaG90IHtcbiAgcnVudGltZVR5cGU6IENvZGV4UnVudGltZVR5cGU7XG4gIGFwcFZlcnNpb246IHN0cmluZyB8IG51bGw7XG4gIGJ1aWxkRmxhdm9yOiBzdHJpbmcgfCBudWxsO1xuICBwcmVsb2FkOiB7XG4gICAgcmVnaXN0ZXJQcmVsb2FkU2NyaXB0OiBib29sZWFuO1xuICAgIHNldFByZWxvYWRzRmFsbGJhY2s6IGJvb2xlYW47XG4gIH07XG4gIHdpbmRvd3M6IHtcbiAgICB3aW5kb3dTZXJ2aWNlczogYm9vbGVhbjtcbiAgICBjcmVhdGVXaW5kb3c6IGJvb2xlYW47XG4gICAgZ2V0UHJpbWFyeVdpbmRvdzogYm9vbGVhbjtcbiAgICByZWdpc3RlcldpbmRvdzogYm9vbGVhbjtcbiAgfTtcbiAgdmlld3M6IHtcbiAgICBicm93c2VyVmlldzogYm9vbGVhbjtcbiAgICBjb250ZW50VmlldzogYm9vbGVhbjtcbiAgICB3ZWJDb250ZW50c1ZpZXc6IGJvb2xlYW47XG4gICAgcHJpdmF0ZVZpZXdUcmVlOiBib29sZWFuO1xuICB9O1xuICBzaGVsbDoge1xuICAgIG93bDogYm9vbGVhbjtcbiAgICBlbGVjdHJvbkNvbXBhdGlibGU6IGJvb2xlYW47XG4gIH07XG4gIHN1cHBvcnQ6IHtcbiAgICBsZXZlbDogUnVudGltZVN1cHBvcnRMZXZlbDtcbiAgICByZWFzb25zOiBzdHJpbmdbXTtcbiAgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbnNwZWN0ZWRXaW5kb3dTZXJ2aWNlcyB7XG4gIHByZXNlbnQ6IGJvb2xlYW47XG4gIGNyZWF0ZVdpbmRvdzogYm9vbGVhbjtcbiAgY3JlYXRlRnJlc2hXaW5kb3c6IGJvb2xlYW47XG4gIGNyZWF0ZUZyZXNoTG9jYWxXaW5kb3c6IGJvb2xlYW47XG4gIGVuc3VyZUhvc3RXaW5kb3c6IGJvb2xlYW47XG4gIGdldFByaW1hcnlXaW5kb3c6IGJvb2xlYW47XG4gIGdldFByaW1hcnlXaW5kb3dGcm9tTWFuYWdlcjogYm9vbGVhbjtcbiAgcmVnaXN0ZXJXaW5kb3c6IGJvb2xlYW47XG4gIGNhbkNyZWF0ZTogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBWaWV3QXR0YWNoVGFyZ2V0cyB7XG4gIGFkZEJyb3dzZXJWaWV3OiBib29sZWFuO1xuICBjb250ZW50VmlldzogYm9vbGVhbjtcbiAgYWRkQ2hpbGRWaWV3OiBib29sZWFuO1xuICByZW1vdmVDaGlsZFZpZXc6IGJvb2xlYW47XG4gIHdlYkNvbnRlbnRzVmlldzogYm9vbGVhbjtcbiAgd2ViQ29udGVudHNWaWV3U2V0Qm91bmRzOiBib29sZWFuO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJvYmVSdW50aW1lQ29tcGF0aWJpbGl0eShvcHRzOiBSdW50aW1lUHJvYmVPcHRpb25zKTogUnVudGltZUNvbXBhdGliaWxpdHlTbmFwc2hvdCB7XG4gIGNvbnN0IGVudiA9IHsgLi4uY3JlYXRlRGVmYXVsdFByb2JlRW52KG9wdHMpLCAuLi5vcHRzLmVudiB9O1xuICBjb25zdCBnZXRXaW5kb3dTZXJ2aWNlcyA9IGVudi5nZXRXaW5kb3dTZXJ2aWNlcyA/PyBvcHRzLmdldFdpbmRvd1NlcnZpY2VzO1xuICBjb25zdCBydW50aW1lVHlwZSA9IGRldGVjdFJ1bnRpbWVUeXBlKGVudik7XG4gIGNvbnN0IGFwcFZlcnNpb24gPSBvcHRzLmNvZGV4VmVyc2lvbiA/PyBzYWZlQ2FsbCgoKSA9PiBlbnYuYXBwPy5nZXRWZXJzaW9uPy4oKSkgPz8gbnVsbDtcbiAgY29uc3QgYXBwUGF0aCA9IHNhZmVBcHBQYXRoKGVudik7XG4gIGNvbnN0IGJ1aWxkRmxhdm9yID0gc2FmZUJ1aWxkRmxhdm9yKGVudiwgYXBwUGF0aCk7XG4gIGNvbnN0IHNlc3Npb24gPSBkZWZhdWx0U2Vzc2lvbkZyb20oZW52KTtcbiAgY29uc3QgcHJlbG9hZFN0cmF0ZWd5ID0gc2VsZWN0UHJlbG9hZFJlZ2lzdHJhdGlvbihzZXNzaW9uKTtcbiAgY29uc3Qgd2luZG93cyA9IGluc3BlY3RXaW5kb3dTZXJ2aWNlcyhzYWZlQ2FsbChnZXRXaW5kb3dTZXJ2aWNlcykgPz8gbnVsbCk7XG4gIGNvbnN0IHdpbmRvd1NhbXBsZSA9IGVudi5pbnNwZWN0RXhpc3RpbmdXaW5kb3c/LigpID8/IG51bGw7XG4gIGNvbnN0IHZpZXdTYW1wbGUgPSBlbnYuaW5zcGVjdEJyb3dzZXJWaWV3Py4oKSA/PyB2aWV3U2FtcGxlRnJvbUNvbnN0cnVjdG9yKGVudi5icm93c2VyVmlldyk7XG4gIGNvbnN0IGF0dGFjaCA9IGluc3BlY3RWaWV3QXR0YWNoVGFyZ2V0cyh3aW5kb3dTYW1wbGVUb1BhcmVudCh3aW5kb3dTYW1wbGUpLCB2aWV3U2FtcGxlVG9WaWV3KHZpZXdTYW1wbGUpKTtcbiAgY29uc3QgYnJvd3NlclZpZXdDdG9yID0gZW52LmJyb3dzZXJWaWV3ICE9IG51bGwgfHwgQm9vbGVhbih2aWV3U2FtcGxlPy5wcmVzZW50KTtcbiAgY29uc3QgYnJvd3NlclZpZXcgPSBhdHRhY2guYWRkQnJvd3NlclZpZXcgfHwgYnJvd3NlclZpZXdDdG9yO1xuICBjb25zdCB3ZWJDb250ZW50c1ZpZXdPYnNlcnZlZCA9IEJvb2xlYW4odmlld1NhbXBsZT8ud2ViQ29udGVudHNWaWV3KSB8fCBhdHRhY2gud2ViQ29udGVudHNWaWV3O1xuICBjb25zdCB3ZWJDb250ZW50c1ZpZXdTZXRCb3VuZHMgPVxuICAgIGF0dGFjaC53ZWJDb250ZW50c1ZpZXdTZXRCb3VuZHMgfHxcbiAgICBpc0ZuKGFzUmVjb3JkKHZpZXdTYW1wbGU/LndlYkNvbnRlbnRzVmlldyk/LnNldEJvdW5kcyk7XG4gIGNvbnN0IHdlYkNvbnRlbnRzVmlldyA9IHdlYkNvbnRlbnRzVmlld09ic2VydmVkICYmIHdlYkNvbnRlbnRzVmlld1NldEJvdW5kcztcbiAgY29uc3QgcHJpdmF0ZVZpZXdUcmVlID0gYXR0YWNoLmFkZENoaWxkVmlldyAmJiBhdHRhY2gucmVtb3ZlQ2hpbGRWaWV3ICYmIHdlYkNvbnRlbnRzVmlldztcbiAgY29uc3QgZWxlY3Ryb25Db21wYXRpYmxlID1cbiAgICBydW50aW1lVHlwZSA9PT0gXCJlbGVjdHJvblwiIHx8XG4gICAgcnVudGltZVR5cGUgPT09IFwib3dsXCIgfHxcbiAgICBzZXNzaW9uICE9IG51bGwgfHxcbiAgICBlbnYuYnJvd3NlcldpbmRvdyAhPSBudWxsIHx8XG4gICAgZW52LmJyb3dzZXJWaWV3ICE9IG51bGwgfHxcbiAgICBlbnYuYXBwICE9IG51bGw7XG4gIGNvbnN0IG93bCA9IHJ1bnRpbWVUeXBlID09PSBcIm93bFwiO1xuICBjb25zdCBwcmVsb2FkID0ge1xuICAgIHJlZ2lzdGVyUHJlbG9hZFNjcmlwdDogcHJlbG9hZFN0cmF0ZWd5ID09PSBcInJlZ2lzdGVyUHJlbG9hZFNjcmlwdFwiLFxuICAgIHNldFByZWxvYWRzRmFsbGJhY2s6IGlzRm4oYXNSZWNvcmQoc2Vzc2lvbik/LnNldFByZWxvYWRzKSxcbiAgfTtcbiAgY29uc3Qgc25hcHNob3RXaW5kb3dzID0ge1xuICAgIHdpbmRvd1NlcnZpY2VzOiB3aW5kb3dzLnByZXNlbnQsXG4gICAgY3JlYXRlV2luZG93OiB3aW5kb3dzLmNhbkNyZWF0ZSxcbiAgICBnZXRQcmltYXJ5V2luZG93OiB3aW5kb3dzLmdldFByaW1hcnlXaW5kb3cgfHwgd2luZG93cy5nZXRQcmltYXJ5V2luZG93RnJvbU1hbmFnZXIsXG4gICAgcmVnaXN0ZXJXaW5kb3c6IHdpbmRvd3MucmVnaXN0ZXJXaW5kb3csXG4gIH07XG4gIGNvbnN0IHNuYXBzaG90Vmlld3MgPSB7XG4gICAgYnJvd3NlclZpZXcsXG4gICAgY29udGVudFZpZXc6IGF0dGFjaC5jb250ZW50VmlldyxcbiAgICB3ZWJDb250ZW50c1ZpZXcsXG4gICAgcHJpdmF0ZVZpZXdUcmVlLFxuICB9O1xuICBjb25zdCBzaGVsbCA9IHsgb3dsLCBlbGVjdHJvbkNvbXBhdGlibGUgfTtcbiAgcmV0dXJuIHtcbiAgICBydW50aW1lVHlwZSxcbiAgICBhcHBWZXJzaW9uLFxuICAgIGJ1aWxkRmxhdm9yLFxuICAgIHByZWxvYWQsXG4gICAgd2luZG93czogc25hcHNob3RXaW5kb3dzLFxuICAgIHZpZXdzOiBzbmFwc2hvdFZpZXdzLFxuICAgIHNoZWxsLFxuICAgIHN1cHBvcnQ6IHN1cHBvcnRGcm9tKHJ1bnRpbWVUeXBlLCBlbGVjdHJvbkNvbXBhdGlibGUsIHByZWxvYWQsIHNuYXBzaG90V2luZG93cywgc25hcHNob3RWaWV3cyksXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRSdW50aW1lSW5mbyhvcHRzOiBSdW50aW1lUHJvYmVPcHRpb25zKTogQ29kZXhSdW50aW1lSW5mbyB7XG4gIGNvbnN0IHNuYXBzaG90ID0gcHJvYmVSdW50aW1lQ29tcGF0aWJpbGl0eShvcHRzKTtcbiAgY29uc3QgZW52ID0geyAuLi5jcmVhdGVEZWZhdWx0UHJvYmVFbnYob3B0cyksIC4uLm9wdHMuZW52IH07XG4gIHJldHVybiB7XG4gICAgdHlwZTogc25hcHNob3QucnVudGltZVR5cGUsXG4gICAgY29kZXhWZXJzaW9uOiBzbmFwc2hvdC5hcHBWZXJzaW9uLFxuICAgIGNoYW5uZWw6IG9wdHMuY2hhbm5lbCxcbiAgICBidWlsZEZsYXZvcjogc25hcHNob3QuYnVpbGRGbGF2b3IsXG4gICAgdXNlc093bEFwcFNoZWxsOiBudWxsLFxuICAgIGFwcFBhdGg6IHNhZmVBcHBQYXRoKGVudiksXG4gICAgcmVzb3VyY2VzUGF0aDogZW52LnJlc291cmNlc1BhdGggPz8gbnVsbCxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFJ1bnRpbWVDYXBhYmlsaXRpZXMob3B0czogUnVudGltZVByb2JlT3B0aW9ucyk6IENvZGV4UnVudGltZUNhcGFiaWxpdGllcyB7XG4gIGNvbnN0IHNuYXBzaG90ID0gcHJvYmVSdW50aW1lQ29tcGF0aWJpbGl0eShvcHRzKTtcbiAgY29uc3QgbmF0aXZlID0gb3B0cy5nZXROYXRpdmVDYXBhYmlsaXRpZXM/LigpID8/IGRlZmF1bHROYXRpdmVDYXBhYmlsaXRpZXMob3B0cy5lbnY/LnBsYXRmb3JtID8/IHByb2Nlc3MucGxhdGZvcm0pO1xuICBjb25zdCBlbnYgPSB7IC4uLmNyZWF0ZURlZmF1bHRQcm9iZUVudihvcHRzKSwgLi4ub3B0cy5lbnYgfTtcbiAgY29uc3QgY2FuRm9jdXMgPSBpc0ZuKGFzUmVjb3JkKGVudi5icm93c2VyV2luZG93KT8uZnJvbUlkKSB8fCBzbmFwc2hvdC5zaGVsbC5lbGVjdHJvbkNvbXBhdGlibGU7XG4gIHJldHVybiBjYXBhYmlsaXRpZXNGcm9tU25hcHNob3Qoc25hcHNob3QsIG5hdGl2ZSwgY2FuRm9jdXMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2FwYWJpbGl0aWVzRnJvbVNuYXBzaG90KFxuICBzbmFwc2hvdDogUnVudGltZUNvbXBhdGliaWxpdHlTbmFwc2hvdCxcbiAgbmF0aXZlOiBDb2RleFJ1bnRpbWVDYXBhYmlsaXRpZXNbXCJuYXRpdmVcIl0sXG4gIGNhbkZvY3VzID0gdHJ1ZSxcbik6IENvZGV4UnVudGltZUNhcGFiaWxpdGllcyB7XG4gIGNvbnN0IGNkcCA9IGdldENkcFN0YXR1cygpO1xuICByZXR1cm4ge1xuICAgIHdpbmRvd3M6IHtcbiAgICAgIGNyZWF0ZTogc25hcHNob3Qud2luZG93cy5jcmVhdGVXaW5kb3csXG4gICAgICBmb2N1czogY2FuRm9jdXMsXG4gICAgICBwcmltYXJ5OiBzbmFwc2hvdC53aW5kb3dzLmdldFByaW1hcnlXaW5kb3csXG4gICAgICBicm93c2VyVmlldzogc25hcHNob3Qud2luZG93cy5yZWdpc3RlcldpbmRvdyxcbiAgICB9LFxuICAgIHZpZXdzOiB2aWV3c0NhcGFiaWxpdGllc0Zyb21TbmFwc2hvdChzbmFwc2hvdCksXG4gICAgY2RwOiB7XG4gICAgICBzdXBwb3J0ZWQ6IHRydWUsXG4gICAgICBlbmFibGVkOiBjZHAuZW5hYmxlZCxcbiAgICAgIHBvcnQ6IGNkcC5wb3J0LFxuICAgIH0sXG4gICAgbmF0aXZlLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdmlld3NDYXBhYmlsaXRpZXNGcm9tU25hcHNob3QoXG4gIHNuYXBzaG90OiBSdW50aW1lQ29tcGF0aWJpbGl0eVNuYXBzaG90LFxuKTogQ29kZXhSdW50aW1lQ2FwYWJpbGl0aWVzW1widmlld3NcIl0ge1xuICBjb25zdCBwcml2YXRlQXR0YWNoID0gc25hcHNob3Qudmlld3MucHJpdmF0ZVZpZXdUcmVlO1xuICByZXR1cm4ge1xuICAgIGNyZWF0ZTogcHJpdmF0ZUF0dGFjaCB8fCBzbmFwc2hvdC52aWV3cy5icm93c2VyVmlldyxcbiAgICBwcml2YXRlVmlld1RyZWU6IHByaXZhdGVBdHRhY2gsXG4gICAgd2ViQ29udGVudHNWaWV3OiBzbmFwc2hvdC52aWV3cy53ZWJDb250ZW50c1ZpZXcsXG4gICAgYnJvd3NlclZpZXdGYWxsYmFjazogc25hcHNob3Qudmlld3MuYnJvd3NlclZpZXcsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDZHBTdGF0dXMoKTogQ29kZXhDZHBTdGF0dXMge1xuICBjb25zdCBlbmFibGVkID0gcHJvY2Vzcy5lbnYuQ09ERVhQUF9SRU1PVEVfREVCVUcgPT09IFwiMVwiO1xuICBjb25zdCBwb3J0ID0gcGFyc2VDZHBQb3J0KHByb2Nlc3MuZW52LkNPREVYUFBfUkVNT1RFX0RFQlVHX1BPUlQpO1xuICByZXR1cm4ge1xuICAgIHN1cHBvcnRlZDogdHJ1ZSxcbiAgICBlbmFibGVkLFxuICAgIHBvcnQ6IGVuYWJsZWQgPyBwb3J0IDogbnVsbCxcbiAgICB1cmw6IGVuYWJsZWQgPyBgaHR0cDovLzEyNy4wLjAuMToke3BvcnR9YCA6IG51bGwsXG4gIH07XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsaXN0Q2RwVGFyZ2V0cygpOiBQcm9taXNlPENvZGV4Q2RwVGFyZ2V0W10+IHtcbiAgY29uc3Qgc3RhdHVzID0gZ2V0Q2RwU3RhdHVzKCk7XG4gIGlmICghc3RhdHVzLmVuYWJsZWQgfHwgIXN0YXR1cy51cmwpIHJldHVybiBbXTtcbiAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgY29uc3QgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4gY29udHJvbGxlci5hYm9ydCgpLCAxMDAwKTtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaChgJHtzdGF0dXMudXJsfS9qc29uYCwgeyBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsIH0pO1xuICAgIGlmICghcmVzLm9rKSByZXR1cm4gW107XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHJlcy5qc29uKCkgYXMgdW5rbm93bjtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkocm93cykpIHJldHVybiBbXTtcbiAgICByZXR1cm4gcm93c1xuICAgICAgLm1hcCgocm93KSA9PiBub3JtYWxpemVDZHBUYXJnZXQocm93KSlcbiAgICAgIC5maWx0ZXIoKHJvdyk6IHJvdyBpcyBDb2RleENkcFRhcmdldCA9PiByb3cgIT09IG51bGwpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gW107XG4gIH0gZmluYWxseSB7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZWxlY3RQcmVsb2FkUmVnaXN0cmF0aW9uKHNlc3Npb25MaWtlOiB1bmtub3duKTogUHJlbG9hZFJlZ2lzdHJhdGlvblN0cmF0ZWd5IHtcbiAgY29uc3Qgc2Vzc2lvbiA9IGFzUmVjb3JkKHNlc3Npb25MaWtlKTtcbiAgaWYgKGlzRm4oc2Vzc2lvbj8ucmVnaXN0ZXJQcmVsb2FkU2NyaXB0KSkgcmV0dXJuIFwicmVnaXN0ZXJQcmVsb2FkU2NyaXB0XCI7XG4gIGlmIChpc0ZuKHNlc3Npb24/LnNldFByZWxvYWRzKSkgcmV0dXJuIFwic2V0UHJlbG9hZHNcIjtcbiAgcmV0dXJuIFwidW5hdmFpbGFibGVcIjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluc3BlY3RXaW5kb3dTZXJ2aWNlcyhzZXJ2aWNlczogdW5rbm93bik6IEluc3BlY3RlZFdpbmRvd1NlcnZpY2VzIHtcbiAgY29uc3QgcmVjID0gYXNSZWNvcmQoc2VydmljZXMpO1xuICBjb25zdCB3aW5kb3dNYW5hZ2VyID0gYXNSZWNvcmQocmVjPy53aW5kb3dNYW5hZ2VyKTtcbiAgY29uc3QgY3JlYXRlV2luZG93ID0gaXNGbih3aW5kb3dNYW5hZ2VyPy5jcmVhdGVXaW5kb3cpO1xuICBjb25zdCBjcmVhdGVGcmVzaFdpbmRvdyA9IGlzRm4ocmVjPy5jcmVhdGVGcmVzaFdpbmRvdyk7XG4gIGNvbnN0IGNyZWF0ZUZyZXNoTG9jYWxXaW5kb3cgPSBpc0ZuKHJlYz8uY3JlYXRlRnJlc2hMb2NhbFdpbmRvdyk7XG4gIGNvbnN0IGVuc3VyZUhvc3RXaW5kb3cgPSBpc0ZuKHJlYz8uZW5zdXJlSG9zdFdpbmRvdyk7XG4gIGNvbnN0IGdldFByaW1hcnlXaW5kb3cgPSBpc0ZuKHJlYz8uZ2V0UHJpbWFyeVdpbmRvdyk7XG4gIGNvbnN0IGdldFByaW1hcnlXaW5kb3dGcm9tTWFuYWdlciA9IGlzRm4od2luZG93TWFuYWdlcj8uZ2V0UHJpbWFyeVdpbmRvdyk7XG4gIGNvbnN0IHJlZ2lzdGVyV2luZG93ID0gaXNGbih3aW5kb3dNYW5hZ2VyPy5yZWdpc3RlcldpbmRvdyk7XG4gIHJldHVybiB7XG4gICAgcHJlc2VudDogcmVjICE9PSBudWxsLFxuICAgIGNyZWF0ZVdpbmRvdyxcbiAgICBjcmVhdGVGcmVzaFdpbmRvdyxcbiAgICBjcmVhdGVGcmVzaExvY2FsV2luZG93LFxuICAgIGVuc3VyZUhvc3RXaW5kb3csXG4gICAgZ2V0UHJpbWFyeVdpbmRvdyxcbiAgICBnZXRQcmltYXJ5V2luZG93RnJvbU1hbmFnZXIsXG4gICAgcmVnaXN0ZXJXaW5kb3csXG4gICAgY2FuQ3JlYXRlOiBjcmVhdGVXaW5kb3cgfHwgY3JlYXRlRnJlc2hXaW5kb3cgfHwgY3JlYXRlRnJlc2hMb2NhbFdpbmRvdyB8fCBlbnN1cmVIb3N0V2luZG93LFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5zcGVjdFZpZXdBdHRhY2hUYXJnZXRzKHBhcmVudDogdW5rbm93biwgdmlldz86IHVua25vd24pOiBWaWV3QXR0YWNoVGFyZ2V0cyB7XG4gIGNvbnN0IHBhcmVudFJlY29yZCA9IGFzUmVjb3JkKHBhcmVudCk7XG4gIGNvbnN0IGNvbnRlbnRWaWV3ID0gYXNSZWNvcmQocGFyZW50UmVjb3JkPy5jb250ZW50Vmlldyk7XG4gIGNvbnN0IHZpZXdSZWNvcmQgPSBhc1JlY29yZCh2aWV3KTtcbiAgY29uc3Qgd2ViQ29udGVudHNWaWV3ID0gYXNSZWNvcmQodmlld1JlY29yZD8ud2ViQ29udGVudHNWaWV3KTtcbiAgY29uc3Qgd2ViQ29udGVudHNWaWV3UHJlc2VudCA9IEJvb2xlYW4odmlld1JlY29yZCAmJiB2aWV3UmVjb3JkLndlYkNvbnRlbnRzVmlldyk7XG4gIHJldHVybiB7XG4gICAgYWRkQnJvd3NlclZpZXc6IGlzRm4ocGFyZW50UmVjb3JkPy5hZGRCcm93c2VyVmlldyksXG4gICAgY29udGVudFZpZXc6IGNvbnRlbnRWaWV3ICE9PSBudWxsLFxuICAgIGFkZENoaWxkVmlldzogaXNGbihjb250ZW50Vmlldz8uYWRkQ2hpbGRWaWV3KSxcbiAgICByZW1vdmVDaGlsZFZpZXc6IGlzRm4oY29udGVudFZpZXc/LnJlbW92ZUNoaWxkVmlldyksXG4gICAgd2ViQ29udGVudHNWaWV3OiB3ZWJDb250ZW50c1ZpZXdQcmVzZW50LFxuICAgIHdlYkNvbnRlbnRzVmlld1NldEJvdW5kczogaXNGbih3ZWJDb250ZW50c1ZpZXc/LnNldEJvdW5kcykgfHwgaXNGbih2aWV3UmVjb3JkPy5zZXRCb3VuZHMpLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd2luZG93U2FtcGxlRnJvbSh3aW46IHVua25vd24pOiBQcm9iZVdpbmRvd1NhbXBsZSB8IG51bGwge1xuICBjb25zdCByZWMgPSBhc1JlY29yZCh3aW4pO1xuICBpZiAoIXJlYykgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGNvbnRlbnRWaWV3ID0gYXNSZWNvcmQocmVjLmNvbnRlbnRWaWV3KTtcbiAgcmV0dXJuIHtcbiAgICBhZGRCcm93c2VyVmlldzogcmVjLmFkZEJyb3dzZXJWaWV3LFxuICAgIGZyb21JZDogcmVjLmZyb21JZCxcbiAgICBjb250ZW50VmlldzogcmVjLmNvbnRlbnRWaWV3LFxuICAgIGFkZENoaWxkVmlldzogY29udGVudFZpZXc/LmFkZENoaWxkVmlldyxcbiAgICByZW1vdmVDaGlsZFZpZXc6IGNvbnRlbnRWaWV3Py5yZW1vdmVDaGlsZFZpZXcsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2aWV3U2FtcGxlRnJvbUNvbnN0cnVjdG9yKGJyb3dzZXJWaWV3OiB1bmtub3duKTogUHJvYmVWaWV3U2FtcGxlIHwgbnVsbCB7XG4gIGlmIChicm93c2VyVmlldyA9PSBudWxsKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgY3RvciA9IGFzUmVjb3JkKGJyb3dzZXJWaWV3KTtcbiAgY29uc3QgcHJvdG8gPSBhc1JlY29yZChjdG9yPy5wcm90b3R5cGUpID8/ICh0eXBlb2YgYnJvd3NlclZpZXcgPT09IFwib2JqZWN0XCIgPyBhc1JlY29yZChPYmplY3QuZ2V0UHJvdG90eXBlT2YoYnJvd3NlclZpZXcpKSA6IG51bGwpO1xuICBjb25zdCB3ZWJDb250ZW50c1ZpZXcgPSBwcm90bz8ud2ViQ29udGVudHNWaWV3ID8/IGN0b3I/LndlYkNvbnRlbnRzVmlldztcbiAgcmV0dXJuIHtcbiAgICBwcmVzZW50OiB0eXBlb2YgYnJvd3NlclZpZXcgPT09IFwiZnVuY3Rpb25cIiB8fCBwcm90byAhPT0gbnVsbCxcbiAgICB3ZWJDb250ZW50c1ZpZXcsXG4gICAgc2V0Qm91bmRzOiBhc1JlY29yZCh3ZWJDb250ZW50c1ZpZXcpPy5zZXRCb3VuZHMgPz8gcHJvdG8/LnNldEJvdW5kcyxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZURlZmF1bHRQcm9iZUVudihvcHRzPzogUGljazxSdW50aW1lUHJvYmVPcHRpb25zLCBcImdldFdpbmRvd1NlcnZpY2VzXCI+KTogUnVudGltZVByb2JlRW52IHtcbiAgY29uc3QgZWxlY3Ryb24gPSB0cnlSZXF1aXJlRWxlY3Ryb24oKTtcbiAgY29uc3QgQnJvd3NlcldpbmRvdyA9IGVsZWN0cm9uPy5Ccm93c2VyV2luZG93O1xuICBjb25zdCBCcm93c2VyVmlldyA9IGVsZWN0cm9uPy5Ccm93c2VyVmlldztcbiAgcmV0dXJuIHtcbiAgICBwbGF0Zm9ybTogcHJvY2Vzcy5wbGF0Zm9ybSxcbiAgICBleGVjUGF0aDogcHJvY2Vzcy5leGVjUGF0aCxcbiAgICByZXNvdXJjZXNQYXRoOiBwcm9jZXNzLnJlc291cmNlc1BhdGggPz8gbnVsbCxcbiAgICBleGlzdHNTeW5jLFxuICAgIHByb2Nlc3NFbnY6IHByb2Nlc3MuZW52LFxuICAgIGFwcDogZWxlY3Ryb24/LmFwcCA/PyBudWxsLFxuICAgIHNlc3Npb246IGVsZWN0cm9uPy5zZXNzaW9uID8/IG51bGwsXG4gICAgYnJvd3NlcldpbmRvdzogQnJvd3NlcldpbmRvdyA/PyBudWxsLFxuICAgIGJyb3dzZXJWaWV3OiBCcm93c2VyVmlldyA/PyBudWxsLFxuICAgIGdldFdpbmRvd1NlcnZpY2VzOiBvcHRzPy5nZXRXaW5kb3dTZXJ2aWNlcyxcbiAgICBpbnNwZWN0RXhpc3RpbmdXaW5kb3c6ICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGZvY3VzZWQgPSBCcm93c2VyV2luZG93Py5nZXRGb2N1c2VkV2luZG93Py4oKTtcbiAgICAgICAgaWYgKGZvY3VzZWQpIHJldHVybiB3aW5kb3dTYW1wbGVGcm9tKGZvY3VzZWQpO1xuICAgICAgICBjb25zdCB3aW5kb3dzID0gQnJvd3NlcldpbmRvdz8uZ2V0QWxsV2luZG93cz8uKCkgPz8gW107XG4gICAgICAgIGNvbnN0IGxpdmUgPSB3aW5kb3dzLmZpbmQoKHdpbikgPT4ge1xuICAgICAgICAgIGNvbnN0IGlzRGVzdHJveWVkID0gYXNSZWNvcmQod2luKT8uaXNEZXN0cm95ZWQ7XG4gICAgICAgICAgcmV0dXJuIHR5cGVvZiBpc0Rlc3Ryb3llZCAhPT0gXCJmdW5jdGlvblwiIHx8ICFpc0Rlc3Ryb3llZC5jYWxsKHdpbik7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gd2luZG93U2FtcGxlRnJvbShsaXZlID8/IG51bGwpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH0sXG4gICAgaW5zcGVjdEJyb3dzZXJWaWV3OiAoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBmcm9tQ3RvciA9IHZpZXdTYW1wbGVGcm9tQ29uc3RydWN0b3IoQnJvd3NlclZpZXcpO1xuICAgICAgICBpZiAoZnJvbUN0b3I/LndlYkNvbnRlbnRzVmlldykgcmV0dXJuIGZyb21DdG9yO1xuICAgICAgICBjb25zdCB3aW5kb3dzID0gQnJvd3NlcldpbmRvdz8uZ2V0QWxsV2luZG93cz8uKCkgPz8gW107XG4gICAgICAgIGZvciAoY29uc3Qgd2luIG9mIHdpbmRvd3MpIHtcbiAgICAgICAgICBjb25zdCB2aWV3cyA9IGFzUmVjb3JkKHdpbik/LmdldEJyb3dzZXJWaWV3cztcbiAgICAgICAgICBpZiAodHlwZW9mIHZpZXdzICE9PSBcImZ1bmN0aW9uXCIpIGNvbnRpbnVlO1xuICAgICAgICAgIGNvbnN0IGxpc3RlZCA9IHZpZXdzLmNhbGwod2luKTtcbiAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobGlzdGVkKSkgY29udGludWU7XG4gICAgICAgICAgZm9yIChjb25zdCB2aWV3IG9mIGxpc3RlZCkge1xuICAgICAgICAgICAgY29uc3Qgc2FtcGxlID0gdmlld1NhbXBsZUZyb21JbnN0YW5jZSh2aWV3KTtcbiAgICAgICAgICAgIGlmIChzYW1wbGU/LndlYkNvbnRlbnRzVmlldykgcmV0dXJuIHNhbXBsZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZyb21DdG9yO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiB2aWV3U2FtcGxlRnJvbUNvbnN0cnVjdG9yKEJyb3dzZXJWaWV3KTtcbiAgICAgIH1cbiAgICB9LFxuICB9O1xufVxuXG5mdW5jdGlvbiBzdXBwb3J0RnJvbShcbiAgcnVudGltZVR5cGU6IENvZGV4UnVudGltZVR5cGUsXG4gIGVsZWN0cm9uQ29tcGF0aWJsZTogYm9vbGVhbixcbiAgcHJlbG9hZDogUnVudGltZUNvbXBhdGliaWxpdHlTbmFwc2hvdFtcInByZWxvYWRcIl0sXG4gIHdpbmRvd3M6IFJ1bnRpbWVDb21wYXRpYmlsaXR5U25hcHNob3RbXCJ3aW5kb3dzXCJdLFxuICB2aWV3czogUnVudGltZUNvbXBhdGliaWxpdHlTbmFwc2hvdFtcInZpZXdzXCJdLFxuKTogUnVudGltZUNvbXBhdGliaWxpdHlTbmFwc2hvdFtcInN1cHBvcnRcIl0ge1xuICBjb25zdCByZWFzb25zOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBoYXNVc2VmdWxDYXBhYmlsaXR5ID1cbiAgICB3aW5kb3dzLndpbmRvd1NlcnZpY2VzIHx8XG4gICAgd2luZG93cy5jcmVhdGVXaW5kb3cgfHxcbiAgICBwcmVsb2FkLnJlZ2lzdGVyUHJlbG9hZFNjcmlwdCB8fFxuICAgIHByZWxvYWQuc2V0UHJlbG9hZHNGYWxsYmFjayB8fFxuICAgIHZpZXdzLmJyb3dzZXJWaWV3IHx8XG4gICAgdmlld3MucHJpdmF0ZVZpZXdUcmVlIHx8XG4gICAgZWxlY3Ryb25Db21wYXRpYmxlO1xuXG4gIGlmIChydW50aW1lVHlwZSA9PT0gXCJ1bmtub3duXCIgJiYgIWhhc1VzZWZ1bENhcGFiaWxpdHkpIHtcbiAgICByZXR1cm4geyBsZXZlbDogXCJ1bmtub3duXCIsIHJlYXNvbnM6IFtcInJ1bnRpbWUgdHlwZSBhbmQgY2FwYWJpbGl0aWVzIGNvdWxkIG5vdCBiZSBkZXRlcm1pbmVkXCJdIH07XG4gIH1cbiAgaWYgKHJ1bnRpbWVUeXBlID09PSBcInVua25vd25cIiAmJiBoYXNVc2VmdWxDYXBhYmlsaXR5KSB7XG4gICAgcmVhc29ucy5wdXNoKFwicnVudGltZSB0eXBlIGNvdWxkIG5vdCBiZSBkZXRlcm1pbmVkXCIpO1xuICB9XG5cbiAgaWYgKCF3aW5kb3dzLndpbmRvd1NlcnZpY2VzKSByZWFzb25zLnB1c2goXCJ3aW5kb3cgc2VydmljZXMgdW5hdmFpbGFibGVcIik7XG4gIGlmICghd2luZG93cy5jcmVhdGVXaW5kb3cpIHJlYXNvbnMucHVzaChcImNyZWF0ZVdpbmRvdyB1bmF2YWlsYWJsZVwiKTtcbiAgaWYgKCFwcmVsb2FkLnJlZ2lzdGVyUHJlbG9hZFNjcmlwdCAmJiBwcmVsb2FkLnNldFByZWxvYWRzRmFsbGJhY2spIHtcbiAgICByZWFzb25zLnB1c2goXCJyZWdpc3RlclByZWxvYWRTY3JpcHQgbWlzc2luZzsgdXNpbmcgc2V0UHJlbG9hZHMgZmFsbGJhY2tcIik7XG4gIH0gZWxzZSBpZiAoIXByZWxvYWQucmVnaXN0ZXJQcmVsb2FkU2NyaXB0ICYmICFwcmVsb2FkLnNldFByZWxvYWRzRmFsbGJhY2spIHtcbiAgICByZWFzb25zLnB1c2goXCJubyBzZXNzaW9uIHByZWxvYWQgcmVnaXN0cmF0aW9uIEFQSVwiKTtcbiAgfVxuICBpZiAoIXZpZXdzLnByaXZhdGVWaWV3VHJlZSAmJiB2aWV3cy5icm93c2VyVmlldykge1xuICAgIHJlYXNvbnMucHVzaChcInByaXZhdGUgY29udGVudFZpZXcgdW5hdmFpbGFibGU7IHVzaW5nIEJyb3dzZXJWaWV3IGZhbGxiYWNrXCIpO1xuICB9IGVsc2UgaWYgKCF2aWV3cy5wcml2YXRlVmlld1RyZWUgJiYgIXZpZXdzLmJyb3dzZXJWaWV3KSB7XG4gICAgcmVhc29ucy5wdXNoKFwibm8gdmlldyBhdHRhY2htZW50IHN1cmZhY2VcIik7XG4gIH1cblxuICBjb25zdCB1c2luZ0ZhbGxiYWNrID1cbiAgICAoIXByZWxvYWQucmVnaXN0ZXJQcmVsb2FkU2NyaXB0ICYmIHByZWxvYWQuc2V0UHJlbG9hZHNGYWxsYmFjaykgfHxcbiAgICAoIXZpZXdzLnByaXZhdGVWaWV3VHJlZSAmJiB2aWV3cy5icm93c2VyVmlldykgfHxcbiAgICBydW50aW1lVHlwZSA9PT0gXCJlbGVjdHJvblwiIHx8XG4gICAgIXdpbmRvd3Mud2luZG93U2VydmljZXMgfHxcbiAgICAhd2luZG93cy5jcmVhdGVXaW5kb3c7XG5cbiAgaWYgKHJ1bnRpbWVUeXBlID09PSBcInVua25vd25cIikge1xuICAgIHJldHVybiB7IGxldmVsOiBcInVua25vd25cIiwgcmVhc29ucyB9O1xuICB9XG4gIGlmICh1c2luZ0ZhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHsgbGV2ZWw6IFwiZGVncmFkZWRcIiwgcmVhc29ucyB9O1xuICB9XG4gIHJldHVybiB7IGxldmVsOiBcInN1cHBvcnRlZFwiLCByZWFzb25zOiBbXSB9O1xufVxuXG5mdW5jdGlvbiBkZXRlY3RSdW50aW1lVHlwZShlbnY6IFJ1bnRpbWVQcm9iZUVudik6IENvZGV4UnVudGltZVR5cGUge1xuICBjb25zdCBwbGF0Zm9ybSA9IGVudi5wbGF0Zm9ybSA/PyBwcm9jZXNzLnBsYXRmb3JtO1xuICBjb25zdCBleGlzdHMgPSBlbnYuZXhpc3RzU3luYyA/PyBleGlzdHNTeW5jO1xuICBjb25zdCByZXNvdXJjZXNQYXRoID0gZW52LnJlc291cmNlc1BhdGggPz8gbnVsbDtcbiAgaWYgKHBsYXRmb3JtID09PSBcImRhcndpblwiKSB7XG4gICAgY29uc3QgYXBwUm9vdCA9IGluZmVyTWFjQXBwUm9vdChlbnYuZXhlY1BhdGggPz8gcHJvY2Vzcy5leGVjUGF0aCk7XG4gICAgaWYgKGFwcFJvb3QgJiYgZXhpc3RzKGpvaW4oYXBwUm9vdCwgXCJDb250ZW50c1wiLCBcIkZyYW1ld29ya3NcIiwgXCJDb2RleCBGcmFtZXdvcmsuZnJhbWV3b3JrXCIpKSkge1xuICAgICAgcmV0dXJuIFwib3dsXCI7XG4gICAgfVxuICAgIGlmIChhcHBSb290ICYmIGV4aXN0cyhqb2luKGFwcFJvb3QsIFwiQ29udGVudHNcIiwgXCJGcmFtZXdvcmtzXCIsIFwiRWxlY3Ryb24gRnJhbWV3b3JrLmZyYW1ld29ya1wiKSkpIHtcbiAgICAgIHJldHVybiBcImVsZWN0cm9uXCI7XG4gICAgfVxuICAgIGlmIChyZXNvdXJjZXNQYXRoICYmIGV4aXN0cyhqb2luKHJlc291cmNlc1BhdGgsIFwiYXBwLmFzYXJcIikpKSB7XG4gICAgICByZXR1cm4gXCJlbGVjdHJvblwiO1xuICAgIH1cbiAgICByZXR1cm4gXCJ1bmtub3duXCI7XG4gIH1cbiAgcmV0dXJuIHJlc291cmNlc1BhdGggJiYgZXhpc3RzKGpvaW4ocmVzb3VyY2VzUGF0aCwgXCJhcHAuYXNhclwiKSkgPyBcImVsZWN0cm9uXCIgOiBcInVua25vd25cIjtcbn1cblxuZnVuY3Rpb24gaW5mZXJNYWNBcHBSb290KGV4ZWNQYXRoOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgbWFya2VyID0gXCIuYXBwL0NvbnRlbnRzL01hY09TL1wiO1xuICBjb25zdCBpZHggPSBleGVjUGF0aC5pbmRleE9mKG1hcmtlcik7XG4gIHJldHVybiBpZHggPj0gMCA/IGV4ZWNQYXRoLnNsaWNlKDAsIGlkeCArIFwiLmFwcFwiLmxlbmd0aCkgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBzYWZlQXBwUGF0aChlbnY6IFJ1bnRpbWVQcm9iZUVudik6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBmcm9tQXBwID0gc2FmZUNhbGwoKCkgPT4gZW52LmFwcD8uZ2V0QXBwUGF0aD8uKCkpO1xuICBpZiAoZnJvbUFwcCkgcmV0dXJuIGZyb21BcHA7XG4gIHJldHVybiBlbnYucmVzb3VyY2VzUGF0aCA/IGpvaW4oZW52LnJlc291cmNlc1BhdGgsIFwiYXBwLmFzYXJcIikgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBzYWZlQnVpbGRGbGF2b3IoZW52OiBSdW50aW1lUHJvYmVFbnYsIGFwcFBhdGg6IHN0cmluZyB8IG51bGwpOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKCFhcHBQYXRoKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgcGFyZW50ID0gZGlybmFtZShhcHBQYXRoKTtcbiAgaWYgKHBhcmVudC5pbmNsdWRlcyhcIk5pZ2h0bHlcIikpIHJldHVybiBcIm5pZ2h0bHlcIjtcbiAgaWYgKHR5cGVvZiBlbnYuYXBwPy5pc1BhY2thZ2VkID09PSBcImJvb2xlYW5cIikgcmV0dXJuIGVudi5hcHAuaXNQYWNrYWdlZCA/IFwicHJvZFwiIDogXCJkZXZcIjtcbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXNzaW9uRnJvbShlbnY6IFJ1bnRpbWVQcm9iZUVudik6IFByb2JlU2Vzc2lvbkFkYXB0ZXIgfCBudWxsIHtcbiAgY29uc3Qgc2Vzc2lvbiA9IGVudi5zZXNzaW9uIGFzIHsgZGVmYXVsdFNlc3Npb24/OiBQcm9iZVNlc3Npb25BZGFwdGVyIH0gfCBQcm9iZVNlc3Npb25BZGFwdGVyIHwgbnVsbCB8IHVuZGVmaW5lZDtcbiAgaWYgKCFzZXNzaW9uKSByZXR1cm4gbnVsbDtcbiAgaWYgKFwiZGVmYXVsdFNlc3Npb25cIiBpbiBzZXNzaW9uKSByZXR1cm4gYXNSZWNvcmQoc2Vzc2lvbi5kZWZhdWx0U2Vzc2lvbikgYXMgUHJvYmVTZXNzaW9uQWRhcHRlciB8IG51bGw7XG4gIHJldHVybiBhc1JlY29yZChzZXNzaW9uKSBhcyBQcm9iZVNlc3Npb25BZGFwdGVyIHwgbnVsbDtcbn1cblxuZnVuY3Rpb24gd2luZG93U2FtcGxlVG9QYXJlbnQoc2FtcGxlOiBQcm9iZVdpbmRvd1NhbXBsZSB8IG51bGwpOiB1bmtub3duIHtcbiAgaWYgKCFzYW1wbGUpIHJldHVybiBudWxsO1xuICByZXR1cm4ge1xuICAgIGFkZEJyb3dzZXJWaWV3OiBzYW1wbGUuYWRkQnJvd3NlclZpZXcsXG4gICAgY29udGVudFZpZXc6IHNhbXBsZS5jb250ZW50VmlldyA/PyAoXG4gICAgICBzYW1wbGUuYWRkQ2hpbGRWaWV3IHx8IHNhbXBsZS5yZW1vdmVDaGlsZFZpZXdcbiAgICAgICAgPyB7IGFkZENoaWxkVmlldzogc2FtcGxlLmFkZENoaWxkVmlldywgcmVtb3ZlQ2hpbGRWaWV3OiBzYW1wbGUucmVtb3ZlQ2hpbGRWaWV3IH1cbiAgICAgICAgOiB1bmRlZmluZWRcbiAgICApLFxuICB9O1xufVxuXG5mdW5jdGlvbiB2aWV3U2FtcGxlVG9WaWV3KHNhbXBsZTogUHJvYmVWaWV3U2FtcGxlIHwgbnVsbCk6IHVua25vd24ge1xuICBpZiAoIXNhbXBsZSkgcmV0dXJuIG51bGw7XG4gIHJldHVybiB7XG4gICAgd2ViQ29udGVudHNWaWV3OiBzYW1wbGUud2ViQ29udGVudHNWaWV3ID8/IChzYW1wbGUuc2V0Qm91bmRzID8geyBzZXRCb3VuZHM6IHNhbXBsZS5zZXRCb3VuZHMgfSA6IHVuZGVmaW5lZCksXG4gICAgc2V0Qm91bmRzOiBzYW1wbGUuc2V0Qm91bmRzLFxuICB9O1xufVxuXG5mdW5jdGlvbiB2aWV3U2FtcGxlRnJvbUluc3RhbmNlKHZpZXc6IHVua25vd24pOiBQcm9iZVZpZXdTYW1wbGUgfCBudWxsIHtcbiAgY29uc3QgcmVjID0gYXNSZWNvcmQodmlldyk7XG4gIGlmICghcmVjKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHtcbiAgICBwcmVzZW50OiB0cnVlLFxuICAgIHdlYkNvbnRlbnRzVmlldzogcmVjLndlYkNvbnRlbnRzVmlldyxcbiAgICBzZXRCb3VuZHM6IGFzUmVjb3JkKHJlYy53ZWJDb250ZW50c1ZpZXcpPy5zZXRCb3VuZHMgPz8gcmVjLnNldEJvdW5kcyxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdE5hdGl2ZUNhcGFiaWxpdGllcyhwbGF0Zm9ybTogTm9kZUpTLlBsYXRmb3JtKTogQ29kZXhSdW50aW1lQ2FwYWJpbGl0aWVzW1wibmF0aXZlXCJdIHtcbiAgcmV0dXJuIHtcbiAgICBpblByb2Nlc3NNb2R1bGVzOiB0cnVlLFxuICAgIHN3aWZ0TW9kdWxlczogcGxhdGZvcm0gPT09IFwiZGFyd2luXCIsXG4gICAgYXBwS2l0RW1iZWRkaW5nOiBmYWxzZSxcbiAgICBjaGlsZFdpbmRvd092ZXJsYXk6IGZhbHNlLFxuICAgIGRpcmVjdFZpZXdBdHRhY2g6IGZhbHNlLFxuICAgIG1ldGFsVmlld3M6IGZhbHNlLFxuICAgIG5hdGl2ZUhvc3Q6IGZhbHNlLFxuICAgIGhlbHBlcnM6IHRydWUsXG4gIH07XG59XG5cbmZ1bmN0aW9uIHBhcnNlQ2RwUG9ydCh2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkKTogbnVtYmVyIHtcbiAgY29uc3QgcGFyc2VkID0gTnVtYmVyKHZhbHVlID8/IFwiOTIyMlwiKTtcbiAgcmV0dXJuIE51bWJlci5pc0ludGVnZXIocGFyc2VkKSAmJiBwYXJzZWQgPiAwICYmIHBhcnNlZCA8IDY1NTM2ID8gcGFyc2VkIDogOTIyMjtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplQ2RwVGFyZ2V0KHJvdzogdW5rbm93bik6IENvZGV4Q2RwVGFyZ2V0IHwgbnVsbCB7XG4gIGNvbnN0IHZhbHVlID0gYXNSZWNvcmQocm93KTtcbiAgaWYgKCF2YWx1ZSB8fCB0eXBlb2YgdmFsdWUuaWQgIT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIHZhbHVlLnR5cGUgIT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIHZhbHVlLnVybCAhPT0gXCJzdHJpbmdcIikge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiB7XG4gICAgaWQ6IHZhbHVlLmlkLFxuICAgIHR5cGU6IHZhbHVlLnR5cGUsXG4gICAgdXJsOiB2YWx1ZS51cmwsXG4gICAgLi4uKHR5cGVvZiB2YWx1ZS50aXRsZSA9PT0gXCJzdHJpbmdcIiA/IHsgdGl0bGU6IHZhbHVlLnRpdGxlIH0gOiB7fSksXG4gICAgLi4uKHR5cGVvZiB2YWx1ZS53ZWJTb2NrZXREZWJ1Z2dlclVybCA9PT0gXCJzdHJpbmdcIlxuICAgICAgPyB7IHdlYlNvY2tldERlYnVnZ2VyVXJsOiB2YWx1ZS53ZWJTb2NrZXREZWJ1Z2dlclVybCB9XG4gICAgICA6IHt9KSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gdHJ5UmVxdWlyZUVsZWN0cm9uKCk6IHtcbiAgYXBwPzogUHJvYmVBcHBBZGFwdGVyO1xuICBzZXNzaW9uPzogeyBkZWZhdWx0U2Vzc2lvbj86IFByb2JlU2Vzc2lvbkFkYXB0ZXIgfTtcbiAgQnJvd3NlcldpbmRvdz86IFJ1bnRpbWVQcm9iZUVudltcImJyb3dzZXJXaW5kb3dcIl07XG4gIEJyb3dzZXJWaWV3PzogdW5rbm93bjtcbn0gfCBudWxsIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gcmVxdWlyZShcImVsZWN0cm9uXCIpIGFzIHtcbiAgICAgIGFwcD86IFByb2JlQXBwQWRhcHRlcjtcbiAgICAgIHNlc3Npb24/OiB7IGRlZmF1bHRTZXNzaW9uPzogUHJvYmVTZXNzaW9uQWRhcHRlciB9O1xuICAgICAgQnJvd3NlcldpbmRvdz86IFJ1bnRpbWVQcm9iZUVudltcImJyb3dzZXJXaW5kb3dcIl07XG4gICAgICBCcm93c2VyVmlldz86IHVua25vd247XG4gICAgfTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2FmZUNhbGw8VD4oZm46ICgpID0+IFQpOiBUIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgY29uc3QgdmFsdWUgPSBmbigpO1xuICAgIHJldHVybiB2YWx1ZSA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IHZhbHVlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0ZuKHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFzUmVjb3JkKHZhbHVlOiB1bmtub3duKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsIHtcbiAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiA/IHZhbHVlIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IDogbnVsbDtcbn1cbiIsICJpbXBvcnQgeyBleGVjRmlsZVN5bmMgfSBmcm9tIFwibm9kZTpjaGlsZF9wcm9jZXNzXCI7XG5pbXBvcnQgeyBleGlzdHNTeW5jLCByZWFkRmlsZVN5bmMgfSBmcm9tIFwibm9kZTpmc1wiO1xuaW1wb3J0IHsgaG9tZWRpciwgcGxhdGZvcm0gfSBmcm9tIFwibm9kZTpvc1wiO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gXCJub2RlOnBhdGhcIjtcbmltcG9ydCB7IGlzTGF5ZXJBdXRvVXBkYXRlRW5hYmxlZCB9IGZyb20gXCIuL2lwYy1ndWFyZFwiO1xuXG50eXBlIENoZWNrU3RhdHVzID0gXCJva1wiIHwgXCJ3YXJuXCIgfCBcImVycm9yXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2F0Y2hlckhlYWx0aENoZWNrIHtcbiAgbmFtZTogc3RyaW5nO1xuICBzdGF0dXM6IENoZWNrU3RhdHVzO1xuICBkZXRhaWw6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXYXRjaGVySGVhbHRoIHtcbiAgY2hlY2tlZEF0OiBzdHJpbmc7XG4gIHN0YXR1czogQ2hlY2tTdGF0dXM7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIHN1bW1hcnk6IHN0cmluZztcbiAgd2F0Y2hlcjogc3RyaW5nO1xuICBjaGVja3M6IFdhdGNoZXJIZWFsdGhDaGVja1tdO1xufVxuXG5pbnRlcmZhY2UgSW5zdGFsbGVyU3RhdGUge1xuICBhcHBSb290Pzogc3RyaW5nO1xuICB2ZXJzaW9uPzogc3RyaW5nO1xuICB3YXRjaGVyPzogXCJsYXVuY2hkXCIgfCBcImxvZ2luLWl0ZW1cIiB8IFwic2NoZWR1bGVkLXRhc2tcIiB8IFwic3lzdGVtZFwiIHwgXCJub25lXCI7XG59XG5cbmludGVyZmFjZSBSdW50aW1lQ29uZmlnIHtcbiAgY29kZXhQbHVzUGx1cz86IHtcbiAgICBhdXRvVXBkYXRlPzogYm9vbGVhbjtcbiAgfTtcbn1cblxuaW50ZXJmYWNlIFNlbGZVcGRhdGVTdGF0ZSB7XG4gIHN0YXR1cz86IFwiY2hlY2tpbmdcIiB8IFwidXAtdG8tZGF0ZVwiIHwgXCJ1cGRhdGVkXCIgfCBcImZhaWxlZFwiIHwgXCJkaXNhYmxlZFwiO1xuICBjb21wbGV0ZWRBdD86IHN0cmluZztcbiAgY2hlY2tlZEF0Pzogc3RyaW5nO1xuICBsYXRlc3RWZXJzaW9uPzogc3RyaW5nIHwgbnVsbDtcbiAgZXJyb3I/OiBzdHJpbmc7XG59XG5cbmNvbnN0IExBVU5DSERfTEFCRUwgPSBcImNvbS5jb2RleHBsdXNwbHVzLndhdGNoZXJcIjtcbmNvbnN0IFdBVENIRVJfTE9HID0gam9pbihob21lZGlyKCksIFwiTGlicmFyeVwiLCBcIkxvZ3NcIiwgXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyLmxvZ1wiKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFdhdGNoZXJIZWFsdGgodXNlclJvb3Q6IHN0cmluZyk6IFdhdGNoZXJIZWFsdGgge1xuICBjb25zdCBjaGVja3M6IFdhdGNoZXJIZWFsdGhDaGVja1tdID0gW107XG4gIGNvbnN0IHN0YXRlID0gcmVhZEpzb248SW5zdGFsbGVyU3RhdGU+KGpvaW4odXNlclJvb3QsIFwic3RhdGUuanNvblwiKSk7XG4gIGNvbnN0IGNvbmZpZyA9IHJlYWRKc29uPFJ1bnRpbWVDb25maWc+KGpvaW4odXNlclJvb3QsIFwiY29uZmlnLmpzb25cIikpID8/IHt9O1xuICBjb25zdCBzZWxmVXBkYXRlID0gcmVhZEpzb248U2VsZlVwZGF0ZVN0YXRlPihqb2luKHVzZXJSb290LCBcInNlbGYtdXBkYXRlLXN0YXRlLmpzb25cIikpO1xuXG4gIGNoZWNrcy5wdXNoKHtcbiAgICBuYW1lOiBcIkluc3RhbGwgc3RhdGVcIixcbiAgICBzdGF0dXM6IHN0YXRlID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgIGRldGFpbDogc3RhdGUgPyBgQ29kZXgrKyAke3N0YXRlLnZlcnNpb24gPz8gXCIodW5rbm93biB2ZXJzaW9uKVwifWAgOiBcInN0YXRlLmpzb24gaXMgbWlzc2luZ1wiLFxuICB9KTtcblxuICBpZiAoIXN0YXRlKSByZXR1cm4gc3VtbWFyaXplKFwibm9uZVwiLCBjaGVja3MpO1xuXG4gIGNvbnN0IGF1dG9VcGRhdGUgPSBpc0xheWVyQXV0b1VwZGF0ZUVuYWJsZWQoY29uZmlnLmNvZGV4UGx1c1BsdXM/LmF1dG9VcGRhdGUpO1xuICBjaGVja3MucHVzaCh7XG4gICAgbmFtZTogXCJMYXllciBzZWxmLXVwZGF0ZVwiLFxuICAgIHN0YXR1czogYXV0b1VwZGF0ZSA/IFwib2tcIiA6IFwid2FyblwiLFxuICAgIGRldGFpbDogYXV0b1VwZGF0ZSA/IFwiZW5hYmxlZFwiIDogXCJkaXNhYmxlZCAob3B0LWluOyBkZWZhdWx0IG9mZilcIixcbiAgfSk7XG5cbiAgY2hlY2tzLnB1c2goe1xuICAgIG5hbWU6IFwiV2F0Y2hlciBraW5kXCIsXG4gICAgc3RhdHVzOiBzdGF0ZS53YXRjaGVyICYmIHN0YXRlLndhdGNoZXIgIT09IFwibm9uZVwiID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgIGRldGFpbDogc3RhdGUud2F0Y2hlciA/PyBcIm5vbmVcIixcbiAgfSk7XG5cbiAgaWYgKHNlbGZVcGRhdGUpIHtcbiAgICBjaGVja3MucHVzaChzZWxmVXBkYXRlQ2hlY2soc2VsZlVwZGF0ZSkpO1xuICB9XG5cbiAgY29uc3QgYXBwUm9vdCA9IHN0YXRlLmFwcFJvb3QgPz8gXCJcIjtcbiAgY2hlY2tzLnB1c2goe1xuICAgIG5hbWU6IFwiQ29kZXggYXBwXCIsXG4gICAgc3RhdHVzOiBhcHBSb290ICYmIGV4aXN0c1N5bmMoYXBwUm9vdCkgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgZGV0YWlsOiBhcHBSb290IHx8IFwibWlzc2luZyBhcHBSb290IGluIHN0YXRlXCIsXG4gIH0pO1xuXG4gIHN3aXRjaCAocGxhdGZvcm0oKSkge1xuICAgIGNhc2UgXCJkYXJ3aW5cIjpcbiAgICAgIGNoZWNrcy5wdXNoKC4uLmNoZWNrTGF1bmNoZFdhdGNoZXIoYXBwUm9vdCkpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBcImxpbnV4XCI6XG4gICAgICBjaGVja3MucHVzaCguLi5jaGVja1N5c3RlbWRXYXRjaGVyKGFwcFJvb3QpKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgXCJ3aW4zMlwiOlxuICAgICAgY2hlY2tzLnB1c2goLi4uY2hlY2tTY2hlZHVsZWRUYXNrV2F0Y2hlcigpKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBjaGVja3MucHVzaCh7XG4gICAgICAgIG5hbWU6IFwiUGxhdGZvcm0gd2F0Y2hlclwiLFxuICAgICAgICBzdGF0dXM6IFwid2FyblwiLFxuICAgICAgICBkZXRhaWw6IGB1bnN1cHBvcnRlZCBwbGF0Zm9ybTogJHtwbGF0Zm9ybSgpfWAsXG4gICAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBzdW1tYXJpemUoc3RhdGUud2F0Y2hlciA/PyBcIm5vbmVcIiwgY2hlY2tzKTtcbn1cblxuZnVuY3Rpb24gc2VsZlVwZGF0ZUNoZWNrKHN0YXRlOiBTZWxmVXBkYXRlU3RhdGUpOiBXYXRjaGVySGVhbHRoQ2hlY2sge1xuICBjb25zdCBhdCA9IHN0YXRlLmNvbXBsZXRlZEF0ID8/IHN0YXRlLmNoZWNrZWRBdCA/PyBcInVua25vd24gdGltZVwiO1xuICBpZiAoc3RhdGUuc3RhdHVzID09PSBcImZhaWxlZFwiKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IFwibGFzdCBDb2RleCsrIHVwZGF0ZVwiLFxuICAgICAgc3RhdHVzOiBcIndhcm5cIixcbiAgICAgIGRldGFpbDogc3RhdGUuZXJyb3IgPyBgZmFpbGVkICR7YXR9OiAke3N0YXRlLmVycm9yfWAgOiBgZmFpbGVkICR7YXR9YCxcbiAgICB9O1xuICB9XG4gIGlmIChzdGF0ZS5zdGF0dXMgPT09IFwiZGlzYWJsZWRcIikge1xuICAgIHJldHVybiB7IG5hbWU6IFwibGFzdCBDb2RleCsrIHVwZGF0ZVwiLCBzdGF0dXM6IFwid2FyblwiLCBkZXRhaWw6IGBza2lwcGVkICR7YXR9OiBMYXllciBzZWxmLXVwZGF0ZSBkaXNhYmxlZGAgfTtcbiAgfVxuICBpZiAoc3RhdGUuc3RhdHVzID09PSBcInVwZGF0ZWRcIikge1xuICAgIHJldHVybiB7IG5hbWU6IFwibGFzdCBDb2RleCsrIHVwZGF0ZVwiLCBzdGF0dXM6IFwib2tcIiwgZGV0YWlsOiBgdXBkYXRlZCAke2F0fSB0byAke3N0YXRlLmxhdGVzdFZlcnNpb24gPz8gXCJuZXcgcmVsZWFzZVwifWAgfTtcbiAgfVxuICBpZiAoc3RhdGUuc3RhdHVzID09PSBcInVwLXRvLWRhdGVcIikge1xuICAgIHJldHVybiB7IG5hbWU6IFwibGFzdCBDb2RleCsrIHVwZGF0ZVwiLCBzdGF0dXM6IFwib2tcIiwgZGV0YWlsOiBgdXAgdG8gZGF0ZSAke2F0fWAgfTtcbiAgfVxuICByZXR1cm4geyBuYW1lOiBcImxhc3QgQ29kZXgrKyB1cGRhdGVcIiwgc3RhdHVzOiBcIndhcm5cIiwgZGV0YWlsOiBgY2hlY2tpbmcgc2luY2UgJHthdH1gIH07XG59XG5cbmZ1bmN0aW9uIGNoZWNrTGF1bmNoZFdhdGNoZXIoYXBwUm9vdDogc3RyaW5nKTogV2F0Y2hlckhlYWx0aENoZWNrW10ge1xuICBjb25zdCBjaGVja3M6IFdhdGNoZXJIZWFsdGhDaGVja1tdID0gW107XG4gIGNvbnN0IHBsaXN0UGF0aCA9IGpvaW4oaG9tZWRpcigpLCBcIkxpYnJhcnlcIiwgXCJMYXVuY2hBZ2VudHNcIiwgYCR7TEFVTkNIRF9MQUJFTH0ucGxpc3RgKTtcbiAgY29uc3QgcGxpc3QgPSBleGlzdHNTeW5jKHBsaXN0UGF0aCkgPyByZWFkRmlsZVNhZmUocGxpc3RQYXRoKSA6IFwiXCI7XG4gIGNvbnN0IGFzYXJQYXRoID0gYXBwUm9vdCA/IGpvaW4oYXBwUm9vdCwgXCJDb250ZW50c1wiLCBcIlJlc291cmNlc1wiLCBcImFwcC5hc2FyXCIpIDogXCJcIjtcblxuICBjaGVja3MucHVzaCh7XG4gICAgbmFtZTogXCJsYXVuY2hkIHBsaXN0XCIsXG4gICAgc3RhdHVzOiBwbGlzdCA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICBkZXRhaWw6IHBsaXN0UGF0aCxcbiAgfSk7XG5cbiAgaWYgKHBsaXN0KSB7XG4gICAgY2hlY2tzLnB1c2goe1xuICAgICAgbmFtZTogXCJsYXVuY2hkIGxhYmVsXCIsXG4gICAgICBzdGF0dXM6IHBsaXN0LmluY2x1ZGVzKExBVU5DSERfTEFCRUwpID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgICAgZGV0YWlsOiBMQVVOQ0hEX0xBQkVMLFxuICAgIH0pO1xuICAgIGNoZWNrcy5wdXNoKHtcbiAgICAgIG5hbWU6IFwibGF1bmNoZCB0cmlnZ2VyXCIsXG4gICAgICBzdGF0dXM6IGFzYXJQYXRoICYmIHBsaXN0LmluY2x1ZGVzKGFzYXJQYXRoKSA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICAgIGRldGFpbDogYXNhclBhdGggfHwgXCJtaXNzaW5nIGFwcFJvb3RcIixcbiAgICB9KTtcbiAgICBjaGVja3MucHVzaCh7XG4gICAgICBuYW1lOiBcIndhdGNoZXIgY29tbWFuZFwiLFxuICAgICAgc3RhdHVzOiBwbGlzdC5pbmNsdWRlcyhcIkNPREVYX1BMVVNQTFVTX1dBVENIRVI9MVwiKSAmJiBwbGlzdC5pbmNsdWRlcyhcIiB1cGRhdGUgLS13YXRjaGVyIC0tcXVpZXRcIilcbiAgICAgICAgPyBcIm9rXCJcbiAgICAgICAgOiBcImVycm9yXCIsXG4gICAgICBkZXRhaWw6IGNvbW1hbmRTdW1tYXJ5KHBsaXN0KSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNsaVBhdGggPSBleHRyYWN0Rmlyc3QocGxpc3QsIC8nKFteJ10qcGFja2FnZXNcXC9pbnN0YWxsZXJcXC9kaXN0XFwvY2xpXFwuanMpJy8pO1xuICAgIGlmIChjbGlQYXRoKSB7XG4gICAgICBjaGVja3MucHVzaCh7XG4gICAgICAgIG5hbWU6IFwicmVwYWlyIENMSVwiLFxuICAgICAgICBzdGF0dXM6IGV4aXN0c1N5bmMoY2xpUGF0aCkgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgICAgIGRldGFpbDogY2xpUGF0aCxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGxvYWRlZCA9IGNvbW1hbmRTdWNjZWVkcyhcImxhdW5jaGN0bFwiLCBbXCJsaXN0XCIsIExBVU5DSERfTEFCRUxdKTtcbiAgY2hlY2tzLnB1c2goe1xuICAgIG5hbWU6IFwibGF1bmNoZCBsb2FkZWRcIixcbiAgICBzdGF0dXM6IGxvYWRlZCA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICBkZXRhaWw6IGxvYWRlZCA/IFwic2VydmljZSBpcyBsb2FkZWRcIiA6IFwibGF1bmNoY3RsIGNhbm5vdCBmaW5kIHRoZSB3YXRjaGVyXCIsXG4gIH0pO1xuXG4gIGNoZWNrcy5wdXNoKHdhdGNoZXJMb2dDaGVjaygpKTtcbiAgcmV0dXJuIGNoZWNrcztcbn1cblxuZnVuY3Rpb24gY2hlY2tTeXN0ZW1kV2F0Y2hlcihhcHBSb290OiBzdHJpbmcpOiBXYXRjaGVySGVhbHRoQ2hlY2tbXSB7XG4gIGNvbnN0IGRpciA9IGpvaW4oaG9tZWRpcigpLCBcIi5jb25maWdcIiwgXCJzeXN0ZW1kXCIsIFwidXNlclwiKTtcbiAgY29uc3Qgc2VydmljZSA9IGpvaW4oZGlyLCBcImNvZGV4LXBsdXNwbHVzLXdhdGNoZXIuc2VydmljZVwiKTtcbiAgY29uc3QgdGltZXIgPSBqb2luKGRpciwgXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyLnRpbWVyXCIpO1xuICBjb25zdCBwYXRoVW5pdCA9IGpvaW4oZGlyLCBcImNvZGV4LXBsdXNwbHVzLXdhdGNoZXIucGF0aFwiKTtcbiAgY29uc3QgZXhwZWN0ZWRQYXRoID0gYXBwUm9vdCA/IGpvaW4oYXBwUm9vdCwgXCJyZXNvdXJjZXNcIiwgXCJhcHAuYXNhclwiKSA6IFwiXCI7XG4gIGNvbnN0IHBhdGhCb2R5ID0gZXhpc3RzU3luYyhwYXRoVW5pdCkgPyByZWFkRmlsZVNhZmUocGF0aFVuaXQpIDogXCJcIjtcblxuICByZXR1cm4gW1xuICAgIHtcbiAgICAgIG5hbWU6IFwic3lzdGVtZCBzZXJ2aWNlXCIsXG4gICAgICBzdGF0dXM6IGV4aXN0c1N5bmMoc2VydmljZSkgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgICBkZXRhaWw6IHNlcnZpY2UsXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiBcInN5c3RlbWQgdGltZXJcIixcbiAgICAgIHN0YXR1czogZXhpc3RzU3luYyh0aW1lcikgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgICBkZXRhaWw6IHRpbWVyLFxuICAgIH0sXG4gICAge1xuICAgICAgbmFtZTogXCJzeXN0ZW1kIHBhdGhcIixcbiAgICAgIHN0YXR1czogcGF0aEJvZHkgJiYgZXhwZWN0ZWRQYXRoICYmIHBhdGhCb2R5LmluY2x1ZGVzKGV4cGVjdGVkUGF0aCkgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgICBkZXRhaWw6IGV4cGVjdGVkUGF0aCB8fCBwYXRoVW5pdCxcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6IFwicGF0aCB1bml0IGFjdGl2ZVwiLFxuICAgICAgc3RhdHVzOiBjb21tYW5kU3VjY2VlZHMoXCJzeXN0ZW1jdGxcIiwgW1wiLS11c2VyXCIsIFwiaXMtYWN0aXZlXCIsIFwiLS1xdWlldFwiLCBcImNvZGV4LXBsdXNwbHVzLXdhdGNoZXIucGF0aFwiXSkgPyBcIm9rXCIgOiBcIndhcm5cIixcbiAgICAgIGRldGFpbDogXCJzeXN0ZW1jdGwgLS11c2VyIGlzLWFjdGl2ZSBjb2RleC1wbHVzcGx1cy13YXRjaGVyLnBhdGhcIixcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6IFwidGltZXIgYWN0aXZlXCIsXG4gICAgICBzdGF0dXM6IGNvbW1hbmRTdWNjZWVkcyhcInN5c3RlbWN0bFwiLCBbXCItLXVzZXJcIiwgXCJpcy1hY3RpdmVcIiwgXCItLXF1aWV0XCIsIFwiY29kZXgtcGx1c3BsdXMtd2F0Y2hlci50aW1lclwiXSkgPyBcIm9rXCIgOiBcIndhcm5cIixcbiAgICAgIGRldGFpbDogXCJzeXN0ZW1jdGwgLS11c2VyIGlzLWFjdGl2ZSBjb2RleC1wbHVzcGx1cy13YXRjaGVyLnRpbWVyXCIsXG4gICAgfSxcbiAgXTtcbn1cblxuZnVuY3Rpb24gY2hlY2tTY2hlZHVsZWRUYXNrV2F0Y2hlcigpOiBXYXRjaGVySGVhbHRoQ2hlY2tbXSB7XG4gIHJldHVybiBbXG4gICAge1xuICAgICAgbmFtZTogXCJsb2dvbiB0YXNrXCIsXG4gICAgICBzdGF0dXM6IGNvbW1hbmRTdWNjZWVkcyhcInNjaHRhc2tzLmV4ZVwiLCBbXCIvUXVlcnlcIiwgXCIvVE5cIiwgXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyXCJdKSA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICAgIGRldGFpbDogXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyXCIsXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiBcImhvdXJseSB0YXNrXCIsXG4gICAgICBzdGF0dXM6IGNvbW1hbmRTdWNjZWVkcyhcInNjaHRhc2tzLmV4ZVwiLCBbXCIvUXVlcnlcIiwgXCIvVE5cIiwgXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyLWhvdXJseVwiXSkgPyBcIm9rXCIgOiBcIndhcm5cIixcbiAgICAgIGRldGFpbDogXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyLWhvdXJseVwiLFxuICAgIH0sXG4gIF07XG59XG5cbmZ1bmN0aW9uIHdhdGNoZXJMb2dDaGVjaygpOiBXYXRjaGVySGVhbHRoQ2hlY2sge1xuICBpZiAoIWV4aXN0c1N5bmMoV0FUQ0hFUl9MT0cpKSB7XG4gICAgcmV0dXJuIHsgbmFtZTogXCJ3YXRjaGVyIGxvZ1wiLCBzdGF0dXM6IFwid2FyblwiLCBkZXRhaWw6IFwibm8gd2F0Y2hlciBsb2cgeWV0XCIgfTtcbiAgfVxuICBjb25zdCB0YWlsID0gcmVhZEZpbGVTYWZlKFdBVENIRVJfTE9HKS5zcGxpdCgvXFxyP1xcbi8pLnNsaWNlKC00MCkuam9pbihcIlxcblwiKTtcbiAgcmV0dXJuIGFuYWx5emVXYXRjaGVyTG9nVGFpbCh0YWlsKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVXYXRjaGVyTG9nVGFpbCh0YWlsOiBzdHJpbmcpOiBXYXRjaGVySGVhbHRoQ2hlY2sge1xuICBjb25zdCBoYXNFcnJvciA9IC9cdTI3MTcgY29kZXgtcGx1c3BsdXMgZmFpbGVkfGNvZGV4LXBsdXNwbHVzIGZhaWxlZHxlcnJvcnxmYWlsZWQvaS50ZXN0KHRhaWwpO1xuICBjb25zdCBuZWVkc01hbnVhbFJlcGFpciA9XG4gICAgaGFzRXJyb3IgJiZcbiAgICAvQ2Fubm90IHdyaXRlIHRvIC4qQ29kZXguKlxcLmFwcHxBcHAgTWFuYWdlbWVudHxmaWxlIG93bmVyc2hpcHxzdWRvIGNvZGV4cGx1c3BsdXMgKD86aW5zdGFsbHxyZXBhaXIpfEVBQ0NFU3xFUEVSTS9pLnRlc3QodGFpbCk7XG4gIHJldHVybiB7XG4gICAgbmFtZTogXCJ3YXRjaGVyIGxvZ1wiLFxuICAgIHN0YXR1czogaGFzRXJyb3IgPyBcIndhcm5cIiA6IFwib2tcIixcbiAgICBkZXRhaWw6IGhhc0Vycm9yXG4gICAgICA/IG5lZWRzTWFudWFsUmVwYWlyXG4gICAgICAgID8gXCJhdXRvLXJlcGFpciBuZWVkcyBhcHAgcGVybWlzc2lvbnM7IHJ1biBgY29kZXhwbHVzcGx1cyByZXBhaXJgIGZyb20gVGVybWluYWxcIlxuICAgICAgICA6IFwicmVjZW50IHdhdGNoZXIgbG9nIGNvbnRhaW5zIGFuIGVycm9yXCJcbiAgICAgIDogV0FUQ0hFUl9MT0csXG4gIH07XG59XG5cbmZ1bmN0aW9uIHN1bW1hcml6ZSh3YXRjaGVyOiBzdHJpbmcsIGNoZWNrczogV2F0Y2hlckhlYWx0aENoZWNrW10pOiBXYXRjaGVySGVhbHRoIHtcbiAgY29uc3QgaGFzRXJyb3IgPSBjaGVja3Muc29tZSgoYykgPT4gYy5zdGF0dXMgPT09IFwiZXJyb3JcIik7XG4gIGNvbnN0IGhhc1dhcm4gPSBjaGVja3Muc29tZSgoYykgPT4gYy5zdGF0dXMgPT09IFwid2FyblwiKTtcbiAgY29uc3Qgc3RhdHVzOiBDaGVja1N0YXR1cyA9IGhhc0Vycm9yID8gXCJlcnJvclwiIDogaGFzV2FybiA/IFwid2FyblwiIDogXCJva1wiO1xuICBjb25zdCBmYWlsZWQgPSBjaGVja3MuZmlsdGVyKChjKSA9PiBjLnN0YXR1cyA9PT0gXCJlcnJvclwiKS5sZW5ndGg7XG4gIGNvbnN0IHdhcm5lZCA9IGNoZWNrcy5maWx0ZXIoKGMpID0+IGMuc3RhdHVzID09PSBcIndhcm5cIikubGVuZ3RoO1xuICBjb25zdCB0aXRsZSA9XG4gICAgc3RhdHVzID09PSBcIm9rXCJcbiAgICAgID8gXCJBdXRvLXJlcGFpciB3YXRjaGVyIGlzIHJlYWR5XCJcbiAgICAgIDogc3RhdHVzID09PSBcIndhcm5cIlxuICAgICAgICA/IFwiQXV0by1yZXBhaXIgd2F0Y2hlciBuZWVkcyByZXZpZXdcIlxuICAgICAgICA6IFwiQXV0by1yZXBhaXIgd2F0Y2hlciBpcyBub3QgcmVhZHlcIjtcbiAgY29uc3Qgc3VtbWFyeSA9XG4gICAgc3RhdHVzID09PSBcIm9rXCJcbiAgICAgID8gXCJDb2RleCsrIHNob3VsZCBhdXRvbWF0aWNhbGx5IHJlcGFpciBpdHNlbGYgYWZ0ZXIgQ29kZXggdXBkYXRlcy5cIlxuICAgICAgOiBgJHtmYWlsZWR9IGZhaWxpbmcgY2hlY2socyksICR7d2FybmVkfSB3YXJuaW5nKHMpLmA7XG5cbiAgcmV0dXJuIHtcbiAgICBjaGVja2VkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICBzdGF0dXMsXG4gICAgdGl0bGUsXG4gICAgc3VtbWFyeSxcbiAgICB3YXRjaGVyLFxuICAgIGNoZWNrcyxcbiAgfTtcbn1cblxuZnVuY3Rpb24gY29tbWFuZFN1Y2NlZWRzKGNvbW1hbmQ6IHN0cmluZywgYXJnczogc3RyaW5nW10pOiBib29sZWFuIHtcbiAgdHJ5IHtcbiAgICBleGVjRmlsZVN5bmMoY29tbWFuZCwgYXJncywgeyBzdGRpbzogXCJpZ25vcmVcIiwgdGltZW91dDogNV8wMDAgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjb21tYW5kU3VtbWFyeShwbGlzdDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgY29tbWFuZCA9IGV4dHJhY3RGaXJzdChwbGlzdCwgLzxzdHJpbmc+KFtePF0qKD86dXBkYXRlIC0td2F0Y2hlciAtLXF1aWV0fHJlcGFpciAtLXF1aWV0KVtePF0qKTxcXC9zdHJpbmc+Lyk7XG4gIHJldHVybiBjb21tYW5kID8gdW5lc2NhcGVYbWwoY29tbWFuZCkucmVwbGFjZSgvXFxzKy9nLCBcIiBcIikudHJpbSgpIDogXCJ3YXRjaGVyIGNvbW1hbmQgbm90IGZvdW5kXCI7XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RGaXJzdChzb3VyY2U6IHN0cmluZywgcGF0dGVybjogUmVnRXhwKTogc3RyaW5nIHwgbnVsbCB7XG4gIHJldHVybiBzb3VyY2UubWF0Y2gocGF0dGVybik/LlsxXSA/PyBudWxsO1xufVxuXG5mdW5jdGlvbiByZWFkSnNvbjxUPihwYXRoOiBzdHJpbmcpOiBUIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKHBhdGgsIFwidXRmOFwiKSkgYXMgVDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVhZEZpbGVTYWZlKHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHJlYWRGaWxlU3luYyhwYXRoLCBcInV0ZjhcIik7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBcIlwiO1xuICB9XG59XG5cbmZ1bmN0aW9uIHVuZXNjYXBlWG1sKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdmFsdWVcbiAgICAucmVwbGFjZSgvJnF1b3Q7L2csIFwiXFxcIlwiKVxuICAgIC5yZXBsYWNlKC8mYXBvczsvZywgXCInXCIpXG4gICAgLnJlcGxhY2UoLyZsdDsvZywgXCI8XCIpXG4gICAgLnJlcGxhY2UoLyZndDsvZywgXCI+XCIpXG4gICAgLnJlcGxhY2UoLyZhbXA7L2csIFwiJlwiKTtcbn1cbiIsICIvKipcbiAqIFByaXZpbGVnZWQgSVBDIGFsbG93bGlzdGluZy4gR3Vlc3QgQnJvd3NlclZpZXdzLCB3ZWJ2aWV3cywgYW5kIG90aGVyXG4gKiB1bnRydXN0ZWQgZnJhbWVzIG11c3Qgbm90IGludm9rZSBpbnN0YWxsL3NlbGYtdXBkYXRlL25hdGl2ZS9mcy9jbGlwYm9hcmRcbiAqIGhhbmRsZXJzIGV2ZW4gaWYgYSBzZXNzaW9uLWxldmVsIHByZWxvYWQgbGVha2VkIGludG8gdGhlbS5cbiAqL1xuXG5leHBvcnQgY29uc3QgUFJJVklMRUdFRF9JUENfQ0hBTk5FTFMgPSBbXG4gIFwiY29kZXhwcDppbnN0YWxsLXN0b3JlLXR3ZWFrXCIsXG4gIFwiY29kZXhwcDppbnN0YWxsLWdpdGh1Yi10d2Vha1wiLFxuICBcImNvZGV4cHA6cHJlcGFyZS10d2Vhay1zdG9yZS1zdWJtaXNzaW9uXCIsXG4gIFwiY29kZXhwcDpydW4tY29kZXhwcC11cGRhdGVcIixcbiAgXCJjb2RleHBwOnNldC1hdXRvLXVwZGF0ZVwiLFxuICBcImNvZGV4cHA6c2V0LXVwZGF0ZS1jb25maWdcIixcbiAgXCJjb2RleHBwOm5hdGl2ZS1sb2FkLW1vZHVsZVwiLFxuICBcImNvZGV4cHA6bmF0aXZlLW1vZHVsZS1yZXF1ZXN0XCIsXG4gIFwiY29kZXhwcDpuYXRpdmUtbW9kdWxlLWRpc3Bvc2VcIixcbiAgXCJjb2RleHBwOm5hdGl2ZS1jcmVhdGUtcGFuZWxcIixcbiAgXCJjb2RleHBwOm5hdGl2ZS1hdHRhY2gtdmlld1wiLFxuICBcImNvZGV4cHA6bmF0aXZlLWluc3RhbmNlLWNhbGxcIixcbiAgXCJjb2RleHBwOm5hdGl2ZS1sYXVuY2gtaGVscGVyXCIsXG4gIFwiY29kZXhwcDpuYXRpdmUtaGVscGVyLWNhbGxcIixcbiAgXCJjb2RleHBwOmNvZGV4LXdpbmRvdy1jcmVhdGVcIixcbiAgXCJjb2RleHBwOmNvZGV4LXdpbmRvdy1wcmltYXJ5XCIsXG4gIFwiY29kZXhwcDpjb2RleC13aW5kb3ctZm9jdXNcIixcbiAgXCJjb2RleHBwOmNvZGV4LXdpbmRvdy1zaG93XCIsXG4gIFwiY29kZXhwcDpjb2RleC12aWV3LWNyZWF0ZVwiLFxuICBcImNvZGV4cHA6Y29kZXgtdmlldy1jYWxsXCIsXG4gIFwiY29kZXhwcDp0d2Vhay1mc1wiLFxuICBcImNvZGV4cHA6Y29kZXgtc2Vzc2lvbnMtbGlzdFwiLFxuICBcImNvZGV4cHA6Y29kZXgtc2Vzc2lvbnMtc3RhdHVzXCIsXG4gIFwiY29kZXhwcDpjb3B5LXRleHRcIixcbiAgXCJjb2RleHBwOnJldmVhbFwiLFxuXSBhcyBjb25zdDtcblxuZXhwb3J0IHR5cGUgUHJpdmlsZWdlZElwY0NoYW5uZWwgPSAodHlwZW9mIFBSSVZJTEVHRURfSVBDX0NIQU5ORUxTKVtudW1iZXJdO1xuZXhwb3J0IHR5cGUgV2ViQ29udGVudHNUcnVzdCA9IFwicHJpdmlsZWdlZFwiIHwgXCJndWVzdFwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIElwY1NlbmRlckxpa2Uge1xuICBpZDogbnVtYmVyO1xuICBpc0Rlc3Ryb3llZD86ICgpID0+IGJvb2xlYW47XG4gIGdldFR5cGU/OiAoKSA9PiBzdHJpbmc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1ByaXZpbGVnZWRJcGNDaGFubmVsKGNoYW5uZWw6IHN0cmluZyk6IGNoYW5uZWwgaXMgUHJpdmlsZWdlZElwY0NoYW5uZWwge1xuICByZXR1cm4gKFBSSVZJTEVHRURfSVBDX0NIQU5ORUxTIGFzIHJlYWRvbmx5IHN0cmluZ1tdKS5pbmNsdWRlcyhjaGFubmVsKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsYXNzaWZ5SXBjU2VuZGVyKFxuICBzZW5kZXI6IElwY1NlbmRlckxpa2UsXG4gIHVudHJ1c3RlZElkczogUmVhZG9ubHlTZXQ8bnVtYmVyPiA9IG5ldyBTZXQoKSxcbik6IFdlYkNvbnRlbnRzVHJ1c3Qge1xuICBpZiAoc2VuZGVyLmlzRGVzdHJveWVkPy4oKSkgcmV0dXJuIFwiZ3Vlc3RcIjtcbiAgaWYgKHVudHJ1c3RlZElkcy5oYXMoc2VuZGVyLmlkKSkgcmV0dXJuIFwiZ3Vlc3RcIjtcbiAgY29uc3QgdHlwZSA9IHNlbmRlci5nZXRUeXBlPy4oKSA/PyBcIndpbmRvd1wiO1xuICBpZiAodHlwZSA9PT0gXCJ3ZWJ2aWV3XCIgfHwgdHlwZSA9PT0gXCJvZmZzY3JlZW5cIikgcmV0dXJuIFwiZ3Vlc3RcIjtcbiAgaWYgKHR5cGUgPT09IFwid2luZG93XCIgfHwgdHlwZSA9PT0gXCJicm93c2VyVmlld1wiKSByZXR1cm4gXCJwcml2aWxlZ2VkXCI7XG4gIHJldHVybiBcImd1ZXN0XCI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1ByaXZpbGVnZWRJcGNTZW5kZXIoXG4gIHNlbmRlcjogSXBjU2VuZGVyTGlrZSxcbiAgdW50cnVzdGVkSWRzOiBSZWFkb25seVNldDxudW1iZXI+ID0gbmV3IFNldCgpLFxuKTogYm9vbGVhbiB7XG4gIHJldHVybiBjbGFzc2lmeUlwY1NlbmRlcihzZW5kZXIsIHVudHJ1c3RlZElkcykgPT09IFwicHJpdmlsZWdlZFwiO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0UHJpdmlsZWdlZElwY1NlbmRlcihcbiAgY2hhbm5lbDogc3RyaW5nLFxuICBzZW5kZXI6IElwY1NlbmRlckxpa2UsXG4gIHVudHJ1c3RlZElkczogUmVhZG9ubHlTZXQ8bnVtYmVyPiA9IG5ldyBTZXQoKSxcbik6IHZvaWQge1xuICBpZiAoIWlzUHJpdmlsZWdlZElwY1NlbmRlcihzZW5kZXIsIHVudHJ1c3RlZElkcykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGJsb2NrZWQgJHtjaGFubmVsfSBmcm9tIHVudHJ1c3RlZCBmcmFtZWApO1xuICB9XG59XG5cbi8qKiBMYXllciBzZWxmLXVwZGF0ZSBpcyBvcHQtaW4uIE1pc3NpbmcvdW5kZWZpbmVkIG1lYW5zIE9GRi4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0xheWVyQXV0b1VwZGF0ZUVuYWJsZWQodmFsdWU6IGJvb2xlYW4gfCB1bmRlZmluZWQgfCBudWxsKTogYm9vbGVhbiB7XG4gIHJldHVybiB2YWx1ZSA9PT0gdHJ1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwUmVuZGVyZXJVcGRhdGVSZXBvPFQgZXh0ZW5kcyB7IHVwZGF0ZVJlcG8/OiB1bmtub3duIH0+KGNvbmZpZzogVCk6IE9taXQ8VCwgXCJ1cGRhdGVSZXBvXCI+IHtcbiAgY29uc3QgeyB1cGRhdGVSZXBvOiBfaWdub3JlZCwgLi4ucmVzdCB9ID0gY29uZmlnO1xuICByZXR1cm4gcmVzdDtcbn1cbiIsICJleHBvcnQgdHlwZSBUd2Vha1Njb3BlID0gXCJyZW5kZXJlclwiIHwgXCJtYWluXCIgfCBcImJvdGhcIjtcblxuZXhwb3J0IGludGVyZmFjZSBSZWxvYWRUd2Vha3NEZXBzIHtcbiAgbG9nSW5mbyhtZXNzYWdlOiBzdHJpbmcpOiB2b2lkO1xuICBzdG9wQWxsTWFpblR3ZWFrcygpOiB2b2lkO1xuICBjbGVhclR3ZWFrTW9kdWxlQ2FjaGUoKTogdm9pZDtcbiAgbG9hZEFsbE1haW5Ud2Vha3MoKTogdm9pZDtcbiAgYnJvYWRjYXN0UmVsb2FkKCk6IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2V0VHdlYWtFbmFibGVkQW5kUmVsb2FkRGVwcyBleHRlbmRzIFJlbG9hZFR3ZWFrc0RlcHMge1xuICBzZXRUd2Vha0VuYWJsZWQoaWQ6IHN0cmluZywgZW5hYmxlZDogYm9vbGVhbik6IHZvaWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc01haW5Qcm9jZXNzVHdlYWtTY29wZShzY29wZTogVHdlYWtTY29wZSB8IHVuZGVmaW5lZCk6IGJvb2xlYW4ge1xuICByZXR1cm4gc2NvcGUgIT09IFwicmVuZGVyZXJcIjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlbG9hZFR3ZWFrcyhyZWFzb246IHN0cmluZywgZGVwczogUmVsb2FkVHdlYWtzRGVwcyk6IHZvaWQge1xuICBkZXBzLmxvZ0luZm8oYHJlbG9hZGluZyB0d2Vha3MgKCR7cmVhc29ufSlgKTtcbiAgZGVwcy5zdG9wQWxsTWFpblR3ZWFrcygpO1xuICBkZXBzLmNsZWFyVHdlYWtNb2R1bGVDYWNoZSgpO1xuICBkZXBzLmxvYWRBbGxNYWluVHdlYWtzKCk7XG4gIGRlcHMuYnJvYWRjYXN0UmVsb2FkKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRUd2Vha0VuYWJsZWRBbmRSZWxvYWQoXG4gIGlkOiBzdHJpbmcsXG4gIGVuYWJsZWQ6IHVua25vd24sXG4gIGRlcHM6IFNldFR3ZWFrRW5hYmxlZEFuZFJlbG9hZERlcHMsXG4pOiB0cnVlIHtcbiAgY29uc3Qgbm9ybWFsaXplZEVuYWJsZWQgPSAhIWVuYWJsZWQ7XG4gIGRlcHMuc2V0VHdlYWtFbmFibGVkKGlkLCBub3JtYWxpemVkRW5hYmxlZCk7XG4gIGRlcHMubG9nSW5mbyhgdHdlYWsgJHtpZH0gZW5hYmxlZD0ke25vcm1hbGl6ZWRFbmFibGVkfWApO1xuICByZWxvYWRUd2Vha3MoXCJlbmFibGVkLXRvZ2dsZVwiLCBkZXBzKTtcbiAgcmV0dXJuIHRydWU7XG59XG4iLCAiaW1wb3J0IHsgYXBwLCBCcm93c2VyVmlldywgQnJvd3NlcldpbmRvdywgTWVzc2FnZUNoYW5uZWxNYWluLCBpcGNNYWluLCBuYXRpdmVUaGVtZSB9IGZyb20gXCJlbGVjdHJvblwiO1xuaW1wb3J0IHsgY3JlYXRlSGFzaCwgcmFuZG9tVVVJRCB9IGZyb20gXCJub2RlOmNyeXB0b1wiO1xuaW1wb3J0IHsgZXhpc3RzU3luYywgcmVhZEZpbGVTeW5jLCBzdGF0U3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBjcmVhdGVTZXJ2ZXIsIHR5cGUgSW5jb21pbmdNZXNzYWdlLCB0eXBlIFNlcnZlciwgdHlwZSBTZXJ2ZXJSZXNwb25zZSB9IGZyb20gXCJub2RlOmh0dHBcIjtcbmltcG9ydCB7IGpvaW4sIG5vcm1hbGl6ZSwgcmVsYXRpdmUgfSBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgdHlwZSB7IFNvY2tldCB9IGZyb20gXCJub2RlOm5ldFwiO1xuXG5jb25zdCBDT05ORUNUX1BPUlRfQ0hBTk5FTCA9IFwiY29kZXhwcDpicm93c2VyLXVpLWNvbm5lY3QtYXBwLWhvc3RcIjtcbmNvbnN0IEJSSURHRV9SRVFVRVNUX0NIQU5ORUwgPSBcImNvZGV4cHA6YnJvd3Nlci11aS1icmlkZ2UtcmVxdWVzdFwiO1xuY29uc3QgQlJJREdFX1JFU1BPTlNFX0NIQU5ORUwgPSBcImNvZGV4cHA6YnJvd3Nlci11aS1icmlkZ2UtcmVzcG9uc2VcIjtcbmNvbnN0IE1FU1NBR0VfRk9SX1ZJRVdfQ0hBTk5FTCA9IFwiY29kZXhwcDpicm93c2VyLXVpLW1lc3NhZ2UtZm9yLXZpZXdcIjtcbmNvbnN0IFdPUktFUl9NRVNTQUdFX0NIQU5ORUwgPSBcImNvZGV4cHA6YnJvd3Nlci11aS13b3JrZXItbWVzc2FnZVwiO1xuY29uc3QgU1lTVEVNX1RIRU1FX0NIQU5ORUwgPSBcImNvZGV4cHA6YnJvd3Nlci11aS1zeXN0ZW0tdGhlbWVcIjtcblxudHlwZSBMb2dGbiA9IChsZXZlbDogXCJpbmZvXCIgfCBcIndhcm5cIiB8IFwiZXJyb3JcIiwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkO1xuXG5pbnRlcmZhY2UgQ29kZXhXaW5kb3dTZXJ2aWNlcyB7XG4gIGdldENvbnRleHQ/OiAoaG9zdElkOiBzdHJpbmcpID0+IHsgcmVnaXN0ZXJXaW5kb3c/OiAod2luZG93TGlrZTogQ29kZXhXaW5kb3dMaWtlKSA9PiB2b2lkIH0gfCBudWxsO1xuICBnZXRDb250ZXh0Rm9yV2ViQ29udGVudHM/OiAoXG4gICAgd2ViQ29udGVudHM6IEVsZWN0cm9uLldlYkNvbnRlbnRzLFxuICApID0+IHsgcmVnaXN0ZXJXaW5kb3c/OiAod2luZG93TGlrZTogQ29kZXhXaW5kb3dMaWtlKSA9PiB2b2lkIH0gfCBudWxsO1xuICB3aW5kb3dNYW5hZ2VyPzoge1xuICAgIHJlZ2lzdGVyV2luZG93PzogKFxuICAgICAgd2luZG93TGlrZTogQ29kZXhXaW5kb3dMaWtlLFxuICAgICAgaG9zdElkOiBzdHJpbmcsXG4gICAgICBwcmltYXJ5OiBib29sZWFuLFxuICAgICAgYXBwZWFyYW5jZTogc3RyaW5nLFxuICAgICkgPT4gdm9pZDtcbiAgICBvcHRpb25zPzoge1xuICAgICAgYWxsb3dEZXZ0b29scz86IGJvb2xlYW47XG4gICAgICBwcmVsb2FkUGF0aD86IHN0cmluZztcbiAgICB9O1xuICB9O1xufVxuXG5pbnRlcmZhY2UgQ29kZXhXaW5kb3dMaWtlIHtcbiAgaWQ6IG51bWJlcjtcbiAgd2ViQ29udGVudHM6IEVsZWN0cm9uLldlYkNvbnRlbnRzO1xuICBvbihldmVudDogXCJjbG9zZWRcIiwgbGlzdGVuZXI6ICgpID0+IHZvaWQpOiB1bmtub3duO1xuICBvbmNlPyhldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCk6IHVua25vd247XG4gIG9mZj8oZXZlbnQ6IHN0cmluZywgbGlzdGVuZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpOiB1bmtub3duO1xuICByZW1vdmVMaXN0ZW5lcj8oZXZlbnQ6IHN0cmluZywgbGlzdGVuZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpOiB1bmtub3duO1xuICBpc0Rlc3Ryb3llZD8oKTogYm9vbGVhbjtcbiAgaXNGb2N1c2VkPygpOiBib29sZWFuO1xuICBmb2N1cz8oKTogdm9pZDtcbiAgc2hvdz8oKTogdm9pZDtcbiAgaGlkZT8oKTogdm9pZDtcbiAgZ2V0Qm91bmRzPygpOiBFbGVjdHJvbi5SZWN0YW5nbGU7XG4gIGdldENvbnRlbnRCb3VuZHM/KCk6IEVsZWN0cm9uLlJlY3RhbmdsZTtcbiAgZ2V0U2l6ZT8oKTogW251bWJlciwgbnVtYmVyXTtcbiAgZ2V0Q29udGVudFNpemU/KCk6IFtudW1iZXIsIG51bWJlcl07XG4gIHNldFRpdGxlPyh0aXRsZTogc3RyaW5nKTogdm9pZDtcbiAgZ2V0VGl0bGU/KCk6IHN0cmluZztcbiAgc2V0UmVwcmVzZW50ZWRGaWxlbmFtZT8oZmlsZW5hbWU6IHN0cmluZyk6IHZvaWQ7XG4gIHNldERvY3VtZW50RWRpdGVkPyhlZGl0ZWQ6IGJvb2xlYW4pOiB2b2lkO1xuICBzZXRXaW5kb3dCdXR0b25WaXNpYmlsaXR5Pyh2aXNpYmxlOiBib29sZWFuKTogdm9pZDtcbn1cblxuaW50ZXJmYWNlIEJyb3dzZXJVaVNlcnZlck9wdGlvbnMge1xuICBwb3J0OiBudW1iZXI7XG4gIGhvc3Q6IHN0cmluZztcbiAgaGlkZU1haW5XaW5kb3c6IGJvb2xlYW47XG4gIGdldFdpbmRvd1NlcnZpY2VzOiAoKSA9PiBDb2RleFdpbmRvd1NlcnZpY2VzIHwgbnVsbDtcbiAgbG9nOiBMb2dGbjtcbn1cblxuaW50ZXJmYWNlIEJyb3dzZXJVaUhvc3Qge1xuICB2aWV3OiBFbGVjdHJvbi5Ccm93c2VyVmlldztcbiAgd2ViQ29udGVudHM6IEVsZWN0cm9uLldlYkNvbnRlbnRzO1xufVxuXG5pbnRlcmZhY2UgQnJpZGdlUGVuZGluZ1JlcXVlc3Qge1xuICByZXNvbHZlOiAodmFsdWU6IHVua25vd24pID0+IHZvaWQ7XG4gIHJlamVjdDogKGVycm9yOiBFcnJvcikgPT4gdm9pZDtcbiAgdGltZXI6IE5vZGVKUy5UaW1lb3V0O1xufVxuXG5pbnRlcmZhY2UgSW5pdGlhbFN0YXRlIHtcbiAgc25hcHNob3Q6IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICBzeXN0ZW1UaGVtZVZhcmlhbnQ6IHN0cmluZztcbiAgc2VudHJ5SW5pdE9wdGlvbnM6IHVua25vd247XG4gIGJ1aWxkRmxhdm9yOiB1bmtub3duO1xuICB1c2VzT3dsQXBwU2hlbGw6IGJvb2xlYW47XG4gIHBsYXRmb3JtOiBOb2RlSlMuUGxhdGZvcm07XG4gIGFyY2g6IHN0cmluZztcbn1cblxuY29uc3QgTUlNRV9UWVBFUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgXCIuaHRtbFwiOiBcInRleHQvaHRtbDsgY2hhcnNldD11dGYtOFwiLFxuICBcIi5qc1wiOiBcInRleHQvamF2YXNjcmlwdDsgY2hhcnNldD11dGYtOFwiLFxuICBcIi5jc3NcIjogXCJ0ZXh0L2NzczsgY2hhcnNldD11dGYtOFwiLFxuICBcIi5qc29uXCI6IFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOFwiLFxuICBcIi5zdmdcIjogXCJpbWFnZS9zdmcreG1sXCIsXG4gIFwiLnBuZ1wiOiBcImltYWdlL3BuZ1wiLFxuICBcIi5qcGdcIjogXCJpbWFnZS9qcGVnXCIsXG4gIFwiLmpwZWdcIjogXCJpbWFnZS9qcGVnXCIsXG4gIFwiLndlYnBcIjogXCJpbWFnZS93ZWJwXCIsXG4gIFwiLmljb1wiOiBcImltYWdlL3gtaWNvblwiLFxuICBcIi53b2ZmXCI6IFwiZm9udC93b2ZmXCIsXG4gIFwiLndvZmYyXCI6IFwiZm9udC93b2ZmMlwiLFxufTtcblxubGV0IGFjdGl2ZVNlcnZlcjogU2VydmVyIHwgbnVsbCA9IG51bGw7XG5sZXQgYWN0aXZlSG9zdDogQnJvd3NlclVpSG9zdCB8IG51bGwgPSBudWxsO1xubGV0IGFjdGl2ZU9wdGlvbnM6IEJyb3dzZXJVaVNlcnZlck9wdGlvbnMgfCBudWxsID0gbnVsbDtcbmNvbnN0IGJyaWRnZVJlcXVlc3RzID0gbmV3IE1hcDxzdHJpbmcsIEJyaWRnZVBlbmRpbmdSZXF1ZXN0PigpO1xuY29uc3QgY29udHJvbENsaWVudHMgPSBuZXcgU2V0PFdlYlNvY2tldENvbm5lY3Rpb24+KCk7XG5cbmV4cG9ydCBmdW5jdGlvbiBtYXliZVN0YXJ0QnJvd3NlclVpU2VydmVyKFxuICBvcHRzOiBQaWNrPEJyb3dzZXJVaVNlcnZlck9wdGlvbnMsIFwiZ2V0V2luZG93U2VydmljZXNcIiB8IFwibG9nXCI+LFxuKTogdm9pZCB7XG4gIGlmIChwcm9jZXNzLmVudi5DT0RFWFBQX0JST1dTRVJfVUkgIT09IFwiMVwiKSByZXR1cm47XG4gIGNvbnN0IHBvcnQgPSBwYXJzZVBvcnQocHJvY2Vzcy5lbnYuQ09ERVhQUF9CUk9XU0VSX1VJX1BPUlQsIDg3NjUpO1xuICBzdGFydEJyb3dzZXJVaVNlcnZlcih7XG4gICAgLi4ub3B0cyxcbiAgICBwb3J0LFxuICAgIGhvc3Q6IFwiMTI3LjAuMC4xXCIsXG4gICAgaGlkZU1haW5XaW5kb3c6IHByb2Nlc3MuZW52LkNPREVYUFBfQlJPV1NFUl9VSV9ISURFX01BSU4gPT09IFwiMVwiLFxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0QnJvd3NlclVpU2VydmVyKG9wdHM6IEJyb3dzZXJVaVNlcnZlck9wdGlvbnMpOiB2b2lkIHtcbiAgaWYgKGFjdGl2ZVNlcnZlcikgcmV0dXJuO1xuICBhY3RpdmVPcHRpb25zID0gb3B0cztcbiAgaW5zdGFsbEJyb3dzZXJVaUlwY0hhbmRsZXJzKG9wdHMubG9nKTtcblxuICBjb25zdCBzZXJ2ZXIgPSBjcmVhdGVTZXJ2ZXIoKHJlcSwgcmVzKSA9PiB7XG4gICAgaGFuZGxlSHR0cFJlcXVlc3QocmVxLCByZXMpLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgb3B0cy5sb2coXCJlcnJvclwiLCBcImJyb3dzZXIgVUkgcmVxdWVzdCBmYWlsZWRcIiwgeyBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgICAgc2VuZFRleHQocmVzLCA1MDAsIFwiSW50ZXJuYWwgU2VydmVyIEVycm9yXFxuXCIsIFwidGV4dC9wbGFpbjsgY2hhcnNldD11dGYtOFwiKTtcbiAgICB9KTtcbiAgfSk7XG4gIHNlcnZlci5vbihcInVwZ3JhZGVcIiwgKHJlcSwgc29ja2V0LCBoZWFkKSA9PiB7XG4gICAgaGFuZGxlVXBncmFkZShyZXEsIHNvY2tldCBhcyBTb2NrZXQsIGhlYWQpLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgb3B0cy5sb2coXCJ3YXJuXCIsIFwiYnJvd3NlciBVSSB3ZWJzb2NrZXQgdXBncmFkZSBmYWlsZWRcIiwgeyBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgICAgc29ja2V0LmRlc3Ryb3koKTtcbiAgICB9KTtcbiAgfSk7XG4gIHNlcnZlci5vbihcImVycm9yXCIsIChlcnJvcikgPT4ge1xuICAgIG9wdHMubG9nKFwiZXJyb3JcIiwgXCJicm93c2VyIFVJIHNlcnZlciBmYWlsZWRcIiwgeyBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIH0pO1xuICB9KTtcbiAgc2VydmVyLmxpc3RlbihvcHRzLnBvcnQsIG9wdHMuaG9zdCwgKCkgPT4ge1xuICAgIG9wdHMubG9nKFwiaW5mb1wiLCBgYnJvd3NlciBVSSBzZXJ2ZXIgbGlzdGVuaW5nIGF0IGh0dHA6Ly8ke29wdHMuaG9zdH06JHtvcHRzLnBvcnR9L2ApO1xuICB9KTtcbiAgYWN0aXZlU2VydmVyID0gc2VydmVyO1xuICBpZiAob3B0cy5oaWRlTWFpbldpbmRvdykge1xuICAgIGZvciAoY29uc3QgZGVsYXlNcyBvZiBbNTAwLCAxXzUwMCwgM18wMDBdKSB7XG4gICAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoaGlkZVZpc2libGVDb2RleFdpbmRvd3MsIGRlbGF5TXMpO1xuICAgICAgdGltZXIudW5yZWY/LigpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBpbnN0YWxsQnJvd3NlclVpSXBjSGFuZGxlcnMobG9nOiBMb2dGbik6IHZvaWQge1xuICBpcGNNYWluLnJlbW92ZUFsbExpc3RlbmVycyhCUklER0VfUkVTUE9OU0VfQ0hBTk5FTCk7XG4gIGlwY01haW4ucmVtb3ZlQWxsTGlzdGVuZXJzKE1FU1NBR0VfRk9SX1ZJRVdfQ0hBTk5FTCk7XG4gIGlwY01haW4ucmVtb3ZlQWxsTGlzdGVuZXJzKFdPUktFUl9NRVNTQUdFX0NIQU5ORUwpO1xuICBpcGNNYWluLnJlbW92ZUFsbExpc3RlbmVycyhTWVNURU1fVEhFTUVfQ0hBTk5FTCk7XG5cbiAgaXBjTWFpbi5vbihCUklER0VfUkVTUE9OU0VfQ0hBTk5FTCwgKGV2ZW50LCBwYXlsb2FkKSA9PiB7XG4gICAgaWYgKCFpc0Jyb3dzZXJVaUhvc3RTZW5kZXIoZXZlbnQuc2VuZGVyKSkgcmV0dXJuO1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXNSZWNvcmQocGF5bG9hZCk7XG4gICAgY29uc3QgaWQgPSB0eXBlb2YgcmVzcG9uc2U/LmlkID09PSBcInN0cmluZ1wiID8gcmVzcG9uc2UuaWQgOiBcIlwiO1xuICAgIGNvbnN0IHBlbmRpbmcgPSBicmlkZ2VSZXF1ZXN0cy5nZXQoaWQpO1xuICAgIGlmICghcGVuZGluZykgcmV0dXJuO1xuICAgIGJyaWRnZVJlcXVlc3RzLmRlbGV0ZShpZCk7XG4gICAgY2xlYXJUaW1lb3V0KHBlbmRpbmcudGltZXIpO1xuICAgIGlmIChyZXNwb25zZT8ub2sgPT09IHRydWUpIHtcbiAgICAgIHBlbmRpbmcucmVzb2x2ZShyZXNwb25zZS52YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBlbmRpbmcucmVqZWN0KG5ldyBFcnJvcih0eXBlb2YgcmVzcG9uc2U/LmVycm9yID09PSBcInN0cmluZ1wiID8gcmVzcG9uc2UuZXJyb3IgOiBcIkJyaWRnZSByZXF1ZXN0IGZhaWxlZFwiKSk7XG4gICAgfVxuICB9KTtcblxuICBpcGNNYWluLm9uKE1FU1NBR0VfRk9SX1ZJRVdfQ0hBTk5FTCwgKGV2ZW50LCBtZXNzYWdlKSA9PiB7XG4gICAgaWYgKCFpc0Jyb3dzZXJVaUhvc3RTZW5kZXIoZXZlbnQuc2VuZGVyKSkgcmV0dXJuO1xuICAgIGJyb2FkY2FzdENvbnRyb2woeyB0eXBlOiBcIm1lc3NhZ2UtZm9yLXZpZXdcIiwgbWVzc2FnZSB9KTtcbiAgfSk7XG5cbiAgaXBjTWFpbi5vbihXT1JLRVJfTUVTU0FHRV9DSEFOTkVMLCAoZXZlbnQsIHdvcmtlcklkLCBtZXNzYWdlKSA9PiB7XG4gICAgaWYgKCFpc0Jyb3dzZXJVaUhvc3RTZW5kZXIoZXZlbnQuc2VuZGVyKSkgcmV0dXJuO1xuICAgIGlmICh0eXBlb2Ygd29ya2VySWQgIT09IFwic3RyaW5nXCIpIHJldHVybjtcbiAgICBicm9hZGNhc3RDb250cm9sKHsgdHlwZTogXCJ3b3JrZXItbWVzc2FnZVwiLCB3b3JrZXJJZCwgbWVzc2FnZSB9KTtcbiAgfSk7XG5cbiAgaXBjTWFpbi5vbihTWVNURU1fVEhFTUVfQ0hBTk5FTCwgKGV2ZW50LCB2YWx1ZSkgPT4ge1xuICAgIGlmICghaXNCcm93c2VyVWlIb3N0U2VuZGVyKGV2ZW50LnNlbmRlcikpIHJldHVybjtcbiAgICBicm9hZGNhc3RDb250cm9sKHsgdHlwZTogXCJzeXN0ZW0tdGhlbWUtdmFyaWFudC11cGRhdGVkXCIsIHZhbHVlIH0pO1xuICB9KTtcblxuICBwcm9jZXNzLm9uY2UoXCJleGl0XCIsICgpID0+IHtcbiAgICBmb3IgKGNvbnN0IHBlbmRpbmcgb2YgYnJpZGdlUmVxdWVzdHMudmFsdWVzKCkpIHtcbiAgICAgIGNsZWFyVGltZW91dChwZW5kaW5nLnRpbWVyKTtcbiAgICAgIHBlbmRpbmcucmVqZWN0KG5ldyBFcnJvcihcIkNvZGV4KysgYnJvd3NlciBVSSBzZXJ2ZXIgc3RvcHBlZFwiKSk7XG4gICAgfVxuICAgIGJyaWRnZVJlcXVlc3RzLmNsZWFyKCk7XG4gICAgZm9yIChjb25zdCBjbGllbnQgb2YgY29udHJvbENsaWVudHMpIGNsaWVudC5jbG9zZSgpO1xuICAgIGNvbnRyb2xDbGllbnRzLmNsZWFyKCk7XG4gICAgdHJ5IHtcbiAgICAgIGlmIChhY3RpdmVIb3N0ICYmICFhY3RpdmVIb3N0LndlYkNvbnRlbnRzLmlzRGVzdHJveWVkKCkpIHtcbiAgICAgICAgYWN0aXZlSG9zdC53ZWJDb250ZW50cy5jbG9zZSh7IHdhaXRGb3JCZWZvcmVVbmxvYWQ6IGZhbHNlIH0pO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBsb2coXCJ3YXJuXCIsIFwiYnJvd3NlciBVSSBob3N0IGNsZWFudXAgZmFpbGVkXCIsIHsgbWVzc2FnZTogU3RyaW5nKGVycm9yKSB9KTtcbiAgICB9XG4gIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVIdHRwUmVxdWVzdChyZXE6IEluY29taW5nTWVzc2FnZSwgcmVzOiBTZXJ2ZXJSZXNwb25zZSk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBvcHRpb25zID0gcmVxdWlyZU9wdGlvbnMoKTtcbiAgY29uc3QgdXJsID0gcmVxdWVzdFVybChyZXEpO1xuICBpZiAoIXVybCkge1xuICAgIHNlbmRUZXh0KHJlcywgNDAwLCBcIkJhZCBSZXF1ZXN0XFxuXCIsIFwidGV4dC9wbGFpbjsgY2hhcnNldD11dGYtOFwiKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAodXJsLnBhdGhuYW1lID09PSBcIi9jb2RleHBwL2Jyb3dzZXItdWkvaGVhbHRoXCIpIHtcbiAgICBzZW5kSnNvbihyZXMsIDIwMCwgeyBvazogdHJ1ZSB9KTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAodXJsLnBhdGhuYW1lID09PSBcIi9jb2RleHBwL2Jyb3dzZXItdWkvYnJpZGdlXCIpIHtcbiAgICBpZiAocmVxLm1ldGhvZCAhPT0gXCJQT1NUXCIpIHtcbiAgICAgIHNlbmRUZXh0KHJlcywgNDA1LCBcIk1ldGhvZCBOb3QgQWxsb3dlZFxcblwiLCBcInRleHQvcGxhaW47IGNoYXJzZXQ9dXRmLThcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGJvZHkgPSBhc1JlY29yZChhd2FpdCByZWFkSnNvbkJvZHkocmVxKSk7XG4gICAgY29uc3QgbWV0aG9kID0gdHlwZW9mIGJvZHk/Lm1ldGhvZCA9PT0gXCJzdHJpbmdcIiA/IGJvZHkubWV0aG9kIDogXCJcIjtcbiAgICBjb25zdCBhcmdzID0gQXJyYXkuaXNBcnJheShib2R5Py5hcmdzKSA/IGJvZHkuYXJncyA6IFtdO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IGF3YWl0IGNhbGxIaWRkZW5CcmlkZ2UobWV0aG9kLCBhcmdzKTtcbiAgICAgIHNlbmRKc29uKHJlcywgMjAwLCB7IG9rOiB0cnVlLCB2YWx1ZSB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgc2VuZEpzb24ocmVzLCA1MDAsIHtcbiAgICAgICAgb2s6IGZhbHNlLFxuICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICh1cmwucGF0aG5hbWUgPT09IFwiL2NvZGV4cHAvYnJvd3Nlci11aS9icmlkZ2UuanNcIikge1xuICAgIGlmIChyZXEubWV0aG9kICE9PSBcIkdFVFwiICYmIHJlcS5tZXRob2QgIT09IFwiSEVBRFwiKSB7XG4gICAgICBzZW5kVGV4dChyZXMsIDQwNSwgXCJNZXRob2QgTm90IEFsbG93ZWRcXG5cIiwgXCJ0ZXh0L3BsYWluOyBjaGFyc2V0PXV0Zi04XCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBzY3JpcHQgPSBicm93c2VyQnJpZGdlU2NyaXB0KGF3YWl0IGNvbGxlY3RJbml0aWFsU3RhdGUob3B0aW9ucykpO1xuICAgIHNlbmRCdWZmZXIocmVzLCAyMDAsIEJ1ZmZlci5mcm9tKHNjcmlwdCksIE1JTUVfVFlQRVNbXCIuanNcIl0sIHJlcS5tZXRob2QgPT09IFwiSEVBRFwiKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAocmVxLm1ldGhvZCAhPT0gXCJHRVRcIiAmJiByZXEubWV0aG9kICE9PSBcIkhFQURcIikge1xuICAgIHNlbmRUZXh0KHJlcywgNDA1LCBcIk1ldGhvZCBOb3QgQWxsb3dlZFxcblwiLCBcInRleHQvcGxhaW47IGNoYXJzZXQ9dXRmLThcIik7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHVybC5wYXRobmFtZSA9PT0gXCIvXCIgfHwgdXJsLnBhdGhuYW1lID09PSBcIi9pbmRleC5odG1sXCIpIHtcbiAgICBjb25zdCBodG1sID0gYXdhaXQgYnJvd3NlckluZGV4SHRtbChvcHRpb25zKTtcbiAgICBzZW5kQnVmZmVyKHJlcywgMjAwLCBCdWZmZXIuZnJvbShodG1sKSwgTUlNRV9UWVBFU1tcIi5odG1sXCJdLCByZXEubWV0aG9kID09PSBcIkhFQURcIik7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgZmlsZSA9IHdlYnZpZXdGaWxlKHVybC5wYXRobmFtZSk7XG4gIGlmICghZmlsZSkge1xuICAgIHNlbmRUZXh0KHJlcywgNDA0LCBcIk5vdCBGb3VuZFxcblwiLCBcInRleHQvcGxhaW47IGNoYXJzZXQ9dXRmLThcIik7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZVN5bmMoZmlsZSk7XG4gIHNlbmRCdWZmZXIocmVzLCAyMDAsIGNvbnRlbnQsIG1pbWVUeXBlKGZpbGUpLCByZXEubWV0aG9kID09PSBcIkhFQURcIik7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZVVwZ3JhZGUocmVxOiBJbmNvbWluZ01lc3NhZ2UsIHNvY2tldDogU29ja2V0LCBoZWFkOiBCdWZmZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgdXJsID0gcmVxdWVzdFVybChyZXEpO1xuICBpZiAoIXVybCkgdGhyb3cgbmV3IEVycm9yKFwiYmFkIHdlYnNvY2tldCBVUkxcIik7XG4gIGlmICh1cmwucGF0aG5hbWUgIT09IFwiL2NvZGV4cHAvYnJvd3Nlci11aS9ycGNcIiAmJiB1cmwucGF0aG5hbWUgIT09IFwiL2NvZGV4cHAvYnJvd3Nlci11aS9jb250cm9sXCIpIHtcbiAgICBzb2NrZXQuZGVzdHJveSgpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCB3cyA9IGFjY2VwdFdlYlNvY2tldChyZXEsIHNvY2tldCwgaGVhZCk7XG4gIGlmICh1cmwucGF0aG5hbWUgPT09IFwiL2NvZGV4cHAvYnJvd3Nlci11aS9jb250cm9sXCIpIHtcbiAgICBjb250cm9sQ2xpZW50cy5hZGQod3MpO1xuICAgIHdzLm9uQ2xvc2UoKCkgPT4gY29udHJvbENsaWVudHMuZGVsZXRlKHdzKSk7XG4gICAgd3Muc2VuZEpzb24oeyB0eXBlOiBcImhlbGxvXCIgfSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgaG9zdCA9IGF3YWl0IGVuc3VyZUJyb3dzZXJVaUhvc3QoKTtcbiAgY29uc3QgeyBwb3J0MSwgcG9ydDIgfSA9IG5ldyBNZXNzYWdlQ2hhbm5lbE1haW4oKTtcbiAgaG9zdC53ZWJDb250ZW50cy5wb3N0TWVzc2FnZShDT05ORUNUX1BPUlRfQ0hBTk5FTCwge30sIFtwb3J0Ml0pO1xuICBicmlkZ2VNZXNzYWdlUG9ydFRvV2ViU29ja2V0KHBvcnQxLCB3cyk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGJyb3dzZXJJbmRleEh0bWwob3B0aW9uczogQnJvd3NlclVpU2VydmVyT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGluZGV4UGF0aCA9IGpvaW4od2Vidmlld1Jvb3QoKSwgXCJpbmRleC5odG1sXCIpO1xuICBsZXQgaHRtbCA9IHJlbGF4QnJvd3NlclVpQ3NwKHJlYWRGaWxlU3luYyhpbmRleFBhdGgsIFwidXRmOFwiKSk7XG4gIGNvbnN0IHNoaW0gPSBgPHNjcmlwdCBzcmM9XCIvY29kZXhwcC9icm93c2VyLXVpL2JyaWRnZS5qc1wiPjwvc2NyaXB0PmA7XG4gIGlmIChodG1sLmluY2x1ZGVzKFwiPC9oZWFkPlwiKSkge1xuICAgIGh0bWwgPSBodG1sLnJlcGxhY2UoXCI8L2hlYWQ+XCIsIGAke3NoaW19XFxuICA8L2hlYWQ+YCk7XG4gIH0gZWxzZSB7XG4gICAgaHRtbCA9IGAke3NoaW19XFxuJHtodG1sfWA7XG4gIH1cbiAgcmV0dXJuIGh0bWw7XG59XG5cbmZ1bmN0aW9uIHJlbGF4QnJvd3NlclVpQ3NwKGh0bWw6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBodG1sLnJlcGxhY2UoXG4gICAgLyg8bWV0YVxccytodHRwLWVxdWl2PVtcIiddQ29udGVudC1TZWN1cml0eS1Qb2xpY3lbXCInXVxccytjb250ZW50PVwiKShbXlwiXSopKFwiKS8sXG4gICAgKF9tYXRjaCwgcHJlZml4OiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZywgc3VmZml4OiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZXMgPSBwYXJzZUNzcERpcmVjdGl2ZXMoZGVjb2RlSHRtbEF0dHJpYnV0ZShjb250ZW50KSk7XG4gICAgICBkaXJlY3RpdmVzLnNldChcImNoaWxkLXNyY1wiLCBcIidzZWxmJyBibG9iOiBkYXRhOiBodHRwOiBodHRwczpcIik7XG4gICAgICBkaXJlY3RpdmVzLnNldChcImZyYW1lLXNyY1wiLCBcIidzZWxmJyBibG9iOiBkYXRhOiBodHRwOiBodHRwczpcIik7XG4gICAgICBkaXJlY3RpdmVzLnNldChcImNvbm5lY3Qtc3JjXCIsIFwiJ3NlbGYnIGh0dHA6IGh0dHBzOiB3czogd3NzOiBzZW50cnktaXBjOlwiKTtcbiAgICAgIHJldHVybiBgJHtwcmVmaXh9JHtlbmNvZGVIdG1sQXR0cmlidXRlKGZvcm1hdENzcERpcmVjdGl2ZXMoZGlyZWN0aXZlcykpfSR7c3VmZml4fWA7XG4gICAgfSxcbiAgKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VDc3BEaXJlY3RpdmVzKGNvbnRlbnQ6IHN0cmluZyk6IE1hcDxzdHJpbmcsIHN0cmluZz4ge1xuICBjb25zdCBkaXJlY3RpdmVzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCBwYXJ0IG9mIGNvbnRlbnQuc3BsaXQoXCI7XCIpKSB7XG4gICAgY29uc3QgdHJpbW1lZCA9IHBhcnQudHJpbSgpO1xuICAgIGlmICghdHJpbW1lZCkgY29udGludWU7XG4gICAgY29uc3QgW25hbWUsIC4uLnJlc3RdID0gdHJpbW1lZC5zcGxpdCgvXFxzKy8pO1xuICAgIGlmICghbmFtZSkgY29udGludWU7XG4gICAgZGlyZWN0aXZlcy5zZXQobmFtZSwgcmVzdC5qb2luKFwiIFwiKSk7XG4gIH1cbiAgcmV0dXJuIGRpcmVjdGl2ZXM7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdENzcERpcmVjdGl2ZXMoZGlyZWN0aXZlczogTWFwPHN0cmluZywgc3RyaW5nPik6IHN0cmluZyB7XG4gIHJldHVybiBbLi4uZGlyZWN0aXZlcy5lbnRyaWVzKCldXG4gICAgLm1hcCgoW25hbWUsIHZhbHVlXSkgPT4gKHZhbHVlID8gYCR7bmFtZX0gJHt2YWx1ZX1gIDogbmFtZSkpXG4gICAgLmpvaW4oXCI7IFwiKTtcbn1cblxuZnVuY3Rpb24gZGVjb2RlSHRtbEF0dHJpYnV0ZSh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHZhbHVlXG4gICAgLnJlcGxhY2UoLyZxdW90Oy9nLCAnXCInKVxuICAgIC5yZXBsYWNlKC8mIzM5Oy9nLCBcIidcIilcbiAgICAucmVwbGFjZSgvJmx0Oy9nLCBcIjxcIilcbiAgICAucmVwbGFjZSgvJmd0Oy9nLCBcIj5cIilcbiAgICAucmVwbGFjZSgvJmFtcDsvZywgXCImXCIpO1xufVxuXG5mdW5jdGlvbiBlbmNvZGVIdG1sQXR0cmlidXRlKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdmFsdWVcbiAgICAucmVwbGFjZSgvJi9nLCBcIiZhbXA7XCIpXG4gICAgLnJlcGxhY2UoL1wiL2csIFwiJnF1b3Q7XCIpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBjb2xsZWN0SW5pdGlhbFN0YXRlKG9wdGlvbnM6IEJyb3dzZXJVaVNlcnZlck9wdGlvbnMpOiBQcm9taXNlPEluaXRpYWxTdGF0ZT4ge1xuICBhd2FpdCBlbnN1cmVCcm93c2VyVWlIb3N0KCk7XG4gIGNvbnN0IFtzbmFwc2hvdCwgc3lzdGVtVGhlbWVWYXJpYW50LCBzZW50cnlJbml0T3B0aW9ucywgYnVpbGRGbGF2b3IsIHVzZXNPd2xBcHBTaGVsbF0gPSBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgY2FsbEhpZGRlbkJyaWRnZShcInNuYXBzaG90XCIsIFtdKSxcbiAgICBjYWxsSGlkZGVuQnJpZGdlKFwic3lzdGVtVGhlbWVcIiwgW10pLFxuICAgIGNhbGxIaWRkZW5CcmlkZ2UoXCJzZW50cnlPcHRpb25zXCIsIFtdKSxcbiAgICBjYWxsSGlkZGVuQnJpZGdlKFwiYnVpbGRGbGF2b3JcIiwgW10pLFxuICAgIGNhbGxIaWRkZW5CcmlkZ2UoXCJ1c2VzT3dsQXBwU2hlbGxcIiwgW10pLFxuICBdKTtcbiAgaWYgKG9wdGlvbnMuaGlkZU1haW5XaW5kb3cpIGhpZGVWaXNpYmxlQ29kZXhXaW5kb3dzKCk7XG4gIHJldHVybiB7XG4gICAgc25hcHNob3Q6IGFzUGxhaW5PYmplY3Qoc25hcHNob3QpLFxuICAgIHN5c3RlbVRoZW1lVmFyaWFudDogdHlwZW9mIHN5c3RlbVRoZW1lVmFyaWFudCA9PT0gXCJzdHJpbmdcIiA/IHN5c3RlbVRoZW1lVmFyaWFudCA6IGN1cnJlbnRTeXN0ZW1UaGVtZVZhcmlhbnQoKSxcbiAgICBzZW50cnlJbml0T3B0aW9ucyxcbiAgICBidWlsZEZsYXZvcixcbiAgICB1c2VzT3dsQXBwU2hlbGw6IHVzZXNPd2xBcHBTaGVsbCA9PT0gdHJ1ZSxcbiAgICBwbGF0Zm9ybTogcHJvY2Vzcy5wbGF0Zm9ybSxcbiAgICBhcmNoOiBwcm9jZXNzLmFyY2gsXG4gIH07XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGVuc3VyZUJyb3dzZXJVaUhvc3QoKTogUHJvbWlzZTxCcm93c2VyVWlIb3N0PiB7XG4gIGlmIChhY3RpdmVIb3N0ICYmICFhY3RpdmVIb3N0LndlYkNvbnRlbnRzLmlzRGVzdHJveWVkKCkpIHJldHVybiBhY3RpdmVIb3N0O1xuICBjb25zdCBvcHRpb25zID0gcmVxdWlyZU9wdGlvbnMoKTtcbiAgY29uc3Qgc2VydmljZXMgPSBhd2FpdCB3YWl0Rm9yV2luZG93U2VydmljZXMob3B0aW9ucyk7XG4gIGNvbnN0IHdpbmRvd01hbmFnZXIgPSBzZXJ2aWNlcy53aW5kb3dNYW5hZ2VyO1xuICBpZiAoIXdpbmRvd01hbmFnZXI/LnJlZ2lzdGVyV2luZG93KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ29kZXggd2luZG93IHJlZ2lzdHJhdGlvbiBzZXJ2aWNlcyBhcmUgdW5hdmFpbGFibGVcIik7XG4gIH1cblxuICBjb25zdCB2aWV3ID0gbmV3IEJyb3dzZXJWaWV3KHtcbiAgICB3ZWJQcmVmZXJlbmNlczoge1xuICAgICAgcHJlbG9hZDogd2luZG93TWFuYWdlci5vcHRpb25zPy5wcmVsb2FkUGF0aCxcbiAgICAgIGNvbnRleHRJc29sYXRpb246IHRydWUsXG4gICAgICBub2RlSW50ZWdyYXRpb246IGZhbHNlLFxuICAgICAgc3BlbGxjaGVjazogZmFsc2UsXG4gICAgICBkZXZUb29sczogd2luZG93TWFuYWdlci5vcHRpb25zPy5hbGxvd0RldnRvb2xzLFxuICAgIH0sXG4gIH0pO1xuICBjb25zdCB3aW5kb3dMaWtlID0gbWFrZVdpbmRvd0xpa2VGb3JWaWV3KHZpZXcpO1xuICB3aW5kb3dNYW5hZ2VyLnJlZ2lzdGVyV2luZG93KHdpbmRvd0xpa2UsIFwibG9jYWxcIiwgZmFsc2UsIFwic2Vjb25kYXJ5XCIpO1xuICBjb25zdCBjb250ZXh0ID0gc2VydmljZXMuZ2V0Q29udGV4dEZvcldlYkNvbnRlbnRzPy4odmlldy53ZWJDb250ZW50cykgPz8gc2VydmljZXMuZ2V0Q29udGV4dD8uKFwibG9jYWxcIik7XG4gIGNvbnRleHQ/LnJlZ2lzdGVyV2luZG93Py4od2luZG93TGlrZSk7XG4gIGF3YWl0IHZpZXcud2ViQ29udGVudHMubG9hZFVSTChcImFib3V0OmJsYW5rXCIpO1xuICBhY3RpdmVIb3N0ID0geyB2aWV3LCB3ZWJDb250ZW50czogdmlldy53ZWJDb250ZW50cyB9O1xuICB2aWV3LndlYkNvbnRlbnRzLm9uY2UoXCJkZXN0cm95ZWRcIiwgKCkgPT4ge1xuICAgIGlmIChhY3RpdmVIb3N0Py53ZWJDb250ZW50cyA9PT0gdmlldy53ZWJDb250ZW50cykgYWN0aXZlSG9zdCA9IG51bGw7XG4gIH0pO1xuICBvcHRpb25zLmxvZyhcImluZm9cIiwgXCJicm93c2VyIFVJIGhpZGRlbiBob3N0IHJlYWR5XCIsIHsgd2ViQ29udGVudHNJZDogdmlldy53ZWJDb250ZW50cy5pZCB9KTtcbiAgcmV0dXJuIGFjdGl2ZUhvc3Q7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHdhaXRGb3JXaW5kb3dTZXJ2aWNlcyhvcHRpb25zOiBCcm93c2VyVWlTZXJ2ZXJPcHRpb25zKTogUHJvbWlzZTxDb2RleFdpbmRvd1NlcnZpY2VzPiB7XG4gIGNvbnN0IHN0YXJ0ZWQgPSBEYXRlLm5vdygpO1xuICB3aGlsZSAoRGF0ZS5ub3coKSAtIHN0YXJ0ZWQgPCAzMF8wMDApIHtcbiAgICBjb25zdCBzZXJ2aWNlcyA9IG9wdGlvbnMuZ2V0V2luZG93U2VydmljZXMoKTtcbiAgICBpZiAoXG4gICAgICBzZXJ2aWNlcz8ud2luZG93TWFuYWdlcj8ucmVnaXN0ZXJXaW5kb3cgJiZcbiAgICAgIChzZXJ2aWNlcy5nZXRDb250ZXh0IHx8IHNlcnZpY2VzLmdldENvbnRleHRGb3JXZWJDb250ZW50cylcbiAgICApIHtcbiAgICAgIHJldHVybiBzZXJ2aWNlcztcbiAgICB9XG4gICAgYXdhaXQgZGVsYXkoMTAwKTtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoXCJUaW1lZCBvdXQgd2FpdGluZyBmb3IgQ29kZXggd2luZG93IHNlcnZpY2VzXCIpO1xufVxuXG5mdW5jdGlvbiBjYWxsSGlkZGVuQnJpZGdlKG1ldGhvZDogc3RyaW5nLCBhcmdzOiB1bmtub3duW10pOiBQcm9taXNlPHVua25vd24+IHtcbiAgYXNzZXJ0QnJpZGdlTWV0aG9kKG1ldGhvZCk7XG4gIHJldHVybiBlbnN1cmVCcm93c2VyVWlIb3N0KCkudGhlbigoaG9zdCkgPT4ge1xuICAgIGNvbnN0IGlkID0gcmFuZG9tVVVJRCgpO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBicmlkZ2VSZXF1ZXN0cy5kZWxldGUoaWQpO1xuICAgICAgICByZWplY3QobmV3IEVycm9yKGBUaW1lZCBvdXQgd2FpdGluZyBmb3IgYnJvd3NlciBVSSBicmlkZ2UgbWV0aG9kOiAke21ldGhvZH1gKSk7XG4gICAgICB9LCAxNV8wMDApO1xuICAgICAgYnJpZGdlUmVxdWVzdHMuc2V0KGlkLCB7IHJlc29sdmUsIHJlamVjdCwgdGltZXIgfSk7XG4gICAgICBob3N0LndlYkNvbnRlbnRzLnNlbmQoQlJJREdFX1JFUVVFU1RfQ0hBTk5FTCwgeyBpZCwgbWV0aG9kLCBhcmdzIH0pO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gYnJpZGdlTWVzc2FnZVBvcnRUb1dlYlNvY2tldChwb3J0OiBFbGVjdHJvbi5NZXNzYWdlUG9ydE1haW4sIHdzOiBXZWJTb2NrZXRDb25uZWN0aW9uKTogdm9pZCB7XG4gIGxldCBjbG9zZWQgPSBmYWxzZTtcbiAgY29uc3QgY2xvc2UgPSAoKSA9PiB7XG4gICAgaWYgKGNsb3NlZCkgcmV0dXJuO1xuICAgIGNsb3NlZCA9IHRydWU7XG4gICAgdHJ5IHtcbiAgICAgIHBvcnQucG9zdE1lc3NhZ2UobnVsbCk7XG4gICAgfSBjYXRjaCB7fVxuICAgIHRyeSB7XG4gICAgICBwb3J0LmNsb3NlKCk7XG4gICAgfSBjYXRjaCB7fVxuICAgIHdzLmNsb3NlKCk7XG4gIH07XG4gIHBvcnQuc3RhcnQoKTtcbiAgcG9ydC5vbihcIm1lc3NhZ2VcIiwgKGV2ZW50KSA9PiB7XG4gICAgaWYgKGNsb3NlZCkgcmV0dXJuO1xuICAgIGlmIChldmVudC5kYXRhID09IG51bGwpIHtcbiAgICAgIGNsb3NlKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0eXBlb2YgZXZlbnQuZGF0YSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgd3Muc2VuZFRleHQoZXZlbnQuZGF0YSk7XG4gICAgfVxuICB9KTtcbiAgcG9ydC5vbihcImNsb3NlXCIsIGNsb3NlKTtcbiAgd3Mub25UZXh0KCh0ZXh0KSA9PiB7XG4gICAgaWYgKGNsb3NlZCkgcmV0dXJuO1xuICAgIHBvcnQucG9zdE1lc3NhZ2UodGV4dCk7XG4gIH0pO1xuICB3cy5vbkNsb3NlKGNsb3NlKTtcbn1cblxuZnVuY3Rpb24gYnJvYWRjYXN0Q29udHJvbChwYXlsb2FkOiB1bmtub3duKTogdm9pZCB7XG4gIGZvciAoY29uc3QgY2xpZW50IG9mIFsuLi5jb250cm9sQ2xpZW50c10pIHtcbiAgICB0cnkge1xuICAgICAgY2xpZW50LnNlbmRKc29uKHBheWxvYWQpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgY2xpZW50LmNsb3NlKCk7XG4gICAgICBjb250cm9sQ2xpZW50cy5kZWxldGUoY2xpZW50KTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gYnJvd3NlckJyaWRnZVNjcmlwdChzdGF0ZTogSW5pdGlhbFN0YXRlKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBcbigoKSA9PiB7XG4gIGNvbnN0IGluaXRpYWxTdGF0ZSA9ICR7c2FmZUpzb24oc3RhdGUpfTtcbiAgY29uc3Qgc25hcHNob3QgPSBuZXcgTWFwKE9iamVjdC5lbnRyaWVzKGluaXRpYWxTdGF0ZS5zbmFwc2hvdCB8fCB7fSkpO1xuICBjb25zdCB3b3JrZXJTdWJzY3JpYmVycyA9IG5ldyBNYXAoKTtcbiAgY29uc3QgdGhlbWVTdWJzY3JpYmVycyA9IG5ldyBTZXQoKTtcbiAgY29uc3QgYnJvd3NlclNpZGViYXJTbmFwc2hvdHMgPSBuZXcgTWFwKCk7XG4gIGNvbnN0IGJyb3dzZXJTaWRlYmFyU2VlZGVkTG9jYWxTZXJ2ZXJzID0gbmV3IFNldCgpO1xuICBsZXQgc3lzdGVtVGhlbWVWYXJpYW50ID0gaW5pdGlhbFN0YXRlLnN5c3RlbVRoZW1lVmFyaWFudCB8fCBcImxpZ2h0XCI7XG5cbiAgd2luZG93Ll9fY29kZXhwcEJyb3dzZXJVaSA9IHRydWU7XG4gIGluc3RhbGxCcm93c2VyVWlXZWJ2aWV3U2hpbSgpO1xuXG4gIGNvbnN0IGNvbnRyb2wgPSBuZXcgV2ViU29ja2V0KG5ldyBVUkwoXCIvY29kZXhwcC9icm93c2VyLXVpL2NvbnRyb2xcIiwgbG9jYXRpb24uaHJlZikpO1xuICBjb250cm9sLmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIChldmVudCkgPT4ge1xuICAgIGxldCBwYXlsb2FkO1xuICAgIHRyeSB7IHBheWxvYWQgPSBKU09OLnBhcnNlKGV2ZW50LmRhdGEpOyB9IGNhdGNoIHsgcmV0dXJuOyB9XG4gICAgaWYgKHBheWxvYWQudHlwZSA9PT0gXCJtZXNzYWdlLWZvci12aWV3XCIpIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBwYXlsb2FkLm1lc3NhZ2U7XG4gICAgICBpZiAobWVzc2FnZSAmJiBtZXNzYWdlLnR5cGUgPT09IFwic2hhcmVkLW9iamVjdC11cGRhdGVkXCIpIHtcbiAgICAgICAgaWYgKG1lc3NhZ2UudmFsdWUgPT09IHVuZGVmaW5lZCkgc25hcHNob3QuZGVsZXRlKG1lc3NhZ2Uua2V5KTtcbiAgICAgICAgZWxzZSBzbmFwc2hvdC5zZXQobWVzc2FnZS5rZXksIG1lc3NhZ2UudmFsdWUpO1xuICAgICAgfVxuICAgICAgcmVtZW1iZXJCcm93c2VyU2lkZWJhckhvc3RNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IE1lc3NhZ2VFdmVudChcIm1lc3NhZ2VcIiwgeyBkYXRhOiBtZXNzYWdlIH0pKTtcbiAgICB9IGVsc2UgaWYgKHBheWxvYWQudHlwZSA9PT0gXCJ3b3JrZXItbWVzc2FnZVwiKSB7XG4gICAgICBjb25zdCBzdWJzID0gd29ya2VyU3Vic2NyaWJlcnMuZ2V0KHBheWxvYWQud29ya2VySWQpO1xuICAgICAgaWYgKHN1YnMpIGZvciAoY29uc3QgZm4gb2YgWy4uLnN1YnNdKSBmbihwYXlsb2FkLm1lc3NhZ2UpO1xuICAgIH0gZWxzZSBpZiAocGF5bG9hZC50eXBlID09PSBcInN5c3RlbS10aGVtZS12YXJpYW50LXVwZGF0ZWRcIikge1xuICAgICAgc3lzdGVtVGhlbWVWYXJpYW50ID0gcGF5bG9hZC52YWx1ZTtcbiAgICAgIGZvciAoY29uc3QgZm4gb2YgWy4uLnRoZW1lU3Vic2NyaWJlcnNdKSBmbigpO1xuICAgIH1cbiAgfSk7XG5cbiAgYXN5bmMgZnVuY3Rpb24gYnJpZGdlKG1ldGhvZCwgYXJncyA9IFtdKSB7XG4gICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goXCIvY29kZXhwcC9icm93c2VyLXVpL2JyaWRnZVwiLCB7XG4gICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgaGVhZGVyczogeyBcImNvbnRlbnQtdHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIiB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBtZXRob2QsIGFyZ3MgfSksXG4gICAgfSk7XG4gICAgY29uc3QgYm9keSA9IGF3YWl0IHJlcy5qc29uKCk7XG4gICAgaWYgKCFib2R5Lm9rKSB0aHJvdyBuZXcgRXJyb3IoYm9keS5lcnJvciB8fCBcIkNvZGV4KysgYnJvd3NlciBicmlkZ2UgZmFpbGVkXCIpO1xuICAgIHJldHVybiBib2R5LnZhbHVlO1xuICB9XG5cbiAgZnVuY3Rpb24gbGVnYWN5QnJvd3NlclRhYklkKGNvbnZlcnNhdGlvbklkKSB7XG4gICAgcmV0dXJuIFN0cmluZyhjb252ZXJzYXRpb25JZCB8fCBcIm5ldy1jb252ZXJzYXRpb25cIikgKyBcIjpsZWdhY3lcIjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGJyb3dzZXJTaWRlYmFyS2V5KGNvbnZlcnNhdGlvbklkLCBicm93c2VyVGFiSWQpIHtcbiAgICByZXR1cm4gU3RyaW5nKGNvbnZlcnNhdGlvbklkIHx8IFwibmV3LWNvbnZlcnNhdGlvblwiKSArIFwiOjpcIiArIFN0cmluZyhicm93c2VyVGFiSWQgfHwgbGVnYWN5QnJvd3NlclRhYklkKGNvbnZlcnNhdGlvbklkKSk7XG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVCcm93c2VyVXJsKHZhbHVlKSB7XG4gICAgY29uc3QgcmF3ID0gU3RyaW5nKHZhbHVlIHx8IFwiXCIpLnRyaW0oKTtcbiAgICBpZiAoIXJhdykgcmV0dXJuIFwiXCI7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBuZXcgVVJMKHJhdykuaHJlZjtcbiAgICB9IGNhdGNoIHt9XG4gICAgaWYgKC9eW2EtekEtWl1bYS16QS1aMC05Ky4tXSo6Ly50ZXN0KHJhdykpIHJldHVybiByYXc7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBuZXcgVVJMKFwiaHR0cHM6Ly9cIiArIHJhdykuaHJlZjtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiByYXc7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gYnJvd3NlclRpdGxlRm9yVXJsKHVybCkge1xuICAgIGlmICghdXJsKSByZXR1cm4gXCJOZXcgdGFiXCI7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGhvc3QgPSBuZXcgVVJMKHVybCkuaG9zdG5hbWUucmVwbGFjZSgvXnd3d1xcXFwuLywgXCJcIik7XG4gICAgICByZXR1cm4gaG9zdCB8fCB1cmw7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gdXJsO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG1ha2VCcm93c2VyU2lkZWJhclNuYXBzaG90KHVybCwgcGF0Y2ggPSB7fSkge1xuICAgIGNvbnN0IG5vcm1hbGl6ZWQgPSBub3JtYWxpemVCcm93c2VyVXJsKHVybCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRhYlR5cGU6IG5vcm1hbGl6ZWQgPyBcIndlYlwiIDogXCJuZXctdGFiLXBhZ2VcIixcbiAgICAgIGlzU3VzcGVuZGVkOiBmYWxzZSxcbiAgICAgIHRpdGxlOiBub3JtYWxpemVkID8gYnJvd3NlclRpdGxlRm9yVXJsKG5vcm1hbGl6ZWQpIDogXCJOZXcgdGFiXCIsXG4gICAgICB1cmw6IG5vcm1hbGl6ZWQsXG4gICAgICBmYXZpY29uVXJsOiBudWxsLFxuICAgICAgaXNMb2FkaW5nOiBmYWxzZSxcbiAgICAgIGNhbkdvQmFjazogZmFsc2UsXG4gICAgICBjYW5Hb0ZvcndhcmQ6IGZhbHNlLFxuICAgICAgem9vbVBlcmNlbnQ6IDEwMCxcbiAgICAgIGNvbW1lbnRNb2RlRGlzYWJsZWRSZWFzb246IG51bGwsXG4gICAgICBpbnRlcmFjdGlvbk1vZGU6IFwiYnJvd3NlXCIsXG4gICAgICBhbm5vdGF0aW9uRWRpdG9yTW9kZTogXCJjb21tZW50XCIsXG4gICAgICBpc0Fubm90YXRpb25BZGRNb2RpZmllclByZXNzZWQ6IGZhbHNlLFxuICAgICAgaXNPcmlnaW5hbFZpZXdFbmFibGVkOiBmYWxzZSxcbiAgICAgIGlzVHdlYWtzRWRpdG9yT3BlbjogZmFsc2UsXG4gICAgICBjb21tZW50czogW10sXG4gICAgICAuLi5wYXRjaCxcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gZGlzcGF0Y2hCcm93c2VyU2lkZWJhck1lc3NhZ2UobWVzc2FnZSkge1xuICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBNZXNzYWdlRXZlbnQoXCJtZXNzYWdlXCIsIHsgZGF0YTogbWVzc2FnZSB9KSk7XG4gIH1cblxuICBmdW5jdGlvbiBzZWVkQnJvd3NlclNpZGViYXJMb2NhbFNlcnZlcnMoY29udmVyc2F0aW9uSWQpIHtcbiAgICBpZiAoIWNvbnZlcnNhdGlvbklkIHx8IGJyb3dzZXJTaWRlYmFyU2VlZGVkTG9jYWxTZXJ2ZXJzLmhhcyhjb252ZXJzYXRpb25JZCkpIHJldHVybjtcbiAgICBicm93c2VyU2lkZWJhclNlZWRlZExvY2FsU2VydmVycy5hZGQoY29udmVyc2F0aW9uSWQpO1xuICAgIHF1ZXVlTWljcm90YXNrKCgpID0+IHtcbiAgICAgIGRpc3BhdGNoQnJvd3NlclNpZGViYXJNZXNzYWdlKHtcbiAgICAgICAgdHlwZTogXCJicm93c2VyLXNpZGViYXItbG9jYWwtc2VydmVyc1wiLFxuICAgICAgICBjb252ZXJzYXRpb25JZCxcbiAgICAgICAgc3RhdGU6IHsgaXNMb2FkaW5nOiBmYWxzZSwgc2VydmVyczogW10sIGhpZGRlblNlcnZlcnM6IFtdIH0sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbWVtYmVyQnJvd3NlclNpZGViYXJIb3N0TWVzc2FnZShtZXNzYWdlKSB7XG4gICAgaWYgKCFtZXNzYWdlIHx8IHR5cGVvZiBtZXNzYWdlICE9PSBcIm9iamVjdFwiKSByZXR1cm47XG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJicm93c2VyLXNpZGViYXItc3RhdGVcIikge1xuICAgICAgY29uc3QgY29udmVyc2F0aW9uSWQgPSBtZXNzYWdlLmNvbnZlcnNhdGlvbklkO1xuICAgICAgaWYgKCFjb252ZXJzYXRpb25JZCB8fCAhbWVzc2FnZS5zbmFwc2hvdCkgcmV0dXJuO1xuICAgICAgYnJvd3NlclNpZGViYXJTbmFwc2hvdHMuc2V0KGJyb3dzZXJTaWRlYmFyS2V5KGNvbnZlcnNhdGlvbklkLCBtZXNzYWdlLmJyb3dzZXJUYWJJZCksIG1lc3NhZ2Uuc25hcHNob3QpO1xuICAgIH0gZWxzZSBpZiAobWVzc2FnZS50eXBlID09PSBcImJyb3dzZXItc2lkZWJhci1sb2NhbC1zZXJ2ZXJzXCIpIHtcbiAgICAgIGlmIChtZXNzYWdlLmNvbnZlcnNhdGlvbklkKSBicm93c2VyU2lkZWJhclNlZWRlZExvY2FsU2VydmVycy5hZGQobWVzc2FnZS5jb252ZXJzYXRpb25JZCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2VuZEJyb3dzZXJTaWRlYmFyU25hcHNob3QoY29udmVyc2F0aW9uSWQsIGJyb3dzZXJUYWJJZCwgc25hcHNob3RQYXRjaCkge1xuICAgIGlmICghY29udmVyc2F0aW9uSWQpIHJldHVybjtcbiAgICBjb25zdCBrZXkgPSBicm93c2VyU2lkZWJhcktleShjb252ZXJzYXRpb25JZCwgYnJvd3NlclRhYklkKTtcbiAgICBjb25zdCBwcmV2aW91cyA9IGJyb3dzZXJTaWRlYmFyU25hcHNob3RzLmdldChrZXkpIHx8IG1ha2VCcm93c2VyU2lkZWJhclNuYXBzaG90KFwiXCIpO1xuICAgIGNvbnN0IG5leHQgPSB7IC4uLnByZXZpb3VzLCAuLi5zbmFwc2hvdFBhdGNoIH07XG4gICAgYnJvd3NlclNpZGViYXJTbmFwc2hvdHMuc2V0KGtleSwgbmV4dCk7XG4gICAgZGlzcGF0Y2hCcm93c2VyU2lkZWJhck1lc3NhZ2Uoe1xuICAgICAgdHlwZTogXCJicm93c2VyLXNpZGViYXItc3RhdGVcIixcbiAgICAgIGNvbnZlcnNhdGlvbklkLFxuICAgICAgLi4uKGJyb3dzZXJUYWJJZCA/IHsgYnJvd3NlclRhYklkIH0gOiB7fSksXG4gICAgICBzbmFwc2hvdDogbmV4dCxcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldEJyb3dzZXJTaWRlYmFyVXJsKGNvbnZlcnNhdGlvbklkLCBicm93c2VyVGFiSWQsIHVybCwgaXNMb2FkaW5nID0gZmFsc2UpIHtcbiAgICBjb25zdCBub3JtYWxpemVkID0gbm9ybWFsaXplQnJvd3NlclVybCh1cmwpO1xuICAgIHNlbmRCcm93c2VyU2lkZWJhclNuYXBzaG90KGNvbnZlcnNhdGlvbklkLCBicm93c2VyVGFiSWQsIG1ha2VCcm93c2VyU2lkZWJhclNuYXBzaG90KG5vcm1hbGl6ZWQsIHsgaXNMb2FkaW5nIH0pKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbmRCcm93c2VyU2lkZWJhckZyYW1lKGNvbnZlcnNhdGlvbklkLCBicm93c2VyVGFiSWQpIHtcbiAgICBjb25zdCBzZWxlY3RvciA9IFwiW2RhdGEtYnJvd3Nlci1zaWRlYmFyLWNvbnZlcnNhdGlvbi1pZD0nXCIgKyBjc3NFc2NhcGUoY29udmVyc2F0aW9uSWQpICsgXCInXVtkYXRhLWJyb3dzZXItc2lkZWJhci1icm93c2VyLXRhYi1pZD0nXCIgKyBjc3NFc2NhcGUoYnJvd3NlclRhYklkIHx8IGxlZ2FjeUJyb3dzZXJUYWJJZChjb252ZXJzYXRpb25JZCkpICsgXCInXVwiO1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNzc0VzY2FwZSh2YWx1ZSkge1xuICAgIGlmICh3aW5kb3cuQ1NTICYmIHR5cGVvZiB3aW5kb3cuQ1NTLmVzY2FwZSA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4gd2luZG93LkNTUy5lc2NhcGUoU3RyaW5nKHZhbHVlKSk7XG4gICAgcmV0dXJuIFN0cmluZyh2YWx1ZSkucmVwbGFjZSgvWydcXFxcXFxcXF0vZywgXCJcXFxcXFxcXCQmXCIpO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlQnJvd3NlclNpZGViYXJWaWV3TWVzc2FnZShtZXNzYWdlKSB7XG4gICAgaWYgKCFtZXNzYWdlIHx8IHR5cGVvZiBtZXNzYWdlICE9PSBcIm9iamVjdFwiKSByZXR1cm47XG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJicm93c2VyLXNpZGViYXItc3luY1wiKSB7XG4gICAgICBjb25zdCBwYXlsb2FkID0gbWVzc2FnZS5wYXlsb2FkIHx8IHt9O1xuICAgICAgc2VlZEJyb3dzZXJTaWRlYmFyTG9jYWxTZXJ2ZXJzKHBheWxvYWQuY29udmVyc2F0aW9uSWQpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAobWVzc2FnZS50eXBlID09PSBcImJyb3dzZXItc2lkZWJhci1vd25lci1zeW5jXCIpIHtcbiAgICAgIHNlZWRCcm93c2VyU2lkZWJhckxvY2FsU2VydmVycyhtZXNzYWdlLmNvbnZlcnNhdGlvbklkKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKG1lc3NhZ2UudHlwZSAhPT0gXCJicm93c2VyLXNpZGViYXItY29tbWFuZFwiKSByZXR1cm47XG5cbiAgICBjb25zdCBjb252ZXJzYXRpb25JZCA9IG1lc3NhZ2UuY29udmVyc2F0aW9uSWQ7XG4gICAgY29uc3QgYnJvd3NlclRhYklkID0gbWVzc2FnZS5icm93c2VyVGFiSWQ7XG4gICAgY29uc3QgY29tbWFuZCA9IG1lc3NhZ2UuY29tbWFuZCB8fCB7fTtcbiAgICBzZWVkQnJvd3NlclNpZGViYXJMb2NhbFNlcnZlcnMoY29udmVyc2F0aW9uSWQpO1xuXG4gICAgaWYgKGNvbW1hbmQudHlwZSA9PT0gXCJuYXZpZ2F0ZVwiKSB7XG4gICAgICBjb25zdCBub3JtYWxpemVkID0gbm9ybWFsaXplQnJvd3NlclVybChjb21tYW5kLnVybCk7XG4gICAgICBzZXRCcm93c2VyU2lkZWJhclVybChjb252ZXJzYXRpb25JZCwgYnJvd3NlclRhYklkLCBub3JtYWxpemVkLCB0cnVlKTtcbiAgICAgIHF1ZXVlTWljcm90YXNrKCgpID0+IHtcbiAgICAgICAgY29uc3QgZnJhbWUgPSBmaW5kQnJvd3NlclNpZGViYXJGcmFtZShjb252ZXJzYXRpb25JZCwgYnJvd3NlclRhYklkKTtcbiAgICAgICAgaWYgKCFmcmFtZSB8fCAhbm9ybWFsaXplZCB8fCBmcmFtZS5nZXRVUkw/LigpID09PSBub3JtYWxpemVkKSByZXR1cm47XG4gICAgICAgIGZyYW1lLmxvYWRVUkw/Lihub3JtYWxpemVkKTtcbiAgICAgIH0pO1xuICAgICAgd2luZG93LnNldFRpbWVvdXQoKCkgPT4gc2V0QnJvd3NlclNpZGViYXJVcmwoY29udmVyc2F0aW9uSWQsIGJyb3dzZXJUYWJJZCwgbm9ybWFsaXplZCwgZmFsc2UpLCA1MDApO1xuICAgIH0gZWxzZSBpZiAoY29tbWFuZC50eXBlID09PSBcInJlbG9hZFwiKSB7XG4gICAgICBjb25zdCBmcmFtZSA9IGZpbmRCcm93c2VyU2lkZWJhckZyYW1lKGNvbnZlcnNhdGlvbklkLCBicm93c2VyVGFiSWQpO1xuICAgICAgZnJhbWU/LnJlbG9hZD8uKCk7XG4gICAgICBjb25zdCBjdXJyZW50ID0gYnJvd3NlclNpZGViYXJTbmFwc2hvdHMuZ2V0KGJyb3dzZXJTaWRlYmFyS2V5KGNvbnZlcnNhdGlvbklkLCBicm93c2VyVGFiSWQpKTtcbiAgICAgIGlmIChjdXJyZW50Py51cmwpIHtcbiAgICAgICAgc2VuZEJyb3dzZXJTaWRlYmFyU25hcHNob3QoY29udmVyc2F0aW9uSWQsIGJyb3dzZXJUYWJJZCwgeyAuLi5jdXJyZW50LCBpc0xvYWRpbmc6IHRydWUgfSk7XG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHNlbmRCcm93c2VyU2lkZWJhclNuYXBzaG90KGNvbnZlcnNhdGlvbklkLCBicm93c2VyVGFiSWQsIHsgLi4uY3VycmVudCwgaXNMb2FkaW5nOiBmYWxzZSB9KSwgMjUwKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNvbW1hbmQudHlwZSA9PT0gXCJnby1iYWNrXCIpIHtcbiAgICAgIGZpbmRCcm93c2VyU2lkZWJhckZyYW1lKGNvbnZlcnNhdGlvbklkLCBicm93c2VyVGFiSWQpPy5nb0JhY2s/LigpO1xuICAgIH0gZWxzZSBpZiAoY29tbWFuZC50eXBlID09PSBcImdvLWZvcndhcmRcIikge1xuICAgICAgZmluZEJyb3dzZXJTaWRlYmFyRnJhbWUoY29udmVyc2F0aW9uSWQsIGJyb3dzZXJUYWJJZCk/LmdvRm9yd2FyZD8uKCk7XG4gICAgfSBlbHNlIGlmIChjb21tYW5kLnR5cGUgPT09IFwic3RvcFwiKSB7XG4gICAgICBjb25zdCBjdXJyZW50ID0gYnJvd3NlclNpZGViYXJTbmFwc2hvdHMuZ2V0KGJyb3dzZXJTaWRlYmFyS2V5KGNvbnZlcnNhdGlvbklkLCBicm93c2VyVGFiSWQpKTtcbiAgICAgIGlmIChjdXJyZW50KSBzZW5kQnJvd3NlclNpZGViYXJTbmFwc2hvdChjb252ZXJzYXRpb25JZCwgYnJvd3NlclRhYklkLCB7IC4uLmN1cnJlbnQsIGlzTG9hZGluZzogZmFsc2UgfSk7XG4gICAgfSBlbHNlIGlmIChjb21tYW5kLnR5cGUgPT09IFwicmVzZXRcIiB8fCBjb21tYW5kLnR5cGUgPT09IFwiY2xvc2UtdGFiXCIpIHtcbiAgICAgIHNlbmRCcm93c2VyU2lkZWJhclNuYXBzaG90KGNvbnZlcnNhdGlvbklkLCBicm93c2VyVGFiSWQsIG1ha2VCcm93c2VyU2lkZWJhclNuYXBzaG90KFwiXCIpKTtcbiAgICB9XG4gIH1cblxuICB3aW5kb3cuY29kZXhXaW5kb3dUeXBlID0gXCJlbGVjdHJvblwiO1xuICB3aW5kb3cuZWxlY3Ryb25CcmlkZ2UgPSB7XG4gICAgd2luZG93VHlwZTogXCJlbGVjdHJvblwiLFxuICAgIHNlbmRNZXNzYWdlRnJvbVZpZXc6IChtZXNzYWdlKSA9PiB7XG4gICAgICBpZiAobWVzc2FnZSAmJiBtZXNzYWdlLnR5cGUgPT09IFwic2hhcmVkLW9iamVjdC1zZXRcIikgc25hcHNob3Quc2V0KG1lc3NhZ2Uua2V5LCBtZXNzYWdlLnZhbHVlKTtcbiAgICAgIGhhbmRsZUJyb3dzZXJTaWRlYmFyVmlld01lc3NhZ2UobWVzc2FnZSk7XG4gICAgICByZXR1cm4gYnJpZGdlKFwic2VuZE1lc3NhZ2VGcm9tVmlld1wiLCBbbWVzc2FnZV0pO1xuICAgIH0sXG4gICAgZ2V0UGF0aEZvckZpbGU6ICgpID0+IG51bGwsXG4gICAgc2VuZFdvcmtlck1lc3NhZ2VGcm9tVmlldzogKHdvcmtlcklkLCBtZXNzYWdlKSA9PiBicmlkZ2UoXCJzZW5kV29ya2VyTWVzc2FnZUZyb21WaWV3XCIsIFt3b3JrZXJJZCwgbWVzc2FnZV0pLFxuICAgIHN1YnNjcmliZVRvV29ya2VyTWVzc2FnZXM6ICh3b3JrZXJJZCwgaGFuZGxlcikgPT4ge1xuICAgICAgbGV0IHN1YnMgPSB3b3JrZXJTdWJzY3JpYmVycy5nZXQod29ya2VySWQpO1xuICAgICAgaWYgKCFzdWJzKSB7XG4gICAgICAgIHN1YnMgPSBuZXcgU2V0KCk7XG4gICAgICAgIHdvcmtlclN1YnNjcmliZXJzLnNldCh3b3JrZXJJZCwgc3Vicyk7XG4gICAgICAgIGJyaWRnZShcInN1YnNjcmliZVdvcmtlck1lc3NhZ2VzXCIsIFt3b3JrZXJJZF0pLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xuICAgICAgfVxuICAgICAgc3Vicy5hZGQoaGFuZGxlcik7XG4gICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICBjb25zdCBjdXJyZW50ID0gd29ya2VyU3Vic2NyaWJlcnMuZ2V0KHdvcmtlcklkKTtcbiAgICAgICAgaWYgKCFjdXJyZW50KSByZXR1cm47XG4gICAgICAgIGN1cnJlbnQuZGVsZXRlKGhhbmRsZXIpO1xuICAgICAgICBpZiAoY3VycmVudC5zaXplID09PSAwKSB7XG4gICAgICAgICAgd29ya2VyU3Vic2NyaWJlcnMuZGVsZXRlKHdvcmtlcklkKTtcbiAgICAgICAgICBicmlkZ2UoXCJ1bnN1YnNjcmliZVdvcmtlck1lc3NhZ2VzXCIsIFt3b3JrZXJJZF0pLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0sXG4gICAgc2hvd0NvbnRleHRNZW51OiAoaXRlbXMpID0+IGJyaWRnZShcInNob3dDb250ZXh0TWVudVwiLCBbaXRlbXNdKSxcbiAgICBzaG93QXBwbGljYXRpb25NZW51OiAobWVudUlkLCB4LCB5KSA9PiBicmlkZ2UoXCJzaG93QXBwbGljYXRpb25NZW51XCIsIFttZW51SWQsIHgsIHldKSxcbiAgICBnZXRGYXN0TW9kZVJvbGxvdXRNZXRyaWNzOiAocGFyYW1zKSA9PiBicmlkZ2UoXCJnZXRGYXN0TW9kZVJvbGxvdXRNZXRyaWNzXCIsIFtwYXJhbXNdKSxcbiAgICBnZXRTaGFyZWRPYmplY3RTbmFwc2hvdFZhbHVlOiAoa2V5KSA9PiBzbmFwc2hvdC5nZXQoa2V5KSxcbiAgICBnZXRTeXN0ZW1UaGVtZVZhcmlhbnQ6ICgpID0+IHN5c3RlbVRoZW1lVmFyaWFudCxcbiAgICBzdWJzY3JpYmVUb1N5c3RlbVRoZW1lVmFyaWFudDogKGhhbmRsZXIpID0+IHtcbiAgICAgIHRoZW1lU3Vic2NyaWJlcnMuYWRkKGhhbmRsZXIpO1xuICAgICAgcmV0dXJuICgpID0+IHRoZW1lU3Vic2NyaWJlcnMuZGVsZXRlKGhhbmRsZXIpO1xuICAgIH0sXG4gICAgdHJpZ2dlclNlbnRyeVRlc3RFcnJvcjogKCkgPT4gYnJpZGdlKFwidHJpZ2dlclNlbnRyeVRlc3RFcnJvclwiLCBbXSksXG4gICAgZ2V0U2VudHJ5SW5pdE9wdGlvbnM6ICgpID0+IG51bGwsXG4gICAgZ2V0QXBwU2Vzc2lvbklkOiAoKSA9PiBudWxsLFxuICAgIGdldEJ1aWxkRmxhdm9yOiAoKSA9PiBpbml0aWFsU3RhdGUuYnVpbGRGbGF2b3IsXG4gICAgaXNJbnRlbE1hY0J1aWxkOiAoKSA9PiBpbml0aWFsU3RhdGUucGxhdGZvcm0gPT09IFwiZGFyd2luXCIgJiYgaW5pdGlhbFN0YXRlLmFyY2ggPT09IFwieDY0XCIsXG4gICAgdXNlc093bEFwcFNoZWxsOiAoKSA9PiBpbml0aWFsU3RhdGUudXNlc093bEFwcFNoZWxsLFxuICB9O1xuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCAoZXZlbnQpID0+IHtcbiAgICBpZiAoZXZlbnQuc291cmNlICE9PSB3aW5kb3cgfHwgIWV2ZW50LmRhdGEgfHwgZXZlbnQuZGF0YS50eXBlICE9PSBcImNvbm5lY3QtYXBwLWhvc3RcIikgcmV0dXJuO1xuICAgIGNvbnN0IHBvcnQgPSBldmVudC5kYXRhLnBvcnQ7XG4gICAgaWYgKCFwb3J0KSByZXR1cm47XG4gICAgY29uc3Qgd3MgPSBuZXcgV2ViU29ja2V0KG5ldyBVUkwoXCIvY29kZXhwcC9icm93c2VyLXVpL3JwY1wiLCBsb2NhdGlvbi5ocmVmKSk7XG4gICAgd3MuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgKG1lc3NhZ2UpID0+IHBvcnQucG9zdE1lc3NhZ2UobWVzc2FnZS5kYXRhKSk7XG4gICAgd3MuYWRkRXZlbnRMaXN0ZW5lcihcImNsb3NlXCIsICgpID0+IHtcbiAgICAgIHRyeSB7IHBvcnQucG9zdE1lc3NhZ2UobnVsbCk7IH0gY2F0Y2gge31cbiAgICAgIHRyeSB7IHBvcnQuY2xvc2UoKTsgfSBjYXRjaCB7fVxuICAgIH0pO1xuICAgIHdzLmFkZEV2ZW50TGlzdGVuZXIoXCJvcGVuXCIsICgpID0+IHtcbiAgICAgIHBvcnQub25tZXNzYWdlID0gKG1lc3NhZ2UpID0+IHtcbiAgICAgICAgaWYgKG1lc3NhZ2UuZGF0YSA9PSBudWxsKSB7XG4gICAgICAgICAgd3MuY2xvc2UoKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgd3Muc2VuZChtZXNzYWdlLmRhdGEpO1xuICAgICAgfTtcbiAgICAgIHBvcnQuc3RhcnQgJiYgcG9ydC5zdGFydCgpO1xuICAgIH0pO1xuICB9KTtcblxuICBmdW5jdGlvbiBpbnN0YWxsQnJvd3NlclVpV2Vidmlld1NoaW0oKSB7XG4gICAgaWYgKHdpbmRvdy5fX2NvZGV4cHBXZWJ2aWV3U2hpbUluc3RhbGxlZCkgcmV0dXJuO1xuICAgIHdpbmRvdy5fX2NvZGV4cHBXZWJ2aWV3U2hpbUluc3RhbGxlZCA9IHRydWU7XG4gICAgY29uc3Qgb3JpZ2luYWxDcmVhdGVFbGVtZW50ID0gRG9jdW1lbnQucHJvdG90eXBlLmNyZWF0ZUVsZW1lbnQ7XG4gICAgRG9jdW1lbnQucHJvdG90eXBlLmNyZWF0ZUVsZW1lbnQgPSBmdW5jdGlvbih0YWdOYW1lLCBvcHRpb25zKSB7XG4gICAgICBpZiAoU3RyaW5nKHRhZ05hbWUpLnRvTG93ZXJDYXNlKCkgIT09IFwid2Vidmlld1wiKSB7XG4gICAgICAgIHJldHVybiBvcmlnaW5hbENyZWF0ZUVsZW1lbnQuY2FsbCh0aGlzLCB0YWdOYW1lLCBvcHRpb25zKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjcmVhdGVXZWJ2aWV3SWZyYW1lKHRoaXMpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVXZWJ2aWV3SWZyYW1lKGRvYykge1xuICAgICAgY29uc3QgaWZyYW1lID0gb3JpZ2luYWxDcmVhdGVFbGVtZW50LmNhbGwoZG9jLCBcImlmcmFtZVwiKTtcbiAgICAgIGlmcmFtZS5kYXRhc2V0LmNvZGV4cHBXZWJ2aWV3U2hpbSA9IFwidHJ1ZVwiO1xuICAgICAgaWZyYW1lLnN0eWxlLmJvcmRlciA9IFwiMFwiO1xuICAgICAgaWZyYW1lLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XG4gICAgICBpZnJhbWUuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gXCIjZmZmXCI7XG4gICAgICBpZnJhbWUuc2V0QXR0cmlidXRlKFwiYWxsb3dcIiwgXCJhdXRvcGxheTsgY2xpcGJvYXJkLXJlYWQ7IGNsaXBib2FyZC13cml0ZTsgZGlzcGxheS1jYXB0dXJlOyBmdWxsc2NyZWVuOyBtaWNyb3Bob25lOyBjYW1lcmFcIik7XG4gICAgICBjb25zdCBuYXRpdmVTZXRBdHRyaWJ1dGUgPSBpZnJhbWUuc2V0QXR0cmlidXRlLmJpbmQoaWZyYW1lKTtcbiAgICAgIGNvbnN0IG5hdGl2ZUdldEF0dHJpYnV0ZSA9IGlmcmFtZS5nZXRBdHRyaWJ1dGUuYmluZChpZnJhbWUpO1xuXG4gICAgICB0cnkge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoaWZyYW1lLCBcInRhZ05hbWVcIiwgeyBjb25maWd1cmFibGU6IHRydWUsIGdldDogKCkgPT4gXCJXRUJWSUVXXCIgfSk7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShpZnJhbWUsIFwibm9kZU5hbWVcIiwgeyBjb25maWd1cmFibGU6IHRydWUsIGdldDogKCkgPT4gXCJXRUJWSUVXXCIgfSk7XG4gICAgICB9IGNhdGNoIHt9XG5cbiAgICAgIGNvbnN0IGVtaXQgPSAodHlwZSwgZXh0cmEgPSB7fSkgPT4ge1xuICAgICAgICBjb25zdCBldmVudCA9IG5ldyBFdmVudCh0eXBlKTtcbiAgICAgICAgT2JqZWN0LmFzc2lnbihldmVudCwgZXh0cmEpO1xuICAgICAgICBpZnJhbWUuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICB9O1xuICAgICAgY29uc3QgY3VycmVudFVybCA9ICgpID0+IGlmcmFtZS5kYXRhc2V0LmNvZGV4cHBSZXF1ZXN0ZWRTcmMgfHwgbmF0aXZlR2V0QXR0cmlidXRlKFwic3JjXCIpIHx8IFwiYWJvdXQ6YmxhbmtcIjtcbiAgICAgIGNvbnN0IGFjdHVhbEZyYW1lVXJsID0gKHVybCkgPT4ge1xuICAgICAgICBjb25zdCByZXF1ZXN0ZWQgPSBTdHJpbmcodXJsIHx8IFwiYWJvdXQ6YmxhbmtcIik7XG4gICAgICAgIGlmICghc2hvdWxkQnJlYWtSZWN1cnNpdmVGcmFtZUxvYWQocmVxdWVzdGVkKSkgcmV0dXJuIHJlcXVlc3RlZDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBuZXh0ID0gbmV3IFVSTChyZXF1ZXN0ZWQsIGxvY2F0aW9uLmhyZWYpO1xuICAgICAgICAgIG5leHQuc2VhcmNoUGFyYW1zLnNldChcIl9fY29kZXhwcF9mcmFtZV9kZXB0aFwiLCBTdHJpbmcoZnJhbWVBbmNlc3RvckRlcHRoKCkgKyAxKSk7XG4gICAgICAgICAgcmV0dXJuIG5leHQuaHJlZjtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgcmV0dXJuIHJlcXVlc3RlZDtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGNvbnN0IHNldEZyYW1lVXJsID0gKHVybCkgPT4ge1xuICAgICAgICBjb25zdCByZXF1ZXN0ZWQgPSBTdHJpbmcodXJsIHx8IFwiYWJvdXQ6YmxhbmtcIik7XG4gICAgICAgIGlmcmFtZS5kYXRhc2V0LmNvZGV4cHBSZXF1ZXN0ZWRTcmMgPSByZXF1ZXN0ZWQ7XG4gICAgICAgIG5hdGl2ZVNldEF0dHJpYnV0ZShcInNyY1wiLCBhY3R1YWxGcmFtZVVybChyZXF1ZXN0ZWQpKTtcbiAgICAgIH07XG4gICAgICBjb25zdCBuYXZpZ2F0ZSA9ICh1cmwpID0+IHtcbiAgICAgICAgY29uc3QgbmV4dCA9IFN0cmluZyh1cmwgfHwgXCJhYm91dDpibGFua1wiKTtcbiAgICAgICAgZW1pdChcImRpZC1zdGFydC1sb2FkaW5nXCIsIHsgdXJsOiBuZXh0IH0pO1xuICAgICAgICBzZXRGcmFtZVVybChuZXh0KTtcbiAgICAgIH07XG5cbiAgICAgIGlmcmFtZS5zZXRBdHRyaWJ1dGUgPSAobmFtZSwgdmFsdWUpID0+IHtcbiAgICAgICAgaWYgKFN0cmluZyhuYW1lKS50b0xvd2VyQ2FzZSgpID09PSBcInNyY1wiKSB7XG4gICAgICAgICAgc2V0RnJhbWVVcmwodmFsdWUpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBuYXRpdmVTZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICAgICAgfTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGlmcmFtZSwgXCJzcmNcIiwge1xuICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgICBnZXQ6ICgpID0+IGN1cnJlbnRVcmwoKSxcbiAgICAgICAgICBzZXQ6ICh2YWx1ZSkgPT4gc2V0RnJhbWVVcmwodmFsdWUpLFxuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2gge31cblxuICAgICAgaWZyYW1lLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsICgpID0+IHtcbiAgICAgICAgY29uc3QgdXJsID0gY3VycmVudFVybCgpO1xuICAgICAgICBlbWl0KFwiZG9tLXJlYWR5XCIsIHsgdXJsIH0pO1xuICAgICAgICBlbWl0KFwiZGlkLW5hdmlnYXRlXCIsIHsgdXJsIH0pO1xuICAgICAgICBlbWl0KFwiZGlkLXN0b3AtbG9hZGluZ1wiLCB7IHVybCB9KTtcbiAgICAgICAgZW1pdChcImRpZC1maW5pc2gtbG9hZFwiLCB7IHVybCB9KTtcbiAgICAgICAgbGV0IHRpdGxlID0gXCJcIjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB0aXRsZSA9IGlmcmFtZS5jb250ZW50RG9jdW1lbnQ/LnRpdGxlIHx8IFwiXCI7XG4gICAgICAgIH0gY2F0Y2gge31cbiAgICAgICAgY29uc3QgY29udmVyc2F0aW9uSWQgPSBpZnJhbWUuZ2V0QXR0cmlidXRlKFwiZGF0YS1icm93c2VyLXNpZGViYXItY29udmVyc2F0aW9uLWlkXCIpO1xuICAgICAgICBjb25zdCBicm93c2VyVGFiSWQgPSBpZnJhbWUuZ2V0QXR0cmlidXRlKFwiZGF0YS1icm93c2VyLXNpZGViYXItYnJvd3Nlci10YWItaWRcIik7XG4gICAgICAgIGlmIChjb252ZXJzYXRpb25JZCkge1xuICAgICAgICAgIHNlbmRCcm93c2VyU2lkZWJhclNuYXBzaG90KGNvbnZlcnNhdGlvbklkLCBicm93c2VyVGFiSWQsIG1ha2VCcm93c2VyU2lkZWJhclNuYXBzaG90KHVybCwge1xuICAgICAgICAgICAgdGl0bGU6IHRpdGxlIHx8IGJyb3dzZXJUaXRsZUZvclVybCh1cmwpLFxuICAgICAgICAgICAgaXNMb2FkaW5nOiBmYWxzZSxcbiAgICAgICAgICB9KSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRpdGxlKSBlbWl0KFwicGFnZS10aXRsZS11cGRhdGVkXCIsIHsgdGl0bGUgfSk7XG4gICAgICB9KTtcbiAgICAgIGlmcmFtZS5hZGRFdmVudExpc3RlbmVyKFwiZXJyb3JcIiwgKCkgPT4ge1xuICAgICAgICBlbWl0KFwiZGlkLWZhaWwtbG9hZFwiLCB7IGVycm9yQ29kZTogLTIsIGVycm9yRGVzY3JpcHRpb246IFwiaWZyYW1lIGxvYWQgZmFpbGVkXCIsIHZhbGlkYXRlZFVSTDogY3VycmVudFVybCgpIH0pO1xuICAgICAgICBlbWl0KFwiZGlkLXN0b3AtbG9hZGluZ1wiLCB7IHVybDogY3VycmVudFVybCgpIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKGlmcmFtZSwge1xuICAgICAgICBkZXN0cm95OiB7IHZhbHVlOiAoKSA9PiBpZnJhbWUucmVtb3ZlKCkgfSxcbiAgICAgICAgZ2V0VVJMOiB7IHZhbHVlOiAoKSA9PiBjdXJyZW50VXJsKCkgfSxcbiAgICAgICAgZ2V0VGl0bGU6IHtcbiAgICAgICAgICB2YWx1ZTogKCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgcmV0dXJuIGlmcmFtZS5jb250ZW50RG9jdW1lbnQ/LnRpdGxlIHx8IFwiXCI7XG4gICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgbG9hZFVSTDogeyB2YWx1ZTogKHVybCkgPT4geyBuYXZpZ2F0ZSh1cmwpOyByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7IH0gfSxcbiAgICAgICAgcmVsb2FkOiB7XG4gICAgICAgICAgdmFsdWU6ICgpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGlmcmFtZS5jb250ZW50V2luZG93Py5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICBuYXZpZ2F0ZShjdXJyZW50VXJsKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHN0b3A6IHsgdmFsdWU6ICgpID0+IHt9IH0sXG4gICAgICAgIGNhbkdvQmFjazogeyB2YWx1ZTogKCkgPT4gZmFsc2UgfSxcbiAgICAgICAgY2FuR29Gb3J3YXJkOiB7IHZhbHVlOiAoKSA9PiBmYWxzZSB9LFxuICAgICAgICBnb0JhY2s6IHtcbiAgICAgICAgICB2YWx1ZTogKCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgaWZyYW1lLmNvbnRlbnRXaW5kb3c/Lmhpc3RvcnkuYmFjaygpO1xuICAgICAgICAgICAgfSBjYXRjaCB7fVxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGdvRm9yd2FyZDoge1xuICAgICAgICAgIHZhbHVlOiAoKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBpZnJhbWUuY29udGVudFdpbmRvdz8uaGlzdG9yeS5mb3J3YXJkKCk7XG4gICAgICAgICAgICB9IGNhdGNoIHt9XG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgZXhlY3V0ZUphdmFTY3JpcHQ6IHtcbiAgICAgICAgICB2YWx1ZTogKGNvZGUpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoaWZyYW1lLmNvbnRlbnRXaW5kb3c/LmV2YWwoU3RyaW5nKGNvZGUpKSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGluc2VydENTUzogeyB2YWx1ZTogKCkgPT4gUHJvbWlzZS5yZXNvbHZlKFwiXCIpIH0sXG4gICAgICAgIG9wZW5EZXZUb29sczogeyB2YWx1ZTogKCkgPT4ge30gfSxcbiAgICAgICAgY2xvc2VEZXZUb29sczogeyB2YWx1ZTogKCkgPT4ge30gfSxcbiAgICAgICAgaXNEZXZUb29sc09wZW5lZDogeyB2YWx1ZTogKCkgPT4gZmFsc2UgfSxcbiAgICAgICAgc2VuZDogeyB2YWx1ZTogKCkgPT4ge30gfSxcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gaWZyYW1lO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZyYW1lQW5jZXN0b3JEZXB0aCgpIHtcbiAgICAgIGxldCBkZXB0aCA9IDA7XG4gICAgICBsZXQgY3VycmVudCA9IHdpbmRvdztcbiAgICAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0KCk7XG4gICAgICB3aGlsZSAoY3VycmVudCAmJiAhc2Vlbi5oYXMoY3VycmVudCkpIHtcbiAgICAgICAgc2Vlbi5hZGQoY3VycmVudCk7XG4gICAgICAgIGxldCBwYXJlbnQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcGFyZW50ID0gY3VycmVudC5wYXJlbnQ7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwYXJlbnQgPT09IGN1cnJlbnQpIGJyZWFrO1xuICAgICAgICBkZXB0aCArPSAxO1xuICAgICAgICBjdXJyZW50ID0gcGFyZW50O1xuICAgICAgfVxuICAgICAgcmV0dXJuIGRlcHRoO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3VsZEJyZWFrUmVjdXJzaXZlRnJhbWVMb2FkKHVybCkge1xuICAgICAgbGV0IHRhcmdldDtcbiAgICAgIHRyeSB7XG4gICAgICAgIHRhcmdldCA9IG5ldyBVUkwodXJsLCBsb2NhdGlvbi5ocmVmKS5ocmVmO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGxldCBjdXJyZW50ID0gd2luZG93O1xuICAgICAgY29uc3Qgc2VlbiA9IG5ldyBTZXQoKTtcbiAgICAgIHdoaWxlIChjdXJyZW50ICYmICFzZWVuLmhhcyhjdXJyZW50KSkge1xuICAgICAgICBzZWVuLmFkZChjdXJyZW50KTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBpZiAobmV3IFVSTChjdXJyZW50LmxvY2F0aW9uLmhyZWYpLmhyZWYgPT09IHRhcmdldCkgcmV0dXJuIHRydWU7XG4gICAgICAgICAgaWYgKGN1cnJlbnQucGFyZW50ID09PSBjdXJyZW50KSBicmVhaztcbiAgICAgICAgICBjdXJyZW50ID0gY3VycmVudC5wYXJlbnQ7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxufSkoKTtcbmA7XG59XG5cbmZ1bmN0aW9uIGhpZGVWaXNpYmxlQ29kZXhXaW5kb3dzKCk6IHZvaWQge1xuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJkYXJ3aW5cIikge1xuICAgIHRyeSB7XG4gICAgICBhcHAuaGlkZSgpO1xuICAgIH0gY2F0Y2gge31cbiAgfVxuICBmb3IgKGNvbnN0IHdpbiBvZiBCcm93c2VyV2luZG93LmdldEFsbFdpbmRvd3MoKSkge1xuICAgIGlmICh3aW4uaXNEZXN0cm95ZWQoKSkgY29udGludWU7XG4gICAgaWYgKGFjdGl2ZUhvc3QgJiYgd2luLndlYkNvbnRlbnRzLmlkID09PSBhY3RpdmVIb3N0LndlYkNvbnRlbnRzLmlkKSBjb250aW51ZTtcbiAgICBpZiAoIXdpbi5pc1Zpc2libGUoKSkgY29udGludWU7XG4gICAgdHJ5IHtcbiAgICAgIHdpbi5oaWRlKCk7XG4gICAgfSBjYXRjaCB7fVxuICB9XG59XG5cbmZ1bmN0aW9uIG1ha2VXaW5kb3dMaWtlRm9yVmlldyh2aWV3OiBFbGVjdHJvbi5Ccm93c2VyVmlldyk6IENvZGV4V2luZG93TGlrZSB7XG4gIGNvbnN0IHZpZXdCb3VuZHMgPSAoKSA9PiB2aWV3LmdldEJvdW5kcygpO1xuICByZXR1cm4ge1xuICAgIGlkOiB2aWV3LndlYkNvbnRlbnRzLmlkLFxuICAgIHdlYkNvbnRlbnRzOiB2aWV3LndlYkNvbnRlbnRzLFxuICAgIG9uOiAoZXZlbnQ6IFwiY2xvc2VkXCIsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKSA9PiB7XG4gICAgICBpZiAoZXZlbnQgPT09IFwiY2xvc2VkXCIpIHZpZXcud2ViQ29udGVudHMub25jZShcImRlc3Ryb3llZFwiLCBsaXN0ZW5lcik7XG4gICAgICBlbHNlIHZpZXcud2ViQ29udGVudHMub24oZXZlbnQsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB2aWV3O1xuICAgIH0sXG4gICAgb25jZTogKGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKSA9PiB7XG4gICAgICB2aWV3LndlYkNvbnRlbnRzLm9uY2UoZXZlbnQgYXMgXCJkZXN0cm95ZWRcIiwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHZpZXc7XG4gICAgfSxcbiAgICBvZmY6IChldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCkgPT4ge1xuICAgICAgdmlldy53ZWJDb250ZW50cy5vZmYoZXZlbnQgYXMgXCJkZXN0cm95ZWRcIiwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHZpZXc7XG4gICAgfSxcbiAgICByZW1vdmVMaXN0ZW5lcjogKGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKSA9PiB7XG4gICAgICB2aWV3LndlYkNvbnRlbnRzLnJlbW92ZUxpc3RlbmVyKGV2ZW50IGFzIFwiZGVzdHJveWVkXCIsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB2aWV3O1xuICAgIH0sXG4gICAgaXNEZXN0cm95ZWQ6ICgpID0+IHZpZXcud2ViQ29udGVudHMuaXNEZXN0cm95ZWQoKSxcbiAgICBpc0ZvY3VzZWQ6ICgpID0+IHZpZXcud2ViQ29udGVudHMuaXNGb2N1c2VkKCksXG4gICAgZm9jdXM6ICgpID0+IHZpZXcud2ViQ29udGVudHMuZm9jdXMoKSxcbiAgICBzaG93OiAoKSA9PiB7fSxcbiAgICBoaWRlOiAoKSA9PiB7fSxcbiAgICBnZXRCb3VuZHM6IHZpZXdCb3VuZHMsXG4gICAgZ2V0Q29udGVudEJvdW5kczogdmlld0JvdW5kcyxcbiAgICBnZXRTaXplOiAoKSA9PiB7XG4gICAgICBjb25zdCBiID0gdmlld0JvdW5kcygpO1xuICAgICAgcmV0dXJuIFtiLndpZHRoLCBiLmhlaWdodF07XG4gICAgfSxcbiAgICBnZXRDb250ZW50U2l6ZTogKCkgPT4ge1xuICAgICAgY29uc3QgYiA9IHZpZXdCb3VuZHMoKTtcbiAgICAgIHJldHVybiBbYi53aWR0aCwgYi5oZWlnaHRdO1xuICAgIH0sXG4gICAgc2V0VGl0bGU6ICgpID0+IHt9LFxuICAgIGdldFRpdGxlOiAoKSA9PiBcIlwiLFxuICAgIHNldFJlcHJlc2VudGVkRmlsZW5hbWU6ICgpID0+IHt9LFxuICAgIHNldERvY3VtZW50RWRpdGVkOiAoKSA9PiB7fSxcbiAgICBzZXRXaW5kb3dCdXR0b25WaXNpYmlsaXR5OiAoKSA9PiB7fSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gYWNjZXB0V2ViU29ja2V0KHJlcTogSW5jb21pbmdNZXNzYWdlLCBzb2NrZXQ6IFNvY2tldCwgaGVhZDogQnVmZmVyKTogV2ViU29ja2V0Q29ubmVjdGlvbiB7XG4gIGNvbnN0IGtleSA9IHJlcS5oZWFkZXJzW1wic2VjLXdlYnNvY2tldC1rZXlcIl07XG4gIGlmICh0eXBlb2Yga2V5ICE9PSBcInN0cmluZ1wiKSB0aHJvdyBuZXcgRXJyb3IoXCJtaXNzaW5nIFNlYy1XZWJTb2NrZXQtS2V5XCIpO1xuICBjb25zdCBhY2NlcHQgPSBjcmVhdGVIYXNoKFwic2hhMVwiKVxuICAgIC51cGRhdGUoYCR7a2V5fTI1OEVBRkE1LUU5MTQtNDdEQS05NUNBLUM1QUIwREM4NUIxMWApXG4gICAgLmRpZ2VzdChcImJhc2U2NFwiKTtcbiAgc29ja2V0LndyaXRlKFxuICAgIFtcbiAgICAgIFwiSFRUUC8xLjEgMTAxIFN3aXRjaGluZyBQcm90b2NvbHNcIixcbiAgICAgIFwiVXBncmFkZTogd2Vic29ja2V0XCIsXG4gICAgICBcIkNvbm5lY3Rpb246IFVwZ3JhZGVcIixcbiAgICAgIGBTZWMtV2ViU29ja2V0LUFjY2VwdDogJHthY2NlcHR9YCxcbiAgICAgIFwiXFxyXFxuXCIsXG4gICAgXS5qb2luKFwiXFxyXFxuXCIpLFxuICApO1xuICBjb25zdCB3cyA9IG5ldyBXZWJTb2NrZXRDb25uZWN0aW9uKHNvY2tldCk7XG4gIGlmIChoZWFkLmxlbmd0aCA+IDApIHdzLmFjY2VwdEhlYWQoaGVhZCk7XG4gIHJldHVybiB3cztcbn1cblxuY2xhc3MgV2ViU29ja2V0Q29ubmVjdGlvbiB7XG4gIHByaXZhdGUgYnVmZmVyID0gQnVmZmVyLmFsbG9jKDApO1xuICBwcml2YXRlIHRleHRIYW5kbGVycyA9IG5ldyBTZXQ8KHRleHQ6IHN0cmluZykgPT4gdm9pZD4oKTtcbiAgcHJpdmF0ZSBjbG9zZUhhbmRsZXJzID0gbmV3IFNldDwoKSA9PiB2b2lkPigpO1xuICBwcml2YXRlIGNsb3NlZCA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgc29ja2V0OiBTb2NrZXQpIHtcbiAgICBzb2NrZXQub24oXCJkYXRhXCIsIChjaHVuaykgPT4gdGhpcy5hY2NlcHRIZWFkKGNodW5rKSk7XG4gICAgc29ja2V0Lm9uKFwiY2xvc2VcIiwgKCkgPT4gdGhpcy5lbWl0Q2xvc2UoKSk7XG4gICAgc29ja2V0Lm9uKFwiZXJyb3JcIiwgKCkgPT4gdGhpcy5lbWl0Q2xvc2UoKSk7XG4gIH1cblxuICBhY2NlcHRIZWFkKGNodW5rOiBCdWZmZXIpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5jbG9zZWQpIHJldHVybjtcbiAgICB0aGlzLmJ1ZmZlciA9IEJ1ZmZlci5jb25jYXQoW3RoaXMuYnVmZmVyLCBjaHVua10pO1xuICAgIHRoaXMucmVhZEZyYW1lcygpO1xuICB9XG5cbiAgb25UZXh0KGhhbmRsZXI6ICh0ZXh0OiBzdHJpbmcpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLnRleHRIYW5kbGVycy5hZGQoaGFuZGxlcik7XG4gIH1cblxuICBvbkNsb3NlKGhhbmRsZXI6ICgpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLmNsb3NlSGFuZGxlcnMuYWRkKGhhbmRsZXIpO1xuICB9XG5cbiAgc2VuZEpzb24ocGF5bG9hZDogdW5rbm93bik6IHZvaWQge1xuICAgIHRoaXMuc2VuZFRleHQoSlNPTi5zdHJpbmdpZnkocGF5bG9hZCkpO1xuICB9XG5cbiAgc2VuZFRleHQodGV4dDogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5zZW5kRnJhbWUoMHgxLCBCdWZmZXIuZnJvbSh0ZXh0LCBcInV0ZjhcIikpO1xuICB9XG5cbiAgY2xvc2UoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuY2xvc2VkKSByZXR1cm47XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuc2VuZEZyYW1lKDB4OCwgQnVmZmVyLmFsbG9jKDApKTtcbiAgICB9IGNhdGNoIHt9XG4gICAgdGhpcy5jbG9zZWQgPSB0cnVlO1xuICAgIHRoaXMuc29ja2V0LmVuZCgpO1xuICAgIHRoaXMuZW1pdENsb3NlKCk7XG4gIH1cblxuICBwcml2YXRlIHJlYWRGcmFtZXMoKTogdm9pZCB7XG4gICAgd2hpbGUgKHRoaXMuYnVmZmVyLmxlbmd0aCA+PSAyKSB7XG4gICAgICBjb25zdCBmaXJzdCA9IHRoaXMuYnVmZmVyWzBdITtcbiAgICAgIGNvbnN0IHNlY29uZCA9IHRoaXMuYnVmZmVyWzFdITtcbiAgICAgIGNvbnN0IG9wY29kZSA9IGZpcnN0ICYgMHgwZjtcbiAgICAgIGNvbnN0IG1hc2tlZCA9IChzZWNvbmQgJiAweDgwKSAhPT0gMDtcbiAgICAgIGxldCBsZW5ndGggPSBzZWNvbmQgJiAweDdmO1xuICAgICAgbGV0IG9mZnNldCA9IDI7XG4gICAgICBpZiAobGVuZ3RoID09PSAxMjYpIHtcbiAgICAgICAgaWYgKHRoaXMuYnVmZmVyLmxlbmd0aCA8IG9mZnNldCArIDIpIHJldHVybjtcbiAgICAgICAgbGVuZ3RoID0gdGhpcy5idWZmZXIucmVhZFVJbnQxNkJFKG9mZnNldCk7XG4gICAgICAgIG9mZnNldCArPSAyO1xuICAgICAgfSBlbHNlIGlmIChsZW5ndGggPT09IDEyNykge1xuICAgICAgICBpZiAodGhpcy5idWZmZXIubGVuZ3RoIDwgb2Zmc2V0ICsgOCkgcmV0dXJuO1xuICAgICAgICBjb25zdCBoaWdoID0gdGhpcy5idWZmZXIucmVhZFVJbnQzMkJFKG9mZnNldCk7XG4gICAgICAgIGNvbnN0IGxvdyA9IHRoaXMuYnVmZmVyLnJlYWRVSW50MzJCRShvZmZzZXQgKyA0KTtcbiAgICAgICAgaWYgKGhpZ2ggIT09IDApIHtcbiAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGxlbmd0aCA9IGxvdztcbiAgICAgICAgb2Zmc2V0ICs9IDg7XG4gICAgICB9XG4gICAgICBjb25zdCBtYXNrT2Zmc2V0ID0gb2Zmc2V0O1xuICAgICAgaWYgKG1hc2tlZCkgb2Zmc2V0ICs9IDQ7XG4gICAgICBpZiAodGhpcy5idWZmZXIubGVuZ3RoIDwgb2Zmc2V0ICsgbGVuZ3RoKSByZXR1cm47XG5cbiAgICAgIGNvbnN0IG1hc2sgPSBtYXNrZWQgPyB0aGlzLmJ1ZmZlci5zdWJhcnJheShtYXNrT2Zmc2V0LCBtYXNrT2Zmc2V0ICsgNCkgOiBudWxsO1xuICAgICAgY29uc3QgcGF5bG9hZCA9IEJ1ZmZlci5mcm9tKHRoaXMuYnVmZmVyLnN1YmFycmF5KG9mZnNldCwgb2Zmc2V0ICsgbGVuZ3RoKSk7XG4gICAgICB0aGlzLmJ1ZmZlciA9IHRoaXMuYnVmZmVyLnN1YmFycmF5KG9mZnNldCArIGxlbmd0aCk7XG4gICAgICBpZiAobWFzaykge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBheWxvYWQubGVuZ3RoOyBpICs9IDEpIHBheWxvYWRbaV0gXj0gbWFza1tpICUgNF0hO1xuICAgICAgfVxuXG4gICAgICBpZiAob3Bjb2RlID09PSAweDgpIHtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgfSBlbHNlIGlmIChvcGNvZGUgPT09IDB4OSkge1xuICAgICAgICB0aGlzLnNlbmRGcmFtZSgweEEsIHBheWxvYWQpO1xuICAgICAgfSBlbHNlIGlmIChvcGNvZGUgPT09IDB4MSkge1xuICAgICAgICBjb25zdCB0ZXh0ID0gcGF5bG9hZC50b1N0cmluZyhcInV0ZjhcIik7XG4gICAgICAgIGZvciAoY29uc3QgaGFuZGxlciBvZiBbLi4udGhpcy50ZXh0SGFuZGxlcnNdKSBoYW5kbGVyKHRleHQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgc2VuZEZyYW1lKG9wY29kZTogbnVtYmVyLCBwYXlsb2FkOiBCdWZmZXIpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5jbG9zZWQgJiYgb3Bjb2RlICE9PSAweDgpIHJldHVybjtcbiAgICBjb25zdCBsZW5ndGggPSBwYXlsb2FkLmxlbmd0aDtcbiAgICBsZXQgaGVhZGVyOiBCdWZmZXI7XG4gICAgaWYgKGxlbmd0aCA8IDEyNikge1xuICAgICAgaGVhZGVyID0gQnVmZmVyLmZyb20oWzB4ODAgfCBvcGNvZGUsIGxlbmd0aF0pO1xuICAgIH0gZWxzZSBpZiAobGVuZ3RoIDw9IDB4ZmZmZikge1xuICAgICAgaGVhZGVyID0gQnVmZmVyLmFsbG9jKDQpO1xuICAgICAgaGVhZGVyWzBdID0gMHg4MCB8IG9wY29kZTtcbiAgICAgIGhlYWRlclsxXSA9IDEyNjtcbiAgICAgIGhlYWRlci53cml0ZVVJbnQxNkJFKGxlbmd0aCwgMik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGhlYWRlciA9IEJ1ZmZlci5hbGxvYygxMCk7XG4gICAgICBoZWFkZXJbMF0gPSAweDgwIHwgb3Bjb2RlO1xuICAgICAgaGVhZGVyWzFdID0gMTI3O1xuICAgICAgaGVhZGVyLndyaXRlVUludDMyQkUoMCwgMik7XG4gICAgICBoZWFkZXIud3JpdGVVSW50MzJCRShsZW5ndGgsIDYpO1xuICAgIH1cbiAgICB0aGlzLnNvY2tldC53cml0ZShCdWZmZXIuY29uY2F0KFtoZWFkZXIsIHBheWxvYWRdKSk7XG4gIH1cblxuICBwcml2YXRlIGVtaXRDbG9zZSgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuY2xvc2VkKSB0aGlzLmNsb3NlZCA9IHRydWU7XG4gICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIFsuLi50aGlzLmNsb3NlSGFuZGxlcnNdKSBoYW5kbGVyKCk7XG4gICAgdGhpcy5jbG9zZUhhbmRsZXJzLmNsZWFyKCk7XG4gICAgdGhpcy50ZXh0SGFuZGxlcnMuY2xlYXIoKTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZXF1ZXN0VXJsKHJlcTogSW5jb21pbmdNZXNzYWdlKTogVVJMIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIG5ldyBVUkwocmVxLnVybCA/PyBcIi9cIiwgXCJodHRwOi8vMTI3LjAuMC4xXCIpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiByZWFkSnNvbkJvZHkocmVxOiBJbmNvbWluZ01lc3NhZ2UpOiBQcm9taXNlPHVua25vd24+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XG4gICAgbGV0IHRvdGFsID0gMDtcbiAgICByZXEub24oXCJkYXRhXCIsIChjaHVuazogQnVmZmVyKSA9PiB7XG4gICAgICB0b3RhbCArPSBjaHVuay5sZW5ndGg7XG4gICAgICBpZiAodG90YWwgPiAxMDI0ICogMTAyNCkge1xuICAgICAgICByZWplY3QobmV3IEVycm9yKFwicmVxdWVzdCBib2R5IHRvbyBsYXJnZVwiKSk7XG4gICAgICAgIHJlcS5kZXN0cm95KCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNodW5rcy5wdXNoKGNodW5rKTtcbiAgICB9KTtcbiAgICByZXEub24oXCJlbmRcIiwgKCkgPT4ge1xuICAgICAgY29uc3QgcmF3ID0gQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKFwidXRmOFwiKTtcbiAgICAgIGlmICghcmF3KSB7XG4gICAgICAgIHJlc29sdmUobnVsbCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc29sdmUoSlNPTi5wYXJzZShyYXcpKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmVxLm9uKFwiZXJyb3JcIiwgcmVqZWN0KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHNlbmRKc29uKHJlczogU2VydmVyUmVzcG9uc2UsIHN0YXR1czogbnVtYmVyLCBib2R5OiB1bmtub3duKTogdm9pZCB7XG4gIHNlbmRCdWZmZXIocmVzLCBzdGF0dXMsIEJ1ZmZlci5mcm9tKEpTT04uc3RyaW5naWZ5KGJvZHkpKSwgTUlNRV9UWVBFU1tcIi5qc29uXCJdLCBmYWxzZSk7XG59XG5cbmZ1bmN0aW9uIHNlbmRUZXh0KHJlczogU2VydmVyUmVzcG9uc2UsIHN0YXR1czogbnVtYmVyLCBib2R5OiBzdHJpbmcsIGNvbnRlbnRUeXBlOiBzdHJpbmcpOiB2b2lkIHtcbiAgc2VuZEJ1ZmZlcihyZXMsIHN0YXR1cywgQnVmZmVyLmZyb20oYm9keSksIGNvbnRlbnRUeXBlLCBmYWxzZSk7XG59XG5cbmZ1bmN0aW9uIHNlbmRCdWZmZXIoXG4gIHJlczogU2VydmVyUmVzcG9uc2UsXG4gIHN0YXR1czogbnVtYmVyLFxuICBib2R5OiBCdWZmZXIsXG4gIGNvbnRlbnRUeXBlOiBzdHJpbmcsXG4gIGhlYWRPbmx5OiBib29sZWFuLFxuKTogdm9pZCB7XG4gIHJlcy53cml0ZUhlYWQoc3RhdHVzLCB7XG4gICAgXCJjb250ZW50LXR5cGVcIjogY29udGVudFR5cGUsXG4gICAgXCJjb250ZW50LWxlbmd0aFwiOiBib2R5Lmxlbmd0aCxcbiAgICBcImNhY2hlLWNvbnRyb2xcIjogXCJuby1zdG9yZVwiLFxuICB9KTtcbiAgaWYgKGhlYWRPbmx5KSByZXMuZW5kKCk7XG4gIGVsc2UgcmVzLmVuZChib2R5KTtcbn1cblxuZnVuY3Rpb24gd2Vidmlld1Jvb3QoKTogc3RyaW5nIHtcbiAgcmV0dXJuIGpvaW4ocHJvY2Vzcy5yZXNvdXJjZXNQYXRoLCBcImFwcC5hc2FyXCIsIFwid2Vidmlld1wiKTtcbn1cblxuZnVuY3Rpb24gd2Vidmlld0ZpbGUocGF0aG5hbWU6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBjbGVhblBhdGggPSBkZWNvZGVVUklDb21wb25lbnQocGF0aG5hbWUpLnJlcGxhY2UoL15cXC8rLywgXCJcIik7XG4gIGlmICghY2xlYW5QYXRoIHx8IGNsZWFuUGF0aC5pbmNsdWRlcyhcIlxcMFwiKSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IHJvb3QgPSB3ZWJ2aWV3Um9vdCgpO1xuICBjb25zdCBmaWxlID0gbm9ybWFsaXplKGpvaW4ocm9vdCwgY2xlYW5QYXRoKSk7XG4gIGNvbnN0IHJlbCA9IHJlbGF0aXZlKHJvb3QsIGZpbGUpO1xuICBpZiAocmVsLnN0YXJ0c1dpdGgoXCIuLlwiKSB8fCByZWwgPT09IFwiXCIpIHJldHVybiBudWxsO1xuICBpZiAoIWV4aXN0c1N5bmMoZmlsZSkgfHwgIXN0YXRTeW5jKGZpbGUpLmlzRmlsZSgpKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIGZpbGU7XG59XG5cbmZ1bmN0aW9uIG1pbWVUeXBlKGZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGRvdCA9IGZpbGUubGFzdEluZGV4T2YoXCIuXCIpO1xuICBjb25zdCBleHQgPSBkb3QgPj0gMCA/IGZpbGUuc2xpY2UoZG90KS50b0xvd2VyQ2FzZSgpIDogXCJcIjtcbiAgcmV0dXJuIE1JTUVfVFlQRVNbZXh0XSA/PyBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiO1xufVxuXG5mdW5jdGlvbiByZXF1aXJlT3B0aW9ucygpOiBCcm93c2VyVWlTZXJ2ZXJPcHRpb25zIHtcbiAgaWYgKCFhY3RpdmVPcHRpb25zKSB0aHJvdyBuZXcgRXJyb3IoXCJDb2RleCsrIGJyb3dzZXIgVUkgc2VydmVyIGlzIG5vdCBjb25maWd1cmVkXCIpO1xuICByZXR1cm4gYWN0aXZlT3B0aW9ucztcbn1cblxuZnVuY3Rpb24gaXNCcm93c2VyVWlIb3N0U2VuZGVyKHNlbmRlcjogRWxlY3Ryb24uV2ViQ29udGVudHMpOiBib29sZWFuIHtcbiAgcmV0dXJuICEhYWN0aXZlSG9zdCAmJiAhYWN0aXZlSG9zdC53ZWJDb250ZW50cy5pc0Rlc3Ryb3llZCgpICYmIHNlbmRlci5pZCA9PT0gYWN0aXZlSG9zdC53ZWJDb250ZW50cy5pZDtcbn1cblxuZnVuY3Rpb24gYXNzZXJ0QnJpZGdlTWV0aG9kKG1ldGhvZDogc3RyaW5nKTogdm9pZCB7XG4gIGlmICghL15bYS16QS1aMC05Ll86LV0rJC8udGVzdChtZXRob2QpKSB0aHJvdyBuZXcgRXJyb3IoXCJpbnZhbGlkIGJyaWRnZSBtZXRob2RcIik7XG59XG5cbmZ1bmN0aW9uIHBhcnNlUG9ydCh2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBmYWxsYmFjazogbnVtYmVyKTogbnVtYmVyIHtcbiAgY29uc3QgcGFyc2VkID0gTnVtYmVyKHZhbHVlKTtcbiAgcmV0dXJuIE51bWJlci5pc0ludGVnZXIocGFyc2VkKSAmJiBwYXJzZWQgPiAwICYmIHBhcnNlZCA8PSA2NTUzNSA/IHBhcnNlZCA6IGZhbGxiYWNrO1xufVxuXG5mdW5jdGlvbiBhc1JlY29yZCh2YWx1ZTogdW5rbm93bik6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbCB7XG4gIHJldHVybiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgPyB2YWx1ZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIGFzUGxhaW5PYmplY3QodmFsdWU6IHVua25vd24pOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB7XG4gIGNvbnN0IHJlY29yZCA9IGFzUmVjb3JkKHZhbHVlKTtcbiAgcmV0dXJuIHJlY29yZCAmJiAhQXJyYXkuaXNBcnJheShyZWNvcmQpID8gcmVjb3JkIDoge307XG59XG5cbmZ1bmN0aW9uIGN1cnJlbnRTeXN0ZW1UaGVtZVZhcmlhbnQoKTogc3RyaW5nIHtcbiAgcmV0dXJuIG5hdGl2ZVRoZW1lLnNob3VsZFVzZURhcmtDb2xvcnMgPyBcImRhcmtcIiA6IFwibGlnaHRcIjtcbn1cblxuZnVuY3Rpb24gc2FmZUpzb24odmFsdWU6IHVua25vd24pOiBzdHJpbmcge1xuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodmFsdWUpLnJlcGxhY2UoLzwvZywgXCJcXFxcdTAwM2NcIik7XG59XG5cbmZ1bmN0aW9uIGRlbGF5KG1zOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG1zKSk7XG59XG4iLCAiaW1wb3J0IHsgcmVhbHBhdGhTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGlzQWJzb2x1dGUsIHJlbGF0aXZlLCByZXNvbHZlIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZU5hdGl2ZVR3ZWFrUGF0aCh0d2Vha0Rpcjogc3RyaW5nLCBwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAodHlwZW9mIHBhdGggIT09IFwic3RyaW5nXCIgfHwgcGF0aC50cmltKCkgPT09IFwiXCIpIHRocm93IG5ldyBFcnJvcihcIm5hdGl2ZSBwYXRoIGlzIHJlcXVpcmVkXCIpO1xuICBjb25zdCByb290ID0gcmVhbHBhdGhTeW5jKHR3ZWFrRGlyKTtcbiAgY29uc3QgZnVsbCA9IHJlc29sdmUodHdlYWtEaXIsIHBhdGgpO1xuICBsZXQgdGFyZ2V0OiBzdHJpbmc7XG4gIHRyeSB7XG4gICAgdGFyZ2V0ID0gcmVhbHBhdGhTeW5jKGZ1bGwpO1xuICB9IGNhdGNoIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJuYXRpdmUgcGF0aCBkb2VzIG5vdCBleGlzdFwiKTtcbiAgfVxuICBpZiAoIWlzUGF0aEluc2lkZShyb290LCB0YXJnZXQpIHx8IHRhcmdldCA9PT0gcm9vdCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIm5hdGl2ZSBwYXRoIG11c3Qgc3RheSBpbnNpZGUgdGhlIHR3ZWFrIGRpcmVjdG9yeVwiKTtcbiAgfVxuICByZXR1cm4gdGFyZ2V0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNQYXRoSW5zaWRlKHBhcmVudDogc3RyaW5nLCB0YXJnZXQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBjb25zdCByZWwgPSByZWxhdGl2ZShyZXNvbHZlKHBhcmVudCksIHJlc29sdmUodGFyZ2V0KSk7XG4gIHJldHVybiByZWwgPT09IFwiXCIgfHwgKCEhcmVsICYmICFyZWwuc3RhcnRzV2l0aChcIi4uXCIpICYmICFpc0Fic29sdXRlKHJlbCkpO1xufVxuIiwgIi8qKlxuICogUnVudGltZSBwYXRoIGNvbnN0YW50cyBhbmQgZW52IGdhdGUuIExlYWYgbW9kdWxlOiBubyBpbXBvcnRzIGZyb20gb3RoZXJcbiAqIHJ1bnRpbWUgZmVhdHVyZSBtb2R1bGVzLlxuICovXG5pbXBvcnQgeyBta2RpclN5bmMgfSBmcm9tIFwibm9kZTpmc1wiO1xuaW1wb3J0IHsgaG9tZWRpciB9IGZyb20gXCJub2RlOm9zXCI7XG5pbXBvcnQgeyBqb2luLCByZXNvbHZlIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuaW1wb3J0IHsgYXBwZW5kQ2FwcGVkTG9nIH0gZnJvbSBcIi4vbG9nZ2luZ1wiO1xuaW1wb3J0IHsgcmVzb2x2ZVR3ZWFrU3RvcmVJbmRleFVybCB9IGZyb20gXCIuL3R3ZWFrLXN0b3JlXCI7XG5cbmNvbnN0IHVzZXJSb290RW52ID0gcHJvY2Vzcy5lbnYuQ09ERVhfUExVU1BMVVNfVVNFUl9ST09UO1xuY29uc3QgcnVudGltZURpckVudiA9IHByb2Nlc3MuZW52LkNPREVYX1BMVVNQTFVTX1JVTlRJTUU7XG5cbmlmICghdXNlclJvb3RFbnYgfHwgIXJ1bnRpbWVEaXJFbnYpIHtcbiAgdGhyb3cgbmV3IEVycm9yKFxuICAgIFwiY29kZXgtcGx1c3BsdXMgcnVudGltZSBzdGFydGVkIHdpdGhvdXQgQ09ERVhfUExVU1BMVVNfVVNFUl9ST09UL1JVTlRJTUUgZW52c1wiLFxuICApO1xufVxuXG5leHBvcnQgY29uc3QgdXNlclJvb3Q6IHN0cmluZyA9IHVzZXJSb290RW52O1xuZXhwb3J0IGNvbnN0IHJ1bnRpbWVEaXI6IHN0cmluZyA9IHJ1bnRpbWVEaXJFbnY7XG5cbmV4cG9ydCBjb25zdCBQUkVMT0FEX1BBVEggPSByZXNvbHZlKHJ1bnRpbWVEaXIsIFwicHJlbG9hZC5qc1wiKTtcbmV4cG9ydCBjb25zdCBHVUVTVF9QUkVMT0FEX1BBVEggPSByZXNvbHZlKHJ1bnRpbWVEaXIsIFwiZ3Vlc3QtcHJlbG9hZC5qc1wiKTtcbmV4cG9ydCBjb25zdCBUV0VBS1NfRElSID0gam9pbih1c2VyUm9vdCwgXCJ0d2Vha3NcIik7XG5leHBvcnQgY29uc3QgTE9HX0RJUiA9IGpvaW4odXNlclJvb3QsIFwibG9nXCIpO1xuZXhwb3J0IGNvbnN0IExPR19GSUxFID0gam9pbihMT0dfRElSLCBcIm1haW4ubG9nXCIpO1xuZXhwb3J0IGNvbnN0IENPTkZJR19GSUxFID0gam9pbih1c2VyUm9vdCwgXCJjb25maWcuanNvblwiKTtcbmV4cG9ydCBjb25zdCBDT0RFWF9DT05GSUdfRklMRSA9IGpvaW4oaG9tZWRpcigpLCBcIi5jb2RleFwiLCBcImNvbmZpZy50b21sXCIpO1xuZXhwb3J0IGNvbnN0IElOU1RBTExFUl9TVEFURV9GSUxFID0gam9pbih1c2VyUm9vdCwgXCJzdGF0ZS5qc29uXCIpO1xuZXhwb3J0IGNvbnN0IFVQREFURV9NT0RFX0ZJTEUgPSBqb2luKHVzZXJSb290LCBcInVwZGF0ZS1tb2RlLmpzb25cIik7XG5leHBvcnQgY29uc3QgU0VMRl9VUERBVEVfU1RBVEVfRklMRSA9IGpvaW4odXNlclJvb3QsIFwic2VsZi11cGRhdGUtc3RhdGUuanNvblwiKTtcbmV4cG9ydCBjb25zdCBTSUdORURfQ09ERVhfQkFDS1VQID0gam9pbih1c2VyUm9vdCwgXCJiYWNrdXBcIiwgXCJDb2RleC5hcHBcIik7XG5leHBvcnQgY29uc3QgQ09ERVhfUExVU1BMVVNfVkVSU0lPTiA9IFwiMS4xLjRcIjtcbmV4cG9ydCBjb25zdCBDT0RFWF9QTFVTUExVU19SRVBPID0gXCJMaWdodEhhcnUvY2hhdGdwdC1sYXllclwiO1xuZXhwb3J0IGNvbnN0IFRXRUFLX1NUT1JFX0lOREVYX1VSTCA9IHJlc29sdmVUd2Vha1N0b3JlSW5kZXhVcmwoKTtcbmV4cG9ydCBjb25zdCBDT0RFWF9XSU5ET1dfU0VSVklDRVNfS0VZID0gXCJfX2NvZGV4cHBfd2luZG93X3NlcnZpY2VzX19cIjtcblxubWtkaXJTeW5jKExPR19ESVIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xubWtkaXJTeW5jKFRXRUFLU19ESVIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXG5leHBvcnQgdHlwZSBSdW50aW1lTG9nID0gKGxldmVsOiBcImluZm9cIiB8IFwid2FyblwiIHwgXCJlcnJvclwiLCAuLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQ7XG5cbmV4cG9ydCBmdW5jdGlvbiBsb2cobGV2ZWw6IFwiaW5mb1wiIHwgXCJ3YXJuXCIgfCBcImVycm9yXCIsIC4uLmFyZ3M6IHVua25vd25bXSk6IHZvaWQge1xuICBjb25zdCBsaW5lID0gYFske25ldyBEYXRlKCkudG9JU09TdHJpbmcoKX1dIFske2xldmVsfV0gJHthcmdzXG4gICAgLm1hcCgoYSkgPT4gKHR5cGVvZiBhID09PSBcInN0cmluZ1wiID8gYSA6IEpTT04uc3RyaW5naWZ5KGEpKSlcbiAgICAuam9pbihcIiBcIil9XFxuYDtcbiAgdHJ5IHtcbiAgICBhcHBlbmRDYXBwZWRMb2coTE9HX0ZJTEUsIGxpbmUpO1xuICB9IGNhdGNoIHt9XG4gIGlmIChsZXZlbCA9PT0gXCJlcnJvclwiKSBjb25zb2xlLmVycm9yKFwiW2NvZGV4LXBsdXNwbHVzXVwiLCAuLi5hcmdzKTtcbn1cbiIsICJpbXBvcnQgdHlwZSB7IFR3ZWFrTWFuaWZlc3QgfSBmcm9tIFwiQGNvZGV4LXBsdXNwbHVzL3Nka1wiO1xuXG4vKiogQ29tbWl0IG9mIHN0b3JlL2luZGV4Lmpzb24gcmV2aWV3ZWQgaW50byB0aGlzIHJ1bnRpbWUuIE5vdCBmbG9hdGluZyBtYWluLiAqL1xuZXhwb3J0IGNvbnN0IFBJTk5FRF9UV0VBS19TVE9SRV9JTkRFWF9DT01NSVQgPSBcIjdhMGU5NWIxNjFkZTU0ODAyNjFmMTdiYmY4NDAwNGQ5YmU5MGRjNmVcIjtcbi8qKiBTSEEtMjU2IG9mIHN0b3JlL2luZGV4Lmpzb24gYXQgUElOTkVEX1RXRUFLX1NUT1JFX0lOREVYX0NPTU1JVC4gKi9cbmV4cG9ydCBjb25zdCBQSU5ORURfVFdFQUtfU1RPUkVfSU5ERVhfU0hBMjU2ID1cbiAgXCIzNzhlODhjYzM2NmVmNmQ1MDgxNmEyNzgzOGFmMTQ2YzM0ZmVmMTIyYzZiZmVlM2JhMDNjOTU0OWI4NjJkMDYzXCI7XG5leHBvcnQgY29uc3QgREVGQVVMVF9UV0VBS19TVE9SRV9JTkRFWF9VUkwgPVxuICBgaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL0xpZ2h0SGFydS9jaGF0Z3B0LWxheWVyLyR7UElOTkVEX1RXRUFLX1NUT1JFX0lOREVYX0NPTU1JVH0vc3RvcmUvaW5kZXguanNvbmA7XG5leHBvcnQgY29uc3QgVFdFQUtfU1RPUkVfUkVWSUVXX0lTU1VFX1VSTCA9XG4gIFwiaHR0cHM6Ly9naXRodWIuY29tL0xpZ2h0SGFydS9jaGF0Z3B0LWxheWVyL2lzc3Vlcy9uZXdcIjtcblxuZXhwb3J0IGludGVyZmFjZSBUd2Vha1N0b3JlUmVnaXN0cnkge1xuICBzY2hlbWFWZXJzaW9uOiAxO1xuICBnZW5lcmF0ZWRBdD86IHN0cmluZztcbiAgZW50cmllczogVHdlYWtTdG9yZUVudHJ5W107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHdlYWtTdG9yZUVudHJ5IHtcbiAgaWQ6IHN0cmluZztcbiAgbWFuaWZlc3Q6IFR3ZWFrTWFuaWZlc3Q7XG4gIHJlcG86IHN0cmluZztcbiAgYXBwcm92ZWRDb21taXRTaGE6IHN0cmluZztcbiAgYXBwcm92ZWRBdDogc3RyaW5nO1xuICBhcHByb3ZlZEJ5OiBzdHJpbmc7XG4gIHBsYXRmb3Jtcz86IFR3ZWFrU3RvcmVQbGF0Zm9ybVtdO1xuICByZWxlYXNlVXJsPzogc3RyaW5nO1xuICByZXZpZXdVcmw/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCB0eXBlIFR3ZWFrU3RvcmVQbGF0Zm9ybSA9IFwiZGFyd2luXCIgfCBcIndpbjMyXCIgfCBcImxpbnV4XCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHdlYWtTdG9yZVB1Ymxpc2hTdWJtaXNzaW9uIHtcbiAgcmVwbzogc3RyaW5nO1xuICBkZWZhdWx0QnJhbmNoOiBzdHJpbmc7XG4gIGNvbW1pdFNoYTogc3RyaW5nO1xuICBjb21taXRVcmw6IHN0cmluZztcbiAgbWFuaWZlc3Q/OiB7XG4gICAgaWQ/OiBzdHJpbmc7XG4gICAgbmFtZT86IHN0cmluZztcbiAgICB2ZXJzaW9uPzogc3RyaW5nO1xuICAgIGRlc2NyaXB0aW9uPzogc3RyaW5nO1xuICAgIGljb25Vcmw/OiBzdHJpbmc7XG4gIH07XG59XG5cbmNvbnN0IEdJVEhVQl9SRVBPX1JFID0gL15bQS1aYS16MC05Xy4tXStcXC9bQS1aYS16MC05Xy4tXSskLztcbmNvbnN0IEZVTExfU0hBX1JFID0gL15bYS1mMC05XXs0MH0kL2k7XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVHaXRIdWJSZXBvKGlucHV0OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCByYXcgPSBpbnB1dC50cmltKCk7XG4gIGlmICghcmF3KSB0aHJvdyBuZXcgRXJyb3IoXCJHaXRIdWIgcmVwbyBpcyByZXF1aXJlZFwiKTtcblxuICBjb25zdCBzc2ggPSAvXmdpdEBnaXRodWJcXC5jb206KFteL10rXFwvW14vXSs/KSg/OlxcLmdpdCk/JC9pLmV4ZWMocmF3KTtcbiAgaWYgKHNzaCkgcmV0dXJuIG5vcm1hbGl6ZVJlcG9QYXJ0KHNzaFsxXSk7XG5cbiAgaWYgKC9eaHR0cHM/OlxcL1xcLy9pLnRlc3QocmF3KSkge1xuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocmF3KTtcbiAgICBpZiAodXJsLmhvc3RuYW1lICE9PSBcImdpdGh1Yi5jb21cIikgdGhyb3cgbmV3IEVycm9yKFwiT25seSBnaXRodWIuY29tIHJlcG9zaXRvcmllcyBhcmUgc3VwcG9ydGVkXCIpO1xuICAgIGNvbnN0IHBhcnRzID0gdXJsLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8rfFxcLyskL2csIFwiXCIpLnNwbGl0KFwiL1wiKTtcbiAgICBpZiAocGFydHMubGVuZ3RoIDwgMikgdGhyb3cgbmV3IEVycm9yKFwiR2l0SHViIHJlcG8gVVJMIG11c3QgaW5jbHVkZSBvd25lciBhbmQgcmVwb3NpdG9yeVwiKTtcbiAgICByZXR1cm4gbm9ybWFsaXplUmVwb1BhcnQoYCR7cGFydHNbMF19LyR7cGFydHNbMV19YCk7XG4gIH1cblxuICByZXR1cm4gbm9ybWFsaXplUmVwb1BhcnQocmF3KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVN0b3JlUmVnaXN0cnkoaW5wdXQ6IHVua25vd24pOiBUd2Vha1N0b3JlUmVnaXN0cnkge1xuICBjb25zdCByZWdpc3RyeSA9IGlucHV0IGFzIFBhcnRpYWw8VHdlYWtTdG9yZVJlZ2lzdHJ5PiB8IG51bGw7XG4gIGlmICghcmVnaXN0cnkgfHwgcmVnaXN0cnkuc2NoZW1hVmVyc2lvbiAhPT0gMSB8fCAhQXJyYXkuaXNBcnJheShyZWdpc3RyeS5lbnRyaWVzKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIlVuc3VwcG9ydGVkIHR3ZWFrIHN0b3JlIHJlZ2lzdHJ5XCIpO1xuICB9XG4gIGNvbnN0IGVudHJpZXMgPSByZWdpc3RyeS5lbnRyaWVzLm1hcChub3JtYWxpemVTdG9yZUVudHJ5KTtcbiAgZW50cmllcy5zb3J0KChhLCBiKSA9PiBhLm1hbmlmZXN0Lm5hbWUubG9jYWxlQ29tcGFyZShiLm1hbmlmZXN0Lm5hbWUpKTtcbiAgcmV0dXJuIHtcbiAgICBzY2hlbWFWZXJzaW9uOiAxLFxuICAgIGdlbmVyYXRlZEF0OiB0eXBlb2YgcmVnaXN0cnkuZ2VuZXJhdGVkQXQgPT09IFwic3RyaW5nXCIgPyByZWdpc3RyeS5nZW5lcmF0ZWRBdCA6IHVuZGVmaW5lZCxcbiAgICBlbnRyaWVzLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2h1ZmZsZVN0b3JlRW50cmllczxUPihcbiAgZW50cmllczogcmVhZG9ubHkgVFtdLFxuICByYW5kb21JbmRleDogKGV4Y2x1c2l2ZU1heDogbnVtYmVyKSA9PiBudW1iZXIgPSAoZXhjbHVzaXZlTWF4KSA9PiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBleGNsdXNpdmVNYXgpLFxuKTogVFtdIHtcbiAgY29uc3Qgc2h1ZmZsZWQgPSBbLi4uZW50cmllc107XG4gIGZvciAobGV0IGkgPSBzaHVmZmxlZC5sZW5ndGggLSAxOyBpID4gMDsgaSAtPSAxKSB7XG4gICAgY29uc3QgaiA9IHJhbmRvbUluZGV4KGkgKyAxKTtcbiAgICBpZiAoIU51bWJlci5pc0ludGVnZXIoaikgfHwgaiA8IDAgfHwgaiA+IGkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgc2h1ZmZsZSByYW5kb21JbmRleCByZXR1cm5lZCAke2p9OyBleHBlY3RlZCBhbiBpbnRlZ2VyIGZyb20gMCB0byAke2l9YCk7XG4gICAgfVxuICAgIFtzaHVmZmxlZFtpXSwgc2h1ZmZsZWRbal1dID0gW3NodWZmbGVkW2pdLCBzaHVmZmxlZFtpXV07XG4gIH1cbiAgcmV0dXJuIHNodWZmbGVkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplU3RvcmVFbnRyeShpbnB1dDogdW5rbm93bik6IFR3ZWFrU3RvcmVFbnRyeSB7XG4gIGNvbnN0IGVudHJ5ID0gaW5wdXQgYXMgUGFydGlhbDxUd2Vha1N0b3JlRW50cnk+IHwgbnVsbDtcbiAgaWYgKCFlbnRyeSB8fCB0eXBlb2YgZW50cnkgIT09IFwib2JqZWN0XCIpIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgdHdlYWsgc3RvcmUgZW50cnlcIik7XG4gIGNvbnN0IHJlcG8gPSBub3JtYWxpemVHaXRIdWJSZXBvKFN0cmluZyhlbnRyeS5yZXBvID8/IGVudHJ5Lm1hbmlmZXN0Py5naXRodWJSZXBvID8/IFwiXCIpKTtcbiAgY29uc3QgbWFuaWZlc3QgPSBlbnRyeS5tYW5pZmVzdCBhcyBUd2Vha01hbmlmZXN0IHwgdW5kZWZpbmVkO1xuICBpZiAoIW1hbmlmZXN0Py5pZCB8fCAhbWFuaWZlc3QubmFtZSB8fCAhbWFuaWZlc3QudmVyc2lvbikge1xuICAgIHRocm93IG5ldyBFcnJvcihgU3RvcmUgZW50cnkgZm9yICR7cmVwb30gaXMgbWlzc2luZyBtYW5pZmVzdCBmaWVsZHNgKTtcbiAgfVxuICBpZiAobm9ybWFsaXplR2l0SHViUmVwbyhtYW5pZmVzdC5naXRodWJSZXBvKSAhPT0gcmVwbykge1xuICAgIHRocm93IG5ldyBFcnJvcihgU3RvcmUgZW50cnkgJHttYW5pZmVzdC5pZH0gcmVwbyBkb2VzIG5vdCBtYXRjaCBtYW5pZmVzdCBnaXRodWJSZXBvYCk7XG4gIH1cbiAgaWYgKCFpc0Z1bGxDb21taXRTaGEoU3RyaW5nKGVudHJ5LmFwcHJvdmVkQ29tbWl0U2hhID8/IFwiXCIpKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgU3RvcmUgZW50cnkgJHttYW5pZmVzdC5pZH0gbXVzdCBwaW4gYSBmdWxsIGFwcHJvdmVkIGNvbW1pdCBTSEFgKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIGlkOiBtYW5pZmVzdC5pZCxcbiAgICBtYW5pZmVzdCxcbiAgICByZXBvLFxuICAgIGFwcHJvdmVkQ29tbWl0U2hhOiBTdHJpbmcoZW50cnkuYXBwcm92ZWRDb21taXRTaGEpLFxuICAgIGFwcHJvdmVkQXQ6IHR5cGVvZiBlbnRyeS5hcHByb3ZlZEF0ID09PSBcInN0cmluZ1wiID8gZW50cnkuYXBwcm92ZWRBdCA6IFwiXCIsXG4gICAgYXBwcm92ZWRCeTogdHlwZW9mIGVudHJ5LmFwcHJvdmVkQnkgPT09IFwic3RyaW5nXCIgPyBlbnRyeS5hcHByb3ZlZEJ5IDogXCJcIixcbiAgICBwbGF0Zm9ybXM6IG5vcm1hbGl6ZVN0b3JlUGxhdGZvcm1zKChlbnRyeSBhcyB7IHBsYXRmb3Jtcz86IHVua25vd24gfSkucGxhdGZvcm1zKSxcbiAgICByZWxlYXNlVXJsOiBvcHRpb25hbEdpdGh1YlVybChlbnRyeS5yZWxlYXNlVXJsKSxcbiAgICByZXZpZXdVcmw6IG9wdGlvbmFsR2l0aHViVXJsKGVudHJ5LnJldmlld1VybCksXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdG9yZUFyY2hpdmVVcmwoZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSk6IHN0cmluZyB7XG4gIGlmICghaXNGdWxsQ29tbWl0U2hhKGVudHJ5LmFwcHJvdmVkQ29tbWl0U2hhKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgU3RvcmUgZW50cnkgJHtlbnRyeS5pZH0gaXMgbm90IHBpbm5lZCB0byBhIGZ1bGwgY29tbWl0IFNIQWApO1xuICB9XG4gIHJldHVybiBgaHR0cHM6Ly9jb2RlbG9hZC5naXRodWIuY29tLyR7ZW50cnkucmVwb30vdGFyLmd6LyR7ZW50cnkuYXBwcm92ZWRDb21taXRTaGF9YDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkVHdlYWtQdWJsaXNoSXNzdWVVcmwoc3VibWlzc2lvbjogVHdlYWtTdG9yZVB1Ymxpc2hTdWJtaXNzaW9uKTogc3RyaW5nIHtcbiAgY29uc3QgcmVwbyA9IG5vcm1hbGl6ZUdpdEh1YlJlcG8oc3VibWlzc2lvbi5yZXBvKTtcbiAgaWYgKCFpc0Z1bGxDb21taXRTaGEoc3VibWlzc2lvbi5jb21taXRTaGEpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiU3VibWlzc2lvbiBtdXN0IGluY2x1ZGUgdGhlIGZ1bGwgY29tbWl0IFNIQSB0byByZXZpZXdcIik7XG4gIH1cbiAgY29uc3QgdGl0bGUgPSBgVHdlYWsgc3RvcmUgcmV2aWV3OiAke3JlcG99YDtcbiAgY29uc3QgYm9keSA9IFtcbiAgICBcIiMjIFR3ZWFrIHJlcG9cIixcbiAgICBgaHR0cHM6Ly9naXRodWIuY29tLyR7cmVwb31gLFxuICAgIFwiXCIsXG4gICAgXCIjIyBDb21taXQgdG8gcmV2aWV3XCIsXG4gICAgc3VibWlzc2lvbi5jb21taXRTaGEsXG4gICAgc3VibWlzc2lvbi5jb21taXRVcmwsXG4gICAgXCJcIixcbiAgICBcIkRvIG5vdCBhcHByb3ZlIGEgZGlmZmVyZW50IGNvbW1pdC4gSWYgdGhlIGF1dGhvciBwdXNoZXMgY2hhbmdlcywgYXNrIHRoZW0gdG8gcmVzdWJtaXQuXCIsXG4gICAgXCJcIixcbiAgICBcIiMjIE1hbmlmZXN0XCIsXG4gICAgYC0gaWQ6ICR7c3VibWlzc2lvbi5tYW5pZmVzdD8uaWQgPz8gXCIobm90IGRldGVjdGVkKVwifWAsXG4gICAgYC0gbmFtZTogJHtzdWJtaXNzaW9uLm1hbmlmZXN0Py5uYW1lID8/IFwiKG5vdCBkZXRlY3RlZClcIn1gLFxuICAgIGAtIHZlcnNpb246ICR7c3VibWlzc2lvbi5tYW5pZmVzdD8udmVyc2lvbiA/PyBcIihub3QgZGV0ZWN0ZWQpXCJ9YCxcbiAgICBgLSBkZXNjcmlwdGlvbjogJHtzdWJtaXNzaW9uLm1hbmlmZXN0Py5kZXNjcmlwdGlvbiA/PyBcIihub3QgZGV0ZWN0ZWQpXCJ9YCxcbiAgICBgLSBpY29uVXJsOiAke3N1Ym1pc3Npb24ubWFuaWZlc3Q/Lmljb25VcmwgPz8gXCIobm90IGRldGVjdGVkKVwifWAsXG4gICAgXCJcIixcbiAgICBcIiMjIEFkbWluIGNoZWNrbGlzdFwiLFxuICAgIFwiLSBbIF0gbWFuaWZlc3QuanNvbiBpcyB2YWxpZFwiLFxuICAgIFwiLSBbIF0gbWFuaWZlc3QuaWNvblVybCBpcyB1c2FibGUgYXMgdGhlIHN0b3JlIGljb25cIixcbiAgICBcIi0gWyBdIHNvdXJjZSB3YXMgcmV2aWV3ZWQgYXQgdGhlIGV4YWN0IGNvbW1pdCBhYm92ZVwiLFxuICAgIFwiLSBbIF0gYHN0b3JlL2luZGV4Lmpzb25gIGVudHJ5IHBpbnMgYGFwcHJvdmVkQ29tbWl0U2hhYCB0byB0aGUgZXhhY3QgY29tbWl0IGFib3ZlXCIsXG4gIF0uam9pbihcIlxcblwiKTtcbiAgY29uc3QgdXJsID0gbmV3IFVSTChUV0VBS19TVE9SRV9SRVZJRVdfSVNTVUVfVVJMKTtcbiAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoXCJ0ZW1wbGF0ZVwiLCBcInR3ZWFrLXN0b3JlLXJldmlldy5tZFwiKTtcbiAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoXCJ0aXRsZVwiLCB0aXRsZSk7XG4gIHVybC5zZWFyY2hQYXJhbXMuc2V0KFwiYm9keVwiLCBib2R5KTtcbiAgcmV0dXJuIHVybC50b1N0cmluZygpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNGdWxsQ29tbWl0U2hhKHZhbHVlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIEZVTExfU0hBX1JFLnRlc3QodmFsdWUpO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVSZXBvUGFydCh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgcmVwbyA9IHZhbHVlLnRyaW0oKS5yZXBsYWNlKC9cXC5naXQkL2ksIFwiXCIpLnJlcGxhY2UoL15cXC8rfFxcLyskL2csIFwiXCIpO1xuICBpZiAoIUdJVEhVQl9SRVBPX1JFLnRlc3QocmVwbykpIHRocm93IG5ldyBFcnJvcihcIkdpdEh1YiByZXBvIG11c3QgYmUgaW4gb3duZXIvcmVwbyBmb3JtXCIpO1xuICByZXR1cm4gcmVwbztcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplU3RvcmVQbGF0Zm9ybXMoaW5wdXQ6IHVua25vd24pOiBUd2Vha1N0b3JlUGxhdGZvcm1bXSB8IHVuZGVmaW5lZCB7XG4gIGlmIChpbnB1dCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdW5kZWZpbmVkO1xuICBpZiAoIUFycmF5LmlzQXJyYXkoaW5wdXQpKSB0aHJvdyBuZXcgRXJyb3IoXCJTdG9yZSBlbnRyeSBwbGF0Zm9ybXMgbXVzdCBiZSBhbiBhcnJheVwiKTtcbiAgY29uc3QgYWxsb3dlZCA9IG5ldyBTZXQ8VHdlYWtTdG9yZVBsYXRmb3JtPihbXCJkYXJ3aW5cIiwgXCJ3aW4zMlwiLCBcImxpbnV4XCJdKTtcbiAgY29uc3QgcGxhdGZvcm1zID0gQXJyYXkuZnJvbShuZXcgU2V0KGlucHV0Lm1hcCgodmFsdWUpID0+IHtcbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiIHx8ICFhbGxvd2VkLmhhcyh2YWx1ZSBhcyBUd2Vha1N0b3JlUGxhdGZvcm0pKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIHN0b3JlIHBsYXRmb3JtOiAke1N0cmluZyh2YWx1ZSl9YCk7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZSBhcyBUd2Vha1N0b3JlUGxhdGZvcm07XG4gIH0pKSk7XG4gIHJldHVybiBwbGF0Zm9ybXMubGVuZ3RoID4gMCA/IHBsYXRmb3JtcyA6IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gb3B0aW9uYWxHaXRodWJVcmwodmFsdWU6IHVua25vd24pOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiIHx8ICF2YWx1ZS50cmltKCkpIHJldHVybiB1bmRlZmluZWQ7XG4gIGNvbnN0IHVybCA9IG5ldyBVUkwodmFsdWUpO1xuICBpZiAodXJsLnByb3RvY29sICE9PSBcImh0dHBzOlwiIHx8IHVybC5ob3N0bmFtZSAhPT0gXCJnaXRodWIuY29tXCIpIHJldHVybiB1bmRlZmluZWQ7XG4gIHJldHVybiB1cmwudG9TdHJpbmcoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVUd2Vha1N0b3JlSW5kZXhVcmwoZW52OiBOb2RlSlMuRGljdDxzdHJpbmcgfCB1bmRlZmluZWQ+ID0gcHJvY2Vzcy5lbnYpOiBzdHJpbmcge1xuICBjb25zdCBvdmVycmlkZSA9IGVudi5DT0RFWF9QTFVTUExVU19TVE9SRV9JTkRFWF9VUkw/LnRyaW0oKTtcbiAgaWYgKG92ZXJyaWRlKSB7XG4gICAgaWYgKGVudi5DT0RFWF9QTFVTUExVU19BTExPV19TVE9SRV9JTkRFWF9PVkVSUklERSAhPT0gXCIxXCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgXCJDT0RFWF9QTFVTUExVU19TVE9SRV9JTkRFWF9VUkwgb3ZlcnJpZGUgcmVxdWlyZXMgQ09ERVhfUExVU1BMVVNfQUxMT1dfU1RPUkVfSU5ERVhfT1ZFUlJJREU9MVwiLFxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIG92ZXJyaWRlO1xuICB9XG4gIHJldHVybiBERUZBVUxUX1RXRUFLX1NUT1JFX0lOREVYX1VSTDtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0U3RvcmVJbnN0YWxsUGluKGVudHJ5OiBUd2Vha1N0b3JlRW50cnksIGNvbW1pdFNoYTogc3RyaW5nKTogdm9pZCB7XG4gIGlmIChlbnRyeS5hcHByb3ZlZENvbW1pdFNoYS50b0xvd2VyQ2FzZSgpICE9PSBjb21taXRTaGEudG9Mb3dlckNhc2UoKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBSZWZ1c2luZyB0byBpbnN0YWxsICR7ZW50cnkuaWR9IGF0ICR7Y29tbWl0U2hhfTsgc3RvcmUgcGluIGlzICR7ZW50cnkuYXBwcm92ZWRDb21taXRTaGF9YCxcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzaG9ydENvbW1pdFNoYShzaGE6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBzaGEuc2xpY2UoMCwgNyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0ZWRQaW5MYWJlbChzaGE6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgTGlzdGVkIFx1MDBCNyBwaW5uZWQgJHtzaG9ydENvbW1pdFNoYShzaGEpfWA7XG59IiwgImltcG9ydCB7IHJlYWRGaWxlU3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBpc0xheWVyQXV0b1VwZGF0ZUVuYWJsZWQgfSBmcm9tIFwiLi9pcGMtZ3VhcmRcIjtcbmltcG9ydCB7XG4gIENPTkZJR19GSUxFLFxuICBJTlNUQUxMRVJfU1RBVEVfRklMRSxcbiAgU0VMRl9VUERBVEVfU1RBVEVfRklMRSxcbiAgbG9nLFxufSBmcm9tIFwiLi9ydW50aW1lLXBhdGhzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGVyc2lzdGVkU3RhdGUge1xuICBjb2RleFBsdXNQbHVzPzoge1xuICAgIGF1dG9VcGRhdGU/OiBib29sZWFuO1xuICAgIHNhZmVNb2RlPzogYm9vbGVhbjtcbiAgICB1cGRhdGVDaGFubmVsPzogU2VsZlVwZGF0ZUNoYW5uZWw7XG4gICAgdXBkYXRlUmVwbz86IHN0cmluZztcbiAgICB1cGRhdGVSZWY/OiBzdHJpbmc7XG4gICAgdXBkYXRlQ2hlY2s/OiBDb2RleFBsdXNQbHVzVXBkYXRlQ2hlY2s7XG4gIH07XG4gIC8qKiBQZXItdHdlYWsgZW5hYmxlIGZsYWdzLiBNaXNzaW5nIGVudHJpZXMgZGVmYXVsdCB0byBlbmFibGVkLiAqL1xuICB0d2Vha3M/OiBSZWNvcmQ8c3RyaW5nLCB7IGVuYWJsZWQ/OiBib29sZWFuIH0+O1xuICAvKiogQ2FjaGVkIEdpdEh1YiByZWxlYXNlIGNoZWNrcy4gUnVudGltZSBuZXZlciBhdXRvLWluc3RhbGxzOyB0aGUgdXNlciBjYW4gY2xpY2sgVXBkYXRlIG9uIHRoZSBUd2Vha3MgcGFnZS4gKi9cbiAgdHdlYWtVcGRhdGVDaGVja3M/OiBSZWNvcmQ8c3RyaW5nLCBUd2Vha1VwZGF0ZUNoZWNrPjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb2RleFBsdXNQbHVzVXBkYXRlQ2hlY2sge1xuICBjaGVja2VkQXQ6IHN0cmluZztcbiAgY3VycmVudFZlcnNpb246IHN0cmluZztcbiAgbGF0ZXN0VmVyc2lvbjogc3RyaW5nIHwgbnVsbDtcbiAgcmVsZWFzZVVybDogc3RyaW5nIHwgbnVsbDtcbiAgcmVsZWFzZU5vdGVzOiBzdHJpbmcgfCBudWxsO1xuICB1cGRhdGVBdmFpbGFibGU6IGJvb2xlYW47XG4gIGVycm9yPzogc3RyaW5nO1xufVxuXG5leHBvcnQgdHlwZSBTZWxmVXBkYXRlQ2hhbm5lbCA9IFwic3RhYmxlXCIgfCBcInByZXJlbGVhc2VcIiB8IFwiY3VzdG9tXCI7XG5leHBvcnQgdHlwZSBTZWxmVXBkYXRlU3RhdHVzID0gXCJjaGVja2luZ1wiIHwgXCJ1cC10by1kYXRlXCIgfCBcInVwZGF0ZWRcIiB8IFwiZmFpbGVkXCIgfCBcImRpc2FibGVkXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VsZlVwZGF0ZVN0YXRlIHtcbiAgY2hlY2tlZEF0OiBzdHJpbmc7XG4gIGNvbXBsZXRlZEF0Pzogc3RyaW5nO1xuICBzdGF0dXM6IFNlbGZVcGRhdGVTdGF0dXM7XG4gIGN1cnJlbnRWZXJzaW9uOiBzdHJpbmc7XG4gIGxhdGVzdFZlcnNpb246IHN0cmluZyB8IG51bGw7XG4gIHRhcmdldFJlZjogc3RyaW5nIHwgbnVsbDtcbiAgcmVsZWFzZVVybDogc3RyaW5nIHwgbnVsbDtcbiAgcmVwbzogc3RyaW5nO1xuICBjaGFubmVsOiBTZWxmVXBkYXRlQ2hhbm5lbDtcbiAgc291cmNlUm9vdDogc3RyaW5nO1xuICBpbnN0YWxsYXRpb25Tb3VyY2U/OiBJbnN0YWxsYXRpb25Tb3VyY2U7XG4gIGVycm9yPzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEluc3RhbGxhdGlvblNvdXJjZSB7XG4gIGtpbmQ6IFwiZ2l0aHViLXNvdXJjZVwiIHwgXCJob21lYnJld1wiIHwgXCJsb2NhbC1kZXZcIiB8IFwic291cmNlLWFyY2hpdmVcIiB8IFwidW5rbm93blwiO1xuICBsYWJlbDogc3RyaW5nO1xuICBkZXRhaWw6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUd2Vha1VwZGF0ZUNoZWNrIHtcbiAgY2hlY2tlZEF0OiBzdHJpbmc7XG4gIHJlcG86IHN0cmluZztcbiAgY3VycmVudFZlcnNpb246IHN0cmluZztcbiAgbGF0ZXN0VmVyc2lvbjogc3RyaW5nIHwgbnVsbDtcbiAgbGF0ZXN0VGFnOiBzdHJpbmcgfCBudWxsO1xuICByZWxlYXNlVXJsOiBzdHJpbmcgfCBudWxsO1xuICB1cGRhdGVBdmFpbGFibGU6IGJvb2xlYW47XG4gIHBpbm5lZFNoYT86IHN0cmluZztcbiAgZXJyb3I/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkU3RhdGUoKTogUGVyc2lzdGVkU3RhdGUge1xuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhDT05GSUdfRklMRSwgXCJ1dGY4XCIpKSBhcyBQZXJzaXN0ZWRTdGF0ZTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG59XG5leHBvcnQgZnVuY3Rpb24gd3JpdGVTdGF0ZShzOiBQZXJzaXN0ZWRTdGF0ZSk6IHZvaWQge1xuICB0cnkge1xuICAgIHdyaXRlRmlsZVN5bmMoQ09ORklHX0ZJTEUsIEpTT04uc3RyaW5naWZ5KHMsIG51bGwsIDIpKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZyhcIndhcm5cIiwgXCJ3cml0ZVN0YXRlIGZhaWxlZDpcIiwgU3RyaW5nKChlIGFzIEVycm9yKS5tZXNzYWdlKSk7XG4gIH1cbn1cbmV4cG9ydCBmdW5jdGlvbiBpc0NvZGV4UGx1c1BsdXNBdXRvVXBkYXRlRW5hYmxlZCgpOiBib29sZWFuIHtcbiAgcmV0dXJuIGlzTGF5ZXJBdXRvVXBkYXRlRW5hYmxlZChyZWFkU3RhdGUoKS5jb2RleFBsdXNQbHVzPy5hdXRvVXBkYXRlKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBzZXRDb2RleFBsdXNQbHVzQXV0b1VwZGF0ZShlbmFibGVkOiBib29sZWFuKTogdm9pZCB7XG4gIGNvbnN0IHMgPSByZWFkU3RhdGUoKTtcbiAgcy5jb2RleFBsdXNQbHVzID8/PSB7fTtcbiAgcy5jb2RleFBsdXNQbHVzLmF1dG9VcGRhdGUgPSBlbmFibGVkO1xuICB3cml0ZVN0YXRlKHMpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHNldENvZGV4UGx1c1BsdXNVcGRhdGVDb25maWcoY29uZmlnOiB7XG4gIHVwZGF0ZUNoYW5uZWw/OiBTZWxmVXBkYXRlQ2hhbm5lbDtcbiAgdXBkYXRlUmVwbz86IHN0cmluZztcbiAgdXBkYXRlUmVmPzogc3RyaW5nO1xufSk6IHZvaWQge1xuICBjb25zdCBzID0gcmVhZFN0YXRlKCk7XG4gIHMuY29kZXhQbHVzUGx1cyA/Pz0ge307XG4gIGlmIChjb25maWcudXBkYXRlQ2hhbm5lbCkgcy5jb2RleFBsdXNQbHVzLnVwZGF0ZUNoYW5uZWwgPSBjb25maWcudXBkYXRlQ2hhbm5lbDtcbiAgaWYgKFwidXBkYXRlUmVwb1wiIGluIGNvbmZpZykgcy5jb2RleFBsdXNQbHVzLnVwZGF0ZVJlcG8gPSBjbGVhbk9wdGlvbmFsU3RyaW5nKGNvbmZpZy51cGRhdGVSZXBvKTtcbiAgaWYgKFwidXBkYXRlUmVmXCIgaW4gY29uZmlnKSBzLmNvZGV4UGx1c1BsdXMudXBkYXRlUmVmID0gY2xlYW5PcHRpb25hbFN0cmluZyhjb25maWcudXBkYXRlUmVmKTtcbiAgd3JpdGVTdGF0ZShzKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBpc0NvZGV4UGx1c1BsdXNTYWZlTW9kZUVuYWJsZWQoKTogYm9vbGVhbiB7XG4gIHJldHVybiByZWFkU3RhdGUoKS5jb2RleFBsdXNQbHVzPy5zYWZlTW9kZSA9PT0gdHJ1ZTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBpc1R3ZWFrRW5hYmxlZChpZDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IHMgPSByZWFkU3RhdGUoKTtcbiAgaWYgKHMuY29kZXhQbHVzUGx1cz8uc2FmZU1vZGUgPT09IHRydWUpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIHMudHdlYWtzPy5baWRdPy5lbmFibGVkICE9PSBmYWxzZTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBzZXRUd2Vha0VuYWJsZWQoaWQ6IHN0cmluZywgZW5hYmxlZDogYm9vbGVhbik6IHZvaWQge1xuICBjb25zdCBzID0gcmVhZFN0YXRlKCk7XG4gIHMudHdlYWtzID8/PSB7fTtcbiAgcy50d2Vha3NbaWRdID0geyAuLi5zLnR3ZWFrc1tpZF0sIGVuYWJsZWQgfTtcbiAgd3JpdGVTdGF0ZShzKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbnN0YWxsZXJTdGF0ZSB7XG4gIGFwcFJvb3Q6IHN0cmluZztcbiAgY29kZXhWZXJzaW9uOiBzdHJpbmcgfCBudWxsO1xuICBzb3VyY2VSb290Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZEluc3RhbGxlclN0YXRlKCk6IEluc3RhbGxlclN0YXRlIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKElOU1RBTExFUl9TVEFURV9GSUxFLCBcInV0ZjhcIikpIGFzIEluc3RhbGxlclN0YXRlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZFNlbGZVcGRhdGVTdGF0ZSgpOiBTZWxmVXBkYXRlU3RhdGUgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMoU0VMRl9VUERBVEVfU1RBVEVfRklMRSwgXCJ1dGY4XCIpKSBhcyBTZWxmVXBkYXRlU3RhdGU7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5leHBvcnQgZnVuY3Rpb24gd3JpdGVTZWxmVXBkYXRlU3RhdGUoc3RhdGU6IFNlbGZVcGRhdGVTdGF0ZSk6IHZvaWQge1xuICB0cnkge1xuICAgIHdyaXRlRmlsZVN5bmMoU0VMRl9VUERBVEVfU1RBVEVfRklMRSwgSlNPTi5zdHJpbmdpZnkoc3RhdGUsIG51bGwsIDIpKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZyhcIndhcm5cIiwgXCJ3cml0ZVNlbGZVcGRhdGVTdGF0ZSBmYWlsZWQ6XCIsIFN0cmluZygoZSBhcyBFcnJvcikubWVzc2FnZSkpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbGVhbk9wdGlvbmFsU3RyaW5nKHZhbHVlOiB1bmtub3duKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIikgcmV0dXJuIHVuZGVmaW5lZDtcbiAgY29uc3QgdHJpbW1lZCA9IHZhbHVlLnRyaW0oKTtcbiAgcmV0dXJuIHRyaW1tZWQgPyB0cmltbWVkIDogdW5kZWZpbmVkO1xufVxuIiwgImltcG9ydCB7IGNwU3luYywgZXhpc3RzU3luYywgbWtkaXJTeW5jLCBta2R0ZW1wU3luYywgcmVhZGRpclN5bmMsIHJlYWRGaWxlU3luYywgcm1TeW5jLCBzdGF0U3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBzcGF3blN5bmMgfSBmcm9tIFwibm9kZTpjaGlsZF9wcm9jZXNzXCI7XG5pbXBvcnQgeyBjcmVhdGVIYXNoIH0gZnJvbSBcIm5vZGU6Y3J5cHRvXCI7XG5pbXBvcnQgeyBqb2luLCByZWxhdGl2ZSB9IGZyb20gXCJub2RlOnBhdGhcIjtcbmltcG9ydCB7IHRtcGRpciB9IGZyb20gXCJub2RlOm9zXCI7XG5pbXBvcnQgdHlwZSB7IFR3ZWFrTWFuaWZlc3QgfSBmcm9tIFwiQGNvZGV4LXBsdXNwbHVzL3Nka1wiO1xuaW1wb3J0IHsgYXNzZXJ0U3RvcmVJbmRleE1hdGNoZXNQaW4gfSBmcm9tIFwiLi90d2Vhay1zdG9yZS1pbnRlZ3JpdHlcIjtcbmltcG9ydCB7XG4gIG5vcm1hbGl6ZUdpdEh1YlJlcG8sXG4gIG5vcm1hbGl6ZVN0b3JlUmVnaXN0cnksXG4gIHN0b3JlQXJjaGl2ZVVybCxcbiAgdHlwZSBUd2Vha1N0b3JlUHVibGlzaFN1Ym1pc3Npb24sXG4gIHR5cGUgVHdlYWtTdG9yZUVudHJ5LFxuICB0eXBlIFR3ZWFrU3RvcmVSZWdpc3RyeSxcbiAgdHlwZSBUd2Vha1N0b3JlUGxhdGZvcm0sXG59IGZyb20gXCIuL3R3ZWFrLXN0b3JlXCI7XG5pbXBvcnQge1xuICBDT0RFWF9QTFVTUExVU19WRVJTSU9OLFxuICBUV0VBS19TVE9SRV9JTkRFWF9VUkwsXG4gIFRXRUFLU19ESVIsXG4gIGxvZyxcbiAgcnVudGltZURpcixcbn0gZnJvbSBcIi4vcnVudGltZS1wYXRoc1wiO1xuXG5leHBvcnQgY29uc3QgVkVSU0lPTl9SRSA9IC9edj8oXFxkKylcXC4oXFxkKylcXC4oXFxkKykoPzpbLStdLiopPyQvO1xuXG5leHBvcnQgaW50ZXJmYWNlIFR3ZWFrU3RvcmVGZXRjaFJlc3VsdCB7XG4gIHJlZ2lzdHJ5OiBUd2Vha1N0b3JlUmVnaXN0cnk7XG4gIGZldGNoZWRBdDogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFN0b3JlSW5zdGFsbE1ldGFkYXRhIHtcbiAgcmVwbzogc3RyaW5nO1xuICBhcHByb3ZlZENvbW1pdFNoYTogc3RyaW5nO1xuICBpbnN0YWxsZWRBdDogc3RyaW5nO1xuICBzdG9yZUluZGV4VXJsOiBzdHJpbmc7XG4gIGZpbGVzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTdG9yZUVudHJ5UGxhdGZvcm1Db21wYXRpYmlsaXR5IHtcbiAgY3VycmVudDogTm9kZUpTLlBsYXRmb3JtO1xuICBzdXBwb3J0ZWQ6IFR3ZWFrU3RvcmVQbGF0Zm9ybVtdIHwgbnVsbDtcbiAgY29tcGF0aWJsZTogYm9vbGVhbjtcbiAgcmVhc29uOiBzdHJpbmcgfCBudWxsO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFN0b3JlRW50cnlSdW50aW1lQ29tcGF0aWJpbGl0eSB7XG4gIGN1cnJlbnQ6IHN0cmluZztcbiAgcmVxdWlyZWQ6IHN0cmluZyB8IG51bGw7XG4gIGNvbXBhdGlibGU6IGJvb2xlYW47XG4gIHJlYXNvbjogc3RyaW5nIHwgbnVsbDtcbn1cblxuZXhwb3J0IGNsYXNzIFN0b3JlVHdlYWtNb2RpZmllZEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih0d2Vha05hbWU6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgYCR7dHdlYWtOYW1lfSBoYXMgbG9jYWwgc291cmNlIGNoYW5nZXMsIHNvIENvZGV4KysgY2FuJ3QgYXV0by11cGRhdGUgaXQuIFJldmVydCB5b3VyIGxvY2FsIGNoYW5nZXMgb3IgcmVpbnN0YWxsIHRoZSB0d2VhayBtYW51YWxseS5gLFxuICAgICk7XG4gICAgdGhpcy5uYW1lID0gXCJTdG9yZVR3ZWFrTW9kaWZpZWRFcnJvclwiO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdG9yZUVudHJ5UGxhdGZvcm1Db21wYXRpYmlsaXR5KGVudHJ5OiBUd2Vha1N0b3JlRW50cnkpOiBTdG9yZUVudHJ5UGxhdGZvcm1Db21wYXRpYmlsaXR5IHtcbiAgY29uc3Qgc3VwcG9ydGVkID0gZW50cnkucGxhdGZvcm1zID8/IG51bGw7XG4gIGNvbnN0IGNvbXBhdGlibGUgPSAhc3VwcG9ydGVkIHx8IHN1cHBvcnRlZC5pbmNsdWRlcyhwcm9jZXNzLnBsYXRmb3JtIGFzIFR3ZWFrU3RvcmVQbGF0Zm9ybSk7XG4gIHJldHVybiB7XG4gICAgY3VycmVudDogcHJvY2Vzcy5wbGF0Zm9ybSxcbiAgICBzdXBwb3J0ZWQsXG4gICAgY29tcGF0aWJsZSxcbiAgICByZWFzb246IGNvbXBhdGlibGUgPyBudWxsIDogYCR7ZW50cnkubWFuaWZlc3QubmFtZX0gaXMgb25seSBhdmFpbGFibGUgb24gJHtmb3JtYXRTdG9yZVBsYXRmb3JtcyhzdXBwb3J0ZWQpfS5gLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0U3RvcmVFbnRyeVBsYXRmb3JtQ29tcGF0aWJsZShlbnRyeTogVHdlYWtTdG9yZUVudHJ5KTogdm9pZCB7XG4gIGNvbnN0IHBsYXRmb3JtID0gc3RvcmVFbnRyeVBsYXRmb3JtQ29tcGF0aWJpbGl0eShlbnRyeSk7XG4gIGlmICghcGxhdGZvcm0uY29tcGF0aWJsZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihwbGF0Zm9ybS5yZWFzb24gPz8gYCR7ZW50cnkubWFuaWZlc3QubmFtZX0gaXMgbm90IGF2YWlsYWJsZSBvbiB0aGlzIHBsYXRmb3JtLmApO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdG9yZUVudHJ5UnVudGltZUNvbXBhdGliaWxpdHkoZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSk6IFN0b3JlRW50cnlSdW50aW1lQ29tcGF0aWJpbGl0eSB7XG4gIGNvbnN0IHJlcXVpcmVkID0gY2xlYW5NaW5SdW50aW1lKGVudHJ5Lm1hbmlmZXN0Lm1pblJ1bnRpbWUpO1xuICBjb25zdCBjb21wYXRpYmxlID0gIXJlcXVpcmVkIHx8IGNvbXBhcmVWZXJzaW9ucyhDT0RFWF9QTFVTUExVU19WRVJTSU9OLCByZXF1aXJlZCkgPj0gMDtcbiAgcmV0dXJuIHtcbiAgICBjdXJyZW50OiBDT0RFWF9QTFVTUExVU19WRVJTSU9OLFxuICAgIHJlcXVpcmVkLFxuICAgIGNvbXBhdGlibGUsXG4gICAgcmVhc29uOiBjb21wYXRpYmxlIHx8ICFyZXF1aXJlZFxuICAgICAgPyBudWxsXG4gICAgICA6IGAke2VudHJ5Lm1hbmlmZXN0Lm5hbWV9IHJlcXVpcmVzIENvZGV4KysgJHtyZXF1aXJlZH0gb3IgbmV3ZXIuYCxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFN0b3JlRW50cnlSdW50aW1lQ29tcGF0aWJsZShlbnRyeTogVHdlYWtTdG9yZUVudHJ5KTogdm9pZCB7XG4gIGNvbnN0IHJ1bnRpbWUgPSBzdG9yZUVudHJ5UnVudGltZUNvbXBhdGliaWxpdHkoZW50cnkpO1xuICBpZiAoIXJ1bnRpbWUuY29tcGF0aWJsZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihydW50aW1lLnJlYXNvbiA/PyBgJHtlbnRyeS5tYW5pZmVzdC5uYW1lfSByZXF1aXJlcyBhIG5ld2VyIENvZGV4KysgcnVudGltZS5gKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xlYW5NaW5SdW50aW1lKHZhbHVlOiB1bmtub3duKTogc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09IFwic3RyaW5nXCIpIHJldHVybiBudWxsO1xuICBjb25zdCB2ZXJzaW9uID0gbm9ybWFsaXplVmVyc2lvbih2YWx1ZS5yZXBsYWNlKC9ePj0/XFxzKi8sIFwiXCIpKTtcbiAgcmV0dXJuIFZFUlNJT05fUkUudGVzdCh2ZXJzaW9uKSA/IHZlcnNpb24gOiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0U3RvcmVQbGF0Zm9ybXMocGxhdGZvcm1zOiBUd2Vha1N0b3JlUGxhdGZvcm1bXSB8IG51bGwpOiBzdHJpbmcge1xuICBpZiAoIXBsYXRmb3JtcyB8fCBwbGF0Zm9ybXMubGVuZ3RoID09PSAwKSByZXR1cm4gXCJzdXBwb3J0ZWQgcGxhdGZvcm1zXCI7XG4gIHJldHVybiBwbGF0Zm9ybXMubWFwKChwbGF0Zm9ybSkgPT4ge1xuICAgIGlmIChwbGF0Zm9ybSA9PT0gXCJkYXJ3aW5cIikgcmV0dXJuIFwibWFjT1NcIjtcbiAgICBpZiAocGxhdGZvcm0gPT09IFwid2luMzJcIikgcmV0dXJuIFwiV2luZG93c1wiO1xuICAgIHJldHVybiBcIkxpbnV4XCI7XG4gIH0pLmpvaW4oXCIsIFwiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRCdW5kbGVkU3RvcmVSZWdpc3RyeSgpOiBUd2Vha1N0b3JlUmVnaXN0cnkgfCBudWxsIHtcbiAgY29uc3QgYnVuZGxlZCA9IGpvaW4ocnVudGltZURpciEsIFwic3RvcmUtaW5kZXguanNvblwiKTtcbiAgaWYgKCFleGlzdHNTeW5jKGJ1bmRsZWQpKSByZXR1cm4gbnVsbDtcbiAgdHJ5IHtcbiAgICBjb25zdCBib2R5ID0gcmVhZEZpbGVTeW5jKGJ1bmRsZWQpO1xuICAgIGlmICghcHJvY2Vzcy5lbnYuQ09ERVhfUExVU1BMVVNfQUxMT1dfU1RPUkVfSU5ERVhfT1ZFUlJJREUpIHtcbiAgICAgIGFzc2VydFN0b3JlSW5kZXhNYXRjaGVzUGluKGJvZHkpO1xuICAgIH1cbiAgICByZXR1cm4gbm9ybWFsaXplU3RvcmVSZWdpc3RyeShKU09OLnBhcnNlKGJvZHkudG9TdHJpbmcoXCJ1dGY4XCIpKSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2coXCJ3YXJuXCIsIFwiYnVuZGxlZCBzdG9yZSBpbmRleCByZWplY3RlZDpcIiwgU3RyaW5nKChlIGFzIEVycm9yKS5tZXNzYWdlKSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZldGNoVHdlYWtTdG9yZVJlZ2lzdHJ5KCk6IFByb21pc2U8VHdlYWtTdG9yZUZldGNoUmVzdWx0PiB7XG4gIGNvbnN0IGZldGNoZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgY29uc3QgYWxsb3dPdmVycmlkZSA9IHByb2Nlc3MuZW52LkNPREVYX1BMVVNQTFVTX0FMTE9XX1NUT1JFX0lOREVYX09WRVJSSURFID09PSBcIjFcIjtcbiAgdHJ5IHtcbiAgICBjb25zdCBjb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgIGNvbnN0IHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IGNvbnRyb2xsZXIuYWJvcnQoKSwgODAwMCk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKFRXRUFLX1NUT1JFX0lOREVYX1VSTCwge1xuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgXCJBY2NlcHRcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgICAgXCJVc2VyLUFnZW50XCI6IGBjb2RleC1wbHVzcGx1cy8ke0NPREVYX1BMVVNQTFVTX1ZFUlNJT059YCxcbiAgICAgICAgfSxcbiAgICAgICAgc2lnbmFsOiBjb250cm9sbGVyLnNpZ25hbCxcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXMub2spIHRocm93IG5ldyBFcnJvcihgc3RvcmUgcmV0dXJuZWQgJHtyZXMuc3RhdHVzfWApO1xuICAgICAgY29uc3QgYm9keSA9IEJ1ZmZlci5mcm9tKGF3YWl0IHJlcy5hcnJheUJ1ZmZlcigpKTtcbiAgICAgIGlmICghYWxsb3dPdmVycmlkZSkgYXNzZXJ0U3RvcmVJbmRleE1hdGNoZXNQaW4oYm9keSk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZWdpc3RyeTogbm9ybWFsaXplU3RvcmVSZWdpc3RyeShKU09OLnBhcnNlKGJvZHkudG9TdHJpbmcoXCJ1dGY4XCIpKSksXG4gICAgICAgIGZldGNoZWRBdCxcbiAgICAgIH07XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zdCBlcnJvciA9IGUgaW5zdGFuY2VvZiBFcnJvciA/IGUgOiBuZXcgRXJyb3IoU3RyaW5nKGUpKTtcbiAgICBjb25zdCBidW5kbGVkID0gcmVhZEJ1bmRsZWRTdG9yZVJlZ2lzdHJ5KCk7XG4gICAgaWYgKGJ1bmRsZWQpIHtcbiAgICAgIGxvZyhcIndhcm5cIiwgXCJ1c2luZyBidW5kbGVkIHN0b3JlIGluZGV4IHBpbjpcIiwgZXJyb3IubWVzc2FnZSk7XG4gICAgICByZXR1cm4geyByZWdpc3RyeTogYnVuZGxlZCwgZmV0Y2hlZEF0IH07XG4gICAgfVxuICAgIGxvZyhcIndhcm5cIiwgXCJmYWlsZWQgdG8gZmV0Y2ggdHdlYWsgc3RvcmUgcmVnaXN0cnk6XCIsIGVycm9yLm1lc3NhZ2UpO1xuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnN0YWxsU3RvcmVUd2VhayhlbnRyeTogVHdlYWtTdG9yZUVudHJ5KTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHVybCA9IHN0b3JlQXJjaGl2ZVVybChlbnRyeSk7XG4gIGNvbnN0IHdvcmsgPSBta2R0ZW1wU3luYyhqb2luKHRtcGRpcigpLCBcImNvZGV4cHAtc3RvcmUtdHdlYWstXCIpKTtcbiAgY29uc3QgYXJjaGl2ZSA9IGpvaW4od29yaywgXCJzb3VyY2UudGFyLmd6XCIpO1xuICBjb25zdCBleHRyYWN0RGlyID0gam9pbih3b3JrLCBcImV4dHJhY3RcIik7XG4gIGNvbnN0IHRhcmdldCA9IGpvaW4oVFdFQUtTX0RJUiwgZW50cnkuaWQpO1xuICBjb25zdCBzdGFnZWRUYXJnZXQgPSBqb2luKHdvcmssIFwic3RhZ2VkXCIsIGVudHJ5LmlkKTtcblxuICB0cnkge1xuICAgIGxvZyhcImluZm9cIiwgYGluc3RhbGxpbmcgc3RvcmUgdHdlYWsgJHtlbnRyeS5pZH0gZnJvbSAke2VudHJ5LnJlcG99QCR7ZW50cnkuYXBwcm92ZWRDb21taXRTaGF9YCk7XG4gICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICBoZWFkZXJzOiB7IFwiVXNlci1BZ2VudFwiOiBgY29kZXgtcGx1c3BsdXMvJHtDT0RFWF9QTFVTUExVU19WRVJTSU9OfWAgfSxcbiAgICAgIHJlZGlyZWN0OiBcImZvbGxvd1wiLFxuICAgIH0pO1xuICAgIGlmICghcmVzLm9rKSB0aHJvdyBuZXcgRXJyb3IoYGRvd25sb2FkIGZhaWxlZDogJHtyZXMuc3RhdHVzfWApO1xuICAgIGNvbnN0IGJ5dGVzID0gQnVmZmVyLmZyb20oYXdhaXQgcmVzLmFycmF5QnVmZmVyKCkpO1xuICAgIHdyaXRlRmlsZVN5bmMoYXJjaGl2ZSwgYnl0ZXMpO1xuICAgIG1rZGlyU3luYyhleHRyYWN0RGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICBleHRyYWN0VGFyQXJjaGl2ZShhcmNoaXZlLCBleHRyYWN0RGlyKTtcbiAgICBjb25zdCBzb3VyY2UgPSBmaW5kVHdlYWtSb290KGV4dHJhY3REaXIpO1xuICAgIGlmICghc291cmNlKSB0aHJvdyBuZXcgRXJyb3IoXCJkb3dubG9hZGVkIGFyY2hpdmUgZGlkIG5vdCBjb250YWluIG1hbmlmZXN0Lmpzb25cIik7XG4gICAgdmFsaWRhdGVTdG9yZVR3ZWFrU291cmNlKGVudHJ5LCBzb3VyY2UpO1xuICAgIHJtU3luYyhzdGFnZWRUYXJnZXQsIHsgcmVjdXJzaXZlOiB0cnVlLCBmb3JjZTogdHJ1ZSB9KTtcbiAgICBjb3B5VHdlYWtTb3VyY2Uoc291cmNlLCBzdGFnZWRUYXJnZXQpO1xuICAgIGNvbnN0IHN0YWdlZEZpbGVzID0gaGFzaFR3ZWFrU291cmNlKHN0YWdlZFRhcmdldCk7XG4gICAgd3JpdGVGaWxlU3luYyhcbiAgICAgIGpvaW4oc3RhZ2VkVGFyZ2V0LCBcIi5jb2RleHBwLXN0b3JlLmpzb25cIiksXG4gICAgICBKU09OLnN0cmluZ2lmeShcbiAgICAgICAge1xuICAgICAgICAgIHJlcG86IGVudHJ5LnJlcG8sXG4gICAgICAgICAgYXBwcm92ZWRDb21taXRTaGE6IGVudHJ5LmFwcHJvdmVkQ29tbWl0U2hhLFxuICAgICAgICAgIGluc3RhbGxlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgc3RvcmVJbmRleFVybDogVFdFQUtfU1RPUkVfSU5ERVhfVVJMLFxuICAgICAgICAgIGZpbGVzOiBzdGFnZWRGaWxlcyxcbiAgICAgICAgfSxcbiAgICAgICAgbnVsbCxcbiAgICAgICAgMixcbiAgICAgICksXG4gICAgKTtcbiAgICBhd2FpdCBhc3NlcnRTdG9yZVR3ZWFrQ2xlYW5Gb3JBdXRvVXBkYXRlKGVudHJ5LCB0YXJnZXQsIHdvcmspO1xuICAgIHJtU3luYyh0YXJnZXQsIHsgcmVjdXJzaXZlOiB0cnVlLCBmb3JjZTogdHJ1ZSB9KTtcbiAgICBjcFN5bmMoc3RhZ2VkVGFyZ2V0LCB0YXJnZXQsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICB9IGZpbmFsbHkge1xuICAgIHJtU3luYyh3b3JrLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgZm9yY2U6IHRydWUgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHByZXBhcmVUd2Vha1N0b3JlU3VibWlzc2lvbihyZXBvSW5wdXQ6IHN0cmluZyk6IFByb21pc2U8VHdlYWtTdG9yZVB1Ymxpc2hTdWJtaXNzaW9uPiB7XG4gIGNvbnN0IHJlcG8gPSBub3JtYWxpemVHaXRIdWJSZXBvKHJlcG9JbnB1dCk7XG4gIGNvbnN0IHJlcG9JbmZvID0gYXdhaXQgZmV0Y2hHaXRodWJKc29uPHsgZGVmYXVsdF9icmFuY2g/OiBzdHJpbmcgfT4oYGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvJHtyZXBvfWApO1xuICBjb25zdCBkZWZhdWx0QnJhbmNoID0gcmVwb0luZm8uZGVmYXVsdF9icmFuY2g7XG4gIGlmICghZGVmYXVsdEJyYW5jaCkgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgcmVzb2x2ZSBkZWZhdWx0IGJyYW5jaCBmb3IgJHtyZXBvfWApO1xuXG4gIGNvbnN0IGNvbW1pdCA9IGF3YWl0IGZldGNoR2l0aHViSnNvbjx7XG4gICAgc2hhPzogc3RyaW5nO1xuICAgIGh0bWxfdXJsPzogc3RyaW5nO1xuICB9PihgaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9yZXBvcy8ke3JlcG99L2NvbW1pdHMvJHtlbmNvZGVVUklDb21wb25lbnQoZGVmYXVsdEJyYW5jaCl9YCk7XG4gIGlmICghY29tbWl0LnNoYSkgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgcmVzb2x2ZSBjdXJyZW50IGNvbW1pdCBmb3IgJHtyZXBvfWApO1xuXG4gIGNvbnN0IG1hbmlmZXN0ID0gYXdhaXQgZmV0Y2hNYW5pZmVzdEF0Q29tbWl0KHJlcG8sIGNvbW1pdC5zaGEpLmNhdGNoKChlKSA9PiB7XG4gICAgbG9nKFwid2FyblwiLCBgY291bGQgbm90IHJlYWQgbWFuaWZlc3QgZm9yIHN0b3JlIHN1Ym1pc3Npb24gJHtyZXBvfUAke2NvbW1pdC5zaGF9OmAsIGUpO1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgcmVwbyxcbiAgICBkZWZhdWx0QnJhbmNoLFxuICAgIGNvbW1pdFNoYTogY29tbWl0LnNoYSxcbiAgICBjb21taXRVcmw6IGNvbW1pdC5odG1sX3VybCA/PyBgaHR0cHM6Ly9naXRodWIuY29tLyR7cmVwb30vY29tbWl0LyR7Y29tbWl0LnNoYX1gLFxuICAgIG1hbmlmZXN0OiBtYW5pZmVzdFxuICAgICAgPyB7XG4gICAgICAgICAgaWQ6IHR5cGVvZiBtYW5pZmVzdC5pZCA9PT0gXCJzdHJpbmdcIiA/IG1hbmlmZXN0LmlkIDogdW5kZWZpbmVkLFxuICAgICAgICAgIG5hbWU6IHR5cGVvZiBtYW5pZmVzdC5uYW1lID09PSBcInN0cmluZ1wiID8gbWFuaWZlc3QubmFtZSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICB2ZXJzaW9uOiB0eXBlb2YgbWFuaWZlc3QudmVyc2lvbiA9PT0gXCJzdHJpbmdcIiA/IG1hbmlmZXN0LnZlcnNpb24gOiB1bmRlZmluZWQsXG4gICAgICAgICAgZGVzY3JpcHRpb246IHR5cGVvZiBtYW5pZmVzdC5kZXNjcmlwdGlvbiA9PT0gXCJzdHJpbmdcIiA/IG1hbmlmZXN0LmRlc2NyaXB0aW9uIDogdW5kZWZpbmVkLFxuICAgICAgICAgIGljb25Vcmw6IHR5cGVvZiBtYW5pZmVzdC5pY29uVXJsID09PSBcInN0cmluZ1wiID8gbWFuaWZlc3QuaWNvblVybCA6IHVuZGVmaW5lZCxcbiAgICAgICAgfVxuICAgICAgOiB1bmRlZmluZWQsXG4gIH07XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZldGNoR2l0aHViSnNvbjxUPih1cmw6IHN0cmluZyk6IFByb21pc2U8VD4ge1xuICBjb25zdCBjb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICBjb25zdCB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiBjb250cm9sbGVyLmFib3J0KCksIDgwMDApO1xuICB0cnkge1xuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgaGVhZGVyczoge1xuICAgICAgICBcIkFjY2VwdFwiOiBcImFwcGxpY2F0aW9uL3ZuZC5naXRodWIranNvblwiLFxuICAgICAgICBcIlVzZXItQWdlbnRcIjogYGNvZGV4LXBsdXNwbHVzLyR7Q09ERVhfUExVU1BMVVNfVkVSU0lPTn1gLFxuICAgICAgfSxcbiAgICAgIHNpZ25hbDogY29udHJvbGxlci5zaWduYWwsXG4gICAgfSk7XG4gICAgaWYgKCFyZXMub2spIHRocm93IG5ldyBFcnJvcihgR2l0SHViIHJldHVybmVkICR7cmVzLnN0YXR1c31gKTtcbiAgICByZXR1cm4gYXdhaXQgcmVzLmpzb24oKSBhcyBUO1xuICB9IGZpbmFsbHkge1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaE1hbmlmZXN0QXRDb21taXQocmVwbzogc3RyaW5nLCBjb21taXRTaGE6IHN0cmluZyk6IFByb21pc2U8UGFydGlhbDxUd2Vha01hbmlmZXN0Pj4ge1xuICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaChgaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tLyR7cmVwb30vJHtjb21taXRTaGF9L21hbmlmZXN0Lmpzb25gLCB7XG4gICAgaGVhZGVyczoge1xuICAgICAgXCJBY2NlcHRcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICBcIlVzZXItQWdlbnRcIjogYGNvZGV4LXBsdXNwbHVzLyR7Q09ERVhfUExVU1BMVVNfVkVSU0lPTn1gLFxuICAgIH0sXG4gIH0pO1xuICBpZiAoIXJlcy5vaykgdGhyb3cgbmV3IEVycm9yKGBtYW5pZmVzdCBmZXRjaCByZXR1cm5lZCAke3Jlcy5zdGF0dXN9YCk7XG4gIHJldHVybiBhd2FpdCByZXMuanNvbigpIGFzIFBhcnRpYWw8VHdlYWtNYW5pZmVzdD47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0VGFyQXJjaGl2ZShhcmNoaXZlOiBzdHJpbmcsIHRhcmdldERpcjogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IHJlc3VsdCA9IHNwYXduU3luYyhcInRhclwiLCBbXCIteHpmXCIsIGFyY2hpdmUsIFwiLUNcIiwgdGFyZ2V0RGlyXSwge1xuICAgIGVuY29kaW5nOiBcInV0ZjhcIixcbiAgICBzdGRpbzogW1wiaWdub3JlXCIsIFwicGlwZVwiLCBcInBpcGVcIl0sXG4gIH0pO1xuICBpZiAocmVzdWx0LnN0YXR1cyAhPT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgdGFyIGV4dHJhY3Rpb24gZmFpbGVkOiAke3Jlc3VsdC5zdGRlcnIgfHwgcmVzdWx0LnN0ZG91dCB8fCByZXN1bHQuc3RhdHVzfWApO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZVN0b3JlVHdlYWtTb3VyY2UoZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSwgc291cmNlOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgbWFuaWZlc3RQYXRoID0gam9pbihzb3VyY2UsIFwibWFuaWZlc3QuanNvblwiKTtcbiAgY29uc3QgbWFuaWZlc3QgPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhtYW5pZmVzdFBhdGgsIFwidXRmOFwiKSkgYXMgVHdlYWtNYW5pZmVzdDtcbiAgaWYgKG1hbmlmZXN0LmlkICE9PSBlbnRyeS5tYW5pZmVzdC5pZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgZG93bmxvYWRlZCB0d2VhayBpZCAke21hbmlmZXN0LmlkfSBkb2VzIG5vdCBtYXRjaCBhcHByb3ZlZCBpZCAke2VudHJ5Lm1hbmlmZXN0LmlkfWApO1xuICB9XG4gIGlmIChtYW5pZmVzdC5naXRodWJSZXBvICE9PSBlbnRyeS5yZXBvKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBkb3dubG9hZGVkIHR3ZWFrIHJlcG8gJHttYW5pZmVzdC5naXRodWJSZXBvfSBkb2VzIG5vdCBtYXRjaCBhcHByb3ZlZCByZXBvICR7ZW50cnkucmVwb31gKTtcbiAgfVxuICBpZiAobWFuaWZlc3QudmVyc2lvbiAhPT0gZW50cnkubWFuaWZlc3QudmVyc2lvbikge1xuICAgIHRocm93IG5ldyBFcnJvcihgZG93bmxvYWRlZCB0d2VhayB2ZXJzaW9uICR7bWFuaWZlc3QudmVyc2lvbn0gZG9lcyBub3QgbWF0Y2ggYXBwcm92ZWQgdmVyc2lvbiAke2VudHJ5Lm1hbmlmZXN0LnZlcnNpb259YCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRUd2Vha1Jvb3QoZGlyOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKCFleGlzdHNTeW5jKGRpcikpIHJldHVybiBudWxsO1xuICBpZiAoZXhpc3RzU3luYyhqb2luKGRpciwgXCJtYW5pZmVzdC5qc29uXCIpKSkgcmV0dXJuIGRpcjtcbiAgZm9yIChjb25zdCBuYW1lIG9mIHJlYWRkaXJTeW5jKGRpcikpIHtcbiAgICBjb25zdCBjaGlsZCA9IGpvaW4oZGlyLCBuYW1lKTtcbiAgICB0cnkge1xuICAgICAgaWYgKCFzdGF0U3luYyhjaGlsZCkuaXNEaXJlY3RvcnkoKSkgY29udGludWU7XG4gICAgfSBjYXRjaCB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgZm91bmQgPSBmaW5kVHdlYWtSb290KGNoaWxkKTtcbiAgICBpZiAoZm91bmQpIHJldHVybiBmb3VuZDtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvcHlUd2Vha1NvdXJjZShzb3VyY2U6IHN0cmluZywgdGFyZ2V0OiBzdHJpbmcpOiB2b2lkIHtcbiAgY3BTeW5jKHNvdXJjZSwgdGFyZ2V0LCB7XG4gICAgcmVjdXJzaXZlOiB0cnVlLFxuICAgIGZpbHRlcjogKHNyYykgPT4gIS8oXnxbL1xcXFxdKSg/OlxcLmdpdHxub2RlX21vZHVsZXMpKD86Wy9cXFxcXXwkKS8udGVzdChzcmMpLFxuICB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gYXNzZXJ0U3RvcmVUd2Vha0NsZWFuRm9yQXV0b1VwZGF0ZShcbiAgZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSxcbiAgdGFyZ2V0OiBzdHJpbmcsXG4gIHdvcms6IHN0cmluZyxcbik6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoIWV4aXN0c1N5bmModGFyZ2V0KSkgcmV0dXJuO1xuICBjb25zdCBtZXRhZGF0YSA9IHJlYWRTdG9yZUluc3RhbGxNZXRhZGF0YSh0YXJnZXQpO1xuICBpZiAoIW1ldGFkYXRhKSByZXR1cm47XG4gIGlmIChtZXRhZGF0YS5yZXBvICE9PSBlbnRyeS5yZXBvKSB7XG4gICAgdGhyb3cgbmV3IFN0b3JlVHdlYWtNb2RpZmllZEVycm9yKGVudHJ5Lm1hbmlmZXN0Lm5hbWUpO1xuICB9XG4gIGNvbnN0IGN1cnJlbnRGaWxlcyA9IGhhc2hUd2Vha1NvdXJjZSh0YXJnZXQpO1xuICBjb25zdCBiYXNlbGluZUZpbGVzID0gbWV0YWRhdGEuZmlsZXMgPz8gYXdhaXQgZmV0Y2hCYXNlbGluZVN0b3JlVHdlYWtIYXNoZXMobWV0YWRhdGEsIHdvcmspO1xuICBpZiAoIXNhbWVGaWxlSGFzaGVzKGN1cnJlbnRGaWxlcywgYmFzZWxpbmVGaWxlcykpIHtcbiAgICB0aHJvdyBuZXcgU3RvcmVUd2Vha01vZGlmaWVkRXJyb3IoZW50cnkubWFuaWZlc3QubmFtZSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRTdG9yZUluc3RhbGxNZXRhZGF0YSh0YXJnZXQ6IHN0cmluZyk6IFN0b3JlSW5zdGFsbE1ldGFkYXRhIHwgbnVsbCB7XG4gIGNvbnN0IG1ldGFkYXRhUGF0aCA9IGpvaW4odGFyZ2V0LCBcIi5jb2RleHBwLXN0b3JlLmpzb25cIik7XG4gIGlmICghZXhpc3RzU3luYyhtZXRhZGF0YVBhdGgpKSByZXR1cm4gbnVsbDtcbiAgdHJ5IHtcbiAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhtZXRhZGF0YVBhdGgsIFwidXRmOFwiKSkgYXMgUGFydGlhbDxTdG9yZUluc3RhbGxNZXRhZGF0YT47XG4gICAgaWYgKHR5cGVvZiBwYXJzZWQucmVwbyAhPT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YgcGFyc2VkLmFwcHJvdmVkQ29tbWl0U2hhICE9PSBcInN0cmluZ1wiKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4ge1xuICAgICAgcmVwbzogcGFyc2VkLnJlcG8sXG4gICAgICBhcHByb3ZlZENvbW1pdFNoYTogcGFyc2VkLmFwcHJvdmVkQ29tbWl0U2hhLFxuICAgICAgaW5zdGFsbGVkQXQ6IHR5cGVvZiBwYXJzZWQuaW5zdGFsbGVkQXQgPT09IFwic3RyaW5nXCIgPyBwYXJzZWQuaW5zdGFsbGVkQXQgOiBcIlwiLFxuICAgICAgc3RvcmVJbmRleFVybDogdHlwZW9mIHBhcnNlZC5zdG9yZUluZGV4VXJsID09PSBcInN0cmluZ1wiID8gcGFyc2VkLnN0b3JlSW5kZXhVcmwgOiBcIlwiLFxuICAgICAgZmlsZXM6IGlzSGFzaFJlY29yZChwYXJzZWQuZmlsZXMpID8gcGFyc2VkLmZpbGVzIDogdW5kZWZpbmVkLFxuICAgIH07XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZldGNoQmFzZWxpbmVTdG9yZVR3ZWFrSGFzaGVzKFxuICBtZXRhZGF0YTogU3RvcmVJbnN0YWxsTWV0YWRhdGEsXG4gIHdvcms6IHN0cmluZyxcbik6IFByb21pc2U8UmVjb3JkPHN0cmluZywgc3RyaW5nPj4ge1xuICBjb25zdCBiYXNlbGluZURpciA9IGpvaW4od29yaywgXCJiYXNlbGluZVwiKTtcbiAgY29uc3QgYXJjaGl2ZSA9IGpvaW4od29yaywgXCJiYXNlbGluZS50YXIuZ3pcIik7XG4gIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKGBodHRwczovL2NvZGVsb2FkLmdpdGh1Yi5jb20vJHttZXRhZGF0YS5yZXBvfS90YXIuZ3ovJHttZXRhZGF0YS5hcHByb3ZlZENvbW1pdFNoYX1gLCB7XG4gICAgaGVhZGVyczogeyBcIlVzZXItQWdlbnRcIjogYGNvZGV4LXBsdXNwbHVzLyR7Q09ERVhfUExVU1BMVVNfVkVSU0lPTn1gIH0sXG4gICAgcmVkaXJlY3Q6IFwiZm9sbG93XCIsXG4gIH0pO1xuICBpZiAoIXJlcy5vaykgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgdmVyaWZ5IGxvY2FsIHR3ZWFrIGNoYW5nZXMgYmVmb3JlIHVwZGF0ZTogJHtyZXMuc3RhdHVzfWApO1xuICB3cml0ZUZpbGVTeW5jKGFyY2hpdmUsIEJ1ZmZlci5mcm9tKGF3YWl0IHJlcy5hcnJheUJ1ZmZlcigpKSk7XG4gIG1rZGlyU3luYyhiYXNlbGluZURpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gIGV4dHJhY3RUYXJBcmNoaXZlKGFyY2hpdmUsIGJhc2VsaW5lRGlyKTtcbiAgY29uc3Qgc291cmNlID0gZmluZFR3ZWFrUm9vdChiYXNlbGluZURpcik7XG4gIGlmICghc291cmNlKSB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3QgdmVyaWZ5IGxvY2FsIHR3ZWFrIGNoYW5nZXMgYmVmb3JlIHVwZGF0ZTogYmFzZWxpbmUgbWFuaWZlc3QgbWlzc2luZ1wiKTtcbiAgcmV0dXJuIGhhc2hUd2Vha1NvdXJjZShzb3VyY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaGFzaFR3ZWFrU291cmNlKHJvb3Q6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4ge1xuICBjb25zdCBvdXQ6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgY29sbGVjdFR3ZWFrRmlsZUhhc2hlcyhyb290LCByb290LCBvdXQpO1xuICByZXR1cm4gb3V0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY29sbGVjdFR3ZWFrRmlsZUhhc2hlcyhyb290OiBzdHJpbmcsIGRpcjogc3RyaW5nLCBvdXQ6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBuYW1lIG9mIHJlYWRkaXJTeW5jKGRpcikuc29ydCgpKSB7XG4gICAgaWYgKG5hbWUgPT09IFwiLmdpdFwiIHx8IG5hbWUgPT09IFwibm9kZV9tb2R1bGVzXCIgfHwgbmFtZSA9PT0gXCIuY29kZXhwcC1zdG9yZS5qc29uXCIpIGNvbnRpbnVlO1xuICAgIGNvbnN0IGZ1bGwgPSBqb2luKGRpciwgbmFtZSk7XG4gICAgY29uc3QgcmVsID0gcmVsYXRpdmUocm9vdCwgZnVsbCkuc3BsaXQoXCJcXFxcXCIpLmpvaW4oXCIvXCIpO1xuICAgIGNvbnN0IHN0YXQgPSBzdGF0U3luYyhmdWxsKTtcbiAgICBpZiAoc3RhdC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICBjb2xsZWN0VHdlYWtGaWxlSGFzaGVzKHJvb3QsIGZ1bGwsIG91dCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKCFzdGF0LmlzRmlsZSgpKSBjb250aW51ZTtcbiAgICBvdXRbcmVsXSA9IGNyZWF0ZUhhc2goXCJzaGEyNTZcIikudXBkYXRlKHJlYWRGaWxlU3luYyhmdWxsKSkuZGlnZXN0KFwiaGV4XCIpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzYW1lRmlsZUhhc2hlcyhhOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LCBiOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KTogYm9vbGVhbiB7XG4gIGNvbnN0IGFrID0gT2JqZWN0LmtleXMoYSkuc29ydCgpO1xuICBjb25zdCBiayA9IE9iamVjdC5rZXlzKGIpLnNvcnQoKTtcbiAgaWYgKGFrLmxlbmd0aCAhPT0gYmsubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYWsubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBrZXkgPSBha1tpXTtcbiAgICBpZiAoa2V5ICE9PSBia1tpXSB8fCBhW2tleV0gIT09IGJba2V5XSkgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNIYXNoUmVjb3JkKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPiB7XG4gIGlmICghdmFsdWUgfHwgdHlwZW9mIHZhbHVlICE9PSBcIm9iamVjdFwiIHx8IEFycmF5LmlzQXJyYXkodmFsdWUpKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiBPYmplY3QudmFsdWVzKHZhbHVlIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KS5ldmVyeSgodikgPT4gdHlwZW9mIHYgPT09IFwic3RyaW5nXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplVmVyc2lvbih2OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdi50cmltKCkucmVwbGFjZSgvXnYvaSwgXCJcIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb21wYXJlVmVyc2lvbnMoYTogc3RyaW5nLCBiOiBzdHJpbmcpOiBudW1iZXIge1xuICBjb25zdCBhdiA9IFZFUlNJT05fUkUuZXhlYyhhKTtcbiAgY29uc3QgYnYgPSBWRVJTSU9OX1JFLmV4ZWMoYik7XG4gIGlmICghYXYgfHwgIWJ2KSByZXR1cm4gMDtcbiAgZm9yIChsZXQgaSA9IDE7IGkgPD0gMzsgaSsrKSB7XG4gICAgY29uc3QgZGlmZiA9IE51bWJlcihhdltpXSkgLSBOdW1iZXIoYnZbaV0pO1xuICAgIGlmIChkaWZmICE9PSAwKSByZXR1cm4gZGlmZjtcbiAgfVxuICByZXR1cm4gMDtcbn1cbiIsICJpbXBvcnQgeyBjcmVhdGVIYXNoIH0gZnJvbSBcIm5vZGU6Y3J5cHRvXCI7XG5pbXBvcnQgeyBQSU5ORURfVFdFQUtfU1RPUkVfSU5ERVhfU0hBMjU2IH0gZnJvbSBcIi4vdHdlYWstc3RvcmVcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGhhc2hTdG9yZUluZGV4KGJvZHk6IHN0cmluZyB8IEJ1ZmZlcik6IHN0cmluZyB7XG4gIHJldHVybiBjcmVhdGVIYXNoKFwic2hhMjU2XCIpLnVwZGF0ZShib2R5KS5kaWdlc3QoXCJoZXhcIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRTdG9yZUluZGV4TWF0Y2hlc1BpbihcbiAgYm9keTogc3RyaW5nIHwgQnVmZmVyLFxuICBleHBlY3RlZFNoYTI1NiA9IFBJTk5FRF9UV0VBS19TVE9SRV9JTkRFWF9TSEEyNTYsXG4pOiB2b2lkIHtcbiAgY29uc3QgaGFzaCA9IGhhc2hTdG9yZUluZGV4KGJvZHkpO1xuICBpZiAoaGFzaCAhPT0gZXhwZWN0ZWRTaGEyNTYpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFN0b3JlIGluZGV4IGhhc2ggJHtoYXNofSBkb2VzIG5vdCBtYXRjaCBydW50aW1lIHBpbiAke2V4cGVjdGVkU2hhMjU2fWApO1xuICB9XG59XG4iLCAiaW1wb3J0IHsgZXhpc3RzU3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBleGVjRmlsZVN5bmMsIHNwYXduLCBzcGF3blN5bmMgfSBmcm9tIFwibm9kZTpjaGlsZF9wcm9jZXNzXCI7XG5pbXBvcnQgeyBkaXJuYW1lLCBqb2luLCByZXNvbHZlIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuaW1wb3J0IHsgaG9tZWRpciB9IGZyb20gXCJub2RlOm9zXCI7XG5pbXBvcnQge1xuICByZWFkSW5zdGFsbGVyU3RhdGUsXG4gIHJlYWRTdGF0ZSxcbiAgd3JpdGVTZWxmVXBkYXRlU3RhdGUsXG4gIHdyaXRlU3RhdGUsXG4gIHR5cGUgQ29kZXhQbHVzUGx1c1VwZGF0ZUNoZWNrLFxuICB0eXBlIEluc3RhbGxhdGlvblNvdXJjZSxcbiAgdHlwZSBTZWxmVXBkYXRlQ2hhbm5lbCxcbiAgdHlwZSBTZWxmVXBkYXRlU3RhdGUsXG59IGZyb20gXCIuL2NvbmZpZy1zdGF0ZVwiO1xuaW1wb3J0IHtcbiAgQ09ERVhfUExVU1BMVVNfUkVQTyxcbiAgQ09ERVhfUExVU1BMVVNfVkVSU0lPTixcbiAgU0lHTkVEX0NPREVYX0JBQ0tVUCxcbiAgVVBEQVRFX01PREVfRklMRSxcbiAgbG9nLFxuICB1c2VyUm9vdCxcbn0gZnJvbSBcIi4vcnVudGltZS1wYXRoc1wiO1xuXG5leHBvcnQgZnVuY3Rpb24gaW5zdGFsbFNwYXJrbGVVcGRhdGVIb29rKCk6IHZvaWQge1xuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSAhPT0gXCJkYXJ3aW5cIikgcmV0dXJuO1xuXG4gIGNvbnN0IE1vZHVsZSA9IHJlcXVpcmUoXCJub2RlOm1vZHVsZVwiKSBhcyB0eXBlb2YgaW1wb3J0KFwibm9kZTptb2R1bGVcIikgJiB7XG4gICAgX2xvYWQ/OiAocmVxdWVzdDogc3RyaW5nLCBwYXJlbnQ6IHVua25vd24sIGlzTWFpbjogYm9vbGVhbikgPT4gdW5rbm93bjtcbiAgfTtcbiAgY29uc3Qgb3JpZ2luYWxMb2FkID0gTW9kdWxlLl9sb2FkO1xuICBpZiAodHlwZW9mIG9yaWdpbmFsTG9hZCAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm47XG5cbiAgTW9kdWxlLl9sb2FkID0gZnVuY3Rpb24gY29kZXhQbHVzUGx1c01vZHVsZUxvYWQocmVxdWVzdDogc3RyaW5nLCBwYXJlbnQ6IHVua25vd24sIGlzTWFpbjogYm9vbGVhbikge1xuICAgIGNvbnN0IGxvYWRlZCA9IG9yaWdpbmFsTG9hZC5hcHBseSh0aGlzLCBbcmVxdWVzdCwgcGFyZW50LCBpc01haW5dKSBhcyB1bmtub3duO1xuICAgIGlmICh0eXBlb2YgcmVxdWVzdCA9PT0gXCJzdHJpbmdcIiAmJiAvc3BhcmtsZSg/OlxcLm5vZGUpPyQvaS50ZXN0KHJlcXVlc3QpKSB7XG4gICAgICB3cmFwU3BhcmtsZUV4cG9ydHMobG9hZGVkKTtcbiAgICB9XG4gICAgcmV0dXJuIGxvYWRlZDtcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdyYXBTcGFya2xlRXhwb3J0cyhsb2FkZWQ6IHVua25vd24pOiB2b2lkIHtcbiAgaWYgKCFsb2FkZWQgfHwgdHlwZW9mIGxvYWRlZCAhPT0gXCJvYmplY3RcIikgcmV0dXJuO1xuICBjb25zdCBleHBvcnRzID0gbG9hZGVkIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+ICYgeyBfX2NvZGV4cHBTcGFya2xlV3JhcHBlZD86IGJvb2xlYW4gfTtcbiAgaWYgKGV4cG9ydHMuX19jb2RleHBwU3BhcmtsZVdyYXBwZWQpIHJldHVybjtcbiAgZXhwb3J0cy5fX2NvZGV4cHBTcGFya2xlV3JhcHBlZCA9IHRydWU7XG5cbiAgZm9yIChjb25zdCBuYW1lIG9mIFtcImluc3RhbGxVcGRhdGVzSWZBdmFpbGFibGVcIl0pIHtcbiAgICBjb25zdCBmbiA9IGV4cG9ydHNbbmFtZV07XG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSBjb250aW51ZTtcbiAgICBleHBvcnRzW25hbWVdID0gZnVuY3Rpb24gY29kZXhQbHVzUGx1c1NwYXJrbGVXcmFwcGVyKHRoaXM6IHVua25vd24sIC4uLmFyZ3M6IHVua25vd25bXSkge1xuICAgICAgcHJlcGFyZVNpZ25lZENvZGV4Rm9yU3BhcmtsZUluc3RhbGwoKTtcbiAgICAgIHJldHVybiBSZWZsZWN0LmFwcGx5KGZuLCB0aGlzLCBhcmdzKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKGV4cG9ydHMuZGVmYXVsdCAmJiBleHBvcnRzLmRlZmF1bHQgIT09IGV4cG9ydHMpIHtcbiAgICB3cmFwU3BhcmtsZUV4cG9ydHMoZXhwb3J0cy5kZWZhdWx0KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJlcGFyZVNpZ25lZENvZGV4Rm9yU3BhcmtsZUluc3RhbGwoKTogdm9pZCB7XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtICE9PSBcImRhcndpblwiKSByZXR1cm47XG4gIGlmIChleGlzdHNTeW5jKFVQREFURV9NT0RFX0ZJTEUpKSB7XG4gICAgbG9nKFwiaW5mb1wiLCBcIlNwYXJrbGUgdXBkYXRlIHByZXAgc2tpcHBlZDsgdXBkYXRlIG1vZGUgYWxyZWFkeSBhY3RpdmVcIik7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICghZXhpc3RzU3luYyhTSUdORURfQ09ERVhfQkFDS1VQKSkge1xuICAgIGxvZyhcIndhcm5cIiwgXCJTcGFya2xlIHVwZGF0ZSBwcmVwIHNraXBwZWQ7IHNpZ25lZCBDb2RleC5hcHAgYmFja3VwIGlzIG1pc3NpbmdcIik7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICghaXNEZXZlbG9wZXJJZFNpZ25lZEFwcChTSUdORURfQ09ERVhfQkFDS1VQKSkge1xuICAgIGxvZyhcIndhcm5cIiwgXCJTcGFya2xlIHVwZGF0ZSBwcmVwIHNraXBwZWQ7IENvZGV4LmFwcCBiYWNrdXAgaXMgbm90IERldmVsb3BlciBJRCBzaWduZWRcIik7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3Qgc3RhdGUgPSByZWFkSW5zdGFsbGVyU3RhdGUoKTtcbiAgY29uc3QgYXBwUm9vdCA9IHN0YXRlPy5hcHBSb290ID8/IGluZmVyTWFjQXBwUm9vdCgpO1xuICBpZiAoIWFwcFJvb3QpIHtcbiAgICBsb2coXCJ3YXJuXCIsIFwiU3BhcmtsZSB1cGRhdGUgcHJlcCBza2lwcGVkOyBjb3VsZCBub3QgaW5mZXIgQ29kZXguYXBwIHBhdGhcIik7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgbW9kZSA9IHtcbiAgICBlbmFibGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICBhcHBSb290LFxuICAgIGNvZGV4VmVyc2lvbjogc3RhdGU/LmNvZGV4VmVyc2lvbiA/PyBudWxsLFxuICB9O1xuICB3cml0ZUZpbGVTeW5jKFVQREFURV9NT0RFX0ZJTEUsIEpTT04uc3RyaW5naWZ5KG1vZGUsIG51bGwsIDIpKTtcblxuICB0cnkge1xuICAgIGV4ZWNGaWxlU3luYyhcImRpdHRvXCIsIFtTSUdORURfQ09ERVhfQkFDS1VQLCBhcHBSb290XSwgeyBzdGRpbzogXCJpZ25vcmVcIiB9KTtcbiAgICB0cnkge1xuICAgICAgZXhlY0ZpbGVTeW5jKFwieGF0dHJcIiwgW1wiLWRyXCIsIFwiY29tLmFwcGxlLnF1YXJhbnRpbmVcIiwgYXBwUm9vdF0sIHsgc3RkaW86IFwiaWdub3JlXCIgfSk7XG4gICAgfSBjYXRjaCB7fVxuICAgIGxvZyhcImluZm9cIiwgXCJSZXN0b3JlZCBzaWduZWQgQ29kZXguYXBwIGJlZm9yZSBTcGFya2xlIGluc3RhbGxcIiwgeyBhcHBSb290IH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nKFwiZXJyb3JcIiwgXCJGYWlsZWQgdG8gcmVzdG9yZSBzaWduZWQgQ29kZXguYXBwIGJlZm9yZSBTcGFya2xlIGluc3RhbGxcIiwge1xuICAgICAgbWVzc2FnZTogKGUgYXMgRXJyb3IpLm1lc3NhZ2UsXG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRGV2ZWxvcGVySWRTaWduZWRBcHAoYXBwUm9vdDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IHJlc3VsdCA9IHNwYXduU3luYyhcImNvZGVzaWduXCIsIFtcIi1kdlwiLCBcIi0tdmVyYm9zZT00XCIsIGFwcFJvb3RdLCB7XG4gICAgZW5jb2Rpbmc6IFwidXRmOFwiLFxuICAgIHN0ZGlvOiBbXCJpZ25vcmVcIiwgXCJwaXBlXCIsIFwicGlwZVwiXSxcbiAgfSk7XG4gIGNvbnN0IG91dHB1dCA9IGAke3Jlc3VsdC5zdGRvdXQgPz8gXCJcIn0ke3Jlc3VsdC5zdGRlcnIgPz8gXCJcIn1gO1xuICByZXR1cm4gKFxuICAgIHJlc3VsdC5zdGF0dXMgPT09IDAgJiZcbiAgICAvQXV0aG9yaXR5PURldmVsb3BlciBJRCBBcHBsaWNhdGlvbjovLnRlc3Qob3V0cHV0KSAmJlxuICAgICEvU2lnbmF0dXJlPWFkaG9jLy50ZXN0KG91dHB1dCkgJiZcbiAgICAhL1RlYW1JZGVudGlmaWVyPW5vdCBzZXQvLnRlc3Qob3V0cHV0KVxuICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5mZXJNYWNBcHBSb290KCk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBtYXJrZXIgPSBcIi5hcHAvQ29udGVudHMvTWFjT1MvXCI7XG4gIGNvbnN0IGlkeCA9IHByb2Nlc3MuZXhlY1BhdGguaW5kZXhPZihtYXJrZXIpO1xuICByZXR1cm4gaWR4ID49IDAgPyBwcm9jZXNzLmV4ZWNQYXRoLnNsaWNlKDAsIGlkeCArIFwiLmFwcFwiLmxlbmd0aCkgOiBudWxsO1xufVxuXG5leHBvcnQgY29uc3QgVVBEQVRFX0NIRUNLX0lOVEVSVkFMX01TID0gMjQgKiA2MCAqIDYwICogMTAwMDtcbmV4cG9ydCBjb25zdCBWRVJTSU9OX1JFID0gL152PyhcXGQrKVxcLihcXGQrKVxcLihcXGQrKSg/OlstK10uKik/JC87XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlbnN1cmVDb2RleFBsdXNQbHVzVXBkYXRlQ2hlY2soZm9yY2UgPSBmYWxzZSk6IFByb21pc2U8Q29kZXhQbHVzUGx1c1VwZGF0ZUNoZWNrPiB7XG4gIGNvbnN0IHN0YXRlID0gcmVhZFN0YXRlKCk7XG4gIGNvbnN0IGNhY2hlZCA9IHN0YXRlLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZUNoZWNrO1xuICBjb25zdCBjaGFubmVsID0gc3RhdGUuY29kZXhQbHVzUGx1cz8udXBkYXRlQ2hhbm5lbCA/PyBcInN0YWJsZVwiO1xuICBjb25zdCByZXBvID0gc3RhdGUuY29kZXhQbHVzUGx1cz8udXBkYXRlUmVwbyA/PyBDT0RFWF9QTFVTUExVU19SRVBPO1xuICBpZiAoXG4gICAgIWZvcmNlICYmXG4gICAgY2FjaGVkICYmXG4gICAgY2FjaGVkLmN1cnJlbnRWZXJzaW9uID09PSBDT0RFWF9QTFVTUExVU19WRVJTSU9OICYmXG4gICAgRGF0ZS5ub3coKSAtIERhdGUucGFyc2UoY2FjaGVkLmNoZWNrZWRBdCkgPCBVUERBVEVfQ0hFQ0tfSU5URVJWQUxfTVNcbiAgKSB7XG4gICAgcmV0dXJuIGNhY2hlZDtcbiAgfVxuXG4gIGNvbnN0IHJlbGVhc2UgPSBhd2FpdCBmZXRjaExhdGVzdFJlbGVhc2UocmVwbywgQ09ERVhfUExVU1BMVVNfVkVSU0lPTiwgY2hhbm5lbCA9PT0gXCJwcmVyZWxlYXNlXCIpO1xuICBjb25zdCBsYXRlc3RWZXJzaW9uID0gcmVsZWFzZS5sYXRlc3RUYWcgPyBub3JtYWxpemVWZXJzaW9uKHJlbGVhc2UubGF0ZXN0VGFnKSA6IG51bGw7XG4gIGNvbnN0IGNoZWNrOiBDb2RleFBsdXNQbHVzVXBkYXRlQ2hlY2sgPSB7XG4gICAgY2hlY2tlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgY3VycmVudFZlcnNpb246IENPREVYX1BMVVNQTFVTX1ZFUlNJT04sXG4gICAgbGF0ZXN0VmVyc2lvbixcbiAgICByZWxlYXNlVXJsOiByZWxlYXNlLnJlbGVhc2VVcmwgPz8gYGh0dHBzOi8vZ2l0aHViLmNvbS8ke3JlcG99L3JlbGVhc2VzYCxcbiAgICByZWxlYXNlTm90ZXM6IHJlbGVhc2UucmVsZWFzZU5vdGVzLFxuICAgIHVwZGF0ZUF2YWlsYWJsZTogbGF0ZXN0VmVyc2lvblxuICAgICAgPyBjb21wYXJlVmVyc2lvbnMobm9ybWFsaXplVmVyc2lvbihsYXRlc3RWZXJzaW9uKSwgQ09ERVhfUExVU1BMVVNfVkVSU0lPTikgPiAwXG4gICAgICA6IGZhbHNlLFxuICAgIC4uLihyZWxlYXNlLmVycm9yID8geyBlcnJvcjogcmVsZWFzZS5lcnJvciB9IDoge30pLFxuICB9O1xuICBzdGF0ZS5jb2RleFBsdXNQbHVzID8/PSB7fTtcbiAgc3RhdGUuY29kZXhQbHVzUGx1cy51cGRhdGVDaGVjayA9IGNoZWNrO1xuICB3cml0ZVN0YXRlKHN0YXRlKTtcbiAgcmV0dXJuIGNoZWNrO1xufVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaExhdGVzdFJlbGVhc2UoXG4gIHJlcG86IHN0cmluZyxcbiAgY3VycmVudFZlcnNpb246IHN0cmluZyxcbiAgaW5jbHVkZVByZXJlbGVhc2UgPSBmYWxzZSxcbik6IFByb21pc2U8eyBsYXRlc3RUYWc6IHN0cmluZyB8IG51bGw7IHJlbGVhc2VVcmw6IHN0cmluZyB8IG51bGw7IHJlbGVhc2VOb3Rlczogc3RyaW5nIHwgbnVsbDsgZXJyb3I/OiBzdHJpbmcgfT4ge1xuICB0cnkge1xuICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgY29uc3QgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4gY29udHJvbGxlci5hYm9ydCgpLCA4MDAwKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZW5kcG9pbnQgPSBpbmNsdWRlUHJlcmVsZWFzZSA/IFwicmVsZWFzZXM/cGVyX3BhZ2U9MjBcIiA6IFwicmVsZWFzZXMvbGF0ZXN0XCI7XG4gICAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaChgaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9yZXBvcy8ke3JlcG99LyR7ZW5kcG9pbnR9YCwge1xuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgXCJBY2NlcHRcIjogXCJhcHBsaWNhdGlvbi92bmQuZ2l0aHViK2pzb25cIixcbiAgICAgICAgICBcIlVzZXItQWdlbnRcIjogYGNvZGV4LXBsdXNwbHVzLyR7Y3VycmVudFZlcnNpb259YCxcbiAgICAgICAgfSxcbiAgICAgICAgc2lnbmFsOiBjb250cm9sbGVyLnNpZ25hbCxcbiAgICAgIH0pO1xuICAgICAgaWYgKHJlcy5zdGF0dXMgPT09IDQwNCkge1xuICAgICAgICByZXR1cm4geyBsYXRlc3RUYWc6IG51bGwsIHJlbGVhc2VVcmw6IG51bGwsIHJlbGVhc2VOb3RlczogbnVsbCwgZXJyb3I6IFwibm8gR2l0SHViIHJlbGVhc2UgZm91bmRcIiB9O1xuICAgICAgfVxuICAgICAgaWYgKCFyZXMub2spIHtcbiAgICAgICAgcmV0dXJuIHsgbGF0ZXN0VGFnOiBudWxsLCByZWxlYXNlVXJsOiBudWxsLCByZWxlYXNlTm90ZXM6IG51bGwsIGVycm9yOiBgR2l0SHViIHJldHVybmVkICR7cmVzLnN0YXR1c31gIH07XG4gICAgICB9XG4gICAgICBjb25zdCBqc29uID0gYXdhaXQgcmVzLmpzb24oKSBhcyB7IHRhZ19uYW1lPzogc3RyaW5nOyBodG1sX3VybD86IHN0cmluZzsgYm9keT86IHN0cmluZzsgZHJhZnQ/OiBib29sZWFuIH0gfCBBcnJheTx7IHRhZ19uYW1lPzogc3RyaW5nOyBodG1sX3VybD86IHN0cmluZzsgYm9keT86IHN0cmluZzsgZHJhZnQ/OiBib29sZWFuIH0+O1xuICAgICAgY29uc3QgYm9keSA9IEFycmF5LmlzQXJyYXkoanNvbikgPyBqc29uLmZpbmQoKHJlbGVhc2UpID0+ICFyZWxlYXNlLmRyYWZ0KSA6IGpzb247XG4gICAgICBpZiAoIWJvZHkpIHtcbiAgICAgICAgcmV0dXJuIHsgbGF0ZXN0VGFnOiBudWxsLCByZWxlYXNlVXJsOiBudWxsLCByZWxlYXNlTm90ZXM6IG51bGwsIGVycm9yOiBcIm5vIEdpdEh1YiByZWxlYXNlIGZvdW5kXCIgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxhdGVzdFRhZzogYm9keS50YWdfbmFtZSA/PyBudWxsLFxuICAgICAgICByZWxlYXNlVXJsOiBib2R5Lmh0bWxfdXJsID8/IGBodHRwczovL2dpdGh1Yi5jb20vJHtyZXBvfS9yZWxlYXNlc2AsXG4gICAgICAgIHJlbGVhc2VOb3RlczogYm9keS5ib2R5ID8/IG51bGwsXG4gICAgICB9O1xuICAgIH0gZmluYWxseSB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGxhdGVzdFRhZzogbnVsbCxcbiAgICAgIHJlbGVhc2VVcmw6IG51bGwsXG4gICAgICByZWxlYXNlTm90ZXM6IG51bGwsXG4gICAgICBlcnJvcjogZSBpbnN0YW5jZW9mIEVycm9yID8gZS5tZXNzYWdlIDogU3RyaW5nKGUpLFxuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVZlcnNpb24odjogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHYudHJpbSgpLnJlcGxhY2UoL152L2ksIFwiXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZVZlcnNpb25zKGE6IHN0cmluZywgYjogc3RyaW5nKTogbnVtYmVyIHtcbiAgY29uc3QgYXYgPSBWRVJTSU9OX1JFLmV4ZWMoYSk7XG4gIGNvbnN0IGJ2ID0gVkVSU0lPTl9SRS5leGVjKGIpO1xuICBpZiAoIWF2IHx8ICFidikgcmV0dXJuIDA7XG4gIGZvciAobGV0IGkgPSAxOyBpIDw9IDM7IGkrKykge1xuICAgIGNvbnN0IGRpZmYgPSBOdW1iZXIoYXZbaV0pIC0gTnVtYmVyKGJ2W2ldKTtcbiAgICBpZiAoZGlmZiAhPT0gMCkgcmV0dXJuIGRpZmY7XG4gIH1cbiAgcmV0dXJuIDA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmYWxsYmFja1NvdXJjZVJvb3QoKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IGNhbmRpZGF0ZXMgPSBbXG4gICAgam9pbihob21lZGlyKCksIFwiLmNvZGV4LXBsdXNwbHVzXCIsIFwic291cmNlXCIpLFxuICAgIGpvaW4odXNlclJvb3QhLCBcInNvdXJjZVwiKSxcbiAgXTtcbiAgZm9yIChjb25zdCBjYW5kaWRhdGUgb2YgY2FuZGlkYXRlcykge1xuICAgIGlmIChleGlzdHNTeW5jKGpvaW4oY2FuZGlkYXRlLCBcInBhY2thZ2VzXCIsIFwiaW5zdGFsbGVyXCIsIFwiZGlzdFwiLCBcImNsaS5qc1wiKSkpIHJldHVybiBjYW5kaWRhdGU7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXNjcmliZUluc3RhbGxhdGlvblNvdXJjZShzb3VyY2VSb290OiBzdHJpbmcgfCBudWxsKTogSW5zdGFsbGF0aW9uU291cmNlIHtcbiAgaWYgKCFzb3VyY2VSb290KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGtpbmQ6IFwidW5rbm93blwiLFxuICAgICAgbGFiZWw6IFwiVW5rbm93blwiLFxuICAgICAgZGV0YWlsOiBcIkNvZGV4Kysgc291cmNlIGxvY2F0aW9uIGlzIG5vdCByZWNvcmRlZCB5ZXQuXCIsXG4gICAgfTtcbiAgfVxuICBjb25zdCBub3JtYWxpemVkID0gc291cmNlUm9vdC5yZXBsYWNlKC9cXFxcL2csIFwiL1wiKTtcbiAgaWYgKC9cXC8oPzpIb21lYnJld3xob21lYnJldylcXC9DZWxsYXJcXC9jb2RleHBsdXNwbHVzXFwvLy50ZXN0KG5vcm1hbGl6ZWQpKSB7XG4gICAgcmV0dXJuIHsga2luZDogXCJob21lYnJld1wiLCBsYWJlbDogXCJIb21lYnJld1wiLCBkZXRhaWw6IHNvdXJjZVJvb3QgfTtcbiAgfVxuICBpZiAoZXhpc3RzU3luYyhqb2luKHNvdXJjZVJvb3QsIFwiLmdpdFwiKSkpIHtcbiAgICByZXR1cm4geyBraW5kOiBcImxvY2FsLWRldlwiLCBsYWJlbDogXCJMb2NhbCBkZXZlbG9wbWVudCBjaGVja291dFwiLCBkZXRhaWw6IHNvdXJjZVJvb3QgfTtcbiAgfVxuICBpZiAobm9ybWFsaXplZC5lbmRzV2l0aChcIi8uY29kZXgtcGx1c3BsdXMvc291cmNlXCIpIHx8IG5vcm1hbGl6ZWQuaW5jbHVkZXMoXCIvLmNvZGV4LXBsdXNwbHVzL3NvdXJjZS9cIikpIHtcbiAgICByZXR1cm4geyBraW5kOiBcImdpdGh1Yi1zb3VyY2VcIiwgbGFiZWw6IFwiR2l0SHViIHNvdXJjZSBpbnN0YWxsZXJcIiwgZGV0YWlsOiBzb3VyY2VSb290IH07XG4gIH1cbiAgaWYgKGV4aXN0c1N5bmMoam9pbihzb3VyY2VSb290LCBcInBhY2thZ2UuanNvblwiKSkpIHtcbiAgICByZXR1cm4geyBraW5kOiBcInNvdXJjZS1hcmNoaXZlXCIsIGxhYmVsOiBcIlNvdXJjZSBhcmNoaXZlXCIsIGRldGFpbDogc291cmNlUm9vdCB9O1xuICB9XG4gIHJldHVybiB7IGtpbmQ6IFwidW5rbm93blwiLCBsYWJlbDogXCJVbmtub3duXCIsIGRldGFpbDogc291cmNlUm9vdCB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RhcnRJbnN0YWxsZWRDbGkoY2xpOiBzdHJpbmcsIGFyZ3M6IHN0cmluZ1tdKTogdm9pZCB7XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSBcImRhcndpblwiICYmIHN0YXJ0SW5zdGFsbGVkQ2xpV2l0aExhdW5jaGQoY2xpLCBhcmdzKSkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBjaGlsZCA9IHNwYXduKHByb2Nlc3MuZXhlY1BhdGgsIFtjbGksIC4uLmFyZ3NdLCB7XG4gICAgY3dkOiByZXNvbHZlKGRpcm5hbWUoY2xpKSwgXCIuLlwiLCBcIi4uXCIsIFwiLi5cIiksXG4gICAgZW52OiB7IC4uLnByb2Nlc3MuZW52LCBDT0RFWF9QTFVTUExVU19NQU5VQUxfVVBEQVRFOiBcIjFcIiB9LFxuICAgIGRldGFjaGVkOiB0cnVlLFxuICAgIHN0ZGlvOiBcImlnbm9yZVwiLFxuICB9KTtcbiAgY2hpbGQudW5yZWYoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0SW5zdGFsbGVkQ2xpV2l0aExhdW5jaGQoY2xpOiBzdHJpbmcsIGFyZ3M6IHN0cmluZ1tdKTogYm9vbGVhbiB7XG4gIGNvbnN0IGxhYmVsID0gYGNvbS5jb2RleHBsdXNwbHVzLnBhdGNoLWhlbHBlci4ke3Byb2Nlc3MucGlkfS4ke0RhdGUubm93KCl9YDtcbiAgY29uc3QgY2xlYW51cCA9IGBsYXVuY2hjdGwgcmVtb3ZlICR7bGFiZWx9ID4vZGV2L251bGwgMj4mMSB8fCBsYXVuY2hjdGwgYm9vdG91dCBndWkvJChpZCAtdSkvJHtsYWJlbH0gPi9kZXYvbnVsbCAyPiYxIHx8IHRydWVgO1xuICBjb25zdCBjb21tYW5kID0gW1xuICAgIGB0cmFwICR7c2hlbGxRdW90ZShjbGVhbnVwKX0gRVhJVGAsXG4gICAgYGNkICR7c2hlbGxRdW90ZShyZXNvbHZlKGRpcm5hbWUoY2xpKSwgXCIuLlwiLCBcIi4uXCIsIFwiLi5cIikpfWAsXG4gICAgYENPREVYX1BMVVNQTFVTX01BTlVBTF9VUERBVEU9MSAke1twcm9jZXNzLmV4ZWNQYXRoLCBjbGksIC4uLmFyZ3NdLm1hcChzaGVsbFF1b3RlKS5qb2luKFwiIFwiKX1gLFxuICBdLmpvaW4oXCIgJiYgXCIpO1xuICBjb25zdCByZXN1bHQgPSBzcGF3blN5bmMoXG4gICAgXCJsYXVuY2hjdGxcIixcbiAgICBbXG4gICAgICBcInN1Ym1pdFwiLFxuICAgICAgXCItbFwiLFxuICAgICAgbGFiZWwsXG4gICAgICBcIi0tXCIsXG4gICAgICBcIi9iaW4vc2hcIixcbiAgICAgIFwiLWNcIixcbiAgICAgIGAke2NvbW1hbmR9IHx8IHRydWVgLFxuICAgIF0sXG4gICAge1xuICAgICAgZW5jb2Rpbmc6IFwidXRmOFwiLFxuICAgICAgc3RkaW86IFwiaWdub3JlXCIsXG4gICAgfSxcbiAgKTtcbiAgaWYgKHJlc3VsdC5zdGF0dXMgPT09IDApIHJldHVybiB0cnVlO1xuICBsb2coXCJ3YXJuXCIsIGBsYXVuY2hjdGwgc3VibWl0IGZhaWxlZCBmb3IgQ29kZXgrKyBwYXRjaCBoZWxwZXI6ICR7cmVzdWx0LmVycm9yPy5tZXNzYWdlID8/IHJlc3VsdC5zdGF0dXN9YCk7XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNoZWxsUXVvdGUodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgJyR7dmFsdWUucmVwbGFjZSgvJy9nLCBgJ1xcXFwnJ2ApfSdgO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFya1NlbGZVcGRhdGVTdGFydGVkKHNvdXJjZVJvb3Q6IHN0cmluZyk6IFNlbGZVcGRhdGVTdGF0ZSB7XG4gIGNvbnN0IGNvbmZpZyA9IHJlYWRTdGF0ZSgpLmNvZGV4UGx1c1BsdXM7XG4gIGNvbnN0IGNoYW5uZWwgPSBjb25maWc/LnVwZGF0ZUNoYW5uZWwgPz8gXCJzdGFibGVcIjtcbiAgY29uc3Qgc3RhdGU6IFNlbGZVcGRhdGVTdGF0ZSA9IHtcbiAgICBjaGVja2VkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICBzdGF0dXM6IFwiY2hlY2tpbmdcIixcbiAgICBjdXJyZW50VmVyc2lvbjogQ09ERVhfUExVU1BMVVNfVkVSU0lPTixcbiAgICBsYXRlc3RWZXJzaW9uOiBudWxsLFxuICAgIHRhcmdldFJlZjogY29uZmlnPy51cGRhdGVDaGFubmVsID09PSBcImN1c3RvbVwiID8gY29uZmlnLnVwZGF0ZVJlZiA/PyBudWxsIDogbnVsbCxcbiAgICByZWxlYXNlVXJsOiBudWxsLFxuICAgIHJlcG86IGNvbmZpZz8udXBkYXRlUmVwbyA/PyBDT0RFWF9QTFVTUExVU19SRVBPLFxuICAgIGNoYW5uZWwsXG4gICAgc291cmNlUm9vdCxcbiAgICBpbnN0YWxsYXRpb25Tb3VyY2U6IGRlc2NyaWJlSW5zdGFsbGF0aW9uU291cmNlKHNvdXJjZVJvb3QpLFxuICB9O1xuICB3cml0ZVNlbGZVcGRhdGVTdGF0ZShzdGF0ZSk7XG4gIHJldHVybiBzdGF0ZTtcbn1cbiIsICJpbXBvcnQgeyBCcm93c2VyVmlldywgQnJvd3NlcldpbmRvdyB9IGZyb20gXCJlbGVjdHJvblwiO1xuaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyByYW5kb21VVUlEIH0gZnJvbSBcIm5vZGU6Y3J5cHRvXCI7XG5pbXBvcnQgdHlwZSB7IENvZGV4UnVudGltZUNhcGFiaWxpdGllcywgQ29kZXhWaWV3Q3JlYXRlT3B0aW9ucywgQ29kZXhWaWV3UmVmIH0gZnJvbSBcIkBjb2RleC1wbHVzcGx1cy9zZGtcIjtcbmltcG9ydCB0eXBlIHsgTmF0aXZlVHdlYWtDb250ZXh0IH0gZnJvbSBcIi4vbmF0aXZlLWJyaWRnZVwiO1xuaW1wb3J0IHsgR1VFU1RfUFJFTE9BRF9QQVRILCBsb2cgfSBmcm9tIFwiLi9ydW50aW1lLXBhdGhzXCI7XG5pbXBvcnQge1xuICBhc1JlY29yZCxcbiAgY2FsbE9iamVjdE1ldGhvZCxcbiAgY29kZXhBcHBVcmwsXG4gIGdldENvZGV4V2luZG93U2VydmljZXMsXG4gIGdldFByaW1hcnlDb2RleFdpbmRvdyxcbiAgaXNXaW5kb3dEZXN0cm95ZWQsXG4gIG1ha2VXaW5kb3dMaWtlRm9yVmlldyxcbiAgbm9ybWFsaXplQ29kZXhSb3V0ZSxcbiAgbm9ybWFsaXplT3dsVmlld1VybCxcbiAgd2luZG93SWRGb3IsXG59IGZyb20gXCIuL2NvZGV4LXdpbmRvd3NcIjtcbmltcG9ydCB7XG4gIGluc3BlY3RWaWV3QXR0YWNoVGFyZ2V0cyxcbiAgcHJvYmVSdW50aW1lQ29tcGF0aWJpbGl0eSxcbiAgdmlld3NDYXBhYmlsaXRpZXNGcm9tU25hcHNob3QsXG4gIHZpZXdTYW1wbGVGcm9tQ29uc3RydWN0b3IsXG4gIHdpbmRvd1NhbXBsZUZyb20sXG59IGZyb20gXCIuL2NvZGV4LXJ1bnRpbWUtcHJvYmVcIjtcblxuZXhwb3J0IHR5cGUgT3dsVmlld0F0dGFjaE1vZGUgPSBcImNvbnRlbnRWaWV3XCIgfCBcImJyb3dzZXJWaWV3XCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWFuYWdlZE93bFZpZXcge1xuICBrZXk6IHN0cmluZztcbiAgdHdlYWtJZDogc3RyaW5nO1xuICBpZDogc3RyaW5nO1xuICB2aWV3OiBFbGVjdHJvbi5Ccm93c2VyVmlldztcbiAgcGFyZW50V2luZG93SWQ6IG51bWJlciB8IG51bGw7XG4gIGF0dGFjaE1vZGU6IE93bFZpZXdBdHRhY2hNb2RlIHwgbnVsbDtcbiAgZGlzcG9zZUJpbmRpbmdzOiBBcnJheTwoKSA9PiB2b2lkPjtcbiAgZGlzcG9zZWQ6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjb25zdCB1bnRydXN0ZWRXZWJDb250ZW50c0lkcyA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuY29uc3Qgb3dsVmlld3MgPSBuZXcgTWFwPHN0cmluZywgTWFuYWdlZE93bFZpZXc+KCk7XG5cbmV4cG9ydCBmdW5jdGlvbiBtYXJrVW50cnVzdGVkV2ViQ29udGVudHMod2M6IEVsZWN0cm9uLldlYkNvbnRlbnRzKTogdm9pZCB7XG4gIHVudHJ1c3RlZFdlYkNvbnRlbnRzSWRzLmFkZCh3Yy5pZCk7XG4gIHdjLm9uY2UoXCJkZXN0cm95ZWRcIiwgKCkgPT4geyB1bnRydXN0ZWRXZWJDb250ZW50c0lkcy5kZWxldGUod2MuaWQpOyB9KTtcbn1cblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRPd2xWaWV3Q2FwYWJpbGl0aWVzKCk6IENvZGV4UnVudGltZUNhcGFiaWxpdGllc1tcInZpZXdzXCJdIHtcbiAgY29uc3Qgc25hcHNob3QgPSBwcm9iZVJ1bnRpbWVDb21wYXRpYmlsaXR5KHtcbiAgICB1c2VyUm9vdDogXCJcIixcbiAgICBydW50aW1lRGlyOiBcIlwiLFxuICAgIGNvZGV4VmVyc2lvbjogbnVsbCxcbiAgICBjaGFubmVsOiBudWxsLFxuICAgIGdldFdpbmRvd1NlcnZpY2VzOiBnZXRDb2RleFdpbmRvd1NlcnZpY2VzLFxuICAgIGVudjoge1xuICAgICAgYnJvd3NlclZpZXc6IEJyb3dzZXJWaWV3LFxuICAgICAgYnJvd3NlcldpbmRvdzogQnJvd3NlcldpbmRvdyxcbiAgICAgIGluc3BlY3RFeGlzdGluZ1dpbmRvdzogKCkgPT4gd2luZG93U2FtcGxlRnJvbShnZXRQcmltYXJ5Q29kZXhXaW5kb3coKSA/PyBCcm93c2VyV2luZG93LmdldEZvY3VzZWRXaW5kb3coKSksXG4gICAgICBpbnNwZWN0QnJvd3NlclZpZXc6ICgpID0+IHZpZXdTYW1wbGVGcm9tQ29uc3RydWN0b3IoQnJvd3NlclZpZXcpLFxuICAgIH0sXG4gIH0pO1xuICByZXR1cm4gdmlld3NDYXBhYmlsaXRpZXNGcm9tU25hcHNob3Qoc25hcHNob3QpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlT3dsVmlldyhcbiAgY3R4OiBOYXRpdmVUd2Vha0NvbnRleHQsXG4gIG9wdHM6IENvZGV4Vmlld0NyZWF0ZU9wdGlvbnMsXG4pOiBQcm9taXNlPENvZGV4Vmlld1JlZj4ge1xuICBjb25zdCBpZCA9IGFzc2VydEJyaWRnZUlkKG9wdHMuaWQgPz8gcmFuZG9tVVVJRCgpLCBcIkNvZGV4IHZpZXcgaWRcIik7XG4gIGNvbnN0IGtleSA9IG93bFZpZXdLZXkoY3R4LmlkLCBpZCk7XG4gIGlmIChvd2xWaWV3cy5oYXMoa2V5KSkgdGhyb3cgbmV3IEVycm9yKGBDb2RleCB2aWV3IGFscmVhZHkgZXhpc3RzOiAke2N0eC5pZH06JHtpZH1gKTtcblxuICBjb25zdCBwYXJlbnQgPSB0eXBlb2Ygb3B0cy5wYXJlbnRXaW5kb3dJZCA9PT0gXCJudW1iZXJcIlxuICAgID8gQnJvd3NlcldpbmRvdy5mcm9tSWQob3B0cy5wYXJlbnRXaW5kb3dJZClcbiAgICA6IGdldFByaW1hcnlDb2RleFdpbmRvdygpO1xuICBpZiAoIXBhcmVudCB8fCBpc1dpbmRvd0Rlc3Ryb3llZChwYXJlbnQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ29kZXggdmlldyBuZWVkcyBhbiBhY3RpdmUgcGFyZW50IHdpbmRvd1wiKTtcbiAgfVxuXG4gIGNvbnN0IHNlcnZpY2VzID0gZ2V0Q29kZXhXaW5kb3dTZXJ2aWNlcygpO1xuICBjb25zdCB3aW5kb3dNYW5hZ2VyID0gc2VydmljZXM/LndpbmRvd01hbmFnZXI7XG4gIGNvbnN0IHJvdXRlID0gb3B0cy5yb3V0ZSA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IG5vcm1hbGl6ZUNvZGV4Um91dGUob3B0cy5yb3V0ZSk7XG4gIGNvbnN0IGhvc3RJZCA9IG9wdHMuaG9zdElkIHx8IFwibG9jYWxcIjtcbiAgY29uc3QgdmlldyA9IG5ldyBCcm93c2VyVmlldyh7XG4gICAgd2ViUHJlZmVyZW5jZXM6IHtcbiAgICAgIHByZWxvYWQ6IG9wdHMucmVnaXN0ZXJXaXRoQ29kZXggPT09IGZhbHNlXG4gICAgICAgID8gKGV4aXN0c1N5bmMoR1VFU1RfUFJFTE9BRF9QQVRIKSA/IEdVRVNUX1BSRUxPQURfUEFUSCA6IHVuZGVmaW5lZClcbiAgICAgICAgOiB3aW5kb3dNYW5hZ2VyPy5vcHRpb25zPy5wcmVsb2FkUGF0aCxcbiAgICAgIGNvbnRleHRJc29sYXRpb246IHRydWUsXG4gICAgICBub2RlSW50ZWdyYXRpb246IGZhbHNlLFxuICAgICAgc2FuZGJveDogdHJ1ZSxcbiAgICAgIHNwZWxsY2hlY2s6IGZhbHNlLFxuICAgICAgZGV2VG9vbHM6IHdpbmRvd01hbmFnZXI/Lm9wdGlvbnM/LmFsbG93RGV2dG9vbHMsXG4gICAgfSxcbiAgfSk7XG4gIG1hcmtVbnRydXN0ZWRXZWJDb250ZW50cyh2aWV3LndlYkNvbnRlbnRzKTtcblxuICBpZiAob3B0cy5iYWNrZ3JvdW5kQ29sb3IpIHtcbiAgICBjYWxsT2JqZWN0TWV0aG9kKHZpZXcsIFwic2V0QmFja2dyb3VuZENvbG9yXCIsIFtvcHRzLmJhY2tncm91bmRDb2xvcl0pO1xuICAgIGNhbGxPYmplY3RNZXRob2QoYXNSZWNvcmQodmlldyk/LndlYkNvbnRlbnRzVmlldywgXCJzZXRCYWNrZ3JvdW5kQ29sb3JcIiwgW29wdHMuYmFja2dyb3VuZENvbG9yXSk7XG4gIH1cblxuICBjb25zdCBtYW5hZ2VkOiBNYW5hZ2VkT3dsVmlldyA9IHtcbiAgICBrZXksXG4gICAgdHdlYWtJZDogY3R4LmlkLFxuICAgIGlkLFxuICAgIHZpZXcsXG4gICAgcGFyZW50V2luZG93SWQ6IHdpbmRvd0lkRm9yKHBhcmVudCksXG4gICAgYXR0YWNoTW9kZTogbnVsbCxcbiAgICBkaXNwb3NlQmluZGluZ3M6IFtdLFxuICAgIGRpc3Bvc2VkOiBmYWxzZSxcbiAgfTtcbiAgb3dsVmlld3Muc2V0KGtleSwgbWFuYWdlZCk7XG5cbiAgdHJ5IHtcbiAgICBpZiAocm91dGUgIT09IG51bGwgJiYgb3B0cy5yZWdpc3RlcldpdGhDb2RleCAhPT0gZmFsc2UgJiYgd2luZG93TWFuYWdlcj8ucmVnaXN0ZXJXaW5kb3cpIHtcbiAgICAgIGNvbnN0IGFwcGVhcmFuY2UgPSBvcHRzLmFwcGVhcmFuY2UgfHwgXCJzZWNvbmRhcnlcIjtcbiAgICAgIGNvbnN0IHdpbmRvd0xpa2UgPSBtYWtlV2luZG93TGlrZUZvclZpZXcodmlldyk7XG4gICAgICB3aW5kb3dNYW5hZ2VyLnJlZ2lzdGVyV2luZG93KHdpbmRvd0xpa2UsIGhvc3RJZCwgZmFsc2UsIGFwcGVhcmFuY2UpO1xuICAgICAgc2VydmljZXM/LmdldENvbnRleHQ/Lihob3N0SWQpPy5yZWdpc3RlcldpbmRvdz8uKHdpbmRvd0xpa2UpO1xuICAgIH1cblxuICAgIGF0dGFjaE93bFZpZXcobWFuYWdlZCwgcGFyZW50KTtcbiAgICBpZiAob3B0cy5ib3VuZHMpIHNldE93bFZpZXdCb3VuZHMobWFuYWdlZCwgb3B0cy5ib3VuZHMpO1xuICAgIGlmIChvcHRzLnZpc2libGUgPT09IGZhbHNlKSBzZXRPd2xWaWV3VmlzaWJsZShtYW5hZ2VkLCBmYWxzZSk7XG5cbiAgICBpZiAocm91dGUgIT09IG51bGwpIHtcbiAgICAgIGF3YWl0IHZpZXcud2ViQ29udGVudHMubG9hZFVSTChjb2RleEFwcFVybChyb3V0ZSwgaG9zdElkKSk7XG4gICAgfSBlbHNlIGlmIChvcHRzLnVybCkge1xuICAgICAgYXdhaXQgdmlldy53ZWJDb250ZW50cy5sb2FkVVJMKG5vcm1hbGl6ZU93bFZpZXdVcmwob3B0cy51cmwpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXdhaXQgdmlldy53ZWJDb250ZW50cy5sb2FkVVJMKFwiYWJvdXQ6YmxhbmtcIik7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgZGlzcG9zZU93bFZpZXcobWFuYWdlZCk7XG4gICAgdGhyb3cgZTtcbiAgfVxuXG4gIGxvZyhcImluZm9cIiwgYGNyZWF0ZWQgT3dsIHZpZXcgJHtjdHguaWR9OiR7aWR9YCwge1xuICAgIHBhcmVudFdpbmRvd0lkOiBtYW5hZ2VkLnBhcmVudFdpbmRvd0lkLFxuICAgIHdlYkNvbnRlbnRzSWQ6IHZpZXcud2ViQ29udGVudHMuaWQsXG4gICAgYXR0YWNoTW9kZTogbWFuYWdlZC5hdHRhY2hNb2RlLFxuICB9KTtcbiAgcmV0dXJuIG93bFZpZXdSZWYobWFuYWdlZCk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjYWxsT3dsVmlldyhcbiAgdHdlYWtJZDogc3RyaW5nLFxuICBpZDogc3RyaW5nLFxuICBtZXRob2Q6IHN0cmluZyxcbiAgYXJnPzogdW5rbm93bixcbiAgYXJnMj86IHVua25vd24sXG4pOiBQcm9taXNlPHVua25vd24+IHtcbiAgY29uc3QgdmlldyA9IG93bFZpZXdGb3IodHdlYWtJZCwgaWQpO1xuICBpZiAobWV0aG9kID09PSBcInNldEJvdW5kc1wiKSByZXR1cm4gc2V0T3dsVmlld0JvdW5kcyh2aWV3LCBhcmcgYXMgRWxlY3Ryb24uUmVjdGFuZ2xlKTtcbiAgaWYgKG1ldGhvZCA9PT0gXCJzZXRWaXNpYmxlXCIpIHJldHVybiBzZXRPd2xWaWV3VmlzaWJsZSh2aWV3LCBCb29sZWFuKGFyZykpO1xuICBpZiAobWV0aG9kID09PSBcImJyaW5nVG9Gcm9udFwiKSByZXR1cm4gYnJpbmdPd2xWaWV3VG9Gcm9udCh2aWV3KTtcbiAgaWYgKG1ldGhvZCA9PT0gXCJsb2FkUm91dGVcIikge1xuICAgIGNvbnN0IHJvdXRlID0gbm9ybWFsaXplQ29kZXhSb3V0ZShTdHJpbmcoYXJnKSk7XG4gICAgY29uc3QgaG9zdElkID0gdHlwZW9mIGFyZzIgPT09IFwic3RyaW5nXCIgJiYgYXJnMiA/IGFyZzIgOiBcImxvY2FsXCI7XG4gICAgcmV0dXJuIHZpZXcudmlldy53ZWJDb250ZW50cy5sb2FkVVJMKGNvZGV4QXBwVXJsKHJvdXRlLCBob3N0SWQpKTtcbiAgfVxuICBpZiAobWV0aG9kID09PSBcImxvYWRVcmxcIikgcmV0dXJuIHZpZXcudmlldy53ZWJDb250ZW50cy5sb2FkVVJMKG5vcm1hbGl6ZU93bFZpZXdVcmwoU3RyaW5nKGFyZykpKTtcbiAgaWYgKG1ldGhvZCA9PT0gXCJkaXNwb3NlXCIpIHJldHVybiBkaXNwb3NlT3dsVmlld0J5SWQodHdlYWtJZCwgaWQpO1xuICB0aHJvdyBuZXcgRXJyb3IoYHVua25vd24gQ29kZXggdmlldyBtZXRob2Q6ICR7bWV0aG9kfWApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb3dsVmlld1JlZih2aWV3OiBNYW5hZ2VkT3dsVmlldyk6IENvZGV4Vmlld1JlZiB7XG4gIHJldHVybiB7XG4gICAgaWQ6IHZpZXcuaWQsXG4gICAgd2ViQ29udGVudHNJZDogdmlldy52aWV3LndlYkNvbnRlbnRzLmlkLFxuICAgIHBhcmVudFdpbmRvd0lkOiB2aWV3LnBhcmVudFdpbmRvd0lkLFxuICAgIHNldEJvdW5kczogKGJvdW5kcykgPT4gUHJvbWlzZS5yZXNvbHZlKHNldE93bFZpZXdCb3VuZHModmlldywgYm91bmRzKSksXG4gICAgc2V0VmlzaWJsZTogKHZpc2libGUpID0+IFByb21pc2UucmVzb2x2ZShzZXRPd2xWaWV3VmlzaWJsZSh2aWV3LCB2aXNpYmxlKSksXG4gICAgYnJpbmdUb0Zyb250OiAoKSA9PiBQcm9taXNlLnJlc29sdmUoYnJpbmdPd2xWaWV3VG9Gcm9udCh2aWV3KSksXG4gICAgbG9hZFJvdXRlOiAocm91dGUsIGhvc3RJZCkgPT4gdmlldy52aWV3LndlYkNvbnRlbnRzLmxvYWRVUkwoY29kZXhBcHBVcmwobm9ybWFsaXplQ29kZXhSb3V0ZShyb3V0ZSksIGhvc3RJZCB8fCBcImxvY2FsXCIpKS50aGVuKCgpID0+IHt9KSxcbiAgICBsb2FkVXJsOiAodXJsKSA9PiB2aWV3LnZpZXcud2ViQ29udGVudHMubG9hZFVSTChub3JtYWxpemVPd2xWaWV3VXJsKHVybCkpLnRoZW4oKCkgPT4ge30pLFxuICAgIGRpc3Bvc2U6ICgpID0+IFByb21pc2UucmVzb2x2ZShkaXNwb3NlT3dsVmlld0J5SWQodmlldy50d2Vha0lkLCB2aWV3LmlkKSksXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhdHRhY2hPd2xWaWV3KHZpZXc6IE1hbmFnZWRPd2xWaWV3LCBwYXJlbnQ6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cpOiB2b2lkIHtcbiAgY29uc3QgdGFyZ2V0cyA9IGluc3BlY3RWaWV3QXR0YWNoVGFyZ2V0cyhwYXJlbnQsIHZpZXcudmlldyk7XG4gIGlmICh0YXJnZXRzLmFkZEJyb3dzZXJWaWV3KSB7XG4gICAgY2FsbE9iamVjdE1ldGhvZChwYXJlbnQsIFwiYWRkQnJvd3NlclZpZXdcIiwgW3ZpZXcudmlld10pO1xuICAgIHZpZXcuYXR0YWNoTW9kZSA9IFwiYnJvd3NlclZpZXdcIjtcbiAgfSBlbHNlIGlmIChcbiAgICB0YXJnZXRzLmFkZENoaWxkVmlldyAmJlxuICAgIHRhcmdldHMud2ViQ29udGVudHNWaWV3XG4gICkge1xuICAgIHRyeSB7XG4gICAgICBhZGRPd2xDaGlsZFZpZXcocGFyZW50LCB2aWV3LnZpZXcpO1xuICAgICAgdmlldy5hdHRhY2hNb2RlID0gXCJjb250ZW50Vmlld1wiO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZyhcIndhcm5cIiwgXCJPd2wgY29udGVudFZpZXcgYXR0YWNobWVudCBmYWlsZWQ7IGZhbGxpbmcgYmFjayB0byBCcm93c2VyVmlld1wiLCB7XG4gICAgICAgIHR3ZWFrSWQ6IHZpZXcudHdlYWtJZCxcbiAgICAgICAgdmlld0lkOiB2aWV3LmlkLFxuICAgICAgICBlcnJvcjogU3RyaW5nKGUpLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIGlmICghdmlldy5hdHRhY2hNb2RlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiT3dsIHZpZXcgYXR0YWNobWVudCBpcyBub3QgYXZhaWxhYmxlIG9uIHRoaXMgQ29kZXggd2luZG93XCIpO1xuICB9XG5cbiAgY29uc3QgZGlzcG9zZSA9ICgpID0+IGRpc3Bvc2VPd2xWaWV3QnlJZCh2aWV3LnR3ZWFrSWQsIHZpZXcuaWQpO1xuICBiaW5kV2luZG93RXZlbnQocGFyZW50LCB2aWV3LCBcImNsb3NlZFwiLCBkaXNwb3NlKTtcbiAgYmluZFdpbmRvd0V2ZW50KHBhcmVudCwgdmlldywgXCJjbG9zZVwiLCBkaXNwb3NlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJyaW5nT3dsVmlld1RvRnJvbnQodmlldzogTWFuYWdlZE93bFZpZXcpOiB2b2lkIHtcbiAgaWYgKHZpZXcuZGlzcG9zZWQpIHJldHVybjtcbiAgY29uc3QgcGFyZW50ID0gdmlldy5wYXJlbnRXaW5kb3dJZCA9PT0gbnVsbCA/IG51bGwgOiBCcm93c2VyV2luZG93LmZyb21JZCh2aWV3LnBhcmVudFdpbmRvd0lkKTtcbiAgaWYgKCFwYXJlbnQgfHwgaXNXaW5kb3dEZXN0cm95ZWQocGFyZW50KSkgcmV0dXJuO1xuICBjb25zdCBjb250ZW50VmlldyA9IGFzUmVjb3JkKHBhcmVudCk/LmNvbnRlbnRWaWV3O1xuICBjb25zdCB3ZWJDb250ZW50c1ZpZXcgPSBhc1JlY29yZCh2aWV3LnZpZXcpPy53ZWJDb250ZW50c1ZpZXc7XG4gIGlmICh2aWV3LmF0dGFjaE1vZGUgPT09IFwiY29udGVudFZpZXdcIiAmJiB3ZWJDb250ZW50c1ZpZXcpIHtcbiAgICB0cnkge1xuICAgICAgaWYgKHR5cGVvZiBhc1JlY29yZChwYXJlbnQpPy5zZXRUb3BCcm93c2VyVmlldyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGNhbGxPYmplY3RNZXRob2QocGFyZW50LCBcInNldFRvcEJyb3dzZXJWaWV3XCIsIFt2aWV3LnZpZXddKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNhbGxPYmplY3RNZXRob2QoY29udGVudFZpZXcsIFwiYWRkQ2hpbGRWaWV3XCIsIFt3ZWJDb250ZW50c1ZpZXddKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2coXCJ3YXJuXCIsIFwiT3dsIGNvbnRlbnRWaWV3IGJyaW5nLXRvLWZyb250IGZhaWxlZFwiLCB7XG4gICAgICAgIHR3ZWFrSWQ6IHZpZXcudHdlYWtJZCxcbiAgICAgICAgdmlld0lkOiB2aWV3LmlkLFxuICAgICAgICBlcnJvcjogU3RyaW5nKGUpLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIGlmICh0eXBlb2YgYXNSZWNvcmQocGFyZW50KT8uc2V0VG9wQnJvd3NlclZpZXcgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIGNhbGxPYmplY3RNZXRob2QocGFyZW50LCBcInNldFRvcEJyb3dzZXJWaWV3XCIsIFt2aWV3LnZpZXddKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0T3dsVmlld0JvdW5kcyh2aWV3OiBNYW5hZ2VkT3dsVmlldywgYm91bmRzOiBFbGVjdHJvbi5SZWN0YW5nbGUpOiB2b2lkIHtcbiAgYXNzZXJ0Qm91bmRzKGJvdW5kcyk7XG4gIGNhbGxPYmplY3RNZXRob2Qodmlldy52aWV3LCBcInNldEJvdW5kc1wiLCBbYm91bmRzXSk7XG4gIGNhbGxPYmplY3RNZXRob2QoYXNSZWNvcmQodmlldy52aWV3KT8ud2ViQ29udGVudHNWaWV3LCBcInNldEJvdW5kc1wiLCBbYm91bmRzXSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRPd2xWaWV3VmlzaWJsZSh2aWV3OiBNYW5hZ2VkT3dsVmlldywgdmlzaWJsZTogYm9vbGVhbik6IHZvaWQge1xuICBjYWxsT2JqZWN0TWV0aG9kKGFzUmVjb3JkKHZpZXcudmlldyk/LndlYkNvbnRlbnRzVmlldywgXCJzZXRWaXNpYmxlXCIsIFt2aXNpYmxlXSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkaXNwb3NlT3dsVmlld0J5SWQodHdlYWtJZDogc3RyaW5nLCBpZDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IHZpZXcgPSBvd2xWaWV3cy5nZXQob3dsVmlld0tleSh0d2Vha0lkLCBpZCkpO1xuICBpZiAoIXZpZXcpIHJldHVybjtcbiAgZGlzcG9zZU93bFZpZXcodmlldyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkaXNwb3NlT3dsVmlld3NGb3JUd2Vhayh0d2Vha0lkOiBzdHJpbmcpOiB2b2lkIHtcbiAgZm9yIChjb25zdCB2aWV3IG9mIFsuLi5vd2xWaWV3cy52YWx1ZXMoKV0pIHtcbiAgICBpZiAodmlldy50d2Vha0lkID09PSB0d2Vha0lkKSBkaXNwb3NlT3dsVmlldyh2aWV3KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGlzcG9zZUFsbE93bFZpZXdzKCk6IHZvaWQge1xuICBmb3IgKGNvbnN0IHZpZXcgb2YgWy4uLm93bFZpZXdzLnZhbHVlcygpXSkgZGlzcG9zZU93bFZpZXcodmlldyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkaXNwb3NlT3dsVmlldyh2aWV3OiBNYW5hZ2VkT3dsVmlldyk6IHZvaWQge1xuICBpZiAodmlldy5kaXNwb3NlZCkgcmV0dXJuO1xuICB2aWV3LmRpc3Bvc2VkID0gdHJ1ZTtcbiAgb3dsVmlld3MuZGVsZXRlKHZpZXcua2V5KTtcbiAgZm9yIChjb25zdCBkaXNwb3NlIG9mIHZpZXcuZGlzcG9zZUJpbmRpbmdzLnNwbGljZSgwKSkge1xuICAgIHRyeSB7XG4gICAgICBkaXNwb3NlKCk7XG4gICAgfSBjYXRjaCB7fVxuICB9XG4gIGNvbnN0IHBhcmVudCA9IHZpZXcucGFyZW50V2luZG93SWQgPT09IG51bGwgPyBudWxsIDogQnJvd3NlcldpbmRvdy5mcm9tSWQodmlldy5wYXJlbnRXaW5kb3dJZCk7XG4gIGlmIChwYXJlbnQgJiYgIWlzV2luZG93RGVzdHJveWVkKHBhcmVudCkpIHtcbiAgICB0cnkge1xuICAgICAgaWYgKHZpZXcuYXR0YWNoTW9kZSA9PT0gXCJjb250ZW50Vmlld1wiKSB7XG4gICAgICAgIHJlbW92ZU93bENoaWxkVmlldyhwYXJlbnQsIHZpZXcudmlldyk7XG4gICAgICB9IGVsc2UgaWYgKHZpZXcuYXR0YWNoTW9kZSA9PT0gXCJicm93c2VyVmlld1wiKSB7XG4gICAgICAgIGNhbGxPYmplY3RNZXRob2QocGFyZW50LCBcInJlbW92ZUJyb3dzZXJWaWV3XCIsIFt2aWV3LnZpZXddKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2coXCJ3YXJuXCIsIFwiT3dsIHZpZXcgZGV0YWNoIGZhaWxlZCBkdXJpbmcgZGlzcG9zZVwiLCB7XG4gICAgICAgIHR3ZWFrSWQ6IHZpZXcudHdlYWtJZCxcbiAgICAgICAgdmlld0lkOiB2aWV3LmlkLFxuICAgICAgICBlcnJvcjogU3RyaW5nKGUpLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIHRyeSB7XG4gICAgaWYgKCF2aWV3LnZpZXcud2ViQ29udGVudHMuaXNEZXN0cm95ZWQoKSkge1xuICAgICAgdmlldy52aWV3LndlYkNvbnRlbnRzLmNsb3NlKHsgd2FpdEZvckJlZm9yZVVubG9hZDogZmFsc2UgfSk7XG4gICAgfVxuICB9IGNhdGNoIHt9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvd2xWaWV3Rm9yKHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZyk6IE1hbmFnZWRPd2xWaWV3IHtcbiAgY29uc3QgdmlldyA9IG93bFZpZXdzLmdldChvd2xWaWV3S2V5KHR3ZWFrSWQsIGlkKSk7XG4gIGlmICghdmlldyB8fCB2aWV3LmRpc3Bvc2VkKSB0aHJvdyBuZXcgRXJyb3IoYENvZGV4IHZpZXcgaXMgbm90IGxvYWRlZDogJHt0d2Vha0lkfToke2lkfWApO1xuICByZXR1cm4gdmlldztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG93bFZpZXdLZXkodHdlYWtJZDogc3RyaW5nLCB2aWV3SWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgJHt0d2Vha0lkfToke3ZpZXdJZH1gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWRkT3dsQ2hpbGRWaWV3KHBhcmVudDogRWxlY3Ryb24uQnJvd3NlcldpbmRvdywgY2hpbGQ6IEVsZWN0cm9uLkJyb3dzZXJWaWV3KTogdm9pZCB7XG4gIGNvbnN0IG93bmVyV2luZG93ID0gYXNSZWNvcmQoY2hpbGQpPy5vd25lcldpbmRvdztcbiAgaWYgKG93bmVyV2luZG93ICYmIG93bmVyV2luZG93ICE9PSBwYXJlbnQpIHtcbiAgICBjYWxsT2JqZWN0TWV0aG9kKG93bmVyV2luZG93LCBcInJlbW92ZUJyb3dzZXJWaWV3XCIsIFtjaGlsZF0pO1xuICB9XG5cbiAgY2FsbE9iamVjdE1ldGhvZChhc1JlY29yZChwYXJlbnQpPy5jb250ZW50VmlldywgXCJhZGRDaGlsZFZpZXdcIiwgW2FzUmVjb3JkKGNoaWxkKT8ud2ViQ29udGVudHNWaWV3XSk7XG4gIHRyeSB7XG4gICAgKGNoaWxkIGFzIHVua25vd24gYXMgeyBvd25lcldpbmRvdzogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGwgfSkub3duZXJXaW5kb3cgPSBwYXJlbnQ7XG4gIH0gY2F0Y2gge31cbiAgY2FsbE9iamVjdE1ldGhvZChhc1JlY29yZChjaGlsZC53ZWJDb250ZW50cyksIFwiX3NldE93bmVyV2luZG93XCIsIFtwYXJlbnRdKTtcblxuICBjb25zdCBicm93c2VyVmlld3MgPSBhc1JlY29yZChwYXJlbnQpPy5fYnJvd3NlclZpZXdzO1xuICBpZiAoQXJyYXkuaXNBcnJheShicm93c2VyVmlld3MpICYmICFicm93c2VyVmlld3MuaW5jbHVkZXMoY2hpbGQpKSB7XG4gICAgYnJvd3NlclZpZXdzLnB1c2goY2hpbGQpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVPd2xDaGlsZFZpZXcocGFyZW50OiBFbGVjdHJvbi5Ccm93c2VyV2luZG93LCBjaGlsZDogRWxlY3Ryb24uQnJvd3NlclZpZXcpOiB2b2lkIHtcbiAgY2FsbE9iamVjdE1ldGhvZChhc1JlY29yZChwYXJlbnQpPy5jb250ZW50VmlldywgXCJyZW1vdmVDaGlsZFZpZXdcIiwgW2FzUmVjb3JkKGNoaWxkKT8ud2ViQ29udGVudHNWaWV3XSk7XG4gIHRyeSB7XG4gICAgKGNoaWxkIGFzIHVua25vd24gYXMgeyBvd25lcldpbmRvdzogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGwgfSkub3duZXJXaW5kb3cgPSBudWxsO1xuICB9IGNhdGNoIHt9XG5cbiAgY29uc3QgYnJvd3NlclZpZXdzID0gYXNSZWNvcmQocGFyZW50KT8uX2Jyb3dzZXJWaWV3cztcbiAgaWYgKEFycmF5LmlzQXJyYXkoYnJvd3NlclZpZXdzKSkge1xuICAgIGNvbnN0IGluZGV4ID0gYnJvd3NlclZpZXdzLmluZGV4T2YoY2hpbGQpO1xuICAgIGlmIChpbmRleCA+PSAwKSBicm93c2VyVmlld3Muc3BsaWNlKGluZGV4LCAxKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYmluZFdpbmRvd0V2ZW50KFxuICB3aW46IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3csXG4gIHZpZXc6IE1hbmFnZWRPd2xWaWV3LFxuICBldmVudDogc3RyaW5nLFxuICBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCxcbik6IHZvaWQge1xuICBjb25zdCBvbiA9IGFzUmVjb3JkKHdpbik/Lm9uO1xuICBjb25zdCBvZmYgPSBhc1JlY29yZCh3aW4pPy5vZmY7XG4gIGlmICh0eXBlb2Ygb24gIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuO1xuICBvbi5jYWxsKHdpbiwgZXZlbnQsIGxpc3RlbmVyKTtcbiAgdmlldy5kaXNwb3NlQmluZGluZ3MucHVzaCgoKSA9PiB7XG4gICAgaWYgKHR5cGVvZiBvZmYgPT09IFwiZnVuY3Rpb25cIikgb2ZmLmNhbGwod2luLCBldmVudCwgbGlzdGVuZXIpO1xuICAgIGVsc2UgY2FsbE9iamVjdE1ldGhvZCh3aW4sIFwicmVtb3ZlTGlzdGVuZXJcIiwgW2V2ZW50LCBsaXN0ZW5lcl0pO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydEJyaWRnZUlkKHZhbHVlOiBzdHJpbmcsIGxhYmVsOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiIHx8ICEvXlthLXpBLVowLTkuXy1dKyQvLnRlc3QodmFsdWUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGAke2xhYmVsfSBtYXkgb25seSBjb250YWluIGxldHRlcnMsIG51bWJlcnMsIGRvdHMsIHVuZGVyc2NvcmVzLCBhbmQgZGFzaGVzYCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0Qm91bmRzKGJvdW5kczogRWxlY3Ryb24uUmVjdGFuZ2xlKTogdm9pZCB7XG4gIGNvbnN0IHZhbHVlcyA9IFtib3VuZHM/LngsIGJvdW5kcz8ueSwgYm91bmRzPy53aWR0aCwgYm91bmRzPy5oZWlnaHRdO1xuICBpZiAoIXZhbHVlcy5ldmVyeSgodmFsdWUpID0+IHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIiAmJiBOdW1iZXIuaXNGaW5pdGUodmFsdWUpKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcImJvdW5kcyBtdXN0IGNvbnRhaW4gZmluaXRlIHgsIHksIHdpZHRoLCBhbmQgaGVpZ2h0IG51bWJlcnNcIik7XG4gIH1cbiAgaWYgKGJvdW5kcy53aWR0aCA8IDAgfHwgYm91bmRzLmhlaWdodCA8IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJib3VuZHMgd2lkdGggYW5kIGhlaWdodCBtdXN0IGJlIG5vbi1uZWdhdGl2ZVwiKTtcbiAgfVxufVxuIiwgImltcG9ydCB7IEJyb3dzZXJWaWV3LCBCcm93c2VyV2luZG93IH0gZnJvbSBcImVsZWN0cm9uXCI7XG5pbXBvcnQgeyBDT0RFWF9XSU5ET1dfU0VSVklDRVNfS0VZIH0gZnJvbSBcIi4vcnVudGltZS1wYXRoc1wiO1xuaW1wb3J0IHR5cGUgeyBDb2RleFdpbmRvd1JlZiB9IGZyb20gXCJAY29kZXgtcGx1c3BsdXMvc2RrXCI7XG5pbXBvcnQgeyBpbnNwZWN0V2luZG93U2VydmljZXMgfSBmcm9tIFwiLi9jb2RleC1ydW50aW1lLXByb2JlXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29kZXhXaW5kb3dTZXJ2aWNlcyB7XG4gIGNyZWF0ZUZyZXNoV2luZG93PzogKHJvdXRlPzogc3RyaW5nKSA9PiBQcm9taXNlPEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsPjtcbiAgY3JlYXRlRnJlc2hMb2NhbFdpbmRvdz86IChyb3V0ZT86IHN0cmluZykgPT4gUHJvbWlzZTxFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbD47XG4gIGVuc3VyZUhvc3RXaW5kb3c/OiAoaG9zdElkPzogc3RyaW5nKSA9PiBQcm9taXNlPEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsPjtcbiAgZ2V0UHJpbWFyeVdpbmRvdz86IChob3N0SWQ/OiBzdHJpbmcpID0+IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsO1xuICBnZXRDb250ZXh0PzogKGhvc3RJZDogc3RyaW5nKSA9PiB7IHJlZ2lzdGVyV2luZG93PzogKHdpbmRvd0xpa2U6IENvZGV4V2luZG93TGlrZSkgPT4gdm9pZCB9IHwgbnVsbDtcbiAgd2luZG93TWFuYWdlcj86IHtcbiAgICBjcmVhdGVXaW5kb3c/OiAob3B0czogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pID0+IFByb21pc2U8RWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGw+O1xuICAgIGdldFByaW1hcnlXaW5kb3c/OiAoKSA9PiBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbDtcbiAgICByZWdpc3RlcldpbmRvdz86IChcbiAgICAgIHdpbmRvd0xpa2U6IENvZGV4V2luZG93TGlrZSxcbiAgICAgIGhvc3RJZDogc3RyaW5nLFxuICAgICAgcHJpbWFyeTogYm9vbGVhbixcbiAgICAgIGFwcGVhcmFuY2U6IHN0cmluZyxcbiAgICApID0+IHZvaWQ7XG4gICAgb3B0aW9ucz86IHtcbiAgICAgIGFsbG93RGV2dG9vbHM/OiBib29sZWFuO1xuICAgICAgcHJlbG9hZFBhdGg/OiBzdHJpbmc7XG4gICAgfTtcbiAgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb2RleFdpbmRvd0xpa2Uge1xuICBpZDogbnVtYmVyO1xuICB3ZWJDb250ZW50czogRWxlY3Ryb24uV2ViQ29udGVudHM7XG4gIG9uKGV2ZW50OiBcImNsb3NlZFwiLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHVua25vd247XG4gIG9uY2U/KGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKTogdW5rbm93bjtcbiAgb2ZmPyhldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCk6IHVua25vd247XG4gIHJlbW92ZUxpc3RlbmVyPyhldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCk6IHVua25vd247XG4gIGlzRGVzdHJveWVkPygpOiBib29sZWFuO1xuICBpc0ZvY3VzZWQ/KCk6IGJvb2xlYW47XG4gIGZvY3VzPygpOiB2b2lkO1xuICBzaG93PygpOiB2b2lkO1xuICBoaWRlPygpOiB2b2lkO1xuICBnZXRCb3VuZHM/KCk6IEVsZWN0cm9uLlJlY3RhbmdsZTtcbiAgZ2V0Q29udGVudEJvdW5kcz8oKTogRWxlY3Ryb24uUmVjdGFuZ2xlO1xuICBnZXRTaXplPygpOiBbbnVtYmVyLCBudW1iZXJdO1xuICBnZXRDb250ZW50U2l6ZT8oKTogW251bWJlciwgbnVtYmVyXTtcbiAgc2V0VGl0bGU/KHRpdGxlOiBzdHJpbmcpOiB2b2lkO1xuICBnZXRUaXRsZT8oKTogc3RyaW5nO1xuICBzZXRSZXByZXNlbnRlZEZpbGVuYW1lPyhmaWxlbmFtZTogc3RyaW5nKTogdm9pZDtcbiAgc2V0RG9jdW1lbnRFZGl0ZWQ/KGVkaXRlZDogYm9vbGVhbik6IHZvaWQ7XG4gIHNldFdpbmRvd0J1dHRvblZpc2liaWxpdHk/KHZpc2libGU6IGJvb2xlYW4pOiB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvZGV4Q3JlYXRlV2luZG93T3B0aW9ucyB7XG4gIHJvdXRlOiBzdHJpbmc7XG4gIGhvc3RJZD86IHN0cmluZztcbiAgc2hvdz86IGJvb2xlYW47XG4gIGFwcGVhcmFuY2U/OiBzdHJpbmc7XG4gIHBhcmVudFdpbmRvd0lkPzogbnVtYmVyO1xuICBib3VuZHM/OiBFbGVjdHJvbi5SZWN0YW5nbGU7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29kZXhDcmVhdGVWaWV3T3B0aW9ucyB7XG4gIHJvdXRlOiBzdHJpbmc7XG4gIGhvc3RJZD86IHN0cmluZztcbiAgYXBwZWFyYW5jZT86IHN0cmluZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFByaW1hcnlDb2RleFdpbmRvdygpOiBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbCB7XG4gIGNvbnN0IHNlcnZpY2VzID0gZ2V0Q29kZXhXaW5kb3dTZXJ2aWNlcygpO1xuICBjb25zdCBpbnNwZWN0ZWQgPSBpbnNwZWN0V2luZG93U2VydmljZXMoc2VydmljZXMpO1xuICBjb25zdCBmcm9tU2VydmljZXMgPSBpbnNwZWN0ZWQuZ2V0UHJpbWFyeVdpbmRvd1xuICAgID8gc2VydmljZXM/LmdldFByaW1hcnlXaW5kb3c/LihcImxvY2FsXCIpID8/IG51bGxcbiAgICA6IG51bGw7XG4gIGlmIChmcm9tU2VydmljZXMgJiYgIWZyb21TZXJ2aWNlcy5pc0Rlc3Ryb3llZCgpKSByZXR1cm4gZnJvbVNlcnZpY2VzO1xuICBjb25zdCBmcm9tTWFuYWdlciA9IGluc3BlY3RlZC5nZXRQcmltYXJ5V2luZG93RnJvbU1hbmFnZXJcbiAgICA/IHNlcnZpY2VzPy53aW5kb3dNYW5hZ2VyPy5nZXRQcmltYXJ5V2luZG93Py5jYWxsKHNlcnZpY2VzLndpbmRvd01hbmFnZXIpID8/IG51bGxcbiAgICA6IG51bGw7XG4gIGlmIChmcm9tTWFuYWdlciAmJiAhZnJvbU1hbmFnZXIuaXNEZXN0cm95ZWQoKSkgcmV0dXJuIGZyb21NYW5hZ2VyO1xuICBjb25zdCBmb2N1c2VkID0gQnJvd3NlcldpbmRvdy5nZXRGb2N1c2VkV2luZG93KCk7XG4gIGlmIChmb2N1c2VkICYmICFmb2N1c2VkLmlzRGVzdHJveWVkKCkpIHJldHVybiBmb2N1c2VkO1xuICByZXR1cm4gQnJvd3NlcldpbmRvdy5nZXRBbGxXaW5kb3dzKCkuZmluZCgod2luKSA9PiAhd2luLmlzRGVzdHJveWVkKCkpID8/IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcmltYXJ5Q29kZXhXaW5kb3dSZWYoKTogQ29kZXhXaW5kb3dSZWYgfCBudWxsIHtcbiAgY29uc3Qgd2luID0gZ2V0UHJpbWFyeUNvZGV4V2luZG93KCk7XG4gIGlmICghd2luIHx8IHdpbi5pc0Rlc3Ryb3llZCgpKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHsgd2luZG93SWQ6IHdpbi5pZCwgd2ViQ29udGVudHNJZDogd2luLndlYkNvbnRlbnRzLmlkIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb2N1c0NvZGV4V2luZG93KHdpbmRvd0lkOiBudW1iZXIpOiBib29sZWFuIHtcbiAgY29uc3Qgd2luID0gQnJvd3NlcldpbmRvdy5mcm9tSWQod2luZG93SWQpO1xuICBpZiAoIXdpbiB8fCB3aW4uaXNEZXN0cm95ZWQoKSkgcmV0dXJuIGZhbHNlO1xuICBpZiAod2luLmlzTWluaW1pemVkKCkpIHdpbi5yZXN0b3JlKCk7XG4gIHdpbi5zaG93KCk7XG4gIHdpbi5mb2N1cygpO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNob3dDb2RleFdpbmRvdyh3aW5kb3dJZDogbnVtYmVyKTogYm9vbGVhbiB7XG4gIGNvbnN0IHdpbiA9IEJyb3dzZXJXaW5kb3cuZnJvbUlkKHdpbmRvd0lkKTtcbiAgaWYgKCF3aW4gfHwgd2luLmlzRGVzdHJveWVkKCkpIHJldHVybiBmYWxzZTtcbiAgd2luLnNob3coKTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVDb2RleEJyb3dzZXJWaWV3KG9wdHM6IENvZGV4Q3JlYXRlVmlld09wdGlvbnMpOiBQcm9taXNlPHVua25vd24+IHtcbiAgY29uc3Qgc2VydmljZXMgPSBnZXRDb2RleFdpbmRvd1NlcnZpY2VzKCk7XG4gIGNvbnN0IHdpbmRvd01hbmFnZXIgPSBzZXJ2aWNlcz8ud2luZG93TWFuYWdlcjtcbiAgY29uc3QgaW5zcGVjdGVkID0gaW5zcGVjdFdpbmRvd1NlcnZpY2VzKHNlcnZpY2VzKTtcbiAgaWYgKCFzZXJ2aWNlcyB8fCAhd2luZG93TWFuYWdlcj8ucmVnaXN0ZXJXaW5kb3cgfHwgIWluc3BlY3RlZC5yZWdpc3RlcldpbmRvdykge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIFwiQ29kZXggZW1iZWRkZWQgdmlldyBzZXJ2aWNlcyBhcmUgbm90IGF2YWlsYWJsZS4gUmVpbnN0YWxsIENvZGV4KysgMS4wLjAgb3IgbGF0ZXIuXCIsXG4gICAgKTtcbiAgfVxuXG4gIGNvbnN0IHJvdXRlID0gbm9ybWFsaXplQ29kZXhSb3V0ZShvcHRzLnJvdXRlKTtcbiAgY29uc3QgaG9zdElkID0gb3B0cy5ob3N0SWQgfHwgXCJsb2NhbFwiO1xuICBjb25zdCBhcHBlYXJhbmNlID0gb3B0cy5hcHBlYXJhbmNlIHx8IFwic2Vjb25kYXJ5XCI7XG4gIGNvbnN0IHZpZXcgPSBuZXcgQnJvd3NlclZpZXcoe1xuICAgIHdlYlByZWZlcmVuY2VzOiB7XG4gICAgICBwcmVsb2FkOiB3aW5kb3dNYW5hZ2VyLm9wdGlvbnM/LnByZWxvYWRQYXRoLFxuICAgICAgY29udGV4dElzb2xhdGlvbjogdHJ1ZSxcbiAgICAgIG5vZGVJbnRlZ3JhdGlvbjogZmFsc2UsXG4gICAgICBzcGVsbGNoZWNrOiBmYWxzZSxcbiAgICAgIGRldlRvb2xzOiB3aW5kb3dNYW5hZ2VyLm9wdGlvbnM/LmFsbG93RGV2dG9vbHMsXG4gICAgfSxcbiAgfSk7XG4gIGNvbnN0IHdpbmRvd0xpa2UgPSBtYWtlV2luZG93TGlrZUZvclZpZXcodmlldyk7XG4gIHdpbmRvd01hbmFnZXIucmVnaXN0ZXJXaW5kb3cod2luZG93TGlrZSwgaG9zdElkLCBmYWxzZSwgYXBwZWFyYW5jZSk7XG4gIHNlcnZpY2VzLmdldENvbnRleHQ/Lihob3N0SWQpPy5yZWdpc3RlcldpbmRvdz8uKHdpbmRvd0xpa2UpO1xuICBhd2FpdCB2aWV3LndlYkNvbnRlbnRzLmxvYWRVUkwoY29kZXhBcHBVcmwocm91dGUsIGhvc3RJZCkpO1xuICByZXR1cm4gdmlldztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUNvZGV4V2luZG93KG9wdHM6IENvZGV4Q3JlYXRlV2luZG93T3B0aW9ucyk6IFByb21pc2U8Q29kZXhXaW5kb3dSZWY+IHtcbiAgY29uc3Qgc2VydmljZXMgPSBnZXRDb2RleFdpbmRvd1NlcnZpY2VzKCk7XG4gIGNvbnN0IGluc3BlY3RlZCA9IGluc3BlY3RXaW5kb3dTZXJ2aWNlcyhzZXJ2aWNlcyk7XG4gIGlmICghc2VydmljZXMgfHwgIWluc3BlY3RlZC5wcmVzZW50KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgXCJDb2RleCB3aW5kb3cgc2VydmljZXMgYXJlIG5vdCBhdmFpbGFibGUuIFJlaW5zdGFsbCBDb2RleCsrIDEuMC4wIG9yIGxhdGVyLlwiLFxuICAgICk7XG4gIH1cblxuICBjb25zdCByb3V0ZSA9IG5vcm1hbGl6ZUNvZGV4Um91dGUob3B0cy5yb3V0ZSk7XG4gIGNvbnN0IGhvc3RJZCA9IG9wdHMuaG9zdElkIHx8IFwibG9jYWxcIjtcbiAgY29uc3QgcGFyZW50ID0gdHlwZW9mIG9wdHMucGFyZW50V2luZG93SWQgPT09IFwibnVtYmVyXCJcbiAgICA/IEJyb3dzZXJXaW5kb3cuZnJvbUlkKG9wdHMucGFyZW50V2luZG93SWQpXG4gICAgOiBCcm93c2VyV2luZG93LmdldEZvY3VzZWRXaW5kb3coKTtcbiAgY29uc3QgY3JlYXRlV2luZG93ID0gc2VydmljZXMud2luZG93TWFuYWdlcj8uY3JlYXRlV2luZG93O1xuXG4gIGxldCB3aW46IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsIHwgdW5kZWZpbmVkO1xuICBpZiAoaW5zcGVjdGVkLmNyZWF0ZVdpbmRvdyAmJiB0eXBlb2YgY3JlYXRlV2luZG93ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICB3aW4gPSBhd2FpdCBjcmVhdGVXaW5kb3cuY2FsbChzZXJ2aWNlcy53aW5kb3dNYW5hZ2VyLCB7XG4gICAgICBpbml0aWFsUm91dGU6IHJvdXRlLFxuICAgICAgaG9zdElkLFxuICAgICAgc2hvdzogb3B0cy5zaG93ICE9PSBmYWxzZSxcbiAgICAgIGFwcGVhcmFuY2U6IG9wdHMuYXBwZWFyYW5jZSB8fCBcInNlY29uZGFyeVwiLFxuICAgICAgcGFyZW50LFxuICAgIH0pO1xuICB9IGVsc2UgaWYgKGhvc3RJZCA9PT0gXCJsb2NhbFwiICYmIGluc3BlY3RlZC5jcmVhdGVGcmVzaFdpbmRvdyAmJiB0eXBlb2Ygc2VydmljZXMuY3JlYXRlRnJlc2hXaW5kb3cgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHdpbiA9IGF3YWl0IHNlcnZpY2VzLmNyZWF0ZUZyZXNoV2luZG93KHJvdXRlKTtcbiAgfSBlbHNlIGlmIChob3N0SWQgPT09IFwibG9jYWxcIiAmJiBpbnNwZWN0ZWQuY3JlYXRlRnJlc2hMb2NhbFdpbmRvdyAmJiB0eXBlb2Ygc2VydmljZXMuY3JlYXRlRnJlc2hMb2NhbFdpbmRvdyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgd2luID0gYXdhaXQgc2VydmljZXMuY3JlYXRlRnJlc2hMb2NhbFdpbmRvdyhyb3V0ZSk7XG4gIH0gZWxzZSBpZiAoaW5zcGVjdGVkLmVuc3VyZUhvc3RXaW5kb3cgJiYgdHlwZW9mIHNlcnZpY2VzLmVuc3VyZUhvc3RXaW5kb3cgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHdpbiA9IGF3YWl0IHNlcnZpY2VzLmVuc3VyZUhvc3RXaW5kb3coaG9zdElkKTtcbiAgfVxuXG4gIGlmICghd2luIHx8IHdpbi5pc0Rlc3Ryb3llZCgpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ29kZXggZGlkIG5vdCByZXR1cm4gYSB3aW5kb3cgZm9yIHRoZSByZXF1ZXN0ZWQgcm91dGVcIik7XG4gIH1cblxuICBpZiAob3B0cy5ib3VuZHMpIHtcbiAgICB3aW4uc2V0Qm91bmRzKG9wdHMuYm91bmRzKTtcbiAgfVxuICBpZiAocGFyZW50ICYmICFwYXJlbnQuaXNEZXN0cm95ZWQoKSkge1xuICAgIHRyeSB7XG4gICAgICB3aW4uc2V0UGFyZW50V2luZG93KHBhcmVudCk7XG4gICAgfSBjYXRjaCB7fVxuICB9XG4gIGlmIChvcHRzLnNob3cgIT09IGZhbHNlKSB7XG4gICAgd2luLnNob3coKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgd2luZG93SWQ6IHdpbi5pZCxcbiAgICB3ZWJDb250ZW50c0lkOiB3aW4ud2ViQ29udGVudHMuaWQsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlV2luZG93TGlrZUZvclZpZXcodmlldzogRWxlY3Ryb24uQnJvd3NlclZpZXcpOiBDb2RleFdpbmRvd0xpa2Uge1xuICBjb25zdCB2aWV3Qm91bmRzID0gKCkgPT4gdmlldy5nZXRCb3VuZHMoKTtcbiAgcmV0dXJuIHtcbiAgICBpZDogdmlldy53ZWJDb250ZW50cy5pZCxcbiAgICB3ZWJDb250ZW50czogdmlldy53ZWJDb250ZW50cyxcbiAgICBvbjogKGV2ZW50OiBcImNsb3NlZFwiLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCkgPT4ge1xuICAgICAgaWYgKGV2ZW50ID09PSBcImNsb3NlZFwiKSB7XG4gICAgICAgIHZpZXcud2ViQ29udGVudHMub25jZShcImRlc3Ryb3llZFwiLCBsaXN0ZW5lcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2aWV3LndlYkNvbnRlbnRzLm9uKGV2ZW50LCBsaXN0ZW5lcik7XG4gICAgICB9XG4gICAgICByZXR1cm4gdmlldztcbiAgICB9LFxuICAgIG9uY2U6IChldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCkgPT4ge1xuICAgICAgdmlldy53ZWJDb250ZW50cy5vbmNlKGV2ZW50IGFzIFwiZGVzdHJveWVkXCIsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB2aWV3O1xuICAgIH0sXG4gICAgb2ZmOiAoZXZlbnQ6IHN0cmluZywgbGlzdGVuZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpID0+IHtcbiAgICAgIHZpZXcud2ViQ29udGVudHMub2ZmKGV2ZW50IGFzIFwiZGVzdHJveWVkXCIsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB2aWV3O1xuICAgIH0sXG4gICAgcmVtb3ZlTGlzdGVuZXI6IChldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCkgPT4ge1xuICAgICAgdmlldy53ZWJDb250ZW50cy5yZW1vdmVMaXN0ZW5lcihldmVudCBhcyBcImRlc3Ryb3llZFwiLCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gdmlldztcbiAgICB9LFxuICAgIGlzRGVzdHJveWVkOiAoKSA9PiB2aWV3LndlYkNvbnRlbnRzLmlzRGVzdHJveWVkKCksXG4gICAgaXNGb2N1c2VkOiAoKSA9PiB2aWV3LndlYkNvbnRlbnRzLmlzRm9jdXNlZCgpLFxuICAgIGZvY3VzOiAoKSA9PiB2aWV3LndlYkNvbnRlbnRzLmZvY3VzKCksXG4gICAgc2hvdzogKCkgPT4ge30sXG4gICAgaGlkZTogKCkgPT4ge30sXG4gICAgZ2V0Qm91bmRzOiB2aWV3Qm91bmRzLFxuICAgIGdldENvbnRlbnRCb3VuZHM6IHZpZXdCb3VuZHMsXG4gICAgZ2V0U2l6ZTogKCkgPT4ge1xuICAgICAgY29uc3QgYiA9IHZpZXdCb3VuZHMoKTtcbiAgICAgIHJldHVybiBbYi53aWR0aCwgYi5oZWlnaHRdO1xuICAgIH0sXG4gICAgZ2V0Q29udGVudFNpemU6ICgpID0+IHtcbiAgICAgIGNvbnN0IGIgPSB2aWV3Qm91bmRzKCk7XG4gICAgICByZXR1cm4gW2Iud2lkdGgsIGIuaGVpZ2h0XTtcbiAgICB9LFxuICAgIHNldFRpdGxlOiAoKSA9PiB7fSxcbiAgICBnZXRUaXRsZTogKCkgPT4gXCJcIixcbiAgICBzZXRSZXByZXNlbnRlZEZpbGVuYW1lOiAoKSA9PiB7fSxcbiAgICBzZXREb2N1bWVudEVkaXRlZDogKCkgPT4ge30sXG4gICAgc2V0V2luZG93QnV0dG9uVmlzaWJpbGl0eTogKCkgPT4ge30sXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb2RleEFwcFVybChyb3V0ZTogc3RyaW5nLCBob3N0SWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHVybCA9IG5ldyBVUkwoXCJhcHA6Ly8tL2luZGV4Lmh0bWxcIik7XG4gIHVybC5zZWFyY2hQYXJhbXMuc2V0KFwiaG9zdElkXCIsIGhvc3RJZCk7XG4gIGlmIChyb3V0ZSAhPT0gXCIvXCIpIHVybC5zZWFyY2hQYXJhbXMuc2V0KFwiaW5pdGlhbFJvdXRlXCIsIHJvdXRlKTtcbiAgcmV0dXJuIHVybC50b1N0cmluZygpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplT3dsVmlld1VybCh1cmw6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICh0eXBlb2YgdXJsICE9PSBcInN0cmluZ1wiIHx8IHVybC5pbmNsdWRlcyhcIlxcblwiKSB8fCB1cmwuaW5jbHVkZXMoXCJcXHJcIikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJPd2wgdmlldyBVUkwgbXVzdCBiZSBhIHN0cmluZyB3aXRob3V0IGNvbnRyb2wgY2hhcmFjdGVyc1wiKTtcbiAgfVxuICBjb25zdCBwYXJzZWQgPSBuZXcgVVJMKHVybCk7XG4gIGlmICghW1wiaHR0cDpcIiwgXCJodHRwczpcIiwgXCJhcHA6XCIsIFwiZmlsZTpcIiwgXCJkYXRhOlwiLCBcImFib3V0OlwiXS5pbmNsdWRlcyhwYXJzZWQucHJvdG9jb2wpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGB1bnN1cHBvcnRlZCBPd2wgdmlldyBVUkwgcHJvdG9jb2w6ICR7cGFyc2VkLnByb3RvY29sfWApO1xuICB9XG4gIHJldHVybiBwYXJzZWQudG9TdHJpbmcoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldENvZGV4V2luZG93U2VydmljZXMoKTogQ29kZXhXaW5kb3dTZXJ2aWNlcyB8IG51bGwge1xuICBjb25zdCBzZXJ2aWNlcyA9IChnbG9iYWxUaGlzIGFzIHVua25vd24gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pW0NPREVYX1dJTkRPV19TRVJWSUNFU19LRVldO1xuICByZXR1cm4gc2VydmljZXMgJiYgdHlwZW9mIHNlcnZpY2VzID09PSBcIm9iamVjdFwiID8gKHNlcnZpY2VzIGFzIENvZGV4V2luZG93U2VydmljZXMpIDogbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZUNvZGV4Um91dGUocm91dGU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICh0eXBlb2Ygcm91dGUgIT09IFwic3RyaW5nXCIgfHwgIXJvdXRlLnN0YXJ0c1dpdGgoXCIvXCIpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ29kZXggcm91dGUgbXVzdCBiZSBhbiBhYnNvbHV0ZSBhcHAgcm91dGVcIik7XG4gIH1cbiAgaWYgKHJvdXRlLmluY2x1ZGVzKFwiOi8vXCIpIHx8IHJvdXRlLmluY2x1ZGVzKFwiXFxuXCIpIHx8IHJvdXRlLmluY2x1ZGVzKFwiXFxyXCIpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ29kZXggcm91dGUgbXVzdCBub3QgaW5jbHVkZSBhIHByb3RvY29sIG9yIGNvbnRyb2wgY2hhcmFjdGVyc1wiKTtcbiAgfVxuICByZXR1cm4gcm91dGU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhc1JlY29yZCh2YWx1ZTogdW5rbm93bik6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbCB7XG4gIHJldHVybiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgPyB2YWx1ZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA6IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYWxsT2JqZWN0TWV0aG9kKHRhcmdldDogdW5rbm93biwgbWV0aG9kOiBzdHJpbmcsIGFyZ3M6IHVua25vd25bXSk6IHVua25vd24ge1xuICBjb25zdCBmbiA9IGFzUmVjb3JkKHRhcmdldCk/LlttZXRob2RdO1xuICBpZiAodHlwZW9mIGZuICE9PSBcImZ1bmN0aW9uXCIpIHJldHVybiB1bmRlZmluZWQ7XG4gIHJldHVybiBmbi5hcHBseSh0YXJnZXQsIGFyZ3MpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNXaW5kb3dEZXN0cm95ZWQod2luOiBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbCB8IHVuZGVmaW5lZCk6IGJvb2xlYW4ge1xuICBpZiAoIXdpbikgcmV0dXJuIHRydWU7XG4gIGNvbnN0IGZuID0gYXNSZWNvcmQod2luKT8uaXNEZXN0cm95ZWQ7XG4gIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIGZhbHNlO1xuICB0cnkge1xuICAgIHJldHVybiBCb29sZWFuKGZuLmNhbGwod2luKSk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3aW5kb3dJZEZvcih3aW46IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsIHwgdW5kZWZpbmVkKTogbnVtYmVyIHwgbnVsbCB7XG4gIGNvbnN0IGlkID0gYXNSZWNvcmQod2luKT8uaWQ7XG4gIHJldHVybiB0eXBlb2YgaWQgPT09IFwibnVtYmVyXCIgPyBpZCA6IG51bGw7XG59XG4iLCAiaW1wb3J0IHsgaXBjTWFpbiwgd2ViQ29udGVudHMgfSBmcm9tIFwiZWxlY3Ryb25cIjtcbmltcG9ydCB7IGV4aXN0c1N5bmMsIHJlYWxwYXRoU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuaW1wb3J0IHsgZGlzY292ZXJUd2Vha3MsIHR5cGUgRGlzY292ZXJlZFR3ZWFrIH0gZnJvbSBcIi4vdHdlYWstZGlzY292ZXJ5XCI7XG5pbXBvcnQgeyBjcmVhdGVEaXNrU3RvcmFnZSwgdHlwZSBEaXNrU3RvcmFnZSB9IGZyb20gXCIuL3N0b3JhZ2VcIjtcbmltcG9ydCB7IHN5bmNNYW5hZ2VkTWNwU2VydmVycyB9IGZyb20gXCIuL21jcC1zeW5jXCI7XG5pbXBvcnQge1xuICBpc01haW5Qcm9jZXNzVHdlYWtTY29wZSxcbiAgcmVsb2FkVHdlYWtzLFxuICB0eXBlIFNldFR3ZWFrRW5hYmxlZEFuZFJlbG9hZERlcHMsXG59IGZyb20gXCIuL3R3ZWFrLWxpZmVjeWNsZVwiO1xuaW1wb3J0IHsgTmF0aXZlQnJpZGdlLCB0eXBlIE5hdGl2ZVR3ZWFrQ29udGV4dCB9IGZyb20gXCIuL25hdGl2ZS1icmlkZ2VcIjtcbmltcG9ydCB7IGlzUGF0aEluc2lkZSB9IGZyb20gXCIuL25hdGl2ZS1wYXRoc1wiO1xuaW1wb3J0IHtcbiAgZ2V0Q2RwU3RhdHVzLFxuICBnZXRSdW50aW1lQ2FwYWJpbGl0aWVzLFxuICBnZXRSdW50aW1lSW5mbyxcbiAgbGlzdENkcFRhcmdldHMsXG4gIHdpbmRvd1NhbXBsZUZyb20sXG59IGZyb20gXCIuL2NvZGV4LXJ1bnRpbWUtcHJvYmVcIjtcbmltcG9ydCB0eXBlIHtcbiAgQ29kZXhBcGksXG4gIENvZGV4UnVudGltZUNhcGFiaWxpdGllcyxcbiAgQ29kZXhSdW50aW1lSW5mbyxcbiAgQ29kZXhWaWV3Q3JlYXRlT3B0aW9ucyxcbiAgTmF0aXZlSGVscGVyTGF1bmNoT3B0aW9ucyxcbiAgTmF0aXZlTW9kdWxlTG9hZE9wdGlvbnMsXG4gIE5hdGl2ZVBhbmVsQ3JlYXRlT3B0aW9ucyxcbiAgTmF0aXZlVmlld0F0dGFjaE9wdGlvbnMsXG4gIFR3ZWFrRnMsXG4gIFR3ZWFrSXBjLFxuICBUd2Vha01hbmlmZXN0LFxuICBUd2Vha1Blcm1pc3Npb24sXG59IGZyb20gXCJAY29kZXgtcGx1c3BsdXMvc2RrXCI7XG5pbXBvcnQgeyByZXF1aXJlQ29kZXhTZXNzaW9uTWFuYWdlciB9IGZyb20gXCIuL2NvZGV4LXNlc3Npb25zXCI7XG5pbXBvcnQge1xuICBhc3NlcnRUd2Vha0hhc1Blcm1pc3Npb24sXG4gIGFzc2VydFZhbGlkVHdlYWtJZCxcbiAgYXV0aG9yaXplVHdlYWtDYXBhYmlsaXR5LFxuICBjcmVhdGVEZW5pZWRBc3luY01ldGhvZCxcbiAgY3JlYXRlRGVuaWVkVHdlYWtGcyxcbiAgY3JlYXRlRGVuaWVkVHdlYWtJcGMsXG4gIGhhc0FueUNvZGV4QXBpLFxuICBoYXNUd2Vha1Blcm1pc3Npb24sXG4gIHNjb3BlZFR3ZWFrSXBjQ2hhbm5lbCxcbiAgdHdlYWtBcGlTdXJmYWNlLFxuICB0eXBlIFR3ZWFrSWRlbnRpdHlTbmFwc2hvdCxcbn0gZnJvbSBcIi4vdHdlYWstcGVybWlzc2lvbnNcIjtcbmltcG9ydCB7IGVuc3VyZVR3ZWFrRGF0YURpciwgcmVzb2x2ZVR3ZWFrRGF0YVBhdGggfSBmcm9tIFwiLi90d2Vhay1mcy1zYW5kYm94XCI7XG5pbXBvcnQge1xuICBpc1R3ZWFrRW5hYmxlZCxcbiAgcmVhZEluc3RhbGxlclN0YXRlLFxuICByZWFkU3RhdGUsXG4gIHNldFR3ZWFrRW5hYmxlZCxcbiAgd3JpdGVTdGF0ZSxcbiAgdHlwZSBUd2Vha1VwZGF0ZUNoZWNrLFxufSBmcm9tIFwiLi9jb25maWctc3RhdGVcIjtcbmltcG9ydCB7XG4gIGFzc2VydFN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGlibGUsXG4gIGFzc2VydFN0b3JlRW50cnlSdW50aW1lQ29tcGF0aWJsZSxcbiAgY29tcGFyZVZlcnNpb25zLFxuICBmZXRjaFR3ZWFrU3RvcmVSZWdpc3RyeSxcbiAgaW5zdGFsbFN0b3JlVHdlYWssXG4gIG5vcm1hbGl6ZVZlcnNpb24sXG59IGZyb20gXCIuL3N0b3JlLWluc3RhbGxcIjtcbmltcG9ydCB7IG5vcm1hbGl6ZUdpdEh1YlJlcG8gfSBmcm9tIFwiLi90d2Vhay1zdG9yZVwiO1xuaW1wb3J0IHtcbiAgQ09ERVhfQ09ORklHX0ZJTEUsXG4gIFRXRUFLU19ESVIsXG4gIGxvZyxcbiAgcnVudGltZURpcixcbiAgdXNlclJvb3QsXG59IGZyb20gXCIuL3J1bnRpbWUtcGF0aHNcIjtcbmltcG9ydCB7XG4gIGNyZWF0ZUNvZGV4QnJvd3NlclZpZXcsXG4gIGNyZWF0ZUNvZGV4V2luZG93LFxuICBmb2N1c0NvZGV4V2luZG93LFxuICBnZXRDb2RleFdpbmRvd1NlcnZpY2VzLFxuICBnZXRQcmltYXJ5Q29kZXhXaW5kb3csXG4gIGdldFByaW1hcnlDb2RleFdpbmRvd1JlZixcbiAgc2hvd0NvZGV4V2luZG93LFxufSBmcm9tIFwiLi9jb2RleC13aW5kb3dzXCI7XG5pbXBvcnQge1xuICBjcmVhdGVPd2xWaWV3LFxuICBkaXNwb3NlT3dsVmlld3NGb3JUd2Vhayxcbn0gZnJvbSBcIi4vb3dsLXZpZXdzXCI7XG5cbmNvbnN0IFVQREFURV9DSEVDS19JTlRFUlZBTF9NUyA9IDI0ICogNjAgKiA2MCAqIDEwMDA7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTG9hZGVkTWFpblR3ZWFrIHtcbiAgc3RvcD86ICgpID0+IHZvaWQ7XG4gIHN0b3JhZ2U6IERpc2tTdG9yYWdlO1xufVxuXG5leHBvcnQgY29uc3QgdHdlYWtTdGF0ZSA9IHtcbiAgZGlzY292ZXJlZDogW10gYXMgRGlzY292ZXJlZFR3ZWFrW10sXG4gIGxvYWRlZE1haW46IG5ldyBNYXA8c3RyaW5nLCBMb2FkZWRNYWluVHdlYWs+KCksXG59O1xuXG5leHBvcnQgY29uc3QgbmF0aXZlQnJpZGdlID0gbmV3IE5hdGl2ZUJyaWRnZShsb2csIHtcbiAgbmF0aXZlSG9zdFBhdGg6IGpvaW4ocnVudGltZURpciwgXCJuYXRpdmVcIiwgXCJjb2RleHBwX25hdGl2ZV9ob3N0Lm5vZGVcIiksXG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGxvYWRBbGxNYWluVHdlYWtzKCk6IHZvaWQge1xuICB0cnkge1xuICAgIHR3ZWFrU3RhdGUuZGlzY292ZXJlZCA9IGRpc2NvdmVyVHdlYWtzKFRXRUFLU19ESVIpO1xuICAgIGxvZyhcbiAgICAgIFwiaW5mb1wiLFxuICAgICAgYGRpc2NvdmVyZWQgJHt0d2Vha1N0YXRlLmRpc2NvdmVyZWQubGVuZ3RofSB0d2VhayhzKTpgLFxuICAgICAgdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLm1hcCgodCkgPT4gdC5tYW5pZmVzdC5pZCkuam9pbihcIiwgXCIpLFxuICAgICk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2coXCJlcnJvclwiLCBcInR3ZWFrIGRpc2NvdmVyeSBmYWlsZWQ6XCIsIGUpO1xuICAgIHR3ZWFrU3RhdGUuZGlzY292ZXJlZCA9IFtdO1xuICB9XG5cbiAgc3luY01jcFNlcnZlcnNGcm9tRW5hYmxlZFR3ZWFrcygpO1xuXG4gIGZvciAoY29uc3QgdCBvZiB0d2Vha1N0YXRlLmRpc2NvdmVyZWQpIHtcbiAgICBpZiAoIWlzTWFpblByb2Nlc3NUd2Vha1Njb3BlKHQubWFuaWZlc3Quc2NvcGUpKSBjb250aW51ZTtcbiAgICBpZiAoIWlzVHdlYWtFbmFibGVkKHQubWFuaWZlc3QuaWQpKSB7XG4gICAgICBsb2coXCJpbmZvXCIsIGBza2lwcGluZyBkaXNhYmxlZCBtYWluIHR3ZWFrOiAke3QubWFuaWZlc3QuaWR9YCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1vZCA9IHJlcXVpcmUodC5lbnRyeSk7XG4gICAgICBjb25zdCB0d2VhayA9IG1vZC5kZWZhdWx0ID8/IG1vZDtcbiAgICAgIGlmICh0eXBlb2YgdHdlYWs/LnN0YXJ0ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgY29uc3Qgc3RvcmFnZSA9IGNyZWF0ZURpc2tTdG9yYWdlKHVzZXJSb290ISwgdC5tYW5pZmVzdC5pZCk7XG4gICAgICAgIHR3ZWFrLnN0YXJ0KHtcbiAgICAgICAgICBtYW5pZmVzdDogdC5tYW5pZmVzdCxcbiAgICAgICAgICBwcm9jZXNzOiBcIm1haW5cIixcbiAgICAgICAgICBsb2c6IG1ha2VMb2dnZXIodC5tYW5pZmVzdC5pZCksXG4gICAgICAgICAgc3RvcmFnZSxcbiAgICAgICAgICBpcGM6IG1ha2VNYWluSXBjKHQubWFuaWZlc3QpLFxuICAgICAgICAgIGZzOiBtYWtlTWFpbkZzKHQubWFuaWZlc3QpLFxuICAgICAgICAgIGNvZGV4OiBtYWtlQ29kZXhBcGkodCksXG4gICAgICAgIH0pO1xuICAgICAgICB0d2Vha1N0YXRlLmxvYWRlZE1haW4uc2V0KHQubWFuaWZlc3QuaWQsIHtcbiAgICAgICAgICBzdG9wOiB0d2Vhay5zdG9wLFxuICAgICAgICAgIHN0b3JhZ2UsXG4gICAgICAgIH0pO1xuICAgICAgICBsb2coXCJpbmZvXCIsIGBzdGFydGVkIG1haW4gdHdlYWs6ICR7dC5tYW5pZmVzdC5pZH1gKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2coXCJlcnJvclwiLCBgdHdlYWsgJHt0Lm1hbmlmZXN0LmlkfSBmYWlsZWQgdG8gc3RhcnQ6YCwgZSk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzeW5jTWNwU2VydmVyc0Zyb21FbmFibGVkVHdlYWtzKCk6IHZvaWQge1xuICB0cnkge1xuICAgIGNvbnN0IHJlc3VsdCA9IHN5bmNNYW5hZ2VkTWNwU2VydmVycyh7XG4gICAgICBjb25maWdQYXRoOiBDT0RFWF9DT05GSUdfRklMRSxcbiAgICAgIHR3ZWFrczogdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLmZpbHRlcigodCkgPT4gaXNUd2Vha0VuYWJsZWQodC5tYW5pZmVzdC5pZCkpLFxuICAgIH0pO1xuICAgIGlmIChyZXN1bHQuY2hhbmdlZCkge1xuICAgICAgbG9nKFwiaW5mb1wiLCBgc3luY2VkIENvZGV4IE1DUCBjb25maWc6ICR7cmVzdWx0LnNlcnZlck5hbWVzLmpvaW4oXCIsIFwiKSB8fCBcIm5vbmVcIn1gKTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdC5za2lwcGVkU2VydmVyTmFtZXMubGVuZ3RoID4gMCkge1xuICAgICAgbG9nKFxuICAgICAgICBcImluZm9cIixcbiAgICAgICAgYHNraXBwZWQgQ29kZXgrKyBtYW5hZ2VkIE1DUCBzZXJ2ZXIocykgYWxyZWFkeSBjb25maWd1cmVkIGJ5IHVzZXI6ICR7cmVzdWx0LnNraXBwZWRTZXJ2ZXJOYW1lcy5qb2luKFwiLCBcIil9YCxcbiAgICAgICk7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nKFwid2FyblwiLCBcImZhaWxlZCB0byBzeW5jIENvZGV4IE1DUCBjb25maWc6XCIsIGUpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdG9wQWxsTWFpblR3ZWFrcygpOiB2b2lkIHtcbiAgZm9yIChjb25zdCBbaWQsIHRdIG9mIHR3ZWFrU3RhdGUubG9hZGVkTWFpbikge1xuICAgIHRyeSB7XG4gICAgICB0LnN0b3A/LigpO1xuICAgICAgdC5zdG9yYWdlLmZsdXNoKCk7XG4gICAgICBsb2coXCJpbmZvXCIsIGBzdG9wcGVkIG1haW4gdHdlYWs6ICR7aWR9YCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nKFwid2FyblwiLCBgc3RvcCBmYWlsZWQgZm9yICR7aWR9OmAsIGUpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBuYXRpdmVCcmlkZ2UuZGlzcG9zZVR3ZWFrKGlkKTtcbiAgICAgIGRpc3Bvc2VPd2xWaWV3c0ZvclR3ZWFrKGlkKTtcbiAgICB9XG4gIH1cbiAgdHdlYWtTdGF0ZS5sb2FkZWRNYWluLmNsZWFyKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbGVhclR3ZWFrTW9kdWxlQ2FjaGUoKTogdm9pZCB7XG4gIGNvbnN0IHJvb3RTZXQgPSBuZXcgU2V0PHN0cmluZz4oW1RXRUFLU19ESVIsIHNhZmVSZWFscGF0aChUV0VBS1NfRElSKV0pO1xuICBjb25zdCBlbnRyeVNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBmb3IgKGNvbnN0IHR3ZWFrIG9mIHR3ZWFrU3RhdGUuZGlzY292ZXJlZCkge1xuICAgIHJvb3RTZXQuYWRkKHR3ZWFrLmRpcik7XG4gICAgcm9vdFNldC5hZGQoc2FmZVJlYWxwYXRoKHR3ZWFrLmRpcikpO1xuICAgIGVudHJ5U2V0LmFkZCh0d2Vhay5lbnRyeSk7XG4gICAgZW50cnlTZXQuYWRkKHNhZmVSZWFscGF0aCh0d2Vhay5lbnRyeSkpO1xuICB9XG5cbiAgY29uc3Qgcm9vdHMgPSBbLi4ucm9vdFNldF07XG4gIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHJlcXVpcmUuY2FjaGUpKSB7XG4gICAgY29uc3QgcmVhbEtleSA9IHNhZmVSZWFscGF0aChrZXkpO1xuICAgIGNvbnN0IGlzVHdlYWtNb2R1bGUgPVxuICAgICAgZW50cnlTZXQuaGFzKGtleSkgfHxcbiAgICAgIGVudHJ5U2V0LmhhcyhyZWFsS2V5KSB8fFxuICAgICAgcm9vdHMuc29tZSgocm9vdCkgPT4gaXNQYXRoSW5zaWRlKHJvb3QsIGtleSkgfHwgaXNQYXRoSW5zaWRlKHJvb3QsIHJlYWxLZXkpKTtcbiAgICBpZiAoaXNUd2Vha01vZHVsZSkgZGVsZXRlIHJlcXVpcmUuY2FjaGVba2V5XTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2FmZVJlYWxwYXRoKGZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICB0cnkge1xuICAgIHJldHVybiByZWFscGF0aFN5bmMoZmlsZVBhdGgpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmlsZVBhdGg7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RlZFR3ZWFrc1NuYXBzaG90KCkge1xuICBjb25zdCB1cGRhdGVDaGVja3MgPSByZWFkU3RhdGUoKS50d2Vha1VwZGF0ZUNoZWNrcyA/PyB7fTtcbiAgcmV0dXJuIHR3ZWFrU3RhdGUuZGlzY292ZXJlZC5tYXAoKHQpID0+ICh7XG4gICAgbWFuaWZlc3Q6IHQubWFuaWZlc3QsXG4gICAgZW50cnk6IHQuZW50cnksXG4gICAgZGlyOiB0LmRpcixcbiAgICBlbnRyeUV4aXN0czogZXhpc3RzU3luYyh0LmVudHJ5KSxcbiAgICBlbmFibGVkOiBpc1R3ZWFrRW5hYmxlZCh0Lm1hbmlmZXN0LmlkKSxcbiAgICB1cGRhdGU6IHVwZGF0ZUNoZWNrc1t0Lm1hbmlmZXN0LmlkXSA/PyBudWxsLFxuICB9KSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlbnN1cmVUd2Vha1VwZGF0ZUNoZWNrKHQ6IERpc2NvdmVyZWRUd2VhaywgZm9yY2UgPSBmYWxzZSk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBpZCA9IHQubWFuaWZlc3QuaWQ7XG4gIGNvbnN0IHJlcG8gPSB0Lm1hbmlmZXN0LmdpdGh1YlJlcG87XG4gIGlmICghcmVwbykgcmV0dXJuO1xuICBjb25zdCBzdGF0ZSA9IHJlYWRTdGF0ZSgpO1xuICBjb25zdCBjYWNoZWQgPSBzdGF0ZS50d2Vha1VwZGF0ZUNoZWNrcz8uW2lkXTtcbiAgaWYgKFxuICAgICFmb3JjZSAmJlxuICAgIGNhY2hlZCAmJlxuICAgIGNhY2hlZC5yZXBvID09PSByZXBvICYmXG4gICAgY2FjaGVkLmN1cnJlbnRWZXJzaW9uID09PSB0Lm1hbmlmZXN0LnZlcnNpb24gJiZcbiAgICBEYXRlLm5vdygpIC0gRGF0ZS5wYXJzZShjYWNoZWQuY2hlY2tlZEF0KSA8IFVQREFURV9DSEVDS19JTlRFUlZBTF9NU1xuICApIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBsZXQgY2hlY2s6IFR3ZWFrVXBkYXRlQ2hlY2s7XG4gIHRyeSB7XG4gICAgY29uc3QgeyByZWdpc3RyeSB9ID0gYXdhaXQgZmV0Y2hUd2Vha1N0b3JlUmVnaXN0cnkoKTtcbiAgICBjb25zdCBlbnRyeSA9IHJlZ2lzdHJ5LmVudHJpZXMuZmluZCgoY2FuZGlkYXRlKSA9PiBjYW5kaWRhdGUuaWQgPT09IGlkKTtcbiAgICBpZiAoIWVudHJ5KSB7XG4gICAgICBjaGVjayA9IHtcbiAgICAgICAgY2hlY2tlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIHJlcG8sXG4gICAgICAgIGN1cnJlbnRWZXJzaW9uOiB0Lm1hbmlmZXN0LnZlcnNpb24sXG4gICAgICAgIGxhdGVzdFZlcnNpb246IG51bGwsXG4gICAgICAgIGxhdGVzdFRhZzogbnVsbCxcbiAgICAgICAgcmVsZWFzZVVybDogbnVsbCxcbiAgICAgICAgdXBkYXRlQXZhaWxhYmxlOiBmYWxzZSxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGxhdGVzdFZlcnNpb24gPSBub3JtYWxpemVWZXJzaW9uKGVudHJ5Lm1hbmlmZXN0LnZlcnNpb24pO1xuICAgICAgY2hlY2sgPSB7XG4gICAgICAgIGNoZWNrZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICByZXBvLFxuICAgICAgICBjdXJyZW50VmVyc2lvbjogdC5tYW5pZmVzdC52ZXJzaW9uLFxuICAgICAgICBsYXRlc3RWZXJzaW9uLFxuICAgICAgICBsYXRlc3RUYWc6IG51bGwsXG4gICAgICAgIHJlbGVhc2VVcmw6IGVudHJ5LnJlbGVhc2VVcmwgPz8gYGh0dHBzOi8vZ2l0aHViLmNvbS8ke3JlcG99L3JlbGVhc2VzYCxcbiAgICAgICAgdXBkYXRlQXZhaWxhYmxlOiBjb21wYXJlVmVyc2lvbnMobGF0ZXN0VmVyc2lvbiwgbm9ybWFsaXplVmVyc2lvbih0Lm1hbmlmZXN0LnZlcnNpb24pKSA+IDAsXG4gICAgICAgIHBpbm5lZFNoYTogZW50cnkuYXBwcm92ZWRDb21taXRTaGEsXG4gICAgICB9O1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIGNoZWNrID0ge1xuICAgICAgY2hlY2tlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICByZXBvLFxuICAgICAgY3VycmVudFZlcnNpb246IHQubWFuaWZlc3QudmVyc2lvbixcbiAgICAgIGxhdGVzdFZlcnNpb246IG51bGwsXG4gICAgICBsYXRlc3RUYWc6IG51bGwsXG4gICAgICByZWxlYXNlVXJsOiBudWxsLFxuICAgICAgdXBkYXRlQXZhaWxhYmxlOiBmYWxzZSxcbiAgICAgIGVycm9yOiBlIGluc3RhbmNlb2YgRXJyb3IgPyBlLm1lc3NhZ2UgOiBTdHJpbmcoZSksXG4gICAgfTtcbiAgfVxuICBzdGF0ZS50d2Vha1VwZGF0ZUNoZWNrcyA/Pz0ge307XG4gIHN0YXRlLnR3ZWFrVXBkYXRlQ2hlY2tzW2lkXSA9IGNoZWNrO1xuICB3cml0ZVN0YXRlKHN0YXRlKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc3RhbGxHaXRodWJSZWxlYXNlVHdlYWsoaWQ6IHN0cmluZyk6IFByb21pc2U8e1xuICBpbnN0YWxsZWQ6IHN0cmluZztcbiAgdmVyc2lvbjogc3RyaW5nO1xuICBjb21taXRTaGE6IHN0cmluZztcbn0+IHtcbiAgY29uc3QgdHdlYWsgPSB0d2Vha1N0YXRlLmRpc2NvdmVyZWQuZmluZCgoaXRlbSkgPT4gaXRlbS5tYW5pZmVzdC5pZCA9PT0gaWQpO1xuICBpZiAoIXR3ZWFrKSB0aHJvdyBuZXcgRXJyb3IoYHVua25vd24gdHdlYWs6ICR7aWR9YCk7XG4gIGlmICghdHdlYWsubWFuaWZlc3QuZ2l0aHViUmVwbykge1xuICAgIHRocm93IG5ldyBFcnJvcihgJHt0d2Vhay5tYW5pZmVzdC5uYW1lfSBoYXMgbm8gZ2l0aHViUmVwbyBpbiBpdHMgbWFuaWZlc3RgKTtcbiAgfVxuXG4gIGxldCByZXBvOiBzdHJpbmc7XG4gIHRyeSB7XG4gICAgcmVwbyA9IG5vcm1hbGl6ZUdpdEh1YlJlcG8odHdlYWsubWFuaWZlc3QuZ2l0aHViUmVwbyk7XG4gIH0gY2F0Y2gge1xuICAgIHRocm93IG5ldyBFcnJvcihgJHt0d2Vhay5tYW5pZmVzdC5uYW1lfSBoYXMgYW4gaW52YWxpZCBnaXRodWJSZXBvOiAke3R3ZWFrLm1hbmlmZXN0LmdpdGh1YlJlcG99YCk7XG4gIH1cblxuICBjb25zdCB7IHJlZ2lzdHJ5IH0gPSBhd2FpdCBmZXRjaFR3ZWFrU3RvcmVSZWdpc3RyeSgpO1xuICBjb25zdCBzdG9yZUVudHJ5ID0gcmVnaXN0cnkuZW50cmllcy5maW5kKChlbnRyeSkgPT4ge1xuICAgIGlmIChlbnRyeS5pZCAhPT0gaWQpIHJldHVybiBmYWxzZTtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIG5vcm1hbGl6ZUdpdEh1YlJlcG8oZW50cnkucmVwbykgPT09IHJlcG87XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZW50cnkucmVwbyA9PT0gcmVwbztcbiAgICB9XG4gIH0pO1xuICBpZiAoIXN0b3JlRW50cnkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgJHt0d2Vhay5tYW5pZmVzdC5uYW1lfSBpcyBub3QgbGlzdGVkIGluIHRoZSBDaGF0R1BUIExheWVyIHR3ZWFrIHN0b3JlLCBzbyBpdCBjYW4ndCBiZSB1cGRhdGVkIGZyb20gR2l0SHViLmAsXG4gICAgKTtcbiAgfVxuXG4gIGFzc2VydFN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGlibGUoc3RvcmVFbnRyeSk7XG4gIGFzc2VydFN0b3JlRW50cnlSdW50aW1lQ29tcGF0aWJsZShzdG9yZUVudHJ5KTtcbiAgYXdhaXQgaW5zdGFsbFN0b3JlVHdlYWsoc3RvcmVFbnRyeSk7XG4gIHJlbG9hZFR3ZWFrcyhcInN0b3JlLXBpbi1pbnN0YWxsXCIsIHR3ZWFrTGlmZWN5Y2xlRGVwcyk7XG4gIGNvbnN0IGluc3RhbGxlZCA9IHR3ZWFrU3RhdGUuZGlzY292ZXJlZC5maW5kKChpdGVtKSA9PiBpdGVtLm1hbmlmZXN0LmlkID09PSBpZCkgPz8gdHdlYWs7XG4gIGF3YWl0IGVuc3VyZVR3ZWFrVXBkYXRlQ2hlY2soaW5zdGFsbGVkLCB0cnVlKTtcbiAgcmV0dXJuIHsgaW5zdGFsbGVkOiBpZCwgdmVyc2lvbjogc3RvcmVFbnRyeS5tYW5pZmVzdC52ZXJzaW9uLCBjb21taXRTaGE6IHN0b3JlRW50cnkuYXBwcm92ZWRDb21taXRTaGEgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJyb2FkY2FzdFJlbG9hZCgpOiB2b2lkIHtcbiAgY29uc3QgcGF5bG9hZCA9IHtcbiAgICBhdDogRGF0ZS5ub3coKSxcbiAgICB0d2Vha3M6IHR3ZWFrU3RhdGUuZGlzY292ZXJlZC5tYXAoKHQpID0+IHQubWFuaWZlc3QuaWQpLFxuICB9O1xuICBmb3IgKGNvbnN0IHdjIG9mIHdlYkNvbnRlbnRzLmdldEFsbFdlYkNvbnRlbnRzKCkpIHtcbiAgICB0cnkge1xuICAgICAgd2Muc2VuZChcImNvZGV4cHA6dHdlYWtzLWNoYW5nZWRcIiwgcGF5bG9hZCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nKFwid2FyblwiLCBcImJyb2FkY2FzdCBzZW5kIGZhaWxlZDpcIiwgZSk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlTG9nZ2VyKHNjb3BlOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHtcbiAgICBkZWJ1ZzogKC4uLmE6IHVua25vd25bXSkgPT4gbG9nKFwiaW5mb1wiLCBgWyR7c2NvcGV9XWAsIC4uLmEpLFxuICAgIGluZm86ICguLi5hOiB1bmtub3duW10pID0+IGxvZyhcImluZm9cIiwgYFske3Njb3BlfV1gLCAuLi5hKSxcbiAgICB3YXJuOiAoLi4uYTogdW5rbm93bltdKSA9PiBsb2coXCJ3YXJuXCIsIGBbJHtzY29wZX1dYCwgLi4uYSksXG4gICAgZXJyb3I6ICguLi5hOiB1bmtub3duW10pID0+IGxvZyhcImVycm9yXCIsIGBbJHtzY29wZX1dYCwgLi4uYSksXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlTWFpbklwYyhtYW5pZmVzdDogVHdlYWtNYW5pZmVzdCk6IFR3ZWFrSXBjIHtcbiAgaWYgKCFoYXNUd2Vha1Blcm1pc3Npb24obWFuaWZlc3QsIFwiaXBjXCIpKSByZXR1cm4gY3JlYXRlRGVuaWVkVHdlYWtJcGMobWFuaWZlc3QuaWQpO1xuICBjb25zdCBpZCA9IG1hbmlmZXN0LmlkO1xuICBjb25zdCBjaCA9IChjOiBzdHJpbmcpID0+IHNjb3BlZFR3ZWFrSXBjQ2hhbm5lbChpZCwgYyk7XG4gIHJldHVybiB7XG4gICAgb246IChjOiBzdHJpbmcsIGg6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpID0+IHtcbiAgICAgIGNvbnN0IHdyYXBwZWQgPSAoX2U6IHVua25vd24sIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gaCguLi5hcmdzKTtcbiAgICAgIGlwY01haW4ub24oY2goYyksIHdyYXBwZWQpO1xuICAgICAgcmV0dXJuICgpID0+IGlwY01haW4ucmVtb3ZlTGlzdGVuZXIoY2goYyksIHdyYXBwZWQgYXMgbmV2ZXIpO1xuICAgIH0sXG4gICAgc2VuZDogKF9jOiBzdHJpbmcpID0+IHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImlwYy5zZW5kIGlzIHJlbmRlcmVyXHUyMTkybWFpbjsgbWFpbiBzaWRlIHVzZXMgaGFuZGxlL29uXCIpO1xuICAgIH0sXG4gICAgaW52b2tlOiAoX2M6IHN0cmluZykgPT4ge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaXBjLmludm9rZSBpcyByZW5kZXJlclx1MjE5Mm1haW47IG1haW4gc2lkZSB1c2VzIGhhbmRsZVwiKTtcbiAgICB9LFxuICAgIGhhbmRsZTogKGM6IHN0cmluZywgaGFuZGxlcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdW5rbm93bikgPT4ge1xuICAgICAgaXBjTWFpbi5oYW5kbGUoY2goYyksIChfZTogdW5rbm93biwgLi4uYXJnczogdW5rbm93bltdKSA9PiBoYW5kbGVyKC4uLmFyZ3MpKTtcbiAgICB9LFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFrZU1haW5GcyhtYW5pZmVzdDogVHdlYWtNYW5pZmVzdCk6IFR3ZWFrRnMge1xuICBpZiAoIWhhc1R3ZWFrUGVybWlzc2lvbihtYW5pZmVzdCwgXCJmaWxlc3lzdGVtXCIpKSByZXR1cm4gY3JlYXRlRGVuaWVkVHdlYWtGcyhtYW5pZmVzdC5pZCk7XG4gIGNvbnN0IGlkID0gbWFuaWZlc3QuaWQ7XG4gIGNvbnN0IGRpciA9IGVuc3VyZVR3ZWFrRGF0YURpcih1c2VyUm9vdCEsIGlkKTtcbiAgY29uc3QgZnMgPSByZXF1aXJlKFwibm9kZTpmcy9wcm9taXNlc1wiKSBhcyB0eXBlb2YgaW1wb3J0KFwibm9kZTpmcy9wcm9taXNlc1wiKTtcbiAgcmV0dXJuIHtcbiAgICBkYXRhRGlyOiBkaXIsXG4gICAgcmVhZDogKHA6IHN0cmluZykgPT4gZnMucmVhZEZpbGUocmVzb2x2ZVR3ZWFrRGF0YVBhdGgodXNlclJvb3QhLCBpZCwgcCkuZnVsbCwgXCJ1dGY4XCIpLFxuICAgIHdyaXRlOiAocDogc3RyaW5nLCBjOiBzdHJpbmcpID0+IGZzLndyaXRlRmlsZShyZXNvbHZlVHdlYWtEYXRhUGF0aCh1c2VyUm9vdCEsIGlkLCBwKS5mdWxsLCBjLCBcInV0ZjhcIiksXG4gICAgZXhpc3RzOiBhc3luYyAocDogc3RyaW5nKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBmcy5hY2Nlc3MocmVzb2x2ZVR3ZWFrRGF0YVBhdGgodXNlclJvb3QhLCBpZCwgcCkuZnVsbCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9LFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3VycmVudFJ1bnRpbWVJbmZvKCk6IENvZGV4UnVudGltZUluZm8ge1xuICBjb25zdCBpbnN0YWxsZXJTdGF0ZSA9IHJlYWRJbnN0YWxsZXJTdGF0ZSgpO1xuICByZXR1cm4gZ2V0UnVudGltZUluZm8oe1xuICAgIHVzZXJSb290OiB1c2VyUm9vdCEsXG4gICAgcnVudGltZURpcjogcnVudGltZURpciEsXG4gICAgY29kZXhWZXJzaW9uOiBpbnN0YWxsZXJTdGF0ZT8uY29kZXhWZXJzaW9uID8/IG51bGwsXG4gICAgY2hhbm5lbDogbnVsbCxcbiAgICBnZXRXaW5kb3dTZXJ2aWNlczogZ2V0Q29kZXhXaW5kb3dTZXJ2aWNlcyxcbiAgICBlbnY6IGxpdmVQcm9iZUVudigpLFxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGN1cnJlbnRSdW50aW1lQ2FwYWJpbGl0aWVzKCk6IENvZGV4UnVudGltZUNhcGFiaWxpdGllcyB7XG4gIGNvbnN0IGluc3RhbGxlclN0YXRlID0gcmVhZEluc3RhbGxlclN0YXRlKCk7XG4gIHJldHVybiBnZXRSdW50aW1lQ2FwYWJpbGl0aWVzKHtcbiAgICB1c2VyUm9vdDogdXNlclJvb3QhLFxuICAgIHJ1bnRpbWVEaXI6IHJ1bnRpbWVEaXIhLFxuICAgIGNvZGV4VmVyc2lvbjogaW5zdGFsbGVyU3RhdGU/LmNvZGV4VmVyc2lvbiA/PyBudWxsLFxuICAgIGNoYW5uZWw6IG51bGwsXG4gICAgZ2V0V2luZG93U2VydmljZXM6IGdldENvZGV4V2luZG93U2VydmljZXMsXG4gICAgZ2V0TmF0aXZlQ2FwYWJpbGl0aWVzOiAoKSA9PiBuYXRpdmVCcmlkZ2UuZ2V0Q2FwYWJpbGl0aWVzKCksXG4gICAgZW52OiBsaXZlUHJvYmVFbnYoKSxcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGxpdmVQcm9iZUVudigpIHtcbiAgcmV0dXJuIHtcbiAgICBpbnNwZWN0RXhpc3RpbmdXaW5kb3c6ICgpID0+IHdpbmRvd1NhbXBsZUZyb20oZ2V0UHJpbWFyeUNvZGV4V2luZG93KCkpLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHdlYWtDb250ZXh0KHR3ZWFrSWQ6IHN0cmluZywgcGVybWlzc2lvbj86IFR3ZWFrUGVybWlzc2lvbik6IE5hdGl2ZVR3ZWFrQ29udGV4dCB7XG4gIGNvbnN0IHR3ZWFrID0gcGVybWlzc2lvblxuICAgID8gYXNzZXJ0QXV0aG9yaXplZFR3ZWFrKHR3ZWFrSWQsIHBlcm1pc3Npb24pXG4gICAgOiB0d2Vha0J5SWQodHdlYWtJZCk7XG4gIHJldHVybiB7IGlkOiB0d2Vhay5tYW5pZmVzdC5pZCwgZGlyOiB0d2Vhay5kaXIgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRpc2NvdmVyZWRUd2Vha1NuYXBzaG90KHR3ZWFrSWQ6IHN0cmluZyk6IFR3ZWFrSWRlbnRpdHlTbmFwc2hvdCB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHR3ZWFrID0gdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLmZpbmQoKGl0ZW0pID0+IGl0ZW0ubWFuaWZlc3QuaWQgPT09IHR3ZWFrSWQpO1xuICBpZiAoIXR3ZWFrKSByZXR1cm4gdW5kZWZpbmVkO1xuICByZXR1cm4ge1xuICAgIGlkOiB0d2Vhay5tYW5pZmVzdC5pZCxcbiAgICBlbmFibGVkOiBpc1R3ZWFrRW5hYmxlZCh0d2Vhay5tYW5pZmVzdC5pZCksXG4gICAgZGlyOiB0d2Vhay5kaXIsXG4gICAgbWFuaWZlc3Q6IHR3ZWFrLm1hbmlmZXN0LFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHdlYWtCeUlkKHR3ZWFrSWQ6IHN0cmluZyk6IERpc2NvdmVyZWRUd2VhayB7XG4gIGNvbnN0IHNuYXBzaG90ID0gYXV0aG9yaXplRW5hYmxlZFR3ZWFrKHR3ZWFrSWQpO1xuICBjb25zdCB0d2VhayA9IHR3ZWFrU3RhdGUuZGlzY292ZXJlZC5maW5kKChpdGVtKSA9PiBpdGVtLm1hbmlmZXN0LmlkID09PSBzbmFwc2hvdC5pZCk7XG4gIGlmICghdHdlYWspIHRocm93IG5ldyBFcnJvcihgdW5rbm93biB0d2VhazogJHt0d2Vha0lkfWApO1xuICByZXR1cm4gdHdlYWs7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhdXRob3JpemVFbmFibGVkVHdlYWsodHdlYWtJZDogdW5rbm93bik6IFR3ZWFrSWRlbnRpdHlTbmFwc2hvdCB7XG4gIGFzc2VydFZhbGlkVHdlYWtJZCh0d2Vha0lkKTtcbiAgY29uc3Qgc25hcHNob3QgPSBkaXNjb3ZlcmVkVHdlYWtTbmFwc2hvdCh0d2Vha0lkKTtcbiAgaWYgKCFzbmFwc2hvdCkgdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIHR3ZWFrOiAke3R3ZWFrSWR9YCk7XG4gIGlmICghc25hcHNob3QuZW5hYmxlZCkgdGhyb3cgbmV3IEVycm9yKGB0d2VhayBpcyBkaXNhYmxlZDogJHt0d2Vha0lkfWApO1xuICByZXR1cm4gc25hcHNob3Q7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRBdXRob3JpemVkVHdlYWsoXG4gIHR3ZWFrSWQ6IHVua25vd24sXG4gIHBlcm1pc3Npb246IFR3ZWFrUGVybWlzc2lvbixcbiAgb3duZXJJZD86IHN0cmluZyxcbik6IERpc2NvdmVyZWRUd2VhayB7XG4gIGNvbnN0IHNuYXBzaG90ID0gYXV0aG9yaXplVHdlYWtDYXBhYmlsaXR5KFxuICAgIHR5cGVvZiB0d2Vha0lkID09PSBcInN0cmluZ1wiID8gZGlzY292ZXJlZFR3ZWFrU25hcHNob3QodHdlYWtJZCkgOiB1bmRlZmluZWQsXG4gICAgdHdlYWtJZCxcbiAgICBwZXJtaXNzaW9uLFxuICAgIG93bmVySWQsXG4gICk7XG4gIGNvbnN0IHR3ZWFrID0gdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLmZpbmQoKGl0ZW0pID0+IGl0ZW0ubWFuaWZlc3QuaWQgPT09IHNuYXBzaG90LmlkKTtcbiAgaWYgKCF0d2VhaykgdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIHR3ZWFrOiAke1N0cmluZyh0d2Vha0lkKX1gKTtcbiAgcmV0dXJuIHR3ZWFrO1xufVxuXG4vKiogQGRlcHJlY2F0ZWQgVXNlIGFzc2VydEF1dGhvcml6ZWRUd2VhayAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFR3ZWFrUGVybWlzc2lvbkZvcklkKHR3ZWFrSWQ6IHN0cmluZywgcGVybWlzc2lvbjogVHdlYWtQZXJtaXNzaW9uKTogRGlzY292ZXJlZFR3ZWFrIHtcbiAgcmV0dXJuIGFzc2VydEF1dGhvcml6ZWRUd2Vhayh0d2Vha0lkLCBwZXJtaXNzaW9uKTtcbn1cblxuLyoqIEBkZXByZWNhdGVkIFVzZSBhc3NlcnRBdXRob3JpemVkVHdlYWsodHdlYWtJZCwgXCJjb2RleC12aWV3c1wiKSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFR3ZWFrVmlld1Blcm1pc3Npb25Gb3JJZCh0d2Vha0lkOiBzdHJpbmcpOiBEaXNjb3ZlcmVkVHdlYWsge1xuICByZXR1cm4gYXNzZXJ0QXV0aG9yaXplZFR3ZWFrKHR3ZWFrSWQsIFwiY29kZXgtdmlld3NcIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRUd2Vha1Blcm1pc3Npb24odHdlYWs6IERpc2NvdmVyZWRUd2VhaywgcGVybWlzc2lvbjogVHdlYWtQZXJtaXNzaW9uKTogdm9pZCB7XG4gIGFzc2VydFR3ZWFrSGFzUGVybWlzc2lvbih0d2Vhay5tYW5pZmVzdCwgcGVybWlzc2lvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRUd2Vha1ZpZXdQZXJtaXNzaW9uKHR3ZWFrOiBEaXNjb3ZlcmVkVHdlYWspOiB2b2lkIHtcbiAgYXNzZXJ0VHdlYWtIYXNQZXJtaXNzaW9uKHR3ZWFrLm1hbmlmZXN0LCBcImNvZGV4LXZpZXdzXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0VHdlYWtJZCh0d2Vha0lkOiBzdHJpbmcpOiB2b2lkIHtcbiAgYXNzZXJ0VmFsaWRUd2Vha0lkKHR3ZWFrSWQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFrZUNvZGV4QXBpKHR3ZWFrOiBEaXNjb3ZlcmVkVHdlYWspOiBDb2RleEFwaSB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHN1cmZhY2UgPSB0d2Vha0FwaVN1cmZhY2UodHdlYWsubWFuaWZlc3QpO1xuICBpZiAoIWhhc0FueUNvZGV4QXBpKHN1cmZhY2UpKSByZXR1cm4gdW5kZWZpbmVkO1xuICBjb25zdCBjdHggPSAoKTogTmF0aXZlVHdlYWtDb250ZXh0ID0+ICh7IGlkOiB0d2Vhay5tYW5pZmVzdC5pZCwgZGlyOiB0d2Vhay5kaXIgfSk7XG4gIGNvbnN0IGRlbnkgPSAocGVybWlzc2lvbjogVHdlYWtQZXJtaXNzaW9uKSA9PiBjcmVhdGVEZW5pZWRBc3luY01ldGhvZCh0d2Vhay5tYW5pZmVzdC5pZCwgcGVybWlzc2lvbik7XG4gIGNvbnN0IGd1YXJkID0gPEEgZXh0ZW5kcyB1bmtub3duW10sIFI+KFxuICAgIHBlcm1pc3Npb246IFR3ZWFrUGVybWlzc2lvbixcbiAgICBmbjogKC4uLmFyZ3M6IEEpID0+IFIgfCBQcm9taXNlPFI+LFxuICApOiAoKC4uLmFyZ3M6IEEpID0+IFByb21pc2U8Uj4pID0+IHtcbiAgICByZXR1cm4gYXN5bmMgKC4uLmFyZ3M6IEEpID0+IHtcbiAgICAgIGFzc2VydFR3ZWFrSGFzUGVybWlzc2lvbih0d2Vhay5tYW5pZmVzdCwgcGVybWlzc2lvbik7XG4gICAgICByZXR1cm4gYXdhaXQgZm4oLi4uYXJncyk7XG4gICAgfTtcbiAgfTtcbiAgcmV0dXJuIHtcbiAgICBydW50aW1lOiB7XG4gICAgICBnZXRJbmZvOiBzdXJmYWNlLmNvZGV4UnVudGltZSA/IGFzeW5jICgpID0+IGN1cnJlbnRSdW50aW1lSW5mbygpIDogZGVueShcImNvZGV4LXJ1bnRpbWVcIiksXG4gICAgICBnZXRDYXBhYmlsaXRpZXM6IHN1cmZhY2UuY29kZXhSdW50aW1lID8gYXN5bmMgKCkgPT4gY3VycmVudFJ1bnRpbWVDYXBhYmlsaXRpZXMoKSA6IGRlbnkoXCJjb2RleC1ydW50aW1lXCIpLFxuICAgIH0sXG4gICAgd2luZG93czoge1xuICAgICAgY3JlYXRlOiBzdXJmYWNlLmNvZGV4V2luZG93cyA/IGd1YXJkKFwiY29kZXgtd2luZG93c1wiLCBjcmVhdGVDb2RleFdpbmRvdykgOiBkZW55KFwiY29kZXgtd2luZG93c1wiKSxcbiAgICAgIGdldFByaW1hcnk6IHN1cmZhY2UuY29kZXhXaW5kb3dzID8gYXN5bmMgKCkgPT4gZ2V0UHJpbWFyeUNvZGV4V2luZG93UmVmKCkgOiBkZW55KFwiY29kZXgtd2luZG93c1wiKSxcbiAgICAgIGZvY3VzOiBzdXJmYWNlLmNvZGV4V2luZG93c1xuICAgICAgICA/IGd1YXJkKFwiY29kZXgtd2luZG93c1wiLCBhc3luYyAod2luZG93SWQ6IG51bWJlcikgPT4gZm9jdXNDb2RleFdpbmRvdyh3aW5kb3dJZCkpXG4gICAgICAgIDogZGVueShcImNvZGV4LXdpbmRvd3NcIiksXG4gICAgICBzaG93OiBzdXJmYWNlLmNvZGV4V2luZG93c1xuICAgICAgICA/IGd1YXJkKFwiY29kZXgtd2luZG93c1wiLCBhc3luYyAod2luZG93SWQ6IG51bWJlcikgPT4gc2hvd0NvZGV4V2luZG93KHdpbmRvd0lkKSlcbiAgICAgICAgOiBkZW55KFwiY29kZXgtd2luZG93c1wiKSxcbiAgICB9LFxuICAgIHZpZXdzOiB7XG4gICAgICBjcmVhdGU6IHN1cmZhY2UuY29kZXhWaWV3c1xuICAgICAgICA/IGd1YXJkKFwiY29kZXgtdmlld3NcIiwgKG9wdGlvbnM6IENvZGV4Vmlld0NyZWF0ZU9wdGlvbnMpID0+IGNyZWF0ZU93bFZpZXcoY3R4KCksIG9wdGlvbnMpKVxuICAgICAgICA6IGRlbnkoXCJjb2RleC12aWV3c1wiKSxcbiAgICB9LFxuICAgIGNkcDoge1xuICAgICAgZ2V0U3RhdHVzOiBzdXJmYWNlLmNvZGV4Q2RwID8gYXN5bmMgKCkgPT4gZ2V0Q2RwU3RhdHVzKCkgOiBkZW55KFwiY29kZXgtY2RwXCIpLFxuICAgICAgbGlzdFRhcmdldHM6IHN1cmZhY2UuY29kZXhDZHAgPyBhc3luYyAoKSA9PiBsaXN0Q2RwVGFyZ2V0cygpIDogZGVueShcImNvZGV4LWNkcFwiKSxcbiAgICB9LFxuICAgIG5hdGl2ZToge1xuICAgICAgbG9hZE1vZHVsZTogc3VyZmFjZS5uYXRpdmVNb2R1bGVcbiAgICAgICAgPyBndWFyZChcIm5hdGl2ZS1tb2R1bGVcIiwgYXN5bmMgKG9wdGlvbnM6IE5hdGl2ZU1vZHVsZUxvYWRPcHRpb25zKSA9PiBuYXRpdmVCcmlkZ2UubG9hZE1vZHVsZShjdHgoKSwgb3B0aW9ucykpXG4gICAgICAgIDogZGVueShcIm5hdGl2ZS1tb2R1bGVcIiksXG4gICAgICBjcmVhdGVQYW5lbDogc3VyZmFjZS5uYXRpdmVWaWV3XG4gICAgICAgID8gZ3VhcmQoXCJuYXRpdmUtdmlld1wiLCAob3B0aW9uczogTmF0aXZlUGFuZWxDcmVhdGVPcHRpb25zKSA9PiBuYXRpdmVCcmlkZ2UuY3JlYXRlUGFuZWwoY3R4KCksIG9wdGlvbnMpKVxuICAgICAgICA6IGRlbnkoXCJuYXRpdmUtdmlld1wiKSxcbiAgICAgIGF0dGFjaFZpZXc6IHN1cmZhY2UubmF0aXZlVmlld1xuICAgICAgICA/IGd1YXJkKFwibmF0aXZlLXZpZXdcIiwgKG9wdGlvbnM6IE5hdGl2ZVZpZXdBdHRhY2hPcHRpb25zKSA9PiBuYXRpdmVCcmlkZ2UuYXR0YWNoVmlldyhjdHgoKSwgb3B0aW9ucykpXG4gICAgICAgIDogZGVueShcIm5hdGl2ZS12aWV3XCIpLFxuICAgICAgbGF1bmNoSGVscGVyOiBzdXJmYWNlLm5hdGl2ZUhlbHBlclxuICAgICAgICA/IGd1YXJkKFwibmF0aXZlLWhlbHBlclwiLCBhc3luYyAob3B0aW9uczogTmF0aXZlSGVscGVyTGF1bmNoT3B0aW9ucykgPT4gbmF0aXZlQnJpZGdlLmxhdW5jaEhlbHBlcihjdHgoKSwgb3B0aW9ucykpXG4gICAgICAgIDogZGVueShcIm5hdGl2ZS1oZWxwZXJcIiksXG4gICAgfSxcbiAgICBjcmVhdGVCcm93c2VyVmlldzogc3VyZmFjZS5jb2RleFZpZXdzXG4gICAgICA/IGd1YXJkKFwiY29kZXgtdmlld3NcIiwgY3JlYXRlQ29kZXhCcm93c2VyVmlldylcbiAgICAgIDogZGVueShcImNvZGV4LXZpZXdzXCIpLFxuICAgIGNyZWF0ZVdpbmRvdzogc3VyZmFjZS5jb2RleFdpbmRvd3MgPyBndWFyZChcImNvZGV4LXdpbmRvd3NcIiwgY3JlYXRlQ29kZXhXaW5kb3cpIDogZGVueShcImNvZGV4LXdpbmRvd3NcIiksXG4gICAgc2Vzc2lvbnM6IHtcbiAgICAgIGxpc3Q6IHN1cmZhY2UuY29kZXhTZXNzaW9uc1xuICAgICAgICA/IGFzeW5jICgpID0+IHJlcXVpcmVDb2RleFNlc3Npb25NYW5hZ2VyKCkubGlzdFNlc3Npb25zKClcbiAgICAgICAgOiBkZW55KFwiY29kZXgtc2Vzc2lvbnNcIiksXG4gICAgICBnZXRTdGF0dXM6IHN1cmZhY2UuY29kZXhTZXNzaW9uc1xuICAgICAgICA/IGFzeW5jIChpZDogc3RyaW5nKSA9PiByZXF1aXJlQ29kZXhTZXNzaW9uTWFuYWdlcigpLmdldFNlc3Npb25TdGF0dXMoaWQpXG4gICAgICAgIDogZGVueShcImNvZGV4LXNlc3Npb25zXCIpLFxuICAgIH0sXG4gIH07XG59XG5cblxuZXhwb3J0IGNvbnN0IHR3ZWFrTGlmZWN5Y2xlRGVwczogU2V0VHdlYWtFbmFibGVkQW5kUmVsb2FkRGVwcyA9IHtcbiAgbG9nSW5mbzogKG1lc3NhZ2U6IHN0cmluZykgPT4gbG9nKFwiaW5mb1wiLCBtZXNzYWdlKSxcbiAgc2V0VHdlYWtFbmFibGVkLFxuICBzdG9wQWxsTWFpblR3ZWFrcyxcbiAgY2xlYXJUd2Vha01vZHVsZUNhY2hlLFxuICBsb2FkQWxsTWFpblR3ZWFrcyxcbiAgYnJvYWRjYXN0UmVsb2FkLFxufTtcbiIsICIvKipcbiAqIERpc2NvdmVyIHR3ZWFrcyB1bmRlciA8dXNlclJvb3Q+L3R3ZWFrcy4gRWFjaCB0d2VhayBpcyBhIGRpcmVjdG9yeSB3aXRoIGFcbiAqIG1hbmlmZXN0Lmpzb24gYW5kIGFuIGVudHJ5IHNjcmlwdC4gRW50cnkgcmVzb2x1dGlvbiBpcyBtYW5pZmVzdC5tYWluIGZpcnN0LFxuICogdGhlbiBpbmRleC5qcywgaW5kZXgubWpzLCBhbmQgaW5kZXguY2pzLlxuICpcbiAqIFRoZSBtYW5pZmVzdCBnYXRlIGlzIGludGVudGlvbmFsbHkgc3RyaWN0LiBBIHR3ZWFrIG11c3QgaWRlbnRpZnkgaXRzIEdpdEh1YlxuICogcmVwb3NpdG9yeSBzbyB0aGUgbWFuYWdlciBjYW4gY2hlY2sgcmVsZWFzZXMgd2l0aG91dCBncmFudGluZyB0aGUgdHdlYWsgYW5cbiAqIHVwZGF0ZS9pbnN0YWxsIGNoYW5uZWwuIFVwZGF0ZSBjaGVja3MgYXJlIGFkdmlzb3J5IG9ubHkuXG4gKi9cbmltcG9ydCB7IHJlYWRkaXJTeW5jLCBzdGF0U3luYywgcmVhZEZpbGVTeW5jLCBleGlzdHNTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGpvaW4gfSBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgdHlwZSB7IFR3ZWFrTWFuaWZlc3QgfSBmcm9tIFwiQGNvZGV4LXBsdXNwbHVzL3Nka1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIERpc2NvdmVyZWRUd2VhayB7XG4gIGRpcjogc3RyaW5nO1xuICBlbnRyeTogc3RyaW5nO1xuICBtYW5pZmVzdDogVHdlYWtNYW5pZmVzdDtcbn1cblxuY29uc3QgRU5UUllfQ0FORElEQVRFUyA9IFtcImluZGV4LmpzXCIsIFwiaW5kZXguY2pzXCIsIFwiaW5kZXgubWpzXCJdO1xuXG5leHBvcnQgZnVuY3Rpb24gZGlzY292ZXJUd2Vha3ModHdlYWtzRGlyOiBzdHJpbmcpOiBEaXNjb3ZlcmVkVHdlYWtbXSB7XG4gIGlmICghZXhpc3RzU3luYyh0d2Vha3NEaXIpKSByZXR1cm4gW107XG4gIGNvbnN0IG91dDogRGlzY292ZXJlZFR3ZWFrW10gPSBbXTtcbiAgZm9yIChjb25zdCBuYW1lIG9mIHJlYWRkaXJTeW5jKHR3ZWFrc0RpcikpIHtcbiAgICBjb25zdCBkaXIgPSBqb2luKHR3ZWFrc0RpciwgbmFtZSk7XG4gICAgaWYgKCFzdGF0U3luYyhkaXIpLmlzRGlyZWN0b3J5KCkpIGNvbnRpbnVlO1xuICAgIGNvbnN0IG1hbmlmZXN0UGF0aCA9IGpvaW4oZGlyLCBcIm1hbmlmZXN0Lmpzb25cIik7XG4gICAgaWYgKCFleGlzdHNTeW5jKG1hbmlmZXN0UGF0aCkpIGNvbnRpbnVlO1xuICAgIGxldCBtYW5pZmVzdDogVHdlYWtNYW5pZmVzdDtcbiAgICB0cnkge1xuICAgICAgbWFuaWZlc3QgPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhtYW5pZmVzdFBhdGgsIFwidXRmOFwiKSkgYXMgVHdlYWtNYW5pZmVzdDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAoIWlzVmFsaWRNYW5pZmVzdChtYW5pZmVzdCkpIGNvbnRpbnVlO1xuICAgIGNvbnN0IGVudHJ5ID0gcmVzb2x2ZUVudHJ5KGRpciwgbWFuaWZlc3QpO1xuICAgIGlmICghZW50cnkpIGNvbnRpbnVlO1xuICAgIG91dC5wdXNoKHsgZGlyLCBlbnRyeSwgbWFuaWZlc3QgfSk7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gaXNWYWxpZE1hbmlmZXN0KG06IFR3ZWFrTWFuaWZlc3QpOiBib29sZWFuIHtcbiAgaWYgKCFtLmlkIHx8ICFtLm5hbWUgfHwgIW0udmVyc2lvbiB8fCAhbS5naXRodWJSZXBvKSByZXR1cm4gZmFsc2U7XG4gIGlmICghL15bYS16QS1aMC05Ll8tXStcXC9bYS16QS1aMC05Ll8tXSskLy50ZXN0KG0uZ2l0aHViUmVwbykpIHJldHVybiBmYWxzZTtcbiAgaWYgKG0uc2NvcGUgJiYgIVtcInJlbmRlcmVyXCIsIFwibWFpblwiLCBcImJvdGhcIl0uaW5jbHVkZXMobS5zY29wZSkpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVFbnRyeShkaXI6IHN0cmluZywgbTogVHdlYWtNYW5pZmVzdCk6IHN0cmluZyB8IG51bGwge1xuICBpZiAobS5tYWluKSB7XG4gICAgY29uc3QgcCA9IGpvaW4oZGlyLCBtLm1haW4pO1xuICAgIHJldHVybiBleGlzdHNTeW5jKHApID8gcCA6IG51bGw7XG4gIH1cbiAgZm9yIChjb25zdCBjIG9mIEVOVFJZX0NBTkRJREFURVMpIHtcbiAgICBjb25zdCBwID0gam9pbihkaXIsIGMpO1xuICAgIGlmIChleGlzdHNTeW5jKHApKSByZXR1cm4gcDtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cbiIsICIvKipcbiAqIERpc2stYmFja2VkIGtleS92YWx1ZSBzdG9yYWdlIGZvciBtYWluLXByb2Nlc3MgdHdlYWtzLlxuICpcbiAqIEVhY2ggdHdlYWsgZ2V0cyBvbmUgSlNPTiBmaWxlIHVuZGVyIGA8dXNlclJvb3Q+L3N0b3JhZ2UvPGlkPi5qc29uYC5cbiAqIFdyaXRlcyBhcmUgZGVib3VuY2VkICg1MCBtcykgYW5kIGF0b21pYyAod3JpdGUgdG8gPGZpbGU+LnRtcCB0aGVuIHJlbmFtZSkuXG4gKiBSZWFkcyBhcmUgZWFnZXIgKyBjYWNoZWQgaW4tbWVtb3J5OyB3ZSBsb2FkIG9uIGZpcnN0IGFjY2Vzcy5cbiAqL1xuaW1wb3J0IHtcbiAgZXhpc3RzU3luYyxcbiAgbWtkaXJTeW5jLFxuICByZWFkRmlsZVN5bmMsXG4gIHJlbmFtZVN5bmMsXG4gIHdyaXRlRmlsZVN5bmMsXG59IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIERpc2tTdG9yYWdlIHtcbiAgZ2V0PFQ+KGtleTogc3RyaW5nLCBkZWZhdWx0VmFsdWU/OiBUKTogVDtcbiAgc2V0KGtleTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bik6IHZvaWQ7XG4gIGRlbGV0ZShrZXk6IHN0cmluZyk6IHZvaWQ7XG4gIGFsbCgpOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgZmx1c2goKTogdm9pZDtcbn1cblxuY29uc3QgRkxVU0hfREVMQVlfTVMgPSA1MDtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZURpc2tTdG9yYWdlKHJvb3REaXI6IHN0cmluZywgaWQ6IHN0cmluZyk6IERpc2tTdG9yYWdlIHtcbiAgY29uc3QgZGlyID0gam9pbihyb290RGlyLCBcInN0b3JhZ2VcIik7XG4gIG1rZGlyU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICBjb25zdCBmaWxlID0gam9pbihkaXIsIGAke3Nhbml0aXplKGlkKX0uanNvbmApO1xuXG4gIGxldCBkYXRhOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICBpZiAoZXhpc3RzU3luYyhmaWxlKSkge1xuICAgIHRyeSB7XG4gICAgICBkYXRhID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMoZmlsZSwgXCJ1dGY4XCIpKSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIENvcnJ1cHQgZmlsZSBcdTIwMTQgc3RhcnQgZnJlc2gsIGJ1dCBkb24ndCBjbG9iYmVyIHRoZSBvcmlnaW5hbCB1bnRpbCB3ZVxuICAgICAgLy8gc3VjY2Vzc2Z1bGx5IHdyaXRlIGFnYWluLiAoTW92ZSBpdCBhc2lkZSBmb3IgZm9yZW5zaWNzLilcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlbmFtZVN5bmMoZmlsZSwgYCR7ZmlsZX0uY29ycnVwdC0ke0RhdGUubm93KCl9YCk7XG4gICAgICB9IGNhdGNoIHt9XG4gICAgICBkYXRhID0ge307XG4gICAgfVxuICB9XG5cbiAgbGV0IGRpcnR5ID0gZmFsc2U7XG4gIGxldCB0aW1lcjogTm9kZUpTLlRpbWVvdXQgfCBudWxsID0gbnVsbDtcblxuICBjb25zdCBzY2hlZHVsZUZsdXNoID0gKCkgPT4ge1xuICAgIGRpcnR5ID0gdHJ1ZTtcbiAgICBpZiAodGltZXIpIHJldHVybjtcbiAgICB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGltZXIgPSBudWxsO1xuICAgICAgaWYgKGRpcnR5KSBmbHVzaCgpO1xuICAgIH0sIEZMVVNIX0RFTEFZX01TKTtcbiAgfTtcblxuICBjb25zdCBmbHVzaCA9ICgpOiB2b2lkID0+IHtcbiAgICBpZiAoIWRpcnR5KSByZXR1cm47XG4gICAgY29uc3QgdG1wID0gYCR7ZmlsZX0udG1wYDtcbiAgICB0cnkge1xuICAgICAgd3JpdGVGaWxlU3luYyh0bXAsIEpTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIDIpLCBcInV0ZjhcIik7XG4gICAgICByZW5hbWVTeW5jKHRtcCwgZmlsZSk7XG4gICAgICBkaXJ0eSA9IGZhbHNlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIExlYXZlIGRpcnR5PXRydWUgc28gYSBmdXR1cmUgZmx1c2ggcmV0cmllcy5cbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJbY29kZXgtcGx1c3BsdXNdIHN0b3JhZ2UgZmx1c2ggZmFpbGVkOlwiLCBpZCwgZSk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiB7XG4gICAgZ2V0OiA8VD4oazogc3RyaW5nLCBkPzogVCk6IFQgPT5cbiAgICAgIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChkYXRhLCBrKSA/IChkYXRhW2tdIGFzIFQpIDogKGQgYXMgVCksXG4gICAgc2V0KGssIHYpIHtcbiAgICAgIGRhdGFba10gPSB2O1xuICAgICAgc2NoZWR1bGVGbHVzaCgpO1xuICAgIH0sXG4gICAgZGVsZXRlKGspIHtcbiAgICAgIGlmIChrIGluIGRhdGEpIHtcbiAgICAgICAgZGVsZXRlIGRhdGFba107XG4gICAgICAgIHNjaGVkdWxlRmx1c2goKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGFsbDogKCkgPT4gKHsgLi4uZGF0YSB9KSxcbiAgICBmbHVzaCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gc2FuaXRpemUoaWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIC8vIFR3ZWFrIGlkcyBhcmUgYXV0aG9yLWNvbnRyb2xsZWQ7IGNsYW1wIHRvIGEgc2FmZSBmaWxlbmFtZS5cbiAgcmV0dXJuIGlkLnJlcGxhY2UoL1teYS16QS1aMC05Ll9ALV0vZywgXCJfXCIpO1xufVxuIiwgImltcG9ydCB7IGV4aXN0c1N5bmMsIG1rZGlyU3luYywgcmVhZEZpbGVTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGRpcm5hbWUsIGlzQWJzb2x1dGUsIHJlc29sdmUgfSBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgdHlwZSB7IFR3ZWFrTWNwU2VydmVyIH0gZnJvbSBcIkBjb2RleC1wbHVzcGx1cy9zZGtcIjtcblxuZXhwb3J0IGNvbnN0IE1DUF9NQU5BR0VEX1NUQVJUID0gXCIjIEJFR0lOIENPREVYKysgTUFOQUdFRCBNQ1AgU0VSVkVSU1wiO1xuZXhwb3J0IGNvbnN0IE1DUF9NQU5BR0VEX0VORCA9IFwiIyBFTkQgQ09ERVgrKyBNQU5BR0VEIE1DUCBTRVJWRVJTXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWNwU3luY1R3ZWFrIHtcbiAgZGlyOiBzdHJpbmc7XG4gIG1hbmlmZXN0OiB7XG4gICAgaWQ6IHN0cmluZztcbiAgICBtY3A/OiBUd2Vha01jcFNlcnZlcjtcbiAgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBCdWlsdE1hbmFnZWRNY3BCbG9jayB7XG4gIGJsb2NrOiBzdHJpbmc7XG4gIHNlcnZlck5hbWVzOiBzdHJpbmdbXTtcbiAgc2tpcHBlZFNlcnZlck5hbWVzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNYW5hZ2VkTWNwU3luY1Jlc3VsdCBleHRlbmRzIEJ1aWx0TWFuYWdlZE1jcEJsb2NrIHtcbiAgY2hhbmdlZDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN5bmNNYW5hZ2VkTWNwU2VydmVycyh7XG4gIGNvbmZpZ1BhdGgsXG4gIHR3ZWFrcyxcbn06IHtcbiAgY29uZmlnUGF0aDogc3RyaW5nO1xuICB0d2Vha3M6IE1jcFN5bmNUd2Vha1tdO1xufSk6IE1hbmFnZWRNY3BTeW5jUmVzdWx0IHtcbiAgY29uc3QgY3VycmVudCA9IGV4aXN0c1N5bmMoY29uZmlnUGF0aCkgPyByZWFkRmlsZVN5bmMoY29uZmlnUGF0aCwgXCJ1dGY4XCIpIDogXCJcIjtcbiAgY29uc3QgYnVpbHQgPSBidWlsZE1hbmFnZWRNY3BCbG9jayh0d2Vha3MsIGN1cnJlbnQpO1xuICBjb25zdCBuZXh0ID0gbWVyZ2VNYW5hZ2VkTWNwQmxvY2soY3VycmVudCwgYnVpbHQuYmxvY2spO1xuXG4gIGlmIChuZXh0ICE9PSBjdXJyZW50KSB7XG4gICAgbWtkaXJTeW5jKGRpcm5hbWUoY29uZmlnUGF0aCksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIHdyaXRlRmlsZVN5bmMoY29uZmlnUGF0aCwgbmV4dCwgXCJ1dGY4XCIpO1xuICB9XG5cbiAgcmV0dXJuIHsgLi4uYnVpbHQsIGNoYW5nZWQ6IG5leHQgIT09IGN1cnJlbnQgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkTWFuYWdlZE1jcEJsb2NrKFxuICB0d2Vha3M6IE1jcFN5bmNUd2Vha1tdLFxuICBleGlzdGluZ1RvbWwgPSBcIlwiLFxuKTogQnVpbHRNYW5hZ2VkTWNwQmxvY2sge1xuICBjb25zdCBtYW51YWxUb21sID0gc3RyaXBNYW5hZ2VkTWNwQmxvY2soZXhpc3RpbmdUb21sKTtcbiAgY29uc3QgbWFudWFsTmFtZXMgPSBmaW5kTWNwU2VydmVyTmFtZXMobWFudWFsVG9tbCk7XG4gIGNvbnN0IHVzZWROYW1lcyA9IG5ldyBTZXQobWFudWFsTmFtZXMpO1xuICBjb25zdCBzZXJ2ZXJOYW1lczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3Qgc2tpcHBlZFNlcnZlck5hbWVzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBlbnRyaWVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgdHdlYWsgb2YgdHdlYWtzKSB7XG4gICAgY29uc3QgbWNwID0gbm9ybWFsaXplTWNwU2VydmVyKHR3ZWFrLm1hbmlmZXN0Lm1jcCk7XG4gICAgaWYgKCFtY3ApIGNvbnRpbnVlO1xuXG4gICAgY29uc3QgYmFzZU5hbWUgPSBtY3BTZXJ2ZXJOYW1lRnJvbVR3ZWFrSWQodHdlYWsubWFuaWZlc3QuaWQpO1xuICAgIGlmIChtYW51YWxOYW1lcy5oYXMoYmFzZU5hbWUpKSB7XG4gICAgICBza2lwcGVkU2VydmVyTmFtZXMucHVzaChiYXNlTmFtZSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBzZXJ2ZXJOYW1lID0gcmVzZXJ2ZVVuaXF1ZU5hbWUoYmFzZU5hbWUsIHVzZWROYW1lcyk7XG4gICAgc2VydmVyTmFtZXMucHVzaChzZXJ2ZXJOYW1lKTtcbiAgICBlbnRyaWVzLnB1c2goZm9ybWF0TWNwU2VydmVyKHNlcnZlck5hbWUsIHR3ZWFrLmRpciwgbWNwKSk7XG4gIH1cblxuICBpZiAoZW50cmllcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4geyBibG9jazogXCJcIiwgc2VydmVyTmFtZXMsIHNraXBwZWRTZXJ2ZXJOYW1lcyB9O1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBibG9jazogW01DUF9NQU5BR0VEX1NUQVJULCAuLi5lbnRyaWVzLCBNQ1BfTUFOQUdFRF9FTkRdLmpvaW4oXCJcXG5cIiksXG4gICAgc2VydmVyTmFtZXMsXG4gICAgc2tpcHBlZFNlcnZlck5hbWVzLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWVyZ2VNYW5hZ2VkTWNwQmxvY2soY3VycmVudFRvbWw6IHN0cmluZywgbWFuYWdlZEJsb2NrOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoIW1hbmFnZWRCbG9jayAmJiAhY3VycmVudFRvbWwuaW5jbHVkZXMoTUNQX01BTkFHRURfU1RBUlQpKSByZXR1cm4gY3VycmVudFRvbWw7XG4gIGNvbnN0IHN0cmlwcGVkID0gc3RyaXBNYW5hZ2VkTWNwQmxvY2soY3VycmVudFRvbWwpLnRyaW1FbmQoKTtcbiAgaWYgKCFtYW5hZ2VkQmxvY2spIHJldHVybiBzdHJpcHBlZCA/IGAke3N0cmlwcGVkfVxcbmAgOiBcIlwiO1xuICByZXR1cm4gYCR7c3RyaXBwZWQgPyBgJHtzdHJpcHBlZH1cXG5cXG5gIDogXCJcIn0ke21hbmFnZWRCbG9ja31cXG5gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RyaXBNYW5hZ2VkTWNwQmxvY2sodG9tbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgcGF0dGVybiA9IG5ldyBSZWdFeHAoXG4gICAgYFxcXFxuPyR7ZXNjYXBlUmVnRXhwKE1DUF9NQU5BR0VEX1NUQVJUKX1bXFxcXHNcXFxcU10qPyR7ZXNjYXBlUmVnRXhwKE1DUF9NQU5BR0VEX0VORCl9XFxcXG4/YCxcbiAgICBcImdcIixcbiAgKTtcbiAgcmV0dXJuIHRvbWwucmVwbGFjZShwYXR0ZXJuLCBcIlxcblwiKS5yZXBsYWNlKC9cXG57Myx9L2csIFwiXFxuXFxuXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWNwU2VydmVyTmFtZUZyb21Ud2Vha0lkKGlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCB3aXRob3V0UHVibGlzaGVyID0gaWQucmVwbGFjZSgvXmNvXFwuYmVubmV0dFxcLi8sIFwiXCIpO1xuICBjb25zdCBzbHVnID0gd2l0aG91dFB1Ymxpc2hlclxuICAgIC5yZXBsYWNlKC9bXmEtekEtWjAtOV8tXSsvZywgXCItXCIpXG4gICAgLnJlcGxhY2UoL14tK3wtKyQvZywgXCJcIilcbiAgICAudG9Mb3dlckNhc2UoKTtcbiAgcmV0dXJuIHNsdWcgfHwgXCJ0d2Vhay1tY3BcIjtcbn1cblxuZnVuY3Rpb24gZmluZE1jcFNlcnZlck5hbWVzKHRvbWw6IHN0cmluZyk6IFNldDxzdHJpbmc+IHtcbiAgY29uc3QgbmFtZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgdGFibGVQYXR0ZXJuID0gL15cXHMqXFxbbWNwX3NlcnZlcnNcXC4oW15cXF1cXHNdKylcXF1cXHMqJC9nbTtcbiAgbGV0IG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xuICB3aGlsZSAoKG1hdGNoID0gdGFibGVQYXR0ZXJuLmV4ZWModG9tbCkpICE9PSBudWxsKSB7XG4gICAgbmFtZXMuYWRkKHVucXVvdGVUb21sS2V5KG1hdGNoWzFdID8/IFwiXCIpKTtcbiAgfVxuICByZXR1cm4gbmFtZXM7XG59XG5cbmZ1bmN0aW9uIHJlc2VydmVVbmlxdWVOYW1lKGJhc2VOYW1lOiBzdHJpbmcsIHVzZWROYW1lczogU2V0PHN0cmluZz4pOiBzdHJpbmcge1xuICBpZiAoIXVzZWROYW1lcy5oYXMoYmFzZU5hbWUpKSB7XG4gICAgdXNlZE5hbWVzLmFkZChiYXNlTmFtZSk7XG4gICAgcmV0dXJuIGJhc2VOYW1lO1xuICB9XG4gIGZvciAobGV0IGkgPSAyOyA7IGkgKz0gMSkge1xuICAgIGNvbnN0IGNhbmRpZGF0ZSA9IGAke2Jhc2VOYW1lfS0ke2l9YDtcbiAgICBpZiAoIXVzZWROYW1lcy5oYXMoY2FuZGlkYXRlKSkge1xuICAgICAgdXNlZE5hbWVzLmFkZChjYW5kaWRhdGUpO1xuICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplTWNwU2VydmVyKHZhbHVlOiBUd2Vha01jcFNlcnZlciB8IHVuZGVmaW5lZCk6IFR3ZWFrTWNwU2VydmVyIHwgbnVsbCB7XG4gIGlmICghdmFsdWUgfHwgdHlwZW9mIHZhbHVlLmNvbW1hbmQgIT09IFwic3RyaW5nXCIgfHwgdmFsdWUuY29tbWFuZC5sZW5ndGggPT09IDApIHJldHVybiBudWxsO1xuICBpZiAodmFsdWUuYXJncyAhPT0gdW5kZWZpbmVkICYmICFBcnJheS5pc0FycmF5KHZhbHVlLmFyZ3MpKSByZXR1cm4gbnVsbDtcbiAgaWYgKHZhbHVlLmFyZ3M/LnNvbWUoKGFyZykgPT4gdHlwZW9mIGFyZyAhPT0gXCJzdHJpbmdcIikpIHJldHVybiBudWxsO1xuICBpZiAodmFsdWUuZW52ICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAoIXZhbHVlLmVudiB8fCB0eXBlb2YgdmFsdWUuZW52ICE9PSBcIm9iamVjdFwiIHx8IEFycmF5LmlzQXJyYXkodmFsdWUuZW52KSkgcmV0dXJuIG51bGw7XG4gICAgaWYgKE9iamVjdC52YWx1ZXModmFsdWUuZW52KS5zb21lKChlbnZWYWx1ZSkgPT4gdHlwZW9mIGVudlZhbHVlICE9PSBcInN0cmluZ1wiKSkgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRNY3BTZXJ2ZXIoc2VydmVyTmFtZTogc3RyaW5nLCB0d2Vha0Rpcjogc3RyaW5nLCBtY3A6IFR3ZWFrTWNwU2VydmVyKTogc3RyaW5nIHtcbiAgY29uc3QgbGluZXMgPSBbXG4gICAgYFttY3Bfc2VydmVycy4ke2Zvcm1hdFRvbWxLZXkoc2VydmVyTmFtZSl9XWAsXG4gICAgYGNvbW1hbmQgPSAke2Zvcm1hdFRvbWxTdHJpbmcocmVzb2x2ZUNvbW1hbmQodHdlYWtEaXIsIG1jcC5jb21tYW5kKSl9YCxcbiAgXTtcblxuICBpZiAobWNwLmFyZ3MgJiYgbWNwLmFyZ3MubGVuZ3RoID4gMCkge1xuICAgIGxpbmVzLnB1c2goYGFyZ3MgPSAke2Zvcm1hdFRvbWxTdHJpbmdBcnJheShtY3AuYXJncy5tYXAoKGFyZykgPT4gcmVzb2x2ZUFyZyh0d2Vha0RpciwgYXJnKSkpfWApO1xuICB9XG5cbiAgaWYgKG1jcC5lbnYgJiYgT2JqZWN0LmtleXMobWNwLmVudikubGVuZ3RoID4gMCkge1xuICAgIGxpbmVzLnB1c2goYGVudiA9ICR7Zm9ybWF0VG9tbElubGluZVRhYmxlKG1jcC5lbnYpfWApO1xuICB9XG5cbiAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVDb21tYW5kKHR3ZWFrRGlyOiBzdHJpbmcsIGNvbW1hbmQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmIChpc0Fic29sdXRlKGNvbW1hbmQpIHx8ICFsb29rc0xpa2VSZWxhdGl2ZVBhdGgoY29tbWFuZCkpIHJldHVybiBjb21tYW5kO1xuICByZXR1cm4gcmVzb2x2ZSh0d2Vha0RpciwgY29tbWFuZCk7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVBcmcodHdlYWtEaXI6IHN0cmluZywgYXJnOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoaXNBYnNvbHV0ZShhcmcpIHx8IGFyZy5zdGFydHNXaXRoKFwiLVwiKSkgcmV0dXJuIGFyZztcbiAgY29uc3QgY2FuZGlkYXRlID0gcmVzb2x2ZSh0d2Vha0RpciwgYXJnKTtcbiAgcmV0dXJuIGV4aXN0c1N5bmMoY2FuZGlkYXRlKSA/IGNhbmRpZGF0ZSA6IGFyZztcbn1cblxuZnVuY3Rpb24gbG9va3NMaWtlUmVsYXRpdmVQYXRoKHZhbHVlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIHZhbHVlLnN0YXJ0c1dpdGgoXCIuL1wiKSB8fCB2YWx1ZS5zdGFydHNXaXRoKFwiLi4vXCIpIHx8IHZhbHVlLmluY2x1ZGVzKFwiL1wiKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VG9tbFN0cmluZyh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VG9tbFN0cmluZ0FycmF5KHZhbHVlczogc3RyaW5nW10pOiBzdHJpbmcge1xuICByZXR1cm4gYFske3ZhbHVlcy5tYXAoZm9ybWF0VG9tbFN0cmluZykuam9pbihcIiwgXCIpfV1gO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRUb21sSW5saW5lVGFibGUocmVjb3JkOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KTogc3RyaW5nIHtcbiAgcmV0dXJuIGB7ICR7T2JqZWN0LmVudHJpZXMocmVjb3JkKVxuICAgIC5tYXAoKFtrZXksIHZhbHVlXSkgPT4gYCR7Zm9ybWF0VG9tbEtleShrZXkpfSA9ICR7Zm9ybWF0VG9tbFN0cmluZyh2YWx1ZSl9YClcbiAgICAuam9pbihcIiwgXCIpfSB9YDtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VG9tbEtleShrZXk6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiAvXlthLXpBLVowLTlfLV0rJC8udGVzdChrZXkpID8ga2V5IDogZm9ybWF0VG9tbFN0cmluZyhrZXkpO1xufVxuXG5mdW5jdGlvbiB1bnF1b3RlVG9tbEtleShrZXk6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICgha2V5LnN0YXJ0c1dpdGgoJ1wiJykgfHwgIWtleS5lbmRzV2l0aCgnXCInKSkgcmV0dXJuIGtleTtcbiAgdHJ5IHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShrZXkpIGFzIHN0cmluZztcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGtleTtcbiAgfVxufVxuXG5mdW5jdGlvbiBlc2NhcGVSZWdFeHAodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB2YWx1ZS5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgXCJcXFxcJCZcIik7XG59XG4iLCAiaW1wb3J0IHsgQnJvd3NlcldpbmRvdyB9IGZyb20gXCJlbGVjdHJvblwiO1xuaW1wb3J0IHsgc3Bhd24sIHR5cGUgQ2hpbGRQcm9jZXNzV2l0aG91dE51bGxTdHJlYW1zIH0gZnJvbSBcIm5vZGU6Y2hpbGRfcHJvY2Vzc1wiO1xuaW1wb3J0IHsgcmFuZG9tVVVJRCB9IGZyb20gXCJub2RlOmNyeXB0b1wiO1xuaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBjcmVhdGVJbnRlcmZhY2UgfSBmcm9tIFwibm9kZTpyZWFkbGluZVwiO1xuaW1wb3J0IHsgcmVzb2x2ZU5hdGl2ZVR3ZWFrUGF0aCB9IGZyb20gXCIuL25hdGl2ZS1wYXRoc1wiO1xuaW1wb3J0IHR5cGUge1xuICBDb2RleFJ1bnRpbWVDYXBhYmlsaXRpZXMsXG4gIE5hdGl2ZUhlbHBlckxhdW5jaE9wdGlvbnMsXG4gIE5hdGl2ZUhlbHBlclJlZixcbiAgTmF0aXZlTW9kdWxlS2luZCxcbiAgTmF0aXZlTW9kdWxlTG9hZE9wdGlvbnMsXG4gIE5hdGl2ZU1vZHVsZVJlZixcbiAgTmF0aXZlUGFuZWxDcmVhdGVPcHRpb25zLFxuICBOYXRpdmVQYW5lbFJlZixcbiAgTmF0aXZlVmlld0F0dGFjaE9wdGlvbnMsXG4gIE5hdGl2ZVZpZXdSZWYsXG59IGZyb20gXCJAY29kZXgtcGx1c3BsdXMvc2RrXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTmF0aXZlVHdlYWtDb250ZXh0IHtcbiAgaWQ6IHN0cmluZztcbiAgZGlyOiBzdHJpbmc7XG59XG5cbnR5cGUgTmF0aXZlTG9nID0gKGxldmVsOiBcImluZm9cIiB8IFwid2FyblwiIHwgXCJlcnJvclwiLCAuLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQ7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTmF0aXZlQnJpZGdlT3B0aW9ucyB7XG4gIG5hdGl2ZUhvc3RQYXRoPzogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgTG9hZGVkTmF0aXZlTW9kdWxlIHtcbiAga2V5OiBzdHJpbmc7XG4gIHR3ZWFrSWQ6IHN0cmluZztcbiAgaWQ6IHN0cmluZztcbiAga2luZDogTmF0aXZlTW9kdWxlS2luZDtcbiAgcGF0aDogc3RyaW5nO1xuICBleHBvcnRzOiB1bmtub3duO1xufVxuXG5pbnRlcmZhY2UgTmF0aXZlSW5zdGFuY2Uge1xuICBrZXk6IHN0cmluZztcbiAgdHdlYWtJZDogc3RyaW5nO1xuICBpZDogc3RyaW5nO1xuICBraW5kOiBcInBhbmVsXCIgfCBcInZpZXdcIjtcbiAgdmFsdWU6IHVua25vd247XG4gIHBhcmVudFdpbmRvd0lkOiBudW1iZXIgfCBudWxsO1xuICB3aW5kb3dJZDogbnVtYmVyIHwgbnVsbDtcbiAgZGlzcG9zZUJpbmRpbmdzOiBBcnJheTwoKSA9PiB2b2lkPjtcbiAgZGlzcG9zaW5nOiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgSGVscGVyUmVxdWVzdCB7XG4gIHJlc29sdmUodmFsdWU6IHVua25vd24pOiB2b2lkO1xuICByZWplY3QoZXJyb3I6IEVycm9yKTogdm9pZDtcbiAgdGltZXI6IE5vZGVKUy5UaW1lb3V0O1xufVxuXG5pbnRlcmZhY2UgTmF0aXZlSGVscGVyUHJvY2VzcyB7XG4gIGtleTogc3RyaW5nO1xuICB0d2Vha0lkOiBzdHJpbmc7XG4gIGlkOiBzdHJpbmc7XG4gIGNoaWxkOiBDaGlsZFByb2Nlc3NXaXRob3V0TnVsbFN0cmVhbXM7XG4gIHBlbmRpbmc6IE1hcDxzdHJpbmcsIEhlbHBlclJlcXVlc3Q+O1xufVxuXG5leHBvcnQgY2xhc3MgTmF0aXZlQnJpZGdlIHtcbiAgcHJpdmF0ZSBtb2R1bGVzID0gbmV3IE1hcDxzdHJpbmcsIExvYWRlZE5hdGl2ZU1vZHVsZT4oKTtcbiAgcHJpdmF0ZSBpbnN0YW5jZXMgPSBuZXcgTWFwPHN0cmluZywgTmF0aXZlSW5zdGFuY2U+KCk7XG4gIHByaXZhdGUgaGVscGVycyA9IG5ldyBNYXA8c3RyaW5nLCBOYXRpdmVIZWxwZXJQcm9jZXNzPigpO1xuICBwcml2YXRlIG5hdGl2ZUhvc3RFeHBvcnRzOiB1bmtub3duIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgbmF0aXZlSG9zdExvYWRFcnJvcjogRXJyb3IgfCBudWxsID0gbnVsbDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxvZzogTmF0aXZlTG9nLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgb3B0aW9uczogTmF0aXZlQnJpZGdlT3B0aW9ucyA9IHt9LFxuICApIHt9XG5cbiAgZ2V0Q2FwYWJpbGl0aWVzKCk6IENvZGV4UnVudGltZUNhcGFiaWxpdGllc1tcIm5hdGl2ZVwiXSB7XG4gICAgY29uc3QgaG9zdCA9IHRoaXMubG9hZE5hdGl2ZUhvc3QoZmFsc2UpO1xuICAgIGNvbnN0IGhvc3RDYXBhYmlsaXRpZXMgPSBob3N0ID8gdGhpcy5yZWFkTmF0aXZlSG9zdENhcGFiaWxpdGllcyhob3N0KSA6IHt9O1xuICAgIGNvbnN0IG5hdGl2ZUhvc3QgPSBob3N0ICE9PSBudWxsO1xuICAgIHJldHVybiB7XG4gICAgICBpblByb2Nlc3NNb2R1bGVzOiB0cnVlLFxuICAgICAgc3dpZnRNb2R1bGVzOiBwcm9jZXNzLnBsYXRmb3JtID09PSBcImRhcndpblwiLFxuICAgICAgYXBwS2l0RW1iZWRkaW5nOiBCb29sZWFuKGhvc3RDYXBhYmlsaXRpZXMuYXBwS2l0RW1iZWRkaW5nKSxcbiAgICAgIGNoaWxkV2luZG93T3ZlcmxheTogQm9vbGVhbihob3N0Q2FwYWJpbGl0aWVzLmNoaWxkV2luZG93T3ZlcmxheSksXG4gICAgICBkaXJlY3RWaWV3QXR0YWNoOiBCb29sZWFuKGhvc3RDYXBhYmlsaXRpZXMuZGlyZWN0Vmlld0F0dGFjaCksXG4gICAgICBtZXRhbFZpZXdzOiBCb29sZWFuKGhvc3RDYXBhYmlsaXRpZXMubWV0YWxWaWV3cyksXG4gICAgICBuYXRpdmVIb3N0LFxuICAgICAgaGVscGVyczogdHJ1ZSxcbiAgICB9O1xuICB9XG5cbiAgbG9hZE1vZHVsZShjdHg6IE5hdGl2ZVR3ZWFrQ29udGV4dCwgb3B0aW9uczogTmF0aXZlTW9kdWxlTG9hZE9wdGlvbnMpOiBOYXRpdmVNb2R1bGVSZWYge1xuICAgIGNvbnN0IGlkID0gYXNzZXJ0QnJpZGdlSWQob3B0aW9ucy5pZCwgXCJuYXRpdmUgbW9kdWxlIGlkXCIpO1xuICAgIGNvbnN0IGZ1bGxQYXRoID0gcmVzb2x2ZVR3ZWFrUGF0aChjdHgsIG9wdGlvbnMucGF0aCk7XG4gICAgY29uc3Qga2luZCA9IG9wdGlvbnMua2luZCA/PyBpbmZlck1vZHVsZUtpbmQoZnVsbFBhdGgpO1xuXG4gICAgaWYgKGtpbmQgIT09IFwibm9kZS1hZGRvblwiKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGAke2tpbmR9IG5hdGl2ZSBtb2R1bGVzIG11c3QgYmUgbG9hZGVkIHRocm91Z2ggYSAubm9kZSBPYmplY3RpdmUtQysrIHNoaW0gaW4gQ29kZXgrKyAxLjAuMGAsXG4gICAgICApO1xuICAgIH1cblxuICAgIGlmICghZnVsbFBhdGguZW5kc1dpdGgoXCIubm9kZVwiKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwibm9kZS1hZGRvbiBuYXRpdmUgbW9kdWxlcyBtdXN0IHVzZSBhIC5ub2RlIGZpbGVcIik7XG4gICAgfVxuXG4gICAgY29uc3QgbG9hZGVkID0gcmVxdWlyZShmdWxsUGF0aCkgYXMgdW5rbm93bjtcbiAgICBjb25zdCBleHBvcnRzID0gc2VsZWN0RW50cnlwb2ludChsb2FkZWQsIG9wdGlvbnMuZW50cnlwb2ludCk7XG4gICAgY29uc3Qga2V5ID0gbW9kdWxlS2V5KGN0eC5pZCwgaWQpO1xuICAgIHRoaXMubW9kdWxlcy5zZXQoa2V5LCB7IGtleSwgdHdlYWtJZDogY3R4LmlkLCBpZCwga2luZCwgcGF0aDogZnVsbFBhdGgsIGV4cG9ydHMgfSk7XG4gICAgdGhpcy5sb2coXCJpbmZvXCIsIGBsb2FkZWQgbmF0aXZlIG1vZHVsZSAke2N0eC5pZH06JHtpZH1gLCB7IGtpbmQsIHBhdGg6IGZ1bGxQYXRoIH0pO1xuICAgIHJldHVybiB0aGlzLm1vZHVsZVJlZihjdHguaWQsIGlkLCBraW5kKTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZVBhbmVsKGN0eDogTmF0aXZlVHdlYWtDb250ZXh0LCBvcHRpb25zOiBOYXRpdmVQYW5lbENyZWF0ZU9wdGlvbnMpOiBQcm9taXNlPE5hdGl2ZVBhbmVsUmVmPiB7XG4gICAgY29uc3QgY3JlYXRlZCA9IGF3YWl0IHRoaXMuY3JlYXRlTmF0aXZlSW5zdGFuY2UoY3R4LCBcInBhbmVsXCIsIG9wdGlvbnMubW9kdWxlSWQsIG9wdGlvbnMuZmFjdG9yeSA/PyBcImNyZWF0ZVBhbmVsXCIsIHtcbiAgICAgIHBhcmVudFdpbmRvd0lkOiBvcHRpb25zLnBhcmVudFdpbmRvd0lkLFxuICAgICAgYm91bmRzOiBvcHRpb25zLmJvdW5kcyxcbiAgICAgIHRyYW5zcGFyZW50OiBvcHRpb25zLnRyYW5zcGFyZW50ID09PSB0cnVlLFxuICAgICAgcGFzc3Rocm91Z2hNb3VzZTogb3B0aW9ucy5wYXNzdGhyb3VnaE1vdXNlID09PSB0cnVlLFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnBhbmVsUmVmKGNyZWF0ZWQpO1xuICB9XG5cbiAgYXN5bmMgYXR0YWNoVmlldyhjdHg6IE5hdGl2ZVR3ZWFrQ29udGV4dCwgb3B0aW9uczogTmF0aXZlVmlld0F0dGFjaE9wdGlvbnMpOiBQcm9taXNlPE5hdGl2ZVZpZXdSZWY+IHtcbiAgICBjb25zdCBjcmVhdGVkID0gYXdhaXQgdGhpcy5jcmVhdGVOYXRpdmVJbnN0YW5jZShjdHgsIFwidmlld1wiLCBvcHRpb25zLm1vZHVsZUlkLCBvcHRpb25zLmZhY3RvcnkgPz8gXCJhdHRhY2hWaWV3XCIsIHtcbiAgICAgIHBhcmVudFdpbmRvd0lkOiBvcHRpb25zLnBhcmVudFdpbmRvd0lkLFxuICAgICAgYm91bmRzOiBvcHRpb25zLmJvdW5kcyxcbiAgICAgIHpJbmRleDogb3B0aW9ucy56SW5kZXgsXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMudmlld1JlZihjcmVhdGVkKTtcbiAgfVxuXG4gIGxhdW5jaEhlbHBlcihjdHg6IE5hdGl2ZVR3ZWFrQ29udGV4dCwgb3B0aW9uczogTmF0aXZlSGVscGVyTGF1bmNoT3B0aW9ucyk6IE5hdGl2ZUhlbHBlclJlZiB7XG4gICAgY29uc3QgaWQgPSBhc3NlcnRCcmlkZ2VJZChvcHRpb25zLmlkLCBcIm5hdGl2ZSBoZWxwZXIgaWRcIik7XG4gICAgaWYgKChvcHRpb25zLnRyYW5zcG9ydCA/PyBcInN0ZGlvXCIpICE9PSBcInN0ZGlvXCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIm5hdGl2ZSBoZWxwZXJzIHN1cHBvcnQgb25seSBzdGRpbyB0cmFuc3BvcnQgaW4gQ29kZXgrKyAxLjAuMFwiKTtcbiAgICB9XG4gICAgaWYgKChvcHRpb25zLnJlc3RhcnQgPz8gXCJuZXZlclwiKSAhPT0gXCJuZXZlclwiKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJuYXRpdmUgaGVscGVyIHJlc3RhcnQgcG9saWNpZXMgYXJlIG5vdCBhdmFpbGFibGUgaW4gQ29kZXgrKyAxLjAuMFwiKTtcbiAgICB9XG4gICAgY29uc3QgZXhlY3V0YWJsZSA9IHJlc29sdmVUd2Vha1BhdGgoY3R4LCBvcHRpb25zLmV4ZWN1dGFibGUpO1xuICAgIGNvbnN0IGFyZ3MgPSBvcHRpb25zLmFyZ3MgPz8gW107XG4gICAgY29uc3QgZW52ID0geyAuLi5wcm9jZXNzLmVudiwgLi4uKG9wdGlvbnMuZW52ID8/IHt9KSB9O1xuICAgIGNvbnN0IGNoaWxkID0gc3Bhd24oZXhlY3V0YWJsZSwgYXJncywge1xuICAgICAgY3dkOiBjdHguZGlyLFxuICAgICAgZW52LFxuICAgICAgc3RkaW86IFtcInBpcGVcIiwgXCJwaXBlXCIsIFwicGlwZVwiXSxcbiAgICB9KTtcbiAgICBjb25zdCBrZXkgPSBoZWxwZXJLZXkoY3R4LmlkLCBpZCk7XG4gICAgY29uc3QgaGVscGVyOiBOYXRpdmVIZWxwZXJQcm9jZXNzID0ge1xuICAgICAga2V5LFxuICAgICAgdHdlYWtJZDogY3R4LmlkLFxuICAgICAgaWQsXG4gICAgICBjaGlsZCxcbiAgICAgIHBlbmRpbmc6IG5ldyBNYXAoKSxcbiAgICB9O1xuICAgIHRoaXMuaGVscGVycy5zZXQoa2V5LCBoZWxwZXIpO1xuXG4gICAgY29uc3Qgc3Rkb3V0ID0gY3JlYXRlSW50ZXJmYWNlKHsgaW5wdXQ6IGNoaWxkLnN0ZG91dCB9KTtcbiAgICBzdGRvdXQub24oXCJsaW5lXCIsIChsaW5lKSA9PiB0aGlzLmhhbmRsZUhlbHBlckxpbmUoaGVscGVyLCBsaW5lKSk7XG4gICAgY2hpbGQuc3RkZXJyLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IHtcbiAgICAgIHRoaXMubG9nKFwid2FyblwiLCBgbmF0aXZlIGhlbHBlciAke2N0eC5pZH06JHtpZH0gc3RkZXJyYCwgU3RyaW5nKGNodW5rKSk7XG4gICAgfSk7XG4gICAgY2hpbGQub24oXCJleGl0XCIsIChjb2RlLCBzaWduYWwpID0+IHtcbiAgICAgIHRoaXMubG9nKFwiaW5mb1wiLCBgbmF0aXZlIGhlbHBlciAke2N0eC5pZH06JHtpZH0gZXhpdGVkYCwgeyBjb2RlLCBzaWduYWwgfSk7XG4gICAgICB0aGlzLmhlbHBlcnMuZGVsZXRlKGtleSk7XG4gICAgICBmb3IgKGNvbnN0IHJlcXVlc3Qgb2YgaGVscGVyLnBlbmRpbmcudmFsdWVzKCkpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHJlcXVlc3QudGltZXIpO1xuICAgICAgICByZXF1ZXN0LnJlamVjdChuZXcgRXJyb3IoYG5hdGl2ZSBoZWxwZXIgZXhpdGVkIGJlZm9yZSByZXNwb25zZWApKTtcbiAgICAgIH1cbiAgICAgIGhlbHBlci5wZW5kaW5nLmNsZWFyKCk7XG4gICAgfSk7XG4gICAgY2hpbGQub24oXCJlcnJvclwiLCAoZXJyb3IpID0+IHtcbiAgICAgIHRoaXMubG9nKFwiZXJyb3JcIiwgYG5hdGl2ZSBoZWxwZXIgJHtjdHguaWR9OiR7aWR9IGZhaWxlZGAsIGVycm9yKTtcbiAgICAgIHRoaXMuaGVscGVycy5kZWxldGUoa2V5KTtcbiAgICAgIGZvciAoY29uc3QgcmVxdWVzdCBvZiBoZWxwZXIucGVuZGluZy52YWx1ZXMoKSkge1xuICAgICAgICBjbGVhclRpbWVvdXQocmVxdWVzdC50aW1lcik7XG4gICAgICAgIHJlcXVlc3QucmVqZWN0KGVycm9yKTtcbiAgICAgIH1cbiAgICAgIGhlbHBlci5wZW5kaW5nLmNsZWFyKCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmxvZyhcImluZm9cIiwgYGxhdW5jaGVkIG5hdGl2ZSBoZWxwZXIgJHtjdHguaWR9OiR7aWR9YCwgeyBwaWQ6IGNoaWxkLnBpZCwgZXhlY3V0YWJsZSB9KTtcbiAgICByZXR1cm4gdGhpcy5oZWxwZXJSZWYoY3R4LmlkLCBpZCwgY2hpbGQucGlkID8/IC0xKTtcbiAgfVxuXG4gIGRpc3Bvc2VUd2Vhayh0d2Vha0lkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IFtrZXksIGluc3RhbmNlXSBvZiBbLi4udGhpcy5pbnN0YW5jZXNdKSB7XG4gICAgICBpZiAoaW5zdGFuY2UudHdlYWtJZCAhPT0gdHdlYWtJZCkgY29udGludWU7XG4gICAgICB2b2lkIHRoaXMuZGlzcG9zZUluc3RhbmNlKGluc3RhbmNlKS5maW5hbGx5KCgpID0+IHRoaXMuaW5zdGFuY2VzLmRlbGV0ZShrZXkpKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBba2V5LCBoZWxwZXJdIG9mIFsuLi50aGlzLmhlbHBlcnNdKSB7XG4gICAgICBpZiAoaGVscGVyLnR3ZWFrSWQgIT09IHR3ZWFrSWQpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5zdG9wSGVscGVyKGhlbHBlcik7XG4gICAgICB0aGlzLmhlbHBlcnMuZGVsZXRlKGtleSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgW2tleSwgbW9kXSBvZiBbLi4udGhpcy5tb2R1bGVzXSkge1xuICAgICAgaWYgKG1vZC50d2Vha0lkICE9PSB0d2Vha0lkKSBjb250aW51ZTtcbiAgICAgIHZvaWQgY2FsbE9wdGlvbmFsKG1vZC5leHBvcnRzLCBcImRpc3Bvc2VcIiwgW10pO1xuICAgICAgdGhpcy5tb2R1bGVzLmRlbGV0ZShrZXkpO1xuICAgIH1cbiAgfVxuXG4gIGRpc3Bvc2VBbGwoKTogdm9pZCB7XG4gICAgY29uc3QgdHdlYWtJZHMgPSBuZXcgU2V0KFtcbiAgICAgIC4uLlsuLi50aGlzLm1vZHVsZXMudmFsdWVzKCldLm1hcCgoaXRlbSkgPT4gaXRlbS50d2Vha0lkKSxcbiAgICAgIC4uLlsuLi50aGlzLmluc3RhbmNlcy52YWx1ZXMoKV0ubWFwKChpdGVtKSA9PiBpdGVtLnR3ZWFrSWQpLFxuICAgICAgLi4uWy4uLnRoaXMuaGVscGVycy52YWx1ZXMoKV0ubWFwKChpdGVtKSA9PiBpdGVtLnR3ZWFrSWQpLFxuICAgIF0pO1xuICAgIGZvciAoY29uc3QgaWQgb2YgdHdlYWtJZHMpIHRoaXMuZGlzcG9zZVR3ZWFrKGlkKTtcbiAgfVxuXG4gIGFzeW5jIGNhbGxJbnN0YW5jZShcbiAgICB0d2Vha0lkOiBzdHJpbmcsXG4gICAga2luZDogXCJwYW5lbFwiIHwgXCJ2aWV3XCIsXG4gICAgaWQ6IHN0cmluZyxcbiAgICBtZXRob2Q6IHN0cmluZyxcbiAgICBhcmc/OiB1bmtub3duLFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoa2luZCA9PT0gXCJwYW5lbFwiKSB7XG4gICAgICBpZiAobWV0aG9kID09PSBcInNldEJvdW5kc1wiKSByZXR1cm4gdGhpcy5pbnZva2VJbnN0YW5jZSh0d2Vha0lkLCBpZCwgXCJzZXRCb3VuZHNcIiwgW2FyZ10pO1xuICAgICAgaWYgKG1ldGhvZCA9PT0gXCJzaG93XCIpIHJldHVybiB0aGlzLmludm9rZUluc3RhbmNlKHR3ZWFrSWQsIGlkLCBcInNob3dcIiwgW10pO1xuICAgICAgaWYgKG1ldGhvZCA9PT0gXCJoaWRlXCIpIHJldHVybiB0aGlzLmludm9rZUluc3RhbmNlKHR3ZWFrSWQsIGlkLCBcImhpZGVcIiwgW10pO1xuICAgICAgaWYgKG1ldGhvZCA9PT0gXCJkaXNwb3NlXCIpIHJldHVybiB0aGlzLmRpc3Bvc2VJbnN0YW5jZUJ5SWQodHdlYWtJZCwgaWQpO1xuICAgIH1cbiAgICBpZiAoa2luZCA9PT0gXCJ2aWV3XCIpIHtcbiAgICAgIGlmIChtZXRob2QgPT09IFwic2V0Qm91bmRzXCIpIHJldHVybiB0aGlzLmludm9rZUluc3RhbmNlKHR3ZWFrSWQsIGlkLCBcInNldEJvdW5kc1wiLCBbYXJnXSk7XG4gICAgICBpZiAobWV0aG9kID09PSBcInNldFZpc2libGVcIikgcmV0dXJuIHRoaXMuaW52b2tlSW5zdGFuY2UodHdlYWtJZCwgaWQsIFwic2V0VmlzaWJsZVwiLCBbYXJnXSk7XG4gICAgICBpZiAobWV0aG9kID09PSBcImRpc3Bvc2VcIikgcmV0dXJuIHRoaXMuZGlzcG9zZUluc3RhbmNlQnlJZCh0d2Vha0lkLCBpZCk7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgdW5rbm93biBuYXRpdmUgJHtraW5kfSBtZXRob2Q6ICR7bWV0aG9kfWApO1xuICB9XG5cbiAgYXN5bmMgY2FsbEhlbHBlcihcbiAgICB0d2Vha0lkOiBzdHJpbmcsXG4gICAgaGVscGVySWQ6IHN0cmluZyxcbiAgICBtZXRob2Q6IHN0cmluZyxcbiAgICBwYXlsb2FkPzogdW5rbm93bixcbiAgICB0aW1lb3V0TXM/OiBudW1iZXIsXG4gICk6IFByb21pc2U8dW5rbm93bj4ge1xuICAgIGlmIChtZXRob2QgPT09IFwic2VuZFwiKSByZXR1cm4gdGhpcy5zZW5kSGVscGVyKHR3ZWFrSWQsIGhlbHBlcklkLCBwYXlsb2FkKTtcbiAgICBpZiAobWV0aG9kID09PSBcInJlcXVlc3RcIikgcmV0dXJuIHRoaXMucmVxdWVzdEhlbHBlcih0d2Vha0lkLCBoZWxwZXJJZCwgcGF5bG9hZCwgdGltZW91dE1zKTtcbiAgICBpZiAobWV0aG9kID09PSBcInN0b3BcIikgcmV0dXJuIHRoaXMuc3RvcEhlbHBlckJ5SWQodHdlYWtJZCwgaGVscGVySWQpO1xuICAgIHRocm93IG5ldyBFcnJvcihgdW5rbm93biBuYXRpdmUgaGVscGVyIG1ldGhvZDogJHttZXRob2R9YCk7XG4gIH1cblxuICBwcml2YXRlIG1vZHVsZVJlZih0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcsIGtpbmQgPSB0aGlzLm1vZHVsZUZvcih0d2Vha0lkLCBpZCkua2luZCk6IE5hdGl2ZU1vZHVsZVJlZiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkLFxuICAgICAga2luZCxcbiAgICAgIHJlcXVlc3Q6IChtZXRob2QsIHBheWxvYWQsIHRpbWVvdXRNcykgPT5cbiAgICAgICAgdGhpcy5yZXF1ZXN0TW9kdWxlKHR3ZWFrSWQsIGlkLCBtZXRob2QsIHBheWxvYWQsIHRpbWVvdXRNcyksXG4gICAgICBkaXNwb3NlOiAoKSA9PiB0aGlzLmRpc3Bvc2VNb2R1bGUodHdlYWtJZCwgaWQpLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIHBhbmVsUmVmKGluc3RhbmNlOiBOYXRpdmVJbnN0YW5jZSk6IE5hdGl2ZVBhbmVsUmVmIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IGluc3RhbmNlLmlkLFxuICAgICAgd2luZG93SWQ6IGluc3RhbmNlLndpbmRvd0lkLFxuICAgICAgc2V0Qm91bmRzOiAoYm91bmRzKSA9PiB0aGlzLmludm9rZUluc3RhbmNlKGluc3RhbmNlLnR3ZWFrSWQsIGluc3RhbmNlLmlkLCBcInNldEJvdW5kc1wiLCBbYm91bmRzXSksXG4gICAgICBzaG93OiAoKSA9PiB0aGlzLmludm9rZUluc3RhbmNlKGluc3RhbmNlLnR3ZWFrSWQsIGluc3RhbmNlLmlkLCBcInNob3dcIiwgW10pLFxuICAgICAgaGlkZTogKCkgPT4gdGhpcy5pbnZva2VJbnN0YW5jZShpbnN0YW5jZS50d2Vha0lkLCBpbnN0YW5jZS5pZCwgXCJoaWRlXCIsIFtdKSxcbiAgICAgIGRpc3Bvc2U6ICgpID0+IHRoaXMuZGlzcG9zZUluc3RhbmNlQnlJZChpbnN0YW5jZS50d2Vha0lkLCBpbnN0YW5jZS5pZCksXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgdmlld1JlZihpbnN0YW5jZTogTmF0aXZlSW5zdGFuY2UpOiBOYXRpdmVWaWV3UmVmIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IGluc3RhbmNlLmlkLFxuICAgICAgc2V0Qm91bmRzOiAoYm91bmRzKSA9PiB0aGlzLmludm9rZUluc3RhbmNlKGluc3RhbmNlLnR3ZWFrSWQsIGluc3RhbmNlLmlkLCBcInNldEJvdW5kc1wiLCBbYm91bmRzXSksXG4gICAgICBzZXRWaXNpYmxlOiAodmlzaWJsZSkgPT4gdGhpcy5pbnZva2VJbnN0YW5jZShpbnN0YW5jZS50d2Vha0lkLCBpbnN0YW5jZS5pZCwgXCJzZXRWaXNpYmxlXCIsIFt2aXNpYmxlXSksXG4gICAgICBkaXNwb3NlOiAoKSA9PiB0aGlzLmRpc3Bvc2VJbnN0YW5jZUJ5SWQoaW5zdGFuY2UudHdlYWtJZCwgaW5zdGFuY2UuaWQpLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGhlbHBlclJlZih0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcsIHBpZDogbnVtYmVyKTogTmF0aXZlSGVscGVyUmVmIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQsXG4gICAgICBwaWQsXG4gICAgICBzZW5kOiAobWVzc2FnZSkgPT4gdGhpcy5zZW5kSGVscGVyKHR3ZWFrSWQsIGlkLCBtZXNzYWdlKSxcbiAgICAgIHJlcXVlc3Q6IChtZXNzYWdlLCB0aW1lb3V0TXMpID0+IHRoaXMucmVxdWVzdEhlbHBlcih0d2Vha0lkLCBpZCwgbWVzc2FnZSwgdGltZW91dE1zKSxcbiAgICAgIHN0b3A6ICgpID0+IHRoaXMuc3RvcEhlbHBlckJ5SWQodHdlYWtJZCwgaWQpLFxuICAgIH07XG4gIH1cblxuICBhc3luYyByZXF1ZXN0TW9kdWxlKFxuICAgIHR3ZWFrSWQ6IHN0cmluZyxcbiAgICBpZDogc3RyaW5nLFxuICAgIG1ldGhvZDogc3RyaW5nLFxuICAgIHBheWxvYWQ/OiB1bmtub3duLFxuICAgIF90aW1lb3V0TXM/OiBudW1iZXIsXG4gICk6IFByb21pc2U8dW5rbm93bj4ge1xuICAgIGNvbnN0IG1vZCA9IHRoaXMubW9kdWxlRm9yKHR3ZWFrSWQsIGlkKTtcbiAgICBjb25zdCB0YXJnZXQgPSBhc1JlY29yZChtb2QuZXhwb3J0cyk7XG4gICAgY29uc3QgZm4gPSB0YXJnZXQ/LnJlcXVlc3Q7XG4gICAgaWYgKHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICByZXR1cm4gYXdhaXQgZm4uY2FsbChtb2QuZXhwb3J0cywgbWV0aG9kLCBwYXlsb2FkKTtcbiAgICB9XG4gICAgY29uc3QgbWV0aG9kRm4gPSB0YXJnZXQ/LlttZXRob2RdO1xuICAgIGlmICh0eXBlb2YgbWV0aG9kRm4gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgcmV0dXJuIGF3YWl0IG1ldGhvZEZuLmNhbGwobW9kLmV4cG9ydHMsIHBheWxvYWQpO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYG5hdGl2ZSBtb2R1bGUgJHt0d2Vha0lkfToke2lkfSBoYXMgbm8gcmVxdWVzdCgpIG9yICR7bWV0aG9kfSgpYCk7XG4gIH1cblxuICBhc3luYyBkaXNwb3NlTW9kdWxlKHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGtleSA9IG1vZHVsZUtleSh0d2Vha0lkLCBpZCk7XG4gICAgY29uc3QgbW9kID0gdGhpcy5tb2R1bGVzLmdldChrZXkpO1xuICAgIGlmICghbW9kKSByZXR1cm47XG4gICAgYXdhaXQgY2FsbE9wdGlvbmFsKG1vZC5leHBvcnRzLCBcImRpc3Bvc2VcIiwgW10pO1xuICAgIHRoaXMubW9kdWxlcy5kZWxldGUoa2V5KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY3JlYXRlTmF0aXZlSW5zdGFuY2UoXG4gICAgY3R4OiBOYXRpdmVUd2Vha0NvbnRleHQsXG4gICAga2luZDogXCJwYW5lbFwiIHwgXCJ2aWV3XCIsXG4gICAgbW9kdWxlSWQ6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICBmYWN0b3J5OiBzdHJpbmcsXG4gICAgb3B0aW9uczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gICk6IFByb21pc2U8TmF0aXZlSW5zdGFuY2U+IHtcbiAgICBjb25zdCB0YXJnZXQgPSBtb2R1bGVJZCA/IHRoaXMubW9kdWxlRm9yKGN0eC5pZCwgbW9kdWxlSWQpLmV4cG9ydHMgOiB0aGlzLmxvYWROYXRpdmVIb3N0KHRydWUpO1xuICAgIGNvbnN0IGZuID0gYXNSZWNvcmQodGFyZ2V0KT8uW2ZhY3RvcnldO1xuICAgIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgY29uc3QgbGFiZWwgPSBtb2R1bGVJZCA/IGBuYXRpdmUgbW9kdWxlICR7Y3R4LmlkfToke21vZHVsZUlkfWAgOiBcIkNvZGV4KysgbmF0aXZlIGhvc3RcIjtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgJHtsYWJlbH0gaGFzIG5vIGZhY3RvcnkgJHtmYWN0b3J5fSgpYCk7XG4gICAgfVxuXG4gICAgY29uc3QgcGFyZW50V2luZG93ID0gdHlwZW9mIG9wdGlvbnMucGFyZW50V2luZG93SWQgPT09IFwibnVtYmVyXCJcbiAgICAgID8gQnJvd3NlcldpbmRvdy5mcm9tSWQob3B0aW9ucy5wYXJlbnRXaW5kb3dJZClcbiAgICAgIDogQnJvd3NlcldpbmRvdy5nZXRGb2N1c2VkV2luZG93KCk7XG4gICAgY29uc3QgcGFyZW50TmF0aXZlSGFuZGxlID0gbmF0aXZlSGFuZGxlRm9yV2luZG93KHBhcmVudFdpbmRvdyk7XG4gICAgY29uc3QgdmFsdWUgPSBhd2FpdCBmbi5jYWxsKHRhcmdldCwge1xuICAgICAgLi4ub3B0aW9ucyxcbiAgICAgIHBhcmVudFdpbmRvd0lkOiB3aW5kb3dJZEZvcihwYXJlbnRXaW5kb3cpLFxuICAgICAgcGFyZW50V2ViQ29udGVudHNJZDogd2ViQ29udGVudHNJZEZvcihwYXJlbnRXaW5kb3cpLFxuICAgICAgcGFyZW50TmF0aXZlSGFuZGxlLFxuICAgIH0pO1xuICAgIGNvbnN0IGlkID0gdHlwZW9mIGFzUmVjb3JkKHZhbHVlKT8uaWQgPT09IFwic3RyaW5nXCIgPyBTdHJpbmcoYXNSZWNvcmQodmFsdWUpPy5pZCkgOiByYW5kb21VVUlEKCk7XG4gICAgY29uc3Qgd2luZG93SWQgPSB0eXBlb2YgYXNSZWNvcmQodmFsdWUpPy53aW5kb3dJZCA9PT0gXCJudW1iZXJcIiA/IE51bWJlcihhc1JlY29yZCh2YWx1ZSk/LndpbmRvd0lkKSA6IG51bGw7XG4gICAgY29uc3QgaW5zdGFuY2U6IE5hdGl2ZUluc3RhbmNlID0ge1xuICAgICAga2V5OiBpbnN0YW5jZUtleShjdHguaWQsIGlkKSxcbiAgICAgIHR3ZWFrSWQ6IGN0eC5pZCxcbiAgICAgIGlkLFxuICAgICAga2luZCxcbiAgICAgIHZhbHVlLFxuICAgICAgcGFyZW50V2luZG93SWQ6IHdpbmRvd0lkRm9yKHBhcmVudFdpbmRvdyksXG4gICAgICB3aW5kb3dJZCxcbiAgICAgIGRpc3Bvc2VCaW5kaW5nczogW10sXG4gICAgICBkaXNwb3Npbmc6IGZhbHNlLFxuICAgIH07XG4gICAgdGhpcy5pbnN0YW5jZXMuc2V0KGluc3RhbmNlLmtleSwgaW5zdGFuY2UpO1xuICAgIGlmIChjYW5CaW5kUGFyZW50V2luZG93KHBhcmVudFdpbmRvdykpIHtcbiAgICAgIHRoaXMuYmluZEluc3RhbmNlVG9QYXJlbnQoaW5zdGFuY2UsIHBhcmVudFdpbmRvdyk7XG4gICAgICB0aGlzLnN5bmNQYXJlbnRTdGF0ZShpbnN0YW5jZSwgcGFyZW50V2luZG93LCBcImNyZWF0ZWRcIik7XG4gICAgfVxuICAgIHRoaXMubG9nKFwiaW5mb1wiLCBgY3JlYXRlZCBuYXRpdmUgJHtraW5kfSAke2N0eC5pZH06JHtpZH1gLCB7XG4gICAgICBtb2R1bGVJZDogbW9kdWxlSWQgPz8gXCJjb2RleHBwLm5hdGl2ZS1ob3N0XCIsXG4gICAgICBmYWN0b3J5LFxuICAgICAgd2luZG93SWQsXG4gICAgfSk7XG4gICAgcmV0dXJuIGluc3RhbmNlO1xuICB9XG5cbiAgcHJpdmF0ZSBsb2FkTmF0aXZlSG9zdChyZXF1aXJlZDogdHJ1ZSk6IHVua25vd247XG4gIHByaXZhdGUgbG9hZE5hdGl2ZUhvc3QocmVxdWlyZWQ6IGZhbHNlKTogdW5rbm93biB8IG51bGw7XG4gIHByaXZhdGUgbG9hZE5hdGl2ZUhvc3QocmVxdWlyZWQ6IGJvb2xlYW4pOiB1bmtub3duIHwgbnVsbCB7XG4gICAgaWYgKHRoaXMubmF0aXZlSG9zdEV4cG9ydHMpIHJldHVybiB0aGlzLm5hdGl2ZUhvc3RFeHBvcnRzO1xuICAgIGlmICh0aGlzLm5hdGl2ZUhvc3RMb2FkRXJyb3IgJiYgIXJlcXVpcmVkKSByZXR1cm4gbnVsbDtcbiAgICBjb25zdCBuYXRpdmVIb3N0UGF0aCA9IHRoaXMub3B0aW9ucy5uYXRpdmVIb3N0UGF0aDtcbiAgICBpZiAoIW5hdGl2ZUhvc3RQYXRoIHx8ICFleGlzdHNTeW5jKG5hdGl2ZUhvc3RQYXRoKSkge1xuICAgICAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoXCJDb2RleCsrIG5hdGl2ZSBob3N0IGlzIG5vdCBpbnN0YWxsZWRcIik7XG4gICAgICB0aGlzLm5hdGl2ZUhvc3RMb2FkRXJyb3IgPSBlcnJvcjtcbiAgICAgIGlmIChyZXF1aXJlZCkgdGhyb3cgZXJyb3I7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMubmF0aXZlSG9zdEV4cG9ydHMgPSByZXF1aXJlKG5hdGl2ZUhvc3RQYXRoKSBhcyB1bmtub3duO1xuICAgICAgdGhpcy5uYXRpdmVIb3N0TG9hZEVycm9yID0gbnVsbDtcbiAgICAgIHRoaXMubG9nKFwiaW5mb1wiLCBcImxvYWRlZCBDb2RleCsrIG5hdGl2ZSBob3N0XCIsIHsgcGF0aDogbmF0aXZlSG9zdFBhdGggfSk7XG4gICAgICByZXR1cm4gdGhpcy5uYXRpdmVIb3N0RXhwb3J0cztcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5uYXRpdmVIb3N0TG9hZEVycm9yID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yIDogbmV3IEVycm9yKFN0cmluZyhlcnJvcikpO1xuICAgICAgdGhpcy5sb2coXCJlcnJvclwiLCBcImZhaWxlZCB0byBsb2FkIENvZGV4KysgbmF0aXZlIGhvc3RcIiwgdGhpcy5uYXRpdmVIb3N0TG9hZEVycm9yKTtcbiAgICAgIGlmIChyZXF1aXJlZCkgdGhyb3cgdGhpcy5uYXRpdmVIb3N0TG9hZEVycm9yO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZWFkTmF0aXZlSG9zdENhcGFiaWxpdGllcyhob3N0OiB1bmtub3duKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4ge1xuICAgIGNvbnN0IGdldENhcGFiaWxpdGllcyA9IGFzUmVjb3JkKGhvc3QpPy5nZXRDYXBhYmlsaXRpZXM7XG4gICAgaWYgKHR5cGVvZiBnZXRDYXBhYmlsaXRpZXMgIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHt9O1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBjYXBhYmlsaXRpZXMgPSBnZXRDYXBhYmlsaXRpZXMuY2FsbChob3N0KTtcbiAgICAgIHJldHVybiBhc1JlY29yZChjYXBhYmlsaXRpZXMpID8/IHt9O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZyhcIndhcm5cIiwgXCJDb2RleCsrIG5hdGl2ZSBob3N0IGNhcGFiaWxpdHkgcHJvYmUgZmFpbGVkXCIsIGVycm9yKTtcbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGludm9rZUluc3RhbmNlKFxuICAgIHR3ZWFrSWQ6IHN0cmluZyxcbiAgICBpZDogc3RyaW5nLFxuICAgIG1ldGhvZDogc3RyaW5nLFxuICAgIGFyZ3M6IHVua25vd25bXSxcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlRm9yKHR3ZWFrSWQsIGlkKTtcbiAgICBjb25zdCBmbiA9IGFzUmVjb3JkKGluc3RhbmNlLnZhbHVlKT8uW21ldGhvZF07XG4gICAgaWYgKHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBhd2FpdCBmbi5hcHBseShpbnN0YW5jZS52YWx1ZSwgYXJncyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChpbnN0YW5jZS53aW5kb3dJZCAhPT0gbnVsbCkge1xuICAgICAgY29uc3Qgd2luID0gQnJvd3NlcldpbmRvdy5mcm9tSWQoaW5zdGFuY2Uud2luZG93SWQpO1xuICAgICAgaWYgKHdpbiAmJiAhd2luLmlzRGVzdHJveWVkKCkpIHtcbiAgICAgICAgaWYgKG1ldGhvZCA9PT0gXCJzZXRCb3VuZHNcIikgd2luLnNldEJvdW5kcyhhcmdzWzBdIGFzIEVsZWN0cm9uLlJlY3RhbmdsZSk7XG4gICAgICAgIGVsc2UgaWYgKG1ldGhvZCA9PT0gXCJzaG93XCIpIHdpbi5zaG93KCk7XG4gICAgICAgIGVsc2UgaWYgKG1ldGhvZCA9PT0gXCJoaWRlXCIpIHdpbi5oaWRlKCk7XG4gICAgICAgIGVsc2UgaWYgKG1ldGhvZCA9PT0gXCJzZXRWaXNpYmxlXCIpIChhcmdzWzBdID8gd2luLnNob3coKSA6IHdpbi5oaWRlKCkpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgbmF0aXZlICR7aW5zdGFuY2Uua2luZH0gJHt0d2Vha0lkfToke2lkfSBkb2VzIG5vdCBpbXBsZW1lbnQgJHttZXRob2R9KClgKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZGlzcG9zZUluc3RhbmNlQnlJZCh0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBrZXkgPSBpbnN0YW5jZUtleSh0d2Vha0lkLCBpZCk7XG4gICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoa2V5KTtcbiAgICBpZiAoIWluc3RhbmNlKSByZXR1cm47XG4gICAgYXdhaXQgdGhpcy5kaXNwb3NlSW5zdGFuY2UoaW5zdGFuY2UpO1xuICAgIHRoaXMuaW5zdGFuY2VzLmRlbGV0ZShrZXkpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBkaXNwb3NlSW5zdGFuY2UoaW5zdGFuY2U6IE5hdGl2ZUluc3RhbmNlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKGluc3RhbmNlLmRpc3Bvc2luZykgcmV0dXJuO1xuICAgIGluc3RhbmNlLmRpc3Bvc2luZyA9IHRydWU7XG4gICAgZm9yIChjb25zdCBkaXNwb3NlIG9mIGluc3RhbmNlLmRpc3Bvc2VCaW5kaW5ncy5zcGxpY2UoMCkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGRpc3Bvc2UoKTtcbiAgICAgIH0gY2F0Y2gge31cbiAgICB9XG4gICAgYXdhaXQgY2FsbE9wdGlvbmFsKGluc3RhbmNlLnZhbHVlLCBcImRpc3Bvc2VcIiwgW10pO1xuICAgIGlmIChpbnN0YW5jZS53aW5kb3dJZCAhPT0gbnVsbCkge1xuICAgICAgY29uc3Qgd2luID0gQnJvd3NlcldpbmRvdy5mcm9tSWQoaW5zdGFuY2Uud2luZG93SWQpO1xuICAgICAgaWYgKHdpbiAmJiAhd2luLmlzRGVzdHJveWVkKCkpIHdpbi5jbG9zZSgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYmluZEluc3RhbmNlVG9QYXJlbnQoaW5zdGFuY2U6IE5hdGl2ZUluc3RhbmNlLCBwYXJlbnRXaW5kb3c6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cpOiB2b2lkIHtcbiAgICBjb25zdCBvbiA9IChldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCkgPT4ge1xuICAgICAgcGFyZW50V2luZG93Lm9uKGV2ZW50IGFzIG5ldmVyLCBsaXN0ZW5lciBhcyBuZXZlcik7XG4gICAgICBpbnN0YW5jZS5kaXNwb3NlQmluZGluZ3MucHVzaCgoKSA9PiBwYXJlbnRXaW5kb3cub2ZmKGV2ZW50IGFzIG5ldmVyLCBsaXN0ZW5lciBhcyBuZXZlcikpO1xuICAgIH07XG4gICAgY29uc3Qgc3luY0JvdW5kcyA9ICgpID0+IHRoaXMuc3luY1BhcmVudFN0YXRlKGluc3RhbmNlLCBwYXJlbnRXaW5kb3csIFwiYm91bmRzXCIpO1xuICAgIGNvbnN0IHN5bmNGb2N1cyA9IChmb2N1c2VkOiBib29sZWFuKSA9PiB0aGlzLnNpZ25hbFBhcmVudFN0YXRlKGluc3RhbmNlLCBwYXJlbnRXaW5kb3csIFwiZm9jdXNcIiwgeyBmb2N1c2VkIH0pO1xuICAgIGNvbnN0IHN5bmNWaXNpYmlsaXR5ID0gKHZpc2libGU6IGJvb2xlYW4pID0+XG4gICAgICB0aGlzLnNpZ25hbFBhcmVudFN0YXRlKGluc3RhbmNlLCBwYXJlbnRXaW5kb3csIFwidmlzaWJpbGl0eVwiLCB7IHZpc2libGUgfSk7XG4gICAgY29uc3QgZGlzcG9zZVdpdGhQYXJlbnQgPSAoKSA9PiB7XG4gICAgICB0aGlzLmxvZyhcImluZm9cIiwgYGRpc3Bvc2luZyBuYXRpdmUgJHtpbnN0YW5jZS5raW5kfSAke2luc3RhbmNlLnR3ZWFrSWR9OiR7aW5zdGFuY2UuaWR9OyBwYXJlbnQgY2xvc2VkYCk7XG4gICAgICB2b2lkIHRoaXMuZGlzcG9zZUluc3RhbmNlQnlJZChpbnN0YW5jZS50d2Vha0lkLCBpbnN0YW5jZS5pZCk7XG4gICAgfTtcblxuICAgIG9uKFwibW92ZVwiLCBzeW5jQm91bmRzKTtcbiAgICBvbihcInJlc2l6ZVwiLCBzeW5jQm91bmRzKTtcbiAgICBvbihcImVudGVyLWZ1bGwtc2NyZWVuXCIsIHN5bmNCb3VuZHMpO1xuICAgIG9uKFwibGVhdmUtZnVsbC1zY3JlZW5cIiwgc3luY0JvdW5kcyk7XG4gICAgb24oXCJtYXhpbWl6ZVwiLCBzeW5jQm91bmRzKTtcbiAgICBvbihcInVubWF4aW1pemVcIiwgc3luY0JvdW5kcyk7XG4gICAgb24oXCJtaW5pbWl6ZVwiLCBzeW5jQm91bmRzKTtcbiAgICBvbihcInJlc3RvcmVcIiwgc3luY0JvdW5kcyk7XG4gICAgb24oXCJzaG93XCIsICgpID0+IHN5bmNWaXNpYmlsaXR5KHRydWUpKTtcbiAgICBvbihcImhpZGVcIiwgKCkgPT4gc3luY1Zpc2liaWxpdHkoZmFsc2UpKTtcbiAgICBvbihcImZvY3VzXCIsICgpID0+IHN5bmNGb2N1cyh0cnVlKSk7XG4gICAgb24oXCJibHVyXCIsICgpID0+IHN5bmNGb2N1cyhmYWxzZSkpO1xuICAgIG9uKFwiY2xvc2VcIiwgZGlzcG9zZVdpdGhQYXJlbnQpO1xuICAgIG9uKFwiY2xvc2VkXCIsIGRpc3Bvc2VXaXRoUGFyZW50KTtcbiAgfVxuXG4gIHByaXZhdGUgc3luY1BhcmVudFN0YXRlKFxuICAgIGluc3RhbmNlOiBOYXRpdmVJbnN0YW5jZSxcbiAgICBwYXJlbnRXaW5kb3c6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3csXG4gICAgcmVhc29uOiBzdHJpbmcsXG4gICk6IHZvaWQge1xuICAgIGNvbnN0IHN0YXRlID0gcGFyZW50V2luZG93U3RhdGUocGFyZW50V2luZG93LCByZWFzb24pO1xuICAgIGlmICghc3RhdGUpIHJldHVybjtcbiAgICB2b2lkIHRoaXMuY2FsbEZpcnN0T3B0aW9uYWxJbnN0YW5jZShpbnN0YW5jZSwgW1wic3luY1BhcmVudFwiLCBcInBhcmVudENoYW5nZWRcIl0sIFtzdGF0ZV0pXG4gICAgICAudGhlbigoaGFuZGxlZCkgPT4ge1xuICAgICAgICBpZiAoIWhhbmRsZWQpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsRmlyc3RPcHRpb25hbEluc3RhbmNlKFxuICAgICAgICAgICAgaW5zdGFuY2UsXG4gICAgICAgICAgICBbXCJzZXRQYXJlbnRCb3VuZHNcIiwgXCJwYXJlbnRCb3VuZHNDaGFuZ2VkXCJdLFxuICAgICAgICAgICAgW3N0YXRlLmJvdW5kcywgc3RhdGVdLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHRoaXMubG9nKFwid2FyblwiLCBgbmF0aXZlICR7aW5zdGFuY2Uua2luZH0gcGFyZW50IHN5bmMgZmFpbGVkYCwgZXJyb3IpKTtcbiAgfVxuXG4gIHByaXZhdGUgc2lnbmFsUGFyZW50U3RhdGUoXG4gICAgaW5zdGFuY2U6IE5hdGl2ZUluc3RhbmNlLFxuICAgIHBhcmVudFdpbmRvdzogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyxcbiAgICByZWFzb246IHN0cmluZyxcbiAgICBwYXRjaDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gICk6IHZvaWQge1xuICAgIGNvbnN0IHN0YXRlID0gcGFyZW50V2luZG93U3RhdGUocGFyZW50V2luZG93LCByZWFzb24pO1xuICAgIGlmICghc3RhdGUpIHJldHVybjtcbiAgICBjb25zdCBwYXlsb2FkID0geyAuLi5zdGF0ZSwgLi4ucGF0Y2ggfTtcbiAgICB2b2lkIHRoaXMuY2FsbEZpcnN0T3B0aW9uYWxJbnN0YW5jZShpbnN0YW5jZSwgW1wicGFyZW50U3RhdGVDaGFuZ2VkXCIsIFwicGFyZW50Q2hhbmdlZFwiXSwgW3BheWxvYWRdKVxuICAgICAgLmNhdGNoKChlcnJvcikgPT4gdGhpcy5sb2coXCJ3YXJuXCIsIGBuYXRpdmUgJHtpbnN0YW5jZS5raW5kfSBwYXJlbnQgc2lnbmFsIGZhaWxlZGAsIGVycm9yKSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGNhbGxGaXJzdE9wdGlvbmFsSW5zdGFuY2UoXG4gICAgaW5zdGFuY2U6IE5hdGl2ZUluc3RhbmNlLFxuICAgIG1ldGhvZHM6IHN0cmluZ1tdLFxuICAgIGFyZ3M6IHVua25vd25bXSxcbiAgKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gYXNSZWNvcmQoaW5zdGFuY2UudmFsdWUpO1xuICAgIGZvciAoY29uc3QgbWV0aG9kIG9mIG1ldGhvZHMpIHtcbiAgICAgIGNvbnN0IGZuID0gdGFyZ2V0Py5bbWV0aG9kXTtcbiAgICAgIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikgY29udGludWU7XG4gICAgICBhd2FpdCBmbi5hcHBseShpbnN0YW5jZS52YWx1ZSwgYXJncyk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBzZW5kSGVscGVyKHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZywgbWVzc2FnZTogdW5rbm93bik6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGhlbHBlciA9IHRoaXMuaGVscGVyRm9yKHR3ZWFrSWQsIGlkKTtcbiAgICBoZWxwZXIuY2hpbGQuc3RkaW4ud3JpdGUoYCR7SlNPTi5zdHJpbmdpZnkobWVzc2FnZSl9XFxuYCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlcXVlc3RIZWxwZXIoXG4gICAgdHdlYWtJZDogc3RyaW5nLFxuICAgIGlkOiBzdHJpbmcsXG4gICAgbWVzc2FnZTogdW5rbm93bixcbiAgICB0aW1lb3V0TXMgPSAxMF8wMDAsXG4gICk6IFByb21pc2U8dW5rbm93bj4ge1xuICAgIGNvbnN0IGhlbHBlciA9IHRoaXMuaGVscGVyRm9yKHR3ZWFrSWQsIGlkKTtcbiAgICBjb25zdCByZXF1ZXN0SWQgPSByYW5kb21VVUlEKCk7XG4gICAgY29uc3QgcGF5bG9hZCA9IHsgaWQ6IHJlcXVlc3RJZCwgbWVzc2FnZSB9O1xuICAgIHJldHVybiBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBoZWxwZXIucGVuZGluZy5kZWxldGUocmVxdWVzdElkKTtcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgbmF0aXZlIGhlbHBlciByZXF1ZXN0IHRpbWVkIG91dDogJHt0d2Vha0lkfToke2lkfWApKTtcbiAgICAgIH0sIHRpbWVvdXRNcyk7XG4gICAgICBoZWxwZXIucGVuZGluZy5zZXQocmVxdWVzdElkLCB7IHJlc29sdmUsIHJlamVjdCwgdGltZXIgfSk7XG4gICAgICBoZWxwZXIuY2hpbGQuc3RkaW4ud3JpdGUoYCR7SlNPTi5zdHJpbmdpZnkocGF5bG9hZCl9XFxuYCk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHN0b3BIZWxwZXJCeUlkKHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGtleSA9IGhlbHBlcktleSh0d2Vha0lkLCBpZCk7XG4gICAgY29uc3QgaGVscGVyID0gdGhpcy5oZWxwZXJzLmdldChrZXkpO1xuICAgIGlmICghaGVscGVyKSByZXR1cm47XG4gICAgdGhpcy5zdG9wSGVscGVyKGhlbHBlcik7XG4gICAgdGhpcy5oZWxwZXJzLmRlbGV0ZShrZXkpO1xuICB9XG5cbiAgcHJpdmF0ZSBzdG9wSGVscGVyKGhlbHBlcjogTmF0aXZlSGVscGVyUHJvY2Vzcyk6IHZvaWQge1xuICAgIGlmIChoZWxwZXIuY2hpbGQua2lsbGVkKSByZXR1cm47XG4gICAgaGVscGVyLmNoaWxkLmtpbGwoKTtcbiAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgaWYgKCFoZWxwZXIuY2hpbGQua2lsbGVkKSBoZWxwZXIuY2hpbGQua2lsbChcIlNJR0tJTExcIik7XG4gICAgfSwgMTUwMCk7XG4gICAgdGltZXIudW5yZWY/LigpO1xuICB9XG5cbiAgcHJpdmF0ZSBoYW5kbGVIZWxwZXJMaW5lKGhlbHBlcjogTmF0aXZlSGVscGVyUHJvY2VzcywgbGluZTogc3RyaW5nKTogdm9pZCB7XG4gICAgbGV0IHBheWxvYWQ6IHsgaWQ/OiB1bmtub3duOyByZXN1bHQ/OiB1bmtub3duOyBlcnJvcj86IHVua25vd24gfTtcbiAgICB0cnkge1xuICAgICAgcGF5bG9hZCA9IEpTT04ucGFyc2UobGluZSkgYXMgdHlwZW9mIHBheWxvYWQ7XG4gICAgfSBjYXRjaCB7XG4gICAgICB0aGlzLmxvZyhcImluZm9cIiwgYG5hdGl2ZSBoZWxwZXIgJHtoZWxwZXIudHdlYWtJZH06JHtoZWxwZXIuaWR9YCwgbGluZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0eXBlb2YgcGF5bG9hZC5pZCAhPT0gXCJzdHJpbmdcIikgcmV0dXJuO1xuICAgIGNvbnN0IHJlcXVlc3QgPSBoZWxwZXIucGVuZGluZy5nZXQocGF5bG9hZC5pZCk7XG4gICAgaWYgKCFyZXF1ZXN0KSByZXR1cm47XG4gICAgaGVscGVyLnBlbmRpbmcuZGVsZXRlKHBheWxvYWQuaWQpO1xuICAgIGNsZWFyVGltZW91dChyZXF1ZXN0LnRpbWVyKTtcbiAgICBpZiAocGF5bG9hZC5lcnJvcikge1xuICAgICAgcmVxdWVzdC5yZWplY3QobmV3IEVycm9yKFN0cmluZyhwYXlsb2FkLmVycm9yKSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXF1ZXN0LnJlc29sdmUocGF5bG9hZC5yZXN1bHQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgbW9kdWxlRm9yKHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZyk6IExvYWRlZE5hdGl2ZU1vZHVsZSB7XG4gICAgY29uc3QgbW9kID0gdGhpcy5tb2R1bGVzLmdldChtb2R1bGVLZXkodHdlYWtJZCwgaWQpKTtcbiAgICBpZiAoIW1vZCkgdGhyb3cgbmV3IEVycm9yKGBuYXRpdmUgbW9kdWxlIGlzIG5vdCBsb2FkZWQ6ICR7dHdlYWtJZH06JHtpZH1gKTtcbiAgICByZXR1cm4gbW9kO1xuICB9XG5cbiAgcHJpdmF0ZSBpbnN0YW5jZUZvcih0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiBOYXRpdmVJbnN0YW5jZSB7XG4gICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoaW5zdGFuY2VLZXkodHdlYWtJZCwgaWQpKTtcbiAgICBpZiAoIWluc3RhbmNlKSB0aHJvdyBuZXcgRXJyb3IoYG5hdGl2ZSBpbnN0YW5jZSBpcyBub3QgbG9hZGVkOiAke3R3ZWFrSWR9OiR7aWR9YCk7XG4gICAgcmV0dXJuIGluc3RhbmNlO1xuICB9XG5cbiAgcHJpdmF0ZSBoZWxwZXJGb3IodHdlYWtJZDogc3RyaW5nLCBpZDogc3RyaW5nKTogTmF0aXZlSGVscGVyUHJvY2VzcyB7XG4gICAgY29uc3QgaGVscGVyID0gdGhpcy5oZWxwZXJzLmdldChoZWxwZXJLZXkodHdlYWtJZCwgaWQpKTtcbiAgICBpZiAoIWhlbHBlcikgdGhyb3cgbmV3IEVycm9yKGBuYXRpdmUgaGVscGVyIGlzIG5vdCBydW5uaW5nOiAke3R3ZWFrSWR9OiR7aWR9YCk7XG4gICAgcmV0dXJuIGhlbHBlcjtcbiAgfVxufVxuXG5mdW5jdGlvbiByZXNvbHZlVHdlYWtQYXRoKGN0eDogTmF0aXZlVHdlYWtDb250ZXh0LCBwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcmVzb2x2ZU5hdGl2ZVR3ZWFrUGF0aChjdHguZGlyLCBwYXRoKTtcbn1cblxuZnVuY3Rpb24gaW5mZXJNb2R1bGVLaW5kKHBhdGg6IHN0cmluZyk6IE5hdGl2ZU1vZHVsZUtpbmQge1xuICBpZiAocGF0aC5lbmRzV2l0aChcIi5ub2RlXCIpKSByZXR1cm4gXCJub2RlLWFkZG9uXCI7XG4gIGlmIChwYXRoLmVuZHNXaXRoKFwiLmR5bGliXCIpKSByZXR1cm4gXCJkeWxpYlwiO1xuICBpZiAocGF0aC5lbmRzV2l0aChcIi5mcmFtZXdvcmtcIikpIHJldHVybiBcImZyYW1ld29ya1wiO1xuICB0aHJvdyBuZXcgRXJyb3IoXCJuYXRpdmUgbW9kdWxlIHBhdGggbXVzdCBlbmQgaW4gLm5vZGUsIC5keWxpYiwgb3IgLmZyYW1ld29ya1wiKTtcbn1cblxuZnVuY3Rpb24gc2VsZWN0RW50cnlwb2ludChsb2FkZWQ6IHVua25vd24sIGVudHJ5cG9pbnQ6IHN0cmluZyB8IHVuZGVmaW5lZCk6IHVua25vd24ge1xuICBpZiAoIWVudHJ5cG9pbnQpIHJldHVybiBhc1JlY29yZChsb2FkZWQpPy5kZWZhdWx0ID8/IGxvYWRlZDtcbiAgY29uc3Qgc2VsZWN0ZWQgPSBhc1JlY29yZChsb2FkZWQpPy5bZW50cnlwb2ludF07XG4gIGlmIChzZWxlY3RlZCA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoYG5hdGl2ZSBtb2R1bGUgZW50cnlwb2ludCBub3QgZm91bmQ6ICR7ZW50cnlwb2ludH1gKTtcbiAgcmV0dXJuIHNlbGVjdGVkO1xufVxuXG5mdW5jdGlvbiBhc3NlcnRCcmlkZ2VJZCh2YWx1ZTogc3RyaW5nLCBsYWJlbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIiB8fCAhL15bYS16QS1aMC05Ll8tXSskLy50ZXN0KHZhbHVlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgJHtsYWJlbH0gbWF5IG9ubHkgY29udGFpbiBsZXR0ZXJzLCBudW1iZXJzLCBkb3RzLCB1bmRlcnNjb3JlcywgYW5kIGRhc2hlc2ApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gbW9kdWxlS2V5KHR3ZWFrSWQ6IHN0cmluZywgbW9kdWxlSWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgJHt0d2Vha0lkfToke21vZHVsZUlkfWA7XG59XG5cbmZ1bmN0aW9uIGluc3RhbmNlS2V5KHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgJHt0d2Vha0lkfToke2lkfWA7XG59XG5cbmZ1bmN0aW9uIGhlbHBlcktleSh0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7dHdlYWtJZH06JHtpZH1gO1xufVxuXG5mdW5jdGlvbiBhc1JlY29yZCh2YWx1ZTogdW5rbm93bik6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbCB7XG4gIHJldHVybiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgPyB2YWx1ZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA6IG51bGw7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNhbGxPcHRpb25hbCh0YXJnZXQ6IHVua25vd24sIG1ldGhvZDogc3RyaW5nLCBhcmdzOiB1bmtub3duW10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgZm4gPSBhc1JlY29yZCh0YXJnZXQpPy5bbWV0aG9kXTtcbiAgaWYgKHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiKSBhd2FpdCBmbi5hcHBseSh0YXJnZXQsIGFyZ3MpO1xufVxuXG5mdW5jdGlvbiBwYXJlbnRXaW5kb3dTdGF0ZShwYXJlbnRXaW5kb3c6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3csIHJlYXNvbjogc3RyaW5nKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsIHtcbiAgaWYgKGlzV2luZG93RGVzdHJveWVkKHBhcmVudFdpbmRvdykpIHJldHVybiBudWxsO1xuICBjb25zdCBib3VuZHMgPSBjYWxsV2luZG93TWV0aG9kPEVsZWN0cm9uLlJlY3RhbmdsZT4ocGFyZW50V2luZG93LCBcImdldEJvdW5kc1wiKTtcbiAgY29uc3QgY29udGVudEJvdW5kcyA9IGNhbGxXaW5kb3dNZXRob2Q8RWxlY3Ryb24uUmVjdGFuZ2xlPihwYXJlbnRXaW5kb3csIFwiZ2V0Q29udGVudEJvdW5kc1wiKTtcbiAgcmV0dXJuIHtcbiAgICByZWFzb24sXG4gICAgd2luZG93SWQ6IHdpbmRvd0lkRm9yKHBhcmVudFdpbmRvdyksXG4gICAgd2ViQ29udGVudHNJZDogd2ViQ29udGVudHNJZEZvcihwYXJlbnRXaW5kb3cpLFxuICAgIGJvdW5kcyxcbiAgICBjb250ZW50Qm91bmRzLFxuICAgIHZpc2libGU6IGNhbGxXaW5kb3dNZXRob2Q8Ym9vbGVhbj4ocGFyZW50V2luZG93LCBcImlzVmlzaWJsZVwiKSA/PyBudWxsLFxuICAgIGZvY3VzZWQ6IGNhbGxXaW5kb3dNZXRob2Q8Ym9vbGVhbj4ocGFyZW50V2luZG93LCBcImlzRm9jdXNlZFwiKSA/PyBudWxsLFxuICAgIG1pbmltaXplZDogY2FsbFdpbmRvd01ldGhvZDxib29sZWFuPihwYXJlbnRXaW5kb3csIFwiaXNNaW5pbWl6ZWRcIikgPz8gbnVsbCxcbiAgICBtYXhpbWl6ZWQ6IGNhbGxXaW5kb3dNZXRob2Q8Ym9vbGVhbj4ocGFyZW50V2luZG93LCBcImlzTWF4aW1pemVkXCIpID8/IG51bGwsXG4gICAgZnVsbHNjcmVlbjogY2FsbFdpbmRvd01ldGhvZDxib29sZWFuPihwYXJlbnRXaW5kb3csIFwiaXNGdWxsU2NyZWVuXCIpID8/IG51bGwsXG4gIH07XG59XG5cbmZ1bmN0aW9uIG5hdGl2ZUhhbmRsZUZvcldpbmRvdyhwYXJlbnRXaW5kb3c6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsIHwgdW5kZWZpbmVkKTogQnVmZmVyIHwgbnVsbCB7XG4gIGlmICghcGFyZW50V2luZG93IHx8IGlzV2luZG93RGVzdHJveWVkKHBhcmVudFdpbmRvdykpIHJldHVybiBudWxsO1xuICBjb25zdCBmbiA9IGFzUmVjb3JkKHBhcmVudFdpbmRvdyk/LmdldE5hdGl2ZVdpbmRvd0hhbmRsZTtcbiAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm4gbnVsbDtcbiAgdHJ5IHtcbiAgICBjb25zdCBoYW5kbGUgPSBmbi5jYWxsKHBhcmVudFdpbmRvdyk7XG4gICAgcmV0dXJuIEJ1ZmZlci5pc0J1ZmZlcihoYW5kbGUpID8gaGFuZGxlIDogbnVsbDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gY2FuQmluZFBhcmVudFdpbmRvdyhcbiAgcGFyZW50V2luZG93OiBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbCB8IHVuZGVmaW5lZCxcbik6IHBhcmVudFdpbmRvdyBpcyBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHtcbiAgaWYgKCFwYXJlbnRXaW5kb3cgfHwgaXNXaW5kb3dEZXN0cm95ZWQocGFyZW50V2luZG93KSkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gdHlwZW9mIGFzUmVjb3JkKHBhcmVudFdpbmRvdyk/Lm9uID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICB0eXBlb2YgYXNSZWNvcmQocGFyZW50V2luZG93KT8ub2ZmID09PSBcImZ1bmN0aW9uXCI7XG59XG5cbmZ1bmN0aW9uIGlzV2luZG93RGVzdHJveWVkKHBhcmVudFdpbmRvdzogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGwgfCB1bmRlZmluZWQpOiBib29sZWFuIHtcbiAgY29uc3QgZm4gPSBhc1JlY29yZChwYXJlbnRXaW5kb3cpPy5pc0Rlc3Ryb3llZDtcbiAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm4gZmFsc2U7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEJvb2xlYW4oZm4uY2FsbChwYXJlbnRXaW5kb3cpKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cblxuZnVuY3Rpb24gd2luZG93SWRGb3IocGFyZW50V2luZG93OiBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbCB8IHVuZGVmaW5lZCk6IG51bWJlciB8IG51bGwge1xuICBjb25zdCBpZCA9IGFzUmVjb3JkKHBhcmVudFdpbmRvdyk/LmlkO1xuICByZXR1cm4gdHlwZW9mIGlkID09PSBcIm51bWJlclwiID8gaWQgOiBudWxsO1xufVxuXG5mdW5jdGlvbiB3ZWJDb250ZW50c0lkRm9yKHBhcmVudFdpbmRvdzogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGwgfCB1bmRlZmluZWQpOiBudW1iZXIgfCBudWxsIHtcbiAgY29uc3Qgd2ViQ29udGVudHMgPSBhc1JlY29yZChhc1JlY29yZChwYXJlbnRXaW5kb3cpPy53ZWJDb250ZW50cyk7XG4gIGNvbnN0IGlkID0gd2ViQ29udGVudHM/LmlkO1xuICByZXR1cm4gdHlwZW9mIGlkID09PSBcIm51bWJlclwiID8gaWQgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBjYWxsV2luZG93TWV0aG9kPFQ+KHBhcmVudFdpbmRvdzogRWxlY3Ryb24uQnJvd3NlcldpbmRvdywgbWV0aG9kOiBzdHJpbmcpOiBUIHwgbnVsbCB7XG4gIGNvbnN0IGZuID0gYXNSZWNvcmQocGFyZW50V2luZG93KT8uW21ldGhvZF07XG4gIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIG51bGw7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGZuLmNhbGwocGFyZW50V2luZG93KSBhcyBUO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuIiwgImltcG9ydCB7IHJhbmRvbUJ5dGVzIH0gZnJvbSBcIm5vZGU6Y3J5cHRvXCI7XG5cbmV4cG9ydCBjb25zdCBTRVNTSU9OX0lEX1JFID0gL15zZXNzaW9uX1thLWYwLTldezI0fSQvO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVTZXNzaW9uSWQoKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBzZXNzaW9uXyR7cmFuZG9tQnl0ZXMoMTIpLnRvU3RyaW5nKFwiaGV4XCIpfWA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1Nlc3Npb25JZCh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIHN0cmluZyB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgJiYgU0VTU0lPTl9JRF9SRS50ZXN0KHZhbHVlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFNlc3Npb25JZCh2YWx1ZTogdW5rbm93bik6IGFzc2VydHMgdmFsdWUgaXMgc3RyaW5nIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIiB8fCB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnZhbGlkIHNlc3Npb24gaWRcIik7XG4gIH1cbiAgaWYgKFxuICAgIHZhbHVlLmluY2x1ZGVzKFwiLi5cIikgfHxcbiAgICB2YWx1ZS5pbmNsdWRlcyhcIi9cIikgfHxcbiAgICB2YWx1ZS5pbmNsdWRlcyhcIlxcXFxcIikgfHxcbiAgICB2YWx1ZS5pbmNsdWRlcyhcIjpcIikgfHxcbiAgICB2YWx1ZS5pbmNsdWRlcyhcIkBcIikgfHxcbiAgICB2YWx1ZS5pbmNsdWRlcyhcIiBcIikgfHxcbiAgICB2YWx1ZS5zdGFydHNXaXRoKFwiXFxcXFxcXFxcIikgfHxcbiAgICAvXltBLVphLXpdOi8udGVzdCh2YWx1ZSlcbiAgKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCBzZXNzaW9uIGlkXCIpO1xuICB9XG4gIGlmICghU0VTU0lPTl9JRF9SRS50ZXN0KHZhbHVlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgc2Vzc2lvbiBpZFwiKTtcbiAgfVxufVxuIiwgImltcG9ydCB7IGV4aXN0c1N5bmMsIGxzdGF0U3luYywgbWtkaXJTeW5jLCByZWFscGF0aFN5bmMsIHJtU3luYywgdHlwZSBTdGF0cyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBqb2luLCByZXNvbHZlIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuaW1wb3J0IHsgaXNQYXRoSW5zaWRlIH0gZnJvbSBcIi4uL25hdGl2ZS1wYXRoc1wiO1xuaW1wb3J0IHsgYXNzZXJ0U2Vzc2lvbklkIH0gZnJvbSBcIi4vaWRzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2FmZVNlc3Npb25MYXlvdXQge1xuICByZWFsVXNlclJvb3Q6IHN0cmluZztcbiAgcmVhbFNlc3Npb25zUm9vdDogc3RyaW5nO1xuICByZWFsQWNjb3VudHNSb290OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXNzaW9uc1Jvb3QodXNlclJvb3Q6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBqb2luKHVzZXJSb290LCBcImNvZGV4LXNlc3Npb25zXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWNjb3VudHNSb290KHVzZXJSb290OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gam9pbihzZXNzaW9uc1Jvb3QodXNlclJvb3QpLCBcImFjY291bnRzXCIpO1xufVxuXG5mdW5jdGlvbiBsc3RhdElmRXhpc3RzKHBhdGg6IHN0cmluZyk6IFN0YXRzIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGxzdGF0U3luYyhwYXRoKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zdCBjb2RlID0gKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZTtcbiAgICBpZiAoY29kZSA9PT0gXCJFTk9FTlRcIikgcmV0dXJuIG51bGw7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVhbFVzZXJSb290T2YodXNlclJvb3Q6IHN0cmluZyk6IHN0cmluZyB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHJlYWxwYXRoU3luYyh1c2VyUm9vdCk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiByZXNvbHZlKHVzZXJSb290KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhc3NlcnRTdHJpY3RseUluc2lkZShwYXJlbnQ6IHN0cmluZywgY2hpbGQ6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XG4gIGlmICghaXNQYXRoSW5zaWRlKHBhcmVudCwgY2hpbGQpIHx8IGNoaWxkID09PSBwYXJlbnQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYXNzZXJ0U2FmZVN0cnVjdHVyYWxEaXIoXG4gIHJlYWxVc2VyUm9vdDogc3RyaW5nLFxuICBsZXhpY2FsUGF0aDogc3RyaW5nLFxuICByZWxhdGl2ZVBhcnRzOiByZWFkb25seSBzdHJpbmdbXSxcbiAgbGFiZWw6IHN0cmluZyxcbik6IHN0cmluZyB7XG4gIGNvbnN0IHN0YXQgPSBsc3RhdElmRXhpc3RzKGxleGljYWxQYXRoKTtcbiAgaWYgKCFzdGF0KSB7XG4gICAgY29uc3QgaW50ZW5kZWQgPSBqb2luKHJlYWxVc2VyUm9vdCwgLi4ucmVsYXRpdmVQYXJ0cyk7XG4gICAgYXNzZXJ0U3RyaWN0bHlJbnNpZGUocmVhbFVzZXJSb290LCBpbnRlbmRlZCwgYCR7bGFiZWx9IG11c3Qgc3RheSBpbnNpZGUgdXNlciByb290YCk7XG4gICAgcmV0dXJuIGludGVuZGVkO1xuICB9XG4gIGlmIChzdGF0LmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYCR7bGFiZWx9IG11c3Qgbm90IGJlIGEgc3ltbGlua2ApO1xuICB9XG4gIGlmICghc3RhdC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGAke2xhYmVsfSBtdXN0IGJlIGEgZGlyZWN0b3J5YCk7XG4gIH1cbiAgY29uc3QgcmVhbERpciA9IHJlYWxwYXRoU3luYyhsZXhpY2FsUGF0aCk7XG4gIGFzc2VydFN0cmljdGx5SW5zaWRlKHJlYWxVc2VyUm9vdCwgcmVhbERpciwgYCR7bGFiZWx9IG11c3Qgc3RheSBpbnNpZGUgdXNlciByb290YCk7XG4gIHJldHVybiByZWFsRGlyO1xufVxuXG4vKipcbiAqIEZhaWwgY2xvc2VkIGlmIGA8dXNlclJvb3Q+L2NvZGV4LXNlc3Npb25zYCBvciBgLi4uL2FjY291bnRzYCBpcyBhXG4gKiBzeW1saW5rL2p1bmN0aW9uLCBvciBpZiBhIHJlYWwgZGlyZWN0b3J5J3MgcmVhbHBhdGggZXNjYXBlcyB0aGUgcmVhbCB1c2VyXG4gKiByb290LiB1c2VyUm9vdCBpdHNlbGYgbWF5IHJlc29sdmUgdGhyb3VnaCBhIHVzZXItc2VsZWN0ZWQgc3ltbGluay5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFNhZmVTZXNzaW9uTGF5b3V0KHVzZXJSb290OiBzdHJpbmcpOiBTYWZlU2Vzc2lvbkxheW91dCB7XG4gIGNvbnN0IHJlYWxVc2VyUm9vdCA9IHJlYWxVc2VyUm9vdE9mKHVzZXJSb290KTtcbiAgY29uc3QgcmVhbFNlc3Npb25zUm9vdCA9IGFzc2VydFNhZmVTdHJ1Y3R1cmFsRGlyKFxuICAgIHJlYWxVc2VyUm9vdCxcbiAgICBzZXNzaW9uc1Jvb3QodXNlclJvb3QpLFxuICAgIFtcImNvZGV4LXNlc3Npb25zXCJdLFxuICAgIFwic2Vzc2lvbiByb290XCIsXG4gICk7XG4gIGNvbnN0IHJlYWxBY2NvdW50c1Jvb3QgPSBhc3NlcnRTYWZlU3RydWN0dXJhbERpcihcbiAgICByZWFsVXNlclJvb3QsXG4gICAgYWNjb3VudHNSb290KHVzZXJSb290KSxcbiAgICBbXCJjb2RleC1zZXNzaW9uc1wiLCBcImFjY291bnRzXCJdLFxuICAgIFwiYWNjb3VudHMgcm9vdFwiLFxuICApO1xuICBhc3NlcnRTdHJpY3RseUluc2lkZShyZWFsVXNlclJvb3QsIHJlYWxBY2NvdW50c1Jvb3QsIFwiYWNjb3VudHMgcm9vdCBtdXN0IHN0YXkgaW5zaWRlIHVzZXIgcm9vdFwiKTtcbiAgcmV0dXJuIHsgcmVhbFVzZXJSb290LCByZWFsU2Vzc2lvbnNSb290LCByZWFsQWNjb3VudHNSb290IH07XG59XG5cbmZ1bmN0aW9uIG1rZGlyUmVhbERpcihwYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKGxzdGF0SWZFeGlzdHMocGF0aCkpIHJldHVybjtcbiAgbWtkaXJTeW5jKHBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xufVxuXG4vKipcbiAqIENyZWF0ZSBtaXNzaW5nIHN0cnVjdHVyYWwgZGlycyBhcyByZWFsIGRpcmVjdG9yaWVzLCB0aGVuIHJlLWxzdGF0IHNvIGFcbiAqIFRPQ1RPVSByZXBsYWNlIHdpdGggYSBzeW1saW5rL2p1bmN0aW9uIGNhbm5vdCBiZSB3cml0dGVuIHRocm91Z2guXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVTYWZlU2Vzc2lvbkxheW91dCh1c2VyUm9vdDogc3RyaW5nKTogU2FmZVNlc3Npb25MYXlvdXQge1xuICBhc3NlcnRTYWZlU2Vzc2lvbkxheW91dCh1c2VyUm9vdCk7XG4gIG1rZGlyUmVhbERpcihzZXNzaW9uc1Jvb3QodXNlclJvb3QpKTtcbiAgYXNzZXJ0U2FmZVNlc3Npb25MYXlvdXQodXNlclJvb3QpO1xuICBta2RpclJlYWxEaXIoYWNjb3VudHNSb290KHVzZXJSb290KSk7XG4gIHJldHVybiBhc3NlcnRTYWZlU2Vzc2lvbkxheW91dCh1c2VyUm9vdCk7XG59XG5cbmZ1bmN0aW9uIHNlc3Npb25EaXJVbmRlckxheW91dChsYXlvdXQ6IFNhZmVTZXNzaW9uTGF5b3V0LCBpZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgYXNzZXJ0U2Vzc2lvbklkKGlkKTtcbiAgY29uc3QgZGlyID0gam9pbihsYXlvdXQucmVhbEFjY291bnRzUm9vdCwgaWQpO1xuICBhc3NlcnRTdHJpY3RseUluc2lkZShsYXlvdXQucmVhbEFjY291bnRzUm9vdCwgZGlyLCBcInNlc3Npb24gcGF0aCBtdXN0IHN0YXkgaW5zaWRlIGFjY291bnRzIHJvb3RcIik7XG4gIHJldHVybiBkaXI7XG59XG5cbmZ1bmN0aW9uIGFzc2VydFNhZmVFeGlzdGluZ1Nlc3Npb25EaXIobGF5b3V0OiBTYWZlU2Vzc2lvbkxheW91dCwgZGlyOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBzdGF0ID0gbHN0YXRJZkV4aXN0cyhkaXIpO1xuICBpZiAoIXN0YXQpIHJldHVybiBkaXI7XG4gIGlmIChzdGF0LmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJzZXNzaW9uIGRpcmVjdG9yeSBtdXN0IG5vdCBiZSBhIHN5bWxpbmtcIik7XG4gIH1cbiAgaWYgKCFzdGF0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJzZXNzaW9uIHBhdGggbXVzdCBiZSBhIGRpcmVjdG9yeVwiKTtcbiAgfVxuICBjb25zdCByZWFsRGlyID0gcmVhbHBhdGhTeW5jKGRpcik7XG4gIGFzc2VydFN0cmljdGx5SW5zaWRlKGxheW91dC5yZWFsQWNjb3VudHNSb290LCByZWFsRGlyLCBcInNlc3Npb24gcGF0aCBtdXN0IHN0YXkgaW5zaWRlIGFjY291bnRzIHJvb3RcIik7XG4gIHJldHVybiByZWFsRGlyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2Vzc2lvbkRpcih1c2VyUm9vdDogc3RyaW5nLCBpZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgbGF5b3V0ID0gYXNzZXJ0U2FmZVNlc3Npb25MYXlvdXQodXNlclJvb3QpO1xuICBjb25zdCBkaXIgPSBzZXNzaW9uRGlyVW5kZXJMYXlvdXQobGF5b3V0LCBpZCk7XG4gIHJldHVybiBhc3NlcnRTYWZlRXhpc3RpbmdTZXNzaW9uRGlyKGxheW91dCwgZGlyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlc3Npb25NZXRhUGF0aCh1c2VyUm9vdDogc3RyaW5nLCBpZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGpvaW4oc2Vzc2lvbkRpcih1c2VyUm9vdCwgaWQpLCBcInNlc3Npb24uanNvblwiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlc3Npb25Db2RleEhvbWUodXNlclJvb3Q6IHN0cmluZywgaWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBqb2luKHNlc3Npb25EaXIodXNlclJvb3QsIGlkKSwgXCJjb2RleC1ob21lXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2Vzc2lvblNxbGl0ZUhvbWUodXNlclJvb3Q6IHN0cmluZywgaWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBqb2luKHNlc3Npb25EaXIodXNlclJvb3QsIGlkKSwgXCJzcWxpdGUtaG9tZVwiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbGxlY3RGb3JiaWRkZW5EZWxldGVUYXJnZXRzKHVzZXJSb290OiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IG91dCA9IFtcbiAgICByZXNvbHZlKHVzZXJSb290KSxcbiAgICByZXNvbHZlKHVzZXJSb290LCBcInR3ZWFrLWRhdGFcIiksXG4gICAgcmVzb2x2ZSh1c2VyUm9vdCwgXCJ0d2Vha3NcIiksXG4gICAgcmVzb2x2ZSh1c2VyUm9vdCwgXCJydW50aW1lXCIpLFxuICAgIHJlc29sdmUodXNlclJvb3QsIFwiY29uZmlnLmpzb25cIiksXG4gICAgcmVzb2x2ZSh1c2VyUm9vdCwgXCJzdGF0ZS5qc29uXCIpLFxuICAgIHJlc29sdmUoc2Vzc2lvbnNSb290KHVzZXJSb290KSksXG4gICAgcmVzb2x2ZShhY2NvdW50c1Jvb3QodXNlclJvb3QpKSxcbiAgXTtcbiAgaWYgKHByb2Nlc3MuZW52LkhPTUUpIHtcbiAgICBvdXQucHVzaChyZXNvbHZlKHByb2Nlc3MuZW52LkhPTUUpKTtcbiAgICBvdXQucHVzaChyZXNvbHZlKHByb2Nlc3MuZW52LkhPTUUsIFwiLmNvZGV4XCIpKTtcbiAgfVxuICBpZiAocHJvY2Vzcy5lbnYuVVNFUlBST0ZJTEUpIHtcbiAgICBvdXQucHVzaChyZXNvbHZlKHByb2Nlc3MuZW52LlVTRVJQUk9GSUxFKSk7XG4gICAgb3V0LnB1c2gocmVzb2x2ZShwcm9jZXNzLmVudi5VU0VSUFJPRklMRSwgXCIuY29kZXhcIikpO1xuICB9XG4gIGlmIChwcm9jZXNzLmVudi5BUFBEQVRBKSBvdXQucHVzaChyZXNvbHZlKHByb2Nlc3MuZW52LkFQUERBVEEpKTtcbiAgdHJ5IHtcbiAgICBvdXQucHVzaChyZWFscGF0aFN5bmModXNlclJvb3QpKTtcbiAgfSBjYXRjaCB7XG4gICAgLy8gdXNlclJvb3QgbWF5IG5vdCBleGlzdCB5ZXRcbiAgfVxuICByZXR1cm4gWy4uLm5ldyBTZXQob3V0KV07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0ZvcmJpZGRlblNlc3Npb25EZWxldGVUYXJnZXQodXNlclJvb3Q6IHN0cmluZywgdGFyZ2V0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgcmVzb2x2ZWQgPSByZXNvbHZlKHRhcmdldCk7XG4gIGNvbnN0IGZvcmJpZGRlbiA9IGNvbGxlY3RGb3JiaWRkZW5EZWxldGVUYXJnZXRzKHVzZXJSb290KTtcbiAgaWYgKGZvcmJpZGRlbi5pbmNsdWRlcyhyZXNvbHZlZCkpIHJldHVybiB0cnVlO1xuICB0cnkge1xuICAgIHJldHVybiBmb3JiaWRkZW4uaW5jbHVkZXMocmVhbHBhdGhTeW5jKHRhcmdldCkpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJtU2Vzc2lvbkRpcih1c2VyUm9vdDogc3RyaW5nLCBpZDogc3RyaW5nKTogdm9pZCB7XG4gIGFzc2VydFNlc3Npb25JZChpZCk7XG4gIGNvbnN0IGxheW91dCA9IGFzc2VydFNhZmVTZXNzaW9uTGF5b3V0KHVzZXJSb290KTtcbiAgY29uc3QgZGlyID0gc2Vzc2lvbkRpclVuZGVyTGF5b3V0KGxheW91dCwgaWQpO1xuICBjb25zdCBzdGF0ID0gbHN0YXRJZkV4aXN0cyhkaXIpO1xuICBpZiAoIXN0YXQpIHJldHVybjtcbiAgaWYgKHN0YXQuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcInNlc3Npb24gZGlyZWN0b3J5IG11c3Qgbm90IGJlIGEgc3ltbGlua1wiKTtcbiAgfVxuICBpZiAoIXN0YXQuaXNEaXJlY3RvcnkoKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcInNlc3Npb24gcGF0aCBtdXN0IGJlIGEgZGlyZWN0b3J5XCIpO1xuICB9XG4gIGNvbnN0IHJlYWxEaXIgPSByZWFscGF0aFN5bmMoZGlyKTtcbiAgYXNzZXJ0U3RyaWN0bHlJbnNpZGUoXG4gICAgbGF5b3V0LnJlYWxBY2NvdW50c1Jvb3QsXG4gICAgcmVhbERpcixcbiAgICBcInJlZnVzaW5nIHRvIGRlbGV0ZSBwYXRoIG91dHNpZGUgYWNjb3VudHMgcm9vdFwiLFxuICApO1xuICBpZiAoaXNGb3JiaWRkZW5TZXNzaW9uRGVsZXRlVGFyZ2V0KHVzZXJSb290LCByZWFsRGlyKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcInJlZnVzaW5nIHRvIGRlbGV0ZSBwcm90ZWN0ZWQgcGF0aFwiKTtcbiAgfVxuICBybVN5bmMocmVhbERpciwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xufVxuIiwgImltcG9ydCB7IHNwYXduLCB0eXBlIENoaWxkUHJvY2VzcywgdHlwZSBTcGF3bk9wdGlvbnMgfSBmcm9tIFwibm9kZTpjaGlsZF9wcm9jZXNzXCI7XG5pbXBvcnQgeyBleGlzdHNTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGRpcm5hbWUsIGpvaW4gfSBmcm9tIFwibm9kZTpwYXRoXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29kZXhTZXNzaW9uTGF1bmNoSW50ZW50IHtcbiAgc2Vzc2lvbklkOiBzdHJpbmc7XG4gIGNvZGV4SG9tZTogc3RyaW5nO1xuICBzcWxpdGVIb21lOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29kZXhNYW5hZ2VkQ2hpbGQge1xuICBraWxsKHNpZ25hbD86IE5vZGVKUy5TaWduYWxzKTogYm9vbGVhbjtcbiAgb25FeGl0KGxpc3RlbmVyOiAoY29kZTogbnVtYmVyIHwgbnVsbCwgc2lnbmFsOiBOb2RlSlMuU2lnbmFscyB8IG51bGwpID0+IHZvaWQpOiAoKSA9PiB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvZGV4UHJvY2Vzc0xhdW5jaGVyIHtcbiAgbGF1bmNoKGludGVudDogQ29kZXhTZXNzaW9uTGF1bmNoSW50ZW50KTogUHJvbWlzZTxDb2RleE1hbmFnZWRDaGlsZD47XG59XG5cbmV4cG9ydCBjb25zdCBJU09MQVRFRF9FTlZfQUxMT1dMSVNUID0gW1xuICBcIlBBVEhcIixcbiAgXCJIT01FXCIsXG4gIFwiVVNFUlBST0ZJTEVcIixcbiAgXCJTWVNURU1ST09UXCIsXG4gIFwiV0lORElSXCIsXG4gIFwiVEVNUFwiLFxuICBcIlRNUFwiLFxuICBcIkxBTkdcIixcbiAgXCJMQ19BTExcIixcbl0gYXMgY29uc3Q7XG5cbmV4cG9ydCBmdW5jdGlvbiBpc29sYXRlZFNlc3Npb25FbnYoXG4gIGludGVudDogQ29kZXhTZXNzaW9uTGF1bmNoSW50ZW50LFxuICBzb3VyY2VFbnY6IE5vZGVKUy5Qcm9jZXNzRW52ID0gcHJvY2Vzcy5lbnYsXG4pOiBOb2RlSlMuUHJvY2Vzc0VudiB7XG4gIGNvbnN0IGVudjogTm9kZUpTLlByb2Nlc3NFbnYgPSB7fTtcbiAgZm9yIChjb25zdCBrZXkgb2YgSVNPTEFURURfRU5WX0FMTE9XTElTVCkge1xuICAgIGNvbnN0IHZhbHVlID0gc291cmNlRW52W2tleV07XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikgZW52W2tleV0gPSB2YWx1ZTtcbiAgfVxuICBlbnYuQ09ERVhfSE9NRSA9IGludGVudC5jb2RleEhvbWU7XG4gIGVudi5DT0RFWF9TUUxJVEVfSE9NRSA9IGludGVudC5zcWxpdGVIb21lO1xuICByZXR1cm4gZW52O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZVRydXN0ZWRDb2RleEV4ZWN1dGFibGUob3B0czoge1xuICBwbGF0Zm9ybT86IE5vZGVKUy5QbGF0Zm9ybTtcbiAgcmVzb3VyY2VzUGF0aD86IHN0cmluZyB8IG51bGw7XG4gIGFwcFBhdGg/OiBzdHJpbmcgfCBudWxsO1xuICBleGlzdHNTeW5jPzogKHBhdGg6IHN0cmluZykgPT4gYm9vbGVhbjtcbn0pOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgZXhpc3RzID0gb3B0cy5leGlzdHNTeW5jID8/IGV4aXN0c1N5bmM7XG4gIGNvbnN0IHBsYXRmb3JtID0gb3B0cy5wbGF0Zm9ybSA/PyBwcm9jZXNzLnBsYXRmb3JtO1xuICBjb25zdCBjYW5kaWRhdGVzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBhZGRSZWxhdGl2ZXMgPSAocm9vdDogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCkgPT4ge1xuICAgIGlmICghcm9vdCkgcmV0dXJuO1xuICAgIGNhbmRpZGF0ZXMucHVzaChcbiAgICAgIGpvaW4ocm9vdCwgXCJjb2RleFwiKSxcbiAgICAgIGpvaW4ocm9vdCwgXCJiaW5cIiwgXCJjb2RleFwiKSxcbiAgICAgIGpvaW4ocm9vdCwgXCJDb2RleC5leGVcIiksXG4gICAgICBqb2luKHJvb3QsIFwiYmluXCIsIFwiQ29kZXguZXhlXCIpLFxuICAgICk7XG4gIH07XG4gIGFkZFJlbGF0aXZlcyhvcHRzLnJlc291cmNlc1BhdGggPz8gdW5kZWZpbmVkKTtcbiAgYWRkUmVsYXRpdmVzKG9wdHMuYXBwUGF0aCA/PyB1bmRlZmluZWQpO1xuICBpZiAocGxhdGZvcm0gPT09IFwiZGFyd2luXCIgJiYgb3B0cy5hcHBQYXRoKSB7XG4gICAgYWRkUmVsYXRpdmVzKGpvaW4ob3B0cy5hcHBQYXRoLCBcIkNvbnRlbnRzXCIsIFwiUmVzb3VyY2VzXCIpKTtcbiAgfVxuICBmb3IgKGNvbnN0IGNhbmRpZGF0ZSBvZiBjYW5kaWRhdGVzKSB7XG4gICAgaWYgKGV4aXN0cyhjYW5kaWRhdGUpKSByZXR1cm4gY2FuZGlkYXRlO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5vZGVDb2RleFByb2Nlc3NMYXVuY2hlck9wdGlvbnMge1xuICByZXNvbHZlRXhlY3V0YWJsZTogKCkgPT4gc3RyaW5nIHwgbnVsbDtcbiAgc3Bhd25JbXBsPzogdHlwZW9mIHNwYXduO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTm9kZUNvZGV4UHJvY2Vzc0xhdW5jaGVyKFxuICBvcHRpb25zOiBOb2RlQ29kZXhQcm9jZXNzTGF1bmNoZXJPcHRpb25zLFxuKTogQ29kZXhQcm9jZXNzTGF1bmNoZXIge1xuICBjb25zdCBzcGF3bkltcGwgPSBvcHRpb25zLnNwYXduSW1wbCA/PyBzcGF3bjtcbiAgcmV0dXJuIHtcbiAgICBsYXVuY2goaW50ZW50KSB7XG4gICAgICBjb25zdCBleGUgPSBvcHRpb25zLnJlc29sdmVFeGVjdXRhYmxlKCk7XG4gICAgICBpZiAoIWV4ZSkge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKFwidHJ1c3RlZCBDb2RleCBleGVjdXRhYmxlIGlzIG5vdCBhdmFpbGFibGVcIikpO1xuICAgICAgfVxuICAgICAgbGV0IGNoaWxkOiBDaGlsZFByb2Nlc3M7XG4gICAgICB0cnkge1xuICAgICAgICBjaGlsZCA9IHNwYXduSW1wbChleGUsIFtdLCB7XG4gICAgICAgICAgZW52OiBpc29sYXRlZFNlc3Npb25FbnYoaW50ZW50KSxcbiAgICAgICAgICBjd2Q6IGRpcm5hbWUoaW50ZW50LmNvZGV4SG9tZSksXG4gICAgICAgICAgc3RkaW86IFtcImlnbm9yZVwiLCBcInBpcGVcIiwgXCJwaXBlXCJdLFxuICAgICAgICAgIHdpbmRvd3NIaWRlOiB0cnVlLFxuICAgICAgICB9IHNhdGlzZmllcyBTcGF3bk9wdGlvbnMpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycm9yKTtcbiAgICAgIH1cbiAgICAgIGRyYWluKGNoaWxkKTtcbiAgICAgIHJldHVybiB3YWl0Rm9yU3Bhd24oY2hpbGQpO1xuICAgIH0sXG4gIH07XG59XG5cbmZ1bmN0aW9uIGRyYWluKGNoaWxkOiBDaGlsZFByb2Nlc3MpOiB2b2lkIHtcbiAgY2hpbGQuc3Rkb3V0Py5vbihcImRhdGFcIiwgKCkgPT4ge30pO1xuICBjaGlsZC5zdGRlcnI/Lm9uKFwiZGF0YVwiLCAoKSA9PiB7fSk7XG4gIGNoaWxkLnN0ZG91dD8ucmVzdW1lKCk7XG4gIGNoaWxkLnN0ZGVycj8ucmVzdW1lKCk7XG59XG5cbmZ1bmN0aW9uIHdhaXRGb3JTcGF3bihjaGlsZDogQ2hpbGRQcm9jZXNzKTogUHJvbWlzZTxDb2RleE1hbmFnZWRDaGlsZD4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IG9uRXJyb3IgPSAoZXJyb3I6IEVycm9yKSA9PiB7XG4gICAgICBjaGlsZC5vZmYoXCJzcGF3blwiLCBvblNwYXduKTtcbiAgICAgIHJlamVjdChlcnJvcik7XG4gICAgfTtcbiAgICBjb25zdCBvblNwYXduID0gKCkgPT4ge1xuICAgICAgY2hpbGQub2ZmKFwiZXJyb3JcIiwgb25FcnJvcik7XG4gICAgICBjaGlsZC5vbihcImVycm9yXCIsICgpID0+IHt9KTtcbiAgICAgIHJlc29sdmUod3JhcENoaWxkKGNoaWxkKSk7XG4gICAgfTtcbiAgICBjaGlsZC5vbmNlKFwiZXJyb3JcIiwgb25FcnJvcik7XG4gICAgY2hpbGQub25jZShcInNwYXduXCIsIG9uU3Bhd24pO1xuICAgIGlmIChjaGlsZC5waWQgIT0gbnVsbCkge1xuICAgICAgY2hpbGQub2ZmKFwiZXJyb3JcIiwgb25FcnJvcik7XG4gICAgICBjaGlsZC5vZmYoXCJzcGF3blwiLCBvblNwYXduKTtcbiAgICAgIGNoaWxkLm9uKFwiZXJyb3JcIiwgKCkgPT4ge30pO1xuICAgICAgcmVzb2x2ZSh3cmFwQ2hpbGQoY2hpbGQpKTtcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiB3cmFwQ2hpbGQoY2hpbGQ6IENoaWxkUHJvY2Vzcyk6IENvZGV4TWFuYWdlZENoaWxkIHtcbiAgcmV0dXJuIHtcbiAgICBraWxsKHNpZ25hbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGNoaWxkLmtpbGwoc2lnbmFsKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSxcbiAgICBvbkV4aXQobGlzdGVuZXIpIHtcbiAgICAgIGNvbnN0IGhhbmRsZXIgPSAoY29kZTogbnVtYmVyIHwgbnVsbCwgc2lnbmFsOiBOb2RlSlMuU2lnbmFscyB8IG51bGwpID0+IHtcbiAgICAgICAgbGlzdGVuZXIoY29kZSwgc2lnbmFsKTtcbiAgICAgIH07XG4gICAgICBjaGlsZC5vbihcImV4aXRcIiwgaGFuZGxlcik7XG4gICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICBjaGlsZC5vZmYoXCJleGl0XCIsIGhhbmRsZXIpO1xuICAgICAgfTtcbiAgICB9LFxuICB9O1xufVxuIiwgImltcG9ydCB7IGV4aXN0c1N5bmMsIG1rZGlyU3luYywgcmVhZGRpclN5bmMsIHJlYWRGaWxlU3luYywgcmVuYW1lU3luYywgdW5saW5rU3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBiYXNlbmFtZSwgZGlybmFtZSwgam9pbiB9IGZyb20gXCJub2RlOnBhdGhcIjtcbmltcG9ydCB7IGFzc2VydFNlc3Npb25JZCwgZ2VuZXJhdGVTZXNzaW9uSWQsIGlzU2Vzc2lvbklkIH0gZnJvbSBcIi4vaWRzXCI7XG5pbXBvcnQgdHlwZSB7IENvZGV4UHJvY2Vzc0xhdW5jaGVyLCBDb2RleE1hbmFnZWRDaGlsZCB9IGZyb20gXCIuL2xhdW5jaGVyXCI7XG5pbXBvcnQge1xuICBhc3NlcnRTYWZlU2Vzc2lvbkxheW91dCxcbiAgZW5zdXJlU2FmZVNlc3Npb25MYXlvdXQsXG4gIHJtU2Vzc2lvbkRpcixcbiAgc2Vzc2lvbkNvZGV4SG9tZSxcbiAgc2Vzc2lvbkRpcixcbiAgc2Vzc2lvbk1ldGFQYXRoLFxuICBzZXNzaW9uU3FsaXRlSG9tZSxcbn0gZnJvbSBcIi4vcGF0aHNcIjtcbmltcG9ydCB0eXBlIHsgQ29kZXhTZXNzaW9uTGlmZWN5Y2xlLCBDb2RleFNlc3Npb25NZXRhZGF0YSwgQ29kZXhTZXNzaW9uU3RhdHVzIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBDb2RleFNlc3Npb25NYW5hZ2VyT3B0aW9ucyB7XG4gIHVzZXJSb290OiBzdHJpbmc7XG4gIGxhdW5jaGVyOiBDb2RleFByb2Nlc3NMYXVuY2hlcjtcbiAgbm93PzogKCkgPT4gRGF0ZTtcbiAgbG9nPzogKGxldmVsOiBcImluZm9cIiB8IFwid2FyblwiIHwgXCJlcnJvclwiLCAuLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQ7XG4gIHN0b3BUaW1lb3V0TXM/OiBudW1iZXI7XG4gIGtpbGxUaW1lb3V0TXM/OiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ3JlYXRlQ29kZXhTZXNzaW9uSW5wdXQge1xuICBsYWJlbD86IHN0cmluZztcbiAgaWQ/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVtb3ZlQ29kZXhTZXNzaW9uT3B0aW9ucyB7XG4gIGZvcmNlU3RvcD86IGJvb2xlYW47XG59XG5cbmludGVyZmFjZSBTZXNzaW9uUmVjb3JkIHtcbiAgbWV0YWRhdGE6IENvZGV4U2Vzc2lvbk1ldGFkYXRhO1xuICBsaWZlY3ljbGU6IENvZGV4U2Vzc2lvbkxpZmVjeWNsZTtcbiAgY2hpbGQ6IENvZGV4TWFuYWdlZENoaWxkIHwgbnVsbDtcbiAgdW5zdWJFeGl0OiAoKCkgPT4gdm9pZCkgfCBudWxsO1xuICBpbkZsaWdodDogUHJvbWlzZTx1bmtub3duPiB8IG51bGw7XG59XG5cbi8vIE1TLTIgbWF5IGFkZCB0cmFuc3BvcnQvcm91dGluZyBvdmVyIHRoZXNlIHByb2Nlc3MgcHJpbWl0aXZlcy5cblxuZXhwb3J0IGNsYXNzIENvZGV4U2Vzc2lvbk1hbmFnZXIge1xuICBwcml2YXRlIHJlYWRvbmx5IHVzZXJSb290OiBzdHJpbmc7XG4gIHByaXZhdGUgcmVhZG9ubHkgbGF1bmNoZXI6IENvZGV4UHJvY2Vzc0xhdW5jaGVyO1xuICBwcml2YXRlIHJlYWRvbmx5IG5vdzogKCkgPT4gRGF0ZTtcbiAgcHJpdmF0ZSByZWFkb25seSBsb2c/OiBDb2RleFNlc3Npb25NYW5hZ2VyT3B0aW9uc1tcImxvZ1wiXTtcbiAgcHJpdmF0ZSByZWFkb25seSBzdG9wVGltZW91dE1zOiBudW1iZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkga2lsbFRpbWVvdXRNczogbnVtYmVyO1xuICBwcml2YXRlIHJlYWRvbmx5IHJlY29yZHMgPSBuZXcgTWFwPHN0cmluZywgU2Vzc2lvblJlY29yZD4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSB0aW1lcnMgPSBuZXcgU2V0PE5vZGVKUy5UaW1lb3V0PigpO1xuXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM6IENvZGV4U2Vzc2lvbk1hbmFnZXJPcHRpb25zKSB7XG4gICAgdGhpcy51c2VyUm9vdCA9IG9wdGlvbnMudXNlclJvb3Q7XG4gICAgdGhpcy5sYXVuY2hlciA9IG9wdGlvbnMubGF1bmNoZXI7XG4gICAgdGhpcy5ub3cgPSBvcHRpb25zLm5vdyA/PyAoKCkgPT4gbmV3IERhdGUoKSk7XG4gICAgdGhpcy5sb2cgPSBvcHRpb25zLmxvZztcbiAgICB0aGlzLnN0b3BUaW1lb3V0TXMgPSBvcHRpb25zLnN0b3BUaW1lb3V0TXMgPz8gMjAwMDtcbiAgICB0aGlzLmtpbGxUaW1lb3V0TXMgPSBvcHRpb25zLmtpbGxUaW1lb3V0TXMgPz8gMTAwMDtcbiAgICB0aGlzLmxvYWRGcm9tRGlzaygpO1xuICB9XG5cbiAgbGlzdFNlc3Npb25zKCk6IENvZGV4U2Vzc2lvbk1ldGFkYXRhW10ge1xuICAgIGFzc2VydFNhZmVTZXNzaW9uTGF5b3V0KHRoaXMudXNlclJvb3QpO1xuICAgIHJldHVybiBbLi4udGhpcy5yZWNvcmRzLnZhbHVlcygpXVxuICAgICAgLm1hcCgocmVjb3JkKSA9PiBjbG9uZU1ldGFkYXRhKHJlY29yZC5tZXRhZGF0YSkpXG4gICAgICAuc29ydCgoYSwgYikgPT4gYS5jcmVhdGVkQXQubG9jYWxlQ29tcGFyZShiLmNyZWF0ZWRBdCkgfHwgYS5pZC5sb2NhbGVDb21wYXJlKGIuaWQpKTtcbiAgfVxuXG4gIGdldFNlc3Npb24oaWQ6IHN0cmluZyk6IENvZGV4U2Vzc2lvbk1ldGFkYXRhIHtcbiAgICByZXR1cm4gY2xvbmVNZXRhZGF0YSh0aGlzLnJlcXVpcmUoaWQpLm1ldGFkYXRhKTtcbiAgfVxuXG4gIGdldFNlc3Npb25TdGF0dXMoaWQ6IHN0cmluZyk6IENvZGV4U2Vzc2lvblN0YXR1cyB7XG4gICAgY29uc3QgcmVjb3JkID0gdGhpcy5yZXF1aXJlKGlkKTtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHJlY29yZC5tZXRhZGF0YS5pZCxcbiAgICAgIGxpZmVjeWNsZTogcmVjb3JkLmxpZmVjeWNsZSxcbiAgICAgIG1ldGFkYXRhOiBjbG9uZU1ldGFkYXRhKHJlY29yZC5tZXRhZGF0YSksXG4gICAgfTtcbiAgfVxuXG4gIGNyZWF0ZVNlc3Npb24oaW5wdXQ6IENyZWF0ZUNvZGV4U2Vzc2lvbklucHV0ID0ge30pOiBDb2RleFNlc3Npb25NZXRhZGF0YSB7XG4gICAgYXNzZXJ0U2FmZVNlc3Npb25MYXlvdXQodGhpcy51c2VyUm9vdCk7XG4gICAgY29uc3QgaWQgPSBpbnB1dC5pZCA9PT0gdW5kZWZpbmVkID8gdGhpcy5hbGxvY2F0ZUlkKCkgOiAoYXNzZXJ0U2Vzc2lvbklkKGlucHV0LmlkKSwgaW5wdXQuaWQpO1xuICAgIGlmICh0aGlzLnJlY29yZHMuaGFzKGlkKSB8fCBleGlzdHNTeW5jKHNlc3Npb25EaXIodGhpcy51c2VyUm9vdCwgaWQpKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwic2Vzc2lvbiBhbHJlYWR5IGV4aXN0c1wiKTtcbiAgICB9XG4gICAgY29uc3QgY3JlYXRlZEF0ID0gdGhpcy5pc29Ob3coKTtcbiAgICBjb25zdCBtZXRhZGF0YTogQ29kZXhTZXNzaW9uTWV0YWRhdGEgPSB7XG4gICAgICBpZCxcbiAgICAgIGxhYmVsOiBub3JtYWxpemVMYWJlbChpbnB1dC5sYWJlbCksXG4gICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgY3JlYXRlZEF0LFxuICAgIH07XG4gICAgZW5zdXJlU2FmZVNlc3Npb25MYXlvdXQodGhpcy51c2VyUm9vdCk7XG4gICAgY29uc3QgZGlyID0gc2Vzc2lvbkRpcih0aGlzLnVzZXJSb290LCBpZCk7XG4gICAgdHJ5IHtcbiAgICAgIG1rZGlyU3luYyhkaXIpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zdCBjb2RlID0gKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZTtcbiAgICAgIGlmIChjb2RlID09PSBcIkVFWElTVFwiKSB0aHJvdyBuZXcgRXJyb3IoXCJzZXNzaW9uIGFscmVhZHkgZXhpc3RzXCIpO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICAgIG1rZGlyU3luYyhzZXNzaW9uQ29kZXhIb21lKHRoaXMudXNlclJvb3QsIGlkKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgbWtkaXJTeW5jKHNlc3Npb25TcWxpdGVIb21lKHRoaXMudXNlclJvb3QsIGlkKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgd3JpdGVKc29uQXRvbWljKHNlc3Npb25NZXRhUGF0aCh0aGlzLnVzZXJSb290LCBpZCksIG1ldGFkYXRhKTtcbiAgICB0aGlzLnJlY29yZHMuc2V0KGlkLCB7XG4gICAgICBtZXRhZGF0YSxcbiAgICAgIGxpZmVjeWNsZTogXCJTVE9QUEVEXCIsXG4gICAgICBjaGlsZDogbnVsbCxcbiAgICAgIHVuc3ViRXhpdDogbnVsbCxcbiAgICAgIGluRmxpZ2h0OiBudWxsLFxuICAgIH0pO1xuICAgIHRoaXMubG9nPy4oXCJpbmZvXCIsIGBjcmVhdGVkIHNlc3Npb24gJHtpZH1gKTtcbiAgICByZXR1cm4gY2xvbmVNZXRhZGF0YShtZXRhZGF0YSk7XG4gIH1cblxuICByZW5hbWVTZXNzaW9uKGlkOiBzdHJpbmcsIGxhYmVsOiBzdHJpbmcpOiBDb2RleFNlc3Npb25NZXRhZGF0YSB7XG4gICAgY29uc3QgcmVjb3JkID0gdGhpcy5yZXF1aXJlKGlkKTtcbiAgICByZWNvcmQubWV0YWRhdGEubGFiZWwgPSBub3JtYWxpemVMYWJlbChsYWJlbCk7XG4gICAgcmVjb3JkLm1ldGFkYXRhLnVwZGF0ZWRBdCA9IHRoaXMuaXNvTm93KCk7XG4gICAgdGhpcy5wZXJzaXN0KHJlY29yZCk7XG4gICAgcmV0dXJuIGNsb25lTWV0YWRhdGEocmVjb3JkLm1ldGFkYXRhKTtcbiAgfVxuXG4gIGVuYWJsZVNlc3Npb24oaWQ6IHN0cmluZyk6IENvZGV4U2Vzc2lvbk1ldGFkYXRhIHtcbiAgICByZXR1cm4gdGhpcy5zZXRFbmFibGVkKGlkLCB0cnVlKTtcbiAgfVxuXG4gIGRpc2FibGVTZXNzaW9uKGlkOiBzdHJpbmcpOiBDb2RleFNlc3Npb25NZXRhZGF0YSB7XG4gICAgcmV0dXJuIHRoaXMuc2V0RW5hYmxlZChpZCwgZmFsc2UpO1xuICB9XG5cbiAgYXN5bmMgcmVtb3ZlU2Vzc2lvbihpZDogc3RyaW5nLCBvcHRpb25zOiBSZW1vdmVDb2RleFNlc3Npb25PcHRpb25zID0ge30pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhc3NlcnRTYWZlU2Vzc2lvbkxheW91dCh0aGlzLnVzZXJSb290KTtcbiAgICBjb25zdCByZWNvcmQgPSB0aGlzLnJlcXVpcmUoaWQpO1xuICAgIGlmIChyZWNvcmQubGlmZWN5Y2xlID09PSBcIlNUQVJUSU5HXCIgfHwgcmVjb3JkLmxpZmVjeWNsZSA9PT0gXCJSVU5OSU5HXCIgfHwgcmVjb3JkLmxpZmVjeWNsZSA9PT0gXCJTVE9QUElOR1wiKSB7XG4gICAgICBpZiAoIW9wdGlvbnMuZm9yY2VTdG9wKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInNlc3Npb24gaXMgcnVubmluZ1wiKTtcbiAgICAgIH1cbiAgICAgIGF3YWl0IHRoaXMuc3RvcFNlc3Npb24oaWQpO1xuICAgIH1cbiAgICB0aGlzLmRldGFjaChyZWNvcmQpO1xuICAgIHRoaXMucmVjb3Jkcy5kZWxldGUoaWQpO1xuICAgIHJtU2Vzc2lvbkRpcih0aGlzLnVzZXJSb290LCBpZCk7XG4gICAgdGhpcy5sb2c/LihcImluZm9cIiwgYHJlbW92ZWQgc2Vzc2lvbiAke2lkfWApO1xuICB9XG5cbiAgYXN5bmMgc3RhcnRTZXNzaW9uKGlkOiBzdHJpbmcpOiBQcm9taXNlPENvZGV4U2Vzc2lvblN0YXR1cz4ge1xuICAgIGNvbnN0IHJlY29yZCA9IHRoaXMucmVxdWlyZShpZCk7XG4gICAgaWYgKCFyZWNvcmQubWV0YWRhdGEuZW5hYmxlZCkgdGhyb3cgbmV3IEVycm9yKFwic2Vzc2lvbiBpcyBkaXNhYmxlZFwiKTtcbiAgICBpZiAocmVjb3JkLmxpZmVjeWNsZSA9PT0gXCJTVEFSVElOR1wiIHx8IHJlY29yZC5saWZlY3ljbGUgPT09IFwiUlVOTklOR1wiKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJzZXNzaW9uIGFscmVhZHkgc3RhcnRpbmcvcnVubmluZ1wiKTtcbiAgICB9XG4gICAgaWYgKHJlY29yZC5saWZlY3ljbGUgPT09IFwiU1RPUFBJTkdcIikgdGhyb3cgbmV3IEVycm9yKFwic2Vzc2lvbiBpcyBzdG9wcGluZ1wiKTtcbiAgICByZWNvcmQubGlmZWN5Y2xlID0gXCJTVEFSVElOR1wiO1xuICAgIGNvbnN0IHdvcmsgPSB0aGlzLmxhdW5jaFJlY29yZChyZWNvcmQpO1xuICAgIHJlY29yZC5pbkZsaWdodCA9IHdvcms7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHdvcms7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGlmIChyZWNvcmQuaW5GbGlnaHQgPT09IHdvcmspIHJlY29yZC5pbkZsaWdodCA9IG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmdldFNlc3Npb25TdGF0dXMoaWQpO1xuICB9XG5cbiAgYXN5bmMgc3RvcFNlc3Npb24oaWQ6IHN0cmluZyk6IFByb21pc2U8Q29kZXhTZXNzaW9uU3RhdHVzPiB7XG4gICAgY29uc3QgcmVjb3JkID0gdGhpcy5yZXF1aXJlKGlkKTtcbiAgICBpZiAocmVjb3JkLmxpZmVjeWNsZSA9PT0gXCJTVE9QUEVEXCIpIHJldHVybiB0aGlzLmdldFNlc3Npb25TdGF0dXMoaWQpO1xuICAgIGlmIChyZWNvcmQubGlmZWN5Y2xlID09PSBcIkZBSUxFRFwiICYmICFyZWNvcmQuY2hpbGQpIHJldHVybiB0aGlzLmdldFNlc3Npb25TdGF0dXMoaWQpO1xuICAgIGlmIChyZWNvcmQubGlmZWN5Y2xlID09PSBcIlNUT1BQSU5HXCIgJiYgcmVjb3JkLmluRmxpZ2h0KSB7XG4gICAgICBhd2FpdCByZWNvcmQuaW5GbGlnaHQuY2F0Y2goKCkgPT4ge30pO1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0U2Vzc2lvblN0YXR1cyhpZCk7XG4gICAgfVxuICAgIHJlY29yZC5saWZlY3ljbGUgPSBcIlNUT1BQSU5HXCI7XG4gICAgY29uc3Qgd29yayA9IHRoaXMuc3RvcFJlY29yZChyZWNvcmQpO1xuICAgIHJlY29yZC5pbkZsaWdodCA9IHdvcms7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHdvcms7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGlmIChyZWNvcmQuaW5GbGlnaHQgPT09IHdvcmspIHJlY29yZC5pbkZsaWdodCA9IG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmdldFNlc3Npb25TdGF0dXMoaWQpO1xuICB9XG5cbiAgYXN5bmMgcmVzdGFydFNlc3Npb24oaWQ6IHN0cmluZyk6IFByb21pc2U8Q29kZXhTZXNzaW9uU3RhdHVzPiB7XG4gICAgYXdhaXQgdGhpcy5zdG9wU2Vzc2lvbihpZCk7XG4gICAgcmV0dXJuIHRoaXMuc3RhcnRTZXNzaW9uKGlkKTtcbiAgfVxuXG4gIGFzeW5jIHNodXRkb3duQWxsKG9wdGlvbnM6IHsgdGltZW91dE1zPzogbnVtYmVyIH0gPSB7fSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHRpbWVvdXRNcyA9IG9wdGlvbnMudGltZW91dE1zID8/IHRoaXMuc3RvcFRpbWVvdXRNcyArIHRoaXMua2lsbFRpbWVvdXRNcztcbiAgICBjb25zdCBsaXZlID0gWy4uLnRoaXMucmVjb3Jkcy52YWx1ZXMoKV0uZmlsdGVyKChyZWNvcmQpID0+IHRoaXMuaXNMaXZlKHJlY29yZCkpO1xuICAgIGNvbnN0IHN0b3BwaW5nID0gUHJvbWlzZS5hbGwobGl2ZS5tYXAoKHJlY29yZCkgPT4gdGhpcy5zdG9wU2Vzc2lvbihyZWNvcmQubWV0YWRhdGEuaWQpLmNhdGNoKCgpID0+IHt9KSkpO1xuICAgIGF3YWl0IFByb21pc2UucmFjZShbc3RvcHBpbmcsIHRoaXMuZGVsYXkodGltZW91dE1zKV0pO1xuICAgIGZvciAoY29uc3QgcmVjb3JkIG9mIHRoaXMucmVjb3Jkcy52YWx1ZXMoKSkge1xuICAgICAgdGhpcy5kZXRhY2gocmVjb3JkKTtcbiAgICAgIGlmIChyZWNvcmQubGlmZWN5Y2xlID09PSBcIlNUQVJUSU5HXCIgfHwgcmVjb3JkLmxpZmVjeWNsZSA9PT0gXCJSVU5OSU5HXCIgfHwgcmVjb3JkLmxpZmVjeWNsZSA9PT0gXCJTVE9QUElOR1wiKSB7XG4gICAgICAgIHJlY29yZC5saWZlY3ljbGUgPSBcIlNUT1BQRURcIjtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5jbGVhclRpbWVycygpO1xuICB9XG5cbiAgaGFzTGl2ZUNoaWxkcmVuKCk6IGJvb2xlYW4ge1xuICAgIGZvciAoY29uc3QgcmVjb3JkIG9mIHRoaXMucmVjb3Jkcy52YWx1ZXMoKSkge1xuICAgICAgaWYgKHRoaXMuaXNMaXZlKHJlY29yZCkpIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIGlzTGl2ZShyZWNvcmQ6IFNlc3Npb25SZWNvcmQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gKFxuICAgICAgcmVjb3JkLmNoaWxkICE9PSBudWxsIHx8XG4gICAgICByZWNvcmQubGlmZWN5Y2xlID09PSBcIlNUQVJUSU5HXCIgfHxcbiAgICAgIHJlY29yZC5saWZlY3ljbGUgPT09IFwiUlVOTklOR1wiIHx8XG4gICAgICByZWNvcmQubGlmZWN5Y2xlID09PSBcIlNUT1BQSU5HXCJcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXRFbmFibGVkKGlkOiBzdHJpbmcsIGVuYWJsZWQ6IGJvb2xlYW4pOiBDb2RleFNlc3Npb25NZXRhZGF0YSB7XG4gICAgY29uc3QgcmVjb3JkID0gdGhpcy5yZXF1aXJlKGlkKTtcbiAgICByZWNvcmQubWV0YWRhdGEuZW5hYmxlZCA9IGVuYWJsZWQ7XG4gICAgcmVjb3JkLm1ldGFkYXRhLnVwZGF0ZWRBdCA9IHRoaXMuaXNvTm93KCk7XG4gICAgdGhpcy5wZXJzaXN0KHJlY29yZCk7XG4gICAgcmV0dXJuIGNsb25lTWV0YWRhdGEocmVjb3JkLm1ldGFkYXRhKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbGF1bmNoUmVjb3JkKHJlY29yZDogU2Vzc2lvblJlY29yZCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBjaGlsZCA9IGF3YWl0IHRoaXMubGF1bmNoZXIubGF1bmNoKHtcbiAgICAgICAgc2Vzc2lvbklkOiByZWNvcmQubWV0YWRhdGEuaWQsXG4gICAgICAgIGNvZGV4SG9tZTogc2Vzc2lvbkNvZGV4SG9tZSh0aGlzLnVzZXJSb290LCByZWNvcmQubWV0YWRhdGEuaWQpLFxuICAgICAgICBzcWxpdGVIb21lOiBzZXNzaW9uU3FsaXRlSG9tZSh0aGlzLnVzZXJSb290LCByZWNvcmQubWV0YWRhdGEuaWQpLFxuICAgICAgfSk7XG4gICAgICByZWNvcmQuY2hpbGQgPSBjaGlsZDtcbiAgICAgIHJlY29yZC51bnN1YkV4aXQgPSBjaGlsZC5vbkV4aXQoKGNvZGUsIHNpZ25hbCkgPT4ge1xuICAgICAgICB0aGlzLm9uQ2hpbGRFeGl0KHJlY29yZCwgY29kZSwgc2lnbmFsKTtcbiAgICAgIH0pO1xuICAgICAgcmVjb3JkLmxpZmVjeWNsZSA9IFwiUlVOTklOR1wiO1xuICAgICAgcmVjb3JkLm1ldGFkYXRhLmxhc3RTdGFydGVkQXQgPSB0aGlzLmlzb05vdygpO1xuICAgICAgcmVjb3JkLm1ldGFkYXRhLnVwZGF0ZWRBdCA9IHJlY29yZC5tZXRhZGF0YS5sYXN0U3RhcnRlZEF0O1xuICAgICAgdGhpcy5wZXJzaXN0KHJlY29yZCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJlY29yZC5saWZlY3ljbGUgPSBcIkZBSUxFRFwiO1xuICAgICAgcmVjb3JkLmNoaWxkID0gbnVsbDtcbiAgICAgIHJlY29yZC51bnN1YkV4aXQgPSBudWxsO1xuICAgICAgcmVjb3JkLm1ldGFkYXRhLmxhc3RFeGl0ID0ge1xuICAgICAgICBhdDogdGhpcy5pc29Ob3coKSxcbiAgICAgICAgY29kZTogbnVsbCxcbiAgICAgICAgc2lnbmFsOiBudWxsLFxuICAgICAgICByZWFzb246IFwibGF1bmNoLWZhaWxlZFwiLFxuICAgICAgfTtcbiAgICAgIHJlY29yZC5tZXRhZGF0YS51cGRhdGVkQXQgPSByZWNvcmQubWV0YWRhdGEubGFzdEV4aXQuYXQ7XG4gICAgICB0aGlzLnBlcnNpc3QocmVjb3JkKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc3RvcFJlY29yZChyZWNvcmQ6IFNlc3Npb25SZWNvcmQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBjaGlsZCA9IHJlY29yZC5jaGlsZDtcbiAgICBpZiAoIWNoaWxkKSB7XG4gICAgICByZWNvcmQubGlmZWN5Y2xlID0gXCJTVE9QUEVEXCI7XG4gICAgICByZWNvcmQubWV0YWRhdGEubGFzdFN0b3BwZWRBdCA9IHRoaXMuaXNvTm93KCk7XG4gICAgICByZWNvcmQubWV0YWRhdGEudXBkYXRlZEF0ID0gcmVjb3JkLm1ldGFkYXRhLmxhc3RTdG9wcGVkQXQ7XG4gICAgICB0aGlzLnBlcnNpc3QocmVjb3JkKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbGV0IGV4aXRDb2RlOiBudW1iZXIgfCBudWxsID0gbnVsbDtcbiAgICBsZXQgZXhpdFNpZ25hbDogTm9kZUpTLlNpZ25hbHMgfCBudWxsID0gbnVsbDtcbiAgICBjb25zdCB3YWl0RXhpdCA9IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlKSA9PiB7XG4gICAgICBjb25zdCB1bnN1YiA9IGNoaWxkLm9uRXhpdCgoY29kZSwgc2lnbmFsKSA9PiB7XG4gICAgICAgIGV4aXRDb2RlID0gY29kZTtcbiAgICAgICAgZXhpdFNpZ25hbCA9IHNpZ25hbDtcbiAgICAgICAgdW5zdWIoKTtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgY2hpbGQua2lsbChcIlNJR1RFUk1cIik7XG4gICAgY29uc3QgdGVybUV4aXRlZCA9IGF3YWl0IHRoaXMud2FpdFdpdGhUaW1lb3V0KHdhaXRFeGl0LCB0aGlzLnN0b3BUaW1lb3V0TXMpO1xuICAgIGlmICghdGVybUV4aXRlZCkge1xuICAgICAgY2hpbGQua2lsbChcIlNJR0tJTExcIik7XG4gICAgICBhd2FpdCB0aGlzLndhaXRXaXRoVGltZW91dCh3YWl0RXhpdCwgdGhpcy5raWxsVGltZW91dE1zKTtcbiAgICB9XG4gICAgdGhpcy5kZXRhY2gocmVjb3JkKTtcbiAgICByZWNvcmQubGlmZWN5Y2xlID0gXCJTVE9QUEVEXCI7XG4gICAgcmVjb3JkLm1ldGFkYXRhLmxhc3RTdG9wcGVkQXQgPSB0aGlzLmlzb05vdygpO1xuICAgIHJlY29yZC5tZXRhZGF0YS5sYXN0RXhpdCA9IHtcbiAgICAgIGF0OiByZWNvcmQubWV0YWRhdGEubGFzdFN0b3BwZWRBdCxcbiAgICAgIGNvZGU6IGV4aXRDb2RlLFxuICAgICAgc2lnbmFsOiBleGl0U2lnbmFsLFxuICAgICAgcmVhc29uOiBcInJlcXVlc3RlZFwiLFxuICAgIH07XG4gICAgcmVjb3JkLm1ldGFkYXRhLnVwZGF0ZWRBdCA9IHJlY29yZC5tZXRhZGF0YS5sYXN0U3RvcHBlZEF0O1xuICAgIHRoaXMucGVyc2lzdChyZWNvcmQpO1xuICB9XG5cbiAgcHJpdmF0ZSBvbkNoaWxkRXhpdChcbiAgICByZWNvcmQ6IFNlc3Npb25SZWNvcmQsXG4gICAgY29kZTogbnVtYmVyIHwgbnVsbCxcbiAgICBzaWduYWw6IE5vZGVKUy5TaWduYWxzIHwgbnVsbCxcbiAgKTogdm9pZCB7XG4gICAgaWYgKHJlY29yZC5saWZlY3ljbGUgPT09IFwiU1RPUFBJTkdcIikgcmV0dXJuO1xuICAgIGlmIChyZWNvcmQubGlmZWN5Y2xlICE9PSBcIlJVTk5JTkdcIiAmJiByZWNvcmQubGlmZWN5Y2xlICE9PSBcIlNUQVJUSU5HXCIpIHJldHVybjtcbiAgICB0aGlzLmRldGFjaChyZWNvcmQpO1xuICAgIHJlY29yZC5saWZlY3ljbGUgPSBcIkZBSUxFRFwiO1xuICAgIHJlY29yZC5tZXRhZGF0YS5sYXN0RXhpdCA9IHtcbiAgICAgIGF0OiB0aGlzLmlzb05vdygpLFxuICAgICAgY29kZSxcbiAgICAgIHNpZ25hbCxcbiAgICAgIHJlYXNvbjogXCJ1bmV4cGVjdGVkXCIsXG4gICAgfTtcbiAgICByZWNvcmQubWV0YWRhdGEudXBkYXRlZEF0ID0gcmVjb3JkLm1ldGFkYXRhLmxhc3RFeGl0LmF0O1xuICAgIHRoaXMucGVyc2lzdChyZWNvcmQpO1xuICAgIHRoaXMubG9nPy4oXCJ3YXJuXCIsIGBzZXNzaW9uICR7cmVjb3JkLm1ldGFkYXRhLmlkfSBleGl0ZWQgdW5leHBlY3RlZGx5YCk7XG4gIH1cblxuICBwcml2YXRlIGRldGFjaChyZWNvcmQ6IFNlc3Npb25SZWNvcmQpOiB2b2lkIHtcbiAgICByZWNvcmQudW5zdWJFeGl0Py4oKTtcbiAgICByZWNvcmQudW5zdWJFeGl0ID0gbnVsbDtcbiAgICBpZiAocmVjb3JkLmNoaWxkKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZWNvcmQuY2hpbGQua2lsbChcIlNJR0tJTExcIik7XG4gICAgICB9IGNhdGNoIHt9XG4gICAgICByZWNvcmQuY2hpbGQgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVxdWlyZShpZDogc3RyaW5nKTogU2Vzc2lvblJlY29yZCB7XG4gICAgYXNzZXJ0U2Vzc2lvbklkKGlkKTtcbiAgICBhc3NlcnRTYWZlU2Vzc2lvbkxheW91dCh0aGlzLnVzZXJSb290KTtcbiAgICBjb25zdCByZWNvcmQgPSB0aGlzLnJlY29yZHMuZ2V0KGlkKTtcbiAgICBpZiAoIXJlY29yZCkgdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIHNlc3Npb246ICR7aWR9YCk7XG4gICAgcmV0dXJuIHJlY29yZDtcbiAgfVxuXG4gIHByaXZhdGUgYWxsb2NhdGVJZCgpOiBzdHJpbmcge1xuICAgIGNvbnN0IGxheW91dCA9IGFzc2VydFNhZmVTZXNzaW9uTGF5b3V0KHRoaXMudXNlclJvb3QpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgODsgaSsrKSB7XG4gICAgICBjb25zdCBpZCA9IGdlbmVyYXRlU2Vzc2lvbklkKCk7XG4gICAgICBpZiAoIXRoaXMucmVjb3Jkcy5oYXMoaWQpICYmICFleGlzdHNTeW5jKGpvaW4obGF5b3V0LnJlYWxBY2NvdW50c1Jvb3QsIGlkKSkpIHJldHVybiBpZDtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiZmFpbGVkIHRvIGFsbG9jYXRlIHNlc3Npb24gaWRcIik7XG4gIH1cblxuICBwcml2YXRlIHBlcnNpc3QocmVjb3JkOiBTZXNzaW9uUmVjb3JkKTogdm9pZCB7XG4gICAgYXNzZXJ0U2FmZVNlc3Npb25MYXlvdXQodGhpcy51c2VyUm9vdCk7XG4gICAgd3JpdGVKc29uQXRvbWljKHNlc3Npb25NZXRhUGF0aCh0aGlzLnVzZXJSb290LCByZWNvcmQubWV0YWRhdGEuaWQpLCByZWNvcmQubWV0YWRhdGEpO1xuICB9XG5cbiAgcHJpdmF0ZSBsb2FkRnJvbURpc2soKTogdm9pZCB7XG4gICAgY29uc3QgbGF5b3V0ID0gYXNzZXJ0U2FmZVNlc3Npb25MYXlvdXQodGhpcy51c2VyUm9vdCk7XG4gICAgY29uc3Qgcm9vdCA9IGxheW91dC5yZWFsQWNjb3VudHNSb290O1xuICAgIGlmICghZXhpc3RzU3luYyhyb290KSkgcmV0dXJuO1xuICAgIGxldCBlbnRyaWVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIHRyeSB7XG4gICAgICBlbnRyaWVzID0gcmVhZGRpclN5bmMocm9vdCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGZvciAoY29uc3QgbmFtZSBvZiBlbnRyaWVzKSB7XG4gICAgICBpZiAoIWlzU2Vzc2lvbklkKG5hbWUpKSBjb250aW51ZTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IG1ldGFQYXRoID0gc2Vzc2lvbk1ldGFQYXRoKHRoaXMudXNlclJvb3QsIG5hbWUpO1xuICAgICAgICBpZiAoIWV4aXN0c1N5bmMobWV0YVBhdGgpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgcmF3ID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMobWV0YVBhdGgsIFwidXRmOFwiKSkgYXMgdW5rbm93bjtcbiAgICAgICAgY29uc3QgbWV0YWRhdGEgPSBzdHJpcENyZWRlbnRpYWxzKHJhdywgbmFtZSk7XG4gICAgICAgIHRoaXMucmVjb3Jkcy5zZXQobmFtZSwge1xuICAgICAgICAgIG1ldGFkYXRhLFxuICAgICAgICAgIGxpZmVjeWNsZTogXCJTVE9QUEVEXCIsXG4gICAgICAgICAgY2hpbGQ6IG51bGwsXG4gICAgICAgICAgdW5zdWJFeGl0OiBudWxsLFxuICAgICAgICAgIGluRmxpZ2h0OiBudWxsLFxuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHRoaXMubG9nPy4oXCJ3YXJuXCIsIGBmYWlsZWQgdG8gbG9hZCBzZXNzaW9uICR7bmFtZX1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGlzb05vdygpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLm5vdygpLnRvSVNPU3RyaW5nKCk7XG4gIH1cblxuICBwcml2YXRlIGRlbGF5KG1zOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRoaXMudGltZXJzLmRlbGV0ZSh0aW1lcik7XG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgIH0sIG1zKTtcbiAgICAgIHRoaXMudGltZXJzLmFkZCh0aW1lcik7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHdhaXRXaXRoVGltZW91dChwcm9taXNlOiBQcm9taXNlPHZvaWQ+LCB0aW1lb3V0TXM6IG51bWJlcik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGxldCBzZXR0bGVkID0gZmFsc2U7XG4gICAgY29uc3QgdGltZW91dCA9IHRoaXMuZGVsYXkodGltZW91dE1zKS50aGVuKCgpID0+IHtcbiAgICAgIGlmIChzZXR0bGVkKSByZXR1cm4gZmFsc2U7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gICAgY29uc3Qgd2lubmVyID0gYXdhaXQgUHJvbWlzZS5yYWNlKFtcbiAgICAgIHByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICAgIHNldHRsZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pLFxuICAgICAgdGltZW91dCxcbiAgICBdKTtcbiAgICByZXR1cm4gd2lubmVyO1xuICB9XG5cbiAgcHJpdmF0ZSBjbGVhclRpbWVycygpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHRpbWVyIG9mIHRoaXMudGltZXJzKSBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgIHRoaXMudGltZXJzLmNsZWFyKCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplTGFiZWwobGFiZWw6IHVua25vd24pOiBzdHJpbmcge1xuICBpZiAobGFiZWwgPT09IHVuZGVmaW5lZCB8fCBsYWJlbCA9PT0gbnVsbCkgcmV0dXJuIFwiXCI7XG4gIGlmICh0eXBlb2YgbGFiZWwgIT09IFwic3RyaW5nXCIpIHRocm93IG5ldyBFcnJvcihcInNlc3Npb24gbGFiZWwgbXVzdCBiZSBhIHN0cmluZ1wiKTtcbiAgcmV0dXJuIGxhYmVsLnNsaWNlKDAsIDIwMCk7XG59XG5cbmZ1bmN0aW9uIGNsb25lTWV0YWRhdGEobWV0YWRhdGE6IENvZGV4U2Vzc2lvbk1ldGFkYXRhKTogQ29kZXhTZXNzaW9uTWV0YWRhdGEge1xuICByZXR1cm4ge1xuICAgIC4uLm1ldGFkYXRhLFxuICAgIC4uLihtZXRhZGF0YS5sYXN0RXhpdCA/IHsgbGFzdEV4aXQ6IHsgLi4ubWV0YWRhdGEubGFzdEV4aXQgfSB9IDoge30pLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RyaXBDcmVkZW50aWFscyhyYXc6IHVua25vd24sIGZhbGxiYWNrSWQ6IHN0cmluZyk6IENvZGV4U2Vzc2lvbk1ldGFkYXRhIHtcbiAgY29uc3QgcmVjID0gaXNSZWNvcmQocmF3KSA/IHJhdyA6IHt9O1xuICBjb25zdCBsYXN0RXhpdFJhdyA9IGlzUmVjb3JkKHJlYy5sYXN0RXhpdCkgPyByZWMubGFzdEV4aXQgOiB1bmRlZmluZWQ7XG4gIGxldCByZWFzb246IFwicmVxdWVzdGVkXCIgfCBcInVuZXhwZWN0ZWRcIiB8IFwibGF1bmNoLWZhaWxlZFwiID0gXCJ1bmV4cGVjdGVkXCI7XG4gIGlmIChcbiAgICBsYXN0RXhpdFJhdyAmJlxuICAgIChsYXN0RXhpdFJhdy5yZWFzb24gPT09IFwicmVxdWVzdGVkXCIgfHxcbiAgICAgIGxhc3RFeGl0UmF3LnJlYXNvbiA9PT0gXCJ1bmV4cGVjdGVkXCIgfHxcbiAgICAgIGxhc3RFeGl0UmF3LnJlYXNvbiA9PT0gXCJsYXVuY2gtZmFpbGVkXCIpXG4gICkge1xuICAgIHJlYXNvbiA9IGxhc3RFeGl0UmF3LnJlYXNvbjtcbiAgfVxuICBjb25zdCBsYXN0RXhpdCA9IGxhc3RFeGl0UmF3XG4gICAgPyB7XG4gICAgICAgIGF0OiB0eXBlb2YgbGFzdEV4aXRSYXcuYXQgPT09IFwic3RyaW5nXCIgPyBsYXN0RXhpdFJhdy5hdCA6IG5ldyBEYXRlKDApLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIGNvZGU6IHR5cGVvZiBsYXN0RXhpdFJhdy5jb2RlID09PSBcIm51bWJlclwiID8gbGFzdEV4aXRSYXcuY29kZSA6IG51bGwsXG4gICAgICAgIHNpZ25hbDogdHlwZW9mIGxhc3RFeGl0UmF3LnNpZ25hbCA9PT0gXCJzdHJpbmdcIiA/IGxhc3RFeGl0UmF3LnNpZ25hbCA6IG51bGwsXG4gICAgICAgIHJlYXNvbixcbiAgICAgIH1cbiAgICA6IHVuZGVmaW5lZDtcbiAgY29uc3QgbWV0YWRhdGE6IENvZGV4U2Vzc2lvbk1ldGFkYXRhID0ge1xuICAgIGlkOiBmYWxsYmFja0lkLFxuICAgIGxhYmVsOiB0eXBlb2YgcmVjLmxhYmVsID09PSBcInN0cmluZ1wiID8gcmVjLmxhYmVsIDogXCJcIixcbiAgICBlbmFibGVkOiByZWMuZW5hYmxlZCAhPT0gZmFsc2UsXG4gICAgY3JlYXRlZEF0OiB0eXBlb2YgcmVjLmNyZWF0ZWRBdCA9PT0gXCJzdHJpbmdcIiA/IHJlYy5jcmVhdGVkQXQgOiBuZXcgRGF0ZSgwKS50b0lTT1N0cmluZygpLFxuICB9O1xuICBpZiAodHlwZW9mIHJlYy51cGRhdGVkQXQgPT09IFwic3RyaW5nXCIpIG1ldGFkYXRhLnVwZGF0ZWRBdCA9IHJlYy51cGRhdGVkQXQ7XG4gIGlmICh0eXBlb2YgcmVjLmxhc3RTdGFydGVkQXQgPT09IFwic3RyaW5nXCIpIG1ldGFkYXRhLmxhc3RTdGFydGVkQXQgPSByZWMubGFzdFN0YXJ0ZWRBdDtcbiAgaWYgKHR5cGVvZiByZWMubGFzdFN0b3BwZWRBdCA9PT0gXCJzdHJpbmdcIikgbWV0YWRhdGEubGFzdFN0b3BwZWRBdCA9IHJlYy5sYXN0U3RvcHBlZEF0O1xuICBpZiAobGFzdEV4aXQpIG1ldGFkYXRhLmxhc3RFeGl0ID0gbGFzdEV4aXQ7XG4gIHJldHVybiBtZXRhZGF0YTtcbn1cblxuZnVuY3Rpb24gaXNSZWNvcmQodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB7XG4gIHJldHVybiB2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgJiYgIUFycmF5LmlzQXJyYXkodmFsdWUpO1xufVxuXG5mdW5jdGlvbiB3cml0ZUpzb25BdG9taWMoZmlsZVBhdGg6IHN0cmluZywgZGF0YTogdW5rbm93bik6IHZvaWQge1xuICBjb25zdCBkaXIgPSBkaXJuYW1lKGZpbGVQYXRoKTtcbiAgbWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gIGNvbnN0IHRtcCA9IGpvaW4oZGlyLCBgLiR7YmFzZW5hbWUoZmlsZVBhdGgpfS4ke3Byb2Nlc3MucGlkfS50bXBgKTtcbiAgd3JpdGVGaWxlU3luYyh0bXAsIGAke0pTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIDIpfVxcbmAsIFwidXRmOFwiKTtcbiAgdHJ5IHtcbiAgICByZW5hbWVTeW5jKHRtcCwgZmlsZVBhdGgpO1xuICB9IGNhdGNoIHtcbiAgICB0cnkge1xuICAgICAgdW5saW5rU3luYyhmaWxlUGF0aCk7XG4gICAgfSBjYXRjaCB7fVxuICAgIHJlbmFtZVN5bmModG1wLCBmaWxlUGF0aCk7XG4gIH1cbn1cbiIsICJpbXBvcnQgdHlwZSB7IENvZGV4U2Vzc2lvbk1hbmFnZXIgfSBmcm9tIFwiLi9tYW5hZ2VyXCI7XG5cbmxldCBtYW5hZ2VyOiBDb2RleFNlc3Npb25NYW5hZ2VyIHwgbnVsbCA9IG51bGw7XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRDb2RleFNlc3Npb25NYW5hZ2VyKG5leHQ6IENvZGV4U2Vzc2lvbk1hbmFnZXIgfCBudWxsKTogdm9pZCB7XG4gIG1hbmFnZXIgPSBuZXh0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29kZXhTZXNzaW9uTWFuYWdlcigpOiBDb2RleFNlc3Npb25NYW5hZ2VyIHwgbnVsbCB7XG4gIHJldHVybiBtYW5hZ2VyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVxdWlyZUNvZGV4U2Vzc2lvbk1hbmFnZXIoKTogQ29kZXhTZXNzaW9uTWFuYWdlciB7XG4gIGlmICghbWFuYWdlcikgdGhyb3cgbmV3IEVycm9yKFwiY29kZXggc2Vzc2lvbiBtYW5hZ2VyIGlzIG5vdCBhdmFpbGFibGVcIik7XG4gIHJldHVybiBtYW5hZ2VyO1xufVxuIiwgIi8qKlxuICogVHdlYWsgY2FwYWJpbGl0eSBhdXRob3JpemF0aW9uLiBUaGlzIGlzIHRoZSBzaW5nbGUgc291cmNlIG9mIHRydXRoIGZvclxuICogYFR3ZWFrTWFuaWZlc3QucGVybWlzc2lvbnNgIGVuZm9yY2VtZW50LlxuICpcbiAqIFBvbGljeTpcbiAqICAgMS4gcGVybWlzc2lvbnMgQUJTRU5UOiBsZWdhY3kgXHUyMDE0IHByZXNlcnZlIGhpc3RvcmljYWwgQVBJIGJlaGF2aW9yXG4gKiAgIDIuIHBlcm1pc3Npb25zIFBSRVNFTlQ6IGVuZm9yY2UgdGhlIGRlY2xhcmVkIGxpc3Qgc3RyaWN0bHlcbiAqICAgMy4gcGVybWlzc2lvbnM6IFtdIGlzIE5PVCBsZWdhY3kgXHUyMDE0IGV4cGxpY2l0bHkgbm8gb3B0aW9uYWwgY2FwYWJpbGl0aWVzXG4gKiAgIDQuIEVYUExJQ0lUX09OTFlfUEVSTUlTU0lPTlMgKGBjb2RleC1zZXNzaW9uc2ApIGFyZSBuZXZlciBpbXBsaWVkIGJ5IGFuXG4gKiAgICAgIG9taXR0ZWQgZmllbGQuIFRoZXkgcmVxdWlyZSB0aGUgbmFtZSB0byBhcHBlYXIgaW4gdGhlIGFycmF5LlxuICpcbiAqIEhpc3RvcmljYWwgYWxpYXNlcyAoYGNvZGV4LndpbmRvd3NgIFx1MjE5MiBgY29kZXgtd2luZG93c2AsIGBjb2RleC52aWV3c2AgXHUyMTkyXG4gKiBgY29kZXgtdmlld3NgKSBhcmUgcHJlc2VydmVkIGFuZCB0cmVhdGVkIGFzIGVxdWl2YWxlbnQuXG4gKlxuICogVGhpcyBpcyBjYXBhYmlsaXR5IGF1dGhvcml6YXRpb24gLyBsZWFzdCBwcml2aWxlZ2UsIG5vdCBhIHByb2Nlc3Mgc2FuZGJveC5cbiAqIFR3ZWFrcyByZW1haW4gbG9jYWwgY29kZS4gUmVuZGVyZXIgZmlsdGVyaW5nIGlzIGRlZmVuc2UtaW4tZGVwdGg7IG1haW5cbiAqIGF1dGhvcml6ZXMgd2hlbiBhIHR3ZWFrIGlkZW50aXR5IGlzIHByZXNlbnQuXG4gKi9cbmltcG9ydCB0eXBlIHtcbiAgVHdlYWtGcyxcbiAgVHdlYWtJcGMsXG4gIFR3ZWFrTWFuaWZlc3QsXG4gIFR3ZWFrUGVybWlzc2lvbixcbn0gZnJvbSBcIkBjb2RleC1wbHVzcGx1cy9zZGtcIjtcblxuZXhwb3J0IGNvbnN0IFRXRUFLX1BFUk1JU1NJT05fQUxJQVNFUyA9IHtcbiAgXCJjb2RleC53aW5kb3dzXCI6IFwiY29kZXgtd2luZG93c1wiLFxuICBcImNvZGV4LnZpZXdzXCI6IFwiY29kZXgtdmlld3NcIixcbn0gYXMgY29uc3Q7XG5cbmV4cG9ydCB0eXBlIENhbm9uaWNhbFR3ZWFrUGVybWlzc2lvbiA9XG4gIHwgXCJpcGNcIlxuICB8IFwiZmlsZXN5c3RlbVwiXG4gIHwgXCJuZXR3b3JrXCJcbiAgfCBcInNldHRpbmdzXCJcbiAgfCBcImNvZGV4LXJ1bnRpbWVcIlxuICB8IFwiY29kZXgtd2luZG93c1wiXG4gIHwgXCJjb2RleC12aWV3c1wiXG4gIHwgXCJjb2RleC1jZHBcIlxuICB8IFwiY29kZXgtc2Vzc2lvbnNcIlxuICB8IFwibmF0aXZlLW1vZHVsZVwiXG4gIHwgXCJuYXRpdmUtdmlld1wiXG4gIHwgXCJuYXRpdmUtaGVscGVyXCI7XG5cbi8qKiBMYXllciBTZXR0aW5ncyAvIFN0b3JlIC8gc2VsZi11cGRhdGUgYWRtaW4gSVBDLiBOb3QgYSB0aGlyZC1wYXJ0eSB0d2Vhay4gKi9cbmV4cG9ydCBjb25zdCBMQVlFUl9BRE1JTl9JUENfQ0hBTk5FTFMgPSBbXG4gIFwiY29kZXhwcDppbnN0YWxsLXN0b3JlLXR3ZWFrXCIsXG4gIFwiY29kZXhwcDppbnN0YWxsLWdpdGh1Yi10d2Vha1wiLFxuICBcImNvZGV4cHA6cHJlcGFyZS10d2Vhay1zdG9yZS1zdWJtaXNzaW9uXCIsXG4gIFwiY29kZXhwcDpydW4tY29kZXhwcC11cGRhdGVcIixcbiAgXCJjb2RleHBwOnNldC1hdXRvLXVwZGF0ZVwiLFxuICBcImNvZGV4cHA6c2V0LXVwZGF0ZS1jb25maWdcIixcbl0gYXMgY29uc3Q7XG5cbi8qKlxuICogVHdlYWstdHJpZ2dlcmFibGUgcHJpdmlsZWdlZC9jYXBhYmlsaXR5IElQQy4gTWFpbiBtdXN0IHJlc29sdmUgaWRlbnRpdHksXG4gKiByZXF1aXJlIGRpc2NvdmVyZWQrZW5hYmxlZCwgYW5kIGVuZm9yY2UgdGhlIG1hcHBlZCBwZXJtaXNzaW9uLlxuICovXG5leHBvcnQgY29uc3QgVFdFQUtfQ0FQQUJJTElUWV9JUENfQ0hBTk5FTFMgPSB7XG4gIFwiY29kZXhwcDp0d2Vhay1mc1wiOiBcImZpbGVzeXN0ZW1cIixcbiAgXCJjb2RleHBwOmNvZGV4LXdpbmRvdy1jcmVhdGVcIjogXCJjb2RleC13aW5kb3dzXCIsXG4gIFwiY29kZXhwcDpjb2RleC13aW5kb3ctcHJpbWFyeVwiOiBcImNvZGV4LXdpbmRvd3NcIixcbiAgXCJjb2RleHBwOmNvZGV4LXdpbmRvdy1mb2N1c1wiOiBcImNvZGV4LXdpbmRvd3NcIixcbiAgXCJjb2RleHBwOmNvZGV4LXdpbmRvdy1zaG93XCI6IFwiY29kZXgtd2luZG93c1wiLFxuICBcImNvZGV4cHA6Y29kZXgtdmlldy1jcmVhdGVcIjogXCJjb2RleC12aWV3c1wiLFxuICBcImNvZGV4cHA6Y29kZXgtdmlldy1jYWxsXCI6IFwiY29kZXgtdmlld3NcIixcbiAgXCJjb2RleHBwOm5hdGl2ZS1sb2FkLW1vZHVsZVwiOiBcIm5hdGl2ZS1tb2R1bGVcIixcbiAgXCJjb2RleHBwOm5hdGl2ZS1tb2R1bGUtcmVxdWVzdFwiOiBcIm5hdGl2ZS1tb2R1bGVcIixcbiAgXCJjb2RleHBwOm5hdGl2ZS1tb2R1bGUtZGlzcG9zZVwiOiBcIm5hdGl2ZS1tb2R1bGVcIixcbiAgXCJjb2RleHBwOm5hdGl2ZS1jcmVhdGUtcGFuZWxcIjogXCJuYXRpdmUtdmlld1wiLFxuICBcImNvZGV4cHA6bmF0aXZlLWF0dGFjaC12aWV3XCI6IFwibmF0aXZlLXZpZXdcIixcbiAgXCJjb2RleHBwOm5hdGl2ZS1pbnN0YW5jZS1jYWxsXCI6IFwibmF0aXZlLXZpZXdcIixcbiAgXCJjb2RleHBwOm5hdGl2ZS1sYXVuY2gtaGVscGVyXCI6IFwibmF0aXZlLWhlbHBlclwiLFxuICBcImNvZGV4cHA6bmF0aXZlLWhlbHBlci1jYWxsXCI6IFwibmF0aXZlLWhlbHBlclwiLFxuICBcImNvZGV4cHA6Y29kZXgtcnVudGltZS1pbmZvXCI6IFwiY29kZXgtcnVudGltZVwiLFxuICBcImNvZGV4cHA6Y29kZXgtcnVudGltZS1jYXBhYmlsaXRpZXNcIjogXCJjb2RleC1ydW50aW1lXCIsXG4gIFwiY29kZXhwcDpjb2RleC1jZHAtc3RhdHVzXCI6IFwiY29kZXgtY2RwXCIsXG4gIFwiY29kZXhwcDpjb2RleC1jZHAtdGFyZ2V0c1wiOiBcImNvZGV4LWNkcFwiLFxuICBcImNvZGV4cHA6Y29kZXgtc2Vzc2lvbnMtbGlzdFwiOiBcImNvZGV4LXNlc3Npb25zXCIsXG4gIFwiY29kZXhwcDpjb2RleC1zZXNzaW9ucy1zdGF0dXNcIjogXCJjb2RleC1zZXNzaW9uc1wiLFxufSBhcyBjb25zdDtcblxuZXhwb3J0IHR5cGUgVHdlYWtDYXBhYmlsaXR5SXBjQ2hhbm5lbCA9IGtleW9mIHR5cGVvZiBUV0VBS19DQVBBQklMSVRZX0lQQ19DSEFOTkVMUztcblxuZXhwb3J0IGludGVyZmFjZSBUd2Vha0lkZW50aXR5U25hcHNob3Qge1xuICBpZDogc3RyaW5nO1xuICBlbmFibGVkOiBib29sZWFuO1xuICBkaXI6IHN0cmluZztcbiAgbWFuaWZlc3Q6IFR3ZWFrTWFuaWZlc3Q7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHdlYWtBcGlTdXJmYWNlIHtcbiAgc2V0dGluZ3M6IGJvb2xlYW47XG4gIGlwYzogYm9vbGVhbjtcbiAgZmlsZXN5c3RlbTogYm9vbGVhbjtcbiAgLyoqIERlY2xhcmF0aXZlIG9ubHkgXHUyMDE0IHByZWxvYWQgY2Fubm90IGJsb2NrIHdlYiBgZmV0Y2hgLiAqL1xuICBuZXR3b3JrOiBib29sZWFuO1xuICBjb2RleFJ1bnRpbWU6IGJvb2xlYW47XG4gIGNvZGV4V2luZG93czogYm9vbGVhbjtcbiAgY29kZXhWaWV3czogYm9vbGVhbjtcbiAgY29kZXhDZHA6IGJvb2xlYW47XG4gIG5hdGl2ZU1vZHVsZTogYm9vbGVhbjtcbiAgbmF0aXZlVmlldzogYm9vbGVhbjtcbiAgbmF0aXZlSGVscGVyOiBib29sZWFuO1xuICBjb2RleFNlc3Npb25zOiBib29sZWFuO1xufVxuXG5leHBvcnQgdHlwZSBUd2Vha0FwaVNsb3QgPSBcInByZXNlbnRcIiB8IFwiZGVuaWVkXCIgfCBcIm9taXR0ZWRcIjtcblxuZXhwb3J0IGludGVyZmFjZSBUd2Vha0FwaVBsYW4ge1xuICBzZXR0aW5nczogVHdlYWtBcGlTbG90O1xuICBpcGM6IFR3ZWFrQXBpU2xvdDtcbiAgZnM6IFR3ZWFrQXBpU2xvdDtcbiAgcmVhY3Q6IFR3ZWFrQXBpU2xvdDtcbiAgY29kZXg6IFR3ZWFrQXBpU2xvdDtcbiAgY29kZXhSdW50aW1lOiBUd2Vha0FwaVNsb3Q7XG4gIGNvZGV4V2luZG93czogVHdlYWtBcGlTbG90O1xuICBjb2RleFZpZXdzOiBUd2Vha0FwaVNsb3Q7XG4gIGNvZGV4Q2RwOiBUd2Vha0FwaVNsb3Q7XG4gIG5hdGl2ZU1vZHVsZTogVHdlYWtBcGlTbG90O1xuICBuYXRpdmVWaWV3OiBUd2Vha0FwaVNsb3Q7XG4gIG5hdGl2ZUhlbHBlcjogVHdlYWtBcGlTbG90O1xuICBjb2RleFNlc3Npb25zOiBUd2Vha0FwaVNsb3Q7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHdlYWtJcGNCcmlkZ2Uge1xuICBvbihjaGFubmVsOiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKTogdm9pZDtcbiAgcmVtb3ZlTGlzdGVuZXIoY2hhbm5lbDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCk6IHZvaWQ7XG4gIHNlbmQoY2hhbm5lbDogc3RyaW5nLCAuLi5hcmdzOiB1bmtub3duW10pOiB2b2lkO1xuICBpbnZva2UoY2hhbm5lbDogc3RyaW5nLCAuLi5hcmdzOiB1bmtub3duW10pOiBQcm9taXNlPHVua25vd24+O1xufVxuXG5jb25zdCBUV0VBS19JRF9SRSA9IC9eW2EtekEtWjAtOS5fLV0rJC87XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVQZXJtaXNzaW9uKHBlcm1pc3Npb246IHN0cmluZyk6IENhbm9uaWNhbFR3ZWFrUGVybWlzc2lvbiB7XG4gIGNvbnN0IGFsaWFzZWQgPSAoVFdFQUtfUEVSTUlTU0lPTl9BTElBU0VTIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4pW3Blcm1pc3Npb25dID8/IHBlcm1pc3Npb247XG4gIHJldHVybiBhbGlhc2VkIGFzIENhbm9uaWNhbFR3ZWFrUGVybWlzc2lvbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc0V4cGxpY2l0UGVybWlzc2lvbnMoXG4gIG1hbmlmZXN0OiBQaWNrPFR3ZWFrTWFuaWZlc3QsIFwicGVybWlzc2lvbnNcIj4sXG4pOiBib29sZWFuIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkobWFuaWZlc3QucGVybWlzc2lvbnMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNMZWdhY3lQZXJtaXNzaW9uTWFuaWZlc3QoXG4gIG1hbmlmZXN0OiBQaWNrPFR3ZWFrTWFuaWZlc3QsIFwicGVybWlzc2lvbnNcIj4sXG4pOiBib29sZWFuIHtcbiAgcmV0dXJuIG1hbmlmZXN0LnBlcm1pc3Npb25zID09PSB1bmRlZmluZWQ7XG59XG5cbmV4cG9ydCBjb25zdCBFWFBMSUNJVF9PTkxZX1BFUk1JU1NJT05TID0gbmV3IFNldDxDYW5vbmljYWxUd2Vha1Blcm1pc3Npb24+KFtcImNvZGV4LXNlc3Npb25zXCJdKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGhhc1R3ZWFrUGVybWlzc2lvbihcbiAgbWFuaWZlc3Q6IFBpY2s8VHdlYWtNYW5pZmVzdCwgXCJwZXJtaXNzaW9uc1wiPixcbiAgcGVybWlzc2lvbjogVHdlYWtQZXJtaXNzaW9uIHwgQ2Fub25pY2FsVHdlYWtQZXJtaXNzaW9uLFxuKTogYm9vbGVhbiB7XG4gIGNvbnN0IHdhbnRlZCA9IG5vcm1hbGl6ZVBlcm1pc3Npb24ocGVybWlzc2lvbik7XG4gIGlmIChFWFBMSUNJVF9PTkxZX1BFUk1JU1NJT05TLmhhcyh3YW50ZWQpKSB7XG4gICAgcmV0dXJuIChtYW5pZmVzdC5wZXJtaXNzaW9ucyA/PyBbXSkuc29tZSgoZW50cnkpID0+IG5vcm1hbGl6ZVBlcm1pc3Npb24oZW50cnkpID09PSB3YW50ZWQpO1xuICB9XG4gIGlmICghaGFzRXhwbGljaXRQZXJtaXNzaW9ucyhtYW5pZmVzdCkpIHJldHVybiB0cnVlO1xuICByZXR1cm4gKG1hbmlmZXN0LnBlcm1pc3Npb25zID8/IFtdKS5zb21lKChlbnRyeSkgPT4gbm9ybWFsaXplUGVybWlzc2lvbihlbnRyeSkgPT09IHdhbnRlZCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwZXJtaXNzaW9uRGVuaWVkTWVzc2FnZShcbiAgdHdlYWtJZDogc3RyaW5nLFxuICBwZXJtaXNzaW9uOiBUd2Vha1Blcm1pc3Npb24gfCBDYW5vbmljYWxUd2Vha1Blcm1pc3Npb24sXG4pOiBzdHJpbmcge1xuICByZXR1cm4gYHR3ZWFrICR7dHdlYWtJZH0gbXVzdCBkZWNsYXJlICR7bm9ybWFsaXplUGVybWlzc2lvbihwZXJtaXNzaW9uKX0gcGVybWlzc2lvbmA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwZXJtaXNzaW9uRGVuaWVkRXJyb3IoXG4gIHR3ZWFrSWQ6IHN0cmluZyxcbiAgcGVybWlzc2lvbjogVHdlYWtQZXJtaXNzaW9uIHwgQ2Fub25pY2FsVHdlYWtQZXJtaXNzaW9uLFxuKTogRXJyb3Ige1xuICByZXR1cm4gbmV3IEVycm9yKHBlcm1pc3Npb25EZW5pZWRNZXNzYWdlKHR3ZWFrSWQsIHBlcm1pc3Npb24pKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFR3ZWFrSGFzUGVybWlzc2lvbihcbiAgbWFuaWZlc3Q6IFR3ZWFrTWFuaWZlc3QsXG4gIHBlcm1pc3Npb246IFR3ZWFrUGVybWlzc2lvbiB8IENhbm9uaWNhbFR3ZWFrUGVybWlzc2lvbixcbik6IHZvaWQge1xuICBpZiAoIWhhc1R3ZWFrUGVybWlzc2lvbihtYW5pZmVzdCwgcGVybWlzc2lvbikpIHtcbiAgICB0aHJvdyBwZXJtaXNzaW9uRGVuaWVkRXJyb3IobWFuaWZlc3QuaWQsIHBlcm1pc3Npb24pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1ZhbGlkVHdlYWtJZCh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIHN0cmluZyB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgJiYgVFdFQUtfSURfUkUudGVzdCh2YWx1ZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRWYWxpZFR3ZWFrSWQodmFsdWU6IHVua25vd24pOiBhc3NlcnRzIHZhbHVlIGlzIHN0cmluZyB7XG4gIGlmICghaXNWYWxpZFR3ZWFrSWQodmFsdWUpKSB0aHJvdyBuZXcgRXJyb3IoXCJiYWQgdHdlYWsgaWRcIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBiaW5kT3duZWRUd2Vha0lkKG93bmVySWQ6IHN0cmluZywgcmVxdWVzdGVkSWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIGFzc2VydFZhbGlkVHdlYWtJZChvd25lcklkKTtcbiAgYXNzZXJ0VmFsaWRUd2Vha0lkKHJlcXVlc3RlZElkKTtcbiAgaWYgKG93bmVySWQgIT09IHJlcXVlc3RlZElkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGB0d2VhayAke293bmVySWR9IGNhbm5vdCB1c2UgdHdlYWsgJHtyZXF1ZXN0ZWRJZH0ncyBpZGVudGl0eWApO1xuICB9XG4gIHJldHVybiBvd25lcklkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHdlYWtBcGlTdXJmYWNlKFxuICBtYW5pZmVzdDogUGljazxUd2Vha01hbmlmZXN0LCBcInBlcm1pc3Npb25zXCI+LFxuKTogVHdlYWtBcGlTdXJmYWNlIHtcbiAgcmV0dXJuIHtcbiAgICBzZXR0aW5nczogaGFzVHdlYWtQZXJtaXNzaW9uKG1hbmlmZXN0LCBcInNldHRpbmdzXCIpLFxuICAgIGlwYzogaGFzVHdlYWtQZXJtaXNzaW9uKG1hbmlmZXN0LCBcImlwY1wiKSxcbiAgICBmaWxlc3lzdGVtOiBoYXNUd2Vha1Blcm1pc3Npb24obWFuaWZlc3QsIFwiZmlsZXN5c3RlbVwiKSxcbiAgICBuZXR3b3JrOiBoYXNUd2Vha1Blcm1pc3Npb24obWFuaWZlc3QsIFwibmV0d29ya1wiKSxcbiAgICBjb2RleFJ1bnRpbWU6IGhhc1R3ZWFrUGVybWlzc2lvbihtYW5pZmVzdCwgXCJjb2RleC1ydW50aW1lXCIpLFxuICAgIGNvZGV4V2luZG93czogaGFzVHdlYWtQZXJtaXNzaW9uKG1hbmlmZXN0LCBcImNvZGV4LXdpbmRvd3NcIiksXG4gICAgY29kZXhWaWV3czogaGFzVHdlYWtQZXJtaXNzaW9uKG1hbmlmZXN0LCBcImNvZGV4LXZpZXdzXCIpLFxuICAgIGNvZGV4Q2RwOiBoYXNUd2Vha1Blcm1pc3Npb24obWFuaWZlc3QsIFwiY29kZXgtY2RwXCIpLFxuICAgIG5hdGl2ZU1vZHVsZTogaGFzVHdlYWtQZXJtaXNzaW9uKG1hbmlmZXN0LCBcIm5hdGl2ZS1tb2R1bGVcIiksXG4gICAgbmF0aXZlVmlldzogaGFzVHdlYWtQZXJtaXNzaW9uKG1hbmlmZXN0LCBcIm5hdGl2ZS12aWV3XCIpLFxuICAgIG5hdGl2ZUhlbHBlcjogaGFzVHdlYWtQZXJtaXNzaW9uKG1hbmlmZXN0LCBcIm5hdGl2ZS1oZWxwZXJcIiksXG4gICAgY29kZXhTZXNzaW9uczogaGFzVHdlYWtQZXJtaXNzaW9uKG1hbmlmZXN0LCBcImNvZGV4LXNlc3Npb25zXCIpLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaGFzQW55Q29kZXhBcGkoc3VyZmFjZTogVHdlYWtBcGlTdXJmYWNlKTogYm9vbGVhbiB7XG4gIHJldHVybiAoXG4gICAgc3VyZmFjZS5jb2RleFJ1bnRpbWUgfHxcbiAgICBzdXJmYWNlLmNvZGV4V2luZG93cyB8fFxuICAgIHN1cmZhY2UuY29kZXhWaWV3cyB8fFxuICAgIHN1cmZhY2UuY29kZXhDZHAgfHxcbiAgICBzdXJmYWNlLm5hdGl2ZU1vZHVsZSB8fFxuICAgIHN1cmZhY2UubmF0aXZlVmlldyB8fFxuICAgIHN1cmZhY2UubmF0aXZlSGVscGVyIHx8XG4gICAgc3VyZmFjZS5jb2RleFNlc3Npb25zXG4gICk7XG59XG5cbmZ1bmN0aW9uIHNsb3QoYWxsb3dlZDogYm9vbGVhbiwgd2hlbkRlbmllZDogVHdlYWtBcGlTbG90KTogVHdlYWtBcGlTbG90IHtcbiAgcmV0dXJuIGFsbG93ZWQgPyBcInByZXNlbnRcIiA6IHdoZW5EZW5pZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwbGFuVHdlYWtBcGkobWFuaWZlc3Q6IFBpY2s8VHdlYWtNYW5pZmVzdCwgXCJwZXJtaXNzaW9uc1wiPik6IFR3ZWFrQXBpUGxhbiB7XG4gIGNvbnN0IHN1cmZhY2UgPSB0d2Vha0FwaVN1cmZhY2UobWFuaWZlc3QpO1xuICBjb25zdCBhbnlDb2RleCA9IGhhc0FueUNvZGV4QXBpKHN1cmZhY2UpO1xuICByZXR1cm4ge1xuICAgIHNldHRpbmdzOiBzbG90KHN1cmZhY2Uuc2V0dGluZ3MsIFwib21pdHRlZFwiKSxcbiAgICBpcGM6IHNsb3Qoc3VyZmFjZS5pcGMsIFwiZGVuaWVkXCIpLFxuICAgIGZzOiBzbG90KHN1cmZhY2UuZmlsZXN5c3RlbSwgXCJkZW5pZWRcIiksXG4gICAgcmVhY3Q6IFwicHJlc2VudFwiLFxuICAgIGNvZGV4OiBzbG90KGFueUNvZGV4LCBcIm9taXR0ZWRcIiksXG4gICAgY29kZXhSdW50aW1lOiBzbG90KHN1cmZhY2UuY29kZXhSdW50aW1lLCBcImRlbmllZFwiKSxcbiAgICBjb2RleFdpbmRvd3M6IHNsb3Qoc3VyZmFjZS5jb2RleFdpbmRvd3MsIFwiZGVuaWVkXCIpLFxuICAgIGNvZGV4Vmlld3M6IHNsb3Qoc3VyZmFjZS5jb2RleFZpZXdzLCBcImRlbmllZFwiKSxcbiAgICBjb2RleENkcDogc2xvdChzdXJmYWNlLmNvZGV4Q2RwLCBcImRlbmllZFwiKSxcbiAgICBuYXRpdmVNb2R1bGU6IHNsb3Qoc3VyZmFjZS5uYXRpdmVNb2R1bGUsIFwiZGVuaWVkXCIpLFxuICAgIG5hdGl2ZVZpZXc6IHNsb3Qoc3VyZmFjZS5uYXRpdmVWaWV3LCBcImRlbmllZFwiKSxcbiAgICBuYXRpdmVIZWxwZXI6IHNsb3Qoc3VyZmFjZS5uYXRpdmVIZWxwZXIsIFwiZGVuaWVkXCIpLFxuICAgIGNvZGV4U2Vzc2lvbnM6IHNsb3Qoc3VyZmFjZS5jb2RleFNlc3Npb25zLCBcImRlbmllZFwiKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNjb3BlZFR3ZWFrSXBjQ2hhbm5lbCh0d2Vha0lkOiBzdHJpbmcsIGNoYW5uZWw6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgY29kZXhwcDoke3R3ZWFrSWR9OiR7Y2hhbm5lbH1gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXV0aG9yaXplVHdlYWtDYXBhYmlsaXR5KFxuICBzbmFwc2hvdDogVHdlYWtJZGVudGl0eVNuYXBzaG90IHwgdW5kZWZpbmVkLFxuICByZXF1ZXN0ZWRJZDogdW5rbm93bixcbiAgcGVybWlzc2lvbjogVHdlYWtQZXJtaXNzaW9uIHwgQ2Fub25pY2FsVHdlYWtQZXJtaXNzaW9uLFxuICBvd25lcklkPzogc3RyaW5nLFxuKTogVHdlYWtJZGVudGl0eVNuYXBzaG90IHtcbiAgYXNzZXJ0VmFsaWRUd2Vha0lkKHJlcXVlc3RlZElkKTtcbiAgaWYgKG93bmVySWQgIT09IHVuZGVmaW5lZCkgYmluZE93bmVkVHdlYWtJZChvd25lcklkLCByZXF1ZXN0ZWRJZCk7XG4gIGlmICghc25hcHNob3QgfHwgc25hcHNob3QuaWQgIT09IHJlcXVlc3RlZElkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIHR3ZWFrOiAke3JlcXVlc3RlZElkfWApO1xuICB9XG4gIGlmICghc25hcHNob3QuZW5hYmxlZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgdHdlYWsgaXMgZGlzYWJsZWQ6ICR7cmVxdWVzdGVkSWR9YCk7XG4gIH1cbiAgYXNzZXJ0VHdlYWtIYXNQZXJtaXNzaW9uKHNuYXBzaG90Lm1hbmlmZXN0LCBwZXJtaXNzaW9uKTtcbiAgcmV0dXJuIHNuYXBzaG90O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRGVuaWVkTWV0aG9kKFxuICB0d2Vha0lkOiBzdHJpbmcsXG4gIHBlcm1pc3Npb246IFR3ZWFrUGVybWlzc2lvbiB8IENhbm9uaWNhbFR3ZWFrUGVybWlzc2lvbixcbik6ICguLi5hcmdzOiBuZXZlcltdKSA9PiBuZXZlciB7XG4gIHJldHVybiAoKSA9PiB7XG4gICAgdGhyb3cgcGVybWlzc2lvbkRlbmllZEVycm9yKHR3ZWFrSWQsIHBlcm1pc3Npb24pO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRGVuaWVkQXN5bmNNZXRob2QoXG4gIHR3ZWFrSWQ6IHN0cmluZyxcbiAgcGVybWlzc2lvbjogVHdlYWtQZXJtaXNzaW9uIHwgQ2Fub25pY2FsVHdlYWtQZXJtaXNzaW9uLFxuKTogKC4uLmFyZ3M6IG5ldmVyW10pID0+IFByb21pc2U8bmV2ZXI+IHtcbiAgcmV0dXJuIGFzeW5jICgpID0+IHtcbiAgICB0aHJvdyBwZXJtaXNzaW9uRGVuaWVkRXJyb3IodHdlYWtJZCwgcGVybWlzc2lvbik7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVEZW5pZWRUd2Vha0ZzKHR3ZWFrSWQ6IHN0cmluZyk6IFR3ZWFrRnMge1xuICBjb25zdCBkZW55ID0gY3JlYXRlRGVuaWVkQXN5bmNNZXRob2QodHdlYWtJZCwgXCJmaWxlc3lzdGVtXCIpO1xuICByZXR1cm4ge1xuICAgIGRhdGFEaXI6IGA8ZGVuaWVkPi90d2Vhay1kYXRhLyR7dHdlYWtJZH1gLFxuICAgIHJlYWQ6IGRlbnksXG4gICAgd3JpdGU6IGRlbnksXG4gICAgZXhpc3RzOiBkZW55LFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQm91bmRUd2Vha0ZzKFxuICBvd25lcklkOiBzdHJpbmcsXG4gIGludm9rZTogKGNoYW5uZWw6IHN0cmluZywgLi4uYXJnczogdW5rbm93bltdKSA9PiBQcm9taXNlPHVua25vd24+LFxuKTogVHdlYWtGcyB7XG4gIGNvbnN0IGlkID0gYmluZE93bmVkVHdlYWtJZChvd25lcklkLCBvd25lcklkKTtcbiAgcmV0dXJuIHtcbiAgICBkYXRhRGlyOiBgPHJlbW90ZT4vdHdlYWstZGF0YS8ke2lkfWAsXG4gICAgcmVhZDogKHJlbFBhdGg6IHN0cmluZykgPT5cbiAgICAgIGludm9rZShcImNvZGV4cHA6dHdlYWstZnNcIiwgXCJyZWFkXCIsIGlkLCByZWxQYXRoKSBhcyBQcm9taXNlPHN0cmluZz4sXG4gICAgd3JpdGU6IChyZWxQYXRoOiBzdHJpbmcsIGNvbnRlbnRzOiBzdHJpbmcpID0+XG4gICAgICBpbnZva2UoXCJjb2RleHBwOnR3ZWFrLWZzXCIsIFwid3JpdGVcIiwgaWQsIHJlbFBhdGgsIGNvbnRlbnRzKSBhcyBQcm9taXNlPHZvaWQ+LFxuICAgIGV4aXN0czogKHJlbFBhdGg6IHN0cmluZykgPT5cbiAgICAgIGludm9rZShcImNvZGV4cHA6dHdlYWstZnNcIiwgXCJleGlzdHNcIiwgaWQsIHJlbFBhdGgpIGFzIFByb21pc2U8Ym9vbGVhbj4sXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVEZW5pZWRUd2Vha0lwYyh0d2Vha0lkOiBzdHJpbmcpOiBUd2Vha0lwYyB7XG4gIGNvbnN0IGRlbnkgPSBjcmVhdGVEZW5pZWRNZXRob2QodHdlYWtJZCwgXCJpcGNcIik7XG4gIHJldHVybiB7XG4gICAgb246IGRlbnksXG4gICAgc2VuZDogZGVueSxcbiAgICBpbnZva2U6IGRlbnksXG4gICAgaGFuZGxlOiBkZW55LFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQm91bmRUd2Vha0lwYyhvd25lcklkOiBzdHJpbmcsIGJyaWRnZTogVHdlYWtJcGNCcmlkZ2UpOiBUd2Vha0lwYyB7XG4gIGNvbnN0IGlkID0gYmluZE93bmVkVHdlYWtJZChvd25lcklkLCBvd25lcklkKTtcbiAgY29uc3QgY2hhbm5lbE5hbWUgPSAoY2hhbm5lbDogc3RyaW5nKSA9PiBzY29wZWRUd2Vha0lwY0NoYW5uZWwoaWQsIGNoYW5uZWwpO1xuICByZXR1cm4ge1xuICAgIG9uOiAoY2hhbm5lbCwgaGFuZGxlcikgPT4ge1xuICAgICAgY29uc3Qgd3JhcHBlZCA9IChfZXZlbnQ6IHVua25vd24sIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gaGFuZGxlciguLi5hcmdzKTtcbiAgICAgIGJyaWRnZS5vbihjaGFubmVsTmFtZShjaGFubmVsKSwgd3JhcHBlZCk7XG4gICAgICByZXR1cm4gKCkgPT4gYnJpZGdlLnJlbW92ZUxpc3RlbmVyKGNoYW5uZWxOYW1lKGNoYW5uZWwpLCB3cmFwcGVkKTtcbiAgICB9LFxuICAgIHNlbmQ6IChjaGFubmVsLCAuLi5hcmdzKSA9PiBicmlkZ2Uuc2VuZChjaGFubmVsTmFtZShjaGFubmVsKSwgLi4uYXJncyksXG4gICAgaW52b2tlOiAoY2hhbm5lbCwgLi4uYXJncykgPT5cbiAgICAgIGJyaWRnZS5pbnZva2UoY2hhbm5lbE5hbWUoY2hhbm5lbCksIC4uLmFyZ3MpIGFzIFByb21pc2U8bmV2ZXI+LFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNMYXllckFkbWluSXBjQ2hhbm5lbChjaGFubmVsOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIChMQVlFUl9BRE1JTl9JUENfQ0hBTk5FTFMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKGNoYW5uZWwpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHdlYWtQZXJtaXNzaW9uRm9ySXBjQ2hhbm5lbChcbiAgY2hhbm5lbDogc3RyaW5nLFxuKTogQ2Fub25pY2FsVHdlYWtQZXJtaXNzaW9uIHwgdW5kZWZpbmVkIHtcbiAgcmV0dXJuIChUV0VBS19DQVBBQklMSVRZX0lQQ19DSEFOTkVMUyBhcyBSZWNvcmQ8c3RyaW5nLCBDYW5vbmljYWxUd2Vha1Blcm1pc3Npb24gfCB1bmRlZmluZWQ+KVtcbiAgICBjaGFubmVsXG4gIF07XG59XG4iLCAiLyoqXG4gKiBQZXItdHdlYWsgZmlsZXN5c3RlbSBzYW5kYm94LiBUd2Vha3MgbWF5IG9ubHkgcmVhZC93cml0ZSB1bmRlclxuICogYDx1c2VyUm9vdD4vdHdlYWstZGF0YS88dHdlYWtJZD4vYC4gSWRlbnRpdHkgaXMgYm91bmQgYnkgdGhlIGNhbGxlcjtcbiAqIHRoaXMgaGVscGVyIG5ldmVyIHRydXN0cyBhIHBhdGggdGhhdCBlc2NhcGVzIHRoYXQgZGlyZWN0b3J5LlxuICovXG5pbXBvcnQgeyBta2RpclN5bmMgfSBmcm9tIFwibm9kZTpmc1wiO1xuaW1wb3J0IHsgam9pbiwgcmVzb2x2ZSB9IGZyb20gXCJub2RlOnBhdGhcIjtcbmltcG9ydCB7IGlzUGF0aEluc2lkZSB9IGZyb20gXCIuL25hdGl2ZS1wYXRoc1wiO1xuaW1wb3J0IHsgYXNzZXJ0VmFsaWRUd2Vha0lkIH0gZnJvbSBcIi4vdHdlYWstcGVybWlzc2lvbnNcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIHR3ZWFrRGF0YURpcih1c2VyUm9vdDogc3RyaW5nLCB0d2Vha0lkOiBzdHJpbmcpOiBzdHJpbmcge1xuICBhc3NlcnRWYWxpZFR3ZWFrSWQodHdlYWtJZCk7XG4gIHJldHVybiBqb2luKHVzZXJSb290LCBcInR3ZWFrLWRhdGFcIiwgdHdlYWtJZCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVUd2Vha0RhdGFEaXIodXNlclJvb3Q6IHN0cmluZywgdHdlYWtJZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgZGlyID0gdHdlYWtEYXRhRGlyKHVzZXJSb290LCB0d2Vha0lkKTtcbiAgbWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gIHJldHVybiBkaXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlVHdlYWtEYXRhUGF0aChcbiAgdXNlclJvb3Q6IHN0cmluZyxcbiAgdHdlYWtJZDogc3RyaW5nLFxuICByZWxQYXRoOiBzdHJpbmcsXG4pOiB7IGRpcjogc3RyaW5nOyBmdWxsOiBzdHJpbmcgfSB7XG4gIGNvbnN0IGRpciA9IHR3ZWFrRGF0YURpcih1c2VyUm9vdCwgdHdlYWtJZCk7XG4gIGNvbnN0IGZ1bGwgPSByZXNvbHZlKGRpciwgcmVsUGF0aCk7XG4gIGlmICghaXNQYXRoSW5zaWRlKGRpciwgZnVsbCkgfHwgZnVsbCA9PT0gZGlyKSB0aHJvdyBuZXcgRXJyb3IoXCJwYXRoIHRyYXZlcnNhbFwiKTtcbiAgcmV0dXJuIHsgZGlyLCBmdWxsIH07XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBVUEsSUFBQUEsbUJBQXdEO0FBQ3hELElBQUFDLG1CQUEyQjtBQUMzQixJQUFBQyxxQkFBOEI7OztBQ1g5QixJQUFBQyxhQUErQjtBQUMvQixJQUFBQyxt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QUFBLEVBQVE7QUFBQSxFQUFRO0FBQUEsRUFBUTtBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDNUQ7QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDbkQ7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFNO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUMxQztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQ3JGO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFTO0FBQUEsRUFDeEI7QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQ3RDO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFXO0FBQUEsRUFDekI7QUFBQSxFQUFLO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQ3REO0FBQUEsRUFBUztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUMvRTtBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFDZjtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDakY7QUFBQSxFQUNBO0FBQUEsRUFBTztB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TUFBTTtBQUNiLHFCQUFlLE9BQU8sTUFBTTtBQUFBLElBQzlCO0FBQUEsRUFDRjtBQUNGO0FBRUEsU0FBUyxvQkFBb0IsT0FBNkI7QUFDeEQsU0FBTztBQUFBO0FBQUEseUJBRWdCLFNBQVMsS0FBSyxDQUFDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFnZHhDO0FBRUEsU0FBUywwQkFBZ0M7QUFDdkMsTUFBSSxRQUFRLGFBQWEsVUFBVTtBQUNqQyxRQUFJO0FBQ0YsMEJBQUksS0FBSztBQUFBLElBQ1gsUUFBUTtBQUFBLElBQUM7QUFBQSxFQUNYO0FBQ0EsYUFBVyxPQUFPLDhCQUFjLGNBQWMsR0FBRztBQUMvQyxRQUFJLElBQUksWUFBWSxFQUFHO0FBQ3ZCLFFBQUksY0FBYyxJQUFJLFlBQVksT0FBTyxXQUFXLFlBQVksR0FBSTtBQUNwRSxRQUFJLENBQUMsSUFBSSxVQUFVLEVBQUc7QUFDdEIsUUFBSTtBQUNGLFVBQUksS0FBSztBQUFBLElBQ1gsUUFBUTtBQUFBLElBQUM7QUFBQSxFQUNYO0FBQ0Y7QUFFQSxTQUFTLHNCQUFzQixNQUE2QztBQUMxRSxRQUFNLGFBQWEsTUFBTSxLQUFLLFVBQVU7QUFDeEMsU0FBTztBQUFBLElBQ0wsSUFBSSxLQUFLLFlBQVk7QUFBQSxJQUNyQixhQUFhLEtBQUs7QUFBQSxJQUNsQixJQUFJLENBQUMsT0FBaUIsYUFBeUI7QUFDN0MsVUFBSSxVQUFVLFNBQVUsTUFBSyxZQUFZLEtBQUssYUFBYSxRQUFRO0FBQUEsVUFDOUQsTUFBSyxZQUFZLEdBQUcsT0FBTyxRQUFRO0FBQ3hDLGFBQU87QUFBQSxJQUNUO0FBQUEsSUFDQSxNQUFNLENBQUMsT0FBZSxhQUEyQztBQUMvRCxXQUFLLFlBQVksS0FBSyxPQUFzQixRQUFRO0FBQ3BELGFBQU87QUFBQSxJQUNUO0FBQUEsSUFDQSxLQUFLLENBQUMsT0FBZSxhQUEyQztBQUM5RCxXQUFLLFlBQVksSUFBSSxPQUFzQixRQUFRO0FBQ25ELGFBQU87QUFBQSxJQUNUO0FBQUEsSUFDQSxnQkFBZ0IsQ0FBQyxPQUFlLGFBQTJDO0FBQ3pFLFdBQUssWUFBWSxlQUFlLE9BQXNCLFFBQVE7QUFDOUQsYUFBTztBQUFBLElBQ1Q7QUFBQSxJQUNBLGFBQWEsTUFBTSxLQUFLLFlBQVksWUFBWTtBQUFBLElBQ2hELFdBQVcsTUFBTSxLQUFLLFlBQVksVUFBVTtBQUFBLElBQzVDLE9BQU8sTUFBTSxLQUFLLFlBQVksTUFBTTtBQUFBLElBQ3BDLE1BQU0sTUFBTTtBQUFBLElBQUM7QUFBQSxJQUNiLE1BQU0sTUFBTTtBQUFBLElBQUM7QUFBQSxJQUNiLFdBQVc7QUFBQSxJQUNYLGtCQUFrQjtBQUFBLElBQ2xCLFNBQVMsTUFBTTtBQUNiLFlBQU0sSUFBSSxXQUFXO0FBQ3JCLGFBQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxNQUFNO0FBQUEsSUFDM0I7QUFBQSxJQUNBLGdCQUFnQixNQUFNO0FBQ3BCLFlBQU0sSUFBSSxXQUFXO0FBQ3JCLGFBQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxNQUFNO0FBQUEsSUFDM0I7QUFBQSxJQUNBLFVBQVUsTUFBTTtBQUFBLElBQUM7QUFBQSxJQUNqQixVQUFVLE1BQU07QUFBQSxJQUNoQix3QkFBd0IsTUFBTTtBQUFBLElBQUM7QUFBQSxJQUMvQixtQkFBbUIsTUFBTTtBQUFBLElBQUM7QUFBQSxJQUMxQiwyQkFBMkIsTUFBTTtBQUFBLElBQUM7QUFBQSxFQUNwQztBQUNGO0FBRUEsU0FBUyxnQkFBZ0IsS0FBc0IsUUFBZ0IsTUFBbUM7QUFDaEcsUUFBTSxNQUFNLElBQUksUUFBUSxtQkFBbUI7QUFDM0MsTUFBSSxPQUFPLFFBQVEsU0FBVSxPQUFNLElBQUksTUFBTSwyQkFBMkI7QUFDeEUsUUFBTSxhQUFTLCtCQUFXLE1BQU0sRUFDN0IsT0FBTyxHQUFHLEdBQUcsc0NBQXNDLEVBQ25ELE9BQU8sUUFBUTtBQUNsQixTQUFPO0FBQUEsSUFDTDtBQUFBLE1BQ0U7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0EseUJBQXlCLE1BQU07QUFBQSxNQUMvQjtBQUFBLElBQ0YsRUFBRSxLQUFLLE1BQU07QUFBQSxFQUNmO0FBQ0EsUUFBTSxLQUFLLElBQUksb0JBQW9CLE1BQU07QUFDekMsTUFBSSxLQUFLLFNBQVMsRUFBRyxJQUFHLFdBQVcsSUFBSTtBQUN2QyxTQUFPO0FBQ1Q7QUFFQSxJQUFNLHNCQUFOLE1BQTBCO0FBQUEsRUFNeEIsWUFBNkIsUUFBZ0I7QUFBaEI7QUFDM0IsV0FBTyxHQUFHLFFBQVEsQ0FBQyxVQUFVLEtBQUssV0FBVyxLQUFLLENBQUM7QUFDbkQsV0FBTyxHQUFHLFNBQVMsTUFBTSxLQUFLLFVBQVUsQ0FBQztBQUN6QyxXQUFPLEdBQUcsU0FBUyxNQUFNLEtBQUssVUFBVSxDQUFDO0FBQUEsRUFDM0M7QUFBQSxFQUo2QjtBQUFBLEVBTHJCLFNBQVMsT0FBTyxNQUFNLENBQUM7QUFBQSxFQUN2QixlQUFlLG9CQUFJLElBQTRCO0FBQUEsRUFDL0MsZ0JBQWdCLG9CQUFJLElBQWdCO0FBQUEsRUFDcEMsU0FBUztBQUFBLEVBUWpCLFdBQVcsT0FBcUI7QUFDOUIsUUFBSSxLQUFLLE9BQVE7QUFDakIsU0FBSyxTQUFTLE9BQU8sT0FBTyxDQUFDLEtBQUssUUFBUSxLQUFLLENBQUM7QUFDaEQsU0FBSyxXQUFXO0FBQUEsRUFDbEI7QUFBQSxFQUVBLE9BQU8sU0FBdUM7QUFDNUMsU0FBSyxhQUFhLElBQUksT0FBTztBQUFBLEVBQy9CO0FBQUEsRUFFQSxRQUFRLFNBQTJCO0FBQ2pDLFNBQUssY0FBYyxJQUFJLE9BQU87QUFBQSxFQUNoQztBQUFBLEVBRUEsU0FBUyxTQUF3QjtBQUMvQixTQUFLLFNBQVMsS0FBSyxVQUFVLE9BQU8sQ0FBQztBQUFBLEVBQ3ZDO0FBQUEsRUFFQSxTQUFTLE1BQW9CO0FBQzNCLFNBQUssVUFBVSxHQUFLLE9BQU8sS0FBSyxNQUFNLE1BQU0sQ0FBQztBQUFBLEVBQy9DO0FBQUEsRUFFQSxRQUFjO0FBQ1osUUFBSSxLQUFLLE9BQVE7QUFDakIsUUFBSTtBQUNGLFdBQUssVUFBVSxHQUFLLE9BQU8sTUFBTSxDQUFDLENBQUM7QUFBQSxJQUNyQyxRQUFRO0FBQUEsSUFBQztBQUNULFNBQUssU0FBUztBQUNkLFNBQUssT0FBTyxJQUFJO0FBQ2hCLFNBQUssVUFBVTtBQUFBLEVBQ2pCO0FBQUEsRUFFUSxhQUFtQjtBQUN6QixXQUFPLEtBQUssT0FBTyxVQUFVLEdBQUc7QUFDOUIsWUFBTSxRQUFRLEtBQUssT0FBTyxDQUFDO0FBQzNCLFlBQU0sU0FBUyxLQUFLLE9BQU8sQ0FBQztBQUM1QixZQUFNLFNBQVMsUUFBUTtBQUN2QixZQUFNLFVBQVUsU0FBUyxTQUFVO0FBQ25DLFVBQUksU0FBUyxTQUFTO0FBQ3RCLFVBQUksU0FBUztBQUNiLFVBQUksV0FBVyxLQUFLO0FBQ2xCLFlBQUksS0FBSyxPQUFPLFNBQVMsU0FBUyxFQUFHO0FBQ3JDLGlCQUFTLEtBQUssT0FBTyxhQUFhLE1BQU07QUFDeEMsa0JBQVU7QUFBQSxNQUNaLFdBQVcsV0FBVyxLQUFLO0FBQ3pCLFlBQUksS0FBSyxPQUFPLFNBQVMsU0FBUyxFQUFHO0FBQ3JDLGNBQU0sT0FBTyxLQUFLLE9BQU8sYUFBYSxNQUFNO0FBQzVDLGNBQU0sTUFBTSxLQUFLLE9BQU8sYUFBYSxTQUFTLENBQUM7QUFDL0MsWUFBSSxTQUFTLEdBQUc7QUFDZCxlQUFLLE1BQU07QUFDWDtBQUFBLFFBQ0Y7QUFDQSxpQkFBUztBQUNULGtCQUFVO0FBQUEsTUFDWjtBQUNBLFlBQU0sYUFBYTtBQUNuQixVQUFJLE9BQVEsV0FBVTtBQUN0QixVQUFJLEtBQUssT0FBTyxTQUFTLFNBQVMsT0FBUTtBQUUxQyxZQUFNLE9BQU8sU0FBUyxLQUFLLE9BQU8sU0FBUyxZQUFZLGFBQWEsQ0FBQyxJQUFJO0FBQ3pFLFlBQU0sVUFBVSxPQUFPLEtBQUssS0FBSyxPQUFPLFNBQVMsUUFBUSxTQUFTLE1BQU0sQ0FBQztBQUN6RSxXQUFLLFNBQVMsS0FBSyxPQUFPLFNBQVMsU0FBUyxNQUFNO0FBQ2xELFVBQUksTUFBTTtBQUNSLGlCQUFTLElBQUksR0FBRyxJQUFJLFFBQVEsUUFBUSxLQUFLLEVBQUcsU0FBUSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUM7QUFBQSxNQUN0RTtBQUVBLFVBQUksV0FBVyxHQUFLO0FBQ2xCLGFBQUssTUFBTTtBQUFBLE1BQ2IsV0FBVyxXQUFXLEdBQUs7QUFDekIsYUFBSyxVQUFVLElBQUssT0FBTztBQUFBLE1BQzdCLFdBQVcsV0FBVyxHQUFLO0FBQ3pCLGNBQU0sT0FBTyxRQUFRLFNBQVMsTUFBTTtBQUNwQyxtQkFBVyxXQUFXLENBQUMsR0FBRyxLQUFLLFlBQVksRUFBRyxTQUFRLElBQUk7QUFBQSxNQUM1RDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFFUSxVQUFVLFFBQWdCLFNBQXVCO0FBQ3ZELFFBQUksS0FBSyxVQUFVLFdBQVcsRUFBSztBQUNuQyxVQUFNLFNBQVMsUUFBUTtBQUN2QixRQUFJO0FBQ0osUUFBSSxTQUFTLEtBQUs7QUFDaEIsZUFBUyxPQUFPLEtBQUssQ0FBQyxNQUFPLFFBQVEsTUFBTSxDQUFDO0FBQUEsSUFDOUMsV0FBVyxVQUFVLE9BQVE7QUFDM0IsZUFBUyxPQUFPLE1BQU0sQ0FBQztBQUN2QixhQUFPLENBQUMsSUFBSSxNQUFPO0FBQ25CLGFBQU8sQ0FBQyxJQUFJO0FBQ1osYUFBTyxjQUFjLFFBQVEsQ0FBQztBQUFBLElBQ2hDLE9BQU87QUFDTCxlQUFTLE9BQU8sTUFBTSxFQUFFO0FBQ3hCLGFBQU8sQ0FBQyxJQUFJLE1BQU87QUFDbkIsYUFBTyxDQUFDLElBQUk7QUFDWixhQUFPLGNBQWMsR0FBRyxDQUFDO0FBQ3pCLGFBQU8sY0FBYyxRQUFRLENBQUM7QUFBQSxJQUNoQztBQUNBLFNBQUssT0FBTyxNQUFNLE9BQU8sT0FBTyxDQUFDLFFBQVEsT0FBTyxDQUFDLENBQUM7QUFBQSxFQUNwRDtBQUFBLEVBRVEsWUFBa0I7QUFDeEIsUUFBSSxDQUFDLEtBQUssT0FBUSxNQUFLLFNBQVM7QUFDaEMsZUFBVyxXQUFXLENBQUMsR0FBRyxLQUFLLGFBQWEsRUFBRyxTQUFRO0FBQ3ZELFNBQUssY0FBYyxNQUFNO0FBQ3pCLFNBQUssYUFBYSxNQUFNO0FBQUEsRUFDMUI7QUFDRjtBQUVBLFNBQVMsV0FBVyxLQUFrQztBQUNwRCxNQUFJO0FBQ0YsV0FBTyxJQUFJLElBQUksSUFBSSxPQUFPLEtBQUssa0JBQWtCO0FBQUEsRUFDbkQsUUFBUTtBQUNOLFdBQU87QUFBQSxFQUNUO0FBQ0Y7QUFFQSxTQUFTLGFBQWEsS0FBd0M7QUFDNUQsU0FBTyxJQUFJLFFBQVEsQ0FBQ0EsV0FBUyxXQUFXO0FBQ3RDLFVBQU0sU0FBbUIsQ0FBQztBQUMxQixRQUFJLFFBQVE7QUFDWixRQUFJLEdBQUcsUUFBUSxDQUFDLFVBQWtCO0FBQ2hDLGVBQVMsTUFBTTtBQUNmLFVBQUksUUFBUSxPQUFPLE1BQU07QUFDdkIsZUFBTyxJQUFJLE1BQU0sd0JBQXdCLENBQUM7QUFDMUMsWUFBSSxRQUFRO0FBQ1o7QUFBQSxNQUNGO0FBQ0EsYUFBTyxLQUFLLEtBQUs7QUFBQSxJQUNuQixDQUFDO0FBQ0QsUUFBSSxHQUFHLE9BQU8sTUFBTTtBQUNsQixZQUFNLE1BQU0sT0FBTyxPQUFPLE1BQU0sRUFBRSxTQUFTLE1BQU07QUFDakQsVUFBSSxDQUFDLEtBQUs7QUFDUixRQUFBQSxVQUFRLElBQUk7QUFDWjtBQUFBLE1BQ0Y7QUFDQSxVQUFJO0FBQ0YsUUFBQUEsVUFBUSxLQUFLLE1BQU0sR0FBRyxDQUFDO0FBQUEsTUFDekIsU0FBUyxPQUFPO0FBQ2QsZUFBTyxLQUFLO0FBQUEsTUFDZDtBQUFBLElBQ0YsQ0FBQztBQUNELFFBQUksR0FBRyxTQUFTLE1BQU07QUFBQSxFQUN4QixDQUFDO0FBQ0g7QUFFQSxTQUFTLFNBQVMsS0FBcUIsUUFBZ0IsTUFBcUI7QUFDMUUsYUFBVyxLQUFLLFFBQVEsT0FBTyxLQUFLLEtBQUssVUFBVSxJQUFJLENBQUMsR0FBRyxXQUFXLE9BQU8sR0FBRyxLQUFLO0FBQ3ZGO0FBRUEsU0FBUyxTQUFTLEtBQXFCLFFBQWdCLE1BQWMsYUFBMkI7QUFDOUYsYUFBVyxLQUFLLFFBQVEsT0FBTyxLQUFLLElBQUksR0FBRyxhQUFhLEtBQUs7QUFDL0Q7QUFFQSxTQUFTLFdBQ1AsS0FDQSxRQUNBLE1BQ0EsYUFDQSxVQUNNO0FBQ04sTUFBSSxVQUFVLFFBQVE7QUFBQSxJQUNwQixnQkFBZ0I7QUFBQSxJQUNoQixrQkFBa0IsS0FBSztBQUFBLElBQ3ZCLGlCQUFpQjtBQUFBLEVBQ25CLENBQUM7QUFDRCxNQUFJLFNBQVUsS0FBSSxJQUFJO0FBQUEsTUFDakIsS0FBSSxJQUFJLElBQUk7QUFDbkI7QUFFQSxTQUFTLGNBQXNCO0FBQzdCLGFBQU8sd0JBQUssUUFBUSxlQUFlLFlBQVksU0FBUztBQUMxRDtBQUVBLFNBQVMsWUFBWSxVQUFpQztBQUNwRCxRQUFNLFlBQVksbUJBQW1CLFFBQVEsRUFBRSxRQUFRLFFBQVEsRUFBRTtBQUNqRSxNQUFJLENBQUMsYUFBYSxVQUFVLFNBQVMsSUFBSSxFQUFHLFFBQU87QUFDbkQsUUFBTSxPQUFPLFlBQVk7QUFDekIsUUFBTSxXQUFPLGlDQUFVLHdCQUFLLE1BQU0sU0FBUyxDQUFDO0FBQzVDLFFBQU0sVUFBTSw0QkFBUyxNQUFNLElBQUk7QUFDL0IsTUFBSSxJQUFJLFdBQVcsSUFBSSxLQUFLLFFBQVEsR0FBSSxRQUFPO0FBQy9DLE1BQUksS0FBQyw0QkFBVyxJQUFJLEtBQUssS0FBQywwQkFBUyxJQUFJLEVBQUUsT0FBTyxFQUFHLFFBQU87QUFDMUQsU0FBTztBQUNUO0FBRUEsU0FBUyxTQUFTLE1BQXNCO0FBQ3RDLFFBQU0sTUFBTSxLQUFLLFlBQVksR0FBRztBQUNoQyxRQUFNLE1BQU0sT0FBTyxJQUFJLEtBQUssTUFBTSxHQUFHLEVBQUUsWUFBWSxJQUFJO0FBQ3ZELFNBQU8sV0FBVyxHQUFHLEtBQUs7QUFDNUI7QUFFQSxTQUFTLGlCQUF5QztBQUNoRCxNQUFJLENBQUMsY0FBZSxPQUFNLElBQUksTUFBTSw2Q0FBNkM7QUFDakYsU0FBTztBQUNUO0FBRUEsU0FBUyxzQkFBc0IsUUFBdUM7QUFDcEUsU0FBTyxDQUFDLENBQUMsY0FBYyxDQUFDLFdBQVcsWUFBWSxZQUFZLEtBQUssT0FBTyxPQUFPLFdBQVcsWUFBWTtBQUN2RztBQUVBLFNBQVMsbUJBQW1CLFFBQXNCO0FBQ2hELE1BQUksQ0FBQyxxQkFBcUIsS0FBSyxNQUFNLEVBQUcsT0FBTSxJQUFJLE1BQU0sdUJBQXVCO0FBQ2pGO0FBRUEsU0FBUyxVQUFVLE9BQTJCLFVBQTBCO0FBQ3RFLFFBQU0sU0FBUyxPQUFPLEtBQUs7QUFDM0IsU0FBTyxPQUFPLFVBQVUsTUFBTSxLQUFLLFNBQVMsS0FBSyxVQUFVLFFBQVEsU0FBUztBQUM5RTtBQUVBLFNBQVNELFVBQVMsT0FBZ0Q7QUFDaEUsU0FBTyxTQUFTLE9BQU8sVUFBVSxXQUFXLFFBQW1DO0FBQ2pGO0FBRUEsU0FBUyxjQUFjLE9BQXlDO0FBQzlELFFBQU0sU0FBU0EsVUFBUyxLQUFLO0FBQzdCLFNBQU8sVUFBVSxDQUFDLE1BQU0sUUFBUSxNQUFNLElBQUksU0FBUyxDQUFDO0FBQ3REO0FBRUEsU0FBUyw0QkFBb0M7QUFDM0MsU0FBTyw0QkFBWSxzQkFBc0IsU0FBUztBQUNwRDtBQUVBLFNBQVMsU0FBUyxPQUF3QjtBQUN4QyxTQUFPLEtBQUssVUFBVSxLQUFLLEVBQUUsUUFBUSxNQUFNLFNBQVM7QUFDdEQ7QUFFQSxTQUFTLE1BQU0sSUFBMkI7QUFDeEMsU0FBTyxJQUFJLFFBQVEsQ0FBQ0MsY0FBWSxXQUFXQSxXQUFTLEVBQUUsQ0FBQztBQUN6RDs7O0FDOXVDQSxJQUFBQyxrQkFBNkI7QUFDN0IsSUFBQUMsb0JBQThDO0FBRXZDLFNBQVMsdUJBQXVCLFVBQWtCLE1BQXNCO0FBQzdFLE1BQUksT0FBTyxTQUFTLFlBQVksS0FBSyxLQUFLLE1BQU0sR0FBSSxPQUFNLElBQUksTUFBTSx5QkFBeUI7QUFDN0YsUUFBTSxXQUFPLDhCQUFhLFFBQVE7QUFDbEMsUUFBTSxXQUFPLDJCQUFRLFVBQVUsSUFBSTtBQUNuQyxNQUFJO0FBQ0osTUFBSTtBQUNGLGlCQUFTLDhCQUFhLElBQUk7QUFBQSxFQUM1QixRQUFRO0FBQ04sVUFBTSxJQUFJLE1BQU0sNEJBQTRCO0FBQUEsRUFDOUM7QUFDQSxNQUFJLENBQUMsYUFBYSxNQUFNLE1BQU0sS0FBSyxXQUFXLE1BQU07QUFDbEQsVUFBTSxJQUFJLE1BQU0sa0RBQWtEO0FBQUEsRUFDcEU7QUFDQSxTQUFPO0FBQ1Q7QUFFTyxTQUFTLGFBQWEsUUFBZ0IsUUFBeUI7QUFDcEUsUUFBTSxVQUFNLGdDQUFTLDJCQUFRLE1BQU0sT0FBRywyQkFBUSxNQUFNLENBQUM7QUFDckQsU0FBTyxRQUFRLE1BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLFdBQVcsSUFBSSxLQUFLLEtBQUMsOEJBQVcsR0FBRztBQUN6RTs7O0FDbEJBLElBQUFDLGtCQUEwQjtBQUMxQixJQUFBQyxrQkFBd0I7QUFDeEIsSUFBQUMsb0JBQThCOzs7QUNIdkIsSUFBTSxrQ0FBa0M7QUFFeEMsSUFBTSxrQ0FDWDtBQUNLLElBQU0sZ0NBQ1gsNkRBQTZELCtCQUErQjtBQXNDOUYsSUFBTSxpQkFBaUI7QUFDdkIsSUFBTSxjQUFjO0FBRWIsU0FBUyxvQkFBb0IsT0FBdUI7QUFDekQsUUFBTSxNQUFNLE1BQU0sS0FBSztBQUN2QixNQUFJLENBQUMsSUFBSyxPQUFNLElBQUksTUFBTSx5QkFBeUI7QUFFbkQsUUFBTSxNQUFNLCtDQUErQyxLQUFLLEdBQUc7QUFDbkUsTUFBSSxJQUFLLFFBQU8sa0JBQWtCLElBQUksQ0FBQyxDQUFDO0FBRXhDLE1BQUksZ0JBQWdCLEtBQUssR0FBRyxHQUFHO0FBQzdCLFVBQU0sTUFBTSxJQUFJLElBQUksR0FBRztBQUN2QixRQUFJLElBQUksYUFBYSxhQUFjLE9BQU0sSUFBSSxNQUFNLDRDQUE0QztBQUMvRixVQUFNLFFBQVEsSUFBSSxTQUFTLFFBQVEsY0FBYyxFQUFFLEVBQUUsTUFBTSxHQUFHO0FBQzlELFFBQUksTUFBTSxTQUFTLEVBQUcsT0FBTSxJQUFJLE1BQU0sbURBQW1EO0FBQ3pGLFdBQU8sa0JBQWtCLEdBQUcsTUFBTSxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxFQUFFO0FBQUEsRUFDcEQ7QUFFQSxTQUFPLGtCQUFrQixHQUFHO0FBQzlCO0FBRU8sU0FBUyx1QkFBdUIsT0FBb0M7QUFDekUsUUFBTSxXQUFXO0FBQ2pCLE1BQUksQ0FBQyxZQUFZLFNBQVMsa0JBQWtCLEtBQUssQ0FBQyxNQUFNLFFBQVEsU0FBUyxPQUFPLEdBQUc7QUFDakYsVUFBTSxJQUFJLE1BQU0sa0NBQWtDO0FBQUEsRUFDcEQ7QUFDQSxRQUFNLFVBQVUsU0FBUyxRQUFRLElBQUksbUJBQW1CO0FBQ3hELFVBQVEsS0FBSyxDQUFDLEdBQUcsTUFBTSxFQUFFLFNBQVMsS0FBSyxjQUFjLEVBQUUsU0FBUyxJQUFJLENBQUM7QUFDckUsU0FBTztBQUFBLElBQ0wsZUFBZTtBQUFBLElBQ2YsYUFBYSxPQUFPLFNBQVMsZ0JBQWdCLFdBQVcsU0FBUyxjQUFjO0FBQUEsSUFDL0U7QUFBQSxFQUNGO0FBQ0Y7QUFFTyxTQUFTLG9CQUNkLFNBQ0EsY0FBZ0QsQ0FBQyxpQkFBaUIsS0FBSyxNQUFNLEtBQUssT0FBTyxJQUFJLFlBQVksR0FDcEc7QUFDTCxRQUFNLFdBQVcsQ0FBQyxHQUFHLE9BQU87QUFDNUIsV0FBUyxJQUFJLFNBQVMsU0FBUyxHQUFHLElBQUksR0FBRyxLQUFLLEdBQUc7QUFDL0MsVUFBTSxJQUFJLFlBQVksSUFBSSxDQUFDO0FBQzNCLFFBQUksQ0FBQyxPQUFPLFVBQVUsQ0FBQyxLQUFLLElBQUksS0FBSyxJQUFJLEdBQUc7QUFDMUMsWUFBTSxJQUFJLE1BQU0sZ0NBQWdDLENBQUMsbUNBQW1DLENBQUMsRUFBRTtBQUFBLElBQ3pGO0FBQ0EsS0FBQyxTQUFTLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUM7QUFBQSxFQUN4RDtBQUNBLFNBQU87QUFDVDtBQUVPLFNBQVMsb0JBQW9CLE9BQWlDO0FBQ25FLFFBQU0sUUFBUTtBQUNkLE1BQUksQ0FBQyxTQUFTLE9BQU8sVUFBVSxTQUFVLE9BQU0sSUFBSSxNQUFNLDJCQUEyQjtBQUNwRixRQUFNLE9BQU8sb0JBQW9CLE9BQU8sTUFBTSxRQUFRLE1BQU0sVUFBVSxjQUFjLEVBQUUsQ0FBQztBQUN2RixRQUFNLFdBQVcsTUFBTTtBQUN2QixNQUFJLENBQUMsVUFBVSxNQUFNLENBQUMsU0FBUyxRQUFRLENBQUMsU0FBUyxTQUFTO0FBQ3hELFVBQU0sSUFBSSxNQUFNLG1CQUFtQixJQUFJLDZCQUE2QjtBQUFBLEVBQ3RFO0FBQ0EsTUFBSSxvQkFBb0IsU0FBUyxVQUFVLE1BQU0sTUFBTTtBQUNyRCxVQUFNLElBQUksTUFBTSxlQUFlLFNBQVMsRUFBRSwwQ0FBMEM7QUFBQSxFQUN0RjtBQUNBLE1BQUksQ0FBQyxnQkFBZ0IsT0FBTyxNQUFNLHFCQUFxQixFQUFFLENBQUMsR0FBRztBQUMzRCxVQUFNLElBQUksTUFBTSxlQUFlLFNBQVMsRUFBRSxzQ0FBc0M7QUFBQSxFQUNsRjtBQUNBLFNBQU87QUFBQSxJQUNMLElBQUksU0FBUztBQUFBLElBQ2I7QUFBQSxJQUNBO0FBQUEsSUFDQSxtQkFBbUIsT0FBTyxNQUFNLGlCQUFpQjtBQUFBLElBQ2pELFlBQVksT0FBTyxNQUFNLGVBQWUsV0FBVyxNQUFNLGFBQWE7QUFBQSxJQUN0RSxZQUFZLE9BQU8sTUFBTSxlQUFlLFdBQVcsTUFBTSxhQUFhO0FBQUEsSUFDdEUsV0FBVyx3QkFBeUIsTUFBa0MsU0FBUztBQUFBLElBQy9FLFlBQVksa0JBQWtCLE1BQU0sVUFBVTtBQUFBLElBQzlDLFdBQVcsa0JBQWtCLE1BQU0sU0FBUztBQUFBLEVBQzlDO0FBQ0Y7QUFFTyxTQUFTLGdCQUFnQixPQUFnQztBQUM5RCxNQUFJLENBQUMsZ0JBQWdCLE1BQU0saUJBQWlCLEdBQUc7QUFDN0MsVUFBTSxJQUFJLE1BQU0sZUFBZSxNQUFNLEVBQUUscUNBQXFDO0FBQUEsRUFDOUU7QUFDQSxTQUFPLCtCQUErQixNQUFNLElBQUksV0FBVyxNQUFNLGlCQUFpQjtBQUNwRjtBQXNDTyxTQUFTLGdCQUFnQixPQUF3QjtBQUN0RCxTQUFPLFlBQVksS0FBSyxLQUFLO0FBQy9CO0FBRUEsU0FBUyxrQkFBa0IsT0FBdUI7QUFDaEQsUUFBTSxPQUFPLE1BQU0sS0FBSyxFQUFFLFFBQVEsV0FBVyxFQUFFLEVBQUUsUUFBUSxjQUFjLEVBQUU7QUFDekUsTUFBSSxDQUFDLGVBQWUsS0FBSyxJQUFJLEVBQUcsT0FBTSxJQUFJLE1BQU0sd0NBQXdDO0FBQ3hGLFNBQU87QUFDVDtBQUVBLFNBQVMsd0JBQXdCLE9BQWtEO0FBQ2pGLE1BQUksVUFBVSxPQUFXLFFBQU87QUFDaEMsTUFBSSxDQUFDLE1BQU0sUUFBUSxLQUFLLEVBQUcsT0FBTSxJQUFJLE1BQU0sd0NBQXdDO0FBQ25GLFFBQU0sVUFBVSxvQkFBSSxJQUF3QixDQUFDLFVBQVUsU0FBUyxPQUFPLENBQUM7QUFDeEUsUUFBTSxZQUFZLE1BQU0sS0FBSyxJQUFJLElBQUksTUFBTSxJQUFJLENBQUMsVUFBVTtBQUN4RCxRQUFJLE9BQU8sVUFBVSxZQUFZLENBQUMsUUFBUSxJQUFJLEtBQTJCLEdBQUc7QUFDMUUsWUFBTSxJQUFJLE1BQU0sK0JBQStCLE9BQU8sS0FBSyxDQUFDLEVBQUU7QUFBQSxJQUNoRTtBQUNBLFdBQU87QUFBQSxFQUNULENBQUMsQ0FBQyxDQUFDO0FBQ0gsU0FBTyxVQUFVLFNBQVMsSUFBSSxZQUFZO0FBQzVDO0FBRUEsU0FBUyxrQkFBa0IsT0FBb0M7QUFDN0QsTUFBSSxPQUFPLFVBQVUsWUFBWSxDQUFDLE1BQU0sS0FBSyxFQUFHLFFBQU87QUFDdkQsUUFBTSxNQUFNLElBQUksSUFBSSxLQUFLO0FBQ3pCLE1BQUksSUFBSSxhQUFhLFlBQVksSUFBSSxhQUFhLGFBQWMsUUFBTztBQUN2RSxTQUFPLElBQUksU0FBUztBQUN0QjtBQUVPLFNBQVMsMEJBQTBCLE1BQXVDLFFBQVEsS0FBYTtBQUNwRyxRQUFNLFdBQVcsSUFBSSxnQ0FBZ0MsS0FBSztBQUMxRCxNQUFJLFVBQVU7QUFDWixRQUFJLElBQUksOENBQThDLEtBQUs7QUFDekQsWUFBTSxJQUFJO0FBQUEsUUFDUjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQ0EsV0FBTztBQUFBLEVBQ1Q7QUFDQSxTQUFPO0FBQ1Q7OztBRHJNQSxJQUFNLGNBQWMsUUFBUSxJQUFJO0FBQ2hDLElBQU0sZ0JBQWdCLFFBQVEsSUFBSTtBQUVsQyxJQUFJLENBQUMsZUFBZSxDQUFDLGVBQWU7QUFDbEMsUUFBTSxJQUFJO0FBQUEsSUFDUjtBQUFBLEVBQ0Y7QUFDRjtBQUVPLElBQU0sV0FBbUI7QUFDekIsSUFBTSxhQUFxQjtBQUUzQixJQUFNLG1CQUFlLDJCQUFRLFlBQVksWUFBWTtBQUNyRCxJQUFNLHlCQUFxQiwyQkFBUSxZQUFZLGtCQUFrQjtBQUNqRSxJQUFNLGlCQUFhLHdCQUFLLFVBQVUsUUFBUTtBQUMxQyxJQUFNLGNBQVUsd0JBQUssVUFBVSxLQUFLO0FBQ3BDLElBQU0sZUFBVyx3QkFBSyxTQUFTLFVBQVU7QUFDekMsSUFBTSxrQkFBYyx3QkFBSyxVQUFVLGFBQWE7QUFDaEQsSUFBTSx3QkFBb0IsNEJBQUsseUJBQVEsR0FBRyxVQUFVLGFBQWE7QUFDakUsSUFBTSwyQkFBdUIsd0JBQUssVUFBVSxZQUFZO0FBQ3hELElBQU0sdUJBQW1CLHdCQUFLLFVBQVUsa0JBQWtCO0FBQzFELElBQU0sNkJBQXlCLHdCQUFLLFVBQVUsd0JBQXdCO0FBQ3RFLElBQU0sMEJBQXNCLHdCQUFLLFVBQVUsVUFBVSxXQUFXO0FBQ2hFLElBQU0seUJBQXlCO0FBQy9CLElBQU0sc0JBQXNCO0FBQzVCLElBQU0sd0JBQXdCLDBCQUEwQjtBQUN4RCxJQUFNLDRCQUE0QjtBQUFBLElBRXpDLDJCQUFVLFNBQVMsRUFBRSxXQUFXLEtBQUssQ0FBQztBQUFBLElBQ3RDLDJCQUFVLFlBQVksRUFBRSxXQUFXLEtBQUssQ0FBQztBQUlsQyxTQUFTLElBQUksVUFBcUMsTUFBdUI7QUFDOUUsUUFBTSxPQUFPLEtBQUksb0JBQUksS0FBSyxHQUFFLFlBQVksQ0FBQyxNQUFNLEtBQUssS0FBSyxLQUN0RCxJQUFJLENBQUMsTUFBTyxPQUFPLE1BQU0sV0FBVyxJQUFJLEtBQUssVUFBVSxDQUFDLENBQUUsRUFDMUQsS0FBSyxHQUFHLENBQUM7QUFBQTtBQUNaLE1BQUk7QUFDRixvQkFBZ0IsVUFBVSxJQUFJO0FBQUEsRUFDaEMsUUFBUTtBQUFBLEVBQUM7QUFDVCxNQUFJLFVBQVUsUUFBUyxTQUFRLE1BQU0sb0JBQW9CLEdBQUcsSUFBSTtBQUNsRTs7O0FFbkRBLElBQUFDLGtCQUE0QztBQXNFckMsU0FBUyxZQUE0QjtBQUMxQyxNQUFJO0FBQ0YsV0FBTyxLQUFLLFVBQU0sOEJBQWEsYUFBYSxNQUFNLENBQUM7QUFBQSxFQUNyRCxRQUFRO0FBQ04sV0FBTyxDQUFDO0FBQUEsRUFDVjtBQUNGO0FBQ08sU0FBUyxXQUFXLEdBQXlCO0FBQ2xELE1BQUk7QUFDRix1Q0FBYyxhQUFhLEtBQUssVUFBVSxHQUFHLE1BQU0sQ0FBQyxDQUFDO0FBQUEsRUFDdkQsU0FBUyxHQUFHO0FBQ1YsUUFBSSxRQUFRLHNCQUFzQixPQUFRLEVBQVksT0FBTyxDQUFDO0FBQUEsRUFDaEU7QUFDRjtBQUNPLFNBQVMsbUNBQTRDO0FBQzFELFNBQU8seUJBQXlCLFVBQVUsRUFBRSxlQUFlLFVBQVU7QUFDdkU7QUFDTyxTQUFTLDJCQUEyQixTQUF3QjtBQUNqRSxRQUFNLElBQUksVUFBVTtBQUNwQixJQUFFLGtCQUFrQixDQUFDO0FBQ3JCLElBQUUsY0FBYyxhQUFhO0FBQzdCLGFBQVcsQ0FBQztBQUNkO0FBQ08sU0FBUyw2QkFBNkIsUUFJcEM7QUFDUCxRQUFNLElBQUksVUFBVTtBQUNwQixJQUFFLGtCQUFrQixDQUFDO0FBQ3JCLE1BQUksT0FBTyxjQUFlLEdBQUUsY0FBYyxnQkFBZ0IsT0FBTztBQUNqRSxNQUFJLGdCQUFnQixPQUFRLEdBQUUsY0FBYyxhQUFhLG9CQUFvQixPQUFPLFVBQVU7QUFDOUYsTUFBSSxlQUFlLE9BQVEsR0FBRSxjQUFjLFlBQVksb0JBQW9CLE9BQU8sU0FBUztBQUMzRixhQUFXLENBQUM7QUFDZDtBQUNPLFNBQVMsaUNBQTBDO0FBQ3hELFNBQU8sVUFBVSxFQUFFLGVBQWUsYUFBYTtBQUNqRDtBQUNPLFNBQVMsZUFBZSxJQUFxQjtBQUNsRCxRQUFNLElBQUksVUFBVTtBQUNwQixNQUFJLEVBQUUsZUFBZSxhQUFhLEtBQU0sUUFBTztBQUMvQyxTQUFPLEVBQUUsU0FBUyxFQUFFLEdBQUcsWUFBWTtBQUNyQztBQUNPLFNBQVMsZ0JBQWdCLElBQVksU0FBd0I7QUFDbEUsUUFBTSxJQUFJLFVBQVU7QUFDcEIsSUFBRSxXQUFXLENBQUM7QUFDZCxJQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxHQUFHLFFBQVE7QUFDMUMsYUFBVyxDQUFDO0FBQ2Q7QUFRTyxTQUFTLHFCQUE0QztBQUMxRCxNQUFJO0FBQ0YsV0FBTyxLQUFLLFVBQU0sOEJBQWEsc0JBQXNCLE1BQU0sQ0FBQztBQUFBLEVBQzlELFFBQVE7QUFDTixXQUFPO0FBQUEsRUFDVDtBQUNGO0FBRU8sU0FBUyxzQkFBOEM7QUFDNUQsTUFBSTtBQUNGLFdBQU8sS0FBSyxVQUFNLDhCQUFhLHdCQUF3QixNQUFNLENBQUM7QUFBQSxFQUNoRSxRQUFRO0FBQ04sV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQUNPLFNBQVMscUJBQXFCLE9BQThCO0FBQ2pFLE1BQUk7QUFDRix1Q0FBYyx3QkFBd0IsS0FBSyxVQUFVLE9BQU8sTUFBTSxDQUFDLENBQUM7QUFBQSxFQUN0RSxTQUFTLEdBQUc7QUFDVixRQUFJLFFBQVEsZ0NBQWdDLE9BQVEsRUFBWSxPQUFPLENBQUM7QUFBQSxFQUMxRTtBQUNGO0FBRU8sU0FBUyxvQkFBb0IsT0FBb0M7QUFDdEUsTUFBSSxPQUFPLFVBQVUsU0FBVSxRQUFPO0FBQ3RDLFFBQU0sVUFBVSxNQUFNLEtBQUs7QUFDM0IsU0FBTyxVQUFVLFVBQVU7QUFDN0I7OztBQ3pKQSxJQUFBQyxrQkFBdUg7QUFDdkgsSUFBQUMsNkJBQTBCO0FBQzFCLElBQUFDLHNCQUEyQjtBQUMzQixJQUFBQyxvQkFBK0I7QUFDL0IsSUFBQUMsa0JBQXVCOzs7QUNKdkIsSUFBQUMsc0JBQTJCO0FBR3BCLFNBQVMsZUFBZSxNQUErQjtBQUM1RCxhQUFPLGdDQUFXLFFBQVEsRUFBRSxPQUFPLElBQUksRUFBRSxPQUFPLEtBQUs7QUFDdkQ7QUFFTyxTQUFTLDJCQUNkLE1BQ0EsaUJBQWlCLGlDQUNYO0FBQ04sUUFBTSxPQUFPLGVBQWUsSUFBSTtBQUNoQyxNQUFJLFNBQVMsZ0JBQWdCO0FBQzNCLFVBQU0sSUFBSSxNQUFNLG9CQUFvQixJQUFJLCtCQUErQixjQUFjLEVBQUU7QUFBQSxFQUN6RjtBQUNGOzs7QURTTyxJQUFNLGFBQWE7QUE2Qm5CLElBQU0sMEJBQU4sY0FBc0MsTUFBTTtBQUFBLEVBQ2pELFlBQVksV0FBbUI7QUFDN0I7QUFBQSxNQUNFLEdBQUcsU0FBUztBQUFBLElBQ2Q7QUFDQSxTQUFLLE9BQU87QUFBQSxFQUNkO0FBQ0Y7QUFFTyxTQUFTLGdDQUFnQyxPQUF5RDtBQUN2RyxRQUFNLFlBQVksTUFBTSxhQUFhO0FBQ3JDLFFBQU0sYUFBYSxDQUFDLGFBQWEsVUFBVSxTQUFTLFFBQVEsUUFBOEI7QUFDMUYsU0FBTztBQUFBLElBQ0wsU0FBUyxRQUFRO0FBQUEsSUFDakI7QUFBQSxJQUNBO0FBQUEsSUFDQSxRQUFRLGFBQWEsT0FBTyxHQUFHLE1BQU0sU0FBUyxJQUFJLHlCQUF5QixxQkFBcUIsU0FBUyxDQUFDO0FBQUEsRUFDNUc7QUFDRjtBQUVPLFNBQVMsbUNBQW1DLE9BQThCO0FBQy9FLFFBQU1DLFlBQVcsZ0NBQWdDLEtBQUs7QUFDdEQsTUFBSSxDQUFDQSxVQUFTLFlBQVk7QUFDeEIsVUFBTSxJQUFJLE1BQU1BLFVBQVMsVUFBVSxHQUFHLE1BQU0sU0FBUyxJQUFJLHFDQUFxQztBQUFBLEVBQ2hHO0FBQ0Y7QUFFTyxTQUFTLCtCQUErQixPQUF3RDtBQUNyRyxRQUFNLFdBQVcsZ0JBQWdCLE1BQU0sU0FBUyxVQUFVO0FBQzFELFFBQU0sYUFBYSxDQUFDLFlBQVksZ0JBQWdCLHdCQUF3QixRQUFRLEtBQUs7QUFDckYsU0FBTztBQUFBLElBQ0wsU0FBUztBQUFBLElBQ1Q7QUFBQSxJQUNBO0FBQUEsSUFDQSxRQUFRLGNBQWMsQ0FBQyxXQUNuQixPQUNBLEdBQUcsTUFBTSxTQUFTLElBQUkscUJBQXFCLFFBQVE7QUFBQSxFQUN6RDtBQUNGO0FBRU8sU0FBUyxrQ0FBa0MsT0FBOEI7QUFDOUUsUUFBTSxVQUFVLCtCQUErQixLQUFLO0FBQ3BELE1BQUksQ0FBQyxRQUFRLFlBQVk7QUFDdkIsVUFBTSxJQUFJLE1BQU0sUUFBUSxVQUFVLEdBQUcsTUFBTSxTQUFTLElBQUksb0NBQW9DO0FBQUEsRUFDOUY7QUFDRjtBQUVPLFNBQVMsZ0JBQWdCLE9BQStCO0FBQzdELE1BQUksT0FBTyxVQUFVLFNBQVUsUUFBTztBQUN0QyxRQUFNLFVBQVUsaUJBQWlCLE1BQU0sUUFBUSxXQUFXLEVBQUUsQ0FBQztBQUM3RCxTQUFPLFdBQVcsS0FBSyxPQUFPLElBQUksVUFBVTtBQUM5QztBQUVPLFNBQVMscUJBQXFCLFdBQWdEO0FBQ25GLE1BQUksQ0FBQyxhQUFhLFVBQVUsV0FBVyxFQUFHLFFBQU87QUFDakQsU0FBTyxVQUFVLElBQUksQ0FBQ0EsY0FBYTtBQUNqQyxRQUFJQSxjQUFhLFNBQVUsUUFBTztBQUNsQyxRQUFJQSxjQUFhLFFBQVMsUUFBTztBQUNqQyxXQUFPO0FBQUEsRUFDVCxDQUFDLEVBQUUsS0FBSyxJQUFJO0FBQ2Q7QUFFTyxTQUFTLDJCQUFzRDtBQUNwRSxRQUFNLGNBQVUsd0JBQUssWUFBYSxrQkFBa0I7QUFDcEQsTUFBSSxLQUFDLDRCQUFXLE9BQU8sRUFBRyxRQUFPO0FBQ2pDLE1BQUk7QUFDRixVQUFNLFdBQU8sOEJBQWEsT0FBTztBQUNqQyxRQUFJLENBQUMsUUFBUSxJQUFJLDJDQUEyQztBQUMxRCxpQ0FBMkIsSUFBSTtBQUFBLElBQ2pDO0FBQ0EsV0FBTyx1QkFBdUIsS0FBSyxNQUFNLEtBQUssU0FBUyxNQUFNLENBQUMsQ0FBQztBQUFBLEVBQ2pFLFNBQVMsR0FBRztBQUNWLFFBQUksUUFBUSxpQ0FBaUMsT0FBUSxFQUFZLE9BQU8sQ0FBQztBQUN6RSxXQUFPO0FBQUEsRUFDVDtBQUNGO0FBRUEsZUFBc0IsMEJBQTBEO0FBQzlFLFFBQU0sYUFBWSxvQkFBSSxLQUFLLEdBQUUsWUFBWTtBQUN6QyxRQUFNLGdCQUFnQixRQUFRLElBQUksOENBQThDO0FBQ2hGLE1BQUk7QUFDRixVQUFNLGFBQWEsSUFBSSxnQkFBZ0I7QUFDdkMsVUFBTSxVQUFVLFdBQVcsTUFBTSxXQUFXLE1BQU0sR0FBRyxHQUFJO0FBQ3pELFFBQUk7QUFDRixZQUFNLE1BQU0sTUFBTSxNQUFNLHVCQUF1QjtBQUFBLFFBQzdDLFNBQVM7QUFBQSxVQUNQLFVBQVU7QUFBQSxVQUNWLGNBQWMsa0JBQWtCLHNCQUFzQjtBQUFBLFFBQ3hEO0FBQUEsUUFDQSxRQUFRLFdBQVc7QUFBQSxNQUNyQixDQUFDO0FBQ0QsVUFBSSxDQUFDLElBQUksR0FBSSxPQUFNLElBQUksTUFBTSxrQkFBa0IsSUFBSSxNQUFNLEVBQUU7QUFDM0QsWUFBTSxPQUFPLE9BQU8sS0FBSyxNQUFNLElBQUksWUFBWSxDQUFDO0FBQ2hELFVBQUksQ0FBQyxjQUFlLDRCQUEyQixJQUFJO0FBQ25ELGFBQU87QUFBQSxRQUNMLFVBQVUsdUJBQXVCLEtBQUssTUFBTSxLQUFLLFNBQVMsTUFBTSxDQUFDLENBQUM7QUFBQSxRQUNsRTtBQUFBLE1BQ0Y7QUFBQSxJQUNGLFVBQUU7QUFDQSxtQkFBYSxPQUFPO0FBQUEsSUFDdEI7QUFBQSxFQUNGLFNBQVMsR0FBRztBQUNWLFVBQU0sUUFBUSxhQUFhLFFBQVEsSUFBSSxJQUFJLE1BQU0sT0FBTyxDQUFDLENBQUM7QUFDMUQsVUFBTSxVQUFVLHlCQUF5QjtBQUN6QyxRQUFJLFNBQVM7QUFDWCxVQUFJLFFBQVEsa0NBQWtDLE1BQU0sT0FBTztBQUMzRCxhQUFPLEVBQUUsVUFBVSxTQUFTLFVBQVU7QUFBQSxJQUN4QztBQUNBLFFBQUksUUFBUSx5Q0FBeUMsTUFBTSxPQUFPO0FBQ2xFLFVBQU07QUFBQSxFQUNSO0FBQ0Y7QUFFQSxlQUFzQixrQkFBa0IsT0FBdUM7QUFDN0UsUUFBTSxNQUFNLGdCQUFnQixLQUFLO0FBQ2pDLFFBQU0sV0FBTyxpQ0FBWSw0QkFBSyx3QkFBTyxHQUFHLHNCQUFzQixDQUFDO0FBQy9ELFFBQU0sY0FBVSx3QkFBSyxNQUFNLGVBQWU7QUFDMUMsUUFBTSxpQkFBYSx3QkFBSyxNQUFNLFNBQVM7QUFDdkMsUUFBTSxhQUFTLHdCQUFLLFlBQVksTUFBTSxFQUFFO0FBQ3hDLFFBQU0sbUJBQWUsd0JBQUssTUFBTSxVQUFVLE1BQU0sRUFBRTtBQUVsRCxNQUFJO0FBQ0YsUUFBSSxRQUFRLDBCQUEwQixNQUFNLEVBQUUsU0FBUyxNQUFNLElBQUksSUFBSSxNQUFNLGlCQUFpQixFQUFFO0FBQzlGLFVBQU0sTUFBTSxNQUFNLE1BQU0sS0FBSztBQUFBLE1BQzNCLFNBQVMsRUFBRSxjQUFjLGtCQUFrQixzQkFBc0IsR0FBRztBQUFBLE1BQ3BFLFVBQVU7QUFBQSxJQUNaLENBQUM7QUFDRCxRQUFJLENBQUMsSUFBSSxHQUFJLE9BQU0sSUFBSSxNQUFNLG9CQUFvQixJQUFJLE1BQU0sRUFBRTtBQUM3RCxVQUFNLFFBQVEsT0FBTyxLQUFLLE1BQU0sSUFBSSxZQUFZLENBQUM7QUFDakQsdUNBQWMsU0FBUyxLQUFLO0FBQzVCLG1DQUFVLFlBQVksRUFBRSxXQUFXLEtBQUssQ0FBQztBQUN6QyxzQkFBa0IsU0FBUyxVQUFVO0FBQ3JDLFVBQU0sU0FBUyxjQUFjLFVBQVU7QUFDdkMsUUFBSSxDQUFDLE9BQVEsT0FBTSxJQUFJLE1BQU0sa0RBQWtEO0FBQy9FLDZCQUF5QixPQUFPLE1BQU07QUFDdEMsZ0NBQU8sY0FBYyxFQUFFLFdBQVcsTUFBTSxPQUFPLEtBQUssQ0FBQztBQUNyRCxvQkFBZ0IsUUFBUSxZQUFZO0FBQ3BDLFVBQU0sY0FBYyxnQkFBZ0IsWUFBWTtBQUNoRDtBQUFBLFVBQ0Usd0JBQUssY0FBYyxxQkFBcUI7QUFBQSxNQUN4QyxLQUFLO0FBQUEsUUFDSDtBQUFBLFVBQ0UsTUFBTSxNQUFNO0FBQUEsVUFDWixtQkFBbUIsTUFBTTtBQUFBLFVBQ3pCLGNBQWEsb0JBQUksS0FBSyxHQUFFLFlBQVk7QUFBQSxVQUNwQyxlQUFlO0FBQUEsVUFDZixPQUFPO0FBQUEsUUFDVDtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFDQSxVQUFNLG1DQUFtQyxPQUFPLFFBQVEsSUFBSTtBQUM1RCxnQ0FBTyxRQUFRLEVBQUUsV0FBVyxNQUFNLE9BQU8sS0FBSyxDQUFDO0FBQy9DLGdDQUFPLGNBQWMsUUFBUSxFQUFFLFdBQVcsS0FBSyxDQUFDO0FBQUEsRUFDbEQsVUFBRTtBQUNBLGdDQUFPLE1BQU0sRUFBRSxXQUFXLE1BQU0sT0FBTyxLQUFLLENBQUM7QUFBQSxFQUMvQztBQUNGO0FBRUEsZUFBc0IsNEJBQTRCLFdBQXlEO0FBQ3pHLFFBQU0sT0FBTyxvQkFBb0IsU0FBUztBQUMxQyxRQUFNLFdBQVcsTUFBTSxnQkFBNkMsZ0NBQWdDLElBQUksRUFBRTtBQUMxRyxRQUFNLGdCQUFnQixTQUFTO0FBQy9CLE1BQUksQ0FBQyxjQUFlLE9BQU0sSUFBSSxNQUFNLHdDQUF3QyxJQUFJLEVBQUU7QUFFbEYsUUFBTSxTQUFTLE1BQU0sZ0JBR2xCLGdDQUFnQyxJQUFJLFlBQVksbUJBQW1CLGFBQWEsQ0FBQyxFQUFFO0FBQ3RGLE1BQUksQ0FBQyxPQUFPLElBQUssT0FBTSxJQUFJLE1BQU0sd0NBQXdDLElBQUksRUFBRTtBQUUvRSxRQUFNLFdBQVcsTUFBTSxzQkFBc0IsTUFBTSxPQUFPLEdBQUcsRUFBRSxNQUFNLENBQUMsTUFBTTtBQUMxRSxRQUFJLFFBQVEsZ0RBQWdELElBQUksSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDO0FBQ3BGLFdBQU87QUFBQSxFQUNULENBQUM7QUFFRCxTQUFPO0FBQUEsSUFDTDtBQUFBLElBQ0E7QUFBQSxJQUNBLFdBQVcsT0FBTztBQUFBLElBQ2xCLFdBQVcsT0FBTyxZQUFZLHNCQUFzQixJQUFJLFdBQVcsT0FBTyxHQUFHO0FBQUEsSUFDN0UsVUFBVSxXQUNOO0FBQUEsTUFDRSxJQUFJLE9BQU8sU0FBUyxPQUFPLFdBQVcsU0FBUyxLQUFLO0FBQUEsTUFDcEQsTUFBTSxPQUFPLFNBQVMsU0FBUyxXQUFXLFNBQVMsT0FBTztBQUFBLE1BQzFELFNBQVMsT0FBTyxTQUFTLFlBQVksV0FBVyxTQUFTLFVBQVU7QUFBQSxNQUNuRSxhQUFhLE9BQU8sU0FBUyxnQkFBZ0IsV0FBVyxTQUFTLGNBQWM7QUFBQSxNQUMvRSxTQUFTLE9BQU8sU0FBUyxZQUFZLFdBQVcsU0FBUyxVQUFVO0FBQUEsSUFDckUsSUFDQTtBQUFBLEVBQ047QUFDRjtBQUVBLGVBQWUsZ0JBQW1CLEtBQXlCO0FBQ3pELFFBQU0sYUFBYSxJQUFJLGdCQUFnQjtBQUN2QyxRQUFNLFVBQVUsV0FBVyxNQUFNLFdBQVcsTUFBTSxHQUFHLEdBQUk7QUFDekQsTUFBSTtBQUNGLFVBQU0sTUFBTSxNQUFNLE1BQU0sS0FBSztBQUFBLE1BQzNCLFNBQVM7QUFBQSxRQUNQLFVBQVU7QUFBQSxRQUNWLGNBQWMsa0JBQWtCLHNCQUFzQjtBQUFBLE1BQ3hEO0FBQUEsTUFDQSxRQUFRLFdBQVc7QUFBQSxJQUNyQixDQUFDO0FBQ0QsUUFBSSxDQUFDLElBQUksR0FBSSxPQUFNLElBQUksTUFBTSxtQkFBbUIsSUFBSSxNQUFNLEVBQUU7QUFDNUQsV0FBTyxNQUFNLElBQUksS0FBSztBQUFBLEVBQ3hCLFVBQUU7QUFDQSxpQkFBYSxPQUFPO0FBQUEsRUFDdEI7QUFDRjtBQUVBLGVBQWUsc0JBQXNCLE1BQWMsV0FBb0Q7QUFDckcsUUFBTSxNQUFNLE1BQU0sTUFBTSxxQ0FBcUMsSUFBSSxJQUFJLFNBQVMsa0JBQWtCO0FBQUEsSUFDOUYsU0FBUztBQUFBLE1BQ1AsVUFBVTtBQUFBLE1BQ1YsY0FBYyxrQkFBa0Isc0JBQXNCO0FBQUEsSUFDeEQ7QUFBQSxFQUNGLENBQUM7QUFDRCxNQUFJLENBQUMsSUFBSSxHQUFJLE9BQU0sSUFBSSxNQUFNLDJCQUEyQixJQUFJLE1BQU0sRUFBRTtBQUNwRSxTQUFPLE1BQU0sSUFBSSxLQUFLO0FBQ3hCO0FBRU8sU0FBUyxrQkFBa0IsU0FBaUIsV0FBeUI7QUFDMUUsUUFBTSxhQUFTLHNDQUFVLE9BQU8sQ0FBQyxRQUFRLFNBQVMsTUFBTSxTQUFTLEdBQUc7QUFBQSxJQUNsRSxVQUFVO0FBQUEsSUFDVixPQUFPLENBQUMsVUFBVSxRQUFRLE1BQU07QUFBQSxFQUNsQyxDQUFDO0FBQ0QsTUFBSSxPQUFPLFdBQVcsR0FBRztBQUN2QixVQUFNLElBQUksTUFBTSwwQkFBMEIsT0FBTyxVQUFVLE9BQU8sVUFBVSxPQUFPLE1BQU0sRUFBRTtBQUFBLEVBQzdGO0FBQ0Y7QUFFTyxTQUFTLHlCQUF5QixPQUF3QixRQUFzQjtBQUNyRixRQUFNLG1CQUFlLHdCQUFLLFFBQVEsZUFBZTtBQUNqRCxRQUFNLFdBQVcsS0FBSyxVQUFNLDhCQUFhLGNBQWMsTUFBTSxDQUFDO0FBQzlELE1BQUksU0FBUyxPQUFPLE1BQU0sU0FBUyxJQUFJO0FBQ3JDLFVBQU0sSUFBSSxNQUFNLHVCQUF1QixTQUFTLEVBQUUsK0JBQStCLE1BQU0sU0FBUyxFQUFFLEVBQUU7QUFBQSxFQUN0RztBQUNBLE1BQUksU0FBUyxlQUFlLE1BQU0sTUFBTTtBQUN0QyxVQUFNLElBQUksTUFBTSx5QkFBeUIsU0FBUyxVQUFVLGlDQUFpQyxNQUFNLElBQUksRUFBRTtBQUFBLEVBQzNHO0FBQ0EsTUFBSSxTQUFTLFlBQVksTUFBTSxTQUFTLFNBQVM7QUFDL0MsVUFBTSxJQUFJLE1BQU0sNEJBQTRCLFNBQVMsT0FBTyxvQ0FBb0MsTUFBTSxTQUFTLE9BQU8sRUFBRTtBQUFBLEVBQzFIO0FBQ0Y7QUFFTyxTQUFTLGNBQWMsS0FBNEI7QUFDeEQsTUFBSSxLQUFDLDRCQUFXLEdBQUcsRUFBRyxRQUFPO0FBQzdCLFVBQUksZ0NBQVcsd0JBQUssS0FBSyxlQUFlLENBQUMsRUFBRyxRQUFPO0FBQ25ELGFBQVcsWUFBUSw2QkFBWSxHQUFHLEdBQUc7QUFDbkMsVUFBTSxZQUFRLHdCQUFLLEtBQUssSUFBSTtBQUM1QixRQUFJO0FBQ0YsVUFBSSxLQUFDLDBCQUFTLEtBQUssRUFBRSxZQUFZLEVBQUc7QUFBQSxJQUN0QyxRQUFRO0FBQ047QUFBQSxJQUNGO0FBQ0EsVUFBTSxRQUFRLGNBQWMsS0FBSztBQUNqQyxRQUFJLE1BQU8sUUFBTztBQUFBLEVBQ3BCO0FBQ0EsU0FBTztBQUNUO0FBRU8sU0FBUyxnQkFBZ0IsUUFBZ0IsUUFBc0I7QUFDcEUsOEJBQU8sUUFBUSxRQUFRO0FBQUEsSUFDckIsV0FBVztBQUFBLElBQ1gsUUFBUSxDQUFDLFFBQVEsQ0FBQyw2Q0FBNkMsS0FBSyxHQUFHO0FBQUEsRUFDekUsQ0FBQztBQUNIO0FBRUEsZUFBZSxtQ0FDYixPQUNBLFFBQ0EsTUFDZTtBQUNmLE1BQUksS0FBQyw0QkFBVyxNQUFNLEVBQUc7QUFDekIsUUFBTSxXQUFXLHlCQUF5QixNQUFNO0FBQ2hELE1BQUksQ0FBQyxTQUFVO0FBQ2YsTUFBSSxTQUFTLFNBQVMsTUFBTSxNQUFNO0FBQ2hDLFVBQU0sSUFBSSx3QkFBd0IsTUFBTSxTQUFTLElBQUk7QUFBQSxFQUN2RDtBQUNBLFFBQU0sZUFBZSxnQkFBZ0IsTUFBTTtBQUMzQyxRQUFNLGdCQUFnQixTQUFTLFNBQVMsTUFBTSw4QkFBOEIsVUFBVSxJQUFJO0FBQzFGLE1BQUksQ0FBQyxlQUFlLGNBQWMsYUFBYSxHQUFHO0FBQ2hELFVBQU0sSUFBSSx3QkFBd0IsTUFBTSxTQUFTLElBQUk7QUFBQSxFQUN2RDtBQUNGO0FBRU8sU0FBUyx5QkFBeUIsUUFBNkM7QUFDcEYsUUFBTSxtQkFBZSx3QkFBSyxRQUFRLHFCQUFxQjtBQUN2RCxNQUFJLEtBQUMsNEJBQVcsWUFBWSxFQUFHLFFBQU87QUFDdEMsTUFBSTtBQUNGLFVBQU0sU0FBUyxLQUFLLFVBQU0sOEJBQWEsY0FBYyxNQUFNLENBQUM7QUFDNUQsUUFBSSxPQUFPLE9BQU8sU0FBUyxZQUFZLE9BQU8sT0FBTyxzQkFBc0IsU0FBVSxRQUFPO0FBQzVGLFdBQU87QUFBQSxNQUNMLE1BQU0sT0FBTztBQUFBLE1BQ2IsbUJBQW1CLE9BQU87QUFBQSxNQUMxQixhQUFhLE9BQU8sT0FBTyxnQkFBZ0IsV0FBVyxPQUFPLGNBQWM7QUFBQSxNQUMzRSxlQUFlLE9BQU8sT0FBTyxrQkFBa0IsV0FBVyxPQUFPLGdCQUFnQjtBQUFBLE1BQ2pGLE9BQU8sYUFBYSxPQUFPLEtBQUssSUFBSSxPQUFPLFFBQVE7QUFBQSxJQUNyRDtBQUFBLEVBQ0YsUUFBUTtBQUNOLFdBQU87QUFBQSxFQUNUO0FBQ0Y7QUFFQSxlQUFlLDhCQUNiLFVBQ0EsTUFDaUM7QUFDakMsUUFBTSxrQkFBYyx3QkFBSyxNQUFNLFVBQVU7QUFDekMsUUFBTSxjQUFVLHdCQUFLLE1BQU0saUJBQWlCO0FBQzVDLFFBQU0sTUFBTSxNQUFNLE1BQU0sK0JBQStCLFNBQVMsSUFBSSxXQUFXLFNBQVMsaUJBQWlCLElBQUk7QUFBQSxJQUMzRyxTQUFTLEVBQUUsY0FBYyxrQkFBa0Isc0JBQXNCLEdBQUc7QUFBQSxJQUNwRSxVQUFVO0FBQUEsRUFDWixDQUFDO0FBQ0QsTUFBSSxDQUFDLElBQUksR0FBSSxPQUFNLElBQUksTUFBTSx1REFBdUQsSUFBSSxNQUFNLEVBQUU7QUFDaEcscUNBQWMsU0FBUyxPQUFPLEtBQUssTUFBTSxJQUFJLFlBQVksQ0FBQyxDQUFDO0FBQzNELGlDQUFVLGFBQWEsRUFBRSxXQUFXLEtBQUssQ0FBQztBQUMxQyxvQkFBa0IsU0FBUyxXQUFXO0FBQ3RDLFFBQU0sU0FBUyxjQUFjLFdBQVc7QUFDeEMsTUFBSSxDQUFDLE9BQVEsT0FBTSxJQUFJLE1BQU0sK0VBQStFO0FBQzVHLFNBQU8sZ0JBQWdCLE1BQU07QUFDL0I7QUFFTyxTQUFTLGdCQUFnQixNQUFzQztBQUNwRSxRQUFNLE1BQThCLENBQUM7QUFDckMseUJBQXVCLE1BQU0sTUFBTSxHQUFHO0FBQ3RDLFNBQU87QUFDVDtBQUVPLFNBQVMsdUJBQXVCLE1BQWMsS0FBYSxLQUFtQztBQUNuRyxhQUFXLFlBQVEsNkJBQVksR0FBRyxFQUFFLEtBQUssR0FBRztBQUMxQyxRQUFJLFNBQVMsVUFBVSxTQUFTLGtCQUFrQixTQUFTLHNCQUF1QjtBQUNsRixVQUFNLFdBQU8sd0JBQUssS0FBSyxJQUFJO0FBQzNCLFVBQU0sVUFBTSw0QkFBUyxNQUFNLElBQUksRUFBRSxNQUFNLElBQUksRUFBRSxLQUFLLEdBQUc7QUFDckQsVUFBTUMsWUFBTywwQkFBUyxJQUFJO0FBQzFCLFFBQUlBLE1BQUssWUFBWSxHQUFHO0FBQ3RCLDZCQUF1QixNQUFNLE1BQU0sR0FBRztBQUN0QztBQUFBLElBQ0Y7QUFDQSxRQUFJLENBQUNBLE1BQUssT0FBTyxFQUFHO0FBQ3BCLFFBQUksR0FBRyxRQUFJLGdDQUFXLFFBQVEsRUFBRSxXQUFPLDhCQUFhLElBQUksQ0FBQyxFQUFFLE9BQU8sS0FBSztBQUFBLEVBQ3pFO0FBQ0Y7QUFFTyxTQUFTLGVBQWUsR0FBMkIsR0FBb0M7QUFDNUYsUUFBTSxLQUFLLE9BQU8sS0FBSyxDQUFDLEVBQUUsS0FBSztBQUMvQixRQUFNLEtBQUssT0FBTyxLQUFLLENBQUMsRUFBRSxLQUFLO0FBQy9CLE1BQUksR0FBRyxXQUFXLEdBQUcsT0FBUSxRQUFPO0FBQ3BDLFdBQVMsSUFBSSxHQUFHLElBQUksR0FBRyxRQUFRLEtBQUs7QUFDbEMsVUFBTSxNQUFNLEdBQUcsQ0FBQztBQUNoQixRQUFJLFFBQVEsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLE1BQU0sRUFBRSxHQUFHLEVBQUcsUUFBTztBQUFBLEVBQ2pEO0FBQ0EsU0FBTztBQUNUO0FBRU8sU0FBUyxhQUFhLE9BQWlEO0FBQzVFLE1BQUksQ0FBQyxTQUFTLE9BQU8sVUFBVSxZQUFZLE1BQU0sUUFBUSxLQUFLLEVBQUcsUUFBTztBQUN4RSxTQUFPLE9BQU8sT0FBTyxLQUFnQyxFQUFFLE1BQU0sQ0FBQyxNQUFNLE9BQU8sTUFBTSxRQUFRO0FBQzNGO0FBRU8sU0FBUyxpQkFBaUIsR0FBbUI7QUFDbEQsU0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLE9BQU8sRUFBRTtBQUNuQztBQUVPLFNBQVMsZ0JBQWdCLEdBQVcsR0FBbUI7QUFDNUQsUUFBTSxLQUFLLFdBQVcsS0FBSyxDQUFDO0FBQzVCLFFBQU0sS0FBSyxXQUFXLEtBQUssQ0FBQztBQUM1QixNQUFJLENBQUMsTUFBTSxDQUFDLEdBQUksUUFBTztBQUN2QixXQUFTLElBQUksR0FBRyxLQUFLLEdBQUcsS0FBSztBQUMzQixVQUFNLE9BQU8sT0FBTyxHQUFHLENBQUMsQ0FBQyxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUM7QUFDekMsUUFBSSxTQUFTLEVBQUcsUUFBTztBQUFBLEVBQ3pCO0FBQ0EsU0FBTztBQUNUOzs7QWQ5V0EsSUFBQUMsc0JBQTBCOzs7QWdCOUQxQixJQUFBQyxrQkFBMEM7QUFDMUMsSUFBQUMsNkJBQStDO0FBQy9DLElBQUFDLG9CQUF1QztBQUN2QyxJQUFBQyxrQkFBd0I7QUFvQmpCLFNBQVMsMkJBQWlDO0FBQy9DLE1BQUksUUFBUSxhQUFhLFNBQVU7QUFFbkMsUUFBTSxTQUFTLFFBQVEsYUFBYTtBQUdwQyxRQUFNLGVBQWUsT0FBTztBQUM1QixNQUFJLE9BQU8saUJBQWlCLFdBQVk7QUFFeEMsU0FBTyxRQUFRLFNBQVMsd0JBQXdCLFNBQWlCLFFBQWlCLFFBQWlCO0FBQ2pHLFVBQU0sU0FBUyxhQUFhLE1BQU0sTUFBTSxDQUFDLFNBQVMsUUFBUSxNQUFNLENBQUM7QUFDakUsUUFBSSxPQUFPLFlBQVksWUFBWSx1QkFBdUIsS0FBSyxPQUFPLEdBQUc7QUFDdkUseUJBQW1CLE1BQU07QUFBQSxJQUMzQjtBQUNBLFdBQU87QUFBQSxFQUNUO0FBQ0Y7QUFFTyxTQUFTLG1CQUFtQixRQUF1QjtBQUN4RCxNQUFJLENBQUMsVUFBVSxPQUFPLFdBQVcsU0FBVTtBQUMzQyxRQUFNQyxXQUFVO0FBQ2hCLE1BQUlBLFNBQVEsd0JBQXlCO0FBQ3JDLEVBQUFBLFNBQVEsMEJBQTBCO0FBRWxDLGFBQVcsUUFBUSxDQUFDLDJCQUEyQixHQUFHO0FBQ2hELFVBQU0sS0FBS0EsU0FBUSxJQUFJO0FBQ3ZCLFFBQUksT0FBTyxPQUFPLFdBQVk7QUFDOUIsSUFBQUEsU0FBUSxJQUFJLElBQUksU0FBUywrQkFBOEMsTUFBaUI7QUFDdEYsMENBQW9DO0FBQ3BDLGFBQU8sUUFBUSxNQUFNLElBQUksTUFBTSxJQUFJO0FBQUEsSUFDckM7QUFBQSxFQUNGO0FBRUEsTUFBSUEsU0FBUSxXQUFXQSxTQUFRLFlBQVlBLFVBQVM7QUFDbEQsdUJBQW1CQSxTQUFRLE9BQU87QUFBQSxFQUNwQztBQUNGO0FBRU8sU0FBUyxzQ0FBNEM7QUFDMUQsTUFBSSxRQUFRLGFBQWEsU0FBVTtBQUNuQyxVQUFJLDRCQUFXLGdCQUFnQixHQUFHO0FBQ2hDLFFBQUksUUFBUSx5REFBeUQ7QUFDckU7QUFBQSxFQUNGO0FBQ0EsTUFBSSxLQUFDLDRCQUFXLG1CQUFtQixHQUFHO0FBQ3BDLFFBQUksUUFBUSxpRUFBaUU7QUFDN0U7QUFBQSxFQUNGO0FBQ0EsTUFBSSxDQUFDLHVCQUF1QixtQkFBbUIsR0FBRztBQUNoRCxRQUFJLFFBQVEsMEVBQTBFO0FBQ3RGO0FBQUEsRUFDRjtBQUVBLFFBQU0sUUFBUSxtQkFBbUI7QUFDakMsUUFBTSxVQUFVLE9BQU8sV0FBV0MsaUJBQWdCO0FBQ2xELE1BQUksQ0FBQyxTQUFTO0FBQ1osUUFBSSxRQUFRLDZEQUE2RDtBQUN6RTtBQUFBLEVBQ0Y7QUFFQSxRQUFNLE9BQU87QUFBQSxJQUNYLFlBQVcsb0JBQUksS0FBSyxHQUFFLFlBQVk7QUFBQSxJQUNsQztBQUFBLElBQ0EsY0FBYyxPQUFPLGdCQUFnQjtBQUFBLEVBQ3ZDO0FBQ0EscUNBQWMsa0JBQWtCLEtBQUssVUFBVSxNQUFNLE1BQU0sQ0FBQyxDQUFDO0FBRTdELE1BQUk7QUFDRixpREFBYSxTQUFTLENBQUMscUJBQXFCLE9BQU8sR0FBRyxFQUFFLE9BQU8sU0FBUyxDQUFDO0FBQ3pFLFFBQUk7QUFDRixtREFBYSxTQUFTLENBQUMsT0FBTyx3QkFBd0IsT0FBTyxHQUFHLEVBQUUsT0FBTyxTQUFTLENBQUM7QUFBQSxJQUNyRixRQUFRO0FBQUEsSUFBQztBQUNULFFBQUksUUFBUSxvREFBb0QsRUFBRSxRQUFRLENBQUM7QUFBQSxFQUM3RSxTQUFTLEdBQUc7QUFDVixRQUFJLFNBQVMsNkRBQTZEO0FBQUEsTUFDeEUsU0FBVSxFQUFZO0FBQUEsSUFDeEIsQ0FBQztBQUFBLEVBQ0g7QUFDRjtBQUVPLFNBQVMsdUJBQXVCLFNBQTBCO0FBQy9ELFFBQU0sYUFBUyxzQ0FBVSxZQUFZLENBQUMsT0FBTyxlQUFlLE9BQU8sR0FBRztBQUFBLElBQ3BFLFVBQVU7QUFBQSxJQUNWLE9BQU8sQ0FBQyxVQUFVLFFBQVEsTUFBTTtBQUFBLEVBQ2xDLENBQUM7QUFDRCxRQUFNLFNBQVMsR0FBRyxPQUFPLFVBQVUsRUFBRSxHQUFHLE9BQU8sVUFBVSxFQUFFO0FBQzNELFNBQ0UsT0FBTyxXQUFXLEtBQ2xCLHNDQUFzQyxLQUFLLE1BQU0sS0FDakQsQ0FBQyxrQkFBa0IsS0FBSyxNQUFNLEtBQzlCLENBQUMseUJBQXlCLEtBQUssTUFBTTtBQUV6QztBQUVPLFNBQVNBLG1CQUFpQztBQUMvQyxRQUFNLFNBQVM7QUFDZixRQUFNLE1BQU0sUUFBUSxTQUFTLFFBQVEsTUFBTTtBQUMzQyxTQUFPLE9BQU8sSUFBSSxRQUFRLFNBQVMsTUFBTSxHQUFHLE1BQU0sT0FBTyxNQUFNLElBQUk7QUFDckU7QUFFTyxJQUFNLDJCQUEyQixLQUFLLEtBQUssS0FBSztBQUNoRCxJQUFNQyxjQUFhO0FBRTFCLGVBQXNCLCtCQUErQixRQUFRLE9BQTBDO0FBQ3JHLFFBQU0sUUFBUSxVQUFVO0FBQ3hCLFFBQU0sU0FBUyxNQUFNLGVBQWU7QUFDcEMsUUFBTSxVQUFVLE1BQU0sZUFBZSxpQkFBaUI7QUFDdEQsUUFBTSxPQUFPLE1BQU0sZUFBZSxjQUFjO0FBQ2hELE1BQ0UsQ0FBQyxTQUNELFVBQ0EsT0FBTyxtQkFBbUIsMEJBQzFCLEtBQUssSUFBSSxJQUFJLEtBQUssTUFBTSxPQUFPLFNBQVMsSUFBSSwwQkFDNUM7QUFDQSxXQUFPO0FBQUEsRUFDVDtBQUVBLFFBQU0sVUFBVSxNQUFNLG1CQUFtQixNQUFNLHdCQUF3QixZQUFZLFlBQVk7QUFDL0YsUUFBTSxnQkFBZ0IsUUFBUSxZQUFZQyxrQkFBaUIsUUFBUSxTQUFTLElBQUk7QUFDaEYsUUFBTSxRQUFrQztBQUFBLElBQ3RDLFlBQVcsb0JBQUksS0FBSyxHQUFFLFlBQVk7QUFBQSxJQUNsQyxnQkFBZ0I7QUFBQSxJQUNoQjtBQUFBLElBQ0EsWUFBWSxRQUFRLGNBQWMsc0JBQXNCLElBQUk7QUFBQSxJQUM1RCxjQUFjLFFBQVE7QUFBQSxJQUN0QixpQkFBaUIsZ0JBQ2JDLGlCQUFnQkQsa0JBQWlCLGFBQWEsR0FBRyxzQkFBc0IsSUFBSSxJQUMzRTtBQUFBLElBQ0osR0FBSSxRQUFRLFFBQVEsRUFBRSxPQUFPLFFBQVEsTUFBTSxJQUFJLENBQUM7QUFBQSxFQUNsRDtBQUNBLFFBQU0sa0JBQWtCLENBQUM7QUFDekIsUUFBTSxjQUFjLGNBQWM7QUFDbEMsYUFBVyxLQUFLO0FBQ2hCLFNBQU87QUFDVDtBQUVBLGVBQWUsbUJBQ2IsTUFDQSxnQkFDQSxvQkFBb0IsT0FDMkY7QUFDL0csTUFBSTtBQUNGLFVBQU0sYUFBYSxJQUFJLGdCQUFnQjtBQUN2QyxVQUFNLFVBQVUsV0FBVyxNQUFNLFdBQVcsTUFBTSxHQUFHLEdBQUk7QUFDekQsUUFBSTtBQUNGLFlBQU0sV0FBVyxvQkFBb0IseUJBQXlCO0FBQzlELFlBQU0sTUFBTSxNQUFNLE1BQU0sZ0NBQWdDLElBQUksSUFBSSxRQUFRLElBQUk7QUFBQSxRQUMxRSxTQUFTO0FBQUEsVUFDUCxVQUFVO0FBQUEsVUFDVixjQUFjLGtCQUFrQixjQUFjO0FBQUEsUUFDaEQ7QUFBQSxRQUNBLFFBQVEsV0FBVztBQUFBLE1BQ3JCLENBQUM7QUFDRCxVQUFJLElBQUksV0FBVyxLQUFLO0FBQ3RCLGVBQU8sRUFBRSxXQUFXLE1BQU0sWUFBWSxNQUFNLGNBQWMsTUFBTSxPQUFPLDBCQUEwQjtBQUFBLE1BQ25HO0FBQ0EsVUFBSSxDQUFDLElBQUksSUFBSTtBQUNYLGVBQU8sRUFBRSxXQUFXLE1BQU0sWUFBWSxNQUFNLGNBQWMsTUFBTSxPQUFPLG1CQUFtQixJQUFJLE1BQU0sR0FBRztBQUFBLE1BQ3pHO0FBQ0EsWUFBTSxPQUFPLE1BQU0sSUFBSSxLQUFLO0FBQzVCLFlBQU0sT0FBTyxNQUFNLFFBQVEsSUFBSSxJQUFJLEtBQUssS0FBSyxDQUFDLFlBQVksQ0FBQyxRQUFRLEtBQUssSUFBSTtBQUM1RSxVQUFJLENBQUMsTUFBTTtBQUNULGVBQU8sRUFBRSxXQUFXLE1BQU0sWUFBWSxNQUFNLGNBQWMsTUFBTSxPQUFPLDBCQUEwQjtBQUFBLE1BQ25HO0FBQ0EsYUFBTztBQUFBLFFBQ0wsV0FBVyxLQUFLLFlBQVk7QUFBQSxRQUM1QixZQUFZLEtBQUssWUFBWSxzQkFBc0IsSUFBSTtBQUFBLFFBQ3ZELGNBQWMsS0FBSyxRQUFRO0FBQUEsTUFDN0I7QUFBQSxJQUNGLFVBQUU7QUFDQSxtQkFBYSxPQUFPO0FBQUEsSUFDdEI7QUFBQSxFQUNGLFNBQVMsR0FBRztBQUNWLFdBQU87QUFBQSxNQUNMLFdBQVc7QUFBQSxNQUNYLFlBQVk7QUFBQSxNQUNaLGNBQWM7QUFBQSxNQUNkLE9BQU8sYUFBYSxRQUFRLEVBQUUsVUFBVSxPQUFPLENBQUM7QUFBQSxJQUNsRDtBQUFBLEVBQ0Y7QUFDRjtBQUVPLFNBQVNBLGtCQUFpQixHQUFtQjtBQUNsRCxTQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsT0FBTyxFQUFFO0FBQ25DO0FBRU8sU0FBU0MsaUJBQWdCLEdBQVcsR0FBbUI7QUFDNUQsUUFBTSxLQUFLRixZQUFXLEtBQUssQ0FBQztBQUM1QixRQUFNLEtBQUtBLFlBQVcsS0FBSyxDQUFDO0FBQzVCLE1BQUksQ0FBQyxNQUFNLENBQUMsR0FBSSxRQUFPO0FBQ3ZCLFdBQVMsSUFBSSxHQUFHLEtBQUssR0FBRyxLQUFLO0FBQzNCLFVBQU0sT0FBTyxPQUFPLEdBQUcsQ0FBQyxDQUFDLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQztBQUN6QyxRQUFJLFNBQVMsRUFBRyxRQUFPO0FBQUEsRUFDekI7QUFDQSxTQUFPO0FBQ1Q7QUFFTyxTQUFTLHFCQUFvQztBQUNsRCxRQUFNLGFBQWE7QUFBQSxRQUNqQiw0QkFBSyx5QkFBUSxHQUFHLG1CQUFtQixRQUFRO0FBQUEsUUFDM0Msd0JBQUssVUFBVyxRQUFRO0FBQUEsRUFDMUI7QUFDQSxhQUFXLGFBQWEsWUFBWTtBQUNsQyxZQUFJLGdDQUFXLHdCQUFLLFdBQVcsWUFBWSxhQUFhLFFBQVEsUUFBUSxDQUFDLEVBQUcsUUFBTztBQUFBLEVBQ3JGO0FBQ0EsU0FBTztBQUNUO0FBRU8sU0FBUywyQkFBMkIsWUFBK0M7QUFDeEYsTUFBSSxDQUFDLFlBQVk7QUFDZixXQUFPO0FBQUEsTUFDTCxNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsTUFDUCxRQUFRO0FBQUEsSUFDVjtBQUFBLEVBQ0Y7QUFDQSxRQUFNLGFBQWEsV0FBVyxRQUFRLE9BQU8sR0FBRztBQUNoRCxNQUFJLG1EQUFtRCxLQUFLLFVBQVUsR0FBRztBQUN2RSxXQUFPLEVBQUUsTUFBTSxZQUFZLE9BQU8sWUFBWSxRQUFRLFdBQVc7QUFBQSxFQUNuRTtBQUNBLFVBQUksZ0NBQVcsd0JBQUssWUFBWSxNQUFNLENBQUMsR0FBRztBQUN4QyxXQUFPLEVBQUUsTUFBTSxhQUFhLE9BQU8sOEJBQThCLFFBQVEsV0FBVztBQUFBLEVBQ3RGO0FBQ0EsTUFBSSxXQUFXLFNBQVMseUJBQXlCLEtBQUssV0FBVyxTQUFTLDBCQUEwQixHQUFHO0FBQ3JHLFdBQU8sRUFBRSxNQUFNLGlCQUFpQixPQUFPLDJCQUEyQixRQUFRLFdBQVc7QUFBQSxFQUN2RjtBQUNBLFVBQUksZ0NBQVcsd0JBQUssWUFBWSxjQUFjLENBQUMsR0FBRztBQUNoRCxXQUFPLEVBQUUsTUFBTSxrQkFBa0IsT0FBTyxrQkFBa0IsUUFBUSxXQUFXO0FBQUEsRUFDL0U7QUFDQSxTQUFPLEVBQUUsTUFBTSxXQUFXLE9BQU8sV0FBVyxRQUFRLFdBQVc7QUFDakU7QUFFTyxTQUFTLGtCQUFrQixLQUFhLE1BQXNCO0FBQ25FLE1BQUksUUFBUSxhQUFhLFlBQVksNkJBQTZCLEtBQUssSUFBSSxHQUFHO0FBQzVFO0FBQUEsRUFDRjtBQUNBLFFBQU0sWUFBUSxrQ0FBTSxRQUFRLFVBQVUsQ0FBQyxLQUFLLEdBQUcsSUFBSSxHQUFHO0FBQUEsSUFDcEQsU0FBSywrQkFBUSwyQkFBUSxHQUFHLEdBQUcsTUFBTSxNQUFNLElBQUk7QUFBQSxJQUMzQyxLQUFLLEVBQUUsR0FBRyxRQUFRLEtBQUssOEJBQThCLElBQUk7QUFBQSxJQUN6RCxVQUFVO0FBQUEsSUFDVixPQUFPO0FBQUEsRUFDVCxDQUFDO0FBQ0QsUUFBTSxNQUFNO0FBQ2Q7QUFFTyxTQUFTLDZCQUE2QixLQUFhLE1BQXlCO0FBQ2pGLFFBQU0sUUFBUSxrQ0FBa0MsUUFBUSxHQUFHLElBQUksS0FBSyxJQUFJLENBQUM7QUFDekUsUUFBTSxVQUFVLG9CQUFvQixLQUFLLHNEQUFzRCxLQUFLO0FBQ3BHLFFBQU0sVUFBVTtBQUFBLElBQ2QsUUFBUSxXQUFXLE9BQU8sQ0FBQztBQUFBLElBQzNCLE1BQU0sZUFBVywrQkFBUSwyQkFBUSxHQUFHLEdBQUcsTUFBTSxNQUFNLElBQUksQ0FBQyxDQUFDO0FBQUEsSUFDekQsa0NBQWtDLENBQUMsUUFBUSxVQUFVLEtBQUssR0FBRyxJQUFJLEVBQUUsSUFBSSxVQUFVLEVBQUUsS0FBSyxHQUFHLENBQUM7QUFBQSxFQUM5RixFQUFFLEtBQUssTUFBTTtBQUNiLFFBQU0sYUFBUztBQUFBLElBQ2I7QUFBQSxJQUNBO0FBQUEsTUFDRTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQSxHQUFHLE9BQU87QUFBQSxJQUNaO0FBQUEsSUFDQTtBQUFBLE1BQ0UsVUFBVTtBQUFBLE1BQ1YsT0FBTztBQUFBLElBQ1Q7QUFBQSxFQUNGO0FBQ0EsTUFBSSxPQUFPLFdBQVcsRUFBRyxRQUFPO0FBQ2hDLE1BQUksUUFBUSxxREFBcUQsT0FBTyxPQUFPLFdBQVcsT0FBTyxNQUFNLEVBQUU7QUFDekcsU0FBTztBQUNUO0FBRU8sU0FBUyxXQUFXLE9BQXVCO0FBQ2hELFNBQU8sSUFBSSxNQUFNLFFBQVEsTUFBTSxPQUFPLENBQUM7QUFDekM7QUFFTyxTQUFTLHNCQUFzQixZQUFxQztBQUN6RSxRQUFNLFNBQVMsVUFBVSxFQUFFO0FBQzNCLFFBQU0sVUFBVSxRQUFRLGlCQUFpQjtBQUN6QyxRQUFNLFFBQXlCO0FBQUEsSUFDN0IsWUFBVyxvQkFBSSxLQUFLLEdBQUUsWUFBWTtBQUFBLElBQ2xDLFFBQVE7QUFBQSxJQUNSLGdCQUFnQjtBQUFBLElBQ2hCLGVBQWU7QUFBQSxJQUNmLFdBQVcsUUFBUSxrQkFBa0IsV0FBVyxPQUFPLGFBQWEsT0FBTztBQUFBLElBQzNFLFlBQVk7QUFBQSxJQUNaLE1BQU0sUUFBUSxjQUFjO0FBQUEsSUFDNUI7QUFBQSxJQUNBO0FBQUEsSUFDQSxvQkFBb0IsMkJBQTJCLFVBQVU7QUFBQSxFQUMzRDtBQUNBLHVCQUFxQixLQUFLO0FBQzFCLFNBQU87QUFDVDs7O0FDOVRBLElBQUFHLG1CQUEyQztBQUMzQyxJQUFBQyxtQkFBMkI7QUFDM0IsSUFBQUMsc0JBQTJCOzs7QUNGM0IsSUFBQUMsbUJBQTJDO0FBaUVwQyxTQUFTLHdCQUF1RDtBQUNyRSxRQUFNLFdBQVcsdUJBQXVCO0FBQ3hDLFFBQU0sWUFBWSxzQkFBc0IsUUFBUTtBQUNoRCxRQUFNLGVBQWUsVUFBVSxtQkFDM0IsVUFBVSxtQkFBbUIsT0FBTyxLQUFLLE9BQ3pDO0FBQ0osTUFBSSxnQkFBZ0IsQ0FBQyxhQUFhLFlBQVksRUFBRyxRQUFPO0FBQ3hELFFBQU0sY0FBYyxVQUFVLDhCQUMxQixVQUFVLGVBQWUsa0JBQWtCLEtBQUssU0FBUyxhQUFhLEtBQUssT0FDM0U7QUFDSixNQUFJLGVBQWUsQ0FBQyxZQUFZLFlBQVksRUFBRyxRQUFPO0FBQ3RELFFBQU0sVUFBVSwrQkFBYyxpQkFBaUI7QUFDL0MsTUFBSSxXQUFXLENBQUMsUUFBUSxZQUFZLEVBQUcsUUFBTztBQUM5QyxTQUFPLCtCQUFjLGNBQWMsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksWUFBWSxDQUFDLEtBQUs7QUFDNUU7QUFFTyxTQUFTLDJCQUFrRDtBQUNoRSxRQUFNLE1BQU0sc0JBQXNCO0FBQ2xDLE1BQUksQ0FBQyxPQUFPLElBQUksWUFBWSxFQUFHLFFBQU87QUFDdEMsU0FBTyxFQUFFLFVBQVUsSUFBSSxJQUFJLGVBQWUsSUFBSSxZQUFZLEdBQUc7QUFDL0Q7QUFFTyxTQUFTLGlCQUFpQixVQUEyQjtBQUMxRCxRQUFNLE1BQU0sK0JBQWMsT0FBTyxRQUFRO0FBQ3pDLE1BQUksQ0FBQyxPQUFPLElBQUksWUFBWSxFQUFHLFFBQU87QUFDdEMsTUFBSSxJQUFJLFlBQVksRUFBRyxLQUFJLFFBQVE7QUFDbkMsTUFBSSxLQUFLO0FBQ1QsTUFBSSxNQUFNO0FBQ1YsU0FBTztBQUNUO0FBRU8sU0FBUyxnQkFBZ0IsVUFBMkI7QUFDekQsUUFBTSxNQUFNLCtCQUFjLE9BQU8sUUFBUTtBQUN6QyxNQUFJLENBQUMsT0FBTyxJQUFJLFlBQVksRUFBRyxRQUFPO0FBQ3RDLE1BQUksS0FBSztBQUNULFNBQU87QUFDVDtBQUVBLGVBQXNCLHVCQUF1QixNQUFnRDtBQUMzRixRQUFNLFdBQVcsdUJBQXVCO0FBQ3hDLFFBQU0sZ0JBQWdCLFVBQVU7QUFDaEMsUUFBTSxZQUFZLHNCQUFzQixRQUFRO0FBQ2hELE1BQUksQ0FBQyxZQUFZLENBQUMsZUFBZSxrQkFBa0IsQ0FBQyxVQUFVLGdCQUFnQjtBQUM1RSxVQUFNLElBQUk7QUFBQSxNQUNSO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFFQSxRQUFNLFFBQVEsb0JBQW9CLEtBQUssS0FBSztBQUM1QyxRQUFNLFNBQVMsS0FBSyxVQUFVO0FBQzlCLFFBQU0sYUFBYSxLQUFLLGNBQWM7QUFDdEMsUUFBTSxPQUFPLElBQUksNkJBQVk7QUFBQSxJQUMzQixnQkFBZ0I7QUFBQSxNQUNkLFNBQVMsY0FBYyxTQUFTO0FBQUEsTUFDaEMsa0JBQWtCO0FBQUEsTUFDbEIsaUJBQWlCO0FBQUEsTUFDakIsWUFBWTtBQUFBLE1BQ1osVUFBVSxjQUFjLFNBQVM7QUFBQSxJQUNuQztBQUFBLEVBQ0YsQ0FBQztBQUNELFFBQU0sYUFBYUMsdUJBQXNCLElBQUk7QUFDN0MsZ0JBQWMsZUFBZSxZQUFZLFFBQVEsT0FBTyxVQUFVO0FBQ2xFLFdBQVMsYUFBYSxNQUFNLEdBQUcsaUJBQWlCLFVBQVU7QUFDMUQsUUFBTSxLQUFLLFlBQVksUUFBUSxZQUFZLE9BQU8sTUFBTSxDQUFDO0FBQ3pELFNBQU87QUFDVDtBQUVBLGVBQXNCLGtCQUFrQixNQUF5RDtBQUMvRixRQUFNLFdBQVcsdUJBQXVCO0FBQ3hDLFFBQU0sWUFBWSxzQkFBc0IsUUFBUTtBQUNoRCxNQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsU0FBUztBQUNuQyxVQUFNLElBQUk7QUFBQSxNQUNSO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFFQSxRQUFNLFFBQVEsb0JBQW9CLEtBQUssS0FBSztBQUM1QyxRQUFNLFNBQVMsS0FBSyxVQUFVO0FBQzlCLFFBQU0sU0FBUyxPQUFPLEtBQUssbUJBQW1CLFdBQzFDLCtCQUFjLE9BQU8sS0FBSyxjQUFjLElBQ3hDLCtCQUFjLGlCQUFpQjtBQUNuQyxRQUFNLGVBQWUsU0FBUyxlQUFlO0FBRTdDLE1BQUk7QUFDSixNQUFJLFVBQVUsZ0JBQWdCLE9BQU8saUJBQWlCLFlBQVk7QUFDaEUsVUFBTSxNQUFNLGFBQWEsS0FBSyxTQUFTLGVBQWU7QUFBQSxNQUNwRCxjQUFjO0FBQUEsTUFDZDtBQUFBLE1BQ0EsTUFBTSxLQUFLLFNBQVM7QUFBQSxNQUNwQixZQUFZLEtBQUssY0FBYztBQUFBLE1BQy9CO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSCxXQUFXLFdBQVcsV0FBVyxVQUFVLHFCQUFxQixPQUFPLFNBQVMsc0JBQXNCLFlBQVk7QUFDaEgsVUFBTSxNQUFNLFNBQVMsa0JBQWtCLEtBQUs7QUFBQSxFQUM5QyxXQUFXLFdBQVcsV0FBVyxVQUFVLDBCQUEwQixPQUFPLFNBQVMsMkJBQTJCLFlBQVk7QUFDMUgsVUFBTSxNQUFNLFNBQVMsdUJBQXVCLEtBQUs7QUFBQSxFQUNuRCxXQUFXLFVBQVUsb0JBQW9CLE9BQU8sU0FBUyxxQkFBcUIsWUFBWTtBQUN4RixVQUFNLE1BQU0sU0FBUyxpQkFBaUIsTUFBTTtBQUFBLEVBQzlDO0FBRUEsTUFBSSxDQUFDLE9BQU8sSUFBSSxZQUFZLEdBQUc7QUFDN0IsVUFBTSxJQUFJLE1BQU0sdURBQXVEO0FBQUEsRUFDekU7QUFFQSxNQUFJLEtBQUssUUFBUTtBQUNmLFFBQUksVUFBVSxLQUFLLE1BQU07QUFBQSxFQUMzQjtBQUNBLE1BQUksVUFBVSxDQUFDLE9BQU8sWUFBWSxHQUFHO0FBQ25DLFFBQUk7QUFDRixVQUFJLGdCQUFnQixNQUFNO0FBQUEsSUFDNUIsUUFBUTtBQUFBLElBQUM7QUFBQSxFQUNYO0FBQ0EsTUFBSSxLQUFLLFNBQVMsT0FBTztBQUN2QixRQUFJLEtBQUs7QUFBQSxFQUNYO0FBRUEsU0FBTztBQUFBLElBQ0wsVUFBVSxJQUFJO0FBQUEsSUFDZCxlQUFlLElBQUksWUFBWTtBQUFBLEVBQ2pDO0FBQ0Y7QUFFTyxTQUFTQSx1QkFBc0IsTUFBNkM7QUFDakYsUUFBTSxhQUFhLE1BQU0sS0FBSyxVQUFVO0FBQ3hDLFNBQU87QUFBQSxJQUNMLElBQUksS0FBSyxZQUFZO0FBQUEsSUFDckIsYUFBYSxLQUFLO0FBQUEsSUFDbEIsSUFBSSxDQUFDLE9BQWlCLGFBQXlCO0FBQzdDLFVBQUksVUFBVSxVQUFVO0FBQ3RCLGFBQUssWUFBWSxLQUFLLGFBQWEsUUFBUTtBQUFBLE1BQzdDLE9BQU87QUFDTCxhQUFLLFlBQVksR0FBRyxPQUFPLFFBQVE7QUFBQSxNQUNyQztBQUNBLGFBQU87QUFBQSxJQUNUO0FBQUEsSUFDQSxNQUFNLENBQUMsT0FBZSxhQUEyQztBQUMvRCxXQUFLLFlBQVksS0FBSyxPQUFzQixRQUFRO0FBQ3BELGFBQU87QUFBQSxJQUNUO0FBQUEsSUFDQSxLQUFLLENBQUMsT0FBZSxhQUEyQztBQUM5RCxXQUFLLFlBQVksSUFBSSxPQUFzQixRQUFRO0FBQ25ELGFBQU87QUFBQSxJQUNUO0FBQUEsSUFDQSxnQkFBZ0IsQ0FBQyxPQUFlLGFBQTJDO0FBQ3pFLFdBQUssWUFBWSxlQUFlLE9BQXNCLFFBQVE7QUFDOUQsYUFBTztBQUFBLElBQ1Q7QUFBQSxJQUNBLGFBQWEsTUFBTSxLQUFLLFlBQVksWUFBWTtBQUFBLElBQ2hELFdBQVcsTUFBTSxLQUFLLFlBQVksVUFBVTtBQUFBLElBQzVDLE9BQU8sTUFBTSxLQUFLLFlBQVksTUFBTTtBQUFBLElBQ3BDLE1BQU0sTUFBTTtBQUFBLElBQUM7QUFBQSxJQUNiLE1BQU0sTUFBTTtBQUFBLElBQUM7QUFBQSxJQUNiLFdBQVc7QUFBQSxJQUNYLGtCQUFrQjtBQUFBLElBQ2xCLFNBQVMsTUFBTTtBQUNiLFlBQU0sSUFBSSxXQUFXO0FBQ3JCLGFBQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxNQUFNO0FBQUEsSUFDM0I7QUFBQSxJQUNBLGdCQUFnQixNQUFNO0FBQ3BCLFlBQU0sSUFBSSxXQUFXO0FBQ3JCLGFBQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxNQUFNO0FBQUEsSUFDM0I7QUFBQSxJQUNBLFVBQVUsTUFBTTtBQUFBLElBQUM7QUFBQSxJQUNqQixVQUFVLE1BQU07QUFBQSxJQUNoQix3QkFBd0IsTUFBTTtBQUFBLElBQUM7QUFBQSxJQUMvQixtQkFBbUIsTUFBTTtBQUFBLElBQUM7QUFBQSxJQUMxQiwyQkFBMkIsTUFBTTtBQUFBLElBQUM7QUFBQSxFQUNwQztBQUNGO0FBRU8sU0FBUyxZQUFZLE9BQWUsUUFBd0I7QUFDakUsUUFBTSxNQUFNLElBQUksSUFBSSxvQkFBb0I7QUFDeEMsTUFBSSxhQUFhLElBQUksVUFBVSxNQUFNO0FBQ3JDLE1BQUksVUFBVSxJQUFLLEtBQUksYUFBYSxJQUFJLGdCQUFnQixLQUFLO0FBQzdELFNBQU8sSUFBSSxTQUFTO0FBQ3RCO0FBRU8sU0FBUyxvQkFBb0IsS0FBcUI7QUFDdkQsTUFBSSxPQUFPLFFBQVEsWUFBWSxJQUFJLFNBQVMsSUFBSSxLQUFLLElBQUksU0FBUyxJQUFJLEdBQUc7QUFDdkUsVUFBTSxJQUFJLE1BQU0sMERBQTBEO0FBQUEsRUFDNUU7QUFDQSxRQUFNLFNBQVMsSUFBSSxJQUFJLEdBQUc7QUFDMUIsTUFBSSxDQUFDLENBQUMsU0FBUyxVQUFVLFFBQVEsU0FBUyxTQUFTLFFBQVEsRUFBRSxTQUFTLE9BQU8sUUFBUSxHQUFHO0FBQ3RGLFVBQU0sSUFBSSxNQUFNLHNDQUFzQyxPQUFPLFFBQVEsRUFBRTtBQUFBLEVBQ3pFO0FBQ0EsU0FBTyxPQUFPLFNBQVM7QUFDekI7QUFFTyxTQUFTLHlCQUFxRDtBQUNuRSxRQUFNLFdBQVksV0FBa0QseUJBQXlCO0FBQzdGLFNBQU8sWUFBWSxPQUFPLGFBQWEsV0FBWSxXQUFtQztBQUN4RjtBQUVPLFNBQVMsb0JBQW9CLE9BQXVCO0FBQ3pELE1BQUksT0FBTyxVQUFVLFlBQVksQ0FBQyxNQUFNLFdBQVcsR0FBRyxHQUFHO0FBQ3ZELFVBQU0sSUFBSSxNQUFNLDJDQUEyQztBQUFBLEVBQzdEO0FBQ0EsTUFBSSxNQUFNLFNBQVMsS0FBSyxLQUFLLE1BQU0sU0FBUyxJQUFJLEtBQUssTUFBTSxTQUFTLElBQUksR0FBRztBQUN6RSxVQUFNLElBQUksTUFBTSwrREFBK0Q7QUFBQSxFQUNqRjtBQUNBLFNBQU87QUFDVDtBQUVPLFNBQVNDLFVBQVMsT0FBZ0Q7QUFDdkUsU0FBTyxTQUFTLE9BQU8sVUFBVSxXQUFXLFFBQW1DO0FBQ2pGO0FBRU8sU0FBUyxpQkFBaUIsUUFBaUIsUUFBZ0IsTUFBMEI7QUFDMUYsUUFBTSxLQUFLQSxVQUFTLE1BQU0sSUFBSSxNQUFNO0FBQ3BDLE1BQUksT0FBTyxPQUFPLFdBQVksUUFBTztBQUNyQyxTQUFPLEdBQUcsTUFBTSxRQUFRLElBQUk7QUFDOUI7QUFFTyxTQUFTLGtCQUFrQixLQUF5RDtBQUN6RixNQUFJLENBQUMsSUFBSyxRQUFPO0FBQ2pCLFFBQU0sS0FBS0EsVUFBUyxHQUFHLEdBQUc7QUFDMUIsTUFBSSxPQUFPLE9BQU8sV0FBWSxRQUFPO0FBQ3JDLE1BQUk7QUFDRixXQUFPLFFBQVEsR0FBRyxLQUFLLEdBQUcsQ0FBQztBQUFBLEVBQzdCLFFBQVE7QUFDTixXQUFPO0FBQUEsRUFDVDtBQUNGO0FBRU8sU0FBUyxZQUFZLEtBQStEO0FBQ3pGLFFBQU0sS0FBS0EsVUFBUyxHQUFHLEdBQUc7QUFDMUIsU0FBTyxPQUFPLE9BQU8sV0FBVyxLQUFLO0FBQ3ZDOzs7QUQ3UE8sSUFBTSwwQkFBMEIsb0JBQUksSUFBWTtBQUN2RCxJQUFNLFdBQVcsb0JBQUksSUFBNEI7QUFFMUMsU0FBUyx5QkFBeUIsSUFBZ0M7QUFDdkUsMEJBQXdCLElBQUksR0FBRyxFQUFFO0FBQ2pDLEtBQUcsS0FBSyxhQUFhLE1BQU07QUFBRSw0QkFBd0IsT0FBTyxHQUFHLEVBQUU7QUFBQSxFQUFHLENBQUM7QUFDdkU7QUFxQkEsZUFBc0IsY0FDcEIsS0FDQSxNQUN1QjtBQUN2QixRQUFNLEtBQUssZUFBZSxLQUFLLFVBQU0sZ0NBQVcsR0FBRyxlQUFlO0FBQ2xFLFFBQU0sTUFBTSxXQUFXLElBQUksSUFBSSxFQUFFO0FBQ2pDLE1BQUksU0FBUyxJQUFJLEdBQUcsRUFBRyxPQUFNLElBQUksTUFBTSw4QkFBOEIsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFO0FBRW5GLFFBQU0sU0FBUyxPQUFPLEtBQUssbUJBQW1CLFdBQzFDLCtCQUFjLE9BQU8sS0FBSyxjQUFjLElBQ3hDLHNCQUFzQjtBQUMxQixNQUFJLENBQUMsVUFBVSxrQkFBa0IsTUFBTSxHQUFHO0FBQ3hDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQztBQUFBLEVBQzVEO0FBRUEsUUFBTSxXQUFXLHVCQUF1QjtBQUN4QyxRQUFNLGdCQUFnQixVQUFVO0FBQ2hDLFFBQU0sUUFBUSxLQUFLLFVBQVUsU0FBWSxPQUFPLG9CQUFvQixLQUFLLEtBQUs7QUFDOUUsUUFBTSxTQUFTLEtBQUssVUFBVTtBQUM5QixRQUFNLE9BQU8sSUFBSSw2QkFBWTtBQUFBLElBQzNCLGdCQUFnQjtBQUFBLE1BQ2QsU0FBUyxLQUFLLHNCQUFzQixZQUMvQiw2QkFBVyxrQkFBa0IsSUFBSSxxQkFBcUIsU0FDdkQsZUFBZSxTQUFTO0FBQUEsTUFDNUIsa0JBQWtCO0FBQUEsTUFDbEIsaUJBQWlCO0FBQUEsTUFDakIsU0FBUztBQUFBLE1BQ1QsWUFBWTtBQUFBLE1BQ1osVUFBVSxlQUFlLFNBQVM7QUFBQSxJQUNwQztBQUFBLEVBQ0YsQ0FBQztBQUNELDJCQUF5QixLQUFLLFdBQVc7QUFFekMsTUFBSSxLQUFLLGlCQUFpQjtBQUN4QixxQkFBaUIsTUFBTSxzQkFBc0IsQ0FBQyxLQUFLLGVBQWUsQ0FBQztBQUNuRSxxQkFBaUJDLFVBQVMsSUFBSSxHQUFHLGlCQUFpQixzQkFBc0IsQ0FBQyxLQUFLLGVBQWUsQ0FBQztBQUFBLEVBQ2hHO0FBRUEsUUFBTSxVQUEwQjtBQUFBLElBQzlCO0FBQUEsSUFDQSxTQUFTLElBQUk7QUFBQSxJQUNiO0FBQUEsSUFDQTtBQUFBLElBQ0EsZ0JBQWdCLFlBQVksTUFBTTtBQUFBLElBQ2xDLFlBQVk7QUFBQSxJQUNaLGlCQUFpQixDQUFDO0FBQUEsSUFDbEIsVUFBVTtBQUFBLEVBQ1o7QUFDQSxXQUFTLElBQUksS0FBSyxPQUFPO0FBRXpCLE1BQUk7QUFDRixRQUFJLFVBQVUsUUFBUSxLQUFLLHNCQUFzQixTQUFTLGVBQWUsZ0JBQWdCO0FBQ3ZGLFlBQU0sYUFBYSxLQUFLLGNBQWM7QUFDdEMsWUFBTSxhQUFhQyx1QkFBc0IsSUFBSTtBQUM3QyxvQkFBYyxlQUFlLFlBQVksUUFBUSxPQUFPLFVBQVU7QUFDbEUsZ0JBQVUsYUFBYSxNQUFNLEdBQUcsaUJBQWlCLFVBQVU7QUFBQSxJQUM3RDtBQUVBLGtCQUFjLFNBQVMsTUFBTTtBQUM3QixRQUFJLEtBQUssT0FBUSxrQkFBaUIsU0FBUyxLQUFLLE1BQU07QUFDdEQsUUFBSSxLQUFLLFlBQVksTUFBTyxtQkFBa0IsU0FBUyxLQUFLO0FBRTVELFFBQUksVUFBVSxNQUFNO0FBQ2xCLFlBQU0sS0FBSyxZQUFZLFFBQVEsWUFBWSxPQUFPLE1BQU0sQ0FBQztBQUFBLElBQzNELFdBQVcsS0FBSyxLQUFLO0FBQ25CLFlBQU0sS0FBSyxZQUFZLFFBQVEsb0JBQW9CLEtBQUssR0FBRyxDQUFDO0FBQUEsSUFDOUQsT0FBTztBQUNMLFlBQU0sS0FBSyxZQUFZLFFBQVEsYUFBYTtBQUFBLElBQzlDO0FBQUEsRUFDRixTQUFTLEdBQUc7QUFDVixtQkFBZSxPQUFPO0FBQ3RCLFVBQU07QUFBQSxFQUNSO0FBRUEsTUFBSSxRQUFRLG9CQUFvQixJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUk7QUFBQSxJQUM5QyxnQkFBZ0IsUUFBUTtBQUFBLElBQ3hCLGVBQWUsS0FBSyxZQUFZO0FBQUEsSUFDaEMsWUFBWSxRQUFRO0FBQUEsRUFDdEIsQ0FBQztBQUNELFNBQU8sV0FBVyxPQUFPO0FBQzNCO0FBRUEsZUFBc0IsWUFDcEIsU0FDQSxJQUNBLFFBQ0EsS0FDQSxNQUNrQjtBQUNsQixRQUFNLE9BQU8sV0FBVyxTQUFTLEVBQUU7QUFDbkMsTUFBSSxXQUFXLFlBQWEsUUFBTyxpQkFBaUIsTUFBTSxHQUF5QjtBQUNuRixNQUFJLFdBQVcsYUFBYyxRQUFPLGtCQUFrQixNQUFNLFFBQVEsR0FBRyxDQUFDO0FBQ3hFLE1BQUksV0FBVyxlQUFnQixRQUFPLG9CQUFvQixJQUFJO0FBQzlELE1BQUksV0FBVyxhQUFhO0FBQzFCLFVBQU0sUUFBUSxvQkFBb0IsT0FBTyxHQUFHLENBQUM7QUFDN0MsVUFBTSxTQUFTLE9BQU8sU0FBUyxZQUFZLE9BQU8sT0FBTztBQUN6RCxXQUFPLEtBQUssS0FBSyxZQUFZLFFBQVEsWUFBWSxPQUFPLE1BQU0sQ0FBQztBQUFBLEVBQ2pFO0FBQ0EsTUFBSSxXQUFXLFVBQVcsUUFBTyxLQUFLLEtBQUssWUFBWSxRQUFRLG9CQUFvQixPQUFPLEdBQUcsQ0FBQyxDQUFDO0FBQy9GLE1BQUksV0FBVyxVQUFXLFFBQU8sbUJBQW1CLFNBQVMsRUFBRTtBQUMvRCxRQUFNLElBQUksTUFBTSw4QkFBOEIsTUFBTSxFQUFFO0FBQ3hEO0FBRU8sU0FBUyxXQUFXLE1BQW9DO0FBQzdELFNBQU87QUFBQSxJQUNMLElBQUksS0FBSztBQUFBLElBQ1QsZUFBZSxLQUFLLEtBQUssWUFBWTtBQUFBLElBQ3JDLGdCQUFnQixLQUFLO0FBQUEsSUFDckIsV0FBVyxDQUFDLFdBQVcsUUFBUSxRQUFRLGlCQUFpQixNQUFNLE1BQU0sQ0FBQztBQUFBLElBQ3JFLFlBQVksQ0FBQyxZQUFZLFFBQVEsUUFBUSxrQkFBa0IsTUFBTSxPQUFPLENBQUM7QUFBQSxJQUN6RSxjQUFjLE1BQU0sUUFBUSxRQUFRLG9CQUFvQixJQUFJLENBQUM7QUFBQSxJQUM3RCxXQUFXLENBQUMsT0FBTyxXQUFXLEtBQUssS0FBSyxZQUFZLFFBQVEsWUFBWSxvQkFBb0IsS0FBSyxHQUFHLFVBQVUsT0FBTyxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBQUEsSUFBQyxDQUFDO0FBQUEsSUFDckksU0FBUyxDQUFDLFFBQVEsS0FBSyxLQUFLLFlBQVksUUFBUSxvQkFBb0IsR0FBRyxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBQUEsSUFBQyxDQUFDO0FBQUEsSUFDdkYsU0FBUyxNQUFNLFFBQVEsUUFBUSxtQkFBbUIsS0FBSyxTQUFTLEtBQUssRUFBRSxDQUFDO0FBQUEsRUFDMUU7QUFDRjtBQUVPLFNBQVMsY0FBYyxNQUFzQixRQUFzQztBQUN4RixRQUFNLFVBQVUseUJBQXlCLFFBQVEsS0FBSyxJQUFJO0FBQzFELE1BQUksUUFBUSxnQkFBZ0I7QUFDMUIscUJBQWlCLFFBQVEsa0JBQWtCLENBQUMsS0FBSyxJQUFJLENBQUM7QUFDdEQsU0FBSyxhQUFhO0FBQUEsRUFDcEIsV0FDRSxRQUFRLGdCQUNSLFFBQVEsaUJBQ1I7QUFDQSxRQUFJO0FBQ0Ysc0JBQWdCLFFBQVEsS0FBSyxJQUFJO0FBQ2pDLFdBQUssYUFBYTtBQUFBLElBQ3BCLFNBQVMsR0FBRztBQUNWLFVBQUksUUFBUSxrRUFBa0U7QUFBQSxRQUM1RSxTQUFTLEtBQUs7QUFBQSxRQUNkLFFBQVEsS0FBSztBQUFBLFFBQ2IsT0FBTyxPQUFPLENBQUM7QUFBQSxNQUNqQixDQUFDO0FBQUEsSUFDSDtBQUFBLEVBQ0Y7QUFDQSxNQUFJLENBQUMsS0FBSyxZQUFZO0FBQ3BCLFVBQU0sSUFBSSxNQUFNLDJEQUEyRDtBQUFBLEVBQzdFO0FBRUEsUUFBTSxVQUFVLE1BQU0sbUJBQW1CLEtBQUssU0FBUyxLQUFLLEVBQUU7QUFDOUQsa0JBQWdCLFFBQVEsTUFBTSxVQUFVLE9BQU87QUFDL0Msa0JBQWdCLFFBQVEsTUFBTSxTQUFTLE9BQU87QUFDaEQ7QUFFTyxTQUFTLG9CQUFvQixNQUE0QjtBQUM5RCxNQUFJLEtBQUssU0FBVTtBQUNuQixRQUFNLFNBQVMsS0FBSyxtQkFBbUIsT0FBTyxPQUFPLCtCQUFjLE9BQU8sS0FBSyxjQUFjO0FBQzdGLE1BQUksQ0FBQyxVQUFVLGtCQUFrQixNQUFNLEVBQUc7QUFDMUMsUUFBTSxjQUFjRCxVQUFTLE1BQU0sR0FBRztBQUN0QyxRQUFNLGtCQUFrQkEsVUFBUyxLQUFLLElBQUksR0FBRztBQUM3QyxNQUFJLEtBQUssZUFBZSxpQkFBaUIsaUJBQWlCO0FBQ3hELFFBQUk7QUFDRixVQUFJLE9BQU9BLFVBQVMsTUFBTSxHQUFHLHNCQUFzQixZQUFZO0FBQzdELHlCQUFpQixRQUFRLHFCQUFxQixDQUFDLEtBQUssSUFBSSxDQUFDO0FBQUEsTUFDM0QsT0FBTztBQUNMLHlCQUFpQixhQUFhLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztBQUFBLE1BQ2pFO0FBQ0E7QUFBQSxJQUNGLFNBQVMsR0FBRztBQUNWLFVBQUksUUFBUSx5Q0FBeUM7QUFBQSxRQUNuRCxTQUFTLEtBQUs7QUFBQSxRQUNkLFFBQVEsS0FBSztBQUFBLFFBQ2IsT0FBTyxPQUFPLENBQUM7QUFBQSxNQUNqQixDQUFDO0FBQUEsSUFDSDtBQUFBLEVBQ0Y7QUFDQSxNQUFJLE9BQU9BLFVBQVMsTUFBTSxHQUFHLHNCQUFzQixZQUFZO0FBQzdELHFCQUFpQixRQUFRLHFCQUFxQixDQUFDLEtBQUssSUFBSSxDQUFDO0FBQUEsRUFDM0Q7QUFDRjtBQUVPLFNBQVMsaUJBQWlCLE1BQXNCLFFBQWtDO0FBQ3ZGLGVBQWEsTUFBTTtBQUNuQixtQkFBaUIsS0FBSyxNQUFNLGFBQWEsQ0FBQyxNQUFNLENBQUM7QUFDakQsbUJBQWlCQSxVQUFTLEtBQUssSUFBSSxHQUFHLGlCQUFpQixhQUFhLENBQUMsTUFBTSxDQUFDO0FBQzlFO0FBRU8sU0FBUyxrQkFBa0IsTUFBc0IsU0FBd0I7QUFDOUUsbUJBQWlCQSxVQUFTLEtBQUssSUFBSSxHQUFHLGlCQUFpQixjQUFjLENBQUMsT0FBTyxDQUFDO0FBQ2hGO0FBRU8sU0FBUyxtQkFBbUIsU0FBaUIsSUFBa0I7QUFDcEUsUUFBTSxPQUFPLFNBQVMsSUFBSSxXQUFXLFNBQVMsRUFBRSxDQUFDO0FBQ2pELE1BQUksQ0FBQyxLQUFNO0FBQ1gsaUJBQWUsSUFBSTtBQUNyQjtBQUVPLFNBQVMsd0JBQXdCLFNBQXVCO0FBQzdELGFBQVcsUUFBUSxDQUFDLEdBQUcsU0FBUyxPQUFPLENBQUMsR0FBRztBQUN6QyxRQUFJLEtBQUssWUFBWSxRQUFTLGdCQUFlLElBQUk7QUFBQSxFQUNuRDtBQUNGO0FBRU8sU0FBUyxxQkFBMkI7QUFDekMsYUFBVyxRQUFRLENBQUMsR0FBRyxTQUFTLE9BQU8sQ0FBQyxFQUFHLGdCQUFlLElBQUk7QUFDaEU7QUFFTyxTQUFTLGVBQWUsTUFBNEI7QUFDekQsTUFBSSxLQUFLLFNBQVU7QUFDbkIsT0FBSyxXQUFXO0FBQ2hCLFdBQVMsT0FBTyxLQUFLLEdBQUc7QUFDeEIsYUFBVyxXQUFXLEtBQUssZ0JBQWdCLE9BQU8sQ0FBQyxHQUFHO0FBQ3BELFFBQUk7QUFDRixjQUFRO0FBQUEsSUFDVixRQUFRO0FBQUEsSUFBQztBQUFBLEVBQ1g7QUFDQSxRQUFNLFNBQVMsS0FBSyxtQkFBbUIsT0FBTyxPQUFPLCtCQUFjLE9BQU8sS0FBSyxjQUFjO0FBQzdGLE1BQUksVUFBVSxDQUFDLGtCQUFrQixNQUFNLEdBQUc7QUFDeEMsUUFBSTtBQUNGLFVBQUksS0FBSyxlQUFlLGVBQWU7QUFDckMsMkJBQW1CLFFBQVEsS0FBSyxJQUFJO0FBQUEsTUFDdEMsV0FBVyxLQUFLLGVBQWUsZUFBZTtBQUM1Qyx5QkFBaUIsUUFBUSxxQkFBcUIsQ0FBQyxLQUFLLElBQUksQ0FBQztBQUFBLE1BQzNEO0FBQUEsSUFDRixTQUFTLEdBQUc7QUFDVixVQUFJLFFBQVEseUNBQXlDO0FBQUEsUUFDbkQsU0FBUyxLQUFLO0FBQUEsUUFDZCxRQUFRLEtBQUs7QUFBQSxRQUNiLE9BQU8sT0FBTyxDQUFDO0FBQUEsTUFDakIsQ0FBQztBQUFBLElBQ0g7QUFBQSxFQUNGO0FBQ0EsTUFBSTtBQUNGLFFBQUksQ0FBQyxLQUFLLEtBQUssWUFBWSxZQUFZLEdBQUc7QUFDeEMsV0FBSyxLQUFLLFlBQVksTUFBTSxFQUFFLHFCQUFxQixNQUFNLENBQUM7QUFBQSxJQUM1RDtBQUFBLEVBQ0YsUUFBUTtBQUFBLEVBQUM7QUFDWDtBQUVPLFNBQVMsV0FBVyxTQUFpQixJQUE0QjtBQUN0RSxRQUFNLE9BQU8sU0FBUyxJQUFJLFdBQVcsU0FBUyxFQUFFLENBQUM7QUFDakQsTUFBSSxDQUFDLFFBQVEsS0FBSyxTQUFVLE9BQU0sSUFBSSxNQUFNLDZCQUE2QixPQUFPLElBQUksRUFBRSxFQUFFO0FBQ3hGLFNBQU87QUFDVDtBQUVPLFNBQVMsV0FBVyxTQUFpQixRQUF3QjtBQUNsRSxTQUFPLEdBQUcsT0FBTyxJQUFJLE1BQU07QUFDN0I7QUFFTyxTQUFTLGdCQUFnQixRQUFnQyxPQUFtQztBQUNqRyxRQUFNLGNBQWNBLFVBQVMsS0FBSyxHQUFHO0FBQ3JDLE1BQUksZUFBZSxnQkFBZ0IsUUFBUTtBQUN6QyxxQkFBaUIsYUFBYSxxQkFBcUIsQ0FBQyxLQUFLLENBQUM7QUFBQSxFQUM1RDtBQUVBLG1CQUFpQkEsVUFBUyxNQUFNLEdBQUcsYUFBYSxnQkFBZ0IsQ0FBQ0EsVUFBUyxLQUFLLEdBQUcsZUFBZSxDQUFDO0FBQ2xHLE1BQUk7QUFDRixJQUFDLE1BQW9FLGNBQWM7QUFBQSxFQUNyRixRQUFRO0FBQUEsRUFBQztBQUNULG1CQUFpQkEsVUFBUyxNQUFNLFdBQVcsR0FBRyxtQkFBbUIsQ0FBQyxNQUFNLENBQUM7QUFFekUsUUFBTSxlQUFlQSxVQUFTLE1BQU0sR0FBRztBQUN2QyxNQUFJLE1BQU0sUUFBUSxZQUFZLEtBQUssQ0FBQyxhQUFhLFNBQVMsS0FBSyxHQUFHO0FBQ2hFLGlCQUFhLEtBQUssS0FBSztBQUFBLEVBQ3pCO0FBQ0Y7QUFFTyxTQUFTLG1CQUFtQixRQUFnQyxPQUFtQztBQUNwRyxtQkFBaUJBLFVBQVMsTUFBTSxHQUFHLGFBQWEsbUJBQW1CLENBQUNBLFVBQVMsS0FBSyxHQUFHLGVBQWUsQ0FBQztBQUNyRyxNQUFJO0FBQ0YsSUFBQyxNQUFvRSxjQUFjO0FBQUEsRUFDckYsUUFBUTtBQUFBLEVBQUM7QUFFVCxRQUFNLGVBQWVBLFVBQVMsTUFBTSxHQUFHO0FBQ3ZDLE1BQUksTUFBTSxRQUFRLFlBQVksR0FBRztBQUMvQixVQUFNLFFBQVEsYUFBYSxRQUFRLEtBQUs7QUFDeEMsUUFBSSxTQUFTLEVBQUcsY0FBYSxPQUFPLE9BQU8sQ0FBQztBQUFBLEVBQzlDO0FBQ0Y7QUFFTyxTQUFTLGdCQUNkLEtBQ0EsTUFDQSxPQUNBLFVBQ007QUFDTixRQUFNLEtBQUtBLFVBQVMsR0FBRyxHQUFHO0FBQzFCLFFBQU0sTUFBTUEsVUFBUyxHQUFHLEdBQUc7QUFDM0IsTUFBSSxPQUFPLE9BQU8sV0FBWTtBQUM5QixLQUFHLEtBQUssS0FBSyxPQUFPLFFBQVE7QUFDNUIsT0FBSyxnQkFBZ0IsS0FBSyxNQUFNO0FBQzlCLFFBQUksT0FBTyxRQUFRLFdBQVksS0FBSSxLQUFLLEtBQUssT0FBTyxRQUFRO0FBQUEsUUFDdkQsa0JBQWlCLEtBQUssa0JBQWtCLENBQUMsT0FBTyxRQUFRLENBQUM7QUFBQSxFQUNoRSxDQUFDO0FBQ0g7QUFFTyxTQUFTLGVBQWUsT0FBZSxPQUF1QjtBQUNuRSxNQUFJLE9BQU8sVUFBVSxZQUFZLENBQUMsb0JBQW9CLEtBQUssS0FBSyxHQUFHO0FBQ2pFLFVBQU0sSUFBSSxNQUFNLEdBQUcsS0FBSyxtRUFBbUU7QUFBQSxFQUM3RjtBQUNBLFNBQU87QUFDVDtBQUVPLFNBQVMsYUFBYSxRQUFrQztBQUM3RCxRQUFNLFNBQVMsQ0FBQyxRQUFRLEdBQUcsUUFBUSxHQUFHLFFBQVEsT0FBTyxRQUFRLE1BQU07QUFDbkUsTUFBSSxDQUFDLE9BQU8sTUFBTSxDQUFDLFVBQVUsT0FBTyxVQUFVLFlBQVksT0FBTyxTQUFTLEtBQUssQ0FBQyxHQUFHO0FBQ2pGLFVBQU0sSUFBSSxNQUFNLDREQUE0RDtBQUFBLEVBQzlFO0FBQ0EsTUFBSSxPQUFPLFFBQVEsS0FBSyxPQUFPLFNBQVMsR0FBRztBQUN6QyxVQUFNLElBQUksTUFBTSw4Q0FBOEM7QUFBQSxFQUNoRTtBQUNGOzs7QUVqWEEsSUFBQUUsbUJBQXFDO0FBQ3JDLElBQUFDLG1CQUF5QztBQUN6QyxJQUFBQyxxQkFBcUI7OztBQ09yQixJQUFBQyxtQkFBZ0U7QUFDaEUsSUFBQUMsb0JBQXFCO0FBU3JCLElBQU0sbUJBQW1CLENBQUMsWUFBWSxhQUFhLFdBQVc7QUFFdkQsU0FBUyxlQUFlLFdBQXNDO0FBQ25FLE1BQUksS0FBQyw2QkFBVyxTQUFTLEVBQUcsUUFBTyxDQUFDO0FBQ3BDLFFBQU0sTUFBeUIsQ0FBQztBQUNoQyxhQUFXLFlBQVEsOEJBQVksU0FBUyxHQUFHO0FBQ3pDLFVBQU0sVUFBTSx3QkFBSyxXQUFXLElBQUk7QUFDaEMsUUFBSSxLQUFDLDJCQUFTLEdBQUcsRUFBRSxZQUFZLEVBQUc7QUFDbEMsVUFBTSxtQkFBZSx3QkFBSyxLQUFLLGVBQWU7QUFDOUMsUUFBSSxLQUFDLDZCQUFXLFlBQVksRUFBRztBQUMvQixRQUFJO0FBQ0osUUFBSTtBQUNGLGlCQUFXLEtBQUssVUFBTSwrQkFBYSxjQUFjLE1BQU0sQ0FBQztBQUFBLElBQzFELFFBQVE7QUFDTjtBQUFBLElBQ0Y7QUFDQSxRQUFJLENBQUMsZ0JBQWdCLFFBQVEsRUFBRztBQUNoQyxVQUFNLFFBQVEsYUFBYSxLQUFLLFFBQVE7QUFDeEMsUUFBSSxDQUFDLE1BQU87QUFDWixRQUFJLEtBQUssRUFBRSxLQUFLLE9BQU8sU0FBUyxDQUFDO0FBQUEsRUFDbkM7QUFDQSxTQUFPO0FBQ1Q7QUFFQSxTQUFTLGdCQUFnQixHQUEyQjtBQUNsRCxNQUFJLENBQUMsRUFBRSxNQUFNLENBQUMsRUFBRSxRQUFRLENBQUMsRUFBRSxXQUFXLENBQUMsRUFBRSxXQUFZLFFBQU87QUFDNUQsTUFBSSxDQUFDLHFDQUFxQyxLQUFLLEVBQUUsVUFBVSxFQUFHLFFBQU87QUFDckUsTUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLFlBQVksUUFBUSxNQUFNLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRyxRQUFPO0FBQ3ZFLFNBQU87QUFDVDtBQUVBLFNBQVMsYUFBYSxLQUFhLEdBQWlDO0FBQ2xFLE1BQUksRUFBRSxNQUFNO0FBQ1YsVUFBTSxRQUFJLHdCQUFLLEtBQUssRUFBRSxJQUFJO0FBQzFCLGVBQU8sNkJBQVcsQ0FBQyxJQUFJLElBQUk7QUFBQSxFQUM3QjtBQUNBLGFBQVcsS0FBSyxrQkFBa0I7QUFDaEMsVUFBTSxRQUFJLHdCQUFLLEtBQUssQ0FBQztBQUNyQixZQUFJLDZCQUFXLENBQUMsRUFBRyxRQUFPO0FBQUEsRUFDNUI7QUFDQSxTQUFPO0FBQ1Q7OztBQ3JEQSxJQUFBQyxtQkFNTztBQUNQLElBQUFDLHFCQUFxQjtBQVVyQixJQUFNLGlCQUFpQjtBQUVoQixTQUFTLGtCQUFrQixTQUFpQixJQUF5QjtBQUMxRSxRQUFNLFVBQU0seUJBQUssU0FBUyxTQUFTO0FBQ25DLGtDQUFVLEtBQUssRUFBRSxXQUFXLEtBQUssQ0FBQztBQUNsQyxRQUFNLFdBQU8seUJBQUssS0FBSyxHQUFHLFNBQVMsRUFBRSxDQUFDLE9BQU87QUFFN0MsTUFBSSxPQUFnQyxDQUFDO0FBQ3JDLFVBQUksNkJBQVcsSUFBSSxHQUFHO0FBQ3BCLFFBQUk7QUFDRixhQUFPLEtBQUssVUFBTSwrQkFBYSxNQUFNLE1BQU0sQ0FBQztBQUFBLElBQzlDLFFBQVE7QUFHTixVQUFJO0FBQ0YseUNBQVcsTUFBTSxHQUFHLElBQUksWUFBWSxLQUFLLElBQUksQ0FBQyxFQUFFO0FBQUEsTUFDbEQsUUFBUTtBQUFBLE1BQUM7QUFDVCxhQUFPLENBQUM7QUFBQSxJQUNWO0FBQUEsRUFDRjtBQUVBLE1BQUksUUFBUTtBQUNaLE1BQUksUUFBK0I7QUFFbkMsUUFBTSxnQkFBZ0IsTUFBTTtBQUMxQixZQUFRO0FBQ1IsUUFBSSxNQUFPO0FBQ1gsWUFBUSxXQUFXLE1BQU07QUFDdkIsY0FBUTtBQUNSLFVBQUksTUFBTyxPQUFNO0FBQUEsSUFDbkIsR0FBRyxjQUFjO0FBQUEsRUFDbkI7QUFFQSxRQUFNLFFBQVEsTUFBWTtBQUN4QixRQUFJLENBQUMsTUFBTztBQUNaLFVBQU0sTUFBTSxHQUFHLElBQUk7QUFDbkIsUUFBSTtBQUNGLDBDQUFjLEtBQUssS0FBSyxVQUFVLE1BQU0sTUFBTSxDQUFDLEdBQUcsTUFBTTtBQUN4RCx1Q0FBVyxLQUFLLElBQUk7QUFDcEIsY0FBUTtBQUFBLElBQ1YsU0FBUyxHQUFHO0FBRVYsY0FBUSxNQUFNLDBDQUEwQyxJQUFJLENBQUM7QUFBQSxJQUMvRDtBQUFBLEVBQ0Y7QUFFQSxTQUFPO0FBQUEsSUFDTCxLQUFLLENBQUksR0FBVyxNQUNsQixPQUFPLFVBQVUsZUFBZSxLQUFLLE1BQU0sQ0FBQyxJQUFLLEtBQUssQ0FBQyxJQUFXO0FBQUEsSUFDcEUsSUFBSSxHQUFHLEdBQUc7QUFDUixXQUFLLENBQUMsSUFBSTtBQUNWLG9CQUFjO0FBQUEsSUFDaEI7QUFBQSxJQUNBLE9BQU8sR0FBRztBQUNSLFVBQUksS0FBSyxNQUFNO0FBQ2IsZUFBTyxLQUFLLENBQUM7QUFDYixzQkFBYztBQUFBLE1BQ2hCO0FBQUEsSUFDRjtBQUFBLElBQ0EsS0FBSyxPQUFPLEVBQUUsR0FBRyxLQUFLO0FBQUEsSUFDdEI7QUFBQSxFQUNGO0FBQ0Y7QUFFQSxTQUFTLFNBQVMsSUFBb0I7QUFFcEMsU0FBTyxHQUFHLFFBQVEscUJBQXFCLEdBQUc7QUFDNUM7OztBQzNGQSxJQUFBQyxtQkFBbUU7QUFDbkUsSUFBQUMscUJBQTZDO0FBR3RDLElBQU0sb0JBQW9CO0FBQzFCLElBQU0sa0JBQWtCO0FBb0J4QixTQUFTLHNCQUFzQjtBQUFBLEVBQ3BDO0FBQUEsRUFDQTtBQUNGLEdBR3lCO0FBQ3ZCLFFBQU0sY0FBVSw2QkFBVyxVQUFVLFFBQUksK0JBQWEsWUFBWSxNQUFNLElBQUk7QUFDNUUsUUFBTSxRQUFRLHFCQUFxQixRQUFRLE9BQU87QUFDbEQsUUFBTSxPQUFPLHFCQUFxQixTQUFTLE1BQU0sS0FBSztBQUV0RCxNQUFJLFNBQVMsU0FBUztBQUNwQix3Q0FBVSw0QkFBUSxVQUFVLEdBQUcsRUFBRSxXQUFXLEtBQUssQ0FBQztBQUNsRCx3Q0FBYyxZQUFZLE1BQU0sTUFBTTtBQUFBLEVBQ3hDO0FBRUEsU0FBTyxFQUFFLEdBQUcsT0FBTyxTQUFTLFNBQVMsUUFBUTtBQUMvQztBQUVPLFNBQVMscUJBQ2QsUUFDQSxlQUFlLElBQ087QUFDdEIsUUFBTSxhQUFhLHFCQUFxQixZQUFZO0FBQ3BELFFBQU0sY0FBYyxtQkFBbUIsVUFBVTtBQUNqRCxRQUFNLFlBQVksSUFBSSxJQUFJLFdBQVc7QUFDckMsUUFBTSxjQUF3QixDQUFDO0FBQy9CLFFBQU0scUJBQStCLENBQUM7QUFDdEMsUUFBTSxVQUFvQixDQUFDO0FBRTNCLGFBQVcsU0FBUyxRQUFRO0FBQzFCLFVBQU0sTUFBTSxtQkFBbUIsTUFBTSxTQUFTLEdBQUc7QUFDakQsUUFBSSxDQUFDLElBQUs7QUFFVixVQUFNLFdBQVcseUJBQXlCLE1BQU0sU0FBUyxFQUFFO0FBQzNELFFBQUksWUFBWSxJQUFJLFFBQVEsR0FBRztBQUM3Qix5QkFBbUIsS0FBSyxRQUFRO0FBQ2hDO0FBQUEsSUFDRjtBQUVBLFVBQU0sYUFBYSxrQkFBa0IsVUFBVSxTQUFTO0FBQ3hELGdCQUFZLEtBQUssVUFBVTtBQUMzQixZQUFRLEtBQUssZ0JBQWdCLFlBQVksTUFBTSxLQUFLLEdBQUcsQ0FBQztBQUFBLEVBQzFEO0FBRUEsTUFBSSxRQUFRLFdBQVcsR0FBRztBQUN4QixXQUFPLEVBQUUsT0FBTyxJQUFJLGFBQWEsbUJBQW1CO0FBQUEsRUFDdEQ7QUFFQSxTQUFPO0FBQUEsSUFDTCxPQUFPLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxlQUFlLEVBQUUsS0FBSyxJQUFJO0FBQUEsSUFDakU7QUFBQSxJQUNBO0FBQUEsRUFDRjtBQUNGO0FBRU8sU0FBUyxxQkFBcUIsYUFBcUIsY0FBOEI7QUFDdEYsTUFBSSxDQUFDLGdCQUFnQixDQUFDLFlBQVksU0FBUyxpQkFBaUIsRUFBRyxRQUFPO0FBQ3RFLFFBQU0sV0FBVyxxQkFBcUIsV0FBVyxFQUFFLFFBQVE7QUFDM0QsTUFBSSxDQUFDLGFBQWMsUUFBTyxXQUFXLEdBQUcsUUFBUTtBQUFBLElBQU87QUFDdkQsU0FBTyxHQUFHLFdBQVcsR0FBRyxRQUFRO0FBQUE7QUFBQSxJQUFTLEVBQUUsR0FBRyxZQUFZO0FBQUE7QUFDNUQ7QUFFTyxTQUFTLHFCQUFxQixNQUFzQjtBQUN6RCxRQUFNLFVBQVUsSUFBSTtBQUFBLElBQ2xCLE9BQU8sYUFBYSxpQkFBaUIsQ0FBQyxhQUFhLGFBQWEsZUFBZSxDQUFDO0FBQUEsSUFDaEY7QUFBQSxFQUNGO0FBQ0EsU0FBTyxLQUFLLFFBQVEsU0FBUyxJQUFJLEVBQUUsUUFBUSxXQUFXLE1BQU07QUFDOUQ7QUFFTyxTQUFTLHlCQUF5QixJQUFvQjtBQUMzRCxRQUFNLG1CQUFtQixHQUFHLFFBQVEsa0JBQWtCLEVBQUU7QUFDeEQsUUFBTSxPQUFPLGlCQUNWLFFBQVEsb0JBQW9CLEdBQUcsRUFDL0IsUUFBUSxZQUFZLEVBQUUsRUFDdEIsWUFBWTtBQUNmLFNBQU8sUUFBUTtBQUNqQjtBQUVBLFNBQVMsbUJBQW1CLE1BQTJCO0FBQ3JELFFBQU0sUUFBUSxvQkFBSSxJQUFZO0FBQzlCLFFBQU0sZUFBZTtBQUNyQixNQUFJO0FBQ0osVUFBUSxRQUFRLGFBQWEsS0FBSyxJQUFJLE9BQU8sTUFBTTtBQUNqRCxVQUFNLElBQUksZUFBZSxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7QUFBQSxFQUMxQztBQUNBLFNBQU87QUFDVDtBQUVBLFNBQVMsa0JBQWtCLFVBQWtCLFdBQWdDO0FBQzNFLE1BQUksQ0FBQyxVQUFVLElBQUksUUFBUSxHQUFHO0FBQzVCLGNBQVUsSUFBSSxRQUFRO0FBQ3RCLFdBQU87QUFBQSxFQUNUO0FBQ0EsV0FBUyxJQUFJLEtBQUssS0FBSyxHQUFHO0FBQ3hCLFVBQU0sWUFBWSxHQUFHLFFBQVEsSUFBSSxDQUFDO0FBQ2xDLFFBQUksQ0FBQyxVQUFVLElBQUksU0FBUyxHQUFHO0FBQzdCLGdCQUFVLElBQUksU0FBUztBQUN2QixhQUFPO0FBQUEsSUFDVDtBQUFBLEVBQ0Y7QUFDRjtBQUVBLFNBQVMsbUJBQW1CLE9BQTBEO0FBQ3BGLE1BQUksQ0FBQyxTQUFTLE9BQU8sTUFBTSxZQUFZLFlBQVksTUFBTSxRQUFRLFdBQVcsRUFBRyxRQUFPO0FBQ3RGLE1BQUksTUFBTSxTQUFTLFVBQWEsQ0FBQyxNQUFNLFFBQVEsTUFBTSxJQUFJLEVBQUcsUUFBTztBQUNuRSxNQUFJLE1BQU0sTUFBTSxLQUFLLENBQUMsUUFBUSxPQUFPLFFBQVEsUUFBUSxFQUFHLFFBQU87QUFDL0QsTUFBSSxNQUFNLFFBQVEsUUFBVztBQUMzQixRQUFJLENBQUMsTUFBTSxPQUFPLE9BQU8sTUFBTSxRQUFRLFlBQVksTUFBTSxRQUFRLE1BQU0sR0FBRyxFQUFHLFFBQU87QUFDcEYsUUFBSSxPQUFPLE9BQU8sTUFBTSxHQUFHLEVBQUUsS0FBSyxDQUFDLGFBQWEsT0FBTyxhQUFhLFFBQVEsRUFBRyxRQUFPO0FBQUEsRUFDeEY7QUFDQSxTQUFPO0FBQ1Q7QUFFQSxTQUFTLGdCQUFnQixZQUFvQixVQUFrQixLQUE2QjtBQUMxRixRQUFNLFFBQVE7QUFBQSxJQUNaLGdCQUFnQixjQUFjLFVBQVUsQ0FBQztBQUFBLElBQ3pDLGFBQWEsaUJBQWlCLGVBQWUsVUFBVSxJQUFJLE9BQU8sQ0FBQyxDQUFDO0FBQUEsRUFDdEU7QUFFQSxNQUFJLElBQUksUUFBUSxJQUFJLEtBQUssU0FBUyxHQUFHO0FBQ25DLFVBQU0sS0FBSyxVQUFVLHNCQUFzQixJQUFJLEtBQUssSUFBSSxDQUFDLFFBQVEsV0FBVyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUFBLEVBQ2hHO0FBRUEsTUFBSSxJQUFJLE9BQU8sT0FBTyxLQUFLLElBQUksR0FBRyxFQUFFLFNBQVMsR0FBRztBQUM5QyxVQUFNLEtBQUssU0FBUyxzQkFBc0IsSUFBSSxHQUFHLENBQUMsRUFBRTtBQUFBLEVBQ3REO0FBRUEsU0FBTyxNQUFNLEtBQUssSUFBSTtBQUN4QjtBQUVBLFNBQVMsZUFBZSxVQUFrQixTQUF5QjtBQUNqRSxVQUFJLCtCQUFXLE9BQU8sS0FBSyxDQUFDLHNCQUFzQixPQUFPLEVBQUcsUUFBTztBQUNuRSxhQUFPLDRCQUFRLFVBQVUsT0FBTztBQUNsQztBQUVBLFNBQVMsV0FBVyxVQUFrQixLQUFxQjtBQUN6RCxVQUFJLCtCQUFXLEdBQUcsS0FBSyxJQUFJLFdBQVcsR0FBRyxFQUFHLFFBQU87QUFDbkQsUUFBTSxnQkFBWSw0QkFBUSxVQUFVLEdBQUc7QUFDdkMsYUFBTyw2QkFBVyxTQUFTLElBQUksWUFBWTtBQUM3QztBQUVBLFNBQVMsc0JBQXNCLE9BQXdCO0FBQ3JELFNBQU8sTUFBTSxXQUFXLElBQUksS0FBSyxNQUFNLFdBQVcsS0FBSyxLQUFLLE1BQU0sU0FBUyxHQUFHO0FBQ2hGO0FBRUEsU0FBUyxpQkFBaUIsT0FBdUI7QUFDL0MsU0FBTyxLQUFLLFVBQVUsS0FBSztBQUM3QjtBQUVBLFNBQVMsc0JBQXNCLFFBQTBCO0FBQ3ZELFNBQU8sSUFBSSxPQUFPLElBQUksZ0JBQWdCLEVBQUUsS0FBSyxJQUFJLENBQUM7QUFDcEQ7QUFFQSxTQUFTLHNCQUFzQixRQUF3QztBQUNyRSxTQUFPLEtBQUssT0FBTyxRQUFRLE1BQU0sRUFDOUIsSUFBSSxDQUFDLENBQUMsS0FBSyxLQUFLLE1BQU0sR0FBRyxjQUFjLEdBQUcsQ0FBQyxNQUFNLGlCQUFpQixLQUFLLENBQUMsRUFBRSxFQUMxRSxLQUFLLElBQUksQ0FBQztBQUNmO0FBRUEsU0FBUyxjQUFjLEtBQXFCO0FBQzFDLFNBQU8sbUJBQW1CLEtBQUssR0FBRyxJQUFJLE1BQU0saUJBQWlCLEdBQUc7QUFDbEU7QUFFQSxTQUFTLGVBQWUsS0FBcUI7QUFDM0MsTUFBSSxDQUFDLElBQUksV0FBVyxHQUFHLEtBQUssQ0FBQyxJQUFJLFNBQVMsR0FBRyxFQUFHLFFBQU87QUFDdkQsTUFBSTtBQUNGLFdBQU8sS0FBSyxNQUFNLEdBQUc7QUFBQSxFQUN2QixRQUFRO0FBQ04sV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQUVBLFNBQVMsYUFBYSxPQUF1QjtBQUMzQyxTQUFPLE1BQU0sUUFBUSx1QkFBdUIsTUFBTTtBQUNwRDs7O0FDek1BLElBQUFDLG1CQUE4QjtBQUM5QixJQUFBQyw2QkFBMkQ7QUFDM0QsSUFBQUMsc0JBQTJCO0FBQzNCLElBQUFDLG1CQUEyQjtBQUMzQiwyQkFBZ0M7QUE2RHpCLElBQU0sZUFBTixNQUFtQjtBQUFBLEVBT3hCLFlBQ21CQyxNQUNBLFVBQStCLENBQUMsR0FDakQ7QUFGaUIsZUFBQUE7QUFDQTtBQUFBLEVBQ2hCO0FBQUEsRUFGZ0I7QUFBQSxFQUNBO0FBQUEsRUFSWCxVQUFVLG9CQUFJLElBQWdDO0FBQUEsRUFDOUMsWUFBWSxvQkFBSSxJQUE0QjtBQUFBLEVBQzVDLFVBQVUsb0JBQUksSUFBaUM7QUFBQSxFQUMvQyxvQkFBb0M7QUFBQSxFQUNwQyxzQkFBb0M7QUFBQSxFQU81QyxrQkFBc0Q7QUFDcEQsVUFBTSxPQUFPLEtBQUssZUFBZSxLQUFLO0FBQ3RDLFVBQU0sbUJBQW1CLE9BQU8sS0FBSywyQkFBMkIsSUFBSSxJQUFJLENBQUM7QUFDekUsVUFBTSxhQUFhLFNBQVM7QUFDNUIsV0FBTztBQUFBLE1BQ0wsa0JBQWtCO0FBQUEsTUFDbEIsY0FBYyxRQUFRLGFBQWE7QUFBQSxNQUNuQyxpQkFBaUIsUUFBUSxpQkFBaUIsZUFBZTtBQUFBLE1BQ3pELG9CQUFvQixRQUFRLGlCQUFpQixrQkFBa0I7QUFBQSxNQUMvRCxrQkFBa0IsUUFBUSxpQkFBaUIsZ0JBQWdCO0FBQUEsTUFDM0QsWUFBWSxRQUFRLGlCQUFpQixVQUFVO0FBQUEsTUFDL0M7QUFBQSxNQUNBLFNBQVM7QUFBQSxJQUNYO0FBQUEsRUFDRjtBQUFBLEVBRUEsV0FBVyxLQUF5QixTQUFtRDtBQUNyRixVQUFNLEtBQUtDLGdCQUFlLFFBQVEsSUFBSSxrQkFBa0I7QUFDeEQsVUFBTSxXQUFXLGlCQUFpQixLQUFLLFFBQVEsSUFBSTtBQUNuRCxVQUFNLE9BQU8sUUFBUSxRQUFRLGdCQUFnQixRQUFRO0FBRXJELFFBQUksU0FBUyxjQUFjO0FBQ3pCLFlBQU0sSUFBSTtBQUFBLFFBQ1IsR0FBRyxJQUFJO0FBQUEsTUFDVDtBQUFBLElBQ0Y7QUFFQSxRQUFJLENBQUMsU0FBUyxTQUFTLE9BQU8sR0FBRztBQUMvQixZQUFNLElBQUksTUFBTSxpREFBaUQ7QUFBQSxJQUNuRTtBQUVBLFVBQU0sU0FBUyxRQUFRLFFBQVE7QUFDL0IsVUFBTUMsV0FBVSxpQkFBaUIsUUFBUSxRQUFRLFVBQVU7QUFDM0QsVUFBTSxNQUFNLFVBQVUsSUFBSSxJQUFJLEVBQUU7QUFDaEMsU0FBSyxRQUFRLElBQUksS0FBSyxFQUFFLEtBQUssU0FBUyxJQUFJLElBQUksSUFBSSxNQUFNLE1BQU0sVUFBVSxTQUFBQSxTQUFRLENBQUM7QUFDakYsU0FBSyxJQUFJLFFBQVEsd0JBQXdCLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sTUFBTSxTQUFTLENBQUM7QUFDakYsV0FBTyxLQUFLLFVBQVUsSUFBSSxJQUFJLElBQUksSUFBSTtBQUFBLEVBQ3hDO0FBQUEsRUFFQSxNQUFNLFlBQVksS0FBeUIsU0FBNEQ7QUFDckcsVUFBTSxVQUFVLE1BQU0sS0FBSyxxQkFBcUIsS0FBSyxTQUFTLFFBQVEsVUFBVSxRQUFRLFdBQVcsZUFBZTtBQUFBLE1BQ2hILGdCQUFnQixRQUFRO0FBQUEsTUFDeEIsUUFBUSxRQUFRO0FBQUEsTUFDaEIsYUFBYSxRQUFRLGdCQUFnQjtBQUFBLE1BQ3JDLGtCQUFrQixRQUFRLHFCQUFxQjtBQUFBLElBQ2pELENBQUM7QUFDRCxXQUFPLEtBQUssU0FBUyxPQUFPO0FBQUEsRUFDOUI7QUFBQSxFQUVBLE1BQU0sV0FBVyxLQUF5QixTQUEwRDtBQUNsRyxVQUFNLFVBQVUsTUFBTSxLQUFLLHFCQUFxQixLQUFLLFFBQVEsUUFBUSxVQUFVLFFBQVEsV0FBVyxjQUFjO0FBQUEsTUFDOUcsZ0JBQWdCLFFBQVE7QUFBQSxNQUN4QixRQUFRLFFBQVE7QUFBQSxNQUNoQixRQUFRLFFBQVE7QUFBQSxJQUNsQixDQUFDO0FBQ0QsV0FBTyxLQUFLLFFBQVEsT0FBTztBQUFBLEVBQzdCO0FBQUEsRUFFQSxhQUFhLEtBQXlCLFNBQXFEO0FBQ3pGLFVBQU0sS0FBS0QsZ0JBQWUsUUFBUSxJQUFJLGtCQUFrQjtBQUN4RCxTQUFLLFFBQVEsYUFBYSxhQUFhLFNBQVM7QUFDOUMsWUFBTSxJQUFJLE1BQU0sOERBQThEO0FBQUEsSUFDaEY7QUFDQSxTQUFLLFFBQVEsV0FBVyxhQUFhLFNBQVM7QUFDNUMsWUFBTSxJQUFJLE1BQU0sbUVBQW1FO0FBQUEsSUFDckY7QUFDQSxVQUFNLGFBQWEsaUJBQWlCLEtBQUssUUFBUSxVQUFVO0FBQzNELFVBQU0sT0FBTyxRQUFRLFFBQVEsQ0FBQztBQUM5QixVQUFNLE1BQU0sRUFBRSxHQUFHLFFBQVEsS0FBSyxHQUFJLFFBQVEsT0FBTyxDQUFDLEVBQUc7QUFDckQsVUFBTSxZQUFRLGtDQUFNLFlBQVksTUFBTTtBQUFBLE1BQ3BDLEtBQUssSUFBSTtBQUFBLE1BQ1Q7QUFBQSxNQUNBLE9BQU8sQ0FBQyxRQUFRLFFBQVEsTUFBTTtBQUFBLElBQ2hDLENBQUM7QUFDRCxVQUFNLE1BQU0sVUFBVSxJQUFJLElBQUksRUFBRTtBQUNoQyxVQUFNLFNBQThCO0FBQUEsTUFDbEM7QUFBQSxNQUNBLFNBQVMsSUFBSTtBQUFBLE1BQ2I7QUFBQSxNQUNBO0FBQUEsTUFDQSxTQUFTLG9CQUFJLElBQUk7QUFBQSxJQUNuQjtBQUNBLFNBQUssUUFBUSxJQUFJLEtBQUssTUFBTTtBQUU1QixVQUFNLGFBQVMsc0NBQWdCLEVBQUUsT0FBTyxNQUFNLE9BQU8sQ0FBQztBQUN0RCxXQUFPLEdBQUcsUUFBUSxDQUFDLFNBQVMsS0FBSyxpQkFBaUIsUUFBUSxJQUFJLENBQUM7QUFDL0QsVUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLFVBQVU7QUFDakMsV0FBSyxJQUFJLFFBQVEsaUJBQWlCLElBQUksRUFBRSxJQUFJLEVBQUUsV0FBVyxPQUFPLEtBQUssQ0FBQztBQUFBLElBQ3hFLENBQUM7QUFDRCxVQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sV0FBVztBQUNqQyxXQUFLLElBQUksUUFBUSxpQkFBaUIsSUFBSSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsTUFBTSxPQUFPLENBQUM7QUFDekUsV0FBSyxRQUFRLE9BQU8sR0FBRztBQUN2QixpQkFBVyxXQUFXLE9BQU8sUUFBUSxPQUFPLEdBQUc7QUFDN0MscUJBQWEsUUFBUSxLQUFLO0FBQzFCLGdCQUFRLE9BQU8sSUFBSSxNQUFNLHNDQUFzQyxDQUFDO0FBQUEsTUFDbEU7QUFDQSxhQUFPLFFBQVEsTUFBTTtBQUFBLElBQ3ZCLENBQUM7QUFDRCxVQUFNLEdBQUcsU0FBUyxDQUFDLFVBQVU7QUFDM0IsV0FBSyxJQUFJLFNBQVMsaUJBQWlCLElBQUksRUFBRSxJQUFJLEVBQUUsV0FBVyxLQUFLO0FBQy9ELFdBQUssUUFBUSxPQUFPLEdBQUc7QUFDdkIsaUJBQVcsV0FBVyxPQUFPLFFBQVEsT0FBTyxHQUFHO0FBQzdDLHFCQUFhLFFBQVEsS0FBSztBQUMxQixnQkFBUSxPQUFPLEtBQUs7QUFBQSxNQUN0QjtBQUNBLGFBQU8sUUFBUSxNQUFNO0FBQUEsSUFDdkIsQ0FBQztBQUVELFNBQUssSUFBSSxRQUFRLDBCQUEwQixJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLE1BQU0sS0FBSyxXQUFXLENBQUM7QUFDekYsV0FBTyxLQUFLLFVBQVUsSUFBSSxJQUFJLElBQUksTUFBTSxPQUFPLEVBQUU7QUFBQSxFQUNuRDtBQUFBLEVBRUEsYUFBYSxTQUF1QjtBQUNsQyxlQUFXLENBQUMsS0FBSyxRQUFRLEtBQUssQ0FBQyxHQUFHLEtBQUssU0FBUyxHQUFHO0FBQ2pELFVBQUksU0FBUyxZQUFZLFFBQVM7QUFDbEMsV0FBSyxLQUFLLGdCQUFnQixRQUFRLEVBQUUsUUFBUSxNQUFNLEtBQUssVUFBVSxPQUFPLEdBQUcsQ0FBQztBQUFBLElBQzlFO0FBQ0EsZUFBVyxDQUFDLEtBQUssTUFBTSxLQUFLLENBQUMsR0FBRyxLQUFLLE9BQU8sR0FBRztBQUM3QyxVQUFJLE9BQU8sWUFBWSxRQUFTO0FBQ2hDLFdBQUssV0FBVyxNQUFNO0FBQ3RCLFdBQUssUUFBUSxPQUFPLEdBQUc7QUFBQSxJQUN6QjtBQUNBLGVBQVcsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLEdBQUcsS0FBSyxPQUFPLEdBQUc7QUFDMUMsVUFBSSxJQUFJLFlBQVksUUFBUztBQUM3QixXQUFLLGFBQWEsSUFBSSxTQUFTLFdBQVcsQ0FBQyxDQUFDO0FBQzVDLFdBQUssUUFBUSxPQUFPLEdBQUc7QUFBQSxJQUN6QjtBQUFBLEVBQ0Y7QUFBQSxFQUVBLGFBQW1CO0FBQ2pCLFVBQU0sV0FBVyxvQkFBSSxJQUFJO0FBQUEsTUFDdkIsR0FBRyxDQUFDLEdBQUcsS0FBSyxRQUFRLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLEtBQUssT0FBTztBQUFBLE1BQ3hELEdBQUcsQ0FBQyxHQUFHLEtBQUssVUFBVSxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxLQUFLLE9BQU87QUFBQSxNQUMxRCxHQUFHLENBQUMsR0FBRyxLQUFLLFFBQVEsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsS0FBSyxPQUFPO0FBQUEsSUFDMUQsQ0FBQztBQUNELGVBQVcsTUFBTSxTQUFVLE1BQUssYUFBYSxFQUFFO0FBQUEsRUFDakQ7QUFBQSxFQUVBLE1BQU0sYUFDSixTQUNBLE1BQ0EsSUFDQSxRQUNBLEtBQ2U7QUFDZixRQUFJLFNBQVMsU0FBUztBQUNwQixVQUFJLFdBQVcsWUFBYSxRQUFPLEtBQUssZUFBZSxTQUFTLElBQUksYUFBYSxDQUFDLEdBQUcsQ0FBQztBQUN0RixVQUFJLFdBQVcsT0FBUSxRQUFPLEtBQUssZUFBZSxTQUFTLElBQUksUUFBUSxDQUFDLENBQUM7QUFDekUsVUFBSSxXQUFXLE9BQVEsUUFBTyxLQUFLLGVBQWUsU0FBUyxJQUFJLFFBQVEsQ0FBQyxDQUFDO0FBQ3pFLFVBQUksV0FBVyxVQUFXLFFBQU8sS0FBSyxvQkFBb0IsU0FBUyxFQUFFO0FBQUEsSUFDdkU7QUFDQSxRQUFJLFNBQVMsUUFBUTtBQUNuQixVQUFJLFdBQVcsWUFBYSxRQUFPLEtBQUssZUFBZSxTQUFTLElBQUksYUFBYSxDQUFDLEdBQUcsQ0FBQztBQUN0RixVQUFJLFdBQVcsYUFBYyxRQUFPLEtBQUssZUFBZSxTQUFTLElBQUksY0FBYyxDQUFDLEdBQUcsQ0FBQztBQUN4RixVQUFJLFdBQVcsVUFBVyxRQUFPLEtBQUssb0JBQW9CLFNBQVMsRUFBRTtBQUFBLElBQ3ZFO0FBQ0EsVUFBTSxJQUFJLE1BQU0sa0JBQWtCLElBQUksWUFBWSxNQUFNLEVBQUU7QUFBQSxFQUM1RDtBQUFBLEVBRUEsTUFBTSxXQUNKLFNBQ0EsVUFDQSxRQUNBLFNBQ0EsV0FDa0I7QUFDbEIsUUFBSSxXQUFXLE9BQVEsUUFBTyxLQUFLLFdBQVcsU0FBUyxVQUFVLE9BQU87QUFDeEUsUUFBSSxXQUFXLFVBQVcsUUFBTyxLQUFLLGNBQWMsU0FBUyxVQUFVLFNBQVMsU0FBUztBQUN6RixRQUFJLFdBQVcsT0FBUSxRQUFPLEtBQUssZUFBZSxTQUFTLFFBQVE7QUFDbkUsVUFBTSxJQUFJLE1BQU0saUNBQWlDLE1BQU0sRUFBRTtBQUFBLEVBQzNEO0FBQUEsRUFFUSxVQUFVLFNBQWlCLElBQVksT0FBTyxLQUFLLFVBQVUsU0FBUyxFQUFFLEVBQUUsTUFBdUI7QUFDdkcsV0FBTztBQUFBLE1BQ0w7QUFBQSxNQUNBO0FBQUEsTUFDQSxTQUFTLENBQUMsUUFBUSxTQUFTLGNBQ3pCLEtBQUssY0FBYyxTQUFTLElBQUksUUFBUSxTQUFTLFNBQVM7QUFBQSxNQUM1RCxTQUFTLE1BQU0sS0FBSyxjQUFjLFNBQVMsRUFBRTtBQUFBLElBQy9DO0FBQUEsRUFDRjtBQUFBLEVBRVEsU0FBUyxVQUEwQztBQUN6RCxXQUFPO0FBQUEsTUFDTCxJQUFJLFNBQVM7QUFBQSxNQUNiLFVBQVUsU0FBUztBQUFBLE1BQ25CLFdBQVcsQ0FBQyxXQUFXLEtBQUssZUFBZSxTQUFTLFNBQVMsU0FBUyxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUM7QUFBQSxNQUMvRixNQUFNLE1BQU0sS0FBSyxlQUFlLFNBQVMsU0FBUyxTQUFTLElBQUksUUFBUSxDQUFDLENBQUM7QUFBQSxNQUN6RSxNQUFNLE1BQU0sS0FBSyxlQUFlLFNBQVMsU0FBUyxTQUFTLElBQUksUUFBUSxDQUFDLENBQUM7QUFBQSxNQUN6RSxTQUFTLE1BQU0sS0FBSyxvQkFBb0IsU0FBUyxTQUFTLFNBQVMsRUFBRTtBQUFBLElBQ3ZFO0FBQUEsRUFDRjtBQUFBLEVBRVEsUUFBUSxVQUF5QztBQUN2RCxXQUFPO0FBQUEsTUFDTCxJQUFJLFNBQVM7QUFBQSxNQUNiLFdBQVcsQ0FBQyxXQUFXLEtBQUssZUFBZSxTQUFTLFNBQVMsU0FBUyxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUM7QUFBQSxNQUMvRixZQUFZLENBQUMsWUFBWSxLQUFLLGVBQWUsU0FBUyxTQUFTLFNBQVMsSUFBSSxjQUFjLENBQUMsT0FBTyxDQUFDO0FBQUEsTUFDbkcsU0FBUyxNQUFNLEtBQUssb0JBQW9CLFNBQVMsU0FBUyxTQUFTLEVBQUU7QUFBQSxJQUN2RTtBQUFBLEVBQ0Y7QUFBQSxFQUVRLFVBQVUsU0FBaUIsSUFBWSxLQUE4QjtBQUMzRSxXQUFPO0FBQUEsTUFDTDtBQUFBLE1BQ0E7QUFBQSxNQUNBLE1BQU0sQ0FBQyxZQUFZLEtBQUssV0FBVyxTQUFTLElBQUksT0FBTztBQUFBLE1BQ3ZELFNBQVMsQ0FBQyxTQUFTLGNBQWMsS0FBSyxjQUFjLFNBQVMsSUFBSSxTQUFTLFNBQVM7QUFBQSxNQUNuRixNQUFNLE1BQU0sS0FBSyxlQUFlLFNBQVMsRUFBRTtBQUFBLElBQzdDO0FBQUEsRUFDRjtBQUFBLEVBRUEsTUFBTSxjQUNKLFNBQ0EsSUFDQSxRQUNBLFNBQ0EsWUFDa0I7QUFDbEIsVUFBTSxNQUFNLEtBQUssVUFBVSxTQUFTLEVBQUU7QUFDdEMsVUFBTSxTQUFTRSxVQUFTLElBQUksT0FBTztBQUNuQyxVQUFNLEtBQUssUUFBUTtBQUNuQixRQUFJLE9BQU8sT0FBTyxZQUFZO0FBQzVCLGFBQU8sTUFBTSxHQUFHLEtBQUssSUFBSSxTQUFTLFFBQVEsT0FBTztBQUFBLElBQ25EO0FBQ0EsVUFBTSxXQUFXLFNBQVMsTUFBTTtBQUNoQyxRQUFJLE9BQU8sYUFBYSxZQUFZO0FBQ2xDLGFBQU8sTUFBTSxTQUFTLEtBQUssSUFBSSxTQUFTLE9BQU87QUFBQSxJQUNqRDtBQUNBLFVBQU0sSUFBSSxNQUFNLGlCQUFpQixPQUFPLElBQUksRUFBRSx3QkFBd0IsTUFBTSxJQUFJO0FBQUEsRUFDbEY7QUFBQSxFQUVBLE1BQU0sY0FBYyxTQUFpQixJQUEyQjtBQUM5RCxVQUFNLE1BQU0sVUFBVSxTQUFTLEVBQUU7QUFDakMsVUFBTSxNQUFNLEtBQUssUUFBUSxJQUFJLEdBQUc7QUFDaEMsUUFBSSxDQUFDLElBQUs7QUFDVixVQUFNLGFBQWEsSUFBSSxTQUFTLFdBQVcsQ0FBQyxDQUFDO0FBQzdDLFNBQUssUUFBUSxPQUFPLEdBQUc7QUFBQSxFQUN6QjtBQUFBLEVBRUEsTUFBYyxxQkFDWixLQUNBLE1BQ0EsVUFDQSxTQUNBLFNBQ3lCO0FBQ3pCLFVBQU0sU0FBUyxXQUFXLEtBQUssVUFBVSxJQUFJLElBQUksUUFBUSxFQUFFLFVBQVUsS0FBSyxlQUFlLElBQUk7QUFDN0YsVUFBTSxLQUFLQSxVQUFTLE1BQU0sSUFBSSxPQUFPO0FBQ3JDLFFBQUksT0FBTyxPQUFPLFlBQVk7QUFDNUIsWUFBTSxRQUFRLFdBQVcsaUJBQWlCLElBQUksRUFBRSxJQUFJLFFBQVEsS0FBSztBQUNqRSxZQUFNLElBQUksTUFBTSxHQUFHLEtBQUssbUJBQW1CLE9BQU8sSUFBSTtBQUFBLElBQ3hEO0FBRUEsVUFBTSxlQUFlLE9BQU8sUUFBUSxtQkFBbUIsV0FDbkQsK0JBQWMsT0FBTyxRQUFRLGNBQWMsSUFDM0MsK0JBQWMsaUJBQWlCO0FBQ25DLFVBQU0scUJBQXFCLHNCQUFzQixZQUFZO0FBQzdELFVBQU0sUUFBUSxNQUFNLEdBQUcsS0FBSyxRQUFRO0FBQUEsTUFDbEMsR0FBRztBQUFBLE1BQ0gsZ0JBQWdCQyxhQUFZLFlBQVk7QUFBQSxNQUN4QyxxQkFBcUIsaUJBQWlCLFlBQVk7QUFBQSxNQUNsRDtBQUFBLElBQ0YsQ0FBQztBQUNELFVBQU0sS0FBSyxPQUFPRCxVQUFTLEtBQUssR0FBRyxPQUFPLFdBQVcsT0FBT0EsVUFBUyxLQUFLLEdBQUcsRUFBRSxRQUFJLGdDQUFXO0FBQzlGLFVBQU0sV0FBVyxPQUFPQSxVQUFTLEtBQUssR0FBRyxhQUFhLFdBQVcsT0FBT0EsVUFBUyxLQUFLLEdBQUcsUUFBUSxJQUFJO0FBQ3JHLFVBQU0sV0FBMkI7QUFBQSxNQUMvQixLQUFLLFlBQVksSUFBSSxJQUFJLEVBQUU7QUFBQSxNQUMzQixTQUFTLElBQUk7QUFBQSxNQUNiO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBLGdCQUFnQkMsYUFBWSxZQUFZO0FBQUEsTUFDeEM7QUFBQSxNQUNBLGlCQUFpQixDQUFDO0FBQUEsTUFDbEIsV0FBVztBQUFBLElBQ2I7QUFDQSxTQUFLLFVBQVUsSUFBSSxTQUFTLEtBQUssUUFBUTtBQUN6QyxRQUFJLG9CQUFvQixZQUFZLEdBQUc7QUFDckMsV0FBSyxxQkFBcUIsVUFBVSxZQUFZO0FBQ2hELFdBQUssZ0JBQWdCLFVBQVUsY0FBYyxTQUFTO0FBQUEsSUFDeEQ7QUFDQSxTQUFLLElBQUksUUFBUSxrQkFBa0IsSUFBSSxJQUFJLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSTtBQUFBLE1BQ3pELFVBQVUsWUFBWTtBQUFBLE1BQ3RCO0FBQUEsTUFDQTtBQUFBLElBQ0YsQ0FBQztBQUNELFdBQU87QUFBQSxFQUNUO0FBQUEsRUFJUSxlQUFlLFVBQW1DO0FBQ3hELFFBQUksS0FBSyxrQkFBbUIsUUFBTyxLQUFLO0FBQ3hDLFFBQUksS0FBSyx1QkFBdUIsQ0FBQyxTQUFVLFFBQU87QUFDbEQsVUFBTSxpQkFBaUIsS0FBSyxRQUFRO0FBQ3BDLFFBQUksQ0FBQyxrQkFBa0IsS0FBQyw2QkFBVyxjQUFjLEdBQUc7QUFDbEQsWUFBTSxRQUFRLElBQUksTUFBTSxzQ0FBc0M7QUFDOUQsV0FBSyxzQkFBc0I7QUFDM0IsVUFBSSxTQUFVLE9BQU07QUFDcEIsYUFBTztBQUFBLElBQ1Q7QUFDQSxRQUFJO0FBQ0YsV0FBSyxvQkFBb0IsUUFBUSxjQUFjO0FBQy9DLFdBQUssc0JBQXNCO0FBQzNCLFdBQUssSUFBSSxRQUFRLDhCQUE4QixFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3ZFLGFBQU8sS0FBSztBQUFBLElBQ2QsU0FBUyxPQUFPO0FBQ2QsV0FBSyxzQkFBc0IsaUJBQWlCLFFBQVEsUUFBUSxJQUFJLE1BQU0sT0FBTyxLQUFLLENBQUM7QUFDbkYsV0FBSyxJQUFJLFNBQVMsc0NBQXNDLEtBQUssbUJBQW1CO0FBQ2hGLFVBQUksU0FBVSxPQUFNLEtBQUs7QUFDekIsYUFBTztBQUFBLElBQ1Q7QUFBQSxFQUNGO0FBQUEsRUFFUSwyQkFBMkIsTUFBd0M7QUFDekUsVUFBTSxrQkFBa0JELFVBQVMsSUFBSSxHQUFHO0FBQ3hDLFFBQUksT0FBTyxvQkFBb0IsV0FBWSxRQUFPLENBQUM7QUFDbkQsUUFBSTtBQUNGLFlBQU0sZUFBZSxnQkFBZ0IsS0FBSyxJQUFJO0FBQzlDLGFBQU9BLFVBQVMsWUFBWSxLQUFLLENBQUM7QUFBQSxJQUNwQyxTQUFTLE9BQU87QUFDZCxXQUFLLElBQUksUUFBUSwrQ0FBK0MsS0FBSztBQUNyRSxhQUFPLENBQUM7QUFBQSxJQUNWO0FBQUEsRUFDRjtBQUFBLEVBRUEsTUFBYyxlQUNaLFNBQ0EsSUFDQSxRQUNBLE1BQ2U7QUFDZixVQUFNLFdBQVcsS0FBSyxZQUFZLFNBQVMsRUFBRTtBQUM3QyxVQUFNLEtBQUtBLFVBQVMsU0FBUyxLQUFLLElBQUksTUFBTTtBQUM1QyxRQUFJLE9BQU8sT0FBTyxZQUFZO0FBQzVCLFlBQU0sR0FBRyxNQUFNLFNBQVMsT0FBTyxJQUFJO0FBQ25DO0FBQUEsSUFDRjtBQUNBLFFBQUksU0FBUyxhQUFhLE1BQU07QUFDOUIsWUFBTSxNQUFNLCtCQUFjLE9BQU8sU0FBUyxRQUFRO0FBQ2xELFVBQUksT0FBTyxDQUFDLElBQUksWUFBWSxHQUFHO0FBQzdCLFlBQUksV0FBVyxZQUFhLEtBQUksVUFBVSxLQUFLLENBQUMsQ0FBdUI7QUFBQSxpQkFDOUQsV0FBVyxPQUFRLEtBQUksS0FBSztBQUFBLGlCQUM1QixXQUFXLE9BQVEsS0FBSSxLQUFLO0FBQUEsaUJBQzVCLFdBQVcsYUFBYyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksS0FBSyxJQUFJLElBQUksS0FBSztBQUNuRTtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQ0EsVUFBTSxJQUFJLE1BQU0sVUFBVSxTQUFTLElBQUksSUFBSSxPQUFPLElBQUksRUFBRSx1QkFBdUIsTUFBTSxJQUFJO0FBQUEsRUFDM0Y7QUFBQSxFQUVBLE1BQWMsb0JBQW9CLFNBQWlCLElBQTJCO0FBQzVFLFVBQU0sTUFBTSxZQUFZLFNBQVMsRUFBRTtBQUNuQyxVQUFNLFdBQVcsS0FBSyxVQUFVLElBQUksR0FBRztBQUN2QyxRQUFJLENBQUMsU0FBVTtBQUNmLFVBQU0sS0FBSyxnQkFBZ0IsUUFBUTtBQUNuQyxTQUFLLFVBQVUsT0FBTyxHQUFHO0FBQUEsRUFDM0I7QUFBQSxFQUVBLE1BQWMsZ0JBQWdCLFVBQXlDO0FBQ3JFLFFBQUksU0FBUyxVQUFXO0FBQ3hCLGFBQVMsWUFBWTtBQUNyQixlQUFXLFdBQVcsU0FBUyxnQkFBZ0IsT0FBTyxDQUFDLEdBQUc7QUFDeEQsVUFBSTtBQUNGLGdCQUFRO0FBQUEsTUFDVixRQUFRO0FBQUEsTUFBQztBQUFBLElBQ1g7QUFDQSxVQUFNLGFBQWEsU0FBUyxPQUFPLFdBQVcsQ0FBQyxDQUFDO0FBQ2hELFFBQUksU0FBUyxhQUFhLE1BQU07QUFDOUIsWUFBTSxNQUFNLCtCQUFjLE9BQU8sU0FBUyxRQUFRO0FBQ2xELFVBQUksT0FBTyxDQUFDLElBQUksWUFBWSxFQUFHLEtBQUksTUFBTTtBQUFBLElBQzNDO0FBQUEsRUFDRjtBQUFBLEVBRVEscUJBQXFCLFVBQTBCLGNBQTRDO0FBQ2pHLFVBQU0sS0FBSyxDQUFDLE9BQWUsYUFBMkM7QUFDcEUsbUJBQWEsR0FBRyxPQUFnQixRQUFpQjtBQUNqRCxlQUFTLGdCQUFnQixLQUFLLE1BQU0sYUFBYSxJQUFJLE9BQWdCLFFBQWlCLENBQUM7QUFBQSxJQUN6RjtBQUNBLFVBQU0sYUFBYSxNQUFNLEtBQUssZ0JBQWdCLFVBQVUsY0FBYyxRQUFRO0FBQzlFLFVBQU0sWUFBWSxDQUFDLFlBQXFCLEtBQUssa0JBQWtCLFVBQVUsY0FBYyxTQUFTLEVBQUUsUUFBUSxDQUFDO0FBQzNHLFVBQU0saUJBQWlCLENBQUMsWUFDdEIsS0FBSyxrQkFBa0IsVUFBVSxjQUFjLGNBQWMsRUFBRSxRQUFRLENBQUM7QUFDMUUsVUFBTSxvQkFBb0IsTUFBTTtBQUM5QixXQUFLLElBQUksUUFBUSxvQkFBb0IsU0FBUyxJQUFJLElBQUksU0FBUyxPQUFPLElBQUksU0FBUyxFQUFFLGlCQUFpQjtBQUN0RyxXQUFLLEtBQUssb0JBQW9CLFNBQVMsU0FBUyxTQUFTLEVBQUU7QUFBQSxJQUM3RDtBQUVBLE9BQUcsUUFBUSxVQUFVO0FBQ3JCLE9BQUcsVUFBVSxVQUFVO0FBQ3ZCLE9BQUcscUJBQXFCLFVBQVU7QUFDbEMsT0FBRyxxQkFBcUIsVUFBVTtBQUNsQyxPQUFHLFlBQVksVUFBVTtBQUN6QixPQUFHLGNBQWMsVUFBVTtBQUMzQixPQUFHLFlBQVksVUFBVTtBQUN6QixPQUFHLFdBQVcsVUFBVTtBQUN4QixPQUFHLFFBQVEsTUFBTSxlQUFlLElBQUksQ0FBQztBQUNyQyxPQUFHLFFBQVEsTUFBTSxlQUFlLEtBQUssQ0FBQztBQUN0QyxPQUFHLFNBQVMsTUFBTSxVQUFVLElBQUksQ0FBQztBQUNqQyxPQUFHLFFBQVEsTUFBTSxVQUFVLEtBQUssQ0FBQztBQUNqQyxPQUFHLFNBQVMsaUJBQWlCO0FBQzdCLE9BQUcsVUFBVSxpQkFBaUI7QUFBQSxFQUNoQztBQUFBLEVBRVEsZ0JBQ04sVUFDQSxjQUNBLFFBQ007QUFDTixVQUFNLFFBQVEsa0JBQWtCLGNBQWMsTUFBTTtBQUNwRCxRQUFJLENBQUMsTUFBTztBQUNaLFNBQUssS0FBSywwQkFBMEIsVUFBVSxDQUFDLGNBQWMsZUFBZSxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQ25GLEtBQUssQ0FBQyxZQUFZO0FBQ2pCLFVBQUksQ0FBQyxTQUFTO0FBQ1osZUFBTyxLQUFLO0FBQUEsVUFDVjtBQUFBLFVBQ0EsQ0FBQyxtQkFBbUIscUJBQXFCO0FBQUEsVUFDekMsQ0FBQyxNQUFNLFFBQVEsS0FBSztBQUFBLFFBQ3RCO0FBQUEsTUFDRjtBQUNBLGFBQU87QUFBQSxJQUNULENBQUMsRUFDQSxNQUFNLENBQUMsVUFBVSxLQUFLLElBQUksUUFBUSxVQUFVLFNBQVMsSUFBSSx1QkFBdUIsS0FBSyxDQUFDO0FBQUEsRUFDM0Y7QUFBQSxFQUVRLGtCQUNOLFVBQ0EsY0FDQSxRQUNBLE9BQ007QUFDTixVQUFNLFFBQVEsa0JBQWtCLGNBQWMsTUFBTTtBQUNwRCxRQUFJLENBQUMsTUFBTztBQUNaLFVBQU0sVUFBVSxFQUFFLEdBQUcsT0FBTyxHQUFHLE1BQU07QUFDckMsU0FBSyxLQUFLLDBCQUEwQixVQUFVLENBQUMsc0JBQXNCLGVBQWUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUM3RixNQUFNLENBQUMsVUFBVSxLQUFLLElBQUksUUFBUSxVQUFVLFNBQVMsSUFBSSx5QkFBeUIsS0FBSyxDQUFDO0FBQUEsRUFDN0Y7QUFBQSxFQUVBLE1BQWMsMEJBQ1osVUFDQSxTQUNBLE1BQ2tCO0FBQ2xCLFVBQU0sU0FBU0EsVUFBUyxTQUFTLEtBQUs7QUFDdEMsZUFBVyxVQUFVLFNBQVM7QUFDNUIsWUFBTSxLQUFLLFNBQVMsTUFBTTtBQUMxQixVQUFJLE9BQU8sT0FBTyxXQUFZO0FBQzlCLFlBQU0sR0FBRyxNQUFNLFNBQVMsT0FBTyxJQUFJO0FBQ25DLGFBQU87QUFBQSxJQUNUO0FBQ0EsV0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUVBLE1BQWMsV0FBVyxTQUFpQixJQUFZLFNBQWlDO0FBQ3JGLFVBQU0sU0FBUyxLQUFLLFVBQVUsU0FBUyxFQUFFO0FBQ3pDLFdBQU8sTUFBTSxNQUFNLE1BQU0sR0FBRyxLQUFLLFVBQVUsT0FBTyxDQUFDO0FBQUEsQ0FBSTtBQUFBLEVBQ3pEO0FBQUEsRUFFQSxNQUFjLGNBQ1osU0FDQSxJQUNBLFNBQ0EsWUFBWSxLQUNNO0FBQ2xCLFVBQU0sU0FBUyxLQUFLLFVBQVUsU0FBUyxFQUFFO0FBQ3pDLFVBQU0sZ0JBQVksZ0NBQVc7QUFDN0IsVUFBTSxVQUFVLEVBQUUsSUFBSSxXQUFXLFFBQVE7QUFDekMsV0FBTyxNQUFNLElBQUksUUFBUSxDQUFDRSxXQUFTLFdBQVc7QUFDNUMsWUFBTSxRQUFRLFdBQVcsTUFBTTtBQUM3QixlQUFPLFFBQVEsT0FBTyxTQUFTO0FBQy9CLGVBQU8sSUFBSSxNQUFNLG9DQUFvQyxPQUFPLElBQUksRUFBRSxFQUFFLENBQUM7QUFBQSxNQUN2RSxHQUFHLFNBQVM7QUFDWixhQUFPLFFBQVEsSUFBSSxXQUFXLEVBQUUsU0FBQUEsV0FBUyxRQUFRLE1BQU0sQ0FBQztBQUN4RCxhQUFPLE1BQU0sTUFBTSxNQUFNLEdBQUcsS0FBSyxVQUFVLE9BQU8sQ0FBQztBQUFBLENBQUk7QUFBQSxJQUN6RCxDQUFDO0FBQUEsRUFDSDtBQUFBLEVBRUEsTUFBYyxlQUFlLFNBQWlCLElBQTJCO0FBQ3ZFLFVBQU0sTUFBTSxVQUFVLFNBQVMsRUFBRTtBQUNqQyxVQUFNLFNBQVMsS0FBSyxRQUFRLElBQUksR0FBRztBQUNuQyxRQUFJLENBQUMsT0FBUTtBQUNiLFNBQUssV0FBVyxNQUFNO0FBQ3RCLFNBQUssUUFBUSxPQUFPLEdBQUc7QUFBQSxFQUN6QjtBQUFBLEVBRVEsV0FBVyxRQUFtQztBQUNwRCxRQUFJLE9BQU8sTUFBTSxPQUFRO0FBQ3pCLFdBQU8sTUFBTSxLQUFLO0FBQ2xCLFVBQU0sUUFBUSxXQUFXLE1BQU07QUFDN0IsVUFBSSxDQUFDLE9BQU8sTUFBTSxPQUFRLFFBQU8sTUFBTSxLQUFLLFNBQVM7QUFBQSxJQUN2RCxHQUFHLElBQUk7QUFDUCxVQUFNLFFBQVE7QUFBQSxFQUNoQjtBQUFBLEVBRVEsaUJBQWlCLFFBQTZCLE1BQW9CO0FBQ3hFLFFBQUk7QUFDSixRQUFJO0FBQ0YsZ0JBQVUsS0FBSyxNQUFNLElBQUk7QUFBQSxJQUMzQixRQUFRO0FBQ04sV0FBSyxJQUFJLFFBQVEsaUJBQWlCLE9BQU8sT0FBTyxJQUFJLE9BQU8sRUFBRSxJQUFJLElBQUk7QUFDckU7QUFBQSxJQUNGO0FBQ0EsUUFBSSxPQUFPLFFBQVEsT0FBTyxTQUFVO0FBQ3BDLFVBQU0sVUFBVSxPQUFPLFFBQVEsSUFBSSxRQUFRLEVBQUU7QUFDN0MsUUFBSSxDQUFDLFFBQVM7QUFDZCxXQUFPLFFBQVEsT0FBTyxRQUFRLEVBQUU7QUFDaEMsaUJBQWEsUUFBUSxLQUFLO0FBQzFCLFFBQUksUUFBUSxPQUFPO0FBQ2pCLGNBQVEsT0FBTyxJQUFJLE1BQU0sT0FBTyxRQUFRLEtBQUssQ0FBQyxDQUFDO0FBQUEsSUFDakQsT0FBTztBQUNMLGNBQVEsUUFBUSxRQUFRLE1BQU07QUFBQSxJQUNoQztBQUFBLEVBQ0Y7QUFBQSxFQUVRLFVBQVUsU0FBaUIsSUFBZ0M7QUFDakUsVUFBTSxNQUFNLEtBQUssUUFBUSxJQUFJLFVBQVUsU0FBUyxFQUFFLENBQUM7QUFDbkQsUUFBSSxDQUFDLElBQUssT0FBTSxJQUFJLE1BQU0sZ0NBQWdDLE9BQU8sSUFBSSxFQUFFLEVBQUU7QUFDekUsV0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUVRLFlBQVksU0FBaUIsSUFBNEI7QUFDL0QsVUFBTSxXQUFXLEtBQUssVUFBVSxJQUFJLFlBQVksU0FBUyxFQUFFLENBQUM7QUFDNUQsUUFBSSxDQUFDLFNBQVUsT0FBTSxJQUFJLE1BQU0sa0NBQWtDLE9BQU8sSUFBSSxFQUFFLEVBQUU7QUFDaEYsV0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUVRLFVBQVUsU0FBaUIsSUFBaUM7QUFDbEUsVUFBTSxTQUFTLEtBQUssUUFBUSxJQUFJLFVBQVUsU0FBUyxFQUFFLENBQUM7QUFDdEQsUUFBSSxDQUFDLE9BQVEsT0FBTSxJQUFJLE1BQU0saUNBQWlDLE9BQU8sSUFBSSxFQUFFLEVBQUU7QUFDN0UsV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQUVBLFNBQVMsaUJBQWlCLEtBQXlCLE1BQXNCO0FBQ3ZFLFNBQU8sdUJBQXVCLElBQUksS0FBSyxJQUFJO0FBQzdDO0FBRUEsU0FBUyxnQkFBZ0IsTUFBZ0M7QUFDdkQsTUFBSSxLQUFLLFNBQVMsT0FBTyxFQUFHLFFBQU87QUFDbkMsTUFBSSxLQUFLLFNBQVMsUUFBUSxFQUFHLFFBQU87QUFDcEMsTUFBSSxLQUFLLFNBQVMsWUFBWSxFQUFHLFFBQU87QUFDeEMsUUFBTSxJQUFJLE1BQU0sNkRBQTZEO0FBQy9FO0FBRUEsU0FBUyxpQkFBaUIsUUFBaUIsWUFBeUM7QUFDbEYsTUFBSSxDQUFDLFdBQVksUUFBT0YsVUFBUyxNQUFNLEdBQUcsV0FBVztBQUNyRCxRQUFNLFdBQVdBLFVBQVMsTUFBTSxJQUFJLFVBQVU7QUFDOUMsTUFBSSxhQUFhLE9BQVcsT0FBTSxJQUFJLE1BQU0sdUNBQXVDLFVBQVUsRUFBRTtBQUMvRixTQUFPO0FBQ1Q7QUFFQSxTQUFTRixnQkFBZSxPQUFlLE9BQXVCO0FBQzVELE1BQUksT0FBTyxVQUFVLFlBQVksQ0FBQyxvQkFBb0IsS0FBSyxLQUFLLEdBQUc7QUFDakUsVUFBTSxJQUFJLE1BQU0sR0FBRyxLQUFLLG1FQUFtRTtBQUFBLEVBQzdGO0FBQ0EsU0FBTztBQUNUO0FBRUEsU0FBUyxVQUFVLFNBQWlCLFVBQTBCO0FBQzVELFNBQU8sR0FBRyxPQUFPLElBQUksUUFBUTtBQUMvQjtBQUVBLFNBQVMsWUFBWSxTQUFpQixJQUFvQjtBQUN4RCxTQUFPLEdBQUcsT0FBTyxJQUFJLEVBQUU7QUFDekI7QUFFQSxTQUFTLFVBQVUsU0FBaUIsSUFBb0I7QUFDdEQsU0FBTyxHQUFHLE9BQU8sSUFBSSxFQUFFO0FBQ3pCO0FBRUEsU0FBU0UsVUFBUyxPQUFnRDtBQUNoRSxTQUFPLFNBQVMsT0FBTyxVQUFVLFdBQVcsUUFBbUM7QUFDakY7QUFFQSxlQUFlLGFBQWEsUUFBaUIsUUFBZ0IsTUFBZ0M7QUFDM0YsUUFBTSxLQUFLQSxVQUFTLE1BQU0sSUFBSSxNQUFNO0FBQ3BDLE1BQUksT0FBTyxPQUFPLFdBQVksT0FBTSxHQUFHLE1BQU0sUUFBUSxJQUFJO0FBQzNEO0FBRUEsU0FBUyxrQkFBa0IsY0FBc0MsUUFBZ0Q7QUFDL0csTUFBSUcsbUJBQWtCLFlBQVksRUFBRyxRQUFPO0FBQzVDLFFBQU0sU0FBUyxpQkFBcUMsY0FBYyxXQUFXO0FBQzdFLFFBQU0sZ0JBQWdCLGlCQUFxQyxjQUFjLGtCQUFrQjtBQUMzRixTQUFPO0FBQUEsSUFDTDtBQUFBLElBQ0EsVUFBVUYsYUFBWSxZQUFZO0FBQUEsSUFDbEMsZUFBZSxpQkFBaUIsWUFBWTtBQUFBLElBQzVDO0FBQUEsSUFDQTtBQUFBLElBQ0EsU0FBUyxpQkFBMEIsY0FBYyxXQUFXLEtBQUs7QUFBQSxJQUNqRSxTQUFTLGlCQUEwQixjQUFjLFdBQVcsS0FBSztBQUFBLElBQ2pFLFdBQVcsaUJBQTBCLGNBQWMsYUFBYSxLQUFLO0FBQUEsSUFDckUsV0FBVyxpQkFBMEIsY0FBYyxhQUFhLEtBQUs7QUFBQSxJQUNyRSxZQUFZLGlCQUEwQixjQUFjLGNBQWMsS0FBSztBQUFBLEVBQ3pFO0FBQ0Y7QUFFQSxTQUFTLHNCQUFzQixjQUF3RTtBQUNyRyxNQUFJLENBQUMsZ0JBQWdCRSxtQkFBa0IsWUFBWSxFQUFHLFFBQU87QUFDN0QsUUFBTSxLQUFLSCxVQUFTLFlBQVksR0FBRztBQUNuQyxNQUFJLE9BQU8sT0FBTyxXQUFZLFFBQU87QUFDckMsTUFBSTtBQUNGLFVBQU0sU0FBUyxHQUFHLEtBQUssWUFBWTtBQUNuQyxXQUFPLE9BQU8sU0FBUyxNQUFNLElBQUksU0FBUztBQUFBLEVBQzVDLFFBQVE7QUFDTixXQUFPO0FBQUEsRUFDVDtBQUNGO0FBRUEsU0FBUyxvQkFDUCxjQUN3QztBQUN4QyxNQUFJLENBQUMsZ0JBQWdCRyxtQkFBa0IsWUFBWSxFQUFHLFFBQU87QUFDN0QsU0FBTyxPQUFPSCxVQUFTLFlBQVksR0FBRyxPQUFPLGNBQzNDLE9BQU9BLFVBQVMsWUFBWSxHQUFHLFFBQVE7QUFDM0M7QUFFQSxTQUFTRyxtQkFBa0IsY0FBa0U7QUFDM0YsUUFBTSxLQUFLSCxVQUFTLFlBQVksR0FBRztBQUNuQyxNQUFJLE9BQU8sT0FBTyxXQUFZLFFBQU87QUFDckMsTUFBSTtBQUNGLFdBQU8sUUFBUSxHQUFHLEtBQUssWUFBWSxDQUFDO0FBQUEsRUFDdEMsUUFBUTtBQUNOLFdBQU87QUFBQSxFQUNUO0FBQ0Y7QUFFQSxTQUFTQyxhQUFZLGNBQXdFO0FBQzNGLFFBQU0sS0FBS0QsVUFBUyxZQUFZLEdBQUc7QUFDbkMsU0FBTyxPQUFPLE9BQU8sV0FBVyxLQUFLO0FBQ3ZDO0FBRUEsU0FBUyxpQkFBaUIsY0FBd0U7QUFDaEcsUUFBTUksZUFBY0osVUFBU0EsVUFBUyxZQUFZLEdBQUcsV0FBVztBQUNoRSxRQUFNLEtBQUtJLGNBQWE7QUFDeEIsU0FBTyxPQUFPLE9BQU8sV0FBVyxLQUFLO0FBQ3ZDO0FBRUEsU0FBUyxpQkFBb0IsY0FBc0MsUUFBMEI7QUFDM0YsUUFBTSxLQUFLSixVQUFTLFlBQVksSUFBSSxNQUFNO0FBQzFDLE1BQUksT0FBTyxPQUFPLFdBQVksUUFBTztBQUNyQyxNQUFJO0FBQ0YsV0FBTyxHQUFHLEtBQUssWUFBWTtBQUFBLEVBQzdCLFFBQVE7QUFDTixXQUFPO0FBQUEsRUFDVDtBQUNGOzs7QUNwdEJBLElBQUFLLHNCQUE0QjtBQUVyQixJQUFNLGdCQUFnQjtBQUV0QixTQUFTLG9CQUE0QjtBQUMxQyxTQUFPLGVBQVcsaUNBQVksRUFBRSxFQUFFLFNBQVMsS0FBSyxDQUFDO0FBQ25EO0FBRU8sU0FBUyxZQUFZLE9BQWlDO0FBQzNELFNBQU8sT0FBTyxVQUFVLFlBQVksY0FBYyxLQUFLLEtBQUs7QUFDOUQ7QUFFTyxTQUFTLGdCQUFnQixPQUF5QztBQUN2RSxNQUFJLE9BQU8sVUFBVSxZQUFZLE1BQU0sV0FBVyxHQUFHO0FBQ25ELFVBQU0sSUFBSSxNQUFNLG9CQUFvQjtBQUFBLEVBQ3RDO0FBQ0EsTUFDRSxNQUFNLFNBQVMsSUFBSSxLQUNuQixNQUFNLFNBQVMsR0FBRyxLQUNsQixNQUFNLFNBQVMsSUFBSSxLQUNuQixNQUFNLFNBQVMsR0FBRyxLQUNsQixNQUFNLFNBQVMsR0FBRyxLQUNsQixNQUFNLFNBQVMsR0FBRyxLQUNsQixNQUFNLFdBQVcsTUFBTSxLQUN2QixhQUFhLEtBQUssS0FBSyxHQUN2QjtBQUNBLFVBQU0sSUFBSSxNQUFNLG9CQUFvQjtBQUFBLEVBQ3RDO0FBQ0EsTUFBSSxDQUFDLGNBQWMsS0FBSyxLQUFLLEdBQUc7QUFDOUIsVUFBTSxJQUFJLE1BQU0sb0JBQW9CO0FBQUEsRUFDdEM7QUFDRjs7O0FDL0JBLElBQUFDLG1CQUFtRjtBQUNuRixJQUFBQyxxQkFBOEI7QUFVdkIsU0FBUyxhQUFhQyxXQUEwQjtBQUNyRCxhQUFPLHlCQUFLQSxXQUFVLGdCQUFnQjtBQUN4QztBQUVPLFNBQVMsYUFBYUEsV0FBMEI7QUFDckQsYUFBTyx5QkFBSyxhQUFhQSxTQUFRLEdBQUcsVUFBVTtBQUNoRDtBQUVBLFNBQVMsY0FBYyxNQUE0QjtBQUNqRCxNQUFJO0FBQ0YsZUFBTyw0QkFBVSxJQUFJO0FBQUEsRUFDdkIsU0FBUyxPQUFPO0FBQ2QsVUFBTSxPQUFRLE1BQWdDO0FBQzlDLFFBQUksU0FBUyxTQUFVLFFBQU87QUFDOUIsVUFBTTtBQUFBLEVBQ1I7QUFDRjtBQUVBLFNBQVMsZUFBZUEsV0FBMEI7QUFDaEQsTUFBSTtBQUNGLGVBQU8sK0JBQWFBLFNBQVE7QUFBQSxFQUM5QixRQUFRO0FBQ04sZUFBTyw0QkFBUUEsU0FBUTtBQUFBLEVBQ3pCO0FBQ0Y7QUFFQSxTQUFTLHFCQUFxQixRQUFnQixPQUFlLFNBQXVCO0FBQ2xGLE1BQUksQ0FBQyxhQUFhLFFBQVEsS0FBSyxLQUFLLFVBQVUsUUFBUTtBQUNwRCxVQUFNLElBQUksTUFBTSxPQUFPO0FBQUEsRUFDekI7QUFDRjtBQUVBLFNBQVMsd0JBQ1AsY0FDQSxhQUNBLGVBQ0EsT0FDUTtBQUNSLFFBQU1DLFFBQU8sY0FBYyxXQUFXO0FBQ3RDLE1BQUksQ0FBQ0EsT0FBTTtBQUNULFVBQU0sZUFBVyx5QkFBSyxjQUFjLEdBQUcsYUFBYTtBQUNwRCx5QkFBcUIsY0FBYyxVQUFVLEdBQUcsS0FBSyw2QkFBNkI7QUFDbEYsV0FBTztBQUFBLEVBQ1Q7QUFDQSxNQUFJQSxNQUFLLGVBQWUsR0FBRztBQUN6QixVQUFNLElBQUksTUFBTSxHQUFHLEtBQUssd0JBQXdCO0FBQUEsRUFDbEQ7QUFDQSxNQUFJLENBQUNBLE1BQUssWUFBWSxHQUFHO0FBQ3ZCLFVBQU0sSUFBSSxNQUFNLEdBQUcsS0FBSyxzQkFBc0I7QUFBQSxFQUNoRDtBQUNBLFFBQU0sY0FBVSwrQkFBYSxXQUFXO0FBQ3hDLHVCQUFxQixjQUFjLFNBQVMsR0FBRyxLQUFLLDZCQUE2QjtBQUNqRixTQUFPO0FBQ1Q7QUFPTyxTQUFTLHdCQUF3QkQsV0FBcUM7QUFDM0UsUUFBTSxlQUFlLGVBQWVBLFNBQVE7QUFDNUMsUUFBTSxtQkFBbUI7QUFBQSxJQUN2QjtBQUFBLElBQ0EsYUFBYUEsU0FBUTtBQUFBLElBQ3JCLENBQUMsZ0JBQWdCO0FBQUEsSUFDakI7QUFBQSxFQUNGO0FBQ0EsUUFBTSxtQkFBbUI7QUFBQSxJQUN2QjtBQUFBLElBQ0EsYUFBYUEsU0FBUTtBQUFBLElBQ3JCLENBQUMsa0JBQWtCLFVBQVU7QUFBQSxJQUM3QjtBQUFBLEVBQ0Y7QUFDQSx1QkFBcUIsY0FBYyxrQkFBa0IsMENBQTBDO0FBQy9GLFNBQU8sRUFBRSxjQUFjLGtCQUFrQixpQkFBaUI7QUFDNUQ7QUFFQSxTQUFTLGFBQWEsTUFBb0I7QUFDeEMsTUFBSSxjQUFjLElBQUksRUFBRztBQUN6QixrQ0FBVSxNQUFNLEVBQUUsV0FBVyxLQUFLLENBQUM7QUFDckM7QUFNTyxTQUFTLHdCQUF3QkEsV0FBcUM7QUFDM0UsMEJBQXdCQSxTQUFRO0FBQ2hDLGVBQWEsYUFBYUEsU0FBUSxDQUFDO0FBQ25DLDBCQUF3QkEsU0FBUTtBQUNoQyxlQUFhLGFBQWFBLFNBQVEsQ0FBQztBQUNuQyxTQUFPLHdCQUF3QkEsU0FBUTtBQUN6QztBQUVBLFNBQVMsc0JBQXNCLFFBQTJCLElBQW9CO0FBQzVFLGtCQUFnQixFQUFFO0FBQ2xCLFFBQU0sVUFBTSx5QkFBSyxPQUFPLGtCQUFrQixFQUFFO0FBQzVDLHVCQUFxQixPQUFPLGtCQUFrQixLQUFLLDZDQUE2QztBQUNoRyxTQUFPO0FBQ1Q7QUFFQSxTQUFTLDZCQUE2QixRQUEyQixLQUFxQjtBQUNwRixRQUFNQyxRQUFPLGNBQWMsR0FBRztBQUM5QixNQUFJLENBQUNBLE1BQU0sUUFBTztBQUNsQixNQUFJQSxNQUFLLGVBQWUsR0FBRztBQUN6QixVQUFNLElBQUksTUFBTSx5Q0FBeUM7QUFBQSxFQUMzRDtBQUNBLE1BQUksQ0FBQ0EsTUFBSyxZQUFZLEdBQUc7QUFDdkIsVUFBTSxJQUFJLE1BQU0sa0NBQWtDO0FBQUEsRUFDcEQ7QUFDQSxRQUFNLGNBQVUsK0JBQWEsR0FBRztBQUNoQyx1QkFBcUIsT0FBTyxrQkFBa0IsU0FBUyw2Q0FBNkM7QUFDcEcsU0FBTztBQUNUO0FBRU8sU0FBUyxXQUFXRCxXQUFrQixJQUFvQjtBQUMvRCxRQUFNLFNBQVMsd0JBQXdCQSxTQUFRO0FBQy9DLFFBQU0sTUFBTSxzQkFBc0IsUUFBUSxFQUFFO0FBQzVDLFNBQU8sNkJBQTZCLFFBQVEsR0FBRztBQUNqRDtBQUVPLFNBQVMsZ0JBQWdCQSxXQUFrQixJQUFvQjtBQUNwRSxhQUFPLHlCQUFLLFdBQVdBLFdBQVUsRUFBRSxHQUFHLGNBQWM7QUFDdEQ7QUFFTyxTQUFTLGlCQUFpQkEsV0FBa0IsSUFBb0I7QUFDckUsYUFBTyx5QkFBSyxXQUFXQSxXQUFVLEVBQUUsR0FBRyxZQUFZO0FBQ3BEO0FBRU8sU0FBUyxrQkFBa0JBLFdBQWtCLElBQW9CO0FBQ3RFLGFBQU8seUJBQUssV0FBV0EsV0FBVSxFQUFFLEdBQUcsYUFBYTtBQUNyRDtBQUVPLFNBQVMsOEJBQThCQSxXQUE0QjtBQUN4RSxRQUFNLE1BQU07QUFBQSxRQUNWLDRCQUFRQSxTQUFRO0FBQUEsUUFDaEIsNEJBQVFBLFdBQVUsWUFBWTtBQUFBLFFBQzlCLDRCQUFRQSxXQUFVLFFBQVE7QUFBQSxRQUMxQiw0QkFBUUEsV0FBVSxTQUFTO0FBQUEsUUFDM0IsNEJBQVFBLFdBQVUsYUFBYTtBQUFBLFFBQy9CLDRCQUFRQSxXQUFVLFlBQVk7QUFBQSxRQUM5Qiw0QkFBUSxhQUFhQSxTQUFRLENBQUM7QUFBQSxRQUM5Qiw0QkFBUSxhQUFhQSxTQUFRLENBQUM7QUFBQSxFQUNoQztBQUNBLE1BQUksUUFBUSxJQUFJLE1BQU07QUFDcEIsUUFBSSxTQUFLLDRCQUFRLFFBQVEsSUFBSSxJQUFJLENBQUM7QUFDbEMsUUFBSSxTQUFLLDRCQUFRLFFBQVEsSUFBSSxNQUFNLFFBQVEsQ0FBQztBQUFBLEVBQzlDO0FBQ0EsTUFBSSxRQUFRLElBQUksYUFBYTtBQUMzQixRQUFJLFNBQUssNEJBQVEsUUFBUSxJQUFJLFdBQVcsQ0FBQztBQUN6QyxRQUFJLFNBQUssNEJBQVEsUUFBUSxJQUFJLGFBQWEsUUFBUSxDQUFDO0FBQUEsRUFDckQ7QUFDQSxNQUFJLFFBQVEsSUFBSSxRQUFTLEtBQUksU0FBSyw0QkFBUSxRQUFRLElBQUksT0FBTyxDQUFDO0FBQzlELE1BQUk7QUFDRixRQUFJLFNBQUssK0JBQWFBLFNBQVEsQ0FBQztBQUFBLEVBQ2pDLFFBQVE7QUFBQSxFQUVSO0FBQ0EsU0FBTyxDQUFDLEdBQUcsSUFBSSxJQUFJLEdBQUcsQ0FBQztBQUN6QjtBQUVPLFNBQVMsK0JBQStCQSxXQUFrQixRQUF5QjtBQUN4RixRQUFNLGVBQVcsNEJBQVEsTUFBTTtBQUMvQixRQUFNLFlBQVksOEJBQThCQSxTQUFRO0FBQ3hELE1BQUksVUFBVSxTQUFTLFFBQVEsRUFBRyxRQUFPO0FBQ3pDLE1BQUk7QUFDRixXQUFPLFVBQVUsYUFBUywrQkFBYSxNQUFNLENBQUM7QUFBQSxFQUNoRCxRQUFRO0FBQ04sV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQUVPLFNBQVMsYUFBYUEsV0FBa0IsSUFBa0I7QUFDL0Qsa0JBQWdCLEVBQUU7QUFDbEIsUUFBTSxTQUFTLHdCQUF3QkEsU0FBUTtBQUMvQyxRQUFNLE1BQU0sc0JBQXNCLFFBQVEsRUFBRTtBQUM1QyxRQUFNQyxRQUFPLGNBQWMsR0FBRztBQUM5QixNQUFJLENBQUNBLE1BQU07QUFDWCxNQUFJQSxNQUFLLGVBQWUsR0FBRztBQUN6QixVQUFNLElBQUksTUFBTSx5Q0FBeUM7QUFBQSxFQUMzRDtBQUNBLE1BQUksQ0FBQ0EsTUFBSyxZQUFZLEdBQUc7QUFDdkIsVUFBTSxJQUFJLE1BQU0sa0NBQWtDO0FBQUEsRUFDcEQ7QUFDQSxRQUFNLGNBQVUsK0JBQWEsR0FBRztBQUNoQztBQUFBLElBQ0UsT0FBTztBQUFBLElBQ1A7QUFBQSxJQUNBO0FBQUEsRUFDRjtBQUNBLE1BQUksK0JBQStCRCxXQUFVLE9BQU8sR0FBRztBQUNyRCxVQUFNLElBQUksTUFBTSxtQ0FBbUM7QUFBQSxFQUNyRDtBQUNBLCtCQUFPLFNBQVMsRUFBRSxXQUFXLE1BQU0sT0FBTyxLQUFLLENBQUM7QUFDbEQ7OztBQzlNQSxJQUFBRSw2QkFBNEQ7QUFDNUQsSUFBQUMsbUJBQTJCO0FBQzNCLElBQUFDLHFCQUE4QjtBQWlCdkIsSUFBTSx5QkFBeUI7QUFBQSxFQUNwQztBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQ0Y7QUFFTyxTQUFTLG1CQUNkLFFBQ0EsWUFBK0IsUUFBUSxLQUNwQjtBQUNuQixRQUFNLE1BQXlCLENBQUM7QUFDaEMsYUFBVyxPQUFPLHdCQUF3QjtBQUN4QyxVQUFNLFFBQVEsVUFBVSxHQUFHO0FBQzNCLFFBQUksT0FBTyxVQUFVLFNBQVUsS0FBSSxHQUFHLElBQUk7QUFBQSxFQUM1QztBQUNBLE1BQUksYUFBYSxPQUFPO0FBQ3hCLE1BQUksb0JBQW9CLE9BQU87QUFDL0IsU0FBTztBQUNUO0FBRU8sU0FBUyw4QkFBOEIsTUFLNUI7QUFDaEIsUUFBTSxTQUFTLEtBQUssY0FBYztBQUNsQyxRQUFNQyxZQUFXLEtBQUssWUFBWSxRQUFRO0FBQzFDLFFBQU0sYUFBdUIsQ0FBQztBQUM5QixRQUFNLGVBQWUsQ0FBQyxTQUFvQztBQUN4RCxRQUFJLENBQUMsS0FBTTtBQUNYLGVBQVc7QUFBQSxVQUNULHlCQUFLLE1BQU0sT0FBTztBQUFBLFVBQ2xCLHlCQUFLLE1BQU0sT0FBTyxPQUFPO0FBQUEsVUFDekIseUJBQUssTUFBTSxXQUFXO0FBQUEsVUFDdEIseUJBQUssTUFBTSxPQUFPLFdBQVc7QUFBQSxJQUMvQjtBQUFBLEVBQ0Y7QUFDQSxlQUFhLEtBQUssaUJBQWlCLE1BQVM7QUFDNUMsZUFBYSxLQUFLLFdBQVcsTUFBUztBQUN0QyxNQUFJQSxjQUFhLFlBQVksS0FBSyxTQUFTO0FBQ3pDLHFCQUFhLHlCQUFLLEtBQUssU0FBUyxZQUFZLFdBQVcsQ0FBQztBQUFBLEVBQzFEO0FBQ0EsYUFBVyxhQUFhLFlBQVk7QUFDbEMsUUFBSSxPQUFPLFNBQVMsRUFBRyxRQUFPO0FBQUEsRUFDaEM7QUFDQSxTQUFPO0FBQ1Q7QUFPTyxTQUFTLCtCQUNkLFNBQ3NCO0FBQ3RCLFFBQU0sWUFBWSxRQUFRLGFBQWE7QUFDdkMsU0FBTztBQUFBLElBQ0wsT0FBTyxRQUFRO0FBQ2IsWUFBTSxNQUFNLFFBQVEsa0JBQWtCO0FBQ3RDLFVBQUksQ0FBQyxLQUFLO0FBQ1IsZUFBTyxRQUFRLE9BQU8sSUFBSSxNQUFNLDJDQUEyQyxDQUFDO0FBQUEsTUFDOUU7QUFDQSxVQUFJO0FBQ0osVUFBSTtBQUNGLGdCQUFRLFVBQVUsS0FBSyxDQUFDLEdBQUc7QUFBQSxVQUN6QixLQUFLLG1CQUFtQixNQUFNO0FBQUEsVUFDOUIsU0FBSyw0QkFBUSxPQUFPLFNBQVM7QUFBQSxVQUM3QixPQUFPLENBQUMsVUFBVSxRQUFRLE1BQU07QUFBQSxVQUNoQyxhQUFhO0FBQUEsUUFDZixDQUF3QjtBQUFBLE1BQzFCLFNBQVMsT0FBTztBQUNkLGVBQU8sUUFBUSxPQUFPLEtBQUs7QUFBQSxNQUM3QjtBQUNBLFlBQU0sS0FBSztBQUNYLGFBQU8sYUFBYSxLQUFLO0FBQUEsSUFDM0I7QUFBQSxFQUNGO0FBQ0Y7QUFFQSxTQUFTLE1BQU0sT0FBMkI7QUFDeEMsUUFBTSxRQUFRLEdBQUcsUUFBUSxNQUFNO0FBQUEsRUFBQyxDQUFDO0FBQ2pDLFFBQU0sUUFBUSxHQUFHLFFBQVEsTUFBTTtBQUFBLEVBQUMsQ0FBQztBQUNqQyxRQUFNLFFBQVEsT0FBTztBQUNyQixRQUFNLFFBQVEsT0FBTztBQUN2QjtBQUVBLFNBQVMsYUFBYSxPQUFpRDtBQUNyRSxTQUFPLElBQUksUUFBUSxDQUFDQyxXQUFTLFdBQVc7QUFDdEMsVUFBTSxVQUFVLENBQUMsVUFBaUI7QUFDaEMsWUFBTSxJQUFJLFNBQVMsT0FBTztBQUMxQixhQUFPLEtBQUs7QUFBQSxJQUNkO0FBQ0EsVUFBTSxVQUFVLE1BQU07QUFDcEIsWUFBTSxJQUFJLFNBQVMsT0FBTztBQUMxQixZQUFNLEdBQUcsU0FBUyxNQUFNO0FBQUEsTUFBQyxDQUFDO0FBQzFCLE1BQUFBLFVBQVEsVUFBVSxLQUFLLENBQUM7QUFBQSxJQUMxQjtBQUNBLFVBQU0sS0FBSyxTQUFTLE9BQU87QUFDM0IsVUFBTSxLQUFLLFNBQVMsT0FBTztBQUMzQixRQUFJLE1BQU0sT0FBTyxNQUFNO0FBQ3JCLFlBQU0sSUFBSSxTQUFTLE9BQU87QUFDMUIsWUFBTSxJQUFJLFNBQVMsT0FBTztBQUMxQixZQUFNLEdBQUcsU0FBUyxNQUFNO0FBQUEsTUFBQyxDQUFDO0FBQzFCLE1BQUFBLFVBQVEsVUFBVSxLQUFLLENBQUM7QUFBQSxJQUMxQjtBQUFBLEVBQ0YsQ0FBQztBQUNIO0FBRUEsU0FBUyxVQUFVLE9BQXdDO0FBQ3pELFNBQU87QUFBQSxJQUNMLEtBQUssUUFBUTtBQUNYLFVBQUk7QUFDRixlQUFPLE1BQU0sS0FBSyxNQUFNO0FBQUEsTUFDMUIsUUFBUTtBQUNOLGVBQU87QUFBQSxNQUNUO0FBQUEsSUFDRjtBQUFBLElBQ0EsT0FBTyxVQUFVO0FBQ2YsWUFBTSxVQUFVLENBQUMsTUFBcUIsV0FBa0M7QUFDdEUsaUJBQVMsTUFBTSxNQUFNO0FBQUEsTUFDdkI7QUFDQSxZQUFNLEdBQUcsUUFBUSxPQUFPO0FBQ3hCLGFBQU8sTUFBTTtBQUNYLGNBQU0sSUFBSSxRQUFRLE9BQU87QUFBQSxNQUMzQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0Y7OztBQzFKQSxJQUFBQyxtQkFBd0c7QUFDeEcsSUFBQUMscUJBQXdDO0FBMENqQyxJQUFNLHNCQUFOLE1BQTBCO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQSxVQUFVLG9CQUFJLElBQTJCO0FBQUEsRUFDekMsU0FBUyxvQkFBSSxJQUFvQjtBQUFBLEVBRWxELFlBQVksU0FBcUM7QUFDL0MsU0FBSyxXQUFXLFFBQVE7QUFDeEIsU0FBSyxXQUFXLFFBQVE7QUFDeEIsU0FBSyxNQUFNLFFBQVEsUUFBUSxNQUFNLG9CQUFJLEtBQUs7QUFDMUMsU0FBSyxNQUFNLFFBQVE7QUFDbkIsU0FBSyxnQkFBZ0IsUUFBUSxpQkFBaUI7QUFDOUMsU0FBSyxnQkFBZ0IsUUFBUSxpQkFBaUI7QUFDOUMsU0FBSyxhQUFhO0FBQUEsRUFDcEI7QUFBQSxFQUVBLGVBQXVDO0FBQ3JDLDRCQUF3QixLQUFLLFFBQVE7QUFDckMsV0FBTyxDQUFDLEdBQUcsS0FBSyxRQUFRLE9BQU8sQ0FBQyxFQUM3QixJQUFJLENBQUMsV0FBVyxjQUFjLE9BQU8sUUFBUSxDQUFDLEVBQzlDLEtBQUssQ0FBQyxHQUFHLE1BQU0sRUFBRSxVQUFVLGNBQWMsRUFBRSxTQUFTLEtBQUssRUFBRSxHQUFHLGNBQWMsRUFBRSxFQUFFLENBQUM7QUFBQSxFQUN0RjtBQUFBLEVBRUEsV0FBVyxJQUFrQztBQUMzQyxXQUFPLGNBQWMsS0FBSyxRQUFRLEVBQUUsRUFBRSxRQUFRO0FBQUEsRUFDaEQ7QUFBQSxFQUVBLGlCQUFpQixJQUFnQztBQUMvQyxVQUFNLFNBQVMsS0FBSyxRQUFRLEVBQUU7QUFDOUIsV0FBTztBQUFBLE1BQ0wsSUFBSSxPQUFPLFNBQVM7QUFBQSxNQUNwQixXQUFXLE9BQU87QUFBQSxNQUNsQixVQUFVLGNBQWMsT0FBTyxRQUFRO0FBQUEsSUFDekM7QUFBQSxFQUNGO0FBQUEsRUFFQSxjQUFjLFFBQWlDLENBQUMsR0FBeUI7QUFDdkUsNEJBQXdCLEtBQUssUUFBUTtBQUNyQyxVQUFNLEtBQUssTUFBTSxPQUFPLFNBQVksS0FBSyxXQUFXLEtBQUssZ0JBQWdCLE1BQU0sRUFBRSxHQUFHLE1BQU07QUFDMUYsUUFBSSxLQUFLLFFBQVEsSUFBSSxFQUFFLFNBQUssNkJBQVcsV0FBVyxLQUFLLFVBQVUsRUFBRSxDQUFDLEdBQUc7QUFDckUsWUFBTSxJQUFJLE1BQU0sd0JBQXdCO0FBQUEsSUFDMUM7QUFDQSxVQUFNLFlBQVksS0FBSyxPQUFPO0FBQzlCLFVBQU0sV0FBaUM7QUFBQSxNQUNyQztBQUFBLE1BQ0EsT0FBTyxlQUFlLE1BQU0sS0FBSztBQUFBLE1BQ2pDLFNBQVM7QUFBQSxNQUNUO0FBQUEsSUFDRjtBQUNBLDRCQUF3QixLQUFLLFFBQVE7QUFDckMsVUFBTSxNQUFNLFdBQVcsS0FBSyxVQUFVLEVBQUU7QUFDeEMsUUFBSTtBQUNGLHNDQUFVLEdBQUc7QUFBQSxJQUNmLFNBQVMsT0FBTztBQUNkLFlBQU0sT0FBUSxNQUFnQztBQUM5QyxVQUFJLFNBQVMsU0FBVSxPQUFNLElBQUksTUFBTSx3QkFBd0I7QUFDL0QsWUFBTTtBQUFBLElBQ1I7QUFDQSxvQ0FBVSxpQkFBaUIsS0FBSyxVQUFVLEVBQUUsR0FBRyxFQUFFLFdBQVcsS0FBSyxDQUFDO0FBQ2xFLG9DQUFVLGtCQUFrQixLQUFLLFVBQVUsRUFBRSxHQUFHLEVBQUUsV0FBVyxLQUFLLENBQUM7QUFDbkUsb0JBQWdCLGdCQUFnQixLQUFLLFVBQVUsRUFBRSxHQUFHLFFBQVE7QUFDNUQsU0FBSyxRQUFRLElBQUksSUFBSTtBQUFBLE1BQ25CO0FBQUEsTUFDQSxXQUFXO0FBQUEsTUFDWCxPQUFPO0FBQUEsTUFDUCxXQUFXO0FBQUEsTUFDWCxVQUFVO0FBQUEsSUFDWixDQUFDO0FBQ0QsU0FBSyxNQUFNLFFBQVEsbUJBQW1CLEVBQUUsRUFBRTtBQUMxQyxXQUFPLGNBQWMsUUFBUTtBQUFBLEVBQy9CO0FBQUEsRUFFQSxjQUFjLElBQVksT0FBcUM7QUFDN0QsVUFBTSxTQUFTLEtBQUssUUFBUSxFQUFFO0FBQzlCLFdBQU8sU0FBUyxRQUFRLGVBQWUsS0FBSztBQUM1QyxXQUFPLFNBQVMsWUFBWSxLQUFLLE9BQU87QUFDeEMsU0FBSyxRQUFRLE1BQU07QUFDbkIsV0FBTyxjQUFjLE9BQU8sUUFBUTtBQUFBLEVBQ3RDO0FBQUEsRUFFQSxjQUFjLElBQWtDO0FBQzlDLFdBQU8sS0FBSyxXQUFXLElBQUksSUFBSTtBQUFBLEVBQ2pDO0FBQUEsRUFFQSxlQUFlLElBQWtDO0FBQy9DLFdBQU8sS0FBSyxXQUFXLElBQUksS0FBSztBQUFBLEVBQ2xDO0FBQUEsRUFFQSxNQUFNLGNBQWMsSUFBWSxVQUFxQyxDQUFDLEdBQWtCO0FBQ3RGLDRCQUF3QixLQUFLLFFBQVE7QUFDckMsVUFBTSxTQUFTLEtBQUssUUFBUSxFQUFFO0FBQzlCLFFBQUksT0FBTyxjQUFjLGNBQWMsT0FBTyxjQUFjLGFBQWEsT0FBTyxjQUFjLFlBQVk7QUFDeEcsVUFBSSxDQUFDLFFBQVEsV0FBVztBQUN0QixjQUFNLElBQUksTUFBTSxvQkFBb0I7QUFBQSxNQUN0QztBQUNBLFlBQU0sS0FBSyxZQUFZLEVBQUU7QUFBQSxJQUMzQjtBQUNBLFNBQUssT0FBTyxNQUFNO0FBQ2xCLFNBQUssUUFBUSxPQUFPLEVBQUU7QUFDdEIsaUJBQWEsS0FBSyxVQUFVLEVBQUU7QUFDOUIsU0FBSyxNQUFNLFFBQVEsbUJBQW1CLEVBQUUsRUFBRTtBQUFBLEVBQzVDO0FBQUEsRUFFQSxNQUFNLGFBQWEsSUFBeUM7QUFDMUQsVUFBTSxTQUFTLEtBQUssUUFBUSxFQUFFO0FBQzlCLFFBQUksQ0FBQyxPQUFPLFNBQVMsUUFBUyxPQUFNLElBQUksTUFBTSxxQkFBcUI7QUFDbkUsUUFBSSxPQUFPLGNBQWMsY0FBYyxPQUFPLGNBQWMsV0FBVztBQUNyRSxZQUFNLElBQUksTUFBTSxrQ0FBa0M7QUFBQSxJQUNwRDtBQUNBLFFBQUksT0FBTyxjQUFjLFdBQVksT0FBTSxJQUFJLE1BQU0scUJBQXFCO0FBQzFFLFdBQU8sWUFBWTtBQUNuQixVQUFNLE9BQU8sS0FBSyxhQUFhLE1BQU07QUFDckMsV0FBTyxXQUFXO0FBQ2xCLFFBQUk7QUFDRixZQUFNO0FBQUEsSUFDUixVQUFFO0FBQ0EsVUFBSSxPQUFPLGFBQWEsS0FBTSxRQUFPLFdBQVc7QUFBQSxJQUNsRDtBQUNBLFdBQU8sS0FBSyxpQkFBaUIsRUFBRTtBQUFBLEVBQ2pDO0FBQUEsRUFFQSxNQUFNLFlBQVksSUFBeUM7QUFDekQsVUFBTSxTQUFTLEtBQUssUUFBUSxFQUFFO0FBQzlCLFFBQUksT0FBTyxjQUFjLFVBQVcsUUFBTyxLQUFLLGlCQUFpQixFQUFFO0FBQ25FLFFBQUksT0FBTyxjQUFjLFlBQVksQ0FBQyxPQUFPLE1BQU8sUUFBTyxLQUFLLGlCQUFpQixFQUFFO0FBQ25GLFFBQUksT0FBTyxjQUFjLGNBQWMsT0FBTyxVQUFVO0FBQ3RELFlBQU0sT0FBTyxTQUFTLE1BQU0sTUFBTTtBQUFBLE1BQUMsQ0FBQztBQUNwQyxhQUFPLEtBQUssaUJBQWlCLEVBQUU7QUFBQSxJQUNqQztBQUNBLFdBQU8sWUFBWTtBQUNuQixVQUFNLE9BQU8sS0FBSyxXQUFXLE1BQU07QUFDbkMsV0FBTyxXQUFXO0FBQ2xCLFFBQUk7QUFDRixZQUFNO0FBQUEsSUFDUixVQUFFO0FBQ0EsVUFBSSxPQUFPLGFBQWEsS0FBTSxRQUFPLFdBQVc7QUFBQSxJQUNsRDtBQUNBLFdBQU8sS0FBSyxpQkFBaUIsRUFBRTtBQUFBLEVBQ2pDO0FBQUEsRUFFQSxNQUFNLGVBQWUsSUFBeUM7QUFDNUQsVUFBTSxLQUFLLFlBQVksRUFBRTtBQUN6QixXQUFPLEtBQUssYUFBYSxFQUFFO0FBQUEsRUFDN0I7QUFBQSxFQUVBLE1BQU0sWUFBWSxVQUFrQyxDQUFDLEdBQWtCO0FBQ3JFLFVBQU0sWUFBWSxRQUFRLGFBQWEsS0FBSyxnQkFBZ0IsS0FBSztBQUNqRSxVQUFNLE9BQU8sQ0FBQyxHQUFHLEtBQUssUUFBUSxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsV0FBVyxLQUFLLE9BQU8sTUFBTSxDQUFDO0FBQzlFLFVBQU0sV0FBVyxRQUFRLElBQUksS0FBSyxJQUFJLENBQUMsV0FBVyxLQUFLLFlBQVksT0FBTyxTQUFTLEVBQUUsRUFBRSxNQUFNLE1BQU07QUFBQSxJQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZHLFVBQU0sUUFBUSxLQUFLLENBQUMsVUFBVSxLQUFLLE1BQU0sU0FBUyxDQUFDLENBQUM7QUFDcEQsZUFBVyxVQUFVLEtBQUssUUFBUSxPQUFPLEdBQUc7QUFDMUMsV0FBSyxPQUFPLE1BQU07QUFDbEIsVUFBSSxPQUFPLGNBQWMsY0FBYyxPQUFPLGNBQWMsYUFBYSxPQUFPLGNBQWMsWUFBWTtBQUN4RyxlQUFPLFlBQVk7QUFBQSxNQUNyQjtBQUFBLElBQ0Y7QUFDQSxTQUFLLFlBQVk7QUFBQSxFQUNuQjtBQUFBLEVBRUEsa0JBQTJCO0FBQ3pCLGVBQVcsVUFBVSxLQUFLLFFBQVEsT0FBTyxHQUFHO0FBQzFDLFVBQUksS0FBSyxPQUFPLE1BQU0sRUFBRyxRQUFPO0FBQUEsSUFDbEM7QUFDQSxXQUFPO0FBQUEsRUFDVDtBQUFBLEVBRVEsT0FBTyxRQUFnQztBQUM3QyxXQUNFLE9BQU8sVUFBVSxRQUNqQixPQUFPLGNBQWMsY0FDckIsT0FBTyxjQUFjLGFBQ3JCLE9BQU8sY0FBYztBQUFBLEVBRXpCO0FBQUEsRUFFUSxXQUFXLElBQVksU0FBd0M7QUFDckUsVUFBTSxTQUFTLEtBQUssUUFBUSxFQUFFO0FBQzlCLFdBQU8sU0FBUyxVQUFVO0FBQzFCLFdBQU8sU0FBUyxZQUFZLEtBQUssT0FBTztBQUN4QyxTQUFLLFFBQVEsTUFBTTtBQUNuQixXQUFPLGNBQWMsT0FBTyxRQUFRO0FBQUEsRUFDdEM7QUFBQSxFQUVBLE1BQWMsYUFBYSxRQUFzQztBQUMvRCxRQUFJO0FBQ0YsWUFBTSxRQUFRLE1BQU0sS0FBSyxTQUFTLE9BQU87QUFBQSxRQUN2QyxXQUFXLE9BQU8sU0FBUztBQUFBLFFBQzNCLFdBQVcsaUJBQWlCLEtBQUssVUFBVSxPQUFPLFNBQVMsRUFBRTtBQUFBLFFBQzdELFlBQVksa0JBQWtCLEtBQUssVUFBVSxPQUFPLFNBQVMsRUFBRTtBQUFBLE1BQ2pFLENBQUM7QUFDRCxhQUFPLFFBQVE7QUFDZixhQUFPLFlBQVksTUFBTSxPQUFPLENBQUMsTUFBTSxXQUFXO0FBQ2hELGFBQUssWUFBWSxRQUFRLE1BQU0sTUFBTTtBQUFBLE1BQ3ZDLENBQUM7QUFDRCxhQUFPLFlBQVk7QUFDbkIsYUFBTyxTQUFTLGdCQUFnQixLQUFLLE9BQU87QUFDNUMsYUFBTyxTQUFTLFlBQVksT0FBTyxTQUFTO0FBQzVDLFdBQUssUUFBUSxNQUFNO0FBQUEsSUFDckIsU0FBUyxPQUFPO0FBQ2QsYUFBTyxZQUFZO0FBQ25CLGFBQU8sUUFBUTtBQUNmLGFBQU8sWUFBWTtBQUNuQixhQUFPLFNBQVMsV0FBVztBQUFBLFFBQ3pCLElBQUksS0FBSyxPQUFPO0FBQUEsUUFDaEIsTUFBTTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsUUFBUTtBQUFBLE1BQ1Y7QUFDQSxhQUFPLFNBQVMsWUFBWSxPQUFPLFNBQVMsU0FBUztBQUNyRCxXQUFLLFFBQVEsTUFBTTtBQUNuQixZQUFNO0FBQUEsSUFDUjtBQUFBLEVBQ0Y7QUFBQSxFQUVBLE1BQWMsV0FBVyxRQUFzQztBQUM3RCxVQUFNLFFBQVEsT0FBTztBQUNyQixRQUFJLENBQUMsT0FBTztBQUNWLGFBQU8sWUFBWTtBQUNuQixhQUFPLFNBQVMsZ0JBQWdCLEtBQUssT0FBTztBQUM1QyxhQUFPLFNBQVMsWUFBWSxPQUFPLFNBQVM7QUFDNUMsV0FBSyxRQUFRLE1BQU07QUFDbkI7QUFBQSxJQUNGO0FBQ0EsUUFBSSxXQUEwQjtBQUM5QixRQUFJLGFBQW9DO0FBQ3hDLFVBQU0sV0FBVyxJQUFJLFFBQWMsQ0FBQ0MsY0FBWTtBQUM5QyxZQUFNLFFBQVEsTUFBTSxPQUFPLENBQUMsTUFBTSxXQUFXO0FBQzNDLG1CQUFXO0FBQ1gscUJBQWE7QUFDYixjQUFNO0FBQ04sUUFBQUEsVUFBUTtBQUFBLE1BQ1YsQ0FBQztBQUFBLElBQ0gsQ0FBQztBQUNELFVBQU0sS0FBSyxTQUFTO0FBQ3BCLFVBQU0sYUFBYSxNQUFNLEtBQUssZ0JBQWdCLFVBQVUsS0FBSyxhQUFhO0FBQzFFLFFBQUksQ0FBQyxZQUFZO0FBQ2YsWUFBTSxLQUFLLFNBQVM7QUFDcEIsWUFBTSxLQUFLLGdCQUFnQixVQUFVLEtBQUssYUFBYTtBQUFBLElBQ3pEO0FBQ0EsU0FBSyxPQUFPLE1BQU07QUFDbEIsV0FBTyxZQUFZO0FBQ25CLFdBQU8sU0FBUyxnQkFBZ0IsS0FBSyxPQUFPO0FBQzVDLFdBQU8sU0FBUyxXQUFXO0FBQUEsTUFDekIsSUFBSSxPQUFPLFNBQVM7QUFBQSxNQUNwQixNQUFNO0FBQUEsTUFDTixRQUFRO0FBQUEsTUFDUixRQUFRO0FBQUEsSUFDVjtBQUNBLFdBQU8sU0FBUyxZQUFZLE9BQU8sU0FBUztBQUM1QyxTQUFLLFFBQVEsTUFBTTtBQUFBLEVBQ3JCO0FBQUEsRUFFUSxZQUNOLFFBQ0EsTUFDQSxRQUNNO0FBQ04sUUFBSSxPQUFPLGNBQWMsV0FBWTtBQUNyQyxRQUFJLE9BQU8sY0FBYyxhQUFhLE9BQU8sY0FBYyxXQUFZO0FBQ3ZFLFNBQUssT0FBTyxNQUFNO0FBQ2xCLFdBQU8sWUFBWTtBQUNuQixXQUFPLFNBQVMsV0FBVztBQUFBLE1BQ3pCLElBQUksS0FBSyxPQUFPO0FBQUEsTUFDaEI7QUFBQSxNQUNBO0FBQUEsTUFDQSxRQUFRO0FBQUEsSUFDVjtBQUNBLFdBQU8sU0FBUyxZQUFZLE9BQU8sU0FBUyxTQUFTO0FBQ3JELFNBQUssUUFBUSxNQUFNO0FBQ25CLFNBQUssTUFBTSxRQUFRLFdBQVcsT0FBTyxTQUFTLEVBQUUsc0JBQXNCO0FBQUEsRUFDeEU7QUFBQSxFQUVRLE9BQU8sUUFBNkI7QUFDMUMsV0FBTyxZQUFZO0FBQ25CLFdBQU8sWUFBWTtBQUNuQixRQUFJLE9BQU8sT0FBTztBQUNoQixVQUFJO0FBQ0YsZUFBTyxNQUFNLEtBQUssU0FBUztBQUFBLE1BQzdCLFFBQVE7QUFBQSxNQUFDO0FBQ1QsYUFBTyxRQUFRO0FBQUEsSUFDakI7QUFBQSxFQUNGO0FBQUEsRUFFUSxRQUFRLElBQTJCO0FBQ3pDLG9CQUFnQixFQUFFO0FBQ2xCLDRCQUF3QixLQUFLLFFBQVE7QUFDckMsVUFBTSxTQUFTLEtBQUssUUFBUSxJQUFJLEVBQUU7QUFDbEMsUUFBSSxDQUFDLE9BQVEsT0FBTSxJQUFJLE1BQU0sb0JBQW9CLEVBQUUsRUFBRTtBQUNyRCxXQUFPO0FBQUEsRUFDVDtBQUFBLEVBRVEsYUFBcUI7QUFDM0IsVUFBTSxTQUFTLHdCQUF3QixLQUFLLFFBQVE7QUFDcEQsYUFBUyxJQUFJLEdBQUcsSUFBSSxHQUFHLEtBQUs7QUFDMUIsWUFBTSxLQUFLLGtCQUFrQjtBQUM3QixVQUFJLENBQUMsS0FBSyxRQUFRLElBQUksRUFBRSxLQUFLLEtBQUMsaUNBQVcseUJBQUssT0FBTyxrQkFBa0IsRUFBRSxDQUFDLEVBQUcsUUFBTztBQUFBLElBQ3RGO0FBQ0EsVUFBTSxJQUFJLE1BQU0sK0JBQStCO0FBQUEsRUFDakQ7QUFBQSxFQUVRLFFBQVEsUUFBNkI7QUFDM0MsNEJBQXdCLEtBQUssUUFBUTtBQUNyQyxvQkFBZ0IsZ0JBQWdCLEtBQUssVUFBVSxPQUFPLFNBQVMsRUFBRSxHQUFHLE9BQU8sUUFBUTtBQUFBLEVBQ3JGO0FBQUEsRUFFUSxlQUFxQjtBQUMzQixVQUFNLFNBQVMsd0JBQXdCLEtBQUssUUFBUTtBQUNwRCxVQUFNLE9BQU8sT0FBTztBQUNwQixRQUFJLEtBQUMsNkJBQVcsSUFBSSxFQUFHO0FBQ3ZCLFFBQUksVUFBb0IsQ0FBQztBQUN6QixRQUFJO0FBQ0Ysb0JBQVUsOEJBQVksSUFBSTtBQUFBLElBQzVCLFFBQVE7QUFDTjtBQUFBLElBQ0Y7QUFDQSxlQUFXLFFBQVEsU0FBUztBQUMxQixVQUFJLENBQUMsWUFBWSxJQUFJLEVBQUc7QUFDeEIsVUFBSTtBQUNGLGNBQU0sV0FBVyxnQkFBZ0IsS0FBSyxVQUFVLElBQUk7QUFDcEQsWUFBSSxLQUFDLDZCQUFXLFFBQVEsRUFBRztBQUMzQixjQUFNLE1BQU0sS0FBSyxVQUFNLCtCQUFhLFVBQVUsTUFBTSxDQUFDO0FBQ3JELGNBQU0sV0FBVyxpQkFBaUIsS0FBSyxJQUFJO0FBQzNDLGFBQUssUUFBUSxJQUFJLE1BQU07QUFBQSxVQUNyQjtBQUFBLFVBQ0EsV0FBVztBQUFBLFVBQ1gsT0FBTztBQUFBLFVBQ1AsV0FBVztBQUFBLFVBQ1gsVUFBVTtBQUFBLFFBQ1osQ0FBQztBQUFBLE1BQ0gsU0FBUyxPQUFPO0FBQ2QsYUFBSyxNQUFNLFFBQVEsMEJBQTBCLElBQUksRUFBRTtBQUFBLE1BQ3JEO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUVRLFNBQWlCO0FBQ3ZCLFdBQU8sS0FBSyxJQUFJLEVBQUUsWUFBWTtBQUFBLEVBQ2hDO0FBQUEsRUFFUSxNQUFNLElBQTJCO0FBQ3ZDLFdBQU8sSUFBSSxRQUFRLENBQUNBLGNBQVk7QUFDOUIsWUFBTSxRQUFRLFdBQVcsTUFBTTtBQUM3QixhQUFLLE9BQU8sT0FBTyxLQUFLO0FBQ3hCLFFBQUFBLFVBQVE7QUFBQSxNQUNWLEdBQUcsRUFBRTtBQUNMLFdBQUssT0FBTyxJQUFJLEtBQUs7QUFBQSxJQUN2QixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBRUEsTUFBYyxnQkFBZ0IsU0FBd0IsV0FBcUM7QUFDekYsUUFBSSxVQUFVO0FBQ2QsVUFBTSxVQUFVLEtBQUssTUFBTSxTQUFTLEVBQUUsS0FBSyxNQUFNO0FBQy9DLFVBQUksUUFBUyxRQUFPO0FBQ3BCLGFBQU87QUFBQSxJQUNULENBQUM7QUFDRCxVQUFNLFNBQVMsTUFBTSxRQUFRLEtBQUs7QUFBQSxNQUNoQyxRQUFRLEtBQUssTUFBTTtBQUNqQixrQkFBVTtBQUNWLGVBQU87QUFBQSxNQUNULENBQUM7QUFBQSxNQUNEO0FBQUEsSUFDRixDQUFDO0FBQ0QsV0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUVRLGNBQW9CO0FBQzFCLGVBQVcsU0FBUyxLQUFLLE9BQVEsY0FBYSxLQUFLO0FBQ25ELFNBQUssT0FBTyxNQUFNO0FBQUEsRUFDcEI7QUFDRjtBQUVBLFNBQVMsZUFBZSxPQUF3QjtBQUM5QyxNQUFJLFVBQVUsVUFBYSxVQUFVLEtBQU0sUUFBTztBQUNsRCxNQUFJLE9BQU8sVUFBVSxTQUFVLE9BQU0sSUFBSSxNQUFNLGdDQUFnQztBQUMvRSxTQUFPLE1BQU0sTUFBTSxHQUFHLEdBQUc7QUFDM0I7QUFFQSxTQUFTLGNBQWMsVUFBc0Q7QUFDM0UsU0FBTztBQUFBLElBQ0wsR0FBRztBQUFBLElBQ0gsR0FBSSxTQUFTLFdBQVcsRUFBRSxVQUFVLEVBQUUsR0FBRyxTQUFTLFNBQVMsRUFBRSxJQUFJLENBQUM7QUFBQSxFQUNwRTtBQUNGO0FBRU8sU0FBUyxpQkFBaUIsS0FBYyxZQUEwQztBQUN2RixRQUFNLE1BQU0sU0FBUyxHQUFHLElBQUksTUFBTSxDQUFDO0FBQ25DLFFBQU0sY0FBYyxTQUFTLElBQUksUUFBUSxJQUFJLElBQUksV0FBVztBQUM1RCxNQUFJLFNBQXVEO0FBQzNELE1BQ0UsZ0JBQ0MsWUFBWSxXQUFXLGVBQ3RCLFlBQVksV0FBVyxnQkFDdkIsWUFBWSxXQUFXLGtCQUN6QjtBQUNBLGFBQVMsWUFBWTtBQUFBLEVBQ3ZCO0FBQ0EsUUFBTSxXQUFXLGNBQ2I7QUFBQSxJQUNFLElBQUksT0FBTyxZQUFZLE9BQU8sV0FBVyxZQUFZLE1BQUssb0JBQUksS0FBSyxDQUFDLEdBQUUsWUFBWTtBQUFBLElBQ2xGLE1BQU0sT0FBTyxZQUFZLFNBQVMsV0FBVyxZQUFZLE9BQU87QUFBQSxJQUNoRSxRQUFRLE9BQU8sWUFBWSxXQUFXLFdBQVcsWUFBWSxTQUFTO0FBQUEsSUFDdEU7QUFBQSxFQUNGLElBQ0E7QUFDSixRQUFNLFdBQWlDO0FBQUEsSUFDckMsSUFBSTtBQUFBLElBQ0osT0FBTyxPQUFPLElBQUksVUFBVSxXQUFXLElBQUksUUFBUTtBQUFBLElBQ25ELFNBQVMsSUFBSSxZQUFZO0FBQUEsSUFDekIsV0FBVyxPQUFPLElBQUksY0FBYyxXQUFXLElBQUksYUFBWSxvQkFBSSxLQUFLLENBQUMsR0FBRSxZQUFZO0FBQUEsRUFDekY7QUFDQSxNQUFJLE9BQU8sSUFBSSxjQUFjLFNBQVUsVUFBUyxZQUFZLElBQUk7QUFDaEUsTUFBSSxPQUFPLElBQUksa0JBQWtCLFNBQVUsVUFBUyxnQkFBZ0IsSUFBSTtBQUN4RSxNQUFJLE9BQU8sSUFBSSxrQkFBa0IsU0FBVSxVQUFTLGdCQUFnQixJQUFJO0FBQ3hFLE1BQUksU0FBVSxVQUFTLFdBQVc7QUFDbEMsU0FBTztBQUNUO0FBRUEsU0FBUyxTQUFTLE9BQWtEO0FBQ2xFLFNBQU8sVUFBVSxRQUFRLE9BQU8sVUFBVSxZQUFZLENBQUMsTUFBTSxRQUFRLEtBQUs7QUFDNUU7QUFFQSxTQUFTLGdCQUFnQixVQUFrQixNQUFxQjtBQUM5RCxRQUFNLFVBQU0sNEJBQVEsUUFBUTtBQUM1QixrQ0FBVSxLQUFLLEVBQUUsV0FBVyxLQUFLLENBQUM7QUFDbEMsUUFBTSxVQUFNLHlCQUFLLEtBQUssUUFBSSw2QkFBUyxRQUFRLENBQUMsSUFBSSxRQUFRLEdBQUcsTUFBTTtBQUNqRSxzQ0FBYyxLQUFLLEdBQUcsS0FBSyxVQUFVLE1BQU0sTUFBTSxDQUFDLENBQUM7QUFBQSxHQUFNLE1BQU07QUFDL0QsTUFBSTtBQUNGLHFDQUFXLEtBQUssUUFBUTtBQUFBLEVBQzFCLFFBQVE7QUFDTixRQUFJO0FBQ0YsdUNBQVcsUUFBUTtBQUFBLElBQ3JCLFFBQVE7QUFBQSxJQUFDO0FBQ1QscUNBQVcsS0FBSyxRQUFRO0FBQUEsRUFDMUI7QUFDRjs7O0FDL2RBLElBQUksVUFBc0M7QUFFbkMsU0FBUyx1QkFBdUIsTUFBd0M7QUFDN0UsWUFBVTtBQUNaO0FBTU8sU0FBUyw2QkFBa0Q7QUFDaEUsTUFBSSxDQUFDLFFBQVMsT0FBTSxJQUFJLE1BQU0sd0NBQXdDO0FBQ3RFLFNBQU87QUFDVDs7O0FDVU8sSUFBTSwyQkFBMkI7QUFBQSxFQUN0QyxpQkFBaUI7QUFBQSxFQUNqQixlQUFlO0FBQ2pCO0FBd0dBLElBQU0sY0FBYztBQUViLFNBQVMsb0JBQW9CLFlBQThDO0FBQ2hGLFFBQU0sVUFBVyx5QkFBb0QsVUFBVSxLQUFLO0FBQ3BGLFNBQU87QUFDVDtBQUVPLFNBQVMsdUJBQ2QsVUFDUztBQUNULFNBQU8sTUFBTSxRQUFRLFNBQVMsV0FBVztBQUMzQztBQVFPLElBQU0sNEJBQTRCLG9CQUFJLElBQThCLENBQUMsZ0JBQWdCLENBQUM7QUFFdEYsU0FBUyxtQkFDZCxVQUNBLFlBQ1M7QUFDVCxRQUFNLFNBQVMsb0JBQW9CLFVBQVU7QUFDN0MsTUFBSSwwQkFBMEIsSUFBSSxNQUFNLEdBQUc7QUFDekMsWUFBUSxTQUFTLGVBQWUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxVQUFVLG9CQUFvQixLQUFLLE1BQU0sTUFBTTtBQUFBLEVBQzNGO0FBQ0EsTUFBSSxDQUFDLHVCQUF1QixRQUFRLEVBQUcsUUFBTztBQUM5QyxVQUFRLFNBQVMsZUFBZSxDQUFDLEdBQUcsS0FBSyxDQUFDLFVBQVUsb0JBQW9CLEtBQUssTUFBTSxNQUFNO0FBQzNGO0FBRU8sU0FBUyx3QkFDZCxTQUNBLFlBQ1E7QUFDUixTQUFPLFNBQVMsT0FBTyxpQkFBaUIsb0JBQW9CLFVBQVUsQ0FBQztBQUN6RTtBQUVPLFNBQVMsc0JBQ2QsU0FDQSxZQUNPO0FBQ1AsU0FBTyxJQUFJLE1BQU0sd0JBQXdCLFNBQVMsVUFBVSxDQUFDO0FBQy9EO0FBRU8sU0FBUyx5QkFDZCxVQUNBLFlBQ007QUFDTixNQUFJLENBQUMsbUJBQW1CLFVBQVUsVUFBVSxHQUFHO0FBQzdDLFVBQU0sc0JBQXNCLFNBQVMsSUFBSSxVQUFVO0FBQUEsRUFDckQ7QUFDRjtBQUVPLFNBQVMsZUFBZSxPQUFpQztBQUM5RCxTQUFPLE9BQU8sVUFBVSxZQUFZLFlBQVksS0FBSyxLQUFLO0FBQzVEO0FBRU8sU0FBUyxtQkFBbUIsT0FBeUM7QUFDMUUsTUFBSSxDQUFDLGVBQWUsS0FBSyxFQUFHLE9BQU0sSUFBSSxNQUFNLGNBQWM7QUFDNUQ7QUFFTyxTQUFTLGlCQUFpQixTQUFpQixhQUE2QjtBQUM3RSxxQkFBbUIsT0FBTztBQUMxQixxQkFBbUIsV0FBVztBQUM5QixNQUFJLFlBQVksYUFBYTtBQUMzQixVQUFNLElBQUksTUFBTSxTQUFTLE9BQU8scUJBQXFCLFdBQVcsYUFBYTtBQUFBLEVBQy9FO0FBQ0EsU0FBTztBQUNUO0FBRU8sU0FBUyxnQkFDZCxVQUNpQjtBQUNqQixTQUFPO0FBQUEsSUFDTCxVQUFVLG1CQUFtQixVQUFVLFVBQVU7QUFBQSxJQUNqRCxLQUFLLG1CQUFtQixVQUFVLEtBQUs7QUFBQSxJQUN2QyxZQUFZLG1CQUFtQixVQUFVLFlBQVk7QUFBQSxJQUNyRCxTQUFTLG1CQUFtQixVQUFVLFNBQVM7QUFBQSxJQUMvQyxjQUFjLG1CQUFtQixVQUFVLGVBQWU7QUFBQSxJQUMxRCxjQUFjLG1CQUFtQixVQUFVLGVBQWU7QUFBQSxJQUMxRCxZQUFZLG1CQUFtQixVQUFVLGFBQWE7QUFBQSxJQUN0RCxVQUFVLG1CQUFtQixVQUFVLFdBQVc7QUFBQSxJQUNsRCxjQUFjLG1CQUFtQixVQUFVLGVBQWU7QUFBQSxJQUMxRCxZQUFZLG1CQUFtQixVQUFVLGFBQWE7QUFBQSxJQUN0RCxjQUFjLG1CQUFtQixVQUFVLGVBQWU7QUFBQSxJQUMxRCxlQUFlLG1CQUFtQixVQUFVLGdCQUFnQjtBQUFBLEVBQzlEO0FBQ0Y7QUFFTyxTQUFTLGVBQWUsU0FBbUM7QUFDaEUsU0FDRSxRQUFRLGdCQUNSLFFBQVEsZ0JBQ1IsUUFBUSxjQUNSLFFBQVEsWUFDUixRQUFRLGdCQUNSLFFBQVEsY0FDUixRQUFRLGdCQUNSLFFBQVE7QUFFWjtBQTBCTyxTQUFTLHNCQUFzQixTQUFpQixTQUF5QjtBQUM5RSxTQUFPLFdBQVcsT0FBTyxJQUFJLE9BQU87QUFDdEM7QUFFTyxTQUFTLHlCQUNkLFVBQ0EsYUFDQSxZQUNBLFNBQ3VCO0FBQ3ZCLHFCQUFtQixXQUFXO0FBQzlCLE1BQUksWUFBWSxPQUFXLGtCQUFpQixTQUFTLFdBQVc7QUFDaEUsTUFBSSxDQUFDLFlBQVksU0FBUyxPQUFPLGFBQWE7QUFDNUMsVUFBTSxJQUFJLE1BQU0sa0JBQWtCLFdBQVcsRUFBRTtBQUFBLEVBQ2pEO0FBQ0EsTUFBSSxDQUFDLFNBQVMsU0FBUztBQUNyQixVQUFNLElBQUksTUFBTSxzQkFBc0IsV0FBVyxFQUFFO0FBQUEsRUFDckQ7QUFDQSwyQkFBeUIsU0FBUyxVQUFVLFVBQVU7QUFDdEQsU0FBTztBQUNUO0FBRU8sU0FBUyxtQkFDZCxTQUNBLFlBQzZCO0FBQzdCLFNBQU8sTUFBTTtBQUNYLFVBQU0sc0JBQXNCLFNBQVMsVUFBVTtBQUFBLEVBQ2pEO0FBQ0Y7QUFFTyxTQUFTLHdCQUNkLFNBQ0EsWUFDc0M7QUFDdEMsU0FBTyxZQUFZO0FBQ2pCLFVBQU0sc0JBQXNCLFNBQVMsVUFBVTtBQUFBLEVBQ2pEO0FBQ0Y7QUFFTyxTQUFTLG9CQUFvQixTQUEwQjtBQUM1RCxRQUFNLE9BQU8sd0JBQXdCLFNBQVMsWUFBWTtBQUMxRCxTQUFPO0FBQUEsSUFDTCxTQUFTLHVCQUF1QixPQUFPO0FBQUEsSUFDdkMsTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLEVBQ1Y7QUFDRjtBQWtCTyxTQUFTLHFCQUFxQixTQUEyQjtBQUM5RCxRQUFNLE9BQU8sbUJBQW1CLFNBQVMsS0FBSztBQUM5QyxTQUFPO0FBQUEsSUFDTCxJQUFJO0FBQUEsSUFDSixNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsSUFDUixRQUFRO0FBQUEsRUFDVjtBQUNGOzs7QUMxVUEsSUFBQUMsbUJBQTBCO0FBQzFCLElBQUFDLHFCQUE4QjtBQUl2QixTQUFTLGFBQWFDLFdBQWtCLFNBQXlCO0FBQ3RFLHFCQUFtQixPQUFPO0FBQzFCLGFBQU8seUJBQUtBLFdBQVUsY0FBYyxPQUFPO0FBQzdDO0FBRU8sU0FBUyxtQkFBbUJBLFdBQWtCLFNBQXlCO0FBQzVFLFFBQU0sTUFBTSxhQUFhQSxXQUFVLE9BQU87QUFDMUMsa0NBQVUsS0FBSyxFQUFFLFdBQVcsS0FBSyxDQUFDO0FBQ2xDLFNBQU87QUFDVDtBQUVPLFNBQVMscUJBQ2RBLFdBQ0EsU0FDQSxTQUMrQjtBQUMvQixRQUFNLE1BQU0sYUFBYUEsV0FBVSxPQUFPO0FBQzFDLFFBQU0sV0FBTyw0QkFBUSxLQUFLLE9BQU87QUFDakMsTUFBSSxDQUFDLGFBQWEsS0FBSyxJQUFJLEtBQUssU0FBUyxJQUFLLE9BQU0sSUFBSSxNQUFNLGdCQUFnQjtBQUM5RSxTQUFPLEVBQUUsS0FBSyxLQUFLO0FBQ3JCOzs7QVh5REEsSUFBTUMsNEJBQTJCLEtBQUssS0FBSyxLQUFLO0FBT3pDLElBQU0sYUFBYTtBQUFBLEVBQ3hCLFlBQVksQ0FBQztBQUFBLEVBQ2IsWUFBWSxvQkFBSSxJQUE2QjtBQUMvQztBQUVPLElBQU0sZUFBZSxJQUFJLGFBQWEsS0FBSztBQUFBLEVBQ2hELG9CQUFnQix5QkFBSyxZQUFZLFVBQVUsMEJBQTBCO0FBQ3ZFLENBQUM7QUFFTSxTQUFTLG9CQUEwQjtBQUN4QyxNQUFJO0FBQ0YsZUFBVyxhQUFhLGVBQWUsVUFBVTtBQUNqRDtBQUFBLE1BQ0U7QUFBQSxNQUNBLGNBQWMsV0FBVyxXQUFXLE1BQU07QUFBQSxNQUMxQyxXQUFXLFdBQVcsSUFBSSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRSxLQUFLLElBQUk7QUFBQSxJQUMzRDtBQUFBLEVBQ0YsU0FBUyxHQUFHO0FBQ1YsUUFBSSxTQUFTLDJCQUEyQixDQUFDO0FBQ3pDLGVBQVcsYUFBYSxDQUFDO0FBQUEsRUFDM0I7QUFFQSxrQ0FBZ0M7QUFFaEMsYUFBVyxLQUFLLFdBQVcsWUFBWTtBQUNyQyxRQUFJLENBQUMsd0JBQXdCLEVBQUUsU0FBUyxLQUFLLEVBQUc7QUFDaEQsUUFBSSxDQUFDLGVBQWUsRUFBRSxTQUFTLEVBQUUsR0FBRztBQUNsQyxVQUFJLFFBQVEsaUNBQWlDLEVBQUUsU0FBUyxFQUFFLEVBQUU7QUFDNUQ7QUFBQSxJQUNGO0FBQ0EsUUFBSTtBQUNGLFlBQU0sTUFBTSxRQUFRLEVBQUUsS0FBSztBQUMzQixZQUFNLFFBQVEsSUFBSSxXQUFXO0FBQzdCLFVBQUksT0FBTyxPQUFPLFVBQVUsWUFBWTtBQUN0QyxjQUFNLFVBQVUsa0JBQWtCLFVBQVcsRUFBRSxTQUFTLEVBQUU7QUFDMUQsY0FBTSxNQUFNO0FBQUEsVUFDVixVQUFVLEVBQUU7QUFBQSxVQUNaLFNBQVM7QUFBQSxVQUNULEtBQUssV0FBVyxFQUFFLFNBQVMsRUFBRTtBQUFBLFVBQzdCO0FBQUEsVUFDQSxLQUFLLFlBQVksRUFBRSxRQUFRO0FBQUEsVUFDM0IsSUFBSSxXQUFXLEVBQUUsUUFBUTtBQUFBLFVBQ3pCLE9BQU8sYUFBYSxDQUFDO0FBQUEsUUFDdkIsQ0FBQztBQUNELG1CQUFXLFdBQVcsSUFBSSxFQUFFLFNBQVMsSUFBSTtBQUFBLFVBQ3ZDLE1BQU0sTUFBTTtBQUFBLFVBQ1o7QUFBQSxRQUNGLENBQUM7QUFDRCxZQUFJLFFBQVEsdUJBQXVCLEVBQUUsU0FBUyxFQUFFLEVBQUU7QUFBQSxNQUNwRDtBQUFBLElBQ0YsU0FBUyxHQUFHO0FBQ1YsVUFBSSxTQUFTLFNBQVMsRUFBRSxTQUFTLEVBQUUscUJBQXFCLENBQUM7QUFBQSxJQUMzRDtBQUFBLEVBQ0Y7QUFDRjtBQUVPLFNBQVMsa0NBQXdDO0FBQ3RELE1BQUk7QUFDRixVQUFNLFNBQVMsc0JBQXNCO0FBQUEsTUFDbkMsWUFBWTtBQUFBLE1BQ1osUUFBUSxXQUFXLFdBQVcsT0FBTyxDQUFDLE1BQU0sZUFBZSxFQUFFLFNBQVMsRUFBRSxDQUFDO0FBQUEsSUFDM0UsQ0FBQztBQUNELFFBQUksT0FBTyxTQUFTO0FBQ2xCLFVBQUksUUFBUSw0QkFBNEIsT0FBTyxZQUFZLEtBQUssSUFBSSxLQUFLLE1BQU0sRUFBRTtBQUFBLElBQ25GO0FBQ0EsUUFBSSxPQUFPLG1CQUFtQixTQUFTLEdBQUc7QUFDeEM7QUFBQSxRQUNFO0FBQUEsUUFDQSxxRUFBcUUsT0FBTyxtQkFBbUIsS0FBSyxJQUFJLENBQUM7QUFBQSxNQUMzRztBQUFBLElBQ0Y7QUFBQSxFQUNGLFNBQVMsR0FBRztBQUNWLFFBQUksUUFBUSxvQ0FBb0MsQ0FBQztBQUFBLEVBQ25EO0FBQ0Y7QUFFTyxTQUFTLG9CQUEwQjtBQUN4QyxhQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssV0FBVyxZQUFZO0FBQzNDLFFBQUk7QUFDRixRQUFFLE9BQU87QUFDVCxRQUFFLFFBQVEsTUFBTTtBQUNoQixVQUFJLFFBQVEsdUJBQXVCLEVBQUUsRUFBRTtBQUFBLElBQ3pDLFNBQVMsR0FBRztBQUNWLFVBQUksUUFBUSxtQkFBbUIsRUFBRSxLQUFLLENBQUM7QUFBQSxJQUN6QyxVQUFFO0FBQ0EsbUJBQWEsYUFBYSxFQUFFO0FBQzVCLDhCQUF3QixFQUFFO0FBQUEsSUFDNUI7QUFBQSxFQUNGO0FBQ0EsYUFBVyxXQUFXLE1BQU07QUFDOUI7QUFFTyxTQUFTLHdCQUE4QjtBQUM1QyxRQUFNLFVBQVUsb0JBQUksSUFBWSxDQUFDLFlBQVksYUFBYSxVQUFVLENBQUMsQ0FBQztBQUN0RSxRQUFNLFdBQVcsb0JBQUksSUFBWTtBQUNqQyxhQUFXLFNBQVMsV0FBVyxZQUFZO0FBQ3pDLFlBQVEsSUFBSSxNQUFNLEdBQUc7QUFDckIsWUFBUSxJQUFJLGFBQWEsTUFBTSxHQUFHLENBQUM7QUFDbkMsYUFBUyxJQUFJLE1BQU0sS0FBSztBQUN4QixhQUFTLElBQUksYUFBYSxNQUFNLEtBQUssQ0FBQztBQUFBLEVBQ3hDO0FBRUEsUUFBTSxRQUFRLENBQUMsR0FBRyxPQUFPO0FBQ3pCLGFBQVcsT0FBTyxPQUFPLEtBQUssUUFBUSxLQUFLLEdBQUc7QUFDNUMsVUFBTSxVQUFVLGFBQWEsR0FBRztBQUNoQyxVQUFNLGdCQUNKLFNBQVMsSUFBSSxHQUFHLEtBQ2hCLFNBQVMsSUFBSSxPQUFPLEtBQ3BCLE1BQU0sS0FBSyxDQUFDLFNBQVMsYUFBYSxNQUFNLEdBQUcsS0FBSyxhQUFhLE1BQU0sT0FBTyxDQUFDO0FBQzdFLFFBQUksY0FBZSxRQUFPLFFBQVEsTUFBTSxHQUFHO0FBQUEsRUFDN0M7QUFDRjtBQUVPLFNBQVMsYUFBYSxVQUEwQjtBQUNyRCxNQUFJO0FBQ0YsZUFBTywrQkFBYSxRQUFRO0FBQUEsRUFDOUIsUUFBUTtBQUNOLFdBQU87QUFBQSxFQUNUO0FBQ0Y7QUFFTyxTQUFTLHVCQUF1QjtBQUNyQyxRQUFNLGVBQWUsVUFBVSxFQUFFLHFCQUFxQixDQUFDO0FBQ3ZELFNBQU8sV0FBVyxXQUFXLElBQUksQ0FBQyxPQUFPO0FBQUEsSUFDdkMsVUFBVSxFQUFFO0FBQUEsSUFDWixPQUFPLEVBQUU7QUFBQSxJQUNULEtBQUssRUFBRTtBQUFBLElBQ1AsaUJBQWEsNkJBQVcsRUFBRSxLQUFLO0FBQUEsSUFDL0IsU0FBUyxlQUFlLEVBQUUsU0FBUyxFQUFFO0FBQUEsSUFDckMsUUFBUSxhQUFhLEVBQUUsU0FBUyxFQUFFLEtBQUs7QUFBQSxFQUN6QyxFQUFFO0FBQ0o7QUFFQSxlQUFzQix1QkFBdUIsR0FBb0IsUUFBUSxPQUFzQjtBQUM3RixRQUFNLEtBQUssRUFBRSxTQUFTO0FBQ3RCLFFBQU0sT0FBTyxFQUFFLFNBQVM7QUFDeEIsTUFBSSxDQUFDLEtBQU07QUFDWCxRQUFNLFFBQVEsVUFBVTtBQUN4QixRQUFNLFNBQVMsTUFBTSxvQkFBb0IsRUFBRTtBQUMzQyxNQUNFLENBQUMsU0FDRCxVQUNBLE9BQU8sU0FBUyxRQUNoQixPQUFPLG1CQUFtQixFQUFFLFNBQVMsV0FDckMsS0FBSyxJQUFJLElBQUksS0FBSyxNQUFNLE9BQU8sU0FBUyxJQUFJQSwyQkFDNUM7QUFDQTtBQUFBLEVBQ0Y7QUFFQSxNQUFJO0FBQ0osTUFBSTtBQUNGLFVBQU0sRUFBRSxTQUFTLElBQUksTUFBTSx3QkFBd0I7QUFDbkQsVUFBTSxRQUFRLFNBQVMsUUFBUSxLQUFLLENBQUMsY0FBYyxVQUFVLE9BQU8sRUFBRTtBQUN0RSxRQUFJLENBQUMsT0FBTztBQUNWLGNBQVE7QUFBQSxRQUNOLFlBQVcsb0JBQUksS0FBSyxHQUFFLFlBQVk7QUFBQSxRQUNsQztBQUFBLFFBQ0EsZ0JBQWdCLEVBQUUsU0FBUztBQUFBLFFBQzNCLGVBQWU7QUFBQSxRQUNmLFdBQVc7QUFBQSxRQUNYLFlBQVk7QUFBQSxRQUNaLGlCQUFpQjtBQUFBLE1BQ25CO0FBQUEsSUFDRixPQUFPO0FBQ0wsWUFBTSxnQkFBZ0IsaUJBQWlCLE1BQU0sU0FBUyxPQUFPO0FBQzdELGNBQVE7QUFBQSxRQUNOLFlBQVcsb0JBQUksS0FBSyxHQUFFLFlBQVk7QUFBQSxRQUNsQztBQUFBLFFBQ0EsZ0JBQWdCLEVBQUUsU0FBUztBQUFBLFFBQzNCO0FBQUEsUUFDQSxXQUFXO0FBQUEsUUFDWCxZQUFZLE1BQU0sY0FBYyxzQkFBc0IsSUFBSTtBQUFBLFFBQzFELGlCQUFpQixnQkFBZ0IsZUFBZSxpQkFBaUIsRUFBRSxTQUFTLE9BQU8sQ0FBQyxJQUFJO0FBQUEsUUFDeEYsV0FBVyxNQUFNO0FBQUEsTUFDbkI7QUFBQSxJQUNGO0FBQUEsRUFDRixTQUFTLEdBQUc7QUFDVixZQUFRO0FBQUEsTUFDTixZQUFXLG9CQUFJLEtBQUssR0FBRSxZQUFZO0FBQUEsTUFDbEM7QUFBQSxNQUNBLGdCQUFnQixFQUFFLFNBQVM7QUFBQSxNQUMzQixlQUFlO0FBQUEsTUFDZixXQUFXO0FBQUEsTUFDWCxZQUFZO0FBQUEsTUFDWixpQkFBaUI7QUFBQSxNQUNqQixPQUFPLGFBQWEsUUFBUSxFQUFFLFVBQVUsT0FBTyxDQUFDO0FBQUEsSUFDbEQ7QUFBQSxFQUNGO0FBQ0EsUUFBTSxzQkFBc0IsQ0FBQztBQUM3QixRQUFNLGtCQUFrQixFQUFFLElBQUk7QUFDOUIsYUFBVyxLQUFLO0FBQ2xCO0FBRUEsZUFBc0IsMEJBQTBCLElBSTdDO0FBQ0QsUUFBTSxRQUFRLFdBQVcsV0FBVyxLQUFLLENBQUMsU0FBUyxLQUFLLFNBQVMsT0FBTyxFQUFFO0FBQzFFLE1BQUksQ0FBQyxNQUFPLE9BQU0sSUFBSSxNQUFNLGtCQUFrQixFQUFFLEVBQUU7QUFDbEQsTUFBSSxDQUFDLE1BQU0sU0FBUyxZQUFZO0FBQzlCLFVBQU0sSUFBSSxNQUFNLEdBQUcsTUFBTSxTQUFTLElBQUksb0NBQW9DO0FBQUEsRUFDNUU7QUFFQSxNQUFJO0FBQ0osTUFBSTtBQUNGLFdBQU8sb0JBQW9CLE1BQU0sU0FBUyxVQUFVO0FBQUEsRUFDdEQsUUFBUTtBQUNOLFVBQU0sSUFBSSxNQUFNLEdBQUcsTUFBTSxTQUFTLElBQUksK0JBQStCLE1BQU0sU0FBUyxVQUFVLEVBQUU7QUFBQSxFQUNsRztBQUVBLFFBQU0sRUFBRSxTQUFTLElBQUksTUFBTSx3QkFBd0I7QUFDbkQsUUFBTSxhQUFhLFNBQVMsUUFBUSxLQUFLLENBQUMsVUFBVTtBQUNsRCxRQUFJLE1BQU0sT0FBTyxHQUFJLFFBQU87QUFDNUIsUUFBSTtBQUNGLGFBQU8sb0JBQW9CLE1BQU0sSUFBSSxNQUFNO0FBQUEsSUFDN0MsUUFBUTtBQUNOLGFBQU8sTUFBTSxTQUFTO0FBQUEsSUFDeEI7QUFBQSxFQUNGLENBQUM7QUFDRCxNQUFJLENBQUMsWUFBWTtBQUNmLFVBQU0sSUFBSTtBQUFBLE1BQ1IsR0FBRyxNQUFNLFNBQVMsSUFBSTtBQUFBLElBQ3hCO0FBQUEsRUFDRjtBQUVBLHFDQUFtQyxVQUFVO0FBQzdDLG9DQUFrQyxVQUFVO0FBQzVDLFFBQU0sa0JBQWtCLFVBQVU7QUFDbEMsZUFBYSxxQkFBcUIsa0JBQWtCO0FBQ3BELFFBQU0sWUFBWSxXQUFXLFdBQVcsS0FBSyxDQUFDLFNBQVMsS0FBSyxTQUFTLE9BQU8sRUFBRSxLQUFLO0FBQ25GLFFBQU0sdUJBQXVCLFdBQVcsSUFBSTtBQUM1QyxTQUFPLEVBQUUsV0FBVyxJQUFJLFNBQVMsV0FBVyxTQUFTLFNBQVMsV0FBVyxXQUFXLGtCQUFrQjtBQUN4RztBQUVPLFNBQVMsa0JBQXdCO0FBQ3RDLFFBQU0sVUFBVTtBQUFBLElBQ2QsSUFBSSxLQUFLLElBQUk7QUFBQSxJQUNiLFFBQVEsV0FBVyxXQUFXLElBQUksQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFO0FBQUEsRUFDeEQ7QUFDQSxhQUFXLE1BQU0sNkJBQVksa0JBQWtCLEdBQUc7QUFDaEQsUUFBSTtBQUNGLFNBQUcsS0FBSywwQkFBMEIsT0FBTztBQUFBLElBQzNDLFNBQVMsR0FBRztBQUNWLFVBQUksUUFBUSwwQkFBMEIsQ0FBQztBQUFBLElBQ3pDO0FBQUEsRUFDRjtBQUNGO0FBRU8sU0FBUyxXQUFXLE9BQWU7QUFDeEMsU0FBTztBQUFBLElBQ0wsT0FBTyxJQUFJLE1BQWlCLElBQUksUUFBUSxJQUFJLEtBQUssS0FBSyxHQUFHLENBQUM7QUFBQSxJQUMxRCxNQUFNLElBQUksTUFBaUIsSUFBSSxRQUFRLElBQUksS0FBSyxLQUFLLEdBQUcsQ0FBQztBQUFBLElBQ3pELE1BQU0sSUFBSSxNQUFpQixJQUFJLFFBQVEsSUFBSSxLQUFLLEtBQUssR0FBRyxDQUFDO0FBQUEsSUFDekQsT0FBTyxJQUFJLE1BQWlCLElBQUksU0FBUyxJQUFJLEtBQUssS0FBSyxHQUFHLENBQUM7QUFBQSxFQUM3RDtBQUNGO0FBRU8sU0FBUyxZQUFZLFVBQW1DO0FBQzdELE1BQUksQ0FBQyxtQkFBbUIsVUFBVSxLQUFLLEVBQUcsUUFBTyxxQkFBcUIsU0FBUyxFQUFFO0FBQ2pGLFFBQU0sS0FBSyxTQUFTO0FBQ3BCLFFBQU0sS0FBSyxDQUFDLE1BQWMsc0JBQXNCLElBQUksQ0FBQztBQUNyRCxTQUFPO0FBQUEsSUFDTCxJQUFJLENBQUMsR0FBVyxNQUFvQztBQUNsRCxZQUFNLFVBQVUsQ0FBQyxPQUFnQixTQUFvQixFQUFFLEdBQUcsSUFBSTtBQUM5RCwrQkFBUSxHQUFHLEdBQUcsQ0FBQyxHQUFHLE9BQU87QUFDekIsYUFBTyxNQUFNLHlCQUFRLGVBQWUsR0FBRyxDQUFDLEdBQUcsT0FBZ0I7QUFBQSxJQUM3RDtBQUFBLElBQ0EsTUFBTSxDQUFDLE9BQWU7QUFDcEIsWUFBTSxJQUFJLE1BQU0sMERBQXFEO0FBQUEsSUFDdkU7QUFBQSxJQUNBLFFBQVEsQ0FBQyxPQUFlO0FBQ3RCLFlBQU0sSUFBSSxNQUFNLHlEQUFvRDtBQUFBLElBQ3RFO0FBQUEsSUFDQSxRQUFRLENBQUMsR0FBVyxZQUE2QztBQUMvRCwrQkFBUSxPQUFPLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBZ0IsU0FBb0IsUUFBUSxHQUFHLElBQUksQ0FBQztBQUFBLElBQzdFO0FBQUEsRUFDRjtBQUNGO0FBRU8sU0FBUyxXQUFXLFVBQWtDO0FBQzNELE1BQUksQ0FBQyxtQkFBbUIsVUFBVSxZQUFZLEVBQUcsUUFBTyxvQkFBb0IsU0FBUyxFQUFFO0FBQ3ZGLFFBQU0sS0FBSyxTQUFTO0FBQ3BCLFFBQU0sTUFBTSxtQkFBbUIsVUFBVyxFQUFFO0FBQzVDLFFBQU0sS0FBSyxRQUFRLGtCQUFrQjtBQUNyQyxTQUFPO0FBQUEsSUFDTCxTQUFTO0FBQUEsSUFDVCxNQUFNLENBQUMsTUFBYyxHQUFHLFNBQVMscUJBQXFCLFVBQVcsSUFBSSxDQUFDLEVBQUUsTUFBTSxNQUFNO0FBQUEsSUFDcEYsT0FBTyxDQUFDLEdBQVcsTUFBYyxHQUFHLFVBQVUscUJBQXFCLFVBQVcsSUFBSSxDQUFDLEVBQUUsTUFBTSxHQUFHLE1BQU07QUFBQSxJQUNwRyxRQUFRLE9BQU8sTUFBYztBQUMzQixVQUFJO0FBQ0YsY0FBTSxHQUFHLE9BQU8scUJBQXFCLFVBQVcsSUFBSSxDQUFDLEVBQUUsSUFBSTtBQUMzRCxlQUFPO0FBQUEsTUFDVCxRQUFRO0FBQ04sZUFBTztBQUFBLE1BQ1Q7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGO0FBRU8sU0FBUyxxQkFBdUM7QUFDckQsUUFBTSxpQkFBaUIsbUJBQW1CO0FBQzFDLFNBQU8sZUFBZTtBQUFBLElBQ3BCO0FBQUEsSUFDQTtBQUFBLElBQ0EsY0FBYyxnQkFBZ0IsZ0JBQWdCO0FBQUEsSUFDOUMsU0FBUztBQUFBLElBQ1QsbUJBQW1CO0FBQUEsSUFDbkIsS0FBSyxhQUFhO0FBQUEsRUFDcEIsQ0FBQztBQUNIO0FBRU8sU0FBUyw2QkFBdUQ7QUFDckUsUUFBTSxpQkFBaUIsbUJBQW1CO0FBQzFDLFNBQU8sdUJBQXVCO0FBQUEsSUFDNUI7QUFBQSxJQUNBO0FBQUEsSUFDQSxjQUFjLGdCQUFnQixnQkFBZ0I7QUFBQSxJQUM5QyxTQUFTO0FBQUEsSUFDVCxtQkFBbUI7QUFBQSxJQUNuQix1QkFBdUIsTUFBTSxhQUFhLGdCQUFnQjtBQUFBLElBQzFELEtBQUssYUFBYTtBQUFBLEVBQ3BCLENBQUM7QUFDSDtBQUVBLFNBQVMsZUFBZTtBQUN0QixTQUFPO0FBQUEsSUFDTCx1QkFBdUIsTUFBTSxpQkFBaUIsc0JBQXNCLENBQUM7QUFBQSxFQUN2RTtBQUNGO0FBRU8sU0FBUyxhQUFhLFNBQWlCLFlBQWtEO0FBQzlGLFFBQU0sUUFBUSxhQUNWLHNCQUFzQixTQUFTLFVBQVUsSUFDekMsVUFBVSxPQUFPO0FBQ3JCLFNBQU8sRUFBRSxJQUFJLE1BQU0sU0FBUyxJQUFJLEtBQUssTUFBTSxJQUFJO0FBQ2pEO0FBRU8sU0FBUyx3QkFBd0IsU0FBb0Q7QUFDMUYsUUFBTSxRQUFRLFdBQVcsV0FBVyxLQUFLLENBQUMsU0FBUyxLQUFLLFNBQVMsT0FBTyxPQUFPO0FBQy9FLE1BQUksQ0FBQyxNQUFPLFFBQU87QUFDbkIsU0FBTztBQUFBLElBQ0wsSUFBSSxNQUFNLFNBQVM7QUFBQSxJQUNuQixTQUFTLGVBQWUsTUFBTSxTQUFTLEVBQUU7QUFBQSxJQUN6QyxLQUFLLE1BQU07QUFBQSxJQUNYLFVBQVUsTUFBTTtBQUFBLEVBQ2xCO0FBQ0Y7QUFFTyxTQUFTLFVBQVUsU0FBa0M7QUFDMUQsUUFBTSxXQUFXLHNCQUFzQixPQUFPO0FBQzlDLFFBQU0sUUFBUSxXQUFXLFdBQVcsS0FBSyxDQUFDLFNBQVMsS0FBSyxTQUFTLE9BQU8sU0FBUyxFQUFFO0FBQ25GLE1BQUksQ0FBQyxNQUFPLE9BQU0sSUFBSSxNQUFNLGtCQUFrQixPQUFPLEVBQUU7QUFDdkQsU0FBTztBQUNUO0FBRU8sU0FBUyxzQkFBc0IsU0FBeUM7QUFDN0UscUJBQW1CLE9BQU87QUFDMUIsUUFBTSxXQUFXLHdCQUF3QixPQUFPO0FBQ2hELE1BQUksQ0FBQyxTQUFVLE9BQU0sSUFBSSxNQUFNLGtCQUFrQixPQUFPLEVBQUU7QUFDMUQsTUFBSSxDQUFDLFNBQVMsUUFBUyxPQUFNLElBQUksTUFBTSxzQkFBc0IsT0FBTyxFQUFFO0FBQ3RFLFNBQU87QUFDVDtBQUVPLFNBQVMsc0JBQ2QsU0FDQSxZQUNBLFNBQ2lCO0FBQ2pCLFFBQU0sV0FBVztBQUFBLElBQ2YsT0FBTyxZQUFZLFdBQVcsd0JBQXdCLE9BQU8sSUFBSTtBQUFBLElBQ2pFO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxFQUNGO0FBQ0EsUUFBTSxRQUFRLFdBQVcsV0FBVyxLQUFLLENBQUMsU0FBUyxLQUFLLFNBQVMsT0FBTyxTQUFTLEVBQUU7QUFDbkYsTUFBSSxDQUFDLE1BQU8sT0FBTSxJQUFJLE1BQU0sa0JBQWtCLE9BQU8sT0FBTyxDQUFDLEVBQUU7QUFDL0QsU0FBTztBQUNUO0FBb0JPLFNBQVMsY0FBYyxTQUF1QjtBQUNuRCxxQkFBbUIsT0FBTztBQUM1QjtBQUVPLFNBQVMsYUFBYSxPQUE4QztBQUN6RSxRQUFNLFVBQVUsZ0JBQWdCLE1BQU0sUUFBUTtBQUM5QyxNQUFJLENBQUMsZUFBZSxPQUFPLEVBQUcsUUFBTztBQUNyQyxRQUFNLE1BQU0sT0FBMkIsRUFBRSxJQUFJLE1BQU0sU0FBUyxJQUFJLEtBQUssTUFBTSxJQUFJO0FBQy9FLFFBQU0sT0FBTyxDQUFDLGVBQWdDLHdCQUF3QixNQUFNLFNBQVMsSUFBSSxVQUFVO0FBQ25HLFFBQU0sUUFBUSxDQUNaLFlBQ0EsT0FDaUM7QUFDakMsV0FBTyxVQUFVLFNBQVk7QUFDM0IsK0JBQXlCLE1BQU0sVUFBVSxVQUFVO0FBQ25ELGFBQU8sTUFBTSxHQUFHLEdBQUcsSUFBSTtBQUFBLElBQ3pCO0FBQUEsRUFDRjtBQUNBLFNBQU87QUFBQSxJQUNMLFNBQVM7QUFBQSxNQUNQLFNBQVMsUUFBUSxlQUFlLFlBQVksbUJBQW1CLElBQUksS0FBSyxlQUFlO0FBQUEsTUFDdkYsaUJBQWlCLFFBQVEsZUFBZSxZQUFZLDJCQUEyQixJQUFJLEtBQUssZUFBZTtBQUFBLElBQ3pHO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDUCxRQUFRLFFBQVEsZUFBZSxNQUFNLGlCQUFpQixpQkFBaUIsSUFBSSxLQUFLLGVBQWU7QUFBQSxNQUMvRixZQUFZLFFBQVEsZUFBZSxZQUFZLHlCQUF5QixJQUFJLEtBQUssZUFBZTtBQUFBLE1BQ2hHLE9BQU8sUUFBUSxlQUNYLE1BQU0saUJBQWlCLE9BQU8sYUFBcUIsaUJBQWlCLFFBQVEsQ0FBQyxJQUM3RSxLQUFLLGVBQWU7QUFBQSxNQUN4QixNQUFNLFFBQVEsZUFDVixNQUFNLGlCQUFpQixPQUFPLGFBQXFCLGdCQUFnQixRQUFRLENBQUMsSUFDNUUsS0FBSyxlQUFlO0FBQUEsSUFDMUI7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLFFBQVEsUUFBUSxhQUNaLE1BQU0sZUFBZSxDQUFDLFlBQW9DLGNBQWMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUN2RixLQUFLLGFBQWE7QUFBQSxJQUN4QjtBQUFBLElBQ0EsS0FBSztBQUFBLE1BQ0gsV0FBVyxRQUFRLFdBQVcsWUFBWSxhQUFhLElBQUksS0FBSyxXQUFXO0FBQUEsTUFDM0UsYUFBYSxRQUFRLFdBQVcsWUFBWSxlQUFlLElBQUksS0FBSyxXQUFXO0FBQUEsSUFDakY7QUFBQSxJQUNBLFFBQVE7QUFBQSxNQUNOLFlBQVksUUFBUSxlQUNoQixNQUFNLGlCQUFpQixPQUFPLFlBQXFDLGFBQWEsV0FBVyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQzFHLEtBQUssZUFBZTtBQUFBLE1BQ3hCLGFBQWEsUUFBUSxhQUNqQixNQUFNLGVBQWUsQ0FBQyxZQUFzQyxhQUFhLFlBQVksSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUNwRyxLQUFLLGFBQWE7QUFBQSxNQUN0QixZQUFZLFFBQVEsYUFDaEIsTUFBTSxlQUFlLENBQUMsWUFBcUMsYUFBYSxXQUFXLElBQUksR0FBRyxPQUFPLENBQUMsSUFDbEcsS0FBSyxhQUFhO0FBQUEsTUFDdEIsY0FBYyxRQUFRLGVBQ2xCLE1BQU0saUJBQWlCLE9BQU8sWUFBdUMsYUFBYSxhQUFhLElBQUksR0FBRyxPQUFPLENBQUMsSUFDOUcsS0FBSyxlQUFlO0FBQUEsSUFDMUI7QUFBQSxJQUNBLG1CQUFtQixRQUFRLGFBQ3ZCLE1BQU0sZUFBZSxzQkFBc0IsSUFDM0MsS0FBSyxhQUFhO0FBQUEsSUFDdEIsY0FBYyxRQUFRLGVBQWUsTUFBTSxpQkFBaUIsaUJBQWlCLElBQUksS0FBSyxlQUFlO0FBQUEsSUFDckcsVUFBVTtBQUFBLE1BQ1IsTUFBTSxRQUFRLGdCQUNWLFlBQVksMkJBQTJCLEVBQUUsYUFBYSxJQUN0RCxLQUFLLGdCQUFnQjtBQUFBLE1BQ3pCLFdBQVcsUUFBUSxnQkFDZixPQUFPLE9BQWUsMkJBQTJCLEVBQUUsaUJBQWlCLEVBQUUsSUFDdEUsS0FBSyxnQkFBZ0I7QUFBQSxJQUMzQjtBQUFBLEVBQ0Y7QUFDRjtBQUdPLElBQU0scUJBQW1EO0FBQUEsRUFDOUQsU0FBUyxDQUFDLFlBQW9CLElBQUksUUFBUSxPQUFPO0FBQUEsRUFDakQ7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQ0Y7OztBbkI1YkEsSUFBSSxRQUFRLElBQUkseUJBQXlCLEtBQUs7QUFDNUMsUUFBTSxPQUFPLFFBQVEsSUFBSSw2QkFBNkI7QUFDdEQsdUJBQUksWUFBWSxhQUFhLHlCQUF5QixJQUFJO0FBQzFELE1BQUksUUFBUSxvQ0FBb0MsSUFBSSxFQUFFO0FBQ3hEO0FBR0EsUUFBUSxHQUFHLHFCQUFxQixDQUFDLE1BQWlDO0FBQ2hFLE1BQUksU0FBUyxxQkFBcUIsRUFBRSxNQUFNLEVBQUUsTUFBTSxTQUFTLEVBQUUsU0FBUyxPQUFPLEVBQUUsTUFBTSxDQUFDO0FBQ3hGLENBQUM7QUFDRCxRQUFRLEdBQUcsc0JBQXNCLENBQUMsTUFBTTtBQUN0QyxNQUFJLFNBQVMsc0JBQXNCLEVBQUUsT0FBTyxPQUFPLENBQUMsRUFBRSxDQUFDO0FBQ3pELENBQUM7QUFFRCx5QkFBeUI7QUFRekIsU0FBUyxnQkFBZ0IsR0FBcUIsT0FBZSxPQUF5QixRQUFjO0FBQ2xHLFFBQU0sV0FBVyxTQUFTLGVBQVcsNkJBQVcsa0JBQWtCLElBQUkscUJBQXFCO0FBQzNGLFFBQU0sS0FBSyxTQUFTLFVBQVUseUJBQXlCO0FBQ3ZELE1BQUk7QUFDRixVQUFNLFdBQVcsMEJBQTBCLENBQUM7QUFDNUMsUUFBSSxhQUFhLHlCQUF5QjtBQUN4QyxZQUFNLE1BQU8sRUFNVjtBQUNILFVBQUksS0FBSyxHQUFHLEVBQUUsTUFBTSxTQUFTLFVBQVUsR0FBRyxDQUFDO0FBQzNDLFVBQUksUUFBUSxpREFBaUQsS0FBSyxLQUFLLFFBQVE7QUFDL0U7QUFBQSxJQUNGO0FBQ0EsUUFBSSxhQUFhLGVBQWU7QUFDOUIsWUFBTSxXQUFXLEVBQUUsWUFBWTtBQUMvQixVQUFJLENBQUMsU0FBUyxTQUFTLFFBQVEsR0FBRztBQUNoQyxVQUFFLFlBQVksQ0FBQyxHQUFHLFVBQVUsUUFBUSxDQUFDO0FBQUEsTUFDdkM7QUFDQSxVQUFJLFFBQVEsdUNBQXVDLEtBQUssS0FBSyxRQUFRO0FBQ3JFO0FBQUEsSUFDRjtBQUNBLFFBQUksU0FBUywyQkFBMkIsS0FBSyxpQ0FBaUM7QUFBQSxFQUNoRixTQUFTLEdBQUc7QUFDVixRQUFJLGFBQWEsU0FBUyxFQUFFLFFBQVEsU0FBUyxhQUFhLEdBQUc7QUFDM0QsVUFBSSxRQUFRLGlDQUFpQyxLQUFLLEtBQUssWUFBWTtBQUNuRTtBQUFBLElBQ0Y7QUFDQSxRQUFJLFNBQVMsMkJBQTJCLEtBQUssWUFBWSxDQUFDO0FBQUEsRUFDNUQ7QUFDRjtBQUVBLHFCQUFJLFVBQVUsRUFBRSxLQUFLLE1BQU07QUFDekIsTUFBSSxRQUFRLGlCQUFpQjtBQUM3QixNQUFJLCtCQUErQixHQUFHO0FBQ3BDLFFBQUksUUFBUSxzREFBc0Q7QUFDbEU7QUFBQSxFQUNGO0FBQ0Esa0JBQWdCLHlCQUFRLGdCQUFnQixrQkFBa0IsTUFBTTtBQUNoRSw0QkFBMEI7QUFBQSxJQUN4QixtQkFBbUI7QUFBQSxJQUNuQjtBQUFBLEVBQ0YsQ0FBQztBQUNILENBQUM7QUFFRCxxQkFBSSxHQUFHLG1CQUFtQixDQUFDLE1BQU07QUFDL0IsTUFBSSwrQkFBK0IsRUFBRztBQUN0QyxNQUFJLE1BQU0seUJBQVEsZUFBZ0I7QUFDbEMsa0JBQWdCLEdBQUcsbUJBQW1CLE9BQU87QUFDL0MsQ0FBQztBQUlELHFCQUFJLEdBQUcsd0JBQXdCLENBQUMsSUFBSSxPQUFPO0FBQ3pDLE1BQUk7QUFDRixVQUFNLEtBQU0sR0FDVCx3QkFBd0I7QUFDM0IsUUFBSSxRQUFRLHdCQUF3QjtBQUFBLE1BQ2xDLElBQUksR0FBRztBQUFBLE1BQ1AsTUFBTSxHQUFHLFFBQVE7QUFBQSxNQUNqQixrQkFBa0IsR0FBRyxZQUFZLHlCQUFRO0FBQUEsTUFDekMsU0FBUyxJQUFJO0FBQUEsTUFDYixrQkFBa0IsSUFBSTtBQUFBLElBQ3hCLENBQUM7QUFDRCxPQUFHLEdBQUcsaUJBQWlCLENBQUMsS0FBSyxHQUFHLFFBQVE7QUFDdEMsVUFBSSxTQUFTLE1BQU0sR0FBRyxFQUFFLHVCQUF1QixDQUFDLElBQUksT0FBTyxLQUFLLFNBQVMsR0FBRyxDQUFDO0FBQUEsSUFDL0UsQ0FBQztBQUFBLEVBQ0gsU0FBUyxHQUFHO0FBQ1YsUUFBSSxTQUFTLHdDQUF3QyxPQUFRLEdBQWEsU0FBUyxDQUFDLENBQUM7QUFBQSxFQUN2RjtBQUNGLENBQUM7QUFFRCxJQUFJLFFBQVEsb0NBQW9DLHFCQUFJLFFBQVEsQ0FBQztBQUM3RCxJQUFJLCtCQUErQixHQUFHO0FBQ3BDLE1BQUksUUFBUSxpREFBaUQ7QUFDL0Q7QUFFQSxJQUFNLGlCQUFpQixJQUFJLG9CQUFvQjtBQUFBLEVBQzdDO0FBQUEsRUFDQSxVQUFVLCtCQUErQjtBQUFBLElBQ3ZDLG1CQUFtQixNQUFNO0FBQ3ZCLFVBQUksZ0JBQStCO0FBQ25DLFVBQUksVUFBeUI7QUFDN0IsVUFBSTtBQUNGLGNBQU0sT0FBTyxtQkFBbUI7QUFDaEMsd0JBQWdCLEtBQUs7QUFDckIsa0JBQVUsS0FBSztBQUFBLE1BQ2pCLFFBQVE7QUFBQSxNQUFDO0FBQ1QsVUFBSSxDQUFDLGVBQWU7QUFDbEIsY0FBTSxjQUFlLFFBQXdEO0FBQzdFLFlBQUksT0FBTyxnQkFBZ0IsU0FBVSxpQkFBZ0I7QUFBQSxNQUN2RDtBQUNBLFVBQUksQ0FBQyxTQUFTO0FBQ1osWUFBSTtBQUNGLG9CQUFVLHFCQUFJLFdBQVc7QUFBQSxRQUMzQixRQUFRO0FBQ04sb0JBQVU7QUFBQSxRQUNaO0FBQUEsTUFDRjtBQUNBLGFBQU8sOEJBQThCO0FBQUEsUUFDbkMsVUFBVSxRQUFRO0FBQUEsUUFDbEI7QUFBQSxRQUNBO0FBQUEsTUFDRixDQUFDO0FBQUEsSUFDSDtBQUFBLEVBQ0YsQ0FBQztBQUFBLEVBQ0Q7QUFDRixDQUFDO0FBQ0QsdUJBQXVCLGNBQWM7QUFHckMsa0JBQWtCO0FBRWxCLElBQUkseUJBQXlCO0FBQzdCLHFCQUFJLEdBQUcsYUFBYSxDQUFDLFVBQVU7QUFDN0Isb0JBQWtCO0FBQ2xCLGVBQWEsV0FBVztBQUN4QixxQkFBbUI7QUFFbkIsYUFBVyxLQUFLLFdBQVcsV0FBVyxPQUFPLEdBQUc7QUFDOUMsUUFBSTtBQUNGLFFBQUUsUUFBUSxNQUFNO0FBQUEsSUFDbEIsUUFBUTtBQUFBLElBQUM7QUFBQSxFQUNYO0FBQ0EsTUFBSSx1QkFBd0I7QUFDNUIsTUFBSSxDQUFDLGVBQWUsZ0JBQWdCLEVBQUc7QUFDdkMsUUFBTSxlQUFlO0FBQ3JCLDJCQUF5QjtBQUN6QixRQUFNLFdBQVcsV0FBVyxNQUFNO0FBQ2hDLHlCQUFJLEtBQUs7QUFBQSxFQUNYLEdBQUcsR0FBSTtBQUNQLE9BQUssZUFBZSxZQUFZLEVBQUUsV0FBVyxJQUFLLENBQUMsRUFBRSxRQUFRLE1BQU07QUFDakUsaUJBQWEsUUFBUTtBQUNyQix5QkFBSSxLQUFLO0FBQUEsRUFDWCxDQUFDO0FBQ0gsQ0FBQztBQUVELFNBQVMsaUJBQWlCLFNBQWlCLFVBQTZDO0FBQ3RGLDJCQUFRLE9BQU8sU0FBUyxDQUFDLFVBQVUsU0FBUztBQUMxQyw4QkFBMEIsU0FBUyxNQUFNLFFBQVEsdUJBQXVCO0FBQ3hFLFdBQU8sU0FBUyxPQUFPLEdBQUcsSUFBSTtBQUFBLEVBQ2hDLENBQUM7QUFDSDtBQUVBLHlCQUFRLEdBQUcsNEJBQTRCLENBQUMsVUFBVTtBQUNoRCxRQUFNLGNBQWMsc0JBQXNCLE1BQU0sUUFBUSx1QkFBdUI7QUFDakYsQ0FBQztBQUdELHlCQUFRLE9BQU8sdUJBQXVCLE9BQU8sSUFBSSxTQUF5QztBQUN4RixRQUFNLFFBQVEsU0FBUyxRQUFTLFNBQVMsUUFBUSxPQUFPLFNBQVMsWUFBWSxLQUFLLFVBQVU7QUFDNUYsUUFBTSxRQUFRLElBQUksV0FBVyxXQUFXLElBQUksQ0FBQyxNQUFNLHVCQUF1QixHQUFHLEtBQUssQ0FBQyxDQUFDO0FBQ3BGLFNBQU8scUJBQXFCO0FBQzlCLENBQUM7QUFFRCx5QkFBUSxPQUFPLDZCQUE2QixDQUFDLElBQUksT0FBZSxlQUFlLEVBQUUsQ0FBQztBQUNsRix5QkFBUSxPQUFPLDZCQUE2QixDQUFDLElBQUksSUFBWSxZQUFxQjtBQUNoRixTQUFPLHlCQUF5QixJQUFJLFNBQVMsa0JBQWtCO0FBQ2pFLENBQUM7QUFFRCx5QkFBUSxPQUFPLHNCQUFzQixNQUFNO0FBQ3pDLFFBQU0sSUFBSSxVQUFVO0FBQ3BCLFFBQU0saUJBQWlCLG1CQUFtQjtBQUMxQyxRQUFNLGFBQWEsZ0JBQWdCLGNBQWMsbUJBQW1CO0FBQ3BFLFNBQU87QUFBQSxJQUNMLFNBQVM7QUFBQSxJQUNULFlBQVkseUJBQXlCLEVBQUUsZUFBZSxVQUFVO0FBQUEsSUFDaEUsVUFBVSxFQUFFLGVBQWUsYUFBYTtBQUFBLElBQ3hDLGVBQWUsRUFBRSxlQUFlLGlCQUFpQjtBQUFBLElBQ2pELFlBQVksRUFBRSxlQUFlLGNBQWM7QUFBQSxJQUMzQyxXQUFXLEVBQUUsZUFBZSxhQUFhO0FBQUEsSUFDekMsYUFBYSxFQUFFLGVBQWUsZUFBZTtBQUFBLElBQzdDLFlBQVksb0JBQW9CO0FBQUEsSUFDaEMsb0JBQW9CLDJCQUEyQixVQUFVO0FBQUEsRUFDM0Q7QUFDRixDQUFDO0FBRUQsaUJBQWlCLDJCQUEyQixDQUFDLElBQUksWUFBcUI7QUFDcEUsNkJBQTJCLENBQUMsQ0FBQyxPQUFPO0FBQ3BDLFNBQU8sRUFBRSxZQUFZLGlDQUFpQyxFQUFFO0FBQzFELENBQUM7QUFFRCxpQkFBaUIsNkJBQTZCLENBQUMsSUFBSSxXQUk3QztBQUNKLCtCQUE2Qix3QkFBd0IsVUFBVSxDQUFDLENBQUMsQ0FBQztBQUNsRSxRQUFNLElBQUksVUFBVTtBQUNwQixTQUFPO0FBQUEsSUFDTCxlQUFlLEVBQUUsZUFBZSxpQkFBaUI7QUFBQSxJQUNqRCxZQUFZLEVBQUUsZUFBZSxjQUFjO0FBQUEsSUFDM0MsV0FBVyxFQUFFLGVBQWUsYUFBYTtBQUFBLEVBQzNDO0FBQ0YsQ0FBQztBQUVELHlCQUFRLE9BQU8sZ0NBQWdDLE9BQU8sSUFBSSxVQUFvQjtBQUM1RSxTQUFPLCtCQUErQixVQUFVLElBQUk7QUFDdEQsQ0FBQztBQUVELGlCQUFpQiw4QkFBOEIsWUFBWTtBQUN6RCxRQUFNLGFBQWEsbUJBQW1CLEdBQUcsY0FBYyxtQkFBbUI7QUFDMUUsTUFBSSxDQUFDLFlBQVk7QUFDZixVQUFNLElBQUksTUFBTSwyRUFBMkU7QUFBQSxFQUM3RjtBQUNBLFFBQU0sVUFBTSx5QkFBSyxZQUFZLFlBQVksYUFBYSxRQUFRLFFBQVE7QUFDdEUsTUFBSSxLQUFDLDZCQUFXLEdBQUcsR0FBRztBQUNwQixVQUFNLElBQUksTUFBTSwyRUFBMkU7QUFBQSxFQUM3RjtBQUNBLFFBQU0sVUFBVSxzQkFBc0IsVUFBVTtBQUNoRCxvQkFBa0IsS0FBSyxDQUFDLFVBQVUsV0FBVyxDQUFDO0FBQzlDLFNBQU87QUFDVCxDQUFDO0FBRUQseUJBQVEsT0FBTyw4QkFBOEIsTUFBTSxpQkFBaUIsUUFBUyxDQUFDO0FBRTlFLHlCQUFRLE9BQU8sMkJBQTJCLFlBQVk7QUFDcEQsUUFBTSxRQUFRLE1BQU0sd0JBQXdCO0FBQzVDLFFBQU0sV0FBVyxNQUFNO0FBQ3ZCLFFBQU0sWUFBWSxJQUFJLElBQUksV0FBVyxXQUFXLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxTQUFTLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDOUUsUUFBTSxVQUFVLG9CQUFvQixTQUFTLFNBQVMsNkJBQVM7QUFDL0QsU0FBTztBQUFBLElBQ0wsR0FBRztBQUFBLElBQ0gsV0FBVztBQUFBLElBQ1gsV0FBVyxNQUFNO0FBQUEsSUFDakIsU0FBUyxRQUFRLElBQUksQ0FBQyxVQUFVO0FBQzlCLFlBQU0sUUFBUSxVQUFVLElBQUksTUFBTSxFQUFFO0FBQ3BDLFlBQU1DLFlBQVcsZ0NBQWdDLEtBQUs7QUFDdEQsWUFBTSxVQUFVLCtCQUErQixLQUFLO0FBQ3BELGFBQU87QUFBQSxRQUNMLEdBQUc7QUFBQSxRQUNILFVBQUFBO0FBQUEsUUFDQTtBQUFBLFFBQ0EsV0FBVyxRQUNQO0FBQUEsVUFDRSxTQUFTLE1BQU0sU0FBUztBQUFBLFVBQ3hCLFNBQVMsZUFBZSxNQUFNLFNBQVMsRUFBRTtBQUFBLFFBQzNDLElBQ0E7QUFBQSxNQUNOO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUNGLENBQUM7QUFFRCxpQkFBaUIsK0JBQStCLE9BQU8sSUFBSSxPQUFlO0FBQ3hFLFFBQU0sRUFBRSxTQUFTLElBQUksTUFBTSx3QkFBd0I7QUFDbkQsUUFBTSxRQUFRLFNBQVMsUUFBUSxLQUFLLENBQUMsY0FBYyxVQUFVLE9BQU8sRUFBRTtBQUN0RSxNQUFJLENBQUMsTUFBTyxPQUFNLElBQUksTUFBTSxnQ0FBZ0MsRUFBRSxFQUFFO0FBQ2hFLHFDQUFtQyxLQUFLO0FBQ3hDLG9DQUFrQyxLQUFLO0FBQ3ZDLFFBQU0sa0JBQWtCLEtBQUs7QUFDN0IsZUFBYSxpQkFBaUIsa0JBQWtCO0FBQ2hELFNBQU8sRUFBRSxXQUFXLE1BQU0sR0FBRztBQUMvQixDQUFDO0FBRUQsaUJBQWlCLGdDQUFnQyxPQUFPLElBQUksT0FBZTtBQUN6RSxTQUFPLDBCQUEwQixFQUFFO0FBQ3JDLENBQUM7QUFFRCxpQkFBaUIsMENBQTBDLE9BQU8sSUFBSSxjQUFzQjtBQUMxRixTQUFPLDRCQUE0QixTQUFTO0FBQzlDLENBQUM7QUFLRCx5QkFBUSxPQUFPLDZCQUE2QixDQUFDLElBQUksY0FBc0I7QUFDckUsUUFBTSxlQUFXLDRCQUFRLFNBQVM7QUFDbEMsTUFBSSxDQUFDLGFBQWEsWUFBWSxRQUFRLEdBQUc7QUFDdkMsVUFBTSxJQUFJLE1BQU0seUJBQXlCO0FBQUEsRUFDM0M7QUFDQSxTQUFPLFFBQVEsU0FBUyxFQUFFLGFBQWEsVUFBVSxNQUFNO0FBQ3pELENBQUM7QUFXRCxJQUFNLGtCQUFrQixPQUFPO0FBQy9CLElBQU0sY0FBc0M7QUFBQSxFQUMxQyxRQUFRO0FBQUEsRUFDUixRQUFRO0FBQUEsRUFDUixTQUFTO0FBQUEsRUFDVCxRQUFRO0FBQUEsRUFDUixTQUFTO0FBQUEsRUFDVCxRQUFRO0FBQUEsRUFDUixRQUFRO0FBQ1Y7QUFDQSx5QkFBUTtBQUFBLEVBQ047QUFBQSxFQUNBLENBQUMsSUFBSSxVQUFrQixZQUFvQjtBQUN6QyxVQUFNLEtBQUssUUFBUSxTQUFTO0FBQzVCLFVBQU0sVUFBTSw0QkFBUSxRQUFRO0FBQzVCLFFBQUksQ0FBQyxhQUFhLFlBQVksR0FBRyxHQUFHO0FBQ2xDLFlBQU0sSUFBSSxNQUFNLDZCQUE2QjtBQUFBLElBQy9DO0FBQ0EsVUFBTSxXQUFPLDRCQUFRLEtBQUssT0FBTztBQUNqQyxRQUFJLENBQUMsYUFBYSxLQUFLLElBQUksS0FBSyxTQUFTLEtBQUs7QUFDNUMsWUFBTSxJQUFJLE1BQU0sZ0JBQWdCO0FBQUEsSUFDbEM7QUFDQSxVQUFNQyxRQUFPLEdBQUcsU0FBUyxJQUFJO0FBQzdCLFFBQUlBLE1BQUssT0FBTyxpQkFBaUI7QUFDL0IsWUFBTSxJQUFJLE1BQU0sb0JBQW9CQSxNQUFLLElBQUksTUFBTSxlQUFlLEdBQUc7QUFBQSxJQUN2RTtBQUNBLFVBQU0sTUFBTSxLQUFLLE1BQU0sS0FBSyxZQUFZLEdBQUcsQ0FBQyxFQUFFLFlBQVk7QUFDMUQsVUFBTSxPQUFPLFlBQVksR0FBRyxLQUFLO0FBQ2pDLFVBQU0sTUFBTSxHQUFHLGFBQWEsSUFBSTtBQUNoQyxXQUFPLFFBQVEsSUFBSSxXQUFXLElBQUksU0FBUyxRQUFRLENBQUM7QUFBQSxFQUN0RDtBQUNGO0FBR0EseUJBQVEsR0FBRyx1QkFBdUIsQ0FBQyxJQUFJLE9BQWtDLFFBQWdCO0FBQ3ZGLFFBQU0sTUFBTSxVQUFVLFdBQVcsVUFBVSxTQUFTLFFBQVE7QUFDNUQsTUFBSTtBQUNGLHdCQUFnQix5QkFBSyxTQUFTLGFBQWEsR0FBRyxLQUFJLG9CQUFJLEtBQUssR0FBRSxZQUFZLENBQUMsTUFBTSxHQUFHLEtBQUssR0FBRztBQUFBLENBQUk7QUFBQSxFQUNqRyxRQUFRO0FBQUEsRUFBQztBQUNYLENBQUM7QUFLRCxpQkFBaUIsb0JBQW9CLENBQUMsSUFBSSxJQUFZLElBQVksR0FBVyxNQUFlO0FBQzFGLFFBQU0sUUFBUSxzQkFBc0IsSUFBSSxZQUFZO0FBQ3BELFFBQU0sTUFBTSxtQkFBbUIsVUFBVyxNQUFNLFNBQVMsRUFBRTtBQUMzRCxRQUFNLEtBQUssUUFBUSxTQUFTO0FBQzVCLE1BQUksT0FBTyxVQUFXLFFBQU87QUFDN0IsUUFBTSxFQUFFLEtBQUssSUFBSSxxQkFBcUIsVUFBVyxNQUFNLFNBQVMsSUFBSSxDQUFDO0FBQ3JFLFVBQVEsSUFBSTtBQUFBLElBQ1YsS0FBSztBQUFRLGFBQU8sR0FBRyxhQUFhLE1BQU0sTUFBTTtBQUFBLElBQ2hELEtBQUs7QUFBUyxhQUFPLEdBQUcsY0FBYyxNQUFNLEtBQUssSUFBSSxNQUFNO0FBQUEsSUFDM0QsS0FBSztBQUFVLGFBQU8sR0FBRyxXQUFXLElBQUk7QUFBQSxJQUN4QztBQUFTLFlBQU0sSUFBSSxNQUFNLGVBQWUsRUFBRSxFQUFFO0FBQUEsRUFDOUM7QUFDRixDQUFDO0FBRUQseUJBQVEsT0FBTyxzQkFBc0IsT0FBTztBQUFBLEVBQzFDO0FBQUEsRUFDQTtBQUFBLEVBQ0EsV0FBVztBQUFBLEVBQ1gsUUFBUTtBQUNWLEVBQUU7QUFFRix5QkFBUSxPQUFPLDhCQUE4QixDQUFDLElBQUksWUFBb0I7QUFDcEUsd0JBQXNCLFNBQVMsZUFBZTtBQUM5QyxTQUFPLG1CQUFtQjtBQUM1QixDQUFDO0FBQ0QseUJBQVEsT0FBTyxzQ0FBc0MsQ0FBQyxJQUFJLFlBQW9CO0FBQzVFLHdCQUFzQixTQUFTLGVBQWU7QUFDOUMsU0FBTywyQkFBMkI7QUFDcEMsQ0FBQztBQUNELHlCQUFRLE9BQU8sNEJBQTRCLENBQUMsSUFBSSxZQUFvQjtBQUNsRSx3QkFBc0IsU0FBUyxXQUFXO0FBQzFDLFNBQU8sYUFBYTtBQUN0QixDQUFDO0FBQ0QseUJBQVEsT0FBTyw2QkFBNkIsQ0FBQyxJQUFJLFlBQW9CO0FBQ25FLHdCQUFzQixTQUFTLFdBQVc7QUFDMUMsU0FBTyxlQUFlO0FBQ3hCLENBQUM7QUFDRCxpQkFBaUIsK0JBQStCLENBQUMsSUFBSSxTQUFpQixTQUFtQztBQUN2Ryx3QkFBc0IsU0FBUyxlQUFlO0FBQzlDLFNBQU8sa0JBQWtCLElBQUk7QUFDL0IsQ0FBQztBQUNELGlCQUFpQixnQ0FBZ0MsQ0FBQyxJQUFJLFlBQW9CO0FBQ3hFLHdCQUFzQixTQUFTLGVBQWU7QUFDOUMsU0FBTyx5QkFBeUI7QUFDbEMsQ0FBQztBQUNELGlCQUFpQiw4QkFBOEIsQ0FBQyxJQUFJLFNBQWlCLGFBQXFCO0FBQ3hGLHdCQUFzQixTQUFTLGVBQWU7QUFDOUMsU0FBTyxpQkFBaUIsUUFBUTtBQUNsQyxDQUFDO0FBQ0QsaUJBQWlCLDZCQUE2QixDQUFDLElBQUksU0FBaUIsYUFBcUI7QUFDdkYsd0JBQXNCLFNBQVMsZUFBZTtBQUM5QyxTQUFPLGdCQUFnQixRQUFRO0FBQ2pDLENBQUM7QUFDRDtBQUFBLEVBQWlCO0FBQUEsRUFDZixPQUFPLElBQUksU0FBaUIsWUFBb0M7QUFDOUQsVUFBTSxRQUFRLHNCQUFzQixTQUFTLGFBQWE7QUFDMUQsVUFBTSxNQUFNLE1BQU0sY0FBYyxFQUFFLElBQUksTUFBTSxTQUFTLElBQUksS0FBSyxNQUFNLElBQUksR0FBRyxPQUFPO0FBQ2xGLFdBQU87QUFBQSxNQUNMLElBQUksSUFBSTtBQUFBLE1BQ1IsZUFBZSxJQUFJO0FBQUEsTUFDbkIsZ0JBQWdCLElBQUk7QUFBQSxJQUN0QjtBQUFBLEVBQ0Y7QUFDRjtBQUNBO0FBQUEsRUFBaUI7QUFBQSxFQUNmLENBQUMsSUFBSSxTQUFpQixRQUFnQixRQUFnQixLQUFlLFNBQW1CO0FBQ3RGLFVBQU0sUUFBUSxzQkFBc0IsU0FBUyxhQUFhO0FBQzFELFdBQU8sWUFBWSxNQUFNLFNBQVMsSUFBSSxRQUFRLFFBQVEsS0FBSyxJQUFJO0FBQUEsRUFDakU7QUFDRjtBQUNBLHlCQUFRLE9BQU8sb0NBQW9DLENBQUMsSUFBSSxZQUFvQjtBQUMxRSxnQkFBYyxPQUFPO0FBQ3JCLDBCQUF3QixPQUFPO0FBQ2pDLENBQUM7QUFDRDtBQUFBLEVBQWlCO0FBQUEsRUFDZixDQUFDLElBQUksU0FBaUIsWUFBcUM7QUFDekQsVUFBTSxRQUFRLHNCQUFzQixTQUFTLGVBQWU7QUFDNUQsVUFBTSxNQUFNLGFBQWEsV0FBVyxhQUFhLE1BQU0sU0FBUyxJQUFJLGVBQWUsR0FBRyxPQUFPO0FBQzdGLFdBQU8sRUFBRSxJQUFJLElBQUksSUFBSSxNQUFNLElBQUksS0FBSztBQUFBLEVBQ3RDO0FBQ0Y7QUFDQTtBQUFBLEVBQWlCO0FBQUEsRUFDZixDQUFDLElBQUksU0FBaUIsVUFBa0IsUUFBZ0IsU0FBbUIsY0FBdUI7QUFDaEcsVUFBTSxRQUFRLHNCQUFzQixTQUFTLGVBQWU7QUFDNUQsV0FBTyxhQUFhLGNBQWMsTUFBTSxTQUFTLElBQUksVUFBVSxRQUFRLFNBQVMsU0FBUztBQUFBLEVBQzNGO0FBQ0Y7QUFDQSxpQkFBaUIsaUNBQWlDLENBQUMsSUFBSSxTQUFpQixhQUFxQjtBQUMzRixRQUFNLFFBQVEsc0JBQXNCLFNBQVMsZUFBZTtBQUM1RCxTQUFPLGFBQWEsY0FBYyxNQUFNLFNBQVMsSUFBSSxRQUFRO0FBQy9ELENBQUM7QUFDRCx5QkFBUSxPQUFPLGdDQUFnQyxDQUFDLElBQUksWUFBb0I7QUFDdEUsZ0JBQWMsT0FBTztBQUNyQixlQUFhLGFBQWEsT0FBTztBQUNuQyxDQUFDO0FBQ0Q7QUFBQSxFQUFpQjtBQUFBLEVBQ2YsT0FBTyxJQUFJLFNBQWlCLFlBQXNDO0FBQ2hFLFVBQU0sUUFBUSxzQkFBc0IsU0FBUyxhQUFhO0FBQzFELFVBQU0sTUFBTSxNQUFNLGFBQWEsWUFBWSxhQUFhLE1BQU0sU0FBUyxJQUFJLGFBQWEsR0FBRyxPQUFPO0FBQ2xHLFdBQU8sRUFBRSxJQUFJLElBQUksSUFBSSxVQUFVLElBQUksU0FBUztBQUFBLEVBQzlDO0FBQ0Y7QUFDQTtBQUFBLEVBQWlCO0FBQUEsRUFDZixPQUFPLElBQUksU0FBaUIsWUFBcUM7QUFDL0QsVUFBTSxRQUFRLHNCQUFzQixTQUFTLGFBQWE7QUFDMUQsVUFBTSxNQUFNLE1BQU0sYUFBYSxXQUFXLGFBQWEsTUFBTSxTQUFTLElBQUksYUFBYSxHQUFHLE9BQU87QUFDakcsV0FBTyxFQUFFLElBQUksSUFBSSxHQUFHO0FBQUEsRUFDdEI7QUFDRjtBQUNBO0FBQUEsRUFBaUI7QUFBQSxFQUNmLE9BQU8sSUFBSSxTQUFpQixNQUF3QixZQUFvQixRQUFnQixRQUFrQjtBQUN4RyxVQUFNLFFBQVEsc0JBQXNCLFNBQVMsYUFBYTtBQUMxRCxXQUFPLGFBQWEsYUFBYSxNQUFNLFNBQVMsSUFBSSxNQUFNLFlBQVksUUFBUSxHQUFHO0FBQUEsRUFDbkY7QUFDRjtBQUNBO0FBQUEsRUFBaUI7QUFBQSxFQUNmLENBQUMsSUFBSSxTQUFpQixZQUF1QztBQUMzRCxVQUFNLFFBQVEsc0JBQXNCLFNBQVMsZUFBZTtBQUM1RCxVQUFNLE1BQU0sYUFBYSxhQUFhLGFBQWEsTUFBTSxTQUFTLElBQUksZUFBZSxHQUFHLE9BQU87QUFDL0YsV0FBTyxFQUFFLElBQUksSUFBSSxJQUFJLEtBQUssSUFBSSxJQUFJO0FBQUEsRUFDcEM7QUFDRjtBQUNBO0FBQUEsRUFBaUI7QUFBQSxFQUNmLENBQUMsSUFBSSxTQUFpQixVQUFrQixRQUFnQixTQUFtQixjQUF1QjtBQUNoRyxVQUFNLFFBQVEsc0JBQXNCLFNBQVMsZUFBZTtBQUM1RCxXQUFPLGFBQWEsV0FBVyxNQUFNLFNBQVMsSUFBSSxVQUFVLFFBQVEsU0FBUyxTQUFTO0FBQUEsRUFDeEY7QUFDRjtBQUNBLGlCQUFpQiwrQkFBK0IsQ0FBQyxJQUFJLFNBQWlCLFVBQW9CO0FBQ3hGLHdCQUFzQixTQUFTLGdCQUFnQjtBQUMvQyxNQUFJLFVBQVUsT0FBVyxPQUFNLElBQUksTUFBTSxvQkFBb0I7QUFDN0QsU0FBTyxlQUFlLGFBQWE7QUFDckMsQ0FBQztBQUNELGlCQUFpQixpQ0FBaUMsQ0FBQyxJQUFJLFNBQWlCLFdBQW1CLFVBQW9CO0FBQzdHLHdCQUFzQixTQUFTLGdCQUFnQjtBQUMvQyxNQUFJLE9BQU8sY0FBYyxTQUFVLE9BQU0sSUFBSSxNQUFNLG9CQUFvQjtBQUN2RSxrQkFBZ0IsU0FBUztBQUN6QixNQUFJLFVBQVUsT0FBVyxPQUFNLElBQUksTUFBTSxvQkFBb0I7QUFDN0QsU0FBTyxlQUFlLGlCQUFpQixTQUFTO0FBQ2xELENBQUM7QUFFRCxpQkFBaUIsa0JBQWtCLENBQUMsSUFBSSxNQUFjO0FBQ3BELHlCQUFNLFNBQVMsQ0FBQyxFQUFFLE1BQU0sTUFBTTtBQUFBLEVBQUMsQ0FBQztBQUNsQyxDQUFDO0FBRUQseUJBQVEsT0FBTyx5QkFBeUIsQ0FBQyxJQUFJLFFBQWdCO0FBQzNELFFBQU0sU0FBUyxJQUFJLElBQUksR0FBRztBQUMxQixNQUFJLE9BQU8sYUFBYSxZQUFZLE9BQU8sYUFBYSxjQUFjO0FBQ3BFLFVBQU0sSUFBSSxNQUFNLHlEQUF5RDtBQUFBLEVBQzNFO0FBQ0EseUJBQU0sYUFBYSxPQUFPLFNBQVMsQ0FBQyxFQUFFLE1BQU0sTUFBTTtBQUFBLEVBQUMsQ0FBQztBQUN0RCxDQUFDO0FBRUQsaUJBQWlCLHFCQUFxQixDQUFDLElBQUksU0FBaUI7QUFDMUQsNkJBQVUsVUFBVSxPQUFPLElBQUksQ0FBQztBQUNoQyxTQUFPO0FBQ1QsQ0FBQztBQUlELHlCQUFRLE9BQU8seUJBQXlCLE1BQU07QUFDNUMsZUFBYSxVQUFVLGtCQUFrQjtBQUN6QyxTQUFPLEVBQUUsSUFBSSxLQUFLLElBQUksR0FBRyxPQUFPLFdBQVcsV0FBVyxPQUFPO0FBQy9ELENBQUM7QUFPRCxJQUFNLHFCQUFxQjtBQUMzQixJQUFJLGNBQXFDO0FBQ3pDLFNBQVMsZUFBZSxRQUFzQjtBQUM1QyxNQUFJLFlBQWEsY0FBYSxXQUFXO0FBQ3pDLGdCQUFjLFdBQVcsTUFBTTtBQUM3QixrQkFBYztBQUNkLGlCQUFhLFFBQVEsa0JBQWtCO0FBQUEsRUFDekMsR0FBRyxrQkFBa0I7QUFDdkI7QUFFQSxJQUFJO0FBQ0YsUUFBTSxVQUFVLFlBQVMsTUFBTSxZQUFZO0FBQUEsSUFDekMsZUFBZTtBQUFBO0FBQUE7QUFBQSxJQUdmLGtCQUFrQixFQUFFLG9CQUFvQixLQUFLLGNBQWMsR0FBRztBQUFBO0FBQUEsSUFFOUQsU0FBUyxDQUFDLE1BQU0sRUFBRSxTQUFTLEdBQUcsVUFBVSxHQUFHLEtBQUssbUJBQW1CLEtBQUssQ0FBQztBQUFBLEVBQzNFLENBQUM7QUFDRCxVQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sU0FBUyxlQUFlLEdBQUcsS0FBSyxJQUFJLElBQUksRUFBRSxDQUFDO0FBQ3JFLFVBQVEsR0FBRyxTQUFTLENBQUMsTUFBTSxJQUFJLFFBQVEsa0JBQWtCLENBQUMsQ0FBQztBQUMzRCxNQUFJLFFBQVEsWUFBWSxVQUFVO0FBQ2xDLHVCQUFJLEdBQUcsYUFBYSxNQUFNLFFBQVEsTUFBTSxFQUFFLE1BQU0sTUFBTTtBQUFBLEVBQUMsQ0FBQyxDQUFDO0FBQzNELFNBQVMsR0FBRztBQUNWLE1BQUksU0FBUyw0QkFBNEIsQ0FBQztBQUM1QzsiLAogICJuYW1lcyI6IFsiaW1wb3J0X2VsZWN0cm9uIiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX3BhdGgiLCAiaW1wb3J0X2ZzIiwgImltcG9ydF9wcm9taXNlcyIsICJzeXNQYXRoIiwgInByZXNvbHZlIiwgImJhc2VuYW1lIiwgInBqb2luIiwgInByZWxhdGl2ZSIsICJwc2VwIiwgImltcG9ydF9wcm9taXNlcyIsICJvc1R5cGUiLCAiZnNfd2F0Y2giLCAicmF3RW1pdHRlciIsICJsaXN0ZW5lciIsICJiYXNlbmFtZSIsICJkaXJuYW1lIiwgIm5ld1N0YXRzIiwgImNsb3NlciIsICJmc3JlYWxwYXRoIiwgInJlc29sdmUiLCAicmVhbHBhdGgiLCAic3RhdHMiLCAicmVsYXRpdmUiLCAiRE9VQkxFX1NMQVNIX1JFIiwgInRlc3RTdHJpbmciLCAicGF0aCIsICJzdGF0cyIsICJzdGF0Y2IiLCAibm93IiwgInN0YXQiLCAiaW1wb3J0X25vZGVfZnMiLCAiaW1wb3J0X25vZGVfcGF0aCIsICJzZXNzaW9uIiwgInNoZWxsIiwgIkJyb3dzZXJXaW5kb3ciLCAiQnJvd3NlclZpZXciLCAicGxhdGZvcm0iLCAiaW1wb3J0X25vZGVfZnMiLCAiaW1wb3J0X25vZGVfcGF0aCIsICJ1c2VyUm9vdCIsICJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9wYXRoIiwgImxvZyIsICJhc1JlY29yZCIsICJyZXNvbHZlIiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX3BhdGgiLCAiaW1wb3J0X25vZGVfZnMiLCAiaW1wb3J0X25vZGVfb3MiLCAiaW1wb3J0X25vZGVfcGF0aCIsICJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9jaGlsZF9wcm9jZXNzIiwgImltcG9ydF9ub2RlX2NyeXB0byIsICJpbXBvcnRfbm9kZV9wYXRoIiwgImltcG9ydF9ub2RlX29zIiwgImltcG9ydF9ub2RlX2NyeXB0byIsICJwbGF0Zm9ybSIsICJzdGF0IiwgImltcG9ydF9ub2RlX2NyeXB0byIsICJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9jaGlsZF9wcm9jZXNzIiwgImltcG9ydF9ub2RlX3BhdGgiLCAiaW1wb3J0X25vZGVfb3MiLCAiZXhwb3J0cyIsICJpbmZlck1hY0FwcFJvb3QiLCAiVkVSU0lPTl9SRSIsICJub3JtYWxpemVWZXJzaW9uIiwgImNvbXBhcmVWZXJzaW9ucyIsICJpbXBvcnRfZWxlY3Ryb24iLCAiaW1wb3J0X25vZGVfZnMiLCAiaW1wb3J0X25vZGVfY3J5cHRvIiwgImltcG9ydF9lbGVjdHJvbiIsICJtYWtlV2luZG93TGlrZUZvclZpZXciLCAiYXNSZWNvcmQiLCAiYXNSZWNvcmQiLCAibWFrZVdpbmRvd0xpa2VGb3JWaWV3IiwgImltcG9ydF9lbGVjdHJvbiIsICJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9wYXRoIiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX3BhdGgiLCAiaW1wb3J0X25vZGVfZnMiLCAiaW1wb3J0X25vZGVfcGF0aCIsICJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9wYXRoIiwgImltcG9ydF9lbGVjdHJvbiIsICJpbXBvcnRfbm9kZV9jaGlsZF9wcm9jZXNzIiwgImltcG9ydF9ub2RlX2NyeXB0byIsICJpbXBvcnRfbm9kZV9mcyIsICJsb2ciLCAiYXNzZXJ0QnJpZGdlSWQiLCAiZXhwb3J0cyIsICJhc1JlY29yZCIsICJ3aW5kb3dJZEZvciIsICJyZXNvbHZlIiwgImlzV2luZG93RGVzdHJveWVkIiwgIndlYkNvbnRlbnRzIiwgImltcG9ydF9ub2RlX2NyeXB0byIsICJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9wYXRoIiwgInVzZXJSb290IiwgInN0YXQiLCAiaW1wb3J0X25vZGVfY2hpbGRfcHJvY2VzcyIsICJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9wYXRoIiwgInBsYXRmb3JtIiwgInJlc29sdmUiLCAiaW1wb3J0X25vZGVfZnMiLCAiaW1wb3J0X25vZGVfcGF0aCIsICJyZXNvbHZlIiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX3BhdGgiLCAidXNlclJvb3QiLCAiVVBEQVRFX0NIRUNLX0lOVEVSVkFMX01TIiwgInBsYXRmb3JtIiwgInN0YXQiXQp9Cg==
