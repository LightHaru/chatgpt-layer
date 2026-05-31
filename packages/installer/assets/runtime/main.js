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
var import_electron3 = require("electron");
var import_node_fs9 = require("node:fs");
var import_node_child_process3 = require("node:child_process");
var import_node_crypto2 = require("node:crypto");
var import_node_path8 = require("node:path");
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
    return new Promise((resolve6, reject) => {
      if (!stream)
        return reject();
      stream.once(STR_END, () => {
        if (this.fsw.closed) {
          stream = void 0;
          return;
        }
        const wasThrottled = throttler ? throttler.clear() : false;
        resolve6(void 0);
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
        const relative5 = sysPath2.relative(matcher.path, string);
        if (!relative5) {
          return false;
        }
        return !relative5.startsWith("..") && !sysPath2.isAbsolute(relative5);
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

// src/codex-runtime-probe.ts
var import_electron = require("electron");
var import_node_fs6 = require("node:fs");
var import_node_path6 = require("node:path");
function getRuntimeInfo(opts) {
  return {
    type: detectRuntimeType(),
    codexVersion: opts.codexVersion ?? safeAppVersion(),
    channel: opts.channel,
    buildFlavor: safeBuildFlavor(),
    usesOwlAppShell: null,
    appPath: safeAppPath(),
    resourcesPath: process.resourcesPath ?? null
  };
}
function getRuntimeCapabilities(opts) {
  const services = asRecord(opts.getWindowServices());
  const windowManager = asRecord(services?.windowManager);
  const cdp = getCdpStatus();
  const native = opts.getNativeCapabilities?.() ?? defaultNativeCapabilities();
  const views = opts.getViewCapabilities?.() ?? defaultViewCapabilities();
  const canCreateWindow = typeof windowManager?.createWindow === "function" || typeof services?.createFreshWindow === "function" || typeof services?.createFreshLocalWindow === "function" || typeof services?.ensureHostWindow === "function";
  return {
    windows: {
      create: canCreateWindow,
      focus: true,
      primary: typeof services?.getPrimaryWindow === "function" || typeof windowManager?.getPrimaryWindow === "function",
      browserView: typeof windowManager?.registerWindow === "function"
    },
    views,
    cdp: {
      supported: true,
      enabled: cdp.enabled,
      port: cdp.port
    },
    native
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
function detectRuntimeType() {
  if (process.platform === "darwin") {
    const appRoot = inferMacAppRoot();
    if (appRoot && (0, import_node_fs6.existsSync)((0, import_node_path6.join)(appRoot, "Contents", "Frameworks", "Codex Framework.framework"))) {
      return "owl";
    }
    if (appRoot && (0, import_node_fs6.existsSync)((0, import_node_path6.join)(appRoot, "Contents", "Frameworks", "Electron Framework.framework"))) {
      return "electron";
    }
    if (process.resourcesPath && (0, import_node_fs6.existsSync)((0, import_node_path6.join)(process.resourcesPath, "app.asar"))) {
      return "electron";
    }
    return "unknown";
  }
  return process.resourcesPath && (0, import_node_fs6.existsSync)((0, import_node_path6.join)(process.resourcesPath, "app.asar")) ? "electron" : "unknown";
}
function inferMacAppRoot() {
  const marker = ".app/Contents/MacOS/";
  const idx = process.execPath.indexOf(marker);
  return idx >= 0 ? process.execPath.slice(0, idx + ".app".length) : null;
}
function safeAppVersion() {
  try {
    return import_electron.app.getVersion();
  } catch {
    return null;
  }
}
function safeAppPath() {
  try {
    return import_electron.app.getAppPath();
  } catch {
    return process.resourcesPath ? (0, import_node_path6.join)(process.resourcesPath, "app.asar") : null;
  }
}
function safeBuildFlavor() {
  const appPath = safeAppPath();
  if (!appPath) return null;
  const parent = (0, import_node_path6.dirname)(appPath);
  if (parent.includes("Nightly")) return "nightly";
  return import_electron.app.isPackaged ? "prod" : "dev";
}
function parseCdpPort(value) {
  const parsed = Number(value ?? "9222");
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : 9222;
}
function defaultNativeCapabilities() {
  return {
    inProcessModules: true,
    swiftModules: process.platform === "darwin",
    appKitEmbedding: false,
    childWindowOverlay: false,
    directViewAttach: false,
    metalViews: false,
    nativeHost: false,
    helpers: true
  };
}
function defaultViewCapabilities() {
  return {
    create: false,
    privateViewTree: false,
    webContentsView: false,
    browserViewFallback: typeof import_electron.BrowserWindow.fromId === "function"
  };
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
function asRecord(value) {
  return value && typeof value === "object" ? value : null;
}

// src/native-bridge.ts
var import_electron2 = require("electron");
var import_node_child_process2 = require("node:child_process");
var import_node_crypto = require("node:crypto");
var import_node_fs8 = require("node:fs");
var import_node_readline = require("node:readline");

// src/native-paths.ts
var import_node_fs7 = require("node:fs");
var import_node_path7 = require("node:path");
function resolveNativeTweakPath(tweakDir, path) {
  if (typeof path !== "string" || path.trim() === "") throw new Error("native path is required");
  const root = (0, import_node_fs7.realpathSync)(tweakDir);
  const full = (0, import_node_path7.resolve)(tweakDir, path);
  let target;
  try {
    target = (0, import_node_fs7.realpathSync)(full);
  } catch {
    throw new Error("native path does not exist");
  }
  if (!isPathInside(root, target) || target === root) {
    throw new Error("native path must stay inside the tweak directory");
  }
  return target;
}
function isPathInside(parent, target) {
  const rel = (0, import_node_path7.relative)((0, import_node_path7.resolve)(parent), (0, import_node_path7.resolve)(target));
  return rel === "" || !!rel && !rel.startsWith("..") && !(0, import_node_path7.isAbsolute)(rel);
}

// src/native-bridge.ts
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
    const id = assertBridgeId(options.id, "native module id");
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
    const id = assertBridgeId(options.id, "native helper id");
    if ((options.transport ?? "stdio") !== "stdio") {
      throw new Error("native helpers support only stdio transport in Codex++ 1.0.0");
    }
    if ((options.restart ?? "never") !== "never") {
      throw new Error("native helper restart policies are not available in Codex++ 1.0.0");
    }
    const executable = resolveTweakPath(ctx, options.executable);
    const args = options.args ?? [];
    const env = { ...process.env, ...options.env ?? {} };
    const child = (0, import_node_child_process2.spawn)(executable, args, {
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
    const target = asRecord2(mod.exports);
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
    const fn = asRecord2(target)?.[factory];
    if (typeof fn !== "function") {
      const label = moduleId ? `native module ${ctx.id}:${moduleId}` : "Codex++ native host";
      throw new Error(`${label} has no factory ${factory}()`);
    }
    const parentWindow = typeof options.parentWindowId === "number" ? import_electron2.BrowserWindow.fromId(options.parentWindowId) : import_electron2.BrowserWindow.getFocusedWindow();
    const parentNativeHandle = nativeHandleForWindow(parentWindow);
    const value = await fn.call(target, {
      ...options,
      parentWindowId: windowIdFor(parentWindow),
      parentWebContentsId: webContentsIdFor(parentWindow),
      parentNativeHandle
    });
    const id = typeof asRecord2(value)?.id === "string" ? String(asRecord2(value)?.id) : (0, import_node_crypto.randomUUID)();
    const windowId = typeof asRecord2(value)?.windowId === "number" ? Number(asRecord2(value)?.windowId) : null;
    const instance = {
      key: instanceKey(ctx.id, id),
      tweakId: ctx.id,
      id,
      kind,
      value,
      parentWindowId: windowIdFor(parentWindow),
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
    if (!nativeHostPath || !(0, import_node_fs8.existsSync)(nativeHostPath)) {
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
    const getCapabilities = asRecord2(host)?.getCapabilities;
    if (typeof getCapabilities !== "function") return {};
    try {
      const capabilities = getCapabilities.call(host);
      return asRecord2(capabilities) ?? {};
    } catch (error) {
      this.log("warn", "Codex++ native host capability probe failed", error);
      return {};
    }
  }
  async invokeInstance(tweakId, id, method, args) {
    const instance = this.instanceFor(tweakId, id);
    const fn = asRecord2(instance.value)?.[method];
    if (typeof fn === "function") {
      await fn.apply(instance.value, args);
      return;
    }
    if (instance.windowId !== null) {
      const win = import_electron2.BrowserWindow.fromId(instance.windowId);
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
      const win = import_electron2.BrowserWindow.fromId(instance.windowId);
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
    const target = asRecord2(instance.value);
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
    const requestId = (0, import_node_crypto.randomUUID)();
    const payload = { id: requestId, message };
    return await new Promise((resolve6, reject) => {
      const timer = setTimeout(() => {
        helper.pending.delete(requestId);
        reject(new Error(`native helper request timed out: ${tweakId}:${id}`));
      }, timeoutMs);
      helper.pending.set(requestId, { resolve: resolve6, reject, timer });
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
  if (!entrypoint) return asRecord2(loaded)?.default ?? loaded;
  const selected = asRecord2(loaded)?.[entrypoint];
  if (selected === void 0) throw new Error(`native module entrypoint not found: ${entrypoint}`);
  return selected;
}
function assertBridgeId(value, label) {
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
function asRecord2(value) {
  return value && typeof value === "object" ? value : null;
}
async function callOptional(target, method, args) {
  const fn = asRecord2(target)?.[method];
  if (typeof fn === "function") await fn.apply(target, args);
}
function parentWindowState(parentWindow, reason) {
  if (isWindowDestroyed(parentWindow)) return null;
  const bounds = callWindowMethod(parentWindow, "getBounds");
  const contentBounds = callWindowMethod(parentWindow, "getContentBounds");
  return {
    reason,
    windowId: windowIdFor(parentWindow),
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
  if (!parentWindow || isWindowDestroyed(parentWindow)) return null;
  const fn = asRecord2(parentWindow)?.getNativeWindowHandle;
  if (typeof fn !== "function") return null;
  try {
    const handle = fn.call(parentWindow);
    return Buffer.isBuffer(handle) ? handle : null;
  } catch {
    return null;
  }
}
function canBindParentWindow(parentWindow) {
  if (!parentWindow || isWindowDestroyed(parentWindow)) return false;
  return typeof asRecord2(parentWindow)?.on === "function" && typeof asRecord2(parentWindow)?.off === "function";
}
function isWindowDestroyed(parentWindow) {
  const fn = asRecord2(parentWindow)?.isDestroyed;
  if (typeof fn !== "function") return false;
  try {
    return Boolean(fn.call(parentWindow));
  } catch {
    return true;
  }
}
function windowIdFor(parentWindow) {
  const id = asRecord2(parentWindow)?.id;
  return typeof id === "number" ? id : null;
}
function webContentsIdFor(parentWindow) {
  const webContents2 = asRecord2(asRecord2(parentWindow)?.webContents);
  const id = webContents2?.id;
  return typeof id === "number" ? id : null;
}
function callWindowMethod(parentWindow, method) {
  const fn = asRecord2(parentWindow)?.[method];
  if (typeof fn !== "function") return null;
  try {
    return fn.call(parentWindow);
  } catch {
    return null;
  }
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
var PRELOAD_PATH = (0, import_node_path8.resolve)(runtimeDir, "preload.js");
var TWEAKS_DIR = (0, import_node_path8.join)(userRoot, "tweaks");
var LOG_DIR = (0, import_node_path8.join)(userRoot, "log");
var LOG_FILE = (0, import_node_path8.join)(LOG_DIR, "main.log");
var CONFIG_FILE = (0, import_node_path8.join)(userRoot, "config.json");
var CODEX_CONFIG_FILE = (0, import_node_path8.join)((0, import_node_os2.homedir)(), ".codex", "config.toml");
var INSTALLER_STATE_FILE = (0, import_node_path8.join)(userRoot, "state.json");
var UPDATE_MODE_FILE = (0, import_node_path8.join)(userRoot, "update-mode.json");
var SELF_UPDATE_STATE_FILE = (0, import_node_path8.join)(userRoot, "self-update-state.json");
var SIGNED_CODEX_BACKUP = (0, import_node_path8.join)(userRoot, "backup", "Codex.app");
var CODEX_PLUSPLUS_VERSION = "1.0.0";
var CODEX_PLUSPLUS_REPO = "b-nnett/codex-plusplus";
var TWEAK_STORE_INDEX_URL = process.env.CODEX_PLUSPLUS_STORE_INDEX_URL ?? DEFAULT_TWEAK_STORE_INDEX_URL;
var CODEX_WINDOW_SERVICES_KEY = "__codexpp_window_services__";
(0, import_node_fs9.mkdirSync)(LOG_DIR, { recursive: true });
(0, import_node_fs9.mkdirSync)(TWEAKS_DIR, { recursive: true });
if (process.env.CODEXPP_REMOTE_DEBUG === "1") {
  const port = process.env.CODEXPP_REMOTE_DEBUG_PORT ?? "9222";
  import_electron3.app.commandLine.appendSwitch("remote-debugging-port", port);
  log("info", `remote debugging enabled on port ${port}`);
}
function readState() {
  try {
    return JSON.parse((0, import_node_fs9.readFileSync)(CONFIG_FILE, "utf8"));
  } catch {
    return {};
  }
}
function writeState(s) {
  try {
    (0, import_node_fs9.writeFileSync)(CONFIG_FILE, JSON.stringify(s, null, 2));
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
    return JSON.parse((0, import_node_fs9.readFileSync)(INSTALLER_STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}
function readSelfUpdateState() {
  try {
    return JSON.parse((0, import_node_fs9.readFileSync)(SELF_UPDATE_STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}
function writeSelfUpdateState(state) {
  try {
    (0, import_node_fs9.writeFileSync)(SELF_UPDATE_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    log("warn", "writeSelfUpdateState failed:", String(e.message));
  }
}
function cleanOptionalString(value) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  return trimmed ? trimmed : void 0;
}
function isPathInside2(parent, target) {
  const rel = (0, import_node_path8.relative)((0, import_node_path8.resolve)(parent), (0, import_node_path8.resolve)(target));
  return rel === "" || !!rel && !rel.startsWith("..") && !(0, import_node_path8.isAbsolute)(rel);
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
var nativeBridge = new NativeBridge(log, {
  nativeHostPath: (0, import_node_path8.join)(runtimeDir, "native", "codexpp_native_host.node")
});
var owlViews = /* @__PURE__ */ new Map();
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
import_electron3.app.whenReady().then(() => {
  log("info", "app ready fired");
  if (isCodexPlusPlusSafeModeEnabled()) {
    log("warn", "safe mode is enabled; preload will not be registered");
    return;
  }
  registerPreload(import_electron3.session.defaultSession, "defaultSession");
});
import_electron3.app.on("session-created", (s) => {
  if (isCodexPlusPlusSafeModeEnabled()) return;
  registerPreload(s, "session-created");
});
import_electron3.app.on("web-contents-created", (_e, wc) => {
  try {
    const wp = wc.getLastWebPreferences?.();
    log("info", "web-contents-created", {
      id: wc.id,
      type: wc.getType(),
      sessionIsDefault: wc.session === import_electron3.session.defaultSession,
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
log("info", "main.ts evaluated; app.isReady=" + import_electron3.app.isReady());
if (isCodexPlusPlusSafeModeEnabled()) {
  log("warn", "safe mode is enabled; tweaks will not be loaded");
}
loadAllMainTweaks();
import_electron3.app.on("will-quit", () => {
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
import_electron3.ipcMain.handle("codexpp:list-tweaks", async () => {
  await Promise.all(tweakState.discovered.map((t) => ensureTweakUpdateCheck(t)));
  const updateChecks = readState().tweakUpdateChecks ?? {};
  return tweakState.discovered.map((t) => ({
    manifest: t.manifest,
    entry: t.entry,
    dir: t.dir,
    entryExists: (0, import_node_fs9.existsSync)(t.entry),
    enabled: isTweakEnabled(t.manifest.id),
    update: updateChecks[t.manifest.id] ?? null
  }));
});
import_electron3.ipcMain.handle("codexpp:get-tweak-enabled", (_e, id) => isTweakEnabled(id));
import_electron3.ipcMain.handle("codexpp:set-tweak-enabled", (_e, id, enabled) => {
  return setTweakEnabledAndReload(id, enabled, tweakLifecycleDeps);
});
import_electron3.ipcMain.handle("codexpp:get-config", () => {
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
import_electron3.ipcMain.handle("codexpp:set-auto-update", (_e, enabled) => {
  setCodexPlusPlusAutoUpdate(!!enabled);
  return { autoUpdate: isCodexPlusPlusAutoUpdateEnabled() };
});
import_electron3.ipcMain.handle("codexpp:set-update-config", (_e, config) => {
  setCodexPlusPlusUpdateConfig(config);
  const s = readState();
  return {
    updateChannel: s.codexPlusPlus?.updateChannel ?? "stable",
    updateRepo: s.codexPlusPlus?.updateRepo ?? CODEX_PLUSPLUS_REPO,
    updateRef: s.codexPlusPlus?.updateRef ?? ""
  };
});
import_electron3.ipcMain.handle("codexpp:check-codexpp-update", async (_e, force) => {
  return ensureCodexPlusPlusUpdateCheck(force === true);
});
import_electron3.ipcMain.handle("codexpp:run-codexpp-update", async () => {
  const sourceRoot = readInstallerState()?.sourceRoot ?? fallbackSourceRoot();
  if (!sourceRoot) {
    throw new Error("Codex++ source CLI was not found. Run the installer once, then try again.");
  }
  const cli = (0, import_node_path8.join)(sourceRoot, "packages", "installer", "dist", "cli.js");
  if (!(0, import_node_fs9.existsSync)(cli)) {
    throw new Error("Codex++ source CLI was not found. Run the installer once, then try again.");
  }
  const pending = markSelfUpdateStarted(sourceRoot);
  startInstalledCli(cli, ["update", "--watcher"]);
  return pending;
});
import_electron3.ipcMain.handle("codexpp:get-watcher-health", () => getWatcherHealth(userRoot));
import_electron3.ipcMain.handle("codexpp:get-tweak-store", async () => {
  const store = await fetchTweakStoreRegistry();
  const registry = store.registry;
  const installed = new Map(tweakState.discovered.map((t) => [t.manifest.id, t]));
  const entries = shuffleStoreEntries(registry.entries, import_node_crypto2.randomInt);
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
import_electron3.ipcMain.handle("codexpp:install-store-tweak", async (_e, id) => {
  const { registry } = await fetchTweakStoreRegistry();
  const entry = registry.entries.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Tweak store entry not found: ${id}`);
  assertStoreEntryPlatformCompatible(entry);
  assertStoreEntryRuntimeCompatible(entry);
  await installStoreTweak(entry);
  reloadTweaks("store-install", tweakLifecycleDeps);
  return { installed: entry.id };
});
import_electron3.ipcMain.handle("codexpp:prepare-tweak-store-submission", async (_e, repoInput) => {
  return prepareTweakStoreSubmission(repoInput);
});
import_electron3.ipcMain.handle("codexpp:read-tweak-source", (_e, entryPath) => {
  const resolved = (0, import_node_path8.resolve)(entryPath);
  if (!isPathInside2(TWEAKS_DIR, resolved)) {
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
import_electron3.ipcMain.handle(
  "codexpp:read-tweak-asset",
  (_e, tweakDir, relPath) => {
    const fs = require("node:fs");
    const dir = (0, import_node_path8.resolve)(tweakDir);
    if (!isPathInside2(TWEAKS_DIR, dir)) {
      throw new Error("tweakDir outside tweaks dir");
    }
    const full = (0, import_node_path8.resolve)(dir, relPath);
    if (!isPathInside2(dir, full) || full === dir) {
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
import_electron3.ipcMain.on("codexpp:preload-log", (_e, level, msg) => {
  const lvl = level === "error" || level === "warn" ? level : "info";
  try {
    appendCappedLog((0, import_node_path8.join)(LOG_DIR, "preload.log"), `[${(/* @__PURE__ */ new Date()).toISOString()}] [${lvl}] ${msg}
`);
  } catch {
  }
});
import_electron3.ipcMain.handle("codexpp:tweak-fs", (_e, op, id, p, c) => {
  if (!/^[a-zA-Z0-9._-]+$/.test(id)) throw new Error("bad tweak id");
  const dir = (0, import_node_path8.join)(userRoot, "tweak-data", id);
  (0, import_node_fs9.mkdirSync)(dir, { recursive: true });
  const full = (0, import_node_path8.resolve)(dir, p);
  if (!isPathInside2(dir, full) || full === dir) throw new Error("path traversal");
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
import_electron3.ipcMain.handle("codexpp:user-paths", () => ({
  userRoot,
  runtimeDir,
  tweaksDir: TWEAKS_DIR,
  logDir: LOG_DIR
}));
import_electron3.ipcMain.handle("codexpp:codex-runtime-info", () => currentRuntimeInfo());
import_electron3.ipcMain.handle("codexpp:codex-runtime-capabilities", () => currentRuntimeCapabilities());
import_electron3.ipcMain.handle("codexpp:codex-cdp-status", () => getCdpStatus());
import_electron3.ipcMain.handle("codexpp:codex-cdp-targets", () => listCdpTargets());
import_electron3.ipcMain.handle("codexpp:codex-window-create", (_e, opts) => {
  return createCodexWindow(opts);
});
import_electron3.ipcMain.handle("codexpp:codex-window-primary", () => getPrimaryCodexWindowRef());
import_electron3.ipcMain.handle("codexpp:codex-window-focus", (_e, windowId) => focusCodexWindow(windowId));
import_electron3.ipcMain.handle("codexpp:codex-window-show", (_e, windowId) => showCodexWindow(windowId));
import_electron3.ipcMain.handle(
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
import_electron3.ipcMain.handle(
  "codexpp:codex-view-call",
  (_e, tweakId, viewId, method, arg, arg2) => {
    assertTweakViewPermissionForId(tweakId);
    return callOwlView(tweakId, viewId, method, arg, arg2);
  }
);
import_electron3.ipcMain.handle("codexpp:codex-view-dispose-tweak", (_e, tweakId) => {
  assertTweakId(tweakId);
  disposeOwlViewsForTweak(tweakId);
});
import_electron3.ipcMain.handle(
  "codexpp:native-load-module",
  (_e, tweakId, options) => {
    const ref = nativeBridge.loadModule(tweakContext(tweakId, "native-module"), options);
    return { id: ref.id, kind: ref.kind };
  }
);
import_electron3.ipcMain.handle(
  "codexpp:native-module-request",
  (_e, tweakId, moduleId, method, payload, timeoutMs) => {
    assertTweakPermissionForId(tweakId, "native-module");
    return nativeBridge.requestModule(tweakId, moduleId, method, payload, timeoutMs);
  }
);
import_electron3.ipcMain.handle("codexpp:native-module-dispose", (_e, tweakId, moduleId) => {
  assertTweakPermissionForId(tweakId, "native-module");
  return nativeBridge.disposeModule(tweakId, moduleId);
});
import_electron3.ipcMain.handle("codexpp:native-dispose-tweak", (_e, tweakId) => {
  assertTweakId(tweakId);
  nativeBridge.disposeTweak(tweakId);
});
import_electron3.ipcMain.handle(
  "codexpp:native-create-panel",
  async (_e, tweakId, options) => {
    const ref = await nativeBridge.createPanel(tweakContext(tweakId, "native-view"), options);
    return { id: ref.id, windowId: ref.windowId };
  }
);
import_electron3.ipcMain.handle(
  "codexpp:native-attach-view",
  async (_e, tweakId, options) => {
    const ref = await nativeBridge.attachView(tweakContext(tweakId, "native-view"), options);
    return { id: ref.id };
  }
);
import_electron3.ipcMain.handle(
  "codexpp:native-instance-call",
  async (_e, tweakId, kind, instanceId, method, arg) => {
    assertTweakPermissionForId(tweakId, "native-view");
    return nativeBridge.callInstance(tweakId, kind, instanceId, method, arg);
  }
);
import_electron3.ipcMain.handle(
  "codexpp:native-launch-helper",
  (_e, tweakId, options) => {
    const ref = nativeBridge.launchHelper(tweakContext(tweakId, "native-helper"), options);
    return { id: ref.id, pid: ref.pid };
  }
);
import_electron3.ipcMain.handle(
  "codexpp:native-helper-call",
  (_e, tweakId, helperId, method, payload, timeoutMs) => {
    assertTweakPermissionForId(tweakId, "native-helper");
    return nativeBridge.callHelper(tweakId, helperId, method, payload, timeoutMs);
  }
);
import_electron3.ipcMain.handle("codexpp:reveal", (_e, p) => {
  import_electron3.shell.openPath(p).catch(() => {
  });
});
import_electron3.ipcMain.handle("codexpp:open-external", (_e, url) => {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "github.com") {
    throw new Error("only github.com links can be opened from tweak metadata");
  }
  import_electron3.shell.openExternal(parsed.toString()).catch(() => {
  });
});
import_electron3.ipcMain.handle("codexpp:copy-text", (_e, text) => {
  import_electron3.clipboard.writeText(String(text));
  return true;
});
import_electron3.ipcMain.handle("codexpp:reload-tweaks", () => {
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
  import_electron3.app.on("will-quit", () => watcher.close().catch(() => {
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
  for (const key of Object.keys(require.cache)) {
    if (isPathInside2(TWEAKS_DIR, key)) delete require.cache[key];
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
  const work = (0, import_node_fs9.mkdtempSync)((0, import_node_path8.join)((0, import_node_os2.tmpdir)(), "codexpp-store-tweak-"));
  const archive = (0, import_node_path8.join)(work, "source.tar.gz");
  const extractDir = (0, import_node_path8.join)(work, "extract");
  const target = (0, import_node_path8.join)(TWEAKS_DIR, entry.id);
  const stagedTarget = (0, import_node_path8.join)(work, "staged", entry.id);
  try {
    log("info", `installing store tweak ${entry.id} from ${entry.repo}@${entry.approvedCommitSha}`);
    const res = await fetch(url, {
      headers: { "User-Agent": `codex-plusplus/${CODEX_PLUSPLUS_VERSION}` },
      redirect: "follow"
    });
    if (!res.ok) throw new Error(`download failed: ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    (0, import_node_fs9.writeFileSync)(archive, bytes);
    (0, import_node_fs9.mkdirSync)(extractDir, { recursive: true });
    extractTarArchive(archive, extractDir);
    const source = findTweakRoot(extractDir);
    if (!source) throw new Error("downloaded archive did not contain manifest.json");
    validateStoreTweakSource(entry, source);
    (0, import_node_fs9.rmSync)(stagedTarget, { recursive: true, force: true });
    copyTweakSource(source, stagedTarget);
    const stagedFiles = hashTweakSource(stagedTarget);
    (0, import_node_fs9.writeFileSync)(
      (0, import_node_path8.join)(stagedTarget, ".codexpp-store.json"),
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
    (0, import_node_fs9.rmSync)(target, { recursive: true, force: true });
    (0, import_node_fs9.cpSync)(stagedTarget, target, { recursive: true });
  } finally {
    (0, import_node_fs9.rmSync)(work, { recursive: true, force: true });
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
  const result = (0, import_node_child_process3.spawnSync)("tar", ["-xzf", archive, "-C", targetDir], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.status !== 0) {
    throw new Error(`tar extraction failed: ${result.stderr || result.stdout || result.status}`);
  }
}
function validateStoreTweakSource(entry, source) {
  const manifestPath = (0, import_node_path8.join)(source, "manifest.json");
  const manifest = JSON.parse((0, import_node_fs9.readFileSync)(manifestPath, "utf8"));
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
  if (!(0, import_node_fs9.existsSync)(dir)) return null;
  if ((0, import_node_fs9.existsSync)((0, import_node_path8.join)(dir, "manifest.json"))) return dir;
  for (const name of (0, import_node_fs9.readdirSync)(dir)) {
    const child = (0, import_node_path8.join)(dir, name);
    try {
      if (!(0, import_node_fs9.statSync)(child).isDirectory()) continue;
    } catch {
      continue;
    }
    const found = findTweakRoot(child);
    if (found) return found;
  }
  return null;
}
function copyTweakSource(source, target) {
  (0, import_node_fs9.cpSync)(source, target, {
    recursive: true,
    filter: (src) => !/(^|[/\\])(?:\.git|node_modules)(?:[/\\]|$)/.test(src)
  });
}
async function assertStoreTweakCleanForAutoUpdate(entry, target, work) {
  if (!(0, import_node_fs9.existsSync)(target)) return;
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
  const metadataPath = (0, import_node_path8.join)(target, ".codexpp-store.json");
  if (!(0, import_node_fs9.existsSync)(metadataPath)) return null;
  try {
    const parsed = JSON.parse((0, import_node_fs9.readFileSync)(metadataPath, "utf8"));
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
  const baselineDir = (0, import_node_path8.join)(work, "baseline");
  const archive = (0, import_node_path8.join)(work, "baseline.tar.gz");
  const res = await fetch(`https://codeload.github.com/${metadata.repo}/tar.gz/${metadata.approvedCommitSha}`, {
    headers: { "User-Agent": `codex-plusplus/${CODEX_PLUSPLUS_VERSION}` },
    redirect: "follow"
  });
  if (!res.ok) throw new Error(`Could not verify local tweak changes before update: ${res.status}`);
  (0, import_node_fs9.writeFileSync)(archive, Buffer.from(await res.arrayBuffer()));
  (0, import_node_fs9.mkdirSync)(baselineDir, { recursive: true });
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
  for (const name of (0, import_node_fs9.readdirSync)(dir).sort()) {
    if (name === ".git" || name === "node_modules" || name === ".codexpp-store.json") continue;
    const full = (0, import_node_path8.join)(dir, name);
    const rel = (0, import_node_path8.relative)(root, full).split("\\").join("/");
    const stat4 = (0, import_node_fs9.statSync)(full);
    if (stat4.isDirectory()) {
      collectTweakFileHashes(root, full, out);
      continue;
    }
    if (!stat4.isFile()) continue;
    out[rel] = (0, import_node_crypto2.createHash)("sha256").update((0, import_node_fs9.readFileSync)(full)).digest("hex");
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
    (0, import_node_path8.join)((0, import_node_os2.homedir)(), ".codex-plusplus", "source"),
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
function broadcastReload() {
  const payload = {
    at: Date.now(),
    tweaks: tweakState.discovered.map((t) => t.manifest.id)
  };
  for (const wc of import_electron3.webContents.getAllWebContents()) {
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
      import_electron3.ipcMain.on(ch(c), wrapped);
      return () => import_electron3.ipcMain.removeListener(ch(c), wrapped);
    },
    send: (_c) => {
      throw new Error("ipc.send is renderer\u2192main; main side uses handle/on");
    },
    invoke: (_c) => {
      throw new Error("ipc.invoke is renderer\u2192main; main side uses handle");
    },
    handle: (c, handler) => {
      import_electron3.ipcMain.handle(ch(c), (_e, ...args) => handler(...args));
    }
  };
}
function makeMainFs(id) {
  const dir = (0, import_node_path8.join)(userRoot, "tweak-data", id);
  (0, import_node_fs9.mkdirSync)(dir, { recursive: true });
  const fs = require("node:fs/promises");
  return {
    dataDir: dir,
    read: (p) => fs.readFile((0, import_node_path8.join)(dir, p), "utf8"),
    write: (p, c) => fs.writeFile((0, import_node_path8.join)(dir, p), c, "utf8"),
    exists: async (p) => {
      try {
        await fs.access((0, import_node_path8.join)(dir, p));
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
    getWindowServices: getCodexWindowServices
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
    getViewCapabilities: () => getOwlViewCapabilities()
  });
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
function getPrimaryCodexWindow() {
  const services = getCodexWindowServices();
  const fromServices = typeof services?.getPrimaryWindow === "function" ? services.getPrimaryWindow("local") : null;
  if (fromServices && !fromServices.isDestroyed()) return fromServices;
  const fromManager = typeof services?.windowManager?.getPrimaryWindow === "function" ? services.windowManager.getPrimaryWindow.call(services.windowManager) : null;
  if (fromManager && !fromManager.isDestroyed()) return fromManager;
  const focused = import_electron3.BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) return focused;
  return import_electron3.BrowserWindow.getAllWindows().find((win) => !win.isDestroyed()) ?? null;
}
function getPrimaryCodexWindowRef() {
  const win = getPrimaryCodexWindow();
  if (!win || win.isDestroyed()) return null;
  return { windowId: win.id, webContentsId: win.webContents.id };
}
function focusCodexWindow(windowId) {
  const win = import_electron3.BrowserWindow.fromId(windowId);
  if (!win || win.isDestroyed()) return false;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
  return true;
}
function showCodexWindow(windowId) {
  const win = import_electron3.BrowserWindow.fromId(windowId);
  if (!win || win.isDestroyed()) return false;
  win.show();
  return true;
}
function getOwlViewCapabilities() {
  const parent = getPrimaryCodexWindow() ?? import_electron3.BrowserWindow.getFocusedWindow();
  const contentView = asRecord3(parent)?.contentView;
  let sampleView = null;
  try {
    sampleView = new import_electron3.BrowserView({ webPreferences: { sandbox: true } });
  } catch {
  }
  const webContentsView = asRecord3(sampleView)?.webContentsView;
  const privateViewTree = typeof asRecord3(contentView)?.addChildView === "function" && typeof asRecord3(contentView)?.removeChildView === "function";
  const webContentsViewAvailable = Boolean(webContentsView) && typeof asRecord3(webContentsView)?.setBounds === "function";
  const privateAttach = privateViewTree && webContentsViewAvailable;
  const browserViewFallback = typeof asRecord3(parent)?.addBrowserView === "function";
  try {
    if (sampleView && !sampleView.webContents.isDestroyed()) {
      sampleView.webContents.close({ waitForBeforeUnload: false });
    }
  } catch {
  }
  return {
    create: privateAttach || browserViewFallback,
    privateViewTree: privateAttach,
    webContentsView: webContentsViewAvailable,
    browserViewFallback
  };
}
async function createOwlView(ctx, opts) {
  const id = assertBridgeId2(opts.id ?? (0, import_node_crypto2.randomUUID)(), "Codex view id");
  const key = owlViewKey(ctx.id, id);
  if (owlViews.has(key)) throw new Error(`Codex view already exists: ${ctx.id}:${id}`);
  const parent = typeof opts.parentWindowId === "number" ? import_electron3.BrowserWindow.fromId(opts.parentWindowId) : getPrimaryCodexWindow();
  if (!parent || isWindowDestroyed2(parent)) {
    throw new Error("Codex view needs an active parent window");
  }
  const services = getCodexWindowServices();
  const windowManager = services?.windowManager;
  const route = opts.route === void 0 ? null : normalizeCodexRoute(opts.route);
  const hostId = opts.hostId || "local";
  const view = new import_electron3.BrowserView({
    webPreferences: {
      preload: opts.registerWithCodex === false ? void 0 : windowManager?.options?.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      devTools: windowManager?.options?.allowDevtools
    }
  });
  if (opts.backgroundColor) {
    callObjectMethod(view, "setBackgroundColor", [opts.backgroundColor]);
    callObjectMethod(asRecord3(view)?.webContentsView, "setBackgroundColor", [opts.backgroundColor]);
  }
  const managed = {
    key,
    tweakId: ctx.id,
    id,
    view,
    parentWindowId: windowIdFor2(parent),
    attachMode: null,
    disposeBindings: [],
    disposed: false
  };
  owlViews.set(key, managed);
  try {
    if (route !== null && opts.registerWithCodex !== false && windowManager?.registerWindow) {
      const appearance = opts.appearance || "secondary";
      const windowLike = makeWindowLikeForView(view);
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
  const contentView = asRecord3(parent)?.contentView;
  const webContentsView = asRecord3(view.view)?.webContentsView;
  if (typeof asRecord3(contentView)?.addChildView === "function" && webContentsView) {
    try {
      callObjectMethod(contentView, "addChildView", [webContentsView]);
      view.attachMode = "contentView";
    } catch (e) {
      log("warn", "Owl contentView attachment failed; falling back to BrowserView", {
        tweakId: view.tweakId,
        viewId: view.id,
        error: String(e)
      });
    }
  }
  if (!view.attachMode && typeof asRecord3(parent)?.addBrowserView === "function") {
    callObjectMethod(parent, "addBrowserView", [view.view]);
    view.attachMode = "browserView";
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
  if (!parent || isWindowDestroyed2(parent)) return;
  const contentView = asRecord3(parent)?.contentView;
  const webContentsView = asRecord3(view.view)?.webContentsView;
  if (view.attachMode === "contentView" && webContentsView) {
    try {
      callObjectMethod(contentView, "addChildView", [webContentsView]);
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
  if (parent && !isWindowDestroyed2(parent)) {
    try {
      if (view.attachMode === "contentView") {
        callObjectMethod(asRecord3(parent)?.contentView, "removeChildView", [asRecord3(view.view)?.webContentsView]);
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
async function createCodexBrowserView(opts) {
  const services = getCodexWindowServices();
  const windowManager = services?.windowManager;
  if (!services || !windowManager?.registerWindow) {
    throw new Error(
      "Codex embedded view services are not available. Reinstall Codex++ 1.0.0 or later."
    );
  }
  const route = normalizeCodexRoute(opts.route);
  const hostId = opts.hostId || "local";
  const appearance = opts.appearance || "secondary";
  const view = new import_electron3.BrowserView({
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
}
async function createCodexWindow(opts) {
  const services = getCodexWindowServices();
  if (!services) {
    throw new Error(
      "Codex window services are not available. Reinstall Codex++ 1.0.0 or later."
    );
  }
  const route = normalizeCodexRoute(opts.route);
  const hostId = opts.hostId || "local";
  const parent = typeof opts.parentWindowId === "number" ? import_electron3.BrowserWindow.fromId(opts.parentWindowId) : import_electron3.BrowserWindow.getFocusedWindow();
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
  } else if (hostId === "local" && typeof services.createFreshWindow === "function") {
    win = await services.createFreshWindow(route);
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
function isWindowDestroyed2(win) {
  if (!win) return true;
  const fn = asRecord3(win)?.isDestroyed;
  if (typeof fn !== "function") return false;
  try {
    return Boolean(fn.call(win));
  } catch {
    return true;
  }
}
function windowIdFor2(win) {
  const id = asRecord3(win)?.id;
  return typeof id === "number" ? id : null;
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
function assertBridgeId2(value, label) {
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
/*! Bundled license information:

chokidar/esm/index.js:
  (*! chokidar - MIT License (c) 2012 Paul Miller (paulmillr.com) *)
*/
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL21haW4udHMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2Nob2tpZGFyL2VzbS9pbmRleC5qcyIsICIuLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVhZGRpcnAvZXNtL2luZGV4LmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9jaG9raWRhci9lc20vaGFuZGxlci5qcyIsICIuLi9zcmMvdHdlYWstZGlzY292ZXJ5LnRzIiwgIi4uL3NyYy9zdG9yYWdlLnRzIiwgIi4uL3NyYy9tY3Atc3luYy50cyIsICIuLi9zcmMvd2F0Y2hlci1oZWFsdGgudHMiLCAiLi4vc3JjL3R3ZWFrLWxpZmVjeWNsZS50cyIsICIuLi9zcmMvbG9nZ2luZy50cyIsICIuLi9zcmMvY29kZXgtcnVudGltZS1wcm9iZS50cyIsICIuLi9zcmMvbmF0aXZlLWJyaWRnZS50cyIsICIuLi9zcmMvbmF0aXZlLXBhdGhzLnRzIiwgIi4uL3NyYy90d2Vhay1zdG9yZS50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBNYWluLXByb2Nlc3MgYm9vdHN0cmFwLiBMb2FkZWQgYnkgdGhlIGFzYXIgbG9hZGVyIGJlZm9yZSBDb2RleCdzIG93blxuICogbWFpbiBwcm9jZXNzIGNvZGUgcnVucy4gV2UgaG9vayBgQnJvd3NlcldpbmRvd2Agc28gZXZlcnkgd2luZG93IENvZGV4XG4gKiBjcmVhdGVzIGdldHMgb3VyIHByZWxvYWQgc2NyaXB0IGF0dGFjaGVkLiBXZSBhbHNvIHN0YW5kIHVwIGFuIElQQ1xuICogY2hhbm5lbCBmb3IgdHdlYWtzIHRvIHRhbGsgdG8gdGhlIG1haW4gcHJvY2Vzcy5cbiAqXG4gKiBXZSBhcmUgaW4gQ0pTIGxhbmQgaGVyZSAobWF0Y2hlcyBFbGVjdHJvbidzIG1haW4gcHJvY2VzcyBhbmQgQ29kZXgncyBvd25cbiAqIGNvZGUpLiBUaGUgcmVuZGVyZXItc2lkZSBydW50aW1lIGlzIGJ1bmRsZWQgc2VwYXJhdGVseSBpbnRvIHByZWxvYWQuanMuXG4gKi9cbmltcG9ydCB7IGFwcCwgQnJvd3NlclZpZXcsIEJyb3dzZXJXaW5kb3csIGNsaXBib2FyZCwgaXBjTWFpbiwgc2Vzc2lvbiwgc2hlbGwsIHdlYkNvbnRlbnRzIH0gZnJvbSBcImVsZWN0cm9uXCI7XG5pbXBvcnQgeyBjcFN5bmMsIGV4aXN0c1N5bmMsIG1rZGlyU3luYywgbWtkdGVtcFN5bmMsIHJlYWRkaXJTeW5jLCByZWFkRmlsZVN5bmMsIHJtU3luYywgc3RhdFN5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tIFwibm9kZTpmc1wiO1xuaW1wb3J0IHsgZXhlY0ZpbGVTeW5jLCBzcGF3biwgc3Bhd25TeW5jIH0gZnJvbSBcIm5vZGU6Y2hpbGRfcHJvY2Vzc1wiO1xuaW1wb3J0IHsgY3JlYXRlSGFzaCwgcmFuZG9tSW50LCByYW5kb21VVUlEIH0gZnJvbSBcIm5vZGU6Y3J5cHRvXCI7XG5pbXBvcnQgeyBkaXJuYW1lLCBpc0Fic29sdXRlLCBqb2luLCByZWxhdGl2ZSwgcmVzb2x2ZSB9IGZyb20gXCJub2RlOnBhdGhcIjtcbmltcG9ydCB7IGhvbWVkaXIsIHRtcGRpciB9IGZyb20gXCJub2RlOm9zXCI7XG5pbXBvcnQgY2hva2lkYXIgZnJvbSBcImNob2tpZGFyXCI7XG5pbXBvcnQgeyBkaXNjb3ZlclR3ZWFrcywgdHlwZSBEaXNjb3ZlcmVkVHdlYWsgfSBmcm9tIFwiLi90d2Vhay1kaXNjb3ZlcnlcIjtcbmltcG9ydCB7IGNyZWF0ZURpc2tTdG9yYWdlLCB0eXBlIERpc2tTdG9yYWdlIH0gZnJvbSBcIi4vc3RvcmFnZVwiO1xuaW1wb3J0IHsgc3luY01hbmFnZWRNY3BTZXJ2ZXJzIH0gZnJvbSBcIi4vbWNwLXN5bmNcIjtcbmltcG9ydCB7IGdldFdhdGNoZXJIZWFsdGggfSBmcm9tIFwiLi93YXRjaGVyLWhlYWx0aFwiO1xuaW1wb3J0IHtcbiAgaXNNYWluUHJvY2Vzc1R3ZWFrU2NvcGUsXG4gIHJlbG9hZFR3ZWFrcyxcbiAgc2V0VHdlYWtFbmFibGVkQW5kUmVsb2FkLFxufSBmcm9tIFwiLi90d2Vhay1saWZlY3ljbGVcIjtcbmltcG9ydCB7IGFwcGVuZENhcHBlZExvZyB9IGZyb20gXCIuL2xvZ2dpbmdcIjtcbmltcG9ydCB7XG4gIGdldENkcFN0YXR1cyxcbiAgZ2V0UnVudGltZUNhcGFiaWxpdGllcyxcbiAgZ2V0UnVudGltZUluZm8sXG4gIGxpc3RDZHBUYXJnZXRzLFxufSBmcm9tIFwiLi9jb2RleC1ydW50aW1lLXByb2JlXCI7XG5pbXBvcnQgeyBOYXRpdmVCcmlkZ2UsIHR5cGUgTmF0aXZlVHdlYWtDb250ZXh0IH0gZnJvbSBcIi4vbmF0aXZlLWJyaWRnZVwiO1xuaW1wb3J0IHR5cGUgeyBUd2Vha01hbmlmZXN0IH0gZnJvbSBcIkBjb2RleC1wbHVzcGx1cy9zZGtcIjtcbmltcG9ydCB0eXBlIHtcbiAgQ29kZXhSdW50aW1lQ2FwYWJpbGl0aWVzLFxuICBDb2RleFJ1bnRpbWVJbmZvLFxuICBDb2RleFZpZXdDcmVhdGVPcHRpb25zLFxuICBDb2RleFZpZXdSZWYsXG4gIENvZGV4V2luZG93UmVmLFxuICBOYXRpdmVIZWxwZXJMYXVuY2hPcHRpb25zLFxuICBOYXRpdmVNb2R1bGVMb2FkT3B0aW9ucyxcbiAgTmF0aXZlUGFuZWxDcmVhdGVPcHRpb25zLFxuICBOYXRpdmVWaWV3QXR0YWNoT3B0aW9ucyxcbiAgVHdlYWtQZXJtaXNzaW9uLFxufSBmcm9tIFwiQGNvZGV4LXBsdXNwbHVzL3Nka1wiO1xuaW1wb3J0IHtcbiAgREVGQVVMVF9UV0VBS19TVE9SRV9JTkRFWF9VUkwsXG4gIG5vcm1hbGl6ZUdpdEh1YlJlcG8sXG4gIG5vcm1hbGl6ZVN0b3JlUmVnaXN0cnksXG4gIHNodWZmbGVTdG9yZUVudHJpZXMsXG4gIHN0b3JlQXJjaGl2ZVVybCxcbiAgdHlwZSBUd2Vha1N0b3JlUHVibGlzaFN1Ym1pc3Npb24sXG4gIHR5cGUgVHdlYWtTdG9yZUVudHJ5LFxuICB0eXBlIFR3ZWFrU3RvcmVSZWdpc3RyeSxcbiAgdHlwZSBUd2Vha1N0b3JlUGxhdGZvcm0sXG59IGZyb20gXCIuL3R3ZWFrLXN0b3JlXCI7XG5cbmNvbnN0IHVzZXJSb290ID0gcHJvY2Vzcy5lbnYuQ09ERVhfUExVU1BMVVNfVVNFUl9ST09UO1xuY29uc3QgcnVudGltZURpciA9IHByb2Nlc3MuZW52LkNPREVYX1BMVVNQTFVTX1JVTlRJTUU7XG5cbmlmICghdXNlclJvb3QgfHwgIXJ1bnRpbWVEaXIpIHtcbiAgdGhyb3cgbmV3IEVycm9yKFxuICAgIFwiY29kZXgtcGx1c3BsdXMgcnVudGltZSBzdGFydGVkIHdpdGhvdXQgQ09ERVhfUExVU1BMVVNfVVNFUl9ST09UL1JVTlRJTUUgZW52c1wiLFxuICApO1xufVxuXG5jb25zdCBQUkVMT0FEX1BBVEggPSByZXNvbHZlKHJ1bnRpbWVEaXIsIFwicHJlbG9hZC5qc1wiKTtcbmNvbnN0IFRXRUFLU19ESVIgPSBqb2luKHVzZXJSb290LCBcInR3ZWFrc1wiKTtcbmNvbnN0IExPR19ESVIgPSBqb2luKHVzZXJSb290LCBcImxvZ1wiKTtcbmNvbnN0IExPR19GSUxFID0gam9pbihMT0dfRElSLCBcIm1haW4ubG9nXCIpO1xuY29uc3QgQ09ORklHX0ZJTEUgPSBqb2luKHVzZXJSb290LCBcImNvbmZpZy5qc29uXCIpO1xuY29uc3QgQ09ERVhfQ09ORklHX0ZJTEUgPSBqb2luKGhvbWVkaXIoKSwgXCIuY29kZXhcIiwgXCJjb25maWcudG9tbFwiKTtcbmNvbnN0IElOU1RBTExFUl9TVEFURV9GSUxFID0gam9pbih1c2VyUm9vdCwgXCJzdGF0ZS5qc29uXCIpO1xuY29uc3QgVVBEQVRFX01PREVfRklMRSA9IGpvaW4odXNlclJvb3QsIFwidXBkYXRlLW1vZGUuanNvblwiKTtcbmNvbnN0IFNFTEZfVVBEQVRFX1NUQVRFX0ZJTEUgPSBqb2luKHVzZXJSb290LCBcInNlbGYtdXBkYXRlLXN0YXRlLmpzb25cIik7XG5jb25zdCBTSUdORURfQ09ERVhfQkFDS1VQID0gam9pbih1c2VyUm9vdCwgXCJiYWNrdXBcIiwgXCJDb2RleC5hcHBcIik7XG5jb25zdCBDT0RFWF9QTFVTUExVU19WRVJTSU9OID0gXCIxLjAuMFwiO1xuY29uc3QgQ09ERVhfUExVU1BMVVNfUkVQTyA9IFwiYi1ubmV0dC9jb2RleC1wbHVzcGx1c1wiO1xuY29uc3QgVFdFQUtfU1RPUkVfSU5ERVhfVVJMID0gcHJvY2Vzcy5lbnYuQ09ERVhfUExVU1BMVVNfU1RPUkVfSU5ERVhfVVJMID8/IERFRkFVTFRfVFdFQUtfU1RPUkVfSU5ERVhfVVJMO1xuY29uc3QgQ09ERVhfV0lORE9XX1NFUlZJQ0VTX0tFWSA9IFwiX19jb2RleHBwX3dpbmRvd19zZXJ2aWNlc19fXCI7XG5cbm1rZGlyU3luYyhMT0dfRElSLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbm1rZGlyU3luYyhUV0VBS1NfRElSLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblxuLy8gT3B0aW9uYWw6IGVuYWJsZSBDaHJvbWUgRGV2VG9vbHMgUHJvdG9jb2wgb24gYSBUQ1AgcG9ydCBzbyB3ZSBjYW4gZHJpdmUgdGhlXG4vLyBydW5uaW5nIENvZGV4IGZyb20gb3V0c2lkZSAoY3VybCBodHRwOi8vbG9jYWxob3N0Ojxwb3J0Pi9qc29uLCBhdHRhY2ggdmlhXG4vLyBDRFAgV2ViU29ja2V0LCB0YWtlIHNjcmVlbnNob3RzLCBldmFsdWF0ZSBpbiByZW5kZXJlciwgZXRjLikuIENvZGV4J3Ncbi8vIHByb2R1Y3Rpb24gYnVpbGQgc2V0cyB3ZWJQcmVmZXJlbmNlcy5kZXZUb29scz1mYWxzZSwgd2hpY2gga2lsbHMgdGhlXG4vLyBpbi13aW5kb3cgRGV2VG9vbHMgc2hvcnRjdXQsIGJ1dCBgLS1yZW1vdGUtZGVidWdnaW5nLXBvcnRgIHdvcmtzIHJlZ2FyZGxlc3Ncbi8vIGJlY2F1c2UgaXQncyBhIENocm9taXVtIGNvbW1hbmQtbGluZSBzd2l0Y2ggcHJvY2Vzc2VkIGJlZm9yZSBhcHAgaW5pdC5cbi8vXG4vLyBPZmYgYnkgZGVmYXVsdC4gU2V0IENPREVYUFBfUkVNT1RFX0RFQlVHPTEgKG9wdGlvbmFsbHkgQ09ERVhQUF9SRU1PVEVfREVCVUdfUE9SVClcbi8vIHRvIHR1cm4gaXQgb24uIE11c3QgYmUgYXBwZW5kZWQgYmVmb3JlIGBhcHBgIGJlY29tZXMgcmVhZHk7IHdlJ3JlIGF0IG1vZHVsZVxuLy8gdG9wLWxldmVsIHNvIHRoYXQncyBmaW5lLlxuaWYgKHByb2Nlc3MuZW52LkNPREVYUFBfUkVNT1RFX0RFQlVHID09PSBcIjFcIikge1xuICBjb25zdCBwb3J0ID0gcHJvY2Vzcy5lbnYuQ09ERVhQUF9SRU1PVEVfREVCVUdfUE9SVCA/PyBcIjkyMjJcIjtcbiAgYXBwLmNvbW1hbmRMaW5lLmFwcGVuZFN3aXRjaChcInJlbW90ZS1kZWJ1Z2dpbmctcG9ydFwiLCBwb3J0KTtcbiAgbG9nKFwiaW5mb1wiLCBgcmVtb3RlIGRlYnVnZ2luZyBlbmFibGVkIG9uIHBvcnQgJHtwb3J0fWApO1xufVxuXG5pbnRlcmZhY2UgUGVyc2lzdGVkU3RhdGUge1xuICBjb2RleFBsdXNQbHVzPzoge1xuICAgIGF1dG9VcGRhdGU/OiBib29sZWFuO1xuICAgIHNhZmVNb2RlPzogYm9vbGVhbjtcbiAgICB1cGRhdGVDaGFubmVsPzogU2VsZlVwZGF0ZUNoYW5uZWw7XG4gICAgdXBkYXRlUmVwbz86IHN0cmluZztcbiAgICB1cGRhdGVSZWY/OiBzdHJpbmc7XG4gICAgdXBkYXRlQ2hlY2s/OiBDb2RleFBsdXNQbHVzVXBkYXRlQ2hlY2s7XG4gIH07XG4gIC8qKiBQZXItdHdlYWsgZW5hYmxlIGZsYWdzLiBNaXNzaW5nIGVudHJpZXMgZGVmYXVsdCB0byBlbmFibGVkLiAqL1xuICB0d2Vha3M/OiBSZWNvcmQ8c3RyaW5nLCB7IGVuYWJsZWQ/OiBib29sZWFuIH0+O1xuICAvKiogQ2FjaGVkIEdpdEh1YiByZWxlYXNlIGNoZWNrcy4gUnVudGltZSBuZXZlciBhdXRvLWluc3RhbGxzIHVwZGF0ZXMuICovXG4gIHR3ZWFrVXBkYXRlQ2hlY2tzPzogUmVjb3JkPHN0cmluZywgVHdlYWtVcGRhdGVDaGVjaz47XG59XG5cbmludGVyZmFjZSBDb2RleFBsdXNQbHVzVXBkYXRlQ2hlY2sge1xuICBjaGVja2VkQXQ6IHN0cmluZztcbiAgY3VycmVudFZlcnNpb246IHN0cmluZztcbiAgbGF0ZXN0VmVyc2lvbjogc3RyaW5nIHwgbnVsbDtcbiAgcmVsZWFzZVVybDogc3RyaW5nIHwgbnVsbDtcbiAgcmVsZWFzZU5vdGVzOiBzdHJpbmcgfCBudWxsO1xuICB1cGRhdGVBdmFpbGFibGU6IGJvb2xlYW47XG4gIGVycm9yPzogc3RyaW5nO1xufVxuXG50eXBlIFNlbGZVcGRhdGVDaGFubmVsID0gXCJzdGFibGVcIiB8IFwicHJlcmVsZWFzZVwiIHwgXCJjdXN0b21cIjtcbnR5cGUgU2VsZlVwZGF0ZVN0YXR1cyA9IFwiY2hlY2tpbmdcIiB8IFwidXAtdG8tZGF0ZVwiIHwgXCJ1cGRhdGVkXCIgfCBcImZhaWxlZFwiIHwgXCJkaXNhYmxlZFwiO1xuXG5pbnRlcmZhY2UgU2VsZlVwZGF0ZVN0YXRlIHtcbiAgY2hlY2tlZEF0OiBzdHJpbmc7XG4gIGNvbXBsZXRlZEF0Pzogc3RyaW5nO1xuICBzdGF0dXM6IFNlbGZVcGRhdGVTdGF0dXM7XG4gIGN1cnJlbnRWZXJzaW9uOiBzdHJpbmc7XG4gIGxhdGVzdFZlcnNpb246IHN0cmluZyB8IG51bGw7XG4gIHRhcmdldFJlZjogc3RyaW5nIHwgbnVsbDtcbiAgcmVsZWFzZVVybDogc3RyaW5nIHwgbnVsbDtcbiAgcmVwbzogc3RyaW5nO1xuICBjaGFubmVsOiBTZWxmVXBkYXRlQ2hhbm5lbDtcbiAgc291cmNlUm9vdDogc3RyaW5nO1xuICBpbnN0YWxsYXRpb25Tb3VyY2U/OiBJbnN0YWxsYXRpb25Tb3VyY2U7XG4gIGVycm9yPzogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgSW5zdGFsbGF0aW9uU291cmNlIHtcbiAga2luZDogXCJnaXRodWItc291cmNlXCIgfCBcImhvbWVicmV3XCIgfCBcImxvY2FsLWRldlwiIHwgXCJzb3VyY2UtYXJjaGl2ZVwiIHwgXCJ1bmtub3duXCI7XG4gIGxhYmVsOiBzdHJpbmc7XG4gIGRldGFpbDogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgVHdlYWtVcGRhdGVDaGVjayB7XG4gIGNoZWNrZWRBdDogc3RyaW5nO1xuICByZXBvOiBzdHJpbmc7XG4gIGN1cnJlbnRWZXJzaW9uOiBzdHJpbmc7XG4gIGxhdGVzdFZlcnNpb246IHN0cmluZyB8IG51bGw7XG4gIGxhdGVzdFRhZzogc3RyaW5nIHwgbnVsbDtcbiAgcmVsZWFzZVVybDogc3RyaW5nIHwgbnVsbDtcbiAgdXBkYXRlQXZhaWxhYmxlOiBib29sZWFuO1xuICBlcnJvcj86IHN0cmluZztcbn1cblxuZnVuY3Rpb24gcmVhZFN0YXRlKCk6IFBlcnNpc3RlZFN0YXRlIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMoQ09ORklHX0ZJTEUsIFwidXRmOFwiKSkgYXMgUGVyc2lzdGVkU3RhdGU7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB7fTtcbiAgfVxufVxuZnVuY3Rpb24gd3JpdGVTdGF0ZShzOiBQZXJzaXN0ZWRTdGF0ZSk6IHZvaWQge1xuICB0cnkge1xuICAgIHdyaXRlRmlsZVN5bmMoQ09ORklHX0ZJTEUsIEpTT04uc3RyaW5naWZ5KHMsIG51bGwsIDIpKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZyhcIndhcm5cIiwgXCJ3cml0ZVN0YXRlIGZhaWxlZDpcIiwgU3RyaW5nKChlIGFzIEVycm9yKS5tZXNzYWdlKSk7XG4gIH1cbn1cbmZ1bmN0aW9uIGlzQ29kZXhQbHVzUGx1c0F1dG9VcGRhdGVFbmFibGVkKCk6IGJvb2xlYW4ge1xuICByZXR1cm4gcmVhZFN0YXRlKCkuY29kZXhQbHVzUGx1cz8uYXV0b1VwZGF0ZSAhPT0gZmFsc2U7XG59XG5mdW5jdGlvbiBzZXRDb2RleFBsdXNQbHVzQXV0b1VwZGF0ZShlbmFibGVkOiBib29sZWFuKTogdm9pZCB7XG4gIGNvbnN0IHMgPSByZWFkU3RhdGUoKTtcbiAgcy5jb2RleFBsdXNQbHVzID8/PSB7fTtcbiAgcy5jb2RleFBsdXNQbHVzLmF1dG9VcGRhdGUgPSBlbmFibGVkO1xuICB3cml0ZVN0YXRlKHMpO1xufVxuZnVuY3Rpb24gc2V0Q29kZXhQbHVzUGx1c1VwZGF0ZUNvbmZpZyhjb25maWc6IHtcbiAgdXBkYXRlQ2hhbm5lbD86IFNlbGZVcGRhdGVDaGFubmVsO1xuICB1cGRhdGVSZXBvPzogc3RyaW5nO1xuICB1cGRhdGVSZWY/OiBzdHJpbmc7XG59KTogdm9pZCB7XG4gIGNvbnN0IHMgPSByZWFkU3RhdGUoKTtcbiAgcy5jb2RleFBsdXNQbHVzID8/PSB7fTtcbiAgaWYgKGNvbmZpZy51cGRhdGVDaGFubmVsKSBzLmNvZGV4UGx1c1BsdXMudXBkYXRlQ2hhbm5lbCA9IGNvbmZpZy51cGRhdGVDaGFubmVsO1xuICBpZiAoXCJ1cGRhdGVSZXBvXCIgaW4gY29uZmlnKSBzLmNvZGV4UGx1c1BsdXMudXBkYXRlUmVwbyA9IGNsZWFuT3B0aW9uYWxTdHJpbmcoY29uZmlnLnVwZGF0ZVJlcG8pO1xuICBpZiAoXCJ1cGRhdGVSZWZcIiBpbiBjb25maWcpIHMuY29kZXhQbHVzUGx1cy51cGRhdGVSZWYgPSBjbGVhbk9wdGlvbmFsU3RyaW5nKGNvbmZpZy51cGRhdGVSZWYpO1xuICB3cml0ZVN0YXRlKHMpO1xufVxuZnVuY3Rpb24gaXNDb2RleFBsdXNQbHVzU2FmZU1vZGVFbmFibGVkKCk6IGJvb2xlYW4ge1xuICByZXR1cm4gcmVhZFN0YXRlKCkuY29kZXhQbHVzUGx1cz8uc2FmZU1vZGUgPT09IHRydWU7XG59XG5mdW5jdGlvbiBpc1R3ZWFrRW5hYmxlZChpZDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IHMgPSByZWFkU3RhdGUoKTtcbiAgaWYgKHMuY29kZXhQbHVzUGx1cz8uc2FmZU1vZGUgPT09IHRydWUpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIHMudHdlYWtzPy5baWRdPy5lbmFibGVkICE9PSBmYWxzZTtcbn1cbmZ1bmN0aW9uIHNldFR3ZWFrRW5hYmxlZChpZDogc3RyaW5nLCBlbmFibGVkOiBib29sZWFuKTogdm9pZCB7XG4gIGNvbnN0IHMgPSByZWFkU3RhdGUoKTtcbiAgcy50d2Vha3MgPz89IHt9O1xuICBzLnR3ZWFrc1tpZF0gPSB7IC4uLnMudHdlYWtzW2lkXSwgZW5hYmxlZCB9O1xuICB3cml0ZVN0YXRlKHMpO1xufVxuXG5pbnRlcmZhY2UgSW5zdGFsbGVyU3RhdGUge1xuICBhcHBSb290OiBzdHJpbmc7XG4gIGNvZGV4VmVyc2lvbjogc3RyaW5nIHwgbnVsbDtcbiAgc291cmNlUm9vdD86IHN0cmluZztcbn1cblxuZnVuY3Rpb24gcmVhZEluc3RhbGxlclN0YXRlKCk6IEluc3RhbGxlclN0YXRlIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKElOU1RBTExFUl9TVEFURV9GSUxFLCBcInV0ZjhcIikpIGFzIEluc3RhbGxlclN0YXRlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiByZWFkU2VsZlVwZGF0ZVN0YXRlKCk6IFNlbGZVcGRhdGVTdGF0ZSB8IG51bGwge1xuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhTRUxGX1VQREFURV9TVEFURV9GSUxFLCBcInV0ZjhcIikpIGFzIFNlbGZVcGRhdGVTdGF0ZTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbmZ1bmN0aW9uIHdyaXRlU2VsZlVwZGF0ZVN0YXRlKHN0YXRlOiBTZWxmVXBkYXRlU3RhdGUpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICB3cml0ZUZpbGVTeW5jKFNFTEZfVVBEQVRFX1NUQVRFX0ZJTEUsIEpTT04uc3RyaW5naWZ5KHN0YXRlLCBudWxsLCAyKSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2coXCJ3YXJuXCIsIFwid3JpdGVTZWxmVXBkYXRlU3RhdGUgZmFpbGVkOlwiLCBTdHJpbmcoKGUgYXMgRXJyb3IpLm1lc3NhZ2UpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjbGVhbk9wdGlvbmFsU3RyaW5nKHZhbHVlOiB1bmtub3duKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIikgcmV0dXJuIHVuZGVmaW5lZDtcbiAgY29uc3QgdHJpbW1lZCA9IHZhbHVlLnRyaW0oKTtcbiAgcmV0dXJuIHRyaW1tZWQgPyB0cmltbWVkIDogdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBpc1BhdGhJbnNpZGUocGFyZW50OiBzdHJpbmcsIHRhcmdldDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IHJlbCA9IHJlbGF0aXZlKHJlc29sdmUocGFyZW50KSwgcmVzb2x2ZSh0YXJnZXQpKTtcbiAgcmV0dXJuIHJlbCA9PT0gXCJcIiB8fCAoISFyZWwgJiYgIXJlbC5zdGFydHNXaXRoKFwiLi5cIikgJiYgIWlzQWJzb2x1dGUocmVsKSk7XG59XG5cbmZ1bmN0aW9uIGxvZyhsZXZlbDogXCJpbmZvXCIgfCBcIndhcm5cIiB8IFwiZXJyb3JcIiwgLi4uYXJnczogdW5rbm93bltdKTogdm9pZCB7XG4gIGNvbnN0IGxpbmUgPSBgWyR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpfV0gWyR7bGV2ZWx9XSAke2FyZ3NcbiAgICAubWFwKChhKSA9PiAodHlwZW9mIGEgPT09IFwic3RyaW5nXCIgPyBhIDogSlNPTi5zdHJpbmdpZnkoYSkpKVxuICAgIC5qb2luKFwiIFwiKX1cXG5gO1xuICB0cnkge1xuICAgIGFwcGVuZENhcHBlZExvZyhMT0dfRklMRSwgbGluZSk7XG4gIH0gY2F0Y2gge31cbiAgaWYgKGxldmVsID09PSBcImVycm9yXCIpIGNvbnNvbGUuZXJyb3IoXCJbY29kZXgtcGx1c3BsdXNdXCIsIC4uLmFyZ3MpO1xufVxuXG5mdW5jdGlvbiBpbnN0YWxsU3BhcmtsZVVwZGF0ZUhvb2soKTogdm9pZCB7XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtICE9PSBcImRhcndpblwiKSByZXR1cm47XG5cbiAgY29uc3QgTW9kdWxlID0gcmVxdWlyZShcIm5vZGU6bW9kdWxlXCIpIGFzIHR5cGVvZiBpbXBvcnQoXCJub2RlOm1vZHVsZVwiKSAmIHtcbiAgICBfbG9hZD86IChyZXF1ZXN0OiBzdHJpbmcsIHBhcmVudDogdW5rbm93biwgaXNNYWluOiBib29sZWFuKSA9PiB1bmtub3duO1xuICB9O1xuICBjb25zdCBvcmlnaW5hbExvYWQgPSBNb2R1bGUuX2xvYWQ7XG4gIGlmICh0eXBlb2Ygb3JpZ2luYWxMb2FkICE9PSBcImZ1bmN0aW9uXCIpIHJldHVybjtcblxuICBNb2R1bGUuX2xvYWQgPSBmdW5jdGlvbiBjb2RleFBsdXNQbHVzTW9kdWxlTG9hZChyZXF1ZXN0OiBzdHJpbmcsIHBhcmVudDogdW5rbm93biwgaXNNYWluOiBib29sZWFuKSB7XG4gICAgY29uc3QgbG9hZGVkID0gb3JpZ2luYWxMb2FkLmFwcGx5KHRoaXMsIFtyZXF1ZXN0LCBwYXJlbnQsIGlzTWFpbl0pIGFzIHVua25vd247XG4gICAgaWYgKHR5cGVvZiByZXF1ZXN0ID09PSBcInN0cmluZ1wiICYmIC9zcGFya2xlKD86XFwubm9kZSk/JC9pLnRlc3QocmVxdWVzdCkpIHtcbiAgICAgIHdyYXBTcGFya2xlRXhwb3J0cyhsb2FkZWQpO1xuICAgIH1cbiAgICByZXR1cm4gbG9hZGVkO1xuICB9O1xufVxuXG5mdW5jdGlvbiB3cmFwU3BhcmtsZUV4cG9ydHMobG9hZGVkOiB1bmtub3duKTogdm9pZCB7XG4gIGlmICghbG9hZGVkIHx8IHR5cGVvZiBsb2FkZWQgIT09IFwib2JqZWN0XCIpIHJldHVybjtcbiAgY29uc3QgZXhwb3J0cyA9IGxvYWRlZCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiAmIHsgX19jb2RleHBwU3BhcmtsZVdyYXBwZWQ/OiBib29sZWFuIH07XG4gIGlmIChleHBvcnRzLl9fY29kZXhwcFNwYXJrbGVXcmFwcGVkKSByZXR1cm47XG4gIGV4cG9ydHMuX19jb2RleHBwU3BhcmtsZVdyYXBwZWQgPSB0cnVlO1xuXG4gIGZvciAoY29uc3QgbmFtZSBvZiBbXCJpbnN0YWxsVXBkYXRlc0lmQXZhaWxhYmxlXCJdKSB7XG4gICAgY29uc3QgZm4gPSBleHBvcnRzW25hbWVdO1xuICAgIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikgY29udGludWU7XG4gICAgZXhwb3J0c1tuYW1lXSA9IGZ1bmN0aW9uIGNvZGV4UGx1c1BsdXNTcGFya2xlV3JhcHBlcih0aGlzOiB1bmtub3duLCAuLi5hcmdzOiB1bmtub3duW10pIHtcbiAgICAgIHByZXBhcmVTaWduZWRDb2RleEZvclNwYXJrbGVJbnN0YWxsKCk7XG4gICAgICByZXR1cm4gUmVmbGVjdC5hcHBseShmbiwgdGhpcywgYXJncyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChleHBvcnRzLmRlZmF1bHQgJiYgZXhwb3J0cy5kZWZhdWx0ICE9PSBleHBvcnRzKSB7XG4gICAgd3JhcFNwYXJrbGVFeHBvcnRzKGV4cG9ydHMuZGVmYXVsdCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJlcGFyZVNpZ25lZENvZGV4Rm9yU3BhcmtsZUluc3RhbGwoKTogdm9pZCB7XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtICE9PSBcImRhcndpblwiKSByZXR1cm47XG4gIGlmIChleGlzdHNTeW5jKFVQREFURV9NT0RFX0ZJTEUpKSB7XG4gICAgbG9nKFwiaW5mb1wiLCBcIlNwYXJrbGUgdXBkYXRlIHByZXAgc2tpcHBlZDsgdXBkYXRlIG1vZGUgYWxyZWFkeSBhY3RpdmVcIik7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICghZXhpc3RzU3luYyhTSUdORURfQ09ERVhfQkFDS1VQKSkge1xuICAgIGxvZyhcIndhcm5cIiwgXCJTcGFya2xlIHVwZGF0ZSBwcmVwIHNraXBwZWQ7IHNpZ25lZCBDb2RleC5hcHAgYmFja3VwIGlzIG1pc3NpbmdcIik7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICghaXNEZXZlbG9wZXJJZFNpZ25lZEFwcChTSUdORURfQ09ERVhfQkFDS1VQKSkge1xuICAgIGxvZyhcIndhcm5cIiwgXCJTcGFya2xlIHVwZGF0ZSBwcmVwIHNraXBwZWQ7IENvZGV4LmFwcCBiYWNrdXAgaXMgbm90IERldmVsb3BlciBJRCBzaWduZWRcIik7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3Qgc3RhdGUgPSByZWFkSW5zdGFsbGVyU3RhdGUoKTtcbiAgY29uc3QgYXBwUm9vdCA9IHN0YXRlPy5hcHBSb290ID8/IGluZmVyTWFjQXBwUm9vdCgpO1xuICBpZiAoIWFwcFJvb3QpIHtcbiAgICBsb2coXCJ3YXJuXCIsIFwiU3BhcmtsZSB1cGRhdGUgcHJlcCBza2lwcGVkOyBjb3VsZCBub3QgaW5mZXIgQ29kZXguYXBwIHBhdGhcIik7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgbW9kZSA9IHtcbiAgICBlbmFibGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICBhcHBSb290LFxuICAgIGNvZGV4VmVyc2lvbjogc3RhdGU/LmNvZGV4VmVyc2lvbiA/PyBudWxsLFxuICB9O1xuICB3cml0ZUZpbGVTeW5jKFVQREFURV9NT0RFX0ZJTEUsIEpTT04uc3RyaW5naWZ5KG1vZGUsIG51bGwsIDIpKTtcblxuICB0cnkge1xuICAgIGV4ZWNGaWxlU3luYyhcImRpdHRvXCIsIFtTSUdORURfQ09ERVhfQkFDS1VQLCBhcHBSb290XSwgeyBzdGRpbzogXCJpZ25vcmVcIiB9KTtcbiAgICB0cnkge1xuICAgICAgZXhlY0ZpbGVTeW5jKFwieGF0dHJcIiwgW1wiLWRyXCIsIFwiY29tLmFwcGxlLnF1YXJhbnRpbmVcIiwgYXBwUm9vdF0sIHsgc3RkaW86IFwiaWdub3JlXCIgfSk7XG4gICAgfSBjYXRjaCB7fVxuICAgIGxvZyhcImluZm9cIiwgXCJSZXN0b3JlZCBzaWduZWQgQ29kZXguYXBwIGJlZm9yZSBTcGFya2xlIGluc3RhbGxcIiwgeyBhcHBSb290IH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nKFwiZXJyb3JcIiwgXCJGYWlsZWQgdG8gcmVzdG9yZSBzaWduZWQgQ29kZXguYXBwIGJlZm9yZSBTcGFya2xlIGluc3RhbGxcIiwge1xuICAgICAgbWVzc2FnZTogKGUgYXMgRXJyb3IpLm1lc3NhZ2UsXG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNEZXZlbG9wZXJJZFNpZ25lZEFwcChhcHBSb290OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgcmVzdWx0ID0gc3Bhd25TeW5jKFwiY29kZXNpZ25cIiwgW1wiLWR2XCIsIFwiLS12ZXJib3NlPTRcIiwgYXBwUm9vdF0sIHtcbiAgICBlbmNvZGluZzogXCJ1dGY4XCIsXG4gICAgc3RkaW86IFtcImlnbm9yZVwiLCBcInBpcGVcIiwgXCJwaXBlXCJdLFxuICB9KTtcbiAgY29uc3Qgb3V0cHV0ID0gYCR7cmVzdWx0LnN0ZG91dCA/PyBcIlwifSR7cmVzdWx0LnN0ZGVyciA/PyBcIlwifWA7XG4gIHJldHVybiAoXG4gICAgcmVzdWx0LnN0YXR1cyA9PT0gMCAmJlxuICAgIC9BdXRob3JpdHk9RGV2ZWxvcGVyIElEIEFwcGxpY2F0aW9uOi8udGVzdChvdXRwdXQpICYmXG4gICAgIS9TaWduYXR1cmU9YWRob2MvLnRlc3Qob3V0cHV0KSAmJlxuICAgICEvVGVhbUlkZW50aWZpZXI9bm90IHNldC8udGVzdChvdXRwdXQpXG4gICk7XG59XG5cbmZ1bmN0aW9uIGluZmVyTWFjQXBwUm9vdCgpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgbWFya2VyID0gXCIuYXBwL0NvbnRlbnRzL01hY09TL1wiO1xuICBjb25zdCBpZHggPSBwcm9jZXNzLmV4ZWNQYXRoLmluZGV4T2YobWFya2VyKTtcbiAgcmV0dXJuIGlkeCA+PSAwID8gcHJvY2Vzcy5leGVjUGF0aC5zbGljZSgwLCBpZHggKyBcIi5hcHBcIi5sZW5ndGgpIDogbnVsbDtcbn1cblxuLy8gU3VyZmFjZSB1bmhhbmRsZWQgZXJyb3JzIGZyb20gYW55d2hlcmUgaW4gdGhlIG1haW4gcHJvY2VzcyB0byBvdXIgbG9nLlxucHJvY2Vzcy5vbihcInVuY2F1Z2h0RXhjZXB0aW9uXCIsIChlOiBFcnJvciAmIHsgY29kZT86IHN0cmluZyB9KSA9PiB7XG4gIGxvZyhcImVycm9yXCIsIFwidW5jYXVnaHRFeGNlcHRpb25cIiwgeyBjb2RlOiBlLmNvZGUsIG1lc3NhZ2U6IGUubWVzc2FnZSwgc3RhY2s6IGUuc3RhY2sgfSk7XG59KTtcbnByb2Nlc3Mub24oXCJ1bmhhbmRsZWRSZWplY3Rpb25cIiwgKGUpID0+IHtcbiAgbG9nKFwiZXJyb3JcIiwgXCJ1bmhhbmRsZWRSZWplY3Rpb25cIiwgeyB2YWx1ZTogU3RyaW5nKGUpIH0pO1xufSk7XG5cbmluc3RhbGxTcGFya2xlVXBkYXRlSG9vaygpO1xuXG5pbnRlcmZhY2UgTG9hZGVkTWFpblR3ZWFrIHtcbiAgc3RvcD86ICgpID0+IHZvaWQ7XG4gIHN0b3JhZ2U6IERpc2tTdG9yYWdlO1xufVxuXG5pbnRlcmZhY2UgQ29kZXhXaW5kb3dTZXJ2aWNlcyB7XG4gIGNyZWF0ZUZyZXNoV2luZG93PzogKHJvdXRlPzogc3RyaW5nKSA9PiBQcm9taXNlPEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsPjtcbiAgY3JlYXRlRnJlc2hMb2NhbFdpbmRvdz86IChyb3V0ZT86IHN0cmluZykgPT4gUHJvbWlzZTxFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbD47XG4gIGVuc3VyZUhvc3RXaW5kb3c/OiAoaG9zdElkPzogc3RyaW5nKSA9PiBQcm9taXNlPEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsPjtcbiAgZ2V0UHJpbWFyeVdpbmRvdz86IChob3N0SWQ/OiBzdHJpbmcpID0+IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsO1xuICBnZXRDb250ZXh0PzogKGhvc3RJZDogc3RyaW5nKSA9PiB7IHJlZ2lzdGVyV2luZG93PzogKHdpbmRvd0xpa2U6IENvZGV4V2luZG93TGlrZSkgPT4gdm9pZCB9IHwgbnVsbDtcbiAgd2luZG93TWFuYWdlcj86IHtcbiAgICBjcmVhdGVXaW5kb3c/OiAob3B0czogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pID0+IFByb21pc2U8RWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGw+O1xuICAgIGdldFByaW1hcnlXaW5kb3c/OiAoKSA9PiBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbDtcbiAgICByZWdpc3RlcldpbmRvdz86IChcbiAgICAgIHdpbmRvd0xpa2U6IENvZGV4V2luZG93TGlrZSxcbiAgICAgIGhvc3RJZDogc3RyaW5nLFxuICAgICAgcHJpbWFyeTogYm9vbGVhbixcbiAgICAgIGFwcGVhcmFuY2U6IHN0cmluZyxcbiAgICApID0+IHZvaWQ7XG4gICAgb3B0aW9ucz86IHtcbiAgICAgIGFsbG93RGV2dG9vbHM/OiBib29sZWFuO1xuICAgICAgcHJlbG9hZFBhdGg/OiBzdHJpbmc7XG4gICAgfTtcbiAgfTtcbn1cblxuaW50ZXJmYWNlIENvZGV4V2luZG93TGlrZSB7XG4gIGlkOiBudW1iZXI7XG4gIHdlYkNvbnRlbnRzOiBFbGVjdHJvbi5XZWJDb250ZW50cztcbiAgb24oZXZlbnQ6IFwiY2xvc2VkXCIsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdW5rbm93bjtcbiAgb25jZT8oZXZlbnQ6IHN0cmluZywgbGlzdGVuZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpOiB1bmtub3duO1xuICBvZmY/KGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKTogdW5rbm93bjtcbiAgcmVtb3ZlTGlzdGVuZXI/KGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKTogdW5rbm93bjtcbiAgaXNEZXN0cm95ZWQ/KCk6IGJvb2xlYW47XG4gIGlzRm9jdXNlZD8oKTogYm9vbGVhbjtcbiAgZm9jdXM/KCk6IHZvaWQ7XG4gIHNob3c/KCk6IHZvaWQ7XG4gIGhpZGU/KCk6IHZvaWQ7XG4gIGdldEJvdW5kcz8oKTogRWxlY3Ryb24uUmVjdGFuZ2xlO1xuICBnZXRDb250ZW50Qm91bmRzPygpOiBFbGVjdHJvbi5SZWN0YW5nbGU7XG4gIGdldFNpemU/KCk6IFtudW1iZXIsIG51bWJlcl07XG4gIGdldENvbnRlbnRTaXplPygpOiBbbnVtYmVyLCBudW1iZXJdO1xuICBzZXRUaXRsZT8odGl0bGU6IHN0cmluZyk6IHZvaWQ7XG4gIGdldFRpdGxlPygpOiBzdHJpbmc7XG4gIHNldFJlcHJlc2VudGVkRmlsZW5hbWU/KGZpbGVuYW1lOiBzdHJpbmcpOiB2b2lkO1xuICBzZXREb2N1bWVudEVkaXRlZD8oZWRpdGVkOiBib29sZWFuKTogdm9pZDtcbiAgc2V0V2luZG93QnV0dG9uVmlzaWJpbGl0eT8odmlzaWJsZTogYm9vbGVhbik6IHZvaWQ7XG59XG5cbmludGVyZmFjZSBDb2RleENyZWF0ZVdpbmRvd09wdGlvbnMge1xuICByb3V0ZTogc3RyaW5nO1xuICBob3N0SWQ/OiBzdHJpbmc7XG4gIHNob3c/OiBib29sZWFuO1xuICBhcHBlYXJhbmNlPzogc3RyaW5nO1xuICBwYXJlbnRXaW5kb3dJZD86IG51bWJlcjtcbiAgYm91bmRzPzogRWxlY3Ryb24uUmVjdGFuZ2xlO1xufVxuXG5pbnRlcmZhY2UgQ29kZXhDcmVhdGVWaWV3T3B0aW9ucyB7XG4gIHJvdXRlOiBzdHJpbmc7XG4gIGhvc3RJZD86IHN0cmluZztcbiAgYXBwZWFyYW5jZT86IHN0cmluZztcbn1cblxudHlwZSBPd2xWaWV3QXR0YWNoTW9kZSA9IFwiY29udGVudFZpZXdcIiB8IFwiYnJvd3NlclZpZXdcIjtcblxuaW50ZXJmYWNlIE1hbmFnZWRPd2xWaWV3IHtcbiAga2V5OiBzdHJpbmc7XG4gIHR3ZWFrSWQ6IHN0cmluZztcbiAgaWQ6IHN0cmluZztcbiAgdmlldzogRWxlY3Ryb24uQnJvd3NlclZpZXc7XG4gIHBhcmVudFdpbmRvd0lkOiBudW1iZXIgfCBudWxsO1xuICBhdHRhY2hNb2RlOiBPd2xWaWV3QXR0YWNoTW9kZSB8IG51bGw7XG4gIGRpc3Bvc2VCaW5kaW5nczogQXJyYXk8KCkgPT4gdm9pZD47XG4gIGRpc3Bvc2VkOiBib29sZWFuO1xufVxuXG5jb25zdCB0d2Vha1N0YXRlID0ge1xuICBkaXNjb3ZlcmVkOiBbXSBhcyBEaXNjb3ZlcmVkVHdlYWtbXSxcbiAgbG9hZGVkTWFpbjogbmV3IE1hcDxzdHJpbmcsIExvYWRlZE1haW5Ud2Vhaz4oKSxcbn07XG5cbmNvbnN0IG5hdGl2ZUJyaWRnZSA9IG5ldyBOYXRpdmVCcmlkZ2UobG9nLCB7XG4gIG5hdGl2ZUhvc3RQYXRoOiBqb2luKHJ1bnRpbWVEaXIsIFwibmF0aXZlXCIsIFwiY29kZXhwcF9uYXRpdmVfaG9zdC5ub2RlXCIpLFxufSk7XG5jb25zdCBvd2xWaWV3cyA9IG5ldyBNYXA8c3RyaW5nLCBNYW5hZ2VkT3dsVmlldz4oKTtcblxuY29uc3QgdHdlYWtMaWZlY3ljbGVEZXBzID0ge1xuICBsb2dJbmZvOiAobWVzc2FnZTogc3RyaW5nKSA9PiBsb2coXCJpbmZvXCIsIG1lc3NhZ2UpLFxuICBzZXRUd2Vha0VuYWJsZWQsXG4gIHN0b3BBbGxNYWluVHdlYWtzLFxuICBjbGVhclR3ZWFrTW9kdWxlQ2FjaGUsXG4gIGxvYWRBbGxNYWluVHdlYWtzLFxuICBicm9hZGNhc3RSZWxvYWQsXG59O1xuXG4vLyAxLiBIb29rIGV2ZXJ5IHNlc3Npb24gc28gb3VyIHByZWxvYWQgcnVucyBpbiBldmVyeSByZW5kZXJlci5cbi8vXG4vLyBXZSB1c2UgRWxlY3Ryb24ncyBtb2Rlcm4gYHNlc3Npb24ucmVnaXN0ZXJQcmVsb2FkU2NyaXB0YCBBUEkgKGFkZGVkIGluXG4vLyBFbGVjdHJvbiAzNSkuIFRoZSBkZXByZWNhdGVkIGBzZXRQcmVsb2Fkc2AgcGF0aCBzaWxlbnRseSBuby1vcHMgaW4gc29tZVxuLy8gY29uZmlndXJhdGlvbnMgKG5vdGFibHkgd2l0aCBzYW5kYm94ZWQgcmVuZGVyZXJzKSwgc28gcmVnaXN0ZXJQcmVsb2FkU2NyaXB0XG4vLyBpcyB0aGUgb25seSByZWxpYWJsZSB3YXkgdG8gaW5qZWN0IGludG8gQ29kZXgncyBCcm93c2VyV2luZG93cy5cbmZ1bmN0aW9uIHJlZ2lzdGVyUHJlbG9hZChzOiBFbGVjdHJvbi5TZXNzaW9uLCBsYWJlbDogc3RyaW5nKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVnID0gKHMgYXMgdW5rbm93biBhcyB7XG4gICAgICByZWdpc3RlclByZWxvYWRTY3JpcHQ/OiAob3B0czoge1xuICAgICAgICB0eXBlPzogXCJmcmFtZVwiIHwgXCJzZXJ2aWNlLXdvcmtlclwiO1xuICAgICAgICBpZD86IHN0cmluZztcbiAgICAgICAgZmlsZVBhdGg6IHN0cmluZztcbiAgICAgIH0pID0+IHN0cmluZztcbiAgICB9KS5yZWdpc3RlclByZWxvYWRTY3JpcHQ7XG4gICAgaWYgKHR5cGVvZiByZWcgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgcmVnLmNhbGwocywgeyB0eXBlOiBcImZyYW1lXCIsIGZpbGVQYXRoOiBQUkVMT0FEX1BBVEgsIGlkOiBcImNvZGV4LXBsdXNwbHVzXCIgfSk7XG4gICAgICBsb2coXCJpbmZvXCIsIGBwcmVsb2FkIHJlZ2lzdGVyZWQgKHJlZ2lzdGVyUHJlbG9hZFNjcmlwdCkgb24gJHtsYWJlbH06YCwgUFJFTE9BRF9QQVRIKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gRmFsbGJhY2sgZm9yIG9sZGVyIEVsZWN0cm9uIHZlcnNpb25zLlxuICAgIGNvbnN0IGV4aXN0aW5nID0gcy5nZXRQcmVsb2FkcygpO1xuICAgIGlmICghZXhpc3RpbmcuaW5jbHVkZXMoUFJFTE9BRF9QQVRIKSkge1xuICAgICAgcy5zZXRQcmVsb2FkcyhbLi4uZXhpc3RpbmcsIFBSRUxPQURfUEFUSF0pO1xuICAgIH1cbiAgICBsb2coXCJpbmZvXCIsIGBwcmVsb2FkIHJlZ2lzdGVyZWQgKHNldFByZWxvYWRzKSBvbiAke2xhYmVsfTpgLCBQUkVMT0FEX1BBVEgpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKGUgaW5zdGFuY2VvZiBFcnJvciAmJiBlLm1lc3NhZ2UuaW5jbHVkZXMoXCJleGlzdGluZyBJRFwiKSkge1xuICAgICAgbG9nKFwiaW5mb1wiLCBgcHJlbG9hZCBhbHJlYWR5IHJlZ2lzdGVyZWQgb24gJHtsYWJlbH06YCwgUFJFTE9BRF9QQVRIKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbG9nKFwiZXJyb3JcIiwgYHByZWxvYWQgcmVnaXN0cmF0aW9uIG9uICR7bGFiZWx9IGZhaWxlZDpgLCBlKTtcbiAgfVxufVxuXG5hcHAud2hlblJlYWR5KCkudGhlbigoKSA9PiB7XG4gIGxvZyhcImluZm9cIiwgXCJhcHAgcmVhZHkgZmlyZWRcIik7XG4gIGlmIChpc0NvZGV4UGx1c1BsdXNTYWZlTW9kZUVuYWJsZWQoKSkge1xuICAgIGxvZyhcIndhcm5cIiwgXCJzYWZlIG1vZGUgaXMgZW5hYmxlZDsgcHJlbG9hZCB3aWxsIG5vdCBiZSByZWdpc3RlcmVkXCIpO1xuICAgIHJldHVybjtcbiAgfVxuICByZWdpc3RlclByZWxvYWQoc2Vzc2lvbi5kZWZhdWx0U2Vzc2lvbiwgXCJkZWZhdWx0U2Vzc2lvblwiKTtcbn0pO1xuXG5hcHAub24oXCJzZXNzaW9uLWNyZWF0ZWRcIiwgKHMpID0+IHtcbiAgaWYgKGlzQ29kZXhQbHVzUGx1c1NhZmVNb2RlRW5hYmxlZCgpKSByZXR1cm47XG4gIHJlZ2lzdGVyUHJlbG9hZChzLCBcInNlc3Npb24tY3JlYXRlZFwiKTtcbn0pO1xuXG4vLyBESUFHTk9TVElDOiBsb2cgZXZlcnkgd2ViQ29udGVudHMgY3JlYXRpb24uIFVzZWZ1bCBmb3IgdmVyaWZ5aW5nIG91clxuLy8gcHJlbG9hZCByZWFjaGVzIGV2ZXJ5IHJlbmRlcmVyIENvZGV4IHNwYXducy5cbmFwcC5vbihcIndlYi1jb250ZW50cy1jcmVhdGVkXCIsIChfZSwgd2MpID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCB3cCA9ICh3YyBhcyB1bmtub3duIGFzIHsgZ2V0TGFzdFdlYlByZWZlcmVuY2VzPzogKCkgPT4gUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfSlcbiAgICAgIC5nZXRMYXN0V2ViUHJlZmVyZW5jZXM/LigpO1xuICAgIGxvZyhcImluZm9cIiwgXCJ3ZWItY29udGVudHMtY3JlYXRlZFwiLCB7XG4gICAgICBpZDogd2MuaWQsXG4gICAgICB0eXBlOiB3Yy5nZXRUeXBlKCksXG4gICAgICBzZXNzaW9uSXNEZWZhdWx0OiB3Yy5zZXNzaW9uID09PSBzZXNzaW9uLmRlZmF1bHRTZXNzaW9uLFxuICAgICAgc2FuZGJveDogd3A/LnNhbmRib3gsXG4gICAgICBjb250ZXh0SXNvbGF0aW9uOiB3cD8uY29udGV4dElzb2xhdGlvbixcbiAgICB9KTtcbiAgICB3Yy5vbihcInByZWxvYWQtZXJyb3JcIiwgKF9ldiwgcCwgZXJyKSA9PiB7XG4gICAgICBsb2coXCJlcnJvclwiLCBgd2MgJHt3Yy5pZH0gcHJlbG9hZC1lcnJvciBwYXRoPSR7cH1gLCBTdHJpbmcoZXJyPy5zdGFjayA/PyBlcnIpKTtcbiAgICB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZyhcImVycm9yXCIsIFwid2ViLWNvbnRlbnRzLWNyZWF0ZWQgaGFuZGxlciBmYWlsZWQ6XCIsIFN0cmluZygoZSBhcyBFcnJvcik/LnN0YWNrID8/IGUpKTtcbiAgfVxufSk7XG5cbmxvZyhcImluZm9cIiwgXCJtYWluLnRzIGV2YWx1YXRlZDsgYXBwLmlzUmVhZHk9XCIgKyBhcHAuaXNSZWFkeSgpKTtcbmlmIChpc0NvZGV4UGx1c1BsdXNTYWZlTW9kZUVuYWJsZWQoKSkge1xuICBsb2coXCJ3YXJuXCIsIFwic2FmZSBtb2RlIGlzIGVuYWJsZWQ7IHR3ZWFrcyB3aWxsIG5vdCBiZSBsb2FkZWRcIik7XG59XG5cbi8vIDIuIEluaXRpYWwgdHdlYWsgZGlzY292ZXJ5ICsgbWFpbi1zY29wZSBsb2FkLlxubG9hZEFsbE1haW5Ud2Vha3MoKTtcblxuYXBwLm9uKFwid2lsbC1xdWl0XCIsICgpID0+IHtcbiAgc3RvcEFsbE1haW5Ud2Vha3MoKTtcbiAgbmF0aXZlQnJpZGdlLmRpc3Bvc2VBbGwoKTtcbiAgZGlzcG9zZUFsbE93bFZpZXdzKCk7XG4gIC8vIEJlc3QtZWZmb3J0IGZsdXNoIG9mIGFueSBwZW5kaW5nIHN0b3JhZ2Ugd3JpdGVzLlxuICBmb3IgKGNvbnN0IHQgb2YgdHdlYWtTdGF0ZS5sb2FkZWRNYWluLnZhbHVlcygpKSB7XG4gICAgdHJ5IHtcbiAgICAgIHQuc3RvcmFnZS5mbHVzaCgpO1xuICAgIH0gY2F0Y2gge31cbiAgfVxufSk7XG5cbi8vIDMuIElQQzogZXhwb3NlIHR3ZWFrIG1ldGFkYXRhICsgcmV2ZWFsLWluLWZpbmRlci5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpsaXN0LXR3ZWFrc1wiLCBhc3luYyAoKSA9PiB7XG4gIGF3YWl0IFByb21pc2UuYWxsKHR3ZWFrU3RhdGUuZGlzY292ZXJlZC5tYXAoKHQpID0+IGVuc3VyZVR3ZWFrVXBkYXRlQ2hlY2sodCkpKTtcbiAgY29uc3QgdXBkYXRlQ2hlY2tzID0gcmVhZFN0YXRlKCkudHdlYWtVcGRhdGVDaGVja3MgPz8ge307XG4gIHJldHVybiB0d2Vha1N0YXRlLmRpc2NvdmVyZWQubWFwKCh0KSA9PiAoe1xuICAgIG1hbmlmZXN0OiB0Lm1hbmlmZXN0LFxuICAgIGVudHJ5OiB0LmVudHJ5LFxuICAgIGRpcjogdC5kaXIsXG4gICAgZW50cnlFeGlzdHM6IGV4aXN0c1N5bmModC5lbnRyeSksXG4gICAgZW5hYmxlZDogaXNUd2Vha0VuYWJsZWQodC5tYW5pZmVzdC5pZCksXG4gICAgdXBkYXRlOiB1cGRhdGVDaGVja3NbdC5tYW5pZmVzdC5pZF0gPz8gbnVsbCxcbiAgfSkpO1xufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpnZXQtdHdlYWstZW5hYmxlZFwiLCAoX2UsIGlkOiBzdHJpbmcpID0+IGlzVHdlYWtFbmFibGVkKGlkKSk7XG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6c2V0LXR3ZWFrLWVuYWJsZWRcIiwgKF9lLCBpZDogc3RyaW5nLCBlbmFibGVkOiBib29sZWFuKSA9PiB7XG4gIHJldHVybiBzZXRUd2Vha0VuYWJsZWRBbmRSZWxvYWQoaWQsIGVuYWJsZWQsIHR3ZWFrTGlmZWN5Y2xlRGVwcyk7XG59KTtcblxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmdldC1jb25maWdcIiwgKCkgPT4ge1xuICBjb25zdCBzID0gcmVhZFN0YXRlKCk7XG4gIGNvbnN0IGluc3RhbGxlclN0YXRlID0gcmVhZEluc3RhbGxlclN0YXRlKCk7XG4gIGNvbnN0IHNvdXJjZVJvb3QgPSBpbnN0YWxsZXJTdGF0ZT8uc291cmNlUm9vdCA/PyBmYWxsYmFja1NvdXJjZVJvb3QoKTtcbiAgcmV0dXJuIHtcbiAgICB2ZXJzaW9uOiBDT0RFWF9QTFVTUExVU19WRVJTSU9OLFxuICAgIGF1dG9VcGRhdGU6IHMuY29kZXhQbHVzUGx1cz8uYXV0b1VwZGF0ZSAhPT0gZmFsc2UsXG4gICAgc2FmZU1vZGU6IHMuY29kZXhQbHVzUGx1cz8uc2FmZU1vZGUgPT09IHRydWUsXG4gICAgdXBkYXRlQ2hhbm5lbDogcy5jb2RleFBsdXNQbHVzPy51cGRhdGVDaGFubmVsID8/IFwic3RhYmxlXCIsXG4gICAgdXBkYXRlUmVwbzogcy5jb2RleFBsdXNQbHVzPy51cGRhdGVSZXBvID8/IENPREVYX1BMVVNQTFVTX1JFUE8sXG4gICAgdXBkYXRlUmVmOiBzLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZVJlZiA/PyBcIlwiLFxuICAgIHVwZGF0ZUNoZWNrOiBzLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZUNoZWNrID8/IG51bGwsXG4gICAgc2VsZlVwZGF0ZTogcmVhZFNlbGZVcGRhdGVTdGF0ZSgpLFxuICAgIGluc3RhbGxhdGlvblNvdXJjZTogZGVzY3JpYmVJbnN0YWxsYXRpb25Tb3VyY2Uoc291cmNlUm9vdCksXG4gIH07XG59KTtcblxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOnNldC1hdXRvLXVwZGF0ZVwiLCAoX2UsIGVuYWJsZWQ6IGJvb2xlYW4pID0+IHtcbiAgc2V0Q29kZXhQbHVzUGx1c0F1dG9VcGRhdGUoISFlbmFibGVkKTtcbiAgcmV0dXJuIHsgYXV0b1VwZGF0ZTogaXNDb2RleFBsdXNQbHVzQXV0b1VwZGF0ZUVuYWJsZWQoKSB9O1xufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpzZXQtdXBkYXRlLWNvbmZpZ1wiLCAoX2UsIGNvbmZpZzoge1xuICB1cGRhdGVDaGFubmVsPzogU2VsZlVwZGF0ZUNoYW5uZWw7XG4gIHVwZGF0ZVJlcG8/OiBzdHJpbmc7XG4gIHVwZGF0ZVJlZj86IHN0cmluZztcbn0pID0+IHtcbiAgc2V0Q29kZXhQbHVzUGx1c1VwZGF0ZUNvbmZpZyhjb25maWcpO1xuICBjb25zdCBzID0gcmVhZFN0YXRlKCk7XG4gIHJldHVybiB7XG4gICAgdXBkYXRlQ2hhbm5lbDogcy5jb2RleFBsdXNQbHVzPy51cGRhdGVDaGFubmVsID8/IFwic3RhYmxlXCIsXG4gICAgdXBkYXRlUmVwbzogcy5jb2RleFBsdXNQbHVzPy51cGRhdGVSZXBvID8/IENPREVYX1BMVVNQTFVTX1JFUE8sXG4gICAgdXBkYXRlUmVmOiBzLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZVJlZiA/PyBcIlwiLFxuICB9O1xufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpjaGVjay1jb2RleHBwLXVwZGF0ZVwiLCBhc3luYyAoX2UsIGZvcmNlPzogYm9vbGVhbikgPT4ge1xuICByZXR1cm4gZW5zdXJlQ29kZXhQbHVzUGx1c1VwZGF0ZUNoZWNrKGZvcmNlID09PSB0cnVlKTtcbn0pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6cnVuLWNvZGV4cHAtdXBkYXRlXCIsIGFzeW5jICgpID0+IHtcbiAgY29uc3Qgc291cmNlUm9vdCA9IHJlYWRJbnN0YWxsZXJTdGF0ZSgpPy5zb3VyY2VSb290ID8/IGZhbGxiYWNrU291cmNlUm9vdCgpO1xuICBpZiAoIXNvdXJjZVJvb3QpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb2RleCsrIHNvdXJjZSBDTEkgd2FzIG5vdCBmb3VuZC4gUnVuIHRoZSBpbnN0YWxsZXIgb25jZSwgdGhlbiB0cnkgYWdhaW4uXCIpO1xuICB9XG4gIGNvbnN0IGNsaSA9IGpvaW4oc291cmNlUm9vdCwgXCJwYWNrYWdlc1wiLCBcImluc3RhbGxlclwiLCBcImRpc3RcIiwgXCJjbGkuanNcIik7XG4gIGlmICghZXhpc3RzU3luYyhjbGkpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ29kZXgrKyBzb3VyY2UgQ0xJIHdhcyBub3QgZm91bmQuIFJ1biB0aGUgaW5zdGFsbGVyIG9uY2UsIHRoZW4gdHJ5IGFnYWluLlwiKTtcbiAgfVxuICBjb25zdCBwZW5kaW5nID0gbWFya1NlbGZVcGRhdGVTdGFydGVkKHNvdXJjZVJvb3QpO1xuICBzdGFydEluc3RhbGxlZENsaShjbGksIFtcInVwZGF0ZVwiLCBcIi0td2F0Y2hlclwiXSk7XG4gIHJldHVybiBwZW5kaW5nO1xufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpnZXQtd2F0Y2hlci1oZWFsdGhcIiwgKCkgPT4gZ2V0V2F0Y2hlckhlYWx0aCh1c2VyUm9vdCEpKTtcblxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmdldC10d2Vhay1zdG9yZVwiLCBhc3luYyAoKSA9PiB7XG4gIGNvbnN0IHN0b3JlID0gYXdhaXQgZmV0Y2hUd2Vha1N0b3JlUmVnaXN0cnkoKTtcbiAgY29uc3QgcmVnaXN0cnkgPSBzdG9yZS5yZWdpc3RyeTtcbiAgY29uc3QgaW5zdGFsbGVkID0gbmV3IE1hcCh0d2Vha1N0YXRlLmRpc2NvdmVyZWQubWFwKCh0KSA9PiBbdC5tYW5pZmVzdC5pZCwgdF0pKTtcbiAgY29uc3QgZW50cmllcyA9IHNodWZmbGVTdG9yZUVudHJpZXMocmVnaXN0cnkuZW50cmllcywgcmFuZG9tSW50KTtcbiAgcmV0dXJuIHtcbiAgICAuLi5yZWdpc3RyeSxcbiAgICBzb3VyY2VVcmw6IFRXRUFLX1NUT1JFX0lOREVYX1VSTCxcbiAgICBmZXRjaGVkQXQ6IHN0b3JlLmZldGNoZWRBdCxcbiAgICBlbnRyaWVzOiBlbnRyaWVzLm1hcCgoZW50cnkpID0+IHtcbiAgICAgIGNvbnN0IGxvY2FsID0gaW5zdGFsbGVkLmdldChlbnRyeS5pZCk7XG4gICAgICBjb25zdCBwbGF0Zm9ybSA9IHN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGliaWxpdHkoZW50cnkpO1xuICAgICAgY29uc3QgcnVudGltZSA9IHN0b3JlRW50cnlSdW50aW1lQ29tcGF0aWJpbGl0eShlbnRyeSk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi5lbnRyeSxcbiAgICAgICAgcGxhdGZvcm0sXG4gICAgICAgIHJ1bnRpbWUsXG4gICAgICAgIGluc3RhbGxlZDogbG9jYWxcbiAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgdmVyc2lvbjogbG9jYWwubWFuaWZlc3QudmVyc2lvbixcbiAgICAgICAgICAgICAgZW5hYmxlZDogaXNUd2Vha0VuYWJsZWQobG9jYWwubWFuaWZlc3QuaWQpLFxuICAgICAgICAgICAgfVxuICAgICAgICAgIDogbnVsbCxcbiAgICAgIH07XG4gICAgfSksXG4gIH07XG59KTtcblxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmluc3RhbGwtc3RvcmUtdHdlYWtcIiwgYXN5bmMgKF9lLCBpZDogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IHsgcmVnaXN0cnkgfSA9IGF3YWl0IGZldGNoVHdlYWtTdG9yZVJlZ2lzdHJ5KCk7XG4gIGNvbnN0IGVudHJ5ID0gcmVnaXN0cnkuZW50cmllcy5maW5kKChjYW5kaWRhdGUpID0+IGNhbmRpZGF0ZS5pZCA9PT0gaWQpO1xuICBpZiAoIWVudHJ5KSB0aHJvdyBuZXcgRXJyb3IoYFR3ZWFrIHN0b3JlIGVudHJ5IG5vdCBmb3VuZDogJHtpZH1gKTtcbiAgYXNzZXJ0U3RvcmVFbnRyeVBsYXRmb3JtQ29tcGF0aWJsZShlbnRyeSk7XG4gIGFzc2VydFN0b3JlRW50cnlSdW50aW1lQ29tcGF0aWJsZShlbnRyeSk7XG4gIGF3YWl0IGluc3RhbGxTdG9yZVR3ZWFrKGVudHJ5KTtcbiAgcmVsb2FkVHdlYWtzKFwic3RvcmUtaW5zdGFsbFwiLCB0d2Vha0xpZmVjeWNsZURlcHMpO1xuICByZXR1cm4geyBpbnN0YWxsZWQ6IGVudHJ5LmlkIH07XG59KTtcblxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOnByZXBhcmUtdHdlYWstc3RvcmUtc3VibWlzc2lvblwiLCBhc3luYyAoX2UsIHJlcG9JbnB1dDogc3RyaW5nKSA9PiB7XG4gIHJldHVybiBwcmVwYXJlVHdlYWtTdG9yZVN1Ym1pc3Npb24ocmVwb0lucHV0KTtcbn0pO1xuXG4vLyBTYW5kYm94ZWQgcmVuZGVyZXIgcHJlbG9hZCBjYW4ndCB1c2UgTm9kZSBmcyB0byByZWFkIHR3ZWFrIHNvdXJjZS4gTWFpblxuLy8gcmVhZHMgaXQgb24gdGhlIHJlbmRlcmVyJ3MgYmVoYWxmLiBQYXRoIG11c3QgbGl2ZSB1bmRlciB0d2Vha3NEaXIgZm9yXG4vLyBzZWN1cml0eSBcdTIwMTQgd2UgcmVmdXNlIGFueXRoaW5nIGVsc2UuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6cmVhZC10d2Vhay1zb3VyY2VcIiwgKF9lLCBlbnRyeVBhdGg6IHN0cmluZykgPT4ge1xuICBjb25zdCByZXNvbHZlZCA9IHJlc29sdmUoZW50cnlQYXRoKTtcbiAgaWYgKCFpc1BhdGhJbnNpZGUoVFdFQUtTX0RJUiwgcmVzb2x2ZWQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwicGF0aCBvdXRzaWRlIHR3ZWFrcyBkaXJcIik7XG4gIH1cbiAgcmV0dXJuIHJlcXVpcmUoXCJub2RlOmZzXCIpLnJlYWRGaWxlU3luYyhyZXNvbHZlZCwgXCJ1dGY4XCIpO1xufSk7XG5cbi8qKlxuICogUmVhZCBhbiBhcmJpdHJhcnkgYXNzZXQgZmlsZSBmcm9tIGluc2lkZSBhIHR3ZWFrJ3MgZGlyZWN0b3J5IGFuZCByZXR1cm4gaXRcbiAqIGFzIGEgYGRhdGE6YCBVUkwuIFVzZWQgYnkgdGhlIHNldHRpbmdzIGluamVjdG9yIHRvIHJlbmRlciBtYW5pZmVzdCBpY29uc1xuICogKHRoZSByZW5kZXJlciBpcyBzYW5kYm94ZWQ7IGBmaWxlOi8vYCB3b24ndCBsb2FkKS5cbiAqXG4gKiBTZWN1cml0eTogY2FsbGVyIHBhc3NlcyBgdHdlYWtEaXJgIGFuZCBgcmVsUGF0aGA7IHdlICgxKSByZXF1aXJlIHR3ZWFrRGlyXG4gKiB0byBsaXZlIHVuZGVyIFRXRUFLU19ESVIsICgyKSByZXNvbHZlIHJlbFBhdGggYWdhaW5zdCBpdCBhbmQgcmUtY2hlY2sgdGhlXG4gKiByZXN1bHQgc3RpbGwgbGl2ZXMgdW5kZXIgVFdFQUtTX0RJUiwgKDMpIGNhcCBvdXRwdXQgc2l6ZSBhdCAxIE1pQi5cbiAqL1xuY29uc3QgQVNTRVRfTUFYX0JZVEVTID0gMTAyNCAqIDEwMjQ7XG5jb25zdCBNSU1FX0JZX0VYVDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgXCIucG5nXCI6IFwiaW1hZ2UvcG5nXCIsXG4gIFwiLmpwZ1wiOiBcImltYWdlL2pwZWdcIixcbiAgXCIuanBlZ1wiOiBcImltYWdlL2pwZWdcIixcbiAgXCIuZ2lmXCI6IFwiaW1hZ2UvZ2lmXCIsXG4gIFwiLndlYnBcIjogXCJpbWFnZS93ZWJwXCIsXG4gIFwiLnN2Z1wiOiBcImltYWdlL3N2Zyt4bWxcIixcbiAgXCIuaWNvXCI6IFwiaW1hZ2UveC1pY29uXCIsXG59O1xuaXBjTWFpbi5oYW5kbGUoXG4gIFwiY29kZXhwcDpyZWFkLXR3ZWFrLWFzc2V0XCIsXG4gIChfZSwgdHdlYWtEaXI6IHN0cmluZywgcmVsUGF0aDogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgZnMgPSByZXF1aXJlKFwibm9kZTpmc1wiKSBhcyB0eXBlb2YgaW1wb3J0KFwibm9kZTpmc1wiKTtcbiAgICBjb25zdCBkaXIgPSByZXNvbHZlKHR3ZWFrRGlyKTtcbiAgICBpZiAoIWlzUGF0aEluc2lkZShUV0VBS1NfRElSLCBkaXIpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ0d2Vha0RpciBvdXRzaWRlIHR3ZWFrcyBkaXJcIik7XG4gICAgfVxuICAgIGNvbnN0IGZ1bGwgPSByZXNvbHZlKGRpciwgcmVsUGF0aCk7XG4gICAgaWYgKCFpc1BhdGhJbnNpZGUoZGlyLCBmdWxsKSB8fCBmdWxsID09PSBkaXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcInBhdGggdHJhdmVyc2FsXCIpO1xuICAgIH1cbiAgICBjb25zdCBzdGF0ID0gZnMuc3RhdFN5bmMoZnVsbCk7XG4gICAgaWYgKHN0YXQuc2l6ZSA+IEFTU0VUX01BWF9CWVRFUykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBhc3NldCB0b28gbGFyZ2UgKCR7c3RhdC5zaXplfSA+ICR7QVNTRVRfTUFYX0JZVEVTfSlgKTtcbiAgICB9XG4gICAgY29uc3QgZXh0ID0gZnVsbC5zbGljZShmdWxsLmxhc3RJbmRleE9mKFwiLlwiKSkudG9Mb3dlckNhc2UoKTtcbiAgICBjb25zdCBtaW1lID0gTUlNRV9CWV9FWFRbZXh0XSA/PyBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiO1xuICAgIGNvbnN0IGJ1ZiA9IGZzLnJlYWRGaWxlU3luYyhmdWxsKTtcbiAgICByZXR1cm4gYGRhdGE6JHttaW1lfTtiYXNlNjQsJHtidWYudG9TdHJpbmcoXCJiYXNlNjRcIil9YDtcbiAgfSxcbik7XG5cbi8vIFNhbmRib3hlZCBwcmVsb2FkIGNhbid0IHdyaXRlIGxvZ3MgdG8gZGlzazsgZm9yd2FyZCB0byB1cyB2aWEgSVBDLlxuaXBjTWFpbi5vbihcImNvZGV4cHA6cHJlbG9hZC1sb2dcIiwgKF9lLCBsZXZlbDogXCJpbmZvXCIgfCBcIndhcm5cIiB8IFwiZXJyb3JcIiwgbXNnOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgbHZsID0gbGV2ZWwgPT09IFwiZXJyb3JcIiB8fCBsZXZlbCA9PT0gXCJ3YXJuXCIgPyBsZXZlbCA6IFwiaW5mb1wiO1xuICB0cnkge1xuICAgIGFwcGVuZENhcHBlZExvZyhqb2luKExPR19ESVIsIFwicHJlbG9hZC5sb2dcIiksIGBbJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCl9XSBbJHtsdmx9XSAke21zZ31cXG5gKTtcbiAgfSBjYXRjaCB7fVxufSk7XG5cbi8vIFNhbmRib3gtc2FmZSBmaWxlc3lzdGVtIG9wcyBmb3IgcmVuZGVyZXItc2NvcGUgdHdlYWtzLiBFYWNoIHR3ZWFrIGdldHNcbi8vIGEgc2FuZGJveGVkIGRpciB1bmRlciB1c2VyUm9vdC90d2Vhay1kYXRhLzxpZD4uIFJlbmRlcmVyIHNpZGUgY2FsbHMgdGhlc2Vcbi8vIG92ZXIgSVBDIGluc3RlYWQgb2YgdXNpbmcgTm9kZSBmcyBkaXJlY3RseS5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDp0d2Vhay1mc1wiLCAoX2UsIG9wOiBzdHJpbmcsIGlkOiBzdHJpbmcsIHA6IHN0cmluZywgYz86IHN0cmluZykgPT4ge1xuICBpZiAoIS9eW2EtekEtWjAtOS5fLV0rJC8udGVzdChpZCkpIHRocm93IG5ldyBFcnJvcihcImJhZCB0d2VhayBpZFwiKTtcbiAgY29uc3QgZGlyID0gam9pbih1c2VyUm9vdCEsIFwidHdlYWstZGF0YVwiLCBpZCk7XG4gIG1rZGlyU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICBjb25zdCBmdWxsID0gcmVzb2x2ZShkaXIsIHApO1xuICBpZiAoIWlzUGF0aEluc2lkZShkaXIsIGZ1bGwpIHx8IGZ1bGwgPT09IGRpcikgdGhyb3cgbmV3IEVycm9yKFwicGF0aCB0cmF2ZXJzYWxcIik7XG4gIGNvbnN0IGZzID0gcmVxdWlyZShcIm5vZGU6ZnNcIikgYXMgdHlwZW9mIGltcG9ydChcIm5vZGU6ZnNcIik7XG4gIHN3aXRjaCAob3ApIHtcbiAgICBjYXNlIFwicmVhZFwiOiByZXR1cm4gZnMucmVhZEZpbGVTeW5jKGZ1bGwsIFwidXRmOFwiKTtcbiAgICBjYXNlIFwid3JpdGVcIjogcmV0dXJuIGZzLndyaXRlRmlsZVN5bmMoZnVsbCwgYyA/PyBcIlwiLCBcInV0ZjhcIik7XG4gICAgY2FzZSBcImV4aXN0c1wiOiByZXR1cm4gZnMuZXhpc3RzU3luYyhmdWxsKTtcbiAgICBjYXNlIFwiZGF0YURpclwiOiByZXR1cm4gZGlyO1xuICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcihgdW5rbm93biBvcDogJHtvcH1gKTtcbiAgfVxufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDp1c2VyLXBhdGhzXCIsICgpID0+ICh7XG4gIHVzZXJSb290LFxuICBydW50aW1lRGlyLFxuICB0d2Vha3NEaXI6IFRXRUFLU19ESVIsXG4gIGxvZ0RpcjogTE9HX0RJUixcbn0pKTtcblxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmNvZGV4LXJ1bnRpbWUtaW5mb1wiLCAoKSA9PiBjdXJyZW50UnVudGltZUluZm8oKSk7XG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Y29kZXgtcnVudGltZS1jYXBhYmlsaXRpZXNcIiwgKCkgPT4gY3VycmVudFJ1bnRpbWVDYXBhYmlsaXRpZXMoKSk7XG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Y29kZXgtY2RwLXN0YXR1c1wiLCAoKSA9PiBnZXRDZHBTdGF0dXMoKSk7XG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Y29kZXgtY2RwLXRhcmdldHNcIiwgKCkgPT4gbGlzdENkcFRhcmdldHMoKSk7XG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Y29kZXgtd2luZG93LWNyZWF0ZVwiLCAoX2UsIG9wdHM6IENvZGV4Q3JlYXRlV2luZG93T3B0aW9ucykgPT4ge1xuICByZXR1cm4gY3JlYXRlQ29kZXhXaW5kb3cob3B0cyk7XG59KTtcbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpjb2RleC13aW5kb3ctcHJpbWFyeVwiLCAoKSA9PiBnZXRQcmltYXJ5Q29kZXhXaW5kb3dSZWYoKSk7XG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Y29kZXgtd2luZG93LWZvY3VzXCIsIChfZSwgd2luZG93SWQ6IG51bWJlcikgPT4gZm9jdXNDb2RleFdpbmRvdyh3aW5kb3dJZCkpO1xuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmNvZGV4LXdpbmRvdy1zaG93XCIsIChfZSwgd2luZG93SWQ6IG51bWJlcikgPT4gc2hvd0NvZGV4V2luZG93KHdpbmRvd0lkKSk7XG5pcGNNYWluLmhhbmRsZShcbiAgXCJjb2RleHBwOmNvZGV4LXZpZXctY3JlYXRlXCIsXG4gIGFzeW5jIChfZSwgdHdlYWtJZDogc3RyaW5nLCBvcHRpb25zOiBDb2RleFZpZXdDcmVhdGVPcHRpb25zKSA9PiB7XG4gICAgY29uc3QgdHdlYWsgPSBhc3NlcnRUd2Vha1ZpZXdQZXJtaXNzaW9uRm9ySWQodHdlYWtJZCk7XG4gICAgY29uc3QgcmVmID0gYXdhaXQgY3JlYXRlT3dsVmlldyh7IGlkOiB0d2Vhay5tYW5pZmVzdC5pZCwgZGlyOiB0d2Vhay5kaXIgfSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiByZWYuaWQsXG4gICAgICB3ZWJDb250ZW50c0lkOiByZWYud2ViQ29udGVudHNJZCxcbiAgICAgIHBhcmVudFdpbmRvd0lkOiByZWYucGFyZW50V2luZG93SWQsXG4gICAgfTtcbiAgfSxcbik7XG5pcGNNYWluLmhhbmRsZShcbiAgXCJjb2RleHBwOmNvZGV4LXZpZXctY2FsbFwiLFxuICAoX2UsIHR3ZWFrSWQ6IHN0cmluZywgdmlld0lkOiBzdHJpbmcsIG1ldGhvZDogc3RyaW5nLCBhcmc/OiB1bmtub3duLCBhcmcyPzogdW5rbm93bikgPT4ge1xuICAgIGFzc2VydFR3ZWFrVmlld1Blcm1pc3Npb25Gb3JJZCh0d2Vha0lkKTtcbiAgICByZXR1cm4gY2FsbE93bFZpZXcodHdlYWtJZCwgdmlld0lkLCBtZXRob2QsIGFyZywgYXJnMik7XG4gIH0sXG4pO1xuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmNvZGV4LXZpZXctZGlzcG9zZS10d2Vha1wiLCAoX2UsIHR3ZWFrSWQ6IHN0cmluZykgPT4ge1xuICBhc3NlcnRUd2Vha0lkKHR3ZWFrSWQpO1xuICBkaXNwb3NlT3dsVmlld3NGb3JUd2Vhayh0d2Vha0lkKTtcbn0pO1xuaXBjTWFpbi5oYW5kbGUoXG4gIFwiY29kZXhwcDpuYXRpdmUtbG9hZC1tb2R1bGVcIixcbiAgKF9lLCB0d2Vha0lkOiBzdHJpbmcsIG9wdGlvbnM6IE5hdGl2ZU1vZHVsZUxvYWRPcHRpb25zKSA9PiB7XG4gICAgY29uc3QgcmVmID0gbmF0aXZlQnJpZGdlLmxvYWRNb2R1bGUodHdlYWtDb250ZXh0KHR3ZWFrSWQsIFwibmF0aXZlLW1vZHVsZVwiKSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIHsgaWQ6IHJlZi5pZCwga2luZDogcmVmLmtpbmQgfTtcbiAgfSxcbik7XG5pcGNNYWluLmhhbmRsZShcbiAgXCJjb2RleHBwOm5hdGl2ZS1tb2R1bGUtcmVxdWVzdFwiLFxuICAoX2UsIHR3ZWFrSWQ6IHN0cmluZywgbW9kdWxlSWQ6IHN0cmluZywgbWV0aG9kOiBzdHJpbmcsIHBheWxvYWQ/OiB1bmtub3duLCB0aW1lb3V0TXM/OiBudW1iZXIpID0+IHtcbiAgICBhc3NlcnRUd2Vha1Blcm1pc3Npb25Gb3JJZCh0d2Vha0lkLCBcIm5hdGl2ZS1tb2R1bGVcIik7XG4gICAgcmV0dXJuIG5hdGl2ZUJyaWRnZS5yZXF1ZXN0TW9kdWxlKHR3ZWFrSWQsIG1vZHVsZUlkLCBtZXRob2QsIHBheWxvYWQsIHRpbWVvdXRNcyk7XG4gIH0sXG4pO1xuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOm5hdGl2ZS1tb2R1bGUtZGlzcG9zZVwiLCAoX2UsIHR3ZWFrSWQ6IHN0cmluZywgbW9kdWxlSWQ6IHN0cmluZykgPT4ge1xuICBhc3NlcnRUd2Vha1Blcm1pc3Npb25Gb3JJZCh0d2Vha0lkLCBcIm5hdGl2ZS1tb2R1bGVcIik7XG4gIHJldHVybiBuYXRpdmVCcmlkZ2UuZGlzcG9zZU1vZHVsZSh0d2Vha0lkLCBtb2R1bGVJZCk7XG59KTtcbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpuYXRpdmUtZGlzcG9zZS10d2Vha1wiLCAoX2UsIHR3ZWFrSWQ6IHN0cmluZykgPT4ge1xuICBhc3NlcnRUd2Vha0lkKHR3ZWFrSWQpO1xuICBuYXRpdmVCcmlkZ2UuZGlzcG9zZVR3ZWFrKHR3ZWFrSWQpO1xufSk7XG5pcGNNYWluLmhhbmRsZShcbiAgXCJjb2RleHBwOm5hdGl2ZS1jcmVhdGUtcGFuZWxcIixcbiAgYXN5bmMgKF9lLCB0d2Vha0lkOiBzdHJpbmcsIG9wdGlvbnM6IE5hdGl2ZVBhbmVsQ3JlYXRlT3B0aW9ucykgPT4ge1xuICAgIGNvbnN0IHJlZiA9IGF3YWl0IG5hdGl2ZUJyaWRnZS5jcmVhdGVQYW5lbCh0d2Vha0NvbnRleHQodHdlYWtJZCwgXCJuYXRpdmUtdmlld1wiKSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIHsgaWQ6IHJlZi5pZCwgd2luZG93SWQ6IHJlZi53aW5kb3dJZCB9O1xuICB9LFxuKTtcbmlwY01haW4uaGFuZGxlKFxuICBcImNvZGV4cHA6bmF0aXZlLWF0dGFjaC12aWV3XCIsXG4gIGFzeW5jIChfZSwgdHdlYWtJZDogc3RyaW5nLCBvcHRpb25zOiBOYXRpdmVWaWV3QXR0YWNoT3B0aW9ucykgPT4ge1xuICAgIGNvbnN0IHJlZiA9IGF3YWl0IG5hdGl2ZUJyaWRnZS5hdHRhY2hWaWV3KHR3ZWFrQ29udGV4dCh0d2Vha0lkLCBcIm5hdGl2ZS12aWV3XCIpLCBvcHRpb25zKTtcbiAgICByZXR1cm4geyBpZDogcmVmLmlkIH07XG4gIH0sXG4pO1xuaXBjTWFpbi5oYW5kbGUoXG4gIFwiY29kZXhwcDpuYXRpdmUtaW5zdGFuY2UtY2FsbFwiLFxuICBhc3luYyAoX2UsIHR3ZWFrSWQ6IHN0cmluZywga2luZDogXCJwYW5lbFwiIHwgXCJ2aWV3XCIsIGluc3RhbmNlSWQ6IHN0cmluZywgbWV0aG9kOiBzdHJpbmcsIGFyZz86IHVua25vd24pID0+IHtcbiAgICBhc3NlcnRUd2Vha1Blcm1pc3Npb25Gb3JJZCh0d2Vha0lkLCBcIm5hdGl2ZS12aWV3XCIpO1xuICAgIHJldHVybiBuYXRpdmVCcmlkZ2UuY2FsbEluc3RhbmNlKHR3ZWFrSWQsIGtpbmQsIGluc3RhbmNlSWQsIG1ldGhvZCwgYXJnKTtcbiAgfSxcbik7XG5pcGNNYWluLmhhbmRsZShcbiAgXCJjb2RleHBwOm5hdGl2ZS1sYXVuY2gtaGVscGVyXCIsXG4gIChfZSwgdHdlYWtJZDogc3RyaW5nLCBvcHRpb25zOiBOYXRpdmVIZWxwZXJMYXVuY2hPcHRpb25zKSA9PiB7XG4gICAgY29uc3QgcmVmID0gbmF0aXZlQnJpZGdlLmxhdW5jaEhlbHBlcih0d2Vha0NvbnRleHQodHdlYWtJZCwgXCJuYXRpdmUtaGVscGVyXCIpLCBvcHRpb25zKTtcbiAgICByZXR1cm4geyBpZDogcmVmLmlkLCBwaWQ6IHJlZi5waWQgfTtcbiAgfSxcbik7XG5pcGNNYWluLmhhbmRsZShcbiAgXCJjb2RleHBwOm5hdGl2ZS1oZWxwZXItY2FsbFwiLFxuICAoX2UsIHR3ZWFrSWQ6IHN0cmluZywgaGVscGVySWQ6IHN0cmluZywgbWV0aG9kOiBzdHJpbmcsIHBheWxvYWQ/OiB1bmtub3duLCB0aW1lb3V0TXM/OiBudW1iZXIpID0+IHtcbiAgICBhc3NlcnRUd2Vha1Blcm1pc3Npb25Gb3JJZCh0d2Vha0lkLCBcIm5hdGl2ZS1oZWxwZXJcIik7XG4gICAgcmV0dXJuIG5hdGl2ZUJyaWRnZS5jYWxsSGVscGVyKHR3ZWFrSWQsIGhlbHBlcklkLCBtZXRob2QsIHBheWxvYWQsIHRpbWVvdXRNcyk7XG4gIH0sXG4pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6cmV2ZWFsXCIsIChfZSwgcDogc3RyaW5nKSA9PiB7XG4gIHNoZWxsLm9wZW5QYXRoKHApLmNhdGNoKCgpID0+IHt9KTtcbn0pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6b3Blbi1leHRlcm5hbFwiLCAoX2UsIHVybDogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IHBhcnNlZCA9IG5ldyBVUkwodXJsKTtcbiAgaWYgKHBhcnNlZC5wcm90b2NvbCAhPT0gXCJodHRwczpcIiB8fCBwYXJzZWQuaG9zdG5hbWUgIT09IFwiZ2l0aHViLmNvbVwiKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwib25seSBnaXRodWIuY29tIGxpbmtzIGNhbiBiZSBvcGVuZWQgZnJvbSB0d2VhayBtZXRhZGF0YVwiKTtcbiAgfVxuICBzaGVsbC5vcGVuRXh0ZXJuYWwocGFyc2VkLnRvU3RyaW5nKCkpLmNhdGNoKCgpID0+IHt9KTtcbn0pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Y29weS10ZXh0XCIsIChfZSwgdGV4dDogc3RyaW5nKSA9PiB7XG4gIGNsaXBib2FyZC53cml0ZVRleHQoU3RyaW5nKHRleHQpKTtcbiAgcmV0dXJuIHRydWU7XG59KTtcblxuLy8gTWFudWFsIGZvcmNlLXJlbG9hZCB0cmlnZ2VyIGZyb20gdGhlIHJlbmRlcmVyIChlLmcuIHRoZSBcIkZvcmNlIFJlbG9hZFwiXG4vLyBidXR0b24gb24gb3VyIGluamVjdGVkIFR3ZWFrcyBwYWdlKS4gQnlwYXNzZXMgdGhlIHdhdGNoZXIgZGVib3VuY2UuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6cmVsb2FkLXR3ZWFrc1wiLCAoKSA9PiB7XG4gIHJlbG9hZFR3ZWFrcyhcIm1hbnVhbFwiLCB0d2Vha0xpZmVjeWNsZURlcHMpO1xuICByZXR1cm4geyBhdDogRGF0ZS5ub3coKSwgY291bnQ6IHR3ZWFrU3RhdGUuZGlzY292ZXJlZC5sZW5ndGggfTtcbn0pO1xuXG4vLyA0LiBGaWxlc3lzdGVtIHdhdGNoZXIgXHUyMTkyIGRlYm91bmNlZCByZWxvYWQgKyBicm9hZGNhc3QuXG4vLyAgICBXZSB3YXRjaCB0aGUgdHdlYWtzIGRpciBmb3IgYW55IGNoYW5nZS4gT24gdGhlIGZpcnN0IHRpY2sgb2YgaW5hY3Rpdml0eVxuLy8gICAgd2Ugc3RvcCBtYWluLXNpZGUgdHdlYWtzLCBjbGVhciB0aGVpciBjYWNoZWQgbW9kdWxlcywgcmUtZGlzY292ZXIsIHRoZW5cbi8vICAgIHJlc3RhcnQgYW5kIGJyb2FkY2FzdCBgY29kZXhwcDp0d2Vha3MtY2hhbmdlZGAgdG8gZXZlcnkgcmVuZGVyZXIgc28gaXRcbi8vICAgIGNhbiByZS1pbml0IGl0cyBob3N0LlxuY29uc3QgUkVMT0FEX0RFQk9VTkNFX01TID0gMjUwO1xubGV0IHJlbG9hZFRpbWVyOiBOb2RlSlMuVGltZW91dCB8IG51bGwgPSBudWxsO1xuZnVuY3Rpb24gc2NoZWR1bGVSZWxvYWQocmVhc29uOiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKHJlbG9hZFRpbWVyKSBjbGVhclRpbWVvdXQocmVsb2FkVGltZXIpO1xuICByZWxvYWRUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgIHJlbG9hZFRpbWVyID0gbnVsbDtcbiAgICByZWxvYWRUd2Vha3MocmVhc29uLCB0d2Vha0xpZmVjeWNsZURlcHMpO1xuICB9LCBSRUxPQURfREVCT1VOQ0VfTVMpO1xufVxuXG50cnkge1xuICBjb25zdCB3YXRjaGVyID0gY2hva2lkYXIud2F0Y2goVFdFQUtTX0RJUiwge1xuICAgIGlnbm9yZUluaXRpYWw6IHRydWUsXG4gICAgLy8gV2FpdCBmb3IgZmlsZXMgdG8gc2V0dGxlIGJlZm9yZSB0cmlnZ2VyaW5nIFx1MjAxNCBndWFyZHMgYWdhaW5zdCBwYXJ0aWFsbHlcbiAgICAvLyB3cml0dGVuIHR3ZWFrIGZpbGVzIGR1cmluZyBlZGl0b3Igc2F2ZXMgLyBnaXQgY2hlY2tvdXRzLlxuICAgIGF3YWl0V3JpdGVGaW5pc2g6IHsgc3RhYmlsaXR5VGhyZXNob2xkOiAxNTAsIHBvbGxJbnRlcnZhbDogNTAgfSxcbiAgICAvLyBBdm9pZCBlYXRpbmcgQ1BVIG9uIGh1Z2Ugbm9kZV9tb2R1bGVzIHRyZWVzIGluc2lkZSB0d2VhayBmb2xkZXJzLlxuICAgIGlnbm9yZWQ6IChwKSA9PiBwLmluY2x1ZGVzKGAke1RXRUFLU19ESVJ9L2ApICYmIC9cXC9ub2RlX21vZHVsZXNcXC8vLnRlc3QocCksXG4gIH0pO1xuICB3YXRjaGVyLm9uKFwiYWxsXCIsIChldmVudCwgcGF0aCkgPT4gc2NoZWR1bGVSZWxvYWQoYCR7ZXZlbnR9ICR7cGF0aH1gKSk7XG4gIHdhdGNoZXIub24oXCJlcnJvclwiLCAoZSkgPT4gbG9nKFwid2FyblwiLCBcIndhdGNoZXIgZXJyb3I6XCIsIGUpKTtcbiAgbG9nKFwiaW5mb1wiLCBcIndhdGNoaW5nXCIsIFRXRUFLU19ESVIpO1xuICBhcHAub24oXCJ3aWxsLXF1aXRcIiwgKCkgPT4gd2F0Y2hlci5jbG9zZSgpLmNhdGNoKCgpID0+IHt9KSk7XG59IGNhdGNoIChlKSB7XG4gIGxvZyhcImVycm9yXCIsIFwiZmFpbGVkIHRvIHN0YXJ0IHdhdGNoZXI6XCIsIGUpO1xufVxuXG4vLyAtLS0gaGVscGVycyAtLS1cblxuZnVuY3Rpb24gbG9hZEFsbE1haW5Ud2Vha3MoKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkID0gZGlzY292ZXJUd2Vha3MoVFdFQUtTX0RJUik7XG4gICAgbG9nKFxuICAgICAgXCJpbmZvXCIsXG4gICAgICBgZGlzY292ZXJlZCAke3R3ZWFrU3RhdGUuZGlzY292ZXJlZC5sZW5ndGh9IHR3ZWFrKHMpOmAsXG4gICAgICB0d2Vha1N0YXRlLmRpc2NvdmVyZWQubWFwKCh0KSA9PiB0Lm1hbmlmZXN0LmlkKS5qb2luKFwiLCBcIiksXG4gICAgKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZyhcImVycm9yXCIsIFwidHdlYWsgZGlzY292ZXJ5IGZhaWxlZDpcIiwgZSk7XG4gICAgdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkID0gW107XG4gIH1cblxuICBzeW5jTWNwU2VydmVyc0Zyb21FbmFibGVkVHdlYWtzKCk7XG5cbiAgZm9yIChjb25zdCB0IG9mIHR3ZWFrU3RhdGUuZGlzY292ZXJlZCkge1xuICAgIGlmICghaXNNYWluUHJvY2Vzc1R3ZWFrU2NvcGUodC5tYW5pZmVzdC5zY29wZSkpIGNvbnRpbnVlO1xuICAgIGlmICghaXNUd2Vha0VuYWJsZWQodC5tYW5pZmVzdC5pZCkpIHtcbiAgICAgIGxvZyhcImluZm9cIiwgYHNraXBwaW5nIGRpc2FibGVkIG1haW4gdHdlYWs6ICR7dC5tYW5pZmVzdC5pZH1gKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgbW9kID0gcmVxdWlyZSh0LmVudHJ5KTtcbiAgICAgIGNvbnN0IHR3ZWFrID0gbW9kLmRlZmF1bHQgPz8gbW9kO1xuICAgICAgaWYgKHR5cGVvZiB0d2Vhaz8uc3RhcnQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBjb25zdCBzdG9yYWdlID0gY3JlYXRlRGlza1N0b3JhZ2UodXNlclJvb3QhLCB0Lm1hbmlmZXN0LmlkKTtcbiAgICAgICAgdHdlYWsuc3RhcnQoe1xuICAgICAgICAgIG1hbmlmZXN0OiB0Lm1hbmlmZXN0LFxuICAgICAgICAgIHByb2Nlc3M6IFwibWFpblwiLFxuICAgICAgICAgIGxvZzogbWFrZUxvZ2dlcih0Lm1hbmlmZXN0LmlkKSxcbiAgICAgICAgICBzdG9yYWdlLFxuICAgICAgICAgIGlwYzogbWFrZU1haW5JcGModC5tYW5pZmVzdC5pZCksXG4gICAgICAgICAgZnM6IG1ha2VNYWluRnModC5tYW5pZmVzdC5pZCksXG4gICAgICAgICAgY29kZXg6IG1ha2VDb2RleEFwaSh0KSxcbiAgICAgICAgfSk7XG4gICAgICAgIHR3ZWFrU3RhdGUubG9hZGVkTWFpbi5zZXQodC5tYW5pZmVzdC5pZCwge1xuICAgICAgICAgIHN0b3A6IHR3ZWFrLnN0b3AsXG4gICAgICAgICAgc3RvcmFnZSxcbiAgICAgICAgfSk7XG4gICAgICAgIGxvZyhcImluZm9cIiwgYHN0YXJ0ZWQgbWFpbiB0d2VhazogJHt0Lm1hbmlmZXN0LmlkfWApO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZyhcImVycm9yXCIsIGB0d2VhayAke3QubWFuaWZlc3QuaWR9IGZhaWxlZCB0byBzdGFydDpgLCBlKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gc3luY01jcFNlcnZlcnNGcm9tRW5hYmxlZFR3ZWFrcygpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXN1bHQgPSBzeW5jTWFuYWdlZE1jcFNlcnZlcnMoe1xuICAgICAgY29uZmlnUGF0aDogQ09ERVhfQ09ORklHX0ZJTEUsXG4gICAgICB0d2Vha3M6IHR3ZWFrU3RhdGUuZGlzY292ZXJlZC5maWx0ZXIoKHQpID0+IGlzVHdlYWtFbmFibGVkKHQubWFuaWZlc3QuaWQpKSxcbiAgICB9KTtcbiAgICBpZiAocmVzdWx0LmNoYW5nZWQpIHtcbiAgICAgIGxvZyhcImluZm9cIiwgYHN5bmNlZCBDb2RleCBNQ1AgY29uZmlnOiAke3Jlc3VsdC5zZXJ2ZXJOYW1lcy5qb2luKFwiLCBcIikgfHwgXCJub25lXCJ9YCk7XG4gICAgfVxuICAgIGlmIChyZXN1bHQuc2tpcHBlZFNlcnZlck5hbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGxvZyhcbiAgICAgICAgXCJpbmZvXCIsXG4gICAgICAgIGBza2lwcGVkIENvZGV4KysgbWFuYWdlZCBNQ1Agc2VydmVyKHMpIGFscmVhZHkgY29uZmlndXJlZCBieSB1c2VyOiAke3Jlc3VsdC5za2lwcGVkU2VydmVyTmFtZXMuam9pbihcIiwgXCIpfWAsXG4gICAgICApO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZyhcIndhcm5cIiwgXCJmYWlsZWQgdG8gc3luYyBDb2RleCBNQ1AgY29uZmlnOlwiLCBlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzdG9wQWxsTWFpblR3ZWFrcygpOiB2b2lkIHtcbiAgZm9yIChjb25zdCBbaWQsIHRdIG9mIHR3ZWFrU3RhdGUubG9hZGVkTWFpbikge1xuICAgIHRyeSB7XG4gICAgICB0LnN0b3A/LigpO1xuICAgICAgdC5zdG9yYWdlLmZsdXNoKCk7XG4gICAgICBsb2coXCJpbmZvXCIsIGBzdG9wcGVkIG1haW4gdHdlYWs6ICR7aWR9YCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nKFwid2FyblwiLCBgc3RvcCBmYWlsZWQgZm9yICR7aWR9OmAsIGUpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBuYXRpdmVCcmlkZ2UuZGlzcG9zZVR3ZWFrKGlkKTtcbiAgICAgIGRpc3Bvc2VPd2xWaWV3c0ZvclR3ZWFrKGlkKTtcbiAgICB9XG4gIH1cbiAgdHdlYWtTdGF0ZS5sb2FkZWRNYWluLmNsZWFyKCk7XG59XG5cbmZ1bmN0aW9uIGNsZWFyVHdlYWtNb2R1bGVDYWNoZSgpOiB2b2lkIHtcbiAgLy8gRHJvcCBhbnkgY2FjaGVkIHJlcXVpcmUoKSBlbnRyaWVzIHRoYXQgbGl2ZSBpbnNpZGUgdGhlIHR3ZWFrcyBkaXIgc28gYVxuICAvLyByZS1yZXF1aXJlIG9uIG5leHQgbG9hZCBwaWNrcyB1cCBmcmVzaCBjb2RlLlxuICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhyZXF1aXJlLmNhY2hlKSkge1xuICAgIGlmIChpc1BhdGhJbnNpZGUoVFdFQUtTX0RJUiwga2V5KSkgZGVsZXRlIHJlcXVpcmUuY2FjaGVba2V5XTtcbiAgfVxufVxuXG5jb25zdCBVUERBVEVfQ0hFQ0tfSU5URVJWQUxfTVMgPSAyNCAqIDYwICogNjAgKiAxMDAwO1xuY29uc3QgVkVSU0lPTl9SRSA9IC9edj8oXFxkKylcXC4oXFxkKylcXC4oXFxkKykoPzpbLStdLiopPyQvO1xuXG5hc3luYyBmdW5jdGlvbiBlbnN1cmVDb2RleFBsdXNQbHVzVXBkYXRlQ2hlY2soZm9yY2UgPSBmYWxzZSk6IFByb21pc2U8Q29kZXhQbHVzUGx1c1VwZGF0ZUNoZWNrPiB7XG4gIGNvbnN0IHN0YXRlID0gcmVhZFN0YXRlKCk7XG4gIGNvbnN0IGNhY2hlZCA9IHN0YXRlLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZUNoZWNrO1xuICBjb25zdCBjaGFubmVsID0gc3RhdGUuY29kZXhQbHVzUGx1cz8udXBkYXRlQ2hhbm5lbCA/PyBcInN0YWJsZVwiO1xuICBjb25zdCByZXBvID0gc3RhdGUuY29kZXhQbHVzUGx1cz8udXBkYXRlUmVwbyA/PyBDT0RFWF9QTFVTUExVU19SRVBPO1xuICBpZiAoXG4gICAgIWZvcmNlICYmXG4gICAgY2FjaGVkICYmXG4gICAgY2FjaGVkLmN1cnJlbnRWZXJzaW9uID09PSBDT0RFWF9QTFVTUExVU19WRVJTSU9OICYmXG4gICAgRGF0ZS5ub3coKSAtIERhdGUucGFyc2UoY2FjaGVkLmNoZWNrZWRBdCkgPCBVUERBVEVfQ0hFQ0tfSU5URVJWQUxfTVNcbiAgKSB7XG4gICAgcmV0dXJuIGNhY2hlZDtcbiAgfVxuXG4gIGNvbnN0IHJlbGVhc2UgPSBhd2FpdCBmZXRjaExhdGVzdFJlbGVhc2UocmVwbywgQ09ERVhfUExVU1BMVVNfVkVSU0lPTiwgY2hhbm5lbCA9PT0gXCJwcmVyZWxlYXNlXCIpO1xuICBjb25zdCBsYXRlc3RWZXJzaW9uID0gcmVsZWFzZS5sYXRlc3RUYWcgPyBub3JtYWxpemVWZXJzaW9uKHJlbGVhc2UubGF0ZXN0VGFnKSA6IG51bGw7XG4gIGNvbnN0IGNoZWNrOiBDb2RleFBsdXNQbHVzVXBkYXRlQ2hlY2sgPSB7XG4gICAgY2hlY2tlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgY3VycmVudFZlcnNpb246IENPREVYX1BMVVNQTFVTX1ZFUlNJT04sXG4gICAgbGF0ZXN0VmVyc2lvbixcbiAgICByZWxlYXNlVXJsOiByZWxlYXNlLnJlbGVhc2VVcmwgPz8gYGh0dHBzOi8vZ2l0aHViLmNvbS8ke3JlcG99L3JlbGVhc2VzYCxcbiAgICByZWxlYXNlTm90ZXM6IHJlbGVhc2UucmVsZWFzZU5vdGVzLFxuICAgIHVwZGF0ZUF2YWlsYWJsZTogbGF0ZXN0VmVyc2lvblxuICAgICAgPyBjb21wYXJlVmVyc2lvbnMobm9ybWFsaXplVmVyc2lvbihsYXRlc3RWZXJzaW9uKSwgQ09ERVhfUExVU1BMVVNfVkVSU0lPTikgPiAwXG4gICAgICA6IGZhbHNlLFxuICAgIC4uLihyZWxlYXNlLmVycm9yID8geyBlcnJvcjogcmVsZWFzZS5lcnJvciB9IDoge30pLFxuICB9O1xuICBzdGF0ZS5jb2RleFBsdXNQbHVzID8/PSB7fTtcbiAgc3RhdGUuY29kZXhQbHVzUGx1cy51cGRhdGVDaGVjayA9IGNoZWNrO1xuICB3cml0ZVN0YXRlKHN0YXRlKTtcbiAgcmV0dXJuIGNoZWNrO1xufVxuXG5hc3luYyBmdW5jdGlvbiBlbnN1cmVUd2Vha1VwZGF0ZUNoZWNrKHQ6IERpc2NvdmVyZWRUd2Vhayk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBpZCA9IHQubWFuaWZlc3QuaWQ7XG4gIGNvbnN0IHJlcG8gPSB0Lm1hbmlmZXN0LmdpdGh1YlJlcG87XG4gIGNvbnN0IHN0YXRlID0gcmVhZFN0YXRlKCk7XG4gIGNvbnN0IGNhY2hlZCA9IHN0YXRlLnR3ZWFrVXBkYXRlQ2hlY2tzPy5baWRdO1xuICBpZiAoXG4gICAgY2FjaGVkICYmXG4gICAgY2FjaGVkLnJlcG8gPT09IHJlcG8gJiZcbiAgICBjYWNoZWQuY3VycmVudFZlcnNpb24gPT09IHQubWFuaWZlc3QudmVyc2lvbiAmJlxuICAgIERhdGUubm93KCkgLSBEYXRlLnBhcnNlKGNhY2hlZC5jaGVja2VkQXQpIDwgVVBEQVRFX0NIRUNLX0lOVEVSVkFMX01TXG4gICkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IG5leHQgPSBhd2FpdCBmZXRjaExhdGVzdFJlbGVhc2UocmVwbywgdC5tYW5pZmVzdC52ZXJzaW9uKTtcbiAgY29uc3QgbGF0ZXN0VmVyc2lvbiA9IG5leHQubGF0ZXN0VGFnID8gbm9ybWFsaXplVmVyc2lvbihuZXh0LmxhdGVzdFRhZykgOiBudWxsO1xuICBjb25zdCBjaGVjazogVHdlYWtVcGRhdGVDaGVjayA9IHtcbiAgICBjaGVja2VkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICByZXBvLFxuICAgIGN1cnJlbnRWZXJzaW9uOiB0Lm1hbmlmZXN0LnZlcnNpb24sXG4gICAgbGF0ZXN0VmVyc2lvbixcbiAgICBsYXRlc3RUYWc6IG5leHQubGF0ZXN0VGFnLFxuICAgIHJlbGVhc2VVcmw6IG5leHQucmVsZWFzZVVybCxcbiAgICB1cGRhdGVBdmFpbGFibGU6IGxhdGVzdFZlcnNpb25cbiAgICAgID8gY29tcGFyZVZlcnNpb25zKGxhdGVzdFZlcnNpb24sIG5vcm1hbGl6ZVZlcnNpb24odC5tYW5pZmVzdC52ZXJzaW9uKSkgPiAwXG4gICAgICA6IGZhbHNlLFxuICAgIC4uLihuZXh0LmVycm9yID8geyBlcnJvcjogbmV4dC5lcnJvciB9IDoge30pLFxuICB9O1xuICBzdGF0ZS50d2Vha1VwZGF0ZUNoZWNrcyA/Pz0ge307XG4gIHN0YXRlLnR3ZWFrVXBkYXRlQ2hlY2tzW2lkXSA9IGNoZWNrO1xuICB3cml0ZVN0YXRlKHN0YXRlKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hMYXRlc3RSZWxlYXNlKFxuICByZXBvOiBzdHJpbmcsXG4gIGN1cnJlbnRWZXJzaW9uOiBzdHJpbmcsXG4gIGluY2x1ZGVQcmVyZWxlYXNlID0gZmFsc2UsXG4pOiBQcm9taXNlPHsgbGF0ZXN0VGFnOiBzdHJpbmcgfCBudWxsOyByZWxlYXNlVXJsOiBzdHJpbmcgfCBudWxsOyByZWxlYXNlTm90ZXM6IHN0cmluZyB8IG51bGw7IGVycm9yPzogc3RyaW5nIH0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBjb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgIGNvbnN0IHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IGNvbnRyb2xsZXIuYWJvcnQoKSwgODAwMCk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGVuZHBvaW50ID0gaW5jbHVkZVByZXJlbGVhc2UgPyBcInJlbGVhc2VzP3Blcl9wYWdlPTIwXCIgOiBcInJlbGVhc2VzL2xhdGVzdFwiO1xuICAgICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goYGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvJHtyZXBvfS8ke2VuZHBvaW50fWAsIHtcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIFwiQWNjZXB0XCI6IFwiYXBwbGljYXRpb24vdm5kLmdpdGh1Yitqc29uXCIsXG4gICAgICAgICAgXCJVc2VyLUFnZW50XCI6IGBjb2RleC1wbHVzcGx1cy8ke2N1cnJlbnRWZXJzaW9ufWAsXG4gICAgICAgIH0sXG4gICAgICAgIHNpZ25hbDogY29udHJvbGxlci5zaWduYWwsXG4gICAgICB9KTtcbiAgICAgIGlmIChyZXMuc3RhdHVzID09PSA0MDQpIHtcbiAgICAgICAgcmV0dXJuIHsgbGF0ZXN0VGFnOiBudWxsLCByZWxlYXNlVXJsOiBudWxsLCByZWxlYXNlTm90ZXM6IG51bGwsIGVycm9yOiBcIm5vIEdpdEh1YiByZWxlYXNlIGZvdW5kXCIgfTtcbiAgICAgIH1cbiAgICAgIGlmICghcmVzLm9rKSB7XG4gICAgICAgIHJldHVybiB7IGxhdGVzdFRhZzogbnVsbCwgcmVsZWFzZVVybDogbnVsbCwgcmVsZWFzZU5vdGVzOiBudWxsLCBlcnJvcjogYEdpdEh1YiByZXR1cm5lZCAke3Jlcy5zdGF0dXN9YCB9O1xuICAgICAgfVxuICAgICAgY29uc3QganNvbiA9IGF3YWl0IHJlcy5qc29uKCkgYXMgeyB0YWdfbmFtZT86IHN0cmluZzsgaHRtbF91cmw/OiBzdHJpbmc7IGJvZHk/OiBzdHJpbmc7IGRyYWZ0PzogYm9vbGVhbiB9IHwgQXJyYXk8eyB0YWdfbmFtZT86IHN0cmluZzsgaHRtbF91cmw/OiBzdHJpbmc7IGJvZHk/OiBzdHJpbmc7IGRyYWZ0PzogYm9vbGVhbiB9PjtcbiAgICAgIGNvbnN0IGJvZHkgPSBBcnJheS5pc0FycmF5KGpzb24pID8ganNvbi5maW5kKChyZWxlYXNlKSA9PiAhcmVsZWFzZS5kcmFmdCkgOiBqc29uO1xuICAgICAgaWYgKCFib2R5KSB7XG4gICAgICAgIHJldHVybiB7IGxhdGVzdFRhZzogbnVsbCwgcmVsZWFzZVVybDogbnVsbCwgcmVsZWFzZU5vdGVzOiBudWxsLCBlcnJvcjogXCJubyBHaXRIdWIgcmVsZWFzZSBmb3VuZFwiIH07XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsYXRlc3RUYWc6IGJvZHkudGFnX25hbWUgPz8gbnVsbCxcbiAgICAgICAgcmVsZWFzZVVybDogYm9keS5odG1sX3VybCA/PyBgaHR0cHM6Ly9naXRodWIuY29tLyR7cmVwb30vcmVsZWFzZXNgLFxuICAgICAgICByZWxlYXNlTm90ZXM6IGJvZHkuYm9keSA/PyBudWxsLFxuICAgICAgfTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiB7XG4gICAgICBsYXRlc3RUYWc6IG51bGwsXG4gICAgICByZWxlYXNlVXJsOiBudWxsLFxuICAgICAgcmVsZWFzZU5vdGVzOiBudWxsLFxuICAgICAgZXJyb3I6IGUgaW5zdGFuY2VvZiBFcnJvciA/IGUubWVzc2FnZSA6IFN0cmluZyhlKSxcbiAgICB9O1xuICB9XG59XG5cbmludGVyZmFjZSBUd2Vha1N0b3JlRmV0Y2hSZXN1bHQge1xuICByZWdpc3RyeTogVHdlYWtTdG9yZVJlZ2lzdHJ5O1xuICBmZXRjaGVkQXQ6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFN0b3JlSW5zdGFsbE1ldGFkYXRhIHtcbiAgcmVwbzogc3RyaW5nO1xuICBhcHByb3ZlZENvbW1pdFNoYTogc3RyaW5nO1xuICBpbnN0YWxsZWRBdDogc3RyaW5nO1xuICBzdG9yZUluZGV4VXJsOiBzdHJpbmc7XG4gIGZpbGVzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbn1cblxuaW50ZXJmYWNlIFN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGliaWxpdHkge1xuICBjdXJyZW50OiBOb2RlSlMuUGxhdGZvcm07XG4gIHN1cHBvcnRlZDogVHdlYWtTdG9yZVBsYXRmb3JtW10gfCBudWxsO1xuICBjb21wYXRpYmxlOiBib29sZWFuO1xuICByZWFzb246IHN0cmluZyB8IG51bGw7XG59XG5cbmludGVyZmFjZSBTdG9yZUVudHJ5UnVudGltZUNvbXBhdGliaWxpdHkge1xuICBjdXJyZW50OiBzdHJpbmc7XG4gIHJlcXVpcmVkOiBzdHJpbmcgfCBudWxsO1xuICBjb21wYXRpYmxlOiBib29sZWFuO1xuICByZWFzb246IHN0cmluZyB8IG51bGw7XG59XG5cbmNsYXNzIFN0b3JlVHdlYWtNb2RpZmllZEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih0d2Vha05hbWU6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgYCR7dHdlYWtOYW1lfSBoYXMgbG9jYWwgc291cmNlIGNoYW5nZXMsIHNvIENvZGV4KysgY2FuJ3QgYXV0by11cGRhdGUgaXQuIFJldmVydCB5b3VyIGxvY2FsIGNoYW5nZXMgb3IgcmVpbnN0YWxsIHRoZSB0d2VhayBtYW51YWxseS5gLFxuICAgICk7XG4gICAgdGhpcy5uYW1lID0gXCJTdG9yZVR3ZWFrTW9kaWZpZWRFcnJvclwiO1xuICB9XG59XG5cbmZ1bmN0aW9uIHN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGliaWxpdHkoZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSk6IFN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGliaWxpdHkge1xuICBjb25zdCBzdXBwb3J0ZWQgPSBlbnRyeS5wbGF0Zm9ybXMgPz8gbnVsbDtcbiAgY29uc3QgY29tcGF0aWJsZSA9ICFzdXBwb3J0ZWQgfHwgc3VwcG9ydGVkLmluY2x1ZGVzKHByb2Nlc3MucGxhdGZvcm0gYXMgVHdlYWtTdG9yZVBsYXRmb3JtKTtcbiAgcmV0dXJuIHtcbiAgICBjdXJyZW50OiBwcm9jZXNzLnBsYXRmb3JtLFxuICAgIHN1cHBvcnRlZCxcbiAgICBjb21wYXRpYmxlLFxuICAgIHJlYXNvbjogY29tcGF0aWJsZSA/IG51bGwgOiBgJHtlbnRyeS5tYW5pZmVzdC5uYW1lfSBpcyBvbmx5IGF2YWlsYWJsZSBvbiAke2Zvcm1hdFN0b3JlUGxhdGZvcm1zKHN1cHBvcnRlZCl9LmAsXG4gIH07XG59XG5cbmZ1bmN0aW9uIGFzc2VydFN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGlibGUoZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSk6IHZvaWQge1xuICBjb25zdCBwbGF0Zm9ybSA9IHN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGliaWxpdHkoZW50cnkpO1xuICBpZiAoIXBsYXRmb3JtLmNvbXBhdGlibGUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IocGxhdGZvcm0ucmVhc29uID8/IGAke2VudHJ5Lm1hbmlmZXN0Lm5hbWV9IGlzIG5vdCBhdmFpbGFibGUgb24gdGhpcyBwbGF0Zm9ybS5gKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzdG9yZUVudHJ5UnVudGltZUNvbXBhdGliaWxpdHkoZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSk6IFN0b3JlRW50cnlSdW50aW1lQ29tcGF0aWJpbGl0eSB7XG4gIGNvbnN0IHJlcXVpcmVkID0gY2xlYW5NaW5SdW50aW1lKGVudHJ5Lm1hbmlmZXN0Lm1pblJ1bnRpbWUpO1xuICBjb25zdCBjb21wYXRpYmxlID0gIXJlcXVpcmVkIHx8IGNvbXBhcmVWZXJzaW9ucyhDT0RFWF9QTFVTUExVU19WRVJTSU9OLCByZXF1aXJlZCkgPj0gMDtcbiAgcmV0dXJuIHtcbiAgICBjdXJyZW50OiBDT0RFWF9QTFVTUExVU19WRVJTSU9OLFxuICAgIHJlcXVpcmVkLFxuICAgIGNvbXBhdGlibGUsXG4gICAgcmVhc29uOiBjb21wYXRpYmxlIHx8ICFyZXF1aXJlZFxuICAgICAgPyBudWxsXG4gICAgICA6IGAke2VudHJ5Lm1hbmlmZXN0Lm5hbWV9IHJlcXVpcmVzIENvZGV4KysgJHtyZXF1aXJlZH0gb3IgbmV3ZXIuYCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXNzZXJ0U3RvcmVFbnRyeVJ1bnRpbWVDb21wYXRpYmxlKGVudHJ5OiBUd2Vha1N0b3JlRW50cnkpOiB2b2lkIHtcbiAgY29uc3QgcnVudGltZSA9IHN0b3JlRW50cnlSdW50aW1lQ29tcGF0aWJpbGl0eShlbnRyeSk7XG4gIGlmICghcnVudGltZS5jb21wYXRpYmxlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKHJ1bnRpbWUucmVhc29uID8/IGAke2VudHJ5Lm1hbmlmZXN0Lm5hbWV9IHJlcXVpcmVzIGEgbmV3ZXIgQ29kZXgrKyBydW50aW1lLmApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNsZWFuTWluUnVudGltZSh2YWx1ZTogdW5rbm93bik6IHN0cmluZyB8IG51bGwge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgdmVyc2lvbiA9IG5vcm1hbGl6ZVZlcnNpb24odmFsdWUucmVwbGFjZSgvXj49P1xccyovLCBcIlwiKSk7XG4gIHJldHVybiBWRVJTSU9OX1JFLnRlc3QodmVyc2lvbikgPyB2ZXJzaW9uIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gZm9ybWF0U3RvcmVQbGF0Zm9ybXMocGxhdGZvcm1zOiBUd2Vha1N0b3JlUGxhdGZvcm1bXSB8IG51bGwpOiBzdHJpbmcge1xuICBpZiAoIXBsYXRmb3JtcyB8fCBwbGF0Zm9ybXMubGVuZ3RoID09PSAwKSByZXR1cm4gXCJzdXBwb3J0ZWQgcGxhdGZvcm1zXCI7XG4gIHJldHVybiBwbGF0Zm9ybXMubWFwKChwbGF0Zm9ybSkgPT4ge1xuICAgIGlmIChwbGF0Zm9ybSA9PT0gXCJkYXJ3aW5cIikgcmV0dXJuIFwibWFjT1NcIjtcbiAgICBpZiAocGxhdGZvcm0gPT09IFwid2luMzJcIikgcmV0dXJuIFwiV2luZG93c1wiO1xuICAgIHJldHVybiBcIkxpbnV4XCI7XG4gIH0pLmpvaW4oXCIsIFwiKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hUd2Vha1N0b3JlUmVnaXN0cnkoKTogUHJvbWlzZTxUd2Vha1N0b3JlRmV0Y2hSZXN1bHQ+IHtcbiAgY29uc3QgZmV0Y2hlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICB0cnkge1xuICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgY29uc3QgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4gY29udHJvbGxlci5hYm9ydCgpLCA4MDAwKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goVFdFQUtfU1RPUkVfSU5ERVhfVVJMLCB7XG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICBcIkFjY2VwdFwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgICBcIlVzZXItQWdlbnRcIjogYGNvZGV4LXBsdXNwbHVzLyR7Q09ERVhfUExVU1BMVVNfVkVSU0lPTn1gLFxuICAgICAgICB9LFxuICAgICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLFxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlcy5vaykgdGhyb3cgbmV3IEVycm9yKGBzdG9yZSByZXR1cm5lZCAke3Jlcy5zdGF0dXN9YCk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZWdpc3RyeTogbm9ybWFsaXplU3RvcmVSZWdpc3RyeShhd2FpdCByZXMuanNvbigpKSxcbiAgICAgICAgZmV0Y2hlZEF0LFxuICAgICAgfTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnN0IGVycm9yID0gZSBpbnN0YW5jZW9mIEVycm9yID8gZSA6IG5ldyBFcnJvcihTdHJpbmcoZSkpO1xuICAgIGxvZyhcIndhcm5cIiwgXCJmYWlsZWQgdG8gZmV0Y2ggdHdlYWsgc3RvcmUgcmVnaXN0cnk6XCIsIGVycm9yLm1lc3NhZ2UpO1xuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluc3RhbGxTdG9yZVR3ZWFrKGVudHJ5OiBUd2Vha1N0b3JlRW50cnkpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgdXJsID0gc3RvcmVBcmNoaXZlVXJsKGVudHJ5KTtcbiAgY29uc3Qgd29yayA9IG1rZHRlbXBTeW5jKGpvaW4odG1wZGlyKCksIFwiY29kZXhwcC1zdG9yZS10d2Vhay1cIikpO1xuICBjb25zdCBhcmNoaXZlID0gam9pbih3b3JrLCBcInNvdXJjZS50YXIuZ3pcIik7XG4gIGNvbnN0IGV4dHJhY3REaXIgPSBqb2luKHdvcmssIFwiZXh0cmFjdFwiKTtcbiAgY29uc3QgdGFyZ2V0ID0gam9pbihUV0VBS1NfRElSLCBlbnRyeS5pZCk7XG4gIGNvbnN0IHN0YWdlZFRhcmdldCA9IGpvaW4od29yaywgXCJzdGFnZWRcIiwgZW50cnkuaWQpO1xuXG4gIHRyeSB7XG4gICAgbG9nKFwiaW5mb1wiLCBgaW5zdGFsbGluZyBzdG9yZSB0d2VhayAke2VudHJ5LmlkfSBmcm9tICR7ZW50cnkucmVwb31AJHtlbnRyeS5hcHByb3ZlZENvbW1pdFNoYX1gKTtcbiAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgIGhlYWRlcnM6IHsgXCJVc2VyLUFnZW50XCI6IGBjb2RleC1wbHVzcGx1cy8ke0NPREVYX1BMVVNQTFVTX1ZFUlNJT059YCB9LFxuICAgICAgcmVkaXJlY3Q6IFwiZm9sbG93XCIsXG4gICAgfSk7XG4gICAgaWYgKCFyZXMub2spIHRocm93IG5ldyBFcnJvcihgZG93bmxvYWQgZmFpbGVkOiAke3Jlcy5zdGF0dXN9YCk7XG4gICAgY29uc3QgYnl0ZXMgPSBCdWZmZXIuZnJvbShhd2FpdCByZXMuYXJyYXlCdWZmZXIoKSk7XG4gICAgd3JpdGVGaWxlU3luYyhhcmNoaXZlLCBieXRlcyk7XG4gICAgbWtkaXJTeW5jKGV4dHJhY3REaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIGV4dHJhY3RUYXJBcmNoaXZlKGFyY2hpdmUsIGV4dHJhY3REaXIpO1xuICAgIGNvbnN0IHNvdXJjZSA9IGZpbmRUd2Vha1Jvb3QoZXh0cmFjdERpcik7XG4gICAgaWYgKCFzb3VyY2UpIHRocm93IG5ldyBFcnJvcihcImRvd25sb2FkZWQgYXJjaGl2ZSBkaWQgbm90IGNvbnRhaW4gbWFuaWZlc3QuanNvblwiKTtcbiAgICB2YWxpZGF0ZVN0b3JlVHdlYWtTb3VyY2UoZW50cnksIHNvdXJjZSk7XG4gICAgcm1TeW5jKHN0YWdlZFRhcmdldCwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xuICAgIGNvcHlUd2Vha1NvdXJjZShzb3VyY2UsIHN0YWdlZFRhcmdldCk7XG4gICAgY29uc3Qgc3RhZ2VkRmlsZXMgPSBoYXNoVHdlYWtTb3VyY2Uoc3RhZ2VkVGFyZ2V0KTtcbiAgICB3cml0ZUZpbGVTeW5jKFxuICAgICAgam9pbihzdGFnZWRUYXJnZXQsIFwiLmNvZGV4cHAtc3RvcmUuanNvblwiKSxcbiAgICAgIEpTT04uc3RyaW5naWZ5KFxuICAgICAgICB7XG4gICAgICAgICAgcmVwbzogZW50cnkucmVwbyxcbiAgICAgICAgICBhcHByb3ZlZENvbW1pdFNoYTogZW50cnkuYXBwcm92ZWRDb21taXRTaGEsXG4gICAgICAgICAgaW5zdGFsbGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICBzdG9yZUluZGV4VXJsOiBUV0VBS19TVE9SRV9JTkRFWF9VUkwsXG4gICAgICAgICAgZmlsZXM6IHN0YWdlZEZpbGVzLFxuICAgICAgICB9LFxuICAgICAgICBudWxsLFxuICAgICAgICAyLFxuICAgICAgKSxcbiAgICApO1xuICAgIGF3YWl0IGFzc2VydFN0b3JlVHdlYWtDbGVhbkZvckF1dG9VcGRhdGUoZW50cnksIHRhcmdldCwgd29yayk7XG4gICAgcm1TeW5jKHRhcmdldCwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xuICAgIGNwU3luYyhzdGFnZWRUYXJnZXQsIHRhcmdldCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gIH0gZmluYWxseSB7XG4gICAgcm1TeW5jKHdvcmssIHsgcmVjdXJzaXZlOiB0cnVlLCBmb3JjZTogdHJ1ZSB9KTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBwcmVwYXJlVHdlYWtTdG9yZVN1Ym1pc3Npb24ocmVwb0lucHV0OiBzdHJpbmcpOiBQcm9taXNlPFR3ZWFrU3RvcmVQdWJsaXNoU3VibWlzc2lvbj4ge1xuICBjb25zdCByZXBvID0gbm9ybWFsaXplR2l0SHViUmVwbyhyZXBvSW5wdXQpO1xuICBjb25zdCByZXBvSW5mbyA9IGF3YWl0IGZldGNoR2l0aHViSnNvbjx7IGRlZmF1bHRfYnJhbmNoPzogc3RyaW5nIH0+KGBodHRwczovL2FwaS5naXRodWIuY29tL3JlcG9zLyR7cmVwb31gKTtcbiAgY29uc3QgZGVmYXVsdEJyYW5jaCA9IHJlcG9JbmZvLmRlZmF1bHRfYnJhbmNoO1xuICBpZiAoIWRlZmF1bHRCcmFuY2gpIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlc29sdmUgZGVmYXVsdCBicmFuY2ggZm9yICR7cmVwb31gKTtcblxuICBjb25zdCBjb21taXQgPSBhd2FpdCBmZXRjaEdpdGh1Ykpzb248e1xuICAgIHNoYT86IHN0cmluZztcbiAgICBodG1sX3VybD86IHN0cmluZztcbiAgfT4oYGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvJHtyZXBvfS9jb21taXRzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGRlZmF1bHRCcmFuY2gpfWApO1xuICBpZiAoIWNvbW1pdC5zaGEpIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlc29sdmUgY3VycmVudCBjb21taXQgZm9yICR7cmVwb31gKTtcblxuICBjb25zdCBtYW5pZmVzdCA9IGF3YWl0IGZldGNoTWFuaWZlc3RBdENvbW1pdChyZXBvLCBjb21taXQuc2hhKS5jYXRjaCgoZSkgPT4ge1xuICAgIGxvZyhcIndhcm5cIiwgYGNvdWxkIG5vdCByZWFkIG1hbmlmZXN0IGZvciBzdG9yZSBzdWJtaXNzaW9uICR7cmVwb31AJHtjb21taXQuc2hhfTpgLCBlKTtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9KTtcblxuICByZXR1cm4ge1xuICAgIHJlcG8sXG4gICAgZGVmYXVsdEJyYW5jaCxcbiAgICBjb21taXRTaGE6IGNvbW1pdC5zaGEsXG4gICAgY29tbWl0VXJsOiBjb21taXQuaHRtbF91cmwgPz8gYGh0dHBzOi8vZ2l0aHViLmNvbS8ke3JlcG99L2NvbW1pdC8ke2NvbW1pdC5zaGF9YCxcbiAgICBtYW5pZmVzdDogbWFuaWZlc3RcbiAgICAgID8ge1xuICAgICAgICAgIGlkOiB0eXBlb2YgbWFuaWZlc3QuaWQgPT09IFwic3RyaW5nXCIgPyBtYW5pZmVzdC5pZCA6IHVuZGVmaW5lZCxcbiAgICAgICAgICBuYW1lOiB0eXBlb2YgbWFuaWZlc3QubmFtZSA9PT0gXCJzdHJpbmdcIiA/IG1hbmlmZXN0Lm5hbWUgOiB1bmRlZmluZWQsXG4gICAgICAgICAgdmVyc2lvbjogdHlwZW9mIG1hbmlmZXN0LnZlcnNpb24gPT09IFwic3RyaW5nXCIgPyBtYW5pZmVzdC52ZXJzaW9uIDogdW5kZWZpbmVkLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiB0eXBlb2YgbWFuaWZlc3QuZGVzY3JpcHRpb24gPT09IFwic3RyaW5nXCIgPyBtYW5pZmVzdC5kZXNjcmlwdGlvbiA6IHVuZGVmaW5lZCxcbiAgICAgICAgICBpY29uVXJsOiB0eXBlb2YgbWFuaWZlc3QuaWNvblVybCA9PT0gXCJzdHJpbmdcIiA/IG1hbmlmZXN0Lmljb25VcmwgOiB1bmRlZmluZWQsXG4gICAgICAgIH1cbiAgICAgIDogdW5kZWZpbmVkLFxuICB9O1xufVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaEdpdGh1Ykpzb248VD4odXJsOiBzdHJpbmcpOiBQcm9taXNlPFQ+IHtcbiAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgY29uc3QgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4gY29udHJvbGxlci5hYm9ydCgpLCA4MDAwKTtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJBY2NlcHRcIjogXCJhcHBsaWNhdGlvbi92bmQuZ2l0aHViK2pzb25cIixcbiAgICAgICAgXCJVc2VyLUFnZW50XCI6IGBjb2RleC1wbHVzcGx1cy8ke0NPREVYX1BMVVNQTFVTX1ZFUlNJT059YCxcbiAgICAgIH0sXG4gICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLFxuICAgIH0pO1xuICAgIGlmICghcmVzLm9rKSB0aHJvdyBuZXcgRXJyb3IoYEdpdEh1YiByZXR1cm5lZCAke3Jlcy5zdGF0dXN9YCk7XG4gICAgcmV0dXJuIGF3YWl0IHJlcy5qc29uKCkgYXMgVDtcbiAgfSBmaW5hbGx5IHtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hNYW5pZmVzdEF0Q29tbWl0KHJlcG86IHN0cmluZywgY29tbWl0U2hhOiBzdHJpbmcpOiBQcm9taXNlPFBhcnRpYWw8VHdlYWtNYW5pZmVzdD4+IHtcbiAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goYGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS8ke3JlcG99LyR7Y29tbWl0U2hhfS9tYW5pZmVzdC5qc29uYCwge1xuICAgIGhlYWRlcnM6IHtcbiAgICAgIFwiQWNjZXB0XCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgXCJVc2VyLUFnZW50XCI6IGBjb2RleC1wbHVzcGx1cy8ke0NPREVYX1BMVVNQTFVTX1ZFUlNJT059YCxcbiAgICB9LFxuICB9KTtcbiAgaWYgKCFyZXMub2spIHRocm93IG5ldyBFcnJvcihgbWFuaWZlc3QgZmV0Y2ggcmV0dXJuZWQgJHtyZXMuc3RhdHVzfWApO1xuICByZXR1cm4gYXdhaXQgcmVzLmpzb24oKSBhcyBQYXJ0aWFsPFR3ZWFrTWFuaWZlc3Q+O1xufVxuXG5mdW5jdGlvbiBleHRyYWN0VGFyQXJjaGl2ZShhcmNoaXZlOiBzdHJpbmcsIHRhcmdldERpcjogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IHJlc3VsdCA9IHNwYXduU3luYyhcInRhclwiLCBbXCIteHpmXCIsIGFyY2hpdmUsIFwiLUNcIiwgdGFyZ2V0RGlyXSwge1xuICAgIGVuY29kaW5nOiBcInV0ZjhcIixcbiAgICBzdGRpbzogW1wiaWdub3JlXCIsIFwicGlwZVwiLCBcInBpcGVcIl0sXG4gIH0pO1xuICBpZiAocmVzdWx0LnN0YXR1cyAhPT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgdGFyIGV4dHJhY3Rpb24gZmFpbGVkOiAke3Jlc3VsdC5zdGRlcnIgfHwgcmVzdWx0LnN0ZG91dCB8fCByZXN1bHQuc3RhdHVzfWApO1xuICB9XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlU3RvcmVUd2Vha1NvdXJjZShlbnRyeTogVHdlYWtTdG9yZUVudHJ5LCBzb3VyY2U6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBtYW5pZmVzdFBhdGggPSBqb2luKHNvdXJjZSwgXCJtYW5pZmVzdC5qc29uXCIpO1xuICBjb25zdCBtYW5pZmVzdCA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKG1hbmlmZXN0UGF0aCwgXCJ1dGY4XCIpKSBhcyBUd2Vha01hbmlmZXN0O1xuICBpZiAobWFuaWZlc3QuaWQgIT09IGVudHJ5Lm1hbmlmZXN0LmlkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBkb3dubG9hZGVkIHR3ZWFrIGlkICR7bWFuaWZlc3QuaWR9IGRvZXMgbm90IG1hdGNoIGFwcHJvdmVkIGlkICR7ZW50cnkubWFuaWZlc3QuaWR9YCk7XG4gIH1cbiAgaWYgKG1hbmlmZXN0LmdpdGh1YlJlcG8gIT09IGVudHJ5LnJlcG8pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGRvd25sb2FkZWQgdHdlYWsgcmVwbyAke21hbmlmZXN0LmdpdGh1YlJlcG99IGRvZXMgbm90IG1hdGNoIGFwcHJvdmVkIHJlcG8gJHtlbnRyeS5yZXBvfWApO1xuICB9XG4gIGlmIChtYW5pZmVzdC52ZXJzaW9uICE9PSBlbnRyeS5tYW5pZmVzdC52ZXJzaW9uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBkb3dubG9hZGVkIHR3ZWFrIHZlcnNpb24gJHttYW5pZmVzdC52ZXJzaW9ufSBkb2VzIG5vdCBtYXRjaCBhcHByb3ZlZCB2ZXJzaW9uICR7ZW50cnkubWFuaWZlc3QudmVyc2lvbn1gKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kVHdlYWtSb290KGRpcjogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGlmICghZXhpc3RzU3luYyhkaXIpKSByZXR1cm4gbnVsbDtcbiAgaWYgKGV4aXN0c1N5bmMoam9pbihkaXIsIFwibWFuaWZlc3QuanNvblwiKSkpIHJldHVybiBkaXI7XG4gIGZvciAoY29uc3QgbmFtZSBvZiByZWFkZGlyU3luYyhkaXIpKSB7XG4gICAgY29uc3QgY2hpbGQgPSBqb2luKGRpciwgbmFtZSk7XG4gICAgdHJ5IHtcbiAgICAgIGlmICghc3RhdFN5bmMoY2hpbGQpLmlzRGlyZWN0b3J5KCkpIGNvbnRpbnVlO1xuICAgIH0gY2F0Y2gge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IGZvdW5kID0gZmluZFR3ZWFrUm9vdChjaGlsZCk7XG4gICAgaWYgKGZvdW5kKSByZXR1cm4gZm91bmQ7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGNvcHlUd2Vha1NvdXJjZShzb3VyY2U6IHN0cmluZywgdGFyZ2V0OiBzdHJpbmcpOiB2b2lkIHtcbiAgY3BTeW5jKHNvdXJjZSwgdGFyZ2V0LCB7XG4gICAgcmVjdXJzaXZlOiB0cnVlLFxuICAgIGZpbHRlcjogKHNyYykgPT4gIS8oXnxbL1xcXFxdKSg/OlxcLmdpdHxub2RlX21vZHVsZXMpKD86Wy9cXFxcXXwkKS8udGVzdChzcmMpLFxuICB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gYXNzZXJ0U3RvcmVUd2Vha0NsZWFuRm9yQXV0b1VwZGF0ZShcbiAgZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSxcbiAgdGFyZ2V0OiBzdHJpbmcsXG4gIHdvcms6IHN0cmluZyxcbik6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoIWV4aXN0c1N5bmModGFyZ2V0KSkgcmV0dXJuO1xuICBjb25zdCBtZXRhZGF0YSA9IHJlYWRTdG9yZUluc3RhbGxNZXRhZGF0YSh0YXJnZXQpO1xuICBpZiAoIW1ldGFkYXRhKSByZXR1cm47XG4gIGlmIChtZXRhZGF0YS5yZXBvICE9PSBlbnRyeS5yZXBvKSB7XG4gICAgdGhyb3cgbmV3IFN0b3JlVHdlYWtNb2RpZmllZEVycm9yKGVudHJ5Lm1hbmlmZXN0Lm5hbWUpO1xuICB9XG4gIGNvbnN0IGN1cnJlbnRGaWxlcyA9IGhhc2hUd2Vha1NvdXJjZSh0YXJnZXQpO1xuICBjb25zdCBiYXNlbGluZUZpbGVzID0gbWV0YWRhdGEuZmlsZXMgPz8gYXdhaXQgZmV0Y2hCYXNlbGluZVN0b3JlVHdlYWtIYXNoZXMobWV0YWRhdGEsIHdvcmspO1xuICBpZiAoIXNhbWVGaWxlSGFzaGVzKGN1cnJlbnRGaWxlcywgYmFzZWxpbmVGaWxlcykpIHtcbiAgICB0aHJvdyBuZXcgU3RvcmVUd2Vha01vZGlmaWVkRXJyb3IoZW50cnkubWFuaWZlc3QubmFtZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVhZFN0b3JlSW5zdGFsbE1ldGFkYXRhKHRhcmdldDogc3RyaW5nKTogU3RvcmVJbnN0YWxsTWV0YWRhdGEgfCBudWxsIHtcbiAgY29uc3QgbWV0YWRhdGFQYXRoID0gam9pbih0YXJnZXQsIFwiLmNvZGV4cHAtc3RvcmUuanNvblwiKTtcbiAgaWYgKCFleGlzdHNTeW5jKG1ldGFkYXRhUGF0aCkpIHJldHVybiBudWxsO1xuICB0cnkge1xuICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKG1ldGFkYXRhUGF0aCwgXCJ1dGY4XCIpKSBhcyBQYXJ0aWFsPFN0b3JlSW5zdGFsbE1ldGFkYXRhPjtcbiAgICBpZiAodHlwZW9mIHBhcnNlZC5yZXBvICE9PSBcInN0cmluZ1wiIHx8IHR5cGVvZiBwYXJzZWQuYXBwcm92ZWRDb21taXRTaGEgIT09IFwic3RyaW5nXCIpIHJldHVybiBudWxsO1xuICAgIHJldHVybiB7XG4gICAgICByZXBvOiBwYXJzZWQucmVwbyxcbiAgICAgIGFwcHJvdmVkQ29tbWl0U2hhOiBwYXJzZWQuYXBwcm92ZWRDb21taXRTaGEsXG4gICAgICBpbnN0YWxsZWRBdDogdHlwZW9mIHBhcnNlZC5pbnN0YWxsZWRBdCA9PT0gXCJzdHJpbmdcIiA/IHBhcnNlZC5pbnN0YWxsZWRBdCA6IFwiXCIsXG4gICAgICBzdG9yZUluZGV4VXJsOiB0eXBlb2YgcGFyc2VkLnN0b3JlSW5kZXhVcmwgPT09IFwic3RyaW5nXCIgPyBwYXJzZWQuc3RvcmVJbmRleFVybCA6IFwiXCIsXG4gICAgICBmaWxlczogaXNIYXNoUmVjb3JkKHBhcnNlZC5maWxlcykgPyBwYXJzZWQuZmlsZXMgOiB1bmRlZmluZWQsXG4gICAgfTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hCYXNlbGluZVN0b3JlVHdlYWtIYXNoZXMoXG4gIG1ldGFkYXRhOiBTdG9yZUluc3RhbGxNZXRhZGF0YSxcbiAgd29yazogc3RyaW5nLFxuKTogUHJvbWlzZTxSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+PiB7XG4gIGNvbnN0IGJhc2VsaW5lRGlyID0gam9pbih3b3JrLCBcImJhc2VsaW5lXCIpO1xuICBjb25zdCBhcmNoaXZlID0gam9pbih3b3JrLCBcImJhc2VsaW5lLnRhci5nelwiKTtcbiAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goYGh0dHBzOi8vY29kZWxvYWQuZ2l0aHViLmNvbS8ke21ldGFkYXRhLnJlcG99L3Rhci5nei8ke21ldGFkYXRhLmFwcHJvdmVkQ29tbWl0U2hhfWAsIHtcbiAgICBoZWFkZXJzOiB7IFwiVXNlci1BZ2VudFwiOiBgY29kZXgtcGx1c3BsdXMvJHtDT0RFWF9QTFVTUExVU19WRVJTSU9OfWAgfSxcbiAgICByZWRpcmVjdDogXCJmb2xsb3dcIixcbiAgfSk7XG4gIGlmICghcmVzLm9rKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCB2ZXJpZnkgbG9jYWwgdHdlYWsgY2hhbmdlcyBiZWZvcmUgdXBkYXRlOiAke3Jlcy5zdGF0dXN9YCk7XG4gIHdyaXRlRmlsZVN5bmMoYXJjaGl2ZSwgQnVmZmVyLmZyb20oYXdhaXQgcmVzLmFycmF5QnVmZmVyKCkpKTtcbiAgbWtkaXJTeW5jKGJhc2VsaW5lRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgZXh0cmFjdFRhckFyY2hpdmUoYXJjaGl2ZSwgYmFzZWxpbmVEaXIpO1xuICBjb25zdCBzb3VyY2UgPSBmaW5kVHdlYWtSb290KGJhc2VsaW5lRGlyKTtcbiAgaWYgKCFzb3VyY2UpIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCB2ZXJpZnkgbG9jYWwgdHdlYWsgY2hhbmdlcyBiZWZvcmUgdXBkYXRlOiBiYXNlbGluZSBtYW5pZmVzdCBtaXNzaW5nXCIpO1xuICByZXR1cm4gaGFzaFR3ZWFrU291cmNlKHNvdXJjZSk7XG59XG5cbmZ1bmN0aW9uIGhhc2hUd2Vha1NvdXJjZShyb290OiBzdHJpbmcpOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHtcbiAgY29uc3Qgb3V0OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gIGNvbGxlY3RUd2Vha0ZpbGVIYXNoZXMocm9vdCwgcm9vdCwgb3V0KTtcbiAgcmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gY29sbGVjdFR3ZWFrRmlsZUhhc2hlcyhyb290OiBzdHJpbmcsIGRpcjogc3RyaW5nLCBvdXQ6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBuYW1lIG9mIHJlYWRkaXJTeW5jKGRpcikuc29ydCgpKSB7XG4gICAgaWYgKG5hbWUgPT09IFwiLmdpdFwiIHx8IG5hbWUgPT09IFwibm9kZV9tb2R1bGVzXCIgfHwgbmFtZSA9PT0gXCIuY29kZXhwcC1zdG9yZS5qc29uXCIpIGNvbnRpbnVlO1xuICAgIGNvbnN0IGZ1bGwgPSBqb2luKGRpciwgbmFtZSk7XG4gICAgY29uc3QgcmVsID0gcmVsYXRpdmUocm9vdCwgZnVsbCkuc3BsaXQoXCJcXFxcXCIpLmpvaW4oXCIvXCIpO1xuICAgIGNvbnN0IHN0YXQgPSBzdGF0U3luYyhmdWxsKTtcbiAgICBpZiAoc3RhdC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICBjb2xsZWN0VHdlYWtGaWxlSGFzaGVzKHJvb3QsIGZ1bGwsIG91dCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKCFzdGF0LmlzRmlsZSgpKSBjb250aW51ZTtcbiAgICBvdXRbcmVsXSA9IGNyZWF0ZUhhc2goXCJzaGEyNTZcIikudXBkYXRlKHJlYWRGaWxlU3luYyhmdWxsKSkuZGlnZXN0KFwiaGV4XCIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNhbWVGaWxlSGFzaGVzKGE6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4sIGI6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pOiBib29sZWFuIHtcbiAgY29uc3QgYWsgPSBPYmplY3Qua2V5cyhhKS5zb3J0KCk7XG4gIGNvbnN0IGJrID0gT2JqZWN0LmtleXMoYikuc29ydCgpO1xuICBpZiAoYWsubGVuZ3RoICE9PSBiay5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBhay5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGtleSA9IGFrW2ldO1xuICAgIGlmIChrZXkgIT09IGJrW2ldIHx8IGFba2V5XSAhPT0gYltrZXldKSByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGlzSGFzaFJlY29yZCh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4ge1xuICBpZiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZSAhPT0gXCJvYmplY3RcIiB8fCBBcnJheS5pc0FycmF5KHZhbHVlKSkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gT2JqZWN0LnZhbHVlcyh2YWx1ZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikuZXZlcnkoKHYpID0+IHR5cGVvZiB2ID09PSBcInN0cmluZ1wiKTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplVmVyc2lvbih2OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdi50cmltKCkucmVwbGFjZSgvXnYvaSwgXCJcIik7XG59XG5cbmZ1bmN0aW9uIGNvbXBhcmVWZXJzaW9ucyhhOiBzdHJpbmcsIGI6IHN0cmluZyk6IG51bWJlciB7XG4gIGNvbnN0IGF2ID0gVkVSU0lPTl9SRS5leGVjKGEpO1xuICBjb25zdCBidiA9IFZFUlNJT05fUkUuZXhlYyhiKTtcbiAgaWYgKCFhdiB8fCAhYnYpIHJldHVybiAwO1xuICBmb3IgKGxldCBpID0gMTsgaSA8PSAzOyBpKyspIHtcbiAgICBjb25zdCBkaWZmID0gTnVtYmVyKGF2W2ldKSAtIE51bWJlcihidltpXSk7XG4gICAgaWYgKGRpZmYgIT09IDApIHJldHVybiBkaWZmO1xuICB9XG4gIHJldHVybiAwO1xufVxuXG5mdW5jdGlvbiBmYWxsYmFja1NvdXJjZVJvb3QoKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IGNhbmRpZGF0ZXMgPSBbXG4gICAgam9pbihob21lZGlyKCksIFwiLmNvZGV4LXBsdXNwbHVzXCIsIFwic291cmNlXCIpLFxuICAgIGpvaW4odXNlclJvb3QhLCBcInNvdXJjZVwiKSxcbiAgXTtcbiAgZm9yIChjb25zdCBjYW5kaWRhdGUgb2YgY2FuZGlkYXRlcykge1xuICAgIGlmIChleGlzdHNTeW5jKGpvaW4oY2FuZGlkYXRlLCBcInBhY2thZ2VzXCIsIFwiaW5zdGFsbGVyXCIsIFwiZGlzdFwiLCBcImNsaS5qc1wiKSkpIHJldHVybiBjYW5kaWRhdGU7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGRlc2NyaWJlSW5zdGFsbGF0aW9uU291cmNlKHNvdXJjZVJvb3Q6IHN0cmluZyB8IG51bGwpOiBJbnN0YWxsYXRpb25Tb3VyY2Uge1xuICBpZiAoIXNvdXJjZVJvb3QpIHtcbiAgICByZXR1cm4ge1xuICAgICAga2luZDogXCJ1bmtub3duXCIsXG4gICAgICBsYWJlbDogXCJVbmtub3duXCIsXG4gICAgICBkZXRhaWw6IFwiQ29kZXgrKyBzb3VyY2UgbG9jYXRpb24gaXMgbm90IHJlY29yZGVkIHlldC5cIixcbiAgICB9O1xuICB9XG4gIGNvbnN0IG5vcm1hbGl6ZWQgPSBzb3VyY2VSb290LnJlcGxhY2UoL1xcXFwvZywgXCIvXCIpO1xuICBpZiAoL1xcLyg/OkhvbWVicmV3fGhvbWVicmV3KVxcL0NlbGxhclxcL2NvZGV4cGx1c3BsdXNcXC8vLnRlc3Qobm9ybWFsaXplZCkpIHtcbiAgICByZXR1cm4geyBraW5kOiBcImhvbWVicmV3XCIsIGxhYmVsOiBcIkhvbWVicmV3XCIsIGRldGFpbDogc291cmNlUm9vdCB9O1xuICB9XG4gIGlmIChleGlzdHNTeW5jKGpvaW4oc291cmNlUm9vdCwgXCIuZ2l0XCIpKSkge1xuICAgIHJldHVybiB7IGtpbmQ6IFwibG9jYWwtZGV2XCIsIGxhYmVsOiBcIkxvY2FsIGRldmVsb3BtZW50IGNoZWNrb3V0XCIsIGRldGFpbDogc291cmNlUm9vdCB9O1xuICB9XG4gIGlmIChub3JtYWxpemVkLmVuZHNXaXRoKFwiLy5jb2RleC1wbHVzcGx1cy9zb3VyY2VcIikgfHwgbm9ybWFsaXplZC5pbmNsdWRlcyhcIi8uY29kZXgtcGx1c3BsdXMvc291cmNlL1wiKSkge1xuICAgIHJldHVybiB7IGtpbmQ6IFwiZ2l0aHViLXNvdXJjZVwiLCBsYWJlbDogXCJHaXRIdWIgc291cmNlIGluc3RhbGxlclwiLCBkZXRhaWw6IHNvdXJjZVJvb3QgfTtcbiAgfVxuICBpZiAoZXhpc3RzU3luYyhqb2luKHNvdXJjZVJvb3QsIFwicGFja2FnZS5qc29uXCIpKSkge1xuICAgIHJldHVybiB7IGtpbmQ6IFwic291cmNlLWFyY2hpdmVcIiwgbGFiZWw6IFwiU291cmNlIGFyY2hpdmVcIiwgZGV0YWlsOiBzb3VyY2VSb290IH07XG4gIH1cbiAgcmV0dXJuIHsga2luZDogXCJ1bmtub3duXCIsIGxhYmVsOiBcIlVua25vd25cIiwgZGV0YWlsOiBzb3VyY2VSb290IH07XG59XG5cbmZ1bmN0aW9uIHN0YXJ0SW5zdGFsbGVkQ2xpKGNsaTogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXSk6IHZvaWQge1xuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJkYXJ3aW5cIiAmJiBzdGFydEluc3RhbGxlZENsaVdpdGhMYXVuY2hkKGNsaSwgYXJncykpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgY2hpbGQgPSBzcGF3bihwcm9jZXNzLmV4ZWNQYXRoLCBbY2xpLCAuLi5hcmdzXSwge1xuICAgIGN3ZDogcmVzb2x2ZShkaXJuYW1lKGNsaSksIFwiLi5cIiwgXCIuLlwiLCBcIi4uXCIpLFxuICAgIGVudjogeyAuLi5wcm9jZXNzLmVudiwgQ09ERVhfUExVU1BMVVNfTUFOVUFMX1VQREFURTogXCIxXCIgfSxcbiAgICBkZXRhY2hlZDogdHJ1ZSxcbiAgICBzdGRpbzogXCJpZ25vcmVcIixcbiAgfSk7XG4gIGNoaWxkLnVucmVmKCk7XG59XG5cbmZ1bmN0aW9uIHN0YXJ0SW5zdGFsbGVkQ2xpV2l0aExhdW5jaGQoY2xpOiBzdHJpbmcsIGFyZ3M6IHN0cmluZ1tdKTogYm9vbGVhbiB7XG4gIGNvbnN0IGxhYmVsID0gYGNvbS5jb2RleHBsdXNwbHVzLnBhdGNoLWhlbHBlci4ke3Byb2Nlc3MucGlkfS4ke0RhdGUubm93KCl9YDtcbiAgY29uc3QgY2xlYW51cCA9IGBsYXVuY2hjdGwgcmVtb3ZlICR7bGFiZWx9ID4vZGV2L251bGwgMj4mMSB8fCBsYXVuY2hjdGwgYm9vdG91dCBndWkvJChpZCAtdSkvJHtsYWJlbH0gPi9kZXYvbnVsbCAyPiYxIHx8IHRydWVgO1xuICBjb25zdCBjb21tYW5kID0gW1xuICAgIGB0cmFwICR7c2hlbGxRdW90ZShjbGVhbnVwKX0gRVhJVGAsXG4gICAgYGNkICR7c2hlbGxRdW90ZShyZXNvbHZlKGRpcm5hbWUoY2xpKSwgXCIuLlwiLCBcIi4uXCIsIFwiLi5cIikpfWAsXG4gICAgYENPREVYX1BMVVNQTFVTX01BTlVBTF9VUERBVEU9MSAke1twcm9jZXNzLmV4ZWNQYXRoLCBjbGksIC4uLmFyZ3NdLm1hcChzaGVsbFF1b3RlKS5qb2luKFwiIFwiKX1gLFxuICBdLmpvaW4oXCIgJiYgXCIpO1xuICBjb25zdCByZXN1bHQgPSBzcGF3blN5bmMoXG4gICAgXCJsYXVuY2hjdGxcIixcbiAgICBbXG4gICAgICBcInN1Ym1pdFwiLFxuICAgICAgXCItbFwiLFxuICAgICAgbGFiZWwsXG4gICAgICBcIi0tXCIsXG4gICAgICBcIi9iaW4vc2hcIixcbiAgICAgIFwiLWNcIixcbiAgICAgIGAke2NvbW1hbmR9IHx8IHRydWVgLFxuICAgIF0sXG4gICAge1xuICAgICAgZW5jb2Rpbmc6IFwidXRmOFwiLFxuICAgICAgc3RkaW86IFwiaWdub3JlXCIsXG4gICAgfSxcbiAgKTtcbiAgaWYgKHJlc3VsdC5zdGF0dXMgPT09IDApIHJldHVybiB0cnVlO1xuICBsb2coXCJ3YXJuXCIsIGBsYXVuY2hjdGwgc3VibWl0IGZhaWxlZCBmb3IgQ29kZXgrKyBwYXRjaCBoZWxwZXI6ICR7cmVzdWx0LmVycm9yPy5tZXNzYWdlID8/IHJlc3VsdC5zdGF0dXN9YCk7XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gc2hlbGxRdW90ZSh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAnJHt2YWx1ZS5yZXBsYWNlKC8nL2csIGAnXFxcXCcnYCl9J2A7XG59XG5cbmZ1bmN0aW9uIG1hcmtTZWxmVXBkYXRlU3RhcnRlZChzb3VyY2VSb290OiBzdHJpbmcpOiBTZWxmVXBkYXRlU3RhdGUge1xuICBjb25zdCBjb25maWcgPSByZWFkU3RhdGUoKS5jb2RleFBsdXNQbHVzO1xuICBjb25zdCBjaGFubmVsID0gY29uZmlnPy51cGRhdGVDaGFubmVsID8/IFwic3RhYmxlXCI7XG4gIGNvbnN0IHN0YXRlOiBTZWxmVXBkYXRlU3RhdGUgPSB7XG4gICAgY2hlY2tlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgc3RhdHVzOiBcImNoZWNraW5nXCIsXG4gICAgY3VycmVudFZlcnNpb246IENPREVYX1BMVVNQTFVTX1ZFUlNJT04sXG4gICAgbGF0ZXN0VmVyc2lvbjogbnVsbCxcbiAgICB0YXJnZXRSZWY6IGNvbmZpZz8udXBkYXRlQ2hhbm5lbCA9PT0gXCJjdXN0b21cIiA/IGNvbmZpZy51cGRhdGVSZWYgPz8gbnVsbCA6IG51bGwsXG4gICAgcmVsZWFzZVVybDogbnVsbCxcbiAgICByZXBvOiBjb25maWc/LnVwZGF0ZVJlcG8gPz8gQ09ERVhfUExVU1BMVVNfUkVQTyxcbiAgICBjaGFubmVsLFxuICAgIHNvdXJjZVJvb3QsXG4gICAgaW5zdGFsbGF0aW9uU291cmNlOiBkZXNjcmliZUluc3RhbGxhdGlvblNvdXJjZShzb3VyY2VSb290KSxcbiAgfTtcbiAgd3JpdGVTZWxmVXBkYXRlU3RhdGUoc3RhdGUpO1xuICByZXR1cm4gc3RhdGU7XG59XG5cbmZ1bmN0aW9uIGJyb2FkY2FzdFJlbG9hZCgpOiB2b2lkIHtcbiAgY29uc3QgcGF5bG9hZCA9IHtcbiAgICBhdDogRGF0ZS5ub3coKSxcbiAgICB0d2Vha3M6IHR3ZWFrU3RhdGUuZGlzY292ZXJlZC5tYXAoKHQpID0+IHQubWFuaWZlc3QuaWQpLFxuICB9O1xuICBmb3IgKGNvbnN0IHdjIG9mIHdlYkNvbnRlbnRzLmdldEFsbFdlYkNvbnRlbnRzKCkpIHtcbiAgICB0cnkge1xuICAgICAgd2Muc2VuZChcImNvZGV4cHA6dHdlYWtzLWNoYW5nZWRcIiwgcGF5bG9hZCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nKFwid2FyblwiLCBcImJyb2FkY2FzdCBzZW5kIGZhaWxlZDpcIiwgZSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG1ha2VMb2dnZXIoc2NvcGU6IHN0cmluZykge1xuICByZXR1cm4ge1xuICAgIGRlYnVnOiAoLi4uYTogdW5rbm93bltdKSA9PiBsb2coXCJpbmZvXCIsIGBbJHtzY29wZX1dYCwgLi4uYSksXG4gICAgaW5mbzogKC4uLmE6IHVua25vd25bXSkgPT4gbG9nKFwiaW5mb1wiLCBgWyR7c2NvcGV9XWAsIC4uLmEpLFxuICAgIHdhcm46ICguLi5hOiB1bmtub3duW10pID0+IGxvZyhcIndhcm5cIiwgYFske3Njb3BlfV1gLCAuLi5hKSxcbiAgICBlcnJvcjogKC4uLmE6IHVua25vd25bXSkgPT4gbG9nKFwiZXJyb3JcIiwgYFske3Njb3BlfV1gLCAuLi5hKSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gbWFrZU1haW5JcGMoaWQ6IHN0cmluZykge1xuICBjb25zdCBjaCA9IChjOiBzdHJpbmcpID0+IGBjb2RleHBwOiR7aWR9OiR7Y31gO1xuICByZXR1cm4ge1xuICAgIG9uOiAoYzogc3RyaW5nLCBoOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKSA9PiB7XG4gICAgICBjb25zdCB3cmFwcGVkID0gKF9lOiB1bmtub3duLCAuLi5hcmdzOiB1bmtub3duW10pID0+IGgoLi4uYXJncyk7XG4gICAgICBpcGNNYWluLm9uKGNoKGMpLCB3cmFwcGVkKTtcbiAgICAgIHJldHVybiAoKSA9PiBpcGNNYWluLnJlbW92ZUxpc3RlbmVyKGNoKGMpLCB3cmFwcGVkIGFzIG5ldmVyKTtcbiAgICB9LFxuICAgIHNlbmQ6IChfYzogc3RyaW5nKSA9PiB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpcGMuc2VuZCBpcyByZW5kZXJlclx1MjE5Mm1haW47IG1haW4gc2lkZSB1c2VzIGhhbmRsZS9vblwiKTtcbiAgICB9LFxuICAgIGludm9rZTogKF9jOiBzdHJpbmcpID0+IHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImlwYy5pbnZva2UgaXMgcmVuZGVyZXJcdTIxOTJtYWluOyBtYWluIHNpZGUgdXNlcyBoYW5kbGVcIik7XG4gICAgfSxcbiAgICBoYW5kbGU6IChjOiBzdHJpbmcsIGhhbmRsZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHVua25vd24pID0+IHtcbiAgICAgIGlwY01haW4uaGFuZGxlKGNoKGMpLCAoX2U6IHVua25vd24sIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gaGFuZGxlciguLi5hcmdzKSk7XG4gICAgfSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gbWFrZU1haW5GcyhpZDogc3RyaW5nKSB7XG4gIGNvbnN0IGRpciA9IGpvaW4odXNlclJvb3QhLCBcInR3ZWFrLWRhdGFcIiwgaWQpO1xuICBta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgY29uc3QgZnMgPSByZXF1aXJlKFwibm9kZTpmcy9wcm9taXNlc1wiKSBhcyB0eXBlb2YgaW1wb3J0KFwibm9kZTpmcy9wcm9taXNlc1wiKTtcbiAgcmV0dXJuIHtcbiAgICBkYXRhRGlyOiBkaXIsXG4gICAgcmVhZDogKHA6IHN0cmluZykgPT4gZnMucmVhZEZpbGUoam9pbihkaXIsIHApLCBcInV0ZjhcIiksXG4gICAgd3JpdGU6IChwOiBzdHJpbmcsIGM6IHN0cmluZykgPT4gZnMud3JpdGVGaWxlKGpvaW4oZGlyLCBwKSwgYywgXCJ1dGY4XCIpLFxuICAgIGV4aXN0czogYXN5bmMgKHA6IHN0cmluZykgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZnMuYWNjZXNzKGpvaW4oZGlyLCBwKSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9LFxuICB9O1xufVxuXG5mdW5jdGlvbiBjdXJyZW50UnVudGltZUluZm8oKTogQ29kZXhSdW50aW1lSW5mbyB7XG4gIGNvbnN0IGluc3RhbGxlclN0YXRlID0gcmVhZEluc3RhbGxlclN0YXRlKCk7XG4gIHJldHVybiBnZXRSdW50aW1lSW5mbyh7XG4gICAgdXNlclJvb3Q6IHVzZXJSb290ISxcbiAgICBydW50aW1lRGlyOiBydW50aW1lRGlyISxcbiAgICBjb2RleFZlcnNpb246IGluc3RhbGxlclN0YXRlPy5jb2RleFZlcnNpb24gPz8gbnVsbCxcbiAgICBjaGFubmVsOiBudWxsLFxuICAgIGdldFdpbmRvd1NlcnZpY2VzOiBnZXRDb2RleFdpbmRvd1NlcnZpY2VzLFxuICB9KTtcbn1cblxuZnVuY3Rpb24gY3VycmVudFJ1bnRpbWVDYXBhYmlsaXRpZXMoKTogQ29kZXhSdW50aW1lQ2FwYWJpbGl0aWVzIHtcbiAgY29uc3QgaW5zdGFsbGVyU3RhdGUgPSByZWFkSW5zdGFsbGVyU3RhdGUoKTtcbiAgcmV0dXJuIGdldFJ1bnRpbWVDYXBhYmlsaXRpZXMoe1xuICAgIHVzZXJSb290OiB1c2VyUm9vdCEsXG4gICAgcnVudGltZURpcjogcnVudGltZURpciEsXG4gICAgY29kZXhWZXJzaW9uOiBpbnN0YWxsZXJTdGF0ZT8uY29kZXhWZXJzaW9uID8/IG51bGwsXG4gICAgY2hhbm5lbDogbnVsbCxcbiAgICBnZXRXaW5kb3dTZXJ2aWNlczogZ2V0Q29kZXhXaW5kb3dTZXJ2aWNlcyxcbiAgICBnZXROYXRpdmVDYXBhYmlsaXRpZXM6ICgpID0+IG5hdGl2ZUJyaWRnZS5nZXRDYXBhYmlsaXRpZXMoKSxcbiAgICBnZXRWaWV3Q2FwYWJpbGl0aWVzOiAoKSA9PiBnZXRPd2xWaWV3Q2FwYWJpbGl0aWVzKCksXG4gIH0pO1xufVxuXG5mdW5jdGlvbiB0d2Vha0NvbnRleHQodHdlYWtJZDogc3RyaW5nLCBwZXJtaXNzaW9uPzogVHdlYWtQZXJtaXNzaW9uKTogTmF0aXZlVHdlYWtDb250ZXh0IHtcbiAgY29uc3QgdHdlYWsgPSBwZXJtaXNzaW9uXG4gICAgPyBhc3NlcnRUd2Vha1Blcm1pc3Npb25Gb3JJZCh0d2Vha0lkLCBwZXJtaXNzaW9uKVxuICAgIDogdHdlYWtCeUlkKHR3ZWFrSWQpO1xuICByZXR1cm4geyBpZDogdHdlYWsubWFuaWZlc3QuaWQsIGRpcjogdHdlYWsuZGlyIH07XG59XG5cbmZ1bmN0aW9uIHR3ZWFrQnlJZCh0d2Vha0lkOiBzdHJpbmcpOiBEaXNjb3ZlcmVkVHdlYWsge1xuICBhc3NlcnRUd2Vha0lkKHR3ZWFrSWQpO1xuICBjb25zdCB0d2VhayA9IHR3ZWFrU3RhdGUuZGlzY292ZXJlZC5maW5kKChpdGVtKSA9PiBpdGVtLm1hbmlmZXN0LmlkID09PSB0d2Vha0lkKTtcbiAgaWYgKCF0d2VhaykgdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIHR3ZWFrOiAke3R3ZWFrSWR9YCk7XG4gIGlmICghaXNUd2Vha0VuYWJsZWQodHdlYWtJZCkpIHRocm93IG5ldyBFcnJvcihgdHdlYWsgaXMgZGlzYWJsZWQ6ICR7dHdlYWtJZH1gKTtcbiAgcmV0dXJuIHR3ZWFrO1xufVxuXG5mdW5jdGlvbiBhc3NlcnRUd2Vha1Blcm1pc3Npb25Gb3JJZCh0d2Vha0lkOiBzdHJpbmcsIHBlcm1pc3Npb246IFR3ZWFrUGVybWlzc2lvbik6IERpc2NvdmVyZWRUd2VhayB7XG4gIGNvbnN0IHR3ZWFrID0gdHdlYWtCeUlkKHR3ZWFrSWQpO1xuICBhc3NlcnRUd2Vha1Blcm1pc3Npb24odHdlYWssIHBlcm1pc3Npb24pO1xuICByZXR1cm4gdHdlYWs7XG59XG5cbmZ1bmN0aW9uIGFzc2VydFR3ZWFrVmlld1Blcm1pc3Npb25Gb3JJZCh0d2Vha0lkOiBzdHJpbmcpOiBEaXNjb3ZlcmVkVHdlYWsge1xuICBjb25zdCB0d2VhayA9IHR3ZWFrQnlJZCh0d2Vha0lkKTtcbiAgYXNzZXJ0VHdlYWtWaWV3UGVybWlzc2lvbih0d2Vhayk7XG4gIHJldHVybiB0d2Vhaztcbn1cblxuZnVuY3Rpb24gYXNzZXJ0VHdlYWtQZXJtaXNzaW9uKHR3ZWFrOiBEaXNjb3ZlcmVkVHdlYWssIHBlcm1pc3Npb246IFR3ZWFrUGVybWlzc2lvbik6IHZvaWQge1xuICBpZiAodHdlYWsubWFuaWZlc3QucGVybWlzc2lvbnM/LmluY2x1ZGVzKHBlcm1pc3Npb24pKSByZXR1cm47XG4gIHRocm93IG5ldyBFcnJvcihgdHdlYWsgJHt0d2Vhay5tYW5pZmVzdC5pZH0gbXVzdCBkZWNsYXJlICR7cGVybWlzc2lvbn0gcGVybWlzc2lvbmApO1xufVxuXG5mdW5jdGlvbiBhc3NlcnRUd2Vha1ZpZXdQZXJtaXNzaW9uKHR3ZWFrOiBEaXNjb3ZlcmVkVHdlYWspOiB2b2lkIHtcbiAgaWYgKFxuICAgIHR3ZWFrLm1hbmlmZXN0LnBlcm1pc3Npb25zPy5pbmNsdWRlcyhcImNvZGV4LXZpZXdzXCIpIHx8XG4gICAgdHdlYWsubWFuaWZlc3QucGVybWlzc2lvbnM/LmluY2x1ZGVzKFwiY29kZXgudmlld3NcIilcbiAgKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRocm93IG5ldyBFcnJvcihgdHdlYWsgJHt0d2Vhay5tYW5pZmVzdC5pZH0gbXVzdCBkZWNsYXJlIGNvZGV4LXZpZXdzIHBlcm1pc3Npb25gKTtcbn1cblxuZnVuY3Rpb24gYXNzZXJ0VHdlYWtJZCh0d2Vha0lkOiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKCEvXlthLXpBLVowLTkuXy1dKyQvLnRlc3QodHdlYWtJZCkpIHRocm93IG5ldyBFcnJvcihcImJhZCB0d2VhayBpZFwiKTtcbn1cblxuZnVuY3Rpb24gZ2V0UHJpbWFyeUNvZGV4V2luZG93KCk6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsIHtcbiAgY29uc3Qgc2VydmljZXMgPSBnZXRDb2RleFdpbmRvd1NlcnZpY2VzKCk7XG4gIGNvbnN0IGZyb21TZXJ2aWNlcyA9IHR5cGVvZiBzZXJ2aWNlcz8uZ2V0UHJpbWFyeVdpbmRvdyA9PT0gXCJmdW5jdGlvblwiXG4gICAgPyBzZXJ2aWNlcy5nZXRQcmltYXJ5V2luZG93KFwibG9jYWxcIilcbiAgICA6IG51bGw7XG4gIGlmIChmcm9tU2VydmljZXMgJiYgIWZyb21TZXJ2aWNlcy5pc0Rlc3Ryb3llZCgpKSByZXR1cm4gZnJvbVNlcnZpY2VzO1xuICBjb25zdCBmcm9tTWFuYWdlciA9IHR5cGVvZiBzZXJ2aWNlcz8ud2luZG93TWFuYWdlcj8uZ2V0UHJpbWFyeVdpbmRvdyA9PT0gXCJmdW5jdGlvblwiXG4gICAgPyBzZXJ2aWNlcy53aW5kb3dNYW5hZ2VyLmdldFByaW1hcnlXaW5kb3cuY2FsbChzZXJ2aWNlcy53aW5kb3dNYW5hZ2VyKVxuICAgIDogbnVsbDtcbiAgaWYgKGZyb21NYW5hZ2VyICYmICFmcm9tTWFuYWdlci5pc0Rlc3Ryb3llZCgpKSByZXR1cm4gZnJvbU1hbmFnZXI7XG4gIGNvbnN0IGZvY3VzZWQgPSBCcm93c2VyV2luZG93LmdldEZvY3VzZWRXaW5kb3coKTtcbiAgaWYgKGZvY3VzZWQgJiYgIWZvY3VzZWQuaXNEZXN0cm95ZWQoKSkgcmV0dXJuIGZvY3VzZWQ7XG4gIHJldHVybiBCcm93c2VyV2luZG93LmdldEFsbFdpbmRvd3MoKS5maW5kKCh3aW4pID0+ICF3aW4uaXNEZXN0cm95ZWQoKSkgPz8gbnVsbDtcbn1cblxuZnVuY3Rpb24gZ2V0UHJpbWFyeUNvZGV4V2luZG93UmVmKCk6IENvZGV4V2luZG93UmVmIHwgbnVsbCB7XG4gIGNvbnN0IHdpbiA9IGdldFByaW1hcnlDb2RleFdpbmRvdygpO1xuICBpZiAoIXdpbiB8fCB3aW4uaXNEZXN0cm95ZWQoKSkgcmV0dXJuIG51bGw7XG4gIHJldHVybiB7IHdpbmRvd0lkOiB3aW4uaWQsIHdlYkNvbnRlbnRzSWQ6IHdpbi53ZWJDb250ZW50cy5pZCB9O1xufVxuXG5mdW5jdGlvbiBmb2N1c0NvZGV4V2luZG93KHdpbmRvd0lkOiBudW1iZXIpOiBib29sZWFuIHtcbiAgY29uc3Qgd2luID0gQnJvd3NlcldpbmRvdy5mcm9tSWQod2luZG93SWQpO1xuICBpZiAoIXdpbiB8fCB3aW4uaXNEZXN0cm95ZWQoKSkgcmV0dXJuIGZhbHNlO1xuICBpZiAod2luLmlzTWluaW1pemVkKCkpIHdpbi5yZXN0b3JlKCk7XG4gIHdpbi5zaG93KCk7XG4gIHdpbi5mb2N1cygpO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gc2hvd0NvZGV4V2luZG93KHdpbmRvd0lkOiBudW1iZXIpOiBib29sZWFuIHtcbiAgY29uc3Qgd2luID0gQnJvd3NlcldpbmRvdy5mcm9tSWQod2luZG93SWQpO1xuICBpZiAoIXdpbiB8fCB3aW4uaXNEZXN0cm95ZWQoKSkgcmV0dXJuIGZhbHNlO1xuICB3aW4uc2hvdygpO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gZ2V0T3dsVmlld0NhcGFiaWxpdGllcygpOiBDb2RleFJ1bnRpbWVDYXBhYmlsaXRpZXNbXCJ2aWV3c1wiXSB7XG4gIGNvbnN0IHBhcmVudCA9IGdldFByaW1hcnlDb2RleFdpbmRvdygpID8/IEJyb3dzZXJXaW5kb3cuZ2V0Rm9jdXNlZFdpbmRvdygpO1xuICBjb25zdCBjb250ZW50VmlldyA9IGFzUmVjb3JkKHBhcmVudCk/LmNvbnRlbnRWaWV3O1xuICBsZXQgc2FtcGxlVmlldzogRWxlY3Ryb24uQnJvd3NlclZpZXcgfCBudWxsID0gbnVsbDtcbiAgdHJ5IHtcbiAgICBzYW1wbGVWaWV3ID0gbmV3IEJyb3dzZXJWaWV3KHsgd2ViUHJlZmVyZW5jZXM6IHsgc2FuZGJveDogdHJ1ZSB9IH0pO1xuICB9IGNhdGNoIHt9XG4gIGNvbnN0IHdlYkNvbnRlbnRzVmlldyA9IGFzUmVjb3JkKHNhbXBsZVZpZXcpPy53ZWJDb250ZW50c1ZpZXc7XG4gIGNvbnN0IHByaXZhdGVWaWV3VHJlZSA9IHR5cGVvZiBhc1JlY29yZChjb250ZW50Vmlldyk/LmFkZENoaWxkVmlldyA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgdHlwZW9mIGFzUmVjb3JkKGNvbnRlbnRWaWV3KT8ucmVtb3ZlQ2hpbGRWaWV3ID09PSBcImZ1bmN0aW9uXCI7XG4gIGNvbnN0IHdlYkNvbnRlbnRzVmlld0F2YWlsYWJsZSA9IEJvb2xlYW4od2ViQ29udGVudHNWaWV3KSAmJlxuICAgIHR5cGVvZiBhc1JlY29yZCh3ZWJDb250ZW50c1ZpZXcpPy5zZXRCb3VuZHMgPT09IFwiZnVuY3Rpb25cIjtcbiAgY29uc3QgcHJpdmF0ZUF0dGFjaCA9IHByaXZhdGVWaWV3VHJlZSAmJiB3ZWJDb250ZW50c1ZpZXdBdmFpbGFibGU7XG4gIGNvbnN0IGJyb3dzZXJWaWV3RmFsbGJhY2sgPSB0eXBlb2YgYXNSZWNvcmQocGFyZW50KT8uYWRkQnJvd3NlclZpZXcgPT09IFwiZnVuY3Rpb25cIjtcbiAgdHJ5IHtcbiAgICBpZiAoc2FtcGxlVmlldyAmJiAhc2FtcGxlVmlldy53ZWJDb250ZW50cy5pc0Rlc3Ryb3llZCgpKSB7XG4gICAgICBzYW1wbGVWaWV3LndlYkNvbnRlbnRzLmNsb3NlKHsgd2FpdEZvckJlZm9yZVVubG9hZDogZmFsc2UgfSk7XG4gICAgfVxuICB9IGNhdGNoIHt9XG4gIHJldHVybiB7XG4gICAgY3JlYXRlOiBwcml2YXRlQXR0YWNoIHx8IGJyb3dzZXJWaWV3RmFsbGJhY2ssXG4gICAgcHJpdmF0ZVZpZXdUcmVlOiBwcml2YXRlQXR0YWNoLFxuICAgIHdlYkNvbnRlbnRzVmlldzogd2ViQ29udGVudHNWaWV3QXZhaWxhYmxlLFxuICAgIGJyb3dzZXJWaWV3RmFsbGJhY2ssXG4gIH07XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNyZWF0ZU93bFZpZXcoXG4gIGN0eDogTmF0aXZlVHdlYWtDb250ZXh0LFxuICBvcHRzOiBDb2RleFZpZXdDcmVhdGVPcHRpb25zLFxuKTogUHJvbWlzZTxDb2RleFZpZXdSZWY+IHtcbiAgY29uc3QgaWQgPSBhc3NlcnRCcmlkZ2VJZChvcHRzLmlkID8/IHJhbmRvbVVVSUQoKSwgXCJDb2RleCB2aWV3IGlkXCIpO1xuICBjb25zdCBrZXkgPSBvd2xWaWV3S2V5KGN0eC5pZCwgaWQpO1xuICBpZiAob3dsVmlld3MuaGFzKGtleSkpIHRocm93IG5ldyBFcnJvcihgQ29kZXggdmlldyBhbHJlYWR5IGV4aXN0czogJHtjdHguaWR9OiR7aWR9YCk7XG5cbiAgY29uc3QgcGFyZW50ID0gdHlwZW9mIG9wdHMucGFyZW50V2luZG93SWQgPT09IFwibnVtYmVyXCJcbiAgICA/IEJyb3dzZXJXaW5kb3cuZnJvbUlkKG9wdHMucGFyZW50V2luZG93SWQpXG4gICAgOiBnZXRQcmltYXJ5Q29kZXhXaW5kb3coKTtcbiAgaWYgKCFwYXJlbnQgfHwgaXNXaW5kb3dEZXN0cm95ZWQocGFyZW50KSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNvZGV4IHZpZXcgbmVlZHMgYW4gYWN0aXZlIHBhcmVudCB3aW5kb3dcIik7XG4gIH1cblxuICBjb25zdCBzZXJ2aWNlcyA9IGdldENvZGV4V2luZG93U2VydmljZXMoKTtcbiAgY29uc3Qgd2luZG93TWFuYWdlciA9IHNlcnZpY2VzPy53aW5kb3dNYW5hZ2VyO1xuICBjb25zdCByb3V0ZSA9IG9wdHMucm91dGUgPT09IHVuZGVmaW5lZCA/IG51bGwgOiBub3JtYWxpemVDb2RleFJvdXRlKG9wdHMucm91dGUpO1xuICBjb25zdCBob3N0SWQgPSBvcHRzLmhvc3RJZCB8fCBcImxvY2FsXCI7XG4gIGNvbnN0IHZpZXcgPSBuZXcgQnJvd3NlclZpZXcoe1xuICAgIHdlYlByZWZlcmVuY2VzOiB7XG4gICAgICBwcmVsb2FkOiBvcHRzLnJlZ2lzdGVyV2l0aENvZGV4ID09PSBmYWxzZSA/IHVuZGVmaW5lZCA6IHdpbmRvd01hbmFnZXI/Lm9wdGlvbnM/LnByZWxvYWRQYXRoLFxuICAgICAgY29udGV4dElzb2xhdGlvbjogdHJ1ZSxcbiAgICAgIG5vZGVJbnRlZ3JhdGlvbjogZmFsc2UsXG4gICAgICBzcGVsbGNoZWNrOiBmYWxzZSxcbiAgICAgIGRldlRvb2xzOiB3aW5kb3dNYW5hZ2VyPy5vcHRpb25zPy5hbGxvd0RldnRvb2xzLFxuICAgIH0sXG4gIH0pO1xuXG4gIGlmIChvcHRzLmJhY2tncm91bmRDb2xvcikge1xuICAgIGNhbGxPYmplY3RNZXRob2QodmlldywgXCJzZXRCYWNrZ3JvdW5kQ29sb3JcIiwgW29wdHMuYmFja2dyb3VuZENvbG9yXSk7XG4gICAgY2FsbE9iamVjdE1ldGhvZChhc1JlY29yZCh2aWV3KT8ud2ViQ29udGVudHNWaWV3LCBcInNldEJhY2tncm91bmRDb2xvclwiLCBbb3B0cy5iYWNrZ3JvdW5kQ29sb3JdKTtcbiAgfVxuXG4gIGNvbnN0IG1hbmFnZWQ6IE1hbmFnZWRPd2xWaWV3ID0ge1xuICAgIGtleSxcbiAgICB0d2Vha0lkOiBjdHguaWQsXG4gICAgaWQsXG4gICAgdmlldyxcbiAgICBwYXJlbnRXaW5kb3dJZDogd2luZG93SWRGb3IocGFyZW50KSxcbiAgICBhdHRhY2hNb2RlOiBudWxsLFxuICAgIGRpc3Bvc2VCaW5kaW5nczogW10sXG4gICAgZGlzcG9zZWQ6IGZhbHNlLFxuICB9O1xuICBvd2xWaWV3cy5zZXQoa2V5LCBtYW5hZ2VkKTtcblxuICB0cnkge1xuICAgIGlmIChyb3V0ZSAhPT0gbnVsbCAmJiBvcHRzLnJlZ2lzdGVyV2l0aENvZGV4ICE9PSBmYWxzZSAmJiB3aW5kb3dNYW5hZ2VyPy5yZWdpc3RlcldpbmRvdykge1xuICAgICAgY29uc3QgYXBwZWFyYW5jZSA9IG9wdHMuYXBwZWFyYW5jZSB8fCBcInNlY29uZGFyeVwiO1xuICAgICAgY29uc3Qgd2luZG93TGlrZSA9IG1ha2VXaW5kb3dMaWtlRm9yVmlldyh2aWV3KTtcbiAgICAgIHdpbmRvd01hbmFnZXIucmVnaXN0ZXJXaW5kb3cod2luZG93TGlrZSwgaG9zdElkLCBmYWxzZSwgYXBwZWFyYW5jZSk7XG4gICAgICBzZXJ2aWNlcz8uZ2V0Q29udGV4dD8uKGhvc3RJZCk/LnJlZ2lzdGVyV2luZG93Py4od2luZG93TGlrZSk7XG4gICAgfVxuXG4gICAgYXR0YWNoT3dsVmlldyhtYW5hZ2VkLCBwYXJlbnQpO1xuICAgIGlmIChvcHRzLmJvdW5kcykgc2V0T3dsVmlld0JvdW5kcyhtYW5hZ2VkLCBvcHRzLmJvdW5kcyk7XG4gICAgaWYgKG9wdHMudmlzaWJsZSA9PT0gZmFsc2UpIHNldE93bFZpZXdWaXNpYmxlKG1hbmFnZWQsIGZhbHNlKTtcblxuICAgIGlmIChyb3V0ZSAhPT0gbnVsbCkge1xuICAgICAgYXdhaXQgdmlldy53ZWJDb250ZW50cy5sb2FkVVJMKGNvZGV4QXBwVXJsKHJvdXRlLCBob3N0SWQpKTtcbiAgICB9IGVsc2UgaWYgKG9wdHMudXJsKSB7XG4gICAgICBhd2FpdCB2aWV3LndlYkNvbnRlbnRzLmxvYWRVUkwobm9ybWFsaXplT3dsVmlld1VybChvcHRzLnVybCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhd2FpdCB2aWV3LndlYkNvbnRlbnRzLmxvYWRVUkwoXCJhYm91dDpibGFua1wiKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBkaXNwb3NlT3dsVmlldyhtYW5hZ2VkKTtcbiAgICB0aHJvdyBlO1xuICB9XG5cbiAgbG9nKFwiaW5mb1wiLCBgY3JlYXRlZCBPd2wgdmlldyAke2N0eC5pZH06JHtpZH1gLCB7XG4gICAgcGFyZW50V2luZG93SWQ6IG1hbmFnZWQucGFyZW50V2luZG93SWQsXG4gICAgd2ViQ29udGVudHNJZDogdmlldy53ZWJDb250ZW50cy5pZCxcbiAgICBhdHRhY2hNb2RlOiBtYW5hZ2VkLmF0dGFjaE1vZGUsXG4gIH0pO1xuICByZXR1cm4gb3dsVmlld1JlZihtYW5hZ2VkKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY2FsbE93bFZpZXcoXG4gIHR3ZWFrSWQ6IHN0cmluZyxcbiAgaWQ6IHN0cmluZyxcbiAgbWV0aG9kOiBzdHJpbmcsXG4gIGFyZz86IHVua25vd24sXG4gIGFyZzI/OiB1bmtub3duLFxuKTogUHJvbWlzZTx1bmtub3duPiB7XG4gIGNvbnN0IHZpZXcgPSBvd2xWaWV3Rm9yKHR3ZWFrSWQsIGlkKTtcbiAgaWYgKG1ldGhvZCA9PT0gXCJzZXRCb3VuZHNcIikgcmV0dXJuIHNldE93bFZpZXdCb3VuZHModmlldywgYXJnIGFzIEVsZWN0cm9uLlJlY3RhbmdsZSk7XG4gIGlmIChtZXRob2QgPT09IFwic2V0VmlzaWJsZVwiKSByZXR1cm4gc2V0T3dsVmlld1Zpc2libGUodmlldywgQm9vbGVhbihhcmcpKTtcbiAgaWYgKG1ldGhvZCA9PT0gXCJicmluZ1RvRnJvbnRcIikgcmV0dXJuIGJyaW5nT3dsVmlld1RvRnJvbnQodmlldyk7XG4gIGlmIChtZXRob2QgPT09IFwibG9hZFJvdXRlXCIpIHtcbiAgICBjb25zdCByb3V0ZSA9IG5vcm1hbGl6ZUNvZGV4Um91dGUoU3RyaW5nKGFyZykpO1xuICAgIGNvbnN0IGhvc3RJZCA9IHR5cGVvZiBhcmcyID09PSBcInN0cmluZ1wiICYmIGFyZzIgPyBhcmcyIDogXCJsb2NhbFwiO1xuICAgIHJldHVybiB2aWV3LnZpZXcud2ViQ29udGVudHMubG9hZFVSTChjb2RleEFwcFVybChyb3V0ZSwgaG9zdElkKSk7XG4gIH1cbiAgaWYgKG1ldGhvZCA9PT0gXCJsb2FkVXJsXCIpIHJldHVybiB2aWV3LnZpZXcud2ViQ29udGVudHMubG9hZFVSTChub3JtYWxpemVPd2xWaWV3VXJsKFN0cmluZyhhcmcpKSk7XG4gIGlmIChtZXRob2QgPT09IFwiZGlzcG9zZVwiKSByZXR1cm4gZGlzcG9zZU93bFZpZXdCeUlkKHR3ZWFrSWQsIGlkKTtcbiAgdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIENvZGV4IHZpZXcgbWV0aG9kOiAke21ldGhvZH1gKTtcbn1cblxuZnVuY3Rpb24gb3dsVmlld1JlZih2aWV3OiBNYW5hZ2VkT3dsVmlldyk6IENvZGV4Vmlld1JlZiB7XG4gIHJldHVybiB7XG4gICAgaWQ6IHZpZXcuaWQsXG4gICAgd2ViQ29udGVudHNJZDogdmlldy52aWV3LndlYkNvbnRlbnRzLmlkLFxuICAgIHBhcmVudFdpbmRvd0lkOiB2aWV3LnBhcmVudFdpbmRvd0lkLFxuICAgIHNldEJvdW5kczogKGJvdW5kcykgPT4gUHJvbWlzZS5yZXNvbHZlKHNldE93bFZpZXdCb3VuZHModmlldywgYm91bmRzKSksXG4gICAgc2V0VmlzaWJsZTogKHZpc2libGUpID0+IFByb21pc2UucmVzb2x2ZShzZXRPd2xWaWV3VmlzaWJsZSh2aWV3LCB2aXNpYmxlKSksXG4gICAgYnJpbmdUb0Zyb250OiAoKSA9PiBQcm9taXNlLnJlc29sdmUoYnJpbmdPd2xWaWV3VG9Gcm9udCh2aWV3KSksXG4gICAgbG9hZFJvdXRlOiAocm91dGUsIGhvc3RJZCkgPT4gdmlldy52aWV3LndlYkNvbnRlbnRzLmxvYWRVUkwoY29kZXhBcHBVcmwobm9ybWFsaXplQ29kZXhSb3V0ZShyb3V0ZSksIGhvc3RJZCB8fCBcImxvY2FsXCIpKS50aGVuKCgpID0+IHt9KSxcbiAgICBsb2FkVXJsOiAodXJsKSA9PiB2aWV3LnZpZXcud2ViQ29udGVudHMubG9hZFVSTChub3JtYWxpemVPd2xWaWV3VXJsKHVybCkpLnRoZW4oKCkgPT4ge30pLFxuICAgIGRpc3Bvc2U6ICgpID0+IFByb21pc2UucmVzb2x2ZShkaXNwb3NlT3dsVmlld0J5SWQodmlldy50d2Vha0lkLCB2aWV3LmlkKSksXG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dGFjaE93bFZpZXcodmlldzogTWFuYWdlZE93bFZpZXcsIHBhcmVudDogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyk6IHZvaWQge1xuICBjb25zdCBjb250ZW50VmlldyA9IGFzUmVjb3JkKHBhcmVudCk/LmNvbnRlbnRWaWV3O1xuICBjb25zdCB3ZWJDb250ZW50c1ZpZXcgPSBhc1JlY29yZCh2aWV3LnZpZXcpPy53ZWJDb250ZW50c1ZpZXc7XG4gIGlmIChcbiAgICB0eXBlb2YgYXNSZWNvcmQoY29udGVudFZpZXcpPy5hZGRDaGlsZFZpZXcgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgIHdlYkNvbnRlbnRzVmlld1xuICApIHtcbiAgICB0cnkge1xuICAgICAgY2FsbE9iamVjdE1ldGhvZChjb250ZW50VmlldywgXCJhZGRDaGlsZFZpZXdcIiwgW3dlYkNvbnRlbnRzVmlld10pO1xuICAgICAgdmlldy5hdHRhY2hNb2RlID0gXCJjb250ZW50Vmlld1wiO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZyhcIndhcm5cIiwgXCJPd2wgY29udGVudFZpZXcgYXR0YWNobWVudCBmYWlsZWQ7IGZhbGxpbmcgYmFjayB0byBCcm93c2VyVmlld1wiLCB7XG4gICAgICAgIHR3ZWFrSWQ6IHZpZXcudHdlYWtJZCxcbiAgICAgICAgdmlld0lkOiB2aWV3LmlkLFxuICAgICAgICBlcnJvcjogU3RyaW5nKGUpLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIGlmICghdmlldy5hdHRhY2hNb2RlICYmIHR5cGVvZiBhc1JlY29yZChwYXJlbnQpPy5hZGRCcm93c2VyVmlldyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgY2FsbE9iamVjdE1ldGhvZChwYXJlbnQsIFwiYWRkQnJvd3NlclZpZXdcIiwgW3ZpZXcudmlld10pO1xuICAgIHZpZXcuYXR0YWNoTW9kZSA9IFwiYnJvd3NlclZpZXdcIjtcbiAgfVxuICBpZiAoIXZpZXcuYXR0YWNoTW9kZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk93bCB2aWV3IGF0dGFjaG1lbnQgaXMgbm90IGF2YWlsYWJsZSBvbiB0aGlzIENvZGV4IHdpbmRvd1wiKTtcbiAgfVxuXG4gIGNvbnN0IGRpc3Bvc2UgPSAoKSA9PiBkaXNwb3NlT3dsVmlld0J5SWQodmlldy50d2Vha0lkLCB2aWV3LmlkKTtcbiAgYmluZFdpbmRvd0V2ZW50KHBhcmVudCwgdmlldywgXCJjbG9zZWRcIiwgZGlzcG9zZSk7XG4gIGJpbmRXaW5kb3dFdmVudChwYXJlbnQsIHZpZXcsIFwiY2xvc2VcIiwgZGlzcG9zZSk7XG59XG5cbmZ1bmN0aW9uIGJyaW5nT3dsVmlld1RvRnJvbnQodmlldzogTWFuYWdlZE93bFZpZXcpOiB2b2lkIHtcbiAgaWYgKHZpZXcuZGlzcG9zZWQpIHJldHVybjtcbiAgY29uc3QgcGFyZW50ID0gdmlldy5wYXJlbnRXaW5kb3dJZCA9PT0gbnVsbCA/IG51bGwgOiBCcm93c2VyV2luZG93LmZyb21JZCh2aWV3LnBhcmVudFdpbmRvd0lkKTtcbiAgaWYgKCFwYXJlbnQgfHwgaXNXaW5kb3dEZXN0cm95ZWQocGFyZW50KSkgcmV0dXJuO1xuICBjb25zdCBjb250ZW50VmlldyA9IGFzUmVjb3JkKHBhcmVudCk/LmNvbnRlbnRWaWV3O1xuICBjb25zdCB3ZWJDb250ZW50c1ZpZXcgPSBhc1JlY29yZCh2aWV3LnZpZXcpPy53ZWJDb250ZW50c1ZpZXc7XG4gIGlmICh2aWV3LmF0dGFjaE1vZGUgPT09IFwiY29udGVudFZpZXdcIiAmJiB3ZWJDb250ZW50c1ZpZXcpIHtcbiAgICB0cnkge1xuICAgICAgY2FsbE9iamVjdE1ldGhvZChjb250ZW50VmlldywgXCJhZGRDaGlsZFZpZXdcIiwgW3dlYkNvbnRlbnRzVmlld10pO1xuICAgICAgcmV0dXJuO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZyhcIndhcm5cIiwgXCJPd2wgY29udGVudFZpZXcgYnJpbmctdG8tZnJvbnQgZmFpbGVkXCIsIHtcbiAgICAgICAgdHdlYWtJZDogdmlldy50d2Vha0lkLFxuICAgICAgICB2aWV3SWQ6IHZpZXcuaWQsXG4gICAgICAgIGVycm9yOiBTdHJpbmcoZSksXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgaWYgKHR5cGVvZiBhc1JlY29yZChwYXJlbnQpPy5zZXRUb3BCcm93c2VyVmlldyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgY2FsbE9iamVjdE1ldGhvZChwYXJlbnQsIFwic2V0VG9wQnJvd3NlclZpZXdcIiwgW3ZpZXcudmlld10pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNldE93bFZpZXdCb3VuZHModmlldzogTWFuYWdlZE93bFZpZXcsIGJvdW5kczogRWxlY3Ryb24uUmVjdGFuZ2xlKTogdm9pZCB7XG4gIGFzc2VydEJvdW5kcyhib3VuZHMpO1xuICBjYWxsT2JqZWN0TWV0aG9kKHZpZXcudmlldywgXCJzZXRCb3VuZHNcIiwgW2JvdW5kc10pO1xuICBjYWxsT2JqZWN0TWV0aG9kKGFzUmVjb3JkKHZpZXcudmlldyk/LndlYkNvbnRlbnRzVmlldywgXCJzZXRCb3VuZHNcIiwgW2JvdW5kc10pO1xufVxuXG5mdW5jdGlvbiBzZXRPd2xWaWV3VmlzaWJsZSh2aWV3OiBNYW5hZ2VkT3dsVmlldywgdmlzaWJsZTogYm9vbGVhbik6IHZvaWQge1xuICBjYWxsT2JqZWN0TWV0aG9kKGFzUmVjb3JkKHZpZXcudmlldyk/LndlYkNvbnRlbnRzVmlldywgXCJzZXRWaXNpYmxlXCIsIFt2aXNpYmxlXSk7XG59XG5cbmZ1bmN0aW9uIGRpc3Bvc2VPd2xWaWV3QnlJZCh0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgdmlldyA9IG93bFZpZXdzLmdldChvd2xWaWV3S2V5KHR3ZWFrSWQsIGlkKSk7XG4gIGlmICghdmlldykgcmV0dXJuO1xuICBkaXNwb3NlT3dsVmlldyh2aWV3KTtcbn1cblxuZnVuY3Rpb24gZGlzcG9zZU93bFZpZXdzRm9yVHdlYWsodHdlYWtJZDogc3RyaW5nKTogdm9pZCB7XG4gIGZvciAoY29uc3QgdmlldyBvZiBbLi4ub3dsVmlld3MudmFsdWVzKCldKSB7XG4gICAgaWYgKHZpZXcudHdlYWtJZCA9PT0gdHdlYWtJZCkgZGlzcG9zZU93bFZpZXcodmlldyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZGlzcG9zZUFsbE93bFZpZXdzKCk6IHZvaWQge1xuICBmb3IgKGNvbnN0IHZpZXcgb2YgWy4uLm93bFZpZXdzLnZhbHVlcygpXSkgZGlzcG9zZU93bFZpZXcodmlldyk7XG59XG5cbmZ1bmN0aW9uIGRpc3Bvc2VPd2xWaWV3KHZpZXc6IE1hbmFnZWRPd2xWaWV3KTogdm9pZCB7XG4gIGlmICh2aWV3LmRpc3Bvc2VkKSByZXR1cm47XG4gIHZpZXcuZGlzcG9zZWQgPSB0cnVlO1xuICBvd2xWaWV3cy5kZWxldGUodmlldy5rZXkpO1xuICBmb3IgKGNvbnN0IGRpc3Bvc2Ugb2Ygdmlldy5kaXNwb3NlQmluZGluZ3Muc3BsaWNlKDApKSB7XG4gICAgdHJ5IHtcbiAgICAgIGRpc3Bvc2UoKTtcbiAgICB9IGNhdGNoIHt9XG4gIH1cbiAgY29uc3QgcGFyZW50ID0gdmlldy5wYXJlbnRXaW5kb3dJZCA9PT0gbnVsbCA/IG51bGwgOiBCcm93c2VyV2luZG93LmZyb21JZCh2aWV3LnBhcmVudFdpbmRvd0lkKTtcbiAgaWYgKHBhcmVudCAmJiAhaXNXaW5kb3dEZXN0cm95ZWQocGFyZW50KSkge1xuICAgIHRyeSB7XG4gICAgICBpZiAodmlldy5hdHRhY2hNb2RlID09PSBcImNvbnRlbnRWaWV3XCIpIHtcbiAgICAgICAgY2FsbE9iamVjdE1ldGhvZChhc1JlY29yZChwYXJlbnQpPy5jb250ZW50VmlldywgXCJyZW1vdmVDaGlsZFZpZXdcIiwgW2FzUmVjb3JkKHZpZXcudmlldyk/LndlYkNvbnRlbnRzVmlld10pO1xuICAgICAgfSBlbHNlIGlmICh2aWV3LmF0dGFjaE1vZGUgPT09IFwiYnJvd3NlclZpZXdcIikge1xuICAgICAgICBjYWxsT2JqZWN0TWV0aG9kKHBhcmVudCwgXCJyZW1vdmVCcm93c2VyVmlld1wiLCBbdmlldy52aWV3XSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nKFwid2FyblwiLCBcIk93bCB2aWV3IGRldGFjaCBmYWlsZWQgZHVyaW5nIGRpc3Bvc2VcIiwge1xuICAgICAgICB0d2Vha0lkOiB2aWV3LnR3ZWFrSWQsXG4gICAgICAgIHZpZXdJZDogdmlldy5pZCxcbiAgICAgICAgZXJyb3I6IFN0cmluZyhlKSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICB0cnkge1xuICAgIGlmICghdmlldy52aWV3LndlYkNvbnRlbnRzLmlzRGVzdHJveWVkKCkpIHtcbiAgICAgIHZpZXcudmlldy53ZWJDb250ZW50cy5jbG9zZSh7IHdhaXRGb3JCZWZvcmVVbmxvYWQ6IGZhbHNlIH0pO1xuICAgIH1cbiAgfSBjYXRjaCB7fVxufVxuXG5mdW5jdGlvbiBvd2xWaWV3Rm9yKHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZyk6IE1hbmFnZWRPd2xWaWV3IHtcbiAgY29uc3QgdmlldyA9IG93bFZpZXdzLmdldChvd2xWaWV3S2V5KHR3ZWFrSWQsIGlkKSk7XG4gIGlmICghdmlldyB8fCB2aWV3LmRpc3Bvc2VkKSB0aHJvdyBuZXcgRXJyb3IoYENvZGV4IHZpZXcgaXMgbm90IGxvYWRlZDogJHt0d2Vha0lkfToke2lkfWApO1xuICByZXR1cm4gdmlldztcbn1cblxuZnVuY3Rpb24gb3dsVmlld0tleSh0d2Vha0lkOiBzdHJpbmcsIHZpZXdJZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke3R3ZWFrSWR9OiR7dmlld0lkfWA7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUNvZGV4QnJvd3NlclZpZXcob3B0czogQ29kZXhDcmVhdGVWaWV3T3B0aW9ucyk6IFByb21pc2U8dW5rbm93bj4ge1xuICBjb25zdCBzZXJ2aWNlcyA9IGdldENvZGV4V2luZG93U2VydmljZXMoKTtcbiAgY29uc3Qgd2luZG93TWFuYWdlciA9IHNlcnZpY2VzPy53aW5kb3dNYW5hZ2VyO1xuICBpZiAoIXNlcnZpY2VzIHx8ICF3aW5kb3dNYW5hZ2VyPy5yZWdpc3RlcldpbmRvdykge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIFwiQ29kZXggZW1iZWRkZWQgdmlldyBzZXJ2aWNlcyBhcmUgbm90IGF2YWlsYWJsZS4gUmVpbnN0YWxsIENvZGV4KysgMS4wLjAgb3IgbGF0ZXIuXCIsXG4gICAgKTtcbiAgfVxuXG4gIGNvbnN0IHJvdXRlID0gbm9ybWFsaXplQ29kZXhSb3V0ZShvcHRzLnJvdXRlKTtcbiAgY29uc3QgaG9zdElkID0gb3B0cy5ob3N0SWQgfHwgXCJsb2NhbFwiO1xuICBjb25zdCBhcHBlYXJhbmNlID0gb3B0cy5hcHBlYXJhbmNlIHx8IFwic2Vjb25kYXJ5XCI7XG4gIGNvbnN0IHZpZXcgPSBuZXcgQnJvd3NlclZpZXcoe1xuICAgIHdlYlByZWZlcmVuY2VzOiB7XG4gICAgICBwcmVsb2FkOiB3aW5kb3dNYW5hZ2VyLm9wdGlvbnM/LnByZWxvYWRQYXRoLFxuICAgICAgY29udGV4dElzb2xhdGlvbjogdHJ1ZSxcbiAgICAgIG5vZGVJbnRlZ3JhdGlvbjogZmFsc2UsXG4gICAgICBzcGVsbGNoZWNrOiBmYWxzZSxcbiAgICAgIGRldlRvb2xzOiB3aW5kb3dNYW5hZ2VyLm9wdGlvbnM/LmFsbG93RGV2dG9vbHMsXG4gICAgfSxcbiAgfSk7XG4gIGNvbnN0IHdpbmRvd0xpa2UgPSBtYWtlV2luZG93TGlrZUZvclZpZXcodmlldyk7XG4gIHdpbmRvd01hbmFnZXIucmVnaXN0ZXJXaW5kb3cod2luZG93TGlrZSwgaG9zdElkLCBmYWxzZSwgYXBwZWFyYW5jZSk7XG4gIHNlcnZpY2VzLmdldENvbnRleHQ/Lihob3N0SWQpPy5yZWdpc3RlcldpbmRvdz8uKHdpbmRvd0xpa2UpO1xuICBhd2FpdCB2aWV3LndlYkNvbnRlbnRzLmxvYWRVUkwoY29kZXhBcHBVcmwocm91dGUsIGhvc3RJZCkpO1xuICByZXR1cm4gdmlldztcbn1cblxuYXN5bmMgZnVuY3Rpb24gY3JlYXRlQ29kZXhXaW5kb3cob3B0czogQ29kZXhDcmVhdGVXaW5kb3dPcHRpb25zKTogUHJvbWlzZTxDb2RleFdpbmRvd1JlZj4ge1xuICBjb25zdCBzZXJ2aWNlcyA9IGdldENvZGV4V2luZG93U2VydmljZXMoKTtcbiAgaWYgKCFzZXJ2aWNlcykge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIFwiQ29kZXggd2luZG93IHNlcnZpY2VzIGFyZSBub3QgYXZhaWxhYmxlLiBSZWluc3RhbGwgQ29kZXgrKyAxLjAuMCBvciBsYXRlci5cIixcbiAgICApO1xuICB9XG5cbiAgY29uc3Qgcm91dGUgPSBub3JtYWxpemVDb2RleFJvdXRlKG9wdHMucm91dGUpO1xuICBjb25zdCBob3N0SWQgPSBvcHRzLmhvc3RJZCB8fCBcImxvY2FsXCI7XG4gIGNvbnN0IHBhcmVudCA9IHR5cGVvZiBvcHRzLnBhcmVudFdpbmRvd0lkID09PSBcIm51bWJlclwiXG4gICAgPyBCcm93c2VyV2luZG93LmZyb21JZChvcHRzLnBhcmVudFdpbmRvd0lkKVxuICAgIDogQnJvd3NlcldpbmRvdy5nZXRGb2N1c2VkV2luZG93KCk7XG4gIGNvbnN0IGNyZWF0ZVdpbmRvdyA9IHNlcnZpY2VzLndpbmRvd01hbmFnZXI/LmNyZWF0ZVdpbmRvdztcblxuICBsZXQgd2luOiBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbCB8IHVuZGVmaW5lZDtcbiAgaWYgKHR5cGVvZiBjcmVhdGVXaW5kb3cgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHdpbiA9IGF3YWl0IGNyZWF0ZVdpbmRvdy5jYWxsKHNlcnZpY2VzLndpbmRvd01hbmFnZXIsIHtcbiAgICAgIGluaXRpYWxSb3V0ZTogcm91dGUsXG4gICAgICBob3N0SWQsXG4gICAgICBzaG93OiBvcHRzLnNob3cgIT09IGZhbHNlLFxuICAgICAgYXBwZWFyYW5jZTogb3B0cy5hcHBlYXJhbmNlIHx8IFwic2Vjb25kYXJ5XCIsXG4gICAgICBwYXJlbnQsXG4gICAgfSk7XG4gIH0gZWxzZSBpZiAoaG9zdElkID09PSBcImxvY2FsXCIgJiYgdHlwZW9mIHNlcnZpY2VzLmNyZWF0ZUZyZXNoV2luZG93ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICB3aW4gPSBhd2FpdCBzZXJ2aWNlcy5jcmVhdGVGcmVzaFdpbmRvdyhyb3V0ZSk7XG4gIH0gZWxzZSBpZiAoaG9zdElkID09PSBcImxvY2FsXCIgJiYgdHlwZW9mIHNlcnZpY2VzLmNyZWF0ZUZyZXNoTG9jYWxXaW5kb3cgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHdpbiA9IGF3YWl0IHNlcnZpY2VzLmNyZWF0ZUZyZXNoTG9jYWxXaW5kb3cocm91dGUpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBzZXJ2aWNlcy5lbnN1cmVIb3N0V2luZG93ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICB3aW4gPSBhd2FpdCBzZXJ2aWNlcy5lbnN1cmVIb3N0V2luZG93KGhvc3RJZCk7XG4gIH1cblxuICBpZiAoIXdpbiB8fCB3aW4uaXNEZXN0cm95ZWQoKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNvZGV4IGRpZCBub3QgcmV0dXJuIGEgd2luZG93IGZvciB0aGUgcmVxdWVzdGVkIHJvdXRlXCIpO1xuICB9XG5cbiAgaWYgKG9wdHMuYm91bmRzKSB7XG4gICAgd2luLnNldEJvdW5kcyhvcHRzLmJvdW5kcyk7XG4gIH1cbiAgaWYgKHBhcmVudCAmJiAhcGFyZW50LmlzRGVzdHJveWVkKCkpIHtcbiAgICB0cnkge1xuICAgICAgd2luLnNldFBhcmVudFdpbmRvdyhwYXJlbnQpO1xuICAgIH0gY2F0Y2gge31cbiAgfVxuICBpZiAob3B0cy5zaG93ICE9PSBmYWxzZSkge1xuICAgIHdpbi5zaG93KCk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHdpbmRvd0lkOiB3aW4uaWQsXG4gICAgd2ViQ29udGVudHNJZDogd2luLndlYkNvbnRlbnRzLmlkLFxuICB9O1xufVxuXG5mdW5jdGlvbiBtYWtlQ29kZXhBcGkodHdlYWs6IERpc2NvdmVyZWRUd2Vhaykge1xuICBjb25zdCBjdHggPSAoKTogTmF0aXZlVHdlYWtDb250ZXh0ID0+ICh7IGlkOiB0d2Vhay5tYW5pZmVzdC5pZCwgZGlyOiB0d2Vhay5kaXIgfSk7XG4gIHJldHVybiB7XG4gICAgcnVudGltZToge1xuICAgICAgZ2V0SW5mbzogYXN5bmMgKCkgPT4gY3VycmVudFJ1bnRpbWVJbmZvKCksXG4gICAgICBnZXRDYXBhYmlsaXRpZXM6IGFzeW5jICgpID0+IGN1cnJlbnRSdW50aW1lQ2FwYWJpbGl0aWVzKCksXG4gICAgfSxcbiAgICB3aW5kb3dzOiB7XG4gICAgICBjcmVhdGU6IGNyZWF0ZUNvZGV4V2luZG93LFxuICAgICAgZ2V0UHJpbWFyeTogYXN5bmMgKCkgPT4gZ2V0UHJpbWFyeUNvZGV4V2luZG93UmVmKCksXG4gICAgICBmb2N1czogYXN5bmMgKHdpbmRvd0lkOiBudW1iZXIpID0+IGZvY3VzQ29kZXhXaW5kb3cod2luZG93SWQpLFxuICAgICAgc2hvdzogYXN5bmMgKHdpbmRvd0lkOiBudW1iZXIpID0+IHNob3dDb2RleFdpbmRvdyh3aW5kb3dJZCksXG4gICAgfSxcbiAgICB2aWV3czoge1xuICAgICAgY3JlYXRlOiBhc3luYyAob3B0aW9uczogQ29kZXhWaWV3Q3JlYXRlT3B0aW9ucykgPT4ge1xuICAgICAgICBhc3NlcnRUd2Vha1ZpZXdQZXJtaXNzaW9uKHR3ZWFrKTtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZU93bFZpZXcoY3R4KCksIG9wdGlvbnMpO1xuICAgICAgfSxcbiAgICB9LFxuICAgIGNkcDoge1xuICAgICAgZ2V0U3RhdHVzOiBhc3luYyAoKSA9PiBnZXRDZHBTdGF0dXMoKSxcbiAgICAgIGxpc3RUYXJnZXRzOiBhc3luYyAoKSA9PiBsaXN0Q2RwVGFyZ2V0cygpLFxuICAgIH0sXG4gICAgbmF0aXZlOiB7XG4gICAgICBsb2FkTW9kdWxlOiBhc3luYyAob3B0aW9uczogTmF0aXZlTW9kdWxlTG9hZE9wdGlvbnMpID0+IHtcbiAgICAgICAgYXNzZXJ0VHdlYWtQZXJtaXNzaW9uKHR3ZWFrLCBcIm5hdGl2ZS1tb2R1bGVcIik7XG4gICAgICAgIHJldHVybiBuYXRpdmVCcmlkZ2UubG9hZE1vZHVsZShjdHgoKSwgb3B0aW9ucyk7XG4gICAgICB9LFxuICAgICAgY3JlYXRlUGFuZWw6IGFzeW5jIChvcHRpb25zOiBOYXRpdmVQYW5lbENyZWF0ZU9wdGlvbnMpID0+IHtcbiAgICAgICAgYXNzZXJ0VHdlYWtQZXJtaXNzaW9uKHR3ZWFrLCBcIm5hdGl2ZS12aWV3XCIpO1xuICAgICAgICByZXR1cm4gbmF0aXZlQnJpZGdlLmNyZWF0ZVBhbmVsKGN0eCgpLCBvcHRpb25zKTtcbiAgICAgIH0sXG4gICAgICBhdHRhY2hWaWV3OiBhc3luYyAob3B0aW9uczogTmF0aXZlVmlld0F0dGFjaE9wdGlvbnMpID0+IHtcbiAgICAgICAgYXNzZXJ0VHdlYWtQZXJtaXNzaW9uKHR3ZWFrLCBcIm5hdGl2ZS12aWV3XCIpO1xuICAgICAgICByZXR1cm4gbmF0aXZlQnJpZGdlLmF0dGFjaFZpZXcoY3R4KCksIG9wdGlvbnMpO1xuICAgICAgfSxcbiAgICAgIGxhdW5jaEhlbHBlcjogYXN5bmMgKG9wdGlvbnM6IE5hdGl2ZUhlbHBlckxhdW5jaE9wdGlvbnMpID0+IHtcbiAgICAgICAgYXNzZXJ0VHdlYWtQZXJtaXNzaW9uKHR3ZWFrLCBcIm5hdGl2ZS1oZWxwZXJcIik7XG4gICAgICAgIHJldHVybiBuYXRpdmVCcmlkZ2UubGF1bmNoSGVscGVyKGN0eCgpLCBvcHRpb25zKTtcbiAgICAgIH0sXG4gICAgfSxcbiAgICBjcmVhdGVCcm93c2VyVmlldzogY3JlYXRlQ29kZXhCcm93c2VyVmlldyxcbiAgICBjcmVhdGVXaW5kb3c6IGNyZWF0ZUNvZGV4V2luZG93LFxuICB9O1xufVxuXG5mdW5jdGlvbiBtYWtlV2luZG93TGlrZUZvclZpZXcodmlldzogRWxlY3Ryb24uQnJvd3NlclZpZXcpOiBDb2RleFdpbmRvd0xpa2Uge1xuICBjb25zdCB2aWV3Qm91bmRzID0gKCkgPT4gdmlldy5nZXRCb3VuZHMoKTtcbiAgcmV0dXJuIHtcbiAgICBpZDogdmlldy53ZWJDb250ZW50cy5pZCxcbiAgICB3ZWJDb250ZW50czogdmlldy53ZWJDb250ZW50cyxcbiAgICBvbjogKGV2ZW50OiBcImNsb3NlZFwiLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCkgPT4ge1xuICAgICAgaWYgKGV2ZW50ID09PSBcImNsb3NlZFwiKSB7XG4gICAgICAgIHZpZXcud2ViQ29udGVudHMub25jZShcImRlc3Ryb3llZFwiLCBsaXN0ZW5lcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2aWV3LndlYkNvbnRlbnRzLm9uKGV2ZW50LCBsaXN0ZW5lcik7XG4gICAgICB9XG4gICAgICByZXR1cm4gdmlldztcbiAgICB9LFxuICAgIG9uY2U6IChldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCkgPT4ge1xuICAgICAgdmlldy53ZWJDb250ZW50cy5vbmNlKGV2ZW50IGFzIFwiZGVzdHJveWVkXCIsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB2aWV3O1xuICAgIH0sXG4gICAgb2ZmOiAoZXZlbnQ6IHN0cmluZywgbGlzdGVuZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpID0+IHtcbiAgICAgIHZpZXcud2ViQ29udGVudHMub2ZmKGV2ZW50IGFzIFwiZGVzdHJveWVkXCIsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB2aWV3O1xuICAgIH0sXG4gICAgcmVtb3ZlTGlzdGVuZXI6IChldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCkgPT4ge1xuICAgICAgdmlldy53ZWJDb250ZW50cy5yZW1vdmVMaXN0ZW5lcihldmVudCBhcyBcImRlc3Ryb3llZFwiLCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gdmlldztcbiAgICB9LFxuICAgIGlzRGVzdHJveWVkOiAoKSA9PiB2aWV3LndlYkNvbnRlbnRzLmlzRGVzdHJveWVkKCksXG4gICAgaXNGb2N1c2VkOiAoKSA9PiB2aWV3LndlYkNvbnRlbnRzLmlzRm9jdXNlZCgpLFxuICAgIGZvY3VzOiAoKSA9PiB2aWV3LndlYkNvbnRlbnRzLmZvY3VzKCksXG4gICAgc2hvdzogKCkgPT4ge30sXG4gICAgaGlkZTogKCkgPT4ge30sXG4gICAgZ2V0Qm91bmRzOiB2aWV3Qm91bmRzLFxuICAgIGdldENvbnRlbnRCb3VuZHM6IHZpZXdCb3VuZHMsXG4gICAgZ2V0U2l6ZTogKCkgPT4ge1xuICAgICAgY29uc3QgYiA9IHZpZXdCb3VuZHMoKTtcbiAgICAgIHJldHVybiBbYi53aWR0aCwgYi5oZWlnaHRdO1xuICAgIH0sXG4gICAgZ2V0Q29udGVudFNpemU6ICgpID0+IHtcbiAgICAgIGNvbnN0IGIgPSB2aWV3Qm91bmRzKCk7XG4gICAgICByZXR1cm4gW2Iud2lkdGgsIGIuaGVpZ2h0XTtcbiAgICB9LFxuICAgIHNldFRpdGxlOiAoKSA9PiB7fSxcbiAgICBnZXRUaXRsZTogKCkgPT4gXCJcIixcbiAgICBzZXRSZXByZXNlbnRlZEZpbGVuYW1lOiAoKSA9PiB7fSxcbiAgICBzZXREb2N1bWVudEVkaXRlZDogKCkgPT4ge30sXG4gICAgc2V0V2luZG93QnV0dG9uVmlzaWJpbGl0eTogKCkgPT4ge30sXG4gIH07XG59XG5cbmZ1bmN0aW9uIGNvZGV4QXBwVXJsKHJvdXRlOiBzdHJpbmcsIGhvc3RJZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgdXJsID0gbmV3IFVSTChcImFwcDovLy0vaW5kZXguaHRtbFwiKTtcbiAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoXCJob3N0SWRcIiwgaG9zdElkKTtcbiAgaWYgKHJvdXRlICE9PSBcIi9cIikgdXJsLnNlYXJjaFBhcmFtcy5zZXQoXCJpbml0aWFsUm91dGVcIiwgcm91dGUpO1xuICByZXR1cm4gdXJsLnRvU3RyaW5nKCk7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZU93bFZpZXdVcmwodXJsOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAodHlwZW9mIHVybCAhPT0gXCJzdHJpbmdcIiB8fCB1cmwuaW5jbHVkZXMoXCJcXG5cIikgfHwgdXJsLmluY2x1ZGVzKFwiXFxyXCIpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiT3dsIHZpZXcgVVJMIG11c3QgYmUgYSBzdHJpbmcgd2l0aG91dCBjb250cm9sIGNoYXJhY3RlcnNcIik7XG4gIH1cbiAgY29uc3QgcGFyc2VkID0gbmV3IFVSTCh1cmwpO1xuICBpZiAoIVtcImh0dHA6XCIsIFwiaHR0cHM6XCIsIFwiYXBwOlwiLCBcImZpbGU6XCIsIFwiZGF0YTpcIiwgXCJhYm91dDpcIl0uaW5jbHVkZXMocGFyc2VkLnByb3RvY29sKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgdW5zdXBwb3J0ZWQgT3dsIHZpZXcgVVJMIHByb3RvY29sOiAke3BhcnNlZC5wcm90b2NvbH1gKTtcbiAgfVxuICByZXR1cm4gcGFyc2VkLnRvU3RyaW5nKCk7XG59XG5cbmZ1bmN0aW9uIGdldENvZGV4V2luZG93U2VydmljZXMoKTogQ29kZXhXaW5kb3dTZXJ2aWNlcyB8IG51bGwge1xuICBjb25zdCBzZXJ2aWNlcyA9IChnbG9iYWxUaGlzIGFzIHVua25vd24gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pW0NPREVYX1dJTkRPV19TRVJWSUNFU19LRVldO1xuICByZXR1cm4gc2VydmljZXMgJiYgdHlwZW9mIHNlcnZpY2VzID09PSBcIm9iamVjdFwiID8gKHNlcnZpY2VzIGFzIENvZGV4V2luZG93U2VydmljZXMpIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplQ29kZXhSb3V0ZShyb3V0ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKHR5cGVvZiByb3V0ZSAhPT0gXCJzdHJpbmdcIiB8fCAhcm91dGUuc3RhcnRzV2l0aChcIi9cIikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb2RleCByb3V0ZSBtdXN0IGJlIGFuIGFic29sdXRlIGFwcCByb3V0ZVwiKTtcbiAgfVxuICBpZiAocm91dGUuaW5jbHVkZXMoXCI6Ly9cIikgfHwgcm91dGUuaW5jbHVkZXMoXCJcXG5cIikgfHwgcm91dGUuaW5jbHVkZXMoXCJcXHJcIikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb2RleCByb3V0ZSBtdXN0IG5vdCBpbmNsdWRlIGEgcHJvdG9jb2wgb3IgY29udHJvbCBjaGFyYWN0ZXJzXCIpO1xuICB9XG4gIHJldHVybiByb3V0ZTtcbn1cblxuZnVuY3Rpb24gYXNSZWNvcmQodmFsdWU6IHVua25vd24pOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IG51bGwge1xuICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiID8gdmFsdWUgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gOiBudWxsO1xufVxuXG5mdW5jdGlvbiBjYWxsT2JqZWN0TWV0aG9kKHRhcmdldDogdW5rbm93biwgbWV0aG9kOiBzdHJpbmcsIGFyZ3M6IHVua25vd25bXSk6IHVua25vd24ge1xuICBjb25zdCBmbiA9IGFzUmVjb3JkKHRhcmdldCk/LlttZXRob2RdO1xuICBpZiAodHlwZW9mIGZuICE9PSBcImZ1bmN0aW9uXCIpIHJldHVybiB1bmRlZmluZWQ7XG4gIHJldHVybiBmbi5hcHBseSh0YXJnZXQsIGFyZ3MpO1xufVxuXG5mdW5jdGlvbiBpc1dpbmRvd0Rlc3Ryb3llZCh3aW46IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsIHwgdW5kZWZpbmVkKTogYm9vbGVhbiB7XG4gIGlmICghd2luKSByZXR1cm4gdHJ1ZTtcbiAgY29uc3QgZm4gPSBhc1JlY29yZCh3aW4pPy5pc0Rlc3Ryb3llZDtcbiAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm4gZmFsc2U7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEJvb2xlYW4oZm4uY2FsbCh3aW4pKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cblxuZnVuY3Rpb24gd2luZG93SWRGb3Iod2luOiBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbCB8IHVuZGVmaW5lZCk6IG51bWJlciB8IG51bGwge1xuICBjb25zdCBpZCA9IGFzUmVjb3JkKHdpbik/LmlkO1xuICByZXR1cm4gdHlwZW9mIGlkID09PSBcIm51bWJlclwiID8gaWQgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBiaW5kV2luZG93RXZlbnQoXG4gIHdpbjogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyxcbiAgdmlldzogTWFuYWdlZE93bFZpZXcsXG4gIGV2ZW50OiBzdHJpbmcsXG4gIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLFxuKTogdm9pZCB7XG4gIGNvbnN0IG9uID0gYXNSZWNvcmQod2luKT8ub247XG4gIGNvbnN0IG9mZiA9IGFzUmVjb3JkKHdpbik/Lm9mZjtcbiAgaWYgKHR5cGVvZiBvbiAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm47XG4gIG9uLmNhbGwod2luLCBldmVudCwgbGlzdGVuZXIpO1xuICB2aWV3LmRpc3Bvc2VCaW5kaW5ncy5wdXNoKCgpID0+IHtcbiAgICBpZiAodHlwZW9mIG9mZiA9PT0gXCJmdW5jdGlvblwiKSBvZmYuY2FsbCh3aW4sIGV2ZW50LCBsaXN0ZW5lcik7XG4gICAgZWxzZSBjYWxsT2JqZWN0TWV0aG9kKHdpbiwgXCJyZW1vdmVMaXN0ZW5lclwiLCBbZXZlbnQsIGxpc3RlbmVyXSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBhc3NlcnRCcmlkZ2VJZCh2YWx1ZTogc3RyaW5nLCBsYWJlbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIiB8fCAhL15bYS16QS1aMC05Ll8tXSskLy50ZXN0KHZhbHVlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgJHtsYWJlbH0gbWF5IG9ubHkgY29udGFpbiBsZXR0ZXJzLCBudW1iZXJzLCBkb3RzLCB1bmRlcnNjb3JlcywgYW5kIGRhc2hlc2ApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gYXNzZXJ0Qm91bmRzKGJvdW5kczogRWxlY3Ryb24uUmVjdGFuZ2xlKTogdm9pZCB7XG4gIGNvbnN0IHZhbHVlcyA9IFtib3VuZHM/LngsIGJvdW5kcz8ueSwgYm91bmRzPy53aWR0aCwgYm91bmRzPy5oZWlnaHRdO1xuICBpZiAoIXZhbHVlcy5ldmVyeSgodmFsdWUpID0+IHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIiAmJiBOdW1iZXIuaXNGaW5pdGUodmFsdWUpKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcImJvdW5kcyBtdXN0IGNvbnRhaW4gZmluaXRlIHgsIHksIHdpZHRoLCBhbmQgaGVpZ2h0IG51bWJlcnNcIik7XG4gIH1cbiAgaWYgKGJvdW5kcy53aWR0aCA8IDAgfHwgYm91bmRzLmhlaWdodCA8IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJib3VuZHMgd2lkdGggYW5kIGhlaWdodCBtdXN0IGJlIG5vbi1uZWdhdGl2ZVwiKTtcbiAgfVxufVxuXG4vLyBUb3VjaCBCcm93c2VyV2luZG93IHRvIGtlZXAgaXRzIGltcG9ydCBcdTIwMTQgb2xkZXIgRWxlY3Ryb24gbGludCBydWxlcy5cbnZvaWQgQnJvd3NlcldpbmRvdztcbiIsICIvKiEgY2hva2lkYXIgLSBNSVQgTGljZW5zZSAoYykgMjAxMiBQYXVsIE1pbGxlciAocGF1bG1pbGxyLmNvbSkgKi9cbmltcG9ydCB7IHN0YXQgYXMgc3RhdGNiIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgc3RhdCwgcmVhZGRpciB9IGZyb20gJ2ZzL3Byb21pc2VzJztcbmltcG9ydCB7IEV2ZW50RW1pdHRlciB9IGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQgKiBhcyBzeXNQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgcmVhZGRpcnAgfSBmcm9tICdyZWFkZGlycCc7XG5pbXBvcnQgeyBOb2RlRnNIYW5kbGVyLCBFVkVOVFMgYXMgRVYsIGlzV2luZG93cywgaXNJQk1pLCBFTVBUWV9GTiwgU1RSX0NMT1NFLCBTVFJfRU5ELCB9IGZyb20gJy4vaGFuZGxlci5qcyc7XG5jb25zdCBTTEFTSCA9ICcvJztcbmNvbnN0IFNMQVNIX1NMQVNIID0gJy8vJztcbmNvbnN0IE9ORV9ET1QgPSAnLic7XG5jb25zdCBUV09fRE9UUyA9ICcuLic7XG5jb25zdCBTVFJJTkdfVFlQRSA9ICdzdHJpbmcnO1xuY29uc3QgQkFDS19TTEFTSF9SRSA9IC9cXFxcL2c7XG5jb25zdCBET1VCTEVfU0xBU0hfUkUgPSAvXFwvXFwvLztcbmNvbnN0IERPVF9SRSA9IC9cXC4uKlxcLihzd1tweF0pJHx+JHxcXC5zdWJsLipcXC50bXAvO1xuY29uc3QgUkVQTEFDRVJfUkUgPSAvXlxcLlsvXFxcXF0vO1xuZnVuY3Rpb24gYXJyaWZ5KGl0ZW0pIHtcbiAgICByZXR1cm4gQXJyYXkuaXNBcnJheShpdGVtKSA/IGl0ZW0gOiBbaXRlbV07XG59XG5jb25zdCBpc01hdGNoZXJPYmplY3QgPSAobWF0Y2hlcikgPT4gdHlwZW9mIG1hdGNoZXIgPT09ICdvYmplY3QnICYmIG1hdGNoZXIgIT09IG51bGwgJiYgIShtYXRjaGVyIGluc3RhbmNlb2YgUmVnRXhwKTtcbmZ1bmN0aW9uIGNyZWF0ZVBhdHRlcm4obWF0Y2hlcikge1xuICAgIGlmICh0eXBlb2YgbWF0Y2hlciA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgcmV0dXJuIG1hdGNoZXI7XG4gICAgaWYgKHR5cGVvZiBtYXRjaGVyID09PSAnc3RyaW5nJylcbiAgICAgICAgcmV0dXJuIChzdHJpbmcpID0+IG1hdGNoZXIgPT09IHN0cmluZztcbiAgICBpZiAobWF0Y2hlciBpbnN0YW5jZW9mIFJlZ0V4cClcbiAgICAgICAgcmV0dXJuIChzdHJpbmcpID0+IG1hdGNoZXIudGVzdChzdHJpbmcpO1xuICAgIGlmICh0eXBlb2YgbWF0Y2hlciA9PT0gJ29iamVjdCcgJiYgbWF0Y2hlciAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gKHN0cmluZykgPT4ge1xuICAgICAgICAgICAgaWYgKG1hdGNoZXIucGF0aCA9PT0gc3RyaW5nKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgaWYgKG1hdGNoZXIucmVjdXJzaXZlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVsYXRpdmUgPSBzeXNQYXRoLnJlbGF0aXZlKG1hdGNoZXIucGF0aCwgc3RyaW5nKTtcbiAgICAgICAgICAgICAgICBpZiAoIXJlbGF0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuICFyZWxhdGl2ZS5zdGFydHNXaXRoKCcuLicpICYmICFzeXNQYXRoLmlzQWJzb2x1dGUocmVsYXRpdmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gKCkgPT4gZmFsc2U7XG59XG5mdW5jdGlvbiBub3JtYWxpemVQYXRoKHBhdGgpIHtcbiAgICBpZiAodHlwZW9mIHBhdGggIT09ICdzdHJpbmcnKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3N0cmluZyBleHBlY3RlZCcpO1xuICAgIHBhdGggPSBzeXNQYXRoLm5vcm1hbGl6ZShwYXRoKTtcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgbGV0IHByZXBlbmQgPSBmYWxzZTtcbiAgICBpZiAocGF0aC5zdGFydHNXaXRoKCcvLycpKVxuICAgICAgICBwcmVwZW5kID0gdHJ1ZTtcbiAgICBjb25zdCBET1VCTEVfU0xBU0hfUkUgPSAvXFwvXFwvLztcbiAgICB3aGlsZSAocGF0aC5tYXRjaChET1VCTEVfU0xBU0hfUkUpKVxuICAgICAgICBwYXRoID0gcGF0aC5yZXBsYWNlKERPVUJMRV9TTEFTSF9SRSwgJy8nKTtcbiAgICBpZiAocHJlcGVuZClcbiAgICAgICAgcGF0aCA9ICcvJyArIHBhdGg7XG4gICAgcmV0dXJuIHBhdGg7XG59XG5mdW5jdGlvbiBtYXRjaFBhdHRlcm5zKHBhdHRlcm5zLCB0ZXN0U3RyaW5nLCBzdGF0cykge1xuICAgIGNvbnN0IHBhdGggPSBub3JtYWxpemVQYXRoKHRlc3RTdHJpbmcpO1xuICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBwYXR0ZXJucy5sZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgY29uc3QgcGF0dGVybiA9IHBhdHRlcm5zW2luZGV4XTtcbiAgICAgICAgaWYgKHBhdHRlcm4ocGF0aCwgc3RhdHMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5mdW5jdGlvbiBhbnltYXRjaChtYXRjaGVycywgdGVzdFN0cmluZykge1xuICAgIGlmIChtYXRjaGVycyA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2FueW1hdGNoOiBzcGVjaWZ5IGZpcnN0IGFyZ3VtZW50Jyk7XG4gICAgfVxuICAgIC8vIEVhcmx5IGNhY2hlIGZvciBtYXRjaGVycy5cbiAgICBjb25zdCBtYXRjaGVyc0FycmF5ID0gYXJyaWZ5KG1hdGNoZXJzKTtcbiAgICBjb25zdCBwYXR0ZXJucyA9IG1hdGNoZXJzQXJyYXkubWFwKChtYXRjaGVyKSA9PiBjcmVhdGVQYXR0ZXJuKG1hdGNoZXIpKTtcbiAgICBpZiAodGVzdFN0cmluZyA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiAodGVzdFN0cmluZywgc3RhdHMpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaFBhdHRlcm5zKHBhdHRlcm5zLCB0ZXN0U3RyaW5nLCBzdGF0cyk7XG4gICAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBtYXRjaFBhdHRlcm5zKHBhdHRlcm5zLCB0ZXN0U3RyaW5nKTtcbn1cbmNvbnN0IHVuaWZ5UGF0aHMgPSAocGF0aHNfKSA9PiB7XG4gICAgY29uc3QgcGF0aHMgPSBhcnJpZnkocGF0aHNfKS5mbGF0KCk7XG4gICAgaWYgKCFwYXRocy5ldmVyeSgocCkgPT4gdHlwZW9mIHAgPT09IFNUUklOR19UWVBFKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBOb24tc3RyaW5nIHByb3ZpZGVkIGFzIHdhdGNoIHBhdGg6ICR7cGF0aHN9YCk7XG4gICAgfVxuICAgIHJldHVybiBwYXRocy5tYXAobm9ybWFsaXplUGF0aFRvVW5peCk7XG59O1xuLy8gSWYgU0xBU0hfU0xBU0ggb2NjdXJzIGF0IHRoZSBiZWdpbm5pbmcgb2YgcGF0aCwgaXQgaXMgbm90IHJlcGxhY2VkXG4vLyAgICAgYmVjYXVzZSBcIi8vU3RvcmFnZVBDL0RyaXZlUG9vbC9Nb3ZpZXNcIiBpcyBhIHZhbGlkIG5ldHdvcmsgcGF0aFxuY29uc3QgdG9Vbml4ID0gKHN0cmluZykgPT4ge1xuICAgIGxldCBzdHIgPSBzdHJpbmcucmVwbGFjZShCQUNLX1NMQVNIX1JFLCBTTEFTSCk7XG4gICAgbGV0IHByZXBlbmQgPSBmYWxzZTtcbiAgICBpZiAoc3RyLnN0YXJ0c1dpdGgoU0xBU0hfU0xBU0gpKSB7XG4gICAgICAgIHByZXBlbmQgPSB0cnVlO1xuICAgIH1cbiAgICB3aGlsZSAoc3RyLm1hdGNoKERPVUJMRV9TTEFTSF9SRSkpIHtcbiAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UoRE9VQkxFX1NMQVNIX1JFLCBTTEFTSCk7XG4gICAgfVxuICAgIGlmIChwcmVwZW5kKSB7XG4gICAgICAgIHN0ciA9IFNMQVNIICsgc3RyO1xuICAgIH1cbiAgICByZXR1cm4gc3RyO1xufTtcbi8vIE91ciB2ZXJzaW9uIG9mIHVwYXRoLm5vcm1hbGl6ZVxuLy8gVE9ETzogdGhpcyBpcyBub3QgZXF1YWwgdG8gcGF0aC1ub3JtYWxpemUgbW9kdWxlIC0gaW52ZXN0aWdhdGUgd2h5XG5jb25zdCBub3JtYWxpemVQYXRoVG9Vbml4ID0gKHBhdGgpID0+IHRvVW5peChzeXNQYXRoLm5vcm1hbGl6ZSh0b1VuaXgocGF0aCkpKTtcbi8vIFRPRE86IHJlZmFjdG9yXG5jb25zdCBub3JtYWxpemVJZ25vcmVkID0gKGN3ZCA9ICcnKSA9PiAocGF0aCkgPT4ge1xuICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZVBhdGhUb1VuaXgoc3lzUGF0aC5pc0Fic29sdXRlKHBhdGgpID8gcGF0aCA6IHN5c1BhdGguam9pbihjd2QsIHBhdGgpKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiBwYXRoO1xuICAgIH1cbn07XG5jb25zdCBnZXRBYnNvbHV0ZVBhdGggPSAocGF0aCwgY3dkKSA9PiB7XG4gICAgaWYgKHN5c1BhdGguaXNBYnNvbHV0ZShwYXRoKSkge1xuICAgICAgICByZXR1cm4gcGF0aDtcbiAgICB9XG4gICAgcmV0dXJuIHN5c1BhdGguam9pbihjd2QsIHBhdGgpO1xufTtcbmNvbnN0IEVNUFRZX1NFVCA9IE9iamVjdC5mcmVlemUobmV3IFNldCgpKTtcbi8qKlxuICogRGlyZWN0b3J5IGVudHJ5LlxuICovXG5jbGFzcyBEaXJFbnRyeSB7XG4gICAgY29uc3RydWN0b3IoZGlyLCByZW1vdmVXYXRjaGVyKSB7XG4gICAgICAgIHRoaXMucGF0aCA9IGRpcjtcbiAgICAgICAgdGhpcy5fcmVtb3ZlV2F0Y2hlciA9IHJlbW92ZVdhdGNoZXI7XG4gICAgICAgIHRoaXMuaXRlbXMgPSBuZXcgU2V0KCk7XG4gICAgfVxuICAgIGFkZChpdGVtKSB7XG4gICAgICAgIGNvbnN0IHsgaXRlbXMgfSA9IHRoaXM7XG4gICAgICAgIGlmICghaXRlbXMpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGlmIChpdGVtICE9PSBPTkVfRE9UICYmIGl0ZW0gIT09IFRXT19ET1RTKVxuICAgICAgICAgICAgaXRlbXMuYWRkKGl0ZW0pO1xuICAgIH1cbiAgICBhc3luYyByZW1vdmUoaXRlbSkge1xuICAgICAgICBjb25zdCB7IGl0ZW1zIH0gPSB0aGlzO1xuICAgICAgICBpZiAoIWl0ZW1zKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpdGVtcy5kZWxldGUoaXRlbSk7XG4gICAgICAgIGlmIChpdGVtcy5zaXplID4gMClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY29uc3QgZGlyID0gdGhpcy5wYXRoO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgcmVhZGRpcihkaXIpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9yZW1vdmVXYXRjaGVyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVtb3ZlV2F0Y2hlcihzeXNQYXRoLmRpcm5hbWUoZGlyKSwgc3lzUGF0aC5iYXNlbmFtZShkaXIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBoYXMoaXRlbSkge1xuICAgICAgICBjb25zdCB7IGl0ZW1zIH0gPSB0aGlzO1xuICAgICAgICBpZiAoIWl0ZW1zKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICByZXR1cm4gaXRlbXMuaGFzKGl0ZW0pO1xuICAgIH1cbiAgICBnZXRDaGlsZHJlbigpIHtcbiAgICAgICAgY29uc3QgeyBpdGVtcyB9ID0gdGhpcztcbiAgICAgICAgaWYgKCFpdGVtcylcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgcmV0dXJuIFsuLi5pdGVtcy52YWx1ZXMoKV07XG4gICAgfVxuICAgIGRpc3Bvc2UoKSB7XG4gICAgICAgIHRoaXMuaXRlbXMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5wYXRoID0gJyc7XG4gICAgICAgIHRoaXMuX3JlbW92ZVdhdGNoZXIgPSBFTVBUWV9GTjtcbiAgICAgICAgdGhpcy5pdGVtcyA9IEVNUFRZX1NFVDtcbiAgICAgICAgT2JqZWN0LmZyZWV6ZSh0aGlzKTtcbiAgICB9XG59XG5jb25zdCBTVEFUX01FVEhPRF9GID0gJ3N0YXQnO1xuY29uc3QgU1RBVF9NRVRIT0RfTCA9ICdsc3RhdCc7XG5leHBvcnQgY2xhc3MgV2F0Y2hIZWxwZXIge1xuICAgIGNvbnN0cnVjdG9yKHBhdGgsIGZvbGxvdywgZnN3KSB7XG4gICAgICAgIHRoaXMuZnN3ID0gZnN3O1xuICAgICAgICBjb25zdCB3YXRjaFBhdGggPSBwYXRoO1xuICAgICAgICB0aGlzLnBhdGggPSBwYXRoID0gcGF0aC5yZXBsYWNlKFJFUExBQ0VSX1JFLCAnJyk7XG4gICAgICAgIHRoaXMud2F0Y2hQYXRoID0gd2F0Y2hQYXRoO1xuICAgICAgICB0aGlzLmZ1bGxXYXRjaFBhdGggPSBzeXNQYXRoLnJlc29sdmUod2F0Y2hQYXRoKTtcbiAgICAgICAgdGhpcy5kaXJQYXJ0cyA9IFtdO1xuICAgICAgICB0aGlzLmRpclBhcnRzLmZvckVhY2goKHBhcnRzKSA9PiB7XG4gICAgICAgICAgICBpZiAocGFydHMubGVuZ3RoID4gMSlcbiAgICAgICAgICAgICAgICBwYXJ0cy5wb3AoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZm9sbG93U3ltbGlua3MgPSBmb2xsb3c7XG4gICAgICAgIHRoaXMuc3RhdE1ldGhvZCA9IGZvbGxvdyA/IFNUQVRfTUVUSE9EX0YgOiBTVEFUX01FVEhPRF9MO1xuICAgIH1cbiAgICBlbnRyeVBhdGgoZW50cnkpIHtcbiAgICAgICAgcmV0dXJuIHN5c1BhdGguam9pbih0aGlzLndhdGNoUGF0aCwgc3lzUGF0aC5yZWxhdGl2ZSh0aGlzLndhdGNoUGF0aCwgZW50cnkuZnVsbFBhdGgpKTtcbiAgICB9XG4gICAgZmlsdGVyUGF0aChlbnRyeSkge1xuICAgICAgICBjb25zdCB7IHN0YXRzIH0gPSBlbnRyeTtcbiAgICAgICAgaWYgKHN0YXRzICYmIHN0YXRzLmlzU3ltYm9saWNMaW5rKCkpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5maWx0ZXJEaXIoZW50cnkpO1xuICAgICAgICBjb25zdCByZXNvbHZlZFBhdGggPSB0aGlzLmVudHJ5UGF0aChlbnRyeSk7XG4gICAgICAgIC8vIFRPRE86IHdoYXQgaWYgc3RhdHMgaXMgdW5kZWZpbmVkPyByZW1vdmUgIVxuICAgICAgICByZXR1cm4gdGhpcy5mc3cuX2lzbnRJZ25vcmVkKHJlc29sdmVkUGF0aCwgc3RhdHMpICYmIHRoaXMuZnN3Ll9oYXNSZWFkUGVybWlzc2lvbnMoc3RhdHMpO1xuICAgIH1cbiAgICBmaWx0ZXJEaXIoZW50cnkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZnN3Ll9pc250SWdub3JlZCh0aGlzLmVudHJ5UGF0aChlbnRyeSksIGVudHJ5LnN0YXRzKTtcbiAgICB9XG59XG4vKipcbiAqIFdhdGNoZXMgZmlsZXMgJiBkaXJlY3RvcmllcyBmb3IgY2hhbmdlcy4gRW1pdHRlZCBldmVudHM6XG4gKiBgYWRkYCwgYGFkZERpcmAsIGBjaGFuZ2VgLCBgdW5saW5rYCwgYHVubGlua0RpcmAsIGBhbGxgLCBgZXJyb3JgXG4gKlxuICogICAgIG5ldyBGU1dhdGNoZXIoKVxuICogICAgICAgLmFkZChkaXJlY3RvcmllcylcbiAqICAgICAgIC5vbignYWRkJywgcGF0aCA9PiBsb2coJ0ZpbGUnLCBwYXRoLCAnd2FzIGFkZGVkJykpXG4gKi9cbmV4cG9ydCBjbGFzcyBGU1dhdGNoZXIgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICAgIC8vIE5vdCBpbmRlbnRpbmcgbWV0aG9kcyBmb3IgaGlzdG9yeSBzYWtlOyBmb3Igbm93LlxuICAgIGNvbnN0cnVjdG9yKF9vcHRzID0ge30pIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5jbG9zZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fY2xvc2VycyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5faWdub3JlZFBhdGhzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLl90aHJvdHRsZWQgPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXMuX3N0cmVhbXMgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuX3N5bWxpbmtQYXRocyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5fd2F0Y2hlZCA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5fcGVuZGluZ1dyaXRlcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5fcGVuZGluZ1VubGlua3MgPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXMuX3JlYWR5Q291bnQgPSAwO1xuICAgICAgICB0aGlzLl9yZWFkeUVtaXR0ZWQgPSBmYWxzZTtcbiAgICAgICAgY29uc3QgYXdmID0gX29wdHMuYXdhaXRXcml0ZUZpbmlzaDtcbiAgICAgICAgY29uc3QgREVGX0FXRiA9IHsgc3RhYmlsaXR5VGhyZXNob2xkOiAyMDAwLCBwb2xsSW50ZXJ2YWw6IDEwMCB9O1xuICAgICAgICBjb25zdCBvcHRzID0ge1xuICAgICAgICAgICAgLy8gRGVmYXVsdHNcbiAgICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICAgICAgICBpZ25vcmVJbml0aWFsOiBmYWxzZSxcbiAgICAgICAgICAgIGlnbm9yZVBlcm1pc3Npb25FcnJvcnM6IGZhbHNlLFxuICAgICAgICAgICAgaW50ZXJ2YWw6IDEwMCxcbiAgICAgICAgICAgIGJpbmFyeUludGVydmFsOiAzMDAsXG4gICAgICAgICAgICBmb2xsb3dTeW1saW5rczogdHJ1ZSxcbiAgICAgICAgICAgIHVzZVBvbGxpbmc6IGZhbHNlLFxuICAgICAgICAgICAgLy8gdXNlQXN5bmM6IGZhbHNlLFxuICAgICAgICAgICAgYXRvbWljOiB0cnVlLCAvLyBOT1RFOiBvdmVyd3JpdHRlbiBsYXRlciAoZGVwZW5kcyBvbiB1c2VQb2xsaW5nKVxuICAgICAgICAgICAgLi4uX29wdHMsXG4gICAgICAgICAgICAvLyBDaGFuZ2UgZm9ybWF0XG4gICAgICAgICAgICBpZ25vcmVkOiBfb3B0cy5pZ25vcmVkID8gYXJyaWZ5KF9vcHRzLmlnbm9yZWQpIDogYXJyaWZ5KFtdKSxcbiAgICAgICAgICAgIGF3YWl0V3JpdGVGaW5pc2g6IGF3ZiA9PT0gdHJ1ZSA/IERFRl9BV0YgOiB0eXBlb2YgYXdmID09PSAnb2JqZWN0JyA/IHsgLi4uREVGX0FXRiwgLi4uYXdmIH0gOiBmYWxzZSxcbiAgICAgICAgfTtcbiAgICAgICAgLy8gQWx3YXlzIGRlZmF1bHQgdG8gcG9sbGluZyBvbiBJQk0gaSBiZWNhdXNlIGZzLndhdGNoKCkgaXMgbm90IGF2YWlsYWJsZSBvbiBJQk0gaS5cbiAgICAgICAgaWYgKGlzSUJNaSlcbiAgICAgICAgICAgIG9wdHMudXNlUG9sbGluZyA9IHRydWU7XG4gICAgICAgIC8vIEVkaXRvciBhdG9taWMgd3JpdGUgbm9ybWFsaXphdGlvbiBlbmFibGVkIGJ5IGRlZmF1bHQgd2l0aCBmcy53YXRjaFxuICAgICAgICBpZiAob3B0cy5hdG9taWMgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIG9wdHMuYXRvbWljID0gIW9wdHMudXNlUG9sbGluZztcbiAgICAgICAgLy8gb3B0cy5hdG9taWMgPSB0eXBlb2YgX29wdHMuYXRvbWljID09PSAnbnVtYmVyJyA/IF9vcHRzLmF0b21pYyA6IDEwMDtcbiAgICAgICAgLy8gR2xvYmFsIG92ZXJyaWRlLiBVc2VmdWwgZm9yIGRldmVsb3BlcnMsIHdobyBuZWVkIHRvIGZvcmNlIHBvbGxpbmcgZm9yIGFsbFxuICAgICAgICAvLyBpbnN0YW5jZXMgb2YgY2hva2lkYXIsIHJlZ2FyZGxlc3Mgb2YgdXNhZ2UgLyBkZXBlbmRlbmN5IGRlcHRoXG4gICAgICAgIGNvbnN0IGVudlBvbGwgPSBwcm9jZXNzLmVudi5DSE9LSURBUl9VU0VQT0xMSU5HO1xuICAgICAgICBpZiAoZW52UG9sbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zdCBlbnZMb3dlciA9IGVudlBvbGwudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIGlmIChlbnZMb3dlciA9PT0gJ2ZhbHNlJyB8fCBlbnZMb3dlciA9PT0gJzAnKVxuICAgICAgICAgICAgICAgIG9wdHMudXNlUG9sbGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgZWxzZSBpZiAoZW52TG93ZXIgPT09ICd0cnVlJyB8fCBlbnZMb3dlciA9PT0gJzEnKVxuICAgICAgICAgICAgICAgIG9wdHMudXNlUG9sbGluZyA9IHRydWU7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgb3B0cy51c2VQb2xsaW5nID0gISFlbnZMb3dlcjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlbnZJbnRlcnZhbCA9IHByb2Nlc3MuZW52LkNIT0tJREFSX0lOVEVSVkFMO1xuICAgICAgICBpZiAoZW52SW50ZXJ2YWwpXG4gICAgICAgICAgICBvcHRzLmludGVydmFsID0gTnVtYmVyLnBhcnNlSW50KGVudkludGVydmFsLCAxMCk7XG4gICAgICAgIC8vIFRoaXMgaXMgZG9uZSB0byBlbWl0IHJlYWR5IG9ubHkgb25jZSwgYnV0IGVhY2ggJ2FkZCcgd2lsbCBpbmNyZWFzZSB0aGF0P1xuICAgICAgICBsZXQgcmVhZHlDYWxscyA9IDA7XG4gICAgICAgIHRoaXMuX2VtaXRSZWFkeSA9ICgpID0+IHtcbiAgICAgICAgICAgIHJlYWR5Q2FsbHMrKztcbiAgICAgICAgICAgIGlmIChyZWFkeUNhbGxzID49IHRoaXMuX3JlYWR5Q291bnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0UmVhZHkgPSBFTVBUWV9GTjtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZWFkeUVtaXR0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIC8vIHVzZSBwcm9jZXNzLm5leHRUaWNrIHRvIGFsbG93IHRpbWUgZm9yIGxpc3RlbmVyIHRvIGJlIGJvdW5kXG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB0aGlzLmVtaXQoRVYuUkVBRFkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fZW1pdFJhdyA9ICguLi5hcmdzKSA9PiB0aGlzLmVtaXQoRVYuUkFXLCAuLi5hcmdzKTtcbiAgICAgICAgdGhpcy5fYm91bmRSZW1vdmUgPSB0aGlzLl9yZW1vdmUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5vcHRpb25zID0gb3B0cztcbiAgICAgICAgdGhpcy5fbm9kZUZzSGFuZGxlciA9IG5ldyBOb2RlRnNIYW5kbGVyKHRoaXMpO1xuICAgICAgICAvLyBZb3VcdTIwMTlyZSBmcm96ZW4gd2hlbiB5b3VyIGhlYXJ0XHUyMDE5cyBub3Qgb3Blbi5cbiAgICAgICAgT2JqZWN0LmZyZWV6ZShvcHRzKTtcbiAgICB9XG4gICAgX2FkZElnbm9yZWRQYXRoKG1hdGNoZXIpIHtcbiAgICAgICAgaWYgKGlzTWF0Y2hlck9iamVjdChtYXRjaGVyKSkge1xuICAgICAgICAgICAgLy8gcmV0dXJuIGVhcmx5IGlmIHdlIGFscmVhZHkgaGF2ZSBhIGRlZXBseSBlcXVhbCBtYXRjaGVyIG9iamVjdFxuICAgICAgICAgICAgZm9yIChjb25zdCBpZ25vcmVkIG9mIHRoaXMuX2lnbm9yZWRQYXRocykge1xuICAgICAgICAgICAgICAgIGlmIChpc01hdGNoZXJPYmplY3QoaWdub3JlZCkgJiZcbiAgICAgICAgICAgICAgICAgICAgaWdub3JlZC5wYXRoID09PSBtYXRjaGVyLnBhdGggJiZcbiAgICAgICAgICAgICAgICAgICAgaWdub3JlZC5yZWN1cnNpdmUgPT09IG1hdGNoZXIucmVjdXJzaXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5faWdub3JlZFBhdGhzLmFkZChtYXRjaGVyKTtcbiAgICB9XG4gICAgX3JlbW92ZUlnbm9yZWRQYXRoKG1hdGNoZXIpIHtcbiAgICAgICAgdGhpcy5faWdub3JlZFBhdGhzLmRlbGV0ZShtYXRjaGVyKTtcbiAgICAgICAgLy8gbm93IGZpbmQgYW55IG1hdGNoZXIgb2JqZWN0cyB3aXRoIHRoZSBtYXRjaGVyIGFzIHBhdGhcbiAgICAgICAgaWYgKHR5cGVvZiBtYXRjaGVyID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpZ25vcmVkIG9mIHRoaXMuX2lnbm9yZWRQYXRocykge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8gKDQzMDgxaik6IG1ha2UgdGhpcyBtb3JlIGVmZmljaWVudC5cbiAgICAgICAgICAgICAgICAvLyBwcm9iYWJseSBqdXN0IG1ha2UgYSBgdGhpcy5faWdub3JlZERpcmVjdG9yaWVzYCBvciBzb21lXG4gICAgICAgICAgICAgICAgLy8gc3VjaCB0aGluZy5cbiAgICAgICAgICAgICAgICBpZiAoaXNNYXRjaGVyT2JqZWN0KGlnbm9yZWQpICYmIGlnbm9yZWQucGF0aCA9PT0gbWF0Y2hlcikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9pZ25vcmVkUGF0aHMuZGVsZXRlKGlnbm9yZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBQdWJsaWMgbWV0aG9kc1xuICAgIC8qKlxuICAgICAqIEFkZHMgcGF0aHMgdG8gYmUgd2F0Y2hlZCBvbiBhbiBleGlzdGluZyBGU1dhdGNoZXIgaW5zdGFuY2UuXG4gICAgICogQHBhcmFtIHBhdGhzXyBmaWxlIG9yIGZpbGUgbGlzdC4gT3RoZXIgYXJndW1lbnRzIGFyZSB1bnVzZWRcbiAgICAgKi9cbiAgICBhZGQocGF0aHNfLCBfb3JpZ0FkZCwgX2ludGVybmFsKSB7XG4gICAgICAgIGNvbnN0IHsgY3dkIH0gPSB0aGlzLm9wdGlvbnM7XG4gICAgICAgIHRoaXMuY2xvc2VkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2Nsb3NlUHJvbWlzZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgbGV0IHBhdGhzID0gdW5pZnlQYXRocyhwYXRoc18pO1xuICAgICAgICBpZiAoY3dkKSB7XG4gICAgICAgICAgICBwYXRocyA9IHBhdGhzLm1hcCgocGF0aCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFic1BhdGggPSBnZXRBYnNvbHV0ZVBhdGgocGF0aCwgY3dkKTtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBgcGF0aGAgaW5zdGVhZCBvZiBgYWJzUGF0aGAgYmVjYXVzZSB0aGUgY3dkIHBvcnRpb24gY2FuJ3QgYmUgYSBnbG9iXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFic1BhdGg7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBwYXRocy5mb3JFYWNoKChwYXRoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9yZW1vdmVJZ25vcmVkUGF0aChwYXRoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX3VzZXJJZ25vcmVkID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAoIXRoaXMuX3JlYWR5Q291bnQpXG4gICAgICAgICAgICB0aGlzLl9yZWFkeUNvdW50ID0gMDtcbiAgICAgICAgdGhpcy5fcmVhZHlDb3VudCArPSBwYXRocy5sZW5ndGg7XG4gICAgICAgIFByb21pc2UuYWxsKHBhdGhzLm1hcChhc3luYyAocGF0aCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgdGhpcy5fbm9kZUZzSGFuZGxlci5fYWRkVG9Ob2RlRnMocGF0aCwgIV9pbnRlcm5hbCwgdW5kZWZpbmVkLCAwLCBfb3JpZ0FkZCk7XG4gICAgICAgICAgICBpZiAocmVzKVxuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRSZWFkeSgpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfSkpLnRoZW4oKHJlc3VsdHMpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLmNsb3NlZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICByZXN1bHRzLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaXRlbSlcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGQoc3lzUGF0aC5kaXJuYW1lKGl0ZW0pLCBzeXNQYXRoLmJhc2VuYW1lKF9vcmlnQWRkIHx8IGl0ZW0pKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsb3NlIHdhdGNoZXJzIG9yIHN0YXJ0IGlnbm9yaW5nIGV2ZW50cyBmcm9tIHNwZWNpZmllZCBwYXRocy5cbiAgICAgKi9cbiAgICB1bndhdGNoKHBhdGhzXykge1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgY29uc3QgcGF0aHMgPSB1bmlmeVBhdGhzKHBhdGhzXyk7XG4gICAgICAgIGNvbnN0IHsgY3dkIH0gPSB0aGlzLm9wdGlvbnM7XG4gICAgICAgIHBhdGhzLmZvckVhY2goKHBhdGgpID0+IHtcbiAgICAgICAgICAgIC8vIGNvbnZlcnQgdG8gYWJzb2x1dGUgcGF0aCB1bmxlc3MgcmVsYXRpdmUgcGF0aCBhbHJlYWR5IG1hdGNoZXNcbiAgICAgICAgICAgIGlmICghc3lzUGF0aC5pc0Fic29sdXRlKHBhdGgpICYmICF0aGlzLl9jbG9zZXJzLmhhcyhwYXRoKSkge1xuICAgICAgICAgICAgICAgIGlmIChjd2QpXG4gICAgICAgICAgICAgICAgICAgIHBhdGggPSBzeXNQYXRoLmpvaW4oY3dkLCBwYXRoKTtcbiAgICAgICAgICAgICAgICBwYXRoID0gc3lzUGF0aC5yZXNvbHZlKHBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fY2xvc2VQYXRoKHBhdGgpO1xuICAgICAgICAgICAgdGhpcy5fYWRkSWdub3JlZFBhdGgocGF0aCk7XG4gICAgICAgICAgICBpZiAodGhpcy5fd2F0Y2hlZC5oYXMocGF0aCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hZGRJZ25vcmVkUGF0aCh7XG4gICAgICAgICAgICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHJlY3Vyc2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHJlc2V0IHRoZSBjYWNoZWQgdXNlcklnbm9yZWQgYW55bWF0Y2ggZm5cbiAgICAgICAgICAgIC8vIHRvIG1ha2UgaWdub3JlZFBhdGhzIGNoYW5nZXMgZWZmZWN0aXZlXG4gICAgICAgICAgICB0aGlzLl91c2VySWdub3JlZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDbG9zZSB3YXRjaGVycyBhbmQgcmVtb3ZlIGFsbCBsaXN0ZW5lcnMgZnJvbSB3YXRjaGVkIHBhdGhzLlxuICAgICAqL1xuICAgIGNsb3NlKCkge1xuICAgICAgICBpZiAodGhpcy5fY2xvc2VQcm9taXNlKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY2xvc2VQcm9taXNlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY2xvc2VkID0gdHJ1ZTtcbiAgICAgICAgLy8gTWVtb3J5IG1hbmFnZW1lbnQuXG4gICAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gICAgICAgIGNvbnN0IGNsb3NlcnMgPSBbXTtcbiAgICAgICAgdGhpcy5fY2xvc2Vycy5mb3JFYWNoKChjbG9zZXJMaXN0KSA9PiBjbG9zZXJMaXN0LmZvckVhY2goKGNsb3NlcikgPT4ge1xuICAgICAgICAgICAgY29uc3QgcHJvbWlzZSA9IGNsb3NlcigpO1xuICAgICAgICAgICAgaWYgKHByb21pc2UgaW5zdGFuY2VvZiBQcm9taXNlKVxuICAgICAgICAgICAgICAgIGNsb3NlcnMucHVzaChwcm9taXNlKTtcbiAgICAgICAgfSkpO1xuICAgICAgICB0aGlzLl9zdHJlYW1zLmZvckVhY2goKHN0cmVhbSkgPT4gc3RyZWFtLmRlc3Ryb3koKSk7XG4gICAgICAgIHRoaXMuX3VzZXJJZ25vcmVkID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLl9yZWFkeUNvdW50ID0gMDtcbiAgICAgICAgdGhpcy5fcmVhZHlFbWl0dGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX3dhdGNoZWQuZm9yRWFjaCgoZGlyZW50KSA9PiBkaXJlbnQuZGlzcG9zZSgpKTtcbiAgICAgICAgdGhpcy5fY2xvc2Vycy5jbGVhcigpO1xuICAgICAgICB0aGlzLl93YXRjaGVkLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuX3N0cmVhbXMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5fc3ltbGlua1BhdGhzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuX3Rocm90dGxlZC5jbGVhcigpO1xuICAgICAgICB0aGlzLl9jbG9zZVByb21pc2UgPSBjbG9zZXJzLmxlbmd0aFxuICAgICAgICAgICAgPyBQcm9taXNlLmFsbChjbG9zZXJzKS50aGVuKCgpID0+IHVuZGVmaW5lZClcbiAgICAgICAgICAgIDogUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIHJldHVybiB0aGlzLl9jbG9zZVByb21pc2U7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEV4cG9zZSBsaXN0IG9mIHdhdGNoZWQgcGF0aHNcbiAgICAgKiBAcmV0dXJucyBmb3IgY2hhaW5pbmdcbiAgICAgKi9cbiAgICBnZXRXYXRjaGVkKCkge1xuICAgICAgICBjb25zdCB3YXRjaExpc3QgPSB7fTtcbiAgICAgICAgdGhpcy5fd2F0Y2hlZC5mb3JFYWNoKChlbnRyeSwgZGlyKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBrZXkgPSB0aGlzLm9wdGlvbnMuY3dkID8gc3lzUGF0aC5yZWxhdGl2ZSh0aGlzLm9wdGlvbnMuY3dkLCBkaXIpIDogZGlyO1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBrZXkgfHwgT05FX0RPVDtcbiAgICAgICAgICAgIHdhdGNoTGlzdFtpbmRleF0gPSBlbnRyeS5nZXRDaGlsZHJlbigpLnNvcnQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB3YXRjaExpc3Q7XG4gICAgfVxuICAgIGVtaXRXaXRoQWxsKGV2ZW50LCBhcmdzKSB7XG4gICAgICAgIHRoaXMuZW1pdChldmVudCwgLi4uYXJncyk7XG4gICAgICAgIGlmIChldmVudCAhPT0gRVYuRVJST1IpXG4gICAgICAgICAgICB0aGlzLmVtaXQoRVYuQUxMLCBldmVudCwgLi4uYXJncyk7XG4gICAgfVxuICAgIC8vIENvbW1vbiBoZWxwZXJzXG4gICAgLy8gLS0tLS0tLS0tLS0tLS1cbiAgICAvKipcbiAgICAgKiBOb3JtYWxpemUgYW5kIGVtaXQgZXZlbnRzLlxuICAgICAqIENhbGxpbmcgX2VtaXQgRE9FUyBOT1QgTUVBTiBlbWl0KCkgd291bGQgYmUgY2FsbGVkIVxuICAgICAqIEBwYXJhbSBldmVudCBUeXBlIG9mIGV2ZW50XG4gICAgICogQHBhcmFtIHBhdGggRmlsZSBvciBkaXJlY3RvcnkgcGF0aFxuICAgICAqIEBwYXJhbSBzdGF0cyBhcmd1bWVudHMgdG8gYmUgcGFzc2VkIHdpdGggZXZlbnRcbiAgICAgKiBAcmV0dXJucyB0aGUgZXJyb3IgaWYgZGVmaW5lZCwgb3RoZXJ3aXNlIHRoZSB2YWx1ZSBvZiB0aGUgRlNXYXRjaGVyIGluc3RhbmNlJ3MgYGNsb3NlZGAgZmxhZ1xuICAgICAqL1xuICAgIGFzeW5jIF9lbWl0KGV2ZW50LCBwYXRoLCBzdGF0cykge1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGNvbnN0IG9wdHMgPSB0aGlzLm9wdGlvbnM7XG4gICAgICAgIGlmIChpc1dpbmRvd3MpXG4gICAgICAgICAgICBwYXRoID0gc3lzUGF0aC5ub3JtYWxpemUocGF0aCk7XG4gICAgICAgIGlmIChvcHRzLmN3ZClcbiAgICAgICAgICAgIHBhdGggPSBzeXNQYXRoLnJlbGF0aXZlKG9wdHMuY3dkLCBwYXRoKTtcbiAgICAgICAgY29uc3QgYXJncyA9IFtwYXRoXTtcbiAgICAgICAgaWYgKHN0YXRzICE9IG51bGwpXG4gICAgICAgICAgICBhcmdzLnB1c2goc3RhdHMpO1xuICAgICAgICBjb25zdCBhd2YgPSBvcHRzLmF3YWl0V3JpdGVGaW5pc2g7XG4gICAgICAgIGxldCBwdztcbiAgICAgICAgaWYgKGF3ZiAmJiAocHcgPSB0aGlzLl9wZW5kaW5nV3JpdGVzLmdldChwYXRoKSkpIHtcbiAgICAgICAgICAgIHB3Lmxhc3RDaGFuZ2UgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdHMuYXRvbWljKSB7XG4gICAgICAgICAgICBpZiAoZXZlbnQgPT09IEVWLlVOTElOSykge1xuICAgICAgICAgICAgICAgIHRoaXMuX3BlbmRpbmdVbmxpbmtzLnNldChwYXRoLCBbZXZlbnQsIC4uLmFyZ3NdKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcGVuZGluZ1VubGlua3MuZm9yRWFjaCgoZW50cnksIHBhdGgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdCguLi5lbnRyeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXQoRVYuQUxMLCAuLi5lbnRyeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wZW5kaW5nVW5saW5rcy5kZWxldGUocGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sIHR5cGVvZiBvcHRzLmF0b21pYyA9PT0gJ251bWJlcicgPyBvcHRzLmF0b21pYyA6IDEwMCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXZlbnQgPT09IEVWLkFERCAmJiB0aGlzLl9wZW5kaW5nVW5saW5rcy5oYXMocGF0aCkpIHtcbiAgICAgICAgICAgICAgICBldmVudCA9IEVWLkNIQU5HRTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wZW5kaW5nVW5saW5rcy5kZWxldGUocGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGF3ZiAmJiAoZXZlbnQgPT09IEVWLkFERCB8fCBldmVudCA9PT0gRVYuQ0hBTkdFKSAmJiB0aGlzLl9yZWFkeUVtaXR0ZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGF3ZkVtaXQgPSAoZXJyLCBzdGF0cykgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQgPSBFVi5FUlJPUjtcbiAgICAgICAgICAgICAgICAgICAgYXJnc1swXSA9IGVycjtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0V2l0aEFsbChldmVudCwgYXJncyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHN0YXRzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHN0YXRzIGRvZXNuJ3QgZXhpc3QgdGhlIGZpbGUgbXVzdCBoYXZlIGJlZW4gZGVsZXRlZFxuICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzWzFdID0gc3RhdHM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnB1c2goc3RhdHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdFdpdGhBbGwoZXZlbnQsIGFyZ3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLl9hd2FpdFdyaXRlRmluaXNoKHBhdGgsIGF3Zi5zdGFiaWxpdHlUaHJlc2hvbGQsIGV2ZW50LCBhd2ZFbWl0KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChldmVudCA9PT0gRVYuQ0hBTkdFKSB7XG4gICAgICAgICAgICBjb25zdCBpc1Rocm90dGxlZCA9ICF0aGlzLl90aHJvdHRsZShFVi5DSEFOR0UsIHBhdGgsIDUwKTtcbiAgICAgICAgICAgIGlmIChpc1Rocm90dGxlZClcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBpZiAob3B0cy5hbHdheXNTdGF0ICYmXG4gICAgICAgICAgICBzdGF0cyA9PT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICAoZXZlbnQgPT09IEVWLkFERCB8fCBldmVudCA9PT0gRVYuQUREX0RJUiB8fCBldmVudCA9PT0gRVYuQ0hBTkdFKSkge1xuICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBvcHRzLmN3ZCA/IHN5c1BhdGguam9pbihvcHRzLmN3ZCwgcGF0aCkgOiBwYXRoO1xuICAgICAgICAgICAgbGV0IHN0YXRzO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBzdGF0cyA9IGF3YWl0IHN0YXQoZnVsbFBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgIC8vIGRvIG5vdGhpbmdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFN1cHByZXNzIGV2ZW50IHdoZW4gZnNfc3RhdCBmYWlscywgdG8gYXZvaWQgc2VuZGluZyB1bmRlZmluZWQgJ3N0YXQnXG4gICAgICAgICAgICBpZiAoIXN0YXRzIHx8IHRoaXMuY2xvc2VkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGFyZ3MucHVzaChzdGF0cyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lbWl0V2l0aEFsbChldmVudCwgYXJncyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDb21tb24gaGFuZGxlciBmb3IgZXJyb3JzXG4gICAgICogQHJldHVybnMgVGhlIGVycm9yIGlmIGRlZmluZWQsIG90aGVyd2lzZSB0aGUgdmFsdWUgb2YgdGhlIEZTV2F0Y2hlciBpbnN0YW5jZSdzIGBjbG9zZWRgIGZsYWdcbiAgICAgKi9cbiAgICBfaGFuZGxlRXJyb3IoZXJyb3IpIHtcbiAgICAgICAgY29uc3QgY29kZSA9IGVycm9yICYmIGVycm9yLmNvZGU7XG4gICAgICAgIGlmIChlcnJvciAmJlxuICAgICAgICAgICAgY29kZSAhPT0gJ0VOT0VOVCcgJiZcbiAgICAgICAgICAgIGNvZGUgIT09ICdFTk9URElSJyAmJlxuICAgICAgICAgICAgKCF0aGlzLm9wdGlvbnMuaWdub3JlUGVybWlzc2lvbkVycm9ycyB8fCAoY29kZSAhPT0gJ0VQRVJNJyAmJiBjb2RlICE9PSAnRUFDQ0VTJykpKSB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoRVYuRVJST1IsIGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXJyb3IgfHwgdGhpcy5jbG9zZWQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEhlbHBlciB1dGlsaXR5IGZvciB0aHJvdHRsaW5nXG4gICAgICogQHBhcmFtIGFjdGlvblR5cGUgdHlwZSBiZWluZyB0aHJvdHRsZWRcbiAgICAgKiBAcGFyYW0gcGF0aCBiZWluZyBhY3RlZCB1cG9uXG4gICAgICogQHBhcmFtIHRpbWVvdXQgZHVyYXRpb24gb2YgdGltZSB0byBzdXBwcmVzcyBkdXBsaWNhdGUgYWN0aW9uc1xuICAgICAqIEByZXR1cm5zIHRyYWNraW5nIG9iamVjdCBvciBmYWxzZSBpZiBhY3Rpb24gc2hvdWxkIGJlIHN1cHByZXNzZWRcbiAgICAgKi9cbiAgICBfdGhyb3R0bGUoYWN0aW9uVHlwZSwgcGF0aCwgdGltZW91dCkge1xuICAgICAgICBpZiAoIXRoaXMuX3Rocm90dGxlZC5oYXMoYWN0aW9uVHlwZSkpIHtcbiAgICAgICAgICAgIHRoaXMuX3Rocm90dGxlZC5zZXQoYWN0aW9uVHlwZSwgbmV3IE1hcCgpKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBhY3Rpb24gPSB0aGlzLl90aHJvdHRsZWQuZ2V0KGFjdGlvblR5cGUpO1xuICAgICAgICBpZiAoIWFjdGlvbilcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignaW52YWxpZCB0aHJvdHRsZScpO1xuICAgICAgICBjb25zdCBhY3Rpb25QYXRoID0gYWN0aW9uLmdldChwYXRoKTtcbiAgICAgICAgaWYgKGFjdGlvblBhdGgpIHtcbiAgICAgICAgICAgIGFjdGlvblBhdGguY291bnQrKztcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcHJlZmVyLWNvbnN0XG4gICAgICAgIGxldCB0aW1lb3V0T2JqZWN0O1xuICAgICAgICBjb25zdCBjbGVhciA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBhY3Rpb24uZ2V0KHBhdGgpO1xuICAgICAgICAgICAgY29uc3QgY291bnQgPSBpdGVtID8gaXRlbS5jb3VudCA6IDA7XG4gICAgICAgICAgICBhY3Rpb24uZGVsZXRlKHBhdGgpO1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRPYmplY3QpO1xuICAgICAgICAgICAgaWYgKGl0ZW0pXG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGl0ZW0udGltZW91dE9iamVjdCk7XG4gICAgICAgICAgICByZXR1cm4gY291bnQ7XG4gICAgICAgIH07XG4gICAgICAgIHRpbWVvdXRPYmplY3QgPSBzZXRUaW1lb3V0KGNsZWFyLCB0aW1lb3V0KTtcbiAgICAgICAgY29uc3QgdGhyID0geyB0aW1lb3V0T2JqZWN0LCBjbGVhciwgY291bnQ6IDAgfTtcbiAgICAgICAgYWN0aW9uLnNldChwYXRoLCB0aHIpO1xuICAgICAgICByZXR1cm4gdGhyO1xuICAgIH1cbiAgICBfaW5jclJlYWR5Q291bnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yZWFkeUNvdW50Kys7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEF3YWl0cyB3cml0ZSBvcGVyYXRpb24gdG8gZmluaXNoLlxuICAgICAqIFBvbGxzIGEgbmV3bHkgY3JlYXRlZCBmaWxlIGZvciBzaXplIHZhcmlhdGlvbnMuIFdoZW4gZmlsZXMgc2l6ZSBkb2VzIG5vdCBjaGFuZ2UgZm9yICd0aHJlc2hvbGQnIG1pbGxpc2Vjb25kcyBjYWxscyBjYWxsYmFjay5cbiAgICAgKiBAcGFyYW0gcGF0aCBiZWluZyBhY3RlZCB1cG9uXG4gICAgICogQHBhcmFtIHRocmVzaG9sZCBUaW1lIGluIG1pbGxpc2Vjb25kcyBhIGZpbGUgc2l6ZSBtdXN0IGJlIGZpeGVkIGJlZm9yZSBhY2tub3dsZWRnaW5nIHdyaXRlIE9QIGlzIGZpbmlzaGVkXG4gICAgICogQHBhcmFtIGV2ZW50XG4gICAgICogQHBhcmFtIGF3ZkVtaXQgQ2FsbGJhY2sgdG8gYmUgY2FsbGVkIHdoZW4gcmVhZHkgZm9yIGV2ZW50IHRvIGJlIGVtaXR0ZWQuXG4gICAgICovXG4gICAgX2F3YWl0V3JpdGVGaW5pc2gocGF0aCwgdGhyZXNob2xkLCBldmVudCwgYXdmRW1pdCkge1xuICAgICAgICBjb25zdCBhd2YgPSB0aGlzLm9wdGlvbnMuYXdhaXRXcml0ZUZpbmlzaDtcbiAgICAgICAgaWYgKHR5cGVvZiBhd2YgIT09ICdvYmplY3QnKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCBwb2xsSW50ZXJ2YWwgPSBhd2YucG9sbEludGVydmFsO1xuICAgICAgICBsZXQgdGltZW91dEhhbmRsZXI7XG4gICAgICAgIGxldCBmdWxsUGF0aCA9IHBhdGg7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuY3dkICYmICFzeXNQYXRoLmlzQWJzb2x1dGUocGF0aCkpIHtcbiAgICAgICAgICAgIGZ1bGxQYXRoID0gc3lzUGF0aC5qb2luKHRoaXMub3B0aW9ucy5jd2QsIHBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICAgIGNvbnN0IHdyaXRlcyA9IHRoaXMuX3BlbmRpbmdXcml0ZXM7XG4gICAgICAgIGZ1bmN0aW9uIGF3YWl0V3JpdGVGaW5pc2hGbihwcmV2U3RhdCkge1xuICAgICAgICAgICAgc3RhdGNiKGZ1bGxQYXRoLCAoZXJyLCBjdXJTdGF0KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVyciB8fCAhd3JpdGVzLmhhcyhwYXRoKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyICYmIGVyci5jb2RlICE9PSAnRU5PRU5UJylcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3ZkVtaXQoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBub3cgPSBOdW1iZXIobmV3IERhdGUoKSk7XG4gICAgICAgICAgICAgICAgaWYgKHByZXZTdGF0ICYmIGN1clN0YXQuc2l6ZSAhPT0gcHJldlN0YXQuc2l6ZSkge1xuICAgICAgICAgICAgICAgICAgICB3cml0ZXMuZ2V0KHBhdGgpLmxhc3RDaGFuZ2UgPSBub3c7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHB3ID0gd3JpdGVzLmdldChwYXRoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkZiA9IG5vdyAtIHB3Lmxhc3RDaGFuZ2U7XG4gICAgICAgICAgICAgICAgaWYgKGRmID49IHRocmVzaG9sZCkge1xuICAgICAgICAgICAgICAgICAgICB3cml0ZXMuZGVsZXRlKHBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBhd2ZFbWl0KHVuZGVmaW5lZCwgY3VyU3RhdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aW1lb3V0SGFuZGxlciA9IHNldFRpbWVvdXQoYXdhaXRXcml0ZUZpbmlzaEZuLCBwb2xsSW50ZXJ2YWwsIGN1clN0YXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICghd3JpdGVzLmhhcyhwYXRoKSkge1xuICAgICAgICAgICAgd3JpdGVzLnNldChwYXRoLCB7XG4gICAgICAgICAgICAgICAgbGFzdENoYW5nZTogbm93LFxuICAgICAgICAgICAgICAgIGNhbmNlbFdhaXQ6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVzLmRlbGV0ZShwYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRIYW5kbGVyKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRpbWVvdXRIYW5kbGVyID0gc2V0VGltZW91dChhd2FpdFdyaXRlRmluaXNoRm4sIHBvbGxJbnRlcnZhbCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIHVzZXIgaGFzIGFza2VkIHRvIGlnbm9yZSB0aGlzIHBhdGguXG4gICAgICovXG4gICAgX2lzSWdub3JlZChwYXRoLCBzdGF0cykge1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmF0b21pYyAmJiBET1RfUkUudGVzdChwYXRoKSlcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICBpZiAoIXRoaXMuX3VzZXJJZ25vcmVkKSB7XG4gICAgICAgICAgICBjb25zdCB7IGN3ZCB9ID0gdGhpcy5vcHRpb25zO1xuICAgICAgICAgICAgY29uc3QgaWduID0gdGhpcy5vcHRpb25zLmlnbm9yZWQ7XG4gICAgICAgICAgICBjb25zdCBpZ25vcmVkID0gKGlnbiB8fCBbXSkubWFwKG5vcm1hbGl6ZUlnbm9yZWQoY3dkKSk7XG4gICAgICAgICAgICBjb25zdCBpZ25vcmVkUGF0aHMgPSBbLi4udGhpcy5faWdub3JlZFBhdGhzXTtcbiAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBbLi4uaWdub3JlZFBhdGhzLm1hcChub3JtYWxpemVJZ25vcmVkKGN3ZCkpLCAuLi5pZ25vcmVkXTtcbiAgICAgICAgICAgIHRoaXMuX3VzZXJJZ25vcmVkID0gYW55bWF0Y2gobGlzdCwgdW5kZWZpbmVkKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fdXNlcklnbm9yZWQocGF0aCwgc3RhdHMpO1xuICAgIH1cbiAgICBfaXNudElnbm9yZWQocGF0aCwgc3RhdCkge1xuICAgICAgICByZXR1cm4gIXRoaXMuX2lzSWdub3JlZChwYXRoLCBzdGF0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUHJvdmlkZXMgYSBzZXQgb2YgY29tbW9uIGhlbHBlcnMgYW5kIHByb3BlcnRpZXMgcmVsYXRpbmcgdG8gc3ltbGluayBoYW5kbGluZy5cbiAgICAgKiBAcGFyYW0gcGF0aCBmaWxlIG9yIGRpcmVjdG9yeSBwYXR0ZXJuIGJlaW5nIHdhdGNoZWRcbiAgICAgKi9cbiAgICBfZ2V0V2F0Y2hIZWxwZXJzKHBhdGgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBXYXRjaEhlbHBlcihwYXRoLCB0aGlzLm9wdGlvbnMuZm9sbG93U3ltbGlua3MsIHRoaXMpO1xuICAgIH1cbiAgICAvLyBEaXJlY3RvcnkgaGVscGVyc1xuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLyoqXG4gICAgICogUHJvdmlkZXMgZGlyZWN0b3J5IHRyYWNraW5nIG9iamVjdHNcbiAgICAgKiBAcGFyYW0gZGlyZWN0b3J5IHBhdGggb2YgdGhlIGRpcmVjdG9yeVxuICAgICAqL1xuICAgIF9nZXRXYXRjaGVkRGlyKGRpcmVjdG9yeSkge1xuICAgICAgICBjb25zdCBkaXIgPSBzeXNQYXRoLnJlc29sdmUoZGlyZWN0b3J5KTtcbiAgICAgICAgaWYgKCF0aGlzLl93YXRjaGVkLmhhcyhkaXIpKVxuICAgICAgICAgICAgdGhpcy5fd2F0Y2hlZC5zZXQoZGlyLCBuZXcgRGlyRW50cnkoZGlyLCB0aGlzLl9ib3VuZFJlbW92ZSkpO1xuICAgICAgICByZXR1cm4gdGhpcy5fd2F0Y2hlZC5nZXQoZGlyKTtcbiAgICB9XG4gICAgLy8gRmlsZSBoZWxwZXJzXG4gICAgLy8gLS0tLS0tLS0tLS0tXG4gICAgLyoqXG4gICAgICogQ2hlY2sgZm9yIHJlYWQgcGVybWlzc2lvbnM6IGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xMTc4MTQwNC8xMzU4NDA1XG4gICAgICovXG4gICAgX2hhc1JlYWRQZXJtaXNzaW9ucyhzdGF0cykge1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmlnbm9yZVBlcm1pc3Npb25FcnJvcnMpXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIEJvb2xlYW4oTnVtYmVyKHN0YXRzLm1vZGUpICYgMG80MDApO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIGVtaXR0aW5nIHVubGluayBldmVudHMgZm9yXG4gICAgICogZmlsZXMgYW5kIGRpcmVjdG9yaWVzLCBhbmQgdmlhIHJlY3Vyc2lvbiwgZm9yXG4gICAgICogZmlsZXMgYW5kIGRpcmVjdG9yaWVzIHdpdGhpbiBkaXJlY3RvcmllcyB0aGF0IGFyZSB1bmxpbmtlZFxuICAgICAqIEBwYXJhbSBkaXJlY3Rvcnkgd2l0aGluIHdoaWNoIHRoZSBmb2xsb3dpbmcgaXRlbSBpcyBsb2NhdGVkXG4gICAgICogQHBhcmFtIGl0ZW0gICAgICBiYXNlIHBhdGggb2YgaXRlbS9kaXJlY3RvcnlcbiAgICAgKi9cbiAgICBfcmVtb3ZlKGRpcmVjdG9yeSwgaXRlbSwgaXNEaXJlY3RvcnkpIHtcbiAgICAgICAgLy8gaWYgd2hhdCBpcyBiZWluZyBkZWxldGVkIGlzIGEgZGlyZWN0b3J5LCBnZXQgdGhhdCBkaXJlY3RvcnkncyBwYXRoc1xuICAgICAgICAvLyBmb3IgcmVjdXJzaXZlIGRlbGV0aW5nIGFuZCBjbGVhbmluZyBvZiB3YXRjaGVkIG9iamVjdFxuICAgICAgICAvLyBpZiBpdCBpcyBub3QgYSBkaXJlY3RvcnksIG5lc3RlZERpcmVjdG9yeUNoaWxkcmVuIHdpbGwgYmUgZW1wdHkgYXJyYXlcbiAgICAgICAgY29uc3QgcGF0aCA9IHN5c1BhdGguam9pbihkaXJlY3RvcnksIGl0ZW0pO1xuICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHN5c1BhdGgucmVzb2x2ZShwYXRoKTtcbiAgICAgICAgaXNEaXJlY3RvcnkgPVxuICAgICAgICAgICAgaXNEaXJlY3RvcnkgIT0gbnVsbCA/IGlzRGlyZWN0b3J5IDogdGhpcy5fd2F0Y2hlZC5oYXMocGF0aCkgfHwgdGhpcy5fd2F0Y2hlZC5oYXMoZnVsbFBhdGgpO1xuICAgICAgICAvLyBwcmV2ZW50IGR1cGxpY2F0ZSBoYW5kbGluZyBpbiBjYXNlIG9mIGFycml2aW5nIGhlcmUgbmVhcmx5IHNpbXVsdGFuZW91c2x5XG4gICAgICAgIC8vIHZpYSBtdWx0aXBsZSBwYXRocyAoc3VjaCBhcyBfaGFuZGxlRmlsZSBhbmQgX2hhbmRsZURpcilcbiAgICAgICAgaWYgKCF0aGlzLl90aHJvdHRsZSgncmVtb3ZlJywgcGF0aCwgMTAwKSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgLy8gaWYgdGhlIG9ubHkgd2F0Y2hlZCBmaWxlIGlzIHJlbW92ZWQsIHdhdGNoIGZvciBpdHMgcmV0dXJuXG4gICAgICAgIGlmICghaXNEaXJlY3RvcnkgJiYgdGhpcy5fd2F0Y2hlZC5zaXplID09PSAxKSB7XG4gICAgICAgICAgICB0aGlzLmFkZChkaXJlY3RvcnksIGl0ZW0sIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRoaXMgd2lsbCBjcmVhdGUgYSBuZXcgZW50cnkgaW4gdGhlIHdhdGNoZWQgb2JqZWN0IGluIGVpdGhlciBjYXNlXG4gICAgICAgIC8vIHNvIHdlIGdvdCB0byBkbyB0aGUgZGlyZWN0b3J5IGNoZWNrIGJlZm9yZWhhbmRcbiAgICAgICAgY29uc3Qgd3AgPSB0aGlzLl9nZXRXYXRjaGVkRGlyKHBhdGgpO1xuICAgICAgICBjb25zdCBuZXN0ZWREaXJlY3RvcnlDaGlsZHJlbiA9IHdwLmdldENoaWxkcmVuKCk7XG4gICAgICAgIC8vIFJlY3Vyc2l2ZWx5IHJlbW92ZSBjaGlsZHJlbiBkaXJlY3RvcmllcyAvIGZpbGVzLlxuICAgICAgICBuZXN0ZWREaXJlY3RvcnlDaGlsZHJlbi5mb3JFYWNoKChuZXN0ZWQpID0+IHRoaXMuX3JlbW92ZShwYXRoLCBuZXN0ZWQpKTtcbiAgICAgICAgLy8gQ2hlY2sgaWYgaXRlbSB3YXMgb24gdGhlIHdhdGNoZWQgbGlzdCBhbmQgcmVtb3ZlIGl0XG4gICAgICAgIGNvbnN0IHBhcmVudCA9IHRoaXMuX2dldFdhdGNoZWREaXIoZGlyZWN0b3J5KTtcbiAgICAgICAgY29uc3Qgd2FzVHJhY2tlZCA9IHBhcmVudC5oYXMoaXRlbSk7XG4gICAgICAgIHBhcmVudC5yZW1vdmUoaXRlbSk7XG4gICAgICAgIC8vIEZpeGVzIGlzc3VlICMxMDQyIC0+IFJlbGF0aXZlIHBhdGhzIHdlcmUgZGV0ZWN0ZWQgYW5kIGFkZGVkIGFzIHN5bWxpbmtzXG4gICAgICAgIC8vIChodHRwczovL2dpdGh1Yi5jb20vcGF1bG1pbGxyL2Nob2tpZGFyL2Jsb2IvZTE3NTNkZGJjOTU3MWJkYzMzYjRhNGFmMTcyZDUyY2I2ZTYxMWMxMC9saWIvbm9kZWZzLWhhbmRsZXIuanMjTDYxMiksXG4gICAgICAgIC8vIGJ1dCBuZXZlciByZW1vdmVkIGZyb20gdGhlIG1hcCBpbiBjYXNlIHRoZSBwYXRoIHdhcyBkZWxldGVkLlxuICAgICAgICAvLyBUaGlzIGxlYWRzIHRvIGFuIGluY29ycmVjdCBzdGF0ZSBpZiB0aGUgcGF0aCB3YXMgcmVjcmVhdGVkOlxuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vcGF1bG1pbGxyL2Nob2tpZGFyL2Jsb2IvZTE3NTNkZGJjOTU3MWJkYzMzYjRhNGFmMTcyZDUyY2I2ZTYxMWMxMC9saWIvbm9kZWZzLWhhbmRsZXIuanMjTDU1M1xuICAgICAgICBpZiAodGhpcy5fc3ltbGlua1BhdGhzLmhhcyhmdWxsUGF0aCkpIHtcbiAgICAgICAgICAgIHRoaXMuX3N5bWxpbmtQYXRocy5kZWxldGUoZnVsbFBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIC8vIElmIHdlIHdhaXQgZm9yIHRoaXMgZmlsZSB0byBiZSBmdWxseSB3cml0dGVuLCBjYW5jZWwgdGhlIHdhaXQuXG4gICAgICAgIGxldCByZWxQYXRoID0gcGF0aDtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5jd2QpXG4gICAgICAgICAgICByZWxQYXRoID0gc3lzUGF0aC5yZWxhdGl2ZSh0aGlzLm9wdGlvbnMuY3dkLCBwYXRoKTtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5hd2FpdFdyaXRlRmluaXNoICYmIHRoaXMuX3BlbmRpbmdXcml0ZXMuaGFzKHJlbFBhdGgpKSB7XG4gICAgICAgICAgICBjb25zdCBldmVudCA9IHRoaXMuX3BlbmRpbmdXcml0ZXMuZ2V0KHJlbFBhdGgpLmNhbmNlbFdhaXQoKTtcbiAgICAgICAgICAgIGlmIChldmVudCA9PT0gRVYuQUREKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBUaGUgRW50cnkgd2lsbCBlaXRoZXIgYmUgYSBkaXJlY3RvcnkgdGhhdCBqdXN0IGdvdCByZW1vdmVkXG4gICAgICAgIC8vIG9yIGEgYm9ndXMgZW50cnkgdG8gYSBmaWxlLCBpbiBlaXRoZXIgY2FzZSB3ZSBoYXZlIHRvIHJlbW92ZSBpdFxuICAgICAgICB0aGlzLl93YXRjaGVkLmRlbGV0ZShwYXRoKTtcbiAgICAgICAgdGhpcy5fd2F0Y2hlZC5kZWxldGUoZnVsbFBhdGgpO1xuICAgICAgICBjb25zdCBldmVudE5hbWUgPSBpc0RpcmVjdG9yeSA/IEVWLlVOTElOS19ESVIgOiBFVi5VTkxJTks7XG4gICAgICAgIGlmICh3YXNUcmFja2VkICYmICF0aGlzLl9pc0lnbm9yZWQocGF0aCkpXG4gICAgICAgICAgICB0aGlzLl9lbWl0KGV2ZW50TmFtZSwgcGF0aCk7XG4gICAgICAgIC8vIEF2b2lkIGNvbmZsaWN0cyBpZiB3ZSBsYXRlciBjcmVhdGUgYW5vdGhlciBmaWxlIHdpdGggdGhlIHNhbWUgbmFtZVxuICAgICAgICB0aGlzLl9jbG9zZVBhdGgocGF0aCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsb3NlcyBhbGwgd2F0Y2hlcnMgZm9yIGEgcGF0aFxuICAgICAqL1xuICAgIF9jbG9zZVBhdGgocGF0aCkge1xuICAgICAgICB0aGlzLl9jbG9zZUZpbGUocGF0aCk7XG4gICAgICAgIGNvbnN0IGRpciA9IHN5c1BhdGguZGlybmFtZShwYXRoKTtcbiAgICAgICAgdGhpcy5fZ2V0V2F0Y2hlZERpcihkaXIpLnJlbW92ZShzeXNQYXRoLmJhc2VuYW1lKHBhdGgpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xvc2VzIG9ubHkgZmlsZS1zcGVjaWZpYyB3YXRjaGVyc1xuICAgICAqL1xuICAgIF9jbG9zZUZpbGUocGF0aCkge1xuICAgICAgICBjb25zdCBjbG9zZXJzID0gdGhpcy5fY2xvc2Vycy5nZXQocGF0aCk7XG4gICAgICAgIGlmICghY2xvc2VycylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY2xvc2Vycy5mb3JFYWNoKChjbG9zZXIpID0+IGNsb3NlcigpKTtcbiAgICAgICAgdGhpcy5fY2xvc2Vycy5kZWxldGUocGF0aCk7XG4gICAgfVxuICAgIF9hZGRQYXRoQ2xvc2VyKHBhdGgsIGNsb3Nlcikge1xuICAgICAgICBpZiAoIWNsb3NlcilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgbGV0IGxpc3QgPSB0aGlzLl9jbG9zZXJzLmdldChwYXRoKTtcbiAgICAgICAgaWYgKCFsaXN0KSB7XG4gICAgICAgICAgICBsaXN0ID0gW107XG4gICAgICAgICAgICB0aGlzLl9jbG9zZXJzLnNldChwYXRoLCBsaXN0KTtcbiAgICAgICAgfVxuICAgICAgICBsaXN0LnB1c2goY2xvc2VyKTtcbiAgICB9XG4gICAgX3JlYWRkaXJwKHJvb3QsIG9wdHMpIHtcbiAgICAgICAgaWYgKHRoaXMuY2xvc2VkKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCBvcHRpb25zID0geyB0eXBlOiBFVi5BTEwsIGFsd2F5c1N0YXQ6IHRydWUsIGxzdGF0OiB0cnVlLCAuLi5vcHRzLCBkZXB0aDogMCB9O1xuICAgICAgICBsZXQgc3RyZWFtID0gcmVhZGRpcnAocm9vdCwgb3B0aW9ucyk7XG4gICAgICAgIHRoaXMuX3N0cmVhbXMuYWRkKHN0cmVhbSk7XG4gICAgICAgIHN0cmVhbS5vbmNlKFNUUl9DTE9TRSwgKCkgPT4ge1xuICAgICAgICAgICAgc3RyZWFtID0gdW5kZWZpbmVkO1xuICAgICAgICB9KTtcbiAgICAgICAgc3RyZWFtLm9uY2UoU1RSX0VORCwgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHN0cmVhbSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3N0cmVhbXMuZGVsZXRlKHN0cmVhbSk7XG4gICAgICAgICAgICAgICAgc3RyZWFtID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHN0cmVhbTtcbiAgICB9XG59XG4vKipcbiAqIEluc3RhbnRpYXRlcyB3YXRjaGVyIHdpdGggcGF0aHMgdG8gYmUgdHJhY2tlZC5cbiAqIEBwYXJhbSBwYXRocyBmaWxlIC8gZGlyZWN0b3J5IHBhdGhzXG4gKiBAcGFyYW0gb3B0aW9ucyBvcHRzLCBzdWNoIGFzIGBhdG9taWNgLCBgYXdhaXRXcml0ZUZpbmlzaGAsIGBpZ25vcmVkYCwgYW5kIG90aGVyc1xuICogQHJldHVybnMgYW4gaW5zdGFuY2Ugb2YgRlNXYXRjaGVyIGZvciBjaGFpbmluZy5cbiAqIEBleGFtcGxlXG4gKiBjb25zdCB3YXRjaGVyID0gd2F0Y2goJy4nKS5vbignYWxsJywgKGV2ZW50LCBwYXRoKSA9PiB7IGNvbnNvbGUubG9nKGV2ZW50LCBwYXRoKTsgfSk7XG4gKiB3YXRjaCgnLicsIHsgYXRvbWljOiB0cnVlLCBhd2FpdFdyaXRlRmluaXNoOiB0cnVlLCBpZ25vcmVkOiAoZiwgc3RhdHMpID0+IHN0YXRzPy5pc0ZpbGUoKSAmJiAhZi5lbmRzV2l0aCgnLmpzJykgfSlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdhdGNoKHBhdGhzLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCB3YXRjaGVyID0gbmV3IEZTV2F0Y2hlcihvcHRpb25zKTtcbiAgICB3YXRjaGVyLmFkZChwYXRocyk7XG4gICAgcmV0dXJuIHdhdGNoZXI7XG59XG5leHBvcnQgZGVmYXVsdCB7IHdhdGNoLCBGU1dhdGNoZXIgfTtcbiIsICJpbXBvcnQgeyBzdGF0LCBsc3RhdCwgcmVhZGRpciwgcmVhbHBhdGggfSBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCB7IFJlYWRhYmxlIH0gZnJvbSAnbm9kZTpzdHJlYW0nO1xuaW1wb3J0IHsgcmVzb2x2ZSBhcyBwcmVzb2x2ZSwgcmVsYXRpdmUgYXMgcHJlbGF0aXZlLCBqb2luIGFzIHBqb2luLCBzZXAgYXMgcHNlcCB9IGZyb20gJ25vZGU6cGF0aCc7XG5leHBvcnQgY29uc3QgRW50cnlUeXBlcyA9IHtcbiAgICBGSUxFX1RZUEU6ICdmaWxlcycsXG4gICAgRElSX1RZUEU6ICdkaXJlY3RvcmllcycsXG4gICAgRklMRV9ESVJfVFlQRTogJ2ZpbGVzX2RpcmVjdG9yaWVzJyxcbiAgICBFVkVSWVRISU5HX1RZUEU6ICdhbGwnLFxufTtcbmNvbnN0IGRlZmF1bHRPcHRpb25zID0ge1xuICAgIHJvb3Q6ICcuJyxcbiAgICBmaWxlRmlsdGVyOiAoX2VudHJ5SW5mbykgPT4gdHJ1ZSxcbiAgICBkaXJlY3RvcnlGaWx0ZXI6IChfZW50cnlJbmZvKSA9PiB0cnVlLFxuICAgIHR5cGU6IEVudHJ5VHlwZXMuRklMRV9UWVBFLFxuICAgIGxzdGF0OiBmYWxzZSxcbiAgICBkZXB0aDogMjE0NzQ4MzY0OCxcbiAgICBhbHdheXNTdGF0OiBmYWxzZSxcbiAgICBoaWdoV2F0ZXJNYXJrOiA0MDk2LFxufTtcbk9iamVjdC5mcmVlemUoZGVmYXVsdE9wdGlvbnMpO1xuY29uc3QgUkVDVVJTSVZFX0VSUk9SX0NPREUgPSAnUkVBRERJUlBfUkVDVVJTSVZFX0VSUk9SJztcbmNvbnN0IE5PUk1BTF9GTE9XX0VSUk9SUyA9IG5ldyBTZXQoWydFTk9FTlQnLCAnRVBFUk0nLCAnRUFDQ0VTJywgJ0VMT09QJywgUkVDVVJTSVZFX0VSUk9SX0NPREVdKTtcbmNvbnN0IEFMTF9UWVBFUyA9IFtcbiAgICBFbnRyeVR5cGVzLkRJUl9UWVBFLFxuICAgIEVudHJ5VHlwZXMuRVZFUllUSElOR19UWVBFLFxuICAgIEVudHJ5VHlwZXMuRklMRV9ESVJfVFlQRSxcbiAgICBFbnRyeVR5cGVzLkZJTEVfVFlQRSxcbl07XG5jb25zdCBESVJfVFlQRVMgPSBuZXcgU2V0KFtcbiAgICBFbnRyeVR5cGVzLkRJUl9UWVBFLFxuICAgIEVudHJ5VHlwZXMuRVZFUllUSElOR19UWVBFLFxuICAgIEVudHJ5VHlwZXMuRklMRV9ESVJfVFlQRSxcbl0pO1xuY29uc3QgRklMRV9UWVBFUyA9IG5ldyBTZXQoW1xuICAgIEVudHJ5VHlwZXMuRVZFUllUSElOR19UWVBFLFxuICAgIEVudHJ5VHlwZXMuRklMRV9ESVJfVFlQRSxcbiAgICBFbnRyeVR5cGVzLkZJTEVfVFlQRSxcbl0pO1xuY29uc3QgaXNOb3JtYWxGbG93RXJyb3IgPSAoZXJyb3IpID0+IE5PUk1BTF9GTE9XX0VSUk9SUy5oYXMoZXJyb3IuY29kZSk7XG5jb25zdCB3YW50QmlnaW50RnNTdGF0cyA9IHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMic7XG5jb25zdCBlbXB0eUZuID0gKF9lbnRyeUluZm8pID0+IHRydWU7XG5jb25zdCBub3JtYWxpemVGaWx0ZXIgPSAoZmlsdGVyKSA9PiB7XG4gICAgaWYgKGZpbHRlciA9PT0gdW5kZWZpbmVkKVxuICAgICAgICByZXR1cm4gZW1wdHlGbjtcbiAgICBpZiAodHlwZW9mIGZpbHRlciA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgcmV0dXJuIGZpbHRlcjtcbiAgICBpZiAodHlwZW9mIGZpbHRlciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgY29uc3QgZmwgPSBmaWx0ZXIudHJpbSgpO1xuICAgICAgICByZXR1cm4gKGVudHJ5KSA9PiBlbnRyeS5iYXNlbmFtZSA9PT0gZmw7XG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KGZpbHRlcikpIHtcbiAgICAgICAgY29uc3QgdHJJdGVtcyA9IGZpbHRlci5tYXAoKGl0ZW0pID0+IGl0ZW0udHJpbSgpKTtcbiAgICAgICAgcmV0dXJuIChlbnRyeSkgPT4gdHJJdGVtcy5zb21lKChmKSA9PiBlbnRyeS5iYXNlbmFtZSA9PT0gZik7XG4gICAgfVxuICAgIHJldHVybiBlbXB0eUZuO1xufTtcbi8qKiBSZWFkYWJsZSByZWFkZGlyIHN0cmVhbSwgZW1pdHRpbmcgbmV3IGZpbGVzIGFzIHRoZXkncmUgYmVpbmcgbGlzdGVkLiAqL1xuZXhwb3J0IGNsYXNzIFJlYWRkaXJwU3RyZWFtIGV4dGVuZHMgUmVhZGFibGUge1xuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSkge1xuICAgICAgICBzdXBlcih7XG4gICAgICAgICAgICBvYmplY3RNb2RlOiB0cnVlLFxuICAgICAgICAgICAgYXV0b0Rlc3Ryb3k6IHRydWUsXG4gICAgICAgICAgICBoaWdoV2F0ZXJNYXJrOiBvcHRpb25zLmhpZ2hXYXRlck1hcmssXG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCBvcHRzID0geyAuLi5kZWZhdWx0T3B0aW9ucywgLi4ub3B0aW9ucyB9O1xuICAgICAgICBjb25zdCB7IHJvb3QsIHR5cGUgfSA9IG9wdHM7XG4gICAgICAgIHRoaXMuX2ZpbGVGaWx0ZXIgPSBub3JtYWxpemVGaWx0ZXIob3B0cy5maWxlRmlsdGVyKTtcbiAgICAgICAgdGhpcy5fZGlyZWN0b3J5RmlsdGVyID0gbm9ybWFsaXplRmlsdGVyKG9wdHMuZGlyZWN0b3J5RmlsdGVyKTtcbiAgICAgICAgY29uc3Qgc3RhdE1ldGhvZCA9IG9wdHMubHN0YXQgPyBsc3RhdCA6IHN0YXQ7XG4gICAgICAgIC8vIFVzZSBiaWdpbnQgc3RhdHMgaWYgaXQncyB3aW5kb3dzIGFuZCBzdGF0KCkgc3VwcG9ydHMgb3B0aW9ucyAobm9kZSAxMCspLlxuICAgICAgICBpZiAod2FudEJpZ2ludEZzU3RhdHMpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YXQgPSAocGF0aCkgPT4gc3RhdE1ldGhvZChwYXRoLCB7IGJpZ2ludDogdHJ1ZSB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YXQgPSBzdGF0TWV0aG9kO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX21heERlcHRoID0gb3B0cy5kZXB0aCA/PyBkZWZhdWx0T3B0aW9ucy5kZXB0aDtcbiAgICAgICAgdGhpcy5fd2FudHNEaXIgPSB0eXBlID8gRElSX1RZUEVTLmhhcyh0eXBlKSA6IGZhbHNlO1xuICAgICAgICB0aGlzLl93YW50c0ZpbGUgPSB0eXBlID8gRklMRV9UWVBFUy5oYXModHlwZSkgOiBmYWxzZTtcbiAgICAgICAgdGhpcy5fd2FudHNFdmVyeXRoaW5nID0gdHlwZSA9PT0gRW50cnlUeXBlcy5FVkVSWVRISU5HX1RZUEU7XG4gICAgICAgIHRoaXMuX3Jvb3QgPSBwcmVzb2x2ZShyb290KTtcbiAgICAgICAgdGhpcy5faXNEaXJlbnQgPSAhb3B0cy5hbHdheXNTdGF0O1xuICAgICAgICB0aGlzLl9zdGF0c1Byb3AgPSB0aGlzLl9pc0RpcmVudCA/ICdkaXJlbnQnIDogJ3N0YXRzJztcbiAgICAgICAgdGhpcy5fcmRPcHRpb25zID0geyBlbmNvZGluZzogJ3V0ZjgnLCB3aXRoRmlsZVR5cGVzOiB0aGlzLl9pc0RpcmVudCB9O1xuICAgICAgICAvLyBMYXVuY2ggc3RyZWFtIHdpdGggb25lIHBhcmVudCwgdGhlIHJvb3QgZGlyLlxuICAgICAgICB0aGlzLnBhcmVudHMgPSBbdGhpcy5fZXhwbG9yZURpcihyb290LCAxKV07XG4gICAgICAgIHRoaXMucmVhZGluZyA9IGZhbHNlO1xuICAgICAgICB0aGlzLnBhcmVudCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgYXN5bmMgX3JlYWQoYmF0Y2gpIHtcbiAgICAgICAgaWYgKHRoaXMucmVhZGluZylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdGhpcy5yZWFkaW5nID0gdHJ1ZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHdoaWxlICghdGhpcy5kZXN0cm95ZWQgJiYgYmF0Y2ggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyID0gdGhpcy5wYXJlbnQ7XG4gICAgICAgICAgICAgICAgY29uc3QgZmlsID0gcGFyICYmIHBhci5maWxlcztcbiAgICAgICAgICAgICAgICBpZiAoZmlsICYmIGZpbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcGF0aCwgZGVwdGggfSA9IHBhcjtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2xpY2UgPSBmaWwuc3BsaWNlKDAsIGJhdGNoKS5tYXAoKGRpcmVudCkgPT4gdGhpcy5fZm9ybWF0RW50cnkoZGlyZW50LCBwYXRoKSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGF3YWl0ZWQgPSBhd2FpdCBQcm9taXNlLmFsbChzbGljZSk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgYXdhaXRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlbnRyeSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmRlc3Ryb3llZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbnRyeVR5cGUgPSBhd2FpdCB0aGlzLl9nZXRFbnRyeVR5cGUoZW50cnkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVudHJ5VHlwZSA9PT0gJ2RpcmVjdG9yeScgJiYgdGhpcy5fZGlyZWN0b3J5RmlsdGVyKGVudHJ5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkZXB0aCA8PSB0aGlzLl9tYXhEZXB0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcmVudHMucHVzaCh0aGlzLl9leHBsb3JlRGlyKGVudHJ5LmZ1bGxQYXRoLCBkZXB0aCArIDEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuX3dhbnRzRGlyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaChlbnRyeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJhdGNoLS07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoKGVudHJ5VHlwZSA9PT0gJ2ZpbGUnIHx8IHRoaXMuX2luY2x1ZGVBc0ZpbGUoZW50cnkpKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2ZpbGVGaWx0ZXIoZW50cnkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuX3dhbnRzRmlsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2goZW50cnkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiYXRjaC0tO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyZW50ID0gdGhpcy5wYXJlbnRzLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXBhcmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wYXJlbnQgPSBhd2FpdCBwYXJlbnQ7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmRlc3Ryb3llZClcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3Ryb3koZXJyb3IpO1xuICAgICAgICB9XG4gICAgICAgIGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5yZWFkaW5nID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgYXN5bmMgX2V4cGxvcmVEaXIocGF0aCwgZGVwdGgpIHtcbiAgICAgICAgbGV0IGZpbGVzO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgZmlsZXMgPSBhd2FpdCByZWFkZGlyKHBhdGgsIHRoaXMuX3JkT3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICB0aGlzLl9vbkVycm9yKGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBmaWxlcywgZGVwdGgsIHBhdGggfTtcbiAgICB9XG4gICAgYXN5bmMgX2Zvcm1hdEVudHJ5KGRpcmVudCwgcGF0aCkge1xuICAgICAgICBsZXQgZW50cnk7XG4gICAgICAgIGNvbnN0IGJhc2VuYW1lID0gdGhpcy5faXNEaXJlbnQgPyBkaXJlbnQubmFtZSA6IGRpcmVudDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcHJlc29sdmUocGpvaW4ocGF0aCwgYmFzZW5hbWUpKTtcbiAgICAgICAgICAgIGVudHJ5ID0geyBwYXRoOiBwcmVsYXRpdmUodGhpcy5fcm9vdCwgZnVsbFBhdGgpLCBmdWxsUGF0aCwgYmFzZW5hbWUgfTtcbiAgICAgICAgICAgIGVudHJ5W3RoaXMuX3N0YXRzUHJvcF0gPSB0aGlzLl9pc0RpcmVudCA/IGRpcmVudCA6IGF3YWl0IHRoaXMuX3N0YXQoZnVsbFBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHRoaXMuX29uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZW50cnk7XG4gICAgfVxuICAgIF9vbkVycm9yKGVycikge1xuICAgICAgICBpZiAoaXNOb3JtYWxGbG93RXJyb3IoZXJyKSAmJiAhdGhpcy5kZXN0cm95ZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdCgnd2FybicsIGVycik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmRlc3Ryb3koZXJyKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBhc3luYyBfZ2V0RW50cnlUeXBlKGVudHJ5KSB7XG4gICAgICAgIC8vIGVudHJ5IG1heSBiZSB1bmRlZmluZWQsIGJlY2F1c2UgYSB3YXJuaW5nIG9yIGFuIGVycm9yIHdlcmUgZW1pdHRlZFxuICAgICAgICAvLyBhbmQgdGhlIHN0YXRzUHJvcCBpcyB1bmRlZmluZWRcbiAgICAgICAgaWYgKCFlbnRyeSAmJiB0aGlzLl9zdGF0c1Byb3AgaW4gZW50cnkpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzdGF0cyA9IGVudHJ5W3RoaXMuX3N0YXRzUHJvcF07XG4gICAgICAgIGlmIChzdGF0cy5pc0ZpbGUoKSlcbiAgICAgICAgICAgIHJldHVybiAnZmlsZSc7XG4gICAgICAgIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKVxuICAgICAgICAgICAgcmV0dXJuICdkaXJlY3RvcnknO1xuICAgICAgICBpZiAoc3RhdHMgJiYgc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgICAgY29uc3QgZnVsbCA9IGVudHJ5LmZ1bGxQYXRoO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBlbnRyeVJlYWxQYXRoID0gYXdhaXQgcmVhbHBhdGgoZnVsbCk7XG4gICAgICAgICAgICAgICAgY29uc3QgZW50cnlSZWFsUGF0aFN0YXRzID0gYXdhaXQgbHN0YXQoZW50cnlSZWFsUGF0aCk7XG4gICAgICAgICAgICAgICAgaWYgKGVudHJ5UmVhbFBhdGhTdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ2ZpbGUnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZW50cnlSZWFsUGF0aFN0YXRzLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGVuID0gZW50cnlSZWFsUGF0aC5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmdWxsLnN0YXJ0c1dpdGgoZW50cnlSZWFsUGF0aCkgJiYgZnVsbC5zdWJzdHIobGVuLCAxKSA9PT0gcHNlcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjdXJzaXZlRXJyb3IgPSBuZXcgRXJyb3IoYENpcmN1bGFyIHN5bWxpbmsgZGV0ZWN0ZWQ6IFwiJHtmdWxsfVwiIHBvaW50cyB0byBcIiR7ZW50cnlSZWFsUGF0aH1cImApO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVjdXJzaXZlRXJyb3IuY29kZSA9IFJFQ1VSU0lWRV9FUlJPUl9DT0RFO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29uRXJyb3IocmVjdXJzaXZlRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnZGlyZWN0b3J5JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9vbkVycm9yKGVycm9yKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgX2luY2x1ZGVBc0ZpbGUoZW50cnkpIHtcbiAgICAgICAgY29uc3Qgc3RhdHMgPSBlbnRyeSAmJiBlbnRyeVt0aGlzLl9zdGF0c1Byb3BdO1xuICAgICAgICByZXR1cm4gc3RhdHMgJiYgdGhpcy5fd2FudHNFdmVyeXRoaW5nICYmICFzdGF0cy5pc0RpcmVjdG9yeSgpO1xuICAgIH1cbn1cbi8qKlxuICogU3RyZWFtaW5nIHZlcnNpb246IFJlYWRzIGFsbCBmaWxlcyBhbmQgZGlyZWN0b3JpZXMgaW4gZ2l2ZW4gcm9vdCByZWN1cnNpdmVseS5cbiAqIENvbnN1bWVzIH5jb25zdGFudCBzbWFsbCBhbW91bnQgb2YgUkFNLlxuICogQHBhcmFtIHJvb3QgUm9vdCBkaXJlY3RvcnlcbiAqIEBwYXJhbSBvcHRpb25zIE9wdGlvbnMgdG8gc3BlY2lmeSByb290IChzdGFydCBkaXJlY3RvcnkpLCBmaWx0ZXJzIGFuZCByZWN1cnNpb24gZGVwdGhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRkaXJwKHJvb3QsIG9wdGlvbnMgPSB7fSkge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBsZXQgdHlwZSA9IG9wdGlvbnMuZW50cnlUeXBlIHx8IG9wdGlvbnMudHlwZTtcbiAgICBpZiAodHlwZSA9PT0gJ2JvdGgnKVxuICAgICAgICB0eXBlID0gRW50cnlUeXBlcy5GSUxFX0RJUl9UWVBFOyAvLyBiYWNrd2FyZHMtY29tcGF0aWJpbGl0eVxuICAgIGlmICh0eXBlKVxuICAgICAgICBvcHRpb25zLnR5cGUgPSB0eXBlO1xuICAgIGlmICghcm9vdCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlYWRkaXJwOiByb290IGFyZ3VtZW50IGlzIHJlcXVpcmVkLiBVc2FnZTogcmVhZGRpcnAocm9vdCwgb3B0aW9ucyknKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIHJvb3QgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3JlYWRkaXJwOiByb290IGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcuIFVzYWdlOiByZWFkZGlycChyb290LCBvcHRpb25zKScpO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlICYmICFBTExfVFlQRVMuaW5jbHVkZXModHlwZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGByZWFkZGlycDogSW52YWxpZCB0eXBlIHBhc3NlZC4gVXNlIG9uZSBvZiAke0FMTF9UWVBFUy5qb2luKCcsICcpfWApO1xuICAgIH1cbiAgICBvcHRpb25zLnJvb3QgPSByb290O1xuICAgIHJldHVybiBuZXcgUmVhZGRpcnBTdHJlYW0ob3B0aW9ucyk7XG59XG4vKipcbiAqIFByb21pc2UgdmVyc2lvbjogUmVhZHMgYWxsIGZpbGVzIGFuZCBkaXJlY3RvcmllcyBpbiBnaXZlbiByb290IHJlY3Vyc2l2ZWx5LlxuICogQ29tcGFyZWQgdG8gc3RyZWFtaW5nIHZlcnNpb24sIHdpbGwgY29uc3VtZSBhIGxvdCBvZiBSQU0gZS5nLiB3aGVuIDEgbWlsbGlvbiBmaWxlcyBhcmUgbGlzdGVkLlxuICogQHJldHVybnMgYXJyYXkgb2YgcGF0aHMgYW5kIHRoZWlyIGVudHJ5IGluZm9zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkZGlycFByb21pc2Uocm9vdCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgZmlsZXMgPSBbXTtcbiAgICAgICAgcmVhZGRpcnAocm9vdCwgb3B0aW9ucylcbiAgICAgICAgICAgIC5vbignZGF0YScsIChlbnRyeSkgPT4gZmlsZXMucHVzaChlbnRyeSkpXG4gICAgICAgICAgICAub24oJ2VuZCcsICgpID0+IHJlc29sdmUoZmlsZXMpKVxuICAgICAgICAgICAgLm9uKCdlcnJvcicsIChlcnJvcikgPT4gcmVqZWN0KGVycm9yKSk7XG4gICAgfSk7XG59XG5leHBvcnQgZGVmYXVsdCByZWFkZGlycDtcbiIsICJpbXBvcnQgeyB3YXRjaEZpbGUsIHVud2F0Y2hGaWxlLCB3YXRjaCBhcyBmc193YXRjaCB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IG9wZW4sIHN0YXQsIGxzdGF0LCByZWFscGF0aCBhcyBmc3JlYWxwYXRoIH0gZnJvbSAnZnMvcHJvbWlzZXMnO1xuaW1wb3J0ICogYXMgc3lzUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IHR5cGUgYXMgb3NUeXBlIH0gZnJvbSAnb3MnO1xuZXhwb3J0IGNvbnN0IFNUUl9EQVRBID0gJ2RhdGEnO1xuZXhwb3J0IGNvbnN0IFNUUl9FTkQgPSAnZW5kJztcbmV4cG9ydCBjb25zdCBTVFJfQ0xPU0UgPSAnY2xvc2UnO1xuZXhwb3J0IGNvbnN0IEVNUFRZX0ZOID0gKCkgPT4geyB9O1xuZXhwb3J0IGNvbnN0IElERU5USVRZX0ZOID0gKHZhbCkgPT4gdmFsO1xuY29uc3QgcGwgPSBwcm9jZXNzLnBsYXRmb3JtO1xuZXhwb3J0IGNvbnN0IGlzV2luZG93cyA9IHBsID09PSAnd2luMzInO1xuZXhwb3J0IGNvbnN0IGlzTWFjb3MgPSBwbCA9PT0gJ2Rhcndpbic7XG5leHBvcnQgY29uc3QgaXNMaW51eCA9IHBsID09PSAnbGludXgnO1xuZXhwb3J0IGNvbnN0IGlzRnJlZUJTRCA9IHBsID09PSAnZnJlZWJzZCc7XG5leHBvcnQgY29uc3QgaXNJQk1pID0gb3NUeXBlKCkgPT09ICdPUzQwMCc7XG5leHBvcnQgY29uc3QgRVZFTlRTID0ge1xuICAgIEFMTDogJ2FsbCcsXG4gICAgUkVBRFk6ICdyZWFkeScsXG4gICAgQUREOiAnYWRkJyxcbiAgICBDSEFOR0U6ICdjaGFuZ2UnLFxuICAgIEFERF9ESVI6ICdhZGREaXInLFxuICAgIFVOTElOSzogJ3VubGluaycsXG4gICAgVU5MSU5LX0RJUjogJ3VubGlua0RpcicsXG4gICAgUkFXOiAncmF3JyxcbiAgICBFUlJPUjogJ2Vycm9yJyxcbn07XG5jb25zdCBFViA9IEVWRU5UUztcbmNvbnN0IFRIUk9UVExFX01PREVfV0FUQ0ggPSAnd2F0Y2gnO1xuY29uc3Qgc3RhdE1ldGhvZHMgPSB7IGxzdGF0LCBzdGF0IH07XG5jb25zdCBLRVlfTElTVEVORVJTID0gJ2xpc3RlbmVycyc7XG5jb25zdCBLRVlfRVJSID0gJ2VyckhhbmRsZXJzJztcbmNvbnN0IEtFWV9SQVcgPSAncmF3RW1pdHRlcnMnO1xuY29uc3QgSEFORExFUl9LRVlTID0gW0tFWV9MSVNURU5FUlMsIEtFWV9FUlIsIEtFWV9SQVddO1xuLy8gcHJldHRpZXItaWdub3JlXG5jb25zdCBiaW5hcnlFeHRlbnNpb25zID0gbmV3IFNldChbXG4gICAgJzNkbScsICczZHMnLCAnM2cyJywgJzNncCcsICc3eicsICdhJywgJ2FhYycsICdhZHAnLCAnYWZkZXNpZ24nLCAnYWZwaG90bycsICdhZnB1YicsICdhaScsXG4gICAgJ2FpZicsICdhaWZmJywgJ2FseicsICdhcGUnLCAnYXBrJywgJ2FwcGltYWdlJywgJ2FyJywgJ2FyaicsICdhc2YnLCAnYXUnLCAnYXZpJyxcbiAgICAnYmFrJywgJ2JhbWwnLCAnYmgnLCAnYmluJywgJ2JrJywgJ2JtcCcsICdidGlmJywgJ2J6MicsICdiemlwMicsXG4gICAgJ2NhYicsICdjYWYnLCAnY2dtJywgJ2NsYXNzJywgJ2NteCcsICdjcGlvJywgJ2NyMicsICdjdXInLCAnZGF0JywgJ2RjbScsICdkZWInLCAnZGV4JywgJ2RqdnUnLFxuICAgICdkbGwnLCAnZG1nJywgJ2RuZycsICdkb2MnLCAnZG9jbScsICdkb2N4JywgJ2RvdCcsICdkb3RtJywgJ2RyYScsICdEU19TdG9yZScsICdkc2snLCAnZHRzJyxcbiAgICAnZHRzaGQnLCAnZHZiJywgJ2R3ZycsICdkeGYnLFxuICAgICdlY2VscDQ4MDAnLCAnZWNlbHA3NDcwJywgJ2VjZWxwOTYwMCcsICdlZ2cnLCAnZW9sJywgJ2VvdCcsICdlcHViJywgJ2V4ZScsXG4gICAgJ2Y0dicsICdmYnMnLCAnZmgnLCAnZmxhJywgJ2ZsYWMnLCAnZmxhdHBhaycsICdmbGknLCAnZmx2JywgJ2ZweCcsICdmc3QnLCAnZnZ0JyxcbiAgICAnZzMnLCAnZ2gnLCAnZ2lmJywgJ2dyYWZmbGUnLCAnZ3onLCAnZ3ppcCcsXG4gICAgJ2gyNjEnLCAnaDI2MycsICdoMjY0JywgJ2ljbnMnLCAnaWNvJywgJ2llZicsICdpbWcnLCAnaXBhJywgJ2lzbycsXG4gICAgJ2phcicsICdqcGVnJywgJ2pwZycsICdqcGd2JywgJ2pwbScsICdqeHInLCAna2V5JywgJ2t0eCcsXG4gICAgJ2xoYScsICdsaWInLCAnbHZwJywgJ2x6JywgJ2x6aCcsICdsem1hJywgJ2x6bycsXG4gICAgJ20zdScsICdtNGEnLCAnbTR2JywgJ21hcicsICdtZGknLCAnbWh0JywgJ21pZCcsICdtaWRpJywgJ21qMicsICdta2EnLCAnbWt2JywgJ21tcicsICdtbmcnLFxuICAgICdtb2JpJywgJ21vdicsICdtb3ZpZScsICdtcDMnLFxuICAgICdtcDQnLCAnbXA0YScsICdtcGVnJywgJ21wZycsICdtcGdhJywgJ214dScsXG4gICAgJ25lZicsICducHgnLCAnbnVtYmVycycsICdudXBrZycsXG4gICAgJ28nLCAnb2RwJywgJ29kcycsICdvZHQnLCAnb2dhJywgJ29nZycsICdvZ3YnLCAnb3RmJywgJ290dCcsXG4gICAgJ3BhZ2VzJywgJ3BibScsICdwY3gnLCAncGRiJywgJ3BkZicsICdwZWEnLCAncGdtJywgJ3BpYycsICdwbmcnLCAncG5tJywgJ3BvdCcsICdwb3RtJyxcbiAgICAncG90eCcsICdwcGEnLCAncHBhbScsXG4gICAgJ3BwbScsICdwcHMnLCAncHBzbScsICdwcHN4JywgJ3BwdCcsICdwcHRtJywgJ3BwdHgnLCAncHNkJywgJ3B5YScsICdweWMnLCAncHlvJywgJ3B5dicsXG4gICAgJ3F0JyxcbiAgICAncmFyJywgJ3JhcycsICdyYXcnLCAncmVzb3VyY2VzJywgJ3JnYicsICdyaXAnLCAncmxjJywgJ3JtZicsICdybXZiJywgJ3JwbScsICdydGYnLCAncnonLFxuICAgICdzM20nLCAnczd6JywgJ3NjcHQnLCAnc2dpJywgJ3NoYXInLCAnc25hcCcsICdzaWwnLCAnc2tldGNoJywgJ3NsaycsICdzbXYnLCAnc25rJywgJ3NvJyxcbiAgICAnc3RsJywgJ3N1bycsICdzdWInLCAnc3dmJyxcbiAgICAndGFyJywgJ3RieicsICd0YnoyJywgJ3RnYScsICd0Z3onLCAndGhteCcsICd0aWYnLCAndGlmZicsICd0bHonLCAndHRjJywgJ3R0ZicsICd0eHonLFxuICAgICd1ZGYnLCAndXZoJywgJ3V2aScsICd1dm0nLCAndXZwJywgJ3V2cycsICd1dnUnLFxuICAgICd2aXYnLCAndm9iJyxcbiAgICAnd2FyJywgJ3dhdicsICd3YXgnLCAnd2JtcCcsICd3ZHAnLCAnd2ViYScsICd3ZWJtJywgJ3dlYnAnLCAnd2hsJywgJ3dpbScsICd3bScsICd3bWEnLFxuICAgICd3bXYnLCAnd214JywgJ3dvZmYnLCAnd29mZjInLCAnd3JtJywgJ3d2eCcsXG4gICAgJ3hibScsICd4aWYnLCAneGxhJywgJ3hsYW0nLCAneGxzJywgJ3hsc2InLCAneGxzbScsICd4bHN4JywgJ3hsdCcsICd4bHRtJywgJ3hsdHgnLCAneG0nLFxuICAgICd4bWluZCcsICd4cGknLCAneHBtJywgJ3h3ZCcsICd4eicsXG4gICAgJ3onLCAnemlwJywgJ3ppcHgnLFxuXSk7XG5jb25zdCBpc0JpbmFyeVBhdGggPSAoZmlsZVBhdGgpID0+IGJpbmFyeUV4dGVuc2lvbnMuaGFzKHN5c1BhdGguZXh0bmFtZShmaWxlUGF0aCkuc2xpY2UoMSkudG9Mb3dlckNhc2UoKSk7XG4vLyBUT0RPOiBlbWl0IGVycm9ycyBwcm9wZXJseS4gRXhhbXBsZTogRU1GSUxFIG9uIE1hY29zLlxuY29uc3QgZm9yZWFjaCA9ICh2YWwsIGZuKSA9PiB7XG4gICAgaWYgKHZhbCBpbnN0YW5jZW9mIFNldCkge1xuICAgICAgICB2YWwuZm9yRWFjaChmbik7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBmbih2YWwpO1xuICAgIH1cbn07XG5jb25zdCBhZGRBbmRDb252ZXJ0ID0gKG1haW4sIHByb3AsIGl0ZW0pID0+IHtcbiAgICBsZXQgY29udGFpbmVyID0gbWFpbltwcm9wXTtcbiAgICBpZiAoIShjb250YWluZXIgaW5zdGFuY2VvZiBTZXQpKSB7XG4gICAgICAgIG1haW5bcHJvcF0gPSBjb250YWluZXIgPSBuZXcgU2V0KFtjb250YWluZXJdKTtcbiAgICB9XG4gICAgY29udGFpbmVyLmFkZChpdGVtKTtcbn07XG5jb25zdCBjbGVhckl0ZW0gPSAoY29udCkgPT4gKGtleSkgPT4ge1xuICAgIGNvbnN0IHNldCA9IGNvbnRba2V5XTtcbiAgICBpZiAoc2V0IGluc3RhbmNlb2YgU2V0KSB7XG4gICAgICAgIHNldC5jbGVhcigpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgZGVsZXRlIGNvbnRba2V5XTtcbiAgICB9XG59O1xuY29uc3QgZGVsRnJvbVNldCA9IChtYWluLCBwcm9wLCBpdGVtKSA9PiB7XG4gICAgY29uc3QgY29udGFpbmVyID0gbWFpbltwcm9wXTtcbiAgICBpZiAoY29udGFpbmVyIGluc3RhbmNlb2YgU2V0KSB7XG4gICAgICAgIGNvbnRhaW5lci5kZWxldGUoaXRlbSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGNvbnRhaW5lciA9PT0gaXRlbSkge1xuICAgICAgICBkZWxldGUgbWFpbltwcm9wXTtcbiAgICB9XG59O1xuY29uc3QgaXNFbXB0eVNldCA9ICh2YWwpID0+ICh2YWwgaW5zdGFuY2VvZiBTZXQgPyB2YWwuc2l6ZSA9PT0gMCA6ICF2YWwpO1xuY29uc3QgRnNXYXRjaEluc3RhbmNlcyA9IG5ldyBNYXAoKTtcbi8qKlxuICogSW5zdGFudGlhdGVzIHRoZSBmc193YXRjaCBpbnRlcmZhY2VcbiAqIEBwYXJhbSBwYXRoIHRvIGJlIHdhdGNoZWRcbiAqIEBwYXJhbSBvcHRpb25zIHRvIGJlIHBhc3NlZCB0byBmc193YXRjaFxuICogQHBhcmFtIGxpc3RlbmVyIG1haW4gZXZlbnQgaGFuZGxlclxuICogQHBhcmFtIGVyckhhbmRsZXIgZW1pdHMgaW5mbyBhYm91dCBlcnJvcnNcbiAqIEBwYXJhbSBlbWl0UmF3IGVtaXRzIHJhdyBldmVudCBkYXRhXG4gKiBAcmV0dXJucyB7TmF0aXZlRnNXYXRjaGVyfVxuICovXG5mdW5jdGlvbiBjcmVhdGVGc1dhdGNoSW5zdGFuY2UocGF0aCwgb3B0aW9ucywgbGlzdGVuZXIsIGVyckhhbmRsZXIsIGVtaXRSYXcpIHtcbiAgICBjb25zdCBoYW5kbGVFdmVudCA9IChyYXdFdmVudCwgZXZQYXRoKSA9PiB7XG4gICAgICAgIGxpc3RlbmVyKHBhdGgpO1xuICAgICAgICBlbWl0UmF3KHJhd0V2ZW50LCBldlBhdGgsIHsgd2F0Y2hlZFBhdGg6IHBhdGggfSk7XG4gICAgICAgIC8vIGVtaXQgYmFzZWQgb24gZXZlbnRzIG9jY3VycmluZyBmb3IgZmlsZXMgZnJvbSBhIGRpcmVjdG9yeSdzIHdhdGNoZXIgaW5cbiAgICAgICAgLy8gY2FzZSB0aGUgZmlsZSdzIHdhdGNoZXIgbWlzc2VzIGl0IChhbmQgcmVseSBvbiB0aHJvdHRsaW5nIHRvIGRlLWR1cGUpXG4gICAgICAgIGlmIChldlBhdGggJiYgcGF0aCAhPT0gZXZQYXRoKSB7XG4gICAgICAgICAgICBmc1dhdGNoQnJvYWRjYXN0KHN5c1BhdGgucmVzb2x2ZShwYXRoLCBldlBhdGgpLCBLRVlfTElTVEVORVJTLCBzeXNQYXRoLmpvaW4ocGF0aCwgZXZQYXRoKSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBmc193YXRjaChwYXRoLCB7XG4gICAgICAgICAgICBwZXJzaXN0ZW50OiBvcHRpb25zLnBlcnNpc3RlbnQsXG4gICAgICAgIH0sIGhhbmRsZUV2ZW50KTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGVyckhhbmRsZXIoZXJyb3IpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbn1cbi8qKlxuICogSGVscGVyIGZvciBwYXNzaW5nIGZzX3dhdGNoIGV2ZW50IGRhdGEgdG8gYSBjb2xsZWN0aW9uIG9mIGxpc3RlbmVyc1xuICogQHBhcmFtIGZ1bGxQYXRoIGFic29sdXRlIHBhdGggYm91bmQgdG8gZnNfd2F0Y2ggaW5zdGFuY2VcbiAqL1xuY29uc3QgZnNXYXRjaEJyb2FkY2FzdCA9IChmdWxsUGF0aCwgbGlzdGVuZXJUeXBlLCB2YWwxLCB2YWwyLCB2YWwzKSA9PiB7XG4gICAgY29uc3QgY29udCA9IEZzV2F0Y2hJbnN0YW5jZXMuZ2V0KGZ1bGxQYXRoKTtcbiAgICBpZiAoIWNvbnQpXG4gICAgICAgIHJldHVybjtcbiAgICBmb3JlYWNoKGNvbnRbbGlzdGVuZXJUeXBlXSwgKGxpc3RlbmVyKSA9PiB7XG4gICAgICAgIGxpc3RlbmVyKHZhbDEsIHZhbDIsIHZhbDMpO1xuICAgIH0pO1xufTtcbi8qKlxuICogSW5zdGFudGlhdGVzIHRoZSBmc193YXRjaCBpbnRlcmZhY2Ugb3IgYmluZHMgbGlzdGVuZXJzXG4gKiB0byBhbiBleGlzdGluZyBvbmUgY292ZXJpbmcgdGhlIHNhbWUgZmlsZSBzeXN0ZW0gZW50cnlcbiAqIEBwYXJhbSBwYXRoXG4gKiBAcGFyYW0gZnVsbFBhdGggYWJzb2x1dGUgcGF0aFxuICogQHBhcmFtIG9wdGlvbnMgdG8gYmUgcGFzc2VkIHRvIGZzX3dhdGNoXG4gKiBAcGFyYW0gaGFuZGxlcnMgY29udGFpbmVyIGZvciBldmVudCBsaXN0ZW5lciBmdW5jdGlvbnNcbiAqL1xuY29uc3Qgc2V0RnNXYXRjaExpc3RlbmVyID0gKHBhdGgsIGZ1bGxQYXRoLCBvcHRpb25zLCBoYW5kbGVycykgPT4ge1xuICAgIGNvbnN0IHsgbGlzdGVuZXIsIGVyckhhbmRsZXIsIHJhd0VtaXR0ZXIgfSA9IGhhbmRsZXJzO1xuICAgIGxldCBjb250ID0gRnNXYXRjaEluc3RhbmNlcy5nZXQoZnVsbFBhdGgpO1xuICAgIGxldCB3YXRjaGVyO1xuICAgIGlmICghb3B0aW9ucy5wZXJzaXN0ZW50KSB7XG4gICAgICAgIHdhdGNoZXIgPSBjcmVhdGVGc1dhdGNoSW5zdGFuY2UocGF0aCwgb3B0aW9ucywgbGlzdGVuZXIsIGVyckhhbmRsZXIsIHJhd0VtaXR0ZXIpO1xuICAgICAgICBpZiAoIXdhdGNoZXIpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHJldHVybiB3YXRjaGVyLmNsb3NlLmJpbmQod2F0Y2hlcik7XG4gICAgfVxuICAgIGlmIChjb250KSB7XG4gICAgICAgIGFkZEFuZENvbnZlcnQoY29udCwgS0VZX0xJU1RFTkVSUywgbGlzdGVuZXIpO1xuICAgICAgICBhZGRBbmRDb252ZXJ0KGNvbnQsIEtFWV9FUlIsIGVyckhhbmRsZXIpO1xuICAgICAgICBhZGRBbmRDb252ZXJ0KGNvbnQsIEtFWV9SQVcsIHJhd0VtaXR0ZXIpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgd2F0Y2hlciA9IGNyZWF0ZUZzV2F0Y2hJbnN0YW5jZShwYXRoLCBvcHRpb25zLCBmc1dhdGNoQnJvYWRjYXN0LmJpbmQobnVsbCwgZnVsbFBhdGgsIEtFWV9MSVNURU5FUlMpLCBlcnJIYW5kbGVyLCAvLyBubyBuZWVkIHRvIHVzZSBicm9hZGNhc3QgaGVyZVxuICAgICAgICBmc1dhdGNoQnJvYWRjYXN0LmJpbmQobnVsbCwgZnVsbFBhdGgsIEtFWV9SQVcpKTtcbiAgICAgICAgaWYgKCF3YXRjaGVyKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB3YXRjaGVyLm9uKEVWLkVSUk9SLCBhc3luYyAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGJyb2FkY2FzdEVyciA9IGZzV2F0Y2hCcm9hZGNhc3QuYmluZChudWxsLCBmdWxsUGF0aCwgS0VZX0VSUik7XG4gICAgICAgICAgICBpZiAoY29udClcbiAgICAgICAgICAgICAgICBjb250LndhdGNoZXJVbnVzYWJsZSA9IHRydWU7IC8vIGRvY3VtZW50ZWQgc2luY2UgTm9kZSAxMC40LjFcbiAgICAgICAgICAgIC8vIFdvcmthcm91bmQgZm9yIGh0dHBzOi8vZ2l0aHViLmNvbS9qb3llbnQvbm9kZS9pc3N1ZXMvNDMzN1xuICAgICAgICAgICAgaWYgKGlzV2luZG93cyAmJiBlcnJvci5jb2RlID09PSAnRVBFUk0nKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmQgPSBhd2FpdCBvcGVuKHBhdGgsICdyJyk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGZkLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyb2FkY2FzdEVycihlcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZG8gbm90aGluZ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGJyb2FkY2FzdEVycihlcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBjb250ID0ge1xuICAgICAgICAgICAgbGlzdGVuZXJzOiBsaXN0ZW5lcixcbiAgICAgICAgICAgIGVyckhhbmRsZXJzOiBlcnJIYW5kbGVyLFxuICAgICAgICAgICAgcmF3RW1pdHRlcnM6IHJhd0VtaXR0ZXIsXG4gICAgICAgICAgICB3YXRjaGVyLFxuICAgICAgICB9O1xuICAgICAgICBGc1dhdGNoSW5zdGFuY2VzLnNldChmdWxsUGF0aCwgY29udCk7XG4gICAgfVxuICAgIC8vIGNvbnN0IGluZGV4ID0gY29udC5saXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lcik7XG4gICAgLy8gcmVtb3ZlcyB0aGlzIGluc3RhbmNlJ3MgbGlzdGVuZXJzIGFuZCBjbG9zZXMgdGhlIHVuZGVybHlpbmcgZnNfd2F0Y2hcbiAgICAvLyBpbnN0YW5jZSBpZiB0aGVyZSBhcmUgbm8gbW9yZSBsaXN0ZW5lcnMgbGVmdFxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIGRlbEZyb21TZXQoY29udCwgS0VZX0xJU1RFTkVSUywgbGlzdGVuZXIpO1xuICAgICAgICBkZWxGcm9tU2V0KGNvbnQsIEtFWV9FUlIsIGVyckhhbmRsZXIpO1xuICAgICAgICBkZWxGcm9tU2V0KGNvbnQsIEtFWV9SQVcsIHJhd0VtaXR0ZXIpO1xuICAgICAgICBpZiAoaXNFbXB0eVNldChjb250Lmxpc3RlbmVycykpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIHRvIHByb3RlY3QgYWdhaW5zdCBpc3N1ZSBnaC03MzAuXG4gICAgICAgICAgICAvLyBpZiAoY29udC53YXRjaGVyVW51c2FibGUpIHtcbiAgICAgICAgICAgIGNvbnQud2F0Y2hlci5jbG9zZSgpO1xuICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgRnNXYXRjaEluc3RhbmNlcy5kZWxldGUoZnVsbFBhdGgpO1xuICAgICAgICAgICAgSEFORExFUl9LRVlTLmZvckVhY2goY2xlYXJJdGVtKGNvbnQpKTtcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgIGNvbnQud2F0Y2hlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIE9iamVjdC5mcmVlemUoY29udCk7XG4gICAgICAgIH1cbiAgICB9O1xufTtcbi8vIGZzX3dhdGNoRmlsZSBoZWxwZXJzXG4vLyBvYmplY3QgdG8gaG9sZCBwZXItcHJvY2VzcyBmc193YXRjaEZpbGUgaW5zdGFuY2VzXG4vLyAobWF5IGJlIHNoYXJlZCBhY3Jvc3MgY2hva2lkYXIgRlNXYXRjaGVyIGluc3RhbmNlcylcbmNvbnN0IEZzV2F0Y2hGaWxlSW5zdGFuY2VzID0gbmV3IE1hcCgpO1xuLyoqXG4gKiBJbnN0YW50aWF0ZXMgdGhlIGZzX3dhdGNoRmlsZSBpbnRlcmZhY2Ugb3IgYmluZHMgbGlzdGVuZXJzXG4gKiB0byBhbiBleGlzdGluZyBvbmUgY292ZXJpbmcgdGhlIHNhbWUgZmlsZSBzeXN0ZW0gZW50cnlcbiAqIEBwYXJhbSBwYXRoIHRvIGJlIHdhdGNoZWRcbiAqIEBwYXJhbSBmdWxsUGF0aCBhYnNvbHV0ZSBwYXRoXG4gKiBAcGFyYW0gb3B0aW9ucyBvcHRpb25zIHRvIGJlIHBhc3NlZCB0byBmc193YXRjaEZpbGVcbiAqIEBwYXJhbSBoYW5kbGVycyBjb250YWluZXIgZm9yIGV2ZW50IGxpc3RlbmVyIGZ1bmN0aW9uc1xuICogQHJldHVybnMgY2xvc2VyXG4gKi9cbmNvbnN0IHNldEZzV2F0Y2hGaWxlTGlzdGVuZXIgPSAocGF0aCwgZnVsbFBhdGgsIG9wdGlvbnMsIGhhbmRsZXJzKSA9PiB7XG4gICAgY29uc3QgeyBsaXN0ZW5lciwgcmF3RW1pdHRlciB9ID0gaGFuZGxlcnM7XG4gICAgbGV0IGNvbnQgPSBGc1dhdGNoRmlsZUluc3RhbmNlcy5nZXQoZnVsbFBhdGgpO1xuICAgIC8vIGxldCBsaXN0ZW5lcnMgPSBuZXcgU2V0KCk7XG4gICAgLy8gbGV0IHJhd0VtaXR0ZXJzID0gbmV3IFNldCgpO1xuICAgIGNvbnN0IGNvcHRzID0gY29udCAmJiBjb250Lm9wdGlvbnM7XG4gICAgaWYgKGNvcHRzICYmIChjb3B0cy5wZXJzaXN0ZW50IDwgb3B0aW9ucy5wZXJzaXN0ZW50IHx8IGNvcHRzLmludGVydmFsID4gb3B0aW9ucy5pbnRlcnZhbCkpIHtcbiAgICAgICAgLy8gXCJVcGdyYWRlXCIgdGhlIHdhdGNoZXIgdG8gcGVyc2lzdGVuY2Ugb3IgYSBxdWlja2VyIGludGVydmFsLlxuICAgICAgICAvLyBUaGlzIGNyZWF0ZXMgc29tZSB1bmxpa2VseSBlZGdlIGNhc2UgaXNzdWVzIGlmIHRoZSB1c2VyIG1peGVzXG4gICAgICAgIC8vIHNldHRpbmdzIGluIGEgdmVyeSB3ZWlyZCB3YXksIGJ1dCBzb2x2aW5nIGZvciB0aG9zZSBjYXNlc1xuICAgICAgICAvLyBkb2Vzbid0IHNlZW0gd29ydGh3aGlsZSBmb3IgdGhlIGFkZGVkIGNvbXBsZXhpdHkuXG4gICAgICAgIC8vIGxpc3RlbmVycyA9IGNvbnQubGlzdGVuZXJzO1xuICAgICAgICAvLyByYXdFbWl0dGVycyA9IGNvbnQucmF3RW1pdHRlcnM7XG4gICAgICAgIHVud2F0Y2hGaWxlKGZ1bGxQYXRoKTtcbiAgICAgICAgY29udCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgaWYgKGNvbnQpIHtcbiAgICAgICAgYWRkQW5kQ29udmVydChjb250LCBLRVlfTElTVEVORVJTLCBsaXN0ZW5lcik7XG4gICAgICAgIGFkZEFuZENvbnZlcnQoY29udCwgS0VZX1JBVywgcmF3RW1pdHRlcik7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICAvLyBUT0RPXG4gICAgICAgIC8vIGxpc3RlbmVycy5hZGQobGlzdGVuZXIpO1xuICAgICAgICAvLyByYXdFbWl0dGVycy5hZGQocmF3RW1pdHRlcik7XG4gICAgICAgIGNvbnQgPSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnM6IGxpc3RlbmVyLFxuICAgICAgICAgICAgcmF3RW1pdHRlcnM6IHJhd0VtaXR0ZXIsXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgd2F0Y2hlcjogd2F0Y2hGaWxlKGZ1bGxQYXRoLCBvcHRpb25zLCAoY3VyciwgcHJldikgPT4ge1xuICAgICAgICAgICAgICAgIGZvcmVhY2goY29udC5yYXdFbWl0dGVycywgKHJhd0VtaXR0ZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmF3RW1pdHRlcihFVi5DSEFOR0UsIGZ1bGxQYXRoLCB7IGN1cnIsIHByZXYgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgY29uc3QgY3Vycm10aW1lID0gY3Vyci5tdGltZU1zO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyLnNpemUgIT09IHByZXYuc2l6ZSB8fCBjdXJybXRpbWUgPiBwcmV2Lm10aW1lTXMgfHwgY3Vycm10aW1lID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcmVhY2goY29udC5saXN0ZW5lcnMsIChsaXN0ZW5lcikgPT4gbGlzdGVuZXIocGF0aCwgY3VycikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLFxuICAgICAgICB9O1xuICAgICAgICBGc1dhdGNoRmlsZUluc3RhbmNlcy5zZXQoZnVsbFBhdGgsIGNvbnQpO1xuICAgIH1cbiAgICAvLyBjb25zdCBpbmRleCA9IGNvbnQubGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpO1xuICAgIC8vIFJlbW92ZXMgdGhpcyBpbnN0YW5jZSdzIGxpc3RlbmVycyBhbmQgY2xvc2VzIHRoZSB1bmRlcmx5aW5nIGZzX3dhdGNoRmlsZVxuICAgIC8vIGluc3RhbmNlIGlmIHRoZXJlIGFyZSBubyBtb3JlIGxpc3RlbmVycyBsZWZ0LlxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIGRlbEZyb21TZXQoY29udCwgS0VZX0xJU1RFTkVSUywgbGlzdGVuZXIpO1xuICAgICAgICBkZWxGcm9tU2V0KGNvbnQsIEtFWV9SQVcsIHJhd0VtaXR0ZXIpO1xuICAgICAgICBpZiAoaXNFbXB0eVNldChjb250Lmxpc3RlbmVycykpIHtcbiAgICAgICAgICAgIEZzV2F0Y2hGaWxlSW5zdGFuY2VzLmRlbGV0ZShmdWxsUGF0aCk7XG4gICAgICAgICAgICB1bndhdGNoRmlsZShmdWxsUGF0aCk7XG4gICAgICAgICAgICBjb250Lm9wdGlvbnMgPSBjb250LndhdGNoZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBPYmplY3QuZnJlZXplKGNvbnQpO1xuICAgICAgICB9XG4gICAgfTtcbn07XG4vKipcbiAqIEBtaXhpblxuICovXG5leHBvcnQgY2xhc3MgTm9kZUZzSGFuZGxlciB7XG4gICAgY29uc3RydWN0b3IoZnNXKSB7XG4gICAgICAgIHRoaXMuZnN3ID0gZnNXO1xuICAgICAgICB0aGlzLl9ib3VuZEhhbmRsZUVycm9yID0gKGVycm9yKSA9PiBmc1cuX2hhbmRsZUVycm9yKGVycm9yKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogV2F0Y2ggZmlsZSBmb3IgY2hhbmdlcyB3aXRoIGZzX3dhdGNoRmlsZSBvciBmc193YXRjaC5cbiAgICAgKiBAcGFyYW0gcGF0aCB0byBmaWxlIG9yIGRpclxuICAgICAqIEBwYXJhbSBsaXN0ZW5lciBvbiBmcyBjaGFuZ2VcbiAgICAgKiBAcmV0dXJucyBjbG9zZXIgZm9yIHRoZSB3YXRjaGVyIGluc3RhbmNlXG4gICAgICovXG4gICAgX3dhdGNoV2l0aE5vZGVGcyhwYXRoLCBsaXN0ZW5lcikge1xuICAgICAgICBjb25zdCBvcHRzID0gdGhpcy5mc3cub3B0aW9ucztcbiAgICAgICAgY29uc3QgZGlyZWN0b3J5ID0gc3lzUGF0aC5kaXJuYW1lKHBhdGgpO1xuICAgICAgICBjb25zdCBiYXNlbmFtZSA9IHN5c1BhdGguYmFzZW5hbWUocGF0aCk7XG4gICAgICAgIGNvbnN0IHBhcmVudCA9IHRoaXMuZnN3Ll9nZXRXYXRjaGVkRGlyKGRpcmVjdG9yeSk7XG4gICAgICAgIHBhcmVudC5hZGQoYmFzZW5hbWUpO1xuICAgICAgICBjb25zdCBhYnNvbHV0ZVBhdGggPSBzeXNQYXRoLnJlc29sdmUocGF0aCk7XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgICAgICBwZXJzaXN0ZW50OiBvcHRzLnBlcnNpc3RlbnQsXG4gICAgICAgIH07XG4gICAgICAgIGlmICghbGlzdGVuZXIpXG4gICAgICAgICAgICBsaXN0ZW5lciA9IEVNUFRZX0ZOO1xuICAgICAgICBsZXQgY2xvc2VyO1xuICAgICAgICBpZiAob3B0cy51c2VQb2xsaW5nKSB7XG4gICAgICAgICAgICBjb25zdCBlbmFibGVCaW4gPSBvcHRzLmludGVydmFsICE9PSBvcHRzLmJpbmFyeUludGVydmFsO1xuICAgICAgICAgICAgb3B0aW9ucy5pbnRlcnZhbCA9IGVuYWJsZUJpbiAmJiBpc0JpbmFyeVBhdGgoYmFzZW5hbWUpID8gb3B0cy5iaW5hcnlJbnRlcnZhbCA6IG9wdHMuaW50ZXJ2YWw7XG4gICAgICAgICAgICBjbG9zZXIgPSBzZXRGc1dhdGNoRmlsZUxpc3RlbmVyKHBhdGgsIGFic29sdXRlUGF0aCwgb3B0aW9ucywge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLFxuICAgICAgICAgICAgICAgIHJhd0VtaXR0ZXI6IHRoaXMuZnN3Ll9lbWl0UmF3LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjbG9zZXIgPSBzZXRGc1dhdGNoTGlzdGVuZXIocGF0aCwgYWJzb2x1dGVQYXRoLCBvcHRpb25zLCB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXIsXG4gICAgICAgICAgICAgICAgZXJySGFuZGxlcjogdGhpcy5fYm91bmRIYW5kbGVFcnJvcixcbiAgICAgICAgICAgICAgICByYXdFbWl0dGVyOiB0aGlzLmZzdy5fZW1pdFJhdyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjbG9zZXI7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFdhdGNoIGEgZmlsZSBhbmQgZW1pdCBhZGQgZXZlbnQgaWYgd2FycmFudGVkLlxuICAgICAqIEByZXR1cm5zIGNsb3NlciBmb3IgdGhlIHdhdGNoZXIgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBfaGFuZGxlRmlsZShmaWxlLCBzdGF0cywgaW5pdGlhbEFkZCkge1xuICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGlybmFtZSA9IHN5c1BhdGguZGlybmFtZShmaWxlKTtcbiAgICAgICAgY29uc3QgYmFzZW5hbWUgPSBzeXNQYXRoLmJhc2VuYW1lKGZpbGUpO1xuICAgICAgICBjb25zdCBwYXJlbnQgPSB0aGlzLmZzdy5fZ2V0V2F0Y2hlZERpcihkaXJuYW1lKTtcbiAgICAgICAgLy8gc3RhdHMgaXMgYWx3YXlzIHByZXNlbnRcbiAgICAgICAgbGV0IHByZXZTdGF0cyA9IHN0YXRzO1xuICAgICAgICAvLyBpZiB0aGUgZmlsZSBpcyBhbHJlYWR5IGJlaW5nIHdhdGNoZWQsIGRvIG5vdGhpbmdcbiAgICAgICAgaWYgKHBhcmVudC5oYXMoYmFzZW5hbWUpKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCBsaXN0ZW5lciA9IGFzeW5jIChwYXRoLCBuZXdTdGF0cykgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmZzdy5fdGhyb3R0bGUoVEhST1RUTEVfTU9ERV9XQVRDSCwgZmlsZSwgNSkpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKCFuZXdTdGF0cyB8fCBuZXdTdGF0cy5tdGltZU1zID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3U3RhdHMgPSBhd2FpdCBzdGF0KGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayB0aGF0IGNoYW5nZSBldmVudCB3YXMgbm90IGZpcmVkIGJlY2F1c2Ugb2YgY2hhbmdlZCBvbmx5IGFjY2Vzc1RpbWUuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGF0ID0gbmV3U3RhdHMuYXRpbWVNcztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbXQgPSBuZXdTdGF0cy5tdGltZU1zO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWF0IHx8IGF0IDw9IG10IHx8IG10ICE9PSBwcmV2U3RhdHMubXRpbWVNcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX2VtaXQoRVYuQ0hBTkdFLCBmaWxlLCBuZXdTdGF0cyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKChpc01hY29zIHx8IGlzTGludXggfHwgaXNGcmVlQlNEKSAmJiBwcmV2U3RhdHMuaW5vICE9PSBuZXdTdGF0cy5pbm8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9jbG9zZUZpbGUocGF0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmV2U3RhdHMgPSBuZXdTdGF0cztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNsb3NlciA9IHRoaXMuX3dhdGNoV2l0aE5vZGVGcyhmaWxlLCBsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xvc2VyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9hZGRQYXRoQ2xvc2VyKHBhdGgsIGNsb3Nlcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmV2U3RhdHMgPSBuZXdTdGF0cztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRml4IGlzc3VlcyB3aGVyZSBtdGltZSBpcyBudWxsIGJ1dCBmaWxlIGlzIHN0aWxsIHByZXNlbnRcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX3JlbW92ZShkaXJuYW1lLCBiYXNlbmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGFkZCBpcyBhYm91dCB0byBiZSBlbWl0dGVkIGlmIGZpbGUgbm90IGFscmVhZHkgdHJhY2tlZCBpbiBwYXJlbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHBhcmVudC5oYXMoYmFzZW5hbWUpKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgdGhhdCBjaGFuZ2UgZXZlbnQgd2FzIG5vdCBmaXJlZCBiZWNhdXNlIG9mIGNoYW5nZWQgb25seSBhY2Nlc3NUaW1lLlxuICAgICAgICAgICAgICAgIGNvbnN0IGF0ID0gbmV3U3RhdHMuYXRpbWVNcztcbiAgICAgICAgICAgICAgICBjb25zdCBtdCA9IG5ld1N0YXRzLm10aW1lTXM7XG4gICAgICAgICAgICAgICAgaWYgKCFhdCB8fCBhdCA8PSBtdCB8fCBtdCAhPT0gcHJldlN0YXRzLm10aW1lTXMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX2VtaXQoRVYuQ0hBTkdFLCBmaWxlLCBuZXdTdGF0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHByZXZTdGF0cyA9IG5ld1N0YXRzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICAvLyBraWNrIG9mZiB0aGUgd2F0Y2hlclxuICAgICAgICBjb25zdCBjbG9zZXIgPSB0aGlzLl93YXRjaFdpdGhOb2RlRnMoZmlsZSwgbGlzdGVuZXIpO1xuICAgICAgICAvLyBlbWl0IGFuIGFkZCBldmVudCBpZiB3ZSdyZSBzdXBwb3NlZCB0b1xuICAgICAgICBpZiAoIShpbml0aWFsQWRkICYmIHRoaXMuZnN3Lm9wdGlvbnMuaWdub3JlSW5pdGlhbCkgJiYgdGhpcy5mc3cuX2lzbnRJZ25vcmVkKGZpbGUpKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuZnN3Ll90aHJvdHRsZShFVi5BREQsIGZpbGUsIDApKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIHRoaXMuZnN3Ll9lbWl0KEVWLkFERCwgZmlsZSwgc3RhdHMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjbG9zZXI7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBzeW1saW5rcyBlbmNvdW50ZXJlZCB3aGlsZSByZWFkaW5nIGEgZGlyLlxuICAgICAqIEBwYXJhbSBlbnRyeSByZXR1cm5lZCBieSByZWFkZGlycFxuICAgICAqIEBwYXJhbSBkaXJlY3RvcnkgcGF0aCBvZiBkaXIgYmVpbmcgcmVhZFxuICAgICAqIEBwYXJhbSBwYXRoIG9mIHRoaXMgaXRlbVxuICAgICAqIEBwYXJhbSBpdGVtIGJhc2VuYW1lIG9mIHRoaXMgaXRlbVxuICAgICAqIEByZXR1cm5zIHRydWUgaWYgbm8gbW9yZSBwcm9jZXNzaW5nIGlzIG5lZWRlZCBmb3IgdGhpcyBlbnRyeS5cbiAgICAgKi9cbiAgICBhc3luYyBfaGFuZGxlU3ltbGluayhlbnRyeSwgZGlyZWN0b3J5LCBwYXRoLCBpdGVtKSB7XG4gICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBmdWxsID0gZW50cnkuZnVsbFBhdGg7XG4gICAgICAgIGNvbnN0IGRpciA9IHRoaXMuZnN3Ll9nZXRXYXRjaGVkRGlyKGRpcmVjdG9yeSk7XG4gICAgICAgIGlmICghdGhpcy5mc3cub3B0aW9ucy5mb2xsb3dTeW1saW5rcykge1xuICAgICAgICAgICAgLy8gd2F0Y2ggc3ltbGluayBkaXJlY3RseSAoZG9uJ3QgZm9sbG93KSBhbmQgZGV0ZWN0IGNoYW5nZXNcbiAgICAgICAgICAgIHRoaXMuZnN3Ll9pbmNyUmVhZHlDb3VudCgpO1xuICAgICAgICAgICAgbGV0IGxpbmtQYXRoO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBsaW5rUGF0aCA9IGF3YWl0IGZzcmVhbHBhdGgocGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9lbWl0UmVhZHkoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKGRpci5oYXMoaXRlbSkpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mc3cuX3N5bWxpbmtQYXRocy5nZXQoZnVsbCkgIT09IGxpbmtQYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9zeW1saW5rUGF0aHMuc2V0KGZ1bGwsIGxpbmtQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX2VtaXQoRVYuQ0hBTkdFLCBwYXRoLCBlbnRyeS5zdGF0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZGlyLmFkZChpdGVtKTtcbiAgICAgICAgICAgICAgICB0aGlzLmZzdy5fc3ltbGlua1BhdGhzLnNldChmdWxsLCBsaW5rUGF0aCk7XG4gICAgICAgICAgICAgICAgdGhpcy5mc3cuX2VtaXQoRVYuQURELCBwYXRoLCBlbnRyeS5zdGF0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmZzdy5fZW1pdFJlYWR5KCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBkb24ndCBmb2xsb3cgdGhlIHNhbWUgc3ltbGluayBtb3JlIHRoYW4gb25jZVxuICAgICAgICBpZiAodGhpcy5mc3cuX3N5bWxpbmtQYXRocy5oYXMoZnVsbCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZnN3Ll9zeW1saW5rUGF0aHMuc2V0KGZ1bGwsIHRydWUpO1xuICAgIH1cbiAgICBfaGFuZGxlUmVhZChkaXJlY3RvcnksIGluaXRpYWxBZGQsIHdoLCB0YXJnZXQsIGRpciwgZGVwdGgsIHRocm90dGxlcikge1xuICAgICAgICAvLyBOb3JtYWxpemUgdGhlIGRpcmVjdG9yeSBuYW1lIG9uIFdpbmRvd3NcbiAgICAgICAgZGlyZWN0b3J5ID0gc3lzUGF0aC5qb2luKGRpcmVjdG9yeSwgJycpO1xuICAgICAgICB0aHJvdHRsZXIgPSB0aGlzLmZzdy5fdGhyb3R0bGUoJ3JlYWRkaXInLCBkaXJlY3RvcnksIDEwMDApO1xuICAgICAgICBpZiAoIXRocm90dGxlcilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY29uc3QgcHJldmlvdXMgPSB0aGlzLmZzdy5fZ2V0V2F0Y2hlZERpcih3aC5wYXRoKTtcbiAgICAgICAgY29uc3QgY3VycmVudCA9IG5ldyBTZXQoKTtcbiAgICAgICAgbGV0IHN0cmVhbSA9IHRoaXMuZnN3Ll9yZWFkZGlycChkaXJlY3RvcnksIHtcbiAgICAgICAgICAgIGZpbGVGaWx0ZXI6IChlbnRyeSkgPT4gd2guZmlsdGVyUGF0aChlbnRyeSksXG4gICAgICAgICAgICBkaXJlY3RvcnlGaWx0ZXI6IChlbnRyeSkgPT4gd2guZmlsdGVyRGlyKGVudHJ5KSxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghc3RyZWFtKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBzdHJlYW1cbiAgICAgICAgICAgIC5vbihTVFJfREFUQSwgYXN5bmMgKGVudHJ5KSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKSB7XG4gICAgICAgICAgICAgICAgc3RyZWFtID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBlbnRyeS5wYXRoO1xuICAgICAgICAgICAgbGV0IHBhdGggPSBzeXNQYXRoLmpvaW4oZGlyZWN0b3J5LCBpdGVtKTtcbiAgICAgICAgICAgIGN1cnJlbnQuYWRkKGl0ZW0pO1xuICAgICAgICAgICAgaWYgKGVudHJ5LnN0YXRzLmlzU3ltYm9saWNMaW5rKCkgJiZcbiAgICAgICAgICAgICAgICAoYXdhaXQgdGhpcy5faGFuZGxlU3ltbGluayhlbnRyeSwgZGlyZWN0b3J5LCBwYXRoLCBpdGVtKSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKSB7XG4gICAgICAgICAgICAgICAgc3RyZWFtID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZpbGVzIHRoYXQgcHJlc2VudCBpbiBjdXJyZW50IGRpcmVjdG9yeSBzbmFwc2hvdFxuICAgICAgICAgICAgLy8gYnV0IGFic2VudCBpbiBwcmV2aW91cyBhcmUgYWRkZWQgdG8gd2F0Y2ggbGlzdCBhbmRcbiAgICAgICAgICAgIC8vIGVtaXQgYGFkZGAgZXZlbnQuXG4gICAgICAgICAgICBpZiAoaXRlbSA9PT0gdGFyZ2V0IHx8ICghdGFyZ2V0ICYmICFwcmV2aW91cy5oYXMoaXRlbSkpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5mc3cuX2luY3JSZWFkeUNvdW50KCk7XG4gICAgICAgICAgICAgICAgLy8gZW5zdXJlIHJlbGF0aXZlbmVzcyBvZiBwYXRoIGlzIHByZXNlcnZlZCBpbiBjYXNlIG9mIHdhdGNoZXIgcmV1c2VcbiAgICAgICAgICAgICAgICBwYXRoID0gc3lzUGF0aC5qb2luKGRpciwgc3lzUGF0aC5yZWxhdGl2ZShkaXIsIHBhdGgpKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9hZGRUb05vZGVGcyhwYXRoLCBpbml0aWFsQWRkLCB3aCwgZGVwdGggKyAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgICAgIC5vbihFVi5FUlJPUiwgdGhpcy5fYm91bmRIYW5kbGVFcnJvcik7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAoIXN0cmVhbSlcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KCk7XG4gICAgICAgICAgICBzdHJlYW0ub25jZShTVFJfRU5ELCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZCkge1xuICAgICAgICAgICAgICAgICAgICBzdHJlYW0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3Qgd2FzVGhyb3R0bGVkID0gdGhyb3R0bGVyID8gdGhyb3R0bGVyLmNsZWFyKCkgOiBmYWxzZTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHVuZGVmaW5lZCk7XG4gICAgICAgICAgICAgICAgLy8gRmlsZXMgdGhhdCBhYnNlbnQgaW4gY3VycmVudCBkaXJlY3Rvcnkgc25hcHNob3RcbiAgICAgICAgICAgICAgICAvLyBidXQgcHJlc2VudCBpbiBwcmV2aW91cyBlbWl0IGByZW1vdmVgIGV2ZW50XG4gICAgICAgICAgICAgICAgLy8gYW5kIGFyZSByZW1vdmVkIGZyb20gQHdhdGNoZWRbZGlyZWN0b3J5XS5cbiAgICAgICAgICAgICAgICBwcmV2aW91c1xuICAgICAgICAgICAgICAgICAgICAuZ2V0Q2hpbGRyZW4oKVxuICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKChpdGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtICE9PSBkaXJlY3RvcnkgJiYgIWN1cnJlbnQuaGFzKGl0ZW0pO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9yZW1vdmUoZGlyZWN0b3J5LCBpdGVtKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBzdHJlYW0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgLy8gb25lIG1vcmUgdGltZSBmb3IgYW55IG1pc3NlZCBpbiBjYXNlIGNoYW5nZXMgY2FtZSBpbiBleHRyZW1lbHkgcXVpY2tseVxuICAgICAgICAgICAgICAgIGlmICh3YXNUaHJvdHRsZWQpXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZVJlYWQoZGlyZWN0b3J5LCBmYWxzZSwgd2gsIHRhcmdldCwgZGlyLCBkZXB0aCwgdGhyb3R0bGVyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmVhZCBkaXJlY3RvcnkgdG8gYWRkIC8gcmVtb3ZlIGZpbGVzIGZyb20gYEB3YXRjaGVkYCBsaXN0IGFuZCByZS1yZWFkIGl0IG9uIGNoYW5nZS5cbiAgICAgKiBAcGFyYW0gZGlyIGZzIHBhdGhcbiAgICAgKiBAcGFyYW0gc3RhdHNcbiAgICAgKiBAcGFyYW0gaW5pdGlhbEFkZFxuICAgICAqIEBwYXJhbSBkZXB0aCByZWxhdGl2ZSB0byB1c2VyLXN1cHBsaWVkIHBhdGhcbiAgICAgKiBAcGFyYW0gdGFyZ2V0IGNoaWxkIHBhdGggdGFyZ2V0ZWQgZm9yIHdhdGNoXG4gICAgICogQHBhcmFtIHdoIENvbW1vbiB3YXRjaCBoZWxwZXJzIGZvciB0aGlzIHBhdGhcbiAgICAgKiBAcGFyYW0gcmVhbHBhdGhcbiAgICAgKiBAcmV0dXJucyBjbG9zZXIgZm9yIHRoZSB3YXRjaGVyIGluc3RhbmNlLlxuICAgICAqL1xuICAgIGFzeW5jIF9oYW5kbGVEaXIoZGlyLCBzdGF0cywgaW5pdGlhbEFkZCwgZGVwdGgsIHRhcmdldCwgd2gsIHJlYWxwYXRoKSB7XG4gICAgICAgIGNvbnN0IHBhcmVudERpciA9IHRoaXMuZnN3Ll9nZXRXYXRjaGVkRGlyKHN5c1BhdGguZGlybmFtZShkaXIpKTtcbiAgICAgICAgY29uc3QgdHJhY2tlZCA9IHBhcmVudERpci5oYXMoc3lzUGF0aC5iYXNlbmFtZShkaXIpKTtcbiAgICAgICAgaWYgKCEoaW5pdGlhbEFkZCAmJiB0aGlzLmZzdy5vcHRpb25zLmlnbm9yZUluaXRpYWwpICYmICF0YXJnZXQgJiYgIXRyYWNrZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZnN3Ll9lbWl0KEVWLkFERF9ESVIsIGRpciwgc3RhdHMpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGVuc3VyZSBkaXIgaXMgdHJhY2tlZCAoaGFybWxlc3MgaWYgcmVkdW5kYW50KVxuICAgICAgICBwYXJlbnREaXIuYWRkKHN5c1BhdGguYmFzZW5hbWUoZGlyKSk7XG4gICAgICAgIHRoaXMuZnN3Ll9nZXRXYXRjaGVkRGlyKGRpcik7XG4gICAgICAgIGxldCB0aHJvdHRsZXI7XG4gICAgICAgIGxldCBjbG9zZXI7XG4gICAgICAgIGNvbnN0IG9EZXB0aCA9IHRoaXMuZnN3Lm9wdGlvbnMuZGVwdGg7XG4gICAgICAgIGlmICgob0RlcHRoID09IG51bGwgfHwgZGVwdGggPD0gb0RlcHRoKSAmJiAhdGhpcy5mc3cuX3N5bWxpbmtQYXRocy5oYXMocmVhbHBhdGgpKSB7XG4gICAgICAgICAgICBpZiAoIXRhcmdldCkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX2hhbmRsZVJlYWQoZGlyLCBpbml0aWFsQWRkLCB3aCwgdGFyZ2V0LCBkaXIsIGRlcHRoLCB0aHJvdHRsZXIpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNsb3NlciA9IHRoaXMuX3dhdGNoV2l0aE5vZGVGcyhkaXIsIChkaXJQYXRoLCBzdGF0cykgPT4ge1xuICAgICAgICAgICAgICAgIC8vIGlmIGN1cnJlbnQgZGlyZWN0b3J5IGlzIHJlbW92ZWQsIGRvIG5vdGhpbmdcbiAgICAgICAgICAgICAgICBpZiAoc3RhdHMgJiYgc3RhdHMubXRpbWVNcyA9PT0gMClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZVJlYWQoZGlyUGF0aCwgZmFsc2UsIHdoLCB0YXJnZXQsIGRpciwgZGVwdGgsIHRocm90dGxlcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2xvc2VyO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgYWRkZWQgZmlsZSwgZGlyZWN0b3J5LCBvciBnbG9iIHBhdHRlcm4uXG4gICAgICogRGVsZWdhdGVzIGNhbGwgdG8gX2hhbmRsZUZpbGUgLyBfaGFuZGxlRGlyIGFmdGVyIGNoZWNrcy5cbiAgICAgKiBAcGFyYW0gcGF0aCB0byBmaWxlIG9yIGlyXG4gICAgICogQHBhcmFtIGluaXRpYWxBZGQgd2FzIHRoZSBmaWxlIGFkZGVkIGF0IHdhdGNoIGluc3RhbnRpYXRpb24/XG4gICAgICogQHBhcmFtIHByaW9yV2ggZGVwdGggcmVsYXRpdmUgdG8gdXNlci1zdXBwbGllZCBwYXRoXG4gICAgICogQHBhcmFtIGRlcHRoIENoaWxkIHBhdGggYWN0dWFsbHkgdGFyZ2V0ZWQgZm9yIHdhdGNoXG4gICAgICogQHBhcmFtIHRhcmdldCBDaGlsZCBwYXRoIGFjdHVhbGx5IHRhcmdldGVkIGZvciB3YXRjaFxuICAgICAqL1xuICAgIGFzeW5jIF9hZGRUb05vZGVGcyhwYXRoLCBpbml0aWFsQWRkLCBwcmlvcldoLCBkZXB0aCwgdGFyZ2V0KSB7XG4gICAgICAgIGNvbnN0IHJlYWR5ID0gdGhpcy5mc3cuX2VtaXRSZWFkeTtcbiAgICAgICAgaWYgKHRoaXMuZnN3Ll9pc0lnbm9yZWQocGF0aCkgfHwgdGhpcy5mc3cuY2xvc2VkKSB7XG4gICAgICAgICAgICByZWFkeSgpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHdoID0gdGhpcy5mc3cuX2dldFdhdGNoSGVscGVycyhwYXRoKTtcbiAgICAgICAgaWYgKHByaW9yV2gpIHtcbiAgICAgICAgICAgIHdoLmZpbHRlclBhdGggPSAoZW50cnkpID0+IHByaW9yV2guZmlsdGVyUGF0aChlbnRyeSk7XG4gICAgICAgICAgICB3aC5maWx0ZXJEaXIgPSAoZW50cnkpID0+IHByaW9yV2guZmlsdGVyRGlyKGVudHJ5KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBldmFsdWF0ZSB3aGF0IGlzIGF0IHRoZSBwYXRoIHdlJ3JlIGJlaW5nIGFza2VkIHRvIHdhdGNoXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IHN0YXRNZXRob2RzW3doLnN0YXRNZXRob2RdKHdoLndhdGNoUGF0aCk7XG4gICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGlmICh0aGlzLmZzdy5faXNJZ25vcmVkKHdoLndhdGNoUGF0aCwgc3RhdHMpKSB7XG4gICAgICAgICAgICAgICAgcmVhZHkoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBmb2xsb3cgPSB0aGlzLmZzdy5vcHRpb25zLmZvbGxvd1N5bWxpbmtzO1xuICAgICAgICAgICAgbGV0IGNsb3NlcjtcbiAgICAgICAgICAgIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYWJzUGF0aCA9IHN5c1BhdGgucmVzb2x2ZShwYXRoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRQYXRoID0gZm9sbG93ID8gYXdhaXQgZnNyZWFscGF0aChwYXRoKSA6IHBhdGg7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGNsb3NlciA9IGF3YWl0IHRoaXMuX2hhbmRsZURpcih3aC53YXRjaFBhdGgsIHN0YXRzLCBpbml0aWFsQWRkLCBkZXB0aCwgdGFyZ2V0LCB3aCwgdGFyZ2V0UGF0aCk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIC8vIHByZXNlcnZlIHRoaXMgc3ltbGluaydzIHRhcmdldCBwYXRoXG4gICAgICAgICAgICAgICAgaWYgKGFic1BhdGggIT09IHRhcmdldFBhdGggJiYgdGFyZ2V0UGF0aCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9zeW1saW5rUGF0aHMuc2V0KGFic1BhdGgsIHRhcmdldFBhdGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHN0YXRzLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRQYXRoID0gZm9sbG93ID8gYXdhaXQgZnNyZWFscGF0aChwYXRoKSA6IHBhdGg7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudCA9IHN5c1BhdGguZGlybmFtZSh3aC53YXRjaFBhdGgpO1xuICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9nZXRXYXRjaGVkRGlyKHBhcmVudCkuYWRkKHdoLndhdGNoUGF0aCk7XG4gICAgICAgICAgICAgICAgdGhpcy5mc3cuX2VtaXQoRVYuQURELCB3aC53YXRjaFBhdGgsIHN0YXRzKTtcbiAgICAgICAgICAgICAgICBjbG9zZXIgPSBhd2FpdCB0aGlzLl9oYW5kbGVEaXIocGFyZW50LCBzdGF0cywgaW5pdGlhbEFkZCwgZGVwdGgsIHBhdGgsIHdoLCB0YXJnZXRQYXRoKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgLy8gcHJlc2VydmUgdGhpcyBzeW1saW5rJ3MgdGFyZ2V0IHBhdGhcbiAgICAgICAgICAgICAgICBpZiAodGFyZ2V0UGF0aCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9zeW1saW5rUGF0aHMuc2V0KHN5c1BhdGgucmVzb2x2ZShwYXRoKSwgdGFyZ2V0UGF0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY2xvc2VyID0gdGhpcy5faGFuZGxlRmlsZSh3aC53YXRjaFBhdGgsIHN0YXRzLCBpbml0aWFsQWRkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlYWR5KCk7XG4gICAgICAgICAgICBpZiAoY2xvc2VyKVxuICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9hZGRQYXRoQ2xvc2VyKHBhdGgsIGNsb3Nlcik7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5mc3cuX2hhbmRsZUVycm9yKGVycm9yKSkge1xuICAgICAgICAgICAgICAgIHJlYWR5KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhdGg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCAiLyoqXG4gKiBEaXNjb3ZlciB0d2Vha3MgdW5kZXIgPHVzZXJSb290Pi90d2Vha3MuIEVhY2ggdHdlYWsgaXMgYSBkaXJlY3Rvcnkgd2l0aCBhXG4gKiBtYW5pZmVzdC5qc29uIGFuZCBhbiBlbnRyeSBzY3JpcHQuIEVudHJ5IHJlc29sdXRpb24gaXMgbWFuaWZlc3QubWFpbiBmaXJzdCxcbiAqIHRoZW4gaW5kZXguanMsIGluZGV4Lm1qcywgYW5kIGluZGV4LmNqcy5cbiAqXG4gKiBUaGUgbWFuaWZlc3QgZ2F0ZSBpcyBpbnRlbnRpb25hbGx5IHN0cmljdC4gQSB0d2VhayBtdXN0IGlkZW50aWZ5IGl0cyBHaXRIdWJcbiAqIHJlcG9zaXRvcnkgc28gdGhlIG1hbmFnZXIgY2FuIGNoZWNrIHJlbGVhc2VzIHdpdGhvdXQgZ3JhbnRpbmcgdGhlIHR3ZWFrIGFuXG4gKiB1cGRhdGUvaW5zdGFsbCBjaGFubmVsLiBVcGRhdGUgY2hlY2tzIGFyZSBhZHZpc29yeSBvbmx5LlxuICovXG5pbXBvcnQgeyByZWFkZGlyU3luYywgc3RhdFN5bmMsIHJlYWRGaWxlU3luYywgZXhpc3RzU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuaW1wb3J0IHR5cGUgeyBUd2Vha01hbmlmZXN0IH0gZnJvbSBcIkBjb2RleC1wbHVzcGx1cy9zZGtcIjtcblxuZXhwb3J0IGludGVyZmFjZSBEaXNjb3ZlcmVkVHdlYWsge1xuICBkaXI6IHN0cmluZztcbiAgZW50cnk6IHN0cmluZztcbiAgbWFuaWZlc3Q6IFR3ZWFrTWFuaWZlc3Q7XG59XG5cbmNvbnN0IEVOVFJZX0NBTkRJREFURVMgPSBbXCJpbmRleC5qc1wiLCBcImluZGV4LmNqc1wiLCBcImluZGV4Lm1qc1wiXTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRpc2NvdmVyVHdlYWtzKHR3ZWFrc0Rpcjogc3RyaW5nKTogRGlzY292ZXJlZFR3ZWFrW10ge1xuICBpZiAoIWV4aXN0c1N5bmModHdlYWtzRGlyKSkgcmV0dXJuIFtdO1xuICBjb25zdCBvdXQ6IERpc2NvdmVyZWRUd2Vha1tdID0gW107XG4gIGZvciAoY29uc3QgbmFtZSBvZiByZWFkZGlyU3luYyh0d2Vha3NEaXIpKSB7XG4gICAgY29uc3QgZGlyID0gam9pbih0d2Vha3NEaXIsIG5hbWUpO1xuICAgIGlmICghc3RhdFN5bmMoZGlyKS5pc0RpcmVjdG9yeSgpKSBjb250aW51ZTtcbiAgICBjb25zdCBtYW5pZmVzdFBhdGggPSBqb2luKGRpciwgXCJtYW5pZmVzdC5qc29uXCIpO1xuICAgIGlmICghZXhpc3RzU3luYyhtYW5pZmVzdFBhdGgpKSBjb250aW51ZTtcbiAgICBsZXQgbWFuaWZlc3Q6IFR3ZWFrTWFuaWZlc3Q7XG4gICAgdHJ5IHtcbiAgICAgIG1hbmlmZXN0ID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMobWFuaWZlc3RQYXRoLCBcInV0ZjhcIikpIGFzIFR3ZWFrTWFuaWZlc3Q7XG4gICAgfSBjYXRjaCB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKCFpc1ZhbGlkTWFuaWZlc3QobWFuaWZlc3QpKSBjb250aW51ZTtcbiAgICBjb25zdCBlbnRyeSA9IHJlc29sdmVFbnRyeShkaXIsIG1hbmlmZXN0KTtcbiAgICBpZiAoIWVudHJ5KSBjb250aW51ZTtcbiAgICBvdXQucHVzaCh7IGRpciwgZW50cnksIG1hbmlmZXN0IH0pO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbmZ1bmN0aW9uIGlzVmFsaWRNYW5pZmVzdChtOiBUd2Vha01hbmlmZXN0KTogYm9vbGVhbiB7XG4gIGlmICghbS5pZCB8fCAhbS5uYW1lIHx8ICFtLnZlcnNpb24gfHwgIW0uZ2l0aHViUmVwbykgcmV0dXJuIGZhbHNlO1xuICBpZiAoIS9eW2EtekEtWjAtOS5fLV0rXFwvW2EtekEtWjAtOS5fLV0rJC8udGVzdChtLmdpdGh1YlJlcG8pKSByZXR1cm4gZmFsc2U7XG4gIGlmIChtLnNjb3BlICYmICFbXCJyZW5kZXJlclwiLCBcIm1haW5cIiwgXCJib3RoXCJdLmluY2x1ZGVzKG0uc2NvcGUpKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlRW50cnkoZGlyOiBzdHJpbmcsIG06IFR3ZWFrTWFuaWZlc3QpOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKG0ubWFpbikge1xuICAgIGNvbnN0IHAgPSBqb2luKGRpciwgbS5tYWluKTtcbiAgICByZXR1cm4gZXhpc3RzU3luYyhwKSA/IHAgOiBudWxsO1xuICB9XG4gIGZvciAoY29uc3QgYyBvZiBFTlRSWV9DQU5ESURBVEVTKSB7XG4gICAgY29uc3QgcCA9IGpvaW4oZGlyLCBjKTtcbiAgICBpZiAoZXhpc3RzU3luYyhwKSkgcmV0dXJuIHA7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG4iLCAiLyoqXG4gKiBEaXNrLWJhY2tlZCBrZXkvdmFsdWUgc3RvcmFnZSBmb3IgbWFpbi1wcm9jZXNzIHR3ZWFrcy5cbiAqXG4gKiBFYWNoIHR3ZWFrIGdldHMgb25lIEpTT04gZmlsZSB1bmRlciBgPHVzZXJSb290Pi9zdG9yYWdlLzxpZD4uanNvbmAuXG4gKiBXcml0ZXMgYXJlIGRlYm91bmNlZCAoNTAgbXMpIGFuZCBhdG9taWMgKHdyaXRlIHRvIDxmaWxlPi50bXAgdGhlbiByZW5hbWUpLlxuICogUmVhZHMgYXJlIGVhZ2VyICsgY2FjaGVkIGluLW1lbW9yeTsgd2UgbG9hZCBvbiBmaXJzdCBhY2Nlc3MuXG4gKi9cbmltcG9ydCB7XG4gIGV4aXN0c1N5bmMsXG4gIG1rZGlyU3luYyxcbiAgcmVhZEZpbGVTeW5jLFxuICByZW5hbWVTeW5jLFxuICB3cml0ZUZpbGVTeW5jLFxufSBmcm9tIFwibm9kZTpmc1wiO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gXCJub2RlOnBhdGhcIjtcblxuZXhwb3J0IGludGVyZmFjZSBEaXNrU3RvcmFnZSB7XG4gIGdldDxUPihrZXk6IHN0cmluZywgZGVmYXVsdFZhbHVlPzogVCk6IFQ7XG4gIHNldChrZXk6IHN0cmluZywgdmFsdWU6IHVua25vd24pOiB2b2lkO1xuICBkZWxldGUoa2V5OiBzdHJpbmcpOiB2b2lkO1xuICBhbGwoKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIGZsdXNoKCk6IHZvaWQ7XG59XG5cbmNvbnN0IEZMVVNIX0RFTEFZX01TID0gNTA7XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVEaXNrU3RvcmFnZShyb290RGlyOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiBEaXNrU3RvcmFnZSB7XG4gIGNvbnN0IGRpciA9IGpvaW4ocm9vdERpciwgXCJzdG9yYWdlXCIpO1xuICBta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgY29uc3QgZmlsZSA9IGpvaW4oZGlyLCBgJHtzYW5pdGl6ZShpZCl9Lmpzb25gKTtcblxuICBsZXQgZGF0YTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgaWYgKGV4aXN0c1N5bmMoZmlsZSkpIHtcbiAgICB0cnkge1xuICAgICAgZGF0YSA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKGZpbGUsIFwidXRmOFwiKSkgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBDb3JydXB0IGZpbGUgXHUyMDE0IHN0YXJ0IGZyZXNoLCBidXQgZG9uJ3QgY2xvYmJlciB0aGUgb3JpZ2luYWwgdW50aWwgd2VcbiAgICAgIC8vIHN1Y2Nlc3NmdWxseSB3cml0ZSBhZ2Fpbi4gKE1vdmUgaXQgYXNpZGUgZm9yIGZvcmVuc2ljcy4pXG4gICAgICB0cnkge1xuICAgICAgICByZW5hbWVTeW5jKGZpbGUsIGAke2ZpbGV9LmNvcnJ1cHQtJHtEYXRlLm5vdygpfWApO1xuICAgICAgfSBjYXRjaCB7fVxuICAgICAgZGF0YSA9IHt9O1xuICAgIH1cbiAgfVxuXG4gIGxldCBkaXJ0eSA9IGZhbHNlO1xuICBsZXQgdGltZXI6IE5vZGVKUy5UaW1lb3V0IHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3Qgc2NoZWR1bGVGbHVzaCA9ICgpID0+IHtcbiAgICBkaXJ0eSA9IHRydWU7XG4gICAgaWYgKHRpbWVyKSByZXR1cm47XG4gICAgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRpbWVyID0gbnVsbDtcbiAgICAgIGlmIChkaXJ0eSkgZmx1c2goKTtcbiAgICB9LCBGTFVTSF9ERUxBWV9NUyk7XG4gIH07XG5cbiAgY29uc3QgZmx1c2ggPSAoKTogdm9pZCA9PiB7XG4gICAgaWYgKCFkaXJ0eSkgcmV0dXJuO1xuICAgIGNvbnN0IHRtcCA9IGAke2ZpbGV9LnRtcGA7XG4gICAgdHJ5IHtcbiAgICAgIHdyaXRlRmlsZVN5bmModG1wLCBKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCAyKSwgXCJ1dGY4XCIpO1xuICAgICAgcmVuYW1lU3luYyh0bXAsIGZpbGUpO1xuICAgICAgZGlydHkgPSBmYWxzZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBMZWF2ZSBkaXJ0eT10cnVlIHNvIGEgZnV0dXJlIGZsdXNoIHJldHJpZXMuXG4gICAgICBjb25zb2xlLmVycm9yKFwiW2NvZGV4LXBsdXNwbHVzXSBzdG9yYWdlIGZsdXNoIGZhaWxlZDpcIiwgaWQsIGUpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4ge1xuICAgIGdldDogPFQ+KGs6IHN0cmluZywgZD86IFQpOiBUID0+XG4gICAgICBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoZGF0YSwgaykgPyAoZGF0YVtrXSBhcyBUKSA6IChkIGFzIFQpLFxuICAgIHNldChrLCB2KSB7XG4gICAgICBkYXRhW2tdID0gdjtcbiAgICAgIHNjaGVkdWxlRmx1c2goKTtcbiAgICB9LFxuICAgIGRlbGV0ZShrKSB7XG4gICAgICBpZiAoayBpbiBkYXRhKSB7XG4gICAgICAgIGRlbGV0ZSBkYXRhW2tdO1xuICAgICAgICBzY2hlZHVsZUZsdXNoKCk7XG4gICAgICB9XG4gICAgfSxcbiAgICBhbGw6ICgpID0+ICh7IC4uLmRhdGEgfSksXG4gICAgZmx1c2gsXG4gIH07XG59XG5cbmZ1bmN0aW9uIHNhbml0aXplKGlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICAvLyBUd2VhayBpZHMgYXJlIGF1dGhvci1jb250cm9sbGVkOyBjbGFtcCB0byBhIHNhZmUgZmlsZW5hbWUuXG4gIHJldHVybiBpZC5yZXBsYWNlKC9bXmEtekEtWjAtOS5fQC1dL2csIFwiX1wiKTtcbn1cbiIsICJpbXBvcnQgeyBleGlzdHNTeW5jLCBta2RpclN5bmMsIHJlYWRGaWxlU3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBkaXJuYW1lLCBpc0Fic29sdXRlLCByZXNvbHZlIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuaW1wb3J0IHR5cGUgeyBUd2Vha01jcFNlcnZlciB9IGZyb20gXCJAY29kZXgtcGx1c3BsdXMvc2RrXCI7XG5cbmV4cG9ydCBjb25zdCBNQ1BfTUFOQUdFRF9TVEFSVCA9IFwiIyBCRUdJTiBDT0RFWCsrIE1BTkFHRUQgTUNQIFNFUlZFUlNcIjtcbmV4cG9ydCBjb25zdCBNQ1BfTUFOQUdFRF9FTkQgPSBcIiMgRU5EIENPREVYKysgTUFOQUdFRCBNQ1AgU0VSVkVSU1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIE1jcFN5bmNUd2VhayB7XG4gIGRpcjogc3RyaW5nO1xuICBtYW5pZmVzdDoge1xuICAgIGlkOiBzdHJpbmc7XG4gICAgbWNwPzogVHdlYWtNY3BTZXJ2ZXI7XG4gIH07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnVpbHRNYW5hZ2VkTWNwQmxvY2sge1xuICBibG9jazogc3RyaW5nO1xuICBzZXJ2ZXJOYW1lczogc3RyaW5nW107XG4gIHNraXBwZWRTZXJ2ZXJOYW1lczogc3RyaW5nW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWFuYWdlZE1jcFN5bmNSZXN1bHQgZXh0ZW5kcyBCdWlsdE1hbmFnZWRNY3BCbG9jayB7XG4gIGNoYW5nZWQ6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzeW5jTWFuYWdlZE1jcFNlcnZlcnMoe1xuICBjb25maWdQYXRoLFxuICB0d2Vha3MsXG59OiB7XG4gIGNvbmZpZ1BhdGg6IHN0cmluZztcbiAgdHdlYWtzOiBNY3BTeW5jVHdlYWtbXTtcbn0pOiBNYW5hZ2VkTWNwU3luY1Jlc3VsdCB7XG4gIGNvbnN0IGN1cnJlbnQgPSBleGlzdHNTeW5jKGNvbmZpZ1BhdGgpID8gcmVhZEZpbGVTeW5jKGNvbmZpZ1BhdGgsIFwidXRmOFwiKSA6IFwiXCI7XG4gIGNvbnN0IGJ1aWx0ID0gYnVpbGRNYW5hZ2VkTWNwQmxvY2sodHdlYWtzLCBjdXJyZW50KTtcbiAgY29uc3QgbmV4dCA9IG1lcmdlTWFuYWdlZE1jcEJsb2NrKGN1cnJlbnQsIGJ1aWx0LmJsb2NrKTtcblxuICBpZiAobmV4dCAhPT0gY3VycmVudCkge1xuICAgIG1rZGlyU3luYyhkaXJuYW1lKGNvbmZpZ1BhdGgpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICB3cml0ZUZpbGVTeW5jKGNvbmZpZ1BhdGgsIG5leHQsIFwidXRmOFwiKTtcbiAgfVxuXG4gIHJldHVybiB7IC4uLmJ1aWx0LCBjaGFuZ2VkOiBuZXh0ICE9PSBjdXJyZW50IH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZE1hbmFnZWRNY3BCbG9jayhcbiAgdHdlYWtzOiBNY3BTeW5jVHdlYWtbXSxcbiAgZXhpc3RpbmdUb21sID0gXCJcIixcbik6IEJ1aWx0TWFuYWdlZE1jcEJsb2NrIHtcbiAgY29uc3QgbWFudWFsVG9tbCA9IHN0cmlwTWFuYWdlZE1jcEJsb2NrKGV4aXN0aW5nVG9tbCk7XG4gIGNvbnN0IG1hbnVhbE5hbWVzID0gZmluZE1jcFNlcnZlck5hbWVzKG1hbnVhbFRvbWwpO1xuICBjb25zdCB1c2VkTmFtZXMgPSBuZXcgU2V0KG1hbnVhbE5hbWVzKTtcbiAgY29uc3Qgc2VydmVyTmFtZXM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHNraXBwZWRTZXJ2ZXJOYW1lczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgZW50cmllczogc3RyaW5nW10gPSBbXTtcblxuICBmb3IgKGNvbnN0IHR3ZWFrIG9mIHR3ZWFrcykge1xuICAgIGNvbnN0IG1jcCA9IG5vcm1hbGl6ZU1jcFNlcnZlcih0d2Vhay5tYW5pZmVzdC5tY3ApO1xuICAgIGlmICghbWNwKSBjb250aW51ZTtcblxuICAgIGNvbnN0IGJhc2VOYW1lID0gbWNwU2VydmVyTmFtZUZyb21Ud2Vha0lkKHR3ZWFrLm1hbmlmZXN0LmlkKTtcbiAgICBpZiAobWFudWFsTmFtZXMuaGFzKGJhc2VOYW1lKSkge1xuICAgICAgc2tpcHBlZFNlcnZlck5hbWVzLnB1c2goYmFzZU5hbWUpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3Qgc2VydmVyTmFtZSA9IHJlc2VydmVVbmlxdWVOYW1lKGJhc2VOYW1lLCB1c2VkTmFtZXMpO1xuICAgIHNlcnZlck5hbWVzLnB1c2goc2VydmVyTmFtZSk7XG4gICAgZW50cmllcy5wdXNoKGZvcm1hdE1jcFNlcnZlcihzZXJ2ZXJOYW1lLCB0d2Vhay5kaXIsIG1jcCkpO1xuICB9XG5cbiAgaWYgKGVudHJpZXMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHsgYmxvY2s6IFwiXCIsIHNlcnZlck5hbWVzLCBza2lwcGVkU2VydmVyTmFtZXMgfTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgYmxvY2s6IFtNQ1BfTUFOQUdFRF9TVEFSVCwgLi4uZW50cmllcywgTUNQX01BTkFHRURfRU5EXS5qb2luKFwiXFxuXCIpLFxuICAgIHNlcnZlck5hbWVzLFxuICAgIHNraXBwZWRTZXJ2ZXJOYW1lcyxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlTWFuYWdlZE1jcEJsb2NrKGN1cnJlbnRUb21sOiBzdHJpbmcsIG1hbmFnZWRCbG9jazogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKCFtYW5hZ2VkQmxvY2sgJiYgIWN1cnJlbnRUb21sLmluY2x1ZGVzKE1DUF9NQU5BR0VEX1NUQVJUKSkgcmV0dXJuIGN1cnJlbnRUb21sO1xuICBjb25zdCBzdHJpcHBlZCA9IHN0cmlwTWFuYWdlZE1jcEJsb2NrKGN1cnJlbnRUb21sKS50cmltRW5kKCk7XG4gIGlmICghbWFuYWdlZEJsb2NrKSByZXR1cm4gc3RyaXBwZWQgPyBgJHtzdHJpcHBlZH1cXG5gIDogXCJcIjtcbiAgcmV0dXJuIGAke3N0cmlwcGVkID8gYCR7c3RyaXBwZWR9XFxuXFxuYCA6IFwiXCJ9JHttYW5hZ2VkQmxvY2t9XFxuYDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwTWFuYWdlZE1jcEJsb2NrKHRvbWw6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHBhdHRlcm4gPSBuZXcgUmVnRXhwKFxuICAgIGBcXFxcbj8ke2VzY2FwZVJlZ0V4cChNQ1BfTUFOQUdFRF9TVEFSVCl9W1xcXFxzXFxcXFNdKj8ke2VzY2FwZVJlZ0V4cChNQ1BfTUFOQUdFRF9FTkQpfVxcXFxuP2AsXG4gICAgXCJnXCIsXG4gICk7XG4gIHJldHVybiB0b21sLnJlcGxhY2UocGF0dGVybiwgXCJcXG5cIikucmVwbGFjZSgvXFxuezMsfS9nLCBcIlxcblxcblwiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1jcFNlcnZlck5hbWVGcm9tVHdlYWtJZChpZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3Qgd2l0aG91dFB1Ymxpc2hlciA9IGlkLnJlcGxhY2UoL15jb1xcLmJlbm5ldHRcXC4vLCBcIlwiKTtcbiAgY29uc3Qgc2x1ZyA9IHdpdGhvdXRQdWJsaXNoZXJcbiAgICAucmVwbGFjZSgvW15hLXpBLVowLTlfLV0rL2csIFwiLVwiKVxuICAgIC5yZXBsYWNlKC9eLSt8LSskL2csIFwiXCIpXG4gICAgLnRvTG93ZXJDYXNlKCk7XG4gIHJldHVybiBzbHVnIHx8IFwidHdlYWstbWNwXCI7XG59XG5cbmZ1bmN0aW9uIGZpbmRNY3BTZXJ2ZXJOYW1lcyh0b21sOiBzdHJpbmcpOiBTZXQ8c3RyaW5nPiB7XG4gIGNvbnN0IG5hbWVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IHRhYmxlUGF0dGVybiA9IC9eXFxzKlxcW21jcF9zZXJ2ZXJzXFwuKFteXFxdXFxzXSspXFxdXFxzKiQvZ207XG4gIGxldCBtYXRjaDogUmVnRXhwRXhlY0FycmF5IHwgbnVsbDtcbiAgd2hpbGUgKChtYXRjaCA9IHRhYmxlUGF0dGVybi5leGVjKHRvbWwpKSAhPT0gbnVsbCkge1xuICAgIG5hbWVzLmFkZCh1bnF1b3RlVG9tbEtleShtYXRjaFsxXSA/PyBcIlwiKSk7XG4gIH1cbiAgcmV0dXJuIG5hbWVzO1xufVxuXG5mdW5jdGlvbiByZXNlcnZlVW5pcXVlTmFtZShiYXNlTmFtZTogc3RyaW5nLCB1c2VkTmFtZXM6IFNldDxzdHJpbmc+KTogc3RyaW5nIHtcbiAgaWYgKCF1c2VkTmFtZXMuaGFzKGJhc2VOYW1lKSkge1xuICAgIHVzZWROYW1lcy5hZGQoYmFzZU5hbWUpO1xuICAgIHJldHVybiBiYXNlTmFtZTtcbiAgfVxuICBmb3IgKGxldCBpID0gMjsgOyBpICs9IDEpIHtcbiAgICBjb25zdCBjYW5kaWRhdGUgPSBgJHtiYXNlTmFtZX0tJHtpfWA7XG4gICAgaWYgKCF1c2VkTmFtZXMuaGFzKGNhbmRpZGF0ZSkpIHtcbiAgICAgIHVzZWROYW1lcy5hZGQoY2FuZGlkYXRlKTtcbiAgICAgIHJldHVybiBjYW5kaWRhdGU7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZU1jcFNlcnZlcih2YWx1ZTogVHdlYWtNY3BTZXJ2ZXIgfCB1bmRlZmluZWQpOiBUd2Vha01jcFNlcnZlciB8IG51bGwge1xuICBpZiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZS5jb21tYW5kICE9PSBcInN0cmluZ1wiIHx8IHZhbHVlLmNvbW1hbmQubGVuZ3RoID09PSAwKSByZXR1cm4gbnVsbDtcbiAgaWYgKHZhbHVlLmFyZ3MgIT09IHVuZGVmaW5lZCAmJiAhQXJyYXkuaXNBcnJheSh2YWx1ZS5hcmdzKSkgcmV0dXJuIG51bGw7XG4gIGlmICh2YWx1ZS5hcmdzPy5zb21lKChhcmcpID0+IHR5cGVvZiBhcmcgIT09IFwic3RyaW5nXCIpKSByZXR1cm4gbnVsbDtcbiAgaWYgKHZhbHVlLmVudiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKCF2YWx1ZS5lbnYgfHwgdHlwZW9mIHZhbHVlLmVudiAhPT0gXCJvYmplY3RcIiB8fCBBcnJheS5pc0FycmF5KHZhbHVlLmVudikpIHJldHVybiBudWxsO1xuICAgIGlmIChPYmplY3QudmFsdWVzKHZhbHVlLmVudikuc29tZSgoZW52VmFsdWUpID0+IHR5cGVvZiBlbnZWYWx1ZSAhPT0gXCJzdHJpbmdcIikpIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0TWNwU2VydmVyKHNlcnZlck5hbWU6IHN0cmluZywgdHdlYWtEaXI6IHN0cmluZywgbWNwOiBUd2Vha01jcFNlcnZlcik6IHN0cmluZyB7XG4gIGNvbnN0IGxpbmVzID0gW1xuICAgIGBbbWNwX3NlcnZlcnMuJHtmb3JtYXRUb21sS2V5KHNlcnZlck5hbWUpfV1gLFxuICAgIGBjb21tYW5kID0gJHtmb3JtYXRUb21sU3RyaW5nKHJlc29sdmVDb21tYW5kKHR3ZWFrRGlyLCBtY3AuY29tbWFuZCkpfWAsXG4gIF07XG5cbiAgaWYgKG1jcC5hcmdzICYmIG1jcC5hcmdzLmxlbmd0aCA+IDApIHtcbiAgICBsaW5lcy5wdXNoKGBhcmdzID0gJHtmb3JtYXRUb21sU3RyaW5nQXJyYXkobWNwLmFyZ3MubWFwKChhcmcpID0+IHJlc29sdmVBcmcodHdlYWtEaXIsIGFyZykpKX1gKTtcbiAgfVxuXG4gIGlmIChtY3AuZW52ICYmIE9iamVjdC5rZXlzKG1jcC5lbnYpLmxlbmd0aCA+IDApIHtcbiAgICBsaW5lcy5wdXNoKGBlbnYgPSAke2Zvcm1hdFRvbWxJbmxpbmVUYWJsZShtY3AuZW52KX1gKTtcbiAgfVxuXG4gIHJldHVybiBsaW5lcy5qb2luKFwiXFxuXCIpO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlQ29tbWFuZCh0d2Vha0Rpcjogc3RyaW5nLCBjb21tYW5kOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoaXNBYnNvbHV0ZShjb21tYW5kKSB8fCAhbG9va3NMaWtlUmVsYXRpdmVQYXRoKGNvbW1hbmQpKSByZXR1cm4gY29tbWFuZDtcbiAgcmV0dXJuIHJlc29sdmUodHdlYWtEaXIsIGNvbW1hbmQpO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlQXJnKHR3ZWFrRGlyOiBzdHJpbmcsIGFyZzogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKGlzQWJzb2x1dGUoYXJnKSB8fCBhcmcuc3RhcnRzV2l0aChcIi1cIikpIHJldHVybiBhcmc7XG4gIGNvbnN0IGNhbmRpZGF0ZSA9IHJlc29sdmUodHdlYWtEaXIsIGFyZyk7XG4gIHJldHVybiBleGlzdHNTeW5jKGNhbmRpZGF0ZSkgPyBjYW5kaWRhdGUgOiBhcmc7XG59XG5cbmZ1bmN0aW9uIGxvb2tzTGlrZVJlbGF0aXZlUGF0aCh2YWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiB2YWx1ZS5zdGFydHNXaXRoKFwiLi9cIikgfHwgdmFsdWUuc3RhcnRzV2l0aChcIi4uL1wiKSB8fCB2YWx1ZS5pbmNsdWRlcyhcIi9cIik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFRvbWxTdHJpbmcodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFRvbWxTdHJpbmdBcnJheSh2YWx1ZXM6IHN0cmluZ1tdKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBbJHt2YWx1ZXMubWFwKGZvcm1hdFRvbWxTdHJpbmcpLmpvaW4oXCIsIFwiKX1dYDtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VG9tbElubGluZVRhYmxlKHJlY29yZDogUmVjb3JkPHN0cmluZywgc3RyaW5nPik6IHN0cmluZyB7XG4gIHJldHVybiBgeyAke09iamVjdC5lbnRyaWVzKHJlY29yZClcbiAgICAubWFwKChba2V5LCB2YWx1ZV0pID0+IGAke2Zvcm1hdFRvbWxLZXkoa2V5KX0gPSAke2Zvcm1hdFRvbWxTdHJpbmcodmFsdWUpfWApXG4gICAgLmpvaW4oXCIsIFwiKX0gfWA7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFRvbWxLZXkoa2V5OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gL15bYS16QS1aMC05Xy1dKyQvLnRlc3Qoa2V5KSA/IGtleSA6IGZvcm1hdFRvbWxTdHJpbmcoa2V5KTtcbn1cblxuZnVuY3Rpb24gdW5xdW90ZVRvbWxLZXkoa2V5OiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoIWtleS5zdGFydHNXaXRoKCdcIicpIHx8ICFrZXkuZW5kc1dpdGgoJ1wiJykpIHJldHVybiBrZXk7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2Uoa2V5KSBhcyBzdHJpbmc7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBrZXk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZXNjYXBlUmVnRXhwKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdmFsdWUucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csIFwiXFxcXCQmXCIpO1xufVxuIiwgImltcG9ydCB7IGV4ZWNGaWxlU3luYyB9IGZyb20gXCJub2RlOmNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCB7IGV4aXN0c1N5bmMsIHJlYWRGaWxlU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBob21lZGlyLCBwbGF0Zm9ybSB9IGZyb20gXCJub2RlOm9zXCI7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuXG50eXBlIENoZWNrU3RhdHVzID0gXCJva1wiIHwgXCJ3YXJuXCIgfCBcImVycm9yXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2F0Y2hlckhlYWx0aENoZWNrIHtcbiAgbmFtZTogc3RyaW5nO1xuICBzdGF0dXM6IENoZWNrU3RhdHVzO1xuICBkZXRhaWw6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXYXRjaGVySGVhbHRoIHtcbiAgY2hlY2tlZEF0OiBzdHJpbmc7XG4gIHN0YXR1czogQ2hlY2tTdGF0dXM7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIHN1bW1hcnk6IHN0cmluZztcbiAgd2F0Y2hlcjogc3RyaW5nO1xuICBjaGVja3M6IFdhdGNoZXJIZWFsdGhDaGVja1tdO1xufVxuXG5pbnRlcmZhY2UgSW5zdGFsbGVyU3RhdGUge1xuICBhcHBSb290Pzogc3RyaW5nO1xuICB2ZXJzaW9uPzogc3RyaW5nO1xuICB3YXRjaGVyPzogXCJsYXVuY2hkXCIgfCBcImxvZ2luLWl0ZW1cIiB8IFwic2NoZWR1bGVkLXRhc2tcIiB8IFwic3lzdGVtZFwiIHwgXCJub25lXCI7XG59XG5cbmludGVyZmFjZSBSdW50aW1lQ29uZmlnIHtcbiAgY29kZXhQbHVzUGx1cz86IHtcbiAgICBhdXRvVXBkYXRlPzogYm9vbGVhbjtcbiAgfTtcbn1cblxuaW50ZXJmYWNlIFNlbGZVcGRhdGVTdGF0ZSB7XG4gIHN0YXR1cz86IFwiY2hlY2tpbmdcIiB8IFwidXAtdG8tZGF0ZVwiIHwgXCJ1cGRhdGVkXCIgfCBcImZhaWxlZFwiIHwgXCJkaXNhYmxlZFwiO1xuICBjb21wbGV0ZWRBdD86IHN0cmluZztcbiAgY2hlY2tlZEF0Pzogc3RyaW5nO1xuICBsYXRlc3RWZXJzaW9uPzogc3RyaW5nIHwgbnVsbDtcbiAgZXJyb3I/OiBzdHJpbmc7XG59XG5cbmNvbnN0IExBVU5DSERfTEFCRUwgPSBcImNvbS5jb2RleHBsdXNwbHVzLndhdGNoZXJcIjtcbmNvbnN0IFdBVENIRVJfTE9HID0gam9pbihob21lZGlyKCksIFwiTGlicmFyeVwiLCBcIkxvZ3NcIiwgXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyLmxvZ1wiKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFdhdGNoZXJIZWFsdGgodXNlclJvb3Q6IHN0cmluZyk6IFdhdGNoZXJIZWFsdGgge1xuICBjb25zdCBjaGVja3M6IFdhdGNoZXJIZWFsdGhDaGVja1tdID0gW107XG4gIGNvbnN0IHN0YXRlID0gcmVhZEpzb248SW5zdGFsbGVyU3RhdGU+KGpvaW4odXNlclJvb3QsIFwic3RhdGUuanNvblwiKSk7XG4gIGNvbnN0IGNvbmZpZyA9IHJlYWRKc29uPFJ1bnRpbWVDb25maWc+KGpvaW4odXNlclJvb3QsIFwiY29uZmlnLmpzb25cIikpID8/IHt9O1xuICBjb25zdCBzZWxmVXBkYXRlID0gcmVhZEpzb248U2VsZlVwZGF0ZVN0YXRlPihqb2luKHVzZXJSb290LCBcInNlbGYtdXBkYXRlLXN0YXRlLmpzb25cIikpO1xuXG4gIGNoZWNrcy5wdXNoKHtcbiAgICBuYW1lOiBcIkluc3RhbGwgc3RhdGVcIixcbiAgICBzdGF0dXM6IHN0YXRlID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgIGRldGFpbDogc3RhdGUgPyBgQ29kZXgrKyAke3N0YXRlLnZlcnNpb24gPz8gXCIodW5rbm93biB2ZXJzaW9uKVwifWAgOiBcInN0YXRlLmpzb24gaXMgbWlzc2luZ1wiLFxuICB9KTtcblxuICBpZiAoIXN0YXRlKSByZXR1cm4gc3VtbWFyaXplKFwibm9uZVwiLCBjaGVja3MpO1xuXG4gIGNvbnN0IGF1dG9VcGRhdGUgPSBjb25maWcuY29kZXhQbHVzUGx1cz8uYXV0b1VwZGF0ZSAhPT0gZmFsc2U7XG4gIGNoZWNrcy5wdXNoKHtcbiAgICBuYW1lOiBcIkF1dG9tYXRpYyByZWZyZXNoXCIsXG4gICAgc3RhdHVzOiBhdXRvVXBkYXRlID8gXCJva1wiIDogXCJ3YXJuXCIsXG4gICAgZGV0YWlsOiBhdXRvVXBkYXRlID8gXCJlbmFibGVkXCIgOiBcImRpc2FibGVkIGluIENvZGV4KysgY29uZmlnXCIsXG4gIH0pO1xuXG4gIGNoZWNrcy5wdXNoKHtcbiAgICBuYW1lOiBcIldhdGNoZXIga2luZFwiLFxuICAgIHN0YXR1czogc3RhdGUud2F0Y2hlciAmJiBzdGF0ZS53YXRjaGVyICE9PSBcIm5vbmVcIiA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICBkZXRhaWw6IHN0YXRlLndhdGNoZXIgPz8gXCJub25lXCIsXG4gIH0pO1xuXG4gIGlmIChzZWxmVXBkYXRlKSB7XG4gICAgY2hlY2tzLnB1c2goc2VsZlVwZGF0ZUNoZWNrKHNlbGZVcGRhdGUpKTtcbiAgfVxuXG4gIGNvbnN0IGFwcFJvb3QgPSBzdGF0ZS5hcHBSb290ID8/IFwiXCI7XG4gIGNoZWNrcy5wdXNoKHtcbiAgICBuYW1lOiBcIkNvZGV4IGFwcFwiLFxuICAgIHN0YXR1czogYXBwUm9vdCAmJiBleGlzdHNTeW5jKGFwcFJvb3QpID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgIGRldGFpbDogYXBwUm9vdCB8fCBcIm1pc3NpbmcgYXBwUm9vdCBpbiBzdGF0ZVwiLFxuICB9KTtcblxuICBzd2l0Y2ggKHBsYXRmb3JtKCkpIHtcbiAgICBjYXNlIFwiZGFyd2luXCI6XG4gICAgICBjaGVja3MucHVzaCguLi5jaGVja0xhdW5jaGRXYXRjaGVyKGFwcFJvb3QpKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgXCJsaW51eFwiOlxuICAgICAgY2hlY2tzLnB1c2goLi4uY2hlY2tTeXN0ZW1kV2F0Y2hlcihhcHBSb290KSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIFwid2luMzJcIjpcbiAgICAgIGNoZWNrcy5wdXNoKC4uLmNoZWNrU2NoZWR1bGVkVGFza1dhdGNoZXIoKSk7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgY2hlY2tzLnB1c2goe1xuICAgICAgICBuYW1lOiBcIlBsYXRmb3JtIHdhdGNoZXJcIixcbiAgICAgICAgc3RhdHVzOiBcIndhcm5cIixcbiAgICAgICAgZGV0YWlsOiBgdW5zdXBwb3J0ZWQgcGxhdGZvcm06ICR7cGxhdGZvcm0oKX1gLFxuICAgICAgfSk7XG4gIH1cblxuICByZXR1cm4gc3VtbWFyaXplKHN0YXRlLndhdGNoZXIgPz8gXCJub25lXCIsIGNoZWNrcyk7XG59XG5cbmZ1bmN0aW9uIHNlbGZVcGRhdGVDaGVjayhzdGF0ZTogU2VsZlVwZGF0ZVN0YXRlKTogV2F0Y2hlckhlYWx0aENoZWNrIHtcbiAgY29uc3QgYXQgPSBzdGF0ZS5jb21wbGV0ZWRBdCA/PyBzdGF0ZS5jaGVja2VkQXQgPz8gXCJ1bmtub3duIHRpbWVcIjtcbiAgaWYgKHN0YXRlLnN0YXR1cyA9PT0gXCJmYWlsZWRcIikge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBcImxhc3QgQ29kZXgrKyB1cGRhdGVcIixcbiAgICAgIHN0YXR1czogXCJ3YXJuXCIsXG4gICAgICBkZXRhaWw6IHN0YXRlLmVycm9yID8gYGZhaWxlZCAke2F0fTogJHtzdGF0ZS5lcnJvcn1gIDogYGZhaWxlZCAke2F0fWAsXG4gICAgfTtcbiAgfVxuICBpZiAoc3RhdGUuc3RhdHVzID09PSBcImRpc2FibGVkXCIpIHtcbiAgICByZXR1cm4geyBuYW1lOiBcImxhc3QgQ29kZXgrKyB1cGRhdGVcIiwgc3RhdHVzOiBcIndhcm5cIiwgZGV0YWlsOiBgc2tpcHBlZCAke2F0fTogYXV0b21hdGljIHJlZnJlc2ggZGlzYWJsZWRgIH07XG4gIH1cbiAgaWYgKHN0YXRlLnN0YXR1cyA9PT0gXCJ1cGRhdGVkXCIpIHtcbiAgICByZXR1cm4geyBuYW1lOiBcImxhc3QgQ29kZXgrKyB1cGRhdGVcIiwgc3RhdHVzOiBcIm9rXCIsIGRldGFpbDogYHVwZGF0ZWQgJHthdH0gdG8gJHtzdGF0ZS5sYXRlc3RWZXJzaW9uID8/IFwibmV3IHJlbGVhc2VcIn1gIH07XG4gIH1cbiAgaWYgKHN0YXRlLnN0YXR1cyA9PT0gXCJ1cC10by1kYXRlXCIpIHtcbiAgICByZXR1cm4geyBuYW1lOiBcImxhc3QgQ29kZXgrKyB1cGRhdGVcIiwgc3RhdHVzOiBcIm9rXCIsIGRldGFpbDogYHVwIHRvIGRhdGUgJHthdH1gIH07XG4gIH1cbiAgcmV0dXJuIHsgbmFtZTogXCJsYXN0IENvZGV4KysgdXBkYXRlXCIsIHN0YXR1czogXCJ3YXJuXCIsIGRldGFpbDogYGNoZWNraW5nIHNpbmNlICR7YXR9YCB9O1xufVxuXG5mdW5jdGlvbiBjaGVja0xhdW5jaGRXYXRjaGVyKGFwcFJvb3Q6IHN0cmluZyk6IFdhdGNoZXJIZWFsdGhDaGVja1tdIHtcbiAgY29uc3QgY2hlY2tzOiBXYXRjaGVySGVhbHRoQ2hlY2tbXSA9IFtdO1xuICBjb25zdCBwbGlzdFBhdGggPSBqb2luKGhvbWVkaXIoKSwgXCJMaWJyYXJ5XCIsIFwiTGF1bmNoQWdlbnRzXCIsIGAke0xBVU5DSERfTEFCRUx9LnBsaXN0YCk7XG4gIGNvbnN0IHBsaXN0ID0gZXhpc3RzU3luYyhwbGlzdFBhdGgpID8gcmVhZEZpbGVTYWZlKHBsaXN0UGF0aCkgOiBcIlwiO1xuICBjb25zdCBhc2FyUGF0aCA9IGFwcFJvb3QgPyBqb2luKGFwcFJvb3QsIFwiQ29udGVudHNcIiwgXCJSZXNvdXJjZXNcIiwgXCJhcHAuYXNhclwiKSA6IFwiXCI7XG5cbiAgY2hlY2tzLnB1c2goe1xuICAgIG5hbWU6IFwibGF1bmNoZCBwbGlzdFwiLFxuICAgIHN0YXR1czogcGxpc3QgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgZGV0YWlsOiBwbGlzdFBhdGgsXG4gIH0pO1xuXG4gIGlmIChwbGlzdCkge1xuICAgIGNoZWNrcy5wdXNoKHtcbiAgICAgIG5hbWU6IFwibGF1bmNoZCBsYWJlbFwiLFxuICAgICAgc3RhdHVzOiBwbGlzdC5pbmNsdWRlcyhMQVVOQ0hEX0xBQkVMKSA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICAgIGRldGFpbDogTEFVTkNIRF9MQUJFTCxcbiAgICB9KTtcbiAgICBjaGVja3MucHVzaCh7XG4gICAgICBuYW1lOiBcImxhdW5jaGQgdHJpZ2dlclwiLFxuICAgICAgc3RhdHVzOiBhc2FyUGF0aCAmJiBwbGlzdC5pbmNsdWRlcyhhc2FyUGF0aCkgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgICBkZXRhaWw6IGFzYXJQYXRoIHx8IFwibWlzc2luZyBhcHBSb290XCIsXG4gICAgfSk7XG4gICAgY2hlY2tzLnB1c2goe1xuICAgICAgbmFtZTogXCJ3YXRjaGVyIGNvbW1hbmRcIixcbiAgICAgIHN0YXR1czogcGxpc3QuaW5jbHVkZXMoXCJDT0RFWF9QTFVTUExVU19XQVRDSEVSPTFcIikgJiYgcGxpc3QuaW5jbHVkZXMoXCIgdXBkYXRlIC0td2F0Y2hlciAtLXF1aWV0XCIpXG4gICAgICAgID8gXCJva1wiXG4gICAgICAgIDogXCJlcnJvclwiLFxuICAgICAgZGV0YWlsOiBjb21tYW5kU3VtbWFyeShwbGlzdCksXG4gICAgfSk7XG5cbiAgICBjb25zdCBjbGlQYXRoID0gZXh0cmFjdEZpcnN0KHBsaXN0LCAvJyhbXiddKnBhY2thZ2VzXFwvaW5zdGFsbGVyXFwvZGlzdFxcL2NsaVxcLmpzKScvKTtcbiAgICBpZiAoY2xpUGF0aCkge1xuICAgICAgY2hlY2tzLnB1c2goe1xuICAgICAgICBuYW1lOiBcInJlcGFpciBDTElcIixcbiAgICAgICAgc3RhdHVzOiBleGlzdHNTeW5jKGNsaVBhdGgpID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgICAgICBkZXRhaWw6IGNsaVBhdGgsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBsb2FkZWQgPSBjb21tYW5kU3VjY2VlZHMoXCJsYXVuY2hjdGxcIiwgW1wibGlzdFwiLCBMQVVOQ0hEX0xBQkVMXSk7XG4gIGNoZWNrcy5wdXNoKHtcbiAgICBuYW1lOiBcImxhdW5jaGQgbG9hZGVkXCIsXG4gICAgc3RhdHVzOiBsb2FkZWQgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgZGV0YWlsOiBsb2FkZWQgPyBcInNlcnZpY2UgaXMgbG9hZGVkXCIgOiBcImxhdW5jaGN0bCBjYW5ub3QgZmluZCB0aGUgd2F0Y2hlclwiLFxuICB9KTtcblxuICBjaGVja3MucHVzaCh3YXRjaGVyTG9nQ2hlY2soKSk7XG4gIHJldHVybiBjaGVja3M7XG59XG5cbmZ1bmN0aW9uIGNoZWNrU3lzdGVtZFdhdGNoZXIoYXBwUm9vdDogc3RyaW5nKTogV2F0Y2hlckhlYWx0aENoZWNrW10ge1xuICBjb25zdCBkaXIgPSBqb2luKGhvbWVkaXIoKSwgXCIuY29uZmlnXCIsIFwic3lzdGVtZFwiLCBcInVzZXJcIik7XG4gIGNvbnN0IHNlcnZpY2UgPSBqb2luKGRpciwgXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyLnNlcnZpY2VcIik7XG4gIGNvbnN0IHRpbWVyID0gam9pbihkaXIsIFwiY29kZXgtcGx1c3BsdXMtd2F0Y2hlci50aW1lclwiKTtcbiAgY29uc3QgcGF0aFVuaXQgPSBqb2luKGRpciwgXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyLnBhdGhcIik7XG4gIGNvbnN0IGV4cGVjdGVkUGF0aCA9IGFwcFJvb3QgPyBqb2luKGFwcFJvb3QsIFwicmVzb3VyY2VzXCIsIFwiYXBwLmFzYXJcIikgOiBcIlwiO1xuICBjb25zdCBwYXRoQm9keSA9IGV4aXN0c1N5bmMocGF0aFVuaXQpID8gcmVhZEZpbGVTYWZlKHBhdGhVbml0KSA6IFwiXCI7XG5cbiAgcmV0dXJuIFtcbiAgICB7XG4gICAgICBuYW1lOiBcInN5c3RlbWQgc2VydmljZVwiLFxuICAgICAgc3RhdHVzOiBleGlzdHNTeW5jKHNlcnZpY2UpID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgICAgZGV0YWlsOiBzZXJ2aWNlLFxuICAgIH0sXG4gICAge1xuICAgICAgbmFtZTogXCJzeXN0ZW1kIHRpbWVyXCIsXG4gICAgICBzdGF0dXM6IGV4aXN0c1N5bmModGltZXIpID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgICAgZGV0YWlsOiB0aW1lcixcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6IFwic3lzdGVtZCBwYXRoXCIsXG4gICAgICBzdGF0dXM6IHBhdGhCb2R5ICYmIGV4cGVjdGVkUGF0aCAmJiBwYXRoQm9keS5pbmNsdWRlcyhleHBlY3RlZFBhdGgpID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgICAgZGV0YWlsOiBleHBlY3RlZFBhdGggfHwgcGF0aFVuaXQsXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiBcInBhdGggdW5pdCBhY3RpdmVcIixcbiAgICAgIHN0YXR1czogY29tbWFuZFN1Y2NlZWRzKFwic3lzdGVtY3RsXCIsIFtcIi0tdXNlclwiLCBcImlzLWFjdGl2ZVwiLCBcIi0tcXVpZXRcIiwgXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyLnBhdGhcIl0pID8gXCJva1wiIDogXCJ3YXJuXCIsXG4gICAgICBkZXRhaWw6IFwic3lzdGVtY3RsIC0tdXNlciBpcy1hY3RpdmUgY29kZXgtcGx1c3BsdXMtd2F0Y2hlci5wYXRoXCIsXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiBcInRpbWVyIGFjdGl2ZVwiLFxuICAgICAgc3RhdHVzOiBjb21tYW5kU3VjY2VlZHMoXCJzeXN0ZW1jdGxcIiwgW1wiLS11c2VyXCIsIFwiaXMtYWN0aXZlXCIsIFwiLS1xdWlldFwiLCBcImNvZGV4LXBsdXNwbHVzLXdhdGNoZXIudGltZXJcIl0pID8gXCJva1wiIDogXCJ3YXJuXCIsXG4gICAgICBkZXRhaWw6IFwic3lzdGVtY3RsIC0tdXNlciBpcy1hY3RpdmUgY29kZXgtcGx1c3BsdXMtd2F0Y2hlci50aW1lclwiLFxuICAgIH0sXG4gIF07XG59XG5cbmZ1bmN0aW9uIGNoZWNrU2NoZWR1bGVkVGFza1dhdGNoZXIoKTogV2F0Y2hlckhlYWx0aENoZWNrW10ge1xuICByZXR1cm4gW1xuICAgIHtcbiAgICAgIG5hbWU6IFwibG9nb24gdGFza1wiLFxuICAgICAgc3RhdHVzOiBjb21tYW5kU3VjY2VlZHMoXCJzY2h0YXNrcy5leGVcIiwgW1wiL1F1ZXJ5XCIsIFwiL1ROXCIsIFwiY29kZXgtcGx1c3BsdXMtd2F0Y2hlclwiXSkgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgICBkZXRhaWw6IFwiY29kZXgtcGx1c3BsdXMtd2F0Y2hlclwiLFxuICAgIH0sXG4gICAge1xuICAgICAgbmFtZTogXCJob3VybHkgdGFza1wiLFxuICAgICAgc3RhdHVzOiBjb21tYW5kU3VjY2VlZHMoXCJzY2h0YXNrcy5leGVcIiwgW1wiL1F1ZXJ5XCIsIFwiL1ROXCIsIFwiY29kZXgtcGx1c3BsdXMtd2F0Y2hlci1ob3VybHlcIl0pID8gXCJva1wiIDogXCJ3YXJuXCIsXG4gICAgICBkZXRhaWw6IFwiY29kZXgtcGx1c3BsdXMtd2F0Y2hlci1ob3VybHlcIixcbiAgICB9LFxuICBdO1xufVxuXG5mdW5jdGlvbiB3YXRjaGVyTG9nQ2hlY2soKTogV2F0Y2hlckhlYWx0aENoZWNrIHtcbiAgaWYgKCFleGlzdHNTeW5jKFdBVENIRVJfTE9HKSkge1xuICAgIHJldHVybiB7IG5hbWU6IFwid2F0Y2hlciBsb2dcIiwgc3RhdHVzOiBcIndhcm5cIiwgZGV0YWlsOiBcIm5vIHdhdGNoZXIgbG9nIHlldFwiIH07XG4gIH1cbiAgY29uc3QgdGFpbCA9IHJlYWRGaWxlU2FmZShXQVRDSEVSX0xPRykuc3BsaXQoL1xccj9cXG4vKS5zbGljZSgtNDApLmpvaW4oXCJcXG5cIik7XG4gIHJldHVybiBhbmFseXplV2F0Y2hlckxvZ1RhaWwodGFpbCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplV2F0Y2hlckxvZ1RhaWwodGFpbDogc3RyaW5nKTogV2F0Y2hlckhlYWx0aENoZWNrIHtcbiAgY29uc3QgaGFzRXJyb3IgPSAvXHUyNzE3IGNvZGV4LXBsdXNwbHVzIGZhaWxlZHxjb2RleC1wbHVzcGx1cyBmYWlsZWR8ZXJyb3J8ZmFpbGVkL2kudGVzdCh0YWlsKTtcbiAgY29uc3QgbmVlZHNNYW51YWxSZXBhaXIgPVxuICAgIGhhc0Vycm9yICYmXG4gICAgL0Nhbm5vdCB3cml0ZSB0byAuKkNvZGV4LipcXC5hcHB8QXBwIE1hbmFnZW1lbnR8ZmlsZSBvd25lcnNoaXB8c3VkbyBjb2RleHBsdXNwbHVzICg/Omluc3RhbGx8cmVwYWlyKXxFQUNDRVN8RVBFUk0vaS50ZXN0KHRhaWwpO1xuICByZXR1cm4ge1xuICAgIG5hbWU6IFwid2F0Y2hlciBsb2dcIixcbiAgICBzdGF0dXM6IGhhc0Vycm9yID8gXCJ3YXJuXCIgOiBcIm9rXCIsXG4gICAgZGV0YWlsOiBoYXNFcnJvclxuICAgICAgPyBuZWVkc01hbnVhbFJlcGFpclxuICAgICAgICA/IFwiYXV0by1yZXBhaXIgbmVlZHMgYXBwIHBlcm1pc3Npb25zOyBydW4gYGNvZGV4cGx1c3BsdXMgcmVwYWlyYCBmcm9tIFRlcm1pbmFsXCJcbiAgICAgICAgOiBcInJlY2VudCB3YXRjaGVyIGxvZyBjb250YWlucyBhbiBlcnJvclwiXG4gICAgICA6IFdBVENIRVJfTE9HLFxuICB9O1xufVxuXG5mdW5jdGlvbiBzdW1tYXJpemUod2F0Y2hlcjogc3RyaW5nLCBjaGVja3M6IFdhdGNoZXJIZWFsdGhDaGVja1tdKTogV2F0Y2hlckhlYWx0aCB7XG4gIGNvbnN0IGhhc0Vycm9yID0gY2hlY2tzLnNvbWUoKGMpID0+IGMuc3RhdHVzID09PSBcImVycm9yXCIpO1xuICBjb25zdCBoYXNXYXJuID0gY2hlY2tzLnNvbWUoKGMpID0+IGMuc3RhdHVzID09PSBcIndhcm5cIik7XG4gIGNvbnN0IHN0YXR1czogQ2hlY2tTdGF0dXMgPSBoYXNFcnJvciA/IFwiZXJyb3JcIiA6IGhhc1dhcm4gPyBcIndhcm5cIiA6IFwib2tcIjtcbiAgY29uc3QgZmFpbGVkID0gY2hlY2tzLmZpbHRlcigoYykgPT4gYy5zdGF0dXMgPT09IFwiZXJyb3JcIikubGVuZ3RoO1xuICBjb25zdCB3YXJuZWQgPSBjaGVja3MuZmlsdGVyKChjKSA9PiBjLnN0YXR1cyA9PT0gXCJ3YXJuXCIpLmxlbmd0aDtcbiAgY29uc3QgdGl0bGUgPVxuICAgIHN0YXR1cyA9PT0gXCJva1wiXG4gICAgICA/IFwiQXV0by1yZXBhaXIgd2F0Y2hlciBpcyByZWFkeVwiXG4gICAgICA6IHN0YXR1cyA9PT0gXCJ3YXJuXCJcbiAgICAgICAgPyBcIkF1dG8tcmVwYWlyIHdhdGNoZXIgbmVlZHMgcmV2aWV3XCJcbiAgICAgICAgOiBcIkF1dG8tcmVwYWlyIHdhdGNoZXIgaXMgbm90IHJlYWR5XCI7XG4gIGNvbnN0IHN1bW1hcnkgPVxuICAgIHN0YXR1cyA9PT0gXCJva1wiXG4gICAgICA/IFwiQ29kZXgrKyBzaG91bGQgYXV0b21hdGljYWxseSByZXBhaXIgaXRzZWxmIGFmdGVyIENvZGV4IHVwZGF0ZXMuXCJcbiAgICAgIDogYCR7ZmFpbGVkfSBmYWlsaW5nIGNoZWNrKHMpLCAke3dhcm5lZH0gd2FybmluZyhzKS5gO1xuXG4gIHJldHVybiB7XG4gICAgY2hlY2tlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgc3RhdHVzLFxuICAgIHRpdGxlLFxuICAgIHN1bW1hcnksXG4gICAgd2F0Y2hlcixcbiAgICBjaGVja3MsXG4gIH07XG59XG5cbmZ1bmN0aW9uIGNvbW1hbmRTdWNjZWVkcyhjb21tYW5kOiBzdHJpbmcsIGFyZ3M6IHN0cmluZ1tdKTogYm9vbGVhbiB7XG4gIHRyeSB7XG4gICAgZXhlY0ZpbGVTeW5jKGNvbW1hbmQsIGFyZ3MsIHsgc3RkaW86IFwiaWdub3JlXCIsIHRpbWVvdXQ6IDVfMDAwIH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZnVuY3Rpb24gY29tbWFuZFN1bW1hcnkocGxpc3Q6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGNvbW1hbmQgPSBleHRyYWN0Rmlyc3QocGxpc3QsIC88c3RyaW5nPihbXjxdKig/OnVwZGF0ZSAtLXdhdGNoZXIgLS1xdWlldHxyZXBhaXIgLS1xdWlldClbXjxdKik8XFwvc3RyaW5nPi8pO1xuICByZXR1cm4gY29tbWFuZCA/IHVuZXNjYXBlWG1sKGNvbW1hbmQpLnJlcGxhY2UoL1xccysvZywgXCIgXCIpLnRyaW0oKSA6IFwid2F0Y2hlciBjb21tYW5kIG5vdCBmb3VuZFwiO1xufVxuXG5mdW5jdGlvbiBleHRyYWN0Rmlyc3Qoc291cmNlOiBzdHJpbmcsIHBhdHRlcm46IFJlZ0V4cCk6IHN0cmluZyB8IG51bGwge1xuICByZXR1cm4gc291cmNlLm1hdGNoKHBhdHRlcm4pPy5bMV0gPz8gbnVsbDtcbn1cblxuZnVuY3Rpb24gcmVhZEpzb248VD4ocGF0aDogc3RyaW5nKTogVCB8IG51bGwge1xuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhwYXRoLCBcInV0ZjhcIikpIGFzIFQ7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlYWRGaWxlU2FmZShwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICB0cnkge1xuICAgIHJldHVybiByZWFkRmlsZVN5bmMocGF0aCwgXCJ1dGY4XCIpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gXCJcIjtcbiAgfVxufVxuXG5mdW5jdGlvbiB1bmVzY2FwZVhtbCh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHZhbHVlXG4gICAgLnJlcGxhY2UoLyZxdW90Oy9nLCBcIlxcXCJcIilcbiAgICAucmVwbGFjZSgvJmFwb3M7L2csIFwiJ1wiKVxuICAgIC5yZXBsYWNlKC8mbHQ7L2csIFwiPFwiKVxuICAgIC5yZXBsYWNlKC8mZ3Q7L2csIFwiPlwiKVxuICAgIC5yZXBsYWNlKC8mYW1wOy9nLCBcIiZcIik7XG59XG4iLCAiZXhwb3J0IHR5cGUgVHdlYWtTY29wZSA9IFwicmVuZGVyZXJcIiB8IFwibWFpblwiIHwgXCJib3RoXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVsb2FkVHdlYWtzRGVwcyB7XG4gIGxvZ0luZm8obWVzc2FnZTogc3RyaW5nKTogdm9pZDtcbiAgc3RvcEFsbE1haW5Ud2Vha3MoKTogdm9pZDtcbiAgY2xlYXJUd2Vha01vZHVsZUNhY2hlKCk6IHZvaWQ7XG4gIGxvYWRBbGxNYWluVHdlYWtzKCk6IHZvaWQ7XG4gIGJyb2FkY2FzdFJlbG9hZCgpOiB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNldFR3ZWFrRW5hYmxlZEFuZFJlbG9hZERlcHMgZXh0ZW5kcyBSZWxvYWRUd2Vha3NEZXBzIHtcbiAgc2V0VHdlYWtFbmFibGVkKGlkOiBzdHJpbmcsIGVuYWJsZWQ6IGJvb2xlYW4pOiB2b2lkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNNYWluUHJvY2Vzc1R3ZWFrU2NvcGUoc2NvcGU6IFR3ZWFrU2NvcGUgfCB1bmRlZmluZWQpOiBib29sZWFuIHtcbiAgcmV0dXJuIHNjb3BlICE9PSBcInJlbmRlcmVyXCI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWxvYWRUd2Vha3MocmVhc29uOiBzdHJpbmcsIGRlcHM6IFJlbG9hZFR3ZWFrc0RlcHMpOiB2b2lkIHtcbiAgZGVwcy5sb2dJbmZvKGByZWxvYWRpbmcgdHdlYWtzICgke3JlYXNvbn0pYCk7XG4gIGRlcHMuc3RvcEFsbE1haW5Ud2Vha3MoKTtcbiAgZGVwcy5jbGVhclR3ZWFrTW9kdWxlQ2FjaGUoKTtcbiAgZGVwcy5sb2FkQWxsTWFpblR3ZWFrcygpO1xuICBkZXBzLmJyb2FkY2FzdFJlbG9hZCgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0VHdlYWtFbmFibGVkQW5kUmVsb2FkKFxuICBpZDogc3RyaW5nLFxuICBlbmFibGVkOiB1bmtub3duLFxuICBkZXBzOiBTZXRUd2Vha0VuYWJsZWRBbmRSZWxvYWREZXBzLFxuKTogdHJ1ZSB7XG4gIGNvbnN0IG5vcm1hbGl6ZWRFbmFibGVkID0gISFlbmFibGVkO1xuICBkZXBzLnNldFR3ZWFrRW5hYmxlZChpZCwgbm9ybWFsaXplZEVuYWJsZWQpO1xuICBkZXBzLmxvZ0luZm8oYHR3ZWFrICR7aWR9IGVuYWJsZWQ9JHtub3JtYWxpemVkRW5hYmxlZH1gKTtcbiAgcmVsb2FkVHdlYWtzKFwiZW5hYmxlZC10b2dnbGVcIiwgZGVwcyk7XG4gIHJldHVybiB0cnVlO1xufVxuIiwgImltcG9ydCB7IGFwcGVuZEZpbGVTeW5jLCBleGlzdHNTeW5jLCByZWFkRmlsZVN5bmMsIHN0YXRTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcblxuZXhwb3J0IGNvbnN0IE1BWF9MT0dfQllURVMgPSAxMCAqIDEwMjQgKiAxMDI0O1xuXG5leHBvcnQgZnVuY3Rpb24gYXBwZW5kQ2FwcGVkTG9nKHBhdGg6IHN0cmluZywgbGluZTogc3RyaW5nLCBtYXhCeXRlcyA9IE1BWF9MT0dfQllURVMpOiB2b2lkIHtcbiAgY29uc3QgaW5jb21pbmcgPSBCdWZmZXIuZnJvbShsaW5lKTtcbiAgaWYgKGluY29taW5nLmJ5dGVMZW5ndGggPj0gbWF4Qnl0ZXMpIHtcbiAgICB3cml0ZUZpbGVTeW5jKHBhdGgsIGluY29taW5nLnN1YmFycmF5KGluY29taW5nLmJ5dGVMZW5ndGggLSBtYXhCeXRlcykpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRyeSB7XG4gICAgaWYgKGV4aXN0c1N5bmMocGF0aCkpIHtcbiAgICAgIGNvbnN0IHNpemUgPSBzdGF0U3luYyhwYXRoKS5zaXplO1xuICAgICAgY29uc3QgYWxsb3dlZEV4aXN0aW5nID0gbWF4Qnl0ZXMgLSBpbmNvbWluZy5ieXRlTGVuZ3RoO1xuICAgICAgaWYgKHNpemUgPiBhbGxvd2VkRXhpc3RpbmcpIHtcbiAgICAgICAgY29uc3QgZXhpc3RpbmcgPSByZWFkRmlsZVN5bmMocGF0aCk7XG4gICAgICAgIHdyaXRlRmlsZVN5bmMocGF0aCwgZXhpc3Rpbmcuc3ViYXJyYXkoTWF0aC5tYXgoMCwgZXhpc3RpbmcuYnl0ZUxlbmd0aCAtIGFsbG93ZWRFeGlzdGluZykpKTtcbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2gge1xuICAgIC8vIElmIHRyaW1taW5nIGZhaWxzLCBzdGlsbCB0cnkgdG8gYXBwZW5kIGJlbG93OyBsb2dnaW5nIG11c3QgYmUgYmVzdC1lZmZvcnQuXG4gIH1cblxuICBhcHBlbmRGaWxlU3luYyhwYXRoLCBpbmNvbWluZyk7XG59XG4iLCAiaW1wb3J0IHsgYXBwLCBCcm93c2VyV2luZG93IH0gZnJvbSBcImVsZWN0cm9uXCI7XG5pbXBvcnQgeyBleGlzdHNTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGRpcm5hbWUsIGpvaW4gfSBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgdHlwZSB7XG4gIENvZGV4Q2RwU3RhdHVzLFxuICBDb2RleENkcFRhcmdldCxcbiAgQ29kZXhSdW50aW1lQ2FwYWJpbGl0aWVzLFxuICBDb2RleFJ1bnRpbWVJbmZvLFxuICBDb2RleFJ1bnRpbWVUeXBlLFxufSBmcm9tIFwiQGNvZGV4LXBsdXNwbHVzL3Nka1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJ1bnRpbWVQcm9iZU9wdGlvbnMge1xuICB1c2VyUm9vdDogc3RyaW5nO1xuICBydW50aW1lRGlyOiBzdHJpbmc7XG4gIGNvZGV4VmVyc2lvbjogc3RyaW5nIHwgbnVsbDtcbiAgY2hhbm5lbDogc3RyaW5nIHwgbnVsbDtcbiAgZ2V0V2luZG93U2VydmljZXMoKTogdW5rbm93biB8IG51bGw7XG4gIGdldE5hdGl2ZUNhcGFiaWxpdGllcz8oKTogQ29kZXhSdW50aW1lQ2FwYWJpbGl0aWVzW1wibmF0aXZlXCJdO1xuICBnZXRWaWV3Q2FwYWJpbGl0aWVzPygpOiBDb2RleFJ1bnRpbWVDYXBhYmlsaXRpZXNbXCJ2aWV3c1wiXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFJ1bnRpbWVJbmZvKG9wdHM6IFJ1bnRpbWVQcm9iZU9wdGlvbnMpOiBDb2RleFJ1bnRpbWVJbmZvIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiBkZXRlY3RSdW50aW1lVHlwZSgpLFxuICAgIGNvZGV4VmVyc2lvbjogb3B0cy5jb2RleFZlcnNpb24gPz8gc2FmZUFwcFZlcnNpb24oKSxcbiAgICBjaGFubmVsOiBvcHRzLmNoYW5uZWwsXG4gICAgYnVpbGRGbGF2b3I6IHNhZmVCdWlsZEZsYXZvcigpLFxuICAgIHVzZXNPd2xBcHBTaGVsbDogbnVsbCxcbiAgICBhcHBQYXRoOiBzYWZlQXBwUGF0aCgpLFxuICAgIHJlc291cmNlc1BhdGg6IHByb2Nlc3MucmVzb3VyY2VzUGF0aCA/PyBudWxsLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UnVudGltZUNhcGFiaWxpdGllcyhvcHRzOiBSdW50aW1lUHJvYmVPcHRpb25zKTogQ29kZXhSdW50aW1lQ2FwYWJpbGl0aWVzIHtcbiAgY29uc3Qgc2VydmljZXMgPSBhc1JlY29yZChvcHRzLmdldFdpbmRvd1NlcnZpY2VzKCkpO1xuICBjb25zdCB3aW5kb3dNYW5hZ2VyID0gYXNSZWNvcmQoc2VydmljZXM/LndpbmRvd01hbmFnZXIpO1xuICBjb25zdCBjZHAgPSBnZXRDZHBTdGF0dXMoKTtcbiAgY29uc3QgbmF0aXZlID0gb3B0cy5nZXROYXRpdmVDYXBhYmlsaXRpZXM/LigpID8/IGRlZmF1bHROYXRpdmVDYXBhYmlsaXRpZXMoKTtcbiAgY29uc3Qgdmlld3MgPSBvcHRzLmdldFZpZXdDYXBhYmlsaXRpZXM/LigpID8/IGRlZmF1bHRWaWV3Q2FwYWJpbGl0aWVzKCk7XG4gIGNvbnN0IGNhbkNyZWF0ZVdpbmRvdyA9IHR5cGVvZiB3aW5kb3dNYW5hZ2VyPy5jcmVhdGVXaW5kb3cgPT09IFwiZnVuY3Rpb25cIiB8fFxuICAgIHR5cGVvZiBzZXJ2aWNlcz8uY3JlYXRlRnJlc2hXaW5kb3cgPT09IFwiZnVuY3Rpb25cIiB8fFxuICAgIHR5cGVvZiBzZXJ2aWNlcz8uY3JlYXRlRnJlc2hMb2NhbFdpbmRvdyA9PT0gXCJmdW5jdGlvblwiIHx8XG4gICAgdHlwZW9mIHNlcnZpY2VzPy5lbnN1cmVIb3N0V2luZG93ID09PSBcImZ1bmN0aW9uXCI7XG4gIHJldHVybiB7XG4gICAgd2luZG93czoge1xuICAgICAgY3JlYXRlOiBjYW5DcmVhdGVXaW5kb3csXG4gICAgICBmb2N1czogdHJ1ZSxcbiAgICAgIHByaW1hcnk6IHR5cGVvZiBzZXJ2aWNlcz8uZ2V0UHJpbWFyeVdpbmRvdyA9PT0gXCJmdW5jdGlvblwiIHx8XG4gICAgICAgIHR5cGVvZiB3aW5kb3dNYW5hZ2VyPy5nZXRQcmltYXJ5V2luZG93ID09PSBcImZ1bmN0aW9uXCIsXG4gICAgICBicm93c2VyVmlldzogdHlwZW9mIHdpbmRvd01hbmFnZXI/LnJlZ2lzdGVyV2luZG93ID09PSBcImZ1bmN0aW9uXCIsXG4gICAgfSxcbiAgICB2aWV3cyxcbiAgICBjZHA6IHtcbiAgICAgIHN1cHBvcnRlZDogdHJ1ZSxcbiAgICAgIGVuYWJsZWQ6IGNkcC5lbmFibGVkLFxuICAgICAgcG9ydDogY2RwLnBvcnQsXG4gICAgfSxcbiAgICBuYXRpdmUsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDZHBTdGF0dXMoKTogQ29kZXhDZHBTdGF0dXMge1xuICBjb25zdCBlbmFibGVkID0gcHJvY2Vzcy5lbnYuQ09ERVhQUF9SRU1PVEVfREVCVUcgPT09IFwiMVwiO1xuICBjb25zdCBwb3J0ID0gcGFyc2VDZHBQb3J0KHByb2Nlc3MuZW52LkNPREVYUFBfUkVNT1RFX0RFQlVHX1BPUlQpO1xuICByZXR1cm4ge1xuICAgIHN1cHBvcnRlZDogdHJ1ZSxcbiAgICBlbmFibGVkLFxuICAgIHBvcnQ6IGVuYWJsZWQgPyBwb3J0IDogbnVsbCxcbiAgICB1cmw6IGVuYWJsZWQgPyBgaHR0cDovLzEyNy4wLjAuMToke3BvcnR9YCA6IG51bGwsXG4gIH07XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsaXN0Q2RwVGFyZ2V0cygpOiBQcm9taXNlPENvZGV4Q2RwVGFyZ2V0W10+IHtcbiAgY29uc3Qgc3RhdHVzID0gZ2V0Q2RwU3RhdHVzKCk7XG4gIGlmICghc3RhdHVzLmVuYWJsZWQgfHwgIXN0YXR1cy51cmwpIHJldHVybiBbXTtcbiAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgY29uc3QgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4gY29udHJvbGxlci5hYm9ydCgpLCAxMDAwKTtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaChgJHtzdGF0dXMudXJsfS9qc29uYCwgeyBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsIH0pO1xuICAgIGlmICghcmVzLm9rKSByZXR1cm4gW107XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHJlcy5qc29uKCkgYXMgdW5rbm93bjtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkocm93cykpIHJldHVybiBbXTtcbiAgICByZXR1cm4gcm93c1xuICAgICAgLm1hcCgocm93KSA9PiBub3JtYWxpemVDZHBUYXJnZXQocm93KSlcbiAgICAgIC5maWx0ZXIoKHJvdyk6IHJvdyBpcyBDb2RleENkcFRhcmdldCA9PiByb3cgIT09IG51bGwpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gW107XG4gIH0gZmluYWxseSB7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGRldGVjdFJ1bnRpbWVUeXBlKCk6IENvZGV4UnVudGltZVR5cGUge1xuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJkYXJ3aW5cIikge1xuICAgIGNvbnN0IGFwcFJvb3QgPSBpbmZlck1hY0FwcFJvb3QoKTtcbiAgICBpZiAoYXBwUm9vdCAmJiBleGlzdHNTeW5jKGpvaW4oYXBwUm9vdCwgXCJDb250ZW50c1wiLCBcIkZyYW1ld29ya3NcIiwgXCJDb2RleCBGcmFtZXdvcmsuZnJhbWV3b3JrXCIpKSkge1xuICAgICAgcmV0dXJuIFwib3dsXCI7XG4gICAgfVxuICAgIGlmIChcbiAgICAgIGFwcFJvb3QgJiZcbiAgICAgIGV4aXN0c1N5bmMoam9pbihhcHBSb290LCBcIkNvbnRlbnRzXCIsIFwiRnJhbWV3b3Jrc1wiLCBcIkVsZWN0cm9uIEZyYW1ld29yay5mcmFtZXdvcmtcIikpXG4gICAgKSB7XG4gICAgICByZXR1cm4gXCJlbGVjdHJvblwiO1xuICAgIH1cbiAgICBpZiAocHJvY2Vzcy5yZXNvdXJjZXNQYXRoICYmIGV4aXN0c1N5bmMoam9pbihwcm9jZXNzLnJlc291cmNlc1BhdGgsIFwiYXBwLmFzYXJcIikpKSB7XG4gICAgICByZXR1cm4gXCJlbGVjdHJvblwiO1xuICAgIH1cbiAgICByZXR1cm4gXCJ1bmtub3duXCI7XG4gIH1cbiAgcmV0dXJuIHByb2Nlc3MucmVzb3VyY2VzUGF0aCAmJiBleGlzdHNTeW5jKGpvaW4ocHJvY2Vzcy5yZXNvdXJjZXNQYXRoLCBcImFwcC5hc2FyXCIpKVxuICAgID8gXCJlbGVjdHJvblwiXG4gICAgOiBcInVua25vd25cIjtcbn1cblxuZnVuY3Rpb24gaW5mZXJNYWNBcHBSb290KCk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBtYXJrZXIgPSBcIi5hcHAvQ29udGVudHMvTWFjT1MvXCI7XG4gIGNvbnN0IGlkeCA9IHByb2Nlc3MuZXhlY1BhdGguaW5kZXhPZihtYXJrZXIpO1xuICByZXR1cm4gaWR4ID49IDAgPyBwcm9jZXNzLmV4ZWNQYXRoLnNsaWNlKDAsIGlkeCArIFwiLmFwcFwiLmxlbmd0aCkgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBzYWZlQXBwVmVyc2lvbigpOiBzdHJpbmcgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gYXBwLmdldFZlcnNpb24oKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2FmZUFwcFBhdGgoKTogc3RyaW5nIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGFwcC5nZXRBcHBQYXRoKCk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBwcm9jZXNzLnJlc291cmNlc1BhdGggPyBqb2luKHByb2Nlc3MucmVzb3VyY2VzUGF0aCwgXCJhcHAuYXNhclwiKSA6IG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2FmZUJ1aWxkRmxhdm9yKCk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBhcHBQYXRoID0gc2FmZUFwcFBhdGgoKTtcbiAgaWYgKCFhcHBQYXRoKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgcGFyZW50ID0gZGlybmFtZShhcHBQYXRoKTtcbiAgaWYgKHBhcmVudC5pbmNsdWRlcyhcIk5pZ2h0bHlcIikpIHJldHVybiBcIm5pZ2h0bHlcIjtcbiAgcmV0dXJuIGFwcC5pc1BhY2thZ2VkID8gXCJwcm9kXCIgOiBcImRldlwiO1xufVxuXG5mdW5jdGlvbiBwYXJzZUNkcFBvcnQodmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCk6IG51bWJlciB7XG4gIGNvbnN0IHBhcnNlZCA9IE51bWJlcih2YWx1ZSA/PyBcIjkyMjJcIik7XG4gIHJldHVybiBOdW1iZXIuaXNJbnRlZ2VyKHBhcnNlZCkgJiYgcGFyc2VkID4gMCAmJiBwYXJzZWQgPCA2NTUzNiA/IHBhcnNlZCA6IDkyMjI7XG59XG5cbmZ1bmN0aW9uIGhhc05hdGl2ZVdpbmRvd0hhbmRsZXMoKTogYm9vbGVhbiB7XG4gIGNvbnN0IGZvY3VzZWQgPSBCcm93c2VyV2luZG93LmdldEZvY3VzZWRXaW5kb3coKTtcbiAgaWYgKGZvY3VzZWQgJiYgdHlwZW9mIGZvY3VzZWQuZ2V0TmF0aXZlV2luZG93SGFuZGxlID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiB0cnVlO1xuICByZXR1cm4gdHlwZW9mIEJyb3dzZXJXaW5kb3cuZnJvbUlkID09PSBcImZ1bmN0aW9uXCI7XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHROYXRpdmVDYXBhYmlsaXRpZXMoKTogQ29kZXhSdW50aW1lQ2FwYWJpbGl0aWVzW1wibmF0aXZlXCJdIHtcbiAgcmV0dXJuIHtcbiAgICBpblByb2Nlc3NNb2R1bGVzOiB0cnVlLFxuICAgIHN3aWZ0TW9kdWxlczogcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJkYXJ3aW5cIixcbiAgICBhcHBLaXRFbWJlZGRpbmc6IGZhbHNlLFxuICAgIGNoaWxkV2luZG93T3ZlcmxheTogZmFsc2UsXG4gICAgZGlyZWN0Vmlld0F0dGFjaDogZmFsc2UsXG4gICAgbWV0YWxWaWV3czogZmFsc2UsXG4gICAgbmF0aXZlSG9zdDogZmFsc2UsXG4gICAgaGVscGVyczogdHJ1ZSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdFZpZXdDYXBhYmlsaXRpZXMoKTogQ29kZXhSdW50aW1lQ2FwYWJpbGl0aWVzW1widmlld3NcIl0ge1xuICByZXR1cm4ge1xuICAgIGNyZWF0ZTogZmFsc2UsXG4gICAgcHJpdmF0ZVZpZXdUcmVlOiBmYWxzZSxcbiAgICB3ZWJDb250ZW50c1ZpZXc6IGZhbHNlLFxuICAgIGJyb3dzZXJWaWV3RmFsbGJhY2s6IHR5cGVvZiBCcm93c2VyV2luZG93LmZyb21JZCA9PT0gXCJmdW5jdGlvblwiLFxuICB9O1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVDZHBUYXJnZXQocm93OiB1bmtub3duKTogQ29kZXhDZHBUYXJnZXQgfCBudWxsIHtcbiAgY29uc3QgdmFsdWUgPSBhc1JlY29yZChyb3cpO1xuICBpZiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZS5pZCAhPT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YgdmFsdWUudHlwZSAhPT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YgdmFsdWUudXJsICE9PSBcInN0cmluZ1wiKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBpZDogdmFsdWUuaWQsXG4gICAgdHlwZTogdmFsdWUudHlwZSxcbiAgICB1cmw6IHZhbHVlLnVybCxcbiAgICAuLi4odHlwZW9mIHZhbHVlLnRpdGxlID09PSBcInN0cmluZ1wiID8geyB0aXRsZTogdmFsdWUudGl0bGUgfSA6IHt9KSxcbiAgICAuLi4odHlwZW9mIHZhbHVlLndlYlNvY2tldERlYnVnZ2VyVXJsID09PSBcInN0cmluZ1wiXG4gICAgICA/IHsgd2ViU29ja2V0RGVidWdnZXJVcmw6IHZhbHVlLndlYlNvY2tldERlYnVnZ2VyVXJsIH1cbiAgICAgIDoge30pLFxuICB9O1xufVxuXG5mdW5jdGlvbiBhc1JlY29yZCh2YWx1ZTogdW5rbm93bik6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbCB7XG4gIHJldHVybiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgPyB2YWx1ZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA6IG51bGw7XG59XG4iLCAiaW1wb3J0IHsgQnJvd3NlcldpbmRvdyB9IGZyb20gXCJlbGVjdHJvblwiO1xuaW1wb3J0IHsgc3Bhd24sIHR5cGUgQ2hpbGRQcm9jZXNzV2l0aG91dE51bGxTdHJlYW1zIH0gZnJvbSBcIm5vZGU6Y2hpbGRfcHJvY2Vzc1wiO1xuaW1wb3J0IHsgcmFuZG9tVVVJRCB9IGZyb20gXCJub2RlOmNyeXB0b1wiO1xuaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBjcmVhdGVJbnRlcmZhY2UgfSBmcm9tIFwibm9kZTpyZWFkbGluZVwiO1xuaW1wb3J0IHsgcmVzb2x2ZU5hdGl2ZVR3ZWFrUGF0aCB9IGZyb20gXCIuL25hdGl2ZS1wYXRoc1wiO1xuaW1wb3J0IHR5cGUge1xuICBDb2RleFJ1bnRpbWVDYXBhYmlsaXRpZXMsXG4gIE5hdGl2ZUhlbHBlckxhdW5jaE9wdGlvbnMsXG4gIE5hdGl2ZUhlbHBlclJlZixcbiAgTmF0aXZlTW9kdWxlS2luZCxcbiAgTmF0aXZlTW9kdWxlTG9hZE9wdGlvbnMsXG4gIE5hdGl2ZU1vZHVsZVJlZixcbiAgTmF0aXZlUGFuZWxDcmVhdGVPcHRpb25zLFxuICBOYXRpdmVQYW5lbFJlZixcbiAgTmF0aXZlVmlld0F0dGFjaE9wdGlvbnMsXG4gIE5hdGl2ZVZpZXdSZWYsXG59IGZyb20gXCJAY29kZXgtcGx1c3BsdXMvc2RrXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTmF0aXZlVHdlYWtDb250ZXh0IHtcbiAgaWQ6IHN0cmluZztcbiAgZGlyOiBzdHJpbmc7XG59XG5cbnR5cGUgTmF0aXZlTG9nID0gKGxldmVsOiBcImluZm9cIiB8IFwid2FyblwiIHwgXCJlcnJvclwiLCAuLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQ7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTmF0aXZlQnJpZGdlT3B0aW9ucyB7XG4gIG5hdGl2ZUhvc3RQYXRoPzogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgTG9hZGVkTmF0aXZlTW9kdWxlIHtcbiAga2V5OiBzdHJpbmc7XG4gIHR3ZWFrSWQ6IHN0cmluZztcbiAgaWQ6IHN0cmluZztcbiAga2luZDogTmF0aXZlTW9kdWxlS2luZDtcbiAgcGF0aDogc3RyaW5nO1xuICBleHBvcnRzOiB1bmtub3duO1xufVxuXG5pbnRlcmZhY2UgTmF0aXZlSW5zdGFuY2Uge1xuICBrZXk6IHN0cmluZztcbiAgdHdlYWtJZDogc3RyaW5nO1xuICBpZDogc3RyaW5nO1xuICBraW5kOiBcInBhbmVsXCIgfCBcInZpZXdcIjtcbiAgdmFsdWU6IHVua25vd247XG4gIHBhcmVudFdpbmRvd0lkOiBudW1iZXIgfCBudWxsO1xuICB3aW5kb3dJZDogbnVtYmVyIHwgbnVsbDtcbiAgZGlzcG9zZUJpbmRpbmdzOiBBcnJheTwoKSA9PiB2b2lkPjtcbiAgZGlzcG9zaW5nOiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgSGVscGVyUmVxdWVzdCB7XG4gIHJlc29sdmUodmFsdWU6IHVua25vd24pOiB2b2lkO1xuICByZWplY3QoZXJyb3I6IEVycm9yKTogdm9pZDtcbiAgdGltZXI6IE5vZGVKUy5UaW1lb3V0O1xufVxuXG5pbnRlcmZhY2UgTmF0aXZlSGVscGVyUHJvY2VzcyB7XG4gIGtleTogc3RyaW5nO1xuICB0d2Vha0lkOiBzdHJpbmc7XG4gIGlkOiBzdHJpbmc7XG4gIGNoaWxkOiBDaGlsZFByb2Nlc3NXaXRob3V0TnVsbFN0cmVhbXM7XG4gIHBlbmRpbmc6IE1hcDxzdHJpbmcsIEhlbHBlclJlcXVlc3Q+O1xufVxuXG5leHBvcnQgY2xhc3MgTmF0aXZlQnJpZGdlIHtcbiAgcHJpdmF0ZSBtb2R1bGVzID0gbmV3IE1hcDxzdHJpbmcsIExvYWRlZE5hdGl2ZU1vZHVsZT4oKTtcbiAgcHJpdmF0ZSBpbnN0YW5jZXMgPSBuZXcgTWFwPHN0cmluZywgTmF0aXZlSW5zdGFuY2U+KCk7XG4gIHByaXZhdGUgaGVscGVycyA9IG5ldyBNYXA8c3RyaW5nLCBOYXRpdmVIZWxwZXJQcm9jZXNzPigpO1xuICBwcml2YXRlIG5hdGl2ZUhvc3RFeHBvcnRzOiB1bmtub3duIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgbmF0aXZlSG9zdExvYWRFcnJvcjogRXJyb3IgfCBudWxsID0gbnVsbDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxvZzogTmF0aXZlTG9nLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgb3B0aW9uczogTmF0aXZlQnJpZGdlT3B0aW9ucyA9IHt9LFxuICApIHt9XG5cbiAgZ2V0Q2FwYWJpbGl0aWVzKCk6IENvZGV4UnVudGltZUNhcGFiaWxpdGllc1tcIm5hdGl2ZVwiXSB7XG4gICAgY29uc3QgaG9zdCA9IHRoaXMubG9hZE5hdGl2ZUhvc3QoZmFsc2UpO1xuICAgIGNvbnN0IGhvc3RDYXBhYmlsaXRpZXMgPSBob3N0ID8gdGhpcy5yZWFkTmF0aXZlSG9zdENhcGFiaWxpdGllcyhob3N0KSA6IHt9O1xuICAgIGNvbnN0IG5hdGl2ZUhvc3QgPSBob3N0ICE9PSBudWxsO1xuICAgIHJldHVybiB7XG4gICAgICBpblByb2Nlc3NNb2R1bGVzOiB0cnVlLFxuICAgICAgc3dpZnRNb2R1bGVzOiBwcm9jZXNzLnBsYXRmb3JtID09PSBcImRhcndpblwiLFxuICAgICAgYXBwS2l0RW1iZWRkaW5nOiBCb29sZWFuKGhvc3RDYXBhYmlsaXRpZXMuYXBwS2l0RW1iZWRkaW5nKSxcbiAgICAgIGNoaWxkV2luZG93T3ZlcmxheTogQm9vbGVhbihob3N0Q2FwYWJpbGl0aWVzLmNoaWxkV2luZG93T3ZlcmxheSksXG4gICAgICBkaXJlY3RWaWV3QXR0YWNoOiBCb29sZWFuKGhvc3RDYXBhYmlsaXRpZXMuZGlyZWN0Vmlld0F0dGFjaCksXG4gICAgICBtZXRhbFZpZXdzOiBCb29sZWFuKGhvc3RDYXBhYmlsaXRpZXMubWV0YWxWaWV3cyksXG4gICAgICBuYXRpdmVIb3N0LFxuICAgICAgaGVscGVyczogdHJ1ZSxcbiAgICB9O1xuICB9XG5cbiAgbG9hZE1vZHVsZShjdHg6IE5hdGl2ZVR3ZWFrQ29udGV4dCwgb3B0aW9uczogTmF0aXZlTW9kdWxlTG9hZE9wdGlvbnMpOiBOYXRpdmVNb2R1bGVSZWYge1xuICAgIGNvbnN0IGlkID0gYXNzZXJ0QnJpZGdlSWQob3B0aW9ucy5pZCwgXCJuYXRpdmUgbW9kdWxlIGlkXCIpO1xuICAgIGNvbnN0IGZ1bGxQYXRoID0gcmVzb2x2ZVR3ZWFrUGF0aChjdHgsIG9wdGlvbnMucGF0aCk7XG4gICAgY29uc3Qga2luZCA9IG9wdGlvbnMua2luZCA/PyBpbmZlck1vZHVsZUtpbmQoZnVsbFBhdGgpO1xuXG4gICAgaWYgKGtpbmQgIT09IFwibm9kZS1hZGRvblwiKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGAke2tpbmR9IG5hdGl2ZSBtb2R1bGVzIG11c3QgYmUgbG9hZGVkIHRocm91Z2ggYSAubm9kZSBPYmplY3RpdmUtQysrIHNoaW0gaW4gQ29kZXgrKyAxLjAuMGAsXG4gICAgICApO1xuICAgIH1cblxuICAgIGlmICghZnVsbFBhdGguZW5kc1dpdGgoXCIubm9kZVwiKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwibm9kZS1hZGRvbiBuYXRpdmUgbW9kdWxlcyBtdXN0IHVzZSBhIC5ub2RlIGZpbGVcIik7XG4gICAgfVxuXG4gICAgY29uc3QgbG9hZGVkID0gcmVxdWlyZShmdWxsUGF0aCkgYXMgdW5rbm93bjtcbiAgICBjb25zdCBleHBvcnRzID0gc2VsZWN0RW50cnlwb2ludChsb2FkZWQsIG9wdGlvbnMuZW50cnlwb2ludCk7XG4gICAgY29uc3Qga2V5ID0gbW9kdWxlS2V5KGN0eC5pZCwgaWQpO1xuICAgIHRoaXMubW9kdWxlcy5zZXQoa2V5LCB7IGtleSwgdHdlYWtJZDogY3R4LmlkLCBpZCwga2luZCwgcGF0aDogZnVsbFBhdGgsIGV4cG9ydHMgfSk7XG4gICAgdGhpcy5sb2coXCJpbmZvXCIsIGBsb2FkZWQgbmF0aXZlIG1vZHVsZSAke2N0eC5pZH06JHtpZH1gLCB7IGtpbmQsIHBhdGg6IGZ1bGxQYXRoIH0pO1xuICAgIHJldHVybiB0aGlzLm1vZHVsZVJlZihjdHguaWQsIGlkLCBraW5kKTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZVBhbmVsKGN0eDogTmF0aXZlVHdlYWtDb250ZXh0LCBvcHRpb25zOiBOYXRpdmVQYW5lbENyZWF0ZU9wdGlvbnMpOiBQcm9taXNlPE5hdGl2ZVBhbmVsUmVmPiB7XG4gICAgY29uc3QgY3JlYXRlZCA9IGF3YWl0IHRoaXMuY3JlYXRlTmF0aXZlSW5zdGFuY2UoY3R4LCBcInBhbmVsXCIsIG9wdGlvbnMubW9kdWxlSWQsIG9wdGlvbnMuZmFjdG9yeSA/PyBcImNyZWF0ZVBhbmVsXCIsIHtcbiAgICAgIHBhcmVudFdpbmRvd0lkOiBvcHRpb25zLnBhcmVudFdpbmRvd0lkLFxuICAgICAgYm91bmRzOiBvcHRpb25zLmJvdW5kcyxcbiAgICAgIHRyYW5zcGFyZW50OiBvcHRpb25zLnRyYW5zcGFyZW50ID09PSB0cnVlLFxuICAgICAgcGFzc3Rocm91Z2hNb3VzZTogb3B0aW9ucy5wYXNzdGhyb3VnaE1vdXNlID09PSB0cnVlLFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnBhbmVsUmVmKGNyZWF0ZWQpO1xuICB9XG5cbiAgYXN5bmMgYXR0YWNoVmlldyhjdHg6IE5hdGl2ZVR3ZWFrQ29udGV4dCwgb3B0aW9uczogTmF0aXZlVmlld0F0dGFjaE9wdGlvbnMpOiBQcm9taXNlPE5hdGl2ZVZpZXdSZWY+IHtcbiAgICBjb25zdCBjcmVhdGVkID0gYXdhaXQgdGhpcy5jcmVhdGVOYXRpdmVJbnN0YW5jZShjdHgsIFwidmlld1wiLCBvcHRpb25zLm1vZHVsZUlkLCBvcHRpb25zLmZhY3RvcnkgPz8gXCJhdHRhY2hWaWV3XCIsIHtcbiAgICAgIHBhcmVudFdpbmRvd0lkOiBvcHRpb25zLnBhcmVudFdpbmRvd0lkLFxuICAgICAgYm91bmRzOiBvcHRpb25zLmJvdW5kcyxcbiAgICAgIHpJbmRleDogb3B0aW9ucy56SW5kZXgsXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMudmlld1JlZihjcmVhdGVkKTtcbiAgfVxuXG4gIGxhdW5jaEhlbHBlcihjdHg6IE5hdGl2ZVR3ZWFrQ29udGV4dCwgb3B0aW9uczogTmF0aXZlSGVscGVyTGF1bmNoT3B0aW9ucyk6IE5hdGl2ZUhlbHBlclJlZiB7XG4gICAgY29uc3QgaWQgPSBhc3NlcnRCcmlkZ2VJZChvcHRpb25zLmlkLCBcIm5hdGl2ZSBoZWxwZXIgaWRcIik7XG4gICAgaWYgKChvcHRpb25zLnRyYW5zcG9ydCA/PyBcInN0ZGlvXCIpICE9PSBcInN0ZGlvXCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIm5hdGl2ZSBoZWxwZXJzIHN1cHBvcnQgb25seSBzdGRpbyB0cmFuc3BvcnQgaW4gQ29kZXgrKyAxLjAuMFwiKTtcbiAgICB9XG4gICAgaWYgKChvcHRpb25zLnJlc3RhcnQgPz8gXCJuZXZlclwiKSAhPT0gXCJuZXZlclwiKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJuYXRpdmUgaGVscGVyIHJlc3RhcnQgcG9saWNpZXMgYXJlIG5vdCBhdmFpbGFibGUgaW4gQ29kZXgrKyAxLjAuMFwiKTtcbiAgICB9XG4gICAgY29uc3QgZXhlY3V0YWJsZSA9IHJlc29sdmVUd2Vha1BhdGgoY3R4LCBvcHRpb25zLmV4ZWN1dGFibGUpO1xuICAgIGNvbnN0IGFyZ3MgPSBvcHRpb25zLmFyZ3MgPz8gW107XG4gICAgY29uc3QgZW52ID0geyAuLi5wcm9jZXNzLmVudiwgLi4uKG9wdGlvbnMuZW52ID8/IHt9KSB9O1xuICAgIGNvbnN0IGNoaWxkID0gc3Bhd24oZXhlY3V0YWJsZSwgYXJncywge1xuICAgICAgY3dkOiBjdHguZGlyLFxuICAgICAgZW52LFxuICAgICAgc3RkaW86IFtcInBpcGVcIiwgXCJwaXBlXCIsIFwicGlwZVwiXSxcbiAgICB9KTtcbiAgICBjb25zdCBrZXkgPSBoZWxwZXJLZXkoY3R4LmlkLCBpZCk7XG4gICAgY29uc3QgaGVscGVyOiBOYXRpdmVIZWxwZXJQcm9jZXNzID0ge1xuICAgICAga2V5LFxuICAgICAgdHdlYWtJZDogY3R4LmlkLFxuICAgICAgaWQsXG4gICAgICBjaGlsZCxcbiAgICAgIHBlbmRpbmc6IG5ldyBNYXAoKSxcbiAgICB9O1xuICAgIHRoaXMuaGVscGVycy5zZXQoa2V5LCBoZWxwZXIpO1xuXG4gICAgY29uc3Qgc3Rkb3V0ID0gY3JlYXRlSW50ZXJmYWNlKHsgaW5wdXQ6IGNoaWxkLnN0ZG91dCB9KTtcbiAgICBzdGRvdXQub24oXCJsaW5lXCIsIChsaW5lKSA9PiB0aGlzLmhhbmRsZUhlbHBlckxpbmUoaGVscGVyLCBsaW5lKSk7XG4gICAgY2hpbGQuc3RkZXJyLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IHtcbiAgICAgIHRoaXMubG9nKFwid2FyblwiLCBgbmF0aXZlIGhlbHBlciAke2N0eC5pZH06JHtpZH0gc3RkZXJyYCwgU3RyaW5nKGNodW5rKSk7XG4gICAgfSk7XG4gICAgY2hpbGQub24oXCJleGl0XCIsIChjb2RlLCBzaWduYWwpID0+IHtcbiAgICAgIHRoaXMubG9nKFwiaW5mb1wiLCBgbmF0aXZlIGhlbHBlciAke2N0eC5pZH06JHtpZH0gZXhpdGVkYCwgeyBjb2RlLCBzaWduYWwgfSk7XG4gICAgICB0aGlzLmhlbHBlcnMuZGVsZXRlKGtleSk7XG4gICAgICBmb3IgKGNvbnN0IHJlcXVlc3Qgb2YgaGVscGVyLnBlbmRpbmcudmFsdWVzKCkpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHJlcXVlc3QudGltZXIpO1xuICAgICAgICByZXF1ZXN0LnJlamVjdChuZXcgRXJyb3IoYG5hdGl2ZSBoZWxwZXIgZXhpdGVkIGJlZm9yZSByZXNwb25zZWApKTtcbiAgICAgIH1cbiAgICAgIGhlbHBlci5wZW5kaW5nLmNsZWFyKCk7XG4gICAgfSk7XG4gICAgY2hpbGQub24oXCJlcnJvclwiLCAoZXJyb3IpID0+IHtcbiAgICAgIHRoaXMubG9nKFwiZXJyb3JcIiwgYG5hdGl2ZSBoZWxwZXIgJHtjdHguaWR9OiR7aWR9IGZhaWxlZGAsIGVycm9yKTtcbiAgICAgIHRoaXMuaGVscGVycy5kZWxldGUoa2V5KTtcbiAgICAgIGZvciAoY29uc3QgcmVxdWVzdCBvZiBoZWxwZXIucGVuZGluZy52YWx1ZXMoKSkge1xuICAgICAgICBjbGVhclRpbWVvdXQocmVxdWVzdC50aW1lcik7XG4gICAgICAgIHJlcXVlc3QucmVqZWN0KGVycm9yKTtcbiAgICAgIH1cbiAgICAgIGhlbHBlci5wZW5kaW5nLmNsZWFyKCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmxvZyhcImluZm9cIiwgYGxhdW5jaGVkIG5hdGl2ZSBoZWxwZXIgJHtjdHguaWR9OiR7aWR9YCwgeyBwaWQ6IGNoaWxkLnBpZCwgZXhlY3V0YWJsZSB9KTtcbiAgICByZXR1cm4gdGhpcy5oZWxwZXJSZWYoY3R4LmlkLCBpZCwgY2hpbGQucGlkID8/IC0xKTtcbiAgfVxuXG4gIGRpc3Bvc2VUd2Vhayh0d2Vha0lkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IFtrZXksIGluc3RhbmNlXSBvZiBbLi4udGhpcy5pbnN0YW5jZXNdKSB7XG4gICAgICBpZiAoaW5zdGFuY2UudHdlYWtJZCAhPT0gdHdlYWtJZCkgY29udGludWU7XG4gICAgICB2b2lkIHRoaXMuZGlzcG9zZUluc3RhbmNlKGluc3RhbmNlKS5maW5hbGx5KCgpID0+IHRoaXMuaW5zdGFuY2VzLmRlbGV0ZShrZXkpKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBba2V5LCBoZWxwZXJdIG9mIFsuLi50aGlzLmhlbHBlcnNdKSB7XG4gICAgICBpZiAoaGVscGVyLnR3ZWFrSWQgIT09IHR3ZWFrSWQpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5zdG9wSGVscGVyKGhlbHBlcik7XG4gICAgICB0aGlzLmhlbHBlcnMuZGVsZXRlKGtleSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgW2tleSwgbW9kXSBvZiBbLi4udGhpcy5tb2R1bGVzXSkge1xuICAgICAgaWYgKG1vZC50d2Vha0lkICE9PSB0d2Vha0lkKSBjb250aW51ZTtcbiAgICAgIHZvaWQgY2FsbE9wdGlvbmFsKG1vZC5leHBvcnRzLCBcImRpc3Bvc2VcIiwgW10pO1xuICAgICAgdGhpcy5tb2R1bGVzLmRlbGV0ZShrZXkpO1xuICAgIH1cbiAgfVxuXG4gIGRpc3Bvc2VBbGwoKTogdm9pZCB7XG4gICAgY29uc3QgdHdlYWtJZHMgPSBuZXcgU2V0KFtcbiAgICAgIC4uLlsuLi50aGlzLm1vZHVsZXMudmFsdWVzKCldLm1hcCgoaXRlbSkgPT4gaXRlbS50d2Vha0lkKSxcbiAgICAgIC4uLlsuLi50aGlzLmluc3RhbmNlcy52YWx1ZXMoKV0ubWFwKChpdGVtKSA9PiBpdGVtLnR3ZWFrSWQpLFxuICAgICAgLi4uWy4uLnRoaXMuaGVscGVycy52YWx1ZXMoKV0ubWFwKChpdGVtKSA9PiBpdGVtLnR3ZWFrSWQpLFxuICAgIF0pO1xuICAgIGZvciAoY29uc3QgaWQgb2YgdHdlYWtJZHMpIHRoaXMuZGlzcG9zZVR3ZWFrKGlkKTtcbiAgfVxuXG4gIGFzeW5jIGNhbGxJbnN0YW5jZShcbiAgICB0d2Vha0lkOiBzdHJpbmcsXG4gICAga2luZDogXCJwYW5lbFwiIHwgXCJ2aWV3XCIsXG4gICAgaWQ6IHN0cmluZyxcbiAgICBtZXRob2Q6IHN0cmluZyxcbiAgICBhcmc/OiB1bmtub3duLFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoa2luZCA9PT0gXCJwYW5lbFwiKSB7XG4gICAgICBpZiAobWV0aG9kID09PSBcInNldEJvdW5kc1wiKSByZXR1cm4gdGhpcy5pbnZva2VJbnN0YW5jZSh0d2Vha0lkLCBpZCwgXCJzZXRCb3VuZHNcIiwgW2FyZ10pO1xuICAgICAgaWYgKG1ldGhvZCA9PT0gXCJzaG93XCIpIHJldHVybiB0aGlzLmludm9rZUluc3RhbmNlKHR3ZWFrSWQsIGlkLCBcInNob3dcIiwgW10pO1xuICAgICAgaWYgKG1ldGhvZCA9PT0gXCJoaWRlXCIpIHJldHVybiB0aGlzLmludm9rZUluc3RhbmNlKHR3ZWFrSWQsIGlkLCBcImhpZGVcIiwgW10pO1xuICAgICAgaWYgKG1ldGhvZCA9PT0gXCJkaXNwb3NlXCIpIHJldHVybiB0aGlzLmRpc3Bvc2VJbnN0YW5jZUJ5SWQodHdlYWtJZCwgaWQpO1xuICAgIH1cbiAgICBpZiAoa2luZCA9PT0gXCJ2aWV3XCIpIHtcbiAgICAgIGlmIChtZXRob2QgPT09IFwic2V0Qm91bmRzXCIpIHJldHVybiB0aGlzLmludm9rZUluc3RhbmNlKHR3ZWFrSWQsIGlkLCBcInNldEJvdW5kc1wiLCBbYXJnXSk7XG4gICAgICBpZiAobWV0aG9kID09PSBcInNldFZpc2libGVcIikgcmV0dXJuIHRoaXMuaW52b2tlSW5zdGFuY2UodHdlYWtJZCwgaWQsIFwic2V0VmlzaWJsZVwiLCBbYXJnXSk7XG4gICAgICBpZiAobWV0aG9kID09PSBcImRpc3Bvc2VcIikgcmV0dXJuIHRoaXMuZGlzcG9zZUluc3RhbmNlQnlJZCh0d2Vha0lkLCBpZCk7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgdW5rbm93biBuYXRpdmUgJHtraW5kfSBtZXRob2Q6ICR7bWV0aG9kfWApO1xuICB9XG5cbiAgYXN5bmMgY2FsbEhlbHBlcihcbiAgICB0d2Vha0lkOiBzdHJpbmcsXG4gICAgaGVscGVySWQ6IHN0cmluZyxcbiAgICBtZXRob2Q6IHN0cmluZyxcbiAgICBwYXlsb2FkPzogdW5rbm93bixcbiAgICB0aW1lb3V0TXM/OiBudW1iZXIsXG4gICk6IFByb21pc2U8dW5rbm93bj4ge1xuICAgIGlmIChtZXRob2QgPT09IFwic2VuZFwiKSByZXR1cm4gdGhpcy5zZW5kSGVscGVyKHR3ZWFrSWQsIGhlbHBlcklkLCBwYXlsb2FkKTtcbiAgICBpZiAobWV0aG9kID09PSBcInJlcXVlc3RcIikgcmV0dXJuIHRoaXMucmVxdWVzdEhlbHBlcih0d2Vha0lkLCBoZWxwZXJJZCwgcGF5bG9hZCwgdGltZW91dE1zKTtcbiAgICBpZiAobWV0aG9kID09PSBcInN0b3BcIikgcmV0dXJuIHRoaXMuc3RvcEhlbHBlckJ5SWQodHdlYWtJZCwgaGVscGVySWQpO1xuICAgIHRocm93IG5ldyBFcnJvcihgdW5rbm93biBuYXRpdmUgaGVscGVyIG1ldGhvZDogJHttZXRob2R9YCk7XG4gIH1cblxuICBwcml2YXRlIG1vZHVsZVJlZih0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcsIGtpbmQgPSB0aGlzLm1vZHVsZUZvcih0d2Vha0lkLCBpZCkua2luZCk6IE5hdGl2ZU1vZHVsZVJlZiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkLFxuICAgICAga2luZCxcbiAgICAgIHJlcXVlc3Q6IChtZXRob2QsIHBheWxvYWQsIHRpbWVvdXRNcykgPT5cbiAgICAgICAgdGhpcy5yZXF1ZXN0TW9kdWxlKHR3ZWFrSWQsIGlkLCBtZXRob2QsIHBheWxvYWQsIHRpbWVvdXRNcyksXG4gICAgICBkaXNwb3NlOiAoKSA9PiB0aGlzLmRpc3Bvc2VNb2R1bGUodHdlYWtJZCwgaWQpLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIHBhbmVsUmVmKGluc3RhbmNlOiBOYXRpdmVJbnN0YW5jZSk6IE5hdGl2ZVBhbmVsUmVmIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IGluc3RhbmNlLmlkLFxuICAgICAgd2luZG93SWQ6IGluc3RhbmNlLndpbmRvd0lkLFxuICAgICAgc2V0Qm91bmRzOiAoYm91bmRzKSA9PiB0aGlzLmludm9rZUluc3RhbmNlKGluc3RhbmNlLnR3ZWFrSWQsIGluc3RhbmNlLmlkLCBcInNldEJvdW5kc1wiLCBbYm91bmRzXSksXG4gICAgICBzaG93OiAoKSA9PiB0aGlzLmludm9rZUluc3RhbmNlKGluc3RhbmNlLnR3ZWFrSWQsIGluc3RhbmNlLmlkLCBcInNob3dcIiwgW10pLFxuICAgICAgaGlkZTogKCkgPT4gdGhpcy5pbnZva2VJbnN0YW5jZShpbnN0YW5jZS50d2Vha0lkLCBpbnN0YW5jZS5pZCwgXCJoaWRlXCIsIFtdKSxcbiAgICAgIGRpc3Bvc2U6ICgpID0+IHRoaXMuZGlzcG9zZUluc3RhbmNlQnlJZChpbnN0YW5jZS50d2Vha0lkLCBpbnN0YW5jZS5pZCksXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgdmlld1JlZihpbnN0YW5jZTogTmF0aXZlSW5zdGFuY2UpOiBOYXRpdmVWaWV3UmVmIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IGluc3RhbmNlLmlkLFxuICAgICAgc2V0Qm91bmRzOiAoYm91bmRzKSA9PiB0aGlzLmludm9rZUluc3RhbmNlKGluc3RhbmNlLnR3ZWFrSWQsIGluc3RhbmNlLmlkLCBcInNldEJvdW5kc1wiLCBbYm91bmRzXSksXG4gICAgICBzZXRWaXNpYmxlOiAodmlzaWJsZSkgPT4gdGhpcy5pbnZva2VJbnN0YW5jZShpbnN0YW5jZS50d2Vha0lkLCBpbnN0YW5jZS5pZCwgXCJzZXRWaXNpYmxlXCIsIFt2aXNpYmxlXSksXG4gICAgICBkaXNwb3NlOiAoKSA9PiB0aGlzLmRpc3Bvc2VJbnN0YW5jZUJ5SWQoaW5zdGFuY2UudHdlYWtJZCwgaW5zdGFuY2UuaWQpLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGhlbHBlclJlZih0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcsIHBpZDogbnVtYmVyKTogTmF0aXZlSGVscGVyUmVmIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQsXG4gICAgICBwaWQsXG4gICAgICBzZW5kOiAobWVzc2FnZSkgPT4gdGhpcy5zZW5kSGVscGVyKHR3ZWFrSWQsIGlkLCBtZXNzYWdlKSxcbiAgICAgIHJlcXVlc3Q6IChtZXNzYWdlLCB0aW1lb3V0TXMpID0+IHRoaXMucmVxdWVzdEhlbHBlcih0d2Vha0lkLCBpZCwgbWVzc2FnZSwgdGltZW91dE1zKSxcbiAgICAgIHN0b3A6ICgpID0+IHRoaXMuc3RvcEhlbHBlckJ5SWQodHdlYWtJZCwgaWQpLFxuICAgIH07XG4gIH1cblxuICBhc3luYyByZXF1ZXN0TW9kdWxlKFxuICAgIHR3ZWFrSWQ6IHN0cmluZyxcbiAgICBpZDogc3RyaW5nLFxuICAgIG1ldGhvZDogc3RyaW5nLFxuICAgIHBheWxvYWQ/OiB1bmtub3duLFxuICAgIF90aW1lb3V0TXM/OiBudW1iZXIsXG4gICk6IFByb21pc2U8dW5rbm93bj4ge1xuICAgIGNvbnN0IG1vZCA9IHRoaXMubW9kdWxlRm9yKHR3ZWFrSWQsIGlkKTtcbiAgICBjb25zdCB0YXJnZXQgPSBhc1JlY29yZChtb2QuZXhwb3J0cyk7XG4gICAgY29uc3QgZm4gPSB0YXJnZXQ/LnJlcXVlc3Q7XG4gICAgaWYgKHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICByZXR1cm4gYXdhaXQgZm4uY2FsbChtb2QuZXhwb3J0cywgbWV0aG9kLCBwYXlsb2FkKTtcbiAgICB9XG4gICAgY29uc3QgbWV0aG9kRm4gPSB0YXJnZXQ/LlttZXRob2RdO1xuICAgIGlmICh0eXBlb2YgbWV0aG9kRm4gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgcmV0dXJuIGF3YWl0IG1ldGhvZEZuLmNhbGwobW9kLmV4cG9ydHMsIHBheWxvYWQpO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYG5hdGl2ZSBtb2R1bGUgJHt0d2Vha0lkfToke2lkfSBoYXMgbm8gcmVxdWVzdCgpIG9yICR7bWV0aG9kfSgpYCk7XG4gIH1cblxuICBhc3luYyBkaXNwb3NlTW9kdWxlKHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGtleSA9IG1vZHVsZUtleSh0d2Vha0lkLCBpZCk7XG4gICAgY29uc3QgbW9kID0gdGhpcy5tb2R1bGVzLmdldChrZXkpO1xuICAgIGlmICghbW9kKSByZXR1cm47XG4gICAgYXdhaXQgY2FsbE9wdGlvbmFsKG1vZC5leHBvcnRzLCBcImRpc3Bvc2VcIiwgW10pO1xuICAgIHRoaXMubW9kdWxlcy5kZWxldGUoa2V5KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY3JlYXRlTmF0aXZlSW5zdGFuY2UoXG4gICAgY3R4OiBOYXRpdmVUd2Vha0NvbnRleHQsXG4gICAga2luZDogXCJwYW5lbFwiIHwgXCJ2aWV3XCIsXG4gICAgbW9kdWxlSWQ6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICBmYWN0b3J5OiBzdHJpbmcsXG4gICAgb3B0aW9uczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gICk6IFByb21pc2U8TmF0aXZlSW5zdGFuY2U+IHtcbiAgICBjb25zdCB0YXJnZXQgPSBtb2R1bGVJZCA/IHRoaXMubW9kdWxlRm9yKGN0eC5pZCwgbW9kdWxlSWQpLmV4cG9ydHMgOiB0aGlzLmxvYWROYXRpdmVIb3N0KHRydWUpO1xuICAgIGNvbnN0IGZuID0gYXNSZWNvcmQodGFyZ2V0KT8uW2ZhY3RvcnldO1xuICAgIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgY29uc3QgbGFiZWwgPSBtb2R1bGVJZCA/IGBuYXRpdmUgbW9kdWxlICR7Y3R4LmlkfToke21vZHVsZUlkfWAgOiBcIkNvZGV4KysgbmF0aXZlIGhvc3RcIjtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgJHtsYWJlbH0gaGFzIG5vIGZhY3RvcnkgJHtmYWN0b3J5fSgpYCk7XG4gICAgfVxuXG4gICAgY29uc3QgcGFyZW50V2luZG93ID0gdHlwZW9mIG9wdGlvbnMucGFyZW50V2luZG93SWQgPT09IFwibnVtYmVyXCJcbiAgICAgID8gQnJvd3NlcldpbmRvdy5mcm9tSWQob3B0aW9ucy5wYXJlbnRXaW5kb3dJZClcbiAgICAgIDogQnJvd3NlcldpbmRvdy5nZXRGb2N1c2VkV2luZG93KCk7XG4gICAgY29uc3QgcGFyZW50TmF0aXZlSGFuZGxlID0gbmF0aXZlSGFuZGxlRm9yV2luZG93KHBhcmVudFdpbmRvdyk7XG4gICAgY29uc3QgdmFsdWUgPSBhd2FpdCBmbi5jYWxsKHRhcmdldCwge1xuICAgICAgLi4ub3B0aW9ucyxcbiAgICAgIHBhcmVudFdpbmRvd0lkOiB3aW5kb3dJZEZvcihwYXJlbnRXaW5kb3cpLFxuICAgICAgcGFyZW50V2ViQ29udGVudHNJZDogd2ViQ29udGVudHNJZEZvcihwYXJlbnRXaW5kb3cpLFxuICAgICAgcGFyZW50TmF0aXZlSGFuZGxlLFxuICAgIH0pO1xuICAgIGNvbnN0IGlkID0gdHlwZW9mIGFzUmVjb3JkKHZhbHVlKT8uaWQgPT09IFwic3RyaW5nXCIgPyBTdHJpbmcoYXNSZWNvcmQodmFsdWUpPy5pZCkgOiByYW5kb21VVUlEKCk7XG4gICAgY29uc3Qgd2luZG93SWQgPSB0eXBlb2YgYXNSZWNvcmQodmFsdWUpPy53aW5kb3dJZCA9PT0gXCJudW1iZXJcIiA/IE51bWJlcihhc1JlY29yZCh2YWx1ZSk/LndpbmRvd0lkKSA6IG51bGw7XG4gICAgY29uc3QgaW5zdGFuY2U6IE5hdGl2ZUluc3RhbmNlID0ge1xuICAgICAga2V5OiBpbnN0YW5jZUtleShjdHguaWQsIGlkKSxcbiAgICAgIHR3ZWFrSWQ6IGN0eC5pZCxcbiAgICAgIGlkLFxuICAgICAga2luZCxcbiAgICAgIHZhbHVlLFxuICAgICAgcGFyZW50V2luZG93SWQ6IHdpbmRvd0lkRm9yKHBhcmVudFdpbmRvdyksXG4gICAgICB3aW5kb3dJZCxcbiAgICAgIGRpc3Bvc2VCaW5kaW5nczogW10sXG4gICAgICBkaXNwb3Npbmc6IGZhbHNlLFxuICAgIH07XG4gICAgdGhpcy5pbnN0YW5jZXMuc2V0KGluc3RhbmNlLmtleSwgaW5zdGFuY2UpO1xuICAgIGlmIChjYW5CaW5kUGFyZW50V2luZG93KHBhcmVudFdpbmRvdykpIHtcbiAgICAgIHRoaXMuYmluZEluc3RhbmNlVG9QYXJlbnQoaW5zdGFuY2UsIHBhcmVudFdpbmRvdyk7XG4gICAgICB0aGlzLnN5bmNQYXJlbnRTdGF0ZShpbnN0YW5jZSwgcGFyZW50V2luZG93LCBcImNyZWF0ZWRcIik7XG4gICAgfVxuICAgIHRoaXMubG9nKFwiaW5mb1wiLCBgY3JlYXRlZCBuYXRpdmUgJHtraW5kfSAke2N0eC5pZH06JHtpZH1gLCB7XG4gICAgICBtb2R1bGVJZDogbW9kdWxlSWQgPz8gXCJjb2RleHBwLm5hdGl2ZS1ob3N0XCIsXG4gICAgICBmYWN0b3J5LFxuICAgICAgd2luZG93SWQsXG4gICAgfSk7XG4gICAgcmV0dXJuIGluc3RhbmNlO1xuICB9XG5cbiAgcHJpdmF0ZSBsb2FkTmF0aXZlSG9zdChyZXF1aXJlZDogdHJ1ZSk6IHVua25vd247XG4gIHByaXZhdGUgbG9hZE5hdGl2ZUhvc3QocmVxdWlyZWQ6IGZhbHNlKTogdW5rbm93biB8IG51bGw7XG4gIHByaXZhdGUgbG9hZE5hdGl2ZUhvc3QocmVxdWlyZWQ6IGJvb2xlYW4pOiB1bmtub3duIHwgbnVsbCB7XG4gICAgaWYgKHRoaXMubmF0aXZlSG9zdEV4cG9ydHMpIHJldHVybiB0aGlzLm5hdGl2ZUhvc3RFeHBvcnRzO1xuICAgIGlmICh0aGlzLm5hdGl2ZUhvc3RMb2FkRXJyb3IgJiYgIXJlcXVpcmVkKSByZXR1cm4gbnVsbDtcbiAgICBjb25zdCBuYXRpdmVIb3N0UGF0aCA9IHRoaXMub3B0aW9ucy5uYXRpdmVIb3N0UGF0aDtcbiAgICBpZiAoIW5hdGl2ZUhvc3RQYXRoIHx8ICFleGlzdHNTeW5jKG5hdGl2ZUhvc3RQYXRoKSkge1xuICAgICAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoXCJDb2RleCsrIG5hdGl2ZSBob3N0IGlzIG5vdCBpbnN0YWxsZWRcIik7XG4gICAgICB0aGlzLm5hdGl2ZUhvc3RMb2FkRXJyb3IgPSBlcnJvcjtcbiAgICAgIGlmIChyZXF1aXJlZCkgdGhyb3cgZXJyb3I7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMubmF0aXZlSG9zdEV4cG9ydHMgPSByZXF1aXJlKG5hdGl2ZUhvc3RQYXRoKSBhcyB1bmtub3duO1xuICAgICAgdGhpcy5uYXRpdmVIb3N0TG9hZEVycm9yID0gbnVsbDtcbiAgICAgIHRoaXMubG9nKFwiaW5mb1wiLCBcImxvYWRlZCBDb2RleCsrIG5hdGl2ZSBob3N0XCIsIHsgcGF0aDogbmF0aXZlSG9zdFBhdGggfSk7XG4gICAgICByZXR1cm4gdGhpcy5uYXRpdmVIb3N0RXhwb3J0cztcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5uYXRpdmVIb3N0TG9hZEVycm9yID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yIDogbmV3IEVycm9yKFN0cmluZyhlcnJvcikpO1xuICAgICAgdGhpcy5sb2coXCJlcnJvclwiLCBcImZhaWxlZCB0byBsb2FkIENvZGV4KysgbmF0aXZlIGhvc3RcIiwgdGhpcy5uYXRpdmVIb3N0TG9hZEVycm9yKTtcbiAgICAgIGlmIChyZXF1aXJlZCkgdGhyb3cgdGhpcy5uYXRpdmVIb3N0TG9hZEVycm9yO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZWFkTmF0aXZlSG9zdENhcGFiaWxpdGllcyhob3N0OiB1bmtub3duKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4ge1xuICAgIGNvbnN0IGdldENhcGFiaWxpdGllcyA9IGFzUmVjb3JkKGhvc3QpPy5nZXRDYXBhYmlsaXRpZXM7XG4gICAgaWYgKHR5cGVvZiBnZXRDYXBhYmlsaXRpZXMgIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHt9O1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBjYXBhYmlsaXRpZXMgPSBnZXRDYXBhYmlsaXRpZXMuY2FsbChob3N0KTtcbiAgICAgIHJldHVybiBhc1JlY29yZChjYXBhYmlsaXRpZXMpID8/IHt9O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZyhcIndhcm5cIiwgXCJDb2RleCsrIG5hdGl2ZSBob3N0IGNhcGFiaWxpdHkgcHJvYmUgZmFpbGVkXCIsIGVycm9yKTtcbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGludm9rZUluc3RhbmNlKFxuICAgIHR3ZWFrSWQ6IHN0cmluZyxcbiAgICBpZDogc3RyaW5nLFxuICAgIG1ldGhvZDogc3RyaW5nLFxuICAgIGFyZ3M6IHVua25vd25bXSxcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlRm9yKHR3ZWFrSWQsIGlkKTtcbiAgICBjb25zdCBmbiA9IGFzUmVjb3JkKGluc3RhbmNlLnZhbHVlKT8uW21ldGhvZF07XG4gICAgaWYgKHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBhd2FpdCBmbi5hcHBseShpbnN0YW5jZS52YWx1ZSwgYXJncyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChpbnN0YW5jZS53aW5kb3dJZCAhPT0gbnVsbCkge1xuICAgICAgY29uc3Qgd2luID0gQnJvd3NlcldpbmRvdy5mcm9tSWQoaW5zdGFuY2Uud2luZG93SWQpO1xuICAgICAgaWYgKHdpbiAmJiAhd2luLmlzRGVzdHJveWVkKCkpIHtcbiAgICAgICAgaWYgKG1ldGhvZCA9PT0gXCJzZXRCb3VuZHNcIikgd2luLnNldEJvdW5kcyhhcmdzWzBdIGFzIEVsZWN0cm9uLlJlY3RhbmdsZSk7XG4gICAgICAgIGVsc2UgaWYgKG1ldGhvZCA9PT0gXCJzaG93XCIpIHdpbi5zaG93KCk7XG4gICAgICAgIGVsc2UgaWYgKG1ldGhvZCA9PT0gXCJoaWRlXCIpIHdpbi5oaWRlKCk7XG4gICAgICAgIGVsc2UgaWYgKG1ldGhvZCA9PT0gXCJzZXRWaXNpYmxlXCIpIChhcmdzWzBdID8gd2luLnNob3coKSA6IHdpbi5oaWRlKCkpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgbmF0aXZlICR7aW5zdGFuY2Uua2luZH0gJHt0d2Vha0lkfToke2lkfSBkb2VzIG5vdCBpbXBsZW1lbnQgJHttZXRob2R9KClgKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZGlzcG9zZUluc3RhbmNlQnlJZCh0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBrZXkgPSBpbnN0YW5jZUtleSh0d2Vha0lkLCBpZCk7XG4gICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoa2V5KTtcbiAgICBpZiAoIWluc3RhbmNlKSByZXR1cm47XG4gICAgYXdhaXQgdGhpcy5kaXNwb3NlSW5zdGFuY2UoaW5zdGFuY2UpO1xuICAgIHRoaXMuaW5zdGFuY2VzLmRlbGV0ZShrZXkpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBkaXNwb3NlSW5zdGFuY2UoaW5zdGFuY2U6IE5hdGl2ZUluc3RhbmNlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKGluc3RhbmNlLmRpc3Bvc2luZykgcmV0dXJuO1xuICAgIGluc3RhbmNlLmRpc3Bvc2luZyA9IHRydWU7XG4gICAgZm9yIChjb25zdCBkaXNwb3NlIG9mIGluc3RhbmNlLmRpc3Bvc2VCaW5kaW5ncy5zcGxpY2UoMCkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGRpc3Bvc2UoKTtcbiAgICAgIH0gY2F0Y2gge31cbiAgICB9XG4gICAgYXdhaXQgY2FsbE9wdGlvbmFsKGluc3RhbmNlLnZhbHVlLCBcImRpc3Bvc2VcIiwgW10pO1xuICAgIGlmIChpbnN0YW5jZS53aW5kb3dJZCAhPT0gbnVsbCkge1xuICAgICAgY29uc3Qgd2luID0gQnJvd3NlcldpbmRvdy5mcm9tSWQoaW5zdGFuY2Uud2luZG93SWQpO1xuICAgICAgaWYgKHdpbiAmJiAhd2luLmlzRGVzdHJveWVkKCkpIHdpbi5jbG9zZSgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYmluZEluc3RhbmNlVG9QYXJlbnQoaW5zdGFuY2U6IE5hdGl2ZUluc3RhbmNlLCBwYXJlbnRXaW5kb3c6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cpOiB2b2lkIHtcbiAgICBjb25zdCBvbiA9IChldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCkgPT4ge1xuICAgICAgcGFyZW50V2luZG93Lm9uKGV2ZW50IGFzIG5ldmVyLCBsaXN0ZW5lciBhcyBuZXZlcik7XG4gICAgICBpbnN0YW5jZS5kaXNwb3NlQmluZGluZ3MucHVzaCgoKSA9PiBwYXJlbnRXaW5kb3cub2ZmKGV2ZW50IGFzIG5ldmVyLCBsaXN0ZW5lciBhcyBuZXZlcikpO1xuICAgIH07XG4gICAgY29uc3Qgc3luY0JvdW5kcyA9ICgpID0+IHRoaXMuc3luY1BhcmVudFN0YXRlKGluc3RhbmNlLCBwYXJlbnRXaW5kb3csIFwiYm91bmRzXCIpO1xuICAgIGNvbnN0IHN5bmNGb2N1cyA9IChmb2N1c2VkOiBib29sZWFuKSA9PiB0aGlzLnNpZ25hbFBhcmVudFN0YXRlKGluc3RhbmNlLCBwYXJlbnRXaW5kb3csIFwiZm9jdXNcIiwgeyBmb2N1c2VkIH0pO1xuICAgIGNvbnN0IHN5bmNWaXNpYmlsaXR5ID0gKHZpc2libGU6IGJvb2xlYW4pID0+XG4gICAgICB0aGlzLnNpZ25hbFBhcmVudFN0YXRlKGluc3RhbmNlLCBwYXJlbnRXaW5kb3csIFwidmlzaWJpbGl0eVwiLCB7IHZpc2libGUgfSk7XG4gICAgY29uc3QgZGlzcG9zZVdpdGhQYXJlbnQgPSAoKSA9PiB7XG4gICAgICB0aGlzLmxvZyhcImluZm9cIiwgYGRpc3Bvc2luZyBuYXRpdmUgJHtpbnN0YW5jZS5raW5kfSAke2luc3RhbmNlLnR3ZWFrSWR9OiR7aW5zdGFuY2UuaWR9OyBwYXJlbnQgY2xvc2VkYCk7XG4gICAgICB2b2lkIHRoaXMuZGlzcG9zZUluc3RhbmNlQnlJZChpbnN0YW5jZS50d2Vha0lkLCBpbnN0YW5jZS5pZCk7XG4gICAgfTtcblxuICAgIG9uKFwibW92ZVwiLCBzeW5jQm91bmRzKTtcbiAgICBvbihcInJlc2l6ZVwiLCBzeW5jQm91bmRzKTtcbiAgICBvbihcImVudGVyLWZ1bGwtc2NyZWVuXCIsIHN5bmNCb3VuZHMpO1xuICAgIG9uKFwibGVhdmUtZnVsbC1zY3JlZW5cIiwgc3luY0JvdW5kcyk7XG4gICAgb24oXCJtYXhpbWl6ZVwiLCBzeW5jQm91bmRzKTtcbiAgICBvbihcInVubWF4aW1pemVcIiwgc3luY0JvdW5kcyk7XG4gICAgb24oXCJtaW5pbWl6ZVwiLCBzeW5jQm91bmRzKTtcbiAgICBvbihcInJlc3RvcmVcIiwgc3luY0JvdW5kcyk7XG4gICAgb24oXCJzaG93XCIsICgpID0+IHN5bmNWaXNpYmlsaXR5KHRydWUpKTtcbiAgICBvbihcImhpZGVcIiwgKCkgPT4gc3luY1Zpc2liaWxpdHkoZmFsc2UpKTtcbiAgICBvbihcImZvY3VzXCIsICgpID0+IHN5bmNGb2N1cyh0cnVlKSk7XG4gICAgb24oXCJibHVyXCIsICgpID0+IHN5bmNGb2N1cyhmYWxzZSkpO1xuICAgIG9uKFwiY2xvc2VcIiwgZGlzcG9zZVdpdGhQYXJlbnQpO1xuICAgIG9uKFwiY2xvc2VkXCIsIGRpc3Bvc2VXaXRoUGFyZW50KTtcbiAgfVxuXG4gIHByaXZhdGUgc3luY1BhcmVudFN0YXRlKFxuICAgIGluc3RhbmNlOiBOYXRpdmVJbnN0YW5jZSxcbiAgICBwYXJlbnRXaW5kb3c6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3csXG4gICAgcmVhc29uOiBzdHJpbmcsXG4gICk6IHZvaWQge1xuICAgIGNvbnN0IHN0YXRlID0gcGFyZW50V2luZG93U3RhdGUocGFyZW50V2luZG93LCByZWFzb24pO1xuICAgIGlmICghc3RhdGUpIHJldHVybjtcbiAgICB2b2lkIHRoaXMuY2FsbEZpcnN0T3B0aW9uYWxJbnN0YW5jZShpbnN0YW5jZSwgW1wic3luY1BhcmVudFwiLCBcInBhcmVudENoYW5nZWRcIl0sIFtzdGF0ZV0pXG4gICAgICAudGhlbigoaGFuZGxlZCkgPT4ge1xuICAgICAgICBpZiAoIWhhbmRsZWQpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsRmlyc3RPcHRpb25hbEluc3RhbmNlKFxuICAgICAgICAgICAgaW5zdGFuY2UsXG4gICAgICAgICAgICBbXCJzZXRQYXJlbnRCb3VuZHNcIiwgXCJwYXJlbnRCb3VuZHNDaGFuZ2VkXCJdLFxuICAgICAgICAgICAgW3N0YXRlLmJvdW5kcywgc3RhdGVdLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHRoaXMubG9nKFwid2FyblwiLCBgbmF0aXZlICR7aW5zdGFuY2Uua2luZH0gcGFyZW50IHN5bmMgZmFpbGVkYCwgZXJyb3IpKTtcbiAgfVxuXG4gIHByaXZhdGUgc2lnbmFsUGFyZW50U3RhdGUoXG4gICAgaW5zdGFuY2U6IE5hdGl2ZUluc3RhbmNlLFxuICAgIHBhcmVudFdpbmRvdzogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyxcbiAgICByZWFzb246IHN0cmluZyxcbiAgICBwYXRjaDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gICk6IHZvaWQge1xuICAgIGNvbnN0IHN0YXRlID0gcGFyZW50V2luZG93U3RhdGUocGFyZW50V2luZG93LCByZWFzb24pO1xuICAgIGlmICghc3RhdGUpIHJldHVybjtcbiAgICBjb25zdCBwYXlsb2FkID0geyAuLi5zdGF0ZSwgLi4ucGF0Y2ggfTtcbiAgICB2b2lkIHRoaXMuY2FsbEZpcnN0T3B0aW9uYWxJbnN0YW5jZShpbnN0YW5jZSwgW1wicGFyZW50U3RhdGVDaGFuZ2VkXCIsIFwicGFyZW50Q2hhbmdlZFwiXSwgW3BheWxvYWRdKVxuICAgICAgLmNhdGNoKChlcnJvcikgPT4gdGhpcy5sb2coXCJ3YXJuXCIsIGBuYXRpdmUgJHtpbnN0YW5jZS5raW5kfSBwYXJlbnQgc2lnbmFsIGZhaWxlZGAsIGVycm9yKSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGNhbGxGaXJzdE9wdGlvbmFsSW5zdGFuY2UoXG4gICAgaW5zdGFuY2U6IE5hdGl2ZUluc3RhbmNlLFxuICAgIG1ldGhvZHM6IHN0cmluZ1tdLFxuICAgIGFyZ3M6IHVua25vd25bXSxcbiAgKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gYXNSZWNvcmQoaW5zdGFuY2UudmFsdWUpO1xuICAgIGZvciAoY29uc3QgbWV0aG9kIG9mIG1ldGhvZHMpIHtcbiAgICAgIGNvbnN0IGZuID0gdGFyZ2V0Py5bbWV0aG9kXTtcbiAgICAgIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikgY29udGludWU7XG4gICAgICBhd2FpdCBmbi5hcHBseShpbnN0YW5jZS52YWx1ZSwgYXJncyk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBzZW5kSGVscGVyKHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZywgbWVzc2FnZTogdW5rbm93bik6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGhlbHBlciA9IHRoaXMuaGVscGVyRm9yKHR3ZWFrSWQsIGlkKTtcbiAgICBoZWxwZXIuY2hpbGQuc3RkaW4ud3JpdGUoYCR7SlNPTi5zdHJpbmdpZnkobWVzc2FnZSl9XFxuYCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlcXVlc3RIZWxwZXIoXG4gICAgdHdlYWtJZDogc3RyaW5nLFxuICAgIGlkOiBzdHJpbmcsXG4gICAgbWVzc2FnZTogdW5rbm93bixcbiAgICB0aW1lb3V0TXMgPSAxMF8wMDAsXG4gICk6IFByb21pc2U8dW5rbm93bj4ge1xuICAgIGNvbnN0IGhlbHBlciA9IHRoaXMuaGVscGVyRm9yKHR3ZWFrSWQsIGlkKTtcbiAgICBjb25zdCByZXF1ZXN0SWQgPSByYW5kb21VVUlEKCk7XG4gICAgY29uc3QgcGF5bG9hZCA9IHsgaWQ6IHJlcXVlc3RJZCwgbWVzc2FnZSB9O1xuICAgIHJldHVybiBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBoZWxwZXIucGVuZGluZy5kZWxldGUocmVxdWVzdElkKTtcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgbmF0aXZlIGhlbHBlciByZXF1ZXN0IHRpbWVkIG91dDogJHt0d2Vha0lkfToke2lkfWApKTtcbiAgICAgIH0sIHRpbWVvdXRNcyk7XG4gICAgICBoZWxwZXIucGVuZGluZy5zZXQocmVxdWVzdElkLCB7IHJlc29sdmUsIHJlamVjdCwgdGltZXIgfSk7XG4gICAgICBoZWxwZXIuY2hpbGQuc3RkaW4ud3JpdGUoYCR7SlNPTi5zdHJpbmdpZnkocGF5bG9hZCl9XFxuYCk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHN0b3BIZWxwZXJCeUlkKHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGtleSA9IGhlbHBlcktleSh0d2Vha0lkLCBpZCk7XG4gICAgY29uc3QgaGVscGVyID0gdGhpcy5oZWxwZXJzLmdldChrZXkpO1xuICAgIGlmICghaGVscGVyKSByZXR1cm47XG4gICAgdGhpcy5zdG9wSGVscGVyKGhlbHBlcik7XG4gICAgdGhpcy5oZWxwZXJzLmRlbGV0ZShrZXkpO1xuICB9XG5cbiAgcHJpdmF0ZSBzdG9wSGVscGVyKGhlbHBlcjogTmF0aXZlSGVscGVyUHJvY2Vzcyk6IHZvaWQge1xuICAgIGlmIChoZWxwZXIuY2hpbGQua2lsbGVkKSByZXR1cm47XG4gICAgaGVscGVyLmNoaWxkLmtpbGwoKTtcbiAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgaWYgKCFoZWxwZXIuY2hpbGQua2lsbGVkKSBoZWxwZXIuY2hpbGQua2lsbChcIlNJR0tJTExcIik7XG4gICAgfSwgMTUwMCk7XG4gICAgdGltZXIudW5yZWY/LigpO1xuICB9XG5cbiAgcHJpdmF0ZSBoYW5kbGVIZWxwZXJMaW5lKGhlbHBlcjogTmF0aXZlSGVscGVyUHJvY2VzcywgbGluZTogc3RyaW5nKTogdm9pZCB7XG4gICAgbGV0IHBheWxvYWQ6IHsgaWQ/OiB1bmtub3duOyByZXN1bHQ/OiB1bmtub3duOyBlcnJvcj86IHVua25vd24gfTtcbiAgICB0cnkge1xuICAgICAgcGF5bG9hZCA9IEpTT04ucGFyc2UobGluZSkgYXMgdHlwZW9mIHBheWxvYWQ7XG4gICAgfSBjYXRjaCB7XG4gICAgICB0aGlzLmxvZyhcImluZm9cIiwgYG5hdGl2ZSBoZWxwZXIgJHtoZWxwZXIudHdlYWtJZH06JHtoZWxwZXIuaWR9YCwgbGluZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0eXBlb2YgcGF5bG9hZC5pZCAhPT0gXCJzdHJpbmdcIikgcmV0dXJuO1xuICAgIGNvbnN0IHJlcXVlc3QgPSBoZWxwZXIucGVuZGluZy5nZXQocGF5bG9hZC5pZCk7XG4gICAgaWYgKCFyZXF1ZXN0KSByZXR1cm47XG4gICAgaGVscGVyLnBlbmRpbmcuZGVsZXRlKHBheWxvYWQuaWQpO1xuICAgIGNsZWFyVGltZW91dChyZXF1ZXN0LnRpbWVyKTtcbiAgICBpZiAocGF5bG9hZC5lcnJvcikge1xuICAgICAgcmVxdWVzdC5yZWplY3QobmV3IEVycm9yKFN0cmluZyhwYXlsb2FkLmVycm9yKSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXF1ZXN0LnJlc29sdmUocGF5bG9hZC5yZXN1bHQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgbW9kdWxlRm9yKHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZyk6IExvYWRlZE5hdGl2ZU1vZHVsZSB7XG4gICAgY29uc3QgbW9kID0gdGhpcy5tb2R1bGVzLmdldChtb2R1bGVLZXkodHdlYWtJZCwgaWQpKTtcbiAgICBpZiAoIW1vZCkgdGhyb3cgbmV3IEVycm9yKGBuYXRpdmUgbW9kdWxlIGlzIG5vdCBsb2FkZWQ6ICR7dHdlYWtJZH06JHtpZH1gKTtcbiAgICByZXR1cm4gbW9kO1xuICB9XG5cbiAgcHJpdmF0ZSBpbnN0YW5jZUZvcih0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiBOYXRpdmVJbnN0YW5jZSB7XG4gICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoaW5zdGFuY2VLZXkodHdlYWtJZCwgaWQpKTtcbiAgICBpZiAoIWluc3RhbmNlKSB0aHJvdyBuZXcgRXJyb3IoYG5hdGl2ZSBpbnN0YW5jZSBpcyBub3QgbG9hZGVkOiAke3R3ZWFrSWR9OiR7aWR9YCk7XG4gICAgcmV0dXJuIGluc3RhbmNlO1xuICB9XG5cbiAgcHJpdmF0ZSBoZWxwZXJGb3IodHdlYWtJZDogc3RyaW5nLCBpZDogc3RyaW5nKTogTmF0aXZlSGVscGVyUHJvY2VzcyB7XG4gICAgY29uc3QgaGVscGVyID0gdGhpcy5oZWxwZXJzLmdldChoZWxwZXJLZXkodHdlYWtJZCwgaWQpKTtcbiAgICBpZiAoIWhlbHBlcikgdGhyb3cgbmV3IEVycm9yKGBuYXRpdmUgaGVscGVyIGlzIG5vdCBydW5uaW5nOiAke3R3ZWFrSWR9OiR7aWR9YCk7XG4gICAgcmV0dXJuIGhlbHBlcjtcbiAgfVxufVxuXG5mdW5jdGlvbiByZXNvbHZlVHdlYWtQYXRoKGN0eDogTmF0aXZlVHdlYWtDb250ZXh0LCBwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcmVzb2x2ZU5hdGl2ZVR3ZWFrUGF0aChjdHguZGlyLCBwYXRoKTtcbn1cblxuZnVuY3Rpb24gaW5mZXJNb2R1bGVLaW5kKHBhdGg6IHN0cmluZyk6IE5hdGl2ZU1vZHVsZUtpbmQge1xuICBpZiAocGF0aC5lbmRzV2l0aChcIi5ub2RlXCIpKSByZXR1cm4gXCJub2RlLWFkZG9uXCI7XG4gIGlmIChwYXRoLmVuZHNXaXRoKFwiLmR5bGliXCIpKSByZXR1cm4gXCJkeWxpYlwiO1xuICBpZiAocGF0aC5lbmRzV2l0aChcIi5mcmFtZXdvcmtcIikpIHJldHVybiBcImZyYW1ld29ya1wiO1xuICB0aHJvdyBuZXcgRXJyb3IoXCJuYXRpdmUgbW9kdWxlIHBhdGggbXVzdCBlbmQgaW4gLm5vZGUsIC5keWxpYiwgb3IgLmZyYW1ld29ya1wiKTtcbn1cblxuZnVuY3Rpb24gc2VsZWN0RW50cnlwb2ludChsb2FkZWQ6IHVua25vd24sIGVudHJ5cG9pbnQ6IHN0cmluZyB8IHVuZGVmaW5lZCk6IHVua25vd24ge1xuICBpZiAoIWVudHJ5cG9pbnQpIHJldHVybiBhc1JlY29yZChsb2FkZWQpPy5kZWZhdWx0ID8/IGxvYWRlZDtcbiAgY29uc3Qgc2VsZWN0ZWQgPSBhc1JlY29yZChsb2FkZWQpPy5bZW50cnlwb2ludF07XG4gIGlmIChzZWxlY3RlZCA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoYG5hdGl2ZSBtb2R1bGUgZW50cnlwb2ludCBub3QgZm91bmQ6ICR7ZW50cnlwb2ludH1gKTtcbiAgcmV0dXJuIHNlbGVjdGVkO1xufVxuXG5mdW5jdGlvbiBhc3NlcnRCcmlkZ2VJZCh2YWx1ZTogc3RyaW5nLCBsYWJlbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIiB8fCAhL15bYS16QS1aMC05Ll8tXSskLy50ZXN0KHZhbHVlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgJHtsYWJlbH0gbWF5IG9ubHkgY29udGFpbiBsZXR0ZXJzLCBudW1iZXJzLCBkb3RzLCB1bmRlcnNjb3JlcywgYW5kIGRhc2hlc2ApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gbW9kdWxlS2V5KHR3ZWFrSWQ6IHN0cmluZywgbW9kdWxlSWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgJHt0d2Vha0lkfToke21vZHVsZUlkfWA7XG59XG5cbmZ1bmN0aW9uIGluc3RhbmNlS2V5KHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgJHt0d2Vha0lkfToke2lkfWA7XG59XG5cbmZ1bmN0aW9uIGhlbHBlcktleSh0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7dHdlYWtJZH06JHtpZH1gO1xufVxuXG5mdW5jdGlvbiBhc1JlY29yZCh2YWx1ZTogdW5rbm93bik6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbCB7XG4gIHJldHVybiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgPyB2YWx1ZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA6IG51bGw7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNhbGxPcHRpb25hbCh0YXJnZXQ6IHVua25vd24sIG1ldGhvZDogc3RyaW5nLCBhcmdzOiB1bmtub3duW10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgZm4gPSBhc1JlY29yZCh0YXJnZXQpPy5bbWV0aG9kXTtcbiAgaWYgKHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiKSBhd2FpdCBmbi5hcHBseSh0YXJnZXQsIGFyZ3MpO1xufVxuXG5mdW5jdGlvbiBwYXJlbnRXaW5kb3dTdGF0ZShwYXJlbnRXaW5kb3c6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3csIHJlYXNvbjogc3RyaW5nKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsIHtcbiAgaWYgKGlzV2luZG93RGVzdHJveWVkKHBhcmVudFdpbmRvdykpIHJldHVybiBudWxsO1xuICBjb25zdCBib3VuZHMgPSBjYWxsV2luZG93TWV0aG9kPEVsZWN0cm9uLlJlY3RhbmdsZT4ocGFyZW50V2luZG93LCBcImdldEJvdW5kc1wiKTtcbiAgY29uc3QgY29udGVudEJvdW5kcyA9IGNhbGxXaW5kb3dNZXRob2Q8RWxlY3Ryb24uUmVjdGFuZ2xlPihwYXJlbnRXaW5kb3csIFwiZ2V0Q29udGVudEJvdW5kc1wiKTtcbiAgcmV0dXJuIHtcbiAgICByZWFzb24sXG4gICAgd2luZG93SWQ6IHdpbmRvd0lkRm9yKHBhcmVudFdpbmRvdyksXG4gICAgd2ViQ29udGVudHNJZDogd2ViQ29udGVudHNJZEZvcihwYXJlbnRXaW5kb3cpLFxuICAgIGJvdW5kcyxcbiAgICBjb250ZW50Qm91bmRzLFxuICAgIHZpc2libGU6IGNhbGxXaW5kb3dNZXRob2Q8Ym9vbGVhbj4ocGFyZW50V2luZG93LCBcImlzVmlzaWJsZVwiKSA/PyBudWxsLFxuICAgIGZvY3VzZWQ6IGNhbGxXaW5kb3dNZXRob2Q8Ym9vbGVhbj4ocGFyZW50V2luZG93LCBcImlzRm9jdXNlZFwiKSA/PyBudWxsLFxuICAgIG1pbmltaXplZDogY2FsbFdpbmRvd01ldGhvZDxib29sZWFuPihwYXJlbnRXaW5kb3csIFwiaXNNaW5pbWl6ZWRcIikgPz8gbnVsbCxcbiAgICBtYXhpbWl6ZWQ6IGNhbGxXaW5kb3dNZXRob2Q8Ym9vbGVhbj4ocGFyZW50V2luZG93LCBcImlzTWF4aW1pemVkXCIpID8/IG51bGwsXG4gICAgZnVsbHNjcmVlbjogY2FsbFdpbmRvd01ldGhvZDxib29sZWFuPihwYXJlbnRXaW5kb3csIFwiaXNGdWxsU2NyZWVuXCIpID8/IG51bGwsXG4gIH07XG59XG5cbmZ1bmN0aW9uIG5hdGl2ZUhhbmRsZUZvcldpbmRvdyhwYXJlbnRXaW5kb3c6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsIHwgdW5kZWZpbmVkKTogQnVmZmVyIHwgbnVsbCB7XG4gIGlmICghcGFyZW50V2luZG93IHx8IGlzV2luZG93RGVzdHJveWVkKHBhcmVudFdpbmRvdykpIHJldHVybiBudWxsO1xuICBjb25zdCBmbiA9IGFzUmVjb3JkKHBhcmVudFdpbmRvdyk/LmdldE5hdGl2ZVdpbmRvd0hhbmRsZTtcbiAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm4gbnVsbDtcbiAgdHJ5IHtcbiAgICBjb25zdCBoYW5kbGUgPSBmbi5jYWxsKHBhcmVudFdpbmRvdyk7XG4gICAgcmV0dXJuIEJ1ZmZlci5pc0J1ZmZlcihoYW5kbGUpID8gaGFuZGxlIDogbnVsbDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gY2FuQmluZFBhcmVudFdpbmRvdyhcbiAgcGFyZW50V2luZG93OiBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbCB8IHVuZGVmaW5lZCxcbik6IHBhcmVudFdpbmRvdyBpcyBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHtcbiAgaWYgKCFwYXJlbnRXaW5kb3cgfHwgaXNXaW5kb3dEZXN0cm95ZWQocGFyZW50V2luZG93KSkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gdHlwZW9mIGFzUmVjb3JkKHBhcmVudFdpbmRvdyk/Lm9uID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICB0eXBlb2YgYXNSZWNvcmQocGFyZW50V2luZG93KT8ub2ZmID09PSBcImZ1bmN0aW9uXCI7XG59XG5cbmZ1bmN0aW9uIGlzV2luZG93RGVzdHJveWVkKHBhcmVudFdpbmRvdzogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGwgfCB1bmRlZmluZWQpOiBib29sZWFuIHtcbiAgY29uc3QgZm4gPSBhc1JlY29yZChwYXJlbnRXaW5kb3cpPy5pc0Rlc3Ryb3llZDtcbiAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm4gZmFsc2U7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEJvb2xlYW4oZm4uY2FsbChwYXJlbnRXaW5kb3cpKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cblxuZnVuY3Rpb24gd2luZG93SWRGb3IocGFyZW50V2luZG93OiBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbCB8IHVuZGVmaW5lZCk6IG51bWJlciB8IG51bGwge1xuICBjb25zdCBpZCA9IGFzUmVjb3JkKHBhcmVudFdpbmRvdyk/LmlkO1xuICByZXR1cm4gdHlwZW9mIGlkID09PSBcIm51bWJlclwiID8gaWQgOiBudWxsO1xufVxuXG5mdW5jdGlvbiB3ZWJDb250ZW50c0lkRm9yKHBhcmVudFdpbmRvdzogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGwgfCB1bmRlZmluZWQpOiBudW1iZXIgfCBudWxsIHtcbiAgY29uc3Qgd2ViQ29udGVudHMgPSBhc1JlY29yZChhc1JlY29yZChwYXJlbnRXaW5kb3cpPy53ZWJDb250ZW50cyk7XG4gIGNvbnN0IGlkID0gd2ViQ29udGVudHM/LmlkO1xuICByZXR1cm4gdHlwZW9mIGlkID09PSBcIm51bWJlclwiID8gaWQgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBjYWxsV2luZG93TWV0aG9kPFQ+KHBhcmVudFdpbmRvdzogRWxlY3Ryb24uQnJvd3NlcldpbmRvdywgbWV0aG9kOiBzdHJpbmcpOiBUIHwgbnVsbCB7XG4gIGNvbnN0IGZuID0gYXNSZWNvcmQocGFyZW50V2luZG93KT8uW21ldGhvZF07XG4gIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIG51bGw7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGZuLmNhbGwocGFyZW50V2luZG93KSBhcyBUO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuIiwgImltcG9ydCB7IHJlYWxwYXRoU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBpc0Fic29sdXRlLCByZWxhdGl2ZSwgcmVzb2x2ZSB9IGZyb20gXCJub2RlOnBhdGhcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVOYXRpdmVUd2Vha1BhdGgodHdlYWtEaXI6IHN0cmluZywgcGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKHR5cGVvZiBwYXRoICE9PSBcInN0cmluZ1wiIHx8IHBhdGgudHJpbSgpID09PSBcIlwiKSB0aHJvdyBuZXcgRXJyb3IoXCJuYXRpdmUgcGF0aCBpcyByZXF1aXJlZFwiKTtcbiAgY29uc3Qgcm9vdCA9IHJlYWxwYXRoU3luYyh0d2Vha0Rpcik7XG4gIGNvbnN0IGZ1bGwgPSByZXNvbHZlKHR3ZWFrRGlyLCBwYXRoKTtcbiAgbGV0IHRhcmdldDogc3RyaW5nO1xuICB0cnkge1xuICAgIHRhcmdldCA9IHJlYWxwYXRoU3luYyhmdWxsKTtcbiAgfSBjYXRjaCB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwibmF0aXZlIHBhdGggZG9lcyBub3QgZXhpc3RcIik7XG4gIH1cbiAgaWYgKCFpc1BhdGhJbnNpZGUocm9vdCwgdGFyZ2V0KSB8fCB0YXJnZXQgPT09IHJvb3QpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJuYXRpdmUgcGF0aCBtdXN0IHN0YXkgaW5zaWRlIHRoZSB0d2VhayBkaXJlY3RvcnlcIik7XG4gIH1cbiAgcmV0dXJuIHRhcmdldDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzUGF0aEluc2lkZShwYXJlbnQ6IHN0cmluZywgdGFyZ2V0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgcmVsID0gcmVsYXRpdmUocmVzb2x2ZShwYXJlbnQpLCByZXNvbHZlKHRhcmdldCkpO1xuICByZXR1cm4gcmVsID09PSBcIlwiIHx8ICghIXJlbCAmJiAhcmVsLnN0YXJ0c1dpdGgoXCIuLlwiKSAmJiAhaXNBYnNvbHV0ZShyZWwpKTtcbn1cbiIsICJpbXBvcnQgdHlwZSB7IFR3ZWFrTWFuaWZlc3QgfSBmcm9tIFwiQGNvZGV4LXBsdXNwbHVzL3Nka1wiO1xuXG5leHBvcnQgY29uc3QgREVGQVVMVF9UV0VBS19TVE9SRV9JTkRFWF9VUkwgPVxuICBcImh0dHBzOi8vYi1ubmV0dC5naXRodWIuaW8vY29kZXgtcGx1c3BsdXMvc3RvcmUvaW5kZXguanNvblwiO1xuZXhwb3J0IGNvbnN0IFRXRUFLX1NUT1JFX1JFVklFV19JU1NVRV9VUkwgPVxuICBcImh0dHBzOi8vZ2l0aHViLmNvbS9iLW5uZXR0L2NvZGV4LXBsdXNwbHVzL2lzc3Vlcy9uZXdcIjtcblxuZXhwb3J0IGludGVyZmFjZSBUd2Vha1N0b3JlUmVnaXN0cnkge1xuICBzY2hlbWFWZXJzaW9uOiAxO1xuICBnZW5lcmF0ZWRBdD86IHN0cmluZztcbiAgZW50cmllczogVHdlYWtTdG9yZUVudHJ5W107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHdlYWtTdG9yZUVudHJ5IHtcbiAgaWQ6IHN0cmluZztcbiAgbWFuaWZlc3Q6IFR3ZWFrTWFuaWZlc3Q7XG4gIHJlcG86IHN0cmluZztcbiAgYXBwcm92ZWRDb21taXRTaGE6IHN0cmluZztcbiAgYXBwcm92ZWRBdDogc3RyaW5nO1xuICBhcHByb3ZlZEJ5OiBzdHJpbmc7XG4gIHBsYXRmb3Jtcz86IFR3ZWFrU3RvcmVQbGF0Zm9ybVtdO1xuICByZWxlYXNlVXJsPzogc3RyaW5nO1xuICByZXZpZXdVcmw/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCB0eXBlIFR3ZWFrU3RvcmVQbGF0Zm9ybSA9IFwiZGFyd2luXCIgfCBcIndpbjMyXCIgfCBcImxpbnV4XCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHdlYWtTdG9yZVB1Ymxpc2hTdWJtaXNzaW9uIHtcbiAgcmVwbzogc3RyaW5nO1xuICBkZWZhdWx0QnJhbmNoOiBzdHJpbmc7XG4gIGNvbW1pdFNoYTogc3RyaW5nO1xuICBjb21taXRVcmw6IHN0cmluZztcbiAgbWFuaWZlc3Q/OiB7XG4gICAgaWQ/OiBzdHJpbmc7XG4gICAgbmFtZT86IHN0cmluZztcbiAgICB2ZXJzaW9uPzogc3RyaW5nO1xuICAgIGRlc2NyaXB0aW9uPzogc3RyaW5nO1xuICAgIGljb25Vcmw/OiBzdHJpbmc7XG4gIH07XG59XG5cbmNvbnN0IEdJVEhVQl9SRVBPX1JFID0gL15bQS1aYS16MC05Xy4tXStcXC9bQS1aYS16MC05Xy4tXSskLztcbmNvbnN0IEZVTExfU0hBX1JFID0gL15bYS1mMC05XXs0MH0kL2k7XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVHaXRIdWJSZXBvKGlucHV0OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCByYXcgPSBpbnB1dC50cmltKCk7XG4gIGlmICghcmF3KSB0aHJvdyBuZXcgRXJyb3IoXCJHaXRIdWIgcmVwbyBpcyByZXF1aXJlZFwiKTtcblxuICBjb25zdCBzc2ggPSAvXmdpdEBnaXRodWJcXC5jb206KFteL10rXFwvW14vXSs/KSg/OlxcLmdpdCk/JC9pLmV4ZWMocmF3KTtcbiAgaWYgKHNzaCkgcmV0dXJuIG5vcm1hbGl6ZVJlcG9QYXJ0KHNzaFsxXSk7XG5cbiAgaWYgKC9eaHR0cHM/OlxcL1xcLy9pLnRlc3QocmF3KSkge1xuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocmF3KTtcbiAgICBpZiAodXJsLmhvc3RuYW1lICE9PSBcImdpdGh1Yi5jb21cIikgdGhyb3cgbmV3IEVycm9yKFwiT25seSBnaXRodWIuY29tIHJlcG9zaXRvcmllcyBhcmUgc3VwcG9ydGVkXCIpO1xuICAgIGNvbnN0IHBhcnRzID0gdXJsLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8rfFxcLyskL2csIFwiXCIpLnNwbGl0KFwiL1wiKTtcbiAgICBpZiAocGFydHMubGVuZ3RoIDwgMikgdGhyb3cgbmV3IEVycm9yKFwiR2l0SHViIHJlcG8gVVJMIG11c3QgaW5jbHVkZSBvd25lciBhbmQgcmVwb3NpdG9yeVwiKTtcbiAgICByZXR1cm4gbm9ybWFsaXplUmVwb1BhcnQoYCR7cGFydHNbMF19LyR7cGFydHNbMV19YCk7XG4gIH1cblxuICByZXR1cm4gbm9ybWFsaXplUmVwb1BhcnQocmF3KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVN0b3JlUmVnaXN0cnkoaW5wdXQ6IHVua25vd24pOiBUd2Vha1N0b3JlUmVnaXN0cnkge1xuICBjb25zdCByZWdpc3RyeSA9IGlucHV0IGFzIFBhcnRpYWw8VHdlYWtTdG9yZVJlZ2lzdHJ5PiB8IG51bGw7XG4gIGlmICghcmVnaXN0cnkgfHwgcmVnaXN0cnkuc2NoZW1hVmVyc2lvbiAhPT0gMSB8fCAhQXJyYXkuaXNBcnJheShyZWdpc3RyeS5lbnRyaWVzKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIlVuc3VwcG9ydGVkIHR3ZWFrIHN0b3JlIHJlZ2lzdHJ5XCIpO1xuICB9XG4gIGNvbnN0IGVudHJpZXMgPSByZWdpc3RyeS5lbnRyaWVzLm1hcChub3JtYWxpemVTdG9yZUVudHJ5KTtcbiAgZW50cmllcy5zb3J0KChhLCBiKSA9PiBhLm1hbmlmZXN0Lm5hbWUubG9jYWxlQ29tcGFyZShiLm1hbmlmZXN0Lm5hbWUpKTtcbiAgcmV0dXJuIHtcbiAgICBzY2hlbWFWZXJzaW9uOiAxLFxuICAgIGdlbmVyYXRlZEF0OiB0eXBlb2YgcmVnaXN0cnkuZ2VuZXJhdGVkQXQgPT09IFwic3RyaW5nXCIgPyByZWdpc3RyeS5nZW5lcmF0ZWRBdCA6IHVuZGVmaW5lZCxcbiAgICBlbnRyaWVzLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2h1ZmZsZVN0b3JlRW50cmllczxUPihcbiAgZW50cmllczogcmVhZG9ubHkgVFtdLFxuICByYW5kb21JbmRleDogKGV4Y2x1c2l2ZU1heDogbnVtYmVyKSA9PiBudW1iZXIgPSAoZXhjbHVzaXZlTWF4KSA9PiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBleGNsdXNpdmVNYXgpLFxuKTogVFtdIHtcbiAgY29uc3Qgc2h1ZmZsZWQgPSBbLi4uZW50cmllc107XG4gIGZvciAobGV0IGkgPSBzaHVmZmxlZC5sZW5ndGggLSAxOyBpID4gMDsgaSAtPSAxKSB7XG4gICAgY29uc3QgaiA9IHJhbmRvbUluZGV4KGkgKyAxKTtcbiAgICBpZiAoIU51bWJlci5pc0ludGVnZXIoaikgfHwgaiA8IDAgfHwgaiA+IGkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgc2h1ZmZsZSByYW5kb21JbmRleCByZXR1cm5lZCAke2p9OyBleHBlY3RlZCBhbiBpbnRlZ2VyIGZyb20gMCB0byAke2l9YCk7XG4gICAgfVxuICAgIFtzaHVmZmxlZFtpXSwgc2h1ZmZsZWRbal1dID0gW3NodWZmbGVkW2pdLCBzaHVmZmxlZFtpXV07XG4gIH1cbiAgcmV0dXJuIHNodWZmbGVkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplU3RvcmVFbnRyeShpbnB1dDogdW5rbm93bik6IFR3ZWFrU3RvcmVFbnRyeSB7XG4gIGNvbnN0IGVudHJ5ID0gaW5wdXQgYXMgUGFydGlhbDxUd2Vha1N0b3JlRW50cnk+IHwgbnVsbDtcbiAgaWYgKCFlbnRyeSB8fCB0eXBlb2YgZW50cnkgIT09IFwib2JqZWN0XCIpIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgdHdlYWsgc3RvcmUgZW50cnlcIik7XG4gIGNvbnN0IHJlcG8gPSBub3JtYWxpemVHaXRIdWJSZXBvKFN0cmluZyhlbnRyeS5yZXBvID8/IGVudHJ5Lm1hbmlmZXN0Py5naXRodWJSZXBvID8/IFwiXCIpKTtcbiAgY29uc3QgbWFuaWZlc3QgPSBlbnRyeS5tYW5pZmVzdCBhcyBUd2Vha01hbmlmZXN0IHwgdW5kZWZpbmVkO1xuICBpZiAoIW1hbmlmZXN0Py5pZCB8fCAhbWFuaWZlc3QubmFtZSB8fCAhbWFuaWZlc3QudmVyc2lvbikge1xuICAgIHRocm93IG5ldyBFcnJvcihgU3RvcmUgZW50cnkgZm9yICR7cmVwb30gaXMgbWlzc2luZyBtYW5pZmVzdCBmaWVsZHNgKTtcbiAgfVxuICBpZiAobm9ybWFsaXplR2l0SHViUmVwbyhtYW5pZmVzdC5naXRodWJSZXBvKSAhPT0gcmVwbykge1xuICAgIHRocm93IG5ldyBFcnJvcihgU3RvcmUgZW50cnkgJHttYW5pZmVzdC5pZH0gcmVwbyBkb2VzIG5vdCBtYXRjaCBtYW5pZmVzdCBnaXRodWJSZXBvYCk7XG4gIH1cbiAgaWYgKCFpc0Z1bGxDb21taXRTaGEoU3RyaW5nKGVudHJ5LmFwcHJvdmVkQ29tbWl0U2hhID8/IFwiXCIpKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgU3RvcmUgZW50cnkgJHttYW5pZmVzdC5pZH0gbXVzdCBwaW4gYSBmdWxsIGFwcHJvdmVkIGNvbW1pdCBTSEFgKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIGlkOiBtYW5pZmVzdC5pZCxcbiAgICBtYW5pZmVzdCxcbiAgICByZXBvLFxuICAgIGFwcHJvdmVkQ29tbWl0U2hhOiBTdHJpbmcoZW50cnkuYXBwcm92ZWRDb21taXRTaGEpLFxuICAgIGFwcHJvdmVkQXQ6IHR5cGVvZiBlbnRyeS5hcHByb3ZlZEF0ID09PSBcInN0cmluZ1wiID8gZW50cnkuYXBwcm92ZWRBdCA6IFwiXCIsXG4gICAgYXBwcm92ZWRCeTogdHlwZW9mIGVudHJ5LmFwcHJvdmVkQnkgPT09IFwic3RyaW5nXCIgPyBlbnRyeS5hcHByb3ZlZEJ5IDogXCJcIixcbiAgICBwbGF0Zm9ybXM6IG5vcm1hbGl6ZVN0b3JlUGxhdGZvcm1zKChlbnRyeSBhcyB7IHBsYXRmb3Jtcz86IHVua25vd24gfSkucGxhdGZvcm1zKSxcbiAgICByZWxlYXNlVXJsOiBvcHRpb25hbEdpdGh1YlVybChlbnRyeS5yZWxlYXNlVXJsKSxcbiAgICByZXZpZXdVcmw6IG9wdGlvbmFsR2l0aHViVXJsKGVudHJ5LnJldmlld1VybCksXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdG9yZUFyY2hpdmVVcmwoZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSk6IHN0cmluZyB7XG4gIGlmICghaXNGdWxsQ29tbWl0U2hhKGVudHJ5LmFwcHJvdmVkQ29tbWl0U2hhKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgU3RvcmUgZW50cnkgJHtlbnRyeS5pZH0gaXMgbm90IHBpbm5lZCB0byBhIGZ1bGwgY29tbWl0IFNIQWApO1xuICB9XG4gIHJldHVybiBgaHR0cHM6Ly9jb2RlbG9hZC5naXRodWIuY29tLyR7ZW50cnkucmVwb30vdGFyLmd6LyR7ZW50cnkuYXBwcm92ZWRDb21taXRTaGF9YDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkVHdlYWtQdWJsaXNoSXNzdWVVcmwoc3VibWlzc2lvbjogVHdlYWtTdG9yZVB1Ymxpc2hTdWJtaXNzaW9uKTogc3RyaW5nIHtcbiAgY29uc3QgcmVwbyA9IG5vcm1hbGl6ZUdpdEh1YlJlcG8oc3VibWlzc2lvbi5yZXBvKTtcbiAgaWYgKCFpc0Z1bGxDb21taXRTaGEoc3VibWlzc2lvbi5jb21taXRTaGEpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiU3VibWlzc2lvbiBtdXN0IGluY2x1ZGUgdGhlIGZ1bGwgY29tbWl0IFNIQSB0byByZXZpZXdcIik7XG4gIH1cbiAgY29uc3QgdGl0bGUgPSBgVHdlYWsgc3RvcmUgcmV2aWV3OiAke3JlcG99YDtcbiAgY29uc3QgYm9keSA9IFtcbiAgICBcIiMjIFR3ZWFrIHJlcG9cIixcbiAgICBgaHR0cHM6Ly9naXRodWIuY29tLyR7cmVwb31gLFxuICAgIFwiXCIsXG4gICAgXCIjIyBDb21taXQgdG8gcmV2aWV3XCIsXG4gICAgc3VibWlzc2lvbi5jb21taXRTaGEsXG4gICAgc3VibWlzc2lvbi5jb21taXRVcmwsXG4gICAgXCJcIixcbiAgICBcIkRvIG5vdCBhcHByb3ZlIGEgZGlmZmVyZW50IGNvbW1pdC4gSWYgdGhlIGF1dGhvciBwdXNoZXMgY2hhbmdlcywgYXNrIHRoZW0gdG8gcmVzdWJtaXQuXCIsXG4gICAgXCJcIixcbiAgICBcIiMjIE1hbmlmZXN0XCIsXG4gICAgYC0gaWQ6ICR7c3VibWlzc2lvbi5tYW5pZmVzdD8uaWQgPz8gXCIobm90IGRldGVjdGVkKVwifWAsXG4gICAgYC0gbmFtZTogJHtzdWJtaXNzaW9uLm1hbmlmZXN0Py5uYW1lID8/IFwiKG5vdCBkZXRlY3RlZClcIn1gLFxuICAgIGAtIHZlcnNpb246ICR7c3VibWlzc2lvbi5tYW5pZmVzdD8udmVyc2lvbiA/PyBcIihub3QgZGV0ZWN0ZWQpXCJ9YCxcbiAgICBgLSBkZXNjcmlwdGlvbjogJHtzdWJtaXNzaW9uLm1hbmlmZXN0Py5kZXNjcmlwdGlvbiA/PyBcIihub3QgZGV0ZWN0ZWQpXCJ9YCxcbiAgICBgLSBpY29uVXJsOiAke3N1Ym1pc3Npb24ubWFuaWZlc3Q/Lmljb25VcmwgPz8gXCIobm90IGRldGVjdGVkKVwifWAsXG4gICAgXCJcIixcbiAgICBcIiMjIEFkbWluIGNoZWNrbGlzdFwiLFxuICAgIFwiLSBbIF0gbWFuaWZlc3QuanNvbiBpcyB2YWxpZFwiLFxuICAgIFwiLSBbIF0gbWFuaWZlc3QuaWNvblVybCBpcyB1c2FibGUgYXMgdGhlIHN0b3JlIGljb25cIixcbiAgICBcIi0gWyBdIHNvdXJjZSB3YXMgcmV2aWV3ZWQgYXQgdGhlIGV4YWN0IGNvbW1pdCBhYm92ZVwiLFxuICAgIFwiLSBbIF0gYHN0b3JlL2luZGV4Lmpzb25gIGVudHJ5IHBpbnMgYGFwcHJvdmVkQ29tbWl0U2hhYCB0byB0aGUgZXhhY3QgY29tbWl0IGFib3ZlXCIsXG4gIF0uam9pbihcIlxcblwiKTtcbiAgY29uc3QgdXJsID0gbmV3IFVSTChUV0VBS19TVE9SRV9SRVZJRVdfSVNTVUVfVVJMKTtcbiAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoXCJ0ZW1wbGF0ZVwiLCBcInR3ZWFrLXN0b3JlLXJldmlldy5tZFwiKTtcbiAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoXCJ0aXRsZVwiLCB0aXRsZSk7XG4gIHVybC5zZWFyY2hQYXJhbXMuc2V0KFwiYm9keVwiLCBib2R5KTtcbiAgcmV0dXJuIHVybC50b1N0cmluZygpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNGdWxsQ29tbWl0U2hhKHZhbHVlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIEZVTExfU0hBX1JFLnRlc3QodmFsdWUpO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVSZXBvUGFydCh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgcmVwbyA9IHZhbHVlLnRyaW0oKS5yZXBsYWNlKC9cXC5naXQkL2ksIFwiXCIpLnJlcGxhY2UoL15cXC8rfFxcLyskL2csIFwiXCIpO1xuICBpZiAoIUdJVEhVQl9SRVBPX1JFLnRlc3QocmVwbykpIHRocm93IG5ldyBFcnJvcihcIkdpdEh1YiByZXBvIG11c3QgYmUgaW4gb3duZXIvcmVwbyBmb3JtXCIpO1xuICByZXR1cm4gcmVwbztcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplU3RvcmVQbGF0Zm9ybXMoaW5wdXQ6IHVua25vd24pOiBUd2Vha1N0b3JlUGxhdGZvcm1bXSB8IHVuZGVmaW5lZCB7XG4gIGlmIChpbnB1dCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdW5kZWZpbmVkO1xuICBpZiAoIUFycmF5LmlzQXJyYXkoaW5wdXQpKSB0aHJvdyBuZXcgRXJyb3IoXCJTdG9yZSBlbnRyeSBwbGF0Zm9ybXMgbXVzdCBiZSBhbiBhcnJheVwiKTtcbiAgY29uc3QgYWxsb3dlZCA9IG5ldyBTZXQ8VHdlYWtTdG9yZVBsYXRmb3JtPihbXCJkYXJ3aW5cIiwgXCJ3aW4zMlwiLCBcImxpbnV4XCJdKTtcbiAgY29uc3QgcGxhdGZvcm1zID0gQXJyYXkuZnJvbShuZXcgU2V0KGlucHV0Lm1hcCgodmFsdWUpID0+IHtcbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiIHx8ICFhbGxvd2VkLmhhcyh2YWx1ZSBhcyBUd2Vha1N0b3JlUGxhdGZvcm0pKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIHN0b3JlIHBsYXRmb3JtOiAke1N0cmluZyh2YWx1ZSl9YCk7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZSBhcyBUd2Vha1N0b3JlUGxhdGZvcm07XG4gIH0pKSk7XG4gIHJldHVybiBwbGF0Zm9ybXMubGVuZ3RoID4gMCA/IHBsYXRmb3JtcyA6IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gb3B0aW9uYWxHaXRodWJVcmwodmFsdWU6IHVua25vd24pOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiIHx8ICF2YWx1ZS50cmltKCkpIHJldHVybiB1bmRlZmluZWQ7XG4gIGNvbnN0IHVybCA9IG5ldyBVUkwodmFsdWUpO1xuICBpZiAodXJsLnByb3RvY29sICE9PSBcImh0dHBzOlwiIHx8IHVybC5ob3N0bmFtZSAhPT0gXCJnaXRodWIuY29tXCIpIHJldHVybiB1bmRlZmluZWQ7XG4gIHJldHVybiB1cmwudG9TdHJpbmcoKTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFTQSxJQUFBQSxtQkFBaUc7QUFDakcsSUFBQUMsa0JBQXVIO0FBQ3ZILElBQUFDLDZCQUErQztBQUMvQyxJQUFBQyxzQkFBa0Q7QUFDbEQsSUFBQUMsb0JBQTZEO0FBQzdELElBQUFDLGtCQUFnQzs7O0FDYmhDLElBQUFDLGFBQStCO0FBQy9CLElBQUFDLG1CQUE4QjtBQUM5QixvQkFBNkI7QUFDN0IsSUFBQUMsV0FBeUI7OztBQ0p6QixzQkFBK0M7QUFDL0MseUJBQXlCO0FBQ3pCLHVCQUF1RjtBQUNoRixJQUFNLGFBQWE7QUFBQSxFQUN0QixXQUFXO0FBQUEsRUFDWCxVQUFVO0FBQUEsRUFDVixlQUFlO0FBQUEsRUFDZixpQkFBaUI7QUFDckI7QUFDQSxJQUFNLGlCQUFpQjtBQUFBLEVBQ25CLE1BQU07QUFBQSxFQUNOLFlBQVksQ0FBQyxlQUFlO0FBQUEsRUFDNUIsaUJBQWlCLENBQUMsZUFBZTtBQUFBLEVBQ2pDLE1BQU0sV0FBVztBQUFBLEVBQ2pCLE9BQU87QUFBQSxFQUNQLE9BQU87QUFBQSxFQUNQLFlBQVk7QUFBQSxFQUNaLGVBQWU7QUFDbkI7QUFDQSxPQUFPLE9BQU8sY0FBYztBQUM1QixJQUFNLHVCQUF1QjtBQUM3QixJQUFNLHFCQUFxQixvQkFBSSxJQUFJLENBQUMsVUFBVSxTQUFTLFVBQVUsU0FBUyxvQkFBb0IsQ0FBQztBQUMvRixJQUFNLFlBQVk7QUFBQSxFQUNkLFdBQVc7QUFBQSxFQUNYLFdBQVc7QUFBQSxFQUNYLFdBQVc7QUFBQSxFQUNYLFdBQVc7QUFDZjtBQUNBLElBQU0sWUFBWSxvQkFBSSxJQUFJO0FBQUEsRUFDdEIsV0FBVztBQUFBLEVBQ1gsV0FBVztBQUFBLEVBQ1gsV0FBVztBQUNmLENBQUM7QUFDRCxJQUFNLGFBQWEsb0JBQUksSUFBSTtBQUFBLEVBQ3ZCLFdBQVc7QUFBQSxFQUNYLFdBQVc7QUFBQSxFQUNYLFdBQVc7QUFDZixDQUFDO0FBQ0QsSUFBTSxvQkFBb0IsQ0FBQyxVQUFVLG1CQUFtQixJQUFJLE1BQU0sSUFBSTtBQUN0RSxJQUFNLG9CQUFvQixRQUFRLGFBQWE7QUFDL0MsSUFBTSxVQUFVLENBQUMsZUFBZTtBQUNoQyxJQUFNLGtCQUFrQixDQUFDLFdBQVc7QUFDaEMsTUFBSSxXQUFXO0FBQ1gsV0FBTztBQUNYLE1BQUksT0FBTyxXQUFXO0FBQ2xCLFdBQU87QUFDWCxNQUFJLE9BQU8sV0FBVyxVQUFVO0FBQzVCLFVBQU0sS0FBSyxPQUFPLEtBQUs7QUFDdkIsV0FBTyxDQUFDLFVBQVUsTUFBTSxhQUFhO0FBQUEsRUFDekM7QUFDQSxNQUFJLE1BQU0sUUFBUSxNQUFNLEdBQUc7QUFDdkIsVUFBTSxVQUFVLE9BQU8sSUFBSSxDQUFDLFNBQVMsS0FBSyxLQUFLLENBQUM7QUFDaEQsV0FBTyxDQUFDLFVBQVUsUUFBUSxLQUFLLENBQUMsTUFBTSxNQUFNLGFBQWEsQ0FBQztBQUFBLEVBQzlEO0FBQ0EsU0FBTztBQUNYO0FBRU8sSUFBTSxpQkFBTixjQUE2Qiw0QkFBUztBQUFBLEVBQ3pDLFlBQVksVUFBVSxDQUFDLEdBQUc7QUFDdEIsVUFBTTtBQUFBLE1BQ0YsWUFBWTtBQUFBLE1BQ1osYUFBYTtBQUFBLE1BQ2IsZUFBZSxRQUFRO0FBQUEsSUFDM0IsQ0FBQztBQUNELFVBQU0sT0FBTyxFQUFFLEdBQUcsZ0JBQWdCLEdBQUcsUUFBUTtBQUM3QyxVQUFNLEVBQUUsTUFBTSxLQUFLLElBQUk7QUFDdkIsU0FBSyxjQUFjLGdCQUFnQixLQUFLLFVBQVU7QUFDbEQsU0FBSyxtQkFBbUIsZ0JBQWdCLEtBQUssZUFBZTtBQUM1RCxVQUFNLGFBQWEsS0FBSyxRQUFRLHdCQUFRO0FBRXhDLFFBQUksbUJBQW1CO0FBQ25CLFdBQUssUUFBUSxDQUFDLFNBQVMsV0FBVyxNQUFNLEVBQUUsUUFBUSxLQUFLLENBQUM7QUFBQSxJQUM1RCxPQUNLO0FBQ0QsV0FBSyxRQUFRO0FBQUEsSUFDakI7QUFDQSxTQUFLLFlBQVksS0FBSyxTQUFTLGVBQWU7QUFDOUMsU0FBSyxZQUFZLE9BQU8sVUFBVSxJQUFJLElBQUksSUFBSTtBQUM5QyxTQUFLLGFBQWEsT0FBTyxXQUFXLElBQUksSUFBSSxJQUFJO0FBQ2hELFNBQUssbUJBQW1CLFNBQVMsV0FBVztBQUM1QyxTQUFLLFlBQVEsaUJBQUFDLFNBQVMsSUFBSTtBQUMxQixTQUFLLFlBQVksQ0FBQyxLQUFLO0FBQ3ZCLFNBQUssYUFBYSxLQUFLLFlBQVksV0FBVztBQUM5QyxTQUFLLGFBQWEsRUFBRSxVQUFVLFFBQVEsZUFBZSxLQUFLLFVBQVU7QUFFcEUsU0FBSyxVQUFVLENBQUMsS0FBSyxZQUFZLE1BQU0sQ0FBQyxDQUFDO0FBQ3pDLFNBQUssVUFBVTtBQUNmLFNBQUssU0FBUztBQUFBLEVBQ2xCO0FBQUEsRUFDQSxNQUFNLE1BQU0sT0FBTztBQUNmLFFBQUksS0FBSztBQUNMO0FBQ0osU0FBSyxVQUFVO0FBQ2YsUUFBSTtBQUNBLGFBQU8sQ0FBQyxLQUFLLGFBQWEsUUFBUSxHQUFHO0FBQ2pDLGNBQU0sTUFBTSxLQUFLO0FBQ2pCLGNBQU0sTUFBTSxPQUFPLElBQUk7QUFDdkIsWUFBSSxPQUFPLElBQUksU0FBUyxHQUFHO0FBQ3ZCLGdCQUFNLEVBQUUsTUFBTSxNQUFNLElBQUk7QUFDeEIsZ0JBQU0sUUFBUSxJQUFJLE9BQU8sR0FBRyxLQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVcsS0FBSyxhQUFhLFFBQVEsSUFBSSxDQUFDO0FBQ2xGLGdCQUFNLFVBQVUsTUFBTSxRQUFRLElBQUksS0FBSztBQUN2QyxxQkFBVyxTQUFTLFNBQVM7QUFDekIsZ0JBQUksQ0FBQztBQUNEO0FBQ0osZ0JBQUksS0FBSztBQUNMO0FBQ0osa0JBQU0sWUFBWSxNQUFNLEtBQUssY0FBYyxLQUFLO0FBQ2hELGdCQUFJLGNBQWMsZUFBZSxLQUFLLGlCQUFpQixLQUFLLEdBQUc7QUFDM0Qsa0JBQUksU0FBUyxLQUFLLFdBQVc7QUFDekIscUJBQUssUUFBUSxLQUFLLEtBQUssWUFBWSxNQUFNLFVBQVUsUUFBUSxDQUFDLENBQUM7QUFBQSxjQUNqRTtBQUNBLGtCQUFJLEtBQUssV0FBVztBQUNoQixxQkFBSyxLQUFLLEtBQUs7QUFDZjtBQUFBLGNBQ0o7QUFBQSxZQUNKLFlBQ1UsY0FBYyxVQUFVLEtBQUssZUFBZSxLQUFLLE1BQ3ZELEtBQUssWUFBWSxLQUFLLEdBQUc7QUFDekIsa0JBQUksS0FBSyxZQUFZO0FBQ2pCLHFCQUFLLEtBQUssS0FBSztBQUNmO0FBQUEsY0FDSjtBQUFBLFlBQ0o7QUFBQSxVQUNKO0FBQUEsUUFDSixPQUNLO0FBQ0QsZ0JBQU0sU0FBUyxLQUFLLFFBQVEsSUFBSTtBQUNoQyxjQUFJLENBQUMsUUFBUTtBQUNULGlCQUFLLEtBQUssSUFBSTtBQUNkO0FBQUEsVUFDSjtBQUNBLGVBQUssU0FBUyxNQUFNO0FBQ3BCLGNBQUksS0FBSztBQUNMO0FBQUEsUUFDUjtBQUFBLE1BQ0o7QUFBQSxJQUNKLFNBQ08sT0FBTztBQUNWLFdBQUssUUFBUSxLQUFLO0FBQUEsSUFDdEIsVUFDQTtBQUNJLFdBQUssVUFBVTtBQUFBLElBQ25CO0FBQUEsRUFDSjtBQUFBLEVBQ0EsTUFBTSxZQUFZLE1BQU0sT0FBTztBQUMzQixRQUFJO0FBQ0osUUFBSTtBQUNBLGNBQVEsVUFBTSx5QkFBUSxNQUFNLEtBQUssVUFBVTtBQUFBLElBQy9DLFNBQ08sT0FBTztBQUNWLFdBQUssU0FBUyxLQUFLO0FBQUEsSUFDdkI7QUFDQSxXQUFPLEVBQUUsT0FBTyxPQUFPLEtBQUs7QUFBQSxFQUNoQztBQUFBLEVBQ0EsTUFBTSxhQUFhLFFBQVEsTUFBTTtBQUM3QixRQUFJO0FBQ0osVUFBTUMsWUFBVyxLQUFLLFlBQVksT0FBTyxPQUFPO0FBQ2hELFFBQUk7QUFDQSxZQUFNLGVBQVcsaUJBQUFELGFBQVMsaUJBQUFFLE1BQU0sTUFBTUQsU0FBUSxDQUFDO0FBQy9DLGNBQVEsRUFBRSxVQUFNLGlCQUFBRSxVQUFVLEtBQUssT0FBTyxRQUFRLEdBQUcsVUFBVSxVQUFBRixVQUFTO0FBQ3BFLFlBQU0sS0FBSyxVQUFVLElBQUksS0FBSyxZQUFZLFNBQVMsTUFBTSxLQUFLLE1BQU0sUUFBUTtBQUFBLElBQ2hGLFNBQ08sS0FBSztBQUNSLFdBQUssU0FBUyxHQUFHO0FBQ2pCO0FBQUEsSUFDSjtBQUNBLFdBQU87QUFBQSxFQUNYO0FBQUEsRUFDQSxTQUFTLEtBQUs7QUFDVixRQUFJLGtCQUFrQixHQUFHLEtBQUssQ0FBQyxLQUFLLFdBQVc7QUFDM0MsV0FBSyxLQUFLLFFBQVEsR0FBRztBQUFBLElBQ3pCLE9BQ0s7QUFDRCxXQUFLLFFBQVEsR0FBRztBQUFBLElBQ3BCO0FBQUEsRUFDSjtBQUFBLEVBQ0EsTUFBTSxjQUFjLE9BQU87QUFHdkIsUUFBSSxDQUFDLFNBQVMsS0FBSyxjQUFjLE9BQU87QUFDcEMsYUFBTztBQUFBLElBQ1g7QUFDQSxVQUFNLFFBQVEsTUFBTSxLQUFLLFVBQVU7QUFDbkMsUUFBSSxNQUFNLE9BQU87QUFDYixhQUFPO0FBQ1gsUUFBSSxNQUFNLFlBQVk7QUFDbEIsYUFBTztBQUNYLFFBQUksU0FBUyxNQUFNLGVBQWUsR0FBRztBQUNqQyxZQUFNLE9BQU8sTUFBTTtBQUNuQixVQUFJO0FBQ0EsY0FBTSxnQkFBZ0IsVUFBTSwwQkFBUyxJQUFJO0FBQ3pDLGNBQU0scUJBQXFCLFVBQU0sdUJBQU0sYUFBYTtBQUNwRCxZQUFJLG1CQUFtQixPQUFPLEdBQUc7QUFDN0IsaUJBQU87QUFBQSxRQUNYO0FBQ0EsWUFBSSxtQkFBbUIsWUFBWSxHQUFHO0FBQ2xDLGdCQUFNLE1BQU0sY0FBYztBQUMxQixjQUFJLEtBQUssV0FBVyxhQUFhLEtBQUssS0FBSyxPQUFPLEtBQUssQ0FBQyxNQUFNLGlCQUFBRyxLQUFNO0FBQ2hFLGtCQUFNLGlCQUFpQixJQUFJLE1BQU0sK0JBQStCLElBQUksZ0JBQWdCLGFBQWEsR0FBRztBQUVwRywyQkFBZSxPQUFPO0FBQ3RCLG1CQUFPLEtBQUssU0FBUyxjQUFjO0FBQUEsVUFDdkM7QUFDQSxpQkFBTztBQUFBLFFBQ1g7QUFBQSxNQUNKLFNBQ08sT0FBTztBQUNWLGFBQUssU0FBUyxLQUFLO0FBQ25CLGVBQU87QUFBQSxNQUNYO0FBQUEsSUFDSjtBQUFBLEVBQ0o7QUFBQSxFQUNBLGVBQWUsT0FBTztBQUNsQixVQUFNLFFBQVEsU0FBUyxNQUFNLEtBQUssVUFBVTtBQUM1QyxXQUFPLFNBQVMsS0FBSyxvQkFBb0IsQ0FBQyxNQUFNLFlBQVk7QUFBQSxFQUNoRTtBQUNKO0FBT08sU0FBUyxTQUFTLE1BQU0sVUFBVSxDQUFDLEdBQUc7QUFFekMsTUFBSSxPQUFPLFFBQVEsYUFBYSxRQUFRO0FBQ3hDLE1BQUksU0FBUztBQUNULFdBQU8sV0FBVztBQUN0QixNQUFJO0FBQ0EsWUFBUSxPQUFPO0FBQ25CLE1BQUksQ0FBQyxNQUFNO0FBQ1AsVUFBTSxJQUFJLE1BQU0scUVBQXFFO0FBQUEsRUFDekYsV0FDUyxPQUFPLFNBQVMsVUFBVTtBQUMvQixVQUFNLElBQUksVUFBVSwwRUFBMEU7QUFBQSxFQUNsRyxXQUNTLFFBQVEsQ0FBQyxVQUFVLFNBQVMsSUFBSSxHQUFHO0FBQ3hDLFVBQU0sSUFBSSxNQUFNLDZDQUE2QyxVQUFVLEtBQUssSUFBSSxDQUFDLEVBQUU7QUFBQSxFQUN2RjtBQUNBLFVBQVEsT0FBTztBQUNmLFNBQU8sSUFBSSxlQUFlLE9BQU87QUFDckM7OztBQ2pQQSxnQkFBMEQ7QUFDMUQsSUFBQUMsbUJBQTBEO0FBQzFELGNBQXlCO0FBQ3pCLGdCQUErQjtBQUN4QixJQUFNLFdBQVc7QUFDakIsSUFBTSxVQUFVO0FBQ2hCLElBQU0sWUFBWTtBQUNsQixJQUFNLFdBQVcsTUFBTTtBQUFFO0FBRWhDLElBQU0sS0FBSyxRQUFRO0FBQ1osSUFBTSxZQUFZLE9BQU87QUFDekIsSUFBTSxVQUFVLE9BQU87QUFDdkIsSUFBTSxVQUFVLE9BQU87QUFDdkIsSUFBTSxZQUFZLE9BQU87QUFDekIsSUFBTSxhQUFTLFVBQUFDLE1BQU8sTUFBTTtBQUM1QixJQUFNLFNBQVM7QUFBQSxFQUNsQixLQUFLO0FBQUEsRUFDTCxPQUFPO0FBQUEsRUFDUCxLQUFLO0FBQUEsRUFDTCxRQUFRO0FBQUEsRUFDUixTQUFTO0FBQUEsRUFDVCxRQUFRO0FBQUEsRUFDUixZQUFZO0FBQUEsRUFDWixLQUFLO0FBQUEsRUFDTCxPQUFPO0FBQ1g7QUFDQSxJQUFNLEtBQUs7QUFDWCxJQUFNLHNCQUFzQjtBQUM1QixJQUFNLGNBQWMsRUFBRSwrQkFBTyw0QkFBSztBQUNsQyxJQUFNLGdCQUFnQjtBQUN0QixJQUFNLFVBQVU7QUFDaEIsSUFBTSxVQUFVO0FBQ2hCLElBQU0sZUFBZSxDQUFDLGVBQWUsU0FBUyxPQUFPO0FBRXJELElBQU0sbUJBQW1CLG9CQUFJLElBQUk7QUFBQSxFQUM3QjtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFNO0FBQUEsRUFBSztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBWTtBQUFBLEVBQVc7QUFBQSxFQUFTO0FBQUEsRUFDckY7QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQVk7QUFBQSxFQUFNO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFNO0FBQUEsRUFDMUU7QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQU07QUFBQSxFQUFPO0FBQUEsRUFBTTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQ3hEO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBUztBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDdkY7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFZO0FBQUEsRUFBTztBQUFBLEVBQ3JGO0FBQUEsRUFBUztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDdkI7QUFBQSxFQUFhO0FBQUEsRUFBYTtBQUFBLEVBQWE7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFDcEU7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU07QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQVc7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDMUU7QUFBQSxFQUFNO0FBQUEsRUFBTTtBQUFBLEVBQU87QUFBQSxFQUFXO0FBQUEsRUFBTTtBQUFBLEVBQ3BDO0FBQUEsRUFBUTtBQUFBLEVBQVE7QUFBQSxFQUFRO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUM1RDtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUNuRDtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU07QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQzFDO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDckY7QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQVM7QUFBQSxFQUN4QjtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFDdEM7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQVc7QUFBQSxFQUN6QjtBQUFBLEVBQUs7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDdEQ7QUFBQSxFQUFTO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQy9FO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUNmO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUNqRjtBQUFBLEVBQ0E7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFhO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQ3BGO0FBQUEsRUFBTztB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T0FBTyxTQUFTLEtBQUssQ0FBQyxHQUFHO0FBQ2pGLFVBQU0sSUFBSSxNQUFNLDREQUE0RDtBQUFBLEVBQzlFO0FBQ0EsTUFBSSxPQUFPLFFBQVEsS0FBSyxPQUFPLFNBQVMsR0FBRztBQUN6QyxVQUFNLElBQUksTUFBTSw4Q0FBOEM7QUFBQSxFQUNoRTtBQUNGOyIsCiAgIm5hbWVzIjogWyJpbXBvcnRfZWxlY3Ryb24iLCAiaW1wb3J0X25vZGVfZnMiLCAiaW1wb3J0X25vZGVfY2hpbGRfcHJvY2VzcyIsICJpbXBvcnRfbm9kZV9jcnlwdG8iLCAiaW1wb3J0X25vZGVfcGF0aCIsICJpbXBvcnRfbm9kZV9vcyIsICJpbXBvcnRfZnMiLCAiaW1wb3J0X3Byb21pc2VzIiwgInN5c1BhdGgiLCAicHJlc29sdmUiLCAiYmFzZW5hbWUiLCAicGpvaW4iLCAicHJlbGF0aXZlIiwgInBzZXAiLCAiaW1wb3J0X3Byb21pc2VzIiwgIm9zVHlwZSIsICJmc193YXRjaCIsICJyYXdFbWl0dGVyIiwgImxpc3RlbmVyIiwgImJhc2VuYW1lIiwgImRpcm5hbWUiLCAibmV3U3RhdHMiLCAiY2xvc2VyIiwgImZzcmVhbHBhdGgiLCAicmVzb2x2ZSIsICJyZWFscGF0aCIsICJzdGF0cyIsICJyZWxhdGl2ZSIsICJET1VCTEVfU0xBU0hfUkUiLCAidGVzdFN0cmluZyIsICJwYXRoIiwgInN0YXRzIiwgInN0YXRjYiIsICJub3ciLCAic3RhdCIsICJpbXBvcnRfbm9kZV9wYXRoIiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX3BhdGgiLCAiaW1wb3J0X25vZGVfZnMiLCAiaW1wb3J0X25vZGVfcGF0aCIsICJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9wYXRoIiwgInVzZXJSb290IiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX3BhdGgiLCAiaW1wb3J0X2VsZWN0cm9uIiwgImltcG9ydF9ub2RlX2NoaWxkX3Byb2Nlc3MiLCAiaW1wb3J0X25vZGVfZnMiLCAiaW1wb3J0X25vZGVfZnMiLCAiaW1wb3J0X25vZGVfcGF0aCIsICJsb2ciLCAiZXhwb3J0cyIsICJhc1JlY29yZCIsICJyZXNvbHZlIiwgIndlYkNvbnRlbnRzIiwgImlzUGF0aEluc2lkZSIsICJleHBvcnRzIiwgImluZmVyTWFjQXBwUm9vdCIsICJwbGF0Zm9ybSIsICJzdGF0IiwgImFzUmVjb3JkIiwgImFzc2VydEJyaWRnZUlkIiwgImlzV2luZG93RGVzdHJveWVkIiwgIndpbmRvd0lkRm9yIl0KfQo=
