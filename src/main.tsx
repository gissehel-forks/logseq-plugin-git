import "@logseq/libs";
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import { BUTTONS, COMMON_STYLE, SETTINGS_SCHEMA, STATUS } from "./helper/constants";
import {
  checkout,
  commit,
  commitMessage,
  log,
  pull,
  pullRebase,
  push,
} from "./helper/git";
import {
  checkStatus,
  debounce,
  hidePopup,
  setPluginStyle,
  showPopup,
  checkIsSynced,
  checkStatusWithDebounce,
  runInBackground,
} from "./helper/util";
import "./index.css";
import { StepManager } from "./helper/StepManager";
import { stepCheckStatus, stepCommit, stepException, stepPull, stepPullRebase, stepPush, stepStop } from "./helper/stepManagement";
import { setCommitInProgress, setCommitStatus, setExceptionStatus, setPullInProgress, setPullStatus, setPushInProgress, setPushStatus } from "./helper/indicators";

// TODO: patch logseq Git command for the temporary fix solution
// https://github.com/haydenull/logseq-plugin-git/issues/48
try {
  // @ts-ignore
  top.logseq.sdk.git.exec_command(['status'])
} catch (e) {
  console.log(`Git plugin: ${e} - patching logseq.Git.execCommand`);
  // @ts-ignore
  logseq.Git['execCommand'] = async function (args: string[]) {
    // const ret = await logseq.App.execGitCommand(args)
    // @ts-ignore
    const ret = await top.logseq.sdk.git.exec_command(args)
    return { exitCode: ret == undefined ? 1 : 0, stdout: ret }
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isDevelopment = import.meta.env.DEV

if (isDevelopment) {
  renderApp("browser");
} else {
  console.log("=== logseq-plugin-git loaded ===");
  logseq.ready(async () => {
    const operations = {
      check: debounce(async function () {
        const stepManager = new StepManager("check");

        await stepCheckStatus(stepManager);

        if (stepManager.needCommit) {
          logseq.UI.showMsg(`Changes detected:\n${stepManager.commitList}`, "success", {
            timeout: 0,
          });
        } else {
          logseq.UI.showMsg("No changes detected.");
        }

        await stepException(stepManager);
        await stepStop(stepManager);

        hidePopup();
      }),
      pull: debounce(async function () {
        console.log("[faiz:] === pull click");
        hidePopup();

        const stepManager = new StepManager("pull");

        await stepPull(stepManager);
        await stepException(stepManager);
        if (stepManager.success) {
          await stepCheckStatus(stepManager);
        }
        await stepStop(stepManager);
      }),
      pullRebase: debounce(async function () {
        console.log("[faiz:] === pullRebase click");
        hidePopup();

        const stepManager = new StepManager("pullRebase");

        await stepPullRebase(stepManager);
        await stepException(stepManager);
        if (stepManager.success) {
          await stepCheckStatus(stepManager);
        }
        await stepStop(stepManager);
      }),
      checkout: debounce(async function () {
        console.log("[faiz:] === checkout click");
        hidePopup();
        await checkout();
      }),
      commit: debounce(async function () {
        console.log("[faiz:] === commit called");
        const stepManager = new StepManager("commit");

        if (stepManager.success) {
          await stepCommit(stepManager);
        }

        await stepCheckStatus(stepManager);
        await stepManager.stop();
      }),
      push: debounce(async function () {
        console.log("[faiz:] === push called");
        hidePopup();

        const stepManager = new StepManager("push");

        await stepPush(stepManager);
        await stepException(stepManager);
        if (stepManager.success) {
          await stepCheckStatus(stepManager);
        }
        await stepStop(stepManager);
      }),
      commitAndPush: debounce(async function () {
        console.log("[faiz:] === commitAndPush called");
        hidePopup();

        const stepManager = new StepManager("commitAndPush");

        await stepCommit(stepManager);
        if (stepManager.success) {
          await stepPush(stepManager);
        }
        await stepException(stepManager);
        if (stepManager.success) {
          await stepCheckStatus(stepManager);
        }
        await stepStop(stepManager);
      }),
      sync: debounce(async function () {
        console.log("[faiz:] === sync click");
        hidePopup();

        const stepManager = new StepManager("sync");

        if (stepManager.success) {
          await stepCheckStatus(stepManager);
        }

        if (stepManager.success && stepManager.needCommit) {
          await stepCommit(stepManager);
        }

        if (stepManager.success) {
          await stepPullRebase(stepManager);
        }

        if (stepManager.success && stepManager.needPush) {
          await stepPush(stepManager);
        }

        await stepException(stepManager);

        if (stepManager.success) {
          await stepCheckStatus(stepManager);
        }

        await stepStop(stepManager);
      }),
      log: debounce(async function () {
        console.log("[faiz:] === log click");
        const res = await log(false);
        logseq.UI.showMsg(res?.stdout, "success", { timeout: 0 });
        hidePopup();
      }),
      showPopup: debounce(async function () {
        console.log("[faiz:] === showPopup click");
        showPopup();
      }),
      hidePopup: debounce(function () {
        console.log("[faiz:] === hidePopup click");
        hidePopup();
      }),
    };

    logseq.provideModel(operations);

    logseq.App.registerUIItem("toolbar", {
      key: "git",
      template:
        '<a data-on-click="showPopup" class="button"><i class="ti ti-brand-git"></i></a>' +
        '<div id="plugin-git-content-wrapper"></div>' +
        '<div class="git-status-commit"></div>' +
        '<div class="git-status-pull"></div>' +
        '<div class="git-status-push"></div>' +
        '<div class="git-status-exception"></div>',
    });
    logseq.useSettingsSchema(SETTINGS_SCHEMA);
    setTimeout(() => {
      const buttons = (logseq.settings?.buttons as string[])
        ?.map((title) => BUTTONS.find((b) => b.title === title))
        .filter(Boolean);
      if (top && buttons?.length) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(
          `
          <div class="plugin-git-container">
            <div class="plugin-git-mask"></div>
            <div class="plugin-git-popup flex flex-col">
              ${buttons
            .map(
              (button) =>
                `<button class="ui__button plugin-git-${button?.key} bg-indigo-600 hover:bg-indigo-700 focus:border-indigo-700 active:bg-indigo-700 text-center text-sm p-1" style="margin: 4px 0; color: #fff;">${button?.title}</button>`
            )
            .join("\n")}
          </div>
          `,
          "text/html"
        );
        // remove .plugin-git-container if exists
        const container = top?.document?.querySelector(".plugin-git-container");
        console.log("[faiz:] === container", container);
        if (container) top?.document?.body.removeChild(container);
        top?.document?.body.appendChild(
          doc.body.childNodes?.[0]?.cloneNode(true)
        );
        top?.document
          ?.querySelector(".plugin-git-mask")
          ?.addEventListener("click", hidePopup);
        buttons.forEach((button) => {
          top?.document
            ?.querySelector(`.plugin-git-${button?.key}`)
            ?.addEventListener("click", operations?.[button!?.event]);
        });
      }
    }, 1007);

    logseq.App.onRouteChanged(async () => {
      await checkStatusWithDebounce();
    });
    if (logseq.settings?.checkWhenDBChanged) {
      logseq.DB.onChanged(async ({ blocks, txData, txMeta }) => {
        await checkStatusWithDebounce();
      });
    }

    setPluginStyle(COMMON_STYLE)

    if (logseq.settings?.autoCheckSynced) {
      checkIsSynced();
    }
    await checkStatusWithDebounce();

    if (top) {
      top.document?.addEventListener("visibilitychange", async () => {
        const visibilityState = top?.document?.visibilityState;

        if (visibilityState === "visible") {
          if (logseq.settings?.autoCheckSynced) {
            checkIsSynced();
          }
        } else if (visibilityState === "hidden") {
          // logseq.UI.showMsg(`Page is hidden: ${new Date()}`, 'success', { timeout: 0 })
          // noChange void
          // changed commit push
          if (logseq.settings?.autoPush) {
            operations.commitAndPush();
          }
        }
      });
    }

    logseq.App.registerCommandPalette(
      {
        key: "logseq-plugin-git:commit",
        label: "Commit",
        keybinding: {
          binding: "alt+shift+s",
          mode: "global",
        },
      },
      async () => operations.commit()
    );
    logseq.App.registerCommandPalette(
      {
        key: "logseq-plugin-git:commit&push",
        label: "Commit & Push",
        keybinding: {
          binding: "mod+s",
          mode: "global",
        },
      },
      async () => operations.commitAndPush()
    );
    logseq.App.registerCommandPalette(
      {
        key: "logseq-plugin-git:rebase",
        label: "Pull Rebase",
        keybinding: {
          binding: "mod+alt+s",
          mode: "global",
        },
      },
      async () => operations.pullRebase()
    );
  });
}

function renderApp(env: string) {
  ReactDOM.render(
    <React.StrictMode>
      <App env={env} />
    </React.StrictMode>,
    document.getElementById("root")
  );
}
