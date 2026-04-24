namespace SupportWheel.Api.Models;

public sealed record SpinRequest
{
    public string[]? Items { get; init; }
    public int Count { get; init; }
}
