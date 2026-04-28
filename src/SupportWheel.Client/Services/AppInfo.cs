using System.Reflection;
using System.Runtime.InteropServices;

namespace SupportWheel.Client.Services;

public static class AppInfo
{
    private static readonly Assembly Assembly = typeof(AppInfo).Assembly;

    public static string Version =>
        Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
        ?? Assembly.GetName().Version?.ToString()
        ?? "dev";

    public static string DotNetVersion => RuntimeInformation.FrameworkDescription;

    public static string BuildDate =>
        Assembly.GetCustomAttributes<AssemblyMetadataAttribute>()
            .FirstOrDefault(a => a.Key == "BuildDate")?.Value
        ?? "local";
}
