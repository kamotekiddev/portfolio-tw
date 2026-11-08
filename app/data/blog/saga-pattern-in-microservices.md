---json
{
  "title": "Saga Pattern: Coordinating Work Across Microservices",
  "slug": "saga-pattern-in-microservices",
  "summary": "How sagas coordinate local transactions across services, handle failures through compensation, and work alongside the transactional outbox.",
  "publishedAt": "2024-06-24",
  "status": "published",
  "topics": ["Microservices", "Distributed Systems", "Saga Pattern"]
}
---

An order can involve three different services: orders, inventory, and payments. Each owns its data. Saving the order is straightforward; keeping the whole purchase consistent when payment fails is harder.

A database rollback in the order service cannot release a reservation already committed by inventory. The saga pattern handles this kind of workflow as a sequence of local transactions, with explicit recovery actions for completed steps. [Chris Richardson's saga pattern description](https://microservices.io/patterns/data/saga.html) explains this approach for operations spanning service-owned databases.

## One business operation, several local commits

Consider a hypothetical checkout workflow:

```text
Create pending order
    -> Reserve inventory
    -> Authorize payment
    -> Confirm order
```

Each step commits within its own service. The complete purchase is therefore a business workflow, rather than one database transaction spanning every participant.

If payment is declined, the workflow can release the inventory reservation and cancel the pending order. Those are new transactions. The earlier changes have already committed and may have been observed by other services.

This distinction matters to the customer experience. While the saga runs, the order can be `pending`; confirmation should represent the completed business outcome, rather than merely an accepted request.

## Compensation follows business rules

A compensating action counteracts an earlier business effect. In this checkout example:

- Creating a pending order is compensated by cancelling it.
- Reserving inventory is compensated by releasing that reservation.
- Authorizing payment is compensated by voiding the authorization, subject to the payment provider's rules.

A refund after capture is a different operation from voiding an authorization. Sending a correction email also cannot make a previous email unread. Design the workflow around the effects that can actually be reversed or repaired.

Compensation does not necessarily restore the exact old database state. Overwriting inventory with an earlier stock count could erase legitimate purchases made meanwhile. Release the particular reservation instead. Microsoft's [compensating transaction guidance](https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction) emphasizes business-specific recovery and accounting for concurrent changes.

Compensation can fail too. If the inventory service is unreachable when a release is requested, retain that recovery task, retry safely, and expose it for investigation when it remains stuck. Distinguish cancellation requested from cancellation complete so unresolved recovery work remains visible.

## Choreography: services react to events

With choreography, participants react to events without a central workflow controller. An illustrative flow is:

```text
Orders:    OrderCreated
Inventory:   -> reserve stock -> InventoryReserved
Payments:                          -> authorize -> PaymentAuthorized
Orders:                                               -> confirm
```

Failure events need handlers as well. A payment rejection might trigger inventory release, followed by cancellation once recovery is complete. Define who owns each transition and how late or duplicate events are handled.

Choreography can fit a small workflow with clear event ownership. As branches grow, discovering the full business process requires following handlers across services. Adding a subscriber can also change behavior that is difficult to see from any one service. [Microsoft's saga guide](https://learn.microsoft.com/en-us/azure/architecture/patterns/saga) compares this approach with orchestration.

## Orchestration: one coordinator records progress

With orchestration, a coordinator tells participants which operation to perform and records their replies. Inventory and payment services still own their business rules and databases; the coordinator owns workflow progress.

For the same checkout, a possible state progression is:

```text
PENDING -> RESERVING -> AUTHORIZING -> CONFIRMING -> COMPLETED
                            |
                     payment declined
                            v
                       RELEASING -> CANCELLING -> CANCELLED
```

Persist the current state, operation identities, and pending work. An in-memory sequence of HTTP calls with a `try/catch` cannot resume reliably after a process crash.

Here is a simplified TypeScript transition function for the payment-decline branch. It computes the next decision only; it does not implement persistence or transport.

```ts
type State = "AUTHORIZING" | "RELEASING" | "CANCELLING" | "CANCELLED";
type SagaEvent = "PaymentDeclined" | "InventoryReleased" | "OrderCancelled";
type Command = "ReleaseInventory" | "CancelOrder";

type Decision = { state: State; command?: Command };

function decide(state: State, event: SagaEvent): Decision {
  if (state === "AUTHORIZING" && event === "PaymentDeclined") {
    return { state: "RELEASING", command: "ReleaseInventory" };
  }
  if (state === "RELEASING" && event === "InventoryReleased") {
    return { state: "CANCELLING", command: "CancelOrder" };
  }
  if (state === "CANCELLING" && event === "OrderCancelled") {
    return { state: "CANCELLED" };
  }
  return { state };
}
```

For `AUTHORIZING` plus `PaymentDeclined`, the function returns a `RELEASING` decision with a `ReleaseInventory` command. The calling handler must persist that state and the intent to send the command atomically. Cancellation is complete only after the relevant acknowledgements arrive.

A real handler must correlate replies to the correct saga and operation, validate transitions, and serialize concurrent updates, for example with optimistic version checks. Unexpected messages need an explicit policy and observability; the sample's unchanged-state fallback is not a complete error-handling strategy.

Orchestration makes the process easier to inspect in one place, but the coordinator becomes another durable service to operate. It should recover after restart and support multiple instances without conflicting decisions.

## A timeout does not prove failure

Suppose the payment service authorizes a payment, but its reply is lost. The coordinator sees a timeout. Treating that as a definite decline can release stock while an authorization remains active.

The workflow needs an explicit unknown-outcome path. Query operation status where supported, or retry using the same idempotency key under a defined participant contract. Reconcile late replies with any cancellation already underway. Do not generate a fresh payment operation ID every time a network request times out.

The durable record needs enough information to distinguish “not attempted,” “declined,” and “outcome unknown.”

## Sagas and transactional outboxes solve related problems

A saga decides which business step follows a result and which recovery actions are needed. An outbox makes a service's database change and intent to send a message atomic locally.

For example, the coordinator can save `RELEASING` and a `ReleaseInventory` command in one database transaction. A relay sends the command afterward. The inventory service can similarly save a release and its result event together.

The [transactional outbox article](/blog/transactional-outbox-in-microservices) covers that delivery boundary. An outbox supplies reliable message handoff; the saga supplies workflow coordination. Richardson's [saga description](https://microservices.io/patterns/data/saga.html) identifies reliable database updates and messaging as a separate requirement.

Retries mean participants must tolerate duplicates. Give each logical operation a stable identity and ensure its deduplication record commits atomically with its local effect. Repeated release commands should have the same effect as a single successful release.

## Concurrency still needs protection

Sagas do not provide global transaction isolation. Two checkouts can compete for the last item while both workflows are in progress. Inventory must enforce availability within its own atomic reservation operation; checking stock in the coordinator before sending a reservation command is insufficient.

Reservations, entity versions, and explicit pending states can help protect business invariants. Their details depend on the domain. If a reservation expires, define how that interacts with a delayed payment result instead of letting the two processes race without a recovery rule. The [saga pattern's isolation warning](https://microservices.io/patterns/data/saga.html) is a central design constraint.

## When a saga is useful

Sagas fit purchases, bookings, and provisioning flows that cross service boundaries and can tolerate intermediate states. They require meaningful compensation or forward recovery, durable progress tracking, and operational ownership. Microsoft's [saga guidance](https://learn.microsoft.com/en-us/azure/architecture/patterns/saga) also distinguishes reversible work from a point of no return, after which the workflow must complete through retryable steps.

Before relying on the illustrative checkout, test recovery after a coordinator restart, duplicate commands, a lost payment reply, a failed compensation, and two purchases competing for the last item. These are proposed verification scenarios, not recorded test results.

Track how long sagas remain pending, which recovery steps fail, and which operations need human reconciliation. Give clients a status endpoint or another way to learn the final outcome. When the entire business operation fits one service and database, a local transaction is usually simpler than introducing a distributed workflow.
