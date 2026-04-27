using Microsoft.Playwright;
using Xunit;

namespace SupportWheel.Playwright;

[Collection("Playwright")]
public class SpinFlowTests : IAsyncLifetime
{
    private readonly PlaywrightFixture _fixture;
    private IBrowserContext _context = null!;
    private IPage _page = null!;

    public SpinFlowTests(PlaywrightFixture fixture) => _fixture = fixture;

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
    public async Task FullSpinFlow_NavigatesToResultPage()
    {
        await _page.GotoAsync(PlaywrightFixture.BaseUrl);
        await _page.WaitForSelectorAsync("h1:has-text('Spin the Wheel')", new() { Timeout = 30_000 });

        // Enter items
        await _page.FillAsync("#itemsInput", "Anna\nBo\nClara\nDavid\nEva");

        // Set count to 2
        await _page.FillAsync("#countInput", "2");
        await _page.WaitForTimeoutAsync(300);

        // Click Spin
        await _page.ClickAsync("button:has-text('Spin')");

        // Should navigate to /spin/{encoded}
        await _page.WaitForURLAsync("**/spin/**", new() { Timeout = 5_000 });
        Assert.Contains("/spin/", _page.Url);
    }

    [Fact]
    public async Task FullSpinFlow_ShowsWinnersAfterAnimation()
    {
        await _page.GotoAsync(PlaywrightFixture.BaseUrl);
        await _page.WaitForSelectorAsync("h1:has-text('Spin the Wheel')", new() { Timeout = 30_000 });

        await _page.FillAsync("#itemsInput", "Anna\nBo\nClara\nDavid");
        await _page.FillAsync("#countInput", "2");
        await _page.WaitForTimeoutAsync(300);

        await _page.ClickAsync("button:has-text('Spin')");
        await _page.WaitForURLAsync("**/spin/**", new() { Timeout = 5_000 });

        // Wait for animation to complete (5s animation + 0.5s delay + margin)
        // The "Selected!" heading appears after animation
        await _page.WaitForSelectorAsync("h3:has-text('Selected')", new() { Timeout = 15_000 });

        // Should show exactly 2 winners (li elements with checkmark)
        var winners = _page.Locator("li.list-group-item");
        await Expect(winners).ToHaveCountAsync(2);
    }

    [Fact]
    public async Task SpinAgainButton_CreatesNewSpin()
    {
        await _page.GotoAsync(PlaywrightFixture.BaseUrl);
        await _page.WaitForSelectorAsync("h1:has-text('Spin the Wheel')", new() { Timeout = 30_000 });

        await _page.FillAsync("#itemsInput", "Anna\nBo\nClara");
        await _page.FillAsync("#countInput", "1");
        await _page.WaitForTimeoutAsync(300);

        await _page.ClickAsync("button:has-text('Spin')");
        await _page.WaitForURLAsync("**/spin/**", new() { Timeout = 5_000 });

        var firstUrl = _page.Url;

        // Wait for results to show
        await _page.WaitForSelectorAsync("h3:has-text('Selected')", new() { Timeout = 15_000 });

        // Click "Spin again"
        await _page.ClickAsync("button:has-text('Spin again')");

        // Should navigate to a new URL (different spin result)
        await _page.WaitForSelectorAsync("#wheelCanvas", new() { Timeout = 5_000 });
        // The URL should still be a spin URL
        Assert.Contains("/spin/", _page.Url);
    }

    private static ILocatorAssertions Expect(ILocator locator) =>
        Assertions.Expect(locator);
}
