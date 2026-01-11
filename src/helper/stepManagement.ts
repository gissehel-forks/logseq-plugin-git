import { STATUS } from "./constants";
import { commit, commitMessage, pull, pullRebase, push } from "./git";
import { setCommitInProgress, setCommitStatus, setExceptionStatus, setPullInProgress, setPullStatus, setPushInProgress, setPushStatus } from "./indicators";
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
    await setPullInProgress(true);
    await stepManager.executeStep("pullRebase", async (statusState) => {
        await pullRebase(true, statusState)
        return (statusState?.needPullRebase === false);
    });
    await setPullInProgress(false);
}

export const stepPush = async (stepManager: StepManager) => {
    await setPushInProgress(true);
    await stepManager.executeStep("push", async (statusState) => {
        await push(true, statusState)
        return (statusState?.needPush === false);
    });
    await setPushInProgress(false);
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
        runInBackground(async () => {
            await delay(15000);
            await stepCheckStatus(stepManager);
        })
    }
}

export const stepStop = async (stepManager: StepManager) => {
    await stepManager.stop();
}
