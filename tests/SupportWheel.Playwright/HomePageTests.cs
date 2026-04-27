using Microsoft.Playwright;
using Xunit;

namespace SupportWheel.Playwright;

[Collection("Playwright")]
public class HomePageTests : IAsyncLifetime
{
    private readonly PlaywrightFixture _fixture;
    private IBrowserContext _context = null!;
    private IPage _page = null!;

    public HomePageTests(PlaywrightFixture fixture) => _fixture = fixture;

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
    public async Task HomePage_RendersCorrectly()
    {
        await _page.GotoAsync(PlaywrightFixture.BaseUrl);
        // Wait for Blazor WASM to load
        await _page.WaitForSelectorAsync("h1:has-text('Spin the Wheel')", new() { Timeout = 30_000 });

        var heading = await _page.TextContentAsync("h1");
        Assert.Contains("Spin the Wheel", heading);

        // Textarea and count input should exist
        await _page.WaitForSelectorAsync("#itemsInput");
        await _page.WaitForSelectorAsync("#countInput");
    }

    [Fact]
    public async Task SpinButton_DisabledWhenNoItems()
    {
        await _page.GotoAsync(PlaywrightFixture.BaseUrl);
        await _page.WaitForSelectorAsync("h1:has-text('Spin the Wheel')", new() { Timeout = 30_000 });

        var button = _page.Locator("button:has-text('Spin')");
        await Expect(button).ToBeDisabledAsync();
    }

    [Fact]
    public async Task SpinButton_EnabledWithEnoughItems()
    {
        await _page.GotoAsync(PlaywrightFixture.BaseUrl);
        await _page.WaitForSelectorAsync("h1:has-text('Spin the Wheel')", new() { Timeout = 30_000 });

        // Enter 3 items
        await _page.FillAsync("#itemsInput", "Anna\nBo\nClara");

        // Wait a moment for Blazor to process oninput
        await _page.WaitForTimeoutAsync(500);

        var button = _page.Locator("button:has-text('Spin')");
        await Expect(button).ToBeEnabledAsync();
    }

    private static ILocatorAssertions Expect(ILocator locator) =>
        Assertions.Expect(locator);
}
