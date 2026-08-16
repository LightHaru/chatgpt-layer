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

// cgl-ms2a/packages/runtime/src/main.ts
var import_electron6 = require("electron");
var import_node_fs21 = require("node:fs");
var import_node_path18 = require("node:path");

// chatgpt-layer/node_modules/chokidar/esm/index.js
var import_fs2 = require("fs");
var import_promises3 = require("fs/promises");
var import_events = require("events");
var sysPath2 = __toESM(require("path"), 1);

// chatgpt-layer/node_modules/readdirp/esm/index.js
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
    const basename5 = this._isDirent ? dirent.name : dirent;
    try {
      const fullPath = (0, import_node_path.resolve)((0, import_node_path.join)(path, basename5));
      entry = { path: (0, import_node_path.relative)(this._root, fullPath), fullPath, basename: basename5 };
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

// chatgpt-layer/node_modules/chokidar/esm/handler.js
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
    const basename5 = sysPath.basename(path);
    const parent = this.fsw._getWatchedDir(directory);
    parent.add(basename5);
    const absolutePath = sysPath.resolve(path);
    const options = {
      persistent: opts.persistent
    };
    if (!listener)
      listener = EMPTY_FN;
    let closer;
    if (opts.usePolling) {
      const enableBin = opts.interval !== opts.binaryInterval;
      options.interval = enableBin && isBinaryPath(basename5) ? opts.binaryInterval : opts.interval;
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
    const dirname9 = sysPath.dirname(file);
    const basename5 = sysPath.basename(file);
    const parent = this.fsw._getWatchedDir(dirname9);
    let prevStats = stats;
    if (parent.has(basename5))
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
          this.fsw._remove(dirname9, basename5);
        }
      } else if (parent.has(basename5)) {
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

// chatgpt-layer/node_modules/chokidar/esm/index.js
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

// cgl-ms2a/packages/runtime/src/logging.ts
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

// cgl-ms2a/packages/runtime/src/codex-runtime-probe.ts
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

// cgl-ms2a/packages/runtime/src/watcher-health.ts
var import_node_child_process = require("node:child_process");
var import_node_fs3 = require("node:fs");
var import_node_os = require("node:os");
var import_node_path3 = require("node:path");

// cgl-ms2a/packages/runtime/src/ipc-guard.ts
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

// cgl-ms2a/packages/runtime/src/watcher-health.ts
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

// cgl-ms2a/packages/runtime/src/tweak-lifecycle.ts
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

// cgl-ms2a/packages/runtime/src/browser-ui.ts
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
  const host2 = await ensureBrowserUiHost();
  const { port1, port2 } = new import_electron.MessageChannelMain();
  host2.webContents.postMessage(CONNECT_PORT_CHANNEL, {}, [port2]);
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
  return ensureBrowserUiHost().then((host2) => {
    const id = (0, import_node_crypto.randomUUID)();
    return new Promise((resolve10, reject) => {
      const timer = setTimeout(() => {
        bridgeRequests.delete(id);
        reject(new Error(`Timed out waiting for browser UI bridge method: ${method}`));
      }, 15e3);
      bridgeRequests.set(id, { resolve: resolve10, reject, timer });
      host2.webContents.send(BRIDGE_REQUEST_CHANNEL, { id, method, args });
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

// cgl-ms2a/packages/runtime/src/native-paths.ts
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

// cgl-ms2a/packages/runtime/src/runtime-paths.ts
var import_node_fs6 = require("node:fs");
var import_node_os2 = require("node:os");
var import_node_path6 = require("node:path");

// cgl-ms2a/packages/runtime/src/tweak-store.ts
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

// cgl-ms2a/packages/runtime/src/runtime-paths.ts
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

// cgl-ms2a/packages/runtime/src/config-state.ts
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

// cgl-ms2a/packages/runtime/src/store-install.ts
var import_node_fs8 = require("node:fs");
var import_node_child_process2 = require("node:child_process");
var import_node_crypto3 = require("node:crypto");
var import_node_path7 = require("node:path");
var import_node_os3 = require("node:os");

// cgl-ms2a/packages/runtime/src/tweak-store-integrity.ts
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

// cgl-ms2a/packages/runtime/src/store-install.ts
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

// cgl-ms2a/packages/runtime/src/main.ts
var import_node_crypto7 = require("node:crypto");

// cgl-ms2a/packages/runtime/src/self-update.ts
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

// cgl-ms2a/packages/runtime/src/owl-views.ts
var import_electron3 = require("electron");
var import_node_fs10 = require("node:fs");
var import_node_crypto4 = require("node:crypto");

// cgl-ms2a/packages/runtime/src/codex-windows.ts
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

// cgl-ms2a/packages/runtime/src/owl-views.ts
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

// cgl-ms2a/packages/runtime/src/tweak-main-host.ts
var import_electron5 = require("electron");
var import_node_fs19 = require("node:fs");
var import_node_path16 = require("node:path");

// cgl-ms2a/packages/runtime/src/tweak-discovery.ts
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

// cgl-ms2a/packages/runtime/src/storage.ts
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

// cgl-ms2a/packages/runtime/src/mcp-sync.ts
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

// cgl-ms2a/packages/runtime/src/native-bridge.ts
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
    const host2 = this.loadNativeHost(false);
    const hostCapabilities = host2 ? this.readNativeHostCapabilities(host2) : {};
    const nativeHost = host2 !== null;
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
  readNativeHostCapabilities(host2) {
    const getCapabilities = asRecord4(host2)?.getCapabilities;
    if (typeof getCapabilities !== "function") return {};
    try {
      const capabilities = getCapabilities.call(host2);
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

// cgl-ms2a/packages/runtime/src/codex-sessions/ids.ts
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

// cgl-ms2a/packages/runtime/src/codex-sessions/paths.ts
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

// cgl-ms2a/packages/runtime/src/codex-sessions/launcher.ts
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

// cgl-ms2a/packages/runtime/src/codex-sessions/manager.ts
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

// cgl-ms2a/packages/runtime/src/codex-sessions/host.ts
var manager = null;
function setCodexSessionManager(next) {
  manager = next;
}
function requireCodexSessionManager() {
  if (!manager) throw new Error("codex session manager is not available");
  return manager;
}

// cgl-ms2a/packages/runtime/src/tweak-permissions.ts
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

// cgl-ms2a/packages/runtime/src/tweak-fs-sandbox.ts
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

// cgl-ms2a/packages/runtime/src/tweak-main-host.ts
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

// cgl-ms2a/packages/runtime/src/codex-app-server/errors.ts
var CodexAppServerError = class extends Error {
  kind;
  sessionId;
  constructor(kind, message, sessionId) {
    super(message);
    this.name = "CodexAppServerError";
    this.kind = kind;
    this.sessionId = sessionId;
  }
};

// cgl-ms2a/packages/runtime/src/codex-app-server/types.ts
var KNOWN_MESSAGE_KEYS = ["id", "method", "params", "result", "error"];
var MAX_MESSAGE_BYTES = 256 * 1024;
var MAX_BUFFER_BYTES = 512 * 1024;
var MAX_THREAD_ID_LENGTH = 200;
var MAX_THREAD_OWNERS = 4096;
var MAX_OWNER_STORE_BYTES = 512 * 1024;
var THREAD_OWNER_STORE_VERSION = 1;
var METHOD_INITIALIZE = "initialize";
var METHOD_INITIALIZED = "initialized";
var METHOD_THREAD_START = "thread/start";
var METHOD_THREAD_RESUME = "thread/resume";
var METHOD_THREAD_FORK = "thread/fork";
var METHOD_THREAD_UNARCHIVE = "thread/unarchive";
var OWNER_RECORDING_METHODS = [
  METHOD_THREAD_START,
  METHOD_THREAD_FORK,
  METHOD_THREAD_RESUME,
  METHOD_THREAD_UNARCHIVE
];

// cgl-ms2a/packages/runtime/src/codex-app-server/protocol.ts
var KNOWN = new Set(KNOWN_MESSAGE_KEYS);

// cgl-ms2a/packages/runtime/src/codex-app-server/discovery.ts
var APP_SERVER_INVOCATION_STATUS = "BLOCKED";
var REFERENCE_APP_SERVER_ARGV = ["app-server"];
var PRODUCTION_CHILD_TRANSPORT_ENABLED = false;

// cgl-ms2a/packages/runtime/src/codex-app-server/launcher.ts
function createFailClosedAppServerLauncher() {
  return {
    launchAppServer() {
      return Promise.reject(
        new CodexAppServerError(
          "not-proven",
          `Codex app-server invocation is ${APP_SERVER_INVOCATION_STATUS}; production child transport is disabled (reference argv ${JSON.stringify(REFERENCE_APP_SERVER_ARGV)} is not proven). productionChildTransportEnabled=${PRODUCTION_CHILD_TRANSPORT_ENABLED}`
        )
      );
    }
  };
}

// cgl-ms2a/packages/runtime/src/codex-app-server/handshake.ts
async function performInitializeHandshake(transport, params = {}, timeoutMs) {
  let result;
  try {
    const response = await transport.request(METHOD_INITIALIZE, params, { timeoutMs });
    result = response.result;
  } catch (error) {
    if (error instanceof CodexAppServerError) throw error;
    throw new CodexAppServerError(
      "protocol",
      error instanceof Error ? error.message : "initialize failed",
      transport.sessionId
    );
  }
  await transport.notify(METHOD_INITIALIZED, {});
  return { result, params };
}

// cgl-ms2a/packages/runtime/src/codex-app-server/registry.ts
var CodexSessionTransportRegistry = class {
  userRoot;
  launcher;
  sessionManager;
  initializeParams;
  initializeTimeoutMs;
  records = /* @__PURE__ */ new Map();
  closed = false;
  constructor(options) {
    this.userRoot = options.userRoot;
    this.launcher = options.launcher;
    this.sessionManager = options.sessionManager;
    this.initializeParams = options.initializeParams ?? {};
    this.initializeTimeoutMs = options.initializeTimeoutMs;
  }
  get(sessionId) {
    return this.records.get(sessionId)?.transport;
  }
  getRecord(sessionId) {
    const record = this.records.get(sessionId);
    return record ? { ...record } : void 0;
  }
  listReadySessionIds() {
    return [...this.records.values()].filter((record) => record.ready).map((record) => record.sessionId);
  }
  /**
   * TEST-ONLY: attach an already-constructed transport. Still requires RUNNING.
   */
  attach(sessionId, transport, ready = true) {
    this.assertOpen();
    this.assertRunning(sessionId);
    if (this.records.has(sessionId)) {
      throw new CodexAppServerError("already-attached", "session already has a transport", sessionId);
    }
    this.bind(sessionId, transport, ready, this.initializeParams, void 0);
  }
  async start(sessionId) {
    this.assertOpen();
    this.assertRunning(sessionId);
    if (this.records.has(sessionId)) {
      throw new CodexAppServerError("already-attached", "session already has a transport", sessionId);
    }
    this.sessionManager.getSessionStatus(sessionId);
    const transport = await this.launcher.launchAppServer({
      sessionId,
      codexHome: sessionCodexHome(this.userRoot, sessionId),
      sqliteHome: sessionSqliteHome(this.userRoot, sessionId)
    });
    try {
      const handshake = await performInitializeHandshake(
        transport,
        this.initializeParams,
        this.initializeTimeoutMs
      );
      this.bind(sessionId, transport, true, handshake.params, handshake.result);
      return this.records.get(sessionId);
    } catch (error) {
      await transport.close(
        error instanceof Error ? error : new CodexAppServerError("protocol", String(error), sessionId)
      );
      throw error;
    }
  }
  /**
   * Reject new work, close transport. Does not stop the MS-1 child itself.
   */
  async stop(sessionId) {
    const record = this.records.get(sessionId);
    if (!record) return;
    this.records.delete(sessionId);
    await record.transport.close(new CodexAppServerError("closed", "session transport stopped", sessionId));
  }
  async closeAll() {
    this.closed = true;
    const records = [...this.records.values()];
    this.records.clear();
    await Promise.all(
      records.map(
        (record) => record.transport.close(new CodexAppServerError("closed", "app-server registry closed", record.sessionId))
      )
    );
  }
  bind(sessionId, transport, ready, initializeParams, initializeResult) {
    transport.onClose(() => {
      this.records.delete(sessionId);
    });
    this.records.set(sessionId, {
      sessionId,
      transport,
      ready,
      initializeParams,
      initializeResult
    });
  }
  assertRunning(sessionId) {
    const status = this.sessionManager.getSessionStatus(sessionId);
    if (status.lifecycle !== "RUNNING") {
      throw new CodexAppServerError(
        "session-not-running",
        `session ${sessionId} is ${status.lifecycle}, transport requires RUNNING`,
        sessionId
      );
    }
  }
  assertOpen() {
    if (this.closed) {
      throw new CodexAppServerError("closed", "app-server registry is closed");
    }
  }
};

// cgl-ms2a/packages/runtime/src/codex-app-server/thread-id.ts
function isUsableThreadId(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_THREAD_ID_LENGTH) {
    return false;
  }
  if (/\s/.test(value)) return false;
  if (value.includes("..") || value.includes("/") || value.includes("\\")) return false;
  if (value.includes(":") || value.includes("@") || value.includes("\\0")) return false;
  if (value.startsWith("\\\\")) return false;
  return true;
}
function assertThreadId(value) {
  if (!isUsableThreadId(value)) {
    throw new Error("invalid thread id");
  }
}
function asRecord5(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}
function extractThreadIdFromParams(params) {
  const rec = asRecord5(params);
  if (!rec) return null;
  for (const key of ["threadId", "thread_id"]) {
    const value = rec[key];
    if (isUsableThreadId(value)) return value;
  }
  return null;
}
function extractThreadIdFromResult(result) {
  const rec = asRecord5(result);
  if (!rec) return null;
  const thread = asRecord5(rec.thread);
  if (thread && isUsableThreadId(thread.id)) return thread.id;
  return null;
}
function extractThreadIdFromNotification(params) {
  return extractThreadIdFromResult(params) ?? extractThreadIdFromParams(params);
}

// cgl-ms2a/packages/runtime/src/codex-app-server/router.ts
var CodexSessionRouter = class {
  registry;
  owners;
  selectSession;
  requestTimeoutMs;
  constructor(options) {
    this.registry = options.registry;
    this.owners = options.owners;
    this.selectSession = options.selectSession;
    this.requestTimeoutMs = options.requestTimeoutMs;
  }
  async routeNewThread(input = {}) {
    const sessionId = this.resolveNewSession(input.sessionId);
    const transport = this.requireTransport(sessionId);
    const response = await transport.request(METHOD_THREAD_START, input.params ?? {}, {
      timeoutMs: this.requestTimeoutMs
    });
    const threadId = extractThreadIdFromResult(response.result);
    if (!threadId) {
      return { sessionId, threadId: null, response, ownerPersisted: false };
    }
    this.owners.setOwner(threadId, sessionId, { overwrite: false });
    return { sessionId, threadId, response, ownerPersisted: true };
  }
  async routeExistingThread(input) {
    const threadId = input.threadId ?? extractThreadIdFromParams(input.params);
    if (threadId && !isUsableThreadId(threadId)) {
      throw new CodexAppServerError("invalid-id", "malformed thread id");
    }
    const owner = threadId ? this.owners.getOwner(threadId) : null;
    let sessionId = null;
    if (owner) {
      if (this.registry.get(owner)) {
        sessionId = owner;
      } else if (input.fallbackSessionId) {
        assertSessionId(input.fallbackSessionId);
        sessionId = input.fallbackSessionId;
      } else {
        throw new CodexAppServerError(
          "unavailable",
          `owner session ${owner} has no live transport`,
          owner
        );
      }
    } else if (input.fallbackSessionId) {
      assertSessionId(input.fallbackSessionId);
      sessionId = input.fallbackSessionId;
    } else {
      throw new CodexAppServerError("fallback-required", "unknown thread owner requires an explicit fallback session");
    }
    const transport = this.requireTransport(sessionId);
    const response = await transport.request(input.method, input.params ?? {}, {
      timeoutMs: this.requestTimeoutMs
    });
    return { sessionId, threadId: threadId ?? null, response, ownerPersisted: false };
  }
  recordThreadOwner(threadId, sessionId, overwrite = false) {
    this.owners.setOwner(threadId, sessionId, { overwrite });
  }
  maybeRecordFromNotification(sessionId, method, params) {
    if (method !== "thread/started") return null;
    const threadId = extractThreadIdFromNotification(params);
    if (!threadId) return null;
    const existing = this.owners.getOwner(threadId);
    if (existing && existing !== sessionId) return existing;
    if (!existing) this.owners.setOwner(threadId, sessionId, { overwrite: false });
    return threadId;
  }
  maybeRecordFromSuccess(method, sessionId, result) {
    if (!OWNER_RECORDING_METHODS.includes(method)) return null;
    const threadId = extractThreadIdFromResult(result);
    if (!threadId) return null;
    this.owners.setOwner(threadId, sessionId, { overwrite: false });
    return threadId;
  }
  resolveNewSession(sessionId) {
    if (sessionId) {
      assertSessionId(sessionId);
      return sessionId;
    }
    const selected = this.selectSession?.() ?? null;
    if (!selected) {
      throw new CodexAppServerError("fallback-required", "new thread requires a target session");
    }
    assertSessionId(selected);
    return selected;
  }
  requireTransport(sessionId) {
    assertSessionId(sessionId);
    const transport = this.registry.get(sessionId);
    if (!transport) {
      throw new CodexAppServerError("unavailable", `no live app-server transport for ${sessionId}`, sessionId);
    }
    return transport;
  }
};

// cgl-ms2a/packages/runtime/src/codex-app-server/thread-owner-store.ts
var import_node_fs20 = require("node:fs");
var import_node_path17 = require("node:path");
var ThreadOwnerStore = class {
  userRoot;
  owners = /* @__PURE__ */ new Map();
  loaded = false;
  constructor(userRoot2) {
    this.userRoot = userRoot2;
  }
  getOwner(threadId) {
    assertThreadId(threadId);
    this.ensureLoaded();
    return this.owners.get(threadId) ?? null;
  }
  setOwner(threadId, sessionId, options = {}) {
    assertThreadId(threadId);
    assertSessionId(sessionId);
    this.ensureLoaded();
    const existing = this.owners.get(threadId);
    if (existing && existing !== sessionId && !options.overwrite) {
      throw new CodexAppServerError(
        "owner-exists",
        `thread ${threadId} is already owned by another session`
      );
    }
    if (!existing && this.owners.size >= MAX_THREAD_OWNERS) {
      throw new CodexAppServerError("store-corrupt", "thread owner store is full");
    }
    this.owners.set(threadId, sessionId);
    this.persist();
  }
  removeOwner(threadId) {
    assertThreadId(threadId);
    this.ensureLoaded();
    const deleted = this.owners.delete(threadId);
    if (deleted) this.persist();
    return deleted;
  }
  listOwners() {
    this.ensureLoaded();
    return [...this.owners.entries()].map(([threadId, sessionId]) => ({ threadId, sessionId })).sort((a, b) => a.threadId.localeCompare(b.threadId));
  }
  removeSessionOwners(sessionId) {
    assertSessionId(sessionId);
    this.ensureLoaded();
    let removed = 0;
    for (const [threadId, owner] of [...this.owners.entries()]) {
      if (owner === sessionId) {
        this.owners.delete(threadId);
        removed += 1;
      }
    }
    if (removed > 0) this.persist();
    return removed;
  }
  storePath() {
    const layout = assertSafeSessionLayout(this.userRoot);
    const path = (0, import_node_path17.join)(layout.realSessionsRoot, "thread-owners.json");
    if (!path.startsWith(layout.realSessionsRoot)) {
      throw new CodexAppServerError("store-corrupt", "thread owner path escaped session root");
    }
    return path;
  }
  ensureLoaded() {
    if (this.loaded) return;
    assertSafeSessionLayout(this.userRoot);
    const path = this.storePath();
    const stat4 = lstatIfExists2(path);
    if (!stat4) {
      this.owners = /* @__PURE__ */ new Map();
      this.loaded = true;
      return;
    }
    if (stat4.isSymbolicLink()) {
      throw new CodexAppServerError("store-corrupt", "thread-owners.json must not be a symlink");
    }
    if (!stat4.isFile()) {
      throw new CodexAppServerError("store-corrupt", "thread-owners.json must be a file");
    }
    if (stat4.size > MAX_OWNER_STORE_BYTES) {
      throw new CodexAppServerError("store-corrupt", "thread-owners.json exceeds size bound");
    }
    let rawText;
    try {
      rawText = (0, import_node_fs20.readFileSync)(path, "utf8");
    } catch (error) {
      throw new CodexAppServerError("store-corrupt", "failed to read thread-owners.json");
    }
    if (rawText.length > MAX_OWNER_STORE_BYTES) {
      throw new CodexAppServerError("store-corrupt", "thread-owners.json exceeds size bound");
    }
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new CodexAppServerError("store-corrupt", "thread-owners.json is not JSON");
    }
    this.owners = parseOwnerFile(parsed);
    this.loaded = true;
  }
  persist() {
    const layout = assertSafeSessionLayout(this.userRoot);
    (0, import_node_fs20.mkdirSync)(layout.realSessionsRoot, { recursive: true });
    assertSafeSessionLayout(this.userRoot);
    const path = this.storePath();
    const existing = lstatIfExists2(path);
    if (existing?.isSymbolicLink()) {
      throw new CodexAppServerError("store-corrupt", "thread-owners.json must not be a symlink");
    }
    const body = {
      version: THREAD_OWNER_STORE_VERSION,
      owners: Object.fromEntries(this.owners)
    };
    const encoded = `${JSON.stringify(body, null, 2)}
`;
    if (Buffer.byteLength(encoded, "utf8") > MAX_OWNER_STORE_BYTES) {
      throw new CodexAppServerError("store-corrupt", "thread-owners.json would exceed size bound");
    }
    writeJsonAtomic2(path, encoded);
  }
};
function parseOwnerFile(raw) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new CodexAppServerError("store-corrupt", "thread-owners.json must be an object");
  }
  const rec = raw;
  const allowed = /* @__PURE__ */ new Set(["version", "owners"]);
  for (const key of Object.keys(rec)) {
    if (!allowed.has(key)) {
      throw new CodexAppServerError("store-corrupt", "thread-owners.json contains unknown fields");
    }
  }
  if (rec.version !== THREAD_OWNER_STORE_VERSION) {
    throw new CodexAppServerError("store-corrupt", "unsupported thread-owners.json version");
  }
  if (rec.owners === null || typeof rec.owners !== "object" || Array.isArray(rec.owners)) {
    throw new CodexAppServerError("store-corrupt", "owners must be an object");
  }
  const owners = rec.owners;
  const map = /* @__PURE__ */ new Map();
  for (const [threadId, sessionId] of Object.entries(owners)) {
    if (!isUsableThreadId(threadId) || typeof sessionId !== "string" || !isSessionId(sessionId)) {
      throw new CodexAppServerError("store-corrupt", "malformed thread owner entry");
    }
    if (looksLikeCredential(threadId) || looksLikeCredential(sessionId)) {
      throw new CodexAppServerError("store-corrupt", "credential-like field rejected");
    }
    map.set(threadId, sessionId);
    if (map.size > MAX_THREAD_OWNERS) {
      throw new CodexAppServerError("store-corrupt", "too many thread owners");
    }
  }
  return map;
}
function looksLikeCredential(value) {
  const lower = value.toLowerCase();
  return lower.includes("token") || lower.includes("secret") || lower.includes("password") || lower.includes("auth.json") || lower.includes("sk-") || lower.includes("bearer");
}
function lstatIfExists2(path) {
  try {
    return (0, import_node_fs20.lstatSync)(path);
  } catch (error) {
    const code = error.code;
    if (code === "ENOENT") return null;
    throw error;
  }
}
function writeJsonAtomic2(filePath, encoded) {
  const dir = (0, import_node_path17.dirname)(filePath);
  (0, import_node_fs20.mkdirSync)(dir, { recursive: true });
  const tmp = (0, import_node_path17.join)(dir, `.${(0, import_node_path17.basename)(filePath)}.${process.pid}.tmp`);
  (0, import_node_fs20.writeFileSync)(tmp, encoded, "utf8");
  try {
    (0, import_node_fs20.renameSync)(tmp, filePath);
  } catch {
    try {
      (0, import_node_fs20.unlinkSync)(filePath);
    } catch {
    }
    (0, import_node_fs20.renameSync)(tmp, filePath);
  }
}

// cgl-ms2a/packages/runtime/src/codex-app-server/host.ts
function createCodexAppServerHost(options) {
  const launcher = options.launcher ?? createFailClosedAppServerLauncher();
  const owners = new ThreadOwnerStore(options.userRoot);
  const registry = new CodexSessionTransportRegistry({
    userRoot: options.userRoot,
    launcher,
    sessionManager: options.sessionManager,
    initializeParams: options.initializeParams,
    initializeTimeoutMs: options.initializeTimeoutMs
  });
  const router = new CodexSessionRouter({
    registry,
    owners,
    selectSession: options.selectSession,
    requestTimeoutMs: options.initializeTimeoutMs
  });
  return {
    owners,
    registry,
    router,
    closeAll: () => registry.closeAll()
  };
}
var host = null;
function setCodexAppServerHost(next) {
  host = next;
}

// cgl-ms2a/packages/runtime/src/main.ts
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
  const filePath = kind === "guest" && (0, import_node_fs21.existsSync)(GUEST_PRELOAD_PATH) ? GUEST_PRELOAD_PATH : PRELOAD_PATH;
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
var appServerHost = createCodexAppServerHost({
  userRoot,
  sessionManager,
  log
});
setCodexAppServerHost(appServerHost);
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
  void appServerHost.closeAll().catch(() => {
  }).then(() => sessionManager.shutdownAll({ timeoutMs: 3e3 })).finally(() => {
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
  const cli = (0, import_node_path18.join)(sourceRoot, "packages", "installer", "dist", "cli.js");
  if (!(0, import_node_fs21.existsSync)(cli)) {
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
  const resolved = (0, import_node_path18.resolve)(entryPath);
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
    const dir = (0, import_node_path18.resolve)(tweakDir);
    if (!isPathInside(TWEAKS_DIR, dir)) {
      throw new Error("tweakDir outside tweaks dir");
    }
    const full = (0, import_node_path18.resolve)(dir, relPath);
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
    appendCappedLog((0, import_node_path18.join)(LOG_DIR, "preload.log"), `[${(/* @__PURE__ */ new Date()).toISOString()}] [${lvl}] ${msg}
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
//# sourceMappingURL=main.js.map
