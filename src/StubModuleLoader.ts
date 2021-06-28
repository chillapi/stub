import { resolve } from 'path';
import { loadEntities, Entity, Property } from '@chillapi/api';

import { OpenAPIV3 } from '@chillapi/api/dist/openapiv3';
import { executeTemplateIfTargetNotEditedByUser } from '@chillapi/template';
import { datatype, lorem, name, date } from 'faker';
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
    return templates.find(tpl => tpl.match(method, isArray)).template;
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
        retObj[prop.name] = fakers.find(f => f.match(prop)).generate(prop);
    }
    return retObj;
}

interface FakerMapping {
    match: (prop: Property) => boolean;
    generate: (prop: Property) => string;
}

const fakers: FakerMapping[] = [
    {
        match: p => p.type === 'integer',
        generate: () => `${datatype.number()}`
    },
    {
        match: p => p.type === 'string' && /.*[iI]d$/.test(p.name),
        generate: () => `${datatype.uuid()}`
    },
    {
        match: p => p.type === 'integer' && /.*[iI]d$/.test(p.name),
        generate: () => `${datatype.number()}`
    },
    {
        match: p => p.type === 'string' && /.*[nN]ame$/.test(p.name),
        generate: () => `${name.firstName()}`
    },
    {
        match: p => p.type === 'string:date',
        generate: () => `${date.future()}`
    },
    {
        match: () => true,
        generate: () => `${lorem.word()}`
    }
];

interface TemplateSelector {
    template: string;
    match(method: string, isArray: boolean): boolean;
}

const templates: TemplateSelector[] = [
    { template: 'get-entity-list.yaml', match: (method, isArray) => method.toLowerCase() === 'get' && isArray },
    { template: 'get-entity-single.yaml', match: (method, isArray) => method.toLowerCase() === 'get' && !isArray },
    { template: 'add-entity.yaml', match: (method) => method.toLowerCase() === 'post' },
    { template: 'update-entity.yaml', match: (method) => method.toLowerCase() === 'put' },
    { template: 'delete-entity.yaml', match: (method) => method.toLowerCase() === 'delete' }
]