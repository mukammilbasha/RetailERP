using System.Threading.RateLimiting;
using Prometheus;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();
builder.Host.UseSerilog();

// YARP Reverse Proxy
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

// Authentication is handled by each backend service individually.
// The gateway only proxies requests — it does NOT enforce auth globally.
// This avoids blocking unauthenticated endpoints like /api/auth/login.
builder.Services.AddAuthorization();

// Rate Limiting
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1)
            }));
    options.RejectionStatusCode = 429;
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? new[] { "http://localhost:3000" })
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

builder.Services.AddHealthChecks();

var app = builder.Build();

app.UseSerilogRequestLogging();
app.UseCors("AllowFrontend");
app.UseRateLimiter();
// No UseAuthentication() — each service handles its own JWT validation
app.UseHttpMetrics();

app.MapReverseProxy();
app.MapHealthChecks("/health");
app.MapMetrics();

// Gateway info endpoint
app.MapGet("/", () => Results.Ok(new
{
    Service = "RetailERP API Gateway",
    Version = "1.0.0",
    Status = "Running",
    Timestamp = DateTime.UtcNow
}));

Log.Information("API Gateway starting on {Urls}", builder.Configuration["Urls"] ?? "http://localhost:5000");
app.Run();
