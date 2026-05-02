using VexorionERP;

var builder = WebApplication.CreateBuilder(args);

const string LocalDevCorsPolicy = "LocalDevCors";

builder.Services.AddApplicationIdentity(builder.Configuration);
builder.Services.AddApplicationAuthorization();
builder.Services.AddMediator(options => options.ServiceLifetime = Microsoft.Extensions.DependencyInjection.ServiceLifetime.Scoped);
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddPolicy(LocalDevCorsPolicy, policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:5175",
                "https://localhost:5173",
                "https://localhost:5174",
                "https://localhost:5175")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

await app.InitializeApplicationAsync();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors(LocalDevCorsPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program;
