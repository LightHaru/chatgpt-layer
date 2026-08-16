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
var import_electron6 = require("electron");
var import_node_fs16 = require("node:fs");
var import_node_path13 = require("node:path");

// ../../../cgl-wh/node_modules/chokidar/esm/index.js
var import_fs2 = require("fs");
var import_promises3 = require("fs/promises");
var import_events = require("events");
var sysPath2 = __toESM(require("path"), 1);

// ../../../cgl-wh/node_modules/readdirp/esm/index.js
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

// ../../../cgl-wh/node_modules/chokidar/esm/handler.js
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
    const dirname6 = sysPath.dirname(file);
    const basename3 = sysPath.basename(file);
    const parent = this.fsw._getWatchedDir(dirname6);
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
          this.fsw._remove(dirname6, basename3);
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
    return new Promise((resolve8, reject) => {
      if (!stream)
        return reject();
      stream.once(STR_END, () => {
        if (this.fsw.closed) {
          stream = void 0;
          return;
        }
        const wasThrottled = throttler ? throttler.clear() : false;
        resolve8(void 0);
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

// ../../../cgl-wh/node_modules/chokidar/esm/index.js
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

// src/logging.ts
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

// src/codex-runtime-probe.ts
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

// src/watcher-health.ts
var import_node_child_process = require("node:child_process");
var import_node_fs3 = require("node:fs");
var import_node_os = require("node:os");
var import_node_path3 = require("node:path");

// src/ipc-guard.ts
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

// src/watcher-health.ts
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

// src/browser-ui.ts
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
    return new Promise((resolve8, reject) => {
      const timer = setTimeout(() => {
        bridgeRequests.delete(id);
        reject(new Error(`Timed out waiting for browser UI bridge method: ${method}`));
      }, 15e3);
      bridgeRequests.set(id, { resolve: resolve8, reject, timer });
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
  return new Promise((resolve8, reject) => {
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
        resolve8(null);
        return;
      }
      try {
        resolve8(JSON.parse(raw));
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
  return new Promise((resolve8) => setTimeout(resolve8, ms));
}

// src/native-paths.ts
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

// src/runtime-paths.ts
var import_node_fs6 = require("node:fs");
var import_node_os2 = require("node:os");
var import_node_path6 = require("node:path");

// src/tweak-store.ts
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

// src/runtime-paths.ts
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
var CODEX_PLUSPLUS_VERSION = "1.1.3";
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

// src/config-state.ts
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

// src/store-install.ts
var import_node_fs8 = require("node:fs");
var import_node_child_process2 = require("node:child_process");
var import_node_crypto3 = require("node:crypto");
var import_node_path7 = require("node:path");
var import_node_os3 = require("node:os");

// src/tweak-store-integrity.ts
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

// src/store-install.ts
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

// src/main.ts
var import_node_crypto6 = require("node:crypto");

// src/self-update.ts
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

// src/owl-views.ts
var import_electron3 = require("electron");
var import_node_fs10 = require("node:fs");
var import_node_crypto4 = require("node:crypto");

// src/codex-windows.ts
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

// src/owl-views.ts
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

// src/tweak-main-host.ts
var import_electron5 = require("electron");
var import_node_fs15 = require("node:fs");
var import_node_path12 = require("node:path");

// src/tweak-discovery.ts
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

// src/storage.ts
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

// src/mcp-sync.ts
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

// src/native-bridge.ts
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
    return await new Promise((resolve8, reject) => {
      const timer = setTimeout(() => {
        helper.pending.delete(requestId);
        reject(new Error(`native helper request timed out: ${tweakId}:${id}`));
      }, timeoutMs);
      helper.pending.set(requestId, { resolve: resolve8, reject, timer });
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

// src/tweak-main-host.ts
var UPDATE_CHECK_INTERVAL_MS2 = 24 * 60 * 60 * 1e3;
var tweakState = {
  discovered: [],
  loadedMain: /* @__PURE__ */ new Map()
};
var nativeBridge = new NativeBridge(log, {
  nativeHostPath: (0, import_node_path12.join)(runtimeDir, "native", "codexpp_native_host.node")
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
          ipc: makeMainIpc(t.manifest.id),
          fs: makeMainFs(t.manifest.id),
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
    return (0, import_node_fs15.realpathSync)(filePath);
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
    entryExists: (0, import_node_fs15.existsSync)(t.entry),
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
function makeMainIpc(id) {
  const ch = (c) => `codexpp:${id}:${c}`;
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
function makeMainFs(id) {
  const dir = (0, import_node_path12.join)(userRoot, "tweak-data", id);
  (0, import_node_fs15.mkdirSync)(dir, { recursive: true });
  const fs = require("node:fs/promises");
  return {
    dataDir: dir,
    read: (p) => fs.readFile((0, import_node_path12.join)(dir, p), "utf8"),
    write: (p, c) => fs.writeFile((0, import_node_path12.join)(dir, p), c, "utf8"),
    exists: async (p) => {
      try {
        await fs.access((0, import_node_path12.join)(dir, p));
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
  const tweak = permission ? assertTweakPermissionForId(tweakId, permission) : tweakById(tweakId);
  return { id: tweak.manifest.id, dir: tweak.dir };
}
function tweakById(tweakId) {
  assertTweakId(tweakId);
  const tweak = tweakState.discovered.find((item) => item.manifest.id === tweakId);
  if (!tweak) throw new Error(`unknown tweak: ${tweakId}`);
  if (!isTweakEnabled(tweakId)) throw new Error(`tweak is disabled: ${tweakId}`);
  return tweak;
}
function assertTweakPermissionForId(tweakId, permission) {
  const tweak = tweakById(tweakId);
  assertTweakPermission(tweak, permission);
  return tweak;
}
function assertTweakViewPermissionForId(tweakId) {
  const tweak = tweakById(tweakId);
  assertTweakViewPermission(tweak);
  return tweak;
}
function assertTweakPermission(tweak, permission) {
  if (tweak.manifest.permissions?.includes(permission)) return;
  throw new Error(`tweak ${tweak.manifest.id} must declare ${permission} permission`);
}
function assertTweakViewPermission(tweak) {
  if (tweak.manifest.permissions?.includes("codex-views") || tweak.manifest.permissions?.includes("codex.views")) {
    return;
  }
  throw new Error(`tweak ${tweak.manifest.id} must declare codex-views permission`);
}
function assertTweakId(tweakId) {
  if (!/^[a-zA-Z0-9._-]+$/.test(tweakId)) throw new Error("bad tweak id");
}
function makeCodexApi(tweak) {
  const ctx = () => ({ id: tweak.manifest.id, dir: tweak.dir });
  return {
    runtime: {
      getInfo: async () => currentRuntimeInfo(),
      getCapabilities: async () => currentRuntimeCapabilities()
    },
    windows: {
      create: createCodexWindow,
      getPrimary: async () => getPrimaryCodexWindowRef(),
      focus: async (windowId) => focusCodexWindow(windowId),
      show: async (windowId) => showCodexWindow(windowId)
    },
    views: {
      create: async (options) => {
        assertTweakViewPermission(tweak);
        return createOwlView(ctx(), options);
      }
    },
    cdp: {
      getStatus: async () => getCdpStatus(),
      listTargets: async () => listCdpTargets()
    },
    native: {
      loadModule: async (options) => {
        assertTweakPermission(tweak, "native-module");
        return nativeBridge.loadModule(ctx(), options);
      },
      createPanel: async (options) => {
        assertTweakPermission(tweak, "native-view");
        return nativeBridge.createPanel(ctx(), options);
      },
      attachView: async (options) => {
        assertTweakPermission(tweak, "native-view");
        return nativeBridge.attachView(ctx(), options);
      },
      launchHelper: async (options) => {
        assertTweakPermission(tweak, "native-helper");
        return nativeBridge.launchHelper(ctx(), options);
      }
    },
    createBrowserView: createCodexBrowserView,
    createWindow: createCodexWindow
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

// src/main.ts
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
  const filePath = kind === "guest" && (0, import_node_fs16.existsSync)(GUEST_PRELOAD_PATH) ? GUEST_PRELOAD_PATH : PRELOAD_PATH;
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
loadAllMainTweaks();
import_electron6.app.on("will-quit", () => {
  stopAllMainTweaks();
  nativeBridge.disposeAll();
  disposeAllOwlViews();
  for (const t of tweakState.loadedMain.values()) {
    try {
      t.storage.flush();
    } catch {
    }
  }
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
  const cli = (0, import_node_path13.join)(sourceRoot, "packages", "installer", "dist", "cli.js");
  if (!(0, import_node_fs16.existsSync)(cli)) {
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
  const entries = shuffleStoreEntries(registry.entries, import_node_crypto6.randomInt);
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
  const resolved = (0, import_node_path13.resolve)(entryPath);
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
    const dir = (0, import_node_path13.resolve)(tweakDir);
    if (!isPathInside(TWEAKS_DIR, dir)) {
      throw new Error("tweakDir outside tweaks dir");
    }
    const full = (0, import_node_path13.resolve)(dir, relPath);
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
    appendCappedLog((0, import_node_path13.join)(LOG_DIR, "preload.log"), `[${(/* @__PURE__ */ new Date()).toISOString()}] [${lvl}] ${msg}
`);
  } catch {
  }
});
privilegedHandle("codexpp:tweak-fs", (_e, op, id, p, c) => {
  if (!/^[a-zA-Z0-9._-]+$/.test(id)) throw new Error("bad tweak id");
  const dir = (0, import_node_path13.join)(userRoot, "tweak-data", id);
  (0, import_node_fs16.mkdirSync)(dir, { recursive: true });
  const full = (0, import_node_path13.resolve)(dir, p);
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
import_electron6.ipcMain.handle("codexpp:user-paths", () => ({
  userRoot,
  runtimeDir,
  tweaksDir: TWEAKS_DIR,
  logDir: LOG_DIR
}));
import_electron6.ipcMain.handle("codexpp:codex-runtime-info", () => currentRuntimeInfo());
import_electron6.ipcMain.handle("codexpp:codex-runtime-capabilities", () => currentRuntimeCapabilities());
import_electron6.ipcMain.handle("codexpp:codex-cdp-status", () => getCdpStatus());
import_electron6.ipcMain.handle("codexpp:codex-cdp-targets", () => listCdpTargets());
privilegedHandle("codexpp:codex-window-create", (_e, opts) => {
  return createCodexWindow(opts);
});
import_electron6.ipcMain.handle("codexpp:codex-window-primary", () => getPrimaryCodexWindowRef());
import_electron6.ipcMain.handle("codexpp:codex-window-focus", (_e, windowId) => focusCodexWindow(windowId));
import_electron6.ipcMain.handle("codexpp:codex-window-show", (_e, windowId) => showCodexWindow(windowId));
privilegedHandle(
  "codexpp:codex-view-create",
  async (_e, tweakId, options) => {
    const tweak = assertTweakViewPermissionForId(tweakId);
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
    assertTweakViewPermissionForId(tweakId);
    return callOwlView(tweakId, viewId, method, arg, arg2);
  }
);
import_electron6.ipcMain.handle("codexpp:codex-view-dispose-tweak", (_e, tweakId) => {
  assertTweakId(tweakId);
  disposeOwlViewsForTweak(tweakId);
});
privilegedHandle(
  "codexpp:native-load-module",
  (_e, tweakId, options) => {
    const ref = nativeBridge.loadModule(tweakContext(tweakId, "native-module"), options);
    return { id: ref.id, kind: ref.kind };
  }
);
privilegedHandle(
  "codexpp:native-module-request",
  (_e, tweakId, moduleId, method, payload, timeoutMs) => {
    assertTweakPermissionForId(tweakId, "native-module");
    return nativeBridge.requestModule(tweakId, moduleId, method, payload, timeoutMs);
  }
);
privilegedHandle("codexpp:native-module-dispose", (_e, tweakId, moduleId) => {
  assertTweakPermissionForId(tweakId, "native-module");
  return nativeBridge.disposeModule(tweakId, moduleId);
});
import_electron6.ipcMain.handle("codexpp:native-dispose-tweak", (_e, tweakId) => {
  assertTweakId(tweakId);
  nativeBridge.disposeTweak(tweakId);
});
privilegedHandle(
  "codexpp:native-create-panel",
  async (_e, tweakId, options) => {
    const ref = await nativeBridge.createPanel(tweakContext(tweakId, "native-view"), options);
    return { id: ref.id, windowId: ref.windowId };
  }
);
privilegedHandle(
  "codexpp:native-attach-view",
  async (_e, tweakId, options) => {
    const ref = await nativeBridge.attachView(tweakContext(tweakId, "native-view"), options);
    return { id: ref.id };
  }
);
privilegedHandle(
  "codexpp:native-instance-call",
  async (_e, tweakId, kind, instanceId, method, arg) => {
    assertTweakPermissionForId(tweakId, "native-view");
    return nativeBridge.callInstance(tweakId, kind, instanceId, method, arg);
  }
);
privilegedHandle(
  "codexpp:native-launch-helper",
  (_e, tweakId, options) => {
    const ref = nativeBridge.launchHelper(tweakContext(tweakId, "native-helper"), options);
    return { id: ref.id, pid: ref.pid };
  }
);
privilegedHandle(
  "codexpp:native-helper-call",
  (_e, tweakId, helperId, method, payload, timeoutMs) => {
    assertTweakPermissionForId(tweakId, "native-helper");
    return nativeBridge.callHelper(tweakId, helperId, method, payload, timeoutMs);
  }
);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL21haW4udHMiLCAiLi4vLi4vLi4vLi4vY2dsLXdoL25vZGVfbW9kdWxlcy9jaG9raWRhci9lc20vaW5kZXguanMiLCAiLi4vLi4vLi4vLi4vY2dsLXdoL25vZGVfbW9kdWxlcy9yZWFkZGlycC9lc20vaW5kZXguanMiLCAiLi4vLi4vLi4vLi4vY2dsLXdoL25vZGVfbW9kdWxlcy9jaG9raWRhci9lc20vaGFuZGxlci5qcyIsICIuLi9zcmMvbG9nZ2luZy50cyIsICIuLi9zcmMvY29kZXgtcnVudGltZS1wcm9iZS50cyIsICIuLi9zcmMvd2F0Y2hlci1oZWFsdGgudHMiLCAiLi4vc3JjL2lwYy1ndWFyZC50cyIsICIuLi9zcmMvdHdlYWstbGlmZWN5Y2xlLnRzIiwgIi4uL3NyYy9icm93c2VyLXVpLnRzIiwgIi4uL3NyYy9uYXRpdmUtcGF0aHMudHMiLCAiLi4vc3JjL3J1bnRpbWUtcGF0aHMudHMiLCAiLi4vc3JjL3R3ZWFrLXN0b3JlLnRzIiwgIi4uL3NyYy9jb25maWctc3RhdGUudHMiLCAiLi4vc3JjL3N0b3JlLWluc3RhbGwudHMiLCAiLi4vc3JjL3R3ZWFrLXN0b3JlLWludGVncml0eS50cyIsICIuLi9zcmMvc2VsZi11cGRhdGUudHMiLCAiLi4vc3JjL293bC12aWV3cy50cyIsICIuLi9zcmMvY29kZXgtd2luZG93cy50cyIsICIuLi9zcmMvdHdlYWstbWFpbi1ob3N0LnRzIiwgIi4uL3NyYy90d2Vhay1kaXNjb3ZlcnkudHMiLCAiLi4vc3JjL3N0b3JhZ2UudHMiLCAiLi4vc3JjL21jcC1zeW5jLnRzIiwgIi4uL3NyYy9uYXRpdmUtYnJpZGdlLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIE1haW4tcHJvY2VzcyBib290c3RyYXAuIExvYWRlZCBieSB0aGUgYXNhciBsb2FkZXIgYmVmb3JlIENvZGV4J3Mgb3duXG4gKiBtYWluIHByb2Nlc3MgY29kZSBydW5zLiBXZSBob29rIGBCcm93c2VyV2luZG93YCBzbyBldmVyeSB3aW5kb3cgQ29kZXhcbiAqIGNyZWF0ZXMgZ2V0cyBvdXIgcHJlbG9hZCBzY3JpcHQgYXR0YWNoZWQuIFdlIGFsc28gc3RhbmQgdXAgYW4gSVBDXG4gKiBjaGFubmVsIGZvciB0d2Vha3MgdG8gdGFsayB0byB0aGUgbWFpbiBwcm9jZXNzLlxuICpcbiAqIFdlIGFyZSBpbiBDSlMgbGFuZCBoZXJlIChtYXRjaGVzIEVsZWN0cm9uJ3MgbWFpbiBwcm9jZXNzIGFuZCBDb2RleCdzIG93blxuICogY29kZSkuIFRoZSByZW5kZXJlci1zaWRlIHJ1bnRpbWUgaXMgYnVuZGxlZCBzZXBhcmF0ZWx5IGludG8gcHJlbG9hZC5qcy5cbiAqL1xuXG5pbXBvcnQgeyBhcHAsIGNsaXBib2FyZCwgaXBjTWFpbiwgc2Vzc2lvbiwgc2hlbGwgfSBmcm9tIFwiZWxlY3Ryb25cIjtcbmltcG9ydCB7IGV4aXN0c1N5bmMsIG1rZGlyU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBqb2luLCByZXNvbHZlIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuaW1wb3J0IGNob2tpZGFyIGZyb20gXCJjaG9raWRhclwiO1xuaW1wb3J0IHsgYXBwZW5kQ2FwcGVkTG9nIH0gZnJvbSBcIi4vbG9nZ2luZ1wiO1xuaW1wb3J0IHsgZ2V0Q2RwU3RhdHVzLCBsaXN0Q2RwVGFyZ2V0cywgc2VsZWN0UHJlbG9hZFJlZ2lzdHJhdGlvbiB9IGZyb20gXCIuL2NvZGV4LXJ1bnRpbWUtcHJvYmVcIjtcbmltcG9ydCB7IGdldFdhdGNoZXJIZWFsdGggfSBmcm9tIFwiLi93YXRjaGVyLWhlYWx0aFwiO1xuaW1wb3J0IHtcbiAgcmVsb2FkVHdlYWtzLFxuICBzZXRUd2Vha0VuYWJsZWRBbmRSZWxvYWQsXG59IGZyb20gXCIuL3R3ZWFrLWxpZmVjeWNsZVwiO1xuaW1wb3J0IHtcbiAgYXNzZXJ0UHJpdmlsZWdlZElwY1NlbmRlcixcbiAgaXNMYXllckF1dG9VcGRhdGVFbmFibGVkLFxuICBpc1ByaXZpbGVnZWRJcGNTZW5kZXIsXG4gIHN0cmlwUmVuZGVyZXJVcGRhdGVSZXBvLFxufSBmcm9tIFwiLi9pcGMtZ3VhcmRcIjtcbmltcG9ydCB7IG1heWJlU3RhcnRCcm93c2VyVWlTZXJ2ZXIgfSBmcm9tIFwiLi9icm93c2VyLXVpXCI7XG5pbXBvcnQgeyBpc1BhdGhJbnNpZGUgfSBmcm9tIFwiLi9uYXRpdmUtcGF0aHNcIjtcbmltcG9ydCB7XG4gIENPREVYX1BMVVNQTFVTX1JFUE8sXG4gIENPREVYX1BMVVNQTFVTX1ZFUlNJT04sXG4gIEdVRVNUX1BSRUxPQURfUEFUSCxcbiAgTE9HX0RJUixcbiAgUFJFTE9BRF9QQVRILFxuICBUV0VBS1NfRElSLFxuICBUV0VBS19TVE9SRV9JTkRFWF9VUkwsXG4gIGxvZyxcbiAgcnVudGltZURpcixcbiAgdXNlclJvb3QsXG59IGZyb20gXCIuL3J1bnRpbWUtcGF0aHNcIjtcbmltcG9ydCB7XG4gIGlzQ29kZXhQbHVzUGx1c0F1dG9VcGRhdGVFbmFibGVkLFxuICBpc0NvZGV4UGx1c1BsdXNTYWZlTW9kZUVuYWJsZWQsXG4gIGlzVHdlYWtFbmFibGVkLFxuICByZWFkSW5zdGFsbGVyU3RhdGUsXG4gIHJlYWRTZWxmVXBkYXRlU3RhdGUsXG4gIHJlYWRTdGF0ZSxcbiAgc2V0Q29kZXhQbHVzUGx1c0F1dG9VcGRhdGUsXG4gIHNldENvZGV4UGx1c1BsdXNVcGRhdGVDb25maWcsXG4gIHR5cGUgU2VsZlVwZGF0ZUNoYW5uZWwsXG59IGZyb20gXCIuL2NvbmZpZy1zdGF0ZVwiO1xuaW1wb3J0IHtcbiAgYXNzZXJ0U3RvcmVFbnRyeVBsYXRmb3JtQ29tcGF0aWJsZSxcbiAgYXNzZXJ0U3RvcmVFbnRyeVJ1bnRpbWVDb21wYXRpYmxlLFxuICBmZXRjaFR3ZWFrU3RvcmVSZWdpc3RyeSxcbiAgaW5zdGFsbFN0b3JlVHdlYWssXG4gIHByZXBhcmVUd2Vha1N0b3JlU3VibWlzc2lvbixcbiAgc3RvcmVFbnRyeVBsYXRmb3JtQ29tcGF0aWJpbGl0eSxcbiAgc3RvcmVFbnRyeVJ1bnRpbWVDb21wYXRpYmlsaXR5LFxufSBmcm9tIFwiLi9zdG9yZS1pbnN0YWxsXCI7XG5pbXBvcnQgeyBzaHVmZmxlU3RvcmVFbnRyaWVzIH0gZnJvbSBcIi4vdHdlYWstc3RvcmVcIjtcbmltcG9ydCB7IHJhbmRvbUludCB9IGZyb20gXCJub2RlOmNyeXB0b1wiO1xuaW1wb3J0IHtcbiAgZGVzY3JpYmVJbnN0YWxsYXRpb25Tb3VyY2UsXG4gIGVuc3VyZUNvZGV4UGx1c1BsdXNVcGRhdGVDaGVjayxcbiAgZmFsbGJhY2tTb3VyY2VSb290LFxuICBpbnN0YWxsU3BhcmtsZVVwZGF0ZUhvb2ssXG4gIG1hcmtTZWxmVXBkYXRlU3RhcnRlZCxcbiAgc3RhcnRJbnN0YWxsZWRDbGksXG59IGZyb20gXCIuL3NlbGYtdXBkYXRlXCI7XG5pbXBvcnQge1xuICBjYWxsT3dsVmlldyxcbiAgY3JlYXRlT3dsVmlldyxcbiAgZGlzcG9zZUFsbE93bFZpZXdzLFxuICBkaXNwb3NlT3dsVmlld3NGb3JUd2VhayxcbiAgdW50cnVzdGVkV2ViQ29udGVudHNJZHMsXG59IGZyb20gXCIuL293bC12aWV3c1wiO1xuaW1wb3J0IHtcbiAgY3JlYXRlQ29kZXhXaW5kb3csXG4gIGZvY3VzQ29kZXhXaW5kb3csXG4gIGdldENvZGV4V2luZG93U2VydmljZXMsXG4gIGdldFByaW1hcnlDb2RleFdpbmRvd1JlZixcbiAgc2hvd0NvZGV4V2luZG93LFxuICB0eXBlIENvZGV4Q3JlYXRlV2luZG93T3B0aW9ucyxcbn0gZnJvbSBcIi4vY29kZXgtd2luZG93c1wiO1xuaW1wb3J0IHtcbiAgYXNzZXJ0VHdlYWtJZCxcbiAgYXNzZXJ0VHdlYWtQZXJtaXNzaW9uRm9ySWQsXG4gIGFzc2VydFR3ZWFrVmlld1Blcm1pc3Npb25Gb3JJZCxcbiAgY3VycmVudFJ1bnRpbWVDYXBhYmlsaXRpZXMsXG4gIGN1cnJlbnRSdW50aW1lSW5mbyxcbiAgZW5zdXJlVHdlYWtVcGRhdGVDaGVjayxcbiAgaW5zdGFsbEdpdGh1YlJlbGVhc2VUd2VhayxcbiAgbGlzdGVkVHdlYWtzU25hcHNob3QsXG4gIGxvYWRBbGxNYWluVHdlYWtzLFxuICBuYXRpdmVCcmlkZ2UsXG4gIHN0b3BBbGxNYWluVHdlYWtzLFxuICB0d2Vha0NvbnRleHQsXG4gIHR3ZWFrTGlmZWN5Y2xlRGVwcyxcbiAgdHdlYWtTdGF0ZSxcbn0gZnJvbSBcIi4vdHdlYWstbWFpbi1ob3N0XCI7XG5pbXBvcnQgdHlwZSB7XG4gIENvZGV4Vmlld0NyZWF0ZU9wdGlvbnMsXG4gIE5hdGl2ZUhlbHBlckxhdW5jaE9wdGlvbnMsXG4gIE5hdGl2ZU1vZHVsZUxvYWRPcHRpb25zLFxuICBOYXRpdmVQYW5lbENyZWF0ZU9wdGlvbnMsXG4gIE5hdGl2ZVZpZXdBdHRhY2hPcHRpb25zLFxufSBmcm9tIFwiQGNvZGV4LXBsdXNwbHVzL3Nka1wiO1xuXG4vLyBPcHRpb25hbDogZW5hYmxlIENocm9tZSBEZXZUb29scyBQcm90b2NvbCBvbiBhIFRDUCBwb3J0IHNvIHdlIGNhbiBkcml2ZSB0aGVcbi8vIHJ1bm5pbmcgQ29kZXggZnJvbSBvdXRzaWRlIChjdXJsIGh0dHA6Ly9sb2NhbGhvc3Q6PHBvcnQ+L2pzb24sIGF0dGFjaCB2aWFcbi8vIENEUCBXZWJTb2NrZXQsIHRha2Ugc2NyZWVuc2hvdHMsIGV2YWx1YXRlIGluIHJlbmRlcmVyLCBldGMuKS4gQ29kZXgnc1xuLy8gcHJvZHVjdGlvbiBidWlsZCBzZXRzIHdlYlByZWZlcmVuY2VzLmRldlRvb2xzPWZhbHNlLCB3aGljaCBraWxscyB0aGVcbi8vIGluLXdpbmRvdyBEZXZUb29scyBzaG9ydGN1dCwgYnV0IGAtLXJlbW90ZS1kZWJ1Z2dpbmctcG9ydGAgd29ya3MgcmVnYXJkbGVzc1xuLy8gYmVjYXVzZSBpdCdzIGEgQ2hyb21pdW0gY29tbWFuZC1saW5lIHN3aXRjaCBwcm9jZXNzZWQgYmVmb3JlIGFwcCBpbml0LlxuLy9cbi8vIE9mZiBieSBkZWZhdWx0LiBTZXQgQ09ERVhQUF9SRU1PVEVfREVCVUc9MSAob3B0aW9uYWxseSBDT0RFWFBQX1JFTU9URV9ERUJVR19QT1JUKVxuLy8gdG8gdHVybiBpdCBvbi4gTXVzdCBiZSBhcHBlbmRlZCBiZWZvcmUgYGFwcGAgYmVjb21lcyByZWFkeTsgd2UncmUgYXQgbW9kdWxlXG4vLyB0b3AtbGV2ZWwgc28gdGhhdCdzIGZpbmUuXG5pZiAocHJvY2Vzcy5lbnYuQ09ERVhQUF9SRU1PVEVfREVCVUcgPT09IFwiMVwiKSB7XG4gIGNvbnN0IHBvcnQgPSBwcm9jZXNzLmVudi5DT0RFWFBQX1JFTU9URV9ERUJVR19QT1JUID8/IFwiOTIyMlwiO1xuICBhcHAuY29tbWFuZExpbmUuYXBwZW5kU3dpdGNoKFwicmVtb3RlLWRlYnVnZ2luZy1wb3J0XCIsIHBvcnQpO1xuICBsb2coXCJpbmZvXCIsIGByZW1vdGUgZGVidWdnaW5nIGVuYWJsZWQgb24gcG9ydCAke3BvcnR9YCk7XG59XG5cbi8vIFN1cmZhY2UgdW5oYW5kbGVkIGVycm9ycyBmcm9tIGFueXdoZXJlIGluIHRoZSBtYWluIHByb2Nlc3MgdG8gb3VyIGxvZy5cbnByb2Nlc3Mub24oXCJ1bmNhdWdodEV4Y2VwdGlvblwiLCAoZTogRXJyb3IgJiB7IGNvZGU/OiBzdHJpbmcgfSkgPT4ge1xuICBsb2coXCJlcnJvclwiLCBcInVuY2F1Z2h0RXhjZXB0aW9uXCIsIHsgY29kZTogZS5jb2RlLCBtZXNzYWdlOiBlLm1lc3NhZ2UsIHN0YWNrOiBlLnN0YWNrIH0pO1xufSk7XG5wcm9jZXNzLm9uKFwidW5oYW5kbGVkUmVqZWN0aW9uXCIsIChlKSA9PiB7XG4gIGxvZyhcImVycm9yXCIsIFwidW5oYW5kbGVkUmVqZWN0aW9uXCIsIHsgdmFsdWU6IFN0cmluZyhlKSB9KTtcbn0pO1xuXG5pbnN0YWxsU3BhcmtsZVVwZGF0ZUhvb2soKTtcblxuLy8gMS4gSG9vayBldmVyeSBzZXNzaW9uIHNvIG91ciBwcmVsb2FkIHJ1bnMgaW4gZXZlcnkgcmVuZGVyZXIuXG4vL1xuLy8gV2UgdXNlIEVsZWN0cm9uJ3MgbW9kZXJuIGBzZXNzaW9uLnJlZ2lzdGVyUHJlbG9hZFNjcmlwdGAgQVBJIChhZGRlZCBpblxuLy8gRWxlY3Ryb24gMzUpLiBUaGUgZGVwcmVjYXRlZCBgc2V0UHJlbG9hZHNgIHBhdGggc2lsZW50bHkgbm8tb3BzIGluIHNvbWVcbi8vIGNvbmZpZ3VyYXRpb25zIChub3RhYmx5IHdpdGggc2FuZGJveGVkIHJlbmRlcmVycyksIHNvIHJlZ2lzdGVyUHJlbG9hZFNjcmlwdFxuLy8gaXMgdGhlIG9ubHkgcmVsaWFibGUgd2F5IHRvIGluamVjdCBpbnRvIENvZGV4J3MgQnJvd3NlcldpbmRvd3MuXG5mdW5jdGlvbiByZWdpc3RlclByZWxvYWQoczogRWxlY3Ryb24uU2Vzc2lvbiwgbGFiZWw6IHN0cmluZywga2luZDogXCJmdWxsXCIgfCBcImd1ZXN0XCIgPSBcImZ1bGxcIik6IHZvaWQge1xuICBjb25zdCBmaWxlUGF0aCA9IGtpbmQgPT09IFwiZ3Vlc3RcIiAmJiBleGlzdHNTeW5jKEdVRVNUX1BSRUxPQURfUEFUSCkgPyBHVUVTVF9QUkVMT0FEX1BBVEggOiBQUkVMT0FEX1BBVEg7XG4gIGNvbnN0IGlkID0ga2luZCA9PT0gXCJndWVzdFwiID8gXCJjb2RleC1wbHVzcGx1cy1ndWVzdFwiIDogXCJjb2RleC1wbHVzcGx1c1wiO1xuICB0cnkge1xuICAgIGNvbnN0IHN0cmF0ZWd5ID0gc2VsZWN0UHJlbG9hZFJlZ2lzdHJhdGlvbihzKTtcbiAgICBpZiAoc3RyYXRlZ3kgPT09IFwicmVnaXN0ZXJQcmVsb2FkU2NyaXB0XCIpIHtcbiAgICAgIGNvbnN0IHJlZyA9IChzIGFzIHVua25vd24gYXMge1xuICAgICAgICByZWdpc3RlclByZWxvYWRTY3JpcHQ6IChvcHRzOiB7XG4gICAgICAgICAgdHlwZT86IFwiZnJhbWVcIiB8IFwic2VydmljZS13b3JrZXJcIjtcbiAgICAgICAgICBpZD86IHN0cmluZztcbiAgICAgICAgICBmaWxlUGF0aDogc3RyaW5nO1xuICAgICAgICB9KSA9PiBzdHJpbmc7XG4gICAgICB9KS5yZWdpc3RlclByZWxvYWRTY3JpcHQ7XG4gICAgICByZWcuY2FsbChzLCB7IHR5cGU6IFwiZnJhbWVcIiwgZmlsZVBhdGgsIGlkIH0pO1xuICAgICAgbG9nKFwiaW5mb1wiLCBgcHJlbG9hZCByZWdpc3RlcmVkIChyZWdpc3RlclByZWxvYWRTY3JpcHQpIG9uICR7bGFiZWx9OmAsIGZpbGVQYXRoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHN0cmF0ZWd5ID09PSBcInNldFByZWxvYWRzXCIpIHtcbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gcy5nZXRQcmVsb2FkcygpO1xuICAgICAgaWYgKCFleGlzdGluZy5pbmNsdWRlcyhmaWxlUGF0aCkpIHtcbiAgICAgICAgcy5zZXRQcmVsb2FkcyhbLi4uZXhpc3RpbmcsIGZpbGVQYXRoXSk7XG4gICAgICB9XG4gICAgICBsb2coXCJpbmZvXCIsIGBwcmVsb2FkIHJlZ2lzdGVyZWQgKHNldFByZWxvYWRzKSBvbiAke2xhYmVsfTpgLCBmaWxlUGF0aCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxvZyhcImVycm9yXCIsIGBwcmVsb2FkIHJlZ2lzdHJhdGlvbiBvbiAke2xhYmVsfSBmYWlsZWQ6IG5vIHNlc3Npb24gcHJlbG9hZCBBUElgKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChlIGluc3RhbmNlb2YgRXJyb3IgJiYgZS5tZXNzYWdlLmluY2x1ZGVzKFwiZXhpc3RpbmcgSURcIikpIHtcbiAgICAgIGxvZyhcImluZm9cIiwgYHByZWxvYWQgYWxyZWFkeSByZWdpc3RlcmVkIG9uICR7bGFiZWx9OmAsIFBSRUxPQURfUEFUSCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxvZyhcImVycm9yXCIsIGBwcmVsb2FkIHJlZ2lzdHJhdGlvbiBvbiAke2xhYmVsfSBmYWlsZWQ6YCwgZSk7XG4gIH1cbn1cblxuYXBwLndoZW5SZWFkeSgpLnRoZW4oKCkgPT4ge1xuICBsb2coXCJpbmZvXCIsIFwiYXBwIHJlYWR5IGZpcmVkXCIpO1xuICBpZiAoaXNDb2RleFBsdXNQbHVzU2FmZU1vZGVFbmFibGVkKCkpIHtcbiAgICBsb2coXCJ3YXJuXCIsIFwic2FmZSBtb2RlIGlzIGVuYWJsZWQ7IHByZWxvYWQgd2lsbCBub3QgYmUgcmVnaXN0ZXJlZFwiKTtcbiAgICByZXR1cm47XG4gIH1cbiAgcmVnaXN0ZXJQcmVsb2FkKHNlc3Npb24uZGVmYXVsdFNlc3Npb24sIFwiZGVmYXVsdFNlc3Npb25cIiwgXCJmdWxsXCIpO1xuICBtYXliZVN0YXJ0QnJvd3NlclVpU2VydmVyKHtcbiAgICBnZXRXaW5kb3dTZXJ2aWNlczogZ2V0Q29kZXhXaW5kb3dTZXJ2aWNlcyxcbiAgICBsb2csXG4gIH0pO1xufSk7XG5cbmFwcC5vbihcInNlc3Npb24tY3JlYXRlZFwiLCAocykgPT4ge1xuICBpZiAoaXNDb2RleFBsdXNQbHVzU2FmZU1vZGVFbmFibGVkKCkpIHJldHVybjtcbiAgaWYgKHMgPT09IHNlc3Npb24uZGVmYXVsdFNlc3Npb24pIHJldHVybjtcbiAgcmVnaXN0ZXJQcmVsb2FkKHMsIFwic2Vzc2lvbi1jcmVhdGVkXCIsIFwiZ3Vlc3RcIik7XG59KTtcblxuLy8gRElBR05PU1RJQzogbG9nIGV2ZXJ5IHdlYkNvbnRlbnRzIGNyZWF0aW9uLiBVc2VmdWwgZm9yIHZlcmlmeWluZyBvdXJcbi8vIHByZWxvYWQgcmVhY2hlcyBldmVyeSByZW5kZXJlciBDb2RleCBzcGF3bnMuXG5hcHAub24oXCJ3ZWItY29udGVudHMtY3JlYXRlZFwiLCAoX2UsIHdjKSA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3Qgd3AgPSAod2MgYXMgdW5rbm93biBhcyB7IGdldExhc3RXZWJQcmVmZXJlbmNlcz86ICgpID0+IFJlY29yZDxzdHJpbmcsIHVua25vd24+IH0pXG4gICAgICAuZ2V0TGFzdFdlYlByZWZlcmVuY2VzPy4oKTtcbiAgICBsb2coXCJpbmZvXCIsIFwid2ViLWNvbnRlbnRzLWNyZWF0ZWRcIiwge1xuICAgICAgaWQ6IHdjLmlkLFxuICAgICAgdHlwZTogd2MuZ2V0VHlwZSgpLFxuICAgICAgc2Vzc2lvbklzRGVmYXVsdDogd2Muc2Vzc2lvbiA9PT0gc2Vzc2lvbi5kZWZhdWx0U2Vzc2lvbixcbiAgICAgIHNhbmRib3g6IHdwPy5zYW5kYm94LFxuICAgICAgY29udGV4dElzb2xhdGlvbjogd3A/LmNvbnRleHRJc29sYXRpb24sXG4gICAgfSk7XG4gICAgd2Mub24oXCJwcmVsb2FkLWVycm9yXCIsIChfZXYsIHAsIGVycikgPT4ge1xuICAgICAgbG9nKFwiZXJyb3JcIiwgYHdjICR7d2MuaWR9IHByZWxvYWQtZXJyb3IgcGF0aD0ke3B9YCwgU3RyaW5nKGVycj8uc3RhY2sgPz8gZXJyKSk7XG4gICAgfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2coXCJlcnJvclwiLCBcIndlYi1jb250ZW50cy1jcmVhdGVkIGhhbmRsZXIgZmFpbGVkOlwiLCBTdHJpbmcoKGUgYXMgRXJyb3IpPy5zdGFjayA/PyBlKSk7XG4gIH1cbn0pO1xuXG5sb2coXCJpbmZvXCIsIFwibWFpbi50cyBldmFsdWF0ZWQ7IGFwcC5pc1JlYWR5PVwiICsgYXBwLmlzUmVhZHkoKSk7XG5pZiAoaXNDb2RleFBsdXNQbHVzU2FmZU1vZGVFbmFibGVkKCkpIHtcbiAgbG9nKFwid2FyblwiLCBcInNhZmUgbW9kZSBpcyBlbmFibGVkOyB0d2Vha3Mgd2lsbCBub3QgYmUgbG9hZGVkXCIpO1xufVxuXG4vLyAyLiBJbml0aWFsIHR3ZWFrIGRpc2NvdmVyeSArIG1haW4tc2NvcGUgbG9hZC5cbmxvYWRBbGxNYWluVHdlYWtzKCk7XG5cbmFwcC5vbihcIndpbGwtcXVpdFwiLCAoKSA9PiB7XG4gIHN0b3BBbGxNYWluVHdlYWtzKCk7XG4gIG5hdGl2ZUJyaWRnZS5kaXNwb3NlQWxsKCk7XG4gIGRpc3Bvc2VBbGxPd2xWaWV3cygpO1xuICAvLyBCZXN0LWVmZm9ydCBmbHVzaCBvZiBhbnkgcGVuZGluZyBzdG9yYWdlIHdyaXRlcy5cbiAgZm9yIChjb25zdCB0IG9mIHR3ZWFrU3RhdGUubG9hZGVkTWFpbi52YWx1ZXMoKSkge1xuICAgIHRyeSB7XG4gICAgICB0LnN0b3JhZ2UuZmx1c2goKTtcbiAgICB9IGNhdGNoIHt9XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBwcml2aWxlZ2VkSGFuZGxlKGNoYW5uZWw6IHN0cmluZywgbGlzdGVuZXI6ICguLi5hcmdzOiBhbnlbXSkgPT4gdW5rbm93bik6IHZvaWQge1xuICBpcGNNYWluLmhhbmRsZShjaGFubmVsLCAoZXZlbnQsIC4uLmFyZ3MpID0+IHtcbiAgICBhc3NlcnRQcml2aWxlZ2VkSXBjU2VuZGVyKGNoYW5uZWwsIGV2ZW50LnNlbmRlciwgdW50cnVzdGVkV2ViQ29udGVudHNJZHMpO1xuICAgIHJldHVybiBsaXN0ZW5lcihldmVudCwgLi4uYXJncyk7XG4gIH0pO1xufVxuXG5pcGNNYWluLm9uKFwiY29kZXhwcDpwcml2aWxlZ2VkLWZyYW1lXCIsIChldmVudCkgPT4ge1xuICBldmVudC5yZXR1cm5WYWx1ZSA9IGlzUHJpdmlsZWdlZElwY1NlbmRlcihldmVudC5zZW5kZXIsIHVudHJ1c3RlZFdlYkNvbnRlbnRzSWRzKTtcbn0pO1xuXG4vLyAzLiBJUEM6IGV4cG9zZSB0d2VhayBtZXRhZGF0YSArIHJldmVhbC1pbi1maW5kZXIuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6bGlzdC10d2Vha3NcIiwgYXN5bmMgKF9lLCBvcHRzPzogeyBmb3JjZT86IGJvb2xlYW4gfSB8IGJvb2xlYW4pID0+IHtcbiAgY29uc3QgZm9yY2UgPSBvcHRzID09PSB0cnVlIHx8IChvcHRzICE9PSBudWxsICYmIHR5cGVvZiBvcHRzID09PSBcIm9iamVjdFwiICYmIG9wdHMuZm9yY2UgPT09IHRydWUpO1xuICBhd2FpdCBQcm9taXNlLmFsbCh0d2Vha1N0YXRlLmRpc2NvdmVyZWQubWFwKCh0KSA9PiBlbnN1cmVUd2Vha1VwZGF0ZUNoZWNrKHQsIGZvcmNlKSkpO1xuICByZXR1cm4gbGlzdGVkVHdlYWtzU25hcHNob3QoKTtcbn0pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Z2V0LXR3ZWFrLWVuYWJsZWRcIiwgKF9lLCBpZDogc3RyaW5nKSA9PiBpc1R3ZWFrRW5hYmxlZChpZCkpO1xuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOnNldC10d2Vhay1lbmFibGVkXCIsIChfZSwgaWQ6IHN0cmluZywgZW5hYmxlZDogYm9vbGVhbikgPT4ge1xuICByZXR1cm4gc2V0VHdlYWtFbmFibGVkQW5kUmVsb2FkKGlkLCBlbmFibGVkLCB0d2Vha0xpZmVjeWNsZURlcHMpO1xufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpnZXQtY29uZmlnXCIsICgpID0+IHtcbiAgY29uc3QgcyA9IHJlYWRTdGF0ZSgpO1xuICBjb25zdCBpbnN0YWxsZXJTdGF0ZSA9IHJlYWRJbnN0YWxsZXJTdGF0ZSgpO1xuICBjb25zdCBzb3VyY2VSb290ID0gaW5zdGFsbGVyU3RhdGU/LnNvdXJjZVJvb3QgPz8gZmFsbGJhY2tTb3VyY2VSb290KCk7XG4gIHJldHVybiB7XG4gICAgdmVyc2lvbjogQ09ERVhfUExVU1BMVVNfVkVSU0lPTixcbiAgICBhdXRvVXBkYXRlOiBpc0xheWVyQXV0b1VwZGF0ZUVuYWJsZWQocy5jb2RleFBsdXNQbHVzPy5hdXRvVXBkYXRlKSxcbiAgICBzYWZlTW9kZTogcy5jb2RleFBsdXNQbHVzPy5zYWZlTW9kZSA9PT0gdHJ1ZSxcbiAgICB1cGRhdGVDaGFubmVsOiBzLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZUNoYW5uZWwgPz8gXCJzdGFibGVcIixcbiAgICB1cGRhdGVSZXBvOiBzLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZVJlcG8gPz8gQ09ERVhfUExVU1BMVVNfUkVQTyxcbiAgICB1cGRhdGVSZWY6IHMuY29kZXhQbHVzUGx1cz8udXBkYXRlUmVmID8/IFwiXCIsXG4gICAgdXBkYXRlQ2hlY2s6IHMuY29kZXhQbHVzUGx1cz8udXBkYXRlQ2hlY2sgPz8gbnVsbCxcbiAgICBzZWxmVXBkYXRlOiByZWFkU2VsZlVwZGF0ZVN0YXRlKCksXG4gICAgaW5zdGFsbGF0aW9uU291cmNlOiBkZXNjcmliZUluc3RhbGxhdGlvblNvdXJjZShzb3VyY2VSb290KSxcbiAgfTtcbn0pO1xuXG5wcml2aWxlZ2VkSGFuZGxlKFwiY29kZXhwcDpzZXQtYXV0by11cGRhdGVcIiwgKF9lLCBlbmFibGVkOiBib29sZWFuKSA9PiB7XG4gIHNldENvZGV4UGx1c1BsdXNBdXRvVXBkYXRlKCEhZW5hYmxlZCk7XG4gIHJldHVybiB7IGF1dG9VcGRhdGU6IGlzQ29kZXhQbHVzUGx1c0F1dG9VcGRhdGVFbmFibGVkKCkgfTtcbn0pO1xuXG5wcml2aWxlZ2VkSGFuZGxlKFwiY29kZXhwcDpzZXQtdXBkYXRlLWNvbmZpZ1wiLCAoX2UsIGNvbmZpZzoge1xuICB1cGRhdGVDaGFubmVsPzogU2VsZlVwZGF0ZUNoYW5uZWw7XG4gIHVwZGF0ZVJlcG8/OiBzdHJpbmc7XG4gIHVwZGF0ZVJlZj86IHN0cmluZztcbn0pID0+IHtcbiAgc2V0Q29kZXhQbHVzUGx1c1VwZGF0ZUNvbmZpZyhzdHJpcFJlbmRlcmVyVXBkYXRlUmVwbyhjb25maWcgPz8ge30pKTtcbiAgY29uc3QgcyA9IHJlYWRTdGF0ZSgpO1xuICByZXR1cm4ge1xuICAgIHVwZGF0ZUNoYW5uZWw6IHMuY29kZXhQbHVzUGx1cz8udXBkYXRlQ2hhbm5lbCA/PyBcInN0YWJsZVwiLFxuICAgIHVwZGF0ZVJlcG86IHMuY29kZXhQbHVzUGx1cz8udXBkYXRlUmVwbyA/PyBDT0RFWF9QTFVTUExVU19SRVBPLFxuICAgIHVwZGF0ZVJlZjogcy5jb2RleFBsdXNQbHVzPy51cGRhdGVSZWYgPz8gXCJcIixcbiAgfTtcbn0pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Y2hlY2stY29kZXhwcC11cGRhdGVcIiwgYXN5bmMgKF9lLCBmb3JjZT86IGJvb2xlYW4pID0+IHtcbiAgcmV0dXJuIGVuc3VyZUNvZGV4UGx1c1BsdXNVcGRhdGVDaGVjayhmb3JjZSA9PT0gdHJ1ZSk7XG59KTtcblxucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6cnVuLWNvZGV4cHAtdXBkYXRlXCIsIGFzeW5jICgpID0+IHtcbiAgY29uc3Qgc291cmNlUm9vdCA9IHJlYWRJbnN0YWxsZXJTdGF0ZSgpPy5zb3VyY2VSb290ID8/IGZhbGxiYWNrU291cmNlUm9vdCgpO1xuICBpZiAoIXNvdXJjZVJvb3QpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb2RleCsrIHNvdXJjZSBDTEkgd2FzIG5vdCBmb3VuZC4gUnVuIHRoZSBpbnN0YWxsZXIgb25jZSwgdGhlbiB0cnkgYWdhaW4uXCIpO1xuICB9XG4gIGNvbnN0IGNsaSA9IGpvaW4oc291cmNlUm9vdCwgXCJwYWNrYWdlc1wiLCBcImluc3RhbGxlclwiLCBcImRpc3RcIiwgXCJjbGkuanNcIik7XG4gIGlmICghZXhpc3RzU3luYyhjbGkpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ29kZXgrKyBzb3VyY2UgQ0xJIHdhcyBub3QgZm91bmQuIFJ1biB0aGUgaW5zdGFsbGVyIG9uY2UsIHRoZW4gdHJ5IGFnYWluLlwiKTtcbiAgfVxuICBjb25zdCBwZW5kaW5nID0gbWFya1NlbGZVcGRhdGVTdGFydGVkKHNvdXJjZVJvb3QpO1xuICBzdGFydEluc3RhbGxlZENsaShjbGksIFtcInVwZGF0ZVwiLCBcIi0td2F0Y2hlclwiXSk7XG4gIHJldHVybiBwZW5kaW5nO1xufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpnZXQtd2F0Y2hlci1oZWFsdGhcIiwgKCkgPT4gZ2V0V2F0Y2hlckhlYWx0aCh1c2VyUm9vdCEpKTtcblxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmdldC10d2Vhay1zdG9yZVwiLCBhc3luYyAoKSA9PiB7XG4gIGNvbnN0IHN0b3JlID0gYXdhaXQgZmV0Y2hUd2Vha1N0b3JlUmVnaXN0cnkoKTtcbiAgY29uc3QgcmVnaXN0cnkgPSBzdG9yZS5yZWdpc3RyeTtcbiAgY29uc3QgaW5zdGFsbGVkID0gbmV3IE1hcCh0d2Vha1N0YXRlLmRpc2NvdmVyZWQubWFwKCh0KSA9PiBbdC5tYW5pZmVzdC5pZCwgdF0pKTtcbiAgY29uc3QgZW50cmllcyA9IHNodWZmbGVTdG9yZUVudHJpZXMocmVnaXN0cnkuZW50cmllcywgcmFuZG9tSW50KTtcbiAgcmV0dXJuIHtcbiAgICAuLi5yZWdpc3RyeSxcbiAgICBzb3VyY2VVcmw6IFRXRUFLX1NUT1JFX0lOREVYX1VSTCxcbiAgICBmZXRjaGVkQXQ6IHN0b3JlLmZldGNoZWRBdCxcbiAgICBlbnRyaWVzOiBlbnRyaWVzLm1hcCgoZW50cnkpID0+IHtcbiAgICAgIGNvbnN0IGxvY2FsID0gaW5zdGFsbGVkLmdldChlbnRyeS5pZCk7XG4gICAgICBjb25zdCBwbGF0Zm9ybSA9IHN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGliaWxpdHkoZW50cnkpO1xuICAgICAgY29uc3QgcnVudGltZSA9IHN0b3JlRW50cnlSdW50aW1lQ29tcGF0aWJpbGl0eShlbnRyeSk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi5lbnRyeSxcbiAgICAgICAgcGxhdGZvcm0sXG4gICAgICAgIHJ1bnRpbWUsXG4gICAgICAgIGluc3RhbGxlZDogbG9jYWxcbiAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgdmVyc2lvbjogbG9jYWwubWFuaWZlc3QudmVyc2lvbixcbiAgICAgICAgICAgICAgZW5hYmxlZDogaXNUd2Vha0VuYWJsZWQobG9jYWwubWFuaWZlc3QuaWQpLFxuICAgICAgICAgICAgfVxuICAgICAgICAgIDogbnVsbCxcbiAgICAgIH07XG4gICAgfSksXG4gIH07XG59KTtcblxucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6aW5zdGFsbC1zdG9yZS10d2Vha1wiLCBhc3luYyAoX2UsIGlkOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgeyByZWdpc3RyeSB9ID0gYXdhaXQgZmV0Y2hUd2Vha1N0b3JlUmVnaXN0cnkoKTtcbiAgY29uc3QgZW50cnkgPSByZWdpc3RyeS5lbnRyaWVzLmZpbmQoKGNhbmRpZGF0ZSkgPT4gY2FuZGlkYXRlLmlkID09PSBpZCk7XG4gIGlmICghZW50cnkpIHRocm93IG5ldyBFcnJvcihgVHdlYWsgc3RvcmUgZW50cnkgbm90IGZvdW5kOiAke2lkfWApO1xuICBhc3NlcnRTdG9yZUVudHJ5UGxhdGZvcm1Db21wYXRpYmxlKGVudHJ5KTtcbiAgYXNzZXJ0U3RvcmVFbnRyeVJ1bnRpbWVDb21wYXRpYmxlKGVudHJ5KTtcbiAgYXdhaXQgaW5zdGFsbFN0b3JlVHdlYWsoZW50cnkpO1xuICByZWxvYWRUd2Vha3MoXCJzdG9yZS1pbnN0YWxsXCIsIHR3ZWFrTGlmZWN5Y2xlRGVwcyk7XG4gIHJldHVybiB7IGluc3RhbGxlZDogZW50cnkuaWQgfTtcbn0pO1xuXG5wcml2aWxlZ2VkSGFuZGxlKFwiY29kZXhwcDppbnN0YWxsLWdpdGh1Yi10d2Vha1wiLCBhc3luYyAoX2UsIGlkOiBzdHJpbmcpID0+IHtcbiAgcmV0dXJuIGluc3RhbGxHaXRodWJSZWxlYXNlVHdlYWsoaWQpO1xufSk7XG5cbnByaXZpbGVnZWRIYW5kbGUoXCJjb2RleHBwOnByZXBhcmUtdHdlYWstc3RvcmUtc3VibWlzc2lvblwiLCBhc3luYyAoX2UsIHJlcG9JbnB1dDogc3RyaW5nKSA9PiB7XG4gIHJldHVybiBwcmVwYXJlVHdlYWtTdG9yZVN1Ym1pc3Npb24ocmVwb0lucHV0KTtcbn0pO1xuXG4vLyBTYW5kYm94ZWQgcmVuZGVyZXIgcHJlbG9hZCBjYW4ndCB1c2UgTm9kZSBmcyB0byByZWFkIHR3ZWFrIHNvdXJjZS4gTWFpblxuLy8gcmVhZHMgaXQgb24gdGhlIHJlbmRlcmVyJ3MgYmVoYWxmLiBQYXRoIG11c3QgbGl2ZSB1bmRlciB0d2Vha3NEaXIgZm9yXG4vLyBzZWN1cml0eSBcdTIwMTQgd2UgcmVmdXNlIGFueXRoaW5nIGVsc2UuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6cmVhZC10d2Vhay1zb3VyY2VcIiwgKF9lLCBlbnRyeVBhdGg6IHN0cmluZykgPT4ge1xuICBjb25zdCByZXNvbHZlZCA9IHJlc29sdmUoZW50cnlQYXRoKTtcbiAgaWYgKCFpc1BhdGhJbnNpZGUoVFdFQUtTX0RJUiwgcmVzb2x2ZWQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwicGF0aCBvdXRzaWRlIHR3ZWFrcyBkaXJcIik7XG4gIH1cbiAgcmV0dXJuIHJlcXVpcmUoXCJub2RlOmZzXCIpLnJlYWRGaWxlU3luYyhyZXNvbHZlZCwgXCJ1dGY4XCIpO1xufSk7XG5cbi8qKlxuICogUmVhZCBhbiBhcmJpdHJhcnkgYXNzZXQgZmlsZSBmcm9tIGluc2lkZSBhIHR3ZWFrJ3MgZGlyZWN0b3J5IGFuZCByZXR1cm4gaXRcbiAqIGFzIGEgYGRhdGE6YCBVUkwuIFVzZWQgYnkgdGhlIHNldHRpbmdzIGluamVjdG9yIHRvIHJlbmRlciBtYW5pZmVzdCBpY29uc1xuICogKHRoZSByZW5kZXJlciBpcyBzYW5kYm94ZWQ7IGBmaWxlOi8vYCB3b24ndCBsb2FkKS5cbiAqXG4gKiBTZWN1cml0eTogY2FsbGVyIHBhc3NlcyBgdHdlYWtEaXJgIGFuZCBgcmVsUGF0aGA7IHdlICgxKSByZXF1aXJlIHR3ZWFrRGlyXG4gKiB0byBsaXZlIHVuZGVyIFRXRUFLU19ESVIsICgyKSByZXNvbHZlIHJlbFBhdGggYWdhaW5zdCBpdCBhbmQgcmUtY2hlY2sgdGhlXG4gKiByZXN1bHQgc3RpbGwgbGl2ZXMgdW5kZXIgVFdFQUtTX0RJUiwgKDMpIGNhcCBvdXRwdXQgc2l6ZSBhdCAxIE1pQi5cbiAqL1xuY29uc3QgQVNTRVRfTUFYX0JZVEVTID0gMTAyNCAqIDEwMjQ7XG5jb25zdCBNSU1FX0JZX0VYVDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgXCIucG5nXCI6IFwiaW1hZ2UvcG5nXCIsXG4gIFwiLmpwZ1wiOiBcImltYWdlL2pwZWdcIixcbiAgXCIuanBlZ1wiOiBcImltYWdlL2pwZWdcIixcbiAgXCIuZ2lmXCI6IFwiaW1hZ2UvZ2lmXCIsXG4gIFwiLndlYnBcIjogXCJpbWFnZS93ZWJwXCIsXG4gIFwiLnN2Z1wiOiBcImltYWdlL3N2Zyt4bWxcIixcbiAgXCIuaWNvXCI6IFwiaW1hZ2UveC1pY29uXCIsXG59O1xuaXBjTWFpbi5oYW5kbGUoXG4gIFwiY29kZXhwcDpyZWFkLXR3ZWFrLWFzc2V0XCIsXG4gIChfZSwgdHdlYWtEaXI6IHN0cmluZywgcmVsUGF0aDogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgZnMgPSByZXF1aXJlKFwibm9kZTpmc1wiKSBhcyB0eXBlb2YgaW1wb3J0KFwibm9kZTpmc1wiKTtcbiAgICBjb25zdCBkaXIgPSByZXNvbHZlKHR3ZWFrRGlyKTtcbiAgICBpZiAoIWlzUGF0aEluc2lkZShUV0VBS1NfRElSLCBkaXIpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ0d2Vha0RpciBvdXRzaWRlIHR3ZWFrcyBkaXJcIik7XG4gICAgfVxuICAgIGNvbnN0IGZ1bGwgPSByZXNvbHZlKGRpciwgcmVsUGF0aCk7XG4gICAgaWYgKCFpc1BhdGhJbnNpZGUoZGlyLCBmdWxsKSB8fCBmdWxsID09PSBkaXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcInBhdGggdHJhdmVyc2FsXCIpO1xuICAgIH1cbiAgICBjb25zdCBzdGF0ID0gZnMuc3RhdFN5bmMoZnVsbCk7XG4gICAgaWYgKHN0YXQuc2l6ZSA+IEFTU0VUX01BWF9CWVRFUykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBhc3NldCB0b28gbGFyZ2UgKCR7c3RhdC5zaXplfSA+ICR7QVNTRVRfTUFYX0JZVEVTfSlgKTtcbiAgICB9XG4gICAgY29uc3QgZXh0ID0gZnVsbC5zbGljZShmdWxsLmxhc3RJbmRleE9mKFwiLlwiKSkudG9Mb3dlckNhc2UoKTtcbiAgICBjb25zdCBtaW1lID0gTUlNRV9CWV9FWFRbZXh0XSA/PyBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiO1xuICAgIGNvbnN0IGJ1ZiA9IGZzLnJlYWRGaWxlU3luYyhmdWxsKTtcbiAgICByZXR1cm4gYGRhdGE6JHttaW1lfTtiYXNlNjQsJHtidWYudG9TdHJpbmcoXCJiYXNlNjRcIil9YDtcbiAgfSxcbik7XG5cbi8vIFNhbmRib3hlZCBwcmVsb2FkIGNhbid0IHdyaXRlIGxvZ3MgdG8gZGlzazsgZm9yd2FyZCB0byB1cyB2aWEgSVBDLlxuaXBjTWFpbi5vbihcImNvZGV4cHA6cHJlbG9hZC1sb2dcIiwgKF9lLCBsZXZlbDogXCJpbmZvXCIgfCBcIndhcm5cIiB8IFwiZXJyb3JcIiwgbXNnOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgbHZsID0gbGV2ZWwgPT09IFwiZXJyb3JcIiB8fCBsZXZlbCA9PT0gXCJ3YXJuXCIgPyBsZXZlbCA6IFwiaW5mb1wiO1xuICB0cnkge1xuICAgIGFwcGVuZENhcHBlZExvZyhqb2luKExPR19ESVIsIFwicHJlbG9hZC5sb2dcIiksIGBbJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCl9XSBbJHtsdmx9XSAke21zZ31cXG5gKTtcbiAgfSBjYXRjaCB7fVxufSk7XG5cbi8vIFNhbmRib3gtc2FmZSBmaWxlc3lzdGVtIG9wcyBmb3IgcmVuZGVyZXItc2NvcGUgdHdlYWtzLiBFYWNoIHR3ZWFrIGdldHNcbi8vIGEgc2FuZGJveGVkIGRpciB1bmRlciB1c2VyUm9vdC90d2Vhay1kYXRhLzxpZD4uIFJlbmRlcmVyIHNpZGUgY2FsbHMgdGhlc2Vcbi8vIG92ZXIgSVBDIGluc3RlYWQgb2YgdXNpbmcgTm9kZSBmcyBkaXJlY3RseS5cbnByaXZpbGVnZWRIYW5kbGUoXCJjb2RleHBwOnR3ZWFrLWZzXCIsIChfZSwgb3A6IHN0cmluZywgaWQ6IHN0cmluZywgcDogc3RyaW5nLCBjPzogc3RyaW5nKSA9PiB7XG4gIGlmICghL15bYS16QS1aMC05Ll8tXSskLy50ZXN0KGlkKSkgdGhyb3cgbmV3IEVycm9yKFwiYmFkIHR3ZWFrIGlkXCIpO1xuICBjb25zdCBkaXIgPSBqb2luKHVzZXJSb290ISwgXCJ0d2Vhay1kYXRhXCIsIGlkKTtcbiAgbWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gIGNvbnN0IGZ1bGwgPSByZXNvbHZlKGRpciwgcCk7XG4gIGlmICghaXNQYXRoSW5zaWRlKGRpciwgZnVsbCkgfHwgZnVsbCA9PT0gZGlyKSB0aHJvdyBuZXcgRXJyb3IoXCJwYXRoIHRyYXZlcnNhbFwiKTtcbiAgY29uc3QgZnMgPSByZXF1aXJlKFwibm9kZTpmc1wiKSBhcyB0eXBlb2YgaW1wb3J0KFwibm9kZTpmc1wiKTtcbiAgc3dpdGNoIChvcCkge1xuICAgIGNhc2UgXCJyZWFkXCI6IHJldHVybiBmcy5yZWFkRmlsZVN5bmMoZnVsbCwgXCJ1dGY4XCIpO1xuICAgIGNhc2UgXCJ3cml0ZVwiOiByZXR1cm4gZnMud3JpdGVGaWxlU3luYyhmdWxsLCBjID8/IFwiXCIsIFwidXRmOFwiKTtcbiAgICBjYXNlIFwiZXhpc3RzXCI6IHJldHVybiBmcy5leGlzdHNTeW5jKGZ1bGwpO1xuICAgIGNhc2UgXCJkYXRhRGlyXCI6IHJldHVybiBkaXI7XG4gICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIG9wOiAke29wfWApO1xuICB9XG59KTtcblxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOnVzZXItcGF0aHNcIiwgKCkgPT4gKHtcbiAgdXNlclJvb3QsXG4gIHJ1bnRpbWVEaXIsXG4gIHR3ZWFrc0RpcjogVFdFQUtTX0RJUixcbiAgbG9nRGlyOiBMT0dfRElSLFxufSkpO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Y29kZXgtcnVudGltZS1pbmZvXCIsICgpID0+IGN1cnJlbnRSdW50aW1lSW5mbygpKTtcbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpjb2RleC1ydW50aW1lLWNhcGFiaWxpdGllc1wiLCAoKSA9PiBjdXJyZW50UnVudGltZUNhcGFiaWxpdGllcygpKTtcbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpjb2RleC1jZHAtc3RhdHVzXCIsICgpID0+IGdldENkcFN0YXR1cygpKTtcbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpjb2RleC1jZHAtdGFyZ2V0c1wiLCAoKSA9PiBsaXN0Q2RwVGFyZ2V0cygpKTtcbnByaXZpbGVnZWRIYW5kbGUoXCJjb2RleHBwOmNvZGV4LXdpbmRvdy1jcmVhdGVcIiwgKF9lLCBvcHRzOiBDb2RleENyZWF0ZVdpbmRvd09wdGlvbnMpID0+IHtcbiAgcmV0dXJuIGNyZWF0ZUNvZGV4V2luZG93KG9wdHMpO1xufSk7XG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Y29kZXgtd2luZG93LXByaW1hcnlcIiwgKCkgPT4gZ2V0UHJpbWFyeUNvZGV4V2luZG93UmVmKCkpO1xuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmNvZGV4LXdpbmRvdy1mb2N1c1wiLCAoX2UsIHdpbmRvd0lkOiBudW1iZXIpID0+IGZvY3VzQ29kZXhXaW5kb3cod2luZG93SWQpKTtcbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpjb2RleC13aW5kb3ctc2hvd1wiLCAoX2UsIHdpbmRvd0lkOiBudW1iZXIpID0+IHNob3dDb2RleFdpbmRvdyh3aW5kb3dJZCkpO1xucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6Y29kZXgtdmlldy1jcmVhdGVcIixcbiAgYXN5bmMgKF9lLCB0d2Vha0lkOiBzdHJpbmcsIG9wdGlvbnM6IENvZGV4Vmlld0NyZWF0ZU9wdGlvbnMpID0+IHtcbiAgICBjb25zdCB0d2VhayA9IGFzc2VydFR3ZWFrVmlld1Blcm1pc3Npb25Gb3JJZCh0d2Vha0lkKTtcbiAgICBjb25zdCByZWYgPSBhd2FpdCBjcmVhdGVPd2xWaWV3KHsgaWQ6IHR3ZWFrLm1hbmlmZXN0LmlkLCBkaXI6IHR3ZWFrLmRpciB9LCBvcHRpb25zKTtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHJlZi5pZCxcbiAgICAgIHdlYkNvbnRlbnRzSWQ6IHJlZi53ZWJDb250ZW50c0lkLFxuICAgICAgcGFyZW50V2luZG93SWQ6IHJlZi5wYXJlbnRXaW5kb3dJZCxcbiAgICB9O1xuICB9LFxuKTtcbnByaXZpbGVnZWRIYW5kbGUoXCJjb2RleHBwOmNvZGV4LXZpZXctY2FsbFwiLFxuICAoX2UsIHR3ZWFrSWQ6IHN0cmluZywgdmlld0lkOiBzdHJpbmcsIG1ldGhvZDogc3RyaW5nLCBhcmc/OiB1bmtub3duLCBhcmcyPzogdW5rbm93bikgPT4ge1xuICAgIGFzc2VydFR3ZWFrVmlld1Blcm1pc3Npb25Gb3JJZCh0d2Vha0lkKTtcbiAgICByZXR1cm4gY2FsbE93bFZpZXcodHdlYWtJZCwgdmlld0lkLCBtZXRob2QsIGFyZywgYXJnMik7XG4gIH0sXG4pO1xuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmNvZGV4LXZpZXctZGlzcG9zZS10d2Vha1wiLCAoX2UsIHR3ZWFrSWQ6IHN0cmluZykgPT4ge1xuICBhc3NlcnRUd2Vha0lkKHR3ZWFrSWQpO1xuICBkaXNwb3NlT3dsVmlld3NGb3JUd2Vhayh0d2Vha0lkKTtcbn0pO1xucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6bmF0aXZlLWxvYWQtbW9kdWxlXCIsXG4gIChfZSwgdHdlYWtJZDogc3RyaW5nLCBvcHRpb25zOiBOYXRpdmVNb2R1bGVMb2FkT3B0aW9ucykgPT4ge1xuICAgIGNvbnN0IHJlZiA9IG5hdGl2ZUJyaWRnZS5sb2FkTW9kdWxlKHR3ZWFrQ29udGV4dCh0d2Vha0lkLCBcIm5hdGl2ZS1tb2R1bGVcIiksIG9wdGlvbnMpO1xuICAgIHJldHVybiB7IGlkOiByZWYuaWQsIGtpbmQ6IHJlZi5raW5kIH07XG4gIH0sXG4pO1xucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6bmF0aXZlLW1vZHVsZS1yZXF1ZXN0XCIsXG4gIChfZSwgdHdlYWtJZDogc3RyaW5nLCBtb2R1bGVJZDogc3RyaW5nLCBtZXRob2Q6IHN0cmluZywgcGF5bG9hZD86IHVua25vd24sIHRpbWVvdXRNcz86IG51bWJlcikgPT4ge1xuICAgIGFzc2VydFR3ZWFrUGVybWlzc2lvbkZvcklkKHR3ZWFrSWQsIFwibmF0aXZlLW1vZHVsZVwiKTtcbiAgICByZXR1cm4gbmF0aXZlQnJpZGdlLnJlcXVlc3RNb2R1bGUodHdlYWtJZCwgbW9kdWxlSWQsIG1ldGhvZCwgcGF5bG9hZCwgdGltZW91dE1zKTtcbiAgfSxcbik7XG5wcml2aWxlZ2VkSGFuZGxlKFwiY29kZXhwcDpuYXRpdmUtbW9kdWxlLWRpc3Bvc2VcIiwgKF9lLCB0d2Vha0lkOiBzdHJpbmcsIG1vZHVsZUlkOiBzdHJpbmcpID0+IHtcbiAgYXNzZXJ0VHdlYWtQZXJtaXNzaW9uRm9ySWQodHdlYWtJZCwgXCJuYXRpdmUtbW9kdWxlXCIpO1xuICByZXR1cm4gbmF0aXZlQnJpZGdlLmRpc3Bvc2VNb2R1bGUodHdlYWtJZCwgbW9kdWxlSWQpO1xufSk7XG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6bmF0aXZlLWRpc3Bvc2UtdHdlYWtcIiwgKF9lLCB0d2Vha0lkOiBzdHJpbmcpID0+IHtcbiAgYXNzZXJ0VHdlYWtJZCh0d2Vha0lkKTtcbiAgbmF0aXZlQnJpZGdlLmRpc3Bvc2VUd2Vhayh0d2Vha0lkKTtcbn0pO1xucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6bmF0aXZlLWNyZWF0ZS1wYW5lbFwiLFxuICBhc3luYyAoX2UsIHR3ZWFrSWQ6IHN0cmluZywgb3B0aW9uczogTmF0aXZlUGFuZWxDcmVhdGVPcHRpb25zKSA9PiB7XG4gICAgY29uc3QgcmVmID0gYXdhaXQgbmF0aXZlQnJpZGdlLmNyZWF0ZVBhbmVsKHR3ZWFrQ29udGV4dCh0d2Vha0lkLCBcIm5hdGl2ZS12aWV3XCIpLCBvcHRpb25zKTtcbiAgICByZXR1cm4geyBpZDogcmVmLmlkLCB3aW5kb3dJZDogcmVmLndpbmRvd0lkIH07XG4gIH0sXG4pO1xucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6bmF0aXZlLWF0dGFjaC12aWV3XCIsXG4gIGFzeW5jIChfZSwgdHdlYWtJZDogc3RyaW5nLCBvcHRpb25zOiBOYXRpdmVWaWV3QXR0YWNoT3B0aW9ucykgPT4ge1xuICAgIGNvbnN0IHJlZiA9IGF3YWl0IG5hdGl2ZUJyaWRnZS5hdHRhY2hWaWV3KHR3ZWFrQ29udGV4dCh0d2Vha0lkLCBcIm5hdGl2ZS12aWV3XCIpLCBvcHRpb25zKTtcbiAgICByZXR1cm4geyBpZDogcmVmLmlkIH07XG4gIH0sXG4pO1xucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6bmF0aXZlLWluc3RhbmNlLWNhbGxcIixcbiAgYXN5bmMgKF9lLCB0d2Vha0lkOiBzdHJpbmcsIGtpbmQ6IFwicGFuZWxcIiB8IFwidmlld1wiLCBpbnN0YW5jZUlkOiBzdHJpbmcsIG1ldGhvZDogc3RyaW5nLCBhcmc/OiB1bmtub3duKSA9PiB7XG4gICAgYXNzZXJ0VHdlYWtQZXJtaXNzaW9uRm9ySWQodHdlYWtJZCwgXCJuYXRpdmUtdmlld1wiKTtcbiAgICByZXR1cm4gbmF0aXZlQnJpZGdlLmNhbGxJbnN0YW5jZSh0d2Vha0lkLCBraW5kLCBpbnN0YW5jZUlkLCBtZXRob2QsIGFyZyk7XG4gIH0sXG4pO1xucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6bmF0aXZlLWxhdW5jaC1oZWxwZXJcIixcbiAgKF9lLCB0d2Vha0lkOiBzdHJpbmcsIG9wdGlvbnM6IE5hdGl2ZUhlbHBlckxhdW5jaE9wdGlvbnMpID0+IHtcbiAgICBjb25zdCByZWYgPSBuYXRpdmVCcmlkZ2UubGF1bmNoSGVscGVyKHR3ZWFrQ29udGV4dCh0d2Vha0lkLCBcIm5hdGl2ZS1oZWxwZXJcIiksIG9wdGlvbnMpO1xuICAgIHJldHVybiB7IGlkOiByZWYuaWQsIHBpZDogcmVmLnBpZCB9O1xuICB9LFxuKTtcbnByaXZpbGVnZWRIYW5kbGUoXCJjb2RleHBwOm5hdGl2ZS1oZWxwZXItY2FsbFwiLFxuICAoX2UsIHR3ZWFrSWQ6IHN0cmluZywgaGVscGVySWQ6IHN0cmluZywgbWV0aG9kOiBzdHJpbmcsIHBheWxvYWQ/OiB1bmtub3duLCB0aW1lb3V0TXM/OiBudW1iZXIpID0+IHtcbiAgICBhc3NlcnRUd2Vha1Blcm1pc3Npb25Gb3JJZCh0d2Vha0lkLCBcIm5hdGl2ZS1oZWxwZXJcIik7XG4gICAgcmV0dXJuIG5hdGl2ZUJyaWRnZS5jYWxsSGVscGVyKHR3ZWFrSWQsIGhlbHBlcklkLCBtZXRob2QsIHBheWxvYWQsIHRpbWVvdXRNcyk7XG4gIH0sXG4pO1xuXG5wcml2aWxlZ2VkSGFuZGxlKFwiY29kZXhwcDpyZXZlYWxcIiwgKF9lLCBwOiBzdHJpbmcpID0+IHtcbiAgc2hlbGwub3BlblBhdGgocCkuY2F0Y2goKCkgPT4ge30pO1xufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpvcGVuLWV4dGVybmFsXCIsIChfZSwgdXJsOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgcGFyc2VkID0gbmV3IFVSTCh1cmwpO1xuICBpZiAocGFyc2VkLnByb3RvY29sICE9PSBcImh0dHBzOlwiIHx8IHBhcnNlZC5ob3N0bmFtZSAhPT0gXCJnaXRodWIuY29tXCIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJvbmx5IGdpdGh1Yi5jb20gbGlua3MgY2FuIGJlIG9wZW5lZCBmcm9tIHR3ZWFrIG1ldGFkYXRhXCIpO1xuICB9XG4gIHNoZWxsLm9wZW5FeHRlcm5hbChwYXJzZWQudG9TdHJpbmcoKSkuY2F0Y2goKCkgPT4ge30pO1xufSk7XG5cbnByaXZpbGVnZWRIYW5kbGUoXCJjb2RleHBwOmNvcHktdGV4dFwiLCAoX2UsIHRleHQ6IHN0cmluZykgPT4ge1xuICBjbGlwYm9hcmQud3JpdGVUZXh0KFN0cmluZyh0ZXh0KSk7XG4gIHJldHVybiB0cnVlO1xufSk7XG5cbi8vIE1hbnVhbCBmb3JjZS1yZWxvYWQgdHJpZ2dlciBmcm9tIHRoZSByZW5kZXJlciAoZS5nLiB0aGUgXCJGb3JjZSBSZWxvYWRcIlxuLy8gYnV0dG9uIG9uIG91ciBpbmplY3RlZCBUd2Vha3MgcGFnZSkuIEJ5cGFzc2VzIHRoZSB3YXRjaGVyIGRlYm91bmNlLlxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOnJlbG9hZC10d2Vha3NcIiwgKCkgPT4ge1xuICByZWxvYWRUd2Vha3MoXCJtYW51YWxcIiwgdHdlYWtMaWZlY3ljbGVEZXBzKTtcbiAgcmV0dXJuIHsgYXQ6IERhdGUubm93KCksIGNvdW50OiB0d2Vha1N0YXRlLmRpc2NvdmVyZWQubGVuZ3RoIH07XG59KTtcblxuLy8gNC4gRmlsZXN5c3RlbSB3YXRjaGVyIFx1MjE5MiBkZWJvdW5jZWQgcmVsb2FkICsgYnJvYWRjYXN0LlxuLy8gICAgV2Ugd2F0Y2ggdGhlIHR3ZWFrcyBkaXIgZm9yIGFueSBjaGFuZ2UuIE9uIHRoZSBmaXJzdCB0aWNrIG9mIGluYWN0aXZpdHlcbi8vICAgIHdlIHN0b3AgbWFpbi1zaWRlIHR3ZWFrcywgY2xlYXIgdGhlaXIgY2FjaGVkIG1vZHVsZXMsIHJlLWRpc2NvdmVyLCB0aGVuXG4vLyAgICByZXN0YXJ0IGFuZCBicm9hZGNhc3QgYGNvZGV4cHA6dHdlYWtzLWNoYW5nZWRgIHRvIGV2ZXJ5IHJlbmRlcmVyIHNvIGl0XG4vLyAgICBjYW4gcmUtaW5pdCBpdHMgaG9zdC5cbmNvbnN0IFJFTE9BRF9ERUJPVU5DRV9NUyA9IDI1MDtcbmxldCByZWxvYWRUaW1lcjogTm9kZUpTLlRpbWVvdXQgfCBudWxsID0gbnVsbDtcbmZ1bmN0aW9uIHNjaGVkdWxlUmVsb2FkKHJlYXNvbjogc3RyaW5nKTogdm9pZCB7XG4gIGlmIChyZWxvYWRUaW1lcikgY2xlYXJUaW1lb3V0KHJlbG9hZFRpbWVyKTtcbiAgcmVsb2FkVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICByZWxvYWRUaW1lciA9IG51bGw7XG4gICAgcmVsb2FkVHdlYWtzKHJlYXNvbiwgdHdlYWtMaWZlY3ljbGVEZXBzKTtcbiAgfSwgUkVMT0FEX0RFQk9VTkNFX01TKTtcbn1cblxudHJ5IHtcbiAgY29uc3Qgd2F0Y2hlciA9IGNob2tpZGFyLndhdGNoKFRXRUFLU19ESVIsIHtcbiAgICBpZ25vcmVJbml0aWFsOiB0cnVlLFxuICAgIC8vIFdhaXQgZm9yIGZpbGVzIHRvIHNldHRsZSBiZWZvcmUgdHJpZ2dlcmluZyBcdTIwMTQgZ3VhcmRzIGFnYWluc3QgcGFydGlhbGx5XG4gICAgLy8gd3JpdHRlbiB0d2VhayBmaWxlcyBkdXJpbmcgZWRpdG9yIHNhdmVzIC8gZ2l0IGNoZWNrb3V0cy5cbiAgICBhd2FpdFdyaXRlRmluaXNoOiB7IHN0YWJpbGl0eVRocmVzaG9sZDogMTUwLCBwb2xsSW50ZXJ2YWw6IDUwIH0sXG4gICAgLy8gQXZvaWQgZWF0aW5nIENQVSBvbiBodWdlIG5vZGVfbW9kdWxlcyB0cmVlcyBpbnNpZGUgdHdlYWsgZm9sZGVycy5cbiAgICBpZ25vcmVkOiAocCkgPT4gcC5pbmNsdWRlcyhgJHtUV0VBS1NfRElSfS9gKSAmJiAvXFwvbm9kZV9tb2R1bGVzXFwvLy50ZXN0KHApLFxuICB9KTtcbiAgd2F0Y2hlci5vbihcImFsbFwiLCAoZXZlbnQsIHBhdGgpID0+IHNjaGVkdWxlUmVsb2FkKGAke2V2ZW50fSAke3BhdGh9YCkpO1xuICB3YXRjaGVyLm9uKFwiZXJyb3JcIiwgKGUpID0+IGxvZyhcIndhcm5cIiwgXCJ3YXRjaGVyIGVycm9yOlwiLCBlKSk7XG4gIGxvZyhcImluZm9cIiwgXCJ3YXRjaGluZ1wiLCBUV0VBS1NfRElSKTtcbiAgYXBwLm9uKFwid2lsbC1xdWl0XCIsICgpID0+IHdhdGNoZXIuY2xvc2UoKS5jYXRjaCgoKSA9PiB7fSkpO1xufSBjYXRjaCAoZSkge1xuICBsb2coXCJlcnJvclwiLCBcImZhaWxlZCB0byBzdGFydCB3YXRjaGVyOlwiLCBlKTtcbn1cbiIsICIvKiEgY2hva2lkYXIgLSBNSVQgTGljZW5zZSAoYykgMjAxMiBQYXVsIE1pbGxlciAocGF1bG1pbGxyLmNvbSkgKi9cbmltcG9ydCB7IHN0YXQgYXMgc3RhdGNiIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgc3RhdCwgcmVhZGRpciB9IGZyb20gJ2ZzL3Byb21pc2VzJztcbmltcG9ydCB7IEV2ZW50RW1pdHRlciB9IGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQgKiBhcyBzeXNQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgcmVhZGRpcnAgfSBmcm9tICdyZWFkZGlycCc7XG5pbXBvcnQgeyBOb2RlRnNIYW5kbGVyLCBFVkVOVFMgYXMgRVYsIGlzV2luZG93cywgaXNJQk1pLCBFTVBUWV9GTiwgU1RSX0NMT1NFLCBTVFJfRU5ELCB9IGZyb20gJy4vaGFuZGxlci5qcyc7XG5jb25zdCBTTEFTSCA9ICcvJztcbmNvbnN0IFNMQVNIX1NMQVNIID0gJy8vJztcbmNvbnN0IE9ORV9ET1QgPSAnLic7XG5jb25zdCBUV09fRE9UUyA9ICcuLic7XG5jb25zdCBTVFJJTkdfVFlQRSA9ICdzdHJpbmcnO1xuY29uc3QgQkFDS19TTEFTSF9SRSA9IC9cXFxcL2c7XG5jb25zdCBET1VCTEVfU0xBU0hfUkUgPSAvXFwvXFwvLztcbmNvbnN0IERPVF9SRSA9IC9cXC4uKlxcLihzd1tweF0pJHx+JHxcXC5zdWJsLipcXC50bXAvO1xuY29uc3QgUkVQTEFDRVJfUkUgPSAvXlxcLlsvXFxcXF0vO1xuZnVuY3Rpb24gYXJyaWZ5KGl0ZW0pIHtcbiAgICByZXR1cm4gQXJyYXkuaXNBcnJheShpdGVtKSA/IGl0ZW0gOiBbaXRlbV07XG59XG5jb25zdCBpc01hdGNoZXJPYmplY3QgPSAobWF0Y2hlcikgPT4gdHlwZW9mIG1hdGNoZXIgPT09ICdvYmplY3QnICYmIG1hdGNoZXIgIT09IG51bGwgJiYgIShtYXRjaGVyIGluc3RhbmNlb2YgUmVnRXhwKTtcbmZ1bmN0aW9uIGNyZWF0ZVBhdHRlcm4obWF0Y2hlcikge1xuICAgIGlmICh0eXBlb2YgbWF0Y2hlciA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgcmV0dXJuIG1hdGNoZXI7XG4gICAgaWYgKHR5cGVvZiBtYXRjaGVyID09PSAnc3RyaW5nJylcbiAgICAgICAgcmV0dXJuIChzdHJpbmcpID0+IG1hdGNoZXIgPT09IHN0cmluZztcbiAgICBpZiAobWF0Y2hlciBpbnN0YW5jZW9mIFJlZ0V4cClcbiAgICAgICAgcmV0dXJuIChzdHJpbmcpID0+IG1hdGNoZXIudGVzdChzdHJpbmcpO1xuICAgIGlmICh0eXBlb2YgbWF0Y2hlciA9PT0gJ29iamVjdCcgJiYgbWF0Y2hlciAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gKHN0cmluZykgPT4ge1xuICAgICAgICAgICAgaWYgKG1hdGNoZXIucGF0aCA9PT0gc3RyaW5nKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgaWYgKG1hdGNoZXIucmVjdXJzaXZlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVsYXRpdmUgPSBzeXNQYXRoLnJlbGF0aXZlKG1hdGNoZXIucGF0aCwgc3RyaW5nKTtcbiAgICAgICAgICAgICAgICBpZiAoIXJlbGF0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuICFyZWxhdGl2ZS5zdGFydHNXaXRoKCcuLicpICYmICFzeXNQYXRoLmlzQWJzb2x1dGUocmVsYXRpdmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gKCkgPT4gZmFsc2U7XG59XG5mdW5jdGlvbiBub3JtYWxpemVQYXRoKHBhdGgpIHtcbiAgICBpZiAodHlwZW9mIHBhdGggIT09ICdzdHJpbmcnKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3N0cmluZyBleHBlY3RlZCcpO1xuICAgIHBhdGggPSBzeXNQYXRoLm5vcm1hbGl6ZShwYXRoKTtcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgbGV0IHByZXBlbmQgPSBmYWxzZTtcbiAgICBpZiAocGF0aC5zdGFydHNXaXRoKCcvLycpKVxuICAgICAgICBwcmVwZW5kID0gdHJ1ZTtcbiAgICBjb25zdCBET1VCTEVfU0xBU0hfUkUgPSAvXFwvXFwvLztcbiAgICB3aGlsZSAocGF0aC5tYXRjaChET1VCTEVfU0xBU0hfUkUpKVxuICAgICAgICBwYXRoID0gcGF0aC5yZXBsYWNlKERPVUJMRV9TTEFTSF9SRSwgJy8nKTtcbiAgICBpZiAocHJlcGVuZClcbiAgICAgICAgcGF0aCA9ICcvJyArIHBhdGg7XG4gICAgcmV0dXJuIHBhdGg7XG59XG5mdW5jdGlvbiBtYXRjaFBhdHRlcm5zKHBhdHRlcm5zLCB0ZXN0U3RyaW5nLCBzdGF0cykge1xuICAgIGNvbnN0IHBhdGggPSBub3JtYWxpemVQYXRoKHRlc3RTdHJpbmcpO1xuICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBwYXR0ZXJucy5sZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgY29uc3QgcGF0dGVybiA9IHBhdHRlcm5zW2luZGV4XTtcbiAgICAgICAgaWYgKHBhdHRlcm4ocGF0aCwgc3RhdHMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5mdW5jdGlvbiBhbnltYXRjaChtYXRjaGVycywgdGVzdFN0cmluZykge1xuICAgIGlmIChtYXRjaGVycyA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2FueW1hdGNoOiBzcGVjaWZ5IGZpcnN0IGFyZ3VtZW50Jyk7XG4gICAgfVxuICAgIC8vIEVhcmx5IGNhY2hlIGZvciBtYXRjaGVycy5cbiAgICBjb25zdCBtYXRjaGVyc0FycmF5ID0gYXJyaWZ5KG1hdGNoZXJzKTtcbiAgICBjb25zdCBwYXR0ZXJucyA9IG1hdGNoZXJzQXJyYXkubWFwKChtYXRjaGVyKSA9PiBjcmVhdGVQYXR0ZXJuKG1hdGNoZXIpKTtcbiAgICBpZiAodGVzdFN0cmluZyA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiAodGVzdFN0cmluZywgc3RhdHMpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaFBhdHRlcm5zKHBhdHRlcm5zLCB0ZXN0U3RyaW5nLCBzdGF0cyk7XG4gICAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBtYXRjaFBhdHRlcm5zKHBhdHRlcm5zLCB0ZXN0U3RyaW5nKTtcbn1cbmNvbnN0IHVuaWZ5UGF0aHMgPSAocGF0aHNfKSA9PiB7XG4gICAgY29uc3QgcGF0aHMgPSBhcnJpZnkocGF0aHNfKS5mbGF0KCk7XG4gICAgaWYgKCFwYXRocy5ldmVyeSgocCkgPT4gdHlwZW9mIHAgPT09IFNUUklOR19UWVBFKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBOb24tc3RyaW5nIHByb3ZpZGVkIGFzIHdhdGNoIHBhdGg6ICR7cGF0aHN9YCk7XG4gICAgfVxuICAgIHJldHVybiBwYXRocy5tYXAobm9ybWFsaXplUGF0aFRvVW5peCk7XG59O1xuLy8gSWYgU0xBU0hfU0xBU0ggb2NjdXJzIGF0IHRoZSBiZWdpbm5pbmcgb2YgcGF0aCwgaXQgaXMgbm90IHJlcGxhY2VkXG4vLyAgICAgYmVjYXVzZSBcIi8vU3RvcmFnZVBDL0RyaXZlUG9vbC9Nb3ZpZXNcIiBpcyBhIHZhbGlkIG5ldHdvcmsgcGF0aFxuY29uc3QgdG9Vbml4ID0gKHN0cmluZykgPT4ge1xuICAgIGxldCBzdHIgPSBzdHJpbmcucmVwbGFjZShCQUNLX1NMQVNIX1JFLCBTTEFTSCk7XG4gICAgbGV0IHByZXBlbmQgPSBmYWxzZTtcbiAgICBpZiAoc3RyLnN0YXJ0c1dpdGgoU0xBU0hfU0xBU0gpKSB7XG4gICAgICAgIHByZXBlbmQgPSB0cnVlO1xuICAgIH1cbiAgICB3aGlsZSAoc3RyLm1hdGNoKERPVUJMRV9TTEFTSF9SRSkpIHtcbiAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UoRE9VQkxFX1NMQVNIX1JFLCBTTEFTSCk7XG4gICAgfVxuICAgIGlmIChwcmVwZW5kKSB7XG4gICAgICAgIHN0ciA9IFNMQVNIICsgc3RyO1xuICAgIH1cbiAgICByZXR1cm4gc3RyO1xufTtcbi8vIE91ciB2ZXJzaW9uIG9mIHVwYXRoLm5vcm1hbGl6ZVxuLy8gVE9ETzogdGhpcyBpcyBub3QgZXF1YWwgdG8gcGF0aC1ub3JtYWxpemUgbW9kdWxlIC0gaW52ZXN0aWdhdGUgd2h5XG5jb25zdCBub3JtYWxpemVQYXRoVG9Vbml4ID0gKHBhdGgpID0+IHRvVW5peChzeXNQYXRoLm5vcm1hbGl6ZSh0b1VuaXgocGF0aCkpKTtcbi8vIFRPRE86IHJlZmFjdG9yXG5jb25zdCBub3JtYWxpemVJZ25vcmVkID0gKGN3ZCA9ICcnKSA9PiAocGF0aCkgPT4ge1xuICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZVBhdGhUb1VuaXgoc3lzUGF0aC5pc0Fic29sdXRlKHBhdGgpID8gcGF0aCA6IHN5c1BhdGguam9pbihjd2QsIHBhdGgpKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiBwYXRoO1xuICAgIH1cbn07XG5jb25zdCBnZXRBYnNvbHV0ZVBhdGggPSAocGF0aCwgY3dkKSA9PiB7XG4gICAgaWYgKHN5c1BhdGguaXNBYnNvbHV0ZShwYXRoKSkge1xuICAgICAgICByZXR1cm4gcGF0aDtcbiAgICB9XG4gICAgcmV0dXJuIHN5c1BhdGguam9pbihjd2QsIHBhdGgpO1xufTtcbmNvbnN0IEVNUFRZX1NFVCA9IE9iamVjdC5mcmVlemUobmV3IFNldCgpKTtcbi8qKlxuICogRGlyZWN0b3J5IGVudHJ5LlxuICovXG5jbGFzcyBEaXJFbnRyeSB7XG4gICAgY29uc3RydWN0b3IoZGlyLCByZW1vdmVXYXRjaGVyKSB7XG4gICAgICAgIHRoaXMucGF0aCA9IGRpcjtcbiAgICAgICAgdGhpcy5fcmVtb3ZlV2F0Y2hlciA9IHJlbW92ZVdhdGNoZXI7XG4gICAgICAgIHRoaXMuaXRlbXMgPSBuZXcgU2V0KCk7XG4gICAgfVxuICAgIGFkZChpdGVtKSB7XG4gICAgICAgIGNvbnN0IHsgaXRlbXMgfSA9IHRoaXM7XG4gICAgICAgIGlmICghaXRlbXMpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGlmIChpdGVtICE9PSBPTkVfRE9UICYmIGl0ZW0gIT09IFRXT19ET1RTKVxuICAgICAgICAgICAgaXRlbXMuYWRkKGl0ZW0pO1xuICAgIH1cbiAgICBhc3luYyByZW1vdmUoaXRlbSkge1xuICAgICAgICBjb25zdCB7IGl0ZW1zIH0gPSB0aGlzO1xuICAgICAgICBpZiAoIWl0ZW1zKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpdGVtcy5kZWxldGUoaXRlbSk7XG4gICAgICAgIGlmIChpdGVtcy5zaXplID4gMClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY29uc3QgZGlyID0gdGhpcy5wYXRoO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgcmVhZGRpcihkaXIpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9yZW1vdmVXYXRjaGVyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVtb3ZlV2F0Y2hlcihzeXNQYXRoLmRpcm5hbWUoZGlyKSwgc3lzUGF0aC5iYXNlbmFtZShkaXIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBoYXMoaXRlbSkge1xuICAgICAgICBjb25zdCB7IGl0ZW1zIH0gPSB0aGlzO1xuICAgICAgICBpZiAoIWl0ZW1zKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICByZXR1cm4gaXRlbXMuaGFzKGl0ZW0pO1xuICAgIH1cbiAgICBnZXRDaGlsZHJlbigpIHtcbiAgICAgICAgY29uc3QgeyBpdGVtcyB9ID0gdGhpcztcbiAgICAgICAgaWYgKCFpdGVtcylcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgcmV0dXJuIFsuLi5pdGVtcy52YWx1ZXMoKV07XG4gICAgfVxuICAgIGRpc3Bvc2UoKSB7XG4gICAgICAgIHRoaXMuaXRlbXMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5wYXRoID0gJyc7XG4gICAgICAgIHRoaXMuX3JlbW92ZVdhdGNoZXIgPSBFTVBUWV9GTjtcbiAgICAgICAgdGhpcy5pdGVtcyA9IEVNUFRZX1NFVDtcbiAgICAgICAgT2JqZWN0LmZyZWV6ZSh0aGlzKTtcbiAgICB9XG59XG5jb25zdCBTVEFUX01FVEhPRF9GID0gJ3N0YXQnO1xuY29uc3QgU1RBVF9NRVRIT0RfTCA9ICdsc3RhdCc7XG5leHBvcnQgY2xhc3MgV2F0Y2hIZWxwZXIge1xuICAgIGNvbnN0cnVjdG9yKHBhdGgsIGZvbGxvdywgZnN3KSB7XG4gICAgICAgIHRoaXMuZnN3ID0gZnN3O1xuICAgICAgICBjb25zdCB3YXRjaFBhdGggPSBwYXRoO1xuICAgICAgICB0aGlzLnBhdGggPSBwYXRoID0gcGF0aC5yZXBsYWNlKFJFUExBQ0VSX1JFLCAnJyk7XG4gICAgICAgIHRoaXMud2F0Y2hQYXRoID0gd2F0Y2hQYXRoO1xuICAgICAgICB0aGlzLmZ1bGxXYXRjaFBhdGggPSBzeXNQYXRoLnJlc29sdmUod2F0Y2hQYXRoKTtcbiAgICAgICAgdGhpcy5kaXJQYXJ0cyA9IFtdO1xuICAgICAgICB0aGlzLmRpclBhcnRzLmZvckVhY2goKHBhcnRzKSA9PiB7XG4gICAgICAgICAgICBpZiAocGFydHMubGVuZ3RoID4gMSlcbiAgICAgICAgICAgICAgICBwYXJ0cy5wb3AoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZm9sbG93U3ltbGlua3MgPSBmb2xsb3c7XG4gICAgICAgIHRoaXMuc3RhdE1ldGhvZCA9IGZvbGxvdyA/IFNUQVRfTUVUSE9EX0YgOiBTVEFUX01FVEhPRF9MO1xuICAgIH1cbiAgICBlbnRyeVBhdGgoZW50cnkpIHtcbiAgICAgICAgcmV0dXJuIHN5c1BhdGguam9pbih0aGlzLndhdGNoUGF0aCwgc3lzUGF0aC5yZWxhdGl2ZSh0aGlzLndhdGNoUGF0aCwgZW50cnkuZnVsbFBhdGgpKTtcbiAgICB9XG4gICAgZmlsdGVyUGF0aChlbnRyeSkge1xuICAgICAgICBjb25zdCB7IHN0YXRzIH0gPSBlbnRyeTtcbiAgICAgICAgaWYgKHN0YXRzICYmIHN0YXRzLmlzU3ltYm9saWNMaW5rKCkpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5maWx0ZXJEaXIoZW50cnkpO1xuICAgICAgICBjb25zdCByZXNvbHZlZFBhdGggPSB0aGlzLmVudHJ5UGF0aChlbnRyeSk7XG4gICAgICAgIC8vIFRPRE86IHdoYXQgaWYgc3RhdHMgaXMgdW5kZWZpbmVkPyByZW1vdmUgIVxuICAgICAgICByZXR1cm4gdGhpcy5mc3cuX2lzbnRJZ25vcmVkKHJlc29sdmVkUGF0aCwgc3RhdHMpICYmIHRoaXMuZnN3Ll9oYXNSZWFkUGVybWlzc2lvbnMoc3RhdHMpO1xuICAgIH1cbiAgICBmaWx0ZXJEaXIoZW50cnkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZnN3Ll9pc250SWdub3JlZCh0aGlzLmVudHJ5UGF0aChlbnRyeSksIGVudHJ5LnN0YXRzKTtcbiAgICB9XG59XG4vKipcbiAqIFdhdGNoZXMgZmlsZXMgJiBkaXJlY3RvcmllcyBmb3IgY2hhbmdlcy4gRW1pdHRlZCBldmVudHM6XG4gKiBgYWRkYCwgYGFkZERpcmAsIGBjaGFuZ2VgLCBgdW5saW5rYCwgYHVubGlua0RpcmAsIGBhbGxgLCBgZXJyb3JgXG4gKlxuICogICAgIG5ldyBGU1dhdGNoZXIoKVxuICogICAgICAgLmFkZChkaXJlY3RvcmllcylcbiAqICAgICAgIC5vbignYWRkJywgcGF0aCA9PiBsb2coJ0ZpbGUnLCBwYXRoLCAnd2FzIGFkZGVkJykpXG4gKi9cbmV4cG9ydCBjbGFzcyBGU1dhdGNoZXIgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICAgIC8vIE5vdCBpbmRlbnRpbmcgbWV0aG9kcyBmb3IgaGlzdG9yeSBzYWtlOyBmb3Igbm93LlxuICAgIGNvbnN0cnVjdG9yKF9vcHRzID0ge30pIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5jbG9zZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fY2xvc2VycyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5faWdub3JlZFBhdGhzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLl90aHJvdHRsZWQgPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXMuX3N0cmVhbXMgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuX3N5bWxpbmtQYXRocyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5fd2F0Y2hlZCA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5fcGVuZGluZ1dyaXRlcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5fcGVuZGluZ1VubGlua3MgPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXMuX3JlYWR5Q291bnQgPSAwO1xuICAgICAgICB0aGlzLl9yZWFkeUVtaXR0ZWQgPSBmYWxzZTtcbiAgICAgICAgY29uc3QgYXdmID0gX29wdHMuYXdhaXRXcml0ZUZpbmlzaDtcbiAgICAgICAgY29uc3QgREVGX0FXRiA9IHsgc3RhYmlsaXR5VGhyZXNob2xkOiAyMDAwLCBwb2xsSW50ZXJ2YWw6IDEwMCB9O1xuICAgICAgICBjb25zdCBvcHRzID0ge1xuICAgICAgICAgICAgLy8gRGVmYXVsdHNcbiAgICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgICBpZ25vcmVJbml0aWFsOiBmYWxzZSxcbiAgICAgICAgICAgIGlnbm9yZVBlcm1pc3Npb25FcnJvcnM6IGZhbHNlLFxuICAgICAgICAgICAgaW50ZXJ2YWw6IDEwMCxcbiAgICAgICAgICAgIGJpbmFyeUludGVydmFsOiAzMDAsXG4gICAgICAgICAgICBmb2xsb3dTeW1saW5rczogdHJ1ZSxcbiAgICAgICAgICAgIHVzZVBvbGxpbmc6IGZhbHNlLFxuICAgICAgICAgICAgLy8gdXNlQXN5bmM6IGZhbHNlLFxuICAgICAgICAgICAgYXRvbWljOiB0cnVlLCAvLyBOT1RFOiBvdmVyd3JpdHRlbiBsYXRlciAoZGVwZW5kcyBvbiB1c2VQb2xsaW5nKVxuICAgICAgICAgICAgLi4uX29wdHMsXG4gICAgICAgICAgICAvLyBDaGFuZ2UgZm9ybWF0XG4gICAgICAgICAgICBpZ25vcmVkOiBfb3B0cy5pZ25vcmVkID8gYXJyaWZ5KF9vcHRzLmlnbm9yZWQpIDogYXJyaWZ5KFtdKSxcbiAgICAgICAgICAgIGF3YWl0V3JpdGVGaW5pc2g6IGF3ZiA9PT0gdHJ1ZSA/IERFRl9BV0YgOiB0eXBlb2YgYXdmID09PSAnb2JqZWN0JyA/IHsgLi4uREVGX0FXRiwgLi4uYXdmIH0gOiBmYWxzZSxcbiAgICAgICAgfTtcbiAgICAgICAgLy8gQWx3YXlzIGRlZmF1bHQgdG8gcG9sbGluZyBvbiBJQk0gaSBiZWNhdXNlIGZzLndhdGNoKCkgaXMgbm90IGF2YWlsYWJsZSBvbiBJQk0gaS5cbiAgICAgICAgaWYgKGlzSUJNaSlcbiAgICAgICAgICAgIG9wdHMudXNlUG9sbGluZyA9IHRydWU7XG4gICAgICAgIC8vIEVkaXRvciBhdG9taWMgd3JpdGUgbm9ybWFsaXphdGlvbiBlbmFibGVkIGJ5IGRlZmF1bHQgd2l0aCBmcy53YXRjaFxuICAgICAgICBpZiAob3B0cy5hdG9taWMgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIG9wdHMuYXRvbWljID0gIW9wdHMudXNlUG9sbGluZztcbiAgICAgICAgLy8gb3B0cy5hdG9taWMgPSB0eXBlb2YgX29wdHMuYXRvbWljID09PSAnbnVtYmVyJyA/IF9vcHRzLmF0b21pYyA6IDEwMDtcbiAgICAgICAgLy8gR2xvYmFsIG92ZXJyaWRlLiBVc2VmdWwgZm9yIGRldmVsb3BlcnMsIHdobyBuZWVkIHRvIGZvcmNlIHBvbGxpbmcgZm9yIGFsbFxuICAgICAgICAvLyBpbnN0YW5jZXMgb2YgY2hva2lkYXIsIHJlZ2FyZGxlc3Mgb2YgdXNhZ2UgLyBkZXBlbmRlbmN5IGRlcHRoXG4gICAgICAgIGNvbnN0IGVudlBvbGwgPSBwcm9jZXNzLmVudi5DSE9LSURBUl9VU0VQT0xMSU5HO1xuICAgICAgICBpZiAoZW52UG9sbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zdCBlbnZMb3dlciA9IGVudlBvbGwudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIGlmIChlbnZMb3dlciA9PT0gJ2ZhbHNlJyB8fCBlbnZMb3dlciA9PT0gJzAnKVxuICAgICAgICAgICAgICAgIG9wdHMudXNlUG9sbGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgZWxzZSBpZiAoZW52TG93ZXIgPT09ICd0cnVlJyB8fCBlbnZMb3dlciA9PT0gJzEnKVxuICAgICAgICAgICAgICAgIG9wdHMudXNlUG9sbGluZyA9IHRydWU7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgb3B0cy51c2VQb2xsaW5nID0gISFlbnZMb3dlcjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlbnZJbnRlcnZhbCA9IHByb2Nlc3MuZW52LkNIT0tJREFSX0lOVEVSVkFMO1xuICAgICAgICBpZiAoZW52SW50ZXJ2YWwpXG4gICAgICAgICAgICBvcHRzLmludGVydmFsID0gTnVtYmVyLnBhcnNlSW50KGVudkludGVydmFsLCAxMCk7XG4gICAgICAgIC8vIFRoaXMgaXMgZG9uZSB0byBlbWl0IHJlYWR5IG9ubHkgb25jZSwgYnV0IGVhY2ggJ2FkZCcgd2lsbCBpbmNyZWFzZSB0aGF0P1xuICAgICAgICBsZXQgcmVhZHlDYWxscyA9IDA7XG4gICAgICAgIHRoaXMuX2VtaXRSZWFkeSA9ICgpID0+IHtcbiAgICAgICAgICAgIHJlYWR5Q2FsbHMrKztcbiAgICAgICAgICAgIGlmIChyZWFkeUNhbGxzID49IHRoaXMuX3JlYWR5Q291bnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0UmVhZHkgPSBFTVBUWV9GTjtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZWFkeUVtaXR0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIC8vIHVzZSBwcm9jZXNzLm5leHRUaWNrIHRvIGFsbG93IHRpbWUgZm9yIGxpc3RlbmVyIHRvIGJlIGJvdW5kXG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB0aGlzLmVtaXQoRVYuUkVBRFkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fZW1pdFJhdyA9ICguLi5hcmdzKSA9PiB0aGlzLmVtaXQoRVYuUkFXLCAuLi5hcmdzKTtcbiAgICAgICAgdGhpcy5fYm91bmRSZW1vdmUgPSB0aGlzLl9yZW1vdmUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5vcHRpb25zID0gb3B0cztcbiAgICAgICAgdGhpcy5fbm9kZUZzSGFuZGxlciA9IG5ldyBOb2RlRnNIYW5kbGVyKHRoaXMpO1xuICAgICAgICAvLyBZb3VcdTIwMTlyZSBmcm96ZW4gd2hlbiB5b3VyIGhlYXJ0XHUyMDE5cyBub3Qgb3Blbi5cbiAgICAgICAgT2JqZWN0LmZyZWV6ZShvcHRzKTtcbiAgICB9XG4gICAgX2FkZElnbm9yZWRQYXRoKG1hdGNoZXIpIHtcbiAgICAgICAgaWYgKGlzTWF0Y2hlck9iamVjdChtYXRjaGVyKSkge1xuICAgICAgICAgICAgLy8gcmV0dXJuIGVhcmx5IGlmIHdlIGFscmVhZHkgaGF2ZSBhIGRlZXBseSBlcXVhbCBtYXRjaGVyIG9iamVjdFxuICAgICAgICAgICAgZm9yIChjb25zdCBpZ25vcmVkIG9mIHRoaXMuX2lnbm9yZWRQYXRocykge1xuICAgICAgICAgICAgICAgIGlmIChpc01hdGNoZXJPYmplY3QoaWdub3JlZCkgJiZcbiAgICAgICAgICAgICAgICAgICAgaWdub3JlZC5wYXRoID09PSBtYXRjaGVyLnBhdGggJiZcbiAgICAgICAgICAgICAgICAgICAgaWdub3JlZC5yZWN1cnNpdmUgPT09IG1hdGNoZXIucmVjdXJzaXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5faWdub3JlZFBhdGhzLmFkZChtYXRjaGVyKTtcbiAgICB9XG4gICAgX3JlbW92ZUlnbm9yZWRQYXRoKG1hdGNoZXIpIHtcbiAgICAgICAgdGhpcy5faWdub3JlZFBhdGhzLmRlbGV0ZShtYXRjaGVyKTtcbiAgICAgICAgLy8gbm93IGZpbmQgYW55IG1hdGNoZXIgb2JqZWN0cyB3aXRoIHRoZSBtYXRjaGVyIGFzIHBhdGhcbiAgICAgICAgaWYgKHR5cGVvZiBtYXRjaGVyID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpZ25vcmVkIG9mIHRoaXMuX2lnbm9yZWRQYXRocykge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8gKDQzMDgxaik6IG1ha2UgdGhpcyBtb3JlIGVmZmljaWVudC5cbiAgICAgICAgICAgICAgICAvLyBwcm9iYWJseSBqdXN0IG1ha2UgYSBgdGhpcy5faWdub3JlZERpcmVjdG9yaWVzYCBvciBzb21lXG4gICAgICAgICAgICAgICAgLy8gc3VjaCB0aGluZy5cbiAgICAgICAgICAgICAgICBpZiAoaXNNYXRjaGVyT2JqZWN0KGlnbm9yZWQpICYmIGlnbm9yZWQucGF0aCA9PT0gbWF0Y2hlcikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9pZ25vcmVkUGF0aHMuZGVsZXRlKGlnbm9yZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBQdWJsaWMgbWV0aG9kc1xuICAgIC8qKlxuICAgICAqIEFkZHMgcGF0aHMgdG8gYmUgd2F0Y2hlZCBvbiBhbiBleGlzdGluZyBGU1dhdGNoZXIgaW5zdGFuY2UuXG4gICAgICogQHBhcmFtIHBhdGhzXyBmaWxlIG9yIGZpbGUgbGlzdC4gT3RoZXIgYXJndW1lbnRzIGFyZSB1bnVzZWRcbiAgICAgKi9cbiAgICBhZGQocGF0aHNfLCBfb3JpZ0FkZCwgX2ludGVybmFsKSB7XG4gICAgICAgIGNvbnN0IHsgY3dkIH0gPSB0aGlzLm9wdGlvbnM7XG4gICAgICAgIHRoaXMuY2xvc2VkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2Nsb3NlUHJvbWlzZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgbGV0IHBhdGhzID0gdW5pZnlQYXRocyhwYXRoc18pO1xuICAgICAgICBpZiAoY3dkKSB7XG4gICAgICAgICAgICBwYXRocyA9IHBhdGhzLm1hcCgocGF0aCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFic1BhdGggPSBnZXRBYnNvbHV0ZVBhdGgocGF0aCwgY3dkKTtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBgcGF0aGAgaW5zdGVhZCBvZiBgYWJzUGF0aGAgYmVjYXVzZSB0aGUgY3dkIHBvcnRpb24gY2FuJ3QgYmUgYSBnbG9iXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFic1BhdGg7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBwYXRocy5mb3JFYWNoKChwYXRoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9yZW1vdmVJZ25vcmVkUGF0aChwYXRoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX3VzZXJJZ25vcmVkID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAoIXRoaXMuX3JlYWR5Q291bnQpXG4gICAgICAgICAgICB0aGlzLl9yZWFkeUNvdW50ID0gMDtcbiAgICAgICAgdGhpcy5fcmVhZHlDb3VudCArPSBwYXRocy5sZW5ndGg7XG4gICAgICAgIFByb21pc2UuYWxsKHBhdGhzLm1hcChhc3luYyAocGF0aCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgdGhpcy5fbm9kZUZzSGFuZGxlci5fYWRkVG9Ob2RlRnMocGF0aCwgIV9pbnRlcm5hbCwgdW5kZWZpbmVkLCAwLCBfb3JpZ0FkZCk7XG4gICAgICAgICAgICBpZiAocmVzKVxuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRSZWFkeSgpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfSkpLnRoZW4oKHJlc3VsdHMpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLmNsb3NlZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICByZXN1bHRzLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaXRlbSlcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGQoc3lzUGF0aC5kaXJuYW1lKGl0ZW0pLCBzeXNQYXRoLmJhc2VuYW1lKF9vcmlnQWRkIHx8IGl0ZW0pKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsb3NlIHdhdGNoZXJzIG9yIHN0YXJ0IGlnbm9yaW5nIGV2ZW50cyBmcm9tIHNwZWNpZmllZCBwYXRocy5cbiAgICAgKi9cbiAgICB1bndhdGNoKHBhdGhzXykge1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgY29uc3QgcGF0aHMgPSB1bmlmeVBhdGhzKHBhdGhzXyk7XG4gICAgICAgIGNvbnN0IHsgY3dkIH0gPSB0aGlzLm9wdGlvbnM7XG4gICAgICAgIHBhdGhzLmZvckVhY2goKHBhdGgpID0+IHtcbiAgICAgICAgICAgIC8vIGNvbnZlcnQgdG8gYWJzb2x1dGUgcGF0aCB1bmxlc3MgcmVsYXRpdmUgcGF0aCBhbHJlYWR5IG1hdGNoZXNcbiAgICAgICAgICAgIGlmICghc3lzUGF0aC5pc0Fic29sdXRlKHBhdGgpICYmICF0aGlzLl9jbG9zZXJzLmhhcyhwYXRoKSkge1xuICAgICAgICAgICAgICAgIGlmIChjd2QpXG4gICAgICAgICAgICAgICAgICAgIHBhdGggPSBzeXNQYXRoLmpvaW4oY3dkLCBwYXRoKTtcbiAgICAgICAgICAgICAgICBwYXRoID0gc3lzUGF0aC5yZXNvbHZlKHBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fY2xvc2VQYXRoKHBhdGgpO1xuICAgICAgICAgICAgdGhpcy5fYWRkSWdub3JlZFBhdGgocGF0aCk7XG4gICAgICAgICAgICBpZiAodGhpcy5fd2F0Y2hlZC5oYXMocGF0aCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hZGRJZ25vcmVkUGF0aCh7XG4gICAgICAgICAgICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHJlY3Vyc2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHJlc2V0IHRoZSBjYWNoZWQgdXNlcklnbm9yZWQgYW55bWF0Y2ggZm5cbiAgICAgICAgICAgIC8vIHRvIG1ha2UgaWdub3JlZFBhdGhzIGNoYW5nZXMgZWZmZWN0aXZlXG4gICAgICAgICAgICB0aGlzLl91c2VySWdub3JlZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDbG9zZSB3YXRjaGVycyBhbmQgcmVtb3ZlIGFsbCBsaXN0ZW5lcnMgZnJvbSB3YXRjaGVkIHBhdGhzLlxuICAgICAqL1xuICAgIGNsb3NlKCkge1xuICAgICAgICBpZiAodGhpcy5fY2xvc2VQcm9taXNlKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY2xvc2VQcm9taXNlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY2xvc2VkID0gdHJ1ZTtcbiAgICAgICAgLy8gTWVtb3J5IG1hbmFnZW1lbnQuXG4gICAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gICAgICAgIGNvbnN0IGNsb3NlcnMgPSBbXTtcbiAgICAgICAgdGhpcy5fY2xvc2Vycy5mb3JFYWNoKChjbG9zZXJMaXN0KSA9PiBjbG9zZXJMaXN0LmZvckVhY2goKGNsb3NlcikgPT4ge1xuICAgICAgICAgICAgY29uc3QgcHJvbWlzZSA9IGNsb3NlcigpO1xuICAgICAgICAgICAgaWYgKHByb21pc2UgaW5zdGFuY2VvZiBQcm9taXNlKVxuICAgICAgICAgICAgICAgIGNsb3NlcnMucHVzaChwcm9taXNlKTtcbiAgICAgICAgfSkpO1xuICAgICAgICB0aGlzLl9zdHJlYW1zLmZvckVhY2goKHN0cmVhbSkgPT4gc3RyZWFtLmRlc3Ryb3koKSk7XG4gICAgICAgIHRoaXMuX3VzZXJJZ25vcmVkID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLl9yZWFkeUNvdW50ID0gMDtcbiAgICAgICAgdGhpcy5fcmVhZHlFbWl0dGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX3dhdGNoZWQuZm9yRWFjaCgoZGlyZW50KSA9PiBkaXJlbnQuZGlzcG9zZSgpKTtcbiAgICAgICAgdGhpcy5fY2xvc2Vycy5jbGVhcigpO1xuICAgICAgICB0aGlzLl93YXRjaGVkLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuX3N0cmVhbXMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5fc3ltbGlua1BhdGhzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuX3Rocm90dGxlZC5jbGVhcigpO1xuICAgICAgICB0aGlzLl9jbG9zZVByb21pc2UgPSBjbG9zZXJzLmxlbmd0aFxuICAgICAgICAgICAgPyBQcm9taXNlLmFsbChjbG9zZXJzKS50aGVuKCgpID0+IHVuZGVmaW5lZClcbiAgICAgICAgICAgIDogUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIHJldHVybiB0aGlzLl9jbG9zZVByb21pc2U7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEV4cG9zZSBsaXN0IG9mIHdhdGNoZWQgcGF0aHNcbiAgICAgKiBAcmV0dXJucyBmb3IgY2hhaW5pbmdcbiAgICAgKi9cbiAgICBnZXRXYXRjaGVkKCkge1xuICAgICAgICBjb25zdCB3YXRjaExpc3QgPSB7fTtcbiAgICAgICAgdGhpcy5fd2F0Y2hlZC5mb3JFYWNoKChlbnRyeSwgZGlyKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBrZXkgPSB0aGlzLm9wdGlvbnMuY3dkID8gc3lzUGF0aC5yZWxhdGl2ZSh0aGlzLm9wdGlvbnMuY3dkLCBkaXIpIDogZGlyO1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBrZXkgfHwgT05FX0RPVDtcbiAgICAgICAgICAgIHdhdGNoTGlzdFtpbmRleF0gPSBlbnRyeS5nZXRDaGlsZHJlbigpLnNvcnQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB3YXRjaExpc3Q7XG4gICAgfVxuICAgIGVtaXRXaXRoQWxsKGV2ZW50LCBhcmdzKSB7XG4gICAgICAgIHRoaXMuZW1pdChldmVudCwgLi4uYXJncyk7XG4gICAgICAgIGlmIChldmVudCAhPT0gRVYuRVJST1IpXG4gICAgICAgICAgICB0aGlzLmVtaXQoRVYuQUxMLCBldmVudCwgLi4uYXJncyk7XG4gICAgfVxuICAgIC8vIENvbW1vbiBoZWxwZXJzXG4gICAgLy8gLS0tLS0tLS0tLS0tLS1cbiAgICAvKipcbiAgICAgKiBOb3JtYWxpemUgYW5kIGVtaXQgZXZlbnRzLlxuICAgICAqIENhbGxpbmcgX2VtaXQgRE9FUyBOT1QgTUVBTiBlbWl0KCkgd291bGQgYmUgY2FsbGVkIVxuICAgICAqIEBwYXJhbSBldmVudCBUeXBlIG9mIGV2ZW50XG4gICAgICogQHBhcmFtIHBhdGggRmlsZSBvciBkaXJlY3RvcnkgcGF0aFxuICAgICAqIEBwYXJhbSBzdGF0cyBhcmd1bWVudHMgdG8gYmUgcGFzc2VkIHdpdGggZXZlbnRcbiAgICAgKiBAcmV0dXJucyB0aGUgZXJyb3IgaWYgZGVmaW5lZCwgb3RoZXJ3aXNlIHRoZSB2YWx1ZSBvZiB0aGUgRlNXYXRjaGVyIGluc3RhbmNlJ3MgYGNsb3NlZGAgZmxhZ1xuICAgICAqL1xuICAgIGFzeW5jIF9lbWl0KGV2ZW50LCBwYXRoLCBzdGF0cykge1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGNvbnN0IG9wdHMgPSB0aGlzLm9wdGlvbnM7XG4gICAgICAgIGlmIChpc1dpbmRvd3MpXG4gICAgICAgICAgICBwYXRoID0gc3lzUGF0aC5ub3JtYWxpemUocGF0aCk7XG4gICAgICAgIGlmIChvcHRzLmN3ZClcbiAgICAgICAgICAgIHBhdGggPSBzeXNQYXRoLnJlbGF0aXZlKG9wdHMuY3dkLCBwYXRoKTtcbiAgICAgICAgY29uc3QgYXJncyA9IFtwYXRoXTtcbiAgICAgICAgaWYgKHN0YXRzICE9IG51bGwpXG4gICAgICAgICAgICBhcmdzLnB1c2goc3RhdHMpO1xuICAgICAgICBjb25zdCBhd2YgPSBvcHRzLmF3YWl0V3JpdGVGaW5pc2g7XG4gICAgICAgIGxldCBwdztcbiAgICAgICAgaWYgKGF3ZiAmJiAocHcgPSB0aGlzLl9wZW5kaW5nV3JpdGVzLmdldChwYXRoKSkpIHtcbiAgICAgICAgICAgIHB3Lmxhc3RDaGFuZ2UgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdHMuYXRvbWljKSB7XG4gICAgICAgICAgICBpZiAoZXZlbnQgPT09IEVWLlVOTElOSykge1xuICAgICAgICAgICAgICAgIHRoaXMuX3BlbmRpbmdVbmxpbmtzLnNldChwYXRoLCBbZXZlbnQsIC4uLmFyZ3NdKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcGVuZGluZ1VubGlua3MuZm9yRWFjaCgoZW50cnksIHBhdGgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdCguLi5lbnRyeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXQoRVYuQUxMLCAuLi5lbnRyeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wZW5kaW5nVW5saW5rcy5kZWxldGUocGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sIHR5cGVvZiBvcHRzLmF0b21pYyA9PT0gJ251bWJlcicgPyBvcHRzLmF0b21pYyA6IDEwMCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXZlbnQgPT09IEVWLkFERCAmJiB0aGlzLl9wZW5kaW5nVW5saW5rcy5oYXMocGF0aCkpIHtcbiAgICAgICAgICAgICAgICBldmVudCA9IEVWLkNIQU5HRTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wZW5kaW5nVW5saW5rcy5kZWxldGUocGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGF3ZiAmJiAoZXZlbnQgPT09IEVWLkFERCB8fCBldmVudCA9PT0gRVYuQ0hBTkdFKSAmJiB0aGlzLl9yZWFkeUVtaXR0ZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGF3ZkVtaXQgPSAoZXJyLCBzdGF0cykgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQgPSBFVi5FUlJPUjtcbiAgICAgICAgICAgICAgICAgICAgYXJnc1swXSA9IGVycjtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0V2l0aEFsbChldmVudCwgYXJncyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHN0YXRzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHN0YXRzIGRvZXNuJ3QgZXhpc3QgdGhlIGZpbGUgbXVzdCBoYXZlIGJlZW4gZGVsZXRlZFxuICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzWzFdID0gc3RhdHM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnB1c2goc3RhdHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdFdpdGhBbGwoZXZlbnQsIGFyZ3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLl9hd2FpdFdyaXRlRmluaXNoKHBhdGgsIGF3Zi5zdGFiaWxpdHlUaHJlc2hvbGQsIGV2ZW50LCBhd2ZFbWl0KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChldmVudCA9PT0gRVYuQ0hBTkdFKSB7XG4gICAgICAgICAgICBjb25zdCBpc1Rocm90dGxlZCA9ICF0aGlzLl90aHJvdHRsZShFVi5DSEFOR0UsIHBhdGgsIDUwKTtcbiAgICAgICAgICAgIGlmIChpc1Rocm90dGxlZClcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBpZiAob3B0cy5hbHdheXNTdGF0ICYmXG4gICAgICAgICAgICBzdGF0cyA9PT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICAoZXZlbnQgPT09IEVWLkFERCB8fCBldmVudCA9PT0gRVYuQUREX0RJUiB8fCBldmVudCA9PT0gRVYuQ0hBTkdFKSkge1xuICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBvcHRzLmN3ZCA/IHN5c1BhdGguam9pbihvcHRzLmN3ZCwgcGF0aCkgOiBwYXRoO1xuICAgICAgICAgICAgbGV0IHN0YXRzO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBzdGF0cyA9IGF3YWl0IHN0YXQoZnVsbFBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgIC8vIGRvIG5vdGhpbmdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFN1cHByZXNzIGV2ZW50IHdoZW4gZnNfc3RhdCBmYWlscywgdG8gYXZvaWQgc2VuZGluZyB1bmRlZmluZWQgJ3N0YXQnXG4gICAgICAgICAgICBpZiAoIXN0YXRzIHx8IHRoaXMuY2xvc2VkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGFyZ3MucHVzaChzdGF0cyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lbWl0V2l0aEFsbChldmVudCwgYXJncyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDb21tb24gaGFuZGxlciBmb3IgZXJyb3JzXG4gICAgICogQHJldHVybnMgVGhlIGVycm9yIGlmIGRlZmluZWQsIG90aGVyd2lzZSB0aGUgdmFsdWUgb2YgdGhlIEZTV2F0Y2hlciBpbnN0YW5jZSdzIGBjbG9zZWRgIGZsYWdcbiAgICAgKi9cbiAgICBfaGFuZGxlRXJyb3IoZXJyb3IpIHtcbiAgICAgICAgY29uc3QgY29kZSA9IGVycm9yICYmIGVycm9yLmNvZGU7XG4gICAgICAgIGlmIChlcnJvciAmJlxuICAgICAgICAgICAgY29kZSAhPT0gJ0VOT0VOVCcgJiZcbiAgICAgICAgICAgIGNvZGUgIT09ICdFTk9URElSJyAmJlxuICAgICAgICAgICAgKCF0aGlzLm9wdGlvbnMuaWdub3JlUGVybWlzc2lvbkVycm9ycyB8fCAoY29kZSAhPT0gJ0VQRVJNJyAmJiBjb2RlICE9PSAnRUFDQ0VTJykpKSB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoRVYuRVJST1IsIGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXJyb3IgfHwgdGhpcy5jbG9zZWQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEhlbHBlciB1dGlsaXR5IGZvciB0aHJvdHRsaW5nXG4gICAgICogQHBhcmFtIGFjdGlvblR5cGUgdHlwZSBiZWluZyB0aHJvdHRsZWRcbiAgICAgKiBAcGFyYW0gcGF0aCBiZWluZyBhY3RlZCB1cG9uXG4gICAgICogQHBhcmFtIHRpbWVvdXQgZHVyYXRpb24gb2YgdGltZSB0byBzdXBwcmVzcyBkdXBsaWNhdGUgYWN0aW9uc1xuICAgICAqIEByZXR1cm5zIHRyYWNraW5nIG9iamVjdCBvciBmYWxzZSBpZiBhY3Rpb24gc2hvdWxkIGJlIHN1cHByZXNzZWRcbiAgICAgKi9cbiAgICBfdGhyb3R0bGUoYWN0aW9uVHlwZSwgcGF0aCwgdGltZW91dCkge1xuICAgICAgICBpZiAoIXRoaXMuX3Rocm90dGxlZC5oYXMoYWN0aW9uVHlwZSkpIHtcbiAgICAgICAgICAgIHRoaXMuX3Rocm90dGxlZC5zZXQoYWN0aW9uVHlwZSwgbmV3IE1hcCgpKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBhY3Rpb24gPSB0aGlzLl90aHJvdHRsZWQuZ2V0KGFjdGlvblR5cGUpO1xuICAgICAgICBpZiAoIWFjdGlvbilcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignaW52YWxpZCB0aHJvdHRsZScpO1xuICAgICAgICBjb25zdCBhY3Rpb25QYXRoID0gYWN0aW9uLmdldChwYXRoKTtcbiAgICAgICAgaWYgKGFjdGlvblBhdGgpIHtcbiAgICAgICAgICAgIGFjdGlvblBhdGguY291bnQrKztcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcHJlZmVyLWNvbnN0XG4gICAgICAgIGxldCB0aW1lb3V0T2JqZWN0O1xuICAgICAgICBjb25zdCBjbGVhciA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBhY3Rpb24uZ2V0KHBhdGgpO1xuICAgICAgICAgICAgY29uc3QgY291bnQgPSBpdGVtID8gaXRlbS5jb3VudCA6IDA7XG4gICAgICAgICAgICBhY3Rpb24uZGVsZXRlKHBhdGgpO1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRPYmplY3QpO1xuICAgICAgICAgICAgaWYgKGl0ZW0pXG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGl0ZW0udGltZW91dE9iamVjdCk7XG4gICAgICAgICAgICByZXR1cm4gY291bnQ7XG4gICAgICAgIH07XG4gICAgICAgIHRpbWVvdXRPYmplY3QgPSBzZXRUaW1lb3V0KGNsZWFyLCB0aW1lb3V0KTtcbiAgICAgICAgY29uc3QgdGhyID0geyB0aW1lb3V0T2JqZWN0LCBjbGVhciwgY291bnQ6IDAgfTtcbiAgICAgICAgYWN0aW9uLnNldChwYXRoLCB0aHIpO1xuICAgICAgICByZXR1cm4gdGhyO1xuICAgIH1cbiAgICBfaW5jclJlYWR5Q291bnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yZWFkeUNvdW50Kys7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEF3YWl0cyB3cml0ZSBvcGVyYXRpb24gdG8gZmluaXNoLlxuICAgICAqIFBvbGxzIGEgbmV3bHkgY3JlYXRlZCBmaWxlIGZvciBzaXplIHZhcmlhdGlvbnMuIFdoZW4gZmlsZXMgc2l6ZSBkb2VzIG5vdCBjaGFuZ2UgZm9yICd0aHJlc2hvbGQnIG1pbGxpc2Vjb25kcyBjYWxscyBjYWxsYmFjay5cbiAgICAgKiBAcGFyYW0gcGF0aCBiZWluZyBhY3RlZCB1cG9uXG4gICAgICogQHBhcmFtIHRocmVzaG9sZCBUaW1lIGluIG1pbGxpc2Vjb25kcyBhIGZpbGUgc2l6ZSBtdXN0IGJlIGZpeGVkIGJlZm9yZSBhY2tub3dsZWRnaW5nIHdyaXRlIE9QIGlzIGZpbmlzaGVkXG4gICAgICogQHBhcmFtIGV2ZW50XG4gICAgICogQHBhcmFtIGF3ZkVtaXQgQ2FsbGJhY2sgdG8gYmUgY2FsbGVkIHdoZW4gcmVhZHkgZm9yIGV2ZW50IHRvIGJlIGVtaXR0ZWQuXG4gICAgICovXG4gICAgX2F3YWl0V3JpdGVGaW5pc2gocGF0aCwgdGhyZXNob2xkLCBldmVudCwgYXdmRW1pdCkge1xuICAgICAgICBjb25zdCBhd2YgPSB0aGlzLm9wdGlvbnMuYXdhaXRXcml0ZUZpbmlzaDtcbiAgICAgICAgaWYgKHR5cGVvZiBhd2YgIT09ICdvYmplY3QnKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCBwb2xsSW50ZXJ2YWwgPSBhd2YucG9sbEludGVydmFsO1xuICAgICAgICBsZXQgdGltZW91dEhhbmRsZXI7XG4gICAgICAgIGxldCBmdWxsUGF0aCA9IHBhdGg7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuY3dkICYmICFzeXNQYXRoLmlzQWJzb2x1dGUocGF0aCkpIHtcbiAgICAgICAgICAgIGZ1bGxQYXRoID0gc3lzUGF0aC5qb2luKHRoaXMub3B0aW9ucy5jd2QsIHBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICAgIGNvbnN0IHdyaXRlcyA9IHRoaXMuX3BlbmRpbmdXcml0ZXM7XG4gICAgICAgIGZ1bmN0aW9uIGF3YWl0V3JpdGVGaW5pc2hGbihwcmV2U3RhdCkge1xuICAgICAgICAgICAgc3RhdGNiKGZ1bGxQYXRoLCAoZXJyLCBjdXJTdGF0KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVyciB8fCAhd3JpdGVzLmhhcyhwYXRoKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyICYmIGVyci5jb2RlICE9PSAnRU5PRU5UJylcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3ZkVtaXQoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBub3cgPSBOdW1iZXIobmV3IERhdGUoKSk7XG4gICAgICAgICAgICAgICAgaWYgKHByZXZTdGF0ICYmIGN1clN0YXQuc2l6ZSAhPT0gcHJldlN0YXQuc2l6ZSkge1xuICAgICAgICAgICAgICAgICAgICB3cml0ZXMuZ2V0KHBhdGgpLmxhc3RDaGFuZ2UgPSBub3c7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHB3ID0gd3JpdGVzLmdldChwYXRoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkZiA9IG5vdyAtIHB3Lmxhc3RDaGFuZ2U7XG4gICAgICAgICAgICAgICAgaWYgKGRmID49IHRocmVzaG9sZCkge1xuICAgICAgICAgICAgICAgICAgICB3cml0ZXMuZGVsZXRlKHBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBhd2ZFbWl0KHVuZGVmaW5lZCwgY3VyU3RhdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aW1lb3V0SGFuZGxlciA9IHNldFRpbWVvdXQoYXdhaXRXcml0ZUZpbmlzaEZuLCBwb2xsSW50ZXJ2YWwsIGN1clN0YXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICghd3JpdGVzLmhhcyhwYXRoKSkge1xuICAgICAgICAgICAgd3JpdGVzLnNldChwYXRoLCB7XG4gICAgICAgICAgICAgICAgbGFzdENoYW5nZTogbm93LFxuICAgICAgICAgICAgICAgIGNhbmNlbFdhaXQ6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVzLmRlbGV0ZShwYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRIYW5kbGVyKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRpbWVvdXRIYW5kbGVyID0gc2V0VGltZW91dChhd2FpdFdyaXRlRmluaXNoRm4sIHBvbGxJbnRlcnZhbCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIHVzZXIgaGFzIGFza2VkIHRvIGlnbm9yZSB0aGlzIHBhdGguXG4gICAgICovXG4gICAgX2lzSWdub3JlZChwYXRoLCBzdGF0cykge1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmF0b21pYyAmJiBET1RfUkUudGVzdChwYXRoKSlcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICBpZiAoIXRoaXMuX3VzZXJJZ25vcmVkKSB7XG4gICAgICAgICAgICBjb25zdCB7IGN3ZCB9ID0gdGhpcy5vcHRpb25zO1xuICAgICAgICAgICAgY29uc3QgaWduID0gdGhpcy5vcHRpb25zLmlnbm9yZWQ7XG4gICAgICAgICAgICBjb25zdCBpZ25vcmVkID0gKGlnbiB8fCBbXSkubWFwKG5vcm1hbGl6ZUlnbm9yZWQoY3dkKSk7XG4gICAgICAgICAgICBjb25zdCBpZ25vcmVkUGF0aHMgPSBbLi4udGhpcy5faWdub3JlZFBhdGhzXTtcbiAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBbLi4uaWdub3JlZFBhdGhzLm1hcChub3JtYWxpemVJZ25vcmVkKGN3ZCkpLCAuLi5pZ25vcmVkXTtcbiAgICAgICAgICAgIHRoaXMuX3VzZXJJZ25vcmVkID0gYW55bWF0Y2gobGlzdCwgdW5kZWZpbmVkKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fdXNlcklnbm9yZWQocGF0aCwgc3RhdHMpO1xuICAgIH1cbiAgICBfaXNudElnbm9yZWQocGF0aCwgc3RhdCkge1xuICAgICAgICByZXR1cm4gIXRoaXMuX2lzSWdub3JlZChwYXRoLCBzdGF0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUHJvdmlkZXMgYSBzZXQgb2YgY29tbW9uIGhlbHBlcnMgYW5kIHByb3BlcnRpZXMgcmVsYXRpbmcgdG8gc3ltbGluayBoYW5kbGluZy5cbiAgICAgKiBAcGFyYW0gcGF0aCBmaWxlIG9yIGRpcmVjdG9yeSBwYXR0ZXJuIGJlaW5nIHdhdGNoZWRcbiAgICAgKi9cbiAgICBfZ2V0V2F0Y2hIZWxwZXJzKHBhdGgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBXYXRjaEhlbHBlcihwYXRoLCB0aGlzLm9wdGlvbnMuZm9sbG93U3ltbGlua3MsIHRoaXMpO1xuICAgIH1cbiAgICAvLyBEaXJlY3RvcnkgaGVscGVyc1xuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLyoqXG4gICAgICogUHJvdmlkZXMgZGlyZWN0b3J5IHRyYWNraW5nIG9iamVjdHNcbiAgICAgKiBAcGFyYW0gZGlyZWN0b3J5IHBhdGggb2YgdGhlIGRpcmVjdG9yeVxuICAgICAqL1xuICAgIF9nZXRXYXRjaGVkRGlyKGRpcmVjdG9yeSkge1xuICAgICAgICBjb25zdCBkaXIgPSBzeXNQYXRoLnJlc29sdmUoZGlyZWN0b3J5KTtcbiAgICAgICAgaWYgKCF0aGlzLl93YXRjaGVkLmhhcyhkaXIpKVxuICAgICAgICAgICAgdGhpcy5fd2F0Y2hlZC5zZXQoZGlyLCBuZXcgRGlyRW50cnkoZGlyLCB0aGlzLl9ib3VuZFJlbW92ZSkpO1xuICAgICAgICByZXR1cm4gdGhpcy5fd2F0Y2hlZC5nZXQoZGlyKTtcbiAgICB9XG4gICAgLy8gRmlsZSBoZWxwZXJzXG4gICAgLy8gLS0tLS0tLS0tLS0tXG4gICAgLyoqXG4gICAgICogQ2hlY2sgZm9yIHJlYWQgcGVybWlzc2lvbnM6IGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xMTc4MTQwNC8xMzU4NDA1XG4gICAgICovXG4gICAgX2hhc1JlYWRQZXJtaXNzaW9ucyhzdGF0cykge1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmlnbm9yZVBlcm1pc3Npb25FcnJvcnMpXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIEJvb2xlYW4oTnVtYmVyKHN0YXRzLm1vZGUpICYgMG80MDApO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIGVtaXR0aW5nIHVubGluayBldmVudHMgZm9yXG4gICAgICogZmlsZXMgYW5kIGRpcmVjdG9yaWVzLCBhbmQgdmlhIHJlY3Vyc2lvbiwgZm9yXG4gICAgICogZmlsZXMgYW5kIGRpcmVjdG9yaWVzIHdpdGhpbiBkaXJlY3RvcmllcyB0aGF0IGFyZSB1bmxpbmtlZFxuICAgICAqIEBwYXJhbSBkaXJlY3Rvcnkgd2l0aGluIHdoaWNoIHRoZSBmb2xsb3dpbmcgaXRlbSBpcyBsb2NhdGVkXG4gICAgICogQHBhcmFtIGl0ZW0gICAgICBiYXNlIHBhdGggb2YgaXRlbS9kaXJlY3RvcnlcbiAgICAgKi9cbiAgICBfcmVtb3ZlKGRpcmVjdG9yeSwgaXRlbSwgaXNEaXJlY3RvcnkpIHtcbiAgICAgICAgLy8gaWYgd2hhdCBpcyBiZWluZyBkZWxldGVkIGlzIGEgZGlyZWN0b3J5LCBnZXQgdGhhdCBkaXJlY3RvcnkncyBwYXRoc1xuICAgICAgICAvLyBmb3IgcmVjdXJzaXZlIGRlbGV0aW5nIGFuZCBjbGVhbmluZyBvZiB3YXRjaGVkIG9iamVjdFxuICAgICAgICAvLyBpZiBpdCBpcyBub3QgYSBkaXJlY3RvcnksIG5lc3RlZERpcmVjdG9yeUNoaWxkcmVuIHdpbGwgYmUgZW1wdHkgYXJyYXlcbiAgICAgICAgY29uc3QgcGF0aCA9IHN5c1BhdGguam9pbihkaXJlY3RvcnksIGl0ZW0pO1xuICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHN5c1BhdGgucmVzb2x2ZShwYXRoKTtcbiAgICAgICAgaXNEaXJlY3RvcnkgPVxuICAgICAgICAgICAgaXNEaXJlY3RvcnkgIT0gbnVsbCA/IGlzRGlyZWN0b3J5IDogdGhpcy5fd2F0Y2hlZC5oYXMocGF0aCkgfHwgdGhpcy5fd2F0Y2hlZC5oYXMoZnVsbFBhdGgpO1xuICAgICAgICAvLyBwcmV2ZW50IGR1cGxpY2F0ZSBoYW5kbGluZyBpbiBjYXNlIG9mIGFycml2aW5nIGhlcmUgbmVhcmx5IHNpbXVsdGFuZW91c2x5XG4gICAgICAgIC8vIHZpYSBtdWx0aXBsZSBwYXRocyAoc3VjaCBhcyBfaGFuZGxlRmlsZSBhbmQgX2hhbmRsZURpcilcbiAgICAgICAgaWYgKCF0aGlzLl90aHJvdHRsZSgncmVtb3ZlJywgcGF0aCwgMTAwKSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgLy8gaWYgdGhlIG9ubHkgd2F0Y2hlZCBmaWxlIGlzIHJlbW92ZWQsIHdhdGNoIGZvciBpdHMgcmV0dXJuXG4gICAgICAgIGlmICghaXNEaXJlY3RvcnkgJiYgdGhpcy5fd2F0Y2hlZC5zaXplID09PSAxKSB7XG4gICAgICAgICAgICB0aGlzLmFkZChkaXJlY3RvcnksIGl0ZW0sIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRoaXMgd2lsbCBjcmVhdGUgYSBuZXcgZW50cnkgaW4gdGhlIHdhdGNoZWQgb2JqZWN0IGluIGVpdGhlciBjYXNlXG4gICAgICAgIC8vIHNvIHdlIGdvdCB0byBkbyB0aGUgZGlyZWN0b3J5IGNoZWNrIGJlZm9yZWhhbmRcbiAgICAgICAgY29uc3Qgd3AgPSB0aGlzLl9nZXRXYXRjaGVkRGlyKHBhdGgpO1xuICAgICAgICBjb25zdCBuZXN0ZWREaXJlY3RvcnlDaGlsZHJlbiA9IHdwLmdldENoaWxkcmVuKCk7XG4gICAgICAgIC8vIFJlY3Vyc2l2ZWx5IHJlbW92ZSBjaGlsZHJlbiBkaXJlY3RvcmllcyAvIGZpbGVzLlxuICAgICAgICBuZXN0ZWREaXJlY3RvcnlDaGlsZHJlbi5mb3JFYWNoKChuZXN0ZWQpID0+IHRoaXMuX3JlbW92ZShwYXRoLCBuZXN0ZWQpKTtcbiAgICAgICAgLy8gQ2hlY2sgaWYgaXRlbSB3YXMgb24gdGhlIHdhdGNoZWQgbGlzdCBhbmQgcmVtb3ZlIGl0XG4gICAgICAgIGNvbnN0IHBhcmVudCA9IHRoaXMuX2dldFdhdGNoZWREaXIoZGlyZWN0b3J5KTtcbiAgICAgICAgY29uc3Qgd2FzVHJhY2tlZCA9IHBhcmVudC5oYXMoaXRlbSk7XG4gICAgICAgIHBhcmVudC5yZW1vdmUoaXRlbSk7XG4gICAgICAgIC8vIEZpeGVzIGlzc3VlICMxMDQyIC0+IFJlbGF0aXZlIHBhdGhzIHdlcmUgZGV0ZWN0ZWQgYW5kIGFkZGVkIGFzIHN5bWxpbmtzXG4gICAgICAgIC8vIChodHRwczovL2dpdGh1Yi5jb20vcGF1bG1pbGxyL2Nob2tpZGFyL2Jsb2IvZTE3NTNkZGJjOTU3MWJkYzMzYjRhNGFmMTcyZDUyY2I2ZTYxMWMxMC9saWIvbm9kZWZzLWhhbmRsZXIuanMjTDYxMiksXG4gICAgICAgIC8vIGJ1dCBuZXZlciByZW1vdmVkIGZyb20gdGhlIG1hcCBpbiBjYXNlIHRoZSBwYXRoIHdhcyBkZWxldGVkLlxuICAgICAgICAvLyBUaGlzIGxlYWRzIHRvIGFuIGluY29ycmVjdCBzdGF0ZSBpZiB0aGUgcGF0aCB3YXMgcmVjcmVhdGVkOlxuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vcGF1bG1pbGxyL2Nob2tpZGFyL2Jsb2IvZTE3NTNkZGJjOTU3MWJkYzMzYjRhNGFmMTcyZDUyY2I2ZTYxMWMxMC9saWIvbm9kZWZzLWhhbmRsZXIuanMjTDU1M1xuICAgICAgICBpZiAodGhpcy5fc3ltbGlua1BhdGhzLmhhcyhmdWxsUGF0aCkpIHtcbiAgICAgICAgICAgIHRoaXMuX3N5bWxpbmtQYXRocy5kZWxldGUoZnVsbFBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIC8vIElmIHdlIHdhaXQgZm9yIHRoaXMgZmlsZSB0byBiZSBmdWxseSB3cml0dGVuLCBjYW5jZWwgdGhlIHdhaXQuXG4gICAgICAgIGxldCByZWxQYXRoID0gcGF0aDtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5jd2QpXG4gICAgICAgICAgICByZWxQYXRoID0gc3lzUGF0aC5yZWxhdGl2ZSh0aGlzLm9wdGlvbnMuY3dkLCBwYXRoKTtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5hd2FpdFdyaXRlRmluaXNoICYmIHRoaXMuX3BlbmRpbmdXcml0ZXMuaGFzKHJlbFBhdGgpKSB7XG4gICAgICAgICAgICBjb25zdCBldmVudCA9IHRoaXMuX3BlbmRpbmdXcml0ZXMuZ2V0KHJlbFBhdGgpLmNhbmNlbFdhaXQoKTtcbiAgICAgICAgICAgIGlmIChldmVudCA9PT0gRVYuQUREKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBUaGUgRW50cnkgd2lsbCBlaXRoZXIgYmUgYSBkaXJlY3RvcnkgdGhhdCBqdXN0IGdvdCByZW1vdmVkXG4gICAgICAgIC8vIG9yIGEgYm9ndXMgZW50cnkgdG8gYSBmaWxlLCBpbiBlaXRoZXIgY2FzZSB3ZSBoYXZlIHRvIHJlbW92ZSBpdFxuICAgICAgICB0aGlzLl93YXRjaGVkLmRlbGV0ZShwYXRoKTtcbiAgICAgICAgdGhpcy5fd2F0Y2hlZC5kZWxldGUoZnVsbFBhdGgpO1xuICAgICAgICBjb25zdCBldmVudE5hbWUgPSBpc0RpcmVjdG9yeSA/IEVWLlVOTElOS19ESVIgOiBFVi5VTkxJTks7XG4gICAgICAgIGlmICh3YXNUcmFja2VkICYmICF0aGlzLl9pc0lnbm9yZWQocGF0aCkpXG4gICAgICAgICAgICB0aGlzLl9lbWl0KGV2ZW50TmFtZSwgcGF0aCk7XG4gICAgICAgIC8vIEF2b2lkIGNvbmZsaWN0cyBpZiB3ZSBsYXRlciBjcmVhdGUgYW5vdGhlciBmaWxlIHdpdGggdGhlIHNhbWUgbmFtZVxuICAgICAgICB0aGlzLl9jbG9zZVBhdGgocGF0aCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsb3NlcyBhbGwgd2F0Y2hlcnMgZm9yIGEgcGF0aFxuICAgICAqL1xuICAgIF9jbG9zZVBhdGgocGF0aCkge1xuICAgICAgICB0aGlzLl9jbG9zZUZpbGUocGF0aCk7XG4gICAgICAgIGNvbnN0IGRpciA9IHN5c1BhdGguZGlybmFtZShwYXRoKTtcbiAgICAgICAgdGhpcy5fZ2V0V2F0Y2hlZERpcihkaXIpLnJlbW92ZShzeXNQYXRoLmJhc2VuYW1lKHBhdGgpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xvc2VzIG9ubHkgZmlsZS1zcGVjaWZpYyB3YXRjaGVyc1xuICAgICAqL1xuICAgIF9jbG9zZUZpbGUocGF0aCkge1xuICAgICAgICBjb25zdCBjbG9zZXJzID0gdGhpcy5fY2xvc2Vycy5nZXQocGF0aCk7XG4gICAgICAgIGlmICghY2xvc2VycylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY2xvc2Vycy5mb3JFYWNoKChjbG9zZXIpID0+IGNsb3NlcigpKTtcbiAgICAgICAgdGhpcy5fY2xvc2Vycy5kZWxldGUocGF0aCk7XG4gICAgfVxuICAgIF9hZGRQYXRoQ2xvc2VyKHBhdGgsIGNsb3Nlcikge1xuICAgICAgICBpZiAoIWNsb3NlcilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgbGV0IGxpc3QgPSB0aGlzLl9jbG9zZXJzLmdldChwYXRoKTtcbiAgICAgICAgaWYgKCFsaXN0KSB7XG4gICAgICAgICAgICBsaXN0ID0gW107XG4gICAgICAgICAgICB0aGlzLl9jbG9zZXJzLnNldChwYXRoLCBsaXN0KTtcbiAgICAgICAgfVxuICAgICAgICBsaXN0LnB1c2goY2xvc2VyKTtcbiAgICB9XG4gICAgX3JlYWRkaXJwKHJvb3QsIG9wdHMpIHtcbiAgICAgICAgaWYgKHRoaXMuY2xvc2VkKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCBvcHRpb25zID0geyB0eXBlOiBFVi5BTEwsIGFsd2F5c1N0YXQ6IHRydWUsIGxzdGF0OiB0cnVlLCAuLi5vcHRzLCBkZXB0aDogMCB9O1xuICAgICAgICBsZXQgc3RyZWFtID0gcmVhZGRpcnAocm9vdCwgb3B0aW9ucyk7XG4gICAgICAgIHRoaXMuX3N0cmVhbXMuYWRkKHN0cmVhbSk7XG4gICAgICAgIHN0cmVhbS5vbmNlKFNUUl9DTE9TRSwgKCkgPT4ge1xuICAgICAgICAgICAgc3RyZWFtID0gdW5kZWZpbmVkO1xuICAgICAgICB9KTtcbiAgICAgICAgc3RyZWFtLm9uY2UoU1RSX0VORCwgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHN0cmVhbSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0cmVhbXMuZGVsZXRlKHN0cmVhbSk7XG4gICAgICAgICAgICAgICAgc3RyZWFtID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN0cmVhbTtcbiAgICB9XG59XG4vKipcbiAqIEluc3RhbnRpYXRlcyB3YXRjaGVyIHdpdGggcGF0aHMgdG8gYmUgdHJhY2tlZC5cbiAqIEBwYXJhbSBwYXRocyBmaWxlIC8gZGlyZWN0b3J5IHBhdGhzXG4gKiBAcGFyYW0gb3B0aW9ucyBvcHRzLCBzdWNoIGFzIGBhdG9taWNgLCBgYXdhaXRXcml0ZUZpbmlzaGAsIGBpZ25vcmVkYCwgYW5kIG90aGVyc1xuICogQHJldHVybnMgYW4gaW5zdGFuY2Ugb2YgRlNXYXRjaGVyIGZvciBjaGFpbmluZy5cbiAqIEBleGFtcGxlXG4gKiBjb25zdCB3YXRjaGVyID0gd2F0Y2goJy4nKS5vbignYWxsJywgKGV2ZW50LCBwYXRoKSA9PiB7IGNvbnNvbGUubG9nKGV2ZW50LCBwYXRoKTsgfSk7XG4gKiB3YXRjaCgnLicsIHsgYXRvbWljOiB0cnVlLCBhd2FpdFdyaXRlRmluaXNoOiB0cnVlLCBpZ25vcmVkOiAoZiwgc3RhdHMpID0+IHN0YXRzPy5pc0ZpbGUoKSAmJiAhZi5lbmRzV2l0aCgnLmpzJykgfSlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdhdGNoKHBhdGhzLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCB3YXRjaGVyID0gbmV3IEZTV2F0Y2hlcihvcHRpb25zKTtcbiAgICB3YXRjaGVyLmFkZChwYXRocyk7XG4gICAgcmV0dXJuIHdhdGNoZXI7XG59XG5leHBvcnQgZGVmYXVsdCB7IHdhdGNoLCBGU1dhdGNoZXIgfTtcbiIsICJpbXBvcnQgeyBzdGF0LCBsc3RhdCwgcmVhZGRpciwgcmVhbHBhdGggfSBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCB7IFJlYWRhYmxlIH0gZnJvbSAnbm9kZTpzdHJlYW0nO1xuaW1wb3J0IHsgcmVzb2x2ZSBhcyBwcmVzb2x2ZSwgcmVsYXRpdmUgYXMgcHJlbGF0aXZlLCBqb2luIGFzIHBqb2luLCBzZXAgYXMgcHNlcCB9IGZyb20gJ25vZGU6cGF0aCc7XG5leHBvcnQgY29uc3QgRW50cnlUeXBlcyA9IHtcbiAgICBGSUxFX1RZUEU6ICdmaWxlcycsXG4gICAgRElSX1RZUEU6ICdkaXJlY3RvcmllcycsXG4gICAgRklMRV9ESVJfVFlQRTogJ2ZpbGVzX2RpcmVjdG9yaWVzJyxcbiAgICBFVkVSWVRISU5HX1RZUEU6ICdhbGwnLFxufTtcbmNvbnN0IGRlZmF1bHRPcHRpb25zID0ge1xuICAgIHJvb3Q6ICcuJyxcbiAgICBmaWxlRmlsdGVyOiAoX2VudHJ5SW5mbykgPT4gdHJ1ZSxcbiAgICBkaXJlY3RvcnlGaWx0ZXI6IChfZW50cnlJbmZvKSA9PiB0cnVlLFxuICAgIHR5cGU6IEVudHJ5VHlwZXMuRklMRV9UWVBFLFxuICAgIGxzdGF0OiBmYWxzZSxcbiAgICBkZXB0aDogMjE0NzQ4MzY0OCxcbiAgICBhbHdheXNTdGF0OiBmYWxzZSxcbiAgICBoaWdoV2F0ZXJNYXJrOiA0MDk2LFxufTtcbk9iamVjdC5mcmVlemUoZGVmYXVsdE9wdGlvbnMpO1xuY29uc3QgUkVDVVJTSVZFX0VSUk9SX0NPREUgPSAnUkVBRERJUlBfUkVDVVJTSVZFX0VSUk9SJztcbmNvbnN0IE5PUk1BTF9GTE9XX0VSUk9SUyA9IG5ldyBTZXQoWydFTk9FTlQnLCAnRVBFUk0nLCAnRUFDQ0VTJywgJ0VMT09QJywgUkVDVVJTSVZFX0VSUk9SX0NPREVdKTtcbmNvbnN0IEFMTF9UWVBFUyA9IFtcbiAgICBFbnRyeVR5cGVzLkRJUl9UWVBFLFxuICAgIEVudHJ5VHlwZXMuRVZFUllUSElOR19UWVBFLFxuICAgIEVudHJ5VHlwZXMuRklMRV9ESVJfVFlQRSxcbiAgICBFbnRyeVR5cGVzLkZJTEVfVFlQRSxcbl07XG5jb25zdCBESVJfVFlQRVMgPSBuZXcgU2V0KFtcbiAgICBFbnRyeVR5cGVzLkRJUl9UWVBFLFxuICAgIEVudHJ5VHlwZXMuRVZFUllUSElOR19UWVBFLFxuICAgIEVudHJ5VHlwZXMuRklMRV9ESVJfVFlQRSxcbl0pO1xuY29uc3QgRklMRV9UWVBFUyA9IG5ldyBTZXQoW1xuICAgIEVudHJ5VHlwZXMuRVZFUllUSElOR19UWVBFLFxuICAgIEVudHJ5VHlwZXMuRklMRV9ESVJfVFlQRSxcbiAgICBFbnRyeVR5cGVzLkZJTEVfVFlQRSxcbl0pO1xuY29uc3QgaXNOb3JtYWxGbG93RXJyb3IgPSAoZXJyb3IpID0+IE5PUk1BTF9GTE9XX0VSUk9SUy5oYXMoZXJyb3IuY29kZSk7XG5jb25zdCB3YW50QmlnaW50RnNTdGF0cyA9IHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMic7XG5jb25zdCBlbXB0eUZuID0gKF9lbnRyeUluZm8pID0+IHRydWU7XG5jb25zdCBub3JtYWxpemVGaWx0ZXIgPSAoZmlsdGVyKSA9PiB7XG4gICAgaWYgKGZpbHRlciA9PT0gdW5kZWZpbmVkKVxuICAgICAgICByZXR1cm4gZW1wdHlGbjtcbiAgICBpZiAodHlwZW9mIGZpbHRlciA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgcmV0dXJuIGZpbHRlcjtcbiAgICBpZiAodHlwZW9mIGZpbHRlciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgY29uc3QgZmwgPSBmaWx0ZXIudHJpbSgpO1xuICAgICAgICByZXR1cm4gKGVudHJ5KSA9PiBlbnRyeS5iYXNlbmFtZSA9PT0gZmw7XG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KGZpbHRlcikpIHtcbiAgICAgICAgY29uc3QgdHJJdGVtcyA9IGZpbHRlci5tYXAoKGl0ZW0pID0+IGl0ZW0udHJpbSgpKTtcbiAgICAgICAgcmV0dXJuIChlbnRyeSkgPT4gdHJJdGVtcy5zb21lKChmKSA9PiBlbnRyeS5iYXNlbmFtZSA9PT0gZik7XG4gICAgfVxuICAgIHJldHVybiBlbXB0eUZuO1xufTtcbi8qKiBSZWFkYWJsZSByZWFkZGlyIHN0cmVhbSwgZW1pdHRpbmcgbmV3IGZpbGVzIGFzIHRoZXkncmUgYmVpbmcgbGlzdGVkLiAqL1xuZXhwb3J0IGNsYXNzIFJlYWRkaXJwU3RyZWFtIGV4dGVuZHMgUmVhZGFibGUge1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSkge1xuICAgICAgICBzdXBlcih7XG4gICAgICAgICAgICBvYmplY3RNb2RlOiB0cnVlLFxuICAgICAgICAgICAgYXV0b0Rlc3Ryb3k6IHRydWUsXG4gICAgICAgICAgICBoaWdoV2F0ZXJNYXJrOiBvcHRpb25zLmhpZ2hXYXRlck1hcmssXG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCBvcHRzID0geyAuLi5kZWZhdWx0T3B0aW9ucywgLi4ub3B0aW9ucyB9O1xuICAgICAgICBjb25zdCB7IHJvb3QsIHR5cGUgfSA9IG9wdHM7XG4gICAgICAgIHRoaXMuX2ZpbGVGaWx0ZXIgPSBub3JtYWxpemVGaWx0ZXIob3B0cy5maWxlRmlsdGVyKTtcbiAgICAgICAgdGhpcy5fZGlyZWN0b3J5RmlsdGVyID0gbm9ybWFsaXplRmlsdGVyKG9wdHMuZGlyZWN0b3J5RmlsdGVyKTtcbiAgICAgICAgY29uc3Qgc3RhdE1ldGhvZCA9IG9wdHMubHN0YXQgPyBsc3RhdCA6IHN0YXQ7XG4gICAgICAgIC8vIFVzZSBiaWdpbnQgc3RhdHMgaWYgaXQncyB3aW5kb3dzIGFuZCBzdGF0KCkgc3VwcG9ydHMgb3B0aW9ucyAobm9kZSAxMCspLlxuICAgICAgICBpZiAod2FudEJpZ2ludEZzU3RhdHMpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YXQgPSAocGF0aCkgPT4gc3RhdE1ldGhvZChwYXRoLCB7IGJpZ2ludDogdHJ1ZSB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YXQgPSBzdGF0TWV0aG9kO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX21heERlcHRoID0gb3B0cy5kZXB0aCA/PyBkZWZhdWx0T3B0aW9ucy5kZXB0aDtcbiAgICAgICAgdGhpcy5fd2FudHNEaXIgPSB0eXBlID8gRElSX1RZUEVTLmhhcyh0eXBlKSA6IGZhbHNlO1xuICAgICAgICB0aGlzLl93YW50c0ZpbGUgPSB0eXBlID8gRklMRV9UWVBFUy5oYXModHlwZSkgOiBmYWxzZTtcbiAgICAgICAgdGhpcy5fd2FudHNFdmVyeXRoaW5nID0gdHlwZSA9PT0gRW50cnlUeXBlcy5FVkVSWVRISU5HX1RZUEU7XG4gICAgICAgIHRoaXMuX3Jvb3QgPSBwcmVzb2x2ZShyb290KTtcbiAgICAgICAgdGhpcy5faXNEaXJlbnQgPSAhb3B0cy5hbHdheXNTdGF0O1xuICAgICAgICB0aGlzLl9zdGF0c1Byb3AgPSB0aGlzLl9pc0RpcmVudCA/ICdkaXJlbnQnIDogJ3N0YXRzJztcbiAgICAgICAgdGhpcy5fcmRPcHRpb25zID0geyBlbmNvZGluZzogJ3V0ZjgnLCB3aXRoRmlsZVR5cGVzOiB0aGlzLl9pc0RpcmVudCB9O1xuICAgICAgICAvLyBMYXVuY2ggc3RyZWFtIHdpdGggb25lIHBhcmVudCwgdGhlIHJvb3QgZGlyLlxuICAgICAgICB0aGlzLnBhcmVudHMgPSBbdGhpcy5fZXhwbG9yZURpcihyb290LCAxKV07XG4gICAgICAgIHRoaXMucmVhZGluZyA9IGZhbHNlO1xuICAgICAgICB0aGlzLnBhcmVudCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgYXN5bmMgX3JlYWQoYmF0Y2gpIHtcbiAgICAgICAgaWYgKHRoaXMucmVhZGluZylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdGhpcy5yZWFkaW5nID0gdHJ1ZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHdoaWxlICghdGhpcy5kZXN0cm95ZWQgJiYgYmF0Y2ggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyID0gdGhpcy5wYXJlbnQ7XG4gICAgICAgICAgICAgICAgY29uc3QgZmlsID0gcGFyICYmIHBhci5maWxlcztcbiAgICAgICAgICAgICAgICBpZiAoZmlsICYmIGZpbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcGF0aCwgZGVwdGggfSA9IHBhcjtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2xpY2UgPSBmaWwuc3BsaWNlKDAsIGJhdGNoKS5tYXAoKGRpcmVudCkgPT4gdGhpcy5fZm9ybWF0RW50cnkoZGlyZW50LCBwYXRoKSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGF3YWl0ZWQgPSBhd2FpdCBQcm9taXNlLmFsbChzbGljZSk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgYXdhaXRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlbnRyeSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmRlc3Ryb3llZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbnRyeVR5cGUgPSBhd2FpdCB0aGlzLl9nZXRFbnRyeVR5cGUoZW50cnkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVudHJ5VHlwZSA9PT0gJ2RpcmVjdG9yeScgJiYgdGhpcy5fZGlyZWN0b3J5RmlsdGVyKGVudHJ5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkZXB0aCA8PSB0aGlzLl9tYXhEZXB0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcmVudHMucHVzaCh0aGlzLl9leHBsb3JlRGlyKGVudHJ5LmZ1bGxQYXRoLCBkZXB0aCArIDEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuX3dhbnRzRGlyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaChlbnRyeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJhdGNoLS07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoKGVudHJ5VHlwZSA9PT0gJ2ZpbGUnIHx8IHRoaXMuX2luY2x1ZGVBc0ZpbGUoZW50cnkpKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2ZpbGVGaWx0ZXIoZW50cnkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuX3dhbnRzRmlsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2goZW50cnkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiYXRjaC0tO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyZW50ID0gdGhpcy5wYXJlbnRzLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXBhcmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wYXJlbnQgPSBhd2FpdCBwYXJlbnQ7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmRlc3Ryb3llZClcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3Ryb3koZXJyb3IpO1xuICAgICAgICB9XG4gICAgICAgIGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5yZWFkaW5nID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgYXN5bmMgX2V4cGxvcmVEaXIocGF0aCwgZGVwdGgpIHtcbiAgICAgICAgbGV0IGZpbGVzO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgZmlsZXMgPSBhd2FpdCByZWFkZGlyKHBhdGgsIHRoaXMuX3JkT3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICB0aGlzLl9vbkVycm9yKGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBmaWxlcywgZGVwdGgsIHBhdGggfTtcbiAgICB9XG4gICAgYXN5bmMgX2Zvcm1hdEVudHJ5KGRpcmVudCwgcGF0aCkge1xuICAgICAgICBsZXQgZW50cnk7XG4gICAgICAgIGNvbnN0IGJhc2VuYW1lID0gdGhpcy5faXNEaXJlbnQgPyBkaXJlbnQubmFtZSA6IGRpcmVudDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcHJlc29sdmUocGpvaW4ocGF0aCwgYmFzZW5hbWUpKTtcbiAgICAgICAgICAgIGVudHJ5ID0geyBwYXRoOiBwcmVsYXRpdmUodGhpcy5fcm9vdCwgZnVsbFBhdGgpLCBmdWxsUGF0aCwgYmFzZW5hbWUgfTtcbiAgICAgICAgICAgIGVudHJ5W3RoaXMuX3N0YXRzUHJvcF0gPSB0aGlzLl9pc0RpcmVudCA/IGRpcmVudCA6IGF3YWl0IHRoaXMuX3N0YXQoZnVsbFBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHRoaXMuX29uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZW50cnk7XG4gICAgfVxuICAgIF9vbkVycm9yKGVycikge1xuICAgICAgICBpZiAoaXNOb3JtYWxGbG93RXJyb3IoZXJyKSAmJiAhdGhpcy5kZXN0cm95ZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdCgnd2FybicsIGVycik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmRlc3Ryb3koZXJyKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBhc3luYyBfZ2V0RW50cnlUeXBlKGVudHJ5KSB7XG4gICAgICAgIC8vIGVudHJ5IG1heSBiZSB1bmRlZmluZWQsIGJlY2F1c2UgYSB3YXJuaW5nIG9yIGFuIGVycm9yIHdlcmUgZW1pdHRlZFxuICAgICAgICAvLyBhbmQgdGhlIHN0YXRzUHJvcCBpcyB1bmRlZmluZWRcbiAgICAgICAgaWYgKCFlbnRyeSAmJiB0aGlzLl9zdGF0c1Byb3AgaW4gZW50cnkpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzdGF0cyA9IGVudHJ5W3RoaXMuX3N0YXRzUHJvcF07XG4gICAgICAgIGlmIChzdGF0cy5pc0ZpbGUoKSlcbiAgICAgICAgICAgIHJldHVybiAnZmlsZSc7XG4gICAgICAgIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKVxuICAgICAgICAgICAgcmV0dXJuICdkaXJlY3RvcnknO1xuICAgICAgICBpZiAoc3RhdHMgJiYgc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgICAgY29uc3QgZnVsbCA9IGVudHJ5LmZ1bGxQYXRoO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBlbnRyeVJlYWxQYXRoID0gYXdhaXQgcmVhbHBhdGgoZnVsbCk7XG4gICAgICAgICAgICAgICAgY29uc3QgZW50cnlSZWFsUGF0aFN0YXRzID0gYXdhaXQgbHN0YXQoZW50cnlSZWFsUGF0aCk7XG4gICAgICAgICAgICAgICAgaWYgKGVudHJ5UmVhbFBhdGhTdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ2ZpbGUnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZW50cnlSZWFsUGF0aFN0YXRzLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGVuID0gZW50cnlSZWFsUGF0aC5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmdWxsLnN0YXJ0c1dpdGgoZW50cnlSZWFsUGF0aCkgJiYgZnVsbC5zdWJzdHIobGVuLCAxKSA9PT0gcHNlcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjdXJzaXZlRXJyb3IgPSBuZXcgRXJyb3IoYENpcmN1bGFyIHN5bWxpbmsgZGV0ZWN0ZWQ6IFwiJHtmdWxsfVwiIHBvaW50cyB0byBcIiR7ZW50cnlSZWFsUGF0aH1cImApO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVjdXJzaXZlRXJyb3IuY29kZSA9IFJFQ1VSU0lWRV9FUlJPUl9DT0RFO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29uRXJyb3IocmVjdXJzaXZlRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnZGlyZWN0b3J5JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9vbkVycm9yKGVycm9yKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgX2luY2x1ZGVBc0ZpbGUoZW50cnkpIHtcbiAgICAgICAgY29uc3Qgc3RhdHMgPSBlbnRyeSAmJiBlbnRyeVt0aGlzLl9zdGF0c1Byb3BdO1xuICAgICAgICByZXR1cm4gc3RhdHMgJiYgdGhpcy5fd2FudHNFdmVyeXRoaW5nICYmICFzdGF0cy5pc0RpcmVjdG9yeSgpO1xuICAgIH1cbn1cbi8qKlxuICogU3RyZWFtaW5nIHZlcnNpb246IFJlYWRzIGFsbCBmaWxlcyBhbmQgZGlyZWN0b3JpZXMgaW4gZ2l2ZW4gcm9vdCByZWN1cnNpdmVseS5cbiAqIENvbnN1bWVzIH5jb25zdGFudCBzbWFsbCBhbW91bnQgb2YgUkFNLlxuICogQHBhcmFtIHJvb3QgUm9vdCBkaXJlY3RvcnlcbiAqIEBwYXJhbSBvcHRpb25zIE9wdGlvbnMgdG8gc3BlY2lmeSByb290IChzdGFydCBkaXJlY3RvcnkpLCBmaWx0ZXJzIGFuZCByZWN1cnNpb24gZGVwdGhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRkaXJwKHJvb3QsIG9wdGlvbnMgPSB7fSkge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBsZXQgdHlwZSA9IG9wdGlvbnMuZW50cnlUeXBlIHx8IG9wdGlvbnMudHlwZTtcbiAgICBpZiAodHlwZSA9PT0gJ2JvdGgnKVxuICAgICAgICB0eXBlID0gRW50cnlUeXBlcy5GSUxFX0RJUl9UWVBFOyAvLyBiYWNrd2FyZHMtY29tcGF0aWJpbGl0eVxuICAgIGlmICh0eXBlKVxuICAgICAgICBvcHRpb25zLnR5cGUgPSB0eXBlO1xuICAgIGlmICghcm9vdCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlYWRkaXJwOiByb290IGFyZ3VtZW50IGlzIHJlcXVpcmVkLiBVc2FnZTogcmVhZGRpcnAocm9vdCwgb3B0aW9ucyknKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIHJvb3QgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3JlYWRkaXJwOiByb290IGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcuIFVzYWdlOiByZWFkZGlycChyb290LCBvcHRpb25zKScpO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlICYmICFBTExfVFlQRVMuaW5jbHVkZXModHlwZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGByZWFkZGlycDogSW52YWxpZCB0eXBlIHBhc3NlZC4gVXNlIG9uZSBvZiAke0FMTF9UWVBFUy5qb2luKCcsICcpfWApO1xuICAgIH1cbiAgICBvcHRpb25zLnJvb3QgPSByb290O1xuICAgIHJldHVybiBuZXcgUmVhZGRpcnBTdHJlYW0ob3B0aW9ucyk7XG59XG4vKipcbiAqIFByb21pc2UgdmVyc2lvbjogUmVhZHMgYWxsIGZpbGVzIGFuZCBkaXJlY3RvcmllcyBpbiBnaXZlbiByb290IHJlY3Vyc2l2ZWx5LlxuICogQ29tcGFyZWQgdG8gc3RyZWFtaW5nIHZlcnNpb24sIHdpbGwgY29uc3VtZSBhIGxvdCBvZiBSQU0gZS5nLiB3aGVuIDEgbWlsbGlvbiBmaWxlcyBhcmUgbGlzdGVkLlxuICogQHJldHVybnMgYXJyYXkgb2YgcGF0aHMgYW5kIHRoZWlyIGVudHJ5IGluZm9zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkZGlycFByb21pc2Uocm9vdCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgZmlsZXMgPSBbXTtcbiAgICAgICAgcmVhZGRpcnAocm9vdCwgb3B0aW9ucylcbiAgICAgICAgICAgIC5vbignZGF0YScsIChlbnRyeSkgPT4gZmlsZXMucHVzaChlbnRyeSkpXG4gICAgICAgICAgICAub24oJ2VuZCcsICgpID0+IHJlc29sdmUoZmlsZXMpKVxuICAgICAgICAgICAgLm9uKCdlcnJvcicsIChlcnJvcikgPT4gcmVqZWN0KGVycm9yKSk7XG4gICAgfSk7XG59XG5leHBvcnQgZGVmYXVsdCByZWFkZGlycDtcbiIsICJpbXBvcnQgeyB3YXRjaEZpbGUsIHVud2F0Y2hGaWxlLCB3YXRjaCBhcyBmc193YXRjaCB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IG9wZW4sIHN0YXQsIGxzdGF0LCByZWFscGF0aCBhcyBmc3JlYWxwYXRoIH0gZnJvbSAnZnMvcHJvbWlzZXMnO1xuaW1wb3J0ICogYXMgc3lzUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IHR5cGUgYXMgb3NUeXBlIH0gZnJvbSAnb3MnO1xuZXhwb3J0IGNvbnN0IFNUUl9EQVRBID0gJ2RhdGEnO1xuZXhwb3J0IGNvbnN0IFNUUl9FTkQgPSAnZW5kJztcbmV4cG9ydCBjb25zdCBTVFJfQ0xPU0UgPSAnY2xvc2UnO1xuZXhwb3J0IGNvbnN0IEVNUFRZX0ZOID0gKCkgPT4geyB9O1xuZXhwb3J0IGNvbnN0IElERU5USVRZX0ZOID0gKHZhbCkgPT4gdmFsO1xuY29uc3QgcGwgPSBwcm9jZXNzLnBsYXRmb3JtO1xuZXhwb3J0IGNvbnN0IGlzV2luZG93cyA9IHBsID09PSAnd2luMzInO1xuZXhwb3J0IGNvbnN0IGlzTWFjb3MgPSBwbCA9PT0gJ2Rhcndpbic7XG5leHBvcnQgY29uc3QgaXNMaW51eCA9IHBsID09PSAnbGludXgnO1xuZXhwb3J0IGNvbnN0IGlzRnJlZUJTRCA9IHBsID09PSAnZnJlZWJzZCc7XG5leHBvcnQgY29uc3QgaXNJQk1pID0gb3NUeXBlKCkgPT09ICdPUzQwMCc7XG5leHBvcnQgY29uc3QgRVZFTlRTID0ge1xuICAgIEFMTDogJ2FsbCcsXG4gICAgUkVBRFk6ICdyZWFkeScsXG4gICAgQUREOiAnYWRkJyxcbiAgICBDSEFOR0U6ICdjaGFuZ2UnLFxuICAgIEFERF9ESVI6ICdhZGREaXInLFxuICAgIFVOTElOSzogJ3VubGluaycsXG4gICAgVU5MSU5LX0RJUjogJ3VubGlua0RpcicsXG4gICAgUkFXOiAncmF3JyxcbiAgICBFUlJPUjogJ2Vycm9yJyxcbn07XG5jb25zdCBFViA9IEVWRU5UUztcbmNvbnN0IFRIUk9UVExFX01PREVfV0FUQ0ggPSAnd2F0Y2gnO1xuY29uc3Qgc3RhdE1ldGhvZHMgPSB7IGxzdGF0LCBzdGF0IH07XG5jb25zdCBLRVlfTElTVEVORVJTID0gJ2xpc3RlbmVycyc7XG5jb25zdCBLRVlfRVJSID0gJ2VyckhhbmRsZXJzJztcbmNvbnN0IEtFWV9SQVcgPSAncmF3RW1pdHRlcnMnO1xuY29uc3QgSEFORExFUl9LRVlTID0gW0tFWV9MSVNURU5FUlMsIEtFWV9FUlIsIEtFWV9SQVddO1xuLy8gcHJldHRpZXItaWdub3JlXG5jb25zdCBiaW5hcnlFeHRlbnNpb25zID0gbmV3IFNldChbXG4gICAgJzNkbScsICczZHMnLCAnM2cyJywgJzNncCcsICc3eicsICdhJywgJ2FhYycsICdhZHAnLCAnYWZkZXNpZ24nLCAnYWZwaG90bycsICdhZnB1YicsICdhaScsXG4gICAgJ2FpZicsICdhaWZmJywgJ2FseicsICdhcGUnLCAnYXBrJywgJ2FwcGltYWdlJywgJ2FyJywgJ2FyaicsICdhc2YnLCAnYXUnLCAnYXZpJyxcbiAgICAnYmFrJywgJ2JhbWwnLCAnYmgnLCAnYmluJywgJ2JrJywgJ2JtcCcsICdidGlmJywgJ2J6MicsICdiemlwMicsXG4gICAgJ2NhYicsICdjYWYnLCAnY2dtJywgJ2NsYXNzJywgJ2NteCcsICdjcGlvJywgJ2NyMicsICdjdXInLCAnZGF0JywgJ2RjbScsICdkZWInLCAnZGV4JywgJ2RqdnUnLFxuICAgICdkbGwnLCAnZG1nJywgJ2RuZycsICdkb2MnLCAnZG9jbScsICdkb2N4JywgJ2RvdCcsICdkb3RtJywgJ2RyYScsICdEU19TdG9yZScsICdkc2snLCAnZHRzJyxcbiAgICAnZHRzaGQnLCAnZHZiJywgJ2R3ZycsICdkeGYnLFxuICAgICdlY2VscDQ4MDAnLCAnZWNlbHA3NDcwJywgJ2VjZWxwOTYwMCcsICdlZ2cnLCAnZW9sJywgJ2VvdCcsICdlcHViJywgJ2V4ZScsXG4gICAgJ2Y0dicsICdmYnMnLCAnZmgnLCAnZmxhJywgJ2ZsYWMnLCAnZmxhdHBhaycsICdmbGknLCAnZmx2JywgJ2ZweCcsICdmc3QnLCAnZnZ0JyxcbiAgICAnZzMnLCAnZ2gnLCAnZ2lmJywgJ2dyYWZmbGUnLCAnZ3onLCAnZ3ppcCcsXG4gICAgJ2gyNjEnLCAnaDI2MycsICdoMjY0JywgJ2ljbnMnLCAnaWNvJywgJ2llZicsICdpbWcnLCAnaXBhJywgJ2lzbycsXG4gICAgJ2phcicsICdqcGVnJywgJ2pwZycsICdqcGd2JywgJ2pwbScsICdqeHInLCAna2V5JywgJ2t0eCcsXG4gICAgJ2xoYScsICdsaWInLCAnbHZwJywgJ2x6JywgJ2x6aCcsICdsem1hJywgJ2x6bycsXG4gICAgJ20zdScsICdtNGEnLCAnbTR2JywgJ21hcicsICdtZGknLCAnbWh0JywgJ21pZCcsICdtaWRpJywgJ21qMicsICdta2EnLCAnbWt2JywgJ21tcicsICdtbmcnLFxuICAgICdtb2JpJywgJ21vdicsICdtb3ZpZScsICdtcDMnLFxuICAgICdtcDQnLCAnbXA0YScsICdtcGVnJywgJ21wZycsICdtcGdhJywgJ214dScsXG4gICAgJ25lZicsICducHgnLCAnbnVtYmVycycsICdudXBrZycsXG4gICAgJ28nLCAnb2RwJywgJ29kcycsICdvZHQnLCAnb2dhJywgJ29nZycsICdvZ3YnLCAnb3RmJywgJ290dCcsXG4gICAgJ3BhZ2VzJywgJ3BibScsICdwY3gnLCAncGRiJywgJ3BkZicsICdwZWEnLCAncGdtJywgJ3BpYycsICdwbmcnLCAncG5tJywgJ3BvdCcsICdwb3RtJyxcbiAgICAncG90eCcsICdwcGEnLCAncHBhbScsXG4gICAgJ3BwbScsICdwcHMnLCAncHBzbScsICdwcHN4JywgJ3BwdCcsICdwcHRtJywgJ3BwdHgnLCAncHNkJywgJ3B5YScsICdweWMnLCAncHlvJywgJ3B5dicsXG4gICAgJ3F0JyxcbiAgICAncmFyJywgJ3JhcycsICdyYXcnLCAncmVzb3VyY2VzJywgJ3JnYicsICdyaXAnLCAncmxjJywgJ3JtZicsICdybXZiJywgJ3JwbScsICdydGYnLCAncnonLFxuICAgICdzM20nLCAnczd6JywgJ3NjcHQnLCAnc2dpJywgJ3NoYXInLCAnc25hcCcsICdzaWwnLCAnc2tldGNoJywgJ3NsaycsICdzbXYnLCAnc25rJywgJ3NvJyxcbiAgICAnc3RsJywgJ3N1bycsICdzdWInLCAnc3dmJyxcbiAgICAndGFyJywgJ3RieicsICd0YnoyJywgJ3RnYScsICd0Z3onLCAndGhteCcsICd0aWYnLCAndGlmZicsICd0bHonLCAndHRjJywgJ3R0ZicsICd0eHonLFxuICAgICd1ZGYnLCAndXZoJywgJ3V2aScsICd1dm0nLCAndXZwJywgJ3V2cycsICd1dnUnLFxuICAgICd2aXYnLCAndm9iJyxcbiAgICAnd2FyJywgJ3dhdicsICd3YXgnLCAnd2JtcCcsICd3ZHAnLCAnd2ViYScsICd3ZWJtJywgJ3dlYnAnLCAnd2hsJywgJ3dpbScsICd3bScsICd3bWEnLFxuICAgICd3bXYnLCAnd214JywgJ3dvZmYnLCAnd29mZjInLCAnd3JtJywgJ3d2eCcsXG4gICAgJ3hibScsICd4aWYnLCAneGxhJywgJ3hsYW0nLCAneGxzJywgJ3hsc2InLCAneGxzbScsICd4bHN4JywgJ3hsdCcsICd4bHRtJywgJ3hsdHgnLCAneG0nLFxuICAgICd4bWluZCcsICd4cGknLCAneHBtJywgJ3h3ZCcsICd4eicsXG4gICAgJ3onLCAnemlwJywgJ3ppcHgnLFxuXSk7XG5jb25zdCBpc0JpbmFyeVBhdGggPSAoZmlsZVBhdGgpID0+IGJpbmFyeUV4dGVuc2lvbnMuaGFzKHN5c1BhdGguZXh0bmFtZShmaWxlUGF0aCkuc2xpY2UoMSkudG9Mb3dlckNhc2UoKSk7XG4vLyBUT0RPOiBlbWl0IGVycm9ycyBwcm9wZXJseS4gRXhhbXBsZTogRU1GSUxFIG9uIE1hY29zLlxuY29uc3QgZm9yZWFjaCA9ICh2YWwsIGZuKSA9PiB7XG4gICAgaWYgKHZhbCBpbnN0YW5jZW9mIFNldCkge1xuICAgICAgICB2YWwuZm9yRWFjaChmbik7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBmbih2YWwpO1xuICAgIH1cbn07XG5jb25zdCBhZGRBbmRDb252ZXJ0ID0gKG1haW4sIHByb3AsIGl0ZW0pID0+IHtcbiAgICBsZXQgY29udGFpbmVyID0gbWFpbltwcm9wXTtcbiAgICBpZiAoIShjb250YWluZXIgaW5zdGFuY2VvZiBTZXQpKSB7XG4gICAgICAgIG1haW5bcHJvcF0gPSBjb250YWluZXIgPSBuZXcgU2V0KFtjb250YWluZXJdKTtcbiAgICB9XG4gICAgY29udGFpbmVyLmFkZChpdGVtKTtcbn07XG5jb25zdCBjbGVhckl0ZW0gPSAoY29udCkgPT4gKGtleSkgPT4ge1xuICAgIGNvbnN0IHNldCA9IGNvbnRba2V5XTtcbiAgICBpZiAoc2V0IGluc3RhbmNlb2YgU2V0KSB7XG4gICAgICAgIHNldC5jbGVhcigpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgZGVsZXRlIGNvbnRba2V5XTtcbiAgICB9XG59O1xuY29uc3QgZGVsRnJvbVNldCA9IChtYWluLCBwcm9wLCBpdGVtKSA9PiB7XG4gICAgY29uc3QgY29udGFpbmVyID0gbWFpbltwcm9wXTtcbiAgICBpZiAoY29udGFpbmVyIGluc3RhbmNlb2YgU2V0KSB7XG4gICAgICAgIGNvbnRhaW5lci5kZWxldGUoaXRlbSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGNvbnRhaW5lciA9PT0gaXRlbSkge1xuICAgICAgICBkZWxldGUgbWFpbltwcm9wXTtcbiAgICB9XG59O1xuY29uc3QgaXNFbXB0eVNldCA9ICh2YWwpID0+ICh2YWwgaW5zdGFuY2VvZiBTZXQgPyB2YWwuc2l6ZSA9PT0gMCA6ICF2YWwpO1xuY29uc3QgRnNXYXRjaEluc3RhbmNlcyA9IG5ldyBNYXAoKTtcbi8qKlxuICogSW5zdGFudGlhdGVzIHRoZSBmc193YXRjaCBpbnRlcmZhY2VcbiAqIEBwYXJhbSBwYXRoIHRvIGJlIHdhdGNoZWRcbiAqIEBwYXJhbSBvcHRpb25zIHRvIGJlIHBhc3NlZCB0byBmc193YXRjaFxuICogQHBhcmFtIGxpc3RlbmVyIG1haW4gZXZlbnQgaGFuZGxlclxuICogQHBhcmFtIGVyckhhbmRsZXIgZW1pdHMgaW5mbyBhYm91dCBlcnJvcnNcbiAqIEBwYXJhbSBlbWl0UmF3IGVtaXRzIHJhdyBldmVudCBkYXRhXG4gKiBAcmV0dXJucyB7TmF0aXZlRnNXYXRjaGVyfVxuICovXG5mdW5jdGlvbiBjcmVhdGVGc1dhdGNoSW5zdGFuY2UocGF0aCwgb3B0aW9ucywgbGlzdGVuZXIsIGVyckhhbmRsZXIsIGVtaXRSYXcpIHtcbiAgICBjb25zdCBoYW5kbGVFdmVudCA9IChyYXdFdmVudCwgZXZQYXRoKSA9PiB7XG4gICAgICAgIGxpc3RlbmVyKHBhdGgpO1xuICAgICAgICBlbWl0UmF3KHJhd0V2ZW50LCBldlBhdGgsIHsgd2F0Y2hlZFBhdGg6IHBhdGggfSk7XG4gICAgICAgIC8vIGVtaXQgYmFzZWQgb24gZXZlbnRzIG9jY3VycmluZyBmb3IgZmlsZXMgZnJvbSBhIGRpcmVjdG9yeSdzIHdhdGNoZXIgaW5cbiAgICAgICAgLy8gY2FzZSB0aGUgZmlsZSdzIHdhdGNoZXIgbWlzc2VzIGl0IChhbmQgcmVseSBvbiB0aHJvdHRsaW5nIHRvIGRlLWR1cGUpXG4gICAgICAgIGlmIChldlBhdGggJiYgcGF0aCAhPT0gZXZQYXRoKSB7XG4gICAgICAgICAgICBmc1dhdGNoQnJvYWRjYXN0KHN5c1BhdGgucmVzb2x2ZShwYXRoLCBldlBhdGgpLCBLRVlfTElTVEVORVJTLCBzeXNQYXRoLmpvaW4ocGF0aCwgZXZQYXRoKSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBmc193YXRjaChwYXRoLCB7XG4gICAgICAgICAgICBwZXJzaXN0ZW50OiBvcHRpb25zLnBlcnNpc3RlbnQsXG4gICAgICAgIH0sIGhhbmRsZUV2ZW50KTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGVyckhhbmRsZXIoZXJyb3IpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbn1cbi8qKlxuICogSGVscGVyIGZvciBwYXNzaW5nIGZzX3dhdGNoIGV2ZW50IGRhdGEgdG8gYSBjb2xsZWN0aW9uIG9mIGxpc3RlbmVyc1xuICogQHBhcmFtIGZ1bGxQYXRoIGFic29sdXRlIHBhdGggYm91bmQgdG8gZnNfd2F0Y2ggaW5zdGFuY2VcbiAqL1xuY29uc3QgZnNXYXRjaEJyb2FkY2FzdCA9IChmdWxsUGF0aCwgbGlzdGVuZXJUeXBlLCB2YWwxLCB2YWwyLCB2YWwzKSA9PiB7XG4gICAgY29uc3QgY29udCA9IEZzV2F0Y2hJbnN0YW5jZXMuZ2V0KGZ1bGxQYXRoKTtcbiAgICBpZiAoIWNvbnQpXG4gICAgICAgIHJldHVybjtcbiAgICBmb3JlYWNoKGNvbnRbbGlzdGVuZXJUeXBlXSwgKGxpc3RlbmVyKSA9PiB7XG4gICAgICAgIGxpc3RlbmVyKHZhbDEsIHZhbDIsIHZhbDMpO1xuICAgIH0pO1xufTtcbi8qKlxuICogSW5zdGFudGlhdGVzIHRoZSBmc193YXRjaCBpbnRlcmZhY2Ugb3IgYmluZHMgbGlzdGVuZXJzXG4gKiB0byBhbiBleGlzdGluZyBvbmUgY292ZXJpbmcgdGhlIHNhbWUgZmlsZSBzeXN0ZW0gZW50cnlcbiAqIEBwYXJhbSBwYXRoXG4gKiBAcGFyYW0gZnVsbFBhdGggYWJzb2x1dGUgcGF0aFxuICogQHBhcmFtIG9wdGlvbnMgdG8gYmUgcGFzc2VkIHRvIGZzX3dhdGNoXG4gKiBAcGFyYW0gaGFuZGxlcnMgY29udGFpbmVyIGZvciBldmVudCBsaXN0ZW5lciBmdW5jdGlvbnNcbiAqL1xuY29uc3Qgc2V0RnNXYXRjaExpc3RlbmVyID0gKHBhdGgsIGZ1bGxQYXRoLCBvcHRpb25zLCBoYW5kbGVycykgPT4ge1xuICAgIGNvbnN0IHsgbGlzdGVuZXIsIGVyckhhbmRsZXIsIHJhd0VtaXR0ZXIgfSA9IGhhbmRsZXJzO1xuICAgIGxldCBjb250ID0gRnNXYXRjaEluc3RhbmNlcy5nZXQoZnVsbFBhdGgpO1xuICAgIGxldCB3YXRjaGVyO1xuICAgIGlmICghb3B0aW9ucy5wZXJzaXN0ZW50KSB7XG4gICAgICAgIHdhdGNoZXIgPSBjcmVhdGVGc1dhdGNoSW5zdGFuY2UocGF0aCwgb3B0aW9ucywgbGlzdGVuZXIsIGVyckhhbmRsZXIsIHJhd0VtaXR0ZXIpO1xuICAgICAgICBpZiAoIXdhdGNoZXIpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHJldHVybiB3YXRjaGVyLmNsb3NlLmJpbmQod2F0Y2hlcik7XG4gICAgfVxuICAgIGlmIChjb250KSB7XG4gICAgICAgIGFkZEFuZENvbnZlcnQoY29udCwgS0VZX0xJU1RFTkVSUywgbGlzdGVuZXIpO1xuICAgICAgICBhZGRBbmRDb252ZXJ0KGNvbnQsIEtFWV9FUlIsIGVyckhhbmRsZXIpO1xuICAgICAgICBhZGRBbmRDb252ZXJ0KGNvbnQsIEtFWV9SQVcsIHJhd0VtaXR0ZXIpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgd2F0Y2hlciA9IGNyZWF0ZUZzV2F0Y2hJbnN0YW5jZShwYXRoLCBvcHRpb25zLCBmc1dhdGNoQnJvYWRjYXN0LmJpbmQobnVsbCwgZnVsbFBhdGgsIEtFWV9MSVNURU5FUlMpLCBlcnJIYW5kbGVyLCAvLyBubyBuZWVkIHRvIHVzZSBicm9hZGNhc3QgaGVyZVxuICAgICAgICBmc1dhdGNoQnJvYWRjYXN0LmJpbmQobnVsbCwgZnVsbFBhdGgsIEtFWV9SQVcpKTtcbiAgICAgICAgaWYgKCF3YXRjaGVyKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB3YXRjaGVyLm9uKEVWLkVSUk9SLCBhc3luYyAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGJyb2FkY2FzdEVyciA9IGZzV2F0Y2hCcm9hZGNhc3QuYmluZChudWxsLCBmdWxsUGF0aCwgS0VZX0VSUik7XG4gICAgICAgICAgICBpZiAoY29udClcbiAgICAgICAgICAgICAgICBjb250LndhdGNoZXJVbnVzYWJsZSA9IHRydWU7IC8vIGRvY3VtZW50ZWQgc2luY2UgTm9kZSAxMC40LjFcbiAgICAgICAgICAgIC8vIFdvcmthcm91bmQgZm9yIGh0dHBzOi8vZ2l0aHViLmNvbS9qb3llbnQvbm9kZS9pc3N1ZXMvNDMzN1xuICAgICAgICAgICAgaWYgKGlzV2luZG93cyAmJiBlcnJvci5jb2RlID09PSAnRVBFUk0nKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmQgPSBhd2FpdCBvcGVuKHBhdGgsICdyJyk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGZkLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyb2FkY2FzdEVycihlcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZG8gbm90aGluZ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGJyb2FkY2FzdEVycihlcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBjb250ID0ge1xuICAgICAgICAgICAgbGlzdGVuZXJzOiBsaXN0ZW5lcixcbiAgICAgICAgICAgIGVyckhhbmRsZXJzOiBlcnJIYW5kbGVyLFxuICAgICAgICAgICAgcmF3RW1pdHRlcnM6IHJhd0VtaXR0ZXIsXG4gICAgICAgICAgICB3YXRjaGVyLFxuICAgICAgICB9O1xuICAgICAgICBGc1dhdGNoSW5zdGFuY2VzLnNldChmdWxsUGF0aCwgY29udCk7XG4gICAgfVxuICAgIC8vIGNvbnN0IGluZGV4ID0gY29udC5saXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lcik7XG4gICAgLy8gcmVtb3ZlcyB0aGlzIGluc3RhbmNlJ3MgbGlzdGVuZXJzIGFuZCBjbG9zZXMgdGhlIHVuZGVybHlpbmcgZnNfd2F0Y2hcbiAgICAvLyBpbnN0YW5jZSBpZiB0aGVyZSBhcmUgbm8gbW9yZSBsaXN0ZW5lcnMgbGVmdFxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIGRlbEZyb21TZXQoY29udCwgS0VZX0xJU1RFTkVSUywgbGlzdGVuZXIpO1xuICAgICAgICBkZWxGcm9tU2V0KGNvbnQsIEtFWV9FUlIsIGVyckhhbmRsZXIpO1xuICAgICAgICBkZWxGcm9tU2V0KGNvbnQsIEtFWV9SQVcsIHJhd0VtaXR0ZXIpO1xuICAgICAgICBpZiAoaXNFbXB0eVNldChjb250Lmxpc3RlbmVycykpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIHRvIHByb3RlY3QgYWdhaW5zdCBpc3N1ZSBnaC03MzAuXG4gICAgICAgICAgICAvLyBpZiAoY29udC53YXRjaGVyVW51c2FibGUpIHtcbiAgICAgICAgICAgIGNvbnQud2F0Y2hlci5jbG9zZSgpO1xuICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgRnNXYXRjaEluc3RhbmNlcy5kZWxldGUoZnVsbFBhdGgpO1xuICAgICAgICAgICAgSEFORExFUl9LRVlTLmZvckVhY2goY2xlYXJJdGVtKGNvbnQpKTtcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgIGNvbnQud2F0Y2hlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIE9iamVjdC5mcmVlemUoY29udCk7XG4gICAgICAgIH1cbiAgICB9O1xufTtcbi8vIGZzX3dhdGNoRmlsZSBoZWxwZXJzXG4vLyBvYmplY3QgdG8gaG9sZCBwZXItcHJvY2VzcyBmc193YXRjaEZpbGUgaW5zdGFuY2VzXG4vLyAobWF5IGJlIHNoYXJlZCBhY3Jvc3MgY2hva2lkYXIgRlNXYXRjaGVyIGluc3RhbmNlcylcbmNvbnN0IEZzV2F0Y2hGaWxlSW5zdGFuY2VzID0gbmV3IE1hcCgpO1xuLyoqXG4gKiBJbnN0YW50aWF0ZXMgdGhlIGZzX3dhdGNoRmlsZSBpbnRlcmZhY2Ugb3IgYmluZHMgbGlzdGVuZXJzXG4gKiB0byBhbiBleGlzdGluZyBvbmUgY292ZXJpbmcgdGhlIHNhbWUgZmlsZSBzeXN0ZW0gZW50cnlcbiAqIEBwYXJhbSBwYXRoIHRvIGJlIHdhdGNoZWRcbiAqIEBwYXJhbSBmdWxsUGF0aCBhYnNvbHV0ZSBwYXRoXG4gKiBAcGFyYW0gb3B0aW9ucyBvcHRpb25zIHRvIGJlIHBhc3NlZCB0byBmc193YXRjaEZpbGVcbiAqIEBwYXJhbSBoYW5kbGVycyBjb250YWluZXIgZm9yIGV2ZW50IGxpc3RlbmVyIGZ1bmN0aW9uc1xuICogQHJldHVybnMgY2xvc2VyXG4gKi9cbmNvbnN0IHNldEZzV2F0Y2hGaWxlTGlzdGVuZXIgPSAocGF0aCwgZnVsbFBhdGgsIG9wdGlvbnMsIGhhbmRsZXJzKSA9PiB7XG4gICAgY29uc3QgeyBsaXN0ZW5lciwgcmF3RW1pdHRlciB9ID0gaGFuZGxlcnM7XG4gICAgbGV0IGNvbnQgPSBGc1dhdGNoRmlsZUluc3RhbmNlcy5nZXQoZnVsbFBhdGgpO1xuICAgIC8vIGxldCBsaXN0ZW5lcnMgPSBuZXcgU2V0KCk7XG4gICAgLy8gbGV0IHJhd0VtaXR0ZXJzID0gbmV3IFNldCgpO1xuICAgIGNvbnN0IGNvcHRzID0gY29udCAmJiBjb250Lm9wdGlvbnM7XG4gICAgaWYgKGNvcHRzICYmIChjb3B0cy5wZXJzaXN0ZW50IDwgb3B0aW9ucy5wZXJzaXN0ZW50IHx8IGNvcHRzLmludGVydmFsID4gb3B0aW9ucy5pbnRlcnZhbCkpIHtcbiAgICAgICAgLy8gXCJVcGdyYWRlXCIgdGhlIHdhdGNoZXIgdG8gcGVyc2lzdGVuY2Ugb3IgYSBxdWlja2VyIGludGVydmFsLlxuICAgICAgICAvLyBUaGlzIGNyZWF0ZXMgc29tZSB1bmxpa2VseSBlZGdlIGNhc2UgaXNzdWVzIGlmIHRoZSB1c2VyIG1peGVzXG4gICAgICAgIC8vIHNldHRpbmdzIGluIGEgdmVyeSB3ZWlyZCB3YXksIGJ1dCBzb2x2aW5nIGZvciB0aG9zZSBjYXNlc1xuICAgICAgICAvLyBkb2Vzbid0IHNlZW0gd29ydGh3aGlsZSBmb3IgdGhlIGFkZGVkIGNvbXBsZXhpdHkuXG4gICAgICAgIC8vIGxpc3RlbmVycyA9IGNvbnQubGlzdGVuZXJzO1xuICAgICAgICAvLyByYXdFbWl0dGVycyA9IGNvbnQucmF3RW1pdHRlcnM7XG4gICAgICAgIHVud2F0Y2hGaWxlKGZ1bGxQYXRoKTtcbiAgICAgICAgY29udCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgaWYgKGNvbnQpIHtcbiAgICAgICAgYWRkQW5kQ29udmVydChjb250LCBLRVlfTElTVEVORVJTLCBsaXN0ZW5lcik7XG4gICAgICAgIGFkZEFuZENvbnZlcnQoY29udCwgS0VZX1JBVywgcmF3RW1pdHRlcik7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICAvLyBUT0RPXG4gICAgICAgIC8vIGxpc3RlbmVycy5hZGQobGlzdGVuZXIpO1xuICAgICAgICAvLyByYXdFbWl0dGVycy5hZGQocmF3RW1pdHRlcik7XG4gICAgICAgIGNvbnQgPSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnM6IGxpc3RlbmVyLFxuICAgICAgICAgICAgcmF3RW1pdHRlcnM6IHJhd0VtaXR0ZXIsXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgd2F0Y2hlcjogd2F0Y2hGaWxlKGZ1bGxQYXRoLCBvcHRpb25zLCAoY3VyciwgcHJldikgPT4ge1xuICAgICAgICAgICAgICAgIGZvcmVhY2goY29udC5yYXdFbWl0dGVycywgKHJhd0VtaXR0ZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmF3RW1pdHRlcihFVi5DSEFOR0UsIGZ1bGxQYXRoLCB7IGN1cnIsIHByZXYgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgY29uc3QgY3Vycm10aW1lID0gY3Vyci5tdGltZU1zO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyLnNpemUgIT09IHByZXYuc2l6ZSB8fCBjdXJybXRpbWUgPiBwcmV2Lm10aW1lTXMgfHwgY3Vycm10aW1lID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcmVhY2goY29udC5saXN0ZW5lcnMsIChsaXN0ZW5lcikgPT4gbGlzdGVuZXIocGF0aCwgY3VycikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLFxuICAgICAgICB9O1xuICAgICAgICBGc1dhdGNoRmlsZUluc3RhbmNlcy5zZXQoZnVsbFBhdGgsIGNvbnQpO1xuICAgIH1cbiAgICAvLyBjb25zdCBpbmRleCA9IGNvbnQubGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpO1xuICAgIC8vIFJlbW92ZXMgdGhpcyBpbnN0YW5jZSdzIGxpc3RlbmVycyBhbmQgY2xvc2VzIHRoZSB1bmRlcmx5aW5nIGZzX3dhdGNoRmlsZVxuICAgIC8vIGluc3RhbmNlIGlmIHRoZXJlIGFyZSBubyBtb3JlIGxpc3RlbmVycyBsZWZ0LlxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIGRlbEZyb21TZXQoY29udCwgS0VZX0xJU1RFTkVSUywgbGlzdGVuZXIpO1xuICAgICAgICBkZWxGcm9tU2V0KGNvbnQsIEtFWV9SQVcsIHJhd0VtaXR0ZXIpO1xuICAgICAgICBpZiAoaXNFbXB0eVNldChjb250Lmxpc3RlbmVycykpIHtcbiAgICAgICAgICAgIEZzV2F0Y2hGaWxlSW5zdGFuY2VzLmRlbGV0ZShmdWxsUGF0aCk7XG4gICAgICAgICAgICB1bndhdGNoRmlsZShmdWxsUGF0aCk7XG4gICAgICAgICAgICBjb250Lm9wdGlvbnMgPSBjb250LndhdGNoZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBPYmplY3QuZnJlZXplKGNvbnQpO1xuICAgICAgICB9XG4gICAgfTtcbn07XG4vKipcbiAqIEBtaXhpblxuICovXG5leHBvcnQgY2xhc3MgTm9kZUZzSGFuZGxlciB7XG4gICAgY29uc3RydWN0b3IoZnNXKSB7XG4gICAgICAgIHRoaXMuZnN3ID0gZnNXO1xuICAgICAgICB0aGlzLl9ib3VuZEhhbmRsZUVycm9yID0gKGVycm9yKSA9PiBmc1cuX2hhbmRsZUVycm9yKGVycm9yKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogV2F0Y2ggZmlsZSBmb3IgY2hhbmdlcyB3aXRoIGZzX3dhdGNoRmlsZSBvciBmc193YXRjaC5cbiAgICAgKiBAcGFyYW0gcGF0aCB0byBmaWxlIG9yIGRpclxuICAgICAqIEBwYXJhbSBsaXN0ZW5lciBvbiBmcyBjaGFuZ2VcbiAgICAgKiBAcmV0dXJucyBjbG9zZXIgZm9yIHRoZSB3YXRjaGVyIGluc3RhbmNlXG4gICAgICovXG4gICAgX3dhdGNoV2l0aE5vZGVGcyhwYXRoLCBsaXN0ZW5lcikge1xuICAgICAgICBjb25zdCBvcHRzID0gdGhpcy5mc3cub3B0aW9ucztcbiAgICAgICAgY29uc3QgZGlyZWN0b3J5ID0gc3lzUGF0aC5kaXJuYW1lKHBhdGgpO1xuICAgICAgICBjb25zdCBiYXNlbmFtZSA9IHN5c1BhdGguYmFzZW5hbWUocGF0aCk7XG4gICAgICAgIGNvbnN0IHBhcmVudCA9IHRoaXMuZnN3Ll9nZXRXYXRjaGVkRGlyKGRpcmVjdG9yeSk7XG4gICAgICAgIHBhcmVudC5hZGQoYmFzZW5hbWUpO1xuICAgICAgICBjb25zdCBhYnNvbHV0ZVBhdGggPSBzeXNQYXRoLnJlc29sdmUocGF0aCk7XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgICAgICBwZXJzaXN0ZW50OiBvcHRzLnBlcnNpc3RlbnQsXG4gICAgICAgIH07XG4gICAgICAgIGlmICghbGlzdGVuZXIpXG4gICAgICAgICAgICBsaXN0ZW5lciA9IEVNUFRZX0ZOO1xuICAgICAgICBsZXQgY2xvc2VyO1xuICAgICAgICBpZiAob3B0cy51c2VQb2xsaW5nKSB7XG4gICAgICAgICAgICBjb25zdCBlbmFibGVCaW4gPSBvcHRzLmludGVydmFsICE9PSBvcHRzLmJpbmFyeUludGVydmFsO1xuICAgICAgICAgICAgb3B0aW9ucy5pbnRlcnZhbCA9IGVuYWJsZUJpbiAmJiBpc0JpbmFyeVBhdGgoYmFzZW5hbWUpID8gb3B0cy5iaW5hcnlJbnRlcnZhbCA6IG9wdHMuaW50ZXJ2YWw7XG4gICAgICAgICAgICBjbG9zZXIgPSBzZXRGc1dhdGNoRmlsZUxpc3RlbmVyKHBhdGgsIGFic29sdXRlUGF0aCwgb3B0aW9ucywge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLFxuICAgICAgICAgICAgICAgIHJhd0VtaXR0ZXI6IHRoaXMuZnN3Ll9lbWl0UmF3LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjbG9zZXIgPSBzZXRGc1dhdGNoTGlzdGVuZXIocGF0aCwgYWJzb2x1dGVQYXRoLCBvcHRpb25zLCB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXIsXG4gICAgICAgICAgICAgICAgZXJySGFuZGxlcjogdGhpcy5fYm91bmRIYW5kbGVFcnJvcixcbiAgICAgICAgICAgICAgICByYXdFbWl0dGVyOiB0aGlzLmZzdy5fZW1pdFJhdyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjbG9zZXI7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFdhdGNoIGEgZmlsZSBhbmQgZW1pdCBhZGQgZXZlbnQgaWYgd2FycmFudGVkLlxuICAgICAqIEByZXR1cm5zIGNsb3NlciBmb3IgdGhlIHdhdGNoZXIgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBfaGFuZGxlRmlsZShmaWxlLCBzdGF0cywgaW5pdGlhbEFkZCkge1xuICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGlybmFtZSA9IHN5c1BhdGguZGlybmFtZShmaWxlKTtcbiAgICAgICAgY29uc3QgYmFzZW5hbWUgPSBzeXNQYXRoLmJhc2VuYW1lKGZpbGUpO1xuICAgICAgICBjb25zdCBwYXJlbnQgPSB0aGlzLmZzdy5fZ2V0V2F0Y2hlZERpcihkaXJuYW1lKTtcbiAgICAgICAgLy8gc3RhdHMgaXMgYWx3YXlzIHByZXNlbnRcbiAgICAgICAgbGV0IHByZXZTdGF0cyA9IHN0YXRzO1xuICAgICAgICAvLyBpZiB0aGUgZmlsZSBpcyBhbHJlYWR5IGJlaW5nIHdhdGNoZWQsIGRvIG5vdGhpbmdcbiAgICAgICAgaWYgKHBhcmVudC5oYXMoYmFzZW5hbWUpKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCBsaXN0ZW5lciA9IGFzeW5jIChwYXRoLCBuZXdTdGF0cykgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmZzdy5fdGhyb3R0bGUoVEhST1RUTEVfTU9ERV9XQVRDSCwgZmlsZSwgNSkpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKCFuZXdTdGF0cyB8fCBuZXdTdGF0cy5tdGltZU1zID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3U3RhdHMgPSBhd2FpdCBzdGF0KGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayB0aGF0IGNoYW5nZSBldmVudCB3YXMgbm90IGZpcmVkIGJlY2F1c2Ugb2YgY2hhbmdlZCBvbmx5IGFjY2Vzc1RpbWUuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGF0ID0gbmV3U3RhdHMuYXRpbWVNcztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbXQgPSBuZXdTdGF0cy5tdGltZU1zO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWF0IHx8IGF0IDw9IG10IHx8IG10ICE9PSBwcmV2U3RhdHMubXRpbWVNcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX2VtaXQoRVYuQ0hBTkdFLCBmaWxlLCBuZXdTdGF0cyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKChpc01hY29zIHx8IGlzTGludXggfHwgaXNGcmVlQlNEKSAmJiBwcmV2U3RhdHMuaW5vICE9PSBuZXdTdGF0cy5pbm8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9jbG9zZUZpbGUocGF0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmV2U3RhdHMgPSBuZXdTdGF0cztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNsb3NlciA9IHRoaXMuX3dhdGNoV2l0aE5vZGVGcyhmaWxlLCBsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xvc2VyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9hZGRQYXRoQ2xvc2VyKHBhdGgsIGNsb3Nlcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmV2U3RhdHMgPSBuZXdTdGF0cztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRml4IGlzc3VlcyB3aGVyZSBtdGltZSBpcyBudWxsIGJ1dCBmaWxlIGlzIHN0aWxsIHByZXNlbnRcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX3JlbW92ZShkaXJuYW1lLCBiYXNlbmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGFkZCBpcyBhYm91dCB0byBiZSBlbWl0dGVkIGlmIGZpbGUgbm90IGFscmVhZHkgdHJhY2tlZCBpbiBwYXJlbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHBhcmVudC5oYXMoYmFzZW5hbWUpKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgdGhhdCBjaGFuZ2UgZXZlbnQgd2FzIG5vdCBmaXJlZCBiZWNhdXNlIG9mIGNoYW5nZWQgb25seSBhY2Nlc3NUaW1lLlxuICAgICAgICAgICAgICAgIGNvbnN0IGF0ID0gbmV3U3RhdHMuYXRpbWVNcztcbiAgICAgICAgICAgICAgICBjb25zdCBtdCA9IG5ld1N0YXRzLm10aW1lTXM7XG4gICAgICAgICAgICAgICAgaWYgKCFhdCB8fCBhdCA8PSBtdCB8fCBtdCAhPT0gcHJldlN0YXRzLm10aW1lTXMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX2VtaXQoRVYuQ0hBTkdFLCBmaWxlLCBuZXdTdGF0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHByZXZTdGF0cyA9IG5ld1N0YXRzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICAvLyBraWNrIG9mZiB0aGUgd2F0Y2hlclxuICAgICAgICBjb25zdCBjbG9zZXIgPSB0aGlzLl93YXRjaFdpdGhOb2RlRnMoZmlsZSwgbGlzdGVuZXIpO1xuICAgICAgICAvLyBlbWl0IGFuIGFkZCBldmVudCBpZiB3ZSdyZSBzdXBwb3NlZCB0b1xuICAgICAgICBpZiAoIShpbml0aWFsQWRkICYmIHRoaXMuZnN3Lm9wdGlvbnMuaWdub3JlSW5pdGlhbCkgJiYgdGhpcy5mc3cuX2lzbnRJZ25vcmVkKGZpbGUpKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuZnN3Ll90aHJvdHRsZShFVi5BREQsIGZpbGUsIDApKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIHRoaXMuZnN3Ll9lbWl0KEVWLkFERCwgZmlsZSwgc3RhdHMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjbG9zZXI7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBzeW1saW5rcyBlbmNvdW50ZXJlZCB3aGlsZSByZWFkaW5nIGEgZGlyLlxuICAgICAqIEBwYXJhbSBlbnRyeSByZXR1cm5lZCBieSByZWFkZGlycFxuICAgICAqIEBwYXJhbSBkaXJlY3RvcnkgcGF0aCBvZiBkaXIgYmVpbmcgcmVhZFxuICAgICAqIEBwYXJhbSBwYXRoIG9mIHRoaXMgaXRlbVxuICAgICAqIEBwYXJhbSBpdGVtIGJhc2VuYW1lIG9mIHRoaXMgaXRlbVxuICAgICAqIEByZXR1cm5zIHRydWUgaWYgbm8gbW9yZSBwcm9jZXNzaW5nIGlzIG5lZWRlZCBmb3IgdGhpcyBlbnRyeS5cbiAgICAgKi9cbiAgICBhc3luYyBfaGFuZGxlU3ltbGluayhlbnRyeSwgZGlyZWN0b3J5LCBwYXRoLCBpdGVtKSB7XG4gICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBmdWxsID0gZW50cnkuZnVsbFBhdGg7XG4gICAgICAgIGNvbnN0IGRpciA9IHRoaXMuZnN3Ll9nZXRXYXRjaGVkRGlyKGRpcmVjdG9yeSk7XG4gICAgICAgIGlmICghdGhpcy5mc3cub3B0aW9ucy5mb2xsb3dTeW1saW5rcykge1xuICAgICAgICAgICAgLy8gd2F0Y2ggc3ltbGluayBkaXJlY3RseSAoZG9uJ3QgZm9sbG93KSBhbmQgZGV0ZWN0IGNoYW5nZXNcbiAgICAgICAgICAgIHRoaXMuZnN3Ll9pbmNyUmVhZHlDb3VudCgpO1xuICAgICAgICAgICAgbGV0IGxpbmtQYXRoO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBsaW5rUGF0aCA9IGF3YWl0IGZzcmVhbHBhdGgocGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9lbWl0UmVhZHkoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKGRpci5oYXMoaXRlbSkpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mc3cuX3N5bWxpbmtQYXRocy5nZXQoZnVsbCkgIT09IGxpbmtQYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9zeW1saW5rUGF0aHMuc2V0KGZ1bGwsIGxpbmtQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX2VtaXQoRVYuQ0hBTkdFLCBwYXRoLCBlbnRyeS5zdGF0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZGlyLmFkZChpdGVtKTtcbiAgICAgICAgICAgICAgICB0aGlzLmZzdy5fc3ltbGlua1BhdGhzLnNldChmdWxsLCBsaW5rUGF0aCk7XG4gICAgICAgICAgICAgICAgdGhpcy5mc3cuX2VtaXQoRVYuQURELCBwYXRoLCBlbnRyeS5zdGF0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmZzdy5fZW1pdFJlYWR5KCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBkb24ndCBmb2xsb3cgdGhlIHNhbWUgc3ltbGluayBtb3JlIHRoYW4gb25jZVxuICAgICAgICBpZiAodGhpcy5mc3cuX3N5bWxpbmtQYXRocy5oYXMoZnVsbCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZnN3Ll9zeW1saW5rUGF0aHMuc2V0KGZ1bGwsIHRydWUpO1xuICAgIH1cbiAgICBfaGFuZGxlUmVhZChkaXJlY3RvcnksIGluaXRpYWxBZGQsIHdoLCB0YXJnZXQsIGRpciwgZGVwdGgsIHRocm90dGxlcikge1xuICAgICAgICAvLyBOb3JtYWxpemUgdGhlIGRpcmVjdG9yeSBuYW1lIG9uIFdpbmRvd3NcbiAgICAgICAgZGlyZWN0b3J5ID0gc3lzUGF0aC5qb2luKGRpcmVjdG9yeSwgJycpO1xuICAgICAgICB0aHJvdHRsZXIgPSB0aGlzLmZzdy5fdGhyb3R0bGUoJ3JlYWRkaXInLCBkaXJlY3RvcnksIDEwMDApO1xuICAgICAgICBpZiAoIXRocm90dGxlcilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY29uc3QgcHJldmlvdXMgPSB0aGlzLmZzdy5fZ2V0V2F0Y2hlZERpcih3aC5wYXRoKTtcbiAgICAgICAgY29uc3QgY3VycmVudCA9IG5ldyBTZXQoKTtcbiAgICAgICAgbGV0IHN0cmVhbSA9IHRoaXMuZnN3Ll9yZWFkZGlycChkaXJlY3RvcnksIHtcbiAgICAgICAgICAgIGZpbGVGaWx0ZXI6IChlbnRyeSkgPT4gd2guZmlsdGVyUGF0aChlbnRyeSksXG4gICAgICAgICAgICBkaXJlY3RvcnlGaWx0ZXI6IChlbnRyeSkgPT4gd2guZmlsdGVyRGlyKGVudHJ5KSxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghc3RyZWFtKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBzdHJlYW1cbiAgICAgICAgICAgIC5vbihTVFJfREFUQSwgYXN5bmMgKGVudHJ5KSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKSB7XG4gICAgICAgICAgICAgICAgc3RyZWFtID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBlbnRyeS5wYXRoO1xuICAgICAgICAgICAgbGV0IHBhdGggPSBzeXNQYXRoLmpvaW4oZGlyZWN0b3J5LCBpdGVtKTtcbiAgICAgICAgICAgIGN1cnJlbnQuYWRkKGl0ZW0pO1xuICAgICAgICAgICAgaWYgKGVudHJ5LnN0YXRzLmlzU3ltYm9saWNMaW5rKCkgJiZcbiAgICAgICAgICAgICAgICAoYXdhaXQgdGhpcy5faGFuZGxlU3ltbGluayhlbnRyeSwgZGlyZWN0b3J5LCBwYXRoLCBpdGVtKSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKSB7XG4gICAgICAgICAgICAgICAgc3RyZWFtID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZpbGVzIHRoYXQgcHJlc2VudCBpbiBjdXJyZW50IGRpcmVjdG9yeSBzbmFwc2hvdFxuICAgICAgICAgICAgLy8gYnV0IGFic2VudCBpbiBwcmV2aW91cyBhcmUgYWRkZWQgdG8gd2F0Y2ggbGlzdCBhbmRcbiAgICAgICAgICAgIC8vIGVtaXQgYGFkZGAgZXZlbnQuXG4gICAgICAgICAgICBpZiAoaXRlbSA9PT0gdGFyZ2V0IHx8ICghdGFyZ2V0ICYmICFwcmV2aW91cy5oYXMoaXRlbSkpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5mc3cuX2luY3JSZWFkeUNvdW50KCk7XG4gICAgICAgICAgICAgICAgLy8gZW5zdXJlIHJlbGF0aXZlbmVzcyBvZiBwYXRoIGlzIHByZXNlcnZlZCBpbiBjYXNlIG9mIHdhdGNoZXIgcmV1c2VcbiAgICAgICAgICAgICAgICBwYXRoID0gc3lzUGF0aC5qb2luKGRpciwgc3lzUGF0aC5yZWxhdGl2ZShkaXIsIHBhdGgpKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9hZGRUb05vZGVGcyhwYXRoLCBpbml0aWFsQWRkLCB3aCwgZGVwdGggKyAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgICAgIC5vbihFVi5FUlJPUiwgdGhpcy5fYm91bmRIYW5kbGVFcnJvcik7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAoIXN0cmVhbSlcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KCk7XG4gICAgICAgICAgICBzdHJlYW0ub25jZShTVFJfRU5ELCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZCkge1xuICAgICAgICAgICAgICAgICAgICBzdHJlYW0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3Qgd2FzVGhyb3R0bGVkID0gdGhyb3R0bGVyID8gdGhyb3R0bGVyLmNsZWFyKCkgOiBmYWxzZTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHVuZGVmaW5lZCk7XG4gICAgICAgICAgICAgICAgLy8gRmlsZXMgdGhhdCBhYnNlbnQgaW4gY3VycmVudCBkaXJlY3Rvcnkgc25hcHNob3RcbiAgICAgICAgICAgICAgICAvLyBidXQgcHJlc2VudCBpbiBwcmV2aW91cyBlbWl0IGByZW1vdmVgIGV2ZW50XG4gICAgICAgICAgICAgICAgLy8gYW5kIGFyZSByZW1vdmVkIGZyb20gQHdhdGNoZWRbZGlyZWN0b3J5XS5cbiAgICAgICAgICAgICAgICBwcmV2aW91c1xuICAgICAgICAgICAgICAgICAgICAuZ2V0Q2hpbGRyZW4oKVxuICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKChpdGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtICE9PSBkaXJlY3RvcnkgJiYgIWN1cnJlbnQuaGFzKGl0ZW0pO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9yZW1vdmUoZGlyZWN0b3J5LCBpdGVtKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBzdHJlYW0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgLy8gb25lIG1vcmUgdGltZSBmb3IgYW55IG1pc3NlZCBpbiBjYXNlIGNoYW5nZXMgY2FtZSBpbiBleHRyZW1lbHkgcXVpY2tseVxuICAgICAgICAgICAgICAgIGlmICh3YXNUaHJvdHRsZWQpXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZVJlYWQoZGlyZWN0b3J5LCBmYWxzZSwgd2gsIHRhcmdldCwgZGlyLCBkZXB0aCwgdGhyb3R0bGVyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmVhZCBkaXJlY3RvcnkgdG8gYWRkIC8gcmVtb3ZlIGZpbGVzIGZyb20gYEB3YXRjaGVkYCBsaXN0IGFuZCByZS1yZWFkIGl0IG9uIGNoYW5nZS5cbiAgICAgKiBAcGFyYW0gZGlyIGZzIHBhdGhcbiAgICAgKiBAcGFyYW0gc3RhdHNcbiAgICAgKiBAcGFyYW0gaW5pdGlhbEFkZFxuICAgICAqIEBwYXJhbSBkZXB0aCByZWxhdGl2ZSB0byB1c2VyLXN1cHBsaWVkIHBhdGhcbiAgICAgKiBAcGFyYW0gdGFyZ2V0IGNoaWxkIHBhdGggdGFyZ2V0ZWQgZm9yIHdhdGNoXG4gICAgICogQHBhcmFtIHdoIENvbW1vbiB3YXRjaCBoZWxwZXJzIGZvciB0aGlzIHBhdGhcbiAgICAgKiBAcGFyYW0gcmVhbHBhdGhcbiAgICAgKiBAcmV0dXJucyBjbG9zZXIgZm9yIHRoZSB3YXRjaGVyIGluc3RhbmNlLlxuICAgICAqL1xuICAgIGFzeW5jIF9oYW5kbGVEaXIoZGlyLCBzdGF0cywgaW5pdGlhbEFkZCwgZGVwdGgsIHRhcmdldCwgd2gsIHJlYWxwYXRoKSB7XG4gICAgICAgIGNvbnN0IHBhcmVudERpciA9IHRoaXMuZnN3Ll9nZXRXYXRjaGVkRGlyKHN5c1BhdGguZGlybmFtZShkaXIpKTtcbiAgICAgICAgY29uc3QgdHJhY2tlZCA9IHBhcmVudERpci5oYXMoc3lzUGF0aC5iYXNlbmFtZShkaXIpKTtcbiAgICAgICAgaWYgKCEoaW5pdGlhbEFkZCAmJiB0aGlzLmZzdy5vcHRpb25zLmlnbm9yZUluaXRpYWwpICYmICF0YXJnZXQgJiYgIXRyYWNrZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZnN3Ll9lbWl0KEVWLkFERF9ESVIsIGRpciwgc3RhdHMpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGVuc3VyZSBkaXIgaXMgdHJhY2tlZCAoaGFybWxlc3MgaWYgcmVkdW5kYW50KVxuICAgICAgICBwYXJlbnREaXIuYWRkKHN5c1BhdGguYmFzZW5hbWUoZGlyKSk7XG4gICAgICAgIHRoaXMuZnN3Ll9nZXRXYXRjaGVkRGlyKGRpcik7XG4gICAgICAgIGxldCB0aHJvdHRsZXI7XG4gICAgICAgIGxldCBjbG9zZXI7XG4gICAgICAgIGNvbnN0IG9EZXB0aCA9IHRoaXMuZnN3Lm9wdGlvbnMuZGVwdGg7XG4gICAgICAgIGlmICgob0RlcHRoID09IG51bGwgfHwgZGVwdGggPD0gb0RlcHRoKSAmJiAhdGhpcy5mc3cuX3N5bWxpbmtQYXRocy5oYXMocmVhbHBhdGgpKSB7XG4gICAgICAgICAgICBpZiAoIXRhcmdldCkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX2hhbmRsZVJlYWQoZGlyLCBpbml0aWFsQWRkLCB3aCwgdGFyZ2V0LCBkaXIsIGRlcHRoLCB0aHJvdHRsZXIpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNsb3NlciA9IHRoaXMuX3dhdGNoV2l0aE5vZGVGcyhkaXIsIChkaXJQYXRoLCBzdGF0cykgPT4ge1xuICAgICAgICAgICAgICAgIC8vIGlmIGN1cnJlbnQgZGlyZWN0b3J5IGlzIHJlbW92ZWQsIGRvIG5vdGhpbmdcbiAgICAgICAgICAgICAgICBpZiAoc3RhdHMgJiYgc3RhdHMubXRpbWVNcyA9PT0gMClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZVJlYWQoZGlyUGF0aCwgZmFsc2UsIHdoLCB0YXJnZXQsIGRpciwgZGVwdGgsIHRocm90dGxlcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2xvc2VyO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgYWRkZWQgZmlsZSwgZGlyZWN0b3J5LCBvciBnbG9iIHBhdHRlcm4uXG4gICAgICogRGVsZWdhdGVzIGNhbGwgdG8gX2hhbmRsZUZpbGUgLyBfaGFuZGxlRGlyIGFmdGVyIGNoZWNrcy5cbiAgICAgKiBAcGFyYW0gcGF0aCB0byBmaWxlIG9yIGlyXG4gICAgICogQHBhcmFtIGluaXRpYWxBZGQgd2FzIHRoZSBmaWxlIGFkZGVkIGF0IHdhdGNoIGluc3RhbnRpYXRpb24/XG4gICAgICogQHBhcmFtIHByaW9yV2ggZGVwdGggcmVsYXRpdmUgdG8gdXNlci1zdXBwbGllZCBwYXRoXG4gICAgICogQHBhcmFtIGRlcHRoIENoaWxkIHBhdGggYWN0dWFsbHkgdGFyZ2V0ZWQgZm9yIHdhdGNoXG4gICAgICogQHBhcmFtIHRhcmdldCBDaGlsZCBwYXRoIGFjdHVhbGx5IHRhcmdldGVkIGZvciB3YXRjaFxuICAgICAqL1xuICAgIGFzeW5jIF9hZGRUb05vZGVGcyhwYXRoLCBpbml0aWFsQWRkLCBwcmlvcldoLCBkZXB0aCwgdGFyZ2V0KSB7XG4gICAgICAgIGNvbnN0IHJlYWR5ID0gdGhpcy5mc3cuX2VtaXRSZWFkeTtcbiAgICAgICAgaWYgKHRoaXMuZnN3Ll9pc0lnbm9yZWQocGF0aCkgfHwgdGhpcy5mc3cuY2xvc2VkKSB7XG4gICAgICAgICAgICByZWFkeSgpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHdoID0gdGhpcy5mc3cuX2dldFdhdGNoSGVscGVycyhwYXRoKTtcbiAgICAgICAgaWYgKHByaW9yV2gpIHtcbiAgICAgICAgICAgIHdoLmZpbHRlclBhdGggPSAoZW50cnkpID0+IHByaW9yV2guZmlsdGVyUGF0aChlbnRyeSk7XG4gICAgICAgICAgICB3aC5maWx0ZXJEaXIgPSAoZW50cnkpID0+IHByaW9yV2guZmlsdGVyRGlyKGVudHJ5KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBldmFsdWF0ZSB3aGF0IGlzIGF0IHRoZSBwYXRoIHdlJ3JlIGJlaW5nIGFza2VkIHRvIHdhdGNoXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IHN0YXRNZXRob2RzW3doLnN0YXRNZXRob2RdKHdoLndhdGNoUGF0aCk7XG4gICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGlmICh0aGlzLmZzdy5faXNJZ25vcmVkKHdoLndhdGNoUGF0aCwgc3RhdHMpKSB7XG4gICAgICAgICAgICAgICAgcmVhZHkoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBmb2xsb3cgPSB0aGlzLmZzdy5vcHRpb25zLmZvbGxvd1N5bWxpbmtzO1xuICAgICAgICAgICAgbGV0IGNsb3NlcjtcbiAgICAgICAgICAgIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYWJzUGF0aCA9IHN5c1BhdGgucmVzb2x2ZShwYXRoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRQYXRoID0gZm9sbG93ID8gYXdhaXQgZnNyZWFscGF0aChwYXRoKSA6IHBhdGg7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGNsb3NlciA9IGF3YWl0IHRoaXMuX2hhbmRsZURpcih3aC53YXRjaFBhdGgsIHN0YXRzLCBpbml0aWFsQWRkLCBkZXB0aCwgdGFyZ2V0LCB3aCwgdGFyZ2V0UGF0aCk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIC8vIHByZXNlcnZlIHRoaXMgc3ltbGluaydzIHRhcmdldCBwYXRoXG4gICAgICAgICAgICAgICAgaWYgKGFic1BhdGggIT09IHRhcmdldFBhdGggJiYgdGFyZ2V0UGF0aCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9zeW1saW5rUGF0aHMuc2V0KGFic1BhdGgsIHRhcmdldFBhdGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHN0YXRzLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRQYXRoID0gZm9sbG93ID8gYXdhaXQgZnNyZWFscGF0aChwYXRoKSA6IHBhdGg7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudCA9IHN5c1BhdGguZGlybmFtZSh3aC53YXRjaFBhdGgpO1xuICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9nZXRXYXRjaGVkRGlyKHBhcmVudCkuYWRkKHdoLndhdGNoUGF0aCk7XG4gICAgICAgICAgICAgICAgdGhpcy5mc3cuX2VtaXQoRVYuQURELCB3aC53YXRjaFBhdGgsIHN0YXRzKTtcbiAgICAgICAgICAgICAgICBjbG9zZXIgPSBhd2FpdCB0aGlzLl9oYW5kbGVEaXIocGFyZW50LCBzdGF0cywgaW5pdGlhbEFkZCwgZGVwdGgsIHBhdGgsIHdoLCB0YXJnZXRQYXRoKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgLy8gcHJlc2VydmUgdGhpcyBzeW1saW5rJ3MgdGFyZ2V0IHBhdGhcbiAgICAgICAgICAgICAgICBpZiAodGFyZ2V0UGF0aCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9zeW1saW5rUGF0aHMuc2V0KHN5c1BhdGgucmVzb2x2ZShwYXRoKSwgdGFyZ2V0UGF0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY2xvc2VyID0gdGhpcy5faGFuZGxlRmlsZSh3aC53YXRjaFBhdGgsIHN0YXRzLCBpbml0aWFsQWRkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlYWR5KCk7XG4gICAgICAgICAgICBpZiAoY2xvc2VyKVxuICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9hZGRQYXRoQ2xvc2VyKHBhdGgsIGNsb3Nlcik7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5mc3cuX2hhbmRsZUVycm9yKGVycm9yKSkge1xuICAgICAgICAgICAgICAgIHJlYWR5KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhdGg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCAiaW1wb3J0IHsgYXBwZW5kRmlsZVN5bmMsIGV4aXN0c1N5bmMsIHJlYWRGaWxlU3luYywgc3RhdFN5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tIFwibm9kZTpmc1wiO1xuXG5leHBvcnQgY29uc3QgTUFYX0xPR19CWVRFUyA9IDEwICogMTAyNCAqIDEwMjQ7XG5cbmV4cG9ydCBmdW5jdGlvbiBhcHBlbmRDYXBwZWRMb2cocGF0aDogc3RyaW5nLCBsaW5lOiBzdHJpbmcsIG1heEJ5dGVzID0gTUFYX0xPR19CWVRFUyk6IHZvaWQge1xuICBjb25zdCBpbmNvbWluZyA9IEJ1ZmZlci5mcm9tKGxpbmUpO1xuICBpZiAoaW5jb21pbmcuYnl0ZUxlbmd0aCA+PSBtYXhCeXRlcykge1xuICAgIHdyaXRlRmlsZVN5bmMocGF0aCwgaW5jb21pbmcuc3ViYXJyYXkoaW5jb21pbmcuYnl0ZUxlbmd0aCAtIG1heEJ5dGVzKSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBpZiAoZXhpc3RzU3luYyhwYXRoKSkge1xuICAgICAgY29uc3Qgc2l6ZSA9IHN0YXRTeW5jKHBhdGgpLnNpemU7XG4gICAgICBjb25zdCBhbGxvd2VkRXhpc3RpbmcgPSBtYXhCeXRlcyAtIGluY29taW5nLmJ5dGVMZW5ndGg7XG4gICAgICBpZiAoc2l6ZSA+IGFsbG93ZWRFeGlzdGluZykge1xuICAgICAgICBjb25zdCBleGlzdGluZyA9IHJlYWRGaWxlU3luYyhwYXRoKTtcbiAgICAgICAgd3JpdGVGaWxlU3luYyhwYXRoLCBleGlzdGluZy5zdWJhcnJheShNYXRoLm1heCgwLCBleGlzdGluZy5ieXRlTGVuZ3RoIC0gYWxsb3dlZEV4aXN0aW5nKSkpO1xuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCB7XG4gICAgLy8gSWYgdHJpbW1pbmcgZmFpbHMsIHN0aWxsIHRyeSB0byBhcHBlbmQgYmVsb3c7IGxvZ2dpbmcgbXVzdCBiZSBiZXN0LWVmZm9ydC5cbiAgfVxuXG4gIGFwcGVuZEZpbGVTeW5jKHBhdGgsIGluY29taW5nKTtcbn1cbiIsICJpbXBvcnQgeyBleGlzdHNTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGRpcm5hbWUsIGpvaW4gfSBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgdHlwZSB7XG4gIENvZGV4Q2RwU3RhdHVzLFxuICBDb2RleENkcFRhcmdldCxcbiAgQ29kZXhSdW50aW1lQ2FwYWJpbGl0aWVzLFxuICBDb2RleFJ1bnRpbWVJbmZvLFxuICBDb2RleFJ1bnRpbWVUeXBlLFxufSBmcm9tIFwiQGNvZGV4LXBsdXNwbHVzL3Nka1wiO1xuXG4vKipcbiAqIFJ1bnRpbWUgY29tcGF0aWJpbGl0eSBpcyBjYXBhYmlsaXR5LWRyaXZlbi4gQXBwL3ZlcnNpb24gc3RyaW5ncyBhcmVcbiAqIGRpYWdub3N0aWMgbWV0YWRhdGEgb25seSBcdTIwMTQgdGhleSBtdXN0IG5vdCBnYXRlIGJlaGF2aW9yLiBQcm9iZSBhZGFwdGVyc1xuICogaW5zcGVjdCBleGlzdGluZyBzdXJmYWNlczsgdGhleSBuZXZlciBjcmVhdGUgd2luZG93cywgbXV0YXRlIHBlcnNpc3RlbnRcbiAqIHN0YXRlLCBvciB0b3VjaCB0aGUgbmV0d29yay5cbiAqL1xuXG5leHBvcnQgdHlwZSBSdW50aW1lU3VwcG9ydExldmVsID0gXCJzdXBwb3J0ZWRcIiB8IFwiZGVncmFkZWRcIiB8IFwidW5rbm93blwiO1xuZXhwb3J0IHR5cGUgUHJlbG9hZFJlZ2lzdHJhdGlvblN0cmF0ZWd5ID0gXCJyZWdpc3RlclByZWxvYWRTY3JpcHRcIiB8IFwic2V0UHJlbG9hZHNcIiB8IFwidW5hdmFpbGFibGVcIjtcblxuZXhwb3J0IGludGVyZmFjZSBQcm9iZUFwcEFkYXB0ZXIge1xuICBnZXRWZXJzaW9uPzogKCkgPT4gc3RyaW5nO1xuICBnZXRBcHBQYXRoPzogKCkgPT4gc3RyaW5nO1xuICBpc1BhY2thZ2VkPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQcm9iZVNlc3Npb25BZGFwdGVyIHtcbiAgcmVnaXN0ZXJQcmVsb2FkU2NyaXB0PzogdW5rbm93bjtcbiAgc2V0UHJlbG9hZHM/OiB1bmtub3duO1xuICBnZXRQcmVsb2Fkcz86IHVua25vd247XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvYmVXaW5kb3dTYW1wbGUge1xuICBhZGRCcm93c2VyVmlldz86IHVua25vd247XG4gIGZyb21JZD86IHVua25vd247XG4gIGNvbnRlbnRWaWV3PzogdW5rbm93bjtcbiAgYWRkQ2hpbGRWaWV3PzogdW5rbm93bjtcbiAgcmVtb3ZlQ2hpbGRWaWV3PzogdW5rbm93bjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQcm9iZVZpZXdTYW1wbGUge1xuICBwcmVzZW50PzogYm9vbGVhbjtcbiAgd2ViQ29udGVudHNWaWV3PzogdW5rbm93bjtcbiAgc2V0Qm91bmRzPzogdW5rbm93bjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSdW50aW1lUHJvYmVFbnYge1xuICBwbGF0Zm9ybT86IE5vZGVKUy5QbGF0Zm9ybTtcbiAgZXhlY1BhdGg/OiBzdHJpbmc7XG4gIHJlc291cmNlc1BhdGg/OiBzdHJpbmcgfCBudWxsO1xuICBleGlzdHNTeW5jPzogKHBhdGg6IHN0cmluZykgPT4gYm9vbGVhbjtcbiAgcHJvY2Vzc0Vudj86IE5vZGVKUy5Qcm9jZXNzRW52O1xuICBhcHA/OiBQcm9iZUFwcEFkYXB0ZXIgfCBudWxsO1xuICBzZXNzaW9uPzogeyBkZWZhdWx0U2Vzc2lvbj86IFByb2JlU2Vzc2lvbkFkYXB0ZXIgfCBudWxsIH0gfCBQcm9iZVNlc3Npb25BZGFwdGVyIHwgbnVsbDtcbiAgYnJvd3NlcldpbmRvdz86IHsgZnJvbUlkPzogdW5rbm93bjsgZ2V0Rm9jdXNlZFdpbmRvdz86ICgpID0+IHVua25vd247IGdldEFsbFdpbmRvd3M/OiAoKSA9PiB1bmtub3duW10gfSB8IG51bGw7XG4gIGJyb3dzZXJWaWV3PzogdW5rbm93bjtcbiAgZ2V0V2luZG93U2VydmljZXM/OiAoKSA9PiB1bmtub3duIHwgbnVsbDtcbiAgaW5zcGVjdEV4aXN0aW5nV2luZG93PzogKCkgPT4gUHJvYmVXaW5kb3dTYW1wbGUgfCBudWxsO1xuICBpbnNwZWN0QnJvd3NlclZpZXc/OiAoKSA9PiBQcm9iZVZpZXdTYW1wbGUgfCBudWxsO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJ1bnRpbWVQcm9iZU9wdGlvbnMge1xuICB1c2VyUm9vdDogc3RyaW5nO1xuICBydW50aW1lRGlyOiBzdHJpbmc7XG4gIGNvZGV4VmVyc2lvbjogc3RyaW5nIHwgbnVsbDtcbiAgY2hhbm5lbDogc3RyaW5nIHwgbnVsbDtcbiAgZ2V0V2luZG93U2VydmljZXMoKTogdW5rbm93biB8IG51bGw7XG4gIGdldE5hdGl2ZUNhcGFiaWxpdGllcz8oKTogQ29kZXhSdW50aW1lQ2FwYWJpbGl0aWVzW1wibmF0aXZlXCJdO1xuICBlbnY/OiBSdW50aW1lUHJvYmVFbnY7XG59XG5cbi8qKiBJbnRlcm5hbCBzbmFwc2hvdC4gTm90IHBhcnQgb2YgdGhlIHB1YmxpYyBTREsuICovXG5leHBvcnQgaW50ZXJmYWNlIFJ1bnRpbWVDb21wYXRpYmlsaXR5U25hcHNob3Qge1xuICBydW50aW1lVHlwZTogQ29kZXhSdW50aW1lVHlwZTtcbiAgYXBwVmVyc2lvbjogc3RyaW5nIHwgbnVsbDtcbiAgYnVpbGRGbGF2b3I6IHN0cmluZyB8IG51bGw7XG4gIHByZWxvYWQ6IHtcbiAgICByZWdpc3RlclByZWxvYWRTY3JpcHQ6IGJvb2xlYW47XG4gICAgc2V0UHJlbG9hZHNGYWxsYmFjazogYm9vbGVhbjtcbiAgfTtcbiAgd2luZG93czoge1xuICAgIHdpbmRvd1NlcnZpY2VzOiBib29sZWFuO1xuICAgIGNyZWF0ZVdpbmRvdzogYm9vbGVhbjtcbiAgICBnZXRQcmltYXJ5V2luZG93OiBib29sZWFuO1xuICAgIHJlZ2lzdGVyV2luZG93OiBib29sZWFuO1xuICB9O1xuICB2aWV3czoge1xuICAgIGJyb3dzZXJWaWV3OiBib29sZWFuO1xuICAgIGNvbnRlbnRWaWV3OiBib29sZWFuO1xuICAgIHdlYkNvbnRlbnRzVmlldzogYm9vbGVhbjtcbiAgICBwcml2YXRlVmlld1RyZWU6IGJvb2xlYW47XG4gIH07XG4gIHNoZWxsOiB7XG4gICAgb3dsOiBib29sZWFuO1xuICAgIGVsZWN0cm9uQ29tcGF0aWJsZTogYm9vbGVhbjtcbiAgfTtcbiAgc3VwcG9ydDoge1xuICAgIGxldmVsOiBSdW50aW1lU3VwcG9ydExldmVsO1xuICAgIHJlYXNvbnM6IHN0cmluZ1tdO1xuICB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEluc3BlY3RlZFdpbmRvd1NlcnZpY2VzIHtcbiAgcHJlc2VudDogYm9vbGVhbjtcbiAgY3JlYXRlV2luZG93OiBib29sZWFuO1xuICBjcmVhdGVGcmVzaFdpbmRvdzogYm9vbGVhbjtcbiAgY3JlYXRlRnJlc2hMb2NhbFdpbmRvdzogYm9vbGVhbjtcbiAgZW5zdXJlSG9zdFdpbmRvdzogYm9vbGVhbjtcbiAgZ2V0UHJpbWFyeVdpbmRvdzogYm9vbGVhbjtcbiAgZ2V0UHJpbWFyeVdpbmRvd0Zyb21NYW5hZ2VyOiBib29sZWFuO1xuICByZWdpc3RlcldpbmRvdzogYm9vbGVhbjtcbiAgY2FuQ3JlYXRlOiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFZpZXdBdHRhY2hUYXJnZXRzIHtcbiAgYWRkQnJvd3NlclZpZXc6IGJvb2xlYW47XG4gIGNvbnRlbnRWaWV3OiBib29sZWFuO1xuICBhZGRDaGlsZFZpZXc6IGJvb2xlYW47XG4gIHJlbW92ZUNoaWxkVmlldzogYm9vbGVhbjtcbiAgd2ViQ29udGVudHNWaWV3OiBib29sZWFuO1xuICB3ZWJDb250ZW50c1ZpZXdTZXRCb3VuZHM6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcm9iZVJ1bnRpbWVDb21wYXRpYmlsaXR5KG9wdHM6IFJ1bnRpbWVQcm9iZU9wdGlvbnMpOiBSdW50aW1lQ29tcGF0aWJpbGl0eVNuYXBzaG90IHtcbiAgY29uc3QgZW52ID0geyAuLi5jcmVhdGVEZWZhdWx0UHJvYmVFbnYob3B0cyksIC4uLm9wdHMuZW52IH07XG4gIGNvbnN0IGdldFdpbmRvd1NlcnZpY2VzID0gZW52LmdldFdpbmRvd1NlcnZpY2VzID8/IG9wdHMuZ2V0V2luZG93U2VydmljZXM7XG4gIGNvbnN0IHJ1bnRpbWVUeXBlID0gZGV0ZWN0UnVudGltZVR5cGUoZW52KTtcbiAgY29uc3QgYXBwVmVyc2lvbiA9IG9wdHMuY29kZXhWZXJzaW9uID8/IHNhZmVDYWxsKCgpID0+IGVudi5hcHA/LmdldFZlcnNpb24/LigpKSA/PyBudWxsO1xuICBjb25zdCBhcHBQYXRoID0gc2FmZUFwcFBhdGgoZW52KTtcbiAgY29uc3QgYnVpbGRGbGF2b3IgPSBzYWZlQnVpbGRGbGF2b3IoZW52LCBhcHBQYXRoKTtcbiAgY29uc3Qgc2Vzc2lvbiA9IGRlZmF1bHRTZXNzaW9uRnJvbShlbnYpO1xuICBjb25zdCBwcmVsb2FkU3RyYXRlZ3kgPSBzZWxlY3RQcmVsb2FkUmVnaXN0cmF0aW9uKHNlc3Npb24pO1xuICBjb25zdCB3aW5kb3dzID0gaW5zcGVjdFdpbmRvd1NlcnZpY2VzKHNhZmVDYWxsKGdldFdpbmRvd1NlcnZpY2VzKSA/PyBudWxsKTtcbiAgY29uc3Qgd2luZG93U2FtcGxlID0gZW52Lmluc3BlY3RFeGlzdGluZ1dpbmRvdz8uKCkgPz8gbnVsbDtcbiAgY29uc3Qgdmlld1NhbXBsZSA9IGVudi5pbnNwZWN0QnJvd3NlclZpZXc/LigpID8/IHZpZXdTYW1wbGVGcm9tQ29uc3RydWN0b3IoZW52LmJyb3dzZXJWaWV3KTtcbiAgY29uc3QgYXR0YWNoID0gaW5zcGVjdFZpZXdBdHRhY2hUYXJnZXRzKHdpbmRvd1NhbXBsZVRvUGFyZW50KHdpbmRvd1NhbXBsZSksIHZpZXdTYW1wbGVUb1ZpZXcodmlld1NhbXBsZSkpO1xuICBjb25zdCBicm93c2VyVmlld0N0b3IgPSBlbnYuYnJvd3NlclZpZXcgIT0gbnVsbCB8fCBCb29sZWFuKHZpZXdTYW1wbGU/LnByZXNlbnQpO1xuICBjb25zdCBicm93c2VyVmlldyA9IGF0dGFjaC5hZGRCcm93c2VyVmlldyB8fCBicm93c2VyVmlld0N0b3I7XG4gIGNvbnN0IHdlYkNvbnRlbnRzVmlld09ic2VydmVkID0gQm9vbGVhbih2aWV3U2FtcGxlPy53ZWJDb250ZW50c1ZpZXcpIHx8IGF0dGFjaC53ZWJDb250ZW50c1ZpZXc7XG4gIGNvbnN0IHdlYkNvbnRlbnRzVmlld1NldEJvdW5kcyA9XG4gICAgYXR0YWNoLndlYkNvbnRlbnRzVmlld1NldEJvdW5kcyB8fFxuICAgIGlzRm4oYXNSZWNvcmQodmlld1NhbXBsZT8ud2ViQ29udGVudHNWaWV3KT8uc2V0Qm91bmRzKTtcbiAgY29uc3Qgd2ViQ29udGVudHNWaWV3ID0gd2ViQ29udGVudHNWaWV3T2JzZXJ2ZWQgJiYgd2ViQ29udGVudHNWaWV3U2V0Qm91bmRzO1xuICBjb25zdCBwcml2YXRlVmlld1RyZWUgPSBhdHRhY2guYWRkQ2hpbGRWaWV3ICYmIGF0dGFjaC5yZW1vdmVDaGlsZFZpZXcgJiYgd2ViQ29udGVudHNWaWV3O1xuICBjb25zdCBlbGVjdHJvbkNvbXBhdGlibGUgPVxuICAgIHJ1bnRpbWVUeXBlID09PSBcImVsZWN0cm9uXCIgfHxcbiAgICBydW50aW1lVHlwZSA9PT0gXCJvd2xcIiB8fFxuICAgIHNlc3Npb24gIT0gbnVsbCB8fFxuICAgIGVudi5icm93c2VyV2luZG93ICE9IG51bGwgfHxcbiAgICBlbnYuYnJvd3NlclZpZXcgIT0gbnVsbCB8fFxuICAgIGVudi5hcHAgIT0gbnVsbDtcbiAgY29uc3Qgb3dsID0gcnVudGltZVR5cGUgPT09IFwib3dsXCI7XG4gIGNvbnN0IHByZWxvYWQgPSB7XG4gICAgcmVnaXN0ZXJQcmVsb2FkU2NyaXB0OiBwcmVsb2FkU3RyYXRlZ3kgPT09IFwicmVnaXN0ZXJQcmVsb2FkU2NyaXB0XCIsXG4gICAgc2V0UHJlbG9hZHNGYWxsYmFjazogaXNGbihhc1JlY29yZChzZXNzaW9uKT8uc2V0UHJlbG9hZHMpLFxuICB9O1xuICBjb25zdCBzbmFwc2hvdFdpbmRvd3MgPSB7XG4gICAgd2luZG93U2VydmljZXM6IHdpbmRvd3MucHJlc2VudCxcbiAgICBjcmVhdGVXaW5kb3c6IHdpbmRvd3MuY2FuQ3JlYXRlLFxuICAgIGdldFByaW1hcnlXaW5kb3c6IHdpbmRvd3MuZ2V0UHJpbWFyeVdpbmRvdyB8fCB3aW5kb3dzLmdldFByaW1hcnlXaW5kb3dGcm9tTWFuYWdlcixcbiAgICByZWdpc3RlcldpbmRvdzogd2luZG93cy5yZWdpc3RlcldpbmRvdyxcbiAgfTtcbiAgY29uc3Qgc25hcHNob3RWaWV3cyA9IHtcbiAgICBicm93c2VyVmlldyxcbiAgICBjb250ZW50VmlldzogYXR0YWNoLmNvbnRlbnRWaWV3LFxuICAgIHdlYkNvbnRlbnRzVmlldyxcbiAgICBwcml2YXRlVmlld1RyZWUsXG4gIH07XG4gIGNvbnN0IHNoZWxsID0geyBvd2wsIGVsZWN0cm9uQ29tcGF0aWJsZSB9O1xuICByZXR1cm4ge1xuICAgIHJ1bnRpbWVUeXBlLFxuICAgIGFwcFZlcnNpb24sXG4gICAgYnVpbGRGbGF2b3IsXG4gICAgcHJlbG9hZCxcbiAgICB3aW5kb3dzOiBzbmFwc2hvdFdpbmRvd3MsXG4gICAgdmlld3M6IHNuYXBzaG90Vmlld3MsXG4gICAgc2hlbGwsXG4gICAgc3VwcG9ydDogc3VwcG9ydEZyb20ocnVudGltZVR5cGUsIGVsZWN0cm9uQ29tcGF0aWJsZSwgcHJlbG9hZCwgc25hcHNob3RXaW5kb3dzLCBzbmFwc2hvdFZpZXdzKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFJ1bnRpbWVJbmZvKG9wdHM6IFJ1bnRpbWVQcm9iZU9wdGlvbnMpOiBDb2RleFJ1bnRpbWVJbmZvIHtcbiAgY29uc3Qgc25hcHNob3QgPSBwcm9iZVJ1bnRpbWVDb21wYXRpYmlsaXR5KG9wdHMpO1xuICBjb25zdCBlbnYgPSB7IC4uLmNyZWF0ZURlZmF1bHRQcm9iZUVudihvcHRzKSwgLi4ub3B0cy5lbnYgfTtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiBzbmFwc2hvdC5ydW50aW1lVHlwZSxcbiAgICBjb2RleFZlcnNpb246IHNuYXBzaG90LmFwcFZlcnNpb24sXG4gICAgY2hhbm5lbDogb3B0cy5jaGFubmVsLFxuICAgIGJ1aWxkRmxhdm9yOiBzbmFwc2hvdC5idWlsZEZsYXZvcixcbiAgICB1c2VzT3dsQXBwU2hlbGw6IG51bGwsXG4gICAgYXBwUGF0aDogc2FmZUFwcFBhdGgoZW52KSxcbiAgICByZXNvdXJjZXNQYXRoOiBlbnYucmVzb3VyY2VzUGF0aCA/PyBudWxsLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UnVudGltZUNhcGFiaWxpdGllcyhvcHRzOiBSdW50aW1lUHJvYmVPcHRpb25zKTogQ29kZXhSdW50aW1lQ2FwYWJpbGl0aWVzIHtcbiAgY29uc3Qgc25hcHNob3QgPSBwcm9iZVJ1bnRpbWVDb21wYXRpYmlsaXR5KG9wdHMpO1xuICBjb25zdCBuYXRpdmUgPSBvcHRzLmdldE5hdGl2ZUNhcGFiaWxpdGllcz8uKCkgPz8gZGVmYXVsdE5hdGl2ZUNhcGFiaWxpdGllcyhvcHRzLmVudj8ucGxhdGZvcm0gPz8gcHJvY2Vzcy5wbGF0Zm9ybSk7XG4gIGNvbnN0IGVudiA9IHsgLi4uY3JlYXRlRGVmYXVsdFByb2JlRW52KG9wdHMpLCAuLi5vcHRzLmVudiB9O1xuICBjb25zdCBjYW5Gb2N1cyA9IGlzRm4oYXNSZWNvcmQoZW52LmJyb3dzZXJXaW5kb3cpPy5mcm9tSWQpIHx8IHNuYXBzaG90LnNoZWxsLmVsZWN0cm9uQ29tcGF0aWJsZTtcbiAgcmV0dXJuIGNhcGFiaWxpdGllc0Zyb21TbmFwc2hvdChzbmFwc2hvdCwgbmF0aXZlLCBjYW5Gb2N1cyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYXBhYmlsaXRpZXNGcm9tU25hcHNob3QoXG4gIHNuYXBzaG90OiBSdW50aW1lQ29tcGF0aWJpbGl0eVNuYXBzaG90LFxuICBuYXRpdmU6IENvZGV4UnVudGltZUNhcGFiaWxpdGllc1tcIm5hdGl2ZVwiXSxcbiAgY2FuRm9jdXMgPSB0cnVlLFxuKTogQ29kZXhSdW50aW1lQ2FwYWJpbGl0aWVzIHtcbiAgY29uc3QgY2RwID0gZ2V0Q2RwU3RhdHVzKCk7XG4gIHJldHVybiB7XG4gICAgd2luZG93czoge1xuICAgICAgY3JlYXRlOiBzbmFwc2hvdC53aW5kb3dzLmNyZWF0ZVdpbmRvdyxcbiAgICAgIGZvY3VzOiBjYW5Gb2N1cyxcbiAgICAgIHByaW1hcnk6IHNuYXBzaG90LndpbmRvd3MuZ2V0UHJpbWFyeVdpbmRvdyxcbiAgICAgIGJyb3dzZXJWaWV3OiBzbmFwc2hvdC53aW5kb3dzLnJlZ2lzdGVyV2luZG93LFxuICAgIH0sXG4gICAgdmlld3M6IHZpZXdzQ2FwYWJpbGl0aWVzRnJvbVNuYXBzaG90KHNuYXBzaG90KSxcbiAgICBjZHA6IHtcbiAgICAgIHN1cHBvcnRlZDogdHJ1ZSxcbiAgICAgIGVuYWJsZWQ6IGNkcC5lbmFibGVkLFxuICAgICAgcG9ydDogY2RwLnBvcnQsXG4gICAgfSxcbiAgICBuYXRpdmUsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2aWV3c0NhcGFiaWxpdGllc0Zyb21TbmFwc2hvdChcbiAgc25hcHNob3Q6IFJ1bnRpbWVDb21wYXRpYmlsaXR5U25hcHNob3QsXG4pOiBDb2RleFJ1bnRpbWVDYXBhYmlsaXRpZXNbXCJ2aWV3c1wiXSB7XG4gIGNvbnN0IHByaXZhdGVBdHRhY2ggPSBzbmFwc2hvdC52aWV3cy5wcml2YXRlVmlld1RyZWU7XG4gIHJldHVybiB7XG4gICAgY3JlYXRlOiBwcml2YXRlQXR0YWNoIHx8IHNuYXBzaG90LnZpZXdzLmJyb3dzZXJWaWV3LFxuICAgIHByaXZhdGVWaWV3VHJlZTogcHJpdmF0ZUF0dGFjaCxcbiAgICB3ZWJDb250ZW50c1ZpZXc6IHNuYXBzaG90LnZpZXdzLndlYkNvbnRlbnRzVmlldyxcbiAgICBicm93c2VyVmlld0ZhbGxiYWNrOiBzbmFwc2hvdC52aWV3cy5icm93c2VyVmlldyxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldENkcFN0YXR1cygpOiBDb2RleENkcFN0YXR1cyB7XG4gIGNvbnN0IGVuYWJsZWQgPSBwcm9jZXNzLmVudi5DT0RFWFBQX1JFTU9URV9ERUJVRyA9PT0gXCIxXCI7XG4gIGNvbnN0IHBvcnQgPSBwYXJzZUNkcFBvcnQocHJvY2Vzcy5lbnYuQ09ERVhQUF9SRU1PVEVfREVCVUdfUE9SVCk7XG4gIHJldHVybiB7XG4gICAgc3VwcG9ydGVkOiB0cnVlLFxuICAgIGVuYWJsZWQsXG4gICAgcG9ydDogZW5hYmxlZCA/IHBvcnQgOiBudWxsLFxuICAgIHVybDogZW5hYmxlZCA/IGBodHRwOi8vMTI3LjAuMC4xOiR7cG9ydH1gIDogbnVsbCxcbiAgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxpc3RDZHBUYXJnZXRzKCk6IFByb21pc2U8Q29kZXhDZHBUYXJnZXRbXT4ge1xuICBjb25zdCBzdGF0dXMgPSBnZXRDZHBTdGF0dXMoKTtcbiAgaWYgKCFzdGF0dXMuZW5hYmxlZCB8fCAhc3RhdHVzLnVybCkgcmV0dXJuIFtdO1xuICBjb25zdCBjb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICBjb25zdCB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiBjb250cm9sbGVyLmFib3J0KCksIDEwMDApO1xuICB0cnkge1xuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKGAke3N0YXR1cy51cmx9L2pzb25gLCB7IHNpZ25hbDogY29udHJvbGxlci5zaWduYWwgfSk7XG4gICAgaWYgKCFyZXMub2spIHJldHVybiBbXTtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgcmVzLmpzb24oKSBhcyB1bmtub3duO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShyb3dzKSkgcmV0dXJuIFtdO1xuICAgIHJldHVybiByb3dzXG4gICAgICAubWFwKChyb3cpID0+IG5vcm1hbGl6ZUNkcFRhcmdldChyb3cpKVxuICAgICAgLmZpbHRlcigocm93KTogcm93IGlzIENvZGV4Q2RwVGFyZ2V0ID0+IHJvdyAhPT0gbnVsbCk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBbXTtcbiAgfSBmaW5hbGx5IHtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlbGVjdFByZWxvYWRSZWdpc3RyYXRpb24oc2Vzc2lvbkxpa2U6IHVua25vd24pOiBQcmVsb2FkUmVnaXN0cmF0aW9uU3RyYXRlZ3kge1xuICBjb25zdCBzZXNzaW9uID0gYXNSZWNvcmQoc2Vzc2lvbkxpa2UpO1xuICBpZiAoaXNGbihzZXNzaW9uPy5yZWdpc3RlclByZWxvYWRTY3JpcHQpKSByZXR1cm4gXCJyZWdpc3RlclByZWxvYWRTY3JpcHRcIjtcbiAgaWYgKGlzRm4oc2Vzc2lvbj8uc2V0UHJlbG9hZHMpKSByZXR1cm4gXCJzZXRQcmVsb2Fkc1wiO1xuICByZXR1cm4gXCJ1bmF2YWlsYWJsZVwiO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5zcGVjdFdpbmRvd1NlcnZpY2VzKHNlcnZpY2VzOiB1bmtub3duKTogSW5zcGVjdGVkV2luZG93U2VydmljZXMge1xuICBjb25zdCByZWMgPSBhc1JlY29yZChzZXJ2aWNlcyk7XG4gIGNvbnN0IHdpbmRvd01hbmFnZXIgPSBhc1JlY29yZChyZWM/LndpbmRvd01hbmFnZXIpO1xuICBjb25zdCBjcmVhdGVXaW5kb3cgPSBpc0ZuKHdpbmRvd01hbmFnZXI/LmNyZWF0ZVdpbmRvdyk7XG4gIGNvbnN0IGNyZWF0ZUZyZXNoV2luZG93ID0gaXNGbihyZWM/LmNyZWF0ZUZyZXNoV2luZG93KTtcbiAgY29uc3QgY3JlYXRlRnJlc2hMb2NhbFdpbmRvdyA9IGlzRm4ocmVjPy5jcmVhdGVGcmVzaExvY2FsV2luZG93KTtcbiAgY29uc3QgZW5zdXJlSG9zdFdpbmRvdyA9IGlzRm4ocmVjPy5lbnN1cmVIb3N0V2luZG93KTtcbiAgY29uc3QgZ2V0UHJpbWFyeVdpbmRvdyA9IGlzRm4ocmVjPy5nZXRQcmltYXJ5V2luZG93KTtcbiAgY29uc3QgZ2V0UHJpbWFyeVdpbmRvd0Zyb21NYW5hZ2VyID0gaXNGbih3aW5kb3dNYW5hZ2VyPy5nZXRQcmltYXJ5V2luZG93KTtcbiAgY29uc3QgcmVnaXN0ZXJXaW5kb3cgPSBpc0ZuKHdpbmRvd01hbmFnZXI/LnJlZ2lzdGVyV2luZG93KTtcbiAgcmV0dXJuIHtcbiAgICBwcmVzZW50OiByZWMgIT09IG51bGwsXG4gICAgY3JlYXRlV2luZG93LFxuICAgIGNyZWF0ZUZyZXNoV2luZG93LFxuICAgIGNyZWF0ZUZyZXNoTG9jYWxXaW5kb3csXG4gICAgZW5zdXJlSG9zdFdpbmRvdyxcbiAgICBnZXRQcmltYXJ5V2luZG93LFxuICAgIGdldFByaW1hcnlXaW5kb3dGcm9tTWFuYWdlcixcbiAgICByZWdpc3RlcldpbmRvdyxcbiAgICBjYW5DcmVhdGU6IGNyZWF0ZVdpbmRvdyB8fCBjcmVhdGVGcmVzaFdpbmRvdyB8fCBjcmVhdGVGcmVzaExvY2FsV2luZG93IHx8IGVuc3VyZUhvc3RXaW5kb3csXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbnNwZWN0Vmlld0F0dGFjaFRhcmdldHMocGFyZW50OiB1bmtub3duLCB2aWV3PzogdW5rbm93bik6IFZpZXdBdHRhY2hUYXJnZXRzIHtcbiAgY29uc3QgcGFyZW50UmVjb3JkID0gYXNSZWNvcmQocGFyZW50KTtcbiAgY29uc3QgY29udGVudFZpZXcgPSBhc1JlY29yZChwYXJlbnRSZWNvcmQ/LmNvbnRlbnRWaWV3KTtcbiAgY29uc3Qgdmlld1JlY29yZCA9IGFzUmVjb3JkKHZpZXcpO1xuICBjb25zdCB3ZWJDb250ZW50c1ZpZXcgPSBhc1JlY29yZCh2aWV3UmVjb3JkPy53ZWJDb250ZW50c1ZpZXcpO1xuICBjb25zdCB3ZWJDb250ZW50c1ZpZXdQcmVzZW50ID0gQm9vbGVhbih2aWV3UmVjb3JkICYmIHZpZXdSZWNvcmQud2ViQ29udGVudHNWaWV3KTtcbiAgcmV0dXJuIHtcbiAgICBhZGRCcm93c2VyVmlldzogaXNGbihwYXJlbnRSZWNvcmQ/LmFkZEJyb3dzZXJWaWV3KSxcbiAgICBjb250ZW50VmlldzogY29udGVudFZpZXcgIT09IG51bGwsXG4gICAgYWRkQ2hpbGRWaWV3OiBpc0ZuKGNvbnRlbnRWaWV3Py5hZGRDaGlsZFZpZXcpLFxuICAgIHJlbW92ZUNoaWxkVmlldzogaXNGbihjb250ZW50Vmlldz8ucmVtb3ZlQ2hpbGRWaWV3KSxcbiAgICB3ZWJDb250ZW50c1ZpZXc6IHdlYkNvbnRlbnRzVmlld1ByZXNlbnQsXG4gICAgd2ViQ29udGVudHNWaWV3U2V0Qm91bmRzOiBpc0ZuKHdlYkNvbnRlbnRzVmlldz8uc2V0Qm91bmRzKSB8fCBpc0ZuKHZpZXdSZWNvcmQ/LnNldEJvdW5kcyksXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3aW5kb3dTYW1wbGVGcm9tKHdpbjogdW5rbm93bik6IFByb2JlV2luZG93U2FtcGxlIHwgbnVsbCB7XG4gIGNvbnN0IHJlYyA9IGFzUmVjb3JkKHdpbik7XG4gIGlmICghcmVjKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgY29udGVudFZpZXcgPSBhc1JlY29yZChyZWMuY29udGVudFZpZXcpO1xuICByZXR1cm4ge1xuICAgIGFkZEJyb3dzZXJWaWV3OiByZWMuYWRkQnJvd3NlclZpZXcsXG4gICAgZnJvbUlkOiByZWMuZnJvbUlkLFxuICAgIGNvbnRlbnRWaWV3OiByZWMuY29udGVudFZpZXcsXG4gICAgYWRkQ2hpbGRWaWV3OiBjb250ZW50Vmlldz8uYWRkQ2hpbGRWaWV3LFxuICAgIHJlbW92ZUNoaWxkVmlldzogY29udGVudFZpZXc/LnJlbW92ZUNoaWxkVmlldyxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZpZXdTYW1wbGVGcm9tQ29uc3RydWN0b3IoYnJvd3NlclZpZXc6IHVua25vd24pOiBQcm9iZVZpZXdTYW1wbGUgfCBudWxsIHtcbiAgaWYgKGJyb3dzZXJWaWV3ID09IG51bGwpIHJldHVybiBudWxsO1xuICBjb25zdCBjdG9yID0gYXNSZWNvcmQoYnJvd3NlclZpZXcpO1xuICBjb25zdCBwcm90byA9IGFzUmVjb3JkKGN0b3I/LnByb3RvdHlwZSkgPz8gKHR5cGVvZiBicm93c2VyVmlldyA9PT0gXCJvYmplY3RcIiA/IGFzUmVjb3JkKE9iamVjdC5nZXRQcm90b3R5cGVPZihicm93c2VyVmlldykpIDogbnVsbCk7XG4gIGNvbnN0IHdlYkNvbnRlbnRzVmlldyA9IHByb3RvPy53ZWJDb250ZW50c1ZpZXcgPz8gY3Rvcj8ud2ViQ29udGVudHNWaWV3O1xuICByZXR1cm4ge1xuICAgIHByZXNlbnQ6IHR5cGVvZiBicm93c2VyVmlldyA9PT0gXCJmdW5jdGlvblwiIHx8IHByb3RvICE9PSBudWxsLFxuICAgIHdlYkNvbnRlbnRzVmlldyxcbiAgICBzZXRCb3VuZHM6IGFzUmVjb3JkKHdlYkNvbnRlbnRzVmlldyk/LnNldEJvdW5kcyA/PyBwcm90bz8uc2V0Qm91bmRzLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRGVmYXVsdFByb2JlRW52KG9wdHM/OiBQaWNrPFJ1bnRpbWVQcm9iZU9wdGlvbnMsIFwiZ2V0V2luZG93U2VydmljZXNcIj4pOiBSdW50aW1lUHJvYmVFbnYge1xuICBjb25zdCBlbGVjdHJvbiA9IHRyeVJlcXVpcmVFbGVjdHJvbigpO1xuICBjb25zdCBCcm93c2VyV2luZG93ID0gZWxlY3Ryb24/LkJyb3dzZXJXaW5kb3c7XG4gIGNvbnN0IEJyb3dzZXJWaWV3ID0gZWxlY3Ryb24/LkJyb3dzZXJWaWV3O1xuICByZXR1cm4ge1xuICAgIHBsYXRmb3JtOiBwcm9jZXNzLnBsYXRmb3JtLFxuICAgIGV4ZWNQYXRoOiBwcm9jZXNzLmV4ZWNQYXRoLFxuICAgIHJlc291cmNlc1BhdGg6IHByb2Nlc3MucmVzb3VyY2VzUGF0aCA/PyBudWxsLFxuICAgIGV4aXN0c1N5bmMsXG4gICAgcHJvY2Vzc0VudjogcHJvY2Vzcy5lbnYsXG4gICAgYXBwOiBlbGVjdHJvbj8uYXBwID8/IG51bGwsXG4gICAgc2Vzc2lvbjogZWxlY3Ryb24/LnNlc3Npb24gPz8gbnVsbCxcbiAgICBicm93c2VyV2luZG93OiBCcm93c2VyV2luZG93ID8/IG51bGwsXG4gICAgYnJvd3NlclZpZXc6IEJyb3dzZXJWaWV3ID8/IG51bGwsXG4gICAgZ2V0V2luZG93U2VydmljZXM6IG9wdHM/LmdldFdpbmRvd1NlcnZpY2VzLFxuICAgIGluc3BlY3RFeGlzdGluZ1dpbmRvdzogKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgZm9jdXNlZCA9IEJyb3dzZXJXaW5kb3c/LmdldEZvY3VzZWRXaW5kb3c/LigpO1xuICAgICAgICBpZiAoZm9jdXNlZCkgcmV0dXJuIHdpbmRvd1NhbXBsZUZyb20oZm9jdXNlZCk7XG4gICAgICAgIGNvbnN0IHdpbmRvd3MgPSBCcm93c2VyV2luZG93Py5nZXRBbGxXaW5kb3dzPy4oKSA/PyBbXTtcbiAgICAgICAgY29uc3QgbGl2ZSA9IHdpbmRvd3MuZmluZCgod2luKSA9PiB7XG4gICAgICAgICAgY29uc3QgaXNEZXN0cm95ZWQgPSBhc1JlY29yZCh3aW4pPy5pc0Rlc3Ryb3llZDtcbiAgICAgICAgICByZXR1cm4gdHlwZW9mIGlzRGVzdHJveWVkICE9PSBcImZ1bmN0aW9uXCIgfHwgIWlzRGVzdHJveWVkLmNhbGwod2luKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB3aW5kb3dTYW1wbGVGcm9tKGxpdmUgPz8gbnVsbCk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfSxcbiAgICBpbnNwZWN0QnJvd3NlclZpZXc6ICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGZyb21DdG9yID0gdmlld1NhbXBsZUZyb21Db25zdHJ1Y3RvcihCcm93c2VyVmlldyk7XG4gICAgICAgIGlmIChmcm9tQ3Rvcj8ud2ViQ29udGVudHNWaWV3KSByZXR1cm4gZnJvbUN0b3I7XG4gICAgICAgIGNvbnN0IHdpbmRvd3MgPSBCcm93c2VyV2luZG93Py5nZXRBbGxXaW5kb3dzPy4oKSA/PyBbXTtcbiAgICAgICAgZm9yIChjb25zdCB3aW4gb2Ygd2luZG93cykge1xuICAgICAgICAgIGNvbnN0IHZpZXdzID0gYXNSZWNvcmQod2luKT8uZ2V0QnJvd3NlclZpZXdzO1xuICAgICAgICAgIGlmICh0eXBlb2Ygdmlld3MgIT09IFwiZnVuY3Rpb25cIikgY29udGludWU7XG4gICAgICAgICAgY29uc3QgbGlzdGVkID0gdmlld3MuY2FsbCh3aW4pO1xuICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShsaXN0ZWQpKSBjb250aW51ZTtcbiAgICAgICAgICBmb3IgKGNvbnN0IHZpZXcgb2YgbGlzdGVkKSB7XG4gICAgICAgICAgICBjb25zdCBzYW1wbGUgPSB2aWV3U2FtcGxlRnJvbUluc3RhbmNlKHZpZXcpO1xuICAgICAgICAgICAgaWYgKHNhbXBsZT8ud2ViQ29udGVudHNWaWV3KSByZXR1cm4gc2FtcGxlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZnJvbUN0b3I7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIHZpZXdTYW1wbGVGcm9tQ29uc3RydWN0b3IoQnJvd3NlclZpZXcpO1xuICAgICAgfVxuICAgIH0sXG4gIH07XG59XG5cbmZ1bmN0aW9uIHN1cHBvcnRGcm9tKFxuICBydW50aW1lVHlwZTogQ29kZXhSdW50aW1lVHlwZSxcbiAgZWxlY3Ryb25Db21wYXRpYmxlOiBib29sZWFuLFxuICBwcmVsb2FkOiBSdW50aW1lQ29tcGF0aWJpbGl0eVNuYXBzaG90W1wicHJlbG9hZFwiXSxcbiAgd2luZG93czogUnVudGltZUNvbXBhdGliaWxpdHlTbmFwc2hvdFtcIndpbmRvd3NcIl0sXG4gIHZpZXdzOiBSdW50aW1lQ29tcGF0aWJpbGl0eVNuYXBzaG90W1widmlld3NcIl0sXG4pOiBSdW50aW1lQ29tcGF0aWJpbGl0eVNuYXBzaG90W1wic3VwcG9ydFwiXSB7XG4gIGNvbnN0IHJlYXNvbnM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IGhhc1VzZWZ1bENhcGFiaWxpdHkgPVxuICAgIHdpbmRvd3Mud2luZG93U2VydmljZXMgfHxcbiAgICB3aW5kb3dzLmNyZWF0ZVdpbmRvdyB8fFxuICAgIHByZWxvYWQucmVnaXN0ZXJQcmVsb2FkU2NyaXB0IHx8XG4gICAgcHJlbG9hZC5zZXRQcmVsb2Fkc0ZhbGxiYWNrIHx8XG4gICAgdmlld3MuYnJvd3NlclZpZXcgfHxcbiAgICB2aWV3cy5wcml2YXRlVmlld1RyZWUgfHxcbiAgICBlbGVjdHJvbkNvbXBhdGlibGU7XG5cbiAgaWYgKHJ1bnRpbWVUeXBlID09PSBcInVua25vd25cIiAmJiAhaGFzVXNlZnVsQ2FwYWJpbGl0eSkge1xuICAgIHJldHVybiB7IGxldmVsOiBcInVua25vd25cIiwgcmVhc29uczogW1wicnVudGltZSB0eXBlIGFuZCBjYXBhYmlsaXRpZXMgY291bGQgbm90IGJlIGRldGVybWluZWRcIl0gfTtcbiAgfVxuICBpZiAocnVudGltZVR5cGUgPT09IFwidW5rbm93blwiICYmIGhhc1VzZWZ1bENhcGFiaWxpdHkpIHtcbiAgICByZWFzb25zLnB1c2goXCJydW50aW1lIHR5cGUgY291bGQgbm90IGJlIGRldGVybWluZWRcIik7XG4gIH1cblxuICBpZiAoIXdpbmRvd3Mud2luZG93U2VydmljZXMpIHJlYXNvbnMucHVzaChcIndpbmRvdyBzZXJ2aWNlcyB1bmF2YWlsYWJsZVwiKTtcbiAgaWYgKCF3aW5kb3dzLmNyZWF0ZVdpbmRvdykgcmVhc29ucy5wdXNoKFwiY3JlYXRlV2luZG93IHVuYXZhaWxhYmxlXCIpO1xuICBpZiAoIXByZWxvYWQucmVnaXN0ZXJQcmVsb2FkU2NyaXB0ICYmIHByZWxvYWQuc2V0UHJlbG9hZHNGYWxsYmFjaykge1xuICAgIHJlYXNvbnMucHVzaChcInJlZ2lzdGVyUHJlbG9hZFNjcmlwdCBtaXNzaW5nOyB1c2luZyBzZXRQcmVsb2FkcyBmYWxsYmFja1wiKTtcbiAgfSBlbHNlIGlmICghcHJlbG9hZC5yZWdpc3RlclByZWxvYWRTY3JpcHQgJiYgIXByZWxvYWQuc2V0UHJlbG9hZHNGYWxsYmFjaykge1xuICAgIHJlYXNvbnMucHVzaChcIm5vIHNlc3Npb24gcHJlbG9hZCByZWdpc3RyYXRpb24gQVBJXCIpO1xuICB9XG4gIGlmICghdmlld3MucHJpdmF0ZVZpZXdUcmVlICYmIHZpZXdzLmJyb3dzZXJWaWV3KSB7XG4gICAgcmVhc29ucy5wdXNoKFwicHJpdmF0ZSBjb250ZW50VmlldyB1bmF2YWlsYWJsZTsgdXNpbmcgQnJvd3NlclZpZXcgZmFsbGJhY2tcIik7XG4gIH0gZWxzZSBpZiAoIXZpZXdzLnByaXZhdGVWaWV3VHJlZSAmJiAhdmlld3MuYnJvd3NlclZpZXcpIHtcbiAgICByZWFzb25zLnB1c2goXCJubyB2aWV3IGF0dGFjaG1lbnQgc3VyZmFjZVwiKTtcbiAgfVxuXG4gIGNvbnN0IHVzaW5nRmFsbGJhY2sgPVxuICAgICghcHJlbG9hZC5yZWdpc3RlclByZWxvYWRTY3JpcHQgJiYgcHJlbG9hZC5zZXRQcmVsb2Fkc0ZhbGxiYWNrKSB8fFxuICAgICghdmlld3MucHJpdmF0ZVZpZXdUcmVlICYmIHZpZXdzLmJyb3dzZXJWaWV3KSB8fFxuICAgIHJ1bnRpbWVUeXBlID09PSBcImVsZWN0cm9uXCIgfHxcbiAgICAhd2luZG93cy53aW5kb3dTZXJ2aWNlcyB8fFxuICAgICF3aW5kb3dzLmNyZWF0ZVdpbmRvdztcblxuICBpZiAocnVudGltZVR5cGUgPT09IFwidW5rbm93blwiKSB7XG4gICAgcmV0dXJuIHsgbGV2ZWw6IFwidW5rbm93blwiLCByZWFzb25zIH07XG4gIH1cbiAgaWYgKHVzaW5nRmFsbGJhY2spIHtcbiAgICByZXR1cm4geyBsZXZlbDogXCJkZWdyYWRlZFwiLCByZWFzb25zIH07XG4gIH1cbiAgcmV0dXJuIHsgbGV2ZWw6IFwic3VwcG9ydGVkXCIsIHJlYXNvbnM6IFtdIH07XG59XG5cbmZ1bmN0aW9uIGRldGVjdFJ1bnRpbWVUeXBlKGVudjogUnVudGltZVByb2JlRW52KTogQ29kZXhSdW50aW1lVHlwZSB7XG4gIGNvbnN0IHBsYXRmb3JtID0gZW52LnBsYXRmb3JtID8/IHByb2Nlc3MucGxhdGZvcm07XG4gIGNvbnN0IGV4aXN0cyA9IGVudi5leGlzdHNTeW5jID8/IGV4aXN0c1N5bmM7XG4gIGNvbnN0IHJlc291cmNlc1BhdGggPSBlbnYucmVzb3VyY2VzUGF0aCA/PyBudWxsO1xuICBpZiAocGxhdGZvcm0gPT09IFwiZGFyd2luXCIpIHtcbiAgICBjb25zdCBhcHBSb290ID0gaW5mZXJNYWNBcHBSb290KGVudi5leGVjUGF0aCA/PyBwcm9jZXNzLmV4ZWNQYXRoKTtcbiAgICBpZiAoYXBwUm9vdCAmJiBleGlzdHMoam9pbihhcHBSb290LCBcIkNvbnRlbnRzXCIsIFwiRnJhbWV3b3Jrc1wiLCBcIkNvZGV4IEZyYW1ld29yay5mcmFtZXdvcmtcIikpKSB7XG4gICAgICByZXR1cm4gXCJvd2xcIjtcbiAgICB9XG4gICAgaWYgKGFwcFJvb3QgJiYgZXhpc3RzKGpvaW4oYXBwUm9vdCwgXCJDb250ZW50c1wiLCBcIkZyYW1ld29ya3NcIiwgXCJFbGVjdHJvbiBGcmFtZXdvcmsuZnJhbWV3b3JrXCIpKSkge1xuICAgICAgcmV0dXJuIFwiZWxlY3Ryb25cIjtcbiAgICB9XG4gICAgaWYgKHJlc291cmNlc1BhdGggJiYgZXhpc3RzKGpvaW4ocmVzb3VyY2VzUGF0aCwgXCJhcHAuYXNhclwiKSkpIHtcbiAgICAgIHJldHVybiBcImVsZWN0cm9uXCI7XG4gICAgfVxuICAgIHJldHVybiBcInVua25vd25cIjtcbiAgfVxuICByZXR1cm4gcmVzb3VyY2VzUGF0aCAmJiBleGlzdHMoam9pbihyZXNvdXJjZXNQYXRoLCBcImFwcC5hc2FyXCIpKSA/IFwiZWxlY3Ryb25cIiA6IFwidW5rbm93blwiO1xufVxuXG5mdW5jdGlvbiBpbmZlck1hY0FwcFJvb3QoZXhlY1BhdGg6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBtYXJrZXIgPSBcIi5hcHAvQ29udGVudHMvTWFjT1MvXCI7XG4gIGNvbnN0IGlkeCA9IGV4ZWNQYXRoLmluZGV4T2YobWFya2VyKTtcbiAgcmV0dXJuIGlkeCA+PSAwID8gZXhlY1BhdGguc2xpY2UoMCwgaWR4ICsgXCIuYXBwXCIubGVuZ3RoKSA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHNhZmVBcHBQYXRoKGVudjogUnVudGltZVByb2JlRW52KTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IGZyb21BcHAgPSBzYWZlQ2FsbCgoKSA9PiBlbnYuYXBwPy5nZXRBcHBQYXRoPy4oKSk7XG4gIGlmIChmcm9tQXBwKSByZXR1cm4gZnJvbUFwcDtcbiAgcmV0dXJuIGVudi5yZXNvdXJjZXNQYXRoID8gam9pbihlbnYucmVzb3VyY2VzUGF0aCwgXCJhcHAuYXNhclwiKSA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHNhZmVCdWlsZEZsYXZvcihlbnY6IFJ1bnRpbWVQcm9iZUVudiwgYXBwUGF0aDogc3RyaW5nIHwgbnVsbCk6IHN0cmluZyB8IG51bGwge1xuICBpZiAoIWFwcFBhdGgpIHJldHVybiBudWxsO1xuICBjb25zdCBwYXJlbnQgPSBkaXJuYW1lKGFwcFBhdGgpO1xuICBpZiAocGFyZW50LmluY2x1ZGVzKFwiTmlnaHRseVwiKSkgcmV0dXJuIFwibmlnaHRseVwiO1xuICBpZiAodHlwZW9mIGVudi5hcHA/LmlzUGFja2FnZWQgPT09IFwiYm9vbGVhblwiKSByZXR1cm4gZW52LmFwcC5pc1BhY2thZ2VkID8gXCJwcm9kXCIgOiBcImRldlwiO1xuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdFNlc3Npb25Gcm9tKGVudjogUnVudGltZVByb2JlRW52KTogUHJvYmVTZXNzaW9uQWRhcHRlciB8IG51bGwge1xuICBjb25zdCBzZXNzaW9uID0gZW52LnNlc3Npb24gYXMgeyBkZWZhdWx0U2Vzc2lvbj86IFByb2JlU2Vzc2lvbkFkYXB0ZXIgfSB8IFByb2JlU2Vzc2lvbkFkYXB0ZXIgfCBudWxsIHwgdW5kZWZpbmVkO1xuICBpZiAoIXNlc3Npb24pIHJldHVybiBudWxsO1xuICBpZiAoXCJkZWZhdWx0U2Vzc2lvblwiIGluIHNlc3Npb24pIHJldHVybiBhc1JlY29yZChzZXNzaW9uLmRlZmF1bHRTZXNzaW9uKSBhcyBQcm9iZVNlc3Npb25BZGFwdGVyIHwgbnVsbDtcbiAgcmV0dXJuIGFzUmVjb3JkKHNlc3Npb24pIGFzIFByb2JlU2Vzc2lvbkFkYXB0ZXIgfCBudWxsO1xufVxuXG5mdW5jdGlvbiB3aW5kb3dTYW1wbGVUb1BhcmVudChzYW1wbGU6IFByb2JlV2luZG93U2FtcGxlIHwgbnVsbCk6IHVua25vd24ge1xuICBpZiAoIXNhbXBsZSkgcmV0dXJuIG51bGw7XG4gIHJldHVybiB7XG4gICAgYWRkQnJvd3NlclZpZXc6IHNhbXBsZS5hZGRCcm93c2VyVmlldyxcbiAgICBjb250ZW50Vmlldzogc2FtcGxlLmNvbnRlbnRWaWV3ID8/IChcbiAgICAgIHNhbXBsZS5hZGRDaGlsZFZpZXcgfHwgc2FtcGxlLnJlbW92ZUNoaWxkVmlld1xuICAgICAgICA/IHsgYWRkQ2hpbGRWaWV3OiBzYW1wbGUuYWRkQ2hpbGRWaWV3LCByZW1vdmVDaGlsZFZpZXc6IHNhbXBsZS5yZW1vdmVDaGlsZFZpZXcgfVxuICAgICAgICA6IHVuZGVmaW5lZFxuICAgICksXG4gIH07XG59XG5cbmZ1bmN0aW9uIHZpZXdTYW1wbGVUb1ZpZXcoc2FtcGxlOiBQcm9iZVZpZXdTYW1wbGUgfCBudWxsKTogdW5rbm93biB7XG4gIGlmICghc2FtcGxlKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHtcbiAgICB3ZWJDb250ZW50c1ZpZXc6IHNhbXBsZS53ZWJDb250ZW50c1ZpZXcgPz8gKHNhbXBsZS5zZXRCb3VuZHMgPyB7IHNldEJvdW5kczogc2FtcGxlLnNldEJvdW5kcyB9IDogdW5kZWZpbmVkKSxcbiAgICBzZXRCb3VuZHM6IHNhbXBsZS5zZXRCb3VuZHMsXG4gIH07XG59XG5cbmZ1bmN0aW9uIHZpZXdTYW1wbGVGcm9tSW5zdGFuY2UodmlldzogdW5rbm93bik6IFByb2JlVmlld1NhbXBsZSB8IG51bGwge1xuICBjb25zdCByZWMgPSBhc1JlY29yZCh2aWV3KTtcbiAgaWYgKCFyZWMpIHJldHVybiBudWxsO1xuICByZXR1cm4ge1xuICAgIHByZXNlbnQ6IHRydWUsXG4gICAgd2ViQ29udGVudHNWaWV3OiByZWMud2ViQ29udGVudHNWaWV3LFxuICAgIHNldEJvdW5kczogYXNSZWNvcmQocmVjLndlYkNvbnRlbnRzVmlldyk/LnNldEJvdW5kcyA/PyByZWMuc2V0Qm91bmRzLFxuICB9O1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0TmF0aXZlQ2FwYWJpbGl0aWVzKHBsYXRmb3JtOiBOb2RlSlMuUGxhdGZvcm0pOiBDb2RleFJ1bnRpbWVDYXBhYmlsaXRpZXNbXCJuYXRpdmVcIl0ge1xuICByZXR1cm4ge1xuICAgIGluUHJvY2Vzc01vZHVsZXM6IHRydWUsXG4gICAgc3dpZnRNb2R1bGVzOiBwbGF0Zm9ybSA9PT0gXCJkYXJ3aW5cIixcbiAgICBhcHBLaXRFbWJlZGRpbmc6IGZhbHNlLFxuICAgIGNoaWxkV2luZG93T3ZlcmxheTogZmFsc2UsXG4gICAgZGlyZWN0Vmlld0F0dGFjaDogZmFsc2UsXG4gICAgbWV0YWxWaWV3czogZmFsc2UsXG4gICAgbmF0aXZlSG9zdDogZmFsc2UsXG4gICAgaGVscGVyczogdHJ1ZSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gcGFyc2VDZHBQb3J0KHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQpOiBudW1iZXIge1xuICBjb25zdCBwYXJzZWQgPSBOdW1iZXIodmFsdWUgPz8gXCI5MjIyXCIpO1xuICByZXR1cm4gTnVtYmVyLmlzSW50ZWdlcihwYXJzZWQpICYmIHBhcnNlZCA+IDAgJiYgcGFyc2VkIDwgNjU1MzYgPyBwYXJzZWQgOiA5MjIyO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVDZHBUYXJnZXQocm93OiB1bmtub3duKTogQ29kZXhDZHBUYXJnZXQgfCBudWxsIHtcbiAgY29uc3QgdmFsdWUgPSBhc1JlY29yZChyb3cpO1xuICBpZiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZS5pZCAhPT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YgdmFsdWUudHlwZSAhPT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YgdmFsdWUudXJsICE9PSBcInN0cmluZ1wiKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBpZDogdmFsdWUuaWQsXG4gICAgdHlwZTogdmFsdWUudHlwZSxcbiAgICB1cmw6IHZhbHVlLnVybCxcbiAgICAuLi4odHlwZW9mIHZhbHVlLnRpdGxlID09PSBcInN0cmluZ1wiID8geyB0aXRsZTogdmFsdWUudGl0bGUgfSA6IHt9KSxcbiAgICAuLi4odHlwZW9mIHZhbHVlLndlYlNvY2tldERlYnVnZ2VyVXJsID09PSBcInN0cmluZ1wiXG4gICAgICA/IHsgd2ViU29ja2V0RGVidWdnZXJVcmw6IHZhbHVlLndlYlNvY2tldERlYnVnZ2VyVXJsIH1cbiAgICAgIDoge30pLFxuICB9O1xufVxuXG5mdW5jdGlvbiB0cnlSZXF1aXJlRWxlY3Ryb24oKToge1xuICBhcHA/OiBQcm9iZUFwcEFkYXB0ZXI7XG4gIHNlc3Npb24/OiB7IGRlZmF1bHRTZXNzaW9uPzogUHJvYmVTZXNzaW9uQWRhcHRlciB9O1xuICBCcm93c2VyV2luZG93PzogUnVudGltZVByb2JlRW52W1wiYnJvd3NlcldpbmRvd1wiXTtcbiAgQnJvd3NlclZpZXc/OiB1bmtub3duO1xufSB8IG51bGwge1xuICB0cnkge1xuICAgIHJldHVybiByZXF1aXJlKFwiZWxlY3Ryb25cIikgYXMge1xuICAgICAgYXBwPzogUHJvYmVBcHBBZGFwdGVyO1xuICAgICAgc2Vzc2lvbj86IHsgZGVmYXVsdFNlc3Npb24/OiBQcm9iZVNlc3Npb25BZGFwdGVyIH07XG4gICAgICBCcm93c2VyV2luZG93PzogUnVudGltZVByb2JlRW52W1wiYnJvd3NlcldpbmRvd1wiXTtcbiAgICAgIEJyb3dzZXJWaWV3PzogdW5rbm93bjtcbiAgICB9O1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBzYWZlQ2FsbDxUPihmbjogKCkgPT4gVCk6IFQgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB2YWx1ZSA9IGZuKCk7XG4gICAgcmV0dXJuIHZhbHVlID09PSB1bmRlZmluZWQgPyBudWxsIDogdmFsdWU7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzRm4odmFsdWU6IHVua25vd24pOiBib29sZWFuIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXNSZWNvcmQodmFsdWU6IHVua25vd24pOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IG51bGwge1xuICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiID8gdmFsdWUgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gOiBudWxsO1xufVxuIiwgImltcG9ydCB7IGV4ZWNGaWxlU3luYyB9IGZyb20gXCJub2RlOmNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCB7IGV4aXN0c1N5bmMsIHJlYWRGaWxlU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBob21lZGlyLCBwbGF0Zm9ybSB9IGZyb20gXCJub2RlOm9zXCI7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuaW1wb3J0IHsgaXNMYXllckF1dG9VcGRhdGVFbmFibGVkIH0gZnJvbSBcIi4vaXBjLWd1YXJkXCI7XG5cbnR5cGUgQ2hlY2tTdGF0dXMgPSBcIm9rXCIgfCBcIndhcm5cIiB8IFwiZXJyb3JcIjtcblxuZXhwb3J0IGludGVyZmFjZSBXYXRjaGVySGVhbHRoQ2hlY2sge1xuICBuYW1lOiBzdHJpbmc7XG4gIHN0YXR1czogQ2hlY2tTdGF0dXM7XG4gIGRldGFpbDogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdhdGNoZXJIZWFsdGgge1xuICBjaGVja2VkQXQ6IHN0cmluZztcbiAgc3RhdHVzOiBDaGVja1N0YXR1cztcbiAgdGl0bGU6IHN0cmluZztcbiAgc3VtbWFyeTogc3RyaW5nO1xuICB3YXRjaGVyOiBzdHJpbmc7XG4gIGNoZWNrczogV2F0Y2hlckhlYWx0aENoZWNrW107XG59XG5cbmludGVyZmFjZSBJbnN0YWxsZXJTdGF0ZSB7XG4gIGFwcFJvb3Q/OiBzdHJpbmc7XG4gIHZlcnNpb24/OiBzdHJpbmc7XG4gIHdhdGNoZXI/OiBcImxhdW5jaGRcIiB8IFwibG9naW4taXRlbVwiIHwgXCJzY2hlZHVsZWQtdGFza1wiIHwgXCJzeXN0ZW1kXCIgfCBcIm5vbmVcIjtcbn1cblxuaW50ZXJmYWNlIFJ1bnRpbWVDb25maWcge1xuICBjb2RleFBsdXNQbHVzPzoge1xuICAgIGF1dG9VcGRhdGU/OiBib29sZWFuO1xuICB9O1xufVxuXG5pbnRlcmZhY2UgU2VsZlVwZGF0ZVN0YXRlIHtcbiAgc3RhdHVzPzogXCJjaGVja2luZ1wiIHwgXCJ1cC10by1kYXRlXCIgfCBcInVwZGF0ZWRcIiB8IFwiZmFpbGVkXCIgfCBcImRpc2FibGVkXCI7XG4gIGNvbXBsZXRlZEF0Pzogc3RyaW5nO1xuICBjaGVja2VkQXQ/OiBzdHJpbmc7XG4gIGxhdGVzdFZlcnNpb24/OiBzdHJpbmcgfCBudWxsO1xuICBlcnJvcj86IHN0cmluZztcbn1cblxuY29uc3QgTEFVTkNIRF9MQUJFTCA9IFwiY29tLmNvZGV4cGx1c3BsdXMud2F0Y2hlclwiO1xuY29uc3QgV0FUQ0hFUl9MT0cgPSBqb2luKGhvbWVkaXIoKSwgXCJMaWJyYXJ5XCIsIFwiTG9nc1wiLCBcImNvZGV4LXBsdXNwbHVzLXdhdGNoZXIubG9nXCIpO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0V2F0Y2hlckhlYWx0aCh1c2VyUm9vdDogc3RyaW5nKTogV2F0Y2hlckhlYWx0aCB7XG4gIGNvbnN0IGNoZWNrczogV2F0Y2hlckhlYWx0aENoZWNrW10gPSBbXTtcbiAgY29uc3Qgc3RhdGUgPSByZWFkSnNvbjxJbnN0YWxsZXJTdGF0ZT4oam9pbih1c2VyUm9vdCwgXCJzdGF0ZS5qc29uXCIpKTtcbiAgY29uc3QgY29uZmlnID0gcmVhZEpzb248UnVudGltZUNvbmZpZz4oam9pbih1c2VyUm9vdCwgXCJjb25maWcuanNvblwiKSkgPz8ge307XG4gIGNvbnN0IHNlbGZVcGRhdGUgPSByZWFkSnNvbjxTZWxmVXBkYXRlU3RhdGU+KGpvaW4odXNlclJvb3QsIFwic2VsZi11cGRhdGUtc3RhdGUuanNvblwiKSk7XG5cbiAgY2hlY2tzLnB1c2goe1xuICAgIG5hbWU6IFwiSW5zdGFsbCBzdGF0ZVwiLFxuICAgIHN0YXR1czogc3RhdGUgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgZGV0YWlsOiBzdGF0ZSA/IGBDb2RleCsrICR7c3RhdGUudmVyc2lvbiA/PyBcIih1bmtub3duIHZlcnNpb24pXCJ9YCA6IFwic3RhdGUuanNvbiBpcyBtaXNzaW5nXCIsXG4gIH0pO1xuXG4gIGlmICghc3RhdGUpIHJldHVybiBzdW1tYXJpemUoXCJub25lXCIsIGNoZWNrcyk7XG5cbiAgY29uc3QgYXV0b1VwZGF0ZSA9IGlzTGF5ZXJBdXRvVXBkYXRlRW5hYmxlZChjb25maWcuY29kZXhQbHVzUGx1cz8uYXV0b1VwZGF0ZSk7XG4gIGNoZWNrcy5wdXNoKHtcbiAgICBuYW1lOiBcIkxheWVyIHNlbGYtdXBkYXRlXCIsXG4gICAgc3RhdHVzOiBhdXRvVXBkYXRlID8gXCJva1wiIDogXCJ3YXJuXCIsXG4gICAgZGV0YWlsOiBhdXRvVXBkYXRlID8gXCJlbmFibGVkXCIgOiBcImRpc2FibGVkIChvcHQtaW47IGRlZmF1bHQgb2ZmKVwiLFxuICB9KTtcblxuICBjaGVja3MucHVzaCh7XG4gICAgbmFtZTogXCJXYXRjaGVyIGtpbmRcIixcbiAgICBzdGF0dXM6IHN0YXRlLndhdGNoZXIgJiYgc3RhdGUud2F0Y2hlciAhPT0gXCJub25lXCIgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgZGV0YWlsOiBzdGF0ZS53YXRjaGVyID8/IFwibm9uZVwiLFxuICB9KTtcblxuICBpZiAoc2VsZlVwZGF0ZSkge1xuICAgIGNoZWNrcy5wdXNoKHNlbGZVcGRhdGVDaGVjayhzZWxmVXBkYXRlKSk7XG4gIH1cblxuICBjb25zdCBhcHBSb290ID0gc3RhdGUuYXBwUm9vdCA/PyBcIlwiO1xuICBjaGVja3MucHVzaCh7XG4gICAgbmFtZTogXCJDb2RleCBhcHBcIixcbiAgICBzdGF0dXM6IGFwcFJvb3QgJiYgZXhpc3RzU3luYyhhcHBSb290KSA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICBkZXRhaWw6IGFwcFJvb3QgfHwgXCJtaXNzaW5nIGFwcFJvb3QgaW4gc3RhdGVcIixcbiAgfSk7XG5cbiAgc3dpdGNoIChwbGF0Zm9ybSgpKSB7XG4gICAgY2FzZSBcImRhcndpblwiOlxuICAgICAgY2hlY2tzLnB1c2goLi4uY2hlY2tMYXVuY2hkV2F0Y2hlcihhcHBSb290KSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIFwibGludXhcIjpcbiAgICAgIGNoZWNrcy5wdXNoKC4uLmNoZWNrU3lzdGVtZFdhdGNoZXIoYXBwUm9vdCkpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBcIndpbjMyXCI6XG4gICAgICBjaGVja3MucHVzaCguLi5jaGVja1NjaGVkdWxlZFRhc2tXYXRjaGVyKCkpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGNoZWNrcy5wdXNoKHtcbiAgICAgICAgbmFtZTogXCJQbGF0Zm9ybSB3YXRjaGVyXCIsXG4gICAgICAgIHN0YXR1czogXCJ3YXJuXCIsXG4gICAgICAgIGRldGFpbDogYHVuc3VwcG9ydGVkIHBsYXRmb3JtOiAke3BsYXRmb3JtKCl9YCxcbiAgICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHN1bW1hcml6ZShzdGF0ZS53YXRjaGVyID8/IFwibm9uZVwiLCBjaGVja3MpO1xufVxuXG5mdW5jdGlvbiBzZWxmVXBkYXRlQ2hlY2soc3RhdGU6IFNlbGZVcGRhdGVTdGF0ZSk6IFdhdGNoZXJIZWFsdGhDaGVjayB7XG4gIGNvbnN0IGF0ID0gc3RhdGUuY29tcGxldGVkQXQgPz8gc3RhdGUuY2hlY2tlZEF0ID8/IFwidW5rbm93biB0aW1lXCI7XG4gIGlmIChzdGF0ZS5zdGF0dXMgPT09IFwiZmFpbGVkXCIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogXCJsYXN0IENvZGV4KysgdXBkYXRlXCIsXG4gICAgICBzdGF0dXM6IFwid2FyblwiLFxuICAgICAgZGV0YWlsOiBzdGF0ZS5lcnJvciA/IGBmYWlsZWQgJHthdH06ICR7c3RhdGUuZXJyb3J9YCA6IGBmYWlsZWQgJHthdH1gLFxuICAgIH07XG4gIH1cbiAgaWYgKHN0YXRlLnN0YXR1cyA9PT0gXCJkaXNhYmxlZFwiKSB7XG4gICAgcmV0dXJuIHsgbmFtZTogXCJsYXN0IENvZGV4KysgdXBkYXRlXCIsIHN0YXR1czogXCJ3YXJuXCIsIGRldGFpbDogYHNraXBwZWQgJHthdH06IExheWVyIHNlbGYtdXBkYXRlIGRpc2FibGVkYCB9O1xuICB9XG4gIGlmIChzdGF0ZS5zdGF0dXMgPT09IFwidXBkYXRlZFwiKSB7XG4gICAgcmV0dXJuIHsgbmFtZTogXCJsYXN0IENvZGV4KysgdXBkYXRlXCIsIHN0YXR1czogXCJva1wiLCBkZXRhaWw6IGB1cGRhdGVkICR7YXR9IHRvICR7c3RhdGUubGF0ZXN0VmVyc2lvbiA/PyBcIm5ldyByZWxlYXNlXCJ9YCB9O1xuICB9XG4gIGlmIChzdGF0ZS5zdGF0dXMgPT09IFwidXAtdG8tZGF0ZVwiKSB7XG4gICAgcmV0dXJuIHsgbmFtZTogXCJsYXN0IENvZGV4KysgdXBkYXRlXCIsIHN0YXR1czogXCJva1wiLCBkZXRhaWw6IGB1cCB0byBkYXRlICR7YXR9YCB9O1xuICB9XG4gIHJldHVybiB7IG5hbWU6IFwibGFzdCBDb2RleCsrIHVwZGF0ZVwiLCBzdGF0dXM6IFwid2FyblwiLCBkZXRhaWw6IGBjaGVja2luZyBzaW5jZSAke2F0fWAgfTtcbn1cblxuZnVuY3Rpb24gY2hlY2tMYXVuY2hkV2F0Y2hlcihhcHBSb290OiBzdHJpbmcpOiBXYXRjaGVySGVhbHRoQ2hlY2tbXSB7XG4gIGNvbnN0IGNoZWNrczogV2F0Y2hlckhlYWx0aENoZWNrW10gPSBbXTtcbiAgY29uc3QgcGxpc3RQYXRoID0gam9pbihob21lZGlyKCksIFwiTGlicmFyeVwiLCBcIkxhdW5jaEFnZW50c1wiLCBgJHtMQVVOQ0hEX0xBQkVMfS5wbGlzdGApO1xuICBjb25zdCBwbGlzdCA9IGV4aXN0c1N5bmMocGxpc3RQYXRoKSA/IHJlYWRGaWxlU2FmZShwbGlzdFBhdGgpIDogXCJcIjtcbiAgY29uc3QgYXNhclBhdGggPSBhcHBSb290ID8gam9pbihhcHBSb290LCBcIkNvbnRlbnRzXCIsIFwiUmVzb3VyY2VzXCIsIFwiYXBwLmFzYXJcIikgOiBcIlwiO1xuXG4gIGNoZWNrcy5wdXNoKHtcbiAgICBuYW1lOiBcImxhdW5jaGQgcGxpc3RcIixcbiAgICBzdGF0dXM6IHBsaXN0ID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgIGRldGFpbDogcGxpc3RQYXRoLFxuICB9KTtcblxuICBpZiAocGxpc3QpIHtcbiAgICBjaGVja3MucHVzaCh7XG4gICAgICBuYW1lOiBcImxhdW5jaGQgbGFiZWxcIixcbiAgICAgIHN0YXR1czogcGxpc3QuaW5jbHVkZXMoTEFVTkNIRF9MQUJFTCkgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgICBkZXRhaWw6IExBVU5DSERfTEFCRUwsXG4gICAgfSk7XG4gICAgY2hlY2tzLnB1c2goe1xuICAgICAgbmFtZTogXCJsYXVuY2hkIHRyaWdnZXJcIixcbiAgICAgIHN0YXR1czogYXNhclBhdGggJiYgcGxpc3QuaW5jbHVkZXMoYXNhclBhdGgpID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgICAgZGV0YWlsOiBhc2FyUGF0aCB8fCBcIm1pc3NpbmcgYXBwUm9vdFwiLFxuICAgIH0pO1xuICAgIGNoZWNrcy5wdXNoKHtcbiAgICAgIG5hbWU6IFwid2F0Y2hlciBjb21tYW5kXCIsXG4gICAgICBzdGF0dXM6IHBsaXN0LmluY2x1ZGVzKFwiQ09ERVhfUExVU1BMVVNfV0FUQ0hFUj0xXCIpICYmIHBsaXN0LmluY2x1ZGVzKFwiIHVwZGF0ZSAtLXdhdGNoZXIgLS1xdWlldFwiKVxuICAgICAgICA/IFwib2tcIlxuICAgICAgICA6IFwiZXJyb3JcIixcbiAgICAgIGRldGFpbDogY29tbWFuZFN1bW1hcnkocGxpc3QpLFxuICAgIH0pO1xuXG4gICAgY29uc3QgY2xpUGF0aCA9IGV4dHJhY3RGaXJzdChwbGlzdCwgLycoW14nXSpwYWNrYWdlc1xcL2luc3RhbGxlclxcL2Rpc3RcXC9jbGlcXC5qcyknLyk7XG4gICAgaWYgKGNsaVBhdGgpIHtcbiAgICAgIGNoZWNrcy5wdXNoKHtcbiAgICAgICAgbmFtZTogXCJyZXBhaXIgQ0xJXCIsXG4gICAgICAgIHN0YXR1czogZXhpc3RzU3luYyhjbGlQYXRoKSA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICAgICAgZGV0YWlsOiBjbGlQYXRoLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgbG9hZGVkID0gY29tbWFuZFN1Y2NlZWRzKFwibGF1bmNoY3RsXCIsIFtcImxpc3RcIiwgTEFVTkNIRF9MQUJFTF0pO1xuICBjaGVja3MucHVzaCh7XG4gICAgbmFtZTogXCJsYXVuY2hkIGxvYWRlZFwiLFxuICAgIHN0YXR1czogbG9hZGVkID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgIGRldGFpbDogbG9hZGVkID8gXCJzZXJ2aWNlIGlzIGxvYWRlZFwiIDogXCJsYXVuY2hjdGwgY2Fubm90IGZpbmQgdGhlIHdhdGNoZXJcIixcbiAgfSk7XG5cbiAgY2hlY2tzLnB1c2god2F0Y2hlckxvZ0NoZWNrKCkpO1xuICByZXR1cm4gY2hlY2tzO1xufVxuXG5mdW5jdGlvbiBjaGVja1N5c3RlbWRXYXRjaGVyKGFwcFJvb3Q6IHN0cmluZyk6IFdhdGNoZXJIZWFsdGhDaGVja1tdIHtcbiAgY29uc3QgZGlyID0gam9pbihob21lZGlyKCksIFwiLmNvbmZpZ1wiLCBcInN5c3RlbWRcIiwgXCJ1c2VyXCIpO1xuICBjb25zdCBzZXJ2aWNlID0gam9pbihkaXIsIFwiY29kZXgtcGx1c3BsdXMtd2F0Y2hlci5zZXJ2aWNlXCIpO1xuICBjb25zdCB0aW1lciA9IGpvaW4oZGlyLCBcImNvZGV4LXBsdXNwbHVzLXdhdGNoZXIudGltZXJcIik7XG4gIGNvbnN0IHBhdGhVbml0ID0gam9pbihkaXIsIFwiY29kZXgtcGx1c3BsdXMtd2F0Y2hlci5wYXRoXCIpO1xuICBjb25zdCBleHBlY3RlZFBhdGggPSBhcHBSb290ID8gam9pbihhcHBSb290LCBcInJlc291cmNlc1wiLCBcImFwcC5hc2FyXCIpIDogXCJcIjtcbiAgY29uc3QgcGF0aEJvZHkgPSBleGlzdHNTeW5jKHBhdGhVbml0KSA/IHJlYWRGaWxlU2FmZShwYXRoVW5pdCkgOiBcIlwiO1xuXG4gIHJldHVybiBbXG4gICAge1xuICAgICAgbmFtZTogXCJzeXN0ZW1kIHNlcnZpY2VcIixcbiAgICAgIHN0YXR1czogZXhpc3RzU3luYyhzZXJ2aWNlKSA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICAgIGRldGFpbDogc2VydmljZSxcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6IFwic3lzdGVtZCB0aW1lclwiLFxuICAgICAgc3RhdHVzOiBleGlzdHNTeW5jKHRpbWVyKSA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICAgIGRldGFpbDogdGltZXIsXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiBcInN5c3RlbWQgcGF0aFwiLFxuICAgICAgc3RhdHVzOiBwYXRoQm9keSAmJiBleHBlY3RlZFBhdGggJiYgcGF0aEJvZHkuaW5jbHVkZXMoZXhwZWN0ZWRQYXRoKSA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICAgIGRldGFpbDogZXhwZWN0ZWRQYXRoIHx8IHBhdGhVbml0LFxuICAgIH0sXG4gICAge1xuICAgICAgbmFtZTogXCJwYXRoIHVuaXQgYWN0aXZlXCIsXG4gICAgICBzdGF0dXM6IGNvbW1hbmRTdWNjZWVkcyhcInN5c3RlbWN0bFwiLCBbXCItLXVzZXJcIiwgXCJpcy1hY3RpdmVcIiwgXCItLXF1aWV0XCIsIFwiY29kZXgtcGx1c3BsdXMtd2F0Y2hlci5wYXRoXCJdKSA/IFwib2tcIiA6IFwid2FyblwiLFxuICAgICAgZGV0YWlsOiBcInN5c3RlbWN0bCAtLXVzZXIgaXMtYWN0aXZlIGNvZGV4LXBsdXNwbHVzLXdhdGNoZXIucGF0aFwiLFxuICAgIH0sXG4gICAge1xuICAgICAgbmFtZTogXCJ0aW1lciBhY3RpdmVcIixcbiAgICAgIHN0YXR1czogY29tbWFuZFN1Y2NlZWRzKFwic3lzdGVtY3RsXCIsIFtcIi0tdXNlclwiLCBcImlzLWFjdGl2ZVwiLCBcIi0tcXVpZXRcIiwgXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyLnRpbWVyXCJdKSA/IFwib2tcIiA6IFwid2FyblwiLFxuICAgICAgZGV0YWlsOiBcInN5c3RlbWN0bCAtLXVzZXIgaXMtYWN0aXZlIGNvZGV4LXBsdXNwbHVzLXdhdGNoZXIudGltZXJcIixcbiAgICB9LFxuICBdO1xufVxuXG5mdW5jdGlvbiBjaGVja1NjaGVkdWxlZFRhc2tXYXRjaGVyKCk6IFdhdGNoZXJIZWFsdGhDaGVja1tdIHtcbiAgcmV0dXJuIFtcbiAgICB7XG4gICAgICBuYW1lOiBcImxvZ29uIHRhc2tcIixcbiAgICAgIHN0YXR1czogY29tbWFuZFN1Y2NlZWRzKFwic2NodGFza3MuZXhlXCIsIFtcIi9RdWVyeVwiLCBcIi9UTlwiLCBcImNvZGV4LXBsdXNwbHVzLXdhdGNoZXJcIl0pID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgICAgZGV0YWlsOiBcImNvZGV4LXBsdXNwbHVzLXdhdGNoZXJcIixcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6IFwiaG91cmx5IHRhc2tcIixcbiAgICAgIHN0YXR1czogY29tbWFuZFN1Y2NlZWRzKFwic2NodGFza3MuZXhlXCIsIFtcIi9RdWVyeVwiLCBcIi9UTlwiLCBcImNvZGV4LXBsdXNwbHVzLXdhdGNoZXItaG91cmx5XCJdKSA/IFwib2tcIiA6IFwid2FyblwiLFxuICAgICAgZGV0YWlsOiBcImNvZGV4LXBsdXNwbHVzLXdhdGNoZXItaG91cmx5XCIsXG4gICAgfSxcbiAgXTtcbn1cblxuZnVuY3Rpb24gd2F0Y2hlckxvZ0NoZWNrKCk6IFdhdGNoZXJIZWFsdGhDaGVjayB7XG4gIGlmICghZXhpc3RzU3luYyhXQVRDSEVSX0xPRykpIHtcbiAgICByZXR1cm4geyBuYW1lOiBcIndhdGNoZXIgbG9nXCIsIHN0YXR1czogXCJ3YXJuXCIsIGRldGFpbDogXCJubyB3YXRjaGVyIGxvZyB5ZXRcIiB9O1xuICB9XG4gIGNvbnN0IHRhaWwgPSByZWFkRmlsZVNhZmUoV0FUQ0hFUl9MT0cpLnNwbGl0KC9cXHI/XFxuLykuc2xpY2UoLTQwKS5qb2luKFwiXFxuXCIpO1xuICByZXR1cm4gYW5hbHl6ZVdhdGNoZXJMb2dUYWlsKHRhaWwpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZVdhdGNoZXJMb2dUYWlsKHRhaWw6IHN0cmluZyk6IFdhdGNoZXJIZWFsdGhDaGVjayB7XG4gIGNvbnN0IGhhc0Vycm9yID0gL1x1MjcxNyBjb2RleC1wbHVzcGx1cyBmYWlsZWR8Y29kZXgtcGx1c3BsdXMgZmFpbGVkfGVycm9yfGZhaWxlZC9pLnRlc3QodGFpbCk7XG4gIGNvbnN0IG5lZWRzTWFudWFsUmVwYWlyID1cbiAgICBoYXNFcnJvciAmJlxuICAgIC9DYW5ub3Qgd3JpdGUgdG8gLipDb2RleC4qXFwuYXBwfEFwcCBNYW5hZ2VtZW50fGZpbGUgb3duZXJzaGlwfHN1ZG8gY29kZXhwbHVzcGx1cyAoPzppbnN0YWxsfHJlcGFpcil8RUFDQ0VTfEVQRVJNL2kudGVzdCh0YWlsKTtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBcIndhdGNoZXIgbG9nXCIsXG4gICAgc3RhdHVzOiBoYXNFcnJvciA/IFwid2FyblwiIDogXCJva1wiLFxuICAgIGRldGFpbDogaGFzRXJyb3JcbiAgICAgID8gbmVlZHNNYW51YWxSZXBhaXJcbiAgICAgICAgPyBcImF1dG8tcmVwYWlyIG5lZWRzIGFwcCBwZXJtaXNzaW9uczsgcnVuIGBjb2RleHBsdXNwbHVzIHJlcGFpcmAgZnJvbSBUZXJtaW5hbFwiXG4gICAgICAgIDogXCJyZWNlbnQgd2F0Y2hlciBsb2cgY29udGFpbnMgYW4gZXJyb3JcIlxuICAgICAgOiBXQVRDSEVSX0xPRyxcbiAgfTtcbn1cblxuZnVuY3Rpb24gc3VtbWFyaXplKHdhdGNoZXI6IHN0cmluZywgY2hlY2tzOiBXYXRjaGVySGVhbHRoQ2hlY2tbXSk6IFdhdGNoZXJIZWFsdGgge1xuICBjb25zdCBoYXNFcnJvciA9IGNoZWNrcy5zb21lKChjKSA9PiBjLnN0YXR1cyA9PT0gXCJlcnJvclwiKTtcbiAgY29uc3QgaGFzV2FybiA9IGNoZWNrcy5zb21lKChjKSA9PiBjLnN0YXR1cyA9PT0gXCJ3YXJuXCIpO1xuICBjb25zdCBzdGF0dXM6IENoZWNrU3RhdHVzID0gaGFzRXJyb3IgPyBcImVycm9yXCIgOiBoYXNXYXJuID8gXCJ3YXJuXCIgOiBcIm9rXCI7XG4gIGNvbnN0IGZhaWxlZCA9IGNoZWNrcy5maWx0ZXIoKGMpID0+IGMuc3RhdHVzID09PSBcImVycm9yXCIpLmxlbmd0aDtcbiAgY29uc3Qgd2FybmVkID0gY2hlY2tzLmZpbHRlcigoYykgPT4gYy5zdGF0dXMgPT09IFwid2FyblwiKS5sZW5ndGg7XG4gIGNvbnN0IHRpdGxlID1cbiAgICBzdGF0dXMgPT09IFwib2tcIlxuICAgICAgPyBcIkF1dG8tcmVwYWlyIHdhdGNoZXIgaXMgcmVhZHlcIlxuICAgICAgOiBzdGF0dXMgPT09IFwid2FyblwiXG4gICAgICAgID8gXCJBdXRvLXJlcGFpciB3YXRjaGVyIG5lZWRzIHJldmlld1wiXG4gICAgICAgIDogXCJBdXRvLXJlcGFpciB3YXRjaGVyIGlzIG5vdCByZWFkeVwiO1xuICBjb25zdCBzdW1tYXJ5ID1cbiAgICBzdGF0dXMgPT09IFwib2tcIlxuICAgICAgPyBcIkNvZGV4Kysgc2hvdWxkIGF1dG9tYXRpY2FsbHkgcmVwYWlyIGl0c2VsZiBhZnRlciBDb2RleCB1cGRhdGVzLlwiXG4gICAgICA6IGAke2ZhaWxlZH0gZmFpbGluZyBjaGVjayhzKSwgJHt3YXJuZWR9IHdhcm5pbmcocykuYDtcblxuICByZXR1cm4ge1xuICAgIGNoZWNrZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIHN0YXR1cyxcbiAgICB0aXRsZSxcbiAgICBzdW1tYXJ5LFxuICAgIHdhdGNoZXIsXG4gICAgY2hlY2tzLFxuICB9O1xufVxuXG5mdW5jdGlvbiBjb21tYW5kU3VjY2VlZHMoY29tbWFuZDogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXSk6IGJvb2xlYW4ge1xuICB0cnkge1xuICAgIGV4ZWNGaWxlU3luYyhjb21tYW5kLCBhcmdzLCB7IHN0ZGlvOiBcImlnbm9yZVwiLCB0aW1lb3V0OiA1XzAwMCB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNvbW1hbmRTdW1tYXJ5KHBsaXN0OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBjb21tYW5kID0gZXh0cmFjdEZpcnN0KHBsaXN0LCAvPHN0cmluZz4oW148XSooPzp1cGRhdGUgLS13YXRjaGVyIC0tcXVpZXR8cmVwYWlyIC0tcXVpZXQpW148XSopPFxcL3N0cmluZz4vKTtcbiAgcmV0dXJuIGNvbW1hbmQgPyB1bmVzY2FwZVhtbChjb21tYW5kKS5yZXBsYWNlKC9cXHMrL2csIFwiIFwiKS50cmltKCkgOiBcIndhdGNoZXIgY29tbWFuZCBub3QgZm91bmRcIjtcbn1cblxuZnVuY3Rpb24gZXh0cmFjdEZpcnN0KHNvdXJjZTogc3RyaW5nLCBwYXR0ZXJuOiBSZWdFeHApOiBzdHJpbmcgfCBudWxsIHtcbiAgcmV0dXJuIHNvdXJjZS5tYXRjaChwYXR0ZXJuKT8uWzFdID8/IG51bGw7XG59XG5cbmZ1bmN0aW9uIHJlYWRKc29uPFQ+KHBhdGg6IHN0cmluZyk6IFQgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMocGF0aCwgXCJ1dGY4XCIpKSBhcyBUO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiByZWFkRmlsZVNhZmUocGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gcmVhZEZpbGVTeW5jKHBhdGgsIFwidXRmOFwiKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIFwiXCI7XG4gIH1cbn1cblxuZnVuY3Rpb24gdW5lc2NhcGVYbWwodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB2YWx1ZVxuICAgIC5yZXBsYWNlKC8mcXVvdDsvZywgXCJcXFwiXCIpXG4gICAgLnJlcGxhY2UoLyZhcG9zOy9nLCBcIidcIilcbiAgICAucmVwbGFjZSgvJmx0Oy9nLCBcIjxcIilcbiAgICAucmVwbGFjZSgvJmd0Oy9nLCBcIj5cIilcbiAgICAucmVwbGFjZSgvJmFtcDsvZywgXCImXCIpO1xufVxuIiwgIi8qKlxuICogUHJpdmlsZWdlZCBJUEMgYWxsb3dsaXN0aW5nLiBHdWVzdCBCcm93c2VyVmlld3MsIHdlYnZpZXdzLCBhbmQgb3RoZXJcbiAqIHVudHJ1c3RlZCBmcmFtZXMgbXVzdCBub3QgaW52b2tlIGluc3RhbGwvc2VsZi11cGRhdGUvbmF0aXZlL2ZzL2NsaXBib2FyZFxuICogaGFuZGxlcnMgZXZlbiBpZiBhIHNlc3Npb24tbGV2ZWwgcHJlbG9hZCBsZWFrZWQgaW50byB0aGVtLlxuICovXG5cbmV4cG9ydCBjb25zdCBQUklWSUxFR0VEX0lQQ19DSEFOTkVMUyA9IFtcbiAgXCJjb2RleHBwOmluc3RhbGwtc3RvcmUtdHdlYWtcIixcbiAgXCJjb2RleHBwOmluc3RhbGwtZ2l0aHViLXR3ZWFrXCIsXG4gIFwiY29kZXhwcDpwcmVwYXJlLXR3ZWFrLXN0b3JlLXN1Ym1pc3Npb25cIixcbiAgXCJjb2RleHBwOnJ1bi1jb2RleHBwLXVwZGF0ZVwiLFxuICBcImNvZGV4cHA6c2V0LWF1dG8tdXBkYXRlXCIsXG4gIFwiY29kZXhwcDpzZXQtdXBkYXRlLWNvbmZpZ1wiLFxuICBcImNvZGV4cHA6bmF0aXZlLWxvYWQtbW9kdWxlXCIsXG4gIFwiY29kZXhwcDpuYXRpdmUtbW9kdWxlLXJlcXVlc3RcIixcbiAgXCJjb2RleHBwOm5hdGl2ZS1tb2R1bGUtZGlzcG9zZVwiLFxuICBcImNvZGV4cHA6bmF0aXZlLWNyZWF0ZS1wYW5lbFwiLFxuICBcImNvZGV4cHA6bmF0aXZlLWF0dGFjaC12aWV3XCIsXG4gIFwiY29kZXhwcDpuYXRpdmUtaW5zdGFuY2UtY2FsbFwiLFxuICBcImNvZGV4cHA6bmF0aXZlLWxhdW5jaC1oZWxwZXJcIixcbiAgXCJjb2RleHBwOm5hdGl2ZS1oZWxwZXItY2FsbFwiLFxuICBcImNvZGV4cHA6Y29kZXgtd2luZG93LWNyZWF0ZVwiLFxuICBcImNvZGV4cHA6Y29kZXgtdmlldy1jcmVhdGVcIixcbiAgXCJjb2RleHBwOmNvZGV4LXZpZXctY2FsbFwiLFxuICBcImNvZGV4cHA6dHdlYWstZnNcIixcbiAgXCJjb2RleHBwOmNvcHktdGV4dFwiLFxuICBcImNvZGV4cHA6cmV2ZWFsXCIsXG5dIGFzIGNvbnN0O1xuXG5leHBvcnQgdHlwZSBQcml2aWxlZ2VkSXBjQ2hhbm5lbCA9ICh0eXBlb2YgUFJJVklMRUdFRF9JUENfQ0hBTk5FTFMpW251bWJlcl07XG5leHBvcnQgdHlwZSBXZWJDb250ZW50c1RydXN0ID0gXCJwcml2aWxlZ2VkXCIgfCBcImd1ZXN0XCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSXBjU2VuZGVyTGlrZSB7XG4gIGlkOiBudW1iZXI7XG4gIGlzRGVzdHJveWVkPzogKCkgPT4gYm9vbGVhbjtcbiAgZ2V0VHlwZT86ICgpID0+IHN0cmluZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzUHJpdmlsZWdlZElwY0NoYW5uZWwoY2hhbm5lbDogc3RyaW5nKTogY2hhbm5lbCBpcyBQcml2aWxlZ2VkSXBjQ2hhbm5lbCB7XG4gIHJldHVybiAoUFJJVklMRUdFRF9JUENfQ0hBTk5FTFMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKGNoYW5uZWwpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xhc3NpZnlJcGNTZW5kZXIoXG4gIHNlbmRlcjogSXBjU2VuZGVyTGlrZSxcbiAgdW50cnVzdGVkSWRzOiBSZWFkb25seVNldDxudW1iZXI+ID0gbmV3IFNldCgpLFxuKTogV2ViQ29udGVudHNUcnVzdCB7XG4gIGlmIChzZW5kZXIuaXNEZXN0cm95ZWQ/LigpKSByZXR1cm4gXCJndWVzdFwiO1xuICBpZiAodW50cnVzdGVkSWRzLmhhcyhzZW5kZXIuaWQpKSByZXR1cm4gXCJndWVzdFwiO1xuICBjb25zdCB0eXBlID0gc2VuZGVyLmdldFR5cGU/LigpID8/IFwid2luZG93XCI7XG4gIGlmICh0eXBlID09PSBcIndlYnZpZXdcIiB8fCB0eXBlID09PSBcIm9mZnNjcmVlblwiKSByZXR1cm4gXCJndWVzdFwiO1xuICBpZiAodHlwZSA9PT0gXCJ3aW5kb3dcIiB8fCB0eXBlID09PSBcImJyb3dzZXJWaWV3XCIpIHJldHVybiBcInByaXZpbGVnZWRcIjtcbiAgcmV0dXJuIFwiZ3Vlc3RcIjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzUHJpdmlsZWdlZElwY1NlbmRlcihcbiAgc2VuZGVyOiBJcGNTZW5kZXJMaWtlLFxuICB1bnRydXN0ZWRJZHM6IFJlYWRvbmx5U2V0PG51bWJlcj4gPSBuZXcgU2V0KCksXG4pOiBib29sZWFuIHtcbiAgcmV0dXJuIGNsYXNzaWZ5SXBjU2VuZGVyKHNlbmRlciwgdW50cnVzdGVkSWRzKSA9PT0gXCJwcml2aWxlZ2VkXCI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRQcml2aWxlZ2VkSXBjU2VuZGVyKFxuICBjaGFubmVsOiBzdHJpbmcsXG4gIHNlbmRlcjogSXBjU2VuZGVyTGlrZSxcbiAgdW50cnVzdGVkSWRzOiBSZWFkb25seVNldDxudW1iZXI+ID0gbmV3IFNldCgpLFxuKTogdm9pZCB7XG4gIGlmICghaXNQcml2aWxlZ2VkSXBjU2VuZGVyKHNlbmRlciwgdW50cnVzdGVkSWRzKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgYmxvY2tlZCAke2NoYW5uZWx9IGZyb20gdW50cnVzdGVkIGZyYW1lYCk7XG4gIH1cbn1cblxuLyoqIExheWVyIHNlbGYtdXBkYXRlIGlzIG9wdC1pbi4gTWlzc2luZy91bmRlZmluZWQgbWVhbnMgT0ZGLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTGF5ZXJBdXRvVXBkYXRlRW5hYmxlZCh2YWx1ZTogYm9vbGVhbiB8IHVuZGVmaW5lZCB8IG51bGwpOiBib29sZWFuIHtcbiAgcmV0dXJuIHZhbHVlID09PSB0cnVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RyaXBSZW5kZXJlclVwZGF0ZVJlcG88VCBleHRlbmRzIHsgdXBkYXRlUmVwbz86IHVua25vd24gfT4oY29uZmlnOiBUKTogT21pdDxULCBcInVwZGF0ZVJlcG9cIj4ge1xuICBjb25zdCB7IHVwZGF0ZVJlcG86IF9pZ25vcmVkLCAuLi5yZXN0IH0gPSBjb25maWc7XG4gIHJldHVybiByZXN0O1xufVxuIiwgImV4cG9ydCB0eXBlIFR3ZWFrU2NvcGUgPSBcInJlbmRlcmVyXCIgfCBcIm1haW5cIiB8IFwiYm90aFwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJlbG9hZFR3ZWFrc0RlcHMge1xuICBsb2dJbmZvKG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQ7XG4gIHN0b3BBbGxNYWluVHdlYWtzKCk6IHZvaWQ7XG4gIGNsZWFyVHdlYWtNb2R1bGVDYWNoZSgpOiB2b2lkO1xuICBsb2FkQWxsTWFpblR3ZWFrcygpOiB2b2lkO1xuICBicm9hZGNhc3RSZWxvYWQoKTogdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTZXRUd2Vha0VuYWJsZWRBbmRSZWxvYWREZXBzIGV4dGVuZHMgUmVsb2FkVHdlYWtzRGVwcyB7XG4gIHNldFR3ZWFrRW5hYmxlZChpZDogc3RyaW5nLCBlbmFibGVkOiBib29sZWFuKTogdm9pZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzTWFpblByb2Nlc3NUd2Vha1Njb3BlKHNjb3BlOiBUd2Vha1Njb3BlIHwgdW5kZWZpbmVkKTogYm9vbGVhbiB7XG4gIHJldHVybiBzY29wZSAhPT0gXCJyZW5kZXJlclwiO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVsb2FkVHdlYWtzKHJlYXNvbjogc3RyaW5nLCBkZXBzOiBSZWxvYWRUd2Vha3NEZXBzKTogdm9pZCB7XG4gIGRlcHMubG9nSW5mbyhgcmVsb2FkaW5nIHR3ZWFrcyAoJHtyZWFzb259KWApO1xuICBkZXBzLnN0b3BBbGxNYWluVHdlYWtzKCk7XG4gIGRlcHMuY2xlYXJUd2Vha01vZHVsZUNhY2hlKCk7XG4gIGRlcHMubG9hZEFsbE1haW5Ud2Vha3MoKTtcbiAgZGVwcy5icm9hZGNhc3RSZWxvYWQoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldFR3ZWFrRW5hYmxlZEFuZFJlbG9hZChcbiAgaWQ6IHN0cmluZyxcbiAgZW5hYmxlZDogdW5rbm93bixcbiAgZGVwczogU2V0VHdlYWtFbmFibGVkQW5kUmVsb2FkRGVwcyxcbik6IHRydWUge1xuICBjb25zdCBub3JtYWxpemVkRW5hYmxlZCA9ICEhZW5hYmxlZDtcbiAgZGVwcy5zZXRUd2Vha0VuYWJsZWQoaWQsIG5vcm1hbGl6ZWRFbmFibGVkKTtcbiAgZGVwcy5sb2dJbmZvKGB0d2VhayAke2lkfSBlbmFibGVkPSR7bm9ybWFsaXplZEVuYWJsZWR9YCk7XG4gIHJlbG9hZFR3ZWFrcyhcImVuYWJsZWQtdG9nZ2xlXCIsIGRlcHMpO1xuICByZXR1cm4gdHJ1ZTtcbn1cbiIsICJpbXBvcnQgeyBhcHAsIEJyb3dzZXJWaWV3LCBCcm93c2VyV2luZG93LCBNZXNzYWdlQ2hhbm5lbE1haW4sIGlwY01haW4sIG5hdGl2ZVRoZW1lIH0gZnJvbSBcImVsZWN0cm9uXCI7XG5pbXBvcnQgeyBjcmVhdGVIYXNoLCByYW5kb21VVUlEIH0gZnJvbSBcIm5vZGU6Y3J5cHRvXCI7XG5pbXBvcnQgeyBleGlzdHNTeW5jLCByZWFkRmlsZVN5bmMsIHN0YXRTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGNyZWF0ZVNlcnZlciwgdHlwZSBJbmNvbWluZ01lc3NhZ2UsIHR5cGUgU2VydmVyLCB0eXBlIFNlcnZlclJlc3BvbnNlIH0gZnJvbSBcIm5vZGU6aHR0cFwiO1xuaW1wb3J0IHsgam9pbiwgbm9ybWFsaXplLCByZWxhdGl2ZSB9IGZyb20gXCJub2RlOnBhdGhcIjtcbmltcG9ydCB0eXBlIHsgU29ja2V0IH0gZnJvbSBcIm5vZGU6bmV0XCI7XG5cbmNvbnN0IENPTk5FQ1RfUE9SVF9DSEFOTkVMID0gXCJjb2RleHBwOmJyb3dzZXItdWktY29ubmVjdC1hcHAtaG9zdFwiO1xuY29uc3QgQlJJREdFX1JFUVVFU1RfQ0hBTk5FTCA9IFwiY29kZXhwcDpicm93c2VyLXVpLWJyaWRnZS1yZXF1ZXN0XCI7XG5jb25zdCBCUklER0VfUkVTUE9OU0VfQ0hBTk5FTCA9IFwiY29kZXhwcDpicm93c2VyLXVpLWJyaWRnZS1yZXNwb25zZVwiO1xuY29uc3QgTUVTU0FHRV9GT1JfVklFV19DSEFOTkVMID0gXCJjb2RleHBwOmJyb3dzZXItdWktbWVzc2FnZS1mb3Itdmlld1wiO1xuY29uc3QgV09SS0VSX01FU1NBR0VfQ0hBTk5FTCA9IFwiY29kZXhwcDpicm93c2VyLXVpLXdvcmtlci1tZXNzYWdlXCI7XG5jb25zdCBTWVNURU1fVEhFTUVfQ0hBTk5FTCA9IFwiY29kZXhwcDpicm93c2VyLXVpLXN5c3RlbS10aGVtZVwiO1xuXG50eXBlIExvZ0ZuID0gKGxldmVsOiBcImluZm9cIiB8IFwid2FyblwiIHwgXCJlcnJvclwiLCAuLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQ7XG5cbmludGVyZmFjZSBDb2RleFdpbmRvd1NlcnZpY2VzIHtcbiAgZ2V0Q29udGV4dD86IChob3N0SWQ6IHN0cmluZykgPT4geyByZWdpc3RlcldpbmRvdz86ICh3aW5kb3dMaWtlOiBDb2RleFdpbmRvd0xpa2UpID0+IHZvaWQgfSB8IG51bGw7XG4gIGdldENvbnRleHRGb3JXZWJDb250ZW50cz86IChcbiAgICB3ZWJDb250ZW50czogRWxlY3Ryb24uV2ViQ29udGVudHMsXG4gICkgPT4geyByZWdpc3RlcldpbmRvdz86ICh3aW5kb3dMaWtlOiBDb2RleFdpbmRvd0xpa2UpID0+IHZvaWQgfSB8IG51bGw7XG4gIHdpbmRvd01hbmFnZXI/OiB7XG4gICAgcmVnaXN0ZXJXaW5kb3c/OiAoXG4gICAgICB3aW5kb3dMaWtlOiBDb2RleFdpbmRvd0xpa2UsXG4gICAgICBob3N0SWQ6IHN0cmluZyxcbiAgICAgIHByaW1hcnk6IGJvb2xlYW4sXG4gICAgICBhcHBlYXJhbmNlOiBzdHJpbmcsXG4gICAgKSA9PiB2b2lkO1xuICAgIG9wdGlvbnM/OiB7XG4gICAgICBhbGxvd0RldnRvb2xzPzogYm9vbGVhbjtcbiAgICAgIHByZWxvYWRQYXRoPzogc3RyaW5nO1xuICAgIH07XG4gIH07XG59XG5cbmludGVyZmFjZSBDb2RleFdpbmRvd0xpa2Uge1xuICBpZDogbnVtYmVyO1xuICB3ZWJDb250ZW50czogRWxlY3Ryb24uV2ViQ29udGVudHM7XG4gIG9uKGV2ZW50OiBcImNsb3NlZFwiLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHVua25vd247XG4gIG9uY2U/KGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKTogdW5rbm93bjtcbiAgb2ZmPyhldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCk6IHVua25vd247XG4gIHJlbW92ZUxpc3RlbmVyPyhldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCk6IHVua25vd247XG4gIGlzRGVzdHJveWVkPygpOiBib29sZWFuO1xuICBpc0ZvY3VzZWQ/KCk6IGJvb2xlYW47XG4gIGZvY3VzPygpOiB2b2lkO1xuICBzaG93PygpOiB2b2lkO1xuICBoaWRlPygpOiB2b2lkO1xuICBnZXRCb3VuZHM/KCk6IEVsZWN0cm9uLlJlY3RhbmdsZTtcbiAgZ2V0Q29udGVudEJvdW5kcz8oKTogRWxlY3Ryb24uUmVjdGFuZ2xlO1xuICBnZXRTaXplPygpOiBbbnVtYmVyLCBudW1iZXJdO1xuICBnZXRDb250ZW50U2l6ZT8oKTogW251bWJlciwgbnVtYmVyXTtcbiAgc2V0VGl0bGU/KHRpdGxlOiBzdHJpbmcpOiB2b2lkO1xuICBnZXRUaXRsZT8oKTogc3RyaW5nO1xuICBzZXRSZXByZXNlbnRlZEZpbGVuYW1lPyhmaWxlbmFtZTogc3RyaW5nKTogdm9pZDtcbiAgc2V0RG9jdW1lbnRFZGl0ZWQ/KGVkaXRlZDogYm9vbGVhbik6IHZvaWQ7XG4gIHNldFdpbmRvd0J1dHRvblZpc2liaWxpdHk/KHZpc2libGU6IGJvb2xlYW4pOiB2b2lkO1xufVxuXG5pbnRlcmZhY2UgQnJvd3NlclVpU2VydmVyT3B0aW9ucyB7XG4gIHBvcnQ6IG51bWJlcjtcbiAgaG9zdDogc3RyaW5nO1xuICBoaWRlTWFpbldpbmRvdzogYm9vbGVhbjtcbiAgZ2V0V2luZG93U2VydmljZXM6ICgpID0+IENvZGV4V2luZG93U2VydmljZXMgfCBudWxsO1xuICBsb2c6IExvZ0ZuO1xufVxuXG5pbnRlcmZhY2UgQnJvd3NlclVpSG9zdCB7XG4gIHZpZXc6IEVsZWN0cm9uLkJyb3dzZXJWaWV3O1xuICB3ZWJDb250ZW50czogRWxlY3Ryb24uV2ViQ29udGVudHM7XG59XG5cbmludGVyZmFjZSBCcmlkZ2VQZW5kaW5nUmVxdWVzdCB7XG4gIHJlc29sdmU6ICh2YWx1ZTogdW5rbm93bikgPT4gdm9pZDtcbiAgcmVqZWN0OiAoZXJyb3I6IEVycm9yKSA9PiB2b2lkO1xuICB0aW1lcjogTm9kZUpTLlRpbWVvdXQ7XG59XG5cbmludGVyZmFjZSBJbml0aWFsU3RhdGUge1xuICBzbmFwc2hvdDogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIHN5c3RlbVRoZW1lVmFyaWFudDogc3RyaW5nO1xuICBzZW50cnlJbml0T3B0aW9uczogdW5rbm93bjtcbiAgYnVpbGRGbGF2b3I6IHVua25vd247XG4gIHVzZXNPd2xBcHBTaGVsbDogYm9vbGVhbjtcbiAgcGxhdGZvcm06IE5vZGVKUy5QbGF0Zm9ybTtcbiAgYXJjaDogc3RyaW5nO1xufVxuXG5jb25zdCBNSU1FX1RZUEVTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICBcIi5odG1sXCI6IFwidGV4dC9odG1sOyBjaGFyc2V0PXV0Zi04XCIsXG4gIFwiLmpzXCI6IFwidGV4dC9qYXZhc2NyaXB0OyBjaGFyc2V0PXV0Zi04XCIsXG4gIFwiLmNzc1wiOiBcInRleHQvY3NzOyBjaGFyc2V0PXV0Zi04XCIsXG4gIFwiLmpzb25cIjogXCJhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04XCIsXG4gIFwiLnN2Z1wiOiBcImltYWdlL3N2Zyt4bWxcIixcbiAgXCIucG5nXCI6IFwiaW1hZ2UvcG5nXCIsXG4gIFwiLmpwZ1wiOiBcImltYWdlL2pwZWdcIixcbiAgXCIuanBlZ1wiOiBcImltYWdlL2pwZWdcIixcbiAgXCIud2VicFwiOiBcImltYWdlL3dlYnBcIixcbiAgXCIuaWNvXCI6IFwiaW1hZ2UveC1pY29uXCIsXG4gIFwiLndvZmZcIjogXCJmb250L3dvZmZcIixcbiAgXCIud29mZjJcIjogXCJmb250L3dvZmYyXCIsXG59O1xuXG5sZXQgYWN0aXZlU2VydmVyOiBTZXJ2ZXIgfCBudWxsID0gbnVsbDtcbmxldCBhY3RpdmVIb3N0OiBCcm93c2VyVWlIb3N0IHwgbnVsbCA9IG51bGw7XG5sZXQgYWN0aXZlT3B0aW9uczogQnJvd3NlclVpU2VydmVyT3B0aW9ucyB8IG51bGwgPSBudWxsO1xuY29uc3QgYnJpZGdlUmVxdWVzdHMgPSBuZXcgTWFwPHN0cmluZywgQnJpZGdlUGVuZGluZ1JlcXVlc3Q+KCk7XG5jb25zdCBjb250cm9sQ2xpZW50cyA9IG5ldyBTZXQ8V2ViU29ja2V0Q29ubmVjdGlvbj4oKTtcblxuZXhwb3J0IGZ1bmN0aW9uIG1heWJlU3RhcnRCcm93c2VyVWlTZXJ2ZXIoXG4gIG9wdHM6IFBpY2s8QnJvd3NlclVpU2VydmVyT3B0aW9ucywgXCJnZXRXaW5kb3dTZXJ2aWNlc1wiIHwgXCJsb2dcIj4sXG4pOiB2b2lkIHtcbiAgaWYgKHByb2Nlc3MuZW52LkNPREVYUFBfQlJPV1NFUl9VSSAhPT0gXCIxXCIpIHJldHVybjtcbiAgY29uc3QgcG9ydCA9IHBhcnNlUG9ydChwcm9jZXNzLmVudi5DT0RFWFBQX0JST1dTRVJfVUlfUE9SVCwgODc2NSk7XG4gIHN0YXJ0QnJvd3NlclVpU2VydmVyKHtcbiAgICAuLi5vcHRzLFxuICAgIHBvcnQsXG4gICAgaG9zdDogXCIxMjcuMC4wLjFcIixcbiAgICBoaWRlTWFpbldpbmRvdzogcHJvY2Vzcy5lbnYuQ09ERVhQUF9CUk9XU0VSX1VJX0hJREVfTUFJTiA9PT0gXCIxXCIsXG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RhcnRCcm93c2VyVWlTZXJ2ZXIob3B0czogQnJvd3NlclVpU2VydmVyT3B0aW9ucyk6IHZvaWQge1xuICBpZiAoYWN0aXZlU2VydmVyKSByZXR1cm47XG4gIGFjdGl2ZU9wdGlvbnMgPSBvcHRzO1xuICBpbnN0YWxsQnJvd3NlclVpSXBjSGFuZGxlcnMob3B0cy5sb2cpO1xuXG4gIGNvbnN0IHNlcnZlciA9IGNyZWF0ZVNlcnZlcigocmVxLCByZXMpID0+IHtcbiAgICBoYW5kbGVIdHRwUmVxdWVzdChyZXEsIHJlcykuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICBvcHRzLmxvZyhcImVycm9yXCIsIFwiYnJvd3NlciBVSSByZXF1ZXN0IGZhaWxlZFwiLCB7IG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgICBzZW5kVGV4dChyZXMsIDUwMCwgXCJJbnRlcm5hbCBTZXJ2ZXIgRXJyb3JcXG5cIiwgXCJ0ZXh0L3BsYWluOyBjaGFyc2V0PXV0Zi04XCIpO1xuICAgIH0pO1xuICB9KTtcbiAgc2VydmVyLm9uKFwidXBncmFkZVwiLCAocmVxLCBzb2NrZXQsIGhlYWQpID0+IHtcbiAgICBoYW5kbGVVcGdyYWRlKHJlcSwgc29ja2V0IGFzIFNvY2tldCwgaGVhZCkuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICBvcHRzLmxvZyhcIndhcm5cIiwgXCJicm93c2VyIFVJIHdlYnNvY2tldCB1cGdyYWRlIGZhaWxlZFwiLCB7IG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgICBzb2NrZXQuZGVzdHJveSgpO1xuICAgIH0pO1xuICB9KTtcbiAgc2VydmVyLm9uKFwiZXJyb3JcIiwgKGVycm9yKSA9PiB7XG4gICAgb3B0cy5sb2coXCJlcnJvclwiLCBcImJyb3dzZXIgVUkgc2VydmVyIGZhaWxlZFwiLCB7IG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgfSk7XG4gIH0pO1xuICBzZXJ2ZXIubGlzdGVuKG9wdHMucG9ydCwgb3B0cy5ob3N0LCAoKSA9PiB7XG4gICAgb3B0cy5sb2coXCJpbmZvXCIsIGBicm93c2VyIFVJIHNlcnZlciBsaXN0ZW5pbmcgYXQgaHR0cDovLyR7b3B0cy5ob3N0fToke29wdHMucG9ydH0vYCk7XG4gIH0pO1xuICBhY3RpdmVTZXJ2ZXIgPSBzZXJ2ZXI7XG4gIGlmIChvcHRzLmhpZGVNYWluV2luZG93KSB7XG4gICAgZm9yIChjb25zdCBkZWxheU1zIG9mIFs1MDAsIDFfNTAwLCAzXzAwMF0pIHtcbiAgICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dChoaWRlVmlzaWJsZUNvZGV4V2luZG93cywgZGVsYXlNcyk7XG4gICAgICB0aW1lci51bnJlZj8uKCk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGluc3RhbGxCcm93c2VyVWlJcGNIYW5kbGVycyhsb2c6IExvZ0ZuKTogdm9pZCB7XG4gIGlwY01haW4ucmVtb3ZlQWxsTGlzdGVuZXJzKEJSSURHRV9SRVNQT05TRV9DSEFOTkVMKTtcbiAgaXBjTWFpbi5yZW1vdmVBbGxMaXN0ZW5lcnMoTUVTU0FHRV9GT1JfVklFV19DSEFOTkVMKTtcbiAgaXBjTWFpbi5yZW1vdmVBbGxMaXN0ZW5lcnMoV09SS0VSX01FU1NBR0VfQ0hBTk5FTCk7XG4gIGlwY01haW4ucmVtb3ZlQWxsTGlzdGVuZXJzKFNZU1RFTV9USEVNRV9DSEFOTkVMKTtcblxuICBpcGNNYWluLm9uKEJSSURHRV9SRVNQT05TRV9DSEFOTkVMLCAoZXZlbnQsIHBheWxvYWQpID0+IHtcbiAgICBpZiAoIWlzQnJvd3NlclVpSG9zdFNlbmRlcihldmVudC5zZW5kZXIpKSByZXR1cm47XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhc1JlY29yZChwYXlsb2FkKTtcbiAgICBjb25zdCBpZCA9IHR5cGVvZiByZXNwb25zZT8uaWQgPT09IFwic3RyaW5nXCIgPyByZXNwb25zZS5pZCA6IFwiXCI7XG4gICAgY29uc3QgcGVuZGluZyA9IGJyaWRnZVJlcXVlc3RzLmdldChpZCk7XG4gICAgaWYgKCFwZW5kaW5nKSByZXR1cm47XG4gICAgYnJpZGdlUmVxdWVzdHMuZGVsZXRlKGlkKTtcbiAgICBjbGVhclRpbWVvdXQocGVuZGluZy50aW1lcik7XG4gICAgaWYgKHJlc3BvbnNlPy5vayA9PT0gdHJ1ZSkge1xuICAgICAgcGVuZGluZy5yZXNvbHZlKHJlc3BvbnNlLnZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGVuZGluZy5yZWplY3QobmV3IEVycm9yKHR5cGVvZiByZXNwb25zZT8uZXJyb3IgPT09IFwic3RyaW5nXCIgPyByZXNwb25zZS5lcnJvciA6IFwiQnJpZGdlIHJlcXVlc3QgZmFpbGVkXCIpKTtcbiAgICB9XG4gIH0pO1xuXG4gIGlwY01haW4ub24oTUVTU0FHRV9GT1JfVklFV19DSEFOTkVMLCAoZXZlbnQsIG1lc3NhZ2UpID0+IHtcbiAgICBpZiAoIWlzQnJvd3NlclVpSG9zdFNlbmRlcihldmVudC5zZW5kZXIpKSByZXR1cm47XG4gICAgYnJvYWRjYXN0Q29udHJvbCh7IHR5cGU6IFwibWVzc2FnZS1mb3Itdmlld1wiLCBtZXNzYWdlIH0pO1xuICB9KTtcblxuICBpcGNNYWluLm9uKFdPUktFUl9NRVNTQUdFX0NIQU5ORUwsIChldmVudCwgd29ya2VySWQsIG1lc3NhZ2UpID0+IHtcbiAgICBpZiAoIWlzQnJvd3NlclVpSG9zdFNlbmRlcihldmVudC5zZW5kZXIpKSByZXR1cm47XG4gICAgaWYgKHR5cGVvZiB3b3JrZXJJZCAhPT0gXCJzdHJpbmdcIikgcmV0dXJuO1xuICAgIGJyb2FkY2FzdENvbnRyb2woeyB0eXBlOiBcIndvcmtlci1tZXNzYWdlXCIsIHdvcmtlcklkLCBtZXNzYWdlIH0pO1xuICB9KTtcblxuICBpcGNNYWluLm9uKFNZU1RFTV9USEVNRV9DSEFOTkVMLCAoZXZlbnQsIHZhbHVlKSA9PiB7XG4gICAgaWYgKCFpc0Jyb3dzZXJVaUhvc3RTZW5kZXIoZXZlbnQuc2VuZGVyKSkgcmV0dXJuO1xuICAgIGJyb2FkY2FzdENvbnRyb2woeyB0eXBlOiBcInN5c3RlbS10aGVtZS12YXJpYW50LXVwZGF0ZWRcIiwgdmFsdWUgfSk7XG4gIH0pO1xuXG4gIHByb2Nlc3Mub25jZShcImV4aXRcIiwgKCkgPT4ge1xuICAgIGZvciAoY29uc3QgcGVuZGluZyBvZiBicmlkZ2VSZXF1ZXN0cy52YWx1ZXMoKSkge1xuICAgICAgY2xlYXJUaW1lb3V0KHBlbmRpbmcudGltZXIpO1xuICAgICAgcGVuZGluZy5yZWplY3QobmV3IEVycm9yKFwiQ29kZXgrKyBicm93c2VyIFVJIHNlcnZlciBzdG9wcGVkXCIpKTtcbiAgICB9XG4gICAgYnJpZGdlUmVxdWVzdHMuY2xlYXIoKTtcbiAgICBmb3IgKGNvbnN0IGNsaWVudCBvZiBjb250cm9sQ2xpZW50cykgY2xpZW50LmNsb3NlKCk7XG4gICAgY29udHJvbENsaWVudHMuY2xlYXIoKTtcbiAgICB0cnkge1xuICAgICAgaWYgKGFjdGl2ZUhvc3QgJiYgIWFjdGl2ZUhvc3Qud2ViQ29udGVudHMuaXNEZXN0cm95ZWQoKSkge1xuICAgICAgICBhY3RpdmVIb3N0LndlYkNvbnRlbnRzLmNsb3NlKHsgd2FpdEZvckJlZm9yZVVubG9hZDogZmFsc2UgfSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvZyhcIndhcm5cIiwgXCJicm93c2VyIFVJIGhvc3QgY2xlYW51cCBmYWlsZWRcIiwgeyBtZXNzYWdlOiBTdHJpbmcoZXJyb3IpIH0pO1xuICAgIH1cbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUh0dHBSZXF1ZXN0KHJlcTogSW5jb21pbmdNZXNzYWdlLCByZXM6IFNlcnZlclJlc3BvbnNlKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IG9wdGlvbnMgPSByZXF1aXJlT3B0aW9ucygpO1xuICBjb25zdCB1cmwgPSByZXF1ZXN0VXJsKHJlcSk7XG4gIGlmICghdXJsKSB7XG4gICAgc2VuZFRleHQocmVzLCA0MDAsIFwiQmFkIFJlcXVlc3RcXG5cIiwgXCJ0ZXh0L3BsYWluOyBjaGFyc2V0PXV0Zi04XCIpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICh1cmwucGF0aG5hbWUgPT09IFwiL2NvZGV4cHAvYnJvd3Nlci11aS9oZWFsdGhcIikge1xuICAgIHNlbmRKc29uKHJlcywgMjAwLCB7IG9rOiB0cnVlIH0pO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICh1cmwucGF0aG5hbWUgPT09IFwiL2NvZGV4cHAvYnJvd3Nlci11aS9icmlkZ2VcIikge1xuICAgIGlmIChyZXEubWV0aG9kICE9PSBcIlBPU1RcIikge1xuICAgICAgc2VuZFRleHQocmVzLCA0MDUsIFwiTWV0aG9kIE5vdCBBbGxvd2VkXFxuXCIsIFwidGV4dC9wbGFpbjsgY2hhcnNldD11dGYtOFwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgYm9keSA9IGFzUmVjb3JkKGF3YWl0IHJlYWRKc29uQm9keShyZXEpKTtcbiAgICBjb25zdCBtZXRob2QgPSB0eXBlb2YgYm9keT8ubWV0aG9kID09PSBcInN0cmluZ1wiID8gYm9keS5tZXRob2QgOiBcIlwiO1xuICAgIGNvbnN0IGFyZ3MgPSBBcnJheS5pc0FycmF5KGJvZHk/LmFyZ3MpID8gYm9keS5hcmdzIDogW107XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgY2FsbEhpZGRlbkJyaWRnZShtZXRob2QsIGFyZ3MpO1xuICAgICAgc2VuZEpzb24ocmVzLCAyMDAsIHsgb2s6IHRydWUsIHZhbHVlIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBzZW5kSnNvbihyZXMsIDUwMCwge1xuICAgICAgICBvazogZmFsc2UsXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvciksXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHVybC5wYXRobmFtZSA9PT0gXCIvY29kZXhwcC9icm93c2VyLXVpL2JyaWRnZS5qc1wiKSB7XG4gICAgaWYgKHJlcS5tZXRob2QgIT09IFwiR0VUXCIgJiYgcmVxLm1ldGhvZCAhPT0gXCJIRUFEXCIpIHtcbiAgICAgIHNlbmRUZXh0KHJlcywgNDA1LCBcIk1ldGhvZCBOb3QgQWxsb3dlZFxcblwiLCBcInRleHQvcGxhaW47IGNoYXJzZXQ9dXRmLThcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHNjcmlwdCA9IGJyb3dzZXJCcmlkZ2VTY3JpcHQoYXdhaXQgY29sbGVjdEluaXRpYWxTdGF0ZShvcHRpb25zKSk7XG4gICAgc2VuZEJ1ZmZlcihyZXMsIDIwMCwgQnVmZmVyLmZyb20oc2NyaXB0KSwgTUlNRV9UWVBFU1tcIi5qc1wiXSwgcmVxLm1ldGhvZCA9PT0gXCJIRUFEXCIpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChyZXEubWV0aG9kICE9PSBcIkdFVFwiICYmIHJlcS5tZXRob2QgIT09IFwiSEVBRFwiKSB7XG4gICAgc2VuZFRleHQocmVzLCA0MDUsIFwiTWV0aG9kIE5vdCBBbGxvd2VkXFxuXCIsIFwidGV4dC9wbGFpbjsgY2hhcnNldD11dGYtOFwiKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAodXJsLnBhdGhuYW1lID09PSBcIi9cIiB8fCB1cmwucGF0aG5hbWUgPT09IFwiL2luZGV4Lmh0bWxcIikge1xuICAgIGNvbnN0IGh0bWwgPSBhd2FpdCBicm93c2VySW5kZXhIdG1sKG9wdGlvbnMpO1xuICAgIHNlbmRCdWZmZXIocmVzLCAyMDAsIEJ1ZmZlci5mcm9tKGh0bWwpLCBNSU1FX1RZUEVTW1wiLmh0bWxcIl0sIHJlcS5tZXRob2QgPT09IFwiSEVBRFwiKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBmaWxlID0gd2Vidmlld0ZpbGUodXJsLnBhdGhuYW1lKTtcbiAgaWYgKCFmaWxlKSB7XG4gICAgc2VuZFRleHQocmVzLCA0MDQsIFwiTm90IEZvdW5kXFxuXCIsIFwidGV4dC9wbGFpbjsgY2hhcnNldD11dGYtOFwiKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhmaWxlKTtcbiAgc2VuZEJ1ZmZlcihyZXMsIDIwMCwgY29udGVudCwgbWltZVR5cGUoZmlsZSksIHJlcS5tZXRob2QgPT09IFwiSEVBRFwiKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlVXBncmFkZShyZXE6IEluY29taW5nTWVzc2FnZSwgc29ja2V0OiBTb2NrZXQsIGhlYWQ6IEJ1ZmZlcik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB1cmwgPSByZXF1ZXN0VXJsKHJlcSk7XG4gIGlmICghdXJsKSB0aHJvdyBuZXcgRXJyb3IoXCJiYWQgd2Vic29ja2V0IFVSTFwiKTtcbiAgaWYgKHVybC5wYXRobmFtZSAhPT0gXCIvY29kZXhwcC9icm93c2VyLXVpL3JwY1wiICYmIHVybC5wYXRobmFtZSAhPT0gXCIvY29kZXhwcC9icm93c2VyLXVpL2NvbnRyb2xcIikge1xuICAgIHNvY2tldC5kZXN0cm95KCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHdzID0gYWNjZXB0V2ViU29ja2V0KHJlcSwgc29ja2V0LCBoZWFkKTtcbiAgaWYgKHVybC5wYXRobmFtZSA9PT0gXCIvY29kZXhwcC9icm93c2VyLXVpL2NvbnRyb2xcIikge1xuICAgIGNvbnRyb2xDbGllbnRzLmFkZCh3cyk7XG4gICAgd3Mub25DbG9zZSgoKSA9PiBjb250cm9sQ2xpZW50cy5kZWxldGUod3MpKTtcbiAgICB3cy5zZW5kSnNvbih7IHR5cGU6IFwiaGVsbG9cIiB9KTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBob3N0ID0gYXdhaXQgZW5zdXJlQnJvd3NlclVpSG9zdCgpO1xuICBjb25zdCB7IHBvcnQxLCBwb3J0MiB9ID0gbmV3IE1lc3NhZ2VDaGFubmVsTWFpbigpO1xuICBob3N0LndlYkNvbnRlbnRzLnBvc3RNZXNzYWdlKENPTk5FQ1RfUE9SVF9DSEFOTkVMLCB7fSwgW3BvcnQyXSk7XG4gIGJyaWRnZU1lc3NhZ2VQb3J0VG9XZWJTb2NrZXQocG9ydDEsIHdzKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gYnJvd3NlckluZGV4SHRtbChvcHRpb25zOiBCcm93c2VyVWlTZXJ2ZXJPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgaW5kZXhQYXRoID0gam9pbih3ZWJ2aWV3Um9vdCgpLCBcImluZGV4Lmh0bWxcIik7XG4gIGxldCBodG1sID0gcmVsYXhCcm93c2VyVWlDc3AocmVhZEZpbGVTeW5jKGluZGV4UGF0aCwgXCJ1dGY4XCIpKTtcbiAgY29uc3Qgc2hpbSA9IGA8c2NyaXB0IHNyYz1cIi9jb2RleHBwL2Jyb3dzZXItdWkvYnJpZGdlLmpzXCI+PC9zY3JpcHQ+YDtcbiAgaWYgKGh0bWwuaW5jbHVkZXMoXCI8L2hlYWQ+XCIpKSB7XG4gICAgaHRtbCA9IGh0bWwucmVwbGFjZShcIjwvaGVhZD5cIiwgYCR7c2hpbX1cXG4gIDwvaGVhZD5gKTtcbiAgfSBlbHNlIHtcbiAgICBodG1sID0gYCR7c2hpbX1cXG4ke2h0bWx9YDtcbiAgfVxuICByZXR1cm4gaHRtbDtcbn1cblxuZnVuY3Rpb24gcmVsYXhCcm93c2VyVWlDc3AoaHRtbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGh0bWwucmVwbGFjZShcbiAgICAvKDxtZXRhXFxzK2h0dHAtZXF1aXY9W1wiJ11Db250ZW50LVNlY3VyaXR5LVBvbGljeVtcIiddXFxzK2NvbnRlbnQ9XCIpKFteXCJdKikoXCIpLyxcbiAgICAoX21hdGNoLCBwcmVmaXg6IHN0cmluZywgY29udGVudDogc3RyaW5nLCBzdWZmaXg6IHN0cmluZykgPT4ge1xuICAgICAgY29uc3QgZGlyZWN0aXZlcyA9IHBhcnNlQ3NwRGlyZWN0aXZlcyhkZWNvZGVIdG1sQXR0cmlidXRlKGNvbnRlbnQpKTtcbiAgICAgIGRpcmVjdGl2ZXMuc2V0KFwiY2hpbGQtc3JjXCIsIFwiJ3NlbGYnIGJsb2I6IGRhdGE6IGh0dHA6IGh0dHBzOlwiKTtcbiAgICAgIGRpcmVjdGl2ZXMuc2V0KFwiZnJhbWUtc3JjXCIsIFwiJ3NlbGYnIGJsb2I6IGRhdGE6IGh0dHA6IGh0dHBzOlwiKTtcbiAgICAgIGRpcmVjdGl2ZXMuc2V0KFwiY29ubmVjdC1zcmNcIiwgXCInc2VsZicgaHR0cDogaHR0cHM6IHdzOiB3c3M6IHNlbnRyeS1pcGM6XCIpO1xuICAgICAgcmV0dXJuIGAke3ByZWZpeH0ke2VuY29kZUh0bWxBdHRyaWJ1dGUoZm9ybWF0Q3NwRGlyZWN0aXZlcyhkaXJlY3RpdmVzKSl9JHtzdWZmaXh9YDtcbiAgICB9LFxuICApO1xufVxuXG5mdW5jdGlvbiBwYXJzZUNzcERpcmVjdGl2ZXMoY29udGVudDogc3RyaW5nKTogTWFwPHN0cmluZywgc3RyaW5nPiB7XG4gIGNvbnN0IGRpcmVjdGl2ZXMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBmb3IgKGNvbnN0IHBhcnQgb2YgY29udGVudC5zcGxpdChcIjtcIikpIHtcbiAgICBjb25zdCB0cmltbWVkID0gcGFydC50cmltKCk7XG4gICAgaWYgKCF0cmltbWVkKSBjb250aW51ZTtcbiAgICBjb25zdCBbbmFtZSwgLi4ucmVzdF0gPSB0cmltbWVkLnNwbGl0KC9cXHMrLyk7XG4gICAgaWYgKCFuYW1lKSBjb250aW51ZTtcbiAgICBkaXJlY3RpdmVzLnNldChuYW1lLCByZXN0LmpvaW4oXCIgXCIpKTtcbiAgfVxuICByZXR1cm4gZGlyZWN0aXZlcztcbn1cblxuZnVuY3Rpb24gZm9ybWF0Q3NwRGlyZWN0aXZlcyhkaXJlY3RpdmVzOiBNYXA8c3RyaW5nLCBzdHJpbmc+KTogc3RyaW5nIHtcbiAgcmV0dXJuIFsuLi5kaXJlY3RpdmVzLmVudHJpZXMoKV1cbiAgICAubWFwKChbbmFtZSwgdmFsdWVdKSA9PiAodmFsdWUgPyBgJHtuYW1lfSAke3ZhbHVlfWAgOiBuYW1lKSlcbiAgICAuam9pbihcIjsgXCIpO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVIdG1sQXR0cmlidXRlKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdmFsdWVcbiAgICAucmVwbGFjZSgvJnF1b3Q7L2csICdcIicpXG4gICAgLnJlcGxhY2UoLyYjMzk7L2csIFwiJ1wiKVxuICAgIC5yZXBsYWNlKC8mbHQ7L2csIFwiPFwiKVxuICAgIC5yZXBsYWNlKC8mZ3Q7L2csIFwiPlwiKVxuICAgIC5yZXBsYWNlKC8mYW1wOy9nLCBcIiZcIik7XG59XG5cbmZ1bmN0aW9uIGVuY29kZUh0bWxBdHRyaWJ1dGUodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB2YWx1ZVxuICAgIC5yZXBsYWNlKC8mL2csIFwiJmFtcDtcIilcbiAgICAucmVwbGFjZSgvXCIvZywgXCImcXVvdDtcIik7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNvbGxlY3RJbml0aWFsU3RhdGUob3B0aW9uczogQnJvd3NlclVpU2VydmVyT3B0aW9ucyk6IFByb21pc2U8SW5pdGlhbFN0YXRlPiB7XG4gIGF3YWl0IGVuc3VyZUJyb3dzZXJVaUhvc3QoKTtcbiAgY29uc3QgW3NuYXBzaG90LCBzeXN0ZW1UaGVtZVZhcmlhbnQsIHNlbnRyeUluaXRPcHRpb25zLCBidWlsZEZsYXZvciwgdXNlc093bEFwcFNoZWxsXSA9IGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICBjYWxsSGlkZGVuQnJpZGdlKFwic25hcHNob3RcIiwgW10pLFxuICAgIGNhbGxIaWRkZW5CcmlkZ2UoXCJzeXN0ZW1UaGVtZVwiLCBbXSksXG4gICAgY2FsbEhpZGRlbkJyaWRnZShcInNlbnRyeU9wdGlvbnNcIiwgW10pLFxuICAgIGNhbGxIaWRkZW5CcmlkZ2UoXCJidWlsZEZsYXZvclwiLCBbXSksXG4gICAgY2FsbEhpZGRlbkJyaWRnZShcInVzZXNPd2xBcHBTaGVsbFwiLCBbXSksXG4gIF0pO1xuICBpZiAob3B0aW9ucy5oaWRlTWFpbldpbmRvdykgaGlkZVZpc2libGVDb2RleFdpbmRvd3MoKTtcbiAgcmV0dXJuIHtcbiAgICBzbmFwc2hvdDogYXNQbGFpbk9iamVjdChzbmFwc2hvdCksXG4gICAgc3lzdGVtVGhlbWVWYXJpYW50OiB0eXBlb2Ygc3lzdGVtVGhlbWVWYXJpYW50ID09PSBcInN0cmluZ1wiID8gc3lzdGVtVGhlbWVWYXJpYW50IDogY3VycmVudFN5c3RlbVRoZW1lVmFyaWFudCgpLFxuICAgIHNlbnRyeUluaXRPcHRpb25zLFxuICAgIGJ1aWxkRmxhdm9yLFxuICAgIHVzZXNPd2xBcHBTaGVsbDogdXNlc093bEFwcFNoZWxsID09PSB0cnVlLFxuICAgIHBsYXRmb3JtOiBwcm9jZXNzLnBsYXRmb3JtLFxuICAgIGFyY2g6IHByb2Nlc3MuYXJjaCxcbiAgfTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZW5zdXJlQnJvd3NlclVpSG9zdCgpOiBQcm9taXNlPEJyb3dzZXJVaUhvc3Q+IHtcbiAgaWYgKGFjdGl2ZUhvc3QgJiYgIWFjdGl2ZUhvc3Qud2ViQ29udGVudHMuaXNEZXN0cm95ZWQoKSkgcmV0dXJuIGFjdGl2ZUhvc3Q7XG4gIGNvbnN0IG9wdGlvbnMgPSByZXF1aXJlT3B0aW9ucygpO1xuICBjb25zdCBzZXJ2aWNlcyA9IGF3YWl0IHdhaXRGb3JXaW5kb3dTZXJ2aWNlcyhvcHRpb25zKTtcbiAgY29uc3Qgd2luZG93TWFuYWdlciA9IHNlcnZpY2VzLndpbmRvd01hbmFnZXI7XG4gIGlmICghd2luZG93TWFuYWdlcj8ucmVnaXN0ZXJXaW5kb3cpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb2RleCB3aW5kb3cgcmVnaXN0cmF0aW9uIHNlcnZpY2VzIGFyZSB1bmF2YWlsYWJsZVwiKTtcbiAgfVxuXG4gIGNvbnN0IHZpZXcgPSBuZXcgQnJvd3NlclZpZXcoe1xuICAgIHdlYlByZWZlcmVuY2VzOiB7XG4gICAgICBwcmVsb2FkOiB3aW5kb3dNYW5hZ2VyLm9wdGlvbnM/LnByZWxvYWRQYXRoLFxuICAgICAgY29udGV4dElzb2xhdGlvbjogdHJ1ZSxcbiAgICAgIG5vZGVJbnRlZ3JhdGlvbjogZmFsc2UsXG4gICAgICBzcGVsbGNoZWNrOiBmYWxzZSxcbiAgICAgIGRldlRvb2xzOiB3aW5kb3dNYW5hZ2VyLm9wdGlvbnM/LmFsbG93RGV2dG9vbHMsXG4gICAgfSxcbiAgfSk7XG4gIGNvbnN0IHdpbmRvd0xpa2UgPSBtYWtlV2luZG93TGlrZUZvclZpZXcodmlldyk7XG4gIHdpbmRvd01hbmFnZXIucmVnaXN0ZXJXaW5kb3cod2luZG93TGlrZSwgXCJsb2NhbFwiLCBmYWxzZSwgXCJzZWNvbmRhcnlcIik7XG4gIGNvbnN0IGNvbnRleHQgPSBzZXJ2aWNlcy5nZXRDb250ZXh0Rm9yV2ViQ29udGVudHM/Lih2aWV3LndlYkNvbnRlbnRzKSA/PyBzZXJ2aWNlcy5nZXRDb250ZXh0Py4oXCJsb2NhbFwiKTtcbiAgY29udGV4dD8ucmVnaXN0ZXJXaW5kb3c/Lih3aW5kb3dMaWtlKTtcbiAgYXdhaXQgdmlldy53ZWJDb250ZW50cy5sb2FkVVJMKFwiYWJvdXQ6YmxhbmtcIik7XG4gIGFjdGl2ZUhvc3QgPSB7IHZpZXcsIHdlYkNvbnRlbnRzOiB2aWV3LndlYkNvbnRlbnRzIH07XG4gIHZpZXcud2ViQ29udGVudHMub25jZShcImRlc3Ryb3llZFwiLCAoKSA9PiB7XG4gICAgaWYgKGFjdGl2ZUhvc3Q/LndlYkNvbnRlbnRzID09PSB2aWV3LndlYkNvbnRlbnRzKSBhY3RpdmVIb3N0ID0gbnVsbDtcbiAgfSk7XG4gIG9wdGlvbnMubG9nKFwiaW5mb1wiLCBcImJyb3dzZXIgVUkgaGlkZGVuIGhvc3QgcmVhZHlcIiwgeyB3ZWJDb250ZW50c0lkOiB2aWV3LndlYkNvbnRlbnRzLmlkIH0pO1xuICByZXR1cm4gYWN0aXZlSG9zdDtcbn1cblxuYXN5bmMgZnVuY3Rpb24gd2FpdEZvcldpbmRvd1NlcnZpY2VzKG9wdGlvbnM6IEJyb3dzZXJVaVNlcnZlck9wdGlvbnMpOiBQcm9taXNlPENvZGV4V2luZG93U2VydmljZXM+IHtcbiAgY29uc3Qgc3RhcnRlZCA9IERhdGUubm93KCk7XG4gIHdoaWxlIChEYXRlLm5vdygpIC0gc3RhcnRlZCA8IDMwXzAwMCkge1xuICAgIGNvbnN0IHNlcnZpY2VzID0gb3B0aW9ucy5nZXRXaW5kb3dTZXJ2aWNlcygpO1xuICAgIGlmIChcbiAgICAgIHNlcnZpY2VzPy53aW5kb3dNYW5hZ2VyPy5yZWdpc3RlcldpbmRvdyAmJlxuICAgICAgKHNlcnZpY2VzLmdldENvbnRleHQgfHwgc2VydmljZXMuZ2V0Q29udGV4dEZvcldlYkNvbnRlbnRzKVxuICAgICkge1xuICAgICAgcmV0dXJuIHNlcnZpY2VzO1xuICAgIH1cbiAgICBhd2FpdCBkZWxheSgxMDApO1xuICB9XG4gIHRocm93IG5ldyBFcnJvcihcIlRpbWVkIG91dCB3YWl0aW5nIGZvciBDb2RleCB3aW5kb3cgc2VydmljZXNcIik7XG59XG5cbmZ1bmN0aW9uIGNhbGxIaWRkZW5CcmlkZ2UobWV0aG9kOiBzdHJpbmcsIGFyZ3M6IHVua25vd25bXSk6IFByb21pc2U8dW5rbm93bj4ge1xuICBhc3NlcnRCcmlkZ2VNZXRob2QobWV0aG9kKTtcbiAgcmV0dXJuIGVuc3VyZUJyb3dzZXJVaUhvc3QoKS50aGVuKChob3N0KSA9PiB7XG4gICAgY29uc3QgaWQgPSByYW5kb21VVUlEKCk7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGJyaWRnZVJlcXVlc3RzLmRlbGV0ZShpZCk7XG4gICAgICAgIHJlamVjdChuZXcgRXJyb3IoYFRpbWVkIG91dCB3YWl0aW5nIGZvciBicm93c2VyIFVJIGJyaWRnZSBtZXRob2Q6ICR7bWV0aG9kfWApKTtcbiAgICAgIH0sIDE1XzAwMCk7XG4gICAgICBicmlkZ2VSZXF1ZXN0cy5zZXQoaWQsIHsgcmVzb2x2ZSwgcmVqZWN0LCB0aW1lciB9KTtcbiAgICAgIGhvc3Qud2ViQ29udGVudHMuc2VuZChCUklER0VfUkVRVUVTVF9DSEFOTkVMLCB7IGlkLCBtZXRob2QsIGFyZ3MgfSk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBicmlkZ2VNZXNzYWdlUG9ydFRvV2ViU29ja2V0KHBvcnQ6IEVsZWN0cm9uLk1lc3NhZ2VQb3J0TWFpbiwgd3M6IFdlYlNvY2tldENvbm5lY3Rpb24pOiB2b2lkIHtcbiAgbGV0IGNsb3NlZCA9IGZhbHNlO1xuICBjb25zdCBjbG9zZSA9ICgpID0+IHtcbiAgICBpZiAoY2xvc2VkKSByZXR1cm47XG4gICAgY2xvc2VkID0gdHJ1ZTtcbiAgICB0cnkge1xuICAgICAgcG9ydC5wb3N0TWVzc2FnZShudWxsKTtcbiAgICB9IGNhdGNoIHt9XG4gICAgdHJ5IHtcbiAgICAgIHBvcnQuY2xvc2UoKTtcbiAgICB9IGNhdGNoIHt9XG4gICAgd3MuY2xvc2UoKTtcbiAgfTtcbiAgcG9ydC5zdGFydCgpO1xuICBwb3J0Lm9uKFwibWVzc2FnZVwiLCAoZXZlbnQpID0+IHtcbiAgICBpZiAoY2xvc2VkKSByZXR1cm47XG4gICAgaWYgKGV2ZW50LmRhdGEgPT0gbnVsbCkge1xuICAgICAgY2xvc2UoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBldmVudC5kYXRhID09PSBcInN0cmluZ1wiKSB7XG4gICAgICB3cy5zZW5kVGV4dChldmVudC5kYXRhKTtcbiAgICB9XG4gIH0pO1xuICBwb3J0Lm9uKFwiY2xvc2VcIiwgY2xvc2UpO1xuICB3cy5vblRleHQoKHRleHQpID0+IHtcbiAgICBpZiAoY2xvc2VkKSByZXR1cm47XG4gICAgcG9ydC5wb3N0TWVzc2FnZSh0ZXh0KTtcbiAgfSk7XG4gIHdzLm9uQ2xvc2UoY2xvc2UpO1xufVxuXG5mdW5jdGlvbiBicm9hZGNhc3RDb250cm9sKHBheWxvYWQ6IHVua25vd24pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBjbGllbnQgb2YgWy4uLmNvbnRyb2xDbGllbnRzXSkge1xuICAgIHRyeSB7XG4gICAgICBjbGllbnQuc2VuZEpzb24ocGF5bG9hZCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICBjbGllbnQuY2xvc2UoKTtcbiAgICAgIGNvbnRyb2xDbGllbnRzLmRlbGV0ZShjbGllbnQpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBicm93c2VyQnJpZGdlU2NyaXB0KHN0YXRlOiBJbml0aWFsU3RhdGUpOiBzdHJpbmcge1xuICByZXR1cm4gYFxuKCgpID0+IHtcbiAgY29uc3QgaW5pdGlhbFN0YXRlID0gJHtzYWZlSnNvbihzdGF0ZSl9O1xuICBjb25zdCBzbmFwc2hvdCA9IG5ldyBNYXAoT2JqZWN0LmVudHJpZXMoaW5pdGlhbFN0YXRlLnNuYXBzaG90IHx8IHt9KSk7XG4gIGNvbnN0IHdvcmtlclN1YnNjcmliZXJzID0gbmV3IE1hcCgpO1xuICBjb25zdCB0aGVtZVN1YnNjcmliZXJzID0gbmV3IFNldCgpO1xuICBjb25zdCBicm93c2VyU2lkZWJhclNuYXBzaG90cyA9IG5ldyBNYXAoKTtcbiAgY29uc3QgYnJvd3NlclNpZGViYXJTZWVkZWRMb2NhbFNlcnZlcnMgPSBuZXcgU2V0KCk7XG4gIGxldCBzeXN0ZW1UaGVtZVZhcmlhbnQgPSBpbml0aWFsU3RhdGUuc3lzdGVtVGhlbWVWYXJpYW50IHx8IFwibGlnaHRcIjtcblxuICB3aW5kb3cuX19jb2RleHBwQnJvd3NlclVpID0gdHJ1ZTtcbiAgaW5zdGFsbEJyb3dzZXJVaVdlYnZpZXdTaGltKCk7XG5cbiAgY29uc3QgY29udHJvbCA9IG5ldyBXZWJTb2NrZXQobmV3IFVSTChcIi9jb2RleHBwL2Jyb3dzZXItdWkvY29udHJvbFwiLCBsb2NhdGlvbi5ocmVmKSk7XG4gIGNvbnRyb2wuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgKGV2ZW50KSA9PiB7XG4gICAgbGV0IHBheWxvYWQ7XG4gICAgdHJ5IHsgcGF5bG9hZCA9IEpTT04ucGFyc2UoZXZlbnQuZGF0YSk7IH0gY2F0Y2ggeyByZXR1cm47IH1cbiAgICBpZiAocGF5bG9hZC50eXBlID09PSBcIm1lc3NhZ2UtZm9yLXZpZXdcIikge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IHBheWxvYWQubWVzc2FnZTtcbiAgICAgIGlmIChtZXNzYWdlICYmIG1lc3NhZ2UudHlwZSA9PT0gXCJzaGFyZWQtb2JqZWN0LXVwZGF0ZWRcIikge1xuICAgICAgICBpZiAobWVzc2FnZS52YWx1ZSA9PT0gdW5kZWZpbmVkKSBzbmFwc2hvdC5kZWxldGUobWVzc2FnZS5rZXkpO1xuICAgICAgICBlbHNlIHNuYXBzaG90LnNldChtZXNzYWdlLmtleSwgbWVzc2FnZS52YWx1ZSk7XG4gICAgICB9XG4gICAgICByZW1lbWJlckJyb3dzZXJTaWRlYmFySG9zdE1lc3NhZ2UobWVzc2FnZSk7XG4gICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgTWVzc2FnZUV2ZW50KFwibWVzc2FnZVwiLCB7IGRhdGE6IG1lc3NhZ2UgfSkpO1xuICAgIH0gZWxzZSBpZiAocGF5bG9hZC50eXBlID09PSBcIndvcmtlci1tZXNzYWdlXCIpIHtcbiAgICAgIGNvbnN0IHN1YnMgPSB3b3JrZXJTdWJzY3JpYmVycy5nZXQocGF5bG9hZC53b3JrZXJJZCk7XG4gICAgICBpZiAoc3VicykgZm9yIChjb25zdCBmbiBvZiBbLi4uc3Vic10pIGZuKHBheWxvYWQubWVzc2FnZSk7XG4gICAgfSBlbHNlIGlmIChwYXlsb2FkLnR5cGUgPT09IFwic3lzdGVtLXRoZW1lLXZhcmlhbnQtdXBkYXRlZFwiKSB7XG4gICAgICBzeXN0ZW1UaGVtZVZhcmlhbnQgPSBwYXlsb2FkLnZhbHVlO1xuICAgICAgZm9yIChjb25zdCBmbiBvZiBbLi4udGhlbWVTdWJzY3JpYmVyc10pIGZuKCk7XG4gICAgfVxuICB9KTtcblxuICBhc3luYyBmdW5jdGlvbiBicmlkZ2UobWV0aG9kLCBhcmdzID0gW10pIHtcbiAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaChcIi9jb2RleHBwL2Jyb3dzZXItdWkvYnJpZGdlXCIsIHtcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7IFwiY29udGVudC10eXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IG1ldGhvZCwgYXJncyB9KSxcbiAgICB9KTtcbiAgICBjb25zdCBib2R5ID0gYXdhaXQgcmVzLmpzb24oKTtcbiAgICBpZiAoIWJvZHkub2spIHRocm93IG5ldyBFcnJvcihib2R5LmVycm9yIHx8IFwiQ29kZXgrKyBicm93c2VyIGJyaWRnZSBmYWlsZWRcIik7XG4gICAgcmV0dXJuIGJvZHkudmFsdWU7XG4gIH1cblxuICBmdW5jdGlvbiBsZWdhY3lCcm93c2VyVGFiSWQoY29udmVyc2F0aW9uSWQpIHtcbiAgICByZXR1cm4gU3RyaW5nKGNvbnZlcnNhdGlvbklkIHx8IFwibmV3LWNvbnZlcnNhdGlvblwiKSArIFwiOmxlZ2FjeVwiO1xuICB9XG5cbiAgZnVuY3Rpb24gYnJvd3NlclNpZGViYXJLZXkoY29udmVyc2F0aW9uSWQsIGJyb3dzZXJUYWJJZCkge1xuICAgIHJldHVybiBTdHJpbmcoY29udmVyc2F0aW9uSWQgfHwgXCJuZXctY29udmVyc2F0aW9uXCIpICsgXCI6OlwiICsgU3RyaW5nKGJyb3dzZXJUYWJJZCB8fCBsZWdhY3lCcm93c2VyVGFiSWQoY29udmVyc2F0aW9uSWQpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZUJyb3dzZXJVcmwodmFsdWUpIHtcbiAgICBjb25zdCByYXcgPSBTdHJpbmcodmFsdWUgfHwgXCJcIikudHJpbSgpO1xuICAgIGlmICghcmF3KSByZXR1cm4gXCJcIjtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIG5ldyBVUkwocmF3KS5ocmVmO1xuICAgIH0gY2F0Y2gge31cbiAgICBpZiAoL15bYS16QS1aXVthLXpBLVowLTkrLi1dKjovLnRlc3QocmF3KSkgcmV0dXJuIHJhdztcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIG5ldyBVUkwoXCJodHRwczovL1wiICsgcmF3KS5ocmVmO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIHJhdztcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBicm93c2VyVGl0bGVGb3JVcmwodXJsKSB7XG4gICAgaWYgKCF1cmwpIHJldHVybiBcIk5ldyB0YWJcIjtcbiAgICB0cnkge1xuICAgICAgY29uc3QgaG9zdCA9IG5ldyBVUkwodXJsKS5ob3N0bmFtZS5yZXBsYWNlKC9ed3d3XFxcXC4vLCBcIlwiKTtcbiAgICAgIHJldHVybiBob3N0IHx8IHVybDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbWFrZUJyb3dzZXJTaWRlYmFyU25hcHNob3QodXJsLCBwYXRjaCA9IHt9KSB7XG4gICAgY29uc3Qgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZUJyb3dzZXJVcmwodXJsKTtcbiAgICByZXR1cm4ge1xuICAgICAgdGFiVHlwZTogbm9ybWFsaXplZCA/IFwid2ViXCIgOiBcIm5ldy10YWItcGFnZVwiLFxuICAgICAgaXNTdXNwZW5kZWQ6IGZhbHNlLFxuICAgICAgdGl0bGU6IG5vcm1hbGl6ZWQgPyBicm93c2VyVGl0bGVGb3JVcmwobm9ybWFsaXplZCkgOiBcIk5ldyB0YWJcIixcbiAgICAgIHVybDogbm9ybWFsaXplZCxcbiAgICAgIGZhdmljb25Vcmw6IG51bGwsXG4gICAgICBpc0xvYWRpbmc6IGZhbHNlLFxuICAgICAgY2FuR29CYWNrOiBmYWxzZSxcbiAgICAgIGNhbkdvRm9yd2FyZDogZmFsc2UsXG4gICAgICB6b29tUGVyY2VudDogMTAwLFxuICAgICAgY29tbWVudE1vZGVEaXNhYmxlZFJlYXNvbjogbnVsbCxcbiAgICAgIGludGVyYWN0aW9uTW9kZTogXCJicm93c2VcIixcbiAgICAgIGFubm90YXRpb25FZGl0b3JNb2RlOiBcImNvbW1lbnRcIixcbiAgICAgIGlzQW5ub3RhdGlvbkFkZE1vZGlmaWVyUHJlc3NlZDogZmFsc2UsXG4gICAgICBpc09yaWdpbmFsVmlld0VuYWJsZWQ6IGZhbHNlLFxuICAgICAgaXNUd2Vha3NFZGl0b3JPcGVuOiBmYWxzZSxcbiAgICAgIGNvbW1lbnRzOiBbXSxcbiAgICAgIC4uLnBhdGNoLFxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBkaXNwYXRjaEJyb3dzZXJTaWRlYmFyTWVzc2FnZShtZXNzYWdlKSB7XG4gICAgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IE1lc3NhZ2VFdmVudChcIm1lc3NhZ2VcIiwgeyBkYXRhOiBtZXNzYWdlIH0pKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNlZWRCcm93c2VyU2lkZWJhckxvY2FsU2VydmVycyhjb252ZXJzYXRpb25JZCkge1xuICAgIGlmICghY29udmVyc2F0aW9uSWQgfHwgYnJvd3NlclNpZGViYXJTZWVkZWRMb2NhbFNlcnZlcnMuaGFzKGNvbnZlcnNhdGlvbklkKSkgcmV0dXJuO1xuICAgIGJyb3dzZXJTaWRlYmFyU2VlZGVkTG9jYWxTZXJ2ZXJzLmFkZChjb252ZXJzYXRpb25JZCk7XG4gICAgcXVldWVNaWNyb3Rhc2soKCkgPT4ge1xuICAgICAgZGlzcGF0Y2hCcm93c2VyU2lkZWJhck1lc3NhZ2Uoe1xuICAgICAgICB0eXBlOiBcImJyb3dzZXItc2lkZWJhci1sb2NhbC1zZXJ2ZXJzXCIsXG4gICAgICAgIGNvbnZlcnNhdGlvbklkLFxuICAgICAgICBzdGF0ZTogeyBpc0xvYWRpbmc6IGZhbHNlLCBzZXJ2ZXJzOiBbXSwgaGlkZGVuU2VydmVyczogW10gfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtZW1iZXJCcm93c2VyU2lkZWJhckhvc3RNZXNzYWdlKG1lc3NhZ2UpIHtcbiAgICBpZiAoIW1lc3NhZ2UgfHwgdHlwZW9mIG1lc3NhZ2UgIT09IFwib2JqZWN0XCIpIHJldHVybjtcbiAgICBpZiAobWVzc2FnZS50eXBlID09PSBcImJyb3dzZXItc2lkZWJhci1zdGF0ZVwiKSB7XG4gICAgICBjb25zdCBjb252ZXJzYXRpb25JZCA9IG1lc3NhZ2UuY29udmVyc2F0aW9uSWQ7XG4gICAgICBpZiAoIWNvbnZlcnNhdGlvbklkIHx8ICFtZXNzYWdlLnNuYXBzaG90KSByZXR1cm47XG4gICAgICBicm93c2VyU2lkZWJhclNuYXBzaG90cy5zZXQoYnJvd3NlclNpZGViYXJLZXkoY29udmVyc2F0aW9uSWQsIG1lc3NhZ2UuYnJvd3NlclRhYklkKSwgbWVzc2FnZS5zbmFwc2hvdCk7XG4gICAgfSBlbHNlIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiYnJvd3Nlci1zaWRlYmFyLWxvY2FsLXNlcnZlcnNcIikge1xuICAgICAgaWYgKG1lc3NhZ2UuY29udmVyc2F0aW9uSWQpIGJyb3dzZXJTaWRlYmFyU2VlZGVkTG9jYWxTZXJ2ZXJzLmFkZChtZXNzYWdlLmNvbnZlcnNhdGlvbklkKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzZW5kQnJvd3NlclNpZGViYXJTbmFwc2hvdChjb252ZXJzYXRpb25JZCwgYnJvd3NlclRhYklkLCBzbmFwc2hvdFBhdGNoKSB7XG4gICAgaWYgKCFjb252ZXJzYXRpb25JZCkgcmV0dXJuO1xuICAgIGNvbnN0IGtleSA9IGJyb3dzZXJTaWRlYmFyS2V5KGNvbnZlcnNhdGlvbklkLCBicm93c2VyVGFiSWQpO1xuICAgIGNvbnN0IHByZXZpb3VzID0gYnJvd3NlclNpZGViYXJTbmFwc2hvdHMuZ2V0KGtleSkgfHwgbWFrZUJyb3dzZXJTaWRlYmFyU25hcHNob3QoXCJcIik7XG4gICAgY29uc3QgbmV4dCA9IHsgLi4ucHJldmlvdXMsIC4uLnNuYXBzaG90UGF0Y2ggfTtcbiAgICBicm93c2VyU2lkZWJhclNuYXBzaG90cy5zZXQoa2V5LCBuZXh0KTtcbiAgICBkaXNwYXRjaEJyb3dzZXJTaWRlYmFyTWVzc2FnZSh7XG4gICAgICB0eXBlOiBcImJyb3dzZXItc2lkZWJhci1zdGF0ZVwiLFxuICAgICAgY29udmVyc2F0aW9uSWQsXG4gICAgICAuLi4oYnJvd3NlclRhYklkID8geyBicm93c2VyVGFiSWQgfSA6IHt9KSxcbiAgICAgIHNuYXBzaG90OiBuZXh0LFxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0QnJvd3NlclNpZGViYXJVcmwoY29udmVyc2F0aW9uSWQsIGJyb3dzZXJUYWJJZCwgdXJsLCBpc0xvYWRpbmcgPSBmYWxzZSkge1xuICAgIGNvbnN0IG5vcm1hbGl6ZWQgPSBub3JtYWxpemVCcm93c2VyVXJsKHVybCk7XG4gICAgc2VuZEJyb3dzZXJTaWRlYmFyU25hcHNob3QoY29udmVyc2F0aW9uSWQsIGJyb3dzZXJUYWJJZCwgbWFrZUJyb3dzZXJTaWRlYmFyU25hcHNob3Qobm9ybWFsaXplZCwgeyBpc0xvYWRpbmcgfSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gZmluZEJyb3dzZXJTaWRlYmFyRnJhbWUoY29udmVyc2F0aW9uSWQsIGJyb3dzZXJUYWJJZCkge1xuICAgIGNvbnN0IHNlbGVjdG9yID0gXCJbZGF0YS1icm93c2VyLXNpZGViYXItY29udmVyc2F0aW9uLWlkPSdcIiArIGNzc0VzY2FwZShjb252ZXJzYXRpb25JZCkgKyBcIiddW2RhdGEtYnJvd3Nlci1zaWRlYmFyLWJyb3dzZXItdGFiLWlkPSdcIiArIGNzc0VzY2FwZShicm93c2VyVGFiSWQgfHwgbGVnYWN5QnJvd3NlclRhYklkKGNvbnZlcnNhdGlvbklkKSkgKyBcIiddXCI7XG4gICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3NzRXNjYXBlKHZhbHVlKSB7XG4gICAgaWYgKHdpbmRvdy5DU1MgJiYgdHlwZW9mIHdpbmRvdy5DU1MuZXNjYXBlID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiB3aW5kb3cuQ1NTLmVzY2FwZShTdHJpbmcodmFsdWUpKTtcbiAgICByZXR1cm4gU3RyaW5nKHZhbHVlKS5yZXBsYWNlKC9bJ1xcXFxcXFxcXS9nLCBcIlxcXFxcXFxcJCZcIik7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVCcm93c2VyU2lkZWJhclZpZXdNZXNzYWdlKG1lc3NhZ2UpIHtcbiAgICBpZiAoIW1lc3NhZ2UgfHwgdHlwZW9mIG1lc3NhZ2UgIT09IFwib2JqZWN0XCIpIHJldHVybjtcbiAgICBpZiAobWVzc2FnZS50eXBlID09PSBcImJyb3dzZXItc2lkZWJhci1zeW5jXCIpIHtcbiAgICAgIGNvbnN0IHBheWxvYWQgPSBtZXNzYWdlLnBheWxvYWQgfHwge307XG4gICAgICBzZWVkQnJvd3NlclNpZGViYXJMb2NhbFNlcnZlcnMocGF5bG9hZC5jb252ZXJzYXRpb25JZCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiYnJvd3Nlci1zaWRlYmFyLW93bmVyLXN5bmNcIikge1xuICAgICAgc2VlZEJyb3dzZXJTaWRlYmFyTG9jYWxTZXJ2ZXJzKG1lc3NhZ2UuY29udmVyc2F0aW9uSWQpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAobWVzc2FnZS50eXBlICE9PSBcImJyb3dzZXItc2lkZWJhci1jb21tYW5kXCIpIHJldHVybjtcblxuICAgIGNvbnN0IGNvbnZlcnNhdGlvbklkID0gbWVzc2FnZS5jb252ZXJzYXRpb25JZDtcbiAgICBjb25zdCBicm93c2VyVGFiSWQgPSBtZXNzYWdlLmJyb3dzZXJUYWJJZDtcbiAgICBjb25zdCBjb21tYW5kID0gbWVzc2FnZS5jb21tYW5kIHx8IHt9O1xuICAgIHNlZWRCcm93c2VyU2lkZWJhckxvY2FsU2VydmVycyhjb252ZXJzYXRpb25JZCk7XG5cbiAgICBpZiAoY29tbWFuZC50eXBlID09PSBcIm5hdmlnYXRlXCIpIHtcbiAgICAgIGNvbnN0IG5vcm1hbGl6ZWQgPSBub3JtYWxpemVCcm93c2VyVXJsKGNvbW1hbmQudXJsKTtcbiAgICAgIHNldEJyb3dzZXJTaWRlYmFyVXJsKGNvbnZlcnNhdGlvbklkLCBicm93c2VyVGFiSWQsIG5vcm1hbGl6ZWQsIHRydWUpO1xuICAgICAgcXVldWVNaWNyb3Rhc2soKCkgPT4ge1xuICAgICAgICBjb25zdCBmcmFtZSA9IGZpbmRCcm93c2VyU2lkZWJhckZyYW1lKGNvbnZlcnNhdGlvbklkLCBicm93c2VyVGFiSWQpO1xuICAgICAgICBpZiAoIWZyYW1lIHx8ICFub3JtYWxpemVkIHx8IGZyYW1lLmdldFVSTD8uKCkgPT09IG5vcm1hbGl6ZWQpIHJldHVybjtcbiAgICAgICAgZnJhbWUubG9hZFVSTD8uKG5vcm1hbGl6ZWQpO1xuICAgICAgfSk7XG4gICAgICB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiBzZXRCcm93c2VyU2lkZWJhclVybChjb252ZXJzYXRpb25JZCwgYnJvd3NlclRhYklkLCBub3JtYWxpemVkLCBmYWxzZSksIDUwMCk7XG4gICAgfSBlbHNlIGlmIChjb21tYW5kLnR5cGUgPT09IFwicmVsb2FkXCIpIHtcbiAgICAgIGNvbnN0IGZyYW1lID0gZmluZEJyb3dzZXJTaWRlYmFyRnJhbWUoY29udmVyc2F0aW9uSWQsIGJyb3dzZXJUYWJJZCk7XG4gICAgICBmcmFtZT8ucmVsb2FkPy4oKTtcbiAgICAgIGNvbnN0IGN1cnJlbnQgPSBicm93c2VyU2lkZWJhclNuYXBzaG90cy5nZXQoYnJvd3NlclNpZGViYXJLZXkoY29udmVyc2F0aW9uSWQsIGJyb3dzZXJUYWJJZCkpO1xuICAgICAgaWYgKGN1cnJlbnQ/LnVybCkge1xuICAgICAgICBzZW5kQnJvd3NlclNpZGViYXJTbmFwc2hvdChjb252ZXJzYXRpb25JZCwgYnJvd3NlclRhYklkLCB7IC4uLmN1cnJlbnQsIGlzTG9hZGluZzogdHJ1ZSB9KTtcbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQoKCkgPT4gc2VuZEJyb3dzZXJTaWRlYmFyU25hcHNob3QoY29udmVyc2F0aW9uSWQsIGJyb3dzZXJUYWJJZCwgeyAuLi5jdXJyZW50LCBpc0xvYWRpbmc6IGZhbHNlIH0pLCAyNTApO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY29tbWFuZC50eXBlID09PSBcImdvLWJhY2tcIikge1xuICAgICAgZmluZEJyb3dzZXJTaWRlYmFyRnJhbWUoY29udmVyc2F0aW9uSWQsIGJyb3dzZXJUYWJJZCk/LmdvQmFjaz8uKCk7XG4gICAgfSBlbHNlIGlmIChjb21tYW5kLnR5cGUgPT09IFwiZ28tZm9yd2FyZFwiKSB7XG4gICAgICBmaW5kQnJvd3NlclNpZGViYXJGcmFtZShjb252ZXJzYXRpb25JZCwgYnJvd3NlclRhYklkKT8uZ29Gb3J3YXJkPy4oKTtcbiAgICB9IGVsc2UgaWYgKGNvbW1hbmQudHlwZSA9PT0gXCJzdG9wXCIpIHtcbiAgICAgIGNvbnN0IGN1cnJlbnQgPSBicm93c2VyU2lkZWJhclNuYXBzaG90cy5nZXQoYnJvd3NlclNpZGViYXJLZXkoY29udmVyc2F0aW9uSWQsIGJyb3dzZXJUYWJJZCkpO1xuICAgICAgaWYgKGN1cnJlbnQpIHNlbmRCcm93c2VyU2lkZWJhclNuYXBzaG90KGNvbnZlcnNhdGlvbklkLCBicm93c2VyVGFiSWQsIHsgLi4uY3VycmVudCwgaXNMb2FkaW5nOiBmYWxzZSB9KTtcbiAgICB9IGVsc2UgaWYgKGNvbW1hbmQudHlwZSA9PT0gXCJyZXNldFwiIHx8IGNvbW1hbmQudHlwZSA9PT0gXCJjbG9zZS10YWJcIikge1xuICAgICAgc2VuZEJyb3dzZXJTaWRlYmFyU25hcHNob3QoY29udmVyc2F0aW9uSWQsIGJyb3dzZXJUYWJJZCwgbWFrZUJyb3dzZXJTaWRlYmFyU25hcHNob3QoXCJcIikpO1xuICAgIH1cbiAgfVxuXG4gIHdpbmRvdy5jb2RleFdpbmRvd1R5cGUgPSBcImVsZWN0cm9uXCI7XG4gIHdpbmRvdy5lbGVjdHJvbkJyaWRnZSA9IHtcbiAgICB3aW5kb3dUeXBlOiBcImVsZWN0cm9uXCIsXG4gICAgc2VuZE1lc3NhZ2VGcm9tVmlldzogKG1lc3NhZ2UpID0+IHtcbiAgICAgIGlmIChtZXNzYWdlICYmIG1lc3NhZ2UudHlwZSA9PT0gXCJzaGFyZWQtb2JqZWN0LXNldFwiKSBzbmFwc2hvdC5zZXQobWVzc2FnZS5rZXksIG1lc3NhZ2UudmFsdWUpO1xuICAgICAgaGFuZGxlQnJvd3NlclNpZGViYXJWaWV3TWVzc2FnZShtZXNzYWdlKTtcbiAgICAgIHJldHVybiBicmlkZ2UoXCJzZW5kTWVzc2FnZUZyb21WaWV3XCIsIFttZXNzYWdlXSk7XG4gICAgfSxcbiAgICBnZXRQYXRoRm9yRmlsZTogKCkgPT4gbnVsbCxcbiAgICBzZW5kV29ya2VyTWVzc2FnZUZyb21WaWV3OiAod29ya2VySWQsIG1lc3NhZ2UpID0+IGJyaWRnZShcInNlbmRXb3JrZXJNZXNzYWdlRnJvbVZpZXdcIiwgW3dvcmtlcklkLCBtZXNzYWdlXSksXG4gICAgc3Vic2NyaWJlVG9Xb3JrZXJNZXNzYWdlczogKHdvcmtlcklkLCBoYW5kbGVyKSA9PiB7XG4gICAgICBsZXQgc3VicyA9IHdvcmtlclN1YnNjcmliZXJzLmdldCh3b3JrZXJJZCk7XG4gICAgICBpZiAoIXN1YnMpIHtcbiAgICAgICAgc3VicyA9IG5ldyBTZXQoKTtcbiAgICAgICAgd29ya2VyU3Vic2NyaWJlcnMuc2V0KHdvcmtlcklkLCBzdWJzKTtcbiAgICAgICAgYnJpZGdlKFwic3Vic2NyaWJlV29ya2VyTWVzc2FnZXNcIiwgW3dvcmtlcklkXSkuY2F0Y2goY29uc29sZS5lcnJvcik7XG4gICAgICB9XG4gICAgICBzdWJzLmFkZChoYW5kbGVyKTtcbiAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGN1cnJlbnQgPSB3b3JrZXJTdWJzY3JpYmVycy5nZXQod29ya2VySWQpO1xuICAgICAgICBpZiAoIWN1cnJlbnQpIHJldHVybjtcbiAgICAgICAgY3VycmVudC5kZWxldGUoaGFuZGxlcik7XG4gICAgICAgIGlmIChjdXJyZW50LnNpemUgPT09IDApIHtcbiAgICAgICAgICB3b3JrZXJTdWJzY3JpYmVycy5kZWxldGUod29ya2VySWQpO1xuICAgICAgICAgIGJyaWRnZShcInVuc3Vic2NyaWJlV29ya2VyTWVzc2FnZXNcIiwgW3dvcmtlcklkXSkuY2F0Y2goY29uc29sZS5lcnJvcik7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfSxcbiAgICBzaG93Q29udGV4dE1lbnU6IChpdGVtcykgPT4gYnJpZGdlKFwic2hvd0NvbnRleHRNZW51XCIsIFtpdGVtc10pLFxuICAgIHNob3dBcHBsaWNhdGlvbk1lbnU6IChtZW51SWQsIHgsIHkpID0+IGJyaWRnZShcInNob3dBcHBsaWNhdGlvbk1lbnVcIiwgW21lbnVJZCwgeCwgeV0pLFxuICAgIGdldEZhc3RNb2RlUm9sbG91dE1ldHJpY3M6IChwYXJhbXMpID0+IGJyaWRnZShcImdldEZhc3RNb2RlUm9sbG91dE1ldHJpY3NcIiwgW3BhcmFtc10pLFxuICAgIGdldFNoYXJlZE9iamVjdFNuYXBzaG90VmFsdWU6IChrZXkpID0+IHNuYXBzaG90LmdldChrZXkpLFxuICAgIGdldFN5c3RlbVRoZW1lVmFyaWFudDogKCkgPT4gc3lzdGVtVGhlbWVWYXJpYW50LFxuICAgIHN1YnNjcmliZVRvU3lzdGVtVGhlbWVWYXJpYW50OiAoaGFuZGxlcikgPT4ge1xuICAgICAgdGhlbWVTdWJzY3JpYmVycy5hZGQoaGFuZGxlcik7XG4gICAgICByZXR1cm4gKCkgPT4gdGhlbWVTdWJzY3JpYmVycy5kZWxldGUoaGFuZGxlcik7XG4gICAgfSxcbiAgICB0cmlnZ2VyU2VudHJ5VGVzdEVycm9yOiAoKSA9PiBicmlkZ2UoXCJ0cmlnZ2VyU2VudHJ5VGVzdEVycm9yXCIsIFtdKSxcbiAgICBnZXRTZW50cnlJbml0T3B0aW9uczogKCkgPT4gbnVsbCxcbiAgICBnZXRBcHBTZXNzaW9uSWQ6ICgpID0+IG51bGwsXG4gICAgZ2V0QnVpbGRGbGF2b3I6ICgpID0+IGluaXRpYWxTdGF0ZS5idWlsZEZsYXZvcixcbiAgICBpc0ludGVsTWFjQnVpbGQ6ICgpID0+IGluaXRpYWxTdGF0ZS5wbGF0Zm9ybSA9PT0gXCJkYXJ3aW5cIiAmJiBpbml0aWFsU3RhdGUuYXJjaCA9PT0gXCJ4NjRcIixcbiAgICB1c2VzT3dsQXBwU2hlbGw6ICgpID0+IGluaXRpYWxTdGF0ZS51c2VzT3dsQXBwU2hlbGwsXG4gIH07XG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIChldmVudCkgPT4ge1xuICAgIGlmIChldmVudC5zb3VyY2UgIT09IHdpbmRvdyB8fCAhZXZlbnQuZGF0YSB8fCBldmVudC5kYXRhLnR5cGUgIT09IFwiY29ubmVjdC1hcHAtaG9zdFwiKSByZXR1cm47XG4gICAgY29uc3QgcG9ydCA9IGV2ZW50LmRhdGEucG9ydDtcbiAgICBpZiAoIXBvcnQpIHJldHVybjtcbiAgICBjb25zdCB3cyA9IG5ldyBXZWJTb2NrZXQobmV3IFVSTChcIi9jb2RleHBwL2Jyb3dzZXItdWkvcnBjXCIsIGxvY2F0aW9uLmhyZWYpKTtcbiAgICB3cy5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCAobWVzc2FnZSkgPT4gcG9ydC5wb3N0TWVzc2FnZShtZXNzYWdlLmRhdGEpKTtcbiAgICB3cy5hZGRFdmVudExpc3RlbmVyKFwiY2xvc2VcIiwgKCkgPT4ge1xuICAgICAgdHJ5IHsgcG9ydC5wb3N0TWVzc2FnZShudWxsKTsgfSBjYXRjaCB7fVxuICAgICAgdHJ5IHsgcG9ydC5jbG9zZSgpOyB9IGNhdGNoIHt9XG4gICAgfSk7XG4gICAgd3MuYWRkRXZlbnRMaXN0ZW5lcihcIm9wZW5cIiwgKCkgPT4ge1xuICAgICAgcG9ydC5vbm1lc3NhZ2UgPSAobWVzc2FnZSkgPT4ge1xuICAgICAgICBpZiAobWVzc2FnZS5kYXRhID09IG51bGwpIHtcbiAgICAgICAgICB3cy5jbG9zZSgpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB3cy5zZW5kKG1lc3NhZ2UuZGF0YSk7XG4gICAgICB9O1xuICAgICAgcG9ydC5zdGFydCAmJiBwb3J0LnN0YXJ0KCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGluc3RhbGxCcm93c2VyVWlXZWJ2aWV3U2hpbSgpIHtcbiAgICBpZiAod2luZG93Ll9fY29kZXhwcFdlYnZpZXdTaGltSW5zdGFsbGVkKSByZXR1cm47XG4gICAgd2luZG93Ll9fY29kZXhwcFdlYnZpZXdTaGltSW5zdGFsbGVkID0gdHJ1ZTtcbiAgICBjb25zdCBvcmlnaW5hbENyZWF0ZUVsZW1lbnQgPSBEb2N1bWVudC5wcm90b3R5cGUuY3JlYXRlRWxlbWVudDtcbiAgICBEb2N1bWVudC5wcm90b3R5cGUuY3JlYXRlRWxlbWVudCA9IGZ1bmN0aW9uKHRhZ05hbWUsIG9wdGlvbnMpIHtcbiAgICAgIGlmIChTdHJpbmcodGFnTmFtZSkudG9Mb3dlckNhc2UoKSAhPT0gXCJ3ZWJ2aWV3XCIpIHtcbiAgICAgICAgcmV0dXJuIG9yaWdpbmFsQ3JlYXRlRWxlbWVudC5jYWxsKHRoaXMsIHRhZ05hbWUsIG9wdGlvbnMpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNyZWF0ZVdlYnZpZXdJZnJhbWUodGhpcyk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGNyZWF0ZVdlYnZpZXdJZnJhbWUoZG9jKSB7XG4gICAgICBjb25zdCBpZnJhbWUgPSBvcmlnaW5hbENyZWF0ZUVsZW1lbnQuY2FsbChkb2MsIFwiaWZyYW1lXCIpO1xuICAgICAgaWZyYW1lLmRhdGFzZXQuY29kZXhwcFdlYnZpZXdTaGltID0gXCJ0cnVlXCI7XG4gICAgICBpZnJhbWUuc3R5bGUuYm9yZGVyID0gXCIwXCI7XG4gICAgICBpZnJhbWUuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcbiAgICAgIGlmcmFtZS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBcIiNmZmZcIjtcbiAgICAgIGlmcmFtZS5zZXRBdHRyaWJ1dGUoXCJhbGxvd1wiLCBcImF1dG9wbGF5OyBjbGlwYm9hcmQtcmVhZDsgY2xpcGJvYXJkLXdyaXRlOyBkaXNwbGF5LWNhcHR1cmU7IGZ1bGxzY3JlZW47IG1pY3JvcGhvbmU7IGNhbWVyYVwiKTtcbiAgICAgIGNvbnN0IG5hdGl2ZVNldEF0dHJpYnV0ZSA9IGlmcmFtZS5zZXRBdHRyaWJ1dGUuYmluZChpZnJhbWUpO1xuICAgICAgY29uc3QgbmF0aXZlR2V0QXR0cmlidXRlID0gaWZyYW1lLmdldEF0dHJpYnV0ZS5iaW5kKGlmcmFtZSk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShpZnJhbWUsIFwidGFnTmFtZVwiLCB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSwgZ2V0OiAoKSA9PiBcIldFQlZJRVdcIiB9KTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGlmcmFtZSwgXCJub2RlTmFtZVwiLCB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSwgZ2V0OiAoKSA9PiBcIldFQlZJRVdcIiB9KTtcbiAgICAgIH0gY2F0Y2gge31cblxuICAgICAgY29uc3QgZW1pdCA9ICh0eXBlLCBleHRyYSA9IHt9KSA9PiB7XG4gICAgICAgIGNvbnN0IGV2ZW50ID0gbmV3IEV2ZW50KHR5cGUpO1xuICAgICAgICBPYmplY3QuYXNzaWduKGV2ZW50LCBleHRyYSk7XG4gICAgICAgIGlmcmFtZS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgIH07XG4gICAgICBjb25zdCBjdXJyZW50VXJsID0gKCkgPT4gaWZyYW1lLmRhdGFzZXQuY29kZXhwcFJlcXVlc3RlZFNyYyB8fCBuYXRpdmVHZXRBdHRyaWJ1dGUoXCJzcmNcIikgfHwgXCJhYm91dDpibGFua1wiO1xuICAgICAgY29uc3QgYWN0dWFsRnJhbWVVcmwgPSAodXJsKSA9PiB7XG4gICAgICAgIGNvbnN0IHJlcXVlc3RlZCA9IFN0cmluZyh1cmwgfHwgXCJhYm91dDpibGFua1wiKTtcbiAgICAgICAgaWYgKCFzaG91bGRCcmVha1JlY3Vyc2l2ZUZyYW1lTG9hZChyZXF1ZXN0ZWQpKSByZXR1cm4gcmVxdWVzdGVkO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IG5leHQgPSBuZXcgVVJMKHJlcXVlc3RlZCwgbG9jYXRpb24uaHJlZik7XG4gICAgICAgICAgbmV4dC5zZWFyY2hQYXJhbXMuc2V0KFwiX19jb2RleHBwX2ZyYW1lX2RlcHRoXCIsIFN0cmluZyhmcmFtZUFuY2VzdG9yRGVwdGgoKSArIDEpKTtcbiAgICAgICAgICByZXR1cm4gbmV4dC5ocmVmO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICByZXR1cm4gcmVxdWVzdGVkO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgY29uc3Qgc2V0RnJhbWVVcmwgPSAodXJsKSA9PiB7XG4gICAgICAgIGNvbnN0IHJlcXVlc3RlZCA9IFN0cmluZyh1cmwgfHwgXCJhYm91dDpibGFua1wiKTtcbiAgICAgICAgaWZyYW1lLmRhdGFzZXQuY29kZXhwcFJlcXVlc3RlZFNyYyA9IHJlcXVlc3RlZDtcbiAgICAgICAgbmF0aXZlU2V0QXR0cmlidXRlKFwic3JjXCIsIGFjdHVhbEZyYW1lVXJsKHJlcXVlc3RlZCkpO1xuICAgICAgfTtcbiAgICAgIGNvbnN0IG5hdmlnYXRlID0gKHVybCkgPT4ge1xuICAgICAgICBjb25zdCBuZXh0ID0gU3RyaW5nKHVybCB8fCBcImFib3V0OmJsYW5rXCIpO1xuICAgICAgICBlbWl0KFwiZGlkLXN0YXJ0LWxvYWRpbmdcIiwgeyB1cmw6IG5leHQgfSk7XG4gICAgICAgIHNldEZyYW1lVXJsKG5leHQpO1xuICAgICAgfTtcblxuICAgICAgaWZyYW1lLnNldEF0dHJpYnV0ZSA9IChuYW1lLCB2YWx1ZSkgPT4ge1xuICAgICAgICBpZiAoU3RyaW5nKG5hbWUpLnRvTG93ZXJDYXNlKCkgPT09IFwic3JjXCIpIHtcbiAgICAgICAgICBzZXRGcmFtZVVybCh2YWx1ZSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIG5hdGl2ZVNldEF0dHJpYnV0ZShuYW1lLCB2YWx1ZSk7XG4gICAgICB9O1xuXG4gICAgICB0cnkge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoaWZyYW1lLCBcInNyY1wiLCB7XG4gICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICAgIGdldDogKCkgPT4gY3VycmVudFVybCgpLFxuICAgICAgICAgIHNldDogKHZhbHVlKSA9PiBzZXRGcmFtZVVybCh2YWx1ZSksXG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCB7fVxuXG4gICAgICBpZnJhbWUuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgKCkgPT4ge1xuICAgICAgICBjb25zdCB1cmwgPSBjdXJyZW50VXJsKCk7XG4gICAgICAgIGVtaXQoXCJkb20tcmVhZHlcIiwgeyB1cmwgfSk7XG4gICAgICAgIGVtaXQoXCJkaWQtbmF2aWdhdGVcIiwgeyB1cmwgfSk7XG4gICAgICAgIGVtaXQoXCJkaWQtc3RvcC1sb2FkaW5nXCIsIHsgdXJsIH0pO1xuICAgICAgICBlbWl0KFwiZGlkLWZpbmlzaC1sb2FkXCIsIHsgdXJsIH0pO1xuICAgICAgICBsZXQgdGl0bGUgPSBcIlwiO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHRpdGxlID0gaWZyYW1lLmNvbnRlbnREb2N1bWVudD8udGl0bGUgfHwgXCJcIjtcbiAgICAgICAgfSBjYXRjaCB7fVxuICAgICAgICBjb25zdCBjb252ZXJzYXRpb25JZCA9IGlmcmFtZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWJyb3dzZXItc2lkZWJhci1jb252ZXJzYXRpb24taWRcIik7XG4gICAgICAgIGNvbnN0IGJyb3dzZXJUYWJJZCA9IGlmcmFtZS5nZXRBdHRyaWJ1dGUoXCJkYXRhLWJyb3dzZXItc2lkZWJhci1icm93c2VyLXRhYi1pZFwiKTtcbiAgICAgICAgaWYgKGNvbnZlcnNhdGlvbklkKSB7XG4gICAgICAgICAgc2VuZEJyb3dzZXJTaWRlYmFyU25hcHNob3QoY29udmVyc2F0aW9uSWQsIGJyb3dzZXJUYWJJZCwgbWFrZUJyb3dzZXJTaWRlYmFyU25hcHNob3QodXJsLCB7XG4gICAgICAgICAgICB0aXRsZTogdGl0bGUgfHwgYnJvd3NlclRpdGxlRm9yVXJsKHVybCksXG4gICAgICAgICAgICBpc0xvYWRpbmc6IGZhbHNlLFxuICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGl0bGUpIGVtaXQoXCJwYWdlLXRpdGxlLXVwZGF0ZWRcIiwgeyB0aXRsZSB9KTtcbiAgICAgIH0pO1xuICAgICAgaWZyYW1lLmFkZEV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLCAoKSA9PiB7XG4gICAgICAgIGVtaXQoXCJkaWQtZmFpbC1sb2FkXCIsIHsgZXJyb3JDb2RlOiAtMiwgZXJyb3JEZXNjcmlwdGlvbjogXCJpZnJhbWUgbG9hZCBmYWlsZWRcIiwgdmFsaWRhdGVkVVJMOiBjdXJyZW50VXJsKCkgfSk7XG4gICAgICAgIGVtaXQoXCJkaWQtc3RvcC1sb2FkaW5nXCIsIHsgdXJsOiBjdXJyZW50VXJsKCkgfSk7XG4gICAgICB9KTtcblxuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoaWZyYW1lLCB7XG4gICAgICAgIGRlc3Ryb3k6IHsgdmFsdWU6ICgpID0+IGlmcmFtZS5yZW1vdmUoKSB9LFxuICAgICAgICBnZXRVUkw6IHsgdmFsdWU6ICgpID0+IGN1cnJlbnRVcmwoKSB9LFxuICAgICAgICBnZXRUaXRsZToge1xuICAgICAgICAgIHZhbHVlOiAoKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICByZXR1cm4gaWZyYW1lLmNvbnRlbnREb2N1bWVudD8udGl0bGUgfHwgXCJcIjtcbiAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBsb2FkVVJMOiB7IHZhbHVlOiAodXJsKSA9PiB7IG5hdmlnYXRlKHVybCk7IHJldHVybiBQcm9taXNlLnJlc29sdmUoKTsgfSB9LFxuICAgICAgICByZWxvYWQ6IHtcbiAgICAgICAgICB2YWx1ZTogKCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgaWZyYW1lLmNvbnRlbnRXaW5kb3c/LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgIG5hdmlnYXRlKGN1cnJlbnRVcmwoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgc3RvcDogeyB2YWx1ZTogKCkgPT4ge30gfSxcbiAgICAgICAgY2FuR29CYWNrOiB7IHZhbHVlOiAoKSA9PiBmYWxzZSB9LFxuICAgICAgICBjYW5Hb0ZvcndhcmQ6IHsgdmFsdWU6ICgpID0+IGZhbHNlIH0sXG4gICAgICAgIGdvQmFjazoge1xuICAgICAgICAgIHZhbHVlOiAoKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBpZnJhbWUuY29udGVudFdpbmRvdz8uaGlzdG9yeS5iYWNrKCk7XG4gICAgICAgICAgICB9IGNhdGNoIHt9XG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgZ29Gb3J3YXJkOiB7XG4gICAgICAgICAgdmFsdWU6ICgpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGlmcmFtZS5jb250ZW50V2luZG93Py5oaXN0b3J5LmZvcndhcmQoKTtcbiAgICAgICAgICAgIH0gY2F0Y2gge31cbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBleGVjdXRlSmF2YVNjcmlwdDoge1xuICAgICAgICAgIHZhbHVlOiAoY29kZSkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShpZnJhbWUuY29udGVudFdpbmRvdz8uZXZhbChTdHJpbmcoY29kZSkpKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgaW5zZXJ0Q1NTOiB7IHZhbHVlOiAoKSA9PiBQcm9taXNlLnJlc29sdmUoXCJcIikgfSxcbiAgICAgICAgb3BlbkRldlRvb2xzOiB7IHZhbHVlOiAoKSA9PiB7fSB9LFxuICAgICAgICBjbG9zZURldlRvb2xzOiB7IHZhbHVlOiAoKSA9PiB7fSB9LFxuICAgICAgICBpc0RldlRvb2xzT3BlbmVkOiB7IHZhbHVlOiAoKSA9PiBmYWxzZSB9LFxuICAgICAgICBzZW5kOiB7IHZhbHVlOiAoKSA9PiB7fSB9LFxuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiBpZnJhbWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZnJhbWVBbmNlc3RvckRlcHRoKCkge1xuICAgICAgbGV0IGRlcHRoID0gMDtcbiAgICAgIGxldCBjdXJyZW50ID0gd2luZG93O1xuICAgICAgY29uc3Qgc2VlbiA9IG5ldyBTZXQoKTtcbiAgICAgIHdoaWxlIChjdXJyZW50ICYmICFzZWVuLmhhcyhjdXJyZW50KSkge1xuICAgICAgICBzZWVuLmFkZChjdXJyZW50KTtcbiAgICAgICAgbGV0IHBhcmVudDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBwYXJlbnQgPSBjdXJyZW50LnBhcmVudDtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhcmVudCA9PT0gY3VycmVudCkgYnJlYWs7XG4gICAgICAgIGRlcHRoICs9IDE7XG4gICAgICAgIGN1cnJlbnQgPSBwYXJlbnQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gZGVwdGg7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvdWxkQnJlYWtSZWN1cnNpdmVGcmFtZUxvYWQodXJsKSB7XG4gICAgICBsZXQgdGFyZ2V0O1xuICAgICAgdHJ5IHtcbiAgICAgICAgdGFyZ2V0ID0gbmV3IFVSTCh1cmwsIGxvY2F0aW9uLmhyZWYpLmhyZWY7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgbGV0IGN1cnJlbnQgPSB3aW5kb3c7XG4gICAgICBjb25zdCBzZWVuID0gbmV3IFNldCgpO1xuICAgICAgd2hpbGUgKGN1cnJlbnQgJiYgIXNlZW4uaGFzKGN1cnJlbnQpKSB7XG4gICAgICAgIHNlZW4uYWRkKGN1cnJlbnQpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGlmIChuZXcgVVJMKGN1cnJlbnQubG9jYXRpb24uaHJlZikuaHJlZiA9PT0gdGFyZ2V0KSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICBpZiAoY3VycmVudC5wYXJlbnQgPT09IGN1cnJlbnQpIGJyZWFrO1xuICAgICAgICAgIGN1cnJlbnQgPSBjdXJyZW50LnBhcmVudDtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG59KSgpO1xuYDtcbn1cblxuZnVuY3Rpb24gaGlkZVZpc2libGVDb2RleFdpbmRvd3MoKTogdm9pZCB7XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSBcImRhcndpblwiKSB7XG4gICAgdHJ5IHtcbiAgICAgIGFwcC5oaWRlKCk7XG4gICAgfSBjYXRjaCB7fVxuICB9XG4gIGZvciAoY29uc3Qgd2luIG9mIEJyb3dzZXJXaW5kb3cuZ2V0QWxsV2luZG93cygpKSB7XG4gICAgaWYgKHdpbi5pc0Rlc3Ryb3llZCgpKSBjb250aW51ZTtcbiAgICBpZiAoYWN0aXZlSG9zdCAmJiB3aW4ud2ViQ29udGVudHMuaWQgPT09IGFjdGl2ZUhvc3Qud2ViQ29udGVudHMuaWQpIGNvbnRpbnVlO1xuICAgIGlmICghd2luLmlzVmlzaWJsZSgpKSBjb250aW51ZTtcbiAgICB0cnkge1xuICAgICAgd2luLmhpZGUoKTtcbiAgICB9IGNhdGNoIHt9XG4gIH1cbn1cblxuZnVuY3Rpb24gbWFrZVdpbmRvd0xpa2VGb3JWaWV3KHZpZXc6IEVsZWN0cm9uLkJyb3dzZXJWaWV3KTogQ29kZXhXaW5kb3dMaWtlIHtcbiAgY29uc3Qgdmlld0JvdW5kcyA9ICgpID0+IHZpZXcuZ2V0Qm91bmRzKCk7XG4gIHJldHVybiB7XG4gICAgaWQ6IHZpZXcud2ViQ29udGVudHMuaWQsXG4gICAgd2ViQ29udGVudHM6IHZpZXcud2ViQ29udGVudHMsXG4gICAgb246IChldmVudDogXCJjbG9zZWRcIiwgbGlzdGVuZXI6ICgpID0+IHZvaWQpID0+IHtcbiAgICAgIGlmIChldmVudCA9PT0gXCJjbG9zZWRcIikgdmlldy53ZWJDb250ZW50cy5vbmNlKFwiZGVzdHJveWVkXCIsIGxpc3RlbmVyKTtcbiAgICAgIGVsc2Ugdmlldy53ZWJDb250ZW50cy5vbihldmVudCwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHZpZXc7XG4gICAgfSxcbiAgICBvbmNlOiAoZXZlbnQ6IHN0cmluZywgbGlzdGVuZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpID0+IHtcbiAgICAgIHZpZXcud2ViQ29udGVudHMub25jZShldmVudCBhcyBcImRlc3Ryb3llZFwiLCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gdmlldztcbiAgICB9LFxuICAgIG9mZjogKGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKSA9PiB7XG4gICAgICB2aWV3LndlYkNvbnRlbnRzLm9mZihldmVudCBhcyBcImRlc3Ryb3llZFwiLCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gdmlldztcbiAgICB9LFxuICAgIHJlbW92ZUxpc3RlbmVyOiAoZXZlbnQ6IHN0cmluZywgbGlzdGVuZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpID0+IHtcbiAgICAgIHZpZXcud2ViQ29udGVudHMucmVtb3ZlTGlzdGVuZXIoZXZlbnQgYXMgXCJkZXN0cm95ZWRcIiwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHZpZXc7XG4gICAgfSxcbiAgICBpc0Rlc3Ryb3llZDogKCkgPT4gdmlldy53ZWJDb250ZW50cy5pc0Rlc3Ryb3llZCgpLFxuICAgIGlzRm9jdXNlZDogKCkgPT4gdmlldy53ZWJDb250ZW50cy5pc0ZvY3VzZWQoKSxcbiAgICBmb2N1czogKCkgPT4gdmlldy53ZWJDb250ZW50cy5mb2N1cygpLFxuICAgIHNob3c6ICgpID0+IHt9LFxuICAgIGhpZGU6ICgpID0+IHt9LFxuICAgIGdldEJvdW5kczogdmlld0JvdW5kcyxcbiAgICBnZXRDb250ZW50Qm91bmRzOiB2aWV3Qm91bmRzLFxuICAgIGdldFNpemU6ICgpID0+IHtcbiAgICAgIGNvbnN0IGIgPSB2aWV3Qm91bmRzKCk7XG4gICAgICByZXR1cm4gW2Iud2lkdGgsIGIuaGVpZ2h0XTtcbiAgICB9LFxuICAgIGdldENvbnRlbnRTaXplOiAoKSA9PiB7XG4gICAgICBjb25zdCBiID0gdmlld0JvdW5kcygpO1xuICAgICAgcmV0dXJuIFtiLndpZHRoLCBiLmhlaWdodF07XG4gICAgfSxcbiAgICBzZXRUaXRsZTogKCkgPT4ge30sXG4gICAgZ2V0VGl0bGU6ICgpID0+IFwiXCIsXG4gICAgc2V0UmVwcmVzZW50ZWRGaWxlbmFtZTogKCkgPT4ge30sXG4gICAgc2V0RG9jdW1lbnRFZGl0ZWQ6ICgpID0+IHt9LFxuICAgIHNldFdpbmRvd0J1dHRvblZpc2liaWxpdHk6ICgpID0+IHt9LFxuICB9O1xufVxuXG5mdW5jdGlvbiBhY2NlcHRXZWJTb2NrZXQocmVxOiBJbmNvbWluZ01lc3NhZ2UsIHNvY2tldDogU29ja2V0LCBoZWFkOiBCdWZmZXIpOiBXZWJTb2NrZXRDb25uZWN0aW9uIHtcbiAgY29uc3Qga2V5ID0gcmVxLmhlYWRlcnNbXCJzZWMtd2Vic29ja2V0LWtleVwiXTtcbiAgaWYgKHR5cGVvZiBrZXkgIT09IFwic3RyaW5nXCIpIHRocm93IG5ldyBFcnJvcihcIm1pc3NpbmcgU2VjLVdlYlNvY2tldC1LZXlcIik7XG4gIGNvbnN0IGFjY2VwdCA9IGNyZWF0ZUhhc2goXCJzaGExXCIpXG4gICAgLnVwZGF0ZShgJHtrZXl9MjU4RUFGQTUtRTkxNC00N0RBLTk1Q0EtQzVBQjBEQzg1QjExYClcbiAgICAuZGlnZXN0KFwiYmFzZTY0XCIpO1xuICBzb2NrZXQud3JpdGUoXG4gICAgW1xuICAgICAgXCJIVFRQLzEuMSAxMDEgU3dpdGNoaW5nIFByb3RvY29sc1wiLFxuICAgICAgXCJVcGdyYWRlOiB3ZWJzb2NrZXRcIixcbiAgICAgIFwiQ29ubmVjdGlvbjogVXBncmFkZVwiLFxuICAgICAgYFNlYy1XZWJTb2NrZXQtQWNjZXB0OiAke2FjY2VwdH1gLFxuICAgICAgXCJcXHJcXG5cIixcbiAgICBdLmpvaW4oXCJcXHJcXG5cIiksXG4gICk7XG4gIGNvbnN0IHdzID0gbmV3IFdlYlNvY2tldENvbm5lY3Rpb24oc29ja2V0KTtcbiAgaWYgKGhlYWQubGVuZ3RoID4gMCkgd3MuYWNjZXB0SGVhZChoZWFkKTtcbiAgcmV0dXJuIHdzO1xufVxuXG5jbGFzcyBXZWJTb2NrZXRDb25uZWN0aW9uIHtcbiAgcHJpdmF0ZSBidWZmZXIgPSBCdWZmZXIuYWxsb2MoMCk7XG4gIHByaXZhdGUgdGV4dEhhbmRsZXJzID0gbmV3IFNldDwodGV4dDogc3RyaW5nKSA9PiB2b2lkPigpO1xuICBwcml2YXRlIGNsb3NlSGFuZGxlcnMgPSBuZXcgU2V0PCgpID0+IHZvaWQ+KCk7XG4gIHByaXZhdGUgY2xvc2VkID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBzb2NrZXQ6IFNvY2tldCkge1xuICAgIHNvY2tldC5vbihcImRhdGFcIiwgKGNodW5rKSA9PiB0aGlzLmFjY2VwdEhlYWQoY2h1bmspKTtcbiAgICBzb2NrZXQub24oXCJjbG9zZVwiLCAoKSA9PiB0aGlzLmVtaXRDbG9zZSgpKTtcbiAgICBzb2NrZXQub24oXCJlcnJvclwiLCAoKSA9PiB0aGlzLmVtaXRDbG9zZSgpKTtcbiAgfVxuXG4gIGFjY2VwdEhlYWQoY2h1bms6IEJ1ZmZlcik6IHZvaWQge1xuICAgIGlmICh0aGlzLmNsb3NlZCkgcmV0dXJuO1xuICAgIHRoaXMuYnVmZmVyID0gQnVmZmVyLmNvbmNhdChbdGhpcy5idWZmZXIsIGNodW5rXSk7XG4gICAgdGhpcy5yZWFkRnJhbWVzKCk7XG4gIH1cblxuICBvblRleHQoaGFuZGxlcjogKHRleHQ6IHN0cmluZykgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMudGV4dEhhbmRsZXJzLmFkZChoYW5kbGVyKTtcbiAgfVxuXG4gIG9uQ2xvc2UoaGFuZGxlcjogKCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMuY2xvc2VIYW5kbGVycy5hZGQoaGFuZGxlcik7XG4gIH1cblxuICBzZW5kSnNvbihwYXlsb2FkOiB1bmtub3duKTogdm9pZCB7XG4gICAgdGhpcy5zZW5kVGV4dChKU09OLnN0cmluZ2lmeShwYXlsb2FkKSk7XG4gIH1cblxuICBzZW5kVGV4dCh0ZXh0OiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLnNlbmRGcmFtZSgweDEsIEJ1ZmZlci5mcm9tKHRleHQsIFwidXRmOFwiKSk7XG4gIH1cblxuICBjbG9zZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5jbG9zZWQpIHJldHVybjtcbiAgICB0cnkge1xuICAgICAgdGhpcy5zZW5kRnJhbWUoMHg4LCBCdWZmZXIuYWxsb2MoMCkpO1xuICAgIH0gY2F0Y2gge31cbiAgICB0aGlzLmNsb3NlZCA9IHRydWU7XG4gICAgdGhpcy5zb2NrZXQuZW5kKCk7XG4gICAgdGhpcy5lbWl0Q2xvc2UoKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVhZEZyYW1lcygpOiB2b2lkIHtcbiAgICB3aGlsZSAodGhpcy5idWZmZXIubGVuZ3RoID49IDIpIHtcbiAgICAgIGNvbnN0IGZpcnN0ID0gdGhpcy5idWZmZXJbMF0hO1xuICAgICAgY29uc3Qgc2Vjb25kID0gdGhpcy5idWZmZXJbMV0hO1xuICAgICAgY29uc3Qgb3Bjb2RlID0gZmlyc3QgJiAweDBmO1xuICAgICAgY29uc3QgbWFza2VkID0gKHNlY29uZCAmIDB4ODApICE9PSAwO1xuICAgICAgbGV0IGxlbmd0aCA9IHNlY29uZCAmIDB4N2Y7XG4gICAgICBsZXQgb2Zmc2V0ID0gMjtcbiAgICAgIGlmIChsZW5ndGggPT09IDEyNikge1xuICAgICAgICBpZiAodGhpcy5idWZmZXIubGVuZ3RoIDwgb2Zmc2V0ICsgMikgcmV0dXJuO1xuICAgICAgICBsZW5ndGggPSB0aGlzLmJ1ZmZlci5yZWFkVUludDE2QkUob2Zmc2V0KTtcbiAgICAgICAgb2Zmc2V0ICs9IDI7XG4gICAgICB9IGVsc2UgaWYgKGxlbmd0aCA9PT0gMTI3KSB7XG4gICAgICAgIGlmICh0aGlzLmJ1ZmZlci5sZW5ndGggPCBvZmZzZXQgKyA4KSByZXR1cm47XG4gICAgICAgIGNvbnN0IGhpZ2ggPSB0aGlzLmJ1ZmZlci5yZWFkVUludDMyQkUob2Zmc2V0KTtcbiAgICAgICAgY29uc3QgbG93ID0gdGhpcy5idWZmZXIucmVhZFVJbnQzMkJFKG9mZnNldCArIDQpO1xuICAgICAgICBpZiAoaGlnaCAhPT0gMCkge1xuICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbGVuZ3RoID0gbG93O1xuICAgICAgICBvZmZzZXQgKz0gODtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG1hc2tPZmZzZXQgPSBvZmZzZXQ7XG4gICAgICBpZiAobWFza2VkKSBvZmZzZXQgKz0gNDtcbiAgICAgIGlmICh0aGlzLmJ1ZmZlci5sZW5ndGggPCBvZmZzZXQgKyBsZW5ndGgpIHJldHVybjtcblxuICAgICAgY29uc3QgbWFzayA9IG1hc2tlZCA/IHRoaXMuYnVmZmVyLnN1YmFycmF5KG1hc2tPZmZzZXQsIG1hc2tPZmZzZXQgKyA0KSA6IG51bGw7XG4gICAgICBjb25zdCBwYXlsb2FkID0gQnVmZmVyLmZyb20odGhpcy5idWZmZXIuc3ViYXJyYXkob2Zmc2V0LCBvZmZzZXQgKyBsZW5ndGgpKTtcbiAgICAgIHRoaXMuYnVmZmVyID0gdGhpcy5idWZmZXIuc3ViYXJyYXkob2Zmc2V0ICsgbGVuZ3RoKTtcbiAgICAgIGlmIChtYXNrKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGF5bG9hZC5sZW5ndGg7IGkgKz0gMSkgcGF5bG9hZFtpXSBePSBtYXNrW2kgJSA0XSE7XG4gICAgICB9XG5cbiAgICAgIGlmIChvcGNvZGUgPT09IDB4OCkge1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICB9IGVsc2UgaWYgKG9wY29kZSA9PT0gMHg5KSB7XG4gICAgICAgIHRoaXMuc2VuZEZyYW1lKDB4QSwgcGF5bG9hZCk7XG4gICAgICB9IGVsc2UgaWYgKG9wY29kZSA9PT0gMHgxKSB7XG4gICAgICAgIGNvbnN0IHRleHQgPSBwYXlsb2FkLnRvU3RyaW5nKFwidXRmOFwiKTtcbiAgICAgICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIFsuLi50aGlzLnRleHRIYW5kbGVyc10pIGhhbmRsZXIodGV4dCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBzZW5kRnJhbWUob3Bjb2RlOiBudW1iZXIsIHBheWxvYWQ6IEJ1ZmZlcik6IHZvaWQge1xuICAgIGlmICh0aGlzLmNsb3NlZCAmJiBvcGNvZGUgIT09IDB4OCkgcmV0dXJuO1xuICAgIGNvbnN0IGxlbmd0aCA9IHBheWxvYWQubGVuZ3RoO1xuICAgIGxldCBoZWFkZXI6IEJ1ZmZlcjtcbiAgICBpZiAobGVuZ3RoIDwgMTI2KSB7XG4gICAgICBoZWFkZXIgPSBCdWZmZXIuZnJvbShbMHg4MCB8IG9wY29kZSwgbGVuZ3RoXSk7XG4gICAgfSBlbHNlIGlmIChsZW5ndGggPD0gMHhmZmZmKSB7XG4gICAgICBoZWFkZXIgPSBCdWZmZXIuYWxsb2MoNCk7XG4gICAgICBoZWFkZXJbMF0gPSAweDgwIHwgb3Bjb2RlO1xuICAgICAgaGVhZGVyWzFdID0gMTI2O1xuICAgICAgaGVhZGVyLndyaXRlVUludDE2QkUobGVuZ3RoLCAyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaGVhZGVyID0gQnVmZmVyLmFsbG9jKDEwKTtcbiAgICAgIGhlYWRlclswXSA9IDB4ODAgfCBvcGNvZGU7XG4gICAgICBoZWFkZXJbMV0gPSAxMjc7XG4gICAgICBoZWFkZXIud3JpdGVVSW50MzJCRSgwLCAyKTtcbiAgICAgIGhlYWRlci53cml0ZVVJbnQzMkJFKGxlbmd0aCwgNik7XG4gICAgfVxuICAgIHRoaXMuc29ja2V0LndyaXRlKEJ1ZmZlci5jb25jYXQoW2hlYWRlciwgcGF5bG9hZF0pKTtcbiAgfVxuXG4gIHByaXZhdGUgZW1pdENsb3NlKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5jbG9zZWQpIHRoaXMuY2xvc2VkID0gdHJ1ZTtcbiAgICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgWy4uLnRoaXMuY2xvc2VIYW5kbGVyc10pIGhhbmRsZXIoKTtcbiAgICB0aGlzLmNsb3NlSGFuZGxlcnMuY2xlYXIoKTtcbiAgICB0aGlzLnRleHRIYW5kbGVycy5jbGVhcigpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlcXVlc3RVcmwocmVxOiBJbmNvbWluZ01lc3NhZ2UpOiBVUkwgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gbmV3IFVSTChyZXEudXJsID8/IFwiL1wiLCBcImh0dHA6Ly8xMjcuMC4wLjFcIik7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlYWRKc29uQm9keShyZXE6IEluY29taW5nTWVzc2FnZSk6IFByb21pc2U8dW5rbm93bj4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IGNodW5rczogQnVmZmVyW10gPSBbXTtcbiAgICBsZXQgdG90YWwgPSAwO1xuICAgIHJlcS5vbihcImRhdGFcIiwgKGNodW5rOiBCdWZmZXIpID0+IHtcbiAgICAgIHRvdGFsICs9IGNodW5rLmxlbmd0aDtcbiAgICAgIGlmICh0b3RhbCA+IDEwMjQgKiAxMDI0KSB7XG4gICAgICAgIHJlamVjdChuZXcgRXJyb3IoXCJyZXF1ZXN0IGJvZHkgdG9vIGxhcmdlXCIpKTtcbiAgICAgICAgcmVxLmRlc3Ryb3koKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY2h1bmtzLnB1c2goY2h1bmspO1xuICAgIH0pO1xuICAgIHJlcS5vbihcImVuZFwiLCAoKSA9PiB7XG4gICAgICBjb25zdCByYXcgPSBCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoXCJ1dGY4XCIpO1xuICAgICAgaWYgKCFyYXcpIHtcbiAgICAgICAgcmVzb2x2ZShudWxsKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzb2x2ZShKU09OLnBhcnNlKHJhdykpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXEub24oXCJlcnJvclwiLCByZWplY3QpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gc2VuZEpzb24ocmVzOiBTZXJ2ZXJSZXNwb25zZSwgc3RhdHVzOiBudW1iZXIsIGJvZHk6IHVua25vd24pOiB2b2lkIHtcbiAgc2VuZEJ1ZmZlcihyZXMsIHN0YXR1cywgQnVmZmVyLmZyb20oSlNPTi5zdHJpbmdpZnkoYm9keSkpLCBNSU1FX1RZUEVTW1wiLmpzb25cIl0sIGZhbHNlKTtcbn1cblxuZnVuY3Rpb24gc2VuZFRleHQocmVzOiBTZXJ2ZXJSZXNwb25zZSwgc3RhdHVzOiBudW1iZXIsIGJvZHk6IHN0cmluZywgY29udGVudFR5cGU6IHN0cmluZyk6IHZvaWQge1xuICBzZW5kQnVmZmVyKHJlcywgc3RhdHVzLCBCdWZmZXIuZnJvbShib2R5KSwgY29udGVudFR5cGUsIGZhbHNlKTtcbn1cblxuZnVuY3Rpb24gc2VuZEJ1ZmZlcihcbiAgcmVzOiBTZXJ2ZXJSZXNwb25zZSxcbiAgc3RhdHVzOiBudW1iZXIsXG4gIGJvZHk6IEJ1ZmZlcixcbiAgY29udGVudFR5cGU6IHN0cmluZyxcbiAgaGVhZE9ubHk6IGJvb2xlYW4sXG4pOiB2b2lkIHtcbiAgcmVzLndyaXRlSGVhZChzdGF0dXMsIHtcbiAgICBcImNvbnRlbnQtdHlwZVwiOiBjb250ZW50VHlwZSxcbiAgICBcImNvbnRlbnQtbGVuZ3RoXCI6IGJvZHkubGVuZ3RoLFxuICAgIFwiY2FjaGUtY29udHJvbFwiOiBcIm5vLXN0b3JlXCIsXG4gIH0pO1xuICBpZiAoaGVhZE9ubHkpIHJlcy5lbmQoKTtcbiAgZWxzZSByZXMuZW5kKGJvZHkpO1xufVxuXG5mdW5jdGlvbiB3ZWJ2aWV3Um9vdCgpOiBzdHJpbmcge1xuICByZXR1cm4gam9pbihwcm9jZXNzLnJlc291cmNlc1BhdGgsIFwiYXBwLmFzYXJcIiwgXCJ3ZWJ2aWV3XCIpO1xufVxuXG5mdW5jdGlvbiB3ZWJ2aWV3RmlsZShwYXRobmFtZTogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IGNsZWFuUGF0aCA9IGRlY29kZVVSSUNvbXBvbmVudChwYXRobmFtZSkucmVwbGFjZSgvXlxcLysvLCBcIlwiKTtcbiAgaWYgKCFjbGVhblBhdGggfHwgY2xlYW5QYXRoLmluY2x1ZGVzKFwiXFwwXCIpKSByZXR1cm4gbnVsbDtcbiAgY29uc3Qgcm9vdCA9IHdlYnZpZXdSb290KCk7XG4gIGNvbnN0IGZpbGUgPSBub3JtYWxpemUoam9pbihyb290LCBjbGVhblBhdGgpKTtcbiAgY29uc3QgcmVsID0gcmVsYXRpdmUocm9vdCwgZmlsZSk7XG4gIGlmIChyZWwuc3RhcnRzV2l0aChcIi4uXCIpIHx8IHJlbCA9PT0gXCJcIikgcmV0dXJuIG51bGw7XG4gIGlmICghZXhpc3RzU3luYyhmaWxlKSB8fCAhc3RhdFN5bmMoZmlsZSkuaXNGaWxlKCkpIHJldHVybiBudWxsO1xuICByZXR1cm4gZmlsZTtcbn1cblxuZnVuY3Rpb24gbWltZVR5cGUoZmlsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgZG90ID0gZmlsZS5sYXN0SW5kZXhPZihcIi5cIik7XG4gIGNvbnN0IGV4dCA9IGRvdCA+PSAwID8gZmlsZS5zbGljZShkb3QpLnRvTG93ZXJDYXNlKCkgOiBcIlwiO1xuICByZXR1cm4gTUlNRV9UWVBFU1tleHRdID8/IFwiYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXCI7XG59XG5cbmZ1bmN0aW9uIHJlcXVpcmVPcHRpb25zKCk6IEJyb3dzZXJVaVNlcnZlck9wdGlvbnMge1xuICBpZiAoIWFjdGl2ZU9wdGlvbnMpIHRocm93IG5ldyBFcnJvcihcIkNvZGV4KysgYnJvd3NlciBVSSBzZXJ2ZXIgaXMgbm90IGNvbmZpZ3VyZWRcIik7XG4gIHJldHVybiBhY3RpdmVPcHRpb25zO1xufVxuXG5mdW5jdGlvbiBpc0Jyb3dzZXJVaUhvc3RTZW5kZXIoc2VuZGVyOiBFbGVjdHJvbi5XZWJDb250ZW50cyk6IGJvb2xlYW4ge1xuICByZXR1cm4gISFhY3RpdmVIb3N0ICYmICFhY3RpdmVIb3N0LndlYkNvbnRlbnRzLmlzRGVzdHJveWVkKCkgJiYgc2VuZGVyLmlkID09PSBhY3RpdmVIb3N0LndlYkNvbnRlbnRzLmlkO1xufVxuXG5mdW5jdGlvbiBhc3NlcnRCcmlkZ2VNZXRob2QobWV0aG9kOiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKCEvXlthLXpBLVowLTkuXzotXSskLy50ZXN0KG1ldGhvZCkpIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgYnJpZGdlIG1ldGhvZFwiKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VQb3J0KHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQsIGZhbGxiYWNrOiBudW1iZXIpOiBudW1iZXIge1xuICBjb25zdCBwYXJzZWQgPSBOdW1iZXIodmFsdWUpO1xuICByZXR1cm4gTnVtYmVyLmlzSW50ZWdlcihwYXJzZWQpICYmIHBhcnNlZCA+IDAgJiYgcGFyc2VkIDw9IDY1NTM1ID8gcGFyc2VkIDogZmFsbGJhY2s7XG59XG5cbmZ1bmN0aW9uIGFzUmVjb3JkKHZhbHVlOiB1bmtub3duKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsIHtcbiAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiA/IHZhbHVlIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IDogbnVsbDtcbn1cblxuZnVuY3Rpb24gYXNQbGFpbk9iamVjdCh2YWx1ZTogdW5rbm93bik6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcbiAgY29uc3QgcmVjb3JkID0gYXNSZWNvcmQodmFsdWUpO1xuICByZXR1cm4gcmVjb3JkICYmICFBcnJheS5pc0FycmF5KHJlY29yZCkgPyByZWNvcmQgOiB7fTtcbn1cblxuZnVuY3Rpb24gY3VycmVudFN5c3RlbVRoZW1lVmFyaWFudCgpOiBzdHJpbmcge1xuICByZXR1cm4gbmF0aXZlVGhlbWUuc2hvdWxkVXNlRGFya0NvbG9ycyA/IFwiZGFya1wiIDogXCJsaWdodFwiO1xufVxuXG5mdW5jdGlvbiBzYWZlSnNvbih2YWx1ZTogdW5rbm93bik6IHN0cmluZyB7XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvPC9nLCBcIlxcXFx1MDAzY1wiKTtcbn1cblxuZnVuY3Rpb24gZGVsYXkobXM6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTtcbn1cbiIsICJpbXBvcnQgeyByZWFscGF0aFN5bmMgfSBmcm9tIFwibm9kZTpmc1wiO1xuaW1wb3J0IHsgaXNBYnNvbHV0ZSwgcmVsYXRpdmUsIHJlc29sdmUgfSBmcm9tIFwibm9kZTpwYXRoXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlTmF0aXZlVHdlYWtQYXRoKHR3ZWFrRGlyOiBzdHJpbmcsIHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICh0eXBlb2YgcGF0aCAhPT0gXCJzdHJpbmdcIiB8fCBwYXRoLnRyaW0oKSA9PT0gXCJcIikgdGhyb3cgbmV3IEVycm9yKFwibmF0aXZlIHBhdGggaXMgcmVxdWlyZWRcIik7XG4gIGNvbnN0IHJvb3QgPSByZWFscGF0aFN5bmModHdlYWtEaXIpO1xuICBjb25zdCBmdWxsID0gcmVzb2x2ZSh0d2Vha0RpciwgcGF0aCk7XG4gIGxldCB0YXJnZXQ6IHN0cmluZztcbiAgdHJ5IHtcbiAgICB0YXJnZXQgPSByZWFscGF0aFN5bmMoZnVsbCk7XG4gIH0gY2F0Y2gge1xuICAgIHRocm93IG5ldyBFcnJvcihcIm5hdGl2ZSBwYXRoIGRvZXMgbm90IGV4aXN0XCIpO1xuICB9XG4gIGlmICghaXNQYXRoSW5zaWRlKHJvb3QsIHRhcmdldCkgfHwgdGFyZ2V0ID09PSByb290KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwibmF0aXZlIHBhdGggbXVzdCBzdGF5IGluc2lkZSB0aGUgdHdlYWsgZGlyZWN0b3J5XCIpO1xuICB9XG4gIHJldHVybiB0YXJnZXQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1BhdGhJbnNpZGUocGFyZW50OiBzdHJpbmcsIHRhcmdldDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IHJlbCA9IHJlbGF0aXZlKHJlc29sdmUocGFyZW50KSwgcmVzb2x2ZSh0YXJnZXQpKTtcbiAgcmV0dXJuIHJlbCA9PT0gXCJcIiB8fCAoISFyZWwgJiYgIXJlbC5zdGFydHNXaXRoKFwiLi5cIikgJiYgIWlzQWJzb2x1dGUocmVsKSk7XG59XG4iLCAiLyoqXG4gKiBSdW50aW1lIHBhdGggY29uc3RhbnRzIGFuZCBlbnYgZ2F0ZS4gTGVhZiBtb2R1bGU6IG5vIGltcG9ydHMgZnJvbSBvdGhlclxuICogcnVudGltZSBmZWF0dXJlIG1vZHVsZXMuXG4gKi9cbmltcG9ydCB7IG1rZGlyU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBob21lZGlyIH0gZnJvbSBcIm5vZGU6b3NcIjtcbmltcG9ydCB7IGpvaW4sIHJlc29sdmUgfSBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgeyBhcHBlbmRDYXBwZWRMb2cgfSBmcm9tIFwiLi9sb2dnaW5nXCI7XG5pbXBvcnQgeyByZXNvbHZlVHdlYWtTdG9yZUluZGV4VXJsIH0gZnJvbSBcIi4vdHdlYWstc3RvcmVcIjtcblxuY29uc3QgdXNlclJvb3RFbnYgPSBwcm9jZXNzLmVudi5DT0RFWF9QTFVTUExVU19VU0VSX1JPT1Q7XG5jb25zdCBydW50aW1lRGlyRW52ID0gcHJvY2Vzcy5lbnYuQ09ERVhfUExVU1BMVVNfUlVOVElNRTtcblxuaWYgKCF1c2VyUm9vdEVudiB8fCAhcnVudGltZURpckVudikge1xuICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgXCJjb2RleC1wbHVzcGx1cyBydW50aW1lIHN0YXJ0ZWQgd2l0aG91dCBDT0RFWF9QTFVTUExVU19VU0VSX1JPT1QvUlVOVElNRSBlbnZzXCIsXG4gICk7XG59XG5cbmV4cG9ydCBjb25zdCB1c2VyUm9vdDogc3RyaW5nID0gdXNlclJvb3RFbnY7XG5leHBvcnQgY29uc3QgcnVudGltZURpcjogc3RyaW5nID0gcnVudGltZURpckVudjtcblxuZXhwb3J0IGNvbnN0IFBSRUxPQURfUEFUSCA9IHJlc29sdmUocnVudGltZURpciwgXCJwcmVsb2FkLmpzXCIpO1xuZXhwb3J0IGNvbnN0IEdVRVNUX1BSRUxPQURfUEFUSCA9IHJlc29sdmUocnVudGltZURpciwgXCJndWVzdC1wcmVsb2FkLmpzXCIpO1xuZXhwb3J0IGNvbnN0IFRXRUFLU19ESVIgPSBqb2luKHVzZXJSb290LCBcInR3ZWFrc1wiKTtcbmV4cG9ydCBjb25zdCBMT0dfRElSID0gam9pbih1c2VyUm9vdCwgXCJsb2dcIik7XG5leHBvcnQgY29uc3QgTE9HX0ZJTEUgPSBqb2luKExPR19ESVIsIFwibWFpbi5sb2dcIik7XG5leHBvcnQgY29uc3QgQ09ORklHX0ZJTEUgPSBqb2luKHVzZXJSb290LCBcImNvbmZpZy5qc29uXCIpO1xuZXhwb3J0IGNvbnN0IENPREVYX0NPTkZJR19GSUxFID0gam9pbihob21lZGlyKCksIFwiLmNvZGV4XCIsIFwiY29uZmlnLnRvbWxcIik7XG5leHBvcnQgY29uc3QgSU5TVEFMTEVSX1NUQVRFX0ZJTEUgPSBqb2luKHVzZXJSb290LCBcInN0YXRlLmpzb25cIik7XG5leHBvcnQgY29uc3QgVVBEQVRFX01PREVfRklMRSA9IGpvaW4odXNlclJvb3QsIFwidXBkYXRlLW1vZGUuanNvblwiKTtcbmV4cG9ydCBjb25zdCBTRUxGX1VQREFURV9TVEFURV9GSUxFID0gam9pbih1c2VyUm9vdCwgXCJzZWxmLXVwZGF0ZS1zdGF0ZS5qc29uXCIpO1xuZXhwb3J0IGNvbnN0IFNJR05FRF9DT0RFWF9CQUNLVVAgPSBqb2luKHVzZXJSb290LCBcImJhY2t1cFwiLCBcIkNvZGV4LmFwcFwiKTtcbmV4cG9ydCBjb25zdCBDT0RFWF9QTFVTUExVU19WRVJTSU9OID0gXCIxLjEuM1wiO1xuZXhwb3J0IGNvbnN0IENPREVYX1BMVVNQTFVTX1JFUE8gPSBcIkxpZ2h0SGFydS9jaGF0Z3B0LWxheWVyXCI7XG5leHBvcnQgY29uc3QgVFdFQUtfU1RPUkVfSU5ERVhfVVJMID0gcmVzb2x2ZVR3ZWFrU3RvcmVJbmRleFVybCgpO1xuZXhwb3J0IGNvbnN0IENPREVYX1dJTkRPV19TRVJWSUNFU19LRVkgPSBcIl9fY29kZXhwcF93aW5kb3dfc2VydmljZXNfX1wiO1xuXG5ta2RpclN5bmMoTE9HX0RJUiwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG5ta2RpclN5bmMoVFdFQUtTX0RJUiwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG5cbmV4cG9ydCB0eXBlIFJ1bnRpbWVMb2cgPSAobGV2ZWw6IFwiaW5mb1wiIHwgXCJ3YXJuXCIgfCBcImVycm9yXCIsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZDtcblxuZXhwb3J0IGZ1bmN0aW9uIGxvZyhsZXZlbDogXCJpbmZvXCIgfCBcIndhcm5cIiB8IFwiZXJyb3JcIiwgLi4uYXJnczogdW5rbm93bltdKTogdm9pZCB7XG4gIGNvbnN0IGxpbmUgPSBgWyR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpfV0gWyR7bGV2ZWx9XSAke2FyZ3NcbiAgICAubWFwKChhKSA9PiAodHlwZW9mIGEgPT09IFwic3RyaW5nXCIgPyBhIDogSlNPTi5zdHJpbmdpZnkoYSkpKVxuICAgIC5qb2luKFwiIFwiKX1cXG5gO1xuICB0cnkge1xuICAgIGFwcGVuZENhcHBlZExvZyhMT0dfRklMRSwgbGluZSk7XG4gIH0gY2F0Y2gge31cbiAgaWYgKGxldmVsID09PSBcImVycm9yXCIpIGNvbnNvbGUuZXJyb3IoXCJbY29kZXgtcGx1c3BsdXNdXCIsIC4uLmFyZ3MpO1xufVxuIiwgImltcG9ydCB0eXBlIHsgVHdlYWtNYW5pZmVzdCB9IGZyb20gXCJAY29kZXgtcGx1c3BsdXMvc2RrXCI7XG5cbi8qKiBDb21taXQgb2Ygc3RvcmUvaW5kZXguanNvbiByZXZpZXdlZCBpbnRvIHRoaXMgcnVudGltZS4gTm90IGZsb2F0aW5nIG1haW4uICovXG5leHBvcnQgY29uc3QgUElOTkVEX1RXRUFLX1NUT1JFX0lOREVYX0NPTU1JVCA9IFwiN2EwZTk1YjE2MWRlNTQ4MDI2MWYxN2JiZjg0MDA0ZDliZTkwZGM2ZVwiO1xuLyoqIFNIQS0yNTYgb2Ygc3RvcmUvaW5kZXguanNvbiBhdCBQSU5ORURfVFdFQUtfU1RPUkVfSU5ERVhfQ09NTUlULiAqL1xuZXhwb3J0IGNvbnN0IFBJTk5FRF9UV0VBS19TVE9SRV9JTkRFWF9TSEEyNTYgPVxuICBcIjM3OGU4OGNjMzY2ZWY2ZDUwODE2YTI3ODM4YWYxNDZjMzRmZWYxMjJjNmJmZWUzYmEwM2M5NTQ5Yjg2MmQwNjNcIjtcbmV4cG9ydCBjb25zdCBERUZBVUxUX1RXRUFLX1NUT1JFX0lOREVYX1VSTCA9XG4gIGBodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vTGlnaHRIYXJ1L2NoYXRncHQtbGF5ZXIvJHtQSU5ORURfVFdFQUtfU1RPUkVfSU5ERVhfQ09NTUlUfS9zdG9yZS9pbmRleC5qc29uYDtcbmV4cG9ydCBjb25zdCBUV0VBS19TVE9SRV9SRVZJRVdfSVNTVUVfVVJMID1cbiAgXCJodHRwczovL2dpdGh1Yi5jb20vTGlnaHRIYXJ1L2NoYXRncHQtbGF5ZXIvaXNzdWVzL25ld1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFR3ZWFrU3RvcmVSZWdpc3RyeSB7XG4gIHNjaGVtYVZlcnNpb246IDE7XG4gIGdlbmVyYXRlZEF0Pzogc3RyaW5nO1xuICBlbnRyaWVzOiBUd2Vha1N0b3JlRW50cnlbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUd2Vha1N0b3JlRW50cnkge1xuICBpZDogc3RyaW5nO1xuICBtYW5pZmVzdDogVHdlYWtNYW5pZmVzdDtcbiAgcmVwbzogc3RyaW5nO1xuICBhcHByb3ZlZENvbW1pdFNoYTogc3RyaW5nO1xuICBhcHByb3ZlZEF0OiBzdHJpbmc7XG4gIGFwcHJvdmVkQnk6IHN0cmluZztcbiAgcGxhdGZvcm1zPzogVHdlYWtTdG9yZVBsYXRmb3JtW107XG4gIHJlbGVhc2VVcmw/OiBzdHJpbmc7XG4gIHJldmlld1VybD86IHN0cmluZztcbn1cblxuZXhwb3J0IHR5cGUgVHdlYWtTdG9yZVBsYXRmb3JtID0gXCJkYXJ3aW5cIiB8IFwid2luMzJcIiB8IFwibGludXhcIjtcblxuZXhwb3J0IGludGVyZmFjZSBUd2Vha1N0b3JlUHVibGlzaFN1Ym1pc3Npb24ge1xuICByZXBvOiBzdHJpbmc7XG4gIGRlZmF1bHRCcmFuY2g6IHN0cmluZztcbiAgY29tbWl0U2hhOiBzdHJpbmc7XG4gIGNvbW1pdFVybDogc3RyaW5nO1xuICBtYW5pZmVzdD86IHtcbiAgICBpZD86IHN0cmluZztcbiAgICBuYW1lPzogc3RyaW5nO1xuICAgIHZlcnNpb24/OiBzdHJpbmc7XG4gICAgZGVzY3JpcHRpb24/OiBzdHJpbmc7XG4gICAgaWNvblVybD86IHN0cmluZztcbiAgfTtcbn1cblxuY29uc3QgR0lUSFVCX1JFUE9fUkUgPSAvXltBLVphLXowLTlfLi1dK1xcL1tBLVphLXowLTlfLi1dKyQvO1xuY29uc3QgRlVMTF9TSEFfUkUgPSAvXlthLWYwLTldezQwfSQvaTtcblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZUdpdEh1YlJlcG8oaW5wdXQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHJhdyA9IGlucHV0LnRyaW0oKTtcbiAgaWYgKCFyYXcpIHRocm93IG5ldyBFcnJvcihcIkdpdEh1YiByZXBvIGlzIHJlcXVpcmVkXCIpO1xuXG4gIGNvbnN0IHNzaCA9IC9eZ2l0QGdpdGh1YlxcLmNvbTooW14vXStcXC9bXi9dKz8pKD86XFwuZ2l0KT8kL2kuZXhlYyhyYXcpO1xuICBpZiAoc3NoKSByZXR1cm4gbm9ybWFsaXplUmVwb1BhcnQoc3NoWzFdKTtcblxuICBpZiAoL15odHRwcz86XFwvXFwvL2kudGVzdChyYXcpKSB7XG4gICAgY29uc3QgdXJsID0gbmV3IFVSTChyYXcpO1xuICAgIGlmICh1cmwuaG9zdG5hbWUgIT09IFwiZ2l0aHViLmNvbVwiKSB0aHJvdyBuZXcgRXJyb3IoXCJPbmx5IGdpdGh1Yi5jb20gcmVwb3NpdG9yaWVzIGFyZSBzdXBwb3J0ZWRcIik7XG4gICAgY29uc3QgcGFydHMgPSB1cmwucGF0aG5hbWUucmVwbGFjZSgvXlxcLyt8XFwvKyQvZywgXCJcIikuc3BsaXQoXCIvXCIpO1xuICAgIGlmIChwYXJ0cy5sZW5ndGggPCAyKSB0aHJvdyBuZXcgRXJyb3IoXCJHaXRIdWIgcmVwbyBVUkwgbXVzdCBpbmNsdWRlIG93bmVyIGFuZCByZXBvc2l0b3J5XCIpO1xuICAgIHJldHVybiBub3JtYWxpemVSZXBvUGFydChgJHtwYXJ0c1swXX0vJHtwYXJ0c1sxXX1gKTtcbiAgfVxuXG4gIHJldHVybiBub3JtYWxpemVSZXBvUGFydChyYXcpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplU3RvcmVSZWdpc3RyeShpbnB1dDogdW5rbm93bik6IFR3ZWFrU3RvcmVSZWdpc3RyeSB7XG4gIGNvbnN0IHJlZ2lzdHJ5ID0gaW5wdXQgYXMgUGFydGlhbDxUd2Vha1N0b3JlUmVnaXN0cnk+IHwgbnVsbDtcbiAgaWYgKCFyZWdpc3RyeSB8fCByZWdpc3RyeS5zY2hlbWFWZXJzaW9uICE9PSAxIHx8ICFBcnJheS5pc0FycmF5KHJlZ2lzdHJ5LmVudHJpZXMpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiVW5zdXBwb3J0ZWQgdHdlYWsgc3RvcmUgcmVnaXN0cnlcIik7XG4gIH1cbiAgY29uc3QgZW50cmllcyA9IHJlZ2lzdHJ5LmVudHJpZXMubWFwKG5vcm1hbGl6ZVN0b3JlRW50cnkpO1xuICBlbnRyaWVzLnNvcnQoKGEsIGIpID0+IGEubWFuaWZlc3QubmFtZS5sb2NhbGVDb21wYXJlKGIubWFuaWZlc3QubmFtZSkpO1xuICByZXR1cm4ge1xuICAgIHNjaGVtYVZlcnNpb246IDEsXG4gICAgZ2VuZXJhdGVkQXQ6IHR5cGVvZiByZWdpc3RyeS5nZW5lcmF0ZWRBdCA9PT0gXCJzdHJpbmdcIiA/IHJlZ2lzdHJ5LmdlbmVyYXRlZEF0IDogdW5kZWZpbmVkLFxuICAgIGVudHJpZXMsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzaHVmZmxlU3RvcmVFbnRyaWVzPFQ+KFxuICBlbnRyaWVzOiByZWFkb25seSBUW10sXG4gIHJhbmRvbUluZGV4OiAoZXhjbHVzaXZlTWF4OiBudW1iZXIpID0+IG51bWJlciA9IChleGNsdXNpdmVNYXgpID0+IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGV4Y2x1c2l2ZU1heCksXG4pOiBUW10ge1xuICBjb25zdCBzaHVmZmxlZCA9IFsuLi5lbnRyaWVzXTtcbiAgZm9yIChsZXQgaSA9IHNodWZmbGVkLmxlbmd0aCAtIDE7IGkgPiAwOyBpIC09IDEpIHtcbiAgICBjb25zdCBqID0gcmFuZG9tSW5kZXgoaSArIDEpO1xuICAgIGlmICghTnVtYmVyLmlzSW50ZWdlcihqKSB8fCBqIDwgMCB8fCBqID4gaSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBzaHVmZmxlIHJhbmRvbUluZGV4IHJldHVybmVkICR7an07IGV4cGVjdGVkIGFuIGludGVnZXIgZnJvbSAwIHRvICR7aX1gKTtcbiAgICB9XG4gICAgW3NodWZmbGVkW2ldLCBzaHVmZmxlZFtqXV0gPSBbc2h1ZmZsZWRbal0sIHNodWZmbGVkW2ldXTtcbiAgfVxuICByZXR1cm4gc2h1ZmZsZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVTdG9yZUVudHJ5KGlucHV0OiB1bmtub3duKTogVHdlYWtTdG9yZUVudHJ5IHtcbiAgY29uc3QgZW50cnkgPSBpbnB1dCBhcyBQYXJ0aWFsPFR3ZWFrU3RvcmVFbnRyeT4gfCBudWxsO1xuICBpZiAoIWVudHJ5IHx8IHR5cGVvZiBlbnRyeSAhPT0gXCJvYmplY3RcIikgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCB0d2VhayBzdG9yZSBlbnRyeVwiKTtcbiAgY29uc3QgcmVwbyA9IG5vcm1hbGl6ZUdpdEh1YlJlcG8oU3RyaW5nKGVudHJ5LnJlcG8gPz8gZW50cnkubWFuaWZlc3Q/LmdpdGh1YlJlcG8gPz8gXCJcIikpO1xuICBjb25zdCBtYW5pZmVzdCA9IGVudHJ5Lm1hbmlmZXN0IGFzIFR3ZWFrTWFuaWZlc3QgfCB1bmRlZmluZWQ7XG4gIGlmICghbWFuaWZlc3Q/LmlkIHx8ICFtYW5pZmVzdC5uYW1lIHx8ICFtYW5pZmVzdC52ZXJzaW9uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBTdG9yZSBlbnRyeSBmb3IgJHtyZXBvfSBpcyBtaXNzaW5nIG1hbmlmZXN0IGZpZWxkc2ApO1xuICB9XG4gIGlmIChub3JtYWxpemVHaXRIdWJSZXBvKG1hbmlmZXN0LmdpdGh1YlJlcG8pICE9PSByZXBvKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBTdG9yZSBlbnRyeSAke21hbmlmZXN0LmlkfSByZXBvIGRvZXMgbm90IG1hdGNoIG1hbmlmZXN0IGdpdGh1YlJlcG9gKTtcbiAgfVxuICBpZiAoIWlzRnVsbENvbW1pdFNoYShTdHJpbmcoZW50cnkuYXBwcm92ZWRDb21taXRTaGEgPz8gXCJcIikpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBTdG9yZSBlbnRyeSAke21hbmlmZXN0LmlkfSBtdXN0IHBpbiBhIGZ1bGwgYXBwcm92ZWQgY29tbWl0IFNIQWApO1xuICB9XG4gIHJldHVybiB7XG4gICAgaWQ6IG1hbmlmZXN0LmlkLFxuICAgIG1hbmlmZXN0LFxuICAgIHJlcG8sXG4gICAgYXBwcm92ZWRDb21taXRTaGE6IFN0cmluZyhlbnRyeS5hcHByb3ZlZENvbW1pdFNoYSksXG4gICAgYXBwcm92ZWRBdDogdHlwZW9mIGVudHJ5LmFwcHJvdmVkQXQgPT09IFwic3RyaW5nXCIgPyBlbnRyeS5hcHByb3ZlZEF0IDogXCJcIixcbiAgICBhcHByb3ZlZEJ5OiB0eXBlb2YgZW50cnkuYXBwcm92ZWRCeSA9PT0gXCJzdHJpbmdcIiA/IGVudHJ5LmFwcHJvdmVkQnkgOiBcIlwiLFxuICAgIHBsYXRmb3Jtczogbm9ybWFsaXplU3RvcmVQbGF0Zm9ybXMoKGVudHJ5IGFzIHsgcGxhdGZvcm1zPzogdW5rbm93biB9KS5wbGF0Zm9ybXMpLFxuICAgIHJlbGVhc2VVcmw6IG9wdGlvbmFsR2l0aHViVXJsKGVudHJ5LnJlbGVhc2VVcmwpLFxuICAgIHJldmlld1VybDogb3B0aW9uYWxHaXRodWJVcmwoZW50cnkucmV2aWV3VXJsKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0b3JlQXJjaGl2ZVVybChlbnRyeTogVHdlYWtTdG9yZUVudHJ5KTogc3RyaW5nIHtcbiAgaWYgKCFpc0Z1bGxDb21taXRTaGEoZW50cnkuYXBwcm92ZWRDb21taXRTaGEpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBTdG9yZSBlbnRyeSAke2VudHJ5LmlkfSBpcyBub3QgcGlubmVkIHRvIGEgZnVsbCBjb21taXQgU0hBYCk7XG4gIH1cbiAgcmV0dXJuIGBodHRwczovL2NvZGVsb2FkLmdpdGh1Yi5jb20vJHtlbnRyeS5yZXBvfS90YXIuZ3ovJHtlbnRyeS5hcHByb3ZlZENvbW1pdFNoYX1gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRUd2Vha1B1Ymxpc2hJc3N1ZVVybChzdWJtaXNzaW9uOiBUd2Vha1N0b3JlUHVibGlzaFN1Ym1pc3Npb24pOiBzdHJpbmcge1xuICBjb25zdCByZXBvID0gbm9ybWFsaXplR2l0SHViUmVwbyhzdWJtaXNzaW9uLnJlcG8pO1xuICBpZiAoIWlzRnVsbENvbW1pdFNoYShzdWJtaXNzaW9uLmNvbW1pdFNoYSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJTdWJtaXNzaW9uIG11c3QgaW5jbHVkZSB0aGUgZnVsbCBjb21taXQgU0hBIHRvIHJldmlld1wiKTtcbiAgfVxuICBjb25zdCB0aXRsZSA9IGBUd2VhayBzdG9yZSByZXZpZXc6ICR7cmVwb31gO1xuICBjb25zdCBib2R5ID0gW1xuICAgIFwiIyMgVHdlYWsgcmVwb1wiLFxuICAgIGBodHRwczovL2dpdGh1Yi5jb20vJHtyZXBvfWAsXG4gICAgXCJcIixcbiAgICBcIiMjIENvbW1pdCB0byByZXZpZXdcIixcbiAgICBzdWJtaXNzaW9uLmNvbW1pdFNoYSxcbiAgICBzdWJtaXNzaW9uLmNvbW1pdFVybCxcbiAgICBcIlwiLFxuICAgIFwiRG8gbm90IGFwcHJvdmUgYSBkaWZmZXJlbnQgY29tbWl0LiBJZiB0aGUgYXV0aG9yIHB1c2hlcyBjaGFuZ2VzLCBhc2sgdGhlbSB0byByZXN1Ym1pdC5cIixcbiAgICBcIlwiLFxuICAgIFwiIyMgTWFuaWZlc3RcIixcbiAgICBgLSBpZDogJHtzdWJtaXNzaW9uLm1hbmlmZXN0Py5pZCA/PyBcIihub3QgZGV0ZWN0ZWQpXCJ9YCxcbiAgICBgLSBuYW1lOiAke3N1Ym1pc3Npb24ubWFuaWZlc3Q/Lm5hbWUgPz8gXCIobm90IGRldGVjdGVkKVwifWAsXG4gICAgYC0gdmVyc2lvbjogJHtzdWJtaXNzaW9uLm1hbmlmZXN0Py52ZXJzaW9uID8/IFwiKG5vdCBkZXRlY3RlZClcIn1gLFxuICAgIGAtIGRlc2NyaXB0aW9uOiAke3N1Ym1pc3Npb24ubWFuaWZlc3Q/LmRlc2NyaXB0aW9uID8/IFwiKG5vdCBkZXRlY3RlZClcIn1gLFxuICAgIGAtIGljb25Vcmw6ICR7c3VibWlzc2lvbi5tYW5pZmVzdD8uaWNvblVybCA/PyBcIihub3QgZGV0ZWN0ZWQpXCJ9YCxcbiAgICBcIlwiLFxuICAgIFwiIyMgQWRtaW4gY2hlY2tsaXN0XCIsXG4gICAgXCItIFsgXSBtYW5pZmVzdC5qc29uIGlzIHZhbGlkXCIsXG4gICAgXCItIFsgXSBtYW5pZmVzdC5pY29uVXJsIGlzIHVzYWJsZSBhcyB0aGUgc3RvcmUgaWNvblwiLFxuICAgIFwiLSBbIF0gc291cmNlIHdhcyByZXZpZXdlZCBhdCB0aGUgZXhhY3QgY29tbWl0IGFib3ZlXCIsXG4gICAgXCItIFsgXSBgc3RvcmUvaW5kZXguanNvbmAgZW50cnkgcGlucyBgYXBwcm92ZWRDb21taXRTaGFgIHRvIHRoZSBleGFjdCBjb21taXQgYWJvdmVcIixcbiAgXS5qb2luKFwiXFxuXCIpO1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKFRXRUFLX1NUT1JFX1JFVklFV19JU1NVRV9VUkwpO1xuICB1cmwuc2VhcmNoUGFyYW1zLnNldChcInRlbXBsYXRlXCIsIFwidHdlYWstc3RvcmUtcmV2aWV3Lm1kXCIpO1xuICB1cmwuc2VhcmNoUGFyYW1zLnNldChcInRpdGxlXCIsIHRpdGxlKTtcbiAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoXCJib2R5XCIsIGJvZHkpO1xuICByZXR1cm4gdXJsLnRvU3RyaW5nKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0Z1bGxDb21taXRTaGEodmFsdWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gRlVMTF9TSEFfUkUudGVzdCh2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVJlcG9QYXJ0KHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCByZXBvID0gdmFsdWUudHJpbSgpLnJlcGxhY2UoL1xcLmdpdCQvaSwgXCJcIikucmVwbGFjZSgvXlxcLyt8XFwvKyQvZywgXCJcIik7XG4gIGlmICghR0lUSFVCX1JFUE9fUkUudGVzdChyZXBvKSkgdGhyb3cgbmV3IEVycm9yKFwiR2l0SHViIHJlcG8gbXVzdCBiZSBpbiBvd25lci9yZXBvIGZvcm1cIik7XG4gIHJldHVybiByZXBvO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVTdG9yZVBsYXRmb3JtcyhpbnB1dDogdW5rbm93bik6IFR3ZWFrU3RvcmVQbGF0Zm9ybVtdIHwgdW5kZWZpbmVkIHtcbiAgaWYgKGlucHV0ID09PSB1bmRlZmluZWQpIHJldHVybiB1bmRlZmluZWQ7XG4gIGlmICghQXJyYXkuaXNBcnJheShpbnB1dCkpIHRocm93IG5ldyBFcnJvcihcIlN0b3JlIGVudHJ5IHBsYXRmb3JtcyBtdXN0IGJlIGFuIGFycmF5XCIpO1xuICBjb25zdCBhbGxvd2VkID0gbmV3IFNldDxUd2Vha1N0b3JlUGxhdGZvcm0+KFtcImRhcndpblwiLCBcIndpbjMyXCIsIFwibGludXhcIl0pO1xuICBjb25zdCBwbGF0Zm9ybXMgPSBBcnJheS5mcm9tKG5ldyBTZXQoaW5wdXQubWFwKCh2YWx1ZSkgPT4ge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09IFwic3RyaW5nXCIgfHwgIWFsbG93ZWQuaGFzKHZhbHVlIGFzIFR3ZWFrU3RvcmVQbGF0Zm9ybSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgc3RvcmUgcGxhdGZvcm06ICR7U3RyaW5nKHZhbHVlKX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlIGFzIFR3ZWFrU3RvcmVQbGF0Zm9ybTtcbiAgfSkpKTtcbiAgcmV0dXJuIHBsYXRmb3Jtcy5sZW5ndGggPiAwID8gcGxhdGZvcm1zIDogdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBvcHRpb25hbEdpdGh1YlVybCh2YWx1ZTogdW5rbm93bik6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09IFwic3RyaW5nXCIgfHwgIXZhbHVlLnRyaW0oKSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgY29uc3QgdXJsID0gbmV3IFVSTCh2YWx1ZSk7XG4gIGlmICh1cmwucHJvdG9jb2wgIT09IFwiaHR0cHM6XCIgfHwgdXJsLmhvc3RuYW1lICE9PSBcImdpdGh1Yi5jb21cIikgcmV0dXJuIHVuZGVmaW5lZDtcbiAgcmV0dXJuIHVybC50b1N0cmluZygpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZVR3ZWFrU3RvcmVJbmRleFVybChlbnY6IE5vZGVKUy5EaWN0PHN0cmluZyB8IHVuZGVmaW5lZD4gPSBwcm9jZXNzLmVudik6IHN0cmluZyB7XG4gIGNvbnN0IG92ZXJyaWRlID0gZW52LkNPREVYX1BMVVNQTFVTX1NUT1JFX0lOREVYX1VSTD8udHJpbSgpO1xuICBpZiAob3ZlcnJpZGUpIHtcbiAgICBpZiAoZW52LkNPREVYX1BMVVNQTFVTX0FMTE9XX1NUT1JFX0lOREVYX09WRVJSSURFICE9PSBcIjFcIikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBcIkNPREVYX1BMVVNQTFVTX1NUT1JFX0lOREVYX1VSTCBvdmVycmlkZSByZXF1aXJlcyBDT0RFWF9QTFVTUExVU19BTExPV19TVE9SRV9JTkRFWF9PVkVSUklERT0xXCIsXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gb3ZlcnJpZGU7XG4gIH1cbiAgcmV0dXJuIERFRkFVTFRfVFdFQUtfU1RPUkVfSU5ERVhfVVJMO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRTdG9yZUluc3RhbGxQaW4oZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSwgY29tbWl0U2hhOiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKGVudHJ5LmFwcHJvdmVkQ29tbWl0U2hhLnRvTG93ZXJDYXNlKCkgIT09IGNvbW1pdFNoYS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYFJlZnVzaW5nIHRvIGluc3RhbGwgJHtlbnRyeS5pZH0gYXQgJHtjb21taXRTaGF9OyBzdG9yZSBwaW4gaXMgJHtlbnRyeS5hcHByb3ZlZENvbW1pdFNoYX1gLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNob3J0Q29tbWl0U2hhKHNoYTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHNoYS5zbGljZSgwLCA3KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RlZFBpbkxhYmVsKHNoYTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBMaXN0ZWQgXHUwMEI3IHBpbm5lZCAke3Nob3J0Q29tbWl0U2hhKHNoYSl9YDtcbn0iLCAiaW1wb3J0IHsgcmVhZEZpbGVTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGlzTGF5ZXJBdXRvVXBkYXRlRW5hYmxlZCB9IGZyb20gXCIuL2lwYy1ndWFyZFwiO1xuaW1wb3J0IHtcbiAgQ09ORklHX0ZJTEUsXG4gIElOU1RBTExFUl9TVEFURV9GSUxFLFxuICBTRUxGX1VQREFURV9TVEFURV9GSUxFLFxuICBsb2csXG59IGZyb20gXCIuL3J1bnRpbWUtcGF0aHNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBQZXJzaXN0ZWRTdGF0ZSB7XG4gIGNvZGV4UGx1c1BsdXM/OiB7XG4gICAgYXV0b1VwZGF0ZT86IGJvb2xlYW47XG4gICAgc2FmZU1vZGU/OiBib29sZWFuO1xuICAgIHVwZGF0ZUNoYW5uZWw/OiBTZWxmVXBkYXRlQ2hhbm5lbDtcbiAgICB1cGRhdGVSZXBvPzogc3RyaW5nO1xuICAgIHVwZGF0ZVJlZj86IHN0cmluZztcbiAgICB1cGRhdGVDaGVjaz86IENvZGV4UGx1c1BsdXNVcGRhdGVDaGVjaztcbiAgfTtcbiAgLyoqIFBlci10d2VhayBlbmFibGUgZmxhZ3MuIE1pc3NpbmcgZW50cmllcyBkZWZhdWx0IHRvIGVuYWJsZWQuICovXG4gIHR3ZWFrcz86IFJlY29yZDxzdHJpbmcsIHsgZW5hYmxlZD86IGJvb2xlYW4gfT47XG4gIC8qKiBDYWNoZWQgR2l0SHViIHJlbGVhc2UgY2hlY2tzLiBSdW50aW1lIG5ldmVyIGF1dG8taW5zdGFsbHM7IHRoZSB1c2VyIGNhbiBjbGljayBVcGRhdGUgb24gdGhlIFR3ZWFrcyBwYWdlLiAqL1xuICB0d2Vha1VwZGF0ZUNoZWNrcz86IFJlY29yZDxzdHJpbmcsIFR3ZWFrVXBkYXRlQ2hlY2s+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvZGV4UGx1c1BsdXNVcGRhdGVDaGVjayB7XG4gIGNoZWNrZWRBdDogc3RyaW5nO1xuICBjdXJyZW50VmVyc2lvbjogc3RyaW5nO1xuICBsYXRlc3RWZXJzaW9uOiBzdHJpbmcgfCBudWxsO1xuICByZWxlYXNlVXJsOiBzdHJpbmcgfCBudWxsO1xuICByZWxlYXNlTm90ZXM6IHN0cmluZyB8IG51bGw7XG4gIHVwZGF0ZUF2YWlsYWJsZTogYm9vbGVhbjtcbiAgZXJyb3I/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCB0eXBlIFNlbGZVcGRhdGVDaGFubmVsID0gXCJzdGFibGVcIiB8IFwicHJlcmVsZWFzZVwiIHwgXCJjdXN0b21cIjtcbmV4cG9ydCB0eXBlIFNlbGZVcGRhdGVTdGF0dXMgPSBcImNoZWNraW5nXCIgfCBcInVwLXRvLWRhdGVcIiB8IFwidXBkYXRlZFwiIHwgXCJmYWlsZWRcIiB8IFwiZGlzYWJsZWRcIjtcblxuZXhwb3J0IGludGVyZmFjZSBTZWxmVXBkYXRlU3RhdGUge1xuICBjaGVja2VkQXQ6IHN0cmluZztcbiAgY29tcGxldGVkQXQ/OiBzdHJpbmc7XG4gIHN0YXR1czogU2VsZlVwZGF0ZVN0YXR1cztcbiAgY3VycmVudFZlcnNpb246IHN0cmluZztcbiAgbGF0ZXN0VmVyc2lvbjogc3RyaW5nIHwgbnVsbDtcbiAgdGFyZ2V0UmVmOiBzdHJpbmcgfCBudWxsO1xuICByZWxlYXNlVXJsOiBzdHJpbmcgfCBudWxsO1xuICByZXBvOiBzdHJpbmc7XG4gIGNoYW5uZWw6IFNlbGZVcGRhdGVDaGFubmVsO1xuICBzb3VyY2VSb290OiBzdHJpbmc7XG4gIGluc3RhbGxhdGlvblNvdXJjZT86IEluc3RhbGxhdGlvblNvdXJjZTtcbiAgZXJyb3I/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5zdGFsbGF0aW9uU291cmNlIHtcbiAga2luZDogXCJnaXRodWItc291cmNlXCIgfCBcImhvbWVicmV3XCIgfCBcImxvY2FsLWRldlwiIHwgXCJzb3VyY2UtYXJjaGl2ZVwiIHwgXCJ1bmtub3duXCI7XG4gIGxhYmVsOiBzdHJpbmc7XG4gIGRldGFpbDogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFR3ZWFrVXBkYXRlQ2hlY2sge1xuICBjaGVja2VkQXQ6IHN0cmluZztcbiAgcmVwbzogc3RyaW5nO1xuICBjdXJyZW50VmVyc2lvbjogc3RyaW5nO1xuICBsYXRlc3RWZXJzaW9uOiBzdHJpbmcgfCBudWxsO1xuICBsYXRlc3RUYWc6IHN0cmluZyB8IG51bGw7XG4gIHJlbGVhc2VVcmw6IHN0cmluZyB8IG51bGw7XG4gIHVwZGF0ZUF2YWlsYWJsZTogYm9vbGVhbjtcbiAgcGlubmVkU2hhPzogc3RyaW5nO1xuICBlcnJvcj86IHN0cmluZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRTdGF0ZSgpOiBQZXJzaXN0ZWRTdGF0ZSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKENPTkZJR19GSUxFLCBcInV0ZjhcIikpIGFzIFBlcnNpc3RlZFN0YXRlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4ge307XG4gIH1cbn1cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVN0YXRlKHM6IFBlcnNpc3RlZFN0YXRlKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgd3JpdGVGaWxlU3luYyhDT05GSUdfRklMRSwgSlNPTi5zdHJpbmdpZnkocywgbnVsbCwgMikpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nKFwid2FyblwiLCBcIndyaXRlU3RhdGUgZmFpbGVkOlwiLCBTdHJpbmcoKGUgYXMgRXJyb3IpLm1lc3NhZ2UpKTtcbiAgfVxufVxuZXhwb3J0IGZ1bmN0aW9uIGlzQ29kZXhQbHVzUGx1c0F1dG9VcGRhdGVFbmFibGVkKCk6IGJvb2xlYW4ge1xuICByZXR1cm4gaXNMYXllckF1dG9VcGRhdGVFbmFibGVkKHJlYWRTdGF0ZSgpLmNvZGV4UGx1c1BsdXM/LmF1dG9VcGRhdGUpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHNldENvZGV4UGx1c1BsdXNBdXRvVXBkYXRlKGVuYWJsZWQ6IGJvb2xlYW4pOiB2b2lkIHtcbiAgY29uc3QgcyA9IHJlYWRTdGF0ZSgpO1xuICBzLmNvZGV4UGx1c1BsdXMgPz89IHt9O1xuICBzLmNvZGV4UGx1c1BsdXMuYXV0b1VwZGF0ZSA9IGVuYWJsZWQ7XG4gIHdyaXRlU3RhdGUocyk7XG59XG5leHBvcnQgZnVuY3Rpb24gc2V0Q29kZXhQbHVzUGx1c1VwZGF0ZUNvbmZpZyhjb25maWc6IHtcbiAgdXBkYXRlQ2hhbm5lbD86IFNlbGZVcGRhdGVDaGFubmVsO1xuICB1cGRhdGVSZXBvPzogc3RyaW5nO1xuICB1cGRhdGVSZWY/OiBzdHJpbmc7XG59KTogdm9pZCB7XG4gIGNvbnN0IHMgPSByZWFkU3RhdGUoKTtcbiAgcy5jb2RleFBsdXNQbHVzID8/PSB7fTtcbiAgaWYgKGNvbmZpZy51cGRhdGVDaGFubmVsKSBzLmNvZGV4UGx1c1BsdXMudXBkYXRlQ2hhbm5lbCA9IGNvbmZpZy51cGRhdGVDaGFubmVsO1xuICBpZiAoXCJ1cGRhdGVSZXBvXCIgaW4gY29uZmlnKSBzLmNvZGV4UGx1c1BsdXMudXBkYXRlUmVwbyA9IGNsZWFuT3B0aW9uYWxTdHJpbmcoY29uZmlnLnVwZGF0ZVJlcG8pO1xuICBpZiAoXCJ1cGRhdGVSZWZcIiBpbiBjb25maWcpIHMuY29kZXhQbHVzUGx1cy51cGRhdGVSZWYgPSBjbGVhbk9wdGlvbmFsU3RyaW5nKGNvbmZpZy51cGRhdGVSZWYpO1xuICB3cml0ZVN0YXRlKHMpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGlzQ29kZXhQbHVzUGx1c1NhZmVNb2RlRW5hYmxlZCgpOiBib29sZWFuIHtcbiAgcmV0dXJuIHJlYWRTdGF0ZSgpLmNvZGV4UGx1c1BsdXM/LnNhZmVNb2RlID09PSB0cnVlO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGlzVHdlYWtFbmFibGVkKGlkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgcyA9IHJlYWRTdGF0ZSgpO1xuICBpZiAocy5jb2RleFBsdXNQbHVzPy5zYWZlTW9kZSA9PT0gdHJ1ZSkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gcy50d2Vha3M/LltpZF0/LmVuYWJsZWQgIT09IGZhbHNlO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHNldFR3ZWFrRW5hYmxlZChpZDogc3RyaW5nLCBlbmFibGVkOiBib29sZWFuKTogdm9pZCB7XG4gIGNvbnN0IHMgPSByZWFkU3RhdGUoKTtcbiAgcy50d2Vha3MgPz89IHt9O1xuICBzLnR3ZWFrc1tpZF0gPSB7IC4uLnMudHdlYWtzW2lkXSwgZW5hYmxlZCB9O1xuICB3cml0ZVN0YXRlKHMpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEluc3RhbGxlclN0YXRlIHtcbiAgYXBwUm9vdDogc3RyaW5nO1xuICBjb2RleFZlcnNpb246IHN0cmluZyB8IG51bGw7XG4gIHNvdXJjZVJvb3Q/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkSW5zdGFsbGVyU3RhdGUoKTogSW5zdGFsbGVyU3RhdGUgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMoSU5TVEFMTEVSX1NUQVRFX0ZJTEUsIFwidXRmOFwiKSkgYXMgSW5zdGFsbGVyU3RhdGU7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkU2VsZlVwZGF0ZVN0YXRlKCk6IFNlbGZVcGRhdGVTdGF0ZSB8IG51bGwge1xuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhTRUxGX1VQREFURV9TVEFURV9GSUxFLCBcInV0ZjhcIikpIGFzIFNlbGZVcGRhdGVTdGF0ZTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVNlbGZVcGRhdGVTdGF0ZShzdGF0ZTogU2VsZlVwZGF0ZVN0YXRlKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgd3JpdGVGaWxlU3luYyhTRUxGX1VQREFURV9TVEFURV9GSUxFLCBKU09OLnN0cmluZ2lmeShzdGF0ZSwgbnVsbCwgMikpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nKFwid2FyblwiLCBcIndyaXRlU2VsZlVwZGF0ZVN0YXRlIGZhaWxlZDpcIiwgU3RyaW5nKChlIGFzIEVycm9yKS5tZXNzYWdlKSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFuT3B0aW9uYWxTdHJpbmcodmFsdWU6IHVua25vd24pOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSByZXR1cm4gdW5kZWZpbmVkO1xuICBjb25zdCB0cmltbWVkID0gdmFsdWUudHJpbSgpO1xuICByZXR1cm4gdHJpbW1lZCA/IHRyaW1tZWQgOiB1bmRlZmluZWQ7XG59XG4iLCAiaW1wb3J0IHsgY3BTeW5jLCBleGlzdHNTeW5jLCBta2RpclN5bmMsIG1rZHRlbXBTeW5jLCByZWFkZGlyU3luYywgcmVhZEZpbGVTeW5jLCBybVN5bmMsIHN0YXRTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IHNwYXduU3luYyB9IGZyb20gXCJub2RlOmNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCB7IGNyZWF0ZUhhc2ggfSBmcm9tIFwibm9kZTpjcnlwdG9cIjtcbmltcG9ydCB7IGpvaW4sIHJlbGF0aXZlIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuaW1wb3J0IHsgdG1wZGlyIH0gZnJvbSBcIm5vZGU6b3NcIjtcbmltcG9ydCB0eXBlIHsgVHdlYWtNYW5pZmVzdCB9IGZyb20gXCJAY29kZXgtcGx1c3BsdXMvc2RrXCI7XG5pbXBvcnQgeyBhc3NlcnRTdG9yZUluZGV4TWF0Y2hlc1BpbiB9IGZyb20gXCIuL3R3ZWFrLXN0b3JlLWludGVncml0eVwiO1xuaW1wb3J0IHtcbiAgbm9ybWFsaXplR2l0SHViUmVwbyxcbiAgbm9ybWFsaXplU3RvcmVSZWdpc3RyeSxcbiAgc3RvcmVBcmNoaXZlVXJsLFxuICB0eXBlIFR3ZWFrU3RvcmVQdWJsaXNoU3VibWlzc2lvbixcbiAgdHlwZSBUd2Vha1N0b3JlRW50cnksXG4gIHR5cGUgVHdlYWtTdG9yZVJlZ2lzdHJ5LFxuICB0eXBlIFR3ZWFrU3RvcmVQbGF0Zm9ybSxcbn0gZnJvbSBcIi4vdHdlYWstc3RvcmVcIjtcbmltcG9ydCB7XG4gIENPREVYX1BMVVNQTFVTX1ZFUlNJT04sXG4gIFRXRUFLX1NUT1JFX0lOREVYX1VSTCxcbiAgVFdFQUtTX0RJUixcbiAgbG9nLFxuICBydW50aW1lRGlyLFxufSBmcm9tIFwiLi9ydW50aW1lLXBhdGhzXCI7XG5cbmV4cG9ydCBjb25zdCBWRVJTSU9OX1JFID0gL152PyhcXGQrKVxcLihcXGQrKVxcLihcXGQrKSg/OlstK10uKik/JC87XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHdlYWtTdG9yZUZldGNoUmVzdWx0IHtcbiAgcmVnaXN0cnk6IFR3ZWFrU3RvcmVSZWdpc3RyeTtcbiAgZmV0Y2hlZEF0OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3RvcmVJbnN0YWxsTWV0YWRhdGEge1xuICByZXBvOiBzdHJpbmc7XG4gIGFwcHJvdmVkQ29tbWl0U2hhOiBzdHJpbmc7XG4gIGluc3RhbGxlZEF0OiBzdHJpbmc7XG4gIHN0b3JlSW5kZXhVcmw6IHN0cmluZztcbiAgZmlsZXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGliaWxpdHkge1xuICBjdXJyZW50OiBOb2RlSlMuUGxhdGZvcm07XG4gIHN1cHBvcnRlZDogVHdlYWtTdG9yZVBsYXRmb3JtW10gfCBudWxsO1xuICBjb21wYXRpYmxlOiBib29sZWFuO1xuICByZWFzb246IHN0cmluZyB8IG51bGw7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3RvcmVFbnRyeVJ1bnRpbWVDb21wYXRpYmlsaXR5IHtcbiAgY3VycmVudDogc3RyaW5nO1xuICByZXF1aXJlZDogc3RyaW5nIHwgbnVsbDtcbiAgY29tcGF0aWJsZTogYm9vbGVhbjtcbiAgcmVhc29uOiBzdHJpbmcgfCBudWxsO1xufVxuXG5leHBvcnQgY2xhc3MgU3RvcmVUd2Vha01vZGlmaWVkRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHR3ZWFrTmFtZTogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBgJHt0d2Vha05hbWV9IGhhcyBsb2NhbCBzb3VyY2UgY2hhbmdlcywgc28gQ29kZXgrKyBjYW4ndCBhdXRvLXVwZGF0ZSBpdC4gUmV2ZXJ0IHlvdXIgbG9jYWwgY2hhbmdlcyBvciByZWluc3RhbGwgdGhlIHR3ZWFrIG1hbnVhbGx5LmAsXG4gICAgKTtcbiAgICB0aGlzLm5hbWUgPSBcIlN0b3JlVHdlYWtNb2RpZmllZEVycm9yXCI7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGliaWxpdHkoZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSk6IFN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGliaWxpdHkge1xuICBjb25zdCBzdXBwb3J0ZWQgPSBlbnRyeS5wbGF0Zm9ybXMgPz8gbnVsbDtcbiAgY29uc3QgY29tcGF0aWJsZSA9ICFzdXBwb3J0ZWQgfHwgc3VwcG9ydGVkLmluY2x1ZGVzKHByb2Nlc3MucGxhdGZvcm0gYXMgVHdlYWtTdG9yZVBsYXRmb3JtKTtcbiAgcmV0dXJuIHtcbiAgICBjdXJyZW50OiBwcm9jZXNzLnBsYXRmb3JtLFxuICAgIHN1cHBvcnRlZCxcbiAgICBjb21wYXRpYmxlLFxuICAgIHJlYXNvbjogY29tcGF0aWJsZSA/IG51bGwgOiBgJHtlbnRyeS5tYW5pZmVzdC5uYW1lfSBpcyBvbmx5IGF2YWlsYWJsZSBvbiAke2Zvcm1hdFN0b3JlUGxhdGZvcm1zKHN1cHBvcnRlZCl9LmAsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRTdG9yZUVudHJ5UGxhdGZvcm1Db21wYXRpYmxlKGVudHJ5OiBUd2Vha1N0b3JlRW50cnkpOiB2b2lkIHtcbiAgY29uc3QgcGxhdGZvcm0gPSBzdG9yZUVudHJ5UGxhdGZvcm1Db21wYXRpYmlsaXR5KGVudHJ5KTtcbiAgaWYgKCFwbGF0Zm9ybS5jb21wYXRpYmxlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKHBsYXRmb3JtLnJlYXNvbiA/PyBgJHtlbnRyeS5tYW5pZmVzdC5uYW1lfSBpcyBub3QgYXZhaWxhYmxlIG9uIHRoaXMgcGxhdGZvcm0uYCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0b3JlRW50cnlSdW50aW1lQ29tcGF0aWJpbGl0eShlbnRyeTogVHdlYWtTdG9yZUVudHJ5KTogU3RvcmVFbnRyeVJ1bnRpbWVDb21wYXRpYmlsaXR5IHtcbiAgY29uc3QgcmVxdWlyZWQgPSBjbGVhbk1pblJ1bnRpbWUoZW50cnkubWFuaWZlc3QubWluUnVudGltZSk7XG4gIGNvbnN0IGNvbXBhdGlibGUgPSAhcmVxdWlyZWQgfHwgY29tcGFyZVZlcnNpb25zKENPREVYX1BMVVNQTFVTX1ZFUlNJT04sIHJlcXVpcmVkKSA+PSAwO1xuICByZXR1cm4ge1xuICAgIGN1cnJlbnQ6IENPREVYX1BMVVNQTFVTX1ZFUlNJT04sXG4gICAgcmVxdWlyZWQsXG4gICAgY29tcGF0aWJsZSxcbiAgICByZWFzb246IGNvbXBhdGlibGUgfHwgIXJlcXVpcmVkXG4gICAgICA/IG51bGxcbiAgICAgIDogYCR7ZW50cnkubWFuaWZlc3QubmFtZX0gcmVxdWlyZXMgQ29kZXgrKyAke3JlcXVpcmVkfSBvciBuZXdlci5gLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0U3RvcmVFbnRyeVJ1bnRpbWVDb21wYXRpYmxlKGVudHJ5OiBUd2Vha1N0b3JlRW50cnkpOiB2b2lkIHtcbiAgY29uc3QgcnVudGltZSA9IHN0b3JlRW50cnlSdW50aW1lQ29tcGF0aWJpbGl0eShlbnRyeSk7XG4gIGlmICghcnVudGltZS5jb21wYXRpYmxlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKHJ1bnRpbWUucmVhc29uID8/IGAke2VudHJ5Lm1hbmlmZXN0Lm5hbWV9IHJlcXVpcmVzIGEgbmV3ZXIgQ29kZXgrKyBydW50aW1lLmApO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbGVhbk1pblJ1bnRpbWUodmFsdWU6IHVua25vd24pOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIikgcmV0dXJuIG51bGw7XG4gIGNvbnN0IHZlcnNpb24gPSBub3JtYWxpemVWZXJzaW9uKHZhbHVlLnJlcGxhY2UoL14+PT9cXHMqLywgXCJcIikpO1xuICByZXR1cm4gVkVSU0lPTl9SRS50ZXN0KHZlcnNpb24pID8gdmVyc2lvbiA6IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRTdG9yZVBsYXRmb3JtcyhwbGF0Zm9ybXM6IFR3ZWFrU3RvcmVQbGF0Zm9ybVtdIHwgbnVsbCk6IHN0cmluZyB7XG4gIGlmICghcGxhdGZvcm1zIHx8IHBsYXRmb3Jtcy5sZW5ndGggPT09IDApIHJldHVybiBcInN1cHBvcnRlZCBwbGF0Zm9ybXNcIjtcbiAgcmV0dXJuIHBsYXRmb3Jtcy5tYXAoKHBsYXRmb3JtKSA9PiB7XG4gICAgaWYgKHBsYXRmb3JtID09PSBcImRhcndpblwiKSByZXR1cm4gXCJtYWNPU1wiO1xuICAgIGlmIChwbGF0Zm9ybSA9PT0gXCJ3aW4zMlwiKSByZXR1cm4gXCJXaW5kb3dzXCI7XG4gICAgcmV0dXJuIFwiTGludXhcIjtcbiAgfSkuam9pbihcIiwgXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZEJ1bmRsZWRTdG9yZVJlZ2lzdHJ5KCk6IFR3ZWFrU3RvcmVSZWdpc3RyeSB8IG51bGwge1xuICBjb25zdCBidW5kbGVkID0gam9pbihydW50aW1lRGlyISwgXCJzdG9yZS1pbmRleC5qc29uXCIpO1xuICBpZiAoIWV4aXN0c1N5bmMoYnVuZGxlZCkpIHJldHVybiBudWxsO1xuICB0cnkge1xuICAgIGNvbnN0IGJvZHkgPSByZWFkRmlsZVN5bmMoYnVuZGxlZCk7XG4gICAgaWYgKCFwcm9jZXNzLmVudi5DT0RFWF9QTFVTUExVU19BTExPV19TVE9SRV9JTkRFWF9PVkVSUklERSkge1xuICAgICAgYXNzZXJ0U3RvcmVJbmRleE1hdGNoZXNQaW4oYm9keSk7XG4gICAgfVxuICAgIHJldHVybiBub3JtYWxpemVTdG9yZVJlZ2lzdHJ5KEpTT04ucGFyc2UoYm9keS50b1N0cmluZyhcInV0ZjhcIikpKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZyhcIndhcm5cIiwgXCJidW5kbGVkIHN0b3JlIGluZGV4IHJlamVjdGVkOlwiLCBTdHJpbmcoKGUgYXMgRXJyb3IpLm1lc3NhZ2UpKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmV0Y2hUd2Vha1N0b3JlUmVnaXN0cnkoKTogUHJvbWlzZTxUd2Vha1N0b3JlRmV0Y2hSZXN1bHQ+IHtcbiAgY29uc3QgZmV0Y2hlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICBjb25zdCBhbGxvd092ZXJyaWRlID0gcHJvY2Vzcy5lbnYuQ09ERVhfUExVU1BMVVNfQUxMT1dfU1RPUkVfSU5ERVhfT1ZFUlJJREUgPT09IFwiMVwiO1xuICB0cnkge1xuICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgY29uc3QgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4gY29udHJvbGxlci5hYm9ydCgpLCA4MDAwKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goVFdFQUtfU1RPUkVfSU5ERVhfVVJMLCB7XG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICBcIkFjY2VwdFwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgICBcIlVzZXItQWdlbnRcIjogYGNvZGV4LXBsdXNwbHVzLyR7Q09ERVhfUExVU1BMVVNfVkVSU0lPTn1gLFxuICAgICAgICB9LFxuICAgICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLFxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlcy5vaykgdGhyb3cgbmV3IEVycm9yKGBzdG9yZSByZXR1cm5lZCAke3Jlcy5zdGF0dXN9YCk7XG4gICAgICBjb25zdCBib2R5ID0gQnVmZmVyLmZyb20oYXdhaXQgcmVzLmFycmF5QnVmZmVyKCkpO1xuICAgICAgaWYgKCFhbGxvd092ZXJyaWRlKSBhc3NlcnRTdG9yZUluZGV4TWF0Y2hlc1Bpbihib2R5KTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlZ2lzdHJ5OiBub3JtYWxpemVTdG9yZVJlZ2lzdHJ5KEpTT04ucGFyc2UoYm9keS50b1N0cmluZyhcInV0ZjhcIikpKSxcbiAgICAgICAgZmV0Y2hlZEF0LFxuICAgICAgfTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnN0IGVycm9yID0gZSBpbnN0YW5jZW9mIEVycm9yID8gZSA6IG5ldyBFcnJvcihTdHJpbmcoZSkpO1xuICAgIGNvbnN0IGJ1bmRsZWQgPSByZWFkQnVuZGxlZFN0b3JlUmVnaXN0cnkoKTtcbiAgICBpZiAoYnVuZGxlZCkge1xuICAgICAgbG9nKFwid2FyblwiLCBcInVzaW5nIGJ1bmRsZWQgc3RvcmUgaW5kZXggcGluOlwiLCBlcnJvci5tZXNzYWdlKTtcbiAgICAgIHJldHVybiB7IHJlZ2lzdHJ5OiBidW5kbGVkLCBmZXRjaGVkQXQgfTtcbiAgICB9XG4gICAgbG9nKFwid2FyblwiLCBcImZhaWxlZCB0byBmZXRjaCB0d2VhayBzdG9yZSByZWdpc3RyeTpcIiwgZXJyb3IubWVzc2FnZSk7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc3RhbGxTdG9yZVR3ZWFrKGVudHJ5OiBUd2Vha1N0b3JlRW50cnkpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgdXJsID0gc3RvcmVBcmNoaXZlVXJsKGVudHJ5KTtcbiAgY29uc3Qgd29yayA9IG1rZHRlbXBTeW5jKGpvaW4odG1wZGlyKCksIFwiY29kZXhwcC1zdG9yZS10d2Vhay1cIikpO1xuICBjb25zdCBhcmNoaXZlID0gam9pbih3b3JrLCBcInNvdXJjZS50YXIuZ3pcIik7XG4gIGNvbnN0IGV4dHJhY3REaXIgPSBqb2luKHdvcmssIFwiZXh0cmFjdFwiKTtcbiAgY29uc3QgdGFyZ2V0ID0gam9pbihUV0VBS1NfRElSLCBlbnRyeS5pZCk7XG4gIGNvbnN0IHN0YWdlZFRhcmdldCA9IGpvaW4od29yaywgXCJzdGFnZWRcIiwgZW50cnkuaWQpO1xuXG4gIHRyeSB7XG4gICAgbG9nKFwiaW5mb1wiLCBgaW5zdGFsbGluZyBzdG9yZSB0d2VhayAke2VudHJ5LmlkfSBmcm9tICR7ZW50cnkucmVwb31AJHtlbnRyeS5hcHByb3ZlZENvbW1pdFNoYX1gKTtcbiAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgIGhlYWRlcnM6IHsgXCJVc2VyLUFnZW50XCI6IGBjb2RleC1wbHVzcGx1cy8ke0NPREVYX1BMVVNQTFVTX1ZFUlNJT059YCB9LFxuICAgICAgcmVkaXJlY3Q6IFwiZm9sbG93XCIsXG4gICAgfSk7XG4gICAgaWYgKCFyZXMub2spIHRocm93IG5ldyBFcnJvcihgZG93bmxvYWQgZmFpbGVkOiAke3Jlcy5zdGF0dXN9YCk7XG4gICAgY29uc3QgYnl0ZXMgPSBCdWZmZXIuZnJvbShhd2FpdCByZXMuYXJyYXlCdWZmZXIoKSk7XG4gICAgd3JpdGVGaWxlU3luYyhhcmNoaXZlLCBieXRlcyk7XG4gICAgbWtkaXJTeW5jKGV4dHJhY3REaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIGV4dHJhY3RUYXJBcmNoaXZlKGFyY2hpdmUsIGV4dHJhY3REaXIpO1xuICAgIGNvbnN0IHNvdXJjZSA9IGZpbmRUd2Vha1Jvb3QoZXh0cmFjdERpcik7XG4gICAgaWYgKCFzb3VyY2UpIHRocm93IG5ldyBFcnJvcihcImRvd25sb2FkZWQgYXJjaGl2ZSBkaWQgbm90IGNvbnRhaW4gbWFuaWZlc3QuanNvblwiKTtcbiAgICB2YWxpZGF0ZVN0b3JlVHdlYWtTb3VyY2UoZW50cnksIHNvdXJjZSk7XG4gICAgcm1TeW5jKHN0YWdlZFRhcmdldCwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xuICAgIGNvcHlUd2Vha1NvdXJjZShzb3VyY2UsIHN0YWdlZFRhcmdldCk7XG4gICAgY29uc3Qgc3RhZ2VkRmlsZXMgPSBoYXNoVHdlYWtTb3VyY2Uoc3RhZ2VkVGFyZ2V0KTtcbiAgICB3cml0ZUZpbGVTeW5jKFxuICAgICAgam9pbihzdGFnZWRUYXJnZXQsIFwiLmNvZGV4cHAtc3RvcmUuanNvblwiKSxcbiAgICAgIEpTT04uc3RyaW5naWZ5KFxuICAgICAgICB7XG4gICAgICAgICAgcmVwbzogZW50cnkucmVwbyxcbiAgICAgICAgICBhcHByb3ZlZENvbW1pdFNoYTogZW50cnkuYXBwcm92ZWRDb21taXRTaGEsXG4gICAgICAgICAgaW5zdGFsbGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICBzdG9yZUluZGV4VXJsOiBUV0VBS19TVE9SRV9JTkRFWF9VUkwsXG4gICAgICAgICAgZmlsZXM6IHN0YWdlZEZpbGVzLFxuICAgICAgICB9LFxuICAgICAgICBudWxsLFxuICAgICAgICAyLFxuICAgICAgKSxcbiAgICApO1xuICAgIGF3YWl0IGFzc2VydFN0b3JlVHdlYWtDbGVhbkZvckF1dG9VcGRhdGUoZW50cnksIHRhcmdldCwgd29yayk7XG4gICAgcm1TeW5jKHRhcmdldCwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xuICAgIGNwU3luYyhzdGFnZWRUYXJnZXQsIHRhcmdldCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gIH0gZmluYWxseSB7XG4gICAgcm1TeW5jKHdvcmssIHsgcmVjdXJzaXZlOiB0cnVlLCBmb3JjZTogdHJ1ZSB9KTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcHJlcGFyZVR3ZWFrU3RvcmVTdWJtaXNzaW9uKHJlcG9JbnB1dDogc3RyaW5nKTogUHJvbWlzZTxUd2Vha1N0b3JlUHVibGlzaFN1Ym1pc3Npb24+IHtcbiAgY29uc3QgcmVwbyA9IG5vcm1hbGl6ZUdpdEh1YlJlcG8ocmVwb0lucHV0KTtcbiAgY29uc3QgcmVwb0luZm8gPSBhd2FpdCBmZXRjaEdpdGh1Ykpzb248eyBkZWZhdWx0X2JyYW5jaD86IHN0cmluZyB9PihgaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9yZXBvcy8ke3JlcG99YCk7XG4gIGNvbnN0IGRlZmF1bHRCcmFuY2ggPSByZXBvSW5mby5kZWZhdWx0X2JyYW5jaDtcbiAgaWYgKCFkZWZhdWx0QnJhbmNoKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCByZXNvbHZlIGRlZmF1bHQgYnJhbmNoIGZvciAke3JlcG99YCk7XG5cbiAgY29uc3QgY29tbWl0ID0gYXdhaXQgZmV0Y2hHaXRodWJKc29uPHtcbiAgICBzaGE/OiBzdHJpbmc7XG4gICAgaHRtbF91cmw/OiBzdHJpbmc7XG4gIH0+KGBodHRwczovL2FwaS5naXRodWIuY29tL3JlcG9zLyR7cmVwb30vY29tbWl0cy8ke2VuY29kZVVSSUNvbXBvbmVudChkZWZhdWx0QnJhbmNoKX1gKTtcbiAgaWYgKCFjb21taXQuc2hhKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCByZXNvbHZlIGN1cnJlbnQgY29tbWl0IGZvciAke3JlcG99YCk7XG5cbiAgY29uc3QgbWFuaWZlc3QgPSBhd2FpdCBmZXRjaE1hbmlmZXN0QXRDb21taXQocmVwbywgY29tbWl0LnNoYSkuY2F0Y2goKGUpID0+IHtcbiAgICBsb2coXCJ3YXJuXCIsIGBjb3VsZCBub3QgcmVhZCBtYW5pZmVzdCBmb3Igc3RvcmUgc3VibWlzc2lvbiAke3JlcG99QCR7Y29tbWl0LnNoYX06YCwgZSk7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICByZXBvLFxuICAgIGRlZmF1bHRCcmFuY2gsXG4gICAgY29tbWl0U2hhOiBjb21taXQuc2hhLFxuICAgIGNvbW1pdFVybDogY29tbWl0Lmh0bWxfdXJsID8/IGBodHRwczovL2dpdGh1Yi5jb20vJHtyZXBvfS9jb21taXQvJHtjb21taXQuc2hhfWAsXG4gICAgbWFuaWZlc3Q6IG1hbmlmZXN0XG4gICAgICA/IHtcbiAgICAgICAgICBpZDogdHlwZW9mIG1hbmlmZXN0LmlkID09PSBcInN0cmluZ1wiID8gbWFuaWZlc3QuaWQgOiB1bmRlZmluZWQsXG4gICAgICAgICAgbmFtZTogdHlwZW9mIG1hbmlmZXN0Lm5hbWUgPT09IFwic3RyaW5nXCIgPyBtYW5pZmVzdC5uYW1lIDogdW5kZWZpbmVkLFxuICAgICAgICAgIHZlcnNpb246IHR5cGVvZiBtYW5pZmVzdC52ZXJzaW9uID09PSBcInN0cmluZ1wiID8gbWFuaWZlc3QudmVyc2lvbiA6IHVuZGVmaW5lZCxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogdHlwZW9mIG1hbmlmZXN0LmRlc2NyaXB0aW9uID09PSBcInN0cmluZ1wiID8gbWFuaWZlc3QuZGVzY3JpcHRpb24gOiB1bmRlZmluZWQsXG4gICAgICAgICAgaWNvblVybDogdHlwZW9mIG1hbmlmZXN0Lmljb25VcmwgPT09IFwic3RyaW5nXCIgPyBtYW5pZmVzdC5pY29uVXJsIDogdW5kZWZpbmVkLFxuICAgICAgICB9XG4gICAgICA6IHVuZGVmaW5lZCxcbiAgfTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hHaXRodWJKc29uPFQ+KHVybDogc3RyaW5nKTogUHJvbWlzZTxUPiB7XG4gIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gIGNvbnN0IHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IGNvbnRyb2xsZXIuYWJvcnQoKSwgODAwMCk7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiQWNjZXB0XCI6IFwiYXBwbGljYXRpb24vdm5kLmdpdGh1Yitqc29uXCIsXG4gICAgICAgIFwiVXNlci1BZ2VudFwiOiBgY29kZXgtcGx1c3BsdXMvJHtDT0RFWF9QTFVTUExVU19WRVJTSU9OfWAsXG4gICAgICB9LFxuICAgICAgc2lnbmFsOiBjb250cm9sbGVyLnNpZ25hbCxcbiAgICB9KTtcbiAgICBpZiAoIXJlcy5vaykgdGhyb3cgbmV3IEVycm9yKGBHaXRIdWIgcmV0dXJuZWQgJHtyZXMuc3RhdHVzfWApO1xuICAgIHJldHVybiBhd2FpdCByZXMuanNvbigpIGFzIFQ7XG4gIH0gZmluYWxseSB7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZldGNoTWFuaWZlc3RBdENvbW1pdChyZXBvOiBzdHJpbmcsIGNvbW1pdFNoYTogc3RyaW5nKTogUHJvbWlzZTxQYXJ0aWFsPFR3ZWFrTWFuaWZlc3Q+PiB7XG4gIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKGBodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vJHtyZXBvfS8ke2NvbW1pdFNoYX0vbWFuaWZlc3QuanNvbmAsIHtcbiAgICBoZWFkZXJzOiB7XG4gICAgICBcIkFjY2VwdFwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgIFwiVXNlci1BZ2VudFwiOiBgY29kZXgtcGx1c3BsdXMvJHtDT0RFWF9QTFVTUExVU19WRVJTSU9OfWAsXG4gICAgfSxcbiAgfSk7XG4gIGlmICghcmVzLm9rKSB0aHJvdyBuZXcgRXJyb3IoYG1hbmlmZXN0IGZldGNoIHJldHVybmVkICR7cmVzLnN0YXR1c31gKTtcbiAgcmV0dXJuIGF3YWl0IHJlcy5qc29uKCkgYXMgUGFydGlhbDxUd2Vha01hbmlmZXN0Pjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RUYXJBcmNoaXZlKGFyY2hpdmU6IHN0cmluZywgdGFyZ2V0RGlyOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgcmVzdWx0ID0gc3Bhd25TeW5jKFwidGFyXCIsIFtcIi14emZcIiwgYXJjaGl2ZSwgXCItQ1wiLCB0YXJnZXREaXJdLCB7XG4gICAgZW5jb2Rpbmc6IFwidXRmOFwiLFxuICAgIHN0ZGlvOiBbXCJpZ25vcmVcIiwgXCJwaXBlXCIsIFwicGlwZVwiXSxcbiAgfSk7XG4gIGlmIChyZXN1bHQuc3RhdHVzICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGB0YXIgZXh0cmFjdGlvbiBmYWlsZWQ6ICR7cmVzdWx0LnN0ZGVyciB8fCByZXN1bHQuc3Rkb3V0IHx8IHJlc3VsdC5zdGF0dXN9YCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlU3RvcmVUd2Vha1NvdXJjZShlbnRyeTogVHdlYWtTdG9yZUVudHJ5LCBzb3VyY2U6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBtYW5pZmVzdFBhdGggPSBqb2luKHNvdXJjZSwgXCJtYW5pZmVzdC5qc29uXCIpO1xuICBjb25zdCBtYW5pZmVzdCA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKG1hbmlmZXN0UGF0aCwgXCJ1dGY4XCIpKSBhcyBUd2Vha01hbmlmZXN0O1xuICBpZiAobWFuaWZlc3QuaWQgIT09IGVudHJ5Lm1hbmlmZXN0LmlkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBkb3dubG9hZGVkIHR3ZWFrIGlkICR7bWFuaWZlc3QuaWR9IGRvZXMgbm90IG1hdGNoIGFwcHJvdmVkIGlkICR7ZW50cnkubWFuaWZlc3QuaWR9YCk7XG4gIH1cbiAgaWYgKG1hbmlmZXN0LmdpdGh1YlJlcG8gIT09IGVudHJ5LnJlcG8pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGRvd25sb2FkZWQgdHdlYWsgcmVwbyAke21hbmlmZXN0LmdpdGh1YlJlcG99IGRvZXMgbm90IG1hdGNoIGFwcHJvdmVkIHJlcG8gJHtlbnRyeS5yZXBvfWApO1xuICB9XG4gIGlmIChtYW5pZmVzdC52ZXJzaW9uICE9PSBlbnRyeS5tYW5pZmVzdC52ZXJzaW9uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBkb3dubG9hZGVkIHR3ZWFrIHZlcnNpb24gJHttYW5pZmVzdC52ZXJzaW9ufSBkb2VzIG5vdCBtYXRjaCBhcHByb3ZlZCB2ZXJzaW9uICR7ZW50cnkubWFuaWZlc3QudmVyc2lvbn1gKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZFR3ZWFrUm9vdChkaXI6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICBpZiAoIWV4aXN0c1N5bmMoZGlyKSkgcmV0dXJuIG51bGw7XG4gIGlmIChleGlzdHNTeW5jKGpvaW4oZGlyLCBcIm1hbmlmZXN0Lmpzb25cIikpKSByZXR1cm4gZGlyO1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgcmVhZGRpclN5bmMoZGlyKSkge1xuICAgIGNvbnN0IGNoaWxkID0gam9pbihkaXIsIG5hbWUpO1xuICAgIHRyeSB7XG4gICAgICBpZiAoIXN0YXRTeW5jKGNoaWxkKS5pc0RpcmVjdG9yeSgpKSBjb250aW51ZTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCBmb3VuZCA9IGZpbmRUd2Vha1Jvb3QoY2hpbGQpO1xuICAgIGlmIChmb3VuZCkgcmV0dXJuIGZvdW5kO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY29weVR3ZWFrU291cmNlKHNvdXJjZTogc3RyaW5nLCB0YXJnZXQ6IHN0cmluZyk6IHZvaWQge1xuICBjcFN5bmMoc291cmNlLCB0YXJnZXQsIHtcbiAgICByZWN1cnNpdmU6IHRydWUsXG4gICAgZmlsdGVyOiAoc3JjKSA9PiAhLyhefFsvXFxcXF0pKD86XFwuZ2l0fG5vZGVfbW9kdWxlcykoPzpbL1xcXFxdfCQpLy50ZXN0KHNyYyksXG4gIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBhc3NlcnRTdG9yZVR3ZWFrQ2xlYW5Gb3JBdXRvVXBkYXRlKFxuICBlbnRyeTogVHdlYWtTdG9yZUVudHJ5LFxuICB0YXJnZXQ6IHN0cmluZyxcbiAgd29yazogc3RyaW5nLFxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmICghZXhpc3RzU3luYyh0YXJnZXQpKSByZXR1cm47XG4gIGNvbnN0IG1ldGFkYXRhID0gcmVhZFN0b3JlSW5zdGFsbE1ldGFkYXRhKHRhcmdldCk7XG4gIGlmICghbWV0YWRhdGEpIHJldHVybjtcbiAgaWYgKG1ldGFkYXRhLnJlcG8gIT09IGVudHJ5LnJlcG8pIHtcbiAgICB0aHJvdyBuZXcgU3RvcmVUd2Vha01vZGlmaWVkRXJyb3IoZW50cnkubWFuaWZlc3QubmFtZSk7XG4gIH1cbiAgY29uc3QgY3VycmVudEZpbGVzID0gaGFzaFR3ZWFrU291cmNlKHRhcmdldCk7XG4gIGNvbnN0IGJhc2VsaW5lRmlsZXMgPSBtZXRhZGF0YS5maWxlcyA/PyBhd2FpdCBmZXRjaEJhc2VsaW5lU3RvcmVUd2Vha0hhc2hlcyhtZXRhZGF0YSwgd29yayk7XG4gIGlmICghc2FtZUZpbGVIYXNoZXMoY3VycmVudEZpbGVzLCBiYXNlbGluZUZpbGVzKSkge1xuICAgIHRocm93IG5ldyBTdG9yZVR3ZWFrTW9kaWZpZWRFcnJvcihlbnRyeS5tYW5pZmVzdC5uYW1lKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZFN0b3JlSW5zdGFsbE1ldGFkYXRhKHRhcmdldDogc3RyaW5nKTogU3RvcmVJbnN0YWxsTWV0YWRhdGEgfCBudWxsIHtcbiAgY29uc3QgbWV0YWRhdGFQYXRoID0gam9pbih0YXJnZXQsIFwiLmNvZGV4cHAtc3RvcmUuanNvblwiKTtcbiAgaWYgKCFleGlzdHNTeW5jKG1ldGFkYXRhUGF0aCkpIHJldHVybiBudWxsO1xuICB0cnkge1xuICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKG1ldGFkYXRhUGF0aCwgXCJ1dGY4XCIpKSBhcyBQYXJ0aWFsPFN0b3JlSW5zdGFsbE1ldGFkYXRhPjtcbiAgICBpZiAodHlwZW9mIHBhcnNlZC5yZXBvICE9PSBcInN0cmluZ1wiIHx8IHR5cGVvZiBwYXJzZWQuYXBwcm92ZWRDb21taXRTaGEgIT09IFwic3RyaW5nXCIpIHJldHVybiBudWxsO1xuICAgIHJldHVybiB7XG4gICAgICByZXBvOiBwYXJzZWQucmVwbyxcbiAgICAgIGFwcHJvdmVkQ29tbWl0U2hhOiBwYXJzZWQuYXBwcm92ZWRDb21taXRTaGEsXG4gICAgICBpbnN0YWxsZWRBdDogdHlwZW9mIHBhcnNlZC5pbnN0YWxsZWRBdCA9PT0gXCJzdHJpbmdcIiA/IHBhcnNlZC5pbnN0YWxsZWRBdCA6IFwiXCIsXG4gICAgICBzdG9yZUluZGV4VXJsOiB0eXBlb2YgcGFyc2VkLnN0b3JlSW5kZXhVcmwgPT09IFwic3RyaW5nXCIgPyBwYXJzZWQuc3RvcmVJbmRleFVybCA6IFwiXCIsXG4gICAgICBmaWxlczogaXNIYXNoUmVjb3JkKHBhcnNlZC5maWxlcykgPyBwYXJzZWQuZmlsZXMgOiB1bmRlZmluZWQsXG4gICAgfTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hCYXNlbGluZVN0b3JlVHdlYWtIYXNoZXMoXG4gIG1ldGFkYXRhOiBTdG9yZUluc3RhbGxNZXRhZGF0YSxcbiAgd29yazogc3RyaW5nLFxuKTogUHJvbWlzZTxSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+PiB7XG4gIGNvbnN0IGJhc2VsaW5lRGlyID0gam9pbih3b3JrLCBcImJhc2VsaW5lXCIpO1xuICBjb25zdCBhcmNoaXZlID0gam9pbih3b3JrLCBcImJhc2VsaW5lLnRhci5nelwiKTtcbiAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goYGh0dHBzOi8vY29kZWxvYWQuZ2l0aHViLmNvbS8ke21ldGFkYXRhLnJlcG99L3Rhci5nei8ke21ldGFkYXRhLmFwcHJvdmVkQ29tbWl0U2hhfWAsIHtcbiAgICBoZWFkZXJzOiB7IFwiVXNlci1BZ2VudFwiOiBgY29kZXgtcGx1c3BsdXMvJHtDT0RFWF9QTFVTUExVU19WRVJTSU9OfWAgfSxcbiAgICByZWRpcmVjdDogXCJmb2xsb3dcIixcbiAgfSk7XG4gIGlmICghcmVzLm9rKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCB2ZXJpZnkgbG9jYWwgdHdlYWsgY2hhbmdlcyBiZWZvcmUgdXBkYXRlOiAke3Jlcy5zdGF0dXN9YCk7XG4gIHdyaXRlRmlsZVN5bmMoYXJjaGl2ZSwgQnVmZmVyLmZyb20oYXdhaXQgcmVzLmFycmF5QnVmZmVyKCkpKTtcbiAgbWtkaXJTeW5jKGJhc2VsaW5lRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgZXh0cmFjdFRhckFyY2hpdmUoYXJjaGl2ZSwgYmFzZWxpbmVEaXIpO1xuICBjb25zdCBzb3VyY2UgPSBmaW5kVHdlYWtSb290KGJhc2VsaW5lRGlyKTtcbiAgaWYgKCFzb3VyY2UpIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCB2ZXJpZnkgbG9jYWwgdHdlYWsgY2hhbmdlcyBiZWZvcmUgdXBkYXRlOiBiYXNlbGluZSBtYW5pZmVzdCBtaXNzaW5nXCIpO1xuICByZXR1cm4gaGFzaFR3ZWFrU291cmNlKHNvdXJjZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoYXNoVHdlYWtTb3VyY2Uocm9vdDogc3RyaW5nKTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiB7XG4gIGNvbnN0IG91dDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICBjb2xsZWN0VHdlYWtGaWxlSGFzaGVzKHJvb3QsIHJvb3QsIG91dCk7XG4gIHJldHVybiBvdXQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb2xsZWN0VHdlYWtGaWxlSGFzaGVzKHJvb3Q6IHN0cmluZywgZGlyOiBzdHJpbmcsIG91dDogUmVjb3JkPHN0cmluZywgc3RyaW5nPik6IHZvaWQge1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgcmVhZGRpclN5bmMoZGlyKS5zb3J0KCkpIHtcbiAgICBpZiAobmFtZSA9PT0gXCIuZ2l0XCIgfHwgbmFtZSA9PT0gXCJub2RlX21vZHVsZXNcIiB8fCBuYW1lID09PSBcIi5jb2RleHBwLXN0b3JlLmpzb25cIikgY29udGludWU7XG4gICAgY29uc3QgZnVsbCA9IGpvaW4oZGlyLCBuYW1lKTtcbiAgICBjb25zdCByZWwgPSByZWxhdGl2ZShyb290LCBmdWxsKS5zcGxpdChcIlxcXFxcIikuam9pbihcIi9cIik7XG4gICAgY29uc3Qgc3RhdCA9IHN0YXRTeW5jKGZ1bGwpO1xuICAgIGlmIChzdGF0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgIGNvbGxlY3RUd2Vha0ZpbGVIYXNoZXMocm9vdCwgZnVsbCwgb3V0KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAoIXN0YXQuaXNGaWxlKCkpIGNvbnRpbnVlO1xuICAgIG91dFtyZWxdID0gY3JlYXRlSGFzaChcInNoYTI1NlwiKS51cGRhdGUocmVhZEZpbGVTeW5jKGZ1bGwpKS5kaWdlc3QoXCJoZXhcIik7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNhbWVGaWxlSGFzaGVzKGE6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4sIGI6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pOiBib29sZWFuIHtcbiAgY29uc3QgYWsgPSBPYmplY3Qua2V5cyhhKS5zb3J0KCk7XG4gIGNvbnN0IGJrID0gT2JqZWN0LmtleXMoYikuc29ydCgpO1xuICBpZiAoYWsubGVuZ3RoICE9PSBiay5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBhay5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGtleSA9IGFrW2ldO1xuICAgIGlmIChrZXkgIT09IGJrW2ldIHx8IGFba2V5XSAhPT0gYltrZXldKSByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0hhc2hSZWNvcmQodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHtcbiAgaWYgKCF2YWx1ZSB8fCB0eXBlb2YgdmFsdWUgIT09IFwib2JqZWN0XCIgfHwgQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIE9iamVjdC52YWx1ZXModmFsdWUgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pLmV2ZXJ5KCh2KSA9PiB0eXBlb2YgdiA9PT0gXCJzdHJpbmdcIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVWZXJzaW9uKHY6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB2LnRyaW0oKS5yZXBsYWNlKC9edi9pLCBcIlwiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmVWZXJzaW9ucyhhOiBzdHJpbmcsIGI6IHN0cmluZyk6IG51bWJlciB7XG4gIGNvbnN0IGF2ID0gVkVSU0lPTl9SRS5leGVjKGEpO1xuICBjb25zdCBidiA9IFZFUlNJT05fUkUuZXhlYyhiKTtcbiAgaWYgKCFhdiB8fCAhYnYpIHJldHVybiAwO1xuICBmb3IgKGxldCBpID0gMTsgaSA8PSAzOyBpKyspIHtcbiAgICBjb25zdCBkaWZmID0gTnVtYmVyKGF2W2ldKSAtIE51bWJlcihidltpXSk7XG4gICAgaWYgKGRpZmYgIT09IDApIHJldHVybiBkaWZmO1xuICB9XG4gIHJldHVybiAwO1xufVxuIiwgImltcG9ydCB7IGNyZWF0ZUhhc2ggfSBmcm9tIFwibm9kZTpjcnlwdG9cIjtcbmltcG9ydCB7IFBJTk5FRF9UV0VBS19TVE9SRV9JTkRFWF9TSEEyNTYgfSBmcm9tIFwiLi90d2Vhay1zdG9yZVwiO1xuXG5leHBvcnQgZnVuY3Rpb24gaGFzaFN0b3JlSW5kZXgoYm9keTogc3RyaW5nIHwgQnVmZmVyKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNyZWF0ZUhhc2goXCJzaGEyNTZcIikudXBkYXRlKGJvZHkpLmRpZ2VzdChcImhleFwiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFN0b3JlSW5kZXhNYXRjaGVzUGluKFxuICBib2R5OiBzdHJpbmcgfCBCdWZmZXIsXG4gIGV4cGVjdGVkU2hhMjU2ID0gUElOTkVEX1RXRUFLX1NUT1JFX0lOREVYX1NIQTI1Nixcbik6IHZvaWQge1xuICBjb25zdCBoYXNoID0gaGFzaFN0b3JlSW5kZXgoYm9keSk7XG4gIGlmIChoYXNoICE9PSBleHBlY3RlZFNoYTI1Nikge1xuICAgIHRocm93IG5ldyBFcnJvcihgU3RvcmUgaW5kZXggaGFzaCAke2hhc2h9IGRvZXMgbm90IG1hdGNoIHJ1bnRpbWUgcGluICR7ZXhwZWN0ZWRTaGEyNTZ9YCk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBleGlzdHNTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGV4ZWNGaWxlU3luYywgc3Bhd24sIHNwYXduU3luYyB9IGZyb20gXCJub2RlOmNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCB7IGRpcm5hbWUsIGpvaW4sIHJlc29sdmUgfSBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgeyBob21lZGlyIH0gZnJvbSBcIm5vZGU6b3NcIjtcbmltcG9ydCB7XG4gIHJlYWRJbnN0YWxsZXJTdGF0ZSxcbiAgcmVhZFN0YXRlLFxuICB3cml0ZVNlbGZVcGRhdGVTdGF0ZSxcbiAgd3JpdGVTdGF0ZSxcbiAgdHlwZSBDb2RleFBsdXNQbHVzVXBkYXRlQ2hlY2ssXG4gIHR5cGUgSW5zdGFsbGF0aW9uU291cmNlLFxuICB0eXBlIFNlbGZVcGRhdGVDaGFubmVsLFxuICB0eXBlIFNlbGZVcGRhdGVTdGF0ZSxcbn0gZnJvbSBcIi4vY29uZmlnLXN0YXRlXCI7XG5pbXBvcnQge1xuICBDT0RFWF9QTFVTUExVU19SRVBPLFxuICBDT0RFWF9QTFVTUExVU19WRVJTSU9OLFxuICBTSUdORURfQ09ERVhfQkFDS1VQLFxuICBVUERBVEVfTU9ERV9GSUxFLFxuICBsb2csXG4gIHVzZXJSb290LFxufSBmcm9tIFwiLi9ydW50aW1lLXBhdGhzXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBpbnN0YWxsU3BhcmtsZVVwZGF0ZUhvb2soKTogdm9pZCB7XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtICE9PSBcImRhcndpblwiKSByZXR1cm47XG5cbiAgY29uc3QgTW9kdWxlID0gcmVxdWlyZShcIm5vZGU6bW9kdWxlXCIpIGFzIHR5cGVvZiBpbXBvcnQoXCJub2RlOm1vZHVsZVwiKSAmIHtcbiAgICBfbG9hZD86IChyZXF1ZXN0OiBzdHJpbmcsIHBhcmVudDogdW5rbm93biwgaXNNYWluOiBib29sZWFuKSA9PiB1bmtub3duO1xuICB9O1xuICBjb25zdCBvcmlnaW5hbExvYWQgPSBNb2R1bGUuX2xvYWQ7XG4gIGlmICh0eXBlb2Ygb3JpZ2luYWxMb2FkICE9PSBcImZ1bmN0aW9uXCIpIHJldHVybjtcblxuICBNb2R1bGUuX2xvYWQgPSBmdW5jdGlvbiBjb2RleFBsdXNQbHVzTW9kdWxlTG9hZChyZXF1ZXN0OiBzdHJpbmcsIHBhcmVudDogdW5rbm93biwgaXNNYWluOiBib29sZWFuKSB7XG4gICAgY29uc3QgbG9hZGVkID0gb3JpZ2luYWxMb2FkLmFwcGx5KHRoaXMsIFtyZXF1ZXN0LCBwYXJlbnQsIGlzTWFpbl0pIGFzIHVua25vd247XG4gICAgaWYgKHR5cGVvZiByZXF1ZXN0ID09PSBcInN0cmluZ1wiICYmIC9zcGFya2xlKD86XFwubm9kZSk/JC9pLnRlc3QocmVxdWVzdCkpIHtcbiAgICAgIHdyYXBTcGFya2xlRXhwb3J0cyhsb2FkZWQpO1xuICAgIH1cbiAgICByZXR1cm4gbG9hZGVkO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd3JhcFNwYXJrbGVFeHBvcnRzKGxvYWRlZDogdW5rbm93bik6IHZvaWQge1xuICBpZiAoIWxvYWRlZCB8fCB0eXBlb2YgbG9hZGVkICE9PSBcIm9iamVjdFwiKSByZXR1cm47XG4gIGNvbnN0IGV4cG9ydHMgPSBsb2FkZWQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gJiB7IF9fY29kZXhwcFNwYXJrbGVXcmFwcGVkPzogYm9vbGVhbiB9O1xuICBpZiAoZXhwb3J0cy5fX2NvZGV4cHBTcGFya2xlV3JhcHBlZCkgcmV0dXJuO1xuICBleHBvcnRzLl9fY29kZXhwcFNwYXJrbGVXcmFwcGVkID0gdHJ1ZTtcblxuICBmb3IgKGNvbnN0IG5hbWUgb2YgW1wiaW5zdGFsbFVwZGF0ZXNJZkF2YWlsYWJsZVwiXSkge1xuICAgIGNvbnN0IGZuID0gZXhwb3J0c1tuYW1lXTtcbiAgICBpZiAodHlwZW9mIGZuICE9PSBcImZ1bmN0aW9uXCIpIGNvbnRpbnVlO1xuICAgIGV4cG9ydHNbbmFtZV0gPSBmdW5jdGlvbiBjb2RleFBsdXNQbHVzU3BhcmtsZVdyYXBwZXIodGhpczogdW5rbm93biwgLi4uYXJnczogdW5rbm93bltdKSB7XG4gICAgICBwcmVwYXJlU2lnbmVkQ29kZXhGb3JTcGFya2xlSW5zdGFsbCgpO1xuICAgICAgcmV0dXJuIFJlZmxlY3QuYXBwbHkoZm4sIHRoaXMsIGFyZ3MpO1xuICAgIH07XG4gIH1cblxuICBpZiAoZXhwb3J0cy5kZWZhdWx0ICYmIGV4cG9ydHMuZGVmYXVsdCAhPT0gZXhwb3J0cykge1xuICAgIHdyYXBTcGFya2xlRXhwb3J0cyhleHBvcnRzLmRlZmF1bHQpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmVwYXJlU2lnbmVkQ29kZXhGb3JTcGFya2xlSW5zdGFsbCgpOiB2b2lkIHtcbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gIT09IFwiZGFyd2luXCIpIHJldHVybjtcbiAgaWYgKGV4aXN0c1N5bmMoVVBEQVRFX01PREVfRklMRSkpIHtcbiAgICBsb2coXCJpbmZvXCIsIFwiU3BhcmtsZSB1cGRhdGUgcHJlcCBza2lwcGVkOyB1cGRhdGUgbW9kZSBhbHJlYWR5IGFjdGl2ZVwiKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCFleGlzdHNTeW5jKFNJR05FRF9DT0RFWF9CQUNLVVApKSB7XG4gICAgbG9nKFwid2FyblwiLCBcIlNwYXJrbGUgdXBkYXRlIHByZXAgc2tpcHBlZDsgc2lnbmVkIENvZGV4LmFwcCBiYWNrdXAgaXMgbWlzc2luZ1wiKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCFpc0RldmVsb3BlcklkU2lnbmVkQXBwKFNJR05FRF9DT0RFWF9CQUNLVVApKSB7XG4gICAgbG9nKFwid2FyblwiLCBcIlNwYXJrbGUgdXBkYXRlIHByZXAgc2tpcHBlZDsgQ29kZXguYXBwIGJhY2t1cCBpcyBub3QgRGV2ZWxvcGVyIElEIHNpZ25lZFwiKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBzdGF0ZSA9IHJlYWRJbnN0YWxsZXJTdGF0ZSgpO1xuICBjb25zdCBhcHBSb290ID0gc3RhdGU/LmFwcFJvb3QgPz8gaW5mZXJNYWNBcHBSb290KCk7XG4gIGlmICghYXBwUm9vdCkge1xuICAgIGxvZyhcIndhcm5cIiwgXCJTcGFya2xlIHVwZGF0ZSBwcmVwIHNraXBwZWQ7IGNvdWxkIG5vdCBpbmZlciBDb2RleC5hcHAgcGF0aFwiKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBtb2RlID0ge1xuICAgIGVuYWJsZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIGFwcFJvb3QsXG4gICAgY29kZXhWZXJzaW9uOiBzdGF0ZT8uY29kZXhWZXJzaW9uID8/IG51bGwsXG4gIH07XG4gIHdyaXRlRmlsZVN5bmMoVVBEQVRFX01PREVfRklMRSwgSlNPTi5zdHJpbmdpZnkobW9kZSwgbnVsbCwgMikpO1xuXG4gIHRyeSB7XG4gICAgZXhlY0ZpbGVTeW5jKFwiZGl0dG9cIiwgW1NJR05FRF9DT0RFWF9CQUNLVVAsIGFwcFJvb3RdLCB7IHN0ZGlvOiBcImlnbm9yZVwiIH0pO1xuICAgIHRyeSB7XG4gICAgICBleGVjRmlsZVN5bmMoXCJ4YXR0clwiLCBbXCItZHJcIiwgXCJjb20uYXBwbGUucXVhcmFudGluZVwiLCBhcHBSb290XSwgeyBzdGRpbzogXCJpZ25vcmVcIiB9KTtcbiAgICB9IGNhdGNoIHt9XG4gICAgbG9nKFwiaW5mb1wiLCBcIlJlc3RvcmVkIHNpZ25lZCBDb2RleC5hcHAgYmVmb3JlIFNwYXJrbGUgaW5zdGFsbFwiLCB7IGFwcFJvb3QgfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2coXCJlcnJvclwiLCBcIkZhaWxlZCB0byByZXN0b3JlIHNpZ25lZCBDb2RleC5hcHAgYmVmb3JlIFNwYXJrbGUgaW5zdGFsbFwiLCB7XG4gICAgICBtZXNzYWdlOiAoZSBhcyBFcnJvcikubWVzc2FnZSxcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNEZXZlbG9wZXJJZFNpZ25lZEFwcChhcHBSb290OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgcmVzdWx0ID0gc3Bhd25TeW5jKFwiY29kZXNpZ25cIiwgW1wiLWR2XCIsIFwiLS12ZXJib3NlPTRcIiwgYXBwUm9vdF0sIHtcbiAgICBlbmNvZGluZzogXCJ1dGY4XCIsXG4gICAgc3RkaW86IFtcImlnbm9yZVwiLCBcInBpcGVcIiwgXCJwaXBlXCJdLFxuICB9KTtcbiAgY29uc3Qgb3V0cHV0ID0gYCR7cmVzdWx0LnN0ZG91dCA/PyBcIlwifSR7cmVzdWx0LnN0ZGVyciA/PyBcIlwifWA7XG4gIHJldHVybiAoXG4gICAgcmVzdWx0LnN0YXR1cyA9PT0gMCAmJlxuICAgIC9BdXRob3JpdHk9RGV2ZWxvcGVyIElEIEFwcGxpY2F0aW9uOi8udGVzdChvdXRwdXQpICYmXG4gICAgIS9TaWduYXR1cmU9YWRob2MvLnRlc3Qob3V0cHV0KSAmJlxuICAgICEvVGVhbUlkZW50aWZpZXI9bm90IHNldC8udGVzdChvdXRwdXQpXG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbmZlck1hY0FwcFJvb3QoKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IG1hcmtlciA9IFwiLmFwcC9Db250ZW50cy9NYWNPUy9cIjtcbiAgY29uc3QgaWR4ID0gcHJvY2Vzcy5leGVjUGF0aC5pbmRleE9mKG1hcmtlcik7XG4gIHJldHVybiBpZHggPj0gMCA/IHByb2Nlc3MuZXhlY1BhdGguc2xpY2UoMCwgaWR4ICsgXCIuYXBwXCIubGVuZ3RoKSA6IG51bGw7XG59XG5cbmV4cG9ydCBjb25zdCBVUERBVEVfQ0hFQ0tfSU5URVJWQUxfTVMgPSAyNCAqIDYwICogNjAgKiAxMDAwO1xuZXhwb3J0IGNvbnN0IFZFUlNJT05fUkUgPSAvXnY/KFxcZCspXFwuKFxcZCspXFwuKFxcZCspKD86Wy0rXS4qKT8kLztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGVuc3VyZUNvZGV4UGx1c1BsdXNVcGRhdGVDaGVjayhmb3JjZSA9IGZhbHNlKTogUHJvbWlzZTxDb2RleFBsdXNQbHVzVXBkYXRlQ2hlY2s+IHtcbiAgY29uc3Qgc3RhdGUgPSByZWFkU3RhdGUoKTtcbiAgY29uc3QgY2FjaGVkID0gc3RhdGUuY29kZXhQbHVzUGx1cz8udXBkYXRlQ2hlY2s7XG4gIGNvbnN0IGNoYW5uZWwgPSBzdGF0ZS5jb2RleFBsdXNQbHVzPy51cGRhdGVDaGFubmVsID8/IFwic3RhYmxlXCI7XG4gIGNvbnN0IHJlcG8gPSBzdGF0ZS5jb2RleFBsdXNQbHVzPy51cGRhdGVSZXBvID8/IENPREVYX1BMVVNQTFVTX1JFUE87XG4gIGlmIChcbiAgICAhZm9yY2UgJiZcbiAgICBjYWNoZWQgJiZcbiAgICBjYWNoZWQuY3VycmVudFZlcnNpb24gPT09IENPREVYX1BMVVNQTFVTX1ZFUlNJT04gJiZcbiAgICBEYXRlLm5vdygpIC0gRGF0ZS5wYXJzZShjYWNoZWQuY2hlY2tlZEF0KSA8IFVQREFURV9DSEVDS19JTlRFUlZBTF9NU1xuICApIHtcbiAgICByZXR1cm4gY2FjaGVkO1xuICB9XG5cbiAgY29uc3QgcmVsZWFzZSA9IGF3YWl0IGZldGNoTGF0ZXN0UmVsZWFzZShyZXBvLCBDT0RFWF9QTFVTUExVU19WRVJTSU9OLCBjaGFubmVsID09PSBcInByZXJlbGVhc2VcIik7XG4gIGNvbnN0IGxhdGVzdFZlcnNpb24gPSByZWxlYXNlLmxhdGVzdFRhZyA/IG5vcm1hbGl6ZVZlcnNpb24ocmVsZWFzZS5sYXRlc3RUYWcpIDogbnVsbDtcbiAgY29uc3QgY2hlY2s6IENvZGV4UGx1c1BsdXNVcGRhdGVDaGVjayA9IHtcbiAgICBjaGVja2VkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICBjdXJyZW50VmVyc2lvbjogQ09ERVhfUExVU1BMVVNfVkVSU0lPTixcbiAgICBsYXRlc3RWZXJzaW9uLFxuICAgIHJlbGVhc2VVcmw6IHJlbGVhc2UucmVsZWFzZVVybCA/PyBgaHR0cHM6Ly9naXRodWIuY29tLyR7cmVwb30vcmVsZWFzZXNgLFxuICAgIHJlbGVhc2VOb3RlczogcmVsZWFzZS5yZWxlYXNlTm90ZXMsXG4gICAgdXBkYXRlQXZhaWxhYmxlOiBsYXRlc3RWZXJzaW9uXG4gICAgICA/IGNvbXBhcmVWZXJzaW9ucyhub3JtYWxpemVWZXJzaW9uKGxhdGVzdFZlcnNpb24pLCBDT0RFWF9QTFVTUExVU19WRVJTSU9OKSA+IDBcbiAgICAgIDogZmFsc2UsXG4gICAgLi4uKHJlbGVhc2UuZXJyb3IgPyB7IGVycm9yOiByZWxlYXNlLmVycm9yIH0gOiB7fSksXG4gIH07XG4gIHN0YXRlLmNvZGV4UGx1c1BsdXMgPz89IHt9O1xuICBzdGF0ZS5jb2RleFBsdXNQbHVzLnVwZGF0ZUNoZWNrID0gY2hlY2s7XG4gIHdyaXRlU3RhdGUoc3RhdGUpO1xuICByZXR1cm4gY2hlY2s7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZldGNoTGF0ZXN0UmVsZWFzZShcbiAgcmVwbzogc3RyaW5nLFxuICBjdXJyZW50VmVyc2lvbjogc3RyaW5nLFxuICBpbmNsdWRlUHJlcmVsZWFzZSA9IGZhbHNlLFxuKTogUHJvbWlzZTx7IGxhdGVzdFRhZzogc3RyaW5nIHwgbnVsbDsgcmVsZWFzZVVybDogc3RyaW5nIHwgbnVsbDsgcmVsZWFzZU5vdGVzOiBzdHJpbmcgfCBudWxsOyBlcnJvcj86IHN0cmluZyB9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgICBjb25zdCB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiBjb250cm9sbGVyLmFib3J0KCksIDgwMDApO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBlbmRwb2ludCA9IGluY2x1ZGVQcmVyZWxlYXNlID8gXCJyZWxlYXNlcz9wZXJfcGFnZT0yMFwiIDogXCJyZWxlYXNlcy9sYXRlc3RcIjtcbiAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKGBodHRwczovL2FwaS5naXRodWIuY29tL3JlcG9zLyR7cmVwb30vJHtlbmRwb2ludH1gLCB7XG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICBcIkFjY2VwdFwiOiBcImFwcGxpY2F0aW9uL3ZuZC5naXRodWIranNvblwiLFxuICAgICAgICAgIFwiVXNlci1BZ2VudFwiOiBgY29kZXgtcGx1c3BsdXMvJHtjdXJyZW50VmVyc2lvbn1gLFxuICAgICAgICB9LFxuICAgICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLFxuICAgICAgfSk7XG4gICAgICBpZiAocmVzLnN0YXR1cyA9PT0gNDA0KSB7XG4gICAgICAgIHJldHVybiB7IGxhdGVzdFRhZzogbnVsbCwgcmVsZWFzZVVybDogbnVsbCwgcmVsZWFzZU5vdGVzOiBudWxsLCBlcnJvcjogXCJubyBHaXRIdWIgcmVsZWFzZSBmb3VuZFwiIH07XG4gICAgICB9XG4gICAgICBpZiAoIXJlcy5vaykge1xuICAgICAgICByZXR1cm4geyBsYXRlc3RUYWc6IG51bGwsIHJlbGVhc2VVcmw6IG51bGwsIHJlbGVhc2VOb3RlczogbnVsbCwgZXJyb3I6IGBHaXRIdWIgcmV0dXJuZWQgJHtyZXMuc3RhdHVzfWAgfTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGpzb24gPSBhd2FpdCByZXMuanNvbigpIGFzIHsgdGFnX25hbWU/OiBzdHJpbmc7IGh0bWxfdXJsPzogc3RyaW5nOyBib2R5Pzogc3RyaW5nOyBkcmFmdD86IGJvb2xlYW4gfSB8IEFycmF5PHsgdGFnX25hbWU/OiBzdHJpbmc7IGh0bWxfdXJsPzogc3RyaW5nOyBib2R5Pzogc3RyaW5nOyBkcmFmdD86IGJvb2xlYW4gfT47XG4gICAgICBjb25zdCBib2R5ID0gQXJyYXkuaXNBcnJheShqc29uKSA/IGpzb24uZmluZCgocmVsZWFzZSkgPT4gIXJlbGVhc2UuZHJhZnQpIDoganNvbjtcbiAgICAgIGlmICghYm9keSkge1xuICAgICAgICByZXR1cm4geyBsYXRlc3RUYWc6IG51bGwsIHJlbGVhc2VVcmw6IG51bGwsIHJlbGVhc2VOb3RlczogbnVsbCwgZXJyb3I6IFwibm8gR2l0SHViIHJlbGVhc2UgZm91bmRcIiB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGF0ZXN0VGFnOiBib2R5LnRhZ19uYW1lID8/IG51bGwsXG4gICAgICAgIHJlbGVhc2VVcmw6IGJvZHkuaHRtbF91cmwgPz8gYGh0dHBzOi8vZ2l0aHViLmNvbS8ke3JlcG99L3JlbGVhc2VzYCxcbiAgICAgICAgcmVsZWFzZU5vdGVzOiBib2R5LmJvZHkgPz8gbnVsbCxcbiAgICAgIH07XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbGF0ZXN0VGFnOiBudWxsLFxuICAgICAgcmVsZWFzZVVybDogbnVsbCxcbiAgICAgIHJlbGVhc2VOb3RlczogbnVsbCxcbiAgICAgIGVycm9yOiBlIGluc3RhbmNlb2YgRXJyb3IgPyBlLm1lc3NhZ2UgOiBTdHJpbmcoZSksXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplVmVyc2lvbih2OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdi50cmltKCkucmVwbGFjZSgvXnYvaSwgXCJcIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb21wYXJlVmVyc2lvbnMoYTogc3RyaW5nLCBiOiBzdHJpbmcpOiBudW1iZXIge1xuICBjb25zdCBhdiA9IFZFUlNJT05fUkUuZXhlYyhhKTtcbiAgY29uc3QgYnYgPSBWRVJTSU9OX1JFLmV4ZWMoYik7XG4gIGlmICghYXYgfHwgIWJ2KSByZXR1cm4gMDtcbiAgZm9yIChsZXQgaSA9IDE7IGkgPD0gMzsgaSsrKSB7XG4gICAgY29uc3QgZGlmZiA9IE51bWJlcihhdltpXSkgLSBOdW1iZXIoYnZbaV0pO1xuICAgIGlmIChkaWZmICE9PSAwKSByZXR1cm4gZGlmZjtcbiAgfVxuICByZXR1cm4gMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZhbGxiYWNrU291cmNlUm9vdCgpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgY2FuZGlkYXRlcyA9IFtcbiAgICBqb2luKGhvbWVkaXIoKSwgXCIuY29kZXgtcGx1c3BsdXNcIiwgXCJzb3VyY2VcIiksXG4gICAgam9pbih1c2VyUm9vdCEsIFwic291cmNlXCIpLFxuICBdO1xuICBmb3IgKGNvbnN0IGNhbmRpZGF0ZSBvZiBjYW5kaWRhdGVzKSB7XG4gICAgaWYgKGV4aXN0c1N5bmMoam9pbihjYW5kaWRhdGUsIFwicGFja2FnZXNcIiwgXCJpbnN0YWxsZXJcIiwgXCJkaXN0XCIsIFwiY2xpLmpzXCIpKSkgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlc2NyaWJlSW5zdGFsbGF0aW9uU291cmNlKHNvdXJjZVJvb3Q6IHN0cmluZyB8IG51bGwpOiBJbnN0YWxsYXRpb25Tb3VyY2Uge1xuICBpZiAoIXNvdXJjZVJvb3QpIHtcbiAgICByZXR1cm4ge1xuICAgICAga2luZDogXCJ1bmtub3duXCIsXG4gICAgICBsYWJlbDogXCJVbmtub3duXCIsXG4gICAgICBkZXRhaWw6IFwiQ29kZXgrKyBzb3VyY2UgbG9jYXRpb24gaXMgbm90IHJlY29yZGVkIHlldC5cIixcbiAgICB9O1xuICB9XG4gIGNvbnN0IG5vcm1hbGl6ZWQgPSBzb3VyY2VSb290LnJlcGxhY2UoL1xcXFwvZywgXCIvXCIpO1xuICBpZiAoL1xcLyg/OkhvbWVicmV3fGhvbWVicmV3KVxcL0NlbGxhclxcL2NvZGV4cGx1c3BsdXNcXC8vLnRlc3Qobm9ybWFsaXplZCkpIHtcbiAgICByZXR1cm4geyBraW5kOiBcImhvbWVicmV3XCIsIGxhYmVsOiBcIkhvbWVicmV3XCIsIGRldGFpbDogc291cmNlUm9vdCB9O1xuICB9XG4gIGlmIChleGlzdHNTeW5jKGpvaW4oc291cmNlUm9vdCwgXCIuZ2l0XCIpKSkge1xuICAgIHJldHVybiB7IGtpbmQ6IFwibG9jYWwtZGV2XCIsIGxhYmVsOiBcIkxvY2FsIGRldmVsb3BtZW50IGNoZWNrb3V0XCIsIGRldGFpbDogc291cmNlUm9vdCB9O1xuICB9XG4gIGlmIChub3JtYWxpemVkLmVuZHNXaXRoKFwiLy5jb2RleC1wbHVzcGx1cy9zb3VyY2VcIikgfHwgbm9ybWFsaXplZC5pbmNsdWRlcyhcIi8uY29kZXgtcGx1c3BsdXMvc291cmNlL1wiKSkge1xuICAgIHJldHVybiB7IGtpbmQ6IFwiZ2l0aHViLXNvdXJjZVwiLCBsYWJlbDogXCJHaXRIdWIgc291cmNlIGluc3RhbGxlclwiLCBkZXRhaWw6IHNvdXJjZVJvb3QgfTtcbiAgfVxuICBpZiAoZXhpc3RzU3luYyhqb2luKHNvdXJjZVJvb3QsIFwicGFja2FnZS5qc29uXCIpKSkge1xuICAgIHJldHVybiB7IGtpbmQ6IFwic291cmNlLWFyY2hpdmVcIiwgbGFiZWw6IFwiU291cmNlIGFyY2hpdmVcIiwgZGV0YWlsOiBzb3VyY2VSb290IH07XG4gIH1cbiAgcmV0dXJuIHsga2luZDogXCJ1bmtub3duXCIsIGxhYmVsOiBcIlVua25vd25cIiwgZGV0YWlsOiBzb3VyY2VSb290IH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdGFydEluc3RhbGxlZENsaShjbGk6IHN0cmluZywgYXJnczogc3RyaW5nW10pOiB2b2lkIHtcbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09IFwiZGFyd2luXCIgJiYgc3RhcnRJbnN0YWxsZWRDbGlXaXRoTGF1bmNoZChjbGksIGFyZ3MpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGNoaWxkID0gc3Bhd24ocHJvY2Vzcy5leGVjUGF0aCwgW2NsaSwgLi4uYXJnc10sIHtcbiAgICBjd2Q6IHJlc29sdmUoZGlybmFtZShjbGkpLCBcIi4uXCIsIFwiLi5cIiwgXCIuLlwiKSxcbiAgICBlbnY6IHsgLi4ucHJvY2Vzcy5lbnYsIENPREVYX1BMVVNQTFVTX01BTlVBTF9VUERBVEU6IFwiMVwiIH0sXG4gICAgZGV0YWNoZWQ6IHRydWUsXG4gICAgc3RkaW86IFwiaWdub3JlXCIsXG4gIH0pO1xuICBjaGlsZC51bnJlZigpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RhcnRJbnN0YWxsZWRDbGlXaXRoTGF1bmNoZChjbGk6IHN0cmluZywgYXJnczogc3RyaW5nW10pOiBib29sZWFuIHtcbiAgY29uc3QgbGFiZWwgPSBgY29tLmNvZGV4cGx1c3BsdXMucGF0Y2gtaGVscGVyLiR7cHJvY2Vzcy5waWR9LiR7RGF0ZS5ub3coKX1gO1xuICBjb25zdCBjbGVhbnVwID0gYGxhdW5jaGN0bCByZW1vdmUgJHtsYWJlbH0gPi9kZXYvbnVsbCAyPiYxIHx8IGxhdW5jaGN0bCBib290b3V0IGd1aS8kKGlkIC11KS8ke2xhYmVsfSA+L2Rldi9udWxsIDI+JjEgfHwgdHJ1ZWA7XG4gIGNvbnN0IGNvbW1hbmQgPSBbXG4gICAgYHRyYXAgJHtzaGVsbFF1b3RlKGNsZWFudXApfSBFWElUYCxcbiAgICBgY2QgJHtzaGVsbFF1b3RlKHJlc29sdmUoZGlybmFtZShjbGkpLCBcIi4uXCIsIFwiLi5cIiwgXCIuLlwiKSl9YCxcbiAgICBgQ09ERVhfUExVU1BMVVNfTUFOVUFMX1VQREFURT0xICR7W3Byb2Nlc3MuZXhlY1BhdGgsIGNsaSwgLi4uYXJnc10ubWFwKHNoZWxsUXVvdGUpLmpvaW4oXCIgXCIpfWAsXG4gIF0uam9pbihcIiAmJiBcIik7XG4gIGNvbnN0IHJlc3VsdCA9IHNwYXduU3luYyhcbiAgICBcImxhdW5jaGN0bFwiLFxuICAgIFtcbiAgICAgIFwic3VibWl0XCIsXG4gICAgICBcIi1sXCIsXG4gICAgICBsYWJlbCxcbiAgICAgIFwiLS1cIixcbiAgICAgIFwiL2Jpbi9zaFwiLFxuICAgICAgXCItY1wiLFxuICAgICAgYCR7Y29tbWFuZH0gfHwgdHJ1ZWAsXG4gICAgXSxcbiAgICB7XG4gICAgICBlbmNvZGluZzogXCJ1dGY4XCIsXG4gICAgICBzdGRpbzogXCJpZ25vcmVcIixcbiAgICB9LFxuICApO1xuICBpZiAocmVzdWx0LnN0YXR1cyA9PT0gMCkgcmV0dXJuIHRydWU7XG4gIGxvZyhcIndhcm5cIiwgYGxhdW5jaGN0bCBzdWJtaXQgZmFpbGVkIGZvciBDb2RleCsrIHBhdGNoIGhlbHBlcjogJHtyZXN1bHQuZXJyb3I/Lm1lc3NhZ2UgPz8gcmVzdWx0LnN0YXR1c31gKTtcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2hlbGxRdW90ZSh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAnJHt2YWx1ZS5yZXBsYWNlKC8nL2csIGAnXFxcXCcnYCl9J2A7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYXJrU2VsZlVwZGF0ZVN0YXJ0ZWQoc291cmNlUm9vdDogc3RyaW5nKTogU2VsZlVwZGF0ZVN0YXRlIHtcbiAgY29uc3QgY29uZmlnID0gcmVhZFN0YXRlKCkuY29kZXhQbHVzUGx1cztcbiAgY29uc3QgY2hhbm5lbCA9IGNvbmZpZz8udXBkYXRlQ2hhbm5lbCA/PyBcInN0YWJsZVwiO1xuICBjb25zdCBzdGF0ZTogU2VsZlVwZGF0ZVN0YXRlID0ge1xuICAgIGNoZWNrZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIHN0YXR1czogXCJjaGVja2luZ1wiLFxuICAgIGN1cnJlbnRWZXJzaW9uOiBDT0RFWF9QTFVTUExVU19WRVJTSU9OLFxuICAgIGxhdGVzdFZlcnNpb246IG51bGwsXG4gICAgdGFyZ2V0UmVmOiBjb25maWc/LnVwZGF0ZUNoYW5uZWwgPT09IFwiY3VzdG9tXCIgPyBjb25maWcudXBkYXRlUmVmID8/IG51bGwgOiBudWxsLFxuICAgIHJlbGVhc2VVcmw6IG51bGwsXG4gICAgcmVwbzogY29uZmlnPy51cGRhdGVSZXBvID8/IENPREVYX1BMVVNQTFVTX1JFUE8sXG4gICAgY2hhbm5lbCxcbiAgICBzb3VyY2VSb290LFxuICAgIGluc3RhbGxhdGlvblNvdXJjZTogZGVzY3JpYmVJbnN0YWxsYXRpb25Tb3VyY2Uoc291cmNlUm9vdCksXG4gIH07XG4gIHdyaXRlU2VsZlVwZGF0ZVN0YXRlKHN0YXRlKTtcbiAgcmV0dXJuIHN0YXRlO1xufVxuIiwgImltcG9ydCB7IEJyb3dzZXJWaWV3LCBCcm93c2VyV2luZG93IH0gZnJvbSBcImVsZWN0cm9uXCI7XG5pbXBvcnQgeyBleGlzdHNTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IHJhbmRvbVVVSUQgfSBmcm9tIFwibm9kZTpjcnlwdG9cIjtcbmltcG9ydCB0eXBlIHsgQ29kZXhSdW50aW1lQ2FwYWJpbGl0aWVzLCBDb2RleFZpZXdDcmVhdGVPcHRpb25zLCBDb2RleFZpZXdSZWYgfSBmcm9tIFwiQGNvZGV4LXBsdXNwbHVzL3Nka1wiO1xuaW1wb3J0IHR5cGUgeyBOYXRpdmVUd2Vha0NvbnRleHQgfSBmcm9tIFwiLi9uYXRpdmUtYnJpZGdlXCI7XG5pbXBvcnQgeyBHVUVTVF9QUkVMT0FEX1BBVEgsIGxvZyB9IGZyb20gXCIuL3J1bnRpbWUtcGF0aHNcIjtcbmltcG9ydCB7XG4gIGFzUmVjb3JkLFxuICBjYWxsT2JqZWN0TWV0aG9kLFxuICBjb2RleEFwcFVybCxcbiAgZ2V0Q29kZXhXaW5kb3dTZXJ2aWNlcyxcbiAgZ2V0UHJpbWFyeUNvZGV4V2luZG93LFxuICBpc1dpbmRvd0Rlc3Ryb3llZCxcbiAgbWFrZVdpbmRvd0xpa2VGb3JWaWV3LFxuICBub3JtYWxpemVDb2RleFJvdXRlLFxuICBub3JtYWxpemVPd2xWaWV3VXJsLFxuICB3aW5kb3dJZEZvcixcbn0gZnJvbSBcIi4vY29kZXgtd2luZG93c1wiO1xuaW1wb3J0IHtcbiAgaW5zcGVjdFZpZXdBdHRhY2hUYXJnZXRzLFxuICBwcm9iZVJ1bnRpbWVDb21wYXRpYmlsaXR5LFxuICB2aWV3c0NhcGFiaWxpdGllc0Zyb21TbmFwc2hvdCxcbiAgdmlld1NhbXBsZUZyb21Db25zdHJ1Y3RvcixcbiAgd2luZG93U2FtcGxlRnJvbSxcbn0gZnJvbSBcIi4vY29kZXgtcnVudGltZS1wcm9iZVwiO1xuXG5leHBvcnQgdHlwZSBPd2xWaWV3QXR0YWNoTW9kZSA9IFwiY29udGVudFZpZXdcIiB8IFwiYnJvd3NlclZpZXdcIjtcblxuZXhwb3J0IGludGVyZmFjZSBNYW5hZ2VkT3dsVmlldyB7XG4gIGtleTogc3RyaW5nO1xuICB0d2Vha0lkOiBzdHJpbmc7XG4gIGlkOiBzdHJpbmc7XG4gIHZpZXc6IEVsZWN0cm9uLkJyb3dzZXJWaWV3O1xuICBwYXJlbnRXaW5kb3dJZDogbnVtYmVyIHwgbnVsbDtcbiAgYXR0YWNoTW9kZTogT3dsVmlld0F0dGFjaE1vZGUgfCBudWxsO1xuICBkaXNwb3NlQmluZGluZ3M6IEFycmF5PCgpID0+IHZvaWQ+O1xuICBkaXNwb3NlZDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNvbnN0IHVudHJ1c3RlZFdlYkNvbnRlbnRzSWRzID0gbmV3IFNldDxudW1iZXI+KCk7XG5jb25zdCBvd2xWaWV3cyA9IG5ldyBNYXA8c3RyaW5nLCBNYW5hZ2VkT3dsVmlldz4oKTtcblxuZXhwb3J0IGZ1bmN0aW9uIG1hcmtVbnRydXN0ZWRXZWJDb250ZW50cyh3YzogRWxlY3Ryb24uV2ViQ29udGVudHMpOiB2b2lkIHtcbiAgdW50cnVzdGVkV2ViQ29udGVudHNJZHMuYWRkKHdjLmlkKTtcbiAgd2Mub25jZShcImRlc3Ryb3llZFwiLCAoKSA9PiB7IHVudHJ1c3RlZFdlYkNvbnRlbnRzSWRzLmRlbGV0ZSh3Yy5pZCk7IH0pO1xufVxuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGdldE93bFZpZXdDYXBhYmlsaXRpZXMoKTogQ29kZXhSdW50aW1lQ2FwYWJpbGl0aWVzW1widmlld3NcIl0ge1xuICBjb25zdCBzbmFwc2hvdCA9IHByb2JlUnVudGltZUNvbXBhdGliaWxpdHkoe1xuICAgIHVzZXJSb290OiBcIlwiLFxuICAgIHJ1bnRpbWVEaXI6IFwiXCIsXG4gICAgY29kZXhWZXJzaW9uOiBudWxsLFxuICAgIGNoYW5uZWw6IG51bGwsXG4gICAgZ2V0V2luZG93U2VydmljZXM6IGdldENvZGV4V2luZG93U2VydmljZXMsXG4gICAgZW52OiB7XG4gICAgICBicm93c2VyVmlldzogQnJvd3NlclZpZXcsXG4gICAgICBicm93c2VyV2luZG93OiBCcm93c2VyV2luZG93LFxuICAgICAgaW5zcGVjdEV4aXN0aW5nV2luZG93OiAoKSA9PiB3aW5kb3dTYW1wbGVGcm9tKGdldFByaW1hcnlDb2RleFdpbmRvdygpID8/IEJyb3dzZXJXaW5kb3cuZ2V0Rm9jdXNlZFdpbmRvdygpKSxcbiAgICAgIGluc3BlY3RCcm93c2VyVmlldzogKCkgPT4gdmlld1NhbXBsZUZyb21Db25zdHJ1Y3RvcihCcm93c2VyVmlldyksXG4gICAgfSxcbiAgfSk7XG4gIHJldHVybiB2aWV3c0NhcGFiaWxpdGllc0Zyb21TbmFwc2hvdChzbmFwc2hvdCk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVPd2xWaWV3KFxuICBjdHg6IE5hdGl2ZVR3ZWFrQ29udGV4dCxcbiAgb3B0czogQ29kZXhWaWV3Q3JlYXRlT3B0aW9ucyxcbik6IFByb21pc2U8Q29kZXhWaWV3UmVmPiB7XG4gIGNvbnN0IGlkID0gYXNzZXJ0QnJpZGdlSWQob3B0cy5pZCA/PyByYW5kb21VVUlEKCksIFwiQ29kZXggdmlldyBpZFwiKTtcbiAgY29uc3Qga2V5ID0gb3dsVmlld0tleShjdHguaWQsIGlkKTtcbiAgaWYgKG93bFZpZXdzLmhhcyhrZXkpKSB0aHJvdyBuZXcgRXJyb3IoYENvZGV4IHZpZXcgYWxyZWFkeSBleGlzdHM6ICR7Y3R4LmlkfToke2lkfWApO1xuXG4gIGNvbnN0IHBhcmVudCA9IHR5cGVvZiBvcHRzLnBhcmVudFdpbmRvd0lkID09PSBcIm51bWJlclwiXG4gICAgPyBCcm93c2VyV2luZG93LmZyb21JZChvcHRzLnBhcmVudFdpbmRvd0lkKVxuICAgIDogZ2V0UHJpbWFyeUNvZGV4V2luZG93KCk7XG4gIGlmICghcGFyZW50IHx8IGlzV2luZG93RGVzdHJveWVkKHBhcmVudCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb2RleCB2aWV3IG5lZWRzIGFuIGFjdGl2ZSBwYXJlbnQgd2luZG93XCIpO1xuICB9XG5cbiAgY29uc3Qgc2VydmljZXMgPSBnZXRDb2RleFdpbmRvd1NlcnZpY2VzKCk7XG4gIGNvbnN0IHdpbmRvd01hbmFnZXIgPSBzZXJ2aWNlcz8ud2luZG93TWFuYWdlcjtcbiAgY29uc3Qgcm91dGUgPSBvcHRzLnJvdXRlID09PSB1bmRlZmluZWQgPyBudWxsIDogbm9ybWFsaXplQ29kZXhSb3V0ZShvcHRzLnJvdXRlKTtcbiAgY29uc3QgaG9zdElkID0gb3B0cy5ob3N0SWQgfHwgXCJsb2NhbFwiO1xuICBjb25zdCB2aWV3ID0gbmV3IEJyb3dzZXJWaWV3KHtcbiAgICB3ZWJQcmVmZXJlbmNlczoge1xuICAgICAgcHJlbG9hZDogb3B0cy5yZWdpc3RlcldpdGhDb2RleCA9PT0gZmFsc2VcbiAgICAgICAgPyAoZXhpc3RzU3luYyhHVUVTVF9QUkVMT0FEX1BBVEgpID8gR1VFU1RfUFJFTE9BRF9QQVRIIDogdW5kZWZpbmVkKVxuICAgICAgICA6IHdpbmRvd01hbmFnZXI/Lm9wdGlvbnM/LnByZWxvYWRQYXRoLFxuICAgICAgY29udGV4dElzb2xhdGlvbjogdHJ1ZSxcbiAgICAgIG5vZGVJbnRlZ3JhdGlvbjogZmFsc2UsXG4gICAgICBzYW5kYm94OiB0cnVlLFxuICAgICAgc3BlbGxjaGVjazogZmFsc2UsXG4gICAgICBkZXZUb29sczogd2luZG93TWFuYWdlcj8ub3B0aW9ucz8uYWxsb3dEZXZ0b29scyxcbiAgICB9LFxuICB9KTtcbiAgbWFya1VudHJ1c3RlZFdlYkNvbnRlbnRzKHZpZXcud2ViQ29udGVudHMpO1xuXG4gIGlmIChvcHRzLmJhY2tncm91bmRDb2xvcikge1xuICAgIGNhbGxPYmplY3RNZXRob2QodmlldywgXCJzZXRCYWNrZ3JvdW5kQ29sb3JcIiwgW29wdHMuYmFja2dyb3VuZENvbG9yXSk7XG4gICAgY2FsbE9iamVjdE1ldGhvZChhc1JlY29yZCh2aWV3KT8ud2ViQ29udGVudHNWaWV3LCBcInNldEJhY2tncm91bmRDb2xvclwiLCBbb3B0cy5iYWNrZ3JvdW5kQ29sb3JdKTtcbiAgfVxuXG4gIGNvbnN0IG1hbmFnZWQ6IE1hbmFnZWRPd2xWaWV3ID0ge1xuICAgIGtleSxcbiAgICB0d2Vha0lkOiBjdHguaWQsXG4gICAgaWQsXG4gICAgdmlldyxcbiAgICBwYXJlbnRXaW5kb3dJZDogd2luZG93SWRGb3IocGFyZW50KSxcbiAgICBhdHRhY2hNb2RlOiBudWxsLFxuICAgIGRpc3Bvc2VCaW5kaW5nczogW10sXG4gICAgZGlzcG9zZWQ6IGZhbHNlLFxuICB9O1xuICBvd2xWaWV3cy5zZXQoa2V5LCBtYW5hZ2VkKTtcblxuICB0cnkge1xuICAgIGlmIChyb3V0ZSAhPT0gbnVsbCAmJiBvcHRzLnJlZ2lzdGVyV2l0aENvZGV4ICE9PSBmYWxzZSAmJiB3aW5kb3dNYW5hZ2VyPy5yZWdpc3RlcldpbmRvdykge1xuICAgICAgY29uc3QgYXBwZWFyYW5jZSA9IG9wdHMuYXBwZWFyYW5jZSB8fCBcInNlY29uZGFyeVwiO1xuICAgICAgY29uc3Qgd2luZG93TGlrZSA9IG1ha2VXaW5kb3dMaWtlRm9yVmlldyh2aWV3KTtcbiAgICAgIHdpbmRvd01hbmFnZXIucmVnaXN0ZXJXaW5kb3cod2luZG93TGlrZSwgaG9zdElkLCBmYWxzZSwgYXBwZWFyYW5jZSk7XG4gICAgICBzZXJ2aWNlcz8uZ2V0Q29udGV4dD8uKGhvc3RJZCk/LnJlZ2lzdGVyV2luZG93Py4od2luZG93TGlrZSk7XG4gICAgfVxuXG4gICAgYXR0YWNoT3dsVmlldyhtYW5hZ2VkLCBwYXJlbnQpO1xuICAgIGlmIChvcHRzLmJvdW5kcykgc2V0T3dsVmlld0JvdW5kcyhtYW5hZ2VkLCBvcHRzLmJvdW5kcyk7XG4gICAgaWYgKG9wdHMudmlzaWJsZSA9PT0gZmFsc2UpIHNldE93bFZpZXdWaXNpYmxlKG1hbmFnZWQsIGZhbHNlKTtcblxuICAgIGlmIChyb3V0ZSAhPT0gbnVsbCkge1xuICAgICAgYXdhaXQgdmlldy53ZWJDb250ZW50cy5sb2FkVVJMKGNvZGV4QXBwVXJsKHJvdXRlLCBob3N0SWQpKTtcbiAgICB9IGVsc2UgaWYgKG9wdHMudXJsKSB7XG4gICAgICBhd2FpdCB2aWV3LndlYkNvbnRlbnRzLmxvYWRVUkwobm9ybWFsaXplT3dsVmlld1VybChvcHRzLnVybCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhd2FpdCB2aWV3LndlYkNvbnRlbnRzLmxvYWRVUkwoXCJhYm91dDpibGFua1wiKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBkaXNwb3NlT3dsVmlldyhtYW5hZ2VkKTtcbiAgICB0aHJvdyBlO1xuICB9XG5cbiAgbG9nKFwiaW5mb1wiLCBgY3JlYXRlZCBPd2wgdmlldyAke2N0eC5pZH06JHtpZH1gLCB7XG4gICAgcGFyZW50V2luZG93SWQ6IG1hbmFnZWQucGFyZW50V2luZG93SWQsXG4gICAgd2ViQ29udGVudHNJZDogdmlldy53ZWJDb250ZW50cy5pZCxcbiAgICBhdHRhY2hNb2RlOiBtYW5hZ2VkLmF0dGFjaE1vZGUsXG4gIH0pO1xuICByZXR1cm4gb3dsVmlld1JlZihtYW5hZ2VkKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNhbGxPd2xWaWV3KFxuICB0d2Vha0lkOiBzdHJpbmcsXG4gIGlkOiBzdHJpbmcsXG4gIG1ldGhvZDogc3RyaW5nLFxuICBhcmc/OiB1bmtub3duLFxuICBhcmcyPzogdW5rbm93bixcbik6IFByb21pc2U8dW5rbm93bj4ge1xuICBjb25zdCB2aWV3ID0gb3dsVmlld0Zvcih0d2Vha0lkLCBpZCk7XG4gIGlmIChtZXRob2QgPT09IFwic2V0Qm91bmRzXCIpIHJldHVybiBzZXRPd2xWaWV3Qm91bmRzKHZpZXcsIGFyZyBhcyBFbGVjdHJvbi5SZWN0YW5nbGUpO1xuICBpZiAobWV0aG9kID09PSBcInNldFZpc2libGVcIikgcmV0dXJuIHNldE93bFZpZXdWaXNpYmxlKHZpZXcsIEJvb2xlYW4oYXJnKSk7XG4gIGlmIChtZXRob2QgPT09IFwiYnJpbmdUb0Zyb250XCIpIHJldHVybiBicmluZ093bFZpZXdUb0Zyb250KHZpZXcpO1xuICBpZiAobWV0aG9kID09PSBcImxvYWRSb3V0ZVwiKSB7XG4gICAgY29uc3Qgcm91dGUgPSBub3JtYWxpemVDb2RleFJvdXRlKFN0cmluZyhhcmcpKTtcbiAgICBjb25zdCBob3N0SWQgPSB0eXBlb2YgYXJnMiA9PT0gXCJzdHJpbmdcIiAmJiBhcmcyID8gYXJnMiA6IFwibG9jYWxcIjtcbiAgICByZXR1cm4gdmlldy52aWV3LndlYkNvbnRlbnRzLmxvYWRVUkwoY29kZXhBcHBVcmwocm91dGUsIGhvc3RJZCkpO1xuICB9XG4gIGlmIChtZXRob2QgPT09IFwibG9hZFVybFwiKSByZXR1cm4gdmlldy52aWV3LndlYkNvbnRlbnRzLmxvYWRVUkwobm9ybWFsaXplT3dsVmlld1VybChTdHJpbmcoYXJnKSkpO1xuICBpZiAobWV0aG9kID09PSBcImRpc3Bvc2VcIikgcmV0dXJuIGRpc3Bvc2VPd2xWaWV3QnlJZCh0d2Vha0lkLCBpZCk7XG4gIHRocm93IG5ldyBFcnJvcihgdW5rbm93biBDb2RleCB2aWV3IG1ldGhvZDogJHttZXRob2R9YCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvd2xWaWV3UmVmKHZpZXc6IE1hbmFnZWRPd2xWaWV3KTogQ29kZXhWaWV3UmVmIHtcbiAgcmV0dXJuIHtcbiAgICBpZDogdmlldy5pZCxcbiAgICB3ZWJDb250ZW50c0lkOiB2aWV3LnZpZXcud2ViQ29udGVudHMuaWQsXG4gICAgcGFyZW50V2luZG93SWQ6IHZpZXcucGFyZW50V2luZG93SWQsXG4gICAgc2V0Qm91bmRzOiAoYm91bmRzKSA9PiBQcm9taXNlLnJlc29sdmUoc2V0T3dsVmlld0JvdW5kcyh2aWV3LCBib3VuZHMpKSxcbiAgICBzZXRWaXNpYmxlOiAodmlzaWJsZSkgPT4gUHJvbWlzZS5yZXNvbHZlKHNldE93bFZpZXdWaXNpYmxlKHZpZXcsIHZpc2libGUpKSxcbiAgICBicmluZ1RvRnJvbnQ6ICgpID0+IFByb21pc2UucmVzb2x2ZShicmluZ093bFZpZXdUb0Zyb250KHZpZXcpKSxcbiAgICBsb2FkUm91dGU6IChyb3V0ZSwgaG9zdElkKSA9PiB2aWV3LnZpZXcud2ViQ29udGVudHMubG9hZFVSTChjb2RleEFwcFVybChub3JtYWxpemVDb2RleFJvdXRlKHJvdXRlKSwgaG9zdElkIHx8IFwibG9jYWxcIikpLnRoZW4oKCkgPT4ge30pLFxuICAgIGxvYWRVcmw6ICh1cmwpID0+IHZpZXcudmlldy53ZWJDb250ZW50cy5sb2FkVVJMKG5vcm1hbGl6ZU93bFZpZXdVcmwodXJsKSkudGhlbigoKSA9PiB7fSksXG4gICAgZGlzcG9zZTogKCkgPT4gUHJvbWlzZS5yZXNvbHZlKGRpc3Bvc2VPd2xWaWV3QnlJZCh2aWV3LnR3ZWFrSWQsIHZpZXcuaWQpKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGF0dGFjaE93bFZpZXcodmlldzogTWFuYWdlZE93bFZpZXcsIHBhcmVudDogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyk6IHZvaWQge1xuICBjb25zdCB0YXJnZXRzID0gaW5zcGVjdFZpZXdBdHRhY2hUYXJnZXRzKHBhcmVudCwgdmlldy52aWV3KTtcbiAgaWYgKHRhcmdldHMuYWRkQnJvd3NlclZpZXcpIHtcbiAgICBjYWxsT2JqZWN0TWV0aG9kKHBhcmVudCwgXCJhZGRCcm93c2VyVmlld1wiLCBbdmlldy52aWV3XSk7XG4gICAgdmlldy5hdHRhY2hNb2RlID0gXCJicm93c2VyVmlld1wiO1xuICB9IGVsc2UgaWYgKFxuICAgIHRhcmdldHMuYWRkQ2hpbGRWaWV3ICYmXG4gICAgdGFyZ2V0cy53ZWJDb250ZW50c1ZpZXdcbiAgKSB7XG4gICAgdHJ5IHtcbiAgICAgIGFkZE93bENoaWxkVmlldyhwYXJlbnQsIHZpZXcudmlldyk7XG4gICAgICB2aWV3LmF0dGFjaE1vZGUgPSBcImNvbnRlbnRWaWV3XCI7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nKFwid2FyblwiLCBcIk93bCBjb250ZW50VmlldyBhdHRhY2htZW50IGZhaWxlZDsgZmFsbGluZyBiYWNrIHRvIEJyb3dzZXJWaWV3XCIsIHtcbiAgICAgICAgdHdlYWtJZDogdmlldy50d2Vha0lkLFxuICAgICAgICB2aWV3SWQ6IHZpZXcuaWQsXG4gICAgICAgIGVycm9yOiBTdHJpbmcoZSksXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgaWYgKCF2aWV3LmF0dGFjaE1vZGUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJPd2wgdmlldyBhdHRhY2htZW50IGlzIG5vdCBhdmFpbGFibGUgb24gdGhpcyBDb2RleCB3aW5kb3dcIik7XG4gIH1cblxuICBjb25zdCBkaXNwb3NlID0gKCkgPT4gZGlzcG9zZU93bFZpZXdCeUlkKHZpZXcudHdlYWtJZCwgdmlldy5pZCk7XG4gIGJpbmRXaW5kb3dFdmVudChwYXJlbnQsIHZpZXcsIFwiY2xvc2VkXCIsIGRpc3Bvc2UpO1xuICBiaW5kV2luZG93RXZlbnQocGFyZW50LCB2aWV3LCBcImNsb3NlXCIsIGRpc3Bvc2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnJpbmdPd2xWaWV3VG9Gcm9udCh2aWV3OiBNYW5hZ2VkT3dsVmlldyk6IHZvaWQge1xuICBpZiAodmlldy5kaXNwb3NlZCkgcmV0dXJuO1xuICBjb25zdCBwYXJlbnQgPSB2aWV3LnBhcmVudFdpbmRvd0lkID09PSBudWxsID8gbnVsbCA6IEJyb3dzZXJXaW5kb3cuZnJvbUlkKHZpZXcucGFyZW50V2luZG93SWQpO1xuICBpZiAoIXBhcmVudCB8fCBpc1dpbmRvd0Rlc3Ryb3llZChwYXJlbnQpKSByZXR1cm47XG4gIGNvbnN0IGNvbnRlbnRWaWV3ID0gYXNSZWNvcmQocGFyZW50KT8uY29udGVudFZpZXc7XG4gIGNvbnN0IHdlYkNvbnRlbnRzVmlldyA9IGFzUmVjb3JkKHZpZXcudmlldyk/LndlYkNvbnRlbnRzVmlldztcbiAgaWYgKHZpZXcuYXR0YWNoTW9kZSA9PT0gXCJjb250ZW50Vmlld1wiICYmIHdlYkNvbnRlbnRzVmlldykge1xuICAgIHRyeSB7XG4gICAgICBpZiAodHlwZW9mIGFzUmVjb3JkKHBhcmVudCk/LnNldFRvcEJyb3dzZXJWaWV3ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgY2FsbE9iamVjdE1ldGhvZChwYXJlbnQsIFwic2V0VG9wQnJvd3NlclZpZXdcIiwgW3ZpZXcudmlld10pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbE9iamVjdE1ldGhvZChjb250ZW50VmlldywgXCJhZGRDaGlsZFZpZXdcIiwgW3dlYkNvbnRlbnRzVmlld10pO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZyhcIndhcm5cIiwgXCJPd2wgY29udGVudFZpZXcgYnJpbmctdG8tZnJvbnQgZmFpbGVkXCIsIHtcbiAgICAgICAgdHdlYWtJZDogdmlldy50d2Vha0lkLFxuICAgICAgICB2aWV3SWQ6IHZpZXcuaWQsXG4gICAgICAgIGVycm9yOiBTdHJpbmcoZSksXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgaWYgKHR5cGVvZiBhc1JlY29yZChwYXJlbnQpPy5zZXRUb3BCcm93c2VyVmlldyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgY2FsbE9iamVjdE1ldGhvZChwYXJlbnQsIFwic2V0VG9wQnJvd3NlclZpZXdcIiwgW3ZpZXcudmlld10pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRPd2xWaWV3Qm91bmRzKHZpZXc6IE1hbmFnZWRPd2xWaWV3LCBib3VuZHM6IEVsZWN0cm9uLlJlY3RhbmdsZSk6IHZvaWQge1xuICBhc3NlcnRCb3VuZHMoYm91bmRzKTtcbiAgY2FsbE9iamVjdE1ldGhvZCh2aWV3LnZpZXcsIFwic2V0Qm91bmRzXCIsIFtib3VuZHNdKTtcbiAgY2FsbE9iamVjdE1ldGhvZChhc1JlY29yZCh2aWV3LnZpZXcpPy53ZWJDb250ZW50c1ZpZXcsIFwic2V0Qm91bmRzXCIsIFtib3VuZHNdKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldE93bFZpZXdWaXNpYmxlKHZpZXc6IE1hbmFnZWRPd2xWaWV3LCB2aXNpYmxlOiBib29sZWFuKTogdm9pZCB7XG4gIGNhbGxPYmplY3RNZXRob2QoYXNSZWNvcmQodmlldy52aWV3KT8ud2ViQ29udGVudHNWaWV3LCBcInNldFZpc2libGVcIiwgW3Zpc2libGVdKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRpc3Bvc2VPd2xWaWV3QnlJZCh0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgdmlldyA9IG93bFZpZXdzLmdldChvd2xWaWV3S2V5KHR3ZWFrSWQsIGlkKSk7XG4gIGlmICghdmlldykgcmV0dXJuO1xuICBkaXNwb3NlT3dsVmlldyh2aWV3KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRpc3Bvc2VPd2xWaWV3c0ZvclR3ZWFrKHR3ZWFrSWQ6IHN0cmluZyk6IHZvaWQge1xuICBmb3IgKGNvbnN0IHZpZXcgb2YgWy4uLm93bFZpZXdzLnZhbHVlcygpXSkge1xuICAgIGlmICh2aWV3LnR3ZWFrSWQgPT09IHR3ZWFrSWQpIGRpc3Bvc2VPd2xWaWV3KHZpZXcpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkaXNwb3NlQWxsT3dsVmlld3MoKTogdm9pZCB7XG4gIGZvciAoY29uc3QgdmlldyBvZiBbLi4ub3dsVmlld3MudmFsdWVzKCldKSBkaXNwb3NlT3dsVmlldyh2aWV3KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRpc3Bvc2VPd2xWaWV3KHZpZXc6IE1hbmFnZWRPd2xWaWV3KTogdm9pZCB7XG4gIGlmICh2aWV3LmRpc3Bvc2VkKSByZXR1cm47XG4gIHZpZXcuZGlzcG9zZWQgPSB0cnVlO1xuICBvd2xWaWV3cy5kZWxldGUodmlldy5rZXkpO1xuICBmb3IgKGNvbnN0IGRpc3Bvc2Ugb2Ygdmlldy5kaXNwb3NlQmluZGluZ3Muc3BsaWNlKDApKSB7XG4gICAgdHJ5IHtcbiAgICAgIGRpc3Bvc2UoKTtcbiAgICB9IGNhdGNoIHt9XG4gIH1cbiAgY29uc3QgcGFyZW50ID0gdmlldy5wYXJlbnRXaW5kb3dJZCA9PT0gbnVsbCA/IG51bGwgOiBCcm93c2VyV2luZG93LmZyb21JZCh2aWV3LnBhcmVudFdpbmRvd0lkKTtcbiAgaWYgKHBhcmVudCAmJiAhaXNXaW5kb3dEZXN0cm95ZWQocGFyZW50KSkge1xuICAgIHRyeSB7XG4gICAgICBpZiAodmlldy5hdHRhY2hNb2RlID09PSBcImNvbnRlbnRWaWV3XCIpIHtcbiAgICAgICAgcmVtb3ZlT3dsQ2hpbGRWaWV3KHBhcmVudCwgdmlldy52aWV3KTtcbiAgICAgIH0gZWxzZSBpZiAodmlldy5hdHRhY2hNb2RlID09PSBcImJyb3dzZXJWaWV3XCIpIHtcbiAgICAgICAgY2FsbE9iamVjdE1ldGhvZChwYXJlbnQsIFwicmVtb3ZlQnJvd3NlclZpZXdcIiwgW3ZpZXcudmlld10pO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZyhcIndhcm5cIiwgXCJPd2wgdmlldyBkZXRhY2ggZmFpbGVkIGR1cmluZyBkaXNwb3NlXCIsIHtcbiAgICAgICAgdHdlYWtJZDogdmlldy50d2Vha0lkLFxuICAgICAgICB2aWV3SWQ6IHZpZXcuaWQsXG4gICAgICAgIGVycm9yOiBTdHJpbmcoZSksXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgdHJ5IHtcbiAgICBpZiAoIXZpZXcudmlldy53ZWJDb250ZW50cy5pc0Rlc3Ryb3llZCgpKSB7XG4gICAgICB2aWV3LnZpZXcud2ViQ29udGVudHMuY2xvc2UoeyB3YWl0Rm9yQmVmb3JlVW5sb2FkOiBmYWxzZSB9KTtcbiAgICB9XG4gIH0gY2F0Y2gge31cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG93bFZpZXdGb3IodHdlYWtJZDogc3RyaW5nLCBpZDogc3RyaW5nKTogTWFuYWdlZE93bFZpZXcge1xuICBjb25zdCB2aWV3ID0gb3dsVmlld3MuZ2V0KG93bFZpZXdLZXkodHdlYWtJZCwgaWQpKTtcbiAgaWYgKCF2aWV3IHx8IHZpZXcuZGlzcG9zZWQpIHRocm93IG5ldyBFcnJvcihgQ29kZXggdmlldyBpcyBub3QgbG9hZGVkOiAke3R3ZWFrSWR9OiR7aWR9YCk7XG4gIHJldHVybiB2aWV3O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb3dsVmlld0tleSh0d2Vha0lkOiBzdHJpbmcsIHZpZXdJZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke3R3ZWFrSWR9OiR7dmlld0lkfWA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhZGRPd2xDaGlsZFZpZXcocGFyZW50OiBFbGVjdHJvbi5Ccm93c2VyV2luZG93LCBjaGlsZDogRWxlY3Ryb24uQnJvd3NlclZpZXcpOiB2b2lkIHtcbiAgY29uc3Qgb3duZXJXaW5kb3cgPSBhc1JlY29yZChjaGlsZCk/Lm93bmVyV2luZG93O1xuICBpZiAob3duZXJXaW5kb3cgJiYgb3duZXJXaW5kb3cgIT09IHBhcmVudCkge1xuICAgIGNhbGxPYmplY3RNZXRob2Qob3duZXJXaW5kb3csIFwicmVtb3ZlQnJvd3NlclZpZXdcIiwgW2NoaWxkXSk7XG4gIH1cblxuICBjYWxsT2JqZWN0TWV0aG9kKGFzUmVjb3JkKHBhcmVudCk/LmNvbnRlbnRWaWV3LCBcImFkZENoaWxkVmlld1wiLCBbYXNSZWNvcmQoY2hpbGQpPy53ZWJDb250ZW50c1ZpZXddKTtcbiAgdHJ5IHtcbiAgICAoY2hpbGQgYXMgdW5rbm93biBhcyB7IG93bmVyV2luZG93OiBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbCB9KS5vd25lcldpbmRvdyA9IHBhcmVudDtcbiAgfSBjYXRjaCB7fVxuICBjYWxsT2JqZWN0TWV0aG9kKGFzUmVjb3JkKGNoaWxkLndlYkNvbnRlbnRzKSwgXCJfc2V0T3duZXJXaW5kb3dcIiwgW3BhcmVudF0pO1xuXG4gIGNvbnN0IGJyb3dzZXJWaWV3cyA9IGFzUmVjb3JkKHBhcmVudCk/Ll9icm93c2VyVmlld3M7XG4gIGlmIChBcnJheS5pc0FycmF5KGJyb3dzZXJWaWV3cykgJiYgIWJyb3dzZXJWaWV3cy5pbmNsdWRlcyhjaGlsZCkpIHtcbiAgICBicm93c2VyVmlld3MucHVzaChjaGlsZCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZU93bENoaWxkVmlldyhwYXJlbnQ6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3csIGNoaWxkOiBFbGVjdHJvbi5Ccm93c2VyVmlldyk6IHZvaWQge1xuICBjYWxsT2JqZWN0TWV0aG9kKGFzUmVjb3JkKHBhcmVudCk/LmNvbnRlbnRWaWV3LCBcInJlbW92ZUNoaWxkVmlld1wiLCBbYXNSZWNvcmQoY2hpbGQpPy53ZWJDb250ZW50c1ZpZXddKTtcbiAgdHJ5IHtcbiAgICAoY2hpbGQgYXMgdW5rbm93biBhcyB7IG93bmVyV2luZG93OiBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbCB9KS5vd25lcldpbmRvdyA9IG51bGw7XG4gIH0gY2F0Y2gge31cblxuICBjb25zdCBicm93c2VyVmlld3MgPSBhc1JlY29yZChwYXJlbnQpPy5fYnJvd3NlclZpZXdzO1xuICBpZiAoQXJyYXkuaXNBcnJheShicm93c2VyVmlld3MpKSB7XG4gICAgY29uc3QgaW5kZXggPSBicm93c2VyVmlld3MuaW5kZXhPZihjaGlsZCk7XG4gICAgaWYgKGluZGV4ID49IDApIGJyb3dzZXJWaWV3cy5zcGxpY2UoaW5kZXgsIDEpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBiaW5kV2luZG93RXZlbnQoXG4gIHdpbjogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyxcbiAgdmlldzogTWFuYWdlZE93bFZpZXcsXG4gIGV2ZW50OiBzdHJpbmcsXG4gIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLFxuKTogdm9pZCB7XG4gIGNvbnN0IG9uID0gYXNSZWNvcmQod2luKT8ub247XG4gIGNvbnN0IG9mZiA9IGFzUmVjb3JkKHdpbik/Lm9mZjtcbiAgaWYgKHR5cGVvZiBvbiAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm47XG4gIG9uLmNhbGwod2luLCBldmVudCwgbGlzdGVuZXIpO1xuICB2aWV3LmRpc3Bvc2VCaW5kaW5ncy5wdXNoKCgpID0+IHtcbiAgICBpZiAodHlwZW9mIG9mZiA9PT0gXCJmdW5jdGlvblwiKSBvZmYuY2FsbCh3aW4sIGV2ZW50LCBsaXN0ZW5lcik7XG4gICAgZWxzZSBjYWxsT2JqZWN0TWV0aG9kKHdpbiwgXCJyZW1vdmVMaXN0ZW5lclwiLCBbZXZlbnQsIGxpc3RlbmVyXSk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0QnJpZGdlSWQodmFsdWU6IHN0cmluZywgbGFiZWw6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09IFwic3RyaW5nXCIgfHwgIS9eW2EtekEtWjAtOS5fLV0rJC8udGVzdCh2YWx1ZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYCR7bGFiZWx9IG1heSBvbmx5IGNvbnRhaW4gbGV0dGVycywgbnVtYmVycywgZG90cywgdW5kZXJzY29yZXMsIGFuZCBkYXNoZXNgKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRCb3VuZHMoYm91bmRzOiBFbGVjdHJvbi5SZWN0YW5nbGUpOiB2b2lkIHtcbiAgY29uc3QgdmFsdWVzID0gW2JvdW5kcz8ueCwgYm91bmRzPy55LCBib3VuZHM/LndpZHRoLCBib3VuZHM/LmhlaWdodF07XG4gIGlmICghdmFsdWVzLmV2ZXJ5KCh2YWx1ZSkgPT4gdHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiICYmIE51bWJlci5pc0Zpbml0ZSh2YWx1ZSkpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiYm91bmRzIG11c3QgY29udGFpbiBmaW5pdGUgeCwgeSwgd2lkdGgsIGFuZCBoZWlnaHQgbnVtYmVyc1wiKTtcbiAgfVxuICBpZiAoYm91bmRzLndpZHRoIDwgMCB8fCBib3VuZHMuaGVpZ2h0IDwgMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcImJvdW5kcyB3aWR0aCBhbmQgaGVpZ2h0IG11c3QgYmUgbm9uLW5lZ2F0aXZlXCIpO1xuICB9XG59XG4iLCAiaW1wb3J0IHsgQnJvd3NlclZpZXcsIEJyb3dzZXJXaW5kb3cgfSBmcm9tIFwiZWxlY3Ryb25cIjtcbmltcG9ydCB7IENPREVYX1dJTkRPV19TRVJWSUNFU19LRVkgfSBmcm9tIFwiLi9ydW50aW1lLXBhdGhzXCI7XG5pbXBvcnQgdHlwZSB7IENvZGV4V2luZG93UmVmIH0gZnJvbSBcIkBjb2RleC1wbHVzcGx1cy9zZGtcIjtcbmltcG9ydCB7IGluc3BlY3RXaW5kb3dTZXJ2aWNlcyB9IGZyb20gXCIuL2NvZGV4LXJ1bnRpbWUtcHJvYmVcIjtcblxuZXhwb3J0IGludGVyZmFjZSBDb2RleFdpbmRvd1NlcnZpY2VzIHtcbiAgY3JlYXRlRnJlc2hXaW5kb3c/OiAocm91dGU/OiBzdHJpbmcpID0+IFByb21pc2U8RWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGw+O1xuICBjcmVhdGVGcmVzaExvY2FsV2luZG93PzogKHJvdXRlPzogc3RyaW5nKSA9PiBQcm9taXNlPEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsPjtcbiAgZW5zdXJlSG9zdFdpbmRvdz86IChob3N0SWQ/OiBzdHJpbmcpID0+IFByb21pc2U8RWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGw+O1xuICBnZXRQcmltYXJ5V2luZG93PzogKGhvc3RJZD86IHN0cmluZykgPT4gRWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGw7XG4gIGdldENvbnRleHQ/OiAoaG9zdElkOiBzdHJpbmcpID0+IHsgcmVnaXN0ZXJXaW5kb3c/OiAod2luZG93TGlrZTogQ29kZXhXaW5kb3dMaWtlKSA9PiB2b2lkIH0gfCBudWxsO1xuICB3aW5kb3dNYW5hZ2VyPzoge1xuICAgIGNyZWF0ZVdpbmRvdz86IChvcHRzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikgPT4gUHJvbWlzZTxFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbD47XG4gICAgZ2V0UHJpbWFyeVdpbmRvdz86ICgpID0+IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsO1xuICAgIHJlZ2lzdGVyV2luZG93PzogKFxuICAgICAgd2luZG93TGlrZTogQ29kZXhXaW5kb3dMaWtlLFxuICAgICAgaG9zdElkOiBzdHJpbmcsXG4gICAgICBwcmltYXJ5OiBib29sZWFuLFxuICAgICAgYXBwZWFyYW5jZTogc3RyaW5nLFxuICAgICkgPT4gdm9pZDtcbiAgICBvcHRpb25zPzoge1xuICAgICAgYWxsb3dEZXZ0b29scz86IGJvb2xlYW47XG4gICAgICBwcmVsb2FkUGF0aD86IHN0cmluZztcbiAgICB9O1xuICB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvZGV4V2luZG93TGlrZSB7XG4gIGlkOiBudW1iZXI7XG4gIHdlYkNvbnRlbnRzOiBFbGVjdHJvbi5XZWJDb250ZW50cztcbiAgb24oZXZlbnQ6IFwiY2xvc2VkXCIsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdW5rbm93bjtcbiAgb25jZT8oZXZlbnQ6IHN0cmluZywgbGlzdGVuZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpOiB1bmtub3duO1xuICBvZmY/KGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKTogdW5rbm93bjtcbiAgcmVtb3ZlTGlzdGVuZXI/KGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKTogdW5rbm93bjtcbiAgaXNEZXN0cm95ZWQ/KCk6IGJvb2xlYW47XG4gIGlzRm9jdXNlZD8oKTogYm9vbGVhbjtcbiAgZm9jdXM/KCk6IHZvaWQ7XG4gIHNob3c/KCk6IHZvaWQ7XG4gIGhpZGU/KCk6IHZvaWQ7XG4gIGdldEJvdW5kcz8oKTogRWxlY3Ryb24uUmVjdGFuZ2xlO1xuICBnZXRDb250ZW50Qm91bmRzPygpOiBFbGVjdHJvbi5SZWN0YW5nbGU7XG4gIGdldFNpemU/KCk6IFtudW1iZXIsIG51bWJlcl07XG4gIGdldENvbnRlbnRTaXplPygpOiBbbnVtYmVyLCBudW1iZXJdO1xuICBzZXRUaXRsZT8odGl0bGU6IHN0cmluZyk6IHZvaWQ7XG4gIGdldFRpdGxlPygpOiBzdHJpbmc7XG4gIHNldFJlcHJlc2VudGVkRmlsZW5hbWU/KGZpbGVuYW1lOiBzdHJpbmcpOiB2b2lkO1xuICBzZXREb2N1bWVudEVkaXRlZD8oZWRpdGVkOiBib29sZWFuKTogdm9pZDtcbiAgc2V0V2luZG93QnV0dG9uVmlzaWJpbGl0eT8odmlzaWJsZTogYm9vbGVhbik6IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29kZXhDcmVhdGVXaW5kb3dPcHRpb25zIHtcbiAgcm91dGU6IHN0cmluZztcbiAgaG9zdElkPzogc3RyaW5nO1xuICBzaG93PzogYm9vbGVhbjtcbiAgYXBwZWFyYW5jZT86IHN0cmluZztcbiAgcGFyZW50V2luZG93SWQ/OiBudW1iZXI7XG4gIGJvdW5kcz86IEVsZWN0cm9uLlJlY3RhbmdsZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb2RleENyZWF0ZVZpZXdPcHRpb25zIHtcbiAgcm91dGU6IHN0cmluZztcbiAgaG9zdElkPzogc3RyaW5nO1xuICBhcHBlYXJhbmNlPzogc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJpbWFyeUNvZGV4V2luZG93KCk6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsIHtcbiAgY29uc3Qgc2VydmljZXMgPSBnZXRDb2RleFdpbmRvd1NlcnZpY2VzKCk7XG4gIGNvbnN0IGluc3BlY3RlZCA9IGluc3BlY3RXaW5kb3dTZXJ2aWNlcyhzZXJ2aWNlcyk7XG4gIGNvbnN0IGZyb21TZXJ2aWNlcyA9IGluc3BlY3RlZC5nZXRQcmltYXJ5V2luZG93XG4gICAgPyBzZXJ2aWNlcz8uZ2V0UHJpbWFyeVdpbmRvdz8uKFwibG9jYWxcIikgPz8gbnVsbFxuICAgIDogbnVsbDtcbiAgaWYgKGZyb21TZXJ2aWNlcyAmJiAhZnJvbVNlcnZpY2VzLmlzRGVzdHJveWVkKCkpIHJldHVybiBmcm9tU2VydmljZXM7XG4gIGNvbnN0IGZyb21NYW5hZ2VyID0gaW5zcGVjdGVkLmdldFByaW1hcnlXaW5kb3dGcm9tTWFuYWdlclxuICAgID8gc2VydmljZXM/LndpbmRvd01hbmFnZXI/LmdldFByaW1hcnlXaW5kb3c/LmNhbGwoc2VydmljZXMud2luZG93TWFuYWdlcikgPz8gbnVsbFxuICAgIDogbnVsbDtcbiAgaWYgKGZyb21NYW5hZ2VyICYmICFmcm9tTWFuYWdlci5pc0Rlc3Ryb3llZCgpKSByZXR1cm4gZnJvbU1hbmFnZXI7XG4gIGNvbnN0IGZvY3VzZWQgPSBCcm93c2VyV2luZG93LmdldEZvY3VzZWRXaW5kb3coKTtcbiAgaWYgKGZvY3VzZWQgJiYgIWZvY3VzZWQuaXNEZXN0cm95ZWQoKSkgcmV0dXJuIGZvY3VzZWQ7XG4gIHJldHVybiBCcm93c2VyV2luZG93LmdldEFsbFdpbmRvd3MoKS5maW5kKCh3aW4pID0+ICF3aW4uaXNEZXN0cm95ZWQoKSkgPz8gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFByaW1hcnlDb2RleFdpbmRvd1JlZigpOiBDb2RleFdpbmRvd1JlZiB8IG51bGwge1xuICBjb25zdCB3aW4gPSBnZXRQcmltYXJ5Q29kZXhXaW5kb3coKTtcbiAgaWYgKCF3aW4gfHwgd2luLmlzRGVzdHJveWVkKCkpIHJldHVybiBudWxsO1xuICByZXR1cm4geyB3aW5kb3dJZDogd2luLmlkLCB3ZWJDb250ZW50c0lkOiB3aW4ud2ViQ29udGVudHMuaWQgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvY3VzQ29kZXhXaW5kb3cod2luZG93SWQ6IG51bWJlcik6IGJvb2xlYW4ge1xuICBjb25zdCB3aW4gPSBCcm93c2VyV2luZG93LmZyb21JZCh3aW5kb3dJZCk7XG4gIGlmICghd2luIHx8IHdpbi5pc0Rlc3Ryb3llZCgpKSByZXR1cm4gZmFsc2U7XG4gIGlmICh3aW4uaXNNaW5pbWl6ZWQoKSkgd2luLnJlc3RvcmUoKTtcbiAgd2luLnNob3coKTtcbiAgd2luLmZvY3VzKCk7XG4gIHJldHVybiB0cnVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2hvd0NvZGV4V2luZG93KHdpbmRvd0lkOiBudW1iZXIpOiBib29sZWFuIHtcbiAgY29uc3Qgd2luID0gQnJvd3NlcldpbmRvdy5mcm9tSWQod2luZG93SWQpO1xuICBpZiAoIXdpbiB8fCB3aW4uaXNEZXN0cm95ZWQoKSkgcmV0dXJuIGZhbHNlO1xuICB3aW4uc2hvdygpO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUNvZGV4QnJvd3NlclZpZXcob3B0czogQ29kZXhDcmVhdGVWaWV3T3B0aW9ucyk6IFByb21pc2U8dW5rbm93bj4ge1xuICBjb25zdCBzZXJ2aWNlcyA9IGdldENvZGV4V2luZG93U2VydmljZXMoKTtcbiAgY29uc3Qgd2luZG93TWFuYWdlciA9IHNlcnZpY2VzPy53aW5kb3dNYW5hZ2VyO1xuICBjb25zdCBpbnNwZWN0ZWQgPSBpbnNwZWN0V2luZG93U2VydmljZXMoc2VydmljZXMpO1xuICBpZiAoIXNlcnZpY2VzIHx8ICF3aW5kb3dNYW5hZ2VyPy5yZWdpc3RlcldpbmRvdyB8fCAhaW5zcGVjdGVkLnJlZ2lzdGVyV2luZG93KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgXCJDb2RleCBlbWJlZGRlZCB2aWV3IHNlcnZpY2VzIGFyZSBub3QgYXZhaWxhYmxlLiBSZWluc3RhbGwgQ29kZXgrKyAxLjAuMCBvciBsYXRlci5cIixcbiAgICApO1xuICB9XG5cbiAgY29uc3Qgcm91dGUgPSBub3JtYWxpemVDb2RleFJvdXRlKG9wdHMucm91dGUpO1xuICBjb25zdCBob3N0SWQgPSBvcHRzLmhvc3RJZCB8fCBcImxvY2FsXCI7XG4gIGNvbnN0IGFwcGVhcmFuY2UgPSBvcHRzLmFwcGVhcmFuY2UgfHwgXCJzZWNvbmRhcnlcIjtcbiAgY29uc3QgdmlldyA9IG5ldyBCcm93c2VyVmlldyh7XG4gICAgd2ViUHJlZmVyZW5jZXM6IHtcbiAgICAgIHByZWxvYWQ6IHdpbmRvd01hbmFnZXIub3B0aW9ucz8ucHJlbG9hZFBhdGgsXG4gICAgICBjb250ZXh0SXNvbGF0aW9uOiB0cnVlLFxuICAgICAgbm9kZUludGVncmF0aW9uOiBmYWxzZSxcbiAgICAgIHNwZWxsY2hlY2s6IGZhbHNlLFxuICAgICAgZGV2VG9vbHM6IHdpbmRvd01hbmFnZXIub3B0aW9ucz8uYWxsb3dEZXZ0b29scyxcbiAgICB9LFxuICB9KTtcbiAgY29uc3Qgd2luZG93TGlrZSA9IG1ha2VXaW5kb3dMaWtlRm9yVmlldyh2aWV3KTtcbiAgd2luZG93TWFuYWdlci5yZWdpc3RlcldpbmRvdyh3aW5kb3dMaWtlLCBob3N0SWQsIGZhbHNlLCBhcHBlYXJhbmNlKTtcbiAgc2VydmljZXMuZ2V0Q29udGV4dD8uKGhvc3RJZCk/LnJlZ2lzdGVyV2luZG93Py4od2luZG93TGlrZSk7XG4gIGF3YWl0IHZpZXcud2ViQ29udGVudHMubG9hZFVSTChjb2RleEFwcFVybChyb3V0ZSwgaG9zdElkKSk7XG4gIHJldHVybiB2aWV3O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlQ29kZXhXaW5kb3cob3B0czogQ29kZXhDcmVhdGVXaW5kb3dPcHRpb25zKTogUHJvbWlzZTxDb2RleFdpbmRvd1JlZj4ge1xuICBjb25zdCBzZXJ2aWNlcyA9IGdldENvZGV4V2luZG93U2VydmljZXMoKTtcbiAgY29uc3QgaW5zcGVjdGVkID0gaW5zcGVjdFdpbmRvd1NlcnZpY2VzKHNlcnZpY2VzKTtcbiAgaWYgKCFzZXJ2aWNlcyB8fCAhaW5zcGVjdGVkLnByZXNlbnQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBcIkNvZGV4IHdpbmRvdyBzZXJ2aWNlcyBhcmUgbm90IGF2YWlsYWJsZS4gUmVpbnN0YWxsIENvZGV4KysgMS4wLjAgb3IgbGF0ZXIuXCIsXG4gICAgKTtcbiAgfVxuXG4gIGNvbnN0IHJvdXRlID0gbm9ybWFsaXplQ29kZXhSb3V0ZShvcHRzLnJvdXRlKTtcbiAgY29uc3QgaG9zdElkID0gb3B0cy5ob3N0SWQgfHwgXCJsb2NhbFwiO1xuICBjb25zdCBwYXJlbnQgPSB0eXBlb2Ygb3B0cy5wYXJlbnRXaW5kb3dJZCA9PT0gXCJudW1iZXJcIlxuICAgID8gQnJvd3NlcldpbmRvdy5mcm9tSWQob3B0cy5wYXJlbnRXaW5kb3dJZClcbiAgICA6IEJyb3dzZXJXaW5kb3cuZ2V0Rm9jdXNlZFdpbmRvdygpO1xuICBjb25zdCBjcmVhdGVXaW5kb3cgPSBzZXJ2aWNlcy53aW5kb3dNYW5hZ2VyPy5jcmVhdGVXaW5kb3c7XG5cbiAgbGV0IHdpbjogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGwgfCB1bmRlZmluZWQ7XG4gIGlmIChpbnNwZWN0ZWQuY3JlYXRlV2luZG93ICYmIHR5cGVvZiBjcmVhdGVXaW5kb3cgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHdpbiA9IGF3YWl0IGNyZWF0ZVdpbmRvdy5jYWxsKHNlcnZpY2VzLndpbmRvd01hbmFnZXIsIHtcbiAgICAgIGluaXRpYWxSb3V0ZTogcm91dGUsXG4gICAgICBob3N0SWQsXG4gICAgICBzaG93OiBvcHRzLnNob3cgIT09IGZhbHNlLFxuICAgICAgYXBwZWFyYW5jZTogb3B0cy5hcHBlYXJhbmNlIHx8IFwic2Vjb25kYXJ5XCIsXG4gICAgICBwYXJlbnQsXG4gICAgfSk7XG4gIH0gZWxzZSBpZiAoaG9zdElkID09PSBcImxvY2FsXCIgJiYgaW5zcGVjdGVkLmNyZWF0ZUZyZXNoV2luZG93ICYmIHR5cGVvZiBzZXJ2aWNlcy5jcmVhdGVGcmVzaFdpbmRvdyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgd2luID0gYXdhaXQgc2VydmljZXMuY3JlYXRlRnJlc2hXaW5kb3cocm91dGUpO1xuICB9IGVsc2UgaWYgKGhvc3RJZCA9PT0gXCJsb2NhbFwiICYmIGluc3BlY3RlZC5jcmVhdGVGcmVzaExvY2FsV2luZG93ICYmIHR5cGVvZiBzZXJ2aWNlcy5jcmVhdGVGcmVzaExvY2FsV2luZG93ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICB3aW4gPSBhd2FpdCBzZXJ2aWNlcy5jcmVhdGVGcmVzaExvY2FsV2luZG93KHJvdXRlKTtcbiAgfSBlbHNlIGlmIChpbnNwZWN0ZWQuZW5zdXJlSG9zdFdpbmRvdyAmJiB0eXBlb2Ygc2VydmljZXMuZW5zdXJlSG9zdFdpbmRvdyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgd2luID0gYXdhaXQgc2VydmljZXMuZW5zdXJlSG9zdFdpbmRvdyhob3N0SWQpO1xuICB9XG5cbiAgaWYgKCF3aW4gfHwgd2luLmlzRGVzdHJveWVkKCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb2RleCBkaWQgbm90IHJldHVybiBhIHdpbmRvdyBmb3IgdGhlIHJlcXVlc3RlZCByb3V0ZVwiKTtcbiAgfVxuXG4gIGlmIChvcHRzLmJvdW5kcykge1xuICAgIHdpbi5zZXRCb3VuZHMob3B0cy5ib3VuZHMpO1xuICB9XG4gIGlmIChwYXJlbnQgJiYgIXBhcmVudC5pc0Rlc3Ryb3llZCgpKSB7XG4gICAgdHJ5IHtcbiAgICAgIHdpbi5zZXRQYXJlbnRXaW5kb3cocGFyZW50KTtcbiAgICB9IGNhdGNoIHt9XG4gIH1cbiAgaWYgKG9wdHMuc2hvdyAhPT0gZmFsc2UpIHtcbiAgICB3aW4uc2hvdygpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICB3aW5kb3dJZDogd2luLmlkLFxuICAgIHdlYkNvbnRlbnRzSWQ6IHdpbi53ZWJDb250ZW50cy5pZCxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VXaW5kb3dMaWtlRm9yVmlldyh2aWV3OiBFbGVjdHJvbi5Ccm93c2VyVmlldyk6IENvZGV4V2luZG93TGlrZSB7XG4gIGNvbnN0IHZpZXdCb3VuZHMgPSAoKSA9PiB2aWV3LmdldEJvdW5kcygpO1xuICByZXR1cm4ge1xuICAgIGlkOiB2aWV3LndlYkNvbnRlbnRzLmlkLFxuICAgIHdlYkNvbnRlbnRzOiB2aWV3LndlYkNvbnRlbnRzLFxuICAgIG9uOiAoZXZlbnQ6IFwiY2xvc2VkXCIsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKSA9PiB7XG4gICAgICBpZiAoZXZlbnQgPT09IFwiY2xvc2VkXCIpIHtcbiAgICAgICAgdmlldy53ZWJDb250ZW50cy5vbmNlKFwiZGVzdHJveWVkXCIsIGxpc3RlbmVyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZpZXcud2ViQ29udGVudHMub24oZXZlbnQsIGxpc3RlbmVyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB2aWV3O1xuICAgIH0sXG4gICAgb25jZTogKGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKSA9PiB7XG4gICAgICB2aWV3LndlYkNvbnRlbnRzLm9uY2UoZXZlbnQgYXMgXCJkZXN0cm95ZWRcIiwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHZpZXc7XG4gICAgfSxcbiAgICBvZmY6IChldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCkgPT4ge1xuICAgICAgdmlldy53ZWJDb250ZW50cy5vZmYoZXZlbnQgYXMgXCJkZXN0cm95ZWRcIiwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHZpZXc7XG4gICAgfSxcbiAgICByZW1vdmVMaXN0ZW5lcjogKGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKSA9PiB7XG4gICAgICB2aWV3LndlYkNvbnRlbnRzLnJlbW92ZUxpc3RlbmVyKGV2ZW50IGFzIFwiZGVzdHJveWVkXCIsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB2aWV3O1xuICAgIH0sXG4gICAgaXNEZXN0cm95ZWQ6ICgpID0+IHZpZXcud2ViQ29udGVudHMuaXNEZXN0cm95ZWQoKSxcbiAgICBpc0ZvY3VzZWQ6ICgpID0+IHZpZXcud2ViQ29udGVudHMuaXNGb2N1c2VkKCksXG4gICAgZm9jdXM6ICgpID0+IHZpZXcud2ViQ29udGVudHMuZm9jdXMoKSxcbiAgICBzaG93OiAoKSA9PiB7fSxcbiAgICBoaWRlOiAoKSA9PiB7fSxcbiAgICBnZXRCb3VuZHM6IHZpZXdCb3VuZHMsXG4gICAgZ2V0Q29udGVudEJvdW5kczogdmlld0JvdW5kcyxcbiAgICBnZXRTaXplOiAoKSA9PiB7XG4gICAgICBjb25zdCBiID0gdmlld0JvdW5kcygpO1xuICAgICAgcmV0dXJuIFtiLndpZHRoLCBiLmhlaWdodF07XG4gICAgfSxcbiAgICBnZXRDb250ZW50U2l6ZTogKCkgPT4ge1xuICAgICAgY29uc3QgYiA9IHZpZXdCb3VuZHMoKTtcbiAgICAgIHJldHVybiBbYi53aWR0aCwgYi5oZWlnaHRdO1xuICAgIH0sXG4gICAgc2V0VGl0bGU6ICgpID0+IHt9LFxuICAgIGdldFRpdGxlOiAoKSA9PiBcIlwiLFxuICAgIHNldFJlcHJlc2VudGVkRmlsZW5hbWU6ICgpID0+IHt9LFxuICAgIHNldERvY3VtZW50RWRpdGVkOiAoKSA9PiB7fSxcbiAgICBzZXRXaW5kb3dCdXR0b25WaXNpYmlsaXR5OiAoKSA9PiB7fSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvZGV4QXBwVXJsKHJvdXRlOiBzdHJpbmcsIGhvc3RJZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgdXJsID0gbmV3IFVSTChcImFwcDovLy0vaW5kZXguaHRtbFwiKTtcbiAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoXCJob3N0SWRcIiwgaG9zdElkKTtcbiAgaWYgKHJvdXRlICE9PSBcIi9cIikgdXJsLnNlYXJjaFBhcmFtcy5zZXQoXCJpbml0aWFsUm91dGVcIiwgcm91dGUpO1xuICByZXR1cm4gdXJsLnRvU3RyaW5nKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVPd2xWaWV3VXJsKHVybDogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKHR5cGVvZiB1cmwgIT09IFwic3RyaW5nXCIgfHwgdXJsLmluY2x1ZGVzKFwiXFxuXCIpIHx8IHVybC5pbmNsdWRlcyhcIlxcclwiKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk93bCB2aWV3IFVSTCBtdXN0IGJlIGEgc3RyaW5nIHdpdGhvdXQgY29udHJvbCBjaGFyYWN0ZXJzXCIpO1xuICB9XG4gIGNvbnN0IHBhcnNlZCA9IG5ldyBVUkwodXJsKTtcbiAgaWYgKCFbXCJodHRwOlwiLCBcImh0dHBzOlwiLCBcImFwcDpcIiwgXCJmaWxlOlwiLCBcImRhdGE6XCIsIFwiYWJvdXQ6XCJdLmluY2x1ZGVzKHBhcnNlZC5wcm90b2NvbCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYHVuc3VwcG9ydGVkIE93bCB2aWV3IFVSTCBwcm90b2NvbDogJHtwYXJzZWQucHJvdG9jb2x9YCk7XG4gIH1cbiAgcmV0dXJuIHBhcnNlZC50b1N0cmluZygpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29kZXhXaW5kb3dTZXJ2aWNlcygpOiBDb2RleFdpbmRvd1NlcnZpY2VzIHwgbnVsbCB7XG4gIGNvbnN0IHNlcnZpY2VzID0gKGdsb2JhbFRoaXMgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilbQ09ERVhfV0lORE9XX1NFUlZJQ0VTX0tFWV07XG4gIHJldHVybiBzZXJ2aWNlcyAmJiB0eXBlb2Ygc2VydmljZXMgPT09IFwib2JqZWN0XCIgPyAoc2VydmljZXMgYXMgQ29kZXhXaW5kb3dTZXJ2aWNlcykgOiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplQ29kZXhSb3V0ZShyb3V0ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKHR5cGVvZiByb3V0ZSAhPT0gXCJzdHJpbmdcIiB8fCAhcm91dGUuc3RhcnRzV2l0aChcIi9cIikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb2RleCByb3V0ZSBtdXN0IGJlIGFuIGFic29sdXRlIGFwcCByb3V0ZVwiKTtcbiAgfVxuICBpZiAocm91dGUuaW5jbHVkZXMoXCI6Ly9cIikgfHwgcm91dGUuaW5jbHVkZXMoXCJcXG5cIikgfHwgcm91dGUuaW5jbHVkZXMoXCJcXHJcIikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb2RleCByb3V0ZSBtdXN0IG5vdCBpbmNsdWRlIGEgcHJvdG9jb2wgb3IgY29udHJvbCBjaGFyYWN0ZXJzXCIpO1xuICB9XG4gIHJldHVybiByb3V0ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFzUmVjb3JkKHZhbHVlOiB1bmtub3duKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsIHtcbiAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiA/IHZhbHVlIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IDogbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbGxPYmplY3RNZXRob2QodGFyZ2V0OiB1bmtub3duLCBtZXRob2Q6IHN0cmluZywgYXJnczogdW5rbm93bltdKTogdW5rbm93biB7XG4gIGNvbnN0IGZuID0gYXNSZWNvcmQodGFyZ2V0KT8uW21ldGhvZF07XG4gIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHVuZGVmaW5lZDtcbiAgcmV0dXJuIGZuLmFwcGx5KHRhcmdldCwgYXJncyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1dpbmRvd0Rlc3Ryb3llZCh3aW46IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsIHwgdW5kZWZpbmVkKTogYm9vbGVhbiB7XG4gIGlmICghd2luKSByZXR1cm4gdHJ1ZTtcbiAgY29uc3QgZm4gPSBhc1JlY29yZCh3aW4pPy5pc0Rlc3Ryb3llZDtcbiAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm4gZmFsc2U7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEJvb2xlYW4oZm4uY2FsbCh3aW4pKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdpbmRvd0lkRm9yKHdpbjogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGwgfCB1bmRlZmluZWQpOiBudW1iZXIgfCBudWxsIHtcbiAgY29uc3QgaWQgPSBhc1JlY29yZCh3aW4pPy5pZDtcbiAgcmV0dXJuIHR5cGVvZiBpZCA9PT0gXCJudW1iZXJcIiA/IGlkIDogbnVsbDtcbn1cbiIsICJpbXBvcnQgeyBpcGNNYWluLCB3ZWJDb250ZW50cyB9IGZyb20gXCJlbGVjdHJvblwiO1xuaW1wb3J0IHsgZXhpc3RzU3luYywgbWtkaXJTeW5jLCByZWFscGF0aFN5bmMgfSBmcm9tIFwibm9kZTpmc1wiO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gXCJub2RlOnBhdGhcIjtcbmltcG9ydCB7IGRpc2NvdmVyVHdlYWtzLCB0eXBlIERpc2NvdmVyZWRUd2VhayB9IGZyb20gXCIuL3R3ZWFrLWRpc2NvdmVyeVwiO1xuaW1wb3J0IHsgY3JlYXRlRGlza1N0b3JhZ2UsIHR5cGUgRGlza1N0b3JhZ2UgfSBmcm9tIFwiLi9zdG9yYWdlXCI7XG5pbXBvcnQgeyBzeW5jTWFuYWdlZE1jcFNlcnZlcnMgfSBmcm9tIFwiLi9tY3Atc3luY1wiO1xuaW1wb3J0IHtcbiAgaXNNYWluUHJvY2Vzc1R3ZWFrU2NvcGUsXG4gIHJlbG9hZFR3ZWFrcyxcbiAgdHlwZSBTZXRUd2Vha0VuYWJsZWRBbmRSZWxvYWREZXBzLFxufSBmcm9tIFwiLi90d2Vhay1saWZlY3ljbGVcIjtcbmltcG9ydCB7IE5hdGl2ZUJyaWRnZSwgdHlwZSBOYXRpdmVUd2Vha0NvbnRleHQgfSBmcm9tIFwiLi9uYXRpdmUtYnJpZGdlXCI7XG5pbXBvcnQgeyBpc1BhdGhJbnNpZGUgfSBmcm9tIFwiLi9uYXRpdmUtcGF0aHNcIjtcbmltcG9ydCB7XG4gIGdldENkcFN0YXR1cyxcbiAgZ2V0UnVudGltZUNhcGFiaWxpdGllcyxcbiAgZ2V0UnVudGltZUluZm8sXG4gIGxpc3RDZHBUYXJnZXRzLFxuICB3aW5kb3dTYW1wbGVGcm9tLFxufSBmcm9tIFwiLi9jb2RleC1ydW50aW1lLXByb2JlXCI7XG5pbXBvcnQgdHlwZSB7XG4gIENvZGV4UnVudGltZUNhcGFiaWxpdGllcyxcbiAgQ29kZXhSdW50aW1lSW5mbyxcbiAgQ29kZXhWaWV3Q3JlYXRlT3B0aW9ucyxcbiAgTmF0aXZlSGVscGVyTGF1bmNoT3B0aW9ucyxcbiAgTmF0aXZlTW9kdWxlTG9hZE9wdGlvbnMsXG4gIE5hdGl2ZVBhbmVsQ3JlYXRlT3B0aW9ucyxcbiAgTmF0aXZlVmlld0F0dGFjaE9wdGlvbnMsXG4gIFR3ZWFrUGVybWlzc2lvbixcbn0gZnJvbSBcIkBjb2RleC1wbHVzcGx1cy9zZGtcIjtcbmltcG9ydCB7XG4gIGlzVHdlYWtFbmFibGVkLFxuICByZWFkSW5zdGFsbGVyU3RhdGUsXG4gIHJlYWRTdGF0ZSxcbiAgc2V0VHdlYWtFbmFibGVkLFxuICB3cml0ZVN0YXRlLFxuICB0eXBlIFR3ZWFrVXBkYXRlQ2hlY2ssXG59IGZyb20gXCIuL2NvbmZpZy1zdGF0ZVwiO1xuaW1wb3J0IHtcbiAgYXNzZXJ0U3RvcmVFbnRyeVBsYXRmb3JtQ29tcGF0aWJsZSxcbiAgYXNzZXJ0U3RvcmVFbnRyeVJ1bnRpbWVDb21wYXRpYmxlLFxuICBjb21wYXJlVmVyc2lvbnMsXG4gIGZldGNoVHdlYWtTdG9yZVJlZ2lzdHJ5LFxuICBpbnN0YWxsU3RvcmVUd2VhayxcbiAgbm9ybWFsaXplVmVyc2lvbixcbn0gZnJvbSBcIi4vc3RvcmUtaW5zdGFsbFwiO1xuaW1wb3J0IHsgbm9ybWFsaXplR2l0SHViUmVwbyB9IGZyb20gXCIuL3R3ZWFrLXN0b3JlXCI7XG5pbXBvcnQge1xuICBDT0RFWF9DT05GSUdfRklMRSxcbiAgVFdFQUtTX0RJUixcbiAgbG9nLFxuICBydW50aW1lRGlyLFxuICB1c2VyUm9vdCxcbn0gZnJvbSBcIi4vcnVudGltZS1wYXRoc1wiO1xuaW1wb3J0IHtcbiAgY3JlYXRlQ29kZXhCcm93c2VyVmlldyxcbiAgY3JlYXRlQ29kZXhXaW5kb3csXG4gIGZvY3VzQ29kZXhXaW5kb3csXG4gIGdldENvZGV4V2luZG93U2VydmljZXMsXG4gIGdldFByaW1hcnlDb2RleFdpbmRvdyxcbiAgZ2V0UHJpbWFyeUNvZGV4V2luZG93UmVmLFxuICBzaG93Q29kZXhXaW5kb3csXG59IGZyb20gXCIuL2NvZGV4LXdpbmRvd3NcIjtcbmltcG9ydCB7XG4gIGNyZWF0ZU93bFZpZXcsXG4gIGRpc3Bvc2VPd2xWaWV3c0ZvclR3ZWFrLFxufSBmcm9tIFwiLi9vd2wtdmlld3NcIjtcblxuY29uc3QgVVBEQVRFX0NIRUNLX0lOVEVSVkFMX01TID0gMjQgKiA2MCAqIDYwICogMTAwMDtcblxuZXhwb3J0IGludGVyZmFjZSBMb2FkZWRNYWluVHdlYWsge1xuICBzdG9wPzogKCkgPT4gdm9pZDtcbiAgc3RvcmFnZTogRGlza1N0b3JhZ2U7XG59XG5cbmV4cG9ydCBjb25zdCB0d2Vha1N0YXRlID0ge1xuICBkaXNjb3ZlcmVkOiBbXSBhcyBEaXNjb3ZlcmVkVHdlYWtbXSxcbiAgbG9hZGVkTWFpbjogbmV3IE1hcDxzdHJpbmcsIExvYWRlZE1haW5Ud2Vhaz4oKSxcbn07XG5cbmV4cG9ydCBjb25zdCBuYXRpdmVCcmlkZ2UgPSBuZXcgTmF0aXZlQnJpZGdlKGxvZywge1xuICBuYXRpdmVIb3N0UGF0aDogam9pbihydW50aW1lRGlyLCBcIm5hdGl2ZVwiLCBcImNvZGV4cHBfbmF0aXZlX2hvc3Qubm9kZVwiKSxcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gbG9hZEFsbE1haW5Ud2Vha3MoKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkID0gZGlzY292ZXJUd2Vha3MoVFdFQUtTX0RJUik7XG4gICAgbG9nKFxuICAgICAgXCJpbmZvXCIsXG4gICAgICBgZGlzY292ZXJlZCAke3R3ZWFrU3RhdGUuZGlzY292ZXJlZC5sZW5ndGh9IHR3ZWFrKHMpOmAsXG4gICAgICB0d2Vha1N0YXRlLmRpc2NvdmVyZWQubWFwKCh0KSA9PiB0Lm1hbmlmZXN0LmlkKS5qb2luKFwiLCBcIiksXG4gICAgKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZyhcImVycm9yXCIsIFwidHdlYWsgZGlzY292ZXJ5IGZhaWxlZDpcIiwgZSk7XG4gICAgdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkID0gW107XG4gIH1cblxuICBzeW5jTWNwU2VydmVyc0Zyb21FbmFibGVkVHdlYWtzKCk7XG5cbiAgZm9yIChjb25zdCB0IG9mIHR3ZWFrU3RhdGUuZGlzY292ZXJlZCkge1xuICAgIGlmICghaXNNYWluUHJvY2Vzc1R3ZWFrU2NvcGUodC5tYW5pZmVzdC5zY29wZSkpIGNvbnRpbnVlO1xuICAgIGlmICghaXNUd2Vha0VuYWJsZWQodC5tYW5pZmVzdC5pZCkpIHtcbiAgICAgIGxvZyhcImluZm9cIiwgYHNraXBwaW5nIGRpc2FibGVkIG1haW4gdHdlYWs6ICR7dC5tYW5pZmVzdC5pZH1gKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgbW9kID0gcmVxdWlyZSh0LmVudHJ5KTtcbiAgICAgIGNvbnN0IHR3ZWFrID0gbW9kLmRlZmF1bHQgPz8gbW9kO1xuICAgICAgaWYgKHR5cGVvZiB0d2Vhaz8uc3RhcnQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBjb25zdCBzdG9yYWdlID0gY3JlYXRlRGlza1N0b3JhZ2UodXNlclJvb3QhLCB0Lm1hbmlmZXN0LmlkKTtcbiAgICAgICAgdHdlYWsuc3RhcnQoe1xuICAgICAgICAgIG1hbmlmZXN0OiB0Lm1hbmlmZXN0LFxuICAgICAgICAgIHByb2Nlc3M6IFwibWFpblwiLFxuICAgICAgICAgIGxvZzogbWFrZUxvZ2dlcih0Lm1hbmlmZXN0LmlkKSxcbiAgICAgICAgICBzdG9yYWdlLFxuICAgICAgICAgIGlwYzogbWFrZU1haW5JcGModC5tYW5pZmVzdC5pZCksXG4gICAgICAgICAgZnM6IG1ha2VNYWluRnModC5tYW5pZmVzdC5pZCksXG4gICAgICAgICAgY29kZXg6IG1ha2VDb2RleEFwaSh0KSxcbiAgICAgICAgfSk7XG4gICAgICAgIHR3ZWFrU3RhdGUubG9hZGVkTWFpbi5zZXQodC5tYW5pZmVzdC5pZCwge1xuICAgICAgICAgIHN0b3A6IHR3ZWFrLnN0b3AsXG4gICAgICAgICAgc3RvcmFnZSxcbiAgICAgICAgfSk7XG4gICAgICAgIGxvZyhcImluZm9cIiwgYHN0YXJ0ZWQgbWFpbiB0d2VhazogJHt0Lm1hbmlmZXN0LmlkfWApO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZyhcImVycm9yXCIsIGB0d2VhayAke3QubWFuaWZlc3QuaWR9IGZhaWxlZCB0byBzdGFydDpgLCBlKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN5bmNNY3BTZXJ2ZXJzRnJvbUVuYWJsZWRUd2Vha3MoKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVzdWx0ID0gc3luY01hbmFnZWRNY3BTZXJ2ZXJzKHtcbiAgICAgIGNvbmZpZ1BhdGg6IENPREVYX0NPTkZJR19GSUxFLFxuICAgICAgdHdlYWtzOiB0d2Vha1N0YXRlLmRpc2NvdmVyZWQuZmlsdGVyKCh0KSA9PiBpc1R3ZWFrRW5hYmxlZCh0Lm1hbmlmZXN0LmlkKSksXG4gICAgfSk7XG4gICAgaWYgKHJlc3VsdC5jaGFuZ2VkKSB7XG4gICAgICBsb2coXCJpbmZvXCIsIGBzeW5jZWQgQ29kZXggTUNQIGNvbmZpZzogJHtyZXN1bHQuc2VydmVyTmFtZXMuam9pbihcIiwgXCIpIHx8IFwibm9uZVwifWApO1xuICAgIH1cbiAgICBpZiAocmVzdWx0LnNraXBwZWRTZXJ2ZXJOYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICBsb2coXG4gICAgICAgIFwiaW5mb1wiLFxuICAgICAgICBgc2tpcHBlZCBDb2RleCsrIG1hbmFnZWQgTUNQIHNlcnZlcihzKSBhbHJlYWR5IGNvbmZpZ3VyZWQgYnkgdXNlcjogJHtyZXN1bHQuc2tpcHBlZFNlcnZlck5hbWVzLmpvaW4oXCIsIFwiKX1gLFxuICAgICAgKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2coXCJ3YXJuXCIsIFwiZmFpbGVkIHRvIHN5bmMgQ29kZXggTUNQIGNvbmZpZzpcIiwgZSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0b3BBbGxNYWluVHdlYWtzKCk6IHZvaWQge1xuICBmb3IgKGNvbnN0IFtpZCwgdF0gb2YgdHdlYWtTdGF0ZS5sb2FkZWRNYWluKSB7XG4gICAgdHJ5IHtcbiAgICAgIHQuc3RvcD8uKCk7XG4gICAgICB0LnN0b3JhZ2UuZmx1c2goKTtcbiAgICAgIGxvZyhcImluZm9cIiwgYHN0b3BwZWQgbWFpbiB0d2VhazogJHtpZH1gKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2coXCJ3YXJuXCIsIGBzdG9wIGZhaWxlZCBmb3IgJHtpZH06YCwgZSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIG5hdGl2ZUJyaWRnZS5kaXNwb3NlVHdlYWsoaWQpO1xuICAgICAgZGlzcG9zZU93bFZpZXdzRm9yVHdlYWsoaWQpO1xuICAgIH1cbiAgfVxuICB0d2Vha1N0YXRlLmxvYWRlZE1haW4uY2xlYXIoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyVHdlYWtNb2R1bGVDYWNoZSgpOiB2b2lkIHtcbiAgY29uc3Qgcm9vdFNldCA9IG5ldyBTZXQ8c3RyaW5nPihbVFdFQUtTX0RJUiwgc2FmZVJlYWxwYXRoKFRXRUFLU19ESVIpXSk7XG4gIGNvbnN0IGVudHJ5U2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGZvciAoY29uc3QgdHdlYWsgb2YgdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkKSB7XG4gICAgcm9vdFNldC5hZGQodHdlYWsuZGlyKTtcbiAgICByb290U2V0LmFkZChzYWZlUmVhbHBhdGgodHdlYWsuZGlyKSk7XG4gICAgZW50cnlTZXQuYWRkKHR3ZWFrLmVudHJ5KTtcbiAgICBlbnRyeVNldC5hZGQoc2FmZVJlYWxwYXRoKHR3ZWFrLmVudHJ5KSk7XG4gIH1cblxuICBjb25zdCByb290cyA9IFsuLi5yb290U2V0XTtcbiAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMocmVxdWlyZS5jYWNoZSkpIHtcbiAgICBjb25zdCByZWFsS2V5ID0gc2FmZVJlYWxwYXRoKGtleSk7XG4gICAgY29uc3QgaXNUd2Vha01vZHVsZSA9XG4gICAgICBlbnRyeVNldC5oYXMoa2V5KSB8fFxuICAgICAgZW50cnlTZXQuaGFzKHJlYWxLZXkpIHx8XG4gICAgICByb290cy5zb21lKChyb290KSA9PiBpc1BhdGhJbnNpZGUocm9vdCwga2V5KSB8fCBpc1BhdGhJbnNpZGUocm9vdCwgcmVhbEtleSkpO1xuICAgIGlmIChpc1R3ZWFrTW9kdWxlKSBkZWxldGUgcmVxdWlyZS5jYWNoZVtrZXldO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzYWZlUmVhbHBhdGgoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHJlYWxwYXRoU3luYyhmaWxlUGF0aCk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmaWxlUGF0aDtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbGlzdGVkVHdlYWtzU25hcHNob3QoKSB7XG4gIGNvbnN0IHVwZGF0ZUNoZWNrcyA9IHJlYWRTdGF0ZSgpLnR3ZWFrVXBkYXRlQ2hlY2tzID8/IHt9O1xuICByZXR1cm4gdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLm1hcCgodCkgPT4gKHtcbiAgICBtYW5pZmVzdDogdC5tYW5pZmVzdCxcbiAgICBlbnRyeTogdC5lbnRyeSxcbiAgICBkaXI6IHQuZGlyLFxuICAgIGVudHJ5RXhpc3RzOiBleGlzdHNTeW5jKHQuZW50cnkpLFxuICAgIGVuYWJsZWQ6IGlzVHdlYWtFbmFibGVkKHQubWFuaWZlc3QuaWQpLFxuICAgIHVwZGF0ZTogdXBkYXRlQ2hlY2tzW3QubWFuaWZlc3QuaWRdID8/IG51bGwsXG4gIH0pKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGVuc3VyZVR3ZWFrVXBkYXRlQ2hlY2sodDogRGlzY292ZXJlZFR3ZWFrLCBmb3JjZSA9IGZhbHNlKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGlkID0gdC5tYW5pZmVzdC5pZDtcbiAgY29uc3QgcmVwbyA9IHQubWFuaWZlc3QuZ2l0aHViUmVwbztcbiAgaWYgKCFyZXBvKSByZXR1cm47XG4gIGNvbnN0IHN0YXRlID0gcmVhZFN0YXRlKCk7XG4gIGNvbnN0IGNhY2hlZCA9IHN0YXRlLnR3ZWFrVXBkYXRlQ2hlY2tzPy5baWRdO1xuICBpZiAoXG4gICAgIWZvcmNlICYmXG4gICAgY2FjaGVkICYmXG4gICAgY2FjaGVkLnJlcG8gPT09IHJlcG8gJiZcbiAgICBjYWNoZWQuY3VycmVudFZlcnNpb24gPT09IHQubWFuaWZlc3QudmVyc2lvbiAmJlxuICAgIERhdGUubm93KCkgLSBEYXRlLnBhcnNlKGNhY2hlZC5jaGVja2VkQXQpIDwgVVBEQVRFX0NIRUNLX0lOVEVSVkFMX01TXG4gICkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGxldCBjaGVjazogVHdlYWtVcGRhdGVDaGVjaztcbiAgdHJ5IHtcbiAgICBjb25zdCB7IHJlZ2lzdHJ5IH0gPSBhd2FpdCBmZXRjaFR3ZWFrU3RvcmVSZWdpc3RyeSgpO1xuICAgIGNvbnN0IGVudHJ5ID0gcmVnaXN0cnkuZW50cmllcy5maW5kKChjYW5kaWRhdGUpID0+IGNhbmRpZGF0ZS5pZCA9PT0gaWQpO1xuICAgIGlmICghZW50cnkpIHtcbiAgICAgIGNoZWNrID0ge1xuICAgICAgICBjaGVja2VkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgcmVwbyxcbiAgICAgICAgY3VycmVudFZlcnNpb246IHQubWFuaWZlc3QudmVyc2lvbixcbiAgICAgICAgbGF0ZXN0VmVyc2lvbjogbnVsbCxcbiAgICAgICAgbGF0ZXN0VGFnOiBudWxsLFxuICAgICAgICByZWxlYXNlVXJsOiBudWxsLFxuICAgICAgICB1cGRhdGVBdmFpbGFibGU6IGZhbHNlLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgbGF0ZXN0VmVyc2lvbiA9IG5vcm1hbGl6ZVZlcnNpb24oZW50cnkubWFuaWZlc3QudmVyc2lvbik7XG4gICAgICBjaGVjayA9IHtcbiAgICAgICAgY2hlY2tlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIHJlcG8sXG4gICAgICAgIGN1cnJlbnRWZXJzaW9uOiB0Lm1hbmlmZXN0LnZlcnNpb24sXG4gICAgICAgIGxhdGVzdFZlcnNpb24sXG4gICAgICAgIGxhdGVzdFRhZzogbnVsbCxcbiAgICAgICAgcmVsZWFzZVVybDogZW50cnkucmVsZWFzZVVybCA/PyBgaHR0cHM6Ly9naXRodWIuY29tLyR7cmVwb30vcmVsZWFzZXNgLFxuICAgICAgICB1cGRhdGVBdmFpbGFibGU6IGNvbXBhcmVWZXJzaW9ucyhsYXRlc3RWZXJzaW9uLCBub3JtYWxpemVWZXJzaW9uKHQubWFuaWZlc3QudmVyc2lvbikpID4gMCxcbiAgICAgICAgcGlubmVkU2hhOiBlbnRyeS5hcHByb3ZlZENvbW1pdFNoYSxcbiAgICAgIH07XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgY2hlY2sgPSB7XG4gICAgICBjaGVja2VkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgIHJlcG8sXG4gICAgICBjdXJyZW50VmVyc2lvbjogdC5tYW5pZmVzdC52ZXJzaW9uLFxuICAgICAgbGF0ZXN0VmVyc2lvbjogbnVsbCxcbiAgICAgIGxhdGVzdFRhZzogbnVsbCxcbiAgICAgIHJlbGVhc2VVcmw6IG51bGwsXG4gICAgICB1cGRhdGVBdmFpbGFibGU6IGZhbHNlLFxuICAgICAgZXJyb3I6IGUgaW5zdGFuY2VvZiBFcnJvciA/IGUubWVzc2FnZSA6IFN0cmluZyhlKSxcbiAgICB9O1xuICB9XG4gIHN0YXRlLnR3ZWFrVXBkYXRlQ2hlY2tzID8/PSB7fTtcbiAgc3RhdGUudHdlYWtVcGRhdGVDaGVja3NbaWRdID0gY2hlY2s7XG4gIHdyaXRlU3RhdGUoc3RhdGUpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5zdGFsbEdpdGh1YlJlbGVhc2VUd2VhayhpZDogc3RyaW5nKTogUHJvbWlzZTx7XG4gIGluc3RhbGxlZDogc3RyaW5nO1xuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIGNvbW1pdFNoYTogc3RyaW5nO1xufT4ge1xuICBjb25zdCB0d2VhayA9IHR3ZWFrU3RhdGUuZGlzY292ZXJlZC5maW5kKChpdGVtKSA9PiBpdGVtLm1hbmlmZXN0LmlkID09PSBpZCk7XG4gIGlmICghdHdlYWspIHRocm93IG5ldyBFcnJvcihgdW5rbm93biB0d2VhazogJHtpZH1gKTtcbiAgaWYgKCF0d2Vhay5tYW5pZmVzdC5naXRodWJSZXBvKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGAke3R3ZWFrLm1hbmlmZXN0Lm5hbWV9IGhhcyBubyBnaXRodWJSZXBvIGluIGl0cyBtYW5pZmVzdGApO1xuICB9XG5cbiAgbGV0IHJlcG86IHN0cmluZztcbiAgdHJ5IHtcbiAgICByZXBvID0gbm9ybWFsaXplR2l0SHViUmVwbyh0d2Vhay5tYW5pZmVzdC5naXRodWJSZXBvKTtcbiAgfSBjYXRjaCB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGAke3R3ZWFrLm1hbmlmZXN0Lm5hbWV9IGhhcyBhbiBpbnZhbGlkIGdpdGh1YlJlcG86ICR7dHdlYWsubWFuaWZlc3QuZ2l0aHViUmVwb31gKTtcbiAgfVxuXG4gIGNvbnN0IHsgcmVnaXN0cnkgfSA9IGF3YWl0IGZldGNoVHdlYWtTdG9yZVJlZ2lzdHJ5KCk7XG4gIGNvbnN0IHN0b3JlRW50cnkgPSByZWdpc3RyeS5lbnRyaWVzLmZpbmQoKGVudHJ5KSA9PiB7XG4gICAgaWYgKGVudHJ5LmlkICE9PSBpZCkgcmV0dXJuIGZhbHNlO1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gbm9ybWFsaXplR2l0SHViUmVwbyhlbnRyeS5yZXBvKSA9PT0gcmVwbztcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBlbnRyeS5yZXBvID09PSByZXBvO1xuICAgIH1cbiAgfSk7XG4gIGlmICghc3RvcmVFbnRyeSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGAke3R3ZWFrLm1hbmlmZXN0Lm5hbWV9IGlzIG5vdCBsaXN0ZWQgaW4gdGhlIENoYXRHUFQgTGF5ZXIgdHdlYWsgc3RvcmUsIHNvIGl0IGNhbid0IGJlIHVwZGF0ZWQgZnJvbSBHaXRIdWIuYCxcbiAgICApO1xuICB9XG5cbiAgYXNzZXJ0U3RvcmVFbnRyeVBsYXRmb3JtQ29tcGF0aWJsZShzdG9yZUVudHJ5KTtcbiAgYXNzZXJ0U3RvcmVFbnRyeVJ1bnRpbWVDb21wYXRpYmxlKHN0b3JlRW50cnkpO1xuICBhd2FpdCBpbnN0YWxsU3RvcmVUd2VhayhzdG9yZUVudHJ5KTtcbiAgcmVsb2FkVHdlYWtzKFwic3RvcmUtcGluLWluc3RhbGxcIiwgdHdlYWtMaWZlY3ljbGVEZXBzKTtcbiAgY29uc3QgaW5zdGFsbGVkID0gdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLmZpbmQoKGl0ZW0pID0+IGl0ZW0ubWFuaWZlc3QuaWQgPT09IGlkKSA/PyB0d2VhaztcbiAgYXdhaXQgZW5zdXJlVHdlYWtVcGRhdGVDaGVjayhpbnN0YWxsZWQsIHRydWUpO1xuICByZXR1cm4geyBpbnN0YWxsZWQ6IGlkLCB2ZXJzaW9uOiBzdG9yZUVudHJ5Lm1hbmlmZXN0LnZlcnNpb24sIGNvbW1pdFNoYTogc3RvcmVFbnRyeS5hcHByb3ZlZENvbW1pdFNoYSB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnJvYWRjYXN0UmVsb2FkKCk6IHZvaWQge1xuICBjb25zdCBwYXlsb2FkID0ge1xuICAgIGF0OiBEYXRlLm5vdygpLFxuICAgIHR3ZWFrczogdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLm1hcCgodCkgPT4gdC5tYW5pZmVzdC5pZCksXG4gIH07XG4gIGZvciAoY29uc3Qgd2Mgb2Ygd2ViQ29udGVudHMuZ2V0QWxsV2ViQ29udGVudHMoKSkge1xuICAgIHRyeSB7XG4gICAgICB3Yy5zZW5kKFwiY29kZXhwcDp0d2Vha3MtY2hhbmdlZFwiLCBwYXlsb2FkKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2coXCJ3YXJuXCIsIFwiYnJvYWRjYXN0IHNlbmQgZmFpbGVkOlwiLCBlKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VMb2dnZXIoc2NvcGU6IHN0cmluZykge1xuICByZXR1cm4ge1xuICAgIGRlYnVnOiAoLi4uYTogdW5rbm93bltdKSA9PiBsb2coXCJpbmZvXCIsIGBbJHtzY29wZX1dYCwgLi4uYSksXG4gICAgaW5mbzogKC4uLmE6IHVua25vd25bXSkgPT4gbG9nKFwiaW5mb1wiLCBgWyR7c2NvcGV9XWAsIC4uLmEpLFxuICAgIHdhcm46ICguLi5hOiB1bmtub3duW10pID0+IGxvZyhcIndhcm5cIiwgYFske3Njb3BlfV1gLCAuLi5hKSxcbiAgICBlcnJvcjogKC4uLmE6IHVua25vd25bXSkgPT4gbG9nKFwiZXJyb3JcIiwgYFske3Njb3BlfV1gLCAuLi5hKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VNYWluSXBjKGlkOiBzdHJpbmcpIHtcbiAgY29uc3QgY2ggPSAoYzogc3RyaW5nKSA9PiBgY29kZXhwcDoke2lkfToke2N9YDtcbiAgcmV0dXJuIHtcbiAgICBvbjogKGM6IHN0cmluZywgaDogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCkgPT4ge1xuICAgICAgY29uc3Qgd3JhcHBlZCA9IChfZTogdW5rbm93biwgLi4uYXJnczogdW5rbm93bltdKSA9PiBoKC4uLmFyZ3MpO1xuICAgICAgaXBjTWFpbi5vbihjaChjKSwgd3JhcHBlZCk7XG4gICAgICByZXR1cm4gKCkgPT4gaXBjTWFpbi5yZW1vdmVMaXN0ZW5lcihjaChjKSwgd3JhcHBlZCBhcyBuZXZlcik7XG4gICAgfSxcbiAgICBzZW5kOiAoX2M6IHN0cmluZykgPT4ge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaXBjLnNlbmQgaXMgcmVuZGVyZXJcdTIxOTJtYWluOyBtYWluIHNpZGUgdXNlcyBoYW5kbGUvb25cIik7XG4gICAgfSxcbiAgICBpbnZva2U6IChfYzogc3RyaW5nKSA9PiB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpcGMuaW52b2tlIGlzIHJlbmRlcmVyXHUyMTkybWFpbjsgbWFpbiBzaWRlIHVzZXMgaGFuZGxlXCIpO1xuICAgIH0sXG4gICAgaGFuZGxlOiAoYzogc3RyaW5nLCBoYW5kbGVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB1bmtub3duKSA9PiB7XG4gICAgICBpcGNNYWluLmhhbmRsZShjaChjKSwgKF9lOiB1bmtub3duLCAuLi5hcmdzOiB1bmtub3duW10pID0+IGhhbmRsZXIoLi4uYXJncykpO1xuICAgIH0sXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlTWFpbkZzKGlkOiBzdHJpbmcpIHtcbiAgY29uc3QgZGlyID0gam9pbih1c2VyUm9vdCEsIFwidHdlYWstZGF0YVwiLCBpZCk7XG4gIG1rZGlyU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICBjb25zdCBmcyA9IHJlcXVpcmUoXCJub2RlOmZzL3Byb21pc2VzXCIpIGFzIHR5cGVvZiBpbXBvcnQoXCJub2RlOmZzL3Byb21pc2VzXCIpO1xuICByZXR1cm4ge1xuICAgIGRhdGFEaXI6IGRpcixcbiAgICByZWFkOiAocDogc3RyaW5nKSA9PiBmcy5yZWFkRmlsZShqb2luKGRpciwgcCksIFwidXRmOFwiKSxcbiAgICB3cml0ZTogKHA6IHN0cmluZywgYzogc3RyaW5nKSA9PiBmcy53cml0ZUZpbGUoam9pbihkaXIsIHApLCBjLCBcInV0ZjhcIiksXG4gICAgZXhpc3RzOiBhc3luYyAocDogc3RyaW5nKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBmcy5hY2Nlc3Moam9pbihkaXIsIHApKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH0sXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjdXJyZW50UnVudGltZUluZm8oKTogQ29kZXhSdW50aW1lSW5mbyB7XG4gIGNvbnN0IGluc3RhbGxlclN0YXRlID0gcmVhZEluc3RhbGxlclN0YXRlKCk7XG4gIHJldHVybiBnZXRSdW50aW1lSW5mbyh7XG4gICAgdXNlclJvb3Q6IHVzZXJSb290ISxcbiAgICBydW50aW1lRGlyOiBydW50aW1lRGlyISxcbiAgICBjb2RleFZlcnNpb246IGluc3RhbGxlclN0YXRlPy5jb2RleFZlcnNpb24gPz8gbnVsbCxcbiAgICBjaGFubmVsOiBudWxsLFxuICAgIGdldFdpbmRvd1NlcnZpY2VzOiBnZXRDb2RleFdpbmRvd1NlcnZpY2VzLFxuICAgIGVudjogbGl2ZVByb2JlRW52KCksXG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3VycmVudFJ1bnRpbWVDYXBhYmlsaXRpZXMoKTogQ29kZXhSdW50aW1lQ2FwYWJpbGl0aWVzIHtcbiAgY29uc3QgaW5zdGFsbGVyU3RhdGUgPSByZWFkSW5zdGFsbGVyU3RhdGUoKTtcbiAgcmV0dXJuIGdldFJ1bnRpbWVDYXBhYmlsaXRpZXMoe1xuICAgIHVzZXJSb290OiB1c2VyUm9vdCEsXG4gICAgcnVudGltZURpcjogcnVudGltZURpciEsXG4gICAgY29kZXhWZXJzaW9uOiBpbnN0YWxsZXJTdGF0ZT8uY29kZXhWZXJzaW9uID8/IG51bGwsXG4gICAgY2hhbm5lbDogbnVsbCxcbiAgICBnZXRXaW5kb3dTZXJ2aWNlczogZ2V0Q29kZXhXaW5kb3dTZXJ2aWNlcyxcbiAgICBnZXROYXRpdmVDYXBhYmlsaXRpZXM6ICgpID0+IG5hdGl2ZUJyaWRnZS5nZXRDYXBhYmlsaXRpZXMoKSxcbiAgICBlbnY6IGxpdmVQcm9iZUVudigpLFxuICB9KTtcbn1cblxuZnVuY3Rpb24gbGl2ZVByb2JlRW52KCkge1xuICByZXR1cm4ge1xuICAgIGluc3BlY3RFeGlzdGluZ1dpbmRvdzogKCkgPT4gd2luZG93U2FtcGxlRnJvbShnZXRQcmltYXJ5Q29kZXhXaW5kb3coKSksXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0d2Vha0NvbnRleHQodHdlYWtJZDogc3RyaW5nLCBwZXJtaXNzaW9uPzogVHdlYWtQZXJtaXNzaW9uKTogTmF0aXZlVHdlYWtDb250ZXh0IHtcbiAgY29uc3QgdHdlYWsgPSBwZXJtaXNzaW9uXG4gICAgPyBhc3NlcnRUd2Vha1Blcm1pc3Npb25Gb3JJZCh0d2Vha0lkLCBwZXJtaXNzaW9uKVxuICAgIDogdHdlYWtCeUlkKHR3ZWFrSWQpO1xuICByZXR1cm4geyBpZDogdHdlYWsubWFuaWZlc3QuaWQsIGRpcjogdHdlYWsuZGlyIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0d2Vha0J5SWQodHdlYWtJZDogc3RyaW5nKTogRGlzY292ZXJlZFR3ZWFrIHtcbiAgYXNzZXJ0VHdlYWtJZCh0d2Vha0lkKTtcbiAgY29uc3QgdHdlYWsgPSB0d2Vha1N0YXRlLmRpc2NvdmVyZWQuZmluZCgoaXRlbSkgPT4gaXRlbS5tYW5pZmVzdC5pZCA9PT0gdHdlYWtJZCk7XG4gIGlmICghdHdlYWspIHRocm93IG5ldyBFcnJvcihgdW5rbm93biB0d2VhazogJHt0d2Vha0lkfWApO1xuICBpZiAoIWlzVHdlYWtFbmFibGVkKHR3ZWFrSWQpKSB0aHJvdyBuZXcgRXJyb3IoYHR3ZWFrIGlzIGRpc2FibGVkOiAke3R3ZWFrSWR9YCk7XG4gIHJldHVybiB0d2Vhaztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFR3ZWFrUGVybWlzc2lvbkZvcklkKHR3ZWFrSWQ6IHN0cmluZywgcGVybWlzc2lvbjogVHdlYWtQZXJtaXNzaW9uKTogRGlzY292ZXJlZFR3ZWFrIHtcbiAgY29uc3QgdHdlYWsgPSB0d2Vha0J5SWQodHdlYWtJZCk7XG4gIGFzc2VydFR3ZWFrUGVybWlzc2lvbih0d2VhaywgcGVybWlzc2lvbik7XG4gIHJldHVybiB0d2Vhaztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFR3ZWFrVmlld1Blcm1pc3Npb25Gb3JJZCh0d2Vha0lkOiBzdHJpbmcpOiBEaXNjb3ZlcmVkVHdlYWsge1xuICBjb25zdCB0d2VhayA9IHR3ZWFrQnlJZCh0d2Vha0lkKTtcbiAgYXNzZXJ0VHdlYWtWaWV3UGVybWlzc2lvbih0d2Vhayk7XG4gIHJldHVybiB0d2Vhaztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFR3ZWFrUGVybWlzc2lvbih0d2VhazogRGlzY292ZXJlZFR3ZWFrLCBwZXJtaXNzaW9uOiBUd2Vha1Blcm1pc3Npb24pOiB2b2lkIHtcbiAgaWYgKHR3ZWFrLm1hbmlmZXN0LnBlcm1pc3Npb25zPy5pbmNsdWRlcyhwZXJtaXNzaW9uKSkgcmV0dXJuO1xuICB0aHJvdyBuZXcgRXJyb3IoYHR3ZWFrICR7dHdlYWsubWFuaWZlc3QuaWR9IG11c3QgZGVjbGFyZSAke3Blcm1pc3Npb259IHBlcm1pc3Npb25gKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFR3ZWFrVmlld1Blcm1pc3Npb24odHdlYWs6IERpc2NvdmVyZWRUd2Vhayk6IHZvaWQge1xuICBpZiAoXG4gICAgdHdlYWsubWFuaWZlc3QucGVybWlzc2lvbnM/LmluY2x1ZGVzKFwiY29kZXgtdmlld3NcIikgfHxcbiAgICB0d2Vhay5tYW5pZmVzdC5wZXJtaXNzaW9ucz8uaW5jbHVkZXMoXCJjb2RleC52aWV3c1wiKVxuICApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKGB0d2VhayAke3R3ZWFrLm1hbmlmZXN0LmlkfSBtdXN0IGRlY2xhcmUgY29kZXgtdmlld3MgcGVybWlzc2lvbmApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0VHdlYWtJZCh0d2Vha0lkOiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKCEvXlthLXpBLVowLTkuXy1dKyQvLnRlc3QodHdlYWtJZCkpIHRocm93IG5ldyBFcnJvcihcImJhZCB0d2VhayBpZFwiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VDb2RleEFwaSh0d2VhazogRGlzY292ZXJlZFR3ZWFrKSB7XG4gIGNvbnN0IGN0eCA9ICgpOiBOYXRpdmVUd2Vha0NvbnRleHQgPT4gKHsgaWQ6IHR3ZWFrLm1hbmlmZXN0LmlkLCBkaXI6IHR3ZWFrLmRpciB9KTtcbiAgcmV0dXJuIHtcbiAgICBydW50aW1lOiB7XG4gICAgICBnZXRJbmZvOiBhc3luYyAoKSA9PiBjdXJyZW50UnVudGltZUluZm8oKSxcbiAgICAgIGdldENhcGFiaWxpdGllczogYXN5bmMgKCkgPT4gY3VycmVudFJ1bnRpbWVDYXBhYmlsaXRpZXMoKSxcbiAgICB9LFxuICAgIHdpbmRvd3M6IHtcbiAgICAgIGNyZWF0ZTogY3JlYXRlQ29kZXhXaW5kb3csXG4gICAgICBnZXRQcmltYXJ5OiBhc3luYyAoKSA9PiBnZXRQcmltYXJ5Q29kZXhXaW5kb3dSZWYoKSxcbiAgICAgIGZvY3VzOiBhc3luYyAod2luZG93SWQ6IG51bWJlcikgPT4gZm9jdXNDb2RleFdpbmRvdyh3aW5kb3dJZCksXG4gICAgICBzaG93OiBhc3luYyAod2luZG93SWQ6IG51bWJlcikgPT4gc2hvd0NvZGV4V2luZG93KHdpbmRvd0lkKSxcbiAgICB9LFxuICAgIHZpZXdzOiB7XG4gICAgICBjcmVhdGU6IGFzeW5jIChvcHRpb25zOiBDb2RleFZpZXdDcmVhdGVPcHRpb25zKSA9PiB7XG4gICAgICAgIGFzc2VydFR3ZWFrVmlld1Blcm1pc3Npb24odHdlYWspO1xuICAgICAgICByZXR1cm4gY3JlYXRlT3dsVmlldyhjdHgoKSwgb3B0aW9ucyk7XG4gICAgICB9LFxuICAgIH0sXG4gICAgY2RwOiB7XG4gICAgICBnZXRTdGF0dXM6IGFzeW5jICgpID0+IGdldENkcFN0YXR1cygpLFxuICAgICAgbGlzdFRhcmdldHM6IGFzeW5jICgpID0+IGxpc3RDZHBUYXJnZXRzKCksXG4gICAgfSxcbiAgICBuYXRpdmU6IHtcbiAgICAgIGxvYWRNb2R1bGU6IGFzeW5jIChvcHRpb25zOiBOYXRpdmVNb2R1bGVMb2FkT3B0aW9ucykgPT4ge1xuICAgICAgICBhc3NlcnRUd2Vha1Blcm1pc3Npb24odHdlYWssIFwibmF0aXZlLW1vZHVsZVwiKTtcbiAgICAgICAgcmV0dXJuIG5hdGl2ZUJyaWRnZS5sb2FkTW9kdWxlKGN0eCgpLCBvcHRpb25zKTtcbiAgICAgIH0sXG4gICAgICBjcmVhdGVQYW5lbDogYXN5bmMgKG9wdGlvbnM6IE5hdGl2ZVBhbmVsQ3JlYXRlT3B0aW9ucykgPT4ge1xuICAgICAgICBhc3NlcnRUd2Vha1Blcm1pc3Npb24odHdlYWssIFwibmF0aXZlLXZpZXdcIik7XG4gICAgICAgIHJldHVybiBuYXRpdmVCcmlkZ2UuY3JlYXRlUGFuZWwoY3R4KCksIG9wdGlvbnMpO1xuICAgICAgfSxcbiAgICAgIGF0dGFjaFZpZXc6IGFzeW5jIChvcHRpb25zOiBOYXRpdmVWaWV3QXR0YWNoT3B0aW9ucykgPT4ge1xuICAgICAgICBhc3NlcnRUd2Vha1Blcm1pc3Npb24odHdlYWssIFwibmF0aXZlLXZpZXdcIik7XG4gICAgICAgIHJldHVybiBuYXRpdmVCcmlkZ2UuYXR0YWNoVmlldyhjdHgoKSwgb3B0aW9ucyk7XG4gICAgICB9LFxuICAgICAgbGF1bmNoSGVscGVyOiBhc3luYyAob3B0aW9uczogTmF0aXZlSGVscGVyTGF1bmNoT3B0aW9ucykgPT4ge1xuICAgICAgICBhc3NlcnRUd2Vha1Blcm1pc3Npb24odHdlYWssIFwibmF0aXZlLWhlbHBlclwiKTtcbiAgICAgICAgcmV0dXJuIG5hdGl2ZUJyaWRnZS5sYXVuY2hIZWxwZXIoY3R4KCksIG9wdGlvbnMpO1xuICAgICAgfSxcbiAgICB9LFxuICAgIGNyZWF0ZUJyb3dzZXJWaWV3OiBjcmVhdGVDb2RleEJyb3dzZXJWaWV3LFxuICAgIGNyZWF0ZVdpbmRvdzogY3JlYXRlQ29kZXhXaW5kb3csXG4gIH07XG59XG5cblxuZXhwb3J0IGNvbnN0IHR3ZWFrTGlmZWN5Y2xlRGVwczogU2V0VHdlYWtFbmFibGVkQW5kUmVsb2FkRGVwcyA9IHtcbiAgbG9nSW5mbzogKG1lc3NhZ2U6IHN0cmluZykgPT4gbG9nKFwiaW5mb1wiLCBtZXNzYWdlKSxcbiAgc2V0VHdlYWtFbmFibGVkLFxuICBzdG9wQWxsTWFpblR3ZWFrcyxcbiAgY2xlYXJUd2Vha01vZHVsZUNhY2hlLFxuICBsb2FkQWxsTWFpblR3ZWFrcyxcbiAgYnJvYWRjYXN0UmVsb2FkLFxufTtcbiIsICIvKipcbiAqIERpc2NvdmVyIHR3ZWFrcyB1bmRlciA8dXNlclJvb3Q+L3R3ZWFrcy4gRWFjaCB0d2VhayBpcyBhIGRpcmVjdG9yeSB3aXRoIGFcbiAqIG1hbmlmZXN0Lmpzb24gYW5kIGFuIGVudHJ5IHNjcmlwdC4gRW50cnkgcmVzb2x1dGlvbiBpcyBtYW5pZmVzdC5tYWluIGZpcnN0LFxuICogdGhlbiBpbmRleC5qcywgaW5kZXgubWpzLCBhbmQgaW5kZXguY2pzLlxuICpcbiAqIFRoZSBtYW5pZmVzdCBnYXRlIGlzIGludGVudGlvbmFsbHkgc3RyaWN0LiBBIHR3ZWFrIG11c3QgaWRlbnRpZnkgaXRzIEdpdEh1YlxuICogcmVwb3NpdG9yeSBzbyB0aGUgbWFuYWdlciBjYW4gY2hlY2sgcmVsZWFzZXMgd2l0aG91dCBncmFudGluZyB0aGUgdHdlYWsgYW5cbiAqIHVwZGF0ZS9pbnN0YWxsIGNoYW5uZWwuIFVwZGF0ZSBjaGVja3MgYXJlIGFkdmlzb3J5IG9ubHkuXG4gKi9cbmltcG9ydCB7IHJlYWRkaXJTeW5jLCBzdGF0U3luYywgcmVhZEZpbGVTeW5jLCBleGlzdHNTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGpvaW4gfSBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgdHlwZSB7IFR3ZWFrTWFuaWZlc3QgfSBmcm9tIFwiQGNvZGV4LXBsdXNwbHVzL3Nka1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIERpc2NvdmVyZWRUd2VhayB7XG4gIGRpcjogc3RyaW5nO1xuICBlbnRyeTogc3RyaW5nO1xuICBtYW5pZmVzdDogVHdlYWtNYW5pZmVzdDtcbn1cblxuY29uc3QgRU5UUllfQ0FORElEQVRFUyA9IFtcImluZGV4LmpzXCIsIFwiaW5kZXguY2pzXCIsIFwiaW5kZXgubWpzXCJdO1xuXG5leHBvcnQgZnVuY3Rpb24gZGlzY292ZXJUd2Vha3ModHdlYWtzRGlyOiBzdHJpbmcpOiBEaXNjb3ZlcmVkVHdlYWtbXSB7XG4gIGlmICghZXhpc3RzU3luYyh0d2Vha3NEaXIpKSByZXR1cm4gW107XG4gIGNvbnN0IG91dDogRGlzY292ZXJlZFR3ZWFrW10gPSBbXTtcbiAgZm9yIChjb25zdCBuYW1lIG9mIHJlYWRkaXJTeW5jKHR3ZWFrc0RpcikpIHtcbiAgICBjb25zdCBkaXIgPSBqb2luKHR3ZWFrc0RpciwgbmFtZSk7XG4gICAgaWYgKCFzdGF0U3luYyhkaXIpLmlzRGlyZWN0b3J5KCkpIGNvbnRpbnVlO1xuICAgIGNvbnN0IG1hbmlmZXN0UGF0aCA9IGpvaW4oZGlyLCBcIm1hbmlmZXN0Lmpzb25cIik7XG4gICAgaWYgKCFleGlzdHNTeW5jKG1hbmlmZXN0UGF0aCkpIGNvbnRpbnVlO1xuICAgIGxldCBtYW5pZmVzdDogVHdlYWtNYW5pZmVzdDtcbiAgICB0cnkge1xuICAgICAgbWFuaWZlc3QgPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhtYW5pZmVzdFBhdGgsIFwidXRmOFwiKSkgYXMgVHdlYWtNYW5pZmVzdDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAoIWlzVmFsaWRNYW5pZmVzdChtYW5pZmVzdCkpIGNvbnRpbnVlO1xuICAgIGNvbnN0IGVudHJ5ID0gcmVzb2x2ZUVudHJ5KGRpciwgbWFuaWZlc3QpO1xuICAgIGlmICghZW50cnkpIGNvbnRpbnVlO1xuICAgIG91dC5wdXNoKHsgZGlyLCBlbnRyeSwgbWFuaWZlc3QgfSk7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gaXNWYWxpZE1hbmlmZXN0KG06IFR3ZWFrTWFuaWZlc3QpOiBib29sZWFuIHtcbiAgaWYgKCFtLmlkIHx8ICFtLm5hbWUgfHwgIW0udmVyc2lvbiB8fCAhbS5naXRodWJSZXBvKSByZXR1cm4gZmFsc2U7XG4gIGlmICghL15bYS16QS1aMC05Ll8tXStcXC9bYS16QS1aMC05Ll8tXSskLy50ZXN0KG0uZ2l0aHViUmVwbykpIHJldHVybiBmYWxzZTtcbiAgaWYgKG0uc2NvcGUgJiYgIVtcInJlbmRlcmVyXCIsIFwibWFpblwiLCBcImJvdGhcIl0uaW5jbHVkZXMobS5zY29wZSkpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVFbnRyeShkaXI6IHN0cmluZywgbTogVHdlYWtNYW5pZmVzdCk6IHN0cmluZyB8IG51bGwge1xuICBpZiAobS5tYWluKSB7XG4gICAgY29uc3QgcCA9IGpvaW4oZGlyLCBtLm1haW4pO1xuICAgIHJldHVybiBleGlzdHNTeW5jKHApID8gcCA6IG51bGw7XG4gIH1cbiAgZm9yIChjb25zdCBjIG9mIEVOVFJZX0NBTkRJREFURVMpIHtcbiAgICBjb25zdCBwID0gam9pbihkaXIsIGMpO1xuICAgIGlmIChleGlzdHNTeW5jKHApKSByZXR1cm4gcDtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cbiIsICIvKipcbiAqIERpc2stYmFja2VkIGtleS92YWx1ZSBzdG9yYWdlIGZvciBtYWluLXByb2Nlc3MgdHdlYWtzLlxuICpcbiAqIEVhY2ggdHdlYWsgZ2V0cyBvbmUgSlNPTiBmaWxlIHVuZGVyIGA8dXNlclJvb3Q+L3N0b3JhZ2UvPGlkPi5qc29uYC5cbiAqIFdyaXRlcyBhcmUgZGVib3VuY2VkICg1MCBtcykgYW5kIGF0b21pYyAod3JpdGUgdG8gPGZpbGU+LnRtcCB0aGVuIHJlbmFtZSkuXG4gKiBSZWFkcyBhcmUgZWFnZXIgKyBjYWNoZWQgaW4tbWVtb3J5OyB3ZSBsb2FkIG9uIGZpcnN0IGFjY2Vzcy5cbiAqL1xuaW1wb3J0IHtcbiAgZXhpc3RzU3luYyxcbiAgbWtkaXJTeW5jLFxuICByZWFkRmlsZVN5bmMsXG4gIHJlbmFtZVN5bmMsXG4gIHdyaXRlRmlsZVN5bmMsXG59IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIERpc2tTdG9yYWdlIHtcbiAgZ2V0PFQ+KGtleTogc3RyaW5nLCBkZWZhdWx0VmFsdWU/OiBUKTogVDtcbiAgc2V0KGtleTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bik6IHZvaWQ7XG4gIGRlbGV0ZShrZXk6IHN0cmluZyk6IHZvaWQ7XG4gIGFsbCgpOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgZmx1c2goKTogdm9pZDtcbn1cblxuY29uc3QgRkxVU0hfREVMQVlfTVMgPSA1MDtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZURpc2tTdG9yYWdlKHJvb3REaXI6IHN0cmluZywgaWQ6IHN0cmluZyk6IERpc2tTdG9yYWdlIHtcbiAgY29uc3QgZGlyID0gam9pbihyb290RGlyLCBcInN0b3JhZ2VcIik7XG4gIG1rZGlyU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICBjb25zdCBmaWxlID0gam9pbihkaXIsIGAke3Nhbml0aXplKGlkKX0uanNvbmApO1xuXG4gIGxldCBkYXRhOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICBpZiAoZXhpc3RzU3luYyhmaWxlKSkge1xuICAgIHRyeSB7XG4gICAgICBkYXRhID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMoZmlsZSwgXCJ1dGY4XCIpKSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIENvcnJ1cHQgZmlsZSBcdTIwMTQgc3RhcnQgZnJlc2gsIGJ1dCBkb24ndCBjbG9iYmVyIHRoZSBvcmlnaW5hbCB1bnRpbCB3ZVxuICAgICAgLy8gc3VjY2Vzc2Z1bGx5IHdyaXRlIGFnYWluLiAoTW92ZSBpdCBhc2lkZSBmb3IgZm9yZW5zaWNzLilcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlbmFtZVN5bmMoZmlsZSwgYCR7ZmlsZX0uY29ycnVwdC0ke0RhdGUubm93KCl9YCk7XG4gICAgICB9IGNhdGNoIHt9XG4gICAgICBkYXRhID0ge307XG4gICAgfVxuICB9XG5cbiAgbGV0IGRpcnR5ID0gZmFsc2U7XG4gIGxldCB0aW1lcjogTm9kZUpTLlRpbWVvdXQgfCBudWxsID0gbnVsbDtcblxuICBjb25zdCBzY2hlZHVsZUZsdXNoID0gKCkgPT4ge1xuICAgIGRpcnR5ID0gdHJ1ZTtcbiAgICBpZiAodGltZXIpIHJldHVybjtcbiAgICB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGltZXIgPSBudWxsO1xuICAgICAgaWYgKGRpcnR5KSBmbHVzaCgpO1xuICAgIH0sIEZMVVNIX0RFTEFZX01TKTtcbiAgfTtcblxuICBjb25zdCBmbHVzaCA9ICgpOiB2b2lkID0+IHtcbiAgICBpZiAoIWRpcnR5KSByZXR1cm47XG4gICAgY29uc3QgdG1wID0gYCR7ZmlsZX0udG1wYDtcbiAgICB0cnkge1xuICAgICAgd3JpdGVGaWxlU3luYyh0bXAsIEpTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIDIpLCBcInV0ZjhcIik7XG4gICAgICByZW5hbWVTeW5jKHRtcCwgZmlsZSk7XG4gICAgICBkaXJ0eSA9IGZhbHNlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIExlYXZlIGRpcnR5PXRydWUgc28gYSBmdXR1cmUgZmx1c2ggcmV0cmllcy5cbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJbY29kZXgtcGx1c3BsdXNdIHN0b3JhZ2UgZmx1c2ggZmFpbGVkOlwiLCBpZCwgZSk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiB7XG4gICAgZ2V0OiA8VD4oazogc3RyaW5nLCBkPzogVCk6IFQgPT5cbiAgICAgIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChkYXRhLCBrKSA/IChkYXRhW2tdIGFzIFQpIDogKGQgYXMgVCksXG4gICAgc2V0KGssIHYpIHtcbiAgICAgIGRhdGFba10gPSB2O1xuICAgICAgc2NoZWR1bGVGbHVzaCgpO1xuICAgIH0sXG4gICAgZGVsZXRlKGspIHtcbiAgICAgIGlmIChrIGluIGRhdGEpIHtcbiAgICAgICAgZGVsZXRlIGRhdGFba107XG4gICAgICAgIHNjaGVkdWxlRmx1c2goKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGFsbDogKCkgPT4gKHsgLi4uZGF0YSB9KSxcbiAgICBmbHVzaCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gc2FuaXRpemUoaWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIC8vIFR3ZWFrIGlkcyBhcmUgYXV0aG9yLWNvbnRyb2xsZWQ7IGNsYW1wIHRvIGEgc2FmZSBmaWxlbmFtZS5cbiAgcmV0dXJuIGlkLnJlcGxhY2UoL1teYS16QS1aMC05Ll9ALV0vZywgXCJfXCIpO1xufVxuIiwgImltcG9ydCB7IGV4aXN0c1N5bmMsIG1rZGlyU3luYywgcmVhZEZpbGVTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGRpcm5hbWUsIGlzQWJzb2x1dGUsIHJlc29sdmUgfSBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgdHlwZSB7IFR3ZWFrTWNwU2VydmVyIH0gZnJvbSBcIkBjb2RleC1wbHVzcGx1cy9zZGtcIjtcblxuZXhwb3J0IGNvbnN0IE1DUF9NQU5BR0VEX1NUQVJUID0gXCIjIEJFR0lOIENPREVYKysgTUFOQUdFRCBNQ1AgU0VSVkVSU1wiO1xuZXhwb3J0IGNvbnN0IE1DUF9NQU5BR0VEX0VORCA9IFwiIyBFTkQgQ09ERVgrKyBNQU5BR0VEIE1DUCBTRVJWRVJTXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWNwU3luY1R3ZWFrIHtcbiAgZGlyOiBzdHJpbmc7XG4gIG1hbmlmZXN0OiB7XG4gICAgaWQ6IHN0cmluZztcbiAgICBtY3A/OiBUd2Vha01jcFNlcnZlcjtcbiAgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBCdWlsdE1hbmFnZWRNY3BCbG9jayB7XG4gIGJsb2NrOiBzdHJpbmc7XG4gIHNlcnZlck5hbWVzOiBzdHJpbmdbXTtcbiAgc2tpcHBlZFNlcnZlck5hbWVzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNYW5hZ2VkTWNwU3luY1Jlc3VsdCBleHRlbmRzIEJ1aWx0TWFuYWdlZE1jcEJsb2NrIHtcbiAgY2hhbmdlZDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN5bmNNYW5hZ2VkTWNwU2VydmVycyh7XG4gIGNvbmZpZ1BhdGgsXG4gIHR3ZWFrcyxcbn06IHtcbiAgY29uZmlnUGF0aDogc3RyaW5nO1xuICB0d2Vha3M6IE1jcFN5bmNUd2Vha1tdO1xufSk6IE1hbmFnZWRNY3BTeW5jUmVzdWx0IHtcbiAgY29uc3QgY3VycmVudCA9IGV4aXN0c1N5bmMoY29uZmlnUGF0aCkgPyByZWFkRmlsZVN5bmMoY29uZmlnUGF0aCwgXCJ1dGY4XCIpIDogXCJcIjtcbiAgY29uc3QgYnVpbHQgPSBidWlsZE1hbmFnZWRNY3BCbG9jayh0d2Vha3MsIGN1cnJlbnQpO1xuICBjb25zdCBuZXh0ID0gbWVyZ2VNYW5hZ2VkTWNwQmxvY2soY3VycmVudCwgYnVpbHQuYmxvY2spO1xuXG4gIGlmIChuZXh0ICE9PSBjdXJyZW50KSB7XG4gICAgbWtkaXJTeW5jKGRpcm5hbWUoY29uZmlnUGF0aCksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIHdyaXRlRmlsZVN5bmMoY29uZmlnUGF0aCwgbmV4dCwgXCJ1dGY4XCIpO1xuICB9XG5cbiAgcmV0dXJuIHsgLi4uYnVpbHQsIGNoYW5nZWQ6IG5leHQgIT09IGN1cnJlbnQgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkTWFuYWdlZE1jcEJsb2NrKFxuICB0d2Vha3M6IE1jcFN5bmNUd2Vha1tdLFxuICBleGlzdGluZ1RvbWwgPSBcIlwiLFxuKTogQnVpbHRNYW5hZ2VkTWNwQmxvY2sge1xuICBjb25zdCBtYW51YWxUb21sID0gc3RyaXBNYW5hZ2VkTWNwQmxvY2soZXhpc3RpbmdUb21sKTtcbiAgY29uc3QgbWFudWFsTmFtZXMgPSBmaW5kTWNwU2VydmVyTmFtZXMobWFudWFsVG9tbCk7XG4gIGNvbnN0IHVzZWROYW1lcyA9IG5ldyBTZXQobWFudWFsTmFtZXMpO1xuICBjb25zdCBzZXJ2ZXJOYW1lczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3Qgc2tpcHBlZFNlcnZlck5hbWVzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBlbnRyaWVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgdHdlYWsgb2YgdHdlYWtzKSB7XG4gICAgY29uc3QgbWNwID0gbm9ybWFsaXplTWNwU2VydmVyKHR3ZWFrLm1hbmlmZXN0Lm1jcCk7XG4gICAgaWYgKCFtY3ApIGNvbnRpbnVlO1xuXG4gICAgY29uc3QgYmFzZU5hbWUgPSBtY3BTZXJ2ZXJOYW1lRnJvbVR3ZWFrSWQodHdlYWsubWFuaWZlc3QuaWQpO1xuICAgIGlmIChtYW51YWxOYW1lcy5oYXMoYmFzZU5hbWUpKSB7XG4gICAgICBza2lwcGVkU2VydmVyTmFtZXMucHVzaChiYXNlTmFtZSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBzZXJ2ZXJOYW1lID0gcmVzZXJ2ZVVuaXF1ZU5hbWUoYmFzZU5hbWUsIHVzZWROYW1lcyk7XG4gICAgc2VydmVyTmFtZXMucHVzaChzZXJ2ZXJOYW1lKTtcbiAgICBlbnRyaWVzLnB1c2goZm9ybWF0TWNwU2VydmVyKHNlcnZlck5hbWUsIHR3ZWFrLmRpciwgbWNwKSk7XG4gIH1cblxuICBpZiAoZW50cmllcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4geyBibG9jazogXCJcIiwgc2VydmVyTmFtZXMsIHNraXBwZWRTZXJ2ZXJOYW1lcyB9O1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBibG9jazogW01DUF9NQU5BR0VEX1NUQVJULCAuLi5lbnRyaWVzLCBNQ1BfTUFOQUdFRF9FTkRdLmpvaW4oXCJcXG5cIiksXG4gICAgc2VydmVyTmFtZXMsXG4gICAgc2tpcHBlZFNlcnZlck5hbWVzLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWVyZ2VNYW5hZ2VkTWNwQmxvY2soY3VycmVudFRvbWw6IHN0cmluZywgbWFuYWdlZEJsb2NrOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoIW1hbmFnZWRCbG9jayAmJiAhY3VycmVudFRvbWwuaW5jbHVkZXMoTUNQX01BTkFHRURfU1RBUlQpKSByZXR1cm4gY3VycmVudFRvbWw7XG4gIGNvbnN0IHN0cmlwcGVkID0gc3RyaXBNYW5hZ2VkTWNwQmxvY2soY3VycmVudFRvbWwpLnRyaW1FbmQoKTtcbiAgaWYgKCFtYW5hZ2VkQmxvY2spIHJldHVybiBzdHJpcHBlZCA/IGAke3N0cmlwcGVkfVxcbmAgOiBcIlwiO1xuICByZXR1cm4gYCR7c3RyaXBwZWQgPyBgJHtzdHJpcHBlZH1cXG5cXG5gIDogXCJcIn0ke21hbmFnZWRCbG9ja31cXG5gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RyaXBNYW5hZ2VkTWNwQmxvY2sodG9tbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgcGF0dGVybiA9IG5ldyBSZWdFeHAoXG4gICAgYFxcXFxuPyR7ZXNjYXBlUmVnRXhwKE1DUF9NQU5BR0VEX1NUQVJUKX1bXFxcXHNcXFxcU10qPyR7ZXNjYXBlUmVnRXhwKE1DUF9NQU5BR0VEX0VORCl9XFxcXG4/YCxcbiAgICBcImdcIixcbiAgKTtcbiAgcmV0dXJuIHRvbWwucmVwbGFjZShwYXR0ZXJuLCBcIlxcblwiKS5yZXBsYWNlKC9cXG57Myx9L2csIFwiXFxuXFxuXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWNwU2VydmVyTmFtZUZyb21Ud2Vha0lkKGlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCB3aXRob3V0UHVibGlzaGVyID0gaWQucmVwbGFjZSgvXmNvXFwuYmVubmV0dFxcLi8sIFwiXCIpO1xuICBjb25zdCBzbHVnID0gd2l0aG91dFB1Ymxpc2hlclxuICAgIC5yZXBsYWNlKC9bXmEtekEtWjAtOV8tXSsvZywgXCItXCIpXG4gICAgLnJlcGxhY2UoL14tK3wtKyQvZywgXCJcIilcbiAgICAudG9Mb3dlckNhc2UoKTtcbiAgcmV0dXJuIHNsdWcgfHwgXCJ0d2Vhay1tY3BcIjtcbn1cblxuZnVuY3Rpb24gZmluZE1jcFNlcnZlck5hbWVzKHRvbWw6IHN0cmluZyk6IFNldDxzdHJpbmc+IHtcbiAgY29uc3QgbmFtZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgdGFibGVQYXR0ZXJuID0gL15cXHMqXFxbbWNwX3NlcnZlcnNcXC4oW15cXF1cXHNdKylcXF1cXHMqJC9nbTtcbiAgbGV0IG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xuICB3aGlsZSAoKG1hdGNoID0gdGFibGVQYXR0ZXJuLmV4ZWModG9tbCkpICE9PSBudWxsKSB7XG4gICAgbmFtZXMuYWRkKHVucXVvdGVUb21sS2V5KG1hdGNoWzFdID8/IFwiXCIpKTtcbiAgfVxuICByZXR1cm4gbmFtZXM7XG59XG5cbmZ1bmN0aW9uIHJlc2VydmVVbmlxdWVOYW1lKGJhc2VOYW1lOiBzdHJpbmcsIHVzZWROYW1lczogU2V0PHN0cmluZz4pOiBzdHJpbmcge1xuICBpZiAoIXVzZWROYW1lcy5oYXMoYmFzZU5hbWUpKSB7XG4gICAgdXNlZE5hbWVzLmFkZChiYXNlTmFtZSk7XG4gICAgcmV0dXJuIGJhc2VOYW1lO1xuICB9XG4gIGZvciAobGV0IGkgPSAyOyA7IGkgKz0gMSkge1xuICAgIGNvbnN0IGNhbmRpZGF0ZSA9IGAke2Jhc2VOYW1lfS0ke2l9YDtcbiAgICBpZiAoIXVzZWROYW1lcy5oYXMoY2FuZGlkYXRlKSkge1xuICAgICAgdXNlZE5hbWVzLmFkZChjYW5kaWRhdGUpO1xuICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplTWNwU2VydmVyKHZhbHVlOiBUd2Vha01jcFNlcnZlciB8IHVuZGVmaW5lZCk6IFR3ZWFrTWNwU2VydmVyIHwgbnVsbCB7XG4gIGlmICghdmFsdWUgfHwgdHlwZW9mIHZhbHVlLmNvbW1hbmQgIT09IFwic3RyaW5nXCIgfHwgdmFsdWUuY29tbWFuZC5sZW5ndGggPT09IDApIHJldHVybiBudWxsO1xuICBpZiAodmFsdWUuYXJncyAhPT0gdW5kZWZpbmVkICYmICFBcnJheS5pc0FycmF5KHZhbHVlLmFyZ3MpKSByZXR1cm4gbnVsbDtcbiAgaWYgKHZhbHVlLmFyZ3M/LnNvbWUoKGFyZykgPT4gdHlwZW9mIGFyZyAhPT0gXCJzdHJpbmdcIikpIHJldHVybiBudWxsO1xuICBpZiAodmFsdWUuZW52ICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAoIXZhbHVlLmVudiB8fCB0eXBlb2YgdmFsdWUuZW52ICE9PSBcIm9iamVjdFwiIHx8IEFycmF5LmlzQXJyYXkodmFsdWUuZW52KSkgcmV0dXJuIG51bGw7XG4gICAgaWYgKE9iamVjdC52YWx1ZXModmFsdWUuZW52KS5zb21lKChlbnZWYWx1ZSkgPT4gdHlwZW9mIGVudlZhbHVlICE9PSBcInN0cmluZ1wiKSkgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRNY3BTZXJ2ZXIoc2VydmVyTmFtZTogc3RyaW5nLCB0d2Vha0Rpcjogc3RyaW5nLCBtY3A6IFR3ZWFrTWNwU2VydmVyKTogc3RyaW5nIHtcbiAgY29uc3QgbGluZXMgPSBbXG4gICAgYFttY3Bfc2VydmVycy4ke2Zvcm1hdFRvbWxLZXkoc2VydmVyTmFtZSl9XWAsXG4gICAgYGNvbW1hbmQgPSAke2Zvcm1hdFRvbWxTdHJpbmcocmVzb2x2ZUNvbW1hbmQodHdlYWtEaXIsIG1jcC5jb21tYW5kKSl9YCxcbiAgXTtcblxuICBpZiAobWNwLmFyZ3MgJiYgbWNwLmFyZ3MubGVuZ3RoID4gMCkge1xuICAgIGxpbmVzLnB1c2goYGFyZ3MgPSAke2Zvcm1hdFRvbWxTdHJpbmdBcnJheShtY3AuYXJncy5tYXAoKGFyZykgPT4gcmVzb2x2ZUFyZyh0d2Vha0RpciwgYXJnKSkpfWApO1xuICB9XG5cbiAgaWYgKG1jcC5lbnYgJiYgT2JqZWN0LmtleXMobWNwLmVudikubGVuZ3RoID4gMCkge1xuICAgIGxpbmVzLnB1c2goYGVudiA9ICR7Zm9ybWF0VG9tbElubGluZVRhYmxlKG1jcC5lbnYpfWApO1xuICB9XG5cbiAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVDb21tYW5kKHR3ZWFrRGlyOiBzdHJpbmcsIGNvbW1hbmQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmIChpc0Fic29sdXRlKGNvbW1hbmQpIHx8ICFsb29rc0xpa2VSZWxhdGl2ZVBhdGgoY29tbWFuZCkpIHJldHVybiBjb21tYW5kO1xuICByZXR1cm4gcmVzb2x2ZSh0d2Vha0RpciwgY29tbWFuZCk7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVBcmcodHdlYWtEaXI6IHN0cmluZywgYXJnOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoaXNBYnNvbHV0ZShhcmcpIHx8IGFyZy5zdGFydHNXaXRoKFwiLVwiKSkgcmV0dXJuIGFyZztcbiAgY29uc3QgY2FuZGlkYXRlID0gcmVzb2x2ZSh0d2Vha0RpciwgYXJnKTtcbiAgcmV0dXJuIGV4aXN0c1N5bmMoY2FuZGlkYXRlKSA/IGNhbmRpZGF0ZSA6IGFyZztcbn1cblxuZnVuY3Rpb24gbG9va3NMaWtlUmVsYXRpdmVQYXRoKHZhbHVlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIHZhbHVlLnN0YXJ0c1dpdGgoXCIuL1wiKSB8fCB2YWx1ZS5zdGFydHNXaXRoKFwiLi4vXCIpIHx8IHZhbHVlLmluY2x1ZGVzKFwiL1wiKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VG9tbFN0cmluZyh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VG9tbFN0cmluZ0FycmF5KHZhbHVlczogc3RyaW5nW10pOiBzdHJpbmcge1xuICByZXR1cm4gYFske3ZhbHVlcy5tYXAoZm9ybWF0VG9tbFN0cmluZykuam9pbihcIiwgXCIpfV1gO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRUb21sSW5saW5lVGFibGUocmVjb3JkOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KTogc3RyaW5nIHtcbiAgcmV0dXJuIGB7ICR7T2JqZWN0LmVudHJpZXMocmVjb3JkKVxuICAgIC5tYXAoKFtrZXksIHZhbHVlXSkgPT4gYCR7Zm9ybWF0VG9tbEtleShrZXkpfSA9ICR7Zm9ybWF0VG9tbFN0cmluZyh2YWx1ZSl9YClcbiAgICAuam9pbihcIiwgXCIpfSB9YDtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VG9tbEtleShrZXk6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiAvXlthLXpBLVowLTlfLV0rJC8udGVzdChrZXkpID8ga2V5IDogZm9ybWF0VG9tbFN0cmluZyhrZXkpO1xufVxuXG5mdW5jdGlvbiB1bnF1b3RlVG9tbEtleShrZXk6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICgha2V5LnN0YXJ0c1dpdGgoJ1wiJykgfHwgIWtleS5lbmRzV2l0aCgnXCInKSkgcmV0dXJuIGtleTtcbiAgdHJ5IHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShrZXkpIGFzIHN0cmluZztcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGtleTtcbiAgfVxufVxuXG5mdW5jdGlvbiBlc2NhcGVSZWdFeHAodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB2YWx1ZS5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgXCJcXFxcJCZcIik7XG59XG4iLCAiaW1wb3J0IHsgQnJvd3NlcldpbmRvdyB9IGZyb20gXCJlbGVjdHJvblwiO1xuaW1wb3J0IHsgc3Bhd24sIHR5cGUgQ2hpbGRQcm9jZXNzV2l0aG91dE51bGxTdHJlYW1zIH0gZnJvbSBcIm5vZGU6Y2hpbGRfcHJvY2Vzc1wiO1xuaW1wb3J0IHsgcmFuZG9tVVVJRCB9IGZyb20gXCJub2RlOmNyeXB0b1wiO1xuaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBjcmVhdGVJbnRlcmZhY2UgfSBmcm9tIFwibm9kZTpyZWFkbGluZVwiO1xuaW1wb3J0IHsgcmVzb2x2ZU5hdGl2ZVR3ZWFrUGF0aCB9IGZyb20gXCIuL25hdGl2ZS1wYXRoc1wiO1xuaW1wb3J0IHR5cGUge1xuICBDb2RleFJ1bnRpbWVDYXBhYmlsaXRpZXMsXG4gIE5hdGl2ZUhlbHBlckxhdW5jaE9wdGlvbnMsXG4gIE5hdGl2ZUhlbHBlclJlZixcbiAgTmF0aXZlTW9kdWxlS2luZCxcbiAgTmF0aXZlTW9kdWxlTG9hZE9wdGlvbnMsXG4gIE5hdGl2ZU1vZHVsZVJlZixcbiAgTmF0aXZlUGFuZWxDcmVhdGVPcHRpb25zLFxuICBOYXRpdmVQYW5lbFJlZixcbiAgTmF0aXZlVmlld0F0dGFjaE9wdGlvbnMsXG4gIE5hdGl2ZVZpZXdSZWYsXG59IGZyb20gXCJAY29kZXgtcGx1c3BsdXMvc2RrXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTmF0aXZlVHdlYWtDb250ZXh0IHtcbiAgaWQ6IHN0cmluZztcbiAgZGlyOiBzdHJpbmc7XG59XG5cbnR5cGUgTmF0aXZlTG9nID0gKGxldmVsOiBcImluZm9cIiB8IFwid2FyblwiIHwgXCJlcnJvclwiLCAuLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQ7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTmF0aXZlQnJpZGdlT3B0aW9ucyB7XG4gIG5hdGl2ZUhvc3RQYXRoPzogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgTG9hZGVkTmF0aXZlTW9kdWxlIHtcbiAga2V5OiBzdHJpbmc7XG4gIHR3ZWFrSWQ6IHN0cmluZztcbiAgaWQ6IHN0cmluZztcbiAga2luZDogTmF0aXZlTW9kdWxlS2luZDtcbiAgcGF0aDogc3RyaW5nO1xuICBleHBvcnRzOiB1bmtub3duO1xufVxuXG5pbnRlcmZhY2UgTmF0aXZlSW5zdGFuY2Uge1xuICBrZXk6IHN0cmluZztcbiAgdHdlYWtJZDogc3RyaW5nO1xuICBpZDogc3RyaW5nO1xuICBraW5kOiBcInBhbmVsXCIgfCBcInZpZXdcIjtcbiAgdmFsdWU6IHVua25vd247XG4gIHBhcmVudFdpbmRvd0lkOiBudW1iZXIgfCBudWxsO1xuICB3aW5kb3dJZDogbnVtYmVyIHwgbnVsbDtcbiAgZGlzcG9zZUJpbmRpbmdzOiBBcnJheTwoKSA9PiB2b2lkPjtcbiAgZGlzcG9zaW5nOiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgSGVscGVyUmVxdWVzdCB7XG4gIHJlc29sdmUodmFsdWU6IHVua25vd24pOiB2b2lkO1xuICByZWplY3QoZXJyb3I6IEVycm9yKTogdm9pZDtcbiAgdGltZXI6IE5vZGVKUy5UaW1lb3V0O1xufVxuXG5pbnRlcmZhY2UgTmF0aXZlSGVscGVyUHJvY2VzcyB7XG4gIGtleTogc3RyaW5nO1xuICB0d2Vha0lkOiBzdHJpbmc7XG4gIGlkOiBzdHJpbmc7XG4gIGNoaWxkOiBDaGlsZFByb2Nlc3NXaXRob3V0TnVsbFN0cmVhbXM7XG4gIHBlbmRpbmc6IE1hcDxzdHJpbmcsIEhlbHBlclJlcXVlc3Q+O1xufVxuXG5leHBvcnQgY2xhc3MgTmF0aXZlQnJpZGdlIHtcbiAgcHJpdmF0ZSBtb2R1bGVzID0gbmV3IE1hcDxzdHJpbmcsIExvYWRlZE5hdGl2ZU1vZHVsZT4oKTtcbiAgcHJpdmF0ZSBpbnN0YW5jZXMgPSBuZXcgTWFwPHN0cmluZywgTmF0aXZlSW5zdGFuY2U+KCk7XG4gIHByaXZhdGUgaGVscGVycyA9IG5ldyBNYXA8c3RyaW5nLCBOYXRpdmVIZWxwZXJQcm9jZXNzPigpO1xuICBwcml2YXRlIG5hdGl2ZUhvc3RFeHBvcnRzOiB1bmtub3duIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgbmF0aXZlSG9zdExvYWRFcnJvcjogRXJyb3IgfCBudWxsID0gbnVsbDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxvZzogTmF0aXZlTG9nLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgb3B0aW9uczogTmF0aXZlQnJpZGdlT3B0aW9ucyA9IHt9LFxuICApIHt9XG5cbiAgZ2V0Q2FwYWJpbGl0aWVzKCk6IENvZGV4UnVudGltZUNhcGFiaWxpdGllc1tcIm5hdGl2ZVwiXSB7XG4gICAgY29uc3QgaG9zdCA9IHRoaXMubG9hZE5hdGl2ZUhvc3QoZmFsc2UpO1xuICAgIGNvbnN0IGhvc3RDYXBhYmlsaXRpZXMgPSBob3N0ID8gdGhpcy5yZWFkTmF0aXZlSG9zdENhcGFiaWxpdGllcyhob3N0KSA6IHt9O1xuICAgIGNvbnN0IG5hdGl2ZUhvc3QgPSBob3N0ICE9PSBudWxsO1xuICAgIHJldHVybiB7XG4gICAgICBpblByb2Nlc3NNb2R1bGVzOiB0cnVlLFxuICAgICAgc3dpZnRNb2R1bGVzOiBwcm9jZXNzLnBsYXRmb3JtID09PSBcImRhcndpblwiLFxuICAgICAgYXBwS2l0RW1iZWRkaW5nOiBCb29sZWFuKGhvc3RDYXBhYmlsaXRpZXMuYXBwS2l0RW1iZWRkaW5nKSxcbiAgICAgIGNoaWxkV2luZG93T3ZlcmxheTogQm9vbGVhbihob3N0Q2FwYWJpbGl0aWVzLmNoaWxkV2luZG93T3ZlcmxheSksXG4gICAgICBkaXJlY3RWaWV3QXR0YWNoOiBCb29sZWFuKGhvc3RDYXBhYmlsaXRpZXMuZGlyZWN0Vmlld0F0dGFjaCksXG4gICAgICBtZXRhbFZpZXdzOiBCb29sZWFuKGhvc3RDYXBhYmlsaXRpZXMubWV0YWxWaWV3cyksXG4gICAgICBuYXRpdmVIb3N0LFxuICAgICAgaGVscGVyczogdHJ1ZSxcbiAgICB9O1xuICB9XG5cbiAgbG9hZE1vZHVsZShjdHg6IE5hdGl2ZVR3ZWFrQ29udGV4dCwgb3B0aW9uczogTmF0aXZlTW9kdWxlTG9hZE9wdGlvbnMpOiBOYXRpdmVNb2R1bGVSZWYge1xuICAgIGNvbnN0IGlkID0gYXNzZXJ0QnJpZGdlSWQob3B0aW9ucy5pZCwgXCJuYXRpdmUgbW9kdWxlIGlkXCIpO1xuICAgIGNvbnN0IGZ1bGxQYXRoID0gcmVzb2x2ZVR3ZWFrUGF0aChjdHgsIG9wdGlvbnMucGF0aCk7XG4gICAgY29uc3Qga2luZCA9IG9wdGlvbnMua2luZCA/PyBpbmZlck1vZHVsZUtpbmQoZnVsbFBhdGgpO1xuXG4gICAgaWYgKGtpbmQgIT09IFwibm9kZS1hZGRvblwiKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGAke2tpbmR9IG5hdGl2ZSBtb2R1bGVzIG11c3QgYmUgbG9hZGVkIHRocm91Z2ggYSAubm9kZSBPYmplY3RpdmUtQysrIHNoaW0gaW4gQ29kZXgrKyAxLjAuMGAsXG4gICAgICApO1xuICAgIH1cblxuICAgIGlmICghZnVsbFBhdGguZW5kc1dpdGgoXCIubm9kZVwiKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwibm9kZS1hZGRvbiBuYXRpdmUgbW9kdWxlcyBtdXN0IHVzZSBhIC5ub2RlIGZpbGVcIik7XG4gICAgfVxuXG4gICAgY29uc3QgbG9hZGVkID0gcmVxdWlyZShmdWxsUGF0aCkgYXMgdW5rbm93bjtcbiAgICBjb25zdCBleHBvcnRzID0gc2VsZWN0RW50cnlwb2ludChsb2FkZWQsIG9wdGlvbnMuZW50cnlwb2ludCk7XG4gICAgY29uc3Qga2V5ID0gbW9kdWxlS2V5KGN0eC5pZCwgaWQpO1xuICAgIHRoaXMubW9kdWxlcy5zZXQoa2V5LCB7IGtleSwgdHdlYWtJZDogY3R4LmlkLCBpZCwga2luZCwgcGF0aDogZnVsbFBhdGgsIGV4cG9ydHMgfSk7XG4gICAgdGhpcy5sb2coXCJpbmZvXCIsIGBsb2FkZWQgbmF0aXZlIG1vZHVsZSAke2N0eC5pZH06JHtpZH1gLCB7IGtpbmQsIHBhdGg6IGZ1bGxQYXRoIH0pO1xuICAgIHJldHVybiB0aGlzLm1vZHVsZVJlZihjdHguaWQsIGlkLCBraW5kKTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZVBhbmVsKGN0eDogTmF0aXZlVHdlYWtDb250ZXh0LCBvcHRpb25zOiBOYXRpdmVQYW5lbENyZWF0ZU9wdGlvbnMpOiBQcm9taXNlPE5hdGl2ZVBhbmVsUmVmPiB7XG4gICAgY29uc3QgY3JlYXRlZCA9IGF3YWl0IHRoaXMuY3JlYXRlTmF0aXZlSW5zdGFuY2UoY3R4LCBcInBhbmVsXCIsIG9wdGlvbnMubW9kdWxlSWQsIG9wdGlvbnMuZmFjdG9yeSA/PyBcImNyZWF0ZVBhbmVsXCIsIHtcbiAgICAgIHBhcmVudFdpbmRvd0lkOiBvcHRpb25zLnBhcmVudFdpbmRvd0lkLFxuICAgICAgYm91bmRzOiBvcHRpb25zLmJvdW5kcyxcbiAgICAgIHRyYW5zcGFyZW50OiBvcHRpb25zLnRyYW5zcGFyZW50ID09PSB0cnVlLFxuICAgICAgcGFzc3Rocm91Z2hNb3VzZTogb3B0aW9ucy5wYXNzdGhyb3VnaE1vdXNlID09PSB0cnVlLFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnBhbmVsUmVmKGNyZWF0ZWQpO1xuICB9XG5cbiAgYXN5bmMgYXR0YWNoVmlldyhjdHg6IE5hdGl2ZVR3ZWFrQ29udGV4dCwgb3B0aW9uczogTmF0aXZlVmlld0F0dGFjaE9wdGlvbnMpOiBQcm9taXNlPE5hdGl2ZVZpZXdSZWY+IHtcbiAgICBjb25zdCBjcmVhdGVkID0gYXdhaXQgdGhpcy5jcmVhdGVOYXRpdmVJbnN0YW5jZShjdHgsIFwidmlld1wiLCBvcHRpb25zLm1vZHVsZUlkLCBvcHRpb25zLmZhY3RvcnkgPz8gXCJhdHRhY2hWaWV3XCIsIHtcbiAgICAgIHBhcmVudFdpbmRvd0lkOiBvcHRpb25zLnBhcmVudFdpbmRvd0lkLFxuICAgICAgYm91bmRzOiBvcHRpb25zLmJvdW5kcyxcbiAgICAgIHpJbmRleDogb3B0aW9ucy56SW5kZXgsXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMudmlld1JlZihjcmVhdGVkKTtcbiAgfVxuXG4gIGxhdW5jaEhlbHBlcihjdHg6IE5hdGl2ZVR3ZWFrQ29udGV4dCwgb3B0aW9uczogTmF0aXZlSGVscGVyTGF1bmNoT3B0aW9ucyk6IE5hdGl2ZUhlbHBlclJlZiB7XG4gICAgY29uc3QgaWQgPSBhc3NlcnRCcmlkZ2VJZChvcHRpb25zLmlkLCBcIm5hdGl2ZSBoZWxwZXIgaWRcIik7XG4gICAgaWYgKChvcHRpb25zLnRyYW5zcG9ydCA/PyBcInN0ZGlvXCIpICE9PSBcInN0ZGlvXCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIm5hdGl2ZSBoZWxwZXJzIHN1cHBvcnQgb25seSBzdGRpbyB0cmFuc3BvcnQgaW4gQ29kZXgrKyAxLjAuMFwiKTtcbiAgICB9XG4gICAgaWYgKChvcHRpb25zLnJlc3RhcnQgPz8gXCJuZXZlclwiKSAhPT0gXCJuZXZlclwiKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJuYXRpdmUgaGVscGVyIHJlc3RhcnQgcG9saWNpZXMgYXJlIG5vdCBhdmFpbGFibGUgaW4gQ29kZXgrKyAxLjAuMFwiKTtcbiAgICB9XG4gICAgY29uc3QgZXhlY3V0YWJsZSA9IHJlc29sdmVUd2Vha1BhdGgoY3R4LCBvcHRpb25zLmV4ZWN1dGFibGUpO1xuICAgIGNvbnN0IGFyZ3MgPSBvcHRpb25zLmFyZ3MgPz8gW107XG4gICAgY29uc3QgZW52ID0geyAuLi5wcm9jZXNzLmVudiwgLi4uKG9wdGlvbnMuZW52ID8/IHt9KSB9O1xuICAgIGNvbnN0IGNoaWxkID0gc3Bhd24oZXhlY3V0YWJsZSwgYXJncywge1xuICAgICAgY3dkOiBjdHguZGlyLFxuICAgICAgZW52LFxuICAgICAgc3RkaW86IFtcInBpcGVcIiwgXCJwaXBlXCIsIFwicGlwZVwiXSxcbiAgICB9KTtcbiAgICBjb25zdCBrZXkgPSBoZWxwZXJLZXkoY3R4LmlkLCBpZCk7XG4gICAgY29uc3QgaGVscGVyOiBOYXRpdmVIZWxwZXJQcm9jZXNzID0ge1xuICAgICAga2V5LFxuICAgICAgdHdlYWtJZDogY3R4LmlkLFxuICAgICAgaWQsXG4gICAgICBjaGlsZCxcbiAgICAgIHBlbmRpbmc6IG5ldyBNYXAoKSxcbiAgICB9O1xuICAgIHRoaXMuaGVscGVycy5zZXQoa2V5LCBoZWxwZXIpO1xuXG4gICAgY29uc3Qgc3Rkb3V0ID0gY3JlYXRlSW50ZXJmYWNlKHsgaW5wdXQ6IGNoaWxkLnN0ZG91dCB9KTtcbiAgICBzdGRvdXQub24oXCJsaW5lXCIsIChsaW5lKSA9PiB0aGlzLmhhbmRsZUhlbHBlckxpbmUoaGVscGVyLCBsaW5lKSk7XG4gICAgY2hpbGQuc3RkZXJyLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IHtcbiAgICAgIHRoaXMubG9nKFwid2FyblwiLCBgbmF0aXZlIGhlbHBlciAke2N0eC5pZH06JHtpZH0gc3RkZXJyYCwgU3RyaW5nKGNodW5rKSk7XG4gICAgfSk7XG4gICAgY2hpbGQub24oXCJleGl0XCIsIChjb2RlLCBzaWduYWwpID0+IHtcbiAgICAgIHRoaXMubG9nKFwiaW5mb1wiLCBgbmF0aXZlIGhlbHBlciAke2N0eC5pZH06JHtpZH0gZXhpdGVkYCwgeyBjb2RlLCBzaWduYWwgfSk7XG4gICAgICB0aGlzLmhlbHBlcnMuZGVsZXRlKGtleSk7XG4gICAgICBmb3IgKGNvbnN0IHJlcXVlc3Qgb2YgaGVscGVyLnBlbmRpbmcudmFsdWVzKCkpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHJlcXVlc3QudGltZXIpO1xuICAgICAgICByZXF1ZXN0LnJlamVjdChuZXcgRXJyb3IoYG5hdGl2ZSBoZWxwZXIgZXhpdGVkIGJlZm9yZSByZXNwb25zZWApKTtcbiAgICAgIH1cbiAgICAgIGhlbHBlci5wZW5kaW5nLmNsZWFyKCk7XG4gICAgfSk7XG4gICAgY2hpbGQub24oXCJlcnJvclwiLCAoZXJyb3IpID0+IHtcbiAgICAgIHRoaXMubG9nKFwiZXJyb3JcIiwgYG5hdGl2ZSBoZWxwZXIgJHtjdHguaWR9OiR7aWR9IGZhaWxlZGAsIGVycm9yKTtcbiAgICAgIHRoaXMuaGVscGVycy5kZWxldGUoa2V5KTtcbiAgICAgIGZvciAoY29uc3QgcmVxdWVzdCBvZiBoZWxwZXIucGVuZGluZy52YWx1ZXMoKSkge1xuICAgICAgICBjbGVhclRpbWVvdXQocmVxdWVzdC50aW1lcik7XG4gICAgICAgIHJlcXVlc3QucmVqZWN0KGVycm9yKTtcbiAgICAgIH1cbiAgICAgIGhlbHBlci5wZW5kaW5nLmNsZWFyKCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmxvZyhcImluZm9cIiwgYGxhdW5jaGVkIG5hdGl2ZSBoZWxwZXIgJHtjdHguaWR9OiR7aWR9YCwgeyBwaWQ6IGNoaWxkLnBpZCwgZXhlY3V0YWJsZSB9KTtcbiAgICByZXR1cm4gdGhpcy5oZWxwZXJSZWYoY3R4LmlkLCBpZCwgY2hpbGQucGlkID8/IC0xKTtcbiAgfVxuXG4gIGRpc3Bvc2VUd2Vhayh0d2Vha0lkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IFtrZXksIGluc3RhbmNlXSBvZiBbLi4udGhpcy5pbnN0YW5jZXNdKSB7XG4gICAgICBpZiAoaW5zdGFuY2UudHdlYWtJZCAhPT0gdHdlYWtJZCkgY29udGludWU7XG4gICAgICB2b2lkIHRoaXMuZGlzcG9zZUluc3RhbmNlKGluc3RhbmNlKS5maW5hbGx5KCgpID0+IHRoaXMuaW5zdGFuY2VzLmRlbGV0ZShrZXkpKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBba2V5LCBoZWxwZXJdIG9mIFsuLi50aGlzLmhlbHBlcnNdKSB7XG4gICAgICBpZiAoaGVscGVyLnR3ZWFrSWQgIT09IHR3ZWFrSWQpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5zdG9wSGVscGVyKGhlbHBlcik7XG4gICAgICB0aGlzLmhlbHBlcnMuZGVsZXRlKGtleSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgW2tleSwgbW9kXSBvZiBbLi4udGhpcy5tb2R1bGVzXSkge1xuICAgICAgaWYgKG1vZC50d2Vha0lkICE9PSB0d2Vha0lkKSBjb250aW51ZTtcbiAgICAgIHZvaWQgY2FsbE9wdGlvbmFsKG1vZC5leHBvcnRzLCBcImRpc3Bvc2VcIiwgW10pO1xuICAgICAgdGhpcy5tb2R1bGVzLmRlbGV0ZShrZXkpO1xuICAgIH1cbiAgfVxuXG4gIGRpc3Bvc2VBbGwoKTogdm9pZCB7XG4gICAgY29uc3QgdHdlYWtJZHMgPSBuZXcgU2V0KFtcbiAgICAgIC4uLlsuLi50aGlzLm1vZHVsZXMudmFsdWVzKCldLm1hcCgoaXRlbSkgPT4gaXRlbS50d2Vha0lkKSxcbiAgICAgIC4uLlsuLi50aGlzLmluc3RhbmNlcy52YWx1ZXMoKV0ubWFwKChpdGVtKSA9PiBpdGVtLnR3ZWFrSWQpLFxuICAgICAgLi4uWy4uLnRoaXMuaGVscGVycy52YWx1ZXMoKV0ubWFwKChpdGVtKSA9PiBpdGVtLnR3ZWFrSWQpLFxuICAgIF0pO1xuICAgIGZvciAoY29uc3QgaWQgb2YgdHdlYWtJZHMpIHRoaXMuZGlzcG9zZVR3ZWFrKGlkKTtcbiAgfVxuXG4gIGFzeW5jIGNhbGxJbnN0YW5jZShcbiAgICB0d2Vha0lkOiBzdHJpbmcsXG4gICAga2luZDogXCJwYW5lbFwiIHwgXCJ2aWV3XCIsXG4gICAgaWQ6IHN0cmluZyxcbiAgICBtZXRob2Q6IHN0cmluZyxcbiAgICBhcmc/OiB1bmtub3duLFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoa2luZCA9PT0gXCJwYW5lbFwiKSB7XG4gICAgICBpZiAobWV0aG9kID09PSBcInNldEJvdW5kc1wiKSByZXR1cm4gdGhpcy5pbnZva2VJbnN0YW5jZSh0d2Vha0lkLCBpZCwgXCJzZXRCb3VuZHNcIiwgW2FyZ10pO1xuICAgICAgaWYgKG1ldGhvZCA9PT0gXCJzaG93XCIpIHJldHVybiB0aGlzLmludm9rZUluc3RhbmNlKHR3ZWFrSWQsIGlkLCBcInNob3dcIiwgW10pO1xuICAgICAgaWYgKG1ldGhvZCA9PT0gXCJoaWRlXCIpIHJldHVybiB0aGlzLmludm9rZUluc3RhbmNlKHR3ZWFrSWQsIGlkLCBcImhpZGVcIiwgW10pO1xuICAgICAgaWYgKG1ldGhvZCA9PT0gXCJkaXNwb3NlXCIpIHJldHVybiB0aGlzLmRpc3Bvc2VJbnN0YW5jZUJ5SWQodHdlYWtJZCwgaWQpO1xuICAgIH1cbiAgICBpZiAoa2luZCA9PT0gXCJ2aWV3XCIpIHtcbiAgICAgIGlmIChtZXRob2QgPT09IFwic2V0Qm91bmRzXCIpIHJldHVybiB0aGlzLmludm9rZUluc3RhbmNlKHR3ZWFrSWQsIGlkLCBcInNldEJvdW5kc1wiLCBbYXJnXSk7XG4gICAgICBpZiAobWV0aG9kID09PSBcInNldFZpc2libGVcIikgcmV0dXJuIHRoaXMuaW52b2tlSW5zdGFuY2UodHdlYWtJZCwgaWQsIFwic2V0VmlzaWJsZVwiLCBbYXJnXSk7XG4gICAgICBpZiAobWV0aG9kID09PSBcImRpc3Bvc2VcIikgcmV0dXJuIHRoaXMuZGlzcG9zZUluc3RhbmNlQnlJZCh0d2Vha0lkLCBpZCk7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgdW5rbm93biBuYXRpdmUgJHtraW5kfSBtZXRob2Q6ICR7bWV0aG9kfWApO1xuICB9XG5cbiAgYXN5bmMgY2FsbEhlbHBlcihcbiAgICB0d2Vha0lkOiBzdHJpbmcsXG4gICAgaGVscGVySWQ6IHN0cmluZyxcbiAgICBtZXRob2Q6IHN0cmluZyxcbiAgICBwYXlsb2FkPzogdW5rbm93bixcbiAgICB0aW1lb3V0TXM/OiBudW1iZXIsXG4gICk6IFByb21pc2U8dW5rbm93bj4ge1xuICAgIGlmIChtZXRob2QgPT09IFwic2VuZFwiKSByZXR1cm4gdGhpcy5zZW5kSGVscGVyKHR3ZWFrSWQsIGhlbHBlcklkLCBwYXlsb2FkKTtcbiAgICBpZiAobWV0aG9kID09PSBcInJlcXVlc3RcIikgcmV0dXJuIHRoaXMucmVxdWVzdEhlbHBlcih0d2Vha0lkLCBoZWxwZXJJZCwgcGF5bG9hZCwgdGltZW91dE1zKTtcbiAgICBpZiAobWV0aG9kID09PSBcInN0b3BcIikgcmV0dXJuIHRoaXMuc3RvcEhlbHBlckJ5SWQodHdlYWtJZCwgaGVscGVySWQpO1xuICAgIHRocm93IG5ldyBFcnJvcihgdW5rbm93biBuYXRpdmUgaGVscGVyIG1ldGhvZDogJHttZXRob2R9YCk7XG4gIH1cblxuICBwcml2YXRlIG1vZHVsZVJlZih0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcsIGtpbmQgPSB0aGlzLm1vZHVsZUZvcih0d2Vha0lkLCBpZCkua2luZCk6IE5hdGl2ZU1vZHVsZVJlZiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkLFxuICAgICAga2luZCxcbiAgICAgIHJlcXVlc3Q6IChtZXRob2QsIHBheWxvYWQsIHRpbWVvdXRNcykgPT5cbiAgICAgICAgdGhpcy5yZXF1ZXN0TW9kdWxlKHR3ZWFrSWQsIGlkLCBtZXRob2QsIHBheWxvYWQsIHRpbWVvdXRNcyksXG4gICAgICBkaXNwb3NlOiAoKSA9PiB0aGlzLmRpc3Bvc2VNb2R1bGUodHdlYWtJZCwgaWQpLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIHBhbmVsUmVmKGluc3RhbmNlOiBOYXRpdmVJbnN0YW5jZSk6IE5hdGl2ZVBhbmVsUmVmIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IGluc3RhbmNlLmlkLFxuICAgICAgd2luZG93SWQ6IGluc3RhbmNlLndpbmRvd0lkLFxuICAgICAgc2V0Qm91bmRzOiAoYm91bmRzKSA9PiB0aGlzLmludm9rZUluc3RhbmNlKGluc3RhbmNlLnR3ZWFrSWQsIGluc3RhbmNlLmlkLCBcInNldEJvdW5kc1wiLCBbYm91bmRzXSksXG4gICAgICBzaG93OiAoKSA9PiB0aGlzLmludm9rZUluc3RhbmNlKGluc3RhbmNlLnR3ZWFrSWQsIGluc3RhbmNlLmlkLCBcInNob3dcIiwgW10pLFxuICAgICAgaGlkZTogKCkgPT4gdGhpcy5pbnZva2VJbnN0YW5jZShpbnN0YW5jZS50d2Vha0lkLCBpbnN0YW5jZS5pZCwgXCJoaWRlXCIsIFtdKSxcbiAgICAgIGRpc3Bvc2U6ICgpID0+IHRoaXMuZGlzcG9zZUluc3RhbmNlQnlJZChpbnN0YW5jZS50d2Vha0lkLCBpbnN0YW5jZS5pZCksXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgdmlld1JlZihpbnN0YW5jZTogTmF0aXZlSW5zdGFuY2UpOiBOYXRpdmVWaWV3UmVmIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IGluc3RhbmNlLmlkLFxuICAgICAgc2V0Qm91bmRzOiAoYm91bmRzKSA9PiB0aGlzLmludm9rZUluc3RhbmNlKGluc3RhbmNlLnR3ZWFrSWQsIGluc3RhbmNlLmlkLCBcInNldEJvdW5kc1wiLCBbYm91bmRzXSksXG4gICAgICBzZXRWaXNpYmxlOiAodmlzaWJsZSkgPT4gdGhpcy5pbnZva2VJbnN0YW5jZShpbnN0YW5jZS50d2Vha0lkLCBpbnN0YW5jZS5pZCwgXCJzZXRWaXNpYmxlXCIsIFt2aXNpYmxlXSksXG4gICAgICBkaXNwb3NlOiAoKSA9PiB0aGlzLmRpc3Bvc2VJbnN0YW5jZUJ5SWQoaW5zdGFuY2UudHdlYWtJZCwgaW5zdGFuY2UuaWQpLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGhlbHBlclJlZih0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcsIHBpZDogbnVtYmVyKTogTmF0aXZlSGVscGVyUmVmIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQsXG4gICAgICBwaWQsXG4gICAgICBzZW5kOiAobWVzc2FnZSkgPT4gdGhpcy5zZW5kSGVscGVyKHR3ZWFrSWQsIGlkLCBtZXNzYWdlKSxcbiAgICAgIHJlcXVlc3Q6IChtZXNzYWdlLCB0aW1lb3V0TXMpID0+IHRoaXMucmVxdWVzdEhlbHBlcih0d2Vha0lkLCBpZCwgbWVzc2FnZSwgdGltZW91dE1zKSxcbiAgICAgIHN0b3A6ICgpID0+IHRoaXMuc3RvcEhlbHBlckJ5SWQodHdlYWtJZCwgaWQpLFxuICAgIH07XG4gIH1cblxuICBhc3luYyByZXF1ZXN0TW9kdWxlKFxuICAgIHR3ZWFrSWQ6IHN0cmluZyxcbiAgICBpZDogc3RyaW5nLFxuICAgIG1ldGhvZDogc3RyaW5nLFxuICAgIHBheWxvYWQ/OiB1bmtub3duLFxuICAgIF90aW1lb3V0TXM/OiBudW1iZXIsXG4gICk6IFByb21pc2U8dW5rbm93bj4ge1xuICAgIGNvbnN0IG1vZCA9IHRoaXMubW9kdWxlRm9yKHR3ZWFrSWQsIGlkKTtcbiAgICBjb25zdCB0YXJnZXQgPSBhc1JlY29yZChtb2QuZXhwb3J0cyk7XG4gICAgY29uc3QgZm4gPSB0YXJnZXQ/LnJlcXVlc3Q7XG4gICAgaWYgKHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICByZXR1cm4gYXdhaXQgZm4uY2FsbChtb2QuZXhwb3J0cywgbWV0aG9kLCBwYXlsb2FkKTtcbiAgICB9XG4gICAgY29uc3QgbWV0aG9kRm4gPSB0YXJnZXQ/LlttZXRob2RdO1xuICAgIGlmICh0eXBlb2YgbWV0aG9kRm4gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgcmV0dXJuIGF3YWl0IG1ldGhvZEZuLmNhbGwobW9kLmV4cG9ydHMsIHBheWxvYWQpO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYG5hdGl2ZSBtb2R1bGUgJHt0d2Vha0lkfToke2lkfSBoYXMgbm8gcmVxdWVzdCgpIG9yICR7bWV0aG9kfSgpYCk7XG4gIH1cblxuICBhc3luYyBkaXNwb3NlTW9kdWxlKHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGtleSA9IG1vZHVsZUtleSh0d2Vha0lkLCBpZCk7XG4gICAgY29uc3QgbW9kID0gdGhpcy5tb2R1bGVzLmdldChrZXkpO1xuICAgIGlmICghbW9kKSByZXR1cm47XG4gICAgYXdhaXQgY2FsbE9wdGlvbmFsKG1vZC5leHBvcnRzLCBcImRpc3Bvc2VcIiwgW10pO1xuICAgIHRoaXMubW9kdWxlcy5kZWxldGUoa2V5KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY3JlYXRlTmF0aXZlSW5zdGFuY2UoXG4gICAgY3R4OiBOYXRpdmVUd2Vha0NvbnRleHQsXG4gICAga2luZDogXCJwYW5lbFwiIHwgXCJ2aWV3XCIsXG4gICAgbW9kdWxlSWQ6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICBmYWN0b3J5OiBzdHJpbmcsXG4gICAgb3B0aW9uczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gICk6IFByb21pc2U8TmF0aXZlSW5zdGFuY2U+IHtcbiAgICBjb25zdCB0YXJnZXQgPSBtb2R1bGVJZCA/IHRoaXMubW9kdWxlRm9yKGN0eC5pZCwgbW9kdWxlSWQpLmV4cG9ydHMgOiB0aGlzLmxvYWROYXRpdmVIb3N0KHRydWUpO1xuICAgIGNvbnN0IGZuID0gYXNSZWNvcmQodGFyZ2V0KT8uW2ZhY3RvcnldO1xuICAgIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgY29uc3QgbGFiZWwgPSBtb2R1bGVJZCA/IGBuYXRpdmUgbW9kdWxlICR7Y3R4LmlkfToke21vZHVsZUlkfWAgOiBcIkNvZGV4KysgbmF0aXZlIGhvc3RcIjtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgJHtsYWJlbH0gaGFzIG5vIGZhY3RvcnkgJHtmYWN0b3J5fSgpYCk7XG4gICAgfVxuXG4gICAgY29uc3QgcGFyZW50V2luZG93ID0gdHlwZW9mIG9wdGlvbnMucGFyZW50V2luZG93SWQgPT09IFwibnVtYmVyXCJcbiAgICAgID8gQnJvd3NlcldpbmRvdy5mcm9tSWQob3B0aW9ucy5wYXJlbnRXaW5kb3dJZClcbiAgICAgIDogQnJvd3NlcldpbmRvdy5nZXRGb2N1c2VkV2luZG93KCk7XG4gICAgY29uc3QgcGFyZW50TmF0aXZlSGFuZGxlID0gbmF0aXZlSGFuZGxlRm9yV2luZG93KHBhcmVudFdpbmRvdyk7XG4gICAgY29uc3QgdmFsdWUgPSBhd2FpdCBmbi5jYWxsKHRhcmdldCwge1xuICAgICAgLi4ub3B0aW9ucyxcbiAgICAgIHBhcmVudFdpbmRvd0lkOiB3aW5kb3dJZEZvcihwYXJlbnRXaW5kb3cpLFxuICAgICAgcGFyZW50V2ViQ29udGVudHNJZDogd2ViQ29udGVudHNJZEZvcihwYXJlbnRXaW5kb3cpLFxuICAgICAgcGFyZW50TmF0aXZlSGFuZGxlLFxuICAgIH0pO1xuICAgIGNvbnN0IGlkID0gdHlwZW9mIGFzUmVjb3JkKHZhbHVlKT8uaWQgPT09IFwic3RyaW5nXCIgPyBTdHJpbmcoYXNSZWNvcmQodmFsdWUpPy5pZCkgOiByYW5kb21VVUlEKCk7XG4gICAgY29uc3Qgd2luZG93SWQgPSB0eXBlb2YgYXNSZWNvcmQodmFsdWUpPy53aW5kb3dJZCA9PT0gXCJudW1iZXJcIiA/IE51bWJlcihhc1JlY29yZCh2YWx1ZSk/LndpbmRvd0lkKSA6IG51bGw7XG4gICAgY29uc3QgaW5zdGFuY2U6IE5hdGl2ZUluc3RhbmNlID0ge1xuICAgICAga2V5OiBpbnN0YW5jZUtleShjdHguaWQsIGlkKSxcbiAgICAgIHR3ZWFrSWQ6IGN0eC5pZCxcbiAgICAgIGlkLFxuICAgICAga2luZCxcbiAgICAgIHZhbHVlLFxuICAgICAgcGFyZW50V2luZG93SWQ6IHdpbmRvd0lkRm9yKHBhcmVudFdpbmRvdyksXG4gICAgICB3aW5kb3dJZCxcbiAgICAgIGRpc3Bvc2VCaW5kaW5nczogW10sXG4gICAgICBkaXNwb3Npbmc6IGZhbHNlLFxuICAgIH07XG4gICAgdGhpcy5pbnN0YW5jZXMuc2V0KGluc3RhbmNlLmtleSwgaW5zdGFuY2UpO1xuICAgIGlmIChjYW5CaW5kUGFyZW50V2luZG93KHBhcmVudFdpbmRvdykpIHtcbiAgICAgIHRoaXMuYmluZEluc3RhbmNlVG9QYXJlbnQoaW5zdGFuY2UsIHBhcmVudFdpbmRvdyk7XG4gICAgICB0aGlzLnN5bmNQYXJlbnRTdGF0ZShpbnN0YW5jZSwgcGFyZW50V2luZG93LCBcImNyZWF0ZWRcIik7XG4gICAgfVxuICAgIHRoaXMubG9nKFwiaW5mb1wiLCBgY3JlYXRlZCBuYXRpdmUgJHtraW5kfSAke2N0eC5pZH06JHtpZH1gLCB7XG4gICAgICBtb2R1bGVJZDogbW9kdWxlSWQgPz8gXCJjb2RleHBwLm5hdGl2ZS1ob3N0XCIsXG4gICAgICBmYWN0b3J5LFxuICAgICAgd2luZG93SWQsXG4gICAgfSk7XG4gICAgcmV0dXJuIGluc3RhbmNlO1xuICB9XG5cbiAgcHJpdmF0ZSBsb2FkTmF0aXZlSG9zdChyZXF1aXJlZDogdHJ1ZSk6IHVua25vd247XG4gIHByaXZhdGUgbG9hZE5hdGl2ZUhvc3QocmVxdWlyZWQ6IGZhbHNlKTogdW5rbm93biB8IG51bGw7XG4gIHByaXZhdGUgbG9hZE5hdGl2ZUhvc3QocmVxdWlyZWQ6IGJvb2xlYW4pOiB1bmtub3duIHwgbnVsbCB7XG4gICAgaWYgKHRoaXMubmF0aXZlSG9zdEV4cG9ydHMpIHJldHVybiB0aGlzLm5hdGl2ZUhvc3RFeHBvcnRzO1xuICAgIGlmICh0aGlzLm5hdGl2ZUhvc3RMb2FkRXJyb3IgJiYgIXJlcXVpcmVkKSByZXR1cm4gbnVsbDtcbiAgICBjb25zdCBuYXRpdmVIb3N0UGF0aCA9IHRoaXMub3B0aW9ucy5uYXRpdmVIb3N0UGF0aDtcbiAgICBpZiAoIW5hdGl2ZUhvc3RQYXRoIHx8ICFleGlzdHNTeW5jKG5hdGl2ZUhvc3RQYXRoKSkge1xuICAgICAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoXCJDb2RleCsrIG5hdGl2ZSBob3N0IGlzIG5vdCBpbnN0YWxsZWRcIik7XG4gICAgICB0aGlzLm5hdGl2ZUhvc3RMb2FkRXJyb3IgPSBlcnJvcjtcbiAgICAgIGlmIChyZXF1aXJlZCkgdGhyb3cgZXJyb3I7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMubmF0aXZlSG9zdEV4cG9ydHMgPSByZXF1aXJlKG5hdGl2ZUhvc3RQYXRoKSBhcyB1bmtub3duO1xuICAgICAgdGhpcy5uYXRpdmVIb3N0TG9hZEVycm9yID0gbnVsbDtcbiAgICAgIHRoaXMubG9nKFwiaW5mb1wiLCBcImxvYWRlZCBDb2RleCsrIG5hdGl2ZSBob3N0XCIsIHsgcGF0aDogbmF0aXZlSG9zdFBhdGggfSk7XG4gICAgICByZXR1cm4gdGhpcy5uYXRpdmVIb3N0RXhwb3J0cztcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5uYXRpdmVIb3N0TG9hZEVycm9yID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yIDogbmV3IEVycm9yKFN0cmluZyhlcnJvcikpO1xuICAgICAgdGhpcy5sb2coXCJlcnJvclwiLCBcImZhaWxlZCB0byBsb2FkIENvZGV4KysgbmF0aXZlIGhvc3RcIiwgdGhpcy5uYXRpdmVIb3N0TG9hZEVycm9yKTtcbiAgICAgIGlmIChyZXF1aXJlZCkgdGhyb3cgdGhpcy5uYXRpdmVIb3N0TG9hZEVycm9yO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZWFkTmF0aXZlSG9zdENhcGFiaWxpdGllcyhob3N0OiB1bmtub3duKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4ge1xuICAgIGNvbnN0IGdldENhcGFiaWxpdGllcyA9IGFzUmVjb3JkKGhvc3QpPy5nZXRDYXBhYmlsaXRpZXM7XG4gICAgaWYgKHR5cGVvZiBnZXRDYXBhYmlsaXRpZXMgIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHt9O1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBjYXBhYmlsaXRpZXMgPSBnZXRDYXBhYmlsaXRpZXMuY2FsbChob3N0KTtcbiAgICAgIHJldHVybiBhc1JlY29yZChjYXBhYmlsaXRpZXMpID8/IHt9O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZyhcIndhcm5cIiwgXCJDb2RleCsrIG5hdGl2ZSBob3N0IGNhcGFiaWxpdHkgcHJvYmUgZmFpbGVkXCIsIGVycm9yKTtcbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGludm9rZUluc3RhbmNlKFxuICAgIHR3ZWFrSWQ6IHN0cmluZyxcbiAgICBpZDogc3RyaW5nLFxuICAgIG1ldGhvZDogc3RyaW5nLFxuICAgIGFyZ3M6IHVua25vd25bXSxcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlRm9yKHR3ZWFrSWQsIGlkKTtcbiAgICBjb25zdCBmbiA9IGFzUmVjb3JkKGluc3RhbmNlLnZhbHVlKT8uW21ldGhvZF07XG4gICAgaWYgKHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBhd2FpdCBmbi5hcHBseShpbnN0YW5jZS52YWx1ZSwgYXJncyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChpbnN0YW5jZS53aW5kb3dJZCAhPT0gbnVsbCkge1xuICAgICAgY29uc3Qgd2luID0gQnJvd3NlcldpbmRvdy5mcm9tSWQoaW5zdGFuY2Uud2luZG93SWQpO1xuICAgICAgaWYgKHdpbiAmJiAhd2luLmlzRGVzdHJveWVkKCkpIHtcbiAgICAgICAgaWYgKG1ldGhvZCA9PT0gXCJzZXRCb3VuZHNcIikgd2luLnNldEJvdW5kcyhhcmdzWzBdIGFzIEVsZWN0cm9uLlJlY3RhbmdsZSk7XG4gICAgICAgIGVsc2UgaWYgKG1ldGhvZCA9PT0gXCJzaG93XCIpIHdpbi5zaG93KCk7XG4gICAgICAgIGVsc2UgaWYgKG1ldGhvZCA9PT0gXCJoaWRlXCIpIHdpbi5oaWRlKCk7XG4gICAgICAgIGVsc2UgaWYgKG1ldGhvZCA9PT0gXCJzZXRWaXNpYmxlXCIpIChhcmdzWzBdID8gd2luLnNob3coKSA6IHdpbi5oaWRlKCkpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgbmF0aXZlICR7aW5zdGFuY2Uua2luZH0gJHt0d2Vha0lkfToke2lkfSBkb2VzIG5vdCBpbXBsZW1lbnQgJHttZXRob2R9KClgKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZGlzcG9zZUluc3RhbmNlQnlJZCh0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBrZXkgPSBpbnN0YW5jZUtleSh0d2Vha0lkLCBpZCk7XG4gICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoa2V5KTtcbiAgICBpZiAoIWluc3RhbmNlKSByZXR1cm47XG4gICAgYXdhaXQgdGhpcy5kaXNwb3NlSW5zdGFuY2UoaW5zdGFuY2UpO1xuICAgIHRoaXMuaW5zdGFuY2VzLmRlbGV0ZShrZXkpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBkaXNwb3NlSW5zdGFuY2UoaW5zdGFuY2U6IE5hdGl2ZUluc3RhbmNlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKGluc3RhbmNlLmRpc3Bvc2luZykgcmV0dXJuO1xuICAgIGluc3RhbmNlLmRpc3Bvc2luZyA9IHRydWU7XG4gICAgZm9yIChjb25zdCBkaXNwb3NlIG9mIGluc3RhbmNlLmRpc3Bvc2VCaW5kaW5ncy5zcGxpY2UoMCkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGRpc3Bvc2UoKTtcbiAgICAgIH0gY2F0Y2gge31cbiAgICB9XG4gICAgYXdhaXQgY2FsbE9wdGlvbmFsKGluc3RhbmNlLnZhbHVlLCBcImRpc3Bvc2VcIiwgW10pO1xuICAgIGlmIChpbnN0YW5jZS53aW5kb3dJZCAhPT0gbnVsbCkge1xuICAgICAgY29uc3Qgd2luID0gQnJvd3NlcldpbmRvdy5mcm9tSWQoaW5zdGFuY2Uud2luZG93SWQpO1xuICAgICAgaWYgKHdpbiAmJiAhd2luLmlzRGVzdHJveWVkKCkpIHdpbi5jbG9zZSgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYmluZEluc3RhbmNlVG9QYXJlbnQoaW5zdGFuY2U6IE5hdGl2ZUluc3RhbmNlLCBwYXJlbnRXaW5kb3c6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cpOiB2b2lkIHtcbiAgICBjb25zdCBvbiA9IChldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCkgPT4ge1xuICAgICAgcGFyZW50V2luZG93Lm9uKGV2ZW50IGFzIG5ldmVyLCBsaXN0ZW5lciBhcyBuZXZlcik7XG4gICAgICBpbnN0YW5jZS5kaXNwb3NlQmluZGluZ3MucHVzaCgoKSA9PiBwYXJlbnRXaW5kb3cub2ZmKGV2ZW50IGFzIG5ldmVyLCBsaXN0ZW5lciBhcyBuZXZlcikpO1xuICAgIH07XG4gICAgY29uc3Qgc3luY0JvdW5kcyA9ICgpID0+IHRoaXMuc3luY1BhcmVudFN0YXRlKGluc3RhbmNlLCBwYXJlbnRXaW5kb3csIFwiYm91bmRzXCIpO1xuICAgIGNvbnN0IHN5bmNGb2N1cyA9IChmb2N1c2VkOiBib29sZWFuKSA9PiB0aGlzLnNpZ25hbFBhcmVudFN0YXRlKGluc3RhbmNlLCBwYXJlbnRXaW5kb3csIFwiZm9jdXNcIiwgeyBmb2N1c2VkIH0pO1xuICAgIGNvbnN0IHN5bmNWaXNpYmlsaXR5ID0gKHZpc2libGU6IGJvb2xlYW4pID0+XG4gICAgICB0aGlzLnNpZ25hbFBhcmVudFN0YXRlKGluc3RhbmNlLCBwYXJlbnRXaW5kb3csIFwidmlzaWJpbGl0eVwiLCB7IHZpc2libGUgfSk7XG4gICAgY29uc3QgZGlzcG9zZVdpdGhQYXJlbnQgPSAoKSA9PiB7XG4gICAgICB0aGlzLmxvZyhcImluZm9cIiwgYGRpc3Bvc2luZyBuYXRpdmUgJHtpbnN0YW5jZS5raW5kfSAke2luc3RhbmNlLnR3ZWFrSWR9OiR7aW5zdGFuY2UuaWR9OyBwYXJlbnQgY2xvc2VkYCk7XG4gICAgICB2b2lkIHRoaXMuZGlzcG9zZUluc3RhbmNlQnlJZChpbnN0YW5jZS50d2Vha0lkLCBpbnN0YW5jZS5pZCk7XG4gICAgfTtcblxuICAgIG9uKFwibW92ZVwiLCBzeW5jQm91bmRzKTtcbiAgICBvbihcInJlc2l6ZVwiLCBzeW5jQm91bmRzKTtcbiAgICBvbihcImVudGVyLWZ1bGwtc2NyZWVuXCIsIHN5bmNCb3VuZHMpO1xuICAgIG9uKFwibGVhdmUtZnVsbC1zY3JlZW5cIiwgc3luY0JvdW5kcyk7XG4gICAgb24oXCJtYXhpbWl6ZVwiLCBzeW5jQm91bmRzKTtcbiAgICBvbihcInVubWF4aW1pemVcIiwgc3luY0JvdW5kcyk7XG4gICAgb24oXCJtaW5pbWl6ZVwiLCBzeW5jQm91bmRzKTtcbiAgICBvbihcInJlc3RvcmVcIiwgc3luY0JvdW5kcyk7XG4gICAgb24oXCJzaG93XCIsICgpID0+IHN5bmNWaXNpYmlsaXR5KHRydWUpKTtcbiAgICBvbihcImhpZGVcIiwgKCkgPT4gc3luY1Zpc2liaWxpdHkoZmFsc2UpKTtcbiAgICBvbihcImZvY3VzXCIsICgpID0+IHN5bmNGb2N1cyh0cnVlKSk7XG4gICAgb24oXCJibHVyXCIsICgpID0+IHN5bmNGb2N1cyhmYWxzZSkpO1xuICAgIG9uKFwiY2xvc2VcIiwgZGlzcG9zZVdpdGhQYXJlbnQpO1xuICAgIG9uKFwiY2xvc2VkXCIsIGRpc3Bvc2VXaXRoUGFyZW50KTtcbiAgfVxuXG4gIHByaXZhdGUgc3luY1BhcmVudFN0YXRlKFxuICAgIGluc3RhbmNlOiBOYXRpdmVJbnN0YW5jZSxcbiAgICBwYXJlbnRXaW5kb3c6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3csXG4gICAgcmVhc29uOiBzdHJpbmcsXG4gICk6IHZvaWQge1xuICAgIGNvbnN0IHN0YXRlID0gcGFyZW50V2luZG93U3RhdGUocGFyZW50V2luZG93LCByZWFzb24pO1xuICAgIGlmICghc3RhdGUpIHJldHVybjtcbiAgICB2b2lkIHRoaXMuY2FsbEZpcnN0T3B0aW9uYWxJbnN0YW5jZShpbnN0YW5jZSwgW1wic3luY1BhcmVudFwiLCBcInBhcmVudENoYW5nZWRcIl0sIFtzdGF0ZV0pXG4gICAgICAudGhlbigoaGFuZGxlZCkgPT4ge1xuICAgICAgICBpZiAoIWhhbmRsZWQpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsRmlyc3RPcHRpb25hbEluc3RhbmNlKFxuICAgICAgICAgICAgaW5zdGFuY2UsXG4gICAgICAgICAgICBbXCJzZXRQYXJlbnRCb3VuZHNcIiwgXCJwYXJlbnRCb3VuZHNDaGFuZ2VkXCJdLFxuICAgICAgICAgICAgW3N0YXRlLmJvdW5kcywgc3RhdGVdLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHRoaXMubG9nKFwid2FyblwiLCBgbmF0aXZlICR7aW5zdGFuY2Uua2luZH0gcGFyZW50IHN5bmMgZmFpbGVkYCwgZXJyb3IpKTtcbiAgfVxuXG4gIHByaXZhdGUgc2lnbmFsUGFyZW50U3RhdGUoXG4gICAgaW5zdGFuY2U6IE5hdGl2ZUluc3RhbmNlLFxuICAgIHBhcmVudFdpbmRvdzogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyxcbiAgICByZWFzb246IHN0cmluZyxcbiAgICBwYXRjaDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gICk6IHZvaWQge1xuICAgIGNvbnN0IHN0YXRlID0gcGFyZW50V2luZG93U3RhdGUocGFyZW50V2luZG93LCByZWFzb24pO1xuICAgIGlmICghc3RhdGUpIHJldHVybjtcbiAgICBjb25zdCBwYXlsb2FkID0geyAuLi5zdGF0ZSwgLi4ucGF0Y2ggfTtcbiAgICB2b2lkIHRoaXMuY2FsbEZpcnN0T3B0aW9uYWxJbnN0YW5jZShpbnN0YW5jZSwgW1wicGFyZW50U3RhdGVDaGFuZ2VkXCIsIFwicGFyZW50Q2hhbmdlZFwiXSwgW3BheWxvYWRdKVxuICAgICAgLmNhdGNoKChlcnJvcikgPT4gdGhpcy5sb2coXCJ3YXJuXCIsIGBuYXRpdmUgJHtpbnN0YW5jZS5raW5kfSBwYXJlbnQgc2lnbmFsIGZhaWxlZGAsIGVycm9yKSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGNhbGxGaXJzdE9wdGlvbmFsSW5zdGFuY2UoXG4gICAgaW5zdGFuY2U6IE5hdGl2ZUluc3RhbmNlLFxuICAgIG1ldGhvZHM6IHN0cmluZ1tdLFxuICAgIGFyZ3M6IHVua25vd25bXSxcbiAgKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gYXNSZWNvcmQoaW5zdGFuY2UudmFsdWUpO1xuICAgIGZvciAoY29uc3QgbWV0aG9kIG9mIG1ldGhvZHMpIHtcbiAgICAgIGNvbnN0IGZuID0gdGFyZ2V0Py5bbWV0aG9kXTtcbiAgICAgIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikgY29udGludWU7XG4gICAgICBhd2FpdCBmbi5hcHBseShpbnN0YW5jZS52YWx1ZSwgYXJncyk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBzZW5kSGVscGVyKHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZywgbWVzc2FnZTogdW5rbm93bik6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGhlbHBlciA9IHRoaXMuaGVscGVyRm9yKHR3ZWFrSWQsIGlkKTtcbiAgICBoZWxwZXIuY2hpbGQuc3RkaW4ud3JpdGUoYCR7SlNPTi5zdHJpbmdpZnkobWVzc2FnZSl9XFxuYCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlcXVlc3RIZWxwZXIoXG4gICAgdHdlYWtJZDogc3RyaW5nLFxuICAgIGlkOiBzdHJpbmcsXG4gICAgbWVzc2FnZTogdW5rbm93bixcbiAgICB0aW1lb3V0TXMgPSAxMF8wMDAsXG4gICk6IFByb21pc2U8dW5rbm93bj4ge1xuICAgIGNvbnN0IGhlbHBlciA9IHRoaXMuaGVscGVyRm9yKHR3ZWFrSWQsIGlkKTtcbiAgICBjb25zdCByZXF1ZXN0SWQgPSByYW5kb21VVUlEKCk7XG4gICAgY29uc3QgcGF5bG9hZCA9IHsgaWQ6IHJlcXVlc3RJZCwgbWVzc2FnZSB9O1xuICAgIHJldHVybiBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBoZWxwZXIucGVuZGluZy5kZWxldGUocmVxdWVzdElkKTtcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgbmF0aXZlIGhlbHBlciByZXF1ZXN0IHRpbWVkIG91dDogJHt0d2Vha0lkfToke2lkfWApKTtcbiAgICAgIH0sIHRpbWVvdXRNcyk7XG4gICAgICBoZWxwZXIucGVuZGluZy5zZXQocmVxdWVzdElkLCB7IHJlc29sdmUsIHJlamVjdCwgdGltZXIgfSk7XG4gICAgICBoZWxwZXIuY2hpbGQuc3RkaW4ud3JpdGUoYCR7SlNPTi5zdHJpbmdpZnkocGF5bG9hZCl9XFxuYCk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHN0b3BIZWxwZXJCeUlkKHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGtleSA9IGhlbHBlcktleSh0d2Vha0lkLCBpZCk7XG4gICAgY29uc3QgaGVscGVyID0gdGhpcy5oZWxwZXJzLmdldChrZXkpO1xuICAgIGlmICghaGVscGVyKSByZXR1cm47XG4gICAgdGhpcy5zdG9wSGVscGVyKGhlbHBlcik7XG4gICAgdGhpcy5oZWxwZXJzLmRlbGV0ZShrZXkpO1xuICB9XG5cbiAgcHJpdmF0ZSBzdG9wSGVscGVyKGhlbHBlcjogTmF0aXZlSGVscGVyUHJvY2Vzcyk6IHZvaWQge1xuICAgIGlmIChoZWxwZXIuY2hpbGQua2lsbGVkKSByZXR1cm47XG4gICAgaGVscGVyLmNoaWxkLmtpbGwoKTtcbiAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgaWYgKCFoZWxwZXIuY2hpbGQua2lsbGVkKSBoZWxwZXIuY2hpbGQua2lsbChcIlNJR0tJTExcIik7XG4gICAgfSwgMTUwMCk7XG4gICAgdGltZXIudW5yZWY/LigpO1xuICB9XG5cbiAgcHJpdmF0ZSBoYW5kbGVIZWxwZXJMaW5lKGhlbHBlcjogTmF0aXZlSGVscGVyUHJvY2VzcywgbGluZTogc3RyaW5nKTogdm9pZCB7XG4gICAgbGV0IHBheWxvYWQ6IHsgaWQ/OiB1bmtub3duOyByZXN1bHQ/OiB1bmtub3duOyBlcnJvcj86IHVua25vd24gfTtcbiAgICB0cnkge1xuICAgICAgcGF5bG9hZCA9IEpTT04ucGFyc2UobGluZSkgYXMgdHlwZW9mIHBheWxvYWQ7XG4gICAgfSBjYXRjaCB7XG4gICAgICB0aGlzLmxvZyhcImluZm9cIiwgYG5hdGl2ZSBoZWxwZXIgJHtoZWxwZXIudHdlYWtJZH06JHtoZWxwZXIuaWR9YCwgbGluZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0eXBlb2YgcGF5bG9hZC5pZCAhPT0gXCJzdHJpbmdcIikgcmV0dXJuO1xuICAgIGNvbnN0IHJlcXVlc3QgPSBoZWxwZXIucGVuZGluZy5nZXQocGF5bG9hZC5pZCk7XG4gICAgaWYgKCFyZXF1ZXN0KSByZXR1cm47XG4gICAgaGVscGVyLnBlbmRpbmcuZGVsZXRlKHBheWxvYWQuaWQpO1xuICAgIGNsZWFyVGltZW91dChyZXF1ZXN0LnRpbWVyKTtcbiAgICBpZiAocGF5bG9hZC5lcnJvcikge1xuICAgICAgcmVxdWVzdC5yZWplY3QobmV3IEVycm9yKFN0cmluZyhwYXlsb2FkLmVycm9yKSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXF1ZXN0LnJlc29sdmUocGF5bG9hZC5yZXN1bHQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgbW9kdWxlRm9yKHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZyk6IExvYWRlZE5hdGl2ZU1vZHVsZSB7XG4gICAgY29uc3QgbW9kID0gdGhpcy5tb2R1bGVzLmdldChtb2R1bGVLZXkodHdlYWtJZCwgaWQpKTtcbiAgICBpZiAoIW1vZCkgdGhyb3cgbmV3IEVycm9yKGBuYXRpdmUgbW9kdWxlIGlzIG5vdCBsb2FkZWQ6ICR7dHdlYWtJZH06JHtpZH1gKTtcbiAgICByZXR1cm4gbW9kO1xuICB9XG5cbiAgcHJpdmF0ZSBpbnN0YW5jZUZvcih0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiBOYXRpdmVJbnN0YW5jZSB7XG4gICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoaW5zdGFuY2VLZXkodHdlYWtJZCwgaWQpKTtcbiAgICBpZiAoIWluc3RhbmNlKSB0aHJvdyBuZXcgRXJyb3IoYG5hdGl2ZSBpbnN0YW5jZSBpcyBub3QgbG9hZGVkOiAke3R3ZWFrSWR9OiR7aWR9YCk7XG4gICAgcmV0dXJuIGluc3RhbmNlO1xuICB9XG5cbiAgcHJpdmF0ZSBoZWxwZXJGb3IodHdlYWtJZDogc3RyaW5nLCBpZDogc3RyaW5nKTogTmF0aXZlSGVscGVyUHJvY2VzcyB7XG4gICAgY29uc3QgaGVscGVyID0gdGhpcy5oZWxwZXJzLmdldChoZWxwZXJLZXkodHdlYWtJZCwgaWQpKTtcbiAgICBpZiAoIWhlbHBlcikgdGhyb3cgbmV3IEVycm9yKGBuYXRpdmUgaGVscGVyIGlzIG5vdCBydW5uaW5nOiAke3R3ZWFrSWR9OiR7aWR9YCk7XG4gICAgcmV0dXJuIGhlbHBlcjtcbiAgfVxufVxuXG5mdW5jdGlvbiByZXNvbHZlVHdlYWtQYXRoKGN0eDogTmF0aXZlVHdlYWtDb250ZXh0LCBwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcmVzb2x2ZU5hdGl2ZVR3ZWFrUGF0aChjdHguZGlyLCBwYXRoKTtcbn1cblxuZnVuY3Rpb24gaW5mZXJNb2R1bGVLaW5kKHBhdGg6IHN0cmluZyk6IE5hdGl2ZU1vZHVsZUtpbmQge1xuICBpZiAocGF0aC5lbmRzV2l0aChcIi5ub2RlXCIpKSByZXR1cm4gXCJub2RlLWFkZG9uXCI7XG4gIGlmIChwYXRoLmVuZHNXaXRoKFwiLmR5bGliXCIpKSByZXR1cm4gXCJkeWxpYlwiO1xuICBpZiAocGF0aC5lbmRzV2l0aChcIi5mcmFtZXdvcmtcIikpIHJldHVybiBcImZyYW1ld29ya1wiO1xuICB0aHJvdyBuZXcgRXJyb3IoXCJuYXRpdmUgbW9kdWxlIHBhdGggbXVzdCBlbmQgaW4gLm5vZGUsIC5keWxpYiwgb3IgLmZyYW1ld29ya1wiKTtcbn1cblxuZnVuY3Rpb24gc2VsZWN0RW50cnlwb2ludChsb2FkZWQ6IHVua25vd24sIGVudHJ5cG9pbnQ6IHN0cmluZyB8IHVuZGVmaW5lZCk6IHVua25vd24ge1xuICBpZiAoIWVudHJ5cG9pbnQpIHJldHVybiBhc1JlY29yZChsb2FkZWQpPy5kZWZhdWx0ID8/IGxvYWRlZDtcbiAgY29uc3Qgc2VsZWN0ZWQgPSBhc1JlY29yZChsb2FkZWQpPy5bZW50cnlwb2ludF07XG4gIGlmIChzZWxlY3RlZCA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoYG5hdGl2ZSBtb2R1bGUgZW50cnlwb2ludCBub3QgZm91bmQ6ICR7ZW50cnlwb2ludH1gKTtcbiAgcmV0dXJuIHNlbGVjdGVkO1xufVxuXG5mdW5jdGlvbiBhc3NlcnRCcmlkZ2VJZCh2YWx1ZTogc3RyaW5nLCBsYWJlbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIiB8fCAhL15bYS16QS1aMC05Ll8tXSskLy50ZXN0KHZhbHVlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgJHtsYWJlbH0gbWF5IG9ubHkgY29udGFpbiBsZXR0ZXJzLCBudW1iZXJzLCBkb3RzLCB1bmRlcnNjb3JlcywgYW5kIGRhc2hlc2ApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gbW9kdWxlS2V5KHR3ZWFrSWQ6IHN0cmluZywgbW9kdWxlSWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgJHt0d2Vha0lkfToke21vZHVsZUlkfWA7XG59XG5cbmZ1bmN0aW9uIGluc3RhbmNlS2V5KHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgJHt0d2Vha0lkfToke2lkfWA7XG59XG5cbmZ1bmN0aW9uIGhlbHBlcktleSh0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7dHdlYWtJZH06JHtpZH1gO1xufVxuXG5mdW5jdGlvbiBhc1JlY29yZCh2YWx1ZTogdW5rbm93bik6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbCB7XG4gIHJldHVybiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgPyB2YWx1ZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA6IG51bGw7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNhbGxPcHRpb25hbCh0YXJnZXQ6IHVua25vd24sIG1ldGhvZDogc3RyaW5nLCBhcmdzOiB1bmtub3duW10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgZm4gPSBhc1JlY29yZCh0YXJnZXQpPy5bbWV0aG9kXTtcbiAgaWYgKHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiKSBhd2FpdCBmbi5hcHBseSh0YXJnZXQsIGFyZ3MpO1xufVxuXG5mdW5jdGlvbiBwYXJlbnRXaW5kb3dTdGF0ZShwYXJlbnRXaW5kb3c6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3csIHJlYXNvbjogc3RyaW5nKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsIHtcbiAgaWYgKGlzV2luZG93RGVzdHJveWVkKHBhcmVudFdpbmRvdykpIHJldHVybiBudWxsO1xuICBjb25zdCBib3VuZHMgPSBjYWxsV2luZG93TWV0aG9kPEVsZWN0cm9uLlJlY3RhbmdsZT4ocGFyZW50V2luZG93LCBcImdldEJvdW5kc1wiKTtcbiAgY29uc3QgY29udGVudEJvdW5kcyA9IGNhbGxXaW5kb3dNZXRob2Q8RWxlY3Ryb24uUmVjdGFuZ2xlPihwYXJlbnRXaW5kb3csIFwiZ2V0Q29udGVudEJvdW5kc1wiKTtcbiAgcmV0dXJuIHtcbiAgICByZWFzb24sXG4gICAgd2luZG93SWQ6IHdpbmRvd0lkRm9yKHBhcmVudFdpbmRvdyksXG4gICAgd2ViQ29udGVudHNJZDogd2ViQ29udGVudHNJZEZvcihwYXJlbnRXaW5kb3cpLFxuICAgIGJvdW5kcyxcbiAgICBjb250ZW50Qm91bmRzLFxuICAgIHZpc2libGU6IGNhbGxXaW5kb3dNZXRob2Q8Ym9vbGVhbj4ocGFyZW50V2luZG93LCBcImlzVmlzaWJsZVwiKSA/PyBudWxsLFxuICAgIGZvY3VzZWQ6IGNhbGxXaW5kb3dNZXRob2Q8Ym9vbGVhbj4ocGFyZW50V2luZG93LCBcImlzRm9jdXNlZFwiKSA/PyBudWxsLFxuICAgIG1pbmltaXplZDogY2FsbFdpbmRvd01ldGhvZDxib29sZWFuPihwYXJlbnRXaW5kb3csIFwiaXNNaW5pbWl6ZWRcIikgPz8gbnVsbCxcbiAgICBtYXhpbWl6ZWQ6IGNhbGxXaW5kb3dNZXRob2Q8Ym9vbGVhbj4ocGFyZW50V2luZG93LCBcImlzTWF4aW1pemVkXCIpID8/IG51bGwsXG4gICAgZnVsbHNjcmVlbjogY2FsbFdpbmRvd01ldGhvZDxib29sZWFuPihwYXJlbnRXaW5kb3csIFwiaXNGdWxsU2NyZWVuXCIpID8/IG51bGwsXG4gIH07XG59XG5cbmZ1bmN0aW9uIG5hdGl2ZUhhbmRsZUZvcldpbmRvdyhwYXJlbnRXaW5kb3c6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsIHwgdW5kZWZpbmVkKTogQnVmZmVyIHwgbnVsbCB7XG4gIGlmICghcGFyZW50V2luZG93IHx8IGlzV2luZG93RGVzdHJveWVkKHBhcmVudFdpbmRvdykpIHJldHVybiBudWxsO1xuICBjb25zdCBmbiA9IGFzUmVjb3JkKHBhcmVudFdpbmRvdyk/LmdldE5hdGl2ZVdpbmRvd0hhbmRsZTtcbiAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm4gbnVsbDtcbiAgdHJ5IHtcbiAgICBjb25zdCBoYW5kbGUgPSBmbi5jYWxsKHBhcmVudFdpbmRvdyk7XG4gICAgcmV0dXJuIEJ1ZmZlci5pc0J1ZmZlcihoYW5kbGUpID8gaGFuZGxlIDogbnVsbDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gY2FuQmluZFBhcmVudFdpbmRvdyhcbiAgcGFyZW50V2luZG93OiBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbCB8IHVuZGVmaW5lZCxcbik6IHBhcmVudFdpbmRvdyBpcyBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHtcbiAgaWYgKCFwYXJlbnRXaW5kb3cgfHwgaXNXaW5kb3dEZXN0cm95ZWQocGFyZW50V2luZG93KSkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gdHlwZW9mIGFzUmVjb3JkKHBhcmVudFdpbmRvdyk/Lm9uID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICB0eXBlb2YgYXNSZWNvcmQocGFyZW50V2luZG93KT8ub2ZmID09PSBcImZ1bmN0aW9uXCI7XG59XG5cbmZ1bmN0aW9uIGlzV2luZG93RGVzdHJveWVkKHBhcmVudFdpbmRvdzogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGwgfCB1bmRlZmluZWQpOiBib29sZWFuIHtcbiAgY29uc3QgZm4gPSBhc1JlY29yZChwYXJlbnRXaW5kb3cpPy5pc0Rlc3Ryb3llZDtcbiAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm4gZmFsc2U7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEJvb2xlYW4oZm4uY2FsbChwYXJlbnRXaW5kb3cpKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cblxuZnVuY3Rpb24gd2luZG93SWRGb3IocGFyZW50V2luZG93OiBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbCB8IHVuZGVmaW5lZCk6IG51bWJlciB8IG51bGwge1xuICBjb25zdCBpZCA9IGFzUmVjb3JkKHBhcmVudFdpbmRvdyk/LmlkO1xuICByZXR1cm4gdHlwZW9mIGlkID09PSBcIm51bWJlclwiID8gaWQgOiBudWxsO1xufVxuXG5mdW5jdGlvbiB3ZWJDb250ZW50c0lkRm9yKHBhcmVudFdpbmRvdzogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGwgfCB1bmRlZmluZWQpOiBudW1iZXIgfCBudWxsIHtcbiAgY29uc3Qgd2ViQ29udGVudHMgPSBhc1JlY29yZChhc1JlY29yZChwYXJlbnRXaW5kb3cpPy53ZWJDb250ZW50cyk7XG4gIGNvbnN0IGlkID0gd2ViQ29udGVudHM/LmlkO1xuICByZXR1cm4gdHlwZW9mIGlkID09PSBcIm51bWJlclwiID8gaWQgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBjYWxsV2luZG93TWV0aG9kPFQ+KHBhcmVudFdpbmRvdzogRWxlY3Ryb24uQnJvd3NlcldpbmRvdywgbWV0aG9kOiBzdHJpbmcpOiBUIHwgbnVsbCB7XG4gIGNvbnN0IGZuID0gYXNSZWNvcmQocGFyZW50V2luZG93KT8uW21ldGhvZF07XG4gIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIG51bGw7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGZuLmNhbGwocGFyZW50V2luZG93KSBhcyBUO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQVVBLElBQUFBLG1CQUF3RDtBQUN4RCxJQUFBQyxtQkFBc0M7QUFDdEMsSUFBQUMscUJBQThCOzs7QUNYOUIsSUFBQUMsYUFBK0I7QUFDL0IsSUFBQUMsbUJBQThCO0FB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b0JBQUksSUFBSTtBQUFBLEVBQzdCO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU07QUFBQSxFQUFLO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFZO0FBQUEsRUFBVztBQUFBLEVBQVM7QUFBQSxFQUNyRjtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBWTtBQUFBLEVBQU07QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU07QUFBQSxFQUMxRTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBTTtBQUFBLEVBQU87QUFBQSxFQUFNO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFDeEQ7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFTO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUN2RjtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQVk7QUFBQSxFQUFPO0FBQUEsRUFDckY7QUFBQSxFQUFTO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUN2QjtBQUFBLEVBQWE7QUFBQSxFQUFhO0FBQUEsRUFBYTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUNwRTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBVztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUMxRTtBQUFBLEVBQU07QUFBQSxFQUFNO0FBQUEsRUFBTztBQUFBLEVBQVc7QUFBQSxFQUFNO0FBQUEsRUFDcEM7QUFBQSxFQUFRO0FBQUEsRUFBUTtBQUFBLEVBQVE7QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQzVEO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQ25EO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFDMUM7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUNyRjtBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBUztBQUFBLEVBQ3hCO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUN0QztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBVztBQUFBLEVBQ3pCO0FBQUEsRUFBSztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUN0RDtBQUFBLEVBQVM7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDL0U7QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQ2Y7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQ2pGO0FBQUEsRUFDQTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQWE7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDcEY7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBVTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQ25GO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDckI7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQ2hGO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDMUM7QUFBQSxFQUFPO0FBQUEsRUFDUDtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQVE7QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFNO0FBQUEsRUFDaEY7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFTO0FBQUEsRUFBTztBQUFBLEVBQ3RDO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBUTtBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQVE7QUFBQSxFQUNuRjtBQUFBLEVBQVM7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUM5QjtBQUFBLEVBQUs7QUFBQSxFQUFPO0FBQ2hCLENBQUM7QUFDRCxJQUFNLGVBQWUsQ0FBQyxhQUFhLGlCQUFpQixJQUFZLGdCQUFRLFFBQVEsRUFBRSxNQUFNLENBQUMsRUFBRSxZQUFZLENBQUM7QUFFeEcsSUFBTSxVQUFVLENBQUMsS0FBSyxPQUFPO0FBQ3pCLE1BQUksZUFBZSxLQUFLO0FBQ3BCLFFBQUksUUFBUSxFQUFFO0FBQUEsRUFDbEIsT0FDSztBQUNELE9BQUcsR0FBRztBQUFBLEVBQ1Y7QUFDSjtBQUNBLElBQU0sZ0JBQWdCLENBQUMsTUFBTSxNQUFNLFNBQVM7QUFDeEMsTUFBSSxZQUFZLEtBQUssSUFBSTtBQUN6QixNQUFJLEVBQUUscUJBQXFCLE1BQU07QUFDN0IsU0FBSyxJQUFJLElBQUksWUFBWSxvQkFBSSxJQUFJLENBQUMsU0FBUyxDQUFDO0FBQUEsRUFDaEQ7QUFDQSxZQUFVLElBQUksSUFBSTtBQUN0QjtBQUNBLElBQU0sWUFBWSxDQUFDLFNBQVMsQ0FBQyxRQUFRO0FBQ2pDLFFBQU0sTUFBTSxLQUFLLEdBQUc7QUFDcEIsTUFBSSxlQUFlLEtBQUs7QUFDcEIsUUFBSSxNQUFNO0FBQUEsRUFDZCxPQUNLO0FBQ0QsV0FBTyxLQUFLLEdBQUc7QUFBQSxFQUNuQjtBQUNKO0FBQ0EsSUFBTSxhQUFhLENBQUMsTUFBTSxNQUFNLFNBQVM7QUFDckMsUUFBTSxZQUFZLEtBQUssSUFBSTtBQUMzQixNQUFJLHFCQUFxQixLQUFLO0FBQzFCLGNBQVUsT0FBTyxJQUFJO0FBQUEsRUFDekIsV0FDUyxjQUFjLE1BQU07QUFDekIsV0FBTyxLQUFLLElBQUk7QUFBQSxFQUNwQjtBQUNKO0FBQ0EsSUFBTSxhQUFhLENBQUMsUUFBUyxlQUFlLE1BQU0sSUFBSSxTQUFTLElBQUksQ0FBQztBQUNwRSxJQUFNLG1CQUFtQixvQkFBSSxJQUFJO0FBVWpDLFNBQVMsc0JBQXNCLE1BQU0sU0FBUyxVQUFVLFlBQVksU0FBUztBQUN6RSxRQUFNLGNBQWMsQ0FBQyxVQUFVLFdBQVc7QUFDdEMsYUFBUyxJQUFJO0FBQ2IsWUFBUSxVQUFVLFFBQVEsRUFBRSxhQUFhLEtBQUssQ0FBQztBQUcvQyxRQUFJLFVBQVUsU0FBUyxRQUFRO0FBQzNCLHVCQUF5QixnQkFBUSxNQUFNLE1BQU0sR0FBRyxlQUF1QixhQUFLLE1BQU0sTUFBTSxDQUFDO0FBQUEsSUFDN0Y7QUFBQSxFQUNKO0FBQ0EsTUFBSTtBQUNBLGVBQU8sVUFBQUMsT0FBUyxNQUFNO0FBQUEsTUFDbEIsWUFBWSxRQUFRO0FBQUEsSUFDeEIsR0FBRyxXQUFXO0FBQUEsRUFDbEIsU0FDTyxPQUFPO0FBQ1YsZUFBVyxLQUFLO0FBQ2hCLFdBQU87QUFBQSxFQUNYO0FBQ0o7QUFLQSxJQUFNLG1CQUFtQixDQUFDLFVBQVUsY0FBYyxNQUFNLE1BQU0sU0FBUztBQUNuRSxRQUFNLE9BQU8saUJBQWlCLElBQUksUUFBUTtBQUMxQyxNQUFJLENBQUM7QUFDRDtBQUNKLFVBQVEsS0FBSyxZQUFZLEdBQUcsQ0FBQyxhQUFhO0FBQ3RDLGFBQVMsTUFBTSxNQUFNLElBQUk7QUFBQSxFQUM3QixDQUFDO0FBQ0w7QUFTQSxJQUFNLHFCQUFxQixDQUFDLE1BQU0sVUFBVSxTQUFTLGFBQWE7QUFDOUQsUUFBTSxFQUFFLFVBQVUsWUFBWSxXQUFXLElBQUk7QUFDN0MsTUFBSSxPQUFPLGlCQUFpQixJQUFJLFFBQVE7QUFDeEMsTUFBSTtBQUNKLE1BQUksQ0FBQyxRQUFRLFlBQVk7QUFDckIsY0FBVSxzQkFBc0IsTUFBTSxTQUFTLFVBQVUsWUFBWSxVQUFVO0FBQy9FLFFBQUksQ0FBQztBQUNEO0FBQ0osV0FBTyxRQUFRLE1BQU0sS0FBSyxPQUFPO0FBQUEsRUFDckM7QUFDQSxNQUFJLE1BQU07QUFDTixrQkFBYyxNQUFNLGVBQWUsUUFBUTtBQUMzQyxrQkFBYyxNQUFNLFNBQVMsVUFBVTtBQUN2QyxrQkFBYyxNQUFNLFNBQVMsVUFBVTtBQUFBLEVBQzNDLE9BQ0s7QUFDRCxjQUFVO0FBQUEsTUFBc0I7QUFBQSxNQUFNO0FBQUEsTUFBUyxpQkFBaUIsS0FBSyxNQUFNLFVBQVUsYUFBYTtBQUFBLE1BQUc7QUFBQTtBQUFBLE1BQ3JHLGlCQUFpQixLQUFLLE1BQU0sVUFBVSxPQUFPO0FBQUEsSUFBQztBQUM5QyxRQUFJLENBQUM7QUFDRDtBQUNKLFlBQVEsR0FBRyxHQUFHLE9BQU8sT0FBTyxVQUFVO0FBQ2xDLFlBQU0sZUFBZSxpQkFBaUIsS0FBSyxNQUFNLFVBQVUsT0FBTztBQUNsRSxVQUFJO0FBQ0EsYUFBSyxrQkFBa0I7QUFFM0IsVUFBSSxhQUFhLE1BQU0sU0FBUyxTQUFTO0FBQ3JDLFlBQUk7QUFDQSxnQkFBTSxLQUFLLFVBQU0sdUJBQUssTUFBTSxHQUFHO0FBQy9CLGdCQUFNLEdBQUcsTUFBTTtBQUNmLHVCQUFhLEtBQUs7QUFBQSxRQUN0QixTQUNPLEtBQUs7QUFBQSxRQUVaO0FBQUEsTUFDSixPQUNLO0FBQ0QscUJBQWEsS0FBSztBQUFBLE1BQ3RCO0FBQUEsSUFDSixDQUFDO0FBQ0QsV0FBTztBQUFBLE1BQ0gsV0FBVztBQUFBLE1BQ1gsYUFBYTtBQUFBLE1BQ2IsYUFBYTtBQUFBLE1BQ2I7QUFBQSxJQUNKO0FBQ0EscUJBQWlCLElBQUksVUFBVSxJQUFJO0FBQUEsRUFDdkM7QUFJQSxTQUFPLE1BQU07QUFDVCxlQUFXLE1BQU0sZUFBZSxRQUFRO0FBQ3hDLGVBQVcsTUFBTSxTQUFTLFVBQVU7QUFDcEMsZUFBVyxNQUFNLFNBQVMsVUFBVTtBQUNwQyxRQUFJLFdBQVcsS0FBSyxTQUFTLEdBQUc7QUFHNUIsV0FBSyxRQUFRLE1BQU07QUFFbkIsdUJBQWlCLE9BQU8sUUFBUTtBQUNoQyxtQkFBYSxRQUFRLFVBQVUsSUFBSSxDQUFDO0FBRXBDLFdBQUssVUFBVTtBQUNmLGFBQU8sT0FBTyxJQUFJO0FBQUEsSUFDdEI7QUFBQSxFQUNKO0FBQ0o7QUFJQSxJQUFNLHVCQUF1QixvQkFBSSxJQUFJO0FBVXJDLElBQU0seUJBQXlCLENBQUMsTUFBTSxVQUFVLFNBQVMsYUFBYTtBQUNsRSxRQUFNLEVBQUUsVUFBVSxXQUFXLElBQUk7QUFDakMsTUFBSSxPQUFPLHFCQUFxQixJQUFJLFFBQVE7QUFHNUMsUUFBTSxRQUFRLFFBQVEsS0FBSztBQUMzQixNQUFJLFVBQVUsTUFBTSxhQUFhLFFBQVEsY0FBYyxNQUFNLFdBQVcsUUFBUSxXQUFXO0FBT3ZGLCtCQUFZLFFBQVE7QUFDcEIsV0FBTztBQUFBLEVBQ1g7QUFDQSxNQUFJLE1BQU07QUFDTixrQkFBYyxNQUFNLGVBQWUsUUFBUTtBQUMzQyxrQkFBYyxNQUFNLFNBQVMsVUFBVTtBQUFBLEVBQzNDLE9BQ0s7QUFJRCxXQUFPO0FBQUEsTUFDSCxXQUFXO0FBQUEsTUFDWCxhQUFhO0FBQUEsTUFDYjtBQUFBLE1BQ0EsYUFBUyxxQkFBVSxVQUFVLFNBQVMsQ0FBQyxNQUFNLFNBQVM7QUFDbEQsZ0JBQVEsS0FBSyxhQUFhLENBQUNDLGdCQUFlO0FBQ3RDLFVBQUFBLFlBQVcsR0FBRyxRQUFRLFVBQVUsRUFBRSxNQUFNLEtBQUssQ0FBQztBQUFBLFFBQ2xELENBQUM7QUFDRCxjQUFNLFlBQVksS0FBSztBQUN2QixZQUFJLEtBQUssU0FBUyxLQUFLLFFBQVEsWUFBWSxLQUFLLFdBQVcsY0FBYyxHQUFHO0FBQ3hFLGtCQUFRLEtBQUssV0FBVyxDQUFDQyxjQUFhQSxVQUFTLE1BQU0sSUFBSSxDQUFDO0FBQUEsUUFDOUQ7QUFBQSxNQUNKLENBQUM7QUFBQSxJQUNMO0FBQ0EseUJBQXFCLElBQUksVUFBVSxJQUFJO0FBQUEsRUFDM0M7QUFJQSxTQUFPLE1BQU07QUFDVCxlQUFXLE1BQU0sZUFBZSxRQUFRO0FBQ3hDLGVBQVcsTUFBTSxTQUFTLFVBQVU7QUFDcEMsUUFBSSxXQUFXLEtBQUssU0FBUyxHQUFHO0FBQzVCLDJCQUFxQixPQUFPLFFBQVE7QUFDcEMsaUNBQVksUUFBUTtBQUNwQixXQUFLLFVBQVUsS0FBSyxVQUFVO0FBQzlCLGFBQU8sT0FBTyxJQUFJO0FBQUEsSUFDdEI7QUFBQSxFQUNKO0FBQ0o7QUFJTyxJQUFNLGdCQUFOLE1BQW9CO0FBQUEsRUFDdkIsWUFBWSxLQUFLO0FBQ2IsU0FBSyxNQUFNO0FBQ1gsU0FBSyxvQkFBb0IsQ0FBQyxVQUFVLElBQUksYUFBYSxLQUFLO0FBQUEsRUFDOUQ7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU9BLGlCQUFpQixNQUFNLFVBQVU7QUFDN0IsVUFBTSxPQUFPLEtBQUssSUFBSTtBQUN0QixVQUFNLFlBQW9CLGdCQUFRLElBQUk7QUFDdEMsVUFBTUMsWUFBbUIsaUJBQVMsSUFBSTtBQUN0QyxVQUFNLFNBQVMsS0FBSyxJQUFJLGVBQWUsU0FBUztBQUNoRCxXQUFPLElBQUlBLFNBQVE7QUFDbkIsVUFBTSxlQUF1QixnQkFBUSxJQUFJO0FBQ3pDLFVBQU0sVUFBVTtBQUFBLE1BQ1osWUFBWSxLQUFLO0FBQUEsSUFDckI7QUFDQSxRQUFJLENBQUM7QUFDRCxpQkFBVztBQUNmLFFBQUk7QUFDSixRQUFJLEtBQUssWUFBWTtBQUNqQixZQUFNLFlBQVksS0FBSyxhQUFhLEtBQUs7QUFDekMsY0FBUSxXQUFXLGFBQWEsYUFBYUEsU0FBUSxJQUFJLEtBQUssaUJBQWlCLEtBQUs7QUFDcEYsZUFBUyx1QkFBdUIsTUFBTSxjQUFjLFNBQVM7QUFBQSxRQUN6RDtBQUFBLFFBQ0EsWUFBWSxLQUFLLElBQUk7QUFBQSxNQUN6QixDQUFDO0FBQUEsSUFDTCxPQUNLO0FBQ0QsZUFBUyxtQkFBbUIsTUFBTSxjQUFjLFNBQVM7QUFBQSxRQUNyRDtBQUFBLFFBQ0EsWUFBWSxLQUFLO0FBQUEsUUFDakIsWUFBWSxLQUFLLElBQUk7QUFBQSxNQUN6QixDQUFDO0FBQUEsSUFDTDtBQUNBLFdBQU87QUFBQSxFQUNYO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUtBLFlBQVksTUFBTSxPQUFPLFlBQVk7QUFDakMsUUFBSSxLQUFLLElBQUksUUFBUTtBQUNqQjtBQUFBLElBQ0o7QUFDQSxVQUFNQyxXQUFrQixnQkFBUSxJQUFJO0FBQ3BDLFVBQU1ELFlBQW1CLGlCQUFTLElBQUk7QUFDdEMsVUFBTSxTQUFTLEtBQUssSUFBSSxlQUFlQyxRQUFPO0FBRTlDLFFBQUksWUFBWTtBQUVoQixRQUFJLE9BQU8sSUFBSUQsU0FBUTtBQUNuQjtBQUNKLFVBQU0sV0FBVyxPQUFPLE1BQU0sYUFBYTtBQUN2QyxVQUFJLENBQUMsS0FBSyxJQUFJLFVBQVUscUJBQXFCLE1BQU0sQ0FBQztBQUNoRDtBQUNKLFVBQUksQ0FBQyxZQUFZLFNBQVMsWUFBWSxHQUFHO0FBQ3JDLFlBQUk7QUFDQSxnQkFBTUUsWUFBVyxVQUFNLHVCQUFLLElBQUk7QUFDaEMsY0FBSSxLQUFLLElBQUk7QUFDVDtBQUVKLGdCQUFNLEtBQUtBLFVBQVM7QUFDcEIsZ0JBQU0sS0FBS0EsVUFBUztBQUNwQixjQUFJLENBQUMsTUFBTSxNQUFNLE1BQU0sT0FBTyxVQUFVLFNBQVM7QUFDN0MsaUJBQUssSUFBSSxNQUFNLEdBQUcsUUFBUSxNQUFNQSxTQUFRO0FBQUEsVUFDNUM7QUFDQSxlQUFLLFdBQVcsV0FBVyxjQUFjLFVBQVUsUUFBUUEsVUFBUyxLQUFLO0FBQ3JFLGlCQUFLLElBQUksV0FBVyxJQUFJO0FBQ3hCLHdCQUFZQTtBQUNaLGtCQUFNQyxVQUFTLEtBQUssaUJBQWlCLE1BQU0sUUFBUTtBQUNuRCxnQkFBSUE7QUFDQSxtQkFBSyxJQUFJLGVBQWUsTUFBTUEsT0FBTTtBQUFBLFVBQzVDLE9BQ0s7QUFDRCx3QkFBWUQ7QUFBQSxVQUNoQjtBQUFBLFFBQ0osU0FDTyxPQUFPO0FBRVYsZUFBSyxJQUFJLFFBQVFELFVBQVNELFNBQVE7QUFBQSxRQUN0QztBQUFBLE1BRUosV0FDUyxPQUFPLElBQUlBLFNBQVEsR0FBRztBQUUzQixjQUFNLEtBQUssU0FBUztBQUNwQixjQUFNLEtBQUssU0FBUztBQUNwQixZQUFJLENBQUMsTUFBTSxNQUFNLE1BQU0sT0FBTyxVQUFVLFNBQVM7QUFDN0MsZUFBSyxJQUFJLE1BQU0sR0FBRyxRQUFRLE1BQU0sUUFBUTtBQUFBLFFBQzVDO0FBQ0Esb0JBQVk7QUFBQSxNQUNoQjtBQUFBLElBQ0o7QUFFQSxVQUFNLFNBQVMsS0FBSyxpQkFBaUIsTUFBTSxRQUFRO0FBRW5ELFFBQUksRUFBRSxjQUFjLEtBQUssSUFBSSxRQUFRLGtCQUFrQixLQUFLLElBQUksYUFBYSxJQUFJLEdBQUc7QUFDaEYsVUFBSSxDQUFDLEtBQUssSUFBSSxVQUFVLEdBQUcsS0FBSyxNQUFNLENBQUM7QUFDbkM7QUFDSixXQUFLLElBQUksTUFBTSxHQUFHLEtBQUssTUFBTSxLQUFLO0FBQUEsSUFDdEM7QUFDQSxXQUFPO0FBQUEsRUFDWDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVNBLE1BQU0sZUFBZSxPQUFPLFdBQVcsTUFBTSxNQUFNO0FBQy9DLFFBQUksS0FBSyxJQUFJLFFBQVE7QUFDakI7QUFBQSxJQUNKO0FBQ0EsVUFBTSxPQUFPLE1BQU07QUFDbkIsVUFBTSxNQUFNLEtBQUssSUFBSSxlQUFlLFNBQVM7QUFDN0MsUUFBSSxDQUFDLEtBQUssSUFBSSxRQUFRLGdCQUFnQjtBQUVsQyxXQUFLLElBQUksZ0JBQWdCO0FBQ3pCLFVBQUk7QUFDSixVQUFJO0FBQ0EsbUJBQVcsVUFBTSxpQkFBQUksVUFBVyxJQUFJO0FBQUEsTUFDcEMsU0FDTyxHQUFHO0FBQ04sYUFBSyxJQUFJLFdBQVc7QUFDcEIsZUFBTztBQUFBLE1BQ1g7QUFDQSxVQUFJLEtBQUssSUFBSTtBQUNUO0FBQ0osVUFBSSxJQUFJLElBQUksSUFBSSxHQUFHO0FBQ2YsWUFBSSxLQUFLLElBQUksY0FBYyxJQUFJLElBQUksTUFBTSxVQUFVO0FBQy9DLGVBQUssSUFBSSxjQUFjLElBQUksTUFBTSxRQUFRO0FBQ3pDLGVBQUssSUFBSSxNQUFNLEdBQUcsUUFBUSxNQUFNLE1BQU0sS0FBSztBQUFBLFFBQy9DO0FBQUEsTUFDSixPQUNLO0FBQ0QsWUFBSSxJQUFJLElBQUk7QUFDWixhQUFLLElBQUksY0FBYyxJQUFJLE1BQU0sUUFBUTtBQUN6QyxhQUFLLElBQUksTUFBTSxHQUFHLEtBQUssTUFBTSxNQUFNLEtBQUs7QUFBQSxNQUM1QztBQUNBLFdBQUssSUFBSSxXQUFXO0FBQ3BCLGFBQU87QUFBQSxJQUNYO0FBRUEsUUFBSSxLQUFLLElBQUksY0FBYyxJQUFJLElBQUksR0FBRztBQUNsQyxhQUFPO0FBQUEsSUFDWDtBQUNBLFNBQUssSUFBSSxjQUFjLElBQUksTUFBTSxJQUFJO0FBQUEsRUFDekM7QUFBQSxFQUNBLFlBQVksV0FBVyxZQUFZLElBQUksUUFBUSxLQUFLLE9BQU8sV0FBVztBQUVsRSxnQkFBb0IsYUFBSyxXQUFXLEVBQUU7QUFDdEMsZ0JBQVksS0FBSyxJQUFJLFVBQVUsV0FBVyxXQUFXLEdBQUk7QUFDekQsUUFBSSxDQUFDO0FBQ0Q7QUFDSixVQUFNLFdBQVcsS0FBSyxJQUFJLGVBQWUsR0FBRyxJQUFJO0FBQ2hELFVBQU0sVUFBVSxvQkFBSSxJQUFJO0FBQ3hCLFFBQUksU0FBUyxLQUFLLElBQUksVUFBVSxXQUFXO0FBQUEsTUFDdkMsWUFBWSxDQUFDLFVBQVUsR0FBRyxXQUFXLEtBQUs7QUFBQSxNQUMxQyxpQkFBaUIsQ0FBQyxVQUFVLEdBQUcsVUFBVSxLQUFLO0FBQUEsSUFDbEQsQ0FBQztBQUNELFFBQUksQ0FBQztBQUNEO0FBQ0osV0FDSyxHQUFHLFVBQVUsT0FBTyxVQUFVO0FBQy9CLFVBQUksS0FBSyxJQUFJLFFBQVE7QUFDakIsaUJBQVM7QUFDVDtBQUFBLE1BQ0o7QUFDQSxZQUFNLE9BQU8sTUFBTTtBQUNuQixVQUFJLE9BQWUsYUFBSyxXQUFXLElBQUk7QUFDdkMsY0FBUSxJQUFJLElBQUk7QUFDaEIsVUFBSSxNQUFNLE1BQU0sZUFBZSxLQUMxQixNQUFNLEtBQUssZUFBZSxPQUFPLFdBQVcsTUFBTSxJQUFJLEdBQUk7QUFDM0Q7QUFBQSxNQUNKO0FBQ0EsVUFBSSxLQUFLLElBQUksUUFBUTtBQUNqQixpQkFBUztBQUNUO0FBQUEsTUFDSjtBQUlBLFVBQUksU0FBUyxVQUFXLENBQUMsVUFBVSxDQUFDLFNBQVMsSUFBSSxJQUFJLEdBQUk7QUFDckQsYUFBSyxJQUFJLGdCQUFnQjtBQUV6QixlQUFlLGFBQUssS0FBYSxpQkFBUyxLQUFLLElBQUksQ0FBQztBQUNwRCxhQUFLLGFBQWEsTUFBTSxZQUFZLElBQUksUUFBUSxDQUFDO0FBQUEsTUFDckQ7QUFBQSxJQUNKLENBQUMsRUFDSSxHQUFHLEdBQUcsT0FBTyxLQUFLLGlCQUFpQjtBQUN4QyxXQUFPLElBQUksUUFBUSxDQUFDQyxVQUFTLFdBQVc7QUFDcEMsVUFBSSxDQUFDO0FBQ0QsZUFBTyxPQUFPO0FBQ2xCLGFBQU8sS0FBSyxTQUFTLE1BQU07QUFDdkIsWUFBSSxLQUFLLElBQUksUUFBUTtBQUNqQixtQkFBUztBQUNUO0FBQUEsUUFDSjtBQUNBLGNBQU0sZUFBZSxZQUFZLFVBQVUsTUFBTSxJQUFJO0FBQ3JELFFBQUFBLFNBQVEsTUFBUztBQUlqQixpQkFDSyxZQUFZLEVBQ1osT0FBTyxDQUFDLFNBQVM7QUFDbEIsaUJBQU8sU0FBUyxhQUFhLENBQUMsUUFBUSxJQUFJLElBQUk7QUFBQSxRQUNsRCxDQUFDLEVBQ0ksUUFBUSxDQUFDLFNBQVM7QUFDbkIsZUFBSyxJQUFJLFFBQVEsV0FBVyxJQUFJO0FBQUEsUUFDcEMsQ0FBQztBQUNELGlCQUFTO0FBRVQsWUFBSTtBQUNBLGVBQUssWUFBWSxXQUFXLE9BQU8sSUFBSSxRQUFRLEtBQUssT0FBTyxTQUFTO0FBQUEsTUFDNUUsQ0FBQztBQUFBLElBQ0wsQ0FBQztBQUFBLEVBQ0w7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFZQSxNQUFNLFdBQVcsS0FBSyxPQUFPLFlBQVksT0FBTyxRQUFRLElBQUlDLFdBQVU7QUFDbEUsVUFBTSxZQUFZLEtBQUssSUFBSSxlQUF1QixnQkFBUSxHQUFHLENBQUM7QUFDOUQsVUFBTSxVQUFVLFVBQVUsSUFBWSxpQkFBUyxHQUFHLENBQUM7QUFDbkQsUUFBSSxFQUFFLGNBQWMsS0FBSyxJQUFJLFFBQVEsa0JBQWtCLENBQUMsVUFBVSxDQUFDLFNBQVM7QUFDeEUsV0FBSyxJQUFJLE1BQU0sR0FBRyxTQUFTLEtBQUssS0FBSztBQUFBLElBQ3pDO0FBRUEsY0FBVSxJQUFZLGlCQUFTLEdBQUcsQ0FBQztBQUNuQyxTQUFLLElBQUksZUFBZSxHQUFHO0FBQzNCLFFBQUk7QUFDSixRQUFJO0FBQ0osVUFBTSxTQUFTLEtBQUssSUFBSSxRQUFRO0FBQ2hDLFNBQUssVUFBVSxRQUFRLFNBQVMsV0FBVyxDQUFDLEtBQUssSUFBSSxjQUFjLElBQUlBLFNBQVEsR0FBRztBQUM5RSxVQUFJLENBQUMsUUFBUTtBQUNULGNBQU0sS0FBSyxZQUFZLEtBQUssWUFBWSxJQUFJLFFBQVEsS0FBSyxPQUFPLFNBQVM7QUFDekUsWUFBSSxLQUFLLElBQUk7QUFDVDtBQUFBLE1BQ1I7QUFDQSxlQUFTLEtBQUssaUJBQWlCLEtBQUssQ0FBQyxTQUFTQyxXQUFVO0FBRXBELFlBQUlBLFVBQVNBLE9BQU0sWUFBWTtBQUMzQjtBQUNKLGFBQUssWUFBWSxTQUFTLE9BQU8sSUFBSSxRQUFRLEtBQUssT0FBTyxTQUFTO0FBQUEsTUFDdEUsQ0FBQztBQUFBLElBQ0w7QUFDQSxXQUFPO0FBQUEsRUFDWDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBVUEsTUFBTSxhQUFhLE1BQU0sWUFBWSxTQUFTLE9BQU8sUUFBUTtBQUN6RCxVQUFNLFFBQVEsS0FBSyxJQUFJO0FBQ3ZCLFFBQUksS0FBSyxJQUFJLFdBQVcsSUFBSSxLQUFLLEtBQUssSUFBSSxRQUFRO0FBQzlDLFlBQU07QUFDTixhQUFPO0FBQUEsSUFDWDtBQUNBLFVBQU0sS0FBSyxLQUFLLElBQUksaUJBQWlCLElBQUk7QUFDekMsUUFBSSxTQUFTO0FBQ1QsU0FBRyxhQUFhLENBQUMsVUFBVSxRQUFRLFdBQVcsS0FBSztBQUNuRCxTQUFHLFlBQVksQ0FBQyxVQUFVLFFBQVEsVUFBVSxLQUFLO0FBQUEsSUFDckQ7QUFFQSxRQUFJO0FBQ0EsWUFBTSxRQUFRLE1BQU0sWUFBWSxHQUFHLFVBQVUsRUFBRSxHQUFHLFNBQVM7QUFDM0QsVUFBSSxLQUFLLElBQUk7QUFDVDtBQUNKLFVBQUksS0FBSyxJQUFJLFdBQVcsR0FBRyxXQUFXLEtBQUssR0FBRztBQUMxQyxjQUFNO0FBQ04sZUFBTztBQUFBLE1BQ1g7QUFDQSxZQUFNLFNBQVMsS0FBSyxJQUFJLFFBQVE7QUFDaEMsVUFBSTtBQUNKLFVBQUksTUFBTSxZQUFZLEdBQUc7QUFDckIsY0FBTSxVQUFrQixnQkFBUSxJQUFJO0FBQ3BDLGNBQU0sYUFBYSxTQUFTLFVBQU0saUJBQUFILFVBQVcsSUFBSSxJQUFJO0FBQ3JELFlBQUksS0FBSyxJQUFJO0FBQ1Q7QUFDSixpQkFBUyxNQUFNLEtBQUssV0FBVyxHQUFHLFdBQVcsT0FBTyxZQUFZLE9BQU8sUUFBUSxJQUFJLFVBQVU7QUFDN0YsWUFBSSxLQUFLLElBQUk7QUFDVDtBQUVKLFlBQUksWUFBWSxjQUFjLGVBQWUsUUFBVztBQUNwRCxlQUFLLElBQUksY0FBYyxJQUFJLFNBQVMsVUFBVTtBQUFBLFFBQ2xEO0FBQUEsTUFDSixXQUNTLE1BQU0sZUFBZSxHQUFHO0FBQzdCLGNBQU0sYUFBYSxTQUFTLFVBQU0saUJBQUFBLFVBQVcsSUFBSSxJQUFJO0FBQ3JELFlBQUksS0FBSyxJQUFJO0FBQ1Q7QUFDSixjQUFNLFNBQWlCLGdCQUFRLEdBQUcsU0FBUztBQUMzQyxhQUFLLElBQUksZUFBZSxNQUFNLEVBQUUsSUFBSSxHQUFHLFNBQVM7QUFDaEQsYUFBSyxJQUFJLE1BQU0sR0FBRyxLQUFLLEdBQUcsV0FBVyxLQUFLO0FBQzFDLGlCQUFTLE1BQU0sS0FBSyxXQUFXLFFBQVEsT0FBTyxZQUFZLE9BQU8sTUFBTSxJQUFJLFVBQVU7QUFDckYsWUFBSSxLQUFLLElBQUk7QUFDVDtBQUVKLFlBQUksZUFBZSxRQUFXO0FBQzFCLGVBQUssSUFBSSxjQUFjLElBQVksZ0JBQVEsSUFBSSxHQUFHLFVBQVU7QUFBQSxRQUNoRTtBQUFBLE1BQ0osT0FDSztBQUNELGlCQUFTLEtBQUssWUFBWSxHQUFHLFdBQVcsT0FBTyxVQUFVO0FBQUEsTUFDN0Q7QUFDQSxZQUFNO0FBQ04sVUFBSTtBQUNBLGFBQUssSUFBSSxlQUFlLE1BQU0sTUFBTTtBQUN4QyxhQUFPO0FBQUEsSUFDWCxTQUNPLE9BQU87QUFDVixVQUFJLEtBQUssSUFBSSxhQUFhLEtBQUssR0FBRztBQUM5QixjQUFNO0FBQ04sZUFBTztBQUFBLE1BQ1g7QUFBQSxJQUNKO0FBQUEsRUFDSjtBQUNKOzs7QUY3bUJBLElBQU0sUUFBUTtBQUNkLElBQU0sY0FBYztBQUNwQixJQUFNLFVBQVU7QUFDaEIsSUFBTSxXQUFXO0FBQ2pCLElBQU0sY0FBYztBQUNwQixJQUFNLGdCQUFnQjtBQUN0QixJQUFNLGtCQUFrQjtBQUN4QixJQUFNLFNBQVM7QUFDZixJQUFNLGNBQWM7QUFDcEIsU0FBUyxPQUFPLE1BQU07QUFDbEIsU0FBTyxNQUFNLFFBQVEsSUFBSSxJQUFJLE9BQU8sQ0FBQyxJQUFJO0FBQzdDO0FBQ0EsSUFBTSxrQkFBa0IsQ0FBQyxZQUFZLE9BQU8sWUFBWSxZQUFZLFlBQVksUUFBUSxFQUFFLG1CQUFtQjtBQUM3RyxTQUFTLGNBQWMsU0FBUztBQUM1QixNQUFJLE9BQU8sWUFBWTtBQUNuQixXQUFPO0FBQ1gsTUFBSSxPQUFPLFlBQVk7QUFDbkIsV0FBTyxDQUFDLFdBQVcsWUFBWTtBQUNuQyxNQUFJLG1CQUFtQjtBQUNuQixXQUFPLENBQUMsV0FBVyxRQUFRLEtBQUssTUFBTTtBQUMxQyxNQUFJLE9BQU8sWUFBWSxZQUFZLFlBQVksTUFBTTtBQUNqRCxXQUFPLENBQUMsV0FBVztBQUNmLFVBQUksUUFBUSxTQUFTO0FBQ2pCLGVBQU87QUFDWCxVQUFJLFFBQVEsV0FBVztBQUNuQixjQUFNSSxZQUFtQixrQkFBUyxRQUFRLE1BQU0sTUFBTTtBQUN0RCxZQUFJLENBQUNBLFdBQVU7QUFDWCxpQkFBTztBQUFBLFFBQ1g7QUFDQSxlQUFPLENBQUNBLFVBQVMsV0FBVyxJQUFJLEtBQUssQ0FBUyxvQkFBV0EsU0FBUTtBQUFBLE1BQ3JFO0FBQ0EsYUFBTztBQUFBLElBQ1g7QUFBQSxFQUNKO0FBQ0EsU0FBTyxNQUFNO0FBQ2pCO0FBQ0EsU0FBUyxjQUFjLE1BQU07QUFDekIsTUFBSSxPQUFPLFNBQVM7QUFDaEIsVUFBTSxJQUFJLE1BQU0saUJBQWlCO0FBQ3JDLFNBQWUsbUJBQVUsSUFBSTtBQUM3QixTQUFPLEtBQUssUUFBUSxPQUFPLEdBQUc7QUFDOUIsTUFBSSxVQUFVO0FBQ2QsTUFBSSxLQUFLLFdBQVcsSUFBSTtBQUNwQixjQUFVO0FBQ2QsUUFBTUMsbUJBQWtCO0FBQ3hCLFNBQU8sS0FBSyxNQUFNQSxnQkFBZTtBQUM3QixXQUFPLEtBQUssUUFBUUEsa0JBQWlCLEdBQUc7QUFDNUMsTUFBSTtBQUNBLFdBQU8sTUFBTTtBQUNqQixTQUFPO0FBQ1g7QUFDQSxTQUFTLGNBQWMsVUFBVSxZQUFZLE9BQU87QUFDaEQsUUFBTSxPQUFPLGNBQWMsVUFBVTtBQUNyQyxXQUFTLFFBQVEsR0FBRyxRQUFRLFNBQVMsUUFBUSxTQUFTO0FBQ2xELFVBQU0sVUFBVSxTQUFTLEtBQUs7QUFDOUIsUUFBSSxRQUFRLE1BQU0sS0FBSyxHQUFHO0FBQ3RCLGFBQU87QUFBQSxJQUNYO0FBQUEsRUFDSjtBQUNBLFNBQU87QUFDWDtBQUNBLFNBQVMsU0FBUyxVQUFVLFlBQVk7QUFDcEMsTUFBSSxZQUFZLE1BQU07QUFDbEIsVUFBTSxJQUFJLFVBQVUsa0NBQWtDO0FBQUEsRUFDMUQ7QUFFQSxRQUFNLGdCQUFnQixPQUFPLFFBQVE7QUFDckMsUUFBTSxXQUFXLGNBQWMsSUFBSSxDQUFDLFlBQVksY0FBYyxPQUFPLENBQUM7QUFDdEUsTUFBSSxjQUFjLE1BQU07QUFDcEIsV0FBTyxDQUFDQyxhQUFZLFVBQVU7QUFDMUIsYUFBTyxjQUFjLFVBQVVBLGFBQVksS0FBSztBQUFBLElBQ3BEO0FBQUEsRUFDSjtBQUNBLFNBQU8sY0FBYyxVQUFVLFVBQVU7QUFDN0M7QUFDQSxJQUFNLGFBQWEsQ0FBQyxXQUFXO0FBQzNCLFFBQU0sUUFBUSxPQUFPLE1BQU0sRUFBRSxLQUFLO0FBQ2xDLE1BQUksQ0FBQyxNQUFNLE1BQU0sQ0FBQyxNQUFNLE9BQU8sTUFBTSxXQUFXLEdBQUc7QUFDL0MsVUFBTSxJQUFJLFVBQVUsc0NBQXNDLEtBQUssRUFBRTtBQUFBLEVBQ3JFO0FBQ0EsU0FBTyxNQUFNLElBQUksbUJBQW1CO0FBQ3hDO0FBR0EsSUFBTSxTQUFTLENBQUMsV0FBVztBQUN2QixNQUFJLE1BQU0sT0FBTyxRQUFRLGVBQWUsS0FBSztBQUM3QyxNQUFJLFVBQVU7QUFDZCxNQUFJLElBQUksV0FBVyxXQUFXLEdBQUc7QUFDN0IsY0FBVTtBQUFBLEVBQ2Q7QUFDQSxTQUFPLElBQUksTUFBTSxlQUFlLEdBQUc7QUFDL0IsVUFBTSxJQUFJLFFBQVEsaUJBQWlCLEtBQUs7QUFBQSxFQUM1QztBQUNBLE1BQUksU0FBUztBQUNULFVBQU0sUUFBUTtBQUFBLEVBQ2xCO0FBQ0EsU0FBTztBQUNYO0FBR0EsSUFBTSxzQkFBc0IsQ0FBQyxTQUFTLE9BQWUsbUJBQVUsT0FBTyxJQUFJLENBQUMsQ0FBQztBQUU1RSxJQUFNLG1CQUFtQixDQUFDLE1BQU0sT0FBTyxDQUFDLFNBQVM7QUFDN0MsTUFBSSxPQUFPLFNBQVMsVUFBVTtBQUMxQixXQUFPLG9CQUE0QixvQkFBVyxJQUFJLElBQUksT0FBZSxjQUFLLEtBQUssSUFBSSxDQUFDO0FBQUEsRUFDeEYsT0FDSztBQUNELFdBQU87QUFBQSxFQUNYO0FBQ0o7QUFDQSxJQUFNLGtCQUFrQixDQUFDLE1BQU0sUUFBUTtBQUNuQyxNQUFZLG9CQUFXLElBQUksR0FBRztBQUMxQixXQUFPO0FBQUEsRUFDWDtBQUNBLFNBQWUsY0FBSyxLQUFLLElBQUk7QUFDakM7QUFDQSxJQUFNLFlBQVksT0FBTyxPQUFPLG9CQUFJLElBQUksQ0FBQztBQUl6QyxJQUFNLFdBQU4sTUFBZTtBQUFBLEVBQ1gsWUFBWSxLQUFLLGVBQWU7QUFDNUIsU0FBSyxPQUFPO0FBQ1osU0FBSyxpQkFBaUI7QUFDdEIsU0FBSyxRQUFRLG9CQUFJLElBQUk7QUFBQSxFQUN6QjtBQUFBLEVBQ0EsSUFBSSxNQUFNO0FBQ04sVUFBTSxFQUFFLE1BQU0sSUFBSTtBQUNsQixRQUFJLENBQUM7QUFDRDtBQUNKLFFBQUksU0FBUyxXQUFXLFNBQVM7QUFDN0IsWUFBTSxJQUFJLElBQUk7QUFBQSxFQUN0QjtBQUFBLEVBQ0EsTUFBTSxPQUFPLE1BQU07QUFDZixVQUFNLEVBQUUsTUFBTSxJQUFJO0FBQ2xCLFFBQUksQ0FBQztBQUNEO0FBQ0osVUFBTSxPQUFPLElBQUk7QUFDakIsUUFBSSxNQUFNLE9BQU87QUFDYjtBQUNKLFVBQU0sTUFBTSxLQUFLO0FBQ2pCLFFBQUk7QUFDQSxnQkFBTSwwQkFBUSxHQUFHO0FBQUEsSUFDckIsU0FDTyxLQUFLO0FBQ1IsVUFBSSxLQUFLLGdCQUFnQjtBQUNyQixhQUFLLGVBQXVCLGlCQUFRLEdBQUcsR0FBVyxrQkFBUyxHQUFHLENBQUM7QUFBQSxNQUNuRTtBQUFBLElBQ0o7QUFBQSxFQUNKO0FBQUEsRUFDQSxJQUFJLE1BQU07QUFDTixVQUFNLEVBQUUsTUFBTSxJQUFJO0FBQ2xCLFFBQUksQ0FBQztBQUNEO0FBQ0osV0FBTyxNQUFNLElBQUksSUFBSTtBQUFBLEVBQ3pCO0FBQUEsRUFDQSxjQUFjO0FBQ1YsVUFBTSxFQUFFLE1BQU0sSUFBSTtBQUNsQixRQUFJLENBQUM7QUFDRCxhQUFPLENBQUM7QUFDWixXQUFPLENBQUMsR0FBRyxNQUFNLE9BQU8sQ0FBQztBQUFBLEVBQzdCO0FBQUEsRUFDQSxVQUFVO0FBQ04sU0FBSyxNQUFNLE1BQU07QUFDakIsU0FBSyxPQUFPO0FBQ1osU0FBSyxpQkFBaUI7QUFDdEIsU0FBSyxRQUFRO0FBQ2IsV0FBTyxPQUFPLElBQUk7QUFBQSxFQUN0QjtBQUNKO0FBQ0EsSUFBTSxnQkFBZ0I7QUFDdEIsSUFBTSxnQkFBZ0I7QUFDZixJQUFNLGNBQU4sTUFBa0I7QUFBQSxFQUNyQixZQUFZLE1BQU0sUUFBUSxLQUFLO0FBQzNCLFNBQUssTUFBTTtBQUNYLFVBQU0sWUFBWTtBQUNsQixTQUFLLE9BQU8sT0FBTyxLQUFLLFFBQVEsYUFBYSxFQUFFO0FBQy9DLFNBQUssWUFBWTtBQUNqQixTQUFLLGdCQUF3QixpQkFBUSxTQUFTO0FBQzlDLFNBQUssV0FBVyxDQUFDO0FBQ2pCLFNBQUssU0FBUyxRQUFRLENBQUMsVUFBVTtBQUM3QixVQUFJLE1BQU0sU0FBUztBQUNmLGNBQU0sSUFBSTtBQUFBLElBQ2xCLENBQUM7QUFDRCxTQUFLLGlCQUFpQjtBQUN0QixTQUFLLGFBQWEsU0FBUyxnQkFBZ0I7QUFBQSxFQUMvQztBQUFBLEVBQ0EsVUFBVSxPQUFPO0FBQ2IsV0FBZSxjQUFLLEtBQUssV0FBbUIsa0JBQVMsS0FBSyxXQUFXLE1BQU0sUUFBUSxDQUFDO0FBQUEsRUFDeEY7QUFBQSxFQUNBLFdBQVcsT0FBTztBQUNkLFVBQU0sRUFBRSxNQUFNLElBQUk7QUFDbEIsUUFBSSxTQUFTLE1BQU0sZUFBZTtBQUM5QixhQUFPLEtBQUssVUFBVSxLQUFLO0FBQy9CLFVBQU0sZUFBZSxLQUFLLFVBQVUsS0FBSztBQUV6QyxXQUFPLEtBQUssSUFBSSxhQUFhLGNBQWMsS0FBSyxLQUFLLEtBQUssSUFBSSxvQkFBb0IsS0FBSztBQUFBLEVBQzNGO0FBQUEsRUFDQSxVQUFVLE9BQU87QUFDYixXQUFPLEtBQUssSUFBSSxhQUFhLEtBQUssVUFBVSxLQUFLLEdBQUcsTUFBTSxLQUFLO0FBQUEsRUFDbkU7QUFDSjtBQVNPLElBQU0sWUFBTixjQUF3QiwyQkFBYTtBQUFBO0FBQUEsRUFFeEMsWUFBWSxRQUFRLENBQUMsR0FBRztBQUNwQixVQUFNO0FBQ04sU0FBSyxTQUFTO0FBQ2QsU0FBSyxXQUFXLG9CQUFJLElBQUk7QUFDeEIsU0FBSyxnQkFBZ0Isb0JBQUksSUFBSTtBQUM3QixTQUFLLGFBQWEsb0JBQUksSUFBSTtBQUMxQixTQUFLLFdBQVcsb0JBQUksSUFBSTtBQUN4QixTQUFLLGdCQUFnQixvQkFBSSxJQUFJO0FBQzdCLFNBQUssV0FBVyxvQkFBSSxJQUFJO0FBQ3hCLFNBQUssaUJBQWlCLG9CQUFJLElBQUk7QUFDOUIsU0FBSyxrQkFBa0Isb0JBQUksSUFBSTtBQUMvQixTQUFLLGNBQWM7QUFDbkIsU0FBSyxnQkFBZ0I7QUFDckIsVUFBTSxNQUFNLE1BQU07QUFDbEIsVUFBTSxVQUFVLEVBQUUsb0JBQW9CLEtBQU0sY0FBYyxJQUFJO0FBQzlELFVBQU0sT0FBTztBQUFBO0FBQUEsTUFFVCxZQUFZO0FBQUEsTUFDWixlQUFlO0FBQUEsTUFDZix3QkFBd0I7QUFBQSxNQUN4QixVQUFVO0FBQUEsTUFDVixnQkFBZ0I7QUFBQSxNQUNoQixnQkFBZ0I7QUFBQSxNQUNoQixZQUFZO0FBQUE7QUFBQSxNQUVaLFFBQVE7QUFBQTtBQUFBLE1BQ1IsR0FBRztBQUFBO0FBQUEsTUFFSCxTQUFTLE1BQU0sVUFBVSxPQUFPLE1BQU0sT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDO0FBQUEsTUFDMUQsa0JBQWtCLFFBQVEsT0FBTyxVQUFVLE9BQU8sUUFBUSxXQUFXLEVBQUUsR0FBRyxTQUFTLEdBQUcsSUFBSSxJQUFJO0FBQUEsSUFDbEc7QUFFQSxRQUFJO0FBQ0EsV0FBSyxhQUFhO0FBRXRCLFFBQUksS0FBSyxXQUFXO0FBQ2hCLFdBQUssU0FBUyxDQUFDLEtBQUs7QUFJeEIsVUFBTSxVQUFVLFFBQVEsSUFBSTtBQUM1QixRQUFJLFlBQVksUUFBVztBQUN2QixZQUFNLFdBQVcsUUFBUSxZQUFZO0FBQ3JDLFVBQUksYUFBYSxXQUFXLGFBQWE7QUFDckMsYUFBSyxhQUFhO0FBQUEsZUFDYixhQUFhLFVBQVUsYUFBYTtBQUN6QyxhQUFLLGFBQWE7QUFBQTtBQUVsQixhQUFLLGFBQWEsQ0FBQyxDQUFDO0FBQUEsSUFDNUI7QUFDQSxVQUFNLGNBQWMsUUFBUSxJQUFJO0FBQ2hDLFFBQUk7QUFDQSxXQUFLLFdBQVcsT0FBTyxTQUFTLGFBQWEsRUFBRTtBQUVuRCxRQUFJLGFBQWE7QUFDakIsU0FBSyxhQUFhLE1BQU07QUFDcEI7QUFDQSxVQUFJLGNBQWMsS0FBSyxhQUFhO0FBQ2hDLGFBQUssYUFBYTtBQUNsQixhQUFLLGdCQUFnQjtBQUVyQixnQkFBUSxTQUFTLE1BQU0sS0FBSyxLQUFLLE9BQUcsS0FBSyxDQUFDO0FBQUEsTUFDOUM7QUFBQSxJQUNKO0FBQ0EsU0FBSyxXQUFXLElBQUksU0FBUyxLQUFLLEtBQUssT0FBRyxLQUFLLEdBQUcsSUFBSTtBQUN0RCxTQUFLLGVBQWUsS0FBSyxRQUFRLEtBQUssSUFBSTtBQUMxQyxTQUFLLFVBQVU7QUFDZixTQUFLLGlCQUFpQixJQUFJLGNBQWMsSUFBSTtBQUU1QyxXQUFPLE9BQU8sSUFBSTtBQUFBLEVBQ3RCO0FBQUEsRUFDQSxnQkFBZ0IsU0FBUztBQUNyQixRQUFJLGdCQUFnQixPQUFPLEdBQUc7QUFFMUIsaUJBQVcsV0FBVyxLQUFLLGVBQWU7QUFDdEMsWUFBSSxnQkFBZ0IsT0FBTyxLQUN2QixRQUFRLFNBQVMsUUFBUSxRQUN6QixRQUFRLGNBQWMsUUFBUSxXQUFXO0FBQ3pDO0FBQUEsUUFDSjtBQUFBLE1BQ0o7QUFBQSxJQUNKO0FBQ0EsU0FBSyxjQUFjLElBQUksT0FBTztBQUFBLEVBQ2xDO0FBQUEsRUFDQSxtQkFBbUIsU0FBUztBQUN4QixTQUFLLGNBQWMsT0FBTyxPQUFPO0FBRWpDLFFBQUksT0FBTyxZQUFZLFVBQVU7QUFDN0IsaUJBQVcsV0FBVyxLQUFLLGVBQWU7QUFJdEMsWUFBSSxnQkFBZ0IsT0FBTyxLQUFLLFFBQVEsU0FBUyxTQUFTO0FBQ3RELGVBQUssY0FBYyxPQUFPLE9BQU87QUFBQSxRQUNyQztBQUFBLE1BQ0o7QUFBQSxJQUNKO0FBQUEsRUFDSjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1BLElBQUksUUFBUSxVQUFVLFdBQVc7QUFDN0IsVUFBTSxFQUFFLElBQUksSUFBSSxLQUFLO0FBQ3JCLFNBQUssU0FBUztBQUNkLFNBQUssZ0JBQWdCO0FBQ3JCLFFBQUksUUFBUSxXQUFXLE1BQU07QUFDN0IsUUFBSSxLQUFLO0FBQ0wsY0FBUSxNQUFNLElBQUksQ0FBQyxTQUFTO0FBQ3hCLGNBQU0sVUFBVSxnQkFBZ0IsTUFBTSxHQUFHO0FBRXpDLGVBQU87QUFBQSxNQUNYLENBQUM7QUFBQSxJQUNMO0FBQ0EsVUFBTSxRQUFRLENBQUMsU0FBUztBQUNwQixXQUFLLG1CQUFtQixJQUFJO0FBQUEsSUFDaEMsQ0FBQztBQUNELFNBQUssZUFBZTtBQUNwQixRQUFJLENBQUMsS0FBSztBQUNOLFdBQUssY0FBYztBQUN2QixTQUFLLGVBQWUsTUFBTTtBQUMxQixZQUFRLElBQUksTUFBTSxJQUFJLE9BQU8sU0FBUztBQUNsQyxZQUFNLE1BQU0sTUFBTSxLQUFLLGVBQWUsYUFBYSxNQUFNLENBQUMsV0FBVyxRQUFXLEdBQUcsUUFBUTtBQUMzRixVQUFJO0FBQ0EsYUFBSyxXQUFXO0FBQ3BCLGFBQU87QUFBQSxJQUNYLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxZQUFZO0FBQ2xCLFVBQUksS0FBSztBQUNMO0FBQ0osY0FBUSxRQUFRLENBQUMsU0FBUztBQUN0QixZQUFJO0FBQ0EsZUFBSyxJQUFZLGlCQUFRLElBQUksR0FBVyxrQkFBUyxZQUFZLElBQUksQ0FBQztBQUFBLE1BQzFFLENBQUM7QUFBQSxJQUNMLENBQUM7QUFDRCxXQUFPO0FBQUEsRUFDWDtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBSUEsUUFBUSxRQUFRO0FBQ1osUUFBSSxLQUFLO0FBQ0wsYUFBTztBQUNYLFVBQU0sUUFBUSxXQUFXLE1BQU07QUFDL0IsVUFBTSxFQUFFLElBQUksSUFBSSxLQUFLO0FBQ3JCLFVBQU0sUUFBUSxDQUFDLFNBQVM7QUFFcEIsVUFBSSxDQUFTLG9CQUFXLElBQUksS0FBSyxDQUFDLEtBQUssU0FBUyxJQUFJLElBQUksR0FBRztBQUN2RCxZQUFJO0FBQ0EsaUJBQWUsY0FBSyxLQUFLLElBQUk7QUFDakMsZUFBZSxpQkFBUSxJQUFJO0FBQUEsTUFDL0I7QUFDQSxXQUFLLFdBQVcsSUFBSTtBQUNwQixXQUFLLGdCQUFnQixJQUFJO0FBQ3pCLFVBQUksS0FBSyxTQUFTLElBQUksSUFBSSxHQUFHO0FBQ3pCLGFBQUssZ0JBQWdCO0FBQUEsVUFDakI7QUFBQSxVQUNBLFdBQVc7QUFBQSxRQUNmLENBQUM7QUFBQSxNQUNMO0FBR0EsV0FBSyxlQUFlO0FBQUEsSUFDeEIsQ0FBQztBQUNELFdBQU87QUFBQSxFQUNYO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFJQSxRQUFRO0FBQ0osUUFBSSxLQUFLLGVBQWU7QUFDcEIsYUFBTyxLQUFLO0FBQUEsSUFDaEI7QUFDQSxTQUFLLFNBQVM7QUFFZCxTQUFLLG1CQUFtQjtBQUN4QixVQUFNLFVBQVUsQ0FBQztBQUNqQixTQUFLLFNBQVMsUUFBUSxDQUFDLGVBQWUsV0FBVyxRQUFRLENBQUMsV0FBVztBQUNqRSxZQUFNLFVBQVUsT0FBTztBQUN2QixVQUFJLG1CQUFtQjtBQUNuQixnQkFBUSxLQUFLLE9BQU87QUFBQSxJQUM1QixDQUFDLENBQUM7QUFDRixTQUFLLFNBQVMsUUFBUSxDQUFDLFdBQVcsT0FBTyxRQUFRLENBQUM7QUFDbEQsU0FBSyxlQUFlO0FBQ3BCLFNBQUssY0FBYztBQUNuQixTQUFLLGdCQUFnQjtBQUNyQixTQUFLLFNBQVMsUUFBUSxDQUFDLFdBQVcsT0FBTyxRQUFRLENBQUM7QUFDbEQsU0FBSyxTQUFTLE1BQU07QUFDcEIsU0FBSyxTQUFTLE1BQU07QUFDcEIsU0FBSyxTQUFTLE1BQU07QUFDcEIsU0FBSyxjQUFjLE1BQU07QUFDekIsU0FBSyxXQUFXLE1BQU07QUFDdEIsU0FBSyxnQkFBZ0IsUUFBUSxTQUN2QixRQUFRLElBQUksT0FBTyxFQUFFLEtBQUssTUFBTSxNQUFTLElBQ3pDLFFBQVEsUUFBUTtBQUN0QixXQUFPLEtBQUs7QUFBQSxFQUNoQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFLQSxhQUFhO0FBQ1QsVUFBTSxZQUFZLENBQUM7QUFDbkIsU0FBSyxTQUFTLFFBQVEsQ0FBQyxPQUFPLFFBQVE7QUFDbEMsWUFBTSxNQUFNLEtBQUssUUFBUSxNQUFjLGtCQUFTLEtBQUssUUFBUSxLQUFLLEdBQUcsSUFBSTtBQUN6RSxZQUFNLFFBQVEsT0FBTztBQUNyQixnQkFBVSxLQUFLLElBQUksTUFBTSxZQUFZLEVBQUUsS0FBSztBQUFBLElBQ2hELENBQUM7QUFDRCxXQUFPO0FBQUEsRUFDWDtBQUFBLEVBQ0EsWUFBWSxPQUFPLE1BQU07QUFDckIsU0FBSyxLQUFLLE9BQU8sR0FBRyxJQUFJO0FBQ3hCLFFBQUksVUFBVSxPQUFHO0FBQ2IsV0FBSyxLQUFLLE9BQUcsS0FBSyxPQUFPLEdBQUcsSUFBSTtBQUFBLEVBQ3hDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVdBLE1BQU0sTUFBTSxPQUFPLE1BQU0sT0FBTztBQUM1QixRQUFJLEtBQUs7QUFDTDtBQUNKLFVBQU0sT0FBTyxLQUFLO0FBQ2xCLFFBQUk7QUFDQSxhQUFlLG1CQUFVLElBQUk7QUFDakMsUUFBSSxLQUFLO0FBQ0wsYUFBZSxrQkFBUyxLQUFLLEtBQUssSUFBSTtBQUMxQyxVQUFNLE9BQU8sQ0FBQyxJQUFJO0FBQ2xCLFFBQUksU0FBUztBQUNULFdBQUssS0FBSyxLQUFLO0FBQ25CLFVBQU0sTUFBTSxLQUFLO0FBQ2pCLFFBQUk7QUFDSixRQUFJLFFBQVEsS0FBSyxLQUFLLGVBQWUsSUFBSSxJQUFJLElBQUk7QUFDN0MsU0FBRyxhQUFhLG9CQUFJLEtBQUs7QUFDekIsYUFBTztBQUFBLElBQ1g7QUFDQSxRQUFJLEtBQUssUUFBUTtBQUNiLFVBQUksVUFBVSxPQUFHLFFBQVE7QUFDckIsYUFBSyxnQkFBZ0IsSUFBSSxNQUFNLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztBQUMvQyxtQkFBVyxNQUFNO0FBQ2IsZUFBSyxnQkFBZ0IsUUFBUSxDQUFDLE9BQU9DLFVBQVM7QUFDMUMsaUJBQUssS0FBSyxHQUFHLEtBQUs7QUFDbEIsaUJBQUssS0FBSyxPQUFHLEtBQUssR0FBRyxLQUFLO0FBQzFCLGlCQUFLLGdCQUFnQixPQUFPQSxLQUFJO0FBQUEsVUFDcEMsQ0FBQztBQUFBLFFBQ0wsR0FBRyxPQUFPLEtBQUssV0FBVyxXQUFXLEtBQUssU0FBUyxHQUFHO0FBQ3RELGVBQU87QUFBQSxNQUNYO0FBQ0EsVUFBSSxVQUFVLE9BQUcsT0FBTyxLQUFLLGdCQUFnQixJQUFJLElBQUksR0FBRztBQUNwRCxnQkFBUSxPQUFHO0FBQ1gsYUFBSyxnQkFBZ0IsT0FBTyxJQUFJO0FBQUEsTUFDcEM7QUFBQSxJQUNKO0FBQ0EsUUFBSSxRQUFRLFVBQVUsT0FBRyxPQUFPLFVBQVUsT0FBRyxXQUFXLEtBQUssZUFBZTtBQUN4RSxZQUFNLFVBQVUsQ0FBQyxLQUFLQyxXQUFVO0FBQzVCLFlBQUksS0FBSztBQUNMLGtCQUFRLE9BQUc7QUFDWCxlQUFLLENBQUMsSUFBSTtBQUNWLGVBQUssWUFBWSxPQUFPLElBQUk7QUFBQSxRQUNoQyxXQUNTQSxRQUFPO0FBRVosY0FBSSxLQUFLLFNBQVMsR0FBRztBQUNqQixpQkFBSyxDQUFDLElBQUlBO0FBQUEsVUFDZCxPQUNLO0FBQ0QsaUJBQUssS0FBS0EsTUFBSztBQUFBLFVBQ25CO0FBQ0EsZUFBSyxZQUFZLE9BQU8sSUFBSTtBQUFBLFFBQ2hDO0FBQUEsTUFDSjtBQUNBLFdBQUssa0JBQWtCLE1BQU0sSUFBSSxvQkFBb0IsT0FBTyxPQUFPO0FBQ25FLGFBQU87QUFBQSxJQUNYO0FBQ0EsUUFBSSxVQUFVLE9BQUcsUUFBUTtBQUNyQixZQUFNLGNBQWMsQ0FBQyxLQUFLLFVBQVUsT0FBRyxRQUFRLE1BQU0sRUFBRTtBQUN2RCxVQUFJO0FBQ0EsZUFBTztBQUFBLElBQ2Y7QUFDQSxRQUFJLEtBQUssY0FDTCxVQUFVLFdBQ1QsVUFBVSxPQUFHLE9BQU8sVUFBVSxPQUFHLFdBQVcsVUFBVSxPQUFHLFNBQVM7QUFDbkUsWUFBTSxXQUFXLEtBQUssTUFBYyxjQUFLLEtBQUssS0FBSyxJQUFJLElBQUk7QUFDM0QsVUFBSUE7QUFDSixVQUFJO0FBQ0EsUUFBQUEsU0FBUSxVQUFNLHVCQUFLLFFBQVE7QUFBQSxNQUMvQixTQUNPLEtBQUs7QUFBQSxNQUVaO0FBRUEsVUFBSSxDQUFDQSxVQUFTLEtBQUs7QUFDZjtBQUNKLFdBQUssS0FBS0EsTUFBSztBQUFBLElBQ25CO0FBQ0EsU0FBSyxZQUFZLE9BQU8sSUFBSTtBQUM1QixXQUFPO0FBQUEsRUFDWDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFLQSxhQUFhLE9BQU87QUFDaEIsVUFBTSxPQUFPLFNBQVMsTUFBTTtBQUM1QixRQUFJLFNBQ0EsU0FBUyxZQUNULFNBQVMsY0FDUixDQUFDLEtBQUssUUFBUSwwQkFBMkIsU0FBUyxXQUFXLFNBQVMsV0FBWTtBQUNuRixXQUFLLEtBQUssT0FBRyxPQUFPLEtBQUs7QUFBQSxJQUM3QjtBQUNBLFdBQU8sU0FBUyxLQUFLO0FBQUEsRUFDekI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBUUEsVUFBVSxZQUFZLE1BQU0sU0FBUztBQUNqQyxRQUFJLENBQUMsS0FBSyxXQUFXLElBQUksVUFBVSxHQUFHO0FBQ2xDLFdBQUssV0FBVyxJQUFJLFlBQVksb0JBQUksSUFBSSxDQUFDO0FBQUEsSUFDN0M7QUFDQSxVQUFNLFNBQVMsS0FBSyxXQUFXLElBQUksVUFBVTtBQUM3QyxRQUFJLENBQUM7QUFDRCxZQUFNLElBQUksTUFBTSxrQkFBa0I7QUFDdEMsVUFBTSxhQUFhLE9BQU8sSUFBSSxJQUFJO0FBQ2xDLFFBQUksWUFBWTtBQUNaLGlCQUFXO0FBQ1gsYUFBTztBQUFBLElBQ1g7QUFFQSxRQUFJO0FBQ0osVUFBTSxRQUFRLE1BQU07QUFDaEIsWUFBTSxPQUFPLE9BQU8sSUFBSSxJQUFJO0FBQzVCLFlBQU0sUUFBUSxPQUFPLEtBQUssUUFBUTtBQUNsQyxhQUFPLE9BQU8sSUFBSTtBQUNsQixtQkFBYSxhQUFhO0FBQzFCLFVBQUk7QUFDQSxxQkFBYSxLQUFLLGFBQWE7QUFDbkMsYUFBTztBQUFBLElBQ1g7QUFDQSxvQkFBZ0IsV0FBVyxPQUFPLE9BQU87QUFDekMsVUFBTSxNQUFNLEVBQUUsZUFBZSxPQUFPLE9BQU8sRUFBRTtBQUM3QyxXQUFPLElBQUksTUFBTSxHQUFHO0FBQ3BCLFdBQU87QUFBQSxFQUNYO0FBQUEsRUFDQSxrQkFBa0I7QUFDZCxXQUFPLEtBQUs7QUFBQSxFQUNoQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVNBLGtCQUFrQixNQUFNLFdBQVcsT0FBTyxTQUFTO0FBQy9DLFVBQU0sTUFBTSxLQUFLLFFBQVE7QUFDekIsUUFBSSxPQUFPLFFBQVE7QUFDZjtBQUNKLFVBQU0sZUFBZSxJQUFJO0FBQ3pCLFFBQUk7QUFDSixRQUFJLFdBQVc7QUFDZixRQUFJLEtBQUssUUFBUSxPQUFPLENBQVMsb0JBQVcsSUFBSSxHQUFHO0FBQy9DLGlCQUFtQixjQUFLLEtBQUssUUFBUSxLQUFLLElBQUk7QUFBQSxJQUNsRDtBQUNBLFVBQU0sTUFBTSxvQkFBSSxLQUFLO0FBQ3JCLFVBQU0sU0FBUyxLQUFLO0FBQ3BCLGFBQVMsbUJBQW1CLFVBQVU7QUFDbEMscUJBQUFDLE1BQU8sVUFBVSxDQUFDLEtBQUssWUFBWTtBQUMvQixZQUFJLE9BQU8sQ0FBQyxPQUFPLElBQUksSUFBSSxHQUFHO0FBQzFCLGNBQUksT0FBTyxJQUFJLFNBQVM7QUFDcEIsb0JBQVEsR0FBRztBQUNmO0FBQUEsUUFDSjtBQUNBLGNBQU1DLE9BQU0sT0FBTyxvQkFBSSxLQUFLLENBQUM7QUFDN0IsWUFBSSxZQUFZLFFBQVEsU0FBUyxTQUFTLE1BQU07QUFDNUMsaUJBQU8sSUFBSSxJQUFJLEVBQUUsYUFBYUE7QUFBQSxRQUNsQztBQUNBLGNBQU0sS0FBSyxPQUFPLElBQUksSUFBSTtBQUMxQixjQUFNLEtBQUtBLE9BQU0sR0FBRztBQUNwQixZQUFJLE1BQU0sV0FBVztBQUNqQixpQkFBTyxPQUFPLElBQUk7QUFDbEIsa0JBQVEsUUFBVyxPQUFPO0FBQUEsUUFDOUIsT0FDSztBQUNELDJCQUFpQixXQUFXLG9CQUFvQixjQUFjLE9BQU87QUFBQSxRQUN6RTtBQUFBLE1BQ0osQ0FBQztBQUFBLElBQ0w7QUFDQSxRQUFJLENBQUMsT0FBTyxJQUFJLElBQUksR0FBRztBQUNuQixhQUFPLElBQUksTUFBTTtBQUFBLFFBQ2IsWUFBWTtBQUFBLFFBQ1osWUFBWSxNQUFNO0FBQ2QsaUJBQU8sT0FBTyxJQUFJO0FBQ2xCLHVCQUFhLGNBQWM7QUFDM0IsaUJBQU87QUFBQSxRQUNYO0FBQUEsTUFDSixDQUFDO0FBQ0QsdUJBQWlCLFdBQVcsb0JBQW9CLFlBQVk7QUFBQSxJQUNoRTtBQUFBLEVBQ0o7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUlBLFdBQVcsTUFBTSxPQUFPO0FBQ3BCLFFBQUksS0FBSyxRQUFRLFVBQVUsT0FBTyxLQUFLLElBQUk7QUFDdkMsYUFBTztBQUNYLFFBQUksQ0FBQyxLQUFLLGNBQWM7QUFDcEIsWUFBTSxFQUFFLElBQUksSUFBSSxLQUFLO0FBQ3JCLFlBQU0sTUFBTSxLQUFLLFFBQVE7QUFDekIsWUFBTSxXQUFXLE9BQU8sQ0FBQyxHQUFHLElBQUksaUJBQWlCLEdBQUcsQ0FBQztBQUNyRCxZQUFNLGVBQWUsQ0FBQyxHQUFHLEtBQUssYUFBYTtBQUMzQyxZQUFNLE9BQU8sQ0FBQyxHQUFHLGFBQWEsSUFBSSxpQkFBaUIsR0FBRyxDQUFDLEdBQUcsR0FBRyxPQUFPO0FBQ3BFLFdBQUssZUFBZSxTQUFTLE1BQU0sTUFBUztBQUFBLElBQ2hEO0FBQ0EsV0FBTyxLQUFLLGFBQWEsTUFBTSxLQUFLO0FBQUEsRUFDeEM7QUFBQSxFQUNBLGFBQWEsTUFBTUMsT0FBTTtBQUNyQixXQUFPLENBQUMsS0FBSyxXQUFXLE1BQU1BLEtBQUk7QUFBQSxFQUN0QztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFLQSxpQkFBaUIsTUFBTTtBQUNuQixXQUFPLElBQUksWUFBWSxNQUFNLEtBQUssUUFBUSxnQkFBZ0IsSUFBSTtBQUFBLEVBQ2xFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFPQSxlQUFlLFdBQVc7QUFDdEIsVUFBTSxNQUFjLGlCQUFRLFNBQVM7QUFDckMsUUFBSSxDQUFDLEtBQUssU0FBUyxJQUFJLEdBQUc7QUFDdEIsV0FBSyxTQUFTLElBQUksS0FBSyxJQUFJLFNBQVMsS0FBSyxLQUFLLFlBQVksQ0FBQztBQUMvRCxXQUFPLEtBQUssU0FBUyxJQUFJLEdBQUc7QUFBQSxFQUNoQztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1BLG9CQUFvQixPQUFPO0FBQ3ZCLFFBQUksS0FBSyxRQUFRO0FBQ2IsYUFBTztBQUNYLFdBQU8sUUFBUSxPQUFPLE1BQU0sSUFBSSxJQUFJLEdBQUs7QUFBQSxFQUM3QztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFRQSxRQUFRLFdBQVcsTUFBTSxhQUFhO0FBSWxDLFVBQU0sT0FBZSxjQUFLLFdBQVcsSUFBSTtBQUN6QyxVQUFNLFdBQW1CLGlCQUFRLElBQUk7QUFDckMsa0JBQ0ksZUFBZSxPQUFPLGNBQWMsS0FBSyxTQUFTLElBQUksSUFBSSxLQUFLLEtBQUssU0FBUyxJQUFJLFFBQVE7QUFHN0YsUUFBSSxDQUFDLEtBQUssVUFBVSxVQUFVLE1BQU0sR0FBRztBQUNuQztBQUVKLFFBQUksQ0FBQyxlQUFlLEtBQUssU0FBUyxTQUFTLEdBQUc7QUFDMUMsV0FBSyxJQUFJLFdBQVcsTUFBTSxJQUFJO0FBQUEsSUFDbEM7QUFHQSxVQUFNLEtBQUssS0FBSyxlQUFlLElBQUk7QUFDbkMsVUFBTSwwQkFBMEIsR0FBRyxZQUFZO0FBRS9DLDRCQUF3QixRQUFRLENBQUMsV0FBVyxLQUFLLFFBQVEsTUFBTSxNQUFNLENBQUM7QUFFdEUsVUFBTSxTQUFTLEtBQUssZUFBZSxTQUFTO0FBQzVDLFVBQU0sYUFBYSxPQUFPLElBQUksSUFBSTtBQUNsQyxXQUFPLE9BQU8sSUFBSTtBQU1sQixRQUFJLEtBQUssY0FBYyxJQUFJLFFBQVEsR0FBRztBQUNsQyxXQUFLLGNBQWMsT0FBTyxRQUFRO0FBQUEsSUFDdEM7QUFFQSxRQUFJLFVBQVU7QUFDZCxRQUFJLEtBQUssUUFBUTtBQUNiLGdCQUFrQixrQkFBUyxLQUFLLFFBQVEsS0FBSyxJQUFJO0FBQ3JELFFBQUksS0FBSyxRQUFRLG9CQUFvQixLQUFLLGVBQWUsSUFBSSxPQUFPLEdBQUc7QUFDbkUsWUFBTSxRQUFRLEtBQUssZUFBZSxJQUFJLE9BQU8sRUFBRSxXQUFXO0FBQzFELFVBQUksVUFBVSxPQUFHO0FBQ2I7QUFBQSxJQUNSO0FBR0EsU0FBSyxTQUFTLE9BQU8sSUFBSTtBQUN6QixTQUFLLFNBQVMsT0FBTyxRQUFRO0FBQzdCLFVBQU0sWUFBWSxjQUFjLE9BQUcsYUFBYSxPQUFHO0FBQ25ELFFBQUksY0FBYyxDQUFDLEtBQUssV0FBVyxJQUFJO0FBQ25DLFdBQUssTUFBTSxXQUFXLElBQUk7QUFFOUIsU0FBSyxXQUFXLElBQUk7QUFBQSxFQUN4QjtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBSUEsV0FBVyxNQUFNO0FBQ2IsU0FBSyxXQUFXLElBQUk7QUFDcEIsVUFBTSxNQUFjLGlCQUFRLElBQUk7QUFDaEMsU0FBSyxlQUFlLEdBQUcsRUFBRSxPQUFlLGtCQUFTLElBQUksQ0FBQztBQUFBLEVBQzFEO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFJQSxXQUFXLE1BQU07QUFDYixVQUFNLFVBQVUsS0FBSyxTQUFTLElBQUksSUFBSTtBQUN0QyxRQUFJLENBQUM7QUFDRDtBQUNKLFlBQVEsUUFBUSxDQUFDLFdBQVcsT0FBTyxDQUFDO0FBQ3BDLFNBQUssU0FBUyxPQUFPLElBQUk7QUFBQSxFQUM3QjtBQUFBLEVBQ0EsZUFBZSxNQUFNLFFBQVE7QUFDekIsUUFBSSxDQUFDO0FBQ0Q7QUFDSixRQUFJLE9BQU8sS0FBSyxTQUFTLElBQUksSUFBSTtBQUNqQyxRQUFJLENBQUMsTUFBTTtBQUNQLGFBQU8sQ0FBQztBQUNSLFdBQUssU0FBUyxJQUFJLE1BQU0sSUFBSTtBQUFBLElBQ2hDO0FBQ0EsU0FBSyxLQUFLLE1BQU07QUFBQSxFQUNwQjtBQUFBLEVBQ0EsVUFBVSxNQUFNLE1BQU07QUFDbEIsUUFBSSxLQUFLO0FBQ0w7QUFDSixVQUFNLFVBQVUsRUFBRSxNQUFNLE9BQUcsS0FBSyxZQUFZLE1BQU0sT0FBTyxNQUFNLEdBQUcsTUFBTSxPQUFPLEVBQUU7QUFDakYsUUFBSSxTQUFTLFNBQVMsTUFBTSxPQUFPO0FBQ25DLFNBQUssU0FBUyxJQUFJLE1BQU07QUFDeEIsV0FBTyxLQUFLLFdBQVcsTUFBTTtBQUN6QixlQUFTO0FBQUEsSUFDYixDQUFDO0FBQ0QsV0FBTyxLQUFLLFNBQVMsTUFBTTtBQUN2QixVQUFJLFFBQVE7QUFDUixhQUFLLFNBQVMsT0FBTyxNQUFNO0FBQzNCLGlCQUFTO0FBQUEsTUFDYjtBQUFBLElBQ0osQ0FBQztBQUNELFdBQU87QUFBQSxFQUNYO0FBQ0o7QUFVTyxTQUFTLE1BQU0sT0FBTyxVQUFVLENBQUMsR0FBRztBQUN2QyxRQUFNLFVBQVUsSUFBSSxVQUFVLE9BQU87QUFDckMsVUFBUSxJQUFJLEtBQUs7QUFDakIsU0FBTztBQUNYO0FBQ0EsSUFBTyxjQUFRLEVBQUUsT0FBTyxVQUFVOzs7QUc3eEJsQyxxQkFBa0Y7QUFFM0UsSUFBTSxnQkFBZ0IsS0FBSyxPQUFPO0FBRWxDLFNBQVMsZ0JBQWdCLE1BQWMsTUFBYyxXQUFXLGVBQXFCO0FBQzFGLFFBQU0sV0FBVyxPQUFPLEtBQUssSUFBSTtBQUNqQyxNQUFJLFNBQVMsY0FBYyxVQUFVO0FBQ25DLHNDQUFjLE1BQU0sU0FBUyxTQUFTLFNBQVMsYUFBYSxRQUFRLENBQUM7QUFDckU7QUFBQSxFQUNGO0FBRUEsTUFBSTtBQUNGLFlBQUksMkJBQVcsSUFBSSxHQUFHO0FBQ3BCLFlBQU0sV0FBTyx5QkFBUyxJQUFJLEVBQUU7QUFDNUIsWUFBTSxrQkFBa0IsV0FBVyxTQUFTO0FBQzVDLFVBQUksT0FBTyxpQkFBaUI7QUFDMUIsY0FBTSxlQUFXLDZCQUFhLElBQUk7QUFDbEMsMENBQWMsTUFBTSxTQUFTLFNBQVMsS0FBSyxJQUFJLEdBQUcsU0FBUyxhQUFhLGVBQWUsQ0FBQyxDQUFDO0FBQUEsTUFDM0Y7QUFBQSxJQUNGO0FBQUEsRUFDRixRQUFRO0FBQUEsRUFFUjtBQUVBLHFDQUFlLE1BQU0sUUFBUTtBQUMvQjs7O0FDekJBLElBQUFDLGtCQUEyQjtBQUMzQixJQUFBQyxvQkFBOEI7QUEwSHZCLFNBQVMsMEJBQTBCLE1BQXlEO0FBQ2pHLFFBQU0sTUFBTSxFQUFFLEdBQUcsc0JBQXNCLElBQUksR0FBRyxHQUFHLEtBQUssSUFBSTtBQUMxRCxRQUFNLG9CQUFvQixJQUFJLHFCQUFxQixLQUFLO0FBQ3hELFFBQU0sY0FBYyxrQkFBa0IsR0FBRztBQUN6QyxRQUFNLGFBQWEsS0FBSyxnQkFBZ0IsU0FBUyxNQUFNLElBQUksS0FBSyxhQUFhLENBQUMsS0FBSztBQUNuRixRQUFNLFVBQVUsWUFBWSxHQUFHO0FBQy9CLFFBQU0sY0FBYyxnQkFBZ0IsS0FBSyxPQUFPO0FBQ2hELFFBQU1DLFdBQVUsbUJBQW1CLEdBQUc7QUFDdEMsUUFBTSxrQkFBa0IsMEJBQTBCQSxRQUFPO0FBQ3pELFFBQU0sVUFBVSxzQkFBc0IsU0FBUyxpQkFBaUIsS0FBSyxJQUFJO0FBQ3pFLFFBQU0sZUFBZSxJQUFJLHdCQUF3QixLQUFLO0FBQ3RELFFBQU0sYUFBYSxJQUFJLHFCQUFxQixLQUFLLDBCQUEwQixJQUFJLFdBQVc7QUFDMUYsUUFBTSxTQUFTLHlCQUF5QixxQkFBcUIsWUFBWSxHQUFHLGlCQUFpQixVQUFVLENBQUM7QUFDeEcsUUFBTSxrQkFBa0IsSUFBSSxlQUFlLFFBQVEsUUFBUSxZQUFZLE9BQU87QUFDOUUsUUFBTSxjQUFjLE9BQU8sa0JBQWtCO0FBQzdDLFFBQU0sMEJBQTBCLFFBQVEsWUFBWSxlQUFlLEtBQUssT0FBTztBQUMvRSxRQUFNLDJCQUNKLE9BQU8sNEJBQ1AsS0FBSyxTQUFTLFlBQVksZUFBZSxHQUFHLFNBQVM7QUFDdkQsUUFBTSxrQkFBa0IsMkJBQTJCO0FBQ25ELFFBQU0sa0JBQWtCLE9BQU8sZ0JBQWdCLE9BQU8sbUJBQW1CO0FBQ3pFLFFBQU0scUJBQ0osZ0JBQWdCLGNBQ2hCLGdCQUFnQixTQUNoQkEsWUFBVyxRQUNYLElBQUksaUJBQWlCLFFBQ3JCLElBQUksZUFBZSxRQUNuQixJQUFJLE9BQU87QUFDYixRQUFNLE1BQU0sZ0JBQWdCO0FBQzVCLFFBQU0sVUFBVTtBQUFBLElBQ2QsdUJBQXVCLG9CQUFvQjtBQUFBLElBQzNDLHFCQUFxQixLQUFLLFNBQVNBLFFBQU8sR0FBRyxXQUFXO0FBQUEsRUFDMUQ7QUFDQSxRQUFNLGtCQUFrQjtBQUFBLElBQ3RCLGdCQUFnQixRQUFRO0FBQUEsSUFDeEIsY0FBYyxRQUFRO0FBQUEsSUFDdEIsa0JBQWtCLFFBQVEsb0JBQW9CLFFBQVE7QUFBQSxJQUN0RCxnQkFBZ0IsUUFBUTtBQUFBLEVBQzFCO0FBQ0EsUUFBTSxnQkFBZ0I7QUFBQSxJQUNwQjtBQUFBLElBQ0EsYUFBYSxPQUFPO0FBQUEsSUFDcEI7QUFBQSxJQUNBO0FBQUEsRUFDRjtBQUNBLFFBQU1DLFNBQVEsRUFBRSxLQUFLLG1CQUFtQjtBQUN4QyxTQUFPO0FBQUEsSUFDTDtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0EsU0FBUztBQUFBLElBQ1QsT0FBTztBQUFBLElBQ1AsT0FBQUE7QUFBQSxJQUNBLFNBQVMsWUFBWSxhQUFhLG9CQUFvQixTQUFTLGlCQUFpQixhQUFhO0FBQUEsRUFDL0Y7QUFDRjtBQUVPLFNBQVMsZUFBZSxNQUE2QztBQUMxRSxRQUFNLFdBQVcsMEJBQTBCLElBQUk7QUFDL0MsUUFBTSxNQUFNLEVBQUUsR0FBRyxzQkFBc0IsSUFBSSxHQUFHLEdBQUcsS0FBSyxJQUFJO0FBQzFELFNBQU87QUFBQSxJQUNMLE1BQU0sU0FBUztBQUFBLElBQ2YsY0FBYyxTQUFTO0FBQUEsSUFDdkIsU0FBUyxLQUFLO0FBQUEsSUFDZCxhQUFhLFNBQVM7QUFBQSxJQUN0QixpQkFBaUI7QUFBQSxJQUNqQixTQUFTLFlBQVksR0FBRztBQUFBLElBQ3hCLGVBQWUsSUFBSSxpQkFBaUI7QUFBQSxFQUN0QztBQUNGO0FBRU8sU0FBUyx1QkFBdUIsTUFBcUQ7QUFDMUYsUUFBTSxXQUFXLDBCQUEwQixJQUFJO0FBQy9DLFFBQU0sU0FBUyxLQUFLLHdCQUF3QixLQUFLLDBCQUEwQixLQUFLLEtBQUssWUFBWSxRQUFRLFFBQVE7QUFDakgsUUFBTSxNQUFNLEVBQUUsR0FBRyxzQkFBc0IsSUFBSSxHQUFHLEdBQUcsS0FBSyxJQUFJO0FBQzFELFFBQU0sV0FBVyxLQUFLLFNBQVMsSUFBSSxhQUFhLEdBQUcsTUFBTSxLQUFLLFNBQVMsTUFBTTtBQUM3RSxTQUFPLHlCQUF5QixVQUFVLFFBQVEsUUFBUTtBQUM1RDtBQUVPLFNBQVMseUJBQ2QsVUFDQSxRQUNBLFdBQVcsTUFDZTtBQUMxQixRQUFNLE1BQU0sYUFBYTtBQUN6QixTQUFPO0FBQUEsSUFDTCxTQUFTO0FBQUEsTUFDUCxRQUFRLFNBQVMsUUFBUTtBQUFBLE1BQ3pCLE9BQU87QUFBQSxNQUNQLFNBQVMsU0FBUyxRQUFRO0FBQUEsTUFDMUIsYUFBYSxTQUFTLFFBQVE7QUFBQSxJQUNoQztBQUFBLElBQ0EsT0FBTyw4QkFBOEIsUUFBUTtBQUFBLElBQzdDLEtBQUs7QUFBQSxNQUNILFdBQVc7QUFBQSxNQUNYLFNBQVMsSUFBSTtBQUFBLE1BQ2IsTUFBTSxJQUFJO0FBQUEsSUFDWjtBQUFBLElBQ0E7QUFBQSxFQUNGO0FBQ0Y7QUFFTyxTQUFTLDhCQUNkLFVBQ21DO0FBQ25DLFFBQU0sZ0JBQWdCLFNBQVMsTUFBTTtBQUNyQyxTQUFPO0FBQUEsSUFDTCxRQUFRLGlCQUFpQixTQUFTLE1BQU07QUFBQSxJQUN4QyxpQkFBaUI7QUFBQSxJQUNqQixpQkFBaUIsU0FBUyxNQUFNO0FBQUEsSUFDaEMscUJBQXFCLFNBQVMsTUFBTTtBQUFBLEVBQ3RDO0FBQ0Y7QUFFTyxTQUFTLGVBQStCO0FBQzdDLFFBQU0sVUFBVSxRQUFRLElBQUkseUJBQXlCO0FBQ3JELFFBQU0sT0FBTyxhQUFhLFFBQVEsSUFBSSx5QkFBeUI7QUFDL0QsU0FBTztBQUFBLElBQ0wsV0FBVztBQUFBLElBQ1g7QUFBQSxJQUNBLE1BQU0sVUFBVSxPQUFPO0FBQUEsSUFDdkIsS0FBSyxVQUFVLG9CQUFvQixJQUFJLEtBQUs7QUFBQSxFQUM5QztBQUNGO0FBRUEsZUFBc0IsaUJBQTRDO0FBQ2hFLFFBQU0sU0FBUyxhQUFhO0FBQzVCLE1BQUksQ0FBQyxPQUFPLFdBQVcsQ0FBQyxPQUFPLElBQUssUUFBTyxDQUFDO0FBQzVDLFFBQU0sYUFBYSxJQUFJLGdCQUFnQjtBQUN2QyxRQUFNLFVBQVUsV0FBVyxNQUFNLFdBQVcsTUFBTSxHQUFHLEdBQUk7QUFDekQsTUFBSTtBQUNGLFVBQU0sTUFBTSxNQUFNLE1BQU0sR0FBRyxPQUFPLEdBQUcsU0FBUyxFQUFFLFFBQVEsV0FBVyxPQUFPLENBQUM7QUFDM0UsUUFBSSxDQUFDLElBQUksR0FBSSxRQUFPLENBQUM7QUFDckIsVUFBTSxPQUFPLE1BQU0sSUFBSSxLQUFLO0FBQzVCLFFBQUksQ0FBQyxNQUFNLFFBQVEsSUFBSSxFQUFHLFFBQU8sQ0FBQztBQUNsQyxXQUFPLEtBQ0osSUFBSSxDQUFDLFFBQVEsbUJBQW1CLEdBQUcsQ0FBQyxFQUNwQyxPQUFPLENBQUMsUUFBK0IsUUFBUSxJQUFJO0FBQUEsRUFDeEQsUUFBUTtBQUNOLFdBQU8sQ0FBQztBQUFBLEVBQ1YsVUFBRTtBQUNBLGlCQUFhLE9BQU87QUFBQSxFQUN0QjtBQUNGO0FBRU8sU0FBUywwQkFBMEIsYUFBbUQ7QUFDM0YsUUFBTUQsV0FBVSxTQUFTLFdBQVc7QUFDcEMsTUFBSSxLQUFLQSxVQUFTLHFCQUFxQixFQUFHLFFBQU87QUFDakQsTUFBSSxLQUFLQSxVQUFTLFdBQVcsRUFBRyxRQUFPO0FBQ3ZDLFNBQU87QUFDVDtBQUVPLFNBQVMsc0JBQXNCLFVBQTRDO0FBQ2hGLFFBQU0sTUFBTSxTQUFTLFFBQVE7QUFDN0IsUUFBTSxnQkFBZ0IsU0FBUyxLQUFLLGFBQWE7QUFDakQsUUFBTSxlQUFlLEtBQUssZUFBZSxZQUFZO0FBQ3JELFFBQU0sb0JBQW9CLEtBQUssS0FBSyxpQkFBaUI7QUFDckQsUUFBTSx5QkFBeUIsS0FBSyxLQUFLLHNCQUFzQjtBQUMvRCxRQUFNLG1CQUFtQixLQUFLLEtBQUssZ0JBQWdCO0FBQ25ELFFBQU0sbUJBQW1CLEtBQUssS0FBSyxnQkFBZ0I7QUFDbkQsUUFBTSw4QkFBOEIsS0FBSyxlQUFlLGdCQUFnQjtBQUN4RSxRQUFNLGlCQUFpQixLQUFLLGVBQWUsY0FBYztBQUN6RCxTQUFPO0FBQUEsSUFDTCxTQUFTLFFBQVE7QUFBQSxJQUNqQjtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0EsV0FBVyxnQkFBZ0IscUJBQXFCLDBCQUEwQjtBQUFBLEVBQzVFO0FBQ0Y7QUFFTyxTQUFTLHlCQUF5QixRQUFpQixNQUFtQztBQUMzRixRQUFNLGVBQWUsU0FBUyxNQUFNO0FBQ3BDLFFBQU0sY0FBYyxTQUFTLGNBQWMsV0FBVztBQUN0RCxRQUFNLGFBQWEsU0FBUyxJQUFJO0FBQ2hDLFFBQU0sa0JBQWtCLFNBQVMsWUFBWSxlQUFlO0FBQzVELFFBQU0seUJBQXlCLFFBQVEsY0FBYyxXQUFXLGVBQWU7QUFDL0UsU0FBTztBQUFBLElBQ0wsZ0JBQWdCLEtBQUssY0FBYyxjQUFjO0FBQUEsSUFDakQsYUFBYSxnQkFBZ0I7QUFBQSxJQUM3QixjQUFjLEtBQUssYUFBYSxZQUFZO0FBQUEsSUFDNUMsaUJBQWlCLEtBQUssYUFBYSxlQUFlO0FBQUEsSUFDbEQsaUJBQWlCO0FBQUEsSUFDakIsMEJBQTBCLEtBQUssaUJBQWlCLFNBQVMsS0FBSyxLQUFLLFlBQVksU0FBUztBQUFBLEVBQzFGO0FBQ0Y7QUFFTyxTQUFTLGlCQUFpQixLQUF3QztBQUN2RSxRQUFNLE1BQU0sU0FBUyxHQUFHO0FBQ3hCLE1BQUksQ0FBQyxJQUFLLFFBQU87QUFDakIsUUFBTSxjQUFjLFNBQVMsSUFBSSxXQUFXO0FBQzVDLFNBQU87QUFBQSxJQUNMLGdCQUFnQixJQUFJO0FBQUEsSUFDcEIsUUFBUSxJQUFJO0FBQUEsSUFDWixhQUFhLElBQUk7QUFBQSxJQUNqQixjQUFjLGFBQWE7QUFBQSxJQUMzQixpQkFBaUIsYUFBYTtBQUFBLEVBQ2hDO0FBQ0Y7QUFFTyxTQUFTLDBCQUEwQixhQUE4QztBQUN0RixNQUFJLGVBQWUsS0FBTSxRQUFPO0FBQ2hDLFFBQU0sT0FBTyxTQUFTLFdBQVc7QUFDakMsUUFBTSxRQUFRLFNBQVMsTUFBTSxTQUFTLE1BQU0sT0FBTyxnQkFBZ0IsV0FBVyxTQUFTLE9BQU8sZUFBZSxXQUFXLENBQUMsSUFBSTtBQUM3SCxRQUFNLGtCQUFrQixPQUFPLG1CQUFtQixNQUFNO0FBQ3hELFNBQU87QUFBQSxJQUNMLFNBQVMsT0FBTyxnQkFBZ0IsY0FBYyxVQUFVO0FBQUEsSUFDeEQ7QUFBQSxJQUNBLFdBQVcsU0FBUyxlQUFlLEdBQUcsYUFBYSxPQUFPO0FBQUEsRUFDNUQ7QUFDRjtBQUVPLFNBQVMsc0JBQXNCLE1BQXdFO0FBQzVHLFFBQU0sV0FBVyxtQkFBbUI7QUFDcEMsUUFBTUUsaUJBQWdCLFVBQVU7QUFDaEMsUUFBTUMsZUFBYyxVQUFVO0FBQzlCLFNBQU87QUFBQSxJQUNMLFVBQVUsUUFBUTtBQUFBLElBQ2xCLFVBQVUsUUFBUTtBQUFBLElBQ2xCLGVBQWUsUUFBUSxpQkFBaUI7QUFBQSxJQUN4QztBQUFBLElBQ0EsWUFBWSxRQUFRO0FBQUEsSUFDcEIsS0FBSyxVQUFVLE9BQU87QUFBQSxJQUN0QixTQUFTLFVBQVUsV0FBVztBQUFBLElBQzlCLGVBQWVELGtCQUFpQjtBQUFBLElBQ2hDLGFBQWFDLGdCQUFlO0FBQUEsSUFDNUIsbUJBQW1CLE1BQU07QUFBQSxJQUN6Qix1QkFBdUIsTUFBTTtBQUMzQixVQUFJO0FBQ0YsY0FBTSxVQUFVRCxnQkFBZSxtQkFBbUI7QUFDbEQsWUFBSSxRQUFTLFFBQU8saUJBQWlCLE9BQU87QUFDNUMsY0FBTSxVQUFVQSxnQkFBZSxnQkFBZ0IsS0FBSyxDQUFDO0FBQ3JELGNBQU0sT0FBTyxRQUFRLEtBQUssQ0FBQyxRQUFRO0FBQ2pDLGdCQUFNLGNBQWMsU0FBUyxHQUFHLEdBQUc7QUFDbkMsaUJBQU8sT0FBTyxnQkFBZ0IsY0FBYyxDQUFDLFlBQVksS0FBSyxHQUFHO0FBQUEsUUFDbkUsQ0FBQztBQUNELGVBQU8saUJBQWlCLFFBQVEsSUFBSTtBQUFBLE1BQ3RDLFFBQVE7QUFDTixlQUFPO0FBQUEsTUFDVDtBQUFBLElBQ0Y7QUFBQSxJQUNBLG9CQUFvQixNQUFNO0FBQ3hCLFVBQUk7QUFDRixjQUFNLFdBQVcsMEJBQTBCQyxZQUFXO0FBQ3RELFlBQUksVUFBVSxnQkFBaUIsUUFBTztBQUN0QyxjQUFNLFVBQVVELGdCQUFlLGdCQUFnQixLQUFLLENBQUM7QUFDckQsbUJBQVcsT0FBTyxTQUFTO0FBQ3pCLGdCQUFNLFFBQVEsU0FBUyxHQUFHLEdBQUc7QUFDN0IsY0FBSSxPQUFPLFVBQVUsV0FBWTtBQUNqQyxnQkFBTSxTQUFTLE1BQU0sS0FBSyxHQUFHO0FBQzdCLGNBQUksQ0FBQyxNQUFNLFFBQVEsTUFBTSxFQUFHO0FBQzVCLHFCQUFXLFFBQVEsUUFBUTtBQUN6QixrQkFBTSxTQUFTLHVCQUF1QixJQUFJO0FBQzFDLGdCQUFJLFFBQVEsZ0JBQWlCLFFBQU87QUFBQSxVQUN0QztBQUFBLFFBQ0Y7QUFDQSxlQUFPO0FBQUEsTUFDVCxRQUFRO0FBQ04sZUFBTywwQkFBMEJDLFlBQVc7QUFBQSxNQUM5QztBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0Y7QUFFQSxTQUFTLFlBQ1AsYUFDQSxvQkFDQSxTQUNBLFNBQ0EsT0FDeUM7QUFDekMsUUFBTSxVQUFvQixDQUFDO0FBQzNCLFFBQU0sc0JBQ0osUUFBUSxrQkFDUixRQUFRLGdCQUNSLFFBQVEseUJBQ1IsUUFBUSx1QkFDUixNQUFNLGVBQ04sTUFBTSxtQkFDTjtBQUVGLE1BQUksZ0JBQWdCLGFBQWEsQ0FBQyxxQkFBcUI7QUFDckQsV0FBTyxFQUFFLE9BQU8sV0FBVyxTQUFTLENBQUMsdURBQXVELEVBQUU7QUFBQSxFQUNoRztBQUNBLE1BQUksZ0JBQWdCLGFBQWEscUJBQXFCO0FBQ3BELFlBQVEsS0FBSyxzQ0FBc0M7QUFBQSxFQUNyRDtBQUVBLE1BQUksQ0FBQyxRQUFRLGVBQWdCLFNBQVEsS0FBSyw2QkFBNkI7QUFDdkUsTUFBSSxDQUFDLFFBQVEsYUFBYyxTQUFRLEtBQUssMEJBQTBCO0FBQ2xFLE1BQUksQ0FBQyxRQUFRLHlCQUF5QixRQUFRLHFCQUFxQjtBQUNqRSxZQUFRLEtBQUssMkRBQTJEO0FBQUEsRUFDMUUsV0FBVyxDQUFDLFFBQVEseUJBQXlCLENBQUMsUUFBUSxxQkFBcUI7QUFDekUsWUFBUSxLQUFLLHFDQUFxQztBQUFBLEVBQ3BEO0FBQ0EsTUFBSSxDQUFDLE1BQU0sbUJBQW1CLE1BQU0sYUFBYTtBQUMvQyxZQUFRLEtBQUssNkRBQTZEO0FBQUEsRUFDNUUsV0FBVyxDQUFDLE1BQU0sbUJBQW1CLENBQUMsTUFBTSxhQUFhO0FBQ3ZELFlBQVEsS0FBSyw0QkFBNEI7QUFBQSxFQUMzQztBQUVBLFFBQU0sZ0JBQ0gsQ0FBQyxRQUFRLHlCQUF5QixRQUFRLHVCQUMxQyxDQUFDLE1BQU0sbUJBQW1CLE1BQU0sZUFDakMsZ0JBQWdCLGNBQ2hCLENBQUMsUUFBUSxrQkFDVCxDQUFDLFFBQVE7QUFFWCxNQUFJLGdCQUFnQixXQUFXO0FBQzdCLFdBQU8sRUFBRSxPQUFPLFdBQVcsUUFBUTtBQUFBLEVBQ3JDO0FBQ0EsTUFBSSxlQUFlO0FBQ2pCLFdBQU8sRUFBRSxPQUFPLFlBQVksUUFBUTtBQUFBLEVBQ3RDO0FBQ0EsU0FBTyxFQUFFLE9BQU8sYUFBYSxTQUFTLENBQUMsRUFBRTtBQUMzQztBQUVBLFNBQVMsa0JBQWtCLEtBQXdDO0FBQ2pFLFFBQU1DLFlBQVcsSUFBSSxZQUFZLFFBQVE7QUFDekMsUUFBTSxTQUFTLElBQUksY0FBYztBQUNqQyxRQUFNLGdCQUFnQixJQUFJLGlCQUFpQjtBQUMzQyxNQUFJQSxjQUFhLFVBQVU7QUFDekIsVUFBTSxVQUFVLGdCQUFnQixJQUFJLFlBQVksUUFBUSxRQUFRO0FBQ2hFLFFBQUksV0FBVyxXQUFPLHdCQUFLLFNBQVMsWUFBWSxjQUFjLDJCQUEyQixDQUFDLEdBQUc7QUFDM0YsYUFBTztBQUFBLElBQ1Q7QUFDQSxRQUFJLFdBQVcsV0FBTyx3QkFBSyxTQUFTLFlBQVksY0FBYyw4QkFBOEIsQ0FBQyxHQUFHO0FBQzlGLGFBQU87QUFBQSxJQUNUO0FBQ0EsUUFBSSxpQkFBaUIsV0FBTyx3QkFBSyxlQUFlLFVBQVUsQ0FBQyxHQUFHO0FBQzVELGFBQU87QUFBQSxJQUNUO0FBQ0EsV0FBTztBQUFBLEVBQ1Q7QUFDQSxTQUFPLGlCQUFpQixXQUFPLHdCQUFLLGVBQWUsVUFBVSxDQUFDLElBQUksYUFBYTtBQUNqRjtBQUVBLFNBQVMsZ0JBQWdCLFVBQWlDO0FBQ3hELFFBQU0sU0FBUztBQUNmLFFBQU0sTUFBTSxTQUFTLFFBQVEsTUFBTTtBQUNuQyxTQUFPLE9BQU8sSUFBSSxTQUFTLE1BQU0sR0FBRyxNQUFNLE9BQU8sTUFBTSxJQUFJO0FBQzdEO0FBRUEsU0FBUyxZQUFZLEtBQXFDO0FBQ3hELFFBQU0sVUFBVSxTQUFTLE1BQU0sSUFBSSxLQUFLLGFBQWEsQ0FBQztBQUN0RCxNQUFJLFFBQVMsUUFBTztBQUNwQixTQUFPLElBQUksb0JBQWdCLHdCQUFLLElBQUksZUFBZSxVQUFVLElBQUk7QUFDbkU7QUFFQSxTQUFTLGdCQUFnQixLQUFzQixTQUF1QztBQUNwRixNQUFJLENBQUMsUUFBUyxRQUFPO0FBQ3JCLFFBQU0sYUFBUywyQkFBUSxPQUFPO0FBQzlCLE1BQUksT0FBTyxTQUFTLFNBQVMsRUFBRyxRQUFPO0FBQ3ZDLE1BQUksT0FBTyxJQUFJLEtBQUssZUFBZSxVQUFXLFFBQU8sSUFBSSxJQUFJLGFBQWEsU0FBUztBQUNuRixTQUFPO0FBQ1Q7QUFFQSxTQUFTLG1CQUFtQixLQUFrRDtBQUM1RSxRQUFNSixXQUFVLElBQUk7QUFDcEIsTUFBSSxDQUFDQSxTQUFTLFFBQU87QUFDckIsTUFBSSxvQkFBb0JBLFNBQVMsUUFBTyxTQUFTQSxTQUFRLGNBQWM7QUFDdkUsU0FBTyxTQUFTQSxRQUFPO0FBQ3pCO0FBRUEsU0FBUyxxQkFBcUIsUUFBMkM7QUFDdkUsTUFBSSxDQUFDLE9BQVEsUUFBTztBQUNwQixTQUFPO0FBQUEsSUFDTCxnQkFBZ0IsT0FBTztBQUFBLElBQ3ZCLGFBQWEsT0FBTyxnQkFDbEIsT0FBTyxnQkFBZ0IsT0FBTyxrQkFDMUIsRUFBRSxjQUFjLE9BQU8sY0FBYyxpQkFBaUIsT0FBTyxnQkFBZ0IsSUFDN0U7QUFBQSxFQUVSO0FBQ0Y7QUFFQSxTQUFTLGlCQUFpQixRQUF5QztBQUNqRSxNQUFJLENBQUMsT0FBUSxRQUFPO0FBQ3BCLFNBQU87QUFBQSxJQUNMLGlCQUFpQixPQUFPLG9CQUFvQixPQUFPLFlBQVksRUFBRSxXQUFXLE9BQU8sVUFBVSxJQUFJO0FBQUEsSUFDakcsV0FBVyxPQUFPO0FBQUEsRUFDcEI7QUFDRjtBQUVBLFNBQVMsdUJBQXVCLE1BQXVDO0FBQ3JFLFFBQU0sTUFBTSxTQUFTLElBQUk7QUFDekIsTUFBSSxDQUFDLElBQUssUUFBTztBQUNqQixTQUFPO0FBQUEsSUFDTCxTQUFTO0FBQUEsSUFDVCxpQkFBaUIsSUFBSTtBQUFBLElBQ3JCLFdBQVcsU0FBUyxJQUFJLGVBQWUsR0FBRyxhQUFhLElBQUk7QUFBQSxFQUM3RDtBQUNGO0FBRUEsU0FBUywwQkFBMEJJLFdBQStEO0FBQ2hHLFNBQU87QUFBQSxJQUNMLGtCQUFrQjtBQUFBLElBQ2xCLGNBQWNBLGNBQWE7QUFBQSxJQUMzQixpQkFBaUI7QUFBQSxJQUNqQixvQkFBb0I7QUFBQSxJQUNwQixrQkFBa0I7QUFBQSxJQUNsQixZQUFZO0FBQUEsSUFDWixZQUFZO0FBQUEsSUFDWixTQUFTO0FBQUEsRUFDWDtBQUNGO0FBRUEsU0FBUyxhQUFhLE9BQW1DO0FBQ3ZELFFBQU0sU0FBUyxPQUFPLFNBQVMsTUFBTTtBQUNyQyxTQUFPLE9BQU8sVUFBVSxNQUFNLEtBQUssU0FBUyxLQUFLLFNBQVMsUUFBUSxTQUFTO0FBQzdFO0FBRUEsU0FBUyxtQkFBbUIsS0FBcUM7QUFDL0QsUUFBTSxRQUFRLFNBQVMsR0FBRztBQUMxQixNQUFJLENBQUMsU0FBUyxPQUFPLE1BQU0sT0FBTyxZQUFZLE9BQU8sTUFBTSxTQUFTLFlBQVksT0FBTyxNQUFNLFFBQVEsVUFBVTtBQUM3RyxXQUFPO0FBQUEsRUFDVDtBQUNBLFNBQU87QUFBQSxJQUNMLElBQUksTUFBTTtBQUFBLElBQ1YsTUFBTSxNQUFNO0FBQUEsSUFDWixLQUFLLE1BQU07QUFBQSxJQUNYLEdBQUksT0FBTyxNQUFNLFVBQVUsV0FBVyxFQUFFLE9BQU8sTUFBTSxNQUFNLElBQUksQ0FBQztBQUFBLElBQ2hFLEdBQUksT0FBTyxNQUFNLHlCQUF5QixXQUN0QyxFQUFFLHNCQUFzQixNQUFNLHFCQUFxQixJQUNuRCxDQUFDO0FBQUEsRUFDUDtBQUNGO0FBRUEsU0FBUyxxQkFLQTtBQUNQLE1BQUk7QUFDRixXQUFPLFFBQVEsVUFBVTtBQUFBLEVBTTNCLFFBQVE7QUFDTixXQUFPO0FBQUEsRUFDVDtBQUNGO0FBRUEsU0FBUyxTQUFZLElBQXVCO0FBQzFDLE1BQUk7QUFDRixVQUFNLFFBQVEsR0FBRztBQUNqQixXQUFPLFVBQVUsU0FBWSxPQUFPO0FBQUEsRUFDdEMsUUFBUTtBQUNOLFdBQU87QUFBQSxFQUNUO0FBQ0Y7QUFFQSxTQUFTLEtBQUssT0FBeUI7QUFDckMsU0FBTyxPQUFPLFVBQVU7QUFDMUI7QUFFTyxTQUFTLFNBQVMsT0FBZ0Q7QUFDdkUsU0FBTyxTQUFTLE9BQU8sVUFBVSxXQUFXLFFBQW1DO0FBQ2pGOzs7QUM3a0JBLGdDQUE2QjtBQUM3QixJQUFBQyxrQkFBeUM7QUFDekMscUJBQWtDO0FBQ2xDLElBQUFDLG9CQUFxQjs7O0FDdUNkLFNBQVMsa0JBQ2QsUUFDQSxlQUFvQyxvQkFBSSxJQUFJLEdBQzFCO0FBQ2xCLE1BQUksT0FBTyxjQUFjLEVBQUcsUUFBTztBQUNuQyxNQUFJLGFBQWEsSUFBSSxPQUFPLEVBQUUsRUFBRyxRQUFPO0FBQ3hDLFFBQU0sT0FBTyxPQUFPLFVBQVUsS0FBSztBQUNuQyxNQUFJLFNBQVMsYUFBYSxTQUFTLFlBQWEsUUFBTztBQUN2RCxNQUFJLFNBQVMsWUFBWSxTQUFTLGNBQWUsUUFBTztBQUN4RCxTQUFPO0FBQ1Q7QUFFTyxTQUFTLHNCQUNkLFFBQ0EsZUFBb0Msb0JBQUksSUFBSSxHQUNuQztBQUNULFNBQU8sa0JBQWtCLFFBQVEsWUFBWSxNQUFNO0FBQ3JEO0FBRU8sU0FBUywwQkFDZCxTQUNBLFFBQ0EsZUFBb0Msb0JBQUksSUFBSSxHQUN0QztBQUNOLE1BQUksQ0FBQyxzQkFBc0IsUUFBUSxZQUFZLEdBQUc7QUFDaEQsVUFBTSxJQUFJLE1BQU0sV0FBVyxPQUFPLHVCQUF1QjtBQUFBLEVBQzNEO0FBQ0Y7QUFHTyxTQUFTLHlCQUF5QixPQUE0QztBQUNuRixTQUFPLFVBQVU7QUFDbkI7QUFFTyxTQUFTLHdCQUE0RCxRQUFrQztBQUM1RyxRQUFNLEVBQUUsWUFBWSxVQUFVLEdBQUcsS0FBSyxJQUFJO0FBQzFDLFNBQU87QUFDVDs7O0FEcENBLElBQU0sZ0JBQWdCO0FBQ3RCLElBQU0sa0JBQWMsNEJBQUssd0JBQVEsR0FBRyxXQUFXLFFBQVEsNEJBQTRCO0FBRTVFLFNBQVMsaUJBQWlCQyxXQUFpQztBQUNoRSxRQUFNLFNBQStCLENBQUM7QUFDdEMsUUFBTSxRQUFRLGFBQXlCLHdCQUFLQSxXQUFVLFlBQVksQ0FBQztBQUNuRSxRQUFNLFNBQVMsYUFBd0Isd0JBQUtBLFdBQVUsYUFBYSxDQUFDLEtBQUssQ0FBQztBQUMxRSxRQUFNLGFBQWEsYUFBMEIsd0JBQUtBLFdBQVUsd0JBQXdCLENBQUM7QUFFckYsU0FBTyxLQUFLO0FBQUEsSUFDVixNQUFNO0FBQUEsSUFDTixRQUFRLFFBQVEsT0FBTztBQUFBLElBQ3ZCLFFBQVEsUUFBUSxXQUFXLE1BQU0sV0FBVyxtQkFBbUIsS0FBSztBQUFBLEVBQ3RFLENBQUM7QUFFRCxNQUFJLENBQUMsTUFBTyxRQUFPLFVBQVUsUUFBUSxNQUFNO0FBRTNDLFFBQU0sYUFBYSx5QkFBeUIsT0FBTyxlQUFlLFVBQVU7QUFDNUUsU0FBTyxLQUFLO0FBQUEsSUFDVixNQUFNO0FBQUEsSUFDTixRQUFRLGFBQWEsT0FBTztBQUFBLElBQzVCLFFBQVEsYUFBYSxZQUFZO0FBQUEsRUFDbkMsQ0FBQztBQUVELFNBQU8sS0FBSztBQUFBLElBQ1YsTUFBTTtBQUFBLElBQ04sUUFBUSxNQUFNLFdBQVcsTUFBTSxZQUFZLFNBQVMsT0FBTztBQUFBLElBQzNELFFBQVEsTUFBTSxXQUFXO0FBQUEsRUFDM0IsQ0FBQztBQUVELE1BQUksWUFBWTtBQUNkLFdBQU8sS0FBSyxnQkFBZ0IsVUFBVSxDQUFDO0FBQUEsRUFDekM7QUFFQSxRQUFNLFVBQVUsTUFBTSxXQUFXO0FBQ2pDLFNBQU8sS0FBSztBQUFBLElBQ1YsTUFBTTtBQUFBLElBQ04sUUFBUSxlQUFXLDRCQUFXLE9BQU8sSUFBSSxPQUFPO0FBQUEsSUFDaEQsUUFBUSxXQUFXO0FBQUEsRUFDckIsQ0FBQztBQUVELGNBQVEseUJBQVMsR0FBRztBQUFBLElBQ2xCLEtBQUs7QUFDSCxhQUFPLEtBQUssR0FBRyxvQkFBb0IsT0FBTyxDQUFDO0FBQzNDO0FBQUEsSUFDRixLQUFLO0FBQ0gsYUFBTyxLQUFLLEdBQUcsb0JBQW9CLE9BQU8sQ0FBQztBQUMzQztBQUFBLElBQ0YsS0FBSztBQUNILGFBQU8sS0FBSyxHQUFHLDBCQUEwQixDQUFDO0FBQzFDO0FBQUEsSUFDRjtBQUNFLGFBQU8sS0FBSztBQUFBLFFBQ1YsTUFBTTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsUUFBUSw2QkFBeUIseUJBQVMsQ0FBQztBQUFBLE1BQzdDLENBQUM7QUFBQSxFQUNMO0FBRUEsU0FBTyxVQUFVLE1BQU0sV0FBVyxRQUFRLE1BQU07QUFDbEQ7QUFFQSxTQUFTLGdCQUFnQixPQUE0QztBQUNuRSxRQUFNLEtBQUssTUFBTSxlQUFlLE1BQU0sYUFBYTtBQUNuRCxNQUFJLE1BQU0sV0FBVyxVQUFVO0FBQzdCLFdBQU87QUFBQSxNQUNMLE1BQU07QUFBQSxNQUNOLFFBQVE7QUFBQSxNQUNSLFFBQVEsTUFBTSxRQUFRLFVBQVUsRUFBRSxLQUFLLE1BQU0sS0FBSyxLQUFLLFVBQVUsRUFBRTtBQUFBLElBQ3JFO0FBQUEsRUFDRjtBQUNBLE1BQUksTUFBTSxXQUFXLFlBQVk7QUFDL0IsV0FBTyxFQUFFLE1BQU0sdUJBQXVCLFFBQVEsUUFBUSxRQUFRLFdBQVcsRUFBRSwrQkFBK0I7QUFBQSxFQUM1RztBQUNBLE1BQUksTUFBTSxXQUFXLFdBQVc7QUFDOUIsV0FBTyxFQUFFLE1BQU0sdUJBQXVCLFFBQVEsTUFBTSxRQUFRLFdBQVcsRUFBRSxPQUFPLE1BQU0saUJBQWlCLGFBQWEsR0FBRztBQUFBLEVBQ3pIO0FBQ0EsTUFBSSxNQUFNLFdBQVcsY0FBYztBQUNqQyxXQUFPLEVBQUUsTUFBTSx1QkFBdUIsUUFBUSxNQUFNLFFBQVEsY0FBYyxFQUFFLEdBQUc7QUFBQSxFQUNqRjtBQUNBLFNBQU8sRUFBRSxNQUFNLHVCQUF1QixRQUFRLFFBQVEsUUFBUSxrQkFBa0IsRUFBRSxHQUFHO0FBQ3ZGO0FBRUEsU0FBUyxvQkFBb0IsU0FBdUM7QUFDbEUsUUFBTSxTQUErQixDQUFDO0FBQ3RDLFFBQU0sZ0JBQVksNEJBQUssd0JBQVEsR0FBRyxXQUFXLGdCQUFnQixHQUFHLGFBQWEsUUFBUTtBQUNyRixRQUFNLFlBQVEsNEJBQVcsU0FBUyxJQUFJLGFBQWEsU0FBUyxJQUFJO0FBQ2hFLFFBQU0sV0FBVyxjQUFVLHdCQUFLLFNBQVMsWUFBWSxhQUFhLFVBQVUsSUFBSTtBQUVoRixTQUFPLEtBQUs7QUFBQSxJQUNWLE1BQU07QUFBQSxJQUNOLFFBQVEsUUFBUSxPQUFPO0FBQUEsSUFDdkIsUUFBUTtBQUFBLEVBQ1YsQ0FBQztBQUVELE1BQUksT0FBTztBQUNULFdBQU8sS0FBSztBQUFBLE1BQ1YsTUFBTTtBQUFBLE1BQ04sUUFBUSxNQUFNLFNBQVMsYUFBYSxJQUFJLE9BQU87QUFBQSxNQUMvQyxRQUFRO0FBQUEsSUFDVixDQUFDO0FBQ0QsV0FBTyxLQUFLO0FBQUEsTUFDVixNQUFNO0FBQUEsTUFDTixRQUFRLFlBQVksTUFBTSxTQUFTLFFBQVEsSUFBSSxPQUFPO0FBQUEsTUFDdEQsUUFBUSxZQUFZO0FBQUEsSUFDdEIsQ0FBQztBQUNELFdBQU8sS0FBSztBQUFBLE1BQ1YsTUFBTTtBQUFBLE1BQ04sUUFBUSxNQUFNLFNBQVMsMEJBQTBCLEtBQUssTUFBTSxTQUFTLDJCQUEyQixJQUM1RixPQUNBO0FBQUEsTUFDSixRQUFRLGVBQWUsS0FBSztBQUFBLElBQzlCLENBQUM7QUFFRCxVQUFNLFVBQVUsYUFBYSxPQUFPLDZDQUE2QztBQUNqRixRQUFJLFNBQVM7QUFDWCxhQUFPLEtBQUs7QUFBQSxRQUNWLE1BQU07QUFBQSxRQUNOLFlBQVEsNEJBQVcsT0FBTyxJQUFJLE9BQU87QUFBQSxRQUNyQyxRQUFRO0FBQUEsTUFDVixDQUFDO0FBQUEsSUFDSDtBQUFBLEVBQ0Y7QUFFQSxRQUFNLFNBQVMsZ0JBQWdCLGFBQWEsQ0FBQyxRQUFRLGFBQWEsQ0FBQztBQUNuRSxTQUFPLEtBQUs7QUFBQSxJQUNWLE1BQU07QUFBQSxJQUNOLFFBQVEsU0FBUyxPQUFPO0FBQUEsSUFDeEIsUUFBUSxTQUFTLHNCQUFzQjtBQUFBLEVBQ3pDLENBQUM7QUFFRCxTQUFPLEtBQUssZ0JBQWdCLENBQUM7QUFDN0IsU0FBTztBQUNUO0FBRUEsU0FBUyxvQkFBb0IsU0FBdUM7QUFDbEUsUUFBTSxVQUFNLDRCQUFLLHdCQUFRLEdBQUcsV0FBVyxXQUFXLE1BQU07QUFDeEQsUUFBTSxjQUFVLHdCQUFLLEtBQUssZ0NBQWdDO0FBQzFELFFBQU0sWUFBUSx3QkFBSyxLQUFLLDhCQUE4QjtBQUN0RCxRQUFNLGVBQVcsd0JBQUssS0FBSyw2QkFBNkI7QUFDeEQsUUFBTSxlQUFlLGNBQVUsd0JBQUssU0FBUyxhQUFhLFVBQVUsSUFBSTtBQUN4RSxRQUFNLGVBQVcsNEJBQVcsUUFBUSxJQUFJLGFBQWEsUUFBUSxJQUFJO0FBRWpFLFNBQU87QUFBQSxJQUNMO0FBQUEsTUFDRSxNQUFNO0FBQUEsTUFDTixZQUFRLDRCQUFXLE9BQU8sSUFBSSxPQUFPO0FBQUEsTUFDckMsUUFBUTtBQUFBLElBQ1Y7QUFBQSxJQUNBO0FBQUEsTUFDRSxNQUFNO0FBQUEsTUFDTixZQUFRLDRCQUFXLEtBQUssSUFBSSxPQUFPO0FBQUEsTUFDbkMsUUFBUTtBQUFBLElBQ1Y7QUFBQSxJQUNBO0FBQUEsTUFDRSxNQUFNO0FBQUEsTUFDTixRQUFRLFlBQVksZ0JBQWdCLFNBQVMsU0FBUyxZQUFZLElBQUksT0FBTztBQUFBLE1BQzdFLFFBQVEsZ0JBQWdCO0FBQUEsSUFDMUI7QUFBQSxJQUNBO0FBQUEsTUFDRSxNQUFNO0FBQUEsTUFDTixRQUFRLGdCQUFnQixhQUFhLENBQUMsVUFBVSxhQUFhLFdBQVcsNkJBQTZCLENBQUMsSUFBSSxPQUFPO0FBQUEsTUFDakgsUUFBUTtBQUFBLElBQ1Y7QUFBQSxJQUNBO0FBQUEsTUFDRSxNQUFNO0FBQUEsTUFDTixRQUFRLGdCQUFnQixhQUFhLENBQUMsVUFBVSxhQUFhLFdBQVcsOEJBQThCLENBQUMsSUFBSSxPQUFPO0FBQUEsTUFDbEgsUUFBUTtBQUFBLElBQ1Y7QUFBQSxFQUNGO0FBQ0Y7QUFFQSxTQUFTLDRCQUFrRDtBQUN6RCxTQUFPO0FBQUEsSUFDTDtBQUFBLE1BQ0UsTUFBTTtBQUFBLE1BQ04sUUFBUSxnQkFBZ0IsZ0JBQWdCLENBQUMsVUFBVSxPQUFPLHdCQUF3QixDQUFDLElBQUksT0FBTztBQUFBLE1BQzlGLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQTtBQUFBLE1BQ0UsTUFBTTtBQUFBLE1BQ04sUUFBUSxnQkFBZ0IsZ0JBQWdCLENBQUMsVUFBVSxPQUFPLCtCQUErQixDQUFDLElBQUksT0FBTztBQUFBLE1BQ3JHLFFBQVE7QUFBQSxJQUNWO0FBQUEsRUFDRjtBQUNGO0FBRUEsU0FBUyxrQkFBc0M7QUFDN0MsTUFBSSxLQUFDLDRCQUFXLFdBQVcsR0FBRztBQUM1QixXQUFPLEVBQUUsTUFBTSxlQUFlLFFBQVEsUUFBUSxRQUFRLHFCQUFxQjtBQUFBLEVBQzdFO0FBQ0EsUUFBTSxPQUFPLGFBQWEsV0FBVyxFQUFFLE1BQU0sT0FBTyxFQUFFLE1BQU0sR0FBRyxFQUFFLEtBQUssSUFBSTtBQUMxRSxTQUFPLHNCQUFzQixJQUFJO0FBQ25DO0FBRU8sU0FBUyxzQkFBc0IsTUFBa0M7QUFDdEUsUUFBTSxXQUFXLDhEQUE4RCxLQUFLLElBQUk7QUFDeEYsUUFBTSxvQkFDSixZQUNBLG1IQUFtSCxLQUFLLElBQUk7QUFDOUgsU0FBTztBQUFBLElBQ0wsTUFBTTtBQUFBLElBQ04sUUFBUSxXQUFXLFNBQVM7QUFBQSxJQUM1QixRQUFRLFdBQ0osb0JBQ0UsZ0ZBQ0EseUNBQ0Y7QUFBQSxFQUNOO0FBQ0Y7QUFFQSxTQUFTLFVBQVUsU0FBaUIsUUFBNkM7QUFDL0UsUUFBTSxXQUFXLE9BQU8sS0FBSyxDQUFDLE1BQU0sRUFBRSxXQUFXLE9BQU87QUFDeEQsUUFBTSxVQUFVLE9BQU8sS0FBSyxDQUFDLE1BQU0sRUFBRSxXQUFXLE1BQU07QUFDdEQsUUFBTSxTQUFzQixXQUFXLFVBQVUsVUFBVSxTQUFTO0FBQ3BFLFFBQU0sU0FBUyxPQUFPLE9BQU8sQ0FBQyxNQUFNLEVBQUUsV0FBVyxPQUFPLEVBQUU7QUFDMUQsUUFBTSxTQUFTLE9BQU8sT0FBTyxDQUFDLE1BQU0sRUFBRSxXQUFXLE1BQU0sRUFBRTtBQUN6RCxRQUFNLFFBQ0osV0FBVyxPQUNQLGlDQUNBLFdBQVcsU0FDVCxxQ0FDQTtBQUNSLFFBQU0sVUFDSixXQUFXLE9BQ1Asb0VBQ0EsR0FBRyxNQUFNLHNCQUFzQixNQUFNO0FBRTNDLFNBQU87QUFBQSxJQUNMLFlBQVcsb0JBQUksS0FBSyxHQUFFLFlBQVk7QUFBQSxJQUNsQztBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxFQUNGO0FBQ0Y7QUFFQSxTQUFTLGdCQUFnQixTQUFpQixNQUF5QjtBQUNqRSxNQUFJO0FBQ0YsZ0RBQWEsU0FBUyxNQUFNLEVBQUUsT0FBTyxVQUFVLFNBQVMsSUFBTSxDQUFDO0FBQy9ELFdBQU87QUFBQSxFQUNULFFBQVE7QUFDTixXQUFPO0FBQUEsRUFDVDtBQUNGO0FBRUEsU0FBUyxlQUFlLE9BQXVCO0FBQzdDLFFBQU0sVUFBVSxhQUFhLE9BQU8sMkVBQTJFO0FBQy9HLFNBQU8sVUFBVSxZQUFZLE9BQU8sRUFBRSxRQUFRLFFBQVEsR0FBRyxFQUFFLEtBQUssSUFBSTtBQUN0RTtBQUVBLFNBQVMsYUFBYSxRQUFnQixTQUFnQztBQUNwRSxTQUFPLE9BQU8sTUFBTSxPQUFPLElBQUksQ0FBQyxLQUFLO0FBQ3ZDO0FBRUEsU0FBUyxTQUFZLE1BQXdCO0FBQzNDLE1BQUk7QUFDRixXQUFPLEtBQUssVUFBTSw4QkFBYSxNQUFNLE1BQU0sQ0FBQztBQUFBLEVBQzlDLFFBQVE7QUFDTixXQUFPO0FBQUEsRUFDVDtBQUNGO0FBRUEsU0FBUyxhQUFhLE1BQXNCO0FBQzFDLE1BQUk7QUFDRixlQUFPLDhCQUFhLE1BQU0sTUFBTTtBQUFBLEVBQ2xDLFFBQVE7QUFDTixXQUFPO0FBQUEsRUFDVDtBQUNGO0FBRUEsU0FBUyxZQUFZLE9BQXVCO0FBQzFDLFNBQU8sTUFDSixRQUFRLFdBQVcsR0FBSSxFQUN2QixRQUFRLFdBQVcsR0FBRyxFQUN0QixRQUFRLFNBQVMsR0FBRyxFQUNwQixRQUFRLFNBQVMsR0FBRyxFQUNwQixRQUFRLFVBQVUsR0FBRztBQUMxQjs7O0FFcFRPLFNBQVMsd0JBQXdCLE9BQXdDO0FBQzlFLFNBQU8sVUFBVTtBQUNuQjtBQUVPLFNBQVMsYUFBYSxRQUFnQixNQUE4QjtBQUN6RSxPQUFLLFFBQVEscUJBQXFCLE1BQU0sR0FBRztBQUMzQyxPQUFLLGtCQUFrQjtBQUN2QixPQUFLLHNCQUFzQjtBQUMzQixPQUFLLGtCQUFrQjtBQUN2QixPQUFLLGdCQUFnQjtBQUN2QjtBQUVPLFNBQVMseUJBQ2QsSUFDQSxTQUNBLE1BQ007QUFDTixRQUFNLG9CQUFvQixDQUFDLENBQUM7QUFDNUIsT0FBSyxnQkFBZ0IsSUFBSSxpQkFBaUI7QUFDMUMsT0FBSyxRQUFRLFNBQVMsRUFBRSxZQUFZLGlCQUFpQixFQUFFO0FBQ3ZELGVBQWEsa0JBQWtCLElBQUk7QUFDbkMsU0FBTztBQUNUOzs7QUNwQ0Esc0JBQTBGO0FBQzFGLHlCQUF1QztBQUN2QyxJQUFBQyxrQkFBbUQ7QUFDbkQsdUJBQXFGO0FBQ3JGLElBQUFDLG9CQUEwQztBQUcxQyxJQUFNLHVCQUF1QjtBQUM3QixJQUFNLHlCQUF5QjtBQUMvQixJQUFNLDBCQUEwQjtBQUNoQyxJQUFNLDJCQUEyQjtBQUNqQyxJQUFNLHlCQUF5QjtBQUMvQixJQUFNLHVCQUF1QjtBQTJFN0IsSUFBTSxhQUFxQztBQUFBLEVBQ3pDLFNBQVM7QUFBQSxFQUNULE9BQU87QUFBQSxFQUNQLFFBQVE7QUFBQSxFQUNSLFNBQVM7QUFBQSxFQUNULFFBQVE7QUFBQSxFQUNSLFFBQVE7QUFBQSxFQUNSLFFBQVE7QUFBQSxFQUNSLFNBQVM7QUFBQSxFQUNULFNBQVM7QUFBQSxFQUNULFFBQVE7QUFBQSxFQUNSLFNBQVM7QUFBQSxFQUNULFVBQVU7QUFDWjtBQUVBLElBQUksZUFBOEI7QUFDbEMsSUFBSSxhQUFtQztBQUN2QyxJQUFJLGdCQUErQztBQUNuRCxJQUFNLGlCQUFpQixvQkFBSSxJQUFrQztBQUM3RCxJQUFNLGlCQUFpQixvQkFBSSxJQUF5QjtBQUU3QyxTQUFTLDBCQUNkLE1BQ007QUFDTixNQUFJLFFBQVEsSUFBSSx1QkFBdUIsSUFBSztBQUM1QyxRQUFNLE9BQU8sVUFBVSxRQUFRLElBQUkseUJBQXlCLElBQUk7QUFDaEUsdUJBQXFCO0FBQUEsSUFDbkIsR0FBRztBQUFBLElBQ0g7QUFBQSxJQUNBLE1BQU07QUFBQSxJQUNOLGdCQUFnQixRQUFRLElBQUksaUNBQWlDO0FBQUEsRUFDL0QsQ0FBQztBQUNIO0FBRU8sU0FBUyxxQkFBcUIsTUFBb0M7QUFDdkUsTUFBSSxhQUFjO0FBQ2xCLGtCQUFnQjtBQUNoQiw4QkFBNEIsS0FBSyxHQUFHO0FBRXBDLFFBQU0sYUFBUywrQkFBYSxDQUFDLEtBQUssUUFBUTtBQUN4QyxzQkFBa0IsS0FBSyxHQUFHLEVBQUUsTUFBTSxDQUFDLFVBQVU7QUFDM0MsV0FBSyxJQUFJLFNBQVMsNkJBQTZCLEVBQUUsU0FBUyxNQUFNLFFBQVEsQ0FBQztBQUN6RSxlQUFTLEtBQUssS0FBSywyQkFBMkIsMkJBQTJCO0FBQUEsSUFDM0UsQ0FBQztBQUFBLEVBQ0gsQ0FBQztBQUNELFNBQU8sR0FBRyxXQUFXLENBQUMsS0FBSyxRQUFRLFNBQVM7QUFDMUMsa0JBQWMsS0FBSyxRQUFrQixJQUFJLEVBQUUsTUFBTSxDQUFDLFVBQVU7QUFDMUQsV0FBSyxJQUFJLFFBQVEsdUNBQXVDLEVBQUUsU0FBUyxNQUFNLFFBQVEsQ0FBQztBQUNsRixhQUFPLFFBQVE7QUFBQSxJQUNqQixDQUFDO0FBQUEsRUFDSCxDQUFDO0FBQ0QsU0FBTyxHQUFHLFNBQVMsQ0FBQyxVQUFVO0FBQzVCLFNBQUssSUFBSSxTQUFTLDRCQUE0QixFQUFFLFNBQVMsTUFBTSxRQUFRLENBQUM7QUFBQSxFQUMxRSxDQUFDO0FBQ0QsU0FBTyxPQUFPLEtBQUssTUFBTSxLQUFLLE1BQU0sTUFBTTtBQUN4QyxTQUFLLElBQUksUUFBUSx5Q0FBeUMsS0FBSyxJQUFJLElBQUksS0FBSyxJQUFJLEdBQUc7QUFBQSxFQUNyRixDQUFDO0FBQ0QsaUJBQWU7QUFDZixNQUFJLEtBQUssZ0JBQWdCO0FBQ3ZCLGVBQVcsV0FBVyxDQUFDLEtBQUssTUFBTyxHQUFLLEdBQUc7QUFDekMsWUFBTSxRQUFRLFdBQVcseUJBQXlCLE9BQU87QUFDekQsWUFBTSxRQUFRO0FBQUEsSUFDaEI7QUFBQSxFQUNGO0FBQ0Y7QUFFQSxTQUFTLDRCQUE0QkMsTUFBa0I7QUFDckQsMEJBQVEsbUJBQW1CLHVCQUF1QjtBQUNsRCwwQkFBUSxtQkFBbUIsd0JBQXdCO0FBQ25ELDBCQUFRLG1CQUFtQixzQkFBc0I7QUFDakQsMEJBQVEsbUJBQW1CLG9CQUFvQjtBQUUvQywwQkFBUSxHQUFHLHlCQUF5QixDQUFDLE9BQU8sWUFBWTtBQUN0RCxRQUFJLENBQUMsc0JBQXNCLE1BQU0sTUFBTSxFQUFHO0FBQzFDLFVBQU0sV0FBV0MsVUFBUyxPQUFPO0FBQ2pDLFVBQU0sS0FBSyxPQUFPLFVBQVUsT0FBTyxXQUFXLFNBQVMsS0FBSztBQUM1RCxVQUFNLFVBQVUsZUFBZSxJQUFJLEVBQUU7QUFDckMsUUFBSSxDQUFDLFFBQVM7QUFDZCxtQkFBZSxPQUFPLEVBQUU7QUFDeEIsaUJBQWEsUUFBUSxLQUFLO0FBQzFCLFFBQUksVUFBVSxPQUFPLE1BQU07QUFDekIsY0FBUSxRQUFRLFNBQVMsS0FBSztBQUFBLElBQ2hDLE9BQU87QUFDTCxjQUFRLE9BQU8sSUFBSSxNQUFNLE9BQU8sVUFBVSxVQUFVLFdBQVcsU0FBUyxRQUFRLHVCQUF1QixDQUFDO0FBQUEsSUFDMUc7QUFBQSxFQUNGLENBQUM7QUFFRCwwQkFBUSxHQUFHLDBCQUEwQixDQUFDLE9BQU8sWUFBWTtBQUN2RCxRQUFJLENBQUMsc0JBQXNCLE1BQU0sTUFBTSxFQUFHO0FBQzFDLHFCQUFpQixFQUFFLE1BQU0sb0JBQW9CLFFBQVEsQ0FBQztBQUFBLEVBQ3hELENBQUM7QUFFRCwwQkFBUSxHQUFHLHdCQUF3QixDQUFDLE9BQU8sVUFBVSxZQUFZO0FBQy9ELFFBQUksQ0FBQyxzQkFBc0IsTUFBTSxNQUFNLEVBQUc7QUFDMUMsUUFBSSxPQUFPLGFBQWEsU0FBVTtBQUNsQyxxQkFBaUIsRUFBRSxNQUFNLGtCQUFrQixVQUFVLFFBQVEsQ0FBQztBQUFBLEVBQ2hFLENBQUM7QUFFRCwwQkFBUSxHQUFHLHNCQUFzQixDQUFDLE9BQU8sVUFBVTtBQUNqRCxRQUFJLENBQUMsc0JBQXNCLE1BQU0sTUFBTSxFQUFHO0FBQzFDLHFCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLE1BQU0sQ0FBQztBQUFBLEVBQ2xFLENBQUM7QUFFRCxVQUFRLEtBQUssUUFBUSxNQUFNO0FBQ3pCLGVBQVcsV0FBVyxlQUFlLE9BQU8sR0FBRztBQUM3QyxtQkFBYSxRQUFRLEtBQUs7QUFDMUIsY0FBUSxPQUFPLElBQUksTUFBTSxtQ0FBbUMsQ0FBQztBQUFBLElBQy9EO0FBQ0EsbUJBQWUsTUFBTTtBQUNyQixlQUFXLFVBQVUsZUFBZ0IsUUFBTyxNQUFNO0FBQ2xELG1CQUFlLE1BQU07QUFDckIsUUFBSTtBQUNGLFVBQUksY0FBYyxDQUFDLFdBQVcsWUFBWSxZQUFZLEdBQUc7QUFDdkQsbUJBQVcsWUFBWSxNQUFNLEVBQUUscUJBQXFCLE1BQU0sQ0FBQztBQUFBLE1BQzdEO0FBQUEsSUFDRixTQUFTLE9BQU87QUFDZCxNQUFBRCxLQUFJLFFBQVEsa0NBQWtDLEVBQUUsU0FBUyxPQUFPLEtBQUssRUFBRSxDQUFDO0FBQUEsSUFDMUU7QUFBQSxFQUNGLENBQUM7QUFDSDtBQUVBLGVBQWUsa0JBQWtCLEtBQXNCLEtBQW9DO0FBQ3pGLFFBQU0sVUFBVSxlQUFlO0FBQy9CLFFBQU0sTUFBTSxXQUFXLEdBQUc7QUFDMUIsTUFBSSxDQUFDLEtBQUs7QUFDUixhQUFTLEtBQUssS0FBSyxpQkFBaUIsMkJBQTJCO0FBQy9EO0FBQUEsRUFDRjtBQUVBLE1BQUksSUFBSSxhQUFhLDhCQUE4QjtBQUNqRCxhQUFTLEtBQUssS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDO0FBQy9CO0FBQUEsRUFDRjtBQUVBLE1BQUksSUFBSSxhQUFhLDhCQUE4QjtBQUNqRCxRQUFJLElBQUksV0FBVyxRQUFRO0FBQ3pCLGVBQVMsS0FBSyxLQUFLLHdCQUF3QiwyQkFBMkI7QUFDdEU7QUFBQSxJQUNGO0FBQ0EsVUFBTSxPQUFPQyxVQUFTLE1BQU0sYUFBYSxHQUFHLENBQUM7QUFDN0MsVUFBTSxTQUFTLE9BQU8sTUFBTSxXQUFXLFdBQVcsS0FBSyxTQUFTO0FBQ2hFLFVBQU0sT0FBTyxNQUFNLFFBQVEsTUFBTSxJQUFJLElBQUksS0FBSyxPQUFPLENBQUM7QUFDdEQsUUFBSTtBQUNGLFlBQU0sUUFBUSxNQUFNLGlCQUFpQixRQUFRLElBQUk7QUFDakQsZUFBUyxLQUFLLEtBQUssRUFBRSxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBQUEsSUFDeEMsU0FBUyxPQUFPO0FBQ2QsZUFBUyxLQUFLLEtBQUs7QUFBQSxRQUNqQixJQUFJO0FBQUEsUUFDSixPQUFPLGlCQUFpQixRQUFRLE1BQU0sVUFBVSxPQUFPLEtBQUs7QUFBQSxNQUM5RCxDQUFDO0FBQUEsSUFDSDtBQUNBO0FBQUEsRUFDRjtBQUVBLE1BQUksSUFBSSxhQUFhLGlDQUFpQztBQUNwRCxRQUFJLElBQUksV0FBVyxTQUFTLElBQUksV0FBVyxRQUFRO0FBQ2pELGVBQVMsS0FBSyxLQUFLLHdCQUF3QiwyQkFBMkI7QUFDdEU7QUFBQSxJQUNGO0FBQ0EsVUFBTSxTQUFTLG9CQUFvQixNQUFNLG9CQUFvQixPQUFPLENBQUM7QUFDckUsZUFBVyxLQUFLLEtBQUssT0FBTyxLQUFLLE1BQU0sR0FBRyxXQUFXLEtBQUssR0FBRyxJQUFJLFdBQVcsTUFBTTtBQUNsRjtBQUFBLEVBQ0Y7QUFFQSxNQUFJLElBQUksV0FBVyxTQUFTLElBQUksV0FBVyxRQUFRO0FBQ2pELGFBQVMsS0FBSyxLQUFLLHdCQUF3QiwyQkFBMkI7QUFDdEU7QUFBQSxFQUNGO0FBRUEsTUFBSSxJQUFJLGFBQWEsT0FBTyxJQUFJLGFBQWEsZUFBZTtBQUMxRCxVQUFNLE9BQU8sTUFBTSxpQkFBaUIsT0FBTztBQUMzQyxlQUFXLEtBQUssS0FBSyxPQUFPLEtBQUssSUFBSSxHQUFHLFdBQVcsT0FBTyxHQUFHLElBQUksV0FBVyxNQUFNO0FBQ2xGO0FBQUEsRUFDRjtBQUVBLFFBQU0sT0FBTyxZQUFZLElBQUksUUFBUTtBQUNyQyxNQUFJLENBQUMsTUFBTTtBQUNULGFBQVMsS0FBSyxLQUFLLGVBQWUsMkJBQTJCO0FBQzdEO0FBQUEsRUFDRjtBQUNBLFFBQU0sY0FBVSw4QkFBYSxJQUFJO0FBQ2pDLGFBQVcsS0FBSyxLQUFLLFNBQVMsU0FBUyxJQUFJLEdBQUcsSUFBSSxXQUFXLE1BQU07QUFDckU7QUFFQSxlQUFlLGNBQWMsS0FBc0IsUUFBZ0IsTUFBNkI7QUFDOUYsUUFBTSxNQUFNLFdBQVcsR0FBRztBQUMxQixNQUFJLENBQUMsSUFBSyxPQUFNLElBQUksTUFBTSxtQkFBbUI7QUFDN0MsTUFBSSxJQUFJLGFBQWEsNkJBQTZCLElBQUksYUFBYSwrQkFBK0I7QUFDaEcsV0FBTyxRQUFRO0FBQ2Y7QUFBQSxFQUNGO0FBQ0EsUUFBTSxLQUFLLGdCQUFnQixLQUFLLFFBQVEsSUFBSTtBQUM1QyxNQUFJLElBQUksYUFBYSwrQkFBK0I7QUFDbEQsbUJBQWUsSUFBSSxFQUFFO0FBQ3JCLE9BQUcsUUFBUSxNQUFNLGVBQWUsT0FBTyxFQUFFLENBQUM7QUFDMUMsT0FBRyxTQUFTLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDN0I7QUFBQSxFQUNGO0FBRUEsUUFBTSxPQUFPLE1BQU0sb0JBQW9CO0FBQ3ZDLFFBQU0sRUFBRSxPQUFPLE1BQU0sSUFBSSxJQUFJLG1DQUFtQjtBQUNoRCxPQUFLLFlBQVksWUFBWSxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO0FBQzlELCtCQUE2QixPQUFPLEVBQUU7QUFDeEM7QUFFQSxlQUFlLGlCQUFpQixTQUFrRDtBQUNoRixRQUFNLGdCQUFZLHdCQUFLLFlBQVksR0FBRyxZQUFZO0FBQ2xELE1BQUksT0FBTyxzQkFBa0IsOEJBQWEsV0FBVyxNQUFNLENBQUM7QUFDNUQsUUFBTSxPQUFPO0FBQ2IsTUFBSSxLQUFLLFNBQVMsU0FBUyxHQUFHO0FBQzVCLFdBQU8sS0FBSyxRQUFRLFdBQVcsR0FBRyxJQUFJO0FBQUEsVUFBYTtBQUFBLEVBQ3JELE9BQU87QUFDTCxXQUFPLEdBQUcsSUFBSTtBQUFBLEVBQUssSUFBSTtBQUFBLEVBQ3pCO0FBQ0EsU0FBTztBQUNUO0FBRUEsU0FBUyxrQkFBa0IsTUFBc0I7QUFDL0MsU0FBTyxLQUFLO0FBQUEsSUFDVjtBQUFBLElBQ0EsQ0FBQyxRQUFRLFFBQWdCLFNBQWlCLFdBQW1CO0FBQzNELFlBQU0sYUFBYSxtQkFBbUIsb0JBQW9CLE9BQU8sQ0FBQztBQUNsRSxpQkFBVyxJQUFJLGFBQWEsaUNBQWlDO0FBQzdELGlCQUFXLElBQUksYUFBYSxpQ0FBaUM7QUFDN0QsaUJBQVcsSUFBSSxlQUFlLDBDQUEwQztBQUN4RSxhQUFPLEdBQUcsTUFBTSxHQUFHLG9CQUFvQixvQkFBb0IsVUFBVSxDQUFDLENBQUMsR0FBRyxNQUFNO0FBQUEsSUFDbEY7QUFBQSxFQUNGO0FBQ0Y7QUFFQSxTQUFTLG1CQUFtQixTQUFzQztBQUNoRSxRQUFNLGFBQWEsb0JBQUksSUFBb0I7QUFDM0MsYUFBVyxRQUFRLFFBQVEsTUFBTSxHQUFHLEdBQUc7QUFDckMsVUFBTSxVQUFVLEtBQUssS0FBSztBQUMxQixRQUFJLENBQUMsUUFBUztBQUNkLFVBQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxJQUFJLFFBQVEsTUFBTSxLQUFLO0FBQzNDLFFBQUksQ0FBQyxLQUFNO0FBQ1gsZUFBVyxJQUFJLE1BQU0sS0FBSyxLQUFLLEdBQUcsQ0FBQztBQUFBLEVBQ3JDO0FBQ0EsU0FBTztBQUNUO0FBRUEsU0FBUyxvQkFBb0IsWUFBeUM7QUFDcEUsU0FBTyxDQUFDLEdBQUcsV0FBVyxRQUFRLENBQUMsRUFDNUIsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLE1BQU8sUUFBUSxHQUFHLElBQUksSUFBSSxLQUFLLEtBQUssSUFBSyxFQUMxRCxLQUFLLElBQUk7QUFDZDtBQUVBLFNBQVMsb0JBQW9CLE9BQXVCO0FBQ2xELFNBQU8sTUFDSixRQUFRLFdBQVcsR0FBRyxFQUN0QixRQUFRLFVBQVUsR0FBRyxFQUNyQixRQUFRLFNBQVMsR0FBRyxFQUNwQixRQUFRLFNBQVMsR0FBRyxFQUNwQixRQUFRLFVBQVUsR0FBRztBQUMxQjtBQUVBLFNBQVMsb0JBQW9CLE9BQXVCO0FBQ2xELFNBQU8sTUFDSixRQUFRLE1BQU0sT0FBTyxFQUNyQixRQUFRLE1BQU0sUUFBUTtBQUMzQjtBQUVBLGVBQWUsb0JBQW9CLFNBQXdEO0FBQ3pGLFFBQU0sb0JBQW9CO0FBQzFCLFFBQU0sQ0FBQyxVQUFVLG9CQUFvQixtQkFBbUIsYUFBYSxlQUFlLElBQUksTUFBTSxRQUFRLElBQUk7QUFBQSxJQUN4RyxpQkFBaUIsWUFBWSxDQUFDLENBQUM7QUFBQSxJQUMvQixpQkFBaUIsZUFBZSxDQUFDLENBQUM7QUFBQSxJQUNsQyxpQkFBaUIsaUJBQWlCLENBQUMsQ0FBQztBQUFBLElBQ3BDLGlCQUFpQixlQUFlLENBQUMsQ0FBQztBQUFBLElBQ2xDLGlCQUFpQixtQkFBbUIsQ0FBQyxDQUFDO0FBQUEsRUFDeEMsQ0FBQztBQUNELE1BQUksUUFBUSxlQUFnQix5QkFBd0I7QUFDcEQsU0FBTztBQUFBLElBQ0wsVUFBVSxjQUFjLFFBQVE7QUFBQSxJQUNoQyxvQkFBb0IsT0FBTyx1QkFBdUIsV0FBVyxxQkFBcUIsMEJBQTBCO0FBQUEsSUFDNUc7QUFBQSxJQUNBO0FBQUEsSUFDQSxpQkFBaUIsb0JBQW9CO0FBQUEsSUFDckMsVUFBVSxRQUFRO0FBQUEsSUFDbEIsTUFBTSxRQUFRO0FBQUEsRUFDaEI7QUFDRjtBQUVBLGVBQWUsc0JBQThDO0FBQzNELE1BQUksY0FBYyxDQUFDLFdBQVcsWUFBWSxZQUFZLEVBQUcsUUFBTztBQUNoRSxRQUFNLFVBQVUsZUFBZTtBQUMvQixRQUFNLFdBQVcsTUFBTSxzQkFBc0IsT0FBTztBQUNwRCxRQUFNLGdCQUFnQixTQUFTO0FBQy9CLE1BQUksQ0FBQyxlQUFlLGdCQUFnQjtBQUNsQyxVQUFNLElBQUksTUFBTSxvREFBb0Q7QUFBQSxFQUN0RTtBQUVBLFFBQU0sT0FBTyxJQUFJLDRCQUFZO0FBQUEsSUFDM0IsZ0JBQWdCO0FBQUEsTUFDZCxTQUFTLGNBQWMsU0FBUztBQUFBLE1BQ2hDLGtCQUFrQjtBQUFBLE1BQ2xCLGlCQUFpQjtBQUFBLE1BQ2pCLFlBQVk7QUFBQSxNQUNaLFVBQVUsY0FBYyxTQUFTO0FBQUEsSUFDbkM7QUFBQSxFQUNGLENBQUM7QUFDRCxRQUFNLGFBQWEsc0JBQXNCLElBQUk7QUFDN0MsZ0JBQWMsZUFBZSxZQUFZLFNBQVMsT0FBTyxXQUFXO0FBQ3BFLFFBQU0sVUFBVSxTQUFTLDJCQUEyQixLQUFLLFdBQVcsS0FBSyxTQUFTLGFBQWEsT0FBTztBQUN0RyxXQUFTLGlCQUFpQixVQUFVO0FBQ3BDLFFBQU0sS0FBSyxZQUFZLFFBQVEsYUFBYTtBQUM1QyxlQUFhLEVBQUUsTUFBTSxhQUFhLEtBQUssWUFBWTtBQUNuRCxPQUFLLFlBQVksS0FBSyxhQUFhLE1BQU07QUFDdkMsUUFBSSxZQUFZLGdCQUFnQixLQUFLLFlBQWEsY0FBYTtBQUFBLEVBQ2pFLENBQUM7QUFDRCxVQUFRLElBQUksUUFBUSxnQ0FBZ0MsRUFBRSxlQUFlLEtBQUssWUFBWSxHQUFHLENBQUM7QUFDMUYsU0FBTztBQUNUO0FBRUEsZUFBZSxzQkFBc0IsU0FBK0Q7QUFDbEcsUUFBTSxVQUFVLEtBQUssSUFBSTtBQUN6QixTQUFPLEtBQUssSUFBSSxJQUFJLFVBQVUsS0FBUTtBQUNwQyxVQUFNLFdBQVcsUUFBUSxrQkFBa0I7QUFDM0MsUUFDRSxVQUFVLGVBQWUsbUJBQ3hCLFNBQVMsY0FBYyxTQUFTLDJCQUNqQztBQUNBLGFBQU87QUFBQSxJQUNUO0FBQ0EsVUFBTSxNQUFNLEdBQUc7QUFBQSxFQUNqQjtBQUNBLFFBQU0sSUFBSSxNQUFNLDZDQUE2QztBQUMvRDtBQUVBLFNBQVMsaUJBQWlCLFFBQWdCLE1BQW1DO0FBQzNFLHFCQUFtQixNQUFNO0FBQ3pCLFNBQU8sb0JBQW9CLEVBQUUsS0FBSyxDQUFDLFNBQVM7QUFDMUMsVUFBTSxTQUFLLCtCQUFXO0FBQ3RCLFdBQU8sSUFBSSxRQUFRLENBQUNDLFVBQVMsV0FBVztBQUN0QyxZQUFNLFFBQVEsV0FBVyxNQUFNO0FBQzdCLHVCQUFlLE9BQU8sRUFBRTtBQUN4QixlQUFPLElBQUksTUFBTSxtREFBbUQsTUFBTSxFQUFFLENBQUM7QUFBQSxNQUMvRSxHQUFHLElBQU07QUFDVCxxQkFBZSxJQUFJLElBQUksRUFBRSxTQUFBQSxVQUFTLFFBQVEsTUFBTSxDQUFDO0FBQ2pELFdBQUssWUFBWSxLQUFLLHdCQUF3QixFQUFFLElBQUksUUFBUSxLQUFLLENBQUM7QUFBQSxJQUNwRSxDQUFDO0FBQUEsRUFDSCxDQUFDO0FBQ0g7QUFFQSxTQUFTLDZCQUE2QixNQUFnQyxJQUErQjtBQUNuRyxNQUFJLFNBQVM7QUFDYixRQUFNLFFBQVEsTUFBTTtBQUNsQixRQUFJLE9BQVE7QUFDWixhQUFTO0FBQ1QsUUFBSTtBQUNGLFdBQUssWUFBWSxJQUFJO0FBQUEsSUFDdkIsUUFBUTtBQUFBLElBQUM7QUFDVCxRQUFJO0FBQ0YsV0FBSyxNQUFNO0FBQUEsSUFDYixRQUFRO0FBQUEsSUFBQztBQUNULE9BQUcsTUFBTTtBQUFBLEVBQ1g7QUFDQSxPQUFLLE1BQU07QUFDWCxPQUFLLEdBQUcsV0FBVyxDQUFDLFVBQVU7QUFDNUIsUUFBSSxPQUFRO0FBQ1osUUFBSSxNQUFNLFFBQVEsTUFBTTtBQUN0QixZQUFNO0FBQ047QUFBQSxJQUNGO0FBQ0EsUUFBSSxPQUFPLE1BQU0sU0FBUyxVQUFVO0FBQ2xDLFNBQUcsU0FBUyxNQUFNLElBQUk7QUFBQSxJQUN4QjtBQUFBLEVBQ0YsQ0FBQztBQUNELE9BQUssR0FBRyxTQUFTLEtBQUs7QUFDdEIsS0FBRyxPQUFPLENBQUMsU0FBUztBQUNsQixRQUFJLE9BQVE7QUFDWixTQUFLLFlBQVksSUFBSTtBQUFBLEVBQ3ZCLENBQUM7QUFDRCxLQUFHLFFBQVEsS0FBSztBQUNsQjtBQUVBLFNBQVMsaUJBQWlCLFNBQXdCO0FBQ2hELGFBQVcsVUFBVSxDQUFDLEdBQUcsY0FBYyxHQUFHO0FBQ3hDLFFBQUk7QUFDRixhQUFPLFNBQVMsT0FBTztBQUFBLElBQ3pCLFFBQVE7QUFDTixhQUFPLE1BQU07QUFDYixxQkFBZSxPQUFPLE1BQU07QUFBQSxJQUM5QjtBQUFBLEVBQ0Y7QUFDRjtBQUVBLFNBQVMsb0JBQW9CLE9BQTZCO0FBQ3hELFNBQU87QUFBQTtBQUFBLHlCQUVnQixTQUFTLEtBQUssQ0FBQztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7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ICJpbXBvcnRfZnMiLCAiaW1wb3J0X3Byb21pc2VzIiwgInN5c1BhdGgiLCAicHJlc29sdmUiLCAiYmFzZW5hbWUiLCAicGpvaW4iLCAicHJlbGF0aXZlIiwgInBzZXAiLCAiaW1wb3J0X3Byb21pc2VzIiwgIm9zVHlwZSIsICJmc193YXRjaCIsICJyYXdFbWl0dGVyIiwgImxpc3RlbmVyIiwgImJhc2VuYW1lIiwgImRpcm5hbWUiLCAibmV3U3RhdHMiLCAiY2xvc2VyIiwgImZzcmVhbHBhdGgiLCAicmVzb2x2ZSIsICJyZWFscGF0aCIsICJzdGF0cyIsICJyZWxhdGl2ZSIsICJET1VCTEVfU0xBU0hfUkUiLCAidGVzdFN0cmluZyIsICJwYXRoIiwgInN0YXRzIiwgInN0YXRjYiIsICJub3ciLCAic3RhdCIsICJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9wYXRoIiwgInNlc3Npb24iLCAic2hlbGwiLCAiQnJvd3NlcldpbmRvdyIsICJCcm93c2VyVmlldyIsICJwbGF0Zm9ybSIsICJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9wYXRoIiwgInVzZXJSb290IiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX3BhdGgiLCAibG9nIiwgImFzUmVjb3JkIiwgInJlc29sdmUiLCAiaW1wb3J0X25vZGVfZnMiLCAiaW1wb3J0X25vZGVfcGF0aCIsICJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9vcyIsICJpbXBvcnRfbm9kZV9wYXRoIiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX2NoaWxkX3Byb2Nlc3MiLCAiaW1wb3J0X25vZGVfY3J5cHRvIiwgImltcG9ydF9ub2RlX3BhdGgiLCAiaW1wb3J0X25vZGVfb3MiLCAiaW1wb3J0X25vZGVfY3J5cHRvIiwgInBsYXRmb3JtIiwgInN0YXQiLCAiaW1wb3J0X25vZGVfY3J5cHRvIiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX2NoaWxkX3Byb2Nlc3MiLCAiaW1wb3J0X25vZGVfcGF0aCIsICJpbXBvcnRfbm9kZV9vcyIsICJleHBvcnRzIiwgImluZmVyTWFjQXBwUm9vdCIsICJWRVJTSU9OX1JFIiwgIm5vcm1hbGl6ZVZlcnNpb24iLCAiY29tcGFyZVZlcnNpb25zIiwgImltcG9ydF9lbGVjdHJvbiIsICJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9jcnlwdG8iLCAiaW1wb3J0X2VsZWN0cm9uIiwgIm1ha2VXaW5kb3dMaWtlRm9yVmlldyIsICJhc1JlY29yZCIsICJhc1JlY29yZCIsICJtYWtlV2luZG93TGlrZUZvclZpZXciLCAiaW1wb3J0X2VsZWN0cm9uIiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX3BhdGgiLCAiaW1wb3J0X25vZGVfZnMiLCAiaW1wb3J0X25vZGVfcGF0aCIsICJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9wYXRoIiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX3BhdGgiLCAiaW1wb3J0X2VsZWN0cm9uIiwgImltcG9ydF9ub2RlX2NoaWxkX3Byb2Nlc3MiLCAiaW1wb3J0X25vZGVfY3J5cHRvIiwgImltcG9ydF9ub2RlX2ZzIiwgImxvZyIsICJhc3NlcnRCcmlkZ2VJZCIsICJleHBvcnRzIiwgImFzUmVjb3JkIiwgIndpbmRvd0lkRm9yIiwgInJlc29sdmUiLCAiaXNXaW5kb3dEZXN0cm95ZWQiLCAid2ViQ29udGVudHMiLCAiVVBEQVRFX0NIRUNLX0lOVEVSVkFMX01TIiwgInBsYXRmb3JtIiwgInN0YXQiXQp9Cg==
