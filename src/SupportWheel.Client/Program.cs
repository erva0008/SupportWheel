using System.Globalization;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Microsoft.JSInterop;
using SupportWheel.Client;
using SupportWheel.Client.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });
builder.Services.AddSingleton<CultureState>();
builder.Services.AddScoped<SavedWheelService>();

var host = builder.Build();

// Resolve language: saved preference → Swedish default
// Blazor WASM defaults to en-US, so we must always set culture explicitly.
var lang = "sv";
try
{
    var js = host.Services.GetRequiredService<IJSRuntime>();
    var savedLang = await js.InvokeAsync<string?>("localStorage.getItem", "supportwheel-lang");

    if (savedLang is "en" or "sv")
        lang = savedLang;
}
catch
{
    // localStorage unavailable — keep Swedish default
}

var culture = new CultureInfo(lang);
CultureInfo.DefaultThreadCurrentCulture = culture;
CultureInfo.DefaultThreadCurrentUICulture = culture;

await host.RunAsync();
