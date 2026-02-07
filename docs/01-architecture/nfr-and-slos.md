# Non-Functional Requirements and SLOs

## Purpose

Define measurable reliability, performance, security, and quality targets that engineering must meet.

## Availability and Reliability

- API availability target: `99.9%` monthly at GA.
- Critical background job success target: `99.5%` monthly.
- Webhook ingestion success target: `99.9%` with replay recovery.

## Performance Targets

- Core read P95 latency: `< 400ms`.
- Core write P95 latency: `< 700ms`.
- Retrieval query P95 latency: `< 1.2s`.
- Agent run non-tool median completion: `< 8s`.

## Scalability Targets (Initial Envelope)

- Concurrent active users per workspace: baseline `100+`.
- Tenant count: baseline `500+` without architectural decomposition.
- Background pipeline throughput: sized for peak daily ingestion windows.

## Security Targets

- Zero unresolved critical vulnerabilities at release.
- 100% signature validation on webhook endpoints.
- 100% authorization check coverage for tenant resources.

## Quality Targets

- Unit + integration coverage required on changed modules.
- End-to-end regression suite on critical flows before release.
- AI structured output conformance `>= 99%`.

## Observability Targets

- 100% request trace correlation in APIs.
- Error rate alerts for all critical endpoints.
- Dashboard visibility for p50/p95 latency and failure rates.

## SLO Review Process

- Weekly review in quality/ops meeting.
- Breaches trigger investigation and reliability backlog item.
- Repeat breaches trigger architecture escalation.

