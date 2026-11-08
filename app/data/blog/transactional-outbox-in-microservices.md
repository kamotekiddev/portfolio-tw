---json
{
  "title": "Transactional Outbox: Reliable Events Between Microservices",
  "slug": "transactional-outbox-in-microservices",
  "summary": "How the transactional outbox closes the gap between saving data and publishing events, with a PostgreSQL example and the failure cases that still matter.",
  "publishedAt": "2024-06-18",
  "status": "published",
  "topics": ["Microservices", "Distributed Systems", "Database Transactions"]
}
---

An order service saves a customer's order, then publishes an `OrderCreated` event so other services can react. What happens if the process crashes between those two steps?

The order exists, but the notification never leaves. Retrying the HTTP request might create another order instead of recovering the missing event. This is the dual-write problem: one business operation writes to a database and a message broker, with no shared transaction protecting both writes. [AWS describes both failure directions in its transactional outbox guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html).

The transactional outbox addresses this by saving the business change and a message describing it in the same database transaction. A separate relay publishes that saved message later.

## Why changing the order of operations does not help

Publishing first simply reverses the risk. The broker can accept `OrderCreated`, then the database transaction can fail. Consumers now react to an order that never committed.

Putting the publish call inside a database transaction does not make the broker part of that transaction. Rolling back PostgreSQL cannot recall a message already accepted elsewhere. The [transactional outbox pattern description](https://microservices.io/patterns/data/transactional-outbox.html) explains why publishing either before or after commit leaves a failure window.

The useful boundary is local: commit the order and the intent to publish together.

## Save the message alongside the order

Here is a simplified PostgreSQL example for a hypothetical order service. It illustrates the write boundary; it is not a complete application or a recorded production implementation.

```sql
CREATE TABLE orders (
    id uuid PRIMARY KEY,
    customer_id uuid NOT NULL,
    status text NOT NULL
);

CREATE TABLE outbox_events (
    id uuid PRIMARY KEY,
    aggregate_id uuid NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz
);

BEGIN;

INSERT INTO orders (id, customer_id, status)
VALUES (
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    'pending'
);

INSERT INTO outbox_events (id, aggregate_id, event_type, payload)
VALUES (
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    'OrderCreated',
    '{"orderId":"11111111-1111-4111-8111-111111111111","status":"pending"}'::jsonb
);

COMMIT;
```

After a successful commit, both rows exist. If either insert fails and the transaction rolls back, neither row survives. A crash after commit leaves the event available for a relay to discover.

The event ID identifies this particular message. The aggregate ID identifies the business entity, in this case the order. In an application, generate fresh IDs rather than reusing these example constants. Keep the event ID stable across publication retries.

The resulting flow is:

```text
Order request
    |
    v
Database transaction: order + outbox event
    |
    v
Committed outbox -> relay -> broker -> consumer services
```

The HTTP response can mean “the order was saved.” It does not mean every consumer has finished processing it.

## The relay turns durable intent into delivery

There are two common relay approaches:

- A polling worker queries unpublished rows, sends them to the broker, and records successful publication after broker acknowledgement. It needs a safe claim or locking strategy when several workers run.
- Change data capture, or CDC, follows committed changes in the database log. Debezium can capture outbox inserts and route them into events, avoiding repeated queries for pending rows.

[Debezium's explanation of the outbox pattern](https://debezium.io/blog/2019/02/19/reliable-microservices-data-exchange-with-the-outbox-pattern/) demonstrates CDC-based delivery and the separation between local writes and asynchronous propagation. Polling requires worker coordination and query tuning; CDC adds connector, offset, and database-log operations. Choose based on what the team can maintain.

If the broker is unavailable, committed messages can wait for recovery. Eventual delivery still depends on a functioning relay, retries, and retained data. Watch backlog growth: the database is absorbing work the broker cannot currently accept.

## Duplicate delivery is still possible

Consider this relay failure:

1. The broker accepts an event.
2. The relay crashes before recording publication.
3. After restart, the relay sends the same event again.

Marking the row published before sending would risk losing the event instead. A reliable design therefore expects retries and duplicates rather than assuming end-to-end exactly-once processing. This crash window is an explicit limitation in the [original pattern description](https://microservices.io/patterns/data/transactional-outbox.html).

A consumer should make repeated processing safe. One approach is a table with a unique key on `(consumer_name, event_id)`. Within one consumer database transaction, insert that key and apply the local business change. If the key already exists, skip the change. Commit before acknowledging the broker message.

For example, a hypothetical inventory consumer receiving the same event twice should create one reservation. The deduplication marker and reservation must commit together; recording the marker separately could suppress a retry after the reservation failed. A payment API call cannot be made atomic by that local transaction, so external effects need their own strategy, such as a provider-supported idempotency key.

## Ordering needs an explicit design

For a single order, `OrderCreated` should precede `OrderCancelled`. Several relay workers can reorder events even if each row has a timestamp. Sorting by `created_at` alone does not establish transaction commit order under concurrency.

Define the ordering boundary, usually one business entity. Coordinate publication within that boundary, use entity versions where needed, and preserve the order through broker partitioning and consumer processing. Debezium's outbox example uses the aggregate ID as the Kafka message key to keep related events in the same partition. That routing choice cannot repair events already published in the wrong order. [See the Debezium example's event structure and routing discussion](https://debezium.io/blog/2019/02/19/reliable-microservices-data-exchange-with-the-outbox-pattern/).

## Where it helps in a microservice architecture

The outbox fits workflows where one service owns a database change and other services react asynchronously: updating a search index after a product change, preparing a shipment after an order, or maintaining a reporting view.

It lets the owning service commit without waiting for every downstream service. The tradeoff is eventual consistency: those services can temporarily disagree. A user interface may need to show “processing” while dependent work catches up. AWS also points to sagas when a business workflow spans updates across service databases; an outbox alone does not make those updates one atomic transaction. [See AWS's consistency considerations](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html).

## What to verify before relying on it

For the illustrative order workflow, useful failure checks are:

- Force the outbox insert to fail: the order must roll back too.
- Stop the broker after the database commit: the event must remain recoverable.
- Crash the relay after acknowledgement: a retry must not duplicate the consumer's business effect.
- Publish successive changes for one order under concurrency: verify their required order.

These are proposed checks, not results from running the sample. In operation, monitor the age of the oldest pending event, retry counts, and consumer lag. Define retention and cleanup rules so unpublished events cannot disappear during maintenance.

Use an outbox when losing a notification would leave another service with incorrect state and asynchronous processing fits the workflow. For work that stays entirely inside one database transaction, adding a broker and relay may introduce more machinery than the problem needs.
