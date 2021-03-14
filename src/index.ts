import address from "address";
import assert from "assert";
import { isString } from "lodash";
import { IApi } from "umi";
import { join } from "path";
import { readFileSync } from "fs";
import { addSpecifyPrefixedRoute } from "./addSpecifyPrefixedRoute";

export type PluginOptions = {
  devSourceMap?: boolean;
  keepOriginalRoutes?: boolean | string;
  shouldNotModifyRuntimePublicPath?: boolean;
  shouldNotModifyDefaultBase?: boolean;
};

export default function (api: IApi) {
  api.addRuntimePluginKey(() => "hui");

  api.describe({
    key: "hui",
    config: {
      schema(joi) {
        return joi.object();
      },
    },
  });

  // ???
  // api.addRuntimePlugin(() => "@@/plugin-hui/runtimePlugin");

  // eslint-disable-next-line import/no-dynamic-require, global-require
  api.modifyDefaultConfig((memo) => {
    const initialOptions: PluginOptions = {
      devSourceMap: true,
      ...memo.hui,
    };

    const modifiedDefaultConfig = {
      ...memo,
      disableGlobalVariables: true,
      // 默认开启 runtimePublicPath，避免出现 dynamic import 场景子应用资源地址出问题
      runtimePublicPath: true,
      runtimeHistory: {},
      hui: {
        ...memo.hui,
        ...initialOptions,
      },
    };

    const shouldNotModifyDefaultBase =
      api.userConfig.hui?.shouldNotModifyDefaultBase ?? initialOptions.shouldNotModifyDefaultBase;
    if (!shouldNotModifyDefaultBase) {
      modifiedDefaultConfig.base = `/${api.pkg.name}`;
    }

    return modifiedDefaultConfig;
  });

  api.modifyPublicPathStr((publicPathStr) => {
    const { runtimePublicPath } = api.config;
    const { shouldNotModifyRuntimePublicPath } = api.config.hui || {};

    if (runtimePublicPath === true && !shouldNotModifyRuntimePublicPath) {
      return `window.__INJECTED_PUBLIC_PATH_BY_HUI_MICRO_APP__ || "${api.config.publicPath || "/"}"`;
    }

    return publicPathStr;
  });

  api.chainWebpack((config, { webpack }) => {
    assert(api.pkg.name, "You should have name in package.json");

    config.output.libraryTarget("global").library(`HUI_MICRO_APP_${api.pkg.name}`);
    const usingWebpack5 = webpack.version?.startsWith("5");
    // webpack5 移除了 jsonpFunction 配置，且不再需要配置 jsonpFunction，see https://webpack.js.org/blog/2020-10-10-webpack-5-release/#automatic-unique-naming
    if (!usingWebpack5) {
      config.output.jsonpFunction(`webpackJsonp_${api.pkg.name}`);
    }

    return config;
  });

  // umi bundle 添加 entry 标记
  api.modifyHTML(($) => {
    $("script").each((_, el) => {
      const scriptEl = $(el);
      const umiEntryJs = /\/?umi(\.\w+)?\.js$/g;
      if (umiEntryJs.test(scriptEl.attr("src") ?? "")) {
        scriptEl.attr("entry", "");
      }
    });

    return $;
  });

  const port = process.env.PORT;
  // source-map 跨域设置
  if (process.env.NODE_ENV === "development" && port) {
    const localHostname = process.env.USE_REMOTE_IP ? address.ip() : process.env.HOST || "localhost";

    const protocol = process.env.HTTPS ? "https" : "http";
    // 变更 webpack-dev-server websocket 默认监听地址
    process.env.SOCKET_SERVER = `${protocol}://${localHostname}:${port}/`;
    api.chainWebpack((memo, { webpack }) => {
      // 开启了 devSourceMap 配置，默认为 true
      if (api.config.hui && api.config.devSourceMap) {
        // 禁用 devtool，启用 SourceMapDevToolPlugin
        memo.devtool(false);
        memo.plugin("source-map").use(webpack.SourceMapDevToolPlugin, [
          {
            // @ts-ignore
            namespace: api.pkg.name,
            append: `\n//# sourceMappingURL=${protocol}://${localHostname}:${port}/[url]`,
            filename: "[file].map",
          },
        ]);
      }
      return memo;
    });
  }

  api.addEntryImports(() => {
    return {
      source: "@@/plugin-hui/lifecycles",
      specifier:
        "{ genMount as hui_genMount, genBootstrap as hui_genBootstrap, genUnmount as hui_genUnmount, genUpdate as hui_genUpdate }",
    };
  });
  api.addEntryCode(
    () =>
      `
    export const bootstrap = hui_genBootstrap(clientRender);
    export const mount = hui_genMount('${api.config.mountElementId}');
    export const unmount = hui_genUnmount('${api.config.mountElementId}');
    export const update = hui_genUpdate();

    if (!window.__POWERED_BY_HUI_MICRO_APP__) {
      bootstrap().then(mount);
    }
    `
  );

  api.onGenerateFiles(() => {
    api.writeTmpFile({
      path: "plugin-hui/options.js",
      content: `
      let options = ${JSON.stringify(api.config.hui || {})};
      export const getOptions = () => options;
      export const setOptions = (newOpts) => options = ({ ...options, ...newOpts });
      `,
    });

    api.writeTmpFile({
      path: "plugin-hui/model.ts",
      content: readFileSync(join(__dirname, "templates", "model.ts.tpl"), "utf-8"),
    });

    api.writeTmpFile({
      path: "plugin-hui/runtimePlugin.ts",
      content: readFileSync(join(__dirname, "templates", "runtimePlugin.ts.tpl"), "utf-8"),
    });

    api.writeTmpFile({
      path: "plugin-hui/lifecycles.ts",
      content: readFileSync(join(__dirname, "templates", "lifecycles.ts.tpl"), "utf-8"),
    });

    api.writeTmpFile({
      path: "plugin-hui/frameEmitter.ts",
      content: readFileSync(join(__dirname, "templates", "frameEmitter.ts.tpl"), "utf-8"),
    });
  });

  api.addUmiExports(() => [
    { specifiers: ["frameEmitter", "onFrame", "triggerFrame"], source: "../plugin-hui/frameEmitter" },
  ]);

  api.modifyRoutes((routes) => {
    const options: PluginOptions = api.userConfig?.hui! || {};
    const { keepOriginalRoutes = false } = options;

    // 开启keepOriginalRoutes配置
    if (keepOriginalRoutes === true || isString(keepOriginalRoutes)) {
      return addSpecifyPrefixedRoute(routes, keepOriginalRoutes, api.pkg.name);
    }

    return routes;
  });
}
