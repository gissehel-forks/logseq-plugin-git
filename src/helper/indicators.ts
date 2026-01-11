import { STATUS } from "./constants";
import { HookableValue } from "./HookableValue";

export class StatusState {
    needCommit: null | boolean;
    needPullRebase: null | boolean;
    needPush: null | boolean;
    commitList: null | string;

    constructor() {
        this.needCommit = null;
        this.needPullRebase = null;
        this.needPush = null;
        this.commitList = null;
    }
}

let pullStatus = new HookableValue<string>("pullStatus", null);
let pushStatus = new HookableValue<string>("pushStatus", null);
let commitStatus = new HookableValue<string>("commitStatus", null);
let exceptionStatus = new HookableValue<string>("exceptionStatus", null);

let commitInProgress = new HookableValue<boolean>("commitInProgress", false);
let pullInProgress = new HookableValue<boolean>("pullInProgress", false);
let pushInProgress = new HookableValue<boolean>("pushInProgress", false);
let exceptionInProgress = new HookableValue<boolean>("exceptionInProgress", false);

const setIndicator = (element: Element | null, value: string | null, valueSet: string, valueRemove: string, className: string) => {
    if (value === valueSet) {
        element?.classList?.add(className);
    }
    if (value === valueRemove) {
        element?.classList?.remove(className);
    }
};

const setIndicatorBoolean = (element: Element | null, value: boolean | null, className: string) => {
    if (value) {
        element?.classList?.add(className);
    } else {
        element?.classList?.remove(className);
    }
};

let indicatorElement: Element | null = null;

const getIndicatorElement = (): Element | null => {
    if (indicatorElement === null) {
        indicatorElement = top?.document?.querySelector('#logseq-git--git') || null;
    }
    return indicatorElement;
}

commitStatus.register(async (newValue, oldValue) => {
    console.log(`[commitStatus] changed from ${oldValue} to ${newValue}`);
    setIndicator(getIndicatorElement(), newValue, STATUS.COMMIT.DIRTY, STATUS.COMMIT.CLEAN, "git-commit");
});

pullStatus.register(async (newValue, oldValue) => {
    console.log(`[pullStatus] changed from ${oldValue} to ${newValue}`);
    setIndicator(getIndicatorElement(), newValue, STATUS.PULL.NEEDED, STATUS.PULL.NOT_NEEDED, "git-pull");
});

pushStatus.register(async (newValue, oldValue) => {
    console.log(`[pushStatus] changed from ${oldValue} to ${newValue}`);
    setIndicator(getIndicatorElement(), newValue, STATUS.PUSH.NEEDED, STATUS.PUSH.NOT_NEEDED, "git-push");
});

commitInProgress.register(async (newValue, oldValue) => {
    console.log(`[commitInProgress] changed from ${oldValue} to ${newValue}`);
    setIndicatorBoolean(getIndicatorElement(), newValue, "git-blink-commit");
});

pullInProgress.register(async (newValue, oldValue) => {
    console.log(`[pullInProgress] changed from ${oldValue} to ${newValue}`);
    setIndicatorBoolean(getIndicatorElement(), newValue, "git-blink-pull");
});

pushInProgress.register(async (newValue, oldValue) => {
    console.log(`[pushInProgress] changed from ${oldValue} to ${newValue}`);
    setIndicatorBoolean(getIndicatorElement(), newValue, "git-blink-push");
});

exceptionStatus.register(async (newValue, oldValue) => {
    console.log(`[exceptionStatus] changed from ${oldValue} to ${newValue}`);
    setIndicator(getIndicatorElement(), newValue, STATUS.EXCEPTION.ERROR, STATUS.EXCEPTION.NO_ERROR, "git-exception");
});

exceptionInProgress.register(async (newValue, oldValue) => {
    console.log(`[exceptionInProgress] changed from ${oldValue} to ${newValue}`);
    setIndicatorBoolean(getIndicatorElement(), newValue, "git-blink-exception");
});

export const setCommitStatus = async (status: string | null) => { await commitStatus.setValue(status); };
export const getCommitStatus = async () => commitStatus.value;

export const setPullStatus = async (status: string | null) => { await pullStatus.setValue(status); };
export const getPullStatus = async () => pullStatus.value;

export const setPushStatus = async (status: string | null) => { await pushStatus.setValue(status); };
export const getPushStatus = async () => pushStatus.value;

export const setCommitInProgress = async (inProgress: boolean) => { await commitInProgress.setValue(inProgress); };
export const getCommitInProgress = async () => commitInProgress.value;

export const setPullInProgress = async (inProgress: boolean) => { await pullInProgress.setValue(inProgress); };
export const getPullInProgress = async () => pullInProgress.value;

export const setPushInProgress = async (inProgress: boolean) => { await pushInProgress.setValue(inProgress); };
export const getPushInProgress = async () => pushInProgress.value;

export const setExceptionStatus = async (status: string | null) => { await exceptionStatus.setValue(status); };
export const getExceptionStatus = async () => exceptionStatus.value;

export const setExceptionInProgress = async (inProgress: boolean) => { await exceptionInProgress.setValue(inProgress); };
export const getExceptionInProgress = async () => exceptionInProgress.value;