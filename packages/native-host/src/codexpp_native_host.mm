#import <AppKit/AppKit.h>
#import <Foundation/Foundation.h>
#import <Metal/Metal.h>
#import <MetalKit/MetalKit.h>
#include <node_api.h>
#include <atomic>
#include <cstring>

struct CodexPPBounds {
  double x;
  double y;
  double width;
  double height;
};

@interface CodexPPMetalRenderer : NSObject <MTKViewDelegate>
@property(nonatomic, strong) id<MTLCommandQueue> queue;
- (instancetype)initWithDevice:(id<MTLDevice>)device;
@end

@implementation CodexPPMetalRenderer
- (instancetype)initWithDevice:(id<MTLDevice>)device {
  self = [super init];
  if (self) {
    _queue = [device newCommandQueue];
  }
  return self;
}

- (void)mtkView:(MTKView *)view drawableSizeWillChange:(CGSize)size {
  (void)view;
  (void)size;
}

- (void)drawInMTKView:(MTKView *)view {
  if (!_queue) return;
  MTLRenderPassDescriptor *pass = view.currentRenderPassDescriptor;
  id<CAMetalDrawable> drawable = view.currentDrawable;
  if (!pass || !drawable) return;
  pass.colorAttachments[0].clearColor = MTLClearColorMake(0.08, 0.10, 0.12, 0.82);
  id<MTLCommandBuffer> buffer = [_queue commandBuffer];
  id<MTLRenderCommandEncoder> encoder = [buffer renderCommandEncoderWithDescriptor:pass];
  [encoder endEncoding];
  [buffer presentDrawable:drawable];
  [buffer commit];
}
@end

@interface CodexPPNativeInstance : NSObject
@property(nonatomic, copy) NSString *identifier;
@property(nonatomic, strong) NSWindow *window;
@property(nonatomic, strong) MTKView *metalView;
@property(nonatomic, strong) CodexPPMetalRenderer *renderer;
@property(nonatomic, assign) BOOL disposed;
- (instancetype)initWithIdentifier:(NSString *)identifier
                      parentWindow:(NSWindow *)parentWindow
                            bounds:(CodexPPBounds)bounds
                       transparent:(BOOL)transparent
                  passthroughMouse:(BOOL)passthroughMouse
                             metal:(BOOL)metal;
- (void)setBounds:(CodexPPBounds)bounds;
- (void)show;
- (void)hide;
- (void)setVisible:(BOOL)visible;
- (void)dispose;
@end

@implementation CodexPPNativeInstance
- (instancetype)initWithIdentifier:(NSString *)identifier
                      parentWindow:(NSWindow *)parentWindow
                            bounds:(CodexPPBounds)bounds
                       transparent:(BOOL)transparent
                  passthroughMouse:(BOOL)passthroughMouse
                             metal:(BOOL)metal {
  self = [super init];
  if (!self) return nil;

  _identifier = [identifier copy];
  NSRect frame = NSMakeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  NSUInteger style = NSWindowStyleMaskBorderless | NSWindowStyleMaskNonactivatingPanel;
  NSPanel *panel = [[NSPanel alloc] initWithContentRect:frame
                                              styleMask:style
                                                backing:NSBackingStoreBuffered
                                                  defer:NO];
  panel.floatingPanel = YES;
  panel.hidesOnDeactivate = NO;
  panel.releasedWhenClosed = NO;
  panel.ignoresMouseEvents = passthroughMouse;
  panel.opaque = !transparent;
  panel.backgroundColor = transparent ? NSColor.clearColor : NSColor.windowBackgroundColor;
  panel.hasShadow = NO;

  if (metal) {
    id<MTLDevice> device = MTLCreateSystemDefaultDevice();
    if (device) {
      MTKView *view = [[MTKView alloc] initWithFrame:NSMakeRect(0, 0, bounds.width, bounds.height)
                                              device:device];
      view.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
      view.enableSetNeedsDisplay = NO;
      view.paused = NO;
      view.clearColor = MTLClearColorMake(0.08, 0.10, 0.12, 0.82);
      view.colorPixelFormat = MTLPixelFormatBGRA8Unorm;
      CodexPPMetalRenderer *renderer = [[CodexPPMetalRenderer alloc] initWithDevice:device];
      view.delegate = renderer;
      panel.contentView = view;
      _metalView = view;
      _renderer = renderer;
    }
  }

  if (!panel.contentView) {
    NSView *view = [[NSView alloc] initWithFrame:NSMakeRect(0, 0, bounds.width, bounds.height)];
    view.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    panel.contentView = view;
  }

  _window = panel;
  if (parentWindow) {
    [parentWindow addChildWindow:panel ordered:NSWindowAbove];
  }
  [panel orderFront:nil];
  return self;
}

- (void)setBounds:(CodexPPBounds)bounds {
  if (_disposed || !_window) return;
  [_window setFrame:NSMakeRect(bounds.x, bounds.y, bounds.width, bounds.height) display:YES];
}

- (void)show {
  if (_disposed || !_window) return;
  [_window orderFront:nil];
}

- (void)hide {
  if (_disposed || !_window) return;
  [_window orderOut:nil];
}

- (void)setVisible:(BOOL)visible {
  visible ? [self show] : [self hide];
}

- (void)dispose {
  if (_disposed) return;
  _disposed = YES;
  if (_window.parentWindow) {
    [_window.parentWindow removeChildWindow:_window];
  }
  [_window orderOut:nil];
  [_window close];
  _window = nil;
  _metalView.delegate = nil;
  _metalView = nil;
  _renderer = nil;
}
@end

static NSMutableDictionary<NSString *, CodexPPNativeInstance *> *CodexPPInstances() {
  static NSMutableDictionary<NSString *, CodexPPNativeInstance *> *instances;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    instances = [NSMutableDictionary dictionary];
  });
  return instances;
}

static std::atomic<uint64_t> gNextInstanceId{1};

static void RunOnMainSync(dispatch_block_t block) {
  if ([NSThread isMainThread]) {
    block();
  } else {
    dispatch_sync(dispatch_get_main_queue(), block);
  }
}

static napi_value Undefined(napi_env env) {
  napi_value value;
  napi_get_undefined(env, &value);
  return value;
}

static napi_value Null(napi_env env) {
  napi_value value;
  napi_get_null(env, &value);
  return value;
}

static void Throw(napi_env env, const char *message) {
  napi_throw_error(env, nullptr, message);
}

static bool GetProperty(napi_env env, napi_value object, const char *name, napi_value *out) {
  bool has = false;
  napi_status status = napi_has_named_property(env, object, name, &has);
  if (status != napi_ok || !has) return false;
  return napi_get_named_property(env, object, name, out) == napi_ok;
}

static double GetNumberProperty(napi_env env, napi_value object, const char *name, double fallback) {
  napi_value value;
  if (!GetProperty(env, object, name, &value)) return fallback;
  double out = fallback;
  napi_get_value_double(env, value, &out);
  return out;
}

static bool GetBoolProperty(napi_env env, napi_value object, const char *name, bool fallback) {
  napi_value value;
  if (!GetProperty(env, object, name, &value)) return fallback;
  bool out = fallback;
  napi_get_value_bool(env, value, &out);
  return out;
}

static CodexPPBounds GetBounds(napi_env env, napi_value object, CodexPPBounds fallback) {
  napi_value bounds;
  if (!GetProperty(env, object, "bounds", &bounds)) bounds = object;
  return {
    GetNumberProperty(env, bounds, "x", fallback.x),
    GetNumberProperty(env, bounds, "y", fallback.y),
    GetNumberProperty(env, bounds, "width", fallback.width),
    GetNumberProperty(env, bounds, "height", fallback.height),
  };
}

static NSWindow *FallbackParentWindow() {
  NSWindow *window = NSApp.keyWindow ?: NSApp.mainWindow;
  if (window) return window;
  for (NSWindow *candidate in NSApp.orderedWindows) {
    if (candidate.isVisible) return candidate;
  }
  return nil;
}

static NSWindow *ParentWindowFromOptions(napi_env env, napi_value options) {
  napi_value handle;
  if (!GetProperty(env, options, "parentNativeHandle", &handle)) return FallbackParentWindow();
  bool isBuffer = false;
  if (napi_is_buffer(env, handle, &isBuffer) != napi_ok || !isBuffer) return FallbackParentWindow();

  void *data = nullptr;
  size_t length = 0;
  if (napi_get_buffer_info(env, handle, &data, &length) != napi_ok || length < sizeof(void *)) {
    return FallbackParentWindow();
  }

  uintptr_t raw = 0;
  std::memcpy(&raw, data, sizeof(void *));
  if (raw == 0) return FallbackParentWindow();

  @try {
    id object = (__bridge id)(reinterpret_cast<void *>(raw));
    if ([object isKindOfClass:NSWindow.class]) return (NSWindow *)object;
    if ([object isKindOfClass:NSView.class]) return [(NSView *)object window];
    if ([object respondsToSelector:@selector(window)]) {
      id window = [object performSelector:@selector(window)];
      if ([window isKindOfClass:NSWindow.class]) return (NSWindow *)window;
    }
  } @catch (NSException *) {
    return FallbackParentWindow();
  }
  return FallbackParentWindow();
}

static CodexPPNativeInstance *GetWrappedInstance(napi_env env, napi_value thisArg) {
  void *data = nullptr;
  if (napi_unwrap(env, thisArg, &data) != napi_ok || !data) return nil;
  return (__bridge CodexPPNativeInstance *)data;
}

static void FinalizeInstance(napi_env env, void *data, void *hint) {
  (void)env;
  (void)hint;
  if (!data) return;
  CodexPPNativeInstance *instance = CFBridgingRelease(data);
  [instance dispose];
}

static napi_value InstanceSetBounds(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_value thisArg;
  napi_get_cb_info(env, info, &argc, args, &thisArg, nullptr);
  CodexPPNativeInstance *instance = GetWrappedInstance(env, thisArg);
  if (!instance || argc < 1) return Undefined(env);
  CodexPPBounds bounds = GetBounds(env, args[0], {0, 0, 480, 320});
  RunOnMainSync(^{
    [instance setBounds:bounds];
  });
  return Undefined(env);
}

static napi_value InstanceShow(napi_env env, napi_callback_info info) {
  napi_value thisArg;
  size_t argc = 0;
  napi_get_cb_info(env, info, &argc, nullptr, &thisArg, nullptr);
  CodexPPNativeInstance *instance = GetWrappedInstance(env, thisArg);
  if (instance) RunOnMainSync(^{ [instance show]; });
  return Undefined(env);
}

static napi_value InstanceHide(napi_env env, napi_callback_info info) {
  napi_value thisArg;
  size_t argc = 0;
  napi_get_cb_info(env, info, &argc, nullptr, &thisArg, nullptr);
  CodexPPNativeInstance *instance = GetWrappedInstance(env, thisArg);
  if (instance) RunOnMainSync(^{ [instance hide]; });
  return Undefined(env);
}

static napi_value InstanceSetVisible(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_value thisArg;
  napi_get_cb_info(env, info, &argc, args, &thisArg, nullptr);
  CodexPPNativeInstance *instance = GetWrappedInstance(env, thisArg);
  bool visible = true;
  if (argc >= 1) napi_get_value_bool(env, args[0], &visible);
  if (instance) RunOnMainSync(^{ [instance setVisible:visible]; });
  return Undefined(env);
}

static napi_value InstanceDispose(napi_env env, napi_callback_info info) {
  napi_value thisArg;
  size_t argc = 0;
  napi_get_cb_info(env, info, &argc, nullptr, &thisArg, nullptr);
  CodexPPNativeInstance *instance = GetWrappedInstance(env, thisArg);
  if (instance) {
    RunOnMainSync(^{
      [instance dispose];
      [CodexPPInstances() removeObjectForKey:instance.identifier];
    });
  }
  return Undefined(env);
}

static napi_value InstanceParentChanged(napi_env env, napi_callback_info info) {
  size_t argc = 0;
  napi_value thisArg;
  napi_get_cb_info(env, info, &argc, nullptr, &thisArg, nullptr);
  return Undefined(env);
}

static napi_value MakeString(napi_env env, NSString *string) {
  napi_value value;
  napi_create_string_utf8(env, string.UTF8String, NAPI_AUTO_LENGTH, &value);
  return value;
}

static void SetBool(napi_env env, napi_value object, const char *name, bool value) {
  napi_value jsValue;
  napi_get_boolean(env, value, &jsValue);
  napi_set_named_property(env, object, name, jsValue);
}

static napi_value WrapInstance(napi_env env, CodexPPNativeInstance *instance) {
  napi_value object;
  napi_create_object(env, &object);
  napi_set_named_property(env, object, "id", MakeString(env, instance.identifier));
  napi_set_named_property(env, object, "windowId", Null(env));

  napi_property_descriptor properties[] = {
    {"setBounds", nullptr, InstanceSetBounds, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"show", nullptr, InstanceShow, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"hide", nullptr, InstanceHide, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"setVisible", nullptr, InstanceSetVisible, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"dispose", nullptr, InstanceDispose, nullptr, nullptr, nullptr, napi_default, nullptr},
  };
  napi_define_properties(env, object, sizeof(properties) / sizeof(properties[0]), properties);
  napi_wrap(env, object, (__bridge_retained void *)instance, FinalizeInstance, nullptr, nullptr);
  return object;
}

static napi_value CreateNativeWindow(napi_env env, napi_callback_info info, BOOL metal) {
  size_t argc = 1;
  napi_value args[1];
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  if (argc < 1) {
    Throw(env, "native host requires options");
    return Undefined(env);
  }
  napi_value options = args[0];

  __block CodexPPNativeInstance *instance = nil;
  __block NSString *error = nil;
  RunOnMainSync(^{
    NSWindow *parent = ParentWindowFromOptions(env, options);
    if (!parent) {
      error = @"native host could not resolve parent window handle";
      return;
    }

    uint64_t sequence = gNextInstanceId.fetch_add(1);
    NSString *identifier = [NSString stringWithFormat:@"codexpp-native-%llu", sequence];
    CodexPPBounds bounds = GetBounds(env, options, {0, 0, 480, 320});
    BOOL transparent = GetBoolProperty(env, options, "transparent", metal ? YES : NO);
    BOOL passthrough = GetBoolProperty(env, options, "passthroughMouse", NO);
    instance = [[CodexPPNativeInstance alloc] initWithIdentifier:identifier
                                                    parentWindow:parent
                                                          bounds:bounds
                                                     transparent:transparent
                                                passthroughMouse:passthrough
                                                           metal:metal];
    if (instance) {
      CodexPPInstances()[identifier] = instance;
    }
  });

  if (error) {
    Throw(env, error.UTF8String);
    return Undefined(env);
  }
  if (!instance) {
    Throw(env, "native host failed to create instance");
    return Undefined(env);
  }
  return WrapInstance(env, instance);
}

static napi_value GetCapabilities(napi_env env, napi_callback_info info) {
  (void)info;
  __block bool hasMetal = false;
  RunOnMainSync(^{
    hasMetal = MTLCreateSystemDefaultDevice() != nil;
  });

  napi_value object;
  napi_create_object(env, &object);
  SetBool(env, object, "available", true);
  SetBool(env, object, "appKitEmbedding", true);
  SetBool(env, object, "childWindowOverlay", true);
  SetBool(env, object, "directViewAttach", false);
  SetBool(env, object, "metalViews", hasMetal);
  return object;
}

static napi_value CreatePanel(napi_env env, napi_callback_info info) {
  return CreateNativeWindow(env, info, NO);
}

static napi_value AttachView(napi_env env, napi_callback_info info) {
  return CreateNativeWindow(env, info, YES);
}

static napi_value DisposeAll(napi_env env, napi_callback_info info) {
  (void)info;
  RunOnMainSync(^{
    NSArray<CodexPPNativeInstance *> *instances = CodexPPInstances().allValues;
    for (CodexPPNativeInstance *instance in instances) {
      [instance dispose];
    }
    [CodexPPInstances() removeAllObjects];
  });
  return Undefined(env);
}

NAPI_MODULE_INIT() {
  napi_property_descriptor properties[] = {
    {"getCapabilities", nullptr, GetCapabilities, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"createPanel", nullptr, CreatePanel, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"attachView", nullptr, AttachView, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"disposeAll", nullptr, DisposeAll, nullptr, nullptr, nullptr, napi_default, nullptr},
  };
  napi_define_properties(env, exports, sizeof(properties) / sizeof(properties[0]), properties);
  return exports;
}
