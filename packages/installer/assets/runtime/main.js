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

// cgl-p3/packages/runtime/src/main.ts
var import_electron6 = require("electron");
var import_node_fs17 = require("node:fs");
var import_node_path14 = require("node:path");

// cgl-p3/node_modules/chokidar/esm/index.js
var import_fs2 = require("fs");
var import_promises3 = require("fs/promises");
var import_events = require("events");
var sysPath2 = __toESM(require("path"), 1);

// cgl-p3/node_modules/readdirp/esm/index.js
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

// cgl-p3/node_modules/chokidar/esm/handler.js
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
    return new Promise((resolve9, reject) => {
      if (!stream)
        return reject();
      stream.once(STR_END, () => {
        if (this.fsw.closed) {
          stream = void 0;
          return;
        }
        const wasThrottled = throttler ? throttler.clear() : false;
        resolve9(void 0);
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

// cgl-p3/node_modules/chokidar/esm/index.js
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

// cgl-p3/packages/runtime/src/logging.ts
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

// cgl-p3/packages/runtime/src/codex-runtime-probe.ts
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

// cgl-p3/packages/runtime/src/watcher-health.ts
var import_node_child_process = require("node:child_process");
var import_node_fs3 = require("node:fs");
var import_node_os = require("node:os");
var import_node_path3 = require("node:path");

// cgl-p3/packages/runtime/src/ipc-guard.ts
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

// cgl-p3/packages/runtime/src/watcher-health.ts
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

// cgl-p3/packages/runtime/src/tweak-lifecycle.ts
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

// cgl-p3/packages/runtime/src/browser-ui.ts
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
    return new Promise((resolve9, reject) => {
      const timer = setTimeout(() => {
        bridgeRequests.delete(id);
        reject(new Error(`Timed out waiting for browser UI bridge method: ${method}`));
      }, 15e3);
      bridgeRequests.set(id, { resolve: resolve9, reject, timer });
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
  return new Promise((resolve9, reject) => {
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
        resolve9(null);
        return;
      }
      try {
        resolve9(JSON.parse(raw));
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
  return new Promise((resolve9) => setTimeout(resolve9, ms));
}

// cgl-p3/packages/runtime/src/native-paths.ts
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

// cgl-p3/packages/runtime/src/runtime-paths.ts
var import_node_fs6 = require("node:fs");
var import_node_os2 = require("node:os");
var import_node_path6 = require("node:path");

// cgl-p3/packages/runtime/src/tweak-store.ts
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

// cgl-p3/packages/runtime/src/runtime-paths.ts
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

// cgl-p3/packages/runtime/src/config-state.ts
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

// cgl-p3/packages/runtime/src/store-install.ts
var import_node_fs8 = require("node:fs");
var import_node_child_process2 = require("node:child_process");
var import_node_crypto3 = require("node:crypto");
var import_node_path7 = require("node:path");
var import_node_os3 = require("node:os");

// cgl-p3/packages/runtime/src/tweak-store-integrity.ts
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

// cgl-p3/packages/runtime/src/store-install.ts
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

// cgl-p3/packages/runtime/src/main.ts
var import_node_crypto6 = require("node:crypto");

// cgl-p3/packages/runtime/src/self-update.ts
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

// cgl-p3/packages/runtime/src/owl-views.ts
var import_electron3 = require("electron");
var import_node_fs10 = require("node:fs");
var import_node_crypto4 = require("node:crypto");

// cgl-p3/packages/runtime/src/codex-windows.ts
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

// cgl-p3/packages/runtime/src/owl-views.ts
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

// cgl-p3/packages/runtime/src/tweak-main-host.ts
var import_electron5 = require("electron");
var import_node_fs16 = require("node:fs");
var import_node_path13 = require("node:path");

// cgl-p3/packages/runtime/src/tweak-discovery.ts
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

// cgl-p3/packages/runtime/src/storage.ts
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

// cgl-p3/packages/runtime/src/mcp-sync.ts
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

// cgl-p3/packages/runtime/src/native-bridge.ts
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
    return await new Promise((resolve9, reject) => {
      const timer = setTimeout(() => {
        helper.pending.delete(requestId);
        reject(new Error(`native helper request timed out: ${tweakId}:${id}`));
      }, timeoutMs);
      helper.pending.set(requestId, { resolve: resolve9, reject, timer });
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

// cgl-p3/packages/runtime/src/tweak-permissions.ts
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
function hasTweakPermission(manifest, permission) {
  if (!hasExplicitPermissions(manifest)) return true;
  const wanted = normalizePermission(permission);
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
    nativeHelper: hasTweakPermission(manifest, "native-helper")
  };
}
function hasAnyCodexApi(surface) {
  return surface.codexRuntime || surface.codexWindows || surface.codexViews || surface.codexCdp || surface.nativeModule || surface.nativeView || surface.nativeHelper;
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

// cgl-p3/packages/runtime/src/tweak-fs-sandbox.ts
var import_node_fs15 = require("node:fs");
var import_node_path12 = require("node:path");
function tweakDataDir(userRoot2, tweakId) {
  assertValidTweakId(tweakId);
  return (0, import_node_path12.join)(userRoot2, "tweak-data", tweakId);
}
function ensureTweakDataDir(userRoot2, tweakId) {
  const dir = tweakDataDir(userRoot2, tweakId);
  (0, import_node_fs15.mkdirSync)(dir, { recursive: true });
  return dir;
}
function resolveTweakDataPath(userRoot2, tweakId, relPath) {
  const dir = tweakDataDir(userRoot2, tweakId);
  const full = (0, import_node_path12.resolve)(dir, relPath);
  if (!isPathInside(dir, full) || full === dir) throw new Error("path traversal");
  return { dir, full };
}

// cgl-p3/packages/runtime/src/tweak-main-host.ts
var UPDATE_CHECK_INTERVAL_MS2 = 24 * 60 * 60 * 1e3;
var tweakState = {
  discovered: [],
  loadedMain: /* @__PURE__ */ new Map()
};
var nativeBridge = new NativeBridge(log, {
  nativeHostPath: (0, import_node_path13.join)(runtimeDir, "native", "codexpp_native_host.node")
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
    return (0, import_node_fs16.realpathSync)(filePath);
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
    entryExists: (0, import_node_fs16.existsSync)(t.entry),
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
    createWindow: surface.codexWindows ? guard("codex-windows", createCodexWindow) : deny("codex-windows")
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

// cgl-p3/packages/runtime/src/main.ts
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
  const filePath = kind === "guest" && (0, import_node_fs17.existsSync)(GUEST_PRELOAD_PATH) ? GUEST_PRELOAD_PATH : PRELOAD_PATH;
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
  const cli = (0, import_node_path14.join)(sourceRoot, "packages", "installer", "dist", "cli.js");
  if (!(0, import_node_fs17.existsSync)(cli)) {
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
  const resolved = (0, import_node_path14.resolve)(entryPath);
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
    const dir = (0, import_node_path14.resolve)(tweakDir);
    if (!isPathInside(TWEAKS_DIR, dir)) {
      throw new Error("tweakDir outside tweaks dir");
    }
    const full = (0, import_node_path14.resolve)(dir, relPath);
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
    appendCappedLog((0, import_node_path14.join)(LOG_DIR, "preload.log"), `[${(/* @__PURE__ */ new Date()).toISOString()}] [${lvl}] ${msg}
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL21haW4udHMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2Nob2tpZGFyL2VzbS9pbmRleC5qcyIsICIuLi8uLi8uLi9ub2RlX21vZHVsZXMvcmVhZGRpcnAvZXNtL2luZGV4LmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9jaG9raWRhci9lc20vaGFuZGxlci5qcyIsICIuLi9zcmMvbG9nZ2luZy50cyIsICIuLi9zcmMvY29kZXgtcnVudGltZS1wcm9iZS50cyIsICIuLi9zcmMvd2F0Y2hlci1oZWFsdGgudHMiLCAiLi4vc3JjL2lwYy1ndWFyZC50cyIsICIuLi9zcmMvdHdlYWstbGlmZWN5Y2xlLnRzIiwgIi4uL3NyYy9icm93c2VyLXVpLnRzIiwgIi4uL3NyYy9uYXRpdmUtcGF0aHMudHMiLCAiLi4vc3JjL3J1bnRpbWUtcGF0aHMudHMiLCAiLi4vc3JjL3R3ZWFrLXN0b3JlLnRzIiwgIi4uL3NyYy9jb25maWctc3RhdGUudHMiLCAiLi4vc3JjL3N0b3JlLWluc3RhbGwudHMiLCAiLi4vc3JjL3R3ZWFrLXN0b3JlLWludGVncml0eS50cyIsICIuLi9zcmMvc2VsZi11cGRhdGUudHMiLCAiLi4vc3JjL293bC12aWV3cy50cyIsICIuLi9zcmMvY29kZXgtd2luZG93cy50cyIsICIuLi9zcmMvdHdlYWstbWFpbi1ob3N0LnRzIiwgIi4uL3NyYy90d2Vhay1kaXNjb3ZlcnkudHMiLCAiLi4vc3JjL3N0b3JhZ2UudHMiLCAiLi4vc3JjL21jcC1zeW5jLnRzIiwgIi4uL3NyYy9uYXRpdmUtYnJpZGdlLnRzIiwgIi4uL3NyYy90d2Vhay1wZXJtaXNzaW9ucy50cyIsICIuLi9zcmMvdHdlYWstZnMtc2FuZGJveC50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBNYWluLXByb2Nlc3MgYm9vdHN0cmFwLiBMb2FkZWQgYnkgdGhlIGFzYXIgbG9hZGVyIGJlZm9yZSBDb2RleCdzIG93blxuICogbWFpbiBwcm9jZXNzIGNvZGUgcnVucy4gV2UgaG9vayBgQnJvd3NlcldpbmRvd2Agc28gZXZlcnkgd2luZG93IENvZGV4XG4gKiBjcmVhdGVzIGdldHMgb3VyIHByZWxvYWQgc2NyaXB0IGF0dGFjaGVkLiBXZSBhbHNvIHN0YW5kIHVwIGFuIElQQ1xuICogY2hhbm5lbCBmb3IgdHdlYWtzIHRvIHRhbGsgdG8gdGhlIG1haW4gcHJvY2Vzcy5cbiAqXG4gKiBXZSBhcmUgaW4gQ0pTIGxhbmQgaGVyZSAobWF0Y2hlcyBFbGVjdHJvbidzIG1haW4gcHJvY2VzcyBhbmQgQ29kZXgncyBvd25cbiAqIGNvZGUpLiBUaGUgcmVuZGVyZXItc2lkZSBydW50aW1lIGlzIGJ1bmRsZWQgc2VwYXJhdGVseSBpbnRvIHByZWxvYWQuanMuXG4gKi9cblxuaW1wb3J0IHsgYXBwLCBjbGlwYm9hcmQsIGlwY01haW4sIHNlc3Npb24sIHNoZWxsIH0gZnJvbSBcImVsZWN0cm9uXCI7XG5pbXBvcnQgeyBleGlzdHNTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGpvaW4sIHJlc29sdmUgfSBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgY2hva2lkYXIgZnJvbSBcImNob2tpZGFyXCI7XG5pbXBvcnQgeyBhcHBlbmRDYXBwZWRMb2cgfSBmcm9tIFwiLi9sb2dnaW5nXCI7XG5pbXBvcnQgeyBnZXRDZHBTdGF0dXMsIGxpc3RDZHBUYXJnZXRzLCBzZWxlY3RQcmVsb2FkUmVnaXN0cmF0aW9uIH0gZnJvbSBcIi4vY29kZXgtcnVudGltZS1wcm9iZVwiO1xuaW1wb3J0IHsgZ2V0V2F0Y2hlckhlYWx0aCB9IGZyb20gXCIuL3dhdGNoZXItaGVhbHRoXCI7XG5pbXBvcnQge1xuICByZWxvYWRUd2Vha3MsXG4gIHNldFR3ZWFrRW5hYmxlZEFuZFJlbG9hZCxcbn0gZnJvbSBcIi4vdHdlYWstbGlmZWN5Y2xlXCI7XG5pbXBvcnQge1xuICBhc3NlcnRQcml2aWxlZ2VkSXBjU2VuZGVyLFxuICBpc0xheWVyQXV0b1VwZGF0ZUVuYWJsZWQsXG4gIGlzUHJpdmlsZWdlZElwY1NlbmRlcixcbiAgc3RyaXBSZW5kZXJlclVwZGF0ZVJlcG8sXG59IGZyb20gXCIuL2lwYy1ndWFyZFwiO1xuaW1wb3J0IHsgbWF5YmVTdGFydEJyb3dzZXJVaVNlcnZlciB9IGZyb20gXCIuL2Jyb3dzZXItdWlcIjtcbmltcG9ydCB7IGlzUGF0aEluc2lkZSB9IGZyb20gXCIuL25hdGl2ZS1wYXRoc1wiO1xuaW1wb3J0IHtcbiAgQ09ERVhfUExVU1BMVVNfUkVQTyxcbiAgQ09ERVhfUExVU1BMVVNfVkVSU0lPTixcbiAgR1VFU1RfUFJFTE9BRF9QQVRILFxuICBMT0dfRElSLFxuICBQUkVMT0FEX1BBVEgsXG4gIFRXRUFLU19ESVIsXG4gIFRXRUFLX1NUT1JFX0lOREVYX1VSTCxcbiAgbG9nLFxuICBydW50aW1lRGlyLFxuICB1c2VyUm9vdCxcbn0gZnJvbSBcIi4vcnVudGltZS1wYXRoc1wiO1xuaW1wb3J0IHtcbiAgaXNDb2RleFBsdXNQbHVzQXV0b1VwZGF0ZUVuYWJsZWQsXG4gIGlzQ29kZXhQbHVzUGx1c1NhZmVNb2RlRW5hYmxlZCxcbiAgaXNUd2Vha0VuYWJsZWQsXG4gIHJlYWRJbnN0YWxsZXJTdGF0ZSxcbiAgcmVhZFNlbGZVcGRhdGVTdGF0ZSxcbiAgcmVhZFN0YXRlLFxuICBzZXRDb2RleFBsdXNQbHVzQXV0b1VwZGF0ZSxcbiAgc2V0Q29kZXhQbHVzUGx1c1VwZGF0ZUNvbmZpZyxcbiAgdHlwZSBTZWxmVXBkYXRlQ2hhbm5lbCxcbn0gZnJvbSBcIi4vY29uZmlnLXN0YXRlXCI7XG5pbXBvcnQge1xuICBhc3NlcnRTdG9yZUVudHJ5UGxhdGZvcm1Db21wYXRpYmxlLFxuICBhc3NlcnRTdG9yZUVudHJ5UnVudGltZUNvbXBhdGlibGUsXG4gIGZldGNoVHdlYWtTdG9yZVJlZ2lzdHJ5LFxuICBpbnN0YWxsU3RvcmVUd2VhayxcbiAgcHJlcGFyZVR3ZWFrU3RvcmVTdWJtaXNzaW9uLFxuICBzdG9yZUVudHJ5UGxhdGZvcm1Db21wYXRpYmlsaXR5LFxuICBzdG9yZUVudHJ5UnVudGltZUNvbXBhdGliaWxpdHksXG59IGZyb20gXCIuL3N0b3JlLWluc3RhbGxcIjtcbmltcG9ydCB7IHNodWZmbGVTdG9yZUVudHJpZXMgfSBmcm9tIFwiLi90d2Vhay1zdG9yZVwiO1xuaW1wb3J0IHsgcmFuZG9tSW50IH0gZnJvbSBcIm5vZGU6Y3J5cHRvXCI7XG5pbXBvcnQge1xuICBkZXNjcmliZUluc3RhbGxhdGlvblNvdXJjZSxcbiAgZW5zdXJlQ29kZXhQbHVzUGx1c1VwZGF0ZUNoZWNrLFxuICBmYWxsYmFja1NvdXJjZVJvb3QsXG4gIGluc3RhbGxTcGFya2xlVXBkYXRlSG9vayxcbiAgbWFya1NlbGZVcGRhdGVTdGFydGVkLFxuICBzdGFydEluc3RhbGxlZENsaSxcbn0gZnJvbSBcIi4vc2VsZi11cGRhdGVcIjtcbmltcG9ydCB7XG4gIGNhbGxPd2xWaWV3LFxuICBjcmVhdGVPd2xWaWV3LFxuICBkaXNwb3NlQWxsT3dsVmlld3MsXG4gIGRpc3Bvc2VPd2xWaWV3c0ZvclR3ZWFrLFxuICB1bnRydXN0ZWRXZWJDb250ZW50c0lkcyxcbn0gZnJvbSBcIi4vb3dsLXZpZXdzXCI7XG5pbXBvcnQge1xuICBjcmVhdGVDb2RleFdpbmRvdyxcbiAgZm9jdXNDb2RleFdpbmRvdyxcbiAgZ2V0Q29kZXhXaW5kb3dTZXJ2aWNlcyxcbiAgZ2V0UHJpbWFyeUNvZGV4V2luZG93UmVmLFxuICBzaG93Q29kZXhXaW5kb3csXG4gIHR5cGUgQ29kZXhDcmVhdGVXaW5kb3dPcHRpb25zLFxufSBmcm9tIFwiLi9jb2RleC13aW5kb3dzXCI7XG5pbXBvcnQge1xuICBhc3NlcnRBdXRob3JpemVkVHdlYWssXG4gIGFzc2VydFR3ZWFrSWQsXG4gIGN1cnJlbnRSdW50aW1lQ2FwYWJpbGl0aWVzLFxuICBjdXJyZW50UnVudGltZUluZm8sXG4gIGVuc3VyZVR3ZWFrVXBkYXRlQ2hlY2ssXG4gIGluc3RhbGxHaXRodWJSZWxlYXNlVHdlYWssXG4gIGxpc3RlZFR3ZWFrc1NuYXBzaG90LFxuICBsb2FkQWxsTWFpblR3ZWFrcyxcbiAgbmF0aXZlQnJpZGdlLFxuICBzdG9wQWxsTWFpblR3ZWFrcyxcbiAgdHdlYWtDb250ZXh0LFxuICB0d2Vha0xpZmVjeWNsZURlcHMsXG4gIHR3ZWFrU3RhdGUsXG59IGZyb20gXCIuL3R3ZWFrLW1haW4taG9zdFwiO1xuaW1wb3J0IHsgZW5zdXJlVHdlYWtEYXRhRGlyLCByZXNvbHZlVHdlYWtEYXRhUGF0aCB9IGZyb20gXCIuL3R3ZWFrLWZzLXNhbmRib3hcIjtcbmltcG9ydCB0eXBlIHtcbiAgQ29kZXhWaWV3Q3JlYXRlT3B0aW9ucyxcbiAgTmF0aXZlSGVscGVyTGF1bmNoT3B0aW9ucyxcbiAgTmF0aXZlTW9kdWxlTG9hZE9wdGlvbnMsXG4gIE5hdGl2ZVBhbmVsQ3JlYXRlT3B0aW9ucyxcbiAgTmF0aXZlVmlld0F0dGFjaE9wdGlvbnMsXG59IGZyb20gXCJAY29kZXgtcGx1c3BsdXMvc2RrXCI7XG5cbi8vIE9wdGlvbmFsOiBlbmFibGUgQ2hyb21lIERldlRvb2xzIFByb3RvY29sIG9uIGEgVENQIHBvcnQgc28gd2UgY2FuIGRyaXZlIHRoZVxuLy8gcnVubmluZyBDb2RleCBmcm9tIG91dHNpZGUgKGN1cmwgaHR0cDovL2xvY2FsaG9zdDo8cG9ydD4vanNvbiwgYXR0YWNoIHZpYVxuLy8gQ0RQIFdlYlNvY2tldCwgdGFrZSBzY3JlZW5zaG90cywgZXZhbHVhdGUgaW4gcmVuZGVyZXIsIGV0Yy4pLiBDb2RleCdzXG4vLyBwcm9kdWN0aW9uIGJ1aWxkIHNldHMgd2ViUHJlZmVyZW5jZXMuZGV2VG9vbHM9ZmFsc2UsIHdoaWNoIGtpbGxzIHRoZVxuLy8gaW4td2luZG93IERldlRvb2xzIHNob3J0Y3V0LCBidXQgYC0tcmVtb3RlLWRlYnVnZ2luZy1wb3J0YCB3b3JrcyByZWdhcmRsZXNzXG4vLyBiZWNhdXNlIGl0J3MgYSBDaHJvbWl1bSBjb21tYW5kLWxpbmUgc3dpdGNoIHByb2Nlc3NlZCBiZWZvcmUgYXBwIGluaXQuXG4vL1xuLy8gT2ZmIGJ5IGRlZmF1bHQuIFNldCBDT0RFWFBQX1JFTU9URV9ERUJVRz0xIChvcHRpb25hbGx5IENPREVYUFBfUkVNT1RFX0RFQlVHX1BPUlQpXG4vLyB0byB0dXJuIGl0IG9uLiBNdXN0IGJlIGFwcGVuZGVkIGJlZm9yZSBgYXBwYCBiZWNvbWVzIHJlYWR5OyB3ZSdyZSBhdCBtb2R1bGVcbi8vIHRvcC1sZXZlbCBzbyB0aGF0J3MgZmluZS5cbmlmIChwcm9jZXNzLmVudi5DT0RFWFBQX1JFTU9URV9ERUJVRyA9PT0gXCIxXCIpIHtcbiAgY29uc3QgcG9ydCA9IHByb2Nlc3MuZW52LkNPREVYUFBfUkVNT1RFX0RFQlVHX1BPUlQgPz8gXCI5MjIyXCI7XG4gIGFwcC5jb21tYW5kTGluZS5hcHBlbmRTd2l0Y2goXCJyZW1vdGUtZGVidWdnaW5nLXBvcnRcIiwgcG9ydCk7XG4gIGxvZyhcImluZm9cIiwgYHJlbW90ZSBkZWJ1Z2dpbmcgZW5hYmxlZCBvbiBwb3J0ICR7cG9ydH1gKTtcbn1cblxuLy8gU3VyZmFjZSB1bmhhbmRsZWQgZXJyb3JzIGZyb20gYW55d2hlcmUgaW4gdGhlIG1haW4gcHJvY2VzcyB0byBvdXIgbG9nLlxucHJvY2Vzcy5vbihcInVuY2F1Z2h0RXhjZXB0aW9uXCIsIChlOiBFcnJvciAmIHsgY29kZT86IHN0cmluZyB9KSA9PiB7XG4gIGxvZyhcImVycm9yXCIsIFwidW5jYXVnaHRFeGNlcHRpb25cIiwgeyBjb2RlOiBlLmNvZGUsIG1lc3NhZ2U6IGUubWVzc2FnZSwgc3RhY2s6IGUuc3RhY2sgfSk7XG59KTtcbnByb2Nlc3Mub24oXCJ1bmhhbmRsZWRSZWplY3Rpb25cIiwgKGUpID0+IHtcbiAgbG9nKFwiZXJyb3JcIiwgXCJ1bmhhbmRsZWRSZWplY3Rpb25cIiwgeyB2YWx1ZTogU3RyaW5nKGUpIH0pO1xufSk7XG5cbmluc3RhbGxTcGFya2xlVXBkYXRlSG9vaygpO1xuXG4vLyAxLiBIb29rIGV2ZXJ5IHNlc3Npb24gc28gb3VyIHByZWxvYWQgcnVucyBpbiBldmVyeSByZW5kZXJlci5cbi8vXG4vLyBXZSB1c2UgRWxlY3Ryb24ncyBtb2Rlcm4gYHNlc3Npb24ucmVnaXN0ZXJQcmVsb2FkU2NyaXB0YCBBUEkgKGFkZGVkIGluXG4vLyBFbGVjdHJvbiAzNSkuIFRoZSBkZXByZWNhdGVkIGBzZXRQcmVsb2Fkc2AgcGF0aCBzaWxlbnRseSBuby1vcHMgaW4gc29tZVxuLy8gY29uZmlndXJhdGlvbnMgKG5vdGFibHkgd2l0aCBzYW5kYm94ZWQgcmVuZGVyZXJzKSwgc28gcmVnaXN0ZXJQcmVsb2FkU2NyaXB0XG4vLyBpcyB0aGUgb25seSByZWxpYWJsZSB3YXkgdG8gaW5qZWN0IGludG8gQ29kZXgncyBCcm93c2VyV2luZG93cy5cbmZ1bmN0aW9uIHJlZ2lzdGVyUHJlbG9hZChzOiBFbGVjdHJvbi5TZXNzaW9uLCBsYWJlbDogc3RyaW5nLCBraW5kOiBcImZ1bGxcIiB8IFwiZ3Vlc3RcIiA9IFwiZnVsbFwiKTogdm9pZCB7XG4gIGNvbnN0IGZpbGVQYXRoID0ga2luZCA9PT0gXCJndWVzdFwiICYmIGV4aXN0c1N5bmMoR1VFU1RfUFJFTE9BRF9QQVRIKSA/IEdVRVNUX1BSRUxPQURfUEFUSCA6IFBSRUxPQURfUEFUSDtcbiAgY29uc3QgaWQgPSBraW5kID09PSBcImd1ZXN0XCIgPyBcImNvZGV4LXBsdXNwbHVzLWd1ZXN0XCIgOiBcImNvZGV4LXBsdXNwbHVzXCI7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3RyYXRlZ3kgPSBzZWxlY3RQcmVsb2FkUmVnaXN0cmF0aW9uKHMpO1xuICAgIGlmIChzdHJhdGVneSA9PT0gXCJyZWdpc3RlclByZWxvYWRTY3JpcHRcIikge1xuICAgICAgY29uc3QgcmVnID0gKHMgYXMgdW5rbm93biBhcyB7XG4gICAgICAgIHJlZ2lzdGVyUHJlbG9hZFNjcmlwdDogKG9wdHM6IHtcbiAgICAgICAgICB0eXBlPzogXCJmcmFtZVwiIHwgXCJzZXJ2aWNlLXdvcmtlclwiO1xuICAgICAgICAgIGlkPzogc3RyaW5nO1xuICAgICAgICAgIGZpbGVQYXRoOiBzdHJpbmc7XG4gICAgICAgIH0pID0+IHN0cmluZztcbiAgICAgIH0pLnJlZ2lzdGVyUHJlbG9hZFNjcmlwdDtcbiAgICAgIHJlZy5jYWxsKHMsIHsgdHlwZTogXCJmcmFtZVwiLCBmaWxlUGF0aCwgaWQgfSk7XG4gICAgICBsb2coXCJpbmZvXCIsIGBwcmVsb2FkIHJlZ2lzdGVyZWQgKHJlZ2lzdGVyUHJlbG9hZFNjcmlwdCkgb24gJHtsYWJlbH06YCwgZmlsZVBhdGgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoc3RyYXRlZ3kgPT09IFwic2V0UHJlbG9hZHNcIikge1xuICAgICAgY29uc3QgZXhpc3RpbmcgPSBzLmdldFByZWxvYWRzKCk7XG4gICAgICBpZiAoIWV4aXN0aW5nLmluY2x1ZGVzKGZpbGVQYXRoKSkge1xuICAgICAgICBzLnNldFByZWxvYWRzKFsuLi5leGlzdGluZywgZmlsZVBhdGhdKTtcbiAgICAgIH1cbiAgICAgIGxvZyhcImluZm9cIiwgYHByZWxvYWQgcmVnaXN0ZXJlZCAoc2V0UHJlbG9hZHMpIG9uICR7bGFiZWx9OmAsIGZpbGVQYXRoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbG9nKFwiZXJyb3JcIiwgYHByZWxvYWQgcmVnaXN0cmF0aW9uIG9uICR7bGFiZWx9IGZhaWxlZDogbm8gc2Vzc2lvbiBwcmVsb2FkIEFQSWApO1xuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKGUgaW5zdGFuY2VvZiBFcnJvciAmJiBlLm1lc3NhZ2UuaW5jbHVkZXMoXCJleGlzdGluZyBJRFwiKSkge1xuICAgICAgbG9nKFwiaW5mb1wiLCBgcHJlbG9hZCBhbHJlYWR5IHJlZ2lzdGVyZWQgb24gJHtsYWJlbH06YCwgUFJFTE9BRF9QQVRIKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbG9nKFwiZXJyb3JcIiwgYHByZWxvYWQgcmVnaXN0cmF0aW9uIG9uICR7bGFiZWx9IGZhaWxlZDpgLCBlKTtcbiAgfVxufVxuXG5hcHAud2hlblJlYWR5KCkudGhlbigoKSA9PiB7XG4gIGxvZyhcImluZm9cIiwgXCJhcHAgcmVhZHkgZmlyZWRcIik7XG4gIGlmIChpc0NvZGV4UGx1c1BsdXNTYWZlTW9kZUVuYWJsZWQoKSkge1xuICAgIGxvZyhcIndhcm5cIiwgXCJzYWZlIG1vZGUgaXMgZW5hYmxlZDsgcHJlbG9hZCB3aWxsIG5vdCBiZSByZWdpc3RlcmVkXCIpO1xuICAgIHJldHVybjtcbiAgfVxuICByZWdpc3RlclByZWxvYWQoc2Vzc2lvbi5kZWZhdWx0U2Vzc2lvbiwgXCJkZWZhdWx0U2Vzc2lvblwiLCBcImZ1bGxcIik7XG4gIG1heWJlU3RhcnRCcm93c2VyVWlTZXJ2ZXIoe1xuICAgIGdldFdpbmRvd1NlcnZpY2VzOiBnZXRDb2RleFdpbmRvd1NlcnZpY2VzLFxuICAgIGxvZyxcbiAgfSk7XG59KTtcblxuYXBwLm9uKFwic2Vzc2lvbi1jcmVhdGVkXCIsIChzKSA9PiB7XG4gIGlmIChpc0NvZGV4UGx1c1BsdXNTYWZlTW9kZUVuYWJsZWQoKSkgcmV0dXJuO1xuICBpZiAocyA9PT0gc2Vzc2lvbi5kZWZhdWx0U2Vzc2lvbikgcmV0dXJuO1xuICByZWdpc3RlclByZWxvYWQocywgXCJzZXNzaW9uLWNyZWF0ZWRcIiwgXCJndWVzdFwiKTtcbn0pO1xuXG4vLyBESUFHTk9TVElDOiBsb2cgZXZlcnkgd2ViQ29udGVudHMgY3JlYXRpb24uIFVzZWZ1bCBmb3IgdmVyaWZ5aW5nIG91clxuLy8gcHJlbG9hZCByZWFjaGVzIGV2ZXJ5IHJlbmRlcmVyIENvZGV4IHNwYXducy5cbmFwcC5vbihcIndlYi1jb250ZW50cy1jcmVhdGVkXCIsIChfZSwgd2MpID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCB3cCA9ICh3YyBhcyB1bmtub3duIGFzIHsgZ2V0TGFzdFdlYlByZWZlcmVuY2VzPzogKCkgPT4gUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfSlcbiAgICAgIC5nZXRMYXN0V2ViUHJlZmVyZW5jZXM/LigpO1xuICAgIGxvZyhcImluZm9cIiwgXCJ3ZWItY29udGVudHMtY3JlYXRlZFwiLCB7XG4gICAgICBpZDogd2MuaWQsXG4gICAgICB0eXBlOiB3Yy5nZXRUeXBlKCksXG4gICAgICBzZXNzaW9uSXNEZWZhdWx0OiB3Yy5zZXNzaW9uID09PSBzZXNzaW9uLmRlZmF1bHRTZXNzaW9uLFxuICAgICAgc2FuZGJveDogd3A/LnNhbmRib3gsXG4gICAgICBjb250ZXh0SXNvbGF0aW9uOiB3cD8uY29udGV4dElzb2xhdGlvbixcbiAgICB9KTtcbiAgICB3Yy5vbihcInByZWxvYWQtZXJyb3JcIiwgKF9ldiwgcCwgZXJyKSA9PiB7XG4gICAgICBsb2coXCJlcnJvclwiLCBgd2MgJHt3Yy5pZH0gcHJlbG9hZC1lcnJvciBwYXRoPSR7cH1gLCBTdHJpbmcoZXJyPy5zdGFjayA/PyBlcnIpKTtcbiAgICB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZyhcImVycm9yXCIsIFwid2ViLWNvbnRlbnRzLWNyZWF0ZWQgaGFuZGxlciBmYWlsZWQ6XCIsIFN0cmluZygoZSBhcyBFcnJvcik/LnN0YWNrID8/IGUpKTtcbiAgfVxufSk7XG5cbmxvZyhcImluZm9cIiwgXCJtYWluLnRzIGV2YWx1YXRlZDsgYXBwLmlzUmVhZHk9XCIgKyBhcHAuaXNSZWFkeSgpKTtcbmlmIChpc0NvZGV4UGx1c1BsdXNTYWZlTW9kZUVuYWJsZWQoKSkge1xuICBsb2coXCJ3YXJuXCIsIFwic2FmZSBtb2RlIGlzIGVuYWJsZWQ7IHR3ZWFrcyB3aWxsIG5vdCBiZSBsb2FkZWRcIik7XG59XG5cbi8vIDIuIEluaXRpYWwgdHdlYWsgZGlzY292ZXJ5ICsgbWFpbi1zY29wZSBsb2FkLlxubG9hZEFsbE1haW5Ud2Vha3MoKTtcblxuYXBwLm9uKFwid2lsbC1xdWl0XCIsICgpID0+IHtcbiAgc3RvcEFsbE1haW5Ud2Vha3MoKTtcbiAgbmF0aXZlQnJpZGdlLmRpc3Bvc2VBbGwoKTtcbiAgZGlzcG9zZUFsbE93bFZpZXdzKCk7XG4gIC8vIEJlc3QtZWZmb3J0IGZsdXNoIG9mIGFueSBwZW5kaW5nIHN0b3JhZ2Ugd3JpdGVzLlxuICBmb3IgKGNvbnN0IHQgb2YgdHdlYWtTdGF0ZS5sb2FkZWRNYWluLnZhbHVlcygpKSB7XG4gICAgdHJ5IHtcbiAgICAgIHQuc3RvcmFnZS5mbHVzaCgpO1xuICAgIH0gY2F0Y2gge31cbiAgfVxufSk7XG5cbmZ1bmN0aW9uIHByaXZpbGVnZWRIYW5kbGUoY2hhbm5lbDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IGFueVtdKSA9PiB1bmtub3duKTogdm9pZCB7XG4gIGlwY01haW4uaGFuZGxlKGNoYW5uZWwsIChldmVudCwgLi4uYXJncykgPT4ge1xuICAgIGFzc2VydFByaXZpbGVnZWRJcGNTZW5kZXIoY2hhbm5lbCwgZXZlbnQuc2VuZGVyLCB1bnRydXN0ZWRXZWJDb250ZW50c0lkcyk7XG4gICAgcmV0dXJuIGxpc3RlbmVyKGV2ZW50LCAuLi5hcmdzKTtcbiAgfSk7XG59XG5cbmlwY01haW4ub24oXCJjb2RleHBwOnByaXZpbGVnZWQtZnJhbWVcIiwgKGV2ZW50KSA9PiB7XG4gIGV2ZW50LnJldHVyblZhbHVlID0gaXNQcml2aWxlZ2VkSXBjU2VuZGVyKGV2ZW50LnNlbmRlciwgdW50cnVzdGVkV2ViQ29udGVudHNJZHMpO1xufSk7XG5cbi8vIDMuIElQQzogZXhwb3NlIHR3ZWFrIG1ldGFkYXRhICsgcmV2ZWFsLWluLWZpbmRlci5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpsaXN0LXR3ZWFrc1wiLCBhc3luYyAoX2UsIG9wdHM/OiB7IGZvcmNlPzogYm9vbGVhbiB9IHwgYm9vbGVhbikgPT4ge1xuICBjb25zdCBmb3JjZSA9IG9wdHMgPT09IHRydWUgfHwgKG9wdHMgIT09IG51bGwgJiYgdHlwZW9mIG9wdHMgPT09IFwib2JqZWN0XCIgJiYgb3B0cy5mb3JjZSA9PT0gdHJ1ZSk7XG4gIGF3YWl0IFByb21pc2UuYWxsKHR3ZWFrU3RhdGUuZGlzY292ZXJlZC5tYXAoKHQpID0+IGVuc3VyZVR3ZWFrVXBkYXRlQ2hlY2sodCwgZm9yY2UpKSk7XG4gIHJldHVybiBsaXN0ZWRUd2Vha3NTbmFwc2hvdCgpO1xufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpnZXQtdHdlYWstZW5hYmxlZFwiLCAoX2UsIGlkOiBzdHJpbmcpID0+IGlzVHdlYWtFbmFibGVkKGlkKSk7XG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6c2V0LXR3ZWFrLWVuYWJsZWRcIiwgKF9lLCBpZDogc3RyaW5nLCBlbmFibGVkOiBib29sZWFuKSA9PiB7XG4gIHJldHVybiBzZXRUd2Vha0VuYWJsZWRBbmRSZWxvYWQoaWQsIGVuYWJsZWQsIHR3ZWFrTGlmZWN5Y2xlRGVwcyk7XG59KTtcblxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmdldC1jb25maWdcIiwgKCkgPT4ge1xuICBjb25zdCBzID0gcmVhZFN0YXRlKCk7XG4gIGNvbnN0IGluc3RhbGxlclN0YXRlID0gcmVhZEluc3RhbGxlclN0YXRlKCk7XG4gIGNvbnN0IHNvdXJjZVJvb3QgPSBpbnN0YWxsZXJTdGF0ZT8uc291cmNlUm9vdCA/PyBmYWxsYmFja1NvdXJjZVJvb3QoKTtcbiAgcmV0dXJuIHtcbiAgICB2ZXJzaW9uOiBDT0RFWF9QTFVTUExVU19WRVJTSU9OLFxuICAgIGF1dG9VcGRhdGU6IGlzTGF5ZXJBdXRvVXBkYXRlRW5hYmxlZChzLmNvZGV4UGx1c1BsdXM/LmF1dG9VcGRhdGUpLFxuICAgIHNhZmVNb2RlOiBzLmNvZGV4UGx1c1BsdXM/LnNhZmVNb2RlID09PSB0cnVlLFxuICAgIHVwZGF0ZUNoYW5uZWw6IHMuY29kZXhQbHVzUGx1cz8udXBkYXRlQ2hhbm5lbCA/PyBcInN0YWJsZVwiLFxuICAgIHVwZGF0ZVJlcG86IHMuY29kZXhQbHVzUGx1cz8udXBkYXRlUmVwbyA/PyBDT0RFWF9QTFVTUExVU19SRVBPLFxuICAgIHVwZGF0ZVJlZjogcy5jb2RleFBsdXNQbHVzPy51cGRhdGVSZWYgPz8gXCJcIixcbiAgICB1cGRhdGVDaGVjazogcy5jb2RleFBsdXNQbHVzPy51cGRhdGVDaGVjayA/PyBudWxsLFxuICAgIHNlbGZVcGRhdGU6IHJlYWRTZWxmVXBkYXRlU3RhdGUoKSxcbiAgICBpbnN0YWxsYXRpb25Tb3VyY2U6IGRlc2NyaWJlSW5zdGFsbGF0aW9uU291cmNlKHNvdXJjZVJvb3QpLFxuICB9O1xufSk7XG5cbnByaXZpbGVnZWRIYW5kbGUoXCJjb2RleHBwOnNldC1hdXRvLXVwZGF0ZVwiLCAoX2UsIGVuYWJsZWQ6IGJvb2xlYW4pID0+IHtcbiAgc2V0Q29kZXhQbHVzUGx1c0F1dG9VcGRhdGUoISFlbmFibGVkKTtcbiAgcmV0dXJuIHsgYXV0b1VwZGF0ZTogaXNDb2RleFBsdXNQbHVzQXV0b1VwZGF0ZUVuYWJsZWQoKSB9O1xufSk7XG5cbnByaXZpbGVnZWRIYW5kbGUoXCJjb2RleHBwOnNldC11cGRhdGUtY29uZmlnXCIsIChfZSwgY29uZmlnOiB7XG4gIHVwZGF0ZUNoYW5uZWw/OiBTZWxmVXBkYXRlQ2hhbm5lbDtcbiAgdXBkYXRlUmVwbz86IHN0cmluZztcbiAgdXBkYXRlUmVmPzogc3RyaW5nO1xufSkgPT4ge1xuICBzZXRDb2RleFBsdXNQbHVzVXBkYXRlQ29uZmlnKHN0cmlwUmVuZGVyZXJVcGRhdGVSZXBvKGNvbmZpZyA/PyB7fSkpO1xuICBjb25zdCBzID0gcmVhZFN0YXRlKCk7XG4gIHJldHVybiB7XG4gICAgdXBkYXRlQ2hhbm5lbDogcy5jb2RleFBsdXNQbHVzPy51cGRhdGVDaGFubmVsID8/IFwic3RhYmxlXCIsXG4gICAgdXBkYXRlUmVwbzogcy5jb2RleFBsdXNQbHVzPy51cGRhdGVSZXBvID8/IENPREVYX1BMVVNQTFVTX1JFUE8sXG4gICAgdXBkYXRlUmVmOiBzLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZVJlZiA/PyBcIlwiLFxuICB9O1xufSk7XG5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpjaGVjay1jb2RleHBwLXVwZGF0ZVwiLCBhc3luYyAoX2UsIGZvcmNlPzogYm9vbGVhbikgPT4ge1xuICByZXR1cm4gZW5zdXJlQ29kZXhQbHVzUGx1c1VwZGF0ZUNoZWNrKGZvcmNlID09PSB0cnVlKTtcbn0pO1xuXG5wcml2aWxlZ2VkSGFuZGxlKFwiY29kZXhwcDpydW4tY29kZXhwcC11cGRhdGVcIiwgYXN5bmMgKCkgPT4ge1xuICBjb25zdCBzb3VyY2VSb290ID0gcmVhZEluc3RhbGxlclN0YXRlKCk/LnNvdXJjZVJvb3QgPz8gZmFsbGJhY2tTb3VyY2VSb290KCk7XG4gIGlmICghc291cmNlUm9vdCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNvZGV4Kysgc291cmNlIENMSSB3YXMgbm90IGZvdW5kLiBSdW4gdGhlIGluc3RhbGxlciBvbmNlLCB0aGVuIHRyeSBhZ2Fpbi5cIik7XG4gIH1cbiAgY29uc3QgY2xpID0gam9pbihzb3VyY2VSb290LCBcInBhY2thZ2VzXCIsIFwiaW5zdGFsbGVyXCIsIFwiZGlzdFwiLCBcImNsaS5qc1wiKTtcbiAgaWYgKCFleGlzdHNTeW5jKGNsaSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb2RleCsrIHNvdXJjZSBDTEkgd2FzIG5vdCBmb3VuZC4gUnVuIHRoZSBpbnN0YWxsZXIgb25jZSwgdGhlbiB0cnkgYWdhaW4uXCIpO1xuICB9XG4gIGNvbnN0IHBlbmRpbmcgPSBtYXJrU2VsZlVwZGF0ZVN0YXJ0ZWQoc291cmNlUm9vdCk7XG4gIHN0YXJ0SW5zdGFsbGVkQ2xpKGNsaSwgW1widXBkYXRlXCIsIFwiLS13YXRjaGVyXCJdKTtcbiAgcmV0dXJuIHBlbmRpbmc7XG59KTtcblxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmdldC13YXRjaGVyLWhlYWx0aFwiLCAoKSA9PiBnZXRXYXRjaGVySGVhbHRoKHVzZXJSb290ISkpO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Z2V0LXR3ZWFrLXN0b3JlXCIsIGFzeW5jICgpID0+IHtcbiAgY29uc3Qgc3RvcmUgPSBhd2FpdCBmZXRjaFR3ZWFrU3RvcmVSZWdpc3RyeSgpO1xuICBjb25zdCByZWdpc3RyeSA9IHN0b3JlLnJlZ2lzdHJ5O1xuICBjb25zdCBpbnN0YWxsZWQgPSBuZXcgTWFwKHR3ZWFrU3RhdGUuZGlzY292ZXJlZC5tYXAoKHQpID0+IFt0Lm1hbmlmZXN0LmlkLCB0XSkpO1xuICBjb25zdCBlbnRyaWVzID0gc2h1ZmZsZVN0b3JlRW50cmllcyhyZWdpc3RyeS5lbnRyaWVzLCByYW5kb21JbnQpO1xuICByZXR1cm4ge1xuICAgIC4uLnJlZ2lzdHJ5LFxuICAgIHNvdXJjZVVybDogVFdFQUtfU1RPUkVfSU5ERVhfVVJMLFxuICAgIGZldGNoZWRBdDogc3RvcmUuZmV0Y2hlZEF0LFxuICAgIGVudHJpZXM6IGVudHJpZXMubWFwKChlbnRyeSkgPT4ge1xuICAgICAgY29uc3QgbG9jYWwgPSBpbnN0YWxsZWQuZ2V0KGVudHJ5LmlkKTtcbiAgICAgIGNvbnN0IHBsYXRmb3JtID0gc3RvcmVFbnRyeVBsYXRmb3JtQ29tcGF0aWJpbGl0eShlbnRyeSk7XG4gICAgICBjb25zdCBydW50aW1lID0gc3RvcmVFbnRyeVJ1bnRpbWVDb21wYXRpYmlsaXR5KGVudHJ5KTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIC4uLmVudHJ5LFxuICAgICAgICBwbGF0Zm9ybSxcbiAgICAgICAgcnVudGltZSxcbiAgICAgICAgaW5zdGFsbGVkOiBsb2NhbFxuICAgICAgICAgID8ge1xuICAgICAgICAgICAgICB2ZXJzaW9uOiBsb2NhbC5tYW5pZmVzdC52ZXJzaW9uLFxuICAgICAgICAgICAgICBlbmFibGVkOiBpc1R3ZWFrRW5hYmxlZChsb2NhbC5tYW5pZmVzdC5pZCksXG4gICAgICAgICAgICB9XG4gICAgICAgICAgOiBudWxsLFxuICAgICAgfTtcbiAgICB9KSxcbiAgfTtcbn0pO1xuXG5wcml2aWxlZ2VkSGFuZGxlKFwiY29kZXhwcDppbnN0YWxsLXN0b3JlLXR3ZWFrXCIsIGFzeW5jIChfZSwgaWQ6IHN0cmluZykgPT4ge1xuICBjb25zdCB7IHJlZ2lzdHJ5IH0gPSBhd2FpdCBmZXRjaFR3ZWFrU3RvcmVSZWdpc3RyeSgpO1xuICBjb25zdCBlbnRyeSA9IHJlZ2lzdHJ5LmVudHJpZXMuZmluZCgoY2FuZGlkYXRlKSA9PiBjYW5kaWRhdGUuaWQgPT09IGlkKTtcbiAgaWYgKCFlbnRyeSkgdGhyb3cgbmV3IEVycm9yKGBUd2VhayBzdG9yZSBlbnRyeSBub3QgZm91bmQ6ICR7aWR9YCk7XG4gIGFzc2VydFN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGlibGUoZW50cnkpO1xuICBhc3NlcnRTdG9yZUVudHJ5UnVudGltZUNvbXBhdGlibGUoZW50cnkpO1xuICBhd2FpdCBpbnN0YWxsU3RvcmVUd2VhayhlbnRyeSk7XG4gIHJlbG9hZFR3ZWFrcyhcInN0b3JlLWluc3RhbGxcIiwgdHdlYWtMaWZlY3ljbGVEZXBzKTtcbiAgcmV0dXJuIHsgaW5zdGFsbGVkOiBlbnRyeS5pZCB9O1xufSk7XG5cbnByaXZpbGVnZWRIYW5kbGUoXCJjb2RleHBwOmluc3RhbGwtZ2l0aHViLXR3ZWFrXCIsIGFzeW5jIChfZSwgaWQ6IHN0cmluZykgPT4ge1xuICByZXR1cm4gaW5zdGFsbEdpdGh1YlJlbGVhc2VUd2VhayhpZCk7XG59KTtcblxucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6cHJlcGFyZS10d2Vhay1zdG9yZS1zdWJtaXNzaW9uXCIsIGFzeW5jIChfZSwgcmVwb0lucHV0OiBzdHJpbmcpID0+IHtcbiAgcmV0dXJuIHByZXBhcmVUd2Vha1N0b3JlU3VibWlzc2lvbihyZXBvSW5wdXQpO1xufSk7XG5cbi8vIFNhbmRib3hlZCByZW5kZXJlciBwcmVsb2FkIGNhbid0IHVzZSBOb2RlIGZzIHRvIHJlYWQgdHdlYWsgc291cmNlLiBNYWluXG4vLyByZWFkcyBpdCBvbiB0aGUgcmVuZGVyZXIncyBiZWhhbGYuIFBhdGggbXVzdCBsaXZlIHVuZGVyIHR3ZWFrc0RpciBmb3Jcbi8vIHNlY3VyaXR5IFx1MjAxNCB3ZSByZWZ1c2UgYW55dGhpbmcgZWxzZS5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpyZWFkLXR3ZWFrLXNvdXJjZVwiLCAoX2UsIGVudHJ5UGF0aDogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IHJlc29sdmVkID0gcmVzb2x2ZShlbnRyeVBhdGgpO1xuICBpZiAoIWlzUGF0aEluc2lkZShUV0VBS1NfRElSLCByZXNvbHZlZCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJwYXRoIG91dHNpZGUgdHdlYWtzIGRpclwiKTtcbiAgfVxuICByZXR1cm4gcmVxdWlyZShcIm5vZGU6ZnNcIikucmVhZEZpbGVTeW5jKHJlc29sdmVkLCBcInV0ZjhcIik7XG59KTtcblxuLyoqXG4gKiBSZWFkIGFuIGFyYml0cmFyeSBhc3NldCBmaWxlIGZyb20gaW5zaWRlIGEgdHdlYWsncyBkaXJlY3RvcnkgYW5kIHJldHVybiBpdFxuICogYXMgYSBgZGF0YTpgIFVSTC4gVXNlZCBieSB0aGUgc2V0dGluZ3MgaW5qZWN0b3IgdG8gcmVuZGVyIG1hbmlmZXN0IGljb25zXG4gKiAodGhlIHJlbmRlcmVyIGlzIHNhbmRib3hlZDsgYGZpbGU6Ly9gIHdvbid0IGxvYWQpLlxuICpcbiAqIFNlY3VyaXR5OiBjYWxsZXIgcGFzc2VzIGB0d2Vha0RpcmAgYW5kIGByZWxQYXRoYDsgd2UgKDEpIHJlcXVpcmUgdHdlYWtEaXJcbiAqIHRvIGxpdmUgdW5kZXIgVFdFQUtTX0RJUiwgKDIpIHJlc29sdmUgcmVsUGF0aCBhZ2FpbnN0IGl0IGFuZCByZS1jaGVjayB0aGVcbiAqIHJlc3VsdCBzdGlsbCBsaXZlcyB1bmRlciBUV0VBS1NfRElSLCAoMykgY2FwIG91dHB1dCBzaXplIGF0IDEgTWlCLlxuICovXG5jb25zdCBBU1NFVF9NQVhfQllURVMgPSAxMDI0ICogMTAyNDtcbmNvbnN0IE1JTUVfQllfRVhUOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICBcIi5wbmdcIjogXCJpbWFnZS9wbmdcIixcbiAgXCIuanBnXCI6IFwiaW1hZ2UvanBlZ1wiLFxuICBcIi5qcGVnXCI6IFwiaW1hZ2UvanBlZ1wiLFxuICBcIi5naWZcIjogXCJpbWFnZS9naWZcIixcbiAgXCIud2VicFwiOiBcImltYWdlL3dlYnBcIixcbiAgXCIuc3ZnXCI6IFwiaW1hZ2Uvc3ZnK3htbFwiLFxuICBcIi5pY29cIjogXCJpbWFnZS94LWljb25cIixcbn07XG5pcGNNYWluLmhhbmRsZShcbiAgXCJjb2RleHBwOnJlYWQtdHdlYWstYXNzZXRcIixcbiAgKF9lLCB0d2Vha0Rpcjogc3RyaW5nLCByZWxQYXRoOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBmcyA9IHJlcXVpcmUoXCJub2RlOmZzXCIpIGFzIHR5cGVvZiBpbXBvcnQoXCJub2RlOmZzXCIpO1xuICAgIGNvbnN0IGRpciA9IHJlc29sdmUodHdlYWtEaXIpO1xuICAgIGlmICghaXNQYXRoSW5zaWRlKFRXRUFLU19ESVIsIGRpcikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcInR3ZWFrRGlyIG91dHNpZGUgdHdlYWtzIGRpclwiKTtcbiAgICB9XG4gICAgY29uc3QgZnVsbCA9IHJlc29sdmUoZGlyLCByZWxQYXRoKTtcbiAgICBpZiAoIWlzUGF0aEluc2lkZShkaXIsIGZ1bGwpIHx8IGZ1bGwgPT09IGRpcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwicGF0aCB0cmF2ZXJzYWxcIik7XG4gICAgfVxuICAgIGNvbnN0IHN0YXQgPSBmcy5zdGF0U3luYyhmdWxsKTtcbiAgICBpZiAoc3RhdC5zaXplID4gQVNTRVRfTUFYX0JZVEVTKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGFzc2V0IHRvbyBsYXJnZSAoJHtzdGF0LnNpemV9ID4gJHtBU1NFVF9NQVhfQllURVN9KWApO1xuICAgIH1cbiAgICBjb25zdCBleHQgPSBmdWxsLnNsaWNlKGZ1bGwubGFzdEluZGV4T2YoXCIuXCIpKS50b0xvd2VyQ2FzZSgpO1xuICAgIGNvbnN0IG1pbWUgPSBNSU1FX0JZX0VYVFtleHRdID8/IFwiYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXCI7XG4gICAgY29uc3QgYnVmID0gZnMucmVhZEZpbGVTeW5jKGZ1bGwpO1xuICAgIHJldHVybiBgZGF0YToke21pbWV9O2Jhc2U2NCwke2J1Zi50b1N0cmluZyhcImJhc2U2NFwiKX1gO1xuICB9LFxuKTtcblxuLy8gU2FuZGJveGVkIHByZWxvYWQgY2FuJ3Qgd3JpdGUgbG9ncyB0byBkaXNrOyBmb3J3YXJkIHRvIHVzIHZpYSBJUEMuXG5pcGNNYWluLm9uKFwiY29kZXhwcDpwcmVsb2FkLWxvZ1wiLCAoX2UsIGxldmVsOiBcImluZm9cIiB8IFwid2FyblwiIHwgXCJlcnJvclwiLCBtc2c6IHN0cmluZykgPT4ge1xuICBjb25zdCBsdmwgPSBsZXZlbCA9PT0gXCJlcnJvclwiIHx8IGxldmVsID09PSBcIndhcm5cIiA/IGxldmVsIDogXCJpbmZvXCI7XG4gIHRyeSB7XG4gICAgYXBwZW5kQ2FwcGVkTG9nKGpvaW4oTE9HX0RJUiwgXCJwcmVsb2FkLmxvZ1wiKSwgYFske25ldyBEYXRlKCkudG9JU09TdHJpbmcoKX1dIFske2x2bH1dICR7bXNnfVxcbmApO1xuICB9IGNhdGNoIHt9XG59KTtcblxuLy8gU2FuZGJveC1zYWZlIGZpbGVzeXN0ZW0gb3BzIGZvciByZW5kZXJlci1zY29wZSB0d2Vha3MuIEVhY2ggdHdlYWsgZ2V0c1xuLy8gYSBzYW5kYm94ZWQgZGlyIHVuZGVyIHVzZXJSb290L3R3ZWFrLWRhdGEvPGlkPi4gUmVuZGVyZXIgc2lkZSBjYWxscyB0aGVzZVxuLy8gb3ZlciBJUEMgaW5zdGVhZCBvZiB1c2luZyBOb2RlIGZzIGRpcmVjdGx5LlxucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6dHdlYWstZnNcIiwgKF9lLCBvcDogc3RyaW5nLCBpZDogc3RyaW5nLCBwOiBzdHJpbmcsIGM/OiBzdHJpbmcpID0+IHtcbiAgY29uc3QgdHdlYWsgPSBhc3NlcnRBdXRob3JpemVkVHdlYWsoaWQsIFwiZmlsZXN5c3RlbVwiKTtcbiAgY29uc3QgZGlyID0gZW5zdXJlVHdlYWtEYXRhRGlyKHVzZXJSb290ISwgdHdlYWsubWFuaWZlc3QuaWQpO1xuICBjb25zdCBmcyA9IHJlcXVpcmUoXCJub2RlOmZzXCIpIGFzIHR5cGVvZiBpbXBvcnQoXCJub2RlOmZzXCIpO1xuICBpZiAob3AgPT09IFwiZGF0YURpclwiKSByZXR1cm4gZGlyO1xuICBjb25zdCB7IGZ1bGwgfSA9IHJlc29sdmVUd2Vha0RhdGFQYXRoKHVzZXJSb290ISwgdHdlYWsubWFuaWZlc3QuaWQsIHApO1xuICBzd2l0Y2ggKG9wKSB7XG4gICAgY2FzZSBcInJlYWRcIjogcmV0dXJuIGZzLnJlYWRGaWxlU3luYyhmdWxsLCBcInV0ZjhcIik7XG4gICAgY2FzZSBcIndyaXRlXCI6IHJldHVybiBmcy53cml0ZUZpbGVTeW5jKGZ1bGwsIGMgPz8gXCJcIiwgXCJ1dGY4XCIpO1xuICAgIGNhc2UgXCJleGlzdHNcIjogcmV0dXJuIGZzLmV4aXN0c1N5bmMoZnVsbCk7XG4gICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIG9wOiAke29wfWApO1xuICB9XG59KTtcblxuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOnVzZXItcGF0aHNcIiwgKCkgPT4gKHtcbiAgdXNlclJvb3QsXG4gIHJ1bnRpbWVEaXIsXG4gIHR3ZWFrc0RpcjogVFdFQUtTX0RJUixcbiAgbG9nRGlyOiBMT0dfRElSLFxufSkpO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Y29kZXgtcnVudGltZS1pbmZvXCIsIChfZSwgdHdlYWtJZDogc3RyaW5nKSA9PiB7XG4gIGFzc2VydEF1dGhvcml6ZWRUd2Vhayh0d2Vha0lkLCBcImNvZGV4LXJ1bnRpbWVcIik7XG4gIHJldHVybiBjdXJyZW50UnVudGltZUluZm8oKTtcbn0pO1xuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmNvZGV4LXJ1bnRpbWUtY2FwYWJpbGl0aWVzXCIsIChfZSwgdHdlYWtJZDogc3RyaW5nKSA9PiB7XG4gIGFzc2VydEF1dGhvcml6ZWRUd2Vhayh0d2Vha0lkLCBcImNvZGV4LXJ1bnRpbWVcIik7XG4gIHJldHVybiBjdXJyZW50UnVudGltZUNhcGFiaWxpdGllcygpO1xufSk7XG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Y29kZXgtY2RwLXN0YXR1c1wiLCAoX2UsIHR3ZWFrSWQ6IHN0cmluZykgPT4ge1xuICBhc3NlcnRBdXRob3JpemVkVHdlYWsodHdlYWtJZCwgXCJjb2RleC1jZHBcIik7XG4gIHJldHVybiBnZXRDZHBTdGF0dXMoKTtcbn0pO1xuaXBjTWFpbi5oYW5kbGUoXCJjb2RleHBwOmNvZGV4LWNkcC10YXJnZXRzXCIsIChfZSwgdHdlYWtJZDogc3RyaW5nKSA9PiB7XG4gIGFzc2VydEF1dGhvcml6ZWRUd2Vhayh0d2Vha0lkLCBcImNvZGV4LWNkcFwiKTtcbiAgcmV0dXJuIGxpc3RDZHBUYXJnZXRzKCk7XG59KTtcbnByaXZpbGVnZWRIYW5kbGUoXCJjb2RleHBwOmNvZGV4LXdpbmRvdy1jcmVhdGVcIiwgKF9lLCB0d2Vha0lkOiBzdHJpbmcsIG9wdHM6IENvZGV4Q3JlYXRlV2luZG93T3B0aW9ucykgPT4ge1xuICBhc3NlcnRBdXRob3JpemVkVHdlYWsodHdlYWtJZCwgXCJjb2RleC13aW5kb3dzXCIpO1xuICByZXR1cm4gY3JlYXRlQ29kZXhXaW5kb3cob3B0cyk7XG59KTtcbnByaXZpbGVnZWRIYW5kbGUoXCJjb2RleHBwOmNvZGV4LXdpbmRvdy1wcmltYXJ5XCIsIChfZSwgdHdlYWtJZDogc3RyaW5nKSA9PiB7XG4gIGFzc2VydEF1dGhvcml6ZWRUd2Vhayh0d2Vha0lkLCBcImNvZGV4LXdpbmRvd3NcIik7XG4gIHJldHVybiBnZXRQcmltYXJ5Q29kZXhXaW5kb3dSZWYoKTtcbn0pO1xucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6Y29kZXgtd2luZG93LWZvY3VzXCIsIChfZSwgdHdlYWtJZDogc3RyaW5nLCB3aW5kb3dJZDogbnVtYmVyKSA9PiB7XG4gIGFzc2VydEF1dGhvcml6ZWRUd2Vhayh0d2Vha0lkLCBcImNvZGV4LXdpbmRvd3NcIik7XG4gIHJldHVybiBmb2N1c0NvZGV4V2luZG93KHdpbmRvd0lkKTtcbn0pO1xucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6Y29kZXgtd2luZG93LXNob3dcIiwgKF9lLCB0d2Vha0lkOiBzdHJpbmcsIHdpbmRvd0lkOiBudW1iZXIpID0+IHtcbiAgYXNzZXJ0QXV0aG9yaXplZFR3ZWFrKHR3ZWFrSWQsIFwiY29kZXgtd2luZG93c1wiKTtcbiAgcmV0dXJuIHNob3dDb2RleFdpbmRvdyh3aW5kb3dJZCk7XG59KTtcbnByaXZpbGVnZWRIYW5kbGUoXCJjb2RleHBwOmNvZGV4LXZpZXctY3JlYXRlXCIsXG4gIGFzeW5jIChfZSwgdHdlYWtJZDogc3RyaW5nLCBvcHRpb25zOiBDb2RleFZpZXdDcmVhdGVPcHRpb25zKSA9PiB7XG4gICAgY29uc3QgdHdlYWsgPSBhc3NlcnRBdXRob3JpemVkVHdlYWsodHdlYWtJZCwgXCJjb2RleC12aWV3c1wiKTtcbiAgICBjb25zdCByZWYgPSBhd2FpdCBjcmVhdGVPd2xWaWV3KHsgaWQ6IHR3ZWFrLm1hbmlmZXN0LmlkLCBkaXI6IHR3ZWFrLmRpciB9LCBvcHRpb25zKTtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHJlZi5pZCxcbiAgICAgIHdlYkNvbnRlbnRzSWQ6IHJlZi53ZWJDb250ZW50c0lkLFxuICAgICAgcGFyZW50V2luZG93SWQ6IHJlZi5wYXJlbnRXaW5kb3dJZCxcbiAgICB9O1xuICB9LFxuKTtcbnByaXZpbGVnZWRIYW5kbGUoXCJjb2RleHBwOmNvZGV4LXZpZXctY2FsbFwiLFxuICAoX2UsIHR3ZWFrSWQ6IHN0cmluZywgdmlld0lkOiBzdHJpbmcsIG1ldGhvZDogc3RyaW5nLCBhcmc/OiB1bmtub3duLCBhcmcyPzogdW5rbm93bikgPT4ge1xuICAgIGNvbnN0IHR3ZWFrID0gYXNzZXJ0QXV0aG9yaXplZFR3ZWFrKHR3ZWFrSWQsIFwiY29kZXgtdmlld3NcIik7XG4gICAgcmV0dXJuIGNhbGxPd2xWaWV3KHR3ZWFrLm1hbmlmZXN0LmlkLCB2aWV3SWQsIG1ldGhvZCwgYXJnLCBhcmcyKTtcbiAgfSxcbik7XG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6Y29kZXgtdmlldy1kaXNwb3NlLXR3ZWFrXCIsIChfZSwgdHdlYWtJZDogc3RyaW5nKSA9PiB7XG4gIGFzc2VydFR3ZWFrSWQodHdlYWtJZCk7XG4gIGRpc3Bvc2VPd2xWaWV3c0ZvclR3ZWFrKHR3ZWFrSWQpO1xufSk7XG5wcml2aWxlZ2VkSGFuZGxlKFwiY29kZXhwcDpuYXRpdmUtbG9hZC1tb2R1bGVcIixcbiAgKF9lLCB0d2Vha0lkOiBzdHJpbmcsIG9wdGlvbnM6IE5hdGl2ZU1vZHVsZUxvYWRPcHRpb25zKSA9PiB7XG4gICAgY29uc3QgdHdlYWsgPSBhc3NlcnRBdXRob3JpemVkVHdlYWsodHdlYWtJZCwgXCJuYXRpdmUtbW9kdWxlXCIpO1xuICAgIGNvbnN0IHJlZiA9IG5hdGl2ZUJyaWRnZS5sb2FkTW9kdWxlKHR3ZWFrQ29udGV4dCh0d2Vhay5tYW5pZmVzdC5pZCwgXCJuYXRpdmUtbW9kdWxlXCIpLCBvcHRpb25zKTtcbiAgICByZXR1cm4geyBpZDogcmVmLmlkLCBraW5kOiByZWYua2luZCB9O1xuICB9LFxuKTtcbnByaXZpbGVnZWRIYW5kbGUoXCJjb2RleHBwOm5hdGl2ZS1tb2R1bGUtcmVxdWVzdFwiLFxuICAoX2UsIHR3ZWFrSWQ6IHN0cmluZywgbW9kdWxlSWQ6IHN0cmluZywgbWV0aG9kOiBzdHJpbmcsIHBheWxvYWQ/OiB1bmtub3duLCB0aW1lb3V0TXM/OiBudW1iZXIpID0+IHtcbiAgICBjb25zdCB0d2VhayA9IGFzc2VydEF1dGhvcml6ZWRUd2Vhayh0d2Vha0lkLCBcIm5hdGl2ZS1tb2R1bGVcIik7XG4gICAgcmV0dXJuIG5hdGl2ZUJyaWRnZS5yZXF1ZXN0TW9kdWxlKHR3ZWFrLm1hbmlmZXN0LmlkLCBtb2R1bGVJZCwgbWV0aG9kLCBwYXlsb2FkLCB0aW1lb3V0TXMpO1xuICB9LFxuKTtcbnByaXZpbGVnZWRIYW5kbGUoXCJjb2RleHBwOm5hdGl2ZS1tb2R1bGUtZGlzcG9zZVwiLCAoX2UsIHR3ZWFrSWQ6IHN0cmluZywgbW9kdWxlSWQ6IHN0cmluZykgPT4ge1xuICBjb25zdCB0d2VhayA9IGFzc2VydEF1dGhvcml6ZWRUd2Vhayh0d2Vha0lkLCBcIm5hdGl2ZS1tb2R1bGVcIik7XG4gIHJldHVybiBuYXRpdmVCcmlkZ2UuZGlzcG9zZU1vZHVsZSh0d2Vhay5tYW5pZmVzdC5pZCwgbW9kdWxlSWQpO1xufSk7XG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6bmF0aXZlLWRpc3Bvc2UtdHdlYWtcIiwgKF9lLCB0d2Vha0lkOiBzdHJpbmcpID0+IHtcbiAgYXNzZXJ0VHdlYWtJZCh0d2Vha0lkKTtcbiAgbmF0aXZlQnJpZGdlLmRpc3Bvc2VUd2Vhayh0d2Vha0lkKTtcbn0pO1xucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6bmF0aXZlLWNyZWF0ZS1wYW5lbFwiLFxuICBhc3luYyAoX2UsIHR3ZWFrSWQ6IHN0cmluZywgb3B0aW9uczogTmF0aXZlUGFuZWxDcmVhdGVPcHRpb25zKSA9PiB7XG4gICAgY29uc3QgdHdlYWsgPSBhc3NlcnRBdXRob3JpemVkVHdlYWsodHdlYWtJZCwgXCJuYXRpdmUtdmlld1wiKTtcbiAgICBjb25zdCByZWYgPSBhd2FpdCBuYXRpdmVCcmlkZ2UuY3JlYXRlUGFuZWwodHdlYWtDb250ZXh0KHR3ZWFrLm1hbmlmZXN0LmlkLCBcIm5hdGl2ZS12aWV3XCIpLCBvcHRpb25zKTtcbiAgICByZXR1cm4geyBpZDogcmVmLmlkLCB3aW5kb3dJZDogcmVmLndpbmRvd0lkIH07XG4gIH0sXG4pO1xucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6bmF0aXZlLWF0dGFjaC12aWV3XCIsXG4gIGFzeW5jIChfZSwgdHdlYWtJZDogc3RyaW5nLCBvcHRpb25zOiBOYXRpdmVWaWV3QXR0YWNoT3B0aW9ucykgPT4ge1xuICAgIGNvbnN0IHR3ZWFrID0gYXNzZXJ0QXV0aG9yaXplZFR3ZWFrKHR3ZWFrSWQsIFwibmF0aXZlLXZpZXdcIik7XG4gICAgY29uc3QgcmVmID0gYXdhaXQgbmF0aXZlQnJpZGdlLmF0dGFjaFZpZXcodHdlYWtDb250ZXh0KHR3ZWFrLm1hbmlmZXN0LmlkLCBcIm5hdGl2ZS12aWV3XCIpLCBvcHRpb25zKTtcbiAgICByZXR1cm4geyBpZDogcmVmLmlkIH07XG4gIH0sXG4pO1xucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6bmF0aXZlLWluc3RhbmNlLWNhbGxcIixcbiAgYXN5bmMgKF9lLCB0d2Vha0lkOiBzdHJpbmcsIGtpbmQ6IFwicGFuZWxcIiB8IFwidmlld1wiLCBpbnN0YW5jZUlkOiBzdHJpbmcsIG1ldGhvZDogc3RyaW5nLCBhcmc/OiB1bmtub3duKSA9PiB7XG4gICAgY29uc3QgdHdlYWsgPSBhc3NlcnRBdXRob3JpemVkVHdlYWsodHdlYWtJZCwgXCJuYXRpdmUtdmlld1wiKTtcbiAgICByZXR1cm4gbmF0aXZlQnJpZGdlLmNhbGxJbnN0YW5jZSh0d2Vhay5tYW5pZmVzdC5pZCwga2luZCwgaW5zdGFuY2VJZCwgbWV0aG9kLCBhcmcpO1xuICB9LFxuKTtcbnByaXZpbGVnZWRIYW5kbGUoXCJjb2RleHBwOm5hdGl2ZS1sYXVuY2gtaGVscGVyXCIsXG4gIChfZSwgdHdlYWtJZDogc3RyaW5nLCBvcHRpb25zOiBOYXRpdmVIZWxwZXJMYXVuY2hPcHRpb25zKSA9PiB7XG4gICAgY29uc3QgdHdlYWsgPSBhc3NlcnRBdXRob3JpemVkVHdlYWsodHdlYWtJZCwgXCJuYXRpdmUtaGVscGVyXCIpO1xuICAgIGNvbnN0IHJlZiA9IG5hdGl2ZUJyaWRnZS5sYXVuY2hIZWxwZXIodHdlYWtDb250ZXh0KHR3ZWFrLm1hbmlmZXN0LmlkLCBcIm5hdGl2ZS1oZWxwZXJcIiksIG9wdGlvbnMpO1xuICAgIHJldHVybiB7IGlkOiByZWYuaWQsIHBpZDogcmVmLnBpZCB9O1xuICB9LFxuKTtcbnByaXZpbGVnZWRIYW5kbGUoXCJjb2RleHBwOm5hdGl2ZS1oZWxwZXItY2FsbFwiLFxuICAoX2UsIHR3ZWFrSWQ6IHN0cmluZywgaGVscGVySWQ6IHN0cmluZywgbWV0aG9kOiBzdHJpbmcsIHBheWxvYWQ/OiB1bmtub3duLCB0aW1lb3V0TXM/OiBudW1iZXIpID0+IHtcbiAgICBjb25zdCB0d2VhayA9IGFzc2VydEF1dGhvcml6ZWRUd2Vhayh0d2Vha0lkLCBcIm5hdGl2ZS1oZWxwZXJcIik7XG4gICAgcmV0dXJuIG5hdGl2ZUJyaWRnZS5jYWxsSGVscGVyKHR3ZWFrLm1hbmlmZXN0LmlkLCBoZWxwZXJJZCwgbWV0aG9kLCBwYXlsb2FkLCB0aW1lb3V0TXMpO1xuICB9LFxuKTtcblxucHJpdmlsZWdlZEhhbmRsZShcImNvZGV4cHA6cmV2ZWFsXCIsIChfZSwgcDogc3RyaW5nKSA9PiB7XG4gIHNoZWxsLm9wZW5QYXRoKHApLmNhdGNoKCgpID0+IHt9KTtcbn0pO1xuXG5pcGNNYWluLmhhbmRsZShcImNvZGV4cHA6b3Blbi1leHRlcm5hbFwiLCAoX2UsIHVybDogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IHBhcnNlZCA9IG5ldyBVUkwodXJsKTtcbiAgaWYgKHBhcnNlZC5wcm90b2NvbCAhPT0gXCJodHRwczpcIiB8fCBwYXJzZWQuaG9zdG5hbWUgIT09IFwiZ2l0aHViLmNvbVwiKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwib25seSBnaXRodWIuY29tIGxpbmtzIGNhbiBiZSBvcGVuZWQgZnJvbSB0d2VhayBtZXRhZGF0YVwiKTtcbiAgfVxuICBzaGVsbC5vcGVuRXh0ZXJuYWwocGFyc2VkLnRvU3RyaW5nKCkpLmNhdGNoKCgpID0+IHt9KTtcbn0pO1xuXG5wcml2aWxlZ2VkSGFuZGxlKFwiY29kZXhwcDpjb3B5LXRleHRcIiwgKF9lLCB0ZXh0OiBzdHJpbmcpID0+IHtcbiAgY2xpcGJvYXJkLndyaXRlVGV4dChTdHJpbmcodGV4dCkpO1xuICByZXR1cm4gdHJ1ZTtcbn0pO1xuXG4vLyBNYW51YWwgZm9yY2UtcmVsb2FkIHRyaWdnZXIgZnJvbSB0aGUgcmVuZGVyZXIgKGUuZy4gdGhlIFwiRm9yY2UgUmVsb2FkXCJcbi8vIGJ1dHRvbiBvbiBvdXIgaW5qZWN0ZWQgVHdlYWtzIHBhZ2UpLiBCeXBhc3NlcyB0aGUgd2F0Y2hlciBkZWJvdW5jZS5cbmlwY01haW4uaGFuZGxlKFwiY29kZXhwcDpyZWxvYWQtdHdlYWtzXCIsICgpID0+IHtcbiAgcmVsb2FkVHdlYWtzKFwibWFudWFsXCIsIHR3ZWFrTGlmZWN5Y2xlRGVwcyk7XG4gIHJldHVybiB7IGF0OiBEYXRlLm5vdygpLCBjb3VudDogdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLmxlbmd0aCB9O1xufSk7XG5cbi8vIDQuIEZpbGVzeXN0ZW0gd2F0Y2hlciBcdTIxOTIgZGVib3VuY2VkIHJlbG9hZCArIGJyb2FkY2FzdC5cbi8vICAgIFdlIHdhdGNoIHRoZSB0d2Vha3MgZGlyIGZvciBhbnkgY2hhbmdlLiBPbiB0aGUgZmlyc3QgdGljayBvZiBpbmFjdGl2aXR5XG4vLyAgICB3ZSBzdG9wIG1haW4tc2lkZSB0d2Vha3MsIGNsZWFyIHRoZWlyIGNhY2hlZCBtb2R1bGVzLCByZS1kaXNjb3ZlciwgdGhlblxuLy8gICAgcmVzdGFydCBhbmQgYnJvYWRjYXN0IGBjb2RleHBwOnR3ZWFrcy1jaGFuZ2VkYCB0byBldmVyeSByZW5kZXJlciBzbyBpdFxuLy8gICAgY2FuIHJlLWluaXQgaXRzIGhvc3QuXG5jb25zdCBSRUxPQURfREVCT1VOQ0VfTVMgPSAyNTA7XG5sZXQgcmVsb2FkVGltZXI6IE5vZGVKUy5UaW1lb3V0IHwgbnVsbCA9IG51bGw7XG5mdW5jdGlvbiBzY2hlZHVsZVJlbG9hZChyZWFzb246IHN0cmluZyk6IHZvaWQge1xuICBpZiAocmVsb2FkVGltZXIpIGNsZWFyVGltZW91dChyZWxvYWRUaW1lcik7XG4gIHJlbG9hZFRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgcmVsb2FkVGltZXIgPSBudWxsO1xuICAgIHJlbG9hZFR3ZWFrcyhyZWFzb24sIHR3ZWFrTGlmZWN5Y2xlRGVwcyk7XG4gIH0sIFJFTE9BRF9ERUJPVU5DRV9NUyk7XG59XG5cbnRyeSB7XG4gIGNvbnN0IHdhdGNoZXIgPSBjaG9raWRhci53YXRjaChUV0VBS1NfRElSLCB7XG4gICAgaWdub3JlSW5pdGlhbDogdHJ1ZSxcbiAgICAvLyBXYWl0IGZvciBmaWxlcyB0byBzZXR0bGUgYmVmb3JlIHRyaWdnZXJpbmcgXHUyMDE0IGd1YXJkcyBhZ2FpbnN0IHBhcnRpYWxseVxuICAgIC8vIHdyaXR0ZW4gdHdlYWsgZmlsZXMgZHVyaW5nIGVkaXRvciBzYXZlcyAvIGdpdCBjaGVja291dHMuXG4gICAgYXdhaXRXcml0ZUZpbmlzaDogeyBzdGFiaWxpdHlUaHJlc2hvbGQ6IDE1MCwgcG9sbEludGVydmFsOiA1MCB9LFxuICAgIC8vIEF2b2lkIGVhdGluZyBDUFUgb24gaHVnZSBub2RlX21vZHVsZXMgdHJlZXMgaW5zaWRlIHR3ZWFrIGZvbGRlcnMuXG4gICAgaWdub3JlZDogKHApID0+IHAuaW5jbHVkZXMoYCR7VFdFQUtTX0RJUn0vYCkgJiYgL1xcL25vZGVfbW9kdWxlc1xcLy8udGVzdChwKSxcbiAgfSk7XG4gIHdhdGNoZXIub24oXCJhbGxcIiwgKGV2ZW50LCBwYXRoKSA9PiBzY2hlZHVsZVJlbG9hZChgJHtldmVudH0gJHtwYXRofWApKTtcbiAgd2F0Y2hlci5vbihcImVycm9yXCIsIChlKSA9PiBsb2coXCJ3YXJuXCIsIFwid2F0Y2hlciBlcnJvcjpcIiwgZSkpO1xuICBsb2coXCJpbmZvXCIsIFwid2F0Y2hpbmdcIiwgVFdFQUtTX0RJUik7XG4gIGFwcC5vbihcIndpbGwtcXVpdFwiLCAoKSA9PiB3YXRjaGVyLmNsb3NlKCkuY2F0Y2goKCkgPT4ge30pKTtcbn0gY2F0Y2ggKGUpIHtcbiAgbG9nKFwiZXJyb3JcIiwgXCJmYWlsZWQgdG8gc3RhcnQgd2F0Y2hlcjpcIiwgZSk7XG59XG4iLCAiLyohIGNob2tpZGFyIC0gTUlUIExpY2Vuc2UgKGMpIDIwMTIgUGF1bCBNaWxsZXIgKHBhdWxtaWxsci5jb20pICovXG5pbXBvcnQgeyBzdGF0IGFzIHN0YXRjYiB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IHN0YXQsIHJlYWRkaXIgfSBmcm9tICdmcy9wcm9taXNlcyc7XG5pbXBvcnQgeyBFdmVudEVtaXR0ZXIgfSBmcm9tICdldmVudHMnO1xuaW1wb3J0ICogYXMgc3lzUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IHJlYWRkaXJwIH0gZnJvbSAncmVhZGRpcnAnO1xuaW1wb3J0IHsgTm9kZUZzSGFuZGxlciwgRVZFTlRTIGFzIEVWLCBpc1dpbmRvd3MsIGlzSUJNaSwgRU1QVFlfRk4sIFNUUl9DTE9TRSwgU1RSX0VORCwgfSBmcm9tICcuL2hhbmRsZXIuanMnO1xuY29uc3QgU0xBU0ggPSAnLyc7XG5jb25zdCBTTEFTSF9TTEFTSCA9ICcvLyc7XG5jb25zdCBPTkVfRE9UID0gJy4nO1xuY29uc3QgVFdPX0RPVFMgPSAnLi4nO1xuY29uc3QgU1RSSU5HX1RZUEUgPSAnc3RyaW5nJztcbmNvbnN0IEJBQ0tfU0xBU0hfUkUgPSAvXFxcXC9nO1xuY29uc3QgRE9VQkxFX1NMQVNIX1JFID0gL1xcL1xcLy87XG5jb25zdCBET1RfUkUgPSAvXFwuLipcXC4oc3dbcHhdKSR8fiR8XFwuc3VibC4qXFwudG1wLztcbmNvbnN0IFJFUExBQ0VSX1JFID0gL15cXC5bL1xcXFxdLztcbmZ1bmN0aW9uIGFycmlmeShpdGVtKSB7XG4gICAgcmV0dXJuIEFycmF5LmlzQXJyYXkoaXRlbSkgPyBpdGVtIDogW2l0ZW1dO1xufVxuY29uc3QgaXNNYXRjaGVyT2JqZWN0ID0gKG1hdGNoZXIpID0+IHR5cGVvZiBtYXRjaGVyID09PSAnb2JqZWN0JyAmJiBtYXRjaGVyICE9PSBudWxsICYmICEobWF0Y2hlciBpbnN0YW5jZW9mIFJlZ0V4cCk7XG5mdW5jdGlvbiBjcmVhdGVQYXR0ZXJuKG1hdGNoZXIpIHtcbiAgICBpZiAodHlwZW9mIG1hdGNoZXIgPT09ICdmdW5jdGlvbicpXG4gICAgICAgIHJldHVybiBtYXRjaGVyO1xuICAgIGlmICh0eXBlb2YgbWF0Y2hlciA9PT0gJ3N0cmluZycpXG4gICAgICAgIHJldHVybiAoc3RyaW5nKSA9PiBtYXRjaGVyID09PSBzdHJpbmc7XG4gICAgaWYgKG1hdGNoZXIgaW5zdGFuY2VvZiBSZWdFeHApXG4gICAgICAgIHJldHVybiAoc3RyaW5nKSA9PiBtYXRjaGVyLnRlc3Qoc3RyaW5nKTtcbiAgICBpZiAodHlwZW9mIG1hdGNoZXIgPT09ICdvYmplY3QnICYmIG1hdGNoZXIgIT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIChzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIGlmIChtYXRjaGVyLnBhdGggPT09IHN0cmluZylcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChtYXRjaGVyLnJlY3Vyc2l2ZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlbGF0aXZlID0gc3lzUGF0aC5yZWxhdGl2ZShtYXRjaGVyLnBhdGgsIHN0cmluZyk7XG4gICAgICAgICAgICAgICAgaWYgKCFyZWxhdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiAhcmVsYXRpdmUuc3RhcnRzV2l0aCgnLi4nKSAmJiAhc3lzUGF0aC5pc0Fic29sdXRlKHJlbGF0aXZlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuICgpID0+IGZhbHNlO1xufVxuZnVuY3Rpb24gbm9ybWFsaXplUGF0aChwYXRoKSB7XG4gICAgaWYgKHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdzdHJpbmcgZXhwZWN0ZWQnKTtcbiAgICBwYXRoID0gc3lzUGF0aC5ub3JtYWxpemUocGF0aCk7XG4gICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIGxldCBwcmVwZW5kID0gZmFsc2U7XG4gICAgaWYgKHBhdGguc3RhcnRzV2l0aCgnLy8nKSlcbiAgICAgICAgcHJlcGVuZCA9IHRydWU7XG4gICAgY29uc3QgRE9VQkxFX1NMQVNIX1JFID0gL1xcL1xcLy87XG4gICAgd2hpbGUgKHBhdGgubWF0Y2goRE9VQkxFX1NMQVNIX1JFKSlcbiAgICAgICAgcGF0aCA9IHBhdGgucmVwbGFjZShET1VCTEVfU0xBU0hfUkUsICcvJyk7XG4gICAgaWYgKHByZXBlbmQpXG4gICAgICAgIHBhdGggPSAnLycgKyBwYXRoO1xuICAgIHJldHVybiBwYXRoO1xufVxuZnVuY3Rpb24gbWF0Y2hQYXR0ZXJucyhwYXR0ZXJucywgdGVzdFN0cmluZywgc3RhdHMpIHtcbiAgICBjb25zdCBwYXRoID0gbm9ybWFsaXplUGF0aCh0ZXN0U3RyaW5nKTtcbiAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgcGF0dGVybnMubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgIGNvbnN0IHBhdHRlcm4gPSBwYXR0ZXJuc1tpbmRleF07XG4gICAgICAgIGlmIChwYXR0ZXJuKHBhdGgsIHN0YXRzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuZnVuY3Rpb24gYW55bWF0Y2gobWF0Y2hlcnMsIHRlc3RTdHJpbmcpIHtcbiAgICBpZiAobWF0Y2hlcnMgPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdhbnltYXRjaDogc3BlY2lmeSBmaXJzdCBhcmd1bWVudCcpO1xuICAgIH1cbiAgICAvLyBFYXJseSBjYWNoZSBmb3IgbWF0Y2hlcnMuXG4gICAgY29uc3QgbWF0Y2hlcnNBcnJheSA9IGFycmlmeShtYXRjaGVycyk7XG4gICAgY29uc3QgcGF0dGVybnMgPSBtYXRjaGVyc0FycmF5Lm1hcCgobWF0Y2hlcikgPT4gY3JlYXRlUGF0dGVybihtYXRjaGVyKSk7XG4gICAgaWYgKHRlc3RTdHJpbmcgPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gKHRlc3RTdHJpbmcsIHN0YXRzKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hQYXR0ZXJucyhwYXR0ZXJucywgdGVzdFN0cmluZywgc3RhdHMpO1xuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gbWF0Y2hQYXR0ZXJucyhwYXR0ZXJucywgdGVzdFN0cmluZyk7XG59XG5jb25zdCB1bmlmeVBhdGhzID0gKHBhdGhzXykgPT4ge1xuICAgIGNvbnN0IHBhdGhzID0gYXJyaWZ5KHBhdGhzXykuZmxhdCgpO1xuICAgIGlmICghcGF0aHMuZXZlcnkoKHApID0+IHR5cGVvZiBwID09PSBTVFJJTkdfVFlQRSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgTm9uLXN0cmluZyBwcm92aWRlZCBhcyB3YXRjaCBwYXRoOiAke3BhdGhzfWApO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aHMubWFwKG5vcm1hbGl6ZVBhdGhUb1VuaXgpO1xufTtcbi8vIElmIFNMQVNIX1NMQVNIIG9jY3VycyBhdCB0aGUgYmVnaW5uaW5nIG9mIHBhdGgsIGl0IGlzIG5vdCByZXBsYWNlZFxuLy8gICAgIGJlY2F1c2UgXCIvL1N0b3JhZ2VQQy9Ecml2ZVBvb2wvTW92aWVzXCIgaXMgYSB2YWxpZCBuZXR3b3JrIHBhdGhcbmNvbnN0IHRvVW5peCA9IChzdHJpbmcpID0+IHtcbiAgICBsZXQgc3RyID0gc3RyaW5nLnJlcGxhY2UoQkFDS19TTEFTSF9SRSwgU0xBU0gpO1xuICAgIGxldCBwcmVwZW5kID0gZmFsc2U7XG4gICAgaWYgKHN0ci5zdGFydHNXaXRoKFNMQVNIX1NMQVNIKSkge1xuICAgICAgICBwcmVwZW5kID0gdHJ1ZTtcbiAgICB9XG4gICAgd2hpbGUgKHN0ci5tYXRjaChET1VCTEVfU0xBU0hfUkUpKSB7XG4gICAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKERPVUJMRV9TTEFTSF9SRSwgU0xBU0gpO1xuICAgIH1cbiAgICBpZiAocHJlcGVuZCkge1xuICAgICAgICBzdHIgPSBTTEFTSCArIHN0cjtcbiAgICB9XG4gICAgcmV0dXJuIHN0cjtcbn07XG4vLyBPdXIgdmVyc2lvbiBvZiB1cGF0aC5ub3JtYWxpemVcbi8vIFRPRE86IHRoaXMgaXMgbm90IGVxdWFsIHRvIHBhdGgtbm9ybWFsaXplIG1vZHVsZSAtIGludmVzdGlnYXRlIHdoeVxuY29uc3Qgbm9ybWFsaXplUGF0aFRvVW5peCA9IChwYXRoKSA9PiB0b1VuaXgoc3lzUGF0aC5ub3JtYWxpemUodG9Vbml4KHBhdGgpKSk7XG4vLyBUT0RPOiByZWZhY3RvclxuY29uc3Qgbm9ybWFsaXplSWdub3JlZCA9IChjd2QgPSAnJykgPT4gKHBhdGgpID0+IHtcbiAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBub3JtYWxpemVQYXRoVG9Vbml4KHN5c1BhdGguaXNBYnNvbHV0ZShwYXRoKSA/IHBhdGggOiBzeXNQYXRoLmpvaW4oY3dkLCBwYXRoKSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gcGF0aDtcbiAgICB9XG59O1xuY29uc3QgZ2V0QWJzb2x1dGVQYXRoID0gKHBhdGgsIGN3ZCkgPT4ge1xuICAgIGlmIChzeXNQYXRoLmlzQWJzb2x1dGUocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIHBhdGg7XG4gICAgfVxuICAgIHJldHVybiBzeXNQYXRoLmpvaW4oY3dkLCBwYXRoKTtcbn07XG5jb25zdCBFTVBUWV9TRVQgPSBPYmplY3QuZnJlZXplKG5ldyBTZXQoKSk7XG4vKipcbiAqIERpcmVjdG9yeSBlbnRyeS5cbiAqL1xuY2xhc3MgRGlyRW50cnkge1xuICAgIGNvbnN0cnVjdG9yKGRpciwgcmVtb3ZlV2F0Y2hlcikge1xuICAgICAgICB0aGlzLnBhdGggPSBkaXI7XG4gICAgICAgIHRoaXMuX3JlbW92ZVdhdGNoZXIgPSByZW1vdmVXYXRjaGVyO1xuICAgICAgICB0aGlzLml0ZW1zID0gbmV3IFNldCgpO1xuICAgIH1cbiAgICBhZGQoaXRlbSkge1xuICAgICAgICBjb25zdCB7IGl0ZW1zIH0gPSB0aGlzO1xuICAgICAgICBpZiAoIWl0ZW1zKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAoaXRlbSAhPT0gT05FX0RPVCAmJiBpdGVtICE9PSBUV09fRE9UUylcbiAgICAgICAgICAgIGl0ZW1zLmFkZChpdGVtKTtcbiAgICB9XG4gICAgYXN5bmMgcmVtb3ZlKGl0ZW0pIHtcbiAgICAgICAgY29uc3QgeyBpdGVtcyB9ID0gdGhpcztcbiAgICAgICAgaWYgKCFpdGVtcylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaXRlbXMuZGVsZXRlKGl0ZW0pO1xuICAgICAgICBpZiAoaXRlbXMuc2l6ZSA+IDApXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGNvbnN0IGRpciA9IHRoaXMucGF0aDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHJlYWRkaXIoZGlyKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fcmVtb3ZlV2F0Y2hlcikge1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbW92ZVdhdGNoZXIoc3lzUGF0aC5kaXJuYW1lKGRpciksIHN5c1BhdGguYmFzZW5hbWUoZGlyKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgaGFzKGl0ZW0pIHtcbiAgICAgICAgY29uc3QgeyBpdGVtcyB9ID0gdGhpcztcbiAgICAgICAgaWYgKCFpdGVtcylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgcmV0dXJuIGl0ZW1zLmhhcyhpdGVtKTtcbiAgICB9XG4gICAgZ2V0Q2hpbGRyZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgaXRlbXMgfSA9IHRoaXM7XG4gICAgICAgIGlmICghaXRlbXMpXG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIHJldHVybiBbLi4uaXRlbXMudmFsdWVzKCldO1xuICAgIH1cbiAgICBkaXNwb3NlKCkge1xuICAgICAgICB0aGlzLml0ZW1zLmNsZWFyKCk7XG4gICAgICAgIHRoaXMucGF0aCA9ICcnO1xuICAgICAgICB0aGlzLl9yZW1vdmVXYXRjaGVyID0gRU1QVFlfRk47XG4gICAgICAgIHRoaXMuaXRlbXMgPSBFTVBUWV9TRVQ7XG4gICAgICAgIE9iamVjdC5mcmVlemUodGhpcyk7XG4gICAgfVxufVxuY29uc3QgU1RBVF9NRVRIT0RfRiA9ICdzdGF0JztcbmNvbnN0IFNUQVRfTUVUSE9EX0wgPSAnbHN0YXQnO1xuZXhwb3J0IGNsYXNzIFdhdGNoSGVscGVyIHtcbiAgICBjb25zdHJ1Y3RvcihwYXRoLCBmb2xsb3csIGZzdykge1xuICAgICAgICB0aGlzLmZzdyA9IGZzdztcbiAgICAgICAgY29uc3Qgd2F0Y2hQYXRoID0gcGF0aDtcbiAgICAgICAgdGhpcy5wYXRoID0gcGF0aCA9IHBhdGgucmVwbGFjZShSRVBMQUNFUl9SRSwgJycpO1xuICAgICAgICB0aGlzLndhdGNoUGF0aCA9IHdhdGNoUGF0aDtcbiAgICAgICAgdGhpcy5mdWxsV2F0Y2hQYXRoID0gc3lzUGF0aC5yZXNvbHZlKHdhdGNoUGF0aCk7XG4gICAgICAgIHRoaXMuZGlyUGFydHMgPSBbXTtcbiAgICAgICAgdGhpcy5kaXJQYXJ0cy5mb3JFYWNoKChwYXJ0cykgPT4ge1xuICAgICAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+IDEpXG4gICAgICAgICAgICAgICAgcGFydHMucG9wKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmZvbGxvd1N5bWxpbmtzID0gZm9sbG93O1xuICAgICAgICB0aGlzLnN0YXRNZXRob2QgPSBmb2xsb3cgPyBTVEFUX01FVEhPRF9GIDogU1RBVF9NRVRIT0RfTDtcbiAgICB9XG4gICAgZW50cnlQYXRoKGVudHJ5KSB7XG4gICAgICAgIHJldHVybiBzeXNQYXRoLmpvaW4odGhpcy53YXRjaFBhdGgsIHN5c1BhdGgucmVsYXRpdmUodGhpcy53YXRjaFBhdGgsIGVudHJ5LmZ1bGxQYXRoKSk7XG4gICAgfVxuICAgIGZpbHRlclBhdGgoZW50cnkpIHtcbiAgICAgICAgY29uc3QgeyBzdGF0cyB9ID0gZW50cnk7XG4gICAgICAgIGlmIChzdGF0cyAmJiBzdGF0cy5pc1N5bWJvbGljTGluaygpKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmlsdGVyRGlyKGVudHJ5KTtcbiAgICAgICAgY29uc3QgcmVzb2x2ZWRQYXRoID0gdGhpcy5lbnRyeVBhdGgoZW50cnkpO1xuICAgICAgICAvLyBUT0RPOiB3aGF0IGlmIHN0YXRzIGlzIHVuZGVmaW5lZD8gcmVtb3ZlICFcbiAgICAgICAgcmV0dXJuIHRoaXMuZnN3Ll9pc250SWdub3JlZChyZXNvbHZlZFBhdGgsIHN0YXRzKSAmJiB0aGlzLmZzdy5faGFzUmVhZFBlcm1pc3Npb25zKHN0YXRzKTtcbiAgICB9XG4gICAgZmlsdGVyRGlyKGVudHJ5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmZzdy5faXNudElnbm9yZWQodGhpcy5lbnRyeVBhdGgoZW50cnkpLCBlbnRyeS5zdGF0cyk7XG4gICAgfVxufVxuLyoqXG4gKiBXYXRjaGVzIGZpbGVzICYgZGlyZWN0b3JpZXMgZm9yIGNoYW5nZXMuIEVtaXR0ZWQgZXZlbnRzOlxuICogYGFkZGAsIGBhZGREaXJgLCBgY2hhbmdlYCwgYHVubGlua2AsIGB1bmxpbmtEaXJgLCBgYWxsYCwgYGVycm9yYFxuICpcbiAqICAgICBuZXcgRlNXYXRjaGVyKClcbiAqICAgICAgIC5hZGQoZGlyZWN0b3JpZXMpXG4gKiAgICAgICAub24oJ2FkZCcsIHBhdGggPT4gbG9nKCdGaWxlJywgcGF0aCwgJ3dhcyBhZGRlZCcpKVxuICovXG5leHBvcnQgY2xhc3MgRlNXYXRjaGVyIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgICAvLyBOb3QgaW5kZW50aW5nIG1ldGhvZHMgZm9yIGhpc3Rvcnkgc2FrZTsgZm9yIG5vdy5cbiAgICBjb25zdHJ1Y3Rvcihfb3B0cyA9IHt9KSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuY2xvc2VkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2Nsb3NlcnMgPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXMuX2lnbm9yZWRQYXRocyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5fdGhyb3R0bGVkID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLl9zdHJlYW1zID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLl9zeW1saW5rUGF0aHMgPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXMuX3dhdGNoZWQgPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXMuX3BlbmRpbmdXcml0ZXMgPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXMuX3BlbmRpbmdVbmxpbmtzID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLl9yZWFkeUNvdW50ID0gMDtcbiAgICAgICAgdGhpcy5fcmVhZHlFbWl0dGVkID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IGF3ZiA9IF9vcHRzLmF3YWl0V3JpdGVGaW5pc2g7XG4gICAgICAgIGNvbnN0IERFRl9BV0YgPSB7IHN0YWJpbGl0eVRocmVzaG9sZDogMjAwMCwgcG9sbEludGVydmFsOiAxMDAgfTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IHtcbiAgICAgICAgICAgIC8vIERlZmF1bHRzXG4gICAgICAgICAgICBwZXJzaXN0ZW50OiB0cnVlLFxuICAgICAgICAgICAgaWdub3JlSW5pdGlhbDogZmFsc2UsXG4gICAgICAgICAgICBpZ25vcmVQZXJtaXNzaW9uRXJyb3JzOiBmYWxzZSxcbiAgICAgICAgICAgIGludGVydmFsOiAxMDAsXG4gICAgICAgICAgICBiaW5hcnlJbnRlcnZhbDogMzAwLFxuICAgICAgICAgICAgZm9sbG93U3ltbGlua3M6IHRydWUsXG4gICAgICAgICAgICB1c2VQb2xsaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIC8vIHVzZUFzeW5jOiBmYWxzZSxcbiAgICAgICAgICAgIGF0b21pYzogdHJ1ZSwgLy8gTk9URTogb3ZlcndyaXR0ZW4gbGF0ZXIgKGRlcGVuZHMgb24gdXNlUG9sbGluZylcbiAgICAgICAgICAgIC4uLl9vcHRzLFxuICAgICAgICAgICAgLy8gQ2hhbmdlIGZvcm1hdFxuICAgICAgICAgICAgaWdub3JlZDogX29wdHMuaWdub3JlZCA/IGFycmlmeShfb3B0cy5pZ25vcmVkKSA6IGFycmlmeShbXSksXG4gICAgICAgICAgICBhd2FpdFdyaXRlRmluaXNoOiBhd2YgPT09IHRydWUgPyBERUZfQVdGIDogdHlwZW9mIGF3ZiA9PT0gJ29iamVjdCcgPyB7IC4uLkRFRl9BV0YsIC4uLmF3ZiB9IDogZmFsc2UsXG4gICAgICAgIH07XG4gICAgICAgIC8vIEFsd2F5cyBkZWZhdWx0IHRvIHBvbGxpbmcgb24gSUJNIGkgYmVjYXVzZSBmcy53YXRjaCgpIGlzIG5vdCBhdmFpbGFibGUgb24gSUJNIGkuXG4gICAgICAgIGlmIChpc0lCTWkpXG4gICAgICAgICAgICBvcHRzLnVzZVBvbGxpbmcgPSB0cnVlO1xuICAgICAgICAvLyBFZGl0b3IgYXRvbWljIHdyaXRlIG5vcm1hbGl6YXRpb24gZW5hYmxlZCBieSBkZWZhdWx0IHdpdGggZnMud2F0Y2hcbiAgICAgICAgaWYgKG9wdHMuYXRvbWljID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBvcHRzLmF0b21pYyA9ICFvcHRzLnVzZVBvbGxpbmc7XG4gICAgICAgIC8vIG9wdHMuYXRvbWljID0gdHlwZW9mIF9vcHRzLmF0b21pYyA9PT0gJ251bWJlcicgPyBfb3B0cy5hdG9taWMgOiAxMDA7XG4gICAgICAgIC8vIEdsb2JhbCBvdmVycmlkZS4gVXNlZnVsIGZvciBkZXZlbG9wZXJzLCB3aG8gbmVlZCB0byBmb3JjZSBwb2xsaW5nIGZvciBhbGxcbiAgICAgICAgLy8gaW5zdGFuY2VzIG9mIGNob2tpZGFyLCByZWdhcmRsZXNzIG9mIHVzYWdlIC8gZGVwZW5kZW5jeSBkZXB0aFxuICAgICAgICBjb25zdCBlbnZQb2xsID0gcHJvY2Vzcy5lbnYuQ0hPS0lEQVJfVVNFUE9MTElORztcbiAgICAgICAgaWYgKGVudlBvbGwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc3QgZW52TG93ZXIgPSBlbnZQb2xsLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICBpZiAoZW52TG93ZXIgPT09ICdmYWxzZScgfHwgZW52TG93ZXIgPT09ICcwJylcbiAgICAgICAgICAgICAgICBvcHRzLnVzZVBvbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIGVsc2UgaWYgKGVudkxvd2VyID09PSAndHJ1ZScgfHwgZW52TG93ZXIgPT09ICcxJylcbiAgICAgICAgICAgICAgICBvcHRzLnVzZVBvbGxpbmcgPSB0cnVlO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIG9wdHMudXNlUG9sbGluZyA9ICEhZW52TG93ZXI7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZW52SW50ZXJ2YWwgPSBwcm9jZXNzLmVudi5DSE9LSURBUl9JTlRFUlZBTDtcbiAgICAgICAgaWYgKGVudkludGVydmFsKVxuICAgICAgICAgICAgb3B0cy5pbnRlcnZhbCA9IE51bWJlci5wYXJzZUludChlbnZJbnRlcnZhbCwgMTApO1xuICAgICAgICAvLyBUaGlzIGlzIGRvbmUgdG8gZW1pdCByZWFkeSBvbmx5IG9uY2UsIGJ1dCBlYWNoICdhZGQnIHdpbGwgaW5jcmVhc2UgdGhhdD9cbiAgICAgICAgbGV0IHJlYWR5Q2FsbHMgPSAwO1xuICAgICAgICB0aGlzLl9lbWl0UmVhZHkgPSAoKSA9PiB7XG4gICAgICAgICAgICByZWFkeUNhbGxzKys7XG4gICAgICAgICAgICBpZiAocmVhZHlDYWxscyA+PSB0aGlzLl9yZWFkeUNvdW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZW1pdFJlYWR5ID0gRU1QVFlfRk47XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVhZHlFbWl0dGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAvLyB1c2UgcHJvY2Vzcy5uZXh0VGljayB0byBhbGxvdyB0aW1lIGZvciBsaXN0ZW5lciB0byBiZSBib3VuZFxuICAgICAgICAgICAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4gdGhpcy5lbWl0KEVWLlJFQURZKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuX2VtaXRSYXcgPSAoLi4uYXJncykgPT4gdGhpcy5lbWl0KEVWLlJBVywgLi4uYXJncyk7XG4gICAgICAgIHRoaXMuX2JvdW5kUmVtb3ZlID0gdGhpcy5fcmVtb3ZlLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IG9wdHM7XG4gICAgICAgIHRoaXMuX25vZGVGc0hhbmRsZXIgPSBuZXcgTm9kZUZzSGFuZGxlcih0aGlzKTtcbiAgICAgICAgLy8gWW91XHUyMDE5cmUgZnJvemVuIHdoZW4geW91ciBoZWFydFx1MjAxOXMgbm90IG9wZW4uXG4gICAgICAgIE9iamVjdC5mcmVlemUob3B0cyk7XG4gICAgfVxuICAgIF9hZGRJZ25vcmVkUGF0aChtYXRjaGVyKSB7XG4gICAgICAgIGlmIChpc01hdGNoZXJPYmplY3QobWF0Y2hlcikpIHtcbiAgICAgICAgICAgIC8vIHJldHVybiBlYXJseSBpZiB3ZSBhbHJlYWR5IGhhdmUgYSBkZWVwbHkgZXF1YWwgbWF0Y2hlciBvYmplY3RcbiAgICAgICAgICAgIGZvciAoY29uc3QgaWdub3JlZCBvZiB0aGlzLl9pZ25vcmVkUGF0aHMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNNYXRjaGVyT2JqZWN0KGlnbm9yZWQpICYmXG4gICAgICAgICAgICAgICAgICAgIGlnbm9yZWQucGF0aCA9PT0gbWF0Y2hlci5wYXRoICYmXG4gICAgICAgICAgICAgICAgICAgIGlnbm9yZWQucmVjdXJzaXZlID09PSBtYXRjaGVyLnJlY3Vyc2l2ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2lnbm9yZWRQYXRocy5hZGQobWF0Y2hlcik7XG4gICAgfVxuICAgIF9yZW1vdmVJZ25vcmVkUGF0aChtYXRjaGVyKSB7XG4gICAgICAgIHRoaXMuX2lnbm9yZWRQYXRocy5kZWxldGUobWF0Y2hlcik7XG4gICAgICAgIC8vIG5vdyBmaW5kIGFueSBtYXRjaGVyIG9iamVjdHMgd2l0aCB0aGUgbWF0Y2hlciBhcyBwYXRoXG4gICAgICAgIGlmICh0eXBlb2YgbWF0Y2hlciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaWdub3JlZCBvZiB0aGlzLl9pZ25vcmVkUGF0aHMpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPICg0MzA4MWopOiBtYWtlIHRoaXMgbW9yZSBlZmZpY2llbnQuXG4gICAgICAgICAgICAgICAgLy8gcHJvYmFibHkganVzdCBtYWtlIGEgYHRoaXMuX2lnbm9yZWREaXJlY3Rvcmllc2Agb3Igc29tZVxuICAgICAgICAgICAgICAgIC8vIHN1Y2ggdGhpbmcuXG4gICAgICAgICAgICAgICAgaWYgKGlzTWF0Y2hlck9iamVjdChpZ25vcmVkKSAmJiBpZ25vcmVkLnBhdGggPT09IG1hdGNoZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5faWdub3JlZFBhdGhzLmRlbGV0ZShpZ25vcmVkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gUHVibGljIG1ldGhvZHNcbiAgICAvKipcbiAgICAgKiBBZGRzIHBhdGhzIHRvIGJlIHdhdGNoZWQgb24gYW4gZXhpc3RpbmcgRlNXYXRjaGVyIGluc3RhbmNlLlxuICAgICAqIEBwYXJhbSBwYXRoc18gZmlsZSBvciBmaWxlIGxpc3QuIE90aGVyIGFyZ3VtZW50cyBhcmUgdW51c2VkXG4gICAgICovXG4gICAgYWRkKHBhdGhzXywgX29yaWdBZGQsIF9pbnRlcm5hbCkge1xuICAgICAgICBjb25zdCB7IGN3ZCB9ID0gdGhpcy5vcHRpb25zO1xuICAgICAgICB0aGlzLmNsb3NlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9jbG9zZVByb21pc2UgPSB1bmRlZmluZWQ7XG4gICAgICAgIGxldCBwYXRocyA9IHVuaWZ5UGF0aHMocGF0aHNfKTtcbiAgICAgICAgaWYgKGN3ZCkge1xuICAgICAgICAgICAgcGF0aHMgPSBwYXRocy5tYXAoKHBhdGgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBhYnNQYXRoID0gZ2V0QWJzb2x1dGVQYXRoKHBhdGgsIGN3ZCk7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgYHBhdGhgIGluc3RlYWQgb2YgYGFic1BhdGhgIGJlY2F1c2UgdGhlIGN3ZCBwb3J0aW9uIGNhbid0IGJlIGEgZ2xvYlxuICAgICAgICAgICAgICAgIHJldHVybiBhYnNQYXRoO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcGF0aHMuZm9yRWFjaCgocGF0aCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fcmVtb3ZlSWdub3JlZFBhdGgocGF0aCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl91c2VySWdub3JlZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKCF0aGlzLl9yZWFkeUNvdW50KVxuICAgICAgICAgICAgdGhpcy5fcmVhZHlDb3VudCA9IDA7XG4gICAgICAgIHRoaXMuX3JlYWR5Q291bnQgKz0gcGF0aHMubGVuZ3RoO1xuICAgICAgICBQcm9taXNlLmFsbChwYXRocy5tYXAoYXN5bmMgKHBhdGgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IHRoaXMuX25vZGVGc0hhbmRsZXIuX2FkZFRvTm9kZUZzKHBhdGgsICFfaW50ZXJuYWwsIHVuZGVmaW5lZCwgMCwgX29yaWdBZGQpO1xuICAgICAgICAgICAgaWYgKHJlcylcbiAgICAgICAgICAgICAgICB0aGlzLl9lbWl0UmVhZHkoKTtcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH0pKS50aGVuKChyZXN1bHRzKSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy5jbG9zZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgcmVzdWx0cy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0pXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkKHN5c1BhdGguZGlybmFtZShpdGVtKSwgc3lzUGF0aC5iYXNlbmFtZShfb3JpZ0FkZCB8fCBpdGVtKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDbG9zZSB3YXRjaGVycyBvciBzdGFydCBpZ25vcmluZyBldmVudHMgZnJvbSBzcGVjaWZpZWQgcGF0aHMuXG4gICAgICovXG4gICAgdW53YXRjaChwYXRoc18pIHtcbiAgICAgICAgaWYgKHRoaXMuY2xvc2VkKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIGNvbnN0IHBhdGhzID0gdW5pZnlQYXRocyhwYXRoc18pO1xuICAgICAgICBjb25zdCB7IGN3ZCB9ID0gdGhpcy5vcHRpb25zO1xuICAgICAgICBwYXRocy5mb3JFYWNoKChwYXRoKSA9PiB7XG4gICAgICAgICAgICAvLyBjb252ZXJ0IHRvIGFic29sdXRlIHBhdGggdW5sZXNzIHJlbGF0aXZlIHBhdGggYWxyZWFkeSBtYXRjaGVzXG4gICAgICAgICAgICBpZiAoIXN5c1BhdGguaXNBYnNvbHV0ZShwYXRoKSAmJiAhdGhpcy5fY2xvc2Vycy5oYXMocGF0aCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoY3dkKVxuICAgICAgICAgICAgICAgICAgICBwYXRoID0gc3lzUGF0aC5qb2luKGN3ZCwgcGF0aCk7XG4gICAgICAgICAgICAgICAgcGF0aCA9IHN5c1BhdGgucmVzb2x2ZShwYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2Nsb3NlUGF0aChwYXRoKTtcbiAgICAgICAgICAgIHRoaXMuX2FkZElnbm9yZWRQYXRoKHBhdGgpO1xuICAgICAgICAgICAgaWYgKHRoaXMuX3dhdGNoZWQuaGFzKHBhdGgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYWRkSWdub3JlZFBhdGgoe1xuICAgICAgICAgICAgICAgICAgICBwYXRoLFxuICAgICAgICAgICAgICAgICAgICByZWN1cnNpdmU6IHRydWUsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyByZXNldCB0aGUgY2FjaGVkIHVzZXJJZ25vcmVkIGFueW1hdGNoIGZuXG4gICAgICAgICAgICAvLyB0byBtYWtlIGlnbm9yZWRQYXRocyBjaGFuZ2VzIGVmZmVjdGl2ZVxuICAgICAgICAgICAgdGhpcy5fdXNlcklnbm9yZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xvc2Ugd2F0Y2hlcnMgYW5kIHJlbW92ZSBhbGwgbGlzdGVuZXJzIGZyb20gd2F0Y2hlZCBwYXRocy5cbiAgICAgKi9cbiAgICBjbG9zZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuX2Nsb3NlUHJvbWlzZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2Nsb3NlUHJvbWlzZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNsb3NlZCA9IHRydWU7XG4gICAgICAgIC8vIE1lbW9yeSBtYW5hZ2VtZW50LlxuICAgICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygpO1xuICAgICAgICBjb25zdCBjbG9zZXJzID0gW107XG4gICAgICAgIHRoaXMuX2Nsb3NlcnMuZm9yRWFjaCgoY2xvc2VyTGlzdCkgPT4gY2xvc2VyTGlzdC5mb3JFYWNoKChjbG9zZXIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSBjbG9zZXIoKTtcbiAgICAgICAgICAgIGlmIChwcm9taXNlIGluc3RhbmNlb2YgUHJvbWlzZSlcbiAgICAgICAgICAgICAgICBjbG9zZXJzLnB1c2gocHJvbWlzZSk7XG4gICAgICAgIH0pKTtcbiAgICAgICAgdGhpcy5fc3RyZWFtcy5mb3JFYWNoKChzdHJlYW0pID0+IHN0cmVhbS5kZXN0cm95KCkpO1xuICAgICAgICB0aGlzLl91c2VySWdub3JlZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5fcmVhZHlDb3VudCA9IDA7XG4gICAgICAgIHRoaXMuX3JlYWR5RW1pdHRlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLl93YXRjaGVkLmZvckVhY2goKGRpcmVudCkgPT4gZGlyZW50LmRpc3Bvc2UoKSk7XG4gICAgICAgIHRoaXMuX2Nsb3NlcnMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5fd2F0Y2hlZC5jbGVhcigpO1xuICAgICAgICB0aGlzLl9zdHJlYW1zLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuX3N5bWxpbmtQYXRocy5jbGVhcigpO1xuICAgICAgICB0aGlzLl90aHJvdHRsZWQuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5fY2xvc2VQcm9taXNlID0gY2xvc2Vycy5sZW5ndGhcbiAgICAgICAgICAgID8gUHJvbWlzZS5hbGwoY2xvc2VycykudGhlbigoKSA9PiB1bmRlZmluZWQpXG4gICAgICAgICAgICA6IFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICByZXR1cm4gdGhpcy5fY2xvc2VQcm9taXNlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBFeHBvc2UgbGlzdCBvZiB3YXRjaGVkIHBhdGhzXG4gICAgICogQHJldHVybnMgZm9yIGNoYWluaW5nXG4gICAgICovXG4gICAgZ2V0V2F0Y2hlZCgpIHtcbiAgICAgICAgY29uc3Qgd2F0Y2hMaXN0ID0ge307XG4gICAgICAgIHRoaXMuX3dhdGNoZWQuZm9yRWFjaCgoZW50cnksIGRpcikgPT4ge1xuICAgICAgICAgICAgY29uc3Qga2V5ID0gdGhpcy5vcHRpb25zLmN3ZCA/IHN5c1BhdGgucmVsYXRpdmUodGhpcy5vcHRpb25zLmN3ZCwgZGlyKSA6IGRpcjtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0ga2V5IHx8IE9ORV9ET1Q7XG4gICAgICAgICAgICB3YXRjaExpc3RbaW5kZXhdID0gZW50cnkuZ2V0Q2hpbGRyZW4oKS5zb3J0KCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gd2F0Y2hMaXN0O1xuICAgIH1cbiAgICBlbWl0V2l0aEFsbChldmVudCwgYXJncykge1xuICAgICAgICB0aGlzLmVtaXQoZXZlbnQsIC4uLmFyZ3MpO1xuICAgICAgICBpZiAoZXZlbnQgIT09IEVWLkVSUk9SKVxuICAgICAgICAgICAgdGhpcy5lbWl0KEVWLkFMTCwgZXZlbnQsIC4uLmFyZ3MpO1xuICAgIH1cbiAgICAvLyBDb21tb24gaGVscGVyc1xuICAgIC8vIC0tLS0tLS0tLS0tLS0tXG4gICAgLyoqXG4gICAgICogTm9ybWFsaXplIGFuZCBlbWl0IGV2ZW50cy5cbiAgICAgKiBDYWxsaW5nIF9lbWl0IERPRVMgTk9UIE1FQU4gZW1pdCgpIHdvdWxkIGJlIGNhbGxlZCFcbiAgICAgKiBAcGFyYW0gZXZlbnQgVHlwZSBvZiBldmVudFxuICAgICAqIEBwYXJhbSBwYXRoIEZpbGUgb3IgZGlyZWN0b3J5IHBhdGhcbiAgICAgKiBAcGFyYW0gc3RhdHMgYXJndW1lbnRzIHRvIGJlIHBhc3NlZCB3aXRoIGV2ZW50XG4gICAgICogQHJldHVybnMgdGhlIGVycm9yIGlmIGRlZmluZWQsIG90aGVyd2lzZSB0aGUgdmFsdWUgb2YgdGhlIEZTV2F0Y2hlciBpbnN0YW5jZSdzIGBjbG9zZWRgIGZsYWdcbiAgICAgKi9cbiAgICBhc3luYyBfZW1pdChldmVudCwgcGF0aCwgc3RhdHMpIHtcbiAgICAgICAgaWYgKHRoaXMuY2xvc2VkKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCBvcHRzID0gdGhpcy5vcHRpb25zO1xuICAgICAgICBpZiAoaXNXaW5kb3dzKVxuICAgICAgICAgICAgcGF0aCA9IHN5c1BhdGgubm9ybWFsaXplKHBhdGgpO1xuICAgICAgICBpZiAob3B0cy5jd2QpXG4gICAgICAgICAgICBwYXRoID0gc3lzUGF0aC5yZWxhdGl2ZShvcHRzLmN3ZCwgcGF0aCk7XG4gICAgICAgIGNvbnN0IGFyZ3MgPSBbcGF0aF07XG4gICAgICAgIGlmIChzdGF0cyAhPSBudWxsKVxuICAgICAgICAgICAgYXJncy5wdXNoKHN0YXRzKTtcbiAgICAgICAgY29uc3QgYXdmID0gb3B0cy5hd2FpdFdyaXRlRmluaXNoO1xuICAgICAgICBsZXQgcHc7XG4gICAgICAgIGlmIChhd2YgJiYgKHB3ID0gdGhpcy5fcGVuZGluZ1dyaXRlcy5nZXQocGF0aCkpKSB7XG4gICAgICAgICAgICBwdy5sYXN0Q2hhbmdlID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChvcHRzLmF0b21pYykge1xuICAgICAgICAgICAgaWYgKGV2ZW50ID09PSBFVi5VTkxJTkspIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9wZW5kaW5nVW5saW5rcy5zZXQocGF0aCwgW2V2ZW50LCAuLi5hcmdzXSk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3BlbmRpbmdVbmxpbmtzLmZvckVhY2goKGVudHJ5LCBwYXRoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXQoLi4uZW50cnkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0KEVWLkFMTCwgLi4uZW50cnkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcGVuZGluZ1VubGlua3MuZGVsZXRlKHBhdGgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LCB0eXBlb2Ygb3B0cy5hdG9taWMgPT09ICdudW1iZXInID8gb3B0cy5hdG9taWMgOiAxMDApO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGV2ZW50ID09PSBFVi5BREQgJiYgdGhpcy5fcGVuZGluZ1VubGlua3MuaGFzKHBhdGgpKSB7XG4gICAgICAgICAgICAgICAgZXZlbnQgPSBFVi5DSEFOR0U7XG4gICAgICAgICAgICAgICAgdGhpcy5fcGVuZGluZ1VubGlua3MuZGVsZXRlKHBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChhd2YgJiYgKGV2ZW50ID09PSBFVi5BREQgfHwgZXZlbnQgPT09IEVWLkNIQU5HRSkgJiYgdGhpcy5fcmVhZHlFbWl0dGVkKSB7XG4gICAgICAgICAgICBjb25zdCBhd2ZFbWl0ID0gKGVyciwgc3RhdHMpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50ID0gRVYuRVJST1I7XG4gICAgICAgICAgICAgICAgICAgIGFyZ3NbMF0gPSBlcnI7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdFdpdGhBbGwoZXZlbnQsIGFyZ3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChzdGF0cykge1xuICAgICAgICAgICAgICAgICAgICAvLyBpZiBzdGF0cyBkb2Vzbid0IGV4aXN0IHRoZSBmaWxlIG11c3QgaGF2ZSBiZWVuIGRlbGV0ZWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJnc1sxXSA9IHN0YXRzO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5wdXNoKHN0YXRzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXRXaXRoQWxsKGV2ZW50LCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5fYXdhaXRXcml0ZUZpbmlzaChwYXRoLCBhd2Yuc3RhYmlsaXR5VGhyZXNob2xkLCBldmVudCwgYXdmRW1pdCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZXZlbnQgPT09IEVWLkNIQU5HRSkge1xuICAgICAgICAgICAgY29uc3QgaXNUaHJvdHRsZWQgPSAhdGhpcy5fdGhyb3R0bGUoRVYuQ0hBTkdFLCBwYXRoLCA1MCk7XG4gICAgICAgICAgICBpZiAoaXNUaHJvdHRsZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdHMuYWx3YXlzU3RhdCAmJlxuICAgICAgICAgICAgc3RhdHMgPT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgKGV2ZW50ID09PSBFVi5BREQgfHwgZXZlbnQgPT09IEVWLkFERF9ESVIgfHwgZXZlbnQgPT09IEVWLkNIQU5HRSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gb3B0cy5jd2QgPyBzeXNQYXRoLmpvaW4ob3B0cy5jd2QsIHBhdGgpIDogcGF0aDtcbiAgICAgICAgICAgIGxldCBzdGF0cztcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgc3RhdHMgPSBhd2FpdCBzdGF0KGZ1bGxQYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAvLyBkbyBub3RoaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBTdXBwcmVzcyBldmVudCB3aGVuIGZzX3N0YXQgZmFpbHMsIHRvIGF2b2lkIHNlbmRpbmcgdW5kZWZpbmVkICdzdGF0J1xuICAgICAgICAgICAgaWYgKCFzdGF0cyB8fCB0aGlzLmNsb3NlZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBhcmdzLnB1c2goc3RhdHMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZW1pdFdpdGhBbGwoZXZlbnQsIGFyZ3MpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ29tbW9uIGhhbmRsZXIgZm9yIGVycm9yc1xuICAgICAqIEByZXR1cm5zIFRoZSBlcnJvciBpZiBkZWZpbmVkLCBvdGhlcndpc2UgdGhlIHZhbHVlIG9mIHRoZSBGU1dhdGNoZXIgaW5zdGFuY2UncyBgY2xvc2VkYCBmbGFnXG4gICAgICovXG4gICAgX2hhbmRsZUVycm9yKGVycm9yKSB7XG4gICAgICAgIGNvbnN0IGNvZGUgPSBlcnJvciAmJiBlcnJvci5jb2RlO1xuICAgICAgICBpZiAoZXJyb3IgJiZcbiAgICAgICAgICAgIGNvZGUgIT09ICdFTk9FTlQnICYmXG4gICAgICAgICAgICBjb2RlICE9PSAnRU5PVERJUicgJiZcbiAgICAgICAgICAgICghdGhpcy5vcHRpb25zLmlnbm9yZVBlcm1pc3Npb25FcnJvcnMgfHwgKGNvZGUgIT09ICdFUEVSTScgJiYgY29kZSAhPT0gJ0VBQ0NFUycpKSkge1xuICAgICAgICAgICAgdGhpcy5lbWl0KEVWLkVSUk9SLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVycm9yIHx8IHRoaXMuY2xvc2VkO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBIZWxwZXIgdXRpbGl0eSBmb3IgdGhyb3R0bGluZ1xuICAgICAqIEBwYXJhbSBhY3Rpb25UeXBlIHR5cGUgYmVpbmcgdGhyb3R0bGVkXG4gICAgICogQHBhcmFtIHBhdGggYmVpbmcgYWN0ZWQgdXBvblxuICAgICAqIEBwYXJhbSB0aW1lb3V0IGR1cmF0aW9uIG9mIHRpbWUgdG8gc3VwcHJlc3MgZHVwbGljYXRlIGFjdGlvbnNcbiAgICAgKiBAcmV0dXJucyB0cmFja2luZyBvYmplY3Qgb3IgZmFsc2UgaWYgYWN0aW9uIHNob3VsZCBiZSBzdXBwcmVzc2VkXG4gICAgICovXG4gICAgX3Rocm90dGxlKGFjdGlvblR5cGUsIHBhdGgsIHRpbWVvdXQpIHtcbiAgICAgICAgaWYgKCF0aGlzLl90aHJvdHRsZWQuaGFzKGFjdGlvblR5cGUpKSB7XG4gICAgICAgICAgICB0aGlzLl90aHJvdHRsZWQuc2V0KGFjdGlvblR5cGUsIG5ldyBNYXAoKSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYWN0aW9uID0gdGhpcy5fdGhyb3R0bGVkLmdldChhY3Rpb25UeXBlKTtcbiAgICAgICAgaWYgKCFhY3Rpb24pXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgdGhyb3R0bGUnKTtcbiAgICAgICAgY29uc3QgYWN0aW9uUGF0aCA9IGFjdGlvbi5nZXQocGF0aCk7XG4gICAgICAgIGlmIChhY3Rpb25QYXRoKSB7XG4gICAgICAgICAgICBhY3Rpb25QYXRoLmNvdW50Kys7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHByZWZlci1jb25zdFxuICAgICAgICBsZXQgdGltZW91dE9iamVjdDtcbiAgICAgICAgY29uc3QgY2xlYXIgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpdGVtID0gYWN0aW9uLmdldChwYXRoKTtcbiAgICAgICAgICAgIGNvbnN0IGNvdW50ID0gaXRlbSA/IGl0ZW0uY291bnQgOiAwO1xuICAgICAgICAgICAgYWN0aW9uLmRlbGV0ZShwYXRoKTtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0T2JqZWN0KTtcbiAgICAgICAgICAgIGlmIChpdGVtKVxuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChpdGVtLnRpbWVvdXRPYmplY3QpO1xuICAgICAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgICAgICB9O1xuICAgICAgICB0aW1lb3V0T2JqZWN0ID0gc2V0VGltZW91dChjbGVhciwgdGltZW91dCk7XG4gICAgICAgIGNvbnN0IHRociA9IHsgdGltZW91dE9iamVjdCwgY2xlYXIsIGNvdW50OiAwIH07XG4gICAgICAgIGFjdGlvbi5zZXQocGF0aCwgdGhyKTtcbiAgICAgICAgcmV0dXJuIHRocjtcbiAgICB9XG4gICAgX2luY3JSZWFkeUNvdW50KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcmVhZHlDb3VudCsrO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBd2FpdHMgd3JpdGUgb3BlcmF0aW9uIHRvIGZpbmlzaC5cbiAgICAgKiBQb2xscyBhIG5ld2x5IGNyZWF0ZWQgZmlsZSBmb3Igc2l6ZSB2YXJpYXRpb25zLiBXaGVuIGZpbGVzIHNpemUgZG9lcyBub3QgY2hhbmdlIGZvciAndGhyZXNob2xkJyBtaWxsaXNlY29uZHMgY2FsbHMgY2FsbGJhY2suXG4gICAgICogQHBhcmFtIHBhdGggYmVpbmcgYWN0ZWQgdXBvblxuICAgICAqIEBwYXJhbSB0aHJlc2hvbGQgVGltZSBpbiBtaWxsaXNlY29uZHMgYSBmaWxlIHNpemUgbXVzdCBiZSBmaXhlZCBiZWZvcmUgYWNrbm93bGVkZ2luZyB3cml0ZSBPUCBpcyBmaW5pc2hlZFxuICAgICAqIEBwYXJhbSBldmVudFxuICAgICAqIEBwYXJhbSBhd2ZFbWl0IENhbGxiYWNrIHRvIGJlIGNhbGxlZCB3aGVuIHJlYWR5IGZvciBldmVudCB0byBiZSBlbWl0dGVkLlxuICAgICAqL1xuICAgIF9hd2FpdFdyaXRlRmluaXNoKHBhdGgsIHRocmVzaG9sZCwgZXZlbnQsIGF3ZkVtaXQpIHtcbiAgICAgICAgY29uc3QgYXdmID0gdGhpcy5vcHRpb25zLmF3YWl0V3JpdGVGaW5pc2g7XG4gICAgICAgIGlmICh0eXBlb2YgYXdmICE9PSAnb2JqZWN0JylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY29uc3QgcG9sbEludGVydmFsID0gYXdmLnBvbGxJbnRlcnZhbDtcbiAgICAgICAgbGV0IHRpbWVvdXRIYW5kbGVyO1xuICAgICAgICBsZXQgZnVsbFBhdGggPSBwYXRoO1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmN3ZCAmJiAhc3lzUGF0aC5pc0Fic29sdXRlKHBhdGgpKSB7XG4gICAgICAgICAgICBmdWxsUGF0aCA9IHN5c1BhdGguam9pbih0aGlzLm9wdGlvbnMuY3dkLCBwYXRoKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgICBjb25zdCB3cml0ZXMgPSB0aGlzLl9wZW5kaW5nV3JpdGVzO1xuICAgICAgICBmdW5jdGlvbiBhd2FpdFdyaXRlRmluaXNoRm4ocHJldlN0YXQpIHtcbiAgICAgICAgICAgIHN0YXRjYihmdWxsUGF0aCwgKGVyciwgY3VyU3RhdCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIgfHwgIXdyaXRlcy5oYXMocGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVyciAmJiBlcnIuY29kZSAhPT0gJ0VOT0VOVCcpXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2ZFbWl0KGVycik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3Qgbm93ID0gTnVtYmVyKG5ldyBEYXRlKCkpO1xuICAgICAgICAgICAgICAgIGlmIChwcmV2U3RhdCAmJiBjdXJTdGF0LnNpemUgIT09IHByZXZTdGF0LnNpemUpIHtcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVzLmdldChwYXRoKS5sYXN0Q2hhbmdlID0gbm93O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBwdyA9IHdyaXRlcy5nZXQocGF0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGYgPSBub3cgLSBwdy5sYXN0Q2hhbmdlO1xuICAgICAgICAgICAgICAgIGlmIChkZiA+PSB0aHJlc2hvbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVzLmRlbGV0ZShwYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgYXdmRW1pdCh1bmRlZmluZWQsIGN1clN0YXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGltZW91dEhhbmRsZXIgPSBzZXRUaW1lb3V0KGF3YWl0V3JpdGVGaW5pc2hGbiwgcG9sbEludGVydmFsLCBjdXJTdGF0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXdyaXRlcy5oYXMocGF0aCkpIHtcbiAgICAgICAgICAgIHdyaXRlcy5zZXQocGF0aCwge1xuICAgICAgICAgICAgICAgIGxhc3RDaGFuZ2U6IG5vdyxcbiAgICAgICAgICAgICAgICBjYW5jZWxXYWl0OiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHdyaXRlcy5kZWxldGUocGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SGFuZGxlcik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBldmVudDtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aW1lb3V0SGFuZGxlciA9IHNldFRpbWVvdXQoYXdhaXRXcml0ZUZpbmlzaEZuLCBwb2xsSW50ZXJ2YWwpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIERldGVybWluZXMgd2hldGhlciB1c2VyIGhhcyBhc2tlZCB0byBpZ25vcmUgdGhpcyBwYXRoLlxuICAgICAqL1xuICAgIF9pc0lnbm9yZWQocGF0aCwgc3RhdHMpIHtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5hdG9taWMgJiYgRE9UX1JFLnRlc3QocGF0aCkpXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgaWYgKCF0aGlzLl91c2VySWdub3JlZCkge1xuICAgICAgICAgICAgY29uc3QgeyBjd2QgfSA9IHRoaXMub3B0aW9ucztcbiAgICAgICAgICAgIGNvbnN0IGlnbiA9IHRoaXMub3B0aW9ucy5pZ25vcmVkO1xuICAgICAgICAgICAgY29uc3QgaWdub3JlZCA9IChpZ24gfHwgW10pLm1hcChub3JtYWxpemVJZ25vcmVkKGN3ZCkpO1xuICAgICAgICAgICAgY29uc3QgaWdub3JlZFBhdGhzID0gWy4uLnRoaXMuX2lnbm9yZWRQYXRoc107XG4gICAgICAgICAgICBjb25zdCBsaXN0ID0gWy4uLmlnbm9yZWRQYXRocy5tYXAobm9ybWFsaXplSWdub3JlZChjd2QpKSwgLi4uaWdub3JlZF07XG4gICAgICAgICAgICB0aGlzLl91c2VySWdub3JlZCA9IGFueW1hdGNoKGxpc3QsIHVuZGVmaW5lZCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3VzZXJJZ25vcmVkKHBhdGgsIHN0YXRzKTtcbiAgICB9XG4gICAgX2lzbnRJZ25vcmVkKHBhdGgsIHN0YXQpIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLl9pc0lnbm9yZWQocGF0aCwgc3RhdCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFByb3ZpZGVzIGEgc2V0IG9mIGNvbW1vbiBoZWxwZXJzIGFuZCBwcm9wZXJ0aWVzIHJlbGF0aW5nIHRvIHN5bWxpbmsgaGFuZGxpbmcuXG4gICAgICogQHBhcmFtIHBhdGggZmlsZSBvciBkaXJlY3RvcnkgcGF0dGVybiBiZWluZyB3YXRjaGVkXG4gICAgICovXG4gICAgX2dldFdhdGNoSGVscGVycyhwYXRoKSB7XG4gICAgICAgIHJldHVybiBuZXcgV2F0Y2hIZWxwZXIocGF0aCwgdGhpcy5vcHRpb25zLmZvbGxvd1N5bWxpbmtzLCB0aGlzKTtcbiAgICB9XG4gICAgLy8gRGlyZWN0b3J5IGhlbHBlcnNcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8qKlxuICAgICAqIFByb3ZpZGVzIGRpcmVjdG9yeSB0cmFja2luZyBvYmplY3RzXG4gICAgICogQHBhcmFtIGRpcmVjdG9yeSBwYXRoIG9mIHRoZSBkaXJlY3RvcnlcbiAgICAgKi9cbiAgICBfZ2V0V2F0Y2hlZERpcihkaXJlY3RvcnkpIHtcbiAgICAgICAgY29uc3QgZGlyID0gc3lzUGF0aC5yZXNvbHZlKGRpcmVjdG9yeSk7XG4gICAgICAgIGlmICghdGhpcy5fd2F0Y2hlZC5oYXMoZGlyKSlcbiAgICAgICAgICAgIHRoaXMuX3dhdGNoZWQuc2V0KGRpciwgbmV3IERpckVudHJ5KGRpciwgdGhpcy5fYm91bmRSZW1vdmUpKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dhdGNoZWQuZ2V0KGRpcik7XG4gICAgfVxuICAgIC8vIEZpbGUgaGVscGVyc1xuICAgIC8vIC0tLS0tLS0tLS0tLVxuICAgIC8qKlxuICAgICAqIENoZWNrIGZvciByZWFkIHBlcm1pc3Npb25zOiBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMTE3ODE0MDQvMTM1ODQwNVxuICAgICAqL1xuICAgIF9oYXNSZWFkUGVybWlzc2lvbnMoc3RhdHMpIHtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5pZ25vcmVQZXJtaXNzaW9uRXJyb3JzKVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIHJldHVybiBCb29sZWFuKE51bWJlcihzdGF0cy5tb2RlKSAmIDBvNDAwKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogSGFuZGxlcyBlbWl0dGluZyB1bmxpbmsgZXZlbnRzIGZvclxuICAgICAqIGZpbGVzIGFuZCBkaXJlY3RvcmllcywgYW5kIHZpYSByZWN1cnNpb24sIGZvclxuICAgICAqIGZpbGVzIGFuZCBkaXJlY3RvcmllcyB3aXRoaW4gZGlyZWN0b3JpZXMgdGhhdCBhcmUgdW5saW5rZWRcbiAgICAgKiBAcGFyYW0gZGlyZWN0b3J5IHdpdGhpbiB3aGljaCB0aGUgZm9sbG93aW5nIGl0ZW0gaXMgbG9jYXRlZFxuICAgICAqIEBwYXJhbSBpdGVtICAgICAgYmFzZSBwYXRoIG9mIGl0ZW0vZGlyZWN0b3J5XG4gICAgICovXG4gICAgX3JlbW92ZShkaXJlY3RvcnksIGl0ZW0sIGlzRGlyZWN0b3J5KSB7XG4gICAgICAgIC8vIGlmIHdoYXQgaXMgYmVpbmcgZGVsZXRlZCBpcyBhIGRpcmVjdG9yeSwgZ2V0IHRoYXQgZGlyZWN0b3J5J3MgcGF0aHNcbiAgICAgICAgLy8gZm9yIHJlY3Vyc2l2ZSBkZWxldGluZyBhbmQgY2xlYW5pbmcgb2Ygd2F0Y2hlZCBvYmplY3RcbiAgICAgICAgLy8gaWYgaXQgaXMgbm90IGEgZGlyZWN0b3J5LCBuZXN0ZWREaXJlY3RvcnlDaGlsZHJlbiB3aWxsIGJlIGVtcHR5IGFycmF5XG4gICAgICAgIGNvbnN0IHBhdGggPSBzeXNQYXRoLmpvaW4oZGlyZWN0b3J5LCBpdGVtKTtcbiAgICAgICAgY29uc3QgZnVsbFBhdGggPSBzeXNQYXRoLnJlc29sdmUocGF0aCk7XG4gICAgICAgIGlzRGlyZWN0b3J5ID1cbiAgICAgICAgICAgIGlzRGlyZWN0b3J5ICE9IG51bGwgPyBpc0RpcmVjdG9yeSA6IHRoaXMuX3dhdGNoZWQuaGFzKHBhdGgpIHx8IHRoaXMuX3dhdGNoZWQuaGFzKGZ1bGxQYXRoKTtcbiAgICAgICAgLy8gcHJldmVudCBkdXBsaWNhdGUgaGFuZGxpbmcgaW4gY2FzZSBvZiBhcnJpdmluZyBoZXJlIG5lYXJseSBzaW11bHRhbmVvdXNseVxuICAgICAgICAvLyB2aWEgbXVsdGlwbGUgcGF0aHMgKHN1Y2ggYXMgX2hhbmRsZUZpbGUgYW5kIF9oYW5kbGVEaXIpXG4gICAgICAgIGlmICghdGhpcy5fdGhyb3R0bGUoJ3JlbW92ZScsIHBhdGgsIDEwMCkpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIC8vIGlmIHRoZSBvbmx5IHdhdGNoZWQgZmlsZSBpcyByZW1vdmVkLCB3YXRjaCBmb3IgaXRzIHJldHVyblxuICAgICAgICBpZiAoIWlzRGlyZWN0b3J5ICYmIHRoaXMuX3dhdGNoZWQuc2l6ZSA9PT0gMSkge1xuICAgICAgICAgICAgdGhpcy5hZGQoZGlyZWN0b3J5LCBpdGVtLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUaGlzIHdpbGwgY3JlYXRlIGEgbmV3IGVudHJ5IGluIHRoZSB3YXRjaGVkIG9iamVjdCBpbiBlaXRoZXIgY2FzZVxuICAgICAgICAvLyBzbyB3ZSBnb3QgdG8gZG8gdGhlIGRpcmVjdG9yeSBjaGVjayBiZWZvcmVoYW5kXG4gICAgICAgIGNvbnN0IHdwID0gdGhpcy5fZ2V0V2F0Y2hlZERpcihwYXRoKTtcbiAgICAgICAgY29uc3QgbmVzdGVkRGlyZWN0b3J5Q2hpbGRyZW4gPSB3cC5nZXRDaGlsZHJlbigpO1xuICAgICAgICAvLyBSZWN1cnNpdmVseSByZW1vdmUgY2hpbGRyZW4gZGlyZWN0b3JpZXMgLyBmaWxlcy5cbiAgICAgICAgbmVzdGVkRGlyZWN0b3J5Q2hpbGRyZW4uZm9yRWFjaCgobmVzdGVkKSA9PiB0aGlzLl9yZW1vdmUocGF0aCwgbmVzdGVkKSk7XG4gICAgICAgIC8vIENoZWNrIGlmIGl0ZW0gd2FzIG9uIHRoZSB3YXRjaGVkIGxpc3QgYW5kIHJlbW92ZSBpdFxuICAgICAgICBjb25zdCBwYXJlbnQgPSB0aGlzLl9nZXRXYXRjaGVkRGlyKGRpcmVjdG9yeSk7XG4gICAgICAgIGNvbnN0IHdhc1RyYWNrZWQgPSBwYXJlbnQuaGFzKGl0ZW0pO1xuICAgICAgICBwYXJlbnQucmVtb3ZlKGl0ZW0pO1xuICAgICAgICAvLyBGaXhlcyBpc3N1ZSAjMTA0MiAtPiBSZWxhdGl2ZSBwYXRocyB3ZXJlIGRldGVjdGVkIGFuZCBhZGRlZCBhcyBzeW1saW5rc1xuICAgICAgICAvLyAoaHR0cHM6Ly9naXRodWIuY29tL3BhdWxtaWxsci9jaG9raWRhci9ibG9iL2UxNzUzZGRiYzk1NzFiZGMzM2I0YTRhZjE3MmQ1MmNiNmU2MTFjMTAvbGliL25vZGVmcy1oYW5kbGVyLmpzI0w2MTIpLFxuICAgICAgICAvLyBidXQgbmV2ZXIgcmVtb3ZlZCBmcm9tIHRoZSBtYXAgaW4gY2FzZSB0aGUgcGF0aCB3YXMgZGVsZXRlZC5cbiAgICAgICAgLy8gVGhpcyBsZWFkcyB0byBhbiBpbmNvcnJlY3Qgc3RhdGUgaWYgdGhlIHBhdGggd2FzIHJlY3JlYXRlZDpcbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3BhdWxtaWxsci9jaG9raWRhci9ibG9iL2UxNzUzZGRiYzk1NzFiZGMzM2I0YTRhZjE3MmQ1MmNiNmU2MTFjMTAvbGliL25vZGVmcy1oYW5kbGVyLmpzI0w1NTNcbiAgICAgICAgaWYgKHRoaXMuX3N5bWxpbmtQYXRocy5oYXMoZnVsbFBhdGgpKSB7XG4gICAgICAgICAgICB0aGlzLl9zeW1saW5rUGF0aHMuZGVsZXRlKGZ1bGxQYXRoKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBJZiB3ZSB3YWl0IGZvciB0aGlzIGZpbGUgdG8gYmUgZnVsbHkgd3JpdHRlbiwgY2FuY2VsIHRoZSB3YWl0LlxuICAgICAgICBsZXQgcmVsUGF0aCA9IHBhdGg7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuY3dkKVxuICAgICAgICAgICAgcmVsUGF0aCA9IHN5c1BhdGgucmVsYXRpdmUodGhpcy5vcHRpb25zLmN3ZCwgcGF0aCk7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuYXdhaXRXcml0ZUZpbmlzaCAmJiB0aGlzLl9wZW5kaW5nV3JpdGVzLmhhcyhyZWxQYXRoKSkge1xuICAgICAgICAgICAgY29uc3QgZXZlbnQgPSB0aGlzLl9wZW5kaW5nV3JpdGVzLmdldChyZWxQYXRoKS5jYW5jZWxXYWl0KCk7XG4gICAgICAgICAgICBpZiAoZXZlbnQgPT09IEVWLkFERClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGhlIEVudHJ5IHdpbGwgZWl0aGVyIGJlIGEgZGlyZWN0b3J5IHRoYXQganVzdCBnb3QgcmVtb3ZlZFxuICAgICAgICAvLyBvciBhIGJvZ3VzIGVudHJ5IHRvIGEgZmlsZSwgaW4gZWl0aGVyIGNhc2Ugd2UgaGF2ZSB0byByZW1vdmUgaXRcbiAgICAgICAgdGhpcy5fd2F0Y2hlZC5kZWxldGUocGF0aCk7XG4gICAgICAgIHRoaXMuX3dhdGNoZWQuZGVsZXRlKGZ1bGxQYXRoKTtcbiAgICAgICAgY29uc3QgZXZlbnROYW1lID0gaXNEaXJlY3RvcnkgPyBFVi5VTkxJTktfRElSIDogRVYuVU5MSU5LO1xuICAgICAgICBpZiAod2FzVHJhY2tlZCAmJiAhdGhpcy5faXNJZ25vcmVkKHBhdGgpKVxuICAgICAgICAgICAgdGhpcy5fZW1pdChldmVudE5hbWUsIHBhdGgpO1xuICAgICAgICAvLyBBdm9pZCBjb25mbGljdHMgaWYgd2UgbGF0ZXIgY3JlYXRlIGFub3RoZXIgZmlsZSB3aXRoIHRoZSBzYW1lIG5hbWVcbiAgICAgICAgdGhpcy5fY2xvc2VQYXRoKHBhdGgpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDbG9zZXMgYWxsIHdhdGNoZXJzIGZvciBhIHBhdGhcbiAgICAgKi9cbiAgICBfY2xvc2VQYXRoKHBhdGgpIHtcbiAgICAgICAgdGhpcy5fY2xvc2VGaWxlKHBhdGgpO1xuICAgICAgICBjb25zdCBkaXIgPSBzeXNQYXRoLmRpcm5hbWUocGF0aCk7XG4gICAgICAgIHRoaXMuX2dldFdhdGNoZWREaXIoZGlyKS5yZW1vdmUoc3lzUGF0aC5iYXNlbmFtZShwYXRoKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsb3NlcyBvbmx5IGZpbGUtc3BlY2lmaWMgd2F0Y2hlcnNcbiAgICAgKi9cbiAgICBfY2xvc2VGaWxlKHBhdGgpIHtcbiAgICAgICAgY29uc3QgY2xvc2VycyA9IHRoaXMuX2Nsb3NlcnMuZ2V0KHBhdGgpO1xuICAgICAgICBpZiAoIWNsb3NlcnMpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGNsb3NlcnMuZm9yRWFjaCgoY2xvc2VyKSA9PiBjbG9zZXIoKSk7XG4gICAgICAgIHRoaXMuX2Nsb3NlcnMuZGVsZXRlKHBhdGgpO1xuICAgIH1cbiAgICBfYWRkUGF0aENsb3NlcihwYXRoLCBjbG9zZXIpIHtcbiAgICAgICAgaWYgKCFjbG9zZXIpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGxldCBsaXN0ID0gdGhpcy5fY2xvc2Vycy5nZXQocGF0aCk7XG4gICAgICAgIGlmICghbGlzdCkge1xuICAgICAgICAgICAgbGlzdCA9IFtdO1xuICAgICAgICAgICAgdGhpcy5fY2xvc2Vycy5zZXQocGF0aCwgbGlzdCk7XG4gICAgICAgIH1cbiAgICAgICAgbGlzdC5wdXNoKGNsb3Nlcik7XG4gICAgfVxuICAgIF9yZWFkZGlycChyb290LCBvcHRzKSB7XG4gICAgICAgIGlmICh0aGlzLmNsb3NlZClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHsgdHlwZTogRVYuQUxMLCBhbHdheXNTdGF0OiB0cnVlLCBsc3RhdDogdHJ1ZSwgLi4ub3B0cywgZGVwdGg6IDAgfTtcbiAgICAgICAgbGV0IHN0cmVhbSA9IHJlYWRkaXJwKHJvb3QsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLl9zdHJlYW1zLmFkZChzdHJlYW0pO1xuICAgICAgICBzdHJlYW0ub25jZShTVFJfQ0xPU0UsICgpID0+IHtcbiAgICAgICAgICAgIHN0cmVhbSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfSk7XG4gICAgICAgIHN0cmVhbS5vbmNlKFNUUl9FTkQsICgpID0+IHtcbiAgICAgICAgICAgIGlmIChzdHJlYW0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zdHJlYW1zLmRlbGV0ZShzdHJlYW0pO1xuICAgICAgICAgICAgICAgIHN0cmVhbSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdHJlYW07XG4gICAgfVxufVxuLyoqXG4gKiBJbnN0YW50aWF0ZXMgd2F0Y2hlciB3aXRoIHBhdGhzIHRvIGJlIHRyYWNrZWQuXG4gKiBAcGFyYW0gcGF0aHMgZmlsZSAvIGRpcmVjdG9yeSBwYXRoc1xuICogQHBhcmFtIG9wdGlvbnMgb3B0cywgc3VjaCBhcyBgYXRvbWljYCwgYGF3YWl0V3JpdGVGaW5pc2hgLCBgaWdub3JlZGAsIGFuZCBvdGhlcnNcbiAqIEByZXR1cm5zIGFuIGluc3RhbmNlIG9mIEZTV2F0Y2hlciBmb3IgY2hhaW5pbmcuXG4gKiBAZXhhbXBsZVxuICogY29uc3Qgd2F0Y2hlciA9IHdhdGNoKCcuJykub24oJ2FsbCcsIChldmVudCwgcGF0aCkgPT4geyBjb25zb2xlLmxvZyhldmVudCwgcGF0aCk7IH0pO1xuICogd2F0Y2goJy4nLCB7IGF0b21pYzogdHJ1ZSwgYXdhaXRXcml0ZUZpbmlzaDogdHJ1ZSwgaWdub3JlZDogKGYsIHN0YXRzKSA9PiBzdGF0cz8uaXNGaWxlKCkgJiYgIWYuZW5kc1dpdGgoJy5qcycpIH0pXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3YXRjaChwYXRocywgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3Qgd2F0Y2hlciA9IG5ldyBGU1dhdGNoZXIob3B0aW9ucyk7XG4gICAgd2F0Y2hlci5hZGQocGF0aHMpO1xuICAgIHJldHVybiB3YXRjaGVyO1xufVxuZXhwb3J0IGRlZmF1bHQgeyB3YXRjaCwgRlNXYXRjaGVyIH07XG4iLCAiaW1wb3J0IHsgc3RhdCwgbHN0YXQsIHJlYWRkaXIsIHJlYWxwYXRoIH0gZnJvbSAnbm9kZTpmcy9wcm9taXNlcyc7XG5pbXBvcnQgeyBSZWFkYWJsZSB9IGZyb20gJ25vZGU6c3RyZWFtJztcbmltcG9ydCB7IHJlc29sdmUgYXMgcHJlc29sdmUsIHJlbGF0aXZlIGFzIHByZWxhdGl2ZSwgam9pbiBhcyBwam9pbiwgc2VwIGFzIHBzZXAgfSBmcm9tICdub2RlOnBhdGgnO1xuZXhwb3J0IGNvbnN0IEVudHJ5VHlwZXMgPSB7XG4gICAgRklMRV9UWVBFOiAnZmlsZXMnLFxuICAgIERJUl9UWVBFOiAnZGlyZWN0b3JpZXMnLFxuICAgIEZJTEVfRElSX1RZUEU6ICdmaWxlc19kaXJlY3RvcmllcycsXG4gICAgRVZFUllUSElOR19UWVBFOiAnYWxsJyxcbn07XG5jb25zdCBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICByb290OiAnLicsXG4gICAgZmlsZUZpbHRlcjogKF9lbnRyeUluZm8pID0+IHRydWUsXG4gICAgZGlyZWN0b3J5RmlsdGVyOiAoX2VudHJ5SW5mbykgPT4gdHJ1ZSxcbiAgICB0eXBlOiBFbnRyeVR5cGVzLkZJTEVfVFlQRSxcbiAgICBsc3RhdDogZmFsc2UsXG4gICAgZGVwdGg6IDIxNDc0ODM2NDgsXG4gICAgYWx3YXlzU3RhdDogZmFsc2UsXG4gICAgaGlnaFdhdGVyTWFyazogNDA5Nixcbn07XG5PYmplY3QuZnJlZXplKGRlZmF1bHRPcHRpb25zKTtcbmNvbnN0IFJFQ1VSU0lWRV9FUlJPUl9DT0RFID0gJ1JFQURESVJQX1JFQ1VSU0lWRV9FUlJPUic7XG5jb25zdCBOT1JNQUxfRkxPV19FUlJPUlMgPSBuZXcgU2V0KFsnRU5PRU5UJywgJ0VQRVJNJywgJ0VBQ0NFUycsICdFTE9PUCcsIFJFQ1VSU0lWRV9FUlJPUl9DT0RFXSk7XG5jb25zdCBBTExfVFlQRVMgPSBbXG4gICAgRW50cnlUeXBlcy5ESVJfVFlQRSxcbiAgICBFbnRyeVR5cGVzLkVWRVJZVEhJTkdfVFlQRSxcbiAgICBFbnRyeVR5cGVzLkZJTEVfRElSX1RZUEUsXG4gICAgRW50cnlUeXBlcy5GSUxFX1RZUEUsXG5dO1xuY29uc3QgRElSX1RZUEVTID0gbmV3IFNldChbXG4gICAgRW50cnlUeXBlcy5ESVJfVFlQRSxcbiAgICBFbnRyeVR5cGVzLkVWRVJZVEhJTkdfVFlQRSxcbiAgICBFbnRyeVR5cGVzLkZJTEVfRElSX1RZUEUsXG5dKTtcbmNvbnN0IEZJTEVfVFlQRVMgPSBuZXcgU2V0KFtcbiAgICBFbnRyeVR5cGVzLkVWRVJZVEhJTkdfVFlQRSxcbiAgICBFbnRyeVR5cGVzLkZJTEVfRElSX1RZUEUsXG4gICAgRW50cnlUeXBlcy5GSUxFX1RZUEUsXG5dKTtcbmNvbnN0IGlzTm9ybWFsRmxvd0Vycm9yID0gKGVycm9yKSA9PiBOT1JNQUxfRkxPV19FUlJPUlMuaGFzKGVycm9yLmNvZGUpO1xuY29uc3Qgd2FudEJpZ2ludEZzU3RhdHMgPSBwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInO1xuY29uc3QgZW1wdHlGbiA9IChfZW50cnlJbmZvKSA9PiB0cnVlO1xuY29uc3Qgbm9ybWFsaXplRmlsdGVyID0gKGZpbHRlcikgPT4ge1xuICAgIGlmIChmaWx0ZXIgPT09IHVuZGVmaW5lZClcbiAgICAgICAgcmV0dXJuIGVtcHR5Rm47XG4gICAgaWYgKHR5cGVvZiBmaWx0ZXIgPT09ICdmdW5jdGlvbicpXG4gICAgICAgIHJldHVybiBmaWx0ZXI7XG4gICAgaWYgKHR5cGVvZiBmaWx0ZXIgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGNvbnN0IGZsID0gZmlsdGVyLnRyaW0oKTtcbiAgICAgICAgcmV0dXJuIChlbnRyeSkgPT4gZW50cnkuYmFzZW5hbWUgPT09IGZsO1xuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheShmaWx0ZXIpKSB7XG4gICAgICAgIGNvbnN0IHRySXRlbXMgPSBmaWx0ZXIubWFwKChpdGVtKSA9PiBpdGVtLnRyaW0oKSk7XG4gICAgICAgIHJldHVybiAoZW50cnkpID0+IHRySXRlbXMuc29tZSgoZikgPT4gZW50cnkuYmFzZW5hbWUgPT09IGYpO1xuICAgIH1cbiAgICByZXR1cm4gZW1wdHlGbjtcbn07XG4vKiogUmVhZGFibGUgcmVhZGRpciBzdHJlYW0sIGVtaXR0aW5nIG5ldyBmaWxlcyBhcyB0aGV5J3JlIGJlaW5nIGxpc3RlZC4gKi9cbmV4cG9ydCBjbGFzcyBSZWFkZGlycFN0cmVhbSBleHRlbmRzIFJlYWRhYmxlIHtcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICAgICAgc3VwZXIoe1xuICAgICAgICAgICAgb2JqZWN0TW9kZTogdHJ1ZSxcbiAgICAgICAgICAgIGF1dG9EZXN0cm95OiB0cnVlLFxuICAgICAgICAgICAgaGlnaFdhdGVyTWFyazogb3B0aW9ucy5oaWdoV2F0ZXJNYXJrLFxuICAgICAgICB9KTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IHsgLi4uZGVmYXVsdE9wdGlvbnMsIC4uLm9wdGlvbnMgfTtcbiAgICAgICAgY29uc3QgeyByb290LCB0eXBlIH0gPSBvcHRzO1xuICAgICAgICB0aGlzLl9maWxlRmlsdGVyID0gbm9ybWFsaXplRmlsdGVyKG9wdHMuZmlsZUZpbHRlcik7XG4gICAgICAgIHRoaXMuX2RpcmVjdG9yeUZpbHRlciA9IG5vcm1hbGl6ZUZpbHRlcihvcHRzLmRpcmVjdG9yeUZpbHRlcik7XG4gICAgICAgIGNvbnN0IHN0YXRNZXRob2QgPSBvcHRzLmxzdGF0ID8gbHN0YXQgOiBzdGF0O1xuICAgICAgICAvLyBVc2UgYmlnaW50IHN0YXRzIGlmIGl0J3Mgd2luZG93cyBhbmQgc3RhdCgpIHN1cHBvcnRzIG9wdGlvbnMgKG5vZGUgMTArKS5cbiAgICAgICAgaWYgKHdhbnRCaWdpbnRGc1N0YXRzKSB7XG4gICAgICAgICAgICB0aGlzLl9zdGF0ID0gKHBhdGgpID0+IHN0YXRNZXRob2QocGF0aCwgeyBiaWdpbnQ6IHRydWUgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zdGF0ID0gc3RhdE1ldGhvZDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9tYXhEZXB0aCA9IG9wdHMuZGVwdGggPz8gZGVmYXVsdE9wdGlvbnMuZGVwdGg7XG4gICAgICAgIHRoaXMuX3dhbnRzRGlyID0gdHlwZSA/IERJUl9UWVBFUy5oYXModHlwZSkgOiBmYWxzZTtcbiAgICAgICAgdGhpcy5fd2FudHNGaWxlID0gdHlwZSA/IEZJTEVfVFlQRVMuaGFzKHR5cGUpIDogZmFsc2U7XG4gICAgICAgIHRoaXMuX3dhbnRzRXZlcnl0aGluZyA9IHR5cGUgPT09IEVudHJ5VHlwZXMuRVZFUllUSElOR19UWVBFO1xuICAgICAgICB0aGlzLl9yb290ID0gcHJlc29sdmUocm9vdCk7XG4gICAgICAgIHRoaXMuX2lzRGlyZW50ID0gIW9wdHMuYWx3YXlzU3RhdDtcbiAgICAgICAgdGhpcy5fc3RhdHNQcm9wID0gdGhpcy5faXNEaXJlbnQgPyAnZGlyZW50JyA6ICdzdGF0cyc7XG4gICAgICAgIHRoaXMuX3JkT3B0aW9ucyA9IHsgZW5jb2Rpbmc6ICd1dGY4Jywgd2l0aEZpbGVUeXBlczogdGhpcy5faXNEaXJlbnQgfTtcbiAgICAgICAgLy8gTGF1bmNoIHN0cmVhbSB3aXRoIG9uZSBwYXJlbnQsIHRoZSByb290IGRpci5cbiAgICAgICAgdGhpcy5wYXJlbnRzID0gW3RoaXMuX2V4cGxvcmVEaXIocm9vdCwgMSldO1xuICAgICAgICB0aGlzLnJlYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5wYXJlbnQgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGFzeW5jIF9yZWFkKGJhdGNoKSB7XG4gICAgICAgIGlmICh0aGlzLnJlYWRpbmcpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRoaXMucmVhZGluZyA9IHRydWU7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB3aGlsZSAoIXRoaXMuZGVzdHJveWVkICYmIGJhdGNoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhciA9IHRoaXMucGFyZW50O1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbCA9IHBhciAmJiBwYXIuZmlsZXM7XG4gICAgICAgICAgICAgICAgaWYgKGZpbCAmJiBmaWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHBhdGgsIGRlcHRoIH0gPSBwYXI7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNsaWNlID0gZmlsLnNwbGljZSgwLCBiYXRjaCkubWFwKChkaXJlbnQpID0+IHRoaXMuX2Zvcm1hdEVudHJ5KGRpcmVudCwgcGF0aCkpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhd2FpdGVkID0gYXdhaXQgUHJvbWlzZS5hbGwoc2xpY2UpO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGF3YWl0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZW50cnkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5kZXN0cm95ZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZW50cnlUeXBlID0gYXdhaXQgdGhpcy5fZ2V0RW50cnlUeXBlKGVudHJ5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbnRyeVR5cGUgPT09ICdkaXJlY3RvcnknICYmIHRoaXMuX2RpcmVjdG9yeUZpbHRlcihlbnRyeSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGVwdGggPD0gdGhpcy5fbWF4RGVwdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wYXJlbnRzLnB1c2godGhpcy5fZXhwbG9yZURpcihlbnRyeS5mdWxsUGF0aCwgZGVwdGggKyAxKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLl93YW50c0Rpcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2goZW50cnkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiYXRjaC0tO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKChlbnRyeVR5cGUgPT09ICdmaWxlJyB8fCB0aGlzLl9pbmNsdWRlQXNGaWxlKGVudHJ5KSkgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9maWxlRmlsdGVyKGVudHJ5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLl93YW50c0ZpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoKGVudHJ5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmF0Y2gtLTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudCA9IHRoaXMucGFyZW50cy5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwYXJlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaChudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGFyZW50ID0gYXdhaXQgcGFyZW50O1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5kZXN0cm95ZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgdGhpcy5kZXN0cm95KGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgICBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMucmVhZGluZyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIGFzeW5jIF9leHBsb3JlRGlyKHBhdGgsIGRlcHRoKSB7XG4gICAgICAgIGxldCBmaWxlcztcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGZpbGVzID0gYXdhaXQgcmVhZGRpcihwYXRoLCB0aGlzLl9yZE9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgdGhpcy5fb25FcnJvcihlcnJvcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgZmlsZXMsIGRlcHRoLCBwYXRoIH07XG4gICAgfVxuICAgIGFzeW5jIF9mb3JtYXRFbnRyeShkaXJlbnQsIHBhdGgpIHtcbiAgICAgICAgbGV0IGVudHJ5O1xuICAgICAgICBjb25zdCBiYXNlbmFtZSA9IHRoaXMuX2lzRGlyZW50ID8gZGlyZW50Lm5hbWUgOiBkaXJlbnQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHByZXNvbHZlKHBqb2luKHBhdGgsIGJhc2VuYW1lKSk7XG4gICAgICAgICAgICBlbnRyeSA9IHsgcGF0aDogcHJlbGF0aXZlKHRoaXMuX3Jvb3QsIGZ1bGxQYXRoKSwgZnVsbFBhdGgsIGJhc2VuYW1lIH07XG4gICAgICAgICAgICBlbnRyeVt0aGlzLl9zdGF0c1Byb3BdID0gdGhpcy5faXNEaXJlbnQgPyBkaXJlbnQgOiBhd2FpdCB0aGlzLl9zdGF0KGZ1bGxQYXRoKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICB0aGlzLl9vbkVycm9yKGVycik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVudHJ5O1xuICAgIH1cbiAgICBfb25FcnJvcihlcnIpIHtcbiAgICAgICAgaWYgKGlzTm9ybWFsRmxvd0Vycm9yKGVycikgJiYgIXRoaXMuZGVzdHJveWVkKSB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ3dhcm4nLCBlcnIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5kZXN0cm95KGVycik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgYXN5bmMgX2dldEVudHJ5VHlwZShlbnRyeSkge1xuICAgICAgICAvLyBlbnRyeSBtYXkgYmUgdW5kZWZpbmVkLCBiZWNhdXNlIGEgd2FybmluZyBvciBhbiBlcnJvciB3ZXJlIGVtaXR0ZWRcbiAgICAgICAgLy8gYW5kIHRoZSBzdGF0c1Byb3AgaXMgdW5kZWZpbmVkXG4gICAgICAgIGlmICghZW50cnkgJiYgdGhpcy5fc3RhdHNQcm9wIGluIGVudHJ5KSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc3RhdHMgPSBlbnRyeVt0aGlzLl9zdGF0c1Byb3BdO1xuICAgICAgICBpZiAoc3RhdHMuaXNGaWxlKCkpXG4gICAgICAgICAgICByZXR1cm4gJ2ZpbGUnO1xuICAgICAgICBpZiAoc3RhdHMuaXNEaXJlY3RvcnkoKSlcbiAgICAgICAgICAgIHJldHVybiAnZGlyZWN0b3J5JztcbiAgICAgICAgaWYgKHN0YXRzICYmIHN0YXRzLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGwgPSBlbnRyeS5mdWxsUGF0aDtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZW50cnlSZWFsUGF0aCA9IGF3YWl0IHJlYWxwYXRoKGZ1bGwpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGVudHJ5UmVhbFBhdGhTdGF0cyA9IGF3YWl0IGxzdGF0KGVudHJ5UmVhbFBhdGgpO1xuICAgICAgICAgICAgICAgIGlmIChlbnRyeVJlYWxQYXRoU3RhdHMuaXNGaWxlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdmaWxlJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGVudHJ5UmVhbFBhdGhTdGF0cy5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxlbiA9IGVudHJ5UmVhbFBhdGgubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZnVsbC5zdGFydHNXaXRoKGVudHJ5UmVhbFBhdGgpICYmIGZ1bGwuc3Vic3RyKGxlbiwgMSkgPT09IHBzZXApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlY3Vyc2l2ZUVycm9yID0gbmV3IEVycm9yKGBDaXJjdWxhciBzeW1saW5rIGRldGVjdGVkOiBcIiR7ZnVsbH1cIiBwb2ludHMgdG8gXCIke2VudHJ5UmVhbFBhdGh9XCJgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlY3Vyc2l2ZUVycm9yLmNvZGUgPSBSRUNVUlNJVkVfRVJST1JfQ09ERTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9vbkVycm9yKHJlY3Vyc2l2ZUVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ2RpcmVjdG9yeSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fb25FcnJvcihlcnJvcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIF9pbmNsdWRlQXNGaWxlKGVudHJ5KSB7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gZW50cnkgJiYgZW50cnlbdGhpcy5fc3RhdHNQcm9wXTtcbiAgICAgICAgcmV0dXJuIHN0YXRzICYmIHRoaXMuX3dhbnRzRXZlcnl0aGluZyAmJiAhc3RhdHMuaXNEaXJlY3RvcnkoKTtcbiAgICB9XG59XG4vKipcbiAqIFN0cmVhbWluZyB2ZXJzaW9uOiBSZWFkcyBhbGwgZmlsZXMgYW5kIGRpcmVjdG9yaWVzIGluIGdpdmVuIHJvb3QgcmVjdXJzaXZlbHkuXG4gKiBDb25zdW1lcyB+Y29uc3RhbnQgc21hbGwgYW1vdW50IG9mIFJBTS5cbiAqIEBwYXJhbSByb290IFJvb3QgZGlyZWN0b3J5XG4gKiBAcGFyYW0gb3B0aW9ucyBPcHRpb25zIHRvIHNwZWNpZnkgcm9vdCAoc3RhcnQgZGlyZWN0b3J5KSwgZmlsdGVycyBhbmQgcmVjdXJzaW9uIGRlcHRoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkZGlycChyb290LCBvcHRpb25zID0ge30pIHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgbGV0IHR5cGUgPSBvcHRpb25zLmVudHJ5VHlwZSB8fCBvcHRpb25zLnR5cGU7XG4gICAgaWYgKHR5cGUgPT09ICdib3RoJylcbiAgICAgICAgdHlwZSA9IEVudHJ5VHlwZXMuRklMRV9ESVJfVFlQRTsgLy8gYmFja3dhcmRzLWNvbXBhdGliaWxpdHlcbiAgICBpZiAodHlwZSlcbiAgICAgICAgb3B0aW9ucy50eXBlID0gdHlwZTtcbiAgICBpZiAoIXJvb3QpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdyZWFkZGlycDogcm9vdCBhcmd1bWVudCBpcyByZXF1aXJlZC4gVXNhZ2U6IHJlYWRkaXJwKHJvb3QsIG9wdGlvbnMpJyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiByb290ICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdyZWFkZGlycDogcm9vdCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nLiBVc2FnZTogcmVhZGRpcnAocm9vdCwgb3B0aW9ucyknKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZSAmJiAhQUxMX1RZUEVTLmluY2x1ZGVzKHR5cGUpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgcmVhZGRpcnA6IEludmFsaWQgdHlwZSBwYXNzZWQuIFVzZSBvbmUgb2YgJHtBTExfVFlQRVMuam9pbignLCAnKX1gKTtcbiAgICB9XG4gICAgb3B0aW9ucy5yb290ID0gcm9vdDtcbiAgICByZXR1cm4gbmV3IFJlYWRkaXJwU3RyZWFtKG9wdGlvbnMpO1xufVxuLyoqXG4gKiBQcm9taXNlIHZlcnNpb246IFJlYWRzIGFsbCBmaWxlcyBhbmQgZGlyZWN0b3JpZXMgaW4gZ2l2ZW4gcm9vdCByZWN1cnNpdmVseS5cbiAqIENvbXBhcmVkIHRvIHN0cmVhbWluZyB2ZXJzaW9uLCB3aWxsIGNvbnN1bWUgYSBsb3Qgb2YgUkFNIGUuZy4gd2hlbiAxIG1pbGxpb24gZmlsZXMgYXJlIGxpc3RlZC5cbiAqIEByZXR1cm5zIGFycmF5IG9mIHBhdGhzIGFuZCB0aGVpciBlbnRyeSBpbmZvc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZGRpcnBQcm9taXNlKHJvb3QsIG9wdGlvbnMgPSB7fSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IGZpbGVzID0gW107XG4gICAgICAgIHJlYWRkaXJwKHJvb3QsIG9wdGlvbnMpXG4gICAgICAgICAgICAub24oJ2RhdGEnLCAoZW50cnkpID0+IGZpbGVzLnB1c2goZW50cnkpKVxuICAgICAgICAgICAgLm9uKCdlbmQnLCAoKSA9PiByZXNvbHZlKGZpbGVzKSlcbiAgICAgICAgICAgIC5vbignZXJyb3InLCAoZXJyb3IpID0+IHJlamVjdChlcnJvcikpO1xuICAgIH0pO1xufVxuZXhwb3J0IGRlZmF1bHQgcmVhZGRpcnA7XG4iLCAiaW1wb3J0IHsgd2F0Y2hGaWxlLCB1bndhdGNoRmlsZSwgd2F0Y2ggYXMgZnNfd2F0Y2ggfSBmcm9tICdmcyc7XG5pbXBvcnQgeyBvcGVuLCBzdGF0LCBsc3RhdCwgcmVhbHBhdGggYXMgZnNyZWFscGF0aCB9IGZyb20gJ2ZzL3Byb21pc2VzJztcbmltcG9ydCAqIGFzIHN5c1BhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyB0eXBlIGFzIG9zVHlwZSB9IGZyb20gJ29zJztcbmV4cG9ydCBjb25zdCBTVFJfREFUQSA9ICdkYXRhJztcbmV4cG9ydCBjb25zdCBTVFJfRU5EID0gJ2VuZCc7XG5leHBvcnQgY29uc3QgU1RSX0NMT1NFID0gJ2Nsb3NlJztcbmV4cG9ydCBjb25zdCBFTVBUWV9GTiA9ICgpID0+IHsgfTtcbmV4cG9ydCBjb25zdCBJREVOVElUWV9GTiA9ICh2YWwpID0+IHZhbDtcbmNvbnN0IHBsID0gcHJvY2Vzcy5wbGF0Zm9ybTtcbmV4cG9ydCBjb25zdCBpc1dpbmRvd3MgPSBwbCA9PT0gJ3dpbjMyJztcbmV4cG9ydCBjb25zdCBpc01hY29zID0gcGwgPT09ICdkYXJ3aW4nO1xuZXhwb3J0IGNvbnN0IGlzTGludXggPSBwbCA9PT0gJ2xpbnV4JztcbmV4cG9ydCBjb25zdCBpc0ZyZWVCU0QgPSBwbCA9PT0gJ2ZyZWVic2QnO1xuZXhwb3J0IGNvbnN0IGlzSUJNaSA9IG9zVHlwZSgpID09PSAnT1M0MDAnO1xuZXhwb3J0IGNvbnN0IEVWRU5UUyA9IHtcbiAgICBBTEw6ICdhbGwnLFxuICAgIFJFQURZOiAncmVhZHknLFxuICAgIEFERDogJ2FkZCcsXG4gICAgQ0hBTkdFOiAnY2hhbmdlJyxcbiAgICBBRERfRElSOiAnYWRkRGlyJyxcbiAgICBVTkxJTks6ICd1bmxpbmsnLFxuICAgIFVOTElOS19ESVI6ICd1bmxpbmtEaXInLFxuICAgIFJBVzogJ3JhdycsXG4gICAgRVJST1I6ICdlcnJvcicsXG59O1xuY29uc3QgRVYgPSBFVkVOVFM7XG5jb25zdCBUSFJPVFRMRV9NT0RFX1dBVENIID0gJ3dhdGNoJztcbmNvbnN0IHN0YXRNZXRob2RzID0geyBsc3RhdCwgc3RhdCB9O1xuY29uc3QgS0VZX0xJU1RFTkVSUyA9ICdsaXN0ZW5lcnMnO1xuY29uc3QgS0VZX0VSUiA9ICdlcnJIYW5kbGVycyc7XG5jb25zdCBLRVlfUkFXID0gJ3Jhd0VtaXR0ZXJzJztcbmNvbnN0IEhBTkRMRVJfS0VZUyA9IFtLRVlfTElTVEVORVJTLCBLRVlfRVJSLCBLRVlfUkFXXTtcbi8vIHByZXR0aWVyLWlnbm9yZVxuY29uc3QgYmluYXJ5RXh0ZW5zaW9ucyA9IG5ldyBTZXQoW1xuICAgICczZG0nLCAnM2RzJywgJzNnMicsICczZ3AnLCAnN3onLCAnYScsICdhYWMnLCAnYWRwJywgJ2FmZGVzaWduJywgJ2FmcGhvdG8nLCAnYWZwdWInLCAnYWknLFxuICAgICdhaWYnLCAnYWlmZicsICdhbHonLCAnYXBlJywgJ2FwaycsICdhcHBpbWFnZScsICdhcicsICdhcmonLCAnYXNmJywgJ2F1JywgJ2F2aScsXG4gICAgJ2JhaycsICdiYW1sJywgJ2JoJywgJ2JpbicsICdiaycsICdibXAnLCAnYnRpZicsICdiejInLCAnYnppcDInLFxuICAgICdjYWInLCAnY2FmJywgJ2NnbScsICdjbGFzcycsICdjbXgnLCAnY3BpbycsICdjcjInLCAnY3VyJywgJ2RhdCcsICdkY20nLCAnZGViJywgJ2RleCcsICdkanZ1JyxcbiAgICAnZGxsJywgJ2RtZycsICdkbmcnLCAnZG9jJywgJ2RvY20nLCAnZG9jeCcsICdkb3QnLCAnZG90bScsICdkcmEnLCAnRFNfU3RvcmUnLCAnZHNrJywgJ2R0cycsXG4gICAgJ2R0c2hkJywgJ2R2YicsICdkd2cnLCAnZHhmJyxcbiAgICAnZWNlbHA0ODAwJywgJ2VjZWxwNzQ3MCcsICdlY2VscDk2MDAnLCAnZWdnJywgJ2VvbCcsICdlb3QnLCAnZXB1YicsICdleGUnLFxuICAgICdmNHYnLCAnZmJzJywgJ2ZoJywgJ2ZsYScsICdmbGFjJywgJ2ZsYXRwYWsnLCAnZmxpJywgJ2ZsdicsICdmcHgnLCAnZnN0JywgJ2Z2dCcsXG4gICAgJ2czJywgJ2doJywgJ2dpZicsICdncmFmZmxlJywgJ2d6JywgJ2d6aXAnLFxuICAgICdoMjYxJywgJ2gyNjMnLCAnaDI2NCcsICdpY25zJywgJ2ljbycsICdpZWYnLCAnaW1nJywgJ2lwYScsICdpc28nLFxuICAgICdqYXInLCAnanBlZycsICdqcGcnLCAnanBndicsICdqcG0nLCAnanhyJywgJ2tleScsICdrdHgnLFxuICAgICdsaGEnLCAnbGliJywgJ2x2cCcsICdseicsICdsemgnLCAnbHptYScsICdsem8nLFxuICAgICdtM3UnLCAnbTRhJywgJ200dicsICdtYXInLCAnbWRpJywgJ21odCcsICdtaWQnLCAnbWlkaScsICdtajInLCAnbWthJywgJ21rdicsICdtbXInLCAnbW5nJyxcbiAgICAnbW9iaScsICdtb3YnLCAnbW92aWUnLCAnbXAzJyxcbiAgICAnbXA0JywgJ21wNGEnLCAnbXBlZycsICdtcGcnLCAnbXBnYScsICdteHUnLFxuICAgICduZWYnLCAnbnB4JywgJ251bWJlcnMnLCAnbnVwa2cnLFxuICAgICdvJywgJ29kcCcsICdvZHMnLCAnb2R0JywgJ29nYScsICdvZ2cnLCAnb2d2JywgJ290ZicsICdvdHQnLFxuICAgICdwYWdlcycsICdwYm0nLCAncGN4JywgJ3BkYicsICdwZGYnLCAncGVhJywgJ3BnbScsICdwaWMnLCAncG5nJywgJ3BubScsICdwb3QnLCAncG90bScsXG4gICAgJ3BvdHgnLCAncHBhJywgJ3BwYW0nLFxuICAgICdwcG0nLCAncHBzJywgJ3Bwc20nLCAncHBzeCcsICdwcHQnLCAncHB0bScsICdwcHR4JywgJ3BzZCcsICdweWEnLCAncHljJywgJ3B5bycsICdweXYnLFxuICAgICdxdCcsXG4gICAgJ3JhcicsICdyYXMnLCAncmF3JywgJ3Jlc291cmNlcycsICdyZ2InLCAncmlwJywgJ3JsYycsICdybWYnLCAncm12YicsICdycG0nLCAncnRmJywgJ3J6JyxcbiAgICAnczNtJywgJ3M3eicsICdzY3B0JywgJ3NnaScsICdzaGFyJywgJ3NuYXAnLCAnc2lsJywgJ3NrZXRjaCcsICdzbGsnLCAnc212JywgJ3NuaycsICdzbycsXG4gICAgJ3N0bCcsICdzdW8nLCAnc3ViJywgJ3N3ZicsXG4gICAgJ3RhcicsICd0YnonLCAndGJ6MicsICd0Z2EnLCAndGd6JywgJ3RobXgnLCAndGlmJywgJ3RpZmYnLCAndGx6JywgJ3R0YycsICd0dGYnLCAndHh6JyxcbiAgICAndWRmJywgJ3V2aCcsICd1dmknLCAndXZtJywgJ3V2cCcsICd1dnMnLCAndXZ1JyxcbiAgICAndml2JywgJ3ZvYicsXG4gICAgJ3dhcicsICd3YXYnLCAnd2F4JywgJ3dibXAnLCAnd2RwJywgJ3dlYmEnLCAnd2VibScsICd3ZWJwJywgJ3dobCcsICd3aW0nLCAnd20nLCAnd21hJyxcbiAgICAnd212JywgJ3dteCcsICd3b2ZmJywgJ3dvZmYyJywgJ3dybScsICd3dngnLFxuICAgICd4Ym0nLCAneGlmJywgJ3hsYScsICd4bGFtJywgJ3hscycsICd4bHNiJywgJ3hsc20nLCAneGxzeCcsICd4bHQnLCAneGx0bScsICd4bHR4JywgJ3htJyxcbiAgICAneG1pbmQnLCAneHBpJywgJ3hwbScsICd4d2QnLCAneHonLFxuICAgICd6JywgJ3ppcCcsICd6aXB4Jyxcbl0pO1xuY29uc3QgaXNCaW5hcnlQYXRoID0gKGZpbGVQYXRoKSA9PiBiaW5hcnlFeHRlbnNpb25zLmhhcyhzeXNQYXRoLmV4dG5hbWUoZmlsZVBhdGgpLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCkpO1xuLy8gVE9ETzogZW1pdCBlcnJvcnMgcHJvcGVybHkuIEV4YW1wbGU6IEVNRklMRSBvbiBNYWNvcy5cbmNvbnN0IGZvcmVhY2ggPSAodmFsLCBmbikgPT4ge1xuICAgIGlmICh2YWwgaW5zdGFuY2VvZiBTZXQpIHtcbiAgICAgICAgdmFsLmZvckVhY2goZm4pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgZm4odmFsKTtcbiAgICB9XG59O1xuY29uc3QgYWRkQW5kQ29udmVydCA9IChtYWluLCBwcm9wLCBpdGVtKSA9PiB7XG4gICAgbGV0IGNvbnRhaW5lciA9IG1haW5bcHJvcF07XG4gICAgaWYgKCEoY29udGFpbmVyIGluc3RhbmNlb2YgU2V0KSkge1xuICAgICAgICBtYWluW3Byb3BdID0gY29udGFpbmVyID0gbmV3IFNldChbY29udGFpbmVyXSk7XG4gICAgfVxuICAgIGNvbnRhaW5lci5hZGQoaXRlbSk7XG59O1xuY29uc3QgY2xlYXJJdGVtID0gKGNvbnQpID0+IChrZXkpID0+IHtcbiAgICBjb25zdCBzZXQgPSBjb250W2tleV07XG4gICAgaWYgKHNldCBpbnN0YW5jZW9mIFNldCkge1xuICAgICAgICBzZXQuY2xlYXIoKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGRlbGV0ZSBjb250W2tleV07XG4gICAgfVxufTtcbmNvbnN0IGRlbEZyb21TZXQgPSAobWFpbiwgcHJvcCwgaXRlbSkgPT4ge1xuICAgIGNvbnN0IGNvbnRhaW5lciA9IG1haW5bcHJvcF07XG4gICAgaWYgKGNvbnRhaW5lciBpbnN0YW5jZW9mIFNldCkge1xuICAgICAgICBjb250YWluZXIuZGVsZXRlKGl0ZW0pO1xuICAgIH1cbiAgICBlbHNlIGlmIChjb250YWluZXIgPT09IGl0ZW0pIHtcbiAgICAgICAgZGVsZXRlIG1haW5bcHJvcF07XG4gICAgfVxufTtcbmNvbnN0IGlzRW1wdHlTZXQgPSAodmFsKSA9PiAodmFsIGluc3RhbmNlb2YgU2V0ID8gdmFsLnNpemUgPT09IDAgOiAhdmFsKTtcbmNvbnN0IEZzV2F0Y2hJbnN0YW5jZXMgPSBuZXcgTWFwKCk7XG4vKipcbiAqIEluc3RhbnRpYXRlcyB0aGUgZnNfd2F0Y2ggaW50ZXJmYWNlXG4gKiBAcGFyYW0gcGF0aCB0byBiZSB3YXRjaGVkXG4gKiBAcGFyYW0gb3B0aW9ucyB0byBiZSBwYXNzZWQgdG8gZnNfd2F0Y2hcbiAqIEBwYXJhbSBsaXN0ZW5lciBtYWluIGV2ZW50IGhhbmRsZXJcbiAqIEBwYXJhbSBlcnJIYW5kbGVyIGVtaXRzIGluZm8gYWJvdXQgZXJyb3JzXG4gKiBAcGFyYW0gZW1pdFJhdyBlbWl0cyByYXcgZXZlbnQgZGF0YVxuICogQHJldHVybnMge05hdGl2ZUZzV2F0Y2hlcn1cbiAqL1xuZnVuY3Rpb24gY3JlYXRlRnNXYXRjaEluc3RhbmNlKHBhdGgsIG9wdGlvbnMsIGxpc3RlbmVyLCBlcnJIYW5kbGVyLCBlbWl0UmF3KSB7XG4gICAgY29uc3QgaGFuZGxlRXZlbnQgPSAocmF3RXZlbnQsIGV2UGF0aCkgPT4ge1xuICAgICAgICBsaXN0ZW5lcihwYXRoKTtcbiAgICAgICAgZW1pdFJhdyhyYXdFdmVudCwgZXZQYXRoLCB7IHdhdGNoZWRQYXRoOiBwYXRoIH0pO1xuICAgICAgICAvLyBlbWl0IGJhc2VkIG9uIGV2ZW50cyBvY2N1cnJpbmcgZm9yIGZpbGVzIGZyb20gYSBkaXJlY3RvcnkncyB3YXRjaGVyIGluXG4gICAgICAgIC8vIGNhc2UgdGhlIGZpbGUncyB3YXRjaGVyIG1pc3NlcyBpdCAoYW5kIHJlbHkgb24gdGhyb3R0bGluZyB0byBkZS1kdXBlKVxuICAgICAgICBpZiAoZXZQYXRoICYmIHBhdGggIT09IGV2UGF0aCkge1xuICAgICAgICAgICAgZnNXYXRjaEJyb2FkY2FzdChzeXNQYXRoLnJlc29sdmUocGF0aCwgZXZQYXRoKSwgS0VZX0xJU1RFTkVSUywgc3lzUGF0aC5qb2luKHBhdGgsIGV2UGF0aCkpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gZnNfd2F0Y2gocGF0aCwge1xuICAgICAgICAgICAgcGVyc2lzdGVudDogb3B0aW9ucy5wZXJzaXN0ZW50LFxuICAgICAgICB9LCBoYW5kbGVFdmVudCk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICBlcnJIYW5kbGVyKGVycm9yKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG59XG4vKipcbiAqIEhlbHBlciBmb3IgcGFzc2luZyBmc193YXRjaCBldmVudCBkYXRhIHRvIGEgY29sbGVjdGlvbiBvZiBsaXN0ZW5lcnNcbiAqIEBwYXJhbSBmdWxsUGF0aCBhYnNvbHV0ZSBwYXRoIGJvdW5kIHRvIGZzX3dhdGNoIGluc3RhbmNlXG4gKi9cbmNvbnN0IGZzV2F0Y2hCcm9hZGNhc3QgPSAoZnVsbFBhdGgsIGxpc3RlbmVyVHlwZSwgdmFsMSwgdmFsMiwgdmFsMykgPT4ge1xuICAgIGNvbnN0IGNvbnQgPSBGc1dhdGNoSW5zdGFuY2VzLmdldChmdWxsUGF0aCk7XG4gICAgaWYgKCFjb250KVxuICAgICAgICByZXR1cm47XG4gICAgZm9yZWFjaChjb250W2xpc3RlbmVyVHlwZV0sIChsaXN0ZW5lcikgPT4ge1xuICAgICAgICBsaXN0ZW5lcih2YWwxLCB2YWwyLCB2YWwzKTtcbiAgICB9KTtcbn07XG4vKipcbiAqIEluc3RhbnRpYXRlcyB0aGUgZnNfd2F0Y2ggaW50ZXJmYWNlIG9yIGJpbmRzIGxpc3RlbmVyc1xuICogdG8gYW4gZXhpc3Rpbmcgb25lIGNvdmVyaW5nIHRoZSBzYW1lIGZpbGUgc3lzdGVtIGVudHJ5XG4gKiBAcGFyYW0gcGF0aFxuICogQHBhcmFtIGZ1bGxQYXRoIGFic29sdXRlIHBhdGhcbiAqIEBwYXJhbSBvcHRpb25zIHRvIGJlIHBhc3NlZCB0byBmc193YXRjaFxuICogQHBhcmFtIGhhbmRsZXJzIGNvbnRhaW5lciBmb3IgZXZlbnQgbGlzdGVuZXIgZnVuY3Rpb25zXG4gKi9cbmNvbnN0IHNldEZzV2F0Y2hMaXN0ZW5lciA9IChwYXRoLCBmdWxsUGF0aCwgb3B0aW9ucywgaGFuZGxlcnMpID0+IHtcbiAgICBjb25zdCB7IGxpc3RlbmVyLCBlcnJIYW5kbGVyLCByYXdFbWl0dGVyIH0gPSBoYW5kbGVycztcbiAgICBsZXQgY29udCA9IEZzV2F0Y2hJbnN0YW5jZXMuZ2V0KGZ1bGxQYXRoKTtcbiAgICBsZXQgd2F0Y2hlcjtcbiAgICBpZiAoIW9wdGlvbnMucGVyc2lzdGVudCkge1xuICAgICAgICB3YXRjaGVyID0gY3JlYXRlRnNXYXRjaEluc3RhbmNlKHBhdGgsIG9wdGlvbnMsIGxpc3RlbmVyLCBlcnJIYW5kbGVyLCByYXdFbWl0dGVyKTtcbiAgICAgICAgaWYgKCF3YXRjaGVyKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICByZXR1cm4gd2F0Y2hlci5jbG9zZS5iaW5kKHdhdGNoZXIpO1xuICAgIH1cbiAgICBpZiAoY29udCkge1xuICAgICAgICBhZGRBbmRDb252ZXJ0KGNvbnQsIEtFWV9MSVNURU5FUlMsIGxpc3RlbmVyKTtcbiAgICAgICAgYWRkQW5kQ29udmVydChjb250LCBLRVlfRVJSLCBlcnJIYW5kbGVyKTtcbiAgICAgICAgYWRkQW5kQ29udmVydChjb250LCBLRVlfUkFXLCByYXdFbWl0dGVyKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHdhdGNoZXIgPSBjcmVhdGVGc1dhdGNoSW5zdGFuY2UocGF0aCwgb3B0aW9ucywgZnNXYXRjaEJyb2FkY2FzdC5iaW5kKG51bGwsIGZ1bGxQYXRoLCBLRVlfTElTVEVORVJTKSwgZXJySGFuZGxlciwgLy8gbm8gbmVlZCB0byB1c2UgYnJvYWRjYXN0IGhlcmVcbiAgICAgICAgZnNXYXRjaEJyb2FkY2FzdC5iaW5kKG51bGwsIGZ1bGxQYXRoLCBLRVlfUkFXKSk7XG4gICAgICAgIGlmICghd2F0Y2hlcilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgd2F0Y2hlci5vbihFVi5FUlJPUiwgYXN5bmMgKGVycm9yKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBicm9hZGNhc3RFcnIgPSBmc1dhdGNoQnJvYWRjYXN0LmJpbmQobnVsbCwgZnVsbFBhdGgsIEtFWV9FUlIpO1xuICAgICAgICAgICAgaWYgKGNvbnQpXG4gICAgICAgICAgICAgICAgY29udC53YXRjaGVyVW51c2FibGUgPSB0cnVlOyAvLyBkb2N1bWVudGVkIHNpbmNlIE5vZGUgMTAuNC4xXG4gICAgICAgICAgICAvLyBXb3JrYXJvdW5kIGZvciBodHRwczovL2dpdGh1Yi5jb20vam95ZW50L25vZGUvaXNzdWVzLzQzMzdcbiAgICAgICAgICAgIGlmIChpc1dpbmRvd3MgJiYgZXJyb3IuY29kZSA9PT0gJ0VQRVJNJykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZkID0gYXdhaXQgb3BlbihwYXRoLCAncicpO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBmZC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICBicm9hZGNhc3RFcnIoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGRvIG5vdGhpbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBicm9hZGNhc3RFcnIoZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgY29udCA9IHtcbiAgICAgICAgICAgIGxpc3RlbmVyczogbGlzdGVuZXIsXG4gICAgICAgICAgICBlcnJIYW5kbGVyczogZXJySGFuZGxlcixcbiAgICAgICAgICAgIHJhd0VtaXR0ZXJzOiByYXdFbWl0dGVyLFxuICAgICAgICAgICAgd2F0Y2hlcixcbiAgICAgICAgfTtcbiAgICAgICAgRnNXYXRjaEluc3RhbmNlcy5zZXQoZnVsbFBhdGgsIGNvbnQpO1xuICAgIH1cbiAgICAvLyBjb25zdCBpbmRleCA9IGNvbnQubGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpO1xuICAgIC8vIHJlbW92ZXMgdGhpcyBpbnN0YW5jZSdzIGxpc3RlbmVycyBhbmQgY2xvc2VzIHRoZSB1bmRlcmx5aW5nIGZzX3dhdGNoXG4gICAgLy8gaW5zdGFuY2UgaWYgdGhlcmUgYXJlIG5vIG1vcmUgbGlzdGVuZXJzIGxlZnRcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICBkZWxGcm9tU2V0KGNvbnQsIEtFWV9MSVNURU5FUlMsIGxpc3RlbmVyKTtcbiAgICAgICAgZGVsRnJvbVNldChjb250LCBLRVlfRVJSLCBlcnJIYW5kbGVyKTtcbiAgICAgICAgZGVsRnJvbVNldChjb250LCBLRVlfUkFXLCByYXdFbWl0dGVyKTtcbiAgICAgICAgaWYgKGlzRW1wdHlTZXQoY29udC5saXN0ZW5lcnMpKSB7XG4gICAgICAgICAgICAvLyBDaGVjayB0byBwcm90ZWN0IGFnYWluc3QgaXNzdWUgZ2gtNzMwLlxuICAgICAgICAgICAgLy8gaWYgKGNvbnQud2F0Y2hlclVudXNhYmxlKSB7XG4gICAgICAgICAgICBjb250LndhdGNoZXIuY2xvc2UoKTtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIEZzV2F0Y2hJbnN0YW5jZXMuZGVsZXRlKGZ1bGxQYXRoKTtcbiAgICAgICAgICAgIEhBTkRMRVJfS0VZUy5mb3JFYWNoKGNsZWFySXRlbShjb250KSk7XG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgICBjb250LndhdGNoZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBPYmplY3QuZnJlZXplKGNvbnQpO1xuICAgICAgICB9XG4gICAgfTtcbn07XG4vLyBmc193YXRjaEZpbGUgaGVscGVyc1xuLy8gb2JqZWN0IHRvIGhvbGQgcGVyLXByb2Nlc3MgZnNfd2F0Y2hGaWxlIGluc3RhbmNlc1xuLy8gKG1heSBiZSBzaGFyZWQgYWNyb3NzIGNob2tpZGFyIEZTV2F0Y2hlciBpbnN0YW5jZXMpXG5jb25zdCBGc1dhdGNoRmlsZUluc3RhbmNlcyA9IG5ldyBNYXAoKTtcbi8qKlxuICogSW5zdGFudGlhdGVzIHRoZSBmc193YXRjaEZpbGUgaW50ZXJmYWNlIG9yIGJpbmRzIGxpc3RlbmVyc1xuICogdG8gYW4gZXhpc3Rpbmcgb25lIGNvdmVyaW5nIHRoZSBzYW1lIGZpbGUgc3lzdGVtIGVudHJ5XG4gKiBAcGFyYW0gcGF0aCB0byBiZSB3YXRjaGVkXG4gKiBAcGFyYW0gZnVsbFBhdGggYWJzb2x1dGUgcGF0aFxuICogQHBhcmFtIG9wdGlvbnMgb3B0aW9ucyB0byBiZSBwYXNzZWQgdG8gZnNfd2F0Y2hGaWxlXG4gKiBAcGFyYW0gaGFuZGxlcnMgY29udGFpbmVyIGZvciBldmVudCBsaXN0ZW5lciBmdW5jdGlvbnNcbiAqIEByZXR1cm5zIGNsb3NlclxuICovXG5jb25zdCBzZXRGc1dhdGNoRmlsZUxpc3RlbmVyID0gKHBhdGgsIGZ1bGxQYXRoLCBvcHRpb25zLCBoYW5kbGVycykgPT4ge1xuICAgIGNvbnN0IHsgbGlzdGVuZXIsIHJhd0VtaXR0ZXIgfSA9IGhhbmRsZXJzO1xuICAgIGxldCBjb250ID0gRnNXYXRjaEZpbGVJbnN0YW5jZXMuZ2V0KGZ1bGxQYXRoKTtcbiAgICAvLyBsZXQgbGlzdGVuZXJzID0gbmV3IFNldCgpO1xuICAgIC8vIGxldCByYXdFbWl0dGVycyA9IG5ldyBTZXQoKTtcbiAgICBjb25zdCBjb3B0cyA9IGNvbnQgJiYgY29udC5vcHRpb25zO1xuICAgIGlmIChjb3B0cyAmJiAoY29wdHMucGVyc2lzdGVudCA8IG9wdGlvbnMucGVyc2lzdGVudCB8fCBjb3B0cy5pbnRlcnZhbCA+IG9wdGlvbnMuaW50ZXJ2YWwpKSB7XG4gICAgICAgIC8vIFwiVXBncmFkZVwiIHRoZSB3YXRjaGVyIHRvIHBlcnNpc3RlbmNlIG9yIGEgcXVpY2tlciBpbnRlcnZhbC5cbiAgICAgICAgLy8gVGhpcyBjcmVhdGVzIHNvbWUgdW5saWtlbHkgZWRnZSBjYXNlIGlzc3VlcyBpZiB0aGUgdXNlciBtaXhlc1xuICAgICAgICAvLyBzZXR0aW5ncyBpbiBhIHZlcnkgd2VpcmQgd2F5LCBidXQgc29sdmluZyBmb3IgdGhvc2UgY2FzZXNcbiAgICAgICAgLy8gZG9lc24ndCBzZWVtIHdvcnRod2hpbGUgZm9yIHRoZSBhZGRlZCBjb21wbGV4aXR5LlxuICAgICAgICAvLyBsaXN0ZW5lcnMgPSBjb250Lmxpc3RlbmVycztcbiAgICAgICAgLy8gcmF3RW1pdHRlcnMgPSBjb250LnJhd0VtaXR0ZXJzO1xuICAgICAgICB1bndhdGNoRmlsZShmdWxsUGF0aCk7XG4gICAgICAgIGNvbnQgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGlmIChjb250KSB7XG4gICAgICAgIGFkZEFuZENvbnZlcnQoY29udCwgS0VZX0xJU1RFTkVSUywgbGlzdGVuZXIpO1xuICAgICAgICBhZGRBbmRDb252ZXJ0KGNvbnQsIEtFWV9SQVcsIHJhd0VtaXR0ZXIpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgLy8gVE9ET1xuICAgICAgICAvLyBsaXN0ZW5lcnMuYWRkKGxpc3RlbmVyKTtcbiAgICAgICAgLy8gcmF3RW1pdHRlcnMuYWRkKHJhd0VtaXR0ZXIpO1xuICAgICAgICBjb250ID0ge1xuICAgICAgICAgICAgbGlzdGVuZXJzOiBsaXN0ZW5lcixcbiAgICAgICAgICAgIHJhd0VtaXR0ZXJzOiByYXdFbWl0dGVyLFxuICAgICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgICAgIHdhdGNoZXI6IHdhdGNoRmlsZShmdWxsUGF0aCwgb3B0aW9ucywgKGN1cnIsIHByZXYpID0+IHtcbiAgICAgICAgICAgICAgICBmb3JlYWNoKGNvbnQucmF3RW1pdHRlcnMsIChyYXdFbWl0dGVyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJhd0VtaXR0ZXIoRVYuQ0hBTkdFLCBmdWxsUGF0aCwgeyBjdXJyLCBwcmV2IH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJtdGltZSA9IGN1cnIubXRpbWVNcztcbiAgICAgICAgICAgICAgICBpZiAoY3Vyci5zaXplICE9PSBwcmV2LnNpemUgfHwgY3Vycm10aW1lID4gcHJldi5tdGltZU1zIHx8IGN1cnJtdGltZSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBmb3JlYWNoKGNvbnQubGlzdGVuZXJzLCAobGlzdGVuZXIpID0+IGxpc3RlbmVyKHBhdGgsIGN1cnIpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgfTtcbiAgICAgICAgRnNXYXRjaEZpbGVJbnN0YW5jZXMuc2V0KGZ1bGxQYXRoLCBjb250KTtcbiAgICB9XG4gICAgLy8gY29uc3QgaW5kZXggPSBjb250Lmxpc3RlbmVycy5pbmRleE9mKGxpc3RlbmVyKTtcbiAgICAvLyBSZW1vdmVzIHRoaXMgaW5zdGFuY2UncyBsaXN0ZW5lcnMgYW5kIGNsb3NlcyB0aGUgdW5kZXJseWluZyBmc193YXRjaEZpbGVcbiAgICAvLyBpbnN0YW5jZSBpZiB0aGVyZSBhcmUgbm8gbW9yZSBsaXN0ZW5lcnMgbGVmdC5cbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICBkZWxGcm9tU2V0KGNvbnQsIEtFWV9MSVNURU5FUlMsIGxpc3RlbmVyKTtcbiAgICAgICAgZGVsRnJvbVNldChjb250LCBLRVlfUkFXLCByYXdFbWl0dGVyKTtcbiAgICAgICAgaWYgKGlzRW1wdHlTZXQoY29udC5saXN0ZW5lcnMpKSB7XG4gICAgICAgICAgICBGc1dhdGNoRmlsZUluc3RhbmNlcy5kZWxldGUoZnVsbFBhdGgpO1xuICAgICAgICAgICAgdW53YXRjaEZpbGUoZnVsbFBhdGgpO1xuICAgICAgICAgICAgY29udC5vcHRpb25zID0gY29udC53YXRjaGVyID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgT2JqZWN0LmZyZWV6ZShjb250KTtcbiAgICAgICAgfVxuICAgIH07XG59O1xuLyoqXG4gKiBAbWl4aW5cbiAqL1xuZXhwb3J0IGNsYXNzIE5vZGVGc0hhbmRsZXIge1xuICAgIGNvbnN0cnVjdG9yKGZzVykge1xuICAgICAgICB0aGlzLmZzdyA9IGZzVztcbiAgICAgICAgdGhpcy5fYm91bmRIYW5kbGVFcnJvciA9IChlcnJvcikgPT4gZnNXLl9oYW5kbGVFcnJvcihlcnJvcik7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFdhdGNoIGZpbGUgZm9yIGNoYW5nZXMgd2l0aCBmc193YXRjaEZpbGUgb3IgZnNfd2F0Y2guXG4gICAgICogQHBhcmFtIHBhdGggdG8gZmlsZSBvciBkaXJcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXIgb24gZnMgY2hhbmdlXG4gICAgICogQHJldHVybnMgY2xvc2VyIGZvciB0aGUgd2F0Y2hlciBpbnN0YW5jZVxuICAgICAqL1xuICAgIF93YXRjaFdpdGhOb2RlRnMocGF0aCwgbGlzdGVuZXIpIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IHRoaXMuZnN3Lm9wdGlvbnM7XG4gICAgICAgIGNvbnN0IGRpcmVjdG9yeSA9IHN5c1BhdGguZGlybmFtZShwYXRoKTtcbiAgICAgICAgY29uc3QgYmFzZW5hbWUgPSBzeXNQYXRoLmJhc2VuYW1lKHBhdGgpO1xuICAgICAgICBjb25zdCBwYXJlbnQgPSB0aGlzLmZzdy5fZ2V0V2F0Y2hlZERpcihkaXJlY3RvcnkpO1xuICAgICAgICBwYXJlbnQuYWRkKGJhc2VuYW1lKTtcbiAgICAgICAgY29uc3QgYWJzb2x1dGVQYXRoID0gc3lzUGF0aC5yZXNvbHZlKHBhdGgpO1xuICAgICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICAgICAgcGVyc2lzdGVudDogb3B0cy5wZXJzaXN0ZW50LFxuICAgICAgICB9O1xuICAgICAgICBpZiAoIWxpc3RlbmVyKVxuICAgICAgICAgICAgbGlzdGVuZXIgPSBFTVBUWV9GTjtcbiAgICAgICAgbGV0IGNsb3NlcjtcbiAgICAgICAgaWYgKG9wdHMudXNlUG9sbGluZykge1xuICAgICAgICAgICAgY29uc3QgZW5hYmxlQmluID0gb3B0cy5pbnRlcnZhbCAhPT0gb3B0cy5iaW5hcnlJbnRlcnZhbDtcbiAgICAgICAgICAgIG9wdGlvbnMuaW50ZXJ2YWwgPSBlbmFibGVCaW4gJiYgaXNCaW5hcnlQYXRoKGJhc2VuYW1lKSA/IG9wdHMuYmluYXJ5SW50ZXJ2YWwgOiBvcHRzLmludGVydmFsO1xuICAgICAgICAgICAgY2xvc2VyID0gc2V0RnNXYXRjaEZpbGVMaXN0ZW5lcihwYXRoLCBhYnNvbHV0ZVBhdGgsIG9wdGlvbnMsIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcixcbiAgICAgICAgICAgICAgICByYXdFbWl0dGVyOiB0aGlzLmZzdy5fZW1pdFJhdyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY2xvc2VyID0gc2V0RnNXYXRjaExpc3RlbmVyKHBhdGgsIGFic29sdXRlUGF0aCwgb3B0aW9ucywge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLFxuICAgICAgICAgICAgICAgIGVyckhhbmRsZXI6IHRoaXMuX2JvdW5kSGFuZGxlRXJyb3IsXG4gICAgICAgICAgICAgICAgcmF3RW1pdHRlcjogdGhpcy5mc3cuX2VtaXRSYXcsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2xvc2VyO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBXYXRjaCBhIGZpbGUgYW5kIGVtaXQgYWRkIGV2ZW50IGlmIHdhcnJhbnRlZC5cbiAgICAgKiBAcmV0dXJucyBjbG9zZXIgZm9yIHRoZSB3YXRjaGVyIGluc3RhbmNlXG4gICAgICovXG4gICAgX2hhbmRsZUZpbGUoZmlsZSwgc3RhdHMsIGluaXRpYWxBZGQpIHtcbiAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRpcm5hbWUgPSBzeXNQYXRoLmRpcm5hbWUoZmlsZSk7XG4gICAgICAgIGNvbnN0IGJhc2VuYW1lID0gc3lzUGF0aC5iYXNlbmFtZShmaWxlKTtcbiAgICAgICAgY29uc3QgcGFyZW50ID0gdGhpcy5mc3cuX2dldFdhdGNoZWREaXIoZGlybmFtZSk7XG4gICAgICAgIC8vIHN0YXRzIGlzIGFsd2F5cyBwcmVzZW50XG4gICAgICAgIGxldCBwcmV2U3RhdHMgPSBzdGF0cztcbiAgICAgICAgLy8gaWYgdGhlIGZpbGUgaXMgYWxyZWFkeSBiZWluZyB3YXRjaGVkLCBkbyBub3RoaW5nXG4gICAgICAgIGlmIChwYXJlbnQuaGFzKGJhc2VuYW1lKSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY29uc3QgbGlzdGVuZXIgPSBhc3luYyAocGF0aCwgbmV3U3RhdHMpID0+IHtcbiAgICAgICAgICAgIGlmICghdGhpcy5mc3cuX3Rocm90dGxlKFRIUk9UVExFX01PREVfV0FUQ0gsIGZpbGUsIDUpKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGlmICghbmV3U3RhdHMgfHwgbmV3U3RhdHMubXRpbWVNcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1N0YXRzID0gYXdhaXQgc3RhdChmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZClcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgdGhhdCBjaGFuZ2UgZXZlbnQgd2FzIG5vdCBmaXJlZCBiZWNhdXNlIG9mIGNoYW5nZWQgb25seSBhY2Nlc3NUaW1lLlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhdCA9IG5ld1N0YXRzLmF0aW1lTXM7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG10ID0gbmV3U3RhdHMubXRpbWVNcztcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFhdCB8fCBhdCA8PSBtdCB8fCBtdCAhPT0gcHJldlN0YXRzLm10aW1lTXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9lbWl0KEVWLkNIQU5HRSwgZmlsZSwgbmV3U3RhdHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICgoaXNNYWNvcyB8fCBpc0xpbnV4IHx8IGlzRnJlZUJTRCkgJiYgcHJldlN0YXRzLmlubyAhPT0gbmV3U3RhdHMuaW5vKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZzdy5fY2xvc2VGaWxlKHBhdGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJldlN0YXRzID0gbmV3U3RhdHM7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjbG9zZXIgPSB0aGlzLl93YXRjaFdpdGhOb2RlRnMoZmlsZSwgbGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNsb3NlcilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZzdy5fYWRkUGF0aENsb3NlcihwYXRoLCBjbG9zZXIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJldlN0YXRzID0gbmV3U3RhdHM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZpeCBpc3N1ZXMgd2hlcmUgbXRpbWUgaXMgbnVsbCBidXQgZmlsZSBpcyBzdGlsbCBwcmVzZW50XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9yZW1vdmUoZGlybmFtZSwgYmFzZW5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBhZGQgaXMgYWJvdXQgdG8gYmUgZW1pdHRlZCBpZiBmaWxlIG5vdCBhbHJlYWR5IHRyYWNrZWQgaW4gcGFyZW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChwYXJlbnQuaGFzKGJhc2VuYW1lKSkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIHRoYXQgY2hhbmdlIGV2ZW50IHdhcyBub3QgZmlyZWQgYmVjYXVzZSBvZiBjaGFuZ2VkIG9ubHkgYWNjZXNzVGltZS5cbiAgICAgICAgICAgICAgICBjb25zdCBhdCA9IG5ld1N0YXRzLmF0aW1lTXM7XG4gICAgICAgICAgICAgICAgY29uc3QgbXQgPSBuZXdTdGF0cy5tdGltZU1zO1xuICAgICAgICAgICAgICAgIGlmICghYXQgfHwgYXQgPD0gbXQgfHwgbXQgIT09IHByZXZTdGF0cy5tdGltZU1zKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9lbWl0KEVWLkNIQU5HRSwgZmlsZSwgbmV3U3RhdHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwcmV2U3RhdHMgPSBuZXdTdGF0cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgLy8ga2ljayBvZmYgdGhlIHdhdGNoZXJcbiAgICAgICAgY29uc3QgY2xvc2VyID0gdGhpcy5fd2F0Y2hXaXRoTm9kZUZzKGZpbGUsIGxpc3RlbmVyKTtcbiAgICAgICAgLy8gZW1pdCBhbiBhZGQgZXZlbnQgaWYgd2UncmUgc3VwcG9zZWQgdG9cbiAgICAgICAgaWYgKCEoaW5pdGlhbEFkZCAmJiB0aGlzLmZzdy5vcHRpb25zLmlnbm9yZUluaXRpYWwpICYmIHRoaXMuZnN3Ll9pc250SWdub3JlZChmaWxlKSkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmZzdy5fdGhyb3R0bGUoRVYuQURELCBmaWxlLCAwKSlcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB0aGlzLmZzdy5fZW1pdChFVi5BREQsIGZpbGUsIHN0YXRzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2xvc2VyO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgc3ltbGlua3MgZW5jb3VudGVyZWQgd2hpbGUgcmVhZGluZyBhIGRpci5cbiAgICAgKiBAcGFyYW0gZW50cnkgcmV0dXJuZWQgYnkgcmVhZGRpcnBcbiAgICAgKiBAcGFyYW0gZGlyZWN0b3J5IHBhdGggb2YgZGlyIGJlaW5nIHJlYWRcbiAgICAgKiBAcGFyYW0gcGF0aCBvZiB0aGlzIGl0ZW1cbiAgICAgKiBAcGFyYW0gaXRlbSBiYXNlbmFtZSBvZiB0aGlzIGl0ZW1cbiAgICAgKiBAcmV0dXJucyB0cnVlIGlmIG5vIG1vcmUgcHJvY2Vzc2luZyBpcyBuZWVkZWQgZm9yIHRoaXMgZW50cnkuXG4gICAgICovXG4gICAgYXN5bmMgX2hhbmRsZVN5bWxpbmsoZW50cnksIGRpcmVjdG9yeSwgcGF0aCwgaXRlbSkge1xuICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZnVsbCA9IGVudHJ5LmZ1bGxQYXRoO1xuICAgICAgICBjb25zdCBkaXIgPSB0aGlzLmZzdy5fZ2V0V2F0Y2hlZERpcihkaXJlY3RvcnkpO1xuICAgICAgICBpZiAoIXRoaXMuZnN3Lm9wdGlvbnMuZm9sbG93U3ltbGlua3MpIHtcbiAgICAgICAgICAgIC8vIHdhdGNoIHN5bWxpbmsgZGlyZWN0bHkgKGRvbid0IGZvbGxvdykgYW5kIGRldGVjdCBjaGFuZ2VzXG4gICAgICAgICAgICB0aGlzLmZzdy5faW5jclJlYWR5Q291bnQoKTtcbiAgICAgICAgICAgIGxldCBsaW5rUGF0aDtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgbGlua1BhdGggPSBhd2FpdCBmc3JlYWxwYXRoKHBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZzdy5fZW1pdFJlYWR5KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGlmIChkaXIuaGFzKGl0ZW0pKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZnN3Ll9zeW1saW5rUGF0aHMuZ2V0KGZ1bGwpICE9PSBsaW5rUGF0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZzdy5fc3ltbGlua1BhdGhzLnNldChmdWxsLCBsaW5rUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9lbWl0KEVWLkNIQU5HRSwgcGF0aCwgZW50cnkuc3RhdHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGRpci5hZGQoaXRlbSk7XG4gICAgICAgICAgICAgICAgdGhpcy5mc3cuX3N5bWxpbmtQYXRocy5zZXQoZnVsbCwgbGlua1BhdGgpO1xuICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9lbWl0KEVWLkFERCwgcGF0aCwgZW50cnkuc3RhdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5mc3cuX2VtaXRSZWFkeSgpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZG9uJ3QgZm9sbG93IHRoZSBzYW1lIHN5bWxpbmsgbW9yZSB0aGFuIG9uY2VcbiAgICAgICAgaWYgKHRoaXMuZnN3Ll9zeW1saW5rUGF0aHMuaGFzKGZ1bGwpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZzdy5fc3ltbGlua1BhdGhzLnNldChmdWxsLCB0cnVlKTtcbiAgICB9XG4gICAgX2hhbmRsZVJlYWQoZGlyZWN0b3J5LCBpbml0aWFsQWRkLCB3aCwgdGFyZ2V0LCBkaXIsIGRlcHRoLCB0aHJvdHRsZXIpIHtcbiAgICAgICAgLy8gTm9ybWFsaXplIHRoZSBkaXJlY3RvcnkgbmFtZSBvbiBXaW5kb3dzXG4gICAgICAgIGRpcmVjdG9yeSA9IHN5c1BhdGguam9pbihkaXJlY3RvcnksICcnKTtcbiAgICAgICAgdGhyb3R0bGVyID0gdGhpcy5mc3cuX3Rocm90dGxlKCdyZWFkZGlyJywgZGlyZWN0b3J5LCAxMDAwKTtcbiAgICAgICAgaWYgKCF0aHJvdHRsZXIpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGNvbnN0IHByZXZpb3VzID0gdGhpcy5mc3cuX2dldFdhdGNoZWREaXIod2gucGF0aCk7XG4gICAgICAgIGNvbnN0IGN1cnJlbnQgPSBuZXcgU2V0KCk7XG4gICAgICAgIGxldCBzdHJlYW0gPSB0aGlzLmZzdy5fcmVhZGRpcnAoZGlyZWN0b3J5LCB7XG4gICAgICAgICAgICBmaWxlRmlsdGVyOiAoZW50cnkpID0+IHdoLmZpbHRlclBhdGgoZW50cnkpLFxuICAgICAgICAgICAgZGlyZWN0b3J5RmlsdGVyOiAoZW50cnkpID0+IHdoLmZpbHRlckRpcihlbnRyeSksXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXN0cmVhbSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgc3RyZWFtXG4gICAgICAgICAgICAub24oU1RSX0RBVEEsIGFzeW5jIChlbnRyeSkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZCkge1xuICAgICAgICAgICAgICAgIHN0cmVhbSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBpdGVtID0gZW50cnkucGF0aDtcbiAgICAgICAgICAgIGxldCBwYXRoID0gc3lzUGF0aC5qb2luKGRpcmVjdG9yeSwgaXRlbSk7XG4gICAgICAgICAgICBjdXJyZW50LmFkZChpdGVtKTtcbiAgICAgICAgICAgIGlmIChlbnRyeS5zdGF0cy5pc1N5bWJvbGljTGluaygpICYmXG4gICAgICAgICAgICAgICAgKGF3YWl0IHRoaXMuX2hhbmRsZVN5bWxpbmsoZW50cnksIGRpcmVjdG9yeSwgcGF0aCwgaXRlbSkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZCkge1xuICAgICAgICAgICAgICAgIHN0cmVhbSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBGaWxlcyB0aGF0IHByZXNlbnQgaW4gY3VycmVudCBkaXJlY3Rvcnkgc25hcHNob3RcbiAgICAgICAgICAgIC8vIGJ1dCBhYnNlbnQgaW4gcHJldmlvdXMgYXJlIGFkZGVkIHRvIHdhdGNoIGxpc3QgYW5kXG4gICAgICAgICAgICAvLyBlbWl0IGBhZGRgIGV2ZW50LlxuICAgICAgICAgICAgaWYgKGl0ZW0gPT09IHRhcmdldCB8fCAoIXRhcmdldCAmJiAhcHJldmlvdXMuaGFzKGl0ZW0pKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9pbmNyUmVhZHlDb3VudCgpO1xuICAgICAgICAgICAgICAgIC8vIGVuc3VyZSByZWxhdGl2ZW5lc3Mgb2YgcGF0aCBpcyBwcmVzZXJ2ZWQgaW4gY2FzZSBvZiB3YXRjaGVyIHJldXNlXG4gICAgICAgICAgICAgICAgcGF0aCA9IHN5c1BhdGguam9pbihkaXIsIHN5c1BhdGgucmVsYXRpdmUoZGlyLCBwYXRoKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fYWRkVG9Ob2RlRnMocGF0aCwgaW5pdGlhbEFkZCwgd2gsIGRlcHRoICsgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgICAgICAub24oRVYuRVJST1IsIHRoaXMuX2JvdW5kSGFuZGxlRXJyb3IpO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKCFzdHJlYW0pXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdCgpO1xuICAgICAgICAgICAgc3RyZWFtLm9uY2UoU1RSX0VORCwgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RyZWFtID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHdhc1Rocm90dGxlZCA9IHRocm90dGxlciA/IHRocm90dGxlci5jbGVhcigpIDogZmFsc2U7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh1bmRlZmluZWQpO1xuICAgICAgICAgICAgICAgIC8vIEZpbGVzIHRoYXQgYWJzZW50IGluIGN1cnJlbnQgZGlyZWN0b3J5IHNuYXBzaG90XG4gICAgICAgICAgICAgICAgLy8gYnV0IHByZXNlbnQgaW4gcHJldmlvdXMgZW1pdCBgcmVtb3ZlYCBldmVudFxuICAgICAgICAgICAgICAgIC8vIGFuZCBhcmUgcmVtb3ZlZCBmcm9tIEB3YXRjaGVkW2RpcmVjdG9yeV0uXG4gICAgICAgICAgICAgICAgcHJldmlvdXNcbiAgICAgICAgICAgICAgICAgICAgLmdldENoaWxkcmVuKClcbiAgICAgICAgICAgICAgICAgICAgLmZpbHRlcigoaXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbSAhPT0gZGlyZWN0b3J5ICYmICFjdXJyZW50LmhhcyhpdGVtKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZzdy5fcmVtb3ZlKGRpcmVjdG9yeSwgaXRlbSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgc3RyZWFtID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIC8vIG9uZSBtb3JlIHRpbWUgZm9yIGFueSBtaXNzZWQgaW4gY2FzZSBjaGFuZ2VzIGNhbWUgaW4gZXh0cmVtZWx5IHF1aWNrbHlcbiAgICAgICAgICAgICAgICBpZiAod2FzVGhyb3R0bGVkKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9oYW5kbGVSZWFkKGRpcmVjdG9yeSwgZmFsc2UsIHdoLCB0YXJnZXQsIGRpciwgZGVwdGgsIHRocm90dGxlcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJlYWQgZGlyZWN0b3J5IHRvIGFkZCAvIHJlbW92ZSBmaWxlcyBmcm9tIGBAd2F0Y2hlZGAgbGlzdCBhbmQgcmUtcmVhZCBpdCBvbiBjaGFuZ2UuXG4gICAgICogQHBhcmFtIGRpciBmcyBwYXRoXG4gICAgICogQHBhcmFtIHN0YXRzXG4gICAgICogQHBhcmFtIGluaXRpYWxBZGRcbiAgICAgKiBAcGFyYW0gZGVwdGggcmVsYXRpdmUgdG8gdXNlci1zdXBwbGllZCBwYXRoXG4gICAgICogQHBhcmFtIHRhcmdldCBjaGlsZCBwYXRoIHRhcmdldGVkIGZvciB3YXRjaFxuICAgICAqIEBwYXJhbSB3aCBDb21tb24gd2F0Y2ggaGVscGVycyBmb3IgdGhpcyBwYXRoXG4gICAgICogQHBhcmFtIHJlYWxwYXRoXG4gICAgICogQHJldHVybnMgY2xvc2VyIGZvciB0aGUgd2F0Y2hlciBpbnN0YW5jZS5cbiAgICAgKi9cbiAgICBhc3luYyBfaGFuZGxlRGlyKGRpciwgc3RhdHMsIGluaXRpYWxBZGQsIGRlcHRoLCB0YXJnZXQsIHdoLCByZWFscGF0aCkge1xuICAgICAgICBjb25zdCBwYXJlbnREaXIgPSB0aGlzLmZzdy5fZ2V0V2F0Y2hlZERpcihzeXNQYXRoLmRpcm5hbWUoZGlyKSk7XG4gICAgICAgIGNvbnN0IHRyYWNrZWQgPSBwYXJlbnREaXIuaGFzKHN5c1BhdGguYmFzZW5hbWUoZGlyKSk7XG4gICAgICAgIGlmICghKGluaXRpYWxBZGQgJiYgdGhpcy5mc3cub3B0aW9ucy5pZ25vcmVJbml0aWFsKSAmJiAhdGFyZ2V0ICYmICF0cmFja2VkKSB7XG4gICAgICAgICAgICB0aGlzLmZzdy5fZW1pdChFVi5BRERfRElSLCBkaXIsIHN0YXRzKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBlbnN1cmUgZGlyIGlzIHRyYWNrZWQgKGhhcm1sZXNzIGlmIHJlZHVuZGFudClcbiAgICAgICAgcGFyZW50RGlyLmFkZChzeXNQYXRoLmJhc2VuYW1lKGRpcikpO1xuICAgICAgICB0aGlzLmZzdy5fZ2V0V2F0Y2hlZERpcihkaXIpO1xuICAgICAgICBsZXQgdGhyb3R0bGVyO1xuICAgICAgICBsZXQgY2xvc2VyO1xuICAgICAgICBjb25zdCBvRGVwdGggPSB0aGlzLmZzdy5vcHRpb25zLmRlcHRoO1xuICAgICAgICBpZiAoKG9EZXB0aCA9PSBudWxsIHx8IGRlcHRoIDw9IG9EZXB0aCkgJiYgIXRoaXMuZnN3Ll9zeW1saW5rUGF0aHMuaGFzKHJlYWxwYXRoKSkge1xuICAgICAgICAgICAgaWYgKCF0YXJnZXQpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLl9oYW5kbGVSZWFkKGRpciwgaW5pdGlhbEFkZCwgd2gsIHRhcmdldCwgZGlyLCBkZXB0aCwgdGhyb3R0bGVyKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mc3cuY2xvc2VkKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjbG9zZXIgPSB0aGlzLl93YXRjaFdpdGhOb2RlRnMoZGlyLCAoZGlyUGF0aCwgc3RhdHMpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBpZiBjdXJyZW50IGRpcmVjdG9yeSBpcyByZW1vdmVkLCBkbyBub3RoaW5nXG4gICAgICAgICAgICAgICAgaWYgKHN0YXRzICYmIHN0YXRzLm10aW1lTXMgPT09IDApXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB0aGlzLl9oYW5kbGVSZWFkKGRpclBhdGgsIGZhbHNlLCB3aCwgdGFyZ2V0LCBkaXIsIGRlcHRoLCB0aHJvdHRsZXIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNsb3NlcjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogSGFuZGxlIGFkZGVkIGZpbGUsIGRpcmVjdG9yeSwgb3IgZ2xvYiBwYXR0ZXJuLlxuICAgICAqIERlbGVnYXRlcyBjYWxsIHRvIF9oYW5kbGVGaWxlIC8gX2hhbmRsZURpciBhZnRlciBjaGVja3MuXG4gICAgICogQHBhcmFtIHBhdGggdG8gZmlsZSBvciBpclxuICAgICAqIEBwYXJhbSBpbml0aWFsQWRkIHdhcyB0aGUgZmlsZSBhZGRlZCBhdCB3YXRjaCBpbnN0YW50aWF0aW9uP1xuICAgICAqIEBwYXJhbSBwcmlvcldoIGRlcHRoIHJlbGF0aXZlIHRvIHVzZXItc3VwcGxpZWQgcGF0aFxuICAgICAqIEBwYXJhbSBkZXB0aCBDaGlsZCBwYXRoIGFjdHVhbGx5IHRhcmdldGVkIGZvciB3YXRjaFxuICAgICAqIEBwYXJhbSB0YXJnZXQgQ2hpbGQgcGF0aCBhY3R1YWxseSB0YXJnZXRlZCBmb3Igd2F0Y2hcbiAgICAgKi9cbiAgICBhc3luYyBfYWRkVG9Ob2RlRnMocGF0aCwgaW5pdGlhbEFkZCwgcHJpb3JXaCwgZGVwdGgsIHRhcmdldCkge1xuICAgICAgICBjb25zdCByZWFkeSA9IHRoaXMuZnN3Ll9lbWl0UmVhZHk7XG4gICAgICAgIGlmICh0aGlzLmZzdy5faXNJZ25vcmVkKHBhdGgpIHx8IHRoaXMuZnN3LmNsb3NlZCkge1xuICAgICAgICAgICAgcmVhZHkoKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB3aCA9IHRoaXMuZnN3Ll9nZXRXYXRjaEhlbHBlcnMocGF0aCk7XG4gICAgICAgIGlmIChwcmlvcldoKSB7XG4gICAgICAgICAgICB3aC5maWx0ZXJQYXRoID0gKGVudHJ5KSA9PiBwcmlvcldoLmZpbHRlclBhdGgoZW50cnkpO1xuICAgICAgICAgICAgd2guZmlsdGVyRGlyID0gKGVudHJ5KSA9PiBwcmlvcldoLmZpbHRlckRpcihlbnRyeSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZXZhbHVhdGUgd2hhdCBpcyBhdCB0aGUgcGF0aCB3ZSdyZSBiZWluZyBhc2tlZCB0byB3YXRjaFxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBzdGF0TWV0aG9kc1t3aC5zdGF0TWV0aG9kXSh3aC53YXRjaFBhdGgpO1xuICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBpZiAodGhpcy5mc3cuX2lzSWdub3JlZCh3aC53YXRjaFBhdGgsIHN0YXRzKSkge1xuICAgICAgICAgICAgICAgIHJlYWR5KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZm9sbG93ID0gdGhpcy5mc3cub3B0aW9ucy5mb2xsb3dTeW1saW5rcztcbiAgICAgICAgICAgIGxldCBjbG9zZXI7XG4gICAgICAgICAgICBpZiAoc3RhdHMuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFic1BhdGggPSBzeXNQYXRoLnJlc29sdmUocGF0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0UGF0aCA9IGZvbGxvdyA/IGF3YWl0IGZzcmVhbHBhdGgocGF0aCkgOiBwYXRoO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICBjbG9zZXIgPSBhd2FpdCB0aGlzLl9oYW5kbGVEaXIod2gud2F0Y2hQYXRoLCBzdGF0cywgaW5pdGlhbEFkZCwgZGVwdGgsIHRhcmdldCwgd2gsIHRhcmdldFBhdGgpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAvLyBwcmVzZXJ2ZSB0aGlzIHN5bWxpbmsncyB0YXJnZXQgcGF0aFxuICAgICAgICAgICAgICAgIGlmIChhYnNQYXRoICE9PSB0YXJnZXRQYXRoICYmIHRhcmdldFBhdGggIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZzdy5fc3ltbGlua1BhdGhzLnNldChhYnNQYXRoLCB0YXJnZXRQYXRoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChzdGF0cy5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0UGF0aCA9IGZvbGxvdyA/IGF3YWl0IGZzcmVhbHBhdGgocGF0aCkgOiBwYXRoO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZzdy5jbG9zZWQpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnQgPSBzeXNQYXRoLmRpcm5hbWUod2gud2F0Y2hQYXRoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmZzdy5fZ2V0V2F0Y2hlZERpcihwYXJlbnQpLmFkZCh3aC53YXRjaFBhdGgpO1xuICAgICAgICAgICAgICAgIHRoaXMuZnN3Ll9lbWl0KEVWLkFERCwgd2gud2F0Y2hQYXRoLCBzdGF0cyk7XG4gICAgICAgICAgICAgICAgY2xvc2VyID0gYXdhaXQgdGhpcy5faGFuZGxlRGlyKHBhcmVudCwgc3RhdHMsIGluaXRpYWxBZGQsIGRlcHRoLCBwYXRoLCB3aCwgdGFyZ2V0UGF0aCk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZnN3LmNsb3NlZClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIC8vIHByZXNlcnZlIHRoaXMgc3ltbGluaydzIHRhcmdldCBwYXRoXG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldFBhdGggIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZzdy5fc3ltbGlua1BhdGhzLnNldChzeXNQYXRoLnJlc29sdmUocGF0aCksIHRhcmdldFBhdGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNsb3NlciA9IHRoaXMuX2hhbmRsZUZpbGUod2gud2F0Y2hQYXRoLCBzdGF0cywgaW5pdGlhbEFkZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZWFkeSgpO1xuICAgICAgICAgICAgaWYgKGNsb3NlcilcbiAgICAgICAgICAgICAgICB0aGlzLmZzdy5fYWRkUGF0aENsb3NlcihwYXRoLCBjbG9zZXIpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgaWYgKHRoaXMuZnN3Ll9oYW5kbGVFcnJvcihlcnJvcikpIHtcbiAgICAgICAgICAgICAgICByZWFkeSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuIiwgImltcG9ydCB7IGFwcGVuZEZpbGVTeW5jLCBleGlzdHNTeW5jLCByZWFkRmlsZVN5bmMsIHN0YXRTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcblxuZXhwb3J0IGNvbnN0IE1BWF9MT0dfQllURVMgPSAxMCAqIDEwMjQgKiAxMDI0O1xuXG5leHBvcnQgZnVuY3Rpb24gYXBwZW5kQ2FwcGVkTG9nKHBhdGg6IHN0cmluZywgbGluZTogc3RyaW5nLCBtYXhCeXRlcyA9IE1BWF9MT0dfQllURVMpOiB2b2lkIHtcbiAgY29uc3QgaW5jb21pbmcgPSBCdWZmZXIuZnJvbShsaW5lKTtcbiAgaWYgKGluY29taW5nLmJ5dGVMZW5ndGggPj0gbWF4Qnl0ZXMpIHtcbiAgICB3cml0ZUZpbGVTeW5jKHBhdGgsIGluY29taW5nLnN1YmFycmF5KGluY29taW5nLmJ5dGVMZW5ndGggLSBtYXhCeXRlcykpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRyeSB7XG4gICAgaWYgKGV4aXN0c1N5bmMocGF0aCkpIHtcbiAgICAgIGNvbnN0IHNpemUgPSBzdGF0U3luYyhwYXRoKS5zaXplO1xuICAgICAgY29uc3QgYWxsb3dlZEV4aXN0aW5nID0gbWF4Qnl0ZXMgLSBpbmNvbWluZy5ieXRlTGVuZ3RoO1xuICAgICAgaWYgKHNpemUgPiBhbGxvd2VkRXhpc3RpbmcpIHtcbiAgICAgICAgY29uc3QgZXhpc3RpbmcgPSByZWFkRmlsZVN5bmMocGF0aCk7XG4gICAgICAgIHdyaXRlRmlsZVN5bmMocGF0aCwgZXhpc3Rpbmcuc3ViYXJyYXkoTWF0aC5tYXgoMCwgZXhpc3RpbmcuYnl0ZUxlbmd0aCAtIGFsbG93ZWRFeGlzdGluZykpKTtcbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2gge1xuICAgIC8vIElmIHRyaW1taW5nIGZhaWxzLCBzdGlsbCB0cnkgdG8gYXBwZW5kIGJlbG93OyBsb2dnaW5nIG11c3QgYmUgYmVzdC1lZmZvcnQuXG4gIH1cblxuICBhcHBlbmRGaWxlU3luYyhwYXRoLCBpbmNvbWluZyk7XG59XG4iLCAiaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBkaXJuYW1lLCBqb2luIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuaW1wb3J0IHR5cGUge1xuICBDb2RleENkcFN0YXR1cyxcbiAgQ29kZXhDZHBUYXJnZXQsXG4gIENvZGV4UnVudGltZUNhcGFiaWxpdGllcyxcbiAgQ29kZXhSdW50aW1lSW5mbyxcbiAgQ29kZXhSdW50aW1lVHlwZSxcbn0gZnJvbSBcIkBjb2RleC1wbHVzcGx1cy9zZGtcIjtcblxuLyoqXG4gKiBSdW50aW1lIGNvbXBhdGliaWxpdHkgaXMgY2FwYWJpbGl0eS1kcml2ZW4uIEFwcC92ZXJzaW9uIHN0cmluZ3MgYXJlXG4gKiBkaWFnbm9zdGljIG1ldGFkYXRhIG9ubHkgXHUyMDE0IHRoZXkgbXVzdCBub3QgZ2F0ZSBiZWhhdmlvci4gUHJvYmUgYWRhcHRlcnNcbiAqIGluc3BlY3QgZXhpc3Rpbmcgc3VyZmFjZXM7IHRoZXkgbmV2ZXIgY3JlYXRlIHdpbmRvd3MsIG11dGF0ZSBwZXJzaXN0ZW50XG4gKiBzdGF0ZSwgb3IgdG91Y2ggdGhlIG5ldHdvcmsuXG4gKi9cblxuZXhwb3J0IHR5cGUgUnVudGltZVN1cHBvcnRMZXZlbCA9IFwic3VwcG9ydGVkXCIgfCBcImRlZ3JhZGVkXCIgfCBcInVua25vd25cIjtcbmV4cG9ydCB0eXBlIFByZWxvYWRSZWdpc3RyYXRpb25TdHJhdGVneSA9IFwicmVnaXN0ZXJQcmVsb2FkU2NyaXB0XCIgfCBcInNldFByZWxvYWRzXCIgfCBcInVuYXZhaWxhYmxlXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvYmVBcHBBZGFwdGVyIHtcbiAgZ2V0VmVyc2lvbj86ICgpID0+IHN0cmluZztcbiAgZ2V0QXBwUGF0aD86ICgpID0+IHN0cmluZztcbiAgaXNQYWNrYWdlZD86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvYmVTZXNzaW9uQWRhcHRlciB7XG4gIHJlZ2lzdGVyUHJlbG9hZFNjcmlwdD86IHVua25vd247XG4gIHNldFByZWxvYWRzPzogdW5rbm93bjtcbiAgZ2V0UHJlbG9hZHM/OiB1bmtub3duO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFByb2JlV2luZG93U2FtcGxlIHtcbiAgYWRkQnJvd3NlclZpZXc/OiB1bmtub3duO1xuICBmcm9tSWQ/OiB1bmtub3duO1xuICBjb250ZW50Vmlldz86IHVua25vd247XG4gIGFkZENoaWxkVmlldz86IHVua25vd247XG4gIHJlbW92ZUNoaWxkVmlldz86IHVua25vd247XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvYmVWaWV3U2FtcGxlIHtcbiAgcHJlc2VudD86IGJvb2xlYW47XG4gIHdlYkNvbnRlbnRzVmlldz86IHVua25vd247XG4gIHNldEJvdW5kcz86IHVua25vd247XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVudGltZVByb2JlRW52IHtcbiAgcGxhdGZvcm0/OiBOb2RlSlMuUGxhdGZvcm07XG4gIGV4ZWNQYXRoPzogc3RyaW5nO1xuICByZXNvdXJjZXNQYXRoPzogc3RyaW5nIHwgbnVsbDtcbiAgZXhpc3RzU3luYz86IChwYXRoOiBzdHJpbmcpID0+IGJvb2xlYW47XG4gIHByb2Nlc3NFbnY/OiBOb2RlSlMuUHJvY2Vzc0VudjtcbiAgYXBwPzogUHJvYmVBcHBBZGFwdGVyIHwgbnVsbDtcbiAgc2Vzc2lvbj86IHsgZGVmYXVsdFNlc3Npb24/OiBQcm9iZVNlc3Npb25BZGFwdGVyIHwgbnVsbCB9IHwgUHJvYmVTZXNzaW9uQWRhcHRlciB8IG51bGw7XG4gIGJyb3dzZXJXaW5kb3c/OiB7IGZyb21JZD86IHVua25vd247IGdldEZvY3VzZWRXaW5kb3c/OiAoKSA9PiB1bmtub3duOyBnZXRBbGxXaW5kb3dzPzogKCkgPT4gdW5rbm93bltdIH0gfCBudWxsO1xuICBicm93c2VyVmlldz86IHVua25vd247XG4gIGdldFdpbmRvd1NlcnZpY2VzPzogKCkgPT4gdW5rbm93biB8IG51bGw7XG4gIGluc3BlY3RFeGlzdGluZ1dpbmRvdz86ICgpID0+IFByb2JlV2luZG93U2FtcGxlIHwgbnVsbDtcbiAgaW5zcGVjdEJyb3dzZXJWaWV3PzogKCkgPT4gUHJvYmVWaWV3U2FtcGxlIHwgbnVsbDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSdW50aW1lUHJvYmVPcHRpb25zIHtcbiAgdXNlclJvb3Q6IHN0cmluZztcbiAgcnVudGltZURpcjogc3RyaW5nO1xuICBjb2RleFZlcnNpb246IHN0cmluZyB8IG51bGw7XG4gIGNoYW5uZWw6IHN0cmluZyB8IG51bGw7XG4gIGdldFdpbmRvd1NlcnZpY2VzKCk6IHVua25vd24gfCBudWxsO1xuICBnZXROYXRpdmVDYXBhYmlsaXRpZXM/KCk6IENvZGV4UnVudGltZUNhcGFiaWxpdGllc1tcIm5hdGl2ZVwiXTtcbiAgZW52PzogUnVudGltZVByb2JlRW52O1xufVxuXG4vKiogSW50ZXJuYWwgc25hcHNob3QuIE5vdCBwYXJ0IG9mIHRoZSBwdWJsaWMgU0RLLiAqL1xuZXhwb3J0IGludGVyZmFjZSBSdW50aW1lQ29tcGF0aWJpbGl0eVNuYXBzaG90IHtcbiAgcnVudGltZVR5cGU6IENvZGV4UnVudGltZVR5cGU7XG4gIGFwcFZlcnNpb246IHN0cmluZyB8IG51bGw7XG4gIGJ1aWxkRmxhdm9yOiBzdHJpbmcgfCBudWxsO1xuICBwcmVsb2FkOiB7XG4gICAgcmVnaXN0ZXJQcmVsb2FkU2NyaXB0OiBib29sZWFuO1xuICAgIHNldFByZWxvYWRzRmFsbGJhY2s6IGJvb2xlYW47XG4gIH07XG4gIHdpbmRvd3M6IHtcbiAgICB3aW5kb3dTZXJ2aWNlczogYm9vbGVhbjtcbiAgICBjcmVhdGVXaW5kb3c6IGJvb2xlYW47XG4gICAgZ2V0UHJpbWFyeVdpbmRvdzogYm9vbGVhbjtcbiAgICByZWdpc3RlcldpbmRvdzogYm9vbGVhbjtcbiAgfTtcbiAgdmlld3M6IHtcbiAgICBicm93c2VyVmlldzogYm9vbGVhbjtcbiAgICBjb250ZW50VmlldzogYm9vbGVhbjtcbiAgICB3ZWJDb250ZW50c1ZpZXc6IGJvb2xlYW47XG4gICAgcHJpdmF0ZVZpZXdUcmVlOiBib29sZWFuO1xuICB9O1xuICBzaGVsbDoge1xuICAgIG93bDogYm9vbGVhbjtcbiAgICBlbGVjdHJvbkNvbXBhdGlibGU6IGJvb2xlYW47XG4gIH07XG4gIHN1cHBvcnQ6IHtcbiAgICBsZXZlbDogUnVudGltZVN1cHBvcnRMZXZlbDtcbiAgICByZWFzb25zOiBzdHJpbmdbXTtcbiAgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbnNwZWN0ZWRXaW5kb3dTZXJ2aWNlcyB7XG4gIHByZXNlbnQ6IGJvb2xlYW47XG4gIGNyZWF0ZVdpbmRvdzogYm9vbGVhbjtcbiAgY3JlYXRlRnJlc2hXaW5kb3c6IGJvb2xlYW47XG4gIGNyZWF0ZUZyZXNoTG9jYWxXaW5kb3c6IGJvb2xlYW47XG4gIGVuc3VyZUhvc3RXaW5kb3c6IGJvb2xlYW47XG4gIGdldFByaW1hcnlXaW5kb3c6IGJvb2xlYW47XG4gIGdldFByaW1hcnlXaW5kb3dGcm9tTWFuYWdlcjogYm9vbGVhbjtcbiAgcmVnaXN0ZXJXaW5kb3c6IGJvb2xlYW47XG4gIGNhbkNyZWF0ZTogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBWaWV3QXR0YWNoVGFyZ2V0cyB7XG4gIGFkZEJyb3dzZXJWaWV3OiBib29sZWFuO1xuICBjb250ZW50VmlldzogYm9vbGVhbjtcbiAgYWRkQ2hpbGRWaWV3OiBib29sZWFuO1xuICByZW1vdmVDaGlsZFZpZXc6IGJvb2xlYW47XG4gIHdlYkNvbnRlbnRzVmlldzogYm9vbGVhbjtcbiAgd2ViQ29udGVudHNWaWV3U2V0Qm91bmRzOiBib29sZWFuO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJvYmVSdW50aW1lQ29tcGF0aWJpbGl0eShvcHRzOiBSdW50aW1lUHJvYmVPcHRpb25zKTogUnVudGltZUNvbXBhdGliaWxpdHlTbmFwc2hvdCB7XG4gIGNvbnN0IGVudiA9IHsgLi4uY3JlYXRlRGVmYXVsdFByb2JlRW52KG9wdHMpLCAuLi5vcHRzLmVudiB9O1xuICBjb25zdCBnZXRXaW5kb3dTZXJ2aWNlcyA9IGVudi5nZXRXaW5kb3dTZXJ2aWNlcyA/PyBvcHRzLmdldFdpbmRvd1NlcnZpY2VzO1xuICBjb25zdCBydW50aW1lVHlwZSA9IGRldGVjdFJ1bnRpbWVUeXBlKGVudik7XG4gIGNvbnN0IGFwcFZlcnNpb24gPSBvcHRzLmNvZGV4VmVyc2lvbiA/PyBzYWZlQ2FsbCgoKSA9PiBlbnYuYXBwPy5nZXRWZXJzaW9uPy4oKSkgPz8gbnVsbDtcbiAgY29uc3QgYXBwUGF0aCA9IHNhZmVBcHBQYXRoKGVudik7XG4gIGNvbnN0IGJ1aWxkRmxhdm9yID0gc2FmZUJ1aWxkRmxhdm9yKGVudiwgYXBwUGF0aCk7XG4gIGNvbnN0IHNlc3Npb24gPSBkZWZhdWx0U2Vzc2lvbkZyb20oZW52KTtcbiAgY29uc3QgcHJlbG9hZFN0cmF0ZWd5ID0gc2VsZWN0UHJlbG9hZFJlZ2lzdHJhdGlvbihzZXNzaW9uKTtcbiAgY29uc3Qgd2luZG93cyA9IGluc3BlY3RXaW5kb3dTZXJ2aWNlcyhzYWZlQ2FsbChnZXRXaW5kb3dTZXJ2aWNlcykgPz8gbnVsbCk7XG4gIGNvbnN0IHdpbmRvd1NhbXBsZSA9IGVudi5pbnNwZWN0RXhpc3RpbmdXaW5kb3c/LigpID8/IG51bGw7XG4gIGNvbnN0IHZpZXdTYW1wbGUgPSBlbnYuaW5zcGVjdEJyb3dzZXJWaWV3Py4oKSA/PyB2aWV3U2FtcGxlRnJvbUNvbnN0cnVjdG9yKGVudi5icm93c2VyVmlldyk7XG4gIGNvbnN0IGF0dGFjaCA9IGluc3BlY3RWaWV3QXR0YWNoVGFyZ2V0cyh3aW5kb3dTYW1wbGVUb1BhcmVudCh3aW5kb3dTYW1wbGUpLCB2aWV3U2FtcGxlVG9WaWV3KHZpZXdTYW1wbGUpKTtcbiAgY29uc3QgYnJvd3NlclZpZXdDdG9yID0gZW52LmJyb3dzZXJWaWV3ICE9IG51bGwgfHwgQm9vbGVhbih2aWV3U2FtcGxlPy5wcmVzZW50KTtcbiAgY29uc3QgYnJvd3NlclZpZXcgPSBhdHRhY2guYWRkQnJvd3NlclZpZXcgfHwgYnJvd3NlclZpZXdDdG9yO1xuICBjb25zdCB3ZWJDb250ZW50c1ZpZXdPYnNlcnZlZCA9IEJvb2xlYW4odmlld1NhbXBsZT8ud2ViQ29udGVudHNWaWV3KSB8fCBhdHRhY2gud2ViQ29udGVudHNWaWV3O1xuICBjb25zdCB3ZWJDb250ZW50c1ZpZXdTZXRCb3VuZHMgPVxuICAgIGF0dGFjaC53ZWJDb250ZW50c1ZpZXdTZXRCb3VuZHMgfHxcbiAgICBpc0ZuKGFzUmVjb3JkKHZpZXdTYW1wbGU/LndlYkNvbnRlbnRzVmlldyk/LnNldEJvdW5kcyk7XG4gIGNvbnN0IHdlYkNvbnRlbnRzVmlldyA9IHdlYkNvbnRlbnRzVmlld09ic2VydmVkICYmIHdlYkNvbnRlbnRzVmlld1NldEJvdW5kcztcbiAgY29uc3QgcHJpdmF0ZVZpZXdUcmVlID0gYXR0YWNoLmFkZENoaWxkVmlldyAmJiBhdHRhY2gucmVtb3ZlQ2hpbGRWaWV3ICYmIHdlYkNvbnRlbnRzVmlldztcbiAgY29uc3QgZWxlY3Ryb25Db21wYXRpYmxlID1cbiAgICBydW50aW1lVHlwZSA9PT0gXCJlbGVjdHJvblwiIHx8XG4gICAgcnVudGltZVR5cGUgPT09IFwib3dsXCIgfHxcbiAgICBzZXNzaW9uICE9IG51bGwgfHxcbiAgICBlbnYuYnJvd3NlcldpbmRvdyAhPSBudWxsIHx8XG4gICAgZW52LmJyb3dzZXJWaWV3ICE9IG51bGwgfHxcbiAgICBlbnYuYXBwICE9IG51bGw7XG4gIGNvbnN0IG93bCA9IHJ1bnRpbWVUeXBlID09PSBcIm93bFwiO1xuICBjb25zdCBwcmVsb2FkID0ge1xuICAgIHJlZ2lzdGVyUHJlbG9hZFNjcmlwdDogcHJlbG9hZFN0cmF0ZWd5ID09PSBcInJlZ2lzdGVyUHJlbG9hZFNjcmlwdFwiLFxuICAgIHNldFByZWxvYWRzRmFsbGJhY2s6IGlzRm4oYXNSZWNvcmQoc2Vzc2lvbik/LnNldFByZWxvYWRzKSxcbiAgfTtcbiAgY29uc3Qgc25hcHNob3RXaW5kb3dzID0ge1xuICAgIHdpbmRvd1NlcnZpY2VzOiB3aW5kb3dzLnByZXNlbnQsXG4gICAgY3JlYXRlV2luZG93OiB3aW5kb3dzLmNhbkNyZWF0ZSxcbiAgICBnZXRQcmltYXJ5V2luZG93OiB3aW5kb3dzLmdldFByaW1hcnlXaW5kb3cgfHwgd2luZG93cy5nZXRQcmltYXJ5V2luZG93RnJvbU1hbmFnZXIsXG4gICAgcmVnaXN0ZXJXaW5kb3c6IHdpbmRvd3MucmVnaXN0ZXJXaW5kb3csXG4gIH07XG4gIGNvbnN0IHNuYXBzaG90Vmlld3MgPSB7XG4gICAgYnJvd3NlclZpZXcsXG4gICAgY29udGVudFZpZXc6IGF0dGFjaC5jb250ZW50VmlldyxcbiAgICB3ZWJDb250ZW50c1ZpZXcsXG4gICAgcHJpdmF0ZVZpZXdUcmVlLFxuICB9O1xuICBjb25zdCBzaGVsbCA9IHsgb3dsLCBlbGVjdHJvbkNvbXBhdGlibGUgfTtcbiAgcmV0dXJuIHtcbiAgICBydW50aW1lVHlwZSxcbiAgICBhcHBWZXJzaW9uLFxuICAgIGJ1aWxkRmxhdm9yLFxuICAgIHByZWxvYWQsXG4gICAgd2luZG93czogc25hcHNob3RXaW5kb3dzLFxuICAgIHZpZXdzOiBzbmFwc2hvdFZpZXdzLFxuICAgIHNoZWxsLFxuICAgIHN1cHBvcnQ6IHN1cHBvcnRGcm9tKHJ1bnRpbWVUeXBlLCBlbGVjdHJvbkNvbXBhdGlibGUsIHByZWxvYWQsIHNuYXBzaG90V2luZG93cywgc25hcHNob3RWaWV3cyksXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRSdW50aW1lSW5mbyhvcHRzOiBSdW50aW1lUHJvYmVPcHRpb25zKTogQ29kZXhSdW50aW1lSW5mbyB7XG4gIGNvbnN0IHNuYXBzaG90ID0gcHJvYmVSdW50aW1lQ29tcGF0aWJpbGl0eShvcHRzKTtcbiAgY29uc3QgZW52ID0geyAuLi5jcmVhdGVEZWZhdWx0UHJvYmVFbnYob3B0cyksIC4uLm9wdHMuZW52IH07XG4gIHJldHVybiB7XG4gICAgdHlwZTogc25hcHNob3QucnVudGltZVR5cGUsXG4gICAgY29kZXhWZXJzaW9uOiBzbmFwc2hvdC5hcHBWZXJzaW9uLFxuICAgIGNoYW5uZWw6IG9wdHMuY2hhbm5lbCxcbiAgICBidWlsZEZsYXZvcjogc25hcHNob3QuYnVpbGRGbGF2b3IsXG4gICAgdXNlc093bEFwcFNoZWxsOiBudWxsLFxuICAgIGFwcFBhdGg6IHNhZmVBcHBQYXRoKGVudiksXG4gICAgcmVzb3VyY2VzUGF0aDogZW52LnJlc291cmNlc1BhdGggPz8gbnVsbCxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFJ1bnRpbWVDYXBhYmlsaXRpZXMob3B0czogUnVudGltZVByb2JlT3B0aW9ucyk6IENvZGV4UnVudGltZUNhcGFiaWxpdGllcyB7XG4gIGNvbnN0IHNuYXBzaG90ID0gcHJvYmVSdW50aW1lQ29tcGF0aWJpbGl0eShvcHRzKTtcbiAgY29uc3QgbmF0aXZlID0gb3B0cy5nZXROYXRpdmVDYXBhYmlsaXRpZXM/LigpID8/IGRlZmF1bHROYXRpdmVDYXBhYmlsaXRpZXMob3B0cy5lbnY/LnBsYXRmb3JtID8/IHByb2Nlc3MucGxhdGZvcm0pO1xuICBjb25zdCBlbnYgPSB7IC4uLmNyZWF0ZURlZmF1bHRQcm9iZUVudihvcHRzKSwgLi4ub3B0cy5lbnYgfTtcbiAgY29uc3QgY2FuRm9jdXMgPSBpc0ZuKGFzUmVjb3JkKGVudi5icm93c2VyV2luZG93KT8uZnJvbUlkKSB8fCBzbmFwc2hvdC5zaGVsbC5lbGVjdHJvbkNvbXBhdGlibGU7XG4gIHJldHVybiBjYXBhYmlsaXRpZXNGcm9tU25hcHNob3Qoc25hcHNob3QsIG5hdGl2ZSwgY2FuRm9jdXMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2FwYWJpbGl0aWVzRnJvbVNuYXBzaG90KFxuICBzbmFwc2hvdDogUnVudGltZUNvbXBhdGliaWxpdHlTbmFwc2hvdCxcbiAgbmF0aXZlOiBDb2RleFJ1bnRpbWVDYXBhYmlsaXRpZXNbXCJuYXRpdmVcIl0sXG4gIGNhbkZvY3VzID0gdHJ1ZSxcbik6IENvZGV4UnVudGltZUNhcGFiaWxpdGllcyB7XG4gIGNvbnN0IGNkcCA9IGdldENkcFN0YXR1cygpO1xuICByZXR1cm4ge1xuICAgIHdpbmRvd3M6IHtcbiAgICAgIGNyZWF0ZTogc25hcHNob3Qud2luZG93cy5jcmVhdGVXaW5kb3csXG4gICAgICBmb2N1czogY2FuRm9jdXMsXG4gICAgICBwcmltYXJ5OiBzbmFwc2hvdC53aW5kb3dzLmdldFByaW1hcnlXaW5kb3csXG4gICAgICBicm93c2VyVmlldzogc25hcHNob3Qud2luZG93cy5yZWdpc3RlcldpbmRvdyxcbiAgICB9LFxuICAgIHZpZXdzOiB2aWV3c0NhcGFiaWxpdGllc0Zyb21TbmFwc2hvdChzbmFwc2hvdCksXG4gICAgY2RwOiB7XG4gICAgICBzdXBwb3J0ZWQ6IHRydWUsXG4gICAgICBlbmFibGVkOiBjZHAuZW5hYmxlZCxcbiAgICAgIHBvcnQ6IGNkcC5wb3J0LFxuICAgIH0sXG4gICAgbmF0aXZlLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdmlld3NDYXBhYmlsaXRpZXNGcm9tU25hcHNob3QoXG4gIHNuYXBzaG90OiBSdW50aW1lQ29tcGF0aWJpbGl0eVNuYXBzaG90LFxuKTogQ29kZXhSdW50aW1lQ2FwYWJpbGl0aWVzW1widmlld3NcIl0ge1xuICBjb25zdCBwcml2YXRlQXR0YWNoID0gc25hcHNob3Qudmlld3MucHJpdmF0ZVZpZXdUcmVlO1xuICByZXR1cm4ge1xuICAgIGNyZWF0ZTogcHJpdmF0ZUF0dGFjaCB8fCBzbmFwc2hvdC52aWV3cy5icm93c2VyVmlldyxcbiAgICBwcml2YXRlVmlld1RyZWU6IHByaXZhdGVBdHRhY2gsXG4gICAgd2ViQ29udGVudHNWaWV3OiBzbmFwc2hvdC52aWV3cy53ZWJDb250ZW50c1ZpZXcsXG4gICAgYnJvd3NlclZpZXdGYWxsYmFjazogc25hcHNob3Qudmlld3MuYnJvd3NlclZpZXcsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDZHBTdGF0dXMoKTogQ29kZXhDZHBTdGF0dXMge1xuICBjb25zdCBlbmFibGVkID0gcHJvY2Vzcy5lbnYuQ09ERVhQUF9SRU1PVEVfREVCVUcgPT09IFwiMVwiO1xuICBjb25zdCBwb3J0ID0gcGFyc2VDZHBQb3J0KHByb2Nlc3MuZW52LkNPREVYUFBfUkVNT1RFX0RFQlVHX1BPUlQpO1xuICByZXR1cm4ge1xuICAgIHN1cHBvcnRlZDogdHJ1ZSxcbiAgICBlbmFibGVkLFxuICAgIHBvcnQ6IGVuYWJsZWQgPyBwb3J0IDogbnVsbCxcbiAgICB1cmw6IGVuYWJsZWQgPyBgaHR0cDovLzEyNy4wLjAuMToke3BvcnR9YCA6IG51bGwsXG4gIH07XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsaXN0Q2RwVGFyZ2V0cygpOiBQcm9taXNlPENvZGV4Q2RwVGFyZ2V0W10+IHtcbiAgY29uc3Qgc3RhdHVzID0gZ2V0Q2RwU3RhdHVzKCk7XG4gIGlmICghc3RhdHVzLmVuYWJsZWQgfHwgIXN0YXR1cy51cmwpIHJldHVybiBbXTtcbiAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgY29uc3QgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4gY29udHJvbGxlci5hYm9ydCgpLCAxMDAwKTtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaChgJHtzdGF0dXMudXJsfS9qc29uYCwgeyBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsIH0pO1xuICAgIGlmICghcmVzLm9rKSByZXR1cm4gW107XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHJlcy5qc29uKCkgYXMgdW5rbm93bjtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkocm93cykpIHJldHVybiBbXTtcbiAgICByZXR1cm4gcm93c1xuICAgICAgLm1hcCgocm93KSA9PiBub3JtYWxpemVDZHBUYXJnZXQocm93KSlcbiAgICAgIC5maWx0ZXIoKHJvdyk6IHJvdyBpcyBDb2RleENkcFRhcmdldCA9PiByb3cgIT09IG51bGwpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gW107XG4gIH0gZmluYWxseSB7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZWxlY3RQcmVsb2FkUmVnaXN0cmF0aW9uKHNlc3Npb25MaWtlOiB1bmtub3duKTogUHJlbG9hZFJlZ2lzdHJhdGlvblN0cmF0ZWd5IHtcbiAgY29uc3Qgc2Vzc2lvbiA9IGFzUmVjb3JkKHNlc3Npb25MaWtlKTtcbiAgaWYgKGlzRm4oc2Vzc2lvbj8ucmVnaXN0ZXJQcmVsb2FkU2NyaXB0KSkgcmV0dXJuIFwicmVnaXN0ZXJQcmVsb2FkU2NyaXB0XCI7XG4gIGlmIChpc0ZuKHNlc3Npb24/LnNldFByZWxvYWRzKSkgcmV0dXJuIFwic2V0UHJlbG9hZHNcIjtcbiAgcmV0dXJuIFwidW5hdmFpbGFibGVcIjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluc3BlY3RXaW5kb3dTZXJ2aWNlcyhzZXJ2aWNlczogdW5rbm93bik6IEluc3BlY3RlZFdpbmRvd1NlcnZpY2VzIHtcbiAgY29uc3QgcmVjID0gYXNSZWNvcmQoc2VydmljZXMpO1xuICBjb25zdCB3aW5kb3dNYW5hZ2VyID0gYXNSZWNvcmQocmVjPy53aW5kb3dNYW5hZ2VyKTtcbiAgY29uc3QgY3JlYXRlV2luZG93ID0gaXNGbih3aW5kb3dNYW5hZ2VyPy5jcmVhdGVXaW5kb3cpO1xuICBjb25zdCBjcmVhdGVGcmVzaFdpbmRvdyA9IGlzRm4ocmVjPy5jcmVhdGVGcmVzaFdpbmRvdyk7XG4gIGNvbnN0IGNyZWF0ZUZyZXNoTG9jYWxXaW5kb3cgPSBpc0ZuKHJlYz8uY3JlYXRlRnJlc2hMb2NhbFdpbmRvdyk7XG4gIGNvbnN0IGVuc3VyZUhvc3RXaW5kb3cgPSBpc0ZuKHJlYz8uZW5zdXJlSG9zdFdpbmRvdyk7XG4gIGNvbnN0IGdldFByaW1hcnlXaW5kb3cgPSBpc0ZuKHJlYz8uZ2V0UHJpbWFyeVdpbmRvdyk7XG4gIGNvbnN0IGdldFByaW1hcnlXaW5kb3dGcm9tTWFuYWdlciA9IGlzRm4od2luZG93TWFuYWdlcj8uZ2V0UHJpbWFyeVdpbmRvdyk7XG4gIGNvbnN0IHJlZ2lzdGVyV2luZG93ID0gaXNGbih3aW5kb3dNYW5hZ2VyPy5yZWdpc3RlcldpbmRvdyk7XG4gIHJldHVybiB7XG4gICAgcHJlc2VudDogcmVjICE9PSBudWxsLFxuICAgIGNyZWF0ZVdpbmRvdyxcbiAgICBjcmVhdGVGcmVzaFdpbmRvdyxcbiAgICBjcmVhdGVGcmVzaExvY2FsV2luZG93LFxuICAgIGVuc3VyZUhvc3RXaW5kb3csXG4gICAgZ2V0UHJpbWFyeVdpbmRvdyxcbiAgICBnZXRQcmltYXJ5V2luZG93RnJvbU1hbmFnZXIsXG4gICAgcmVnaXN0ZXJXaW5kb3csXG4gICAgY2FuQ3JlYXRlOiBjcmVhdGVXaW5kb3cgfHwgY3JlYXRlRnJlc2hXaW5kb3cgfHwgY3JlYXRlRnJlc2hMb2NhbFdpbmRvdyB8fCBlbnN1cmVIb3N0V2luZG93LFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5zcGVjdFZpZXdBdHRhY2hUYXJnZXRzKHBhcmVudDogdW5rbm93biwgdmlldz86IHVua25vd24pOiBWaWV3QXR0YWNoVGFyZ2V0cyB7XG4gIGNvbnN0IHBhcmVudFJlY29yZCA9IGFzUmVjb3JkKHBhcmVudCk7XG4gIGNvbnN0IGNvbnRlbnRWaWV3ID0gYXNSZWNvcmQocGFyZW50UmVjb3JkPy5jb250ZW50Vmlldyk7XG4gIGNvbnN0IHZpZXdSZWNvcmQgPSBhc1JlY29yZCh2aWV3KTtcbiAgY29uc3Qgd2ViQ29udGVudHNWaWV3ID0gYXNSZWNvcmQodmlld1JlY29yZD8ud2ViQ29udGVudHNWaWV3KTtcbiAgY29uc3Qgd2ViQ29udGVudHNWaWV3UHJlc2VudCA9IEJvb2xlYW4odmlld1JlY29yZCAmJiB2aWV3UmVjb3JkLndlYkNvbnRlbnRzVmlldyk7XG4gIHJldHVybiB7XG4gICAgYWRkQnJvd3NlclZpZXc6IGlzRm4ocGFyZW50UmVjb3JkPy5hZGRCcm93c2VyVmlldyksXG4gICAgY29udGVudFZpZXc6IGNvbnRlbnRWaWV3ICE9PSBudWxsLFxuICAgIGFkZENoaWxkVmlldzogaXNGbihjb250ZW50Vmlldz8uYWRkQ2hpbGRWaWV3KSxcbiAgICByZW1vdmVDaGlsZFZpZXc6IGlzRm4oY29udGVudFZpZXc/LnJlbW92ZUNoaWxkVmlldyksXG4gICAgd2ViQ29udGVudHNWaWV3OiB3ZWJDb250ZW50c1ZpZXdQcmVzZW50LFxuICAgIHdlYkNvbnRlbnRzVmlld1NldEJvdW5kczogaXNGbih3ZWJDb250ZW50c1ZpZXc/LnNldEJvdW5kcykgfHwgaXNGbih2aWV3UmVjb3JkPy5zZXRCb3VuZHMpLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd2luZG93U2FtcGxlRnJvbSh3aW46IHVua25vd24pOiBQcm9iZVdpbmRvd1NhbXBsZSB8IG51bGwge1xuICBjb25zdCByZWMgPSBhc1JlY29yZCh3aW4pO1xuICBpZiAoIXJlYykgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGNvbnRlbnRWaWV3ID0gYXNSZWNvcmQocmVjLmNvbnRlbnRWaWV3KTtcbiAgcmV0dXJuIHtcbiAgICBhZGRCcm93c2VyVmlldzogcmVjLmFkZEJyb3dzZXJWaWV3LFxuICAgIGZyb21JZDogcmVjLmZyb21JZCxcbiAgICBjb250ZW50VmlldzogcmVjLmNvbnRlbnRWaWV3LFxuICAgIGFkZENoaWxkVmlldzogY29udGVudFZpZXc/LmFkZENoaWxkVmlldyxcbiAgICByZW1vdmVDaGlsZFZpZXc6IGNvbnRlbnRWaWV3Py5yZW1vdmVDaGlsZFZpZXcsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2aWV3U2FtcGxlRnJvbUNvbnN0cnVjdG9yKGJyb3dzZXJWaWV3OiB1bmtub3duKTogUHJvYmVWaWV3U2FtcGxlIHwgbnVsbCB7XG4gIGlmIChicm93c2VyVmlldyA9PSBudWxsKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgY3RvciA9IGFzUmVjb3JkKGJyb3dzZXJWaWV3KTtcbiAgY29uc3QgcHJvdG8gPSBhc1JlY29yZChjdG9yPy5wcm90b3R5cGUpID8/ICh0eXBlb2YgYnJvd3NlclZpZXcgPT09IFwib2JqZWN0XCIgPyBhc1JlY29yZChPYmplY3QuZ2V0UHJvdG90eXBlT2YoYnJvd3NlclZpZXcpKSA6IG51bGwpO1xuICBjb25zdCB3ZWJDb250ZW50c1ZpZXcgPSBwcm90bz8ud2ViQ29udGVudHNWaWV3ID8/IGN0b3I/LndlYkNvbnRlbnRzVmlldztcbiAgcmV0dXJuIHtcbiAgICBwcmVzZW50OiB0eXBlb2YgYnJvd3NlclZpZXcgPT09IFwiZnVuY3Rpb25cIiB8fCBwcm90byAhPT0gbnVsbCxcbiAgICB3ZWJDb250ZW50c1ZpZXcsXG4gICAgc2V0Qm91bmRzOiBhc1JlY29yZCh3ZWJDb250ZW50c1ZpZXcpPy5zZXRCb3VuZHMgPz8gcHJvdG8/LnNldEJvdW5kcyxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZURlZmF1bHRQcm9iZUVudihvcHRzPzogUGljazxSdW50aW1lUHJvYmVPcHRpb25zLCBcImdldFdpbmRvd1NlcnZpY2VzXCI+KTogUnVudGltZVByb2JlRW52IHtcbiAgY29uc3QgZWxlY3Ryb24gPSB0cnlSZXF1aXJlRWxlY3Ryb24oKTtcbiAgY29uc3QgQnJvd3NlcldpbmRvdyA9IGVsZWN0cm9uPy5Ccm93c2VyV2luZG93O1xuICBjb25zdCBCcm93c2VyVmlldyA9IGVsZWN0cm9uPy5Ccm93c2VyVmlldztcbiAgcmV0dXJuIHtcbiAgICBwbGF0Zm9ybTogcHJvY2Vzcy5wbGF0Zm9ybSxcbiAgICBleGVjUGF0aDogcHJvY2Vzcy5leGVjUGF0aCxcbiAgICByZXNvdXJjZXNQYXRoOiBwcm9jZXNzLnJlc291cmNlc1BhdGggPz8gbnVsbCxcbiAgICBleGlzdHNTeW5jLFxuICAgIHByb2Nlc3NFbnY6IHByb2Nlc3MuZW52LFxuICAgIGFwcDogZWxlY3Ryb24/LmFwcCA/PyBudWxsLFxuICAgIHNlc3Npb246IGVsZWN0cm9uPy5zZXNzaW9uID8/IG51bGwsXG4gICAgYnJvd3NlcldpbmRvdzogQnJvd3NlcldpbmRvdyA/PyBudWxsLFxuICAgIGJyb3dzZXJWaWV3OiBCcm93c2VyVmlldyA/PyBudWxsLFxuICAgIGdldFdpbmRvd1NlcnZpY2VzOiBvcHRzPy5nZXRXaW5kb3dTZXJ2aWNlcyxcbiAgICBpbnNwZWN0RXhpc3RpbmdXaW5kb3c6ICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGZvY3VzZWQgPSBCcm93c2VyV2luZG93Py5nZXRGb2N1c2VkV2luZG93Py4oKTtcbiAgICAgICAgaWYgKGZvY3VzZWQpIHJldHVybiB3aW5kb3dTYW1wbGVGcm9tKGZvY3VzZWQpO1xuICAgICAgICBjb25zdCB3aW5kb3dzID0gQnJvd3NlcldpbmRvdz8uZ2V0QWxsV2luZG93cz8uKCkgPz8gW107XG4gICAgICAgIGNvbnN0IGxpdmUgPSB3aW5kb3dzLmZpbmQoKHdpbikgPT4ge1xuICAgICAgICAgIGNvbnN0IGlzRGVzdHJveWVkID0gYXNSZWNvcmQod2luKT8uaXNEZXN0cm95ZWQ7XG4gICAgICAgICAgcmV0dXJuIHR5cGVvZiBpc0Rlc3Ryb3llZCAhPT0gXCJmdW5jdGlvblwiIHx8ICFpc0Rlc3Ryb3llZC5jYWxsKHdpbik7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gd2luZG93U2FtcGxlRnJvbShsaXZlID8/IG51bGwpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH0sXG4gICAgaW5zcGVjdEJyb3dzZXJWaWV3OiAoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBmcm9tQ3RvciA9IHZpZXdTYW1wbGVGcm9tQ29uc3RydWN0b3IoQnJvd3NlclZpZXcpO1xuICAgICAgICBpZiAoZnJvbUN0b3I/LndlYkNvbnRlbnRzVmlldykgcmV0dXJuIGZyb21DdG9yO1xuICAgICAgICBjb25zdCB3aW5kb3dzID0gQnJvd3NlcldpbmRvdz8uZ2V0QWxsV2luZG93cz8uKCkgPz8gW107XG4gICAgICAgIGZvciAoY29uc3Qgd2luIG9mIHdpbmRvd3MpIHtcbiAgICAgICAgICBjb25zdCB2aWV3cyA9IGFzUmVjb3JkKHdpbik/LmdldEJyb3dzZXJWaWV3cztcbiAgICAgICAgICBpZiAodHlwZW9mIHZpZXdzICE9PSBcImZ1bmN0aW9uXCIpIGNvbnRpbnVlO1xuICAgICAgICAgIGNvbnN0IGxpc3RlZCA9IHZpZXdzLmNhbGwod2luKTtcbiAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobGlzdGVkKSkgY29udGludWU7XG4gICAgICAgICAgZm9yIChjb25zdCB2aWV3IG9mIGxpc3RlZCkge1xuICAgICAgICAgICAgY29uc3Qgc2FtcGxlID0gdmlld1NhbXBsZUZyb21JbnN0YW5jZSh2aWV3KTtcbiAgICAgICAgICAgIGlmIChzYW1wbGU/LndlYkNvbnRlbnRzVmlldykgcmV0dXJuIHNhbXBsZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZyb21DdG9yO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiB2aWV3U2FtcGxlRnJvbUNvbnN0cnVjdG9yKEJyb3dzZXJWaWV3KTtcbiAgICAgIH1cbiAgICB9LFxuICB9O1xufVxuXG5mdW5jdGlvbiBzdXBwb3J0RnJvbShcbiAgcnVudGltZVR5cGU6IENvZGV4UnVudGltZVR5cGUsXG4gIGVsZWN0cm9uQ29tcGF0aWJsZTogYm9vbGVhbixcbiAgcHJlbG9hZDogUnVudGltZUNvbXBhdGliaWxpdHlTbmFwc2hvdFtcInByZWxvYWRcIl0sXG4gIHdpbmRvd3M6IFJ1bnRpbWVDb21wYXRpYmlsaXR5U25hcHNob3RbXCJ3aW5kb3dzXCJdLFxuICB2aWV3czogUnVudGltZUNvbXBhdGliaWxpdHlTbmFwc2hvdFtcInZpZXdzXCJdLFxuKTogUnVudGltZUNvbXBhdGliaWxpdHlTbmFwc2hvdFtcInN1cHBvcnRcIl0ge1xuICBjb25zdCByZWFzb25zOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBoYXNVc2VmdWxDYXBhYmlsaXR5ID1cbiAgICB3aW5kb3dzLndpbmRvd1NlcnZpY2VzIHx8XG4gICAgd2luZG93cy5jcmVhdGVXaW5kb3cgfHxcbiAgICBwcmVsb2FkLnJlZ2lzdGVyUHJlbG9hZFNjcmlwdCB8fFxuICAgIHByZWxvYWQuc2V0UHJlbG9hZHNGYWxsYmFjayB8fFxuICAgIHZpZXdzLmJyb3dzZXJWaWV3IHx8XG4gICAgdmlld3MucHJpdmF0ZVZpZXdUcmVlIHx8XG4gICAgZWxlY3Ryb25Db21wYXRpYmxlO1xuXG4gIGlmIChydW50aW1lVHlwZSA9PT0gXCJ1bmtub3duXCIgJiYgIWhhc1VzZWZ1bENhcGFiaWxpdHkpIHtcbiAgICByZXR1cm4geyBsZXZlbDogXCJ1bmtub3duXCIsIHJlYXNvbnM6IFtcInJ1bnRpbWUgdHlwZSBhbmQgY2FwYWJpbGl0aWVzIGNvdWxkIG5vdCBiZSBkZXRlcm1pbmVkXCJdIH07XG4gIH1cbiAgaWYgKHJ1bnRpbWVUeXBlID09PSBcInVua25vd25cIiAmJiBoYXNVc2VmdWxDYXBhYmlsaXR5KSB7XG4gICAgcmVhc29ucy5wdXNoKFwicnVudGltZSB0eXBlIGNvdWxkIG5vdCBiZSBkZXRlcm1pbmVkXCIpO1xuICB9XG5cbiAgaWYgKCF3aW5kb3dzLndpbmRvd1NlcnZpY2VzKSByZWFzb25zLnB1c2goXCJ3aW5kb3cgc2VydmljZXMgdW5hdmFpbGFibGVcIik7XG4gIGlmICghd2luZG93cy5jcmVhdGVXaW5kb3cpIHJlYXNvbnMucHVzaChcImNyZWF0ZVdpbmRvdyB1bmF2YWlsYWJsZVwiKTtcbiAgaWYgKCFwcmVsb2FkLnJlZ2lzdGVyUHJlbG9hZFNjcmlwdCAmJiBwcmVsb2FkLnNldFByZWxvYWRzRmFsbGJhY2spIHtcbiAgICByZWFzb25zLnB1c2goXCJyZWdpc3RlclByZWxvYWRTY3JpcHQgbWlzc2luZzsgdXNpbmcgc2V0UHJlbG9hZHMgZmFsbGJhY2tcIik7XG4gIH0gZWxzZSBpZiAoIXByZWxvYWQucmVnaXN0ZXJQcmVsb2FkU2NyaXB0ICYmICFwcmVsb2FkLnNldFByZWxvYWRzRmFsbGJhY2spIHtcbiAgICByZWFzb25zLnB1c2goXCJubyBzZXNzaW9uIHByZWxvYWQgcmVnaXN0cmF0aW9uIEFQSVwiKTtcbiAgfVxuICBpZiAoIXZpZXdzLnByaXZhdGVWaWV3VHJlZSAmJiB2aWV3cy5icm93c2VyVmlldykge1xuICAgIHJlYXNvbnMucHVzaChcInByaXZhdGUgY29udGVudFZpZXcgdW5hdmFpbGFibGU7IHVzaW5nIEJyb3dzZXJWaWV3IGZhbGxiYWNrXCIpO1xuICB9IGVsc2UgaWYgKCF2aWV3cy5wcml2YXRlVmlld1RyZWUgJiYgIXZpZXdzLmJyb3dzZXJWaWV3KSB7XG4gICAgcmVhc29ucy5wdXNoKFwibm8gdmlldyBhdHRhY2htZW50IHN1cmZhY2VcIik7XG4gIH1cblxuICBjb25zdCB1c2luZ0ZhbGxiYWNrID1cbiAgICAoIXByZWxvYWQucmVnaXN0ZXJQcmVsb2FkU2NyaXB0ICYmIHByZWxvYWQuc2V0UHJlbG9hZHNGYWxsYmFjaykgfHxcbiAgICAoIXZpZXdzLnByaXZhdGVWaWV3VHJlZSAmJiB2aWV3cy5icm93c2VyVmlldykgfHxcbiAgICBydW50aW1lVHlwZSA9PT0gXCJlbGVjdHJvblwiIHx8XG4gICAgIXdpbmRvd3Mud2luZG93U2VydmljZXMgfHxcbiAgICAhd2luZG93cy5jcmVhdGVXaW5kb3c7XG5cbiAgaWYgKHJ1bnRpbWVUeXBlID09PSBcInVua25vd25cIikge1xuICAgIHJldHVybiB7IGxldmVsOiBcInVua25vd25cIiwgcmVhc29ucyB9O1xuICB9XG4gIGlmICh1c2luZ0ZhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHsgbGV2ZWw6IFwiZGVncmFkZWRcIiwgcmVhc29ucyB9O1xuICB9XG4gIHJldHVybiB7IGxldmVsOiBcInN1cHBvcnRlZFwiLCByZWFzb25zOiBbXSB9O1xufVxuXG5mdW5jdGlvbiBkZXRlY3RSdW50aW1lVHlwZShlbnY6IFJ1bnRpbWVQcm9iZUVudik6IENvZGV4UnVudGltZVR5cGUge1xuICBjb25zdCBwbGF0Zm9ybSA9IGVudi5wbGF0Zm9ybSA/PyBwcm9jZXNzLnBsYXRmb3JtO1xuICBjb25zdCBleGlzdHMgPSBlbnYuZXhpc3RzU3luYyA/PyBleGlzdHNTeW5jO1xuICBjb25zdCByZXNvdXJjZXNQYXRoID0gZW52LnJlc291cmNlc1BhdGggPz8gbnVsbDtcbiAgaWYgKHBsYXRmb3JtID09PSBcImRhcndpblwiKSB7XG4gICAgY29uc3QgYXBwUm9vdCA9IGluZmVyTWFjQXBwUm9vdChlbnYuZXhlY1BhdGggPz8gcHJvY2Vzcy5leGVjUGF0aCk7XG4gICAgaWYgKGFwcFJvb3QgJiYgZXhpc3RzKGpvaW4oYXBwUm9vdCwgXCJDb250ZW50c1wiLCBcIkZyYW1ld29ya3NcIiwgXCJDb2RleCBGcmFtZXdvcmsuZnJhbWV3b3JrXCIpKSkge1xuICAgICAgcmV0dXJuIFwib3dsXCI7XG4gICAgfVxuICAgIGlmIChhcHBSb290ICYmIGV4aXN0cyhqb2luKGFwcFJvb3QsIFwiQ29udGVudHNcIiwgXCJGcmFtZXdvcmtzXCIsIFwiRWxlY3Ryb24gRnJhbWV3b3JrLmZyYW1ld29ya1wiKSkpIHtcbiAgICAgIHJldHVybiBcImVsZWN0cm9uXCI7XG4gICAgfVxuICAgIGlmIChyZXNvdXJjZXNQYXRoICYmIGV4aXN0cyhqb2luKHJlc291cmNlc1BhdGgsIFwiYXBwLmFzYXJcIikpKSB7XG4gICAgICByZXR1cm4gXCJlbGVjdHJvblwiO1xuICAgIH1cbiAgICByZXR1cm4gXCJ1bmtub3duXCI7XG4gIH1cbiAgcmV0dXJuIHJlc291cmNlc1BhdGggJiYgZXhpc3RzKGpvaW4ocmVzb3VyY2VzUGF0aCwgXCJhcHAuYXNhclwiKSkgPyBcImVsZWN0cm9uXCIgOiBcInVua25vd25cIjtcbn1cblxuZnVuY3Rpb24gaW5mZXJNYWNBcHBSb290KGV4ZWNQYXRoOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgbWFya2VyID0gXCIuYXBwL0NvbnRlbnRzL01hY09TL1wiO1xuICBjb25zdCBpZHggPSBleGVjUGF0aC5pbmRleE9mKG1hcmtlcik7XG4gIHJldHVybiBpZHggPj0gMCA/IGV4ZWNQYXRoLnNsaWNlKDAsIGlkeCArIFwiLmFwcFwiLmxlbmd0aCkgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBzYWZlQXBwUGF0aChlbnY6IFJ1bnRpbWVQcm9iZUVudik6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBmcm9tQXBwID0gc2FmZUNhbGwoKCkgPT4gZW52LmFwcD8uZ2V0QXBwUGF0aD8uKCkpO1xuICBpZiAoZnJvbUFwcCkgcmV0dXJuIGZyb21BcHA7XG4gIHJldHVybiBlbnYucmVzb3VyY2VzUGF0aCA/IGpvaW4oZW52LnJlc291cmNlc1BhdGgsIFwiYXBwLmFzYXJcIikgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBzYWZlQnVpbGRGbGF2b3IoZW52OiBSdW50aW1lUHJvYmVFbnYsIGFwcFBhdGg6IHN0cmluZyB8IG51bGwpOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKCFhcHBQYXRoKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgcGFyZW50ID0gZGlybmFtZShhcHBQYXRoKTtcbiAgaWYgKHBhcmVudC5pbmNsdWRlcyhcIk5pZ2h0bHlcIikpIHJldHVybiBcIm5pZ2h0bHlcIjtcbiAgaWYgKHR5cGVvZiBlbnYuYXBwPy5pc1BhY2thZ2VkID09PSBcImJvb2xlYW5cIikgcmV0dXJuIGVudi5hcHAuaXNQYWNrYWdlZCA/IFwicHJvZFwiIDogXCJkZXZcIjtcbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXNzaW9uRnJvbShlbnY6IFJ1bnRpbWVQcm9iZUVudik6IFByb2JlU2Vzc2lvbkFkYXB0ZXIgfCBudWxsIHtcbiAgY29uc3Qgc2Vzc2lvbiA9IGVudi5zZXNzaW9uIGFzIHsgZGVmYXVsdFNlc3Npb24/OiBQcm9iZVNlc3Npb25BZGFwdGVyIH0gfCBQcm9iZVNlc3Npb25BZGFwdGVyIHwgbnVsbCB8IHVuZGVmaW5lZDtcbiAgaWYgKCFzZXNzaW9uKSByZXR1cm4gbnVsbDtcbiAgaWYgKFwiZGVmYXVsdFNlc3Npb25cIiBpbiBzZXNzaW9uKSByZXR1cm4gYXNSZWNvcmQoc2Vzc2lvbi5kZWZhdWx0U2Vzc2lvbikgYXMgUHJvYmVTZXNzaW9uQWRhcHRlciB8IG51bGw7XG4gIHJldHVybiBhc1JlY29yZChzZXNzaW9uKSBhcyBQcm9iZVNlc3Npb25BZGFwdGVyIHwgbnVsbDtcbn1cblxuZnVuY3Rpb24gd2luZG93U2FtcGxlVG9QYXJlbnQoc2FtcGxlOiBQcm9iZVdpbmRvd1NhbXBsZSB8IG51bGwpOiB1bmtub3duIHtcbiAgaWYgKCFzYW1wbGUpIHJldHVybiBudWxsO1xuICByZXR1cm4ge1xuICAgIGFkZEJyb3dzZXJWaWV3OiBzYW1wbGUuYWRkQnJvd3NlclZpZXcsXG4gICAgY29udGVudFZpZXc6IHNhbXBsZS5jb250ZW50VmlldyA/PyAoXG4gICAgICBzYW1wbGUuYWRkQ2hpbGRWaWV3IHx8IHNhbXBsZS5yZW1vdmVDaGlsZFZpZXdcbiAgICAgICAgPyB7IGFkZENoaWxkVmlldzogc2FtcGxlLmFkZENoaWxkVmlldywgcmVtb3ZlQ2hpbGRWaWV3OiBzYW1wbGUucmVtb3ZlQ2hpbGRWaWV3IH1cbiAgICAgICAgOiB1bmRlZmluZWRcbiAgICApLFxuICB9O1xufVxuXG5mdW5jdGlvbiB2aWV3U2FtcGxlVG9WaWV3KHNhbXBsZTogUHJvYmVWaWV3U2FtcGxlIHwgbnVsbCk6IHVua25vd24ge1xuICBpZiAoIXNhbXBsZSkgcmV0dXJuIG51bGw7XG4gIHJldHVybiB7XG4gICAgd2ViQ29udGVudHNWaWV3OiBzYW1wbGUud2ViQ29udGVudHNWaWV3ID8/IChzYW1wbGUuc2V0Qm91bmRzID8geyBzZXRCb3VuZHM6IHNhbXBsZS5zZXRCb3VuZHMgfSA6IHVuZGVmaW5lZCksXG4gICAgc2V0Qm91bmRzOiBzYW1wbGUuc2V0Qm91bmRzLFxuICB9O1xufVxuXG5mdW5jdGlvbiB2aWV3U2FtcGxlRnJvbUluc3RhbmNlKHZpZXc6IHVua25vd24pOiBQcm9iZVZpZXdTYW1wbGUgfCBudWxsIHtcbiAgY29uc3QgcmVjID0gYXNSZWNvcmQodmlldyk7XG4gIGlmICghcmVjKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHtcbiAgICBwcmVzZW50OiB0cnVlLFxuICAgIHdlYkNvbnRlbnRzVmlldzogcmVjLndlYkNvbnRlbnRzVmlldyxcbiAgICBzZXRCb3VuZHM6IGFzUmVjb3JkKHJlYy53ZWJDb250ZW50c1ZpZXcpPy5zZXRCb3VuZHMgPz8gcmVjLnNldEJvdW5kcyxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdE5hdGl2ZUNhcGFiaWxpdGllcyhwbGF0Zm9ybTogTm9kZUpTLlBsYXRmb3JtKTogQ29kZXhSdW50aW1lQ2FwYWJpbGl0aWVzW1wibmF0aXZlXCJdIHtcbiAgcmV0dXJuIHtcbiAgICBpblByb2Nlc3NNb2R1bGVzOiB0cnVlLFxuICAgIHN3aWZ0TW9kdWxlczogcGxhdGZvcm0gPT09IFwiZGFyd2luXCIsXG4gICAgYXBwS2l0RW1iZWRkaW5nOiBmYWxzZSxcbiAgICBjaGlsZFdpbmRvd092ZXJsYXk6IGZhbHNlLFxuICAgIGRpcmVjdFZpZXdBdHRhY2g6IGZhbHNlLFxuICAgIG1ldGFsVmlld3M6IGZhbHNlLFxuICAgIG5hdGl2ZUhvc3Q6IGZhbHNlLFxuICAgIGhlbHBlcnM6IHRydWUsXG4gIH07XG59XG5cbmZ1bmN0aW9uIHBhcnNlQ2RwUG9ydCh2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkKTogbnVtYmVyIHtcbiAgY29uc3QgcGFyc2VkID0gTnVtYmVyKHZhbHVlID8/IFwiOTIyMlwiKTtcbiAgcmV0dXJuIE51bWJlci5pc0ludGVnZXIocGFyc2VkKSAmJiBwYXJzZWQgPiAwICYmIHBhcnNlZCA8IDY1NTM2ID8gcGFyc2VkIDogOTIyMjtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplQ2RwVGFyZ2V0KHJvdzogdW5rbm93bik6IENvZGV4Q2RwVGFyZ2V0IHwgbnVsbCB7XG4gIGNvbnN0IHZhbHVlID0gYXNSZWNvcmQocm93KTtcbiAgaWYgKCF2YWx1ZSB8fCB0eXBlb2YgdmFsdWUuaWQgIT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIHZhbHVlLnR5cGUgIT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIHZhbHVlLnVybCAhPT0gXCJzdHJpbmdcIikge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiB7XG4gICAgaWQ6IHZhbHVlLmlkLFxuICAgIHR5cGU6IHZhbHVlLnR5cGUsXG4gICAgdXJsOiB2YWx1ZS51cmwsXG4gICAgLi4uKHR5cGVvZiB2YWx1ZS50aXRsZSA9PT0gXCJzdHJpbmdcIiA/IHsgdGl0bGU6IHZhbHVlLnRpdGxlIH0gOiB7fSksXG4gICAgLi4uKHR5cGVvZiB2YWx1ZS53ZWJTb2NrZXREZWJ1Z2dlclVybCA9PT0gXCJzdHJpbmdcIlxuICAgICAgPyB7IHdlYlNvY2tldERlYnVnZ2VyVXJsOiB2YWx1ZS53ZWJTb2NrZXREZWJ1Z2dlclVybCB9XG4gICAgICA6IHt9KSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gdHJ5UmVxdWlyZUVsZWN0cm9uKCk6IHtcbiAgYXBwPzogUHJvYmVBcHBBZGFwdGVyO1xuICBzZXNzaW9uPzogeyBkZWZhdWx0U2Vzc2lvbj86IFByb2JlU2Vzc2lvbkFkYXB0ZXIgfTtcbiAgQnJvd3NlcldpbmRvdz86IFJ1bnRpbWVQcm9iZUVudltcImJyb3dzZXJXaW5kb3dcIl07XG4gIEJyb3dzZXJWaWV3PzogdW5rbm93bjtcbn0gfCBudWxsIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gcmVxdWlyZShcImVsZWN0cm9uXCIpIGFzIHtcbiAgICAgIGFwcD86IFByb2JlQXBwQWRhcHRlcjtcbiAgICAgIHNlc3Npb24/OiB7IGRlZmF1bHRTZXNzaW9uPzogUHJvYmVTZXNzaW9uQWRhcHRlciB9O1xuICAgICAgQnJvd3NlcldpbmRvdz86IFJ1bnRpbWVQcm9iZUVudltcImJyb3dzZXJXaW5kb3dcIl07XG4gICAgICBCcm93c2VyVmlldz86IHVua25vd247XG4gICAgfTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2FmZUNhbGw8VD4oZm46ICgpID0+IFQpOiBUIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgY29uc3QgdmFsdWUgPSBmbigpO1xuICAgIHJldHVybiB2YWx1ZSA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IHZhbHVlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0ZuKHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFzUmVjb3JkKHZhbHVlOiB1bmtub3duKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsIHtcbiAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiA/IHZhbHVlIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IDogbnVsbDtcbn1cbiIsICJpbXBvcnQgeyBleGVjRmlsZVN5bmMgfSBmcm9tIFwibm9kZTpjaGlsZF9wcm9jZXNzXCI7XG5pbXBvcnQgeyBleGlzdHNTeW5jLCByZWFkRmlsZVN5bmMgfSBmcm9tIFwibm9kZTpmc1wiO1xuaW1wb3J0IHsgaG9tZWRpciwgcGxhdGZvcm0gfSBmcm9tIFwibm9kZTpvc1wiO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gXCJub2RlOnBhdGhcIjtcbmltcG9ydCB7IGlzTGF5ZXJBdXRvVXBkYXRlRW5hYmxlZCB9IGZyb20gXCIuL2lwYy1ndWFyZFwiO1xuXG50eXBlIENoZWNrU3RhdHVzID0gXCJva1wiIHwgXCJ3YXJuXCIgfCBcImVycm9yXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2F0Y2hlckhlYWx0aENoZWNrIHtcbiAgbmFtZTogc3RyaW5nO1xuICBzdGF0dXM6IENoZWNrU3RhdHVzO1xuICBkZXRhaWw6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXYXRjaGVySGVhbHRoIHtcbiAgY2hlY2tlZEF0OiBzdHJpbmc7XG4gIHN0YXR1czogQ2hlY2tTdGF0dXM7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIHN1bW1hcnk6IHN0cmluZztcbiAgd2F0Y2hlcjogc3RyaW5nO1xuICBjaGVja3M6IFdhdGNoZXJIZWFsdGhDaGVja1tdO1xufVxuXG5pbnRlcmZhY2UgSW5zdGFsbGVyU3RhdGUge1xuICBhcHBSb290Pzogc3RyaW5nO1xuICB2ZXJzaW9uPzogc3RyaW5nO1xuICB3YXRjaGVyPzogXCJsYXVuY2hkXCIgfCBcImxvZ2luLWl0ZW1cIiB8IFwic2NoZWR1bGVkLXRhc2tcIiB8IFwic3lzdGVtZFwiIHwgXCJub25lXCI7XG59XG5cbmludGVyZmFjZSBSdW50aW1lQ29uZmlnIHtcbiAgY29kZXhQbHVzUGx1cz86IHtcbiAgICBhdXRvVXBkYXRlPzogYm9vbGVhbjtcbiAgfTtcbn1cblxuaW50ZXJmYWNlIFNlbGZVcGRhdGVTdGF0ZSB7XG4gIHN0YXR1cz86IFwiY2hlY2tpbmdcIiB8IFwidXAtdG8tZGF0ZVwiIHwgXCJ1cGRhdGVkXCIgfCBcImZhaWxlZFwiIHwgXCJkaXNhYmxlZFwiO1xuICBjb21wbGV0ZWRBdD86IHN0cmluZztcbiAgY2hlY2tlZEF0Pzogc3RyaW5nO1xuICBsYXRlc3RWZXJzaW9uPzogc3RyaW5nIHwgbnVsbDtcbiAgZXJyb3I/OiBzdHJpbmc7XG59XG5cbmNvbnN0IExBVU5DSERfTEFCRUwgPSBcImNvbS5jb2RleHBsdXNwbHVzLndhdGNoZXJcIjtcbmNvbnN0IFdBVENIRVJfTE9HID0gam9pbihob21lZGlyKCksIFwiTGlicmFyeVwiLCBcIkxvZ3NcIiwgXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyLmxvZ1wiKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFdhdGNoZXJIZWFsdGgodXNlclJvb3Q6IHN0cmluZyk6IFdhdGNoZXJIZWFsdGgge1xuICBjb25zdCBjaGVja3M6IFdhdGNoZXJIZWFsdGhDaGVja1tdID0gW107XG4gIGNvbnN0IHN0YXRlID0gcmVhZEpzb248SW5zdGFsbGVyU3RhdGU+KGpvaW4odXNlclJvb3QsIFwic3RhdGUuanNvblwiKSk7XG4gIGNvbnN0IGNvbmZpZyA9IHJlYWRKc29uPFJ1bnRpbWVDb25maWc+KGpvaW4odXNlclJvb3QsIFwiY29uZmlnLmpzb25cIikpID8/IHt9O1xuICBjb25zdCBzZWxmVXBkYXRlID0gcmVhZEpzb248U2VsZlVwZGF0ZVN0YXRlPihqb2luKHVzZXJSb290LCBcInNlbGYtdXBkYXRlLXN0YXRlLmpzb25cIikpO1xuXG4gIGNoZWNrcy5wdXNoKHtcbiAgICBuYW1lOiBcIkluc3RhbGwgc3RhdGVcIixcbiAgICBzdGF0dXM6IHN0YXRlID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgIGRldGFpbDogc3RhdGUgPyBgQ29kZXgrKyAke3N0YXRlLnZlcnNpb24gPz8gXCIodW5rbm93biB2ZXJzaW9uKVwifWAgOiBcInN0YXRlLmpzb24gaXMgbWlzc2luZ1wiLFxuICB9KTtcblxuICBpZiAoIXN0YXRlKSByZXR1cm4gc3VtbWFyaXplKFwibm9uZVwiLCBjaGVja3MpO1xuXG4gIGNvbnN0IGF1dG9VcGRhdGUgPSBpc0xheWVyQXV0b1VwZGF0ZUVuYWJsZWQoY29uZmlnLmNvZGV4UGx1c1BsdXM/LmF1dG9VcGRhdGUpO1xuICBjaGVja3MucHVzaCh7XG4gICAgbmFtZTogXCJMYXllciBzZWxmLXVwZGF0ZVwiLFxuICAgIHN0YXR1czogYXV0b1VwZGF0ZSA/IFwib2tcIiA6IFwid2FyblwiLFxuICAgIGRldGFpbDogYXV0b1VwZGF0ZSA/IFwiZW5hYmxlZFwiIDogXCJkaXNhYmxlZCAob3B0LWluOyBkZWZhdWx0IG9mZilcIixcbiAgfSk7XG5cbiAgY2hlY2tzLnB1c2goe1xuICAgIG5hbWU6IFwiV2F0Y2hlciBraW5kXCIsXG4gICAgc3RhdHVzOiBzdGF0ZS53YXRjaGVyICYmIHN0YXRlLndhdGNoZXIgIT09IFwibm9uZVwiID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgIGRldGFpbDogc3RhdGUud2F0Y2hlciA/PyBcIm5vbmVcIixcbiAgfSk7XG5cbiAgaWYgKHNlbGZVcGRhdGUpIHtcbiAgICBjaGVja3MucHVzaChzZWxmVXBkYXRlQ2hlY2soc2VsZlVwZGF0ZSkpO1xuICB9XG5cbiAgY29uc3QgYXBwUm9vdCA9IHN0YXRlLmFwcFJvb3QgPz8gXCJcIjtcbiAgY2hlY2tzLnB1c2goe1xuICAgIG5hbWU6IFwiQ29kZXggYXBwXCIsXG4gICAgc3RhdHVzOiBhcHBSb290ICYmIGV4aXN0c1N5bmMoYXBwUm9vdCkgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgZGV0YWlsOiBhcHBSb290IHx8IFwibWlzc2luZyBhcHBSb290IGluIHN0YXRlXCIsXG4gIH0pO1xuXG4gIHN3aXRjaCAocGxhdGZvcm0oKSkge1xuICAgIGNhc2UgXCJkYXJ3aW5cIjpcbiAgICAgIGNoZWNrcy5wdXNoKC4uLmNoZWNrTGF1bmNoZFdhdGNoZXIoYXBwUm9vdCkpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBcImxpbnV4XCI6XG4gICAgICBjaGVja3MucHVzaCguLi5jaGVja1N5c3RlbWRXYXRjaGVyKGFwcFJvb3QpKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgXCJ3aW4zMlwiOlxuICAgICAgY2hlY2tzLnB1c2goLi4uY2hlY2tTY2hlZHVsZWRUYXNrV2F0Y2hlcigpKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBjaGVja3MucHVzaCh7XG4gICAgICAgIG5hbWU6IFwiUGxhdGZvcm0gd2F0Y2hlclwiLFxuICAgICAgICBzdGF0dXM6IFwid2FyblwiLFxuICAgICAgICBkZXRhaWw6IGB1bnN1cHBvcnRlZCBwbGF0Zm9ybTogJHtwbGF0Zm9ybSgpfWAsXG4gICAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBzdW1tYXJpemUoc3RhdGUud2F0Y2hlciA/PyBcIm5vbmVcIiwgY2hlY2tzKTtcbn1cblxuZnVuY3Rpb24gc2VsZlVwZGF0ZUNoZWNrKHN0YXRlOiBTZWxmVXBkYXRlU3RhdGUpOiBXYXRjaGVySGVhbHRoQ2hlY2sge1xuICBjb25zdCBhdCA9IHN0YXRlLmNvbXBsZXRlZEF0ID8/IHN0YXRlLmNoZWNrZWRBdCA/PyBcInVua25vd24gdGltZVwiO1xuICBpZiAoc3RhdGUuc3RhdHVzID09PSBcImZhaWxlZFwiKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IFwibGFzdCBDb2RleCsrIHVwZGF0ZVwiLFxuICAgICAgc3RhdHVzOiBcIndhcm5cIixcbiAgICAgIGRldGFpbDogc3RhdGUuZXJyb3IgPyBgZmFpbGVkICR7YXR9OiAke3N0YXRlLmVycm9yfWAgOiBgZmFpbGVkICR7YXR9YCxcbiAgICB9O1xuICB9XG4gIGlmIChzdGF0ZS5zdGF0dXMgPT09IFwiZGlzYWJsZWRcIikge1xuICAgIHJldHVybiB7IG5hbWU6IFwibGFzdCBDb2RleCsrIHVwZGF0ZVwiLCBzdGF0dXM6IFwid2FyblwiLCBkZXRhaWw6IGBza2lwcGVkICR7YXR9OiBMYXllciBzZWxmLXVwZGF0ZSBkaXNhYmxlZGAgfTtcbiAgfVxuICBpZiAoc3RhdGUuc3RhdHVzID09PSBcInVwZGF0ZWRcIikge1xuICAgIHJldHVybiB7IG5hbWU6IFwibGFzdCBDb2RleCsrIHVwZGF0ZVwiLCBzdGF0dXM6IFwib2tcIiwgZGV0YWlsOiBgdXBkYXRlZCAke2F0fSB0byAke3N0YXRlLmxhdGVzdFZlcnNpb24gPz8gXCJuZXcgcmVsZWFzZVwifWAgfTtcbiAgfVxuICBpZiAoc3RhdGUuc3RhdHVzID09PSBcInVwLXRvLWRhdGVcIikge1xuICAgIHJldHVybiB7IG5hbWU6IFwibGFzdCBDb2RleCsrIHVwZGF0ZVwiLCBzdGF0dXM6IFwib2tcIiwgZGV0YWlsOiBgdXAgdG8gZGF0ZSAke2F0fWAgfTtcbiAgfVxuICByZXR1cm4geyBuYW1lOiBcImxhc3QgQ29kZXgrKyB1cGRhdGVcIiwgc3RhdHVzOiBcIndhcm5cIiwgZGV0YWlsOiBgY2hlY2tpbmcgc2luY2UgJHthdH1gIH07XG59XG5cbmZ1bmN0aW9uIGNoZWNrTGF1bmNoZFdhdGNoZXIoYXBwUm9vdDogc3RyaW5nKTogV2F0Y2hlckhlYWx0aENoZWNrW10ge1xuICBjb25zdCBjaGVja3M6IFdhdGNoZXJIZWFsdGhDaGVja1tdID0gW107XG4gIGNvbnN0IHBsaXN0UGF0aCA9IGpvaW4oaG9tZWRpcigpLCBcIkxpYnJhcnlcIiwgXCJMYXVuY2hBZ2VudHNcIiwgYCR7TEFVTkNIRF9MQUJFTH0ucGxpc3RgKTtcbiAgY29uc3QgcGxpc3QgPSBleGlzdHNTeW5jKHBsaXN0UGF0aCkgPyByZWFkRmlsZVNhZmUocGxpc3RQYXRoKSA6IFwiXCI7XG4gIGNvbnN0IGFzYXJQYXRoID0gYXBwUm9vdCA/IGpvaW4oYXBwUm9vdCwgXCJDb250ZW50c1wiLCBcIlJlc291cmNlc1wiLCBcImFwcC5hc2FyXCIpIDogXCJcIjtcblxuICBjaGVja3MucHVzaCh7XG4gICAgbmFtZTogXCJsYXVuY2hkIHBsaXN0XCIsXG4gICAgc3RhdHVzOiBwbGlzdCA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICBkZXRhaWw6IHBsaXN0UGF0aCxcbiAgfSk7XG5cbiAgaWYgKHBsaXN0KSB7XG4gICAgY2hlY2tzLnB1c2goe1xuICAgICAgbmFtZTogXCJsYXVuY2hkIGxhYmVsXCIsXG4gICAgICBzdGF0dXM6IHBsaXN0LmluY2x1ZGVzKExBVU5DSERfTEFCRUwpID8gXCJva1wiIDogXCJlcnJvclwiLFxuICAgICAgZGV0YWlsOiBMQVVOQ0hEX0xBQkVMLFxuICAgIH0pO1xuICAgIGNoZWNrcy5wdXNoKHtcbiAgICAgIG5hbWU6IFwibGF1bmNoZCB0cmlnZ2VyXCIsXG4gICAgICBzdGF0dXM6IGFzYXJQYXRoICYmIHBsaXN0LmluY2x1ZGVzKGFzYXJQYXRoKSA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICAgIGRldGFpbDogYXNhclBhdGggfHwgXCJtaXNzaW5nIGFwcFJvb3RcIixcbiAgICB9KTtcbiAgICBjaGVja3MucHVzaCh7XG4gICAgICBuYW1lOiBcIndhdGNoZXIgY29tbWFuZFwiLFxuICAgICAgc3RhdHVzOiBwbGlzdC5pbmNsdWRlcyhcIkNPREVYX1BMVVNQTFVTX1dBVENIRVI9MVwiKSAmJiBwbGlzdC5pbmNsdWRlcyhcIiB1cGRhdGUgLS13YXRjaGVyIC0tcXVpZXRcIilcbiAgICAgICAgPyBcIm9rXCJcbiAgICAgICAgOiBcImVycm9yXCIsXG4gICAgICBkZXRhaWw6IGNvbW1hbmRTdW1tYXJ5KHBsaXN0KSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNsaVBhdGggPSBleHRyYWN0Rmlyc3QocGxpc3QsIC8nKFteJ10qcGFja2FnZXNcXC9pbnN0YWxsZXJcXC9kaXN0XFwvY2xpXFwuanMpJy8pO1xuICAgIGlmIChjbGlQYXRoKSB7XG4gICAgICBjaGVja3MucHVzaCh7XG4gICAgICAgIG5hbWU6IFwicmVwYWlyIENMSVwiLFxuICAgICAgICBzdGF0dXM6IGV4aXN0c1N5bmMoY2xpUGF0aCkgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgICAgIGRldGFpbDogY2xpUGF0aCxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGxvYWRlZCA9IGNvbW1hbmRTdWNjZWVkcyhcImxhdW5jaGN0bFwiLCBbXCJsaXN0XCIsIExBVU5DSERfTEFCRUxdKTtcbiAgY2hlY2tzLnB1c2goe1xuICAgIG5hbWU6IFwibGF1bmNoZCBsb2FkZWRcIixcbiAgICBzdGF0dXM6IGxvYWRlZCA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICBkZXRhaWw6IGxvYWRlZCA/IFwic2VydmljZSBpcyBsb2FkZWRcIiA6IFwibGF1bmNoY3RsIGNhbm5vdCBmaW5kIHRoZSB3YXRjaGVyXCIsXG4gIH0pO1xuXG4gIGNoZWNrcy5wdXNoKHdhdGNoZXJMb2dDaGVjaygpKTtcbiAgcmV0dXJuIGNoZWNrcztcbn1cblxuZnVuY3Rpb24gY2hlY2tTeXN0ZW1kV2F0Y2hlcihhcHBSb290OiBzdHJpbmcpOiBXYXRjaGVySGVhbHRoQ2hlY2tbXSB7XG4gIGNvbnN0IGRpciA9IGpvaW4oaG9tZWRpcigpLCBcIi5jb25maWdcIiwgXCJzeXN0ZW1kXCIsIFwidXNlclwiKTtcbiAgY29uc3Qgc2VydmljZSA9IGpvaW4oZGlyLCBcImNvZGV4LXBsdXNwbHVzLXdhdGNoZXIuc2VydmljZVwiKTtcbiAgY29uc3QgdGltZXIgPSBqb2luKGRpciwgXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyLnRpbWVyXCIpO1xuICBjb25zdCBwYXRoVW5pdCA9IGpvaW4oZGlyLCBcImNvZGV4LXBsdXNwbHVzLXdhdGNoZXIucGF0aFwiKTtcbiAgY29uc3QgZXhwZWN0ZWRQYXRoID0gYXBwUm9vdCA/IGpvaW4oYXBwUm9vdCwgXCJyZXNvdXJjZXNcIiwgXCJhcHAuYXNhclwiKSA6IFwiXCI7XG4gIGNvbnN0IHBhdGhCb2R5ID0gZXhpc3RzU3luYyhwYXRoVW5pdCkgPyByZWFkRmlsZVNhZmUocGF0aFVuaXQpIDogXCJcIjtcblxuICByZXR1cm4gW1xuICAgIHtcbiAgICAgIG5hbWU6IFwic3lzdGVtZCBzZXJ2aWNlXCIsXG4gICAgICBzdGF0dXM6IGV4aXN0c1N5bmMoc2VydmljZSkgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgICBkZXRhaWw6IHNlcnZpY2UsXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiBcInN5c3RlbWQgdGltZXJcIixcbiAgICAgIHN0YXR1czogZXhpc3RzU3luYyh0aW1lcikgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgICBkZXRhaWw6IHRpbWVyLFxuICAgIH0sXG4gICAge1xuICAgICAgbmFtZTogXCJzeXN0ZW1kIHBhdGhcIixcbiAgICAgIHN0YXR1czogcGF0aEJvZHkgJiYgZXhwZWN0ZWRQYXRoICYmIHBhdGhCb2R5LmluY2x1ZGVzKGV4cGVjdGVkUGF0aCkgPyBcIm9rXCIgOiBcImVycm9yXCIsXG4gICAgICBkZXRhaWw6IGV4cGVjdGVkUGF0aCB8fCBwYXRoVW5pdCxcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6IFwicGF0aCB1bml0IGFjdGl2ZVwiLFxuICAgICAgc3RhdHVzOiBjb21tYW5kU3VjY2VlZHMoXCJzeXN0ZW1jdGxcIiwgW1wiLS11c2VyXCIsIFwiaXMtYWN0aXZlXCIsIFwiLS1xdWlldFwiLCBcImNvZGV4LXBsdXNwbHVzLXdhdGNoZXIucGF0aFwiXSkgPyBcIm9rXCIgOiBcIndhcm5cIixcbiAgICAgIGRldGFpbDogXCJzeXN0ZW1jdGwgLS11c2VyIGlzLWFjdGl2ZSBjb2RleC1wbHVzcGx1cy13YXRjaGVyLnBhdGhcIixcbiAgICB9LFxuICAgIHtcbiAgICAgIG5hbWU6IFwidGltZXIgYWN0aXZlXCIsXG4gICAgICBzdGF0dXM6IGNvbW1hbmRTdWNjZWVkcyhcInN5c3RlbWN0bFwiLCBbXCItLXVzZXJcIiwgXCJpcy1hY3RpdmVcIiwgXCItLXF1aWV0XCIsIFwiY29kZXgtcGx1c3BsdXMtd2F0Y2hlci50aW1lclwiXSkgPyBcIm9rXCIgOiBcIndhcm5cIixcbiAgICAgIGRldGFpbDogXCJzeXN0ZW1jdGwgLS11c2VyIGlzLWFjdGl2ZSBjb2RleC1wbHVzcGx1cy13YXRjaGVyLnRpbWVyXCIsXG4gICAgfSxcbiAgXTtcbn1cblxuZnVuY3Rpb24gY2hlY2tTY2hlZHVsZWRUYXNrV2F0Y2hlcigpOiBXYXRjaGVySGVhbHRoQ2hlY2tbXSB7XG4gIHJldHVybiBbXG4gICAge1xuICAgICAgbmFtZTogXCJsb2dvbiB0YXNrXCIsXG4gICAgICBzdGF0dXM6IGNvbW1hbmRTdWNjZWVkcyhcInNjaHRhc2tzLmV4ZVwiLCBbXCIvUXVlcnlcIiwgXCIvVE5cIiwgXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyXCJdKSA/IFwib2tcIiA6IFwiZXJyb3JcIixcbiAgICAgIGRldGFpbDogXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyXCIsXG4gICAgfSxcbiAgICB7XG4gICAgICBuYW1lOiBcImhvdXJseSB0YXNrXCIsXG4gICAgICBzdGF0dXM6IGNvbW1hbmRTdWNjZWVkcyhcInNjaHRhc2tzLmV4ZVwiLCBbXCIvUXVlcnlcIiwgXCIvVE5cIiwgXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyLWhvdXJseVwiXSkgPyBcIm9rXCIgOiBcIndhcm5cIixcbiAgICAgIGRldGFpbDogXCJjb2RleC1wbHVzcGx1cy13YXRjaGVyLWhvdXJseVwiLFxuICAgIH0sXG4gIF07XG59XG5cbmZ1bmN0aW9uIHdhdGNoZXJMb2dDaGVjaygpOiBXYXRjaGVySGVhbHRoQ2hlY2sge1xuICBpZiAoIWV4aXN0c1N5bmMoV0FUQ0hFUl9MT0cpKSB7XG4gICAgcmV0dXJuIHsgbmFtZTogXCJ3YXRjaGVyIGxvZ1wiLCBzdGF0dXM6IFwid2FyblwiLCBkZXRhaWw6IFwibm8gd2F0Y2hlciBsb2cgeWV0XCIgfTtcbiAgfVxuICBjb25zdCB0YWlsID0gcmVhZEZpbGVTYWZlKFdBVENIRVJfTE9HKS5zcGxpdCgvXFxyP1xcbi8pLnNsaWNlKC00MCkuam9pbihcIlxcblwiKTtcbiAgcmV0dXJuIGFuYWx5emVXYXRjaGVyTG9nVGFpbCh0YWlsKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVXYXRjaGVyTG9nVGFpbCh0YWlsOiBzdHJpbmcpOiBXYXRjaGVySGVhbHRoQ2hlY2sge1xuICBjb25zdCBoYXNFcnJvciA9IC9cdTI3MTcgY29kZXgtcGx1c3BsdXMgZmFpbGVkfGNvZGV4LXBsdXNwbHVzIGZhaWxlZHxlcnJvcnxmYWlsZWQvaS50ZXN0KHRhaWwpO1xuICBjb25zdCBuZWVkc01hbnVhbFJlcGFpciA9XG4gICAgaGFzRXJyb3IgJiZcbiAgICAvQ2Fubm90IHdyaXRlIHRvIC4qQ29kZXguKlxcLmFwcHxBcHAgTWFuYWdlbWVudHxmaWxlIG93bmVyc2hpcHxzdWRvIGNvZGV4cGx1c3BsdXMgKD86aW5zdGFsbHxyZXBhaXIpfEVBQ0NFU3xFUEVSTS9pLnRlc3QodGFpbCk7XG4gIHJldHVybiB7XG4gICAgbmFtZTogXCJ3YXRjaGVyIGxvZ1wiLFxuICAgIHN0YXR1czogaGFzRXJyb3IgPyBcIndhcm5cIiA6IFwib2tcIixcbiAgICBkZXRhaWw6IGhhc0Vycm9yXG4gICAgICA/IG5lZWRzTWFudWFsUmVwYWlyXG4gICAgICAgID8gXCJhdXRvLXJlcGFpciBuZWVkcyBhcHAgcGVybWlzc2lvbnM7IHJ1biBgY29kZXhwbHVzcGx1cyByZXBhaXJgIGZyb20gVGVybWluYWxcIlxuICAgICAgICA6IFwicmVjZW50IHdhdGNoZXIgbG9nIGNvbnRhaW5zIGFuIGVycm9yXCJcbiAgICAgIDogV0FUQ0hFUl9MT0csXG4gIH07XG59XG5cbmZ1bmN0aW9uIHN1bW1hcml6ZSh3YXRjaGVyOiBzdHJpbmcsIGNoZWNrczogV2F0Y2hlckhlYWx0aENoZWNrW10pOiBXYXRjaGVySGVhbHRoIHtcbiAgY29uc3QgaGFzRXJyb3IgPSBjaGVja3Muc29tZSgoYykgPT4gYy5zdGF0dXMgPT09IFwiZXJyb3JcIik7XG4gIGNvbnN0IGhhc1dhcm4gPSBjaGVja3Muc29tZSgoYykgPT4gYy5zdGF0dXMgPT09IFwid2FyblwiKTtcbiAgY29uc3Qgc3RhdHVzOiBDaGVja1N0YXR1cyA9IGhhc0Vycm9yID8gXCJlcnJvclwiIDogaGFzV2FybiA/IFwid2FyblwiIDogXCJva1wiO1xuICBjb25zdCBmYWlsZWQgPSBjaGVja3MuZmlsdGVyKChjKSA9PiBjLnN0YXR1cyA9PT0gXCJlcnJvclwiKS5sZW5ndGg7XG4gIGNvbnN0IHdhcm5lZCA9IGNoZWNrcy5maWx0ZXIoKGMpID0+IGMuc3RhdHVzID09PSBcIndhcm5cIikubGVuZ3RoO1xuICBjb25zdCB0aXRsZSA9XG4gICAgc3RhdHVzID09PSBcIm9rXCJcbiAgICAgID8gXCJBdXRvLXJlcGFpciB3YXRjaGVyIGlzIHJlYWR5XCJcbiAgICAgIDogc3RhdHVzID09PSBcIndhcm5cIlxuICAgICAgICA/IFwiQXV0by1yZXBhaXIgd2F0Y2hlciBuZWVkcyByZXZpZXdcIlxuICAgICAgICA6IFwiQXV0by1yZXBhaXIgd2F0Y2hlciBpcyBub3QgcmVhZHlcIjtcbiAgY29uc3Qgc3VtbWFyeSA9XG4gICAgc3RhdHVzID09PSBcIm9rXCJcbiAgICAgID8gXCJDb2RleCsrIHNob3VsZCBhdXRvbWF0aWNhbGx5IHJlcGFpciBpdHNlbGYgYWZ0ZXIgQ29kZXggdXBkYXRlcy5cIlxuICAgICAgOiBgJHtmYWlsZWR9IGZhaWxpbmcgY2hlY2socyksICR7d2FybmVkfSB3YXJuaW5nKHMpLmA7XG5cbiAgcmV0dXJuIHtcbiAgICBjaGVja2VkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICBzdGF0dXMsXG4gICAgdGl0bGUsXG4gICAgc3VtbWFyeSxcbiAgICB3YXRjaGVyLFxuICAgIGNoZWNrcyxcbiAgfTtcbn1cblxuZnVuY3Rpb24gY29tbWFuZFN1Y2NlZWRzKGNvbW1hbmQ6IHN0cmluZywgYXJnczogc3RyaW5nW10pOiBib29sZWFuIHtcbiAgdHJ5IHtcbiAgICBleGVjRmlsZVN5bmMoY29tbWFuZCwgYXJncywgeyBzdGRpbzogXCJpZ25vcmVcIiwgdGltZW91dDogNV8wMDAgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjb21tYW5kU3VtbWFyeShwbGlzdDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgY29tbWFuZCA9IGV4dHJhY3RGaXJzdChwbGlzdCwgLzxzdHJpbmc+KFtePF0qKD86dXBkYXRlIC0td2F0Y2hlciAtLXF1aWV0fHJlcGFpciAtLXF1aWV0KVtePF0qKTxcXC9zdHJpbmc+Lyk7XG4gIHJldHVybiBjb21tYW5kID8gdW5lc2NhcGVYbWwoY29tbWFuZCkucmVwbGFjZSgvXFxzKy9nLCBcIiBcIikudHJpbSgpIDogXCJ3YXRjaGVyIGNvbW1hbmQgbm90IGZvdW5kXCI7XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RGaXJzdChzb3VyY2U6IHN0cmluZywgcGF0dGVybjogUmVnRXhwKTogc3RyaW5nIHwgbnVsbCB7XG4gIHJldHVybiBzb3VyY2UubWF0Y2gocGF0dGVybik/LlsxXSA/PyBudWxsO1xufVxuXG5mdW5jdGlvbiByZWFkSnNvbjxUPihwYXRoOiBzdHJpbmcpOiBUIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKHBhdGgsIFwidXRmOFwiKSkgYXMgVDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVhZEZpbGVTYWZlKHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHJlYWRGaWxlU3luYyhwYXRoLCBcInV0ZjhcIik7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBcIlwiO1xuICB9XG59XG5cbmZ1bmN0aW9uIHVuZXNjYXBlWG1sKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdmFsdWVcbiAgICAucmVwbGFjZSgvJnF1b3Q7L2csIFwiXFxcIlwiKVxuICAgIC5yZXBsYWNlKC8mYXBvczsvZywgXCInXCIpXG4gICAgLnJlcGxhY2UoLyZsdDsvZywgXCI8XCIpXG4gICAgLnJlcGxhY2UoLyZndDsvZywgXCI+XCIpXG4gICAgLnJlcGxhY2UoLyZhbXA7L2csIFwiJlwiKTtcbn1cbiIsICIvKipcbiAqIFByaXZpbGVnZWQgSVBDIGFsbG93bGlzdGluZy4gR3Vlc3QgQnJvd3NlclZpZXdzLCB3ZWJ2aWV3cywgYW5kIG90aGVyXG4gKiB1bnRydXN0ZWQgZnJhbWVzIG11c3Qgbm90IGludm9rZSBpbnN0YWxsL3NlbGYtdXBkYXRlL25hdGl2ZS9mcy9jbGlwYm9hcmRcbiAqIGhhbmRsZXJzIGV2ZW4gaWYgYSBzZXNzaW9uLWxldmVsIHByZWxvYWQgbGVha2VkIGludG8gdGhlbS5cbiAqL1xuXG5leHBvcnQgY29uc3QgUFJJVklMRUdFRF9JUENfQ0hBTk5FTFMgPSBbXG4gIFwiY29kZXhwcDppbnN0YWxsLXN0b3JlLXR3ZWFrXCIsXG4gIFwiY29kZXhwcDppbnN0YWxsLWdpdGh1Yi10d2Vha1wiLFxuICBcImNvZGV4cHA6cHJlcGFyZS10d2Vhay1zdG9yZS1zdWJtaXNzaW9uXCIsXG4gIFwiY29kZXhwcDpydW4tY29kZXhwcC11cGRhdGVcIixcbiAgXCJjb2RleHBwOnNldC1hdXRvLXVwZGF0ZVwiLFxuICBcImNvZGV4cHA6c2V0LXVwZGF0ZS1jb25maWdcIixcbiAgXCJjb2RleHBwOm5hdGl2ZS1sb2FkLW1vZHVsZVwiLFxuICBcImNvZGV4cHA6bmF0aXZlLW1vZHVsZS1yZXF1ZXN0XCIsXG4gIFwiY29kZXhwcDpuYXRpdmUtbW9kdWxlLWRpc3Bvc2VcIixcbiAgXCJjb2RleHBwOm5hdGl2ZS1jcmVhdGUtcGFuZWxcIixcbiAgXCJjb2RleHBwOm5hdGl2ZS1hdHRhY2gtdmlld1wiLFxuICBcImNvZGV4cHA6bmF0aXZlLWluc3RhbmNlLWNhbGxcIixcbiAgXCJjb2RleHBwOm5hdGl2ZS1sYXVuY2gtaGVscGVyXCIsXG4gIFwiY29kZXhwcDpuYXRpdmUtaGVscGVyLWNhbGxcIixcbiAgXCJjb2RleHBwOmNvZGV4LXdpbmRvdy1jcmVhdGVcIixcbiAgXCJjb2RleHBwOmNvZGV4LXdpbmRvdy1wcmltYXJ5XCIsXG4gIFwiY29kZXhwcDpjb2RleC13aW5kb3ctZm9jdXNcIixcbiAgXCJjb2RleHBwOmNvZGV4LXdpbmRvdy1zaG93XCIsXG4gIFwiY29kZXhwcDpjb2RleC12aWV3LWNyZWF0ZVwiLFxuICBcImNvZGV4cHA6Y29kZXgtdmlldy1jYWxsXCIsXG4gIFwiY29kZXhwcDp0d2Vhay1mc1wiLFxuICBcImNvZGV4cHA6Y29weS10ZXh0XCIsXG4gIFwiY29kZXhwcDpyZXZlYWxcIixcbl0gYXMgY29uc3Q7XG5cbmV4cG9ydCB0eXBlIFByaXZpbGVnZWRJcGNDaGFubmVsID0gKHR5cGVvZiBQUklWSUxFR0VEX0lQQ19DSEFOTkVMUylbbnVtYmVyXTtcbmV4cG9ydCB0eXBlIFdlYkNvbnRlbnRzVHJ1c3QgPSBcInByaXZpbGVnZWRcIiB8IFwiZ3Vlc3RcIjtcblxuZXhwb3J0IGludGVyZmFjZSBJcGNTZW5kZXJMaWtlIHtcbiAgaWQ6IG51bWJlcjtcbiAgaXNEZXN0cm95ZWQ/OiAoKSA9PiBib29sZWFuO1xuICBnZXRUeXBlPzogKCkgPT4gc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNQcml2aWxlZ2VkSXBjQ2hhbm5lbChjaGFubmVsOiBzdHJpbmcpOiBjaGFubmVsIGlzIFByaXZpbGVnZWRJcGNDaGFubmVsIHtcbiAgcmV0dXJuIChQUklWSUxFR0VEX0lQQ19DSEFOTkVMUyBhcyByZWFkb25seSBzdHJpbmdbXSkuaW5jbHVkZXMoY2hhbm5lbCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbGFzc2lmeUlwY1NlbmRlcihcbiAgc2VuZGVyOiBJcGNTZW5kZXJMaWtlLFxuICB1bnRydXN0ZWRJZHM6IFJlYWRvbmx5U2V0PG51bWJlcj4gPSBuZXcgU2V0KCksXG4pOiBXZWJDb250ZW50c1RydXN0IHtcbiAgaWYgKHNlbmRlci5pc0Rlc3Ryb3llZD8uKCkpIHJldHVybiBcImd1ZXN0XCI7XG4gIGlmICh1bnRydXN0ZWRJZHMuaGFzKHNlbmRlci5pZCkpIHJldHVybiBcImd1ZXN0XCI7XG4gIGNvbnN0IHR5cGUgPSBzZW5kZXIuZ2V0VHlwZT8uKCkgPz8gXCJ3aW5kb3dcIjtcbiAgaWYgKHR5cGUgPT09IFwid2Vidmlld1wiIHx8IHR5cGUgPT09IFwib2Zmc2NyZWVuXCIpIHJldHVybiBcImd1ZXN0XCI7XG4gIGlmICh0eXBlID09PSBcIndpbmRvd1wiIHx8IHR5cGUgPT09IFwiYnJvd3NlclZpZXdcIikgcmV0dXJuIFwicHJpdmlsZWdlZFwiO1xuICByZXR1cm4gXCJndWVzdFwiO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNQcml2aWxlZ2VkSXBjU2VuZGVyKFxuICBzZW5kZXI6IElwY1NlbmRlckxpa2UsXG4gIHVudHJ1c3RlZElkczogUmVhZG9ubHlTZXQ8bnVtYmVyPiA9IG5ldyBTZXQoKSxcbik6IGJvb2xlYW4ge1xuICByZXR1cm4gY2xhc3NpZnlJcGNTZW5kZXIoc2VuZGVyLCB1bnRydXN0ZWRJZHMpID09PSBcInByaXZpbGVnZWRcIjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFByaXZpbGVnZWRJcGNTZW5kZXIoXG4gIGNoYW5uZWw6IHN0cmluZyxcbiAgc2VuZGVyOiBJcGNTZW5kZXJMaWtlLFxuICB1bnRydXN0ZWRJZHM6IFJlYWRvbmx5U2V0PG51bWJlcj4gPSBuZXcgU2V0KCksXG4pOiB2b2lkIHtcbiAgaWYgKCFpc1ByaXZpbGVnZWRJcGNTZW5kZXIoc2VuZGVyLCB1bnRydXN0ZWRJZHMpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBibG9ja2VkICR7Y2hhbm5lbH0gZnJvbSB1bnRydXN0ZWQgZnJhbWVgKTtcbiAgfVxufVxuXG4vKiogTGF5ZXIgc2VsZi11cGRhdGUgaXMgb3B0LWluLiBNaXNzaW5nL3VuZGVmaW5lZCBtZWFucyBPRkYuICovXG5leHBvcnQgZnVuY3Rpb24gaXNMYXllckF1dG9VcGRhdGVFbmFibGVkKHZhbHVlOiBib29sZWFuIHwgdW5kZWZpbmVkIHwgbnVsbCk6IGJvb2xlYW4ge1xuICByZXR1cm4gdmFsdWUgPT09IHRydWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJpcFJlbmRlcmVyVXBkYXRlUmVwbzxUIGV4dGVuZHMgeyB1cGRhdGVSZXBvPzogdW5rbm93biB9Pihjb25maWc6IFQpOiBPbWl0PFQsIFwidXBkYXRlUmVwb1wiPiB7XG4gIGNvbnN0IHsgdXBkYXRlUmVwbzogX2lnbm9yZWQsIC4uLnJlc3QgfSA9IGNvbmZpZztcbiAgcmV0dXJuIHJlc3Q7XG59XG4iLCAiZXhwb3J0IHR5cGUgVHdlYWtTY29wZSA9IFwicmVuZGVyZXJcIiB8IFwibWFpblwiIHwgXCJib3RoXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVsb2FkVHdlYWtzRGVwcyB7XG4gIGxvZ0luZm8obWVzc2FnZTogc3RyaW5nKTogdm9pZDtcbiAgc3RvcEFsbE1haW5Ud2Vha3MoKTogdm9pZDtcbiAgY2xlYXJUd2Vha01vZHVsZUNhY2hlKCk6IHZvaWQ7XG4gIGxvYWRBbGxNYWluVHdlYWtzKCk6IHZvaWQ7XG4gIGJyb2FkY2FzdFJlbG9hZCgpOiB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNldFR3ZWFrRW5hYmxlZEFuZFJlbG9hZERlcHMgZXh0ZW5kcyBSZWxvYWRUd2Vha3NEZXBzIHtcbiAgc2V0VHdlYWtFbmFibGVkKGlkOiBzdHJpbmcsIGVuYWJsZWQ6IGJvb2xlYW4pOiB2b2lkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNNYWluUHJvY2Vzc1R3ZWFrU2NvcGUoc2NvcGU6IFR3ZWFrU2NvcGUgfCB1bmRlZmluZWQpOiBib29sZWFuIHtcbiAgcmV0dXJuIHNjb3BlICE9PSBcInJlbmRlcmVyXCI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWxvYWRUd2Vha3MocmVhc29uOiBzdHJpbmcsIGRlcHM6IFJlbG9hZFR3ZWFrc0RlcHMpOiB2b2lkIHtcbiAgZGVwcy5sb2dJbmZvKGByZWxvYWRpbmcgdHdlYWtzICgke3JlYXNvbn0pYCk7XG4gIGRlcHMuc3RvcEFsbE1haW5Ud2Vha3MoKTtcbiAgZGVwcy5jbGVhclR3ZWFrTW9kdWxlQ2FjaGUoKTtcbiAgZGVwcy5sb2FkQWxsTWFpblR3ZWFrcygpO1xuICBkZXBzLmJyb2FkY2FzdFJlbG9hZCgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0VHdlYWtFbmFibGVkQW5kUmVsb2FkKFxuICBpZDogc3RyaW5nLFxuICBlbmFibGVkOiB1bmtub3duLFxuICBkZXBzOiBTZXRUd2Vha0VuYWJsZWRBbmRSZWxvYWREZXBzLFxuKTogdHJ1ZSB7XG4gIGNvbnN0IG5vcm1hbGl6ZWRFbmFibGVkID0gISFlbmFibGVkO1xuICBkZXBzLnNldFR3ZWFrRW5hYmxlZChpZCwgbm9ybWFsaXplZEVuYWJsZWQpO1xuICBkZXBzLmxvZ0luZm8oYHR3ZWFrICR7aWR9IGVuYWJsZWQ9JHtub3JtYWxpemVkRW5hYmxlZH1gKTtcbiAgcmVsb2FkVHdlYWtzKFwiZW5hYmxlZC10b2dnbGVcIiwgZGVwcyk7XG4gIHJldHVybiB0cnVlO1xufVxuIiwgImltcG9ydCB7IGFwcCwgQnJvd3NlclZpZXcsIEJyb3dzZXJXaW5kb3csIE1lc3NhZ2VDaGFubmVsTWFpbiwgaXBjTWFpbiwgbmF0aXZlVGhlbWUgfSBmcm9tIFwiZWxlY3Ryb25cIjtcbmltcG9ydCB7IGNyZWF0ZUhhc2gsIHJhbmRvbVVVSUQgfSBmcm9tIFwibm9kZTpjcnlwdG9cIjtcbmltcG9ydCB7IGV4aXN0c1N5bmMsIHJlYWRGaWxlU3luYywgc3RhdFN5bmMgfSBmcm9tIFwibm9kZTpmc1wiO1xuaW1wb3J0IHsgY3JlYXRlU2VydmVyLCB0eXBlIEluY29taW5nTWVzc2FnZSwgdHlwZSBTZXJ2ZXIsIHR5cGUgU2VydmVyUmVzcG9uc2UgfSBmcm9tIFwibm9kZTpodHRwXCI7XG5pbXBvcnQgeyBqb2luLCBub3JtYWxpemUsIHJlbGF0aXZlIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuaW1wb3J0IHR5cGUgeyBTb2NrZXQgfSBmcm9tIFwibm9kZTpuZXRcIjtcblxuY29uc3QgQ09OTkVDVF9QT1JUX0NIQU5ORUwgPSBcImNvZGV4cHA6YnJvd3Nlci11aS1jb25uZWN0LWFwcC1ob3N0XCI7XG5jb25zdCBCUklER0VfUkVRVUVTVF9DSEFOTkVMID0gXCJjb2RleHBwOmJyb3dzZXItdWktYnJpZGdlLXJlcXVlc3RcIjtcbmNvbnN0IEJSSURHRV9SRVNQT05TRV9DSEFOTkVMID0gXCJjb2RleHBwOmJyb3dzZXItdWktYnJpZGdlLXJlc3BvbnNlXCI7XG5jb25zdCBNRVNTQUdFX0ZPUl9WSUVXX0NIQU5ORUwgPSBcImNvZGV4cHA6YnJvd3Nlci11aS1tZXNzYWdlLWZvci12aWV3XCI7XG5jb25zdCBXT1JLRVJfTUVTU0FHRV9DSEFOTkVMID0gXCJjb2RleHBwOmJyb3dzZXItdWktd29ya2VyLW1lc3NhZ2VcIjtcbmNvbnN0IFNZU1RFTV9USEVNRV9DSEFOTkVMID0gXCJjb2RleHBwOmJyb3dzZXItdWktc3lzdGVtLXRoZW1lXCI7XG5cbnR5cGUgTG9nRm4gPSAobGV2ZWw6IFwiaW5mb1wiIHwgXCJ3YXJuXCIgfCBcImVycm9yXCIsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZDtcblxuaW50ZXJmYWNlIENvZGV4V2luZG93U2VydmljZXMge1xuICBnZXRDb250ZXh0PzogKGhvc3RJZDogc3RyaW5nKSA9PiB7IHJlZ2lzdGVyV2luZG93PzogKHdpbmRvd0xpa2U6IENvZGV4V2luZG93TGlrZSkgPT4gdm9pZCB9IHwgbnVsbDtcbiAgZ2V0Q29udGV4dEZvcldlYkNvbnRlbnRzPzogKFxuICAgIHdlYkNvbnRlbnRzOiBFbGVjdHJvbi5XZWJDb250ZW50cyxcbiAgKSA9PiB7IHJlZ2lzdGVyV2luZG93PzogKHdpbmRvd0xpa2U6IENvZGV4V2luZG93TGlrZSkgPT4gdm9pZCB9IHwgbnVsbDtcbiAgd2luZG93TWFuYWdlcj86IHtcbiAgICByZWdpc3RlcldpbmRvdz86IChcbiAgICAgIHdpbmRvd0xpa2U6IENvZGV4V2luZG93TGlrZSxcbiAgICAgIGhvc3RJZDogc3RyaW5nLFxuICAgICAgcHJpbWFyeTogYm9vbGVhbixcbiAgICAgIGFwcGVhcmFuY2U6IHN0cmluZyxcbiAgICApID0+IHZvaWQ7XG4gICAgb3B0aW9ucz86IHtcbiAgICAgIGFsbG93RGV2dG9vbHM/OiBib29sZWFuO1xuICAgICAgcHJlbG9hZFBhdGg/OiBzdHJpbmc7XG4gICAgfTtcbiAgfTtcbn1cblxuaW50ZXJmYWNlIENvZGV4V2luZG93TGlrZSB7XG4gIGlkOiBudW1iZXI7XG4gIHdlYkNvbnRlbnRzOiBFbGVjdHJvbi5XZWJDb250ZW50cztcbiAgb24oZXZlbnQ6IFwiY2xvc2VkXCIsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdW5rbm93bjtcbiAgb25jZT8oZXZlbnQ6IHN0cmluZywgbGlzdGVuZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpOiB1bmtub3duO1xuICBvZmY/KGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKTogdW5rbm93bjtcbiAgcmVtb3ZlTGlzdGVuZXI/KGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKTogdW5rbm93bjtcbiAgaXNEZXN0cm95ZWQ/KCk6IGJvb2xlYW47XG4gIGlzRm9jdXNlZD8oKTogYm9vbGVhbjtcbiAgZm9jdXM/KCk6IHZvaWQ7XG4gIHNob3c/KCk6IHZvaWQ7XG4gIGhpZGU/KCk6IHZvaWQ7XG4gIGdldEJvdW5kcz8oKTogRWxlY3Ryb24uUmVjdGFuZ2xlO1xuICBnZXRDb250ZW50Qm91bmRzPygpOiBFbGVjdHJvbi5SZWN0YW5nbGU7XG4gIGdldFNpemU/KCk6IFtudW1iZXIsIG51bWJlcl07XG4gIGdldENvbnRlbnRTaXplPygpOiBbbnVtYmVyLCBudW1iZXJdO1xuICBzZXRUaXRsZT8odGl0bGU6IHN0cmluZyk6IHZvaWQ7XG4gIGdldFRpdGxlPygpOiBzdHJpbmc7XG4gIHNldFJlcHJlc2VudGVkRmlsZW5hbWU/KGZpbGVuYW1lOiBzdHJpbmcpOiB2b2lkO1xuICBzZXREb2N1bWVudEVkaXRlZD8oZWRpdGVkOiBib29sZWFuKTogdm9pZDtcbiAgc2V0V2luZG93QnV0dG9uVmlzaWJpbGl0eT8odmlzaWJsZTogYm9vbGVhbik6IHZvaWQ7XG59XG5cbmludGVyZmFjZSBCcm93c2VyVWlTZXJ2ZXJPcHRpb25zIHtcbiAgcG9ydDogbnVtYmVyO1xuICBob3N0OiBzdHJpbmc7XG4gIGhpZGVNYWluV2luZG93OiBib29sZWFuO1xuICBnZXRXaW5kb3dTZXJ2aWNlczogKCkgPT4gQ29kZXhXaW5kb3dTZXJ2aWNlcyB8IG51bGw7XG4gIGxvZzogTG9nRm47XG59XG5cbmludGVyZmFjZSBCcm93c2VyVWlIb3N0IHtcbiAgdmlldzogRWxlY3Ryb24uQnJvd3NlclZpZXc7XG4gIHdlYkNvbnRlbnRzOiBFbGVjdHJvbi5XZWJDb250ZW50cztcbn1cblxuaW50ZXJmYWNlIEJyaWRnZVBlbmRpbmdSZXF1ZXN0IHtcbiAgcmVzb2x2ZTogKHZhbHVlOiB1bmtub3duKSA9PiB2b2lkO1xuICByZWplY3Q6IChlcnJvcjogRXJyb3IpID0+IHZvaWQ7XG4gIHRpbWVyOiBOb2RlSlMuVGltZW91dDtcbn1cblxuaW50ZXJmYWNlIEluaXRpYWxTdGF0ZSB7XG4gIHNuYXBzaG90OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgc3lzdGVtVGhlbWVWYXJpYW50OiBzdHJpbmc7XG4gIHNlbnRyeUluaXRPcHRpb25zOiB1bmtub3duO1xuICBidWlsZEZsYXZvcjogdW5rbm93bjtcbiAgdXNlc093bEFwcFNoZWxsOiBib29sZWFuO1xuICBwbGF0Zm9ybTogTm9kZUpTLlBsYXRmb3JtO1xuICBhcmNoOiBzdHJpbmc7XG59XG5cbmNvbnN0IE1JTUVfVFlQRVM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIFwiLmh0bWxcIjogXCJ0ZXh0L2h0bWw7IGNoYXJzZXQ9dXRmLThcIixcbiAgXCIuanNcIjogXCJ0ZXh0L2phdmFzY3JpcHQ7IGNoYXJzZXQ9dXRmLThcIixcbiAgXCIuY3NzXCI6IFwidGV4dC9jc3M7IGNoYXJzZXQ9dXRmLThcIixcbiAgXCIuanNvblwiOiBcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLThcIixcbiAgXCIuc3ZnXCI6IFwiaW1hZ2Uvc3ZnK3htbFwiLFxuICBcIi5wbmdcIjogXCJpbWFnZS9wbmdcIixcbiAgXCIuanBnXCI6IFwiaW1hZ2UvanBlZ1wiLFxuICBcIi5qcGVnXCI6IFwiaW1hZ2UvanBlZ1wiLFxuICBcIi53ZWJwXCI6IFwiaW1hZ2Uvd2VicFwiLFxuICBcIi5pY29cIjogXCJpbWFnZS94LWljb25cIixcbiAgXCIud29mZlwiOiBcImZvbnQvd29mZlwiLFxuICBcIi53b2ZmMlwiOiBcImZvbnQvd29mZjJcIixcbn07XG5cbmxldCBhY3RpdmVTZXJ2ZXI6IFNlcnZlciB8IG51bGwgPSBudWxsO1xubGV0IGFjdGl2ZUhvc3Q6IEJyb3dzZXJVaUhvc3QgfCBudWxsID0gbnVsbDtcbmxldCBhY3RpdmVPcHRpb25zOiBCcm93c2VyVWlTZXJ2ZXJPcHRpb25zIHwgbnVsbCA9IG51bGw7XG5jb25zdCBicmlkZ2VSZXF1ZXN0cyA9IG5ldyBNYXA8c3RyaW5nLCBCcmlkZ2VQZW5kaW5nUmVxdWVzdD4oKTtcbmNvbnN0IGNvbnRyb2xDbGllbnRzID0gbmV3IFNldDxXZWJTb2NrZXRDb25uZWN0aW9uPigpO1xuXG5leHBvcnQgZnVuY3Rpb24gbWF5YmVTdGFydEJyb3dzZXJVaVNlcnZlcihcbiAgb3B0czogUGljazxCcm93c2VyVWlTZXJ2ZXJPcHRpb25zLCBcImdldFdpbmRvd1NlcnZpY2VzXCIgfCBcImxvZ1wiPixcbik6IHZvaWQge1xuICBpZiAocHJvY2Vzcy5lbnYuQ09ERVhQUF9CUk9XU0VSX1VJICE9PSBcIjFcIikgcmV0dXJuO1xuICBjb25zdCBwb3J0ID0gcGFyc2VQb3J0KHByb2Nlc3MuZW52LkNPREVYUFBfQlJPV1NFUl9VSV9QT1JULCA4NzY1KTtcbiAgc3RhcnRCcm93c2VyVWlTZXJ2ZXIoe1xuICAgIC4uLm9wdHMsXG4gICAgcG9ydCxcbiAgICBob3N0OiBcIjEyNy4wLjAuMVwiLFxuICAgIGhpZGVNYWluV2luZG93OiBwcm9jZXNzLmVudi5DT0RFWFBQX0JST1dTRVJfVUlfSElERV9NQUlOID09PSBcIjFcIixcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdGFydEJyb3dzZXJVaVNlcnZlcihvcHRzOiBCcm93c2VyVWlTZXJ2ZXJPcHRpb25zKTogdm9pZCB7XG4gIGlmIChhY3RpdmVTZXJ2ZXIpIHJldHVybjtcbiAgYWN0aXZlT3B0aW9ucyA9IG9wdHM7XG4gIGluc3RhbGxCcm93c2VyVWlJcGNIYW5kbGVycyhvcHRzLmxvZyk7XG5cbiAgY29uc3Qgc2VydmVyID0gY3JlYXRlU2VydmVyKChyZXEsIHJlcykgPT4ge1xuICAgIGhhbmRsZUh0dHBSZXF1ZXN0KHJlcSwgcmVzKS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgIG9wdHMubG9nKFwiZXJyb3JcIiwgXCJicm93c2VyIFVJIHJlcXVlc3QgZmFpbGVkXCIsIHsgbWVzc2FnZTogZXJyb3IubWVzc2FnZSB9KTtcbiAgICAgIHNlbmRUZXh0KHJlcywgNTAwLCBcIkludGVybmFsIFNlcnZlciBFcnJvclxcblwiLCBcInRleHQvcGxhaW47IGNoYXJzZXQ9dXRmLThcIik7XG4gICAgfSk7XG4gIH0pO1xuICBzZXJ2ZXIub24oXCJ1cGdyYWRlXCIsIChyZXEsIHNvY2tldCwgaGVhZCkgPT4ge1xuICAgIGhhbmRsZVVwZ3JhZGUocmVxLCBzb2NrZXQgYXMgU29ja2V0LCBoZWFkKS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgIG9wdHMubG9nKFwid2FyblwiLCBcImJyb3dzZXIgVUkgd2Vic29ja2V0IHVwZ3JhZGUgZmFpbGVkXCIsIHsgbWVzc2FnZTogZXJyb3IubWVzc2FnZSB9KTtcbiAgICAgIHNvY2tldC5kZXN0cm95KCk7XG4gICAgfSk7XG4gIH0pO1xuICBzZXJ2ZXIub24oXCJlcnJvclwiLCAoZXJyb3IpID0+IHtcbiAgICBvcHRzLmxvZyhcImVycm9yXCIsIFwiYnJvd3NlciBVSSBzZXJ2ZXIgZmFpbGVkXCIsIHsgbWVzc2FnZTogZXJyb3IubWVzc2FnZSB9KTtcbiAgfSk7XG4gIHNlcnZlci5saXN0ZW4ob3B0cy5wb3J0LCBvcHRzLmhvc3QsICgpID0+IHtcbiAgICBvcHRzLmxvZyhcImluZm9cIiwgYGJyb3dzZXIgVUkgc2VydmVyIGxpc3RlbmluZyBhdCBodHRwOi8vJHtvcHRzLmhvc3R9OiR7b3B0cy5wb3J0fS9gKTtcbiAgfSk7XG4gIGFjdGl2ZVNlcnZlciA9IHNlcnZlcjtcbiAgaWYgKG9wdHMuaGlkZU1haW5XaW5kb3cpIHtcbiAgICBmb3IgKGNvbnN0IGRlbGF5TXMgb2YgWzUwMCwgMV81MDAsIDNfMDAwXSkge1xuICAgICAgY29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KGhpZGVWaXNpYmxlQ29kZXhXaW5kb3dzLCBkZWxheU1zKTtcbiAgICAgIHRpbWVyLnVucmVmPy4oKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaW5zdGFsbEJyb3dzZXJVaUlwY0hhbmRsZXJzKGxvZzogTG9nRm4pOiB2b2lkIHtcbiAgaXBjTWFpbi5yZW1vdmVBbGxMaXN0ZW5lcnMoQlJJREdFX1JFU1BPTlNFX0NIQU5ORUwpO1xuICBpcGNNYWluLnJlbW92ZUFsbExpc3RlbmVycyhNRVNTQUdFX0ZPUl9WSUVXX0NIQU5ORUwpO1xuICBpcGNNYWluLnJlbW92ZUFsbExpc3RlbmVycyhXT1JLRVJfTUVTU0FHRV9DSEFOTkVMKTtcbiAgaXBjTWFpbi5yZW1vdmVBbGxMaXN0ZW5lcnMoU1lTVEVNX1RIRU1FX0NIQU5ORUwpO1xuXG4gIGlwY01haW4ub24oQlJJREdFX1JFU1BPTlNFX0NIQU5ORUwsIChldmVudCwgcGF5bG9hZCkgPT4ge1xuICAgIGlmICghaXNCcm93c2VyVWlIb3N0U2VuZGVyKGV2ZW50LnNlbmRlcikpIHJldHVybjtcbiAgICBjb25zdCByZXNwb25zZSA9IGFzUmVjb3JkKHBheWxvYWQpO1xuICAgIGNvbnN0IGlkID0gdHlwZW9mIHJlc3BvbnNlPy5pZCA9PT0gXCJzdHJpbmdcIiA/IHJlc3BvbnNlLmlkIDogXCJcIjtcbiAgICBjb25zdCBwZW5kaW5nID0gYnJpZGdlUmVxdWVzdHMuZ2V0KGlkKTtcbiAgICBpZiAoIXBlbmRpbmcpIHJldHVybjtcbiAgICBicmlkZ2VSZXF1ZXN0cy5kZWxldGUoaWQpO1xuICAgIGNsZWFyVGltZW91dChwZW5kaW5nLnRpbWVyKTtcbiAgICBpZiAocmVzcG9uc2U/Lm9rID09PSB0cnVlKSB7XG4gICAgICBwZW5kaW5nLnJlc29sdmUocmVzcG9uc2UudmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwZW5kaW5nLnJlamVjdChuZXcgRXJyb3IodHlwZW9mIHJlc3BvbnNlPy5lcnJvciA9PT0gXCJzdHJpbmdcIiA/IHJlc3BvbnNlLmVycm9yIDogXCJCcmlkZ2UgcmVxdWVzdCBmYWlsZWRcIikpO1xuICAgIH1cbiAgfSk7XG5cbiAgaXBjTWFpbi5vbihNRVNTQUdFX0ZPUl9WSUVXX0NIQU5ORUwsIChldmVudCwgbWVzc2FnZSkgPT4ge1xuICAgIGlmICghaXNCcm93c2VyVWlIb3N0U2VuZGVyKGV2ZW50LnNlbmRlcikpIHJldHVybjtcbiAgICBicm9hZGNhc3RDb250cm9sKHsgdHlwZTogXCJtZXNzYWdlLWZvci12aWV3XCIsIG1lc3NhZ2UgfSk7XG4gIH0pO1xuXG4gIGlwY01haW4ub24oV09SS0VSX01FU1NBR0VfQ0hBTk5FTCwgKGV2ZW50LCB3b3JrZXJJZCwgbWVzc2FnZSkgPT4ge1xuICAgIGlmICghaXNCcm93c2VyVWlIb3N0U2VuZGVyKGV2ZW50LnNlbmRlcikpIHJldHVybjtcbiAgICBpZiAodHlwZW9mIHdvcmtlcklkICE9PSBcInN0cmluZ1wiKSByZXR1cm47XG4gICAgYnJvYWRjYXN0Q29udHJvbCh7IHR5cGU6IFwid29ya2VyLW1lc3NhZ2VcIiwgd29ya2VySWQsIG1lc3NhZ2UgfSk7XG4gIH0pO1xuXG4gIGlwY01haW4ub24oU1lTVEVNX1RIRU1FX0NIQU5ORUwsIChldmVudCwgdmFsdWUpID0+IHtcbiAgICBpZiAoIWlzQnJvd3NlclVpSG9zdFNlbmRlcihldmVudC5zZW5kZXIpKSByZXR1cm47XG4gICAgYnJvYWRjYXN0Q29udHJvbCh7IHR5cGU6IFwic3lzdGVtLXRoZW1lLXZhcmlhbnQtdXBkYXRlZFwiLCB2YWx1ZSB9KTtcbiAgfSk7XG5cbiAgcHJvY2Vzcy5vbmNlKFwiZXhpdFwiLCAoKSA9PiB7XG4gICAgZm9yIChjb25zdCBwZW5kaW5nIG9mIGJyaWRnZVJlcXVlc3RzLnZhbHVlcygpKSB7XG4gICAgICBjbGVhclRpbWVvdXQocGVuZGluZy50aW1lcik7XG4gICAgICBwZW5kaW5nLnJlamVjdChuZXcgRXJyb3IoXCJDb2RleCsrIGJyb3dzZXIgVUkgc2VydmVyIHN0b3BwZWRcIikpO1xuICAgIH1cbiAgICBicmlkZ2VSZXF1ZXN0cy5jbGVhcigpO1xuICAgIGZvciAoY29uc3QgY2xpZW50IG9mIGNvbnRyb2xDbGllbnRzKSBjbGllbnQuY2xvc2UoKTtcbiAgICBjb250cm9sQ2xpZW50cy5jbGVhcigpO1xuICAgIHRyeSB7XG4gICAgICBpZiAoYWN0aXZlSG9zdCAmJiAhYWN0aXZlSG9zdC53ZWJDb250ZW50cy5pc0Rlc3Ryb3llZCgpKSB7XG4gICAgICAgIGFjdGl2ZUhvc3Qud2ViQ29udGVudHMuY2xvc2UoeyB3YWl0Rm9yQmVmb3JlVW5sb2FkOiBmYWxzZSB9KTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nKFwid2FyblwiLCBcImJyb3dzZXIgVUkgaG9zdCBjbGVhbnVwIGZhaWxlZFwiLCB7IG1lc3NhZ2U6IFN0cmluZyhlcnJvcikgfSk7XG4gICAgfVxuICB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlSHR0cFJlcXVlc3QocmVxOiBJbmNvbWluZ01lc3NhZ2UsIHJlczogU2VydmVyUmVzcG9uc2UpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3Qgb3B0aW9ucyA9IHJlcXVpcmVPcHRpb25zKCk7XG4gIGNvbnN0IHVybCA9IHJlcXVlc3RVcmwocmVxKTtcbiAgaWYgKCF1cmwpIHtcbiAgICBzZW5kVGV4dChyZXMsIDQwMCwgXCJCYWQgUmVxdWVzdFxcblwiLCBcInRleHQvcGxhaW47IGNoYXJzZXQ9dXRmLThcIik7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHVybC5wYXRobmFtZSA9PT0gXCIvY29kZXhwcC9icm93c2VyLXVpL2hlYWx0aFwiKSB7XG4gICAgc2VuZEpzb24ocmVzLCAyMDAsIHsgb2s6IHRydWUgfSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHVybC5wYXRobmFtZSA9PT0gXCIvY29kZXhwcC9icm93c2VyLXVpL2JyaWRnZVwiKSB7XG4gICAgaWYgKHJlcS5tZXRob2QgIT09IFwiUE9TVFwiKSB7XG4gICAgICBzZW5kVGV4dChyZXMsIDQwNSwgXCJNZXRob2QgTm90IEFsbG93ZWRcXG5cIiwgXCJ0ZXh0L3BsYWluOyBjaGFyc2V0PXV0Zi04XCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBib2R5ID0gYXNSZWNvcmQoYXdhaXQgcmVhZEpzb25Cb2R5KHJlcSkpO1xuICAgIGNvbnN0IG1ldGhvZCA9IHR5cGVvZiBib2R5Py5tZXRob2QgPT09IFwic3RyaW5nXCIgPyBib2R5Lm1ldGhvZCA6IFwiXCI7XG4gICAgY29uc3QgYXJncyA9IEFycmF5LmlzQXJyYXkoYm9keT8uYXJncykgPyBib2R5LmFyZ3MgOiBbXTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdmFsdWUgPSBhd2FpdCBjYWxsSGlkZGVuQnJpZGdlKG1ldGhvZCwgYXJncyk7XG4gICAgICBzZW5kSnNvbihyZXMsIDIwMCwgeyBvazogdHJ1ZSwgdmFsdWUgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHNlbmRKc29uKHJlcywgNTAwLCB7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAodXJsLnBhdGhuYW1lID09PSBcIi9jb2RleHBwL2Jyb3dzZXItdWkvYnJpZGdlLmpzXCIpIHtcbiAgICBpZiAocmVxLm1ldGhvZCAhPT0gXCJHRVRcIiAmJiByZXEubWV0aG9kICE9PSBcIkhFQURcIikge1xuICAgICAgc2VuZFRleHQocmVzLCA0MDUsIFwiTWV0aG9kIE5vdCBBbGxvd2VkXFxuXCIsIFwidGV4dC9wbGFpbjsgY2hhcnNldD11dGYtOFwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qgc2NyaXB0ID0gYnJvd3NlckJyaWRnZVNjcmlwdChhd2FpdCBjb2xsZWN0SW5pdGlhbFN0YXRlKG9wdGlvbnMpKTtcbiAgICBzZW5kQnVmZmVyKHJlcywgMjAwLCBCdWZmZXIuZnJvbShzY3JpcHQpLCBNSU1FX1RZUEVTW1wiLmpzXCJdLCByZXEubWV0aG9kID09PSBcIkhFQURcIik7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHJlcS5tZXRob2QgIT09IFwiR0VUXCIgJiYgcmVxLm1ldGhvZCAhPT0gXCJIRUFEXCIpIHtcbiAgICBzZW5kVGV4dChyZXMsIDQwNSwgXCJNZXRob2QgTm90IEFsbG93ZWRcXG5cIiwgXCJ0ZXh0L3BsYWluOyBjaGFyc2V0PXV0Zi04XCIpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICh1cmwucGF0aG5hbWUgPT09IFwiL1wiIHx8IHVybC5wYXRobmFtZSA9PT0gXCIvaW5kZXguaHRtbFwiKSB7XG4gICAgY29uc3QgaHRtbCA9IGF3YWl0IGJyb3dzZXJJbmRleEh0bWwob3B0aW9ucyk7XG4gICAgc2VuZEJ1ZmZlcihyZXMsIDIwMCwgQnVmZmVyLmZyb20oaHRtbCksIE1JTUVfVFlQRVNbXCIuaHRtbFwiXSwgcmVxLm1ldGhvZCA9PT0gXCJIRUFEXCIpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGZpbGUgPSB3ZWJ2aWV3RmlsZSh1cmwucGF0aG5hbWUpO1xuICBpZiAoIWZpbGUpIHtcbiAgICBzZW5kVGV4dChyZXMsIDQwNCwgXCJOb3QgRm91bmRcXG5cIiwgXCJ0ZXh0L3BsYWluOyBjaGFyc2V0PXV0Zi04XCIpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKGZpbGUpO1xuICBzZW5kQnVmZmVyKHJlcywgMjAwLCBjb250ZW50LCBtaW1lVHlwZShmaWxlKSwgcmVxLm1ldGhvZCA9PT0gXCJIRUFEXCIpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVVcGdyYWRlKHJlcTogSW5jb21pbmdNZXNzYWdlLCBzb2NrZXQ6IFNvY2tldCwgaGVhZDogQnVmZmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHVybCA9IHJlcXVlc3RVcmwocmVxKTtcbiAgaWYgKCF1cmwpIHRocm93IG5ldyBFcnJvcihcImJhZCB3ZWJzb2NrZXQgVVJMXCIpO1xuICBpZiAodXJsLnBhdGhuYW1lICE9PSBcIi9jb2RleHBwL2Jyb3dzZXItdWkvcnBjXCIgJiYgdXJsLnBhdGhuYW1lICE9PSBcIi9jb2RleHBwL2Jyb3dzZXItdWkvY29udHJvbFwiKSB7XG4gICAgc29ja2V0LmRlc3Ryb3koKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3Qgd3MgPSBhY2NlcHRXZWJTb2NrZXQocmVxLCBzb2NrZXQsIGhlYWQpO1xuICBpZiAodXJsLnBhdGhuYW1lID09PSBcIi9jb2RleHBwL2Jyb3dzZXItdWkvY29udHJvbFwiKSB7XG4gICAgY29udHJvbENsaWVudHMuYWRkKHdzKTtcbiAgICB3cy5vbkNsb3NlKCgpID0+IGNvbnRyb2xDbGllbnRzLmRlbGV0ZSh3cykpO1xuICAgIHdzLnNlbmRKc29uKHsgdHlwZTogXCJoZWxsb1wiIH0pO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGhvc3QgPSBhd2FpdCBlbnN1cmVCcm93c2VyVWlIb3N0KCk7XG4gIGNvbnN0IHsgcG9ydDEsIHBvcnQyIH0gPSBuZXcgTWVzc2FnZUNoYW5uZWxNYWluKCk7XG4gIGhvc3Qud2ViQ29udGVudHMucG9zdE1lc3NhZ2UoQ09OTkVDVF9QT1JUX0NIQU5ORUwsIHt9LCBbcG9ydDJdKTtcbiAgYnJpZGdlTWVzc2FnZVBvcnRUb1dlYlNvY2tldChwb3J0MSwgd3MpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBicm93c2VySW5kZXhIdG1sKG9wdGlvbnM6IEJyb3dzZXJVaVNlcnZlck9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBpbmRleFBhdGggPSBqb2luKHdlYnZpZXdSb290KCksIFwiaW5kZXguaHRtbFwiKTtcbiAgbGV0IGh0bWwgPSByZWxheEJyb3dzZXJVaUNzcChyZWFkRmlsZVN5bmMoaW5kZXhQYXRoLCBcInV0ZjhcIikpO1xuICBjb25zdCBzaGltID0gYDxzY3JpcHQgc3JjPVwiL2NvZGV4cHAvYnJvd3Nlci11aS9icmlkZ2UuanNcIj48L3NjcmlwdD5gO1xuICBpZiAoaHRtbC5pbmNsdWRlcyhcIjwvaGVhZD5cIikpIHtcbiAgICBodG1sID0gaHRtbC5yZXBsYWNlKFwiPC9oZWFkPlwiLCBgJHtzaGltfVxcbiAgPC9oZWFkPmApO1xuICB9IGVsc2Uge1xuICAgIGh0bWwgPSBgJHtzaGltfVxcbiR7aHRtbH1gO1xuICB9XG4gIHJldHVybiBodG1sO1xufVxuXG5mdW5jdGlvbiByZWxheEJyb3dzZXJVaUNzcChodG1sOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gaHRtbC5yZXBsYWNlKFxuICAgIC8oPG1ldGFcXHMraHR0cC1lcXVpdj1bXCInXUNvbnRlbnQtU2VjdXJpdHktUG9saWN5W1wiJ11cXHMrY29udGVudD1cIikoW15cIl0qKShcIikvLFxuICAgIChfbWF0Y2gsIHByZWZpeDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcsIHN1ZmZpeDogc3RyaW5nKSA9PiB7XG4gICAgICBjb25zdCBkaXJlY3RpdmVzID0gcGFyc2VDc3BEaXJlY3RpdmVzKGRlY29kZUh0bWxBdHRyaWJ1dGUoY29udGVudCkpO1xuICAgICAgZGlyZWN0aXZlcy5zZXQoXCJjaGlsZC1zcmNcIiwgXCInc2VsZicgYmxvYjogZGF0YTogaHR0cDogaHR0cHM6XCIpO1xuICAgICAgZGlyZWN0aXZlcy5zZXQoXCJmcmFtZS1zcmNcIiwgXCInc2VsZicgYmxvYjogZGF0YTogaHR0cDogaHR0cHM6XCIpO1xuICAgICAgZGlyZWN0aXZlcy5zZXQoXCJjb25uZWN0LXNyY1wiLCBcIidzZWxmJyBodHRwOiBodHRwczogd3M6IHdzczogc2VudHJ5LWlwYzpcIik7XG4gICAgICByZXR1cm4gYCR7cHJlZml4fSR7ZW5jb2RlSHRtbEF0dHJpYnV0ZShmb3JtYXRDc3BEaXJlY3RpdmVzKGRpcmVjdGl2ZXMpKX0ke3N1ZmZpeH1gO1xuICAgIH0sXG4gICk7XG59XG5cbmZ1bmN0aW9uIHBhcnNlQ3NwRGlyZWN0aXZlcyhjb250ZW50OiBzdHJpbmcpOiBNYXA8c3RyaW5nLCBzdHJpbmc+IHtcbiAgY29uc3QgZGlyZWN0aXZlcyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGZvciAoY29uc3QgcGFydCBvZiBjb250ZW50LnNwbGl0KFwiO1wiKSkge1xuICAgIGNvbnN0IHRyaW1tZWQgPSBwYXJ0LnRyaW0oKTtcbiAgICBpZiAoIXRyaW1tZWQpIGNvbnRpbnVlO1xuICAgIGNvbnN0IFtuYW1lLCAuLi5yZXN0XSA9IHRyaW1tZWQuc3BsaXQoL1xccysvKTtcbiAgICBpZiAoIW5hbWUpIGNvbnRpbnVlO1xuICAgIGRpcmVjdGl2ZXMuc2V0KG5hbWUsIHJlc3Quam9pbihcIiBcIikpO1xuICB9XG4gIHJldHVybiBkaXJlY3RpdmVzO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRDc3BEaXJlY3RpdmVzKGRpcmVjdGl2ZXM6IE1hcDxzdHJpbmcsIHN0cmluZz4pOiBzdHJpbmcge1xuICByZXR1cm4gWy4uLmRpcmVjdGl2ZXMuZW50cmllcygpXVxuICAgIC5tYXAoKFtuYW1lLCB2YWx1ZV0pID0+ICh2YWx1ZSA/IGAke25hbWV9ICR7dmFsdWV9YCA6IG5hbWUpKVxuICAgIC5qb2luKFwiOyBcIik7XG59XG5cbmZ1bmN0aW9uIGRlY29kZUh0bWxBdHRyaWJ1dGUodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB2YWx1ZVxuICAgIC5yZXBsYWNlKC8mcXVvdDsvZywgJ1wiJylcbiAgICAucmVwbGFjZSgvJiMzOTsvZywgXCInXCIpXG4gICAgLnJlcGxhY2UoLyZsdDsvZywgXCI8XCIpXG4gICAgLnJlcGxhY2UoLyZndDsvZywgXCI+XCIpXG4gICAgLnJlcGxhY2UoLyZhbXA7L2csIFwiJlwiKTtcbn1cblxuZnVuY3Rpb24gZW5jb2RlSHRtbEF0dHJpYnV0ZSh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHZhbHVlXG4gICAgLnJlcGxhY2UoLyYvZywgXCImYW1wO1wiKVxuICAgIC5yZXBsYWNlKC9cIi9nLCBcIiZxdW90O1wiKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY29sbGVjdEluaXRpYWxTdGF0ZShvcHRpb25zOiBCcm93c2VyVWlTZXJ2ZXJPcHRpb25zKTogUHJvbWlzZTxJbml0aWFsU3RhdGU+IHtcbiAgYXdhaXQgZW5zdXJlQnJvd3NlclVpSG9zdCgpO1xuICBjb25zdCBbc25hcHNob3QsIHN5c3RlbVRoZW1lVmFyaWFudCwgc2VudHJ5SW5pdE9wdGlvbnMsIGJ1aWxkRmxhdm9yLCB1c2VzT3dsQXBwU2hlbGxdID0gYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgIGNhbGxIaWRkZW5CcmlkZ2UoXCJzbmFwc2hvdFwiLCBbXSksXG4gICAgY2FsbEhpZGRlbkJyaWRnZShcInN5c3RlbVRoZW1lXCIsIFtdKSxcbiAgICBjYWxsSGlkZGVuQnJpZGdlKFwic2VudHJ5T3B0aW9uc1wiLCBbXSksXG4gICAgY2FsbEhpZGRlbkJyaWRnZShcImJ1aWxkRmxhdm9yXCIsIFtdKSxcbiAgICBjYWxsSGlkZGVuQnJpZGdlKFwidXNlc093bEFwcFNoZWxsXCIsIFtdKSxcbiAgXSk7XG4gIGlmIChvcHRpb25zLmhpZGVNYWluV2luZG93KSBoaWRlVmlzaWJsZUNvZGV4V2luZG93cygpO1xuICByZXR1cm4ge1xuICAgIHNuYXBzaG90OiBhc1BsYWluT2JqZWN0KHNuYXBzaG90KSxcbiAgICBzeXN0ZW1UaGVtZVZhcmlhbnQ6IHR5cGVvZiBzeXN0ZW1UaGVtZVZhcmlhbnQgPT09IFwic3RyaW5nXCIgPyBzeXN0ZW1UaGVtZVZhcmlhbnQgOiBjdXJyZW50U3lzdGVtVGhlbWVWYXJpYW50KCksXG4gICAgc2VudHJ5SW5pdE9wdGlvbnMsXG4gICAgYnVpbGRGbGF2b3IsXG4gICAgdXNlc093bEFwcFNoZWxsOiB1c2VzT3dsQXBwU2hlbGwgPT09IHRydWUsXG4gICAgcGxhdGZvcm06IHByb2Nlc3MucGxhdGZvcm0sXG4gICAgYXJjaDogcHJvY2Vzcy5hcmNoLFxuICB9O1xufVxuXG5hc3luYyBmdW5jdGlvbiBlbnN1cmVCcm93c2VyVWlIb3N0KCk6IFByb21pc2U8QnJvd3NlclVpSG9zdD4ge1xuICBpZiAoYWN0aXZlSG9zdCAmJiAhYWN0aXZlSG9zdC53ZWJDb250ZW50cy5pc0Rlc3Ryb3llZCgpKSByZXR1cm4gYWN0aXZlSG9zdDtcbiAgY29uc3Qgb3B0aW9ucyA9IHJlcXVpcmVPcHRpb25zKCk7XG4gIGNvbnN0IHNlcnZpY2VzID0gYXdhaXQgd2FpdEZvcldpbmRvd1NlcnZpY2VzKG9wdGlvbnMpO1xuICBjb25zdCB3aW5kb3dNYW5hZ2VyID0gc2VydmljZXMud2luZG93TWFuYWdlcjtcbiAgaWYgKCF3aW5kb3dNYW5hZ2VyPy5yZWdpc3RlcldpbmRvdykge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNvZGV4IHdpbmRvdyByZWdpc3RyYXRpb24gc2VydmljZXMgYXJlIHVuYXZhaWxhYmxlXCIpO1xuICB9XG5cbiAgY29uc3QgdmlldyA9IG5ldyBCcm93c2VyVmlldyh7XG4gICAgd2ViUHJlZmVyZW5jZXM6IHtcbiAgICAgIHByZWxvYWQ6IHdpbmRvd01hbmFnZXIub3B0aW9ucz8ucHJlbG9hZFBhdGgsXG4gICAgICBjb250ZXh0SXNvbGF0aW9uOiB0cnVlLFxuICAgICAgbm9kZUludGVncmF0aW9uOiBmYWxzZSxcbiAgICAgIHNwZWxsY2hlY2s6IGZhbHNlLFxuICAgICAgZGV2VG9vbHM6IHdpbmRvd01hbmFnZXIub3B0aW9ucz8uYWxsb3dEZXZ0b29scyxcbiAgICB9LFxuICB9KTtcbiAgY29uc3Qgd2luZG93TGlrZSA9IG1ha2VXaW5kb3dMaWtlRm9yVmlldyh2aWV3KTtcbiAgd2luZG93TWFuYWdlci5yZWdpc3RlcldpbmRvdyh3aW5kb3dMaWtlLCBcImxvY2FsXCIsIGZhbHNlLCBcInNlY29uZGFyeVwiKTtcbiAgY29uc3QgY29udGV4dCA9IHNlcnZpY2VzLmdldENvbnRleHRGb3JXZWJDb250ZW50cz8uKHZpZXcud2ViQ29udGVudHMpID8/IHNlcnZpY2VzLmdldENvbnRleHQ/LihcImxvY2FsXCIpO1xuICBjb250ZXh0Py5yZWdpc3RlcldpbmRvdz8uKHdpbmRvd0xpa2UpO1xuICBhd2FpdCB2aWV3LndlYkNvbnRlbnRzLmxvYWRVUkwoXCJhYm91dDpibGFua1wiKTtcbiAgYWN0aXZlSG9zdCA9IHsgdmlldywgd2ViQ29udGVudHM6IHZpZXcud2ViQ29udGVudHMgfTtcbiAgdmlldy53ZWJDb250ZW50cy5vbmNlKFwiZGVzdHJveWVkXCIsICgpID0+IHtcbiAgICBpZiAoYWN0aXZlSG9zdD8ud2ViQ29udGVudHMgPT09IHZpZXcud2ViQ29udGVudHMpIGFjdGl2ZUhvc3QgPSBudWxsO1xuICB9KTtcbiAgb3B0aW9ucy5sb2coXCJpbmZvXCIsIFwiYnJvd3NlciBVSSBoaWRkZW4gaG9zdCByZWFkeVwiLCB7IHdlYkNvbnRlbnRzSWQ6IHZpZXcud2ViQ29udGVudHMuaWQgfSk7XG4gIHJldHVybiBhY3RpdmVIb3N0O1xufVxuXG5hc3luYyBmdW5jdGlvbiB3YWl0Rm9yV2luZG93U2VydmljZXMob3B0aW9uczogQnJvd3NlclVpU2VydmVyT3B0aW9ucyk6IFByb21pc2U8Q29kZXhXaW5kb3dTZXJ2aWNlcz4ge1xuICBjb25zdCBzdGFydGVkID0gRGF0ZS5ub3coKTtcbiAgd2hpbGUgKERhdGUubm93KCkgLSBzdGFydGVkIDwgMzBfMDAwKSB7XG4gICAgY29uc3Qgc2VydmljZXMgPSBvcHRpb25zLmdldFdpbmRvd1NlcnZpY2VzKCk7XG4gICAgaWYgKFxuICAgICAgc2VydmljZXM/LndpbmRvd01hbmFnZXI/LnJlZ2lzdGVyV2luZG93ICYmXG4gICAgICAoc2VydmljZXMuZ2V0Q29udGV4dCB8fCBzZXJ2aWNlcy5nZXRDb250ZXh0Rm9yV2ViQ29udGVudHMpXG4gICAgKSB7XG4gICAgICByZXR1cm4gc2VydmljZXM7XG4gICAgfVxuICAgIGF3YWl0IGRlbGF5KDEwMCk7XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKFwiVGltZWQgb3V0IHdhaXRpbmcgZm9yIENvZGV4IHdpbmRvdyBzZXJ2aWNlc1wiKTtcbn1cblxuZnVuY3Rpb24gY2FsbEhpZGRlbkJyaWRnZShtZXRob2Q6IHN0cmluZywgYXJnczogdW5rbm93bltdKTogUHJvbWlzZTx1bmtub3duPiB7XG4gIGFzc2VydEJyaWRnZU1ldGhvZChtZXRob2QpO1xuICByZXR1cm4gZW5zdXJlQnJvd3NlclVpSG9zdCgpLnRoZW4oKGhvc3QpID0+IHtcbiAgICBjb25zdCBpZCA9IHJhbmRvbVVVSUQoKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgYnJpZGdlUmVxdWVzdHMuZGVsZXRlKGlkKTtcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgVGltZWQgb3V0IHdhaXRpbmcgZm9yIGJyb3dzZXIgVUkgYnJpZGdlIG1ldGhvZDogJHttZXRob2R9YCkpO1xuICAgICAgfSwgMTVfMDAwKTtcbiAgICAgIGJyaWRnZVJlcXVlc3RzLnNldChpZCwgeyByZXNvbHZlLCByZWplY3QsIHRpbWVyIH0pO1xuICAgICAgaG9zdC53ZWJDb250ZW50cy5zZW5kKEJSSURHRV9SRVFVRVNUX0NIQU5ORUwsIHsgaWQsIG1ldGhvZCwgYXJncyB9KTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGJyaWRnZU1lc3NhZ2VQb3J0VG9XZWJTb2NrZXQocG9ydDogRWxlY3Ryb24uTWVzc2FnZVBvcnRNYWluLCB3czogV2ViU29ja2V0Q29ubmVjdGlvbik6IHZvaWQge1xuICBsZXQgY2xvc2VkID0gZmFsc2U7XG4gIGNvbnN0IGNsb3NlID0gKCkgPT4ge1xuICAgIGlmIChjbG9zZWQpIHJldHVybjtcbiAgICBjbG9zZWQgPSB0cnVlO1xuICAgIHRyeSB7XG4gICAgICBwb3J0LnBvc3RNZXNzYWdlKG51bGwpO1xuICAgIH0gY2F0Y2gge31cbiAgICB0cnkge1xuICAgICAgcG9ydC5jbG9zZSgpO1xuICAgIH0gY2F0Y2gge31cbiAgICB3cy5jbG9zZSgpO1xuICB9O1xuICBwb3J0LnN0YXJ0KCk7XG4gIHBvcnQub24oXCJtZXNzYWdlXCIsIChldmVudCkgPT4ge1xuICAgIGlmIChjbG9zZWQpIHJldHVybjtcbiAgICBpZiAoZXZlbnQuZGF0YSA9PSBudWxsKSB7XG4gICAgICBjbG9zZSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGV2ZW50LmRhdGEgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIHdzLnNlbmRUZXh0KGV2ZW50LmRhdGEpO1xuICAgIH1cbiAgfSk7XG4gIHBvcnQub24oXCJjbG9zZVwiLCBjbG9zZSk7XG4gIHdzLm9uVGV4dCgodGV4dCkgPT4ge1xuICAgIGlmIChjbG9zZWQpIHJldHVybjtcbiAgICBwb3J0LnBvc3RNZXNzYWdlKHRleHQpO1xuICB9KTtcbiAgd3Mub25DbG9zZShjbG9zZSk7XG59XG5cbmZ1bmN0aW9uIGJyb2FkY2FzdENvbnRyb2wocGF5bG9hZDogdW5rbm93bik6IHZvaWQge1xuICBmb3IgKGNvbnN0IGNsaWVudCBvZiBbLi4uY29udHJvbENsaWVudHNdKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNsaWVudC5zZW5kSnNvbihwYXlsb2FkKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIGNsaWVudC5jbG9zZSgpO1xuICAgICAgY29udHJvbENsaWVudHMuZGVsZXRlKGNsaWVudCk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGJyb3dzZXJCcmlkZ2VTY3JpcHQoc3RhdGU6IEluaXRpYWxTdGF0ZSk6IHN0cmluZyB7XG4gIHJldHVybiBgXG4oKCkgPT4ge1xuICBjb25zdCBpbml0aWFsU3RhdGUgPSAke3NhZmVKc29uKHN0YXRlKX07XG4gIGNvbnN0IHNuYXBzaG90ID0gbmV3IE1hcChPYmplY3QuZW50cmllcyhpbml0aWFsU3RhdGUuc25hcHNob3QgfHwge30pKTtcbiAgY29uc3Qgd29ya2VyU3Vic2NyaWJlcnMgPSBuZXcgTWFwKCk7XG4gIGNvbnN0IHRoZW1lU3Vic2NyaWJlcnMgPSBuZXcgU2V0KCk7XG4gIGNvbnN0IGJyb3dzZXJTaWRlYmFyU25hcHNob3RzID0gbmV3IE1hcCgpO1xuICBjb25zdCBicm93c2VyU2lkZWJhclNlZWRlZExvY2FsU2VydmVycyA9IG5ldyBTZXQoKTtcbiAgbGV0IHN5c3RlbVRoZW1lVmFyaWFudCA9IGluaXRpYWxTdGF0ZS5zeXN0ZW1UaGVtZVZhcmlhbnQgfHwgXCJsaWdodFwiO1xuXG4gIHdpbmRvdy5fX2NvZGV4cHBCcm93c2VyVWkgPSB0cnVlO1xuICBpbnN0YWxsQnJvd3NlclVpV2Vidmlld1NoaW0oKTtcblxuICBjb25zdCBjb250cm9sID0gbmV3IFdlYlNvY2tldChuZXcgVVJMKFwiL2NvZGV4cHAvYnJvd3Nlci11aS9jb250cm9sXCIsIGxvY2F0aW9uLmhyZWYpKTtcbiAgY29udHJvbC5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCAoZXZlbnQpID0+IHtcbiAgICBsZXQgcGF5bG9hZDtcbiAgICB0cnkgeyBwYXlsb2FkID0gSlNPTi5wYXJzZShldmVudC5kYXRhKTsgfSBjYXRjaCB7IHJldHVybjsgfVxuICAgIGlmIChwYXlsb2FkLnR5cGUgPT09IFwibWVzc2FnZS1mb3Itdmlld1wiKSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gcGF5bG9hZC5tZXNzYWdlO1xuICAgICAgaWYgKG1lc3NhZ2UgJiYgbWVzc2FnZS50eXBlID09PSBcInNoYXJlZC1vYmplY3QtdXBkYXRlZFwiKSB7XG4gICAgICAgIGlmIChtZXNzYWdlLnZhbHVlID09PSB1bmRlZmluZWQpIHNuYXBzaG90LmRlbGV0ZShtZXNzYWdlLmtleSk7XG4gICAgICAgIGVsc2Ugc25hcHNob3Quc2V0KG1lc3NhZ2Uua2V5LCBtZXNzYWdlLnZhbHVlKTtcbiAgICAgIH1cbiAgICAgIHJlbWVtYmVyQnJvd3NlclNpZGViYXJIb3N0TWVzc2FnZShtZXNzYWdlKTtcbiAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBNZXNzYWdlRXZlbnQoXCJtZXNzYWdlXCIsIHsgZGF0YTogbWVzc2FnZSB9KSk7XG4gICAgfSBlbHNlIGlmIChwYXlsb2FkLnR5cGUgPT09IFwid29ya2VyLW1lc3NhZ2VcIikge1xuICAgICAgY29uc3Qgc3VicyA9IHdvcmtlclN1YnNjcmliZXJzLmdldChwYXlsb2FkLndvcmtlcklkKTtcbiAgICAgIGlmIChzdWJzKSBmb3IgKGNvbnN0IGZuIG9mIFsuLi5zdWJzXSkgZm4ocGF5bG9hZC5tZXNzYWdlKTtcbiAgICB9IGVsc2UgaWYgKHBheWxvYWQudHlwZSA9PT0gXCJzeXN0ZW0tdGhlbWUtdmFyaWFudC11cGRhdGVkXCIpIHtcbiAgICAgIHN5c3RlbVRoZW1lVmFyaWFudCA9IHBheWxvYWQudmFsdWU7XG4gICAgICBmb3IgKGNvbnN0IGZuIG9mIFsuLi50aGVtZVN1YnNjcmliZXJzXSkgZm4oKTtcbiAgICB9XG4gIH0pO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIGJyaWRnZShtZXRob2QsIGFyZ3MgPSBbXSkge1xuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKFwiL2NvZGV4cHAvYnJvd3Nlci11aS9icmlkZ2VcIiwge1xuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIGhlYWRlcnM6IHsgXCJjb250ZW50LXR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgbWV0aG9kLCBhcmdzIH0pLFxuICAgIH0pO1xuICAgIGNvbnN0IGJvZHkgPSBhd2FpdCByZXMuanNvbigpO1xuICAgIGlmICghYm9keS5vaykgdGhyb3cgbmV3IEVycm9yKGJvZHkuZXJyb3IgfHwgXCJDb2RleCsrIGJyb3dzZXIgYnJpZGdlIGZhaWxlZFwiKTtcbiAgICByZXR1cm4gYm9keS52YWx1ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGxlZ2FjeUJyb3dzZXJUYWJJZChjb252ZXJzYXRpb25JZCkge1xuICAgIHJldHVybiBTdHJpbmcoY29udmVyc2F0aW9uSWQgfHwgXCJuZXctY29udmVyc2F0aW9uXCIpICsgXCI6bGVnYWN5XCI7XG4gIH1cblxuICBmdW5jdGlvbiBicm93c2VyU2lkZWJhcktleShjb252ZXJzYXRpb25JZCwgYnJvd3NlclRhYklkKSB7XG4gICAgcmV0dXJuIFN0cmluZyhjb252ZXJzYXRpb25JZCB8fCBcIm5ldy1jb252ZXJzYXRpb25cIikgKyBcIjo6XCIgKyBTdHJpbmcoYnJvd3NlclRhYklkIHx8IGxlZ2FjeUJyb3dzZXJUYWJJZChjb252ZXJzYXRpb25JZCkpO1xuICB9XG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplQnJvd3NlclVybCh2YWx1ZSkge1xuICAgIGNvbnN0IHJhdyA9IFN0cmluZyh2YWx1ZSB8fCBcIlwiKS50cmltKCk7XG4gICAgaWYgKCFyYXcpIHJldHVybiBcIlwiO1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gbmV3IFVSTChyYXcpLmhyZWY7XG4gICAgfSBjYXRjaCB7fVxuICAgIGlmICgvXlthLXpBLVpdW2EtekEtWjAtOSsuLV0qOi8udGVzdChyYXcpKSByZXR1cm4gcmF3O1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gbmV3IFVSTChcImh0dHBzOi8vXCIgKyByYXcpLmhyZWY7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gcmF3O1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGJyb3dzZXJUaXRsZUZvclVybCh1cmwpIHtcbiAgICBpZiAoIXVybCkgcmV0dXJuIFwiTmV3IHRhYlwiO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBob3N0ID0gbmV3IFVSTCh1cmwpLmhvc3RuYW1lLnJlcGxhY2UoL153d3dcXFxcLi8sIFwiXCIpO1xuICAgICAgcmV0dXJuIGhvc3QgfHwgdXJsO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBtYWtlQnJvd3NlclNpZGViYXJTbmFwc2hvdCh1cmwsIHBhdGNoID0ge30pIHtcbiAgICBjb25zdCBub3JtYWxpemVkID0gbm9ybWFsaXplQnJvd3NlclVybCh1cmwpO1xuICAgIHJldHVybiB7XG4gICAgICB0YWJUeXBlOiBub3JtYWxpemVkID8gXCJ3ZWJcIiA6IFwibmV3LXRhYi1wYWdlXCIsXG4gICAgICBpc1N1c3BlbmRlZDogZmFsc2UsXG4gICAgICB0aXRsZTogbm9ybWFsaXplZCA/IGJyb3dzZXJUaXRsZUZvclVybChub3JtYWxpemVkKSA6IFwiTmV3IHRhYlwiLFxuICAgICAgdXJsOiBub3JtYWxpemVkLFxuICAgICAgZmF2aWNvblVybDogbnVsbCxcbiAgICAgIGlzTG9hZGluZzogZmFsc2UsXG4gICAgICBjYW5Hb0JhY2s6IGZhbHNlLFxuICAgICAgY2FuR29Gb3J3YXJkOiBmYWxzZSxcbiAgICAgIHpvb21QZXJjZW50OiAxMDAsXG4gICAgICBjb21tZW50TW9kZURpc2FibGVkUmVhc29uOiBudWxsLFxuICAgICAgaW50ZXJhY3Rpb25Nb2RlOiBcImJyb3dzZVwiLFxuICAgICAgYW5ub3RhdGlvbkVkaXRvck1vZGU6IFwiY29tbWVudFwiLFxuICAgICAgaXNBbm5vdGF0aW9uQWRkTW9kaWZpZXJQcmVzc2VkOiBmYWxzZSxcbiAgICAgIGlzT3JpZ2luYWxWaWV3RW5hYmxlZDogZmFsc2UsXG4gICAgICBpc1R3ZWFrc0VkaXRvck9wZW46IGZhbHNlLFxuICAgICAgY29tbWVudHM6IFtdLFxuICAgICAgLi4ucGF0Y2gsXG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRpc3BhdGNoQnJvd3NlclNpZGViYXJNZXNzYWdlKG1lc3NhZ2UpIHtcbiAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgTWVzc2FnZUV2ZW50KFwibWVzc2FnZVwiLCB7IGRhdGE6IG1lc3NhZ2UgfSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2VlZEJyb3dzZXJTaWRlYmFyTG9jYWxTZXJ2ZXJzKGNvbnZlcnNhdGlvbklkKSB7XG4gICAgaWYgKCFjb252ZXJzYXRpb25JZCB8fCBicm93c2VyU2lkZWJhclNlZWRlZExvY2FsU2VydmVycy5oYXMoY29udmVyc2F0aW9uSWQpKSByZXR1cm47XG4gICAgYnJvd3NlclNpZGViYXJTZWVkZWRMb2NhbFNlcnZlcnMuYWRkKGNvbnZlcnNhdGlvbklkKTtcbiAgICBxdWV1ZU1pY3JvdGFzaygoKSA9PiB7XG4gICAgICBkaXNwYXRjaEJyb3dzZXJTaWRlYmFyTWVzc2FnZSh7XG4gICAgICAgIHR5cGU6IFwiYnJvd3Nlci1zaWRlYmFyLWxvY2FsLXNlcnZlcnNcIixcbiAgICAgICAgY29udmVyc2F0aW9uSWQsXG4gICAgICAgIHN0YXRlOiB7IGlzTG9hZGluZzogZmFsc2UsIHNlcnZlcnM6IFtdLCBoaWRkZW5TZXJ2ZXJzOiBbXSB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiByZW1lbWJlckJyb3dzZXJTaWRlYmFySG9zdE1lc3NhZ2UobWVzc2FnZSkge1xuICAgIGlmICghbWVzc2FnZSB8fCB0eXBlb2YgbWVzc2FnZSAhPT0gXCJvYmplY3RcIikgcmV0dXJuO1xuICAgIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiYnJvd3Nlci1zaWRlYmFyLXN0YXRlXCIpIHtcbiAgICAgIGNvbnN0IGNvbnZlcnNhdGlvbklkID0gbWVzc2FnZS5jb252ZXJzYXRpb25JZDtcbiAgICAgIGlmICghY29udmVyc2F0aW9uSWQgfHwgIW1lc3NhZ2Uuc25hcHNob3QpIHJldHVybjtcbiAgICAgIGJyb3dzZXJTaWRlYmFyU25hcHNob3RzLnNldChicm93c2VyU2lkZWJhcktleShjb252ZXJzYXRpb25JZCwgbWVzc2FnZS5icm93c2VyVGFiSWQpLCBtZXNzYWdlLnNuYXBzaG90KTtcbiAgICB9IGVsc2UgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJicm93c2VyLXNpZGViYXItbG9jYWwtc2VydmVyc1wiKSB7XG4gICAgICBpZiAobWVzc2FnZS5jb252ZXJzYXRpb25JZCkgYnJvd3NlclNpZGViYXJTZWVkZWRMb2NhbFNlcnZlcnMuYWRkKG1lc3NhZ2UuY29udmVyc2F0aW9uSWQpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNlbmRCcm93c2VyU2lkZWJhclNuYXBzaG90KGNvbnZlcnNhdGlvbklkLCBicm93c2VyVGFiSWQsIHNuYXBzaG90UGF0Y2gpIHtcbiAgICBpZiAoIWNvbnZlcnNhdGlvbklkKSByZXR1cm47XG4gICAgY29uc3Qga2V5ID0gYnJvd3NlclNpZGViYXJLZXkoY29udmVyc2F0aW9uSWQsIGJyb3dzZXJUYWJJZCk7XG4gICAgY29uc3QgcHJldmlvdXMgPSBicm93c2VyU2lkZWJhclNuYXBzaG90cy5nZXQoa2V5KSB8fCBtYWtlQnJvd3NlclNpZGViYXJTbmFwc2hvdChcIlwiKTtcbiAgICBjb25zdCBuZXh0ID0geyAuLi5wcmV2aW91cywgLi4uc25hcHNob3RQYXRjaCB9O1xuICAgIGJyb3dzZXJTaWRlYmFyU25hcHNob3RzLnNldChrZXksIG5leHQpO1xuICAgIGRpc3BhdGNoQnJvd3NlclNpZGViYXJNZXNzYWdlKHtcbiAgICAgIHR5cGU6IFwiYnJvd3Nlci1zaWRlYmFyLXN0YXRlXCIsXG4gICAgICBjb252ZXJzYXRpb25JZCxcbiAgICAgIC4uLihicm93c2VyVGFiSWQgPyB7IGJyb3dzZXJUYWJJZCB9IDoge30pLFxuICAgICAgc25hcHNob3Q6IG5leHQsXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRCcm93c2VyU2lkZWJhclVybChjb252ZXJzYXRpb25JZCwgYnJvd3NlclRhYklkLCB1cmwsIGlzTG9hZGluZyA9IGZhbHNlKSB7XG4gICAgY29uc3Qgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZUJyb3dzZXJVcmwodXJsKTtcbiAgICBzZW5kQnJvd3NlclNpZGViYXJTbmFwc2hvdChjb252ZXJzYXRpb25JZCwgYnJvd3NlclRhYklkLCBtYWtlQnJvd3NlclNpZGViYXJTbmFwc2hvdChub3JtYWxpemVkLCB7IGlzTG9hZGluZyB9KSk7XG4gIH1cblxuICBmdW5jdGlvbiBmaW5kQnJvd3NlclNpZGViYXJGcmFtZShjb252ZXJzYXRpb25JZCwgYnJvd3NlclRhYklkKSB7XG4gICAgY29uc3Qgc2VsZWN0b3IgPSBcIltkYXRhLWJyb3dzZXItc2lkZWJhci1jb252ZXJzYXRpb24taWQ9J1wiICsgY3NzRXNjYXBlKGNvbnZlcnNhdGlvbklkKSArIFwiJ11bZGF0YS1icm93c2VyLXNpZGViYXItYnJvd3Nlci10YWItaWQ9J1wiICsgY3NzRXNjYXBlKGJyb3dzZXJUYWJJZCB8fCBsZWdhY3lCcm93c2VyVGFiSWQoY29udmVyc2F0aW9uSWQpKSArIFwiJ11cIjtcbiAgICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gIH1cblxuICBmdW5jdGlvbiBjc3NFc2NhcGUodmFsdWUpIHtcbiAgICBpZiAod2luZG93LkNTUyAmJiB0eXBlb2Ygd2luZG93LkNTUy5lc2NhcGUgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHdpbmRvdy5DU1MuZXNjYXBlKFN0cmluZyh2YWx1ZSkpO1xuICAgIHJldHVybiBTdHJpbmcodmFsdWUpLnJlcGxhY2UoL1snXFxcXFxcXFxdL2csIFwiXFxcXFxcXFwkJlwiKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZUJyb3dzZXJTaWRlYmFyVmlld01lc3NhZ2UobWVzc2FnZSkge1xuICAgIGlmICghbWVzc2FnZSB8fCB0eXBlb2YgbWVzc2FnZSAhPT0gXCJvYmplY3RcIikgcmV0dXJuO1xuICAgIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiYnJvd3Nlci1zaWRlYmFyLXN5bmNcIikge1xuICAgICAgY29uc3QgcGF5bG9hZCA9IG1lc3NhZ2UucGF5bG9hZCB8fCB7fTtcbiAgICAgIHNlZWRCcm93c2VyU2lkZWJhckxvY2FsU2VydmVycyhwYXlsb2FkLmNvbnZlcnNhdGlvbklkKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJicm93c2VyLXNpZGViYXItb3duZXItc3luY1wiKSB7XG4gICAgICBzZWVkQnJvd3NlclNpZGViYXJMb2NhbFNlcnZlcnMobWVzc2FnZS5jb252ZXJzYXRpb25JZCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChtZXNzYWdlLnR5cGUgIT09IFwiYnJvd3Nlci1zaWRlYmFyLWNvbW1hbmRcIikgcmV0dXJuO1xuXG4gICAgY29uc3QgY29udmVyc2F0aW9uSWQgPSBtZXNzYWdlLmNvbnZlcnNhdGlvbklkO1xuICAgIGNvbnN0IGJyb3dzZXJUYWJJZCA9IG1lc3NhZ2UuYnJvd3NlclRhYklkO1xuICAgIGNvbnN0IGNvbW1hbmQgPSBtZXNzYWdlLmNvbW1hbmQgfHwge307XG4gICAgc2VlZEJyb3dzZXJTaWRlYmFyTG9jYWxTZXJ2ZXJzKGNvbnZlcnNhdGlvbklkKTtcblxuICAgIGlmIChjb21tYW5kLnR5cGUgPT09IFwibmF2aWdhdGVcIikge1xuICAgICAgY29uc3Qgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZUJyb3dzZXJVcmwoY29tbWFuZC51cmwpO1xuICAgICAgc2V0QnJvd3NlclNpZGViYXJVcmwoY29udmVyc2F0aW9uSWQsIGJyb3dzZXJUYWJJZCwgbm9ybWFsaXplZCwgdHJ1ZSk7XG4gICAgICBxdWV1ZU1pY3JvdGFzaygoKSA9PiB7XG4gICAgICAgIGNvbnN0IGZyYW1lID0gZmluZEJyb3dzZXJTaWRlYmFyRnJhbWUoY29udmVyc2F0aW9uSWQsIGJyb3dzZXJUYWJJZCk7XG4gICAgICAgIGlmICghZnJhbWUgfHwgIW5vcm1hbGl6ZWQgfHwgZnJhbWUuZ2V0VVJMPy4oKSA9PT0gbm9ybWFsaXplZCkgcmV0dXJuO1xuICAgICAgICBmcmFtZS5sb2FkVVJMPy4obm9ybWFsaXplZCk7XG4gICAgICB9KTtcbiAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHNldEJyb3dzZXJTaWRlYmFyVXJsKGNvbnZlcnNhdGlvbklkLCBicm93c2VyVGFiSWQsIG5vcm1hbGl6ZWQsIGZhbHNlKSwgNTAwKTtcbiAgICB9IGVsc2UgaWYgKGNvbW1hbmQudHlwZSA9PT0gXCJyZWxvYWRcIikge1xuICAgICAgY29uc3QgZnJhbWUgPSBmaW5kQnJvd3NlclNpZGViYXJGcmFtZShjb252ZXJzYXRpb25JZCwgYnJvd3NlclRhYklkKTtcbiAgICAgIGZyYW1lPy5yZWxvYWQ/LigpO1xuICAgICAgY29uc3QgY3VycmVudCA9IGJyb3dzZXJTaWRlYmFyU25hcHNob3RzLmdldChicm93c2VyU2lkZWJhcktleShjb252ZXJzYXRpb25JZCwgYnJvd3NlclRhYklkKSk7XG4gICAgICBpZiAoY3VycmVudD8udXJsKSB7XG4gICAgICAgIHNlbmRCcm93c2VyU2lkZWJhclNuYXBzaG90KGNvbnZlcnNhdGlvbklkLCBicm93c2VyVGFiSWQsIHsgLi4uY3VycmVudCwgaXNMb2FkaW5nOiB0cnVlIH0pO1xuICAgICAgICB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiBzZW5kQnJvd3NlclNpZGViYXJTbmFwc2hvdChjb252ZXJzYXRpb25JZCwgYnJvd3NlclRhYklkLCB7IC4uLmN1cnJlbnQsIGlzTG9hZGluZzogZmFsc2UgfSksIDI1MCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjb21tYW5kLnR5cGUgPT09IFwiZ28tYmFja1wiKSB7XG4gICAgICBmaW5kQnJvd3NlclNpZGViYXJGcmFtZShjb252ZXJzYXRpb25JZCwgYnJvd3NlclRhYklkKT8uZ29CYWNrPy4oKTtcbiAgICB9IGVsc2UgaWYgKGNvbW1hbmQudHlwZSA9PT0gXCJnby1mb3J3YXJkXCIpIHtcbiAgICAgIGZpbmRCcm93c2VyU2lkZWJhckZyYW1lKGNvbnZlcnNhdGlvbklkLCBicm93c2VyVGFiSWQpPy5nb0ZvcndhcmQ/LigpO1xuICAgIH0gZWxzZSBpZiAoY29tbWFuZC50eXBlID09PSBcInN0b3BcIikge1xuICAgICAgY29uc3QgY3VycmVudCA9IGJyb3dzZXJTaWRlYmFyU25hcHNob3RzLmdldChicm93c2VyU2lkZWJhcktleShjb252ZXJzYXRpb25JZCwgYnJvd3NlclRhYklkKSk7XG4gICAgICBpZiAoY3VycmVudCkgc2VuZEJyb3dzZXJTaWRlYmFyU25hcHNob3QoY29udmVyc2F0aW9uSWQsIGJyb3dzZXJUYWJJZCwgeyAuLi5jdXJyZW50LCBpc0xvYWRpbmc6IGZhbHNlIH0pO1xuICAgIH0gZWxzZSBpZiAoY29tbWFuZC50eXBlID09PSBcInJlc2V0XCIgfHwgY29tbWFuZC50eXBlID09PSBcImNsb3NlLXRhYlwiKSB7XG4gICAgICBzZW5kQnJvd3NlclNpZGViYXJTbmFwc2hvdChjb252ZXJzYXRpb25JZCwgYnJvd3NlclRhYklkLCBtYWtlQnJvd3NlclNpZGViYXJTbmFwc2hvdChcIlwiKSk7XG4gICAgfVxuICB9XG5cbiAgd2luZG93LmNvZGV4V2luZG93VHlwZSA9IFwiZWxlY3Ryb25cIjtcbiAgd2luZG93LmVsZWN0cm9uQnJpZGdlID0ge1xuICAgIHdpbmRvd1R5cGU6IFwiZWxlY3Ryb25cIixcbiAgICBzZW5kTWVzc2FnZUZyb21WaWV3OiAobWVzc2FnZSkgPT4ge1xuICAgICAgaWYgKG1lc3NhZ2UgJiYgbWVzc2FnZS50eXBlID09PSBcInNoYXJlZC1vYmplY3Qtc2V0XCIpIHNuYXBzaG90LnNldChtZXNzYWdlLmtleSwgbWVzc2FnZS52YWx1ZSk7XG4gICAgICBoYW5kbGVCcm93c2VyU2lkZWJhclZpZXdNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgcmV0dXJuIGJyaWRnZShcInNlbmRNZXNzYWdlRnJvbVZpZXdcIiwgW21lc3NhZ2VdKTtcbiAgICB9LFxuICAgIGdldFBhdGhGb3JGaWxlOiAoKSA9PiBudWxsLFxuICAgIHNlbmRXb3JrZXJNZXNzYWdlRnJvbVZpZXc6ICh3b3JrZXJJZCwgbWVzc2FnZSkgPT4gYnJpZGdlKFwic2VuZFdvcmtlck1lc3NhZ2VGcm9tVmlld1wiLCBbd29ya2VySWQsIG1lc3NhZ2VdKSxcbiAgICBzdWJzY3JpYmVUb1dvcmtlck1lc3NhZ2VzOiAod29ya2VySWQsIGhhbmRsZXIpID0+IHtcbiAgICAgIGxldCBzdWJzID0gd29ya2VyU3Vic2NyaWJlcnMuZ2V0KHdvcmtlcklkKTtcbiAgICAgIGlmICghc3Vicykge1xuICAgICAgICBzdWJzID0gbmV3IFNldCgpO1xuICAgICAgICB3b3JrZXJTdWJzY3JpYmVycy5zZXQod29ya2VySWQsIHN1YnMpO1xuICAgICAgICBicmlkZ2UoXCJzdWJzY3JpYmVXb3JrZXJNZXNzYWdlc1wiLCBbd29ya2VySWRdKS5jYXRjaChjb25zb2xlLmVycm9yKTtcbiAgICAgIH1cbiAgICAgIHN1YnMuYWRkKGhhbmRsZXIpO1xuICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgY29uc3QgY3VycmVudCA9IHdvcmtlclN1YnNjcmliZXJzLmdldCh3b3JrZXJJZCk7XG4gICAgICAgIGlmICghY3VycmVudCkgcmV0dXJuO1xuICAgICAgICBjdXJyZW50LmRlbGV0ZShoYW5kbGVyKTtcbiAgICAgICAgaWYgKGN1cnJlbnQuc2l6ZSA9PT0gMCkge1xuICAgICAgICAgIHdvcmtlclN1YnNjcmliZXJzLmRlbGV0ZSh3b3JrZXJJZCk7XG4gICAgICAgICAgYnJpZGdlKFwidW5zdWJzY3JpYmVXb3JrZXJNZXNzYWdlc1wiLCBbd29ya2VySWRdKS5jYXRjaChjb25zb2xlLmVycm9yKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9LFxuICAgIHNob3dDb250ZXh0TWVudTogKGl0ZW1zKSA9PiBicmlkZ2UoXCJzaG93Q29udGV4dE1lbnVcIiwgW2l0ZW1zXSksXG4gICAgc2hvd0FwcGxpY2F0aW9uTWVudTogKG1lbnVJZCwgeCwgeSkgPT4gYnJpZGdlKFwic2hvd0FwcGxpY2F0aW9uTWVudVwiLCBbbWVudUlkLCB4LCB5XSksXG4gICAgZ2V0RmFzdE1vZGVSb2xsb3V0TWV0cmljczogKHBhcmFtcykgPT4gYnJpZGdlKFwiZ2V0RmFzdE1vZGVSb2xsb3V0TWV0cmljc1wiLCBbcGFyYW1zXSksXG4gICAgZ2V0U2hhcmVkT2JqZWN0U25hcHNob3RWYWx1ZTogKGtleSkgPT4gc25hcHNob3QuZ2V0KGtleSksXG4gICAgZ2V0U3lzdGVtVGhlbWVWYXJpYW50OiAoKSA9PiBzeXN0ZW1UaGVtZVZhcmlhbnQsXG4gICAgc3Vic2NyaWJlVG9TeXN0ZW1UaGVtZVZhcmlhbnQ6IChoYW5kbGVyKSA9PiB7XG4gICAgICB0aGVtZVN1YnNjcmliZXJzLmFkZChoYW5kbGVyKTtcbiAgICAgIHJldHVybiAoKSA9PiB0aGVtZVN1YnNjcmliZXJzLmRlbGV0ZShoYW5kbGVyKTtcbiAgICB9LFxuICAgIHRyaWdnZXJTZW50cnlUZXN0RXJyb3I6ICgpID0+IGJyaWRnZShcInRyaWdnZXJTZW50cnlUZXN0RXJyb3JcIiwgW10pLFxuICAgIGdldFNlbnRyeUluaXRPcHRpb25zOiAoKSA9PiBudWxsLFxuICAgIGdldEFwcFNlc3Npb25JZDogKCkgPT4gbnVsbCxcbiAgICBnZXRCdWlsZEZsYXZvcjogKCkgPT4gaW5pdGlhbFN0YXRlLmJ1aWxkRmxhdm9yLFxuICAgIGlzSW50ZWxNYWNCdWlsZDogKCkgPT4gaW5pdGlhbFN0YXRlLnBsYXRmb3JtID09PSBcImRhcndpblwiICYmIGluaXRpYWxTdGF0ZS5hcmNoID09PSBcIng2NFwiLFxuICAgIHVzZXNPd2xBcHBTaGVsbDogKCkgPT4gaW5pdGlhbFN0YXRlLnVzZXNPd2xBcHBTaGVsbCxcbiAgfTtcblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgKGV2ZW50KSA9PiB7XG4gICAgaWYgKGV2ZW50LnNvdXJjZSAhPT0gd2luZG93IHx8ICFldmVudC5kYXRhIHx8IGV2ZW50LmRhdGEudHlwZSAhPT0gXCJjb25uZWN0LWFwcC1ob3N0XCIpIHJldHVybjtcbiAgICBjb25zdCBwb3J0ID0gZXZlbnQuZGF0YS5wb3J0O1xuICAgIGlmICghcG9ydCkgcmV0dXJuO1xuICAgIGNvbnN0IHdzID0gbmV3IFdlYlNvY2tldChuZXcgVVJMKFwiL2NvZGV4cHAvYnJvd3Nlci11aS9ycGNcIiwgbG9jYXRpb24uaHJlZikpO1xuICAgIHdzLmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIChtZXNzYWdlKSA9PiBwb3J0LnBvc3RNZXNzYWdlKG1lc3NhZ2UuZGF0YSkpO1xuICAgIHdzLmFkZEV2ZW50TGlzdGVuZXIoXCJjbG9zZVwiLCAoKSA9PiB7XG4gICAgICB0cnkgeyBwb3J0LnBvc3RNZXNzYWdlKG51bGwpOyB9IGNhdGNoIHt9XG4gICAgICB0cnkgeyBwb3J0LmNsb3NlKCk7IH0gY2F0Y2gge31cbiAgICB9KTtcbiAgICB3cy5hZGRFdmVudExpc3RlbmVyKFwib3BlblwiLCAoKSA9PiB7XG4gICAgICBwb3J0Lm9ubWVzc2FnZSA9IChtZXNzYWdlKSA9PiB7XG4gICAgICAgIGlmIChtZXNzYWdlLmRhdGEgPT0gbnVsbCkge1xuICAgICAgICAgIHdzLmNsb3NlKCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHdzLnNlbmQobWVzc2FnZS5kYXRhKTtcbiAgICAgIH07XG4gICAgICBwb3J0LnN0YXJ0ICYmIHBvcnQuc3RhcnQoKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZnVuY3Rpb24gaW5zdGFsbEJyb3dzZXJVaVdlYnZpZXdTaGltKCkge1xuICAgIGlmICh3aW5kb3cuX19jb2RleHBwV2Vidmlld1NoaW1JbnN0YWxsZWQpIHJldHVybjtcbiAgICB3aW5kb3cuX19jb2RleHBwV2Vidmlld1NoaW1JbnN0YWxsZWQgPSB0cnVlO1xuICAgIGNvbnN0IG9yaWdpbmFsQ3JlYXRlRWxlbWVudCA9IERvY3VtZW50LnByb3RvdHlwZS5jcmVhdGVFbGVtZW50O1xuICAgIERvY3VtZW50LnByb3RvdHlwZS5jcmVhdGVFbGVtZW50ID0gZnVuY3Rpb24odGFnTmFtZSwgb3B0aW9ucykge1xuICAgICAgaWYgKFN0cmluZyh0YWdOYW1lKS50b0xvd2VyQ2FzZSgpICE9PSBcIndlYnZpZXdcIikge1xuICAgICAgICByZXR1cm4gb3JpZ2luYWxDcmVhdGVFbGVtZW50LmNhbGwodGhpcywgdGFnTmFtZSwgb3B0aW9ucyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gY3JlYXRlV2Vidmlld0lmcmFtZSh0aGlzKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gY3JlYXRlV2Vidmlld0lmcmFtZShkb2MpIHtcbiAgICAgIGNvbnN0IGlmcmFtZSA9IG9yaWdpbmFsQ3JlYXRlRWxlbWVudC5jYWxsKGRvYywgXCJpZnJhbWVcIik7XG4gICAgICBpZnJhbWUuZGF0YXNldC5jb2RleHBwV2Vidmlld1NoaW0gPSBcInRydWVcIjtcbiAgICAgIGlmcmFtZS5zdHlsZS5ib3JkZXIgPSBcIjBcIjtcbiAgICAgIGlmcmFtZS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xuICAgICAgaWZyYW1lLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IFwiI2ZmZlwiO1xuICAgICAgaWZyYW1lLnNldEF0dHJpYnV0ZShcImFsbG93XCIsIFwiYXV0b3BsYXk7IGNsaXBib2FyZC1yZWFkOyBjbGlwYm9hcmQtd3JpdGU7IGRpc3BsYXktY2FwdHVyZTsgZnVsbHNjcmVlbjsgbWljcm9waG9uZTsgY2FtZXJhXCIpO1xuICAgICAgY29uc3QgbmF0aXZlU2V0QXR0cmlidXRlID0gaWZyYW1lLnNldEF0dHJpYnV0ZS5iaW5kKGlmcmFtZSk7XG4gICAgICBjb25zdCBuYXRpdmVHZXRBdHRyaWJ1dGUgPSBpZnJhbWUuZ2V0QXR0cmlidXRlLmJpbmQoaWZyYW1lKTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGlmcmFtZSwgXCJ0YWdOYW1lXCIsIHsgY29uZmlndXJhYmxlOiB0cnVlLCBnZXQ6ICgpID0+IFwiV0VCVklFV1wiIH0pO1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoaWZyYW1lLCBcIm5vZGVOYW1lXCIsIHsgY29uZmlndXJhYmxlOiB0cnVlLCBnZXQ6ICgpID0+IFwiV0VCVklFV1wiIH0pO1xuICAgICAgfSBjYXRjaCB7fVxuXG4gICAgICBjb25zdCBlbWl0ID0gKHR5cGUsIGV4dHJhID0ge30pID0+IHtcbiAgICAgICAgY29uc3QgZXZlbnQgPSBuZXcgRXZlbnQodHlwZSk7XG4gICAgICAgIE9iamVjdC5hc3NpZ24oZXZlbnQsIGV4dHJhKTtcbiAgICAgICAgaWZyYW1lLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgfTtcbiAgICAgIGNvbnN0IGN1cnJlbnRVcmwgPSAoKSA9PiBpZnJhbWUuZGF0YXNldC5jb2RleHBwUmVxdWVzdGVkU3JjIHx8IG5hdGl2ZUdldEF0dHJpYnV0ZShcInNyY1wiKSB8fCBcImFib3V0OmJsYW5rXCI7XG4gICAgICBjb25zdCBhY3R1YWxGcmFtZVVybCA9ICh1cmwpID0+IHtcbiAgICAgICAgY29uc3QgcmVxdWVzdGVkID0gU3RyaW5nKHVybCB8fCBcImFib3V0OmJsYW5rXCIpO1xuICAgICAgICBpZiAoIXNob3VsZEJyZWFrUmVjdXJzaXZlRnJhbWVMb2FkKHJlcXVlc3RlZCkpIHJldHVybiByZXF1ZXN0ZWQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgbmV4dCA9IG5ldyBVUkwocmVxdWVzdGVkLCBsb2NhdGlvbi5ocmVmKTtcbiAgICAgICAgICBuZXh0LnNlYXJjaFBhcmFtcy5zZXQoXCJfX2NvZGV4cHBfZnJhbWVfZGVwdGhcIiwgU3RyaW5nKGZyYW1lQW5jZXN0b3JEZXB0aCgpICsgMSkpO1xuICAgICAgICAgIHJldHVybiBuZXh0LmhyZWY7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIHJldHVybiByZXF1ZXN0ZWQ7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBjb25zdCBzZXRGcmFtZVVybCA9ICh1cmwpID0+IHtcbiAgICAgICAgY29uc3QgcmVxdWVzdGVkID0gU3RyaW5nKHVybCB8fCBcImFib3V0OmJsYW5rXCIpO1xuICAgICAgICBpZnJhbWUuZGF0YXNldC5jb2RleHBwUmVxdWVzdGVkU3JjID0gcmVxdWVzdGVkO1xuICAgICAgICBuYXRpdmVTZXRBdHRyaWJ1dGUoXCJzcmNcIiwgYWN0dWFsRnJhbWVVcmwocmVxdWVzdGVkKSk7XG4gICAgICB9O1xuICAgICAgY29uc3QgbmF2aWdhdGUgPSAodXJsKSA9PiB7XG4gICAgICAgIGNvbnN0IG5leHQgPSBTdHJpbmcodXJsIHx8IFwiYWJvdXQ6YmxhbmtcIik7XG4gICAgICAgIGVtaXQoXCJkaWQtc3RhcnQtbG9hZGluZ1wiLCB7IHVybDogbmV4dCB9KTtcbiAgICAgICAgc2V0RnJhbWVVcmwobmV4dCk7XG4gICAgICB9O1xuXG4gICAgICBpZnJhbWUuc2V0QXR0cmlidXRlID0gKG5hbWUsIHZhbHVlKSA9PiB7XG4gICAgICAgIGlmIChTdHJpbmcobmFtZSkudG9Mb3dlckNhc2UoKSA9PT0gXCJzcmNcIikge1xuICAgICAgICAgIHNldEZyYW1lVXJsKHZhbHVlKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbmF0aXZlU2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlKTtcbiAgICAgIH07XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShpZnJhbWUsIFwic3JjXCIsIHtcbiAgICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgICAgZ2V0OiAoKSA9PiBjdXJyZW50VXJsKCksXG4gICAgICAgICAgc2V0OiAodmFsdWUpID0+IHNldEZyYW1lVXJsKHZhbHVlKSxcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIHt9XG5cbiAgICAgIGlmcmFtZS5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHVybCA9IGN1cnJlbnRVcmwoKTtcbiAgICAgICAgZW1pdChcImRvbS1yZWFkeVwiLCB7IHVybCB9KTtcbiAgICAgICAgZW1pdChcImRpZC1uYXZpZ2F0ZVwiLCB7IHVybCB9KTtcbiAgICAgICAgZW1pdChcImRpZC1zdG9wLWxvYWRpbmdcIiwgeyB1cmwgfSk7XG4gICAgICAgIGVtaXQoXCJkaWQtZmluaXNoLWxvYWRcIiwgeyB1cmwgfSk7XG4gICAgICAgIGxldCB0aXRsZSA9IFwiXCI7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdGl0bGUgPSBpZnJhbWUuY29udGVudERvY3VtZW50Py50aXRsZSB8fCBcIlwiO1xuICAgICAgICB9IGNhdGNoIHt9XG4gICAgICAgIGNvbnN0IGNvbnZlcnNhdGlvbklkID0gaWZyYW1lLmdldEF0dHJpYnV0ZShcImRhdGEtYnJvd3Nlci1zaWRlYmFyLWNvbnZlcnNhdGlvbi1pZFwiKTtcbiAgICAgICAgY29uc3QgYnJvd3NlclRhYklkID0gaWZyYW1lLmdldEF0dHJpYnV0ZShcImRhdGEtYnJvd3Nlci1zaWRlYmFyLWJyb3dzZXItdGFiLWlkXCIpO1xuICAgICAgICBpZiAoY29udmVyc2F0aW9uSWQpIHtcbiAgICAgICAgICBzZW5kQnJvd3NlclNpZGViYXJTbmFwc2hvdChjb252ZXJzYXRpb25JZCwgYnJvd3NlclRhYklkLCBtYWtlQnJvd3NlclNpZGViYXJTbmFwc2hvdCh1cmwsIHtcbiAgICAgICAgICAgIHRpdGxlOiB0aXRsZSB8fCBicm93c2VyVGl0bGVGb3JVcmwodXJsKSxcbiAgICAgICAgICAgIGlzTG9hZGluZzogZmFsc2UsXG4gICAgICAgICAgfSkpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aXRsZSkgZW1pdChcInBhZ2UtdGl0bGUtdXBkYXRlZFwiLCB7IHRpdGxlIH0pO1xuICAgICAgfSk7XG4gICAgICBpZnJhbWUuYWRkRXZlbnRMaXN0ZW5lcihcImVycm9yXCIsICgpID0+IHtcbiAgICAgICAgZW1pdChcImRpZC1mYWlsLWxvYWRcIiwgeyBlcnJvckNvZGU6IC0yLCBlcnJvckRlc2NyaXB0aW9uOiBcImlmcmFtZSBsb2FkIGZhaWxlZFwiLCB2YWxpZGF0ZWRVUkw6IGN1cnJlbnRVcmwoKSB9KTtcbiAgICAgICAgZW1pdChcImRpZC1zdG9wLWxvYWRpbmdcIiwgeyB1cmw6IGN1cnJlbnRVcmwoKSB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhpZnJhbWUsIHtcbiAgICAgICAgZGVzdHJveTogeyB2YWx1ZTogKCkgPT4gaWZyYW1lLnJlbW92ZSgpIH0sXG4gICAgICAgIGdldFVSTDogeyB2YWx1ZTogKCkgPT4gY3VycmVudFVybCgpIH0sXG4gICAgICAgIGdldFRpdGxlOiB7XG4gICAgICAgICAgdmFsdWU6ICgpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHJldHVybiBpZnJhbWUuY29udGVudERvY3VtZW50Py50aXRsZSB8fCBcIlwiO1xuICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGxvYWRVUkw6IHsgdmFsdWU6ICh1cmwpID0+IHsgbmF2aWdhdGUodXJsKTsgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpOyB9IH0sXG4gICAgICAgIHJlbG9hZDoge1xuICAgICAgICAgIHZhbHVlOiAoKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBpZnJhbWUuY29udGVudFdpbmRvdz8ubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgbmF2aWdhdGUoY3VycmVudFVybCgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBzdG9wOiB7IHZhbHVlOiAoKSA9PiB7fSB9LFxuICAgICAgICBjYW5Hb0JhY2s6IHsgdmFsdWU6ICgpID0+IGZhbHNlIH0sXG4gICAgICAgIGNhbkdvRm9yd2FyZDogeyB2YWx1ZTogKCkgPT4gZmFsc2UgfSxcbiAgICAgICAgZ29CYWNrOiB7XG4gICAgICAgICAgdmFsdWU6ICgpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGlmcmFtZS5jb250ZW50V2luZG93Py5oaXN0b3J5LmJhY2soKTtcbiAgICAgICAgICAgIH0gY2F0Y2gge31cbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBnb0ZvcndhcmQ6IHtcbiAgICAgICAgICB2YWx1ZTogKCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgaWZyYW1lLmNvbnRlbnRXaW5kb3c/Lmhpc3RvcnkuZm9yd2FyZCgpO1xuICAgICAgICAgICAgfSBjYXRjaCB7fVxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGV4ZWN1dGVKYXZhU2NyaXB0OiB7XG4gICAgICAgICAgdmFsdWU6IChjb2RlKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGlmcmFtZS5jb250ZW50V2luZG93Py5ldmFsKFN0cmluZyhjb2RlKSkpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBpbnNlcnRDU1M6IHsgdmFsdWU6ICgpID0+IFByb21pc2UucmVzb2x2ZShcIlwiKSB9LFxuICAgICAgICBvcGVuRGV2VG9vbHM6IHsgdmFsdWU6ICgpID0+IHt9IH0sXG4gICAgICAgIGNsb3NlRGV2VG9vbHM6IHsgdmFsdWU6ICgpID0+IHt9IH0sXG4gICAgICAgIGlzRGV2VG9vbHNPcGVuZWQ6IHsgdmFsdWU6ICgpID0+IGZhbHNlIH0sXG4gICAgICAgIHNlbmQ6IHsgdmFsdWU6ICgpID0+IHt9IH0sXG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIGlmcmFtZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmcmFtZUFuY2VzdG9yRGVwdGgoKSB7XG4gICAgICBsZXQgZGVwdGggPSAwO1xuICAgICAgbGV0IGN1cnJlbnQgPSB3aW5kb3c7XG4gICAgICBjb25zdCBzZWVuID0gbmV3IFNldCgpO1xuICAgICAgd2hpbGUgKGN1cnJlbnQgJiYgIXNlZW4uaGFzKGN1cnJlbnQpKSB7XG4gICAgICAgIHNlZW4uYWRkKGN1cnJlbnQpO1xuICAgICAgICBsZXQgcGFyZW50O1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHBhcmVudCA9IGN1cnJlbnQucGFyZW50O1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAocGFyZW50ID09PSBjdXJyZW50KSBicmVhaztcbiAgICAgICAgZGVwdGggKz0gMTtcbiAgICAgICAgY3VycmVudCA9IHBhcmVudDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBkZXB0aDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG91bGRCcmVha1JlY3Vyc2l2ZUZyYW1lTG9hZCh1cmwpIHtcbiAgICAgIGxldCB0YXJnZXQ7XG4gICAgICB0cnkge1xuICAgICAgICB0YXJnZXQgPSBuZXcgVVJMKHVybCwgbG9jYXRpb24uaHJlZikuaHJlZjtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBsZXQgY3VycmVudCA9IHdpbmRvdztcbiAgICAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0KCk7XG4gICAgICB3aGlsZSAoY3VycmVudCAmJiAhc2Vlbi5oYXMoY3VycmVudCkpIHtcbiAgICAgICAgc2Vlbi5hZGQoY3VycmVudCk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaWYgKG5ldyBVUkwoY3VycmVudC5sb2NhdGlvbi5ocmVmKS5ocmVmID09PSB0YXJnZXQpIHJldHVybiB0cnVlO1xuICAgICAgICAgIGlmIChjdXJyZW50LnBhcmVudCA9PT0gY3VycmVudCkgYnJlYWs7XG4gICAgICAgICAgY3VycmVudCA9IGN1cnJlbnQucGFyZW50O1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbn0pKCk7XG5gO1xufVxuXG5mdW5jdGlvbiBoaWRlVmlzaWJsZUNvZGV4V2luZG93cygpOiB2b2lkIHtcbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09IFwiZGFyd2luXCIpIHtcbiAgICB0cnkge1xuICAgICAgYXBwLmhpZGUoKTtcbiAgICB9IGNhdGNoIHt9XG4gIH1cbiAgZm9yIChjb25zdCB3aW4gb2YgQnJvd3NlcldpbmRvdy5nZXRBbGxXaW5kb3dzKCkpIHtcbiAgICBpZiAod2luLmlzRGVzdHJveWVkKCkpIGNvbnRpbnVlO1xuICAgIGlmIChhY3RpdmVIb3N0ICYmIHdpbi53ZWJDb250ZW50cy5pZCA9PT0gYWN0aXZlSG9zdC53ZWJDb250ZW50cy5pZCkgY29udGludWU7XG4gICAgaWYgKCF3aW4uaXNWaXNpYmxlKCkpIGNvbnRpbnVlO1xuICAgIHRyeSB7XG4gICAgICB3aW4uaGlkZSgpO1xuICAgIH0gY2F0Y2gge31cbiAgfVxufVxuXG5mdW5jdGlvbiBtYWtlV2luZG93TGlrZUZvclZpZXcodmlldzogRWxlY3Ryb24uQnJvd3NlclZpZXcpOiBDb2RleFdpbmRvd0xpa2Uge1xuICBjb25zdCB2aWV3Qm91bmRzID0gKCkgPT4gdmlldy5nZXRCb3VuZHMoKTtcbiAgcmV0dXJuIHtcbiAgICBpZDogdmlldy53ZWJDb250ZW50cy5pZCxcbiAgICB3ZWJDb250ZW50czogdmlldy53ZWJDb250ZW50cyxcbiAgICBvbjogKGV2ZW50OiBcImNsb3NlZFwiLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCkgPT4ge1xuICAgICAgaWYgKGV2ZW50ID09PSBcImNsb3NlZFwiKSB2aWV3LndlYkNvbnRlbnRzLm9uY2UoXCJkZXN0cm95ZWRcIiwgbGlzdGVuZXIpO1xuICAgICAgZWxzZSB2aWV3LndlYkNvbnRlbnRzLm9uKGV2ZW50LCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gdmlldztcbiAgICB9LFxuICAgIG9uY2U6IChldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCkgPT4ge1xuICAgICAgdmlldy53ZWJDb250ZW50cy5vbmNlKGV2ZW50IGFzIFwiZGVzdHJveWVkXCIsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB2aWV3O1xuICAgIH0sXG4gICAgb2ZmOiAoZXZlbnQ6IHN0cmluZywgbGlzdGVuZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpID0+IHtcbiAgICAgIHZpZXcud2ViQ29udGVudHMub2ZmKGV2ZW50IGFzIFwiZGVzdHJveWVkXCIsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB2aWV3O1xuICAgIH0sXG4gICAgcmVtb3ZlTGlzdGVuZXI6IChldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCkgPT4ge1xuICAgICAgdmlldy53ZWJDb250ZW50cy5yZW1vdmVMaXN0ZW5lcihldmVudCBhcyBcImRlc3Ryb3llZFwiLCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gdmlldztcbiAgICB9LFxuICAgIGlzRGVzdHJveWVkOiAoKSA9PiB2aWV3LndlYkNvbnRlbnRzLmlzRGVzdHJveWVkKCksXG4gICAgaXNGb2N1c2VkOiAoKSA9PiB2aWV3LndlYkNvbnRlbnRzLmlzRm9jdXNlZCgpLFxuICAgIGZvY3VzOiAoKSA9PiB2aWV3LndlYkNvbnRlbnRzLmZvY3VzKCksXG4gICAgc2hvdzogKCkgPT4ge30sXG4gICAgaGlkZTogKCkgPT4ge30sXG4gICAgZ2V0Qm91bmRzOiB2aWV3Qm91bmRzLFxuICAgIGdldENvbnRlbnRCb3VuZHM6IHZpZXdCb3VuZHMsXG4gICAgZ2V0U2l6ZTogKCkgPT4ge1xuICAgICAgY29uc3QgYiA9IHZpZXdCb3VuZHMoKTtcbiAgICAgIHJldHVybiBbYi53aWR0aCwgYi5oZWlnaHRdO1xuICAgIH0sXG4gICAgZ2V0Q29udGVudFNpemU6ICgpID0+IHtcbiAgICAgIGNvbnN0IGIgPSB2aWV3Qm91bmRzKCk7XG4gICAgICByZXR1cm4gW2Iud2lkdGgsIGIuaGVpZ2h0XTtcbiAgICB9LFxuICAgIHNldFRpdGxlOiAoKSA9PiB7fSxcbiAgICBnZXRUaXRsZTogKCkgPT4gXCJcIixcbiAgICBzZXRSZXByZXNlbnRlZEZpbGVuYW1lOiAoKSA9PiB7fSxcbiAgICBzZXREb2N1bWVudEVkaXRlZDogKCkgPT4ge30sXG4gICAgc2V0V2luZG93QnV0dG9uVmlzaWJpbGl0eTogKCkgPT4ge30sXG4gIH07XG59XG5cbmZ1bmN0aW9uIGFjY2VwdFdlYlNvY2tldChyZXE6IEluY29taW5nTWVzc2FnZSwgc29ja2V0OiBTb2NrZXQsIGhlYWQ6IEJ1ZmZlcik6IFdlYlNvY2tldENvbm5lY3Rpb24ge1xuICBjb25zdCBrZXkgPSByZXEuaGVhZGVyc1tcInNlYy13ZWJzb2NrZXQta2V5XCJdO1xuICBpZiAodHlwZW9mIGtleSAhPT0gXCJzdHJpbmdcIikgdGhyb3cgbmV3IEVycm9yKFwibWlzc2luZyBTZWMtV2ViU29ja2V0LUtleVwiKTtcbiAgY29uc3QgYWNjZXB0ID0gY3JlYXRlSGFzaChcInNoYTFcIilcbiAgICAudXBkYXRlKGAke2tleX0yNThFQUZBNS1FOTE0LTQ3REEtOTVDQS1DNUFCMERDODVCMTFgKVxuICAgIC5kaWdlc3QoXCJiYXNlNjRcIik7XG4gIHNvY2tldC53cml0ZShcbiAgICBbXG4gICAgICBcIkhUVFAvMS4xIDEwMSBTd2l0Y2hpbmcgUHJvdG9jb2xzXCIsXG4gICAgICBcIlVwZ3JhZGU6IHdlYnNvY2tldFwiLFxuICAgICAgXCJDb25uZWN0aW9uOiBVcGdyYWRlXCIsXG4gICAgICBgU2VjLVdlYlNvY2tldC1BY2NlcHQ6ICR7YWNjZXB0fWAsXG4gICAgICBcIlxcclxcblwiLFxuICAgIF0uam9pbihcIlxcclxcblwiKSxcbiAgKTtcbiAgY29uc3Qgd3MgPSBuZXcgV2ViU29ja2V0Q29ubmVjdGlvbihzb2NrZXQpO1xuICBpZiAoaGVhZC5sZW5ndGggPiAwKSB3cy5hY2NlcHRIZWFkKGhlYWQpO1xuICByZXR1cm4gd3M7XG59XG5cbmNsYXNzIFdlYlNvY2tldENvbm5lY3Rpb24ge1xuICBwcml2YXRlIGJ1ZmZlciA9IEJ1ZmZlci5hbGxvYygwKTtcbiAgcHJpdmF0ZSB0ZXh0SGFuZGxlcnMgPSBuZXcgU2V0PCh0ZXh0OiBzdHJpbmcpID0+IHZvaWQ+KCk7XG4gIHByaXZhdGUgY2xvc2VIYW5kbGVycyA9IG5ldyBTZXQ8KCkgPT4gdm9pZD4oKTtcbiAgcHJpdmF0ZSBjbG9zZWQgPSBmYWxzZTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHNvY2tldDogU29ja2V0KSB7XG4gICAgc29ja2V0Lm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IHRoaXMuYWNjZXB0SGVhZChjaHVuaykpO1xuICAgIHNvY2tldC5vbihcImNsb3NlXCIsICgpID0+IHRoaXMuZW1pdENsb3NlKCkpO1xuICAgIHNvY2tldC5vbihcImVycm9yXCIsICgpID0+IHRoaXMuZW1pdENsb3NlKCkpO1xuICB9XG5cbiAgYWNjZXB0SGVhZChjaHVuazogQnVmZmVyKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuY2xvc2VkKSByZXR1cm47XG4gICAgdGhpcy5idWZmZXIgPSBCdWZmZXIuY29uY2F0KFt0aGlzLmJ1ZmZlciwgY2h1bmtdKTtcbiAgICB0aGlzLnJlYWRGcmFtZXMoKTtcbiAgfVxuXG4gIG9uVGV4dChoYW5kbGVyOiAodGV4dDogc3RyaW5nKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy50ZXh0SGFuZGxlcnMuYWRkKGhhbmRsZXIpO1xuICB9XG5cbiAgb25DbG9zZShoYW5kbGVyOiAoKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5jbG9zZUhhbmRsZXJzLmFkZChoYW5kbGVyKTtcbiAgfVxuXG4gIHNlbmRKc29uKHBheWxvYWQ6IHVua25vd24pOiB2b2lkIHtcbiAgICB0aGlzLnNlbmRUZXh0KEpTT04uc3RyaW5naWZ5KHBheWxvYWQpKTtcbiAgfVxuXG4gIHNlbmRUZXh0KHRleHQ6IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMuc2VuZEZyYW1lKDB4MSwgQnVmZmVyLmZyb20odGV4dCwgXCJ1dGY4XCIpKTtcbiAgfVxuXG4gIGNsb3NlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmNsb3NlZCkgcmV0dXJuO1xuICAgIHRyeSB7XG4gICAgICB0aGlzLnNlbmRGcmFtZSgweDgsIEJ1ZmZlci5hbGxvYygwKSk7XG4gICAgfSBjYXRjaCB7fVxuICAgIHRoaXMuY2xvc2VkID0gdHJ1ZTtcbiAgICB0aGlzLnNvY2tldC5lbmQoKTtcbiAgICB0aGlzLmVtaXRDbG9zZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSByZWFkRnJhbWVzKCk6IHZvaWQge1xuICAgIHdoaWxlICh0aGlzLmJ1ZmZlci5sZW5ndGggPj0gMikge1xuICAgICAgY29uc3QgZmlyc3QgPSB0aGlzLmJ1ZmZlclswXSE7XG4gICAgICBjb25zdCBzZWNvbmQgPSB0aGlzLmJ1ZmZlclsxXSE7XG4gICAgICBjb25zdCBvcGNvZGUgPSBmaXJzdCAmIDB4MGY7XG4gICAgICBjb25zdCBtYXNrZWQgPSAoc2Vjb25kICYgMHg4MCkgIT09IDA7XG4gICAgICBsZXQgbGVuZ3RoID0gc2Vjb25kICYgMHg3ZjtcbiAgICAgIGxldCBvZmZzZXQgPSAyO1xuICAgICAgaWYgKGxlbmd0aCA9PT0gMTI2KSB7XG4gICAgICAgIGlmICh0aGlzLmJ1ZmZlci5sZW5ndGggPCBvZmZzZXQgKyAyKSByZXR1cm47XG4gICAgICAgIGxlbmd0aCA9IHRoaXMuYnVmZmVyLnJlYWRVSW50MTZCRShvZmZzZXQpO1xuICAgICAgICBvZmZzZXQgKz0gMjtcbiAgICAgIH0gZWxzZSBpZiAobGVuZ3RoID09PSAxMjcpIHtcbiAgICAgICAgaWYgKHRoaXMuYnVmZmVyLmxlbmd0aCA8IG9mZnNldCArIDgpIHJldHVybjtcbiAgICAgICAgY29uc3QgaGlnaCA9IHRoaXMuYnVmZmVyLnJlYWRVSW50MzJCRShvZmZzZXQpO1xuICAgICAgICBjb25zdCBsb3cgPSB0aGlzLmJ1ZmZlci5yZWFkVUludDMyQkUob2Zmc2V0ICsgNCk7XG4gICAgICAgIGlmIChoaWdoICE9PSAwKSB7XG4gICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBsZW5ndGggPSBsb3c7XG4gICAgICAgIG9mZnNldCArPSA4O1xuICAgICAgfVxuICAgICAgY29uc3QgbWFza09mZnNldCA9IG9mZnNldDtcbiAgICAgIGlmIChtYXNrZWQpIG9mZnNldCArPSA0O1xuICAgICAgaWYgKHRoaXMuYnVmZmVyLmxlbmd0aCA8IG9mZnNldCArIGxlbmd0aCkgcmV0dXJuO1xuXG4gICAgICBjb25zdCBtYXNrID0gbWFza2VkID8gdGhpcy5idWZmZXIuc3ViYXJyYXkobWFza09mZnNldCwgbWFza09mZnNldCArIDQpIDogbnVsbDtcbiAgICAgIGNvbnN0IHBheWxvYWQgPSBCdWZmZXIuZnJvbSh0aGlzLmJ1ZmZlci5zdWJhcnJheShvZmZzZXQsIG9mZnNldCArIGxlbmd0aCkpO1xuICAgICAgdGhpcy5idWZmZXIgPSB0aGlzLmJ1ZmZlci5zdWJhcnJheShvZmZzZXQgKyBsZW5ndGgpO1xuICAgICAgaWYgKG1hc2spIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXlsb2FkLmxlbmd0aDsgaSArPSAxKSBwYXlsb2FkW2ldIF49IG1hc2tbaSAlIDRdITtcbiAgICAgIH1cblxuICAgICAgaWYgKG9wY29kZSA9PT0gMHg4KSB7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgIH0gZWxzZSBpZiAob3Bjb2RlID09PSAweDkpIHtcbiAgICAgICAgdGhpcy5zZW5kRnJhbWUoMHhBLCBwYXlsb2FkKTtcbiAgICAgIH0gZWxzZSBpZiAob3Bjb2RlID09PSAweDEpIHtcbiAgICAgICAgY29uc3QgdGV4dCA9IHBheWxvYWQudG9TdHJpbmcoXCJ1dGY4XCIpO1xuICAgICAgICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgWy4uLnRoaXMudGV4dEhhbmRsZXJzXSkgaGFuZGxlcih0ZXh0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHNlbmRGcmFtZShvcGNvZGU6IG51bWJlciwgcGF5bG9hZDogQnVmZmVyKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuY2xvc2VkICYmIG9wY29kZSAhPT0gMHg4KSByZXR1cm47XG4gICAgY29uc3QgbGVuZ3RoID0gcGF5bG9hZC5sZW5ndGg7XG4gICAgbGV0IGhlYWRlcjogQnVmZmVyO1xuICAgIGlmIChsZW5ndGggPCAxMjYpIHtcbiAgICAgIGhlYWRlciA9IEJ1ZmZlci5mcm9tKFsweDgwIHwgb3Bjb2RlLCBsZW5ndGhdKTtcbiAgICB9IGVsc2UgaWYgKGxlbmd0aCA8PSAweGZmZmYpIHtcbiAgICAgIGhlYWRlciA9IEJ1ZmZlci5hbGxvYyg0KTtcbiAgICAgIGhlYWRlclswXSA9IDB4ODAgfCBvcGNvZGU7XG4gICAgICBoZWFkZXJbMV0gPSAxMjY7XG4gICAgICBoZWFkZXIud3JpdGVVSW50MTZCRShsZW5ndGgsIDIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBoZWFkZXIgPSBCdWZmZXIuYWxsb2MoMTApO1xuICAgICAgaGVhZGVyWzBdID0gMHg4MCB8IG9wY29kZTtcbiAgICAgIGhlYWRlclsxXSA9IDEyNztcbiAgICAgIGhlYWRlci53cml0ZVVJbnQzMkJFKDAsIDIpO1xuICAgICAgaGVhZGVyLndyaXRlVUludDMyQkUobGVuZ3RoLCA2KTtcbiAgICB9XG4gICAgdGhpcy5zb2NrZXQud3JpdGUoQnVmZmVyLmNvbmNhdChbaGVhZGVyLCBwYXlsb2FkXSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBlbWl0Q2xvc2UoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmNsb3NlZCkgdGhpcy5jbG9zZWQgPSB0cnVlO1xuICAgIGZvciAoY29uc3QgaGFuZGxlciBvZiBbLi4udGhpcy5jbG9zZUhhbmRsZXJzXSkgaGFuZGxlcigpO1xuICAgIHRoaXMuY2xvc2VIYW5kbGVycy5jbGVhcigpO1xuICAgIHRoaXMudGV4dEhhbmRsZXJzLmNsZWFyKCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVxdWVzdFVybChyZXE6IEluY29taW5nTWVzc2FnZSk6IFVSTCB8IG51bGwge1xuICB0cnkge1xuICAgIHJldHVybiBuZXcgVVJMKHJlcS51cmwgPz8gXCIvXCIsIFwiaHR0cDovLzEyNy4wLjAuMVwiKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVhZEpzb25Cb2R5KHJlcTogSW5jb21pbmdNZXNzYWdlKTogUHJvbWlzZTx1bmtub3duPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xuICAgIGxldCB0b3RhbCA9IDA7XG4gICAgcmVxLm9uKFwiZGF0YVwiLCAoY2h1bms6IEJ1ZmZlcikgPT4ge1xuICAgICAgdG90YWwgKz0gY2h1bmsubGVuZ3RoO1xuICAgICAgaWYgKHRvdGFsID4gMTAyNCAqIDEwMjQpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihcInJlcXVlc3QgYm9keSB0b28gbGFyZ2VcIikpO1xuICAgICAgICByZXEuZGVzdHJveSgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjaHVua3MucHVzaChjaHVuayk7XG4gICAgfSk7XG4gICAgcmVxLm9uKFwiZW5kXCIsICgpID0+IHtcbiAgICAgIGNvbnN0IHJhdyA9IEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZyhcInV0ZjhcIik7XG4gICAgICBpZiAoIXJhdykge1xuICAgICAgICByZXNvbHZlKG51bGwpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0cnkge1xuICAgICAgICByZXNvbHZlKEpTT04ucGFyc2UocmF3KSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJlcS5vbihcImVycm9yXCIsIHJlamVjdCk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBzZW5kSnNvbihyZXM6IFNlcnZlclJlc3BvbnNlLCBzdGF0dXM6IG51bWJlciwgYm9keTogdW5rbm93bik6IHZvaWQge1xuICBzZW5kQnVmZmVyKHJlcywgc3RhdHVzLCBCdWZmZXIuZnJvbShKU09OLnN0cmluZ2lmeShib2R5KSksIE1JTUVfVFlQRVNbXCIuanNvblwiXSwgZmFsc2UpO1xufVxuXG5mdW5jdGlvbiBzZW5kVGV4dChyZXM6IFNlcnZlclJlc3BvbnNlLCBzdGF0dXM6IG51bWJlciwgYm9keTogc3RyaW5nLCBjb250ZW50VHlwZTogc3RyaW5nKTogdm9pZCB7XG4gIHNlbmRCdWZmZXIocmVzLCBzdGF0dXMsIEJ1ZmZlci5mcm9tKGJvZHkpLCBjb250ZW50VHlwZSwgZmFsc2UpO1xufVxuXG5mdW5jdGlvbiBzZW5kQnVmZmVyKFxuICByZXM6IFNlcnZlclJlc3BvbnNlLFxuICBzdGF0dXM6IG51bWJlcixcbiAgYm9keTogQnVmZmVyLFxuICBjb250ZW50VHlwZTogc3RyaW5nLFxuICBoZWFkT25seTogYm9vbGVhbixcbik6IHZvaWQge1xuICByZXMud3JpdGVIZWFkKHN0YXR1cywge1xuICAgIFwiY29udGVudC10eXBlXCI6IGNvbnRlbnRUeXBlLFxuICAgIFwiY29udGVudC1sZW5ndGhcIjogYm9keS5sZW5ndGgsXG4gICAgXCJjYWNoZS1jb250cm9sXCI6IFwibm8tc3RvcmVcIixcbiAgfSk7XG4gIGlmIChoZWFkT25seSkgcmVzLmVuZCgpO1xuICBlbHNlIHJlcy5lbmQoYm9keSk7XG59XG5cbmZ1bmN0aW9uIHdlYnZpZXdSb290KCk6IHN0cmluZyB7XG4gIHJldHVybiBqb2luKHByb2Nlc3MucmVzb3VyY2VzUGF0aCwgXCJhcHAuYXNhclwiLCBcIndlYnZpZXdcIik7XG59XG5cbmZ1bmN0aW9uIHdlYnZpZXdGaWxlKHBhdGhuYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgY2xlYW5QYXRoID0gZGVjb2RlVVJJQ29tcG9uZW50KHBhdGhuYW1lKS5yZXBsYWNlKC9eXFwvKy8sIFwiXCIpO1xuICBpZiAoIWNsZWFuUGF0aCB8fCBjbGVhblBhdGguaW5jbHVkZXMoXCJcXDBcIikpIHJldHVybiBudWxsO1xuICBjb25zdCByb290ID0gd2Vidmlld1Jvb3QoKTtcbiAgY29uc3QgZmlsZSA9IG5vcm1hbGl6ZShqb2luKHJvb3QsIGNsZWFuUGF0aCkpO1xuICBjb25zdCByZWwgPSByZWxhdGl2ZShyb290LCBmaWxlKTtcbiAgaWYgKHJlbC5zdGFydHNXaXRoKFwiLi5cIikgfHwgcmVsID09PSBcIlwiKSByZXR1cm4gbnVsbDtcbiAgaWYgKCFleGlzdHNTeW5jKGZpbGUpIHx8ICFzdGF0U3luYyhmaWxlKS5pc0ZpbGUoKSkgcmV0dXJuIG51bGw7XG4gIHJldHVybiBmaWxlO1xufVxuXG5mdW5jdGlvbiBtaW1lVHlwZShmaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBkb3QgPSBmaWxlLmxhc3RJbmRleE9mKFwiLlwiKTtcbiAgY29uc3QgZXh0ID0gZG90ID49IDAgPyBmaWxlLnNsaWNlKGRvdCkudG9Mb3dlckNhc2UoKSA6IFwiXCI7XG4gIHJldHVybiBNSU1FX1RZUEVTW2V4dF0gPz8gXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIjtcbn1cblxuZnVuY3Rpb24gcmVxdWlyZU9wdGlvbnMoKTogQnJvd3NlclVpU2VydmVyT3B0aW9ucyB7XG4gIGlmICghYWN0aXZlT3B0aW9ucykgdGhyb3cgbmV3IEVycm9yKFwiQ29kZXgrKyBicm93c2VyIFVJIHNlcnZlciBpcyBub3QgY29uZmlndXJlZFwiKTtcbiAgcmV0dXJuIGFjdGl2ZU9wdGlvbnM7XG59XG5cbmZ1bmN0aW9uIGlzQnJvd3NlclVpSG9zdFNlbmRlcihzZW5kZXI6IEVsZWN0cm9uLldlYkNvbnRlbnRzKTogYm9vbGVhbiB7XG4gIHJldHVybiAhIWFjdGl2ZUhvc3QgJiYgIWFjdGl2ZUhvc3Qud2ViQ29udGVudHMuaXNEZXN0cm95ZWQoKSAmJiBzZW5kZXIuaWQgPT09IGFjdGl2ZUhvc3Qud2ViQ29udGVudHMuaWQ7XG59XG5cbmZ1bmN0aW9uIGFzc2VydEJyaWRnZU1ldGhvZChtZXRob2Q6IHN0cmluZyk6IHZvaWQge1xuICBpZiAoIS9eW2EtekEtWjAtOS5fOi1dKyQvLnRlc3QobWV0aG9kKSkgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCBicmlkZ2UgbWV0aG9kXCIpO1xufVxuXG5mdW5jdGlvbiBwYXJzZVBvcnQodmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgZmFsbGJhY2s6IG51bWJlcik6IG51bWJlciB7XG4gIGNvbnN0IHBhcnNlZCA9IE51bWJlcih2YWx1ZSk7XG4gIHJldHVybiBOdW1iZXIuaXNJbnRlZ2VyKHBhcnNlZCkgJiYgcGFyc2VkID4gMCAmJiBwYXJzZWQgPD0gNjU1MzUgPyBwYXJzZWQgOiBmYWxsYmFjaztcbn1cblxuZnVuY3Rpb24gYXNSZWNvcmQodmFsdWU6IHVua25vd24pOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IG51bGwge1xuICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiID8gdmFsdWUgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gOiBudWxsO1xufVxuXG5mdW5jdGlvbiBhc1BsYWluT2JqZWN0KHZhbHVlOiB1bmtub3duKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4ge1xuICBjb25zdCByZWNvcmQgPSBhc1JlY29yZCh2YWx1ZSk7XG4gIHJldHVybiByZWNvcmQgJiYgIUFycmF5LmlzQXJyYXkocmVjb3JkKSA/IHJlY29yZCA6IHt9O1xufVxuXG5mdW5jdGlvbiBjdXJyZW50U3lzdGVtVGhlbWVWYXJpYW50KCk6IHN0cmluZyB7XG4gIHJldHVybiBuYXRpdmVUaGVtZS5zaG91bGRVc2VEYXJrQ29sb3JzID8gXCJkYXJrXCIgOiBcImxpZ2h0XCI7XG59XG5cbmZ1bmN0aW9uIHNhZmVKc29uKHZhbHVlOiB1bmtub3duKTogc3RyaW5nIHtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHZhbHVlKS5yZXBsYWNlKC88L2csIFwiXFxcXHUwMDNjXCIpO1xufVxuXG5mdW5jdGlvbiBkZWxheShtczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCBtcykpO1xufVxuIiwgImltcG9ydCB7IHJlYWxwYXRoU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBpc0Fic29sdXRlLCByZWxhdGl2ZSwgcmVzb2x2ZSB9IGZyb20gXCJub2RlOnBhdGhcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVOYXRpdmVUd2Vha1BhdGgodHdlYWtEaXI6IHN0cmluZywgcGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKHR5cGVvZiBwYXRoICE9PSBcInN0cmluZ1wiIHx8IHBhdGgudHJpbSgpID09PSBcIlwiKSB0aHJvdyBuZXcgRXJyb3IoXCJuYXRpdmUgcGF0aCBpcyByZXF1aXJlZFwiKTtcbiAgY29uc3Qgcm9vdCA9IHJlYWxwYXRoU3luYyh0d2Vha0Rpcik7XG4gIGNvbnN0IGZ1bGwgPSByZXNvbHZlKHR3ZWFrRGlyLCBwYXRoKTtcbiAgbGV0IHRhcmdldDogc3RyaW5nO1xuICB0cnkge1xuICAgIHRhcmdldCA9IHJlYWxwYXRoU3luYyhmdWxsKTtcbiAgfSBjYXRjaCB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwibmF0aXZlIHBhdGggZG9lcyBub3QgZXhpc3RcIik7XG4gIH1cbiAgaWYgKCFpc1BhdGhJbnNpZGUocm9vdCwgdGFyZ2V0KSB8fCB0YXJnZXQgPT09IHJvb3QpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJuYXRpdmUgcGF0aCBtdXN0IHN0YXkgaW5zaWRlIHRoZSB0d2VhayBkaXJlY3RvcnlcIik7XG4gIH1cbiAgcmV0dXJuIHRhcmdldDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzUGF0aEluc2lkZShwYXJlbnQ6IHN0cmluZywgdGFyZ2V0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgcmVsID0gcmVsYXRpdmUocmVzb2x2ZShwYXJlbnQpLCByZXNvbHZlKHRhcmdldCkpO1xuICByZXR1cm4gcmVsID09PSBcIlwiIHx8ICghIXJlbCAmJiAhcmVsLnN0YXJ0c1dpdGgoXCIuLlwiKSAmJiAhaXNBYnNvbHV0ZShyZWwpKTtcbn1cbiIsICIvKipcbiAqIFJ1bnRpbWUgcGF0aCBjb25zdGFudHMgYW5kIGVudiBnYXRlLiBMZWFmIG1vZHVsZTogbm8gaW1wb3J0cyBmcm9tIG90aGVyXG4gKiBydW50aW1lIGZlYXR1cmUgbW9kdWxlcy5cbiAqL1xuaW1wb3J0IHsgbWtkaXJTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGhvbWVkaXIgfSBmcm9tIFwibm9kZTpvc1wiO1xuaW1wb3J0IHsgam9pbiwgcmVzb2x2ZSB9IGZyb20gXCJub2RlOnBhdGhcIjtcbmltcG9ydCB7IGFwcGVuZENhcHBlZExvZyB9IGZyb20gXCIuL2xvZ2dpbmdcIjtcbmltcG9ydCB7IHJlc29sdmVUd2Vha1N0b3JlSW5kZXhVcmwgfSBmcm9tIFwiLi90d2Vhay1zdG9yZVwiO1xuXG5jb25zdCB1c2VyUm9vdEVudiA9IHByb2Nlc3MuZW52LkNPREVYX1BMVVNQTFVTX1VTRVJfUk9PVDtcbmNvbnN0IHJ1bnRpbWVEaXJFbnYgPSBwcm9jZXNzLmVudi5DT0RFWF9QTFVTUExVU19SVU5USU1FO1xuXG5pZiAoIXVzZXJSb290RW52IHx8ICFydW50aW1lRGlyRW52KSB7XG4gIHRocm93IG5ldyBFcnJvcihcbiAgICBcImNvZGV4LXBsdXNwbHVzIHJ1bnRpbWUgc3RhcnRlZCB3aXRob3V0IENPREVYX1BMVVNQTFVTX1VTRVJfUk9PVC9SVU5USU1FIGVudnNcIixcbiAgKTtcbn1cblxuZXhwb3J0IGNvbnN0IHVzZXJSb290OiBzdHJpbmcgPSB1c2VyUm9vdEVudjtcbmV4cG9ydCBjb25zdCBydW50aW1lRGlyOiBzdHJpbmcgPSBydW50aW1lRGlyRW52O1xuXG5leHBvcnQgY29uc3QgUFJFTE9BRF9QQVRIID0gcmVzb2x2ZShydW50aW1lRGlyLCBcInByZWxvYWQuanNcIik7XG5leHBvcnQgY29uc3QgR1VFU1RfUFJFTE9BRF9QQVRIID0gcmVzb2x2ZShydW50aW1lRGlyLCBcImd1ZXN0LXByZWxvYWQuanNcIik7XG5leHBvcnQgY29uc3QgVFdFQUtTX0RJUiA9IGpvaW4odXNlclJvb3QsIFwidHdlYWtzXCIpO1xuZXhwb3J0IGNvbnN0IExPR19ESVIgPSBqb2luKHVzZXJSb290LCBcImxvZ1wiKTtcbmV4cG9ydCBjb25zdCBMT0dfRklMRSA9IGpvaW4oTE9HX0RJUiwgXCJtYWluLmxvZ1wiKTtcbmV4cG9ydCBjb25zdCBDT05GSUdfRklMRSA9IGpvaW4odXNlclJvb3QsIFwiY29uZmlnLmpzb25cIik7XG5leHBvcnQgY29uc3QgQ09ERVhfQ09ORklHX0ZJTEUgPSBqb2luKGhvbWVkaXIoKSwgXCIuY29kZXhcIiwgXCJjb25maWcudG9tbFwiKTtcbmV4cG9ydCBjb25zdCBJTlNUQUxMRVJfU1RBVEVfRklMRSA9IGpvaW4odXNlclJvb3QsIFwic3RhdGUuanNvblwiKTtcbmV4cG9ydCBjb25zdCBVUERBVEVfTU9ERV9GSUxFID0gam9pbih1c2VyUm9vdCwgXCJ1cGRhdGUtbW9kZS5qc29uXCIpO1xuZXhwb3J0IGNvbnN0IFNFTEZfVVBEQVRFX1NUQVRFX0ZJTEUgPSBqb2luKHVzZXJSb290LCBcInNlbGYtdXBkYXRlLXN0YXRlLmpzb25cIik7XG5leHBvcnQgY29uc3QgU0lHTkVEX0NPREVYX0JBQ0tVUCA9IGpvaW4odXNlclJvb3QsIFwiYmFja3VwXCIsIFwiQ29kZXguYXBwXCIpO1xuZXhwb3J0IGNvbnN0IENPREVYX1BMVVNQTFVTX1ZFUlNJT04gPSBcIjEuMS40XCI7XG5leHBvcnQgY29uc3QgQ09ERVhfUExVU1BMVVNfUkVQTyA9IFwiTGlnaHRIYXJ1L2NoYXRncHQtbGF5ZXJcIjtcbmV4cG9ydCBjb25zdCBUV0VBS19TVE9SRV9JTkRFWF9VUkwgPSByZXNvbHZlVHdlYWtTdG9yZUluZGV4VXJsKCk7XG5leHBvcnQgY29uc3QgQ09ERVhfV0lORE9XX1NFUlZJQ0VTX0tFWSA9IFwiX19jb2RleHBwX3dpbmRvd19zZXJ2aWNlc19fXCI7XG5cbm1rZGlyU3luYyhMT0dfRElSLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbm1rZGlyU3luYyhUV0VBS1NfRElSLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblxuZXhwb3J0IHR5cGUgUnVudGltZUxvZyA9IChsZXZlbDogXCJpbmZvXCIgfCBcIndhcm5cIiB8IFwiZXJyb3JcIiwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkO1xuXG5leHBvcnQgZnVuY3Rpb24gbG9nKGxldmVsOiBcImluZm9cIiB8IFwid2FyblwiIHwgXCJlcnJvclwiLCAuLi5hcmdzOiB1bmtub3duW10pOiB2b2lkIHtcbiAgY29uc3QgbGluZSA9IGBbJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCl9XSBbJHtsZXZlbH1dICR7YXJnc1xuICAgIC5tYXAoKGEpID0+ICh0eXBlb2YgYSA9PT0gXCJzdHJpbmdcIiA/IGEgOiBKU09OLnN0cmluZ2lmeShhKSkpXG4gICAgLmpvaW4oXCIgXCIpfVxcbmA7XG4gIHRyeSB7XG4gICAgYXBwZW5kQ2FwcGVkTG9nKExPR19GSUxFLCBsaW5lKTtcbiAgfSBjYXRjaCB7fVxuICBpZiAobGV2ZWwgPT09IFwiZXJyb3JcIikgY29uc29sZS5lcnJvcihcIltjb2RleC1wbHVzcGx1c11cIiwgLi4uYXJncyk7XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBUd2Vha01hbmlmZXN0IH0gZnJvbSBcIkBjb2RleC1wbHVzcGx1cy9zZGtcIjtcblxuLyoqIENvbW1pdCBvZiBzdG9yZS9pbmRleC5qc29uIHJldmlld2VkIGludG8gdGhpcyBydW50aW1lLiBOb3QgZmxvYXRpbmcgbWFpbi4gKi9cbmV4cG9ydCBjb25zdCBQSU5ORURfVFdFQUtfU1RPUkVfSU5ERVhfQ09NTUlUID0gXCI3YTBlOTViMTYxZGU1NDgwMjYxZjE3YmJmODQwMDRkOWJlOTBkYzZlXCI7XG4vKiogU0hBLTI1NiBvZiBzdG9yZS9pbmRleC5qc29uIGF0IFBJTk5FRF9UV0VBS19TVE9SRV9JTkRFWF9DT01NSVQuICovXG5leHBvcnQgY29uc3QgUElOTkVEX1RXRUFLX1NUT1JFX0lOREVYX1NIQTI1NiA9XG4gIFwiMzc4ZTg4Y2MzNjZlZjZkNTA4MTZhMjc4MzhhZjE0NmMzNGZlZjEyMmM2YmZlZTNiYTAzYzk1NDliODYyZDA2M1wiO1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfVFdFQUtfU1RPUkVfSU5ERVhfVVJMID1cbiAgYGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9MaWdodEhhcnUvY2hhdGdwdC1sYXllci8ke1BJTk5FRF9UV0VBS19TVE9SRV9JTkRFWF9DT01NSVR9L3N0b3JlL2luZGV4Lmpzb25gO1xuZXhwb3J0IGNvbnN0IFRXRUFLX1NUT1JFX1JFVklFV19JU1NVRV9VUkwgPVxuICBcImh0dHBzOi8vZ2l0aHViLmNvbS9MaWdodEhhcnUvY2hhdGdwdC1sYXllci9pc3N1ZXMvbmV3XCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHdlYWtTdG9yZVJlZ2lzdHJ5IHtcbiAgc2NoZW1hVmVyc2lvbjogMTtcbiAgZ2VuZXJhdGVkQXQ/OiBzdHJpbmc7XG4gIGVudHJpZXM6IFR3ZWFrU3RvcmVFbnRyeVtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFR3ZWFrU3RvcmVFbnRyeSB7XG4gIGlkOiBzdHJpbmc7XG4gIG1hbmlmZXN0OiBUd2Vha01hbmlmZXN0O1xuICByZXBvOiBzdHJpbmc7XG4gIGFwcHJvdmVkQ29tbWl0U2hhOiBzdHJpbmc7XG4gIGFwcHJvdmVkQXQ6IHN0cmluZztcbiAgYXBwcm92ZWRCeTogc3RyaW5nO1xuICBwbGF0Zm9ybXM/OiBUd2Vha1N0b3JlUGxhdGZvcm1bXTtcbiAgcmVsZWFzZVVybD86IHN0cmluZztcbiAgcmV2aWV3VXJsPzogc3RyaW5nO1xufVxuXG5leHBvcnQgdHlwZSBUd2Vha1N0b3JlUGxhdGZvcm0gPSBcImRhcndpblwiIHwgXCJ3aW4zMlwiIHwgXCJsaW51eFwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFR3ZWFrU3RvcmVQdWJsaXNoU3VibWlzc2lvbiB7XG4gIHJlcG86IHN0cmluZztcbiAgZGVmYXVsdEJyYW5jaDogc3RyaW5nO1xuICBjb21taXRTaGE6IHN0cmluZztcbiAgY29tbWl0VXJsOiBzdHJpbmc7XG4gIG1hbmlmZXN0Pzoge1xuICAgIGlkPzogc3RyaW5nO1xuICAgIG5hbWU/OiBzdHJpbmc7XG4gICAgdmVyc2lvbj86IHN0cmluZztcbiAgICBkZXNjcmlwdGlvbj86IHN0cmluZztcbiAgICBpY29uVXJsPzogc3RyaW5nO1xuICB9O1xufVxuXG5jb25zdCBHSVRIVUJfUkVQT19SRSA9IC9eW0EtWmEtejAtOV8uLV0rXFwvW0EtWmEtejAtOV8uLV0rJC87XG5jb25zdCBGVUxMX1NIQV9SRSA9IC9eW2EtZjAtOV17NDB9JC9pO1xuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplR2l0SHViUmVwbyhpbnB1dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgcmF3ID0gaW5wdXQudHJpbSgpO1xuICBpZiAoIXJhdykgdGhyb3cgbmV3IEVycm9yKFwiR2l0SHViIHJlcG8gaXMgcmVxdWlyZWRcIik7XG5cbiAgY29uc3Qgc3NoID0gL15naXRAZ2l0aHViXFwuY29tOihbXi9dK1xcL1teL10rPykoPzpcXC5naXQpPyQvaS5leGVjKHJhdyk7XG4gIGlmIChzc2gpIHJldHVybiBub3JtYWxpemVSZXBvUGFydChzc2hbMV0pO1xuXG4gIGlmICgvXmh0dHBzPzpcXC9cXC8vaS50ZXN0KHJhdykpIHtcbiAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHJhdyk7XG4gICAgaWYgKHVybC5ob3N0bmFtZSAhPT0gXCJnaXRodWIuY29tXCIpIHRocm93IG5ldyBFcnJvcihcIk9ubHkgZ2l0aHViLmNvbSByZXBvc2l0b3JpZXMgYXJlIHN1cHBvcnRlZFwiKTtcbiAgICBjb25zdCBwYXJ0cyA9IHVybC5wYXRobmFtZS5yZXBsYWNlKC9eXFwvK3xcXC8rJC9nLCBcIlwiKS5zcGxpdChcIi9cIik7XG4gICAgaWYgKHBhcnRzLmxlbmd0aCA8IDIpIHRocm93IG5ldyBFcnJvcihcIkdpdEh1YiByZXBvIFVSTCBtdXN0IGluY2x1ZGUgb3duZXIgYW5kIHJlcG9zaXRvcnlcIik7XG4gICAgcmV0dXJuIG5vcm1hbGl6ZVJlcG9QYXJ0KGAke3BhcnRzWzBdfS8ke3BhcnRzWzFdfWApO1xuICB9XG5cbiAgcmV0dXJuIG5vcm1hbGl6ZVJlcG9QYXJ0KHJhdyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVTdG9yZVJlZ2lzdHJ5KGlucHV0OiB1bmtub3duKTogVHdlYWtTdG9yZVJlZ2lzdHJ5IHtcbiAgY29uc3QgcmVnaXN0cnkgPSBpbnB1dCBhcyBQYXJ0aWFsPFR3ZWFrU3RvcmVSZWdpc3RyeT4gfCBudWxsO1xuICBpZiAoIXJlZ2lzdHJ5IHx8IHJlZ2lzdHJ5LnNjaGVtYVZlcnNpb24gIT09IDEgfHwgIUFycmF5LmlzQXJyYXkocmVnaXN0cnkuZW50cmllcykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbnN1cHBvcnRlZCB0d2VhayBzdG9yZSByZWdpc3RyeVwiKTtcbiAgfVxuICBjb25zdCBlbnRyaWVzID0gcmVnaXN0cnkuZW50cmllcy5tYXAobm9ybWFsaXplU3RvcmVFbnRyeSk7XG4gIGVudHJpZXMuc29ydCgoYSwgYikgPT4gYS5tYW5pZmVzdC5uYW1lLmxvY2FsZUNvbXBhcmUoYi5tYW5pZmVzdC5uYW1lKSk7XG4gIHJldHVybiB7XG4gICAgc2NoZW1hVmVyc2lvbjogMSxcbiAgICBnZW5lcmF0ZWRBdDogdHlwZW9mIHJlZ2lzdHJ5LmdlbmVyYXRlZEF0ID09PSBcInN0cmluZ1wiID8gcmVnaXN0cnkuZ2VuZXJhdGVkQXQgOiB1bmRlZmluZWQsXG4gICAgZW50cmllcyxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNodWZmbGVTdG9yZUVudHJpZXM8VD4oXG4gIGVudHJpZXM6IHJlYWRvbmx5IFRbXSxcbiAgcmFuZG9tSW5kZXg6IChleGNsdXNpdmVNYXg6IG51bWJlcikgPT4gbnVtYmVyID0gKGV4Y2x1c2l2ZU1heCkgPT4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogZXhjbHVzaXZlTWF4KSxcbik6IFRbXSB7XG4gIGNvbnN0IHNodWZmbGVkID0gWy4uLmVudHJpZXNdO1xuICBmb3IgKGxldCBpID0gc2h1ZmZsZWQubGVuZ3RoIC0gMTsgaSA+IDA7IGkgLT0gMSkge1xuICAgIGNvbnN0IGogPSByYW5kb21JbmRleChpICsgMSk7XG4gICAgaWYgKCFOdW1iZXIuaXNJbnRlZ2VyKGopIHx8IGogPCAwIHx8IGogPiBpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYHNodWZmbGUgcmFuZG9tSW5kZXggcmV0dXJuZWQgJHtqfTsgZXhwZWN0ZWQgYW4gaW50ZWdlciBmcm9tIDAgdG8gJHtpfWApO1xuICAgIH1cbiAgICBbc2h1ZmZsZWRbaV0sIHNodWZmbGVkW2pdXSA9IFtzaHVmZmxlZFtqXSwgc2h1ZmZsZWRbaV1dO1xuICB9XG4gIHJldHVybiBzaHVmZmxlZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVN0b3JlRW50cnkoaW5wdXQ6IHVua25vd24pOiBUd2Vha1N0b3JlRW50cnkge1xuICBjb25zdCBlbnRyeSA9IGlucHV0IGFzIFBhcnRpYWw8VHdlYWtTdG9yZUVudHJ5PiB8IG51bGw7XG4gIGlmICghZW50cnkgfHwgdHlwZW9mIGVudHJ5ICE9PSBcIm9iamVjdFwiKSB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHR3ZWFrIHN0b3JlIGVudHJ5XCIpO1xuICBjb25zdCByZXBvID0gbm9ybWFsaXplR2l0SHViUmVwbyhTdHJpbmcoZW50cnkucmVwbyA/PyBlbnRyeS5tYW5pZmVzdD8uZ2l0aHViUmVwbyA/PyBcIlwiKSk7XG4gIGNvbnN0IG1hbmlmZXN0ID0gZW50cnkubWFuaWZlc3QgYXMgVHdlYWtNYW5pZmVzdCB8IHVuZGVmaW5lZDtcbiAgaWYgKCFtYW5pZmVzdD8uaWQgfHwgIW1hbmlmZXN0Lm5hbWUgfHwgIW1hbmlmZXN0LnZlcnNpb24pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFN0b3JlIGVudHJ5IGZvciAke3JlcG99IGlzIG1pc3NpbmcgbWFuaWZlc3QgZmllbGRzYCk7XG4gIH1cbiAgaWYgKG5vcm1hbGl6ZUdpdEh1YlJlcG8obWFuaWZlc3QuZ2l0aHViUmVwbykgIT09IHJlcG8pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFN0b3JlIGVudHJ5ICR7bWFuaWZlc3QuaWR9IHJlcG8gZG9lcyBub3QgbWF0Y2ggbWFuaWZlc3QgZ2l0aHViUmVwb2ApO1xuICB9XG4gIGlmICghaXNGdWxsQ29tbWl0U2hhKFN0cmluZyhlbnRyeS5hcHByb3ZlZENvbW1pdFNoYSA/PyBcIlwiKSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFN0b3JlIGVudHJ5ICR7bWFuaWZlc3QuaWR9IG11c3QgcGluIGEgZnVsbCBhcHByb3ZlZCBjb21taXQgU0hBYCk7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBpZDogbWFuaWZlc3QuaWQsXG4gICAgbWFuaWZlc3QsXG4gICAgcmVwbyxcbiAgICBhcHByb3ZlZENvbW1pdFNoYTogU3RyaW5nKGVudHJ5LmFwcHJvdmVkQ29tbWl0U2hhKSxcbiAgICBhcHByb3ZlZEF0OiB0eXBlb2YgZW50cnkuYXBwcm92ZWRBdCA9PT0gXCJzdHJpbmdcIiA/IGVudHJ5LmFwcHJvdmVkQXQgOiBcIlwiLFxuICAgIGFwcHJvdmVkQnk6IHR5cGVvZiBlbnRyeS5hcHByb3ZlZEJ5ID09PSBcInN0cmluZ1wiID8gZW50cnkuYXBwcm92ZWRCeSA6IFwiXCIsXG4gICAgcGxhdGZvcm1zOiBub3JtYWxpemVTdG9yZVBsYXRmb3JtcygoZW50cnkgYXMgeyBwbGF0Zm9ybXM/OiB1bmtub3duIH0pLnBsYXRmb3JtcyksXG4gICAgcmVsZWFzZVVybDogb3B0aW9uYWxHaXRodWJVcmwoZW50cnkucmVsZWFzZVVybCksXG4gICAgcmV2aWV3VXJsOiBvcHRpb25hbEdpdGh1YlVybChlbnRyeS5yZXZpZXdVcmwpLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RvcmVBcmNoaXZlVXJsKGVudHJ5OiBUd2Vha1N0b3JlRW50cnkpOiBzdHJpbmcge1xuICBpZiAoIWlzRnVsbENvbW1pdFNoYShlbnRyeS5hcHByb3ZlZENvbW1pdFNoYSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFN0b3JlIGVudHJ5ICR7ZW50cnkuaWR9IGlzIG5vdCBwaW5uZWQgdG8gYSBmdWxsIGNvbW1pdCBTSEFgKTtcbiAgfVxuICByZXR1cm4gYGh0dHBzOi8vY29kZWxvYWQuZ2l0aHViLmNvbS8ke2VudHJ5LnJlcG99L3Rhci5nei8ke2VudHJ5LmFwcHJvdmVkQ29tbWl0U2hhfWA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFR3ZWFrUHVibGlzaElzc3VlVXJsKHN1Ym1pc3Npb246IFR3ZWFrU3RvcmVQdWJsaXNoU3VibWlzc2lvbik6IHN0cmluZyB7XG4gIGNvbnN0IHJlcG8gPSBub3JtYWxpemVHaXRIdWJSZXBvKHN1Ym1pc3Npb24ucmVwbyk7XG4gIGlmICghaXNGdWxsQ29tbWl0U2hhKHN1Ym1pc3Npb24uY29tbWl0U2hhKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIlN1Ym1pc3Npb24gbXVzdCBpbmNsdWRlIHRoZSBmdWxsIGNvbW1pdCBTSEEgdG8gcmV2aWV3XCIpO1xuICB9XG4gIGNvbnN0IHRpdGxlID0gYFR3ZWFrIHN0b3JlIHJldmlldzogJHtyZXBvfWA7XG4gIGNvbnN0IGJvZHkgPSBbXG4gICAgXCIjIyBUd2VhayByZXBvXCIsXG4gICAgYGh0dHBzOi8vZ2l0aHViLmNvbS8ke3JlcG99YCxcbiAgICBcIlwiLFxuICAgIFwiIyMgQ29tbWl0IHRvIHJldmlld1wiLFxuICAgIHN1Ym1pc3Npb24uY29tbWl0U2hhLFxuICAgIHN1Ym1pc3Npb24uY29tbWl0VXJsLFxuICAgIFwiXCIsXG4gICAgXCJEbyBub3QgYXBwcm92ZSBhIGRpZmZlcmVudCBjb21taXQuIElmIHRoZSBhdXRob3IgcHVzaGVzIGNoYW5nZXMsIGFzayB0aGVtIHRvIHJlc3VibWl0LlwiLFxuICAgIFwiXCIsXG4gICAgXCIjIyBNYW5pZmVzdFwiLFxuICAgIGAtIGlkOiAke3N1Ym1pc3Npb24ubWFuaWZlc3Q/LmlkID8/IFwiKG5vdCBkZXRlY3RlZClcIn1gLFxuICAgIGAtIG5hbWU6ICR7c3VibWlzc2lvbi5tYW5pZmVzdD8ubmFtZSA/PyBcIihub3QgZGV0ZWN0ZWQpXCJ9YCxcbiAgICBgLSB2ZXJzaW9uOiAke3N1Ym1pc3Npb24ubWFuaWZlc3Q/LnZlcnNpb24gPz8gXCIobm90IGRldGVjdGVkKVwifWAsXG4gICAgYC0gZGVzY3JpcHRpb246ICR7c3VibWlzc2lvbi5tYW5pZmVzdD8uZGVzY3JpcHRpb24gPz8gXCIobm90IGRldGVjdGVkKVwifWAsXG4gICAgYC0gaWNvblVybDogJHtzdWJtaXNzaW9uLm1hbmlmZXN0Py5pY29uVXJsID8/IFwiKG5vdCBkZXRlY3RlZClcIn1gLFxuICAgIFwiXCIsXG4gICAgXCIjIyBBZG1pbiBjaGVja2xpc3RcIixcbiAgICBcIi0gWyBdIG1hbmlmZXN0Lmpzb24gaXMgdmFsaWRcIixcbiAgICBcIi0gWyBdIG1hbmlmZXN0Lmljb25VcmwgaXMgdXNhYmxlIGFzIHRoZSBzdG9yZSBpY29uXCIsXG4gICAgXCItIFsgXSBzb3VyY2Ugd2FzIHJldmlld2VkIGF0IHRoZSBleGFjdCBjb21taXQgYWJvdmVcIixcbiAgICBcIi0gWyBdIGBzdG9yZS9pbmRleC5qc29uYCBlbnRyeSBwaW5zIGBhcHByb3ZlZENvbW1pdFNoYWAgdG8gdGhlIGV4YWN0IGNvbW1pdCBhYm92ZVwiLFxuICBdLmpvaW4oXCJcXG5cIik7XG4gIGNvbnN0IHVybCA9IG5ldyBVUkwoVFdFQUtfU1RPUkVfUkVWSUVXX0lTU1VFX1VSTCk7XG4gIHVybC5zZWFyY2hQYXJhbXMuc2V0KFwidGVtcGxhdGVcIiwgXCJ0d2Vhay1zdG9yZS1yZXZpZXcubWRcIik7XG4gIHVybC5zZWFyY2hQYXJhbXMuc2V0KFwidGl0bGVcIiwgdGl0bGUpO1xuICB1cmwuc2VhcmNoUGFyYW1zLnNldChcImJvZHlcIiwgYm9keSk7XG4gIHJldHVybiB1cmwudG9TdHJpbmcoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRnVsbENvbW1pdFNoYSh2YWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBGVUxMX1NIQV9SRS50ZXN0KHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplUmVwb1BhcnQodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHJlcG8gPSB2YWx1ZS50cmltKCkucmVwbGFjZSgvXFwuZ2l0JC9pLCBcIlwiKS5yZXBsYWNlKC9eXFwvK3xcXC8rJC9nLCBcIlwiKTtcbiAgaWYgKCFHSVRIVUJfUkVQT19SRS50ZXN0KHJlcG8pKSB0aHJvdyBuZXcgRXJyb3IoXCJHaXRIdWIgcmVwbyBtdXN0IGJlIGluIG93bmVyL3JlcG8gZm9ybVwiKTtcbiAgcmV0dXJuIHJlcG87XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVN0b3JlUGxhdGZvcm1zKGlucHV0OiB1bmtub3duKTogVHdlYWtTdG9yZVBsYXRmb3JtW10gfCB1bmRlZmluZWQge1xuICBpZiAoaW5wdXQgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgaWYgKCFBcnJheS5pc0FycmF5KGlucHV0KSkgdGhyb3cgbmV3IEVycm9yKFwiU3RvcmUgZW50cnkgcGxhdGZvcm1zIG11c3QgYmUgYW4gYXJyYXlcIik7XG4gIGNvbnN0IGFsbG93ZWQgPSBuZXcgU2V0PFR3ZWFrU3RvcmVQbGF0Zm9ybT4oW1wiZGFyd2luXCIsIFwid2luMzJcIiwgXCJsaW51eFwiXSk7XG4gIGNvbnN0IHBsYXRmb3JtcyA9IEFycmF5LmZyb20obmV3IFNldChpbnB1dC5tYXAoKHZhbHVlKSA9PiB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIiB8fCAhYWxsb3dlZC5oYXModmFsdWUgYXMgVHdlYWtTdG9yZVBsYXRmb3JtKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBzdG9yZSBwbGF0Zm9ybTogJHtTdHJpbmcodmFsdWUpfWApO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWUgYXMgVHdlYWtTdG9yZVBsYXRmb3JtO1xuICB9KSkpO1xuICByZXR1cm4gcGxhdGZvcm1zLmxlbmd0aCA+IDAgPyBwbGF0Zm9ybXMgOiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIG9wdGlvbmFsR2l0aHViVXJsKHZhbHVlOiB1bmtub3duKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIiB8fCAhdmFsdWUudHJpbSgpKSByZXR1cm4gdW5kZWZpbmVkO1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKHZhbHVlKTtcbiAgaWYgKHVybC5wcm90b2NvbCAhPT0gXCJodHRwczpcIiB8fCB1cmwuaG9zdG5hbWUgIT09IFwiZ2l0aHViLmNvbVwiKSByZXR1cm4gdW5kZWZpbmVkO1xuICByZXR1cm4gdXJsLnRvU3RyaW5nKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlVHdlYWtTdG9yZUluZGV4VXJsKGVudjogTm9kZUpTLkRpY3Q8c3RyaW5nIHwgdW5kZWZpbmVkPiA9IHByb2Nlc3MuZW52KTogc3RyaW5nIHtcbiAgY29uc3Qgb3ZlcnJpZGUgPSBlbnYuQ09ERVhfUExVU1BMVVNfU1RPUkVfSU5ERVhfVVJMPy50cmltKCk7XG4gIGlmIChvdmVycmlkZSkge1xuICAgIGlmIChlbnYuQ09ERVhfUExVU1BMVVNfQUxMT1dfU1RPUkVfSU5ERVhfT1ZFUlJJREUgIT09IFwiMVwiKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIFwiQ09ERVhfUExVU1BMVVNfU1RPUkVfSU5ERVhfVVJMIG92ZXJyaWRlIHJlcXVpcmVzIENPREVYX1BMVVNQTFVTX0FMTE9XX1NUT1JFX0lOREVYX09WRVJSSURFPTFcIixcbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiBvdmVycmlkZTtcbiAgfVxuICByZXR1cm4gREVGQVVMVF9UV0VBS19TVE9SRV9JTkRFWF9VUkw7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFN0b3JlSW5zdGFsbFBpbihlbnRyeTogVHdlYWtTdG9yZUVudHJ5LCBjb21taXRTaGE6IHN0cmluZyk6IHZvaWQge1xuICBpZiAoZW50cnkuYXBwcm92ZWRDb21taXRTaGEudG9Mb3dlckNhc2UoKSAhPT0gY29tbWl0U2hhLnRvTG93ZXJDYXNlKCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgUmVmdXNpbmcgdG8gaW5zdGFsbCAke2VudHJ5LmlkfSBhdCAke2NvbW1pdFNoYX07IHN0b3JlIHBpbiBpcyAke2VudHJ5LmFwcHJvdmVkQ29tbWl0U2hhfWAsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2hvcnRDb21taXRTaGEoc2hhOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gc2hhLnNsaWNlKDAsIDcpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGlzdGVkUGluTGFiZWwoc2hhOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYExpc3RlZCBcdTAwQjcgcGlubmVkICR7c2hvcnRDb21taXRTaGEoc2hhKX1gO1xufSIsICJpbXBvcnQgeyByZWFkRmlsZVN5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tIFwibm9kZTpmc1wiO1xuaW1wb3J0IHsgaXNMYXllckF1dG9VcGRhdGVFbmFibGVkIH0gZnJvbSBcIi4vaXBjLWd1YXJkXCI7XG5pbXBvcnQge1xuICBDT05GSUdfRklMRSxcbiAgSU5TVEFMTEVSX1NUQVRFX0ZJTEUsXG4gIFNFTEZfVVBEQVRFX1NUQVRFX0ZJTEUsXG4gIGxvZyxcbn0gZnJvbSBcIi4vcnVudGltZS1wYXRoc1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBlcnNpc3RlZFN0YXRlIHtcbiAgY29kZXhQbHVzUGx1cz86IHtcbiAgICBhdXRvVXBkYXRlPzogYm9vbGVhbjtcbiAgICBzYWZlTW9kZT86IGJvb2xlYW47XG4gICAgdXBkYXRlQ2hhbm5lbD86IFNlbGZVcGRhdGVDaGFubmVsO1xuICAgIHVwZGF0ZVJlcG8/OiBzdHJpbmc7XG4gICAgdXBkYXRlUmVmPzogc3RyaW5nO1xuICAgIHVwZGF0ZUNoZWNrPzogQ29kZXhQbHVzUGx1c1VwZGF0ZUNoZWNrO1xuICB9O1xuICAvKiogUGVyLXR3ZWFrIGVuYWJsZSBmbGFncy4gTWlzc2luZyBlbnRyaWVzIGRlZmF1bHQgdG8gZW5hYmxlZC4gKi9cbiAgdHdlYWtzPzogUmVjb3JkPHN0cmluZywgeyBlbmFibGVkPzogYm9vbGVhbiB9PjtcbiAgLyoqIENhY2hlZCBHaXRIdWIgcmVsZWFzZSBjaGVja3MuIFJ1bnRpbWUgbmV2ZXIgYXV0by1pbnN0YWxsczsgdGhlIHVzZXIgY2FuIGNsaWNrIFVwZGF0ZSBvbiB0aGUgVHdlYWtzIHBhZ2UuICovXG4gIHR3ZWFrVXBkYXRlQ2hlY2tzPzogUmVjb3JkPHN0cmluZywgVHdlYWtVcGRhdGVDaGVjaz47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29kZXhQbHVzUGx1c1VwZGF0ZUNoZWNrIHtcbiAgY2hlY2tlZEF0OiBzdHJpbmc7XG4gIGN1cnJlbnRWZXJzaW9uOiBzdHJpbmc7XG4gIGxhdGVzdFZlcnNpb246IHN0cmluZyB8IG51bGw7XG4gIHJlbGVhc2VVcmw6IHN0cmluZyB8IG51bGw7XG4gIHJlbGVhc2VOb3Rlczogc3RyaW5nIHwgbnVsbDtcbiAgdXBkYXRlQXZhaWxhYmxlOiBib29sZWFuO1xuICBlcnJvcj86IHN0cmluZztcbn1cblxuZXhwb3J0IHR5cGUgU2VsZlVwZGF0ZUNoYW5uZWwgPSBcInN0YWJsZVwiIHwgXCJwcmVyZWxlYXNlXCIgfCBcImN1c3RvbVwiO1xuZXhwb3J0IHR5cGUgU2VsZlVwZGF0ZVN0YXR1cyA9IFwiY2hlY2tpbmdcIiB8IFwidXAtdG8tZGF0ZVwiIHwgXCJ1cGRhdGVkXCIgfCBcImZhaWxlZFwiIHwgXCJkaXNhYmxlZFwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlbGZVcGRhdGVTdGF0ZSB7XG4gIGNoZWNrZWRBdDogc3RyaW5nO1xuICBjb21wbGV0ZWRBdD86IHN0cmluZztcbiAgc3RhdHVzOiBTZWxmVXBkYXRlU3RhdHVzO1xuICBjdXJyZW50VmVyc2lvbjogc3RyaW5nO1xuICBsYXRlc3RWZXJzaW9uOiBzdHJpbmcgfCBudWxsO1xuICB0YXJnZXRSZWY6IHN0cmluZyB8IG51bGw7XG4gIHJlbGVhc2VVcmw6IHN0cmluZyB8IG51bGw7XG4gIHJlcG86IHN0cmluZztcbiAgY2hhbm5lbDogU2VsZlVwZGF0ZUNoYW5uZWw7XG4gIHNvdXJjZVJvb3Q6IHN0cmluZztcbiAgaW5zdGFsbGF0aW9uU291cmNlPzogSW5zdGFsbGF0aW9uU291cmNlO1xuICBlcnJvcj86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbnN0YWxsYXRpb25Tb3VyY2Uge1xuICBraW5kOiBcImdpdGh1Yi1zb3VyY2VcIiB8IFwiaG9tZWJyZXdcIiB8IFwibG9jYWwtZGV2XCIgfCBcInNvdXJjZS1hcmNoaXZlXCIgfCBcInVua25vd25cIjtcbiAgbGFiZWw6IHN0cmluZztcbiAgZGV0YWlsOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHdlYWtVcGRhdGVDaGVjayB7XG4gIGNoZWNrZWRBdDogc3RyaW5nO1xuICByZXBvOiBzdHJpbmc7XG4gIGN1cnJlbnRWZXJzaW9uOiBzdHJpbmc7XG4gIGxhdGVzdFZlcnNpb246IHN0cmluZyB8IG51bGw7XG4gIGxhdGVzdFRhZzogc3RyaW5nIHwgbnVsbDtcbiAgcmVsZWFzZVVybDogc3RyaW5nIHwgbnVsbDtcbiAgdXBkYXRlQXZhaWxhYmxlOiBib29sZWFuO1xuICBwaW5uZWRTaGE/OiBzdHJpbmc7XG4gIGVycm9yPzogc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZFN0YXRlKCk6IFBlcnNpc3RlZFN0YXRlIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMoQ09ORklHX0ZJTEUsIFwidXRmOFwiKSkgYXMgUGVyc2lzdGVkU3RhdGU7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB7fTtcbiAgfVxufVxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlU3RhdGUoczogUGVyc2lzdGVkU3RhdGUpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICB3cml0ZUZpbGVTeW5jKENPTkZJR19GSUxFLCBKU09OLnN0cmluZ2lmeShzLCBudWxsLCAyKSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2coXCJ3YXJuXCIsIFwid3JpdGVTdGF0ZSBmYWlsZWQ6XCIsIFN0cmluZygoZSBhcyBFcnJvcikubWVzc2FnZSkpO1xuICB9XG59XG5leHBvcnQgZnVuY3Rpb24gaXNDb2RleFBsdXNQbHVzQXV0b1VwZGF0ZUVuYWJsZWQoKTogYm9vbGVhbiB7XG4gIHJldHVybiBpc0xheWVyQXV0b1VwZGF0ZUVuYWJsZWQocmVhZFN0YXRlKCkuY29kZXhQbHVzUGx1cz8uYXV0b1VwZGF0ZSk7XG59XG5leHBvcnQgZnVuY3Rpb24gc2V0Q29kZXhQbHVzUGx1c0F1dG9VcGRhdGUoZW5hYmxlZDogYm9vbGVhbik6IHZvaWQge1xuICBjb25zdCBzID0gcmVhZFN0YXRlKCk7XG4gIHMuY29kZXhQbHVzUGx1cyA/Pz0ge307XG4gIHMuY29kZXhQbHVzUGx1cy5hdXRvVXBkYXRlID0gZW5hYmxlZDtcbiAgd3JpdGVTdGF0ZShzKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBzZXRDb2RleFBsdXNQbHVzVXBkYXRlQ29uZmlnKGNvbmZpZzoge1xuICB1cGRhdGVDaGFubmVsPzogU2VsZlVwZGF0ZUNoYW5uZWw7XG4gIHVwZGF0ZVJlcG8/OiBzdHJpbmc7XG4gIHVwZGF0ZVJlZj86IHN0cmluZztcbn0pOiB2b2lkIHtcbiAgY29uc3QgcyA9IHJlYWRTdGF0ZSgpO1xuICBzLmNvZGV4UGx1c1BsdXMgPz89IHt9O1xuICBpZiAoY29uZmlnLnVwZGF0ZUNoYW5uZWwpIHMuY29kZXhQbHVzUGx1cy51cGRhdGVDaGFubmVsID0gY29uZmlnLnVwZGF0ZUNoYW5uZWw7XG4gIGlmIChcInVwZGF0ZVJlcG9cIiBpbiBjb25maWcpIHMuY29kZXhQbHVzUGx1cy51cGRhdGVSZXBvID0gY2xlYW5PcHRpb25hbFN0cmluZyhjb25maWcudXBkYXRlUmVwbyk7XG4gIGlmIChcInVwZGF0ZVJlZlwiIGluIGNvbmZpZykgcy5jb2RleFBsdXNQbHVzLnVwZGF0ZVJlZiA9IGNsZWFuT3B0aW9uYWxTdHJpbmcoY29uZmlnLnVwZGF0ZVJlZik7XG4gIHdyaXRlU3RhdGUocyk7XG59XG5leHBvcnQgZnVuY3Rpb24gaXNDb2RleFBsdXNQbHVzU2FmZU1vZGVFbmFibGVkKCk6IGJvb2xlYW4ge1xuICByZXR1cm4gcmVhZFN0YXRlKCkuY29kZXhQbHVzUGx1cz8uc2FmZU1vZGUgPT09IHRydWU7XG59XG5leHBvcnQgZnVuY3Rpb24gaXNUd2Vha0VuYWJsZWQoaWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBjb25zdCBzID0gcmVhZFN0YXRlKCk7XG4gIGlmIChzLmNvZGV4UGx1c1BsdXM/LnNhZmVNb2RlID09PSB0cnVlKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiBzLnR3ZWFrcz8uW2lkXT8uZW5hYmxlZCAhPT0gZmFsc2U7XG59XG5leHBvcnQgZnVuY3Rpb24gc2V0VHdlYWtFbmFibGVkKGlkOiBzdHJpbmcsIGVuYWJsZWQ6IGJvb2xlYW4pOiB2b2lkIHtcbiAgY29uc3QgcyA9IHJlYWRTdGF0ZSgpO1xuICBzLnR3ZWFrcyA/Pz0ge307XG4gIHMudHdlYWtzW2lkXSA9IHsgLi4ucy50d2Vha3NbaWRdLCBlbmFibGVkIH07XG4gIHdyaXRlU3RhdGUocyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5zdGFsbGVyU3RhdGUge1xuICBhcHBSb290OiBzdHJpbmc7XG4gIGNvZGV4VmVyc2lvbjogc3RyaW5nIHwgbnVsbDtcbiAgc291cmNlUm9vdD86IHN0cmluZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRJbnN0YWxsZXJTdGF0ZSgpOiBJbnN0YWxsZXJTdGF0ZSB8IG51bGwge1xuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhJTlNUQUxMRVJfU1RBVEVfRklMRSwgXCJ1dGY4XCIpKSBhcyBJbnN0YWxsZXJTdGF0ZTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRTZWxmVXBkYXRlU3RhdGUoKTogU2VsZlVwZGF0ZVN0YXRlIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKFNFTEZfVVBEQVRFX1NUQVRFX0ZJTEUsIFwidXRmOFwiKSkgYXMgU2VsZlVwZGF0ZVN0YXRlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlU2VsZlVwZGF0ZVN0YXRlKHN0YXRlOiBTZWxmVXBkYXRlU3RhdGUpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICB3cml0ZUZpbGVTeW5jKFNFTEZfVVBEQVRFX1NUQVRFX0ZJTEUsIEpTT04uc3RyaW5naWZ5KHN0YXRlLCBudWxsLCAyKSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2coXCJ3YXJuXCIsIFwid3JpdGVTZWxmVXBkYXRlU3RhdGUgZmFpbGVkOlwiLCBTdHJpbmcoKGUgYXMgRXJyb3IpLm1lc3NhZ2UpKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xlYW5PcHRpb25hbFN0cmluZyh2YWx1ZTogdW5rbm93bik6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09IFwic3RyaW5nXCIpIHJldHVybiB1bmRlZmluZWQ7XG4gIGNvbnN0IHRyaW1tZWQgPSB2YWx1ZS50cmltKCk7XG4gIHJldHVybiB0cmltbWVkID8gdHJpbW1lZCA6IHVuZGVmaW5lZDtcbn1cbiIsICJpbXBvcnQgeyBjcFN5bmMsIGV4aXN0c1N5bmMsIG1rZGlyU3luYywgbWtkdGVtcFN5bmMsIHJlYWRkaXJTeW5jLCByZWFkRmlsZVN5bmMsIHJtU3luYywgc3RhdFN5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tIFwibm9kZTpmc1wiO1xuaW1wb3J0IHsgc3Bhd25TeW5jIH0gZnJvbSBcIm5vZGU6Y2hpbGRfcHJvY2Vzc1wiO1xuaW1wb3J0IHsgY3JlYXRlSGFzaCB9IGZyb20gXCJub2RlOmNyeXB0b1wiO1xuaW1wb3J0IHsgam9pbiwgcmVsYXRpdmUgfSBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgeyB0bXBkaXIgfSBmcm9tIFwibm9kZTpvc1wiO1xuaW1wb3J0IHR5cGUgeyBUd2Vha01hbmlmZXN0IH0gZnJvbSBcIkBjb2RleC1wbHVzcGx1cy9zZGtcIjtcbmltcG9ydCB7IGFzc2VydFN0b3JlSW5kZXhNYXRjaGVzUGluIH0gZnJvbSBcIi4vdHdlYWstc3RvcmUtaW50ZWdyaXR5XCI7XG5pbXBvcnQge1xuICBub3JtYWxpemVHaXRIdWJSZXBvLFxuICBub3JtYWxpemVTdG9yZVJlZ2lzdHJ5LFxuICBzdG9yZUFyY2hpdmVVcmwsXG4gIHR5cGUgVHdlYWtTdG9yZVB1Ymxpc2hTdWJtaXNzaW9uLFxuICB0eXBlIFR3ZWFrU3RvcmVFbnRyeSxcbiAgdHlwZSBUd2Vha1N0b3JlUmVnaXN0cnksXG4gIHR5cGUgVHdlYWtTdG9yZVBsYXRmb3JtLFxufSBmcm9tIFwiLi90d2Vhay1zdG9yZVwiO1xuaW1wb3J0IHtcbiAgQ09ERVhfUExVU1BMVVNfVkVSU0lPTixcbiAgVFdFQUtfU1RPUkVfSU5ERVhfVVJMLFxuICBUV0VBS1NfRElSLFxuICBsb2csXG4gIHJ1bnRpbWVEaXIsXG59IGZyb20gXCIuL3J1bnRpbWUtcGF0aHNcIjtcblxuZXhwb3J0IGNvbnN0IFZFUlNJT05fUkUgPSAvXnY/KFxcZCspXFwuKFxcZCspXFwuKFxcZCspKD86Wy0rXS4qKT8kLztcblxuZXhwb3J0IGludGVyZmFjZSBUd2Vha1N0b3JlRmV0Y2hSZXN1bHQge1xuICByZWdpc3RyeTogVHdlYWtTdG9yZVJlZ2lzdHJ5O1xuICBmZXRjaGVkQXQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTdG9yZUluc3RhbGxNZXRhZGF0YSB7XG4gIHJlcG86IHN0cmluZztcbiAgYXBwcm92ZWRDb21taXRTaGE6IHN0cmluZztcbiAgaW5zdGFsbGVkQXQ6IHN0cmluZztcbiAgc3RvcmVJbmRleFVybDogc3RyaW5nO1xuICBmaWxlcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3RvcmVFbnRyeVBsYXRmb3JtQ29tcGF0aWJpbGl0eSB7XG4gIGN1cnJlbnQ6IE5vZGVKUy5QbGF0Zm9ybTtcbiAgc3VwcG9ydGVkOiBUd2Vha1N0b3JlUGxhdGZvcm1bXSB8IG51bGw7XG4gIGNvbXBhdGlibGU6IGJvb2xlYW47XG4gIHJlYXNvbjogc3RyaW5nIHwgbnVsbDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTdG9yZUVudHJ5UnVudGltZUNvbXBhdGliaWxpdHkge1xuICBjdXJyZW50OiBzdHJpbmc7XG4gIHJlcXVpcmVkOiBzdHJpbmcgfCBudWxsO1xuICBjb21wYXRpYmxlOiBib29sZWFuO1xuICByZWFzb246IHN0cmluZyB8IG51bGw7XG59XG5cbmV4cG9ydCBjbGFzcyBTdG9yZVR3ZWFrTW9kaWZpZWRFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IodHdlYWtOYW1lOiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIGAke3R3ZWFrTmFtZX0gaGFzIGxvY2FsIHNvdXJjZSBjaGFuZ2VzLCBzbyBDb2RleCsrIGNhbid0IGF1dG8tdXBkYXRlIGl0LiBSZXZlcnQgeW91ciBsb2NhbCBjaGFuZ2VzIG9yIHJlaW5zdGFsbCB0aGUgdHdlYWsgbWFudWFsbHkuYCxcbiAgICApO1xuICAgIHRoaXMubmFtZSA9IFwiU3RvcmVUd2Vha01vZGlmaWVkRXJyb3JcIjtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RvcmVFbnRyeVBsYXRmb3JtQ29tcGF0aWJpbGl0eShlbnRyeTogVHdlYWtTdG9yZUVudHJ5KTogU3RvcmVFbnRyeVBsYXRmb3JtQ29tcGF0aWJpbGl0eSB7XG4gIGNvbnN0IHN1cHBvcnRlZCA9IGVudHJ5LnBsYXRmb3JtcyA/PyBudWxsO1xuICBjb25zdCBjb21wYXRpYmxlID0gIXN1cHBvcnRlZCB8fCBzdXBwb3J0ZWQuaW5jbHVkZXMocHJvY2Vzcy5wbGF0Zm9ybSBhcyBUd2Vha1N0b3JlUGxhdGZvcm0pO1xuICByZXR1cm4ge1xuICAgIGN1cnJlbnQ6IHByb2Nlc3MucGxhdGZvcm0sXG4gICAgc3VwcG9ydGVkLFxuICAgIGNvbXBhdGlibGUsXG4gICAgcmVhc29uOiBjb21wYXRpYmxlID8gbnVsbCA6IGAke2VudHJ5Lm1hbmlmZXN0Lm5hbWV9IGlzIG9ubHkgYXZhaWxhYmxlIG9uICR7Zm9ybWF0U3RvcmVQbGF0Zm9ybXMoc3VwcG9ydGVkKX0uYCxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGlibGUoZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSk6IHZvaWQge1xuICBjb25zdCBwbGF0Zm9ybSA9IHN0b3JlRW50cnlQbGF0Zm9ybUNvbXBhdGliaWxpdHkoZW50cnkpO1xuICBpZiAoIXBsYXRmb3JtLmNvbXBhdGlibGUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IocGxhdGZvcm0ucmVhc29uID8/IGAke2VudHJ5Lm1hbmlmZXN0Lm5hbWV9IGlzIG5vdCBhdmFpbGFibGUgb24gdGhpcyBwbGF0Zm9ybS5gKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RvcmVFbnRyeVJ1bnRpbWVDb21wYXRpYmlsaXR5KGVudHJ5OiBUd2Vha1N0b3JlRW50cnkpOiBTdG9yZUVudHJ5UnVudGltZUNvbXBhdGliaWxpdHkge1xuICBjb25zdCByZXF1aXJlZCA9IGNsZWFuTWluUnVudGltZShlbnRyeS5tYW5pZmVzdC5taW5SdW50aW1lKTtcbiAgY29uc3QgY29tcGF0aWJsZSA9ICFyZXF1aXJlZCB8fCBjb21wYXJlVmVyc2lvbnMoQ09ERVhfUExVU1BMVVNfVkVSU0lPTiwgcmVxdWlyZWQpID49IDA7XG4gIHJldHVybiB7XG4gICAgY3VycmVudDogQ09ERVhfUExVU1BMVVNfVkVSU0lPTixcbiAgICByZXF1aXJlZCxcbiAgICBjb21wYXRpYmxlLFxuICAgIHJlYXNvbjogY29tcGF0aWJsZSB8fCAhcmVxdWlyZWRcbiAgICAgID8gbnVsbFxuICAgICAgOiBgJHtlbnRyeS5tYW5pZmVzdC5uYW1lfSByZXF1aXJlcyBDb2RleCsrICR7cmVxdWlyZWR9IG9yIG5ld2VyLmAsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRTdG9yZUVudHJ5UnVudGltZUNvbXBhdGlibGUoZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSk6IHZvaWQge1xuICBjb25zdCBydW50aW1lID0gc3RvcmVFbnRyeVJ1bnRpbWVDb21wYXRpYmlsaXR5KGVudHJ5KTtcbiAgaWYgKCFydW50aW1lLmNvbXBhdGlibGUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IocnVudGltZS5yZWFzb24gPz8gYCR7ZW50cnkubWFuaWZlc3QubmFtZX0gcmVxdWlyZXMgYSBuZXdlciBDb2RleCsrIHJ1bnRpbWUuYCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFuTWluUnVudGltZSh2YWx1ZTogdW5rbm93bik6IHN0cmluZyB8IG51bGwge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgdmVyc2lvbiA9IG5vcm1hbGl6ZVZlcnNpb24odmFsdWUucmVwbGFjZSgvXj49P1xccyovLCBcIlwiKSk7XG4gIHJldHVybiBWRVJTSU9OX1JFLnRlc3QodmVyc2lvbikgPyB2ZXJzaW9uIDogbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdFN0b3JlUGxhdGZvcm1zKHBsYXRmb3JtczogVHdlYWtTdG9yZVBsYXRmb3JtW10gfCBudWxsKTogc3RyaW5nIHtcbiAgaWYgKCFwbGF0Zm9ybXMgfHwgcGxhdGZvcm1zLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFwic3VwcG9ydGVkIHBsYXRmb3Jtc1wiO1xuICByZXR1cm4gcGxhdGZvcm1zLm1hcCgocGxhdGZvcm0pID0+IHtcbiAgICBpZiAocGxhdGZvcm0gPT09IFwiZGFyd2luXCIpIHJldHVybiBcIm1hY09TXCI7XG4gICAgaWYgKHBsYXRmb3JtID09PSBcIndpbjMyXCIpIHJldHVybiBcIldpbmRvd3NcIjtcbiAgICByZXR1cm4gXCJMaW51eFwiO1xuICB9KS5qb2luKFwiLCBcIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkQnVuZGxlZFN0b3JlUmVnaXN0cnkoKTogVHdlYWtTdG9yZVJlZ2lzdHJ5IHwgbnVsbCB7XG4gIGNvbnN0IGJ1bmRsZWQgPSBqb2luKHJ1bnRpbWVEaXIhLCBcInN0b3JlLWluZGV4Lmpzb25cIik7XG4gIGlmICghZXhpc3RzU3luYyhidW5kbGVkKSkgcmV0dXJuIG51bGw7XG4gIHRyeSB7XG4gICAgY29uc3QgYm9keSA9IHJlYWRGaWxlU3luYyhidW5kbGVkKTtcbiAgICBpZiAoIXByb2Nlc3MuZW52LkNPREVYX1BMVVNQTFVTX0FMTE9XX1NUT1JFX0lOREVYX09WRVJSSURFKSB7XG4gICAgICBhc3NlcnRTdG9yZUluZGV4TWF0Y2hlc1Bpbihib2R5KTtcbiAgICB9XG4gICAgcmV0dXJuIG5vcm1hbGl6ZVN0b3JlUmVnaXN0cnkoSlNPTi5wYXJzZShib2R5LnRvU3RyaW5nKFwidXRmOFwiKSkpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nKFwid2FyblwiLCBcImJ1bmRsZWQgc3RvcmUgaW5kZXggcmVqZWN0ZWQ6XCIsIFN0cmluZygoZSBhcyBFcnJvcikubWVzc2FnZSkpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaFR3ZWFrU3RvcmVSZWdpc3RyeSgpOiBQcm9taXNlPFR3ZWFrU3RvcmVGZXRjaFJlc3VsdD4ge1xuICBjb25zdCBmZXRjaGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gIGNvbnN0IGFsbG93T3ZlcnJpZGUgPSBwcm9jZXNzLmVudi5DT0RFWF9QTFVTUExVU19BTExPV19TVE9SRV9JTkRFWF9PVkVSUklERSA9PT0gXCIxXCI7XG4gIHRyeSB7XG4gICAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgICBjb25zdCB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiBjb250cm9sbGVyLmFib3J0KCksIDgwMDApO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaChUV0VBS19TVE9SRV9JTkRFWF9VUkwsIHtcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIFwiQWNjZXB0XCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICAgIFwiVXNlci1BZ2VudFwiOiBgY29kZXgtcGx1c3BsdXMvJHtDT0RFWF9QTFVTUExVU19WRVJTSU9OfWAsXG4gICAgICAgIH0sXG4gICAgICAgIHNpZ25hbDogY29udHJvbGxlci5zaWduYWwsXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzLm9rKSB0aHJvdyBuZXcgRXJyb3IoYHN0b3JlIHJldHVybmVkICR7cmVzLnN0YXR1c31gKTtcbiAgICAgIGNvbnN0IGJvZHkgPSBCdWZmZXIuZnJvbShhd2FpdCByZXMuYXJyYXlCdWZmZXIoKSk7XG4gICAgICBpZiAoIWFsbG93T3ZlcnJpZGUpIGFzc2VydFN0b3JlSW5kZXhNYXRjaGVzUGluKGJvZHkpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVnaXN0cnk6IG5vcm1hbGl6ZVN0b3JlUmVnaXN0cnkoSlNPTi5wYXJzZShib2R5LnRvU3RyaW5nKFwidXRmOFwiKSkpLFxuICAgICAgICBmZXRjaGVkQXQsXG4gICAgICB9O1xuICAgIH0gZmluYWxseSB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc3QgZXJyb3IgPSBlIGluc3RhbmNlb2YgRXJyb3IgPyBlIDogbmV3IEVycm9yKFN0cmluZyhlKSk7XG4gICAgY29uc3QgYnVuZGxlZCA9IHJlYWRCdW5kbGVkU3RvcmVSZWdpc3RyeSgpO1xuICAgIGlmIChidW5kbGVkKSB7XG4gICAgICBsb2coXCJ3YXJuXCIsIFwidXNpbmcgYnVuZGxlZCBzdG9yZSBpbmRleCBwaW46XCIsIGVycm9yLm1lc3NhZ2UpO1xuICAgICAgcmV0dXJuIHsgcmVnaXN0cnk6IGJ1bmRsZWQsIGZldGNoZWRBdCB9O1xuICAgIH1cbiAgICBsb2coXCJ3YXJuXCIsIFwiZmFpbGVkIHRvIGZldGNoIHR3ZWFrIHN0b3JlIHJlZ2lzdHJ5OlwiLCBlcnJvci5tZXNzYWdlKTtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5zdGFsbFN0b3JlVHdlYWsoZW50cnk6IFR3ZWFrU3RvcmVFbnRyeSk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB1cmwgPSBzdG9yZUFyY2hpdmVVcmwoZW50cnkpO1xuICBjb25zdCB3b3JrID0gbWtkdGVtcFN5bmMoam9pbih0bXBkaXIoKSwgXCJjb2RleHBwLXN0b3JlLXR3ZWFrLVwiKSk7XG4gIGNvbnN0IGFyY2hpdmUgPSBqb2luKHdvcmssIFwic291cmNlLnRhci5nelwiKTtcbiAgY29uc3QgZXh0cmFjdERpciA9IGpvaW4od29yaywgXCJleHRyYWN0XCIpO1xuICBjb25zdCB0YXJnZXQgPSBqb2luKFRXRUFLU19ESVIsIGVudHJ5LmlkKTtcbiAgY29uc3Qgc3RhZ2VkVGFyZ2V0ID0gam9pbih3b3JrLCBcInN0YWdlZFwiLCBlbnRyeS5pZCk7XG5cbiAgdHJ5IHtcbiAgICBsb2coXCJpbmZvXCIsIGBpbnN0YWxsaW5nIHN0b3JlIHR3ZWFrICR7ZW50cnkuaWR9IGZyb20gJHtlbnRyeS5yZXBvfUAke2VudHJ5LmFwcHJvdmVkQ29tbWl0U2hhfWApO1xuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgaGVhZGVyczogeyBcIlVzZXItQWdlbnRcIjogYGNvZGV4LXBsdXNwbHVzLyR7Q09ERVhfUExVU1BMVVNfVkVSU0lPTn1gIH0sXG4gICAgICByZWRpcmVjdDogXCJmb2xsb3dcIixcbiAgICB9KTtcbiAgICBpZiAoIXJlcy5vaykgdGhyb3cgbmV3IEVycm9yKGBkb3dubG9hZCBmYWlsZWQ6ICR7cmVzLnN0YXR1c31gKTtcbiAgICBjb25zdCBieXRlcyA9IEJ1ZmZlci5mcm9tKGF3YWl0IHJlcy5hcnJheUJ1ZmZlcigpKTtcbiAgICB3cml0ZUZpbGVTeW5jKGFyY2hpdmUsIGJ5dGVzKTtcbiAgICBta2RpclN5bmMoZXh0cmFjdERpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgZXh0cmFjdFRhckFyY2hpdmUoYXJjaGl2ZSwgZXh0cmFjdERpcik7XG4gICAgY29uc3Qgc291cmNlID0gZmluZFR3ZWFrUm9vdChleHRyYWN0RGlyKTtcbiAgICBpZiAoIXNvdXJjZSkgdGhyb3cgbmV3IEVycm9yKFwiZG93bmxvYWRlZCBhcmNoaXZlIGRpZCBub3QgY29udGFpbiBtYW5pZmVzdC5qc29uXCIpO1xuICAgIHZhbGlkYXRlU3RvcmVUd2Vha1NvdXJjZShlbnRyeSwgc291cmNlKTtcbiAgICBybVN5bmMoc3RhZ2VkVGFyZ2V0LCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgZm9yY2U6IHRydWUgfSk7XG4gICAgY29weVR3ZWFrU291cmNlKHNvdXJjZSwgc3RhZ2VkVGFyZ2V0KTtcbiAgICBjb25zdCBzdGFnZWRGaWxlcyA9IGhhc2hUd2Vha1NvdXJjZShzdGFnZWRUYXJnZXQpO1xuICAgIHdyaXRlRmlsZVN5bmMoXG4gICAgICBqb2luKHN0YWdlZFRhcmdldCwgXCIuY29kZXhwcC1zdG9yZS5qc29uXCIpLFxuICAgICAgSlNPTi5zdHJpbmdpZnkoXG4gICAgICAgIHtcbiAgICAgICAgICByZXBvOiBlbnRyeS5yZXBvLFxuICAgICAgICAgIGFwcHJvdmVkQ29tbWl0U2hhOiBlbnRyeS5hcHByb3ZlZENvbW1pdFNoYSxcbiAgICAgICAgICBpbnN0YWxsZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgIHN0b3JlSW5kZXhVcmw6IFRXRUFLX1NUT1JFX0lOREVYX1VSTCxcbiAgICAgICAgICBmaWxlczogc3RhZ2VkRmlsZXMsXG4gICAgICAgIH0sXG4gICAgICAgIG51bGwsXG4gICAgICAgIDIsXG4gICAgICApLFxuICAgICk7XG4gICAgYXdhaXQgYXNzZXJ0U3RvcmVUd2Vha0NsZWFuRm9yQXV0b1VwZGF0ZShlbnRyeSwgdGFyZ2V0LCB3b3JrKTtcbiAgICBybVN5bmModGFyZ2V0LCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgZm9yY2U6IHRydWUgfSk7XG4gICAgY3BTeW5jKHN0YWdlZFRhcmdldCwgdGFyZ2V0LCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgfSBmaW5hbGx5IHtcbiAgICBybVN5bmMod29yaywgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwcmVwYXJlVHdlYWtTdG9yZVN1Ym1pc3Npb24ocmVwb0lucHV0OiBzdHJpbmcpOiBQcm9taXNlPFR3ZWFrU3RvcmVQdWJsaXNoU3VibWlzc2lvbj4ge1xuICBjb25zdCByZXBvID0gbm9ybWFsaXplR2l0SHViUmVwbyhyZXBvSW5wdXQpO1xuICBjb25zdCByZXBvSW5mbyA9IGF3YWl0IGZldGNoR2l0aHViSnNvbjx7IGRlZmF1bHRfYnJhbmNoPzogc3RyaW5nIH0+KGBodHRwczovL2FwaS5naXRodWIuY29tL3JlcG9zLyR7cmVwb31gKTtcbiAgY29uc3QgZGVmYXVsdEJyYW5jaCA9IHJlcG9JbmZvLmRlZmF1bHRfYnJhbmNoO1xuICBpZiAoIWRlZmF1bHRCcmFuY2gpIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlc29sdmUgZGVmYXVsdCBicmFuY2ggZm9yICR7cmVwb31gKTtcblxuICBjb25zdCBjb21taXQgPSBhd2FpdCBmZXRjaEdpdGh1Ykpzb248e1xuICAgIHNoYT86IHN0cmluZztcbiAgICBodG1sX3VybD86IHN0cmluZztcbiAgfT4oYGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvJHtyZXBvfS9jb21taXRzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGRlZmF1bHRCcmFuY2gpfWApO1xuICBpZiAoIWNvbW1pdC5zaGEpIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlc29sdmUgY3VycmVudCBjb21taXQgZm9yICR7cmVwb31gKTtcblxuICBjb25zdCBtYW5pZmVzdCA9IGF3YWl0IGZldGNoTWFuaWZlc3RBdENvbW1pdChyZXBvLCBjb21taXQuc2hhKS5jYXRjaCgoZSkgPT4ge1xuICAgIGxvZyhcIndhcm5cIiwgYGNvdWxkIG5vdCByZWFkIG1hbmlmZXN0IGZvciBzdG9yZSBzdWJtaXNzaW9uICR7cmVwb31AJHtjb21taXQuc2hhfTpgLCBlKTtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9KTtcblxuICByZXR1cm4ge1xuICAgIHJlcG8sXG4gICAgZGVmYXVsdEJyYW5jaCxcbiAgICBjb21taXRTaGE6IGNvbW1pdC5zaGEsXG4gICAgY29tbWl0VXJsOiBjb21taXQuaHRtbF91cmwgPz8gYGh0dHBzOi8vZ2l0aHViLmNvbS8ke3JlcG99L2NvbW1pdC8ke2NvbW1pdC5zaGF9YCxcbiAgICBtYW5pZmVzdDogbWFuaWZlc3RcbiAgICAgID8ge1xuICAgICAgICAgIGlkOiB0eXBlb2YgbWFuaWZlc3QuaWQgPT09IFwic3RyaW5nXCIgPyBtYW5pZmVzdC5pZCA6IHVuZGVmaW5lZCxcbiAgICAgICAgICBuYW1lOiB0eXBlb2YgbWFuaWZlc3QubmFtZSA9PT0gXCJzdHJpbmdcIiA/IG1hbmlmZXN0Lm5hbWUgOiB1bmRlZmluZWQsXG4gICAgICAgICAgdmVyc2lvbjogdHlwZW9mIG1hbmlmZXN0LnZlcnNpb24gPT09IFwic3RyaW5nXCIgPyBtYW5pZmVzdC52ZXJzaW9uIDogdW5kZWZpbmVkLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiB0eXBlb2YgbWFuaWZlc3QuZGVzY3JpcHRpb24gPT09IFwic3RyaW5nXCIgPyBtYW5pZmVzdC5kZXNjcmlwdGlvbiA6IHVuZGVmaW5lZCxcbiAgICAgICAgICBpY29uVXJsOiB0eXBlb2YgbWFuaWZlc3QuaWNvblVybCA9PT0gXCJzdHJpbmdcIiA/IG1hbmlmZXN0Lmljb25VcmwgOiB1bmRlZmluZWQsXG4gICAgICAgIH1cbiAgICAgIDogdW5kZWZpbmVkLFxuICB9O1xufVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaEdpdGh1Ykpzb248VD4odXJsOiBzdHJpbmcpOiBQcm9taXNlPFQ+IHtcbiAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgY29uc3QgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4gY29udHJvbGxlci5hYm9ydCgpLCA4MDAwKTtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJBY2NlcHRcIjogXCJhcHBsaWNhdGlvbi92bmQuZ2l0aHViK2pzb25cIixcbiAgICAgICAgXCJVc2VyLUFnZW50XCI6IGBjb2RleC1wbHVzcGx1cy8ke0NPREVYX1BMVVNQTFVTX1ZFUlNJT059YCxcbiAgICAgIH0sXG4gICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLFxuICAgIH0pO1xuICAgIGlmICghcmVzLm9rKSB0aHJvdyBuZXcgRXJyb3IoYEdpdEh1YiByZXR1cm5lZCAke3Jlcy5zdGF0dXN9YCk7XG4gICAgcmV0dXJuIGF3YWl0IHJlcy5qc29uKCkgYXMgVDtcbiAgfSBmaW5hbGx5IHtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hNYW5pZmVzdEF0Q29tbWl0KHJlcG86IHN0cmluZywgY29tbWl0U2hhOiBzdHJpbmcpOiBQcm9taXNlPFBhcnRpYWw8VHdlYWtNYW5pZmVzdD4+IHtcbiAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goYGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS8ke3JlcG99LyR7Y29tbWl0U2hhfS9tYW5pZmVzdC5qc29uYCwge1xuICAgIGhlYWRlcnM6IHtcbiAgICAgIFwiQWNjZXB0XCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgXCJVc2VyLUFnZW50XCI6IGBjb2RleC1wbHVzcGx1cy8ke0NPREVYX1BMVVNQTFVTX1ZFUlNJT059YCxcbiAgICB9LFxuICB9KTtcbiAgaWYgKCFyZXMub2spIHRocm93IG5ldyBFcnJvcihgbWFuaWZlc3QgZmV0Y2ggcmV0dXJuZWQgJHtyZXMuc3RhdHVzfWApO1xuICByZXR1cm4gYXdhaXQgcmVzLmpzb24oKSBhcyBQYXJ0aWFsPFR3ZWFrTWFuaWZlc3Q+O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdFRhckFyY2hpdmUoYXJjaGl2ZTogc3RyaW5nLCB0YXJnZXREaXI6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCByZXN1bHQgPSBzcGF3blN5bmMoXCJ0YXJcIiwgW1wiLXh6ZlwiLCBhcmNoaXZlLCBcIi1DXCIsIHRhcmdldERpcl0sIHtcbiAgICBlbmNvZGluZzogXCJ1dGY4XCIsXG4gICAgc3RkaW86IFtcImlnbm9yZVwiLCBcInBpcGVcIiwgXCJwaXBlXCJdLFxuICB9KTtcbiAgaWYgKHJlc3VsdC5zdGF0dXMgIT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYHRhciBleHRyYWN0aW9uIGZhaWxlZDogJHtyZXN1bHQuc3RkZXJyIHx8IHJlc3VsdC5zdGRvdXQgfHwgcmVzdWx0LnN0YXR1c31gKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVTdG9yZVR3ZWFrU291cmNlKGVudHJ5OiBUd2Vha1N0b3JlRW50cnksIHNvdXJjZTogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IG1hbmlmZXN0UGF0aCA9IGpvaW4oc291cmNlLCBcIm1hbmlmZXN0Lmpzb25cIik7XG4gIGNvbnN0IG1hbmlmZXN0ID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMobWFuaWZlc3RQYXRoLCBcInV0ZjhcIikpIGFzIFR3ZWFrTWFuaWZlc3Q7XG4gIGlmIChtYW5pZmVzdC5pZCAhPT0gZW50cnkubWFuaWZlc3QuaWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGRvd25sb2FkZWQgdHdlYWsgaWQgJHttYW5pZmVzdC5pZH0gZG9lcyBub3QgbWF0Y2ggYXBwcm92ZWQgaWQgJHtlbnRyeS5tYW5pZmVzdC5pZH1gKTtcbiAgfVxuICBpZiAobWFuaWZlc3QuZ2l0aHViUmVwbyAhPT0gZW50cnkucmVwbykge1xuICAgIHRocm93IG5ldyBFcnJvcihgZG93bmxvYWRlZCB0d2VhayByZXBvICR7bWFuaWZlc3QuZ2l0aHViUmVwb30gZG9lcyBub3QgbWF0Y2ggYXBwcm92ZWQgcmVwbyAke2VudHJ5LnJlcG99YCk7XG4gIH1cbiAgaWYgKG1hbmlmZXN0LnZlcnNpb24gIT09IGVudHJ5Lm1hbmlmZXN0LnZlcnNpb24pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGRvd25sb2FkZWQgdHdlYWsgdmVyc2lvbiAke21hbmlmZXN0LnZlcnNpb259IGRvZXMgbm90IG1hdGNoIGFwcHJvdmVkIHZlcnNpb24gJHtlbnRyeS5tYW5pZmVzdC52ZXJzaW9ufWApO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kVHdlYWtSb290KGRpcjogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGlmICghZXhpc3RzU3luYyhkaXIpKSByZXR1cm4gbnVsbDtcbiAgaWYgKGV4aXN0c1N5bmMoam9pbihkaXIsIFwibWFuaWZlc3QuanNvblwiKSkpIHJldHVybiBkaXI7XG4gIGZvciAoY29uc3QgbmFtZSBvZiByZWFkZGlyU3luYyhkaXIpKSB7XG4gICAgY29uc3QgY2hpbGQgPSBqb2luKGRpciwgbmFtZSk7XG4gICAgdHJ5IHtcbiAgICAgIGlmICghc3RhdFN5bmMoY2hpbGQpLmlzRGlyZWN0b3J5KCkpIGNvbnRpbnVlO1xuICAgIH0gY2F0Y2gge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IGZvdW5kID0gZmluZFR3ZWFrUm9vdChjaGlsZCk7XG4gICAgaWYgKGZvdW5kKSByZXR1cm4gZm91bmQ7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb3B5VHdlYWtTb3VyY2Uoc291cmNlOiBzdHJpbmcsIHRhcmdldDogc3RyaW5nKTogdm9pZCB7XG4gIGNwU3luYyhzb3VyY2UsIHRhcmdldCwge1xuICAgIHJlY3Vyc2l2ZTogdHJ1ZSxcbiAgICBmaWx0ZXI6IChzcmMpID0+ICEvKF58Wy9cXFxcXSkoPzpcXC5naXR8bm9kZV9tb2R1bGVzKSg/OlsvXFxcXF18JCkvLnRlc3Qoc3JjKSxcbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGFzc2VydFN0b3JlVHdlYWtDbGVhbkZvckF1dG9VcGRhdGUoXG4gIGVudHJ5OiBUd2Vha1N0b3JlRW50cnksXG4gIHRhcmdldDogc3RyaW5nLFxuICB3b3JrOiBzdHJpbmcsXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKCFleGlzdHNTeW5jKHRhcmdldCkpIHJldHVybjtcbiAgY29uc3QgbWV0YWRhdGEgPSByZWFkU3RvcmVJbnN0YWxsTWV0YWRhdGEodGFyZ2V0KTtcbiAgaWYgKCFtZXRhZGF0YSkgcmV0dXJuO1xuICBpZiAobWV0YWRhdGEucmVwbyAhPT0gZW50cnkucmVwbykge1xuICAgIHRocm93IG5ldyBTdG9yZVR3ZWFrTW9kaWZpZWRFcnJvcihlbnRyeS5tYW5pZmVzdC5uYW1lKTtcbiAgfVxuICBjb25zdCBjdXJyZW50RmlsZXMgPSBoYXNoVHdlYWtTb3VyY2UodGFyZ2V0KTtcbiAgY29uc3QgYmFzZWxpbmVGaWxlcyA9IG1ldGFkYXRhLmZpbGVzID8/IGF3YWl0IGZldGNoQmFzZWxpbmVTdG9yZVR3ZWFrSGFzaGVzKG1ldGFkYXRhLCB3b3JrKTtcbiAgaWYgKCFzYW1lRmlsZUhhc2hlcyhjdXJyZW50RmlsZXMsIGJhc2VsaW5lRmlsZXMpKSB7XG4gICAgdGhyb3cgbmV3IFN0b3JlVHdlYWtNb2RpZmllZEVycm9yKGVudHJ5Lm1hbmlmZXN0Lm5hbWUpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkU3RvcmVJbnN0YWxsTWV0YWRhdGEodGFyZ2V0OiBzdHJpbmcpOiBTdG9yZUluc3RhbGxNZXRhZGF0YSB8IG51bGwge1xuICBjb25zdCBtZXRhZGF0YVBhdGggPSBqb2luKHRhcmdldCwgXCIuY29kZXhwcC1zdG9yZS5qc29uXCIpO1xuICBpZiAoIWV4aXN0c1N5bmMobWV0YWRhdGFQYXRoKSkgcmV0dXJuIG51bGw7XG4gIHRyeSB7XG4gICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMobWV0YWRhdGFQYXRoLCBcInV0ZjhcIikpIGFzIFBhcnRpYWw8U3RvcmVJbnN0YWxsTWV0YWRhdGE+O1xuICAgIGlmICh0eXBlb2YgcGFyc2VkLnJlcG8gIT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIHBhcnNlZC5hcHByb3ZlZENvbW1pdFNoYSAhPT0gXCJzdHJpbmdcIikgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlcG86IHBhcnNlZC5yZXBvLFxuICAgICAgYXBwcm92ZWRDb21taXRTaGE6IHBhcnNlZC5hcHByb3ZlZENvbW1pdFNoYSxcbiAgICAgIGluc3RhbGxlZEF0OiB0eXBlb2YgcGFyc2VkLmluc3RhbGxlZEF0ID09PSBcInN0cmluZ1wiID8gcGFyc2VkLmluc3RhbGxlZEF0IDogXCJcIixcbiAgICAgIHN0b3JlSW5kZXhVcmw6IHR5cGVvZiBwYXJzZWQuc3RvcmVJbmRleFVybCA9PT0gXCJzdHJpbmdcIiA/IHBhcnNlZC5zdG9yZUluZGV4VXJsIDogXCJcIixcbiAgICAgIGZpbGVzOiBpc0hhc2hSZWNvcmQocGFyc2VkLmZpbGVzKSA/IHBhcnNlZC5maWxlcyA6IHVuZGVmaW5lZCxcbiAgICB9O1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaEJhc2VsaW5lU3RvcmVUd2Vha0hhc2hlcyhcbiAgbWV0YWRhdGE6IFN0b3JlSW5zdGFsbE1ldGFkYXRhLFxuICB3b3JrOiBzdHJpbmcsXG4pOiBQcm9taXNlPFJlY29yZDxzdHJpbmcsIHN0cmluZz4+IHtcbiAgY29uc3QgYmFzZWxpbmVEaXIgPSBqb2luKHdvcmssIFwiYmFzZWxpbmVcIik7XG4gIGNvbnN0IGFyY2hpdmUgPSBqb2luKHdvcmssIFwiYmFzZWxpbmUudGFyLmd6XCIpO1xuICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaChgaHR0cHM6Ly9jb2RlbG9hZC5naXRodWIuY29tLyR7bWV0YWRhdGEucmVwb30vdGFyLmd6LyR7bWV0YWRhdGEuYXBwcm92ZWRDb21taXRTaGF9YCwge1xuICAgIGhlYWRlcnM6IHsgXCJVc2VyLUFnZW50XCI6IGBjb2RleC1wbHVzcGx1cy8ke0NPREVYX1BMVVNQTFVTX1ZFUlNJT059YCB9LFxuICAgIHJlZGlyZWN0OiBcImZvbGxvd1wiLFxuICB9KTtcbiAgaWYgKCFyZXMub2spIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHZlcmlmeSBsb2NhbCB0d2VhayBjaGFuZ2VzIGJlZm9yZSB1cGRhdGU6ICR7cmVzLnN0YXR1c31gKTtcbiAgd3JpdGVGaWxlU3luYyhhcmNoaXZlLCBCdWZmZXIuZnJvbShhd2FpdCByZXMuYXJyYXlCdWZmZXIoKSkpO1xuICBta2RpclN5bmMoYmFzZWxpbmVEaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICBleHRyYWN0VGFyQXJjaGl2ZShhcmNoaXZlLCBiYXNlbGluZURpcik7XG4gIGNvbnN0IHNvdXJjZSA9IGZpbmRUd2Vha1Jvb3QoYmFzZWxpbmVEaXIpO1xuICBpZiAoIXNvdXJjZSkgdGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IHZlcmlmeSBsb2NhbCB0d2VhayBjaGFuZ2VzIGJlZm9yZSB1cGRhdGU6IGJhc2VsaW5lIG1hbmlmZXN0IG1pc3NpbmdcIik7XG4gIHJldHVybiBoYXNoVHdlYWtTb3VyY2Uoc291cmNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc2hUd2Vha1NvdXJjZShyb290OiBzdHJpbmcpOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHtcbiAgY29uc3Qgb3V0OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gIGNvbGxlY3RUd2Vha0ZpbGVIYXNoZXMocm9vdCwgcm9vdCwgb3V0KTtcbiAgcmV0dXJuIG91dDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbGxlY3RUd2Vha0ZpbGVIYXNoZXMocm9vdDogc3RyaW5nLCBkaXI6IHN0cmluZywgb3V0OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KTogdm9pZCB7XG4gIGZvciAoY29uc3QgbmFtZSBvZiByZWFkZGlyU3luYyhkaXIpLnNvcnQoKSkge1xuICAgIGlmIChuYW1lID09PSBcIi5naXRcIiB8fCBuYW1lID09PSBcIm5vZGVfbW9kdWxlc1wiIHx8IG5hbWUgPT09IFwiLmNvZGV4cHAtc3RvcmUuanNvblwiKSBjb250aW51ZTtcbiAgICBjb25zdCBmdWxsID0gam9pbihkaXIsIG5hbWUpO1xuICAgIGNvbnN0IHJlbCA9IHJlbGF0aXZlKHJvb3QsIGZ1bGwpLnNwbGl0KFwiXFxcXFwiKS5qb2luKFwiL1wiKTtcbiAgICBjb25zdCBzdGF0ID0gc3RhdFN5bmMoZnVsbCk7XG4gICAgaWYgKHN0YXQuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgY29sbGVjdFR3ZWFrRmlsZUhhc2hlcyhyb290LCBmdWxsLCBvdXQpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmICghc3RhdC5pc0ZpbGUoKSkgY29udGludWU7XG4gICAgb3V0W3JlbF0gPSBjcmVhdGVIYXNoKFwic2hhMjU2XCIpLnVwZGF0ZShyZWFkRmlsZVN5bmMoZnVsbCkpLmRpZ2VzdChcImhleFwiKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2FtZUZpbGVIYXNoZXMoYTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiwgYjogUmVjb3JkPHN0cmluZywgc3RyaW5nPik6IGJvb2xlYW4ge1xuICBjb25zdCBhayA9IE9iamVjdC5rZXlzKGEpLnNvcnQoKTtcbiAgY29uc3QgYmsgPSBPYmplY3Qua2V5cyhiKS5zb3J0KCk7XG4gIGlmIChhay5sZW5ndGggIT09IGJrLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGFrLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3Qga2V5ID0gYWtbaV07XG4gICAgaWYgKGtleSAhPT0gYmtbaV0gfHwgYVtrZXldICE9PSBiW2tleV0pIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzSGFzaFJlY29yZCh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4ge1xuICBpZiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZSAhPT0gXCJvYmplY3RcIiB8fCBBcnJheS5pc0FycmF5KHZhbHVlKSkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gT2JqZWN0LnZhbHVlcyh2YWx1ZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikuZXZlcnkoKHYpID0+IHR5cGVvZiB2ID09PSBcInN0cmluZ1wiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVZlcnNpb24odjogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHYudHJpbSgpLnJlcGxhY2UoL152L2ksIFwiXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZVZlcnNpb25zKGE6IHN0cmluZywgYjogc3RyaW5nKTogbnVtYmVyIHtcbiAgY29uc3QgYXYgPSBWRVJTSU9OX1JFLmV4ZWMoYSk7XG4gIGNvbnN0IGJ2ID0gVkVSU0lPTl9SRS5leGVjKGIpO1xuICBpZiAoIWF2IHx8ICFidikgcmV0dXJuIDA7XG4gIGZvciAobGV0IGkgPSAxOyBpIDw9IDM7IGkrKykge1xuICAgIGNvbnN0IGRpZmYgPSBOdW1iZXIoYXZbaV0pIC0gTnVtYmVyKGJ2W2ldKTtcbiAgICBpZiAoZGlmZiAhPT0gMCkgcmV0dXJuIGRpZmY7XG4gIH1cbiAgcmV0dXJuIDA7XG59XG4iLCAiaW1wb3J0IHsgY3JlYXRlSGFzaCB9IGZyb20gXCJub2RlOmNyeXB0b1wiO1xuaW1wb3J0IHsgUElOTkVEX1RXRUFLX1NUT1JFX0lOREVYX1NIQTI1NiB9IGZyb20gXCIuL3R3ZWFrLXN0b3JlXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBoYXNoU3RvcmVJbmRleChib2R5OiBzdHJpbmcgfCBCdWZmZXIpOiBzdHJpbmcge1xuICByZXR1cm4gY3JlYXRlSGFzaChcInNoYTI1NlwiKS51cGRhdGUoYm9keSkuZGlnZXN0KFwiaGV4XCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0U3RvcmVJbmRleE1hdGNoZXNQaW4oXG4gIGJvZHk6IHN0cmluZyB8IEJ1ZmZlcixcbiAgZXhwZWN0ZWRTaGEyNTYgPSBQSU5ORURfVFdFQUtfU1RPUkVfSU5ERVhfU0hBMjU2LFxuKTogdm9pZCB7XG4gIGNvbnN0IGhhc2ggPSBoYXNoU3RvcmVJbmRleChib2R5KTtcbiAgaWYgKGhhc2ggIT09IGV4cGVjdGVkU2hhMjU2KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBTdG9yZSBpbmRleCBoYXNoICR7aGFzaH0gZG9lcyBub3QgbWF0Y2ggcnVudGltZSBwaW4gJHtleHBlY3RlZFNoYTI1Nn1gKTtcbiAgfVxufVxuIiwgImltcG9ydCB7IGV4aXN0c1N5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tIFwibm9kZTpmc1wiO1xuaW1wb3J0IHsgZXhlY0ZpbGVTeW5jLCBzcGF3biwgc3Bhd25TeW5jIH0gZnJvbSBcIm5vZGU6Y2hpbGRfcHJvY2Vzc1wiO1xuaW1wb3J0IHsgZGlybmFtZSwgam9pbiwgcmVzb2x2ZSB9IGZyb20gXCJub2RlOnBhdGhcIjtcbmltcG9ydCB7IGhvbWVkaXIgfSBmcm9tIFwibm9kZTpvc1wiO1xuaW1wb3J0IHtcbiAgcmVhZEluc3RhbGxlclN0YXRlLFxuICByZWFkU3RhdGUsXG4gIHdyaXRlU2VsZlVwZGF0ZVN0YXRlLFxuICB3cml0ZVN0YXRlLFxuICB0eXBlIENvZGV4UGx1c1BsdXNVcGRhdGVDaGVjayxcbiAgdHlwZSBJbnN0YWxsYXRpb25Tb3VyY2UsXG4gIHR5cGUgU2VsZlVwZGF0ZUNoYW5uZWwsXG4gIHR5cGUgU2VsZlVwZGF0ZVN0YXRlLFxufSBmcm9tIFwiLi9jb25maWctc3RhdGVcIjtcbmltcG9ydCB7XG4gIENPREVYX1BMVVNQTFVTX1JFUE8sXG4gIENPREVYX1BMVVNQTFVTX1ZFUlNJT04sXG4gIFNJR05FRF9DT0RFWF9CQUNLVVAsXG4gIFVQREFURV9NT0RFX0ZJTEUsXG4gIGxvZyxcbiAgdXNlclJvb3QsXG59IGZyb20gXCIuL3J1bnRpbWUtcGF0aHNcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGluc3RhbGxTcGFya2xlVXBkYXRlSG9vaygpOiB2b2lkIHtcbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gIT09IFwiZGFyd2luXCIpIHJldHVybjtcblxuICBjb25zdCBNb2R1bGUgPSByZXF1aXJlKFwibm9kZTptb2R1bGVcIikgYXMgdHlwZW9mIGltcG9ydChcIm5vZGU6bW9kdWxlXCIpICYge1xuICAgIF9sb2FkPzogKHJlcXVlc3Q6IHN0cmluZywgcGFyZW50OiB1bmtub3duLCBpc01haW46IGJvb2xlYW4pID0+IHVua25vd247XG4gIH07XG4gIGNvbnN0IG9yaWdpbmFsTG9hZCA9IE1vZHVsZS5fbG9hZDtcbiAgaWYgKHR5cGVvZiBvcmlnaW5hbExvYWQgIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuO1xuXG4gIE1vZHVsZS5fbG9hZCA9IGZ1bmN0aW9uIGNvZGV4UGx1c1BsdXNNb2R1bGVMb2FkKHJlcXVlc3Q6IHN0cmluZywgcGFyZW50OiB1bmtub3duLCBpc01haW46IGJvb2xlYW4pIHtcbiAgICBjb25zdCBsb2FkZWQgPSBvcmlnaW5hbExvYWQuYXBwbHkodGhpcywgW3JlcXVlc3QsIHBhcmVudCwgaXNNYWluXSkgYXMgdW5rbm93bjtcbiAgICBpZiAodHlwZW9mIHJlcXVlc3QgPT09IFwic3RyaW5nXCIgJiYgL3NwYXJrbGUoPzpcXC5ub2RlKT8kL2kudGVzdChyZXF1ZXN0KSkge1xuICAgICAgd3JhcFNwYXJrbGVFeHBvcnRzKGxvYWRlZCk7XG4gICAgfVxuICAgIHJldHVybiBsb2FkZWQ7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3cmFwU3BhcmtsZUV4cG9ydHMobG9hZGVkOiB1bmtub3duKTogdm9pZCB7XG4gIGlmICghbG9hZGVkIHx8IHR5cGVvZiBsb2FkZWQgIT09IFwib2JqZWN0XCIpIHJldHVybjtcbiAgY29uc3QgZXhwb3J0cyA9IGxvYWRlZCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiAmIHsgX19jb2RleHBwU3BhcmtsZVdyYXBwZWQ/OiBib29sZWFuIH07XG4gIGlmIChleHBvcnRzLl9fY29kZXhwcFNwYXJrbGVXcmFwcGVkKSByZXR1cm47XG4gIGV4cG9ydHMuX19jb2RleHBwU3BhcmtsZVdyYXBwZWQgPSB0cnVlO1xuXG4gIGZvciAoY29uc3QgbmFtZSBvZiBbXCJpbnN0YWxsVXBkYXRlc0lmQXZhaWxhYmxlXCJdKSB7XG4gICAgY29uc3QgZm4gPSBleHBvcnRzW25hbWVdO1xuICAgIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikgY29udGludWU7XG4gICAgZXhwb3J0c1tuYW1lXSA9IGZ1bmN0aW9uIGNvZGV4UGx1c1BsdXNTcGFya2xlV3JhcHBlcih0aGlzOiB1bmtub3duLCAuLi5hcmdzOiB1bmtub3duW10pIHtcbiAgICAgIHByZXBhcmVTaWduZWRDb2RleEZvclNwYXJrbGVJbnN0YWxsKCk7XG4gICAgICByZXR1cm4gUmVmbGVjdC5hcHBseShmbiwgdGhpcywgYXJncyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChleHBvcnRzLmRlZmF1bHQgJiYgZXhwb3J0cy5kZWZhdWx0ICE9PSBleHBvcnRzKSB7XG4gICAgd3JhcFNwYXJrbGVFeHBvcnRzKGV4cG9ydHMuZGVmYXVsdCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByZXBhcmVTaWduZWRDb2RleEZvclNwYXJrbGVJbnN0YWxsKCk6IHZvaWQge1xuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSAhPT0gXCJkYXJ3aW5cIikgcmV0dXJuO1xuICBpZiAoZXhpc3RzU3luYyhVUERBVEVfTU9ERV9GSUxFKSkge1xuICAgIGxvZyhcImluZm9cIiwgXCJTcGFya2xlIHVwZGF0ZSBwcmVwIHNraXBwZWQ7IHVwZGF0ZSBtb2RlIGFscmVhZHkgYWN0aXZlXCIpO1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoIWV4aXN0c1N5bmMoU0lHTkVEX0NPREVYX0JBQ0tVUCkpIHtcbiAgICBsb2coXCJ3YXJuXCIsIFwiU3BhcmtsZSB1cGRhdGUgcHJlcCBza2lwcGVkOyBzaWduZWQgQ29kZXguYXBwIGJhY2t1cCBpcyBtaXNzaW5nXCIpO1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoIWlzRGV2ZWxvcGVySWRTaWduZWRBcHAoU0lHTkVEX0NPREVYX0JBQ0tVUCkpIHtcbiAgICBsb2coXCJ3YXJuXCIsIFwiU3BhcmtsZSB1cGRhdGUgcHJlcCBza2lwcGVkOyBDb2RleC5hcHAgYmFja3VwIGlzIG5vdCBEZXZlbG9wZXIgSUQgc2lnbmVkXCIpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHN0YXRlID0gcmVhZEluc3RhbGxlclN0YXRlKCk7XG4gIGNvbnN0IGFwcFJvb3QgPSBzdGF0ZT8uYXBwUm9vdCA/PyBpbmZlck1hY0FwcFJvb3QoKTtcbiAgaWYgKCFhcHBSb290KSB7XG4gICAgbG9nKFwid2FyblwiLCBcIlNwYXJrbGUgdXBkYXRlIHByZXAgc2tpcHBlZDsgY291bGQgbm90IGluZmVyIENvZGV4LmFwcCBwYXRoXCIpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IG1vZGUgPSB7XG4gICAgZW5hYmxlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgYXBwUm9vdCxcbiAgICBjb2RleFZlcnNpb246IHN0YXRlPy5jb2RleFZlcnNpb24gPz8gbnVsbCxcbiAgfTtcbiAgd3JpdGVGaWxlU3luYyhVUERBVEVfTU9ERV9GSUxFLCBKU09OLnN0cmluZ2lmeShtb2RlLCBudWxsLCAyKSk7XG5cbiAgdHJ5IHtcbiAgICBleGVjRmlsZVN5bmMoXCJkaXR0b1wiLCBbU0lHTkVEX0NPREVYX0JBQ0tVUCwgYXBwUm9vdF0sIHsgc3RkaW86IFwiaWdub3JlXCIgfSk7XG4gICAgdHJ5IHtcbiAgICAgIGV4ZWNGaWxlU3luYyhcInhhdHRyXCIsIFtcIi1kclwiLCBcImNvbS5hcHBsZS5xdWFyYW50aW5lXCIsIGFwcFJvb3RdLCB7IHN0ZGlvOiBcImlnbm9yZVwiIH0pO1xuICAgIH0gY2F0Y2gge31cbiAgICBsb2coXCJpbmZvXCIsIFwiUmVzdG9yZWQgc2lnbmVkIENvZGV4LmFwcCBiZWZvcmUgU3BhcmtsZSBpbnN0YWxsXCIsIHsgYXBwUm9vdCB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZyhcImVycm9yXCIsIFwiRmFpbGVkIHRvIHJlc3RvcmUgc2lnbmVkIENvZGV4LmFwcCBiZWZvcmUgU3BhcmtsZSBpbnN0YWxsXCIsIHtcbiAgICAgIG1lc3NhZ2U6IChlIGFzIEVycm9yKS5tZXNzYWdlLFxuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0RldmVsb3BlcklkU2lnbmVkQXBwKGFwcFJvb3Q6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBjb25zdCByZXN1bHQgPSBzcGF3blN5bmMoXCJjb2Rlc2lnblwiLCBbXCItZHZcIiwgXCItLXZlcmJvc2U9NFwiLCBhcHBSb290XSwge1xuICAgIGVuY29kaW5nOiBcInV0ZjhcIixcbiAgICBzdGRpbzogW1wiaWdub3JlXCIsIFwicGlwZVwiLCBcInBpcGVcIl0sXG4gIH0pO1xuICBjb25zdCBvdXRwdXQgPSBgJHtyZXN1bHQuc3Rkb3V0ID8/IFwiXCJ9JHtyZXN1bHQuc3RkZXJyID8/IFwiXCJ9YDtcbiAgcmV0dXJuIChcbiAgICByZXN1bHQuc3RhdHVzID09PSAwICYmXG4gICAgL0F1dGhvcml0eT1EZXZlbG9wZXIgSUQgQXBwbGljYXRpb246Ly50ZXN0KG91dHB1dCkgJiZcbiAgICAhL1NpZ25hdHVyZT1hZGhvYy8udGVzdChvdXRwdXQpICYmXG4gICAgIS9UZWFtSWRlbnRpZmllcj1ub3Qgc2V0Ly50ZXN0KG91dHB1dClcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluZmVyTWFjQXBwUm9vdCgpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgbWFya2VyID0gXCIuYXBwL0NvbnRlbnRzL01hY09TL1wiO1xuICBjb25zdCBpZHggPSBwcm9jZXNzLmV4ZWNQYXRoLmluZGV4T2YobWFya2VyKTtcbiAgcmV0dXJuIGlkeCA+PSAwID8gcHJvY2Vzcy5leGVjUGF0aC5zbGljZSgwLCBpZHggKyBcIi5hcHBcIi5sZW5ndGgpIDogbnVsbDtcbn1cblxuZXhwb3J0IGNvbnN0IFVQREFURV9DSEVDS19JTlRFUlZBTF9NUyA9IDI0ICogNjAgKiA2MCAqIDEwMDA7XG5leHBvcnQgY29uc3QgVkVSU0lPTl9SRSA9IC9edj8oXFxkKylcXC4oXFxkKylcXC4oXFxkKykoPzpbLStdLiopPyQvO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZW5zdXJlQ29kZXhQbHVzUGx1c1VwZGF0ZUNoZWNrKGZvcmNlID0gZmFsc2UpOiBQcm9taXNlPENvZGV4UGx1c1BsdXNVcGRhdGVDaGVjaz4ge1xuICBjb25zdCBzdGF0ZSA9IHJlYWRTdGF0ZSgpO1xuICBjb25zdCBjYWNoZWQgPSBzdGF0ZS5jb2RleFBsdXNQbHVzPy51cGRhdGVDaGVjaztcbiAgY29uc3QgY2hhbm5lbCA9IHN0YXRlLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZUNoYW5uZWwgPz8gXCJzdGFibGVcIjtcbiAgY29uc3QgcmVwbyA9IHN0YXRlLmNvZGV4UGx1c1BsdXM/LnVwZGF0ZVJlcG8gPz8gQ09ERVhfUExVU1BMVVNfUkVQTztcbiAgaWYgKFxuICAgICFmb3JjZSAmJlxuICAgIGNhY2hlZCAmJlxuICAgIGNhY2hlZC5jdXJyZW50VmVyc2lvbiA9PT0gQ09ERVhfUExVU1BMVVNfVkVSU0lPTiAmJlxuICAgIERhdGUubm93KCkgLSBEYXRlLnBhcnNlKGNhY2hlZC5jaGVja2VkQXQpIDwgVVBEQVRFX0NIRUNLX0lOVEVSVkFMX01TXG4gICkge1xuICAgIHJldHVybiBjYWNoZWQ7XG4gIH1cblxuICBjb25zdCByZWxlYXNlID0gYXdhaXQgZmV0Y2hMYXRlc3RSZWxlYXNlKHJlcG8sIENPREVYX1BMVVNQTFVTX1ZFUlNJT04sIGNoYW5uZWwgPT09IFwicHJlcmVsZWFzZVwiKTtcbiAgY29uc3QgbGF0ZXN0VmVyc2lvbiA9IHJlbGVhc2UubGF0ZXN0VGFnID8gbm9ybWFsaXplVmVyc2lvbihyZWxlYXNlLmxhdGVzdFRhZykgOiBudWxsO1xuICBjb25zdCBjaGVjazogQ29kZXhQbHVzUGx1c1VwZGF0ZUNoZWNrID0ge1xuICAgIGNoZWNrZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIGN1cnJlbnRWZXJzaW9uOiBDT0RFWF9QTFVTUExVU19WRVJTSU9OLFxuICAgIGxhdGVzdFZlcnNpb24sXG4gICAgcmVsZWFzZVVybDogcmVsZWFzZS5yZWxlYXNlVXJsID8/IGBodHRwczovL2dpdGh1Yi5jb20vJHtyZXBvfS9yZWxlYXNlc2AsXG4gICAgcmVsZWFzZU5vdGVzOiByZWxlYXNlLnJlbGVhc2VOb3RlcyxcbiAgICB1cGRhdGVBdmFpbGFibGU6IGxhdGVzdFZlcnNpb25cbiAgICAgID8gY29tcGFyZVZlcnNpb25zKG5vcm1hbGl6ZVZlcnNpb24obGF0ZXN0VmVyc2lvbiksIENPREVYX1BMVVNQTFVTX1ZFUlNJT04pID4gMFxuICAgICAgOiBmYWxzZSxcbiAgICAuLi4ocmVsZWFzZS5lcnJvciA/IHsgZXJyb3I6IHJlbGVhc2UuZXJyb3IgfSA6IHt9KSxcbiAgfTtcbiAgc3RhdGUuY29kZXhQbHVzUGx1cyA/Pz0ge307XG4gIHN0YXRlLmNvZGV4UGx1c1BsdXMudXBkYXRlQ2hlY2sgPSBjaGVjaztcbiAgd3JpdGVTdGF0ZShzdGF0ZSk7XG4gIHJldHVybiBjaGVjaztcbn1cblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hMYXRlc3RSZWxlYXNlKFxuICByZXBvOiBzdHJpbmcsXG4gIGN1cnJlbnRWZXJzaW9uOiBzdHJpbmcsXG4gIGluY2x1ZGVQcmVyZWxlYXNlID0gZmFsc2UsXG4pOiBQcm9taXNlPHsgbGF0ZXN0VGFnOiBzdHJpbmcgfCBudWxsOyByZWxlYXNlVXJsOiBzdHJpbmcgfCBudWxsOyByZWxlYXNlTm90ZXM6IHN0cmluZyB8IG51bGw7IGVycm9yPzogc3RyaW5nIH0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBjb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgIGNvbnN0IHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IGNvbnRyb2xsZXIuYWJvcnQoKSwgODAwMCk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGVuZHBvaW50ID0gaW5jbHVkZVByZXJlbGVhc2UgPyBcInJlbGVhc2VzP3Blcl9wYWdlPTIwXCIgOiBcInJlbGVhc2VzL2xhdGVzdFwiO1xuICAgICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goYGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvJHtyZXBvfS8ke2VuZHBvaW50fWAsIHtcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIFwiQWNjZXB0XCI6IFwiYXBwbGljYXRpb24vdm5kLmdpdGh1Yitqc29uXCIsXG4gICAgICAgICAgXCJVc2VyLUFnZW50XCI6IGBjb2RleC1wbHVzcGx1cy8ke2N1cnJlbnRWZXJzaW9ufWAsXG4gICAgICAgIH0sXG4gICAgICAgIHNpZ25hbDogY29udHJvbGxlci5zaWduYWwsXG4gICAgICB9KTtcbiAgICAgIGlmIChyZXMuc3RhdHVzID09PSA0MDQpIHtcbiAgICAgICAgcmV0dXJuIHsgbGF0ZXN0VGFnOiBudWxsLCByZWxlYXNlVXJsOiBudWxsLCByZWxlYXNlTm90ZXM6IG51bGwsIGVycm9yOiBcIm5vIEdpdEh1YiByZWxlYXNlIGZvdW5kXCIgfTtcbiAgICAgIH1cbiAgICAgIGlmICghcmVzLm9rKSB7XG4gICAgICAgIHJldHVybiB7IGxhdGVzdFRhZzogbnVsbCwgcmVsZWFzZVVybDogbnVsbCwgcmVsZWFzZU5vdGVzOiBudWxsLCBlcnJvcjogYEdpdEh1YiByZXR1cm5lZCAke3Jlcy5zdGF0dXN9YCB9O1xuICAgICAgfVxuICAgICAgY29uc3QganNvbiA9IGF3YWl0IHJlcy5qc29uKCkgYXMgeyB0YWdfbmFtZT86IHN0cmluZzsgaHRtbF91cmw/OiBzdHJpbmc7IGJvZHk/OiBzdHJpbmc7IGRyYWZ0PzogYm9vbGVhbiB9IHwgQXJyYXk8eyB0YWdfbmFtZT86IHN0cmluZzsgaHRtbF91cmw/OiBzdHJpbmc7IGJvZHk/OiBzdHJpbmc7IGRyYWZ0PzogYm9vbGVhbiB9PjtcbiAgICAgIGNvbnN0IGJvZHkgPSBBcnJheS5pc0FycmF5KGpzb24pID8ganNvbi5maW5kKChyZWxlYXNlKSA9PiAhcmVsZWFzZS5kcmFmdCkgOiBqc29uO1xuICAgICAgaWYgKCFib2R5KSB7XG4gICAgICAgIHJldHVybiB7IGxhdGVzdFRhZzogbnVsbCwgcmVsZWFzZVVybDogbnVsbCwgcmVsZWFzZU5vdGVzOiBudWxsLCBlcnJvcjogXCJubyBHaXRIdWIgcmVsZWFzZSBmb3VuZFwiIH07XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsYXRlc3RUYWc6IGJvZHkudGFnX25hbWUgPz8gbnVsbCxcbiAgICAgICAgcmVsZWFzZVVybDogYm9keS5odG1sX3VybCA/PyBgaHR0cHM6Ly9naXRodWIuY29tLyR7cmVwb30vcmVsZWFzZXNgLFxuICAgICAgICByZWxlYXNlTm90ZXM6IGJvZHkuYm9keSA/PyBudWxsLFxuICAgICAgfTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiB7XG4gICAgICBsYXRlc3RUYWc6IG51bGwsXG4gICAgICByZWxlYXNlVXJsOiBudWxsLFxuICAgICAgcmVsZWFzZU5vdGVzOiBudWxsLFxuICAgICAgZXJyb3I6IGUgaW5zdGFuY2VvZiBFcnJvciA/IGUubWVzc2FnZSA6IFN0cmluZyhlKSxcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVWZXJzaW9uKHY6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB2LnRyaW0oKS5yZXBsYWNlKC9edi9pLCBcIlwiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmVWZXJzaW9ucyhhOiBzdHJpbmcsIGI6IHN0cmluZyk6IG51bWJlciB7XG4gIGNvbnN0IGF2ID0gVkVSU0lPTl9SRS5leGVjKGEpO1xuICBjb25zdCBidiA9IFZFUlNJT05fUkUuZXhlYyhiKTtcbiAgaWYgKCFhdiB8fCAhYnYpIHJldHVybiAwO1xuICBmb3IgKGxldCBpID0gMTsgaSA8PSAzOyBpKyspIHtcbiAgICBjb25zdCBkaWZmID0gTnVtYmVyKGF2W2ldKSAtIE51bWJlcihidltpXSk7XG4gICAgaWYgKGRpZmYgIT09IDApIHJldHVybiBkaWZmO1xuICB9XG4gIHJldHVybiAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmFsbGJhY2tTb3VyY2VSb290KCk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBjYW5kaWRhdGVzID0gW1xuICAgIGpvaW4oaG9tZWRpcigpLCBcIi5jb2RleC1wbHVzcGx1c1wiLCBcInNvdXJjZVwiKSxcbiAgICBqb2luKHVzZXJSb290ISwgXCJzb3VyY2VcIiksXG4gIF07XG4gIGZvciAoY29uc3QgY2FuZGlkYXRlIG9mIGNhbmRpZGF0ZXMpIHtcbiAgICBpZiAoZXhpc3RzU3luYyhqb2luKGNhbmRpZGF0ZSwgXCJwYWNrYWdlc1wiLCBcImluc3RhbGxlclwiLCBcImRpc3RcIiwgXCJjbGkuanNcIikpKSByZXR1cm4gY2FuZGlkYXRlO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVzY3JpYmVJbnN0YWxsYXRpb25Tb3VyY2Uoc291cmNlUm9vdDogc3RyaW5nIHwgbnVsbCk6IEluc3RhbGxhdGlvblNvdXJjZSB7XG4gIGlmICghc291cmNlUm9vdCkge1xuICAgIHJldHVybiB7XG4gICAgICBraW5kOiBcInVua25vd25cIixcbiAgICAgIGxhYmVsOiBcIlVua25vd25cIixcbiAgICAgIGRldGFpbDogXCJDb2RleCsrIHNvdXJjZSBsb2NhdGlvbiBpcyBub3QgcmVjb3JkZWQgeWV0LlwiLFxuICAgIH07XG4gIH1cbiAgY29uc3Qgbm9ybWFsaXplZCA9IHNvdXJjZVJvb3QucmVwbGFjZSgvXFxcXC9nLCBcIi9cIik7XG4gIGlmICgvXFwvKD86SG9tZWJyZXd8aG9tZWJyZXcpXFwvQ2VsbGFyXFwvY29kZXhwbHVzcGx1c1xcLy8udGVzdChub3JtYWxpemVkKSkge1xuICAgIHJldHVybiB7IGtpbmQ6IFwiaG9tZWJyZXdcIiwgbGFiZWw6IFwiSG9tZWJyZXdcIiwgZGV0YWlsOiBzb3VyY2VSb290IH07XG4gIH1cbiAgaWYgKGV4aXN0c1N5bmMoam9pbihzb3VyY2VSb290LCBcIi5naXRcIikpKSB7XG4gICAgcmV0dXJuIHsga2luZDogXCJsb2NhbC1kZXZcIiwgbGFiZWw6IFwiTG9jYWwgZGV2ZWxvcG1lbnQgY2hlY2tvdXRcIiwgZGV0YWlsOiBzb3VyY2VSb290IH07XG4gIH1cbiAgaWYgKG5vcm1hbGl6ZWQuZW5kc1dpdGgoXCIvLmNvZGV4LXBsdXNwbHVzL3NvdXJjZVwiKSB8fCBub3JtYWxpemVkLmluY2x1ZGVzKFwiLy5jb2RleC1wbHVzcGx1cy9zb3VyY2UvXCIpKSB7XG4gICAgcmV0dXJuIHsga2luZDogXCJnaXRodWItc291cmNlXCIsIGxhYmVsOiBcIkdpdEh1YiBzb3VyY2UgaW5zdGFsbGVyXCIsIGRldGFpbDogc291cmNlUm9vdCB9O1xuICB9XG4gIGlmIChleGlzdHNTeW5jKGpvaW4oc291cmNlUm9vdCwgXCJwYWNrYWdlLmpzb25cIikpKSB7XG4gICAgcmV0dXJuIHsga2luZDogXCJzb3VyY2UtYXJjaGl2ZVwiLCBsYWJlbDogXCJTb3VyY2UgYXJjaGl2ZVwiLCBkZXRhaWw6IHNvdXJjZVJvb3QgfTtcbiAgfVxuICByZXR1cm4geyBraW5kOiBcInVua25vd25cIiwgbGFiZWw6IFwiVW5rbm93blwiLCBkZXRhaWw6IHNvdXJjZVJvb3QgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0SW5zdGFsbGVkQ2xpKGNsaTogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXSk6IHZvaWQge1xuICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJkYXJ3aW5cIiAmJiBzdGFydEluc3RhbGxlZENsaVdpdGhMYXVuY2hkKGNsaSwgYXJncykpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgY2hpbGQgPSBzcGF3bihwcm9jZXNzLmV4ZWNQYXRoLCBbY2xpLCAuLi5hcmdzXSwge1xuICAgIGN3ZDogcmVzb2x2ZShkaXJuYW1lKGNsaSksIFwiLi5cIiwgXCIuLlwiLCBcIi4uXCIpLFxuICAgIGVudjogeyAuLi5wcm9jZXNzLmVudiwgQ09ERVhfUExVU1BMVVNfTUFOVUFMX1VQREFURTogXCIxXCIgfSxcbiAgICBkZXRhY2hlZDogdHJ1ZSxcbiAgICBzdGRpbzogXCJpZ25vcmVcIixcbiAgfSk7XG4gIGNoaWxkLnVucmVmKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdGFydEluc3RhbGxlZENsaVdpdGhMYXVuY2hkKGNsaTogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXSk6IGJvb2xlYW4ge1xuICBjb25zdCBsYWJlbCA9IGBjb20uY29kZXhwbHVzcGx1cy5wYXRjaC1oZWxwZXIuJHtwcm9jZXNzLnBpZH0uJHtEYXRlLm5vdygpfWA7XG4gIGNvbnN0IGNsZWFudXAgPSBgbGF1bmNoY3RsIHJlbW92ZSAke2xhYmVsfSA+L2Rldi9udWxsIDI+JjEgfHwgbGF1bmNoY3RsIGJvb3RvdXQgZ3VpLyQoaWQgLXUpLyR7bGFiZWx9ID4vZGV2L251bGwgMj4mMSB8fCB0cnVlYDtcbiAgY29uc3QgY29tbWFuZCA9IFtcbiAgICBgdHJhcCAke3NoZWxsUXVvdGUoY2xlYW51cCl9IEVYSVRgLFxuICAgIGBjZCAke3NoZWxsUXVvdGUocmVzb2x2ZShkaXJuYW1lKGNsaSksIFwiLi5cIiwgXCIuLlwiLCBcIi4uXCIpKX1gLFxuICAgIGBDT0RFWF9QTFVTUExVU19NQU5VQUxfVVBEQVRFPTEgJHtbcHJvY2Vzcy5leGVjUGF0aCwgY2xpLCAuLi5hcmdzXS5tYXAoc2hlbGxRdW90ZSkuam9pbihcIiBcIil9YCxcbiAgXS5qb2luKFwiICYmIFwiKTtcbiAgY29uc3QgcmVzdWx0ID0gc3Bhd25TeW5jKFxuICAgIFwibGF1bmNoY3RsXCIsXG4gICAgW1xuICAgICAgXCJzdWJtaXRcIixcbiAgICAgIFwiLWxcIixcbiAgICAgIGxhYmVsLFxuICAgICAgXCItLVwiLFxuICAgICAgXCIvYmluL3NoXCIsXG4gICAgICBcIi1jXCIsXG4gICAgICBgJHtjb21tYW5kfSB8fCB0cnVlYCxcbiAgICBdLFxuICAgIHtcbiAgICAgIGVuY29kaW5nOiBcInV0ZjhcIixcbiAgICAgIHN0ZGlvOiBcImlnbm9yZVwiLFxuICAgIH0sXG4gICk7XG4gIGlmIChyZXN1bHQuc3RhdHVzID09PSAwKSByZXR1cm4gdHJ1ZTtcbiAgbG9nKFwid2FyblwiLCBgbGF1bmNoY3RsIHN1Ym1pdCBmYWlsZWQgZm9yIENvZGV4KysgcGF0Y2ggaGVscGVyOiAke3Jlc3VsdC5lcnJvcj8ubWVzc2FnZSA/PyByZXN1bHQuc3RhdHVzfWApO1xuICByZXR1cm4gZmFsc2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzaGVsbFF1b3RlKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCcke3ZhbHVlLnJlcGxhY2UoLycvZywgYCdcXFxcJydgKX0nYDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hcmtTZWxmVXBkYXRlU3RhcnRlZChzb3VyY2VSb290OiBzdHJpbmcpOiBTZWxmVXBkYXRlU3RhdGUge1xuICBjb25zdCBjb25maWcgPSByZWFkU3RhdGUoKS5jb2RleFBsdXNQbHVzO1xuICBjb25zdCBjaGFubmVsID0gY29uZmlnPy51cGRhdGVDaGFubmVsID8/IFwic3RhYmxlXCI7XG4gIGNvbnN0IHN0YXRlOiBTZWxmVXBkYXRlU3RhdGUgPSB7XG4gICAgY2hlY2tlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgc3RhdHVzOiBcImNoZWNraW5nXCIsXG4gICAgY3VycmVudFZlcnNpb246IENPREVYX1BMVVNQTFVTX1ZFUlNJT04sXG4gICAgbGF0ZXN0VmVyc2lvbjogbnVsbCxcbiAgICB0YXJnZXRSZWY6IGNvbmZpZz8udXBkYXRlQ2hhbm5lbCA9PT0gXCJjdXN0b21cIiA/IGNvbmZpZy51cGRhdGVSZWYgPz8gbnVsbCA6IG51bGwsXG4gICAgcmVsZWFzZVVybDogbnVsbCxcbiAgICByZXBvOiBjb25maWc/LnVwZGF0ZVJlcG8gPz8gQ09ERVhfUExVU1BMVVNfUkVQTyxcbiAgICBjaGFubmVsLFxuICAgIHNvdXJjZVJvb3QsXG4gICAgaW5zdGFsbGF0aW9uU291cmNlOiBkZXNjcmliZUluc3RhbGxhdGlvblNvdXJjZShzb3VyY2VSb290KSxcbiAgfTtcbiAgd3JpdGVTZWxmVXBkYXRlU3RhdGUoc3RhdGUpO1xuICByZXR1cm4gc3RhdGU7XG59XG4iLCAiaW1wb3J0IHsgQnJvd3NlclZpZXcsIEJyb3dzZXJXaW5kb3cgfSBmcm9tIFwiZWxlY3Ryb25cIjtcbmltcG9ydCB7IGV4aXN0c1N5bmMgfSBmcm9tIFwibm9kZTpmc1wiO1xuaW1wb3J0IHsgcmFuZG9tVVVJRCB9IGZyb20gXCJub2RlOmNyeXB0b1wiO1xuaW1wb3J0IHR5cGUgeyBDb2RleFJ1bnRpbWVDYXBhYmlsaXRpZXMsIENvZGV4Vmlld0NyZWF0ZU9wdGlvbnMsIENvZGV4Vmlld1JlZiB9IGZyb20gXCJAY29kZXgtcGx1c3BsdXMvc2RrXCI7XG5pbXBvcnQgdHlwZSB7IE5hdGl2ZVR3ZWFrQ29udGV4dCB9IGZyb20gXCIuL25hdGl2ZS1icmlkZ2VcIjtcbmltcG9ydCB7IEdVRVNUX1BSRUxPQURfUEFUSCwgbG9nIH0gZnJvbSBcIi4vcnVudGltZS1wYXRoc1wiO1xuaW1wb3J0IHtcbiAgYXNSZWNvcmQsXG4gIGNhbGxPYmplY3RNZXRob2QsXG4gIGNvZGV4QXBwVXJsLFxuICBnZXRDb2RleFdpbmRvd1NlcnZpY2VzLFxuICBnZXRQcmltYXJ5Q29kZXhXaW5kb3csXG4gIGlzV2luZG93RGVzdHJveWVkLFxuICBtYWtlV2luZG93TGlrZUZvclZpZXcsXG4gIG5vcm1hbGl6ZUNvZGV4Um91dGUsXG4gIG5vcm1hbGl6ZU93bFZpZXdVcmwsXG4gIHdpbmRvd0lkRm9yLFxufSBmcm9tIFwiLi9jb2RleC13aW5kb3dzXCI7XG5pbXBvcnQge1xuICBpbnNwZWN0Vmlld0F0dGFjaFRhcmdldHMsXG4gIHByb2JlUnVudGltZUNvbXBhdGliaWxpdHksXG4gIHZpZXdzQ2FwYWJpbGl0aWVzRnJvbVNuYXBzaG90LFxuICB2aWV3U2FtcGxlRnJvbUNvbnN0cnVjdG9yLFxuICB3aW5kb3dTYW1wbGVGcm9tLFxufSBmcm9tIFwiLi9jb2RleC1ydW50aW1lLXByb2JlXCI7XG5cbmV4cG9ydCB0eXBlIE93bFZpZXdBdHRhY2hNb2RlID0gXCJjb250ZW50Vmlld1wiIHwgXCJicm93c2VyVmlld1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIE1hbmFnZWRPd2xWaWV3IHtcbiAga2V5OiBzdHJpbmc7XG4gIHR3ZWFrSWQ6IHN0cmluZztcbiAgaWQ6IHN0cmluZztcbiAgdmlldzogRWxlY3Ryb24uQnJvd3NlclZpZXc7XG4gIHBhcmVudFdpbmRvd0lkOiBudW1iZXIgfCBudWxsO1xuICBhdHRhY2hNb2RlOiBPd2xWaWV3QXR0YWNoTW9kZSB8IG51bGw7XG4gIGRpc3Bvc2VCaW5kaW5nczogQXJyYXk8KCkgPT4gdm9pZD47XG4gIGRpc3Bvc2VkOiBib29sZWFuO1xufVxuXG5leHBvcnQgY29uc3QgdW50cnVzdGVkV2ViQ29udGVudHNJZHMgPSBuZXcgU2V0PG51bWJlcj4oKTtcbmNvbnN0IG93bFZpZXdzID0gbmV3IE1hcDxzdHJpbmcsIE1hbmFnZWRPd2xWaWV3PigpO1xuXG5leHBvcnQgZnVuY3Rpb24gbWFya1VudHJ1c3RlZFdlYkNvbnRlbnRzKHdjOiBFbGVjdHJvbi5XZWJDb250ZW50cyk6IHZvaWQge1xuICB1bnRydXN0ZWRXZWJDb250ZW50c0lkcy5hZGQod2MuaWQpO1xuICB3Yy5vbmNlKFwiZGVzdHJveWVkXCIsICgpID0+IHsgdW50cnVzdGVkV2ViQ29udGVudHNJZHMuZGVsZXRlKHdjLmlkKTsgfSk7XG59XG5cblxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0T3dsVmlld0NhcGFiaWxpdGllcygpOiBDb2RleFJ1bnRpbWVDYXBhYmlsaXRpZXNbXCJ2aWV3c1wiXSB7XG4gIGNvbnN0IHNuYXBzaG90ID0gcHJvYmVSdW50aW1lQ29tcGF0aWJpbGl0eSh7XG4gICAgdXNlclJvb3Q6IFwiXCIsXG4gICAgcnVudGltZURpcjogXCJcIixcbiAgICBjb2RleFZlcnNpb246IG51bGwsXG4gICAgY2hhbm5lbDogbnVsbCxcbiAgICBnZXRXaW5kb3dTZXJ2aWNlczogZ2V0Q29kZXhXaW5kb3dTZXJ2aWNlcyxcbiAgICBlbnY6IHtcbiAgICAgIGJyb3dzZXJWaWV3OiBCcm93c2VyVmlldyxcbiAgICAgIGJyb3dzZXJXaW5kb3c6IEJyb3dzZXJXaW5kb3csXG4gICAgICBpbnNwZWN0RXhpc3RpbmdXaW5kb3c6ICgpID0+IHdpbmRvd1NhbXBsZUZyb20oZ2V0UHJpbWFyeUNvZGV4V2luZG93KCkgPz8gQnJvd3NlcldpbmRvdy5nZXRGb2N1c2VkV2luZG93KCkpLFxuICAgICAgaW5zcGVjdEJyb3dzZXJWaWV3OiAoKSA9PiB2aWV3U2FtcGxlRnJvbUNvbnN0cnVjdG9yKEJyb3dzZXJWaWV3KSxcbiAgICB9LFxuICB9KTtcbiAgcmV0dXJuIHZpZXdzQ2FwYWJpbGl0aWVzRnJvbVNuYXBzaG90KHNuYXBzaG90KTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZU93bFZpZXcoXG4gIGN0eDogTmF0aXZlVHdlYWtDb250ZXh0LFxuICBvcHRzOiBDb2RleFZpZXdDcmVhdGVPcHRpb25zLFxuKTogUHJvbWlzZTxDb2RleFZpZXdSZWY+IHtcbiAgY29uc3QgaWQgPSBhc3NlcnRCcmlkZ2VJZChvcHRzLmlkID8/IHJhbmRvbVVVSUQoKSwgXCJDb2RleCB2aWV3IGlkXCIpO1xuICBjb25zdCBrZXkgPSBvd2xWaWV3S2V5KGN0eC5pZCwgaWQpO1xuICBpZiAob3dsVmlld3MuaGFzKGtleSkpIHRocm93IG5ldyBFcnJvcihgQ29kZXggdmlldyBhbHJlYWR5IGV4aXN0czogJHtjdHguaWR9OiR7aWR9YCk7XG5cbiAgY29uc3QgcGFyZW50ID0gdHlwZW9mIG9wdHMucGFyZW50V2luZG93SWQgPT09IFwibnVtYmVyXCJcbiAgICA/IEJyb3dzZXJXaW5kb3cuZnJvbUlkKG9wdHMucGFyZW50V2luZG93SWQpXG4gICAgOiBnZXRQcmltYXJ5Q29kZXhXaW5kb3coKTtcbiAgaWYgKCFwYXJlbnQgfHwgaXNXaW5kb3dEZXN0cm95ZWQocGFyZW50KSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNvZGV4IHZpZXcgbmVlZHMgYW4gYWN0aXZlIHBhcmVudCB3aW5kb3dcIik7XG4gIH1cblxuICBjb25zdCBzZXJ2aWNlcyA9IGdldENvZGV4V2luZG93U2VydmljZXMoKTtcbiAgY29uc3Qgd2luZG93TWFuYWdlciA9IHNlcnZpY2VzPy53aW5kb3dNYW5hZ2VyO1xuICBjb25zdCByb3V0ZSA9IG9wdHMucm91dGUgPT09IHVuZGVmaW5lZCA/IG51bGwgOiBub3JtYWxpemVDb2RleFJvdXRlKG9wdHMucm91dGUpO1xuICBjb25zdCBob3N0SWQgPSBvcHRzLmhvc3RJZCB8fCBcImxvY2FsXCI7XG4gIGNvbnN0IHZpZXcgPSBuZXcgQnJvd3NlclZpZXcoe1xuICAgIHdlYlByZWZlcmVuY2VzOiB7XG4gICAgICBwcmVsb2FkOiBvcHRzLnJlZ2lzdGVyV2l0aENvZGV4ID09PSBmYWxzZVxuICAgICAgICA/IChleGlzdHNTeW5jKEdVRVNUX1BSRUxPQURfUEFUSCkgPyBHVUVTVF9QUkVMT0FEX1BBVEggOiB1bmRlZmluZWQpXG4gICAgICAgIDogd2luZG93TWFuYWdlcj8ub3B0aW9ucz8ucHJlbG9hZFBhdGgsXG4gICAgICBjb250ZXh0SXNvbGF0aW9uOiB0cnVlLFxuICAgICAgbm9kZUludGVncmF0aW9uOiBmYWxzZSxcbiAgICAgIHNhbmRib3g6IHRydWUsXG4gICAgICBzcGVsbGNoZWNrOiBmYWxzZSxcbiAgICAgIGRldlRvb2xzOiB3aW5kb3dNYW5hZ2VyPy5vcHRpb25zPy5hbGxvd0RldnRvb2xzLFxuICAgIH0sXG4gIH0pO1xuICBtYXJrVW50cnVzdGVkV2ViQ29udGVudHModmlldy53ZWJDb250ZW50cyk7XG5cbiAgaWYgKG9wdHMuYmFja2dyb3VuZENvbG9yKSB7XG4gICAgY2FsbE9iamVjdE1ldGhvZCh2aWV3LCBcInNldEJhY2tncm91bmRDb2xvclwiLCBbb3B0cy5iYWNrZ3JvdW5kQ29sb3JdKTtcbiAgICBjYWxsT2JqZWN0TWV0aG9kKGFzUmVjb3JkKHZpZXcpPy53ZWJDb250ZW50c1ZpZXcsIFwic2V0QmFja2dyb3VuZENvbG9yXCIsIFtvcHRzLmJhY2tncm91bmRDb2xvcl0pO1xuICB9XG5cbiAgY29uc3QgbWFuYWdlZDogTWFuYWdlZE93bFZpZXcgPSB7XG4gICAga2V5LFxuICAgIHR3ZWFrSWQ6IGN0eC5pZCxcbiAgICBpZCxcbiAgICB2aWV3LFxuICAgIHBhcmVudFdpbmRvd0lkOiB3aW5kb3dJZEZvcihwYXJlbnQpLFxuICAgIGF0dGFjaE1vZGU6IG51bGwsXG4gICAgZGlzcG9zZUJpbmRpbmdzOiBbXSxcbiAgICBkaXNwb3NlZDogZmFsc2UsXG4gIH07XG4gIG93bFZpZXdzLnNldChrZXksIG1hbmFnZWQpO1xuXG4gIHRyeSB7XG4gICAgaWYgKHJvdXRlICE9PSBudWxsICYmIG9wdHMucmVnaXN0ZXJXaXRoQ29kZXggIT09IGZhbHNlICYmIHdpbmRvd01hbmFnZXI/LnJlZ2lzdGVyV2luZG93KSB7XG4gICAgICBjb25zdCBhcHBlYXJhbmNlID0gb3B0cy5hcHBlYXJhbmNlIHx8IFwic2Vjb25kYXJ5XCI7XG4gICAgICBjb25zdCB3aW5kb3dMaWtlID0gbWFrZVdpbmRvd0xpa2VGb3JWaWV3KHZpZXcpO1xuICAgICAgd2luZG93TWFuYWdlci5yZWdpc3RlcldpbmRvdyh3aW5kb3dMaWtlLCBob3N0SWQsIGZhbHNlLCBhcHBlYXJhbmNlKTtcbiAgICAgIHNlcnZpY2VzPy5nZXRDb250ZXh0Py4oaG9zdElkKT8ucmVnaXN0ZXJXaW5kb3c/Lih3aW5kb3dMaWtlKTtcbiAgICB9XG5cbiAgICBhdHRhY2hPd2xWaWV3KG1hbmFnZWQsIHBhcmVudCk7XG4gICAgaWYgKG9wdHMuYm91bmRzKSBzZXRPd2xWaWV3Qm91bmRzKG1hbmFnZWQsIG9wdHMuYm91bmRzKTtcbiAgICBpZiAob3B0cy52aXNpYmxlID09PSBmYWxzZSkgc2V0T3dsVmlld1Zpc2libGUobWFuYWdlZCwgZmFsc2UpO1xuXG4gICAgaWYgKHJvdXRlICE9PSBudWxsKSB7XG4gICAgICBhd2FpdCB2aWV3LndlYkNvbnRlbnRzLmxvYWRVUkwoY29kZXhBcHBVcmwocm91dGUsIGhvc3RJZCkpO1xuICAgIH0gZWxzZSBpZiAob3B0cy51cmwpIHtcbiAgICAgIGF3YWl0IHZpZXcud2ViQ29udGVudHMubG9hZFVSTChub3JtYWxpemVPd2xWaWV3VXJsKG9wdHMudXJsKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IHZpZXcud2ViQ29udGVudHMubG9hZFVSTChcImFib3V0OmJsYW5rXCIpO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIGRpc3Bvc2VPd2xWaWV3KG1hbmFnZWQpO1xuICAgIHRocm93IGU7XG4gIH1cblxuICBsb2coXCJpbmZvXCIsIGBjcmVhdGVkIE93bCB2aWV3ICR7Y3R4LmlkfToke2lkfWAsIHtcbiAgICBwYXJlbnRXaW5kb3dJZDogbWFuYWdlZC5wYXJlbnRXaW5kb3dJZCxcbiAgICB3ZWJDb250ZW50c0lkOiB2aWV3LndlYkNvbnRlbnRzLmlkLFxuICAgIGF0dGFjaE1vZGU6IG1hbmFnZWQuYXR0YWNoTW9kZSxcbiAgfSk7XG4gIHJldHVybiBvd2xWaWV3UmVmKG1hbmFnZWQpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2FsbE93bFZpZXcoXG4gIHR3ZWFrSWQ6IHN0cmluZyxcbiAgaWQ6IHN0cmluZyxcbiAgbWV0aG9kOiBzdHJpbmcsXG4gIGFyZz86IHVua25vd24sXG4gIGFyZzI/OiB1bmtub3duLFxuKTogUHJvbWlzZTx1bmtub3duPiB7XG4gIGNvbnN0IHZpZXcgPSBvd2xWaWV3Rm9yKHR3ZWFrSWQsIGlkKTtcbiAgaWYgKG1ldGhvZCA9PT0gXCJzZXRCb3VuZHNcIikgcmV0dXJuIHNldE93bFZpZXdCb3VuZHModmlldywgYXJnIGFzIEVsZWN0cm9uLlJlY3RhbmdsZSk7XG4gIGlmIChtZXRob2QgPT09IFwic2V0VmlzaWJsZVwiKSByZXR1cm4gc2V0T3dsVmlld1Zpc2libGUodmlldywgQm9vbGVhbihhcmcpKTtcbiAgaWYgKG1ldGhvZCA9PT0gXCJicmluZ1RvRnJvbnRcIikgcmV0dXJuIGJyaW5nT3dsVmlld1RvRnJvbnQodmlldyk7XG4gIGlmIChtZXRob2QgPT09IFwibG9hZFJvdXRlXCIpIHtcbiAgICBjb25zdCByb3V0ZSA9IG5vcm1hbGl6ZUNvZGV4Um91dGUoU3RyaW5nKGFyZykpO1xuICAgIGNvbnN0IGhvc3RJZCA9IHR5cGVvZiBhcmcyID09PSBcInN0cmluZ1wiICYmIGFyZzIgPyBhcmcyIDogXCJsb2NhbFwiO1xuICAgIHJldHVybiB2aWV3LnZpZXcud2ViQ29udGVudHMubG9hZFVSTChjb2RleEFwcFVybChyb3V0ZSwgaG9zdElkKSk7XG4gIH1cbiAgaWYgKG1ldGhvZCA9PT0gXCJsb2FkVXJsXCIpIHJldHVybiB2aWV3LnZpZXcud2ViQ29udGVudHMubG9hZFVSTChub3JtYWxpemVPd2xWaWV3VXJsKFN0cmluZyhhcmcpKSk7XG4gIGlmIChtZXRob2QgPT09IFwiZGlzcG9zZVwiKSByZXR1cm4gZGlzcG9zZU93bFZpZXdCeUlkKHR3ZWFrSWQsIGlkKTtcbiAgdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIENvZGV4IHZpZXcgbWV0aG9kOiAke21ldGhvZH1gKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG93bFZpZXdSZWYodmlldzogTWFuYWdlZE93bFZpZXcpOiBDb2RleFZpZXdSZWYge1xuICByZXR1cm4ge1xuICAgIGlkOiB2aWV3LmlkLFxuICAgIHdlYkNvbnRlbnRzSWQ6IHZpZXcudmlldy53ZWJDb250ZW50cy5pZCxcbiAgICBwYXJlbnRXaW5kb3dJZDogdmlldy5wYXJlbnRXaW5kb3dJZCxcbiAgICBzZXRCb3VuZHM6IChib3VuZHMpID0+IFByb21pc2UucmVzb2x2ZShzZXRPd2xWaWV3Qm91bmRzKHZpZXcsIGJvdW5kcykpLFxuICAgIHNldFZpc2libGU6ICh2aXNpYmxlKSA9PiBQcm9taXNlLnJlc29sdmUoc2V0T3dsVmlld1Zpc2libGUodmlldywgdmlzaWJsZSkpLFxuICAgIGJyaW5nVG9Gcm9udDogKCkgPT4gUHJvbWlzZS5yZXNvbHZlKGJyaW5nT3dsVmlld1RvRnJvbnQodmlldykpLFxuICAgIGxvYWRSb3V0ZTogKHJvdXRlLCBob3N0SWQpID0+IHZpZXcudmlldy53ZWJDb250ZW50cy5sb2FkVVJMKGNvZGV4QXBwVXJsKG5vcm1hbGl6ZUNvZGV4Um91dGUocm91dGUpLCBob3N0SWQgfHwgXCJsb2NhbFwiKSkudGhlbigoKSA9PiB7fSksXG4gICAgbG9hZFVybDogKHVybCkgPT4gdmlldy52aWV3LndlYkNvbnRlbnRzLmxvYWRVUkwobm9ybWFsaXplT3dsVmlld1VybCh1cmwpKS50aGVuKCgpID0+IHt9KSxcbiAgICBkaXNwb3NlOiAoKSA9PiBQcm9taXNlLnJlc29sdmUoZGlzcG9zZU93bFZpZXdCeUlkKHZpZXcudHdlYWtJZCwgdmlldy5pZCkpLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXR0YWNoT3dsVmlldyh2aWV3OiBNYW5hZ2VkT3dsVmlldywgcGFyZW50OiBFbGVjdHJvbi5Ccm93c2VyV2luZG93KTogdm9pZCB7XG4gIGNvbnN0IHRhcmdldHMgPSBpbnNwZWN0Vmlld0F0dGFjaFRhcmdldHMocGFyZW50LCB2aWV3LnZpZXcpO1xuICBpZiAodGFyZ2V0cy5hZGRCcm93c2VyVmlldykge1xuICAgIGNhbGxPYmplY3RNZXRob2QocGFyZW50LCBcImFkZEJyb3dzZXJWaWV3XCIsIFt2aWV3LnZpZXddKTtcbiAgICB2aWV3LmF0dGFjaE1vZGUgPSBcImJyb3dzZXJWaWV3XCI7XG4gIH0gZWxzZSBpZiAoXG4gICAgdGFyZ2V0cy5hZGRDaGlsZFZpZXcgJiZcbiAgICB0YXJnZXRzLndlYkNvbnRlbnRzVmlld1xuICApIHtcbiAgICB0cnkge1xuICAgICAgYWRkT3dsQ2hpbGRWaWV3KHBhcmVudCwgdmlldy52aWV3KTtcbiAgICAgIHZpZXcuYXR0YWNoTW9kZSA9IFwiY29udGVudFZpZXdcIjtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2coXCJ3YXJuXCIsIFwiT3dsIGNvbnRlbnRWaWV3IGF0dGFjaG1lbnQgZmFpbGVkOyBmYWxsaW5nIGJhY2sgdG8gQnJvd3NlclZpZXdcIiwge1xuICAgICAgICB0d2Vha0lkOiB2aWV3LnR3ZWFrSWQsXG4gICAgICAgIHZpZXdJZDogdmlldy5pZCxcbiAgICAgICAgZXJyb3I6IFN0cmluZyhlKSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICBpZiAoIXZpZXcuYXR0YWNoTW9kZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk93bCB2aWV3IGF0dGFjaG1lbnQgaXMgbm90IGF2YWlsYWJsZSBvbiB0aGlzIENvZGV4IHdpbmRvd1wiKTtcbiAgfVxuXG4gIGNvbnN0IGRpc3Bvc2UgPSAoKSA9PiBkaXNwb3NlT3dsVmlld0J5SWQodmlldy50d2Vha0lkLCB2aWV3LmlkKTtcbiAgYmluZFdpbmRvd0V2ZW50KHBhcmVudCwgdmlldywgXCJjbG9zZWRcIiwgZGlzcG9zZSk7XG4gIGJpbmRXaW5kb3dFdmVudChwYXJlbnQsIHZpZXcsIFwiY2xvc2VcIiwgZGlzcG9zZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBicmluZ093bFZpZXdUb0Zyb250KHZpZXc6IE1hbmFnZWRPd2xWaWV3KTogdm9pZCB7XG4gIGlmICh2aWV3LmRpc3Bvc2VkKSByZXR1cm47XG4gIGNvbnN0IHBhcmVudCA9IHZpZXcucGFyZW50V2luZG93SWQgPT09IG51bGwgPyBudWxsIDogQnJvd3NlcldpbmRvdy5mcm9tSWQodmlldy5wYXJlbnRXaW5kb3dJZCk7XG4gIGlmICghcGFyZW50IHx8IGlzV2luZG93RGVzdHJveWVkKHBhcmVudCkpIHJldHVybjtcbiAgY29uc3QgY29udGVudFZpZXcgPSBhc1JlY29yZChwYXJlbnQpPy5jb250ZW50VmlldztcbiAgY29uc3Qgd2ViQ29udGVudHNWaWV3ID0gYXNSZWNvcmQodmlldy52aWV3KT8ud2ViQ29udGVudHNWaWV3O1xuICBpZiAodmlldy5hdHRhY2hNb2RlID09PSBcImNvbnRlbnRWaWV3XCIgJiYgd2ViQ29udGVudHNWaWV3KSB7XG4gICAgdHJ5IHtcbiAgICAgIGlmICh0eXBlb2YgYXNSZWNvcmQocGFyZW50KT8uc2V0VG9wQnJvd3NlclZpZXcgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBjYWxsT2JqZWN0TWV0aG9kKHBhcmVudCwgXCJzZXRUb3BCcm93c2VyVmlld1wiLCBbdmlldy52aWV3XSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYWxsT2JqZWN0TWV0aG9kKGNvbnRlbnRWaWV3LCBcImFkZENoaWxkVmlld1wiLCBbd2ViQ29udGVudHNWaWV3XSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nKFwid2FyblwiLCBcIk93bCBjb250ZW50VmlldyBicmluZy10by1mcm9udCBmYWlsZWRcIiwge1xuICAgICAgICB0d2Vha0lkOiB2aWV3LnR3ZWFrSWQsXG4gICAgICAgIHZpZXdJZDogdmlldy5pZCxcbiAgICAgICAgZXJyb3I6IFN0cmluZyhlKSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICBpZiAodHlwZW9mIGFzUmVjb3JkKHBhcmVudCk/LnNldFRvcEJyb3dzZXJWaWV3ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICBjYWxsT2JqZWN0TWV0aG9kKHBhcmVudCwgXCJzZXRUb3BCcm93c2VyVmlld1wiLCBbdmlldy52aWV3XSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldE93bFZpZXdCb3VuZHModmlldzogTWFuYWdlZE93bFZpZXcsIGJvdW5kczogRWxlY3Ryb24uUmVjdGFuZ2xlKTogdm9pZCB7XG4gIGFzc2VydEJvdW5kcyhib3VuZHMpO1xuICBjYWxsT2JqZWN0TWV0aG9kKHZpZXcudmlldywgXCJzZXRCb3VuZHNcIiwgW2JvdW5kc10pO1xuICBjYWxsT2JqZWN0TWV0aG9kKGFzUmVjb3JkKHZpZXcudmlldyk/LndlYkNvbnRlbnRzVmlldywgXCJzZXRCb3VuZHNcIiwgW2JvdW5kc10pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0T3dsVmlld1Zpc2libGUodmlldzogTWFuYWdlZE93bFZpZXcsIHZpc2libGU6IGJvb2xlYW4pOiB2b2lkIHtcbiAgY2FsbE9iamVjdE1ldGhvZChhc1JlY29yZCh2aWV3LnZpZXcpPy53ZWJDb250ZW50c1ZpZXcsIFwic2V0VmlzaWJsZVwiLCBbdmlzaWJsZV0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGlzcG9zZU93bFZpZXdCeUlkKHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCB2aWV3ID0gb3dsVmlld3MuZ2V0KG93bFZpZXdLZXkodHdlYWtJZCwgaWQpKTtcbiAgaWYgKCF2aWV3KSByZXR1cm47XG4gIGRpc3Bvc2VPd2xWaWV3KHZpZXcpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGlzcG9zZU93bFZpZXdzRm9yVHdlYWsodHdlYWtJZDogc3RyaW5nKTogdm9pZCB7XG4gIGZvciAoY29uc3QgdmlldyBvZiBbLi4ub3dsVmlld3MudmFsdWVzKCldKSB7XG4gICAgaWYgKHZpZXcudHdlYWtJZCA9PT0gdHdlYWtJZCkgZGlzcG9zZU93bFZpZXcodmlldyk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRpc3Bvc2VBbGxPd2xWaWV3cygpOiB2b2lkIHtcbiAgZm9yIChjb25zdCB2aWV3IG9mIFsuLi5vd2xWaWV3cy52YWx1ZXMoKV0pIGRpc3Bvc2VPd2xWaWV3KHZpZXcpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGlzcG9zZU93bFZpZXcodmlldzogTWFuYWdlZE93bFZpZXcpOiB2b2lkIHtcbiAgaWYgKHZpZXcuZGlzcG9zZWQpIHJldHVybjtcbiAgdmlldy5kaXNwb3NlZCA9IHRydWU7XG4gIG93bFZpZXdzLmRlbGV0ZSh2aWV3LmtleSk7XG4gIGZvciAoY29uc3QgZGlzcG9zZSBvZiB2aWV3LmRpc3Bvc2VCaW5kaW5ncy5zcGxpY2UoMCkpIHtcbiAgICB0cnkge1xuICAgICAgZGlzcG9zZSgpO1xuICAgIH0gY2F0Y2gge31cbiAgfVxuICBjb25zdCBwYXJlbnQgPSB2aWV3LnBhcmVudFdpbmRvd0lkID09PSBudWxsID8gbnVsbCA6IEJyb3dzZXJXaW5kb3cuZnJvbUlkKHZpZXcucGFyZW50V2luZG93SWQpO1xuICBpZiAocGFyZW50ICYmICFpc1dpbmRvd0Rlc3Ryb3llZChwYXJlbnQpKSB7XG4gICAgdHJ5IHtcbiAgICAgIGlmICh2aWV3LmF0dGFjaE1vZGUgPT09IFwiY29udGVudFZpZXdcIikge1xuICAgICAgICByZW1vdmVPd2xDaGlsZFZpZXcocGFyZW50LCB2aWV3LnZpZXcpO1xuICAgICAgfSBlbHNlIGlmICh2aWV3LmF0dGFjaE1vZGUgPT09IFwiYnJvd3NlclZpZXdcIikge1xuICAgICAgICBjYWxsT2JqZWN0TWV0aG9kKHBhcmVudCwgXCJyZW1vdmVCcm93c2VyVmlld1wiLCBbdmlldy52aWV3XSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nKFwid2FyblwiLCBcIk93bCB2aWV3IGRldGFjaCBmYWlsZWQgZHVyaW5nIGRpc3Bvc2VcIiwge1xuICAgICAgICB0d2Vha0lkOiB2aWV3LnR3ZWFrSWQsXG4gICAgICAgIHZpZXdJZDogdmlldy5pZCxcbiAgICAgICAgZXJyb3I6IFN0cmluZyhlKSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICB0cnkge1xuICAgIGlmICghdmlldy52aWV3LndlYkNvbnRlbnRzLmlzRGVzdHJveWVkKCkpIHtcbiAgICAgIHZpZXcudmlldy53ZWJDb250ZW50cy5jbG9zZSh7IHdhaXRGb3JCZWZvcmVVbmxvYWQ6IGZhbHNlIH0pO1xuICAgIH1cbiAgfSBjYXRjaCB7fVxufVxuXG5leHBvcnQgZnVuY3Rpb24gb3dsVmlld0Zvcih0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiBNYW5hZ2VkT3dsVmlldyB7XG4gIGNvbnN0IHZpZXcgPSBvd2xWaWV3cy5nZXQob3dsVmlld0tleSh0d2Vha0lkLCBpZCkpO1xuICBpZiAoIXZpZXcgfHwgdmlldy5kaXNwb3NlZCkgdGhyb3cgbmV3IEVycm9yKGBDb2RleCB2aWV3IGlzIG5vdCBsb2FkZWQ6ICR7dHdlYWtJZH06JHtpZH1gKTtcbiAgcmV0dXJuIHZpZXc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvd2xWaWV3S2V5KHR3ZWFrSWQ6IHN0cmluZywgdmlld0lkOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7dHdlYWtJZH06JHt2aWV3SWR9YDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFkZE93bENoaWxkVmlldyhwYXJlbnQ6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3csIGNoaWxkOiBFbGVjdHJvbi5Ccm93c2VyVmlldyk6IHZvaWQge1xuICBjb25zdCBvd25lcldpbmRvdyA9IGFzUmVjb3JkKGNoaWxkKT8ub3duZXJXaW5kb3c7XG4gIGlmIChvd25lcldpbmRvdyAmJiBvd25lcldpbmRvdyAhPT0gcGFyZW50KSB7XG4gICAgY2FsbE9iamVjdE1ldGhvZChvd25lcldpbmRvdywgXCJyZW1vdmVCcm93c2VyVmlld1wiLCBbY2hpbGRdKTtcbiAgfVxuXG4gIGNhbGxPYmplY3RNZXRob2QoYXNSZWNvcmQocGFyZW50KT8uY29udGVudFZpZXcsIFwiYWRkQ2hpbGRWaWV3XCIsIFthc1JlY29yZChjaGlsZCk/LndlYkNvbnRlbnRzVmlld10pO1xuICB0cnkge1xuICAgIChjaGlsZCBhcyB1bmtub3duIGFzIHsgb3duZXJXaW5kb3c6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsIH0pLm93bmVyV2luZG93ID0gcGFyZW50O1xuICB9IGNhdGNoIHt9XG4gIGNhbGxPYmplY3RNZXRob2QoYXNSZWNvcmQoY2hpbGQud2ViQ29udGVudHMpLCBcIl9zZXRPd25lcldpbmRvd1wiLCBbcGFyZW50XSk7XG5cbiAgY29uc3QgYnJvd3NlclZpZXdzID0gYXNSZWNvcmQocGFyZW50KT8uX2Jyb3dzZXJWaWV3cztcbiAgaWYgKEFycmF5LmlzQXJyYXkoYnJvd3NlclZpZXdzKSAmJiAhYnJvd3NlclZpZXdzLmluY2x1ZGVzKGNoaWxkKSkge1xuICAgIGJyb3dzZXJWaWV3cy5wdXNoKGNoaWxkKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVtb3ZlT3dsQ2hpbGRWaWV3KHBhcmVudDogRWxlY3Ryb24uQnJvd3NlcldpbmRvdywgY2hpbGQ6IEVsZWN0cm9uLkJyb3dzZXJWaWV3KTogdm9pZCB7XG4gIGNhbGxPYmplY3RNZXRob2QoYXNSZWNvcmQocGFyZW50KT8uY29udGVudFZpZXcsIFwicmVtb3ZlQ2hpbGRWaWV3XCIsIFthc1JlY29yZChjaGlsZCk/LndlYkNvbnRlbnRzVmlld10pO1xuICB0cnkge1xuICAgIChjaGlsZCBhcyB1bmtub3duIGFzIHsgb3duZXJXaW5kb3c6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsIH0pLm93bmVyV2luZG93ID0gbnVsbDtcbiAgfSBjYXRjaCB7fVxuXG4gIGNvbnN0IGJyb3dzZXJWaWV3cyA9IGFzUmVjb3JkKHBhcmVudCk/Ll9icm93c2VyVmlld3M7XG4gIGlmIChBcnJheS5pc0FycmF5KGJyb3dzZXJWaWV3cykpIHtcbiAgICBjb25zdCBpbmRleCA9IGJyb3dzZXJWaWV3cy5pbmRleE9mKGNoaWxkKTtcbiAgICBpZiAoaW5kZXggPj0gMCkgYnJvd3NlclZpZXdzLnNwbGljZShpbmRleCwgMSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJpbmRXaW5kb3dFdmVudChcbiAgd2luOiBFbGVjdHJvbi5Ccm93c2VyV2luZG93LFxuICB2aWV3OiBNYW5hZ2VkT3dsVmlldyxcbiAgZXZlbnQ6IHN0cmluZyxcbiAgbGlzdGVuZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQsXG4pOiB2b2lkIHtcbiAgY29uc3Qgb24gPSBhc1JlY29yZCh3aW4pPy5vbjtcbiAgY29uc3Qgb2ZmID0gYXNSZWNvcmQod2luKT8ub2ZmO1xuICBpZiAodHlwZW9mIG9uICE9PSBcImZ1bmN0aW9uXCIpIHJldHVybjtcbiAgb24uY2FsbCh3aW4sIGV2ZW50LCBsaXN0ZW5lcik7XG4gIHZpZXcuZGlzcG9zZUJpbmRpbmdzLnB1c2goKCkgPT4ge1xuICAgIGlmICh0eXBlb2Ygb2ZmID09PSBcImZ1bmN0aW9uXCIpIG9mZi5jYWxsKHdpbiwgZXZlbnQsIGxpc3RlbmVyKTtcbiAgICBlbHNlIGNhbGxPYmplY3RNZXRob2Qod2luLCBcInJlbW92ZUxpc3RlbmVyXCIsIFtldmVudCwgbGlzdGVuZXJdKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRCcmlkZ2VJZCh2YWx1ZTogc3RyaW5nLCBsYWJlbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIiB8fCAhL15bYS16QS1aMC05Ll8tXSskLy50ZXN0KHZhbHVlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgJHtsYWJlbH0gbWF5IG9ubHkgY29udGFpbiBsZXR0ZXJzLCBudW1iZXJzLCBkb3RzLCB1bmRlcnNjb3JlcywgYW5kIGRhc2hlc2ApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydEJvdW5kcyhib3VuZHM6IEVsZWN0cm9uLlJlY3RhbmdsZSk6IHZvaWQge1xuICBjb25zdCB2YWx1ZXMgPSBbYm91bmRzPy54LCBib3VuZHM/LnksIGJvdW5kcz8ud2lkdGgsIGJvdW5kcz8uaGVpZ2h0XTtcbiAgaWYgKCF2YWx1ZXMuZXZlcnkoKHZhbHVlKSA9PiB0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIgJiYgTnVtYmVyLmlzRmluaXRlKHZhbHVlKSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJib3VuZHMgbXVzdCBjb250YWluIGZpbml0ZSB4LCB5LCB3aWR0aCwgYW5kIGhlaWdodCBudW1iZXJzXCIpO1xuICB9XG4gIGlmIChib3VuZHMud2lkdGggPCAwIHx8IGJvdW5kcy5oZWlnaHQgPCAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiYm91bmRzIHdpZHRoIGFuZCBoZWlnaHQgbXVzdCBiZSBub24tbmVnYXRpdmVcIik7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBCcm93c2VyVmlldywgQnJvd3NlcldpbmRvdyB9IGZyb20gXCJlbGVjdHJvblwiO1xuaW1wb3J0IHsgQ09ERVhfV0lORE9XX1NFUlZJQ0VTX0tFWSB9IGZyb20gXCIuL3J1bnRpbWUtcGF0aHNcIjtcbmltcG9ydCB0eXBlIHsgQ29kZXhXaW5kb3dSZWYgfSBmcm9tIFwiQGNvZGV4LXBsdXNwbHVzL3Nka1wiO1xuaW1wb3J0IHsgaW5zcGVjdFdpbmRvd1NlcnZpY2VzIH0gZnJvbSBcIi4vY29kZXgtcnVudGltZS1wcm9iZVwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIENvZGV4V2luZG93U2VydmljZXMge1xuICBjcmVhdGVGcmVzaFdpbmRvdz86IChyb3V0ZT86IHN0cmluZykgPT4gUHJvbWlzZTxFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbD47XG4gIGNyZWF0ZUZyZXNoTG9jYWxXaW5kb3c/OiAocm91dGU/OiBzdHJpbmcpID0+IFByb21pc2U8RWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGw+O1xuICBlbnN1cmVIb3N0V2luZG93PzogKGhvc3RJZD86IHN0cmluZykgPT4gUHJvbWlzZTxFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbD47XG4gIGdldFByaW1hcnlXaW5kb3c/OiAoaG9zdElkPzogc3RyaW5nKSA9PiBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbDtcbiAgZ2V0Q29udGV4dD86IChob3N0SWQ6IHN0cmluZykgPT4geyByZWdpc3RlcldpbmRvdz86ICh3aW5kb3dMaWtlOiBDb2RleFdpbmRvd0xpa2UpID0+IHZvaWQgfSB8IG51bGw7XG4gIHdpbmRvd01hbmFnZXI/OiB7XG4gICAgY3JlYXRlV2luZG93PzogKG9wdHM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSA9PiBQcm9taXNlPEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsPjtcbiAgICBnZXRQcmltYXJ5V2luZG93PzogKCkgPT4gRWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGw7XG4gICAgcmVnaXN0ZXJXaW5kb3c/OiAoXG4gICAgICB3aW5kb3dMaWtlOiBDb2RleFdpbmRvd0xpa2UsXG4gICAgICBob3N0SWQ6IHN0cmluZyxcbiAgICAgIHByaW1hcnk6IGJvb2xlYW4sXG4gICAgICBhcHBlYXJhbmNlOiBzdHJpbmcsXG4gICAgKSA9PiB2b2lkO1xuICAgIG9wdGlvbnM/OiB7XG4gICAgICBhbGxvd0RldnRvb2xzPzogYm9vbGVhbjtcbiAgICAgIHByZWxvYWRQYXRoPzogc3RyaW5nO1xuICAgIH07XG4gIH07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29kZXhXaW5kb3dMaWtlIHtcbiAgaWQ6IG51bWJlcjtcbiAgd2ViQ29udGVudHM6IEVsZWN0cm9uLldlYkNvbnRlbnRzO1xuICBvbihldmVudDogXCJjbG9zZWRcIiwgbGlzdGVuZXI6ICgpID0+IHZvaWQpOiB1bmtub3duO1xuICBvbmNlPyhldmVudDogc3RyaW5nLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCk6IHVua25vd247XG4gIG9mZj8oZXZlbnQ6IHN0cmluZywgbGlzdGVuZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpOiB1bmtub3duO1xuICByZW1vdmVMaXN0ZW5lcj8oZXZlbnQ6IHN0cmluZywgbGlzdGVuZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpOiB1bmtub3duO1xuICBpc0Rlc3Ryb3llZD8oKTogYm9vbGVhbjtcbiAgaXNGb2N1c2VkPygpOiBib29sZWFuO1xuICBmb2N1cz8oKTogdm9pZDtcbiAgc2hvdz8oKTogdm9pZDtcbiAgaGlkZT8oKTogdm9pZDtcbiAgZ2V0Qm91bmRzPygpOiBFbGVjdHJvbi5SZWN0YW5nbGU7XG4gIGdldENvbnRlbnRCb3VuZHM/KCk6IEVsZWN0cm9uLlJlY3RhbmdsZTtcbiAgZ2V0U2l6ZT8oKTogW251bWJlciwgbnVtYmVyXTtcbiAgZ2V0Q29udGVudFNpemU/KCk6IFtudW1iZXIsIG51bWJlcl07XG4gIHNldFRpdGxlPyh0aXRsZTogc3RyaW5nKTogdm9pZDtcbiAgZ2V0VGl0bGU/KCk6IHN0cmluZztcbiAgc2V0UmVwcmVzZW50ZWRGaWxlbmFtZT8oZmlsZW5hbWU6IHN0cmluZyk6IHZvaWQ7XG4gIHNldERvY3VtZW50RWRpdGVkPyhlZGl0ZWQ6IGJvb2xlYW4pOiB2b2lkO1xuICBzZXRXaW5kb3dCdXR0b25WaXNpYmlsaXR5Pyh2aXNpYmxlOiBib29sZWFuKTogdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb2RleENyZWF0ZVdpbmRvd09wdGlvbnMge1xuICByb3V0ZTogc3RyaW5nO1xuICBob3N0SWQ/OiBzdHJpbmc7XG4gIHNob3c/OiBib29sZWFuO1xuICBhcHBlYXJhbmNlPzogc3RyaW5nO1xuICBwYXJlbnRXaW5kb3dJZD86IG51bWJlcjtcbiAgYm91bmRzPzogRWxlY3Ryb24uUmVjdGFuZ2xlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvZGV4Q3JlYXRlVmlld09wdGlvbnMge1xuICByb3V0ZTogc3RyaW5nO1xuICBob3N0SWQ/OiBzdHJpbmc7XG4gIGFwcGVhcmFuY2U/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcmltYXJ5Q29kZXhXaW5kb3coKTogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGwge1xuICBjb25zdCBzZXJ2aWNlcyA9IGdldENvZGV4V2luZG93U2VydmljZXMoKTtcbiAgY29uc3QgaW5zcGVjdGVkID0gaW5zcGVjdFdpbmRvd1NlcnZpY2VzKHNlcnZpY2VzKTtcbiAgY29uc3QgZnJvbVNlcnZpY2VzID0gaW5zcGVjdGVkLmdldFByaW1hcnlXaW5kb3dcbiAgICA/IHNlcnZpY2VzPy5nZXRQcmltYXJ5V2luZG93Py4oXCJsb2NhbFwiKSA/PyBudWxsXG4gICAgOiBudWxsO1xuICBpZiAoZnJvbVNlcnZpY2VzICYmICFmcm9tU2VydmljZXMuaXNEZXN0cm95ZWQoKSkgcmV0dXJuIGZyb21TZXJ2aWNlcztcbiAgY29uc3QgZnJvbU1hbmFnZXIgPSBpbnNwZWN0ZWQuZ2V0UHJpbWFyeVdpbmRvd0Zyb21NYW5hZ2VyXG4gICAgPyBzZXJ2aWNlcz8ud2luZG93TWFuYWdlcj8uZ2V0UHJpbWFyeVdpbmRvdz8uY2FsbChzZXJ2aWNlcy53aW5kb3dNYW5hZ2VyKSA/PyBudWxsXG4gICAgOiBudWxsO1xuICBpZiAoZnJvbU1hbmFnZXIgJiYgIWZyb21NYW5hZ2VyLmlzRGVzdHJveWVkKCkpIHJldHVybiBmcm9tTWFuYWdlcjtcbiAgY29uc3QgZm9jdXNlZCA9IEJyb3dzZXJXaW5kb3cuZ2V0Rm9jdXNlZFdpbmRvdygpO1xuICBpZiAoZm9jdXNlZCAmJiAhZm9jdXNlZC5pc0Rlc3Ryb3llZCgpKSByZXR1cm4gZm9jdXNlZDtcbiAgcmV0dXJuIEJyb3dzZXJXaW5kb3cuZ2V0QWxsV2luZG93cygpLmZpbmQoKHdpbikgPT4gIXdpbi5pc0Rlc3Ryb3llZCgpKSA/PyBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJpbWFyeUNvZGV4V2luZG93UmVmKCk6IENvZGV4V2luZG93UmVmIHwgbnVsbCB7XG4gIGNvbnN0IHdpbiA9IGdldFByaW1hcnlDb2RleFdpbmRvdygpO1xuICBpZiAoIXdpbiB8fCB3aW4uaXNEZXN0cm95ZWQoKSkgcmV0dXJuIG51bGw7XG4gIHJldHVybiB7IHdpbmRvd0lkOiB3aW4uaWQsIHdlYkNvbnRlbnRzSWQ6IHdpbi53ZWJDb250ZW50cy5pZCB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9jdXNDb2RleFdpbmRvdyh3aW5kb3dJZDogbnVtYmVyKTogYm9vbGVhbiB7XG4gIGNvbnN0IHdpbiA9IEJyb3dzZXJXaW5kb3cuZnJvbUlkKHdpbmRvd0lkKTtcbiAgaWYgKCF3aW4gfHwgd2luLmlzRGVzdHJveWVkKCkpIHJldHVybiBmYWxzZTtcbiAgaWYgKHdpbi5pc01pbmltaXplZCgpKSB3aW4ucmVzdG9yZSgpO1xuICB3aW4uc2hvdygpO1xuICB3aW4uZm9jdXMoKTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzaG93Q29kZXhXaW5kb3cod2luZG93SWQ6IG51bWJlcik6IGJvb2xlYW4ge1xuICBjb25zdCB3aW4gPSBCcm93c2VyV2luZG93LmZyb21JZCh3aW5kb3dJZCk7XG4gIGlmICghd2luIHx8IHdpbi5pc0Rlc3Ryb3llZCgpKSByZXR1cm4gZmFsc2U7XG4gIHdpbi5zaG93KCk7XG4gIHJldHVybiB0cnVlO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlQ29kZXhCcm93c2VyVmlldyhvcHRzOiBDb2RleENyZWF0ZVZpZXdPcHRpb25zKTogUHJvbWlzZTx1bmtub3duPiB7XG4gIGNvbnN0IHNlcnZpY2VzID0gZ2V0Q29kZXhXaW5kb3dTZXJ2aWNlcygpO1xuICBjb25zdCB3aW5kb3dNYW5hZ2VyID0gc2VydmljZXM/LndpbmRvd01hbmFnZXI7XG4gIGNvbnN0IGluc3BlY3RlZCA9IGluc3BlY3RXaW5kb3dTZXJ2aWNlcyhzZXJ2aWNlcyk7XG4gIGlmICghc2VydmljZXMgfHwgIXdpbmRvd01hbmFnZXI/LnJlZ2lzdGVyV2luZG93IHx8ICFpbnNwZWN0ZWQucmVnaXN0ZXJXaW5kb3cpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBcIkNvZGV4IGVtYmVkZGVkIHZpZXcgc2VydmljZXMgYXJlIG5vdCBhdmFpbGFibGUuIFJlaW5zdGFsbCBDb2RleCsrIDEuMC4wIG9yIGxhdGVyLlwiLFxuICAgICk7XG4gIH1cblxuICBjb25zdCByb3V0ZSA9IG5vcm1hbGl6ZUNvZGV4Um91dGUob3B0cy5yb3V0ZSk7XG4gIGNvbnN0IGhvc3RJZCA9IG9wdHMuaG9zdElkIHx8IFwibG9jYWxcIjtcbiAgY29uc3QgYXBwZWFyYW5jZSA9IG9wdHMuYXBwZWFyYW5jZSB8fCBcInNlY29uZGFyeVwiO1xuICBjb25zdCB2aWV3ID0gbmV3IEJyb3dzZXJWaWV3KHtcbiAgICB3ZWJQcmVmZXJlbmNlczoge1xuICAgICAgcHJlbG9hZDogd2luZG93TWFuYWdlci5vcHRpb25zPy5wcmVsb2FkUGF0aCxcbiAgICAgIGNvbnRleHRJc29sYXRpb246IHRydWUsXG4gICAgICBub2RlSW50ZWdyYXRpb246IGZhbHNlLFxuICAgICAgc3BlbGxjaGVjazogZmFsc2UsXG4gICAgICBkZXZUb29sczogd2luZG93TWFuYWdlci5vcHRpb25zPy5hbGxvd0RldnRvb2xzLFxuICAgIH0sXG4gIH0pO1xuICBjb25zdCB3aW5kb3dMaWtlID0gbWFrZVdpbmRvd0xpa2VGb3JWaWV3KHZpZXcpO1xuICB3aW5kb3dNYW5hZ2VyLnJlZ2lzdGVyV2luZG93KHdpbmRvd0xpa2UsIGhvc3RJZCwgZmFsc2UsIGFwcGVhcmFuY2UpO1xuICBzZXJ2aWNlcy5nZXRDb250ZXh0Py4oaG9zdElkKT8ucmVnaXN0ZXJXaW5kb3c/Lih3aW5kb3dMaWtlKTtcbiAgYXdhaXQgdmlldy53ZWJDb250ZW50cy5sb2FkVVJMKGNvZGV4QXBwVXJsKHJvdXRlLCBob3N0SWQpKTtcbiAgcmV0dXJuIHZpZXc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVDb2RleFdpbmRvdyhvcHRzOiBDb2RleENyZWF0ZVdpbmRvd09wdGlvbnMpOiBQcm9taXNlPENvZGV4V2luZG93UmVmPiB7XG4gIGNvbnN0IHNlcnZpY2VzID0gZ2V0Q29kZXhXaW5kb3dTZXJ2aWNlcygpO1xuICBjb25zdCBpbnNwZWN0ZWQgPSBpbnNwZWN0V2luZG93U2VydmljZXMoc2VydmljZXMpO1xuICBpZiAoIXNlcnZpY2VzIHx8ICFpbnNwZWN0ZWQucHJlc2VudCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIFwiQ29kZXggd2luZG93IHNlcnZpY2VzIGFyZSBub3QgYXZhaWxhYmxlLiBSZWluc3RhbGwgQ29kZXgrKyAxLjAuMCBvciBsYXRlci5cIixcbiAgICApO1xuICB9XG5cbiAgY29uc3Qgcm91dGUgPSBub3JtYWxpemVDb2RleFJvdXRlKG9wdHMucm91dGUpO1xuICBjb25zdCBob3N0SWQgPSBvcHRzLmhvc3RJZCB8fCBcImxvY2FsXCI7XG4gIGNvbnN0IHBhcmVudCA9IHR5cGVvZiBvcHRzLnBhcmVudFdpbmRvd0lkID09PSBcIm51bWJlclwiXG4gICAgPyBCcm93c2VyV2luZG93LmZyb21JZChvcHRzLnBhcmVudFdpbmRvd0lkKVxuICAgIDogQnJvd3NlcldpbmRvdy5nZXRGb2N1c2VkV2luZG93KCk7XG4gIGNvbnN0IGNyZWF0ZVdpbmRvdyA9IHNlcnZpY2VzLndpbmRvd01hbmFnZXI/LmNyZWF0ZVdpbmRvdztcblxuICBsZXQgd2luOiBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbCB8IHVuZGVmaW5lZDtcbiAgaWYgKGluc3BlY3RlZC5jcmVhdGVXaW5kb3cgJiYgdHlwZW9mIGNyZWF0ZVdpbmRvdyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgd2luID0gYXdhaXQgY3JlYXRlV2luZG93LmNhbGwoc2VydmljZXMud2luZG93TWFuYWdlciwge1xuICAgICAgaW5pdGlhbFJvdXRlOiByb3V0ZSxcbiAgICAgIGhvc3RJZCxcbiAgICAgIHNob3c6IG9wdHMuc2hvdyAhPT0gZmFsc2UsXG4gICAgICBhcHBlYXJhbmNlOiBvcHRzLmFwcGVhcmFuY2UgfHwgXCJzZWNvbmRhcnlcIixcbiAgICAgIHBhcmVudCxcbiAgICB9KTtcbiAgfSBlbHNlIGlmIChob3N0SWQgPT09IFwibG9jYWxcIiAmJiBpbnNwZWN0ZWQuY3JlYXRlRnJlc2hXaW5kb3cgJiYgdHlwZW9mIHNlcnZpY2VzLmNyZWF0ZUZyZXNoV2luZG93ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICB3aW4gPSBhd2FpdCBzZXJ2aWNlcy5jcmVhdGVGcmVzaFdpbmRvdyhyb3V0ZSk7XG4gIH0gZWxzZSBpZiAoaG9zdElkID09PSBcImxvY2FsXCIgJiYgaW5zcGVjdGVkLmNyZWF0ZUZyZXNoTG9jYWxXaW5kb3cgJiYgdHlwZW9mIHNlcnZpY2VzLmNyZWF0ZUZyZXNoTG9jYWxXaW5kb3cgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHdpbiA9IGF3YWl0IHNlcnZpY2VzLmNyZWF0ZUZyZXNoTG9jYWxXaW5kb3cocm91dGUpO1xuICB9IGVsc2UgaWYgKGluc3BlY3RlZC5lbnN1cmVIb3N0V2luZG93ICYmIHR5cGVvZiBzZXJ2aWNlcy5lbnN1cmVIb3N0V2luZG93ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICB3aW4gPSBhd2FpdCBzZXJ2aWNlcy5lbnN1cmVIb3N0V2luZG93KGhvc3RJZCk7XG4gIH1cblxuICBpZiAoIXdpbiB8fCB3aW4uaXNEZXN0cm95ZWQoKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNvZGV4IGRpZCBub3QgcmV0dXJuIGEgd2luZG93IGZvciB0aGUgcmVxdWVzdGVkIHJvdXRlXCIpO1xuICB9XG5cbiAgaWYgKG9wdHMuYm91bmRzKSB7XG4gICAgd2luLnNldEJvdW5kcyhvcHRzLmJvdW5kcyk7XG4gIH1cbiAgaWYgKHBhcmVudCAmJiAhcGFyZW50LmlzRGVzdHJveWVkKCkpIHtcbiAgICB0cnkge1xuICAgICAgd2luLnNldFBhcmVudFdpbmRvdyhwYXJlbnQpO1xuICAgIH0gY2F0Y2gge31cbiAgfVxuICBpZiAob3B0cy5zaG93ICE9PSBmYWxzZSkge1xuICAgIHdpbi5zaG93KCk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHdpbmRvd0lkOiB3aW4uaWQsXG4gICAgd2ViQ29udGVudHNJZDogd2luLndlYkNvbnRlbnRzLmlkLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFrZVdpbmRvd0xpa2VGb3JWaWV3KHZpZXc6IEVsZWN0cm9uLkJyb3dzZXJWaWV3KTogQ29kZXhXaW5kb3dMaWtlIHtcbiAgY29uc3Qgdmlld0JvdW5kcyA9ICgpID0+IHZpZXcuZ2V0Qm91bmRzKCk7XG4gIHJldHVybiB7XG4gICAgaWQ6IHZpZXcud2ViQ29udGVudHMuaWQsXG4gICAgd2ViQ29udGVudHM6IHZpZXcud2ViQ29udGVudHMsXG4gICAgb246IChldmVudDogXCJjbG9zZWRcIiwgbGlzdGVuZXI6ICgpID0+IHZvaWQpID0+IHtcbiAgICAgIGlmIChldmVudCA9PT0gXCJjbG9zZWRcIikge1xuICAgICAgICB2aWV3LndlYkNvbnRlbnRzLm9uY2UoXCJkZXN0cm95ZWRcIiwgbGlzdGVuZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmlldy53ZWJDb250ZW50cy5vbihldmVudCwgbGlzdGVuZXIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHZpZXc7XG4gICAgfSxcbiAgICBvbmNlOiAoZXZlbnQ6IHN0cmluZywgbGlzdGVuZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpID0+IHtcbiAgICAgIHZpZXcud2ViQ29udGVudHMub25jZShldmVudCBhcyBcImRlc3Ryb3llZFwiLCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gdmlldztcbiAgICB9LFxuICAgIG9mZjogKGV2ZW50OiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKSA9PiB7XG4gICAgICB2aWV3LndlYkNvbnRlbnRzLm9mZihldmVudCBhcyBcImRlc3Ryb3llZFwiLCBsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gdmlldztcbiAgICB9LFxuICAgIHJlbW92ZUxpc3RlbmVyOiAoZXZlbnQ6IHN0cmluZywgbGlzdGVuZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpID0+IHtcbiAgICAgIHZpZXcud2ViQ29udGVudHMucmVtb3ZlTGlzdGVuZXIoZXZlbnQgYXMgXCJkZXN0cm95ZWRcIiwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHZpZXc7XG4gICAgfSxcbiAgICBpc0Rlc3Ryb3llZDogKCkgPT4gdmlldy53ZWJDb250ZW50cy5pc0Rlc3Ryb3llZCgpLFxuICAgIGlzRm9jdXNlZDogKCkgPT4gdmlldy53ZWJDb250ZW50cy5pc0ZvY3VzZWQoKSxcbiAgICBmb2N1czogKCkgPT4gdmlldy53ZWJDb250ZW50cy5mb2N1cygpLFxuICAgIHNob3c6ICgpID0+IHt9LFxuICAgIGhpZGU6ICgpID0+IHt9LFxuICAgIGdldEJvdW5kczogdmlld0JvdW5kcyxcbiAgICBnZXRDb250ZW50Qm91bmRzOiB2aWV3Qm91bmRzLFxuICAgIGdldFNpemU6ICgpID0+IHtcbiAgICAgIGNvbnN0IGIgPSB2aWV3Qm91bmRzKCk7XG4gICAgICByZXR1cm4gW2Iud2lkdGgsIGIuaGVpZ2h0XTtcbiAgICB9LFxuICAgIGdldENvbnRlbnRTaXplOiAoKSA9PiB7XG4gICAgICBjb25zdCBiID0gdmlld0JvdW5kcygpO1xuICAgICAgcmV0dXJuIFtiLndpZHRoLCBiLmhlaWdodF07XG4gICAgfSxcbiAgICBzZXRUaXRsZTogKCkgPT4ge30sXG4gICAgZ2V0VGl0bGU6ICgpID0+IFwiXCIsXG4gICAgc2V0UmVwcmVzZW50ZWRGaWxlbmFtZTogKCkgPT4ge30sXG4gICAgc2V0RG9jdW1lbnRFZGl0ZWQ6ICgpID0+IHt9LFxuICAgIHNldFdpbmRvd0J1dHRvblZpc2liaWxpdHk6ICgpID0+IHt9LFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY29kZXhBcHBVcmwocm91dGU6IHN0cmluZywgaG9zdElkOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKFwiYXBwOi8vLS9pbmRleC5odG1sXCIpO1xuICB1cmwuc2VhcmNoUGFyYW1zLnNldChcImhvc3RJZFwiLCBob3N0SWQpO1xuICBpZiAocm91dGUgIT09IFwiL1wiKSB1cmwuc2VhcmNoUGFyYW1zLnNldChcImluaXRpYWxSb3V0ZVwiLCByb3V0ZSk7XG4gIHJldHVybiB1cmwudG9TdHJpbmcoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZU93bFZpZXdVcmwodXJsOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAodHlwZW9mIHVybCAhPT0gXCJzdHJpbmdcIiB8fCB1cmwuaW5jbHVkZXMoXCJcXG5cIikgfHwgdXJsLmluY2x1ZGVzKFwiXFxyXCIpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiT3dsIHZpZXcgVVJMIG11c3QgYmUgYSBzdHJpbmcgd2l0aG91dCBjb250cm9sIGNoYXJhY3RlcnNcIik7XG4gIH1cbiAgY29uc3QgcGFyc2VkID0gbmV3IFVSTCh1cmwpO1xuICBpZiAoIVtcImh0dHA6XCIsIFwiaHR0cHM6XCIsIFwiYXBwOlwiLCBcImZpbGU6XCIsIFwiZGF0YTpcIiwgXCJhYm91dDpcIl0uaW5jbHVkZXMocGFyc2VkLnByb3RvY29sKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgdW5zdXBwb3J0ZWQgT3dsIHZpZXcgVVJMIHByb3RvY29sOiAke3BhcnNlZC5wcm90b2NvbH1gKTtcbiAgfVxuICByZXR1cm4gcGFyc2VkLnRvU3RyaW5nKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb2RleFdpbmRvd1NlcnZpY2VzKCk6IENvZGV4V2luZG93U2VydmljZXMgfCBudWxsIHtcbiAgY29uc3Qgc2VydmljZXMgPSAoZ2xvYmFsVGhpcyBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVtDT0RFWF9XSU5ET1dfU0VSVklDRVNfS0VZXTtcbiAgcmV0dXJuIHNlcnZpY2VzICYmIHR5cGVvZiBzZXJ2aWNlcyA9PT0gXCJvYmplY3RcIiA/IChzZXJ2aWNlcyBhcyBDb2RleFdpbmRvd1NlcnZpY2VzKSA6IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVDb2RleFJvdXRlKHJvdXRlOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAodHlwZW9mIHJvdXRlICE9PSBcInN0cmluZ1wiIHx8ICFyb3V0ZS5zdGFydHNXaXRoKFwiL1wiKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNvZGV4IHJvdXRlIG11c3QgYmUgYW4gYWJzb2x1dGUgYXBwIHJvdXRlXCIpO1xuICB9XG4gIGlmIChyb3V0ZS5pbmNsdWRlcyhcIjovL1wiKSB8fCByb3V0ZS5pbmNsdWRlcyhcIlxcblwiKSB8fCByb3V0ZS5pbmNsdWRlcyhcIlxcclwiKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNvZGV4IHJvdXRlIG11c3Qgbm90IGluY2x1ZGUgYSBwcm90b2NvbCBvciBjb250cm9sIGNoYXJhY3RlcnNcIik7XG4gIH1cbiAgcmV0dXJuIHJvdXRlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXNSZWNvcmQodmFsdWU6IHVua25vd24pOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IG51bGwge1xuICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiID8gdmFsdWUgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gOiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2FsbE9iamVjdE1ldGhvZCh0YXJnZXQ6IHVua25vd24sIG1ldGhvZDogc3RyaW5nLCBhcmdzOiB1bmtub3duW10pOiB1bmtub3duIHtcbiAgY29uc3QgZm4gPSBhc1JlY29yZCh0YXJnZXQpPy5bbWV0aG9kXTtcbiAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm4gdW5kZWZpbmVkO1xuICByZXR1cm4gZm4uYXBwbHkodGFyZ2V0LCBhcmdzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzV2luZG93RGVzdHJveWVkKHdpbjogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGwgfCB1bmRlZmluZWQpOiBib29sZWFuIHtcbiAgaWYgKCF3aW4pIHJldHVybiB0cnVlO1xuICBjb25zdCBmbiA9IGFzUmVjb3JkKHdpbik/LmlzRGVzdHJveWVkO1xuICBpZiAodHlwZW9mIGZuICE9PSBcImZ1bmN0aW9uXCIpIHJldHVybiBmYWxzZTtcbiAgdHJ5IHtcbiAgICByZXR1cm4gQm9vbGVhbihmbi5jYWxsKHdpbikpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gd2luZG93SWRGb3Iod2luOiBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbCB8IHVuZGVmaW5lZCk6IG51bWJlciB8IG51bGwge1xuICBjb25zdCBpZCA9IGFzUmVjb3JkKHdpbik/LmlkO1xuICByZXR1cm4gdHlwZW9mIGlkID09PSBcIm51bWJlclwiID8gaWQgOiBudWxsO1xufVxuIiwgImltcG9ydCB7IGlwY01haW4sIHdlYkNvbnRlbnRzIH0gZnJvbSBcImVsZWN0cm9uXCI7XG5pbXBvcnQgeyBleGlzdHNTeW5jLCByZWFscGF0aFN5bmMgfSBmcm9tIFwibm9kZTpmc1wiO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gXCJub2RlOnBhdGhcIjtcbmltcG9ydCB7IGRpc2NvdmVyVHdlYWtzLCB0eXBlIERpc2NvdmVyZWRUd2VhayB9IGZyb20gXCIuL3R3ZWFrLWRpc2NvdmVyeVwiO1xuaW1wb3J0IHsgY3JlYXRlRGlza1N0b3JhZ2UsIHR5cGUgRGlza1N0b3JhZ2UgfSBmcm9tIFwiLi9zdG9yYWdlXCI7XG5pbXBvcnQgeyBzeW5jTWFuYWdlZE1jcFNlcnZlcnMgfSBmcm9tIFwiLi9tY3Atc3luY1wiO1xuaW1wb3J0IHtcbiAgaXNNYWluUHJvY2Vzc1R3ZWFrU2NvcGUsXG4gIHJlbG9hZFR3ZWFrcyxcbiAgdHlwZSBTZXRUd2Vha0VuYWJsZWRBbmRSZWxvYWREZXBzLFxufSBmcm9tIFwiLi90d2Vhay1saWZlY3ljbGVcIjtcbmltcG9ydCB7IE5hdGl2ZUJyaWRnZSwgdHlwZSBOYXRpdmVUd2Vha0NvbnRleHQgfSBmcm9tIFwiLi9uYXRpdmUtYnJpZGdlXCI7XG5pbXBvcnQgeyBpc1BhdGhJbnNpZGUgfSBmcm9tIFwiLi9uYXRpdmUtcGF0aHNcIjtcbmltcG9ydCB7XG4gIGdldENkcFN0YXR1cyxcbiAgZ2V0UnVudGltZUNhcGFiaWxpdGllcyxcbiAgZ2V0UnVudGltZUluZm8sXG4gIGxpc3RDZHBUYXJnZXRzLFxuICB3aW5kb3dTYW1wbGVGcm9tLFxufSBmcm9tIFwiLi9jb2RleC1ydW50aW1lLXByb2JlXCI7XG5pbXBvcnQgdHlwZSB7XG4gIENvZGV4QXBpLFxuICBDb2RleFJ1bnRpbWVDYXBhYmlsaXRpZXMsXG4gIENvZGV4UnVudGltZUluZm8sXG4gIENvZGV4Vmlld0NyZWF0ZU9wdGlvbnMsXG4gIE5hdGl2ZUhlbHBlckxhdW5jaE9wdGlvbnMsXG4gIE5hdGl2ZU1vZHVsZUxvYWRPcHRpb25zLFxuICBOYXRpdmVQYW5lbENyZWF0ZU9wdGlvbnMsXG4gIE5hdGl2ZVZpZXdBdHRhY2hPcHRpb25zLFxuICBUd2Vha0ZzLFxuICBUd2Vha0lwYyxcbiAgVHdlYWtNYW5pZmVzdCxcbiAgVHdlYWtQZXJtaXNzaW9uLFxufSBmcm9tIFwiQGNvZGV4LXBsdXNwbHVzL3Nka1wiO1xuaW1wb3J0IHtcbiAgYXNzZXJ0VHdlYWtIYXNQZXJtaXNzaW9uLFxuICBhc3NlcnRWYWxpZFR3ZWFrSWQsXG4gIGF1dGhvcml6ZVR3ZWFrQ2FwYWJpbGl0eSxcbiAgY3JlYXRlRGVuaWVkQXN5bmNNZXRob2QsXG4gIGNyZWF0ZURlbmllZFR3ZWFrRnMsXG4gIGNyZWF0ZURlbmllZFR3ZWFrSXBjLFxuICBoYXNBbnlDb2RleEFwaSxcbiAgaGFzVHdlYWtQZXJtaXNzaW9uLFxuICBzY29wZWRUd2Vha0lwY0NoYW5uZWwsXG4gIHR3ZWFrQXBpU3VyZmFjZSxcbiAgdHlwZSBUd2Vha0lkZW50aXR5U25hcHNob3QsXG59IGZyb20gXCIuL3R3ZWFrLXBlcm1pc3Npb25zXCI7XG5pbXBvcnQgeyBlbnN1cmVUd2Vha0RhdGFEaXIsIHJlc29sdmVUd2Vha0RhdGFQYXRoIH0gZnJvbSBcIi4vdHdlYWstZnMtc2FuZGJveFwiO1xuaW1wb3J0IHtcbiAgaXNUd2Vha0VuYWJsZWQsXG4gIHJlYWRJbnN0YWxsZXJTdGF0ZSxcbiAgcmVhZFN0YXRlLFxuICBzZXRUd2Vha0VuYWJsZWQsXG4gIHdyaXRlU3RhdGUsXG4gIHR5cGUgVHdlYWtVcGRhdGVDaGVjayxcbn0gZnJvbSBcIi4vY29uZmlnLXN0YXRlXCI7XG5pbXBvcnQge1xuICBhc3NlcnRTdG9yZUVudHJ5UGxhdGZvcm1Db21wYXRpYmxlLFxuICBhc3NlcnRTdG9yZUVudHJ5UnVudGltZUNvbXBhdGlibGUsXG4gIGNvbXBhcmVWZXJzaW9ucyxcbiAgZmV0Y2hUd2Vha1N0b3JlUmVnaXN0cnksXG4gIGluc3RhbGxTdG9yZVR3ZWFrLFxuICBub3JtYWxpemVWZXJzaW9uLFxufSBmcm9tIFwiLi9zdG9yZS1pbnN0YWxsXCI7XG5pbXBvcnQgeyBub3JtYWxpemVHaXRIdWJSZXBvIH0gZnJvbSBcIi4vdHdlYWstc3RvcmVcIjtcbmltcG9ydCB7XG4gIENPREVYX0NPTkZJR19GSUxFLFxuICBUV0VBS1NfRElSLFxuICBsb2csXG4gIHJ1bnRpbWVEaXIsXG4gIHVzZXJSb290LFxufSBmcm9tIFwiLi9ydW50aW1lLXBhdGhzXCI7XG5pbXBvcnQge1xuICBjcmVhdGVDb2RleEJyb3dzZXJWaWV3LFxuICBjcmVhdGVDb2RleFdpbmRvdyxcbiAgZm9jdXNDb2RleFdpbmRvdyxcbiAgZ2V0Q29kZXhXaW5kb3dTZXJ2aWNlcyxcbiAgZ2V0UHJpbWFyeUNvZGV4V2luZG93LFxuICBnZXRQcmltYXJ5Q29kZXhXaW5kb3dSZWYsXG4gIHNob3dDb2RleFdpbmRvdyxcbn0gZnJvbSBcIi4vY29kZXgtd2luZG93c1wiO1xuaW1wb3J0IHtcbiAgY3JlYXRlT3dsVmlldyxcbiAgZGlzcG9zZU93bFZpZXdzRm9yVHdlYWssXG59IGZyb20gXCIuL293bC12aWV3c1wiO1xuXG5jb25zdCBVUERBVEVfQ0hFQ0tfSU5URVJWQUxfTVMgPSAyNCAqIDYwICogNjAgKiAxMDAwO1xuXG5leHBvcnQgaW50ZXJmYWNlIExvYWRlZE1haW5Ud2VhayB7XG4gIHN0b3A/OiAoKSA9PiB2b2lkO1xuICBzdG9yYWdlOiBEaXNrU3RvcmFnZTtcbn1cblxuZXhwb3J0IGNvbnN0IHR3ZWFrU3RhdGUgPSB7XG4gIGRpc2NvdmVyZWQ6IFtdIGFzIERpc2NvdmVyZWRUd2Vha1tdLFxuICBsb2FkZWRNYWluOiBuZXcgTWFwPHN0cmluZywgTG9hZGVkTWFpblR3ZWFrPigpLFxufTtcblxuZXhwb3J0IGNvbnN0IG5hdGl2ZUJyaWRnZSA9IG5ldyBOYXRpdmVCcmlkZ2UobG9nLCB7XG4gIG5hdGl2ZUhvc3RQYXRoOiBqb2luKHJ1bnRpbWVEaXIsIFwibmF0aXZlXCIsIFwiY29kZXhwcF9uYXRpdmVfaG9zdC5ub2RlXCIpLFxufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBsb2FkQWxsTWFpblR3ZWFrcygpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICB0d2Vha1N0YXRlLmRpc2NvdmVyZWQgPSBkaXNjb3ZlclR3ZWFrcyhUV0VBS1NfRElSKTtcbiAgICBsb2coXG4gICAgICBcImluZm9cIixcbiAgICAgIGBkaXNjb3ZlcmVkICR7dHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLmxlbmd0aH0gdHdlYWsocyk6YCxcbiAgICAgIHR3ZWFrU3RhdGUuZGlzY292ZXJlZC5tYXAoKHQpID0+IHQubWFuaWZlc3QuaWQpLmpvaW4oXCIsIFwiKSxcbiAgICApO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nKFwiZXJyb3JcIiwgXCJ0d2VhayBkaXNjb3ZlcnkgZmFpbGVkOlwiLCBlKTtcbiAgICB0d2Vha1N0YXRlLmRpc2NvdmVyZWQgPSBbXTtcbiAgfVxuXG4gIHN5bmNNY3BTZXJ2ZXJzRnJvbUVuYWJsZWRUd2Vha3MoKTtcblxuICBmb3IgKGNvbnN0IHQgb2YgdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkKSB7XG4gICAgaWYgKCFpc01haW5Qcm9jZXNzVHdlYWtTY29wZSh0Lm1hbmlmZXN0LnNjb3BlKSkgY29udGludWU7XG4gICAgaWYgKCFpc1R3ZWFrRW5hYmxlZCh0Lm1hbmlmZXN0LmlkKSkge1xuICAgICAgbG9nKFwiaW5mb1wiLCBgc2tpcHBpbmcgZGlzYWJsZWQgbWFpbiB0d2VhazogJHt0Lm1hbmlmZXN0LmlkfWApO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBtb2QgPSByZXF1aXJlKHQuZW50cnkpO1xuICAgICAgY29uc3QgdHdlYWsgPSBtb2QuZGVmYXVsdCA/PyBtb2Q7XG4gICAgICBpZiAodHlwZW9mIHR3ZWFrPy5zdGFydCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGNvbnN0IHN0b3JhZ2UgPSBjcmVhdGVEaXNrU3RvcmFnZSh1c2VyUm9vdCEsIHQubWFuaWZlc3QuaWQpO1xuICAgICAgICB0d2Vhay5zdGFydCh7XG4gICAgICAgICAgbWFuaWZlc3Q6IHQubWFuaWZlc3QsXG4gICAgICAgICAgcHJvY2VzczogXCJtYWluXCIsXG4gICAgICAgICAgbG9nOiBtYWtlTG9nZ2VyKHQubWFuaWZlc3QuaWQpLFxuICAgICAgICAgIHN0b3JhZ2UsXG4gICAgICAgICAgaXBjOiBtYWtlTWFpbklwYyh0Lm1hbmlmZXN0KSxcbiAgICAgICAgICBmczogbWFrZU1haW5Gcyh0Lm1hbmlmZXN0KSxcbiAgICAgICAgICBjb2RleDogbWFrZUNvZGV4QXBpKHQpLFxuICAgICAgICB9KTtcbiAgICAgICAgdHdlYWtTdGF0ZS5sb2FkZWRNYWluLnNldCh0Lm1hbmlmZXN0LmlkLCB7XG4gICAgICAgICAgc3RvcDogdHdlYWsuc3RvcCxcbiAgICAgICAgICBzdG9yYWdlLFxuICAgICAgICB9KTtcbiAgICAgICAgbG9nKFwiaW5mb1wiLCBgc3RhcnRlZCBtYWluIHR3ZWFrOiAke3QubWFuaWZlc3QuaWR9YCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nKFwiZXJyb3JcIiwgYHR3ZWFrICR7dC5tYW5pZmVzdC5pZH0gZmFpbGVkIHRvIHN0YXJ0OmAsIGUpO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc3luY01jcFNlcnZlcnNGcm9tRW5hYmxlZFR3ZWFrcygpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXN1bHQgPSBzeW5jTWFuYWdlZE1jcFNlcnZlcnMoe1xuICAgICAgY29uZmlnUGF0aDogQ09ERVhfQ09ORklHX0ZJTEUsXG4gICAgICB0d2Vha3M6IHR3ZWFrU3RhdGUuZGlzY292ZXJlZC5maWx0ZXIoKHQpID0+IGlzVHdlYWtFbmFibGVkKHQubWFuaWZlc3QuaWQpKSxcbiAgICB9KTtcbiAgICBpZiAocmVzdWx0LmNoYW5nZWQpIHtcbiAgICAgIGxvZyhcImluZm9cIiwgYHN5bmNlZCBDb2RleCBNQ1AgY29uZmlnOiAke3Jlc3VsdC5zZXJ2ZXJOYW1lcy5qb2luKFwiLCBcIikgfHwgXCJub25lXCJ9YCk7XG4gICAgfVxuICAgIGlmIChyZXN1bHQuc2tpcHBlZFNlcnZlck5hbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGxvZyhcbiAgICAgICAgXCJpbmZvXCIsXG4gICAgICAgIGBza2lwcGVkIENvZGV4KysgbWFuYWdlZCBNQ1Agc2VydmVyKHMpIGFscmVhZHkgY29uZmlndXJlZCBieSB1c2VyOiAke3Jlc3VsdC5za2lwcGVkU2VydmVyTmFtZXMuam9pbihcIiwgXCIpfWAsXG4gICAgICApO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZyhcIndhcm5cIiwgXCJmYWlsZWQgdG8gc3luYyBDb2RleCBNQ1AgY29uZmlnOlwiLCBlKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RvcEFsbE1haW5Ud2Vha3MoKTogdm9pZCB7XG4gIGZvciAoY29uc3QgW2lkLCB0XSBvZiB0d2Vha1N0YXRlLmxvYWRlZE1haW4pIHtcbiAgICB0cnkge1xuICAgICAgdC5zdG9wPy4oKTtcbiAgICAgIHQuc3RvcmFnZS5mbHVzaCgpO1xuICAgICAgbG9nKFwiaW5mb1wiLCBgc3RvcHBlZCBtYWluIHR3ZWFrOiAke2lkfWApO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZyhcIndhcm5cIiwgYHN0b3AgZmFpbGVkIGZvciAke2lkfTpgLCBlKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgbmF0aXZlQnJpZGdlLmRpc3Bvc2VUd2VhayhpZCk7XG4gICAgICBkaXNwb3NlT3dsVmlld3NGb3JUd2VhayhpZCk7XG4gICAgfVxuICB9XG4gIHR3ZWFrU3RhdGUubG9hZGVkTWFpbi5jbGVhcigpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xlYXJUd2Vha01vZHVsZUNhY2hlKCk6IHZvaWQge1xuICBjb25zdCByb290U2V0ID0gbmV3IFNldDxzdHJpbmc+KFtUV0VBS1NfRElSLCBzYWZlUmVhbHBhdGgoVFdFQUtTX0RJUildKTtcbiAgY29uc3QgZW50cnlTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCB0d2VhayBvZiB0d2Vha1N0YXRlLmRpc2NvdmVyZWQpIHtcbiAgICByb290U2V0LmFkZCh0d2Vhay5kaXIpO1xuICAgIHJvb3RTZXQuYWRkKHNhZmVSZWFscGF0aCh0d2Vhay5kaXIpKTtcbiAgICBlbnRyeVNldC5hZGQodHdlYWsuZW50cnkpO1xuICAgIGVudHJ5U2V0LmFkZChzYWZlUmVhbHBhdGgodHdlYWsuZW50cnkpKTtcbiAgfVxuXG4gIGNvbnN0IHJvb3RzID0gWy4uLnJvb3RTZXRdO1xuICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhyZXF1aXJlLmNhY2hlKSkge1xuICAgIGNvbnN0IHJlYWxLZXkgPSBzYWZlUmVhbHBhdGgoa2V5KTtcbiAgICBjb25zdCBpc1R3ZWFrTW9kdWxlID1cbiAgICAgIGVudHJ5U2V0LmhhcyhrZXkpIHx8XG4gICAgICBlbnRyeVNldC5oYXMocmVhbEtleSkgfHxcbiAgICAgIHJvb3RzLnNvbWUoKHJvb3QpID0+IGlzUGF0aEluc2lkZShyb290LCBrZXkpIHx8IGlzUGF0aEluc2lkZShyb290LCByZWFsS2V5KSk7XG4gICAgaWYgKGlzVHdlYWtNb2R1bGUpIGRlbGV0ZSByZXF1aXJlLmNhY2hlW2tleV07XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNhZmVSZWFscGF0aChmaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gcmVhbHBhdGhTeW5jKGZpbGVQYXRoKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZpbGVQYXRoO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0ZWRUd2Vha3NTbmFwc2hvdCgpIHtcbiAgY29uc3QgdXBkYXRlQ2hlY2tzID0gcmVhZFN0YXRlKCkudHdlYWtVcGRhdGVDaGVja3MgPz8ge307XG4gIHJldHVybiB0d2Vha1N0YXRlLmRpc2NvdmVyZWQubWFwKCh0KSA9PiAoe1xuICAgIG1hbmlmZXN0OiB0Lm1hbmlmZXN0LFxuICAgIGVudHJ5OiB0LmVudHJ5LFxuICAgIGRpcjogdC5kaXIsXG4gICAgZW50cnlFeGlzdHM6IGV4aXN0c1N5bmModC5lbnRyeSksXG4gICAgZW5hYmxlZDogaXNUd2Vha0VuYWJsZWQodC5tYW5pZmVzdC5pZCksXG4gICAgdXBkYXRlOiB1cGRhdGVDaGVja3NbdC5tYW5pZmVzdC5pZF0gPz8gbnVsbCxcbiAgfSkpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZW5zdXJlVHdlYWtVcGRhdGVDaGVjayh0OiBEaXNjb3ZlcmVkVHdlYWssIGZvcmNlID0gZmFsc2UpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgaWQgPSB0Lm1hbmlmZXN0LmlkO1xuICBjb25zdCByZXBvID0gdC5tYW5pZmVzdC5naXRodWJSZXBvO1xuICBpZiAoIXJlcG8pIHJldHVybjtcbiAgY29uc3Qgc3RhdGUgPSByZWFkU3RhdGUoKTtcbiAgY29uc3QgY2FjaGVkID0gc3RhdGUudHdlYWtVcGRhdGVDaGVja3M/LltpZF07XG4gIGlmIChcbiAgICAhZm9yY2UgJiZcbiAgICBjYWNoZWQgJiZcbiAgICBjYWNoZWQucmVwbyA9PT0gcmVwbyAmJlxuICAgIGNhY2hlZC5jdXJyZW50VmVyc2lvbiA9PT0gdC5tYW5pZmVzdC52ZXJzaW9uICYmXG4gICAgRGF0ZS5ub3coKSAtIERhdGUucGFyc2UoY2FjaGVkLmNoZWNrZWRBdCkgPCBVUERBVEVfQ0hFQ0tfSU5URVJWQUxfTVNcbiAgKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgbGV0IGNoZWNrOiBUd2Vha1VwZGF0ZUNoZWNrO1xuICB0cnkge1xuICAgIGNvbnN0IHsgcmVnaXN0cnkgfSA9IGF3YWl0IGZldGNoVHdlYWtTdG9yZVJlZ2lzdHJ5KCk7XG4gICAgY29uc3QgZW50cnkgPSByZWdpc3RyeS5lbnRyaWVzLmZpbmQoKGNhbmRpZGF0ZSkgPT4gY2FuZGlkYXRlLmlkID09PSBpZCk7XG4gICAgaWYgKCFlbnRyeSkge1xuICAgICAgY2hlY2sgPSB7XG4gICAgICAgIGNoZWNrZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICByZXBvLFxuICAgICAgICBjdXJyZW50VmVyc2lvbjogdC5tYW5pZmVzdC52ZXJzaW9uLFxuICAgICAgICBsYXRlc3RWZXJzaW9uOiBudWxsLFxuICAgICAgICBsYXRlc3RUYWc6IG51bGwsXG4gICAgICAgIHJlbGVhc2VVcmw6IG51bGwsXG4gICAgICAgIHVwZGF0ZUF2YWlsYWJsZTogZmFsc2UsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBsYXRlc3RWZXJzaW9uID0gbm9ybWFsaXplVmVyc2lvbihlbnRyeS5tYW5pZmVzdC52ZXJzaW9uKTtcbiAgICAgIGNoZWNrID0ge1xuICAgICAgICBjaGVja2VkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgcmVwbyxcbiAgICAgICAgY3VycmVudFZlcnNpb246IHQubWFuaWZlc3QudmVyc2lvbixcbiAgICAgICAgbGF0ZXN0VmVyc2lvbixcbiAgICAgICAgbGF0ZXN0VGFnOiBudWxsLFxuICAgICAgICByZWxlYXNlVXJsOiBlbnRyeS5yZWxlYXNlVXJsID8/IGBodHRwczovL2dpdGh1Yi5jb20vJHtyZXBvfS9yZWxlYXNlc2AsXG4gICAgICAgIHVwZGF0ZUF2YWlsYWJsZTogY29tcGFyZVZlcnNpb25zKGxhdGVzdFZlcnNpb24sIG5vcm1hbGl6ZVZlcnNpb24odC5tYW5pZmVzdC52ZXJzaW9uKSkgPiAwLFxuICAgICAgICBwaW5uZWRTaGE6IGVudHJ5LmFwcHJvdmVkQ29tbWl0U2hhLFxuICAgICAgfTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjaGVjayA9IHtcbiAgICAgIGNoZWNrZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgcmVwbyxcbiAgICAgIGN1cnJlbnRWZXJzaW9uOiB0Lm1hbmlmZXN0LnZlcnNpb24sXG4gICAgICBsYXRlc3RWZXJzaW9uOiBudWxsLFxuICAgICAgbGF0ZXN0VGFnOiBudWxsLFxuICAgICAgcmVsZWFzZVVybDogbnVsbCxcbiAgICAgIHVwZGF0ZUF2YWlsYWJsZTogZmFsc2UsXG4gICAgICBlcnJvcjogZSBpbnN0YW5jZW9mIEVycm9yID8gZS5tZXNzYWdlIDogU3RyaW5nKGUpLFxuICAgIH07XG4gIH1cbiAgc3RhdGUudHdlYWtVcGRhdGVDaGVja3MgPz89IHt9O1xuICBzdGF0ZS50d2Vha1VwZGF0ZUNoZWNrc1tpZF0gPSBjaGVjaztcbiAgd3JpdGVTdGF0ZShzdGF0ZSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnN0YWxsR2l0aHViUmVsZWFzZVR3ZWFrKGlkOiBzdHJpbmcpOiBQcm9taXNlPHtcbiAgaW5zdGFsbGVkOiBzdHJpbmc7XG4gIHZlcnNpb246IHN0cmluZztcbiAgY29tbWl0U2hhOiBzdHJpbmc7XG59PiB7XG4gIGNvbnN0IHR3ZWFrID0gdHdlYWtTdGF0ZS5kaXNjb3ZlcmVkLmZpbmQoKGl0ZW0pID0+IGl0ZW0ubWFuaWZlc3QuaWQgPT09IGlkKTtcbiAgaWYgKCF0d2VhaykgdGhyb3cgbmV3IEVycm9yKGB1bmtub3duIHR3ZWFrOiAke2lkfWApO1xuICBpZiAoIXR3ZWFrLm1hbmlmZXN0LmdpdGh1YlJlcG8pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYCR7dHdlYWsubWFuaWZlc3QubmFtZX0gaGFzIG5vIGdpdGh1YlJlcG8gaW4gaXRzIG1hbmlmZXN0YCk7XG4gIH1cblxuICBsZXQgcmVwbzogc3RyaW5nO1xuICB0cnkge1xuICAgIHJlcG8gPSBub3JtYWxpemVHaXRIdWJSZXBvKHR3ZWFrLm1hbmlmZXN0LmdpdGh1YlJlcG8pO1xuICB9IGNhdGNoIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYCR7dHdlYWsubWFuaWZlc3QubmFtZX0gaGFzIGFuIGludmFsaWQgZ2l0aHViUmVwbzogJHt0d2Vhay5tYW5pZmVzdC5naXRodWJSZXBvfWApO1xuICB9XG5cbiAgY29uc3QgeyByZWdpc3RyeSB9ID0gYXdhaXQgZmV0Y2hUd2Vha1N0b3JlUmVnaXN0cnkoKTtcbiAgY29uc3Qgc3RvcmVFbnRyeSA9IHJlZ2lzdHJ5LmVudHJpZXMuZmluZCgoZW50cnkpID0+IHtcbiAgICBpZiAoZW50cnkuaWQgIT09IGlkKSByZXR1cm4gZmFsc2U7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBub3JtYWxpemVHaXRIdWJSZXBvKGVudHJ5LnJlcG8pID09PSByZXBvO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGVudHJ5LnJlcG8gPT09IHJlcG87XG4gICAgfVxuICB9KTtcbiAgaWYgKCFzdG9yZUVudHJ5KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYCR7dHdlYWsubWFuaWZlc3QubmFtZX0gaXMgbm90IGxpc3RlZCBpbiB0aGUgQ2hhdEdQVCBMYXllciB0d2VhayBzdG9yZSwgc28gaXQgY2FuJ3QgYmUgdXBkYXRlZCBmcm9tIEdpdEh1Yi5gLFxuICAgICk7XG4gIH1cblxuICBhc3NlcnRTdG9yZUVudHJ5UGxhdGZvcm1Db21wYXRpYmxlKHN0b3JlRW50cnkpO1xuICBhc3NlcnRTdG9yZUVudHJ5UnVudGltZUNvbXBhdGlibGUoc3RvcmVFbnRyeSk7XG4gIGF3YWl0IGluc3RhbGxTdG9yZVR3ZWFrKHN0b3JlRW50cnkpO1xuICByZWxvYWRUd2Vha3MoXCJzdG9yZS1waW4taW5zdGFsbFwiLCB0d2Vha0xpZmVjeWNsZURlcHMpO1xuICBjb25zdCBpbnN0YWxsZWQgPSB0d2Vha1N0YXRlLmRpc2NvdmVyZWQuZmluZCgoaXRlbSkgPT4gaXRlbS5tYW5pZmVzdC5pZCA9PT0gaWQpID8/IHR3ZWFrO1xuICBhd2FpdCBlbnN1cmVUd2Vha1VwZGF0ZUNoZWNrKGluc3RhbGxlZCwgdHJ1ZSk7XG4gIHJldHVybiB7IGluc3RhbGxlZDogaWQsIHZlcnNpb246IHN0b3JlRW50cnkubWFuaWZlc3QudmVyc2lvbiwgY29tbWl0U2hhOiBzdG9yZUVudHJ5LmFwcHJvdmVkQ29tbWl0U2hhIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBicm9hZGNhc3RSZWxvYWQoKTogdm9pZCB7XG4gIGNvbnN0IHBheWxvYWQgPSB7XG4gICAgYXQ6IERhdGUubm93KCksXG4gICAgdHdlYWtzOiB0d2Vha1N0YXRlLmRpc2NvdmVyZWQubWFwKCh0KSA9PiB0Lm1hbmlmZXN0LmlkKSxcbiAgfTtcbiAgZm9yIChjb25zdCB3YyBvZiB3ZWJDb250ZW50cy5nZXRBbGxXZWJDb250ZW50cygpKSB7XG4gICAgdHJ5IHtcbiAgICAgIHdjLnNlbmQoXCJjb2RleHBwOnR3ZWFrcy1jaGFuZ2VkXCIsIHBheWxvYWQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZyhcIndhcm5cIiwgXCJicm9hZGNhc3Qgc2VuZCBmYWlsZWQ6XCIsIGUpO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFrZUxvZ2dlcihzY29wZTogc3RyaW5nKSB7XG4gIHJldHVybiB7XG4gICAgZGVidWc6ICguLi5hOiB1bmtub3duW10pID0+IGxvZyhcImluZm9cIiwgYFske3Njb3BlfV1gLCAuLi5hKSxcbiAgICBpbmZvOiAoLi4uYTogdW5rbm93bltdKSA9PiBsb2coXCJpbmZvXCIsIGBbJHtzY29wZX1dYCwgLi4uYSksXG4gICAgd2FybjogKC4uLmE6IHVua25vd25bXSkgPT4gbG9nKFwid2FyblwiLCBgWyR7c2NvcGV9XWAsIC4uLmEpLFxuICAgIGVycm9yOiAoLi4uYTogdW5rbm93bltdKSA9PiBsb2coXCJlcnJvclwiLCBgWyR7c2NvcGV9XWAsIC4uLmEpLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFrZU1haW5JcGMobWFuaWZlc3Q6IFR3ZWFrTWFuaWZlc3QpOiBUd2Vha0lwYyB7XG4gIGlmICghaGFzVHdlYWtQZXJtaXNzaW9uKG1hbmlmZXN0LCBcImlwY1wiKSkgcmV0dXJuIGNyZWF0ZURlbmllZFR3ZWFrSXBjKG1hbmlmZXN0LmlkKTtcbiAgY29uc3QgaWQgPSBtYW5pZmVzdC5pZDtcbiAgY29uc3QgY2ggPSAoYzogc3RyaW5nKSA9PiBzY29wZWRUd2Vha0lwY0NoYW5uZWwoaWQsIGMpO1xuICByZXR1cm4ge1xuICAgIG9uOiAoYzogc3RyaW5nLCBoOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKSA9PiB7XG4gICAgICBjb25zdCB3cmFwcGVkID0gKF9lOiB1bmtub3duLCAuLi5hcmdzOiB1bmtub3duW10pID0+IGgoLi4uYXJncyk7XG4gICAgICBpcGNNYWluLm9uKGNoKGMpLCB3cmFwcGVkKTtcbiAgICAgIHJldHVybiAoKSA9PiBpcGNNYWluLnJlbW92ZUxpc3RlbmVyKGNoKGMpLCB3cmFwcGVkIGFzIG5ldmVyKTtcbiAgICB9LFxuICAgIHNlbmQ6IChfYzogc3RyaW5nKSA9PiB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpcGMuc2VuZCBpcyByZW5kZXJlclx1MjE5Mm1haW47IG1haW4gc2lkZSB1c2VzIGhhbmRsZS9vblwiKTtcbiAgICB9LFxuICAgIGludm9rZTogKF9jOiBzdHJpbmcpID0+IHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImlwYy5pbnZva2UgaXMgcmVuZGVyZXJcdTIxOTJtYWluOyBtYWluIHNpZGUgdXNlcyBoYW5kbGVcIik7XG4gICAgfSxcbiAgICBoYW5kbGU6IChjOiBzdHJpbmcsIGhhbmRsZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHVua25vd24pID0+IHtcbiAgICAgIGlwY01haW4uaGFuZGxlKGNoKGMpLCAoX2U6IHVua25vd24sIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gaGFuZGxlciguLi5hcmdzKSk7XG4gICAgfSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VNYWluRnMobWFuaWZlc3Q6IFR3ZWFrTWFuaWZlc3QpOiBUd2Vha0ZzIHtcbiAgaWYgKCFoYXNUd2Vha1Blcm1pc3Npb24obWFuaWZlc3QsIFwiZmlsZXN5c3RlbVwiKSkgcmV0dXJuIGNyZWF0ZURlbmllZFR3ZWFrRnMobWFuaWZlc3QuaWQpO1xuICBjb25zdCBpZCA9IG1hbmlmZXN0LmlkO1xuICBjb25zdCBkaXIgPSBlbnN1cmVUd2Vha0RhdGFEaXIodXNlclJvb3QhLCBpZCk7XG4gIGNvbnN0IGZzID0gcmVxdWlyZShcIm5vZGU6ZnMvcHJvbWlzZXNcIikgYXMgdHlwZW9mIGltcG9ydChcIm5vZGU6ZnMvcHJvbWlzZXNcIik7XG4gIHJldHVybiB7XG4gICAgZGF0YURpcjogZGlyLFxuICAgIHJlYWQ6IChwOiBzdHJpbmcpID0+IGZzLnJlYWRGaWxlKHJlc29sdmVUd2Vha0RhdGFQYXRoKHVzZXJSb290ISwgaWQsIHApLmZ1bGwsIFwidXRmOFwiKSxcbiAgICB3cml0ZTogKHA6IHN0cmluZywgYzogc3RyaW5nKSA9PiBmcy53cml0ZUZpbGUocmVzb2x2ZVR3ZWFrRGF0YVBhdGgodXNlclJvb3QhLCBpZCwgcCkuZnVsbCwgYywgXCJ1dGY4XCIpLFxuICAgIGV4aXN0czogYXN5bmMgKHA6IHN0cmluZykgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZnMuYWNjZXNzKHJlc29sdmVUd2Vha0RhdGFQYXRoKHVzZXJSb290ISwgaWQsIHApLmZ1bGwpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGN1cnJlbnRSdW50aW1lSW5mbygpOiBDb2RleFJ1bnRpbWVJbmZvIHtcbiAgY29uc3QgaW5zdGFsbGVyU3RhdGUgPSByZWFkSW5zdGFsbGVyU3RhdGUoKTtcbiAgcmV0dXJuIGdldFJ1bnRpbWVJbmZvKHtcbiAgICB1c2VyUm9vdDogdXNlclJvb3QhLFxuICAgIHJ1bnRpbWVEaXI6IHJ1bnRpbWVEaXIhLFxuICAgIGNvZGV4VmVyc2lvbjogaW5zdGFsbGVyU3RhdGU/LmNvZGV4VmVyc2lvbiA/PyBudWxsLFxuICAgIGNoYW5uZWw6IG51bGwsXG4gICAgZ2V0V2luZG93U2VydmljZXM6IGdldENvZGV4V2luZG93U2VydmljZXMsXG4gICAgZW52OiBsaXZlUHJvYmVFbnYoKSxcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjdXJyZW50UnVudGltZUNhcGFiaWxpdGllcygpOiBDb2RleFJ1bnRpbWVDYXBhYmlsaXRpZXMge1xuICBjb25zdCBpbnN0YWxsZXJTdGF0ZSA9IHJlYWRJbnN0YWxsZXJTdGF0ZSgpO1xuICByZXR1cm4gZ2V0UnVudGltZUNhcGFiaWxpdGllcyh7XG4gICAgdXNlclJvb3Q6IHVzZXJSb290ISxcbiAgICBydW50aW1lRGlyOiBydW50aW1lRGlyISxcbiAgICBjb2RleFZlcnNpb246IGluc3RhbGxlclN0YXRlPy5jb2RleFZlcnNpb24gPz8gbnVsbCxcbiAgICBjaGFubmVsOiBudWxsLFxuICAgIGdldFdpbmRvd1NlcnZpY2VzOiBnZXRDb2RleFdpbmRvd1NlcnZpY2VzLFxuICAgIGdldE5hdGl2ZUNhcGFiaWxpdGllczogKCkgPT4gbmF0aXZlQnJpZGdlLmdldENhcGFiaWxpdGllcygpLFxuICAgIGVudjogbGl2ZVByb2JlRW52KCksXG4gIH0pO1xufVxuXG5mdW5jdGlvbiBsaXZlUHJvYmVFbnYoKSB7XG4gIHJldHVybiB7XG4gICAgaW5zcGVjdEV4aXN0aW5nV2luZG93OiAoKSA9PiB3aW5kb3dTYW1wbGVGcm9tKGdldFByaW1hcnlDb2RleFdpbmRvdygpKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHR3ZWFrQ29udGV4dCh0d2Vha0lkOiBzdHJpbmcsIHBlcm1pc3Npb24/OiBUd2Vha1Blcm1pc3Npb24pOiBOYXRpdmVUd2Vha0NvbnRleHQge1xuICBjb25zdCB0d2VhayA9IHBlcm1pc3Npb25cbiAgICA/IGFzc2VydEF1dGhvcml6ZWRUd2Vhayh0d2Vha0lkLCBwZXJtaXNzaW9uKVxuICAgIDogdHdlYWtCeUlkKHR3ZWFrSWQpO1xuICByZXR1cm4geyBpZDogdHdlYWsubWFuaWZlc3QuaWQsIGRpcjogdHdlYWsuZGlyIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkaXNjb3ZlcmVkVHdlYWtTbmFwc2hvdCh0d2Vha0lkOiBzdHJpbmcpOiBUd2Vha0lkZW50aXR5U25hcHNob3QgfCB1bmRlZmluZWQge1xuICBjb25zdCB0d2VhayA9IHR3ZWFrU3RhdGUuZGlzY292ZXJlZC5maW5kKChpdGVtKSA9PiBpdGVtLm1hbmlmZXN0LmlkID09PSB0d2Vha0lkKTtcbiAgaWYgKCF0d2VhaykgcmV0dXJuIHVuZGVmaW5lZDtcbiAgcmV0dXJuIHtcbiAgICBpZDogdHdlYWsubWFuaWZlc3QuaWQsXG4gICAgZW5hYmxlZDogaXNUd2Vha0VuYWJsZWQodHdlYWsubWFuaWZlc3QuaWQpLFxuICAgIGRpcjogdHdlYWsuZGlyLFxuICAgIG1hbmlmZXN0OiB0d2Vhay5tYW5pZmVzdCxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHR3ZWFrQnlJZCh0d2Vha0lkOiBzdHJpbmcpOiBEaXNjb3ZlcmVkVHdlYWsge1xuICBjb25zdCBzbmFwc2hvdCA9IGF1dGhvcml6ZUVuYWJsZWRUd2Vhayh0d2Vha0lkKTtcbiAgY29uc3QgdHdlYWsgPSB0d2Vha1N0YXRlLmRpc2NvdmVyZWQuZmluZCgoaXRlbSkgPT4gaXRlbS5tYW5pZmVzdC5pZCA9PT0gc25hcHNob3QuaWQpO1xuICBpZiAoIXR3ZWFrKSB0aHJvdyBuZXcgRXJyb3IoYHVua25vd24gdHdlYWs6ICR7dHdlYWtJZH1gKTtcbiAgcmV0dXJuIHR3ZWFrO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXV0aG9yaXplRW5hYmxlZFR3ZWFrKHR3ZWFrSWQ6IHVua25vd24pOiBUd2Vha0lkZW50aXR5U25hcHNob3Qge1xuICBhc3NlcnRWYWxpZFR3ZWFrSWQodHdlYWtJZCk7XG4gIGNvbnN0IHNuYXBzaG90ID0gZGlzY292ZXJlZFR3ZWFrU25hcHNob3QodHdlYWtJZCk7XG4gIGlmICghc25hcHNob3QpIHRocm93IG5ldyBFcnJvcihgdW5rbm93biB0d2VhazogJHt0d2Vha0lkfWApO1xuICBpZiAoIXNuYXBzaG90LmVuYWJsZWQpIHRocm93IG5ldyBFcnJvcihgdHdlYWsgaXMgZGlzYWJsZWQ6ICR7dHdlYWtJZH1gKTtcbiAgcmV0dXJuIHNuYXBzaG90O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0QXV0aG9yaXplZFR3ZWFrKFxuICB0d2Vha0lkOiB1bmtub3duLFxuICBwZXJtaXNzaW9uOiBUd2Vha1Blcm1pc3Npb24sXG4gIG93bmVySWQ/OiBzdHJpbmcsXG4pOiBEaXNjb3ZlcmVkVHdlYWsge1xuICBjb25zdCBzbmFwc2hvdCA9IGF1dGhvcml6ZVR3ZWFrQ2FwYWJpbGl0eShcbiAgICB0eXBlb2YgdHdlYWtJZCA9PT0gXCJzdHJpbmdcIiA/IGRpc2NvdmVyZWRUd2Vha1NuYXBzaG90KHR3ZWFrSWQpIDogdW5kZWZpbmVkLFxuICAgIHR3ZWFrSWQsXG4gICAgcGVybWlzc2lvbixcbiAgICBvd25lcklkLFxuICApO1xuICBjb25zdCB0d2VhayA9IHR3ZWFrU3RhdGUuZGlzY292ZXJlZC5maW5kKChpdGVtKSA9PiBpdGVtLm1hbmlmZXN0LmlkID09PSBzbmFwc2hvdC5pZCk7XG4gIGlmICghdHdlYWspIHRocm93IG5ldyBFcnJvcihgdW5rbm93biB0d2VhazogJHtTdHJpbmcodHdlYWtJZCl9YCk7XG4gIHJldHVybiB0d2Vhaztcbn1cblxuLyoqIEBkZXByZWNhdGVkIFVzZSBhc3NlcnRBdXRob3JpemVkVHdlYWsgKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRUd2Vha1Blcm1pc3Npb25Gb3JJZCh0d2Vha0lkOiBzdHJpbmcsIHBlcm1pc3Npb246IFR3ZWFrUGVybWlzc2lvbik6IERpc2NvdmVyZWRUd2VhayB7XG4gIHJldHVybiBhc3NlcnRBdXRob3JpemVkVHdlYWsodHdlYWtJZCwgcGVybWlzc2lvbik7XG59XG5cbi8qKiBAZGVwcmVjYXRlZCBVc2UgYXNzZXJ0QXV0aG9yaXplZFR3ZWFrKHR3ZWFrSWQsIFwiY29kZXgtdmlld3NcIikgKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRUd2Vha1ZpZXdQZXJtaXNzaW9uRm9ySWQodHdlYWtJZDogc3RyaW5nKTogRGlzY292ZXJlZFR3ZWFrIHtcbiAgcmV0dXJuIGFzc2VydEF1dGhvcml6ZWRUd2Vhayh0d2Vha0lkLCBcImNvZGV4LXZpZXdzXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0VHdlYWtQZXJtaXNzaW9uKHR3ZWFrOiBEaXNjb3ZlcmVkVHdlYWssIHBlcm1pc3Npb246IFR3ZWFrUGVybWlzc2lvbik6IHZvaWQge1xuICBhc3NlcnRUd2Vha0hhc1Blcm1pc3Npb24odHdlYWsubWFuaWZlc3QsIHBlcm1pc3Npb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0VHdlYWtWaWV3UGVybWlzc2lvbih0d2VhazogRGlzY292ZXJlZFR3ZWFrKTogdm9pZCB7XG4gIGFzc2VydFR3ZWFrSGFzUGVybWlzc2lvbih0d2Vhay5tYW5pZmVzdCwgXCJjb2RleC12aWV3c1wiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFR3ZWFrSWQodHdlYWtJZDogc3RyaW5nKTogdm9pZCB7XG4gIGFzc2VydFZhbGlkVHdlYWtJZCh0d2Vha0lkKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VDb2RleEFwaSh0d2VhazogRGlzY292ZXJlZFR3ZWFrKTogQ29kZXhBcGkgfCB1bmRlZmluZWQge1xuICBjb25zdCBzdXJmYWNlID0gdHdlYWtBcGlTdXJmYWNlKHR3ZWFrLm1hbmlmZXN0KTtcbiAgaWYgKCFoYXNBbnlDb2RleEFwaShzdXJmYWNlKSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgY29uc3QgY3R4ID0gKCk6IE5hdGl2ZVR3ZWFrQ29udGV4dCA9PiAoeyBpZDogdHdlYWsubWFuaWZlc3QuaWQsIGRpcjogdHdlYWsuZGlyIH0pO1xuICBjb25zdCBkZW55ID0gKHBlcm1pc3Npb246IFR3ZWFrUGVybWlzc2lvbikgPT4gY3JlYXRlRGVuaWVkQXN5bmNNZXRob2QodHdlYWsubWFuaWZlc3QuaWQsIHBlcm1pc3Npb24pO1xuICBjb25zdCBndWFyZCA9IDxBIGV4dGVuZHMgdW5rbm93bltdLCBSPihcbiAgICBwZXJtaXNzaW9uOiBUd2Vha1Blcm1pc3Npb24sXG4gICAgZm46ICguLi5hcmdzOiBBKSA9PiBSIHwgUHJvbWlzZTxSPixcbiAgKTogKCguLi5hcmdzOiBBKSA9PiBQcm9taXNlPFI+KSA9PiB7XG4gICAgcmV0dXJuIGFzeW5jICguLi5hcmdzOiBBKSA9PiB7XG4gICAgICBhc3NlcnRUd2Vha0hhc1Blcm1pc3Npb24odHdlYWsubWFuaWZlc3QsIHBlcm1pc3Npb24pO1xuICAgICAgcmV0dXJuIGF3YWl0IGZuKC4uLmFyZ3MpO1xuICAgIH07XG4gIH07XG4gIHJldHVybiB7XG4gICAgcnVudGltZToge1xuICAgICAgZ2V0SW5mbzogc3VyZmFjZS5jb2RleFJ1bnRpbWUgPyBhc3luYyAoKSA9PiBjdXJyZW50UnVudGltZUluZm8oKSA6IGRlbnkoXCJjb2RleC1ydW50aW1lXCIpLFxuICAgICAgZ2V0Q2FwYWJpbGl0aWVzOiBzdXJmYWNlLmNvZGV4UnVudGltZSA/IGFzeW5jICgpID0+IGN1cnJlbnRSdW50aW1lQ2FwYWJpbGl0aWVzKCkgOiBkZW55KFwiY29kZXgtcnVudGltZVwiKSxcbiAgICB9LFxuICAgIHdpbmRvd3M6IHtcbiAgICAgIGNyZWF0ZTogc3VyZmFjZS5jb2RleFdpbmRvd3MgPyBndWFyZChcImNvZGV4LXdpbmRvd3NcIiwgY3JlYXRlQ29kZXhXaW5kb3cpIDogZGVueShcImNvZGV4LXdpbmRvd3NcIiksXG4gICAgICBnZXRQcmltYXJ5OiBzdXJmYWNlLmNvZGV4V2luZG93cyA/IGFzeW5jICgpID0+IGdldFByaW1hcnlDb2RleFdpbmRvd1JlZigpIDogZGVueShcImNvZGV4LXdpbmRvd3NcIiksXG4gICAgICBmb2N1czogc3VyZmFjZS5jb2RleFdpbmRvd3NcbiAgICAgICAgPyBndWFyZChcImNvZGV4LXdpbmRvd3NcIiwgYXN5bmMgKHdpbmRvd0lkOiBudW1iZXIpID0+IGZvY3VzQ29kZXhXaW5kb3cod2luZG93SWQpKVxuICAgICAgICA6IGRlbnkoXCJjb2RleC13aW5kb3dzXCIpLFxuICAgICAgc2hvdzogc3VyZmFjZS5jb2RleFdpbmRvd3NcbiAgICAgICAgPyBndWFyZChcImNvZGV4LXdpbmRvd3NcIiwgYXN5bmMgKHdpbmRvd0lkOiBudW1iZXIpID0+IHNob3dDb2RleFdpbmRvdyh3aW5kb3dJZCkpXG4gICAgICAgIDogZGVueShcImNvZGV4LXdpbmRvd3NcIiksXG4gICAgfSxcbiAgICB2aWV3czoge1xuICAgICAgY3JlYXRlOiBzdXJmYWNlLmNvZGV4Vmlld3NcbiAgICAgICAgPyBndWFyZChcImNvZGV4LXZpZXdzXCIsIChvcHRpb25zOiBDb2RleFZpZXdDcmVhdGVPcHRpb25zKSA9PiBjcmVhdGVPd2xWaWV3KGN0eCgpLCBvcHRpb25zKSlcbiAgICAgICAgOiBkZW55KFwiY29kZXgtdmlld3NcIiksXG4gICAgfSxcbiAgICBjZHA6IHtcbiAgICAgIGdldFN0YXR1czogc3VyZmFjZS5jb2RleENkcCA/IGFzeW5jICgpID0+IGdldENkcFN0YXR1cygpIDogZGVueShcImNvZGV4LWNkcFwiKSxcbiAgICAgIGxpc3RUYXJnZXRzOiBzdXJmYWNlLmNvZGV4Q2RwID8gYXN5bmMgKCkgPT4gbGlzdENkcFRhcmdldHMoKSA6IGRlbnkoXCJjb2RleC1jZHBcIiksXG4gICAgfSxcbiAgICBuYXRpdmU6IHtcbiAgICAgIGxvYWRNb2R1bGU6IHN1cmZhY2UubmF0aXZlTW9kdWxlXG4gICAgICAgID8gZ3VhcmQoXCJuYXRpdmUtbW9kdWxlXCIsIGFzeW5jIChvcHRpb25zOiBOYXRpdmVNb2R1bGVMb2FkT3B0aW9ucykgPT4gbmF0aXZlQnJpZGdlLmxvYWRNb2R1bGUoY3R4KCksIG9wdGlvbnMpKVxuICAgICAgICA6IGRlbnkoXCJuYXRpdmUtbW9kdWxlXCIpLFxuICAgICAgY3JlYXRlUGFuZWw6IHN1cmZhY2UubmF0aXZlVmlld1xuICAgICAgICA/IGd1YXJkKFwibmF0aXZlLXZpZXdcIiwgKG9wdGlvbnM6IE5hdGl2ZVBhbmVsQ3JlYXRlT3B0aW9ucykgPT4gbmF0aXZlQnJpZGdlLmNyZWF0ZVBhbmVsKGN0eCgpLCBvcHRpb25zKSlcbiAgICAgICAgOiBkZW55KFwibmF0aXZlLXZpZXdcIiksXG4gICAgICBhdHRhY2hWaWV3OiBzdXJmYWNlLm5hdGl2ZVZpZXdcbiAgICAgICAgPyBndWFyZChcIm5hdGl2ZS12aWV3XCIsIChvcHRpb25zOiBOYXRpdmVWaWV3QXR0YWNoT3B0aW9ucykgPT4gbmF0aXZlQnJpZGdlLmF0dGFjaFZpZXcoY3R4KCksIG9wdGlvbnMpKVxuICAgICAgICA6IGRlbnkoXCJuYXRpdmUtdmlld1wiKSxcbiAgICAgIGxhdW5jaEhlbHBlcjogc3VyZmFjZS5uYXRpdmVIZWxwZXJcbiAgICAgICAgPyBndWFyZChcIm5hdGl2ZS1oZWxwZXJcIiwgYXN5bmMgKG9wdGlvbnM6IE5hdGl2ZUhlbHBlckxhdW5jaE9wdGlvbnMpID0+IG5hdGl2ZUJyaWRnZS5sYXVuY2hIZWxwZXIoY3R4KCksIG9wdGlvbnMpKVxuICAgICAgICA6IGRlbnkoXCJuYXRpdmUtaGVscGVyXCIpLFxuICAgIH0sXG4gICAgY3JlYXRlQnJvd3NlclZpZXc6IHN1cmZhY2UuY29kZXhWaWV3c1xuICAgICAgPyBndWFyZChcImNvZGV4LXZpZXdzXCIsIGNyZWF0ZUNvZGV4QnJvd3NlclZpZXcpXG4gICAgICA6IGRlbnkoXCJjb2RleC12aWV3c1wiKSxcbiAgICBjcmVhdGVXaW5kb3c6IHN1cmZhY2UuY29kZXhXaW5kb3dzID8gZ3VhcmQoXCJjb2RleC13aW5kb3dzXCIsIGNyZWF0ZUNvZGV4V2luZG93KSA6IGRlbnkoXCJjb2RleC13aW5kb3dzXCIpLFxuICB9O1xufVxuXG5cbmV4cG9ydCBjb25zdCB0d2Vha0xpZmVjeWNsZURlcHM6IFNldFR3ZWFrRW5hYmxlZEFuZFJlbG9hZERlcHMgPSB7XG4gIGxvZ0luZm86IChtZXNzYWdlOiBzdHJpbmcpID0+IGxvZyhcImluZm9cIiwgbWVzc2FnZSksXG4gIHNldFR3ZWFrRW5hYmxlZCxcbiAgc3RvcEFsbE1haW5Ud2Vha3MsXG4gIGNsZWFyVHdlYWtNb2R1bGVDYWNoZSxcbiAgbG9hZEFsbE1haW5Ud2Vha3MsXG4gIGJyb2FkY2FzdFJlbG9hZCxcbn07XG4iLCAiLyoqXG4gKiBEaXNjb3ZlciB0d2Vha3MgdW5kZXIgPHVzZXJSb290Pi90d2Vha3MuIEVhY2ggdHdlYWsgaXMgYSBkaXJlY3Rvcnkgd2l0aCBhXG4gKiBtYW5pZmVzdC5qc29uIGFuZCBhbiBlbnRyeSBzY3JpcHQuIEVudHJ5IHJlc29sdXRpb24gaXMgbWFuaWZlc3QubWFpbiBmaXJzdCxcbiAqIHRoZW4gaW5kZXguanMsIGluZGV4Lm1qcywgYW5kIGluZGV4LmNqcy5cbiAqXG4gKiBUaGUgbWFuaWZlc3QgZ2F0ZSBpcyBpbnRlbnRpb25hbGx5IHN0cmljdC4gQSB0d2VhayBtdXN0IGlkZW50aWZ5IGl0cyBHaXRIdWJcbiAqIHJlcG9zaXRvcnkgc28gdGhlIG1hbmFnZXIgY2FuIGNoZWNrIHJlbGVhc2VzIHdpdGhvdXQgZ3JhbnRpbmcgdGhlIHR3ZWFrIGFuXG4gKiB1cGRhdGUvaW5zdGFsbCBjaGFubmVsLiBVcGRhdGUgY2hlY2tzIGFyZSBhZHZpc29yeSBvbmx5LlxuICovXG5pbXBvcnQgeyByZWFkZGlyU3luYywgc3RhdFN5bmMsIHJlYWRGaWxlU3luYywgZXhpc3RzU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuaW1wb3J0IHR5cGUgeyBUd2Vha01hbmlmZXN0IH0gZnJvbSBcIkBjb2RleC1wbHVzcGx1cy9zZGtcIjtcblxuZXhwb3J0IGludGVyZmFjZSBEaXNjb3ZlcmVkVHdlYWsge1xuICBkaXI6IHN0cmluZztcbiAgZW50cnk6IHN0cmluZztcbiAgbWFuaWZlc3Q6IFR3ZWFrTWFuaWZlc3Q7XG59XG5cbmNvbnN0IEVOVFJZX0NBTkRJREFURVMgPSBbXCJpbmRleC5qc1wiLCBcImluZGV4LmNqc1wiLCBcImluZGV4Lm1qc1wiXTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRpc2NvdmVyVHdlYWtzKHR3ZWFrc0Rpcjogc3RyaW5nKTogRGlzY292ZXJlZFR3ZWFrW10ge1xuICBpZiAoIWV4aXN0c1N5bmModHdlYWtzRGlyKSkgcmV0dXJuIFtdO1xuICBjb25zdCBvdXQ6IERpc2NvdmVyZWRUd2Vha1tdID0gW107XG4gIGZvciAoY29uc3QgbmFtZSBvZiByZWFkZGlyU3luYyh0d2Vha3NEaXIpKSB7XG4gICAgY29uc3QgZGlyID0gam9pbih0d2Vha3NEaXIsIG5hbWUpO1xuICAgIGlmICghc3RhdFN5bmMoZGlyKS5pc0RpcmVjdG9yeSgpKSBjb250aW51ZTtcbiAgICBjb25zdCBtYW5pZmVzdFBhdGggPSBqb2luKGRpciwgXCJtYW5pZmVzdC5qc29uXCIpO1xuICAgIGlmICghZXhpc3RzU3luYyhtYW5pZmVzdFBhdGgpKSBjb250aW51ZTtcbiAgICBsZXQgbWFuaWZlc3Q6IFR3ZWFrTWFuaWZlc3Q7XG4gICAgdHJ5IHtcbiAgICAgIG1hbmlmZXN0ID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMobWFuaWZlc3RQYXRoLCBcInV0ZjhcIikpIGFzIFR3ZWFrTWFuaWZlc3Q7XG4gICAgfSBjYXRjaCB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKCFpc1ZhbGlkTWFuaWZlc3QobWFuaWZlc3QpKSBjb250aW51ZTtcbiAgICBjb25zdCBlbnRyeSA9IHJlc29sdmVFbnRyeShkaXIsIG1hbmlmZXN0KTtcbiAgICBpZiAoIWVudHJ5KSBjb250aW51ZTtcbiAgICBvdXQucHVzaCh7IGRpciwgZW50cnksIG1hbmlmZXN0IH0pO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbmZ1bmN0aW9uIGlzVmFsaWRNYW5pZmVzdChtOiBUd2Vha01hbmlmZXN0KTogYm9vbGVhbiB7XG4gIGlmICghbS5pZCB8fCAhbS5uYW1lIHx8ICFtLnZlcnNpb24gfHwgIW0uZ2l0aHViUmVwbykgcmV0dXJuIGZhbHNlO1xuICBpZiAoIS9eW2EtekEtWjAtOS5fLV0rXFwvW2EtekEtWjAtOS5fLV0rJC8udGVzdChtLmdpdGh1YlJlcG8pKSByZXR1cm4gZmFsc2U7XG4gIGlmIChtLnNjb3BlICYmICFbXCJyZW5kZXJlclwiLCBcIm1haW5cIiwgXCJib3RoXCJdLmluY2x1ZGVzKG0uc2NvcGUpKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlRW50cnkoZGlyOiBzdHJpbmcsIG06IFR3ZWFrTWFuaWZlc3QpOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKG0ubWFpbikge1xuICAgIGNvbnN0IHAgPSBqb2luKGRpciwgbS5tYWluKTtcbiAgICByZXR1cm4gZXhpc3RzU3luYyhwKSA/IHAgOiBudWxsO1xuICB9XG4gIGZvciAoY29uc3QgYyBvZiBFTlRSWV9DQU5ESURBVEVTKSB7XG4gICAgY29uc3QgcCA9IGpvaW4oZGlyLCBjKTtcbiAgICBpZiAoZXhpc3RzU3luYyhwKSkgcmV0dXJuIHA7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG4iLCAiLyoqXG4gKiBEaXNrLWJhY2tlZCBrZXkvdmFsdWUgc3RvcmFnZSBmb3IgbWFpbi1wcm9jZXNzIHR3ZWFrcy5cbiAqXG4gKiBFYWNoIHR3ZWFrIGdldHMgb25lIEpTT04gZmlsZSB1bmRlciBgPHVzZXJSb290Pi9zdG9yYWdlLzxpZD4uanNvbmAuXG4gKiBXcml0ZXMgYXJlIGRlYm91bmNlZCAoNTAgbXMpIGFuZCBhdG9taWMgKHdyaXRlIHRvIDxmaWxlPi50bXAgdGhlbiByZW5hbWUpLlxuICogUmVhZHMgYXJlIGVhZ2VyICsgY2FjaGVkIGluLW1lbW9yeTsgd2UgbG9hZCBvbiBmaXJzdCBhY2Nlc3MuXG4gKi9cbmltcG9ydCB7XG4gIGV4aXN0c1N5bmMsXG4gIG1rZGlyU3luYyxcbiAgcmVhZEZpbGVTeW5jLFxuICByZW5hbWVTeW5jLFxuICB3cml0ZUZpbGVTeW5jLFxufSBmcm9tIFwibm9kZTpmc1wiO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gXCJub2RlOnBhdGhcIjtcblxuZXhwb3J0IGludGVyZmFjZSBEaXNrU3RvcmFnZSB7XG4gIGdldDxUPihrZXk6IHN0cmluZywgZGVmYXVsdFZhbHVlPzogVCk6IFQ7XG4gIHNldChrZXk6IHN0cmluZywgdmFsdWU6IHVua25vd24pOiB2b2lkO1xuICBkZWxldGUoa2V5OiBzdHJpbmcpOiB2b2lkO1xuICBhbGwoKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIGZsdXNoKCk6IHZvaWQ7XG59XG5cbmNvbnN0IEZMVVNIX0RFTEFZX01TID0gNTA7XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVEaXNrU3RvcmFnZShyb290RGlyOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiBEaXNrU3RvcmFnZSB7XG4gIGNvbnN0IGRpciA9IGpvaW4ocm9vdERpciwgXCJzdG9yYWdlXCIpO1xuICBta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgY29uc3QgZmlsZSA9IGpvaW4oZGlyLCBgJHtzYW5pdGl6ZShpZCl9Lmpzb25gKTtcblxuICBsZXQgZGF0YTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgaWYgKGV4aXN0c1N5bmMoZmlsZSkpIHtcbiAgICB0cnkge1xuICAgICAgZGF0YSA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKGZpbGUsIFwidXRmOFwiKSkgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBDb3JydXB0IGZpbGUgXHUyMDE0IHN0YXJ0IGZyZXNoLCBidXQgZG9uJ3QgY2xvYmJlciB0aGUgb3JpZ2luYWwgdW50aWwgd2VcbiAgICAgIC8vIHN1Y2Nlc3NmdWxseSB3cml0ZSBhZ2Fpbi4gKE1vdmUgaXQgYXNpZGUgZm9yIGZvcmVuc2ljcy4pXG4gICAgICB0cnkge1xuICAgICAgICByZW5hbWVTeW5jKGZpbGUsIGAke2ZpbGV9LmNvcnJ1cHQtJHtEYXRlLm5vdygpfWApO1xuICAgICAgfSBjYXRjaCB7fVxuICAgICAgZGF0YSA9IHt9O1xuICAgIH1cbiAgfVxuXG4gIGxldCBkaXJ0eSA9IGZhbHNlO1xuICBsZXQgdGltZXI6IE5vZGVKUy5UaW1lb3V0IHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3Qgc2NoZWR1bGVGbHVzaCA9ICgpID0+IHtcbiAgICBkaXJ0eSA9IHRydWU7XG4gICAgaWYgKHRpbWVyKSByZXR1cm47XG4gICAgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRpbWVyID0gbnVsbDtcbiAgICAgIGlmIChkaXJ0eSkgZmx1c2goKTtcbiAgICB9LCBGTFVTSF9ERUxBWV9NUyk7XG4gIH07XG5cbiAgY29uc3QgZmx1c2ggPSAoKTogdm9pZCA9PiB7XG4gICAgaWYgKCFkaXJ0eSkgcmV0dXJuO1xuICAgIGNvbnN0IHRtcCA9IGAke2ZpbGV9LnRtcGA7XG4gICAgdHJ5IHtcbiAgICAgIHdyaXRlRmlsZVN5bmModG1wLCBKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCAyKSwgXCJ1dGY4XCIpO1xuICAgICAgcmVuYW1lU3luYyh0bXAsIGZpbGUpO1xuICAgICAgZGlydHkgPSBmYWxzZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBMZWF2ZSBkaXJ0eT10cnVlIHNvIGEgZnV0dXJlIGZsdXNoIHJldHJpZXMuXG4gICAgICBjb25zb2xlLmVycm9yKFwiW2NvZGV4LXBsdXNwbHVzXSBzdG9yYWdlIGZsdXNoIGZhaWxlZDpcIiwgaWQsIGUpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4ge1xuICAgIGdldDogPFQ+KGs6IHN0cmluZywgZD86IFQpOiBUID0+XG4gICAgICBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoZGF0YSwgaykgPyAoZGF0YVtrXSBhcyBUKSA6IChkIGFzIFQpLFxuICAgIHNldChrLCB2KSB7XG4gICAgICBkYXRhW2tdID0gdjtcbiAgICAgIHNjaGVkdWxlRmx1c2goKTtcbiAgICB9LFxuICAgIGRlbGV0ZShrKSB7XG4gICAgICBpZiAoayBpbiBkYXRhKSB7XG4gICAgICAgIGRlbGV0ZSBkYXRhW2tdO1xuICAgICAgICBzY2hlZHVsZUZsdXNoKCk7XG4gICAgICB9XG4gICAgfSxcbiAgICBhbGw6ICgpID0+ICh7IC4uLmRhdGEgfSksXG4gICAgZmx1c2gsXG4gIH07XG59XG5cbmZ1bmN0aW9uIHNhbml0aXplKGlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICAvLyBUd2VhayBpZHMgYXJlIGF1dGhvci1jb250cm9sbGVkOyBjbGFtcCB0byBhIHNhZmUgZmlsZW5hbWUuXG4gIHJldHVybiBpZC5yZXBsYWNlKC9bXmEtekEtWjAtOS5fQC1dL2csIFwiX1wiKTtcbn1cbiIsICJpbXBvcnQgeyBleGlzdHNTeW5jLCBta2RpclN5bmMsIHJlYWRGaWxlU3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBkaXJuYW1lLCBpc0Fic29sdXRlLCByZXNvbHZlIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuaW1wb3J0IHR5cGUgeyBUd2Vha01jcFNlcnZlciB9IGZyb20gXCJAY29kZXgtcGx1c3BsdXMvc2RrXCI7XG5cbmV4cG9ydCBjb25zdCBNQ1BfTUFOQUdFRF9TVEFSVCA9IFwiIyBCRUdJTiBDT0RFWCsrIE1BTkFHRUQgTUNQIFNFUlZFUlNcIjtcbmV4cG9ydCBjb25zdCBNQ1BfTUFOQUdFRF9FTkQgPSBcIiMgRU5EIENPREVYKysgTUFOQUdFRCBNQ1AgU0VSVkVSU1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIE1jcFN5bmNUd2VhayB7XG4gIGRpcjogc3RyaW5nO1xuICBtYW5pZmVzdDoge1xuICAgIGlkOiBzdHJpbmc7XG4gICAgbWNwPzogVHdlYWtNY3BTZXJ2ZXI7XG4gIH07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnVpbHRNYW5hZ2VkTWNwQmxvY2sge1xuICBibG9jazogc3RyaW5nO1xuICBzZXJ2ZXJOYW1lczogc3RyaW5nW107XG4gIHNraXBwZWRTZXJ2ZXJOYW1lczogc3RyaW5nW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWFuYWdlZE1jcFN5bmNSZXN1bHQgZXh0ZW5kcyBCdWlsdE1hbmFnZWRNY3BCbG9jayB7XG4gIGNoYW5nZWQ6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzeW5jTWFuYWdlZE1jcFNlcnZlcnMoe1xuICBjb25maWdQYXRoLFxuICB0d2Vha3MsXG59OiB7XG4gIGNvbmZpZ1BhdGg6IHN0cmluZztcbiAgdHdlYWtzOiBNY3BTeW5jVHdlYWtbXTtcbn0pOiBNYW5hZ2VkTWNwU3luY1Jlc3VsdCB7XG4gIGNvbnN0IGN1cnJlbnQgPSBleGlzdHNTeW5jKGNvbmZpZ1BhdGgpID8gcmVhZEZpbGVTeW5jKGNvbmZpZ1BhdGgsIFwidXRmOFwiKSA6IFwiXCI7XG4gIGNvbnN0IGJ1aWx0ID0gYnVpbGRNYW5hZ2VkTWNwQmxvY2sodHdlYWtzLCBjdXJyZW50KTtcbiAgY29uc3QgbmV4dCA9IG1lcmdlTWFuYWdlZE1jcEJsb2NrKGN1cnJlbnQsIGJ1aWx0LmJsb2NrKTtcblxuICBpZiAobmV4dCAhPT0gY3VycmVudCkge1xuICAgIG1rZGlyU3luYyhkaXJuYW1lKGNvbmZpZ1BhdGgpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICB3cml0ZUZpbGVTeW5jKGNvbmZpZ1BhdGgsIG5leHQsIFwidXRmOFwiKTtcbiAgfVxuXG4gIHJldHVybiB7IC4uLmJ1aWx0LCBjaGFuZ2VkOiBuZXh0ICE9PSBjdXJyZW50IH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZE1hbmFnZWRNY3BCbG9jayhcbiAgdHdlYWtzOiBNY3BTeW5jVHdlYWtbXSxcbiAgZXhpc3RpbmdUb21sID0gXCJcIixcbik6IEJ1aWx0TWFuYWdlZE1jcEJsb2NrIHtcbiAgY29uc3QgbWFudWFsVG9tbCA9IHN0cmlwTWFuYWdlZE1jcEJsb2NrKGV4aXN0aW5nVG9tbCk7XG4gIGNvbnN0IG1hbnVhbE5hbWVzID0gZmluZE1jcFNlcnZlck5hbWVzKG1hbnVhbFRvbWwpO1xuICBjb25zdCB1c2VkTmFtZXMgPSBuZXcgU2V0KG1hbnVhbE5hbWVzKTtcbiAgY29uc3Qgc2VydmVyTmFtZXM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHNraXBwZWRTZXJ2ZXJOYW1lczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgZW50cmllczogc3RyaW5nW10gPSBbXTtcblxuICBmb3IgKGNvbnN0IHR3ZWFrIG9mIHR3ZWFrcykge1xuICAgIGNvbnN0IG1jcCA9IG5vcm1hbGl6ZU1jcFNlcnZlcih0d2Vhay5tYW5pZmVzdC5tY3ApO1xuICAgIGlmICghbWNwKSBjb250aW51ZTtcblxuICAgIGNvbnN0IGJhc2VOYW1lID0gbWNwU2VydmVyTmFtZUZyb21Ud2Vha0lkKHR3ZWFrLm1hbmlmZXN0LmlkKTtcbiAgICBpZiAobWFudWFsTmFtZXMuaGFzKGJhc2VOYW1lKSkge1xuICAgICAgc2tpcHBlZFNlcnZlck5hbWVzLnB1c2goYmFzZU5hbWUpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3Qgc2VydmVyTmFtZSA9IHJlc2VydmVVbmlxdWVOYW1lKGJhc2VOYW1lLCB1c2VkTmFtZXMpO1xuICAgIHNlcnZlck5hbWVzLnB1c2goc2VydmVyTmFtZSk7XG4gICAgZW50cmllcy5wdXNoKGZvcm1hdE1jcFNlcnZlcihzZXJ2ZXJOYW1lLCB0d2Vhay5kaXIsIG1jcCkpO1xuICB9XG5cbiAgaWYgKGVudHJpZXMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHsgYmxvY2s6IFwiXCIsIHNlcnZlck5hbWVzLCBza2lwcGVkU2VydmVyTmFtZXMgfTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgYmxvY2s6IFtNQ1BfTUFOQUdFRF9TVEFSVCwgLi4uZW50cmllcywgTUNQX01BTkFHRURfRU5EXS5qb2luKFwiXFxuXCIpLFxuICAgIHNlcnZlck5hbWVzLFxuICAgIHNraXBwZWRTZXJ2ZXJOYW1lcyxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlTWFuYWdlZE1jcEJsb2NrKGN1cnJlbnRUb21sOiBzdHJpbmcsIG1hbmFnZWRCbG9jazogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKCFtYW5hZ2VkQmxvY2sgJiYgIWN1cnJlbnRUb21sLmluY2x1ZGVzKE1DUF9NQU5BR0VEX1NUQVJUKSkgcmV0dXJuIGN1cnJlbnRUb21sO1xuICBjb25zdCBzdHJpcHBlZCA9IHN0cmlwTWFuYWdlZE1jcEJsb2NrKGN1cnJlbnRUb21sKS50cmltRW5kKCk7XG4gIGlmICghbWFuYWdlZEJsb2NrKSByZXR1cm4gc3RyaXBwZWQgPyBgJHtzdHJpcHBlZH1cXG5gIDogXCJcIjtcbiAgcmV0dXJuIGAke3N0cmlwcGVkID8gYCR7c3RyaXBwZWR9XFxuXFxuYCA6IFwiXCJ9JHttYW5hZ2VkQmxvY2t9XFxuYDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwTWFuYWdlZE1jcEJsb2NrKHRvbWw6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHBhdHRlcm4gPSBuZXcgUmVnRXhwKFxuICAgIGBcXFxcbj8ke2VzY2FwZVJlZ0V4cChNQ1BfTUFOQUdFRF9TVEFSVCl9W1xcXFxzXFxcXFNdKj8ke2VzY2FwZVJlZ0V4cChNQ1BfTUFOQUdFRF9FTkQpfVxcXFxuP2AsXG4gICAgXCJnXCIsXG4gICk7XG4gIHJldHVybiB0b21sLnJlcGxhY2UocGF0dGVybiwgXCJcXG5cIikucmVwbGFjZSgvXFxuezMsfS9nLCBcIlxcblxcblwiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1jcFNlcnZlck5hbWVGcm9tVHdlYWtJZChpZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3Qgd2l0aG91dFB1Ymxpc2hlciA9IGlkLnJlcGxhY2UoL15jb1xcLmJlbm5ldHRcXC4vLCBcIlwiKTtcbiAgY29uc3Qgc2x1ZyA9IHdpdGhvdXRQdWJsaXNoZXJcbiAgICAucmVwbGFjZSgvW15hLXpBLVowLTlfLV0rL2csIFwiLVwiKVxuICAgIC5yZXBsYWNlKC9eLSt8LSskL2csIFwiXCIpXG4gICAgLnRvTG93ZXJDYXNlKCk7XG4gIHJldHVybiBzbHVnIHx8IFwidHdlYWstbWNwXCI7XG59XG5cbmZ1bmN0aW9uIGZpbmRNY3BTZXJ2ZXJOYW1lcyh0b21sOiBzdHJpbmcpOiBTZXQ8c3RyaW5nPiB7XG4gIGNvbnN0IG5hbWVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IHRhYmxlUGF0dGVybiA9IC9eXFxzKlxcW21jcF9zZXJ2ZXJzXFwuKFteXFxdXFxzXSspXFxdXFxzKiQvZ207XG4gIGxldCBtYXRjaDogUmVnRXhwRXhlY0FycmF5IHwgbnVsbDtcbiAgd2hpbGUgKChtYXRjaCA9IHRhYmxlUGF0dGVybi5leGVjKHRvbWwpKSAhPT0gbnVsbCkge1xuICAgIG5hbWVzLmFkZCh1bnF1b3RlVG9tbEtleShtYXRjaFsxXSA/PyBcIlwiKSk7XG4gIH1cbiAgcmV0dXJuIG5hbWVzO1xufVxuXG5mdW5jdGlvbiByZXNlcnZlVW5pcXVlTmFtZShiYXNlTmFtZTogc3RyaW5nLCB1c2VkTmFtZXM6IFNldDxzdHJpbmc+KTogc3RyaW5nIHtcbiAgaWYgKCF1c2VkTmFtZXMuaGFzKGJhc2VOYW1lKSkge1xuICAgIHVzZWROYW1lcy5hZGQoYmFzZU5hbWUpO1xuICAgIHJldHVybiBiYXNlTmFtZTtcbiAgfVxuICBmb3IgKGxldCBpID0gMjsgOyBpICs9IDEpIHtcbiAgICBjb25zdCBjYW5kaWRhdGUgPSBgJHtiYXNlTmFtZX0tJHtpfWA7XG4gICAgaWYgKCF1c2VkTmFtZXMuaGFzKGNhbmRpZGF0ZSkpIHtcbiAgICAgIHVzZWROYW1lcy5hZGQoY2FuZGlkYXRlKTtcbiAgICAgIHJldHVybiBjYW5kaWRhdGU7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZU1jcFNlcnZlcih2YWx1ZTogVHdlYWtNY3BTZXJ2ZXIgfCB1bmRlZmluZWQpOiBUd2Vha01jcFNlcnZlciB8IG51bGwge1xuICBpZiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZS5jb21tYW5kICE9PSBcInN0cmluZ1wiIHx8IHZhbHVlLmNvbW1hbmQubGVuZ3RoID09PSAwKSByZXR1cm4gbnVsbDtcbiAgaWYgKHZhbHVlLmFyZ3MgIT09IHVuZGVmaW5lZCAmJiAhQXJyYXkuaXNBcnJheSh2YWx1ZS5hcmdzKSkgcmV0dXJuIG51bGw7XG4gIGlmICh2YWx1ZS5hcmdzPy5zb21lKChhcmcpID0+IHR5cGVvZiBhcmcgIT09IFwic3RyaW5nXCIpKSByZXR1cm4gbnVsbDtcbiAgaWYgKHZhbHVlLmVudiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKCF2YWx1ZS5lbnYgfHwgdHlwZW9mIHZhbHVlLmVudiAhPT0gXCJvYmplY3RcIiB8fCBBcnJheS5pc0FycmF5KHZhbHVlLmVudikpIHJldHVybiBudWxsO1xuICAgIGlmIChPYmplY3QudmFsdWVzKHZhbHVlLmVudikuc29tZSgoZW52VmFsdWUpID0+IHR5cGVvZiBlbnZWYWx1ZSAhPT0gXCJzdHJpbmdcIikpIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0TWNwU2VydmVyKHNlcnZlck5hbWU6IHN0cmluZywgdHdlYWtEaXI6IHN0cmluZywgbWNwOiBUd2Vha01jcFNlcnZlcik6IHN0cmluZyB7XG4gIGNvbnN0IGxpbmVzID0gW1xuICAgIGBbbWNwX3NlcnZlcnMuJHtmb3JtYXRUb21sS2V5KHNlcnZlck5hbWUpfV1gLFxuICAgIGBjb21tYW5kID0gJHtmb3JtYXRUb21sU3RyaW5nKHJlc29sdmVDb21tYW5kKHR3ZWFrRGlyLCBtY3AuY29tbWFuZCkpfWAsXG4gIF07XG5cbiAgaWYgKG1jcC5hcmdzICYmIG1jcC5hcmdzLmxlbmd0aCA+IDApIHtcbiAgICBsaW5lcy5wdXNoKGBhcmdzID0gJHtmb3JtYXRUb21sU3RyaW5nQXJyYXkobWNwLmFyZ3MubWFwKChhcmcpID0+IHJlc29sdmVBcmcodHdlYWtEaXIsIGFyZykpKX1gKTtcbiAgfVxuXG4gIGlmIChtY3AuZW52ICYmIE9iamVjdC5rZXlzKG1jcC5lbnYpLmxlbmd0aCA+IDApIHtcbiAgICBsaW5lcy5wdXNoKGBlbnYgPSAke2Zvcm1hdFRvbWxJbmxpbmVUYWJsZShtY3AuZW52KX1gKTtcbiAgfVxuXG4gIHJldHVybiBsaW5lcy5qb2luKFwiXFxuXCIpO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlQ29tbWFuZCh0d2Vha0Rpcjogc3RyaW5nLCBjb21tYW5kOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoaXNBYnNvbHV0ZShjb21tYW5kKSB8fCAhbG9va3NMaWtlUmVsYXRpdmVQYXRoKGNvbW1hbmQpKSByZXR1cm4gY29tbWFuZDtcbiAgcmV0dXJuIHJlc29sdmUodHdlYWtEaXIsIGNvbW1hbmQpO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlQXJnKHR3ZWFrRGlyOiBzdHJpbmcsIGFyZzogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKGlzQWJzb2x1dGUoYXJnKSB8fCBhcmcuc3RhcnRzV2l0aChcIi1cIikpIHJldHVybiBhcmc7XG4gIGNvbnN0IGNhbmRpZGF0ZSA9IHJlc29sdmUodHdlYWtEaXIsIGFyZyk7XG4gIHJldHVybiBleGlzdHNTeW5jKGNhbmRpZGF0ZSkgPyBjYW5kaWRhdGUgOiBhcmc7XG59XG5cbmZ1bmN0aW9uIGxvb2tzTGlrZVJlbGF0aXZlUGF0aCh2YWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiB2YWx1ZS5zdGFydHNXaXRoKFwiLi9cIikgfHwgdmFsdWUuc3RhcnRzV2l0aChcIi4uL1wiKSB8fCB2YWx1ZS5pbmNsdWRlcyhcIi9cIik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFRvbWxTdHJpbmcodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFRvbWxTdHJpbmdBcnJheSh2YWx1ZXM6IHN0cmluZ1tdKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBbJHt2YWx1ZXMubWFwKGZvcm1hdFRvbWxTdHJpbmcpLmpvaW4oXCIsIFwiKX1dYDtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VG9tbElubGluZVRhYmxlKHJlY29yZDogUmVjb3JkPHN0cmluZywgc3RyaW5nPik6IHN0cmluZyB7XG4gIHJldHVybiBgeyAke09iamVjdC5lbnRyaWVzKHJlY29yZClcbiAgICAubWFwKChba2V5LCB2YWx1ZV0pID0+IGAke2Zvcm1hdFRvbWxLZXkoa2V5KX0gPSAke2Zvcm1hdFRvbWxTdHJpbmcodmFsdWUpfWApXG4gICAgLmpvaW4oXCIsIFwiKX0gfWA7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFRvbWxLZXkoa2V5OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gL15bYS16QS1aMC05Xy1dKyQvLnRlc3Qoa2V5KSA/IGtleSA6IGZvcm1hdFRvbWxTdHJpbmcoa2V5KTtcbn1cblxuZnVuY3Rpb24gdW5xdW90ZVRvbWxLZXkoa2V5OiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoIWtleS5zdGFydHNXaXRoKCdcIicpIHx8ICFrZXkuZW5kc1dpdGgoJ1wiJykpIHJldHVybiBrZXk7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2Uoa2V5KSBhcyBzdHJpbmc7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBrZXk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZXNjYXBlUmVnRXhwKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdmFsdWUucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csIFwiXFxcXCQmXCIpO1xufVxuIiwgImltcG9ydCB7IEJyb3dzZXJXaW5kb3cgfSBmcm9tIFwiZWxlY3Ryb25cIjtcbmltcG9ydCB7IHNwYXduLCB0eXBlIENoaWxkUHJvY2Vzc1dpdGhvdXROdWxsU3RyZWFtcyB9IGZyb20gXCJub2RlOmNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCB7IHJhbmRvbVVVSUQgfSBmcm9tIFwibm9kZTpjcnlwdG9cIjtcbmltcG9ydCB7IGV4aXN0c1N5bmMgfSBmcm9tIFwibm9kZTpmc1wiO1xuaW1wb3J0IHsgY3JlYXRlSW50ZXJmYWNlIH0gZnJvbSBcIm5vZGU6cmVhZGxpbmVcIjtcbmltcG9ydCB7IHJlc29sdmVOYXRpdmVUd2Vha1BhdGggfSBmcm9tIFwiLi9uYXRpdmUtcGF0aHNcIjtcbmltcG9ydCB0eXBlIHtcbiAgQ29kZXhSdW50aW1lQ2FwYWJpbGl0aWVzLFxuICBOYXRpdmVIZWxwZXJMYXVuY2hPcHRpb25zLFxuICBOYXRpdmVIZWxwZXJSZWYsXG4gIE5hdGl2ZU1vZHVsZUtpbmQsXG4gIE5hdGl2ZU1vZHVsZUxvYWRPcHRpb25zLFxuICBOYXRpdmVNb2R1bGVSZWYsXG4gIE5hdGl2ZVBhbmVsQ3JlYXRlT3B0aW9ucyxcbiAgTmF0aXZlUGFuZWxSZWYsXG4gIE5hdGl2ZVZpZXdBdHRhY2hPcHRpb25zLFxuICBOYXRpdmVWaWV3UmVmLFxufSBmcm9tIFwiQGNvZGV4LXBsdXNwbHVzL3Nka1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIE5hdGl2ZVR3ZWFrQ29udGV4dCB7XG4gIGlkOiBzdHJpbmc7XG4gIGRpcjogc3RyaW5nO1xufVxuXG50eXBlIE5hdGl2ZUxvZyA9IChsZXZlbDogXCJpbmZvXCIgfCBcIndhcm5cIiB8IFwiZXJyb3JcIiwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkO1xuXG5leHBvcnQgaW50ZXJmYWNlIE5hdGl2ZUJyaWRnZU9wdGlvbnMge1xuICBuYXRpdmVIb3N0UGF0aD86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIExvYWRlZE5hdGl2ZU1vZHVsZSB7XG4gIGtleTogc3RyaW5nO1xuICB0d2Vha0lkOiBzdHJpbmc7XG4gIGlkOiBzdHJpbmc7XG4gIGtpbmQ6IE5hdGl2ZU1vZHVsZUtpbmQ7XG4gIHBhdGg6IHN0cmluZztcbiAgZXhwb3J0czogdW5rbm93bjtcbn1cblxuaW50ZXJmYWNlIE5hdGl2ZUluc3RhbmNlIHtcbiAga2V5OiBzdHJpbmc7XG4gIHR3ZWFrSWQ6IHN0cmluZztcbiAgaWQ6IHN0cmluZztcbiAga2luZDogXCJwYW5lbFwiIHwgXCJ2aWV3XCI7XG4gIHZhbHVlOiB1bmtub3duO1xuICBwYXJlbnRXaW5kb3dJZDogbnVtYmVyIHwgbnVsbDtcbiAgd2luZG93SWQ6IG51bWJlciB8IG51bGw7XG4gIGRpc3Bvc2VCaW5kaW5nczogQXJyYXk8KCkgPT4gdm9pZD47XG4gIGRpc3Bvc2luZzogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIEhlbHBlclJlcXVlc3Qge1xuICByZXNvbHZlKHZhbHVlOiB1bmtub3duKTogdm9pZDtcbiAgcmVqZWN0KGVycm9yOiBFcnJvcik6IHZvaWQ7XG4gIHRpbWVyOiBOb2RlSlMuVGltZW91dDtcbn1cblxuaW50ZXJmYWNlIE5hdGl2ZUhlbHBlclByb2Nlc3Mge1xuICBrZXk6IHN0cmluZztcbiAgdHdlYWtJZDogc3RyaW5nO1xuICBpZDogc3RyaW5nO1xuICBjaGlsZDogQ2hpbGRQcm9jZXNzV2l0aG91dE51bGxTdHJlYW1zO1xuICBwZW5kaW5nOiBNYXA8c3RyaW5nLCBIZWxwZXJSZXF1ZXN0Pjtcbn1cblxuZXhwb3J0IGNsYXNzIE5hdGl2ZUJyaWRnZSB7XG4gIHByaXZhdGUgbW9kdWxlcyA9IG5ldyBNYXA8c3RyaW5nLCBMb2FkZWROYXRpdmVNb2R1bGU+KCk7XG4gIHByaXZhdGUgaW5zdGFuY2VzID0gbmV3IE1hcDxzdHJpbmcsIE5hdGl2ZUluc3RhbmNlPigpO1xuICBwcml2YXRlIGhlbHBlcnMgPSBuZXcgTWFwPHN0cmluZywgTmF0aXZlSGVscGVyUHJvY2Vzcz4oKTtcbiAgcHJpdmF0ZSBuYXRpdmVIb3N0RXhwb3J0czogdW5rbm93biB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIG5hdGl2ZUhvc3RMb2FkRXJyb3I6IEVycm9yIHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBsb2c6IE5hdGl2ZUxvZyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnM6IE5hdGl2ZUJyaWRnZU9wdGlvbnMgPSB7fSxcbiAgKSB7fVxuXG4gIGdldENhcGFiaWxpdGllcygpOiBDb2RleFJ1bnRpbWVDYXBhYmlsaXRpZXNbXCJuYXRpdmVcIl0ge1xuICAgIGNvbnN0IGhvc3QgPSB0aGlzLmxvYWROYXRpdmVIb3N0KGZhbHNlKTtcbiAgICBjb25zdCBob3N0Q2FwYWJpbGl0aWVzID0gaG9zdCA/IHRoaXMucmVhZE5hdGl2ZUhvc3RDYXBhYmlsaXRpZXMoaG9zdCkgOiB7fTtcbiAgICBjb25zdCBuYXRpdmVIb3N0ID0gaG9zdCAhPT0gbnVsbDtcbiAgICByZXR1cm4ge1xuICAgICAgaW5Qcm9jZXNzTW9kdWxlczogdHJ1ZSxcbiAgICAgIHN3aWZ0TW9kdWxlczogcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gXCJkYXJ3aW5cIixcbiAgICAgIGFwcEtpdEVtYmVkZGluZzogQm9vbGVhbihob3N0Q2FwYWJpbGl0aWVzLmFwcEtpdEVtYmVkZGluZyksXG4gICAgICBjaGlsZFdpbmRvd092ZXJsYXk6IEJvb2xlYW4oaG9zdENhcGFiaWxpdGllcy5jaGlsZFdpbmRvd092ZXJsYXkpLFxuICAgICAgZGlyZWN0Vmlld0F0dGFjaDogQm9vbGVhbihob3N0Q2FwYWJpbGl0aWVzLmRpcmVjdFZpZXdBdHRhY2gpLFxuICAgICAgbWV0YWxWaWV3czogQm9vbGVhbihob3N0Q2FwYWJpbGl0aWVzLm1ldGFsVmlld3MpLFxuICAgICAgbmF0aXZlSG9zdCxcbiAgICAgIGhlbHBlcnM6IHRydWUsXG4gICAgfTtcbiAgfVxuXG4gIGxvYWRNb2R1bGUoY3R4OiBOYXRpdmVUd2Vha0NvbnRleHQsIG9wdGlvbnM6IE5hdGl2ZU1vZHVsZUxvYWRPcHRpb25zKTogTmF0aXZlTW9kdWxlUmVmIHtcbiAgICBjb25zdCBpZCA9IGFzc2VydEJyaWRnZUlkKG9wdGlvbnMuaWQsIFwibmF0aXZlIG1vZHVsZSBpZFwiKTtcbiAgICBjb25zdCBmdWxsUGF0aCA9IHJlc29sdmVUd2Vha1BhdGgoY3R4LCBvcHRpb25zLnBhdGgpO1xuICAgIGNvbnN0IGtpbmQgPSBvcHRpb25zLmtpbmQgPz8gaW5mZXJNb2R1bGVLaW5kKGZ1bGxQYXRoKTtcblxuICAgIGlmIChraW5kICE9PSBcIm5vZGUtYWRkb25cIikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgJHtraW5kfSBuYXRpdmUgbW9kdWxlcyBtdXN0IGJlIGxvYWRlZCB0aHJvdWdoIGEgLm5vZGUgT2JqZWN0aXZlLUMrKyBzaGltIGluIENvZGV4KysgMS4wLjBgLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAoIWZ1bGxQYXRoLmVuZHNXaXRoKFwiLm5vZGVcIikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIm5vZGUtYWRkb24gbmF0aXZlIG1vZHVsZXMgbXVzdCB1c2UgYSAubm9kZSBmaWxlXCIpO1xuICAgIH1cblxuICAgIGNvbnN0IGxvYWRlZCA9IHJlcXVpcmUoZnVsbFBhdGgpIGFzIHVua25vd247XG4gICAgY29uc3QgZXhwb3J0cyA9IHNlbGVjdEVudHJ5cG9pbnQobG9hZGVkLCBvcHRpb25zLmVudHJ5cG9pbnQpO1xuICAgIGNvbnN0IGtleSA9IG1vZHVsZUtleShjdHguaWQsIGlkKTtcbiAgICB0aGlzLm1vZHVsZXMuc2V0KGtleSwgeyBrZXksIHR3ZWFrSWQ6IGN0eC5pZCwgaWQsIGtpbmQsIHBhdGg6IGZ1bGxQYXRoLCBleHBvcnRzIH0pO1xuICAgIHRoaXMubG9nKFwiaW5mb1wiLCBgbG9hZGVkIG5hdGl2ZSBtb2R1bGUgJHtjdHguaWR9OiR7aWR9YCwgeyBraW5kLCBwYXRoOiBmdWxsUGF0aCB9KTtcbiAgICByZXR1cm4gdGhpcy5tb2R1bGVSZWYoY3R4LmlkLCBpZCwga2luZCk7XG4gIH1cblxuICBhc3luYyBjcmVhdGVQYW5lbChjdHg6IE5hdGl2ZVR3ZWFrQ29udGV4dCwgb3B0aW9uczogTmF0aXZlUGFuZWxDcmVhdGVPcHRpb25zKTogUHJvbWlzZTxOYXRpdmVQYW5lbFJlZj4ge1xuICAgIGNvbnN0IGNyZWF0ZWQgPSBhd2FpdCB0aGlzLmNyZWF0ZU5hdGl2ZUluc3RhbmNlKGN0eCwgXCJwYW5lbFwiLCBvcHRpb25zLm1vZHVsZUlkLCBvcHRpb25zLmZhY3RvcnkgPz8gXCJjcmVhdGVQYW5lbFwiLCB7XG4gICAgICBwYXJlbnRXaW5kb3dJZDogb3B0aW9ucy5wYXJlbnRXaW5kb3dJZCxcbiAgICAgIGJvdW5kczogb3B0aW9ucy5ib3VuZHMsXG4gICAgICB0cmFuc3BhcmVudDogb3B0aW9ucy50cmFuc3BhcmVudCA9PT0gdHJ1ZSxcbiAgICAgIHBhc3N0aHJvdWdoTW91c2U6IG9wdGlvbnMucGFzc3Rocm91Z2hNb3VzZSA9PT0gdHJ1ZSxcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5wYW5lbFJlZihjcmVhdGVkKTtcbiAgfVxuXG4gIGFzeW5jIGF0dGFjaFZpZXcoY3R4OiBOYXRpdmVUd2Vha0NvbnRleHQsIG9wdGlvbnM6IE5hdGl2ZVZpZXdBdHRhY2hPcHRpb25zKTogUHJvbWlzZTxOYXRpdmVWaWV3UmVmPiB7XG4gICAgY29uc3QgY3JlYXRlZCA9IGF3YWl0IHRoaXMuY3JlYXRlTmF0aXZlSW5zdGFuY2UoY3R4LCBcInZpZXdcIiwgb3B0aW9ucy5tb2R1bGVJZCwgb3B0aW9ucy5mYWN0b3J5ID8/IFwiYXR0YWNoVmlld1wiLCB7XG4gICAgICBwYXJlbnRXaW5kb3dJZDogb3B0aW9ucy5wYXJlbnRXaW5kb3dJZCxcbiAgICAgIGJvdW5kczogb3B0aW9ucy5ib3VuZHMsXG4gICAgICB6SW5kZXg6IG9wdGlvbnMuekluZGV4LFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnZpZXdSZWYoY3JlYXRlZCk7XG4gIH1cblxuICBsYXVuY2hIZWxwZXIoY3R4OiBOYXRpdmVUd2Vha0NvbnRleHQsIG9wdGlvbnM6IE5hdGl2ZUhlbHBlckxhdW5jaE9wdGlvbnMpOiBOYXRpdmVIZWxwZXJSZWYge1xuICAgIGNvbnN0IGlkID0gYXNzZXJ0QnJpZGdlSWQob3B0aW9ucy5pZCwgXCJuYXRpdmUgaGVscGVyIGlkXCIpO1xuICAgIGlmICgob3B0aW9ucy50cmFuc3BvcnQgPz8gXCJzdGRpb1wiKSAhPT0gXCJzdGRpb1wiKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJuYXRpdmUgaGVscGVycyBzdXBwb3J0IG9ubHkgc3RkaW8gdHJhbnNwb3J0IGluIENvZGV4KysgMS4wLjBcIik7XG4gICAgfVxuICAgIGlmICgob3B0aW9ucy5yZXN0YXJ0ID8/IFwibmV2ZXJcIikgIT09IFwibmV2ZXJcIikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwibmF0aXZlIGhlbHBlciByZXN0YXJ0IHBvbGljaWVzIGFyZSBub3QgYXZhaWxhYmxlIGluIENvZGV4KysgMS4wLjBcIik7XG4gICAgfVxuICAgIGNvbnN0IGV4ZWN1dGFibGUgPSByZXNvbHZlVHdlYWtQYXRoKGN0eCwgb3B0aW9ucy5leGVjdXRhYmxlKTtcbiAgICBjb25zdCBhcmdzID0gb3B0aW9ucy5hcmdzID8/IFtdO1xuICAgIGNvbnN0IGVudiA9IHsgLi4ucHJvY2Vzcy5lbnYsIC4uLihvcHRpb25zLmVudiA/PyB7fSkgfTtcbiAgICBjb25zdCBjaGlsZCA9IHNwYXduKGV4ZWN1dGFibGUsIGFyZ3MsIHtcbiAgICAgIGN3ZDogY3R4LmRpcixcbiAgICAgIGVudixcbiAgICAgIHN0ZGlvOiBbXCJwaXBlXCIsIFwicGlwZVwiLCBcInBpcGVcIl0sXG4gICAgfSk7XG4gICAgY29uc3Qga2V5ID0gaGVscGVyS2V5KGN0eC5pZCwgaWQpO1xuICAgIGNvbnN0IGhlbHBlcjogTmF0aXZlSGVscGVyUHJvY2VzcyA9IHtcbiAgICAgIGtleSxcbiAgICAgIHR3ZWFrSWQ6IGN0eC5pZCxcbiAgICAgIGlkLFxuICAgICAgY2hpbGQsXG4gICAgICBwZW5kaW5nOiBuZXcgTWFwKCksXG4gICAgfTtcbiAgICB0aGlzLmhlbHBlcnMuc2V0KGtleSwgaGVscGVyKTtcblxuICAgIGNvbnN0IHN0ZG91dCA9IGNyZWF0ZUludGVyZmFjZSh7IGlucHV0OiBjaGlsZC5zdGRvdXQgfSk7XG4gICAgc3Rkb3V0Lm9uKFwibGluZVwiLCAobGluZSkgPT4gdGhpcy5oYW5kbGVIZWxwZXJMaW5lKGhlbHBlciwgbGluZSkpO1xuICAgIGNoaWxkLnN0ZGVyci5vbihcImRhdGFcIiwgKGNodW5rKSA9PiB7XG4gICAgICB0aGlzLmxvZyhcIndhcm5cIiwgYG5hdGl2ZSBoZWxwZXIgJHtjdHguaWR9OiR7aWR9IHN0ZGVycmAsIFN0cmluZyhjaHVuaykpO1xuICAgIH0pO1xuICAgIGNoaWxkLm9uKFwiZXhpdFwiLCAoY29kZSwgc2lnbmFsKSA9PiB7XG4gICAgICB0aGlzLmxvZyhcImluZm9cIiwgYG5hdGl2ZSBoZWxwZXIgJHtjdHguaWR9OiR7aWR9IGV4aXRlZGAsIHsgY29kZSwgc2lnbmFsIH0pO1xuICAgICAgdGhpcy5oZWxwZXJzLmRlbGV0ZShrZXkpO1xuICAgICAgZm9yIChjb25zdCByZXF1ZXN0IG9mIGhlbHBlci5wZW5kaW5nLnZhbHVlcygpKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChyZXF1ZXN0LnRpbWVyKTtcbiAgICAgICAgcmVxdWVzdC5yZWplY3QobmV3IEVycm9yKGBuYXRpdmUgaGVscGVyIGV4aXRlZCBiZWZvcmUgcmVzcG9uc2VgKSk7XG4gICAgICB9XG4gICAgICBoZWxwZXIucGVuZGluZy5jbGVhcigpO1xuICAgIH0pO1xuICAgIGNoaWxkLm9uKFwiZXJyb3JcIiwgKGVycm9yKSA9PiB7XG4gICAgICB0aGlzLmxvZyhcImVycm9yXCIsIGBuYXRpdmUgaGVscGVyICR7Y3R4LmlkfToke2lkfSBmYWlsZWRgLCBlcnJvcik7XG4gICAgICB0aGlzLmhlbHBlcnMuZGVsZXRlKGtleSk7XG4gICAgICBmb3IgKGNvbnN0IHJlcXVlc3Qgb2YgaGVscGVyLnBlbmRpbmcudmFsdWVzKCkpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHJlcXVlc3QudGltZXIpO1xuICAgICAgICByZXF1ZXN0LnJlamVjdChlcnJvcik7XG4gICAgICB9XG4gICAgICBoZWxwZXIucGVuZGluZy5jbGVhcigpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5sb2coXCJpbmZvXCIsIGBsYXVuY2hlZCBuYXRpdmUgaGVscGVyICR7Y3R4LmlkfToke2lkfWAsIHsgcGlkOiBjaGlsZC5waWQsIGV4ZWN1dGFibGUgfSk7XG4gICAgcmV0dXJuIHRoaXMuaGVscGVyUmVmKGN0eC5pZCwgaWQsIGNoaWxkLnBpZCA/PyAtMSk7XG4gIH1cblxuICBkaXNwb3NlVHdlYWsodHdlYWtJZDogc3RyaW5nKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBba2V5LCBpbnN0YW5jZV0gb2YgWy4uLnRoaXMuaW5zdGFuY2VzXSkge1xuICAgICAgaWYgKGluc3RhbmNlLnR3ZWFrSWQgIT09IHR3ZWFrSWQpIGNvbnRpbnVlO1xuICAgICAgdm9pZCB0aGlzLmRpc3Bvc2VJbnN0YW5jZShpbnN0YW5jZSkuZmluYWxseSgoKSA9PiB0aGlzLmluc3RhbmNlcy5kZWxldGUoa2V5KSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgW2tleSwgaGVscGVyXSBvZiBbLi4udGhpcy5oZWxwZXJzXSkge1xuICAgICAgaWYgKGhlbHBlci50d2Vha0lkICE9PSB0d2Vha0lkKSBjb250aW51ZTtcbiAgICAgIHRoaXMuc3RvcEhlbHBlcihoZWxwZXIpO1xuICAgICAgdGhpcy5oZWxwZXJzLmRlbGV0ZShrZXkpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtrZXksIG1vZF0gb2YgWy4uLnRoaXMubW9kdWxlc10pIHtcbiAgICAgIGlmIChtb2QudHdlYWtJZCAhPT0gdHdlYWtJZCkgY29udGludWU7XG4gICAgICB2b2lkIGNhbGxPcHRpb25hbChtb2QuZXhwb3J0cywgXCJkaXNwb3NlXCIsIFtdKTtcbiAgICAgIHRoaXMubW9kdWxlcy5kZWxldGUoa2V5KTtcbiAgICB9XG4gIH1cblxuICBkaXNwb3NlQWxsKCk6IHZvaWQge1xuICAgIGNvbnN0IHR3ZWFrSWRzID0gbmV3IFNldChbXG4gICAgICAuLi5bLi4udGhpcy5tb2R1bGVzLnZhbHVlcygpXS5tYXAoKGl0ZW0pID0+IGl0ZW0udHdlYWtJZCksXG4gICAgICAuLi5bLi4udGhpcy5pbnN0YW5jZXMudmFsdWVzKCldLm1hcCgoaXRlbSkgPT4gaXRlbS50d2Vha0lkKSxcbiAgICAgIC4uLlsuLi50aGlzLmhlbHBlcnMudmFsdWVzKCldLm1hcCgoaXRlbSkgPT4gaXRlbS50d2Vha0lkKSxcbiAgICBdKTtcbiAgICBmb3IgKGNvbnN0IGlkIG9mIHR3ZWFrSWRzKSB0aGlzLmRpc3Bvc2VUd2VhayhpZCk7XG4gIH1cblxuICBhc3luYyBjYWxsSW5zdGFuY2UoXG4gICAgdHdlYWtJZDogc3RyaW5nLFxuICAgIGtpbmQ6IFwicGFuZWxcIiB8IFwidmlld1wiLFxuICAgIGlkOiBzdHJpbmcsXG4gICAgbWV0aG9kOiBzdHJpbmcsXG4gICAgYXJnPzogdW5rbm93bixcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKGtpbmQgPT09IFwicGFuZWxcIikge1xuICAgICAgaWYgKG1ldGhvZCA9PT0gXCJzZXRCb3VuZHNcIikgcmV0dXJuIHRoaXMuaW52b2tlSW5zdGFuY2UodHdlYWtJZCwgaWQsIFwic2V0Qm91bmRzXCIsIFthcmddKTtcbiAgICAgIGlmIChtZXRob2QgPT09IFwic2hvd1wiKSByZXR1cm4gdGhpcy5pbnZva2VJbnN0YW5jZSh0d2Vha0lkLCBpZCwgXCJzaG93XCIsIFtdKTtcbiAgICAgIGlmIChtZXRob2QgPT09IFwiaGlkZVwiKSByZXR1cm4gdGhpcy5pbnZva2VJbnN0YW5jZSh0d2Vha0lkLCBpZCwgXCJoaWRlXCIsIFtdKTtcbiAgICAgIGlmIChtZXRob2QgPT09IFwiZGlzcG9zZVwiKSByZXR1cm4gdGhpcy5kaXNwb3NlSW5zdGFuY2VCeUlkKHR3ZWFrSWQsIGlkKTtcbiAgICB9XG4gICAgaWYgKGtpbmQgPT09IFwidmlld1wiKSB7XG4gICAgICBpZiAobWV0aG9kID09PSBcInNldEJvdW5kc1wiKSByZXR1cm4gdGhpcy5pbnZva2VJbnN0YW5jZSh0d2Vha0lkLCBpZCwgXCJzZXRCb3VuZHNcIiwgW2FyZ10pO1xuICAgICAgaWYgKG1ldGhvZCA9PT0gXCJzZXRWaXNpYmxlXCIpIHJldHVybiB0aGlzLmludm9rZUluc3RhbmNlKHR3ZWFrSWQsIGlkLCBcInNldFZpc2libGVcIiwgW2FyZ10pO1xuICAgICAgaWYgKG1ldGhvZCA9PT0gXCJkaXNwb3NlXCIpIHJldHVybiB0aGlzLmRpc3Bvc2VJbnN0YW5jZUJ5SWQodHdlYWtJZCwgaWQpO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYHVua25vd24gbmF0aXZlICR7a2luZH0gbWV0aG9kOiAke21ldGhvZH1gKTtcbiAgfVxuXG4gIGFzeW5jIGNhbGxIZWxwZXIoXG4gICAgdHdlYWtJZDogc3RyaW5nLFxuICAgIGhlbHBlcklkOiBzdHJpbmcsXG4gICAgbWV0aG9kOiBzdHJpbmcsXG4gICAgcGF5bG9hZD86IHVua25vd24sXG4gICAgdGltZW91dE1zPzogbnVtYmVyLFxuICApOiBQcm9taXNlPHVua25vd24+IHtcbiAgICBpZiAobWV0aG9kID09PSBcInNlbmRcIikgcmV0dXJuIHRoaXMuc2VuZEhlbHBlcih0d2Vha0lkLCBoZWxwZXJJZCwgcGF5bG9hZCk7XG4gICAgaWYgKG1ldGhvZCA9PT0gXCJyZXF1ZXN0XCIpIHJldHVybiB0aGlzLnJlcXVlc3RIZWxwZXIodHdlYWtJZCwgaGVscGVySWQsIHBheWxvYWQsIHRpbWVvdXRNcyk7XG4gICAgaWYgKG1ldGhvZCA9PT0gXCJzdG9wXCIpIHJldHVybiB0aGlzLnN0b3BIZWxwZXJCeUlkKHR3ZWFrSWQsIGhlbHBlcklkKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYHVua25vd24gbmF0aXZlIGhlbHBlciBtZXRob2Q6ICR7bWV0aG9kfWApO1xuICB9XG5cbiAgcHJpdmF0ZSBtb2R1bGVSZWYodHdlYWtJZDogc3RyaW5nLCBpZDogc3RyaW5nLCBraW5kID0gdGhpcy5tb2R1bGVGb3IodHdlYWtJZCwgaWQpLmtpbmQpOiBOYXRpdmVNb2R1bGVSZWYge1xuICAgIHJldHVybiB7XG4gICAgICBpZCxcbiAgICAgIGtpbmQsXG4gICAgICByZXF1ZXN0OiAobWV0aG9kLCBwYXlsb2FkLCB0aW1lb3V0TXMpID0+XG4gICAgICAgIHRoaXMucmVxdWVzdE1vZHVsZSh0d2Vha0lkLCBpZCwgbWV0aG9kLCBwYXlsb2FkLCB0aW1lb3V0TXMpLFxuICAgICAgZGlzcG9zZTogKCkgPT4gdGhpcy5kaXNwb3NlTW9kdWxlKHR3ZWFrSWQsIGlkKSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBwYW5lbFJlZihpbnN0YW5jZTogTmF0aXZlSW5zdGFuY2UpOiBOYXRpdmVQYW5lbFJlZiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBpbnN0YW5jZS5pZCxcbiAgICAgIHdpbmRvd0lkOiBpbnN0YW5jZS53aW5kb3dJZCxcbiAgICAgIHNldEJvdW5kczogKGJvdW5kcykgPT4gdGhpcy5pbnZva2VJbnN0YW5jZShpbnN0YW5jZS50d2Vha0lkLCBpbnN0YW5jZS5pZCwgXCJzZXRCb3VuZHNcIiwgW2JvdW5kc10pLFxuICAgICAgc2hvdzogKCkgPT4gdGhpcy5pbnZva2VJbnN0YW5jZShpbnN0YW5jZS50d2Vha0lkLCBpbnN0YW5jZS5pZCwgXCJzaG93XCIsIFtdKSxcbiAgICAgIGhpZGU6ICgpID0+IHRoaXMuaW52b2tlSW5zdGFuY2UoaW5zdGFuY2UudHdlYWtJZCwgaW5zdGFuY2UuaWQsIFwiaGlkZVwiLCBbXSksXG4gICAgICBkaXNwb3NlOiAoKSA9PiB0aGlzLmRpc3Bvc2VJbnN0YW5jZUJ5SWQoaW5zdGFuY2UudHdlYWtJZCwgaW5zdGFuY2UuaWQpLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIHZpZXdSZWYoaW5zdGFuY2U6IE5hdGl2ZUluc3RhbmNlKTogTmF0aXZlVmlld1JlZiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBpbnN0YW5jZS5pZCxcbiAgICAgIHNldEJvdW5kczogKGJvdW5kcykgPT4gdGhpcy5pbnZva2VJbnN0YW5jZShpbnN0YW5jZS50d2Vha0lkLCBpbnN0YW5jZS5pZCwgXCJzZXRCb3VuZHNcIiwgW2JvdW5kc10pLFxuICAgICAgc2V0VmlzaWJsZTogKHZpc2libGUpID0+IHRoaXMuaW52b2tlSW5zdGFuY2UoaW5zdGFuY2UudHdlYWtJZCwgaW5zdGFuY2UuaWQsIFwic2V0VmlzaWJsZVwiLCBbdmlzaWJsZV0pLFxuICAgICAgZGlzcG9zZTogKCkgPT4gdGhpcy5kaXNwb3NlSW5zdGFuY2VCeUlkKGluc3RhbmNlLnR3ZWFrSWQsIGluc3RhbmNlLmlkKSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBoZWxwZXJSZWYodHdlYWtJZDogc3RyaW5nLCBpZDogc3RyaW5nLCBwaWQ6IG51bWJlcik6IE5hdGl2ZUhlbHBlclJlZiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkLFxuICAgICAgcGlkLFxuICAgICAgc2VuZDogKG1lc3NhZ2UpID0+IHRoaXMuc2VuZEhlbHBlcih0d2Vha0lkLCBpZCwgbWVzc2FnZSksXG4gICAgICByZXF1ZXN0OiAobWVzc2FnZSwgdGltZW91dE1zKSA9PiB0aGlzLnJlcXVlc3RIZWxwZXIodHdlYWtJZCwgaWQsIG1lc3NhZ2UsIHRpbWVvdXRNcyksXG4gICAgICBzdG9wOiAoKSA9PiB0aGlzLnN0b3BIZWxwZXJCeUlkKHR3ZWFrSWQsIGlkKSxcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgcmVxdWVzdE1vZHVsZShcbiAgICB0d2Vha0lkOiBzdHJpbmcsXG4gICAgaWQ6IHN0cmluZyxcbiAgICBtZXRob2Q6IHN0cmluZyxcbiAgICBwYXlsb2FkPzogdW5rbm93bixcbiAgICBfdGltZW91dE1zPzogbnVtYmVyLFxuICApOiBQcm9taXNlPHVua25vd24+IHtcbiAgICBjb25zdCBtb2QgPSB0aGlzLm1vZHVsZUZvcih0d2Vha0lkLCBpZCk7XG4gICAgY29uc3QgdGFyZ2V0ID0gYXNSZWNvcmQobW9kLmV4cG9ydHMpO1xuICAgIGNvbnN0IGZuID0gdGFyZ2V0Py5yZXF1ZXN0O1xuICAgIGlmICh0eXBlb2YgZm4gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgcmV0dXJuIGF3YWl0IGZuLmNhbGwobW9kLmV4cG9ydHMsIG1ldGhvZCwgcGF5bG9hZCk7XG4gICAgfVxuICAgIGNvbnN0IG1ldGhvZEZuID0gdGFyZ2V0Py5bbWV0aG9kXTtcbiAgICBpZiAodHlwZW9mIG1ldGhvZEZuID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHJldHVybiBhd2FpdCBtZXRob2RGbi5jYWxsKG1vZC5leHBvcnRzLCBwYXlsb2FkKTtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBuYXRpdmUgbW9kdWxlICR7dHdlYWtJZH06JHtpZH0gaGFzIG5vIHJlcXVlc3QoKSBvciAke21ldGhvZH0oKWApO1xuICB9XG5cbiAgYXN5bmMgZGlzcG9zZU1vZHVsZSh0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBrZXkgPSBtb2R1bGVLZXkodHdlYWtJZCwgaWQpO1xuICAgIGNvbnN0IG1vZCA9IHRoaXMubW9kdWxlcy5nZXQoa2V5KTtcbiAgICBpZiAoIW1vZCkgcmV0dXJuO1xuICAgIGF3YWl0IGNhbGxPcHRpb25hbChtb2QuZXhwb3J0cywgXCJkaXNwb3NlXCIsIFtdKTtcbiAgICB0aGlzLm1vZHVsZXMuZGVsZXRlKGtleSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGNyZWF0ZU5hdGl2ZUluc3RhbmNlKFxuICAgIGN0eDogTmF0aXZlVHdlYWtDb250ZXh0LFxuICAgIGtpbmQ6IFwicGFuZWxcIiB8IFwidmlld1wiLFxuICAgIG1vZHVsZUlkOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgZmFjdG9yeTogc3RyaW5nLFxuICAgIG9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICApOiBQcm9taXNlPE5hdGl2ZUluc3RhbmNlPiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gbW9kdWxlSWQgPyB0aGlzLm1vZHVsZUZvcihjdHguaWQsIG1vZHVsZUlkKS5leHBvcnRzIDogdGhpcy5sb2FkTmF0aXZlSG9zdCh0cnVlKTtcbiAgICBjb25zdCBmbiA9IGFzUmVjb3JkKHRhcmdldCk/LltmYWN0b3J5XTtcbiAgICBpZiAodHlwZW9mIGZuICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIGNvbnN0IGxhYmVsID0gbW9kdWxlSWQgPyBgbmF0aXZlIG1vZHVsZSAke2N0eC5pZH06JHttb2R1bGVJZH1gIDogXCJDb2RleCsrIG5hdGl2ZSBob3N0XCI7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7bGFiZWx9IGhhcyBubyBmYWN0b3J5ICR7ZmFjdG9yeX0oKWApO1xuICAgIH1cblxuICAgIGNvbnN0IHBhcmVudFdpbmRvdyA9IHR5cGVvZiBvcHRpb25zLnBhcmVudFdpbmRvd0lkID09PSBcIm51bWJlclwiXG4gICAgICA/IEJyb3dzZXJXaW5kb3cuZnJvbUlkKG9wdGlvbnMucGFyZW50V2luZG93SWQpXG4gICAgICA6IEJyb3dzZXJXaW5kb3cuZ2V0Rm9jdXNlZFdpbmRvdygpO1xuICAgIGNvbnN0IHBhcmVudE5hdGl2ZUhhbmRsZSA9IG5hdGl2ZUhhbmRsZUZvcldpbmRvdyhwYXJlbnRXaW5kb3cpO1xuICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgZm4uY2FsbCh0YXJnZXQsIHtcbiAgICAgIC4uLm9wdGlvbnMsXG4gICAgICBwYXJlbnRXaW5kb3dJZDogd2luZG93SWRGb3IocGFyZW50V2luZG93KSxcbiAgICAgIHBhcmVudFdlYkNvbnRlbnRzSWQ6IHdlYkNvbnRlbnRzSWRGb3IocGFyZW50V2luZG93KSxcbiAgICAgIHBhcmVudE5hdGl2ZUhhbmRsZSxcbiAgICB9KTtcbiAgICBjb25zdCBpZCA9IHR5cGVvZiBhc1JlY29yZCh2YWx1ZSk/LmlkID09PSBcInN0cmluZ1wiID8gU3RyaW5nKGFzUmVjb3JkKHZhbHVlKT8uaWQpIDogcmFuZG9tVVVJRCgpO1xuICAgIGNvbnN0IHdpbmRvd0lkID0gdHlwZW9mIGFzUmVjb3JkKHZhbHVlKT8ud2luZG93SWQgPT09IFwibnVtYmVyXCIgPyBOdW1iZXIoYXNSZWNvcmQodmFsdWUpPy53aW5kb3dJZCkgOiBudWxsO1xuICAgIGNvbnN0IGluc3RhbmNlOiBOYXRpdmVJbnN0YW5jZSA9IHtcbiAgICAgIGtleTogaW5zdGFuY2VLZXkoY3R4LmlkLCBpZCksXG4gICAgICB0d2Vha0lkOiBjdHguaWQsXG4gICAgICBpZCxcbiAgICAgIGtpbmQsXG4gICAgICB2YWx1ZSxcbiAgICAgIHBhcmVudFdpbmRvd0lkOiB3aW5kb3dJZEZvcihwYXJlbnRXaW5kb3cpLFxuICAgICAgd2luZG93SWQsXG4gICAgICBkaXNwb3NlQmluZGluZ3M6IFtdLFxuICAgICAgZGlzcG9zaW5nOiBmYWxzZSxcbiAgICB9O1xuICAgIHRoaXMuaW5zdGFuY2VzLnNldChpbnN0YW5jZS5rZXksIGluc3RhbmNlKTtcbiAgICBpZiAoY2FuQmluZFBhcmVudFdpbmRvdyhwYXJlbnRXaW5kb3cpKSB7XG4gICAgICB0aGlzLmJpbmRJbnN0YW5jZVRvUGFyZW50KGluc3RhbmNlLCBwYXJlbnRXaW5kb3cpO1xuICAgICAgdGhpcy5zeW5jUGFyZW50U3RhdGUoaW5zdGFuY2UsIHBhcmVudFdpbmRvdywgXCJjcmVhdGVkXCIpO1xuICAgIH1cbiAgICB0aGlzLmxvZyhcImluZm9cIiwgYGNyZWF0ZWQgbmF0aXZlICR7a2luZH0gJHtjdHguaWR9OiR7aWR9YCwge1xuICAgICAgbW9kdWxlSWQ6IG1vZHVsZUlkID8/IFwiY29kZXhwcC5uYXRpdmUtaG9zdFwiLFxuICAgICAgZmFjdG9yeSxcbiAgICAgIHdpbmRvd0lkLFxuICAgIH0pO1xuICAgIHJldHVybiBpbnN0YW5jZTtcbiAgfVxuXG4gIHByaXZhdGUgbG9hZE5hdGl2ZUhvc3QocmVxdWlyZWQ6IHRydWUpOiB1bmtub3duO1xuICBwcml2YXRlIGxvYWROYXRpdmVIb3N0KHJlcXVpcmVkOiBmYWxzZSk6IHVua25vd24gfCBudWxsO1xuICBwcml2YXRlIGxvYWROYXRpdmVIb3N0KHJlcXVpcmVkOiBib29sZWFuKTogdW5rbm93biB8IG51bGwge1xuICAgIGlmICh0aGlzLm5hdGl2ZUhvc3RFeHBvcnRzKSByZXR1cm4gdGhpcy5uYXRpdmVIb3N0RXhwb3J0cztcbiAgICBpZiAodGhpcy5uYXRpdmVIb3N0TG9hZEVycm9yICYmICFyZXF1aXJlZCkgcmV0dXJuIG51bGw7XG4gICAgY29uc3QgbmF0aXZlSG9zdFBhdGggPSB0aGlzLm9wdGlvbnMubmF0aXZlSG9zdFBhdGg7XG4gICAgaWYgKCFuYXRpdmVIb3N0UGF0aCB8fCAhZXhpc3RzU3luYyhuYXRpdmVIb3N0UGF0aCkpIHtcbiAgICAgIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKFwiQ29kZXgrKyBuYXRpdmUgaG9zdCBpcyBub3QgaW5zdGFsbGVkXCIpO1xuICAgICAgdGhpcy5uYXRpdmVIb3N0TG9hZEVycm9yID0gZXJyb3I7XG4gICAgICBpZiAocmVxdWlyZWQpIHRocm93IGVycm9yO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICB0aGlzLm5hdGl2ZUhvc3RFeHBvcnRzID0gcmVxdWlyZShuYXRpdmVIb3N0UGF0aCkgYXMgdW5rbm93bjtcbiAgICAgIHRoaXMubmF0aXZlSG9zdExvYWRFcnJvciA9IG51bGw7XG4gICAgICB0aGlzLmxvZyhcImluZm9cIiwgXCJsb2FkZWQgQ29kZXgrKyBuYXRpdmUgaG9zdFwiLCB7IHBhdGg6IG5hdGl2ZUhvc3RQYXRoIH0pO1xuICAgICAgcmV0dXJuIHRoaXMubmF0aXZlSG9zdEV4cG9ydHM7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubmF0aXZlSG9zdExvYWRFcnJvciA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IG5ldyBFcnJvcihTdHJpbmcoZXJyb3IpKTtcbiAgICAgIHRoaXMubG9nKFwiZXJyb3JcIiwgXCJmYWlsZWQgdG8gbG9hZCBDb2RleCsrIG5hdGl2ZSBob3N0XCIsIHRoaXMubmF0aXZlSG9zdExvYWRFcnJvcik7XG4gICAgICBpZiAocmVxdWlyZWQpIHRocm93IHRoaXMubmF0aXZlSG9zdExvYWRFcnJvcjtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVhZE5hdGl2ZUhvc3RDYXBhYmlsaXRpZXMoaG9zdDogdW5rbm93bik6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcbiAgICBjb25zdCBnZXRDYXBhYmlsaXRpZXMgPSBhc1JlY29yZChob3N0KT8uZ2V0Q2FwYWJpbGl0aWVzO1xuICAgIGlmICh0eXBlb2YgZ2V0Q2FwYWJpbGl0aWVzICE9PSBcImZ1bmN0aW9uXCIpIHJldHVybiB7fTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgY2FwYWJpbGl0aWVzID0gZ2V0Q2FwYWJpbGl0aWVzLmNhbGwoaG9zdCk7XG4gICAgICByZXR1cm4gYXNSZWNvcmQoY2FwYWJpbGl0aWVzKSA/PyB7fTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2coXCJ3YXJuXCIsIFwiQ29kZXgrKyBuYXRpdmUgaG9zdCBjYXBhYmlsaXR5IHByb2JlIGZhaWxlZFwiLCBlcnJvcik7XG4gICAgICByZXR1cm4ge307XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBpbnZva2VJbnN0YW5jZShcbiAgICB0d2Vha0lkOiBzdHJpbmcsXG4gICAgaWQ6IHN0cmluZyxcbiAgICBtZXRob2Q6IHN0cmluZyxcbiAgICBhcmdzOiB1bmtub3duW10sXG4gICk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZUZvcih0d2Vha0lkLCBpZCk7XG4gICAgY29uc3QgZm4gPSBhc1JlY29yZChpbnN0YW5jZS52YWx1ZSk/LlttZXRob2RdO1xuICAgIGlmICh0eXBlb2YgZm4gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgYXdhaXQgZm4uYXBwbHkoaW5zdGFuY2UudmFsdWUsIGFyZ3MpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoaW5zdGFuY2Uud2luZG93SWQgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IHdpbiA9IEJyb3dzZXJXaW5kb3cuZnJvbUlkKGluc3RhbmNlLndpbmRvd0lkKTtcbiAgICAgIGlmICh3aW4gJiYgIXdpbi5pc0Rlc3Ryb3llZCgpKSB7XG4gICAgICAgIGlmIChtZXRob2QgPT09IFwic2V0Qm91bmRzXCIpIHdpbi5zZXRCb3VuZHMoYXJnc1swXSBhcyBFbGVjdHJvbi5SZWN0YW5nbGUpO1xuICAgICAgICBlbHNlIGlmIChtZXRob2QgPT09IFwic2hvd1wiKSB3aW4uc2hvdygpO1xuICAgICAgICBlbHNlIGlmIChtZXRob2QgPT09IFwiaGlkZVwiKSB3aW4uaGlkZSgpO1xuICAgICAgICBlbHNlIGlmIChtZXRob2QgPT09IFwic2V0VmlzaWJsZVwiKSAoYXJnc1swXSA/IHdpbi5zaG93KCkgOiB3aW4uaGlkZSgpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYG5hdGl2ZSAke2luc3RhbmNlLmtpbmR9ICR7dHdlYWtJZH06JHtpZH0gZG9lcyBub3QgaW1wbGVtZW50ICR7bWV0aG9kfSgpYCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGRpc3Bvc2VJbnN0YW5jZUJ5SWQodHdlYWtJZDogc3RyaW5nLCBpZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qga2V5ID0gaW5zdGFuY2VLZXkodHdlYWtJZCwgaWQpO1xuICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGtleSk7XG4gICAgaWYgKCFpbnN0YW5jZSkgcmV0dXJuO1xuICAgIGF3YWl0IHRoaXMuZGlzcG9zZUluc3RhbmNlKGluc3RhbmNlKTtcbiAgICB0aGlzLmluc3RhbmNlcy5kZWxldGUoa2V5KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZGlzcG9zZUluc3RhbmNlKGluc3RhbmNlOiBOYXRpdmVJbnN0YW5jZSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmIChpbnN0YW5jZS5kaXNwb3NpbmcpIHJldHVybjtcbiAgICBpbnN0YW5jZS5kaXNwb3NpbmcgPSB0cnVlO1xuICAgIGZvciAoY29uc3QgZGlzcG9zZSBvZiBpbnN0YW5jZS5kaXNwb3NlQmluZGluZ3Muc3BsaWNlKDApKSB7XG4gICAgICB0cnkge1xuICAgICAgICBkaXNwb3NlKCk7XG4gICAgICB9IGNhdGNoIHt9XG4gICAgfVxuICAgIGF3YWl0IGNhbGxPcHRpb25hbChpbnN0YW5jZS52YWx1ZSwgXCJkaXNwb3NlXCIsIFtdKTtcbiAgICBpZiAoaW5zdGFuY2Uud2luZG93SWQgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IHdpbiA9IEJyb3dzZXJXaW5kb3cuZnJvbUlkKGluc3RhbmNlLndpbmRvd0lkKTtcbiAgICAgIGlmICh3aW4gJiYgIXdpbi5pc0Rlc3Ryb3llZCgpKSB3aW4uY2xvc2UoKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGJpbmRJbnN0YW5jZVRvUGFyZW50KGluc3RhbmNlOiBOYXRpdmVJbnN0YW5jZSwgcGFyZW50V2luZG93OiBFbGVjdHJvbi5Ccm93c2VyV2luZG93KTogdm9pZCB7XG4gICAgY29uc3Qgb24gPSAoZXZlbnQ6IHN0cmluZywgbGlzdGVuZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpID0+IHtcbiAgICAgIHBhcmVudFdpbmRvdy5vbihldmVudCBhcyBuZXZlciwgbGlzdGVuZXIgYXMgbmV2ZXIpO1xuICAgICAgaW5zdGFuY2UuZGlzcG9zZUJpbmRpbmdzLnB1c2goKCkgPT4gcGFyZW50V2luZG93Lm9mZihldmVudCBhcyBuZXZlciwgbGlzdGVuZXIgYXMgbmV2ZXIpKTtcbiAgICB9O1xuICAgIGNvbnN0IHN5bmNCb3VuZHMgPSAoKSA9PiB0aGlzLnN5bmNQYXJlbnRTdGF0ZShpbnN0YW5jZSwgcGFyZW50V2luZG93LCBcImJvdW5kc1wiKTtcbiAgICBjb25zdCBzeW5jRm9jdXMgPSAoZm9jdXNlZDogYm9vbGVhbikgPT4gdGhpcy5zaWduYWxQYXJlbnRTdGF0ZShpbnN0YW5jZSwgcGFyZW50V2luZG93LCBcImZvY3VzXCIsIHsgZm9jdXNlZCB9KTtcbiAgICBjb25zdCBzeW5jVmlzaWJpbGl0eSA9ICh2aXNpYmxlOiBib29sZWFuKSA9PlxuICAgICAgdGhpcy5zaWduYWxQYXJlbnRTdGF0ZShpbnN0YW5jZSwgcGFyZW50V2luZG93LCBcInZpc2liaWxpdHlcIiwgeyB2aXNpYmxlIH0pO1xuICAgIGNvbnN0IGRpc3Bvc2VXaXRoUGFyZW50ID0gKCkgPT4ge1xuICAgICAgdGhpcy5sb2coXCJpbmZvXCIsIGBkaXNwb3NpbmcgbmF0aXZlICR7aW5zdGFuY2Uua2luZH0gJHtpbnN0YW5jZS50d2Vha0lkfToke2luc3RhbmNlLmlkfTsgcGFyZW50IGNsb3NlZGApO1xuICAgICAgdm9pZCB0aGlzLmRpc3Bvc2VJbnN0YW5jZUJ5SWQoaW5zdGFuY2UudHdlYWtJZCwgaW5zdGFuY2UuaWQpO1xuICAgIH07XG5cbiAgICBvbihcIm1vdmVcIiwgc3luY0JvdW5kcyk7XG4gICAgb24oXCJyZXNpemVcIiwgc3luY0JvdW5kcyk7XG4gICAgb24oXCJlbnRlci1mdWxsLXNjcmVlblwiLCBzeW5jQm91bmRzKTtcbiAgICBvbihcImxlYXZlLWZ1bGwtc2NyZWVuXCIsIHN5bmNCb3VuZHMpO1xuICAgIG9uKFwibWF4aW1pemVcIiwgc3luY0JvdW5kcyk7XG4gICAgb24oXCJ1bm1heGltaXplXCIsIHN5bmNCb3VuZHMpO1xuICAgIG9uKFwibWluaW1pemVcIiwgc3luY0JvdW5kcyk7XG4gICAgb24oXCJyZXN0b3JlXCIsIHN5bmNCb3VuZHMpO1xuICAgIG9uKFwic2hvd1wiLCAoKSA9PiBzeW5jVmlzaWJpbGl0eSh0cnVlKSk7XG4gICAgb24oXCJoaWRlXCIsICgpID0+IHN5bmNWaXNpYmlsaXR5KGZhbHNlKSk7XG4gICAgb24oXCJmb2N1c1wiLCAoKSA9PiBzeW5jRm9jdXModHJ1ZSkpO1xuICAgIG9uKFwiYmx1clwiLCAoKSA9PiBzeW5jRm9jdXMoZmFsc2UpKTtcbiAgICBvbihcImNsb3NlXCIsIGRpc3Bvc2VXaXRoUGFyZW50KTtcbiAgICBvbihcImNsb3NlZFwiLCBkaXNwb3NlV2l0aFBhcmVudCk7XG4gIH1cblxuICBwcml2YXRlIHN5bmNQYXJlbnRTdGF0ZShcbiAgICBpbnN0YW5jZTogTmF0aXZlSW5zdGFuY2UsXG4gICAgcGFyZW50V2luZG93OiBFbGVjdHJvbi5Ccm93c2VyV2luZG93LFxuICAgIHJlYXNvbjogc3RyaW5nLFxuICApOiB2b2lkIHtcbiAgICBjb25zdCBzdGF0ZSA9IHBhcmVudFdpbmRvd1N0YXRlKHBhcmVudFdpbmRvdywgcmVhc29uKTtcbiAgICBpZiAoIXN0YXRlKSByZXR1cm47XG4gICAgdm9pZCB0aGlzLmNhbGxGaXJzdE9wdGlvbmFsSW5zdGFuY2UoaW5zdGFuY2UsIFtcInN5bmNQYXJlbnRcIiwgXCJwYXJlbnRDaGFuZ2VkXCJdLCBbc3RhdGVdKVxuICAgICAgLnRoZW4oKGhhbmRsZWQpID0+IHtcbiAgICAgICAgaWYgKCFoYW5kbGVkKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEZpcnN0T3B0aW9uYWxJbnN0YW5jZShcbiAgICAgICAgICAgIGluc3RhbmNlLFxuICAgICAgICAgICAgW1wic2V0UGFyZW50Qm91bmRzXCIsIFwicGFyZW50Qm91bmRzQ2hhbmdlZFwiXSxcbiAgICAgICAgICAgIFtzdGF0ZS5ib3VuZHMsIHN0YXRlXSxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0pXG4gICAgICAuY2F0Y2goKGVycm9yKSA9PiB0aGlzLmxvZyhcIndhcm5cIiwgYG5hdGl2ZSAke2luc3RhbmNlLmtpbmR9IHBhcmVudCBzeW5jIGZhaWxlZGAsIGVycm9yKSk7XG4gIH1cblxuICBwcml2YXRlIHNpZ25hbFBhcmVudFN0YXRlKFxuICAgIGluc3RhbmNlOiBOYXRpdmVJbnN0YW5jZSxcbiAgICBwYXJlbnRXaW5kb3c6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3csXG4gICAgcmVhc29uOiBzdHJpbmcsXG4gICAgcGF0Y2g6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICApOiB2b2lkIHtcbiAgICBjb25zdCBzdGF0ZSA9IHBhcmVudFdpbmRvd1N0YXRlKHBhcmVudFdpbmRvdywgcmVhc29uKTtcbiAgICBpZiAoIXN0YXRlKSByZXR1cm47XG4gICAgY29uc3QgcGF5bG9hZCA9IHsgLi4uc3RhdGUsIC4uLnBhdGNoIH07XG4gICAgdm9pZCB0aGlzLmNhbGxGaXJzdE9wdGlvbmFsSW5zdGFuY2UoaW5zdGFuY2UsIFtcInBhcmVudFN0YXRlQ2hhbmdlZFwiLCBcInBhcmVudENoYW5nZWRcIl0sIFtwYXlsb2FkXSlcbiAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHRoaXMubG9nKFwid2FyblwiLCBgbmF0aXZlICR7aW5zdGFuY2Uua2luZH0gcGFyZW50IHNpZ25hbCBmYWlsZWRgLCBlcnJvcikpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjYWxsRmlyc3RPcHRpb25hbEluc3RhbmNlKFxuICAgIGluc3RhbmNlOiBOYXRpdmVJbnN0YW5jZSxcbiAgICBtZXRob2RzOiBzdHJpbmdbXSxcbiAgICBhcmdzOiB1bmtub3duW10sXG4gICk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IHRhcmdldCA9IGFzUmVjb3JkKGluc3RhbmNlLnZhbHVlKTtcbiAgICBmb3IgKGNvbnN0IG1ldGhvZCBvZiBtZXRob2RzKSB7XG4gICAgICBjb25zdCBmbiA9IHRhcmdldD8uW21ldGhvZF07XG4gICAgICBpZiAodHlwZW9mIGZuICE9PSBcImZ1bmN0aW9uXCIpIGNvbnRpbnVlO1xuICAgICAgYXdhaXQgZm4uYXBwbHkoaW5zdGFuY2UudmFsdWUsIGFyZ3MpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc2VuZEhlbHBlcih0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcsIG1lc3NhZ2U6IHVua25vd24pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBoZWxwZXIgPSB0aGlzLmhlbHBlckZvcih0d2Vha0lkLCBpZCk7XG4gICAgaGVscGVyLmNoaWxkLnN0ZGluLndyaXRlKGAke0pTT04uc3RyaW5naWZ5KG1lc3NhZ2UpfVxcbmApO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyByZXF1ZXN0SGVscGVyKFxuICAgIHR3ZWFrSWQ6IHN0cmluZyxcbiAgICBpZDogc3RyaW5nLFxuICAgIG1lc3NhZ2U6IHVua25vd24sXG4gICAgdGltZW91dE1zID0gMTBfMDAwLFxuICApOiBQcm9taXNlPHVua25vd24+IHtcbiAgICBjb25zdCBoZWxwZXIgPSB0aGlzLmhlbHBlckZvcih0d2Vha0lkLCBpZCk7XG4gICAgY29uc3QgcmVxdWVzdElkID0gcmFuZG9tVVVJRCgpO1xuICAgIGNvbnN0IHBheWxvYWQgPSB7IGlkOiByZXF1ZXN0SWQsIG1lc3NhZ2UgfTtcbiAgICByZXR1cm4gYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgaGVscGVyLnBlbmRpbmcuZGVsZXRlKHJlcXVlc3RJZCk7XG4gICAgICAgIHJlamVjdChuZXcgRXJyb3IoYG5hdGl2ZSBoZWxwZXIgcmVxdWVzdCB0aW1lZCBvdXQ6ICR7dHdlYWtJZH06JHtpZH1gKSk7XG4gICAgICB9LCB0aW1lb3V0TXMpO1xuICAgICAgaGVscGVyLnBlbmRpbmcuc2V0KHJlcXVlc3RJZCwgeyByZXNvbHZlLCByZWplY3QsIHRpbWVyIH0pO1xuICAgICAgaGVscGVyLmNoaWxkLnN0ZGluLndyaXRlKGAke0pTT04uc3RyaW5naWZ5KHBheWxvYWQpfVxcbmApO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBzdG9wSGVscGVyQnlJZCh0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBrZXkgPSBoZWxwZXJLZXkodHdlYWtJZCwgaWQpO1xuICAgIGNvbnN0IGhlbHBlciA9IHRoaXMuaGVscGVycy5nZXQoa2V5KTtcbiAgICBpZiAoIWhlbHBlcikgcmV0dXJuO1xuICAgIHRoaXMuc3RvcEhlbHBlcihoZWxwZXIpO1xuICAgIHRoaXMuaGVscGVycy5kZWxldGUoa2V5KTtcbiAgfVxuXG4gIHByaXZhdGUgc3RvcEhlbHBlcihoZWxwZXI6IE5hdGl2ZUhlbHBlclByb2Nlc3MpOiB2b2lkIHtcbiAgICBpZiAoaGVscGVyLmNoaWxkLmtpbGxlZCkgcmV0dXJuO1xuICAgIGhlbHBlci5jaGlsZC5raWxsKCk7XG4gICAgY29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGlmICghaGVscGVyLmNoaWxkLmtpbGxlZCkgaGVscGVyLmNoaWxkLmtpbGwoXCJTSUdLSUxMXCIpO1xuICAgIH0sIDE1MDApO1xuICAgIHRpbWVyLnVucmVmPy4oKTtcbiAgfVxuXG4gIHByaXZhdGUgaGFuZGxlSGVscGVyTGluZShoZWxwZXI6IE5hdGl2ZUhlbHBlclByb2Nlc3MsIGxpbmU6IHN0cmluZyk6IHZvaWQge1xuICAgIGxldCBwYXlsb2FkOiB7IGlkPzogdW5rbm93bjsgcmVzdWx0PzogdW5rbm93bjsgZXJyb3I/OiB1bmtub3duIH07XG4gICAgdHJ5IHtcbiAgICAgIHBheWxvYWQgPSBKU09OLnBhcnNlKGxpbmUpIGFzIHR5cGVvZiBwYXlsb2FkO1xuICAgIH0gY2F0Y2gge1xuICAgICAgdGhpcy5sb2coXCJpbmZvXCIsIGBuYXRpdmUgaGVscGVyICR7aGVscGVyLnR3ZWFrSWR9OiR7aGVscGVyLmlkfWAsIGxpbmUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHBheWxvYWQuaWQgIT09IFwic3RyaW5nXCIpIHJldHVybjtcbiAgICBjb25zdCByZXF1ZXN0ID0gaGVscGVyLnBlbmRpbmcuZ2V0KHBheWxvYWQuaWQpO1xuICAgIGlmICghcmVxdWVzdCkgcmV0dXJuO1xuICAgIGhlbHBlci5wZW5kaW5nLmRlbGV0ZShwYXlsb2FkLmlkKTtcbiAgICBjbGVhclRpbWVvdXQocmVxdWVzdC50aW1lcik7XG4gICAgaWYgKHBheWxvYWQuZXJyb3IpIHtcbiAgICAgIHJlcXVlc3QucmVqZWN0KG5ldyBFcnJvcihTdHJpbmcocGF5bG9hZC5lcnJvcikpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVxdWVzdC5yZXNvbHZlKHBheWxvYWQucmVzdWx0KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIG1vZHVsZUZvcih0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiBMb2FkZWROYXRpdmVNb2R1bGUge1xuICAgIGNvbnN0IG1vZCA9IHRoaXMubW9kdWxlcy5nZXQobW9kdWxlS2V5KHR3ZWFrSWQsIGlkKSk7XG4gICAgaWYgKCFtb2QpIHRocm93IG5ldyBFcnJvcihgbmF0aXZlIG1vZHVsZSBpcyBub3QgbG9hZGVkOiAke3R3ZWFrSWR9OiR7aWR9YCk7XG4gICAgcmV0dXJuIG1vZDtcbiAgfVxuXG4gIHByaXZhdGUgaW5zdGFuY2VGb3IodHdlYWtJZDogc3RyaW5nLCBpZDogc3RyaW5nKTogTmF0aXZlSW5zdGFuY2Uge1xuICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGluc3RhbmNlS2V5KHR3ZWFrSWQsIGlkKSk7XG4gICAgaWYgKCFpbnN0YW5jZSkgdGhyb3cgbmV3IEVycm9yKGBuYXRpdmUgaW5zdGFuY2UgaXMgbm90IGxvYWRlZDogJHt0d2Vha0lkfToke2lkfWApO1xuICAgIHJldHVybiBpbnN0YW5jZTtcbiAgfVxuXG4gIHByaXZhdGUgaGVscGVyRm9yKHR3ZWFrSWQ6IHN0cmluZywgaWQ6IHN0cmluZyk6IE5hdGl2ZUhlbHBlclByb2Nlc3Mge1xuICAgIGNvbnN0IGhlbHBlciA9IHRoaXMuaGVscGVycy5nZXQoaGVscGVyS2V5KHR3ZWFrSWQsIGlkKSk7XG4gICAgaWYgKCFoZWxwZXIpIHRocm93IG5ldyBFcnJvcihgbmF0aXZlIGhlbHBlciBpcyBub3QgcnVubmluZzogJHt0d2Vha0lkfToke2lkfWApO1xuICAgIHJldHVybiBoZWxwZXI7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVzb2x2ZVR3ZWFrUGF0aChjdHg6IE5hdGl2ZVR3ZWFrQ29udGV4dCwgcGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHJlc29sdmVOYXRpdmVUd2Vha1BhdGgoY3R4LmRpciwgcGF0aCk7XG59XG5cbmZ1bmN0aW9uIGluZmVyTW9kdWxlS2luZChwYXRoOiBzdHJpbmcpOiBOYXRpdmVNb2R1bGVLaW5kIHtcbiAgaWYgKHBhdGguZW5kc1dpdGgoXCIubm9kZVwiKSkgcmV0dXJuIFwibm9kZS1hZGRvblwiO1xuICBpZiAocGF0aC5lbmRzV2l0aChcIi5keWxpYlwiKSkgcmV0dXJuIFwiZHlsaWJcIjtcbiAgaWYgKHBhdGguZW5kc1dpdGgoXCIuZnJhbWV3b3JrXCIpKSByZXR1cm4gXCJmcmFtZXdvcmtcIjtcbiAgdGhyb3cgbmV3IEVycm9yKFwibmF0aXZlIG1vZHVsZSBwYXRoIG11c3QgZW5kIGluIC5ub2RlLCAuZHlsaWIsIG9yIC5mcmFtZXdvcmtcIik7XG59XG5cbmZ1bmN0aW9uIHNlbGVjdEVudHJ5cG9pbnQobG9hZGVkOiB1bmtub3duLCBlbnRyeXBvaW50OiBzdHJpbmcgfCB1bmRlZmluZWQpOiB1bmtub3duIHtcbiAgaWYgKCFlbnRyeXBvaW50KSByZXR1cm4gYXNSZWNvcmQobG9hZGVkKT8uZGVmYXVsdCA/PyBsb2FkZWQ7XG4gIGNvbnN0IHNlbGVjdGVkID0gYXNSZWNvcmQobG9hZGVkKT8uW2VudHJ5cG9pbnRdO1xuICBpZiAoc2VsZWN0ZWQgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKGBuYXRpdmUgbW9kdWxlIGVudHJ5cG9pbnQgbm90IGZvdW5kOiAke2VudHJ5cG9pbnR9YCk7XG4gIHJldHVybiBzZWxlY3RlZDtcbn1cblxuZnVuY3Rpb24gYXNzZXJ0QnJpZGdlSWQodmFsdWU6IHN0cmluZywgbGFiZWw6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09IFwic3RyaW5nXCIgfHwgIS9eW2EtekEtWjAtOS5fLV0rJC8udGVzdCh2YWx1ZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYCR7bGFiZWx9IG1heSBvbmx5IGNvbnRhaW4gbGV0dGVycywgbnVtYmVycywgZG90cywgdW5kZXJzY29yZXMsIGFuZCBkYXNoZXNgKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIG1vZHVsZUtleSh0d2Vha0lkOiBzdHJpbmcsIG1vZHVsZUlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7dHdlYWtJZH06JHttb2R1bGVJZH1gO1xufVxuXG5mdW5jdGlvbiBpbnN0YW5jZUtleSh0d2Vha0lkOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7dHdlYWtJZH06JHtpZH1gO1xufVxuXG5mdW5jdGlvbiBoZWxwZXJLZXkodHdlYWtJZDogc3RyaW5nLCBpZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke3R3ZWFrSWR9OiR7aWR9YDtcbn1cblxuZnVuY3Rpb24gYXNSZWNvcmQodmFsdWU6IHVua25vd24pOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IG51bGwge1xuICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiID8gdmFsdWUgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gOiBudWxsO1xufVxuXG5hc3luYyBmdW5jdGlvbiBjYWxsT3B0aW9uYWwodGFyZ2V0OiB1bmtub3duLCBtZXRob2Q6IHN0cmluZywgYXJnczogdW5rbm93bltdKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGZuID0gYXNSZWNvcmQodGFyZ2V0KT8uW21ldGhvZF07XG4gIGlmICh0eXBlb2YgZm4gPT09IFwiZnVuY3Rpb25cIikgYXdhaXQgZm4uYXBwbHkodGFyZ2V0LCBhcmdzKTtcbn1cblxuZnVuY3Rpb24gcGFyZW50V2luZG93U3RhdGUocGFyZW50V2luZG93OiBFbGVjdHJvbi5Ccm93c2VyV2luZG93LCByZWFzb246IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbCB7XG4gIGlmIChpc1dpbmRvd0Rlc3Ryb3llZChwYXJlbnRXaW5kb3cpKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgYm91bmRzID0gY2FsbFdpbmRvd01ldGhvZDxFbGVjdHJvbi5SZWN0YW5nbGU+KHBhcmVudFdpbmRvdywgXCJnZXRCb3VuZHNcIik7XG4gIGNvbnN0IGNvbnRlbnRCb3VuZHMgPSBjYWxsV2luZG93TWV0aG9kPEVsZWN0cm9uLlJlY3RhbmdsZT4ocGFyZW50V2luZG93LCBcImdldENvbnRlbnRCb3VuZHNcIik7XG4gIHJldHVybiB7XG4gICAgcmVhc29uLFxuICAgIHdpbmRvd0lkOiB3aW5kb3dJZEZvcihwYXJlbnRXaW5kb3cpLFxuICAgIHdlYkNvbnRlbnRzSWQ6IHdlYkNvbnRlbnRzSWRGb3IocGFyZW50V2luZG93KSxcbiAgICBib3VuZHMsXG4gICAgY29udGVudEJvdW5kcyxcbiAgICB2aXNpYmxlOiBjYWxsV2luZG93TWV0aG9kPGJvb2xlYW4+KHBhcmVudFdpbmRvdywgXCJpc1Zpc2libGVcIikgPz8gbnVsbCxcbiAgICBmb2N1c2VkOiBjYWxsV2luZG93TWV0aG9kPGJvb2xlYW4+KHBhcmVudFdpbmRvdywgXCJpc0ZvY3VzZWRcIikgPz8gbnVsbCxcbiAgICBtaW5pbWl6ZWQ6IGNhbGxXaW5kb3dNZXRob2Q8Ym9vbGVhbj4ocGFyZW50V2luZG93LCBcImlzTWluaW1pemVkXCIpID8/IG51bGwsXG4gICAgbWF4aW1pemVkOiBjYWxsV2luZG93TWV0aG9kPGJvb2xlYW4+KHBhcmVudFdpbmRvdywgXCJpc01heGltaXplZFwiKSA/PyBudWxsLFxuICAgIGZ1bGxzY3JlZW46IGNhbGxXaW5kb3dNZXRob2Q8Ym9vbGVhbj4ocGFyZW50V2luZG93LCBcImlzRnVsbFNjcmVlblwiKSA/PyBudWxsLFxuICB9O1xufVxuXG5mdW5jdGlvbiBuYXRpdmVIYW5kbGVGb3JXaW5kb3cocGFyZW50V2luZG93OiBFbGVjdHJvbi5Ccm93c2VyV2luZG93IHwgbnVsbCB8IHVuZGVmaW5lZCk6IEJ1ZmZlciB8IG51bGwge1xuICBpZiAoIXBhcmVudFdpbmRvdyB8fCBpc1dpbmRvd0Rlc3Ryb3llZChwYXJlbnRXaW5kb3cpKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgZm4gPSBhc1JlY29yZChwYXJlbnRXaW5kb3cpPy5nZXROYXRpdmVXaW5kb3dIYW5kbGU7XG4gIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIG51bGw7XG4gIHRyeSB7XG4gICAgY29uc3QgaGFuZGxlID0gZm4uY2FsbChwYXJlbnRXaW5kb3cpO1xuICAgIHJldHVybiBCdWZmZXIuaXNCdWZmZXIoaGFuZGxlKSA/IGhhbmRsZSA6IG51bGw7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNhbkJpbmRQYXJlbnRXaW5kb3coXG4gIHBhcmVudFdpbmRvdzogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGwgfCB1bmRlZmluZWQsXG4pOiBwYXJlbnRXaW5kb3cgaXMgRWxlY3Ryb24uQnJvd3NlcldpbmRvdyB7XG4gIGlmICghcGFyZW50V2luZG93IHx8IGlzV2luZG93RGVzdHJveWVkKHBhcmVudFdpbmRvdykpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIHR5cGVvZiBhc1JlY29yZChwYXJlbnRXaW5kb3cpPy5vbiA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgdHlwZW9mIGFzUmVjb3JkKHBhcmVudFdpbmRvdyk/Lm9mZiA9PT0gXCJmdW5jdGlvblwiO1xufVxuXG5mdW5jdGlvbiBpc1dpbmRvd0Rlc3Ryb3llZChwYXJlbnRXaW5kb3c6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsIHwgdW5kZWZpbmVkKTogYm9vbGVhbiB7XG4gIGNvbnN0IGZuID0gYXNSZWNvcmQocGFyZW50V2luZG93KT8uaXNEZXN0cm95ZWQ7XG4gIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIGZhbHNlO1xuICB0cnkge1xuICAgIHJldHVybiBCb29sZWFuKGZuLmNhbGwocGFyZW50V2luZG93KSk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59XG5cbmZ1bmN0aW9uIHdpbmRvd0lkRm9yKHBhcmVudFdpbmRvdzogRWxlY3Ryb24uQnJvd3NlcldpbmRvdyB8IG51bGwgfCB1bmRlZmluZWQpOiBudW1iZXIgfCBudWxsIHtcbiAgY29uc3QgaWQgPSBhc1JlY29yZChwYXJlbnRXaW5kb3cpPy5pZDtcbiAgcmV0dXJuIHR5cGVvZiBpZCA9PT0gXCJudW1iZXJcIiA/IGlkIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gd2ViQ29udGVudHNJZEZvcihwYXJlbnRXaW5kb3c6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3cgfCBudWxsIHwgdW5kZWZpbmVkKTogbnVtYmVyIHwgbnVsbCB7XG4gIGNvbnN0IHdlYkNvbnRlbnRzID0gYXNSZWNvcmQoYXNSZWNvcmQocGFyZW50V2luZG93KT8ud2ViQ29udGVudHMpO1xuICBjb25zdCBpZCA9IHdlYkNvbnRlbnRzPy5pZDtcbiAgcmV0dXJuIHR5cGVvZiBpZCA9PT0gXCJudW1iZXJcIiA/IGlkIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gY2FsbFdpbmRvd01ldGhvZDxUPihwYXJlbnRXaW5kb3c6IEVsZWN0cm9uLkJyb3dzZXJXaW5kb3csIG1ldGhvZDogc3RyaW5nKTogVCB8IG51bGwge1xuICBjb25zdCBmbiA9IGFzUmVjb3JkKHBhcmVudFdpbmRvdyk/LlttZXRob2RdO1xuICBpZiAodHlwZW9mIGZuICE9PSBcImZ1bmN0aW9uXCIpIHJldHVybiBudWxsO1xuICB0cnkge1xuICAgIHJldHVybiBmbi5jYWxsKHBhcmVudFdpbmRvdykgYXMgVDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbiIsICIvKipcbiAqIFR3ZWFrIGNhcGFiaWxpdHkgYXV0aG9yaXphdGlvbi4gVGhpcyBpcyB0aGUgc2luZ2xlIHNvdXJjZSBvZiB0cnV0aCBmb3JcbiAqIGBUd2Vha01hbmlmZXN0LnBlcm1pc3Npb25zYCBlbmZvcmNlbWVudC5cbiAqXG4gKiBQb2xpY3k6XG4gKiAgIDEuIHBlcm1pc3Npb25zIEFCU0VOVDogbGVnYWN5IFx1MjAxNCBwcmVzZXJ2ZSBleGlzdGluZyBBUEkgYmVoYXZpb3JcbiAqICAgMi4gcGVybWlzc2lvbnMgUFJFU0VOVDogZW5mb3JjZSB0aGUgZGVjbGFyZWQgbGlzdCBzdHJpY3RseVxuICogICAzLiBwZXJtaXNzaW9uczogW10gaXMgTk9UIGxlZ2FjeSBcdTIwMTQgZXhwbGljaXRseSBubyBvcHRpb25hbCBjYXBhYmlsaXRpZXNcbiAqXG4gKiBIaXN0b3JpY2FsIGFsaWFzZXMgKGBjb2RleC53aW5kb3dzYCBcdTIxOTIgYGNvZGV4LXdpbmRvd3NgLCBgY29kZXgudmlld3NgIFx1MjE5MlxuICogYGNvZGV4LXZpZXdzYCkgYXJlIHByZXNlcnZlZCBhbmQgdHJlYXRlZCBhcyBlcXVpdmFsZW50LlxuICpcbiAqIFRoaXMgaXMgY2FwYWJpbGl0eSBhdXRob3JpemF0aW9uIC8gbGVhc3QgcHJpdmlsZWdlLCBub3QgYSBwcm9jZXNzIHNhbmRib3guXG4gKiBUd2Vha3MgcmVtYWluIGxvY2FsIGNvZGUuIFJlbmRlcmVyIGZpbHRlcmluZyBpcyBkZWZlbnNlLWluLWRlcHRoOyBtYWluXG4gKiBhdXRob3JpemVzIHdoZW4gYSB0d2VhayBpZGVudGl0eSBpcyBwcmVzZW50LlxuICovXG5pbXBvcnQgdHlwZSB7XG4gIFR3ZWFrRnMsXG4gIFR3ZWFrSXBjLFxuICBUd2Vha01hbmlmZXN0LFxuICBUd2Vha1Blcm1pc3Npb24sXG59IGZyb20gXCJAY29kZXgtcGx1c3BsdXMvc2RrXCI7XG5cbmV4cG9ydCBjb25zdCBUV0VBS19QRVJNSVNTSU9OX0FMSUFTRVMgPSB7XG4gIFwiY29kZXgud2luZG93c1wiOiBcImNvZGV4LXdpbmRvd3NcIixcbiAgXCJjb2RleC52aWV3c1wiOiBcImNvZGV4LXZpZXdzXCIsXG59IGFzIGNvbnN0O1xuXG5leHBvcnQgdHlwZSBDYW5vbmljYWxUd2Vha1Blcm1pc3Npb24gPVxuICB8IFwiaXBjXCJcbiAgfCBcImZpbGVzeXN0ZW1cIlxuICB8IFwibmV0d29ya1wiXG4gIHwgXCJzZXR0aW5nc1wiXG4gIHwgXCJjb2RleC1ydW50aW1lXCJcbiAgfCBcImNvZGV4LXdpbmRvd3NcIlxuICB8IFwiY29kZXgtdmlld3NcIlxuICB8IFwiY29kZXgtY2RwXCJcbiAgfCBcIm5hdGl2ZS1tb2R1bGVcIlxuICB8IFwibmF0aXZlLXZpZXdcIlxuICB8IFwibmF0aXZlLWhlbHBlclwiO1xuXG4vKiogTGF5ZXIgU2V0dGluZ3MgLyBTdG9yZSAvIHNlbGYtdXBkYXRlIGFkbWluIElQQy4gTm90IGEgdGhpcmQtcGFydHkgdHdlYWsuICovXG5leHBvcnQgY29uc3QgTEFZRVJfQURNSU5fSVBDX0NIQU5ORUxTID0gW1xuICBcImNvZGV4cHA6aW5zdGFsbC1zdG9yZS10d2Vha1wiLFxuICBcImNvZGV4cHA6aW5zdGFsbC1naXRodWItdHdlYWtcIixcbiAgXCJjb2RleHBwOnByZXBhcmUtdHdlYWstc3RvcmUtc3VibWlzc2lvblwiLFxuICBcImNvZGV4cHA6cnVuLWNvZGV4cHAtdXBkYXRlXCIsXG4gIFwiY29kZXhwcDpzZXQtYXV0by11cGRhdGVcIixcbiAgXCJjb2RleHBwOnNldC11cGRhdGUtY29uZmlnXCIsXG5dIGFzIGNvbnN0O1xuXG4vKipcbiAqIFR3ZWFrLXRyaWdnZXJhYmxlIHByaXZpbGVnZWQvY2FwYWJpbGl0eSBJUEMuIE1haW4gbXVzdCByZXNvbHZlIGlkZW50aXR5LFxuICogcmVxdWlyZSBkaXNjb3ZlcmVkK2VuYWJsZWQsIGFuZCBlbmZvcmNlIHRoZSBtYXBwZWQgcGVybWlzc2lvbi5cbiAqL1xuZXhwb3J0IGNvbnN0IFRXRUFLX0NBUEFCSUxJVFlfSVBDX0NIQU5ORUxTID0ge1xuICBcImNvZGV4cHA6dHdlYWstZnNcIjogXCJmaWxlc3lzdGVtXCIsXG4gIFwiY29kZXhwcDpjb2RleC13aW5kb3ctY3JlYXRlXCI6IFwiY29kZXgtd2luZG93c1wiLFxuICBcImNvZGV4cHA6Y29kZXgtd2luZG93LXByaW1hcnlcIjogXCJjb2RleC13aW5kb3dzXCIsXG4gIFwiY29kZXhwcDpjb2RleC13aW5kb3ctZm9jdXNcIjogXCJjb2RleC13aW5kb3dzXCIsXG4gIFwiY29kZXhwcDpjb2RleC13aW5kb3ctc2hvd1wiOiBcImNvZGV4LXdpbmRvd3NcIixcbiAgXCJjb2RleHBwOmNvZGV4LXZpZXctY3JlYXRlXCI6IFwiY29kZXgtdmlld3NcIixcbiAgXCJjb2RleHBwOmNvZGV4LXZpZXctY2FsbFwiOiBcImNvZGV4LXZpZXdzXCIsXG4gIFwiY29kZXhwcDpuYXRpdmUtbG9hZC1tb2R1bGVcIjogXCJuYXRpdmUtbW9kdWxlXCIsXG4gIFwiY29kZXhwcDpuYXRpdmUtbW9kdWxlLXJlcXVlc3RcIjogXCJuYXRpdmUtbW9kdWxlXCIsXG4gIFwiY29kZXhwcDpuYXRpdmUtbW9kdWxlLWRpc3Bvc2VcIjogXCJuYXRpdmUtbW9kdWxlXCIsXG4gIFwiY29kZXhwcDpuYXRpdmUtY3JlYXRlLXBhbmVsXCI6IFwibmF0aXZlLXZpZXdcIixcbiAgXCJjb2RleHBwOm5hdGl2ZS1hdHRhY2gtdmlld1wiOiBcIm5hdGl2ZS12aWV3XCIsXG4gIFwiY29kZXhwcDpuYXRpdmUtaW5zdGFuY2UtY2FsbFwiOiBcIm5hdGl2ZS12aWV3XCIsXG4gIFwiY29kZXhwcDpuYXRpdmUtbGF1bmNoLWhlbHBlclwiOiBcIm5hdGl2ZS1oZWxwZXJcIixcbiAgXCJjb2RleHBwOm5hdGl2ZS1oZWxwZXItY2FsbFwiOiBcIm5hdGl2ZS1oZWxwZXJcIixcbiAgXCJjb2RleHBwOmNvZGV4LXJ1bnRpbWUtaW5mb1wiOiBcImNvZGV4LXJ1bnRpbWVcIixcbiAgXCJjb2RleHBwOmNvZGV4LXJ1bnRpbWUtY2FwYWJpbGl0aWVzXCI6IFwiY29kZXgtcnVudGltZVwiLFxuICBcImNvZGV4cHA6Y29kZXgtY2RwLXN0YXR1c1wiOiBcImNvZGV4LWNkcFwiLFxuICBcImNvZGV4cHA6Y29kZXgtY2RwLXRhcmdldHNcIjogXCJjb2RleC1jZHBcIixcbn0gYXMgY29uc3Q7XG5cbmV4cG9ydCB0eXBlIFR3ZWFrQ2FwYWJpbGl0eUlwY0NoYW5uZWwgPSBrZXlvZiB0eXBlb2YgVFdFQUtfQ0FQQUJJTElUWV9JUENfQ0hBTk5FTFM7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHdlYWtJZGVudGl0eVNuYXBzaG90IHtcbiAgaWQ6IHN0cmluZztcbiAgZW5hYmxlZDogYm9vbGVhbjtcbiAgZGlyOiBzdHJpbmc7XG4gIG1hbmlmZXN0OiBUd2Vha01hbmlmZXN0O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFR3ZWFrQXBpU3VyZmFjZSB7XG4gIHNldHRpbmdzOiBib29sZWFuO1xuICBpcGM6IGJvb2xlYW47XG4gIGZpbGVzeXN0ZW06IGJvb2xlYW47XG4gIC8qKiBEZWNsYXJhdGl2ZSBvbmx5IFx1MjAxNCBwcmVsb2FkIGNhbm5vdCBibG9jayB3ZWIgYGZldGNoYC4gKi9cbiAgbmV0d29yazogYm9vbGVhbjtcbiAgY29kZXhSdW50aW1lOiBib29sZWFuO1xuICBjb2RleFdpbmRvd3M6IGJvb2xlYW47XG4gIGNvZGV4Vmlld3M6IGJvb2xlYW47XG4gIGNvZGV4Q2RwOiBib29sZWFuO1xuICBuYXRpdmVNb2R1bGU6IGJvb2xlYW47XG4gIG5hdGl2ZVZpZXc6IGJvb2xlYW47XG4gIG5hdGl2ZUhlbHBlcjogYm9vbGVhbjtcbn1cblxuZXhwb3J0IHR5cGUgVHdlYWtBcGlTbG90ID0gXCJwcmVzZW50XCIgfCBcImRlbmllZFwiIHwgXCJvbWl0dGVkXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHdlYWtBcGlQbGFuIHtcbiAgc2V0dGluZ3M6IFR3ZWFrQXBpU2xvdDtcbiAgaXBjOiBUd2Vha0FwaVNsb3Q7XG4gIGZzOiBUd2Vha0FwaVNsb3Q7XG4gIHJlYWN0OiBUd2Vha0FwaVNsb3Q7XG4gIGNvZGV4OiBUd2Vha0FwaVNsb3Q7XG4gIGNvZGV4UnVudGltZTogVHdlYWtBcGlTbG90O1xuICBjb2RleFdpbmRvd3M6IFR3ZWFrQXBpU2xvdDtcbiAgY29kZXhWaWV3czogVHdlYWtBcGlTbG90O1xuICBjb2RleENkcDogVHdlYWtBcGlTbG90O1xuICBuYXRpdmVNb2R1bGU6IFR3ZWFrQXBpU2xvdDtcbiAgbmF0aXZlVmlldzogVHdlYWtBcGlTbG90O1xuICBuYXRpdmVIZWxwZXI6IFR3ZWFrQXBpU2xvdDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUd2Vha0lwY0JyaWRnZSB7XG4gIG9uKGNoYW5uZWw6IHN0cmluZywgbGlzdGVuZXI6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQpOiB2b2lkO1xuICByZW1vdmVMaXN0ZW5lcihjaGFubmVsOiBzdHJpbmcsIGxpc3RlbmVyOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkKTogdm9pZDtcbiAgc2VuZChjaGFubmVsOiBzdHJpbmcsIC4uLmFyZ3M6IHVua25vd25bXSk6IHZvaWQ7XG4gIGludm9rZShjaGFubmVsOiBzdHJpbmcsIC4uLmFyZ3M6IHVua25vd25bXSk6IFByb21pc2U8dW5rbm93bj47XG59XG5cbmNvbnN0IFRXRUFLX0lEX1JFID0gL15bYS16QS1aMC05Ll8tXSskLztcblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVBlcm1pc3Npb24ocGVybWlzc2lvbjogc3RyaW5nKTogQ2Fub25pY2FsVHdlYWtQZXJtaXNzaW9uIHtcbiAgY29uc3QgYWxpYXNlZCA9IChUV0VBS19QRVJNSVNTSU9OX0FMSUFTRVMgYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPilbcGVybWlzc2lvbl0gPz8gcGVybWlzc2lvbjtcbiAgcmV0dXJuIGFsaWFzZWQgYXMgQ2Fub25pY2FsVHdlYWtQZXJtaXNzaW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaGFzRXhwbGljaXRQZXJtaXNzaW9ucyhcbiAgbWFuaWZlc3Q6IFBpY2s8VHdlYWtNYW5pZmVzdCwgXCJwZXJtaXNzaW9uc1wiPixcbik6IGJvb2xlYW4ge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShtYW5pZmVzdC5wZXJtaXNzaW9ucyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0xlZ2FjeVBlcm1pc3Npb25NYW5pZmVzdChcbiAgbWFuaWZlc3Q6IFBpY2s8VHdlYWtNYW5pZmVzdCwgXCJwZXJtaXNzaW9uc1wiPixcbik6IGJvb2xlYW4ge1xuICByZXR1cm4gbWFuaWZlc3QucGVybWlzc2lvbnMgPT09IHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc1R3ZWFrUGVybWlzc2lvbihcbiAgbWFuaWZlc3Q6IFBpY2s8VHdlYWtNYW5pZmVzdCwgXCJwZXJtaXNzaW9uc1wiPixcbiAgcGVybWlzc2lvbjogVHdlYWtQZXJtaXNzaW9uIHwgQ2Fub25pY2FsVHdlYWtQZXJtaXNzaW9uLFxuKTogYm9vbGVhbiB7XG4gIGlmICghaGFzRXhwbGljaXRQZXJtaXNzaW9ucyhtYW5pZmVzdCkpIHJldHVybiB0cnVlO1xuICBjb25zdCB3YW50ZWQgPSBub3JtYWxpemVQZXJtaXNzaW9uKHBlcm1pc3Npb24pO1xuICByZXR1cm4gKG1hbmlmZXN0LnBlcm1pc3Npb25zID8/IFtdKS5zb21lKChlbnRyeSkgPT4gbm9ybWFsaXplUGVybWlzc2lvbihlbnRyeSkgPT09IHdhbnRlZCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwZXJtaXNzaW9uRGVuaWVkTWVzc2FnZShcbiAgdHdlYWtJZDogc3RyaW5nLFxuICBwZXJtaXNzaW9uOiBUd2Vha1Blcm1pc3Npb24gfCBDYW5vbmljYWxUd2Vha1Blcm1pc3Npb24sXG4pOiBzdHJpbmcge1xuICByZXR1cm4gYHR3ZWFrICR7dHdlYWtJZH0gbXVzdCBkZWNsYXJlICR7bm9ybWFsaXplUGVybWlzc2lvbihwZXJtaXNzaW9uKX0gcGVybWlzc2lvbmA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwZXJtaXNzaW9uRGVuaWVkRXJyb3IoXG4gIHR3ZWFrSWQ6IHN0cmluZyxcbiAgcGVybWlzc2lvbjogVHdlYWtQZXJtaXNzaW9uIHwgQ2Fub25pY2FsVHdlYWtQZXJtaXNzaW9uLFxuKTogRXJyb3Ige1xuICByZXR1cm4gbmV3IEVycm9yKHBlcm1pc3Npb25EZW5pZWRNZXNzYWdlKHR3ZWFrSWQsIHBlcm1pc3Npb24pKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFR3ZWFrSGFzUGVybWlzc2lvbihcbiAgbWFuaWZlc3Q6IFR3ZWFrTWFuaWZlc3QsXG4gIHBlcm1pc3Npb246IFR3ZWFrUGVybWlzc2lvbiB8IENhbm9uaWNhbFR3ZWFrUGVybWlzc2lvbixcbik6IHZvaWQge1xuICBpZiAoIWhhc1R3ZWFrUGVybWlzc2lvbihtYW5pZmVzdCwgcGVybWlzc2lvbikpIHtcbiAgICB0aHJvdyBwZXJtaXNzaW9uRGVuaWVkRXJyb3IobWFuaWZlc3QuaWQsIHBlcm1pc3Npb24pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1ZhbGlkVHdlYWtJZCh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIHN0cmluZyB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgJiYgVFdFQUtfSURfUkUudGVzdCh2YWx1ZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRWYWxpZFR3ZWFrSWQodmFsdWU6IHVua25vd24pOiBhc3NlcnRzIHZhbHVlIGlzIHN0cmluZyB7XG4gIGlmICghaXNWYWxpZFR3ZWFrSWQodmFsdWUpKSB0aHJvdyBuZXcgRXJyb3IoXCJiYWQgdHdlYWsgaWRcIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBiaW5kT3duZWRUd2Vha0lkKG93bmVySWQ6IHN0cmluZywgcmVxdWVzdGVkSWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIGFzc2VydFZhbGlkVHdlYWtJZChvd25lcklkKTtcbiAgYXNzZXJ0VmFsaWRUd2Vha0lkKHJlcXVlc3RlZElkKTtcbiAgaWYgKG93bmVySWQgIT09IHJlcXVlc3RlZElkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGB0d2VhayAke293bmVySWR9IGNhbm5vdCB1c2UgdHdlYWsgJHtyZXF1ZXN0ZWRJZH0ncyBpZGVudGl0eWApO1xuICB9XG4gIHJldHVybiBvd25lcklkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHdlYWtBcGlTdXJmYWNlKFxuICBtYW5pZmVzdDogUGljazxUd2Vha01hbmlmZXN0LCBcInBlcm1pc3Npb25zXCI+LFxuKTogVHdlYWtBcGlTdXJmYWNlIHtcbiAgcmV0dXJuIHtcbiAgICBzZXR0aW5nczogaGFzVHdlYWtQZXJtaXNzaW9uKG1hbmlmZXN0LCBcInNldHRpbmdzXCIpLFxuICAgIGlwYzogaGFzVHdlYWtQZXJtaXNzaW9uKG1hbmlmZXN0LCBcImlwY1wiKSxcbiAgICBmaWxlc3lzdGVtOiBoYXNUd2Vha1Blcm1pc3Npb24obWFuaWZlc3QsIFwiZmlsZXN5c3RlbVwiKSxcbiAgICBuZXR3b3JrOiBoYXNUd2Vha1Blcm1pc3Npb24obWFuaWZlc3QsIFwibmV0d29ya1wiKSxcbiAgICBjb2RleFJ1bnRpbWU6IGhhc1R3ZWFrUGVybWlzc2lvbihtYW5pZmVzdCwgXCJjb2RleC1ydW50aW1lXCIpLFxuICAgIGNvZGV4V2luZG93czogaGFzVHdlYWtQZXJtaXNzaW9uKG1hbmlmZXN0LCBcImNvZGV4LXdpbmRvd3NcIiksXG4gICAgY29kZXhWaWV3czogaGFzVHdlYWtQZXJtaXNzaW9uKG1hbmlmZXN0LCBcImNvZGV4LXZpZXdzXCIpLFxuICAgIGNvZGV4Q2RwOiBoYXNUd2Vha1Blcm1pc3Npb24obWFuaWZlc3QsIFwiY29kZXgtY2RwXCIpLFxuICAgIG5hdGl2ZU1vZHVsZTogaGFzVHdlYWtQZXJtaXNzaW9uKG1hbmlmZXN0LCBcIm5hdGl2ZS1tb2R1bGVcIiksXG4gICAgbmF0aXZlVmlldzogaGFzVHdlYWtQZXJtaXNzaW9uKG1hbmlmZXN0LCBcIm5hdGl2ZS12aWV3XCIpLFxuICAgIG5hdGl2ZUhlbHBlcjogaGFzVHdlYWtQZXJtaXNzaW9uKG1hbmlmZXN0LCBcIm5hdGl2ZS1oZWxwZXJcIiksXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoYXNBbnlDb2RleEFwaShzdXJmYWNlOiBUd2Vha0FwaVN1cmZhY2UpOiBib29sZWFuIHtcbiAgcmV0dXJuIChcbiAgICBzdXJmYWNlLmNvZGV4UnVudGltZSB8fFxuICAgIHN1cmZhY2UuY29kZXhXaW5kb3dzIHx8XG4gICAgc3VyZmFjZS5jb2RleFZpZXdzIHx8XG4gICAgc3VyZmFjZS5jb2RleENkcCB8fFxuICAgIHN1cmZhY2UubmF0aXZlTW9kdWxlIHx8XG4gICAgc3VyZmFjZS5uYXRpdmVWaWV3IHx8XG4gICAgc3VyZmFjZS5uYXRpdmVIZWxwZXJcbiAgKTtcbn1cblxuZnVuY3Rpb24gc2xvdChhbGxvd2VkOiBib29sZWFuLCB3aGVuRGVuaWVkOiBUd2Vha0FwaVNsb3QpOiBUd2Vha0FwaVNsb3Qge1xuICByZXR1cm4gYWxsb3dlZCA/IFwicHJlc2VudFwiIDogd2hlbkRlbmllZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBsYW5Ud2Vha0FwaShtYW5pZmVzdDogUGljazxUd2Vha01hbmlmZXN0LCBcInBlcm1pc3Npb25zXCI+KTogVHdlYWtBcGlQbGFuIHtcbiAgY29uc3Qgc3VyZmFjZSA9IHR3ZWFrQXBpU3VyZmFjZShtYW5pZmVzdCk7XG4gIGNvbnN0IGFueUNvZGV4ID0gaGFzQW55Q29kZXhBcGkoc3VyZmFjZSk7XG4gIHJldHVybiB7XG4gICAgc2V0dGluZ3M6IHNsb3Qoc3VyZmFjZS5zZXR0aW5ncywgXCJvbWl0dGVkXCIpLFxuICAgIGlwYzogc2xvdChzdXJmYWNlLmlwYywgXCJkZW5pZWRcIiksXG4gICAgZnM6IHNsb3Qoc3VyZmFjZS5maWxlc3lzdGVtLCBcImRlbmllZFwiKSxcbiAgICByZWFjdDogXCJwcmVzZW50XCIsXG4gICAgY29kZXg6IHNsb3QoYW55Q29kZXgsIFwib21pdHRlZFwiKSxcbiAgICBjb2RleFJ1bnRpbWU6IHNsb3Qoc3VyZmFjZS5jb2RleFJ1bnRpbWUsIFwiZGVuaWVkXCIpLFxuICAgIGNvZGV4V2luZG93czogc2xvdChzdXJmYWNlLmNvZGV4V2luZG93cywgXCJkZW5pZWRcIiksXG4gICAgY29kZXhWaWV3czogc2xvdChzdXJmYWNlLmNvZGV4Vmlld3MsIFwiZGVuaWVkXCIpLFxuICAgIGNvZGV4Q2RwOiBzbG90KHN1cmZhY2UuY29kZXhDZHAsIFwiZGVuaWVkXCIpLFxuICAgIG5hdGl2ZU1vZHVsZTogc2xvdChzdXJmYWNlLm5hdGl2ZU1vZHVsZSwgXCJkZW5pZWRcIiksXG4gICAgbmF0aXZlVmlldzogc2xvdChzdXJmYWNlLm5hdGl2ZVZpZXcsIFwiZGVuaWVkXCIpLFxuICAgIG5hdGl2ZUhlbHBlcjogc2xvdChzdXJmYWNlLm5hdGl2ZUhlbHBlciwgXCJkZW5pZWRcIiksXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzY29wZWRUd2Vha0lwY0NoYW5uZWwodHdlYWtJZDogc3RyaW5nLCBjaGFubmVsOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYGNvZGV4cHA6JHt0d2Vha0lkfToke2NoYW5uZWx9YDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGF1dGhvcml6ZVR3ZWFrQ2FwYWJpbGl0eShcbiAgc25hcHNob3Q6IFR3ZWFrSWRlbnRpdHlTbmFwc2hvdCB8IHVuZGVmaW5lZCxcbiAgcmVxdWVzdGVkSWQ6IHVua25vd24sXG4gIHBlcm1pc3Npb246IFR3ZWFrUGVybWlzc2lvbiB8IENhbm9uaWNhbFR3ZWFrUGVybWlzc2lvbixcbiAgb3duZXJJZD86IHN0cmluZyxcbik6IFR3ZWFrSWRlbnRpdHlTbmFwc2hvdCB7XG4gIGFzc2VydFZhbGlkVHdlYWtJZChyZXF1ZXN0ZWRJZCk7XG4gIGlmIChvd25lcklkICE9PSB1bmRlZmluZWQpIGJpbmRPd25lZFR3ZWFrSWQob3duZXJJZCwgcmVxdWVzdGVkSWQpO1xuICBpZiAoIXNuYXBzaG90IHx8IHNuYXBzaG90LmlkICE9PSByZXF1ZXN0ZWRJZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgdW5rbm93biB0d2VhazogJHtyZXF1ZXN0ZWRJZH1gKTtcbiAgfVxuICBpZiAoIXNuYXBzaG90LmVuYWJsZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYHR3ZWFrIGlzIGRpc2FibGVkOiAke3JlcXVlc3RlZElkfWApO1xuICB9XG4gIGFzc2VydFR3ZWFrSGFzUGVybWlzc2lvbihzbmFwc2hvdC5tYW5pZmVzdCwgcGVybWlzc2lvbik7XG4gIHJldHVybiBzbmFwc2hvdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZURlbmllZE1ldGhvZChcbiAgdHdlYWtJZDogc3RyaW5nLFxuICBwZXJtaXNzaW9uOiBUd2Vha1Blcm1pc3Npb24gfCBDYW5vbmljYWxUd2Vha1Blcm1pc3Npb24sXG4pOiAoLi4uYXJnczogbmV2ZXJbXSkgPT4gbmV2ZXIge1xuICByZXR1cm4gKCkgPT4ge1xuICAgIHRocm93IHBlcm1pc3Npb25EZW5pZWRFcnJvcih0d2Vha0lkLCBwZXJtaXNzaW9uKTtcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZURlbmllZEFzeW5jTWV0aG9kKFxuICB0d2Vha0lkOiBzdHJpbmcsXG4gIHBlcm1pc3Npb246IFR3ZWFrUGVybWlzc2lvbiB8IENhbm9uaWNhbFR3ZWFrUGVybWlzc2lvbixcbik6ICguLi5hcmdzOiBuZXZlcltdKSA9PiBQcm9taXNlPG5ldmVyPiB7XG4gIHJldHVybiBhc3luYyAoKSA9PiB7XG4gICAgdGhyb3cgcGVybWlzc2lvbkRlbmllZEVycm9yKHR3ZWFrSWQsIHBlcm1pc3Npb24pO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRGVuaWVkVHdlYWtGcyh0d2Vha0lkOiBzdHJpbmcpOiBUd2Vha0ZzIHtcbiAgY29uc3QgZGVueSA9IGNyZWF0ZURlbmllZEFzeW5jTWV0aG9kKHR3ZWFrSWQsIFwiZmlsZXN5c3RlbVwiKTtcbiAgcmV0dXJuIHtcbiAgICBkYXRhRGlyOiBgPGRlbmllZD4vdHdlYWstZGF0YS8ke3R3ZWFrSWR9YCxcbiAgICByZWFkOiBkZW55LFxuICAgIHdyaXRlOiBkZW55LFxuICAgIGV4aXN0czogZGVueSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUJvdW5kVHdlYWtGcyhcbiAgb3duZXJJZDogc3RyaW5nLFxuICBpbnZva2U6IChjaGFubmVsOiBzdHJpbmcsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gUHJvbWlzZTx1bmtub3duPixcbik6IFR3ZWFrRnMge1xuICBjb25zdCBpZCA9IGJpbmRPd25lZFR3ZWFrSWQob3duZXJJZCwgb3duZXJJZCk7XG4gIHJldHVybiB7XG4gICAgZGF0YURpcjogYDxyZW1vdGU+L3R3ZWFrLWRhdGEvJHtpZH1gLFxuICAgIHJlYWQ6IChyZWxQYXRoOiBzdHJpbmcpID0+XG4gICAgICBpbnZva2UoXCJjb2RleHBwOnR3ZWFrLWZzXCIsIFwicmVhZFwiLCBpZCwgcmVsUGF0aCkgYXMgUHJvbWlzZTxzdHJpbmc+LFxuICAgIHdyaXRlOiAocmVsUGF0aDogc3RyaW5nLCBjb250ZW50czogc3RyaW5nKSA9PlxuICAgICAgaW52b2tlKFwiY29kZXhwcDp0d2Vhay1mc1wiLCBcIndyaXRlXCIsIGlkLCByZWxQYXRoLCBjb250ZW50cykgYXMgUHJvbWlzZTx2b2lkPixcbiAgICBleGlzdHM6IChyZWxQYXRoOiBzdHJpbmcpID0+XG4gICAgICBpbnZva2UoXCJjb2RleHBwOnR3ZWFrLWZzXCIsIFwiZXhpc3RzXCIsIGlkLCByZWxQYXRoKSBhcyBQcm9taXNlPGJvb2xlYW4+LFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRGVuaWVkVHdlYWtJcGModHdlYWtJZDogc3RyaW5nKTogVHdlYWtJcGMge1xuICBjb25zdCBkZW55ID0gY3JlYXRlRGVuaWVkTWV0aG9kKHR3ZWFrSWQsIFwiaXBjXCIpO1xuICByZXR1cm4ge1xuICAgIG9uOiBkZW55LFxuICAgIHNlbmQ6IGRlbnksXG4gICAgaW52b2tlOiBkZW55LFxuICAgIGhhbmRsZTogZGVueSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUJvdW5kVHdlYWtJcGMob3duZXJJZDogc3RyaW5nLCBicmlkZ2U6IFR3ZWFrSXBjQnJpZGdlKTogVHdlYWtJcGMge1xuICBjb25zdCBpZCA9IGJpbmRPd25lZFR3ZWFrSWQob3duZXJJZCwgb3duZXJJZCk7XG4gIGNvbnN0IGNoYW5uZWxOYW1lID0gKGNoYW5uZWw6IHN0cmluZykgPT4gc2NvcGVkVHdlYWtJcGNDaGFubmVsKGlkLCBjaGFubmVsKTtcbiAgcmV0dXJuIHtcbiAgICBvbjogKGNoYW5uZWwsIGhhbmRsZXIpID0+IHtcbiAgICAgIGNvbnN0IHdyYXBwZWQgPSAoX2V2ZW50OiB1bmtub3duLCAuLi5hcmdzOiB1bmtub3duW10pID0+IGhhbmRsZXIoLi4uYXJncyk7XG4gICAgICBicmlkZ2Uub24oY2hhbm5lbE5hbWUoY2hhbm5lbCksIHdyYXBwZWQpO1xuICAgICAgcmV0dXJuICgpID0+IGJyaWRnZS5yZW1vdmVMaXN0ZW5lcihjaGFubmVsTmFtZShjaGFubmVsKSwgd3JhcHBlZCk7XG4gICAgfSxcbiAgICBzZW5kOiAoY2hhbm5lbCwgLi4uYXJncykgPT4gYnJpZGdlLnNlbmQoY2hhbm5lbE5hbWUoY2hhbm5lbCksIC4uLmFyZ3MpLFxuICAgIGludm9rZTogKGNoYW5uZWwsIC4uLmFyZ3MpID0+XG4gICAgICBicmlkZ2UuaW52b2tlKGNoYW5uZWxOYW1lKGNoYW5uZWwpLCAuLi5hcmdzKSBhcyBQcm9taXNlPG5ldmVyPixcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzTGF5ZXJBZG1pbklwY0NoYW5uZWwoY2hhbm5lbDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiAoTEFZRVJfQURNSU5fSVBDX0NIQU5ORUxTIGFzIHJlYWRvbmx5IHN0cmluZ1tdKS5pbmNsdWRlcyhjaGFubmVsKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHR3ZWFrUGVybWlzc2lvbkZvcklwY0NoYW5uZWwoXG4gIGNoYW5uZWw6IHN0cmluZyxcbik6IENhbm9uaWNhbFR3ZWFrUGVybWlzc2lvbiB8IHVuZGVmaW5lZCB7XG4gIHJldHVybiAoVFdFQUtfQ0FQQUJJTElUWV9JUENfQ0hBTk5FTFMgYXMgUmVjb3JkPHN0cmluZywgQ2Fub25pY2FsVHdlYWtQZXJtaXNzaW9uIHwgdW5kZWZpbmVkPilbXG4gICAgY2hhbm5lbFxuICBdO1xufVxuIiwgIi8qKlxuICogUGVyLXR3ZWFrIGZpbGVzeXN0ZW0gc2FuZGJveC4gVHdlYWtzIG1heSBvbmx5IHJlYWQvd3JpdGUgdW5kZXJcbiAqIGA8dXNlclJvb3Q+L3R3ZWFrLWRhdGEvPHR3ZWFrSWQ+L2AuIElkZW50aXR5IGlzIGJvdW5kIGJ5IHRoZSBjYWxsZXI7XG4gKiB0aGlzIGhlbHBlciBuZXZlciB0cnVzdHMgYSBwYXRoIHRoYXQgZXNjYXBlcyB0aGF0IGRpcmVjdG9yeS5cbiAqL1xuaW1wb3J0IHsgbWtkaXJTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGpvaW4sIHJlc29sdmUgfSBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgeyBpc1BhdGhJbnNpZGUgfSBmcm9tIFwiLi9uYXRpdmUtcGF0aHNcIjtcbmltcG9ydCB7IGFzc2VydFZhbGlkVHdlYWtJZCB9IGZyb20gXCIuL3R3ZWFrLXBlcm1pc3Npb25zXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiB0d2Vha0RhdGFEaXIodXNlclJvb3Q6IHN0cmluZywgdHdlYWtJZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgYXNzZXJ0VmFsaWRUd2Vha0lkKHR3ZWFrSWQpO1xuICByZXR1cm4gam9pbih1c2VyUm9vdCwgXCJ0d2Vhay1kYXRhXCIsIHR3ZWFrSWQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZW5zdXJlVHdlYWtEYXRhRGlyKHVzZXJSb290OiBzdHJpbmcsIHR3ZWFrSWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGRpciA9IHR3ZWFrRGF0YURpcih1c2VyUm9vdCwgdHdlYWtJZCk7XG4gIG1rZGlyU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICByZXR1cm4gZGlyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZVR3ZWFrRGF0YVBhdGgoXG4gIHVzZXJSb290OiBzdHJpbmcsXG4gIHR3ZWFrSWQ6IHN0cmluZyxcbiAgcmVsUGF0aDogc3RyaW5nLFxuKTogeyBkaXI6IHN0cmluZzsgZnVsbDogc3RyaW5nIH0ge1xuICBjb25zdCBkaXIgPSB0d2Vha0RhdGFEaXIodXNlclJvb3QsIHR3ZWFrSWQpO1xuICBjb25zdCBmdWxsID0gcmVzb2x2ZShkaXIsIHJlbFBhdGgpO1xuICBpZiAoIWlzUGF0aEluc2lkZShkaXIsIGZ1bGwpIHx8IGZ1bGwgPT09IGRpcikgdGhyb3cgbmV3IEVycm9yKFwicGF0aCB0cmF2ZXJzYWxcIik7XG4gIHJldHVybiB7IGRpciwgZnVsbCB9O1xufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQVVBLElBQUFBLG1CQUF3RDtBQUN4RCxJQUFBQyxtQkFBMkI7QUFDM0IsSUFBQUMscUJBQThCOzs7QUNYOUIsSUFBQUMsYUFBK0I7QUFDL0IsSUFBQUMsbUJBQThCO0FBQzlCLG9CQUE2QjtBQUM3QixJQUFBQyxXQUF5Qjs7O0FDSnpCLHNCQUErQztBQUMvQyx5QkFBeUI7QUFDekIsdUJBQXVGO0FBQ2hGLElBQU0sYUFBYTtBQUFBLEVBQ3RCLFdBQVc7QUFBQSxFQUNYLFVBQVU7QUFBQSxFQUNWLGVB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QVM7QUFBQSxFQUNyRjtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBWTtBQUFBLEVBQU07QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU07QUFBQSxFQUMxRTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBTTtBQUFBLEVBQU87QUFBQSxFQUFNO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFDeEQ7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFTO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUN2RjtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQVk7QUFBQSxFQUFPO0FBQUEsRUFDckY7QUFBQSxFQUFTO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUN2QjtBQUFBLEVBQWE7QUFBQSxFQUFhO0FBQUEsRUFBYTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUNwRTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFBVztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUMxRTtBQUFBLEVBQU07QUFBQSxFQUFNO0FBQUEsRUFBTztBQUFBLEVBQVc7QUFBQSxFQUFNO0FBQUEsRUFDcEM7QUFBQSxFQUFRO0FBQUEsRUFBUTtBQUFBLEVBQVE7QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQzVEO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQ25EO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTTtBQUFBLEVBQU87QUFBQSxFQUFRO0FBQUEsRUFDMUM7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUNyRjtBQUFBLEVBQVE7QUFBQSxFQUFPO0FBQUEsRUFBUztBQUFBLEVBQ3hCO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUN0QztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBVztBQUFBLEVBQ3pCO0FBQUEsRUFBSztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUN0RDtBQUFBLEVBQVM7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDL0U7QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQ2Y7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQVE7QUFBQSxFQUFRO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQ2pGO0FBQUEsRUFDQTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQWE7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFBUTtBQUFBLEVBQU87QUFBQSxFQUFPO0FBQUEsRUFDcEY7QUFBQSxFQUFPO0FBQUEsRUFBTztBQUFBLEVB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O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFB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RTlELFNBQVMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxHQUFHLFVBQVUsR0FBRyxLQUFLLG1CQUFtQixLQUFLLENBQUM7QUFBQSxFQUMzRSxDQUFDO0FBQ0QsVUFBUSxHQUFHLE9BQU8sQ0FBQyxPQUFPLFNBQVMsZUFBZSxHQUFHLEtBQUssSUFBSSxJQUFJLEVBQUUsQ0FBQztBQUNyRSxVQUFRLEdBQUcsU0FBUyxDQUFDLE1BQU0sSUFBSSxRQUFRLGtCQUFrQixDQUFDLENBQUM7QUFDM0QsTUFBSSxRQUFRLFlBQVksVUFBVTtBQUNsQyx1QkFBSSxHQUFHLGFBQWEsTUFBTSxRQUFRLE1BQU0sRUFBRSxNQUFNLE1BQU07QUFBQSxFQUFDLENBQUMsQ0FBQztBQUMzRCxTQUFTLEdBQUc7QUFDVixNQUFJLFNBQVMsNEJBQTRCLENBQUM7QUFDNUM7IiwKICAibmFtZXMiOiBbImltcG9ydF9lbGVjdHJvbiIsICJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9wYXRoIiwgImltcG9ydF9mcyIsICJpbXBvcnRfcHJvbWlzZXMiLCAic3lzUGF0aCIsICJwcmVzb2x2ZSIsICJiYXNlbmFtZSIsICJwam9pbiIsICJwcmVsYXRpdmUiLCAicHNlcCIsICJpbXBvcnRfcHJvbWlzZXMiLCAib3NUeXBlIiwgImZzX3dhdGNoIiwgInJhd0VtaXR0ZXIiLCAibGlzdGVuZXIiLCAiYmFzZW5hbWUiLCAiZGlybmFtZSIsICJuZXdTdGF0cyIsICJjbG9zZXIiLCAiZnNyZWFscGF0aCIsICJyZXNvbHZlIiwgInJlYWxwYXRoIiwgInN0YXRzIiwgInJlbGF0aXZlIiwgIkRPVUJMRV9TTEFTSF9SRSIsICJ0ZXN0U3RyaW5nIiwgInBhdGgiLCAic3RhdHMiLCAic3RhdGNiIiwgIm5vdyIsICJzdGF0IiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX3BhdGgiLCAic2Vzc2lvbiIsICJzaGVsbCIsICJCcm93c2VyV2luZG93IiwgIkJyb3dzZXJWaWV3IiwgInBsYXRmb3JtIiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX3BhdGgiLCAidXNlclJvb3QiLCAiaW1wb3J0X25vZGVfZnMiLCAiaW1wb3J0X25vZGVfcGF0aCIsICJsb2ciLCAiYXNSZWNvcmQiLCAicmVzb2x2ZSIsICJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9wYXRoIiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX29zIiwgImltcG9ydF9ub2RlX3BhdGgiLCAiaW1wb3J0X25vZGVfZnMiLCAiaW1wb3J0X25vZGVfZnMiLCAiaW1wb3J0X25vZGVfY2hpbGRfcHJvY2VzcyIsICJpbXBvcnRfbm9kZV9jcnlwdG8iLCAiaW1wb3J0X25vZGVfcGF0aCIsICJpbXBvcnRfbm9kZV9vcyIsICJpbXBvcnRfbm9kZV9jcnlwdG8iLCAicGxhdGZvcm0iLCAic3RhdCIsICJpbXBvcnRfbm9kZV9jcnlwdG8iLCAiaW1wb3J0X25vZGVfZnMiLCAiaW1wb3J0X25vZGVfY2hpbGRfcHJvY2VzcyIsICJpbXBvcnRfbm9kZV9wYXRoIiwgImltcG9ydF9ub2RlX29zIiwgImV4cG9ydHMiLCAiaW5mZXJNYWNBcHBSb290IiwgIlZFUlNJT05fUkUiLCAibm9ybWFsaXplVmVyc2lvbiIsICJjb21wYXJlVmVyc2lvbnMiLCAiaW1wb3J0X2VsZWN0cm9uIiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX2NyeXB0byIsICJpbXBvcnRfZWxlY3Ryb24iLCAibWFrZVdpbmRvd0xpa2VGb3JWaWV3IiwgImFzUmVjb3JkIiwgImFzUmVjb3JkIiwgIm1ha2VXaW5kb3dMaWtlRm9yVmlldyIsICJpbXBvcnRfZWxlY3Ryb24iLCAiaW1wb3J0X25vZGVfZnMiLCAiaW1wb3J0X25vZGVfcGF0aCIsICJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9wYXRoIiwgImltcG9ydF9ub2RlX2ZzIiwgImltcG9ydF9ub2RlX3BhdGgiLCAiaW1wb3J0X25vZGVfZnMiLCAiaW1wb3J0X25vZGVfcGF0aCIsICJpbXBvcnRfZWxlY3Ryb24iLCAiaW1wb3J0X25vZGVfY2hpbGRfcHJvY2VzcyIsICJpbXBvcnRfbm9kZV9jcnlwdG8iLCAiaW1wb3J0X25vZGVfZnMiLCAibG9nIiwgImFzc2VydEJyaWRnZUlkIiwgImV4cG9ydHMiLCAiYXNSZWNvcmQiLCAid2luZG93SWRGb3IiLCAicmVzb2x2ZSIsICJpc1dpbmRvd0Rlc3Ryb3llZCIsICJ3ZWJDb250ZW50cyIsICJpbXBvcnRfbm9kZV9mcyIsICJpbXBvcnRfbm9kZV9wYXRoIiwgInVzZXJSb290IiwgIlVQREFURV9DSEVDS19JTlRFUlZBTF9NUyIsICJwbGF0Zm9ybSIsICJzdGF0Il0KfQo=
