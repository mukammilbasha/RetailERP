// ============================================================
// RetailERP — ASP.NET Core Health Check Registration
// Add to Program.cs: builder.Services.AddRetailERPHealthChecks(builder.Configuration);
//                    app.MapRetailERPHealthChecks();
// ============================================================
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Text.Json;

namespace RetailERP.Shared.HealthChecks;

public static class HealthCheckExtensions
{
    public static IHealthChecksBuilder AddRetailERPHealthChecks(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connStr = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required");

        return services
            .AddHealthChecks()
            // SQL Server connectivity (readiness-blocking)
            .AddSqlServer(
                connectionString: connStr,
                name: "sqlserver",
                failureStatus: HealthStatus.Unhealthy,
                tags: ["ready", "db"])
            // Redis connectivity
            .AddRedis(
                redisConnectionString: configuration.GetValue<string>("Redis:ConnectionString") ?? "localhost:6379",
                name: "redis",
                failureStatus: HealthStatus.Degraded,
                tags: ["ready", "cache"])
            // Disk space (warn if < 500MB free)
            .AddDiskStorageHealthCheck(
                setup: opts => opts.AddDrive("C:\\", minimumFreeMegabytes: 500),
                name: "disk",
                failureStatus: HealthStatus.Degraded,
                tags: ["live"])
            // Memory (warn if process > 500MB)
            .AddProcessAllocatedMemoryHealthCheck(
                maximumMegabytesAllocated: 500,
                name: "memory",
                failureStatus: HealthStatus.Degraded,
                tags: ["live"]);
    }

    public static WebApplication MapRetailERPHealthChecks(this WebApplication app)
    {
        // /health/live — Liveness probe: always returns 200 if process is running
        app.MapHealthChecks("/health/live", new HealthCheckOptions
        {
            Predicate = check => check.Tags.Contains("live"),
            ResponseWriter = WriteJsonResponse,
            ResultStatusCodes =
            {
                [HealthStatus.Healthy]   = StatusCodes.Status200OK,
                [HealthStatus.Degraded]  = StatusCodes.Status200OK,  // degraded is still live
                [HealthStatus.Unhealthy] = StatusCodes.Status503ServiceUnavailable,
            }
        });

        // /health/ready — Readiness probe: DB + Redis must be up
        app.MapHealthChecks("/health/ready", new HealthCheckOptions
        {
            Predicate = check => check.Tags.Contains("ready"),
            ResponseWriter = WriteJsonResponse,
            ResultStatusCodes =
            {
                [HealthStatus.Healthy]   = StatusCodes.Status200OK,
                [HealthStatus.Degraded]  = StatusCodes.Status200OK,
                [HealthStatus.Unhealthy] = StatusCodes.Status503ServiceUnavailable,
            }
        });

        // /health — Overall health (used by load balancer & smoke tests)
        app.MapHealthChecks("/health", new HealthCheckOptions
        {
            ResponseWriter = WriteJsonResponse,
            ResultStatusCodes =
            {
                [HealthStatus.Healthy]   = StatusCodes.Status200OK,
                [HealthStatus.Degraded]  = StatusCodes.Status200OK,
                [HealthStatus.Unhealthy] = StatusCodes.Status503ServiceUnavailable,
            }
        });

        // /health/detailed — Full JSON report for monitoring dashboards
        app.MapHealthChecks("/health/detailed", new HealthCheckOptions
        {
            ResponseWriter = WriteDetailedJsonResponse,
        }).RequireAuthorization(); // Protect detailed endpoint

        return app;
    }

    private static Task WriteJsonResponse(HttpContext context, HealthReport report)
    {
        context.Response.ContentType = "application/json";
        var result = JsonSerializer.Serialize(new
        {
            status = report.Status.ToString().ToLowerInvariant(),
            timestamp = DateTime.UtcNow,
        });
        return context.Response.WriteAsync(result);
    }

    private static Task WriteDetailedJsonResponse(HttpContext context, HealthReport report)
    {
        context.Response.ContentType = "application/json";
        var result = JsonSerializer.Serialize(new
        {
            status = report.Status.ToString().ToLowerInvariant(),
            timestamp = DateTime.UtcNow,
            duration = report.TotalDuration,
            entries = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString().ToLowerInvariant(),
                duration = e.Value.Duration,
                description = e.Value.Description,
                exception = e.Value.Exception?.Message,
                tags = e.Value.Tags,
            })
        }, new JsonSerializerOptions { WriteIndented = true });
        return context.Response.WriteAsync(result);
    }
}
