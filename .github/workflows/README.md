# Planned CI/CD workflows

- pull-request.yml: lint, typecheck, test and build affected projects.
- services-ci.yml and frontend-ci.yml: validate changed applications and their dependents.
- publish-images.yml: build Docker images tagged with commit SHA and push to registry.
- deploy-staging.yml: compatible migrations, deployment and smoke tests.
- deploy-production.yml: deployment, health verification and application rollback.

Workflow YAML will be added after runnable applications, test commands and deployment targets are configured.