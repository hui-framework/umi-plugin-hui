"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addSpecifyPrefixedRoute = void 0;

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

function _lodash() {
  const data = require("lodash");

  _lodash = function _lodash() {
    return data;
  };

  return data;
}

const recursiveCoverRouter = (source, nameSpacePath) => source.map(router => {
  if (router.routes) {
    recursiveCoverRouter(router.routes, nameSpacePath);
  }

  if (router.path !== "/" && router.path) {
    return (0, _objectSpread2().default)((0, _objectSpread2().default)({}, router), {}, {
      path: `${nameSpacePath}${router.path}`
    });
  }

  return router;
});

const addSpecifyPrefixedRoute = (originRoute, keepOriginalRoutes, pkgName) => {
  const copyBase = originRoute.filter(_ => _.path === "/");

  if (!copyBase[0]) {
    return originRoute;
  }

  const nameSpaceRouter = (0, _lodash().cloneDeep)(copyBase[0]);
  const nameSpace = keepOriginalRoutes === true ? pkgName : keepOriginalRoutes;
  nameSpaceRouter.path = `/${nameSpace}`;
  nameSpaceRouter.routes = recursiveCoverRouter(nameSpaceRouter.routes, `/${nameSpace}`);
  return [nameSpaceRouter, ...originRoute];
};

exports.addSpecifyPrefixedRoute = addSpecifyPrefixedRoute;