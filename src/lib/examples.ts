export interface Example {
	name: string;
	description: string;
	content: string;
}

export const examples: Example[] = [
	{
		name: 'Simple: User + Address',
		description: 'Two records with a nested relationship',
		content: JSON.stringify(
			{
				type: 'record',
				name: 'User',
				namespace: 'com.example',
				doc: 'A user in the system',
				fields: [
					{ name: 'id', type: 'long', doc: 'Unique identifier' },
					{ name: 'name', type: 'string' },
					{ name: 'email', type: ['null', 'string'], default: null },
					{
						name: 'address',
						type: {
							type: 'record',
							name: 'Address',
							fields: [
								{ name: 'street', type: 'string' },
								{ name: 'city', type: 'string' },
								{ name: 'state', type: 'string' },
								{ name: 'zip', type: 'string' }
							]
						}
					},
					{
						name: 'status',
						type: {
							type: 'enum',
							name: 'UserStatus',
							symbols: ['ACTIVE', 'INACTIVE', 'SUSPENDED']
						}
					}
				]
			},
			null,
			2
		)
	},
	{
		name: 'E-commerce',
		description: 'User, Order, OrderItem, Product, Category with joins',
		content: JSON.stringify(
			[
				{
					type: 'record',
					name: 'User',
					namespace: 'com.shop',
					fields: [
						{ name: 'id', type: 'long' },
						{ name: 'username', type: 'string' },
						{ name: 'email', type: 'string' },
						{ name: 'created_at', type: 'long', doc: 'Epoch millis' }
					]
				},
				{
					type: 'record',
					name: 'Category',
					namespace: 'com.shop',
					fields: [
						{ name: 'id', type: 'long' },
						{ name: 'name', type: 'string' },
						{ name: 'parent_id', type: ['null', 'long'], default: null, doc: 'Self-referencing parent category' }
					]
				},
				{
					type: 'record',
					name: 'Product',
					namespace: 'com.shop',
					fields: [
						{ name: 'id', type: 'long' },
						{ name: 'name', type: 'string' },
						{ name: 'description', type: ['null', 'string'], default: null },
						{ name: 'price_cents', type: 'long' },
						{
							name: 'category_id',
							type: 'long',
							join: { schema: 'com.shop.Category', field: 'id', cardinality: 'N:1' }
						},
						{
							name: 'status',
							type: {
								type: 'enum',
								name: 'ProductStatus',
								symbols: ['DRAFT', 'ACTIVE', 'DISCONTINUED']
							}
						}
					]
				},
				{
					type: 'record',
					name: 'Order',
					namespace: 'com.shop',
					fields: [
						{ name: 'id', type: 'long' },
						{
							name: 'user_id',
							type: 'long',
							join: { schema: 'com.shop.User', field: 'id', cardinality: 'N:1' }
						},
						{
							name: 'status',
							type: {
								type: 'enum',
								name: 'OrderStatus',
								symbols: ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']
							}
						},
						{ name: 'total_cents', type: 'long' },
						{ name: 'created_at', type: 'long' }
					]
				},
				{
					type: 'record',
					name: 'OrderItem',
					namespace: 'com.shop',
					fields: [
						{ name: 'id', type: 'long' },
						{
							name: 'order_id',
							type: 'long',
							join: { schema: 'com.shop.Order', field: 'id', cardinality: 'N:1' }
						},
						{
							name: 'product_id',
							type: 'long',
							join: { schema: 'com.shop.Product', field: 'id', cardinality: 'N:1' }
						},
						{ name: 'quantity', type: 'int' },
						{ name: 'unit_price_cents', type: 'long' }
					]
				}
			],
			null,
			2
		)
	},
	{
		name: 'Event-driven',
		description: 'Event envelope with multiple event types and unions',
		content: JSON.stringify(
			[
				{
					type: 'enum',
					name: 'EventType',
					namespace: 'com.events',
					symbols: ['USER_CREATED', 'USER_UPDATED', 'ORDER_PLACED', 'ORDER_SHIPPED', 'PAYMENT_RECEIVED']
				},
				{
					type: 'record',
					name: 'UserCreatedPayload',
					namespace: 'com.events',
					fields: [
						{ name: 'user_id', type: 'long' },
						{ name: 'username', type: 'string' },
						{ name: 'email', type: 'string' }
					]
				},
				{
					type: 'record',
					name: 'OrderPlacedPayload',
					namespace: 'com.events',
					fields: [
						{ name: 'order_id', type: 'long' },
						{ name: 'user_id', type: 'long' },
						{ name: 'item_count', type: 'int' },
						{ name: 'total_cents', type: 'long' }
					]
				},
				{
					type: 'record',
					name: 'PaymentReceivedPayload',
					namespace: 'com.events',
					fields: [
						{ name: 'payment_id', type: 'long' },
						{ name: 'order_id', type: 'long' },
						{ name: 'amount_cents', type: 'long' },
						{
							name: 'method',
							type: {
								type: 'enum',
								name: 'PaymentMethod',
								symbols: ['CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CRYPTO']
							}
						}
					]
				},
				{
					type: 'record',
					name: 'EventEnvelope',
					namespace: 'com.events',
					doc: 'Wrapper for all domain events',
					fields: [
						{ name: 'event_id', type: 'string', doc: 'UUID' },
						{ name: 'event_type', type: 'com.events.EventType' },
						{ name: 'timestamp', type: 'long' },
						{ name: 'source', type: 'string' },
						{
							name: 'payload',
							type: [
								'com.events.UserCreatedPayload',
								'com.events.OrderPlacedPayload',
								'com.events.PaymentReceivedPayload'
							],
							doc: 'The event payload, discriminated by event_type'
						},
						{
							name: 'metadata',
							type: { type: 'map', values: 'string' },
							default: {}
						}
					]
				}
			],
			null,
			2
		)
	},
	{
		name: 'Avro IDL Example',
		description: 'Protocol definition using Avro IDL syntax',
		content: `protocol UserService {

  enum UserStatus {
    ACTIVE, INACTIVE, SUSPENDED
  }

  record Address {
    string street;
    string city;
    string state;
    string zip;
    union { null, string } country = null;
  }

  record User {
    long id;
    string username;
    string email;
    union { null, Address } address = null;
    UserStatus status;
    array<string> tags;
    long created_at;
  }

  record UserEvent {
    string event_id;
    long user_id;
    string action;
    long timestamp;
    map<string> properties;
  }

}`
	}
];
