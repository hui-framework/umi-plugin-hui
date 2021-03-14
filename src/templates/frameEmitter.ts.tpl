export let frameEmitter = window.__EMITTER_BY_HUI_MICRO_APP__;

let __warn__ = false;
const warn = function () {
  if (
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    console !== 'undefined' &&
    console.warn &&
    !__warn__
  ) {
    console.warn(
      '[umi-plugin-hui]',
      '没有找到框架应用事件总线,如果业务应用为独立运行请忽略这条警告！',
    );
    __warn__ = true;
  }
};

if (!frameEmitter) {
  frameEmitter = {
    on: warn,
    emit: warn,
    trigger: warn,
    off: warn,
  };
}

export const onFrame = (type: String, handler: any) =>
  frameEmitter.on.call(null, type, handler);

export const triggerFrame = (type: String, data: any, ...args: any) =>
  frameEmitter.trigger.apply(null, [type, data, ...args]);
