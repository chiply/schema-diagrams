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
		name: 'Deeply Nested: Company Org',
		description: 'Four levels of inline record nesting with name reuse and arrays',
		content: JSON.stringify(
			{
				type: 'record',
				name: 'Company',
				namespace: 'com.org',
				doc: 'A company with deeply nested organizational structure',
				fields: [
					{ name: 'id', type: 'long', doc: 'Unique identifier' },
					{ name: 'name', type: 'string' },
					{ name: 'founded_year', type: 'int' },
					{
						name: 'headquarters',
						type: {
							type: 'record',
							name: 'Address',
							fields: [
								{ name: 'street', type: 'string' },
								{ name: 'city', type: 'string' },
								{ name: 'state', type: 'string' },
								{ name: 'zip', type: 'string' },
								{ name: 'country', type: 'string' }
							]
						}
					},
					{
						name: 'departments',
						type: {
							type: 'array',
							items: {
								type: 'record',
								name: 'Department',
								fields: [
									{ name: 'name', type: 'string' },
									{ name: 'budget', type: 'long', doc: 'Annual budget in cents' },
									{
										name: 'lead',
										type: {
											type: 'record',
											name: 'Employee',
											fields: [
												{ name: 'id', type: 'long' },
												{ name: 'name', type: 'string' },
												{ name: 'title', type: 'string' },
												{
													name: 'employment_type',
													type: {
														type: 'enum',
														name: 'EmploymentType',
														symbols: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']
													}
												},
												{
													name: 'contact',
													type: {
														type: 'record',
														name: 'ContactInfo',
														fields: [
															{ name: 'email', type: 'string' },
															{ name: 'phone', type: ['null', 'string'], default: null },
															{ name: 'slack_handle', type: ['null', 'string'], default: null }
														]
													}
												}
											]
										}
									},
									{
										name: 'location',
										type: 'Address'
									}
								]
							}
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
		name: 'Avro IDL: Simple',
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
    @join(schema="UserService.User", field="id", cardinality="N:1")
    long user_id;
    string action;
    long timestamp;
    map<string> properties;
  }

}`
	},
	{
		name: 'Avro IDL: Healthcare',
		description: 'Patient records, encounters, and clinical observations',
		content: `protocol ClinicalDataPlatform {

  enum Gender {
    MALE, FEMALE, OTHER, UNKNOWN
  }

  enum EncounterStatus {
    PLANNED, IN_PROGRESS, COMPLETED, CANCELLED
  }

  enum ObservationCategory {
    VITAL_SIGNS, LABORATORY, IMAGING, PROCEDURE, SURVEY
  }

  record Identifier {
    string system;
    string value;
  }

  record ContactInfo {
    union { null, string } phone = null;
    union { null, string } email = null;
    string address_line;
    string city;
    string state;
    string postal_code;
    string country;
  }

  record Practitioner {
    long id;
    Identifier npi;
    string given_name;
    string family_name;
    string specialty;
    union { null, ContactInfo } contact = null;
    boolean active;
  }

  record Patient {
    long id;
    Identifier mrn;
    string given_name;
    string family_name;
    union { null, string } date_of_birth = null;
    Gender gender;
    ContactInfo contact;
    Practitioner primary_care_provider;
    array<string> allergies;
    boolean active;
  }

  record Facility {
    long id;
    string name;
    string facility_type;
    ContactInfo address;
  }

  record Encounter {
    long id;
    Patient patient;
    Practitioner attending;
    Facility facility;
    EncounterStatus status;
    string encounter_type;
    long admitted_at;
    union { null, long } discharged_at = null;
    union { null, string } chief_complaint = null;
    array<string> diagnosis_codes;
  }

  record Observation {
    long id;
    Encounter encounter;
    ObservationCategory category;
    string code;
    string display_name;
    union { null, string } value_string = null;
    union { null, double } value_numeric = null;
    union { null, string } unit = null;
    union { null, string } interpretation = null;
    long effective_at;
    Practitioner recorded_by;
  }

  record MedicationOrder {
    long id;
    Encounter encounter;
    Patient patient;
    Practitioner prescriber;
    string medication_code;
    string medication_name;
    string dosage;
    string route;
    string frequency;
    long prescribed_at;
    union { null, long } discontinued_at = null;
  }

}`
	},
	{
		name: 'Avro IDL: FinTech Platform',
		description: 'Multi-domain financial services with accounts, transactions, KYC, and risk',
		content: `protocol FinancialServicesPlatform {

  // ─── Identity & KYC ───

  enum KycStatus {
    NOT_STARTED, PENDING_REVIEW, APPROVED, REJECTED, EXPIRED
  }

  enum RiskTier {
    LOW, MEDIUM, HIGH, CRITICAL
  }

  enum AccountType {
    CHECKING, SAVINGS, BROKERAGE, CREDIT, LOAN
  }

  enum AccountStatus {
    PENDING_ACTIVATION, ACTIVE, FROZEN, CLOSED
  }

  enum TransactionStatus {
    PENDING, PROCESSING, COMPLETED, FAILED, REVERSED
  }

  enum TransactionType {
    DEPOSIT, WITHDRAWAL, TRANSFER, PAYMENT,
    FEE, INTEREST, ADJUSTMENT, REFUND
  }

  enum Currency {
    USD, EUR, GBP, JPY, CAD, AUD, CHF
  }

  record Address {
    string line1;
    union { null, string } line2 = null;
    string city;
    string region;
    string postal_code;
    string country_code;
  }

  record KycDocument {
    string document_type;
    string document_number;
    string issuing_country;
    long issued_at;
    union { null, long } expires_at = null;
    boolean verified;
  }

  // ─── Core Entities ───

  record Customer {
    long id;
    string external_id;
    string given_name;
    string family_name;
    string email;
    union { null, string } phone = null;
    Address legal_address;
    union { null, Address } mailing_address = null;
    string tax_id_hash;
    KycStatus kyc_status;
    array<KycDocument> kyc_documents;
    RiskTier risk_tier;
    long onboarded_at;
    map<string> metadata;
  }

  record Account {
    long id;
    string account_number;
    Customer owner;
    AccountType account_type;
    AccountStatus status;
    Currency currency;
    long balance_minor_units;
    long available_balance_minor_units;
    union { null, long } credit_limit_minor_units = null;
    union { null, double } interest_rate_bps = null;
    long opened_at;
    union { null, long } closed_at = null;
  }

  // ─── Transactions ───

  record MonetaryAmount {
    long minor_units;
    Currency currency;
  }

  record Counterparty {
    union { null, Account } internal_account = null;
    union { null, string } external_institution = null;
    union { null, string } external_account_ref = null;
    string display_name;
  }

  record Transaction {
    long id;
    string idempotency_key;
    Account source_account;
    Counterparty counterparty;
    TransactionType transaction_type;
    TransactionStatus status;
    MonetaryAmount amount;
    union { null, MonetaryAmount } fee = null;
    MonetaryAmount running_balance;
    union { null, string } description = null;
    string reference_number;
    long initiated_at;
    union { null, long } settled_at = null;
    map<string> metadata;
  }

  // ─── Compliance & Risk ───

  record RiskAssessment {
    long id;
    Customer customer;
    RiskTier previous_tier;
    RiskTier assessed_tier;
    double risk_score;
    array<string> risk_factors;
    string assessed_by;
    long assessed_at;
    union { null, string } notes = null;
  }

  record AuditEntry {
    string entry_id;
    string entity_type;
    string entity_id;
    string action;
    string actor_id;
    string actor_type;
    long timestamp;
    union { null, string } ip_address = null;
    map<string> changed_fields;
    map<string> context;
  }

}`
	}
];
