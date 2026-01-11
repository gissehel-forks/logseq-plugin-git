import {
  COMMON_STYLE,
  HIDE_POPUP_STYLE,
  SHOW_POPUP_STYLE,
  STATUS,
} from "./constants";
import { status, inProgress, execGitCommand, pull, checkPullPushNeeded } from "./git";
import { setCommitStatus, setExceptionInProgress, setExceptionStatus, setPullStatus, setPushStatus, StatusState } from "./indicators";

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run asynchronous code in the background without blocking the main thread.
 * That function seems useless, as a simple to asyncCode without await would do the same, 
 * but the whole point is to have a named function for better readability.
 * 
 * Everywhere else, an async function should be called with await.
 * @param asyncCode The asynchronous code to run in the background.
 */
export const runInBackground = (asyncCode: (...args: any[]) => Promise<any>) => {
  setTimeout(() => asyncCode(), 0);
}

export const checkStatus = async (statusState?: StatusState) => {
  console.log("Checking status...");
  await setExceptionStatus(STATUS.EXCEPTION.NO_ERROR);
  await setExceptionInProgress(false);

  const statusRes = await status(false);
  if (statusRes?.stdout === "") {
    console.log("No changes", statusRes);
    if (statusState) {
      statusState.needCommit = false;
      statusState.commitList = null;
    }
    await setCommitStatus(STATUS.COMMIT.CLEAN);
  } else {
    console.log("Need save", statusRes);
    if (statusState) {
      statusState.needCommit = true;
      statusState.commitList = statusRes?.stdout;
    }
    await setCommitStatus(STATUS.COMMIT.DIRTY);
  }
  await delay(100);
  const pullPushNeeded = await checkPullPushNeeded();
  if (pullPushNeeded.needPull) {
    console.log("Need pull");
    if (statusState) {
      statusState.needPullRebase = true;
    }
    await setPullStatus(STATUS.PULL.NEEDED);
  } else {
    console.log("No need pull");
    if (statusState) {
      statusState.needPullRebase = false;
    }
    await setPullStatus(STATUS.PULL.NOT_NEEDED);
  }
  if (pullPushNeeded.needPush) {
    console.log("Need push");
    if (statusState) {
      statusState.needPush = true;
    }
    await setPushStatus(STATUS.PUSH.NEEDED);
  } else {
    console.log("No need push");
    if (statusState) {
      statusState.needPush = false;
    }
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

