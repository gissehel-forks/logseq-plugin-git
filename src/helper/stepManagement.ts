import { STATUS } from "./constants";
import { commit, commitMessage, pull, pullRebase, push, sync } from "./git";
import { setCommitInProgress, setCommitStatus, setExceptionInProgress, setExceptionStatus, setPullInProgress, setPullStatus, setPushInProgress, setPushStatus } from "./indicators";
import { StepManager } from "./StepManager";
import { checkStatus, delay, runInBackground } from "./util";

export const stepCheckStatus = async (stepManager: StepManager) => {
    await stepManager.executeStep("checkStatus", async (statusState) => {
        await checkStatus(statusState);
        return true;
    });
}

export const stepCommit = async (stepManager: StepManager) => {
    await setCommitInProgress(true);
    await stepManager.executeStep("commit", async (statusState) => {
        await commit(true, commitMessage(), statusState)
        return (statusState?.needCommit === false);
    });
    await setCommitInProgress(false);
    await setCommitStatus(STATUS.COMMIT.CLEAN);
}

export const stepPull = async (stepManager: StepManager) => {
    await setPullInProgress(true);
    await stepManager.executeStep("pull", async (statusState) => {
        await pull(true, statusState)
        return (statusState?.needPullRebase === false);
    });
    await setPullInProgress(false);
}

export const stepPullRebase = async (stepManager: StepManager) => {
    let result = false;
    await setPullInProgress(true);
    await stepManager.executeStep("pullRebase", async (statusState) => {
        await pullRebase(true, statusState)
        result = (statusState?.needPullRebase === false);
        return result;
    });
    await setPullInProgress(false);
    await setPullStatus(STATUS.PULL.NOT_NEEDED);
    return result;
}

export const stepPush = async (stepManager: StepManager) => {
    let result = false;
    await setPushInProgress(true);
    await stepManager.executeStep("push", async (statusState) => {
        await push(true, statusState)
        result = (statusState?.needPush === false);
        return result;
    });
    await setPushInProgress(false);
    await setPushStatus(STATUS.PUSH.NOT_NEEDED);
    return result;
}

export const stepException = async (stepManager: StepManager) => {
    if (!stepManager.success) {
        await setCommitInProgress(false)
        await setPullInProgress(false)
        await setPushInProgress(false)
        await setCommitStatus(STATUS.COMMIT.CLEAN)
        await setPullStatus(STATUS.PULL.NOT_NEEDED)
        await setPushStatus(STATUS.PUSH.NOT_NEEDED)
        await setExceptionStatus(STATUS.EXCEPTION.ERROR);
        await setExceptionInProgress(true);
        runInBackground(async () => {
            await delay(15000);
            await stepCheckStatus(stepManager);
        })
    }
}

export const stepSyncCommand = async (stepManager: StepManager) => {
    await setCommitInProgress(true);
    await setPullInProgress(true);
    await setPushInProgress(true);

    let result = false;

    await stepManager.executeStep("syncCommand", async (statusState) => {
        await sync(true, statusState)
        result = (statusState?.needCommit === false) && (statusState?.needPullRebase === false) && (statusState?.needPush === false);;
        return result;
    });

    await setCommitInProgress(false);
    await setPullInProgress(false);
    await setPushInProgress(false);
    await setCommitStatus(STATUS.COMMIT.CLEAN);
    await setPullStatus(STATUS.PULL.NOT_NEEDED);
    await setPushStatus(STATUS.PUSH.NOT_NEEDED);

    return result;
}

export const stepStop = async (stepManager: StepManager) => {
    await stepManager.stop();
}
