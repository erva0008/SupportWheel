using Microsoft.Playwright;
using SupportWheel.Client.Models;
using SupportWheel.Client.Services;
using Xunit;

namespace SupportWheel.Playwright;

[Collection("Playwright")]
public class ResultPageTests : IAsyncLifetime
{
    private readonly PlaywrightFixture _fixture;
    private IBrowserContext _context = null!;
    private IPage _page = null!;

    public ResultPageTests(PlaywrightFixture fixture) => _fixture = fixture;

    public async Task InitializeAsync()
    {
        _context = await _fixture.CreateContextAsync();
        _page = await _context.NewPageAsync();
    }

    public async Task DisposeAsync()
    {
        await _page.CloseAsync();
        await _context.DisposeAsync();
    }

    [Fact]
    public async Task EncodedUrl_ShowsCorrectWheel()
    {
        // Create a known spin result
        var spinData = new SpinData
        {
            Items = ["Anna", "Bo", "Clara", "David"],
            SelectedIndices = [0, 2],
        };
        var encoded = SpinEncoder.Encode(spinData);

        await _page.GotoAsync($"{PlaywrightFixture.BaseUrl}/spin/{encoded}");

        // Wait for canvas to appear (Blazor loaded + wheel drawn)
        await _page.WaitForSelectorAsync("#wheelCanvas", new() { Timeout = 30_000 });

        // Wait for animation to complete
        await _page.WaitForSelectorAsync("h3:has-text('Selected')", new() { Timeout = 15_000 });

        // Should show exactly 2 winners
        var winners = _page.Locator("li.list-group-item");
        await Expect(winners).ToHaveCountAsync(2);

        // Winners should be "Anna" and "Clara" (indices 0 and 2)
        var winnerTexts = await winners.AllTextContentsAsync();
        Assert.Contains(winnerTexts, t => t.Contains("Anna"));
        Assert.Contains(winnerTexts, t => t.Contains("Clara"));
    }

    [Fact]
    public async Task InvalidUrl_ShowsErrorMessage()
    {
        await _page.GotoAsync($"{PlaywrightFixture.BaseUrl}/spin/invalid-data-here");

        // Should show error message
        await _page.WaitForSelectorAsync("text=Invalid spin link", new() { Timeout = 30_000 });

        // Should have a link back to create new spin
        var newSpinLink = _page.Locator("a:has-text('Create a new spin')");
        await Expect(newSpinLink).ToBeVisibleAsync();
    }

    [Fact]
    public async Task SwedishCharacters_DisplayCorrectly()
    {
        var spinData = new SpinData
        {
            Items = ["Åsa", "Örjan", "Älva"],
            SelectedIndices = [1],
        };
        var encoded = SpinEncoder.Encode(spinData);

        await _page.GotoAsync($"{PlaywrightFixture.BaseUrl}/spin/{encoded}");
        await _page.WaitForSelectorAsync("h3:has-text('Selected')", new() { Timeout = 30_000 });

        // Winner should be "Örjan"
        var winners = _page.Locator("li.list-group-item");
        var winnerTexts = await winners.AllTextContentsAsync();
        Assert.Contains(winnerTexts, t => t.Contains("Örjan"));
    }

    private static ILocatorAssertions Expect(ILocator locator) =>
        Assertions.Expect(locator);
}
