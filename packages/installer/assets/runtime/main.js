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
    const isTweakModule = entrySet.has(key) || entrySet.has(realKey) || roots.some((root) => isPathInside2(root, key) || isPathInside2(root, realKey));
    if (isTweakModule) delete require.cache[key];
  }
}
function safeRealpath(filePath) {
  try {
    return (0, import_node_fs9.realpathSync)(filePath);
  } catch {
    return filePath;
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
  if (typeof asRecord3(parent)?.addBrowserView === "function") {
    callObjectMethod(parent, "addBrowserView", [view.view]);
    view.attachMode = "browserView";
  } else if (typeof asRecord3(contentView)?.addChildView === "function" && webContentsView) {
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
  if (!parent || isWindowDestroyed2(parent)) return;
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
  if (parent && !isWindowDestroyed2(parent)) {
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL21haW4udHMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2Nob2tpZGFyL2VzbS9pbmRleC5qcyIsICIuLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVhZGRpcnAvZXNtL2luZGV4LmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9jaG9raWRhci9lc20vaGFuZGxlci5qcyIsICIuLi9zcmMvdHdlYWstZGlzY292ZXJ5LnRzIiwgIi4uL3NyYy9zdG9yYWdlLnRzIiwgIi4uL3NyYy9tY3Atc3luYy50cyIsICIuLi9zcmMvd2F0Y2hlci1oZWFsdGgudHMiLCAiLi4vc3JjL3R3ZWFrLWxpZmVjeWNsZS50cyIsICIuLi9zcmMvbG9nZ2luZy50cyIsICIuLi9zcmMvY29kZXgtcnVudGltZS1wcm9iZS50cyIsICIuLi9zcmMvbmF0aXZlLWJyaWRnZS50cyIsICIuLi9zcmMvbmF0aXZlLXBhdGhzLnRzIiwgIi4uL3NyYy90d2Vhay1zdG9yZS50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBNYWluLXByb2Nlc3MgYm9vdHN0cmFwLiBMb2FkZWQgYnkgdGhlIGFzYXIgbG9hZGVyIGJlZm9yZSBDb2RleCdzIG93blxuICogbWFpbiBwcm9jZXNzIGNvZGUgcnVucy4gV2UgaG9vayBgQnJvd3NlcldpbmRvd2Agc28gZXZlcnkgd2luZG93IENvZGV4XG4gKiBjcmVhdGVzIGdldHMgb3VyIHByZWxvYWQgc2NyaXB0IGF0dGFjaGVkLiBXZSBhbHNvIHN0YW5kIHVwIGFuIElQQ1xuICogY2hhbm5lbCBmb3IgdHdlYWtzIHRvIHRhbGsgdG8gdGhlIG1haW4gcHJvY2Vzcy5cbiAqXG4gKiBXZSBhcmUgaW4gQ0pTIGxhbmQgaGVyZSAobWF0Y2hlcyBFbGVjdHJvbidzIG1haW4gcHJvY2VzcyBhbmQgQ29kZXgncyBvd25cbiAqIGNvZGUpLiBUaGUgcmVuZGVyZXItc2lkZSBydW50aW1lIGlzIGJ1bmRsZWQgc2VwYXJhdGVseSBpbnRvIHByZWxvYWQuanMuXG4gKi9cbmltcG9ydCB7IGFwcCwgQnJvd3NlclZpZXcsIEJyb3dzZXJXaW5kb3csIGNsaXBib2FyZCwgaXBjTWFpbiwgc2Vzc2lvbiwgc2hlbGwsIHdlYkNvbnRlbnRzIH0gZnJvbSBcImVsZWN0cm9uXCI7XG5pbXBvcnQgeyBjcFN5bmMsIGV4aXN0c1N5bmMsIG1rZGlyU3luYywgbWtkdGVtcFN5bmMsIHJlYWRkaXJTeW5jLCByZWFkRmlsZVN5bmMsIHJlYWxwYXRoU3luYywgcm1TeW5jLCBzdGF0U3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBleGVjRmlsZVN5bmMsIHNwYXduLCBzcGF3blN5bmMgfSBmcm9tIFwibm9kZTpjaGlsZF9wcm9jZXNzXCI7XG5pbXBvcnQgeyBjcmVhdGVIYXNoLCByYW5kb21JbnQsIHJhbmRvbVVVSUQgfSBmcm9tIFwibm9kZTpjcnlwdG9cIjtcbmltcG9ydCB7IGRpcm5hbWUsIGlzQWJzb2x1dGUsIGpvaW4sIHJlbGF0aXZlLCByZXNvbHZlIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuaW1wb3J0IHsgaG9tZWRpciwgdG1wZGlyIH0gZnJvbSBcIm5vZGU6b3NcIjtcbmltcG9ydCBjaG9raWRhciBmcm9tIFwiY2hva2lkYXJcIjtcbmltcG9ydCB7IGRpc2NvdmVyVHdlYWtzLCB0eXBlIERpc2NvdmVyZWRUd2VhayB9IGZyb20gXCIuL3R3ZWFrLWRpc2NvdmVyeVwiO1xuaW1wb3J0IHsgY3JlYXRlRGlza1N0b3JhZ2UsIHR5cGUgRGlza1N0b3JhZ2UgfSBmcm9tIFwiLi9zdG9yYWdlXCI7XG5pbXBvcnQgeyBzeW5jTWFuYWdlZE1jcFNlcnZlcnMgfSBmcm9tIFwiLi9tY3Atc3luY1wiO1xuaW1wb3J0IHsgZ2V0V2F0Y2hlckhlYWx0aCB9IGZyb20gXCIuL3dhdGNoZXItaGVhbHRoXCI7XG5pbXBvcnQge1xuICBpc01haW5Qcm9jZXNzVHdlYWtTY29wZSxcbiAgcmVsb2FkVHdlYWtzLFxuICBzZXRUd2Vha0VuYWJsZWRBbmRSZWxvYWQsXG59IGZyb20gXCIuL3R3ZWFrLWxpZmVjeWNsZVwiO1xuaW1wb3J0IHsgYXBwZW5kQ2FwcGVkTG9nIH0gZnJvbSBcIi4vbG9nZ2luZ1wiO1xuaW1wb3J0IHtcbiAgZ2V0Q2RwU3RhdHVzLFxuICBnZXRSdW50aW1lQ2FwYWJpbGl0aWVzLFxuICBnZXRSdW50aW1lSW5mbyxcbiAgbGlzdENkcFRhcmdldHMsXG59IGZyb20gXCIuL2NvZGV4LXJ1bnRpbWUtcHJvYmVcIjtcbmltcG9ydCB7IE5hdGl2ZUJyaWRnZSwgdHlwZSBOYXRpdmVUd2Vha0NvbnRleHQgfSBmcm9tIFwiLi9uYXRpdmUtYnJpZGdlXCI7XG5pbXBvcnQgdHlwZSB7IFR3ZWFrTWFuaWZlc3QgfSBmcm9tIFwiQGNvZGV4LXBsdXNwbHVzL3Nka1wiO1xuaW1wb3J0IHR5cGUge1xuICBDb2RleFJ1bnRpbWVDYXBhYmlsaXRpZXMsXG4gIENvZGV4UnVudGltZUluZm8sXG4gIENvZGV4Vmlld0NyZWF0ZU9wdGlvbnMsXG4gIENvZGV4Vmlld1JlZixcbiAgQ29kZXhXaW5kb3dSZWYsXG4gIE5hdGl2ZUhlbHBlckxhdW5jaE9wdGlvbnMsXG4gIE5hdGl2ZU1vZHVsZUxvYWRPcHRpb25zLFxuICBOYXRpdmVQYW5lbENyZWF0ZU9wdGlvbnMsXG4gIE5hdGl2ZVZpZXdBdHRhY2hPcHRpb25zLFxuICBUd2Vha1Blcm1pc3Npb24sXG59IGZyb20gXCJAY29kZXgtcGx1c3BsdXMvc2RrXCI7XG5pbXBvcnQge1xuICBERUZBVUxUX1RXRUFLX1NUT1JFX0lOREVYX1VSTCxcbiAgbm9ybWFsaXplR2l0SHViUmVwbyxcbiAgbm9ybWFsaXplU3RvcmVSZWdpc3RyeSxcbiAgc2h1ZmZsZVN0b3JlRW50cmllcyxcbiAgc3RvcmVBcmNoaXZlVXJsLFxuICB0eXBlIFR3ZWFrU3RvcmVQdWJsaXNoU3VibWlzc2lvbixcbiAgdHlwZSBUd2Vha1N0b3JlRW50cnksXG4gIHR5cGUgVHdlYWtTdG9yZVJlZ2lzdHJ5LFxuICB0eXBlIFR3ZWFrU3RvcmVQbGF0Zm9ybSxcbn0gZnJvbSBcIi4vdHdlYWstc3RvcmVcIjtcblxuY29uc3QgdXNlclJvb3QgPSBwcm9jZXNzLmVudi5DT0RFWF9QTFVTUExVU19VU0VSX1JPT1Q7XG5jb25zdCBydW50aW1lRGlyID0gcHJvY2Vzcy5lbnYuQ09ERVhfUExVU1BMVVNfUlVOVElNRTtcblxuaWYgKCF1c2VyUm9vdCB8fCAhcnVudGltZURpcikge1xuICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgXCJjb2RleC1wbHVzcGx1cyBydW50aW1lIHN0YXJ0ZWQgd2l0aG91dCBDT0RFWF9QTFVTUExVU19VU0VSX1JPT1QvUlVOVElNRSBlbnZzXCIsXG4gICk7XG59XG5cbmNvbnN0IFBSRUxPQURfUEFUSCA9IHJlc29sdmUocnVudGltZURpciwgXCJwcmVsb2FkLmpzXCIpO1xuY29uc3QgVFdFQUtTX0RJUiA9IGpvaW4odXNlclJvb3QsIFwidHdlYWtzXCIpO1xuY29uc3QgTE9HX0RJUiA9IGpvaW4odXNlclJvb3QsIFwibG9nXCIpO1xuY29uc3QgTE9HX0ZJTEUgPSBqb2luKExPR19ESVIsIFwibWFpbi5sb2dcIik7XG5jb25zdCBDT05GSUdfRklMRSA9IGpvaW4odXNlclJvb3QsIFwiY29uZmlnLmpzb25cIik7XG5jb25zdCBDT0RFWF9DT05GSUdfRklMRSA9IGpvaW4oaG9tZWRpcigpLCBcIi5jb2RleFwiLCBcImNvbmZpZy50b21sXCIpO1xuY29uc3QgSU5TVEFMTEVSX1NUQVRFX0ZJTEUgPSBqb2luKHVzZXJSb290LCBcInN0YXRlLmpzb25cIik7XG5jb25zdCBVUERBVEVfTU9ERV9GSUxFID0gam9pbih1c2VyUm9vdCwgXCJ1cGRhdGUtbW9kZS5qc29uXCIpO1xuY29uc3QgU0VMRl9VUERBVEVfU1RBVEVfRklMRSA9IGpvaW4odXNlclJvb3QsIFwic2VsZi11cGRhdGUtc3RhdGUuanNvblwiKTtcbmNvbnN0IFNJR05FRF9DT0RFWF9CQUNLVVAgPSBqb2luKHVzZXJSb290LCBcImJhY2t1cFwiLCBcIkNvZGV4LmFwcFwiKTtcbmNvbnN0IENPREVYX1BMVVNQTFVTX1ZFUlNJT04gPSBcIjEuMC4wXCI7XG5jb25zdCBDT0RFWF9QTFVTUExVU19SRVBPID0gXCJiLW5uZXR0L2NvZGV4LXBsdXNwbHVzXCI7XG5jb25zdCBUV0VBS19TVE9SRV9JTkRFWF9VUkwgPSBwcm9jZXNzLmVudi5DT0RFWF9QTFVTUExVU19TVE9SRV9JTkRFWF9VUkwgPz8gREVGQVVMVF9UV0VBS19TVE9SRV9JTkRFWF9VUkw7XG5jb25zdCBDT0RFWF9XSU5ET1dfU0VSVklDRVNfS0VZID0gXCJfX2NvZGV4cHBfd2luZG93X3NlcnZpY2VzX19cIjtcblxubWtkaXJTeW5jKExPR19ESVIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xubWtkaXJTeW5jKFRXRUFLU19ESVIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXG4vLyBPcHRpb25hbDogZW5hYmxlIENocm9tZSBEZXZUb29scyBQcm90b2NvbCBvbiBhIFRDUCBwb3J0IHNvIHdlIGNhbiBkcml2ZSB0aGVcbi8vIHJ1bm5pbmcgQ29kZXggZnJvbSBvdXRzaWRlIChjdXJsIGh0dHA6Ly9sb2NhbGhvc3Q6PHBvcnQ+L2pzb24sIGF0dGFjaCB2aWFcbi8vIENEUCBXZWJTb2NrZXQsIHRha2Ugc2NyZWVuc2hvdHMsIGV2YWx1YXRlIGluIHJlbmRlcmVyLCBldGMuKS4gQ29kZXgnc1xuLy8gcHJvZHVjdGlvbiBidWlsZCBzZXRzIHdlYlByZWZlcmVuY2VzLmRldlRvb2xzPWZhbHNlLCB3aGljaCBraWxscyB0aGVcbi8vIGluLXdpbmRvdyBEZXZUb29scyBzaG9ydGN1dCwgYnV0IGAtLXJlbW90ZS1kZWJ1Z2dpbmctcG9ydGAgd29ya3MgcmVnYXJkbGVzc1xuLy8gYmVjYXVzZSBpdCdzIGEgQ2hyb21pdW0gY29tbWFuZC1saW5lIHN3aXRjaCBwcm9jZXNzZWQgYmVmb3JlIGFwcCBpbml0LlxuLy9cbi8vIE9mZiBieSBkZWZhdWx0LiBTZXQgQ09ERVhQUF9SRU1PVEVfREVCVUc9MSAob3B0aW9uYWxseSBDT0RFWFBQX1JFTU9URV9ERUJVR19QT1JUKVxuLy8gdG8gdHVybiBpdCBvbi4gTXVzdCBiZSBhcHBlbmRlZCBiZWZvcmUgYGFwcGAgYmVjb21lcyByZWFkeTsgd2UncmUgYXQgbW9kdWxlXG4vLyB0b3AtbGV2ZWwgc28gdGhhdCdzIGZpbmUuXG5pZiAocHJvY2Vzcy5lbnYuQ09ERVhQUF9SRU1PVEVfREVCVUcgPT09IFwiMVwiKSB7XG4gIGNvbnN0IHBvcnQgPSBwcm9jZXNzLmVudi5DT0RFWFBQX1JFTU9URV9ERUJVR19QT1JUID8/IFwiOTIyMlwiO1xuICBhcHAuY29tbWFuZExpbmUuYXBwZW5kU3dpdGNoKFwicmVtb3RlLWRlYnVnZ2luZy1wb3J0XCIsIHBvcnQpO1xuICBsb2coXCJpbmZvXCIsIGByZW1vdGUgZGVidWdnaW5nIGVuYWJsZWQgb24gcG9ydCAke3BvcnR9YCk7XG59XG5cbmludGVyZmFjZSBQZXJzaXN0ZWRTdGF0ZSB7XG4gIGNvZGV4UGx1c1BsdXM/OiB7XG4gICAgYXV0b1VwZGF0ZT86IGJvb2xlYW47XG4gICAgc2FmZU1vZGU/OiBib29sZWFuO1xuICAgIHVwZGF0ZUNoYW5uZWw/OiBTZWxmVXBkYXRlQ2hhbm5lbDtcbiAgICB1cGRhdGVSZXBvPzogc3RyaW5nO1xuICAgIHVwZGF0ZVJlZj86IHN0cmluZztcbiAgICB1cGRhdGVDaGVjaz86IENvZGV4UGx1c1BsdXNVcGRhdGVDaGVjaztcbiAgfTtcbiAgLyoqIFBlci10d2VhayBlbmFibGUgZmxhZ3MuIE1pc3NpbmcgZW50cmllcyBkZWZhdWx0IHRvIGVuYWJsZWQuICovXG4gIHR3ZWFrcz86IFJlY29yZDxzdHJpbmcsIHsgZW5hYmxlZD86IGJvb2xlYW4gfT47XG4gIC8qKiBDYWNoZWQgR2l0SHViIHJlbGVhc2UgY2hlY2tzLiBSdW50aW1lIG5ldmVyIGF1dG8taW5zdGFsbHMgdXBkYXRlcy4gKi9cbiAgdHdlYWtVcGRhdGVDaGVja3M/OiBSZWNvcmQ8c3RyaW5nLCBUd2Vha1VwZGF0ZUNoZWNrPjtcbn1cblxuaW50ZXJmYWNlIENvZGV4UGx1c1BsdXNVcGRhdGVDaGVjayB7XG4gIGNoZWNrZWRBdDogc3RyaW5nO1xuICBjdXJyZW50VmVyc2lvbjogc3RyaW5nO1xuICBsYXRlc3RWZXJzaW9uOiBzdHJpbmcgfCBudWxsO1xuICByZWxlYXNlVXJsOiBzdHJpbmcgfCBudWxsO1xuICByZWxlYXNlTm90ZXM6IHN0cmluZyB8IG51bGw7XG4gIHVwZGF0ZUF2YWlsYWJsZTogYm9vbGVhbjtcbiAgZXJyb3I/OiBzdHJpbmc7XG59XG5cbnR5cGUgU2VsZlVwZGF0ZUNoYW5uZWwgPSBcInN0YWJsZVwiIHwgXCJwcmVyZWxlYXNlXCIgfCBcImN1c3RvbVwiO1xudHlwZSBTZWxmVXBkYXRlU3RhdHVzID0gXCJjaGVja2luZ1wiIHwgXCJ1cC10by1kYXRlXCIgfCBcInVwZGF0ZWRcIiB8IFwiZmFpbGVkXCIgfCBcImRpc2FibGVkXCI7XG5cbmludGVyZmFjZSBTZWxmVXBkYXRlU3RhdGUge1xuICBjaGVja2VkQXQ6IHN0cmluZztcbiAgY29tcGxldGVkQXQ/OiBzdHJpbmc7XG4gIHN0YXR1czogU2VsZlVwZGF0ZVN0YXR1cztcbiAgY3VycmVudFZlcnNpb246IHN0cmluZztcbiAgbGF0ZXN0VmVyc2lvbjogc3RyaW5nIHwgbnVsbDtcbiAgdGFyZ2V0UmVmOiBzdHJpbmcgfCBudWxsO1xuICByZWxlYXNlVXJsOiBzdHJpbmcgfCBudWxsO1xuICByZXBvOiBzdHJpbmc7XG4gIGNoYW5uZWw6IFNlbGZVcGRhdGVDaGFubmVsO1xuICBzb3VyY2VSb290OiBzdHJpbmc7XG4gIGluc3RhbGxhdGlvblNvdXJjZT86IEluc3RhbGxhdGlvblNvdXJjZTtcbiAgZXJyb3I/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBJbnN0YWxsYXRpb25Tb3VyY2Uge1xuICBraW5kOiBcImdpdGh1Yi1zb3VyY2VcIiB8IFwiaG9tZWJyZXdcIiB8IFwibG9jYWwtZGV2XCIgfCBcInNvdXJjZS1hcmNoaXZlXCIgfCBcInVua25vd25cIjtcbiAgbGFiZWw6IHN0cmluZztcbiAgZGV0YWlsOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBUd2Vha1VwZGF0ZUNoZWNrIHtcbiAgY2hlY2tlZEF0OiBzdHJpbmc7XG4gIHJlcG86IHN0cmluZztcbiAgY3VycmVudFZlcnNpb246IHN0cmluZztcbiAgbGF0ZXN0VmVyc2lvbjogc3RyaW5nIHwgbnVsbDtcbiAgbGF0ZXN0VGFnOiBzdHJpbmcgfCBudWxsO1xuICByZWxlYXNlVXJsOiBzdHJpbmcgfCBudWxsO1xuICB1cGRhdGVBdmFpbGFibGU6IGJvb2xlYW47XG4gIGVycm9yPzogc3RyaW5nO1xufVxuXG5mdW5jdGlvbiByZWFkU3RhdGUoKTogUGVyc2lzdGVkU3RhdGUge1xuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhDT05GSUdfRklMRSwgXCJ1dGY4XCIpKSBhcyBQZXJzaXN0ZWRTdGF0ZTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG59XG5mdW5jdGlvbiB3cml0ZVN0YXRlKHM6IFBlcnNpc3RlZFN0YXRlKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgd3JpdGVGaWxlU3luYyhDT05GSUdfRklMRSwgSlNPTi5zdHJpbmdpZnkocywgbnVsbCwgMikpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nKFwid2FyblwiLCBcIndyaXRlU3RhdGUgZmFpbGVkOlwiLCBTdHJpbmcoKGUgYXMgRXJyb3IpLm1lc3NhZ2UpKTtcbiAgfVxufVxuZnVuY3Rpb24gaXNDb2RleFBsdXNQbHVzQXV0b1VwZGF0ZUVuYWJsZWQoKTogYm9vbGVhbiB7XG4gIHJldHVybiByZWFkU3RhdGUoKS5jb2RleFBsdXNQbHVzPy5hdXRvVXBkYXRlICE9PSBmYWxzZTtcbn1cbmZ1bmN0aW9uIHNldENvZGV4UGx1c1BsdXNBdXRvVXBkYXRlKGVuYWJsZWQ6IGJvb2xlYW4pOiB2b2lkIHtcbiAgY29uc3QgcyA9IHJlYWRTdGF0ZSgpO1xuICBzLmNvZGV4UGx1c1BsdXMgPz89IHt9O1xuICBzLmNvZGV4UGx1c1BsdXMuYXV0b1VwZGF0ZSA9IGVuYWJsZWQ7XG4gIHdyaXRlU3RhdGUocyk7XG59XG5mdW5jdGlvbiBzZXRDb2RleFBsdXNQbHVzVXBkYXRlQ29uZmlnKGNvbmZpZzoge1xuICB1cGRhdGVDaGFubmVsPzogU2VsZlVwZGF0ZUNoYW5uZWw7XG4gIHVwZGF0ZVJlcG8/OiBzdHJpbmc7XG4gIHVwZGF0ZVJlZj86IHN0cmluZztcbn0pOiB2b2lkIHtcbiAgY29uc3QgcyA9IHJlYWRTdGF0ZSgpO1xuICBzLmNvZGV4UGx1c1BsdXMgPz89IHt9O1xuICBpZiAoY29uZmlnLnVwZGF0ZUNoYW5uZWwpIHMuY29kZXhQbHVzUGx1cy51cGRhdGVDaGFubmVsID0gY29uZmlnLnVwZGF0ZUNoYW5uZWw7XG4gIGlmIChcInVwZGF0ZVJlcG9cIiBpbiBjb25maWcpIHMuY29kZXhQbHVzUGx1cy51cGRhdGVSZXBvID0gY2xlYW5PcHRpb25hbFN0cmluZyhjb25maWcudXBkYXRlUmVwbyk7XG4gIGlmIChcInVwZGF0ZVJlZlwiIGluIGNvbmZpZykgcy5jb2RleFBsdXNQbHVzLnVwZGF0ZVJlZiA9IGNsZWFuT3B0aW9uYWxTdHJpbmcoY29uZmlnLnVwZGF0ZVJlZik7XG4gIHdyaXRlU3RhdGUocyk7XG59XG5mdW5jdGlvbiBpc0NvZGV4UGx1c1BsdXNTYWZlTW9kZUVuYWJsZWQoKTogYm9vbGVhbiB7XG4gIHJldHVybiByZWFkU3RhdGUoKS5jb2RleFBsdXNQbHVzPy5zYWZlTW9kZSA9PT0gdHJ1ZTtcbn1cbmZ1bmN0aW9uIGlzVHdlYWtFbmFibGVkKGlkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgcyA9IHJlYWRTdGF0ZSgpO1xuICBpZiAocy5jb2RleFBsdXNQbHVzPy5zYWZlTW9kZSA9PT0gdHJ1ZSkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gcy50d2Vha3M/LltpZF0/LmVuYWJsZWQgIT09IGZhbHNlO1xufVxuZnVuY3Rpb24gc2V0VHdlYWtFbmFibGVkKGlkOiBzdHJpbmcsIGVuYWJsZWQ6IGJvb2xlYW4pOiB2b2lkIHtcbiAgY29uc3QgcyA9IHJlYWRTdGF0ZSgpO1xuICBzLnR3ZWFrcyA/Pz0ge307XG4gIHMudHdlYWtzW2lkXSA9IHsgLi4ucy50d2Vha3NbaWRdLCBlbmFibGVkIH07XG4gIHdyaXRlU3RhdGUocyk7XG59XG5cbmludGVyZmFjZSBJbnN0YWxsZXJTdGF0ZSB7XG4gIGFwcFJvb3Q6IHN0cmluZztcbiAgY29kZXhWZXJzaW9uOiBzdHJpbmcgfCBudWxsO1xuICBzb3VyY2VSb290Pzogc3RyaW5nO1xufVxuXG5mdW5jdGlvbiByZWFkSW5zdGFsbGVyU3RhdGUoKTogSW5zdGFsbGVyU3RhdGUgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMoSU5TVEFMTEVSX1NUQVRFX0ZJTEUsIFwidXRmOFwiKSkgYXMgSW5zdGFsbGVyU3RhdGU7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlYWRTZWxmVXBkYXRlU3RhdGUoKTogU2VsZlVwZGF0ZVN0YXRlIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKFNFTEZfVVBEQVRFX1NUQVRFX0ZJTEUsIFwidXRmOFwiKSkgYXMgU2VsZlVwZGF0ZVN0YXRlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuZnVuY3Rpb24gd3JpdGVTZWxmVXBkYXRlU3RhdGUoc3RhdGU6IFNlbGZVcGRhdGVTdGF0ZSk6IHZvaWQge1xuICB0cnkge1xuICAgIHdyaXRlRmlsZVN5bmMoU0VMRl9VUERBVEVfU1RBVEVfRklMRSwgSlNPTi5zdHJpbmdpZnkoc3RhdGUsIG51bGwsIDIpKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZyhcIndhcm5cIiwgXCJ3cml0ZVNlbGZVcGRhdGVTdGF0ZSBmYWlsZWQ6XCIsIFN0cmluZygoZSBhcyBFcnJvcikubWVzc2FnZSkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNsZWFuT3B0aW9uYWxTdHJpbmcodmFsdWU6IHVua25vd24pOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSByZXR1cm4gdW5kZWZpbmVkO1xuICBjb25zdCB0cmltbWVkID0gdmFsdWUudHJpbSgpO1xuICByZXR1cm4gdHJpbW1lZCA/IHRyaW1tZWQgOiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGlzUGF0aEluc2lkZShwYXJlbnQ6IHN0cmluZywgdGFyZ2V0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgcmVsID0gcmVsYXRpdmUocmVzb2x2ZShwYXJlbnQpLCByZXNvbHZlKHRhcmdldCkpO1xuICByZXR1cm4gcmVsID09PSBcIlwiIHx8ICghIXJlbCAmJiAhcmVsLnN0YXJ0c1dpdGgoXCIuLlwiKSAmJiAhaXNBYnNvbHV0ZShyZWwpKTtcbn1cblxuZnVuY3Rpb24gbG9nKGxldmVsOiBcImluZm9cIiB8IFwid2FyblwiIHwgXCJlcnJvclwiLCAuLi5hcmdzOiB1bmtub3duW10pOiB2b2lkIHtcbiAgY29uc3QgbGluZSA9IGBbJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCl9XSBbJHtsZXZlbH1dICR7YXJnc1xuICAgIC5tYXAoKGEpID0+ICh0eXBlb2YgYSA9PT0gXCJzdHJpbmdcIiA/IGEgOiBKU09OLnN0cmluZ2lmeShhKSkpXG4gICAgLmpvaW4oXCIgXCIpfVxcbmA7XG4gIHRyeSB7XG4gICAgYXBwZW5kQ2FwcGVkTG9nKExPR19GSUxFLCBsaW5lKTtcbiAgfSBjYXRjaCB7fVxuICBpZiAobGV2ZWwgPT09IFwiZXJyb3JcIikgY29uc29sZS5lcnJvcihcIltjb2RleC1wbHVzcGx1c11cIiwgLi4uYXJncyk7XG59XG5cbmZ1bmN0aW9uIGluc3RhbGxTcGFya2xlVXBkYXRlSG9vaygpOiB2b2lkIHtcbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gIT09IFwiZGFyd2luXCIpIHJldHVybjtcblxuICBjb25zdCBNb2R1bGUgPSByZXF1aXJlKFwibm9kZTptb2R1bGVcIikgYXMgdHlwZW9mIGltcG9ydChcIm5vZGU6bW9kdWxlXCIpICYge1xuICAgIF9sb2FkPzogKHJlcXVlc3Q6IHN0cmluZywgcGFyZW50OiB1bmtub3duLCBpc01haW46IGJvb2xlYW4pID0+IHVua25vd247XG4gIH07XG4gIGNvbnN0IG9yaWdpbmFsTG9hZCA9IE1vZHVsZS5fbG9hZDtcbiAgaWYgKHR5cGVvZiBvcmlnaW5hbExvYWQgIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuO1xuXG4gIE1vZHVsZS5fbG9hZCA9IGZ1bmN0aW9uIGNvZGV4UGx1c1BsdXNNb2R1bGVMb2FkKHJlcXVlc3Q6IHN0cmluZywgcGFyZW50OiB1bmtub3duLCBpc01haW46IGJvb2xlYW4pIHtcbiAgICBjb25zdCBsb2FkZWQgPSBvcmlnaW5hbExvYWQuYXBwbHkodGhpcywgW3JlcXVlc3QsIHBhcmVudCwgaXNNYWluXSkgYXMgdW5rbm93bjtcbiAgICBpZiAodHlwZW9mIHJlcXVlc3QgPT09IFwic3RyaW5nXCIgJiYgL3NwYXJrbGUoPzpcXC5ub2RlKT8kL2kudGVzdChyZXF1ZXN0KSkge1xuICAgICAgd3JhcFNwYXJrbGVFeHBvcnRzKGxvYWRlZCk7XG4gICAgfVxuICAgIHJldHVybiBsb2FkZWQ7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHdyYXBTcGFya2xlRXhwb3J0cyhsb2FkZWQ6IHVua25vd24pOiB2b2lkIHtcbiAgaWYgKCFsb2FkZWQgfHwgdHlwZW9mIGxvYWRlZCAhPT0gXCJvYmplY3RcIikgcmV0dXJuO1xuICBjb25zdCBleHBvcnRzID0gbG9hZGVkIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+ICYgeyBfX2NvZGV4cHBTcGFya2xlV3JhcHBlZD86IGJvb2xlYW4gfTtcbiAgaWYgKGV4cG9ydHMuX19jb2RleHBwU3BhcmtsZVdyYXBwZWQpIHJldHVybjtcbiAgZXhwb3J0cy5fX2NvZGV4cHBTcGFya2xlV3JhcHBlZCA9IHRydWU7XG5cbiAgZm9yIChjb25zdCBuYW1lIG9mIFtcImluc3RhbGxVcGRhdGVzSWZBdmFpbGFibGVcIl0pIHtcbiAgICBjb25zdCBmbiA9IGV4cG9ydHNbbmFtZV07XG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSBjb250aW51ZTtcbiAgICBleHBvcnRzW25hbWVdID0gZnVuY3Rpb24gY29kZXhQbHVzUGx1c1NwYXJrbGVXcmFwcGVyKHRoaXM6IHVua25vd24sIC4uLmFyZ3M6IHVua25vd25bXSkge1xuICAgICAgcHJlcGFyZVNpZ25lZENvZGV4Rm9yU3BhcmtsZUluc3RhbGwoKTtcbiAgICAgIHJldHVybiBSZWZsZWN0LmFwcGx5KGZuLCB0aGlzLCBhcmdzKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKGV4cG9ydHMuZGVmYXVsdCAmJiBleHBvcnRzLmRlZmF1bHQgIT09IGV4cG9ydHMpIHtcbiAgICB3cmFwU3BhcmtsZUV4cG9ydHMoZXhwb3J0cy5kZWZhdWx0KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwcmVwYXJlU2lnbmVkQ29kZXhGb3JTcGFya2xlSW5zdGFsbCgpOiB2b2lkIHtcbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gIT09IFwiZGFyd2luXCIpIHJldHVybjtcbiAgaWYgKGV4aXN0c1N5bmMoVVBEQVRFX01PREVfRklMRSkpIHtcbiAgICBsb2coXCJpbmZvXCIsIFwiU3BhcmtsZSB1cGRhdGUgcHJlcCBza2lwcGVkOyB1cGRhdGUgbW9kZSBhbHJlYWR5IGFjdGl2ZVwiKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCFleGlzdHNTeW5jKFNJR05FRF9DT0RFWF9CQUNLVVApKSB7XG4gICAgbG9nKFwid2FyblwiLCBcIlNwYXJrbGUgdXBkYXRlIHByZXAgc2tpcHBlZDsgc2lnbmVkIENvZGV4LmFwcCBiYWNrdXAgaXMgbWlzc2luZ1wiKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCFpc0RldmVsb3BlcklkU2lnbmVkQXBwKFNJR05FRF9DT0RFWF9CQUNLVVApKSB7XG4gICAgbG9nKFwid2FyblwiLCBcIlNwYXJrbGUgdXBkYXRlIHByZXAgc2tpcHBlZDsgQ29kZXguYXBwIGJhY2t1cCBpcyBub3QgRGV2ZWxvcGVyIElEIHNpZ25lZFwiKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBzdGF0ZSA9IHJlYWRJbnN0YWxsZXJTdGF0ZSgpO1xuICBjb25zdCBhcHBSb290ID0gc3RhdGU/LmFwcFJvb3QgPz8gaW5mZXJNYWNBcHBSb290KCk7XG4gIGlmICghYXBwUm9vdCkge1xuICAgIGxvZyhcIndhcm5cIiwgXCJTcGFya2xlIHVwZGF0ZSBwcmVwIHNraXBwZWQ7IGNvdWxkIG5vdCBpbmZlciBDb2RleC5hcHAgcGF0aFwiKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBtb2RlID0ge1xuICAgIGVuYWJsZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIGFwcFJvb3QsXG4gICAgY29kZXhWZXJzaW9uOiBzdGF0ZT8uY29kZXhWZXJzaW9uID8/IG51bGwsXG4gIH07XG4gIHdyaXRlRmlsZVN5bmMoVVBEQVRFX01PREVfRklMRSwgSlNPTi5zdHJpbmdpZnkobW9kZSwgbnVsbCwgMikpO1xuXG4gIHRyeSB7XG4gICAgZXhlY0ZpbGVTeW5jKFwiZGl0dG9cIiwgW1NJR05FRF9DT0RFWF9CQUNLVVAsIGFwcFJvb3RdLCB7IHN0ZGlvOiBcImlnbm9yZVwiIH0pO1xuICAgIHRyeSB7XG4gICAgICBleGVjRmlsZVN5bmMoXCJ4YXR0clwiLCBbXCItZHJcIiwgXCJjb20uYXBwbGUucXVhcmFudGluZVwiLCBhcHBSb290XSwgeyBzdGRpbzogXCJpZ25vcmVcIiB9KTtcbiAgICB9IGNhdGNoIHt9XG4gICAgbG9nKFwiaW5mb1wiLCBcIlJlc3RvcmVkIHNpZ25lZCBDb2RleC5hcHAgYmVmb3JlIFNwYXJrbGUgaW5zdGFsbFwiLCB7IGFwcFJvb3QgfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2coXCJlcnJvclwiLCBcIkZhaWxlZCB0byByZXN0b3JlIHNpZ25lZCBDb2RleC5hcHAgYmVmb3JlIFNwYXJrbGUgaW5zdGFsbFwiLCB7XG4gICAgICBtZXNzYWdlOiAoZSBhcyBFcnJvcikubWVzc2FnZSxcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0RldmVsb3BlcklkU2lnbmVkQXBwKGFwcFJvb3Q6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBjb25zdCByZXN1bHQgPSBzcGF3blN5bmMoXCJjb2Rlc2lnblwiLCBbXCItZHZcIiwgXCItLXZlcmJvc2U9NFwiLCBhcHBSb290XSwge1xuICAgIGVuY29kaW5nOiBcInV0ZjhcIixcbiAgICBzdGRpbzogW1wiaWdub3JlXCIsIFwicGlwZVwiLCBcInBpcGVcIl0sXG4gIH0pO1xuICBjb25zdCBvdXRwdXQgPSBgJHtyZXN1bHQuc3Rkb3V0ID8/IFwiXCJ9JHtyZXN1bHQuc3RkZXJyID8/IFwiXCJ9YDtcbiAgcmV0dXJuIChcbiAgICByZXN1bHQuc3RhdHVzID09PSAwICYmXG4gICAgL0F1dGhvcml0eT1EZXZlbG9wZXIgSUQgQXBwbGljYXRpb246Ly50ZXN0KG91dHB1dCkgJiZcbiAgICAhL1NpZ25hdHVyZT1hZGhvYy8udGVzdChvdXRwdXQpICYmXG4gICAgIS9UZWFtSWRlbnRpZmllcj1ub3Qgc2V0Ly50ZXN0KG91dHB1dClcbiAgKTtcbn1cblxuZnVuY3Rpb24gaW5mZXJNYWNBcHBSb290KCk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBtYXJrZXIgPSBcIi5hcHAvQ29udGVudHMvTWFjT1MvXCI7XG4gIGNvbnN0IGlkeCA9IHByb2Nlc3MuZXhlY1BhdGguaW5kZXhPZihtYXJrZXIpO1xuICByZXR1cm4gaWR4ID49IDAgPyBwcm9jZXNzLmV4ZWNQYXRoLnNsaWNlKDAsIGlkeCArIFwiLmFwcFwiLmxlbmd0aCkgOiBudWxsO1xufVxuXG4vLyBTdXJmYWNlIHVuaGFuZGxlZCBlcnJvcnMgZnJvbSBhbnl3aGVyZSBpbiB0aGUgbWFpbiBwcm9jZXNzIHRvIG91ciBsb2cuXG5wcm9jZXNzLm9uKFwidW5jYXVnaHRFeGNlcHRpb25cIiwgKGU6IEVycm9yICYgeyBjb2RlPzogc3RyaW5nIH0pID0+IHtcbiAgbG9nKFwiZXJyb3JcIiwgXCJ1bmNhdWdodEV4Y2VwdGlvblwiLCB7IGNvZGU6IGUuY29kZSwgbWVzc2FnZTogZS5tZXNzYWdlLCBzdGFjazogZS5zdGFjayB9KTtcbn0pO1xucHJvY2Vzcy5vbihcInVuaGFuZGxlZFJlamVjdGlvblwiLCAoZSkgPT4ge1xuICBsb2coXCJlcnJvclwiLCBcInVuaGFuZGxlZFJlamVjdGlvblwiLCB7IHZhbHVlOiBTdHJpbmcoZSkgfSk7XG59KTtcblxuaW5zdGFsbFNwYXJrbGVVcGRhdGVIb29rKCk7XG5cbmludGVyZmFjZSBMb2FkZWRNYWluVHdlYWsge1xuICBzdG9wPzogKCkgPT4gdm9pZDtcbiAgc3RvcmFnZTogRGlza1N0b3JhZ2U7XG59XG5cbmludGVyZmFjZSBDb2RleFdpbmRvd1NlcnZpY2VzIHtcbiAgY3JlYXRlRnJlc2hXaW5kb3c/OiAocm91dGU/OiBzdHJpbmcpID0+IFByb21pc2U8RWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGw+O1xuICBjcmVhdGVGcmVzaExvY2FsV2luZG93PzogKHJvdXRlPzogc3RyaW5nKSA9PiBQcm9taXNlPEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsPjtcbiAgZW5zdXJlSG9zdFdpbmRvdz86IChob3N0SWQ/OiBzdHJpbmcpID0+IFByb21pc2U8RWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGw+O1xuICBnZXRQcmltYXJ5V2luZG93PzogKGhvc3RJZD86IHN0cmluZykgPT4gRWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGw7XG4gIGdldENvbnRleHQ/OiAoaG9zdElkOiBzdHJpbmcpID0+IHsgcmVnaXN0ZXJXaW5kb3c/OiAod2luZG93TGlrZTogQ29kZXhXaW5kb3dMaWtlKSA9PiB2b2lkIH0gfCBudWxsO1xuICB3aW5kb3dNYW5hZ2VyPzoge1xuICAgIGNyZWF0ZVdpbmRvdz86IChvcHRzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikgPT4gUHJvbWlzZTxFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbD47XG4gICAgZ2V0UHJpbWFyeVdpbmRvdz86ICgpID0+IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsO1xuICAgIHJlZ2lzdGVyV2luZG93PzogKFxuICAgICAgd2luZG93TGlrZTogQ29kZXhXaW5kb3dMaWtlLFxuICAgICAgaG9zdElkOiBzdHJpbmcsXG4gICAgICBwcmltYXJ5OiBib29sZWFuLFxuICAgICAgYXBwZWFyYW5jZTogc3RyaW5nLFxuICAgICkgPT4gdm9pZDtcbiAgICBvcHRpb25zPzoge1xuICAgICAgYWxsb3dEZXZ0b29scz86IGJvb2xlYW47XG4gICAgICBwcmVsb2FkUGF0aD86IHN0cmluZztcbiAgICB9O1xuICB9O1xufVxuXG5pbnRlcmZhY2UgQ29kZXhXaW5kb3dMaWtlIHtcbiAgaWQ6IG51bWJlcjtcbiAgd2ViQ29udGVudHM6IEVsZWN0cm9uLldlYkNvbnRlbnRzO1xuICBvbihldmVudDogXCJjbG9zZWRcIiwgbGlzdGVuZXI6ICgpID0+IHZvaWQpOiB1bmtub3duO1xuICBvbmNlPyhldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCk6IHVua25vd247XG4gIG9mZj8oZXZlbnQ6IHN0cmluZywgbGlzdGVuZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpOiB1bmtub3duO1xuICByZW1vdmVMaXN0ZW5lcj8oZXZlbnQ6IHN0cmluZywgbGlzdGVuZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpOiB1bmtub3duO1xuICBpc0Rlc3Ryb3llZD8oKTogYm9vbGVhbjtcbiAgaXNGb2N1c2VkPygpOiBib29sZWFuO1xuICBmb2N1cz8oKTogdm9pZDtcbiAgc2hvdz8oKTogdm9pZDtcbiAgaGlkZT8oKTogdm9pZDtcbiAgZ2V0Qm91bmRzPygpOiBFbGVjdHJvbi5SZWN0YW5nbGU7XG4gIGdldENvbnRlbnRCb3VuZHM/KCk6IEVsZWN0cm9uLlJlY3RhbmdsZTtcbiAgZ2V0U2l6ZT8oKTogW251bWJlciwgbnVtYmVyXTtcbiAgZ2V0Q29udGVudFNpemU/KCk6IFtudW1iZXIsIG51bWJlcl07XG4gIHNldFRpdGxlPyh0aXRsZTogc3RyaW5nKTogdm9pZDtcbiAgZ2V0VGl0bGU/KCk6IHN0cmluZztcbiAgc2V0UmVwcmVzZW50ZWRGaWxlbmFtZT8oZmlsZW5hbWU6IHN0cmluZyk6IHZvaWQ7XG4gIHNldERvY3VtZW50RWRpdGVkPyhlZGl0ZWQ6IGJvb2xlYW4pOiB2b2lkO1xuICBzZXRXaW5kb3dCdXR0b25WaXNpYmlsaXR5Pyh2aXNpYmxlOiBib29sZWFuKTogdm9pZDtcbn1cblxuaW50ZXJmYWNlIENvZGV4Q3JlYXRlV2luZG93T3B0aW9ucyB7XG4gIHJvdXRlOiBzdHJpbmc7XG4gIGhvc3RJZD86IHN0cmluZztcbiAgc2hvdz86IGJvb2xlYW47XG4gIGFwcGVhcmFuY2U/OiBzdHJpbmc7XG4gIHBhcmVudFdpbmRvd0lkPzogbnVtYmVyO1xuICBib3VuZHM/OiBFbGVjdHJvbi5SZWN0YW5nbGU7XG59XG5cbmludGVyZmFjZSBDb2RleENyZWF0ZVZpZXdPcHRpb25zIHtcbiAgcm91dGU6IHN0cmluZztcbiAgaG9zdElkPzogc3RyaW5nO1xuICBhcHBlYXJhbmNlPzogc3RyaW5nO1xufVxuXG50eXBlIE93bFZpZXdBdHRhY2hNb2RlID0gXCJjb250ZW50Vmlld1wiIHwgXCJicm93c2VyVmlld1wiO1xuXG5pbnRlcmZhY2UgTWFuYWdlZE93bFZpZXcge1xuICBrZXk6IHN0cmluZztcbiAgdHdlYWtJZDogc3RyaW5nO1xuICBpZDogc3RyaW5nO1xuICB2aWV3OiBFbGVjdHJvbi5Ccm93c2VyVmlldztcbiAgcGFyZW50V2luZG93SWQ6IG51bWJlciB8IG51bGw7XG4gIGF0dGFjaE1vZGU6IE93bFZpZXdBdHRhY2hNb2RlIHwgbnVsbDtcbiAgZGlzcG9zZUJpbmRpbmdzOiBBcnJheTwoKSA9PiB2b2lkPjtcbiAgZGlzcG9zZWQ6IGJvb2xlYW47XG59XG5cbmNvbnN0IHR3ZWFrU3RhdGUgPSB7XG4gIGRpc2NvdmVyZWQ6IFtdIGFzIERpc2NvdmVyZWRUd2Vha1tdLFxuICBsb2FkZWRNYWluOiBuZXcgTWFwPHN0cmluZywgTG9hZGVkTWFpblR3ZWFrPigpLFxufTtcblxuY29uc3QgbmF0aXZlQnJpZGdlID0gbmV3IE5hdGl2ZUJyaWRnZShsb2csIHtcbiAgbmF0aXZlSG9zdFBhdGg6IGpvaW4ocnVudGltZURpciwgXCJuYXRpdmVcIiwgXCJjb2RleHBwX25hdGl2ZV9ob3N0Lm5vZGVcIiksXG59KTtcbmNvbnN0IG93bFZpZXdzID0gbmV3IE1hcDxzdHJpbmcsIE1hbmFnZWRPd2xWaWV3PigpO1xuXG5jb25zdCB0d2Vha0xpZmVjeWNsZURlcHMgPSB7XG4gIGxvZ0luZm86IChtZXNzYWdlOiBzdHJpbmcpID0+IGxvZyhcImluZm9cIiwgbWVzc2FnZSksXG4gIHNldFR3ZWFrRW5hYmxlZCxcbiAgc3RvcEFsbE1haW5Ud2Vha3MsXG4gIGNsZWFyVHdlYWtNb2R1bGVDYWNoZSxcbiAgbG9hZEFsbE1haW5Ud2Vha3MsXG4gIGJyb2FkY2FzdFJlbG9hZCxcbn07XG5cbi8vIDEuIEhvb2sgZXZlcnkgc2Vzc2lvbiBzbyBvdXIgcHJlbG9hZCBydW5zIGluIGV2ZXJ5IHJlbmRlcmVyLlxuLy9cbi8vIFdlIHVzZSBFbGVjdHJvbidzIG1vZGVybiBgc2Vzc2lvbi5yZWdpc3RlclByZWxvYWRTY3JpcHRgIEFQSSAoYWRkZWQgaW5cbi8vIEVsZWN0cm9uIDM1KS4gVGhlIGRlcHJlY2F0ZWQgYHNldFByZWxvYWRzYCBwYXRoIHNpbGVudGx5IG5vLW9wcyBpbiBzb21lXG4vLyBjb25maWd1cmF0aW9ucyAobm90YWJseSB3aXRoIHNhbmRib3hlZCByZW5kZXJlcnMpLCBzbyByZWdpc3RlclByZWxvYWRTY3JpcHRcbi8vIGlzIHRoZSBvbmx5IHJlbGlhYmxlIHdheSB0byBpbmplY3QgaW50byBDb2RleCdzIEJyb3dzZXJXaW5kb3dzLlxuZnVuY3Rpb24gcmVnaXN0ZXJQcmVsb2FkKHM6IEVsZWN0cm9uLlNlc3Npb24sIGxhYmVsOiBzdHJpbmcpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICBjb25zdCByZWcgPSAocyBhcyB1bmtub3duIGFzIHtcbiAgICAgIHJlZ2lzdGVyUHJlbG9hZFNjcmlwdD86IChvcHRzOiB7XG4gICAgICAgIHR5cGU/OiBcImZyYW1lXCIgfCBcInNlcnZpY2Utd29ya2VyXCI7XG4gICAgICAgIGlkPzogc3RyaW5nO1xuICAgICAgICBmaWxlUGF0aDogc3RyaW5nO1xuICAgICAgfSkgPT4gc3RyaW5nO1xuICAgIH0pLnJlZ2lzdGVyUHJlbG9hZFNjcmlwdDtcbiAgICBpZiAodHlwZW9mIHJlZyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICByZWcuY2FsbChzLCB7IHR5cGU6IFwiZnJhbWVcIiwgZmlsZVBhdGg6IFBSRUxPQURfUEFUSCwgaWQ6IFwiY29kZXgtcGx1c3BsdXNcIiB9KTtcbiAgICAgIGxvZyhcImluZm9cIiwgYHByZWxvYWQgcmVnaXN0ZXJlZCAocmVnaXN0ZXJQcmVsb2FkU2NyaXB0KSBvbiAke2xhYmVsfTpgLCBQUkVMT0FEX1BBVEgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBGYWxsYmFjayBmb3Igb2xkZXIgRWxlY3Ryb24gdmVyc2lvbnMuXG4gICAgY29uc3QgZXhpc3RpbmcgPSBzLmdldFByZWxvYWRzKCk7XG4gICAgaWYgKCFleGlzdGluZy5pbmNsdWRlcyhQUkVMT0FEX1BBVEgpKSB7XG4gICAgICBzLnNldFByZWxvYWRzKFsuLi5leGlzdGluZywgUFJFTE9BRF9QQVRIXSk7XG4gICAgfVxuICAgIGxvZyhcImluZm9cIiwgYHByZWxvYWQgcmVnaXN0ZXJlZCAoc2V0UHJlbG9hZHMpIG9uICR7bGFiZWx9OmAsIFBSRUxPQURfUEFUSCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBpZiAoZSBpbnN0YW5jZW9mIEVycm9yICYmIGUubWVzc2FnZS5pbmNsdWRlcyhcImV4aXN0aW5nIElEXCIpKSB7XG4gICAgICBsb2coXCJpbmZvXCIsIGBwcmVsb2FkIGFscmVhZHkgcmVnaXN0ZXJlZCBvbiAke2xhYmVsfTpgLCBQUkVMT0FEX1BBVEgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsb2coXCJlcnJvclwiLCBgcHJlbG9hZCByZWdpc3RyYXRpb24gb24gJHtsYWJlbH0gZmFpbGVkOmAsIGUpO1xuICB9XG59XG5cbmFwcC53aGVuUmVhZHkoKS50aGVuKCgpID0+IHtcbiAgbG9nKFwiaW5mb1wiLCBcImFwcCByZWFkeSBmaXJlZFwiKTtcbiAgaWYgKGlzQ29kZXhQbHVzUGx1c1NhZmVNb2RlRW5hYmxlZCgpKSB7XG4gICAgbG9nKFwid2FyblwiLCBcInNhZmUgbW9kZSBpcyBlbmFibGVkOyBwcmVsb2FkIHdpbGwgbm90IGJlIHJlZ2lzdGVyZWRcIik7XG4gICAgcmV0dXJuO1xuICB9XG4gIHJlZ2lzdGVyUHJlbG9hZChzZXNzaW9uLmRlZmF1bHRTZXNzaW9uLCBcImRlZmF1bHRTZXNzaW9uXCIpO1xufSk7XG5cbmFwcC5vbihcInNlc3Npb24tY3JlYXRlZFwiLCAocykgPT4ge1xuICBpZiAoaXNDb2RleFBsdXNQbHVzU2FmZU1vZGVFbmFibGVkKCkpIHJldHVybjtcbiAgcmVnaXN0ZXJQcmVsb2FkKHMsIFwic2Vzc2lvbi1jcmVhdGVkXCIpO1xufSk7XG5cbi8vIERJQUdOT1NUSUM6IGxvZyBldmVyeSB3ZWJDb250ZW50cyBjcmVhdGlvbi4gVXNlZnVsIGZvciB2ZXJpZnlpbmcgb3VyXG4vLyBwcmVsb2FkIHJlYWNoZXMgZXZlcnkgcmVuZGVyZXIgQ29kZXggc3Bhd25zLlxuYXBwLm9uKFwid2ViLWNvbnRlbnRzLWNyZWF0ZWRcIiwgKF9lLCB3YykgPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IHdwID0gKHdjIGFzIHVua25vd24gYXMgeyBnZXRMYXN0V2ViUHJlZmVyZW5jZXM/OiAoKSA9PiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB9KVxuICAgICAgLmdldExhc3RXZWJQcmVmZXJlbmNlcz8uKCk7XG4gICAgbG9nKFwiaW5mb1wiLCBcIndlYi1jb250ZW50cy1jcmVhdGVkXCIsIHtcbiAgICAgIGlkOiB3Yy5pZCxcbiAgICAgIHR5cGU6IHdjLmdldFR5cGUoKSxcbiAgICAgIHNlc3Npb25Jc0RlZmF1bHQ6IHdjLnNlc3Npb24gPT09IHNlc3Npb24uZGVmYXVsdFNlc3Npb24sXG4gICAgICBzYW5kYm94OiB3cD8uc2FuZGJveCxcbiAgICAgIGNvbnRleHRJc29sYXRpb246IHdwPy5jb250ZXh0SXNvbGF0aW9uLFxuICAgIH0pO1xuICAgIHdjLm9uKFwicHJlbG9hZC1lcnJvclwiLCAoX2V2LCBwLCBlcnIpID0+IHtcbiAgICAgIGxvZyhcImVycm9yXCIsIGB3YyAke3djLmlkfSBwcmVsb2FkLWVycm9yIHBhdGg9JHtwfWAsIFN0cmluZyhlcnI/LnN0YWNrID8/IGVycikpO1xuICAgIH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nKFwiZXJyb3JcIiwgXCJ3ZWItY29udGVudHMtY3JlYXRlZCBoYW5kbGVyIGZhaWxlZDpcIiwgU3RyaW5nKChlIGFzIEVycm9yKT8uc3RhY2sgPz8gZSkpO1xuICB9XG59KTtcblxubG9nKFwiaW5mb1wiLCBcIm1haW4udHMgZXZhbHVhdGVkOyBhcHAuaXNSZWFkeT1cIiArIGFwcC5pc1JlYWR5KCkpO1xuaWYgKGlzQ29kZXhQbHVzUGx1c1NhZmVNb2RlRW5hYmxlZCgpKSB7XG4gIGxvZyhcIndhcm5cIiwgXCJzYWZlIG1vZGUgaXMgZW5hYmxlZDsgdHdlYWtzIHdpbGwgbm90IGJlIGxvYWRlZFwiKTtcbn1cblxuLy8gMi4gSW5pdGlhbCB0d2VhayBkaXNjb3ZlcnkgKyBtYWluLXNjb3BlIGxvYWQuXG5sb2FkQWxsTWFpblR3ZWFrcygpO1xuXG5hcHAub24oXCJ3aWxsLXF1aXRcIiwgKCkgPT4ge1xuICBzdG9wQWxsTWFpblR3ZWFrcygpO1xuICBuYXRpdmVCcmlkZ2UuZGlzcG9zZUFsbCgpO1xuICBkaXNwb3NlQWxsT3dsVmlld3MoKTtcbiAgLy8gQmVzdC1lZmZvcnQgZmx1c2ggb2YgYW55IHBlbmRpbmcgc3RvcmFnZSB3cml0ZXMuXG4gIGZvciAoY29uc3QgdCBvZiB0d2Vha1N0YXRlLmxvYWRlZE1haW4udmFsdWVzKCkpIHtcbiAgICB0cnkge1xuICAgICAgdC5zdG9yYWdlLmZsdXNoKCk7XG4gICAgfSBjYXRjaCB7fVxuICB9XG59KTtcblxuLy8gMy4gSVBDOiBleHBvc2UgdHdlYWsgbWV0YWRhdGEgKyByZXZlYWwtaW4tZmluZGVyLlxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmxpc3QtdHdlYWtzXCIsIGFzeW5jICgpID0+IHtcbiAgYXdhaXQgUHJvbWlzZS5hbGwodHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLm1hcCgodCkgPT4gZW5zdXJlVHdlYWtVcGRhdGVDaGVjayh0KSkpO1xuICBjb25zdCB1cGRhdGVDaGVja3MgPSByZWFkU3RhdGUoKS50d2Vha1VwZGF0ZUNoZWNrcyA/PyB7fTtcbiAgcmV0dXJuIHR3ZWFrU3RhdGUuZGlzY292ZXJlZC5tYXAoKHQpID0+ICh7XG4gICAgbWFuaWZlc3Q6IHQubWFuaWZlc3QsXG4gICAgZW50cnk6IHQuZW50cnksXG4gICAgZGlyOiB0LmRpcixcbiAgICBlbnRyeUV4aXN0czogZXhpc3RzU3luYyh0LmVudHJ5KSxcbiAgICBlbmFibGVkOiBpc1R3ZWFrRW5hYmxlZCh0Lm1hbmlmZXN0LmlkKSxcbiAgICB1cGRhdGU6IHVwZGF0ZUNoZWNrc1t0Lm1hbmlmZXN0LmlkXSA/PyBudWxsLFxuICB9KSk7XG59KTtcblxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmdldC10d2Vhay1lbmFibGVkXCIsIChfZSwgaWQ6IHN0cmluZykgPT4gaXNUd2Vha0VuYWJsZWQoaWQpKTtcbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpzZXQtdHdlYWstZW5hYmxlZFwiLCAoX2UsIGlkOiBzdHJpbmcsIGVuYWJsZWQ6IGJvb2xlYW4pID0+IHtcbiAgcmV0dXJuIHNldFR3ZWFrRW5hYmxlZEFuZFJlbG9hZChpZCwgZW5hYmxlZCwgdHdlYWtMaWZlY3ljbGVEZXBzKTtcbn0pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Z2V0LWNvbmZpZ1wiLCAoKSA9PiB7XG4gIGNvbnN0IHMgPSByZWFkU3RhdGUoKTtcbiAgY29uc3QgaW5zdGFsbGVyU3RhdGUgPSByZWFkSW5zdGFsbGVyU3RhdGUoKTtcbiAgY29uc3Qgc291cmNlUm9vdCA9IGluc3RhbGxlclN0YXRlPy5zb3VyY2VSb290ID8/IGZhbGxiYWNrU291cmNlUm9vdCgpO1xuICByZXR1cm4ge1xuICAgIHZlcnNpb246IENPREVYX1BMVVNQTFVTX1ZFUlNJT04sXG4gICAgYXV0b1VwZGF0ZTogcy5jb2RleFBsdXNQbHVzPy5hdXRvVXBkYXRlICE9PSBmYWxzZSxcbiAgICBzYWZlTW9kZTogcy5jb2RleFBsdXNQbHVzPy5zYWZlTW9kZSA9PT0gdHJ1ZSxcbiAgICB1cGRhdGVDaGFubmVsOiBzLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZUNoYW5uZWwgPz8gXCJzdGFibGVcIixcbiAgICB1cGRhdGVSZXBvOiBzLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZVJlcG8gPz8gQ09ERVhfUExVU1BMVVNfUkVQTyxcbiAgICB1cGRhdGVSZWY6IHMuY29kZXhQbHVzUGx1cz8udXBkYXRlUmVmID8/IFwiXCIsXG4gICAgdXBkYXRlQ2hlY2s6IHMuY29kZXhQbHVzUGx1cz8udXBkYXRlQ2hlY2sgPz8gbnVsbCxcbiAgICBzZWxmVXBkYXRlOiByZWFkU2VsZlVwZGF0ZVN0YXRlKCksXG4gICAgaW5zdGFsbGF0aW9uU291cmNlOiBkZXNjcmliZUluc3RhbGxhdGlvblNvdXJjZShzb3VyY2VSb290KSxcbiAgfTtcbn0pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6c2V0LWF1dG8tdXBkYXRlXCIsIChfZSwgZW5hYmxlZDogYm9vbGVhbikgPT4ge1xuICBzZXRDb2RleFBsdXNQbHVzQXV0b1VwZGF0ZSghIWVuYWJsZWQpO1xuICByZXR1cm4geyBhdXRvVXBkYXRlOiBpc0NvZGV4UGx1c1BsdXNBdXRvVXBkYXRlRW5hYmxlZCgpIH07XG59KTtcblxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOnNldC11cGRhdGUtY29uZmlnXCIsIChfZSwgY29uZmlnOiB7XG4gIHVwZGF0ZUNoYW5uZWw/OiBTZWxmVXBkYXRlQ2hhbm5lbDtcbiAgdXBkYXRlUmVwbz86IHN0cmluZztcbiAgdXBkYXRlUmVmPzogc3RyaW5nO1xufSkgPT4ge1xuICBzZXRDb2RleFBsdXNQbHVzVXBkYXRlQ29uZmlnKGNvbmZpZyk7XG4gIGNvbnN0IHMgPSByZWFkU3RhdGUoKTtcbiAgcmV0dXJuIHtcbiAgICB1cGRhdGVDaGFubmVsOiBzLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZUNoYW5uZWwgPz8gXCJzdGFibGVcIixcbiAgICB1cGRhdGVSZXBvOiBzLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZVJlcG8gPz8gQ09ERVhfUExVU1BMVVNfUkVQTyxcbiAgICB1cGRhdGVSZWY6IHMuY29kZXhQbHVzUGx1cz8udXBkYXRlUmVmID8/IFwiXCIsXG4gIH07XG59KTtcblxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmNoZWNrLWNvZGV4cHAtdXBkYXRlXCIsIGFzeW5jIChfZSwgZm9yY2U/OiBib29sZWFuKSA9PiB7XG4gIHJldHVybiBlbnN1cmVDb2RleFBsdXNQbHVzVXBkYXRlQ2hlY2soZm9yY2UgPT09IHRydWUpO1xufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpydW4tY29kZXhwcC11cGRhdGVcIiwgYXN5bmMgKCkgPT4ge1xuICBjb25zdCBzb3VyY2VSb290ID0gcmVhZEluc3RhbGxlclN0YXRlKCk/LnNvdXJjZVJvb3QgPz8gZmFsbGJhY2tTb3VyY2VSb290KCk7XG4gIGlmICghc291cmNlUm9vdCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNvZGV4Kysgc291cmNlIENMSSB3YXMgbm90IGZvdW5kLiBSdW4gdGhlIGluc3RhbGxlciBvbmNlLCB0aGVuIHRyeSBhZ2Fpbi5cIik7XG4gIH1cbiAgY29uc3QgY2xpID0gam9pbihzb3VyY2VSb290LCBcInBhY2thZ2VzXCIsIFwiaW5zdGFsbGVyXCIsIFwiZGlzdFwiLCBcImNsaS5qc1wiKTtcbiAgaWYgKCFleGlzdHNTeW5jKGNsaSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb2RleCsrIHNvdXJjZSBDTEkgd2FzIG5vdCBmb3VuZC4gUnVuIHRoZSBpbnN0YWxsZXIgb25jZSwgdGhlbiB0cnkgYWdhaW4uXCIpO1xuICB9XG4gIGNvbnN0IHBlbmRpbmcgPSBtYXJrU2VsZlVwZGF0ZVN0YXJ0ZWQoc291cmNlUm9vdCk7XG4gIHN0YXJ0SW5zdGFsbGVkQ2xpKGNsaSwgW1widXBkYXRlXCIsIFwiLS13YXRjaGVyXCJdKTtcbiAgcmV0dXJuIHBlbmRpbmc7XG59KTtcblxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmdldC13YXRjaGVyLWhlYWx0aFwiLCAoKSA9PiBnZXRXYXRjaGVySGVhbHRoKHVzZXJSb290ISkpO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Z2V0LXR3ZWFrLXN0b3JlXCIsIGFzeW5jICgpID0+IHtcbiAgY29uc3Qgc3RvcmUgPSBhd2FpdCBmZXRjaFR3ZWFrU3RvcmVSZWdpc3RyeSgpO1xuICBjb25zdCByZWdpc3RyeSA9IHN0b3JlLnJlZ2lzdHJ5O1xuICBjb25zdCBpbnN0YWxsZWQgPSBuZXcgTWFwKHR3ZWFrU3RhdGUuZGlzY292ZXJlZC5tYXAoKHQpID0+IFt0Lm1hbmlmZXN0LmlkLCB0XSkpO1xuICBjb25zdCBlbnRyaWVzID0gc2h1ZmZsZVN0b3JlRW50cmllcyhyZWdpc3RyeS5lbnRyaWVzLCByYW5kb21JbnQpO1xuICByZXR1cm4ge1xuICAgIC4uLnJlZ2lzdHJ5LFxuICAgIHNvdXJjZVVybDogVFdFQUtfU1RPUkVfSU5ERVhfVVJMLFxuICAgIGZldGNoZWRBdDogc3RvcmUuZmV0Y2hlZEF0LFxuICAgIGVudHJpZXM6IGVudHJpZXMubWFwKChlbnRyeSkgPT4ge1xuICAgICAgY29uc3QgbG9jYWwgPSBpbnN0YWxsZWQuZ2V0KGVudHJ5LmlkKTtcbiAgICAgIGNvbnN0IHBsYXRmb3JtID0gc3RvcmVFbnRyeVBsYXRmb3JtQ29tcGF0aWJpbGl0eShlbnRyeSk7XG4gICAgICBjb25zdCBydW50aW1lID0gc3RvcmVFbnRyeVJ1bnRpbWVDb21wYXRpYmlsaXR5KGVudHJ5KTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIC4uLmVudHJ5LFxuICAgICAgICBwbGF0Zm9ybSxcbiAgICAgICAgcnVudGltZSxcbiAgICAgICAgaW5zdGFsbGVkOiBsb2NhbFxuICAgICAgICAgID8ge1xuICAgICAgICAgICAgICB2ZXJzaW9uOiBsb2NhbC5tYW5pZmVzdC52ZXJzaW9uLFxuICAgICAgICAgICAgICBlbmFibGVkOiBpc1R3ZWFrRW5hYmxlZChsb2NhbC5tYW5pZmVzdC5pZCksXG4gICAgICAgICAgICB9XG4gICAgICAgICAgOiBudWxsLFxuICAgICAgfTtcbiAgICB9KSxcbiAgfTtcbn0pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6aW5zdGFsbC1zdG9yZS10d2Vha1wiLCBhc3luYyAoX2UsIGlkOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgeyByZWdpc3RyeSB9ID0gYXdhaXQgZmV0Y2hUd2Vha1N0b3JlUmVnaXN0cnkoKTtcbiAgY29uc3QgZW50cnkgPSByZWdpc3RyeS5lbnRyaWVzLmZpbmQoKGNhbmRpZGF0ZSkgPT4gY2FuZGlkYXRlLmlkID09PSBpZCk7XG4gIGlmICghZW50cnkpIHRocm93IG5ldyBFcnJvcihgVHdlYWsgc3RvcmUgZW50cnkgbm90IGZvdW5kOiAke2lkfWApO1xuICBhc3NlcnRTdG9yZUVudHJ5UGxhdGZvcm1Db21wYXRpYmxlKGVudHJ5KTtcbiAgYXNzZXJ0U3RvcmVFbnRyeVJ1bnRpbWVDb21wYXRpYmxlKGVudHJ5KTtcbiAgYXdhaXQgaW5zdGFsbFN0b3JlVHdlYWsoZW50cnkpO1xuICByZWxvYWRUd2Vha3MoXCJzdG9yZS1pbnN0YWxsXCIsIHR3ZWFrTGlmZWN5Y2xlRGVwcyk7XG4gIHJldHVybiB7IGluc3RhbGxlZDogZW50cnkuaWQgfTtcbn0pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6cHJlcGFyZS10d2Vhay1zdG9yZS1zdWJtaXNzaW9uXCIsIGFzeW5jIChfZSwgcmVwb0lucHV0OiBzdHJpbmcpID0+IHtcbiAgcmV0dXJuIHByZXBhcmVUd2Vha1N0b3JlU3VibWlzc2lvbihyZXBvSW5wdXQpO1xufSk7XG5cbi8vIFNhbmRib3hlZCByZW5kZXJlciBwcmVsb2FkIGNhbid0IHVzZSBOb2RlIGZzIHRvIHJlYWQgdHdlYWsgc291cmNlLiBNYWluXG4vLyByZWFkcyBpdCBvbiB0aGUgcmVuZGVyZXIncyBiZWhhbGYuIFBhdGggbXVzdCBsaXZlIHVuZGVyIHR3ZWFrc0RpciBmb3Jcbi8vIHNlY3VyaXR5IFx1MjAxNCB3ZSByZWZ1c2UgYW55dGhpbmcgZWxzZS5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpyZWFkLXR3ZWFrLXNvdXJjZVwiLCAoX2UsIGVudHJ5UGF0aDogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IHJlc29sdmVkID0gcmVzb2x2ZShlbnRyeVBhdGgpO1xuICBpZiAoIWlzUGF0aEluc2lkZShUV0VBS1NfRElSLCByZXNvbHZlZCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJwYXRoIG91dHNpZGUgdHdlYWtzIGRpclwiKTtcbiAgfVxuICByZXR1cm4gcmVxdWlyZShcIm5vZGU6ZnNcIikucmVhZEZpbGVTeW5jKHJlc29sdmVkLCBcInV0ZjhcIik7XG59KTtcblxuLyoqXG4gKiBSZWFkIGFuIGFyYml0cmFyeSBhc3NldCBmaWxlIGZyb20gaW5zaWRlIGEgdHdlYWsncyBkaXJlY3RvcnkgYW5kIHJldHVybiBpdFxuICogYXMgYSBgZGF0YTpgIFVSTC4gVXNlZCBieSB0aGUgc2V0dGluZ3MgaW5qZWN0b3IgdG8gcmVuZGVyIG1hbmlmZXN0IGljb25zXG4gKiAodGhlIHJlbmRlcmVyIGlzIHNhbmRib3hlZDsgYGZpbGU6Ly9gIHdvbid0IGxvYWQpLlxuICpcbiAqIFNlY3VyaXR5OiBjYWxsZXIgcGFzc2VzIGB0d2Vha0RpcmAgYW5kIGByZWxQYXRoYDsgd2UgKDEpIHJlcXVpcmUgdHdlYWtEaXJcbiAqIHRvIGxpdmUgdW5kZXIgVFdFQUtTX0RJUiwgKDIpIHJlc29sdmUgcmVsUGF0aCBhZ2FpbnN0IGl0IGFuZCByZS1jaGVjayB0aGVcbiAqIHJlc3VsdCBzdGlsbCBsaXZlcyB1bmRlciBUV0VBS1NfRElSLCAoMykgY2FwIG91dHB1dCBzaXplIGF0IDEgTWlCLlxuICovXG5jb25zdCBBU1NFVF9NQVhfQllURVMgPSAxMDI0ICogMTAyNDtcbmNvbnN0IE1JTUVfQllfRVhUOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICBcIi5wbmdcIjogXCJpbWFnZS9wbmdcIixcbiAgXCIuanBnXCI6IFwiaW1hZ2UvanBlZ1wiLFxuICBcIi5qcGVnXCI6IFwiaW1hZ2UvanBlZ1wiLFxuICBcIi5naWZcIjogXCJpbWFnZS9naWZcIixcbiAgXCIud2VicFwiOiBcImltYWdlL3dlYnBcIixcbiAgXCIuc3ZnXCI6IFwiaW1hZ2Uvc3ZnK3htbFwiLFxuICBcIi5pY29cIjogXCJpbWFnZS94LWljb25cIixcbn07XG5pcGNNYWluLmhhbmRsZShcbiAgXCJjb2RleHBwOnJlYWQtdHdlYWstYXNzZXRcIixcbiAgKF9lLCB0d2Vha0Rpcjogc3RyaW5nLCByZWxQYXRoOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBmcyA9IHJlcXVpcmUoXCJub2RlOmZzXCIpIGFzIHR5cGVvZiBpbXBvcnQoXCJub2RlOmZzXCIpO1xuICAgIGNvbnN0IGRpciA9IHJlc29sdmUodHdlYWtEaXIpO1xuICAgIGlmICghaXNQYXRoSW5zaWRlKFRXRUFLU19ESVIsIGRpcikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcInR3ZWFrRGlyIG91dHNpZGUgdHdlYWtzIGRpclwiKTtcbiAgICB9XG4gICAgY29uc3QgZnVsbCA9IHJlc29sdmUoZGlyLCByZWxQYXRoKTtcbiAgICBpZiAoIWlzUGF0aEluc2lkZShkaXIsIGZ1bGwpIHx8IGZ1bGwgPT09IGRpcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwicGF0aCB0cmF2ZXJzYWxcIik7XG4gICAgfVxuICAgIGNvbnN0IHN0YXQgPSBmcy5zdGF0U3luYyhmdWxsKTtcbiAgICBpZiAoc3RhdC5zaXplID4gQVNTRVRfTUFYX0JZVEVTKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGFzc2V0IHRvbyBsYXJnZSAoJHtzdGF0LnNpemV9ID4gJHtBU1NFVF9NQVhfQllURVN9KWApO1xuICAgIH1cbiAgICBjb25zdCBleHQgPSBmdWxsLnNsaWNlKGZ1bGwubGFzdEluZGV4T2YoXCIuXCIpKS50b0xvd2VyQ2FzZSgpO1xuICAgIGNvbnN0IG1pbWUgPSBNSU1FX0JZX0VYVFtleHRdID8/IFwiYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXCI7XG4gICAgY29uc3QgYnVmID0gZnMucmVhZEZpbGVTeW5jKGZ1bGwpO1xuICAgIHJldHVybiBgZGF0YToke21pbWV9O2Jhc2U2NCwke2J1Zi50b1N0cmluZyhcImJhc2U2NFwiKX1gO1xuICB9LFxuKTtcblxuLy8gU2FuZGJveGVkIHByZWxvYWQgY2FuJ3Qgd3JpdGUgbG9ncyB0byBkaXNrOyBmb3J3YXJkIHRvIHVzIHZpYSBJUEMuXG5pcGNNYWluLm9uKFwiY29kZXhwcDpwcmVsb2FkLWxvZ1wiLCAoX2UsIGxldmVsOiBcImluZm9cIiB8IFwid2FyblwiIHwgXCJlcnJvclwiLCBtc2c6IHN0cmluZykgPT4ge1xuICBjb25zdCBsdmwgPSBsZXZlbCA9PT0gXCJlcnJvclwiIHx8IGxldmVsID09PSBcIndhcm5cIiA/IGxldmVsIDogXCJpbmZvXCI7XG4gIHRyeSB7XG4gICAgYXBwZW5kQ2FwcGVkTG9nKGpvaW4oTE9HX0RJUiwgXCJwcmVsb2FkLmxvZ1wiKSwgYFske25ldyBEYXRlKCkudG9JU09TdHJpbmcoKX1dIFske2x2bH1dICR7bXNnfVxcbmApO1xuICB9IGNhdGNoIHt9XG59KTtcblxuLy8gU2FuZGJveC1zYWZlIGZpbGVzeXN0ZW0gb3BzIGZvciByZW5kZXJlci1zY29wZSB0d2Vha3MuIEVhY2ggdHdlYWsgZ2V0c1xuLy8gYSBzYW5kYm94ZWQgZGlyIHVuZGVyIHVzZXJSb290L3R3ZWFrLWRhdGEvPGlkPi4gUmVuZGVyZXIgc2lkZSBjYWxscyB0aGVzZVxuLy8gb3ZlciBJUEMgaW5zdGVhZCBvZiB1c2luZyBOb2RlIGZzIGRpcmVjdGx5LlxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOnR3ZWFrLWZzXCIsIChfZSwgb3A6IHN0cmluZywgaWQ6IHN0cmluZywgcDogc3RyaW5nLCBjPzogc3RyaW5nKSA9PiB7XG4gIGlmICghL15bYS16QS1aMC05Ll8tXSskLy50ZXN0KGlkKSkgdGhyb3cgbmV3IEVycm9yKFwiYmFkIHR3ZWFrIGlkXCIpO1xuICBjb25zdCBkaXIgPSBqb2luKHVzZXJSb290ISwgXCJ0d2Vhay1kYXRhXCIsIGlkKTtcbiAgbWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gIGNvbnN0IGZ1bGwgPSByZXNvbHZlKGRpciwgcCk7XG4gIGlmICghaXNQYXRoSW5zaWRlKGRpciwgZnVsbCkgfHwgZnVsbCA9PT0gZGlyKSB0aHJvdyBuZXcgRXJyb3IoXCJwYXRoIHRyYXZlcnNhbFwiKTtcbiAgY29uc3QgZnMgPSByZXF1aXJlKFwibm9kZTpmc1wiKSBhcyB0eXBlb2YgaW1wb3J0KFwibm9kZTpmc1wiKTtcbiAgc3dpdGNoIChvcCkge1xuICAgIGNhc2UgXCJyZWFkXCI6IHJldHVybiBmcy5yZWFkRmlsZVN5bmMoZnVsbCwgXCJ1dGY4XCIpO1xuICAgIGNhc2UgXCJ3cml0ZVwiOiByZXR1cm4gZnMud3JpdGVGaWxlU3luYyhmdWxsLCBjID8/IFwiXCIsIFwidXRmOFwiKTtcbiAgICBjYXNlIFwiZXhpc3RzXCI6IHJldHVybiBmcy5leGlzdHNTeW5jKGZ1bGwpO1xuICAgIGNhc2UgXCJkYXRhRGlyXCI6IHJldHVybiBkaXI7XG4gICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIG9wOiAke29wfWApO1xuICB9XG59KTtcblxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOnVzZXItcGF0aHNcIiwgKCkgPT4gKHtcbiAgdXNlclJvb3QsXG4gIHJ1bnRpbWVEaXIsXG4gIHR3ZWFrc0RpcjogVFdFQUtTX0RJUixcbiAgbG9nRGlyOiBMT0dfRElSLFxufSkpO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Y29kZXgtcnVudGltZS1pbmZvXCIsICgpID0+IGN1cnJlbnRSdW50aW1lSW5mbygpKTtcbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpjb2RleC1ydW50aW1lLWNhcGFiaWxpdGllc1wiLCAoKSA9PiBjdXJyZW50UnVudGltZUNhcGFiaWxpdGllcygpKTtcbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpjb2RleC1jZHAtc3RhdHVzXCIsICgpID0+IGdldENkcFN0YXR1cygpKTtcbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpjb2RleC1jZHAtdGFyZ2V0c1wiLCAoKSA9PiBsaXN0Q2RwVGFyZ2V0cygpKTtcbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpjb2RleC13aW5kb3ctY3JlYXRlXCIsIChfZSwgb3B0czogQ29kZXhDcmVhdGVXaW5kb3dPcHRpb25zKSA9PiB7XG4gIHJldHVybiBjcmVhdGVDb2RleFdpbmRvdyhvcHRzKTtcbn0pO1xuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmNvZGV4LXdpbmRvdy1wcmltYXJ5XCIsICgpID0+IGdldFByaW1hcnlDb2RleFdpbmRvd1JlZigpKTtcbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpjb2RleC13aW5kb3ctZm9jdXNcIiwgKF9lLCB3aW5kb3dJZDogbnVtYmVyKSA9PiBmb2N1c0NvZGV4V2luZG93KHdpbmRvd0lkKSk7XG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Y29kZXgtd2luZG93LXNob3dcIiwgKF9lLCB3aW5kb3dJZDogbnVtYmVyKSA9PiBzaG93Q29kZXhXaW5kb3cod2luZG93SWQpKTtcbmlwY01haW4uaGFuZGxlKFxuICBcImNvZGV4cHA6Y29kZXgtdmlldy1jcmVhdGVcIixcbiAgYXN5bmMgKF9lLCB0d2Vha0lkOiBzdHJpbmcsIG9wdGlvbnM6IENvZGV4Vmlld0NyZWF0ZU9wdGlvbnMpID0+IHtcbiAgICBjb25zdCB0d2VhayA9IGFzc2VydFR3ZWFrVmlld1Blcm1pc3Npb25Gb3JJZCh0d2Vha0lkKTtcbiAgICBjb25zdCByZWYgPSBhd2FpdCBjcmVhdGVPd2xWaWV3KHsgaWQ6IHR3ZWFrLm1hbmlmZXN0LmlkLCBkaXI6IHR3ZWFrLmRpciB9LCBvcHRpb25zKTtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHJlZi5pZCxcbiAgICAgIHdlYkNvbnRlbnRzSWQ6IHJlZi53ZWJDb250ZW50c0lkLFxuICAgICAgcGFyZW50V2luZG93SWQ6IHJlZi5wYXJlbnRXaW5kb3dJZCxcbiAgICB9O1xuICB9LFxuKTtcbmlwY01haW4uaGFuZGxlKFxuICBcImNvZGV4cHA6Y29kZXgtdmlldy1jYWxsXCIsXG4gIChfZSwgdHdlYWtJZDogc3RyaW5nLCB2aWV3SWQ6IHN0cmluZywgbWV0aG9kOiBzdHJpbmcsIGFyZz86IHVua25vd24sIGFyZzI/OiB1bmtub3duKSA9PiB7XG4gICAgYXNzZXJ0VHdlYWtWaWV3UGVybWlzc2lvbkZvcklkKHR3ZWFrSWQpO1xuICAgIHJldHVybiBjYWxsT3dsVmlldyh0d2Vha0lkLCB2aWV3SWQsIG1ldGhvZCwgYXJnLCBhcmcyKTtcbiAgfSxcbik7XG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Y29kZXgtdmlldy1kaXNwb3NlLXR3ZWFrXCIsIChfZSwgdHdlYWtJZDogc3RyaW5nKSA9PiB7XG4gIGFzc2VydFR3ZWFrSWQodHdlYWtJZCk7XG4gIGRpc3Bvc2VPd2xWaWV3c0ZvclR3ZWFrKHR3ZWFrSWQpO1xufSk7XG5pcGNNYWluLmhhbmRsZShcbiAgXCJjb2RleHBwOm5hdGl2ZS1sb2FkLW1vZHVsZVwiLFxuICAoX2UsIHR3ZWFrSWQ6IHN0cmluZywgb3B0aW9uczogTmF0aXZlTW9kdWxlTG9hZE9wdGlvbnMpID0+IHtcbiAgICBjb25zdCByZWYgPSBuYXRpdmVCcmlkZ2UubG9hZE1vZHVsZSh0d2Vha0NvbnRleHQodHdlYWtJZCwgXCJuYXRpdmUtbW9kdWxlXCIpLCBvcHRpb25zKTtcbiAgICByZXR1cm4geyBpZDogcmVmLmlkLCBraW5kOiByZWYua2luZCB9O1xuICB9LFxuKTtcbmlwY01haW4uaGFuZGxlKFxuICBcImNvZGV4cHA6bmF0aXZlLW1vZHVsZS1yZXF1ZXN0XCIsXG4gIChfZSwgdHdlYWtJZDogc3RyaW5nLCBtb2R1bGVJZDogc3RyaW5nLCBtZXRob2Q6IHN0cmluZywgcGF5bG9hZD86IHVua25vd24sIHRpbWVvdXRNcz86IG51bWJlcikgPT4ge1xuICAgIGFzc2VydFR3ZWFrUGVybWlzc2lvbkZvcklkKHR3ZWFrSWQsIFwibmF0aXZlLW1vZHVsZVwiKTtcbiAgICByZXR1cm4gbmF0aXZlQnJpZGdlLnJlcXVlc3RNb2R1bGUodHdlYWtJZCwgbW9kdWxlSWQsIG1ldGhvZCwgcGF5bG9hZCwgdGltZW91dE1zKTtcbiAgfSxcbik7XG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6bmF0aXZlLW1vZHVsZS1kaXNwb3NlXCIsIChfZSwgdHdlYWtJZDogc3RyaW5nLCBtb2R1bGVJZDogc3RyaW5nKSA9PiB7XG4gIGFzc2VydFR3ZWFrUGVybWlzc2lvbkZvcklkKHR3ZWFrSWQsIFwibmF0aXZlLW1vZHVsZVwiKTtcbiAgcmV0dXJuIG5hdGl2ZUJyaWRnZS5kaXNwb3NlTW9kdWxlKHR3ZWFrSWQsIG1vZHVsZUlkKTtcbn0pO1xuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOm5hdGl2ZS1kaXNwb3NlLXR3ZWFrXCIsIChfZSwgdHdlYWtJZDogc3RyaW5nKSA9PiB7XG4gIGFzc2VydFR3ZWFrSWQodHdlYWtJZCk7XG4gIG5hdGl2ZUJyaWRnZS5kaXNwb3NlVHdlYWsodHdlYWtJZCk7XG59KTtcbmlwY01haW4uaGFuZGxlKFxuICBcImNvZGV4cHA6bmF0aXZlLWNyZWF0ZS1wYW5lbFwiLFxuICBhc3luYyAoX2UsIHR3ZWFrSWQ6IHN0cmluZywgb3B0aW9uczogTmF0aXZlUGFuZWxDcmVhdGVPcHRpb25zKSA9PiB7XG4gICAgY29uc3QgcmVmID0gYXdhaXQgbmF0aXZlQnJpZGdlLmNyZWF0ZVBhbmVsKHR3ZWFrQ29udGV4dCh0d2Vha0lkLCBcIm5hdGl2ZS12aWV3XCIpLCBvcHRpb25zKTtcbiAgICByZXR1cm4geyBpZDogcmVmLmlkLCB3aW5kb3dJZDogcmVmLndpbmRvd0lkIH07XG4gIH0sXG4pO1xuaXBjTWFpbi5oYW5kbGUoXG4gIFwiY29kZXhwcDpuYXRpdmUtYXR0YWNoLXZpZXdcIixcbiAgYXN5bmMgKF9lLCB0d2Vha0lkOiBzdHJpbmcsIG9wdGlvbnM6IE5hdGl2ZVZpZXdBdHRhY2hPcHRpb25zKSA9PiB7XG4gICAgY29uc3QgcmVmID0gYXdhaXQgbmF0aXZlQnJpZGdlLmF0dGFjaFZpZXcodHdlYWtDb250ZXh0KHR3ZWFrSWQsIFwibmF0aXZlLXZpZXdcIiksIG9wdGlvbnMpO1xuICAgIHJldHVybiB7IGlkOiByZWYuaWQgfTtcbiAgfSxcbik7XG5pcGNNYWluLmhhbmRsZShcbiAgXCJjb2RleHBwOm5hdGl2ZS1pbnN0YW5jZS1jYWxsXCIsXG4gIGFzeW5jIChfZSwgdHdlYWtJZDogc3RyaW5nLCBraW5kOiBcInBhbmVsXCIgfCBcInZpZXdcIiwgaW5zdGFuY2VJZDogc3RyaW5nLCBtZXRob2Q6IHN0cmluZywgYXJnPzogdW5rbm93bikgPT4ge1xuICAgIGFzc2VydFR3ZWFrUGVybWlzc2lvbkZvcklkKHR3ZWFrSWQsIFwibmF0aXZlLXZpZXdcIik7XG4gICAgcmV0dXJuIG5hdGl2ZUJyaWRnZS5jYWxsSW5zdGFuY2UodHdlYWtJZCwga2luZCwgaW5zdGFuY2VJZCwgbWV0aG9kLCBhcmcpO1xuICB9LFxuKTtcbmlwY01haW4uaGFuZGxlKFxuICBcImNvZGV4cHA6bmF0aXZlLWxhdW5jaC1oZWxwZXJcIixcbiAgKF9lLCB0d2Vha0lkOiBzdHJpbmcsIG9wdGlvbnM6IE5hdGl2ZUhlbHBlckxhdW5jaE9wdGlvbnMpID0+IHtcbiAgICBjb25zdCByZWYgPSBuYXRpdmVCcmlkZ2UubGF1bmNoSGVscGVyKHR3ZWFrQ29udGV4dCh0d2Vha0lkLCBcIm5hdGl2ZS1oZWxwZXJcIiksIG9wdGlvbnMpO1xuICAgIHJldHVybiB7IGlkOiByZWYuaWQsIHBpZDogcmVmLnBpZCB9O1xuICB9LFxuKTtcbmlwY01haW4uaGFuZGxlKFxuICBcImNvZGV4cHA6bmF0aXZlLWhlbHBlci1jYWxsXCIsXG4gIChfZSwgdHdlYWtJZDogc3RyaW5nLCBoZWxwZXJJZDogc3RyaW5nLCBtZXRob2Q6IHN0cmluZywgcGF5bG9hZD86IHVua25vd24sIHRpbWVvdXRNcz86IG51bWJlcikgPT4ge1xuICAgIGFzc2VydFR3ZWFrUGVybWlzc2lvbkZvcklkKHR3ZWFrSWQsIFwibmF0aXZlLWhlbHBlclwiKTtcbiAgICByZXR1cm4gbmF0aXZlQnJpZGdlLmNhbGxIZWxwZXIodHdlYWtJZCwgaGVscGVySWQsIG1ldGhvZCwgcGF5bG9hZCwgdGltZW91dE1zKTtcbiAgfSxcbik7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpyZXZlYWxcIiwgKF9lLCBwOiBzdHJpbmcpID0+IHtcbiAgc2hlbGwub3BlblBhdGgocCkuY2F0Y2goKCkgPT4ge30pO1xufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpvcGVuLWV4dGVybmFsXCIsIChfZSwgdXJsOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgcGFyc2VkID0gbmV3IFVSTCh1cmwpO1xuICBpZiAocGFyc2VkLnByb3RvY29sICE9PSBcImh0dHBzOlwiIHx8IHBhcnNlZC5ob3N0bmFtZSAhPT0gXCJnaXRodWIuY29tXCIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJvbmx5IGdpdGh1Yi5jb20gbGlua3MgY2FuIGJlIG9wZW5lZCBmcm9tIHR3ZWFrIG1ldGFkYXRhXCIpO1xuICB9XG4gIHNoZWxsLm9wZW5FeHRlcm5hbChwYXJzZWQudG9TdHJpbmcoKSkuY2F0Y2goKCkgPT4ge30pO1xufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpjb3B5LXRleHRcIiwgKF9lLCB0ZXh0OiBzdHJpbmcpID0+IHtcbiAgY2xpcGJvYXJkLndyaXRlVGV4dChTdHJpbmcodGV4dCkpO1xuICByZXR1cm4gdHJ1ZTtcbn0pO1xuXG4vLyBNYW51YWwgZm9yY2UtcmVsb2FkIHRyaWdnZXIgZnJvbSB0aGUgcmVuZGVyZXIgKGUuZy4gdGhlIFwiRm9yY2UgUmVsb2FkXCJcbi8vIGJ1dHRvbiBvbiBvdXIgaW5qZWN0ZWQgVHdlYWtzIHBhZ2UpLiBCeXBhc3NlcyB0aGUgd2F0Y2hlciBkZWJvdW5jZS5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpyZWxvYWQtdHdlYWtzXCIsICgpID0+IHtcbiAgcmVsb2FkVHdlYWtzKFwibWFudWFsXCIsIHR3ZWFrTGlmZWN5Y2xlRGVwcyk7XG4gIHJldHVybiB7IGF0OiBEYXRlLm5vdygpLCBjb3VudDogdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLmxlbmd0aCB9O1xufSk7XG5cbi8vIDQuIEZpbGVzeXN0ZW0gd2F0Y2hlciBcdTIxOTIgZGVib3VuY2VkIHJlbG9hZCArIGJyb2FkY2FzdC5cbi8vICAgIFdlIHdhdGNoIHRoZSB0d2Vha3MgZGlyIGZvciBhbnkgY2hhbmdlLiBPbiB0aGUgZmlyc3QgdGljayBvZiBpbmFjdGl2aXR5XG4vLyAgICB3ZSBzdG9wIG1haW4tc2lkZSB0d2Vha3MsIGNsZWFyIHRoZWlyIGNhY2hlZCBtb2R1bGVzLCByZS1kaXNjb3ZlciwgdGhlblxuLy8gICAgcmVzdGFydCBhbmQgYnJvYWRjYXN0IGBjb2RleHBwOnR3ZWFrcy1jaGFuZ2VkYCB0byBldmVyeSByZW5kZXJlciBzbyBpdFxuLy8gICAgY2FuIHJlLWluaXQgaXRzIGhvc3QuXG5jb25zdCBSRUxPQURfREVCT1VOQ0VfTVMgPSAyNTA7XG5sZXQgcmVsb2FkVGltZXI6IE5vZGVKUy5UaW1lb3V0IHwgbnVsbCA9IG51bGw7XG5mdW5jdGlvbiBzY2hlZHVsZVJlbG9hZChyZWFzb246IHN0cmluZyk6IHZvaWQge1xuICBpZiAocmVsb2FkVGltZXIpIGNsZWFyVGltZW91dChyZWxvYWRUaW1lcik7XG4gIHJlbG9hZFRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgcmVsb2FkVGltZXIgPSBudWxsO1xuICAgIHJlbG9hZFR3ZWFrcyhyZWFzb24sIHR3ZWFrTGlmZWN5Y2xlRGVwcyk7XG4gIH0sIFJFTE9BRF9ERUJPVU5DRV9NUyk7XG59XG5cbnRyeSB7XG4gIGNvbnN0IHdhdGNoZXIgPSBjaG9raWRhci53YXRjaChUV0VBS1NfRElSLCB7XG4gICAgaWdub3JlSW5pdGlhbDogdHJ1ZSxcbiAgICAvLyBXYWl0IGZvciBmaWxlcyB0byBzZXR0bGUgYmVmb3JlIHRyaWdnZXJpbmcgXHUyMDE0IGd1YXJkcyBhZ2FpbnN0IHBhcnRpYWxseVxuICAgIC8vIHdyaXR0ZW4gdHdlYWsgZmlsZXMgZHVyaW5nIGVkaXRvciBzYXZlcyAvIGdpdCBjaGVja291dHMuXG4gICAgYXdhaXRXcml0ZUZpbmlzaDogeyBzdGFiaWxpdHlUaHJlc2hvbGQ6IDE1MCwgcG9sbEludGVydmFsOiA1MCB9LFxuICAgIC8vIEF2b2lkIGVhdGluZyBDUFUgb24gaHVnZSBub2RlX21vZHVsZXMgdHJlZXMgaW5zaWRlIHR3ZWFrIGZvbGRlcnMuXG4gICAgaWdub3JlZDogKHApID0+IHAuaW5jbHVkZXMoYCR7VFdFQUtTX0RJUn0vYCkgJiYgL1xcL25vZGVfbW9kdWxlc1xcLy8udGVzdChwKSxcbiAgfSk7XG4gIHdhdGNoZXIub24oXCJhbGxcIiwgKGV2ZW50LCBwYXRoKSA9PiBzY2hlZHVsZVJlbG9hZChgJHtldmVudH0gJHtwYXRofWApKTtcbiAgd2F0Y2hlci5vbihcImVycm9yXCIsIChlKSA9PiBsb2coXCJ3YXJuXCIsIFwid2F0Y2hlciBlcnJvcjpcIiwgZSkpO1xuICBsb2coXCJpbmZvXCIsIFwid2F0Y2hpbmdcIiwgVFdFQUtTX0RJUik7XG4gIGFwcC5vbihcIndpbGwtcXVpdFwiLCAoKSA9PiB3YXRjaGVyLmNsb3NlKCkuY2F0Y2goKCkgPT4ge30pKTtcbn0gY2F0Y2ggKGUpIHtcbiAgbG9nKFwiZXJyb3JcIiwgXCJmYWlsZWQgdG8gc3RhcnQgd2F0Y2hlcjpcIiwgZSk7XG59XG5cbi8vIC0tLSBoZWxwZXJzIC0tLVxuXG5mdW5jdGlvbiBsb2FkQWxsTWFpblR3ZWFrcygpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICB0d2Vha1N0YXRlLmRpc2NvdmVyZWQgPSBkaXNjb3ZlclR3ZWFrcyhUV0VBS1NfRElSKTtcbiAgICBsb2coXG4gICAgICBcImluZm9cIixcbiAgICAgIGBkaXNjb3ZlcmVkICR7dHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLmxlbmd0aH0gdHdlYWsocyk6YCxcbiAgICAgIHR3ZWFrU3RhdGUuZGlzY292ZXJlZC5tYXAoKHQpID0+IHQubWFuaWZlc3QuaWQpLmpvaW4oXCIsIFwiKSxcbiAgICApO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nKFwiZXJyb3JcIiwgXCJ0d2VhayBkaXNjb3ZlcnkgZmFpbGVkOlwiLCBlKTtcbiAgICB0d2Vha1N0YXRlLmRpc2NvdmVyZWQgPSBbXTtcbiAgfVxuXG4gIHN5bmNNY3BTZXJ2ZXJzRnJvbUVuYWJsZWRUd2Vha3MoKTtcblxuICBmb3IgKGNvbnN0IHQgb2YgdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkKSB7XG4gICAgaWYgKCFpc01haW5Qcm9jZXNzVHdlYWtTY29wZSh0Lm1hbmlmZXN0LnNjb3BlKSkgY29udGludWU7XG4gICAgaWYgKCFpc1R3ZWFrRW5hYmxlZCh0Lm1hbmlmZXN0LmlkKSkge1xuICAgICAgbG9nKFwiaW5mb1wiLCBgc2tpcHBpbmcgZGlzYWJsZWQgbWFpbiB0d2VhazogJHt0Lm1hbmlmZXN0LmlkfWApO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBtb2QgPSByZXF1aXJlKHQuZW50cnkpO1xuICAgICAgY29uc3QgdHdlYWsgPSBtb2QuZGVmYXVsdCA/PyBtb2Q7XG4gICAgICBpZiAodHlwZW9mIHR3ZWFrPy5zdGFydCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGNvbnN0IHN0b3JhZ2UgPSBjcmVhdGVEaXNrU3RvcmFnZSh1c2VyUm9vdCEsIHQubWFuaWZlc3QuaWQpO1xuICAgICAgICB0d2Vhay5zdGFydCh7XG4gICAgICAgICAgbWFuaWZlc3Q6IHQubWFuaWZlc3QsXG4gICAgICAgICAgcHJvY2VzczogXCJtYWluXCIsXG4gICAgICAgICAgbG9nOiBtYWtlTG9nZ2VyKHQubWFuaWZlc3QuaWQpLFxuICAgICAgICAgIHN0b3JhZ2UsXG4gICAgICAgICAgaXBjOiBtYWtlTWFpbklwYyh0Lm1hbmlmZXN0LmlkKSxcbiAgICAgICAgICBmczogbWFrZU1haW5Gcyh0Lm1hbmlmZXN0LmlkKSxcbiAgICAgICAgICBjb2RleDogbWFrZUNvZGV4QXBpKHQpLFxuICAgICAgICB9KTtcbiAgICAgICAgdHdlYWtTdGF0ZS5sb2FkZWRNYWluLnNldCh0Lm1hbmlmZXN0LmlkLCB7XG4gICAgICAgICAgc3RvcDogdHdlYWsuc3RvcCxcbiAgICAgICAgICBzdG9yYWdlLFxuICAgICAgICB9KTtcbiAgICAgICAgbG9nKFwiaW5mb1wiLCBgc3RhcnRlZCBtYWluIHR3ZWFrOiAke3QubWFuaWZlc3QuaWR9YCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nKFwiZXJyb3JcIiwgYHR3ZWFrICR7dC5tYW5pZmVzdC5pZH0gZmFpbGVkIHRvIHN0YXJ0OmAsIGUpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBzeW5jTWNwU2VydmVyc0Zyb21FbmFibGVkVHdlYWtzKCk6IHZvaWQge1xuICB0cnkge1xuICAgIGNvbnN0IHJlc3VsdCA9IHN5bmNNYW5hZ2VkTWNwU2VydmVycyh7XG4gICAgICBjb25maWdQYXRoOiBDT0RFWF9DT05GSUdfRklMRSxcbiAgICAgIHR3ZWFrczogdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLmZpbHRlcigodCkgPT4gaXNUd2Vha0VuYWJsZWQodC5tYW5pZmVzdC5pZCkpLFxuICAgIH0pO1xuICAgIGlmIChyZXN1bHQuY2hhbmdlZCkge1xuICAgICAgbG9nKFwiaW5mb1wiLCBgc3luY2VkIENvZGV4IE1DUCBjb25maWc6ICR7cmVzdWx0LnNlcnZlck5hbWVzLmpvaW4oXCIsIFwiKSB8fCBcIm5vbmVcIn1gKTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdC5za2lwcGVkU2VydmVyTmFtZXMubGVuZ3RoID4gMCkge1xuICAgICAgbG9nKFxuICAgICAgICBcImluZm9cIixcbiAgICAgICAgYHNraXBwZWQgQ29kZXgrKyBtYW5hZ2VkIE1DUCBzZXJ2ZXIocykgYWxyZWFkeSBjb25maWd1cmVkIGJ5IHVzZXI6ICR7cmVzdWx0LnNraXBwZWRTZXJ2ZXJOYW1lcy5qb2luKFwiLCBcIil9YCxcbiAgICAgICk7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nKFwid2FyblwiLCBcImZhaWxlZCB0byBzeW5jIENvZGV4IE1DUCBjb25maWc6XCIsIGUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHN0b3BBbGxNYWluVHdlYWtzKCk6IHZvaWQge1xuICBmb3IgKGNvbnN0IFtpZCwgdF0gb2YgdHdlYWtTdGF0ZS5sb2FkZWRNYWluKSB7XG4gICAgdHJ5IHtcbiAgICAgIHQuc3RvcD8uKCk7XG4gICAgICB0LnN0b3JhZ2UuZmx1c2goKTtcbiAgICAgIGxvZyhcImluZm9cIiwgYHN0b3BwZWQgbWFpbiB0d2VhazogJHtpZH1gKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2coXCJ3YXJuXCIsIGBzdG9wIGZhaWxlZCBmb3IgJHtpZH06YCwgZSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIG5hdGl2ZUJyaWRnZS5kaXNwb3NlVHdlYWsoaWQpO1xuICAgICAgZGlzcG9zZU93bFZpZXdzRm9yVHdlYWsoaWQpO1xuICAgIH1cbiAgfVxuICB0d2Vha1N0YXRlLmxvYWRlZE1haW4uY2xlYXIoKTtcbn1cblxuZnVuY3Rpb24gY2xlYXJUd2Vha01vZHVsZUNhY2hlKCk6IHZvaWQge1xuICBjb25zdCByb290U2V0ID0gbmV3IFNldDxzdHJpbmc+KFtUV0VBS1NfRElSLCBzYWZlUmVhbHBhdGgoVFdFQUtTX0RJUildKTtcbiAgY29uc3QgZW50cnlTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCB0d2VhayBvZiB0d2Vha1N0YXRlLmRpc2NvdmVyZWQpIHtcbiAgICByb290U2V0LmFkZCh0d2Vhay5kaXIpO1xuICAgIHJvb3RTZXQuYWRkKHNhZmVSZWFscGF0aCh0d2Vhay5kaXIpKTtcbiAgICBlbnRyeVNldC5hZGQodHdlYWsuZW50cnkpO1xuICAgIGVudHJ5U2V0LmFkZChzYWZlUmVhbHBhdGgodHdlYWsuZW50cnkpKTtcbiAgfVxuXG4gIGNvbnN0IHJvb3RzID0gWy4uLnJvb3RTZXRdO1xuICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhyZXF1aXJlLmNhY2hlKSkge1xuICAgIGNvbnN0IHJlYWxLZXkgPSBzYWZlUmVhbHBhdGgoa2V5KTtcbiAgICBjb25zdCBpc1R3ZWFrTW9kdWxlID1cbiAgICAgIGVudHJ5U2V0LmhhcyhrZXkpIHx8XG4gICAgICBlbnRyeVNldC5oYXMocmVhbEtleSkgfHxcbiAgICAgIHJvb3RzLnNvbWUoKHJvb3QpID0+IGlzUGF0aEluc2lkZShyb290LCBrZXkpIHx8IGlzUGF0aEluc2lkZShyb290LCByZWFsS2V5KSk7XG4gICAgaWYgKGlzVHdlYWtNb2R1bGUpIGRlbGV0ZSByZXF1aXJlLmNhY2hlW2tleV07XG4gIH1cbn1cblxuZnVuY3Rpb24gc2FmZVJlYWxwYXRoKGZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICB0cnkge1xuICAgIHJldHVybiByZWFscGF0aFN5bmMoZmlsZVBhdGgpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmlsZVBhdGg7XG4gIH1cbn1cblxuY29uc3QgVVBEQVRFX0NIRUNLX0lOVEVSVkFMX01TID0gMjQgKiA2MCAqIDYwICogMTAwMDtcbmNvbnN0IFZFUlNJT05fUkUgPSAvXnY/KFxcZCspXFwuKFxcZCspXFwuKFxcZCspKD86Wy0rXS4qKT8kLztcblxuYXN5bmMgZnVuY3Rpb24gZW5zdXJlQ29kZXhQbHVzUGx1c1VwZGF0ZUNoZWNrKGZvcmNlID0gZmFsc2UpOiBQcm9taXNlPENvZGV4UGx1c1BsdXNVcGRhdGVDaGVjaz4ge1xuICBjb25zdCBzdGF0ZSA9IHJlYWRTdGF0ZSgpO1xuICBjb25zdCBjYWNoZWQgPSBzdGF0ZS5jb2RleFBsdXNQbHVzPy51cGRhdGVDaGVjaztcbiAgY29uc3QgY2hhbm5lbCA9IHN0YXRlLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZUNoYW5uZWwgPz8gXCJzdGFibGVcIjtcbiAgY29uc3QgcmVwbyA9IHN0YXRlLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZVJlcG8gPz8gQ09ERVhfUExVU1BMVVNfUkVQTztcbiAgaWYgKFxuICAgICFmb3JjZSAmJlxuICAgIGNhY2hlZCAmJlxuICAgIGNhY2hlZC5jdXJyZW50VmVyc2lvbiA9PT0gQ09ERVhfUExVU1BMVVNfVkVSU0lPTiAmJlxuICAgIERhdGUubm93KCkgLSBEYXRlLnBhcnNlKGNhY2hlZC5jaGVja2VkQXQpIDwgVVBEQVRFX0NIRUNLX0lOVEVSVkFMX01TXG4gICkge1xuICAgIHJldHVybiBjYWNoZWQ7XG4gIH1cblxuICBjb25zdCByZWxlYXNlID0gYXdhaXQgZmV0Y2hMYXRlc3RSZWxlYXNlKHJlcG8sIENPREVYX1BMVVNQTFVTX1ZFUlNJT04sIGNoYW5uZWwgPT09IFwicHJlcmVsZWFzZVwiKTtcbiAgY29uc3QgbGF0ZXN0VmVyc2lvbiA9IHJlbGVhc2UubGF0ZXN0VGFnID8gbm9ybWFsaXplVmVyc2lvbihyZWxlYXNlLmxhdGVzdFRhZykgOiBudWxsO1xuICBjb25zdCBjaGVjazogQ29kZXhQbHVzUGx1c1VwZGF0ZUNoZWNrID0ge1xuICAgIGNoZWNrZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIGN1cnJlbnRWZXJzaW9uOiBDT0RFWF9QTFVTUExVU19WRVJTSU9OLFxuICAgIGxhdGVzdFZlcnNpb24sXG4gICAgcmVsZWFzZVVybDogcmVsZWFzZS5yZWxlYXNlVXJsID8/IGBodHRwczovL2dpdGh1Yi5jb20vJHtyZXBvfS9yZWxlYXNlc2AsXG4gICAgcmVsZWFzZU5vdGVzOiByZWxlYXNlLnJlbGVhc2VOb3RlcyxcbiAgICB1cGRhdGVBdmFpbGFibGU6IGxhdGVzdFZlcnNpb25cbiAgICAgID8gY29tcGFyZVZlcnNpb25zKG5vcm1hbGl6ZVZlcnNpb24obGF0ZXN0VmVyc2lvbiksIENPREVYX1BMVVNQTFVTX1ZFUlNJT04pID4gMFxuICAgICAgOiBmYWxzZSxcbiAgICAuLi4ocmVsZWFzZS5lcnJvciA/IHsgZXJyb3I6IHJlbGVhc2UuZXJyb3IgfSA6IHt9KSxcbiAgfTtcbiAgc3RhdGUuY29kZXhQbHVzUGx1cyA/Pz0ge307XG4gIHN0YXRlLmNvZGV4UGx1c1BsdXMudXBkYXRlQ2hlY2sgPSBjaGVjaztcbiAgd3JpdGVTdGF0ZShzdGF0ZSk7XG4gIHJldHVybiBjaGVjaztcbn1cblxuYXN5bmMgZnVuY3Rpb24gZW5zdXJlVHdlYWtVcGRhdGVDaGVjayh0OiBEaXNjb3ZlcmVkVHdlYWspOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgaWQgPSB0Lm1hbmlmZXN0LmlkO1xuICBjb25zdCByZXBvID0gdC5tYW5pZmVzdC5naXRodWJSZXBvO1xuICBjb25zdCBzdGF0ZSA9IHJlYWRTdGF0ZSgpO1xuICBjb25zdCBjYWNoZWQgPSBzdGF0ZS50d2Vha1VwZGF0ZUNoZWNrcz8uW2lkXTtcbiAgaWYgKFxuICAgIGNhY2hlZCAmJlxuICAgIGNhY2hlZC5yZXBvID09PSByZXBvICYmXG4gICAgY2FjaGVkLmN1cnJlbnRWZXJzaW9uID09PSB0Lm1hbmlmZXN0LnZlcnNpb24gJiZcbiAgICBEYXRlLm5vdygpIC0gRGF0ZS5wYXJzZShjYWNoZWQuY2hlY2tlZEF0KSA8IFVQREFURV9DSEVDS19JTlRFUlZBTF9NU1xuICApIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBuZXh0ID0gYXdhaXQgZmV0Y2hMYXRlc3RSZWxlYXNlKHJlcG8sIHQubWFuaWZlc3QudmVyc2lvbik7XG4gIGNvbnN0IGxhdGVzdFZlcnNpb24gPSBuZXh0LmxhdGVzdFRhZyA/IG5vcm1hbGl6ZVZlcnNpb24obmV4dC5sYXRlc3RUYWcpIDogbnVsbDtcbiAgY29uc3QgY2hlY2s6IFR3ZWFrVXBkYXRlQ2hlY2sgPSB7XG4gICAgY2hlY2tlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgcmVwbyxcbiAgICBjdXJyZW50VmVyc2lvbjogdC5tYW5pZmVzdC52ZXJzaW9uLFxuICAgIGxhdGVzdFZlcnNpb24sXG4gICAgbGF0ZXN0VGFnOiBuZXh0LmxhdGVzdFRhZyxcbiAgICByZWxlYXNlVXJsOiBuZXh0LnJlbGVhc2VVcmwsXG4gICAgdXBkYXRlQXZhaWxhYmxlOiBsYXRlc3RWZXJzaW9uXG4gICAgICA/IGNvbXBhcmVWZXJzaW9ucyhsYXRlc3RWZXJzaW9uLCBub3JtYWxpemVWZXJzaW9uKHQubWFuaWZlc3QudmVyc2lvbikpID4gMFxuICAgICAgOiBmYWxzZSxcbiAgICAuLi4obmV4dC5lcnJvciA/IHsgZXJyb3I6IG5leHQuZXJyb3IgfSA6IHt9KSxcbiAgfTtcbiAgc3RhdGUudHdlYWtVcGRhdGVDaGVja3MgPz89IHt9O1xuICBzdGF0ZS50d2Vha1VwZGF0ZUNoZWNrc1tpZF0gPSBjaGVjaztcbiAgd3JpdGVTdGF0ZShzdGF0ZSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZldGNoTGF0ZXN0UmVsZWFzZShcbiAgcmVwbzogc3RyaW5nLFxuICBjdXJyZW50VmVyc2lvbjogc3RyaW5nLFxuICBpbmNsdWRlUHJlcmVsZWFzZSA9IGZhbHNlLFxuKTogUHJvbWlzZTx7IGxhdGVzdFRhZzogc3RyaW5nIHwgbnVsbDsgcmVsZWFzZVVybDogc3RyaW5nIHwgbnVsbDsgcmVsZWFzZU5vdGVzOiBzdHJpbmcgfCBudWxsOyBlcnJvcj86IHN0cmluZyB9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgICBjb25zdCB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiBjb250cm9sbGVyLmFib3J0KCksIDgwMDApO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBlbmRwb2ludCA9IGluY2x1ZGVQcmVyZWxlYXNlID8gXCJyZWxlYXNlcz9wZXJfcGFnZT0yMFwiIDogXCJyZWxlYXNlcy9sYXRlc3RcIjtcbiAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKGBodHRwczovL2FwaS5naXRodWIuY29tL3JlcG9zLyR7cmVwb30vJHtlbmRwb2ludH1gLCB7XG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICBcIkFjY2VwdFwiOiBcImFwcGxpY2F0aW9uL3ZuZC5naXRodWIranNvblwiLFxuICAgICAgICAgIFwiVXNlci1BZ2VudFwiOiBgY29kZXgtcGx1c3BsdXMvJHtjdXJyZW50VmVyc2lvbn1gLFxuICAgICAgICB9LFxuICAgICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLFxuICAgICAgfSk7XG4gICAgICBpZiAocmVzLnN0YXR1cyA9PT0gNDA0KSB7XG4gICAgICAgIHJldHVybiB7IGxhdGVzdFRhZzogbnVsbCwgcmVsZWFzZVVybDogbnVsbCwgcmVsZWFzZU5vdGVzOiBudWxsLCBlcnJvcjogXCJubyBHaXRIdWIgcmVsZWFzZSBmb3VuZFwiIH07XG4gICAgICB9XG4gICAgICBpZiAoIXJlcy5vaykge1xuICAgICAgICByZXR1cm4geyBsYXRlc3RUYWc6IG51bGwsIHJlbGVhc2VVcmw6IG51bGwsIHJlbGVhc2VOb3RlczogbnVsbCwgZXJyb3I6IGBHaXRIdWIgcmV0dXJuZWQgJHtyZXMuc3RhdHVzfWAgfTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGpzb24gPSBhd2FpdCByZXMuanNvbigpIGFzIHsgdGFnX25hbWU/OiBzdHJpbmc7IGh0bWxfdXJsPzogc3RyaW5nOyBib2R5Pzogc3RyaW5nOyBkcmFmdD86IGJvb2xlYW4gfSB8IEFycmF5PHsgdGFnX25hbWU/OiBzdHJpbmc7IGh0bWxfdXJsPzogc3RyaW5nOyBib2R5Pzogc3RyaW5nOyBkcmFmdD86IGJvb2xlYW4gfT47XG4gICAgICBjb25zdCBib2R5ID0gQXJyYXkuaXNBcnJheShqc29uKSA/IGpzb24uZmluZCgocmVsZWFzZSkgPT4gIXJlbGVhc2UuZHJhZnQpIDoganNvbjtcbiAgICAgIGlmICghYm9keSkge1xuICAgICAgICByZXR1cm4geyBsYXRlc3RUYWc6IG51bGwsIHJlbGVhc2VVcmw6IG51bGwsIHJlbGVhc2VOb3RlczogbnVsbCwgZXJyb3I6IFwibm8gR2l0SHViIHJlbGVhc2UgZm91bmRcIiB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGF0ZXN0VGFnOiBib2R5LnRhZ19uYW1lID8/IG51bGwsXG4gICAgICAgIHJlbGVhc2VVcmw6IGJvZHkuaHRtbF91cmwgPz8gYGh0dHBzOi8vZ2l0aHViLmNvbS8ke3JlcG99L3JlbGVhc2VzYCxcbiAgICAgICAgcmVsZWFzZU5vdGVzOiBib2R5LmJvZHkgPz8gbnVsbCxcbiAgICAgIH07XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbGF0ZXN0VGFnOiBudWxsLFxuICAgICAgcmVsZWFzZVVybDogbnVsbCxcbiAgICAgIHJlbGVhc2VOb3RlczogbnVsbCxcbiAgICAgIGVycm9yOiBlIGluc3RhbmNlb2YgRXJyb3IgPyBlLm1lc3NhZ2UgOiBTdHJpbmcoZSksXG4gICAgfTtcbiAgfVxufVxuXG5pbnRlcmZhY2UgVHdlYWtTdG9yZUZldGNoUmVzdWx0IHtcbiAgcmVnaXN0cnk6IFR3ZWFrU3RvcmVSZWdpc3RyeTtcbiAgZmV0Y2hlZEF0OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBTdG9yZUluc3RhbGxNZXRhZGF0YSB7XG4gIHJlcG86IHN0cmluZztcbiAgYXBwcm92ZWRDb21taXRTaGE6IHN0cmluZztcbiAgaW5zdGFsbGVkQXQ6IHN0cmluZztcbiAgc3RvcmVJbmRleFVybDogc3RyaW5nO1xuICBmaWxlcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG59XG5cbmludGVyZmFjZSBTdG9yZUVudHJ5UGxhdGZvcm1Db21wYXRpYmlsaXR5IHtcbiAgY3VycmVudDogTm9kZUpTLlBsYXRmb3JtO1xuICBzdXBwb3J0ZWQ6IFR3ZWFrU3RvcmVQbGF0Zm9ybVtdIHwgbnVsbDtcbiAgY29tcGF0aWJsZTogYm9vbGVhbjtcbiAgcmVhc29uOiBzdHJpbmcgfCBudWxsO1xufVxuXG5pbnRlcmZhY2UgU3RvcmVFbnRyeVJ1bnRpbWVDb21wYXRpYmlsaXR5IHtcbiAgY3VycmVudDogc3RyaW5nO1xuICByZXF1aXJlZDogc3RyaW5nIHwgbnVsbDtcbiAgY29tcGF0aWJsZTogYm9vbGVhbjtcbiAgcmVhc29uOiBzdHJpbmcgfCBudWxsO1xufVxuXG5jbGFzcyBTdG9yZVR3ZWFrTW9kaWZpZWRFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IodHdlYWtOYW1lOiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIGAke3R3ZWFrTmFtZX0gaGFzIGxvY2FsIHNvdXJjZSBjaGFuZ2VzLCBzbyBDb2RleCsrIGNhbid0IGF1dG8tdXBkYXRlIGl0LiBSZXZlcnQgeW91ciBsb2NhbCBjaGFuZ2VzIG9yIHJlaW5zdGFsbCB0aGUgdHdlYWsgbWFudWFsbHkuYCxcbiAgICApO1xuICAgIHRoaXMubmFtZSA9IFwiU3RvcmVUd2Vha01vZGlmaWVkRXJyb3JcIjtcbiAgfVxufVxuXG5mdW5jdGlvbiBzdG9yZUVudHJ5UGxhdGZvcm1Db21wYXRpYmlsaXR5KGVudHJ5OiBUd2Vha1N0b3JlRW50cnkpOiBTdG9yZUVudHJ5UGxhdGZvcm1Db21wYXRpYmlsaXR5IHtcbiAgY29uc3Qgc3VwcG9ydGVkID0gZW50cnkucGxhdGZvcm1zID8/IG51bGw7XG4gIGNvbnN0IGNvbXBhdGlibGUgPSAhc3VwcG9ydGVkIHx8IHN1cHBvcnRlZC5pbmNsdWRlcyhwcm9jZXNzLnBsYXRmb3JtIGFzIFR3ZWFrU3RvcmVQbGF0Zm9ybSk7XG4gIHJldHVybiB7XG4gICAgY3VycmVudDogcHJvY2Vzcy5wbGF0Zm9ybSxcbiAgICBzdXBwb3J0ZWQsXG4gICAgY29tcGF0aWJsZSxcbiAgICByZWFzb246IGNvbXBhdGlibGUgPyBudWxsIDogYCR7ZW50cnkubWFuaWZlc3QubmFtZX0gaXMgb25seSBhdmFpbGFibGUgb24gJHtmb3JtYXRTdG9yZVBsYXRmb3JtcyhzdXBwb3J0ZWQpfS5gLFxuICB9O1xufVxuXG5mdW5jdGlvbiBhc3NlcnRTdG9yZUVudHJ5UGxhdGZvcm1Db21wYXRpYmxlKGVudHJ5OiBUd2Vha1N0b3JlRW50cnkpOiB2b2lkIHtcbiAgY29uc3QgcGxhdGZvcm0gPSBzdG9yZUVudHJ5UGxhdGZvcm1Db21wYXRpYmlsaXR5KGVudHJ5KTtcbiAgaWYgKCFwbGF0Zm9ybS5jb21wYXRpYmxlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKHBsYXRmb3JtLnJlYXNvbiA/PyBgJHtlbnRyeS5tYW5pZmVzdC5uYW1lfSBpcyBub3QgYXZhaWxhYmxlIG9uIHRoaXMgcGxhdGZvcm0uYCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc3RvcmVFbnRyeVJ1bnRpbWVDb21wYXRpYmlsaXR5KGVudHJ5OiBUd2Vha1N0b3JlRW50cnkpOiBTdG9yZUVudHJ5UnVudGltZUNvbXBhdGliaWxpdHkge1xuICBjb25zdCByZXF1aXJlZCA9IGNsZWFuTWluUnVudGltZShlbnRyeS5tYW5pZmVzdC5taW5SdW50aW1lKTtcbiAgY29uc3QgY29tcGF0aWJsZSA9ICFyZXF1aXJlZCB8fCBjb21wYXJlVmVyc2lvbnMoQ09ERVhfUExVU1BMVVNfVkVSU0lPTiwgcmVxdWlyZWQpID49IDA7XG4gIHJldHVybiB7XG4gICAgY3VycmVudDogQ09ERVhfUExVU1BMVVNfVkVSU0lPTixcbiAgICByZXF1aXJlZCxcbiAgICBjb21wYXRpYmxlLFxuICAgIHJlYXNvbjogY29tcGF0aWJsZSB8fCAhcmVxdWlyZWRcbiAgICAgID8gbnVsbFxuICAgICAgOiBgJHtlbnRyeS5tYW5pZmVzdC5uYW1lfSByZXF1aXJlcyBDb2RleCsrICR7cmVxdWlyZWR9IG9yIG5ld2VyLmAsXG4gIH07XG59XG5cbmZ1bmN0aW9uIGFzc2VydFN0b3JlRW50cnlSdW50aW1lQ29tcGF0aWJsZShlbnRyeTogVHdlYWtTdG9yZUVudHJ5KTogdm9pZCB7XG4gIGNvbnN0IHJ1bnRpbWUgPSBzdG9yZUVudHJ5UnVudGltZUNvbXBhdGliaWxpdHkoZW50cnkpO1xuICBpZiAoIXJ1bnRpbWUuY29tcGF0aWJsZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihydW50aW1lLnJlYXNvbiA/PyBgJHtlbnRyeS5tYW5pZmVzdC5uYW1lfSByZXF1aXJlcyBhIG5ld2VyIENvZGV4KysgcnVudGltZS5gKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjbGVhbk1pblJ1bnRpbWUodmFsdWU6IHVua25vd24pOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIikgcmV0dXJuIG51bGw7XG4gIGNvbnN0IHZlcnNpb24gPSBub3JtYWxpemVWZXJzaW9uKHZhbHVlLnJlcGxhY2UoL14+PT9cXHMqLywgXCJcIikpO1xuICByZXR1cm4gVkVSU0lPTl9SRS50ZXN0KHZlcnNpb24pID8gdmVyc2lvbiA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFN0b3JlUGxhdGZvcm1zKHBsYXRmb3JtczogVHdlYWtTdG9yZVBsYXRmb3JtW10gfCBudWxsKTogc3RyaW5nIHtcbiAgaWYgKCFwbGF0Zm9ybXMgfHwgcGxhdGZvcm1zLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFwic3VwcG9ydGVkIHBsYXRmb3Jtc1wiO1xuICByZXR1cm4gcGxhdGZvcm1zLm1hcCgocGxhdGZvcm0pID0+IHtcbiAgICBpZiAocGxhdGZvcm0gPT09IFwiZGFyd2luXCIpIHJldHVybiBcIm1hY09TXCI7XG4gICAgaWYgKHBsYXRmb3JtID09PSBcIndpbjMyXCIpIHJldHVybiBcIldpbmRvd3NcIjtcbiAgICByZXR1cm4gXCJMaW51eFwiO1xuICB9KS5qb2luKFwiLCBcIik7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZldGNoVHdlYWtTdG9yZVJlZ2lzdHJ5KCk6IFByb21pc2U8VHdlYWtTdG9yZUZldGNoUmVzdWx0PiB7XG4gIGNvbnN0IGZldGNoZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBjb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgIGNvbnN0IHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IGNvbnRyb2xsZXIuYWJvcnQoKSwgODAwMCk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKFRXRUFLX1NUT1JFX0lOREVYX1VSTCwge1xuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgXCJBY2NlcHRcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgICAgXCJVc2VyLUFnZW50XCI6IGBjb2RleC1wbHVzcGx1cy8ke0NPREVYX1BMVVNQTFVTX1ZFUlNJT059YCxcbiAgICAgICAgfSxcbiAgICAgICAgc2lnbmFsOiBjb250cm9sbGVyLnNpZ25hbCxcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXMub2spIHRocm93IG5ldyBFcnJvcihgc3RvcmUgcmV0dXJuZWQgJHtyZXMuc3RhdHVzfWApO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVnaXN0cnk6IG5vcm1hbGl6ZVN0b3JlUmVnaXN0cnkoYXdhaXQgcmVzLmpzb24oKSksXG4gICAgICAgIGZldGNoZWRBdCxcbiAgICAgIH07XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zdCBlcnJvciA9IGUgaW5zdGFuY2VvZiBFcnJvciA/IGUgOiBuZXcgRXJyb3IoU3RyaW5nKGUpKTtcbiAgICBsb2coXCJ3YXJuXCIsIFwiZmFpbGVkIHRvIGZldGNoIHR3ZWFrIHN0b3JlIHJlZ2lzdHJ5OlwiLCBlcnJvci5tZXNzYWdlKTtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBpbnN0YWxsU3RvcmVUd2VhayhlbnRyeTogVHdlYWtTdG9yZUVudHJ5KTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHVybCA9IHN0b3JlQXJjaGl2ZVVybChlbnRyeSk7XG4gIGNvbnN0IHdvcmsgPSBta2R0ZW1wU3luYyhqb2luKHRtcGRpcigpLCBcImNvZGV4cHAtc3RvcmUtdHdlYWstXCIpKTtcbiAgY29uc3QgYXJjaGl2ZSA9IGpvaW4od29yaywgXCJzb3VyY2UudGFyLmd6XCIpO1xuICBjb25zdCBleHRyYWN0RGlyID0gam9pbih3b3JrLCBcImV4dHJhY3RcIik7XG4gIGNvbnN0IHRhcmdldCA9IGpvaW4oVFdFQUtTX0RJUiwgZW50cnkuaWQpO1xuICBjb25zdCBzdGFnZWRUYXJnZXQgPSBqb2luKHdvcmssIFwic3RhZ2VkXCIsIGVudHJ5LmlkKTtcblxuICB0cnkge1xuICAgIGxvZyhcImluZm9cIiwgYGluc3RhbGxpbmcgc3RvcmUgdHdlYWsgJHtlbnRyeS5pZH0gZnJvbSAke2VudHJ5LnJlcG99QCR7ZW50cnkuYXBwcm92ZWRDb21taXRTaGF9YCk7XG4gICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICBoZWFkZXJzOiB7IFwiVXNlci1BZ2VudFwiOiBgY29kZXgtcGx1c3BsdXMvJHtDT0RFWF9QTFVTUExVU19WRVJTSU9OfWAgfSxcbiAgICAgIHJlZGlyZWN0OiBcImZvbGxvd1wiLFxuICAgIH0pO1xuICAgIGlmICghcmVzLm9rKSB0aHJvdyBuZXcgRXJyb3IoYGRvd25sb2FkIGZhaWxlZDogJHtyZXMuc3RhdHVzfWApO1xuICAgIGNvbnN0IGJ5dGVzID0gQnVmZmVyLmZyb20oYXdhaXQgcmVzLmFycmF5QnVmZmVyKCkpO1xuICAgIHdyaXRlRmlsZVN5bmMoYXJjaGl2ZSwgYnl0ZXMpO1xuICAgIG1rZGlyU3luYyhleHRyYWN0RGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICBleHRyYWN0VGFyQXJjaGl2ZShhcmNoaXZlLCBleHRyYWN0RGlyKTtcbiAgICBjb25zdCBzb3VyY2UgPSBmaW5kVHdlYWtSb290KGV4dHJhY3REaXIpO1xuICAgIGlmICghc291cmNlKSB0aHJvdyBuZXcgRXJyb3IoXCJkb3dubG9hZGVkIGFyY2hpdmUgZGlkIG5vdCBjb250YWluIG1hbmlmZXN0Lmpzb25cIik7XG4gICAgdmFsaWRhdGVTdG9yZVR3ZWFrU291cmNlKGVudHJ5LCBzb3VyY2UpO1xuICAgIHJtU3luYyhzdGFnZWRUYXJnZXQsIHsgcmVjdXJzaXZlOiB0cnVlLCBmb3JjZTogdHJ1ZSB9KTtcbiAgICBjb3B5VHdlYWtTb3VyY2Uoc291cmNlLCBzdGFnZWRUYXJnZXQpO1xuICAgIGNvbnN0IHN0YWdlZEZpbGVzID0gaGFzaFR3ZWFrU291cmNlKHN0YWdlZFRhcmdldCk7XG4gICAgd3JpdGVGaWxlU3luYyhcbiAgICAgIGpvaW4oc3RhZ2VkVGFyZ2V0LCBcIi5jb2RleHBwLXN0b3JlLmpzb25cIiksXG4gICAgICBKU09OLnN0cmluZ2lmeShcbiAgICAgICAge1xuICAgICAgICAgIHJlcG86IGVudHJ5LnJlcG8sXG4gICAgICAgICAgYXBwcm92ZWRDb21taXRTaGE6IGVudHJ5LmFwcHJvdmVkQ29tbWl0U2hhLFxuICAgICAgICAgIGluc3RhbGxlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgc3RvcmVJbmRleFVybDogVFdFQUtfU1RPUkVfSU5ERVhfVVJMLFxuICAgICAgICAgIGZpbGVzOiBzdGFnZWRGaWxlcyxcbiAgICAgICAgfSxcbiAgICAgICAgbnVsbCxcbiAgICAgICAgMixcbiAgICAgICksXG4gICAgKTtcbiAgICBhd2FpdCBhc3NlcnRTdG9yZVR3ZWFrQ2xlYW5Gb3JBdXRvVXBkYXRlKGVudHJ5LCB0YXJnZXQsIHdvcmspO1xuICAgIHJtU3luYyh0YXJnZXQsIHsgcmVjdXJzaXZlOiB0cnVlLCBmb3JjZTogdHJ1ZSB9KTtcbiAgICBjcFN5bmMoc3RhZ2VkVGFyZ2V0LCB0YXJnZXQsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICB9IGZpbmFsbHkge1xuICAgIHJtU3luYyh3b3JrLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgZm9yY2U6IHRydWUgfSk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcHJlcGFyZVR3ZWFrU3RvcmVTdWJtaXNzaW9uKHJlcG9JbnB1dDogc3RyaW5nKTogUHJvbWlzZTxUd2Vha1N0b3JlUHVibGlzaFN1Ym1pc3Npb24+IHtcbiAgY29uc3QgcmVwbyA9IG5vcm1hbGl6ZUdpdEh1YlJlcG8ocmVwb0lucHV0KTtcbiAgY29uc3QgcmVwb0luZm8gPSBhd2FpdCBmZXRjaEdpdGh1Ykpzb248eyBkZWZhdWx0X2JyYW5jaD86IHN0cmluZyB9PihgaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9yZXBvcy8ke3JlcG99YCk7XG4gIGNvbnN0IGRlZmF1bHRCcmFuY2ggPSByZXBvSW5mby5kZWZhdWx0X2JyYW5jaDtcbiAgaWYgKCFkZWZhdWx0QnJhbmNoKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCByZXNvbHZlIGRlZmF1bHQgYnJhbmNoIGZvciAke3JlcG99YCk7XG5cbiAgY29uc3QgY29tbWl0ID0gYXdhaXQgZmV0Y2hHaXRodWJKc29uPHtcbiAgICBzaGE/OiBzdHJpbmc7XG4gICAgaHRtbF91cmw/OiBzdHJpbmc7XG4gIH0+KGBodHRwczovL2FwaS5naXRodWIuY29tL3JlcG9zLyR7cmVwb30vY29tbWl0cy8ke2VuY29kZVVSSUNvbXBvbmVudChkZWZhdWx0QnJhbmNoKX1gKTtcbiAgaWYgKCFjb21taXQuc2hhKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCByZXNvbHZlIGN1cnJlbnQgY29tbWl0IGZvciAke3JlcG99YCk7XG5cbiAgY29uc3QgbWFuaWZlc3QgPSBhd2FpdCBmZXRjaE1hbmlmZXN0QXRDb21taXQocmVwbywgY29tbWl0LnNoYSkuY2F0Y2goKGUpID0+IHtcbiAgICBsb2coXCJ3YXJuXCIsIGBjb3VsZCBub3QgcmVhZCBtYW5pZmVzdCBmb3Igc3RvcmUgc3VibWlzc2lvbiAke3JlcG99QCR7Y29tbWl0LnNoYX06YCwgZSk7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICByZXBvLFxuICAgIGRlZmF1bHRCcmFuY2gsXG4gICAgY29tbWl0U2hhOiBjb21taXQuc2hhLFxuICAgIGNvbW1pdFVybDogY29tbWl0Lmh0bWxfdXJsID8/IGBodHRwczovL2dpdGh1Yi5jb20vJHtyZXBvfS9jb21taXQvJHtjb21taXQuc2hhfWAsXG4gICAgbWFuaWZlc3Q6IG1hbmlmZXN0XG4gICAgICA/IHtcbiAgICAgICAgICBpZDogdHlwZW9mIG1hbmlmZXN0LmlkID09PSBcInN0cmluZ1wiID8gbWFuaWZlc3QuaWQgOiB1bmRlZmluZWQsXG4gICAgICAgICAgbmFtZTogdHlwZW9mIG1hbmlmZXN0Lm5hbWUgPT09IFwic3RyaW5nXCIgPyBtYW5pZmVzdC5uYW1lIDogdW5kZWZpbmVkLFxuICAgICAgICAgIHZlcnNpb246IHR5cGVvZiBtYW5pZmVzdC52ZXJzaW9uID09PSBcInN0cmluZ1wiID8gbWFuaWZlc3QudmVyc2lvbiA6IHVuZGVmaW5lZCxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogdHlwZW9mIG1hbmlmZXN0LmRlc2NyaXB0aW9uID09PSBcInN0cmluZ1wiID8gbWFuaWZlc3QuZGVzY3JpcHRpb24gOiB1bmRlZmluZWQsXG4gICAgICAgICAgaWNvblVybDogdHlwZW9mIG1hbmlmZXN0Lmljb25VcmwgPT09IFwic3RyaW5nXCIgPyBtYW5pZmVzdC5pY29uVXJsIDogdW5kZWZpbmVkLFxuICAgICAgICB9XG4gICAgICA6IHVuZGVmaW5lZCxcbiAgfTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hHaXRodWJKc29uPFQ+KHVybDogc3RyaW5nKTogUHJvbWlzZTxUPiB7XG4gIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gIGNvbnN0IHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IGNvbnRyb2xsZXIuYWJvcnQoKSwgODAwMCk7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiQWNjZXB0XCI6IFwiYXBwbGljYXRpb24vdm5kLmdpdGh1Yitqc29uXCIsXG4gICAgICAgIFwiVXNlci1BZ2VudFwiOiBgY29kZXgtcGx1c3BsdXMvJHtDT0RFWF9QTFVTUExVU19WRVJTSU9OfWAsXG4gICAgICB9LFxuICAgICAgc2lnbmFsOiBjb250cm9sbGVyLnNpZ25hbCxcbiAgICB9KTtcbiAgICBpZiAoIXJlcy5vaykgdGhyb3cgbmV3IEVycm9yKGBHaXRIdWIgcmV0dXJuZWQgJHtyZXMuc3RhdHVzfWApO1xuICAgIHJldHVybiBhd2FpdCByZXMuanNvbigpIGFzIFQ7XG4gIH0gZmluYWxseSB7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZldGNoTWFuaWZlc3RBdENvbW1pdChyZXBvOiBzdHJpbmcsIGNvbW1pdFNoYTogc3RyaW5nKTogUHJvbWlzZTxQYXJ0aWFsPFR3ZWFrTWFuaWZlc3Q+PiB7XG4gIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKGBodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vJHtyZXBvfS8ke2NvbW1pdFNoYX0vbWFuaWZlc3QuanNvbmAsIHtcbiAgICBoZWFkZXJzOiB7XG4gICAgICBcIkFjY2VwdFwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgIFwiVXNlci1BZ2VudFwiOiBgY29kZXgtcGx1c3BsdXMvJHtDT0RFWF9QTFVTUExVU19WRVJTSU9OfWAsXG4gICAgfSxcbiAgfSk7XG4gIGlmICghcmVzLm9rKSB0aHJvdyBuZXcgRXJyb3IoYG1hbmlmZXN0IGZldGNoIHJldHVybmVkICR7cmVzLnN0YXR1c31gKTtcbiAgcmV0dXJuIGF3YWl0IHJlcy5qc29uKCkgYXMgUGFydGlhbDxUd2Vha01hbmlmZXN0Pjtcbn1cblxuZnVuY3Rpb24gZXh0cmFjdFRhckFyY2hpdmUoYXJjaGl2ZTogc3RyaW5nLCB0YXJnZXREaXI6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCByZXN1bHQgPSBzcGF3blN5bmMoXCJ0YXJcIiwgW1wiLXh6ZlwiLCBhcmNoaXZlLCBcIi1DXCIsIHRhcmdldERpcl0sIHtcbiAgICBlbmNvZGluZzogXCJ1dGY4XCIsXG4gICAgc3RkaW86IFtcImlnbm9yZVwiLCBcInBpcGVcIiwgXCJwaXBlXCJdLFxuICB9KTtcbiAgaWYgKHJlc3VsdC5zdGF0dXMgIT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYHRhciBleHRyYWN0aW9uIGZhaWxlZDogJHtyZXN1bHQuc3RkZXJyIHx8IHJlc3VsdC5zdGRvdXQgfHwgcmVzdWx0LnN0YXR1c31gKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZVN0b3JlVHdlYWtTb3VyY2UoZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSwgc291cmNlOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgbWFuaWZlc3RQYXRoID0gam9pbihzb3VyY2UsIFwibWFuaWZlc3QuanNvblwiKTtcbiAgY29uc3QgbWFuaWZlc3QgPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhtYW5pZmVzdFBhdGgsIFwidXRmOFwiKSkgYXMgVHdlYWtNYW5pZmVzdDtcbiAgaWYgKG1hbmlmZXN0LmlkICE9PSBlbnRyeS5tYW5pZmVzdC5pZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgZG93bmxvYWRlZCB0d2VhayBpZCAke21hbmlmZXN0LmlkfSBkb2VzIG5vdCBtYXRjaCBhcHByb3ZlZCBpZCAke2VudHJ5Lm1hbmlmZXN0LmlkfWApO1xuICB9XG4gIGlmIChtYW5pZmVzdC5naXRodWJSZXBvICE9PSBlbnRyeS5yZXBvKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBkb3dubG9hZGVkIHR3ZWFrIHJlcG8gJHttYW5pZmVzdC5naXRodWJSZXBvfSBkb2VzIG5vdCBtYXRjaCBhcHByb3ZlZCByZXBvICR7ZW50cnkucmVwb31gKTtcbiAgfVxuICBpZiAobWFuaWZlc3QudmVyc2lvbiAhPT0gZW50cnkubWFuaWZlc3QudmVyc2lvbikge1xuICAgIHRocm93IG5ldyBFcnJvcihgZG93bmxvYWRlZCB0d2VhayB2ZXJzaW9uICR7bWFuaWZlc3QudmVyc2lvbn0gZG9lcyBub3QgbWF0Y2ggYXBwcm92ZWQgdmVyc2lvbiAke2VudHJ5Lm1hbmlmZXN0LnZlcnNpb259YCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZmluZFR3ZWFrUm9vdChkaXI6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICBpZiAoIWV4aXN0c1N5bmMoZGlyKSkgcmV0dXJuIG51bGw7XG4gIGlmIChleGlzdHNTeW5jKGpvaW4oZGlyLCBcIm1hbmlmZXN0Lmpzb25cIikpKSByZXR1cm4gZGlyO1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgcmVhZGRpclN5bmMoZGlyKSkge1xuICAgIGNvbnN0IGNoaWxkID0gam9pbihkaXIsIG5hbWUpO1xuICAgIHRyeSB7XG4gICAgICBpZiAoIXN0YXRTeW5jKGNoaWxkKS5pc0RpcmVjdG9yeSgpKSBjb250aW51ZTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCBmb3VuZCA9IGZpbmRUd2Vha1Jvb3QoY2hpbGQpO1xuICAgIGlmIChmb3VuZCkgcmV0dXJuIGZvdW5kO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBjb3B5VHdlYWtTb3VyY2Uoc291cmNlOiBzdHJpbmcsIHRhcmdldDogc3RyaW5nKTogdm9pZCB7XG4gIGNwU3luYyhzb3VyY2UsIHRhcmdldCwge1xuICAgIHJlY3Vyc2l2ZTogdHJ1ZSxcbiAgICBmaWx0ZXI6IChzcmMpID0+ICEvKF58Wy9cXFxcXSkoPzpcXC5naXR8bm9kZV9tb2R1bGVzKSg/OlsvXFxcXF18JCkvLnRlc3Qoc3JjKSxcbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGFzc2VydFN0b3JlVHdlYWtDbGVhbkZvckF1dG9VcGRhdGUoXG4gIGVudHJ5OiBUd2Vha1N0b3JlRW50cnksXG4gIHRhcmdldDogc3RyaW5nLFxuICB3b3JrOiBzdHJpbmcsXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKCFleGlzdHNTeW5jKHRhcmdldCkpIHJldHVybjtcbiAgY29uc3QgbWV0YWRhdGEgPSByZWFkU3RvcmVJbnN0YWxsTWV0YWRhdGEodGFyZ2V0KTtcbiAgaWYgKCFtZXRhZGF0YSkgcmV0dXJuO1xuICBpZiAobWV0YWRhdGEucmVwbyAhPT0gZW50cnkucmVwbykge1xuICAgIHRocm93IG5ldyBTdG9yZVR3ZWFrTW9kaWZpZWRFcnJvcihlbnRyeS5tYW5pZmVzdC5uYW1lKTtcbiAgfVxuICBjb25zdCBjdXJyZW50RmlsZXMgPSBoYXNoVHdlYWtTb3VyY2UodGFyZ2V0KTtcbiAgY29uc3QgYmFzZWxpbmVGaWxlcyA9IG1ldGFkYXRhLmZpbGVzID8/IGF3YWl0IGZldGNoQmFzZWxpbmVTdG9yZVR3ZWFrSGFzaGVzKG1ldGFkYXRhLCB3b3JrKTtcbiAgaWYgKCFzYW1lRmlsZUhhc2hlcyhjdXJyZW50RmlsZXMsIGJhc2VsaW5lRmlsZXMpKSB7XG4gICAgdGhyb3cgbmV3IFN0b3JlVHdlYWtNb2RpZmllZEVycm9yKGVudHJ5Lm1hbmlmZXN0Lm5hbWUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlYWRTdG9yZUluc3RhbGxNZXRhZGF0YSh0YXJnZXQ6IHN0cmluZyk6IFN0b3JlSW5zdGFsbE1ldGFkYXRhIHwgbnVsbCB7XG4gIGNvbnN0IG1ldGFkYXRhUGF0aCA9IGpvaW4odGFyZ2V0LCBcIi5jb2RleHBwLXN0b3JlLmpzb25cIik7XG4gIGlmICghZXhpc3RzU3luYyhtZXRhZGF0YVBhdGgpKSByZXR1cm4gbnVsbDtcbiAgdHJ5IHtcbiAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhtZXRhZGF0YVBhdGgsIFwidXRmOFwiKSkgYXMgUGFydGlhbDxTdG9yZUluc3RhbGxNZXRhZGF0YT47XG4gICAgaWYgKHR5cGVvZiBwYXJzZWQucmVwbyAhPT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YgcGFyc2VkLmFwcHJvdmVkQ29tbWl0U2hhICE9PSBcInN0cmluZ1wiKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4ge1xuICAgICAgcmVwbzogcGFyc2VkLnJlcG8sXG4gICAgICBhcHByb3ZlZENvbW1pdFNoYTogcGFyc2VkLmFwcHJvdmVkQ29tbWl0U2hhLFxuICAgICAgaW5zdGFsbGVkQXQ6IHR5cGVvZiBwYXJzZWQuaW5zdGFsbGVkQXQgPT09IFwic3RyaW5nXCIgPyBwYXJzZWQuaW5zdGFsbGVkQXQgOiBcIlwiLFxuICAgICAgc3RvcmVJbmRleFVybDogdHlwZW9mIHBhcnNlZC5zdG9yZUluZGV4VXJsID09PSBcInN0cmluZ1wiID8gcGFyc2VkLnN0b3JlSW5kZXhVcmwgOiBcIlwiLFxuICAgICAgZmlsZXM6IGlzSGFzaFJlY29yZChwYXJzZWQuZmlsZXMpID8gcGFyc2VkLmZpbGVzIDogdW5kZWZpbmVkLFxuICAgIH07XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZldGNoQmFzZWxpbmVTdG9yZVR3ZWFrSGFzaGVzKFxuICBtZXRhZGF0YTogU3RvcmVJbnN0YWxsTWV0YWRhdGEsXG4gIHdvcms6IHN0cmluZyxcbik6IFByb21pc2U8UmVjb3JkPHN0cmluZywgc3RyaW5nPj4ge1xuICBjb25zdCBiYXNlbGluZURpciA9IGpvaW4od29yaywgXCJiYXNlbGluZVwiKTtcbiAgY29uc3QgYXJjaGl2ZSA9IGpvaW4od29yaywgXCJiYXNlbGluZS50YXIuZ3pcIik7XG4gIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKGBodHRwczovL2NvZGVsb2FkLmdpdGh1Yi5jb20vJHttZXRhZGF0YS5yZXBvfS90YXIuZ3ovJHttZXRhZGF0YS5hcHByb3ZlZENvbW1pdFNoYX1gLCB7XG4gICAgaGVhZGVyczogeyBcIlVzZXItQWdlbnRcIjogYGNvZGV4LXBsdXNwbHVzLyR7Q09ERVhfUExVU1BMVVNfVkVSU0lPTn1gIH0sXG4gICAgcmVkaXJlY3Q6IFwiZm9sbG93XCIsXG4gIH0pO1xuICBpZiAoIXJlcy5vaykgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgdmVyaWZ5IGxvY2FsIHR3ZWFrIGNoYW5nZXMgYmVmb3JlIHVwZGF0ZTogJHtyZXMuc3RhdHVzfWApO1xuICB3cml0ZUZpbGVTeW5jKGFyY2hpdmUsIEJ1ZmZlci5mcm9tKGF3YWl0IHJlcy5hcnJheUJ1ZmZlcigpKSk7XG4gIG1rZGlyU3luYyhiYXNlbGluZURpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gIGV4dHJhY3RUYXJBcmNoaXZlKGFyY2hpdmUsIGJhc2VsaW5lRGlyKTtcbiAgY29uc3Qgc291cmNlID0gZmluZFR3ZWFrUm9vdChiYXNlbGluZURpcik7XG4gIGlmICghc291cmNlKSB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3QgdmVyaWZ5IGxvY2FsIHR3ZWFrIGNoYW5nZXMgYmVmb3JlIHVwZGF0ZTogYmFzZWxpbmUgbWFuaWZlc3QgbWlzc2luZ1wiKTtcbiAgcmV0dXJuIGhhc2hUd2Vha1NvdXJjZShzb3VyY2UpO1xufVxuXG5mdW5jdGlvbiBoYXNoVHdlYWtTb3VyY2Uocm9vdDogc3RyaW5nKTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiB7XG4gIGNvbnN0IG91dDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICBjb2xsZWN0VHdlYWtGaWxlSGFzaGVzKHJvb3QsIHJvb3QsIG91dCk7XG4gIHJldHVybiBvdXQ7XG59XG5cbmZ1bmN0aW9uIGNvbGxlY3RUd2Vha0ZpbGVIYXNoZXMocm9vdDogc3RyaW5nLCBkaXI6IHN0cmluZywgb3V0OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KTogdm9pZCB7XG4gIGZvciAoY29uc3QgbmFtZSBvZiByZWFkZGlyU3luYyhkaXIpLnNvcnQoKSkge1xuICAgIGlmIChuYW1lID09PSBcIi5naXRcIiB8fCBuYW1lID09PSBcIm5vZGVfbW9kdWxlc1wiIHx8IG5hbWUgPT09IFwiLmNvZGV4cHAtc3RvcmUuanNvblwiKSBjb250aW51ZTtcbiAgICBjb25zdCBmdWxsID0gam9pbihkaXIsIG5hbWUpO1xuICAgIGNvbnN0IHJlbCA9IHJlbGF0aXZlKHJvb3QsIGZ1bGwpLnNwbGl0KFwiXFxcXFwiKS5qb2luKFwiL1wiKTtcbiAgICBjb25zdCBzdGF0ID0gc3RhdFN5bmMoZnVsbCk7XG4gICAgaWYgKHN0YXQuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgY29sbGVjdFR3ZWFrRmlsZUhhc2hlcyhyb290LCBmdWxsLCBvdXQpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmICghc3RhdC5pc0ZpbGUoKSkgY29udGludWU7XG4gICAgb3V0W3JlbF0gPSBjcmVhdGVIYXNoKFwic2hhMjU2XCIpLnVwZGF0ZShyZWFkRmlsZVN5bmMoZnVsbCkpLmRpZ2VzdChcImhleFwiKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzYW1lRmlsZUhhc2hlcyhhOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LCBiOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KTogYm9vbGVhbiB7XG4gIGNvbnN0IGFrID0gT2JqZWN0LmtleXMoYSkuc29ydCgpO1xuICBjb25zdCBiayA9IE9iamVjdC5rZXlzKGIpLnNvcnQoKTtcbiAgaWYgKGFrLmxlbmd0aCAhPT0gYmsubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYWsubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBrZXkgPSBha1tpXTtcbiAgICBpZiAoa2V5ICE9PSBia1tpXSB8fCBhW2tleV0gIT09IGJba2V5XSkgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBpc0hhc2hSZWNvcmQodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHtcbiAgaWYgKCF2YWx1ZSB8fCB0eXBlb2YgdmFsdWUgIT09IFwib2JqZWN0XCIgfHwgQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIE9iamVjdC52YWx1ZXModmFsdWUgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pLmV2ZXJ5KCh2KSA9PiB0eXBlb2YgdiA9PT0gXCJzdHJpbmdcIik7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVZlcnNpb24odjogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHYudHJpbSgpLnJlcGxhY2UoL152L2ksIFwiXCIpO1xufVxuXG5mdW5jdGlvbiBjb21wYXJlVmVyc2lvbnMoYTogc3RyaW5nLCBiOiBzdHJpbmcpOiBudW1iZXIge1xuICBjb25zdCBhdiA9IFZFUlNJT05fUkUuZXhlYyhhKTtcbiAgY29uc3QgYnYgPSBWRVJTSU9OX1JFLmV4ZWMoYik7XG4gIGlmICghYXYgfHwgIWJ2KSByZXR1cm4gMDtcbiAgZm9yIChsZXQgaSA9IDE7IGkgPD0gMzsgaSsrKSB7XG4gICAgY29uc3QgZGlmZiA9IE51bWJlcihhdltpXSkgLSBOdW1iZXIoYnZbaV0pO1xuICAgIGlmIChkaWZmICE9PSAwKSByZXR1cm4gZGlmZjtcbiAgfVxuICByZXR1cm4gMDtcbn1cblxuZnVuY3Rpb24gZmFsbGJhY2tTb3VyY2VSb290KCk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBjYW5kaWRhdGVzID0gW1xuICAgIGpvaW4oaG9tZWRpcigpLCBcIi5jb2RleC1wbHVzcGx1c1wiLCBcInNvdXJjZVwiKSxcbiAgICBqb2luKHVzZXJSb290ISwgXCJzb3VyY2VcIiksXG4gIF07XG4gIGZvciAoY29uc3QgY2FuZGlkYXRlIG9mIGNhbmRpZGF0ZXMpIHtcbiAgICBpZiAoZXhpc3RzU3luYyhqb2luKGNhbmRpZGF0ZSwgXCJwYWNrYWdlc1wiLCBcImluc3RhbGxlclwiLCBcImRpc3RcIiwgXCJjbGkuanNcIikpKSByZXR1cm4gY2FuZGlkYXRlO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBkZXNjcmliZUluc3RhbGxhdGlvblNvdXJjZShzb3VyY2VSb290OiBzdHJpbmcgfCBudWxsKTogSW5zdGFsbGF0aW9uU291cmNlIHtcbiAgaWYgKCFzb3VyY2VSb290KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGtpbmQ6IFwidW5rbm93blwiLFxuICAgICAgbGFiZWw6IFwiVW5rbm93blwiLFxuICAgICAgZGV0YWlsOiBcIkNvZGV4Kysgc291cmNlIGxvY2F0aW9uIGlzIG5vdCByZWNvcmRlZCB5ZXQuXCIsXG4gICAgfTtcbiAgfVxuICBjb25zdCBub3JtYWxpemVkID0gc291cmNlUm9vdC5yZXBsYWNlKC9cXFxcL2csIFwiL1wiKTtcbiAgaWYgKC9cXC8oPzpIb21lYnJld3xob21lYnJldylcXC9DZWxsYXJcXC9jb2RleHBsdXNwbHVzXFwvLy50ZXN0KG5vcm1hbGl6ZWQpKSB7XG4gICAgcmV0dXJuIHsga2luZDogXCJob21lYnJld1wiLCBsYWJlbDogXCJIb21lYnJld1wiLCBkZXRhaWw6IHNvdXJjZVJvb3QgfTtcbiAgfVxuICBpZiAoZXhpc3RzU3luYyhqb2luKHNvdXJjZVJvb3QsIFwiLmdpdFwiKSkpIHtcbiAgICByZXR1cm4geyBraW5kOiBcImxvY2FsLWRldlwiLCBsYWJlbDogXCJMb2NhbCBkZXZlbG9wbWVudCBjaGVja291dFwiLCBkZXRhaWw6IHNvdXJjZVJvb3QgfTtcbiAgfVxuICBpZiAobm9ybWFsaXplZC5lbmRzV2l0aChcIi8uY29kZXgtcGx1c3BsdXMvc291cmNlXCIpIHx8IG5vcm1hbGl6ZWQuaW5jbHVkZXMoXCIvLmNvZGV4LXBsdXNwbHVzL3NvdXJjZS9cIikpIHtcbiAgICByZXR1cm4geyBraW5kOiBcImdpdGh1Yi1zb3VyY2VcIiwgbGFiZWw6IFwiR2l0SHViIHNvdXJjZSBpbnN0YWxsZXJcIiwgZGV0YWlsOiBzb3VyY2VSb290IH07XG4gIH1cbiAgaWYgKGV4aXN0c1N5bmMoam9pbihzb3VyY2VSb290LCBcInBhY2thZ2UuanNvblwiKSkpIHtcbiAgICByZXR1cm4geyBraW5kOiBcInNvdXJjZS1hcmNoaXZlXCIsIGxhYmVsOiBcIlNvdXJjZSBhcmNoaXZlXCIsIGRldGFpbDogc291cmNlUm9vdCB9O1xuICB9XG4gIHJldHVybiB7IGtpbmQ6IFwidW5rbm93blwiLCBsYWJlbDogXCJVbmtub3duXCIsIGRldGFpbDogc291cmNlUm9vdCB9O1xufVxuXG5mdW5jdGlvbiBzdGFydEluc3RhbGxlZENsaShjbGk6IHN0cmluZywgYXJnczogc3RyaW5nW10pOiB2b2lkIHtcbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09IFwiZGFyd2luXCIgJiYgc3RhcnRJbnN0YWxsZWRDbGlXaXRoTGF1bmNoZChjbGksIGFyZ3MpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGNoaWxkID0gc3Bhd24ocHJvY2Vzcy5leGVjUGF0aCwgW2NsaSwgLi4uYXJnc10sIHtcbiAgICBjd2Q6IHJlc29sdmUoZGlybmFtZShjbGkpLCBcIi4uXCIsIFwiLi5cIiwgXCIuLlwiKSxcbiAgICBlbnY6IHsgLi4ucHJvY2Vzcy5lbnYsIENPREVYX1BMVVNQTFVTX01BTlVBTF9VUERBVEU6IFwiMVwiIH0sXG4gICAgZGV0YWNoZWQ6IHRydWUsXG4gICAgc3RkaW86IFwiaWdub3JlXCIsXG4gIH0pO1xuICBjaGlsZC51bnJlZigpO1xufVxuXG5mdW5jdGlvbiBzdGFydEluc3RhbGxlZENsaVdpdGhMYXVuY2hkKGNsaTogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXSk6IGJvb2xlYW4ge1xuICBjb25zdCBsYWJlbCA9IGBjb20uY29kZXhwbHVzcGx1cy5wYXRjaC1oZWxwZXIuJHtwcm9jZXNzLnBpZH0uJHtEYXRlLm5vdygpfWA7XG4gIGNvbnN0IGNsZWFudXAgPSBgbGF1bmNoY3RsIHJlbW92ZSAke2xhYmVsfSA+L2Rldi9udWxsIDI+JjEgfHwgbGF1bmNoY3RsIGJvb3RvdXQgZ3VpLyQoaWQgLXUpLyR7bGFiZWx9ID4vZGV2L251bGwgMj4mMSB8fCB0cnVlYDtcbiAgY29uc3QgY29tbWFuZCA9IFtcbiAgICBgdHJhcCAke3NoZWxsUXVvdGUoY2xlYW51cCl9IEVYSVRgLFxuICAgIGBjZCAke3NoZWxsUXVvdGUocmVzb2x2ZShkaXJuYW1lKGNsaSksIFwiLi5cIiwgXCIuLlwiLCBcIi4uXCIpKX1gLFxuICAgIGBDT0RFWF9QTFVTUExVU19NQU5VQUxfVVBEQVRFPTEgJHtbcHJvY2Vzcy5leGVjUGF0aCwgY2xpLCAuLi5hcmdzXS5tYXAoc2hlbGxRdW90ZSkuam9pbihcIiBcIil9YCxcbiAgXS5qb2luKFwiICYmIFwiKTtcbiAgY29uc3QgcmVzdWx0ID0gc3Bhd25TeW5jKFxuICAgIFwibGF1bmNoY3RsXCIsXG4gICAgW1xuICAgICAgXCJzdWJtaXRcIixcbiAgICAgIFwiLWxcIixcbiAgICAgIGxhYmVsLFxuICAgICAgXCItLVwiLFxuICAgICAgXCIvYmluL3NoXCIsXG4gICAgICBcIi1jXCIsXG4gICAgICBgJHtjb21tYW5kfSB8fCB0cnVlYCxcbiAgICBdLFxuICAgIHtcbiAgICAgIGVuY29kaW5nOiBcInV0ZjhcIixcbiAgICAgIHN0ZGlvOiBcImlnbm9yZVwiLFxuICAgIH0sXG4gICk7XG4gIGlmIChyZXN1bHQuc3RhdHVzID09PSAwKSByZXR1cm4gdHJ1ZTtcbiAgbG9nKFwid2FyblwiLCBgbGF1bmNoY3RsIHN1Ym1pdCBmYWlsZWQgZm9yIENvZGV4KysgcGF0Y2ggaGVscGVyOiAke3Jlc3VsdC5lcnJvcj8ubWVzc2FnZSA/PyByZXN1bHQuc3RhdHVzfWApO1xuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHNoZWxsUXVvdGUodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgJyR7dmFsdWUucmVwbGFjZSgvJy9nLCBgJ1xcXFwnJ2ApfSdgO1xufVxuXG5mdW5jdGlvbiBtYXJrU2VsZlVwZGF0ZVN0YXJ0ZWQoc291cmNlUm9vdDogc3RyaW5nKTogU2VsZlVwZGF0ZVN0YXRlIHtcbiAgY29uc3QgY29uZmlnID0gcmVhZFN0YXRlKCkuY29kZXhQbHVzUGx1cztcbiAgY29uc3QgY2hhbm5lbCA9IGNvbmZpZz8udXBkYXRlQ2hhbm5lbCA/PyBcInN0YWJsZVwiO1xuICBjb25zdCBzdGF0ZTogU2VsZlVwZGF0ZVN0YXRlID0ge1xuICAgIGNoZWNrZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIHN0YXR1czogXCJjaGVja2luZ1wiLFxuICAgIGN1cnJlbnRWZXJzaW9uOiBDT0RFWF9QTFVTUExVU19WRVJTSU9OLFxuICAgIGxhdGVzdFZlcnNpb246IG51bGwsXG4gICAgdGFyZ2V0UmVmOiBjb25maWc/LnVwZGF0ZUNoYW5uZWwgPT09IFwiY3VzdG9tXCIgPyBjb25maWcudXBkYXRlUmVmID8/IG51bGwgOiBudWxsLFxuICAgIHJlbGVhc2VVcmw6IG51bGwsXG4gICAgcmVwbzogY29uZmlnPy51cGRhdGVSZXBvID8/IENPREVYX1BMVVNQTFVTX1JFUE8sXG4gICAgY2hhbm5lbCxcbiAgICBzb3VyY2VSb290LFxuICAgIGluc3RhbGxhdGlvblNvdXJjZTogZGVzY3JpYmVJbnN0YWxsYXRpb25Tb3VyY2Uoc291cmNlUm9vdCksXG4gIH07XG4gIHdyaXRlU2VsZlVwZGF0ZVN0YXRlKHN0YXRlKTtcbiAgcmV0dXJuIHN0YXRlO1xufVxuXG5mdW5jdGlvbiBicm9hZGNhc3RSZWxvYWQoKTogdm9pZCB7XG4gIGNvbnN0IHBheWxvYWQgPSB7XG4gICAgYXQ6IERhdGUubm93KCksXG4gICAgdHdlYWtzOiB0d2Vha1N0YXRlLmRpc2NvdmVyZWQubWFwKCh0KSA9PiB0Lm1hbmlmZXN0LmlkKSxcbiAgfTtcbiAgZm9yIChjb25zdCB3YyBvZiB3ZWJDb250ZW50cy5nZXRBbGxXZWJDb250ZW50cygpKSB7XG4gICAgdHJ5IHtcbiAgICAgIHdjLnNlbmQoXCJjb2RleHBwOnR3ZWFrcy1jaGFuZ2VkXCIsIHBheWxvYWQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZyhcIndhcm5cIiwgXCJicm9hZGNhc3Qgc2VuZCBmYWlsZWQ6XCIsIGUpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBtYWtlTG9nZ2VyKHNjb3BlOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHtcbiAgICBkZWJ1ZzogKC4uLmE6IHVua25vd25bXSkgPT4gbG9nKFwiaW5mb1wiLCBgWyR7c2NvcGV9XWAsIC4uLmEpLFxuICAgIGluZm86ICguLi5hOiB1bmtub3duW10pID0+IGxvZyhcImluZm9cIiwgYFske3Njb3BlfV1gLCAuLi5hKSxcbiAgICB3YXJuOiAoLi4uYTogdW5rbm93bltdKSA9PiBsb2coXCJ3YXJuXCIsIGBbJHtzY29wZX1dYCwgLi4uYSksXG4gICAgZXJyb3I6ICguLi5hOiB1bmtub3duW10pID0+IGxvZyhcImVycm9yXCIsIGBbJHtzY29wZX1dYCwgLi4uYSksXG4gIH07XG59XG5cbmZ1bmN0aW9uIG1ha2VNYWluSXBjKGlkOiBzdHJpbmcpIHtcbiAgY29uc3QgY2ggPSAoYzogc3RyaW5nKSA9PiBgY29kZXhwcDoke2lkfToke2N9YDtcbiAgcmV0dXJuIHtcbiAgICBvbjogKGM6IHN0cmluZywgaDogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCkgPT4ge1xuICAgICAgY29uc3Qgd3JhcHBlZCA9IChfZTogdW5rbm93biwgLi4uYXJnczogdW5rbm93bltdKSA9PiBoKC4uLmFyZ3MpO1xuICAgICAgaXBjTWFpbi5vbihjaChjKSwgd3JhcHBlZCk7XG4gICAgICByZXR1cm4gKCkgPT4gaXBjTWFpbi5yZW1vdmVMaXN0ZW5lcihjaChjKSwgd3JhcHBlZCBhcyBuZXZlcik7XG4gICAgfSxcbiAgICBzZW5kOiAoX2M6IHN0cmluZykgPT4ge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaXBjLnNlbmQgaXMgcmVuZGVyZXJcdTIxOTJtYWluOyBtYWluIHNpZGUgdXNlcyBoYW5kbGUvb25cIik7XG4gICAgfSxcbiAgICBpbnZva2U6IChfYzogc3RyaW5nKSA9PiB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpcGMuaW52b2tlIGlzIHJlbmRlcmVyXHUyMTkybWFpbjsgbWFpbiBzaWRlIHVzZXMgaGFuZGxlXCIpO1xuICAgIH0sXG4gICAgaGFuZGxlOiAoYzogc3RyaW5nLCBoYW5kbGVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB1bmtub3duKSA9PiB7XG4gICAgICBpcGNNYWluLmhhbmRsZShjaChjKSwgKF9lOiB1bmtub3duLCAuLi5hcmdzOiB1bmtub3duW10pID0+IGhhbmRsZXIoLi4uYXJncykpO1xuICAgIH0sXG4gIH07XG59XG5cbmZ1bmN0aW9uIG1ha2VNYWluRnMoaWQ6IHN0cmluZykge1xuICBjb25zdCBkaXIgPSBqb2luKHVzZXJSb290ISwgXCJ0d2Vhay1kYXRhXCIsIGlkKTtcbiAgbWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gIGNvbnN0IGZzID0gcmVxdWlyZShcIm5vZGU6ZnMvcHJvbWlzZXNcIikgYXMgdHlwZW9mIGltcG9ydChcIm5vZGU6ZnMvcHJvbWlzZXNcIik7XG4gIHJldHVybiB7XG4gICAgZGF0YURpcjogZGlyLFxuICAgIHJlYWQ6IChwOiBzdHJpbmcpID0+IGZzLnJlYWRGaWxlKGpvaW4oZGlyLCBwKSwgXCJ1dGY4XCIpLFxuICAgIHdyaXRlOiAocDogc3RyaW5nLCBjOiBzdHJpbmcpID0+IGZzLndyaXRlRmlsZShqb2luKGRpciwgcCksIGMsIFwidXRmOFwiKSxcbiAgICBleGlzdHM6IGFzeW5jIChwOiBzdHJpbmcpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGZzLmFjY2Vzcyhqb2luKGRpciwgcCkpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gY3VycmVudFJ1bnRpbWVJbmZvKCk6IENvZGV4UnVudGltZUluZm8ge1xuICBjb25zdCBpbnN0YWxsZXJTdGF0ZSA9IHJlYWRJbnN0YWxsZXJTdGF0ZSgpO1xuICByZXR1cm4gZ2V0UnVudGltZUluZm8oe1xuICAgIHVzZXJSb290OiB1c2VyUm9vdCEsXG4gICAgcnVudGltZURpcjogcnVudGltZURpciEsXG4gICAgY29kZXhWZXJzaW9uOiBpbnN0YWxsZXJTdGF0ZT8uY29kZXhWZXJzaW9uID8/IG51bGwsXG4gICAgY2hhbm5lbDogbnVsbCxcbiAgICBnZXRXaW5kb3dTZXJ2aWNlczogZ2V0Q29kZXhXaW5kb3dTZXJ2aWNlcyxcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGN1cnJlbnRSdW50aW1lQ2FwYWJpbGl0aWVzKCk6IENvZGV4UnVudGltZUNhcGFiaWxpdGllcyB7XG4gIGNvbnN0IGluc3RhbGxlclN0YXRlID0gcmVhZEluc3RhbGxlclN0YXRlKCk7XG4gIHJldHVybiBnZXRSdW50aW1lQ2FwYWJpbGl0aWVzKHtcbiAgICB1c2VyUm9vdDogdXNlclJvb3QhLFxuICAgIHJ1bnRpbWVEaXI6IHJ1bnRpbWVEaXIhLFxuICAgIGNvZGV4VmVyc2lvbjogaW5zdGFsbGVyU3RhdGU/LmNvZGV4VmVyc2lvbiA/PyBudWxsLFxuICAgIGNoYW5uZWw6IG51bGwsXG4gICAgZ2V0V2luZG93U2VydmljZXM6IGdldENvZGV4V2luZG93U2VydmljZXMsXG4gICAgZ2V0TmF0aXZlQ2FwYWJpbGl0aWVzOiAoKSA9PiBuYXRpdmVCcmlkZ2UuZ2V0Q2FwYWJpbGl0aWVzKCksXG4gICAgZ2V0Vmlld0NhcGFiaWxpdGllczogKCkgPT4gZ2V0T3dsVmlld0NhcGFiaWxpdGllcygpLFxuICB9KTtcbn1cblxuZnVuY3Rpb24gdHdlYWtDb250ZXh0KHR3ZWFrSWQ6IHN0cmluZywgcGVybWlzc2lvbj86IFR3ZWFrUGVybWlzc2lvbik6IE5hdGl2ZVR3ZWFrQ29udGV4dCB7XG4gIGNvbnN0IHR3ZWFrID0gcGVybWlzc2lvblxuICAgID8gYXNzZXJ0VHdlYWtQZXJtaXNzaW9uRm9ySWQodHdlYWtJZCwgcGVybWlzc2lvbilcbiAgICA6IHR3ZWFrQnlJZCh0d2Vha0lkKTtcbiAgcmV0dXJuIHsgaWQ6IHR3ZWFrLm1hbmlmZXN0LmlkLCBkaXI6IHR3ZWFrLmRpciB9O1xufVxuXG5mdW5jdGlvbiB0d2Vha0J5SWQodHdlYWtJZDogc3RyaW5nKTogRGlzY292ZXJlZFR3ZWFrIHtcbiAgYXNzZXJ0VHdlYWtJZCh0d2Vha0lkKTtcbiAgY29uc3QgdHdlYWsgPSB0d2Vha1N0YXRlLmRpc2NvdmVyZWQuZmluZCgoaXRlbSkgPT4gaXRlbS5tYW5pZmVzdC5pZCA9PT0gdHdlYWtJZCk7XG4gIGlmICghdHdlYWspIHRocm93IG5ldyBFcnJvcihgdW5rbm93biB0d2VhazogJHt0d2Vha0lkfWApO1xuICBpZiAoIWlzVHdlYWtFbmFibGVkKHR3ZWFrSWQpKSB0aHJvdyBuZXcgRXJyb3IoYHR3ZWFrIGlzIGRpc2FibGVkOiAke3R3ZWFrSWR9YCk7XG4gIHJldHVybiB0d2Vhaztcbn1cblxuZnVuY3Rpb24gYXNzZXJ0VHdlYWtQZXJtaXNzaW9uRm9ySWQodHdlYWtJZDogc3RyaW5nLCBwZXJtaXNzaW9uOiBUd2Vha1Blcm1pc3Npb24pOiBEaXNjb3ZlcmVkVHdlYWsge1xuICBjb25zdCB0d2VhayA9IHR3ZWFrQnlJZCh0d2Vha0lkKTtcbiAgYXNzZXJ0VHdlYWtQZXJtaXNzaW9uKHR3ZWFrLCBwZXJtaXNzaW9uKTtcbiAgcmV0dXJuIHR3ZWFrO1xufVxuXG5mdW5jdGlvbiBhc3NlcnRUd2Vha1ZpZXdQZXJtaXNzaW9uRm9ySWQodHdlYWtJZDogc3RyaW5nKTogRGlzY292ZXJlZFR3ZWFrIHtcbiAgY29uc3QgdHdlYWsgPSB0d2Vha0J5SWQodHdlYWtJZCk7XG4gIGFzc2VydFR3ZWFrVmlld1Blcm1pc3Npb24odHdlYWspO1xuICByZXR1cm4gdHdlYWs7XG59XG5cbmZ1bmN0aW9uIGFzc2VydFR3ZWFrUGVybWlzc2lvbih0d2VhazogRGlzY292ZXJlZFR3ZWFrLCBwZXJtaXNzaW9uOiBUd2Vha1Blcm1pc3Npb24pOiB2b2lkIHtcbiAgaWYgKHR3ZWFrLm1hbmlmZXN0LnBlcm1pc3Npb25zPy5pbmNsdWRlcyhwZXJtaXNzaW9uKSkgcmV0dXJuO1xuICB0aHJvdyBuZXcgRXJyb3IoYHR3ZWFrICR7dHdlYWsubWFuaWZlc3QuaWR9IG11c3QgZGVjbGFyZSAke3Blcm1pc3Npb259IHBlcm1pc3Npb25gKTtcbn1cblxuZnVuY3Rpb24gYXNzZXJ0VHdlYWtWaWV3UGVybWlzc2lvbih0d2VhazogRGlzY292ZXJlZFR3ZWFrKTogdm9pZCB7XG4gIGlmIChcbiAgICB0d2Vhay5tYW5pZmVzdC5wZXJtaXNzaW9ucz8uaW5jbHVkZXMoXCJjb2RleC12aWV3c1wiKSB8fFxuICAgIHR3ZWFrLm1hbmlmZXN0LnBlcm1pc3Npb25zPy5pbmNsdWRlcyhcImNvZGV4LnZpZXdzXCIpXG4gICkge1xuICAgIHJldHVybjtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoYHR3ZWFrICR7dHdlYWsubWFuaWZlc3QuaWR9IG11c3QgZGVjbGFyZSBjb2RleC12aWV3cyBwZXJtaXNzaW9uYCk7XG59XG5cbmZ1bmN0aW9uIGFzc2VydFR3ZWFrSWQodHdlYWtJZDogc3RyaW5nKTogdm9pZCB7XG4gIGlmICghL15bYS16QS1aMC05Ll8tXSskLy50ZXN0KHR3ZWFrSWQpKSB0aHJvdyBuZXcgRXJyb3IoXCJiYWQgdHdlYWsgaWRcIik7XG59XG5cbmZ1bmN0aW9uIGdldFByaW1hcnlDb2RleFdpbmRvdygpOiBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbCB7XG4gIGNvbnN0IHNlcnZpY2VzID0gZ2V0Q29kZXhXaW5kb3dTZXJ2aWNlcygpO1xuICBjb25zdCBmcm9tU2VydmljZXMgPSB0eXBlb2Ygc2VydmljZXM/LmdldFByaW1hcnlXaW5kb3cgPT09IFwiZnVuY3Rpb25cIlxuICAgID8gc2VydmljZXMuZ2V0UHJpbWFyeVdpbmRvdyhcImxvY2FsXCIpXG4gICAgOiBudWxsO1xuICBpZiAoZnJvbVNlcnZpY2VzICYmICFmcm9tU2VydmljZXMuaXNEZXN0cm95ZWQoKSkgcmV0dXJuIGZyb21TZXJ2aWNlcztcbiAgY29uc3QgZnJvbU1hbmFnZXIgPSB0eXBlb2Ygc2VydmljZXM/LndpbmRvd01hbmFnZXI/LmdldFByaW1hcnlXaW5kb3cgPT09IFwiZnVuY3Rpb25cIlxuICAgID8gc2VydmljZXMud2luZG93TWFuYWdlci5nZXRQcmltYXJ5V2luZG93LmNhbGwoc2VydmljZXMud2luZG93TWFuYWdlcilcbiAgICA6IG51bGw7XG4gIGlmIChmcm9tTWFuYWdlciAmJiAhZnJvbU1hbmFnZXIuaXNEZXN0cm95ZWQoKSkgcmV0dXJuIGZyb21NYW5hZ2VyO1xuICBjb25zdCBmb2N1c2VkID0gQnJvd3NlcldpbmRvdy5nZXRGb2N1c2VkV2luZG93KCk7XG4gIGlmIChmb2N1c2VkICYmICFmb2N1c2VkLmlzRGVzdHJveWVkKCkpIHJldHVybiBmb2N1c2VkO1xuICByZXR1cm4gQnJvd3NlcldpbmRvdy5nZXRBbGxXaW5kb3dzKCkuZmluZCgod2luKSA9PiAhd2luLmlzRGVzdHJveWVkKCkpID8/IG51bGw7XG59XG5cbmZ1bmN0aW9uIGdldFByaW1hcnlDb2RleFdpbmRvd1JlZigpOiBDb2RleFdpbmRvd1JlZiB8IG51bGwge1xuICBjb25zdCB3aW4gPSBnZXRQcmltYXJ5Q29kZXhXaW5kb3coKTtcbiAgaWYgKCF3aW4gfHwgd2luLmlzRGVzdHJveWVkKCkpIHJldHVybiBudWxsO1xuICByZXR1cm4geyB3aW5kb3dJZDogd2luLmlkLCB3ZWJDb250ZW50c0lkOiB3aW4ud2ViQ29udGVudHMuaWQgfTtcbn1cblxuZnVuY3Rpb24gZm9jdXNDb2RleFdpbmRvdyh3aW5kb3dJZDogbnVtYmVyKTogYm9vbGVhbiB7XG4gIGNvbnN0IHdpbiA9IEJyb3dzZXJXaW5kb3cuZnJvbUlkKHdpbmRvd0lkKTtcbiAgaWYgKCF3aW4gfHwgd2luLmlzRGVzdHJveWVkKCkpIHJldHVybiBmYWxzZTtcbiAgaWYgKHdpbi5pc01pbmltaXplZCgpKSB3aW4ucmVzdG9yZSgpO1xuICB3aW4uc2hvdygpO1xuICB3aW4uZm9jdXMoKTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHNob3dDb2RleFdpbmRvdyh3aW5kb3dJZDogbnVtYmVyKTogYm9vbGVhbiB7XG4gIGNvbnN0IHdpbiA9IEJyb3dzZXJXaW5kb3cuZnJvbUlkKHdpbmRvd0lkKTtcbiAgaWYgKCF3aW4gfHwgd2luLmlzRGVzdHJveWVkKCkpIHJldHVybiBmYWxzZTtcbiAgd2luLnNob3coKTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGdldE93bFZpZXdDYXBhYmlsaXRpZXMoKTogQ29kZXhSdW50aW1lQ2FwYWJpbGl0aWVzW1widmlld3NcIl0ge1xuICBjb25zdCBwYXJlbnQgPSBnZXRQcmltYXJ5Q29kZXhXaW5kb3coKSA/PyBCcm93c2VyV2luZG93LmdldEZvY3VzZWRXaW5kb3coKTtcbiAgY29uc3QgY29udGVudFZpZXcgPSBhc1JlY29yZChwYXJlbnQpPy5jb250ZW50VmlldztcbiAgbGV0IHNhbXBsZVZpZXc6IEVsZWN0cm9uLkJyb3dzZXJWaWV3IHwgbnVsbCA9IG51bGw7XG4gIHRyeSB7XG4gICAgc2FtcGxlVmlldyA9IG5ldyBCcm93c2VyVmlldyh7IHdlYlByZWZlcmVuY2VzOiB7IHNhbmRib3g6IHRydWUgfSB9KTtcbiAgfSBjYXRjaCB7fVxuICBjb25zdCB3ZWJDb250ZW50c1ZpZXcgPSBhc1JlY29yZChzYW1wbGVWaWV3KT8ud2ViQ29udGVudHNWaWV3O1xuICBjb25zdCBwcml2YXRlVmlld1RyZWUgPSB0eXBlb2YgYXNSZWNvcmQoY29udGVudFZpZXcpPy5hZGRDaGlsZFZpZXcgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgIHR5cGVvZiBhc1JlY29yZChjb250ZW50Vmlldyk/LnJlbW92ZUNoaWxkVmlldyA9PT0gXCJmdW5jdGlvblwiO1xuICBjb25zdCB3ZWJDb250ZW50c1ZpZXdBdmFpbGFibGUgPSBCb29sZWFuKHdlYkNvbnRlbnRzVmlldykgJiZcbiAgICB0eXBlb2YgYXNSZWNvcmQod2ViQ29udGVudHNWaWV3KT8uc2V0Qm91bmRzID09PSBcImZ1bmN0aW9uXCI7XG4gIGNvbnN0IHByaXZhdGVBdHRhY2ggPSBwcml2YXRlVmlld1RyZWUgJiYgd2ViQ29udGVudHNWaWV3QXZhaWxhYmxlO1xuICBjb25zdCBicm93c2VyVmlld0ZhbGxiYWNrID0gdHlwZW9mIGFzUmVjb3JkKHBhcmVudCk/LmFkZEJyb3dzZXJWaWV3ID09PSBcImZ1bmN0aW9uXCI7XG4gIHRyeSB7XG4gICAgaWYgKHNhbXBsZVZpZXcgJiYgIXNhbXBsZVZpZXcud2ViQ29udGVudHMuaXNEZXN0cm95ZWQoKSkge1xuICAgICAgc2FtcGxlVmlldy53ZWJDb250ZW50cy5jbG9zZSh7IHdhaXRGb3JCZWZvcmVVbmxvYWQ6IGZhbHNlIH0pO1xuICAgIH1cbiAgfSBjYXRjaCB7fVxuICByZXR1cm4ge1xuICAgIGNyZWF0ZTogcHJpdmF0ZUF0dGFjaCB8fCBicm93c2VyVmlld0ZhbGxiYWNrLFxuICAgIHByaXZhdGVWaWV3VHJlZTogcHJpdmF0ZUF0dGFjaCxcbiAgICB3ZWJDb250ZW50c1ZpZXc6IHdlYkNvbnRlbnRzVmlld0F2YWlsYWJsZSxcbiAgICBicm93c2VyVmlld0ZhbGxiYWNrLFxuICB9O1xufVxuXG5hc3luYyBmdW5jdGlvbiBjcmVhdGVPd2xWaWV3KFxuICBjdHg6IE5hdGl2ZVR3ZWFrQ29udGV4dCxcbiAgb3B0czogQ29kZXhWaWV3Q3JlYXRlT3B0aW9ucyxcbik6IFByb21pc2U8Q29kZXhWaWV3UmVmPiB7XG4gIGNvbnN0IGlkID0gYXNzZXJ0QnJpZGdlSWQob3B0cy5pZCA/PyByYW5kb21VVUlEKCksIFwiQ29kZXggdmlldyBpZFwiKTtcbiAgY29uc3Qga2V5ID0gb3dsVmlld0tleShjdHguaWQsIGlkKTtcbiAgaWYgKG93bFZpZXdzLmhhcyhrZXkpKSB0aHJvdyBuZXcgRXJyb3IoYENvZGV4IHZpZXcgYWxyZWFkeSBleGlzdHM6ICR7Y3R4LmlkfToke2lkfWApO1xuXG4gIGNvbnN0IHBhcmVudCA9IHR5cGVvZiBvcHRzLnBhcmVudFdpbmRvd0lkID09PSBcIm51bWJlclwiXG4gICAgPyBCcm93c2VyV2luZG93LmZyb21JZChvcHRzLnBhcmVudFdpbmRvd0lkKVxuICAgIDogZ2V0UHJpbWFyeUNvZGV4V2luZG93KCk7XG4gIGlmICghcGFyZW50IHx8IGlzV2luZG93RGVzdHJveWVkKHBhcmVudCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb2RleCB2aWV3IG5lZWRzIGFuIGFjdGl2ZSBwYXJlbnQgd2luZG93XCIpO1xuICB9XG5cbiAgY29uc3Qgc2VydmljZXMgPSBnZXRDb2RleFdpbmRvd1NlcnZpY2VzKCk7XG4gIGNvbnN0IHdpbmRvd01hbmFnZXIgPSBzZXJ2aWNlcz8ud2luZG93TWFuYWdlcjtcbiAgY29uc3Qgcm91dGUgPSBvcHRzLnJvdXRlID09PSB1bmRlZmluZWQgPyBudWxsIDogbm9ybWFsaXplQ29kZXhSb3V0ZShvcHRzLnJvdXRlKTtcbiAgY29uc3QgaG9zdElkID0gb3B0cy5ob3N0SWQgfHwgXCJsb2NhbFwiO1xuICBjb25zdCB2aWV3ID0gbmV3IEJyb3dzZXJWaWV3KHtcbiAgICB3ZWJQcmVmZXJlbmNlczoge1xuICAgICAgcHJlbG9hZDogb3B0cy5yZWdpc3RlcldpdGhDb2RleCA9PT0gZmFsc2UgPyB1bmRlZmluZWQgOiB3aW5kb3dNYW5hZ2VyPy5vcHRpb25zPy5wcmVsb2FkUGF0aCxcbiAgICAgIGNvbnRleHRJc29sYXRpb246IHRydWUsXG4gICAgICBub2RlSW50ZWdyYXRpb246IGZhbHNlLFxuICAgICAgc3BlbGxjaGVjazogZmFsc2UsXG4gICAgICBkZXZUb29sczogd2luZG93TWFuYWdlcj8ub3B0aW9ucz8uYWxsb3dEZXZ0b29scyxcbiAgICB9LFxuICB9KTtcblxuICBpZiAob3B0cy5iYWNrZ3JvdW5kQ29sb3IpIHtcbiAgICBjYWxsT2JqZWN0TWV0aG9kKHZpZXcsIFwic2V0QmFja2dyb3VuZENvbG9yXCIsIFtvcHRzLmJhY2tncm91bmRDb2xvcl0pO1xuICAgIGNhbGxPYmplY3RNZXRob2QoYXNSZWNvcmQodmlldyk/LndlYkNvbnRlbnRzVmlldywgXCJzZXRCYWNrZ3JvdW5kQ29sb3JcIiwgW29wdHMuYmFja2dyb3VuZENvbG9yXSk7XG4gIH1cblxuICBjb25zdCBtYW5hZ2VkOiBNYW5hZ2VkT3dsVmlldyA9IHtcbiAgICBrZXksXG4gICAgdHdlYWtJZDogY3R4LmlkLFxuICAgIGlkLFxuICAgIHZpZXcsXG4gICAgcGFyZW50V2luZG93SWQ6IHdpbmRvd0lkRm9yKHBhcmVudCksXG4gICAgYXR0YWNoTW9kZTogbnVsbCxcbiAgICBkaXNwb3NlQmluZGluZ3M6IFtdLFxuICAgIGRpc3Bvc2VkOiBmYWxzZSxcbiAgfTtcbiAgb3dsVmlld3Muc2V0KGtleSwgbWFuYWdlZCk7XG5cbiAgdHJ5IHtcbiAgICBpZiAocm91dGUgIT09IG51bGwgJiYgb3B0cy5yZWdpc3RlcldpdGhDb2RleCAhPT0gZmFsc2UgJiYgd2luZG93TWFuYWdlcj8ucmVnaXN0ZXJXaW5kb3cpIHtcbiAgICAgIGNvbnN0IGFwcGVhcmFuY2UgPSBvcHRzLmFwcGVhcmFuY2UgfHwgXCJzZWNvbmRhcnlcIjtcbiAgICAgIGNvbnN0IHdpbmRvd0xpa2UgPSBtYWtlV2luZG93TGlrZUZvclZpZXcodmlldyk7XG4gICAgICB3aW5kb3dNYW5hZ2VyLnJlZ2lzdGVyV2luZG93KHdpbmRvd0xpa2UsIGhvc3RJZCwgZmFsc2UsIGFwcGVhcmFuY2UpO1xuICAgICAgc2VydmljZXM/LmdldENvbnRleHQ/Lihob3N0SWQpPy5yZWdpc3RlcldpbmRvdz8uKHdpbmRvd0xpa2UpO1xuICAgIH1cblxuICAgIGF0dGFjaE93bFZpZXcobWFuYWdlZCwgcGFyZW50KTtcbiAgICBpZiAob3B0cy5ib3VuZHMpIHNldE93bFZpZXdCb3VuZHMobWFuYWdlZCwgb3B0cy5ib3VuZHMpO1xuICAgIGlmIChvcHRzLnZpc2libGUgPT09IGZhbHNlKSBzZXRPd2xWaWV3VmlzaWJsZShtYW5hZ2VkLCBmYWxzZSk7XG5cbiAgICBpZiAocm91dGUgIT09IG51bGwpIHtcbiAgICAgIGF3YWl0IHZpZXcud2ViQ29udGVudHMubG9hZFVSTChjb2RleEFwcFVybChyb3V0ZSwgaG9zdElkKSk7XG4gICAgfSBlbHNlIGlmIChvcHRzLnVybCkge1xuICAgICAgYXdhaXQgdmlldy53ZWJDb250ZW50cy5sb2FkVVJMKG5vcm1hbGl6ZU93bFZpZXdVcmwob3B0cy51cmwpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXdhaXQgdmlldy53ZWJDb250ZW50cy5sb2FkVVJMKFwiYWJvdXQ6YmxhbmtcIik7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgZGlzcG9zZU93bFZpZXcobWFuYWdlZCk7XG4gICAgdGhyb3cgZTtcbiAgfVxuXG4gIGxvZyhcImluZm9cIiwgYGNyZWF0ZWQgT3dsIHZpZXcgJHtjdHguaWR9OiR7aWR9YCwge1xuICAgIHBhcmVudFdpbmRvd0lkOiBtYW5hZ2VkLnBhcmVudFdpbmRvd0lkLFxuICAgIHdlYkNvbnRlbnRzSWQ6IHZpZXcud2ViQ29udGVudHMuaWQsXG4gICAgYXR0YWNoTW9kZTogbWFuYWdlZC5hdHRhY2hNb2RlLFxuICB9KTtcbiAgcmV0dXJuIG93bFZpZXdSZWYobWFuYWdlZCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNhbGxPd2xWaWV3KFxuICB0d2Vha0lkOiBzdHJpbmcsXG4gIGlkOiBzdHJpbmcsXG4gIG1ldGhvZDogc3RyaW5nLFxuICBhcmc/OiB1bmtub3duLFxuICBhcmcyPzogdW5rbm93bixcbik6IFByb21pc2U8dW5rbm93bj4ge1xuICBjb25zdCB2aWV3ID0gb3dsVmlld0Zvcih0d2Vha0lkLCBpZCk7XG4gIGlmIChtZXRob2QgPT09IFwic2V0Qm91bmRzXCIpIHJldHVybiBzZXRPd2xWaWV3Qm91bmRzKHZpZXcsIGFyZyBhcyBFbGVjdHJvbi5SZWN0YW5nbGUpO1xuICBpZiAobWV0aG9kID09PSBcInNldFZpc2libGVcIikgcmV0dXJuIHNldE93bFZpZXdWaXNpYmxlKHZpZXcsIEJvb2xlYW4oYXJnKSk7XG4gIGlmIChtZXRob2QgPT09IFwiYnJpbmdUb0Zyb250XCIpIHJldHVybiBicmluZ093bFZpZXdUb0Zyb250KHZpZXcpO1xuICBpZiAobWV0aG9kID09PSBcImxvYWRSb3V0ZVwiKSB7XG4gICAgY29uc3Qgcm91dGUgPSBub3JtYWxpemVDb2RleFJvdXRlKFN0cmluZyhhcmcpKTtcbiAgICBjb25zdCBob3N0SWQgPSB0eXBlb2YgYXJnMiA9PT0gXCJzdHJpbmdcIiAmJiBhcmcyID8gYXJnMiA6IFwibG9jYWxcIjtcbiAgICByZXR1cm4gdmlldy52aWV3LndlYkNvbnRlbnRzLmxvYWRVUkwoY29kZXhBcHBVcmwocm91dGUsIGhvc3RJZCkpO1xuICB9XG4gIGlmIChtZXRob2QgPT09IFwibG9hZFVybFwiKSByZXR1cm4gdmlldy52aWV3LndlYkNvbnRlbnRzLmxvYWRVUkwobm9ybWFsaXplT3dsVmlld1VybChTdHJpbmcoYXJnKSkpO1xuICBpZiAobWV0aG9kID09PSBcImRpc3Bvc2VcIikgcmV0dXJuIGRpc3Bvc2VPd2xWaWV3QnlJZCh0d2Vha0lkLCBpZCk7XG4gIHRocm93IG5ldyBFcnJvcihgdW5rbm93biBDb2RleCB2aWV3IG1ldGhvZDogJHttZXRob2R9YCk7XG59XG5cbmZ1bmN0aW9uIG93bFZpZXdSZWYodmlldzogTWFuYWdlZE93bFZpZXcpOiBDb2RleFZpZXdSZWYge1xuICByZXR1cm4ge1xuICAgIGlkOiB2aWV3LmlkLFxuICAgIHdlYkNvbnRlbnRzSWQ6IHZpZXcudmlldy53ZWJDb250ZW50cy5pZCxcbiAgICBwYXJlbnRXaW5kb3dJZDogdmlldy5wYXJlbnRXaW5kb3dJZCxcbiAgICBzZXRCb3VuZHM6IChib3VuZHMpID0+IFByb21pc2UucmVzb2x2ZShzZXRPd2xWaWV3Qm91bmRzKHZpZXcsIGJvdW5kcykpLFxuICAgIHNldFZpc2libGU6ICh2aXNpYmxlKSA9PiBQcm9taXNlLnJlc29sdmUoc2V0T3dsVmlld1Zpc2libGUodmlldywgdmlzaWJsZSkpLFxuICAgIGJyaW5nVG9Gcm9udDogKCkgPT4gUHJvbWlzZS5yZXNvbHZlKGJyaW5nT3dsVmlld1RvRnJvbnQodmlldykpLFxuICAgIGxvYWRSb3V0ZTogKHJvdXRlLCBob3N0SWQpID0+IHZpZXcudmlldy53ZWJDb250ZW50cy5sb2FkVVJMKGNvZGV4QXBwVXJsKG5vcm1hbGl6ZUNvZGV4Um91dGUocm91dGUpLCBob3N0SWQgfHwgXCJsb2NhbFwiKSkudGhlbigoKSA9PiB7fSksXG4gICAgbG9hZFVybDogKHVybCkgPT4gdmlldy52aWV3LndlYkNvbnRlbnRzLmxvYWRVUkwobm9ybWFsaXplT3dsVmlld1VybCh1cmwpKS50aGVuKCgpID0+IHt9KSxcbiAgICBkaXNwb3NlOiAoKSA9PiBQcm9taXNlLnJlc29sdmUoZGlzcG9zZU93bFZpZXdCeUlkKHZpZXcudHdlYWtJZCwgdmlldy5pZCkpLFxuICB9O1xufVxuXG5mdW5jdGlvbiBhdHRhY2hPd2xWaWV3KHZpZXc6IE1hbmFnZWRPd2xWaWV3LCBwYXJlbnQ6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cpOiB2b2lkIHtcbiAgY29uc3QgY29udGVudFZpZXcgPSBhc1JlY29yZChwYXJlbnQpPy5jb250ZW50VmlldztcbiAgY29uc3Qgd2ViQ29udGVudHNWaWV3ID0gYXNSZWNvcmQodmlldy52aWV3KT8ud2ViQ29udGVudHNWaWV3O1xuICBpZiAodHlwZW9mIGFzUmVjb3JkKHBhcmVudCk/LmFkZEJyb3dzZXJWaWV3ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICBjYWxsT2JqZWN0TWV0aG9kKHBhcmVudCwgXCJhZGRCcm93c2VyVmlld1wiLCBbdmlldy52aWV3XSk7XG4gICAgdmlldy5hdHRhY2hNb2RlID0gXCJicm93c2VyVmlld1wiO1xuICB9IGVsc2UgaWYgKFxuICAgIHR5cGVvZiBhc1JlY29yZChjb250ZW50Vmlldyk/LmFkZENoaWxkVmlldyA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgd2ViQ29udGVudHNWaWV3XG4gICkge1xuICAgIHRyeSB7XG4gICAgICBhZGRPd2xDaGlsZFZpZXcocGFyZW50LCB2aWV3LnZpZXcpO1xuICAgICAgdmlldy5hdHRhY2hNb2RlID0gXCJjb250ZW50Vmlld1wiO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZyhcIndhcm5cIiwgXCJPd2wgY29udGVudFZpZXcgYXR0YWNobWVudCBmYWlsZWQ7IGZhbGxpbmcgYmFjayB0byBCcm93c2VyVmlld1wiLCB7XG4gICAgICAgIHR3ZWFrSWQ6IHZpZXcudHdlYWtJZCxcbiAgICAgICAgdmlld0lkOiB2aWV3LmlkLFxuICAgICAgICBlcnJvcjogU3RyaW5nKGUpLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIGlmICghdmlldy5hdHRhY2hNb2RlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiT3dsIHZpZXcgYXR0YWNobWVudCBpcyBub3QgYXZhaWxhYmxlIG9uIHRoaXMgQ29kZXggd2luZG93XCIpO1xuICB9XG5cbiAgY29uc3QgZGlzcG9zZSA9ICgpID0+IGRpc3Bvc2VPd2xWaWV3QnlJZCh2aWV3LnR3ZWFrSWQsIHZpZXcuaWQpO1xuICBiaW5kV2luZG93RXZlbnQocGFyZW50LCB2aWV3LCBcImNsb3NlZFwiLCBkaXNwb3NlKTtcbiAgYmluZFdpbmRvd0V2ZW50KHBhcmVudCwgdmlldywgXCJjbG9zZVwiLCBkaXNwb3NlKTtcbn1cblxuZnVuY3Rpb24gYnJpbmdPd2xWaWV3VG9Gcm9udCh2aWV3OiBNYW5hZ2VkT3dsVmlldyk6IHZvaWQge1xuICBpZiAodmlldy5kaXNwb3NlZCkgcmV0dXJuO1xuICBjb25zdCBwYXJlbnQgPSB2aWV3LnBhcmVudFdpbmRvd0lkID09PSBudWxsID8gbnVsbCA6IEJyb3dzZXJXaW5kb3cuZnJvbUlkKHZpZXcucGFyZW50V2luZG93SWQpO1xuICBpZiAoIXBhcmVudCB8fCBpc1dpbmRvd0Rlc3Ryb3llZChwYXJlbnQpKSByZXR1cm47XG4gIGNvbnN0IGNvbnRlbnRWaWV3ID0gYXNSZWNvcmQocGFyZW50KT8uY29udGVudFZpZXc7XG4gIGNvbnN0IHdlYkNvbnRlbnRzVmlldyA9IGFzUmVjb3JkKHZpZXcudmlldyk/LndlYkNvbnRlbnRzVmlldztcbiAgaWYgKHZpZXcuYXR0YWNoTW9kZSA9PT0gXCJjb250ZW50Vmlld1wiICYmIHdlYkNvbnRlbnRzVmlldykge1xuICAgIHRyeSB7XG4gICAgICBpZiAodHlwZW9mIGFzUmVjb3JkKHBhcmVudCk/LnNldFRvcEJyb3dzZXJWaWV3ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgY2FsbE9iamVjdE1ldGhvZChwYXJlbnQsIFwic2V0VG9wQnJvd3NlclZpZXdcIiwgW3ZpZXcudmlld10pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbE9iamVjdE1ldGhvZChjb250ZW50VmlldywgXCJhZGRDaGlsZFZpZXdcIiwgW3dlYkNvbnRlbnRzVmlld10pO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZyhcIndhcm5cIiwgXCJPd2wgY29udGVudFZpZXcgYnJpbmctdG8tZnJvbnQgZmFpbGVkXCIsIHtcbiAgICAgICAgdHdlYWtJZDogdmlldy50d2Vha0lkLFxuICAgICAgICB2aWV3SWQ6IHZpZXcuaWQsXG4gICAgICAgIGVycm9yOiBTdHJpbmcoZSksXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgaWYgKHR5cGVvZiBhc1JlY29yZChwYXJlbnQpPy5zZXRUb3BCcm93c2VyVmlldyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgY2FsbE9iamVjdE1ldGhvZChwYXJlbnQsIFwic2V0VG9wQnJvd3NlclZpZXdcIiwgW3ZpZXcudmlld10pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNldE93bFZpZXdCb3VuZHModmlldzogTWFuYWdlZE93bFZpZXcsIGJvdW5kczogRWxlY3Ryb24uUmVjdGFuZ2xlKTogdm9pZCB7XG4gIGFzc2VydEJvdW5kcyhib3VuZHMpO1xuICBjYWxsT2JqZWN0TWV0aG9kKHZpZXcudmlldywgXCJzZXRCb3VuZHNcIiwgW2JvdW5kc10pO1xuICBjYWxsT2JqZWN0TWV0aG9kKGFzUmVjb3JkKHZpZXcudmlldyk/LndlYkNvbnRlbnRzVmlldywgXCJzZXRCb3VuZHNcIiwgW2JvdW5kc10pO1xufVxuXG5mdW5jdGlvbiBzZXRPd2xWaWV3VmlzaWJsZSh2aWV3OiBNYW5hZ2VkT3dsVmlldywgdmlzaWJsZTogYm9vbGVhbik6IHZvaWQge1xuICBjYWxsT2JqZWN0TWV0aG9kKGFzUmVjb3JkKHZpZXcudmlldyk/LndlYkNvbnRlbnRzVmlldywgXCJzZXRWaXNpYmxlXCIsIFt2aXNpYmxlXSk7XG59XG5cbmZ1bmN0aW9uIGRpc3Bvc2VPd2xWaWV3QnlJZCh0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgdmlldyA9IG93bFZpZXdzLmdldChvd2xWaWV3S2V5KHR3ZWFrSWQsIGlkKSk7XG4gIGlmICghdmlldykgcmV0dXJuO1xuICBkaXNwb3NlT3dsVmlldyh2aWV3KTtcbn1cblxuZnVuY3Rpb24gZGlzcG9zZU93bFZpZXdzRm9yVHdlYWsodHdlYWtJZDogc3RyaW5nKTogdm9pZCB7XG4gIGZvciAoY29uc3QgdmlldyBvZiBbLi4ub3dsVmlld3MudmFsdWVzKCldKSB7XG4gICAgaWYgKHZpZXcudHdlYWtJZCA9PT0gdHdlYWtJZCkgZGlzcG9zZU93bFZpZXcodmlldyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZGlzcG9zZUFsbE93bFZpZXdzKCk6IHZvaWQge1xuICBmb3IgKGNvbnN0IHZpZXcgb2YgWy4uLm93bFZpZXdzLnZhbHVlcygpXSkgZGlzcG9zZU93bFZpZXcodmlldyk7XG59XG5cbmZ1bmN0aW9uIGRpc3Bvc2VPd2xWaWV3KHZpZXc6IE1hbmFnZWRPd2xWaWV3KTogdm9pZCB7XG4gIGlmICh2aWV3LmRpc3Bvc2VkKSByZXR1cm47XG4gIHZpZXcuZGlzcG9zZWQgPSB0cnVlO1xuICBvd2xWaWV3cy5kZWxldGUodmlldy5rZXkpO1xuICBmb3IgKGNvbnN0IGRpc3Bvc2Ugb2Ygdmlldy5kaXNwb3NlQmluZGluZ3Muc3BsaWNlKDApKSB7XG4gICAgdHJ5IHtcbiAgICAgIGRpc3Bvc2UoKTtcbiAgICB9IGNhdGNoIHt9XG4gIH1cbiAgY29uc3QgcGFyZW50ID0gdmlldy5wYXJlbnRXaW5kb3dJZCA9PT0gbnVsbCA/IG51bGwgOiBCcm93c2VyV2luZG93LmZyb21JZCh2aWV3LnBhcmVudFdpbmRvd0lkKTtcbiAgaWYgKHBhcmVudCAmJiAhaXNXaW5kb3dEZXN0cm95ZWQocGFyZW50KSkge1xuICAgIHRyeSB7XG4gICAgICBpZiAodmlldy5hdHRhY2hNb2RlID09PSBcImNvbnRlbnRWaWV3XCIpIHtcbiAgICAgICAgcmVtb3ZlT3dsQ2hpbGRWaWV3KHBhcmVudCwgdmlldy52aWV3KTtcbiAgICAgIH0gZWxzZSBpZiAodmlldy5hdHRhY2hNb2RlID09PSBcImJyb3dzZXJWaWV3XCIpIHtcbiAgICAgICAgY2FsbE9iamVjdE1ldGhvZChwYXJlbnQsIFwicmVtb3ZlQnJvd3NlclZpZXdcIiwgW3ZpZXcudmlld10pO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZyhcIndhcm5cIiwgXCJPd2wgdmlldyBkZXRhY2ggZmFpbGVkIGR1cmluZyBkaXNwb3NlXCIsIHtcbiAgICAgICAgdHdlYWtJZDogdmlldy50d2Vha0lkLFxuICAgICAgICB2aWV3SWQ6IHZpZXcuaWQsXG4gICAgICAgIGVycm9yOiBTdHJpbmcoZSksXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgdHJ5IHtcbiAgICBpZiAoIXZpZXcudmlldy53ZWJDb250ZW50cy5pc0Rlc3Ryb3llZCgpKSB7XG4gICAgICB2aWV3LnZpZXcud2ViQ29udGVudHMuY2xvc2UoeyB3YWl0Rm9yQmVmb3JlVW5sb2FkOiBmYWxzZSB9KTtcbiAgICB9XG4gIH0gY2F0Y2gge31cbn1cblxuZnVuY3Rpb24gb3dsVmlld0Zvcih0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiBNYW5hZ2VkT3dsVmlldyB7XG4gIGNvbnN0IHZpZXcgPSBvd2xWaWV3cy5nZXQob3dsVmlld0tleSh0d2Vha0lkLCBpZCkpO1xuICBpZiAoIXZpZXcgfHwgdmlldy5kaXNwb3NlZCkgdGhyb3cgbmV3IEVycm9yKGBDb2RleCB2aWV3IGlzIG5vdCBsb2FkZWQ6ICR7dHdlYWtJZH06JHtpZH1gKTtcbiAgcmV0dXJuIHZpZXc7XG59XG5cbmZ1bmN0aW9uIG93bFZpZXdLZXkodHdlYWtJZDogc3RyaW5nLCB2aWV3SWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgJHt0d2Vha0lkfToke3ZpZXdJZH1gO1xufVxuXG5mdW5jdGlvbiBhZGRPd2xDaGlsZFZpZXcocGFyZW50OiBFbGVjdHJvbi5Ccm93c2VyV2luZG93LCBjaGlsZDogRWxlY3Ryb24uQnJvd3NlclZpZXcpOiB2b2lkIHtcbiAgY29uc3Qgb3duZXJXaW5kb3cgPSBhc1JlY29yZChjaGlsZCk/Lm93bmVyV2luZG93O1xuICBpZiAob3duZXJXaW5kb3cgJiYgb3duZXJXaW5kb3cgIT09IHBhcmVudCkge1xuICAgIGNhbGxPYmplY3RNZXRob2Qob3duZXJXaW5kb3csIFwicmVtb3ZlQnJvd3NlclZpZXdcIiwgW2NoaWxkXSk7XG4gIH1cblxuICBjYWxsT2JqZWN0TWV0aG9kKGFzUmVjb3JkKHBhcmVudCk/LmNvbnRlbnRWaWV3LCBcImFkZENoaWxkVmlld1wiLCBbYXNSZWNvcmQoY2hpbGQpPy53ZWJDb250ZW50c1ZpZXddKTtcbiAgdHJ5IHtcbiAgICAoY2hpbGQgYXMgdW5rbm93biBhcyB7IG93bmVyV2luZG93OiBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbCB9KS5vd25lcldpbmRvdyA9IHBhcmVudDtcbiAgfSBjYXRjaCB7fVxuICBjYWxsT2JqZWN0TWV0aG9kKGFzUmVjb3JkKGNoaWxkLndlYkNvbnRlbnRzKSwgXCJfc2V0T3duZXJXaW5kb3dcIiwgW3BhcmVudF0pO1xuXG4gIGNvbnN0IGJyb3dzZXJWaWV3cyA9IGFzUmVjb3JkKHBhcmVudCk/Ll9icm93c2VyVmlld3M7XG4gIGlmIChBcnJheS5pc0FycmF5KGJyb3dzZXJWaWV3cykgJiYgIWJyb3dzZXJWaWV3cy5pbmNsdWRlcyhjaGlsZCkpIHtcbiAgICBicm93c2VyVmlld3MucHVzaChjaGlsZCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlT3dsQ2hpbGRWaWV3KHBhcmVudDogRWxlY3Ryb24uQnJvd3NlcldpbmRvdywgY2hpbGQ6IEVsZWN0cm9uLkJyb3dzZXJWaWV3KTogdm9pZCB7XG4gIGNhbGxPYmplY3RNZXRob2QoYXNSZWNvcmQocGFyZW50KT8uY29udGVudFZpZXcsIFwicmVtb3ZlQ2hpbGRWaWV3XCIsIFthc1JlY29yZChjaGlsZCk/LndlYkNvbnRlbnRzVmlld10pO1xuICB0cnkge1xuICAgIChjaGlsZCBhcyB1bmtub3duIGFzIHsgb3duZXJXaW5kb3c6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsIH0pLm93bmVyV2luZG93ID0gbnVsbDtcbiAgfSBjYXRjaCB7fVxuXG4gIGNvbnN0IGJyb3dzZXJWaWV3cyA9IGFzUmVjb3JkKHBhcmVudCk/Ll9icm93c2VyVmlld3M7XG4gIGlmIChBcnJheS5pc0FycmF5KGJyb3dzZXJWaWV3cykpIHtcbiAgICBjb25zdCBpbmRleCA9IGJyb3dzZXJWaWV3cy5pbmRleE9mKGNoaWxkKTtcbiAgICBpZiAoaW5kZXggPj0gMCkgYnJvd3NlclZpZXdzLnNwbGljZShpbmRleCwgMSk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gY3JlYXRlQ29kZXhCcm93c2VyVmlldyhvcHRzOiBDb2RleENyZWF0ZVZpZXdPcHRpb25zKTogUHJvbWlzZTx1bmtub3duPiB7XG4gIGNvbnN0IHNlcnZpY2VzID0gZ2V0Q29kZXhXaW5kb3dTZXJ2aWNlcygpO1xuICBjb25zdCB3aW5kb3dNYW5hZ2VyID0gc2VydmljZXM/LndpbmRvd01hbmFnZXI7XG4gIGlmICghc2VydmljZXMgfHwgIXdpbmRvd01hbmFnZXI/LnJlZ2lzdGVyV2luZG93KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgXCJDb2RleCBlbWJlZGRlZCB2aWV3IHNlcnZpY2VzIGFyZSBub3QgYXZhaWxhYmxlLiBSZWluc3RhbGwgQ29kZXgrKyAxLjAuMCBvciBsYXRlci5cIixcbiAgICApO1xuICB9XG5cbiAgY29uc3Qgcm91dGUgPSBub3JtYWxpemVDb2RleFJvdXRlKG9wdHMucm91dGUpO1xuICBjb25zdCBob3N0SWQgPSBvcHRzLmhvc3RJZCB8fCBcImxvY2FsXCI7XG4gIGNvbnN0IGFwcGVhcmFuY2UgPSBvcHRzLmFwcGVhcmFuY2UgfHwgXCJzZWNvbmRhcnlcIjtcbiAgY29uc3QgdmlldyA9IG5ldyBCcm93c2VyVmlldyh7XG4gICAgd2ViUHJlZmVyZW5jZXM6IHtcbiAgICAgIHByZWxvYWQ6IHdpbmRvd01hbmFnZXIub3B0aW9ucz8ucHJlbG9hZFBhdGgsXG4gICAgICBjb250ZXh0SXNvbGF0aW9uOiB0cnVlLFxuICAgICAgbm9kZUludGVncmF0aW9uOiBmYWxzZSxcbiAgICAgIHNwZWxsY2hlY2s6IGZhbHNlLFxuICAgICAgZGV2VG9vbHM6IHdpbmRvd01hbmFnZXIub3B0aW9ucz8uYWxsb3dEZXZ0b29scyxcbiAgICB9LFxuICB9KTtcbiAgY29uc3Qgd2luZG93TGlrZSA9IG1ha2VXaW5kb3dMaWtlRm9yVmlldyh2aWV3KTtcbiAgd2luZG93TWFuYWdlci5yZWdpc3RlcldpbmRvdyh3aW5kb3dMaWtlLCBob3N0SWQsIGZhbHNlLCBhcHBlYXJhbmNlKTtcbiAgc2VydmljZXMuZ2V0Q29udGV4dD8uKGhvc3RJZCk/LnJlZ2lzdGVyV2luZG93Py4od2luZG93TGlrZSk7XG4gIGF3YWl0IHZpZXcud2ViQ29udGVudHMubG9hZFVSTChjb2RleEFwcFVybChyb3V0ZSwgaG9zdElkKSk7XG4gIHJldHVybiB2aWV3O1xufVxuXG5hc3luYyBmdW5jdGlvbiBjcmVhdGVDb2RleFdpbmRvdyhvcHRzOiBDb2RleENyZWF0ZVdpbmRvd09wdGlvbnMpOiBQcm9taXNlPENvZGV4V2luZG93UmVmPiB7XG4gIGNvbnN0IHNlcnZpY2VzID0gZ2V0Q29kZXhXaW5kb3dTZXJ2aWNlcygpO1xuICBpZiAoIXNlcnZpY2VzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgXCJDb2RleCB3aW5kb3cgc2VydmljZXMgYXJlIG5vdCBhdmFpbGFibGUuIFJlaW5zdGFsbCBDb2RleCsrIDEuMC4wIG9yIGxhdGVyLlwiLFxuICAgICk7XG4gIH1cblxuICBjb25zdCByb3V0ZSA9IG5vcm1hbGl6ZUNvZGV4Um91dGUob3B0cy5yb3V0ZSk7XG4gIGNvbnN0IGhvc3RJZCA9IG9wdHMuaG9zdElkIHx8IFwibG9jYWxcIjtcbiAgY29uc3QgcGFyZW50ID0gdHlwZW9mIG9wdHMucGFyZW50V2luZG93SWQgPT09IFwibnVtYmVyXCJcbiAgICA/IEJyb3dzZXJXaW5kb3cuZnJvbUlkKG9wdHMucGFyZW50V2luZG93SWQpXG4gICAgOiBCcm93c2VyV2luZG93LmdldEZvY3VzZWRXaW5kb3coKTtcbiAgY29uc3QgY3JlYXRlV2luZG93ID0gc2VydmljZXMud2luZG93TWFuYWdlcj8uY3JlYXRlV2luZG93O1xuXG4gIGxldCB3aW46IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsIHwgdW5kZWZpbmVkO1xuICBpZiAodHlwZW9mIGNyZWF0ZVdpbmRvdyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgd2luID0gYXdhaXQgY3JlYXRlV2luZG93LmNhbGwoc2VydmljZXMud2luZG93TWFuYWdlciwge1xuICAgICAgaW5pdGlhbFJvdXRlOiByb3V0ZSxcbiAgICAgIGhvc3RJZCxcbiAgICAgIHNob3c6IG9wdHMuc2hvdyAhPT0gZmFsc2UsXG4gICAgICBhcHBlYXJhbmNlOiBvcHRzLmFwcGVhcmFuY2UgfHwgXCJzZWNvbmRhcnlcIixcbiAgICAgIHBhcmVudCxcbiAgICB9KTtcbiAgfSBlbHNlIGlmIChob3N0SWQgPT09IFwibG9jYWxcIiAmJiB0eXBlb2Ygc2VydmljZXMuY3JlYXRlRnJlc2hXaW5kb3cgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHdpbiA9IGF3YWl0IHNlcnZpY2VzLmNyZWF0ZUZyZXNoV2luZG93KHJvdXRlKTtcbiAgfSBlbHNlIGlmIChob3N0SWQgPT09IFwibG9jYWxcIiAmJiB0eXBlb2Ygc2VydmljZXMuY3JlYXRlRnJlc2hMb2NhbFdpbmRvdyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgd2luID0gYXdhaXQgc2VydmljZXMuY3JlYXRlRnJlc2hMb2NhbFdpbmRvdyhyb3V0ZSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHNlcnZpY2VzLmVuc3VyZUhvc3RXaW5kb3cgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHdpbiA9IGF3YWl0IHNlcnZpY2VzLmVuc3VyZUhvc3RXaW5kb3coaG9zdElkKTtcbiAgfVxuXG4gIGlmICghd2luIHx8IHdpbi5pc0Rlc3Ryb3llZCgpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ29kZXggZGlkIG5vdCByZXR1cm4gYSB3aW5kb3cgZm9yIHRoZSByZXF1ZXN0ZWQgcm91dGVcIik7XG4gIH1cblxuICBpZiAob3B0cy5ib3VuZHMpIHtcbiAgICB3aW4uc2V0Qm91bmRzKG9wdHMuYm91bmRzKTtcbiAgfVxuICBpZiAocGFyZW50ICYmICFwYXJlbnQuaXNEZXN0cm95ZWQoKSkge1xuICAgIHRyeSB7XG4gICAgICB3aW4uc2V0UGFyZW50V2luZG93KHBhcmVudCk7XG4gICAgfSBjYXRjaCB7fVxuICB9XG4gIGlmIChvcHRzLnNob3cgIT09IGZhbHNlKSB7XG4gICAgd2luLnNob3coKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgd2luZG93SWQ6IHdpbi5pZCxcbiAgICB3ZWJDb250ZW50c0lkOiB3aW4ud2ViQ29udGVudHMuaWQsXG4gIH07XG59XG5cbmZ1bmN0aW9uIG1ha2VDb2RleEFwaSh0d2VhazogRGlzY292ZXJlZFR3ZWFrKSB7XG4gIGNvbnN0IGN0eCA9ICgpOiBOYXRpdmVUd2Vha0NvbnRleHQgPT4gKHsgaWQ6IHR3ZWFrLm1hbmlmZXN0LmlkLCBkaXI6IHR3ZWFrLmRpciB9KTtcbiAgcmV0dXJuIHtcbiAgICBydW50aW1lOiB7XG4gICAgICBnZXRJbmZvOiBhc3luYyAoKSA9PiBjdXJyZW50UnVudGltZUluZm8oKSxcbiAgICAgIGdldENhcGFiaWxpdGllczogYXN5bmMgKCkgPT4gY3VycmVudFJ1bnRpbWVDYXBhYmlsaXRpZXMoKSxcbiAgICB9LFxuICAgIHdpbmRvd3M6IHtcbiAgICAgIGNyZWF0ZTogY3JlYXRlQ29kZXhXaW5kb3csXG4gICAgICBnZXRQcmltYXJ5OiBhc3luYyAoKSA9PiBnZXRQcmltYXJ5Q29kZXhXaW5kb3dSZWYoKSxcbiAgICAgIGZvY3VzOiBhc3luYyAod2luZG93SWQ6IG51bWJlcikgPT4gZm9jdXNDb2RleFdpbmRvdyh3aW5kb3dJZCksXG4gICAgICBzaG93OiBhc3luYyAod2luZG93SWQ6IG51bWJlcikgPT4gc2hvd0NvZGV4V2luZG93KHdpbmRvd0lkKSxcbiAgICB9LFxuICAgIHZpZXdzOiB7XG4gICAgICBjcmVhdGU6IGFzeW5jIChvcHRpb25zOiBDb2RleFZpZXdDcmVhdGVPcHRpb25zKSA9PiB7XG4gICAgICAgIGFzc2VydFR3ZWFrVmlld1Blcm1pc3Npb24odHdlYWspO1xuICAgICAgICByZXR1cm4gY3JlYXRlT3dsVmlldyhjdHgoKSwgb3B0aW9ucyk7XG4gICAgICB9LFxuICAgIH0sXG4gICAgY2RwOiB7XG4gICAgICBnZXRTdGF0dXM6IGFzeW5jICgpID0+IGdldENkcFN0YXR1cygpLFxuICAgICAgbGlzdFRhcmdldHM6IGFzeW5jICgpID0+IGxpc3RDZHBUYXJnZXRzKCksXG4gICAgfSxcbiAgICBuYXRpdmU6IHtcbiAgICAgIGxvYWRNb2R1bGU6IGFzeW5jIChvcHRpb25zOiBOYXRpdmVNb2R1bGVMb2FkT3B0aW9ucykgPT4ge1xuICAgICAgICBhc3NlcnRUd2Vha1Blcm1pc3Npb24odHdlYWssIFwibmF0aXZlLW1vZHVsZVwiKTtcbiAgICAgICAgcmV0dXJuIG5hdGl2ZUJyaWRnZS5sb2FkTW9kdWxlKGN0eCgpLCBvcHRpb25zKTtcbiAgICAgIH0sXG4gICAgICBjcmVhdGVQYW5lbDogYXN5bmMgKG9wdGlvbnM6IE5hdGl2ZVBhbmVsQ3JlYXRlT3B0aW9ucykgPT4ge1xuICAgICAgICBhc3NlcnRUd2Vha1Blcm1pc3Npb24odHdlYWssIFwibmF0aXZlLXZpZXdcIik7XG4gICAgICAgIHJldHVybiBuYXRpdmVCcmlkZ2UuY3JlYXRlUGFuZWwoY3R4KCksIG9wdGlvbnMpO1xuICAgICAgfSxcbiAgICAgIGF0dGFjaFZpZXc6IGFzeW5jIChvcHRpb25zOiBOYXRpdmVWaWV3QXR0YWNoT3B0aW9ucykgPT4ge1xuICAgICAgICBhc3NlcnRUd2Vha1Blcm1pc3Npb24odHdlYWssIFwibmF0aXZlLXZpZXdcIik7XG4gICAgICAgIHJldHVybiBuYXRpdmVCcmlkZ2UuYXR0YWNoVmlldyhjdHgoKSwgb3B0aW9ucyk7XG4gICAgICB9LFxuICAgICAgbGF1bmNoSGVscGVyOiBhc3luYyAob3B0aW9uczogTmF0aXZlSGVscGVyTGF1bmNoT3B0aW9ucykgPT4ge1xuICAgICAgICBhc3NlcnRUd2Vha1Blcm1pc3Npb24odHdlYWssIFwibmF0aXZlLWhlbHBlclwiKTtcbiAgICAgICAgcmV0dXJuIG5hdGl2ZUJyaWRnZS5sYXVuY2hIZWxwZXIoY3R4KCksIG9wdGlvbnMpO1xuICAgICAgfSxcbiAgICB9LFxuICAgIGNyZWF0ZUJyb3dzZXJWaWV3OiBjcmVhdGVDb2RleEJyb3dzZXJWaWV3LFxuICAgIGNyZWF0ZVdpbmRvdzogY3JlYXRlQ29kZXhXaW5kb3csXG4gIH07XG59XG5cbmZ1bmN0aW9uIG1ha2VXaW5kb3dMaWtlRm9yVmlldyh2aWV3OiBFbGVjdHJvbi5Ccm93c2VyVmlldyk6IENvZGV4V2luZG93TGlrZSB7XG4gIGNvbnN0IHZpZXdCb3VuZHMgPSAoKSA9PiB2aWV3LmdldEJvdW5kcygpO1xuICByZXR1cm4ge1xuICAgIGlkOiB2aWV3LndlYkNvbnRlbnRzLmlkLFxuICAgIHdlYkNvbnRlbnRzOiB2aWV3LndlYkNvbnRlbnRzLFxuICAgIG9uOiAoZXZlbnQ6IFwiY2xvc2VkXCIsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKSA9PiB7XG4gICAgICBpZiAoZXZlbnQgPT09IFwiY2xvc2VkXCIpIHtcbiAgICAgICAgdmlldy53ZWJDb250ZW50cy5vbmNlKFwiZGVzdHJveWVkXCIsIGxpc3RlbmVyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZpZXcud2ViQ29udGVudHMub24oZXZlbnQsIGxpc3RlbmVyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB2aWV3O1xuICAgIH0sXG4gICAgb25jZTogKGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKSA9PiB7XG4gICAgICB2aWV3LndlYkNvbnRlbnRzLm9uY2UoZXZlbnQgYXMgXCJkZXN0cm95ZWRcIiwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHZpZXc7XG4gICAgfSxcbiAgICBvZmY6IChldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCkgPT4ge1xuICAgICAgdmlldy53ZWJDb250ZW50cy5vZmYoZXZlbnQgYXMgXCJkZXN0cm95ZWRcIiwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHZpZXc7XG4gICAgfSxcbiAgICByZW1vdmVMaXN0ZW5lcjogKGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKSA9PiB7XG4gICAgICB2aWV3LndlYkNvbnRlbnRzLnJlbW92ZUxpc3RlbmVyKGV2ZW50IGFzIFwiZGVzdHJveWVkXCIsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB2aWV3O1xuICAgIH0sXG4gICAgaXNEZXN0cm95ZWQ6ICgpID0+IHZpZXcud2ViQ29udGVudHMuaXNEZXN0cm95ZWQoKSxcbiAgICBpc0ZvY3VzZWQ6ICgpID0+IHZpZXcud2ViQ29udGVudHMuaXNGb2N1c2VkKCksXG4gICAgZm9jdXM6ICgpID0+IHZpZXcud2ViQ29udGVudHMuZm9jdXMoKSxcbiAgICBzaG93OiAoKSA9PiB7fSxcbiAgICBoaWRlOiAoKSA9PiB7fSxcbiAgICBnZXRCb3VuZHM6IHZpZXdCb3VuZHMsXG4gICAgZ2V0Q29udGVudEJvdW5kczogdmlld0JvdW5kcyxcbiAgICBnZXRTaXplOiAoKSA9PiB7XG4gICAgICBjb25zdCBiID0gdmlld0JvdW5kcygpO1xuICAgICAgcmV0dXJuIFtiLndpZHRoLCBiLmhlaWdodF07XG4gICAgfSxcbiAgICBnZXRDb250ZW50U2l6ZTogKCkgPT4ge1xuICAgICAgY29uc3QgYiA9IHZpZXdCb3VuZHMoKTtcbiAgICAgIHJldHVybiBbYi53aWR0aCwgYi5oZWlnaHRdO1xuICAgIH0sXG4gICAgc2V0VGl0bGU6ICgpID0+IHt9LFxuICAgIGdldFRpdGxlOiAoKSA9PiBcIlwiLFxuICAgIHNldFJlcHJlc2VudGVkRmlsZW5hbWU6ICgpID0+IHt9LFxuICAgIHNldERvY3VtZW50RWRpdGVkOiAoKSA9PiB7fSxcbiAgICBzZXRXaW5kb3dCdXR0b25WaXNpYmlsaXR5OiAoKSA9PiB7fSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gY29kZXhBcHBVcmwocm91dGU6IHN0cmluZywgaG9zdElkOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKFwiYXBwOi8vLS9pbmRleC5odG1sXCIpO1xuICB1cmwuc2VhcmNoUGFyYW1zLnNldChcImhvc3RJZFwiLCBob3N0SWQpO1xuICBpZiAocm91dGUgIT09IFwiL1wiKSB1cmwuc2VhcmNoUGFyYW1zLnNldChcImluaXRpYWxSb3V0ZVwiLCByb3V0ZSk7XG4gIHJldHVybiB1cmwudG9TdHJpbmcoKTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplT3dsVmlld1VybCh1cmw6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICh0eXBlb2YgdXJsICE9PSBcInN0cmluZ1wiIHx8IHVybC5pbmNsdWRlcyhcIlxcblwiKSB8fCB1cmwuaW5jbHVkZXMoXCJcXHJcIikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJPd2wgdmlldyBVUkwgbXVzdCBiZSBhIHN0cmluZyB3aXRob3V0IGNvbnRyb2wgY2hhcmFjdGVyc1wiKTtcbiAgfVxuICBjb25zdCBwYXJzZWQgPSBuZXcgVVJMKHVybCk7XG4gIGlmICghW1wiaHR0cDpcIiwgXCJodHRwczpcIiwgXCJhcHA6XCIsIFwiZmlsZTpcIiwgXCJkYXRhOlwiLCBcImFib3V0OlwiXS5pbmNsdWRlcyhwYXJzZWQucHJvdG9jb2wpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGB1bnN1cHBvcnRlZCBPd2wgdmlldyBVUkwgcHJvdG9jb2w6ICR7cGFyc2VkLnByb3RvY29sfWApO1xuICB9XG4gIHJldHVybiBwYXJzZWQudG9TdHJpbmcoKTtcbn1cblxuZnVuY3Rpb24gZ2V0Q29kZXhXaW5kb3dTZXJ2aWNlcygpOiBDb2RleFdpbmRvd1NlcnZpY2VzIHwgbnVsbCB7XG4gIGNvbnN0IHNlcnZpY2VzID0gKGdsb2JhbFRoaXMgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilbQ09ERVhfV0lORE9XX1NFUlZJQ0VTX0tFWV07XG4gIHJldHVybiBzZXJ2aWNlcyAmJiB0eXBlb2Ygc2VydmljZXMgPT09IFwib2JqZWN0XCIgPyAoc2VydmljZXMgYXMgQ29kZXhXaW5kb3dTZXJ2aWNlcykgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVDb2RleFJvdXRlKHJvdXRlOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAodHlwZW9mIHJvdXRlICE9PSBcInN0cmluZ1wiIHx8ICFyb3V0ZS5zdGFydHNXaXRoKFwiL1wiKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNvZGV4IHJvdXRlIG11c3QgYmUgYW4gYWJzb2x1dGUgYXBwIHJvdXRlXCIpO1xuICB9XG4gIGlmIChyb3V0ZS5pbmNsdWRlcyhcIjovL1wiKSB8fCByb3V0ZS5pbmNsdWRlcyhcIlxcblwiKSB8fCByb3V0ZS5pbmNsdWRlcyhcIlxcclwiKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNvZGV4IHJvdXRlIG11c3Qgbm90IGluY2x1ZGUgYSBwcm90b2NvbCBvciBjb250cm9sIGNoYXJhY3RlcnNcIik7XG4gIH1cbiAgcmV0dXJuIHJvdXRlO1xufVxuXG5mdW5jdGlvbiBhc1JlY29yZCh2YWx1ZTogdW5rbm93bik6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbCB7XG4gIHJldHVybiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgPyB2YWx1ZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIGNhbGxPYmplY3RNZXRob2QodGFyZ2V0OiB1bmtub3duLCBtZXRob2Q6IHN0cmluZywgYXJnczogdW5rbm93bltdKTogdW5rbm93biB7XG4gIGNvbnN0IGZuID0gYXNSZWNvcmQodGFyZ2V0KT8uW21ldGhvZF07XG4gIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHVuZGVmaW5lZDtcbiAgcmV0dXJuIGZuLmFwcGx5KHRhcmdldCwgYXJncyk7XG59XG5cbmZ1bmN0aW9uIGlzV2luZG93RGVzdHJveWVkKHdpbjogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGwgfCB1bmRlZmluZWQpOiBib29sZWFuIHtcbiAgaWYgKCF3aW4pIHJldHVybiB0cnVlO1xuICBjb25zdCBmbiA9IGFzUmVjb3JkKHdpbik/LmlzRGVzdHJveWVkO1xuICBpZiAodHlwZW9mIGZuICE9PSBcImZ1bmN0aW9uXCIpIHJldHVybiBmYWxzZTtcbiAgdHJ5IHtcbiAgICByZXR1cm4gQm9vbGVhbihmbi5jYWxsKHdpbikpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuXG5mdW5jdGlvbiB3aW5kb3dJZEZvcih3aW46IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsIHwgdW5kZWZpbmVkKTogbnVtYmVyIHwgbnVsbCB7XG4gIGNvbnN0IGlkID0gYXNSZWNvcmQod2luKT8uaWQ7XG4gIHJldHVybiB0eXBlb2YgaWQgPT09IFwibnVtYmVyXCIgPyBpZCA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIGJpbmRXaW5kb3dFdmVudChcbiAgd2luOiBFbGVjdHJvbi5Ccm93c2VyV2luZG93LFxuICB2aWV3OiBNYW5hZ2VkT3dsVmlldyxcbiAgZXZlbnQ6IHN0cmluZyxcbiAgbGlzdGVuZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQsXG4pOiB2b2lkIHtcbiAgY29uc3Qgb24gPSBhc1JlY29yZCh3aW4pPy5vbjtcbiAgY29uc3Qgb2ZmID0gYXNSZWNvcmQod2luKT8ub2ZmO1xuICBpZiAodHlwZW9mIG9uICE9PSBcImZ1bmN0aW9uXCIpIHJldHVybjtcbiAgb24uY2FsbCh3aW4sIGV2ZW50LCBsaXN0ZW5lcik7XG4gIHZpZXcuZGlzcG9zZUJpbmRpbmdzLnB1c2goKCkgPT4ge1xuICAgIGlmICh0eXBlb2Ygb2ZmID09PSBcImZ1bmN0aW9uXCIpIG9mZi5jYWxsKHdpbiwgZXZlbnQsIGxpc3RlbmVyKTtcbiAgICBlbHNlIGNhbGxPYmplY3RNZXRob2Qod2luLCBcInJlbW92ZUxpc3RlbmVyXCIsIFtldmVudCwgbGlzdGVuZXJdKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGFzc2VydEJyaWRnZUlkKHZhbHVlOiBzdHJpbmcsIGxhYmVsOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiIHx8ICEvXlthLXpBLVowLTkuXy1dKyQvLnRlc3QodmFsdWUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGAke2xhYmVsfSBtYXkgb25seSBjb250YWluIGxldHRlcnMsIG51bWJlcnMsIGRvdHMsIHVuZGVyc2NvcmVzLCBhbmQgZGFzaGVzYCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBhc3NlcnRCb3VuZHMoYm91bmRzOiBFbGVjdHJvbi5SZWN0YW5nbGUpOiB2b2lkIHtcbiAgY29uc3QgdmFsdWVzID0gW2JvdW5kcz8ueCwgYm91bmRzPy55LCBib3VuZHM/LndpZHRoLCBib3VuZHM/LmhlaWdodF07XG4gIGlmICghdmFsdWVzLmV2ZXJ5KCh2YWx1ZSkgPT4gdHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiICYmIE51bWJlci5pc0Zpbml0ZSh2YWx1ZSkpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiYm91bmRzIG11c3QgY29udGFpbiBmaW5pdGUgeCwgeSwgd2lkdGgsIGFuZCBoZWlnaHQgbnVtYmVyc1wiKTtcbiAgfVxuICBpZiAoYm91bmRzLndpZHRoIDwgMCB8fCBib3VuZHMuaGVpZ2h0IDwgMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcImJvdW5kcyB3aWR0aCBhbmQgaGVpZ2h0IG11c3QgYmUgbm9uLW5lZ2F0aXZlXCIpO1xuICB9XG59XG5cbi8vIFRvdWNoIEJyb3dzZXJXaW5kb3cgdG8ga2VlcCBpdHMgaW1wb3J0IFx1MjAxNCBvbGRlciBFbGVjdHJvbiBsaW50IHJ1bGVzLlxudm9pZCBCcm93c2VyV2luZG93O1xuIiwgIi8qISBjaG9raWRhciAtIE1JVCBMaWNlbnNlIChjKSAyMDEyIFBhdWwgTWlsbGVyIChwYXVsbWlsbHIuY29tKSAqL1xuaW1wb3J0IHsgc3RhdCBhcyBzdGF0Y2IgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyBzdGF0LCByZWFkZGlyIH0gZnJvbSAnZnMvcHJvbWlzZXMnO1xuaW1wb3J0IHsgRXZlbnRFbWl0dGVyIH0gZnJvbSAnZXZlbnRzJztcbmltcG9ydCAqIGFzIHN5c1BhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyByZWFkZGlycCB9IGZyb20gJ3JlYWRkaXJwJztcbmltcG9ydCB7IE5vZGVGc0hhbmRsZXIsIEVWRU5UUyBhcyBFViwgaXNXaW5kb3dzLCBpc0lCTWksIEVNUFRZX0ZOLCBTVFJfQ0xPU0UsIFNUUl9FTkQsIH0gZnJvbSAnLi9oYW5kbGVyLmpzJztcbmNvbnN0IFNMQVNIID0gJy8nO1xuY29uc3QgU0xBU0hfU0xBU0ggPSAnLy8nO1xuY29uc3QgT05FX0RPVCA9ICcuJztcbmNvbnN0IFRXT19ET1RTID0gJy4uJztcbmNvbnN0IFNUUklOR19UWVBFID0gJ3N0cmluZyc7XG5jb25zdCBCQUNLX1NMQVNIX1JFID0gL1xcXFwvZztcbmNvbnN0IERPVUJMRV9TTEFTSF9SRSA9IC9cXC9cXC8vO1xuY29uc3QgRE9UX1JFID0gL1xcLi4qXFwuKHN3W3B4XSkkfH4kfFxcLnN1YmwuKlxcLnRtcC87XG5jb25zdCBSRVBMQUNFUl9SRSA9IC9eXFwuWy9cXFxcXS87XG5mdW5jdGlvbiBhcnJpZnkoaXRlbSkge1xuICAgIHJldHVybiBBcnJheS5pc0FycmF5KGl0ZW0pID8gaXRlbSA6IFtpdGVtXTtcbn1cbmNvbnN0IGlzTWF0Y2hlck9iamVjdCA9IChtYXRjaGVyKSA9PiB0eXBlb2YgbWF0Y2hlciA9PT0gJ29iamVjdCcgJiYgbWF0Y2hlciAhPT0gbnVsbCAmJiAhKG1hdGNoZXIgaW5zdGFuY2VvZiBSZWdFeHApO1xuZnVuY3Rpb24gY3JlYXRlUGF0dGVybihtYXRjaGVyKSB7XG4gICAgaWYgKHR5cGVvZiBtYXRjaGVyID09PSAnZnVuY3Rpb24nKVxuICAgICAgICByZXR1cm4gbWF0Y2hlcjtcbiAgICBpZiAodHlwZW9mIG1hdGNoZXIgPT09ICdzdHJpbmcnKVxuICAgICAgICByZXR1cm4gKHN0cmluZykgPT4gbWF0Y2hlciA9PT0gc3RyaW5nO1xuICAgIGlmIChtYXRjaGVyIGluc3RhbmNlb2YgUmVnRXhwKVxuICAgICAgICByZXR1cm4gKHN0cmluZykgPT4gbWF0Y2hlci50ZXN0KHN0cmluZyk7XG4gICAgaWYgKHR5cGVvZiBtYXRjaGVyID09PSAnb2JqZWN0JyAmJiBtYXRjaGVyICE9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiAoc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICBpZiAobWF0Y2hlci5wYXRoID09PSBzdHJpbmcpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICBpZiAobWF0Y2hlci5yZWN1cnNpdmUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZWxhdGl2ZSA9IHN5c1BhdGgucmVsYXRpdmUobWF0Y2hlci5wYXRoLCBzdHJpbmcpO1xuICAgICAgICAgICAgICAgIGlmICghcmVsYXRpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gIXJlbGF0aXZlLnN0YXJ0c1dpdGgoJy4uJykgJiYgIXN5c1BhdGguaXNBYnNvbHV0ZShyZWxhdGl2ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiAoKSA9PiBmYWxzZTtcbn1cbmZ1bmN0aW9uIG5vcm1hbGl6ZVBhdGgocGF0aCkge1xuICAgIGlmICh0eXBlb2YgcGF0aCAhPT0gJ3N0cmluZycpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignc3RyaW5nIGV4cGVjdGVkJyk7XG4gICAgcGF0aCA9IHN5c1BhdGgubm9ybWFsaXplKHBhdGgpO1xuICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBsZXQgcHJlcGVuZCA9IGZhbHNlO1xuICAgIGlmIChwYXRoLnN0YXJ0c1dpdGgoJy8vJykpXG4gICAgICAgIHByZXBlbmQgPSB0cnVlO1xuICAgIGNvbnN0IERPVUJMRV9TTEFTSF9SRSA9IC9cXC9cXC8vO1xuICAgIHdoaWxlIChwYXRoLm1hdGNoKERPVUJMRV9TTEFTSF9SRSkpXG4gICAgICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoRE9VQkxFX1NMQVNIX1JFLCAnLycpO1xuICAgIGlmIChwcmVwZW5kKVxuICAgICAgICBwYXRoID0gJy8nICsgcGF0aDtcbiAgICByZXR1cm4gcGF0aDtcbn1cbmZ1bmN0aW9uIG1hdGNoUGF0dGVybnMocGF0dGVybnMsIHRlc3RTdHJpbmcsIHN0YXRzKSB7XG4gICAgY29uc3QgcGF0aCA9IG5vcm1hbGl6ZVBhdGgodGVzdFN0cmluZyk7XG4gICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IHBhdHRlcm5zLmxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICBjb25zdCBwYXR0ZXJuID0gcGF0dGVybnNbaW5kZXhdO1xuICAgICAgICBpZiAocGF0dGVybihwYXRoLCBzdGF0cykpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cbmZ1bmN0aW9uIGFueW1hdGNoKG1hdGNoZXJzLCB0ZXN0U3RyaW5nKSB7XG4gICAgaWYgKG1hdGNoZXJzID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYW55bWF0Y2g6IHNwZWNpZnkgZmlyc3QgYXJndW1lbnQnKTtcbiAgICB9XG4gICAgLy8gRWFybHkgY2FjaGUgZm9yIG1hdGNoZXJzLlxuICAgIGNvbnN0IG1hdGNoZXJzQXJyYXkgPSBhcnJpZnkobWF0Y2hlcnMpO1xuICAgIGNvbnN0IHBhdHRlcm5zID0gbWF0Y2hlcnNBcnJheS5tYXAoKG1hdGNoZXIpID0+IGNyZWF0ZVBhdHRlcm4obWF0Y2hlcikpO1xuICAgIGlmICh0ZXN0U3RyaW5nID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuICh0ZXN0U3RyaW5nLCBzdGF0cykgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoUGF0dGVybnMocGF0dGVybnMsIHRlc3RTdHJpbmcsIHN0YXRzKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIG1hdGNoUGF0dGVybnMocGF0dGVybnMsIHRlc3RTdHJpbmcpO1xufVxuY29uc3QgdW5pZnlQYXRocyA9IChwYXRoc18pID0+IHtcbiAgICBjb25zdCBwYXRocyA9IGFycmlmeShwYXRoc18pLmZsYXQoKTtcbiAgICBpZiAoIXBhdGhzLmV2ZXJ5KChwKSA9PiB0eXBlb2YgcCA9PT0gU1RSSU5HX1RZUEUpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYE5vbi1zdHJpbmcgcHJvdmlkZWQgYXMgd2F0Y2ggcGF0aDogJHtwYXRoc31gKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhdGhzLm1hcChub3JtYWxpemVQYXRoVG9Vbml4KTtcbn07XG4vLyBJZiBTTEFTSF9TTEFTSCBvY2N1cnMgYXQgdGhlIGJlZ2lubmluZyBvZiBwYXRoLCBpdCBpcyBub3QgcmVwbGFjZWRcbi8vICAgICBiZWNhdXNlIFwiLy9TdG9yYWdlUEMvRHJpdmVQb29sL01vdmllc1wiIGlzIGEgdmFsaWQgbmV0d29yayBwYXRoXG5jb25zdCB0b1VuaXggPSAoc3RyaW5nKSA9PiB7XG4gICAgbGV0IHN0ciA9IHN0cmluZy5yZXBsYWNlKEJBQ0tfU0xBU0hfUkUsIFNMQVNIKTtcbiAgICBsZXQgcHJlcGVuZCA9IGZhbHNlO1xuICAgIGlmIChzdHIuc3RhcnRzV2l0aChTTEFTSF9TTEFTSCkpIHtcbiAgICAgICAgcHJlcGVuZCA9IHRydWU7XG4gICAgfVxuICAgIHdoaWxlIChzdHIubWF0Y2goRE9VQkxFX1NMQVNIX1JFKSkge1xuICAgICAgICBzdHIgPSBzdHIucmVwbGFjZShET1VCTEVfU0xBU0hfUkUsIFNMQVNIKTtcbiAgICB9XG4gICAgaWYgKHByZXBlbmQpIHtcbiAgICAgICAgc3RyID0gU0xBU0ggKyBzdHI7XG4gICAgfVxuICAgIHJldHVybiBzdHI7XG59O1xuLy8gT3VyIHZlcnNpb24gb2YgdXBhdGgubm9ybWFsaXplXG4vLyBUT0RPOiB0aGlzIGlzIG5vdCBlcXVhbCB0byBwYXRoLW5vcm1hbGl6ZSBtb2R1bGUgLSBpbnZlc3RpZ2F0ZSB3aHlcbmNvbnN0IG5vcm1hbGl6ZVBhdGhUb1VuaXggPSAocGF0aCkgPT4gdG9Vbml4KHN5c1BhdGgubm9ybWFsaXplKHRvVW5peChwYXRoKSkpO1xuLy8gVE9ETzogcmVmYWN0b3JcbmNvbnN0IG5vcm1hbGl6ZUlnbm9yZWQgPSAoY3dkID0gJycpID0+IChwYXRoKSA9PiB7XG4gICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gbm9ybWFsaXplUGF0aFRvVW5peChzeXNQYXRoLmlzQWJzb2x1dGUocGF0aCkgPyBwYXRoIDogc3lzUGF0aC5qb2luKGN3ZCwgcGF0aCkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHBhdGg7XG4gICAgfVxufTtcbmNvbnN0IGdldEFic29sdXRlUGF0aCA9IChwYXRoLCBjd2QpID0+IHtcbiAgICBpZiAoc3lzUGF0aC5pc0Fic29sdXRlKHBhdGgpKSB7XG4gICAgICAgIHJldHVybiBwYXRoO1xuICAgIH1cbiAgICByZXR1cm4gc3lzUGF0aC5qb2luKGN3ZCwgcGF0aCk7XG59O1xuY29uc3QgRU1QVFlfU0VUID0gT2JqZWN0LmZyZWV6ZShuZXcgU2V0KCkpO1xuLyoqXG4gKiBEaXJlY3RvcnkgZW50cnkuXG4gKi9cbmNsYXNzIERpckVudHJ5IHtcbiAgICBjb25zdHJ1Y3RvcihkaXIsIHJlbW92ZVdhdGNoZXIpIHtcbiAgICAgICAgdGhpcy5wYXRoID0gZGlyO1xuICAgICAgICB0aGlzLl9yZW1vdmVXYXRjaGVyID0gcmVtb3ZlV2F0Y2hlcjtcbiAgICAgICAgdGhpcy5pdGVtcyA9IG5ldyBTZXQoKTtcbiAgICB9XG4gICAgYWRkKGl0ZW0pIHtcbiAgICAgICAgY29uc3QgeyBpdGVtcyB9ID0gdGhpcztcbiAgICAgICAgaWYgKCFpdGVtcylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKGl0ZW0gIT09IE9ORV9ET1QgJiYgaXRlbSAhPT0gVFdPX0RPVFMpXG4gICAgICAgICAgICBpdGVtcy5hZGQoaXRlbSk7XG4gICAgfVxuICAgIGFzeW5jIHJlbW92ZShpdGVtKSB7XG4gICAgICAgIGNvbnN0IHsgaXRlbXMgfSA9IHRoaXM7XG4gICAgICAgIGlmICghaXRlbXMpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGl0ZW1zLmRlbGV0ZShpdGVtKTtcbiAgICAgICAgaWYgKGl0ZW1zLnNpemUgPiAwKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCBkaXIgPSB0aGlzLnBhdGg7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCByZWFkZGlyKGRpcik7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgaWYgKHRoaXMuX3JlbW92ZVdhdGNoZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW1vdmVXYXRjaGVyKHN5c1BhdGguZGlybmFtZShkaXIpLCBzeXNQYXRoLmJhc2VuYW1lKGRpcikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGhhcyhpdGVtKSB7XG4gICAgICAgIGNvbnN0IHsgaXRlbXMgfSA9IHRoaXM7XG4gICAgICAgIGlmICghaXRlbXMpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHJldHVybiBpdGVtcy5oYXMoaXRlbSk7XG4gICAgfVxuICAgIGdldENoaWxkcmVuKCkge1xuICAgICAgICBjb25zdCB7IGl0ZW1zIH0gPSB0aGlzO1xuICAgICAgICBpZiAoIWl0ZW1zKVxuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICByZXR1cm4gWy4uLml0ZW1zLnZhbHVlcygpXTtcbiAgICB9XG4gICAgZGlzcG9zZSgpIHtcbiAgICAgICAgdGhpcy5pdGVtcy5jbGVhcigpO1xuICAgICAgICB0aGlzLnBhdGggPSAnJztcbiAgICAgICAgdGhpcy5fcmVtb3ZlV2F0Y2hlciA9IEVNUFRZX0ZOO1xuICAgICAgICB0aGlzLml0ZW1zID0gRU1QVFlfU0VUO1xuICAgICAgICBPYmplY3QuZnJlZXplKHRoaXMpO1xuICAgIH1cbn1cbmNvbnN0IFNUQVRfTUVUSE9EX0YgPSAnc3RhdCc7XG5jb25zdCBTVEFUX01FVEhPRF9MID0gJ2xzdGF0JztcbmV4cG9ydCBjbGFzcyBXYXRjaEhlbHBlciB7XG4gICAgY29uc3RydWN0b3IocGF0aCwgZm9sbG93LCBmc3cpIHtcbiAgICAgICAgdGhpcy5mc3cgPSBmc3c7XG4gICAgICAgIGNvbnN0IHdhdGNoUGF0aCA9IHBhdGg7XG4gICAgICAgIHRoaXMucGF0aCA9IHBhdGggPSBwYXRoLnJlcGxhY2UoUkVQTEFDRVJfUkUsICcnKTtcbiAgICAgICAgdGhpcy53YXRjaFBhdGggPSB3YXRjaFBhdGg7XG4gICAgICAgIHRoaXMuZnVsbFdhdGNoUGF0aCA9IHN5c1BhdGgucmVzb2x2ZSh3YXRjaFBhdGgpO1xuICAgICAgICB0aGlzLmRpclBhcnRzID0gW107XG4gICAgICAgIHRoaXMuZGlyUGFydHMuZm9yRWFjaCgocGFydHMpID0+IHtcbiAgICAgICAgICAgIGlmIChwYXJ0cy5sZW5ndGggPiAxKVxuICAgICAgICAgICAgICAgIHBhcnRzLnBvcCgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5mb2xsb3dTeW1saW5rcyA9IGZvbGxvdztcbiAgICAgICAgdGhpcy5zdGF0TWV0aG9kID0gZm9sbG93ID8gU1RBVF9NRVRIT0RfRiA6IFNUQVRfTUVUSE9EX0w7XG4gICAgfVxuICAgIGVudHJ5UGF0aChlbnRyeSkge1xuICAgICAgICByZXR1cm4gc3lzUGF0aC5qb2luKHRoaXMud2F0Y2hQYXRoLCBzeXNQYXRoLnJlbGF0aXZlKHRoaXMud2F0Y2hQYXRoLCBlbnRyeS5mdWxsUGF0aCkpO1xuICAgIH1cbiAgICBmaWx0ZXJQYXRoKGVudHJ5KSB7XG4gICAgICAgIGNvbnN0IHsgc3RhdHMgfSA9IGVudHJ5O1xuICAgICAgICBpZiAoc3RhdHMgJiYgc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSlcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZpbHRlckRpcihlbnRyeSk7XG4gICAgICAgIGNvbnN0IHJlc29sdmVkUGF0aCA9IHRoaXMuZW50cnlQYXRoKGVudHJ5KTtcbiAgICAgICAgLy8gVE9ETzogd2hhdCBpZiBzdGF0cyBpcyB1bmRlZmluZWQ/IHJlbW92ZSAhXG4gICAgICAgIHJldHVybiB0aGlzLmZzdy5faXNudElnbm9yZWQocmVzb2x2ZWRQYXRoLCBzdGF0cykgJiYgdGhpcy5mc3cuX2hhc1JlYWRQZXJtaXNzaW9ucyhzdGF0cyk7XG4gICAgfVxuICAgIGZpbHRlckRpcihlbnRyeSkge1xuICAgICAgICByZXR1cm4gdGhpcy5mc3cuX2lzbnRJZ25vcmVkKHRoaXMuZW50cnlQYXRoKGVudHJ5KSwgZW50cnkuc3RhdHMpO1xuICAgIH1cbn1cbi8qKlxuICogV2F0Y2hlcyBmaWxlcyAmIGRpcmVjdG9yaWVzIGZvciBjaGFuZ2VzLiBFbWl0dGVkIGV2ZW50czpcbiAqIGBhZGRgLCBgYWRkRGlyYCwgYGNoYW5nZWAsIGB1bmxpbmtgLCBgdW5saW5rRGlyYCwgYGFsbGAsIGBlcnJvcmBcbiAqXG4gKiAgICAgbmV3IEZTV2F0Y2hlcigpXG4gKiAgICAgICAuYWRkKGRpcmVjdG9yaWVzKVxuICogICAgICAgLm9uKCdhZGQnLCBwYXRoID0+IGxvZygnRmlsZScsIHBhdGgsICd3YXMgYWRkZWQnKSlcbiAqL1xuZXhwb3J0IGNsYXNzIEZTV2F0Y2hlciBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gICAgLy8gTm90IGluZGVudGluZyBtZXRob2RzIGZvciBoaXN0b3J5IHNha2U7IGZvciBub3cuXG4gICAgY29uc3RydWN0b3IoX29wdHMgPSB7fSkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLmNsb3NlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9jbG9zZXJzID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLl9pZ25vcmVkUGF0aHMgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuX3Rocm90dGxlZCA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5fc3RyZWFtcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5fc3ltbGlua1BhdGhzID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLl93YXRjaGVkID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLl9wZW5kaW5nV3JpdGVzID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLl9wZW5kaW5nVW5saW5rcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5fcmVhZHlDb3VudCA9IDA7XG4gICAgICAgIHRoaXMuX3JlYWR5RW1pdHRlZCA9IGZhbHNlO1xuICAgICAgICBjb25zdCBhd2YgPSBfb3B0cy5hd2FpdFdyaXRlRmluaXNoO1xuICAgICAgICBjb25zdCBERUZfQVdGID0geyBzdGFiaWxpdHlUaHJlc2hvbGQ6IDIwMDAsIHBvbGxJbnRlcnZhbDogMTAwIH07XG4gICAgICAgIGNvbnN0IG9wdHMgPSB7XG4gICAgICAgICAgICAvLyBEZWZhdWx0c1xuICAgICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcbiAgICAgICAgICAgIGlnbm9yZUluaXRpYWw6IGZhbHNlLFxuICAgICAgICAgICAgaWdub3JlUGVybWlzc2lvbkVycm9yczogZmFsc2UsXG4gICAgICAgICAgICBpbnRlcnZhbDogMTAwLFxuICAgICAgICAgICAgYmluYXJ5SW50ZXJ2YWw6IDMwMCxcbiAgICAgICAgICAgIGZvbGxvd1N5bWxpbmtzOiB0cnVlLFxuICAgICAgICAgICAgdXNlUG9sbGluZzogZmFsc2UsXG4gICAgICAgICAgICAvLyB1c2VBc3luYzogZmFsc2UsXG4gICAgICAgICAgICBhdG9taWM6IHRydWUsIC8vIE5PVEU6IG92ZXJ3cml0dGVuIGxhdGVyIChkZXBlbmRzIG9uIHVzZVBvbGxpbmcpXG4gICAgICAgICAgICAuLi5fb3B0cyxcbiAgICAgICAgICAgIC8vIENoYW5nZSBmb3JtYXRcbiAgICAgICAgICAgIGlnbm9yZWQ6IF9vcHRzLmlnbm9yZWQgPyBhcnJpZnkoX29wdHMuaWdub3JlZCkgOiBhcnJpZnkoW10pLFxuICAgICAgICAgICAgYXdhaXRXcml0ZUZpbmlzaDogYXdmID09PSB0cnVlID8gREVGX0FXRiA6IHR5cGVvZiBhd2YgPT09ICdvYmplY3QnID8geyAuLi5ERUZfQVdGLCAuLi5hd2YgfSA6IGZhbHNlLFxuICAgICAgICB9O1xuICAgICAgICAvLyBBbHdheXMgZGVmYXVsdCB0byBwb2xsaW5nIG9uIElCTSBpIGJlY2F1c2UgZnMud2F0Y2goKSBpcyBub3QgYXZhaWxhYmxlIG9uIElCTSBpLlxuICAgICAgICBpZiAoaXNJQk1pKVxuICAgICAgICAgICAgb3B0cy51c2VQb2xsaW5nID0gdHJ1ZTtcbiAgICAgICAgLy8gRWRpdG9yIGF0b21pYyB3cml0ZSBub3JtYWxpemF0aW9uIGVuYWJsZWQgYnkgZGVmYXVsdCB3aXRoIGZzLndhdGNoXG4gICAgICAgIGlmIChvcHRzLmF0b21pYyA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgb3B0cy5hdG9taWMgPSAhb3B0cy51c2VQb2xsaW5nO1xuICAgICAgICAvLyBvcHRzLmF0b21pYyA9IHR5cGVvZiBfb3B0cy5hdG9taWMgPT09ICdudW1iZXInID8gX29wdHMuYXRvbWljIDogMTAwO1xuICAgICAgICAvLyBHbG9iYWwgb3ZlcnJpZGUuIFVzZWZ1bCBmb3IgZGV2ZWxvcGVycywgd2hvIG5lZWQgdG8gZm9yY2UgcG9sbGluZyBmb3IgYWxsXG4gICAgICAgIC8vIGluc3RhbmNlcyBvZiBjaG9raWRhciwgcmVnYXJkbGVzcyBvZiB1c2FnZSAvIGRlcGVuZGVuY3kgZGVwdGhcbiAgICAgICAgY29uc3QgZW52UG9sbCA9IHByb2Nlc3MuZW52LkNIT0tJREFSX1VTRVBPTExJTkc7XG4gICAgICAgIGlmIChlbnZQb2xsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGVudkxvd2VyID0gZW52UG9sbC50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgaWYgKGVudkxvd2VyID09PSAnZmFsc2UnIHx8IGVudkxvd2VyID09PSAnMCcpXG4gICAgICAgICAgICAgICAgb3B0cy51c2VQb2xsaW5nID0gZmFsc2U7XG4gICAgICAgICAgICBlbHNlIGlmIChlbnZMb3dlciA9PT0gJ3RydWUnIHx8IGVudkxvd2VyID09PSAnMScpXG4gICAgICAgICAgICAgICAgb3B0cy51c2VQb2xsaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBvcHRzLnVzZVBvbGxpbmcgPSAhIWVudkxvd2VyO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVudkludGVydmFsID0gcHJvY2Vzcy5lbnYuQ0hPS0lEQVJfSU5URVJWQUw7XG4gICAgICAgIGlmIChlbnZJbnRlcnZhbClcbiAgICAgICAgICAgIG9wdHMuaW50ZXJ2YWwgPSBOdW1iZXIucGFyc2VJbnQoZW52SW50ZXJ2YWwsIDEwKTtcbiAgICAgICAgLy8gVGhpcyBpcyBkb25lIHRvIGVtaXQgcmVhZHkgb25seSBvbmNlLCBidXQgZWFjaCAnYWRkJyB3aWxsIGluY3JlYXNlIHRoYXQ/XG4gICAgICAgIGxldCByZWFkeUNhbGxzID0gMDtcbiAgICAgICAgdGhpcy5fZW1pdFJlYWR5ID0gKCkgPT4ge1xuICAgICAgICAgICAgcmVhZHlDYWxscysrO1xuICAgICAgICAgICAgaWYgKHJlYWR5Q2FsbHMgPj0gdGhpcy5fcmVhZHlDb3VudCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2VtaXRSZWFkeSA9IEVNUFRZX0ZOO1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlYWR5RW1pdHRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgLy8gdXNlIHByb2Nlc3MubmV4dFRpY2sgdG8gYWxsb3cgdGltZSBmb3IgbGlzdGVuZXIgdG8gYmUgYm91bmRcbiAgICAgICAgICAgICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHRoaXMuZW1pdChFVi5SRUFEWSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB0aGlzLl9lbWl0UmF3ID0gKC4uLmFyZ3MpID0+IHRoaXMuZW1pdChFVi5SQVcsIC4uLmFyZ3MpO1xuICAgICAgICB0aGlzLl9ib3VuZFJlbW92ZSA9IHRoaXMuX3JlbW92ZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRzO1xuICAgICAgICB0aGlzLl9ub2RlRnNIYW5kbGVyID0gbmV3IE5vZGVGc0hhbmRsZXIodGhpcyk7XG4gICAgICAgIC8vIFlvdVx1MjAxOXJlIGZyb3plbiB3aGVuIHlvdXIgaGVhcnRcdTIwMTlzIG5vdCBvcGVuLlxuICAgICAgICBPYmplY3QuZnJlZXplKG9wdHMpO1xuICAgIH1cbiAgICBfYWRkSWdub3JlZFBhdGgobWF0Y2hlcikge1xuICAgICAgICBpZiAoaXNNYXRjaGVyT2JqZWN0KG1hdGNoZXIpKSB7XG4gICAgICAgICAgICAvLyByZXR1cm4gZWFybHkgaWYgd2UgYWxyZWFkeSBoYXZlIGEgZGVlcGx5IGVxdWFsIG1hdGNoZXIgb2JqZWN0XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGlnbm9yZWQgb2YgdGhpcy5faWdub3JlZFBhdGhzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTWF0Y2hlck9iamVjdChpZ25vcmVkKSAmJlxuICAgICAgICAgICAgICAgICAgICBpZ25vcmVkLnBhdGggPT09IG1hdGNoZXIucGF0aCAmJlxuICAgICAgICAgICAgICAgICAgICBpZ25vcmVkLnJlY3Vyc2l2ZSA9PT0gbWF0Y2hlci5yZWN1cnNpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9pZ25vcmVkUGF0aHMuYWRkKG1hdGNoZXIpO1xuICAgIH1cbiAgICBfcmVtb3ZlSWdub3JlZFBhdGgobWF0Y2hlcikge1xuICAgICAgICB0aGlzLl9pZ25vcmVkUGF0aHMuZGVsZXRlKG1hdGNoZXIpO1xuICAgICAgICAvLyBub3cgZmluZCBhbnkgbWF0Y2hlciBvYmplY3RzIHdpdGggdGhlIG1hdGNoZXIgYXMgcGF0aFxuICAgICAgICBpZiAodHlwZW9mIG1hdGNoZXIgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGlnbm9yZWQgb2YgdGhpcy5faWdub3JlZFBhdGhzKSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyAoNDMwODFqKTogbWFrZSB0aGlzIG1vcmUgZWZmaWNpZW50LlxuICAgICAgICAgICAgICAgIC8vIHByb2JhYmx5IGp1c3QgbWFrZSBhIGB0aGlzLl9pZ25vcmVkRGlyZWN0b3JpZXNgIG9yIHNvbWVcbiAgICAgICAgICAgICAgICAvLyBzdWNoIHRoaW5nLlxuICAgICAgICAgICAgICAgIGlmIChpc01hdGNoZXJPYmplY3QoaWdub3JlZCkgJiYgaWdub3JlZC5wYXRoID09PSBtYXRjaGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2lnbm9yZWRQYXRocy5kZWxldGUoaWdub3JlZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIFB1YmxpYyBtZXRob2RzXG4gICAgLyoqXG4gICAgICogQWRkcyBwYXRocyB0byBiZSB3YXRjaGVkIG9uIGFuIGV4aXN0aW5nIEZTV2F0Y2hlciBpbnN0YW5jZS5cbiAgICAgKiBAcGFyYW0gcGF0aHNfIGZpbGUgb3IgZmlsZSBsaXN0LiBPdGhlciBhcmd1bWVudHMgYXJlIHVudXNlZFxuICAgICAqL1xuICAgIGFkZChwYXRoc18sIF9vcmlnQWRkLCBfaW50ZXJuYWwpIHtcbiAgICAgICAgY29uc3QgeyBjd2QgfSA9IHRoaXMub3B0aW9ucztcbiAgICAgICAgdGhpcy5jbG9zZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fY2xvc2VQcm9taXNlID0gdW5kZWZpbmVkO1xuICAgICAgICBsZXQgcGF0aHMgPSB1bmlmeVBhdGhzKHBhdGhzXyk7XG4gICAgICAgIGlmIChjd2QpIHtcbiAgICAgICAgICAgIHBhdGhzID0gcGF0aHMubWFwKChwYXRoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgYWJzUGF0aCA9IGdldEFic29sdXRlUGF0aChwYXRoLCBjd2QpO1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGBwYXRoYCBpbnN0ZWFkIG9mIGBhYnNQYXRoYCBiZWNhdXNlIHRoZSBjd2QgcG9ydGlvbiBjYW4ndCBiZSBhIGdsb2JcbiAgICAgICAgICAgICAgICByZXR1cm4gYWJzUGF0aDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHBhdGhzLmZvckVhY2goKHBhdGgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3JlbW92ZUlnbm9yZWRQYXRoKHBhdGgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fdXNlcklnbm9yZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmICghdGhpcy5fcmVhZHlDb3VudClcbiAgICAgICAgICAgIHRoaXMuX3JlYWR5Q291bnQgPSAwO1xuICAgICAgICB0aGlzLl9yZWFkeUNvdW50ICs9IHBhdGhzLmxlbmd0aDtcbiAgICAgICAgUHJvbWlzZS5hbGwocGF0aHMubWFwKGFzeW5jIChwYXRoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByZXMgPSBhd2FpdCB0aGlzLl9ub2RlRnNIYW5kbGVyLl9hZGRUb05vZGVGcyhwYXRoLCAhX2ludGVybmFsLCB1bmRlZmluZWQsIDAsIF9vcmlnQWRkKTtcbiAgICAgICAgICAgIGlmIChyZXMpXG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdFJlYWR5KCk7XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9KSkudGhlbigocmVzdWx0cykgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuY2xvc2VkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIHJlc3VsdHMuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChpdGVtKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZChzeXNQYXRoLmRpcm5hbWUoaXRlbSksIHN5c1BhdGguYmFzZW5hbWUoX29yaWdBZGQgfHwgaXRlbSkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xvc2Ugd2F0Y2hlcnMgb3Igc3RhcnQgaWdub3JpbmcgZXZlbnRzIGZyb20gc3BlY2lmaWVkIHBhdGhzLlxuICAgICAqL1xuICAgIHVud2F0Y2gocGF0aHNfKSB7XG4gICAgICAgIGlmICh0aGlzLmNsb3NlZClcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICBjb25zdCBwYXRocyA9IHVuaWZ5UGF0aHMocGF0aHNfKTtcbiAgICAgICAgY29uc3QgeyBjd2QgfSA9IHRoaXMub3B0aW9ucztcbiAgICAgICAgcGF0aHMuZm9yRWFjaCgocGF0aCkgPT4ge1xuICAgICAgICAgICAgLy8gY29udmVydCB0byBhYnNvbHV0ZSBwYXRoIHVubGVzcyByZWxhdGl2ZSBwYXRoIGFscmVhZHkgbWF0Y2hlc1xuICAgICAgICAgICAgaWYgKCFzeXNQYXRoLmlzQWJzb2x1dGUocGF0aCkgJiYgIXRoaXMuX2Nsb3NlcnMuaGFzKHBhdGgpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGN3ZClcbiAgICAgICAgICAgICAgICAgICAgcGF0aCA9IHN5c1BhdGguam9pbihjd2QsIHBhdGgpO1xuICAgICAgICAgICAgICAgIHBhdGggPSBzeXNQYXRoLnJlc29sdmUocGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9jbG9zZVBhdGgocGF0aCk7XG4gICAgICAgICAgICB0aGlzLl9hZGRJZ25vcmVkUGF0aChwYXRoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLl93YXRjaGVkLmhhcyhwYXRoKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2FkZElnbm9yZWRQYXRoKHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgcmVjdXJzaXZlOiB0cnVlLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gcmVzZXQgdGhlIGNhY2hlZCB1c2VySWdub3JlZCBhbnltYXRjaCBmblxuICAgICAgICAgICAgLy8gdG8gbWFrZSBpZ25vcmVkUGF0aHMgY2hhbmdlcyBlZmZlY3RpdmVcbiAgICAgICAgICAgIHRoaXMuX3VzZXJJZ25vcmVkID0gdW5kZWZpbmVkO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsb3NlIHdhdGNoZXJzIGFuZCByZW1vdmUgYWxsIGxpc3RlbmVycyBmcm9tIHdhdGNoZWQgcGF0aHMuXG4gICAgICovXG4gICAgY2xvc2UoKSB7XG4gICAgICAgIGlmICh0aGlzLl9jbG9zZVByb21pc2UpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jbG9zZVByb21pc2U7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jbG9zZWQgPSB0cnVlO1xuICAgICAgICAvLyBNZW1vcnkgbWFuYWdlbWVudC5cbiAgICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcbiAgICAgICAgY29uc3QgY2xvc2VycyA9IFtdO1xuICAgICAgICB0aGlzLl9jbG9zZXJzLmZvckVhY2goKGNsb3Nlckxpc3QpID0+IGNsb3Nlckxpc3QuZm9yRWFjaCgoY2xvc2VyKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwcm9taXNlID0gY2xvc2VyKCk7XG4gICAgICAgICAgICBpZiAocHJvbWlzZSBpbnN0YW5jZW9mIFByb21pc2UpXG4gICAgICAgICAgICAgICAgY2xvc2Vycy5wdXNoKHByb21pc2UpO1xuICAgICAgICB9KSk7XG4gICAgICAgIHRoaXMuX3N0cmVhbXMuZm9yRWFjaCgoc3RyZWFtKSA9PiBzdHJlYW0uZGVzdHJveSgpKTtcbiAgICAgICAgdGhpcy5fdXNlcklnbm9yZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuX3JlYWR5Q291bnQgPSAwO1xuICAgICAgICB0aGlzLl9yZWFkeUVtaXR0ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fd2F0Y2hlZC5mb3JFYWNoKChkaXJlbnQpID0+IGRpcmVudC5kaXNwb3NlKCkpO1xuICAgICAgICB0aGlzLl9jbG9zZXJzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuX3dhdGNoZWQuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5fc3RyZWFtcy5jbGVhcigpO1xuICAgICAgICB0aGlzLl9zeW1saW5rUGF0aHMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5fdGhyb3R0bGVkLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuX2Nsb3NlUHJvbWlzZSA9IGNsb3NlcnMubGVuZ3RoXG4gICAgICAgICAgICA/IFByb21pc2UuYWxsKGNsb3NlcnMpLnRoZW4oKCkgPT4gdW5kZWZpbmVkKVxuICAgICAgICAgICAgOiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Nsb3NlUHJvbWlzZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRXhwb3NlIGxpc3Qgb2Ygd2F0Y2hlZCBwYXRoc1xuICAgICAqIEByZXR1cm5zIGZvciBjaGFpbmluZ1xuICAgICAqL1xuICAgIGdldFdhdGNoZWQoKSB7XG4gICAgICAgIGNvbnN0IHdhdGNoTGlzdCA9IHt9O1xuICAgICAgICB0aGlzLl93YXRjaGVkLmZvckVhY2goKGVudHJ5LCBkaXIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IHRoaXMub3B0aW9ucy5jd2QgPyBzeXNQYXRoLnJlbGF0aXZlKHRoaXMub3B0aW9ucy5jd2QsIGRpcikgOiBkaXI7XG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IGtleSB8fCBPTkVfRE9UO1xuICAgICAgICAgICAgd2F0Y2hMaXN0W2luZGV4XSA9IGVudHJ5LmdldENoaWxkcmVuKCkuc29ydCgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHdhdGNoTGlzdDtcbiAgICB9XG4gICAgZW1pdFdpdGhBbGwoZXZlbnQsIGFyZ3MpIHtcbiAgICAgICAgdGhpcy5lbWl0KGV2ZW50LCAuLi5hcmdzKTtcbiAgICAgICAgaWYgKGV2ZW50ICE9PSBFVi5FUlJPUilcbiAgICAgICAgICAgIHRoaXMuZW1pdChFVi5BTEwsIGV2ZW50LCAuLi5hcmdzKTtcbiAgICB9XG4gICAgLy8gQ29tbW9uIGhlbHBlcnNcbiAgICAvLyAtLS0tLS0tLS0tLS0tLVxuICAgIC8qKlxuICAgICAqIE5vcm1hbGl6ZSBhbmQgZW1pdCBldmVudHMuXG4gICAgICogQ2FsbGluZyBfZW1pdCBET0VTIE5PVCBNRUFOIGVtaXQoKSB3b3VsZCBiZSBjYWxsZWQhXG4gICAgICogQHBhcmFtIGV2ZW50IFR5cGUgb2YgZXZlbnRcbiAgICAgKiBAcGFyYW0gcGF0aCBGaWxlIG9yIGRpcmVjdG9yeSBwYXRoXG4gICAgICogQHBhcmFtIHN0YXRzIGFyZ3VtZW50cyB0byBiZSBwYXNzZWQgd2l0aCBldmVudFxuICAgICAqIEByZXR1cm5zIHRoZSBlcnJvciBpZiBkZWZpbmVkLCBvdGhlcndpc2UgdGhlIHZhbHVlIG9mIHRoZSBGU1dhdGNoZXIgaW5zdGFuY2UncyBgY2xvc2VkYCBmbGFnXG4gICAgICovXG4gICAgYXN5bmMgX2VtaXQoZXZlbnQsIHBhdGgsIHN0YXRzKSB7XG4gICAgICAgIGlmICh0aGlzLmNsb3NlZClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY29uc3Qgb3B0cyA9IHRoaXMub3B0aW9ucztcbiAgICAgICAgaWYgKGlzV2luZG93cylcbiAgICAgICAgICAgIHBhdGggPSBzeXNQYXRoLm5vcm1hbGl6ZShwYXRoKTtcbiAgICAgICAgaWYgKG9wdHMuY3dkKVxuICAgICAgICAgICAgcGF0aCA9IHN5c1BhdGgucmVsYXRpdmUob3B0cy5jd2QsIHBhdGgpO1xuICAgICAgICBjb25zdCBhcmdzID0gW3BhdGhdO1xuICAgICAgICBpZiAoc3RhdHMgIT0gbnVsbClcbiAgICAgICAgICAgIGFyZ3MucHVzaChzdGF0cyk7XG4gICAgICAgIGNvbnN0IGF3ZiA9IG9wdHMuYXdhaXRXcml0ZUZpbmlzaDtcbiAgICAgICAgbGV0IHB3O1xuICAgICAgICBpZiAoYXdmICYmIChwdyA9IHRoaXMuX3BlbmRpbmdXcml0ZXMuZ2V0KHBhdGgpKSkge1xuICAgICAgICAgICAgcHcubGFzdENoYW5nZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBpZiAob3B0cy5hdG9taWMpIHtcbiAgICAgICAgICAgIGlmIChldmVudCA9PT0gRVYuVU5MSU5LKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcGVuZGluZ1VubGlua3Muc2V0KHBhdGgsIFtldmVudCwgLi4uYXJnc10pO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9wZW5kaW5nVW5saW5rcy5mb3JFYWNoKChlbnRyeSwgcGF0aCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0KC4uLmVudHJ5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdChFVi5BTEwsIC4uLmVudHJ5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3BlbmRpbmdVbmxpbmtzLmRlbGV0ZShwYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSwgdHlwZW9mIG9wdHMuYXRvbWljID09PSAnbnVtYmVyJyA/IG9wdHMuYXRvbWljIDogMTAwKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChldmVudCA9PT0gRVYuQUREICYmIHRoaXMuX3BlbmRpbmdVbmxpbmtzLmhhcyhwYXRoKSkge1xuICAgICAgICAgICAgICAgIGV2ZW50ID0gRVYuQ0hBTkdFO1xuICAgICAgICAgICAgICAgIHRoaXMuX3BlbmRpbmdVbmxpbmtzLmRlbGV0ZShwYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoYXdmICYmIChldmVudCA9PT0gRVYuQUREIHx8IGV2ZW50ID09PSBFVi5DSEFOR0UpICYmIHRoaXMuX3JlYWR5RW1pdHRlZCkge1xuICAgICAgICAgICAgY29uc3QgYXdmRW1pdCA9IChlcnIsIHN0YXRzKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBldmVudCA9IEVWLkVSUk9SO1xuICAgICAgICAgICAgICAgICAgICBhcmdzWzBdID0gZXJyO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXRXaXRoQWxsKGV2ZW50LCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoc3RhdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgc3RhdHMgZG9lc24ndCBleGlzdCB0aGUgZmlsZSBtdXN0IGhhdmUgYmVlbiBkZWxldGVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3NbMV0gPSBzdGF0cztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MucHVzaChzdGF0cyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0V2l0aEFsbChldmVudCwgYXJncyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMuX2F3YWl0V3JpdGVGaW5pc2gocGF0aCwgYXdmLnN0YWJpbGl0eVRocmVzaG9sZCwgZXZlbnQsIGF3ZkVtaXQpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGV2ZW50ID09PSBFVi5DSEFOR0UpIHtcbiAgICAgICAgICAgIGNvbnN0IGlzVGhyb3R0bGVkID0gIXRoaXMuX3Rocm90dGxlKEVWLkNIQU5HRSwgcGF0aCwgNTApO1xuICAgICAgICAgICAgaWYgKGlzVGhyb3R0bGVkKVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChvcHRzLmFsd2F5c1N0YXQgJiZcbiAgICAgICAgICAgIHN0YXRzID09PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgIChldmVudCA9PT0gRVYuQUREIHx8IGV2ZW50ID09PSBFVi5BRERfRElSIHx8IGV2ZW50ID09PSBFVi5DSEFOR0UpKSB7XG4gICAgICAgICAgICBjb25zdCBmdWxsUGF0aCA9IG9wdHMuY3dkID8gc3lzUGF0aC5qb2luKG9wdHMuY3dkLCBwYXRoKSA6IHBhdGg7XG4gICAgICAgICAgICBsZXQgc3RhdHM7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHN0YXRzID0gYXdhaXQgc3RhdChmdWxsUGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgLy8gZG8gbm90aGluZ1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gU3VwcHJlc3MgZXZlbnQgd2hlbiBmc19zdGF0IGZhaWxzLCB0byBhdm9pZCBzZW5kaW5nIHVuZGVmaW5lZCAnc3RhdCdcbiAgICAgICAgICAgIGlmICghc3RhdHMgfHwgdGhpcy5jbG9zZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgYXJncy5wdXNoKHN0YXRzKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmVtaXRXaXRoQWxsKGV2ZW50LCBhcmdzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENvbW1vbiBoYW5kbGVyIGZvciBlcnJvcnNcbiAgICAgKiBAcmV0dXJucyBUaGUgZXJyb3IgaWYgZGVmaW5lZCwgb3RoZXJ3aXNlIHRoZSB2YWx1ZSBvZiB0aGUgRlNXYXRjaGVyIGluc3RhbmNlJ3MgYGNsb3NlZGAgZmxhZ1xuICAgICAqL1xuICAgIF9oYW5kbGVFcnJvcihlcnJvcikge1xuICAgICAgICBjb25zdCBjb2RlID0gZXJyb3IgJiYgZXJyb3IuY29kZTtcbiAgICAgICAgaWYgKGVycm9yICYmXG4gICAgICAgICAgICBjb2RlICE9PSAnRU5PRU5UJyAmJlxuICAgICAgICAgICAgY29kZSAhPT0gJ0VOT1RESVInICYmXG4gICAgICAgICAgICAoIXRoaXMub3B0aW9ucy5pZ25vcmVQZXJtaXNzaW9uRXJyb3JzIHx8IChjb2RlICE9PSAnRVBFUk0nICYmIGNvZGUgIT09ICdFQUNDRVMnKSkpIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdChFVi5FUlJPUiwgZXJyb3IpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlcnJvciB8fCB0aGlzLmNsb3NlZDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogSGVscGVyIHV0aWxpdHkgZm9yIHRocm90dGxpbmdcbiAgICAgKiBAcGFyYW0gYWN0aW9uVHlwZSB0eXBlIGJlaW5nIHRocm90dGxlZFxuICAgICAqIEBwYXJhbSBwYXRoIGJlaW5nIGFjdGVkIHVwb25cbiAgICAgKiBAcGFyYW0gdGltZW91dCBkdXJhdGlvbiBvZiB0aW1lIHRvIHN1cHByZXNzIGR1cGxpY2F0ZSBhY3Rpb25zXG4gICAgICogQHJldHVybnMgdHJhY2tpbmcgb2JqZWN0IG9yIGZhbHNlIGlmIGFjdGlvbiBzaG91bGQgYmUgc3VwcHJlc3NlZFxuICAgICAqL1xuICAgIF90aHJvdHRsZShhY3Rpb25UeXBlLCBwYXRoLCB0aW1lb3V0KSB7XG4gICAgICAgIGlmICghdGhpcy5fdGhyb3R0bGVkLmhhcyhhY3Rpb25UeXBlKSkge1xuICAgICAgICAgICAgdGhpcy5fdGhyb3R0bGVkLnNldChhY3Rpb25UeXBlLCBuZXcgTWFwKCkpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGFjdGlvbiA9IHRoaXMuX3Rocm90dGxlZC5nZXQoYWN0aW9uVHlwZSk7XG4gICAgICAgIGlmICghYWN0aW9uKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhbGlkIHRocm90dGxlJyk7XG4gICAgICAgIGNvbnN0IGFjdGlvblBhdGggPSBhY3Rpb24uZ2V0KHBhdGgpO1xuICAgICAgICBpZiAoYWN0aW9uUGF0aCkge1xuICAgICAgICAgICAgYWN0aW9uUGF0aC5jb3VudCsrO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBwcmVmZXItY29uc3RcbiAgICAgICAgbGV0IHRpbWVvdXRPYmplY3Q7XG4gICAgICAgIGNvbnN0IGNsZWFyID0gKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaXRlbSA9IGFjdGlvbi5nZXQocGF0aCk7XG4gICAgICAgICAgICBjb25zdCBjb3VudCA9IGl0ZW0gPyBpdGVtLmNvdW50IDogMDtcbiAgICAgICAgICAgIGFjdGlvbi5kZWxldGUocGF0aCk7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dE9iamVjdCk7XG4gICAgICAgICAgICBpZiAoaXRlbSlcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoaXRlbS50aW1lb3V0T2JqZWN0KTtcbiAgICAgICAgICAgIHJldHVybiBjb3VudDtcbiAgICAgICAgfTtcbiAgICAgICAgdGltZW91dE9iamVjdCA9IHNldFRpbWVvdXQoY2xlYXIsIHRpbWVvdXQpO1xuICAgICAgICBjb25zdCB0aHIgPSB7IHRpbWVvdXRPYmplY3QsIGNsZWFyLCBjb3VudDogMCB9O1xuICAgICAgICBhY3Rpb24uc2V0KHBhdGgsIHRocik7XG4gICAgICAgIHJldHVybiB0aHI7XG4gICAgfVxuICAgIF9pbmNyUmVhZHlDb3VudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JlYWR5Q291bnQrKztcbiAgICB9XG4gICAgLyoqXG4gICAgICogQXdhaXRzIHdyaXRlIG9wZXJhdGlvbiB0byBmaW5pc2guXG4gICAgICogUG9sbHMgYSBuZXdseSBjcmVhdGVkIGZpbGUgZm9yIHNpemUgdmFyaWF0aW9ucy4gV2hlbiBmaWxlcyBzaXplIGRvZXMgbm90IGNoYW5nZSBmb3IgJ3RocmVzaG9sZCcgbWlsbGlzZWNvbmRzIGNhbGxzIGNhbGxiYWNrLlxuICAgICAqIEBwYXJhbSBwYXRoIGJlaW5nIGFjdGVkIHVwb25cbiAgICAgKiBAcGFyYW0gdGhyZXNob2xkIFRpbWUgaW4gbWlsbGlzZWNvbmRzIGEgZmlsZSBzaXplIG11c3QgYmUgZml4ZWQgYmVmb3JlIGFja25vd2xlZGdpbmcgd3JpdGUgT1AgaXMgZmluaXNoZWRcbiAgICAgKiBAcGFyYW0gZXZlbnRcbiAgICAgKiBAcGFyYW0gYXdmRW1pdCBDYWxsYmFjayB0byBiZSBjYWxsZWQgd2hlbiByZWFkeSBmb3IgZXZlbnQgdG8gYmUgZW1pdHRlZC5cbiAgICAgKi9cbiAgICBfYXdhaXRXcml0ZUZpbmlzaChwYXRoLCB0aHJlc2hvbGQsIGV2ZW50LCBhd2ZFbWl0KSB7XG4gICAgICAgIGNvbnN0IGF3ZiA9IHRoaXMub3B0aW9ucy5hd2FpdFdyaXRlRmluaXNoO1xuICAgICAgICBpZiAodHlwZW9mIGF3ZiAhPT0gJ29iamVjdCcpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGNvbnN0IHBvbGxJbnRlcnZhbCA9IGF3Zi5wb2xsSW50ZXJ2YWw7XG4gICAgICAgIGxldCB0aW1lb3V0SGFuZGxlcjtcbiAgICAgICAgbGV0IGZ1bGxQYXRoID0gcGF0aDtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5jd2QgJiYgIXN5c1BhdGguaXNBYnNvbHV0ZShwYXRoKSkge1xuICAgICAgICAgICAgZnVsbFBhdGggPSBzeXNQYXRoLmpvaW4odGhpcy5vcHRpb25zLmN3ZCwgcGF0aCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgY29uc3Qgd3JpdGVzID0gdGhpcy5fcGVuZGluZ1dyaXRlcztcbiAgICAgICAgZnVuY3Rpb24gYXdhaXRXcml0ZUZpbmlzaEZuKHByZXZTdGF0KSB7XG4gICAgICAgICAgICBzdGF0Y2IoZnVsbFBhdGgsIChlcnIsIGN1clN0YXQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyIHx8ICF3cml0ZXMuaGFzKHBhdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIgJiYgZXJyLmNvZGUgIT09ICdFTk9FTlQnKVxuICAgICAgICAgICAgICAgICAgICAgICAgYXdmRW1pdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IG5vdyA9IE51bWJlcihuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgICAgICBpZiAocHJldlN0YXQgJiYgY3VyU3RhdC5zaXplICE9PSBwcmV2U3RhdC5zaXplKSB7XG4gICAgICAgICAgICAgICAgICAgIHdyaXRlcy5nZXQocGF0aCkubGFzdENoYW5nZSA9IG5vdztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgcHcgPSB3cml0ZXMuZ2V0KHBhdGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRmID0gbm93IC0gcHcubGFzdENoYW5nZTtcbiAgICAgICAgICAgICAgICBpZiAoZGYgPj0gdGhyZXNob2xkKSB7XG4gICAgICAgICAgICAgICAgICAgIHdyaXRlcy5kZWxldGUocGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIGF3ZkVtaXQodW5kZWZpbmVkLCBjdXJTdGF0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWVvdXRIYW5kbGVyID0gc2V0VGltZW91dChhd2FpdFdyaXRlRmluaXNoRm4sIHBvbGxJbnRlcnZhbCwgY3VyU3RhdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF3cml0ZXMuaGFzKHBhdGgpKSB7XG4gICAgICAgICAgICB3cml0ZXMuc2V0KHBhdGgsIHtcbiAgICAgICAgICAgICAgICBsYXN0Q2hhbmdlOiBub3csXG4gICAgICAgICAgICAgICAgY2FuY2VsV2FpdDogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB3cml0ZXMuZGVsZXRlKHBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dEhhbmRsZXIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnQ7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGltZW91dEhhbmRsZXIgPSBzZXRUaW1lb3V0KGF3YWl0V3JpdGVGaW5pc2hGbiwgcG9sbEludGVydmFsKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgdXNlciBoYXMgYXNrZWQgdG8gaWdub3JlIHRoaXMgcGF0aC5cbiAgICAgKi9cbiAgICBfaXNJZ25vcmVkKHBhdGgsIHN0YXRzKSB7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuYXRvbWljICYmIERPVF9SRS50ZXN0KHBhdGgpKVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIGlmICghdGhpcy5fdXNlcklnbm9yZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgY3dkIH0gPSB0aGlzLm9wdGlvbnM7XG4gICAgICAgICAgICBjb25zdCBpZ24gPSB0aGlzLm9wdGlvbnMuaWdub3JlZDtcbiAgICAgICAgICAgIGNvbnN0IGlnbm9yZWQgPSAoaWduIHx8IFtdKS5tYXAobm9ybWFsaXplSWdub3JlZChjd2QpKTtcbiAgICAgICAgICAgIGNvbnN0IGlnbm9yZWRQYXRocyA9IFsuLi50aGlzLl9pZ25vcmVkUGF0aHNdO1xuICAgICAgICAgICAgY29uc3QgbGlzdCA9IFsuLi5pZ25vcmVkUGF0aHMubWFwKG5vcm1hbGl6ZUlnbm9yZWQoY3dkKSksIC4uLmlnbm9yZWRdO1xuICAgICAgICAgICAgdGhpcy5fdXNlcklnbm9yZWQgPSBhbnltYXRjaChsaXN0LCB1bmRlZmluZWQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl91c2VySWdub3JlZChwYXRoLCBzdGF0cyk7XG4gICAgfVxuICAgIF9pc250SWdub3JlZChwYXRoLCBzdGF0KSB7XG4gICAgICAgIHJldHVybiAhdGhpcy5faXNJZ25vcmVkKHBhdGgsIHN0YXQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBQcm92aWRlcyBhIHNldCBvZiBjb21tb24gaGVscGVycyBhbmQgcHJvcGVydGllcyByZWxhdGluZyB0byBzeW1saW5rIGhhbmRsaW5nLlxuICAgICAqIEBwYXJhbSBwYXRoIGZpbGUgb3IgZGlyZWN0b3J5IHBhdHRlcm4gYmVpbmcgd2F0Y2hlZFxuICAgICAqL1xuICAgIF9nZXRXYXRjaEhlbHBlcnMocGF0aCkge1xuICAgICAgICByZXR1cm4gbmV3IFdhdGNoSGVscGVyKHBhdGgsIHRoaXMub3B0aW9ucy5mb2xsb3dTeW1saW5rcywgdGhpcyk7XG4gICAgfVxuICAgIC8vIERpcmVjdG9yeSBoZWxwZXJzXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvKipcbiAgICAgKiBQcm92aWRlcyBkaXJlY3RvcnkgdHJhY2tpbmcgb2JqZWN0c1xuICAgICAqIEBwYXJhbSBkaXJlY3RvcnkgcGF0aCBvZiB0aGUgZGlyZWN0b3J5XG4gICAgICovXG4gICAgX2dldFdhdGNoZWREaXIoZGlyZWN0b3J5KSB7XG4gICAgICAgIGNvbnN0IGRpciA9IHN5c1BhdGgucmVzb2x2ZShkaXJlY3RvcnkpO1xuICAgICAgICBpZiAoIXRoaXMuX3dhdGNoZWQuaGFzKGRpcikpXG4gICAgICAgICAgICB0aGlzLl93YXRjaGVkLnNldChkaXIsIG5ldyBEaXJFbnRyeShkaXIsIHRoaXMuX2JvdW5kUmVtb3ZlKSk7XG4gICAgICAgIHJldHVybiB0aGlzLl93YXRjaGVkLmdldChkaXIpO1xuICAgIH1cbiAgICAvLyBGaWxlIGhlbHBlcnNcbiAgICAvLyAtLS0tLS0tLS0tLS1cbiAgICAvKipcbiAgICAgKiBDaGVjayBmb3IgcmVhZCBwZXJtaXNzaW9uczogaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9hLzExNzgxNDA0LzEzNTg0MDVcbiAgICAgKi9cbiAgICBfaGFzUmVhZFBlcm1pc3Npb25zKHN0YXRzKSB7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuaWdub3JlUGVybWlzc2lvbkVycm9ycylcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICByZXR1cm4gQm9vbGVhbihOdW1iZXIoc3RhdHMubW9kZSkgJiAwbzQwMCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgZW1pdHRpbmcgdW5saW5rIGV2ZW50cyBmb3JcbiAgICAgKiBmaWxlcyBhbmQgZGlyZWN0b3JpZXMsIGFuZCB2aWEgcmVjdXJzaW9uLCBmb3JcbiAgICAgKiBmaWxlcyBhbmQgZGlyZWN0b3JpZXMgd2l0aGluIGRpcmVjdG9yaWVzIHRoYXQgYXJlIHVubGlua2VkXG4gICAgICogQHBhcmFtIGRpcmVjdG9yeSB3aXRoaW4gd2hpY2ggdGhlIGZvbGxvd2luZyBpdGVtIGlzIGxvY2F0ZWRcbiAgICAgKiBAcGFyYW0gaXRlbSAgICAgIGJhc2UgcGF0aCBvZiBpdGVtL2RpcmVjdG9yeVxuICAgICAqL1xuICAgIF9yZW1vdmUoZGlyZWN0b3J5LCBpdGVtLCBpc0RpcmVjdG9yeSkge1xuICAgICAgICAvLyBpZiB3aGF0IGlzIGJlaW5nIGRlbGV0ZWQgaXMgYSBkaXJlY3RvcnksIGdldCB0aGF0IGRpcmVjdG9yeSdzIHBhdGhzXG4gICAgICAgIC8vIGZvciByZWN1cnNpdmUgZGVsZXRpbmcgYW5kIGNsZWFuaW5nIG9mIHdhdGNoZWQgb2JqZWN0XG4gICAgICAgIC8vIGlmIGl0IGlzIG5vdCBhIGRpcmVjdG9yeSwgbmVzdGVkRGlyZWN0b3J5Q2hpbGRyZW4gd2lsbCBiZSBlbXB0eSBhcnJheVxuICAgICAgICBjb25zdCBwYXRoID0gc3lzUGF0aC5qb2luKGRpcmVjdG9yeSwgaXRlbSk7XG4gICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gc3lzUGF0aC5yZXNvbHZlKHBhdGgpO1xuICAgICAgICBpc0RpcmVjdG9yeSA9XG4gICAgICAgICAgICBpc0RpcmVjdG9yeSAhPSBudWxsID8gaXNEaXJlY3RvcnkgOiB0aGlzLl93YXRjaGVkLmhhcyhwYXRoKSB8fCB0aGlzLl93YXRjaGVkLmhhcyhmdWxsUGF0aCk7XG4gICAgICAgIC8vIHByZXZlbnQgZHVwbGljYXRlIGhhbmRsaW5nIGluIGNhc2Ugb2YgYXJyaXZpbmcgaGVyZSBuZWFybHkgc2ltdWx0YW5lb3VzbHlcbiAgICAgICAgLy8gdmlhIG11bHRpcGxlIHBhdGhzIChzdWNoIGFzIF9oYW5kbGVGaWxlIGFuZCBfaGFuZGxlRGlyKVxuICAgICAgICBpZiAoIXRoaXMuX3Rocm90dGxlKCdyZW1vdmUnLCBwYXRoLCAxMDApKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAvLyBpZiB0aGUgb25seSB3YXRjaGVkIGZpbGUgaXMgcmVtb3ZlZCwgd2F0Y2ggZm9yIGl0cyByZXR1cm5cbiAgICAgICAgaWYgKCFpc0RpcmVjdG9yeSAmJiB0aGlzLl93YXRjaGVkLnNpemUgPT09IDEpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkKGRpcmVjdG9yeSwgaXRlbSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGhpcyB3aWxsIGNyZWF0ZSBhIG5ldyBlbnRyeSBpbiB0aGUgd2F0Y2hlZCBvYmplY3QgaW4gZWl0aGVyIGNhc2VcbiAgICAgICAgLy8gc28gd2UgZ290IHRvIGRvIHRoZSBkaXJlY3RvcnkgY2hlY2sgYmVmb3JlaGFuZFxuICAgICAgICBjb25zdCB3cCA9IHRoaXMuX2dldFdhdGNoZWREaXIocGF0aCk7XG4gICAgICAgIGNvbnN0IG5lc3RlZERpcmVjdG9yeUNoaWxkcmVuID0gd3AuZ2V0Q2hpbGRyZW4oKTtcbiAgICAgICAgLy8gUmVjdXJzaXZlbHkgcmVtb3ZlIGNoaWxkcmVuIGRpcmVjdG9yaWVzIC8gZmlsZXMuXG4gICAgICAgIG5lc3RlZERpcmVjdG9yeUNoaWxkcmVuLmZvckVhY2goKG5lc3RlZCkgPT4gdGhpcy5fcmVtb3ZlKHBhdGgsIG5lc3RlZCkpO1xuICAgICAgICAvLyBDaGVjayBpZiBpdGVtIHdhcyBvbiB0aGUgd2F0Y2hlZCBsaXN0IGFuZCByZW1vdmUgaXRcbiAgICAgICAgY29uc3QgcGFyZW50ID0gdGhpcy5fZ2V0V2F0Y2hlZERpcihkaXJlY3RvcnkpO1xuICAgICAgICBjb25zdCB3YXNUcmFja2VkID0gcGFyZW50LmhhcyhpdGVtKTtcbiAgICAgICAgcGFyZW50LnJlbW92ZShpdGVtKTtcbiAgICAgICAgLy8gRml4ZXMgaXNzdWUgIzEwNDIgLT4gUmVsYXRpdmUgcGF0aHMgd2VyZSBkZXRlY3RlZCBhbmQgYWRkZWQgYXMgc3ltbGlua3NcbiAgICAgICAgLy8gKGh0dHBzOi8vZ2l0aHViLmNvbS9wYXVsbWlsbHIvY2hva2lkYXIvYmxvYi9lMTc1M2RkYmM5NTcxYmRjMzNiNGE0YWYxNzJkNTJjYjZlNjExYzEwL2xpYi9ub2RlZnMtaGFuZGxlci5qcyNMNjEyKSxcbiAgICAgICAgLy8gYnV0IG5ldmVyIHJlbW92ZWQgZnJvbSB0aGUgbWFwIGluIGNhc2UgdGhlIHBhdGggd2FzIGRlbGV0ZWQuXG4gICAgICAgIC8vIFRoaXMgbGVhZHMgdG8gYW4gaW5jb3JyZWN0IHN0YXRlIGlmIHRoZSBwYXRoIHdhcyByZWNyZWF0ZWQ6XG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9wYXVsbWlsbHIvY2hva2lkYXIvYmxvYi9lMTc1M2RkYmM5NTcxYmRjMzNiNGE0YWYxNzJkNTJjYjZlNjExYzEwL2xpYi9ub2RlZnMtaGFuZGxlci5qcyNMNTUzXG4gICAgICAgIGlmICh0aGlzLl9zeW1saW5rUGF0aHMuaGFzKGZ1bGxQYXRoKSkge1xuICAgICAgICAgICAgdGhpcy5fc3ltbGlua1BhdGhzLmRlbGV0ZShmdWxsUGF0aCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgd2Ugd2FpdCBmb3IgdGhpcyBmaWxlIHRvIGJlIGZ1bGx5IHdyaXR0ZW4sIGNhbmNlbCB0aGUgd2FpdC5cbiAgICAgICAgbGV0IHJlbFBhdGggPSBwYXRoO1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmN3ZClcbiAgICAgICAgICAgIHJlbFBhdGggPSBzeXNQYXRoLnJlbGF0aXZlKHRoaXMub3B0aW9ucy5jd2QsIHBhdGgpO1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmF3YWl0V3JpdGVGaW5pc2ggJiYgdGhpcy5fcGVuZGluZ1dyaXRlcy5oYXMocmVsUGF0aCkpIHtcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gdGhpcy5fcGVuZGluZ1dyaXRlcy5nZXQocmVsUGF0aCkuY2FuY2VsV2FpdCgpO1xuICAgICAgICAgICAgaWYgKGV2ZW50ID09PSBFVi5BREQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRoZSBFbnRyeSB3aWxsIGVpdGhlciBiZSBhIGRpcmVjdG9yeSB0aGF0IGp1c3QgZ290IHJlbW92ZWRcbiAgICAgICAgLy8gb3IgYSBib2d1cyBlbnRyeSB0byBhIGZpbGUsIGluIGVpdGhlciBjYXNlIHdlIGhhdmUgdG8gcmVtb3ZlIGl0XG4gICAgICAgIHRoaXMuX3dhdGNoZWQuZGVsZXRlKHBhdGgpO1xuICAgICAgICB0aGlzLl93YXRjaGVkLmRlbGV0ZShmdWxsUGF0aCk7XG4gICAgICAgIGNvbnN0IGV2ZW50TmFtZSA9IGlzRGlyZWN0b3J5ID8gRVYuVU5MSU5LX0RJUiA6IEVWLlVOTElOSztcbiAgICAgICAgaWYgKHdhc1RyYWNrZWQgJiYgIXRoaXMuX2lzSWdub3JlZChwYXRoKSlcbiAgICAgICAgICAgIHRoaXMuX2VtaXQoZXZlbnROYW1lLCBwYXRoKTtcbiAgICAgICAgLy8gQXZvaWQgY29uZmxpY3RzIGlmIHdlIGxhdGVyIGNyZWF0ZSBhbm90aGVyIGZpbGUgd2l0aCB0aGUgc2FtZSBuYW1lXG4gICAgICAgIHRoaXMuX2Nsb3NlUGF0aChwYXRoKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xvc2VzIGFsbCB3YXRjaGVycyBmb3IgYSBwYXRoXG4gICAgICovXG4gICAgX2Nsb3NlUGF0aChwYXRoKSB7XG4gICAgICAgIHRoaXMuX2Nsb3NlRmlsZShwYXRoKTtcbiAgICAgICAgY29uc3QgZGlyID0gc3lzUGF0aC5kaXJuYW1lKHBhdGgpO1xuICAgICAgICB0aGlzLl9nZXRXYXRjaGVkRGlyKGRpcikucmVtb3ZlKHN5c1BhdGguYmFzZW5hbWUocGF0aCkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDbG9zZXMgb25seSBmaWxlLXNwZWNpZmljIHdhdGNoZXJzXG4gICAgICovXG4gICAgX2Nsb3NlRmlsZShwYXRoKSB7XG4gICAgICAgIGNvbnN0IGNsb3NlcnMgPSB0aGlzLl9jbG9zZXJzLmdldChwYXRoKTtcbiAgICAgICAgaWYgKCFjbG9zZXJzKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjbG9zZXJzLmZvckVhY2goKGNsb3NlcikgPT4gY2xvc2VyKCkpO1xuICAgICAgICB0aGlzLl9jbG9zZXJzLmRlbGV0ZShwYXRoKTtcbiAgICB9XG4gICAgX2FkZFBhdGhDbG9zZXIocGF0aCwgY2xvc2VyKSB7XG4gICAgICAgIGlmICghY2xvc2VyKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBsZXQgbGlzdCA9IHRoaXMuX2Nsb3NlcnMuZ2V0KHBhdGgpO1xuICAgICAgICBpZiAoIWxpc3QpIHtcbiAgICAgICAgICAgIGxpc3QgPSBbXTtcbiAgICAgICAgICAgIHRoaXMuX2Nsb3NlcnMuc2V0KHBhdGgsIGxpc3QpO1xuICAgICAgICB9XG4gICAgICAgIGxpc3QucHVzaChjbG9zZXIpO1xuICAgIH1cbiAgICBfcmVhZGRpcnAocm9vdCwgb3B0cykge1xuICAgICAgICBpZiAodGhpcy5jbG9zZWQpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7IHR5cGU6IEVWLkFMTCwgYWx3YXlzU3RhdDogdHJ1ZSwgbHN0YXQ6IHRydWUsIC4uLm9wdHMsIGRlcHRoOiAwIH07XG4gICAgICAgIGxldCBzdHJlYW0gPSByZWFkZGlycChyb290LCBvcHRpb25zKTtcbiAgICAgICAgdGhpcy5fc3RyZWFtcy5hZGQoc3RyZWFtKTtcbiAgICAgICAgc3RyZWFtLm9uY2UoU1RSX0NMT1NFLCAoKSA9PiB7XG4gICAgICAgICAgICBzdHJlYW0gPSB1bmRlZmluZWQ7XG4gICAgICAgIH0pO1xuICAgICAgICBzdHJlYW0ub25jZShTVFJfRU5ELCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoc3RyZWFtKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc3RyZWFtcy5kZWxldGUoc3RyZWFtKTtcbiAgICAgICAgICAgICAgICBzdHJlYW0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3RyZWFtO1xuICAgIH1cbn1cbi8qKlxuICogSW5zdGFudGlhdGVzIHdhdGNoZXIgd2l0aCBwYXRocyB0byBiZSB0cmFja2VkLlxuICogQHBhcmFtIHBhdGhzIGZpbGUgLyBkaXJlY3RvcnkgcGF0aHNcbiAqIEBwYXJhbSBvcHRpb25zIG9wdHMsIHN1Y2ggYXMgYGF0b21pY2AsIGBhd2FpdFdyaXRlRmluaXNoYCwgYGlnbm9yZWRgLCBhbmQgb3RoZXJzXG4gKiBAcmV0dXJucyBhbiBpbnN0YW5jZSBvZiBGU1dhdGNoZXIgZm9yIGNoYWluaW5nLlxuICogQGV4YW1wbGVcbiAqIGNvbnN0IHdhdGNoZXIgPSB3YXRjaCgnLicpLm9uKCdhbGwnLCAoZXZlbnQsIHBhdGgpID0+IHsgY29uc29sZS5sb2coZXZlbnQsIHBhdGgpOyB9KTtcbiAqIHdhdGNoKCcuJywgeyBhdG9taWM6IHRydWUsIGF3YWl0V3JpdGVGaW5pc2g6IHRydWUsIGlnbm9yZWQ6IChmLCBzdGF0cykgPT4gc3RhdHM/LmlzRmlsZSgpICYmICFmLmVuZHNXaXRoKCcuanMnKSB9KVxuICovXG5leHBvcnQgZnVuY3Rpb24gd2F0Y2gocGF0aHMsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHdhdGNoZXIgPSBuZXcgRlNXYXRjaGVyKG9wdGlvbnMpO1xuICAgIHdhdGNoZXIuYWRkKHBhdGhzKTtcbiAgICByZXR1cm4gd2F0Y2hlcjtcbn1cbmV4cG9ydCBkZWZhdWx0IHsgd2F0Y2gsIEZTV2F0Y2hlciB9O1xuIiwgImltcG9ydCB7IHN0YXQsIGxzdGF0LCByZWFkZGlyLCByZWFscGF0aCB9IGZyb20gJ25vZGU6ZnMvcHJvbWlzZXMnO1xuaW1wb3J0IHsgUmVhZGFibGUgfSBmcm9tICdub2RlOnN0cmVhbSc7XG5pbXBvcnQgeyByZXNvbHZlIGFzIHByZXNvbHZlLCByZWxhdGl2ZSBhcyBwcmVsYXRpdmUsIGpvaW4gYXMgcGpvaW4sIHNlcCBhcyBwc2VwIH0gZnJvbSAnbm9kZTpwYXRoJztcbmV4cG9ydCBjb25zdCBFbnRyeVR5cGVzID0ge1xuICAgIEZJTEVfVFlQRTogJ2ZpbGVzJyxcbiAgICBESVJfVFlQRTogJ2RpcmVjdG9yaWVzJyxcbiAgICBGSUxFX0RJUl9UWVBFOiAnZmlsZXNfZGlyZWN0b3JpZXMnLFxuICAgIEVWRVJZVEhJTkdfVFlQRTogJ2FsbCcsXG59O1xuY29uc3QgZGVmYXVsdE9wdGlvbnMgPSB7XG4gICAgcm9vdDogJy4nLFxuICAgIGZpbGVGaWx0ZXI6IChfZW50cnlJbmZvKSA9PiB0cnVlLFxuICAgIGRpcmVjdG9yeUZpbHRlcjogKF9lbnRyeUluZm8pID0+IHRydWUsXG4gICAgdHlwZTogRW50cnlUeXBlcy5GSUxFX1RZUEUsXG4gICAgbHN0YXQ6IGZhbHNlLFxuICAgIGRlcHRoOiAyMTQ3NDgzNjQ4LFxuICAgIGFsd2F5c1N0YXQ6IGZhbHNlLFxuICAgIGhpZ2hXYXRlck1hcms6IDQwOTYsXG59O1xuT2JqZWN0LmZyZWV6ZShkZWZhdWx0T3B0aW9ucyk7XG5jb25zdCBSRUNVUlNJVkVfRVJST1JfQ09ERSA9ICdSRUFERElSUF9SRUNVUlNJVkVfRVJST1InO1xuY29uc3QgTk9STUFMX0ZMT1dfRVJST1JTID0gbmV3IFNldChbJ0VOT0VOVCcsICdFUEVSTScsICdFQUNDRVMnLCAnRUxPT1AnLCBSRUNVUlNJVkVfRVJST1JfQ09ERV0pO1xuY29uc3QgQUxMX1RZUEVTID0gW1xuICAgIEVudHJ5VHlwZXMuRElSX1RZUEUsXG4gICAgRW50cnlUeXBlcy5FVkVSWVRISU5HX1RZUEUsXG4gICAgRW50cnlUeXBlcy5GSUxFX0RJUl9UWVBFLFxuICAgIEVudHJ5VHlwZXMuRklMRV9UWVBFLFxuXTtcbmNvbnN0IERJUl9UWVBFUyA9IG5ldyBTZXQoW1xuICAgIEVudHJ5VHlwZXMuRElSX1RZUEUsXG4gICAgRW50cnlUeXBlcy5FVkVSWVRISU5HX1RZUEUsXG4gICAgRW50cnlUeXBlcy5GSUxFX0RJUl9UWVBFLFxuXSk7XG5jb25zdCBGSUxFX1RZUEVTID0gbmV3IFNldChbXG4gICAgRW50cnlUeXBlcy5FVkVSWVRISU5HX1RZUEUsXG4gICAgRW50cnlUeXBlcy5GSUxFX0RJUl9UWVBFLFxuICAgIEVudHJ5VHlwZXMuRklMRV9UWVBFLFxuXSk7XG5jb25zdCBpc05vcm1hbEZsb3dFcnJvciA9IChlcnJvcikgPT4gTk9STUFMX0ZMT1dfRVJST1JTLmhhcyhlcnJvci5jb2RlKTtcbmNvbnN0IHdhbnRCaWdpbnRGc1N0YXRzID0gcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJztcbmNvbnN0IGVtcHR5Rm4gPSAoX2VudHJ5SW5mbykgPT4gdHJ1ZTtcbmNvbnN0IG5vcm1hbGl6ZUZpbHRlciA9IChmaWx0ZXIpID0+IHtcbiAgICBpZiAoZmlsdGVyID09PSB1bmRlZmluZWQpXG4gICAgICAgIHJldHVybiBlbXB0eUZuO1xuICAgIGlmICh0eXBlb2YgZmlsdGVyID09PSAnZnVuY3Rpb24nKVxuICAgICAgICByZXR1cm4gZmlsdGVyO1xuICAgIGlmICh0eXBlb2YgZmlsdGVyID09PSAnc3RyaW5nJykge1xuICAgICAgICBjb25zdCBmbCA9IGZpbHRlci50cmltKCk7XG4gICAgICAgIHJldHVybiAoZW50cnkpID0+IGVudHJ5LmJhc2VuYW1lID09PSBmbDtcbiAgICB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZmlsdGVyKSkge1xuICAgICAgICBjb25zdCB0ckl0ZW1zID0gZmlsdGVyLm1hcCgoaXRlbSkgPT4gaXRlbS50cmltKCkpO1xuICAgICAgICByZXR1cm4gKGVudHJ5KSA9PiB0ckl0ZW1zLnNvbWUoKGYpID0+IGVudHJ5LmJhc2VuYW1lID09PSBmKTtcbiAgICB9XG4gICAgcmV0dXJuIGVtcHR5Rm47XG59O1xuLyoqIFJlYWRhYmxlIHJlYWRkaXIgc3RyZWFtLCBlbWl0dGluZyBuZXcgZmlsZXMgYXMgdGhleSdyZSBiZWluZyBsaXN0ZWQuICovXG5leHBvcnQgY2xhc3MgUmVhZGRpcnBTdHJlYW0gZXh0ZW5kcyBSZWFkYWJsZSB7XG4gICAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIHN1cGVyKHtcbiAgICAgICAgICAgIG9iamVjdE1vZGU6IHRydWUsXG4gICAgICAgICAgICBhdXRvRGVzdHJveTogdHJ1ZSxcbiAgICAgICAgICAgIGhpZ2hXYXRlck1hcms6IG9wdGlvbnMuaGlnaFdhdGVyTWFyayxcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IG9wdHMgPSB7IC4uLmRlZmF1bHRPcHRpb25zLCAuLi5vcHRpb25zIH07XG4gICAgICAgIGNvbnN0IHsgcm9vdCwgdHlwZSB9ID0gb3B0cztcbiAgICAgICAgdGhpcy5fZmlsZUZpbHRlciA9IG5vcm1hbGl6ZUZpbHRlcihvcHRzLmZpbGVGaWx0ZXIpO1xuICAgICAgICB0aGlzLl9kaXJlY3RvcnlGaWx0ZXIgPSBub3JtYWxpemVGaWx0ZXIob3B0cy5kaXJlY3RvcnlGaWx0ZXIpO1xuICAgICAgICBjb25zdCBzdGF0TWV0aG9kID0gb3B0cy5sc3RhdCA/IGxzdGF0IDogc3RhdDtcbiAgICAgICAgLy8gVXNlIGJpZ2ludCBzdGF0cyBpZiBpdCdzIHdpbmRvd3MgYW5kIHN0YXQoKSBzdXBwb3J0cyBvcHRpb25zIChub2RlIDEwKykuXG4gICAgICAgIGlmICh3YW50QmlnaW50RnNTdGF0cykge1xuICAgICAgICAgICAgdGhpcy5fc3RhdCA9IChwYXRoKSA9PiBzdGF0TWV0aG9kKHBhdGgsIHsgYmlnaW50OiB0cnVlIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc3RhdCA9IHN0YXRNZXRob2Q7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fbWF4RGVwdGggPSBvcHRzLmRlcHRoID8/IGRlZmF1bHRPcHRpb25zLmRlcHRoO1xuICAgICAgICB0aGlzLl93YW50c0RpciA9IHR5cGUgPyBESVJfVFlQRVMuaGFzKHR5cGUpIDogZmFsc2U7XG4gICAgICAgIHRoaXMuX3dhbnRzRmlsZSA9IHR5cGUgPyBGSUxFX1RZUEVTLmhhcyh0eXBlKSA6IGZhbHNlO1xuICAgICAgICB0aGlzLl93YW50c0V2ZXJ5dGhpbmcgPSB0eXBlID09PSBFbnRyeVR5cGVzLkVWRVJZVEhJTkdfVFlQRTtcbiAgICAgICAgdGhpcy5fcm9vdCA9IHByZXNvbHZlKHJvb3QpO1xuICAgICAgICB0aGlzLl9pc0RpcmVudCA9ICFvcHRzLmFsd2F5c1N0YXQ7XG4gICAgICAgIHRoaXMuX3N0YXRzUHJvcCA9IHRoaXMuX2lzRGlyZW50ID8gJ2RpcmVudCcgOiAnc3RhdHMnO1xuICAgICAgICB0aGlzLl9yZE9wdGlvbnMgPSB7IGVuY29kaW5nOiAndXRmOCcsIHdpdGhGaWxlVHlwZXM6IHRoaXMuX2lzRGlyZW50IH07XG4gICAgICAgIC8vIExhdW5jaCBzdHJlYW0gd2l0aCBvbmUgcGFyZW50LCB0aGUgcm9vdCBkaXIuXG4gICAgICAgIHRoaXMucGFyZW50cyA9IFt0aGlzLl9leHBsb3JlRGlyKHJvb3QsIDEpXTtcbiAgICAgICAgdGhpcy5yZWFkaW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMucGFyZW50ID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBhc3luYyBfcmVhZChiYXRjaCkge1xuICAgICAgICBpZiAodGhpcy5yZWFkaW5nKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB0aGlzLnJlYWRpbmcgPSB0cnVlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgd2hpbGUgKCF0aGlzLmRlc3Ryb3llZCAmJiBiYXRjaCA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXIgPSB0aGlzLnBhcmVudDtcbiAgICAgICAgICAgICAgICBjb25zdCBmaWwgPSBwYXIgJiYgcGFyLmZpbGVzO1xuICAgICAgICAgICAgICAgIGlmIChmaWwgJiYgZmlsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBwYXRoLCBkZXB0aCB9ID0gcGFyO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzbGljZSA9IGZpbC5zcGxpY2UoMCwgYmF0Y2gpLm1hcCgoZGlyZW50KSA9PiB0aGlzLl9mb3JtYXRFbnRyeShkaXJlbnQsIHBhdGgpKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXdhaXRlZCA9IGF3YWl0IFByb21pc2UuYWxsKHNsaWNlKTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBhd2FpdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWVudHJ5KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZGVzdHJveWVkKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVudHJ5VHlwZSA9IGF3YWl0IHRoaXMuX2dldEVudHJ5VHlwZShlbnRyeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW50cnlUeXBlID09PSAnZGlyZWN0b3J5JyAmJiB0aGlzLl9kaXJlY3RvcnlGaWx0ZXIoZW50cnkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRlcHRoIDw9IHRoaXMuX21heERlcHRoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFyZW50cy5wdXNoKHRoaXMuX2V4cGxvcmVEaXIoZW50cnkuZnVsbFBhdGgsIGRlcHRoICsgMSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5fd2FudHNEaXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoKGVudHJ5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmF0Y2gtLTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICgoZW50cnlUeXBlID09PSAnZmlsZScgfHwgdGhpcy5faW5jbHVkZUFzRmlsZShlbnRyeSkpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fZmlsZUZpbHRlcihlbnRyeSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5fd2FudHNGaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaChlbnRyeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJhdGNoLS07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnQgPSB0aGlzLnBhcmVudHMucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2gobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcmVudCA9IGF3YWl0IHBhcmVudDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZGVzdHJveWVkKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdHJveShlcnJvcik7XG4gICAgICAgIH1cbiAgICAgICAgZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLnJlYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBhc3luYyBfZXhwbG9yZURpcihwYXRoLCBkZXB0aCkge1xuICAgICAgICBsZXQgZmlsZXM7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBmaWxlcyA9IGF3YWl0IHJlYWRkaXIocGF0aCwgdGhpcy5fcmRPcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIHRoaXMuX29uRXJyb3IoZXJyb3IpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IGZpbGVzLCBkZXB0aCwgcGF0aCB9O1xuICAgIH1cbiAgICBhc3luYyBfZm9ybWF0RW50cnkoZGlyZW50LCBwYXRoKSB7XG4gICAgICAgIGxldCBlbnRyeTtcbiAgICAgICAgY29uc3QgYmFzZW5hbWUgPSB0aGlzLl9pc0RpcmVudCA/IGRpcmVudC5uYW1lIDogZGlyZW50O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwcmVzb2x2ZShwam9pbihwYXRoLCBiYXNlbmFtZSkpO1xuICAgICAgICAgICAgZW50cnkgPSB7IHBhdGg6IHByZWxhdGl2ZSh0aGlzLl9yb290LCBmdWxsUGF0aCksIGZ1bGxQYXRoLCBiYXNlbmFtZSB9O1xuICAgICAgICAgICAgZW50cnlbdGhpcy5fc3RhdHNQcm9wXSA9IHRoaXMuX2lzRGlyZW50ID8gZGlyZW50IDogYXdhaXQgdGhpcy5fc3RhdChmdWxsUGF0aCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgdGhpcy5fb25FcnJvcihlcnIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlbnRyeTtcbiAgICB9XG4gICAgX29uRXJyb3IoZXJyKSB7XG4gICAgICAgIGlmIChpc05vcm1hbEZsb3dFcnJvcihlcnIpICYmICF0aGlzLmRlc3Ryb3llZCkge1xuICAgICAgICAgICAgdGhpcy5lbWl0KCd3YXJuJywgZXJyKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdHJveShlcnIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGFzeW5jIF9nZXRFbnRyeVR5cGUoZW50cnkpIHtcbiAgICAgICAgLy8gZW50cnkgbWF5IGJlIHVuZGVmaW5lZCwgYmVjYXVzZSBhIHdhcm5pbmcgb3IgYW4gZXJyb3Igd2VyZSBlbWl0dGVkXG4gICAgICAgIC8vIGFuZCB0aGUgc3RhdHNQcm9wIGlzIHVuZGVmaW5lZFxuICAgICAgICBpZiAoIWVudHJ5ICYmIHRoaXMuX3N0YXRzUHJvcCBpbiBlbnRyeSkge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHN0YXRzID0gZW50cnlbdGhpcy5fc3RhdHNQcm9wXTtcbiAgICAgICAgaWYgKHN0YXRzLmlzRmlsZSgpKVxuICAgICAgICAgICAgcmV0dXJuICdmaWxlJztcbiAgICAgICAgaWYgKHN0YXRzLmlzRGlyZWN0b3J5KCkpXG4gICAgICAgICAgICByZXR1cm4gJ2RpcmVjdG9yeSc7XG4gICAgICAgIGlmIChzdGF0cyAmJiBzdGF0cy5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgICAgICBjb25zdCBmdWxsID0gZW50cnkuZnVsbFBhdGg7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVudHJ5UmVhbFBhdGggPSBhd2FpdCByZWFscGF0aChmdWxsKTtcbiAgICAgICAgICAgICAgICBjb25zdCBlbnRyeVJlYWxQYXRoU3RhdHMgPSBhd2FpdCBsc3RhdChlbnRyeVJlYWxQYXRoKTtcbiAgICAgICAgICAgICAgICBpZiAoZW50cnlSZWFsUGF0aFN0YXRzLmlzRmlsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnZmlsZSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChlbnRyeVJlYWxQYXRoU3RhdHMuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsZW4gPSBlbnRyeVJlYWxQYXRoLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZ1bGwuc3RhcnRzV2l0aChlbnRyeVJlYWxQYXRoKSAmJiBmdWxsLnN1YnN0cihsZW4sIDEpID09PSBwc2VwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZWN1cnNpdmVFcnJvciA9IG5ldyBFcnJvcihgQ2lyY3VsYXIgc3ltbGluayBkZXRlY3RlZDogXCIke2Z1bGx9XCIgcG9pbnRzIHRvIFwiJHtlbnRyeVJlYWxQYXRofVwiYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgICAgICAgICAgICAgICByZWN1cnNpdmVFcnJvci5jb2RlID0gUkVDVVJTSVZFX0VSUk9SX0NPREU7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fb25FcnJvcihyZWN1cnNpdmVFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdkaXJlY3RvcnknO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIHRoaXMuX29uRXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBfaW5jbHVkZUFzRmlsZShlbnRyeSkge1xuICAgICAgICBjb25zdCBzdGF0cyA9IGVudHJ5ICYmIGVudHJ5W3RoaXMuX3N0YXRzUHJvcF07XG4gICAgICAgIHJldHVybiBzdGF0cyAmJiB0aGlzLl93YW50c0V2ZXJ5dGhpbmcgJiYgIXN0YXRzLmlzRGlyZWN0b3J5KCk7XG4gICAgfVxufVxuLyoqXG4gKiBTdHJlYW1pbmcgdmVyc2lvbjogUmVhZHMgYWxsIGZpbGVzIGFuZCBkaXJlY3RvcmllcyBpbiBnaXZlbiByb290IHJlY3Vyc2l2ZWx5LlxuICogQ29uc3VtZXMgfmNvbnN0YW50IHNtYWxsIGFtb3VudCBvZiBSQU0uXG4gKiBAcGFyYW0gcm9vdCBSb290IGRpcmVjdG9yeVxuICogQHBhcmFtIG9wdGlvbnMgT3B0aW9ucyB0byBzcGVjaWZ5IHJvb3QgKHN0YXJ0IGRpcmVjdG9yeSksIGZpbHRlcnMgYW5kIHJlY3Vyc2lvbiBkZXB0aFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZGRpcnAocm9vdCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIGxldCB0eXBlID0gb3B0aW9ucy5lbnRyeVR5cGUgfHwgb3B0aW9ucy50eXBlO1xuICAgIGlmICh0eXBlID09PSAnYm90aCcpXG4gICAgICAgIHR5cGUgPSBFbnRyeVR5cGVzLkZJTEVfRElSX1RZUEU7IC8vIGJhY2t3YXJkcy1jb21wYXRpYmlsaXR5XG4gICAgaWYgKHR5cGUpXG4gICAgICAgIG9wdGlvbnMudHlwZSA9IHR5cGU7XG4gICAgaWYgKCFyb290KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigncmVhZGRpcnA6IHJvb3QgYXJndW1lbnQgaXMgcmVxdWlyZWQuIFVzYWdlOiByZWFkZGlycChyb290LCBvcHRpb25zKScpO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2Ygcm9vdCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigncmVhZGRpcnA6IHJvb3QgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZy4gVXNhZ2U6IHJlYWRkaXJwKHJvb3QsIG9wdGlvbnMpJyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGUgJiYgIUFMTF9UWVBFUy5pbmNsdWRlcyh0eXBlKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHJlYWRkaXJwOiBJbnZhbGlkIHR5cGUgcGFzc2VkLiBVc2Ugb25lIG9mICR7QUxMX1RZUEVTLmpvaW4oJywgJyl9YCk7XG4gICAgfVxuICAgIG9wdGlvbnMucm9vdCA9IHJvb3Q7XG4gICAgcmV0dXJuIG5ldyBSZWFkZGlycFN0cmVhbShvcHRpb25zKTtcbn1cbi8qKlxuICogUHJvbWlzZSB2ZXJzaW9uOiBSZWFkcyBhbGwgZmlsZXMgYW5kIGRpcmVjdG9yaWVzIGluIGdpdmVuIHJvb3QgcmVjdXJzaXZlbHkuXG4gKiBDb21wYXJlZCB0byBzdHJlYW1pbmcgdmVyc2lvbiwgd2lsbCBjb25zdW1lIGEgbG90IG9mIFJBTSBlLmcuIHdoZW4gMSBtaWxsaW9uIGZpbGVzIGFyZSBsaXN0ZWQuXG4gKiBAcmV0dXJucyBhcnJheSBvZiBwYXRocyBhbmQgdGhlaXIgZW50cnkgaW5mb3NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRkaXJwUHJvbWlzZShyb290LCBvcHRpb25zID0ge30pIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCBmaWxlcyA9IFtdO1xuICAgICAgICByZWFkZGlycChyb290LCBvcHRpb25zKVxuICAgICAgICAgICAgLm9uKCdkYXRhJywgKGVudHJ5KSA9PiBmaWxlcy5wdXNoKGVudHJ5KSlcbiAgICAgICAgICAgIC5vbignZW5kJywgKCkgPT4gcmVzb2x2ZShmaWxlcykpXG4gICAgICAgICAgICAub24oJ2Vycm9yJywgKGVycm9yKSA9PiByZWplY3QoZXJyb3IpKTtcbiAgICB9KTtcbn1cbmV4cG9ydCBkZWZhdWx0IHJlYWRkaXJwO1xuIiwgImltcG9ydCB7IHdhdGNoRmlsZSwgdW53YXRjaEZpbGUsIHdhdGNoIGFzIGZzX3dhdGNoIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgb3Blbiwgc3RhdCwgbHN0YXQsIHJlYWxwYXRoIGFzIGZzcmVhbHBhdGggfSBmcm9tICdmcy9wcm9taXNlcyc7XG5pbXBvcnQgKiBhcyBzeXNQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgdHlwZSBhcyBvc1R5cGUgfSBmcm9tICdvcyc7XG5leHBvcnQgY29uc3QgU1RSX0RBVEEgPSAnZGF0YSc7XG5leHBvcnQgY29uc3QgU1RSX0VORCA9ICdlbmQnO1xuZXhwb3J0IGNvbnN0IFNUUl9DTE9TRSA9ICdjbG9zZSc7XG5leHBvcnQgY29uc3QgRU1QVFlfRk4gPSAoKSA9PiB7IH07XG5leHBvcnQgY29uc3QgSURFTlRJVFlfRk4gPSAodmFsKSA9PiB2YWw7XG5jb25zdCBwbCA9IHByb2Nlc3MucGxhdGZvcm07XG5leHBvcnQgY29uc3QgaXNXaW5kb3dzID0gcGwgPT09ICd3aW4zMic7XG5leHBvcnQgY29uc3QgaXNNYWNvcyA9IHBsID09PSAnZGFyd2luJztcbmV4cG9ydCBjb25zdCBpc0xpbnV4ID0gcGwgPT09ICdsaW51eCc7XG5leHBvcnQgY29uc3QgaXNGcmVlQlNEID0gcGwgPT09ICdmcmVlYnNkJztcbmV4cG9ydCBjb25zdCBpc0lCTWkgPSBvc1R5cGUoKSA9PT0gJ09TNDAwJztcbmV4cG9ydCBjb25zdCBFVkVOVFMgPSB7XG4gICAgQUxMOiAnYWxsJyxcbiAgICBSRUFEWTogJ3JlYWR5JyxcbiAgICBBREQ6ICdhZGQnLFxuICAgIENIQU5HRTogJ2NoYW5nZScsXG4gICAgQUREX0RJUjogJ2FkZERpcicsXG4gICAgVU5MSU5LOiAndW5saW5rJyxcbiAgICBVTkxJTktfRElSOiAndW5saW5rRGlyJyxcbiAgICBSQVc6ICdyYXcnLFxuICAgIEVSUk9SOiAnZXJyb3InLFxufTtcbmNvbnN0IEVWID0gRVZFTlRTO1xuY29uc3QgVEhST1RUTEVfTU9ERV9XQVRDSCA9ICd3YXRjaCc7XG5jb25zdCBzdGF0TWV0aG9kcyA9IHsgbHN0YXQsIHN0YXQgfTtcbmNvbnN0IEtFWV9MSVNURU5FUlMgPSAnbGlzdGVuZXJzJztcbmNvbnN0IEtFWV9FUlIgPSAnZXJySGFuZGxlcnMnO1xuY29uc3QgS0VZX1JBVyA9ICdyYXdFbWl0dGVycyc7XG5jb25zdCBIQU5ETEVSX0tFWVMgPSBbS0VZX0xJU1RFTkVSUywgS0VZX0VSUiwgS0VZX1JBV107XG4vLyBwcmV0dGllci1pZ25vcmVcbmNvbnN0IGJpbmFyeUV4dGVuc2lvbnMgPSBuZXcgU2V0KFtcbiAgICAnM2RtJywgJzNkcycsICczZzInLCAnM2dwJywgJzd6JywgJ2EnLCAnYWFjJywgJ2FkcCcsICdhZmRlc2lnbicsICdhZnBob3RvJywgJ2FmcHViJywgJ2FpJyxcbiAgICAnYWlmJywgJ2FpZmYnLCAnYWx6JywgJ2FwZScsICdhcGsnLCAnYXBwaW1hZ2UnLCAnYXInLCAnYXJqJywgJ2FzZicsICdhdScsICdhdmknLFxuICAgICdiYWsnLCAnYmFtbCcsICdiaCcsICdiaW4nLCAnYmsnLCAnYm1wJywgJ2J0aWYnLCAnYnoyJywgJ2J6aXAyJyxcbiAgICAnY2FiJywgJ2NhZicsICdjZ20nLCAnY2xhc3MnLCAnY214JywgJ2NwaW8nLCAnY3IyJywgJ2N1cicsICdkYXQnLCAnZGNtJywgJ2RlYicsICdkZXgnLCAnZGp2dScsXG4gICAgJ2RsbCcsICdkbWcnLCAnZG5nJywgJ2RvYycsICdkb2NtJywgJ2RvY3gnLCAnZG90JywgJ2RvdG0nLCAnZHJhJywgJ0RTX1N0b3JlJywgJ2RzaycsICdkdHMnLFxuICAgICdkdHNoZCcsICdkdmInLCAnZHdnJywgJ2R4ZicsXG4gICAgJ2VjZWxwNDgwMCcsICdlY2VscDc0NzAnLCAnZWNlbHA5NjAwJywgJ2VnZycsICdlb2wnLCAnZW90JywgJ2VwdWInLCAnZXhlJyxcbiAgICAnZjR2JywgJ2ZicycsICdmaCcsICdmbGEnLCAnZmxhYycsICdmbGF0cGFrJywgJ2ZsaScsICdmbHYnLCAnZnB4JywgJ2ZzdCcsICdmdnQnLFxuICAgICdnMycsICdnaCcsICdnaWYnLCAnZ3JhZmZsZScsICdneicsICdnemlwJyxcbiAgICAnaDI2MScsICdoMjYzJywgJ2gyNjQnLCAnaWNucycsICdpY28nLCAnaWVmJywgJ2ltZycsICdpcGEnLCAnaXNvJyxcbiAgICAnamFyJywgJ2pwZWcnLCAnanBnJywgJ2pwZ3YnLCAnanBtJywgJ2p4cicsICdrZXknLCAna3R4JyxcbiAgICAnbGhhJywgJ2xpYicsICdsdnAnLCAnbHonLCAnbHpoJywgJ2x6bWEnLCAnbHpvJyxcbiAgICAnbTN1JywgJ200YScsICdtNHYnLCAnbWFyJywgJ21kaScsICdtaHQnLCAnbWlkJywgJ21pZGknLCAnbWoyJywgJ21rYScsICdta3YnLCAnbW1yJywgJ21uZycsXG4gICAgJ21vYmknLCAnbW92JywgJ21vdmllJywgJ21wMycsXG4gICAgJ21wNCcsICdtcDRhJywgJ21wZWcnLCAnbXBnJywgJ21wZ2EnLCAnbXh1JyxcbiAgICAnbmVmJywgJ25weCcsICdudW1iZXJzJywgJ251cGtnJyxcbiAgICAnbycsICdvZHAnLCAnb2RzJywgJ29kdCcsICdvZ2EnLCAnb2dnJywgJ29ndicsICdvdGYnLCAnb3R0JyxcbiAgICAncGFnZXMnLCAncGJtJywgJ3BjeCcsICdwZGInLCAncGRmJywgJ3BlYScsICdwZ20nLCAncGljJywgJ3BuZycsICdwbm0nLCAncG90JywgJ3BvdG0nLFxuICAgICdwb3R4JywgJ3BwYScsICdwcGFtJyxcbiAgICAncHBtJywgJ3BwcycsICdwcHNtJywgJ3Bwc3gnLCAncHB0JywgJ3BwdG0nLCAncHB0eCcsICdwc2QnLCAncHlhJywgJ3B5YycsICdweW8nLCAncHl2JyxcbiAgICAncXQnLFxuICAgICdyYXInLCAncmFzJywgJ3JhdycsICdyZXNvdXJjZXMnLCAncmdiJywgJ3JpcCcsICdybGMnLCAncm1mJywgJ3JtdmInLCAncnBtJywgJ3J0ZicsICdyeicsXG4gICAgJ3MzbScsICdzN3onLCAnc2NwdCcsICdzZ2knLCAnc2hhcicsICdzbmFwJywgJ3NpbCcsICdza2V0Y2gnLCAnc2xrJywgJ3NtdicsICdzbmsnLCAnc28nLFxuICAgICdzdGwnLCAnc3VvJywgJ3N1YicsICdzd2YnLFxuICAgICd0YXInLCAndGJ6JywgJ3RiejInLCAndGdhJywgJ3RneicsICd0aG14JywgJ3RpZicsICd0aWZmJywgJ3RseicsICd0dGMnLCAndHRmJywgJ3R4eicsXG4gICAgJ3VkZicsICd1dmgnLCAndXZpJywgJ3V2bScsICd1dnAnLCAndXZzJywgJ3V2dScsXG4gICAgJ3ZpdicsICd2b2InLFxuICAgICd3YXInLCAnd2F2JywgJ3dheCcsICd3Ym1wJywgJ3dkcCcsICd3ZWJhJywgJ3dlYm0nLCAnd2VicCcsICd3aGwnLCAnd2ltJywgJ3dtJywgJ3dtYScsXG4gICAgJ3dtdicsICd3bXgnLCAnd29mZicsICd3b2ZmMicsICd3cm0nLCAnd3Z4JyxcbiAgICAneGJtJywgJ3hpZicsICd4bGEnLCAneGxhbScsICd4bHMnLCAneGxzYicsICd4bHNtJywgJ3hsc3gnLCAneGx0JywgJ3hsdG0nLCAneGx0eCcsICd4bScsXG4gICAgJ3htaW5kJywgJ3hwaScsICd4cG0nLCAneHdkJywgJ3h6JyxcbiAgICAneicsICd6aXAnLCAnemlweCcsXG5dKTtcbmNvbnN0IGlzQmluYXJ5UGF0aCA9IChmaWxlUGF0aCkgPT4gYmluYXJ5RXh0ZW5zaW9ucy5oYXMoc3lzUGF0aC5leHRuYW1lKGZpbGVQYXRoKS5zbGljZSgxKS50b0xvd2VyQ2FzZSgpKTtcbi8vIFRPRE86IGVtaXQgZXJyb3JzIHByb3Blcmx5LiBFeGFtcGxlOiBFTUZJTEUgb24gTWFjb3MuXG5jb25zdCBmb3JlYWNoID0gKHZhbCwgZm4pID0+IHtcbiAgICBpZiAodmFsIGluc3RhbmNlb2YgU2V0KSB7XG4gICAgICAgIHZhbC5mb3JFYWNoKGZuKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGZuKHZhbCk7XG4gICAgfVxufTtcbmNvbnN0IGFkZEFuZENvbnZlcnQgPSAobWFpbiwgcHJvcCwgaXRlbSkgPT4ge1xuICAgIGxldCBjb250YWluZXIgPSBtYWluW3Byb3BdO1xuICAgIGlmICghKGNvbnRhaW5lciBpbnN0YW5jZW9mIFNldCkpIHtcbiAgICAgICAgbWFpbltwcm9wXSA9IGNvbnRhaW5lciA9IG5ldyBTZXQoW2NvbnRhaW5lcl0pO1xuICAgIH1cbiAgICBjb250YWluZXIuYWRkKGl0ZW0pO1xufTtcbmNvbnN0IGNsZWFySXRlbSA9IChjb250KSA9PiAoa2V5KSA9PiB7XG4gICAgY29uc3Qgc2V0ID0gY29udFtrZXldO1xuICAgIGlmIChzZXQgaW5zdGFuY2VvZiBTZXQpIHtcbiAgICAgICAgc2V0LmNsZWFyKCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBkZWxldGUgY29udFtrZXldO1xuICAgIH1cbn07XG5jb25zdCBkZWxGcm9tU2V0ID0gKG1haW4sIHByb3AsIGl0ZW0pID0+IHtcbiAgICBjb25zdCBjb250YWluZXIgPSBtYWluW3Byb3BdO1xuICAgIGlmIChjb250YWluZXIgaW5zdGFuY2VvZiBTZXQpIHtcbiAgICAgICAgY29udGFpbmVyLmRlbGV0ZShpdGVtKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoY29udGFpbmVyID09PSBpdGVtKSB7XG4gICAgICAgIGRlbGV0ZSBtYWluW3Byb3BdO1xuICAgIH1cbn07XG5jb25zdCBpc0VtcHR5U2V0ID0gKHZhbCkgPT4gKHZhbCBpbnN0YW5jZW9mIFNldCA/IHZhbC5zaXplID09PSAwIDogIXZhbCk7XG5jb25zdCBGc1dhdGNoSW5zdGFuY2VzID0gbmV3IE1hcCgpO1xuLyoqXG4gKiBJbnN0YW50aWF0ZXMgdGhlIGZzX3dhdGNoIGludGVyZmFjZVxuICogQHBhcmFtIHBhdGggdG8gYmUgd2F0Y2hlZFxuICogQHBhcmFtIG9wdGlvbnMgdG8gYmUgcGFzc2VkIHRvIGZzX3dhdGNoXG4gKiBAcGFyYW0gbGlzdGVuZXIgbWFpbiBldmVudCBoYW5kbGVyXG4gKiBAcGFyYW0gZXJySGFuZGxlciBlbWl0cyBpbmZvIGFib3V0IGVycm9yc1xuICogQHBhcmFtIGVtaXRSYXcgZW1pdHMgcmF3IGV2ZW50IGRhdGFcbiAqIEByZXR1cm5zIHtOYXRpdmVGc1dhdGNoZXJ9XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUZzV2F0Y2hJbnN0YW5jZShwYXRoLCBvcHRpb25zLCBsaXN0ZW5lciwgZXJySGFuZGxlciwgZW1pdFJhdykge1xuICAgIGNvbnN0IGhhbmRsZUV2ZW50ID0gKHJhd0V2ZW50LCBldlBhdGgpID0+IHtcbiAgICAgICAgbGlzdGVuZXIocGF0aCk7XG4gICAgICAgIGVtaXRSYXcocmF3RXZlbnQsIGV2UGF0aCwgeyB3YXRjaGVkUGF0aDogcGF0aCB9KTtcbiAgICAgICAgLy8gZW1pdCBiYXNlZCBvbiBldmVudHMgb2NjdXJyaW5nIGZvciBmaWxlcyBmcm9tIGEgZGlyZWN0b3J5J3Mgd2F0Y2hlciBpblxuICAgICAgICAvLyBjYXNlIHRoZSBmaWxlJ3Mgd2F0Y2hlciBtaXNzZXMgaXQgKGFuZCByZWx5IG9uIHRocm90dGxpbmcgdG8gZGUtZHVwZSlcbiAgICAgICAgaWYgKGV2UGF0aCAmJiBwYXRoICE9PSBldlBhdGgpIHtcbiAgICAgICAgICAgIGZzV2F0Y2hCcm9hZGNhc3Qoc3lzUGF0aC5yZXNvbHZlKHBhdGgsIGV2UGF0aCksIEtFWV9MSVNURU5FUlMsIHN5c1BhdGguam9pbihwYXRoLCBldlBhdGgpKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGZzX3dhdGNoKHBhdGgsIHtcbiAgICAgICAgICAgIHBlcnNpc3RlbnQ6IG9wdGlvbnMucGVyc2lzdGVudCxcbiAgICAgICAgfSwgaGFuZGxlRXZlbnQpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgZXJySGFuZGxlcihlcnJvcik7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxufVxuLyoqXG4gKiBIZWxwZXIgZm9yIHBhc3NpbmcgZnNfd2F0Y2ggZXZlbnQgZGF0YSB0byBhIGNvbGxlY3Rpb24gb2YgbGlzdGVuZXJzXG4gKiBAcGFyYW0gZnVsbFBhdGggYWJzb2x1dGUgcGF0aCBib3VuZCB0byBmc193YXRjaCBpbnN0YW5jZVxuICovXG5jb25zdCBmc1dhdGNoQnJvYWRjYXN0ID0gKGZ1bGxQYXRoLCBsaXN0ZW5lclR5cGUsIHZhbDEsIHZhbDIsIHZhbDMpID0+IHtcbiAgICBjb25zdCBjb250ID0gRnNXYXRjaEluc3RhbmNlcy5nZXQoZnVsbFBhdGgpO1xuICAgIGlmICghY29udClcbiAgICAgICAgcmV0dXJuO1xuICAgIGZvcmVhY2goY29udFtsaXN0ZW5lclR5cGVdLCAobGlzdGVuZXIpID0+IHtcbiAgICAgICAgbGlzdGVuZXIodmFsMSwgdmFsMiwgdmFsMyk7XG4gICAgfSk7XG59O1xuLyoqXG4gKiBJbnN0YW50aWF0ZXMgdGhlIGZzX3dhdGNoIGludGVyZmFjZSBvciBiaW5kcyBsaXN0ZW5lcnNcbiAqIHRvIGFuIGV4aXN0aW5nIG9uZSBjb3ZlcmluZyB0aGUgc2FtZSBmaWxlIHN5c3RlbSBlbnRyeVxuICogQHBhcmFtIHBhdGhcbiAqIEBwYXJhbSBmdWxsUGF0aCBhYnNvbHV0ZSBwYXRoXG4gKiBAcGFyYW0gb3B0aW9ucyB0byBiZSBwYXNzZWQgdG8gZnNfd2F0Y2hcbiAqIEBwYXJhbSBoYW5kbGVycyBjb250YWluZXIgZm9yIGV2ZW50IGxpc3RlbmVyIGZ1bmN0aW9uc1xuICovXG5jb25zdCBzZXRGc1dhdGNoTGlzdGVuZXIgPSAocGF0aCwgZnVsbFBhdGgsIG9wdGlvbnMsIGhhbmRsZXJzKSA9PiB7XG4gICAgY29uc3QgeyBsaXN0ZW5lciwgZXJySGFuZGxlciwgcmF3RW1pdHRlciB9ID0gaGFuZGxlcnM7XG4gICAgbGV0IGNvbnQgPSBGc1dhdGNoSW5zdGFuY2VzLmdldChmdWxsUGF0aCk7XG4gICAgbGV0IHdhdGNoZXI7XG4gICAgaWYgKCFvcHRpb25zLnBlcnNpc3RlbnQpIHtcbiAgICAgICAgd2F0Y2hlciA9IGNyZWF0ZUZzV2F0Y2hJbnN0YW5jZShwYXRoLCBvcHRpb25zLCBsaXN0ZW5lciwgZXJySGFuZGxlciwgcmF3RW1pdHRlcik7XG4gICAgICAgIGlmICghd2F0Y2hlcilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgcmV0dXJuIHdhdGNoZXIuY2xvc2UuYmluZCh3YXRjaGVyKTtcbiAgICB9XG4gICAgaWYgKGNvbnQpIHtcbiAgICAgICAgYWRkQW5kQ29udmVydChjb250LCBLRVlfTElTVEVORVJTLCBsaXN0ZW5lcik7XG4gICAgICAgIGFkZEFuZENvbnZlcnQoY29udCwgS0VZX0VSUiwgZXJySGFuZGxlcik7XG4gICAgICAgIGFkZEFuZENvbnZlcnQoY29udCwgS0VZX1JBVywgcmF3RW1pdHRlcik7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB3YXRjaGVyID0gY3JlYXRlRnNXYXRjaEluc3RhbmNlKHBhdGgsIG9wdGlvbnMsIGZzV2F0Y2hCcm9hZGNhc3QuYmluZChudWxsLCBmdWxsUGF0aCwgS0VZX0xJU1RFTkVSUyksIGVyckhhbmRsZXIsIC8vIG5vIG5lZWQgdG8gdXNlIGJyb2FkY2FzdCBoZXJlXG4gICAgICAgIGZzV2F0Y2hCcm9hZGNhc3QuYmluZChudWxsLCBmdWxsUGF0aCwgS0VZX1JBVykpO1xuICAgICAgICBpZiAoIXdhdGNoZXIpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHdhdGNoZXIub24oRVYuRVJST1IsIGFzeW5jIChlcnJvcikgPT4ge1xuICAgICAgICAgICAgY29uc3QgYnJvYWRjYXN0RXJyID0gZnNXYXRjaEJyb2FkY2FzdC5iaW5kKG51bGwsIGZ1bGxQYXRoLCBLRVlfRVJSKTtcbiAgICAgICAgICAgIGlmIChjb250KVxuICAgICAgICAgICAgICAgIGNvbnQud2F0Y2hlclVudXNhYmxlID0gdHJ1ZTsgLy8gZG9jdW1lbnRlZCBzaW5jZSBOb2RlIDEwLjQuMVxuICAgICAgICAgICAgLy8gV29ya2Fyb3VuZCBmb3IgaHR0cHM6Ly9naXRodWIuY29tL2pveWVudC9ub2RlL2lzc3Vlcy80MzM3XG4gICAgICAgICAgICBpZiAoaXNXaW5kb3dzICYmIGVycm9yLmNvZGUgPT09ICdFUEVSTScpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmZCA9IGF3YWl0IG9wZW4ocGF0aCwgJ3InKTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZmQuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJvYWRjYXN0RXJyKGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgICAgICAvLyBkbyBub3RoaW5nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYnJvYWRjYXN0RXJyKGVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnQgPSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnM6IGxpc3RlbmVyLFxuICAgICAgICAgICAgZXJySGFuZGxlcnM6IGVyckhhbmRsZXIsXG4gICAgICAgICAgICByYXdFbWl0dGVyczogcmF3RW1pdHRlcixcbiAgICAgICAgICAgIHdhdGNoZXIsXG4gICAgICAgIH07XG4gICAgICAgIEZzV2F0Y2hJbnN0YW5jZXMuc2V0KGZ1bGxQYXRoLCBjb250KTtcbiAgICB9XG4gICAgLy8gY29uc3QgaW5kZXggPSBjb250Lmxpc3RlbmVycy5pbmRleE9mKGxpc3RlbmVyKTtcbiAgICAvLyByZW1vdmVzIHRoaXMgaW5zdGFuY2UncyBsaXN0ZW5lcnMgYW5kIGNsb3NlcyB0aGUgdW5kZXJseWluZyBmc193YXRjaFxuICAgIC8vIGluc3RhbmNlIGlmIHRoZXJlIGFyZSBubyBtb3JlIGxpc3RlbmVycyBsZWZ0XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgZGVsRnJvbVNldChjb250LCBLRVlfTElTVEVORVJTLCBsaXN0ZW5lcik7XG4gICAgICAgIGRlbEZyb21TZXQoY29udCwgS0VZX0VSUiwgZXJySGFuZGxlcik7XG4gICAgICAgIGRlbEZyb21TZXQoY29udCwgS0VZX1JBVywgcmF3RW1pdHRlcik7XG4gICAgICAgIGlmIChpc0VtcHR5U2V0KGNvbnQubGlzdGVuZXJzKSkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgdG8gcHJvdGVjdCBhZ2FpbnN0IGlzc3VlIGdoLTczMC5cbiAgICAgICAgICAgIC8vIGlmIChjb250LndhdGNoZXJVbnVzYWJsZSkge1xuICAgICAgICAgICAgY29udC53YXRjaGVyLmNsb3NlKCk7XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICBGc1dhdGNoSW5zdGFuY2VzLmRlbGV0ZShmdWxsUGF0aCk7XG4gICAgICAgICAgICBIQU5ETEVSX0tFWVMuZm9yRWFjaChjbGVhckl0ZW0oY29udCkpO1xuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgY29udC53YXRjaGVyID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgT2JqZWN0LmZyZWV6ZShjb250KTtcbiAgICAgICAgfVxuICAgIH07XG59O1xuLy8gZnNfd2F0Y2hGaWxlIGhlbHBlcnNcbi8vIG9iamVjdCB0byBob2xkIHBlci1wcm9jZXNzIGZzX3dhdGNoRmlsZSBpbnN0YW5jZXNcbi8vIChtYXkgYmUgc2hhcmVkIGFjcm9zcyBjaG9raWRhciBGU1dhdGNoZXIgaW5zdGFuY2VzKVxuY29uc3QgRnNXYXRjaEZpbGVJbnN0YW5jZXMgPSBuZXcgTWFwKCk7XG4vKipcbiAqIEluc3RhbnRpYXRlcyB0aGUgZnNfd2F0Y2hGaWxlIGludGVyZmFjZSBvciBiaW5kcyBsaXN0ZW5lcnNcbiAqIHRvIGFuIGV4aXN0aW5nIG9uZSBjb3ZlcmluZyB0aGUgc2FtZSBmaWxlIHN5c3RlbSBlbnRyeVxuICogQHBhcmFtIHBhdGggdG8gYmUgd2F0Y2hlZFxuICogQHBhcmFtIGZ1bGxQYXRoIGFic29sdXRlIHBhdGhcbiAqIEBwYXJhbSBvcHRpb25zIG9wdGlvbnMgdG8gYmUgcGFzc2VkIHRvIGZzX3dhdGNoRmlsZVxuICogQHBhcmFtIGhhbmRsZXJzIGNvbnRhaW5lciBmb3IgZXZlbnQgbGlzdGVuZXIgZnVuY3Rpb25zXG4gKiBAcmV0dXJucyBjbG9zZXJcbiAqL1xuY29uc3Qgc2V0RnNXYXRjaEZpbGVMaXN0ZW5lciA9IChwYXRoLCBmdWxsUGF0aCwgb3B0aW9ucywgaGFuZGxlcnMpID0+IHtcbiAgICBjb25zdCB7IGxpc3RlbmVyLCByYXdFbWl0dGVyIH0gPSBoYW5kbGVycztcbiAgICBsZXQgY29udCA9IEZzV2F0Y2hGaWxlSW5zdGFuY2VzLmdldChmdWxsUGF0aCk7XG4gICAgLy8gbGV0IGxpc3RlbmVycyA9IG5ldyBTZXQoKTtcbiAgICAvLyBsZXQgcmF3RW1pdHRlcnMgPSBuZXcgU2V0KCk7XG4gICAgY29uc3QgY29wdHMgPSBjb250ICYmIGNvbnQub3B0aW9ucztcbiAgICBpZiAoY29wdHMgJiYgKGNvcHRzLnBlcnNpc3RlbnQgPCBvcHRpb25zLnBlcnNpc3RlbnQgfHwgY29wdHMuaW50ZXJ2YWwgPiBvcHRpb25zLmludGVydmFsKSkge1xuICAgICAgICAvLyBcIlVwZ3JhZGVcIiB0aGUgd2F0Y2hlciB0byBwZXJzaXN0ZW5jZSBvciBhIHF1aWNrZXIgaW50ZXJ2YWwuXG4gICAgICAgIC8vIFRoaXMgY3JlYXRlcyBzb21lIHVubGlrZWx5IGVkZ2UgY2FzZSBpc3N1ZXMgaWYgdGhlIHVzZXIgbWl4ZXNcbiAgICAgICAgLy8gc2V0dGluZ3MgaW4gYSB2ZXJ5IHdlaXJkIHdheSwgYnV0IHNvbHZpbmcgZm9yIHRob3NlIGNhc2VzXG4gICAgICAgIC8vIGRvZXNuJ3Qgc2VlbSB3b3J0aHdoaWxlIGZvciB0aGUgYWRkZWQgY29tcGxleGl0eS5cbiAgICAgICAgLy8gbGlzdGVuZXJzID0gY29udC5saXN0ZW5lcnM7XG4gICAgICAgIC8vIHJhd0VtaXR0ZXJzID0gY29udC5yYXdFbWl0dGVycztcbiAgICAgICAgdW53YXRjaEZpbGUoZnVsbFBhdGgpO1xuICAgICAgICBjb250ID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBpZiAoY29udCkge1xuICAgICAgICBhZGRBbmRDb252ZXJ0KGNvbnQsIEtFWV9MSVNURU5FUlMsIGxpc3RlbmVyKTtcbiAgICAgICAgYWRkQW5kQ29udmVydChjb250LCBLRVlfUkFXLCByYXdFbWl0dGVyKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIC8vIFRPRE9cbiAgICAgICAgLy8gbGlzdGVuZXJzLmFkZChsaXN0ZW5lcik7XG4gICAgICAgIC8vIHJhd0VtaXR0ZXJzLmFkZChyYXdFbWl0dGVyKTtcbiAgICAgICAgY29udCA9IHtcbiAgICAgICAgICAgIGxpc3RlbmVyczogbGlzdGVuZXIsXG4gICAgICAgICAgICByYXdFbWl0dGVyczogcmF3RW1pdHRlcixcbiAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICB3YXRjaGVyOiB3YXRjaEZpbGUoZnVsbFBhdGgsIG9wdGlvbnMsIChjdXJyLCBwcmV2KSA9PiB7XG4gICAgICAgICAgICAgICAgZm9yZWFjaChjb250LnJhd0VtaXR0ZXJzLCAocmF3RW1pdHRlcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByYXdFbWl0dGVyKEVWLkNIQU5HRSwgZnVsbFBhdGgsIHsgY3VyciwgcHJldiB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJybXRpbWUgPSBjdXJyLm10aW1lTXM7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnIuc2l6ZSAhPT0gcHJldi5zaXplIHx8IGN1cnJtdGltZSA+IHByZXYubXRpbWVNcyB8fCBjdXJybXRpbWUgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yZWFjaChjb250Lmxpc3RlbmVycywgKGxpc3RlbmVyKSA9PiBsaXN0ZW5lcihwYXRoLCBjdXJyKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSksXG4gICAgICAgIH07XG4gICAgICAgIEZzV2F0Y2hGaWxlSW5zdGFuY2VzLnNldChmdWxsUGF0aCwgY29udCk7XG4gICAgfVxuICAgIC8vIGNvbnN0IGluZGV4ID0gY29udC5saXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lcik7XG4gICAgLy8gUmVtb3ZlcyB0aGlzIGluc3RhbmNlJ3MgbGlzdGVuZXJzIGFuZCBjbG9zZXMgdGhlIHVuZGVybHlpbmcgZnNfd2F0Y2hGaWxlXG4gICAgLy8gaW5zdGFuY2UgaWYgdGhlcmUgYXJlIG5vIG1vcmUgbGlzdGVuZXJzIGxlZnQuXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgZGVsRnJvbVNldChjb250LCBLRVlfTElTVEVORVJTLCBsaXN0ZW5lcik7XG4gICAgICAgIGRlbEZyb21TZXQoY29udCwgS0VZX1JBVywgcmF3RW1pdHRlcik7XG4gICAgICAgIGlmIChpc0VtcHR5U2V0KGNvbnQubGlzdGVuZXJzKSkge1xuICAgICAgICAgICAgRnNXYXRjaEZpbGVJbnN0YW5jZXMuZGVsZXRlKGZ1bGxQYXRoKTtcbiAgICAgICAgICAgIHVud2F0Y2hGaWxlKGZ1bGxQYXRoKTtcbiAgICAgICAgICAgIGNvbnQub3B0aW9ucyA9IGNvbnQud2F0Y2hlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIE9iamVjdC5mcmVlemUoY29udCk7XG4gICAgICAgIH1cbiAgICB9O1xufTtcbi8qKlxuICogQG1peGluXG4gKi9cbmV4cG9ydCBjbGFzcyBOb2RlRnNIYW5kbGVyIHtcbiAgICBjb25zdHJ1Y3Rvcihmc1cpIHtcbiAgICAgICAgdGhpcy5mc3cgPSBmc1c7XG4gICAgICAgIHRoaXMuX2JvdW5kSGFuZGxlRXJyb3IgPSAoZXJyb3IpID0+IGZzVy5faGFuZGxlRXJyb3IoZXJyb3IpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBXYXRjaCBmaWxlIGZvciBjaGFuZ2VzIHdpdGggZnNfd2F0Y2hGaWxlIG9yIGZzX3dhdGNoLlxuICAgICAqIEBwYXJhbSBwYXRoIHRvIGZpbGUgb3IgZGlyXG4gICAgICogQHBhcmFtIGxpc3RlbmVyIG9uIGZzIGNoYW5nZVxuICAgICAqIEByZXR1cm5zIGNsb3NlciBmb3IgdGhlIHdhdGNoZXIgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBfd2F0Y2hXaXRoTm9kZUZzKHBhdGgsIGxpc3RlbmVyKSB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSB0aGlzLmZzdy5vcHRpb25zO1xuICAgICAgICBjb25zdCBkaXJlY3RvcnkgPSBzeXNQYXRoLmRpcm5hbWUocGF0aCk7XG4gICAgICAgIGNvbnN0IGJhc2VuYW1lID0gc3lzUGF0aC5iYXNlbmFtZShwYXRoKTtcbiAgICAgICAgY29uc3QgcGFyZW50ID0gdGhpcy5mc3cuX2dldFdhdGNoZWREaXIoZGlyZWN0b3J5KTtcbiAgICAgICAgcGFyZW50LmFkZChiYXNlbmFtZSk7XG4gICAgICAgIGNvbnN0IGFic29sdXRlUGF0aCA9IHN5c1BhdGgucmVzb2x2ZShwYXRoKTtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgIHBlcnNpc3RlbnQ6IG9wdHMucGVyc2lzdGVudCxcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCFsaXN0ZW5lcilcbiAgICAgICAgICAgIGxpc3RlbmVyID0gRU1QVFlfRk47XG4gICAgICAgIGxldCBjbG9zZXI7XG4gICAgICAgIGlmIChvcHRzLnVzZVBvbGxpbmcpIHtcbiAgICAgICAgICAgIGNvbnN0IGVuYWJsZUJpbiA9IG9wdHMuaW50ZXJ2YWwgIT09IG9wdHMuYmluYXJ5SW50ZXJ2YWw7XG4gICAgICAgICAgICBvcHRpb25zLmludGVydmFsID0gZW5hYmxlQmluICYmIGlzQmluYXJ5UGF0aChiYXNlbmFtZSkgPyBvcHRzLmJpbmFyeUludGVydmFsIDogb3B0cy5pbnRlcnZhbDtcbiAgICAgICAgICAgIGNsb3NlciA9IHNldEZzV2F0Y2hGaWxlTGlzdGVuZXIocGF0aCwgYWJzb2x1dGVQYXRoLCBvcHRpb25zLCB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXIsXG4gICAgICAgICAgICAgICAgcmF3RW1pdHRlcjogdGhpcy5mc3cuX2VtaXRSYXcsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNsb3NlciA9IHNldEZzV2F0Y2hMaXN0ZW5lcihwYXRoLCBhYnNvbHV0ZVBhdGgsIG9wdGlvbnMsIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcixcbiAgICAgICAgICAgICAgICBlcnJIYW5kbGVyOiB0aGlzLl9ib3VuZEhhbmRsZUVycm9yLFxuICAgICAgICAgICAgICAgIHJhd0VtaXR0ZXI6IHRoaXMuZnN3Ll9lbWl0UmF3LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNsb3NlcjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogV2F0Y2ggYSBmaWxlIGFuZCBlbWl0IGFkZCBldmVudCBpZiB3YXJyYW50ZWQuXG4gICAgICogQHJldHVybnMgY2xvc2VyIGZvciB0aGUgd2F0Y2hlciBpbnN0YW5jZVxuICAgICAqL1xuICAgIF9oYW5kbGVGaWxlKGZpbGUsIHN0YXRzLCBpbml0aWFsQWRkKSB7XG4gICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkaXJuYW1lID0gc3lzUGF0aC5kaXJuYW1lKGZpbGUpO1xuICAgICAgICBjb25zdCBiYXNlbmFtZSA9IHN5c1BhdGguYmFzZW5hbWUoZmlsZSk7XG4gICAgICAgIGNvbnN0IHBhcmVudCA9IHRoaXMuZnN3Ll9nZXRXYXRjaGVkRGlyKGRpcm5hbWUpO1xuICAgICAgICAvLyBzdGF0cyBpcyBhbHdheXMgcHJlc2VudFxuICAgICAgICBsZXQgcHJldlN0YXRzID0gc3RhdHM7XG4gICAgICAgIC8vIGlmIHRoZSBmaWxlIGlzIGFscmVhZHkgYmVpbmcgd2F0Y2hlZCwgZG8gbm90aGluZ1xuICAgICAgICBpZiAocGFyZW50LmhhcyhiYXNlbmFtZSkpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGNvbnN0IGxpc3RlbmVyID0gYXN5bmMgKHBhdGgsIG5ld1N0YXRzKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuZnN3Ll90aHJvdHRsZShUSFJPVFRMRV9NT0RFX1dBVENILCBmaWxlLCA1KSlcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBpZiAoIW5ld1N0YXRzIHx8IG5ld1N0YXRzLm10aW1lTXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdTdGF0cyA9IGF3YWl0IHN0YXQoZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIHRoYXQgY2hhbmdlIGV2ZW50IHdhcyBub3QgZmlyZWQgYmVjYXVzZSBvZiBjaGFuZ2VkIG9ubHkgYWNjZXNzVGltZS5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXQgPSBuZXdTdGF0cy5hdGltZU1zO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtdCA9IG5ld1N0YXRzLm10aW1lTXM7XG4gICAgICAgICAgICAgICAgICAgIGlmICghYXQgfHwgYXQgPD0gbXQgfHwgbXQgIT09IHByZXZTdGF0cy5tdGltZU1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZzdy5fZW1pdChFVi5DSEFOR0UsIGZpbGUsIG5ld1N0YXRzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoKGlzTWFjb3MgfHwgaXNMaW51eCB8fCBpc0ZyZWVCU0QpICYmIHByZXZTdGF0cy5pbm8gIT09IG5ld1N0YXRzLmlubykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX2Nsb3NlRmlsZShwYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZXZTdGF0cyA9IG5ld1N0YXRzO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2xvc2VyID0gdGhpcy5fd2F0Y2hXaXRoTm9kZUZzKGZpbGUsIGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbG9zZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX2FkZFBhdGhDbG9zZXIocGF0aCwgY2xvc2VyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZXZTdGF0cyA9IG5ld1N0YXRzO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBGaXggaXNzdWVzIHdoZXJlIG10aW1lIGlzIG51bGwgYnV0IGZpbGUgaXMgc3RpbGwgcHJlc2VudFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmZzdy5fcmVtb3ZlKGRpcm5hbWUsIGJhc2VuYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gYWRkIGlzIGFib3V0IHRvIGJlIGVtaXR0ZWQgaWYgZmlsZSBub3QgYWxyZWFkeSB0cmFja2VkIGluIHBhcmVudFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAocGFyZW50LmhhcyhiYXNlbmFtZSkpIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayB0aGF0IGNoYW5nZSBldmVudCB3YXMgbm90IGZpcmVkIGJlY2F1c2Ugb2YgY2hhbmdlZCBvbmx5IGFjY2Vzc1RpbWUuXG4gICAgICAgICAgICAgICAgY29uc3QgYXQgPSBuZXdTdGF0cy5hdGltZU1zO1xuICAgICAgICAgICAgICAgIGNvbnN0IG10ID0gbmV3U3RhdHMubXRpbWVNcztcbiAgICAgICAgICAgICAgICBpZiAoIWF0IHx8IGF0IDw9IG10IHx8IG10ICE9PSBwcmV2U3RhdHMubXRpbWVNcykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZzdy5fZW1pdChFVi5DSEFOR0UsIGZpbGUsIG5ld1N0YXRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcHJldlN0YXRzID0gbmV3U3RhdHM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIC8vIGtpY2sgb2ZmIHRoZSB3YXRjaGVyXG4gICAgICAgIGNvbnN0IGNsb3NlciA9IHRoaXMuX3dhdGNoV2l0aE5vZGVGcyhmaWxlLCBsaXN0ZW5lcik7XG4gICAgICAgIC8vIGVtaXQgYW4gYWRkIGV2ZW50IGlmIHdlJ3JlIHN1cHBvc2VkIHRvXG4gICAgICAgIGlmICghKGluaXRpYWxBZGQgJiYgdGhpcy5mc3cub3B0aW9ucy5pZ25vcmVJbml0aWFsKSAmJiB0aGlzLmZzdy5faXNudElnbm9yZWQoZmlsZSkpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5mc3cuX3Rocm90dGxlKEVWLkFERCwgZmlsZSwgMCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgdGhpcy5mc3cuX2VtaXQoRVYuQURELCBmaWxlLCBzdGF0cyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNsb3NlcjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogSGFuZGxlIHN5bWxpbmtzIGVuY291bnRlcmVkIHdoaWxlIHJlYWRpbmcgYSBkaXIuXG4gICAgICogQHBhcmFtIGVudHJ5IHJldHVybmVkIGJ5IHJlYWRkaXJwXG4gICAgICogQHBhcmFtIGRpcmVjdG9yeSBwYXRoIG9mIGRpciBiZWluZyByZWFkXG4gICAgICogQHBhcmFtIHBhdGggb2YgdGhpcyBpdGVtXG4gICAgICogQHBhcmFtIGl0ZW0gYmFzZW5hbWUgb2YgdGhpcyBpdGVtXG4gICAgICogQHJldHVybnMgdHJ1ZSBpZiBubyBtb3JlIHByb2Nlc3NpbmcgaXMgbmVlZGVkIGZvciB0aGlzIGVudHJ5LlxuICAgICAqL1xuICAgIGFzeW5jIF9oYW5kbGVTeW1saW5rKGVudHJ5LCBkaXJlY3RvcnksIHBhdGgsIGl0ZW0pIHtcbiAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGZ1bGwgPSBlbnRyeS5mdWxsUGF0aDtcbiAgICAgICAgY29uc3QgZGlyID0gdGhpcy5mc3cuX2dldFdhdGNoZWREaXIoZGlyZWN0b3J5KTtcbiAgICAgICAgaWYgKCF0aGlzLmZzdy5vcHRpb25zLmZvbGxvd1N5bWxpbmtzKSB7XG4gICAgICAgICAgICAvLyB3YXRjaCBzeW1saW5rIGRpcmVjdGx5IChkb24ndCBmb2xsb3cpIGFuZCBkZXRlY3QgY2hhbmdlc1xuICAgICAgICAgICAgdGhpcy5mc3cuX2luY3JSZWFkeUNvdW50KCk7XG4gICAgICAgICAgICBsZXQgbGlua1BhdGg7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGxpbmtQYXRoID0gYXdhaXQgZnNyZWFscGF0aChwYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5mc3cuX2VtaXRSZWFkeSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBpZiAoZGlyLmhhcyhpdGVtKSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZzdy5fc3ltbGlua1BhdGhzLmdldChmdWxsKSAhPT0gbGlua1BhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX3N5bWxpbmtQYXRocy5zZXQoZnVsbCwgbGlua1BhdGgpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZzdy5fZW1pdChFVi5DSEFOR0UsIHBhdGgsIGVudHJ5LnN0YXRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBkaXIuYWRkKGl0ZW0pO1xuICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9zeW1saW5rUGF0aHMuc2V0KGZ1bGwsIGxpbmtQYXRoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmZzdy5fZW1pdChFVi5BREQsIHBhdGgsIGVudHJ5LnN0YXRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZnN3Ll9lbWl0UmVhZHkoKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIGRvbid0IGZvbGxvdyB0aGUgc2FtZSBzeW1saW5rIG1vcmUgdGhhbiBvbmNlXG4gICAgICAgIGlmICh0aGlzLmZzdy5fc3ltbGlua1BhdGhzLmhhcyhmdWxsKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5mc3cuX3N5bWxpbmtQYXRocy5zZXQoZnVsbCwgdHJ1ZSk7XG4gICAgfVxuICAgIF9oYW5kbGVSZWFkKGRpcmVjdG9yeSwgaW5pdGlhbEFkZCwgd2gsIHRhcmdldCwgZGlyLCBkZXB0aCwgdGhyb3R0bGVyKSB7XG4gICAgICAgIC8vIE5vcm1hbGl6ZSB0aGUgZGlyZWN0b3J5IG5hbWUgb24gV2luZG93c1xuICAgICAgICBkaXJlY3RvcnkgPSBzeXNQYXRoLmpvaW4oZGlyZWN0b3J5LCAnJyk7XG4gICAgICAgIHRocm90dGxlciA9IHRoaXMuZnN3Ll90aHJvdHRsZSgncmVhZGRpcicsIGRpcmVjdG9yeSwgMTAwMCk7XG4gICAgICAgIGlmICghdGhyb3R0bGVyKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCBwcmV2aW91cyA9IHRoaXMuZnN3Ll9nZXRXYXRjaGVkRGlyKHdoLnBhdGgpO1xuICAgICAgICBjb25zdCBjdXJyZW50ID0gbmV3IFNldCgpO1xuICAgICAgICBsZXQgc3RyZWFtID0gdGhpcy5mc3cuX3JlYWRkaXJwKGRpcmVjdG9yeSwge1xuICAgICAgICAgICAgZmlsZUZpbHRlcjogKGVudHJ5KSA9PiB3aC5maWx0ZXJQYXRoKGVudHJ5KSxcbiAgICAgICAgICAgIGRpcmVjdG9yeUZpbHRlcjogKGVudHJ5KSA9PiB3aC5maWx0ZXJEaXIoZW50cnkpLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFzdHJlYW0pXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHN0cmVhbVxuICAgICAgICAgICAgLm9uKFNUUl9EQVRBLCBhc3luYyAoZW50cnkpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpIHtcbiAgICAgICAgICAgICAgICBzdHJlYW0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgaXRlbSA9IGVudHJ5LnBhdGg7XG4gICAgICAgICAgICBsZXQgcGF0aCA9IHN5c1BhdGguam9pbihkaXJlY3RvcnksIGl0ZW0pO1xuICAgICAgICAgICAgY3VycmVudC5hZGQoaXRlbSk7XG4gICAgICAgICAgICBpZiAoZW50cnkuc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSAmJlxuICAgICAgICAgICAgICAgIChhd2FpdCB0aGlzLl9oYW5kbGVTeW1saW5rKGVudHJ5LCBkaXJlY3RvcnksIHBhdGgsIGl0ZW0pKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpIHtcbiAgICAgICAgICAgICAgICBzdHJlYW0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRmlsZXMgdGhhdCBwcmVzZW50IGluIGN1cnJlbnQgZGlyZWN0b3J5IHNuYXBzaG90XG4gICAgICAgICAgICAvLyBidXQgYWJzZW50IGluIHByZXZpb3VzIGFyZSBhZGRlZCB0byB3YXRjaCBsaXN0IGFuZFxuICAgICAgICAgICAgLy8gZW1pdCBgYWRkYCBldmVudC5cbiAgICAgICAgICAgIGlmIChpdGVtID09PSB0YXJnZXQgfHwgKCF0YXJnZXQgJiYgIXByZXZpb3VzLmhhcyhpdGVtKSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZzdy5faW5jclJlYWR5Q291bnQoKTtcbiAgICAgICAgICAgICAgICAvLyBlbnN1cmUgcmVsYXRpdmVuZXNzIG9mIHBhdGggaXMgcHJlc2VydmVkIGluIGNhc2Ugb2Ygd2F0Y2hlciByZXVzZVxuICAgICAgICAgICAgICAgIHBhdGggPSBzeXNQYXRoLmpvaW4oZGlyLCBzeXNQYXRoLnJlbGF0aXZlKGRpciwgcGF0aCkpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2FkZFRvTm9kZUZzKHBhdGgsIGluaXRpYWxBZGQsIHdoLCBkZXB0aCArIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAgICAgLm9uKEVWLkVSUk9SLCB0aGlzLl9ib3VuZEhhbmRsZUVycm9yKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGlmICghc3RyZWFtKVxuICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QoKTtcbiAgICAgICAgICAgIHN0cmVhbS5vbmNlKFNUUl9FTkQsICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0cmVhbSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCB3YXNUaHJvdHRsZWQgPSB0aHJvdHRsZXIgPyB0aHJvdHRsZXIuY2xlYXIoKSA6IGZhbHNlO1xuICAgICAgICAgICAgICAgIHJlc29sdmUodW5kZWZpbmVkKTtcbiAgICAgICAgICAgICAgICAvLyBGaWxlcyB0aGF0IGFic2VudCBpbiBjdXJyZW50IGRpcmVjdG9yeSBzbmFwc2hvdFxuICAgICAgICAgICAgICAgIC8vIGJ1dCBwcmVzZW50IGluIHByZXZpb3VzIGVtaXQgYHJlbW92ZWAgZXZlbnRcbiAgICAgICAgICAgICAgICAvLyBhbmQgYXJlIHJlbW92ZWQgZnJvbSBAd2F0Y2hlZFtkaXJlY3RvcnldLlxuICAgICAgICAgICAgICAgIHByZXZpb3VzXG4gICAgICAgICAgICAgICAgICAgIC5nZXRDaGlsZHJlbigpXG4gICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoKGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0gIT09IGRpcmVjdG9yeSAmJiAhY3VycmVudC5oYXMoaXRlbSk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX3JlbW92ZShkaXJlY3RvcnksIGl0ZW0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHN0cmVhbSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAvLyBvbmUgbW9yZSB0aW1lIGZvciBhbnkgbWlzc2VkIGluIGNhc2UgY2hhbmdlcyBjYW1lIGluIGV4dHJlbWVseSBxdWlja2x5XG4gICAgICAgICAgICAgICAgaWYgKHdhc1Rocm90dGxlZClcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlUmVhZChkaXJlY3RvcnksIGZhbHNlLCB3aCwgdGFyZ2V0LCBkaXIsIGRlcHRoLCB0aHJvdHRsZXIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZWFkIGRpcmVjdG9yeSB0byBhZGQgLyByZW1vdmUgZmlsZXMgZnJvbSBgQHdhdGNoZWRgIGxpc3QgYW5kIHJlLXJlYWQgaXQgb24gY2hhbmdlLlxuICAgICAqIEBwYXJhbSBkaXIgZnMgcGF0aFxuICAgICAqIEBwYXJhbSBzdGF0c1xuICAgICAqIEBwYXJhbSBpbml0aWFsQWRkXG4gICAgICogQHBhcmFtIGRlcHRoIHJlbGF0aXZlIHRvIHVzZXItc3VwcGxpZWQgcGF0aFxuICAgICAqIEBwYXJhbSB0YXJnZXQgY2hpbGQgcGF0aCB0YXJnZXRlZCBmb3Igd2F0Y2hcbiAgICAgKiBAcGFyYW0gd2ggQ29tbW9uIHdhdGNoIGhlbHBlcnMgZm9yIHRoaXMgcGF0aFxuICAgICAqIEBwYXJhbSByZWFscGF0aFxuICAgICAqIEByZXR1cm5zIGNsb3NlciBmb3IgdGhlIHdhdGNoZXIgaW5zdGFuY2UuXG4gICAgICovXG4gICAgYXN5bmMgX2hhbmRsZURpcihkaXIsIHN0YXRzLCBpbml0aWFsQWRkLCBkZXB0aCwgdGFyZ2V0LCB3aCwgcmVhbHBhdGgpIHtcbiAgICAgICAgY29uc3QgcGFyZW50RGlyID0gdGhpcy5mc3cuX2dldFdhdGNoZWREaXIoc3lzUGF0aC5kaXJuYW1lKGRpcikpO1xuICAgICAgICBjb25zdCB0cmFja2VkID0gcGFyZW50RGlyLmhhcyhzeXNQYXRoLmJhc2VuYW1lKGRpcikpO1xuICAgICAgICBpZiAoIShpbml0aWFsQWRkICYmIHRoaXMuZnN3Lm9wdGlvbnMuaWdub3JlSW5pdGlhbCkgJiYgIXRhcmdldCAmJiAhdHJhY2tlZCkge1xuICAgICAgICAgICAgdGhpcy5mc3cuX2VtaXQoRVYuQUREX0RJUiwgZGlyLCBzdGF0cyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZW5zdXJlIGRpciBpcyB0cmFja2VkIChoYXJtbGVzcyBpZiByZWR1bmRhbnQpXG4gICAgICAgIHBhcmVudERpci5hZGQoc3lzUGF0aC5iYXNlbmFtZShkaXIpKTtcbiAgICAgICAgdGhpcy5mc3cuX2dldFdhdGNoZWREaXIoZGlyKTtcbiAgICAgICAgbGV0IHRocm90dGxlcjtcbiAgICAgICAgbGV0IGNsb3NlcjtcbiAgICAgICAgY29uc3Qgb0RlcHRoID0gdGhpcy5mc3cub3B0aW9ucy5kZXB0aDtcbiAgICAgICAgaWYgKChvRGVwdGggPT0gbnVsbCB8fCBkZXB0aCA8PSBvRGVwdGgpICYmICF0aGlzLmZzdy5fc3ltbGlua1BhdGhzLmhhcyhyZWFscGF0aCkpIHtcbiAgICAgICAgICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5faGFuZGxlUmVhZChkaXIsIGluaXRpYWxBZGQsIHdoLCB0YXJnZXQsIGRpciwgZGVwdGgsIHRocm90dGxlcik7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2xvc2VyID0gdGhpcy5fd2F0Y2hXaXRoTm9kZUZzKGRpciwgKGRpclBhdGgsIHN0YXRzKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gaWYgY3VycmVudCBkaXJlY3RvcnkgaXMgcmVtb3ZlZCwgZG8gbm90aGluZ1xuICAgICAgICAgICAgICAgIGlmIChzdGF0cyAmJiBzdGF0cy5tdGltZU1zID09PSAwKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlUmVhZChkaXJQYXRoLCBmYWxzZSwgd2gsIHRhcmdldCwgZGlyLCBkZXB0aCwgdGhyb3R0bGVyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjbG9zZXI7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBhZGRlZCBmaWxlLCBkaXJlY3RvcnksIG9yIGdsb2IgcGF0dGVybi5cbiAgICAgKiBEZWxlZ2F0ZXMgY2FsbCB0byBfaGFuZGxlRmlsZSAvIF9oYW5kbGVEaXIgYWZ0ZXIgY2hlY2tzLlxuICAgICAqIEBwYXJhbSBwYXRoIHRvIGZpbGUgb3IgaXJcbiAgICAgKiBAcGFyYW0gaW5pdGlhbEFkZCB3YXMgdGhlIGZpbGUgYWRkZWQgYXQgd2F0Y2ggaW5zdGFudGlhdGlvbj9cbiAgICAgKiBAcGFyYW0gcHJpb3JXaCBkZXB0aCByZWxhdGl2ZSB0byB1c2VyLXN1cHBsaWVkIHBhdGhcbiAgICAgKiBAcGFyYW0gZGVwdGggQ2hpbGQgcGF0aCBhY3R1YWxseSB0YXJnZXRlZCBmb3Igd2F0Y2hcbiAgICAgKiBAcGFyYW0gdGFyZ2V0IENoaWxkIHBhdGggYWN0dWFsbHkgdGFyZ2V0ZWQgZm9yIHdhdGNoXG4gICAgICovXG4gICAgYXN5bmMgX2FkZFRvTm9kZUZzKHBhdGgsIGluaXRpYWxBZGQsIHByaW9yV2gsIGRlcHRoLCB0YXJnZXQpIHtcbiAgICAgICAgY29uc3QgcmVhZHkgPSB0aGlzLmZzdy5fZW1pdFJlYWR5O1xuICAgICAgICBpZiAodGhpcy5mc3cuX2lzSWdub3JlZChwYXRoKSB8fCB0aGlzLmZzdy5jbG9zZWQpIHtcbiAgICAgICAgICAgIHJlYWR5KCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgd2ggPSB0aGlzLmZzdy5fZ2V0V2F0Y2hIZWxwZXJzKHBhdGgpO1xuICAgICAgICBpZiAocHJpb3JXaCkge1xuICAgICAgICAgICAgd2guZmlsdGVyUGF0aCA9IChlbnRyeSkgPT4gcHJpb3JXaC5maWx0ZXJQYXRoKGVudHJ5KTtcbiAgICAgICAgICAgIHdoLmZpbHRlckRpciA9IChlbnRyeSkgPT4gcHJpb3JXaC5maWx0ZXJEaXIoZW50cnkpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGV2YWx1YXRlIHdoYXQgaXMgYXQgdGhlIHBhdGggd2UncmUgYmVpbmcgYXNrZWQgdG8gd2F0Y2hcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgc3RhdE1ldGhvZHNbd2guc3RhdE1ldGhvZF0od2gud2F0Y2hQYXRoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKHRoaXMuZnN3Ll9pc0lnbm9yZWQod2gud2F0Y2hQYXRoLCBzdGF0cykpIHtcbiAgICAgICAgICAgICAgICByZWFkeSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGZvbGxvdyA9IHRoaXMuZnN3Lm9wdGlvbnMuZm9sbG93U3ltbGlua3M7XG4gICAgICAgICAgICBsZXQgY2xvc2VyO1xuICAgICAgICAgICAgaWYgKHN0YXRzLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhYnNQYXRoID0gc3lzUGF0aC5yZXNvbHZlKHBhdGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldFBhdGggPSBmb2xsb3cgPyBhd2FpdCBmc3JlYWxwYXRoKHBhdGgpIDogcGF0aDtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgY2xvc2VyID0gYXdhaXQgdGhpcy5faGFuZGxlRGlyKHdoLndhdGNoUGF0aCwgc3RhdHMsIGluaXRpYWxBZGQsIGRlcHRoLCB0YXJnZXQsIHdoLCB0YXJnZXRQYXRoKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgLy8gcHJlc2VydmUgdGhpcyBzeW1saW5rJ3MgdGFyZ2V0IHBhdGhcbiAgICAgICAgICAgICAgICBpZiAoYWJzUGF0aCAhPT0gdGFyZ2V0UGF0aCAmJiB0YXJnZXRQYXRoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX3N5bWxpbmtQYXRocy5zZXQoYWJzUGF0aCwgdGFyZ2V0UGF0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldFBhdGggPSBmb2xsb3cgPyBhd2FpdCBmc3JlYWxwYXRoKHBhdGgpIDogcGF0aDtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyZW50ID0gc3lzUGF0aC5kaXJuYW1lKHdoLndhdGNoUGF0aCk7XG4gICAgICAgICAgICAgICAgdGhpcy5mc3cuX2dldFdhdGNoZWREaXIocGFyZW50KS5hZGQod2gud2F0Y2hQYXRoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmZzdy5fZW1pdChFVi5BREQsIHdoLndhdGNoUGF0aCwgc3RhdHMpO1xuICAgICAgICAgICAgICAgIGNsb3NlciA9IGF3YWl0IHRoaXMuX2hhbmRsZURpcihwYXJlbnQsIHN0YXRzLCBpbml0aWFsQWRkLCBkZXB0aCwgcGF0aCwgd2gsIHRhcmdldFBhdGgpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAvLyBwcmVzZXJ2ZSB0aGlzIHN5bWxpbmsncyB0YXJnZXQgcGF0aFxuICAgICAgICAgICAgICAgIGlmICh0YXJnZXRQYXRoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mc3cuX3N5bWxpbmtQYXRocy5zZXQoc3lzUGF0aC5yZXNvbHZlKHBhdGgpLCB0YXJnZXRQYXRoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjbG9zZXIgPSB0aGlzLl9oYW5kbGVGaWxlKHdoLndhdGNoUGF0aCwgc3RhdHMsIGluaXRpYWxBZGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVhZHkoKTtcbiAgICAgICAgICAgIGlmIChjbG9zZXIpXG4gICAgICAgICAgICAgICAgdGhpcy5mc3cuX2FkZFBhdGhDbG9zZXIocGF0aCwgY2xvc2VyKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmZzdy5faGFuZGxlRXJyb3IoZXJyb3IpKSB7XG4gICAgICAgICAgICAgICAgcmVhZHkoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGF0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbiIsICIvKipcbiAqIERpc2NvdmVyIHR3ZWFrcyB1bmRlciA8dXNlclJvb3Q+L3R3ZWFrcy4gRWFjaCB0d2VhayBpcyBhIGRpcmVjdG9yeSB3aXRoIGFcbiAqIG1hbmlmZXN0Lmpzb24gYW5kIGFuIGVudHJ5IHNjcmlwdC4gRW50cnkgcmVzb2x1dGlvbiBpcyBtYW5pZmVzdC5tYWluIGZpcnN0LFxuICogdGhlbiBpbmRleC5qcywgaW5kZXgubWpzLCBhbmQgaW5kZXguY2pzLlxuICpcbiAqIFRoZSBtYW5pZmVzdCBnYXRlIGlzIGludGVudGlvbmFsbHkgc3RyaWN0LiBBIHR3ZWFrIG11c3QgaWRlbnRpZnkgaXRzIEdpdEh1YlxuICogcmVwb3NpdG9yeSBzbyB0aGUgbWFuYWdlciBjYW4gY2hlY2sgcmVsZWFzZXMgd2l0aG91dCBncmFudGluZyB0aGUgdHdlYWsgYW5cbiAqIHVwZGF0ZS9pbnN0YWxsIGNoYW5uZWwuIFVwZGF0ZSBjaGVja3MgYXJlIGFkdmlzb3J5IG9ubHkuXG4gKi9cbmltcG9ydCB7IHJlYWRkaXJTeW5jLCBzdGF0U3luYywgcmVhZEZpbGVTeW5jLCBleGlzdHNTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGpvaW4gfSBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgdHlwZSB7IFR3ZWFrTWFuaWZlc3QgfSBmcm9tIFwiQGNvZGV4LXBsdXNwbHVzL3Nka1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIERpc2NvdmVyZWRUd2VhayB7XG4gIGRpcjogc3RyaW5nO1xuICBlbnRyeTogc3RyaW5nO1xuICBtYW5pZmVzdDogVHdlYWtNYW5pZmVzdDtcbn1cblxuY29uc3QgRU5UUllfQ0FORElEQVRFUyA9IFtcImluZGV4LmpzXCIsIFwiaW5kZXguY2pzXCIsIFwiaW5kZXgubWpzXCJdO1xuXG5leHBvcnQgZnVuY3Rpb24gZGlzY292ZXJUd2Vha3ModHdlYWtzRGlyOiBzdHJpbmcpOiBEaXNjb3ZlcmVkVHdlYWtbXSB7XG4gIGlmICghZXhpc3RzU3luYyh0d2Vha3NEaXIpKSByZXR1cm4gW107XG4gIGNvbnN0IG91dDogRGlzY292ZXJlZFR3ZWFrW10gPSBbXTtcbiAgZm9yIChjb25zdCBuYW1lIG9mIHJlYWRkaXJTeW5jKHR3ZWFrc0RpcikpIHtcbiAgICBjb25zdCBkaXIgPSBqb2luKHR3ZWFrc0RpciwgbmFtZSk7XG4gICAgaWYgKCFzdGF0U3luYyhkaXIpLmlzRGlyZWN0b3J5KCkpIGNvbnRpbnVlO1xuICAgIGNvbnN0IG1hbmlmZXN0UGF0aCA9IGpvaW4oZGlyLCBcIm1hbmlmZXN0Lmpzb25cIik7XG4gICAgaWYgKCFleGlzdHNTeW5jKG1hbmlmZXN0UGF0aCkpIGNvbnRpbnVlO1xuICAgIGxldCBtYW5pZmVzdDogVHdlYWtNYW5pZmVzdDtcbiAgICB0cnkge1xuICAgICAgbWFuaWZlc3QgPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhtYW5pZmVzdFBhdGgsIFwidXRmOFwiKSkgYXMgVHdlYWtNYW5pZmVzdDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAoIWlzVmFsaWRNYW5pZmVzdChtYW5pZmVzdCkpIGNvbnRpbnVlO1xuICAgIGNvbnN0IGVudHJ5ID0gcmVzb2x2ZUVudHJ5KGRpciwgbWFuaWZlc3QpO1xuICAgIGlmICghZW50cnkpIGNvbnRpbnVlO1xuICAgIG91dC5wdXNoKHsgZGlyLCBlbnRyeSwgbWFuaWZlc3QgfSk7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gaXNWYWxpZE1hbmlmZXN0KG06IFR3ZWFrTWFuaWZlc3QpOiBib29sZWFuIHtcbiAgaWYgKCFtLmlkIHx8ICFtLm5hbWUgfHwgIW0udmVyc2lvbiB8fCAhbS5naXRodWJSZXBvKSByZXR1cm4gZmFsc2U7XG4gIGlmICghL15bYS16QS1aMC05Ll8tXStcXC9bYS16QS1aMC05Ll8tXSskLy50ZXN0KG0uZ2l0aHViUmVwbykpIHJldHVybiBmYWxzZTtcbiAgaWYgKG0uc2NvcGUgJiYgIVtcInJlbmRlcmVyXCIsIFwibWFpblwiLCBcImJvdGhcIl0uaW5jbHVkZXMobS5zY29wZSkpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVFbnRyeShkaXI6IHN0cmluZywgbTogVHdlYWtNYW5pZmVzdCk6IHN0cmluZyB8IG51bGwge1xuICBpZiAobS5tYWluKSB7XG4gICAgY29uc3QgcCA9IGpvaW4oZGlyLCBtLm1haW4pO1xuICAgIHJldHVybiBleGlzdHNTeW5jKHApID8gcCA6IG51bGw7XG4gIH1cbiAgZm9yIChjb25zdCBjIG9mIEVOVFJZX0NBTkRJREFURVMpIHtcbiAgICBjb25zdCBwID0gam9pbihkaXIsIGMpO1xuICAgIGlmIChleGlzdHNTeW5jKHApKSByZXR1cm4gcDtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cbiIsICIvKipcbiAqIERpc2stYmFja2VkIGtleS92YWx1ZSBzdG9yYWdlIGZvciBtYWluLXByb2Nlc3MgdHdlYWtzLlxuICpcbiAqIEVhY2ggdHdlYWsgZ2V0cyBvbmUgSlNPTiBmaWxlIHVuZGVyIGA8dXNlclJvb3Q+L3N0b3JhZ2UvPGlkPi5qc29uYC5cbiAqIFdyaXRlcyBhcmUgZGVib3VuY2VkICg1MCBtcykgYW5kIGF0b21pYyAod3JpdGUgdG8gPGZpbGU+LnRtcCB0aGVuIHJlbmFtZSkuXG4gKiBSZWFkcyBhcmUgZWFnZXIgKyBjYWNoZWQgaW4tbWVtb3J5OyB3ZSBsb2FkIG9uIGZpcnN0IGFjY2Vzcy5cbiAqL1xuaW1wb3J0IHtcbiAgZXhpc3RzU3luYyxcbiAgbWtkaXJTeW5jLFxuICByZWFkRmlsZVN5bmMsXG4gIHJlbmFtZVN5bmMsXG4gIHdyaXRlRmlsZVN5bmMsXG59IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIERpc2tTdG9yYWdlIHtcbiAgZ2V0PFQ+KGtleTogc3RyaW5nLCBkZWZhdWx0VmFsdWU/OiBUKTogVDtcbiAgc2V0KGtleTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bik6IHZvaWQ7XG4gIGRlbGV0ZShrZXk6IHN0cmluZyk6IHZvaWQ7XG4gIGFsbCgpOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgZmx1c2goKTogdm9pZDtcbn1cblxuY29uc3QgRkxVU0hfREVMQVlfTVMgPSA1MDtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZURpc2tTdG9yYWdlKHJvb3REaXI6IHN0cmluZywgaWQ6IHN0cmluZyk6IERpc2tTdG9yYWdlIHtcbiAgY29uc3QgZGlyID0gam9pbihyb290RGlyLCBcInN0b3JhZ2VcIik7XG4gIG1rZGlyU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICBjb25zdCBmaWxlID0gam9pbihkaXIsIGAke3Nhbml0aXplKGlkKX0uanNvbmApO1xuXG4gIGxldCBkYXRhOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICBpZiAoZXhpc3RzU3luYyhmaWxlKSkge1xuICAgIHRyeSB7XG4gICAgICBkYXRhID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMoZmlsZSwgXCJ1dGY4XCIpKSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIENvcnJ1cHQgZmlsZSBcdTIwMTQgc3RhcnQgZnJlc2gsIGJ1dCBkb24ndCBjbG9iYmVyIHRoZSBvcmlnaW5hbCB1bnRpbCB3ZVxuICAgICAgLy8gc3VjY2Vzc2Z1bGx5IHdyaXRlIGFnYWluLiAoTW92ZSBpdCBhc2lkZSBmb3IgZm9yZW5zaWNzLilcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlbmFtZVN5bmMoZmlsZSwgYCR7ZmlsZX0uY29ycnVwdC0ke0RhdGUubm93KCl9YCk7XG4gICAgICB9IGNhdGNoIHt9XG4gICAgICBkYXRhID0ge307XG4gICAgfVxuICB9XG5cbiAgbGV0IGRpcnR5ID0gZmFsc2U7XG4gIGxldCB0aW1lcjogTm9kZUpTLlRpbWVvdXQgfCBudWxsID0gbnVsbDtcblxuICBjb25zdCBzY2hlZHVsZUZsdXNoID0gKCkgPT4ge1xuICAgIGRpcnR5ID0gdHJ1ZTtcbiAgICBpZiAodGltZXIpIHJldHVybjtcbiAgICB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGltZXIgPSBudWxsO1xuICAgICAgaWYgKGRpcnR5KSBmbHVzaCgpO1xuICAgIH0sIEZMVVNIX0RFTEFZX01TKTtcbiAgfTtcblxuICBjb25zdCBmbHVzaCA9ICgpOiB2b2lkID0+IHtcbiAgICBpZiAoIWRpcnR5KSByZXR1cm47XG4gICAgY29uc3QgdG1wID0gYCR7ZmlsZX0udG1wYDtcbiAgICB0cnkge1xuICAgICAgd3JpdGVGaWxlU3luYyh0bXAsIEpTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIDIpLCBcInV0ZjhcIik7XG4gICAgICByZW5hbWVTeW5jKHRtcCwgZmlsZSk7XG4gICAgICBkaXJ0eSA9IGZhbHNlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIExlYXZlIGRpcnR5PXRydWUgc28gYSBmdXR1cmUgZmx1c2ggcmV0cmllcy5cbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJbY29kZXgtcGx1c3BsdXNdIHN0b3JhZ2UgZmx1c2ggZmFpbGVkOlwiLCBpZCwgZSk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiB7XG4gICAgZ2V0OiA8VD4oazogc3RyaW5nLCBkPzogVCk6IFQgPT5cbiAgICAgIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChkYXRhLCBrKSA/IChkYXRhW2tdIGFzIFQpIDogKGQgYXMgVCksXG4gICAgc2V0KGssIHYpIHtcbiAgICAgIGRhdGFba10gPSB2O1xuICAgICAgc2NoZWR1bGVGbHVzaCgpO1xuICAgIH0sXG4gICAgZGVsZXRlKGspIHtcbiAgICAgIGlmIChrIGluIGRhdGEpIHtcbiAgICAgICAgZGVsZXRlIGRhdGFba107XG4gICAgICAgIHNjaGVkdWxlRmx1c2goKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGFsbDogKCkgPT4gKHsgLi4uZGF0YSB9KSxcbiAgICBmbHVzaCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gc2FuaXRpemUoaWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIC8vIFR3ZWFrIGlkcyBhcmUgYXV0aG9yLWNvbnRyb2xsZWQ7IGNsYW1wIHRvIGEgc2FmZSBmaWxlbmFtZS5cbiAgcmV0dXJuIGlkLnJlcGxhY2UoL1teYS16QS1aMC05Ll9ALV0vZywgXCJfXCIpO1xufVxuIiwgImltcG9ydCB7IGV4aXN0c1N5bmMsIG1rZGlyU3luYywgcmVhZEZpbGVTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGRpcm5hbWUsIGlzQWJzb2x1dGUsIHJlc29sdmUgfSBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgdHlwZSB7IFR3ZWFrTWNwU2VydmVyIH0gZnJvbSBcIkBjb2RleC1wbHVzcGx1cy9zZGtcIjtcblxuZXhwb3J0IGNvbnN0IE1DUF9NQU5BR0VEX1NUQVJUID0gXCIjIEJFR0lOIENPREVYKysgTUFOQUdFRCBNQ1AgU0VSVkVSU1wiO1xuZXhwb3J0IGNvbnN0IE1DUF9NQU5BR0VEX0VORCA9IFwiIyBFTkQgQ09ERVgrKyBNQU5BR0VEIE1DUCBTRVJWRVJTXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWNwU3luY1R3ZWFrIHtcbiAgZGlyOiBzdHJpbmc7XG4gIG1hbmlmZXN0OiB7XG4gICAgaWQ6IHN0cmluZztcbiAgICBtY3A/OiBUd2Vha01jcFNlcnZlcjtcbiAgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBCdWlsdE1hbmFnZWRNY3BCbG9jayB7XG4gIGJsb2NrOiBzdHJpbmc7XG4gIHNlcnZlck5hbWVzOiBzdHJpbmdbXTtcbiAgc2tpcHBlZFNlcnZlck5hbWVzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNYW5hZ2VkTWNwU3luY1Jlc3VsdCBleHRlbmRzIEJ1aWx0TWFuYWdlZE1jcEJsb2NrIHtcbiAgY2hhbmdlZDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN5bmNNYW5hZ2VkTWNwU2VydmVycyh7XG4gIGNvbmZpZ1BhdGgsXG4gIHR3ZWFrcyxcbn06IHtcbiAgY29uZmlnUGF0aDogc3RyaW5nO1xuICB0d2Vha3M6IE1jcFN5bmNUd2Vha1tdO1xufSk6IE1hbmFnZWRNY3BTeW5jUmVzdWx0IHtcbiAgY29uc3QgY3VycmVudCA9IGV4aXN0c1N5bmMoY29uZmlnUGF0aCkgPyByZWFkRmlsZVN5bmMoY29uZmlnUGF0aCwgXCJ1dGY4XCIpIDogXCJcIjtcbiAgY29uc3QgYnVpbHQgPSBidWlsZE1hbmFnZWRNY3BCbG9jayh0d2Vha3MsIGN1cnJlbnQpO1xuICBjb25zdCBuZXh0ID0gbWVyZ2VNYW5hZ2VkTWNwQmxvY2soY3VycmVudCwgYnVpbHQuYmxvY2spO1xuXG4gIGlmIChuZXh0ICE9PSBjdXJyZW50KSB7XG4gICAgbWtkaXJTeW5jKGRpcm5hbWUoY29uZmlnUGF0aCksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIHdyaXRlRmlsZVN5bmMoY29uZmlnUGF0aCwgbmV4dCwgXCJ1dGY4XCIpO1xuICB9XG5cbiAgcmV0dXJuIHsgLi4uYnVpbHQsIGNoYW5nZWQ6IG5leHQgIT09IGN1cnJlbnQgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkTWFuYWdlZE1jcEJsb2NrKFxuICB0d2Vha3M6IE1jcFN5bmNUd2Vha1tdLFxuICBleGlzdGluZ1RvbWwgPSBcIlwiLFxuKTogQnVpbHRNYW5hZ2VkTWNwQmxvY2sge1xuICBjb25zdCBtYW51YWxUb21sID0gc3RyaXBNYW5hZ2VkTWNwQmxvY2soZXhpc3RpbmdUb21sKTtcbiAgY29uc3QgbWFudWFsTmFtZXMgPSBmaW5kTWNwU2VydmVyTmFtZXMobWFudWFsVG9tbCk7XG4gIGNvbnN0IHVzZWROYW1lcyA9IG5ldyBTZXQobWFudWFsTmFtZXMpO1xuICBjb25zdCBzZXJ2ZXJOYW1lczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3Qgc2tpcHBlZFNlcnZlck5hbWVzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBlbnRyaWVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgdHdlYWsgb2YgdHdlYWtzKSB7XG4gICAgY29uc3QgbWNwID0gbm9ybWFsaXplTWNwU2VydmVyKHR3ZWFrLm1hbmlmZXN0Lm1jcCk7XG4gICAgaWYgKCFtY3ApIGNvbnRpbnVlO1xuXG4gICAgY29uc3QgYmFzZU5hbWUgPSBtY3BTZXJ2ZXJOYW1lRnJvbVR3ZWFrSWQodHdlYWsubWFuaWZlc3QuaWQpO1xuICAgIGlmIChtYW51YWxOYW1lcy5oYXMoYmFzZU5hbWUpKSB7XG4gICAgICBza2lwcGVkU2VydmVyTmFtZXMucHVzaChiYXNlTmFtZSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBzZXJ2ZXJOYW1lID0gcmVzZXJ2ZVVuaXF1ZU5hbWUoYmFzZU5hbWUsIHVzZWROYW1lcyk7XG4gICAgc2VydmVyTmFtZXMucHVzaChzZXJ2ZXJOYW1lKTtcbiAgICBlbnRyaWVzLnB1c2goZm9ybWF0TWNwU2VydmVyKHNlcnZlck5hbWUsIHR3ZWFrLmRpciwgbWNwKSk7XG4gIH1cblxuICBpZiAoZW50cmllcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4geyBibG9jazogXCJcIiwgc2VydmVyTmFtZXMsIHNraXBwZWRTZXJ2ZXJOYW1lcyB9O1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBibG9jazogW01DUF9NQU5BR0VEX1NUQVJULCAuLi5lbnRyaWVzLCBNQ1BfTUFOQUdFRF9FTkRdLmpvaW4oXCJcXG5cIiksXG4gICAgc2VydmVyTmFtZXMsXG4gICAgc2tpcHBlZFNlcnZlck5hbWVzLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWVyZ2VNYW5hZ2VkTWNwQmxvY2soY3VycmVudFRvbWw6IHN0cmluZywgbWFuYWdlZEJsb2NrOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoIW1hbmFnZWRCbG9jayAmJiAhY3VycmVudFRvbWwuaW5jbHVkZXMoTUNQX01BTkFHRURfU1RBUlQpKSByZXR1cm4gY3VycmVudFRvbWw7XG4gIGNvbnN0IHN0cmlwcGVkID0gc3RyaXBNYW5hZ2VkTWNwQmxvY2soY3VycmVudFRvbWwpLnRyaW1FbmQoKTtcbiAgaWYgKCFtYW5hZ2VkQmxvY2spIHJldHVybiBzdHJpcHBlZCA/IGAke3N0cmlwcGVkfVxcbmAgOiBcIlwiO1xuICByZXR1cm4gYCR7c3RyaXBwZWQgPyBgJHtzdHJpcHBlZH1cXG5cXG5gIDogXCJcIn0ke21hbmFnZWRCbG9ja31cXG5gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RyaXBNYW5hZ2VkTWNwQmxvY2sodG9tbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgcGF0dGVybiA9IG5ldyBSZWdFeHAoXG4gICAgYFxcXFxuPyR7ZXNjYXBlUmVnRXhwKE1DUF9NQU5BR0VEX1NUQVJUKX1bXFxcXHNcXFxcU10qPyR7ZXNjYXBlUmVnRXhwKE1DUF9NQU5BR0VEX0VORCl9XFxcXG4/YCxcbiAgICBcImdcIixcbiAgKTtcbiAgcmV0dXJuIHRvbWwucmVwbGFjZShwYXR0ZXJuLCBcIlxcblwiKS5yZXBsYWNlKC9cXG57Myx9L2csIFwiXFxuXFxuXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWNwU2VydmVyTmFtZUZyb21Ud2Vha0lkKGlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCB3aXRob3V0UHVibGlzaGVyID0gaWQucmVwbGFjZSgvXmNvXFwuYmVubmV0dFxcLi8sIFwiXCIpO1xuICBjb25zdCBzbHVnID0gd2l0aG91dFB1Ymxpc2hlclxuICAgIC5yZXBsYWNlKC9bXmEtekEtWjAtOV8tXSsvZywgXCItXCIpXG4gICAgLnJlcGxhY2UoL14tK3wtKyQvZywgXCJcIilcbiAgICAudG9Mb3dlckNhc2UoKTtcbiAgcmV0dXJuIHNsdWcgfHwgXCJ0d2Vhay1tY3BcIjtcbn1cblxuZnVuY3Rpb24gZmluZE1jcFNlcnZlck5hbWVzKHRvbWw6IHN0cmluZyk6IFNldDxzdHJpbmc+IHtcbiAgY29uc3QgbmFtZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgdGFibGVQYXR0ZXJuID0gL15cXHMqXFxbbWNwX3NlcnZlcnNcXC4oW15cXF1cXHNdKylcXF1cXHMqJC9nbTtcbiAgbGV0IG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xuICB3aGlsZSAoKG1hdGNoID0gdGFibGVQYXR0ZXJuLmV4ZWModG9tbCkpICE9PSBudWxsKSB7XG4gICAgbmFtZXMuYWRkKHVucXVvdGVUb21sS2V5KG1hdGNoWzFdID8/IFwiXCIpKTtcbiAgfVxuICByZXR1cm4gbmFtZXM7XG59XG5cbmZ1bmN0aW9uIHJlc2VydmVVbmlxdWVOYW1lKGJhc2VOYW1lOiBzdHJpbmcsIHVzZWROYW1lczogU2V0PHN0cmluZz4pOiBzdHJpbmcge1xuICBpZiAoIXVzZWROYW1lcy5oYXMoYmFzZU5hbWUpKSB7XG4gICAgdXNlZE5hbWVzLmFkZChiYXNlTmFtZSk7XG4gICAgcmV0dXJuIGJhc2VOYW1lO1xuICB9XG4gIGZvciAobGV0IGkgPSAyOyA7IGkgKz0gMSkge1xuICAgIGNvbnN0IGNhbmRpZGF0ZSA9IGAke2Jhc2VOYW1lfS0ke2l9YDtcbiAgICBpZiAoIXVzZWROYW1lcy5oYXMoY2FuZGlkYXRlKSkge1xuICAgICAgdXNlZE5hbWVzLmFkZChjYW5kaWRhdGUpO1xuICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplTWNwU2VydmVyKHZhbHVlOiBUd2Vha01jcFNlcnZlciB8IHVuZGVmaW5lZCk6IFR3ZWFrTWNwU2VydmVyIHwgbnVsbCB7XG4gIGlmICghdmFsdWUgfHwgdHlwZW9mIHZhbHVlLmNvbW1hbmQgIT09IFwic3RyaW5nXCIgfHwgdmFsdWUuY29tbWFuZC5sZW5ndGggPT09IDApIHJldHVybiBudWxsO1xuICBpZiAodmFsdWUuYXJncyAhPT0gdW5kZWZpbmVkICYmICFBcnJheS5pc0FycmF5KHZhbHVlLmFyZ3MpKSByZXR1cm4gbnVsbDtcbiAgaWYgKHZhbHVlLmFyZ3M/LnNvbWUoKGFyZykgPT4gdHlwZW9mIGFyZyAhPT0gXCJzdHJpbmdcIikpIHJldHVybiBudWxsO1xuICBpZiAodmFsdWUuZW52ICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAoIXZhbHVlLmVudiB8fCB0eXBlb2YgdmFsdWUuZW52ICE9PSBcIm9iamVjdFwiIHx8IEFycmF5LmlzQXJyYXkodmFsdWUuZW52KSkgcmV0dXJuIG51bGw7XG4gICAgaWYgKE9iamVjdC52YWx1ZXModmFsdWUuZW52KS5zb21lKChlbnZWYWx1ZSkgPT4gdHlwZW9mIGVudlZhbHVlICE9PSBcInN0cmluZ1wiKSkgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRNY3BTZXJ2ZXIoc2VydmVyTmFtZTogc3RyaW5nLCB0d2Vha0Rpcjogc3RyaW5nLCBtY3A6IFR3ZWFrTWNwU2VydmVyKTogc3RyaW5nIHtcbiAgY29uc3QgbGluZXMgPSBbXG4gICAgYFttY3Bfc2VydmVycy4ke2Zvcm1hdFRvbWxLZXkoc2VydmVyTmFtZSl9XWAsXG4gICAgYGNvbW1hbmQgPSAke2Zvcm1hdFRvbWxTdHJpbmcocmVzb2x2ZUNvbW1hbmQodHdlYWtEaXIsIG1jcC5jb21tYW5kKSl9YCxcbiAgXTtcblxuICBpZiAobWNwLmFyZ3MgJiYgbWNwLmFyZ3MubGVuZ3RoID4gMCkge1xuICAgIGxpbmVzLnB1c2goYGFyZ3MgPSAke2Zvcm1hdFRvbWxTdHJpbmdBcnJheShtY3AuYXJncy5tYXAoKGFyZykgPT4gcmVzb2x2ZUFyZyh0d2Vha0RpciwgYXJnKSkpfWApO1xuICB9XG5cbiAgaWYgKG1jcC5lbnYgJiYgT2JqZWN0LmtleXMobWNwLmVudikubGVuZ3RoID4gMCkge1xuICAgIGxpbmVzLnB1c2goYGVudiA9ICR7Zm9ybWF0VG9tbElubGluZVRhYmxlKG1jcC5lbnYpfWApO1xuICB9XG5cbiAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVDb21tYW5kKHR3ZWFrRGlyOiBzdHJpbmcsIGNvbW1hbmQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmIChpc0Fic29sdXRlKGNvbW1hbmQpIHx8ICFsb29rc0xpa2VSZWxhdGl2ZVBhdGgoY29tbWFuZCkpIHJldHVybiBjb21tYW5kO1xuICByZXR1cm4gcmVzb2x2ZSh0d2Vha0RpciwgY29tbWFuZCk7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVBcmcodHdlYWtEaXI6IHN0cmluZywgYXJnOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoaXNBYnNvbHV0ZShhcmcpIHx8IGFyZy5zdGFydHNXaXRoKFwiLVwiKSkgcmV0dXJuIGFyZztcbiAgY29uc3QgY2FuZGlkYXRlID0gcmVzb2x2ZSh0d2Vha0RpciwgYXJnKTtcbiAgcmV0dXJuIGV4aXN0c1N5bmMoY2FuZGlkYXRlKSA/IGNhbmRpZGF0ZSA6IGFyZztcbn1cblxuZnVuY3Rpb24gbG9va3NMaWtlUmVsYXRpdmVQYXRoKHZhbHVlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIHZhbHVlLnN0YXJ0c1dpdGgoXCIuL1wiKSB8fCB2YWx1ZS5zdGFydHNXaXRoKFwiLi4vXCIpIHx8IHZhbHVlLmluY2x1ZGVzKFwiL1wiKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VG9tbFN0cmluZyh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VG9tbFN0cmluZ0FycmF5KHZhbHVlczogc3RyaW5nW10pOiBzdHJpbmcge1xuICByZXR1cm4gYFske3ZhbHVlcy5tYXAoZm9ybWF0VG9tbFN0cmluZykuam9pbihcIiwgXCIpfV1gO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRUb21sSW5saW5lVGFibGUocmVjb3JkOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KTogc3RyaW5nIHtcbiAgcmV0dXJuIGB7ICR7T2JqZWN0LmVudHJpZXMocmVjb3JkKVxuICAgIC5tYXAoKFtrZXksIHZhbHVlXSkgPT4gYCR7Zm9ybWF0VG9tbEtleShrZXkpfSA9ICR7Zm9ybWF0VG9tbFN0cmluZyh2YWx1ZSl9YClcbiAgICAuam9pbihcIiwgXCIpfSB9YDtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VG9tbEtleShrZXk6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiAvXlthLXpBLVowLTlfLV0rJC8udGVzdChrZXkpID8ga2V5IDogZm9ybWF0VG9tbFN0cmluZyhrZXkpO1xufVxuXG5mdW5jdGlvbiB1bnF1b3RlVG9tbEtleShrZXk6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICgha2V5LnN0YXJ0c1dpdGgoJ1wiJykgfHwgIWtleS5lbmRzV2l0aCgnXCInKSkgcmV0dXJuIGtleTtcbiAgdHJ5IHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShrZXkpIGFzIHN0cmluZztcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGtleTtcbiAgfVxufVxuXG5mdW5jdGlvbiBlc2NhcGVSZWdFeHAodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB2YWx1ZS5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgXCJcXFxcJCZcIik7XG59XG4iLCAiaW1wb3J0IHsgZXhlY0ZpbGVTeW5jIH0gZnJvbSBcIm5vZGU6Y2hpbGRfcHJvY2Vzc1wiO1xuaW1wb3J0IHsgZXhpc3RzU3luYywgcmVhZEZpbGVTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGhvbWVkaXIsIHBsYXRmb3JtIH0gZnJvbSBcIm5vZGU6b3NcIjtcbmltcG9ydCB7IGpvaW4gfSBmcm9tIFwibm9kZTpwYXRoXCI7XG5cbnR5cGUgQ2hlY2tTdGF0dXMgPSBcIm9rXCIgfCBcIndhcm5cIiB8IFwiZXJyb3JcIjtcblxuZXhwb3J0IGludGVyZmFjZSBXYXRjaGVySGVhbHRoQ2hlY2sge1xuICBuYW1lOiBzdHJpbmc7XG4gIHN0YXR1czogQ2hlY2tTdGF0dXM7XG4gIGRldGFpbDogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdhdGNoZXJIZWFsdGgge1xuICBjaGVja2VkQXQ6IHN0cmluZztcbiAgc3RhdHVzOiBDaGVja1N0YXR1cztcbiAgdGl0bGU6IHN0cmluZztcbiAgc3VtbWFyeTogc3RyaW5nO1xuICB3YXRjaGVyOiBzdHJpbmc7XG4gIGNoZWNrczogV2F0Y2hlckhlYWx0aENoZWNrW107XG59XG5cbmludGVyZmFjZSBJbnN0YWxsZXJTdGF0ZSB7XG4gIGFwcFJvb3Q/OiBzdHJpbmc7XG4gIHZlcnNpb24/OiBzdHJpbmc7XG4gIHdhdGNoZXI/OiBcImxhdW5jaGRcIiB8IFwibG9naW4taXRlbVwiIHwgXCJzY2hlZHVsZWQtdGFza1wiIHwgXCJzeXN0ZW1kXCIgfCBcIm5vbmVcIjtcbn1cblxuaW50ZXJmYWNlIFJ1bnRpbWVDb25maWcge1xuICBjb2RleFBsdXNQbHVzPzoge1xuICAgIGF1dG9VcGRhdGU/OiBib29sZWFuO1xuICB9O1xufVxuXG5pbnRlcmZhY2UgU2VsZlVwZGF0ZVN0YXRlIHtcbiAgc3RhdHVzPzogXCJjaGVja2luZ1wiIHwgXCJ1cC10by1kYXRlXCIgfCBcInVwZGF0ZWRcIiB8IFwiZmFpbGVkXCIgfCBcImRpc2FibGVkXCI7XG4gIGNvbXBsZXRlZEF0Pzogc3RyaW5nO1xuICBjaGVja2VkQXQ/OiBzdHJpbmc7XG4gIGxhdGVzdFZlcnNpb24/OiBzdHJpbmcgfCBudWxsO1xuICBlcnJvcj86IHN0cmluZztcbn1cblxuY29uc3QgTEFVTkNIRF9MQUJFTCA9IFwiY29tLmNvZGV4cGx1c3BsdXMud2F0Y2hlclwiO1xuY29uc3QgV0FUQ0hFUl9MT0cgPSBqb2luKGhvbWVkaXIoKSwgXCJMaWJyYXJ5XCIsIFwiTG9nc1wiLCBcImNvZGV4LXBsdXNwbHVzLXdhdGNoZXIubG9nXCIpO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0V2F0Y2hlckhlYWx0aCh1c2VyUm9vdDogc3RyaW5nKTogV2F0Y2hlckhlYWx0aCB7XG4gIGNvbnN0IGNoZWNrczogV2F0Y2hlckhlYWx0aENoZWNrW10gPSBbXTtcbiAgY29uc3Qgc3RhdGUgPSByZWFkSnNvbjxJbnN0YWxsZXJTdGF0ZT4oam9pbih1c2VyUm9vdCwgXCJzdGF0ZS5qc29uXCIpKTtcbiAgY29uc3QgY29uZmlnID0gcmVhZEpzb248UnVudGltZUNvbmZpZz4oam9pbih1c2VyUm9vdCwgXCJjb25maWcuanNvblwiKSkgPz8ge307XG4gIGNvbnN0IHNlbGZVcGRhdGUgPSByZWFkSnNvbjxTZWxmVXBkYXRlU3RhdGU+KGpvaW4odXNlclJvb3QsIFwic2VsZi11cGRhdGUtc3RhdGUuanNvblwiKSk7XG5cbiAgY2hlY2tzLnB1c2goe1xuICAgIG5hbWU6IFwiSW5zdGFsbCBzdGF0ZVwiLFxuICAgIHN0YXR1czogc3RhdGUgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgZGV0YWlsOiBzdGF0ZSA/IGBDb2RleCsrICR7c3RhdGUudmVyc2lvbiA/PyBcIih1bmtub3duIHZlcnNpb24pXCJ9YCA6IFwic3RhdGUuanNvbiBpcyBtaXNzaW5nXCIsXG4gIH0pO1xuXG4gIGlmICghc3RhdGUpIHJldHVybiBzdW1tYXJpemUoXCJub25lXCIsIGNoZWNrcyk7XG5cbiAgY29uc3QgYXV0b1VwZGF0ZSA9IGNvbmZpZy5jb2RleFBsdXNQbHVzPy5hdXRvVXBkYXRlICE9PSBmYWxzZTtcbiAgY2hlY2tzLnB1c2goe1xuICAgIG5hbWU6IFwiQXV0b21hdGljIHJlZnJlc2hcIixcbiAgICBzdGF0dXM6IGF1dG9VcGRhdGUgPyBcIm9rXCIgOiBcIndhcm5cIixcbiAgICBkZXRhaWw6IGF1dG9VcGRhdGUgPyBcImVuYWJsZWRcIiA6IFwiZGlzYWJsZWQgaW4gQ29kZXgrKyBjb25maWdcIixcbiAgfSk7XG5cbiAgY2hlY2tzLnB1c2goe1xuICAgIG5hbWU6IFwiV2F0Y2hlciBraW5kXCIsXG4gICAgc3RhdHVzOiBzdGF0ZS53YXRjaGVyICYmIHN0YXRlLndhdGNoZXIgIT09IFwibm9uZVwiID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgIGRldGFpbDogc3RhdGUud2F0Y2hlciA/PyBcIm5vbmVcIixcbiAgfSk7XG5cbiAgaWYgKHNlbGZVcGRhdGUpIHtcbiAgICBjaGVja3MucHVzaChzZWxmVXBkYXRlQ2hlY2soc2VsZlVwZGF0ZSkpO1xuICB9XG5cbiAgY29uc3QgYXBwUm9vdCA9IHN0YXRlLmFwcFJvb3QgPz8gXCJcIjtcbiAgY2hlY2tzLnB1c2goe1xuICAgIG5hbWU6IFwiQ29kZXggYXBwXCIsXG4gICAgc3RhdHVzOiBhcHBSb290ICYmIGV4aXN0c1N5bmMoYXBwUm9vdCkgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgZGV0YWlsOiBhcHBSb290IHx8IFwibWlzc2luZyBhcHBSb290IGluIHN0YXRlXCIsXG4gIH0pO1xuXG4gIHN3aXRjaCAocGxhdGZvcm0oKSkge1xuICAgIGNhc2UgXCJkYXJ3aW5cIjpcbiAgICAgIGNoZWNrcy5wdXNoKC4uLmNoZWNrTGF1bmNoZFdhdGNoZXIoYXBwUm9vdCkpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBcImxpbnV4XCI6XG4gICAgICBjaGVja3MucHVzaCguLi5jaGVja1N5c3RlbWRXYXRjaGVyKGFwcFJvb3QpKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgXCJ3aW4zMlwiOlxuICAgICAgY2hlY2tzLnB1c2goLi4uY2hlY2tTY2hlZHVsZWRUYXNrV2F0Y2hlcigpKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBjaGVja3MucHVzaCh7XG4gICAgICAgIG5hbWU6IFwiUGxhdGZvcm0gd2F0Y2hlclwiLFxuICAgICAgICBzdGF0dXM6IFwid2FyblwiLFxuICAgICAgICBkZXRhaWw6IGB1bnN1cHBvcnRlZCBwbGF0Zm9ybTogJHtwbGF0Zm9ybSgpfWAsXG4gICAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBzdW1tYXJpemUoc3RhdGUud2F0Y2hlciA/PyBcIm5vbmVcIiwgY2hlY2tzKTtcbn1cblxuZnVuY3Rpb24gc2VsZlVwZGF0ZUNoZWNrKHN0YXRlOiBTZWxmVXBkYXRlU3RhdGUpOiBXYXRjaGVySGVhbHRoQ2hlY2sge1xuICBjb25zdCBhdCA9IHN0YXRlLmNvbXBsZXRlZEF0ID8/IHN0YXRlLmNoZWNrZWRBdCA/PyBcInVua25vd24gdGltZVwiO1xuICBpZiAoc3RhdGUuc3RhdHVzID09PSBcImZhaWxlZFwiKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IFwibGFzdCBDb2RleCsrIHVwZGF0ZVwiLFxuICAgICAgc3RhdHVzOiBcIndhcm5cIixcbiAgICAgIGRldGFpbDogc3RhdGUuZXJyb3IgPyBgZmFpbGVkICR7YXR9OiAke3N0YXRlLmVycm9yfWAgOiBgZmFpbGVkICR7YXR9YCxcbiAgICB9O1xuICB9XG4gIGlmIChzdGF0ZS5zdGF0dXMgPT09IFwiZGlzYWJsZWRcIikge1xuICAgIHJldHVybiB7IG5hbWU6IFwibGFzdCBDb2RleCsrIHVwZGF0ZVwiLCBzdGF0dXM6IFwid2FyblwiLCBkZXRhaWw6IGBza2lwcGVkICR7YXR9OiBhdXRvbWF0aWMgcmVmcmVzaCBkaXNhYmxlZGAgfTtcbiAgfVxuICBpZiAoc3RhdGUuc3RhdHVzID09PSBcInVwZGF0ZWRcIikge1xuICAgIHJldHVybiB7IG5hbWU6IFwibGFzdCBDb2RleCsrIHVwZGF0ZVwiLCBzdGF0dXM6IFwib2tcIiwgZGV0YWlsOiBgdXBkYXRlZCAke2F0fSB0byAke3N0YXRlLmxhdGVzdFZlcnNpb24gPz8gXCJuZXcgcmVsZWFzZVwifWAgfTtcbiAgfVxuICBpZiAoc3RhdGUuc3RhdHVzID09PSBcInVwLXRvLWRhdGVcIikge1xuICAgIHJldHVybiB7IG5hbWU6IFwibGFzdCBDb2RleCsrIHVwZGF0ZVwiLCBzdGF0dXM6IFwib2tcIiwgZGV0YWlsOiBgdXAgdG8gZGF0ZSAke2F0fWAgfTtcbiAgfVxuICByZXR1cm4geyBuYW1lOiBcImxhc3QgQ29kZXgrKyB1cGRhdGVcIiwgc3RhdHVzOiBcIndhcm5cIiwgZGV0YWlsOiBgY2hlY2tpbmcgc2luY2UgJHthdH1gIH07XG59XG5cbmZ1bmN0aW9uIGNoZWNrTGF1bmNoZFdhdGNoZXIoYXBwUm9vdDogc3RyaW5nKTogV2F0Y2hlckhlYWx0aENoZWNrW10ge1xuICBjb25zdCBjaGVja3M6IFdhdGNoZXJIZWFsdGhDaGVja1tdID0gW107XG4gIGNvbnN0IHBsaXN0UGF0aCA9IGpvaW4oaG9tZWRpcigpLCBcIkxpYnJhcnlcIiwgXCJMYXVuY2hBZ2VudHNcIiwgYCR7TEFVTkNIRF9MQUJFTH0ucGxpc3RgKTtcbiAgY29uc3QgcGxpc3QgPSBleGlzdHNTeW5jKHBsaXN0UGF0aCkgPyByZWFkRmlsZVNhZmUocGxpc3RQYXRoKSA6IFwiXCI7XG4gIGNvbnN0IGFzYXJQYXRoID0gYXBwUm9vdCA/IGpvaW4oYXBwUm9vdCwgXCJDb250ZW50c1wiLCBcIlJlc291cmNlc1wiLCBcImFwcC5hc2FyXCIpIDogXCJcIjtcblxuICBjaGVja3MucHVzaCh7XG4gICAgbmFtZTogXCJsYXVuY2hkIHBsaXN0XCIsXG4gICAgc3RhdHVzOiBwbGlzdCA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICBkZXRhaWw6IHBsaXN0UGF0aCxcbiAgfSk7XG5cbiAgaWYgKHBsaXN0KSB7XG4gICAgY2hlY2tzLnB1c2goe1xuICAgICAgbmFtZTogXCJsYXVuY2hkIGxhYmVsXCIsXG4gICAgICBzdGF0dXM6IHBsaXN0LmluY2x1ZGVzKExBVU5DSERfTEFCRUwpID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgICAgZGV0YWlsOiBMQVVOQ0hEX0xBQkVMLFxuICAgIH0pO1xuICAgIGNoZWNrcy5wdXNoKHtcbiAgICAgIG5hbWU6IFwibGF1bmNoZCB0cmlnZ2VyXCIsXG4gICAgICBzdGF0dXM6IGFzYXJQYXRoICYmIHBsaXN0LmluY2x1ZGVzKGFzYXJQYXRoKSA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICAgIGRldGFpbDogYXNhclBhdGggfHwgXCJtaXNzaW5nIGFwcFJvb3RcIixcbiAgICB9KTtcbiAgICBjaGVja3MucHVzaCh7XG4gICAgICBuYW1lOiBcIndhdGNoZXIgY29tbWFuZFwiLFxuICAgICAgc3RhdHVzOiBwbGlzdC5pbmNsdWRlcyhcIkNPREVYX1BMVVNQTFVTX1dBVENIRVI9MVwiKSAmJiBwbGlzdC5pbmNsdWRlcyhcIiB1cGRhdGUgLS13YXRjaGVyIC0tcXVpZXRcIilcbiAgICAgICAgPyBcIm9rXCJcbiAgICAgICAgOiBcImVycm9yXCIsXG4gICAgICBkZXRhaWw6IGNvbW1hbmRTdW1tYXJ5KHBsaXN0KSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNsaVBhdGggPSBleHRyYWN0Rmlyc3QocGxpc3QsIC8nKFteJ10qcGFja2FnZXNcXC9pbnN0YWxsZXJcXC9kaXN0XFwvY2xpXFwuanMpJy8pO1xuICAgIGlmIChjbGlQYXRoKSB7XG4gICAgICBjaGVja3MucHVzaCh7XG4gICAgICAgIG5hbWU6IFwicmVwYWlyIENMSVwiLFxuICAgICAgICBzdGF0dXM6IGV4aXN0c1N5bmMoY2xpUGF0aCkgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgICAgIGRldGFpbDogY2xpUGF0aCxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGxvYWRlZCA9IGNvbW1hbmRTdWNjZWVkcyhcImxhdW5jaGN0bFwiLCBbXCJsaXN0XCIsIExBVU5DSERfTEFCRUxdKTtcbiAgY2hlY2tzLnB1c2goe1xuICAgIG5hbWU6IFwibGF1bmNoZCBsb2FkZWRcIixcbiAgICBzdGF0dXM6IGxvYWRlZCA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICBkZXRhaWw6IGxvYWRlZCA/IFwic2VydmljZSBpcyBsb2FkZWRcIiA6IFwibGF1bmNoY3RsIGNhbm5vdCBmaW5kIHRoZSB3YXRjaGVyXCIsXG4gIH0pO1xuXG4gIGNoZWNrcy5wdXNoKHdhdGNoZXJMb2dDaGVjaygpKTtcbiAgcmV0dXJuIGNoZWNrcztcbn1cblxuZnVuY3Rpb24gY2hlY2tTeXN0ZW1kV2F0Y2hlcihhcHBSb290OiBzdHJpbmcpOiBXYXRjaGVySGVhbHRoQ2hlY2tbXSB7XG4gIGNvbnN0IGRpciA9IGpvaW4oaG9tZWRpcigpLCBcIi5jb25maWdcIiwgXCJzeXN0ZW1kXCIsIFwidXNlclwiKTtcbiAgY29uc3Qgc2VydmljZSA9IGpvaW4oZGlyLCBcImNvZGV4LXBsdXNwbHVzLXdhdGNoZXIuc2VydmljZVwiKTtcbiAgY29uc3QgdGltZXIgPSBqb2luKGRpciwgXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyLnRpbWVyXCIpO1xuICBjb25zdCBwYXRoVW5pdCA9IGpvaW4oZGlyLCBcImNvZGV4LXBsdXNwbHVzLXdhdGNoZXIucGF0aFwiKTtcbiAgY29uc3QgZXhwZWN0ZWRQYXRoID0gYXBwUm9vdCA/IGpvaW4oYXBwUm9vdCwgXCJyZXNvdXJjZXNcIiwgXCJhcHAuYXNhclwiKSA6IFwiXCI7XG4gIGNvbnN0IHBhdGhCb2R5ID0gZXhpc3RzU3luYyhwYXRoVW5pdCkgPyByZWFkRmlsZVNhZmUocGF0aFVuaXQpIDogXCJcIjtcblxuICByZXR1cm4gW1xuICAgIHtcbiAgICAgIG5hbWU6IFwic3lzdGVtZCBzZXJ2aWNlXCIsXG4gICAgICBzdGF0dXM6IGV4aXN0c1N5bmMoc2VydmljZSkgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgICBkZXRhaWw6IHNlcnZpY2UsXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiBcInN5c3RlbWQgdGltZXJcIixcbiAgICAgIHN0YXR1czogZXhpc3RzU3luYyh0aW1lcikgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgICBkZXRhaWw6IHRpbWVyLFxuICAgIH0sXG4gICAge1xuICAgICAgbmFtZTogXCJzeXN0ZW1kIHBhdGhcIixcbiAgICAgIHN0YXR1czogcGF0aEJvZHkgJiYgZXhwZWN0ZWRQYXRoICYmIHBhdGhCb2R5LmluY2x1ZGVzKGV4cGVjdGVkUGF0aCkgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgICBkZXRhaWw6IGV4cGVjdGVkUGF0aCB8fCBwYXRoVW5pdCxcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6IFwicGF0aCB1bml0IGFjdGl2ZVwiLFxuICAgICAgc3RhdHVzOiBjb21tYW5kU3VjY2VlZHMoXCJzeXN0ZW1jdGxcIiwgW1wiLS11c2VyXCIsIFwiaXMtYWN0aXZlXCIsIFwiLS1xdWlldFwiLCBcImNvZGV4LXBsdXNwbHVzLXdhdGNoZXIucGF0aFwiXSkgPyBcIm9rXCIgOiBcIndhcm5cIixcbiAgICAgIGRldGFpbDogXCJzeXN0ZW1jdGwgLS11c2VyIGlzLWFjdGl2ZSBjb2RleC1wbHVzcGx1cy13YXRjaGVyLnBhdGhcIixcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6IFwidGltZXIgYWN0aXZlXCIsXG4gICAgICBzdGF0dXM6IGNvbW1hbmRTdWNjZWVkcyhcInN5c3RlbWN0bFwiLCBbXCItLXVzZXJcIiwgXCJpcy1hY3RpdmVcIiwgXCItLXF1aWV0XCIsIFwiY29kZXgtcGx1c3BsdXMtd2F0Y2hlci50aW1lclwiXSkgPyBcIm9rXCIgOiBcIndhcm5cIixcbiAgICAgIGRldGFpbDogXCJzeXN0ZW1jdGwgLS11c2VyIGlzLWFjdGl2ZSBjb2RleC1wbHVzcGx1cy13YXRjaGVyLnRpbWVyXCIsXG4gICAgfSxcbiAgXTtcbn1cblxuZnVuY3Rpb24gY2hlY2tTY2hlZHVsZWRUYXNrV2F0Y2hlcigpOiBXYXRjaGVySGVhbHRoQ2hlY2tbXSB7XG4gIHJldHVybiBbXG4gICAge1xuICAgICAgbmFtZTogXCJsb2dvbiB0YXNrXCIsXG4gICAgICBzdGF0dXM6IGNvbW1hbmRTdWNjZWVkcyhcInNjaHRhc2tzLmV4ZVwiLCBbXCIvUXVlcnlcIiwgXCIvVE5cIiwgXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyXCJdKSA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICAgIGRldGFpbDogXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyXCIsXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiBcImhvdXJseSB0YXNrXCIsXG4gICAgICBzdGF0dXM6IGNvbW1hbmRTdWNjZWVkcyhcInNjaHRhc2tzLmV4ZVwiLCBbXCIvUXVlcnlcIiwgXCIvVE5cIiwgXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyLWhvdXJseVwiXSkgPyBcIm9rXCIgOiBcIndhcm5cIixcbiAgICAgIGRldGFpbDogXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyLWhvdXJseVwiLFxuICAgIH0sXG4gIF07XG59XG5cbmZ1bmN0aW9uIHdhdGNoZXJMb2dDaGVjaygpOiBXYXRjaGVySGVhbHRoQ2hlY2sge1xuICBpZiAoIWV4aXN0c1N5bmMoV0FUQ0hFUl9MT0cpKSB7XG4gICAgcmV0dXJuIHsgbmFtZTogXCJ3YXRjaGVyIGxvZ1wiLCBzdGF0dXM6IFwid2FyblwiLCBkZXRhaWw6IFwibm8gd2F0Y2hlciBsb2cgeWV0XCIgfTtcbiAgfVxuICBjb25zdCB0YWlsID0gcmVhZEZpbGVTYWZlKFdBVENIRVJfTE9HKS5zcGxpdCgvXFxyP1xcbi8pLnNsaWNlKC00MCkuam9pbihcIlxcblwiKTtcbiAgcmV0dXJuIGFuYWx5emVXYXRjaGVyTG9nVGFpbCh0YWlsKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVXYXRjaGVyTG9nVGFpbCh0YWlsOiBzdHJpbmcpOiBXYXRjaGVySGVhbHRoQ2hlY2sge1xuICBjb25zdCBoYXNFcnJvciA9IC9cdTI3MTcgY29kZXgtcGx1c3BsdXMgZmFpbGVkfGNvZGV4LXBsdXNwbHVzIGZhaWxlZHxlcnJvcnxmYWlsZWQvaS50ZXN0KHRhaWwpO1xuICBjb25zdCBuZWVkc01hbnVhbFJlcGFpciA9XG4gICAgaGFzRXJyb3IgJiZcbiAgICAvQ2Fubm90IHdyaXRlIHRvIC4qQ29kZXguKlxcLmFwcHxBcHAgTWFuYWdlbWVudHxmaWxlIG93bmVyc2hpcHxzdWRvIGNvZGV4cGx1c3BsdXMgKD86aW5zdGFsbHxyZXBhaXIpfEVBQ0NFU3xFUEVSTS9pLnRlc3QodGFpbCk7XG4gIHJldHVybiB7XG4gICAgbmFtZTogXCJ3YXRjaGVyIGxvZ1wiLFxuICAgIHN0YXR1czogaGFzRXJyb3IgPyBcIndhcm5cIiA6IFwib2tcIixcbiAgICBkZXRhaWw6IGhhc0Vycm9yXG4gICAgICA/IG5lZWRzTWFudWFsUmVwYWlyXG4gICAgICAgID8gXCJhdXRvLXJlcGFpciBuZWVkcyBhcHAgcGVybWlzc2lvbnM7IHJ1biBgY29kZXhwbHVzcGx1cyByZXBhaXJgIGZyb20gVGVybWluYWxcIlxuICAgICAgICA6IFwicmVjZW50IHdhdGNoZXIgbG9nIGNvbnRhaW5zIGFuIGVycm9yXCJcbiAgICAgIDogV0FUQ0hFUl9MT0csXG4gIH07XG59XG5cbmZ1bmN0aW9uIHN1bW1hcml6ZSh3YXRjaGVyOiBzdHJpbmcsIGNoZWNrczogV2F0Y2hlckhlYWx0aENoZWNrW10pOiBXYXRjaGVySGVhbHRoIHtcbiAgY29uc3QgaGFzRXJyb3IgPSBjaGVja3Muc29tZSgoYykgPT4gYy5zdGF0dXMgPT09IFwiZXJyb3JcIik7XG4gIGNvbnN0IGhhc1dhcm4gPSBjaGVja3Muc29tZSgoYykgPT4gYy5zdGF0dXMgPT09IFwid2FyblwiKTtcbiAgY29uc3Qgc3RhdHVzOiBDaGVja1N0YXR1cyA9IGhhc0Vycm9yID8gXCJlcnJvclwiIDogaGFzV2FybiA/IFwid2FyblwiIDogXCJva1wiO1xuICBjb25zdCBmYWlsZWQgPSBjaGVja3MuZmlsdGVyKChjKSA9PiBjLnN0YXR1cyA9PT0gXCJlcnJvclwiKS5sZW5ndGg7XG4gIGNvbnN0IHdhcm5lZCA9IGNoZWNrcy5maWx0ZXIoKGMpID0+IGMuc3RhdHVzID09PSBcIndhcm5cIikubGVuZ3RoO1xuICBjb25zdCB0aXRsZSA9XG4gICAgc3RhdHVzID09PSBcIm9rXCJcbiAgICAgID8gXCJBdXRvLXJlcGFpciB3YXRjaGVyIGlzIHJlYWR5XCJcbiAgICAgIDogc3RhdHVzID09PSBcIndhcm5cIlxuICAgICAgICA/IFwiQXV0by1yZXBhaXIgd2F0Y2hlciBuZWVkcyByZXZpZXdcIlxuICAgICAgICA6IFwiQXV0by1yZXBhaXIgd2F0Y2hlciBpcyBub3QgcmVhZHlcIjtcbiAgY29uc3Qgc3VtbWFyeSA9XG4gICAgc3RhdHVzID09PSBcIm9rXCJcbiAgICAgID8gXCJDb2RleCsrIHNob3VsZCBhdXRvbWF0aWNhbGx5IHJlcGFpciBpdHNlbGYgYWZ0ZXIgQ29kZXggdXBkYXRlcy5cIlxuICAgICAgOiBgJHtmYWlsZWR9IGZhaWxpbmcgY2hlY2socyksICR7d2FybmVkfSB3YXJuaW5nKHMpLmA7XG5cbiAgcmV0dXJuIHtcbiAgICBjaGVja2VkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICBzdGF0dXMsXG4gICAgdGl0bGUsXG4gICAgc3VtbWFyeSxcbiAgICB3YXRjaGVyLFxuICAgIGNoZWNrcyxcbiAgfTtcbn1cblxuZnVuY3Rpb24gY29tbWFuZFN1Y2NlZWRzKGNvbW1hbmQ6IHN0cmluZywgYXJnczogc3RyaW5nW10pOiBib29sZWFuIHtcbiAgdHJ5IHtcbiAgICBleGVjRmlsZVN5bmMoY29tbWFuZCwgYXJncywgeyBzdGRpbzogXCJpZ25vcmVcIiwgdGltZW91dDogNV8wMDAgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjb21tYW5kU3VtbWFyeShwbGlzdDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgY29tbWFuZCA9IGV4dHJhY3RGaXJzdChwbGlzdCwgLzxzdHJpbmc+KFtePF0qKD86dXBkYXRlIC0td2F0Y2hlciAtLXF1aWV0fHJlcGFpciAtLXF1aWV0KVtePF0qKTxcXC9zdHJpbmc+Lyk7XG4gIHJldHVybiBjb21tYW5kID8gdW5lc2NhcGVYbWwoY29tbWFuZCkucmVwbGFjZSgvXFxzKy9nLCBcIiBcIikudHJpbSgpIDogXCJ3YXRjaGVyIGNvbW1hbmQgbm90IGZvdW5kXCI7XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RGaXJzdChzb3VyY2U6IHN0cmluZywgcGF0dGVybjogUmVnRXhwKTogc3RyaW5nIHwgbnVsbCB7XG4gIHJldHVybiBzb3VyY2UubWF0Y2gocGF0dGVybik/LlsxXSA/PyBudWxsO1xufVxuXG5mdW5jdGlvbiByZWFkSnNvbjxUPihwYXRoOiBzdHJpbmcpOiBUIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKHBhdGgsIFwidXRmOFwiKSkgYXMgVDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVhZEZpbGVTYWZlKHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHJlYWRGaWxlU3luYyhwYXRoLCBcInV0ZjhcIik7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBcIlwiO1xuICB9XG59XG5cbmZ1bmN0aW9uIHVuZXNjYXBlWG1sKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdmFsdWVcbiAgICAucmVwbGFjZSgvJnF1b3Q7L2csIFwiXFxcIlwiKVxuICAgIC5yZXBsYWNlKC8mYXBvczsvZywgXCInXCIpXG4gICAgLnJlcGxhY2UoLyZsdDsvZywgXCI8XCIpXG4gICAgLnJlcGxhY2UoLyZndDsvZywgXCI+XCIpXG4gICAgLnJlcGxhY2UoLyZhbXA7L2csIFwiJlwiKTtcbn1cbiIsICJleHBvcnQgdHlwZSBUd2Vha1Njb3BlID0gXCJyZW5kZXJlclwiIHwgXCJtYWluXCIgfCBcImJvdGhcIjtcblxuZXhwb3J0IGludGVyZmFjZSBSZWxvYWRUd2Vha3NEZXBzIHtcbiAgbG9nSW5mbyhtZXNzYWdlOiBzdHJpbmcpOiB2b2lkO1xuICBzdG9wQWxsTWFpblR3ZWFrcygpOiB2b2lkO1xuICBjbGVhclR3ZWFrTW9kdWxlQ2FjaGUoKTogdm9pZDtcbiAgbG9hZEFsbE1haW5Ud2Vha3MoKTogdm9pZDtcbiAgYnJvYWRjYXN0UmVsb2FkKCk6IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2V0VHdlYWtFbmFibGVkQW5kUmVsb2FkRGVwcyBleHRlbmRzIFJlbG9hZFR3ZWFrc0RlcHMge1xuICBzZXRUd2Vha0VuYWJsZWQoaWQ6IHN0cmluZywgZW5hYmxlZDogYm9vbGVhbik6IHZvaWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc01haW5Qcm9jZXNzVHdlYWtTY29wZShzY29wZTogVHdlYWtTY29wZSB8IHVuZGVmaW5lZCk6IGJvb2xlYW4ge1xuICByZXR1cm4gc2NvcGUgIT09IFwicmVuZGVyZXJcIjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlbG9hZFR3ZWFrcyhyZWFzb246IHN0cmluZywgZGVwczogUmVsb2FkVHdlYWtzRGVwcyk6IHZvaWQge1xuICBkZXBzLmxvZ0luZm8oYHJlbG9hZGluZyB0d2Vha3MgKCR7cmVhc29ufSlgKTtcbiAgZGVwcy5zdG9wQWxsTWFpblR3ZWFrcygpO1xuICBkZXBzLmNsZWFyVHdlYWtNb2R1bGVDYWNoZSgpO1xuICBkZXBzLmxvYWRBbGxNYWluVHdlYWtzKCk7XG4gIGRlcHMuYnJvYWRjYXN0UmVsb2FkKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRUd2Vha0VuYWJsZWRBbmRSZWxvYWQoXG4gIGlkOiBzdHJpbmcsXG4gIGVuYWJsZWQ6IHVua25vd24sXG4gIGRlcHM6IFNldFR3ZWFrRW5hYmxlZEFuZFJlbG9hZERlcHMsXG4pOiB0cnVlIHtcbiAgY29uc3Qgbm9ybWFsaXplZEVuYWJsZWQgPSAhIWVuYWJsZWQ7XG4gIGRlcHMuc2V0VHdlYWtFbmFibGVkKGlkLCBub3JtYWxpemVkRW5hYmxlZCk7XG4gIGRlcHMubG9nSW5mbyhgdHdlYWsgJHtpZH0gZW5hYmxlZD0ke25vcm1hbGl6ZWRFbmFibGVkfWApO1xuICByZWxvYWRUd2Vha3MoXCJlbmFibGVkLXRvZ2dsZVwiLCBkZXBzKTtcbiAgcmV0dXJuIHRydWU7XG59XG4iLCAiaW1wb3J0IHsgYXBwZW5kRmlsZVN5bmMsIGV4aXN0c1N5bmMsIHJlYWRGaWxlU3luYywgc3RhdFN5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tIFwibm9kZTpmc1wiO1xuXG5leHBvcnQgY29uc3QgTUFYX0xPR19CWVRFUyA9IDEwICogMTAyNCAqIDEwMjQ7XG5cbmV4cG9ydCBmdW5jdGlvbiBhcHBlbmRDYXBwZWRMb2cocGF0aDogc3RyaW5nLCBsaW5lOiBzdHJpbmcsIG1heEJ5dGVzID0gTUFYX0xPR19CWVRFUyk6IHZvaWQge1xuICBjb25zdCBpbmNvbWluZyA9IEJ1ZmZlci5mcm9tKGxpbmUpO1xuICBpZiAoaW5jb21pbmcuYnl0ZUxlbmd0aCA+PSBtYXhCeXRlcykge1xuICAgIHdyaXRlRmlsZVN5bmMocGF0aCwgaW5jb21pbmcuc3ViYXJyYXkoaW5jb21pbmcuYnl0ZUxlbmd0aCAtIG1heEJ5dGVzKSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBpZiAoZXhpc3RzU3luYyhwYXRoKSkge1xuICAgICAgY29uc3Qgc2l6ZSA9IHN0YXRTeW5jKHBhdGgpLnNpemU7XG4gICAgICBjb25zdCBhbGxvd2VkRXhpc3RpbmcgPSBtYXhCeXRlcyAtIGluY29taW5nLmJ5dGVMZW5ndGg7XG4gICAgICBpZiAoc2l6ZSA+IGFsbG93ZWRFeGlzdGluZykge1xuICAgICAgICBjb25zdCBleGlzdGluZyA9IHJlYWRGaWxlU3luYyhwYXRoKTtcbiAgICAgICAgd3JpdGVGaWxlU3luYyhwYXRoLCBleGlzdGluZy5zdWJhcnJheShNYXRoLm1heCgwLCBleGlzdGluZy5ieXRlTGVuZ3RoIC0gYWxsb3dlZEV4aXN0aW5nKSkpO1xuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCB7XG4gICAgLy8gSWYgdHJpbW1pbmcgZmFpbHMsIHN0aWxsIHRyeSB0byBhcHBlbmQgYmVsb3c7IGxvZ2dpbmcgbXVzdCBiZSBiZXN0LWVmZm9ydC5cbiAgfVxuXG4gIGFwcGVuZEZpbGVTeW5jKHBhdGgsIGluY29taW5nKTtcbn1cbiIsICJpbXBvcnQgeyBhcHAsIEJyb3dzZXJXaW5kb3cgfSBmcm9tIFwiZWxlY3Ryb25cIjtcbmltcG9ydCB7IGV4aXN0c1N5bmMgfSBmcm9tIFwibm9kZTpmc1wiO1xuaW1wb3J0IHsgZGlybmFtZSwgam9pbiB9IGZyb20gXCJub2RlOnBhdGhcIjtcbmltcG9ydCB0eXBlIHtcbiAgQ29kZXhDZHBTdGF0dXMsXG4gIENvZGV4Q2RwVGFyZ2V0LFxuICBDb2RleFJ1bnRpbWVDYXBhYmlsaXRpZXMsXG4gIENvZGV4UnVudGltZUluZm8sXG4gIENvZGV4UnVudGltZVR5cGUsXG59IGZyb20gXCJAY29kZXgtcGx1c3BsdXMvc2RrXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVudGltZVByb2JlT3B0aW9ucyB7XG4gIHVzZXJSb290OiBzdHJpbmc7XG4gIHJ1bnRpbWVEaXI6IHN0cmluZztcbiAgY29kZXhWZXJzaW9uOiBzdHJpbmcgfCBudWxsO1xuICBjaGFubmVsOiBzdHJpbmcgfCBudWxsO1xuICBnZXRXaW5kb3dTZXJ2aWNlcygpOiB1bmtub3duIHwgbnVsbDtcbiAgZ2V0TmF0aXZlQ2FwYWJpbGl0aWVzPygpOiBDb2RleFJ1bnRpbWVDYXBhYmlsaXRpZXNbXCJuYXRpdmVcIl07XG4gIGdldFZpZXdDYXBhYmlsaXRpZXM/KCk6IENvZGV4UnVudGltZUNhcGFiaWxpdGllc1tcInZpZXdzXCJdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UnVudGltZUluZm8ob3B0czogUnVudGltZVByb2JlT3B0aW9ucyk6IENvZGV4UnVudGltZUluZm8ge1xuICByZXR1cm4ge1xuICAgIHR5cGU6IGRldGVjdFJ1bnRpbWVUeXBlKCksXG4gICAgY29kZXhWZXJzaW9uOiBvcHRzLmNvZGV4VmVyc2lvbiA/PyBzYWZlQXBwVmVyc2lvbigpLFxuICAgIGNoYW5uZWw6IG9wdHMuY2hhbm5lbCxcbiAgICBidWlsZEZsYXZvcjogc2FmZUJ1aWxkRmxhdm9yKCksXG4gICAgdXNlc093bEFwcFNoZWxsOiBudWxsLFxuICAgIGFwcFBhdGg6IHNhZmVBcHBQYXRoKCksXG4gICAgcmVzb3VyY2VzUGF0aDogcHJvY2Vzcy5yZXNvdXJjZXNQYXRoID8/IG51bGwsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRSdW50aW1lQ2FwYWJpbGl0aWVzKG9wdHM6IFJ1bnRpbWVQcm9iZU9wdGlvbnMpOiBDb2RleFJ1bnRpbWVDYXBhYmlsaXRpZXMge1xuICBjb25zdCBzZXJ2aWNlcyA9IGFzUmVjb3JkKG9wdHMuZ2V0V2luZG93U2VydmljZXMoKSk7XG4gIGNvbnN0IHdpbmRvd01hbmFnZXIgPSBhc1JlY29yZChzZXJ2aWNlcz8ud2luZG93TWFuYWdlcik7XG4gIGNvbnN0IGNkcCA9IGdldENkcFN0YXR1cygpO1xuICBjb25zdCBuYXRpdmUgPSBvcHRzLmdldE5hdGl2ZUNhcGFiaWxpdGllcz8uKCkgPz8gZGVmYXVsdE5hdGl2ZUNhcGFiaWxpdGllcygpO1xuICBjb25zdCB2aWV3cyA9IG9wdHMuZ2V0Vmlld0NhcGFiaWxpdGllcz8uKCkgPz8gZGVmYXVsdFZpZXdDYXBhYmlsaXRpZXMoKTtcbiAgY29uc3QgY2FuQ3JlYXRlV2luZG93ID0gdHlwZW9mIHdpbmRvd01hbmFnZXI/LmNyZWF0ZVdpbmRvdyA9PT0gXCJmdW5jdGlvblwiIHx8XG4gICAgdHlwZW9mIHNlcnZpY2VzPy5jcmVhdGVGcmVzaFdpbmRvdyA9PT0gXCJmdW5jdGlvblwiIHx8XG4gICAgdHlwZW9mIHNlcnZpY2VzPy5jcmVhdGVGcmVzaExvY2FsV2luZG93ID09PSBcImZ1bmN0aW9uXCIgfHxcbiAgICB0eXBlb2Ygc2VydmljZXM/LmVuc3VyZUhvc3RXaW5kb3cgPT09IFwiZnVuY3Rpb25cIjtcbiAgcmV0dXJuIHtcbiAgICB3aW5kb3dzOiB7XG4gICAgICBjcmVhdGU6IGNhbkNyZWF0ZVdpbmRvdyxcbiAgICAgIGZvY3VzOiB0cnVlLFxuICAgICAgcHJpbWFyeTogdHlwZW9mIHNlcnZpY2VzPy5nZXRQcmltYXJ5V2luZG93ID09PSBcImZ1bmN0aW9uXCIgfHxcbiAgICAgICAgdHlwZW9mIHdpbmRvd01hbmFnZXI/LmdldFByaW1hcnlXaW5kb3cgPT09IFwiZnVuY3Rpb25cIixcbiAgICAgIGJyb3dzZXJWaWV3OiB0eXBlb2Ygd2luZG93TWFuYWdlcj8ucmVnaXN0ZXJXaW5kb3cgPT09IFwiZnVuY3Rpb25cIixcbiAgICB9LFxuICAgIHZpZXdzLFxuICAgIGNkcDoge1xuICAgICAgc3VwcG9ydGVkOiB0cnVlLFxuICAgICAgZW5hYmxlZDogY2RwLmVuYWJsZWQsXG4gICAgICBwb3J0OiBjZHAucG9ydCxcbiAgICB9LFxuICAgIG5hdGl2ZSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldENkcFN0YXR1cygpOiBDb2RleENkcFN0YXR1cyB7XG4gIGNvbnN0IGVuYWJsZWQgPSBwcm9jZXNzLmVudi5DT0RFWFBQX1JFTU9URV9ERUJVRyA9PT0gXCIxXCI7XG4gIGNvbnN0IHBvcnQgPSBwYXJzZUNkcFBvcnQocHJvY2Vzcy5lbnYuQ09ERVhQUF9SRU1PVEVfREVCVUdfUE9SVCk7XG4gIHJldHVybiB7XG4gICAgc3VwcG9ydGVkOiB0cnVlLFxuICAgIGVuYWJsZWQsXG4gICAgcG9ydDogZW5hYmxlZCA/IHBvcnQgOiBudWxsLFxuICAgIHVybDogZW5hYmxlZCA/IGBodHRwOi8vMTI3LjAuMC4xOiR7cG9ydH1gIDogbnVsbCxcbiAgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxpc3RDZHBUYXJnZXRzKCk6IFByb21pc2U8Q29kZXhDZHBUYXJnZXRbXT4ge1xuICBjb25zdCBzdGF0dXMgPSBnZXRDZHBTdGF0dXMoKTtcbiAgaWYgKCFzdGF0dXMuZW5hYmxlZCB8fCAhc3RhdHVzLnVybCkgcmV0dXJuIFtdO1xuICBjb25zdCBjb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICBjb25zdCB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiBjb250cm9sbGVyLmFib3J0KCksIDEwMDApO1xuICB0cnkge1xuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKGAke3N0YXR1cy51cmx9L2pzb25gLCB7IHNpZ25hbDogY29udHJvbGxlci5zaWduYWwgfSk7XG4gICAgaWYgKCFyZXMub2spIHJldHVybiBbXTtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgcmVzLmpzb24oKSBhcyB1bmtub3duO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShyb3dzKSkgcmV0dXJuIFtdO1xuICAgIHJldHVybiByb3dzXG4gICAgICAubWFwKChyb3cpID0+IG5vcm1hbGl6ZUNkcFRhcmdldChyb3cpKVxuICAgICAgLmZpbHRlcigocm93KTogcm93IGlzIENvZGV4Q2RwVGFyZ2V0ID0+IHJvdyAhPT0gbnVsbCk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBbXTtcbiAgfSBmaW5hbGx5IHtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZGV0ZWN0UnVudGltZVR5cGUoKTogQ29kZXhSdW50aW1lVHlwZSB7XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSBcImRhcndpblwiKSB7XG4gICAgY29uc3QgYXBwUm9vdCA9IGluZmVyTWFjQXBwUm9vdCgpO1xuICAgIGlmIChhcHBSb290ICYmIGV4aXN0c1N5bmMoam9pbihhcHBSb290LCBcIkNvbnRlbnRzXCIsIFwiRnJhbWV3b3Jrc1wiLCBcIkNvZGV4IEZyYW1ld29yay5mcmFtZXdvcmtcIikpKSB7XG4gICAgICByZXR1cm4gXCJvd2xcIjtcbiAgICB9XG4gICAgaWYgKFxuICAgICAgYXBwUm9vdCAmJlxuICAgICAgZXhpc3RzU3luYyhqb2luKGFwcFJvb3QsIFwiQ29udGVudHNcIiwgXCJGcmFtZXdvcmtzXCIsIFwiRWxlY3Ryb24gRnJhbWV3b3JrLmZyYW1ld29ya1wiKSlcbiAgICApIHtcbiAgICAgIHJldHVybiBcImVsZWN0cm9uXCI7XG4gICAgfVxuICAgIGlmIChwcm9jZXNzLnJlc291cmNlc1BhdGggJiYgZXhpc3RzU3luYyhqb2luKHByb2Nlc3MucmVzb3VyY2VzUGF0aCwgXCJhcHAuYXNhclwiKSkpIHtcbiAgICAgIHJldHVybiBcImVsZWN0cm9uXCI7XG4gICAgfVxuICAgIHJldHVybiBcInVua25vd25cIjtcbiAgfVxuICByZXR1cm4gcHJvY2Vzcy5yZXNvdXJjZXNQYXRoICYmIGV4aXN0c1N5bmMoam9pbihwcm9jZXNzLnJlc291cmNlc1BhdGgsIFwiYXBwLmFzYXJcIikpXG4gICAgPyBcImVsZWN0cm9uXCJcbiAgICA6IFwidW5rbm93blwiO1xufVxuXG5mdW5jdGlvbiBpbmZlck1hY0FwcFJvb3QoKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IG1hcmtlciA9IFwiLmFwcC9Db250ZW50cy9NYWNPUy9cIjtcbiAgY29uc3QgaWR4ID0gcHJvY2Vzcy5leGVjUGF0aC5pbmRleE9mKG1hcmtlcik7XG4gIHJldHVybiBpZHggPj0gMCA/IHByb2Nlc3MuZXhlY1BhdGguc2xpY2UoMCwgaWR4ICsgXCIuYXBwXCIubGVuZ3RoKSA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHNhZmVBcHBWZXJzaW9uKCk6IHN0cmluZyB8IG51bGwge1xuICB0cnkge1xuICAgIHJldHVybiBhcHAuZ2V0VmVyc2lvbigpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBzYWZlQXBwUGF0aCgpOiBzdHJpbmcgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gYXBwLmdldEFwcFBhdGgoKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHByb2Nlc3MucmVzb3VyY2VzUGF0aCA/IGpvaW4ocHJvY2Vzcy5yZXNvdXJjZXNQYXRoLCBcImFwcC5hc2FyXCIpIDogbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBzYWZlQnVpbGRGbGF2b3IoKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IGFwcFBhdGggPSBzYWZlQXBwUGF0aCgpO1xuICBpZiAoIWFwcFBhdGgpIHJldHVybiBudWxsO1xuICBjb25zdCBwYXJlbnQgPSBkaXJuYW1lKGFwcFBhdGgpO1xuICBpZiAocGFyZW50LmluY2x1ZGVzKFwiTmlnaHRseVwiKSkgcmV0dXJuIFwibmlnaHRseVwiO1xuICByZXR1cm4gYXBwLmlzUGFja2FnZWQgPyBcInByb2RcIiA6IFwiZGV2XCI7XG59XG5cbmZ1bmN0aW9uIHBhcnNlQ2RwUG9ydCh2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkKTogbnVtYmVyIHtcbiAgY29uc3QgcGFyc2VkID0gTnVtYmVyKHZhbHVlID8/IFwiOTIyMlwiKTtcbiAgcmV0dXJuIE51bWJlci5pc0ludGVnZXIocGFyc2VkKSAmJiBwYXJzZWQgPiAwICYmIHBhcnNlZCA8IDY1NTM2ID8gcGFyc2VkIDogOTIyMjtcbn1cblxuZnVuY3Rpb24gaGFzTmF0aXZlV2luZG93SGFuZGxlcygpOiBib29sZWFuIHtcbiAgY29uc3QgZm9jdXNlZCA9IEJyb3dzZXJXaW5kb3cuZ2V0Rm9jdXNlZFdpbmRvdygpO1xuICBpZiAoZm9jdXNlZCAmJiB0eXBlb2YgZm9jdXNlZC5nZXROYXRpdmVXaW5kb3dIYW5kbGUgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHRydWU7XG4gIHJldHVybiB0eXBlb2YgQnJvd3NlcldpbmRvdy5mcm9tSWQgPT09IFwiZnVuY3Rpb25cIjtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdE5hdGl2ZUNhcGFiaWxpdGllcygpOiBDb2RleFJ1bnRpbWVDYXBhYmlsaXRpZXNbXCJuYXRpdmVcIl0ge1xuICByZXR1cm4ge1xuICAgIGluUHJvY2Vzc01vZHVsZXM6IHRydWUsXG4gICAgc3dpZnRNb2R1bGVzOiBwcm9jZXNzLnBsYXRmb3JtID09PSBcImRhcndpblwiLFxuICAgIGFwcEtpdEVtYmVkZGluZzogZmFsc2UsXG4gICAgY2hpbGRXaW5kb3dPdmVybGF5OiBmYWxzZSxcbiAgICBkaXJlY3RWaWV3QXR0YWNoOiBmYWxzZSxcbiAgICBtZXRhbFZpZXdzOiBmYWxzZSxcbiAgICBuYXRpdmVIb3N0OiBmYWxzZSxcbiAgICBoZWxwZXJzOiB0cnVlLFxuICB9O1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0Vmlld0NhcGFiaWxpdGllcygpOiBDb2RleFJ1bnRpbWVDYXBhYmlsaXRpZXNbXCJ2aWV3c1wiXSB7XG4gIHJldHVybiB7XG4gICAgY3JlYXRlOiBmYWxzZSxcbiAgICBwcml2YXRlVmlld1RyZWU6IGZhbHNlLFxuICAgIHdlYkNvbnRlbnRzVmlldzogZmFsc2UsXG4gICAgYnJvd3NlclZpZXdGYWxsYmFjazogdHlwZW9mIEJyb3dzZXJXaW5kb3cuZnJvbUlkID09PSBcImZ1bmN0aW9uXCIsXG4gIH07XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZUNkcFRhcmdldChyb3c6IHVua25vd24pOiBDb2RleENkcFRhcmdldCB8IG51bGwge1xuICBjb25zdCB2YWx1ZSA9IGFzUmVjb3JkKHJvdyk7XG4gIGlmICghdmFsdWUgfHwgdHlwZW9mIHZhbHVlLmlkICE9PSBcInN0cmluZ1wiIHx8IHR5cGVvZiB2YWx1ZS50eXBlICE9PSBcInN0cmluZ1wiIHx8IHR5cGVvZiB2YWx1ZS51cmwgIT09IFwic3RyaW5nXCIpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4ge1xuICAgIGlkOiB2YWx1ZS5pZCxcbiAgICB0eXBlOiB2YWx1ZS50eXBlLFxuICAgIHVybDogdmFsdWUudXJsLFxuICAgIC4uLih0eXBlb2YgdmFsdWUudGl0bGUgPT09IFwic3RyaW5nXCIgPyB7IHRpdGxlOiB2YWx1ZS50aXRsZSB9IDoge30pLFxuICAgIC4uLih0eXBlb2YgdmFsdWUud2ViU29ja2V0RGVidWdnZXJVcmwgPT09IFwic3RyaW5nXCJcbiAgICAgID8geyB3ZWJTb2NrZXREZWJ1Z2dlclVybDogdmFsdWUud2ViU29ja2V0RGVidWdnZXJVcmwgfVxuICAgICAgOiB7fSksXG4gIH07XG59XG5cbmZ1bmN0aW9uIGFzUmVjb3JkKHZhbHVlOiB1bmtub3duKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsIHtcbiAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiA/IHZhbHVlIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IDogbnVsbDtcbn1cbiIsICJpbXBvcnQgeyBCcm93c2VyV2luZG93IH0gZnJvbSBcImVsZWN0cm9uXCI7XG5pbXBvcnQgeyBzcGF3biwgdHlwZSBDaGlsZFByb2Nlc3NXaXRob3V0TnVsbFN0cmVhbXMgfSBmcm9tIFwibm9kZTpjaGlsZF9wcm9jZXNzXCI7XG5pbXBvcnQgeyByYW5kb21VVUlEIH0gZnJvbSBcIm5vZGU6Y3J5cHRvXCI7XG5pbXBvcnQgeyBleGlzdHNTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGNyZWF0ZUludGVyZmFjZSB9IGZyb20gXCJub2RlOnJlYWRsaW5lXCI7XG5pbXBvcnQgeyByZXNvbHZlTmF0aXZlVHdlYWtQYXRoIH0gZnJvbSBcIi4vbmF0aXZlLXBhdGhzXCI7XG5pbXBvcnQgdHlwZSB7XG4gIENvZGV4UnVudGltZUNhcGFiaWxpdGllcyxcbiAgTmF0aXZlSGVscGVyTGF1bmNoT3B0aW9ucyxcbiAgTmF0aXZlSGVscGVyUmVmLFxuICBOYXRpdmVNb2R1bGVLaW5kLFxuICBOYXRpdmVNb2R1bGVMb2FkT3B0aW9ucyxcbiAgTmF0aXZlTW9kdWxlUmVmLFxuICBOYXRpdmVQYW5lbENyZWF0ZU9wdGlvbnMsXG4gIE5hdGl2ZVBhbmVsUmVmLFxuICBOYXRpdmVWaWV3QXR0YWNoT3B0aW9ucyxcbiAgTmF0aXZlVmlld1JlZixcbn0gZnJvbSBcIkBjb2RleC1wbHVzcGx1cy9zZGtcIjtcblxuZXhwb3J0IGludGVyZmFjZSBOYXRpdmVUd2Vha0NvbnRleHQge1xuICBpZDogc3RyaW5nO1xuICBkaXI6IHN0cmluZztcbn1cblxudHlwZSBOYXRpdmVMb2cgPSAobGV2ZWw6IFwiaW5mb1wiIHwgXCJ3YXJuXCIgfCBcImVycm9yXCIsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZDtcblxuZXhwb3J0IGludGVyZmFjZSBOYXRpdmVCcmlkZ2VPcHRpb25zIHtcbiAgbmF0aXZlSG9zdFBhdGg/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBMb2FkZWROYXRpdmVNb2R1bGUge1xuICBrZXk6IHN0cmluZztcbiAgdHdlYWtJZDogc3RyaW5nO1xuICBpZDogc3RyaW5nO1xuICBraW5kOiBOYXRpdmVNb2R1bGVLaW5kO1xuICBwYXRoOiBzdHJpbmc7XG4gIGV4cG9ydHM6IHVua25vd247XG59XG5cbmludGVyZmFjZSBOYXRpdmVJbnN0YW5jZSB7XG4gIGtleTogc3RyaW5nO1xuICB0d2Vha0lkOiBzdHJpbmc7XG4gIGlkOiBzdHJpbmc7XG4gIGtpbmQ6IFwicGFuZWxcIiB8IFwidmlld1wiO1xuICB2YWx1ZTogdW5rbm93bjtcbiAgcGFyZW50V2luZG93SWQ6IG51bWJlciB8IG51bGw7XG4gIHdpbmRvd0lkOiBudW1iZXIgfCBudWxsO1xuICBkaXNwb3NlQmluZGluZ3M6IEFycmF5PCgpID0+IHZvaWQ+O1xuICBkaXNwb3Npbmc6IGJvb2xlYW47XG59XG5cbmludGVyZmFjZSBIZWxwZXJSZXF1ZXN0IHtcbiAgcmVzb2x2ZSh2YWx1ZTogdW5rbm93bik6IHZvaWQ7XG4gIHJlamVjdChlcnJvcjogRXJyb3IpOiB2b2lkO1xuICB0aW1lcjogTm9kZUpTLlRpbWVvdXQ7XG59XG5cbmludGVyZmFjZSBOYXRpdmVIZWxwZXJQcm9jZXNzIHtcbiAga2V5OiBzdHJpbmc7XG4gIHR3ZWFrSWQ6IHN0cmluZztcbiAgaWQ6IHN0cmluZztcbiAgY2hpbGQ6IENoaWxkUHJvY2Vzc1dpdGhvdXROdWxsU3RyZWFtcztcbiAgcGVuZGluZzogTWFwPHN0cmluZywgSGVscGVyUmVxdWVzdD47XG59XG5cbmV4cG9ydCBjbGFzcyBOYXRpdmVCcmlkZ2Uge1xuICBwcml2YXRlIG1vZHVsZXMgPSBuZXcgTWFwPHN0cmluZywgTG9hZGVkTmF0aXZlTW9kdWxlPigpO1xuICBwcml2YXRlIGluc3RhbmNlcyA9IG5ldyBNYXA8c3RyaW5nLCBOYXRpdmVJbnN0YW5jZT4oKTtcbiAgcHJpdmF0ZSBoZWxwZXJzID0gbmV3IE1hcDxzdHJpbmcsIE5hdGl2ZUhlbHBlclByb2Nlc3M+KCk7XG4gIHByaXZhdGUgbmF0aXZlSG9zdEV4cG9ydHM6IHVua25vd24gfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBuYXRpdmVIb3N0TG9hZEVycm9yOiBFcnJvciB8IG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgbG9nOiBOYXRpdmVMb2csXG4gICAgcHJpdmF0ZSByZWFkb25seSBvcHRpb25zOiBOYXRpdmVCcmlkZ2VPcHRpb25zID0ge30sXG4gICkge31cblxuICBnZXRDYXBhYmlsaXRpZXMoKTogQ29kZXhSdW50aW1lQ2FwYWJpbGl0aWVzW1wibmF0aXZlXCJdIHtcbiAgICBjb25zdCBob3N0ID0gdGhpcy5sb2FkTmF0aXZlSG9zdChmYWxzZSk7XG4gICAgY29uc3QgaG9zdENhcGFiaWxpdGllcyA9IGhvc3QgPyB0aGlzLnJlYWROYXRpdmVIb3N0Q2FwYWJpbGl0aWVzKGhvc3QpIDoge307XG4gICAgY29uc3QgbmF0aXZlSG9zdCA9IGhvc3QgIT09IG51bGw7XG4gICAgcmV0dXJuIHtcbiAgICAgIGluUHJvY2Vzc01vZHVsZXM6IHRydWUsXG4gICAgICBzd2lmdE1vZHVsZXM6IHByb2Nlc3MucGxhdGZvcm0gPT09IFwiZGFyd2luXCIsXG4gICAgICBhcHBLaXRFbWJlZGRpbmc6IEJvb2xlYW4oaG9zdENhcGFiaWxpdGllcy5hcHBLaXRFbWJlZGRpbmcpLFxuICAgICAgY2hpbGRXaW5kb3dPdmVybGF5OiBCb29sZWFuKGhvc3RDYXBhYmlsaXRpZXMuY2hpbGRXaW5kb3dPdmVybGF5KSxcbiAgICAgIGRpcmVjdFZpZXdBdHRhY2g6IEJvb2xlYW4oaG9zdENhcGFiaWxpdGllcy5kaXJlY3RWaWV3QXR0YWNoKSxcbiAgICAgIG1ldGFsVmlld3M6IEJvb2xlYW4oaG9zdENhcGFiaWxpdGllcy5tZXRhbFZpZXdzKSxcbiAgICAgIG5hdGl2ZUhvc3QsXG4gICAgICBoZWxwZXJzOiB0cnVlLFxuICAgIH07XG4gIH1cblxuICBsb2FkTW9kdWxlKGN0eDogTmF0aXZlVHdlYWtDb250ZXh0LCBvcHRpb25zOiBOYXRpdmVNb2R1bGVMb2FkT3B0aW9ucyk6IE5hdGl2ZU1vZHVsZVJlZiB7XG4gICAgY29uc3QgaWQgPSBhc3NlcnRCcmlkZ2VJZChvcHRpb25zLmlkLCBcIm5hdGl2ZSBtb2R1bGUgaWRcIik7XG4gICAgY29uc3QgZnVsbFBhdGggPSByZXNvbHZlVHdlYWtQYXRoKGN0eCwgb3B0aW9ucy5wYXRoKTtcbiAgICBjb25zdCBraW5kID0gb3B0aW9ucy5raW5kID8/IGluZmVyTW9kdWxlS2luZChmdWxsUGF0aCk7XG5cbiAgICBpZiAoa2luZCAhPT0gXCJub2RlLWFkZG9uXCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYCR7a2luZH0gbmF0aXZlIG1vZHVsZXMgbXVzdCBiZSBsb2FkZWQgdGhyb3VnaCBhIC5ub2RlIE9iamVjdGl2ZS1DKysgc2hpbSBpbiBDb2RleCsrIDEuMC4wYCxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKCFmdWxsUGF0aC5lbmRzV2l0aChcIi5ub2RlXCIpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJub2RlLWFkZG9uIG5hdGl2ZSBtb2R1bGVzIG11c3QgdXNlIGEgLm5vZGUgZmlsZVwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBsb2FkZWQgPSByZXF1aXJlKGZ1bGxQYXRoKSBhcyB1bmtub3duO1xuICAgIGNvbnN0IGV4cG9ydHMgPSBzZWxlY3RFbnRyeXBvaW50KGxvYWRlZCwgb3B0aW9ucy5lbnRyeXBvaW50KTtcbiAgICBjb25zdCBrZXkgPSBtb2R1bGVLZXkoY3R4LmlkLCBpZCk7XG4gICAgdGhpcy5tb2R1bGVzLnNldChrZXksIHsga2V5LCB0d2Vha0lkOiBjdHguaWQsIGlkLCBraW5kLCBwYXRoOiBmdWxsUGF0aCwgZXhwb3J0cyB9KTtcbiAgICB0aGlzLmxvZyhcImluZm9cIiwgYGxvYWRlZCBuYXRpdmUgbW9kdWxlICR7Y3R4LmlkfToke2lkfWAsIHsga2luZCwgcGF0aDogZnVsbFBhdGggfSk7XG4gICAgcmV0dXJuIHRoaXMubW9kdWxlUmVmKGN0eC5pZCwgaWQsIGtpbmQpO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlUGFuZWwoY3R4OiBOYXRpdmVUd2Vha0NvbnRleHQsIG9wdGlvbnM6IE5hdGl2ZVBhbmVsQ3JlYXRlT3B0aW9ucyk6IFByb21pc2U8TmF0aXZlUGFuZWxSZWY+IHtcbiAgICBjb25zdCBjcmVhdGVkID0gYXdhaXQgdGhpcy5jcmVhdGVOYXRpdmVJbnN0YW5jZShjdHgsIFwicGFuZWxcIiwgb3B0aW9ucy5tb2R1bGVJZCwgb3B0aW9ucy5mYWN0b3J5ID8/IFwiY3JlYXRlUGFuZWxcIiwge1xuICAgICAgcGFyZW50V2luZG93SWQ6IG9wdGlvbnMucGFyZW50V2luZG93SWQsXG4gICAgICBib3VuZHM6IG9wdGlvbnMuYm91bmRzLFxuICAgICAgdHJhbnNwYXJlbnQ6IG9wdGlvbnMudHJhbnNwYXJlbnQgPT09IHRydWUsXG4gICAgICBwYXNzdGhyb3VnaE1vdXNlOiBvcHRpb25zLnBhc3N0aHJvdWdoTW91c2UgPT09IHRydWUsXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucGFuZWxSZWYoY3JlYXRlZCk7XG4gIH1cblxuICBhc3luYyBhdHRhY2hWaWV3KGN0eDogTmF0aXZlVHdlYWtDb250ZXh0LCBvcHRpb25zOiBOYXRpdmVWaWV3QXR0YWNoT3B0aW9ucyk6IFByb21pc2U8TmF0aXZlVmlld1JlZj4ge1xuICAgIGNvbnN0IGNyZWF0ZWQgPSBhd2FpdCB0aGlzLmNyZWF0ZU5hdGl2ZUluc3RhbmNlKGN0eCwgXCJ2aWV3XCIsIG9wdGlvbnMubW9kdWxlSWQsIG9wdGlvbnMuZmFjdG9yeSA/PyBcImF0dGFjaFZpZXdcIiwge1xuICAgICAgcGFyZW50V2luZG93SWQ6IG9wdGlvbnMucGFyZW50V2luZG93SWQsXG4gICAgICBib3VuZHM6IG9wdGlvbnMuYm91bmRzLFxuICAgICAgekluZGV4OiBvcHRpb25zLnpJbmRleCxcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy52aWV3UmVmKGNyZWF0ZWQpO1xuICB9XG5cbiAgbGF1bmNoSGVscGVyKGN0eDogTmF0aXZlVHdlYWtDb250ZXh0LCBvcHRpb25zOiBOYXRpdmVIZWxwZXJMYXVuY2hPcHRpb25zKTogTmF0aXZlSGVscGVyUmVmIHtcbiAgICBjb25zdCBpZCA9IGFzc2VydEJyaWRnZUlkKG9wdGlvbnMuaWQsIFwibmF0aXZlIGhlbHBlciBpZFwiKTtcbiAgICBpZiAoKG9wdGlvbnMudHJhbnNwb3J0ID8/IFwic3RkaW9cIikgIT09IFwic3RkaW9cIikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwibmF0aXZlIGhlbHBlcnMgc3VwcG9ydCBvbmx5IHN0ZGlvIHRyYW5zcG9ydCBpbiBDb2RleCsrIDEuMC4wXCIpO1xuICAgIH1cbiAgICBpZiAoKG9wdGlvbnMucmVzdGFydCA/PyBcIm5ldmVyXCIpICE9PSBcIm5ldmVyXCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIm5hdGl2ZSBoZWxwZXIgcmVzdGFydCBwb2xpY2llcyBhcmUgbm90IGF2YWlsYWJsZSBpbiBDb2RleCsrIDEuMC4wXCIpO1xuICAgIH1cbiAgICBjb25zdCBleGVjdXRhYmxlID0gcmVzb2x2ZVR3ZWFrUGF0aChjdHgsIG9wdGlvbnMuZXhlY3V0YWJsZSk7XG4gICAgY29uc3QgYXJncyA9IG9wdGlvbnMuYXJncyA/PyBbXTtcbiAgICBjb25zdCBlbnYgPSB7IC4uLnByb2Nlc3MuZW52LCAuLi4ob3B0aW9ucy5lbnYgPz8ge30pIH07XG4gICAgY29uc3QgY2hpbGQgPSBzcGF3bihleGVjdXRhYmxlLCBhcmdzLCB7XG4gICAgICBjd2Q6IGN0eC5kaXIsXG4gICAgICBlbnYsXG4gICAgICBzdGRpbzogW1wicGlwZVwiLCBcInBpcGVcIiwgXCJwaXBlXCJdLFxuICAgIH0pO1xuICAgIGNvbnN0IGtleSA9IGhlbHBlcktleShjdHguaWQsIGlkKTtcbiAgICBjb25zdCBoZWxwZXI6IE5hdGl2ZUhlbHBlclByb2Nlc3MgPSB7XG4gICAgICBrZXksXG4gICAgICB0d2Vha0lkOiBjdHguaWQsXG4gICAgICBpZCxcbiAgICAgIGNoaWxkLFxuICAgICAgcGVuZGluZzogbmV3IE1hcCgpLFxuICAgIH07XG4gICAgdGhpcy5oZWxwZXJzLnNldChrZXksIGhlbHBlcik7XG5cbiAgICBjb25zdCBzdGRvdXQgPSBjcmVhdGVJbnRlcmZhY2UoeyBpbnB1dDogY2hpbGQuc3Rkb3V0IH0pO1xuICAgIHN0ZG91dC5vbihcImxpbmVcIiwgKGxpbmUpID0+IHRoaXMuaGFuZGxlSGVscGVyTGluZShoZWxwZXIsIGxpbmUpKTtcbiAgICBjaGlsZC5zdGRlcnIub24oXCJkYXRhXCIsIChjaHVuaykgPT4ge1xuICAgICAgdGhpcy5sb2coXCJ3YXJuXCIsIGBuYXRpdmUgaGVscGVyICR7Y3R4LmlkfToke2lkfSBzdGRlcnJgLCBTdHJpbmcoY2h1bmspKTtcbiAgICB9KTtcbiAgICBjaGlsZC5vbihcImV4aXRcIiwgKGNvZGUsIHNpZ25hbCkgPT4ge1xuICAgICAgdGhpcy5sb2coXCJpbmZvXCIsIGBuYXRpdmUgaGVscGVyICR7Y3R4LmlkfToke2lkfSBleGl0ZWRgLCB7IGNvZGUsIHNpZ25hbCB9KTtcbiAgICAgIHRoaXMuaGVscGVycy5kZWxldGUoa2V5KTtcbiAgICAgIGZvciAoY29uc3QgcmVxdWVzdCBvZiBoZWxwZXIucGVuZGluZy52YWx1ZXMoKSkge1xuICAgICAgICBjbGVhclRpbWVvdXQocmVxdWVzdC50aW1lcik7XG4gICAgICAgIHJlcXVlc3QucmVqZWN0KG5ldyBFcnJvcihgbmF0aXZlIGhlbHBlciBleGl0ZWQgYmVmb3JlIHJlc3BvbnNlYCkpO1xuICAgICAgfVxuICAgICAgaGVscGVyLnBlbmRpbmcuY2xlYXIoKTtcbiAgICB9KTtcbiAgICBjaGlsZC5vbihcImVycm9yXCIsIChlcnJvcikgPT4ge1xuICAgICAgdGhpcy5sb2coXCJlcnJvclwiLCBgbmF0aXZlIGhlbHBlciAke2N0eC5pZH06JHtpZH0gZmFpbGVkYCwgZXJyb3IpO1xuICAgICAgdGhpcy5oZWxwZXJzLmRlbGV0ZShrZXkpO1xuICAgICAgZm9yIChjb25zdCByZXF1ZXN0IG9mIGhlbHBlci5wZW5kaW5nLnZhbHVlcygpKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChyZXF1ZXN0LnRpbWVyKTtcbiAgICAgICAgcmVxdWVzdC5yZWplY3QoZXJyb3IpO1xuICAgICAgfVxuICAgICAgaGVscGVyLnBlbmRpbmcuY2xlYXIoKTtcbiAgICB9KTtcblxuICAgIHRoaXMubG9nKFwiaW5mb1wiLCBgbGF1bmNoZWQgbmF0aXZlIGhlbHBlciAke2N0eC5pZH06JHtpZH1gLCB7IHBpZDogY2hpbGQucGlkLCBleGVjdXRhYmxlIH0pO1xuICAgIHJldHVybiB0aGlzLmhlbHBlclJlZihjdHguaWQsIGlkLCBjaGlsZC5waWQgPz8gLTEpO1xuICB9XG5cbiAgZGlzcG9zZVR3ZWFrKHR3ZWFrSWQ6IHN0cmluZyk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgW2tleSwgaW5zdGFuY2VdIG9mIFsuLi50aGlzLmluc3RhbmNlc10pIHtcbiAgICAgIGlmIChpbnN0YW5jZS50d2Vha0lkICE9PSB0d2Vha0lkKSBjb250aW51ZTtcbiAgICAgIHZvaWQgdGhpcy5kaXNwb3NlSW5zdGFuY2UoaW5zdGFuY2UpLmZpbmFsbHkoKCkgPT4gdGhpcy5pbnN0YW5jZXMuZGVsZXRlKGtleSkpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtrZXksIGhlbHBlcl0gb2YgWy4uLnRoaXMuaGVscGVyc10pIHtcbiAgICAgIGlmIChoZWxwZXIudHdlYWtJZCAhPT0gdHdlYWtJZCkgY29udGludWU7XG4gICAgICB0aGlzLnN0b3BIZWxwZXIoaGVscGVyKTtcbiAgICAgIHRoaXMuaGVscGVycy5kZWxldGUoa2V5KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBba2V5LCBtb2RdIG9mIFsuLi50aGlzLm1vZHVsZXNdKSB7XG4gICAgICBpZiAobW9kLnR3ZWFrSWQgIT09IHR3ZWFrSWQpIGNvbnRpbnVlO1xuICAgICAgdm9pZCBjYWxsT3B0aW9uYWwobW9kLmV4cG9ydHMsIFwiZGlzcG9zZVwiLCBbXSk7XG4gICAgICB0aGlzLm1vZHVsZXMuZGVsZXRlKGtleSk7XG4gICAgfVxuICB9XG5cbiAgZGlzcG9zZUFsbCgpOiB2b2lkIHtcbiAgICBjb25zdCB0d2Vha0lkcyA9IG5ldyBTZXQoW1xuICAgICAgLi4uWy4uLnRoaXMubW9kdWxlcy52YWx1ZXMoKV0ubWFwKChpdGVtKSA9PiBpdGVtLnR3ZWFrSWQpLFxuICAgICAgLi4uWy4uLnRoaXMuaW5zdGFuY2VzLnZhbHVlcygpXS5tYXAoKGl0ZW0pID0+IGl0ZW0udHdlYWtJZCksXG4gICAgICAuLi5bLi4udGhpcy5oZWxwZXJzLnZhbHVlcygpXS5tYXAoKGl0ZW0pID0+IGl0ZW0udHdlYWtJZCksXG4gICAgXSk7XG4gICAgZm9yIChjb25zdCBpZCBvZiB0d2Vha0lkcykgdGhpcy5kaXNwb3NlVHdlYWsoaWQpO1xuICB9XG5cbiAgYXN5bmMgY2FsbEluc3RhbmNlKFxuICAgIHR3ZWFrSWQ6IHN0cmluZyxcbiAgICBraW5kOiBcInBhbmVsXCIgfCBcInZpZXdcIixcbiAgICBpZDogc3RyaW5nLFxuICAgIG1ldGhvZDogc3RyaW5nLFxuICAgIGFyZz86IHVua25vd24sXG4gICk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmIChraW5kID09PSBcInBhbmVsXCIpIHtcbiAgICAgIGlmIChtZXRob2QgPT09IFwic2V0Qm91bmRzXCIpIHJldHVybiB0aGlzLmludm9rZUluc3RhbmNlKHR3ZWFrSWQsIGlkLCBcInNldEJvdW5kc1wiLCBbYXJnXSk7XG4gICAgICBpZiAobWV0aG9kID09PSBcInNob3dcIikgcmV0dXJuIHRoaXMuaW52b2tlSW5zdGFuY2UodHdlYWtJZCwgaWQsIFwic2hvd1wiLCBbXSk7XG4gICAgICBpZiAobWV0aG9kID09PSBcImhpZGVcIikgcmV0dXJuIHRoaXMuaW52b2tlSW5zdGFuY2UodHdlYWtJZCwgaWQsIFwiaGlkZVwiLCBbXSk7XG4gICAgICBpZiAobWV0aG9kID09PSBcImRpc3Bvc2VcIikgcmV0dXJuIHRoaXMuZGlzcG9zZUluc3RhbmNlQnlJZCh0d2Vha0lkLCBpZCk7XG4gICAgfVxuICAgIGlmIChraW5kID09PSBcInZpZXdcIikge1xuICAgICAgaWYgKG1ldGhvZCA9PT0gXCJzZXRCb3VuZHNcIikgcmV0dXJuIHRoaXMuaW52b2tlSW5zdGFuY2UodHdlYWtJZCwgaWQsIFwic2V0Qm91bmRzXCIsIFthcmddKTtcbiAgICAgIGlmIChtZXRob2QgPT09IFwic2V0VmlzaWJsZVwiKSByZXR1cm4gdGhpcy5pbnZva2VJbnN0YW5jZSh0d2Vha0lkLCBpZCwgXCJzZXRWaXNpYmxlXCIsIFthcmddKTtcbiAgICAgIGlmIChtZXRob2QgPT09IFwiZGlzcG9zZVwiKSByZXR1cm4gdGhpcy5kaXNwb3NlSW5zdGFuY2VCeUlkKHR3ZWFrSWQsIGlkKTtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIG5hdGl2ZSAke2tpbmR9IG1ldGhvZDogJHttZXRob2R9YCk7XG4gIH1cblxuICBhc3luYyBjYWxsSGVscGVyKFxuICAgIHR3ZWFrSWQ6IHN0cmluZyxcbiAgICBoZWxwZXJJZDogc3RyaW5nLFxuICAgIG1ldGhvZDogc3RyaW5nLFxuICAgIHBheWxvYWQ/OiB1bmtub3duLFxuICAgIHRpbWVvdXRNcz86IG51bWJlcixcbiAgKTogUHJvbWlzZTx1bmtub3duPiB7XG4gICAgaWYgKG1ldGhvZCA9PT0gXCJzZW5kXCIpIHJldHVybiB0aGlzLnNlbmRIZWxwZXIodHdlYWtJZCwgaGVscGVySWQsIHBheWxvYWQpO1xuICAgIGlmIChtZXRob2QgPT09IFwicmVxdWVzdFwiKSByZXR1cm4gdGhpcy5yZXF1ZXN0SGVscGVyKHR3ZWFrSWQsIGhlbHBlcklkLCBwYXlsb2FkLCB0aW1lb3V0TXMpO1xuICAgIGlmIChtZXRob2QgPT09IFwic3RvcFwiKSByZXR1cm4gdGhpcy5zdG9wSGVscGVyQnlJZCh0d2Vha0lkLCBoZWxwZXJJZCk7XG4gICAgdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIG5hdGl2ZSBoZWxwZXIgbWV0aG9kOiAke21ldGhvZH1gKTtcbiAgfVxuXG4gIHByaXZhdGUgbW9kdWxlUmVmKHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZywga2luZCA9IHRoaXMubW9kdWxlRm9yKHR3ZWFrSWQsIGlkKS5raW5kKTogTmF0aXZlTW9kdWxlUmVmIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQsXG4gICAgICBraW5kLFxuICAgICAgcmVxdWVzdDogKG1ldGhvZCwgcGF5bG9hZCwgdGltZW91dE1zKSA9PlxuICAgICAgICB0aGlzLnJlcXVlc3RNb2R1bGUodHdlYWtJZCwgaWQsIG1ldGhvZCwgcGF5bG9hZCwgdGltZW91dE1zKSxcbiAgICAgIGRpc3Bvc2U6ICgpID0+IHRoaXMuZGlzcG9zZU1vZHVsZSh0d2Vha0lkLCBpZCksXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgcGFuZWxSZWYoaW5zdGFuY2U6IE5hdGl2ZUluc3RhbmNlKTogTmF0aXZlUGFuZWxSZWYge1xuICAgIHJldHVybiB7XG4gICAgICBpZDogaW5zdGFuY2UuaWQsXG4gICAgICB3aW5kb3dJZDogaW5zdGFuY2Uud2luZG93SWQsXG4gICAgICBzZXRCb3VuZHM6IChib3VuZHMpID0+IHRoaXMuaW52b2tlSW5zdGFuY2UoaW5zdGFuY2UudHdlYWtJZCwgaW5zdGFuY2UuaWQsIFwic2V0Qm91bmRzXCIsIFtib3VuZHNdKSxcbiAgICAgIHNob3c6ICgpID0+IHRoaXMuaW52b2tlSW5zdGFuY2UoaW5zdGFuY2UudHdlYWtJZCwgaW5zdGFuY2UuaWQsIFwic2hvd1wiLCBbXSksXG4gICAgICBoaWRlOiAoKSA9PiB0aGlzLmludm9rZUluc3RhbmNlKGluc3RhbmNlLnR3ZWFrSWQsIGluc3RhbmNlLmlkLCBcImhpZGVcIiwgW10pLFxuICAgICAgZGlzcG9zZTogKCkgPT4gdGhpcy5kaXNwb3NlSW5zdGFuY2VCeUlkKGluc3RhbmNlLnR3ZWFrSWQsIGluc3RhbmNlLmlkKSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSB2aWV3UmVmKGluc3RhbmNlOiBOYXRpdmVJbnN0YW5jZSk6IE5hdGl2ZVZpZXdSZWYge1xuICAgIHJldHVybiB7XG4gICAgICBpZDogaW5zdGFuY2UuaWQsXG4gICAgICBzZXRCb3VuZHM6IChib3VuZHMpID0+IHRoaXMuaW52b2tlSW5zdGFuY2UoaW5zdGFuY2UudHdlYWtJZCwgaW5zdGFuY2UuaWQsIFwic2V0Qm91bmRzXCIsIFtib3VuZHNdKSxcbiAgICAgIHNldFZpc2libGU6ICh2aXNpYmxlKSA9PiB0aGlzLmludm9rZUluc3RhbmNlKGluc3RhbmNlLnR3ZWFrSWQsIGluc3RhbmNlLmlkLCBcInNldFZpc2libGVcIiwgW3Zpc2libGVdKSxcbiAgICAgIGRpc3Bvc2U6ICgpID0+IHRoaXMuZGlzcG9zZUluc3RhbmNlQnlJZChpbnN0YW5jZS50d2Vha0lkLCBpbnN0YW5jZS5pZCksXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgaGVscGVyUmVmKHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZywgcGlkOiBudW1iZXIpOiBOYXRpdmVIZWxwZXJSZWYge1xuICAgIHJldHVybiB7XG4gICAgICBpZCxcbiAgICAgIHBpZCxcbiAgICAgIHNlbmQ6IChtZXNzYWdlKSA9PiB0aGlzLnNlbmRIZWxwZXIodHdlYWtJZCwgaWQsIG1lc3NhZ2UpLFxuICAgICAgcmVxdWVzdDogKG1lc3NhZ2UsIHRpbWVvdXRNcykgPT4gdGhpcy5yZXF1ZXN0SGVscGVyKHR3ZWFrSWQsIGlkLCBtZXNzYWdlLCB0aW1lb3V0TXMpLFxuICAgICAgc3RvcDogKCkgPT4gdGhpcy5zdG9wSGVscGVyQnlJZCh0d2Vha0lkLCBpZCksXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHJlcXVlc3RNb2R1bGUoXG4gICAgdHdlYWtJZDogc3RyaW5nLFxuICAgIGlkOiBzdHJpbmcsXG4gICAgbWV0aG9kOiBzdHJpbmcsXG4gICAgcGF5bG9hZD86IHVua25vd24sXG4gICAgX3RpbWVvdXRNcz86IG51bWJlcixcbiAgKTogUHJvbWlzZTx1bmtub3duPiB7XG4gICAgY29uc3QgbW9kID0gdGhpcy5tb2R1bGVGb3IodHdlYWtJZCwgaWQpO1xuICAgIGNvbnN0IHRhcmdldCA9IGFzUmVjb3JkKG1vZC5leHBvcnRzKTtcbiAgICBjb25zdCBmbiA9IHRhcmdldD8ucmVxdWVzdDtcbiAgICBpZiAodHlwZW9mIGZuID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHJldHVybiBhd2FpdCBmbi5jYWxsKG1vZC5leHBvcnRzLCBtZXRob2QsIHBheWxvYWQpO1xuICAgIH1cbiAgICBjb25zdCBtZXRob2RGbiA9IHRhcmdldD8uW21ldGhvZF07XG4gICAgaWYgKHR5cGVvZiBtZXRob2RGbiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICByZXR1cm4gYXdhaXQgbWV0aG9kRm4uY2FsbChtb2QuZXhwb3J0cywgcGF5bG9hZCk7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgbmF0aXZlIG1vZHVsZSAke3R3ZWFrSWR9OiR7aWR9IGhhcyBubyByZXF1ZXN0KCkgb3IgJHttZXRob2R9KClgKTtcbiAgfVxuXG4gIGFzeW5jIGRpc3Bvc2VNb2R1bGUodHdlYWtJZDogc3RyaW5nLCBpZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qga2V5ID0gbW9kdWxlS2V5KHR3ZWFrSWQsIGlkKTtcbiAgICBjb25zdCBtb2QgPSB0aGlzLm1vZHVsZXMuZ2V0KGtleSk7XG4gICAgaWYgKCFtb2QpIHJldHVybjtcbiAgICBhd2FpdCBjYWxsT3B0aW9uYWwobW9kLmV4cG9ydHMsIFwiZGlzcG9zZVwiLCBbXSk7XG4gICAgdGhpcy5tb2R1bGVzLmRlbGV0ZShrZXkpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjcmVhdGVOYXRpdmVJbnN0YW5jZShcbiAgICBjdHg6IE5hdGl2ZVR3ZWFrQ29udGV4dCxcbiAgICBraW5kOiBcInBhbmVsXCIgfCBcInZpZXdcIixcbiAgICBtb2R1bGVJZDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgIGZhY3Rvcnk6IHN0cmluZyxcbiAgICBvcHRpb25zOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgKTogUHJvbWlzZTxOYXRpdmVJbnN0YW5jZT4ge1xuICAgIGNvbnN0IHRhcmdldCA9IG1vZHVsZUlkID8gdGhpcy5tb2R1bGVGb3IoY3R4LmlkLCBtb2R1bGVJZCkuZXhwb3J0cyA6IHRoaXMubG9hZE5hdGl2ZUhvc3QodHJ1ZSk7XG4gICAgY29uc3QgZm4gPSBhc1JlY29yZCh0YXJnZXQpPy5bZmFjdG9yeV07XG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBjb25zdCBsYWJlbCA9IG1vZHVsZUlkID8gYG5hdGl2ZSBtb2R1bGUgJHtjdHguaWR9OiR7bW9kdWxlSWR9YCA6IFwiQ29kZXgrKyBuYXRpdmUgaG9zdFwiO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGAke2xhYmVsfSBoYXMgbm8gZmFjdG9yeSAke2ZhY3Rvcnl9KClgKTtcbiAgICB9XG5cbiAgICBjb25zdCBwYXJlbnRXaW5kb3cgPSB0eXBlb2Ygb3B0aW9ucy5wYXJlbnRXaW5kb3dJZCA9PT0gXCJudW1iZXJcIlxuICAgICAgPyBCcm93c2VyV2luZG93LmZyb21JZChvcHRpb25zLnBhcmVudFdpbmRvd0lkKVxuICAgICAgOiBCcm93c2VyV2luZG93LmdldEZvY3VzZWRXaW5kb3coKTtcbiAgICBjb25zdCBwYXJlbnROYXRpdmVIYW5kbGUgPSBuYXRpdmVIYW5kbGVGb3JXaW5kb3cocGFyZW50V2luZG93KTtcbiAgICBjb25zdCB2YWx1ZSA9IGF3YWl0IGZuLmNhbGwodGFyZ2V0LCB7XG4gICAgICAuLi5vcHRpb25zLFxuICAgICAgcGFyZW50V2luZG93SWQ6IHdpbmRvd0lkRm9yKHBhcmVudFdpbmRvdyksXG4gICAgICBwYXJlbnRXZWJDb250ZW50c0lkOiB3ZWJDb250ZW50c0lkRm9yKHBhcmVudFdpbmRvdyksXG4gICAgICBwYXJlbnROYXRpdmVIYW5kbGUsXG4gICAgfSk7XG4gICAgY29uc3QgaWQgPSB0eXBlb2YgYXNSZWNvcmQodmFsdWUpPy5pZCA9PT0gXCJzdHJpbmdcIiA/IFN0cmluZyhhc1JlY29yZCh2YWx1ZSk/LmlkKSA6IHJhbmRvbVVVSUQoKTtcbiAgICBjb25zdCB3aW5kb3dJZCA9IHR5cGVvZiBhc1JlY29yZCh2YWx1ZSk/LndpbmRvd0lkID09PSBcIm51bWJlclwiID8gTnVtYmVyKGFzUmVjb3JkKHZhbHVlKT8ud2luZG93SWQpIDogbnVsbDtcbiAgICBjb25zdCBpbnN0YW5jZTogTmF0aXZlSW5zdGFuY2UgPSB7XG4gICAgICBrZXk6IGluc3RhbmNlS2V5KGN0eC5pZCwgaWQpLFxuICAgICAgdHdlYWtJZDogY3R4LmlkLFxuICAgICAgaWQsXG4gICAgICBraW5kLFxuICAgICAgdmFsdWUsXG4gICAgICBwYXJlbnRXaW5kb3dJZDogd2luZG93SWRGb3IocGFyZW50V2luZG93KSxcbiAgICAgIHdpbmRvd0lkLFxuICAgICAgZGlzcG9zZUJpbmRpbmdzOiBbXSxcbiAgICAgIGRpc3Bvc2luZzogZmFsc2UsXG4gICAgfTtcbiAgICB0aGlzLmluc3RhbmNlcy5zZXQoaW5zdGFuY2Uua2V5LCBpbnN0YW5jZSk7XG4gICAgaWYgKGNhbkJpbmRQYXJlbnRXaW5kb3cocGFyZW50V2luZG93KSkge1xuICAgICAgdGhpcy5iaW5kSW5zdGFuY2VUb1BhcmVudChpbnN0YW5jZSwgcGFyZW50V2luZG93KTtcbiAgICAgIHRoaXMuc3luY1BhcmVudFN0YXRlKGluc3RhbmNlLCBwYXJlbnRXaW5kb3csIFwiY3JlYXRlZFwiKTtcbiAgICB9XG4gICAgdGhpcy5sb2coXCJpbmZvXCIsIGBjcmVhdGVkIG5hdGl2ZSAke2tpbmR9ICR7Y3R4LmlkfToke2lkfWAsIHtcbiAgICAgIG1vZHVsZUlkOiBtb2R1bGVJZCA/PyBcImNvZGV4cHAubmF0aXZlLWhvc3RcIixcbiAgICAgIGZhY3RvcnksXG4gICAgICB3aW5kb3dJZCxcbiAgICB9KTtcbiAgICByZXR1cm4gaW5zdGFuY2U7XG4gIH1cblxuICBwcml2YXRlIGxvYWROYXRpdmVIb3N0KHJlcXVpcmVkOiB0cnVlKTogdW5rbm93bjtcbiAgcHJpdmF0ZSBsb2FkTmF0aXZlSG9zdChyZXF1aXJlZDogZmFsc2UpOiB1bmtub3duIHwgbnVsbDtcbiAgcHJpdmF0ZSBsb2FkTmF0aXZlSG9zdChyZXF1aXJlZDogYm9vbGVhbik6IHVua25vd24gfCBudWxsIHtcbiAgICBpZiAodGhpcy5uYXRpdmVIb3N0RXhwb3J0cykgcmV0dXJuIHRoaXMubmF0aXZlSG9zdEV4cG9ydHM7XG4gICAgaWYgKHRoaXMubmF0aXZlSG9zdExvYWRFcnJvciAmJiAhcmVxdWlyZWQpIHJldHVybiBudWxsO1xuICAgIGNvbnN0IG5hdGl2ZUhvc3RQYXRoID0gdGhpcy5vcHRpb25zLm5hdGl2ZUhvc3RQYXRoO1xuICAgIGlmICghbmF0aXZlSG9zdFBhdGggfHwgIWV4aXN0c1N5bmMobmF0aXZlSG9zdFBhdGgpKSB7XG4gICAgICBjb25zdCBlcnJvciA9IG5ldyBFcnJvcihcIkNvZGV4KysgbmF0aXZlIGhvc3QgaXMgbm90IGluc3RhbGxlZFwiKTtcbiAgICAgIHRoaXMubmF0aXZlSG9zdExvYWRFcnJvciA9IGVycm9yO1xuICAgICAgaWYgKHJlcXVpcmVkKSB0aHJvdyBlcnJvcjtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgdGhpcy5uYXRpdmVIb3N0RXhwb3J0cyA9IHJlcXVpcmUobmF0aXZlSG9zdFBhdGgpIGFzIHVua25vd247XG4gICAgICB0aGlzLm5hdGl2ZUhvc3RMb2FkRXJyb3IgPSBudWxsO1xuICAgICAgdGhpcy5sb2coXCJpbmZvXCIsIFwibG9hZGVkIENvZGV4KysgbmF0aXZlIGhvc3RcIiwgeyBwYXRoOiBuYXRpdmVIb3N0UGF0aCB9KTtcbiAgICAgIHJldHVybiB0aGlzLm5hdGl2ZUhvc3RFeHBvcnRzO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLm5hdGl2ZUhvc3RMb2FkRXJyb3IgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IgOiBuZXcgRXJyb3IoU3RyaW5nKGVycm9yKSk7XG4gICAgICB0aGlzLmxvZyhcImVycm9yXCIsIFwiZmFpbGVkIHRvIGxvYWQgQ29kZXgrKyBuYXRpdmUgaG9zdFwiLCB0aGlzLm5hdGl2ZUhvc3RMb2FkRXJyb3IpO1xuICAgICAgaWYgKHJlcXVpcmVkKSB0aHJvdyB0aGlzLm5hdGl2ZUhvc3RMb2FkRXJyb3I7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlYWROYXRpdmVIb3N0Q2FwYWJpbGl0aWVzKGhvc3Q6IHVua25vd24pOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB7XG4gICAgY29uc3QgZ2V0Q2FwYWJpbGl0aWVzID0gYXNSZWNvcmQoaG9zdCk/LmdldENhcGFiaWxpdGllcztcbiAgICBpZiAodHlwZW9mIGdldENhcGFiaWxpdGllcyAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm4ge307XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNhcGFiaWxpdGllcyA9IGdldENhcGFiaWxpdGllcy5jYWxsKGhvc3QpO1xuICAgICAgcmV0dXJuIGFzUmVjb3JkKGNhcGFiaWxpdGllcykgPz8ge307XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nKFwid2FyblwiLCBcIkNvZGV4KysgbmF0aXZlIGhvc3QgY2FwYWJpbGl0eSBwcm9iZSBmYWlsZWRcIiwgZXJyb3IpO1xuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaW52b2tlSW5zdGFuY2UoXG4gICAgdHdlYWtJZDogc3RyaW5nLFxuICAgIGlkOiBzdHJpbmcsXG4gICAgbWV0aG9kOiBzdHJpbmcsXG4gICAgYXJnczogdW5rbm93bltdLFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VGb3IodHdlYWtJZCwgaWQpO1xuICAgIGNvbnN0IGZuID0gYXNSZWNvcmQoaW5zdGFuY2UudmFsdWUpPy5bbWV0aG9kXTtcbiAgICBpZiAodHlwZW9mIGZuID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIGF3YWl0IGZuLmFwcGx5KGluc3RhbmNlLnZhbHVlLCBhcmdzKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGluc3RhbmNlLndpbmRvd0lkICE9PSBudWxsKSB7XG4gICAgICBjb25zdCB3aW4gPSBCcm93c2VyV2luZG93LmZyb21JZChpbnN0YW5jZS53aW5kb3dJZCk7XG4gICAgICBpZiAod2luICYmICF3aW4uaXNEZXN0cm95ZWQoKSkge1xuICAgICAgICBpZiAobWV0aG9kID09PSBcInNldEJvdW5kc1wiKSB3aW4uc2V0Qm91bmRzKGFyZ3NbMF0gYXMgRWxlY3Ryb24uUmVjdGFuZ2xlKTtcbiAgICAgICAgZWxzZSBpZiAobWV0aG9kID09PSBcInNob3dcIikgd2luLnNob3coKTtcbiAgICAgICAgZWxzZSBpZiAobWV0aG9kID09PSBcImhpZGVcIikgd2luLmhpZGUoKTtcbiAgICAgICAgZWxzZSBpZiAobWV0aG9kID09PSBcInNldFZpc2libGVcIikgKGFyZ3NbMF0gPyB3aW4uc2hvdygpIDogd2luLmhpZGUoKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBuYXRpdmUgJHtpbnN0YW5jZS5raW5kfSAke3R3ZWFrSWR9OiR7aWR9IGRvZXMgbm90IGltcGxlbWVudCAke21ldGhvZH0oKWApO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBkaXNwb3NlSW5zdGFuY2VCeUlkKHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGtleSA9IGluc3RhbmNlS2V5KHR3ZWFrSWQsIGlkKTtcbiAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChrZXkpO1xuICAgIGlmICghaW5zdGFuY2UpIHJldHVybjtcbiAgICBhd2FpdCB0aGlzLmRpc3Bvc2VJbnN0YW5jZShpbnN0YW5jZSk7XG4gICAgdGhpcy5pbnN0YW5jZXMuZGVsZXRlKGtleSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGRpc3Bvc2VJbnN0YW5jZShpbnN0YW5jZTogTmF0aXZlSW5zdGFuY2UpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoaW5zdGFuY2UuZGlzcG9zaW5nKSByZXR1cm47XG4gICAgaW5zdGFuY2UuZGlzcG9zaW5nID0gdHJ1ZTtcbiAgICBmb3IgKGNvbnN0IGRpc3Bvc2Ugb2YgaW5zdGFuY2UuZGlzcG9zZUJpbmRpbmdzLnNwbGljZSgwKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgZGlzcG9zZSgpO1xuICAgICAgfSBjYXRjaCB7fVxuICAgIH1cbiAgICBhd2FpdCBjYWxsT3B0aW9uYWwoaW5zdGFuY2UudmFsdWUsIFwiZGlzcG9zZVwiLCBbXSk7XG4gICAgaWYgKGluc3RhbmNlLndpbmRvd0lkICE9PSBudWxsKSB7XG4gICAgICBjb25zdCB3aW4gPSBCcm93c2VyV2luZG93LmZyb21JZChpbnN0YW5jZS53aW5kb3dJZCk7XG4gICAgICBpZiAod2luICYmICF3aW4uaXNEZXN0cm95ZWQoKSkgd2luLmNsb3NlKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBiaW5kSW5zdGFuY2VUb1BhcmVudChpbnN0YW5jZTogTmF0aXZlSW5zdGFuY2UsIHBhcmVudFdpbmRvdzogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyk6IHZvaWQge1xuICAgIGNvbnN0IG9uID0gKGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKSA9PiB7XG4gICAgICBwYXJlbnRXaW5kb3cub24oZXZlbnQgYXMgbmV2ZXIsIGxpc3RlbmVyIGFzIG5ldmVyKTtcbiAgICAgIGluc3RhbmNlLmRpc3Bvc2VCaW5kaW5ncy5wdXNoKCgpID0+IHBhcmVudFdpbmRvdy5vZmYoZXZlbnQgYXMgbmV2ZXIsIGxpc3RlbmVyIGFzIG5ldmVyKSk7XG4gICAgfTtcbiAgICBjb25zdCBzeW5jQm91bmRzID0gKCkgPT4gdGhpcy5zeW5jUGFyZW50U3RhdGUoaW5zdGFuY2UsIHBhcmVudFdpbmRvdywgXCJib3VuZHNcIik7XG4gICAgY29uc3Qgc3luY0ZvY3VzID0gKGZvY3VzZWQ6IGJvb2xlYW4pID0+IHRoaXMuc2lnbmFsUGFyZW50U3RhdGUoaW5zdGFuY2UsIHBhcmVudFdpbmRvdywgXCJmb2N1c1wiLCB7IGZvY3VzZWQgfSk7XG4gICAgY29uc3Qgc3luY1Zpc2liaWxpdHkgPSAodmlzaWJsZTogYm9vbGVhbikgPT5cbiAgICAgIHRoaXMuc2lnbmFsUGFyZW50U3RhdGUoaW5zdGFuY2UsIHBhcmVudFdpbmRvdywgXCJ2aXNpYmlsaXR5XCIsIHsgdmlzaWJsZSB9KTtcbiAgICBjb25zdCBkaXNwb3NlV2l0aFBhcmVudCA9ICgpID0+IHtcbiAgICAgIHRoaXMubG9nKFwiaW5mb1wiLCBgZGlzcG9zaW5nIG5hdGl2ZSAke2luc3RhbmNlLmtpbmR9ICR7aW5zdGFuY2UudHdlYWtJZH06JHtpbnN0YW5jZS5pZH07IHBhcmVudCBjbG9zZWRgKTtcbiAgICAgIHZvaWQgdGhpcy5kaXNwb3NlSW5zdGFuY2VCeUlkKGluc3RhbmNlLnR3ZWFrSWQsIGluc3RhbmNlLmlkKTtcbiAgICB9O1xuXG4gICAgb24oXCJtb3ZlXCIsIHN5bmNCb3VuZHMpO1xuICAgIG9uKFwicmVzaXplXCIsIHN5bmNCb3VuZHMpO1xuICAgIG9uKFwiZW50ZXItZnVsbC1zY3JlZW5cIiwgc3luY0JvdW5kcyk7XG4gICAgb24oXCJsZWF2ZS1mdWxsLXNjcmVlblwiLCBzeW5jQm91bmRzKTtcbiAgICBvbihcIm1heGltaXplXCIsIHN5bmNCb3VuZHMpO1xuICAgIG9uKFwidW5tYXhpbWl6ZVwiLCBzeW5jQm91bmRzKTtcbiAgICBvbihcIm1pbmltaXplXCIsIHN5bmNCb3VuZHMpO1xuICAgIG9uKFwicmVzdG9yZVwiLCBzeW5jQm91bmRzKTtcbiAgICBvbihcInNob3dcIiwgKCkgPT4gc3luY1Zpc2liaWxpdHkodHJ1ZSkpO1xuICAgIG9uKFwiaGlkZVwiLCAoKSA9PiBzeW5jVmlzaWJpbGl0eShmYWxzZSkpO1xuICAgIG9uKFwiZm9jdXNcIiwgKCkgPT4gc3luY0ZvY3VzKHRydWUpKTtcbiAgICBvbihcImJsdXJcIiwgKCkgPT4gc3luY0ZvY3VzKGZhbHNlKSk7XG4gICAgb24oXCJjbG9zZVwiLCBkaXNwb3NlV2l0aFBhcmVudCk7XG4gICAgb24oXCJjbG9zZWRcIiwgZGlzcG9zZVdpdGhQYXJlbnQpO1xuICB9XG5cbiAgcHJpdmF0ZSBzeW5jUGFyZW50U3RhdGUoXG4gICAgaW5zdGFuY2U6IE5hdGl2ZUluc3RhbmNlLFxuICAgIHBhcmVudFdpbmRvdzogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyxcbiAgICByZWFzb246IHN0cmluZyxcbiAgKTogdm9pZCB7XG4gICAgY29uc3Qgc3RhdGUgPSBwYXJlbnRXaW5kb3dTdGF0ZShwYXJlbnRXaW5kb3csIHJlYXNvbik7XG4gICAgaWYgKCFzdGF0ZSkgcmV0dXJuO1xuICAgIHZvaWQgdGhpcy5jYWxsRmlyc3RPcHRpb25hbEluc3RhbmNlKGluc3RhbmNlLCBbXCJzeW5jUGFyZW50XCIsIFwicGFyZW50Q2hhbmdlZFwiXSwgW3N0YXRlXSlcbiAgICAgIC50aGVuKChoYW5kbGVkKSA9PiB7XG4gICAgICAgIGlmICghaGFuZGxlZCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxGaXJzdE9wdGlvbmFsSW5zdGFuY2UoXG4gICAgICAgICAgICBpbnN0YW5jZSxcbiAgICAgICAgICAgIFtcInNldFBhcmVudEJvdW5kc1wiLCBcInBhcmVudEJvdW5kc0NoYW5nZWRcIl0sXG4gICAgICAgICAgICBbc3RhdGUuYm91bmRzLCBzdGF0ZV0sXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKChlcnJvcikgPT4gdGhpcy5sb2coXCJ3YXJuXCIsIGBuYXRpdmUgJHtpbnN0YW5jZS5raW5kfSBwYXJlbnQgc3luYyBmYWlsZWRgLCBlcnJvcikpO1xuICB9XG5cbiAgcHJpdmF0ZSBzaWduYWxQYXJlbnRTdGF0ZShcbiAgICBpbnN0YW5jZTogTmF0aXZlSW5zdGFuY2UsXG4gICAgcGFyZW50V2luZG93OiBFbGVjdHJvbi5Ccm93c2VyV2luZG93LFxuICAgIHJlYXNvbjogc3RyaW5nLFxuICAgIHBhdGNoOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgKTogdm9pZCB7XG4gICAgY29uc3Qgc3RhdGUgPSBwYXJlbnRXaW5kb3dTdGF0ZShwYXJlbnRXaW5kb3csIHJlYXNvbik7XG4gICAgaWYgKCFzdGF0ZSkgcmV0dXJuO1xuICAgIGNvbnN0IHBheWxvYWQgPSB7IC4uLnN0YXRlLCAuLi5wYXRjaCB9O1xuICAgIHZvaWQgdGhpcy5jYWxsRmlyc3RPcHRpb25hbEluc3RhbmNlKGluc3RhbmNlLCBbXCJwYXJlbnRTdGF0ZUNoYW5nZWRcIiwgXCJwYXJlbnRDaGFuZ2VkXCJdLCBbcGF5bG9hZF0pXG4gICAgICAuY2F0Y2goKGVycm9yKSA9PiB0aGlzLmxvZyhcIndhcm5cIiwgYG5hdGl2ZSAke2luc3RhbmNlLmtpbmR9IHBhcmVudCBzaWduYWwgZmFpbGVkYCwgZXJyb3IpKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY2FsbEZpcnN0T3B0aW9uYWxJbnN0YW5jZShcbiAgICBpbnN0YW5jZTogTmF0aXZlSW5zdGFuY2UsXG4gICAgbWV0aG9kczogc3RyaW5nW10sXG4gICAgYXJnczogdW5rbm93bltdLFxuICApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBjb25zdCB0YXJnZXQgPSBhc1JlY29yZChpbnN0YW5jZS52YWx1ZSk7XG4gICAgZm9yIChjb25zdCBtZXRob2Qgb2YgbWV0aG9kcykge1xuICAgICAgY29uc3QgZm4gPSB0YXJnZXQ/LlttZXRob2RdO1xuICAgICAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSBjb250aW51ZTtcbiAgICAgIGF3YWl0IGZuLmFwcGx5KGluc3RhbmNlLnZhbHVlLCBhcmdzKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHNlbmRIZWxwZXIodHdlYWtJZDogc3RyaW5nLCBpZDogc3RyaW5nLCBtZXNzYWdlOiB1bmtub3duKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgaGVscGVyID0gdGhpcy5oZWxwZXJGb3IodHdlYWtJZCwgaWQpO1xuICAgIGhlbHBlci5jaGlsZC5zdGRpbi53cml0ZShgJHtKU09OLnN0cmluZ2lmeShtZXNzYWdlKX1cXG5gKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmVxdWVzdEhlbHBlcihcbiAgICB0d2Vha0lkOiBzdHJpbmcsXG4gICAgaWQ6IHN0cmluZyxcbiAgICBtZXNzYWdlOiB1bmtub3duLFxuICAgIHRpbWVvdXRNcyA9IDEwXzAwMCxcbiAgKTogUHJvbWlzZTx1bmtub3duPiB7XG4gICAgY29uc3QgaGVscGVyID0gdGhpcy5oZWxwZXJGb3IodHdlYWtJZCwgaWQpO1xuICAgIGNvbnN0IHJlcXVlc3RJZCA9IHJhbmRvbVVVSUQoKTtcbiAgICBjb25zdCBwYXlsb2FkID0geyBpZDogcmVxdWVzdElkLCBtZXNzYWdlIH07XG4gICAgcmV0dXJuIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGhlbHBlci5wZW5kaW5nLmRlbGV0ZShyZXF1ZXN0SWQpO1xuICAgICAgICByZWplY3QobmV3IEVycm9yKGBuYXRpdmUgaGVscGVyIHJlcXVlc3QgdGltZWQgb3V0OiAke3R3ZWFrSWR9OiR7aWR9YCkpO1xuICAgICAgfSwgdGltZW91dE1zKTtcbiAgICAgIGhlbHBlci5wZW5kaW5nLnNldChyZXF1ZXN0SWQsIHsgcmVzb2x2ZSwgcmVqZWN0LCB0aW1lciB9KTtcbiAgICAgIGhlbHBlci5jaGlsZC5zdGRpbi53cml0ZShgJHtKU09OLnN0cmluZ2lmeShwYXlsb2FkKX1cXG5gKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc3RvcEhlbHBlckJ5SWQodHdlYWtJZDogc3RyaW5nLCBpZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qga2V5ID0gaGVscGVyS2V5KHR3ZWFrSWQsIGlkKTtcbiAgICBjb25zdCBoZWxwZXIgPSB0aGlzLmhlbHBlcnMuZ2V0KGtleSk7XG4gICAgaWYgKCFoZWxwZXIpIHJldHVybjtcbiAgICB0aGlzLnN0b3BIZWxwZXIoaGVscGVyKTtcbiAgICB0aGlzLmhlbHBlcnMuZGVsZXRlKGtleSk7XG4gIH1cblxuICBwcml2YXRlIHN0b3BIZWxwZXIoaGVscGVyOiBOYXRpdmVIZWxwZXJQcm9jZXNzKTogdm9pZCB7XG4gICAgaWYgKGhlbHBlci5jaGlsZC5raWxsZWQpIHJldHVybjtcbiAgICBoZWxwZXIuY2hpbGQua2lsbCgpO1xuICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBpZiAoIWhlbHBlci5jaGlsZC5raWxsZWQpIGhlbHBlci5jaGlsZC5raWxsKFwiU0lHS0lMTFwiKTtcbiAgICB9LCAxNTAwKTtcbiAgICB0aW1lci51bnJlZj8uKCk7XG4gIH1cblxuICBwcml2YXRlIGhhbmRsZUhlbHBlckxpbmUoaGVscGVyOiBOYXRpdmVIZWxwZXJQcm9jZXNzLCBsaW5lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBsZXQgcGF5bG9hZDogeyBpZD86IHVua25vd247IHJlc3VsdD86IHVua25vd247IGVycm9yPzogdW5rbm93biB9O1xuICAgIHRyeSB7XG4gICAgICBwYXlsb2FkID0gSlNPTi5wYXJzZShsaW5lKSBhcyB0eXBlb2YgcGF5bG9hZDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHRoaXMubG9nKFwiaW5mb1wiLCBgbmF0aXZlIGhlbHBlciAke2hlbHBlci50d2Vha0lkfToke2hlbHBlci5pZH1gLCBsaW5lKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBwYXlsb2FkLmlkICE9PSBcInN0cmluZ1wiKSByZXR1cm47XG4gICAgY29uc3QgcmVxdWVzdCA9IGhlbHBlci5wZW5kaW5nLmdldChwYXlsb2FkLmlkKTtcbiAgICBpZiAoIXJlcXVlc3QpIHJldHVybjtcbiAgICBoZWxwZXIucGVuZGluZy5kZWxldGUocGF5bG9hZC5pZCk7XG4gICAgY2xlYXJUaW1lb3V0KHJlcXVlc3QudGltZXIpO1xuICAgIGlmIChwYXlsb2FkLmVycm9yKSB7XG4gICAgICByZXF1ZXN0LnJlamVjdChuZXcgRXJyb3IoU3RyaW5nKHBheWxvYWQuZXJyb3IpKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlcXVlc3QucmVzb2x2ZShwYXlsb2FkLnJlc3VsdCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBtb2R1bGVGb3IodHdlYWtJZDogc3RyaW5nLCBpZDogc3RyaW5nKTogTG9hZGVkTmF0aXZlTW9kdWxlIHtcbiAgICBjb25zdCBtb2QgPSB0aGlzLm1vZHVsZXMuZ2V0KG1vZHVsZUtleSh0d2Vha0lkLCBpZCkpO1xuICAgIGlmICghbW9kKSB0aHJvdyBuZXcgRXJyb3IoYG5hdGl2ZSBtb2R1bGUgaXMgbm90IGxvYWRlZDogJHt0d2Vha0lkfToke2lkfWApO1xuICAgIHJldHVybiBtb2Q7XG4gIH1cblxuICBwcml2YXRlIGluc3RhbmNlRm9yKHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZyk6IE5hdGl2ZUluc3RhbmNlIHtcbiAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChpbnN0YW5jZUtleSh0d2Vha0lkLCBpZCkpO1xuICAgIGlmICghaW5zdGFuY2UpIHRocm93IG5ldyBFcnJvcihgbmF0aXZlIGluc3RhbmNlIGlzIG5vdCBsb2FkZWQ6ICR7dHdlYWtJZH06JHtpZH1gKTtcbiAgICByZXR1cm4gaW5zdGFuY2U7XG4gIH1cblxuICBwcml2YXRlIGhlbHBlckZvcih0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiBOYXRpdmVIZWxwZXJQcm9jZXNzIHtcbiAgICBjb25zdCBoZWxwZXIgPSB0aGlzLmhlbHBlcnMuZ2V0KGhlbHBlcktleSh0d2Vha0lkLCBpZCkpO1xuICAgIGlmICghaGVscGVyKSB0aHJvdyBuZXcgRXJyb3IoYG5hdGl2ZSBoZWxwZXIgaXMgbm90IHJ1bm5pbmc6ICR7dHdlYWtJZH06JHtpZH1gKTtcbiAgICByZXR1cm4gaGVscGVyO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVUd2Vha1BhdGgoY3R4OiBOYXRpdmVUd2Vha0NvbnRleHQsIHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiByZXNvbHZlTmF0aXZlVHdlYWtQYXRoKGN0eC5kaXIsIHBhdGgpO1xufVxuXG5mdW5jdGlvbiBpbmZlck1vZHVsZUtpbmQocGF0aDogc3RyaW5nKTogTmF0aXZlTW9kdWxlS2luZCB7XG4gIGlmIChwYXRoLmVuZHNXaXRoKFwiLm5vZGVcIikpIHJldHVybiBcIm5vZGUtYWRkb25cIjtcbiAgaWYgKHBhdGguZW5kc1dpdGgoXCIuZHlsaWJcIikpIHJldHVybiBcImR5bGliXCI7XG4gIGlmIChwYXRoLmVuZHNXaXRoKFwiLmZyYW1ld29ya1wiKSkgcmV0dXJuIFwiZnJhbWV3b3JrXCI7XG4gIHRocm93IG5ldyBFcnJvcihcIm5hdGl2ZSBtb2R1bGUgcGF0aCBtdXN0IGVuZCBpbiAubm9kZSwgLmR5bGliLCBvciAuZnJhbWV3b3JrXCIpO1xufVxuXG5mdW5jdGlvbiBzZWxlY3RFbnRyeXBvaW50KGxvYWRlZDogdW5rbm93biwgZW50cnlwb2ludDogc3RyaW5nIHwgdW5kZWZpbmVkKTogdW5rbm93biB7XG4gIGlmICghZW50cnlwb2ludCkgcmV0dXJuIGFzUmVjb3JkKGxvYWRlZCk/LmRlZmF1bHQgPz8gbG9hZGVkO1xuICBjb25zdCBzZWxlY3RlZCA9IGFzUmVjb3JkKGxvYWRlZCk/LltlbnRyeXBvaW50XTtcbiAgaWYgKHNlbGVjdGVkID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcihgbmF0aXZlIG1vZHVsZSBlbnRyeXBvaW50IG5vdCBmb3VuZDogJHtlbnRyeXBvaW50fWApO1xuICByZXR1cm4gc2VsZWN0ZWQ7XG59XG5cbmZ1bmN0aW9uIGFzc2VydEJyaWRnZUlkKHZhbHVlOiBzdHJpbmcsIGxhYmVsOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiIHx8ICEvXlthLXpBLVowLTkuXy1dKyQvLnRlc3QodmFsdWUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGAke2xhYmVsfSBtYXkgb25seSBjb250YWluIGxldHRlcnMsIG51bWJlcnMsIGRvdHMsIHVuZGVyc2NvcmVzLCBhbmQgZGFzaGVzYCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBtb2R1bGVLZXkodHdlYWtJZDogc3RyaW5nLCBtb2R1bGVJZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke3R3ZWFrSWR9OiR7bW9kdWxlSWR9YDtcbn1cblxuZnVuY3Rpb24gaW5zdGFuY2VLZXkodHdlYWtJZDogc3RyaW5nLCBpZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke3R3ZWFrSWR9OiR7aWR9YDtcbn1cblxuZnVuY3Rpb24gaGVscGVyS2V5KHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgJHt0d2Vha0lkfToke2lkfWA7XG59XG5cbmZ1bmN0aW9uIGFzUmVjb3JkKHZhbHVlOiB1bmtub3duKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsIHtcbiAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiA/IHZhbHVlIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IDogbnVsbDtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY2FsbE9wdGlvbmFsKHRhcmdldDogdW5rbm93biwgbWV0aG9kOiBzdHJpbmcsIGFyZ3M6IHVua25vd25bXSk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBmbiA9IGFzUmVjb3JkKHRhcmdldCk/LlttZXRob2RdO1xuICBpZiAodHlwZW9mIGZuID09PSBcImZ1bmN0aW9uXCIpIGF3YWl0IGZuLmFwcGx5KHRhcmdldCwgYXJncyk7XG59XG5cbmZ1bmN0aW9uIHBhcmVudFdpbmRvd1N0YXRlKHBhcmVudFdpbmRvdzogRWxlY3Ryb24uQnJvd3NlcldpbmRvdywgcmVhc29uOiBzdHJpbmcpOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IG51bGwge1xuICBpZiAoaXNXaW5kb3dEZXN0cm95ZWQocGFyZW50V2luZG93KSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGJvdW5kcyA9IGNhbGxXaW5kb3dNZXRob2Q8RWxlY3Ryb24uUmVjdGFuZ2xlPihwYXJlbnRXaW5kb3csIFwiZ2V0Qm91bmRzXCIpO1xuICBjb25zdCBjb250ZW50Qm91bmRzID0gY2FsbFdpbmRvd01ldGhvZDxFbGVjdHJvbi5SZWN0YW5nbGU+KHBhcmVudFdpbmRvdywgXCJnZXRDb250ZW50Qm91bmRzXCIpO1xuICByZXR1cm4ge1xuICAgIHJlYXNvbixcbiAgICB3aW5kb3dJZDogd2luZG93SWRGb3IocGFyZW50V2luZG93KSxcbiAgICB3ZWJDb250ZW50c0lkOiB3ZWJDb250ZW50c0lkRm9yKHBhcmVudFdpbmRvdyksXG4gICAgYm91bmRzLFxuICAgIGNvbnRlbnRCb3VuZHMsXG4gICAgdmlzaWJsZTogY2FsbFdpbmRvd01ldGhvZDxib29sZWFuPihwYXJlbnRXaW5kb3csIFwiaXNWaXNpYmxlXCIpID8/IG51bGwsXG4gICAgZm9jdXNlZDogY2FsbFdpbmRvd01ldGhvZDxib29sZWFuPihwYXJlbnRXaW5kb3csIFwiaXNGb2N1c2VkXCIpID8/IG51bGwsXG4gICAgbWluaW1pemVkOiBjYWxsV2luZG93TWV0aG9kPGJvb2xlYW4+KHBhcmVudFdpbmRvdywgXCJpc01pbmltaXplZFwiKSA/PyBudWxsLFxuICAgIG1heGltaXplZDogY2FsbFdpbmRvd01ldGhvZDxib29sZWFuPihwYXJlbnRXaW5kb3csIFwiaXNNYXhpbWl6ZWRcIikgPz8gbnVsbCxcbiAgICBmdWxsc2NyZWVuOiBjYWxsV2luZG93TWV0aG9kPGJvb2xlYW4+KHBhcmVudFdpbmRvdywgXCJpc0Z1bGxTY3JlZW5cIikgPz8gbnVsbCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gbmF0aXZlSGFuZGxlRm9yV2luZG93KHBhcmVudFdpbmRvdzogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGwgfCB1bmRlZmluZWQpOiBCdWZmZXIgfCBudWxsIHtcbiAgaWYgKCFwYXJlbnRXaW5kb3cgfHwgaXNXaW5kb3dEZXN0cm95ZWQocGFyZW50V2luZG93KSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGZuID0gYXNSZWNvcmQocGFyZW50V2luZG93KT8uZ2V0TmF0aXZlV2luZG93SGFuZGxlO1xuICBpZiAodHlwZW9mIGZuICE9PSBcImZ1bmN0aW9uXCIpIHJldHVybiBudWxsO1xuICB0cnkge1xuICAgIGNvbnN0IGhhbmRsZSA9IGZuLmNhbGwocGFyZW50V2luZG93KTtcbiAgICByZXR1cm4gQnVmZmVyLmlzQnVmZmVyKGhhbmRsZSkgPyBoYW5kbGUgOiBudWxsO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBjYW5CaW5kUGFyZW50V2luZG93KFxuICBwYXJlbnRXaW5kb3c6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsIHwgdW5kZWZpbmVkLFxuKTogcGFyZW50V2luZG93IGlzIEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cge1xuICBpZiAoIXBhcmVudFdpbmRvdyB8fCBpc1dpbmRvd0Rlc3Ryb3llZChwYXJlbnRXaW5kb3cpKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiB0eXBlb2YgYXNSZWNvcmQocGFyZW50V2luZG93KT8ub24gPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgIHR5cGVvZiBhc1JlY29yZChwYXJlbnRXaW5kb3cpPy5vZmYgPT09IFwiZnVuY3Rpb25cIjtcbn1cblxuZnVuY3Rpb24gaXNXaW5kb3dEZXN0cm95ZWQocGFyZW50V2luZG93OiBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbCB8IHVuZGVmaW5lZCk6IGJvb2xlYW4ge1xuICBjb25zdCBmbiA9IGFzUmVjb3JkKHBhcmVudFdpbmRvdyk/LmlzRGVzdHJveWVkO1xuICBpZiAodHlwZW9mIGZuICE9PSBcImZ1bmN0aW9uXCIpIHJldHVybiBmYWxzZTtcbiAgdHJ5IHtcbiAgICByZXR1cm4gQm9vbGVhbihmbi5jYWxsKHBhcmVudFdpbmRvdykpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuXG5mdW5jdGlvbiB3aW5kb3dJZEZvcihwYXJlbnRXaW5kb3c6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsIHwgdW5kZWZpbmVkKTogbnVtYmVyIHwgbnVsbCB7XG4gIGNvbnN0IGlkID0gYXNSZWNvcmQocGFyZW50V2luZG93KT8uaWQ7XG4gIHJldHVybiB0eXBlb2YgaWQgPT09IFwibnVtYmVyXCIgPyBpZCA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHdlYkNvbnRlbnRzSWRGb3IocGFyZW50V2luZG93OiBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbCB8IHVuZGVmaW5lZCk6IG51bWJlciB8IG51bGwge1xuICBjb25zdCB3ZWJDb250ZW50cyA9IGFzUmVjb3JkKGFzUmVjb3JkKHBhcmVudFdpbmRvdyk/LndlYkNvbnRlbnRzKTtcbiAgY29uc3QgaWQgPSB3ZWJDb250ZW50cz8uaWQ7XG4gIHJldHVybiB0eXBlb2YgaWQgPT09IFwibnVtYmVyXCIgPyBpZCA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIGNhbGxXaW5kb3dNZXRob2Q8VD4ocGFyZW50V2luZG93OiBFbGVjdHJvbi5Ccm93c2VyV2luZG93LCBtZXRob2Q6IHN0cmluZyk6IFQgfCBudWxsIHtcbiAgY29uc3QgZm4gPSBhc1JlY29yZChwYXJlbnRXaW5kb3cpPy5bbWV0aG9kXTtcbiAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm4gbnVsbDtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZm4uY2FsbChwYXJlbnRXaW5kb3cpIGFzIFQ7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG4iLCAiaW1wb3J0IHsgcmVhbHBhdGhTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGlzQWJzb2x1dGUsIHJlbGF0aXZlLCByZXNvbHZlIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZU5hdGl2ZVR3ZWFrUGF0aCh0d2Vha0Rpcjogc3RyaW5nLCBwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAodHlwZW9mIHBhdGggIT09IFwic3RyaW5nXCIgfHwgcGF0aC50cmltKCkgPT09IFwiXCIpIHRocm93IG5ldyBFcnJvcihcIm5hdGl2ZSBwYXRoIGlzIHJlcXVpcmVkXCIpO1xuICBjb25zdCByb290ID0gcmVhbHBhdGhTeW5jKHR3ZWFrRGlyKTtcbiAgY29uc3QgZnVsbCA9IHJlc29sdmUodHdlYWtEaXIsIHBhdGgpO1xuICBsZXQgdGFyZ2V0OiBzdHJpbmc7XG4gIHRyeSB7XG4gICAgdGFyZ2V0ID0gcmVhbHBhdGhTeW5jKGZ1bGwpO1xuICB9IGNhdGNoIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJuYXRpdmUgcGF0aCBkb2VzIG5vdCBleGlzdFwiKTtcbiAgfVxuICBpZiAoIWlzUGF0aEluc2lkZShyb290LCB0YXJnZXQpIHx8IHRhcmdldCA9PT0gcm9vdCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIm5hdGl2ZSBwYXRoIG11c3Qgc3RheSBpbnNpZGUgdGhlIHR3ZWFrIGRpcmVjdG9yeVwiKTtcbiAgfVxuICByZXR1cm4gdGFyZ2V0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNQYXRoSW5zaWRlKHBhcmVudDogc3RyaW5nLCB0YXJnZXQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBjb25zdCByZWwgPSByZWxhdGl2ZShyZXNvbHZlKHBhcmVudCksIHJlc29sdmUodGFyZ2V0KSk7XG4gIHJldHVybiByZWwgPT09IFwiXCIgfHwgKCEhcmVsICYmICFyZWwuc3RhcnRzV2l0aChcIi4uXCIpICYmICFpc0Fic29sdXRlKHJlbCkpO1xufVxuIiwgImltcG9ydCB0eXBlIHsgVHdlYWtNYW5pZmVzdCB9IGZyb20gXCJAY29kZXgtcGx1c3BsdXMvc2RrXCI7XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1RXRUFLX1NUT1JFX0lOREVYX1VSTCA9XG4gIFwiaHR0cHM6Ly9iLW5uZXR0LmdpdGh1Yi5pby9jb2RleC1wbHVzcGx1cy9zdG9yZS9pbmRleC5qc29uXCI7XG5leHBvcnQgY29uc3QgVFdFQUtfU1RPUkVfUkVWSUVXX0lTU1VFX1VSTCA9XG4gIFwiaHR0cHM6Ly9naXRodWIuY29tL2Itbm5ldHQvY29kZXgtcGx1c3BsdXMvaXNzdWVzL25ld1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFR3ZWFrU3RvcmVSZWdpc3RyeSB7XG4gIHNjaGVtYVZlcnNpb246IDE7XG4gIGdlbmVyYXRlZEF0Pzogc3RyaW5nO1xuICBlbnRyaWVzOiBUd2Vha1N0b3JlRW50cnlbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUd2Vha1N0b3JlRW50cnkge1xuICBpZDogc3RyaW5nO1xuICBtYW5pZmVzdDogVHdlYWtNYW5pZmVzdDtcbiAgcmVwbzogc3RyaW5nO1xuICBhcHByb3ZlZENvbW1pdFNoYTogc3RyaW5nO1xuICBhcHByb3ZlZEF0OiBzdHJpbmc7XG4gIGFwcHJvdmVkQnk6IHN0cmluZztcbiAgcGxhdGZvcm1zPzogVHdlYWtTdG9yZVBsYXRmb3JtW107XG4gIHJlbGVhc2VVcmw/OiBzdHJpbmc7XG4gIHJldmlld1VybD86IHN0cmluZztcbn1cblxuZXhwb3J0IHR5cGUgVHdlYWtTdG9yZVBsYXRmb3JtID0gXCJkYXJ3aW5cIiB8IFwid2luMzJcIiB8IFwibGludXhcIjtcblxuZXhwb3J0IGludGVyZmFjZSBUd2Vha1N0b3JlUHVibGlzaFN1Ym1pc3Npb24ge1xuICByZXBvOiBzdHJpbmc7XG4gIGRlZmF1bHRCcmFuY2g6IHN0cmluZztcbiAgY29tbWl0U2hhOiBzdHJpbmc7XG4gIGNvbW1pdFVybDogc3RyaW5nO1xuICBtYW5pZmVzdD86IHtcbiAgICBpZD86IHN0cmluZztcbiAgICBuYW1lPzogc3RyaW5nO1xuICAgIHZlcnNpb24/OiBzdHJpbmc7XG4gICAgZGVzY3JpcHRpb24/OiBzdHJpbmc7XG4gICAgaWNvblVybD86IHN0cmluZztcbiAgfTtcbn1cblxuY29uc3QgR0lUSFVCX1JFUE9fUkUgPSAvXltBLVphLXowLTlfLi1dK1xcL1tBLVphLXowLTlfLi1dKyQvO1xuY29uc3QgRlVMTF9TSEFfUkUgPSAvXlthLWYwLTldezQwfSQvaTtcblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZUdpdEh1YlJlcG8oaW5wdXQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHJhdyA9IGlucHV0LnRyaW0oKTtcbiAgaWYgKCFyYXcpIHRocm93IG5ldyBFcnJvcihcIkdpdEh1YiByZXBvIGlzIHJlcXVpcmVkXCIpO1xuXG4gIGNvbnN0IHNzaCA9IC9eZ2l0QGdpdGh1YlxcLmNvbTooW14vXStcXC9bXi9dKz8pKD86XFwuZ2l0KT8kL2kuZXhlYyhyYXcpO1xuICBpZiAoc3NoKSByZXR1cm4gbm9ybWFsaXplUmVwb1BhcnQoc3NoWzFdKTtcblxuICBpZiAoL15odHRwcz86XFwvXFwvL2kudGVzdChyYXcpKSB7XG4gICAgY29uc3QgdXJsID0gbmV3IFVSTChyYXcpO1xuICAgIGlmICh1cmwuaG9zdG5hbWUgIT09IFwiZ2l0aHViLmNvbVwiKSB0aHJvdyBuZXcgRXJyb3IoXCJPbmx5IGdpdGh1Yi5jb20gcmVwb3NpdG9yaWVzIGFyZSBzdXBwb3J0ZWRcIik7XG4gICAgY29uc3QgcGFydHMgPSB1cmwucGF0aG5hbWUucmVwbGFjZSgvXlxcLyt8XFwvKyQvZywgXCJcIikuc3BsaXQoXCIvXCIpO1xuICAgIGlmIChwYXJ0cy5sZW5ndGggPCAyKSB0aHJvdyBuZXcgRXJyb3IoXCJHaXRIdWIgcmVwbyBVUkwgbXVzdCBpbmNsdWRlIG93bmVyIGFuZCByZXBvc2l0b3J5XCIpO1xuICAgIHJldHVybiBub3JtYWxpemVSZXBvUGFydChgJHtwYXJ0c1swXX0vJHtwYXJ0c1sxXX1gKTtcbiAgfVxuXG4gIHJldHVybiBub3JtYWxpemVSZXBvUGFydChyYXcpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplU3RvcmVSZWdpc3RyeShpbnB1dDogdW5rbm93bik6IFR3ZWFrU3RvcmVSZWdpc3RyeSB7XG4gIGNvbnN0IHJlZ2lzdHJ5ID0gaW5wdXQgYXMgUGFydGlhbDxUd2Vha1N0b3JlUmVnaXN0cnk+IHwgbnVsbDtcbiAgaWYgKCFyZWdpc3RyeSB8fCByZWdpc3RyeS5zY2hlbWFWZXJzaW9uICE9PSAxIHx8ICFBcnJheS5pc0FycmF5KHJlZ2lzdHJ5LmVudHJpZXMpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiVW5zdXBwb3J0ZWQgdHdlYWsgc3RvcmUgcmVnaXN0cnlcIik7XG4gIH1cbiAgY29uc3QgZW50cmllcyA9IHJlZ2lzdHJ5LmVudHJpZXMubWFwKG5vcm1hbGl6ZVN0b3JlRW50cnkpO1xuICBlbnRyaWVzLnNvcnQoKGEsIGIpID0+IGEubWFuaWZlc3QubmFtZS5sb2NhbGVDb21wYXJlKGIubWFuaWZlc3QubmFtZSkpO1xuICByZXR1cm4ge1xuICAgIHNjaGVtYVZlcnNpb246IDEsXG4gICAgZ2VuZXJhdGVkQXQ6IHR5cGVvZiByZWdpc3RyeS5nZW5lcmF0ZWRBdCA9PT0gXCJzdHJpbmdcIiA/IHJlZ2lzdHJ5LmdlbmVyYXRlZEF0IDogdW5kZWZpbmVkLFxuICAgIGVudHJpZXMsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzaHVmZmxlU3RvcmVFbnRyaWVzPFQ+KFxuICBlbnRyaWVzOiByZWFkb25seSBUW10sXG4gIHJhbmRvbUluZGV4OiAoZXhjbHVzaXZlTWF4OiBudW1iZXIpID0+IG51bWJlciA9IChleGNsdXNpdmVNYXgpID0+IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGV4Y2x1c2l2ZU1heCksXG4pOiBUW10ge1xuICBjb25zdCBzaHVmZmxlZCA9IFsuLi5lbnRyaWVzXTtcbiAgZm9yIChsZXQgaSA9IHNodWZmbGVkLmxlbmd0aCAtIDE7IGkgPiAwOyBpIC09IDEpIHtcbiAgICBjb25zdCBqID0gcmFuZG9tSW5kZXgoaSArIDEpO1xuICAgIGlmICghTnVtYmVyLmlzSW50ZWdlcihqKSB8fCBqIDwgMCB8fCBqID4gaSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBzaHVmZmxlIHJhbmRvbUluZGV4IHJldHVybmVkICR7an07IGV4cGVjdGVkIGFuIGludGVnZXIgZnJvbSAwIHRvICR7aX1gKTtcbiAgICB9XG4gICAgW3NodWZmbGVkW2ldLCBzaHVmZmxlZFtqXV0gPSBbc2h1ZmZsZWRbal0sIHNodWZmbGVkW2ldXTtcbiAgfVxuICByZXR1cm4gc2h1ZmZsZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVTdG9yZUVudHJ5KGlucHV0OiB1bmtub3duKTogVHdlYWtTdG9yZUVudHJ5IHtcbiAgY29uc3QgZW50cnkgPSBpbnB1dCBhcyBQYXJ0aWFsPFR3ZWFrU3RvcmVFbnRyeT4gfCBudWxsO1xuICBpZiAoIWVudHJ5IHx8IHR5cGVvZiBlbnRyeSAhPT0gXCJvYmplY3RcIikgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCB0d2VhayBzdG9yZSBlbnRyeVwiKTtcbiAgY29uc3QgcmVwbyA9IG5vcm1hbGl6ZUdpdEh1YlJlcG8oU3RyaW5nKGVudHJ5LnJlcG8gPz8gZW50cnkubWFuaWZlc3Q/LmdpdGh1YlJlcG8gPz8gXCJcIikpO1xuICBjb25zdCBtYW5pZmVzdCA9IGVudHJ5Lm1hbmlmZXN0IGFzIFR3ZWFrTWFuaWZlc3QgfCB1bmRlZmluZWQ7XG4gIGlmICghbWFuaWZlc3Q/LmlkIHx8ICFtYW5pZmVzdC5uYW1lIHx8ICFtYW5pZmVzdC52ZXJzaW9uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBTdG9yZSBlbnRyeSBmb3IgJHtyZXBvfSBpcyBtaXNzaW5nIG1hbmlmZXN0IGZpZWxkc2ApO1xuICB9XG4gIGlmIChub3JtYWxpemVHaXRIdWJSZXBvKG1hbmlmZXN0LmdpdGh1YlJlcG8pICE9PSByZXBvKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBTdG9yZSBlbnRyeSAke21hbmlmZXN0LmlkfSByZXBvIGRvZXMgbm90IG1hdGNoIG1hbmlmZXN0IGdpdGh1YlJlcG9gKTtcbiAgfVxuICBpZiAoIWlzRnVsbENvbW1pdFNoYShTdHJpbmcoZW50cnkuYXBwcm92ZWRDb21taXRTaGEgPz8gXCJcIikpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBTdG9yZSBlbnRyeSAke21hbmlmZXN0LmlkfSBtdXN0IHBpbiBhIGZ1bGwgYXBwcm92ZWQgY29tbWl0IFNIQWApO1xuICB9XG4gIHJldHVybiB7XG4gICAgaWQ6IG1hbmlmZXN0LmlkLFxuICAgIG1hbmlmZXN0LFxuICAgIHJlcG8sXG4gICAgYXBwcm92ZWRDb21taXRTaGE6IFN0cmluZyhlbnRyeS5hcHByb3ZlZENvbW1pdFNoYSksXG4gICAgYXBwcm92ZWRBdDogdHlwZW9mIGVudHJ5LmFwcHJvdmVkQXQgPT09IFwic3RyaW5nXCIgPyBlbnRyeS5hcHByb3ZlZEF0IDogXCJcIixcbiAgICBhcHByb3ZlZEJ5OiB0eXBlb2YgZW50cnkuYXBwcm92ZWRCeSA9PT0gXCJzdHJpbmdcIiA/IGVudHJ5LmFwcHJvdmVkQnkgOiBcIlwiLFxuICAgIHBsYXRmb3Jtczogbm9ybWFsaXplU3RvcmVQbGF0Zm9ybXMoKGVudHJ5IGFzIHsgcGxhdGZvcm1zPzogdW5rbm93biB9KS5wbGF0Zm9ybXMpLFxuICAgIHJlbGVhc2VVcmw6IG9wdGlvbmFsR2l0aHViVXJsKGVudHJ5LnJlbGVhc2VVcmwpLFxuICAgIHJldmlld1VybDogb3B0aW9uYWxHaXRodWJVcmwoZW50cnkucmV2aWV3VXJsKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0b3JlQXJjaGl2ZVVybChlbnRyeTogVHdlYWtTdG9yZUVudHJ5KTogc3RyaW5nIHtcbiAgaWYgKCFpc0Z1bGxDb21taXRTaGEoZW50cnkuYXBwcm92ZWRDb21taXRTaGEpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBTdG9yZSBlbnRyeSAke2VudHJ5LmlkfSBpcyBub3QgcGlubmVkIHRvIGEgZnVsbCBjb21taXQgU0hBYCk7XG4gIH1cbiAgcmV0dXJuIGBodHRwczovL2NvZGVsb2FkLmdpdGh1Yi5jb20vJHtlbnRyeS5yZXBvfS90YXIuZ3ovJHtlbnRyeS5hcHByb3ZlZENvbW1pdFNoYX1gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRUd2Vha1B1Ymxpc2hJc3N1ZVVybChzdWJtaXNzaW9uOiBUd2Vha1N0b3JlUHVibGlzaFN1Ym1pc3Npb24pOiBzdHJpbmcge1xuICBjb25zdCByZXBvID0gbm9ybWFsaXplR2l0SHViUmVwbyhzdWJtaXNzaW9uLnJlcG8pO1xuICBpZiAoIWlzRnVsbENvbW1pdFNoYShzdWJtaXNzaW9uLmNvbW1pdFNoYSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJTdWJtaXNzaW9uIG11c3QgaW5jbHVkZSB0aGUgZnVsbCBjb21taXQgU0hBIHRvIHJldmlld1wiKTtcbiAgfVxuICBjb25zdCB0aXRsZSA9IGBUd2VhayBzdG9yZSByZXZpZXc6ICR7cmVwb31gO1xuICBjb25zdCBib2R5ID0gW1xuICAgIFwiIyMgVHdlYWsgcmVwb1wiLFxuICAgIGBodHRwczovL2dpdGh1Yi5jb20vJHtyZXBvfWAsXG4gICAgXCJcIixcbiAgICBcIiMjIENvbW1pdCB0byByZXZpZXdcIixcbiAgICBzdWJtaXNzaW9uLmNvbW1pdFNoYSxcbiAgICBzdWJtaXNzaW9uLmNvbW1pdFVybCxcbiAgICBcIlwiLFxuICAgIFwiRG8gbm90IGFwcHJvdmUgYSBkaWZmZXJlbnQgY29tbWl0LiBJZiB0aGUgYXV0aG9yIHB1c2hlcyBjaGFuZ2VzLCBhc2sgdGhlbSB0byByZXN1Ym1pdC5cIixcbiAgICBcIlwiLFxuICAgIFwiIyMgTWFuaWZlc3RcIixcbiAgICBgLSBpZDogJHtzdWJtaXNzaW9uLm1hbmlmZXN0Py5pZCA/PyBcIihub3QgZGV0ZWN0ZWQpXCJ9YCxcbiAgICBgLSBuYW1lOiAke3N1Ym1pc3Npb24ubWFuaWZlc3Q/Lm5hbWUgPz8gXCIobm90IGRldGVjdGVkKVwifWAsXG4gICAgYC0gdmVyc2lvbjogJHtzdWJtaXNzaW9uLm1hbmlmZXN0Py52ZXJzaW9uID8/IFwiKG5vdCBkZXRlY3RlZClcIn1gLFxuICAgIGAtIGRlc2NyaXB0aW9uOiAke3N1Ym1pc3Npb24ubWFuaWZlc3Q/LmRlc2NyaXB0aW9uID8/IFwiKG5vdCBkZXRlY3RlZClcIn1gLFxuICAgIGAtIGljb25Vcmw6ICR7c3VibWlzc2lvbi5tYW5pZmVzdD8uaWNvblVybCA/PyBcIihub3QgZGV0ZWN0ZWQpXCJ9YCxcbiAgICBcIlwiLFxuICAgIFwiIyMgQWRtaW4gY2hlY2tsaXN0XCIsXG4gICAgXCItIFsgXSBtYW5pZmVzdC5qc29uIGlzIHZhbGlkXCIsXG4gICAgXCItIFsgXSBtYW5pZmVzdC5pY29uVXJsIGlzIHVzYWJsZSBhcyB0aGUgc3RvcmUgaWNvblwiLFxuICAgIFwiLSBbIF0gc291cmNlIHdhcyByZXZpZXdlZCBhdCB0aGUgZXhhY3QgY29tbWl0IGFib3ZlXCIsXG4gICAgXCItIFsgXSBgc3RvcmUvaW5kZXguanNvbmAgZW50cnkgcGlucyBgYXBwcm92ZWRDb21taXRTaGFgIHRvIHRoZSBleGFjdCBjb21taXQgYWJvdmVcIixcbiAgXS5qb2luKFwiXFxuXCIpO1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKFRXRUFLX1NUT1JFX1JFVklFV19JU1NVRV9VUkwpO1xuICB1cmwuc2VhcmNoUGFyYW1zLnNldChcInRlbXBsYXRlXCIsIFwidHdlYWstc3RvcmUtcmV2aWV3Lm1kXCIpO1xuICB1cmwuc2VhcmNoUGFyYW1zLnNldChcInRpdGxlXCIsIHRpdGxlKTtcbiAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoXCJib2R5XCIsIGJvZHkpO1xuICByZXR1cm4gdXJsLnRvU3RyaW5nKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0Z1bGxDb21taXRTaGEodmFsdWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gRlVMTF9TSEFfUkUudGVzdCh2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVJlcG9QYXJ0KHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCByZXBvID0gdmFsdWUudHJpbSgpLnJlcGxhY2UoL1xcLmdpdCQvaSwgXCJcIikucmVwbGFjZSgvXlxcLyt8XFwvKyQvZywgXCJcIik7XG4gIGlmICghR0lUSFVCX1JFUE9fUkUudGVzdChyZXBvKSkgdGhyb3cgbmV3IEVycm9yKFwiR2l0SHViIHJlcG8gbXVzdCBiZSBpbiBvd25lci9yZXBvIGZvcm1cIik7XG4gIHJldHVybiByZXBvO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVTdG9yZVBsYXRmb3JtcyhpbnB1dDogdW5rbm93bik6IFR3ZWFrU3RvcmVQbGF0Zm9ybVtdIHwgdW5kZWZpbmVkIHtcbiAgaWYgKGlucHV0ID09PSB1bmRlZmluZWQpIHJldHVybiB1bmRlZmluZWQ7XG4gIGlmICghQXJyYXkuaXNBcnJheShpbnB1dCkpIHRocm93IG5ldyBFcnJvcihcIlN0b3JlIGVudHJ5IHBsYXRmb3JtcyBtdXN0IGJlIGFuIGFycmF5XCIpO1xuICBjb25zdCBhbGxvd2VkID0gbmV3IFNldDxUd2Vha1N0b3JlUGxhdGZvcm0+KFtcImRhcndpblwiLCBcIndpbjMyXCIsIFwibGludXhcIl0pO1xuICBjb25zdCBwbGF0Zm9ybXMgPSBBcnJheS5mcm9tKG5ldyBTZXQoaW5wdXQubWFwKCh2YWx1ZSkgPT4ge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09IFwic3RyaW5nXCIgfHwgIWFsbG93ZWQuaGFzKHZhbHVlIGFzIFR3ZWFrU3RvcmVQbGF0Zm9ybSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgc3RvcmUgcGxhdGZvcm06ICR7U3RyaW5nKHZhbHVlKX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlIGFzIFR3ZWFrU3RvcmVQbGF0Zm9ybTtcbiAgfSkpKTtcbiAgcmV0dXJuIHBsYXRmb3Jtcy5sZW5ndGggPiAwID8gcGxhdGZvcm1zIDogdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBvcHRpb25hbEdpdGh1YlVybCh2YWx1ZTogdW5rbm93bik6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09IFwic3RyaW5nXCIgfHwgIXZhbHVlLnRyaW0oKSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgY29uc3QgdXJsID0gbmV3IFVSTCh2YWx1ZSk7XG4gIGlmICh1cmwucHJvdG9jb2wgIT09IFwiaHR0cHM6XCIgfHwgdXJsLmhvc3RuYW1lICE9PSBcImdpdGh1Yi5jb21cIikgcmV0dXJuIHVuZGVmaW5lZDtcbiAgcmV0dXJuIHVybC50b1N0cmluZygpO1xufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQVNBLElBQUFBLG1CQUFpRztBQUNqRyxJQUFBQyxrQkFBcUk7QUFDckksSUFBQUMsNkJBQStDO0FBQy9DLElBQUFDLHNCQUFrRDtBQUNsRCxJQUFBQyxvQkFBNkQ7QUFDN0QsSUFBQUMsa0JBQWdDOzs7QUNiaEMsSUFBQUMsYUFBK0I7QUFDL0IsSUFBQUMsbUJBQThCO0FBQzlCLG9CQUE2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STtBQUFBLEVBQzdCO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU07QUFBQSxFQUFLO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFZO0FBQUEsRUFBVztBQUFBLEVBQVM7QUFBQSxFQUNyRjtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBWTtBQUFBLEVBQU07QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU07QUFBQSxFQUMxRTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBTTtBQUFBLEVBQU87QUFBQSxFQUFNO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFDeEQ7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFTO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUN2RjtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQVk7QUFBQSxFQUFPO0FBQUEsRUFDckY7QUFBQSxFQUFTO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUN2QjtBQUFBLEVBQWE7QUFBQSxFQUFhO0FBQUEsRUFBYTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUNwRTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBVztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUMxRTtBQUFBLEVBQU07QUFBQSxFQUFNO0FBQUEsRUFBTztBQUFBLEVBQVc7QUFBQSxFQUFNO0FBQUEsRUFDcEM7QUFBQSxFQUFRO0FBQUEsRUFBUTtBQUFBLEVBQVE7QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQzVEO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQ25EO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFDMUM7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUNyRjtBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBUztBQUFBLEVBQ3hCO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUN0QztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBVztBQUFBLEVBQ3pCO0FBQUEsRUFBSztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUN0RDtBQUFBLEVBQVM7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDL0U7QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQ2Y7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQ2pGO0FBQUEsRUFDQTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFB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LEdBQUcsR0FBRztBQUMzQixNQUFJLE9BQU8sT0FBTyxXQUFZO0FBQzlCLEtBQUcsS0FBSyxLQUFLLE9BQU8sUUFBUTtBQUM1QixPQUFLLGdCQUFnQixLQUFLLE1BQU07QUFDOUIsUUFBSSxPQUFPLFFBQVEsV0FBWSxLQUFJLEtBQUssS0FBSyxPQUFPLFFBQVE7QUFBQSxRQUN2RCxrQkFBaUIsS0FBSyxrQkFBa0IsQ0FBQyxPQUFPLFFBQVEsQ0FBQztBQUFBLEVBQ2hFLENBQUM7QUFDSDtBQUVBLFNBQVNDLGdCQUFlLE9BQWUsT0FBdUI7QUFDNUQsTUFBSSxPQUFPLFVBQVUsWUFBWSxDQUFDLG9CQUFvQixLQUFLLEtBQUssR0FBRztBQUNqRSxVQUFNLElBQUksTUFBTSxHQUFHLEtBQUssbUVBQW1FO0FBQUEsRUFDN0Y7QUFDQSxTQUFPO0FBQ1Q7QUFFQSxTQUFTLGFBQWEsUUFBa0M7QUFDdEQsUUFBTSxTQUFTLENBQUMsUUFBUSxHQUFHLFFBQVEsR0FBRyxRQUFRLE9BQU8sUUFBUSxNQUFNO0FBQ25FLE1BQUksQ0FBQyxPQUFPLE1BQU0sQ0FBQyxVQUFVLE9BQU8sVUFBVSxZQUFZLE9BQU8sU0FBUyxLQUFLLENBQUMsR0FBRztBQUNqRixVQUFNLElBQUksTUFBTSw0REFBNEQ7QUFBQSxFQUM5RTtBQUNBLE1BQUksT0FBTyxRQUFRLEtBQUssT0FBTyxTQUFTLEdBQUc7QUFDekMsVUFBTSxJQUFJLE1BQU0sOENBQThDO0FBQUEsRUFDaEU7QUFDRjsiLAogICJuYW1lcyI6IFsiaW1wb3J0X2VsZWN0cm9uIiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX2NoaWxkX3Byb2Nlc3MiLCAiaW1wb3J0X25vZGVfY3J5cHRvIiwgImltcG9ydF9ub2RlX3BhdGgiLCAiaW1wb3J0X25vZGVfb3MiLCAiaW1wb3J0X2ZzIiwgImltcG9ydF9wcm9taXNlcyIsICJzeXNQYXRoIiwgInByZXNvbHZlIiwgImJhc2VuYW1lIiwgInBqb2luIiwgInByZWxhdGl2ZSIsICJwc2VwIiwgImltcG9ydF9wcm9taXNlcyIsICJvc1R5cGUiLCAiZnNfd2F0Y2giLCAicmF3RW1pdHRlciIsICJsaXN0ZW5lciIsICJiYXNlbmFtZSIsICJkaXJuYW1lIiwgIm5ld1N0YXRzIiwgImNsb3NlciIsICJmc3JlYWxwYXRoIiwgInJlc29sdmUiLCAicmVhbHBhdGgiLCAic3RhdHMiLCAicmVsYXRpdmUiLCAiRE9VQkxFX1NMQVNIX1JFIiwgInRlc3RTdHJpbmciLCAicGF0aCIsICJzdGF0cyIsICJzdGF0Y2IiLCAibm93IiwgInN0YXQiLCAiaW1wb3J0X25vZGVfcGF0aCIsICJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9wYXRoIiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX3BhdGgiLCAiaW1wb3J0X25vZGVfZnMiLCAiaW1wb3J0X25vZGVfcGF0aCIsICJ1c2VyUm9vdCIsICJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9wYXRoIiwgImltcG9ydF9lbGVjdHJvbiIsICJpbXBvcnRfbm9kZV9jaGlsZF9wcm9jZXNzIiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX3BhdGgiLCAibG9nIiwgImV4cG9ydHMiLCAiYXNSZWNvcmQiLCAicmVzb2x2ZSIsICJ3ZWJDb250ZW50cyIsICJpc1BhdGhJbnNpZGUiLCAiZXhwb3J0cyIsICJpbmZlck1hY0FwcFJvb3QiLCAicGxhdGZvcm0iLCAic3RhdCIsICJhc1JlY29yZCIsICJhc3NlcnRCcmlkZ2VJZCIsICJpc1dpbmRvd0Rlc3Ryb3llZCIsICJ3aW5kb3dJZEZvciJdCn0K
