
import { dirname, resolve } from 'path';
import { loadEntities, Entity } from '@chillapi/api';

import { ModuleConfig, ModuleLoader, OpenAPIV3 } from "@chillapi/api";
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import Handlebars from 'handlebars';

export class StubModuleLoader implements ModuleLoader {

    async loadModule(config: ModuleConfig): Promise<any> {
        return Promise.resolve();
    }

    async generateStubs(api: OpenAPIV3, fsPath: string): Promise<void> {
        const entities = loadEntities(api);
        for (const [apiPath, methods] of Object.entries(api.paths)) {
            for (const [method, props] of Object.entries(methods)) {
                const schema = (props as any).responses[200].content['application/json'].schema;
                const fullPath = resolve(fsPath, ...apiPath.replace(/[\{\}]/g, '_').split('/'), `${method}.yaml`);
                const isArray = schema.type === 'array';
                const entity = entities.filter(e =>
                    schema.$ref === `#/components/schemas/${e.name}`
                    || (isArray && schema.items.$ref === `#/components/schemas/${e.name}`))[0]
                try {
                    await this.executeTemplate(fullPath, this.selectTemplate(method, isArray), { path: apiPath, payload: this.generateStub(entity, isArray) });
                } catch (err) {
                    return Promise.reject(err);
                }
            }
        }
        return Promise.resolve();
    }

    private selectTemplate(method: string, isArray: boolean) {
        switch (method.toLowerCase()) {
            case 'get':
                return isArray ? 'get-entity-list.yaml' : 'get-entity-single.yaml';
            case 'post':
                return 'add-entity.yaml';
            case 'put':
                return 'update-entity.yaml';
            case 'delete':
                return 'delete-entity.yaml';
            // TODO find a more elegant way to select template
        }
    }

    private generateStub(entity: Entity, isArray: boolean): any {
        if (!entity) {
            return {}
        }

        if (isArray) {
            const retArr = [];
            for (let i = 0; i < 3; i++) {
                retArr.push(this.generateStub(entity, false));
            }
            return retArr;
        }

        const retObj: any = {};
        for (const prop of entity.properties) {
            switch (prop.type) {
                case 'string':
                    retObj[prop.name] = '{{random.word}}';
                    break;
                case 'integer':
                    retObj[prop.name] = '{{random.number}}';
                    break;
                // TODO refine based on format and guess
            }
        }
        return retObj;
    }

    private async executeTemplate(fPath: string, fTpl: string, args: any): Promise<void> {
        const dir = dirname(fPath);
        if (!existsSync(dir)) {
            try {
                await mkdir(dir, { recursive: true });
            } catch (err) {
                console.error(err);
                return Promise.reject(err);
            }
        }
        const f = Handlebars.templates[fTpl];
        try {
            await writeFile(fPath, f(args), 'utf-8');
        } catch (err) {
            console.error(err);
            return Promise.reject(err);
        }
        return Promise.resolve();
    }
}