using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SupportWheel.Api;

namespace SupportWheel.Api.Tests;

public class SpinFunctionTests
{
    private static readonly string[] TwelveItems =
        ["Anna", "Bo", "Clara", "David", "Eva", "Filip", "Greta", "Hugo", "Ida", "Jonas", "Karin", "Lisa"];

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly SpinFunction _sut = new();

    [Fact]
    public async Task ValidRequest_Returns200WithCorrectShape()
    {
        var result = await CallSpin(new { items = TwelveItems, count = 4 });

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = SerializeAnonymous(ok.Value!);

        Assert.Equal(4, json.GetProperty("selected").GetArrayLength());
        Assert.Equal(4, json.GetProperty("selectedIndices").GetArrayLength());
        Assert.StartsWith("/spin/", json.GetProperty("spinUrl").GetString());
    }

    [Fact]
    public async Task CountGreaterThanItems_Returns400()
    {
        var result = await CallSpin(new { items = TwelveItems, count = 13 });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task CountZero_Returns400()
    {
        var result = await CallSpin(new { items = TwelveItems, count = 0 });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task EmptyItems_Returns400()
    {
        var result = await CallSpin(new { items = Array.Empty<string>(), count = 1 });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task NullItems_Returns400()
    {
        var result = await CallSpin(new { count = 1 });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task MoreThan50Items_Returns400()
    {
        var items = Enumerable.Range(1, 51).Select(i => $"Item{i}").ToArray();

        var result = await CallSpin(new { items, count = 1 });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task SpinUrl_StartsWithCorrectPrefix()
    {
        var result = await CallSpin(new { items = TwelveItems, count = 2 });

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = SerializeAnonymous(ok.Value!);
        var spinUrl = json.GetProperty("spinUrl").GetString();

        Assert.NotNull(spinUrl);
        Assert.StartsWith("/spin/", spinUrl);
        Assert.True(spinUrl.Length > "/spin/".Length, "spinUrl should contain encoded data after prefix.");
    }

    [Fact]
    public async Task SelectedItems_ExistInOriginalList()
    {
        var result = await CallSpin(new { items = TwelveItems, count = 4 });

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = SerializeAnonymous(ok.Value!);

        var selected = json.GetProperty("selected")
            .EnumerateArray()
            .Select(e => e.GetString()!)
            .ToArray();

        Assert.All(selected, name => Assert.Contains(name, TwelveItems));
        Assert.Equal(selected.Distinct().Count(), selected.Length);
    }

    private async Task<IActionResult> CallSpin(object body)
    {
        var json = JsonSerializer.SerializeToUtf8Bytes(body, JsonOptions);
        var context = new DefaultHttpContext();
        context.Request.ContentType = "application/json";
        context.Request.Body = new MemoryStream(json);

        return await _sut.Run(context.Request);
    }

    private static JsonElement SerializeAnonymous(object value)
    {
        var bytes = JsonSerializer.SerializeToUtf8Bytes(value, JsonOptions);
        return JsonDocument.Parse(bytes).RootElement;
    }
}
