import { OpenAPIV3 } from '@chillapi/api/dist/openapiv3';
import { generateStubs } from './StubModuleLoader';
import { resolve } from 'path';

const api: OpenAPIV3 = {
    "openapi": "3.0.1",
    "info": {
        "title": "Swagger Petstore",
        "version": "1.0.0"
    },
    "paths": {
        "/pet": {
            "put": {
                "operationId": "updatePet",
                "requestBody": {
                    "description": "Pet object that needs to be added to the store",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/Pet"
                            }
                        }
                    },
                    "required": true
                }
            },
            "post": {
                "operationId": "addPet",
                "requestBody": {
                    "description": "Pet object that needs to be added to the store",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/Pet"
                            }
                        }
                    },
                    "required": true
                }
            }
        },
        "/pet/findByStatus": {
            "get": {
                "description": "Multiple status values can be provided with comma separated strings",
                "operationId": "findPetsByStatus",
                "parameters": [
                    {
                        "name": "status",
                        "in": "query",
                        "description": "Status values that need to be considered for filter",
                        "required": true,
                        "style": "form",
                        "explode": true,
                        "schema": {
                            "type": "array",
                            "items": {
                                "type": "string",
                                "default": "available",
                                "enum": [
                                    "available",
                                    "pending",
                                    "sold"
                                ]
                            }
                        }
                    }
                ],
                "responses": {
                    "200": {
                        "description": "successful operation",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "array",
                                    "items": {
                                        "$ref": "#/components/schemas/Pet"
                                    }
                                }
                            }
                        }
                    },
                    "400": {
                        "description": "Invalid status value",
                        "content": {}
                    }
                }
            }
        }
    },
    "components": {
        "schemas": {
            "Category": {
                "type": "object",
                "properties": {
                    "id": {
                        "type": "integer",
                        "format": "int64"
                    },
                    "name": {
                        "type": "string"
                    }
                }
            },
            "Tag": {
                "type": "object",
                "properties": {
                    "id": {
                        "type": "integer",
                        "format": "int64"
                    },
                    "name": {
                        "type": "string"
                    }
                }
            },
            "Pet": {
                "required": [
                    "name",
                    "photoUrls"
                ],
                "type": "object",
                "properties": {
                    "id": {
                        "type": "integer",
                        "format": "int64"
                    },
                    "category": {
                        "$ref": "#/components/schemas/Category"
                    },
                    "name": {
                        "type": "string",
                        "example": "doggie"
                    },
                    "photoUrls": {
                        "type": "array",
                        "xml": {
                            "name": "photoUrl",
                            "wrapped": true
                        },
                        "items": {
                            "type": "string"
                        }
                    },
                    "tags": {
                        "type": "array",
                        "xml": {
                            "name": "tag",
                            "wrapped": true
                        },
                        "items": {
                            "$ref": "#/components/schemas/Tag"
                        }
                    },
                    "status": {
                        "type": "string",
                        "description": "pet status in the store",
                        "enum": [
                            "available",
                            "pending",
                            "sold"
                        ]
                    }
                }
            },
            "ApiResponse": {
                "type": "object",
                "properties": {
                    "code": {
                        "type": "integer",
                        "format": "int32"
                    },
                    "type": {
                        "type": "string"
                    },
                    "message": {
                        "type": "string"
                    }
                }
            }
        }
    }
}

const mockTpl = jest.fn();

jest.mock('@chillapi/template', () => {
    return { executeTemplateIfTargetNotEditedByUser: (fPath: string, tpl: string, args: any) => mockTpl(fPath, tpl, args) }
});

test('generates stubs', async () => {
    mockTpl.mockClear();
    await generateStubs(api, "a/path/");
    expect(mockTpl.mock.calls).toEqual([
        [resolve('a/path/', 'pet', 'put.yaml'), 'update-entity.yaml', { path: '/pet', payload: '' }],
        [resolve('a/path/', 'pet', 'post.yaml'), 'add-entity.yaml', { path: '/pet', payload: '' }],
        [resolve('a/path/', 'pet/findByStatus', 'get.yaml'), 'get-entity-list.yaml', expect.anything()]
    ]);
});