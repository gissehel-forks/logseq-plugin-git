import "@logseq/libs";
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import { BUTTONS, COMMON_STYLE, SETTINGS_SCHEMA } from "./helper/constants";
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
  setPullInProgress,
  setCommitInProgress,
  setPushInProgress,
} from "./helper/util";
import "./index.css";

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
    return {exitCode: ret == undefined ? 1 : 0, stdout: ret}
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
        const status = await checkStatus();
        if (status?.stdout === "") {
          logseq.UI.showMsg("No changes detected.");
        } else {
          logseq.UI.showMsg("Changes detected:\n" + status.stdout, "success", {
            timeout: 0,
          });
        }
        hidePopup();
      }),
      pull: debounce(async function () {
        console.log("[faiz:] === pull click");
        await setPullInProgress(true);
        // setPluginStyle(LOADING_STYLE);
        hidePopup();
        await pull(false);
        await setPullInProgress(false);
        await checkStatus();
      }),
      pullRebase: debounce(async function () {
        console.log("[faiz:] === pullRebase click");
        await setPullInProgress(true);
        // setPluginStyle(LOADING_STYLE);
        hidePopup();
        await pullRebase();
        await setPullInProgress(false);
        await checkStatus();
      }),
      checkout: debounce(async function () {
        console.log("[faiz:] === checkout click");
        hidePopup();
        await checkout();
      }),
      commit: debounce(async function () {
        console.log("[faiz:] === commit called");
        await setCommitInProgress(true);
        hidePopup();
        console.log("    start commit");
        await commit(true, commitMessage());
        console.log("    end commit");
        await setCommitInProgress(false);
        await checkStatus();
      }),
      push: debounce(async function () {
        console.log("[faiz:] === push called");
        await setPushInProgress(true);
        // setPluginStyle(LOADING_STYLE);
        hidePopup();
        await push();
        await setPushInProgress(false);
        await checkStatus();
      }),
      commitAndPush: debounce(async function () {
        console.log("[faiz:] === commitAndPush called");
        await setCommitInProgress(true);
        // setPluginStyle(LOADING_STYLE);
        hidePopup();

        const status = await checkStatus();
        const changed = status?.stdout !== "";
        if (changed) {
          const res = await commit(
              true,
              commitMessage()
          );
          await setCommitInProgress(false);
          if (res.exitCode === 0) {
            await setPushInProgress(true);
            await push(true);
            await setPushInProgress(false);
          };
        }
        
        await checkStatus();
      }),
      sync: debounce(async function () {
        console.log("[faiz:] === sync click");
        hidePopup();
        try {
        const status = await checkStatus();
        console.log("[faiz:]   => sync status done");
        const changed = status?.stdout !== "";
        if (changed) {
          console.log("[faiz:]   changes => try commit");
          await setCommitInProgress(true);
          let exitCode: number | null = null;
          try {
            const res = await commit(true, commitMessage());
            exitCode = res.exitCode;
            await setCommitInProgress(false);
          } catch (e) {
            console.error("[faiz:] === commit error", e);
            await setCommitInProgress(false);
            await delay(2000);
            exitCode = 0;
            await checkStatus();
          }

          console.log("[faiz:]   changes => commit done");
          if (exitCode === 0) {
            console.log("[faiz:]   changes => commit ok => try pullRebase");
            await setPullInProgress(true);
            const res = await pullRebase(true);
            await setPullInProgress(false);
            console.log("[faiz:]   changes => commit ok => pullRebase done");
            if (res.exitCode === 0) {
              console.log("[faiz:]   changes => commit ok => pullRebase done => try push");
              await setPushInProgress(true);
              const res = await push();
              await setPushInProgress(false);
              console.log("[faiz:]   changes => commit ok => pullRebase done => push done");
              if (res.exitCode === 0) {
                console.log("[faiz:]   changes => commit ok => pullRebase done => push ok");
              } else {
                console.log("[faiz:]   changes => commit ok => pullRebase done => push failed");
              }
            } else {
              console.log("[faiz:]   changes => commit ok => pullRebase failed");
            }
          };
        } else {
          console.log("[faiz:]   no changes => try pullRebase");
          await setPullInProgress(true);
          const res = await pullRebase(true);
          await setPullInProgress(false);
          console.log("[faiz:]   no changes => pullRebase done");
          if (res.exitCode === 0) {
            console.log("[faiz:]   no changes => pullRebase ok => try push");
            await setPushInProgress(true);
            await push();
            await setPushInProgress(false);
            console.log("[faiz:]   no changes => pullRebase ok => push done");
            if (res.exitCode === 0) {
              console.log("[faiz:]   no changes => pullRebase ok => push ok");
            } else {
              console.log("[faiz:]   no changes => pullRebase ok => push failed");
            }
          } else {
            console.log("[faiz:]   no changes => pullRebase failed");
          }
        }
        await checkStatus();
        } catch (e) {
          console.error("[faiz:] === sync error", e);
          await setCommitInProgress(false);
          await setPullInProgress(false);
          await setPushInProgress(false);
          await delay(10000);
          await checkStatus();
        }
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
        '<a data-on-click="showPopup" class="button"><i class="ti ti-brand-git"></i></a>'+
        '<div id="plugin-git-content-wrapper"></div>'+
        '<div class="git-status-commit"></div>'+
        '<div class="git-status-pull"></div>'+
        '<div class="git-status-push"></div>',
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
