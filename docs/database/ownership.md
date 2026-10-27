# Database ownership

| Service | SQL Server database |
| --- | --- |
| identity-service | IdentityDb |
| poi-service | PoiDb |
| content-service | ContentDb |
| translation-service | TranslationDb |
| location-service | LocationDb |
| navigation-service | NavigationDb |
| monitoring-service | MonitoringDb |
| audit-service | AuditDb |

Use separate credentials per service. Do not share ORM entities or query another service's database.
MonitoringDb stores business usage aggregates and alert configuration; metrics, logs and traces belong in observability stores.