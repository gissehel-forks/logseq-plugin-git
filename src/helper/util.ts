import {
  COMMON_STYLE,
  HIDE_POPUP_STYLE,
  SHOW_POPUP_STYLE,
  STATUS,
} from "./constants";
import { status, inProgress, execGitCommand, pull, checkPullPushNeeded } from "./git";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const checkStatus = async () => {
  console.log("Checking status...");  
  const statusRes = await status(false);
  if (statusRes?.stdout === "") {
    console.log("No changes", statusRes);
    await setCommitStatus(STATUS.COMMIT.CLEAN);
  } else {
    console.log("Need save", statusRes);
    await setCommitStatus(STATUS.COMMIT.DIRTY);
  }
  await delay(100);
  const pullPushNeeded = await checkPullPushNeeded();
  if (pullPushNeeded.needPull) {
    console.log("Need pull");
    await setPullStatus(STATUS.PULL.NEEDED);
  } else {
    console.log("No need pull");
    await setPullStatus(STATUS.PULL.NOT_NEEDED);
  }
  if (pullPushNeeded.needPush) {
    console.log("Need push");
    await setPushStatus(STATUS.PUSH.NEEDED);
  } else {
    console.log("No need push");
    await setPushStatus(STATUS.PUSH.NOT_NEEDED);
  }
  return statusRes;
};

let pluginStyle = COMMON_STYLE;
export const setPluginStyle = (style: string) => {
  pluginStyle = style;
  logseq.provideStyle({ key: "git", style });
};
export const getPluginStyle = () => pluginStyle;

let pullStatus: string | null = null;
let pushStatus: string | null = null;
let commitStatus: string | null = null;
let commitInProgress: boolean = false;
let pullInProgress: boolean = false;
let pushInProgress: boolean = false;

const setIndicator = (element, value, valueSet, valueRemove, className) => {
  if (value === valueSet) {
    element?.classList?.add(className);
  }
  if (value === valueRemove) {
    element?.classList?.remove(className);
  }
};

const setIndicatorBoolean = (element, value, className) => {
  if (value) {
    element?.classList?.add(className);
  } else {
    element?.classList?.remove(className);
  }
};

const updateStatusIndicators = async () => {
  const indicatorElement = top?.document?.querySelector('#logseq-git--git')
  console.log({indicatorElement, pullStatus, pushStatus, commitStatus, commitInProgress, pullInProgress, pushInProgress});
  if (indicatorElement == null) return;

  setIndicator(indicatorElement, pullStatus, STATUS.PULL.NEEDED, STATUS.PULL.NOT_NEEDED, "git-pull");
  setIndicator(indicatorElement, pushStatus, STATUS.PUSH.NEEDED, STATUS.PUSH.NOT_NEEDED, "git-push");
  setIndicator(indicatorElement, commitStatus, STATUS.COMMIT.DIRTY, STATUS.COMMIT.CLEAN, "git-commit");
  setIndicatorBoolean(indicatorElement, commitInProgress, "git-blink-commit");
  setIndicatorBoolean(indicatorElement, pullInProgress, "git-blink-pull");
  setIndicatorBoolean(indicatorElement, pushInProgress, "git-blink-push");
}
// @ts-ignore
window.updateStatusIndicators = updateStatusIndicators;

export const setPullStatus = async (status: string | null) => {
  pullStatus = status;
  await updateStatusIndicators();
};
export const getPullStatus = async () => pullStatus;

export const setPushStatus = async (status: string | null) => {
  pushStatus = status;
  await updateStatusIndicators();
};
export const getPushStatus = async () => pushStatus;

export const setCommitStatus = async (status: string | null) => {
  commitStatus = status;
  await updateStatusIndicators();
};
export const getCommitStatus = async () => commitStatus;

export const setCommitInProgress = async (inProgress: boolean) => {
  commitInProgress = inProgress;
  await updateStatusIndicators();
};
export const getCommitInProgress = async () => commitInProgress;

export const setPullInProgress = async (inProgress: boolean) => {
  pullInProgress = inProgress;
  await updateStatusIndicators();
};
export const getPullInProgress = async () => pullInProgress;

export const setPushInProgress = async (inProgress: boolean) => {
  pushInProgress = inProgress;
  await updateStatusIndicators();
};
export const getPushInProgress = async () => pushInProgress;

export const showPopup = () => {
  const _style = getPluginStyle();
  logseq.UI.queryElementRect("#logseq-git--git").then((triggerIconRect) => {
    console.log("[faiz:] === triggerIconRect", triggerIconRect);
    if (!triggerIconRect) return;
    const popupWidth = 120 + 10 * 2;
    const left =
      triggerIconRect.left + triggerIconRect.width / 2 - popupWidth / 2;
    const top = triggerIconRect.top + triggerIconRect.height;
    const _style = getPluginStyle();
    setPluginStyle(
      `${_style}\n.plugin-git-popup{left:${left}px;top:${top}px;}`
    );
  });
  setPluginStyle(`${_style}\n${SHOW_POPUP_STYLE}`);
};
export const hidePopup = () => {
  const _style = getPluginStyle();
  setPluginStyle(`${_style}\n${HIDE_POPUP_STYLE}`);
};

export const debounce = (fn, wait: number = 100, environment?: any) => {
  let timer = null;
  return function () {
    return new Promise(((resolve) => {
      // @ts-ignore
      const context = environment || this;
      const args = arguments;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      // @ts-ignore
      timer = setTimeout(function () {
        (fn.apply(context, args)).then(() => {
          resolve(null);
        });
      }, wait);
    }));
  };
};

export const checkStatusWithDebounce = debounce(async () => {
  await checkStatus();
}, 2000);

export const isRepoUpTodate = async () => {
  await execGitCommand(["fetch"]);
  const local = await execGitCommand(["rev-parse", "HEAD"]);
  const remote = await execGitCommand(["rev-parse", "@{u}"]);
  logseq.UI.showMsg(`${local.stdout} === ${remote.stdout}`, "success", { timeout: 30 });
  return local.stdout === remote.stdout;
};

export const checkIsSynced = async () => {
  if (inProgress()) {
    console.log("[faiz:] === checkIsSynced Git in progress, skip check");
    return
  }

  const isSynced = await isRepoUpTodate();
  if (!isSynced)
    logseq.UI.showMsg(
      `The current repository is not synchronized with the remote repository, please check.`,
      "warning",
      { timeout: 0 }
    );
};
