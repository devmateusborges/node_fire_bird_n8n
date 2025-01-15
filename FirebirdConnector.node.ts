import { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { createConnection } from 'node-firebird';

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
		inputs: ['main'],
		outputs: ['main'],
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
		const credentials = this.getCredentials('firebirdApi');
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
				const connection = await new Promise((resolve, reject) => {
					createConnection(options, (err, conn) => {
						if (err) {
							reject(err);
						} else {
							resolve(conn);
						}
					});
				});

				const result = await new Promise((resolve, reject) => {
					connection.query(sqlQuery, (err, res) => {
						if (err) {
							reject(err);
						} else {
							resolve(res);
						}
					});
				});

				returnData.push({ json: result });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
				} else {
					throw error;
				}
			}
		}

		return this.prepareOutputData(returnData);
	}
}
