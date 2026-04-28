using System.Globalization;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Microsoft.JSInterop;
using SupportWheel.Client;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });

var host = builder.Build();

// Detect browser language and set culture
try
{
    var js = host.Services.GetRequiredService<IJSRuntime>();
    var browserLang = await js.InvokeAsync<string>("eval", "navigator.language || navigator.userLanguage");

    // Match to supported cultures: sv (default), en
    var culture = browserLang.StartsWith("en", StringComparison.OrdinalIgnoreCase)
        ? new CultureInfo("en")
        : new CultureInfo("sv");

    CultureInfo.DefaultThreadCurrentCulture = culture;
    CultureInfo.DefaultThreadCurrentUICulture = culture;
}
catch
{
    // Default to Swedish on failure
}

await host.RunAsync();
