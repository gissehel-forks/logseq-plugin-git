import { StatusState } from "./indicators";

export class StepManager {
    private _name: string;
    private _success: boolean;
    private _lastStepName: string | null;
    private _statusState: StatusState;

    constructor(name: string) {
        this._name = name;
        this._success = true;
        this._lastStepName = null;
        this._statusState = new StatusState();
        console.log(`New step manager created: ${this._name}`);
    }

    async executeStep(stepName: string, stepFunction: (statusState: StatusState) => Promise<boolean>) {
        try {
            this._lastStepName = stepName;
            console.log(`  [${this._name}] Executing step: ${this._lastStepName}`);
            const result = await stepFunction(this._statusState);
            console.log(`    [${this._name}] End step: ${this._lastStepName} : result = ${result}`);
            this._success = result;
        } catch (error) {
            console.error(`    [${this._name}] Error executing step ${this._lastStepName}:`, error);
            this._success = false;
        }
    }

    async stop() {
        console.log(`  [${this._name}] Stopping after step: ${this._lastStepName}`);
    }

    get success() {
        return this._success;
    }

    get needCommit() {
        return this._statusState.needCommit;
    }

    get needPullRebase() {
        return this._statusState.needPullRebase;
    }

    get needPush() {
        return this._statusState.needPush;
    }

    get commitList() {
        return this._statusState.commitList;
    }
}
