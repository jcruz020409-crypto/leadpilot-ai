# Security Checklist

Status: draft

## Secrets

- [ ] Keep API keys in environment variables or managed secret stores.
- [ ] Commit only `.env.example`, never `.env`.
- [ ] Redact secrets from logs, prompts, traces, and errors.
- [ ] Encrypt provider credential references at rest.

## Data Access

- [ ] Enforce workspace ownership on every query.
- [ ] Add database constraints for tenant-scoped uniqueness.
- [ ] Restrict service-role database access to server/worker code.
- [ ] Keep audit logs immutable from normal user flows.

## AI Safety

- [ ] Schema-validate all AI outputs.
- [ ] Run deterministic policy checks before proposal output is accepted.
- [ ] Require human approval before any future outbound send.
- [ ] Store prompt version and input hash for traceability.
- [ ] Avoid storing unnecessary PII in prompts and traces.
- [ ] Store only necessary company memory, decisions, and preferences.

## URL Analysis

- [ ] Reject localhost, private IPs, link-local IPs, and unsupported schemes.
- [ ] Limit redirects, response size, content types, and request duration.
- [ ] Fetch only user-submitted public websites and allowed public context.
- [ ] Do not bypass authentication, paywalls, robots restrictions, or rate
      limits.

## Future Email And Compliance

- [ ] Verify inbound webhook signatures.
- [ ] Check suppression list before every send.
- [ ] Support unsubscribe handling.
- [ ] Rate-limit sends per workspace and provider.
- [ ] Log approval, send, failure, unsubscribe, and override events.
