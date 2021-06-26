import { DelegateConfig } from '@chillapi/api';

export interface StubConfig extends DelegateConfig {
    reflect?: boolean;
    payload?: any;
    assign?: string;
}