namespace SupportWheel.Client.Models;

public record SavedWheel
{
    public string Id { get; init; } = Guid.NewGuid().ToString("N");
    public required string Name { get; init; }
    public required string[] Items { get; init; }
    public int PickCount { get; init; } = 1;
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}
