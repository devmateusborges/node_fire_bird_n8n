import { IExecuteFunctions, INodeType, INodeTypeDescription, ICredentialDataDecryptedObject, IDataObject } from 'n8n-workflow';
import Firebird from 'node-firebird';

interface IFirebirdCredentials extends ICredentialDataDecryptedObject {
	host: string;
	port: number; // Adicione a propriedade port
	database: string;
	user: string;
	password: string;
}

export class FirebirdConnector implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Firebird Connector',
		name: 'firebirdConnector',
		icon: 'file:firebird.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Connect and query Firebird databases',
		defaults: {
			name: 'Firebird Connector',
		},
		inputs: [
		
		],
		outputs: [],
		credentials: [
			{
				name: 'firebirdApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Query',
						value: 'query',
					},
				],
				default: 'query',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['query'],
					},
				},
				options: [
					{
						name: 'Execute',
						value: 'execute',
						action: 'Execute a Firebird SQL query',
						description: 'Run a custom SQL query on the Firebird database',
					},
				],
				default: 'execute',
			},
			{
				displayName: 'SQL Query',
				description: 'Enter the SQL query to execute',
				required: true,
				name: 'sqlQuery',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['query'],
						operation: ['execute'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		const returnData = [];
		const credentials = this.getCredentials('firebirdApi') as unknown as IFirebirdCredentials; // Cast para o tipo correto
		if (!credentials) {
			throw new Error('No credentials returned!');
		}

		const options = {
			host: credentials.host,
			port: credentials.port,
			database: credentials.database,
			user: credentials.user,
			password: credentials.password,
		};

		for (let i = 0; i < items.length; i++) {
			try {
				const sqlQuery = this.getNodeParameter('sqlQuery', i) as string;
				const connection = await new Promise<Firebird.Database>((resolve, reject) => {
					Firebird.attach(options, (err, conn) => {
						if (err) {
							reject(err);
						} else {
							resolve(conn);
						}
					});
				});

				const result = await new Promise((resolve, reject) => {
					connection.query(sqlQuery, [], (err, res) => {
						if (err) {
							reject(err);
						} else {
							resolve(res);
						}
					});
				});

				returnData.push({ json: result as IDataObject });
				connection.detach(); // Fecha a conexão após a execução
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message } });
				} else {
					throw error;
				}
			}
		}

		return this.prepareOutputData(returnData);
	}
}
