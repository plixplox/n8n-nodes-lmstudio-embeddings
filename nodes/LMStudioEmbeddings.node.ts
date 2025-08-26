// From nodes/LMStudioEmbeddings.node.ts
import {
    ILoadOptionsFunctions,
    INodePropertyOptions,
    INodeType,
    INodeTypeDescription,
    ISupplyDataFunctions,
    NodeConnectionType,
    SupplyData,
} from 'n8n-workflow';
import { OpenAIEmbeddings } from "@langchain/openai";

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
		// Создаем объект с методом embedQuery для vector store
		const embeddingProvider = {
			embedQuery: async (text: string): Promise<number[]> => {
				const credentials = await this.getCredentials('lmStudioApi');
				const model = this.getNodeParameter('model', itemIndex) as string;
				const encodingFormat = this.getNodeParameter('encodingFormat', itemIndex) as 'float' | 'base64';


				if (!text || !text.trim()) {
					throw new Error('Text content is empty');
				}

                const embeddings = new OpenAIEmbeddings({
                    configuration: {
                        baseURL: credentials.baseUrl as string,
                    },
                    apiKey: credentials.apiKey as string,
                    model: model,
                });

                // @ts-ignore
                const { data } = await embeddings.embeddingWithRetry({
                    model: model,
                    input: text,
                    encoding_format: encodingFormat,
                });

                return data[0].embedding;
			},
            embedDocuments: async (texts: string[]): Promise<number[][]> => {
                const credentials = await this.getCredentials('lmStudioApi');
                const model = this.getNodeParameter('model', itemIndex) as string;
                const encodingFormat = this.getNodeParameter('encodingFormat', itemIndex) as 'float' | 'base64';

                const allEmbeddings: number[][] = [];

                for (const text of texts) {
                    if (!text || !text.trim()) {
                        console.warn('Skipping empty text content');
                        continue;
                    }

                    const embeddings = new OpenAIEmbeddings({
                        configuration: {
                            baseURL: credentials.baseUrl as string,
                        },
                        apiKey: credentials.apiKey as string,
                        model: model,
                    });

                    // @ts-ignore
                    const { data } = await embeddings.embeddingWithRetry({
                        model: model,
                        input: text,
                        encoding_format: encodingFormat,
                    });

                    allEmbeddings.push(data[0].embedding);
                }

                return allEmbeddings;
            }
		};

		return {
			response: embeddingProvider,
		};
	}
}
