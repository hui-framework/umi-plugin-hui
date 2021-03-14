import React from 'react';
import mountDefer, { clientRenderOptsStack } from './lifecycles';

export function rootContainer(container: HTMLElement) {
  return null;
}

export const render = (oldRender: any) => {
  return mountDefer().then(oldRender);
};

export function modifyClientRenderOpts(memo: any) {
  // 每次应用 render 的时候会调 modifyClientRenderOpts，这时尝试从队列中取 render 的配置
  const clientRenderOpts = clientRenderOptsStack.shift();
  if (clientRenderOpts) {
    const history = clientRenderOpts.getHistory();
    delete clientRenderOpts.getHistory;
    clientRenderOpts.history = history;
  }

  return {
    ...memo,
    ...clientRenderOpts,
  };
}
