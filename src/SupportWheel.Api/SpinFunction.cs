using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using SupportWheel.Api.Models;
using SupportWheel.Shared.Services;

namespace SupportWheel.Api;

public sealed class SpinFunction
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    [Function("Spin")]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "spin")] HttpRequest req)
    {
        SpinRequest? request;
        try
        {
            request = await JsonSerializer.DeserializeAsync<SpinRequest>(req.Body, JsonOptions);
        }
        catch (JsonException)
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON in request body." });
        }

        if (request?.Items is null || request.Items.Length == 0)
            return new BadRequestObjectResult(new { error = "Items is required and must not be empty." });

        if (request.Items.Length > 50)
            return new BadRequestObjectResult(new { error = "Items must not contain more than 50 elements." });

        if (request.Count < 1)
            return new BadRequestObjectResult(new { error = "Count must be at least 1." });

        if (request.Count > request.Items.Length)
            return new BadRequestObjectResult(new { error = $"Count ({request.Count}) must not exceed items length ({request.Items.Length})." });

        var spinData = WheelSpinner.Spin(request.Items, request.Count);
        var encoded = SpinEncoder.Encode(spinData);

        return new OkObjectResult(new
        {
            selected = spinData.Selected,
            selectedIndices = spinData.SelectedIndices,
            spinUrl = $"{req.Scheme}://{req.Host}/spin/{encoded}",
        });
    }
}
