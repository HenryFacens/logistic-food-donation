# Local emulator decisions

Verified on 2026-10-16 against official documentation and container manifests.

## Pinned images

- Azure Functions Node 20: `mcr.microsoft.com/azure-functions/node:4-node20`
- Service Bus emulator: `mcr.microsoft.com/azure-messaging/servicebus-emulator:2.0.1`
- SQL Server dependency: `mcr.microsoft.com/mssql/server:2022-CU22-GDR1-ubuntu-22.04`
- Azurite: `mcr.microsoft.com/azure-storage/azurite:3.37.0`
- PostgreSQL/PostGIS: `postgis/postgis:17-3.5`
- Node utility images: `node:20.19-alpine`
- Gateway: `nginx:1.29-alpine`

## Service Bus emulator boundaries

The emulator requires a SQL Server Linux container and a configuration file
mounted before startup. Its management health endpoint is on port 5300.

The emulator is for development and sequential testing. State and entities do
not persist across container restarts. It supports AMQP over TCP, but not AMQP
WebSockets, partitioned entities, Entra ID integration, autoscale, disaster
recovery, large messages, or production observability/SLA.

Resgata therefore treats PostgreSQL scheduling as the deterministic timeout
implementation even when messages use the Service Bus driver. The `pg` queue
driver remains a full functional mode for ARM64 and constrained machines.

## Architecture consequences

- `servicebus` and `mssql` stay under the `azure` Compose profile.
- `make lite` disables that profile and sets `QUEUE_DRIVER=pg`.
- No test assumes persistence inside the Service Bus emulator.
- Emulator differences must remain in the root README Known Gaps.

## Sources

- https://learn.microsoft.com/azure/service-bus-messaging/overview-emulator
- https://learn.microsoft.com/azure/service-bus-messaging/test-locally-with-service-bus-emulator
- https://learn.microsoft.com/azure/azure-functions/container-concepts
- https://learn.microsoft.com/azure/storage/common/storage-install-azurite
- https://github.com/Azure/azure-service-bus-emulator-installer
- https://github.com/Azure/Azurite
- https://github.com/postgis/docker-postgis
