import { resolve } from 'path';
import { loadEntities, Entity } from '@chillapi/api';

import { OpenAPIV3 } from '@chillapi/api/dist/openapiv3';
import { executeTemplateIfTargetNotEditedByUser } from '@chillapi/template';
import { fake } from 'faker';
import Handlebars from 'handlebars';

global.Handlebars = Handlebars;

import './templates/precompiled';

export async function generateStubs(api: OpenAPIV3, fsPath: string): Promise<void> {
    const entities = loadEntities(api);
    for (const [apiPath, methods] of Object.entries(api.paths)) {
        for (const [method, props] of Object.entries(methods)) {
            // TODO refine
            const responses = (props as any).responses;
            if (!responses || !responses[200] || !responses[200].content) {
                continue;
            }
            const schema = (props as any).responses['200'].content['application/json'].schema;
            const fullPath = resolve(fsPath, ...apiPath.replace(/[\{\}]/g, '_').split('/'), `${method}.yaml`);
            const isArray = schema.type === 'array';
            const entity = entities.filter(e =>
                schema.$ref === `#/components/schemas/${e.name}`
                || (isArray && schema.items.$ref === `#/components/schemas/${e.name}`))[0]
            try {
                await executeTemplateIfTargetNotEditedByUser(
                    fullPath,
                    selectTemplate(method, isArray),
                    { path: apiPath, payload: JSON.stringify(generateStub(entity, isArray)) }
                );
                console.info(`Wrote ${fullPath}`);
            } catch (err) {
                return Promise.reject(err);
            }
        }
    }
    return Promise.resolve();
}

function selectTemplate(method: string, isArray: boolean) {
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

function generateStub(entity: Entity, isArray: boolean): any {
    if (!entity) {
        return {}
    }

    if (isArray) {
        const retArr = [];
        for (let i = 0; i < 3; i++) {
            retArr.push(generateStub(entity, false));
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
        retObj[prop.name] = fake(retObj[prop.name]);
    }
    return retObj;
}