import {
    ILoadOptionsFunctions,
    INodePropertyOptions,
    INodeType,
    INodeTypeDescription,
    ISupplyDataFunctions,
    NodeConnectionType,
    SupplyData,
} from 'n8n-workflow';

export class LMStudioEmbeddings implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'LM Studio Embeddings',
        name: 'lmStudioEmbeddings',
        icon: 'file:lmstudio.svg',
        group: ['transform'],
        version: 1,
        description: 'Generate embeddings using LM Studio API',
        defaults: {
            name: 'LM Studio Embeddings',
        },
        inputs: [],
        outputs: [NodeConnectionType.AiEmbedding],
        credentials: [
            {
                name: 'lmStudioApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Model',
                name: 'model',
                type: 'options',
                typeOptions: {
                    loadOptionsMethod: 'getModels',
                },
                default: '',
                description: 'The embedding model to use',
                required: true,
            },
            {
                displayName: 'Encoding Format',
                name: 'encodingFormat',
                type: 'options',
                options: [
                    {
                        name: 'Float',
                        value: 'float',
                        description: 'Return embeddings as floating point numbers',
                    },
                    {
                        name: 'Base64',
                        value: 'base64',
                        description: 'Return embeddings encoded as base64',
                    },
                ],
                default: 'float',
                description: 'The format for the embeddings',
            }
        ],
    };

    methods = {
        loadOptions: {
            async getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                const credentials = await this.getCredentials('lmStudioApi');

                try {
                    const response = await fetch(`${credentials.baseUrl}/models`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(credentials.apiKey && { Authorization: `Bearer ${credentials.apiKey}` }),
                        },
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
                    }

                    const result = await response.json() as { data?: Array<{ id: string }> };
                    const models = result.data || [];

                    return models.map((model) => ({
                        name: model.id,
                        value: model.id,
                    }));
                } catch (error) {
                    throw new Error(`Error fetching models from LM Studio: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            },
        },
    };

    async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
        const credentials = await this.getCredentials('lmStudioApi');
        const model = this.getNodeParameter('model', itemIndex) as string;
        const encodingFormat = this.getNodeParameter('encodingFormat', itemIndex) as 'float' | 'base64';

        if (!credentials.baseUrl) {
            throw new Error('No base URL provided in LM Studio API credentials');
        }

        const requestEmbeddings = async (input: string | string[]): Promise<any> => {
            const url = `${credentials.baseUrl}/embeddings`;
            const body = {
                model: model,
                input: input,
                encoding_format: encodingFormat,
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(credentials.apiKey && { Authorization: `Bearer ${credentials.apiKey}` }),
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error(`Embedding request failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            if (!result.data || !Array.isArray(result.data)) {
                throw new Error('Invalid response from LM Studio: missing data array');
            }
            return result;
        };

        const embeddingProvider = {
            embedQuery: async (text: string): Promise<number[]> => {
                if (!text || !text.trim()) {
                    throw new Error('Text content is empty');
                }
                const result = await requestEmbeddings(text);
                if (!result.data[0] || !result.data[0].embedding) {
                    throw new Error('Invalid embedding in response');
                }
                return result.data[0].embedding;
            },
        };

        return {
            response: embeddingProvider,
        };
    }
}