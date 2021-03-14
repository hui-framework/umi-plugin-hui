"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;

function _objectSpread2() {
  const data = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread2"));

  _objectSpread2 = function _objectSpread2() {
    return data;
  };

  return data;
}

function _react() {
  const data = _interopRequireDefault(require("react"));

  _react = function _react() {
    return data;
  };

  return data;
}

function _address() {
  const data = _interopRequireDefault(require("address"));

  _address = function _address() {
    return data;
  };

  return data;
}

function _assert() {
  const data = _interopRequireDefault(require("assert"));

  _assert = function _assert() {
    return data;
  };

  return data;
}

function _lodash() {
  const data = require("lodash");

  _lodash = function _lodash() {
    return data;
  };

  return data;
}

function _path() {
  const data = require("path");

  _path = function _path() {
    return data;
  };

  return data;
}

function _fs() {
  const data = require("fs");

  _fs = function _fs() {
    return data;
  };

  return data;
}

var _addSpecifyPrefixedRoute = require("./addSpecifyPrefixedRoute");

function _default(api) {
  api.addRuntimePluginKey(() => "hui");
  api.describe({
    key: "hui",
    config: {
      schema(joi) {
        return joi.object();
      }

    }
  }); // ???
  // api.addRuntimePlugin(() => "@@/plugin-hui/runtimePlugin");
  // eslint-disable-next-line import/no-dynamic-require, global-require

  api.modifyDefaultConfig(memo => {
    var _api$userConfig$hui$s, _api$userConfig$hui;

    const initialOptions = (0, _objectSpread2().default)({
      devSourceMap: true
    }, memo.hui);
    const modifiedDefaultConfig = (0, _objectSpread2().default)((0, _objectSpread2().default)({}, memo), {}, {
      disableGlobalVariables: true,
      // 默认开启 runtimePublicPath，避免出现 dynamic import 场景子应用资源地址出问题
      runtimePublicPath: true,
      runtimeHistory: {},
      hui: (0, _objectSpread2().default)((0, _objectSpread2().default)({}, memo.hui), initialOptions)
    });
    const shouldNotModifyDefaultBase = (_api$userConfig$hui$s = (_api$userConfig$hui = api.userConfig.hui) === null || _api$userConfig$hui === void 0 ? void 0 : _api$userConfig$hui.shouldNotModifyDefaultBase) !== null && _api$userConfig$hui$s !== void 0 ? _api$userConfig$hui$s : initialOptions.shouldNotModifyDefaultBase;

    if (!shouldNotModifyDefaultBase) {
      modifiedDefaultConfig.base = `/${api.pkg.name}`;
    }

    return modifiedDefaultConfig;
  });
  api.modifyPublicPathStr(publicPathStr => {
    const runtimePublicPath = api.config.runtimePublicPath;

    const _ref = api.config.hui || {},
          shouldNotModifyRuntimePublicPath = _ref.shouldNotModifyRuntimePublicPath;

    if (runtimePublicPath === true && !shouldNotModifyRuntimePublicPath) {
      return `window.__INJECTED_PUBLIC_PATH_BY_HUI_MICRO_APP__ || "${api.config.publicPath || "/"}"`;
    }

    return publicPathStr;
  });
  api.chainWebpack((config, {
    webpack
  }) => {
    var _webpack$version;

    (0, _assert().default)(api.pkg.name, "You should have name in package.json");
    config.output.libraryTarget("global").library(`HUI_MICRO_APP_${api.pkg.name}`);
    const usingWebpack5 = (_webpack$version = webpack.version) === null || _webpack$version === void 0 ? void 0 : _webpack$version.startsWith("5"); // webpack5 移除了 jsonpFunction 配置，且不再需要配置 jsonpFunction，see https://webpack.js.org/blog/2020-10-10-webpack-5-release/#automatic-unique-naming

    if (!usingWebpack5) {
      config.output.jsonpFunction(`webpackJsonp_${api.pkg.name}`);
    }

    return config;
  }); // umi bundle 添加 entry 标记

  api.modifyHTML($ => {
    $("script").each((_, el) => {
      var _scriptEl$attr;

      const scriptEl = $(el);
      const umiEntryJs = /\/?umi(\.\w+)?\.js$/g;

      if (umiEntryJs.test((_scriptEl$attr = scriptEl.attr("src")) !== null && _scriptEl$attr !== void 0 ? _scriptEl$attr : "")) {
        scriptEl.attr("entry", "");
      }
    });
    return $;
  });
  const port = process.env.PORT; // source-map 跨域设置

  if (process.env.NODE_ENV === "development" && port) {
    const localHostname = process.env.USE_REMOTE_IP ? _address().default.ip() : process.env.HOST || "localhost";
    const protocol = process.env.HTTPS ? "https" : "http"; // 变更 webpack-dev-server websocket 默认监听地址

    process.env.SOCKET_SERVER = `${protocol}://${localHostname}:${port}/`;
    api.chainWebpack((memo, {
      webpack
    }) => {
      // 开启了 devSourceMap 配置，默认为 true
      if (api.config.hui && api.config.devSourceMap) {
        // 禁用 devtool，启用 SourceMapDevToolPlugin
        memo.devtool(false);
        memo.plugin("source-map").use(webpack.SourceMapDevToolPlugin, [{
          // @ts-ignore
          namespace: api.pkg.name,
          append: `\n//# sourceMappingURL=${protocol}://${localHostname}:${port}/[url]`,
          filename: "[file].map"
        }]);
      }

      return memo;
    });
  }

  api.addEntryImports(() => {
    return {
      source: "@@/plugin-hui/lifecycles",
      specifier: "{ genMount as hui_genMount, genBootstrap as hui_genBootstrap, genUnmount as hui_genUnmount, genUpdate as hui_genUpdate }"
    };
  });
  api.addEntryCode(() => `
    export const bootstrap = hui_genBootstrap(clientRender);
    export const mount = hui_genMount('${api.config.mountElementId}');
    export const unmount = hui_genUnmount('${api.config.mountElementId}');
    export const update = hui_genUpdate();

    if (!window.__POWERED_BY_HUI_MICRO_APP__) {
      bootstrap().then(mount);
    }
    `);
  api.onGenerateFiles(() => {
    api.writeTmpFile({
      path: "plugin-hui/options.js",
      content: `
      let options = ${JSON.stringify(api.config.hui || {})};
      export const getOptions = () => options;
      export const setOptions = (newOpts) => options = ({ ...options, ...newOpts });
      `
    });
    api.writeTmpFile({
      path: "plugin-hui/model.ts",
      content: (0, _fs().readFileSync)((0, _path().join)(__dirname, "templates", "model.ts.tpl"), "utf-8")
    });
    api.writeTmpFile({
      path: "plugin-hui/runtimePlugin.ts",
      content: (0, _fs().readFileSync)((0, _path().join)(__dirname, "templates", "runtimePlugin.ts.tpl"), "utf-8")
    });
    api.writeTmpFile({
      path: "plugin-hui/lifecycles.ts",
      content: (0, _fs().readFileSync)((0, _path().join)(__dirname, "templates", "lifecycles.ts.tpl"), "utf-8")
    });
    api.writeTmpFile({
      path: "plugin-hui/frameEmitter.ts",
      content: (0, _fs().readFileSync)((0, _path().join)(__dirname, "templates", "frameEmitter.ts.tpl"), "utf-8")
    });
  });
  api.addUmiExports(() => [{
    specifiers: ["frameEmitter", "onFrame", "triggerFrame"],
    source: "../plugin-hui/frameEmitter"
  }]);
  api.modifyRoutes(routes => {
    var _api$userConfig;

    const options = ((_api$userConfig = api.userConfig) === null || _api$userConfig === void 0 ? void 0 : _api$userConfig.hui) || {};
    const _options$keepOriginal = options.keepOriginalRoutes,
          keepOriginalRoutes = _options$keepOriginal === void 0 ? false : _options$keepOriginal; // 开启keepOriginalRoutes配置

    if (keepOriginalRoutes === true || (0, _lodash().isString)(keepOriginalRoutes)) {
      return (0, _addSpecifyPrefixedRoute.addSpecifyPrefixedRoute)(routes, keepOriginalRoutes, api.pkg.name);
    }

    return routes;
  });
}