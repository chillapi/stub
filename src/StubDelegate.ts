import { Delegate } from '@chillapi/api';
import { StubConfig } from "./StubConfig";
import { fake } from "faker";

export class StubDelegate implements Delegate {

    constructor(private config: StubConfig) { }

    async process(context: any, params: any): Promise<void> {
        params[this.config.assign] = {
            ...(this.config.payload ? this.fakePayload(this.config.payload) : {}),
            ...(this.config.reflect && params.body ? params.body : {})
        };
        return Promise.resolve();
    }

    private fakePayload(payload: any) {
        return JSON.parse(fake(JSON.stringify(payload)));
    }
}